/**
 * Rotated diamond seal — the "chop" pressed at completion moments ("the ink is
 * dry"). A square rotated 45° with a double-line border and a counter-rotated
 * icon inside, echoing the double rule of a carved seal. On web it picks up the
 * ink-bleed SVG filter (registered by BrushFilter); native renders clean lines.
 */
import React from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../lib/appearance';
import { radius } from '../theme';

const IS_WEB = Platform.OS === 'web';
// A rotated square's diagonal overhangs its layout box by (√2−1)/2 per side.
const OVERHANG = 1.45;

export function DiamondSeal({
  icon: Icon,
  size = 88,
  color,
  style,
}: {
  icon: LucideIcon;
  /** Side length of the (pre-rotation) square. */
  size?: number;
  /** Border + glyph color; defaults to the cinnabar primary. */
  color?: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const c = color ?? colors.primary;
  const box = Math.ceil(size * OVERHANG);
  return (
    <View style={[{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View
        style={{
          width: size,
          height: size,
          transform: [{ rotate: '45deg' }],
          borderWidth: 2.5,
          borderColor: c,
          borderRadius: radius.sm,
          padding: 4,
          ...(IS_WEB ? ({ filter: 'url(#ink-bleed)' } as unknown as ViewStyle) : null),
        }}
      >
        <View
          style={{
            flex: 1,
            borderWidth: 1.5,
            borderColor: c,
            borderRadius: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ transform: [{ rotate: '-45deg' }] }}>
            <Icon size={Math.round(size * 0.42)} color={c} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </View>
  );
}
