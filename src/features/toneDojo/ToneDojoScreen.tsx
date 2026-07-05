/**
 * Tone Dojo (M3): rapid-fire, high-variability tone identification. Hear a
 * syllable (multiple recorded speakers), tap the tone (1-4) before the timer
 * runs out. Instant green/red flash + the correct contour, combo meter with
 * escalating pitch, haptics + sound via juice.ts. ~60s sessions.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, H1, Screen } from '../../components/ui';
import { playAsset } from '../../lib/audio';
import * as juice from '../../lib/juice';
import type { AudioRef, ToneNumber } from '../../lib/types';
import { useApp } from '../../stores/appStore';
import { colors, radius, spacing, toneColor } from '../../theme';
import { ToneContour } from './ToneContour';

const SESSION_MS = 60_000;
const QUESTION_MS = 3500;
const TONE_NAMES = ['1 flat', '2 rising', '3 dip', '4 falling'];

interface Question {
  ref: AudioRef;
  syllable: string;
  tone: ToneNumber;
}

export function ToneDojoScreen() {
  const store = useApp((s) => s.store)!;
  const recordTone = useApp((s) => s.recordTone);
  const addToneSeconds = useApp((s) => s.addToneSeconds);

  const syllableRefs = useRef<AudioRef[]>(
    store.audioRefs.filter((r) => r.ownerType === 'syllable' && r.tone != null),
  );
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [q, setQ] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; tone: ToneNumber } | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [sessionLeft, setSessionLeft] = useState(SESSION_MS);
  const [qProgress, setQProgress] = useState(1);

  const questionStart = useRef(0);
  const askedAt = useRef(0);
  const locked = useRef(false);

  const nextQuestion = useCallback(() => {
    const refs = syllableRefs.current;
    const ref = refs[Math.floor(Math.random() * refs.length)]!;
    const syllable = ref.ownerKey.replace(/[1-5]$/, '');
    const question: Question = { ref, syllable, tone: ref.tone as ToneNumber };
    setQ(question);
    setFeedback(null);
    locked.current = false;
    askedAt.current = Date.now();
    void playAsset(ref.assetKey);
  }, []);

  const start = () => {
    setPhase('playing');
    setScore({ correct: 0, total: 0 });
    setCombo(0);
    setMaxCombo(0);
    setSessionLeft(SESSION_MS);
    questionStart.current = Date.now();
    nextQuestion();
  };

  const answer = useCallback(
    (chosen: ToneNumber | null) => {
      if (!q || locked.current) return;
      locked.current = true;
      const correct = chosen === q.tone;
      setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
      setFeedback({ correct, tone: q.tone });
      recordTone(
        {
          syllable: q.syllable,
          speakerId: q.ref.speakerId,
          chosenTone: (chosen ?? 0) as ToneNumber,
          correctTone: q.tone,
          latencyMs: Date.now() - askedAt.current,
          timestamp: new Date().toISOString(),
        },
        correct,
      );
      if (correct) {
        const nc = combo + 1;
        setCombo(nc);
        setMaxCombo((m) => Math.max(m, nc));
        nc > 1 ? juice.comboTick(nc) : juice.correct();
      } else {
        setCombo(0);
        juice.wrong();
      }
      setTimeout(() => {
        if (Date.now() - questionStart.current < SESSION_MS) nextQuestion();
      }, 650);
    },
    [q, combo, recordTone, nextQuestion],
  );

  // Master tick: session countdown + per-question shrinking timer.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const elapsed = Date.now() - questionStart.current;
      const left = Math.max(0, SESSION_MS - elapsed);
      setSessionLeft(left);
      if (left <= 0) {
        clearInterval(id);
        addToneSeconds(Math.round(SESSION_MS / 1000));
        setPhase('done');
        return;
      }
      if (!locked.current) {
        const qLeft = Math.max(0, QUESTION_MS - (Date.now() - askedAt.current));
        setQProgress(qLeft / QUESTION_MS);
        if (qLeft <= 0) answer(null); // timeout counts as a miss
      }
    }, 90);
    return () => clearInterval(id);
  }, [phase, answer, addToneSeconds]);

  if (phase === 'idle') {
    return (
      <Screen center>
        <H1>🥋 Tone Dojo</H1>
        <Body dim style={{ textAlign: 'center', marginVertical: spacing(2) }}>
          Hear a syllable, tap its tone before the bar empties. Many speakers,
          fast rounds. 60 seconds — go!
        </Body>
        <Button label="Start" onPress={start} />
      </Screen>
    );
  }

  if (phase === 'done') {
    const acc = score.total ? Math.round((score.correct / score.total) * 100) : 0;
    const allTime = allTimeAccuracy(store);
    return (
      <Screen center>
        <H1>Time!</H1>
        <Body style={{ marginTop: spacing(1) }}>
          {score.correct}/{score.total} correct · {acc}% · best combo {maxCombo}
        </Body>
        <Body dim style={{ marginTop: spacing(1) }}>
          All-time accuracy: {allTime}%
        </Body>
        <Button label="Go again" onPress={start} style={{ marginTop: spacing(3) }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Body dim>⏱ {Math.ceil(sessionLeft / 1000)}s</Body>
        <Body style={{ fontWeight: '800', color: combo >= 10 ? colors.accent : colors.text }}>
          {score.correct}/{score.total} · 🔥{combo}
        </Body>
      </View>

      {/* per-question timer bar */}
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${qProgress * 100}%` }]} />
      </View>

      <View style={styles.center}>
        {feedback ? (
          <View style={{ alignItems: 'center' }}>
            <Body
              style={{
                color: feedback.correct ? colors.good : colors.bad,
                fontSize: 28,
                fontWeight: '800',
              }}
            >
              {feedback.correct ? 'Correct!' : `Tone ${feedback.tone}`}
            </Body>
            <ToneContour tone={feedback.tone} size={160} />
          </View>
        ) : (
          <Pressable onPress={() => q && void playAsset(q.ref.assetKey)} style={{ alignItems: 'center' }}>
            <Body style={{ fontSize: 72 }}>🔊</Body>
            <Body dim>tap to replay</Body>
          </Pressable>
        )}
      </View>

      <View style={styles.tones}>
        {([1, 2, 3, 4] as ToneNumber[]).map((t) => (
          <Pressable
            key={t}
            disabled={!!feedback}
            onPress={() => answer(t)}
            style={[styles.toneBtn, { borderColor: toneColor(t) }]}
          >
            <ToneContour tone={t} size={70} />
            <Body style={{ color: toneColor(t), fontWeight: '700' }}>{TONE_NAMES[t - 1]}</Body>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function allTimeAccuracy(store: ReturnType<typeof useApp.getState>['store']): number {
  const results = store!.toneResults();
  if (!results.length) return 0;
  const correct = results.filter((r) => r.chosenTone === r.correctTone).length;
  return Math.round((correct / results.length) * 100);
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(1) },
  timerTrack: {
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  timerFill: { height: 8, backgroundColor: colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tones: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  toneBtn: {
    width: '48%',
    borderWidth: 2,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    marginBottom: spacing(1.5),
    backgroundColor: colors.surface,
  },
});
