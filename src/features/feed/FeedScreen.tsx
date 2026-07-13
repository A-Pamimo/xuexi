/**
 * Swipe feed (M4): full-screen vertical cards, each an i+1 sentence with native
 * audio (autoplay on focus), tappable words (tap = gloss + add-to-SRS), and a
 * pinyin toggle. Feed seconds count toward input hours + streak integrity.
 */
import { useFocusEffect } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Settings2 } from 'lucide-react-native';
import { Body, Button, Caption, H1, Pill, PlayButton, Screen } from '../../components/ui';
import { Hanzi, Pinyin } from '../../components/chinese';
import { DiamondSeal } from '../../components/DiamondSeal';
import { StampIcon } from '../../components/StampIcon';
import { Ticker } from '../../components/Ticker';
import { DailyGoalRing } from '../../components/DailyGoalRing';
import { SettingsSheet } from '../../components/SettingsSheet';
import { isAudioUnlocked, stopAudio, unlockAudio as unlockAudioGlobal } from '../../lib/audio';
import * as juice from '../../lib/juice';
import { useReducedMotion } from '../../lib/motion';
import type { Sentence, Word } from '../../lib/types';
import { useApp } from '../../stores/appStore';
import { elevation, font, fonts, radius, spacing } from '../../theme';
import type { ThemeColors } from '../../theme';
import { useTheme, useThemedStyles } from '../../lib/appearance';
import { selectFeed } from './selection';
import { playSentence, playWord } from '../shared/play';

const NATIVE_DRIVER = Platform.OS !== 'web';

interface Token {
  text: string;
  word: Word | null;
}

/**
 * The feed session is finite on purpose: after the last sentence the list ends
 * on a ceremonial "done for today" seal card (no button, no continue) — the
 * calm counterpart of an infinite feed. One sentinel item carries it.
 */
const DONE_CARD = { kind: 'done' } as const;
type FeedItem = Sentence | typeof DONE_CARD;
const isDoneCard = (item: FeedItem): item is typeof DONE_CARD => 'kind' in item;

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
  const showPinyin = useApp((s) => s.showPinyin);
  const setShowPinyin = useApp((s) => s.setShowPinyin);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduce = useReducedMotion();

  const [selected, setSelected] = useState<Word | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    // Pass the full word list so the feed tops up with generated i+1 sentences
    // when the curated pool thins — the "never run dry" guarantee (generate.ts).
    return selectFeed({
      sentences: store.sentences,
      knownWordIds: known,
      dueWordIds: due,
      count: 40,
      words: store.words,
    });
  }, [store, knownWordIds]);

  // Silence any in-flight sentence when leaving the feed — otherwise it plays
  // on into the next tab. Focus effect, not unmount: tab screens stay mounted,
  // so only the blur callback actually fires on a tab switch.
  useFocusEffect(useCallback(() => () => void stopAudio(), []));

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
    const first = viewableItems[0];
    if (first?.index != null) setCurrentIndex(first.index);
    const item = first?.item as FeedItem | undefined;
    if (item && !isDoneCard(item) && isAudioUnlocked()) void playSentence(store, item);
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

  // The day's sentences plus the closing seal card.
  const items = useMemo<FeedItem[]>(() => [...feed, DONE_CARD], [feed]);

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
      <FlatList
        data={items}
        keyExtractor={(s) => (isDoneCard(s) ? 'done' : String(s.id))}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        // Every card is exactly one viewport tall. Without this, virtualization
        // ESTIMATES unrendered cell offsets from a running average, so deep in
        // the list the scroll offset drifts off the card grid — snap intervals
        // land mid-card and any offset→index math is wrong.
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        // Viewability callbacks don't fire on react-native-web, so the progress
        // ticks would freeze there; deriving the index from the scroll offset
        // works on every platform (native keeps viewability for autoplay).
        onScroll={(e) => {
          const i = Math.min(
            Math.max(Math.round(e.nativeEvent.contentOffset.y / height), 0),
            items.length - 1,
          );
          setCurrentIndex(i);
        }}
        scrollEventThrottle={32}
        renderItem={({ item }) => (
          isDoneCard(item) ? (
            <DoneForToday height={height} />
          ) : (
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
              {audioLocked ? 'tap the speaker seal to enable audio' : 'tap underlined words · swipe up ↑'}
            </Caption>
          </View>
          )
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
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          onPress={() => { juice.tap(); setSettingsOpen(true); }}
        >
          <StampIcon icon={Settings2} size={16} color={colors.textDim} />
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: showPinyin }}
          accessibilityLabel="Toggle pinyin"
          onPress={() => { unlockAudio(); setShowPinyin(!showPinyin); }}
        >
          <Pill tone={showPinyin ? 'active' : 'default'}>
            <Body style={{ fontWeight: '700', fontSize: 14 }}>Pinyin {showPinyin ? 'on' : 'off'}</Body>
          </Pill>
        </Pressable>
        <Pill>
          <Caption>due {dueCount()}</Caption>
        </Pill>
      </View>

      {/* Paper-ink progress dots — calm, bounded sense of place in the feed. */}
      <View style={[styles.progressDots, { top: insets.top + spacing(1.5) }]} pointerEvents="none">
        <FeedProgress total={feed.length} index={currentIndex} colors={colors} />
      </View>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

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
 * The end of the day's scroll: a ceremonial diamond seal pressed under the last
 * sentence. Deliberately has no button and nothing to tap — the session is
 * over, and the card says so in the app's quiet voice.
 */
function DoneForToday({ height }: { height: number }) {
  return (
    <View style={{ height, justifyContent: 'center', alignItems: 'center', padding: spacing(3) }}>
      <DiamondSeal icon={Check} size={72} />
      <H1 style={{ marginTop: spacing(3), textAlign: 'center' }}>You're done for today.</H1>
      <Body
        dim
        style={{ marginTop: spacing(1), textAlign: 'center', fontStyle: 'italic', fontFamily: fonts.serif }}
      >
        Rest your mind. The ink is dry.
      </Body>
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

/**
 * Bounded progress markers, carved-seal style: sharp bordered segments. The feed
 * tops up endlessly, so instead of one dot per (up to 40) sentence we render at
 * most MAX segments representing position proportionally: segments before the
 * marker are inked solid, the marker holds a wash of ink, the rest are empty
 * outlines waiting for the brush.
 */
function FeedProgress({ total, index, colors }: { total: number; index: number; colors: ThemeColors }) {
  const MAX = 7;
  const count = Math.min(Math.max(total, 1), MAX);
  const activeExact = total <= 1 ? 0 : (index / (total - 1)) * (count - 1);
  // Past the last sentence (the done-for-today seal card) every segment is
  // inked solid — the day's scroll is complete.
  const active = index >= total ? count : Math.round(activeExact);
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 7,
            width: 26,
            borderRadius: 1,
            borderWidth: 1,
            backgroundColor:
              i < active ? colors.primary : i === active ? `${colors.primary}33` : 'transparent',
            borderColor:
              i < active ? colors.primary : i === active ? `${colors.primary}88` : colors.border,
          }}
        />
      ))}
    </>
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
      fontFamily: fonts.serif,
      textDecorationLine: 'underline',
      textDecorationColor: c.primary,
    },
    tokenPlain: { color: c.textDim, fontSize: font.hanziM, fontFamily: fonts.serif },
    overlay: {
      position: 'absolute',
      top: spacing(6),
      right: spacing(2),
      gap: spacing(1),
      alignItems: 'flex-end',
    },
    gear: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    progressDots: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing(0.75),
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
