/**
 * Design tokens for xuexi. The palette is now MODE-AWARE: `darkColors` and
 * `lightColors` share one `ThemeColors` shape, resolved live per render via
 * `useTheme()` (src/lib/appearance.ts). Non-color tokens (spacing, radius, type,
 * elevation) are mode-independent and stay static.
 *
 * Aesthetic — "Calm Focus, Living Ink": reading-first, low-chroma neutral
 * surfaces so hanzi/pinyin carry the color; one calm indigo primary; a warm
 * amber accent used only at reward moments; the four tone colors are preserved
 * across both modes as the app's signature (colorblind-aware — they vary in
 * lightness, not just hue) and are AA-legible in BOTH modes.
 *
 * Contrast rule: light-mode tone/semantic colors are genuinely DARKENED (not
 * inverted neutrals) — the dark tone hexes fail AA as ink on white. A Jest test
 * (theme.contrast.test.ts) asserts AA for the documented pairings in BOTH
 * palettes, so a light-mode regression fails CI rather than shipping.
 */

/** The full color token set — identical keys across light and dark. */
export interface ThemeColors {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textDim: string;
  primary: string;
  primaryDim: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  good: string;
  bad: string;
  gold: string;
  tone1: string;
  tone2: string;
  tone3: string;
  tone4: string;
}

export const darkColors: ThemeColors = {
  bg: '#0E1016',
  bgElevated: '#151824', // raised chrome (tab bar, sheets)
  surface: '#1A1E2B',
  surfaceAlt: '#232838',
  border: '#2C3346',
  borderStrong: '#3C445C',
  text: '#F2F4FA',
  textDim: '#9AA3B8',
  primary: '#7C8CFF', // calm indigo, brightened for a dark ground
  primaryDim: '#5B67CC',
  primarySoft: '#1D2238', // tinted fill behind primary content
  onPrimary: '#0B0E18', // dark ink on the light-indigo fill
  accent: '#FFB454', // warm amber — reward / milestones only
  onAccent: '#241503', // dark ink on amber/gold fills
  good: '#3DDC97',
  bad: '#FF6B6B',
  gold: '#FFD24A',
  tone1: '#4FB8F5', // high & flat
  tone2: '#3CC96A', // rising
  tone3: '#FFA83D', // dip
  tone4: '#FF5C7A', // falling
};

export const lightColors: ThemeColors = {
  bg: '#F6F7FB', // soft off-white, faintly cool — lower glare than pure white
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F6',
  border: '#DCE0EA',
  borderStrong: '#C2C8D6',
  text: '#171A21',
  textDim: '#5A6072', // deliberately not too pale — AA body on bg
  primary: '#4B54D6', // deeper indigo so it's AA as ink on light bg
  primaryDim: '#3A42B0',
  primarySoft: '#E7E9FB',
  onPrimary: '#FFFFFF',
  accent: '#C4740A', // amber darkened for AA as ink on light
  onAccent: '#241503', // dark ink — white on mid-amber fails AA (3.6:1); dark ink ~4.9:1

  good: '#0E9E62',
  bad: '#D83A3A',
  gold: '#B7791F',
  tone1: '#1C7FD6',
  tone2: '#1E9E52',
  tone3: '#C4740A',
  tone4: '#D8365C',
};

/** Tone color for a palette (1-based tone number). */
export const toneColorOf = (c: ThemeColors, t: number): string =>
  [c.tone1, c.tone2, c.tone3, c.tone4][t - 1] ?? c.textDim;

/** Relative luminance of a #rrggbb color (WCAG). */
export function luminance(hex: string): number {
  const c = (hex.replace('#', '').match(/../g) ?? ['0', '0', '0']).map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
}

/** WCAG contrast ratio between two #rrggbb colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick the palette's light or dark ink for AA-legible text on an arbitrary fill. */
export const readableInk = (c: ThemeColors, bg: string): string =>
  luminance(bg) > 0.32 ? c.onAccent : c.onPrimary;

/** Human tone names — shared so labels/a11y stay consistent app-wide. */
export const TONE_NAMES = ['high & flat', 'rising', 'dip', 'falling'] as const;

export const spacing = (n: number): number => n * 8;

export const radius = { sm: 8, md: 14, lg: 22, xl: 28, pill: 999 } as const;

/** Type ramp: role → size / weight / line-height. Use via <Text> variants in ui.tsx. */
export const type = {
  display: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  h1: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '500', lineHeight: 23 },
  label: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
} as const;

/** Hanzi display sizes (kept separate — large glyphs need their own ramp). */
export const font = {
  hanziXL: 76,
  hanziL: 48,
  hanziM: 34,
  title: 26,
  body: 16,
  small: 13,
} as const;

/**
 * Flat elevation: a soft, tight shadow (never a colored glow) plus surface
 * layering. Works on native (shadow props / elevation) and web (box-shadow).
 */
export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
} as const;

/** Minimum accessible touch target (WCAG 2.5.5 / Apple HIG). */
export const HIT = 44;
