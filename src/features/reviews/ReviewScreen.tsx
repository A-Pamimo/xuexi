/**
 * Learn & review session (M2). NEW words are TAUGHT first — a study card with
 * pinyin, meaning, audio and character breakdown (you can't retrieve what you
 * never encoded; research U3) — then they enter FSRS. DUE words are recall tests
 * (hanzi->meaning or audio->meaning). New words arrive in spoken-frequency order
 * (basics first) and are capped per session so the intro stays gradual.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Flame, RotateCcw, Sparkles, Star } from 'lucide-react-native';
import { Body, Button, Caption, Card, H1, Label, PlaqueButton, PlayButton, ProgressBar, Screen } from '../../components/ui';
import { DiamondSeal } from '../../components/DiamondSeal';
import { Hanzi, Pinyin } from '../../components/chinese';
import { DailyGoalRing } from '../../components/DailyGoalRing';
import { Ticker } from '../../components/Ticker';
import { stopAudio } from '../../lib/audio';
import type { Store } from '../../lib/db/store';
import * as juice from '../../lib/juice';
import type { Rating, Sentence, Word } from '../../lib/types';
import { useApp, type QueueItem } from '../../stores/appStore';
import { font, radius, spacing } from '../../theme';
import { useTheme } from '../../lib/appearance';
import { knownRatio } from '../feed/selection';
import { playSentence, playWord } from '../shared/play';
import { BuildExercise } from './BuildExercise';

// Rating → tone color, echoing the paper-ink prototype: Again→tone4 (falling/red),
// Hard→tone3 (dip/orange), Good→tone2 (rising/green), Easy→tone1 (flat/blue).
const RATINGS: { rating: Rating; label: string; tone: number }[] = [
  { rating: 'again', label: 'Again', tone: 4 },
  { rating: 'hard', label: 'Hard', tone: 3 },
  { rating: 'good', label: 'Good', tone: 2 },
  { rating: 'easy', label: 'Easy', tone: 1 },
];

// A card is "mature" enough to earn a production exercise once it's a settled
// Review card (ts-fsrs State.Review = 2) with a decent stability — recognition
// is solid, so we occasionally push for production (research U3). We only build
// from a COMPREHENSIBLE sentence (>=85% of its words known, mirroring the feed
// floor) so the exercise stays i+1, not a wall of unknowns.
const BUILD_MIN_STABILITY = 7; // days
const BUILD_KNOWN_FLOOR = 0.85;

/**
 * Occasionally (~1 in 4 eligible) swap the plain recall flip for a "build the
 * sentence" production drill, when the word is mature and a comprehensible
 * sentence containing it exists. Deterministic in the word id so the choice is
 * stable across re-renders (no flicker) — same idiom as the recall `mode` above.
 */
function buildSentenceFor(
  item: QueueItem,
  store: Store,
  known: Set<number>,
): Sentence | null {
  if (item.isNew) return null;
  if (item.card.state !== 2 || item.card.stability < BUILD_MIN_STABILITY) return null;
  if (item.word.id % 4 !== 0) return null; // keep it occasional
  const candidates = store.sentences.filter(
    (s) =>
      s.wordIds.includes(item.word.id) &&
      s.wordIds.length >= 2 &&
      knownRatio(s, known) >= BUILD_KNOWN_FLOOR,
  );
  if (candidates.length === 0) return null;
  // Stable pick: index the candidate pool by the word id.
  return candidates[item.word.id % candidates.length] ?? null;
}

/**
 * A worked example for a NEW word (research U3 — you encode a word better when you
 * meet it in a real sentence, not as a bare gloss). Picks the shortest sentence
 * containing the word whose OTHER words are mostly known, so the example itself is
 * comprehensible i+1. Returns null when no linked sentence exists (many abstract
 * particles have none yet — the card then falls back to the plain gloss).
 */
function exampleFor(word: Word, store: Store, known: Set<number>): Sentence | null {
  const candidates = store.sentences.filter((s) => s.wordIds.includes(word.id));
  if (candidates.length === 0) return null;
  // Most comprehensible first (highest known-ratio), then shortest — a short,
  // mostly-known sentence is the easiest place to see the new word do its job.
  return (
    candidates
      .slice()
      .sort(
        (a, b) =>
          knownRatio(b, known) - knownRatio(a, known) ||
          a.hanzi.length - b.hanzi.length,
      )[0] ?? null
  );
}

