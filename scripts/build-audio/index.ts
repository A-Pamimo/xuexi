/**
 * Build-time audio pipeline (run: `npm run audio:build`).
 *
 * Generates bundled, fully-offline audio and writes audio_refs into the seed DB
 * + src/data/seed.json, plus a static require() manifest (src/data/audioAssets.*)
 * so Metro bundles the clips on native and serves URLs on web.
 *
 * Providers (set XUEXI_TTS):
 *   - `qwen` (DEFAULT): Qwen3-TTS-12Hz-0.6B-CustomVoice — Alibaba, Apache-2.0, the
 *     newest Chinese open-source neural TTS (Jan 2026). Natural, fully-intelligible
 *     Mandarin with built-in Chinese speakers (Serena/Vivian/Uncle_Fu). Runs a local
 *     Python venv (scripts/.cache/qwen-venv) + downloaded weights on CUDA/CPU. See
 *     scripts/build-audio/qwen_synth.py and the README.
 *   - `espeak`: offline formant synthesizer fallback. No network, no GPU, tiny — but
 *     robotic and barely intelligible. Kept as a last-resort fallback only.
 *
 * Tone-drill design: neural TTS speaks real hanzi with their true citation tone, so
 * the Tone Dojo inventory is a hand-verified set of common single characters (no
 * neutral-tone particles, no sandhi/polyphonic chars) — every clip is a genuine
 * Mandarin syllable with an authoritative tone label. (espeak instead mechanically
 * applies a tone contour to romanized syllables.)
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import type { ToneNumber } from '../../src/lib/types';
import { writeToneWav, writeWavShrunk } from './wav';

type Provider = 'qwen' | 'espeak';

// UI sound effects (juice.ts). Bundled, procedurally synthesized — no assets.
const SFX: { key: string; segs: { freq: number; dur: number; type?: 'sine' | 'square' }[] }[] = [
  { key: 'sfx_correct.wav', segs: [{ freq: 660, dur: 0.09 }, { freq: 990, dur: 0.12 }] },
  { key: 'sfx_wrong.wav', segs: [{ freq: 180, dur: 0.18, type: 'square' }] },
  { key: 'sfx_combo.wav', segs: [{ freq: 880, dur: 0.06 }] },
  { key: 'sfx_reward.wav', segs: [{ freq: 784, dur: 0.08 }, { freq: 1047, dur: 0.08 }, { freq: 1319, dur: 0.14 }] },
];

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'assets/audio');
const TMP = path.join(ROOT, 'scripts/.cache/audio-tmp');
const VENV_PY = path.join(ROOT, 'scripts/.cache/qwen-venv/Scripts/python.exe');
const QWEN_MODEL_DIR = path.join(ROOT, 'scripts/.cache/qwen-model');

// ---- Speakers -------------------------------------------------------------
// Three distinct speakers per provider for high-variability tone training.
// Serena/Vivian (standard Chinese, female) + Dylan (Beijing dialect — standard
// Mandarin tones, male) give gender variety for high-variability tone training.
// Uncle_Fu is avoided: it rambles badly on isolated single characters (observed
// runaway clips up to 30 s), whereas Dylan stays stable.
const QWEN_SPEAKERS: { id: string; voice: string }[] = [
  { id: 'zh-a', voice: 'Serena' }, // Chinese, female
  { id: 'zh-b', voice: 'Vivian' }, // Chinese, female
  { id: 'zh-c', voice: 'Dylan' }, // Beijing dialect, male
];
const ESPEAK_SPEAKERS: { id: string; voice: string }[] = [
  { id: 'zh-a', voice: 'cmn' },
  { id: 'zh-b', voice: 'cmn+f3' },
  { id: 'zh-c', voice: 'cmn+m3' },
];

// ---- espeak romanized tone-drill inventory (fallback only) ----------------
const ESPEAK_SYLLABLES = [
  'ma', 'ba', 'yi', 'wu', 'li', 'ni', 'mi', 'hao',
  'shi', 'wen', 'tang', 'hua', 'jia', 'xin', 'qing', 'zhong',
  'guo', 'xue', 'shu', 'che', 'mai', 'mao', 'yang', 'fen',
];
const TONES: ToneNumber[] = [1, 2, 3, 4];

// ---- Qwen tone-drill inventory: hand-verified real hanzi ------------------
// Common single characters with unambiguous citation tones. No neutral-tone
// particles (吧/吗/的…), no sandhi chars (不/一), no polyphonic chars (长/得/中…).
// `syllable` is toneless pinyin; the drill labels each clip by `tone`.
const TONE_DRILL: { syllable: string; tone: ToneNumber; hanzi: string }[] = [
  // Tone 1 — high flat
  { syllable: 'ma', tone: 1, hanzi: '妈' }, { syllable: 'tian', tone: 1, hanzi: '天' },
  { syllable: 'jia', tone: 1, hanzi: '家' }, { syllable: 'chi', tone: 1, hanzi: '吃' },
  { syllable: 'san', tone: 1, hanzi: '三' }, { syllable: 'gao', tone: 1, hanzi: '高' },
  { syllable: 'he', tone: 1, hanzi: '喝' }, { syllable: 'shu', tone: 1, hanzi: '书' },
  { syllable: 'hua', tone: 1, hanzi: '花' }, { syllable: 'mao', tone: 1, hanzi: '猫' },
  { syllable: 'shan', tone: 1, hanzi: '山' }, { syllable: 'ting', tone: 1, hanzi: '听' },
  // Tone 2 — rising
  { syllable: 'ren', tone: 2, hanzi: '人' }, { syllable: 'lai', tone: 2, hanzi: '来' },
  { syllable: 'shi', tone: 2, hanzi: '时' }, { syllable: 'xue', tone: 2, hanzi: '学' },
  { syllable: 'guo', tone: 2, hanzi: '国' }, { syllable: 'hong', tone: 2, hanzi: '红' },
  { syllable: 'cha', tone: 2, hanzi: '茶' }, { syllable: 'men', tone: 2, hanzi: '门' },
  { syllable: 'tou', tone: 2, hanzi: '头' }, { syllable: 'qian', tone: 2, hanzi: '钱' },
  { syllable: 'bai', tone: 2, hanzi: '白' }, { syllable: 'yu', tone: 2, hanzi: '鱼' },
  { syllable: 'ma', tone: 2, hanzi: '麻' }, // completes the mā/má/mǎ/mà onboarding set
  // Tone 3 — dip
  { syllable: 'wo', tone: 3, hanzi: '我' }, { syllable: 'ni', tone: 3, hanzi: '你' },
  { syllable: 'hao', tone: 3, hanzi: '好' }, { syllable: 'you', tone: 3, hanzi: '有' },
  { syllable: 'hen', tone: 3, hanzi: '很' }, { syllable: 'xiang', tone: 3, hanzi: '想' },
  { syllable: 'xiao', tone: 3, hanzi: '小' }, { syllable: 'wu', tone: 3, hanzi: '五' },
  { syllable: 'shou', tone: 3, hanzi: '手' }, { syllable: 'shui', tone: 3, hanzi: '水' },
  { syllable: 'ma', tone: 3, hanzi: '马' }, { syllable: 'lao', tone: 3, hanzi: '老' },
  // Tone 4 — falling
  { syllable: 'shi', tone: 4, hanzi: '是' }, { syllable: 'zai', tone: 4, hanzi: '在' },
  { syllable: 'da', tone: 4, hanzi: '大' }, { syllable: 'qu', tone: 4, hanzi: '去' },
  { syllable: 'dui', tone: 4, hanzi: '对' }, { syllable: 'zuo', tone: 4, hanzi: '做' },
  { syllable: 'hui', tone: 4, hanzi: '会' }, { syllable: 'dao', tone: 4, hanzi: '到' },
  { syllable: 'kan', tone: 4, hanzi: '看' }, { syllable: 'jiao', tone: 4, hanzi: '叫' },
  { syllable: 'ai', tone: 4, hanzi: '爱' }, { syllable: 'kuai', tone: 4, hanzi: '快' },
  { syllable: 'ma', tone: 4, hanzi: '骂' }, // completes the mā/má/mǎ/mà onboarding set
];

interface Seed {
  words: { id: number; hanzi: string; hskLevel: number }[];
  sentences: { id: number; wordIds: number[] }[];
  audioRefs: unknown[];
}
interface AudioRefRow {
  ownerType: 'word' | 'syllable' | 'sentence';
  ownerKey: string;
  tone: ToneNumber | null;
  speakerId: string;
  assetKey: string;
}
/** One clip to synthesize: a ref plus the text + voice/speaker to speak it with. */
interface Job {
  ref: AudioRefRow;
  text: string; // what to speak (hanzi for qwen; `${syl}${tone}` for espeak)
  voice: string; // qwen speaker name OR espeak voice string
}

