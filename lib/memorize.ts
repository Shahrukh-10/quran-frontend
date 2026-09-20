// Memorization scheduler — SM-2 spaced repetition algorithm applied to Quran ayat.
//
// Each ayah the user adds to memorization becomes a "card" with:
//   - interval: number of days until next review
//   - ease: multiplier applied to interval on "good" reviews (default 2.5)
//   - dueDate: ISO date when the card is next due
//   - reviews: history of past ratings
//
// Rating rules (based on Anki's SM-2, simplified):
//   - "again": interval → 1 day, ease -= 0.2 (min 1.3)
//   - "hard":  interval *= 1.2, ease -= 0.15
//   - "good":  interval *= ease
//   - "easy":  interval *= ease * 1.3, ease += 0.15
// New cards (never reviewed) start with interval=1, ease=2.5.
//
// This module is PURE — no localStorage side-effects. The client component
// or server helper that calls it handles persistence. Makes it easy to
// unit-test in Vitest.

export type Rating = "again" | "hard" | "good" | "easy";

export type MemoCard = {
  /** Verse key, e.g. "1:1". */
  verseKey: string;
  /** Timestamp added (ms since epoch). */
  addedAt: number;
  /** Current interval in days. 0 means "not yet reviewed" (still 1-day). */
  interval: number;
  /** Ease factor, min 1.3, default 2.5 (Anki convention). */
  ease: number;
  /** Next review due date, ISO yyyy-mm-dd. */
  dueDate: string;
  /** Compact rating history — most recent first, max 20 entries retained. */
  reviews: Array<{ at: number; rating: Rating }>;
};

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_HISTORY = 20;

function isoDay(offsetDays = 0, base: Date = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Create a fresh card. Due today, so it appears in the first review session. */
export function createCard(verseKey: string, now: number = Date.now()): MemoCard {
  return {
    verseKey,
    addedAt: now,
    interval: 0,
    ease: DEFAULT_EASE,
    dueDate: isoDay(0, new Date(now)),
    reviews: [],
  };
}

/**
 * Apply a rating to a card. Returns the NEW card (immutable) with updated
 * interval, ease, dueDate, and pushed review entry.
 */
export function rateCard(
  card: MemoCard,
  rating: Rating,
  now: number = Date.now(),
): MemoCard {
  let interval = card.interval;
  let ease = card.ease;

  // First review — cards start at interval=0. Treat any successful rating as
  // moving to interval=1 (again = 1 day, hard/good/easy compound from there).
  const firstReview = interval === 0;

  switch (rating) {
    case "again":
      interval = 1;
      ease = Math.max(MIN_EASE, ease - 0.2);
      break;
    case "hard":
      interval = Math.max(1, Math.round((firstReview ? 1 : interval) * 1.2));
      ease = Math.max(MIN_EASE, ease - 0.15);
      break;
    case "good":
      interval = Math.max(1, Math.round((firstReview ? 1 : interval) * ease));
      break;
    case "easy":
      interval = Math.max(1, Math.round((firstReview ? 1 : interval) * ease * 1.3));
      ease = ease + 0.15;
      break;
  }

  const nextReviews = [{ at: now, rating }, ...card.reviews].slice(0, MAX_HISTORY);

  return {
    ...card,
    interval,
    ease,
    dueDate: isoDay(interval, new Date(now)),
    reviews: nextReviews,
  };
}

/** All cards due on or before today. */
export function dueCards(cards: MemoCard[], today: string = isoDay(0)): MemoCard[] {
  return cards.filter((c) => c.dueDate <= today);
}

/**
 * Bucketed status counts for the dashboard.
 * - new: never reviewed
 * - learning: interval < 7 days
 * - mature: interval >= 21 days
 * - reviewing: 7 <= interval < 21
 */
export function cardStats(cards: MemoCard[]) {
  let brand_new = 0;
  let learning = 0;
  let reviewing = 0;
  let mature = 0;
  for (const c of cards) {
    if (c.reviews.length === 0) brand_new++;
    else if (c.interval < 7) learning++;
    else if (c.interval < 21) reviewing++;
    else mature++;
  }
  return { new: brand_new, learning, reviewing, mature, total: cards.length };
}
