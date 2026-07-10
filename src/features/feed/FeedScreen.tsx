/**
 * Swipe feed (M4): full-screen vertical cards, each an i+1 sentence with native
 * audio (autoplay on focus), tappable words (tap = gloss + add-to-SRS), and a
 * pinyin toggle. Feed seconds count toward input hours + streak integrity.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { Body, Button, Caption, H1, Pill, PlayButton, Screen } from '../../components/ui';
import { Hanzi, Pinyin } from '../../components/chinese';
import { Ticker } from '../../components/Ticker';
import { DailyGoalRing } from '../../components/DailyGoalRing';
import { isAudioUnlocked, unlockAudio as unlockAudioGlobal } from '../../lib/audio';
import * as juice from '../../lib/juice';
import { useReducedMotion } from '../../lib/motion';
import type { Sentence, Word } from '../../lib/types';
import { useApp } from '../../stores/appStore';
import { elevation, font, radius, spacing } from '../../theme';
import type { ThemeColors } from '../../theme';
import { useTheme, useThemedStyles } from '../../lib/appearance';
import { AmbientBackground } from '../../components/AmbientBackground';
import { AMBIENT_BACKGROUND } from '../../lib/flags';
import { selectFeed } from './selection';
import { playSentence, playWord } from '../shared/play';

const NATIVE_DRIVER = Platform.OS !== 'web';

interface Token {
  text: string;
  word: Word | null;
}

export function FeedScreen() {
  const store = useApp((s) => s.store)!;
  const knownWordIds = useApp((s) => s.knownWordIds);
  const dueCount = useApp((s) => s.dueCount);
  const streak = useApp((s) => s.stats.streak);
  const addFeedSeconds = useApp((s) => s.addFeedSeconds);
  const addWord = useApp((s) => s.addWord);
  const noteGloss = useApp((s) => s.noteGloss);
  // `rev` bumps on every scored mutation; subscribing re-runs goalToday() so the
  // ring tracks XP as it accrues (same reactivity path as dueCount below).
  const rev = useApp((s) => s.rev);
  const goalToday = useApp((s) => s.goalToday);
  const { height } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduce = useReducedMotion();

  const [showPinyin, setShowPinyin] = useState(true);
  const [selected, setSelected] = useState<Word | null>(null);

  // `rev` is read purely to re-render this screen as XP accrues; goalToday()
  // then pulls the fresh figures. Referenced so strict/noUnused stays happy.
  void rev;
  const goal = goalToday();
  // The finish-line banner is dismissible (non-blocking); reset the dismissal
  // if a fresh day pushes the goal back below the line.
  const [goalBannerDismissed, setGoalBannerDismissed] = useState(false);
  useEffect(() => {
    if (!goal.met) setGoalBannerDismissed(false);
  }, [goal.met]);

  // Web blocks autoplay until a user gesture; don't fire scroll-to-play until then
  // (otherwise it silently no-ops). Gating now lives in audio.ts so nav SFX and
  // the feed share one truth; this local state only drives the caption hint.
  const [audioLocked, setAudioLocked] = useState(!isAudioUnlocked());
  const unlockAudio = useCallback(() => {
    if (!isAudioUnlocked()) {
      unlockAudioGlobal();
    }
    setAudioLocked(false);
  }, []);

  const feed = useMemo(() => {
    const known = knownWordIds();
    const due = new Set(
      store
        .allCards()
        .filter((c) => new Date(c.due).getTime() <= Date.now())
        .map((c) => c.wordId),
    );
    return selectFeed({ sentences: store.sentences, knownWordIds: known, dueWordIds: due, count: 40 });
  }, [store, knownWordIds]);

  // Accumulate feed time while this screen is mounted.
  const secs = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      secs.current += 5;
      addFeedSeconds(5);
    }, 5000);
    return () => clearInterval(id);
  }, [addFeedSeconds]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.item as Sentence | undefined;
    if (first && isAudioUnlocked()) void playSentence(store, first);
  }).current;

  const tokenize = useCallback(
    (s: Sentence): Token[] => {
      const words = s.wordIds
        .map((id) => store.getWord(id))
        .filter((w): w is Word => !!w);
      const tokens: Token[] = [];
      let i = 0;
      let wi = 0;
      const bare = s.hanzi;
      while (i < bare.length) {
        const w = words[wi];
        if (w && bare.startsWith(w.hanzi, i)) {
          tokens.push({ text: w.hanzi, word: w });
          i += w.hanzi.length;
          wi++;
        } else {
          tokens.push({ text: bare[i]!, word: null });
          i++;
        }
      }
      return tokens;
    },
    [store],
  );

  if (feed.length === 0) {
    return (
      <Screen center>
        <H1>Feed warming up</H1>
        <Body dim style={{ textAlign: 'center', marginTop: spacing(1) }}>
          Do a few reviews to unlock comprehensible sentences.
        </Body>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      {AMBIENT_BACKGROUND ? <AmbientBackground /> : null}
      <FlatList
        data={feed}
        keyExtractor={(s) => String(s.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { height }]}>
            <View style={styles.hanziWrap}>
              {tokenize(item).map((tok, idx) =>
                tok.word ? (
                  <Pressable
                    key={idx}
                    accessibilityRole="button"
                    accessibilityLabel={`${tok.text}, tap for meaning and to add to Learn`}
                    onPress={() => { unlockAudio(); juice.tap(); noteGloss(tok.word!.id); setSelected(tok.word); }}
                  >
                    <Body style={styles.tokenWord}>{tok.text}</Body>
                  </Pressable>
                ) : (
                  <Body key={idx} style={styles.tokenPlain}>
                    {tok.text}
                  </Body>
                ),
              )}
            </View>
            {showPinyin ? (
              <View style={{ marginTop: spacing(2) }}>
                <Pinyin numbered={item.pinyin} size={20} />
              </View>
            ) : null}
            <Body dim style={{ marginTop: spacing(2), textAlign: 'center' }}>
              {item.glossEn}
            </Body>
            <PlayButton
              size={34}
              style={{ marginTop: spacing(3) }}
              play={() => { unlockAudio(); return playSentence(store, item); }}
              accessibilityLabel="Play sentence audio"
            />
            <Caption style={{ marginTop: spacing(3) }}>
              {audioLocked ? 'tap 🔊 to enable audio' : 'tap underlined words · swipe up ↑'}
            </Caption>
          </View>
        )}
      />

      {streak >= 3 ? (
        <View style={styles.streakRibbon} pointerEvents="none">
          <Ticker text={`🔥 ${streak}-DAY STREAK · KEEP IT ALIVE    `} color={colors.gold} size={13} speed={60} />
        </View>
      ) : null}

      {/* A1: daily-goal ring, top-left, mirrors the pills' top inset. */}
      <View style={styles.ringOverlay} pointerEvents="none">
        <DailyGoalRing ratio={goal.ratio} into={goal.into} goal={goal.goal} met={goal.met} size={56} />
      </View>

      {/* A1: the finish line — a non-blocking, dismissible banner once met. */}
      {goal.met && !goalBannerDismissed ? (
        <View style={styles.goalBanner} pointerEvents="box-none">
          <Pressable
            style={styles.goalBannerInner}
            accessibilityRole="button"
            accessibilityLabel="Today's goal is done. Dismiss."
            onPress={() => { juice.tap(); setGoalBannerDismissed(true); }}
          >
            <Caption style={{ color: colors.gold, textAlign: 'center' }}>
              🎉 today's goal is done — keep going or come back tomorrow  ✕
            </Caption>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: showPinyin }}
          accessibilityLabel="Toggle pinyin"
          onPress={() => { unlockAudio(); setShowPinyin((p) => !p); }}
        >
          <Pill tone={showPinyin ? 'active' : 'default'}>
            <Body style={{ fontWeight: '700', fontSize: 14 }}>Pinyin {showPinyin ? 'on' : 'off'}</Body>
          </Pill>
        </Pressable>
        <Pill>
          <Caption>due {dueCount()}</Caption>
        </Pill>
      </View>

      {/* B2: inline gloss peek — a bottom sheet that keeps the sentence visible
          above it (no scrim). Blooms in unless reduced motion. */}
      <GlossPeek
        word={selected}
        reduce={reduce}
        styles={styles}
        inLearn={selected ? !!store.getCard(selected.id) : false}
        onPlay={() => (selected ? playWord(store, selected.id) : false)}
        onAdd={() => {
          if (selected && addWord(selected.id)) juice.correct();
          setSelected(null);
        }}
        onClose={() => { juice.tap(); setSelected(null); }}
      />
    </View>
  );
}

