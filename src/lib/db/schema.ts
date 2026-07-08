/**
 * Canonical SQLite schema for xuexi. This DDL is the single source of truth used
 * both by the build-time seed pipeline (better-sqlite3, scripts/build-seed) and
 * by the native runtime store (expo-sqlite, store.native impl).
 *
 * Immutable CONTENT tables (words, sentences, audio_refs) are populated by the
 * pipeline and shipped in assets/db/xuexi-seed.db. Mutable PROGRESS tables
 * (cards, tone_drill_results, session_logs, user_stats) start empty and are
 * written at runtime.
 */
export const SEED_VERSION = 2;

export const SCHEMA_SQL = /* sql */ `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY,
  hanzi TEXT NOT NULL,
  pinyin_numbered TEXT NOT NULL,
  tone_pattern TEXT NOT NULL,          -- JSON array of tone numbers
  gloss_en TEXT NOT NULL,
  hsk_level INTEGER NOT NULL,
  frequency_rank INTEGER,              -- written-corpus rank
  spoken_frequency_rank INTEGER,       -- SUBTLEX-CH spoken (subtitle) rank
  component_breakdown TEXT NOT NULL    -- JSON array of ComponentBreakdown
);
CREATE INDEX IF NOT EXISTS idx_words_hsk ON words(hsk_level);
CREATE UNIQUE INDEX IF NOT EXISTS idx_words_hanzi ON words(hanzi);

CREATE TABLE IF NOT EXISTS sentences (
  id INTEGER PRIMARY KEY,
  hanzi TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  gloss_en TEXT NOT NULL,
  word_ids TEXT NOT NULL,              -- JSON array of word ids
  difficulty_score REAL NOT NULL,
  audio_ref TEXT,
  source_tag TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sentences_source ON sentences(source_tag);

CREATE TABLE IF NOT EXISTS audio_refs (
  id INTEGER PRIMARY KEY,
  owner_type TEXT NOT NULL,            -- 'word' | 'syllable' | 'sentence'
  owner_key TEXT NOT NULL,
  tone INTEGER,
  speaker_id TEXT NOT NULL,
  asset_key TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audio_owner ON audio_refs(owner_type, owner_key);

CREATE TABLE IF NOT EXISTS cards (
  word_id INTEGER PRIMARY KEY,
  stability REAL NOT NULL,
  difficulty REAL NOT NULL,
  due TEXT NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  state INTEGER NOT NULL,
  last_review TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);

CREATE TABLE IF NOT EXISTS tone_drill_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  syllable TEXT NOT NULL,
  speaker_id TEXT NOT NULL,
  chosen_tone INTEGER NOT NULL,
  correct_tone INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_logs (
  date TEXT PRIMARY KEY,              -- YYYY-MM-DD
  reviews_done INTEGER NOT NULL DEFAULT 0,
  feed_seconds INTEGER NOT NULL DEFAULT 0,
  tone_drill_seconds INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  combo_max INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  streak INTEGER NOT NULL DEFAULT 0,
  last_streak_date TEXT,
  streak_freezes INTEGER NOT NULL DEFAULT 0,
  total_input_minutes REAL NOT NULL DEFAULT 0,
  known_word_count INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  unlocks TEXT NOT NULL DEFAULT '[]'
);
`;

export const INITIAL_USER_STATS_SQL = /* sql */ `
INSERT OR IGNORE INTO user_stats (id) VALUES (1);
`;
