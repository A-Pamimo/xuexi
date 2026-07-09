import { accuracyByTone, recentToneAccuracy, speakerTierFor } from './toneAdaptive';
import type { ToneDrillResult, ToneNumber } from './types';

const res = (correctTone: ToneNumber, chosenTone: ToneNumber, speakerId = 'zh-a'): ToneDrillResult => ({
  syllable: 'ma',
  speakerId,
  chosenTone,
  correctTone,
  latencyMs: 500,
  timestamp: '2026-01-01T00:00:00Z',
});
/** n trials, `hits` of them correct. */
const trials = (n: number, hits: number): ToneDrillResult[] =>
  Array.from({ length: n }, (_, i) => res(1, i < hits ? 1 : 2));

describe('recentToneAccuracy', () => {
  it('is 0 with no history and reflects the last window', () => {
    expect(recentToneAccuracy([])).toBe(0);
    expect(recentToneAccuracy(trials(20, 15), 20)).toBeCloseTo(0.75);
  });
});

describe('speakerTierFor — earned variability', () => {
  it('starts beginners on a single voice (too little evidence to widen)', () => {
    const r = speakerTierFor(trials(4, 4));
    expect(r.tier).toBe(1);
    expect(r.allowed).toEqual(['zh-a']);
  });
  it('widens to two voices at moderate accuracy', () => {
    const r = speakerTierFor(trials(20, 15)); // 75%
    expect(r.tier).toBe(2);
    expect(r.allowed).toEqual(['zh-a', 'zh-b']);
  });
  it('opens all three voices at high accuracy', () => {
    const r = speakerTierFor(trials(20, 19)); // 95%
    expect(r.tier).toBe(3);
    expect(r.allowed).toEqual(['zh-a', 'zh-b', 'zh-c']);
  });
  it('narrows again if recent accuracy drops', () => {
    const r = speakerTierFor(trials(20, 10)); // 50%
    expect(r.tier).toBe(1);
  });
});

describe('accuracyByTone', () => {
  it('reports per-tone accuracy and a trend delta', () => {
    // prior window: tone 3 at 50%; recent window: tone 3 at 100%.
    const history = [
      res(3, 1), res(3, 3), // prior: 1/2 correct
      res(3, 3), res(3, 3), // recent: 2/2 correct
    ];
    const rows = accuracyByTone(history, 2);
    const t3 = rows.find((r) => r.tone === 3)!;
    expect(t3.pct).toBeCloseTo(1);
    expect(t3.delta).toBeCloseTo(0.5);
  });
  it('leaves untried tones null', () => {
    const rows = accuracyByTone([res(1, 1)], 10);
    expect(rows.find((r) => r.tone === 4)!.pct).toBeNull();
  });
});
