/**
 * Infinite marquee ticker (Alex Pierce's repeating-label mechanic) — a seamless
 * scrolling ribbon for streak/combo chrome. Two copies of the track translate
 * left by one copy's width, looped forever.
 *
 * Reanimated (UI-thread, composite-only translateX) — the app's first Reanimated
 * component, kept off the boot path on purpose. Reduced-motion routes through
 * src/lib/motion.ts (the LIVE hook), not Reanimated's start-frozen one: when on,
 * it renders a single static copy and cancels any running animation.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { spacing } from '../theme';
import type { ToneNumber } from '../lib/types';
import { TICKER_PXPS, useReducedMotion } from '../lib/motion';
import { useTheme } from '../lib/appearance';

export function Ticker({
  text,
  speed = TICKER_PXPS,
  tone,
  color,
  size = 14,
  gap = spacing(4),
  style,
}: {
  text: string;
  speed?: number;
  tone?: ToneNumber;
  color?: string;
  size?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const { colors, toneColor } = useTheme();
  const [trackW, setTrackW] = useState(0);
  const x = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  useEffect(() => {
    if (reduced || trackW <= 0) {
      cancelAnimation(x);
      x.value = 0;
      return;
    }
    x.value = 0;
    const distance = trackW + gap;
    const duration = (distance / speed) * 1000;
    x.value = withRepeat(withTiming(-distance, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [reduced, trackW, gap, speed, text, x]);

  if (!text) return null;
  const ink = color ?? (tone != null ? toneColor(tone) : colors.textDim);

  const Copy = ({ onLayout }: { onLayout?: (w: number) => void }) => (
    <Text
      numberOfLines={1}
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.width) : undefined}
      style={{ color: ink, fontSize: size, fontWeight: '800' }}
    >
      {text}
    </Text>
  );

  // Reduced motion: one static copy, no measurement, no animated track.
  if (reduced) {
    return (
      <View style={[styles.wrap, style]}>
        <Copy />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View style={[styles.row, animStyle]}>
        {/* Only the first copy is measured; loop distance = its width + gap. */}
        <Copy onLayout={setTrackW} />
        <View style={{ width: gap }} />
        <Copy />
        <View style={{ width: gap }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
