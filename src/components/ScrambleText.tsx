/**
 * Letter-scramble reveal (Valentin Chevalier's mechanic) — glyphs churn through
 * random characters then resolve left→right to the target. For a Chinese app the
 * effect reads as "decoding," which is on-theme rather than gimmicky.
 *
 * The scramble is a JS-thread text swap (text content can't animate on the UI
 * thread) — composite-safe otherwise. Reduced-motion routes through the LIVE
 * src/lib/motion.ts hook: when on, the target renders immediately, no churn.
 */
import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { SCRAMBLE_MS, useReducedMotion } from '../lib/motion';

const HANZI_POOL = [...'的一是不了人我在有他这为之大来以个中上们时到地也子那要下'];
const PINYIN_POOL = [...'abcdefghijklmnopqrstuvwxyzāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'];

const now = () => globalThis.performance?.now?.() ?? Date.now();

function scrambleFrame(target: string, pool: string[], p: number): string {
  const chars = [...target];
  const lock = Math.floor(p * chars.length);
  return chars
    .map((ch, i) => (i < lock || /\s/.test(ch) ? ch : pool[Math.floor(Math.random() * pool.length)]))
    .join('');
}

export function useScramble(
  target: string,
  {
    kind = 'pinyin',
    durationMs = SCRAMBLE_MS,
    fps = 24,
    enabled = true,
    onDone,
  }: { kind?: 'hanzi' | 'pinyin'; durationMs?: number; fps?: number; enabled?: boolean; onDone?: () => void } = {},
): string {
  const reduced = useReducedMotion();
  const [disp, setDisp] = React.useState(target);

  React.useEffect(() => {
    if (!enabled || reduced) {
      setDisp(target); // final text instantly, no interval
      return;
    }
    const pool = kind === 'hanzi' ? HANZI_POOL : PINYIN_POOL;
    const start = now();
    setDisp(scrambleFrame(target, pool, 0));
    const id = setInterval(() => {
      const p = Math.min(1, (now() - start) / durationMs);
      setDisp(scrambleFrame(target, pool, p));
      if (p >= 1) {
        clearInterval(id);
        setDisp(target);
        onDone?.();
      }
    }, 1000 / fps);
    return () => clearInterval(id);
    // onDone intentionally omitted — a fresh closure each render must not restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, kind, durationMs, fps, enabled, reduced]);

  return disp;
}

export function ScrambleText({
  text,
  kind,
  style,
  enabled,
}: {
  text: string;
  kind?: 'hanzi' | 'pinyin';
  style?: StyleProp<TextStyle>;
  enabled?: boolean;
}) {
  const disp = useScramble(text, { kind, enabled });
  return <Text style={style}>{disp}</Text>;
}
