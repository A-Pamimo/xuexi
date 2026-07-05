import {
  advanceStreak,
  dayQualifies,
  levelForXp,
  levelProgress,
  rollReward,
  xpForLevel,
} from './gamification';
import type { SessionLog, UserStats } from './types';

const baseStats: UserStats = {
  streak: 0,
  lastStreakDate: null,
  streakFreezes: 0,
  totalInputMinutes: 0,
  knownWordCount: 0,
  xp: 0,
  level: 1,
  unlocks: [],
};
const session = (p: Partial<SessionLog>): SessionLog => ({
  date: '2026-01-01',
  reviewsDone: 0,
  feedSeconds: 0,
  toneDrillSeconds: 0,
  xpEarned: 0,
  comboMax: 0,
  ...p,
});

describe('levels', () => {
  it('level rises with xp and thresholds are monotonic', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(200)).toBe(3);
    expect(xpForLevel(2)).toBeLessThan(xpForLevel(3));
    const p = levelProgress(60);
    expect(p.level).toBe(2);
    expect(p.into).toBeGreaterThanOrEqual(0);
    expect(p.span).toBeGreaterThan(0);
  });
});

describe('variable reward', () => {
  it('gives no bonus above the 8% threshold', () => {
    expect(rollReward(() => 0.5)).toEqual({ multiplier: 1, golden: false });
  });
  it('gives a multiplier within the 8% window', () => {
    const r = rollReward(() => 0.01);
    expect(r.multiplier).toBeGreaterThan(1);
    expect([1.5, 2, 3, 5]).toContain(r.multiplier);
  });
});

describe('streak integrity', () => {
  it('only qualifies a day with real learning', () => {
    expect(dayQualifies(session({ reviewsDone: 20 }))).toBe(true);
    expect(dayQualifies(session({ feedSeconds: 300 }))).toBe(true);
    expect(dayQualifies(session({ reviewsDone: 5, feedSeconds: 60 }))).toBe(false);
  });

  it('increments on consecutive days and resets on a gap', () => {
    let s = advanceStreak(baseStats, '2026-01-01');
    expect(s.streak).toBe(1);
    s = advanceStreak(s, '2026-01-02');
    expect(s.streak).toBe(2);
    // gap of 3 days -> reset
    s = advanceStreak(s, '2026-01-05');
    expect(s.streak).toBe(1);
  });

  it('is idempotent within the same day', () => {
    let s = advanceStreak(baseStats, '2026-01-01');
    s = advanceStreak(s, '2026-01-01');
    expect(s.streak).toBe(1);
  });

  it('consumes a freeze to bridge a one-day gap', () => {
    let s: UserStats = { ...baseStats, streak: 4, streakFreezes: 1, lastStreakDate: '2026-01-01' };
    s = advanceStreak(s, '2026-01-03'); // gap of 2 -> use freeze
    expect(s.streak).toBe(5);
    expect(s.streakFreezes).toBe(1); // spent 1, earned 1 at the 5-day milestone
  });

  it('earns a freeze every 5 days', () => {
    let s = baseStats;
    const days = ['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05'];
    for (const d of days) s = advanceStreak(s, d);
    expect(s.streak).toBe(5);
    expect(s.streakFreezes).toBe(1);
  });
});
