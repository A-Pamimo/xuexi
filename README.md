# 学习 xuexi

A Mandarin Chinese learning app for **iOS and web** that borrows the reward loops
of doomscrolling and gaming — variable rewards, infinite feeds, streaks, combos,
instant feedback — and points them at scientifically-backed language acquisition:
**comprehensible input**, **FSRS spaced repetition**, and **high-variability tone
training**.

Built with React Native + Expo (single codebase for iOS + web), fully
**offline-first** — usable with zero network, which matters because the target
user travels in mainland China where Western services are unreliable.

> Formerly speced as "TonePulse"; renamed **xuexi** (学习, "to learn").

---

## What's implemented (MVP milestones M1–M5)

| Milestone | Feature |
|---|---|
| **M1** | Expo/TS scaffold, SQLite schema, seed-data pipeline, build-time audio pipeline |
| **M2** | FSRS review loop (`ts-fsrs`) — hanzi→meaning and audio→meaning, opens to a preloaded win |
| **M3** | Tone Dojo — rapid-fire, multi-speaker tone ID with contour drawing, combo, haptics, sound |
| **M4** | Swipe feed — i+1 sentence selection, tap-to-gloss + add-to-SRS, pinyin toggle, autoplay |
| **M5** | Gamification — XP/levels, variable rewards, streak integrity, collection grid, input-hours odometer, weekly recap |

Onboarding (pinyin/tone primer → Tone Dojo) gates first launch and bootstraps a
known-word base so the feed is immediately comprehensible.

## Run it

```bash
npm install

# Web (fastest to try)
npm run web              # dev server → open the printed localhost URL
npm run export:web       # static SPA build into dist/

# iOS
npm run ios              # simulator (needs Xcode)
npm start                # then scan the QR with Expo Go on a device
```

The app ships with content + audio already generated (`assets/db`, `assets/audio`,
`src/data`), so `npm run web` works immediately with **no network**.

## Tests & checks

```bash
npm test          # jest: FSRS, pinyin, gamification, feed selection
npm run typecheck # tsc --noEmit (strict mode)
node scripts/smoke-web.mjs   # headless: cold-load + onboarding→dojo→tabs, asserts <10s & no JS errors
```

Verification status (spec `<verification>`):

- ✅ FSRS intervals grow after Good/Easy, shrink after Again (`src/lib/srs.test.ts`)
- ✅ Cold web launch reaches a completable action in **<10s**, zero JS errors (`scripts/smoke-web.mjs` → ~0.3s)
- ✅ Tone Dojo uses **≥3 distinct speaker voices per tone** (`audio_refs`)
- ✅ Feed never serves a sentence below the **85% known-word floor** (`src/features/feed/selection.test.ts`)
- ✅ `expo export --platform web` produces a working build (`dist/`)

## Architecture

```
app/                      expo-router routes (opens to a win, never a menu)
  (tabs)/                 Feed | Reviews | Tone Dojo | Stats
  onboarding.tsx
src/
  features/{feed,reviews,toneDojo,stats,onboarding}/
  lib/
    srs.ts                FSRS wrapper (ts-fsrs) — isolated + unit-tested
    juice.ts              central haptics + sound (tunable) for every scored interaction
    pinyin.ts             tone-number ↔ tone-mark conversion
    audio.ts              expo-av playback of bundled clips (no runtime TTS)
    gamification.ts       XP/levels, variable reward, streak integrity — unit-tested
    db/                   store (content from bundled seed + progress persistence)
  stores/appStore.ts      Zustand — the one place that mutates state
  data/seed.json          content snapshot (bundled) + audioAssets.ts (require manifest)
scripts/
  build-seed/             datasets → assets/db/xuexi-seed.db + src/data/seed.json
  build-audio/            TTS → assets/audio + audio_refs + audioAssets.ts
assets/{db,audio}/        prebuilt, offline
```

