/**
 * Onboarding (M5 feature #5): a quick pinyin/tone primer, then straight into the
 * Tone Dojo. Completing it bootstraps a known-word base so the feed is
 * immediately comprehensible.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, H1, Screen } from '../../components/ui';
import { playAsset } from '../../lib/audio';
import * as juice from '../../lib/juice';
import { useApp } from '../../stores/appStore';
import { colors, radius, spacing, toneColor } from '../../theme';
import { ToneContour } from '../toneDojo/ToneContour';

const TONES = [
  { n: 1, mark: 'mā', desc: 'high & flat' },
  { n: 2, mark: 'má', desc: 'rising, like a question' },
  { n: 3, mark: 'mǎ', desc: 'dips down then up' },
  { n: 4, mark: 'mà', desc: 'sharp falling' },
];

export function OnboardingScreen() {
  const router = useRouter();
  const store = useApp((s) => s.store)!;
  const completeOnboarding = useApp((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);

  const playMa = (tone: number) => {
    const ref = store.audioRefsFor('syllable', `ma${tone}`)[0];
    if (ref) void playAsset(ref.assetKey);
    juice.tap();
  };

  const finish = () => {
    completeOnboarding();
    router.replace('/dojo');
  };

  if (step === 0) {
    return (
      <Screen center>
        <Body style={{ fontSize: 72 }}>学习</Body>
        <H1>Welcome to xuexi</H1>
        <Body dim style={{ textAlign: 'center', marginVertical: spacing(2) }}>
          Learn Mandarin the way your phone already hooks you — swipeable input,
          tone games, streaks and combos, all pointed at real fluency.
        </Body>
        <Button label="Let's go" onPress={() => setStep(1)} />
      </Screen>
    );
  }

  if (step === 1) {
    return (
      <Screen>
        <H1>The four tones</H1>
        <Body dim style={{ marginVertical: spacing(1) }}>
          Same syllable "ma", four meanings. Tap each to hear it.
        </Body>
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing(1.5) }}>
          {TONES.map((t) => (
            <Pressable key={t.n} onPress={() => playMa(t.n)} style={styles.toneRow}>
              <ToneContour tone={t.n} size={90} />
              <View style={{ marginLeft: spacing(2), flex: 1 }}>
                <Body style={{ fontSize: 28, fontWeight: '800', color: toneColor(t.n) }}>
                  {t.mark}
                </Body>
                <Body dim>{t.desc}</Body>
              </View>
              <Body style={{ fontSize: 28 }}>🔊</Body>
            </Pressable>
          ))}
        </View>
        <Button label="I hear the difference" onPress={() => setStep(2)} />
      </Screen>
    );
  }

  return (
    <Screen center>
      <H1>Train your ears 🥋</H1>
      <Body dim style={{ textAlign: 'center', marginVertical: spacing(2) }}>
        High-variability tone training — many speakers, fast rounds — is the
        fastest way to make tones stick. Let's play a 60-second round.
      </Body>
      <Button label="Enter the Tone Dojo" onPress={finish} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.5),
  },
});
