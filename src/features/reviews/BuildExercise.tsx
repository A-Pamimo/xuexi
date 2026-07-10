/**
 * "Build the sentence" production exercise (C1). The learner reads the English
 * gloss (and may hear the audio), then taps scrambled word chips into an answer
 * row to reconstruct the Mandarin sentence. Production recall is harder — and
 * stickier — than recognition (research U3).
 *
 * Pure logic lives in ./buildExercise.logic (scramble + grade); this file is the
 * presentation. Feedback goes through juice; colors come from the theme; motion
 * collapses to its final state under reduced motion (chips just appear/leave).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, Caption, Card, H2, PlayButton, Screen } from '../../components/ui';
import { Hanzi, Pinyin } from '../../components/chinese';
import { stopAudio } from '../../lib/audio';
import * as juice from '../../lib/juice';
import type { Sentence } from '../../lib/types';
import { useApp } from '../../stores/appStore';
import { useTheme } from '../../lib/appearance';
import { useReducedMotion } from '../../lib/motion';
import { radius, spacing } from '../../theme';
import { playSentence } from '../shared/play';
import {
  gradeOrder,
  scrambleTokens,
  seedFromIds,
  type BuildToken,
} from './buildExercise.logic';

/** A bank chip with a per-instance id, so repeated words stay independently placeable. */
type Placeable = BuildToken & { uid: number };

export function BuildExercise({
  sentence,
  onDone,
}: {
  sentence: Sentence;
  onDone: (correct: boolean) => void;
}) {
  const store = useApp((s) => s.store)!;
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  // Resolve the sentence's real word tokens (in correct order) once. Words that
  // aren't in the store are skipped — grading is over the resolvable tokens.
  const correct = useMemo<BuildToken[]>(() => {
    return sentence.wordIds
      .map((id) => store.getWord(id))
      .filter((w): w is NonNullable<typeof w> => !!w)
      .map((w) => ({ id: w.id, hanzi: w.hanzi, pinyin: w.pinyinNumbered }));
  }, [sentence, store]);

  // Deterministic per-sentence scramble (stable across re-renders, no RNG here).
  // Each chip gets a unique instance id (`uid`) so identity is per-chip, not per
  // word — a sentence with a repeated word (谢谢, a second 我/你) stays solvable
  // instead of both chips vanishing on one tap. Grading still uses the wordId.
  const bank0 = useMemo<Placeable[]>(
    () =>
      scrambleTokens(correct, seedFromIds(correct.map((t) => t.id))).map((t, i) => ({
        ...t,
        uid: i,
      })),
    [correct],
  );

  // Single source of truth: the ordered picks. The bank is whatever hasn't been
  // placed — so a chip can never be placed twice (double-tap is a no-op).
  const [picked, setPicked] = useState<Placeable[]>([]);
  const [result, setResult] = useState<'idle' | 'right' | 'wrong'>('idle');

  const placedUids = useMemo(() => new Set(picked.map((p) => p.uid)), [picked]);
  const bank = useMemo(() => bank0.filter((t) => !placedUids.has(t.uid)), [bank0, placedUids]);

  // Silence any sentence playback when leaving the screen (mirrors ReviewScreen).
  useEffect(() => () => void stopAudio(), []);

  const graded = result !== 'idle';

  const place = (t: Placeable) => {
    if (graded || placedUids.has(t.uid)) return;
    juice.tap();
    setPicked((p) => [...p, t]);
  };

  const removeAt = (i: number) => {
    if (graded) return;
    juice.tap();
    setPicked((p) => p.filter((_, idx) => idx !== i));
  };

  const check = () => {
    const ok = gradeOrder(picked, correct);
    if (ok) {
      setResult('right');
      juice.correct();
    } else {
      setResult('wrong');
      juice.wrong();
    }
    // Let the learner see the mark (and the correct order on a miss) before
    // advancing. Collapses to immediate under reduced motion.
    if (reduced) onDone(ok);
    else setTimeout(() => onDone(ok), 1100);
  };

  // correct.length > 0 guards the degenerate case where a sentence's words don't
  // resolve (empty puzzle) — never let an empty answer auto-grade as correct.
  const ready = correct.length > 0 && picked.length === correct.length && !graded;

  return (
    <Screen ambient>
      <Caption style={{ letterSpacing: 1 }}>BUILD THE SENTENCE</Caption>
      <H2 style={{ marginTop: spacing(0.5) }}>{sentence.glossEn}</H2>

      <PlayButton
        size={28}
        hint="hear it"
        style={{ marginTop: spacing(2), alignSelf: 'flex-start' }}
        play={() => playSentence(store, sentence)}
        accessibilityLabel="Play the sentence audio"
      />

      {/* Answer row — tap a chip to send it back to the bank. */}
      <Card style={styles.answer}>
        {picked.length === 0 ? (
          <Body dim>Tap the words below in order…</Body>
        ) : (
          <View style={styles.chipRow}>
            {picked.map((t, i) => (
              <Chip
                key={t.uid}
                token={t}
                onPress={() => removeAt(i)}
                placed
                disabled={graded}
              />
            ))}
          </View>
        )}
      </Card>

      {/* On a miss, reveal the correct order (honest correction, not a nag). */}
      {result === 'wrong' ? (
        <View style={{ marginTop: spacing(1.5) }}>
          <Caption style={{ color: colors.bad }}>Correct order</Caption>
          <View style={[styles.chipRow, { marginTop: spacing(1) }]}>
            {correct.map((t, i) => (
              <Chip key={`c${i}`} token={t} correct disabled />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      {/* Word bank. */}
      <View style={[styles.chipRow, styles.bank]}>
        {bank.map((t) => (
          <Chip key={t.uid} token={t} onPress={() => place(t)} disabled={graded} />
        ))}
        {bank.length === 0 && !graded ? (
          <Caption>all placed — check your answer</Caption>
        ) : null}
      </View>

      <Button
        label={result === 'right' ? 'Correct! ✓' : result === 'wrong' ? 'Not quite' : 'Check'}
        variant={result === 'right' ? 'good' : result === 'wrong' ? 'bad' : 'primary'}
        disabled={!ready}
        onPress={check}
        style={{ marginTop: spacing(2) }}
      />
    </Screen>
  );
}

/** One tappable word chip (hanzi over pinyin). */
function Chip({
  token,
  onPress,
  placed,
  correct,
  disabled,
}: {
  token: BuildToken;
  onPress?: () => void;
  placed?: boolean;
  correct?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const borderColor = correct ? colors.good : placed ? colors.primary : colors.border;
  const backgroundColor = placed ? colors.primarySoft : colors.surface;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${token.hanzi}${placed ? ', tap to remove' : ''}`}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor, backgroundColor, opacity: disabled && !correct ? 0.7 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <Hanzi text={token.hanzi} size={26} />
      <Pinyin numbered={token.pinyin} size={13} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  answer: { marginTop: spacing(2), justifyContent: 'center', minHeight: spacing(9) },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), alignItems: 'flex-end' },
  bank: { marginBottom: spacing(1), minHeight: spacing(9), alignItems: 'center' },
  chip: {
    alignItems: 'center',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
