import {
  cohortStart,
  d1Retained,
  d7Retained,
  funnel,
  retainedOnDay,
  retentionCurve,
} from './retention';
import { STREAK_MIN_REVIEWS } from './gamification';
import type { SessionLog } from './types';

// A qualifying ("real learning") day by the streak-integrity threshold.
const learn = (date: string, p: Partial<SessionLog> = {}): SessionLog => ({
  date,
  reviewsDone: STREAK_MIN_REVIEWS,
  feedSeconds: 0,
  toneDrillSeconds: 0,
  xpEarned: 40,
  comboMax: 0,
  ...p,
});
// A logged-but-idle day (app opened, no real learning) — must never count.
const idle = (date: string, p: Partial<SessionLog> = {}): SessionLog => ({
  date,
  reviewsDone: 1,
  feedSeconds: 10,
  toneDrillSeconds: 0,
  xpEarned: 2,
  comboMax: 0,
  ...p,
});

describe('cohort start', () => {
  it('anchors on the first QUALIFYING day, not the first app-open', () => {
    const sessions = [idle('2026-01-01'), learn('2026-01-02'), learn('2026-01-03')];
    expect(cohortStart(sessions)).toBe('2026-01-02');
  });
  it('is null with no real learning at all', () => {
    expect(cohortStart([idle('2026-01-01'), idle('2026-01-02')])).toBeNull();
  });
});

describe('D1 retention', () => {
  it('retained when the learner returns the next day', () => {
    expect(d1Retained([learn('2026-01-01'), learn('2026-01-02')])).toBe(true);
  });
  it('NOT retained when the next day was only an idle app-open', () => {
    expect(d1Retained([learn('2026-01-01'), idle('2026-01-02')])).toBe(false);
  });
  it('NOT retained when they skip straight to a later day', () => {
    expect(d1Retained([learn('2026-01-01'), learn('2026-01-05')])).toBe(false);
  });
  it('NOT retained from a single day of history', () => {
    expect(d1Retained([learn('2026-01-01')])).toBe(false);
  });
});

describe('D7 retention', () => {
  it('retained when a qualifying day lands exactly 7 days after D0', () => {
    const sessions = [learn('2026-01-01'), learn('2026-01-08')];
    expect(d7Retained(sessions)).toBe(true);
    expect(retainedOnDay(sessions, 7)).toBe(true);
  });
  it('NOT retained at day 6 or day 8 (must be exactly N)', () => {
    expect(d7Retained([learn('2026-01-01'), learn('2026-01-07')])).toBe(false);
    expect(d7Retained([learn('2026-01-01'), learn('2026-01-09')])).toBe(false);
  });
});

describe('retention curve', () => {
  it('reports retained horizons relative to the cohort start', () => {
    const sessions = [learn('2026-01-01'), learn('2026-01-02'), learn('2026-01-08')];
    const curve = retentionCurve(sessions, [1, 3, 7]);
    expect(curve).toEqual([
      { day: 1, retained: true },
      { day: 3, retained: false },
      { day: 7, retained: true },
    ]);
  });
});

describe('funnel', () => {
  it('counts each stage cumulatively, deepest stage per day', () => {
    const sessions = [
      idle('2026-01-01'), // opened only
      learn('2026-01-02', { xpEarned: 10 }), // learned, below goal
      learn('2026-01-03', { toneDrillSeconds: 60, xpEarned: 50 }), // learned + toned + goal
    ];
    expect(funnel(sessions, 40)).toEqual({
      opened: 3,
      learned: 2,
      toned: 1,
      goalMet: 1,
    });
  });
});
