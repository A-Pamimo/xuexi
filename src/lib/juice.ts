/**
 * "Juice" — the single, tunable source of haptic + sound feedback for every
 * scored interaction (coding convention). Keeping it central means feedback is
 * consistent across Tone Dojo, reviews and the feed, and easy to retune.
 *
 * Native-only APIs (haptics) are gated behind Platform checks and degrade to
 * no-ops on web; sound uses bundled SFX via audio.ts so it works everywhere.
 */
import { Platform } from 'react-native';
import { isAudioUnlocked, playAsset } from './audio';

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
  navPitch: 1.8, // reuse sfx_combo pitched up as a soft UI tick
  navVolume: 0.25,
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

/**
 * Navigation tick — a soft, higher-pitched UI click for true navigation only
 * (tab switches). Reuses sfx_combo.wav (no new asset). Does NOT unlock audio
 * itself; callers unlock on the gesture first so the web tick actually sounds.
 * Kept off scored controls (rating buttons) to avoid double-firing over combos.
 */
export function nav(): void {
  const h = getHaptics();
  void h?.selectionAsync();
  if (isAudioUnlocked()) void playAsset('sfx_combo.wav', { rate: JUICE.navPitch, volume: JUICE.navVolume });
}
