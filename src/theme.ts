/** Design tokens for xuexi's dark, high-contrast "dopamine" aesthetic. */
export const colors = {
  bg: '#0B0B12',
  surface: '#16161F',
  surfaceAlt: '#1F1F2B',
  border: '#2A2A38',
  text: '#F5F5FA',
  textDim: '#9A9AB0',
  primary: '#7C5CFF', // violet
  primaryDim: '#5B44BF',
  accent: '#FF4D8D', // hot pink
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

export const spacing = (n: number): number => n * 8;

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const font = {
  hanziXL: 72,
  hanziL: 48,
  hanziM: 34,
  title: 26,
  body: 16,
  small: 13,
} as const;
