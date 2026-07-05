/**
 * Platform persistence for the mutable progress blob (cards, sessions, tone
 * results, user stats). Content is immutable and comes from the bundled seed;
 * only this small blob needs writing. Native uses the app's document directory
 * (expo-file-system); web uses localStorage. Both are fully offline.
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
  const FileSystem = require('expo-file-system') as typeof import('expo-file-system');
  const path = `${FileSystem.documentDirectory}${KEY}.json`;
  return {
    async load() {
      try {
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) return null;
        return await FileSystem.readAsStringAsync(path);
      } catch {
        return null;
      }
    },
    async save(json) {
      try {
        await FileSystem.writeAsStringAsync(path, json);
      } catch {
        /* best-effort */
      }
    },
  };
}

export function getPersistence(): Persistence {
  return Platform.OS === 'web' ? webPersistence() : nativePersistence();
}
