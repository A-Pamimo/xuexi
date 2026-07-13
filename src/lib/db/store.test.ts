/**
 * Store round-trip tests: the in-memory progress blob must survive
 * flush → reload intact, tolerate corrupt persistence without throwing, and
 * notify flush listeners (the cloud push-on-change choke point).
 */
import { Store, type ProgressBlob } from './store';
import type { Persistence } from './persistence';
import { newCard } from '../srs';

/** In-memory persistence — no platform adapter, no debounce concerns. */
function memoryPersistence(initial: string | null = null): Persistence & { value: string | null } {
  const box = {
    value: initial,
    async load() {
      return box.value;
    },
    async save(json: string) {
      box.value = json;
    },
  };
  return box;
}

describe('Store — progress round-trip', () => {
  it('opens fresh when nothing was saved', async () => {
    const store = await Store.open(memoryPersistence());
    expect(store.isOnboarded()).toBe(false);
    expect(store.allCards()).toHaveLength(0);
    expect(store.words.length).toBeGreaterThan(0); // content hydrated from seed
  });

  it('round-trips cards, sessions, stats and prefs through flush → reload', async () => {
    const persistence = memoryPersistence();
    const a = await Store.open(persistence);
    const wordId = a.words[0]!.id;
    a.upsertCard(newCard(wordId));
    a.patchSession('2026-07-13', { reviewsDone: 21, xpEarned: 55 });
    a.setStats({ ...a.getStats(), xp: 55, knownWordCount: 1 });
    a.setOnboarded(true);
    a.setShowPinyin(false);
    await a.flush();

    const b = await Store.open(persistence);
    expect(b.getCard(wordId)?.wordId).toBe(wordId);
    expect(b.getSession('2026-07-13').reviewsDone).toBe(21);
    expect(b.getStats().xp).toBe(55);
    expect(b.isOnboarded()).toBe(true);
    expect(b.getShowPinyin()).toBe(false);
  });

  it('starts fresh (not throwing) when persistence hands back corrupt JSON', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const store = await Store.open(memoryPersistence('{"onboarded": tru')); // truncated
    expect(store.isOnboarded()).toBe(false);
    expect(store.allCards()).toHaveLength(0);
    jest.restoreAllMocks();
  });

  it('fills fields missing from an older saved blob with defaults', async () => {
    // A blob saved before newer fields existed must not come back undefined.
    const legacy = JSON.stringify({ onboarded: true, cards: {} });
    const store = await Store.open(memoryPersistence(legacy));
    expect(store.isOnboarded()).toBe(true);
    expect(store.getReminderPrefs()).toEqual({ enabled: false, hour: 19 });
    expect(store.getStats().streak).toBe(0);
    expect(store.getAnalytics()).toEqual([]);
  });

  it('replaceProgress swaps the whole blob and persists it', async () => {
    const persistence = memoryPersistence();
    const store = await Store.open(persistence);
    const blob: ProgressBlob = { ...store.snapshot(), onboarded: true };
    store.replaceProgress(blob);
    expect(store.isOnboarded()).toBe(true);
    await store.flush();
    expect(persistence.value).toContain('"onboarded":true');
  });

  it('notifies flush listeners with the live blob (cloud push choke point)', async () => {
    const store = await Store.open(memoryPersistence());
    const seen: ProgressBlob[] = [];
    const unsub = store.onFlush((b) => seen.push(b));
    store.setOnboarded(true);
    await store.flush();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.onboarded).toBe(true);
    unsub();
    store.setOnboarded(false);
    await store.flush();
    expect(seen).toHaveLength(1); // unsubscribed — no further notifications
  });
});
