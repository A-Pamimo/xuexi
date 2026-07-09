/**
 * Learn & review session (M2). NEW words are TAUGHT first — a study card with
 * pinyin, meaning, audio and character breakdown (you can't retrieve what you
 * never encoded; research U3) — then they enter FSRS. DUE words are recall tests
 * (hanzi->meaning or audio->meaning). New words arrive in spoken-frequency order
 * (basics first) and are capped per session so the intro stays gradual.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, Caption, Card, H1, Label, PlayButton, ProgressBar, Screen } from '../../components/ui';
import { Hanzi, Pinyin } from '../../components/chinese';
import { Ticker } from '../../components/Ticker';
import { stopAudio } from '../../lib/audio';
import * as juice from '../../lib/juice';
import type { Rating, Word } from '../../lib/types';
import { useApp } from '../../stores/appStore';
import { colors, font, radius, readableOn, spacing } from '../../theme';
import { playWord } from '../shared/play';

const RATINGS: { rating: Rating; label: string; variant: 'bad' | 'ghost' | 'good' }[] = [
  { rating: 'again', label: 'Again', variant: 'bad' },
  { rating: 'hard', label: 'Hard', variant: 'ghost' },
  { rating: 'good', label: 'Good', variant: 'good' },
  { rating: 'easy', label: 'Easy', variant: 'good' },
];

export function ReviewScreen() {
  const router = useRouter();
  const store = useApp((s) => s.store)!;
  const reviewWord = useApp((s) => s.reviewWord);
  const reviewQueue = useApp((s) => s.reviewQueue);
  const knownWordIds = useApp((s) => s.knownWordIds);

  const queue = useMemo(() => reviewQueue(20), [reviewQueue]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gainedXp, setGainedXp] = useState(0);
  const [learned, setLearned] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  const item = queue[idx];
  const isNew = !!item?.isNew;

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

  // Silence audio when leaving the screen.
  useEffect(() => () => void stopAudio(), []);

  if (!item) {
    const known = knownWordIds().size;
    return (
      <Screen center>
        <Body style={{ fontSize: 48 }}>🎉</Body>
        <H1>Session complete</H1>
        <Body dim style={{ marginTop: spacing(1), textAlign: 'center' }}>
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
        setFlash(`${reward.golden ? '🌟' : '🔥'} combo ${nextCombo} · ${reward.multiplier}× XP!`);
      }
    } else {
      setCombo(0);
      juice.wrong();
    }
    setReviewed((n) => n + 1);
    setGainedXp((x) => x + gained);
    setTimeout(() => setFlash(null), 700);
    setIdx((i) => i + 1);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Caption>
          {isNew ? '✨ Learn' : '🔁 Review'} · {idx + 1}/{queue.length}
        </Caption>
        {isNew ? <Caption>learning</Caption> : <ComboMeter combo={combo} />}
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
          <Ticker text={`🔥 COMBO ×${combo}    `} color={colors.gold} size={14} speed={70} />
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
        <View style={styles.flash}>
          <Body style={{ color: colors.gold, fontWeight: '800', fontSize: font.title }}>{flash}</Body>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      {isNew ? (
        <Button label="Got it — next →" variant="good" onPress={learnDone} />
      ) : revealed ? (
        <View style={styles.ratings}>
          {RATINGS.map((r) => (
            <Button
              key={r.rating}
              label={r.label}
              variant={r.variant}
              onPress={() => rate(r.rating)}
              style={{ flex: 1, marginHorizontal: spacing(0.5) }}
            />
          ))}
        </View>
      ) : (
        <Button label="Show answer" onPress={() => setRevealed(true)} />
      )}
    </Screen>
  );
}

/** Tap-to-reveal per-character breakdown — radical + mnemonic hint (research P1-5). */
function Breakdown({ word }: { word: Word }) {
  return (
    <View style={styles.breakdown}>
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

function ComboMeter({ combo }: { combo: number }) {
  if (combo < 2) return <Caption>no combo yet</Caption>;
  const milestone = combo >= 10;
  const bg = milestone ? colors.accent : colors.primaryDim;
  return (
    <View
      style={[styles.combo, { backgroundColor: bg }]}
      accessibilityLabel={`Combo ${combo}${milestone ? ', on fire' : ''}`}
    >
      <Body style={{ fontWeight: '800', color: readableOn(bg), fontSize: 14 }}>🔥 {combo}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prompt: { alignItems: 'center', paddingVertical: spacing(3.5), marginTop: spacing(2) },
  answer: { alignItems: 'center', marginTop: spacing(3) },
  ratings: { flexDirection: 'row', marginBottom: spacing(1) },
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
    borderTopColor: colors.border,
    paddingTop: spacing(2),
  },
  breakRow: { flexDirection: 'row', alignItems: 'center' },
});
