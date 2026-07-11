/**
 * "Continue with Google" — the single sign-in affordance, reused on the landing
 * page and the Stats account card. Drives the appStore.signIn() flow (Firebase
 * popup on web), showing a spinner while the popup is open and a gentle error if
 * it fails. A user closing the popup is not an error. Renders nothing when cloud
 * sign-in isn't configured, so guests never see a dead button.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LogIn } from 'lucide-react-native';
import { Caption } from './ui';
import { useApp } from '../stores/appStore';
import { useTheme } from '../lib/appearance';
import { fonts, HIT, radius, spacing } from '../theme';
import * as juice from '../lib/juice';

export function GoogleButton({ onDone, style }: { onDone?: () => void; style?: object }) {
  const cloudConfigured = useApp((s) => s.cloudConfigured);
  const signIn = useApp((s) => s.signIn);
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!cloudConfigured) return null;

  const press = async () => {
    juice.tap();
    setBusy(true);
    setErr(null);
    try {
      await signIn();
      onDone?.();
    } catch (e) {
      const code = String((e as { code?: string })?.code ?? e ?? '');
      // A user dismissing the popup isn't a failure — stay quiet.
      if (!/popup-closed|cancelled|canceled|closed-by-user/i.test(code)) {
        setErr('Sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ busy }}
        disabled={busy}
        onPress={press}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.borderStrong,
            opacity: busy ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <LogIn size={20} color={colors.text} strokeWidth={2} />
            <Text style={[styles.label, { color: colors.text }]}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      {err ? (
        <Caption style={{ color: colors.bad, marginTop: spacing(1), textAlign: 'center' }}>{err}</Caption>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: HIT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
  },
  label: { fontSize: 16, fontFamily: fonts.sansBold },
});
