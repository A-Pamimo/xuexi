/**
 * "Build the sentence" production mechanic — pure grading + shuffle logic.
 *
 * A production exercise (recall > recognition; research U3): the learner
 * re-orders a scrambled bank of the sentence's real word tokens back into the
 * correct order. Kept pure and unit-tested; BuildExercise.tsx renders it and
 * appStore/juice handle side-effects.
 *
 * Determinism: the shuffle takes a seed (derived from the token ids by the
 * caller) so it's reproducible in tests and stable per sentence — never
 * Math.random at module scope. For length > 1 it guarantees the returned order
 * differs from the already-correct order (a pre-solved bank would be no puzzle).
 */

/** One placeable chip in the word bank. `id` is stable across a shuffle. */
export interface BuildToken {
  /** Stable identity (typically the underlying wordId) — used for grading. */
  id: number;
  /** Display hanzi for the chip. */
  hanzi: string;
  /** Pinyin with tone numbers, for the chip's secondary line. */
  pinyin: string;
}

/**
 * Deterministic 32-bit hash of a token-id list — a stable per-sentence seed so
 * the same sentence always scrambles the same way (no Math.random at import).
 */
export function seedFromIds(ids: number[]): number {
  let h = 2166136261; // FNV-1a offset basis
  for (const id of ids) {
    h ^= id + 0x9e3779b9 + (h << 6) + (h >> 2);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small deterministic PRNG (mulberry32) — no global RNG dependency. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True when two token arrays are in the same id order. */
function sameOrder(a: BuildToken[], b: BuildToken[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((t, i) => t.id === b[i]!.id);
}

/**
 * Scramble a sentence's word tokens into a bank order for the puzzle.
 *
 * Deterministic given `seed` (derive it from the token ids via `seedFromIds`).
 * For length > 1 the result is guaranteed NOT to equal the correct order: if a
 * Fisher–Yates pass lands back on the identity we rotate by one, which for any
 * length > 1 always breaks the ordering.
 */
export function scrambleTokens(tokens: BuildToken[], seed: number): BuildToken[] {
  if (tokens.length <= 1) return tokens.slice();

  const rng = mulberry32(seed);
  const a = tokens.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }

  // Never hand back an already-solved bank: rotate once to guarantee a change.
  if (sameOrder(a, tokens)) {
    const first = a.shift()!;
    a.push(first);
  }
  return a;
}

/**
 * Grade a picked ordering against the correct token order. True only when every
 * position's token id matches — the strict, honest pass condition (no partial
 * credit here; the UI reveals the correct order on a miss).
 */
export function gradeOrder(picked: BuildToken[], correct: BuildToken[]): boolean {
  return sameOrder(picked, correct);
}
