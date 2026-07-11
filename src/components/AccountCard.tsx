/**
 * Account card (Stats screen). Guests with cloud configured get a "sign in to
 * save & sync" prompt; signed-in users see their identity, live sync status, and
 * a sign-out. Renders nothing when cloud sync isn't configured, so a guest-only
 * build shows no dead account UI.
 */
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Body, Caption, Card } from './ui';
import { GoogleButton } from './GoogleButton';
import { useApp } from '../stores/appStore';
import { useTheme } from '../lib/appearance';
import { fonts, radius, spacing } from '../theme';
import * as juice from '../lib/juice';

export function AccountCard() {
  const cloudConfigured = useApp((s) => s.cloudConfigured);
  const user = useApp((s) => s.user);
  const syncing = useApp((s) => s.syncing);
  const signOutAccount = useApp((s) => s.signOutAccount);
  const { colors } = useTheme();

  if (!cloudConfigured) return null;

  if (!user) {
    return (
      <Card style={{ marginTop: spacing(2) }}>
        <Caption>account</Caption>
        <Body style={{ fontWeight: '700', marginTop: spacing(0.5) }}>Save your progress</Body>
        <Caption style={{ marginTop: 2 }}>Sign in to sync your streak, reviews and stats across devices.</Caption>
        <GoogleButton style={{ marginTop: spacing(2) }} />
      </Card>
    );
  }

  const initial = (user.name ?? user.email ?? '?').trim().charAt(0).toUpperCase();
  return (
    <Card style={{ marginTop: spacing(2) }}>
      <View style={styles.row}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primarySoft }]}>
            <Body style={{ color: colors.primary, fontWeight: '800' }}>{initial}</Body>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Body style={{ fontWeight: '700' }} >{user.name ?? 'Signed in'}</Body>
          {user.email ? <Caption>{user.email}</Caption> : null}
          <Caption style={{ color: syncing ? colors.textDim : colors.good, marginTop: 2 }}>
            {syncing ? 'Syncing…' : 'Synced ✓'}
          </Caption>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={() => { juice.tap(); void signOutAccount(); }}
        style={({ pressed }) => [
          styles.signOut,
          { borderColor: colors.borderStrong, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Body style={{ fontFamily: fonts.sansBold, color: colors.textDim }}>Sign out</Body>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  avatar: { width: 48, height: 48, borderRadius: radius.pill },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  signOut: {
    marginTop: spacing(2),
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1),
  },
});