function espeak(voice: string, text: string, outWav: string): void {
  execFileSync('espeak-ng', ['-v', voice, text, '-w', outWav], { stdio: 'ignore' });
}

function buildJobs(seed: Seed, provider: Provider): Job[] {
  const wordById = new Map(seed.words.map((w) => [w.id, w]));
  const speakers = provider === 'qwen' ? QWEN_SPEAKERS : ESPEAK_SPEAKERS;
  const jobs: Job[] = [];

  // 1) Tone-drill syllables: inventory x speaker.
  if (provider === 'qwen') {
    for (const d of TONE_DRILL) {
      for (const sp of speakers) {
        jobs.push({
          ref: {
            ownerType: 'syllable',
            ownerKey: `${d.syllable}${d.tone}`,
            tone: d.tone,
            speakerId: sp.id,
            assetKey: `syl_${d.syllable}${d.tone}_${sp.id}.wav`,
          },
          text: d.hanzi,
          voice: sp.voice,
        });
      }
    }
  } else {
    for (const syl of ESPEAK_SYLLABLES) {
      for (const tone of TONES) {
        for (const sp of speakers) {
          jobs.push({
            ref: {
              ownerType: 'syllable',
              ownerKey: `${syl}${tone}`,
              tone,
              speakerId: sp.id,
              assetKey: `syl_${syl}${tone}_${sp.id}.wav`,
            },
            text: `${syl}${tone}`,
            voice: sp.voice,
          });
        }
      }
    }
  }

  // 2) Word audio: words that appear in feed sentences (so tap-to-gloss and audio
  //    reviews for feed vocab work). Set XUEXI_AUDIO_FULL=1 to also cover every
  //    HSK1 word — larger bundle, documented in the README.
  const wordIds = new Set<number>();
  for (const s of seed.sentences) for (const id of s.wordIds) wordIds.add(id);
  if (process.env.XUEXI_AUDIO_FULL === '1') {
    for (const w of seed.words) if (w.hskLevel === 1) wordIds.add(w.id);
  }
  const speaker0 = speakers[0]!;
  for (const id of wordIds) {
    const w = wordById.get(id);
    if (!w) continue;
    jobs.push({
      ref: {
        ownerType: 'word',
        ownerKey: String(id),
        tone: null,
        speakerId: speaker0.id,
        assetKey: `word_${id}.wav`,
      },
      text: w.hanzi,
      voice: speaker0.voice,
    });
  }

  return jobs;
}

