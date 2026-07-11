import { mergeProgress, toCloudBlob } from './mergeProgress';
import type { ProgressBlob } from './db/store';
import type { Card } from './types';

function card(wordId: number, over: Partial<Card> = {}): Card {
  return {
    wordId,
    stability: 1,
    difficulty: 5,
    due: '2026-01-01T00:00:00.000Z',
    reps: 1,
    lapses: 0,
    state: 2,
    lastReview: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function blob(over: Partial<ProgressBlob> = {}): ProgressBlob {
  return {
    onboarded: false,
    cards: {},
    toneResults: [],
    sessions: {},
    stats: {
      streak: 0,
      lastStreakDate: null,
      streakFreezes: 0,
      totalInputMinutes: 0,
      knownWordCount: 0,
      xp: 0,
      level: 1,
      unlocks: [],
    },
    glossCounts: {},
    themeMode: 'system',
    showPinyin: true,
    dailyGoal: 50,
    goalCelebrated: {},
    reminderPrefs: { enabled: false, hour: 19 },
    analytics: [],
    ...over,
  };
}

describe('mergeProgress', () => {
  it('onboarded is sticky — true if either side onboarded', () => {
    expect(mergeProgress(blob({ onboarded: true }), blob()).onboarded).toBe(true);
    expect(mergeProgress(blob(), blob({ onboarded: true })).onboarded).toBe(true);
    expect(mergeProgress(blob(), blob()).onboarded).toBe(false);
  });

  it('keeps the more-progressed card per word (more reps, then stability)', () => {
    const local = blob({ cards: { 1: card(1, { reps: 2, stability: 5 }) } });
    const remote = blob({ cards: { 1: card(1, { reps: 5, stability: 3 }), 2: card(2) } });
    const m = mergeProgress(local, remote);
    expect(m.cards[1]!.reps).toBe(5); // remote had more reps
    expect(m.cards[2]).toBeDefined(); // remote-only card carried over
  });

  it('sessions merge by max per counter, never losing a busier day', () => {
    const local = blob({ sessions: { '2026-01-01': { date: '2026-01-01', reviewsDone: 10, feedSeconds: 0, toneDrillSeconds: 5, xpEarned: 20, comboMax: 3 } } });
    const remote = blob({ sessions: { '2026-01-01': { date: '2026-01-01', reviewsDone: 4, feedSeconds: 60, toneDrillSeconds: 5, xpEarned: 50, comboMax: 2 } } });
    const s = mergeProgress(local, remote).sessions['2026-01-01']!;
    expect(s).toEqual({ date: '2026-01-01', reviewsDone: 10, feedSeconds: 60, toneDrillSeconds: 5, xpEarned: 50, comboMax: 3 });
  });

  it('stats take the max and the later streak date; unlocks union', () => {
    const local = blob({ stats: { ...blob().stats, xp: 100, streak: 3, lastStreakDate: '2026-01-05', unlocks: ['a'] } });
    const remote = blob({ stats: { ...blob().stats, xp: 40, streak: 7, lastStreakDate: '2026-01-03', unlocks: ['b'] } });
    const st = mergeProgress(local, remote).stats;
    expect(st.xp).toBe(100);
    expect(st.streak).toBe(7);
    expect(st.lastStreakDate).toBe('2026-01-05');
    expect(new Set(st.unlocks)).toEqual(new Set(['a', 'b']));
  });

  it('tone results union and dedupe by identity', () => {
    const r = { syllable: 'ma', speakerId: 's1', chosenTone: 1 as const, correctTone: 1 as const, latencyMs: 500, timestamp: '2026-01-01T00:00:00Z' };
    const m = mergeProgress(blob({ toneResults: [r] }), blob({ toneResults: [r, { ...r, timestamp: '2026-01-02T00:00:00Z' }] }));
    expect(m.toneResults).toHaveLength(2);
  });

  it('device prefs come from local; analytics stay local', () => {
    const local = blob({ themeMode: 'dark', showPinyin: false, analytics: [{ x: 1 } as never] });
    const remote = blob({ themeMode: 'light', showPinyin: true, analytics: [{ y: 2 } as never] });
    const m = mergeProgress(local, remote);
    expect(m.themeMode).toBe('dark');
    expect(m.showPinyin).toBe(false);
    expect(m.analytics).toEqual(local.analytics);
  });

  it('toCloudBlob strips analytics', () => {
    expect('analytics' in toCloudBlob(blob({ analytics: [{ a: 1 } as never] }))).toBe(false);
  });
});
