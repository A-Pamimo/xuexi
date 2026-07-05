/**
 * i+1 feed selection (spec dopamine_design.infinite_swipe_feed + content_strategy).
 *
 * Comprehensible input: only serve sentences where a high fraction of words are
 * already known (~90%). The feed mixes 70% review-due / 20% new i+1 / 10%
 * surprise cards as a variable reward. Pure and unit-tested.
 */
import type { Sentence } from '../../lib/types';

const SURPRISE_TAGS = new Set(['chengyu', 'slang', 'meme', 'surprise']);

export const FEED_MIN_KNOWN_RATIO = 0.9; // i+1 target
export const FEED_FLOOR_KNOWN_RATIO = 0.85; // hard floor (verification #4)

export interface FeedInputs {
  sentences: Sentence[];
  knownWordIds: Set<number>;
  dueWordIds: Set<number>;
  count: number;
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