/**
 * B2 inline gloss: a non-blocking bottom peek. It stays mounted through the
 * close animation (rendered from a lingering `shown` word) so it can slide out
 * rather than vanish. Reduced motion commits the final frame with no travel.
 */
function GlossPeek({
  word,
  reduce,
  styles,
  inLearn,
  onPlay,
  onAdd,
  onClose,
}: {
  word: Word | null;
  reduce: boolean;
  styles: ReturnType<typeof makeStyles>;
  inLearn: boolean;
  onPlay: () => Promise<boolean> | boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  // Keep the last word around while animating out so its content is drawn.
  const [shown, setShown] = useState<Word | null>(word);
  const anim = useRef(new Animated.Value(word ? 1 : 0)).current;

  useEffect(() => {
    if (word) setShown(word);
    const to = word ? 1 : 0;
    if (reduce) {
      anim.setValue(to);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: to,
      duration: 200,
      easing: to ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    });
    a.start(({ finished }) => {
      // Once fully closed, drop the content so it stops intercepting focus.
      if (finished && to === 0) setShown(null);
    });
    return () => a.stop();
  }, [word, reduce, anim]);

  if (!shown) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Animated.View
      style={[styles.peek, { opacity: anim, transform: [{ translateY }] }]}
      pointerEvents={word ? 'auto' : 'none'}
      accessibilityLabel="Word details"
    >
      <View style={styles.peekHead}>
        <View style={styles.peekWord}>
          <Hanzi text={shown.hanzi} size={font.hanziM} />
          <View style={{ marginTop: spacing(0.5) }}>
            <Pinyin numbered={shown.pinyinNumbered} size={18} />
          </View>
          <Body dim style={{ marginTop: spacing(0.5) }}>{shown.glossEn}</Body>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close word details"
          hitSlop={12}
          onPress={onClose}
        >
          <Caption>✕</Caption>
        </Pressable>
      </View>
      <View style={styles.peekActions}>
        <PlayButton size={22} play={onPlay} accessibilityLabel="Play word audio" />
        <Button
          label={inLearn ? 'In Learn ✓' : '＋ Add to Learn'}
          onPress={onAdd}
          style={{ flex: 1 }}
        />
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1 }, // transparent — ambient backdrop shows through
    card: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing(3),
    },
    hanziWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
    tokenWord: {
      color: c.text,
      fontSize: font.hanziM,
      fontWeight: '700',
      textDecorationLine: 'underline',
      textDecorationColor: c.primary,
    },
    tokenPlain: { color: c.textDim, fontSize: font.hanziM, fontWeight: '700' },
    overlay: {
      position: 'absolute',
      top: spacing(6),
      right: spacing(2),
      gap: spacing(1),
      alignItems: 'flex-end',
    },
    ringOverlay: { position: 'absolute', top: spacing(6), left: spacing(2) },
    goalBanner: {
      position: 'absolute',
      top: spacing(6),
      left: spacing(11),
      right: spacing(11),
      alignItems: 'center',
    },
    goalBannerInner: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.gold,
      paddingVertical: spacing(1),
      paddingHorizontal: spacing(1.5),
      ...elevation.card,
    },
    streakRibbon: { position: 'absolute', bottom: spacing(1), left: spacing(2), right: spacing(2) },
    // Inline gloss peek — anchored to the bottom, sentence stays visible above.
    peek: {
      position: 'absolute',
      left: spacing(2),
      right: spacing(2),
      bottom: spacing(4),
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderStrong,
      padding: spacing(2.5),
      ...elevation.modal,
    },
    peekHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    peekWord: { flex: 1 },
    peekActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing(2),
      gap: spacing(1.5),
    },
  });
