/**
 * Central app state (Zustand — no Redux, per spec). Owns the device Store and
 * exposes reactive derived views + the mutating actions used across features.
 *
 * The Store holds data outside React; after any mutation we bump `rev` so
 * components recompute derived views (due queue, known set, collection).
 */
import { create } from 'zustand';
import { configureAnalytics, track } from '../lib/analytics';
import { Store } from '../lib/db/store';
import {
  advanceStreak,
  DAILY_GOAL_XP,
  dayQualifies,
  earnedReward,
  goalProgress,
  levelForXp,
  xpForReview,
  xpForTone,
  type RewardRoll,
} from '../lib/gamification';
import * as juice from '../lib/juice';
import { scheduleReminders, type ReminderPrefs } from '../lib/notifications';
import { applyRating, isKnown, newCard, retrievabilityOf, selectDue } from '../lib/srs';
import type { Card, Rating, ThemeMode, ToneDrillResult, UserStats, Word } from '../lib/types';

export function today(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Highest-frequency HSK1 words used to bootstrap a "known" base at onboarding so
// the i+1 feed has comprehensible content immediately. Exported so the onboarding
// screen can preview a fully-comprehensible sentence against the SAME known set
// that completeOnboarding() marks known (its "you just read Chinese" moment).
export const BOOTSTRAP_HANZI = [
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
  initError: boolean;
  rev: number;
  onboarded: boolean;
  themeMode: ThemeMode;
  stats: UserStats;
  dailyGoal: number;
  reminderPrefs: ReminderPrefs;
  store: Store | null;

  init(): Promise<void>;
  bump(): void;
  completeOnboarding(): void;
  setThemeMode(mode: ThemeMode): void;
  goalToday(): { into: number; goal: number; ratio: number; met: boolean };
  setReminderPrefs(prefs: ReminderPrefs): void;

  knownWordIds(): Set<number>;
  reviewQueue(limit?: number): QueueItem[];
  dueCount(): number;

  addWord(wordId: number): boolean;
  noteGloss(wordId: number): void;
  reviewWord(
    wordId: number,
    rating: Rating,
    combo?: number,
  ): { scheduledDays: number; reward: RewardRoll; gained: number };
  recordTone(
    r: ToneDrillResult,
    correct: boolean,
    combo?: number,
  ): { reward: RewardRoll; gained: number };
  addFeedSeconds(sec: number): void;
  addToneSeconds(sec: number): void;
}

function requireStore(s: Store | null): Store {
  if (!s) throw new Error('Store not initialised');
  return s;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  initError: false,
  rev: 0,
  onboarded: false,
  themeMode: 'system',
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
  dailyGoal: DAILY_GOAL_XP,
  reminderPrefs: { enabled: false, hour: 19 },
  store: null,

  async init() {
    if (get().ready) return;
    try {
      const store = await Store.open();
      // Wire the local analytics log through the store's persistence adapter so
      // events survive a reload (offline write-through, never a network call).
      configureAnalytics({
        sink: {
          read: () => store.getAnalytics(),
          persist: (events) => store.setAnalytics(events),
        },
      });
      set({
        store,
        ready: true,
        onboarded: store.isOnboarded(),
        themeMode: store.getThemeMode(),
        stats: store.getStats(),
        dailyGoal: store.getDailyGoal(),
        reminderPrefs: store.getReminderPrefs(),
      });
      track('session_start');
      // Re-arm any stored daily reminder (no-op on web / when disabled).
      void scheduleReminders(store.getReminderPrefs());
    } catch (e) {
      // Seed/persistence load failed — surface an error instead of an infinite spinner.
      console.error('xuexi init failed:', e);
      set({ initError: true });
    }
  },

  bump() {
    set((s) => ({ rev: s.rev + 1 }));
  },

  setThemeMode(mode: ThemeMode) {
    get().store?.setThemeMode(mode);
    set({ themeMode: mode });
  },

  // Progress toward today's honest XP goal (see gamification.goalProgress). Reads
  // live from the session so the ring reflects XP earned so far this day.
  goalToday() {
    const store = requireStore(get().store);
    return goalProgress(store.getSession(today()), get().dailyGoal);
  },

  setReminderPrefs(prefs) {
    const store = requireStore(get().store);
    store.setReminderPrefs(prefs);
    set({ reminderPrefs: prefs });
    // Reconcile the on-device schedule (no-op on web / when disabled).
    void scheduleReminders(prefs);
  },

  completeOnboarding() {
    // Note: the per-step `onboarding_step` analytics events are emitted by the
    // onboarding screen (it owns the step flow); this only marks completion.
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

  // A session = a capped batch of NEW words to learn (taught first) followed by
  // the due reviews. Capping new items (research P1-2 load protection) keeps the
  // intro gradual; new words arrive in SPOKEN-frequency order (P0-1) so learners
  // meet the words that dominate real speech first — basics first, then progress.
  reviewQueue(limit = 20, maxNew = 8) {
    const store = requireStore(get().store);
    const cards = store.allCards();
    const carded = new Set(cards.map((c) => c.wordId));

    // Due recalls: cards that have actually been studied at least once.
    const reviews: QueueItem[] = [];
    for (const c of selectDue(cards)) {
      if (c.reps === 0) continue; // never-studied added cards are "new", handled below
      const w = store.getWord(c.wordId);
      if (w) reviews.push({ word: w, card: c, isNew: false });
    }

    // New words to learn: words tapped/added but never studied, then fresh words
    // in spoken-frequency order — capped so a session never floods with new.
    const newItems: QueueItem[] = [];
    for (const c of selectDue(cards)) {
      if (c.reps !== 0) continue;
      const w = store.getWord(c.wordId);
      if (w) newItems.push({ word: w, card: c, isNew: true });
    }
    const fresh = store.words.filter((w) => !carded.has(w.id)).sort(bySpokenFreq);
    for (const w of fresh) {
      if (newItems.length >= maxNew) break;
      newItems.push({ word: w, card: newCard(w.id), isNew: true });
    }

    // Learn new first (leads with teaching), then reviews; capped at `limit`.
    return [...newItems.slice(0, maxNew), ...reviews].slice(0, limit);
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

  // Feed→FSRS pipeline (research P0-5): a word glossed twice auto-promotes into
  // spaced review, so opportunistic look-ups become durable learning without an
  // extra tap and without flooding the queue on a single curious glance.
  noteGloss(wordId) {
    const store = requireStore(get().store);
    const n = store.bumpGloss(wordId);
    track('feed_word_glossed', { wordId, count: n });
    if (n >= 2 && !store.getCard(wordId)) {
      store.upsertCard(newCard(wordId));
      get().bump();
    }
  },

  reviewWord(wordId, rating, combo = 0) {
    const store = requireStore(get().store);
    const existing = store.getCard(wordId) ?? newCard(wordId);
    // Weight XP by the demand actually faced: the card's difficulty and how
    // shaky recall was *before* this review (research U1 / guardrail #3).
    const retrievability = retrievabilityOf(existing);
    const { card, scheduledDays } = applyRating(existing, rating);
    store.upsertCard(card);

    const day = today();
    const session = store.getSession(day);
    const base = xpForReview(rating, { difficulty: existing.difficulty, retrievability });
    const reward = rating === 'again' ? { multiplier: 1, golden: false } : earnedReward({ combo });
    const gained = Math.round(base * reward.multiplier);
    store.patchSession(day, {
      reviewsDone: session.reviewsDone + 1,
      xpEarned: session.xpEarned + gained,
      comboMax: Math.max(session.comboMax, combo),
    });
    applyXpAndStreak(store, get, set, gained, day);
    track('review_graded', { rating, gained, combo });
    maybeCelebrateGoal(store, get, day);
    get().bump();
    return { scheduledDays, reward, gained };
  },

  recordTone(r, correct, combo = 0) {
    const store = requireStore(get().store);
    store.addToneResult(r);
    const day = today();
    const session = store.getSession(day);
    const base = xpForTone(correct);
    const reward = correct ? earnedReward({ combo }) : { multiplier: 1, golden: false };
    const gained = Math.round(base * reward.multiplier);
    store.patchSession(day, {
      xpEarned: session.xpEarned + gained,
      comboMax: Math.max(session.comboMax, combo),
    });
    if (gained > 0) applyXpAndStreak(store, get, set, gained, day);
    track('tone_answered', { correct, gained, combo });
    if (gained > 0) maybeCelebrateGoal(store, get, day);
    get().bump();
    return { reward, gained };
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

/** Order words by SUBTLEX-CH spoken-frequency rank; unranked words sort last. */
export function bySpokenFreq(a: Word, b: Word): number {
  return (a.spokenFreqRank ?? Infinity) - (b.spokenFreqRank ?? Infinity);
}

function maybeStreak(store: Store, stats: UserStats, day: string): UserStats {
  if (!dayQualifies(store.getSession(day))) return stats;
  const next = advanceStreak(stats, day);
  // Emit only when the streak count actually moved (advanceStreak is a no-op
  // once today is already counted) so the funnel logs real streak growth.
  if (next.streak !== stats.streak) track('streak_advanced', { streak: next.streak });
  return next;
}

/**
 * Fire the goal-met celebration exactly once per day. Reads live session XP,
 * checks the persisted per-day flag so a reload can't re-fire, and — the moment
 * today's honest goal is first reached — plays the reward juice and logs it.
 */
function maybeCelebrateGoal(store: Store, get: () => AppState, day: string): void {
  if (store.isGoalCelebrated(day)) return;
  const progress = goalProgress(store.getSession(day), get().dailyGoal);
  if (!progress.met) return;
  store.markGoalCelebrated(day);
  juice.reward();
  track('goal_complete', { into: progress.into, goal: progress.goal });
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
