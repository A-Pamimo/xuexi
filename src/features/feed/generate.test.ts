import { generateSentences, inferPos } from './generate';
import { knownRatio, FEED_FLOOR_KNOWN_RATIO } from './selection';
import type { Word } from '../../lib/types';

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

// A small lexicon spanning every POS the templates need, mirroring seed shapes.
const WORDS: Word[] = [
  word(384, '我', 'wo3', 'I; me; my'),
  word(275, '你', 'ni3', 'you (informal)'),
  word(358, '他', 'ta1', 'he; him'),
  word(1, '爱', 'ai4', 'to love; to be fond of'),
  word(47, '吃', 'chi1', 'to eat'),
  word(390, '喜欢', 'xi3 huan5', 'to like; to be fond of'),
  word(246, '米饭', 'mi3 fan4', 'rice'),
  word(37, '茶', 'cha2', 'tea'),
  word(344, '书', 'shu1', 'book'),
  word(148, '很', 'hen3', '(adverb of degree)'),
  word(116, '高', 'gao1', 'high'),
  word(233, '忙', 'mang2', 'busy'),
  word(140, '好', 'hao3', 'good'),
  // Noise the generator must ignore: a "to be" weak verb and a bare particle.
  word(340, '是', 'shi4', 'to be (followed by substantives only)'),
  word(71, '的', 'de5', "of; ~'s (possessive particle)"),
];

const allKnown = new Set(WORDS.map((w) => w.id));

describe('inferPos', () => {
  it('tags pronouns, verbs, adjectives and nouns from glosses', () => {
    expect(inferPos(word(384, '我', 'wo3', 'I; me; my'))).toBe('pronoun');
    expect(inferPos(word(47, '吃', 'chi1', 'to eat'))).toBe('verb');
    expect(inferPos(word(116, '高', 'gao1', 'high'))).toBe('adjective');
    expect(inferPos(word(344, '书', 'shu1', 'book'))).toBe('noun');
  });

  it('returns null for grammatical / ambiguous glosses', () => {
    expect(inferPos(word(71, '的', 'de5', "of; ~'s (possessive particle)"))).toBeNull();
  });
});

describe('generateSentences', () => {
  it('never emits a sentence below the 85% known-word floor', () => {
    const out = generateSentences({ words: WORDS, knownWordIds: allKnown, count: 20 });
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(knownRatio(s, allKnown)).toBeGreaterThanOrEqual(FEED_FLOOR_KNOWN_RATIO);
      // By construction every filler is known, so the floor is actually 100%.
      expect(knownRatio(s, allKnown)).toBe(1);
    }
  });

  it('produces no duplicate ids and uses negative ids (no seed collision)', () => {
    const out = generateSentences({ words: WORDS, knownWordIds: allKnown, count: 20 });
    const ids = out.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toBeLessThan(0);
  });

  it('honours the requested count as an upper bound', () => {
    const out = generateSentences({ words: WORDS, knownWordIds: allKnown, count: 3 });
    expect(out.length).toBeLessThanOrEqual(3);
    const zero = generateSentences({ words: WORDS, knownWordIds: allKnown, count: 0 });
    expect(zero).toEqual([]);
  });

  it('emits Sentence-shaped output with matching hanzi/pinyin/wordIds', () => {
    const out = generateSentences({
      words: WORDS,
      knownWordIds: allKnown,
      count: 20,
      rng: () => 0,
    });
    for (const s of out) {
      expect(s.sourceTag).toBe('generated');
      expect(s.audioRef).toBeNull();
      expect(s.hanzi.endsWith('。')).toBe(true);
      // pinyin has one syllable-group per wordId.
      expect(s.pinyin.split(' ').filter(Boolean).length).toBeGreaterThanOrEqual(s.wordIds.length);
      // wordIds are all drawn from the known set.
      for (const id of s.wordIds) expect(allKnown.has(id)).toBe(true);
    }
  });

  it('skips the S+很+Adj template when 很 is not known (stays grammatical)', () => {
    const without很 = new Set([...allKnown].filter((id) => id !== 148));
    const out = generateSentences({ words: WORDS, knownWordIds: without很, count: 20 });
    for (const s of out) {
      expect(s.wordIds).not.toContain(148);
      expect(s.hanzi).not.toContain('很');
    }
  });

  it('emits nothing when no valid template can be filled', () => {
    // Only a particle is known: no subject/verb/object/adjective to slot.
    const out = generateSentences({
      words: WORDS,
      knownWordIds: new Set([71]),
      count: 10,
    });
    expect(out).toEqual([]);
  });

  it('never puts the same word in subject and object position', () => {
    const out = generateSentences({
      words: WORDS,
      knownWordIds: allKnown,
      count: 30,
      rng: () => 0,
    });
    for (const s of out) {
      // S+V+O sentences have 3 wordIds; subject (0) must differ from object (2).
      if (s.wordIds.length === 3 && s.wordIds[1] !== 148) {
        expect(s.wordIds[0]).not.toBe(s.wordIds[2]);
      }
    }
  });
});
