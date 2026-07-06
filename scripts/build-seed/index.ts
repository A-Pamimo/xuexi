/**
 * Build-time seed pipeline (run: `npm run seed:build`).
 *
 * Produces two artifacts consumed by the app:
 *   1. assets/db/xuexi-seed.db   — canonical SQLite content DB (native runtime)
 *   2. src/data/seed.json        — content snapshot (web runtime + provenance)
 *
 * Sources (all reachable offline-after-cache):
 *   - complete-hsk-vocabulary (HSK 3.0 levels 1-3) -> words, pinyin, gloss, radical
 *   - makemeahanzi dictionary.txt                  -> per-character decomposition
 *   - generated graded sentences                   -> i+1 feed content
 *
 * Datasets are cached under scripts/.cache (gitignored). Set NODE_EXTRA_CA_CERTS
 * to the agent-proxy CA bundle when running behind the sandbox proxy.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  SCHEMA_SQL,
  INITIAL_USER_STATS_SQL,
  SEED_VERSION,
} from '../../src/lib/db/schema';
import { toneNumbersOf } from '../../src/lib/pinyin';
import type { ComponentBreakdown, Word } from '../../src/lib/types';
import { generateSentences } from './sentences';

const ROOT = path.resolve(__dirname, '../..');
const CACHE = path.join(ROOT, 'scripts/.cache');
const HSK_BASE =
  'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/wordlists/exclusive/new';
const MMAH_URL =
  'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt';
const HSK_LEVELS = [1, 2, 3];

interface HskEntry {
  simplified: string;
  radical?: string;
  frequency?: number;
  pos?: string[];
  forms: {
    transcriptions?: { numeric?: string };
    meanings?: string[];
  }[];
}

interface MmahEntry {
  character: string;
  definition?: string;
  decomposition?: string;
  radical?: string;
}

async function cachedFetch(url: string, file: string): Promise<string> {
  const dest = path.join(CACHE, file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return fs.readFileSync(dest, 'utf8');
  }
  fs.mkdirSync(CACHE, { recursive: true });
  process.stdout.write(`  fetching ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(dest, text);
  return text;
}

function loadMmah(text: string): Map<string, MmahEntry> {
  const map = new Map<string, MmahEntry>();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as MmahEntry;
      map.set(e.character, e);
    } catch {
      /* skip malformed line */
    }
  }
  return map;
}

function breakdownFor(hanzi: string, mmah: Map<string, MmahEntry>): ComponentBreakdown[] {
  return [...hanzi].map((char) => {
    const e = mmah.get(char);
    return {
      char,
      radical: e?.radical ?? null,
      decomposition:
        e?.decomposition && e.decomposition !== '？' ? e.decomposition : null,
      hint: e?.definition ?? null,
    };
  });
}

async function buildWords(mmah: Map<string, MmahEntry>): Promise<{
  words: Word[];
  posByHanzi: Map<string, string[]>;
}> {
  const words: Word[] = [];
  const posByHanzi = new Map<string, string[]>();
  const seen = new Set<string>();
  let id = 1;
  for (const level of HSK_LEVELS) {
    const raw = await cachedFetch(`${HSK_BASE}/${level}.json`, `hsk${level}.json`);
    const entries = JSON.parse(raw) as HskEntry[];
    for (const e of entries) {
      if (seen.has(e.simplified)) continue;
      const numeric = e.forms[0]?.transcriptions?.numeric;
      const meaning = e.forms.flatMap((f) => f.meanings ?? [])[0];
      if (!numeric || !meaning) continue;
      seen.add(e.simplified);
      posByHanzi.set(e.simplified, e.pos ?? []);
      words.push({
        id: id++,
        hanzi: e.simplified,
        pinyinNumbered: numeric,
        tonePattern: toneNumbersOf(numeric),
        glossEn: meaning,
        hskLevel: level,
        frequencyRank: e.frequency ?? null,
        componentBreakdown: breakdownFor(e.simplified, mmah),
      });
    }
  }
  return { words, posByHanzi };
}

