/**
 * "Juice" — the single, tunable source of haptic + sound feedback for every
 * scored interaction (coding convention). Keeping it central means feedback is
 * consistent across Tone Dojo, reviews and the feed, and easy to retune.
 *
 * Native-only APIs (haptics) are gated behind Platform checks and degrade to
 * no-ops on web; sound uses bundled SFX via audio.ts so it works everywhere.
 */
import { Platform } from 'react-native';
import { playAsset } from './audio';

// Lazy-required so web bundles don't pull native haptics in.
type Haptics = typeof import('expo-haptics');
let haptics: Haptics | null = null;
function getHaptics(): Haptics | null {
  if (Platform.OS === 'web') return null;
  if (!haptics) haptics = require('expo-haptics') as Haptics;
  return haptics;
}

/** Tunable feedback constants — one place to make the app feel better. */
export const JUICE = {
  comboBasePitch: 1.0,
  comboPitchStep: 0.04, // each combo step raises the tick pitch
  comboPitchMax: 2.2,
};

export function correct(): void {
  void playAsset('sfx_correct.wav');
  const h = getHaptics();
  void h?.notificationAsync(h.NotificationFeedbackType.Success);
}

export function wrong(): void {
  void playAsset('sfx_wrong.wav');
  const h = getHaptics();
  void h?.notificationAsync(h.NotificationFeedbackType.Error);
}

/** Combo tick with escalating pitch — the rhythm-game dopamine hook. */
export function comboTick(comboCount: number): void {
  const rate = Math.min(
    JUICE.comboPitchMax,
    JUICE.comboBasePitch + comboCount * JUICE.comboPitchStep,
  );
  void playAsset('sfx_combo.wav', { rate, volume: 0.9 });
  const h = getHaptics();
  void h?.impactAsync(h.ImpactFeedbackStyle.Light);
}

/** Big celebratory reward (variable-reward multiplier / combo milestone). */
export function reward(): void {
  void playAsset('sfx_reward.wav');
  const h = getHaptics();
  void h?.notificationAsync(h.NotificationFeedbackType.Success);
}

export function tap(): void {
  const h = getHaptics();
  void h?.impactAsync(h.ImpactFeedbackStyle.Light);
}
