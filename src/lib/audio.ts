/**
 * Audio playback over expo-av, sourcing ONLY bundled clips (AUDIO_ASSETS) — no
 * runtime TTS or network, per the offline / no-Google-at-runtime constraints.
 *
 * Works on iOS and web. On web, browsers block autoplay until the first user
 * gesture; callers treat playback as best-effort (a tap on any control unlocks
 * it thereafter).
 */
import { Audio } from 'expo-av';
import { AUDIO_ASSETS } from '../data/audioAssets';

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
  try {
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume: opts.volume ?? 1,
    });
    if (opts.rate && opts.rate !== 1) {
      // shouldCorrectPitch=false => rate also shifts pitch
      await sound.setRateAsync(opts.rate, false);
    }
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
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
  let playedAny = false;
  for (const key of assetKeys) {
    const source = sourceFor(key);
    if (!source) continue;
    try {
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
      playedAny = true;
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
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
