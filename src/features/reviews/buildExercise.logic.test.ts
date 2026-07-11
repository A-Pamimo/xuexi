import {
  gradeOrder,
  scrambleTokens,
  seedFromIds,
  type BuildToken,
} from './buildExercise.logic';

function tok(id: number): BuildToken {
  return { id, hanzi: `h${id}`, pinyin: `p${id}` };
}

const correct = [tok(1), tok(2), tok(3), tok(4)];

describe('scrambleTokens', () => {
  it('preserves the multiset of tokens (same ids, reordered)', () => {
    const out = scrambleTokens(correct, seedFromIds([1, 2, 3, 4]));
    expect(out).toHaveLength(correct.length);
    expect([...out].map((t) => t.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it('never returns the already-correct order for length > 1', () => {
    // Sweep many seeds — none may hand back a pre-solved bank.
    for (let seed = 0; seed < 500; seed++) {
      const out = scrambleTokens(correct, seed);
      expect(gradeOrder(out, correct)).toBe(false);
    }
  });

  it('is deterministic for a given seed', () => {
    const s = seedFromIds([4, 8, 15, 16]);
    const a = scrambleTokens([tok(4), tok(8), tok(15), tok(16)], s);
    const b = scrambleTokens([tok(4), tok(8), tok(15), tok(16)], s);
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id));
  });

  it('varies by input (different sentences scramble differently)', () => {
    const s1 = seedFromIds([1, 2, 3, 4]);
    const s2 = seedFromIds([4, 3, 2, 1]);
    expect(s1).not.toBe(s2);
  });

  it('handles the trivial single- and empty-token cases without looping', () => {
    expect(scrambleTokens([], 1)).toEqual([]);
    const one = scrambleTokens([tok(7)], 1);
    expect(one.map((t) => t.id)).toEqual([7]);
  });

  it('for a 2-token bank always swaps to the only other order', () => {
    const pair = [tok(1), tok(2)];
    for (let seed = 0; seed < 50; seed++) {
      expect(scrambleTokens(pair, seed).map((t) => t.id)).toEqual([2, 1]);
    }
  });
});

describe('gradeOrder', () => {
  it('passes only on an exact id-order match', () => {
    expect(gradeOrder([tok(1), tok(2), tok(3), tok(4)], correct)).toBe(true);
  });

  it('fails on a wrong order', () => {
    expect(gradeOrder([tok(2), tok(1), tok(3), tok(4)], correct)).toBe(false);
  });

  it('fails on an incomplete answer', () => {
    expect(gradeOrder([tok(1), tok(2)], correct)).toBe(false);
  });

  it('grades by id, not object identity (fresh chip objects still match)', () => {
    const fresh = correct.map((t) => ({ ...t }));
    expect(gradeOrder(fresh, correct)).toBe(true);
  });
});

describe('seedFromIds', () => {
  it('is stable and order-sensitive', () => {
    expect(seedFromIds([1, 2, 3])).toBe(seedFromIds([1, 2, 3]));
    expect(seedFromIds([1, 2, 3])).not.toBe(seedFromIds([3, 2, 1]));
  });
});
