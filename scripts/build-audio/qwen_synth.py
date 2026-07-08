"""
Qwen3-TTS batch synthesizer for the xuexi audio pipeline.

Reads a JSON manifest of clips and writes a 24 kHz mono 16-bit PCM WAV for each,
using Qwen3-TTS-12Hz-0.6B-CustomVoice (Alibaba, Apache-2.0) — the newest Chinese
open-source TTS as of 2026-07. Model is loaded once and reused for the whole batch.

Invoked by scripts/build-audio/index.ts (provider `qwen`). Not run directly.

Manifest schema (argv[1] = path to JSON):
    [{ "text": "你好", "language": "Chinese", "speaker": "Serena", "out": "abs/path.wav" }, ...]

Env:
    QWEN_TTS_MODEL_DIR  local dir of downloaded weights (required)
    QWEN_TTS_DEVICE     "cuda:0" (default) or "cpu"

Output: writes each clip; prints one line of JSON progress per clip to stdout;
exits non-zero on fatal error.
"""
import contextlib
import io
import json
import os
import sys

TARGET_SR = 24000  # = model's native rate; keeps sibilant brightness (no lossy downsample)

# Greedy decoding for isolated words/syllables: the model's default sampling
# (temperature 0.9) makes ultra-short inputs ramble/hallucinate a trailing
# segment; greedy is tight, citation-style, and deterministic (reproducible
# builds). repetition_penalty guards against the rare greedy loop.
GEN_KWARGS = {"do_sample": False, "repetition_penalty": 1.1}


def log(msg: str) -> None:
    sys.stderr.write(msg + "\n")
    sys.stderr.flush()


