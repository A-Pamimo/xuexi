/**
 * Audio playback over expo-audio, sourcing ONLY bundled clips (AUDIO_ASSETS) — no
 * runtime TTS or network, per the offline / no-Google-at-runtime constraints.
 *
 * This module is the app's single audio seam: expo-av was deprecated (removed
 * from the SDK as of 55), so playback is implemented on its replacement,
 * expo-audio, and nothing outside this file touches the audio API.
 *
 * Works on iOS and web. On web, browsers block autoplay until the first user
 * gesture; callers treat playback as best-effort (a tap on any control unlocks
 * it thereafter).
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AUDIO_ASSETS } from '../data/audioAssets';

let configured = false;
async function ensureMode(): Promise<void> {
  if (configured) return;
  configured = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    /* web / unsupported */
  }
}

function sourceFor(assetKey: string): number | { uri: string } | null {
  const entry = AUDIO_ASSETS[assetKey];
  if (entry == null) return null;
  return typeof entry === 'string' ? { uri: entry } : entry;
}

/** Play the player and remove it once it finishes (or errors). */
function playAndRelease(player: AudioPlayer, onDone?: () => void): void {
  const sub = player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) {
      sub.remove();
      try {
        player.remove();
      } catch {
        /* already released */
      }
      onDone?.();
    }
  });
  player.play();
}

/** Play one bundled clip. Optional rate shifts pitch (used for combo escalation). */
export async function playAsset(
  assetKey: string,
  opts: { rate?: number; volume?: number } = {},
): Promise<void> {
  const source = sourceFor(assetKey);
  if (!source) return;
  await ensureMode();
  try {
    const player = createAudioPlayer(source);
    player.volume = opts.volume ?? 1;
    if (opts.rate && opts.rate !== 1) {
      // shouldCorrectPitch=false => rate also shifts pitch (combo escalation)
      player.shouldCorrectPitch = false;
      player.setPlaybackRate(opts.rate);
    }
    playAndRelease(player);
  } catch {
    /* best-effort playback */
  }
}

/** Play a queue of clips back-to-back (feed sentence = its word clips). */
export async function playSequence(assetKeys: string[]): Promise<void> {
  await ensureMode();
  for (const key of assetKeys) {
    const source = sourceFor(key);
    if (!source) continue;
    try {
      await new Promise<void>((resolve) => {
        const player = createAudioPlayer(source);
        playAndRelease(player, resolve);
        // Safety valve: a clip that never reports finishing must not hang the queue.
        setTimeout(resolve, 10_000);
      });
    } catch {
      /* skip a bad clip */
    }
  }
}
