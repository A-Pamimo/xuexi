/**
 * The device data store — offline-first source of truth for the app.
 *
 * Architecture (see plan R1): immutable CONTENT (words, sentences, audio_refs)
 * is hydrated from the bundled seed snapshot, produced by the build-time
 * pipeline from the canonical SQLite DB (assets/db/xuexi-seed.db). Mutable
 * PROGRESS (FSRS cards, sessions, tone results, user stats) lives in memory for
 * synchronous reads and is written through to a platform persistence adapter
 * (expo-file-system on native, localStorage on web). This keeps the app fully
 * usable with zero network on both iOS and web without depending on the
 * expo-sqlite web (wasm) path.
 */
import rawSeed from '../../data/seed.json';
import type { AnalyticsEvent } from '../analytics';
import { DAILY_GOAL_XP } from '../gamification';
import type { ReminderPrefs } from '../notifications';
import type {
  AudioRef,
  Card,
  Sentence,
  SessionLog,
  ThemeMode,
  ToneDrillResult,
  UserStats,
  Word,
} from '../types';
import { getPersistence, type Persistence } from './persistence';

interface Seed {
  seedVersion: number;
  words: Word[];
  sentences: Sentence[];
  audioRefs: AudioRef[];
}

interface ProgressBlob {
  onboarded: boolean;
  cards: Record<number, Card>;
  toneResults: ToneDrillResult[];
  sessions: Record<string, SessionLog>;
  stats: UserStats;
  /** Times each word has been glossed in the Feed (drives auto-promotion to FSRS). */
  glossCounts: Record<number, number>;
  /** UI theme preference. Defaults to 'system' (follow the OS). */
  themeMode: ThemeMode;
  /** Daily XP goal — an honest, attainable target the learner works toward. */
  dailyGoal: number;
  /** Days on which the goal-met celebration already fired (fire-once guard). */
  goalCelebrated: Record<string, boolean>;
  /** Local daily-reminder settings. Off by default (opt-in, never nagging). */
  reminderPrefs: ReminderPrefs;
  /** Append-only local analytics log (offline only — never leaves the device). */
  analytics: AnalyticsEvent[];
}

const DEFAULT_STATS: UserStats = {
  streak: 0,
  lastStreakDate: null,
  streakFreezes: 0,
  totalInputMinutes: 0,
  knownWordCount: 0,
  xp: 0,
  level: 1,
  unlocks: [],
};

function emptyProgress(): ProgressBlob {
  return {
    onboarded: false,
    cards: {},
    toneResults: [],
    sessions: {},
    stats: { ...DEFAULT_STATS },
    glossCounts: {},
    themeMode: 'system',
    dailyGoal: DAILY_GOAL_XP,
    goalCelebrated: {},
    reminderPrefs: { enabled: false, hour: 19 },
    analytics: [],
  };
}

export class Store {
  readonly words: Word[];
  readonly sentences: Sentence[];
  readonly audioRefs: AudioRef[];
  private readonly wordById: Map<number, Word>;
  private progress: ProgressBlob = emptyProgress();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(seed: Seed, private readonly persistence: Persistence) {
    this.words = seed.words;
    this.sentences = seed.sentences;
    this.audioRefs = seed.audioRefs;
    this.wordById = new Map(seed.words.map((w) => [w.id, w]));
  }

  static async open(): Promise<Store> {
    const seed = rawSeed as unknown as Seed;
    const persistence = getPersistence();
    const store = new Store(seed, persistence);
    const saved = await persistence.load();
    if (saved) {
      try {
        store.progress = { ...emptyProgress(), ...(JSON.parse(saved) as ProgressBlob) };
      } catch {
        /* corrupt blob — start fresh */
      }
    }
    return store;
  }

  // --- onboarding flag -------------------------------------------------------
  isOnboarded(): boolean {
    return this.progress.onboarded;
  }
  setOnboarded(v: boolean): void {
    this.progress.onboarded = v;
    this.scheduleSave();
  }

