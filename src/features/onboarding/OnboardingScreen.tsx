/**
 * Onboarding (M5 feature #5): a guaranteed early win, a quick tone primer, a
 * "you just read Chinese" reveal, then straight into the Tone Dojo. Completing it
 * bootstraps a known-word base so the feed is immediately comprehensible.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, Caption, Display, H1, PlayButton, Screen } from '../../components/ui';
import { Hanzi, Pinyin } from '../../components/chinese';
import { ScrambleText } from '../../components/ScrambleText';
import { playAsset, unlockAudio } from '../../lib/audio';
import { track } from '../../lib/analytics';
import * as juice from '../../lib/juice';
import { useReducedMotion } from '../../lib/motion';
import { BOOTSTRAP_HANZI, useApp } from '../../stores/appStore';
import { radius, spacing, TONE_NAMES } from '../../theme';
import { useTheme } from '../../lib/appearance';
import { selectFeed } from '../feed/selection';
import { playSentence, playWord } from '../shared/play';
import { ToneContour } from '../toneDojo/ToneContour';

const TONES = [
  { n: 1, mark: 'mā', desc: 'high & flat', gloss: 'mother' },
  { n: 2, mark: 'má', desc: 'rising, like a question', gloss: 'hemp' },
  { n: 3, mark: 'mǎ', desc: 'dips down then up', gloss: 'horse' },
  { n: 4, mark: 'mà', desc: 'sharp falling', gloss: 'scold' },
];

// The one high-frequency word taught in the guaranteed early win (C2). "茶"/tea is
// a single, tone-2 syllable with bundled audio — easy to hear and impossible to
// miss against unrelated distractors.
const FIRST_WORD = { hanzi: '茶', pinyin: 'cha2', gloss: 'tea' };
const FIRST_WORD_CHOICES = ['tea', 'mountain', 'seven']; // correct is unmissable

const STEPS = 5;

// Named steps — keeps the analytics 'onboarding_step' events honest and readable.
const STEP_NAMES = ['welcome', 'first_word', 'four_tones', 'first_sentence', 'tone_dojo'];

export function OnboardingScreen() {
  const router = useRouter();
  const store = useApp((s) => s.store)!;
  const completeOnboarding = useApp((s) => s.completeOnboarding);
  const { colors, toneColor } = useTheme();
  const [step, setStep] = useState(0);

  // Log every step as the learner reaches it (local, offline funnel — see analytics.ts).
  useEffect(() => {
    track('onboarding_step', { step, name: STEP_NAMES[step] ?? String(step) });
  }, [step]);

  const playMa = (tone: number): Promise<boolean> => {
    unlockAudio(); // this tap is the gesture web needs — propagate the global flag
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
        <FirstWord onDone={() => setStep(2)} />
      ) : step === 2 ? (
        <View style={{ flex: 1 }}>
          <H1>The four tones</H1>
          <Body dim style={{ marginTop: spacing(0.5) }}>
            Same syllable “ma”, four meanings. Tap each to hear it.
          </Body>
          <View style={styles.toneList}>
            {TONES.map((t) => (
              <View
                key={t.n}
                style={[styles.toneRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
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
          <Button label="I hear the difference" onPress={() => setStep(3)} />
        </View>
      ) : step === 3 ? (
        <FirstSentence onDone={() => setStep(4)} />
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

/**
 * C2 — a can't-fail first success BEFORE any discrimination task: teach ONE
 * high-frequency word (hanzi + pinyin + audio + gloss), then a single recognition
 * tap whose right answer is obvious. Landing a win here beats early-failure churn.
 */
