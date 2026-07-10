/**
 * Daily-goal progress ring — a circular track + progress arc for the day's XP.
 * Draws with react-native-svg (web + native) in theme colors: `primary` while
 * in progress, `gold` once the goal is met. Center reads `into/goal`, or a ✓
 * when met.
 *
 * The arc fills from 0 → `ratio` on mount via requestAnimationFrame, mirroring
 * the Odometer count-up in StatsScreen. When useReducedMotion() is true it skips
 * the animation and commits the final frame immediately (no flash of an empty
 * ring). Self-contained: imports only theme / appearance / motion.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../lib/appearance';
import { useReducedMotion } from '../lib/motion';
import { spacing } from '../theme';

export interface DailyGoalRingProps {
  ratio: number;
  into: number;
  goal: number;
  met: boolean;
  size?: number;
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

export function DailyGoalRing({ ratio, into, goal, met, size = 120 }: DailyGoalRingProps) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const target = clamp01(ratio);

  // Reduced motion: start at the final fraction (no first-frame flash of 0).
  const [fill, setFill] = useState(() => (reduce ? target : 0));
  useEffect(() => {
    if (reduce) {
      setFill(target);
      return;
    }
    let raf = 0;
    const step = () => {
      setFill((v) => {
        if (v >= target) return target;
        const next = v + Math.max(0.02, (target - v) / 8);
        if (next >= target) return target;
        raf = requestAnimationFrame(step);
        return next;
      });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);

  const stroke = Math.max(6, size * 0.09);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arc = colors.gold; // reserved once met
  const progressColor = met ? arc : colors.primary;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={colors.surfaceAlt}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress arc — rotated to start at 12 o'clock, filling clockwise. */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={progressColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fill)}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Center label: ✓ when met, otherwise into/goal. */}
        <SvgText
          x={cx}
          y={cy}
          fill={met ? arc : colors.text}
          fontSize={met ? size * 0.34 : size * 0.2}
          fontWeight="800"
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {met ? '✓' : `${into}/${goal}`}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing(1) },
});
