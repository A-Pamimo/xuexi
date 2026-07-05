/**
 * FSRS review session (M2). Recognition reviews: hanzi -> meaning/sound and
 * audio -> meaning. Opens immediately to a preloaded item (spec session_shape:
 * a win within 10s, never a menu). Scoring drives XP, combo and streak.
 */
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, Card, H1, Screen } from '../../components/ui';
import { Hanzi, Pinyin } from '../../components/chinese';
import * as juice from '../../lib/juice';
import type { Rating } from '../../lib/types';
import { useApp } from '../../stores/appStore';
import { colors, font, radius, spacing } from '../../theme';
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

  // Snapshot the queue once so the session is stable as we rate.
  const queue = useMemo(() => reviewQueue(20), [reviewQueue]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gainedXp, setGainedXp] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  const item = queue[idx];

  // Choose prompt mode deterministically per card; audio mode only if audio exists.
  const mode = useMemo<'hanzi' | 'audio'>(() => {
    if (!item) return 'hanzi';
    const hasAudio = store.audioRefsFor('word', String(item.word.id)).length > 0;
    return hasAudio && item.word.id % 2 === 0 ? 'audio' : 'hanzi';
  }, [item, store]);

  React.useEffect(() => {
    if (item && mode === 'audio' && !revealed) playWord(store, item.word.id);
  }, [item, mode, revealed, store]);

  if (!item) {
    return (
      <Screen center>
        <H1>Session complete 🎉</H1>
        <Body dim style={{ marginTop: spacing(1) }}>
          {idx} reviews · +{gainedXp} XP · best combo {maxCombo}
        </Body>
        <Button
          label="Back to feed"
          onPress={() => router.replace('/')}
          style={{ marginTop: spacing(3) }}
        />
      </Screen>
    );
  }

  const rate = (rating: Rating) => {
    const { reward } = reviewWord(item.word.id, rating);
    const success = rating !== 'again';
    if (success) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      if (nextCombo > 1) juice.comboTick(nextCombo);
      else juice.correct();
      if (reward.multiplier > 1) {
        juice.reward();
        setFlash(`${reward.golden ? '🌟 GOLDEN ' : ''}${reward.multiplier}× XP!`);
      }
    } else {
      setCombo(0);
      juice.wrong();
    }
    setGainedXp((x) => x + (rating === 'again' ? 2 : 10));
    setTimeout(() => setFlash(null), 700);
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Body dim>
          {idx + 1}/{queue.length}
        </Body>
        <ComboMeter combo={combo} />
      </View>

      <Card style={styles.prompt}>
        {mode === 'audio' && !revealed ? (
          <Pressable onPress={() => playWord(store, item.word.id)} style={styles.audioBtn}>
            <Body style={{ fontSize: 64 }}>🔊</Body>
            <Body dim>Tap to replay</Body>
          </Pressable>
        ) : (
          <Hanzi text={item.word.hanzi} size={item.word.hanzi.length > 2 ? font.hanziM : font.hanziXL} />
        )}

        {revealed ? (
          <View style={styles.answer}>
            <Pinyin numbered={item.word.pinyinNumbered} size={22} />
            <Body style={{ marginTop: spacing(1), textAlign: 'center' }}>
              {item.word.glossEn}
            </Body>
            <Pressable onPress={() => playWord(store, item.word.id)} style={{ marginTop: spacing(1) }}>
              <Body dim>🔊 play</Body>
            </Pressable>
          </View>
        ) : null}
      </Card>

      {flash ? (
        <View style={styles.flash}>
          <Body style={{ color: colors.gold, fontWeight: '800', fontSize: font.title }}>
            {flash}
          </Body>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      {revealed ? (
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

function ComboMeter({ combo }: { combo: number }) {
  if (combo < 2) return <Body dim>combo 0</Body>;
  const milestone = combo >= 10;
  return (
    <View style={[styles.combo, milestone && { backgroundColor: colors.accent }]}>
      <Body style={{ fontWeight: '800', color: '#fff' }}>🔥 {combo}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prompt: { alignItems: 'center', paddingVertical: spacing(4), marginTop: spacing(2) },
  audioBtn: { alignItems: 'center' },
  answer: { alignItems: 'center', marginTop: spacing(3) },
  ratings: { flexDirection: 'row', marginBottom: spacing(1) },
  combo: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radius.pill,
  },
  flash: { alignItems: 'center', marginTop: spacing(2) },
});