function FirstWord({ onDone }: { onDone: () => void }) {
  const store = useApp((s) => s.store)!;
  const { colors } = useTheme();
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === FIRST_WORD.gloss;

  // Hear the word the moment it's taught (best-effort — web unlocks on the tap).
  const word = useMemo(() => store.words.find((w) => w.hanzi === FIRST_WORD.hanzi), [store]);
  useEffect(() => {
    if (word) void playWord(store, word.id);
  }, [word, store]);

  const choose = (choice: string) => {
    if (correct) return; // locked once won — this step can't fail, only succeed
    unlockAudio(); // first real gesture — unlock audio so the feed autoplays later
    setPicked(choice);
    // A mis-tap (the answer is unmissable, but fat-fingers happen) stays open for
    // a retry rather than trapping the learner; only the right answer celebrates.
    if (choice === FIRST_WORD.gloss) juice.correct();
    else juice.tap();
  };

  return (
    <View style={styles.centerFill}>
      <H1>Your first word</H1>
      <View style={styles.firstWordCard}>
        <Hanzi text={FIRST_WORD.hanzi} size={96} reveal />
        <Pinyin numbered={FIRST_WORD.pinyin} size={24} />
        <PlayButton
          size={30}
          play={() => {
            unlockAudio();
            return word ? playWord(store, word.id) : Promise.resolve(false);
          }}
          accessibilityLabel={`Play ${FIRST_WORD.hanzi}, ${FIRST_WORD.pinyin}`}
        />
      </View>
      <Body dim style={styles.firstWordPrompt}>
        Which one does it mean?
      </Body>
      <View style={styles.choices}>
        {FIRST_WORD_CHOICES.map((choice) => {
          const isRight = choice === FIRST_WORD.gloss;
          const isChosen = picked === choice;
          // Green once won; a wrong pick flashes red on that tile only and clears
          // on the next tap (choices stay enabled until the right answer lands).
          const tint = correct && isRight ? colors.good : isChosen && !isRight ? colors.bad : colors.border;
          return (
            <Pressable
              key={choice}
              onPress={() => choose(choice)}
              disabled={correct}
              accessibilityRole="button"
              style={[
                styles.choice,
                { backgroundColor: colors.surface, borderColor: tint },
                correct && isRight ? { borderWidth: 2 } : null,
              ]}
            >
              <Body
                style={{
                  fontWeight: '700',
                  color: tint === colors.border ? colors.text : tint,
                }}
              >
                {choice}
              </Body>
            </Pressable>
          );
        })}
      </View>
      {correct ? (
        <>
          <Caption style={{ color: colors.good, marginTop: spacing(1.5) }}>
            Nailed it — 茶 means “tea.”
          </Caption>
          <Button label="Keep going" onPress={onDone} style={styles.cta} />
        </>
      ) : null}
    </View>
  );
}

/**
 * B3 — the signature "whoa" moment AFTER the tone primer: pull ONE fully
 * comprehensible sentence (built from the SAME bootstrap known set the finish
 * marks known) and reveal it with the decode-scramble + audio, landing on "you
 * just read Chinese." Reduced motion routes through ScrambleText (final text
 * instantly, no churn).
 */
function FirstSentence({ onDone }: { onDone: () => void }) {
  const store = useApp((s) => s.store)!;
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  // Known set = the exact bootstrap words completeOnboarding() will mark known, so
  // the previewed sentence is guaranteed comprehensible once the learner lands.
  const sentence = useMemo(() => {
    const byHanzi = new Map(store.words.map((w) => [w.hanzi, w] as const));
    const known = new Set(
      BOOTSTRAP_HANZI.map((h) => byHanzi.get(h)?.id).filter((id): id is number => id != null),
    );
    const [picked] = selectFeed({
      sentences: store.sentences,
      knownWordIds: known,
      dueWordIds: new Set(),
      count: 1,
    });
    return picked ?? null;
  }, [store]);

  // Auto-play the sentence once, timed to land as the glyphs resolve.
  useEffect(() => {
    if (!sentence) return;
    if (reduced) {
      void playSentence(store, sentence);
      return;
    }
    const id = setTimeout(() => void playSentence(store, sentence), 350);
    return () => clearTimeout(id);
  }, [sentence, store, reduced]);

  return (
    <View style={styles.centerFill}>
      <H1>You just read Chinese</H1>
      {sentence ? (
        <View style={styles.sentenceCard}>
          <ScrambleText
            text={sentence.hanzi}
            kind="hanzi"
            style={{ color: colors.text, fontSize: 40, fontWeight: '700', textAlign: 'center' }}
          />
          <View style={{ marginTop: spacing(1), alignItems: 'center' }}>
            <Pinyin numbered={sentence.pinyin} size={20} reveal />
          </View>
          <Caption style={{ marginTop: spacing(1.5), textAlign: 'center' }}>
            {sentence.glossEn}
          </Caption>
          <PlayButton
            size={30}
            play={() => {
              unlockAudio();
              return playSentence(store, sentence);
            }}
            accessibilityLabel={`Play ${sentence.hanzi}`}
          />
        </View>
      ) : null}
      <Body dim style={styles.lede}>
        Every word here is one you already know. This is comprehensible input — and
        your whole feed will feel exactly like this.
      </Body>
      <Button label="Let's train" onPress={onDone} style={styles.cta} />
    </View>
  );
}

/** Step progress — visibility of where you are in onboarding. */
function Dots({ step }: { step: number }) {
  const { colors } = useTheme();
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
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing(1.5),
    gap: spacing(1.5),
  },
  toneText: { flex: 1 },
  firstWordCard: { alignItems: 'center', gap: spacing(1), marginTop: spacing(3) },
  firstWordPrompt: { marginTop: spacing(3) },
  choices: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.5), flexWrap: 'wrap', justifyContent: 'center' },
  choice: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
    minWidth: 96,
    alignItems: 'center',
  },
  sentenceCard: { alignItems: 'center', gap: spacing(0.5), marginTop: spacing(3), maxWidth: 360 },
});
