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
import type {
  AudioRef,
  Card,
  Sentence,
  SessionLog,
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
