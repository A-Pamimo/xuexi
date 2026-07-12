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
const IS_WEB = Platform.OS === 'web';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Volume2, VolumeX } from 'lucide-react-native';
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
  variant?: 'primary' | 'ghost' | 'good' | 'bad' | 'seal';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const { colors, readableOn } = useTheme();

  // Seal: the imperial CTA — a cinnabar "stamp" with the classic DOUBLE rule of
  // a carved seal (thick outer border, paper gap, thin inner line) + tracked
  // uppercase serif label. Pressing fills it like fresh seal paste, flipping the
  // inner line and label to paper ink.
  if (variant === 'seal') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.seal,
          {
            borderColor: colors.primary,
            backgroundColor: pressed ? colors.primary : 'transparent',
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
      >
        {({ pressed }) => (
          <View
            style={[styles.sealInner, { borderColor: pressed ? colors.onPrimary : colors.primary }]}
          >
            <Text style={[styles.sealLabel, { color: pressed ? colors.onPrimary : colors.primary }]}>
              {label.toUpperCase()}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

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

// ---- Plaque: engraved-plaque button chrome ----------------------------------
/**
 * The accent corners of an engraved plaque — two small right-angle brackets
 * (top-left, bottom-right) laid over a bordered box. Drop inside any relatively
 * positioned container to give it the plaque treatment.
 */
export function PlaqueCorners({ color, size = 12, thickness = 2 }: {
  color: string;
  size?: number;
  thickness?: number;
}) {
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -thickness,
          left: -thickness,
          width: size,
          height: size,
          borderTopWidth: thickness,
          borderLeftWidth: thickness,
          borderColor: color,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -thickness,
          right: -thickness,
          width: size,
          height: size,
          borderBottomWidth: thickness,
          borderRightWidth: thickness,
          borderColor: color,
        }}
      />
    </>
  );
}

/**
 * An engraved-plaque button: strong top/bottom rules, hairline sides, sharp
 * corners, and accent brackets in `color` (the grade / tone color). Transparent
 * until pressed, when it takes a faint wash of its accent. The imperial
 * counterpart of a "choice" button (grades, tone answers).
 */
export function PlaqueButton({
  label,
  color,
  onPress,
  disabled,
  style,
  accessibilityLabel,
}: {
  label: string;
  /** Accent color for brackets + label; defaults to the cinnabar primary. */
  color?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const c = color ?? colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.plaque,
        {
          borderColor: colors.borderStrong,
          backgroundColor: pressed ? `${c}1A` : 'transparent',
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <PlaqueCorners color={c} />
      <Text style={[styles.plaqueLabel, { color: c }]}>{label}</Text>
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
 *
 * Rendered as a hand-pressed seal stamp (carved corners, slight tilt, cinnabar
 * speaker glyph) so audio shares the app's one visual language — no emoji.
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
  const ink = unavailable ? colors.bad : colors.primary;
  const Glyph = unavailable ? VolumeX : Volume2;
  const box = size + 24;
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
          styles.playStamp,
          {
            width: box,
            height: box,
            borderColor: ink,
            backgroundColor: unavailable ? 'transparent' : colors.primarySoft,
            transform: [{ scale }, { rotate: '-2deg' }],
            // Web-only ink-bleed distortion, same as StampIcon (ignored on native).
            ...(IS_WEB ? ({ filter: 'url(#ink-bleed)' } as unknown as ViewStyle) : null),
          },
        ]}
      >
        <Glyph size={size} color={ink} strokeWidth={2.25} />
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
  seal: {
    minHeight: HIT,
    padding: 3, // the paper gap between the double rules
    borderRadius: radius.sm,
    borderWidth: 2.5,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  sealInner: {
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(3),
  },
  sealLabel: {
    fontSize: font.body,
    fontFamily: fonts.serif,
    letterSpacing: 3,
    textAlign: 'center',
  },
  plaque: {
    minHeight: HIT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
  },
  plaqueLabel: {
    fontSize: 15,
    fontFamily: fonts.serif,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  track: { borderRadius: radius.pill, overflow: 'hidden', width: '100%' },
  play: { alignItems: 'center', justifyContent: 'center' },
  playStamp: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    // Slightly uneven corners → hand-carved seal, matching StampIcon.
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.lg,
    borderBottomLeftRadius: radius.md,
  },
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
