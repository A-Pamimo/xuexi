/**
 * i+1 feed selection (spec dopamine_design.infinite_swipe_feed + content_strategy).
 *
 * Comprehensible input: only serve sentences where a high fraction of words are
 * already known (~90%). The feed mixes 70% review-due / 20% new i+1 / 10%
 * surprise cards as a variable reward. Pure and unit-tested.
 */
import type { Sentence, Word } from '../../lib/types';
import { generateSentences } from './generate';

const SURPRISE_TAGS = new Set(['chengyu', 'slang', 'meme', 'surprise']);

export const FEED_MIN_KNOWN_RATIO = 0.9; // i+1 target
export const FEED_FLOOR_KNOWN_RATIO = 0.85; // hard floor (verification #4)

export interface FeedInputs {
  sentences: Sentence[];
  knownWordIds: Set<number>;
  dueWordIds: Set<number>;
  count: number;
  /**
   * When the curated pool can't fill `count` under the 85% floor, top up with
   * template-generated i+1 sentences composed from this word list (see
   * generate.ts). Omit it — the default — to disable generation entirely, so
   * existing call sites and tests that pass no words behave exactly as before.
   */
  words?: Word[];
  rng?: () => number;
}

export function knownRatio(sentence: Sentence, known: Set<number>): number {
  if (sentence.wordIds.length === 0) return 1;
  const hit = sentence.wordIds.filter((id) => known.has(id)).length;
  return hit / sentence.wordIds.length;
}

interface Scored {
  sentence: Sentence;
  ratio: number;
  isDue: boolean;
  isSurprise: boolean;
}

/**
 * Build a feed of up to `count` sentences honoring the 70/20/10 mix and never
 * dipping below the 85% known-word floor.
 */
export function selectFeed(inputs: FeedInputs): Sentence[] {
  const { sentences, knownWordIds, dueWordIds, count } = inputs;
  const rng = inputs.rng ?? Math.random;

  const eligible: Scored[] = sentences
    .map((s) => ({
      sentence: s,
      ratio: knownRatio(s, knownWordIds),
      isDue: s.wordIds.some((id) => dueWordIds.has(id)),
      isSurprise: SURPRISE_TAGS.has(s.sourceTag),
    }))
    .filter((s) => s.ratio >= FEED_FLOOR_KNOWN_RATIO);

  // Prefer i+1 (>=0.9) items; fall back to the 0.85 floor only to fill.
  const atTarget = eligible.filter((s) => s.ratio >= FEED_MIN_KNOWN_RATIO);
  const pool = atTarget.length >= count ? atTarget : eligible;

  const shuffled = shuffle(pool, rng);
  const due = shuffled.filter((s) => s.isDue && !s.isSurprise);
  const surprise = shuffled.filter((s) => s.isSurprise);
  const fresh = shuffled.filter((s) => !s.isDue && !s.isSurprise);

  const quota = {
    due: Math.round(count * 0.7),
    fresh: Math.round(count * 0.2),
    surprise: count - Math.round(count * 0.7) - Math.round(count * 0.2),
  };

  const out: Sentence[] = [];
  const used = new Set<number>();
  const take = (arr: Scored[], n: number) => {
    for (const s of arr) {
      if (out.length >= count || n <= 0) break;
      if (used.has(s.sentence.id)) continue;
      used.add(s.sentence.id);
      out.push(s.sentence);
      n--;
    }
  };
  take(due, quota.due);
  take(fresh, quota.fresh);
  take(surprise, quota.surprise);
  // Backfill any shortfall from whatever remains (keeps the feed infinite).
  take(shuffled, count - out.length);

  // Curated pool exhausted below `count`? Top up with generated i+1 sentences so
  // the feed never runs dry (content_strategy). Only when a word list is passed;
  // generated cards are >=85% known by construction (in fact 100% known-plus-
  // known-particle), so the floor holds, but we re-check it here to keep the
  // invariant local and explicit — an ungrammatical or under-floor generated
  // card is simply dropped rather than served. Generated ids are negative and
  // thus can't collide with curated ids; `used` guards against that anyway.
  if (out.length < count && inputs.words && inputs.words.length > 0) {
    const generated = generateSentences({
      words: inputs.words,
      knownWordIds,
      count: count - out.length,
      rng,
    });
    for (const s of generated) {
      if (out.length >= count) break;
      if (used.has(s.id)) continue;
      if (knownRatio(s, knownWordIds) < FEED_FLOOR_KNOWN_RATIO) continue;
      used.add(s.id);
      out.push(s);
    }
  }

  return out;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
