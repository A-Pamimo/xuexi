/** Shared UI primitives. All render sensibly on web (react-native-web). */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

// react-native-web's Animated ignores the native driver (and can warn); keep it
// off on web, on everywhere else.
const NATIVE_DRIVER = Platform.OS !== 'web';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, elevation, font, HIT, radius, readableOn, spacing, type } from '../theme';
import { useReducedMotion } from '../lib/motion';

export function Screen({
  children,
  style,
  center,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  center?: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View
        style={[
          { flex: 1, padding: spacing(2) },
          center && { justifyContent: 'center', alignItems: 'center' },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

// ---- Typography ------------------------------------------------------------
type TextProps = { children: React.ReactNode; style?: StyleProp<TextStyle>; dim?: boolean };
const mk = (base: TextStyle) =>
  function T({ children, style, dim }: TextProps) {
    return <Text style={[base, dim && { color: colors.textDim }, style]}>{children}</Text>;
  };
export const Display = mk({ ...type.display, color: colors.text });
export const H1 = mk({ ...type.h1, color: colors.text });
export const H2 = mk({ ...type.h2, color: colors.text });
export const Body = mk({ ...type.body, color: colors.text });
export const Label = mk({ ...type.label, color: colors.text });
export const Caption = mk({ ...type.caption, color: colors.textDim });

// ---- Button ----------------------------------------------------------------
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'good' | 'bad';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const fill =
    variant === 'primary'
      ? colors.primary
      : variant === 'good'
        ? colors.good
        : variant === 'bad'
          ? colors.bad
          : 'transparent';
  // Auto-pick AA-legible ink for the fill; ghost uses body text on the border.
  const ink = variant === 'ghost' ? colors.text : readableOn(fill);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: fill },
        variant === 'ghost' && styles.btnGhost,
        { opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      <Text style={[styles.btnLabel, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

// ---- Card / Pill / ProgressBar --------------------------------------------
export function Card({
  children,
  style,
  raised = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  raised?: boolean;
}) {
  return <View style={[styles.card, raised && elevation.card, style]}>{children}</View>;
}

export function Pill({
  children,
  style,
  tone = 'default',
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  tone?: 'default' | 'active';
}) {
  return (
    <View style={[styles.pill, tone === 'active' && styles.pillActive, style]}>{children}</View>
  );
}

export function ProgressBar({
  value,
  color = colors.primary,
  height = 10,
  track = colors.surfaceAlt,
}: {
  value: number; // 0..1
  color?: string;
  height?: number;
  track?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(pct), min: 0, max: 100 }}
      style={[styles.track, { height, backgroundColor: track }]}
    >
      <View style={{ height, width: `${pct}%`, backgroundColor: color, borderRadius: radius.pill }} />
    </View>
  );
}

// ---- PlayButton: audio with real system-status feedback --------------------
/**
 * A consistent audio affordance that fixes silent best-effort playback: it
 * pulses while a clip plays and flips to a clear "no audio" state when a clip
 * is missing or blocked (e.g. web autoplay) — instead of doing nothing. `play`
 * resolves `true` when a sound actually started.
 */
export function PlayButton({
  play,
  size = 40,
  hint,
  accessibilityLabel,
  style,
}: {
  play: () => Promise<boolean> | boolean | void;
  size?: number;
  hint?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const [state, setState] = useState<'idle' | 'playing' | 'unavailable'>('idle');
  const scale = useRef(new Animated.Value(1)).current;
  const failTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();

  const pulse = () => {
    if (reduced) return; // resting scale is already 1 (final state) — no motion
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.18, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: NATIVE_DRIVER }),
    ]).start();
  };
  // Clear the pending "no audio" reset if the button unmounts mid-timeout.
  useEffect(() => () => {
    if (failTimer.current) clearTimeout(failTimer.current);
  }, []);

  const onPress = async () => {
    if (failTimer.current) clearTimeout(failTimer.current);
    pulse();
    setState('playing');
    const ok = await Promise.resolve(play());
    if (ok === false) {
      setState('unavailable');
      failTimer.current = setTimeout(() => setState('idle'), 1400);
    } else {
      setState('idle');
    }
  };

  const unavailable = state === 'unavailable';
  const label =
    accessibilityLabel ?? (unavailable ? 'Audio unavailable' : 'Play audio');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: state === 'playing' }}
      onPress={onPress}
      hitSlop={12}
      style={[styles.play, style]}
    >
      <Animated.View
        style={[
          styles.playCircle,
          {
            width: size + 24,
            height: size + 24,
            borderRadius: (size + 24) / 2,
            borderColor: unavailable ? colors.bad : colors.primary,
            backgroundColor: unavailable ? 'transparent' : colors.primarySoft,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={{ fontSize: size }}>{unavailable ? '🔇' : '🔊'}</Text>
      </Animated.View>
      {(hint || unavailable) && (
        <Caption style={{ marginTop: spacing(0.5), color: unavailable ? colors.bad : colors.textDim }}>
          {unavailable ? 'no audio' : hint}
        </Caption>
      )}
    </Pressable>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <Screen center>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Body dim style={{ marginTop: spacing(2) }}>{label}</Body> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  btn: {
    minHeight: HIT,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { borderWidth: 1, borderColor: colors.borderStrong },
  btnLabel: { fontSize: font.body, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
  },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  track: { borderRadius: radius.pill, overflow: 'hidden', width: '100%' },
  play: { alignItems: 'center', justifyContent: 'center' },
  playCircle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
