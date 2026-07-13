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

  it('scalar stats take the max; unlocks union', () => {
    const local = blob({ stats: { ...blob().stats, xp: 100, totalInputMinutes: 30, unlocks: ['a'] } });
    const remote = blob({ stats: { ...blob().stats, xp: 40, totalInputMinutes: 90, unlocks: ['b'] } });
    const st = mergeProgress(local, remote).stats;
    expect(st.xp).toBe(100);
    expect(st.totalInputMinutes).toBe(90);
    expect(new Set(st.unlocks)).toEqual(new Set(['a', 'b']));
  });

  // Streaks are rebuilt from the merged session history rather than merged
  // field-wise — max(streak) + later(lastStreakDate) could pair a stale device's
  // high streak with a fresh date, resurrecting a broken streak forever.
  const qDay = (date: string): [string, ProgressBlob['sessions'][string]] => [
    date,
    { date, reviewsDone: 25, feedSeconds: 0, toneDrillSeconds: 0, xpEarned: 0, comboMax: 0 },
  ];
  const qSessions = (dates: string[]) => Object.fromEntries(dates.map(qDay));

  it('does not resurrect a broken streak from a stale device', () => {
    // Remote device last studied a 3-day run ending Jan 3, then went stale.
    const remote = blob({
      sessions: qSessions(['2026-01-01', '2026-01-02', '2026-01-03']),
      stats: { ...blob().stats, streak: 3, lastStreakDate: '2026-01-03' },
    });
    // Local device started a fresh 2-day run a week later.
    const local = blob({
      sessions: qSessions(['2026-01-10', '2026-01-11']),
      stats: { ...blob().stats, streak: 2, lastStreakDate: '2026-01-11' },
    });
    const st = mergeProgress(local, remote).stats;
    expect(st.streak).toBe(2); // NOT 3 — the old run was broken by the gap
    expect(st.lastStreakDate).toBe('2026-01-11');
  });

  it('bridges a streak continued across two devices', () => {
    const local = blob({ sessions: qSessions(['2026-01-01', '2026-01-02']) });
    const remote = blob({ sessions: qSessions(['2026-01-03']) });
    const st = mergeProgress(local, remote).stats;
    expect(st.streak).toBe(3); // days on either device count toward one run
    expect(st.lastStreakDate).toBe('2026-01-03');
  });

  it('tone results union and dedupe by identity', () => {
    const r = { syllable: 'ma', speakerId: 's1', chosenTone: 1 as const, correctTone: 1 as const, latencyMs: 500, timestamp: '2026-01-01T00:00:00Z' };
    const m = mergeProgress(blob({ toneResults: [r] }), blob({ toneResults: [r, { ...r, timestamp: '2026-01-02T00:00:00Z' }] }));
    expect(m.toneResults).toHaveLength(2);
  });

  it('tone-result identity includes the correct tone (seed relabels stay distinct)', () => {
    const r = { syllable: 'ma', speakerId: 's1', chosenTone: 1 as const, correctTone: 1 as const, latencyMs: 500, timestamp: '2026-01-01T00:00:00Z' };
    const m = mergeProgress(
      blob({ toneResults: [r] }),
      blob({ toneResults: [{ ...r, correctTone: 3 as const }] }),
    );
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