export function ReviewScreen() {
  const router = useRouter();
  const store = useApp((s) => s.store)!;
  const reviewWord = useApp((s) => s.reviewWord);
  const reviewQueue = useApp((s) => s.reviewQueue);
  const knownWordIds = useApp((s) => s.knownWordIds);
  const goalToday = useApp((s) => s.goalToday);
  const { colors } = useTheme();

  const queue = useMemo(() => reviewQueue(20), [reviewQueue]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gainedXp, setGainedXp] = useState(0);
  const [learned, setLearned] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [flash, setFlash] = useState<{ text: string; golden: boolean } | null>(null);

  // One tracked timer for the reward flash: rating faster than the 700ms decay
  // must not leave stale timers behind to clear the NEXT card's flash.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleFlashClear = () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 700);
  };
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const item = queue[idx];
  const isNew = !!item?.isNew;

  // Occasional production drill for mature cards: reconstruct a comprehensible
  // sentence containing this word instead of a plain recall flip (C1). Null when
  // ineligible or not this card's turn. Recomputed per card (the queue and known
  // set are stable within a session).
  const buildSentence = useMemo<Sentence | null>(
    () => (item ? buildSentenceFor(item, store, knownWordIds()) : null),
    [item, store, knownWordIds],
  );

  // Worked example for the word being TAUGHT (new card only): a comprehensible
  // sentence that shows the word in context (research U3). Null when none exists.
  const example = useMemo<Sentence | null>(
    () => (item?.isNew ? exampleFor(item.word, store, knownWordIds()) : null),
    [item, store, knownWordIds],
  );

  // Recall prompt mode (reviews only): audio->meaning or hanzi->meaning.
  const mode = useMemo<'hanzi' | 'audio'>(() => {
    if (!item || item.isNew) return 'hanzi';
    const hasAudio = store.audioRefsFor('word', String(item.word.id)).length > 0;
    return hasAudio && item.word.id % 2 === 0 ? 'audio' : 'hanzi';
  }, [item, store]);

  // Auto-play: a new word (hear it while learning) or an audio-mode recall prompt.
  useEffect(() => {
    if (!item) return;
    if (isNew || (mode === 'audio' && !revealed)) void playWord(store, item.word.id);
  }, [item, isNew, mode, revealed, store]);

  // Reset transient per-card state as we advance.
  useEffect(() => {
    setRevealed(false);
    setShowBreakdown(false);
  }, [idx]);

  // Silence audio when leaving the screen. Focus effect, not unmount: tab
  // screens stay mounted, so only the blur callback fires on a tab switch.
  useFocusEffect(useCallback(() => () => void stopAudio(), []));

  if (!item) {
    const known = knownWordIds().size;
    return (
      <Screen center ambient>
        <DiamondSeal icon={Check} size={84} />
        <H1 style={{ marginTop: spacing(1) }}>Session complete</H1>
        <Body dim style={{ marginTop: spacing(1), textAlign: 'center' }}>
          The ink is dry — every mark stays.
        </Body>
        <Body dim style={{ marginTop: spacing(0.5), textAlign: 'center' }}>
          Learned {learned} new · reviewed {reviewed} · +{gainedXp} XP
        </Body>
        <Caption style={{ marginTop: spacing(1), textAlign: 'center' }}>
          {known} words known · new words arrive most-common first
        </Caption>
        <Button
          label="Done"
          onPress={() => router.replace('/')}
          style={{ marginTop: spacing(3), alignSelf: 'stretch' }}
        />
      </Screen>
    );
  }

  const learnDone = () => {
    // First encounter: encode + schedule into FSRS (counts as a "good" exposure).
    const { gained } = reviewWord(item.word.id, 'good', 0);
    setGainedXp((x) => x + gained);
    setLearned((n) => n + 1);
    juice.correct();
    setIdx((i) => i + 1);
  };

  const rate = (rating: Rating) => {
    const success = rating !== 'again';
    const nextCombo = success ? combo + 1 : 0;
    const { reward, gained } = reviewWord(item.word.id, rating, nextCombo);
    if (success) {
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      if (nextCombo > 1) juice.comboTick(nextCombo);
      else juice.correct();
      if (reward.multiplier > 1) {
        juice.reward();
        setFlash({ text: `combo ×${nextCombo} · ${reward.multiplier}× XP`, golden: reward.golden });
      }
    } else {
      setCombo(0);
      juice.wrong();
    }
    setReviewed((n) => n + 1);
    setGainedXp((x) => x + gained);
    scheduleFlashClear();
    setIdx((i) => i + 1);
  };

  // Production drill result → the same XP/combo/session pipeline as a graded
  // recall: a correct build is a 'good', a miss is an 'again' (breaks the combo,
  // earns no bonus). BuildExercise handles its own correct/wrong juice, so we
  // don't double up here — we only run the combo reward flash on a bonus roll.
  const buildDone = (correct: boolean) => {
    const nextCombo = correct ? combo + 1 : 0;
    const { reward, gained } = reviewWord(item.word.id, correct ? 'good' : 'again', nextCombo);
    if (correct) {
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      if (reward.multiplier > 1) {
        juice.reward();
        setFlash({ text: `combo ×${nextCombo} · ${reward.multiplier}× XP`, golden: reward.golden });
      }
    } else {
      setCombo(0);
    }
    setReviewed((n) => n + 1);
    setGainedXp((x) => x + gained);
    scheduleFlashClear();
    setIdx((i) => i + 1);
  };

  // Mature-card production drill takes over the whole card (its own Screen).
  // Keyed by sentence so consecutive build drills never share picked/result state.
  if (buildSentence) {
    return <BuildExercise key={buildSentence.id} sentence={buildSentence} onDone={buildDone} />;
  }

  const goal = goalToday();

  return (
    <Screen ambient>
      <View style={styles.header}>
        <View style={styles.headerStatus}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(0.5) }}>
            {isNew ? (
              <Sparkles size={12} color={colors.accent} strokeWidth={2.25} />
            ) : (
              <RotateCcw size={12} color={colors.textDim} strokeWidth={2.25} />
            )}
            <Caption>
              {isNew ? 'Learn' : 'Review'} · {idx + 1}/{queue.length}
            </Caption>
          </View>
          <View style={{ marginTop: spacing(1) }}>
            {isNew ? <Caption>learning</Caption> : <ComboMeter combo={combo} />}
          </View>
        </View>
        <DailyGoalRing
          ratio={goal.ratio}
          into={goal.into}
          goal={goal.goal}
          met={goal.met}
          size={64}
        />
      </View>
      <View style={{ marginTop: spacing(1) }}>
        <ProgressBar
          value={queue.length ? idx / queue.length : 0}
          height={6}
          color={isNew ? colors.accent : colors.primary}
        />
      </View>
      {!isNew && combo >= 5 ? (
        <View style={{ marginTop: spacing(1) }}>
          <Ticker text={`COMBO ×${combo} · KEEP IT ALIVE    `} color={colors.gold} size={14} speed={70} />
        </View>
      ) : null}

      {isNew ? (
        <Card style={styles.prompt}>
          <Label style={{ color: colors.accent, letterSpacing: 1 }}>NEW WORD</Label>
          <View style={{ marginTop: spacing(1) }}>
            <Hanzi text={item.word.hanzi} size={item.word.hanzi.length > 2 ? font.hanziM : font.hanziXL} />
          </View>
          <View style={{ marginTop: spacing(1) }}>
            <Pinyin numbered={item.word.pinyinNumbered} size={24} />
          </View>
          <Body style={{ marginTop: spacing(1.5), textAlign: 'center', fontSize: 18 }}>
            {item.word.glossEn}
          </Body>
          <PlayButton
            size={30}
            style={{ marginTop: spacing(2) }}
            play={() => playWord(store, item.word.id)}
            accessibilityLabel="Play pronunciation"
          />
          <Pressable
            onPress={() => setShowBreakdown((s) => !s)}
            accessibilityRole="button"
            style={{ marginTop: spacing(2) }}
          >
            <Caption>{showBreakdown ? 'hide breakdown ▲' : 'character breakdown ▾'}</Caption>
          </Pressable>
          {showBreakdown ? <Breakdown word={item.word} /> : null}
          {example ? <ExampleSentence sentence={example} /> : null}
        </Card>
      ) : (
        <Card style={styles.prompt}>
          {mode === 'audio' && !revealed ? (
            <PlayButton
              size={48}
              hint="tap to replay"
              play={() => playWord(store, item.word.id)}
              accessibilityLabel="Play the word, then guess its meaning"
            />
          ) : (
            <Hanzi text={item.word.hanzi} size={item.word.hanzi.length > 2 ? font.hanziM : font.hanziXL} />
          )}
          {revealed ? (
            <View style={styles.answer}>
              <Pinyin numbered={item.word.pinyinNumbered} size={22} reveal />
              <Body style={{ marginTop: spacing(1.5), textAlign: 'center' }}>{item.word.glossEn}</Body>
              <PlayButton
                size={24}
                style={{ marginTop: spacing(2) }}
                play={() => playWord(store, item.word.id)}
                accessibilityLabel="Play word audio"
              />
            </View>
          ) : null}
        </Card>
      )}

      {flash ? (
        <View style={[styles.flash, { flexDirection: 'row', gap: spacing(1) }]}>
          {flash.golden ? (
            <Star size={20} color={colors.gold} strokeWidth={2.25} />
          ) : (
            <Flame size={20} color={colors.gold} strokeWidth={2.25} />
          )}
          <Body style={{ color: colors.gold, fontWeight: '800', fontSize: font.title }}>{flash.text}</Body>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      {isNew ? (
        <Button label="Got it — next →" variant="good" onPress={learnDone} />
      ) : revealed ? (
        <View style={styles.ratings}>
          {RATINGS.map((r) => (
            <RatingButton key={r.rating} label={r.label} tone={r.tone} onPress={() => rate(r.rating)} />
          ))}
        </View>
      ) : (
        <Button label="Show answer" variant="seal" onPress={() => setRevealed(true)} />
      )}
    </Screen>
  );
}

