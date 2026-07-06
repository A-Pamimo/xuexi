/**
 * Platform persistence for the mutable progress blob (cards, sessions, tone
 * results, user stats). Content is immutable and comes from the bundled seed;
 * only this small blob needs writing. Native uses the app's document directory
 * via expo-file-system's File/Directory API (the modern default since SDK 54 —
 * the old functional API now lives in expo-file-system/legacy and is on the
 * deprecation path); web uses localStorage. Both are fully offline, and this
 * file is the app's single file-system seam.
 */
import { Platform } from 'react-native';

const KEY = 'xuexi.progress.v1';

export interface Persistence {
  load(): Promise<string | null>;
  save(json: string): Promise<void>;
}

function webPersistence(): Persistence {
  return {
    async load() {
      try {
        return globalThis.localStorage?.getItem(KEY) ?? null;
      } catch {
        return null;
      }
    },
    async save(json) {
      try {
        globalThis.localStorage?.setItem(KEY, json);
      } catch {
        /* private mode / quota — progress is best-effort this session */
      }
    },
  };
}

function nativePersistence(): Persistence {
  // Lazy require so web bundles never pull in expo-file-system.
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const file = () => new File(Paths.document, `${KEY}.json`);
  return {
    async load() {
      try {
        const f = file();
        if (!f.exists) return null;
        return await f.text();
      } catch {
        return null;
      }
    },
    async save(json) {
      try {
        file().write(json);
      } catch {
        /* best-effort */
      }
    },
  };
}

export function getPersistence(): Persistence {
  return Platform.OS === 'web' ? webPersistence() : nativePersistence();
}
