/** Hanzi + pinyin rendering. Pinyin shows tone MARKS, colored by tone number. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { syllableToMarks, toneNumbersOf } from '../lib/pinyin';
import { useScramble } from './ScrambleText';
import { useTheme } from '../lib/appearance';

export function Hanzi({
  text,
  size = 48,
  reveal,
}: {
  text: string;
  size?: number;
  /** Opt-in: scramble-resolve the glyphs on mount (default off). */
  reveal?: boolean;
}) {
  const { colors } = useTheme();
  const disp = useScramble(text, { kind: 'hanzi', enabled: !!reveal });
  return <Text style={{ color: colors.text, fontSize: size, fontWeight: '700' }}>{disp}</Text>;
}

/**
 * One tone-marked, tone-colored syllable — its own component so useScramble is
 * called unconditionally (Rules of Hooks) rather than inside a map callback.
 */
function Syllable({
  marked,
  color,
  size,
  reveal,
  trailingSpace,
}: {
  marked: string;
  color: string;
  size: number;
  reveal: boolean;
  trailingSpace: boolean;
}) {
  const disp = useScramble(marked, { kind: 'pinyin', enabled: reveal });
  return (
    <Text style={{ fontSize: size, fontWeight: '600', color }}>
      {disp}
      {trailingSpace ? ' ' : ''}
    </Text>
  );
}

/** Render numbered pinyin ("ni3 hao3") as tone-marked, tone-colored syllables. */
export function Pinyin({
  numbered,
  size = 18,
  dim,
  reveal,
}: {
  numbered: string;
  size?: number;
  dim?: boolean;
  /** Opt-in: scramble-resolve each syllable on mount (default off). */
  reveal?: boolean;
}) {
  const { colors, toneColor } = useTheme();
  const syllables = numbered.split(/\s+/).filter(Boolean);
  const tones = toneNumbersOf(numbered);
  return (
    <View style={styles.row}>
      {syllables.map((syl, i) => (
        <Syllable
          key={i}
          marked={syllableToMarks(syl)}
          color={dim ? colors.textDim : toneColor(tones[i] ?? 5)}
          size={size}
          reveal={!!reveal}
          trailingSpace={i < syllables.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
});
