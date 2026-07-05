/**
 * Shared domain types for xuexi. These mirror the spec's <data_models>.
 * Convention: tone numbers are stored in data; tone marks are rendered in the UI
 * (see src/lib/pinyin.ts). All Chinese text is simplified hanzi.
 */

export type ToneNumber = 1 | 2 | 3 | 4 | 5; // 5 = neutral

/** A vocabulary item — the atomic unit of study. */
export interface Word {
  id: number;
  hanzi: string;
  /** Pinyin with tone NUMBERS, space-separated per syllable, e.g. "ni3 hao3". */
  pinyinNumbered: string;
  /** Per-syllable tone numbers, e.g. [3, 3]. */
  tonePattern: ToneNumber[];
  glossEn: string;
  hskLevel: number; // 1..6 (seed ships 1..3)
  frequencyRank: number | null;
  /** Component / radical breakdown per character, for mnemonic teaching. */
  componentBreakdown: ComponentBreakdown[];
}

export interface ComponentBreakdown {
  char: string;
  radical: string | null;
  /** Decomposition string (IDS-like) from makemeahanzi, when available. */
  decomposition: string | null;
  /** Short etymology / mnemonic hint. */
  hint: string | null;
}

/** FSRS scheduling state attached to a Word. Managed by src/lib/srs.ts. */
export interface Card {
  wordId: number;
  stability: number;
  difficulty: number;
  /** ISO timestamp when the card is next due. */
  due: string;
  reps: number;
  lapses: number;
  /** ts-fsrs State enum value (New=0, Learning=1, Review=2, Relearning=3). */
  state: number;
  /** ISO timestamp of last review, null if never reviewed. */
  lastReview: string | null;
  createdAt: string;
}

export interface Sentence {
  id: number;
  hanzi: string;
  /** Pinyin with tone NUMBERS. */
  pinyin: string;
  glossEn: string;
  wordIds: number[];
  /** Fraction (0..1) of this sentence's words that are "known" — recomputed per user. */
  difficultyScore: number;
  audioRef: string | null;
  /** e.g. "graded", "chengyu", "slang", "meme" — drives the 10% surprise mix. */
  sourceTag: string;
}

/** Maps a (word|syllable) + tone + speaker to a bundled audio asset. */
export interface AudioRef {
  id: number;
  ownerType: 'word' | 'syllable' | 'sentence';
  ownerKey: string; // hanzi for words, "ma3" style for syllables, sentence id
  tone: ToneNumber | null;
  speakerId: string;
  /** Asset module id (native) or relative URL (web). Resolved by audio.ts. */
  assetKey: string;
}

export interface ToneDrillResult {
  syllable: string;
  speakerId: string;
  chosenTone: ToneNumber;
  correctTone: ToneNumber;
  latencyMs: number;
  timestamp: string;
}

export interface SessionLog {
  date: string; // YYYY-MM-DD
  reviewsDone: number;
  feedSeconds: number;
  toneDrillSeconds: number;
  xpEarned: number;
  comboMax: number;
}

export interface UserStats {
  streak: number;
  lastStreakDate: string | null; // YYYY-MM-DD
  streakFreezes: number;
  totalInputMinutes: number;
  knownWordCount: number;
  xp: number;
  level: number;
  unlocks: string[];
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';
