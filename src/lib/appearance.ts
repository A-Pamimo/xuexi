/**
 * Appearance / theming layer — the live source of the OS color scheme plus the
 * `useTheme()` resolver every component reads colors from.
 *
 * Mirrors src/lib/motion.ts exactly: web reads matchMedia, native reads the
 * Appearance API, and both subscribe to changes so a live OS toggle re-renders.
 * Leaf-ish module: imports theme tokens (../theme) and the store's themeMode.
 * The `ThemeMode` type lives in ./types so appStore can reference it without a
 * runtime import of this module (no cycle).
 */
import { useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import {
  darkColors,
  lightColors,
  readableInk,
  toneColorOf,
  type ThemeColors,
} from '../theme';
import { useApp } from '../stores/appStore';

export type Scheme = 'light' | 'dark';

const COLOR_QUERY = '(prefers-color-scheme: dark)';

function webInitialDark(): boolean {
  // SSR / static web export: window may be undefined at first render.
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia(COLOR_QUERY).matches;
  } catch {
    return false;
  }
}

/** Read the current OS scheme synchronously — for first paint before hooks run. */
export function initialScheme(): Scheme {
  if (Platform.OS === 'web') return webInitialDark() ? 'dark' : 'light';
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

/**
 * Live OS/browser color scheme ('light' | 'dark'), subscribed to changes. Lazy
 * initializer => correct on first paint (no flash of the wrong palette on web).
 */
export function useColorScheme(): Scheme {
  const [scheme, setScheme] = useState<Scheme>(initialScheme);

  useEffect(() => {
    let live = true;

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mql = window.matchMedia(COLOR_QUERY);
      setScheme(mql.matches ? 'dark' : 'light');
      const onChange = (e: MediaQueryListEvent) => {
        if (live) setScheme(e.matches ? 'dark' : 'light');
      };
      if (mql.addEventListener) mql.addEventListener('change', onChange);
      else
        (mql as unknown as { addListener(cb: (e: MediaQueryListEvent) => void): void }).addListener(
          onChange,
        );
      return () => {
        live = false;
        if (mql.removeEventListener) mql.removeEventListener('change', onChange);
        else
          (
            mql as unknown as { removeListener(cb: (e: MediaQueryListEvent) => void): void }
          ).removeListener(onChange);
      };
    }

    // native
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (live) setScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  return scheme;
}

/** The resolved, palette-bound theme every component consumes. */
export interface Theme {
  scheme: Scheme;
  colors: ThemeColors;
  /** Tone color (1-based) bound to the active palette. */
  toneColor: (t: number) => string;
  /** AA-legible ink for an arbitrary fill, bound to the active palette. */
  readableOn: (bg: string) => string;
}

/**
 * Resolve the active theme from the user's saved mode preference (appStore) and
 * the live OS scheme. Memoized by `scheme` so consumers don't re-render on
 * unrelated store mutations.
 */
export function useTheme(): Theme {
  const mode = useApp((s) => s.themeMode);
  const system = useColorScheme();
  const scheme: Scheme = mode === 'system' ? system : mode;
  return useMemo<Theme>(() => {
    const c = scheme === 'dark' ? darkColors : lightColors;
    return {
      scheme,
      colors: c,
      toneColor: (t: number) => toneColorOf(c, t),
      readableOn: (bg: string) => readableInk(c, bg),
    };
  }, [scheme]);
}

/**
 * Build a palette-dependent StyleSheet, rebuilt only when the scheme flips
 * (there are only two). `factory` must be module-level (stable identity) — it is
 * intentionally excluded from the memo deps; `scheme` is the only input.
 */
export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
  const { scheme, colors } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(colors), [scheme]);
}
