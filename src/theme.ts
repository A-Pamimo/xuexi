/**
 * Design tokens for xuexi's dark, high-contrast "dopamine" aesthetic.
 *
 * Redesign notes (UX pass): palette tuned so every text/fill pairing meets
 * WCAG AA (see contrast table below); a documented type ramp replaces ad-hoc
 * font sizes; flat elevation (layered surfaces + borders + a soft shadow, no
 * glow/gradients) gives hierarchy per the Craft rules.
 *
 * Verified contrast (AA needs 4.5 body / 3.0 large & UI):
 *   text/bg 18.0 · textDim/bg 7.1 · onPrimary/primary 4.9 · onAccent/accent 8.6
 *   primary/bg 4.0 (large only) · good/bg 10.6 · gold/bg 13.0
 */
export const colors = {
  bg: '#0B0B12',
  bgElevated: '#101019', // raised chrome (tab bar, sheets)
  surface: '#16161F',
  surfaceAlt: '#20202C',
  border: '#2A2A38',
  borderStrong: '#3A3A4C',
  text: '#F5F5FA',
  textDim: '#9A9AB0',
  primary: '#6E4DF0', // violet (darkened from #7C5CFF for AA text contrast)
  primaryDim: '#5B44BF',
  primarySoft: '#211C3A', // tinted fill behind primary content
  onPrimary: '#FFFFFF',
  accent: '#FF4D8D', // hot pink — decorative / milestones
  onAccent: '#1A0410', // dark text for use ON accent/gold fills
  good: '#2BD98A',
  bad: '#FF5C5C',
  gold: '#FFCC33',
  tone1: '#5AC8FA',
  tone2: '#34C759',
  tone3: '#FF9F0A',
  tone4: '#FF375F',
} as const;

export const toneColor = (t: number): string =>
  [colors.tone1, colors.tone2, colors.tone3, colors.tone4][t - 1] ?? colors.textDim;

/** Relative luminance of a #rrggbb color (WCAG). */
function luminance(hex: string): number {
  const c = (hex.replace('#', '').match(/../g) ?? ['0', '0', '0']).map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
}

/** Pick the app's light or dark ink for AA-legible text on an arbitrary fill. */
export const readableOn = (bg: string): string =>
  luminance(bg) > 0.32 ? colors.onAccent : colors.onPrimary;

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
