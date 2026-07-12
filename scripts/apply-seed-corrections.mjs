/**
 * Apply scripts/build-seed/corrections.json to the shipped snapshot
 * (src/data/seed.json) in place, without a full `npm run seed:build` (which needs
 * the gated HSK/SUBTLEX datasets). Idempotent. Recomputes tonePattern when a
 * reading changes. Run: `node scripts/apply-seed-corrections.mjs`.
 *
 * The canonical fix lives in the build pipeline (applyCorrections); this keeps the
 * bundled JSON in sync so the app ships correct data before the next rebuild.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = join(ROOT, 'src/data/seed.json');
const CORR = join(ROOT, 'scripts/build-seed/corrections.json');

const toneNumbersOf = (numbered) =>
  numbered
    .split(/\s+/)
    .filter(Boolean)
    .map((syl) => {
      const m = syl.match(/([1-5])$/);
      return m ? Number(m[1]) : 5;
    });

const corr = JSON.parse(readFileSync(CORR, 'utf8'));
const seed = JSON.parse(readFileSync(SEED, 'utf8'));

let changed = 0;
for (const w of seed.words) {
  const c = corr[w.hanzi];
  if (!c || w.hanzi.startsWith('_')) continue;
  let touched = false;
  if (c.pinyinNumbered && c.pinyinNumbered !== w.pinyinNumbered) {
    w.pinyinNumbered = c.pinyinNumbered;
    w.tonePattern = toneNumbersOf(c.pinyinNumbered);
    touched = true;
  }
  if (c.glossEn && c.glossEn !== w.glossEn) {
    w.glossEn = c.glossEn;
    touched = true;
  }
  if (touched) {
    changed++;
    process.stdout.write(`  ${w.hanzi} → ${w.pinyinNumbered} · ${w.glossEn}\n`);
  }
}

writeFileSync(SEED, JSON.stringify(seed));
process.stdout.write(`Applied ${changed} corrections to src/data/seed.json\n`);
