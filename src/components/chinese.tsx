/** Hanzi + pinyin rendering. Pinyin shows tone MARKS, colored by tone number. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { syllableToMarks, toneNumbersOf } from '../lib/pinyin';
import { colors, toneColor } from '../theme';

export function Hanzi({ text, size = 48 }: { text: string; size?: number }) {
  return <Text style={{ color: colors.text, fontSize: size, fontWeight: '700' }}>{text}</Text>;
}

/** Render numbered pinyin ("ni3 hao3") as tone-marked, tone-colored syllables. */
export function Pinyin({
  numbered,
  size = 18,
  dim,
}: {
  numbered: string;
  size?: number;
  dim?: boolean;
}) {
  const syllables = numbered.split(/\s+/).filter(Boolean);
  const tones = toneNumbersOf(numbered);
  return (
    <View style={styles.row}>
      {syllables.map((syl, i) => (
        <Text
          key={i}
          style={{
            fontSize: size,
            fontWeight: '600',
            color: dim ? colors.textDim : toneColor(tones[i] ?? 5),
          }}
        >
          {syllableToMarks(syl)}
          {i < syllables.length - 1 ? ' ' : ''}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
});
