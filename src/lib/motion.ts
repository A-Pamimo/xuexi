/**
 * Motion craft layer — the single, live source of reduced-motion truth plus the
 * shared timing constants every animated piece tunes from.
 *
 * Why not react-native-reanimated's `useReducedMotion`? Reanimated's hook is
 * frozen at app-start (its own types: "Changing the reduced motion system
 * setting doesn't cause your components to rerender"). This one subscribes to
 * the OS/browser setting so animations converge when the user toggles it live.
 *
 * Leaf module: imports only from ./ theme (theme must never import motion — no
 * cycle). Native APIs are Platform-gated + try/caught, mirroring audio.ts.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { radius } from '../theme';

/** Tunable motion durations/speeds — the one place to retune app-wide feel. */
export const BOOT_MS = 700; // min visible time for the arcade boot overlay
export const EXIT_MS = 260; // boot fade/scale-out
export const SCRAMBLE_MS = 420; // glyph scramble-resolve reveal
export const TICKER_PXPS = 40; // marquee scroll speed (px/sec)

/** Duration helper: collapses to 0 (commit final frame immediately) when reduced. */
export const dur = (ms: number, reduced: boolean): number => (reduced ? 0 : ms);

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function webInitial(): boolean {
  // SSR / static web export: window may be undefined at first render.
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia(REDUCE_QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * Live "prefers reduced motion" boolean. Web reads matchMedia; native reads
 * AccessibilityInfo. Both subscribe to changes so a runtime toggle re-renders.
 */
export function useReducedMotion(): boolean {
  // Lazy initializer => correct on first paint (no flash of animation on web).
  const [reduced, setReduced] = useState<boolean>(() =>
    Platform.OS === 'web' ? webInitial() : false,
  );

  useEffect(() => {
    let live = true;

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mql = window.matchMedia(REDUCE_QUERY);
      setReduced(mql.matches);
      const onChange = (e: MediaQueryListEvent) => {
        if (live) setReduced(e.matches);
      };
      if (mql.addEventListener) mql.addEventListener('change', onChange);
      else (mql as unknown as { addListener(cb: (e: MediaQueryListEvent) => void): void }).addListener(onChange);
      return () => {
        live = false;
        if (mql.removeEventListener) mql.removeEventListener('change', onChange);
        else (mql as unknown as { removeListener(cb: (e: MediaQueryListEvent) => void): void }).removeListener(onChange);
      };
    }

    // native
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (live) setReduced(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) => {
      if (live) setReduced(v);
    });
    return () => {
      live = false;
      (sub as unknown as { remove?: () => void })?.remove?.();
    };
  }, []);

  return reduced;
}

const FOCUS_RING_ID = 'xuexi-focus-ring';

/**
 * Web-only: install a global :focus-visible ring (Rauno's "real focus states")
 * so keyboard users get a visible outline while mouse/touch focus stays quiet.
 * The color reads a CSS custom property (`--xuexi-focus`) that the root layout
 * updates per theme, so the ring recolors in light vs dark. No-op on native.
 * Idempotent — safe under StrictMode double-invoke.
 */
export function useWebFocusRing(): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById(FOCUS_RING_ID)) return;
    const el = document.createElement('style');
    el.id = FOCUS_RING_ID;
    el.textContent =
      `:focus-visible{outline:2px solid var(--xuexi-focus, #7C8CFF);outline-offset:2px;border-radius:${radius.sm}px;}` +
      `:focus:not(:focus-visible){outline:none;}`;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);
}
