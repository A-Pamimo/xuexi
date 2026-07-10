/**
 * Contrast guardrail: every documented text/fill pairing must meet WCAG AA in
 * BOTH the light and dark palettes. This is the tripwire for a light-mode
 * regression (the dark tone/semantic hexes fail AA as ink on white, which is why
 * the light palette has its own darkened values) — a bad palette edit fails CI
 * here rather than shipping an illegible screen.
 *
 * AA thresholds: 4.5 for body text, 3.0 for large text and UI/graphical objects
 * (WCAG 1.4.3 / 1.4.11).
 */
import { contrastRatio, darkColors, lightColors, type ThemeColors } from './theme';

const AA_BODY = 4.5;
const AA_LARGE = 3.0;

const palettes: [string, ThemeColors][] = [
  ['dark', darkColors],
  ['light', lightColors],
];

describe.each(palettes)('%s palette contrast', (_name, c) => {
  // Body text must be fully legible on the surfaces it renders on.
  test.each([
    ['text on bg', c.text, c.bg],
    ['text on surface', c.text, c.surface],
    ['textDim on bg', c.textDim, c.bg],
    ['textDim on surface', c.textDim, c.surface],
    // Ink auto-picked for primary/accent fills (buttons, badges).
    ['onPrimary on primary', c.onPrimary, c.primary],
    ['onAccent on accent', c.onAccent, c.accent],
    ['onAccent on gold', c.onAccent, c.gold],
  ])('%s meets AA body (4.5)', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_BODY);
  });

  // Semantic + tone colors are used as borders, large glyphs and bold labels —
  // AA large / UI (3.0) against both the base and card surfaces.
  test.each([
    ['good on bg', c.good, c.bg],
    ['bad on bg', c.bad, c.bg],
    ['gold on bg', c.gold, c.bg],
    ['primary on bg', c.primary, c.bg],
    ['tone1 on surface', c.tone1, c.surface],
    ['tone2 on surface', c.tone2, c.surface],
    ['tone3 on surface', c.tone3, c.surface],
    ['tone4 on surface', c.tone4, c.surface],
    ['tone1 on bg', c.tone1, c.bg],
    ['tone2 on bg', c.tone2, c.bg],
    ['tone3 on bg', c.tone3, c.bg],
    ['tone4 on bg', c.tone4, c.bg],
  ])('%s meets AA large/UI (3.0)', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});