function writeDb(
  words: Word[],
  sentences: ReturnType<typeof generateSentences>,
): void {
  const dbPath = path.join(ROOT, 'assets/db/xuexi-seed.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(dbPath)) fs.rmSync(dbPath);
  const db = new Database(dbPath);
  db.exec(SCHEMA_SQL.replace(/PRAGMA journal_mode = WAL;/, '')); // avoid WAL sidecars in the shipped asset
  db.exec(INITIAL_USER_STATS_SQL);
  db.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES('seed_version',?)").run(
    String(SEED_VERSION),
  );

  const insWord = db.prepare(
    `INSERT INTO words(id,hanzi,pinyin_numbered,tone_pattern,gloss_en,hsk_level,frequency_rank,component_breakdown)
     VALUES(@id,@hanzi,@pinyin,@tone,@gloss,@hsk,@freq,@comp)`,
  );
  const insWords = db.transaction((rows: Word[]) => {
    for (const w of rows)
      insWord.run({
        id: w.id,
        hanzi: w.hanzi,
        pinyin: w.pinyinNumbered,
        tone: JSON.stringify(w.tonePattern),
        gloss: w.glossEn,
        hsk: w.hskLevel,
        freq: w.frequencyRank,
        comp: JSON.stringify(w.componentBreakdown),
      });
  });
  insWords(words);

  const insSent = db.prepare(
    `INSERT INTO sentences(id,hanzi,pinyin,gloss_en,word_ids,difficulty_score,audio_ref,source_tag)
     VALUES(@id,@hanzi,@pinyin,@gloss,@wordIds,@diff,NULL,@tag)`,
  );
  const insSents = db.transaction(() => {
    sentences.forEach((s, i) => {
      insSent.run({
        id: i + 1,
        hanzi: s.hanzi,
        pinyin: s.pinyin,
        gloss: s.glossEn,
        wordIds: JSON.stringify(s.wordIds),
        diff: 1 / s.hskLevel, // static ease proxy; runtime recomputes known-ratio
        tag: s.sourceTag,
      });
    });
  });
  insSents();
  db.close();
  return void 0;
}

function writeJsonSnapshot(
  words: Word[],
  sentences: ReturnType<typeof generateSentences>,
): void {
  const snapshot = {
    seedVersion: SEED_VERSION,
    words,
    sentences: sentences.map((s, i) => ({
      id: i + 1,
      hanzi: s.hanzi,
      pinyin: s.pinyin,
      glossEn: s.glossEn,
      wordIds: s.wordIds,
      difficultyScore: 1 / s.hskLevel,
      audioRef: null as string | null,
      sourceTag: s.sourceTag,
    })),
    audioRefs: [] as unknown[], // filled by the audio pipeline
  };
  const dest = path.join(ROOT, 'src/data/seed.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(snapshot));
}

async function main() {
  process.stdout.write('xuexi seed pipeline\n');
  const mmahText = await cachedFetch(MMAH_URL, 'makemeahanzi.txt');
  const mmah = loadMmah(mmahText);
  process.stdout.write(`  makemeahanzi: ${mmah.size} characters\n`);

  const { words, posByHanzi } = await buildWords(mmah);
  process.stdout.write(`  words: ${words.length}\n`);

  const sentences = generateSentences(
    words,
    (w) => posByHanzi.get(w.hanzi) ?? [],
    1500,
  );
  process.stdout.write(`  sentences: ${sentences.length}\n`);

  writeDb(words, sentences);
  writeJsonSnapshot(words, sentences);
  process.stdout.write('  wrote assets/db/xuexi-seed.db + src/data/seed.json\n');
  process.stdout.write(
    '  NOTE: audio_refs are now empty — run `npm run audio:build` (or use `npm run content:build`).\n',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
