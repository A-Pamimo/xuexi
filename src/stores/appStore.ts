/**
 * Central app state (Zustand — no Redux, per spec). Owns the device Store and
 * exposes reactive derived views + the mutating actions used across features.
 *
 * The Store holds data outside React; after any mutation we bump `rev` so
 * components recompute derived views (due queue, known set, collection).
 */
import { create } from 'zustand';
import { Store } from '../lib/db/store';
import {
  advanceStreak,
  dayQualifies,
  levelForXp,
  rollReward,
  type RewardRoll,
} from '../lib/gamification';
import { applyRating, isKnown, newCard, selectDue } from '../lib/srs';
import type { Card, Rating, ToneDrillResult, UserStats, Word } from '../lib/types';

export function today(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Highest-frequency HSK1 words used to bootstrap a "known" base at onboarding so
// the i+1 feed has comprehensible content immediately.
const BOOTSTRAP_HANZI = [
  '我', '你', '他', '她', '是', '很', '有', '这', '不', '的',
  '喜欢', '去', '吃', '喝', '看', '买', '写', '做', '学', '今天',
  '现在', '茶', '水', '米饭', '咖啡', '书', '苹果', '中文', '菜', '面包',
  '手机', '朋友', '狗', '猫', '学校', '中国', '家', '商店', '北京', '一个',
];

export interface QueueItem {
  word: Word;
  card: Card;
  isNew: boolean;
}

interface AppState {
  ready: boolean;
  rev: number;
  onboarded: boolean;
  stats: UserStats;
  store: Store | null;

  init(): Promise<void>;
  bump(): void;
  completeOnboarding(): void;

  knownWordIds(): Set<number>;
  reviewQueue(limit?: number): QueueItem[];
  dueCount(): number;

  addWord(wordId: number): boolean;
  reviewWord(wordId: number, rating: Rating): { scheduledDays: number; reward: RewardRoll };
  recordTone(r: ToneDrillResult, correct: boolean): { reward: RewardRoll };
  addFeedSeconds(sec: number): void;
  addToneSeconds(sec: number): void;
}

function requireStore(s: Store | null): Store {
  if (!s) throw new Error('Store not initialised');
  return s;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  rev: 0,
  onboarded: false,
  stats: {
    streak: 0,
    lastStreakDate: null,
    streakFreezes: 0,
    totalInputMinutes: 0,
    knownWordCount: 0,
    xp: 0,
    level: 1,
    unlocks: [],
  },
  store: null,

  async init() {
    if (get().ready) return;
    const store = await Store.open();
    set({
      store,
      ready: true,
      onboarded: store.isOnboarded(),
      stats: store.getStats(),
    });
  },

  bump() {
    set((s) => ({ rev: s.rev + 1 }));
  },

  completeOnboarding() {
    const store = requireStore(get().store);
    const byHanzi = new Map(store.words.map((w) => [w.hanzi, w]));
    // Mark bootstrap words as known (reviewed Good) so the feed is comprehensible.
    for (const hanzi of BOOTSTRAP_HANZI) {
      const w = byHanzi.get(hanzi);
      if (!w || store.getCard(w.id)) continue;
      const { card } = applyRating(newCard(w.id), 'good');
      store.upsertCard(card);
    }
    store.setOnboarded(true);
    const stats = { ...store.getStats(), knownWordCount: countKnown(store) };
    store.setStats(stats);
    set({ onboarded: true, stats });
    get().bump();
  },

  knownWordIds() {
    const store = requireStore(get().store);
    return new Set(store.allCards().filter(isKnown).map((c) => c.wordId));
  },

  reviewQueue(limit = 20) {
    const store = requireStore(get().store);
    const cards = store.allCards();
    const due = selectDue(cards);
    const items: QueueItem[] = [];
    for (const c of due) {
      const w = store.getWord(c.wordId);
      if (w) items.push({ word: w, card: c, isNew: c.reps === 0 });
      if (items.length >= limit) return items;
    }
    // Not enough due — introduce new words (never opens to an empty session).
    if (items.length < limit) {
      const carded = new Set(cards.map((c) => c.wordId));
      for (const w of store.words) {
        if (carded.has(w.id)) continue;
        items.push({ word: w, card: newCard(w.id), isNew: true });
        if (items.length >= limit) break;
      }
    }
    return items;
  },

  dueCount() {
    const store = requireStore(get().store);
    return selectDue(store.allCards()).length;
  },

  addWord(wordId) {
    const store = requireStore(get().store);
    if (store.getCard(wordId)) return false;
    store.upsertCard(newCard(wordId));
    get().bump();
    return true;
  },

  reviewWord(wordId, rating) {
    const store = requireStore(get().store);
    const existing = store.getCard(wordId) ?? newCard(wordId);
    const { card, scheduledDays } = applyRating(existing, rating);
    store.upsertCard(card);

    const day = today();
    const session = store.getSession(day);
    const base = rating === 'again' ? 2 : 10;
    const reward = rating === 'again' ? { multiplier: 1, golden: false } : rollReward();
    const gained = Math.round(base * reward.multiplier);
    store.patchSession(day, {
      reviewsDone: session.reviewsDone + 1,
      xpEarned: session.xpEarned + gained,
    });
    applyXpAndStreak(store, get, set, gained, day);
    get().bump();
    return { scheduledDays, reward };
  },

  recordTone(r, correct) {
    const store = requireStore(get().store);
    store.addToneResult(r);
    const day = today();
    const session = store.getSession(day);
    const base = correct ? 5 : 0;
    const reward = correct ? rollReward() : { multiplier: 1, golden: false };
    const gained = Math.round(base * reward.multiplier);
    store.patchSession(day, { xpEarned: session.xpEarned + gained });
    if (gained > 0) applyXpAndStreak(store, get, set, gained, day);
    get().bump();
    return { reward };
  },

  addFeedSeconds(sec) {
    const store = requireStore(get().store);
    const day = today();
    const session = store.getSession(day);
    store.patchSession(day, { feedSeconds: session.feedSeconds + sec });
    const stats = {
      ...store.getStats(),
      totalInputMinutes: store.getStats().totalInputMinutes + sec / 60,
    };
    const streaked = maybeStreak(store, stats, day);
    store.setStats(streaked);
    set({ stats: streaked });
    get().bump();
  },

  addToneSeconds(sec) {
    const store = requireStore(get().store);
    const day = today();
    const session = store.getSession(day);
    store.patchSession(day, { toneDrillSeconds: session.toneDrillSeconds + sec });
    const stats = {
      ...store.getStats(),
      totalInputMinutes: store.getStats().totalInputMinutes + sec / 60,
    };
    store.setStats(stats);
    set({ stats });
  },
}));

// --- helpers ---------------------------------------------------------------

function countKnown(store: Store): number {
  return store.allCards().filter(isKnown).length;
}

function maybeStreak(store: Store, stats: UserStats, day: string): UserStats {
  return dayQualifies(store.getSession(day)) ? advanceStreak(stats, day) : stats;
}

function applyXpAndStreak(
  store: Store,
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  gained: number,
  day: string,
): void {
  let stats = store.getStats();
  stats = { ...stats, xp: stats.xp + gained, knownWordCount: countKnown(store) };
  stats.level = levelForXp(stats.xp);
  stats = maybeStreak(store, stats, day);
  store.setStats(stats);
  set({ stats });
}
