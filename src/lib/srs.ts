/**
 * FSRS spaced-repetition scheduling, isolated here per coding conventions.
 * Wraps the `ts-fsrs` package — we do NOT hand-roll SM-2.
 *
 * The rest of the app speaks in terms of our domain `Card` (see types.ts) and a
 * simple `Rating` string; this module is the only place that touches ts-fsrs
 * internals, so the scheduler can be tuned or swapped without ripple.
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating as FsrsRating,
  State,
  type Card as FsrsCard,
  type Grade,
} from 'ts-fsrs';
import type { Card, Rating } from './types';

// enable_fuzz spreads due dates slightly so large batches don't all resurface at
// once — kept off in tests (see makeScheduler) for deterministic assertions.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

const RATING_MAP: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

/** Create a fresh, never-reviewed card for a word, due immediately. */
export function newCard(wordId: number, now: Date = new Date()): Card {
  return fromFsrs(wordId, createEmptyCard(now), now);
}

/**
 * Apply a review rating and return the rescheduled card plus how many days out
 * the next review lands (used for "+3d" style UI hints).
 */
export function applyRating(
  card: Card,
  rating: Rating,
  now: Date = new Date(),
): { card: Card; scheduledDays: number } {
  const { card: next } = scheduler.next(toFsrs(card), now, RATING_MAP[rating]);
  const scheduledDays = Math.max(
    0,
    Math.round((next.due.getTime() - now.getTime()) / 86_400_000),
  );
  return { card: fromFsrs(card.wordId, next, card.createdAt), scheduledDays };
}

/** Cards whose `due` is at or before `now`, soonest first. */
export function selectDue(cards: Card[], now: Date = new Date()): Card[] {
  const cutoff = now.getTime();
  return cards
    .filter((c) => new Date(c.due).getTime() <= cutoff)
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
}

/** A card counts as "known" once it has left the New state and been reviewed. */
export function isKnown(card: Card): boolean {
  return card.state !== State.New && card.reps > 0;
}

// FSRS-4.5 forgetting curve constants (see ts-fsrs); kept local so XP weighting
// doesn't depend on a specific ts-fsrs helper signature.
const R_DECAY = -0.5;
const R_FACTOR = 19 / 81;

/**
 * Probability the card would be recalled right now (0..1). Used to reward
 * reviews of nearly-forgotten cards more than freshly-seen ones. A never-studied
 * card returns 0 (maximally worth learning).
 */
export function retrievabilityOf(card: Card, now: Date = new Date()): number {
  if (!card.lastReview || card.reps === 0 || card.stability <= 0) return 0;
  const elapsedDays = Math.max(
    0,
    (now.getTime() - new Date(card.lastReview).getTime()) / 86_400_000,
  );
  return Math.pow(1 + R_FACTOR * (elapsedDays / card.stability), R_DECAY);
}

// --- conversion between domain Card and ts-fsrs Card -----------------------

function toFsrs(card: Card): FsrsCard {
  // elapsed_days/scheduled_days are bookkeeping ts-fsrs recomputes from
  // last_review during next(); they only feed the fuzz window, which is
  // disabled above. If fuzz is ever enabled, derive them from the card here.
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

function fromFsrs(
  wordId: number,
  f: FsrsCard,
  createdAt: string | Date,
): Card {
  return {
    wordId,
    stability: f.stability,
    difficulty: f.difficulty,
    due: f.due.toISOString(),
    reps: f.reps,
    lapses: f.lapses,
    state: f.state,
    lastReview: f.last_review ? f.last_review.toISOString() : null,
    createdAt:
      typeof createdAt === 'string' ? createdAt : createdAt.toISOString(),
  };
}
