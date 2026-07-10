/**
 * Retention & funnel math over the local SessionLog history. PURE and offline —
 * no state, no I/O — so it can run over store.allSessions() or over test data
 * identically. Reuses the daysBetween / dayQualifies patterns from gamification
 * so "a day that counts" means the SAME thing everywhere (>= 20 reviews OR
 * >= 5 min feed — mere app-opens never count, per the streak-integrity ethic).
 */
import { dayQualifies, daysBetween } from './gamification';
import type { SessionLog } from './types';

/** A day is "active" for retention iff it contained real learning. */
function activeDays(sessions: SessionLog[]): string[] {
  return sessions.filter(dayQualifies).map((s) => s.date);
}

/** The first active (real-learning) day — the anchor D0 for DN retention. */
export function cohortStart(sessions: SessionLog[]): string | null {
  const active = activeDays(sessions).sort();
  return active[0] ?? null;
}

/**
 * Day-N retention: did the learner have a qualifying day exactly N days after
 * their first qualifying day? D1 = came back the next day, D7 = one week on.
 * Returns false when there's no cohort start or that horizon isn't reached yet.
 */
export function retainedOnDay(sessions: SessionLog[], n: number): boolean {
  const start = cohortStart(sessions);
  if (!start) return false;
  const active = new Set(activeDays(sessions));
  return [...active].some((d) => daysBetween(start, d) === n);
}

/** Convenience readouts for the classic D1 / D7 horizons. */
export function d1Retained(sessions: SessionLog[]): boolean {
  return retainedOnDay(sessions, 1);
}
export function d7Retained(sessions: SessionLog[]): boolean {
  return retainedOnDay(sessions, 7);
}

/**
 * Retention curve across a set of horizons (default D1/D3/D7/D14/D30). Each
 * entry is retained iff a qualifying day fell exactly that many days after D0.
 */
export function retentionCurve(
  sessions: SessionLog[],
  horizons: number[] = [1, 3, 7, 14, 30],
): { day: number; retained: boolean }[] {
  return horizons.map((day) => ({ day, retained: retainedOnDay(sessions, day) }));
}

/**
 * A simple activation funnel over the full history: how many days reached each
 * stage of engagement. Honest counts — a day counts once, at the deepest stage
 * it actually reached, and stages are cumulative (deeper implies shallower).
 *
 *   opened   — any logged session (an app-open with a SessionLog row)
 *   learned  — a qualifying day (real learning: reviews or feed threshold)
 *   toned    — that day also included tone-drill practice
 *   goalMet  — that day earned at least `goalXp` XP (the DAILY_GOAL_XP target)
 */
export interface Funnel {
  opened: number;
  learned: number;
  toned: number;
  goalMet: number;
}

export function funnel(sessions: SessionLog[], goalXp: number): Funnel {
  let opened = 0;
  let learned = 0;
  let toned = 0;
  let goalMet = 0;
  for (const s of sessions) {
    opened += 1;
    if (!dayQualifies(s)) continue;
    learned += 1;
    if (s.toneDrillSeconds > 0) toned += 1;
    if (s.xpEarned >= goalXp) goalMet += 1;
  }
  return { opened, learned, toned, goalMet };
}
