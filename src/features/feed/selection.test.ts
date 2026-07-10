import { knownRatio, selectFeed, FEED_FLOOR_KNOWN_RATIO } from './selection';
import type { Sentence, Word } from '../../lib/types';

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

/** Minimal Word factory — only the fields the generator reads matter here. */
function word(id: number, hanzi: string, pinyinNumbered: string, glossEn: string): Word {
  return {
    id,
    hanzi,
    pinyinNumbered,
    tonePattern: [],
    glossEn,
    hskLevel: 1,
    frequencyRank: null,
    spokenFreqRank: null,
    componentBreakdown: [],
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

  describe('generated top-up (curated pool exhausted)', () => {
    // A lexicon rich enough that the generator can compose several i+1 cards.
    const genWords: Word[] = [
      word(384, '我', 'wo3', 'I; me; my'),
      word(275, '你', 'ni3', 'you (informal)'),
      word(47, '吃', 'chi1', 'to eat'),
      word(390, '喜欢', 'xi3 huan5', 'to like; to be fond of'),
      word(246, '米饭', 'mi3 fan4', 'rice'),
      word(344, '书', 'shu1', 'book'),
      word(148, '很', 'hen3', '(adverb of degree)'),
      word(116, '高', 'gao1', 'high'),
      word(233, '忙', 'mang2', 'busy'),
    ];
    const genKnown = new Set(genWords.map((w) => w.id));

    it('tops up a short curated pool with generated sentences', () => {
      // Only one curated sentence qualifies, but we ask for 6.
      const feed = selectFeed({
        sentences: [sentence(1, [384, 47, 246])],
        knownWordIds: genKnown,
        dueWordIds: new Set(),
        count: 6,
        words: genWords,
        rng: () => 0.5,
      });
      expect(feed.length).toBeGreaterThan(1); // curated alone gave only 1
      // Generated fillers carry the 'generated' tag and negative ids.
      const generated = feed.filter((s) => s.sourceTag === 'generated');
      expect(generated.length).toBeGreaterThan(0);
      for (const s of generated) expect(s.id).toBeLessThan(0);
    });

    it('never lets generated fillers breach the 85% floor and keeps ids unique', () => {
      const feed = selectFeed({
        sentences: [],
        knownWordIds: genKnown,
        dueWordIds: new Set(),
        count: 8,
        words: genWords,
        rng: () => 0.4,
      });
      expect(feed.length).toBeLessThanOrEqual(8);
      for (const s of feed) {
        expect(knownRatio(s, genKnown)).toBeGreaterThanOrEqual(FEED_FLOOR_KNOWN_RATIO);
      }
      expect(new Set(feed.map((s) => s.id)).size).toBe(feed.length);
    });

    it('does not generate when no words list is passed (default off)', () => {
      const feed = selectFeed({
        sentences: [sentence(1, [1, 2, 3])],
        knownWordIds: known,
        dueWordIds: new Set(),
        count: 10,
        rng: () => 0.5,
      });
      // Only the single curated sentence — no top-up without a word list.
      expect(feed.length).toBe(1);
      expect(feed.every((s) => s.sourceTag !== 'generated')).toBe(true);
    });

    it('does not top up when the curated pool already fills count', () => {
      const sentences = Array.from({ length: 20 }, (_, i) => sentence(i + 1, [384, 47, 246]));
      const feed = selectFeed({
        sentences,
        knownWordIds: genKnown,
        dueWordIds: new Set(),
        count: 5,
        words: genWords,
        rng: () => 0.3,
      });
      expect(feed.length).toBe(5);
      // No generated card needed — the curated pool covered the whole count.
      expect(feed.every((s) => s.sourceTag !== 'generated')).toBe(true);
    });
  });
});
