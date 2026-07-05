/** Shared UI primitives. All render sensibly on web (react-native-web). */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '../theme';

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

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function Body({
  children,
  dim,
  style,
}: {
  children: React.ReactNode;
  dim?: boolean;
  style?: object;
}) {
  return <Text style={[styles.body, dim && { color: colors.textDim }, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'good' | 'bad';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'good'
        ? colors.good
        : variant === 'bad'
          ? colors.bad
          : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        variant === 'ghost' && styles.btnGhost,
        style,
      ]}
    >
      <Text style={[styles.btnLabel, variant === 'ghost' && { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
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
  h1: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  body: { color: colors.text, fontSize: font.body },
  btn: {
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnLabel: { color: '#fff', fontSize: font.body, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
  },
});
