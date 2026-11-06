/**
 * @file Still Pond's lures (PLAN.md section 6), in order of escalation: the page shows each by id, and the sim knows
 * only its id and how long it stays. A new lure is a new row (and a page handler, and a line).
 *
 * Game code, sim-side data.
 *
 * @example
 * LURES[0].id; // 'press'
 */

/** A lure. */
export interface Lure {
  id: string;
  /** How long it stays, s. */
  stays: number;
  /** Who speaks, if anyone. */
  who?: string;
  /** Whether the Frog or the Gull comes. */
  critter?: 'frog' | 'gull';
}

/** The lures, escalating. */
export const LURES: readonly Lure[] = [
  { id: 'press', stays: 3.5 },
  { id: 'psst', stays: 4, who: 'tare' },
  { id: 'stone', stays: 3.5, who: 'bex' },
  { id: 'frog', stays: 6, critter: 'frog' },
  { id: 'pause', stays: 4 },
  { id: 'gull', stays: 6, critter: 'gull' },
  { id: 'disconnected', stays: 4 },
  { id: 'wrong', stays: 3.5, who: 'plumb' },
  { id: 'credits', stays: 5 },
];
