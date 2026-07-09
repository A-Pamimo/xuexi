import { bySpokenFreq } from './appStore';
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
