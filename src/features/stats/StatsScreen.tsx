/**
 * Stats (M5 "progress porn"): input-hours odometer, XP/level, streak, the
 * character-collection grid (Pokédex, glowing by mastery), and a weekly recap.
 * Everything anchors dopamine to genuine progress (spec <ethics>).
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Body, Caption, Card, Display, H1, H2, ProgressBar, Screen } from '../../components/ui';
import { Hanzi } from '../../components/chinese';
import { levelProgress, rollingHitRate } from '../../lib/gamification';
import { isKnown } from '../../lib/srs';
import { State } from 'ts-fsrs';
import { useApp, today } from '../../stores/appStore';
import { colors, radius, spacing, font } from '../../theme';

export function StatsScreen() {
  const store = useApp((s) => s.store)!;
  const stats = useApp((s) => s.stats);
  useApp((s) => s.rev); // re-render on mutations

  const cards = store.allCards();
  const learned = cards
    .map((c) => ({ card: c, word: store.getWord(c.wordId)! }))
    .filter((x) => x.word);
  const knownCount = cards.filter(isKnown).length;
  const inputHours = stats.totalInputMinutes / 60;
  const prog = levelProgress(stats.xp);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(4) }}>
        <H1>Your progress</H1>

        <Odometer hours={inputHours} />

        <View style={styles.rowStats}>
          <Stat big={`${stats.streak}`} label="🔥 day streak" />
          <Stat big={`${knownCount}`} label="words known" />
          <Stat big={`${stats.streakFreezes}`} label="🛡️ protection" />
        </View>

        <HitRate />

        <Card style={{ marginTop: spacing(2) }}>
          <View style={styles.levelRow}>
            <Body style={{ fontWeight: '800' }}>Level {prog.level}</Body>
            <Body dim>
              {prog.into}/{prog.span} XP
            </Body>
          </View>
          <View style={styles.xpTrack}>
            <View
              style={[
                styles.xpFill,
                { width: `${Math.min(100, (prog.into / Math.max(1, prog.span)) * 100)}%` },
              ]}
            />
          </View>
        </Card>

        <View style={styles.section}><H2>Collection ({learned.length})</H2></View>
        <Card>
          {learned.length === 0 ? (
            <Body dim>Tap words in the feed or do reviews to fill your grid.</Body>
          ) : (
            <View style={styles.grid}>
              {learned.slice(0, 120).map(({ card, word }) => (
                <View
                  key={word.id}
                  style={[
                    styles.cell,
                    { borderColor: masteryColor(card.state, card.stability) },
                  ]}
                >
                  <Hanzi text={word.hanzi[0]!} size={22} />
                </View>
              ))}
            </View>
          )}
        </Card>

        <View style={styles.section}><H2>This week</H2></View>
        <Card>
          <WeeklyRecap />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Odometer({ hours }: { hours: number }) {
  const target = Math.round(hours * 60); // minutes
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const step = () => {
      setShown((v) => {
        if (v >= target) return target;
        const next = v + Math.max(1, Math.ceil((target - v) / 8));
        raf = requestAnimationFrame(step);
        return next;
      });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  const h = Math.floor(shown / 60);
  const m = shown % 60;
  return (
    <Card style={styles.odometer}>
      <Body dim>total input time</Body>
      <Body style={styles.odoNumber}>
        {h}h {m}m
      </Body>
      <Body dim style={{ fontSize: font.small }}>
        input hours are the real progress metric
      </Body>
    </Card>
  );
}

function WeeklyRecap() {
  const store = useApp((s) => s.store)!;
  const days: { date: string; reviews: number; minutes: number }[] = [];
  const base = new Date(today());
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const s = store.getSession(key);
    days.push({
      date: key,
      reviews: s.reviewsDone,
      minutes: Math.round((s.feedSeconds + s.toneDrillSeconds) / 60),
    });
  }
  const max = Math.max(1, ...days.map((d) => d.reviews));
  const W = 300;
  const H = 90;
  const bw = W / days.length - 8;
  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {days.map((d, i) => {
          const bh = (d.reviews / max) * (H - 16);
          return (
            <Rect
              key={d.date}
              x={i * (W / days.length) + 4}
              y={H - bh}
              width={bw}
              height={bh}
              rx={4}
              fill={colors.primary}
            />
          );
        })}
      </Svg>
      <Body dim style={{ fontSize: font.small }}>
        reviews/day · {days.reduce((n, d) => n + d.reviews, 0)} this week
      </Body>
    </View>
  );
}

/** Forgiving rolling consistency (research P0-4 / U6) — a missed day is not total loss. */
function HitRate() {
  const store = useApp((s) => s.store)!;
  const hr = rollingHitRate(store.allSessions(), today());
  if (hr.window === 0) return null;
  const pct = Math.round(hr.rate * 100);
  return (
    <Card style={{ marginTop: spacing(2) }}>
      <View style={styles.levelRow}>
        <Body style={{ fontWeight: '800' }}>Consistency</Body>
        <Body dim>
          {hr.active} of {hr.window} days · {pct}%
        </Body>
      </View>
      <ProgressBar value={hr.rate} color={colors.good} />
      <Caption style={{ marginTop: spacing(1) }}>
        Life happens — a missed day won&apos;t erase your progress, and a freeze protects your streak
        for 24h.
      </Caption>
    </Card>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <Body style={{ fontSize: 28, fontWeight: '900' }}>{big}</Body>
      <Caption style={{ textAlign: 'center' }}>{label}</Caption>
    </Card>
  );
}

function masteryColor(state: number, stability: number): string {
  if (state === State.New) return colors.border;
  if (stability < 3) return colors.tone4;
  if (stability < 15) return colors.tone3;
  if (stability < 60) return colors.tone2;
  return colors.gold;
}

const styles = StyleSheet.create({
  odometer: { marginTop: spacing(2), alignItems: 'center', paddingVertical: spacing(3) },
  odoNumber: { fontSize: 46, fontWeight: '900', color: colors.primary, marginVertical: spacing(0.5) },
  rowStats: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(2) },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing(2) },
  section: { marginTop: spacing(3), marginBottom: spacing(1) },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(1) },
  xpTrack: { height: 12, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden' },
  xpFill: { height: 12, backgroundColor: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  cell: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
});
