/**
 * Pure, loss-free merge of two progress blobs — the heart of cloud sync. When a
 * user signs in, their local (guest) progress and the cloud copy must combine
 * without either device regressing. Everything measurable is combined by taking
 * the MORE-ADVANCED value (more reps, higher stability, larger counters, the
 * union of one-shot flags), so a sign-in can only ever add progress. Device-
 * scoped preferences (theme, pinyin, reminders) are taken from the local device
 * you're actively on. Analytics are device-local and never travel.
 *
 * No Firebase here — this is pure data so it's unit-tested in isolation.
 */
import type { ProgressBlob } from './db/store';
import type { Card, SessionLog, ToneDrillResult, UserStats } from './types';

/** The more-progressed of two cards for the same word. */
function pickCard(a: Card, b: Card): Card {
  if (a.reps !== b.reps) return a.reps > b.reps ? a : b;
  if (a.stability !== b.stability) return a.stability > b.stability ? a : b;
  return a.due >= b.due ? a : b;
}

function mergeCards(a: Record<number, Card>, b: Record<number, Card>): Record<number, Card> {
  const out: Record<number, Card> = { ...a };
  for (const [k, card] of Object.entries(b)) {
    const id = Number(k);
    out[id] = out[id] ? pickCard(out[id]!, card) : card;
  }
  return out;
}

function mergeSessions(
  a: Record<string, SessionLog>,
  b: Record<string, SessionLog>,
): Record<string, SessionLog> {
  const out: Record<string, SessionLog> = { ...a };
  for (const [date, s] of Object.entries(b)) {
    const cur = out[date];
    out[date] = cur
      ? {
          date,
          reviewsDone: Math.max(cur.reviewsDone, s.reviewsDone),
          feedSeconds: Math.max(cur.feedSeconds, s.feedSeconds),
          toneDrillSeconds: Math.max(cur.toneDrillSeconds, s.toneDrillSeconds),
          xpEarned: Math.max(cur.xpEarned, s.xpEarned),
          comboMax: Math.max(cur.comboMax, s.comboMax),
        }
      : s;
  }
  return out;
}

function mergeToneResults(a: ToneDrillResult[], b: ToneDrillResult[]): ToneDrillResult[] {
  const seen = new Set<string>();
  const out: ToneDrillResult[] = [];
  for (const r of [...a, ...b]) {
    const key = `${r.timestamp}|${r.syllable}|${r.speakerId}|${r.chosenTone}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  out.sort((x, y) => (x.timestamp < y.timestamp ? -1 : 1));
  return out;
}

function mergeCounts(a: Record<number, number>, b: Record<number, number>): Record<number, number> {
  const out: Record<number, number> = { ...a };
  for (const [k, n] of Object.entries(b)) {
    const id = Number(k);
    out[id] = Math.max(out[id] ?? 0, n);
  }
  return out;
}

function laterDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function mergeStats(a: UserStats, b: UserStats): UserStats {
  return {
    streak: Math.max(a.streak, b.streak),
    lastStreakDate: laterDate(a.lastStreakDate, b.lastStreakDate),
    streakFreezes: Math.max(a.streakFreezes, b.streakFreezes),
    totalInputMinutes: Math.max(a.totalInputMinutes, b.totalInputMinutes),
    knownWordCount: Math.max(a.knownWordCount, b.knownWordCount),
    xp: Math.max(a.xp, b.xp),
    level: Math.max(a.level, b.level),
    unlocks: Array.from(new Set([...a.unlocks, ...b.unlocks])),
  };
}

function mergeFlags(a: Record<string, boolean>, b: Record<string, boolean>): Record<string, boolean> {
  const out: Record<string, boolean> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Boolean(out[k]) || v;
  return out;
}

/** Combine `local` (the active device — wins for prefs) and `remote` (the cloud copy). */
export function mergeProgress(local: ProgressBlob, remote: ProgressBlob): ProgressBlob {
  return {
    onboarded: local.onboarded || remote.onboarded,
    cards: mergeCards(local.cards, remote.cards),
    toneResults: mergeToneResults(local.toneResults, remote.toneResults),
    sessions: mergeSessions(local.sessions, remote.sessions),
    stats: mergeStats(local.stats, remote.stats),
    glossCounts: mergeCounts(local.glossCounts, remote.glossCounts),
    // Device-scoped prefs: the device you're actively on wins.
    themeMode: local.themeMode,
    showPinyin: local.showPinyin,
    dailyGoal: local.dailyGoal,
    reminderPrefs: local.reminderPrefs,
    goalCelebrated: mergeFlags(local.goalCelebrated, remote.goalCelebrated),
    // Analytics are device-local — never synced.
    analytics: local.analytics,
  };
}

/** The fields we sync to the cloud (analytics deliberately excluded — device-local). */
export function toCloudBlob(blob: ProgressBlob): Omit<ProgressBlob, 'analytics'> {
  const { analytics: _analytics, ...rest } = blob;
  return rest;
}