def main() -> int:
    if len(sys.argv) < 2:
        log("usage: qwen_synth.py <manifest.json>")
        return 2
    manifest_path = sys.argv[1]
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    model_dir = os.environ.get("QWEN_TTS_MODEL_DIR")
    if not model_dir or not os.path.isdir(model_dir):
        log(f"QWEN_TTS_MODEL_DIR not set or missing: {model_dir!r}")
        return 2
    device = os.environ.get("QWEN_TTS_DEVICE", "cuda:0")

    import numpy as np
    import soundfile as sf
    import torch

    # qwen_tts prints SoX/flash-attn banners to stdout on import; keep our stdout
    # clean (JSON progress) by muting it.
    with contextlib.redirect_stdout(io.StringIO()):
        from qwen_tts import Qwen3TTSModel

    use_cuda = device.startswith("cuda") and torch.cuda.is_available()
    if device.startswith("cuda") and not use_cuda:
        log("CUDA requested but unavailable; falling back to CPU (slow).")
        device = "cpu"
    dtype = torch.bfloat16 if use_cuda else torch.float32

    log(f"loading Qwen3-TTS from {model_dir} on {device} ({dtype})...")
    model = Qwen3TTSModel.from_pretrained(
        model_dir,
        device_map=device,
        dtype=dtype,
        attn_implementation="sdpa",  # avoid flash-attn (no prebuilt Windows wheel)
    )
    log("model loaded.")

    def resample_to_target(wav: "np.ndarray", sr: int) -> "np.ndarray":
        """Polyphase (anti-aliased) resample to TARGET_SR. The model outputs
        24 kHz natively (= TARGET_SR), so this is usually a no-op; when it isn't,
        resample_poly preserves the high-frequency band that a naive linear
        interp would smear — critical for Mandarin sibilants (x/sh/s/q/c/ch)."""
        wav = np.asarray(wav, dtype=np.float32).reshape(-1)
        if sr == TARGET_SR or len(wav) < 2:
            return wav
        from math import gcd
        g = gcd(int(sr), TARGET_SR)
        from scipy.signal import resample_poly
        return resample_poly(wav, TARGET_SR // g, int(sr) // g).astype(np.float32)

    def clean_trim(wav: "np.ndarray", sr: int, thr: float = 0.012,
                   gap_s: float = 0.18) -> "np.ndarray":
        """Word-safe trim: keep the full span of the main voiced mass (so
        multi-syllable words stay intact), dropping only *distant, weak* lead/
        trail blips. Then pad and cosine-fade the edges to avoid click artifacts
        (the main cause of 'choppy' cuts)."""
        fl = int(0.02 * sr)  # 20 ms frames
        n = len(wav) // fl
        if n == 0:
            return wav
        e = np.array([np.sqrt(np.mean(wav[i * fl:(i + 1) * fl] ** 2) + 1e-12) for i in range(n)])
        voiced = e > thr
        if not voiced.any():
            return wav
        gap_frames = int(gap_s / 0.02)
        segs = []
        i = 0
        while i < n:
            if not voiced[i]:
                i += 1
                continue
            last = i
            j = i
            while j < n:
                if voiced[j]:
                    last = j
                elif j - last > gap_frames:
                    break
                j += 1
            segs.append((i, last + 1))
            i = j
        # keep every segment with >=18% of the loudest segment's total energy,
        # then span first..last kept — preserves whole words, drops faint blips.
        emax = max(float(e[a:b].sum()) for a, b in segs)
        kept = [(a, b) for a, b in segs if float(e[a:b].sum()) >= 0.18 * emax]
        s0 = kept[0][0]
        s1 = kept[-1][1]
        start = max(0, s0 * fl - int(0.04 * sr))   # 40 ms pre-roll (protect onset)
        end = min(len(wav), s1 * fl + int(0.07 * sr))  # 70 ms tail
        clip = wav[start:end].copy()
        # cosine fades to remove edge clicks
        fade = int(0.008 * sr)  # 8 ms
        if len(clip) > 2 * fade:
            ramp = 0.5 * (1 - np.cos(np.linspace(0, np.pi, fade)))
            clip[:fade] *= ramp
            clip[-fade:] *= ramp[::-1]
        return clip

    def synth_once(text: str, language: str, speaker: str, gen_kwargs: dict) -> "np.ndarray":
        with contextlib.redirect_stdout(sys.stderr):  # mute transformers' generate chatter
            wavs, sr = model.generate_custom_voice(
                text=text, language=language, speaker=speaker, **gen_kwargs
            )
        wav = wavs[0] if isinstance(wavs, (list, tuple)) else wavs
        if hasattr(wav, "detach"):
            wav = wav.detach().to("cpu", dtype=torch.float32).numpy()
        wav = resample_to_target(wav, int(sr))
        return clean_trim(wav, TARGET_SR)

    # Some (speaker, ultra-short text) combos ramble/loop even under greedy decoding
    # (observed up to 30 s). Retry with escalating strategies and keep the shortest
    # clip within a plausible duration for the text length — self-healing regardless
    # of speaker. `。` gives the model a clean stop; low-temp sampling breaks loops.
    def strategies():
        yield {"do_sample": False, "repetition_penalty": 1.1}          # natural, deterministic
        yield {"do_sample": False, "repetition_penalty": 1.3, "_period": True}
        yield {"do_sample": True, "temperature": 0.4, "top_p": 0.7, "repetition_penalty": 1.2}
        yield {"do_sample": True, "temperature": 0.6, "top_p": 0.8, "repetition_penalty": 1.25}

    total = len(manifest)
    healed = 0
    for i, item in enumerate(manifest):
        text = item["text"]
        language = item.get("language", "Chinese")
        speaker = item["speaker"]
        out = item["out"]
        # Resume: skip clips already synthesized (lets a killed batch restart from
        # where it stopped instead of regenerating everything).
        if os.path.exists(out) and os.path.getsize(out) > 1024:
            print(json.dumps({"i": i + 1, "n": total, "out": os.path.basename(out),
                              "skipped": True}), flush=True)
            continue
        # plausible upper bound on speech duration for this text (CJK char count).
        nchar = max(1, sum(1 for c in text if "一" <= c <= "鿿"))
        max_dur = 1.4 + 1.0 * nchar  # 1 char -> 2.4s, 2 chars -> 3.4s (catches 3-30s rambles;
        #                              avoids retrying legit slightly-long clips → faster builds)

        best = None  # (duration, wav)
        tries = 0
        for strat in strategies():
            tries += 1
            kw = {k: v for k, v in strat.items() if k != "_period"}
            txt = text + "。" if strat.get("_period") else text
            wav = synth_once(txt, language, speaker, kw)
            d = len(wav) / TARGET_SR
            if best is None or d < best[0]:
                best = (d, wav)
            if d <= max_dur:
                break
        if tries > 1:
            healed += 1
        wav = best[1]
        peak = float(np.max(np.abs(wav))) if len(wav) else 0.0
        if peak > 0:
            wav = wav * (0.97 / peak)  # normalize
        os.makedirs(os.path.dirname(out), exist_ok=True)
        sf.write(out, wav, TARGET_SR, subtype="PCM_16")
        print(json.dumps({"i": i + 1, "n": total, "out": os.path.basename(out),
                          "samples": int(len(wav)), "dur": round(len(wav) / TARGET_SR, 2),
                          "tries": tries}), flush=True)

    log(f"done: {total} clips ({healed} needed retry).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
