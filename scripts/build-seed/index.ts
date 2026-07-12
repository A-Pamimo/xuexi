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
// SUBTLEX-CH (Cai & Brysbaert 2010) spoken/subtitle word frequencies, via the
// leonsilicon/subtlex-ch-wf typed-JSON mirror. Cached (~16 MB) at scripts/.cache.
const SUBTLEX_URL =
  'https://raw.githubusercontent.com/leonsilicon/subtlex-ch-wf/main/SUBTLEX-CH-WF.json';
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

/**
 * Load SUBTLEX-CH word → contextual-diversity (W-CD, # of subtitle contexts a
 * word appears in). W-CD is a better lexical-processing predictor than raw count
 * (Brysbaert). Returns a hanzi → W-CD map.
 */
function loadSubtlex(text: string): Map<string, number> {
  const map = new Map<string, number>();
  const parsed = JSON.parse(text) as { data: { Word: string; 'W-CD': number }[] };
  for (const row of parsed.data) {
    const wcd = row['W-CD'];
    if (typeof wcd !== 'number') continue;
    // Keep the max if a token appears more than once.
    const prev = map.get(row.Word);
    if (prev === undefined || wcd > prev) map.set(row.Word, wcd);
  }
  return map;
}

/**
 * Assign `spokenFreqRank` to each word from SUBTLEX W-CD, WITHOUT reordering the
 * list (ids must stay stable — FSRS cards are keyed by wordId). Rank 1 = most
 * spoken-frequent; words absent from SUBTLEX-CH get null (introduced last).
 */
function applySpokenFreq(words: Word[], subtlex: Map<string, number>): void {
  const ranked = words
    .map((w) => ({ id: w.id, wcd: subtlex.get(w.hanzi) }))
    .filter((x): x is { id: number; wcd: number } => x.wcd !== undefined)
    // W-CD desc; ties broken by written-frequency then id for a stable total order.
    .sort((a, b) => b.wcd - a.wcd || a.id - b.id);
  const rankById = new Map<number, number>();
  ranked.forEach((r, i) => rankById.set(r.id, i + 1));
  for (const w of words) w.spokenFreqRank = rankById.get(w.id) ?? null;
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

/**
 * Pick the most useful reading of a polyphonic entry. CC-CEDICT lists rare
 * readings first (说 → shuì "persuade" before shuō "speak"), and the old build
 * blindly took forms[0], giving wrong pinyin AND wrong glosses. Prefer the form
 * with the most real senses (the common reading is the richer entry).
 */
function bestForm(forms: HskEntry['forms']): HskEntry['forms'][number] | undefined {
  let best: HskEntry['forms'][number] | undefined;
  let bestScore = -1;
  for (const f of forms) {
    const senses = (f.meanings ?? []).filter((m) => !/^variant of/i.test(m));
    if (senses.length > bestScore) {
      bestScore = senses.length;
      best = f;
    }
  }
  return best ?? forms[0];
}

/**
 * Curated overrides (scripts/build-seed/corrections.json) for entries the source
 * dataset gets wrong: rare/literary readings picked over the common one (没 as
 * mò "drown" instead of méi "not"; 那 as nuó; 吧 as bā "bar") or garbled glosses.
 * bestForm can't disambiguate these, so we correct them by hand. Recomputes the
 * tone pattern whenever a reading changes.
 */
function applyCorrections(words: Word[]): number {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'corrections.json'), 'utf8'),
  ) as Record<string, { pinyinNumbered?: string; glossEn?: string }>;
  let n = 0;
  for (const w of words) {
    const c = raw[w.hanzi];
    if (!c || w.hanzi.startsWith('_')) continue;
    if (c.pinyinNumbered && c.pinyinNumbered !== w.pinyinNumbered) {
      w.pinyinNumbered = c.pinyinNumbered;
      w.tonePattern = toneNumbersOf(c.pinyinNumbered);
    }
    if (c.glossEn) w.glossEn = c.glossEn;
    n++;
  }
  return n;
}

/** Trim a leading "(qualifier)" / "(bound form)" so glosses read as plain meanings. */
function cleanGloss(m: string): string {
  const s = m.trim();
  const lead = s.match(/^\([^)]*\)\s*(.+)$/);
  return (lead && lead[1] && lead[1].length > 2 ? lead[1] : s).trim();
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
      const form = bestForm(e.forms);
      const numeric = form?.transcriptions?.numeric;
      const rawMeaning =
        (form?.meanings ?? []).find((m) => !/^variant of/i.test(m)) ?? form?.meanings?.[0];
      if (!numeric || !rawMeaning) continue;
      const meaning = cleanGloss(rawMeaning);
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
        spokenFreqRank: null, // filled by applySpokenFreq after SUBTLEX loads
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
    `INSERT INTO words(id,hanzi,pinyin_numbered,tone_pattern,gloss_en,hsk_level,frequency_rank,spoken_frequency_rank,component_breakdown)
     VALUES(@id,@hanzi,@pinyin,@tone,@gloss,@hsk,@freq,@spokenFreq,@comp)`,
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
        spokenFreq: w.spokenFreqRank,
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
  const corrected = applyCorrections(words);
  process.stdout.write(`  words: ${words.length} (${corrected} curated corrections applied)\n`);

  const subtlex = loadSubtlex(await cachedFetch(SUBTLEX_URL, 'subtlex-ch-wf.json'));
  applySpokenFreq(words, subtlex);
  const ranked = words.filter((w) => w.spokenFreqRank !== null).length;
  process.stdout.write(`  SUBTLEX-CH: ${subtlex.size} words; ranked ${ranked}/${words.length} seed words\n`);

  const sentences = generateSentences(
    words,
    (w) => posByHanzi.get(w.hanzi) ?? [],
    1500,
  );
  process.stdout.write(`  sentences: ${sentences.length}\n`);

  writeDb(words, sentences);
  writeJsonSnapshot(words, sentences);
  process.stdout.write('  wrote assets/db/xuexi-seed.db + src/data/seed.json\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
