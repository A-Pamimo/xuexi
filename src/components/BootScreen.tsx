/**
 * Arcade cold-boot overlay ("READY START!") — the app opens like a game cabinet,
 * not a menu. Full-bleed, sits above the loading/onboarding tree so it OVERLAPS
 * init (adds zero awaits to the <10s cold-load budget), then fades out.
 *
 * Deliberately uses the legacy RN Animated API (not Reanimated): this is the
 * app's boot path and the first thing the smoke test hits, so we keep it off
 * first-ever Reanimated-on-web init. pointerEvents="none" is load-bearing —
 * Playwright/real taps hit through it, and it dismisses on `settled` (ready ||
 * initError) so it never masks an early crash.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing, type } from '../theme';
import { BOOT_MS, EXIT_MS, useReducedMotion } from '../lib/motion';

const NATIVE_DRIVER = Platform.OS !== 'web';
const now = () => (globalThis.performance?.now?.() ?? Date.now());

export function BootScreen({ settled, onFinish }: { settled: boolean; onFinish: () => void }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const start = useRef(now()).current;
  const done = useRef(false);

  useEffect(() => {
    if (!settled) return;
    // Honor a minimum visible time (up to BOOT_MS) even if init resolved instantly.
    const remaining = Math.max(0, BOOT_MS - (now() - start));
    const timer = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      if (reduced) {
        onFinish(); // final state = overlay gone, no animated frames
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: EXIT_MS, easing: Easing.in(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(scale, { toValue: 1.06, duration: EXIT_MS, easing: Easing.in(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
      ]).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, remaining);
    return () => clearTimeout(timer);
  }, [settled, reduced, opacity, scale, start, onFinish]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fill, { opacity, transform: [{ scale }] }]}
    >
      <View style={styles.stack}>
        {['学', '习'].map((c) => (
          <Text key={c} style={styles.glyph}>
            {c}
          </Text>
        ))}
      </View>
      <Text style={styles.ready}>READY</Text>
      <Text style={styles.startText}>START!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stack: { alignItems: 'center' },
  glyph: {
    fontSize: font.hanziXL,
    lineHeight: Math.round(font.hanziXL * 0.98),
    fontWeight: '900',
    color: colors.text,
  },
  ready: { ...type.display, color: colors.gold, letterSpacing: 2, marginTop: spacing(3) },
  startText: { ...type.h1, color: colors.accent, letterSpacing: 4, marginTop: spacing(1) },
});
