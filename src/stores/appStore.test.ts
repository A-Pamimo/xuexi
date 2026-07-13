import { bySpokenFreq, today, useApp } from './appStore';
import { Store } from '../lib/db/store';
import type { Word } from '../lib/types';

const w = (id: number, spokenFreqRank: number | null): Word => ({
  id,
  hanzi: 'x',
  pinyinNumbered: 'x',
  tonePattern: [1],
  glossEn: 'x',
  hskLevel: 1,
  frequencyRank: null,
  spokenFreqRank,
  componentBreakdown: [],
});

describe('today — local calendar date', () => {
  it('reads the LOCAL date, never UTC (a UTC+8 user before 8am is still on today)', () => {
    // A fake with only local getters: any regression to toISOString() throws.
    const localOnly = {
      getFullYear: () => 2026,
      getMonth: () => 6, // July (0-based)
      getDate: () => 13,
    } as unknown as Date;
    expect(today(localOnly)).toBe('2026-07-13');
  });

  it('zero-pads month and day', () => {
    expect(today(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
    expect(today(new Date(2026, 10, 30, 12, 0))).toBe('2026-11-30');
  });
});

describe('noteGloss — feed→FSRS auto-promotion (research P0-5)', () => {
  it('promotes a word into spaced review exactly at the second gloss', async () => {
    const store = await Store.open({
      async load() {
        return null;
      },
      async save() {},
    });
    useApp.setState({ store });
    const wordId = store.words[0]!.id;
    const { noteGloss } = useApp.getState();

    noteGloss(wordId);
    expect(store.getCard(wordId)).toBeUndefined(); // one curious glance ≠ commitment

    noteGloss(wordId);
    expect(store.getCard(wordId)).toBeDefined(); // second gloss → FSRS queue

    noteGloss(wordId); // further glosses must not duplicate the card
    expect(store.allCards().filter((c) => c.wordId === wordId)).toHaveLength(1);
  });
});

describe('bySpokenFreq — spoken-frequency ordering', () => {
  it('orders by ascending spoken-frequency rank (most frequent first)', () => {
    const sorted = [w(1, 300), w(2, 5), w(3, 50)].sort(bySpokenFreq).map((x) => x.id);
    expect(sorted).toEqual([2, 3, 1]);
  });

  it('places words absent from SUBTLEX-CH (null rank) last', () => {
    const sorted = [w(1, null), w(2, 10), w(3, null), w(4, 2)].sort(bySpokenFreq).map((x) => x.id);
    expect(sorted.slice(0, 2)).toEqual([4, 2]); // ranked words first, in order
    expect(sorted.slice(2).sort()).toEqual([1, 3]); // unranked words trail
  });
});
