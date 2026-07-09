/**
 * Audio playback over expo-av, sourcing ONLY bundled clips (AUDIO_ASSETS) — no
 * runtime TTS or network, per the offline / no-Google-at-runtime constraints.
 *
 * Works on iOS and web. On web, browsers block autoplay until the first user
 * gesture; callers treat playback as best-effort (a tap on any control unlocks
 * it thereafter).
 */
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { AUDIO_ASSETS } from '../data/audioAssets';

// Shared audio-unlock flag (single source of truth). Native is unlocked from the
// start; web stays locked until an explicit user gesture calls unlockAudio(),
// because browsers block audio until then. Nav SFX and feed autoplay both gate
// on this so nothing tries (and silently fails) to play before it's allowed.
let unlocked = Platform.OS !== 'web';
export function isAudioUnlocked(): boolean {
  return unlocked;
}
export function unlockAudio(): void {
  unlocked = true;
}

let configured = false;
async function ensureMode(): Promise<void> {
  if (configured) return;
  configured = true;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  } catch {
    /* web / unsupported */
  }
}

function sourceFor(assetKey: string): number | { uri: string } | null {
  const entry = AUDIO_ASSETS[assetKey];
  if (entry == null) return null;
  return typeof entry === 'string' ? { uri: entry } : entry;
}

// Single playback channel: only one clip sounds at a time, and callers can stop
// it (on screen exit / session end) so audio never lingers or stacks.
let current: Audio.Sound | null = null;
let generation = 0; // bumped on every stop, so in-flight sequences can bail out

async function stopCurrent(): Promise<void> {
  generation += 1;
  const s = current;
  current = null;
  if (!s) return;
  try {
    await s.stopAsync();
  } catch {
    /* already stopped/unloaded */
  }
  try {
    await s.unloadAsync();
  } catch {
    /* ignore */
  }
}

/** Stop any playing/queued clip immediately (call on screen exit or session end). */
export async function stopAudio(): Promise<void> {
  await stopCurrent();
}

/**
 * Play one bundled clip. Optional rate shifts pitch (used for combo escalation).
 * Returns `true` if a clip was found and playback started — callers use this to
 * show real feedback (a "playing" pulse) or an "audio unavailable" state instead
 * of failing silently.
 */
export async function playAsset(
  assetKey: string,
  opts: { rate?: number; volume?: number } = {},
): Promise<boolean> {
  const source = sourceFor(assetKey);
  if (!source) return false;
  await ensureMode();
  await stopCurrent(); // never stack over a still-playing clip
  try {
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume: opts.volume ?? 1,
    });
    current = sound;
    if (opts.rate && opts.rate !== 1) {
      // shouldCorrectPitch=false => rate also shifts pitch
      await sound.setRateAsync(opts.rate, false);
    }
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        if (current === sound) current = null;
        void sound.unloadAsync();
      }
    });
    return true;
  } catch {
    return false; // web autoplay lock, decode error, etc. — surface to caller
  }
}

/**
 * Play a queue of clips back-to-back (feed sentence = its word clips). Resolves
 * `true` if at least one clip played.
 */
export async function playSequence(assetKeys: string[]): Promise<boolean> {
  await ensureMode();
  await stopCurrent();
  const myGen = generation; // bail out if a newer play/stop supersedes us
  let playedAny = false;
  for (const key of assetKeys) {
    if (generation !== myGen) break;
    const source = sourceFor(key);
    if (!source) continue;
    try {
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
      current = sound;
      playedAny = true;
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            if (current === sound) current = null;
            void sound.unloadAsync();
            resolve();
          }
        });
      });
    } catch {
      /* skip a bad clip */
    }
  }
  return playedAny;
}