/** espeak: synth each job to assets/audio, shrinking via wav.ts. Returns bytes. */
function synthEspeak(jobs: Job[]): number {
  fs.mkdirSync(TMP, { recursive: true });
  let bytes = 0;
  for (const job of jobs) {
    const raw = path.join(TMP, job.ref.assetKey);
    espeak(job.voice, job.text, raw);
    bytes += writeWavShrunk(raw, path.join(OUT, job.ref.assetKey));
    fs.rmSync(raw, { force: true });
  }
  return bytes;
}

/** qwen: emit a manifest, run the Python synthesizer once, sum output bytes. */
function synthQwen(jobs: Job[]): number {
  if (!fs.existsSync(VENV_PY)) {
    throw new Error(
      `Qwen venv missing (${VENV_PY}). Run the setup in scripts/build-audio/README or\n` +
        `set XUEXI_TTS=espeak for the offline fallback.`,
    );
  }
  if (!fs.existsSync(QWEN_MODEL_DIR)) {
    throw new Error(`Qwen weights missing (${QWEN_MODEL_DIR}). Download them first (see README).`);
  }
  fs.mkdirSync(TMP, { recursive: true });
  const manifest = jobs.map((j) => ({
    text: j.text,
    language: 'Chinese',
    speaker: j.voice,
    out: path.join(OUT, j.ref.assetKey),
  }));
  const manifestPath = path.join(TMP, 'qwen-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));

  const script = path.join(__dirname, 'qwen_synth.py');
  execFileSync(VENV_PY, [script, manifestPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      QWEN_TTS_MODEL_DIR: QWEN_MODEL_DIR,
      QWEN_TTS_DEVICE: process.env.QWEN_TTS_DEVICE ?? 'cuda:0',
      PYTHONUTF8: '1',
    },
  });

  let bytes = 0;
  for (const j of jobs) {
    const p = path.join(OUT, j.ref.assetKey);
    if (!fs.existsSync(p)) throw new Error(`Qwen did not produce ${j.ref.assetKey}`);
    bytes += fs.statSync(p).size;
  }
  return bytes;
}

