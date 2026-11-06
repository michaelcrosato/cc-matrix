/**
 * @file Ranks, pebbles and Wobble Age. Every activity ends as a number from 0 to 1000. The words and the
 * pebbles hang off that number. Age is the morning check only, and it never talks about a body.
 */
import { clamp } from './wobble';

/** The rank words, from a quiet morning to a result the staff will not discuss. */
export const RANKS = ['Present', 'Adequate', 'Composed', 'Serene', 'Unsettling'] as const;

/** Pebbles a rank is worth before the multiplier. One is the least. Five is the most. */
const PEBBLES: Readonly<Record<string, number>> = {
  Present: 1,
  Adequate: 2,
  Composed: 3,
  Serene: 4,
  Unsettling: 5,
};

/** A score kept inside 0 to 1000. Anything that is not a finite number becomes 0. */
export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 1000);
}

/** The rank word for a score. Thresholds are 300, 550, 750 and 900. */
export function rankOf(score: number): string {
  const s = clampScore(score);
  if (s >= 900) return 'Unsettling';
  if (s >= 750) return 'Serene';
  if (s >= 550) return 'Composed';
  if (s >= 300) return 'Adequate';
  return 'Present';
}

/** Pebbles for a rank, scaled, and never fewer than one. They are not spent. */
export function pebblesOf(rank: string, mult: number): number {
  const base = PEBBLES[rank] ?? 1;
  const m = Number.isFinite(mult) ? mult : 1;
  return Math.max(1, Math.round(base * m));
}

/**
 * Wobble Age from a morning share `s` (0 to 1). `k` is `game.age.k`.
 * A perfect morning is 18. A morning with no share is 82.
 */
export function wobbleAge(s: number, k: number): number {
  const t = clamp(Number.isFinite(s) ? s : 0, 0, 1);
  const exp = Number.isFinite(k) ? k : 1.3;
  return Math.round(18 + 64 * Math.pow(1 - t, exp));
}

/** How today's age sits next to yesterday. The same number is still news. Today's number is always in the sentence. */
export function ageRemark(today: number, yesterday: number): string {
  if (!(yesterday > 0)) {
    return `Your Wobble Age is ${today}. Your first Wobble Age. We will pretend to be surprised tomorrow.`;
  }
  const d = yesterday - today;
  if (d > 0)
    return `Your Wobble Age is ${today}. Yesterday it was ${yesterday}. You stood still and time went backwards.`;
  if (d < 0) return `Your Wobble Age is ${today}. Yesterday it was ${yesterday}. The island has noted the difference.`;
  return `Your Wobble Age is ${today}. Yesterday it was ${today}. Consistency is a kind of wobble.`;
}

/** The book id for today's age beside yesterday. The page says the words. The number lives in `ageRemark`. */
export function ageLine(today: number, yesterday: number): string {
  if (!(yesterday > 0)) return 'age.first';
  if (yesterday > today) return 'age.down';
  if (yesterday < today) return 'age.up';
  return 'age.same';
}
