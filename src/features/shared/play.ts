/** Resolve bundled audio for words/sentences/syllables and play via audio.ts. */
import { playAsset, playSequence } from '../../lib/audio';
import type { Store } from '../../lib/db/store';
import type { Sentence, ToneNumber } from '../../lib/types';

export function playWord(store: Store, wordId: number): void {
  const ref = store.audioRefsFor('word', String(wordId))[0];
  if (ref) void playAsset(ref.assetKey);
}

export function playSentence(store: Store, sentence: Sentence): void {
  const keys = sentence.wordIds
    .map((id) => store.audioRefsFor('word', String(id))[0]?.assetKey)
    .filter((k): k is string => !!k);
  if (keys.length) void playSequence(keys);
}

/** All (syllable+tone) clips across speakers — for the Tone Dojo variability. */
export function syllableClip(
  store: Store,
  syllable: string,
  tone: ToneNumber,
): { assetKey: string; speakerId: string } | null {
  const refs = store.audioRefsFor('syllable', `${syllable}${tone}`);
  if (!refs.length) return null;
  const r = refs[Math.floor(Math.random() * refs.length)]!;
  return { assetKey: r.assetKey, speakerId: r.speakerId };
}