function main() {
  const provider = (process.env.XUEXI_TTS ?? 'qwen') as Provider;
  if (provider !== 'qwen' && provider !== 'espeak') {
    throw new Error(`Unknown XUEXI_TTS provider "${provider}" (use "qwen" or "espeak").`);
  }
  process.stdout.write(`TTS provider: ${provider}\n`);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const seedPath = path.join(ROOT, 'src/data/seed.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as Seed;

  const jobs = buildJobs(seed, provider);
  const nSyl = jobs.filter((j) => j.ref.ownerType === 'syllable').length;
  const nWord = jobs.filter((j) => j.ref.ownerType === 'word').length;

  const bytes = provider === 'qwen' ? synthQwen(jobs) : synthEspeak(jobs);
  process.stdout.write(`  tone-drill clips: ${nSyl}\n`);
  process.stdout.write(`  word clips: ${nWord}\n`);

  // UI sound effects (procedural, provider-independent).
  let sfxBytes = 0;
  for (const s of SFX) sfxBytes += writeToneWav(path.join(OUT, s.key), s.segs);
  process.stdout.write(`  sfx clips: ${SFX.length}\n`);

  const refs = jobs.map((j) => j.ref);
  linkDb(refs);
  writeSnapshotAndManifest(refs, seed);

  process.stdout.write(
    `  total: ${refs.length} clips, ${((bytes + sfxBytes) / 1_048_576).toFixed(1)} MB\n`,
  );
}

/** Write all audio_refs into the seed DB. */
function linkDb(refs: AudioRefRow[]): void {
  const dbPath = path.join(ROOT, 'assets/db/xuexi-seed.db');
  const db = new Database(dbPath);
  db.exec('DELETE FROM audio_refs;');

  const ins = db.prepare(
    `INSERT INTO audio_refs(owner_type, owner_key, tone, speaker_id, asset_key)
     VALUES(@ownerType,@ownerKey,@tone,@speakerId,@assetKey)`,
  );
  const tx = db.transaction((rows: AudioRefRow[]) => {
    for (const r of rows) ins.run(r);
  });
  tx(refs);
  db.close();
}

function writeSnapshotAndManifest(refs: AudioRefRow[], seed: Seed): void {
  // Update seed.json with audioRefs + sentence audio links.
  const dbPath = path.join(ROOT, 'assets/db/xuexi-seed.db');
  const db = new Database(dbPath, { readonly: true });
  const sentAudio = new Map(
    (db.prepare('SELECT id, audio_ref FROM sentences').all() as {
      id: number;
      audio_ref: string | null;
    }[]).map((r) => [r.id, r.audio_ref]),
  );
  db.close();

  const snapshot = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src/data/seed.json'), 'utf8'),
  ) as Seed & { sentences: { id: number; audioRef: string | null }[] };
  snapshot.audioRefs = refs.map((r, i) => ({ id: i + 1, ...r }));
  for (const s of snapshot.sentences) s.audioRef = sentAudio.get(s.id) ?? null;
  fs.writeFileSync(path.join(ROOT, 'src/data/seed.json'), JSON.stringify(snapshot));

  // Static require() manifest so Metro bundles native assets; on web these
  // resolve to URL strings. Scan the output dir so SFX + all clips are included.
  const keys = fs
    .readdirSync(OUT)
    .filter((f) => f.endsWith('.wav'))
    .sort();
  const lines = keys.map(
    (k) => `  '${k}': require('../../assets/audio/${k}'),`,
  );
  const ts = `/* AUTO-GENERATED by scripts/build-audio. Do not edit. */
/* eslint-disable */
// @ts-nocheck
export const AUDIO_ASSETS: Record<string, number | string> = {
${lines.join('\n')}
};
`;
  fs.writeFileSync(path.join(ROOT, 'src/data/audioAssets.ts'), ts);
  void seed;
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
