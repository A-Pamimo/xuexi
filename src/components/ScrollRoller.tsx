/**
 * Hanging-scroll roller — the wooden bar that frames the app top and bottom,
 * turning the whole surface into a mounted scroll painting (the imperial-seal
 * frame). Purely decorative: never intercepts touches and is hidden from
 * assistive tech. The wood is an SVG gradient (cylinder shading, darker on the
 * edge facing away from the content) with solid darker end caps.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../lib/appearance';

const HEIGHT = 14;
const CAP_WIDTH = 10;

const WOOD = {
  light: { edge: '#8B5A2B', face: '#CD853F', cap: '#A0522D' },
  dark: { edge: '#2B1B17', face: '#5D4037', cap: '#241713' },
} as const;

export function ScrollRoller({ edge }: { edge: 'top' | 'bottom' }) {
  const { scheme } = useTheme();
  const wood = WOOD[scheme];
  // Dark side of the cylinder faces outward: up on the top roller, down on the
  // bottom one.
  const stops = edge === 'top' ? [wood.edge, wood.face] : [wood.face, wood.edge];
  const gradId = `roller-wood-${edge}-${scheme}`;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.bar,
        edge === 'top' ? styles.barTop : styles.barBottom,
      ]}
    >
      <Svg width="100%" height={HEIGHT}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset="1" stopColor={stops[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={HEIGHT} fill={`url(#${gradId})`} />
      </Svg>
      <View style={[styles.cap, styles.capLeft, { backgroundColor: wood.cap }]} />
      <View style={[styles.cap, styles.capRight, { backgroundColor: wood.cap }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: HEIGHT, width: '100%' },
  barTop: { borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.3)' },
  barBottom: { borderTopWidth: 2, borderTopColor: 'rgba(0,0,0,0.3)' },
  cap: { position: 'absolute', top: 0, bottom: 0, width: CAP_WIDTH },
  capLeft: { left: 0, borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.4)' },
  capRight: { right: 0, borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.4)' },
});
