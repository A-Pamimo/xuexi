/**
 * Landing page — the first thing a brand-new visitor sees (before onboarding).
 * A calm, literary hero that states what xuexi is, then two ways in: start as a
 * guest, or sign in with Google to save & sync progress across devices. Signed-in
 * returning users (with cloud data) skip straight past this via the effect below.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Layers, Mic2, Sparkles, type LucideIcon } from 'lucide-react-native';
import { Body, Button, Caption, H2, Screen } from '../src/components/ui';
import { Wordmark } from '../src/components/chinese';
import { StampIcon } from '../src/components/StampIcon';
import { GoogleButton } from '../src/components/GoogleButton';
import { useApp } from '../src/stores/appStore';
import { useTheme } from '../src/lib/appearance';
import { fonts, radius, spacing } from '../src/theme';

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Layers, title: 'A calm feed', body: 'Swipeable sentences you can already almost read — comprehensible input, no doomscroll.' },
  { icon: Mic2, title: 'Train your ear', body: 'Fast tone-dojo rounds with many voices — the proven way to make tones stick.' },
  { icon: Sparkles, title: 'Honest progress', body: 'Real spaced repetition, streaks and input-hours — dopamine pointed at actual fluency.' },
];

export default function Landing() {
  const router = useRouter();
  const onboarded = useApp((s) => s.onboarded);
  const user = useApp((s) => s.user);
  const syncing = useApp((s) => s.syncing);
  const { colors } = useTheme();

  // Route away once we know where the visitor belongs: onboarded users (incl. a
  // returning signed-in account whose cloud data restored) go to the app; a fresh
  // sign-in with no prior progress drops into onboarding once sync settles.
  // Focus-scoped: landing stays mounted under the onboarding modal, and a plain
  // effect here would fire when completeOnboarding() flips `onboarded`, clobbering
  // onboarding's own replace('/dojo') and dumping the learner on the feed instead.
  useFocusEffect(
    useCallback(() => {
      if (onboarded) {
        router.replace('/');
      } else if (user && !syncing) {
        router.replace('/onboarding');
      }
    }, [onboarded, user, syncing, router]),
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <Wordmark text="学习" size={88} color={colors.primary} />
          <Caption style={{ letterSpacing: 4, marginTop: spacing(1) }}>XUÉ XÍ</Caption>
          <Body style={styles.tagline}>
            A calm, literary way to actually learn Mandarin — built from the habits that already
            hook you, pointed at real fluency.
          </Body>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={[styles.feature, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
              <StampIcon icon={f.icon} size={20} />
              <View style={{ flex: 1 }}>
                <H2 style={{ fontSize: 17 }}>{f.title}</H2>
                <Caption style={{ marginTop: 2 }}>{f.body}</Caption>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.cta}>
          <Button label="Get started" variant="seal" onPress={() => router.push('/onboarding')} style={{ alignSelf: 'stretch' }} />
          <GoogleButton style={{ alignSelf: 'stretch', marginTop: spacing(1.5) }} />
          <Caption style={{ textAlign: 'center', marginTop: spacing(2) }}>
            No account needed — sign in only to save & sync across devices.
          </Caption>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing(4), gap: spacing(4) },
  hero: { alignItems: 'center' },
  tagline: { textAlign: 'center', marginTop: spacing(3), maxWidth: 360, fontFamily: fonts.serif, fontSize: 18, lineHeight: 27 },
  features: { gap: spacing(1.5) },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(2),
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(2),
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {},
});
