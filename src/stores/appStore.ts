/**
 * Central app state (Zustand — no Redux, per spec). Owns the device Store and
 * exposes reactive derived views + the mutating actions used across features.
 *
 * The Store holds data outside React; after any mutation we bump `rev` so
 * components recompute derived views (due queue, known set, collection).
 */
import { create } from 'zustand';
import { configureAnalytics, track } from '../lib/analytics';
import { emptyProgress, Store, type ProgressBlob } from '../lib/db/store';
import {
  initCloud,
  isCloudConfigured,
  pullProgress,
  pushProgress,
  signInWithGoogle,
  signOutUser,
  subscribeAuth,
  type CloudUser,
} from '../lib/cloud';
import { mergeProgress, toCloudBlob } from '../lib/mergeProgress';
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

/**
 * The LOCAL calendar date (YYYY-MM-DD). Streaks, daily goals and session logs
 * all key off this — it must match the learner's wall clock, not UTC (a user
 * in UTC+8 studying before 8am would otherwise be credited to yesterday).
 */
export function today(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
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
  showPinyin: boolean;
  stats: UserStats;
  dailyGoal: number;
  reminderPrefs: ReminderPrefs;
  store: Store | null;

  // Account / cloud sync. `cloudConfigured` is false when no Firebase config is
  // present (the app then runs purely as a local guest and hides sign-in).
  user: CloudUser | null;
  authReady: boolean;
  cloudConfigured: boolean;
  syncing: boolean;

  init(): Promise<void>;
  bump(): void;
  completeOnboarding(): void;
  setThemeMode(mode: ThemeMode): void;
  setShowPinyin(show: boolean): void;
  signIn(): Promise<void>;
  signOutAccount(): Promise<void>;
  goalToday(): { into: number; goal: number; ratio: number; met: boolean };
  setReminderPrefs(prefs: ReminderPrefs): void;

  knownWordIds(): Set<number>;
  reviewQueue(limit?: number, maxNew?: number): QueueItem[];
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
  showPinyin: true,
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

  user: null,
  authReady: false,
  cloudConfigured: isCloudConfigured(),
  syncing: false,

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
        showPinyin: store.getShowPinyin(),
        stats: store.getStats(),
        dailyGoal: store.getDailyGoal(),
        reminderPrefs: store.getReminderPrefs(),
      });
      track('session_start');
      // Re-arm any stored daily reminder (no-op on web / when disabled).
      void scheduleReminders(store.getReminderPrefs());

      // Cloud account: initialise auth and react to sign-in state. A returning
      // signed-in session restores here (Firebase persists it); signing in later
      // merges the local guest progress up. No-op / guest when unconfigured.
      initCloud();
      subscribeAuth((user) => {
        void handleAuthChange(get, set, user);
      });
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

  setShowPinyin(show: boolean) {
    get().store?.setShowPinyin(show);
    set({ showPinyin: show });
  },

  // Sign-in state changes flow through subscribeAuth -> handleAuthChange, which
  // does the pull/merge/push. These just kick off the Firebase flow; errors
  // (e.g. a closed popup) propagate to the caller to surface in the UI.
  async signIn() {
    await signInWithGoogle();
  },
  async signOutAccount() {
    await signOutUser();
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
  // intro gradual; new words arrive by LEARN PRIORITY (spoken-frequency with bare
  // grammatical particles deferred, byLearnPriority) so learners meet meaningful,
  // teachable words first rather than abstract markers — basics first, then grammar.
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
    const fresh = store.words.filter((w) => !carded.has(w.id)).sort(byLearnPriority);
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
    // Same streak re-check as addFeedSeconds: drill time itself doesn't qualify
    // a day, but the review threshold may have been crossed earlier today.
    const streaked = maybeStreak(store, stats, day);
    store.setStats(streaked);
    set({ stats: streaked });
    get().bump();
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

// Pure grammatical particles/markers. Essential Mandarin, but they carry no
// standalone meaning — as isolated flashcards ("了 = completed-action marker")
// they teach nothing, which is why raw spoken-frequency order (which puts them
// among the very first words) is pedagogically backwards for a beginner. We still
// introduce them early, just not as the first cards, and the Learn card now always
// shows them inside an example sentence (ReviewScreen ExampleSentence).
const PARTICLE_HANZI = new Set([
  '了', '着', '过', '的', '地', '得', '吧', '吗', '呢', '啊', '们', '被', '把', '之', '而', '以',
]);
// How far behind their raw frequency rank particles get pushed — enough that a
// learner's opening cards are contentful (nouns/verbs/adjectives), while the
// particle still surfaces within the first handful of sessions.
const PARTICLE_RANK_PENALTY = 60;

function learnRank(w: Word): number {
  const base = w.spokenFreqRank ?? Number.POSITIVE_INFINITY;
  return PARTICLE_HANZI.has(w.hanzi) ? base + PARTICLE_RANK_PENALTY : base;
}

/**
 * Order NEW words for introduction: spoken-frequency backbone (P0-1) with bare
 * grammatical particles deferred so beginners meet meaningful, teachable words
 * first. Keeps the frequency evidence while fixing the "abstract markers as your
 * first words" misalignment.
 */
export function byLearnPriority(a: Word, b: Word): number {
  return learnRank(a) - learnRank(b);
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

// --- cloud sync -------------------------------------------------------------

// Push-on-change plumbing (module-scoped — not serialisable state). The store's
// flush is the single choke point for every mutation; we debounce cloud writes
// on top of it so a burst of reviews becomes one upload, not dozens.
let unsubFlush: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function stopPushOnChange(): void {
  if (unsubFlush) unsubFlush();
  unsubFlush = null;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
}

function startPushOnChange(store: Store, uid: string): void {
  stopPushOnChange();
  unsubFlush = store.onFlush(() => {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      void pushProgress(uid, toCloudBlob(store.snapshot())).catch((e) =>
        console.warn('xuexi cloud push failed:', e),
      );
    }, 2500);
  });
}

/** Pull the cloud copy, merge it loss-free with local, write the result both ways. */
async function syncNow(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  store: Store,
  uid: string,
): Promise<void> {
  set({ syncing: true });
  try {
    const remote = await pullProgress(uid);
    if (remote) {
      const remoteFull: ProgressBlob = { ...emptyProgress(), ...remote };
      store.replaceProgress(mergeProgress(store.snapshot(), remoteFull));
    }
    // Push the merged (or, for a first-time user, local-first) blob up.
    await pushProgress(uid, toCloudBlob(store.snapshot()));
    // Re-hydrate the reactive slices from the merged store so the UI updates.
    set({
      onboarded: store.isOnboarded(),
      themeMode: store.getThemeMode(),
      showPinyin: store.getShowPinyin(),
      stats: store.getStats(),
      dailyGoal: store.getDailyGoal(),
      reminderPrefs: store.getReminderPrefs(),
    });
    void scheduleReminders(store.getReminderPrefs());
    get().bump();
    track('cloud_synced', { uid });
  } catch (e) {
    console.warn('xuexi cloud sync failed:', e);
  } finally {
    set({ syncing: false });
  }
}

/** React to a Firebase auth-state change: sign-in merges + starts sync; sign-out stops it. */
async function handleAuthChange(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  user: CloudUser | null,
): Promise<void> {
  set({ user, authReady: true });
  const store = get().store;
  if (!store) return;
  if (user) {
    await syncNow(get, set, store, user.uid);
    startPushOnChange(store, user.uid);
  } else {
    stopPushOnChange();
  }
}
