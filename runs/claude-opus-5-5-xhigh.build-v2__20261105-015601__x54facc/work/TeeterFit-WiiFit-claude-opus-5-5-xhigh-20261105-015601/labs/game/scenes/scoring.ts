/**
 * @file Scores, ranks, pebbles and the Wobble Age (PLAN.md sections 3 and 5). Pure functions.
 *
 * Game code, sim-side.
 *
 * @example
 * rankOf(760); // 'Serene'
 * wobbleAge(1, 1.3); // 18
 */

/** The ranks from the bottom, each with the score it starts at. */
export const RANKS: readonly { name: string; from: number; pebbles: number }[] = [
  { name: 'Present', from: 0, pebbles: 1 },
  { name: 'Adequate', from: 300, pebbles: 2 },
  { name: 'Composed', from: 550, pebbles: 3 },
  { name: 'Serene', from: 750, pebbles: 4 },
  { name: 'Unsettling', from: 900, pebbles: 5 },
];

/** The rank a score earns. */
export function rankEntry(score: number): { name: string; from: number; pebbles: number } {
  let found = RANKS[0];
  for (const rank of RANKS) if (score >= rank.from) found = rank;
  return found;
}

/** The rank's name. */
export const rankOf = (score: number): string => rankEntry(score).name;

/** Pebbles a score earns, before the dev multiplier. */
export const pebblesOf = (score: number): number => rankEntry(score).pebbles;

/** The Wobble Age for a share `s` in 0 to 1: 18 at best, 82 at worst. */
export function wobbleAge(s: number, k: number): number {
  const clamped = Math.min(1, Math.max(0, s));
  return Math.round(18 + 64 * Math.pow(1 - clamped, k));
}

/** A score kept within 0 to 1000 and whole. */
export const clampScore = (score: number): number => Math.round(Math.min(1000, Math.max(0, score)));
