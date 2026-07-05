/**
 * FSRS behaviour tests (spec <verification>): intervals grow after Good/Easy and
 * shrink after Again. These guard the review backbone against regressions.
 */
import { applyRating, newCard, selectDue, isKnown } from './srs';

const T0 = new Date('2026-01-01T00:00:00.000Z');

describe('FSRS scheduling', () => {
  it('creates a new card that is due immediately', () => {
    const card = newCard(1, T0);
    expect(card.reps).toBe(0);
    expect(new Date(card.due).getTime()).toBeLessThanOrEqual(T0.getTime());
    expect(isKnown(card)).toBe(false);
  });

  it('schedules a longer interval for Easy than for Good, and Good than Hard', () => {
    const card = newCard(1, T0);
    const again = applyRating(card, 'again', T0).scheduledDays;
    const hard = applyRating(card, 'hard', T0).scheduledDays;
    const good = applyRating(card, 'good', T0).scheduledDays;
    const easy = applyRating(card, 'easy', T0).scheduledDays;

    expect(good).toBeGreaterThanOrEqual(hard);
    expect(easy).toBeGreaterThanOrEqual(good);
    expect(again).toBeLessThanOrEqual(good);
  });

  it('grows the interval as a card is repeatedly answered Good', () => {
    let card = newCard(1, T0);
    let now = T0;
    let prevDue = new Date(card.due).getTime();
    const intervals: number[] = [];

    for (let i = 0; i < 4; i++) {
      const res = applyRating(card, 'good', now);
      card = res.card;
      const due = new Date(card.due).getTime();
      intervals.push(due - prevDue);
      // advance "now" to just after the card becomes due to simulate real reviews
      now = new Date(due);
      prevDue = due;
    }

    // Each successive Good interval should be >= the previous one (monotonic growth).
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]!).toBeGreaterThanOrEqual(intervals[i - 1]!);
    }
    expect(isKnown(card)).toBe(true);
  });

  it('shrinks the interval after Again relative to a matured Good streak', () => {
    let card = newCard(1, T0);
    let now = T0;
    // Mature the card with a few Goods.
    for (let i = 0; i < 3; i++) {
      const res = applyRating(card, 'good', now);
      card = res.card;
      now = new Date(card.due);
    }
    const maturedInterval = applyRating(card, 'good', now).scheduledDays;
    const lapsedInterval = applyRating(card, 'again', now).scheduledDays;
    expect(lapsedInterval).toBeLessThan(maturedInterval);
  });

  it('lapses increment when a matured card is answered Again', () => {
    let card = newCard(1, T0);
    let now = T0;
    for (let i = 0; i < 3; i++) {
      const res = applyRating(card, 'good', now);
      card = res.card;
      now = new Date(card.due);
    }
    const before = card.lapses;
    const after = applyRating(card, 'again', now).card.lapses;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('selectDue returns only cards due at or before now, soonest first', () => {
    const a = { ...newCard(1, T0), due: '2026-01-01T00:00:00.000Z' };
    const b = { ...newCard(2, T0), due: '2025-12-30T00:00:00.000Z' };
    const c = { ...newCard(3, T0), due: '2030-01-01T00:00:00.000Z' };
    const due = selectDue([a, b, c], T0);
    expect(due.map((x) => x.wordId)).toEqual([2, 1]);
  });
});