  // --- theme preference ------------------------------------------------------
  getThemeMode(): ThemeMode {
    return this.progress.themeMode;
  }
  setThemeMode(mode: ThemeMode): void {
    this.progress.themeMode = mode;
    this.scheduleSave();
  }

  // --- daily goal ------------------------------------------------------------
  getDailyGoal(): number {
    return this.progress.dailyGoal;
  }
  setDailyGoal(goal: number): void {
    this.progress.dailyGoal = goal;
    this.scheduleSave();
  }
  /** Whether the goal-met celebration already fired on `date` (fire-once guard). */
  isGoalCelebrated(date: string): boolean {
    return this.progress.goalCelebrated[date] ?? false;
  }
  markGoalCelebrated(date: string): void {
    this.progress.goalCelebrated[date] = true;
    this.scheduleSave();
  }

  // --- reminder preferences --------------------------------------------------
  getReminderPrefs(): ReminderPrefs {
    return this.progress.reminderPrefs;
  }
  setReminderPrefs(prefs: ReminderPrefs): void {
    this.progress.reminderPrefs = prefs;
    this.scheduleSave();
  }

  // --- analytics log (local, offline-only) -----------------------------------
  getAnalytics(): AnalyticsEvent[] {
    return this.progress.analytics;
  }
  setAnalytics(events: AnalyticsEvent[]): void {
    this.progress.analytics = events;
    this.scheduleSave();
  }

  // --- content (immutable) ---------------------------------------------------
  getWord(id: number): Word | undefined {
    return this.wordById.get(id);
  }
  audioRefsFor(ownerType: AudioRef['ownerType'], ownerKey: string): AudioRef[] {
    return this.audioRefs.filter(
      (r) => r.ownerType === ownerType && r.ownerKey === ownerKey,
    );
  }

  // --- cards (FSRS state) ----------------------------------------------------
  getCard(wordId: number): Card | undefined {
    return this.progress.cards[wordId];
  }
  allCards(): Card[] {
    return Object.values(this.progress.cards);
  }
  upsertCard(card: Card): void {
    this.progress.cards[card.wordId] = card;
    this.scheduleSave();
  }

  // --- tone drill ------------------------------------------------------------
  addToneResult(r: ToneDrillResult): void {
    this.progress.toneResults.push(r);
    this.scheduleSave();
  }
  toneResults(): ToneDrillResult[] {
    return this.progress.toneResults;
  }

  // --- feed gloss counts -----------------------------------------------------
  glossCount(wordId: number): number {
    return this.progress.glossCounts[wordId] ?? 0;
  }
  /** Record a gloss of `wordId`, returning the new count. */
  bumpGloss(wordId: number): number {
    const n = (this.progress.glossCounts[wordId] ?? 0) + 1;
    this.progress.glossCounts[wordId] = n;
    this.scheduleSave();
    return n;
  }

  // --- sessions --------------------------------------------------------------
  getSession(date: string): SessionLog {
    return (
      this.progress.sessions[date] ?? {
        date,
        reviewsDone: 0,
        feedSeconds: 0,
        toneDrillSeconds: 0,
        xpEarned: 0,
        comboMax: 0,
      }
    );
  }
  patchSession(date: string, patch: Partial<SessionLog>): void {
    this.progress.sessions[date] = { ...this.getSession(date), ...patch };
    this.scheduleSave();
  }
  allSessions(): SessionLog[] {
    return Object.values(this.progress.sessions).sort((a, b) =>
      a.date < b.date ? -1 : 1,
    );
  }

  // --- user stats ------------------------------------------------------------
  getStats(): UserStats {
    return this.progress.stats;
  }
  setStats(stats: UserStats): void {
    this.progress.stats = stats;
    this.scheduleSave();
  }

  // --- persistence (debounced write-through) ---------------------------------
  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), 400);
  }
  async flush(): Promise<void> {
    this.saveTimer = null;
    await this.persistence.save(JSON.stringify(this.progress));
  }
}
