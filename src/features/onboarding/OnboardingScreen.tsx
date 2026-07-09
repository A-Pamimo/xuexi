/**
 * Onboarding (M5 feature #5): a quick pinyin/tone primer, then straight into the
 * Tone Dojo. Completing it bootstraps a known-word base so the feed is
 * immediately comprehensible.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, Caption, Display, H1, PlayButton, Screen } from '../../components/ui';
import { Hanzi } from '../../components/chinese';
import { playAsset } from '../../lib/audio';
import * as juice from '../../lib/juice';
import { useApp } from '../../stores/appStore';
import { colors, radius, spacing, toneColor, TONE_NAMES } from '../../theme';
import { ToneContour } from '../toneDojo/ToneContour';

const TONES = [
  { n: 1, mark: 'mā', desc: 'high & flat', gloss: 'mother' },
  { n: 2, mark: 'má', desc: 'rising, like a question', gloss: 'hemp' },
  { n: 3, mark: 'mǎ', desc: 'dips down then up', gloss: 'horse' },
  { n: 4, mark: 'mà', desc: 'sharp falling', gloss: 'scold' },
];
const STEPS = 3;

export function OnboardingScreen() {
  const router = useRouter();
  const store = useApp((s) => s.store)!;
  const completeOnboarding = useApp((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);

  const playMa = (tone: number): Promise<boolean> => {
    juice.tap();
    const ref = store.audioRefsFor('syllable', `ma${tone}`)[0];
    return ref ? playAsset(ref.assetKey) : Promise.resolve(false);
  };

  const finish = () => {
    completeOnboarding();
    router.replace('/dojo');
  };

  return (
    <Screen>
      <Dots step={step} />
      {step === 0 ? (
        <View style={styles.centerFill}>
          <Hanzi text="学习" size={80} />
          <H1>Welcome to xuexi</H1>
          <Body dim style={styles.lede}>
            Learn Mandarin the way your phone already hooks you — swipeable input,
            tone games, streaks and combos, all pointed at real fluency.
          </Body>
          <Button label="Let's go" onPress={() => setStep(1)} style={styles.cta} />
        </View>
      ) : step === 1 ? (
        <View style={{ flex: 1 }}>
          <H1>The four tones</H1>
          <Body dim style={{ marginTop: spacing(0.5) }}>
            Same syllable “ma”, four meanings. Tap each to hear it.
          </Body>
          <View style={styles.toneList}>
            {TONES.map((t) => (
              <View key={t.n} style={styles.toneRow}>
                <ToneContour tone={t.n} size={72} />
                <View style={styles.toneText}>
                  <Body style={{ fontSize: 26, fontWeight: '800', color: toneColor(t.n) }}>
                    {t.mark}
                  </Body>
                  <Caption>{t.desc} · “{t.gloss}”</Caption>
                </View>
                <PlayButton
                  size={26}
                  play={() => playMa(t.n)}
                  accessibilityLabel={`Play tone ${t.n}, ${t.mark}, ${TONE_NAMES[t.n - 1]}`}
                />
              </View>
            ))}
          </View>
          <Button label="I hear the difference" onPress={() => setStep(2)} />
        </View>
      ) : (
        <View style={styles.centerFill}>
          <Display>🥋</Display>
          <H1>Train your ears</H1>
          <Body dim style={styles.lede}>
            High-variability tone training — many speakers, fast rounds — is the
            fastest way to make tones stick. Let's play a 60-second round.
          </Body>
          <Button label="Enter the Tone Dojo" onPress={finish} style={styles.cta} />
        </View>
      )}
    </Screen>
  );
}

/** Step progress — visibility of where you are in onboarding. */
function Dots({ step }: { step: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Step ${step + 1} of ${STEPS}`}>
      {Array.from({ length: STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i <= step ? colors.primary : colors.surfaceAlt, width: i === step ? 22 : 8 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: spacing(0.75), justifyContent: 'center', marginBottom: spacing(2) },
  dot: { height: 8, borderRadius: radius.pill },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lede: { textAlign: 'center', marginTop: spacing(2), maxWidth: 340 },
  cta: { marginTop: spacing(4), alignSelf: 'stretch' },
  toneList: { flex: 1, justifyContent: 'center', gap: spacing(1.25) },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.5),
    gap: spacing(1.5),
  },
  toneText: { flex: 1 },
});
