/**
 * Platform persistence for the mutable progress blob (cards, sessions, tone
 * results, user stats). Content is immutable and comes from the bundled seed;
 * only this small blob needs writing. Native uses the app's document directory
 * (expo-file-system); web uses localStorage. Both are fully offline.
 *
 * Durability: this blob is the user's entire learning history, so writes must
 * never be able to destroy the only copy. Native writes go to a temp file that
 * is renamed into place, and the previous good blob is kept as a `.bak`; web
 * keeps the previous value under a backup key. Loads validate JSON and fall
 * back to the backup, so a crash mid-write costs at most the last write, never
 * the whole history.
 */
import { Platform } from 'react-native';

const KEY = 'xuexi.progress.v1';
const BAK_KEY = `${KEY}.bak`;

export interface Persistence {
  load(): Promise<string | null>;
  save(json: string): Promise<void>;
}

function isValidJson(s: string | null | undefined): s is string {
  if (!s) return false;
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

export function webPersistence(): Persistence {
  return {
    async load() {
      try {
        const ls = globalThis.localStorage;
        if (!ls) return null;
        const main = ls.getItem(KEY);
        if (isValidJson(main)) return main;
        const bak = ls.getItem(BAK_KEY);
        if (isValidJson(bak)) {
          console.warn('xuexi: progress blob corrupt — recovered from backup');
          return bak;
        }
        return null;
      } catch {
        return null;
      }
    },
    async save(json) {
      try {
        const ls = globalThis.localStorage;
        if (!ls) return;
        // Keep the previous good blob as a fallback before overwriting.
        const prev = ls.getItem(KEY);
        if (prev !== null) ls.setItem(BAK_KEY, prev);
        ls.setItem(KEY, json);
      } catch {
        /* private mode / quota — progress is best-effort this session */
      }
    },
  };
}

export function nativePersistence(): Persistence {
  // Lazy require so web bundles never pull in expo-file-system.
  const FileSystem = require('expo-file-system') as typeof import('expo-file-system');
  const dir = FileSystem.documentDirectory;
  const path = `${dir}${KEY}.json`;
  const bakPath = `${dir}${KEY}.bak.json`;
  const tmpPath = `${dir}${KEY}.tmp.json`;

  async function readIfValid(p: string): Promise<string | null> {
    try {
      const info = await FileSystem.getInfoAsync(p);
      if (!info.exists) return null;
      const s = await FileSystem.readAsStringAsync(p);
      return isValidJson(s) ? s : null;
    } catch {
      return null;
    }
  }

  // Serialise writes: overlapping flushes must not interleave the tmp/rename dance.
  let lastWrite: Promise<void> = Promise.resolve();

  return {
    async load() {
      const main = await readIfValid(path);
      if (main !== null) return main;
      const bak = await readIfValid(bakPath);
      if (bak !== null) {
        console.warn('xuexi: progress blob corrupt — recovered from backup');
      }
      return bak;
    },
    save(json) {
      lastWrite = lastWrite.then(async () => {
        try {
          // Write-to-temp then rename so a kill mid-write can never truncate
          // the only copy; the previous blob survives as .bak until the new
          // one is fully in place.
          await FileSystem.writeAsStringAsync(tmpPath, json);
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            await FileSystem.deleteAsync(bakPath, { idempotent: true });
            await FileSystem.copyAsync({ from: path, to: bakPath });
            await FileSystem.deleteAsync(path, { idempotent: true });
          }
          await FileSystem.moveAsync({ from: tmpPath, to: path });
        } catch {
          /* best-effort */
        }
      });
      return lastWrite;
    },
  };
}

export function getPersistence(): Persistence {
  return Platform.OS === 'web' ? webPersistence() : nativePersistence();
}