/**
 * "In context" — one comprehensible sentence using the new word, with pinyin,
 * translation and audio. Seeing the word do a job in a real sentence is a far
 * stronger encoding than a bare gloss (research U3), and it's the fix for abstract
 * function words (的/了/在…) that mean nothing in isolation.
 */
function ExampleSentence({ sentence }: { sentence: Sentence }) {
  const store = useApp((s) => s.store)!;
  const { colors } = useTheme();
  return (
    <View style={[styles.example, { borderTopColor: colors.border }]}>
      <Label style={{ color: colors.textDim, letterSpacing: 1 }}>IN CONTEXT</Label>
      <View style={styles.exampleRow}>
        <View style={{ flex: 1 }}>
          <Hanzi text={sentence.hanzi} size={22} />
          <View style={{ marginTop: spacing(0.5) }}>
            <Pinyin numbered={sentence.pinyin} size={14} />
          </View>
          <Body dim style={{ marginTop: spacing(0.5), fontSize: 13 }}>
            {sentence.glossEn}
          </Body>
        </View>
        <PlayButton
          size={22}
          play={() => playSentence(store, sentence)}
          accessibilityLabel={`Play example: ${sentence.hanzi}`}
        />
      </View>
    </View>
  );
}

/** Tap-to-reveal per-character breakdown — radical + mnemonic hint (research P1-5). */
function Breakdown({ word }: { word: Word }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.breakdown, { borderTopColor: colors.border }]}>
      {word.componentBreakdown.map((c, i) => (
        <View key={i} style={styles.breakRow}>
          <Hanzi text={c.char} size={30} />
          <View style={{ flex: 1, marginLeft: spacing(1.5) }}>
            {c.radical ? <Caption>radical {c.radical}</Caption> : null}
            {c.hint ? <Body dim style={{ fontSize: 13 }}>{c.hint}</Body> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/** A recall-grade plaque: engraved box with tone-colored brackets + label. */
function RatingButton({ label, tone, onPress }: { label: string; tone: number; onPress: () => void }) {
  const { toneColor } = useTheme();
  return <PlaqueButton label={label} color={toneColor(tone)} onPress={onPress} style={styles.rating} />;
}

function ComboMeter({ combo }: { combo: number }) {
  const { colors, readableOn } = useTheme();
  if (combo < 2) return <Caption>no combo yet</Caption>;
  const milestone = combo >= 10;
  const bg = milestone ? colors.accent : colors.primaryDim;
  return (
    <View
      style={[styles.combo, { backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: spacing(0.5) }]}
      accessibilityLabel={`Combo ${combo}${milestone ? ', on fire' : ''}`}
    >
      <Flame size={13} color={readableOn(bg)} strokeWidth={2.5} />
      <Body style={{ fontWeight: '800', color: readableOn(bg), fontSize: 14 }}>{combo}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerStatus: { flex: 1, alignItems: 'flex-start' },
  prompt: { alignItems: 'center', paddingVertical: spacing(3.5), marginTop: spacing(2) },
  answer: { alignItems: 'center', marginTop: spacing(3) },
  ratings: { flexDirection: 'row', marginBottom: spacing(1), gap: spacing(1.25) },
  rating: { flex: 1 },
  combo: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radius.pill,
  },
  flash: { alignItems: 'center', marginTop: spacing(2) },
  breakdown: {
    marginTop: spacing(2),
    alignSelf: 'stretch',
    gap: spacing(1),
    borderTopWidth: 1,
    paddingTop: spacing(2),
  },
  breakRow: { flexDirection: 'row', alignItems: 'center' },
  example: {
    marginTop: spacing(2),
    alignSelf: 'stretch',
    borderTopWidth: 1,
    paddingTop: spacing(1.5),
    gap: spacing(0.75),
  },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
});
