/**
 * Pinyin conversion. Data stores tone NUMBERS (e.g. "ni3 hao3"); the UI renders
 * tone MARKS (e.g. "nǐ hǎo") per coding conventions. This is the single source
 * of that transformation.
 */
import type { ToneNumber } from './types';

const TONE_TABLE: Record<string, string[]> = {
  // index 0 = tone1 ... index 3 = tone4; neutral (tone5) keeps the base vowel
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/** Convert a single numbered syllable ("hao3", "lv4", "ma") to tone marks. */
export function syllableToMarks(input: string): string {
  const match = input.trim().match(/^([a-zü:]+?)([1-5])?$/i);
  if (!match) return input;
  const [, rawBody, toneStr] = match;
  let body = (rawBody ?? '').toLowerCase().replace(/u:/g, 'ü').replace(/v/g, 'ü');
  const tone = toneStr ? (Number(toneStr) as ToneNumber) : 5;

  if (tone === 5) return body; // neutral tone: no mark

  const target = pickVowel(body);
  if (target === -1) return body;
  const vowel = body[target]!;
  const marked = TONE_TABLE[vowel]?.[tone - 1] ?? vowel;
  return body.slice(0, target) + marked + body.slice(target + 1);
}

/** Convert a space-separated numbered pinyin string to tone marks. */
export function toMarks(numbered: string): string {
  return numbered
    .split(/\s+/)
    .filter(Boolean)
    .map(syllableToMarks)
    .join(' ');
}

/**
 * Standard tone-mark placement:
 *  - a or e always wins;
 *  - the o in "ou" wins;
 *  - otherwise the last vowel takes the mark.
 */
function pickVowel(body: string): number {
  const a = body.indexOf('a');
  if (a !== -1) return a;
  const e = body.indexOf('e');
  if (e !== -1) return e;
  const ou = body.indexOf('ou');
  if (ou !== -1) return ou; // the 'o'
  let last = -1;
  for (let i = 0; i < body.length; i++) {
    if ('aoeiuü'.includes(body[i]!)) last = i;
  }
  return last;
}

/** Parse a numbered pinyin string into its per-syllable tone numbers. */
export function toneNumbersOf(numbered: string): ToneNumber[] {
  return numbered
    .split(/\s+/)
    .filter(Boolean)
    .map((syl) => {
      const m = syl.match(/([1-5])$/);
      return (m ? Number(m[1]) : 5) as ToneNumber;
    });
}
