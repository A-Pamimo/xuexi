/**
 * Build-time audio pipeline (run: `npm run audio:build`).
 *
 * Generates bundled, fully-offline audio and writes audio_refs into the seed DB
 * + src/data/seed.json, plus a static require() manifest (src/data/audioAssets.*)
 * so Metro bundles the clips on native and serves URLs on web.
 *
 * Provider abstraction: the spec's documented default is edge-tts (multiple
 * zh-CN neural voices). In this sandbox Microsoft's TTS websocket is blocked, so
 * the pipeline defaults to the offline `espeak` provider, which needs no network
 * at build OR runtime and yields >= 3 distinct speaker variants per tone. Set
 * XUEXI_TTS=edge on a machine with access to use neural voices instead.
 *
 * NOTE: espeak clips are functional, not production-grade. Tone contours are
 * correct (the training signal), which is what the Tone Dojo requires.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import type { ToneNumber } from '../../src/lib/types';
import { writeToneWav, writeWavShrunk } from './wav';

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

// Three distinct espeak Mandarin "speakers" for high-variability tone training.
const SPEAKERS: { id: string; voice: string }[] = [
  { id: 'zh-a', voice: 'cmn' },
  { id: 'zh-b', voice: 'cmn+f3' },
  { id: 'zh-c', voice: 'cmn+m3' },
];

// Curated tone-drill syllable inventory (real Mandarin syllables valid in all
// four tones). Kept modest to bound bundle size; expand freely for production.
const SYLLABLES = [
  'ma', 'ba', 'yi', 'wu', 'li', 'ni', 'mi', 'hao',
  'shi', 'wen', 'tang', 'hua', 'jia', 'xin', 'qing', 'zhong',
  'guo', 'xue', 'shu', 'che', 'mai', 'mao', 'yang', 'fen',
];
const TONES: ToneNumber[] = [1, 2, 3, 4];

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

function espeak(voice: string, text: string, outWav: string): void {
  execFileSync('espeak-ng', ['-v', voice, text, '-w', outWav], { stdio: 'ignore' });
}

/** Synthesize `text`, shrink, and write to assets/audio/<assetKey>. */
function synth(voice: string, text: string, assetKey: string): number {
  const raw = path.join(TMP, assetKey);
  espeak(voice, text, raw);
  const dest = path.join(OUT, assetKey);
  const size = writeWavShrunk(raw, dest);
  fs.rmSync(raw, { force: true });
  return size;
}

function main() {
  const provider = process.env.XUEXI_TTS ?? 'espeak';
  if (provider !== 'espeak') {
    throw new Error(
      `Provider "${provider}" not available in this environment. See README; only "espeak" runs offline here.`,
    );
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });

  const seedPath = path.join(ROOT, 'src/data/seed.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as Seed;
  const wordById = new Map(seed.words.map((w) => [w.id, w]));

  const refs: AudioRefRow[] = [];
  let bytes = 0;

  // 1) Tone-drill syllables: syllable x tone x speaker.
  for (const syl of SYLLABLES) {
    for (const tone of TONES) {
      for (const sp of SPEAKERS) {
        const key = `syl_${syl}${tone}_${sp.id}.wav`;
        bytes += synth(sp.voice, `${syl}${tone}`, key);
        refs.push({ ownerType: 'syllable', ownerKey: `${syl}${tone}`, tone, speakerId: sp.id, assetKey: key });
      }
    }
  }
  process.stdout.write(`  tone-drill clips: ${SYLLABLES.length * TONES.length * SPEAKERS.length}\n`);

  // 2) Word audio: words that appear in feed sentences (so tap-to-gloss and
  //    audio reviews for feed vocab work). Set XUEXI_AUDIO_FULL=1 to also cover
  //    every HSK1 word — larger bundle, documented in the README.
  const wordIds = new Set<number>();
  for (const s of seed.sentences) for (const id of s.wordIds) wordIds.add(id);
  if (process.env.XUEXI_AUDIO_FULL === '1') {
    for (const w of seed.words) if (w.hskLevel === 1) wordIds.add(w.id);
  }
  const speaker0 = SPEAKERS[0]!;
  for (const id of wordIds) {
    const w = wordById.get(id);
    if (!w) continue;
    const key = `word_${id}.wav`;
    bytes += synth(speaker0.voice, w.hanzi, key);
    refs.push({ ownerType: 'word', ownerKey: String(id), tone: null, speakerId: speaker0.id, assetKey: key });
  }
  process.stdout.write(`  word clips: ${wordIds.size}\n`);

  // UI sound effects.
  for (const s of SFX) {
    bytes += writeToneWav(path.join(OUT, s.key), s.segs);
  }
  process.stdout.write(`  sfx clips: ${SFX.length}\n`);

  // Feed autoplay queues the per-word clips in sequence (every sentence's
  // vocabulary has word audio), so no separate sentence clips are bundled —
  // this keeps the offline bundle small and gives clearer word boundaries.
  linkDb(refs);
  writeSnapshotAndManifest(refs, seed);

  process.stdout.write(
    `  total: ${refs.length} clips, ${(bytes / 1_048_576).toFixed(1)} MB\n`,
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
