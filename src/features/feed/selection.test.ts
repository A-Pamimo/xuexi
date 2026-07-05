import { knownRatio, selectFeed, FEED_FLOOR_KNOWN_RATIO } from './selection';
import type { Sentence } from '../../lib/types';

function sentence(id: number, wordIds: number[], sourceTag = 'graded'): Sentence {
  return {
    id,
    hanzi: `s${id}`,
    pinyin: '',
    glossEn: '',
    wordIds,
    difficultyScore: 0,
    audioRef: null,
    sourceTag,
  };
}

const known = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

describe('feed selection', () => {
  it('computes known ratio', () => {
    expect(knownRatio(sentence(1, [1, 2, 3]), known)).toBe(1);
    expect(knownRatio(sentence(2, [1, 2, 99]), known)).toBeCloseTo(2 / 3);
  });

  it('never serves a sentence below the 85% known-word floor', () => {
    const sentences = [
      sentence(1, [1, 2, 3]), // 100% known
      sentence(2, [1, 2, 3, 4, 99]), // 80% -> excluded
      sentence(3, [1, 2, 3, 4, 5, 6, 7, 8, 9, 98]), // 90%
      sentence(4, [98, 97, 96]), // 0% -> excluded
    ];
    const feed = selectFeed({
      sentences,
      knownWordIds: known,
      dueWordIds: new Set([1]),
      count: 10,
      rng: () => 0.5,
    });
    for (const s of feed) {
      expect(knownRatio(s, known)).toBeGreaterThanOrEqual(FEED_FLOOR_KNOWN_RATIO);
    }
    // The 80% and 0% sentences must not appear.
    expect(feed.find((s) => s.id === 2)).toBeUndefined();
    expect(feed.find((s) => s.id === 4)).toBeUndefined();
  });

  it('prioritises review-due sentences in the mix', () => {
    const sentences = [
      ...Array.from({ length: 10 }, (_, i) => sentence(100 + i, [1, 2, 3])), // fresh
      ...Array.from({ length: 10 }, (_, i) => sentence(200 + i, [1, 2, 5])), // due (word 5)
    ];
    const feed = selectFeed({
      sentences,
      knownWordIds: known,
      dueWordIds: new Set([5]),
      count: 10,
      rng: () => 0.5,
    });
    const dueCount = feed.filter((s) => s.wordIds.includes(5)).length;
    expect(dueCount).toBeGreaterThanOrEqual(6); // ~70%
  });

  it('returns at most count items and no duplicates', () => {
    const sentences = Array.from({ length: 50 }, (_, i) => sentence(i + 1, [1, 2, 3]));
    const feed = selectFeed({
      sentences,
      knownWordIds: known,
      dueWordIds: new Set(),
      count: 8,
      rng: () => 0.3,
    });
    expect(feed.length).toBe(8);
    expect(new Set(feed.map((s) => s.id)).size).toBe(8);
  });
});
