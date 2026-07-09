/** Resolve bundled audio for words/sentences/syllables and play via audio.ts. */
import { playAsset, playSequence } from '../../lib/audio';
import type { Store } from '../../lib/db/store';
import type { Sentence, ToneNumber } from '../../lib/types';

export function playWord(store: Store, wordId: number): Promise<boolean> {
  const ref = store.audioRefsFor('word', String(wordId))[0];
  return ref ? playAsset(ref.assetKey) : Promise.resolve(false);
}

export function playSentence(store: Store, sentence: Sentence): Promise<boolean> {
  const keys = sentence.wordIds
    .map((id) => store.audioRefsFor('word', String(id))[0]?.assetKey)
    .filter((k): k is string => !!k);
  return keys.length ? playSequence(keys) : Promise.resolve(false);
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