**Data layer (offline-first).** Immutable content (words, sentences, audio refs)
is hydrated from a bundled snapshot generated from the canonical SQLite DB
(`assets/db/xuexi-seed.db`). Mutable progress (FSRS cards, sessions, tone
results, stats) is kept in memory for synchronous reads and written through to a
platform adapter — `expo-file-system` on native, `localStorage` on web. This
keeps the app identical and fully offline on iOS and web without depending on the
`expo-sqlite` web (wasm) path (see plan risk R1).

## Content pipelines (build-time only)

```bash
npm run seed:build    # words + sentences → SQLite + seed.json
npm run audio:build   # multi-speaker audio → assets/audio + manifest
```

**Seed data.** Words come from
[complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary)
(HSK 3.0 levels 1–3, ~2200 words with pinyin, gloss, radical, frequency),
enriched with per-character decomposition from
[makemeahanzi](https://github.com/skishore/makemeahanzi). Graded i+1 sentences are
generated from a hand-verified beginner vocabulary pool (correct pinyin, gloss and
English inflection), each linked to its real word rows for tap-to-gloss.

**Audio.** The pipeline is **provider-pluggable** (`XUEXI_TTS`). The default is
**`qwen`** — [Qwen3-TTS-12Hz-0.6B-CustomVoice](https://github.com/QwenLM/Qwen3-TTS)
(Alibaba, Apache-2.0), the newest Chinese open-source neural TTS (Jan 2026). It
produces natural, fully-intelligible Mandarin with three built-in Chinese speakers
(Serena/Vivian/Uncle_Fu) for high-variability tone training. Because the model
speaks real hanzi with their true citation tone, the Tone Dojo drills a
hand-verified set of common single characters (no neutral-tone particles, no
sandhi/polyphonic chars) — every clip is a genuine syllable with an authoritative
tone label. Clips are resampled to 16 kHz mono and bundled fully offline.

Setup (one-time, ~5 GB; needs an NVIDIA GPU or falls back to slow CPU):

```bash
py -3.12 -m venv scripts/.cache/qwen-venv
scripts/.cache/qwen-venv/Scripts/python -m pip install -U pip qwen-tts soundfile "huggingface_hub[cli]" \
  torch --index-url https://download.pytorch.org/whl/cu124
scripts/.cache/qwen-venv/Scripts/huggingface-cli download \
  Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice --local-dir scripts/.cache/qwen-model
npm run audio:build            # XUEXI_TTS=qwen is the default
```

Fallback: **`XUEXI_TTS=espeak`** uses the offline espeak-ng formant synthesizer —
no network/GPU and tiny, but robotic and only marginally intelligible; kept as a
last resort. UI sound effects are synthesized procedurally in either provider.
`XUEXI_AUDIO_FULL=1` generates word audio for every HSK1 word (larger bundle).

### Notes on this build environment

Two spec sources are gated by the sandbox's egress policy and have documented
fallbacks that a normal dev machine can swap back:

- **Tatoeba** (intended sentence source, CC-BY) — `downloads.tatoeba.org` is
  blocked, so sentences are generated (well-suited to strict i+1). A Tatoeba
  ingestion module can be added under `scripts/build-seed`.
- **Audio** — the default `qwen` provider (Qwen3-TTS) requires a local Python
  venv + downloaded weights (see setup above). On a machine without them, use
  `XUEXI_TTS=espeak` for the offline formant-synth fallback.

## Attributions & licenses

- CC-CEDICT-derived data via complete-hsk-vocabulary — CC BY-SA.
- makemeahanzi character data — LGPL / Arphic PL.
- Tatoeba (when enabled) — CC BY 2.0 FR.
- Audio generated at build time with [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)
  (Apache-2.0); espeak-ng (GPL) fallback. Generated clips are bundled.

## Not in this MVP

Handwriting/speech recognition, social features, accounts/Supabase sync, AI chat
tutor, iPad layout (spec `<exclude_for_now>`). Polish pass (reanimated
transitions, richer sound design) is milestone M6; TestFlight + optional Supabase
sync is M7.
