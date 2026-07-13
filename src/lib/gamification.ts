/**
 * Gamification math: XP/levels, variable reward, and streak integrity rules.
 * Pure and unit-tested; the store (src/stores/appStore) applies these.
 *
 * Ethics (spec <ethics>): a streak only counts when the day contained REAL
 * learning (>= 20 reviews OR >= 5 min of feed), never mere app-opens.
 */
import type { Rating, SessionLog, UserStats } from './types';

export const STREAK_MIN_REVIEWS = 20;
export const STREAK_MIN_FEED_SECONDS = 5 * 60;

/** Level curve: each level needs progressively more XP (level 1 starts at 0). */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}
export function xpForLevel(level: number): number {
  return 50 * (level - 1) ** 2;
}
export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, span: next - base };
}

export interface RewardRoll {
  multiplier: number; // 1 = no bonus
  golden: boolean;
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * XP for a graded review, weighted by cognitive demand (research U1 / guardrail
 * #3: reward difficulty & retrieval, never task count or speed). A hard card, or
 * one recalled when it was nearly forgotten (low retrievability), is worth more
 * than grinding an easy well-known card. A lapse ("again") earns a flat token.
 *
 *   difficulty: ts-fsrs difficulty 1..10 (higher = harder)
 *   retrievability: probability of recall at review time, 0..1 (lower = shakier)
 */
export function xpForReview(
  rating: Rating,
  card: { difficulty: number; retrievability: number },
): number {
  if (rating === 'again') return 2;
  const diffW = 0.6 + clamp01(card.difficulty / 10); // 0.7 (easy) .. 1.6 (hard)
  const retrW = 1 + (1 - clamp01(card.retrievability)) * 0.6; // 1.0 (fresh) .. 1.6 (nearly forgotten)
  return Math.max(1, Math.round(10 * diffW * retrW));
}

/** XP for a tone-drill trial. Misses earn nothing (only genuine success pays). */
export function xpForTone(correct: boolean): number {
  return correct ? 5 : 0;
}

/** Default daily XP goal — an honest, attainable target, not a moving goalpost. */
export const DAILY_GOAL_XP = 40;

/**
 * Progress toward a day's XP goal. `into` is the XP genuinely earned that day;
 * `ratio` is clamped to 0..1 so a big day can't over-fill the ring, and `met`
 * flips true once the honest target is reached.
 */
export function goalProgress(
  session: SessionLog,
  goal: number,
): { into: number; goal: number; ratio: number; met: boolean } {
  const into = session.xpEarned;
  return { into, goal, ratio: clamp01(into / goal), met: into >= goal };
}

/**
 * Earned (never random) reward multiplier — research P0-3 / guardrail #4: all
 * bonuses are performance-contingent, no chance-based slot-machine. Fires as a
 * burst exactly at combo milestones; "golden" is a high-combo achievement.
 */
export function earnedReward(ctx: { combo: number }): RewardRoll {
  switch (ctx.combo) {
    case 5:
      return { multiplier: 1.5, golden: false };
    case 10:
      return { multiplier: 2, golden: false };
    case 15:
      return { multiplier: 2.5, golden: true };
    case 20:
      return { multiplier: 3, golden: true };
    default:
      return ctx.combo > 20 && ctx.combo % 10 === 0
        ? { multiplier: 3, golden: true }
        : { multiplier: 1, golden: false };
  }
}

/** Does today's activity satisfy the streak integrity threshold? */
export function dayQualifies(session: SessionLog): boolean {
  return (
    session.reviewsDone >= STREAK_MIN_REVIEWS ||
    session.feedSeconds >= STREAK_MIN_FEED_SECONDS
  );
}

/** Days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z');
  return Math.round(ms / 86_400_000);
}

/**
 * Recompute streak when today qualifies. Consecutive day -> +1; a one-day gap
 * consumes a streak-freeze if available (streak preserved); larger gap resets.
 */
export function advanceStreak(stats: UserStats, today: string): UserStats {
  if (stats.lastStreakDate === today) return stats; // already counted today
  const next = { ...stats };
  if (!stats.lastStreakDate) {
    next.streak = 1;
  } else {
    const gap = daysBetween(stats.lastStreakDate, today);
    if (gap === 1) next.streak = stats.streak + 1;
    else if (gap === 2 && stats.streakFreezes > 0) {
      next.streak = stats.streak + 1;
      next.streakFreezes = stats.streakFreezes - 1;
    } else next.streak = 1;
  }
  next.lastStreakDate = today;
  // Earn a streak-freeze every 5 days (earned, never bought — spec).
  if (next.streak > 0 && next.streak % 5 === 0) {
    next.streakFreezes = Math.min(3, next.streakFreezes + 1);
  }
  return next;
}

/**
 * Rebuild the streak tuple from scratch out of a session history, replaying
 * `advanceStreak` over every qualifying day in date order. Used by the cloud
 * merge: streak/lastStreakDate/streakFreezes must travel as an atomic tuple
 * (taking field-wise maxima can pair a stale device's high streak with a fresh
 * date, resurrecting a broken streak), and the merged sessions are the one
 * loss-free record both devices agree on — days studied on either device count.
 */
export function rebuildStreak(
  sessions: SessionLog[],
): Pick<UserStats, 'streak' | 'lastStreakDate' | 'streakFreezes'> {
  let acc: UserStats = {
    streak: 0,
    lastStreakDate: null,
    streakFreezes: 0,
    totalInputMinutes: 0,
    knownWordCount: 0,
    xp: 0,
    level: 1,
    unlocks: [],
  };
  const days = sessions
    .filter(dayQualifies)
    .map((s) => s.date)
    .sort();
  for (const day of days) acc = advanceStreak(acc, day);
  return {
    streak: acc.streak,
    lastStreakDate: acc.lastStreakDate,
    streakFreezes: acc.streakFreezes,
  };
}

/**
 * Forgiving rolling hit-rate (research P0-4 / U6): a "41 of 42 days" measure that
 * sits alongside the all-or-nothing streak so a single missed day is not framed
 * as total loss. `window` is capped at days since first activity so new users
 * aren't punished by an empty denominator.
 */
export function rollingHitRate(
  sessions: SessionLog[],
  today: string,
  windowDays = 42,
): { active: number; window: number; rate: number } {
  const inWindow = sessions.filter((s) => {
    const gap = daysBetween(s.date, today);
    return gap >= 0 && gap < windowDays;
  });
  const active = inWindow.filter(dayQualifies).length;
  const dates = sessions.map((s) => s.date).filter((d) => d <= today).sort();
  const first = dates[0];
  const window = first ? Math.min(windowDays, daysBetween(first, today) + 1) : 0;
  return { active, window, rate: window > 0 ? active / window : 0 };
}
