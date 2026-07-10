import {
  advanceStreak,
  DAILY_GOAL_XP,
  dayQualifies,
  earnedReward,
  goalProgress,
  levelForXp,
  levelProgress,
  rollingHitRate,
  xpForLevel,
  xpForReview,
  xpForTone,
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

describe('xpForReview — weighted by cognitive demand', () => {
  it('a lapse earns a flat token', () => {
    expect(xpForReview('again', { difficulty: 8, retrievability: 0.2 })).toBe(2);
  });
  it('strictly increases with difficulty (holding retrievability fixed)', () => {
    const easy = xpForReview('good', { difficulty: 2, retrievability: 0.9 });
    const mid = xpForReview('good', { difficulty: 5, retrievability: 0.9 });
    const hard = xpForReview('good', { difficulty: 9, retrievability: 0.9 });
    expect(easy).toBeLessThan(mid);
    expect(mid).toBeLessThan(hard);
  });
  it('pays more when recall was shakier (lower retrievability)', () => {
    const fresh = xpForReview('good', { difficulty: 5, retrievability: 0.95 });
    const shaky = xpForReview('good', { difficulty: 5, retrievability: 0.3 });
    expect(shaky).toBeGreaterThan(fresh);
  });
  it('never scales with task count or speed (pure function of the card)', () => {
    const a = xpForReview('good', { difficulty: 5, retrievability: 0.5 });
    const b = xpForReview('good', { difficulty: 5, retrievability: 0.5 });
    expect(a).toBe(b);
  });
});

describe('earnedReward — performance-contingent, never random', () => {
  it('no bonus off a milestone', () => {
    expect(earnedReward({ combo: 4 })).toEqual({ multiplier: 1, golden: false });
    expect(earnedReward({ combo: 7 })).toEqual({ multiplier: 1, golden: false });
  });
  it('fires exactly at combo milestones', () => {
    expect(earnedReward({ combo: 5 }).multiplier).toBe(1.5);
    expect(earnedReward({ combo: 10 }).multiplier).toBe(2);
    expect(earnedReward({ combo: 15 })).toEqual({ multiplier: 2.5, golden: true });
    expect(earnedReward({ combo: 20 })).toEqual({ multiplier: 3, golden: true });
  });
  it('is deterministic', () => {
    expect(earnedReward({ combo: 10 })).toEqual(earnedReward({ combo: 10 }));
  });
  it('tone misses earn nothing; hits earn a base', () => {
    expect(xpForTone(false)).toBe(0);
    expect(xpForTone(true)).toBeGreaterThan(0);
  });
});

describe('goalProgress — honest daily XP target', () => {
  it('defaults to an attainable goal', () => {
    expect(DAILY_GOAL_XP).toBe(40);
  });

  it('reports partial progress below goal', () => {
    const g = goalProgress(session({ xpEarned: 10 }), 40);
    expect(g.into).toBe(10);
    expect(g.goal).toBe(40);
    expect(g.ratio).toBeCloseTo(0.25);
    expect(g.met).toBe(false);
  });

  it('is met exactly at the goal', () => {
    const g = goalProgress(session({ xpEarned: 40 }), 40);
    expect(g.ratio).toBe(1);
    expect(g.met).toBe(true);
  });

  it('clamps ratio at 1 when over 100% and stays met', () => {
    const g = goalProgress(session({ xpEarned: 100 }), 40);
    expect(g.ratio).toBe(1);
    expect(g.met).toBe(true);
    expect(g.into).toBe(100); // raw XP still reported honestly
  });
});

describe('rollingHitRate — forgiving consistency', () => {
  const days = (specs: [string, Partial<SessionLog>][]): SessionLog[] =>
    specs.map(([date, p]) => session({ date, ...p }));

  it('counts qualifying days within the window and caps window to history', () => {
    const s = days([
      ['2026-02-01', { reviewsDone: 25 }], // qualifies
      ['2026-02-02', { feedSeconds: 400 }], // qualifies
      ['2026-02-03', { reviewsDone: 3 }], // does not qualify
    ]);
    const hr = rollingHitRate(s, '2026-02-03', 42);
    expect(hr.active).toBe(2);
    expect(hr.window).toBe(3); // capped to days since first activity
    expect(hr.rate).toBeCloseTo(2 / 3);
  });

  it('ignores days outside the window', () => {
    const s = days([
      ['2026-01-01', { reviewsDone: 25 }],
      ['2026-03-01', { reviewsDone: 25 }],
    ]);
    const hr = rollingHitRate(s, '2026-03-01', 7);
    expect(hr.active).toBe(1); // only the in-window day
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
