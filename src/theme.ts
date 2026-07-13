/**
 * Design tokens for xuexi. The palette is now MODE-AWARE: `darkColors` and
 * `lightColors` share one `ThemeColors` shape, resolved live per render via
 * `useTheme()` (src/lib/appearance.ts). Non-color tokens (spacing, radius, type,
 * elevation) are mode-independent and stay static.
 *
 * Aesthetic — "Imperial Seal": a traditional Chinese surface. Warm rice-paper
 * grounds in light mode (a warm near-black at night), traditional cinnabar red
 * as the primary "seal" ink, and an antique gold accent used only at reward
 * moments. Sharp, carved-seal corners. Content hanzi stay legible in a serif
 * (Noto Serif SC); decorative hanzi wordmarks use brush calligraphy (Ma Shan
 * Zheng); English headings/numerals use Noto Serif SC; UI is Inter. The four
 * tone colors are the app's signature (colorblind-aware — they vary in
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
  bg: '#1C1C19', // warm near-black "night rice paper"
  bgElevated: '#2A2A28', // raised chrome (tab bar, sheets)
  surface: '#2A2A28',
  surfaceAlt: '#35332C',
  border: '#46433B',
  borderStrong: '#55524A',
  text: '#EBE3D0', // warm paper ink
  textDim: '#A39C8C',
  primary: '#E24A4A', // cinnabar red, brightened for a dark ground (AA as ink on bg)
  primaryDim: '#B22222',
  primarySoft: '#2E1E1C', // tinted fill behind primary content
  onPrimary: '#0A0A0A', // near-black ink on the bright cinnabar fill
  accent: '#E0B44A', // antique gold — reward / milestones only
  onAccent: '#241503', // dark ink on gold fills
  good: '#5FB87E',
  bad: '#E06B6B',
  gold: '#E0B44A',
  tone1: '#6FA8E0', // high & flat — lightened for AA on the dark ground
  tone2: '#5FB87E', // rising
  tone3: '#E0975A', // dip
  tone4: '#E06B6B', // falling
};

export const lightColors: ThemeColors = {
  bg: '#F4EEDF', // warm rice paper
  bgElevated: '#FBF7EC',
  surface: '#FBF7EC',
  surfaceAlt: '#EBE3D0',
  border: '#D8CEB9',
  borderStrong: '#C3B79B',
  text: '#2A2A28', // near-black ink
  textDim: '#5E5648', // darkened so it's AA body on the (darker) rice paper
  primary: '#B22222', // cinnabar red — AA as ink on paper
  primaryDim: '#8B0000',
  primarySoft: '#EFDCD5',
  onPrimary: '#F4EEDF', // paper ink on the cinnabar fill
  accent: '#C68A3E', // antique gold/bronze — reward moments
  onAccent: '#140B02', // near-black ink — passes AA on gold/bronze fills

  good: '#276749',
  bad: '#991B1B',
  gold: '#A9741E',
  tone1: '#2F67A8',
  tone2: '#276749',
  tone3: '#9A3412',
  tone4: '#991B1B',
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

// Sharp, carved-seal corners — the imperial look. `pill` stays for genuinely
// circular elements (goal ring, avatar, play-button circle).
export const radius = { sm: 2, md: 4, lg: 6, xl: 10, pill: 999 } as const;

/**
 * Loaded font family names — these MUST match the keys registered by useFonts()
 * in app/_layout.tsx. RN ignores numeric fontWeight for custom families, so the
 * weight is baked into the family name and applied via fontFamily. Roles:
 * `sans` (Inter, UI), `serif` (Noto Serif SC — content hanzi AND English
 * headings), and `calligraphy` (Ma Shan Zheng — decorative hanzi WORDMARKS and
 * BIG NUMERALS ≥30px, per spec §3.3 "scores and big numbers"; its Latin/digit
 * glyphs are brush-drawn but rough at small sizes, so it never carries body
 * text, labels, or content hanzi).
 */
export const fonts = {
  sans: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  sansExtrabold: 'Inter_800ExtraBold',
  // Noto Serif SC (single ~15 MB Medium weight) carries hanzi, headings & numerals.
  serif: 'NotoSerifSC_500Medium',
  display: 'NotoSerifSC_500Medium',
  displayBold: 'NotoSerifSC_500Medium',
  // Brush calligraphy — hanzi wordmarks only (see note above).
  calligraphy: 'MaShanZheng_400Regular',
} as const;

/** Type ramp: role → size / family / line-height. Use via <Text> variants in ui.tsx. */
export const type = {
  display: { fontSize: 40, fontWeight: '900', fontFamily: fonts.display, lineHeight: 46 },
  h1: { fontSize: 26, fontWeight: '800', fontFamily: fonts.display, lineHeight: 34 },
  h2: { fontSize: 20, fontWeight: '800', fontFamily: fonts.display, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '500', fontFamily: fonts.sans, lineHeight: 23 },
  label: { fontSize: 15, fontWeight: '700', fontFamily: fonts.sansBold, lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '600', fontFamily: fonts.sansSemibold, lineHeight: 18 },
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
