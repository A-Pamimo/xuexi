/**
 * Durability tests for the progress persistence adapters: the blob is the
 * user's entire learning history, so a crash mid-write (truncated/corrupt
 * main copy) must fall back to the last good blob, never wipe everything.
 */
import { nativePersistence, webPersistence } from './persistence';

// In-memory stand-in for expo-file-system, enough to exercise the
// write-tmp → backup → rename dance and its failure windows.
jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();
  return {
    __files: files,
    documentDirectory: 'file:///doc/',
    getInfoAsync: async (p: string) => ({ exists: files.has(p) }),
    readAsStringAsync: async (p: string) => {
      if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
      return files.get(p)!;
    },
    writeAsStringAsync: async (p: string, s: string) => {
      files.set(p, s);
    },
    deleteAsync: async (p: string, opts?: { idempotent?: boolean }) => {
      if (!files.has(p) && !opts?.idempotent) throw new Error(`ENOENT: ${p}`);
      files.delete(p);
    },
    copyAsync: async ({ from, to }: { from: string; to: string }) => {
      if (!files.has(from)) throw new Error(`ENOENT: ${from}`);
      files.set(to, files.get(from)!);
    },
    moveAsync: async ({ from, to }: { from: string; to: string }) => {
      if (!files.has(from)) throw new Error(`ENOENT: ${from}`);
      files.set(to, files.get(from)!);
      files.delete(from);
    },
  };
});

const fsFiles = (): Map<string, string> =>
  (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;

const MAIN = 'file:///doc/xuexi.progress.v1.json';
const BAK = 'file:///doc/xuexi.progress.v1.bak.json';

beforeEach(() => {
  fsFiles().clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('nativePersistence — atomic write + backup fallback', () => {
  it('round-trips a blob', async () => {
    const p = nativePersistence();
    await p.save('{"a":1}');
    expect(await p.load()).toBe('{"a":1}');
  });

  it('keeps the previous blob as .bak and never leaves a stray tmp file', async () => {
    const p = nativePersistence();
    await p.save('{"v":1}');
    await p.save('{"v":2}');
    expect(fsFiles().get(MAIN)).toBe('{"v":2}');
    expect(fsFiles().get(BAK)).toBe('{"v":1}');
    expect([...fsFiles().keys()].some((k) => k.includes('.tmp.'))).toBe(false);
  });

  it('recovers from a corrupt main copy via the backup', async () => {
    const p = nativePersistence();
    await p.save('{"v":1}');
    await p.save('{"v":2}');
    fsFiles().set(MAIN, '{"v":2'); // simulate a kill mid-write: truncated JSON
    expect(await p.load()).toBe('{"v":1}');
  });

  it('recovers when the main copy is missing entirely (kill between delete and rename)', async () => {
    const p = nativePersistence();
    await p.save('{"v":1}');
    await p.save('{"v":2}');
    fsFiles().delete(MAIN);
    expect(await p.load()).toBe('{"v":1}');
  });

  it('returns null when nothing was ever saved', async () => {
    expect(await nativePersistence().load()).toBeNull();
  });

  it('serialises overlapping saves (last write wins, no interleaving)', async () => {
    const p = nativePersistence();
    await Promise.all([p.save('{"v":1}'), p.save('{"v":2}'), p.save('{"v":3}')]);
    expect(fsFiles().get(MAIN)).toBe('{"v":3}');
    expect(await p.load()).toBe('{"v":3}');
  });
});

describe('webPersistence — localStorage with backup key', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    };
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('round-trips a blob and keeps the previous value as backup', async () => {
    const p = webPersistence();
    await p.save('{"v":1}');
    await p.save('{"v":2}');
    expect(await p.load()).toBe('{"v":2}');
    expect(storage.get('xuexi.progress.v1.bak')).toBe('{"v":1}');
  });

  it('recovers from a corrupt main value via the backup', async () => {
    const p = webPersistence();
    await p.save('{"v":1}');
    await p.save('{"v":2}');
    storage.set('xuexi.progress.v1', '{"v":2'); // truncated
    expect(await p.load()).toBe('{"v":1}');
  });

  it('returns null when both copies are corrupt', async () => {
    const p = webPersistence();
    await p.save('{"v":1}');
    storage.set('xuexi.progress.v1', 'not json');
    storage.set('xuexi.progress.v1.bak', 'also not json');
    expect(await p.load()).toBeNull();
  });
});
