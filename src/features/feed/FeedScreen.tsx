/**
 * Swipe feed (M4): full-screen vertical cards, each an i+1 sentence with native
 * audio (autoplay on focus), tappable words (tap = gloss + add-to-SRS), and a
 * pinyin toggle. Feed seconds count toward input hours + streak integrity.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import * as juice from '../../lib/juice';
import type { Sentence, Word } from '../../lib/types';
import { useApp } from '../../stores/appStore';
import { colors, elevation, font, radius, spacing } from '../../theme';
import { selectFeed } from './selection';
import { playSentence, playWord } from '../shared/play';

interface Token {
  text: string;
  word: Word | null;
}

export function FeedScreen() {
  const store = useApp((s) => s.store)!;
  const knownWordIds = useApp((s) => s.knownWordIds);
  const dueCount = useApp((s) => s.dueCount);
  const addFeedSeconds = useApp((s) => s.addFeedSeconds);
  const addWord = useApp((s) => s.addWord);
  const noteGloss = useApp((s) => s.noteGloss);
  const { height } = useWindowDimensions();

  const [showPinyin, setShowPinyin] = useState(true);
  const [selected, setSelected] = useState<Word | null>(null);

  // Web blocks autoplay until a user gesture; don't fire scroll-to-play until then
  // (otherwise it silently no-ops). Native is unlocked from the start.
  const audioUnlocked = useRef(Platform.OS !== 'web');
  const [audioLocked, setAudioLocked] = useState(Platform.OS === 'web');
  const unlockAudio = useCallback(() => {
    if (!audioUnlocked.current) {
      audioUnlocked.current = true;
      setAudioLocked(false);
    }
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
    if (first && audioUnlocked.current) void playSentence(store, first);
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
                    accessibilityLabel={`${tok.text}, tap for meaning and to add to reviews`}
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

      {selected ? (
        <Pressable
          style={styles.modalBg}
          accessibilityViewIsModal
          accessibilityLabel="Word details"
          onPress={() => setSelected(null)}
        >
          <Pressable style={styles.modal} onPress={() => {}}>
            <Hanzi text={selected.hanzi} size={font.hanziL} />
            <View style={{ marginTop: spacing(1) }}>
              <Pinyin numbered={selected.pinyinNumbered} size={22} />
            </View>
            <Body dim style={{ marginTop: spacing(1.5), textAlign: 'center' }}>{selected.glossEn}</Body>
            <View style={styles.modalActions}>
              <PlayButton size={26} play={() => playWord(store, selected.id)} accessibilityLabel="Play word audio" />
              <Button
                label={store.getCard(selected.id) ? 'In reviews ✓' : '＋ Add to reviews'}
                onPress={() => {
                  if (addWord(selected.id)) juice.correct();
                  setSelected(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  hanziWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  tokenWord: {
    color: colors.text,
    fontSize: font.hanziM,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
  },
  tokenPlain: { color: colors.textDim, fontSize: font.hanziM, fontWeight: '700' },
  overlay: {
    position: 'absolute',
    top: spacing(6),
    right: spacing(2),
    gap: spacing(1),
    alignItems: 'flex-end',
  },
  modalBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing(3),
    alignItems: 'center',
    minWidth: 300,
    ...elevation.modal,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing(2.5),
    gap: spacing(1.5),
    alignSelf: 'stretch',
  },
});
