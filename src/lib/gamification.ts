/**
 * Gamification math: XP/levels, variable reward, and streak integrity rules.
 * Pure and unit-tested; the store (src/stores/appStore) applies these.
 *
 * Ethics (spec <ethics>): a streak only counts when the day contained REAL
 * learning (>= 20 reviews OR >= 5 min of feed), never mere app-opens.
 */
import type { SessionLog, UserStats } from './types';

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

/**
 * Variable reward: ~8% of scored correct answers trigger a 1.5x–5x multiplier;
 * a rare subset are "golden" (cosmetic unlocks). Unpredictability is the point.
 * `rng` is injectable for deterministic tests.
 */
export function rollReward(rng: () => number = Math.random): RewardRoll {
  if (rng() >= 0.08) return { multiplier: 1, golden: false };
  const tiers = [1.5, 2, 3, 5];
  const multiplier = tiers[Math.min(tiers.length - 1, Math.floor(rng() * tiers.length))]!;
  const golden = multiplier === 5 && rng() < 0.25;
  return { multiplier, golden };
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
