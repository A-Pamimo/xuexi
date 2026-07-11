/**
 * Stats (M5 "progress porn"): input-hours odometer, XP/level, streak, the
 * character-collection grid (Pokédex, glowing by mastery), and a weekly recap.
 * Everything anchors dopamine to genuine progress (spec <ethics>).
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Clock } from 'lucide-react-native';
import { Body, Caption, Card, Display, H1, H2, ProgressBar, Screen } from '../../components/ui';
import { Hanzi, Pinyin } from '../../components/chinese';
import { ThemeToggle } from '../../components/ThemeToggle';
import { ReminderSettings } from '../../components/ReminderSettings';
import { AccountCard } from '../../components/AccountCard';
import { levelProgress, rollingHitRate } from '../../lib/gamification';
import { useReducedMotion } from '../../lib/motion';
import { isKnown } from '../../lib/srs';
import { State } from 'ts-fsrs';
import { useApp, today } from '../../stores/appStore';
import { radius, spacing, font, fonts } from '../../theme';
import type { ThemeColors } from '../../theme';
import { useTheme } from '../../lib/appearance';

export function StatsScreen() {
  const store = useApp((s) => s.store)!;
  const stats = useApp((s) => s.stats);
  const cloudConfigured = useApp((s) => s.cloudConfigured);
  useApp((s) => s.rev); // re-render on mutations
  const { colors } = useTheme();

  const cards = store.allCards();
  const learned = cards
    .map((c) => ({ card: c, word: store.getWord(c.wordId)! }))
    .filter((x) => x.word);
  const knownCount = cards.filter(isKnown).length;
  const inputHours = stats.totalInputMinutes / 60;
  const prog = levelProgress(stats.xp);

  return (
    <Screen ambient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(4) }}>
        <H1>Your progress</H1>

        <Odometer hours={inputHours} />

        <FeaturedWord />

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
          <View style={[styles.xpTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.xpFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.min(100, (prog.into / Math.max(1, prog.span)) * 100)}%`,
                },
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
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: masteryColor(colors, card.state, card.stability),
                    },
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

        {cloudConfigured ? (
          <>
            <View style={styles.section}><H2>Account</H2></View>
            <AccountCard />
          </>
        ) : null}

        <View style={styles.section}><H2>Appearance</H2></View>
        <ThemeToggle />

        <View style={styles.section}><H2>Reminders</H2></View>
        <ReminderSettings />
      </ScrollView>
    </Screen>
  );
}

// The dark "Total Input" hero — input hours are the app's honest progress metric,
// so they lead the screen on a calm ink-dark card (same in light & dark mode, like
// the paper-ink prototype), with a milestone bar to the next 100 hours.
const HERO_BG = '#2D2D26';
const HERO_TEXT = '#F5F1E8';
const HERO_DIM = '#B8B0A0';
const HERO_ACCENT = '#C69A6A';

function Odometer({ hours }: { hours: number }) {
  const target = Math.round(hours * 60); // minutes
  const reduce = useReducedMotion();
  // Reduced motion: skip the count-up, show the final value (no first-frame flash of 0).
  const [shown, setShown] = useState(() => (reduce ? target : 0));
  useEffect(() => {
    if (reduce) {
      setShown(target);
      return;
    }
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
  }, [target, reduce]);
  const shownHours = shown / 60;
  const milestone = Math.max(100, Math.ceil(shownHours / 100) * 100);
  const ratio = Math.min(1, milestone ? shownHours / milestone : 0);
  return (
    <View style={styles.hero}>
      <View style={styles.heroHead}>
        <Clock size={18} color={HERO_DIM} strokeWidth={2} />
        <Text style={styles.heroLabel}>TOTAL INPUT</Text>
      </View>
      <View style={styles.heroNumRow}>
        <Text style={styles.heroNum}>{shownHours.toFixed(1)}</Text>
        <Text style={styles.heroUnit}>hours</Text>
      </View>
      <View style={styles.heroTrack}>
        <View style={[styles.heroFill, { width: `${ratio * 100}%` }]} />
      </View>
      <Text style={styles.heroNext}>Next milestone: {milestone}h · the real progress metric</Text>
    </View>
  );
}

/**
 * "Currently learning" — the one personality widget (Ben Martin's book-card).
 * The honest "what you're consolidating now" word = studied card with the lowest
 * stability, tie-broken by most-recent. Reuses existing store API only.
 */
function useFeaturedWord() {
  const store = useApp((s) => s.store)!;
  useApp((s) => s.rev); // recompute on mutation
  const studied = store.allCards().filter(isKnown);
  if (studied.length === 0) return null;
  const card = studied.reduce((best, c) =>
    c.stability < best.stability || (c.stability === best.stability && c.createdAt > best.createdAt)
      ? c
      : best,
  );
  const word = store.getWord(card.wordId);
  return word ? { card, word } : null;
}

function FeaturedWord() {
  const featured = useFeaturedWord();
  const { colors } = useTheme();
  if (!featured) return null; // pre-onboarding / empty grid: render nothing
  const { card, word } = featured;
  return (
    <Card style={{ ...styles.featured, borderColor: masteryColor(colors, card.state, card.stability) }}>
      <Caption>currently learning</Caption>
      <Hanzi text={word.hanzi} size={font.hanziL} />
      <Pinyin numbered={word.pinyinNumbered} size={20} />
      <Body dim>{word.glossEn}</Body>
    </Card>
  );
}

function WeeklyRecap() {
  const store = useApp((s) => s.store)!;
  const { colors } = useTheme();
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
  const { colors } = useTheme();
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

function masteryColor(colors: ThemeColors, state: number, stability: number): string {
  if (state === State.New) return colors.border;
  if (stability < 3) return colors.tone4;
  if (stability < 15) return colors.tone3;
  if (stability < 60) return colors.tone2;
  return colors.gold;
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing(3),
    backgroundColor: HERO_BG,
    borderRadius: radius.xl,
    padding: spacing(3),
  },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(1), marginBottom: spacing(2) },
  heroLabel: {
    color: HERO_DIM,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  heroNumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(1) },
  heroNum: { color: HERO_TEXT, fontFamily: fonts.displayBold, fontSize: 60, lineHeight: 62 },
  heroUnit: { color: HERO_DIM, fontFamily: fonts.sans, fontSize: 16, paddingBottom: spacing(1) },
  heroTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginTop: spacing(2.5),
  },
  heroFill: { height: 8, borderRadius: radius.pill, backgroundColor: HERO_ACCENT },
  heroNext: { color: HERO_DIM, fontFamily: fonts.sans, fontSize: 12, marginTop: spacing(1), textAlign: 'right' },
  featured: { marginTop: spacing(2), alignItems: 'center', gap: spacing(1), paddingVertical: spacing(3) },
  rowStats: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(3) },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing(2) },
  section: { marginTop: spacing(4), marginBottom: spacing(1) },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(1) },
  xpTrack: { height: 12, borderRadius: radius.pill, overflow: 'hidden' },
  xpFill: { height: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  cell: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
