/** Draws a tone's pitch contour (react-native-svg) — the visual feedback that
 * teaches the shape of each Mandarin tone. Works on web and native. */
import React from 'react';
import Svg, { Line, Polyline } from 'react-native-svg';
import { useTheme } from '../../lib/appearance';

// Normalized pitch paths in a 100x60 box (y down). 1 high-flat, 2 rising,
// 3 dipping, 4 falling.
const PATHS: Record<number, string> = {
  1: '5,12 95,12',
  2: '5,50 95,10',
  3: '5,28 35,52 95,8',
  4: '5,8 95,52',
};

export function ToneContour({ tone, size = 100 }: { tone: number; size?: number }) {
  const { colors, toneColor } = useTheme();
  const h = size * 0.6;
  return (
    <Svg width={size} height={h} viewBox="0 0 100 60">
      <Line x1={0} y1={30} x2={100} y2={30} stroke={colors.border} strokeWidth={1} />
      <Polyline
        points={PATHS[tone] ?? PATHS[1]!}
        fill="none"
        stroke={toneColor(tone)}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
