/**
 * Adaptive tone-training helpers (research P0-2 / U5, guardrail #10).
 *
 * High phonetic variability (many speakers) builds durable tone categories for
 * intermediates but *harms* low-aptitude beginners (Sadakata & McQueen 2014;
 * Uchihara et al. 2025). So the Tone Dojo starts on a single canonical voice and
 * widens the speaker pool only as the learner's accuracy proves they're ready —
 * high variability becomes an earned progression, not a beginner default.
 *
 * Pure + unit-tested; the screen applies these against store.toneResults().
 */
import type { ToneDrillResult, ToneNumber } from './types';

/** Canonical → widening speaker order (matches the seeded zh-a/zh-b/zh-c voices). */
export const SPEAKER_ORDER = ['zh-a', 'zh-b', 'zh-c'] as const;

/** Accuracy over the most recent `window` trials (0..1); 0 when no history. */
export function recentToneAccuracy(results: ToneDrillResult[], window = 20): number {
  const recent = results.slice(-window);
  if (recent.length === 0) return 0;
  const hits = recent.filter((r) => r.chosenTone === r.correctTone).length;
  return hits / recent.length;
}

/**
 * How many (and which) speakers to expose this session. Beginners (or anyone
 * whose recent accuracy has dropped) train on fewer voices; mastery widens the
 * pool. Needs a small sample before widening so a lucky streak doesn't over-promote.
 */
export function speakerTierFor(
  results: ToneDrillResult[],
  window = 20,
): { tier: 1 | 2 | 3; allowed: string[]; accuracy: number } {
  const recent = results.slice(-window);
  const accuracy = recentToneAccuracy(results, window);
  // Not enough evidence yet → stay on the single canonical voice.
  let tier: 1 | 2 | 3 = 1;
  if (recent.length >= 12) {
    if (accuracy >= 0.85) tier = 3;
    else if (accuracy >= 0.7) tier = 2;
  }
  return { tier, allowed: SPEAKER_ORDER.slice(0, tier), accuracy };
}

/**
 * Per-tone accuracy with a trend delta vs the prior window — the competence
 * signal surfaced to the learner (research U2: informational feedback beats bare
 * points). `pct` is null for tones with no attempts in the recent window.
 */
export function accuracyByTone(
  results: ToneDrillResult[],
  window = 60,
): { tone: ToneNumber; pct: number | null; delta: number | null; n: number }[] {
  const recent = results.slice(-window);
  const prior = results.slice(-2 * window, -window);
  const rate = (rs: ToneDrillResult[], tone: ToneNumber): number | null => {
    const forTone = rs.filter((r) => r.correctTone === tone);
    if (forTone.length === 0) return null;
    return forTone.filter((r) => r.chosenTone === r.correctTone).length / forTone.length;
  };
  return ([1, 2, 3, 4] as ToneNumber[]).map((tone) => {
    const pct = rate(recent, tone);
    const was = rate(prior, tone);
    return {
      tone,
      pct,
      delta: pct !== null && was !== null ? pct - was : null,
      n: recent.filter((r) => r.correctTone === tone).length,
    };
  });
}
