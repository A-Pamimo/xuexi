/**
 * Imperial "seal stamp" icon treatment. An icon sits inside a carved cinnabar
 * border, rotated a touch like a hand-pressed seal. On WEB it also gets a subtle
 * SVG ink-bleed distortion (feTurbulence) via `BrushFilter`; native renders the
 * clean bordered stamp (RN can't apply CSS url() filters). Also exports the
 * rice-paper texture data-URI used as the web page background.
 */
import React, { useEffect } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../lib/appearance';
import { radius, spacing } from '../theme';

const IS_WEB = Platform.OS === 'web';

export function StampIcon({
  icon: Icon,
  size = 18,
  color,
  box = size + 14,
  style,
}: {
  icon: LucideIcon;
  size?: number;
  /** Border + glyph color; defaults to the cinnabar primary. */
  color?: string;
  /** Outer box size. */
  box?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const c = color ?? colors.primary;
  return (
    <View
      style={[
        {
          width: box,
          height: box,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: c,
          // Slightly uneven corners → a hand-carved seal, not a sterile box.
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.sm,
          borderBottomRightRadius: radius.lg,
          borderBottomLeftRadius: radius.md,
          transform: [{ rotate: '-2deg' }],
          padding: spacing(0.5),
          // Web-only ink-bleed distortion (no-op / ignored on native).
          ...(IS_WEB ? ({ filter: 'url(#ink-bleed)' } as unknown as ViewStyle) : null),
        },
        style,
      ]}
    >
      <Icon size={size} color={c} strokeWidth={2.5} />
    </View>
  );
}

/**
 * Web-only SVG filter defs (brush-stroke + seal ink-bleed). Injected once into
 * the document so `filter: url(#ink-bleed)` resolves. Renders nothing on native.
 */
export function BrushFilter(): React.ReactElement | null {
  useEffect(() => {
    if (!IS_WEB || typeof document === 'undefined') return;
    if (document.getElementById('xuexi-brush-filters')) return;
    const holder = document.createElement('div');
    holder.id = 'xuexi-brush-filters';
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    holder.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="brush-stroke" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="ink-bleed" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="4" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
          <feGaussianBlur stdDeviation="0.2" in="displaced"/>
        </filter>
      </svg>`;
    document.body.appendChild(holder);
  }, []);
  return null;
}

/** Rice-paper grain as a CSS `url("data:...")` background value. */
export function PAPER_TEXTURE_URI(dark: boolean): string {
  const opacity = dark ? 0.04 : 0.08;
  const svg =
    `<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23n)' opacity='${opacity}'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`;
}
