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
import { elevation, font, fonts, HIT, radius, spacing, type } from '../theme';
import type { ThemeColors } from '../theme';
import { useReducedMotion } from '../lib/motion';
import { useTheme, type Scheme } from '../lib/appearance';
import { AmbientBackground } from './AmbientBackground';
import { AMBIENT_BACKGROUND } from '../lib/flags';

// Color-dependent styles are built per palette and cached by scheme (only two
// ever exist), so switching themes never rebuilds a StyleSheet and layout props
// stay in one place. Non-color props live here too; nothing color is hardcoded.
const styleCache = new Map<Scheme, ReturnType<typeof buildStyles>>();
function useStyles(): ReturnType<typeof buildStyles> {
  const { scheme, colors } = useTheme();
  let s = styleCache.get(scheme);
  if (!s) {
    s = buildStyles(colors);
    styleCache.set(scheme, s);
  }
  return s;
}

export function Screen({
  children,
  style,
  center,
  ambient = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  center?: boolean;
  /** Render the ambient shader backdrop behind content (tab screens opt in;
   *  onboarding/boot deliberately don't, to keep GL off the cold-load path). */
  ambient?: boolean;
}) {
  const { colors } = useTheme();
  // Opt-in ambient: an opaque themed base + the shader behind content. Without it
  // the Screen is a plain themed surface. Content sits on cards (opaque) so text
  // legibility is unaffected either way.
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: ambient ? undefined : colors.bg }]}
      edges={['top']}
    >
      {ambient && AMBIENT_BACKGROUND ? <AmbientBackground /> : null}
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
const mk = (base: TextStyle, defaultDim = false) =>
  function T({ children, style, dim }: TextProps) {
    const { colors } = useTheme();
    const color = dim || defaultDim ? colors.textDim : colors.text;
    return <Text style={[base, { color }, style]}>{children}</Text>;
  };
export const Display = mk({ ...type.display });
export const H1 = mk({ ...type.h1 });
export const H2 = mk({ ...type.h2 });
export const Body = mk({ ...type.body });
export const Label = mk({ ...type.label });
export const Caption = mk({ ...type.caption }, true);

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
  const { colors, readableOn } = useTheme();
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
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.borderStrong },
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
  const s = useStyles();
  return <View style={[s.card, raised && elevation.card, style]}>{children}</View>;
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
  const s = useStyles();
  return <View style={[s.pill, tone === 'active' && s.pillActive, style]}>{children}</View>;
}

export function ProgressBar({
  value,
  color,
  height = 10,
  track,
}: {
  value: number; // 0..1
  color?: string;
  height?: number;
  track?: string;
}) {
  const { colors } = useTheme();
  const fill = color ?? colors.primary;
  const trackColor = track ?? colors.surfaceAlt;
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(pct), min: 0, max: 100 }}
      style={[styles.track, { height, backgroundColor: trackColor }]}
    >
      <View style={{ height, width: `${pct}%`, backgroundColor: fill, borderRadius: radius.pill }} />
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
  const { colors } = useTheme();
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
  const { colors } = useTheme();
  return (
    <Screen center>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Body dim style={{ marginTop: spacing(2) }}>{label}</Body> : null}
    </Screen>
  );
}

// Layout-only, palette-independent styles.
const styles = StyleSheet.create({
  screen: { flex: 1 },
  btn: {
    minHeight: HIT,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: { fontSize: font.body, fontWeight: '800', fontFamily: fonts.sansBold },
  track: { borderRadius: radius.pill, overflow: 'hidden', width: '100%' },
  play: { alignItems: 'center', justifyContent: 'center' },
  playCircle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});

// Palette-dependent styles, cached per scheme.
function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing(2),
    },
    pill: {
      backgroundColor: c.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing(2),
      paddingVertical: spacing(1),
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      minHeight: 36,
      justifyContent: 'center',
    },
    pillActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
  });
}
