/**
 * Tone Dojo (M3): rapid-fire, high-variability tone identification. Hear a
 * syllable (multiple recorded speakers), tap the tone (1-4) before the timer
 * runs out. Instant green/red flash + the correct contour, combo meter with
 * escalating pitch, haptics + sound via juice.ts. ~60s sessions.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, Caption, Display, H1, PlayButton, ProgressBar, Screen } from '../../components/ui';
import { ScrambleText } from '../../components/ScrambleText';
import { Ticker } from '../../components/Ticker';
import { playAsset, stopAudio } from '../../lib/audio';
import * as juice from '../../lib/juice';
import { syllableToMarks } from '../../lib/pinyin';
import type { AudioRef, ToneNumber } from '../../lib/types';
import { accuracyByTone, speakerTierFor } from '../../lib/toneAdaptive';
import { useApp } from '../../stores/appStore';
import { colors, radius, spacing, toneColor, TONE_NAMES } from '../../theme';
import { ToneContour } from './ToneContour';

const SESSION_MS = 60_000;
const QUESTION_MS = 3500;
const TONE_LABELS = ['1 · flat', '2 · rising', '3 · dip', '4 · falling'];

interface Question {
  ref: AudioRef;
  syllable: string;
  tone: ToneNumber;
}

export function ToneDojoScreen() {
  const store = useApp((s) => s.store)!;
  const recordTone = useApp((s) => s.recordTone);
  const addToneSeconds = useApp((s) => s.addToneSeconds);

  const allSyllableRefs = useRef<AudioRef[]>(
    store.audioRefs.filter((r) => r.ownerType === 'syllable' && r.tone != null),
  );
  const sessionRefs = useRef<AudioRef[]>(allSyllableRefs.current);
  const [voiceTier, setVoiceTier] = useState<1 | 2 | 3>(1);
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
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // On unmount: clear the pending question-advance timer (no state-update on an
  // unmounted screen) and stop any playing tone (audio must not linger on exit).
  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    void stopAudio();
  }, []);

  // Tabs stay mounted, so leaving the Dojo tab wouldn't otherwise stop the round.
  // End the round + silence audio on blur so a tone never keeps playing after you
  // navigate away.
  useFocusEffect(
    useCallback(() => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      void stopAudio();
      setPhase((p) => (p === 'playing' ? 'idle' : p));
    }, []),
  );

  const nextQuestion = useCallback(() => {
    const refs = sessionRefs.current.length ? sessionRefs.current : allSyllableRefs.current;
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
    // Scaffold speaker variability to proven accuracy (research P0-2): beginners
    // train on one voice; mastery widens the pool. Fixed for the whole session.
    const { tier, allowed } = speakerTierFor(store.toneResults());
    sessionRefs.current = allSyllableRefs.current.filter((r) => allowed.includes(r.speakerId));
    setVoiceTier(tier);
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
      const nextCombo = correct ? combo + 1 : 0;
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
        nextCombo,
      );
      if (correct) {
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        nextCombo > 1 ? juice.comboTick(nextCombo) : juice.correct();
      } else {
        setCombo(0);
        juice.wrong();
      }
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
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
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        void stopAudio(); // round over — silence the last tone
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
        <Display>🥋</Display>
        <H1>Tone Dojo</H1>
        <Body dim style={{ textAlign: 'center', marginVertical: spacing(2), maxWidth: 320 }}>
          Hear a syllable, tap its tone before the bar empties. Many speakers,
          fast rounds. 60 seconds — go!
        </Body>
        <Button label="Start" onPress={start} style={{ alignSelf: 'stretch' }} />
      </Screen>
    );
  }

  if (phase === 'done') {
    const acc = score.total ? Math.round((score.correct / score.total) * 100) : 0;
    const allTime = allTimeAccuracy(store);
    return (
      <Screen center>
        <Display>{acc >= 80 ? '🎉' : '💪'}</Display>
        <H1>Time!</H1>
        <Body style={{ marginTop: spacing(1), textAlign: 'center' }}>
          {score.correct}/{score.total} correct · {acc}% · best combo {maxCombo}
        </Body>
        <Caption style={{ marginTop: spacing(1) }}>All-time accuracy: {allTime}%</Caption>
        <ToneBreakdown />
        <Button label="Go again" onPress={start} style={{ marginTop: spacing(3), alignSelf: 'stretch' }} />
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
      <View style={{ marginTop: spacing(1) }}>
        <ProgressBar
          value={qProgress}
          height={8}
          color={qProgress < 0.3 ? colors.bad : colors.primary}
        />
      </View>
      <Caption style={{ marginTop: spacing(0.5) }}>
        🎙️ {voiceTier} of 3 voices{voiceTier < 3 ? ' · widens as you improve' : ' · full variability'}
      </Caption>
      {combo >= 5 ? (
        <View style={{ marginTop: spacing(1) }}>
          <Ticker text={`🔥 COMBO ×${combo}    `} color={colors.gold} size={14} speed={70} />
        </View>
      ) : null}

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
            {q ? (
              <ScrambleText
                text={syllableToMarks(`${q.syllable}${feedback.tone}`)}
                kind="pinyin"
                style={{
                  color: toneColor(feedback.tone),
                  fontSize: 34,
                  fontWeight: '700',
                  marginTop: spacing(0.5),
                }}
              />
            ) : null}
            <ToneContour tone={feedback.tone} size={160} />
          </View>
        ) : (
          <PlayButton
            size={56}
            hint="tap to replay"
            play={() => (q ? playAsset(q.ref.assetKey) : false)}
            accessibilityLabel="Replay the syllable"
          />
        )}
      </View>

      <View style={styles.tones}>
        {([1, 2, 3, 4] as ToneNumber[]).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityLabel={`Tone ${t}, ${TONE_NAMES[t - 1]}`}
            disabled={!!feedback}
            onPress={() => answer(t)}
            style={[styles.toneBtn, { borderColor: toneColor(t) }]}
          >
            <ToneContour tone={t} size={70} />
            <Body style={{ color: toneColor(t), fontWeight: '800', fontSize: 15 }}>{TONE_LABELS[t - 1]}</Body>
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

/** Per-tone accuracy with trend — competence feedback (research U2). */
function ToneBreakdown() {
  const store = useApp((s) => s.store)!;
  const rows = accuracyByTone(store.toneResults());
  if (!rows.some((r) => r.pct !== null)) return null;
  return (
    <View style={styles.breakdown}>
      {rows.map((r) => (
        <View key={r.tone} style={styles.breakdownRow}>
          <Body style={{ color: toneColor(r.tone), fontSize: 14 }}>
            Tone {r.tone} · {TONE_NAMES[r.tone - 1]}
          </Body>
          <Body dim style={{ fontSize: 14 }}>
            {r.pct === null ? '—' : `${Math.round(r.pct * 100)}%`}
            {r.delta !== null && Math.abs(r.delta) >= 0.01
              ? ` ${r.delta > 0 ? '▲' : '▼'}${Math.abs(Math.round(r.delta * 100))}`
              : ''}
          </Body>
        </View>
      ))}
    </View>
  );
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
  breakdown: { marginTop: spacing(2), alignSelf: 'stretch', gap: spacing(0.75) },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
