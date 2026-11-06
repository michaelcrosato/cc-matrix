/**
 * @file The Programme (PLAN.md section 5) as a table: each day's items in order. An item is an activity id, or `walk` for
 * the Day 1 stroll to the Noticeboard. Also the rank table and everything a threshold unlocks. Adding a day is adding a row.
 */
export const DAYS: readonly (readonly string[])[] = [
  ['check', 'poseA', 'pond', 'walk'],
  ['check', 'reps', 'garden', 'poseB'],
  ['check', 'paddle', 'line', 'step'],
  ['check', 'hoop', 'plunge', 'jog'],
  ['check', 'group', 'poseC', 'tilt'],
];

/** Every activity a player can replay, in Noticeboard order. */
export const BOARD: readonly string[] = [
  'check',
  'poseA',
  'poseB',
  'poseC',
  'pond',
  'reps',
  'step',
  'line',
  'paddle',
  'garden',
  'plunge',
  'hoop',
  'jog',
  'group',
];

/** Ranks from the bottom; a score reaches each at its floor. */
export const RANKS = [
  { floor: 0, name: 'Present', pebbles: 1 },
  { floor: 300, name: 'Adequate', pebbles: 2 },
  { floor: 550, name: 'Composed', pebbles: 3 },
  { floor: 750, name: 'Serene', pebbles: 4 },
  { floor: 900, name: 'Unsettling', pebbles: 5 },
] as const;

/** The rank a score earns. */
export function rankOf(score: number): (typeof RANKS)[number] {
  let at: (typeof RANKS)[number] = RANKS[0];
  for (const rank of RANKS) if (score >= rank.floor) at = rank;
  return at;
}

/** The Wobble Age from a score of 0 to 1. */
export const ageOf = (s: number, k: number): number =>
  Math.round(18 + 64 * Math.pow(Math.max(0, Math.min(1, 1 - s)), k));

/** What the cairn unlocks, by pebbles. */
export const UNLOCKS = [
  { at: 10, id: 'expert' },
  { at: 20, id: 'colours' },
  { at: 30, id: 'headband' },
  { at: 40, id: 'stamps' },
] as const;
