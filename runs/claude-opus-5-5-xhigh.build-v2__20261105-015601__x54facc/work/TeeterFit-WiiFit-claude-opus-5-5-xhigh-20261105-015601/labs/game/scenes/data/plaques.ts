/**
 * @file The twelve "Did you know?" plaques, and the twenty hidden pebbles. The plaques' places are their Day 1 places:
 * each creeps a little downhill every night.
 *
 * Game code, sim-side data.
 *
 * @example
 * PLAQUES.length; // 12
 */

/** A plaque's Day 1 place. */
export const PLAQUES: readonly (readonly [number, number])[] = [
  [-10, 22], [14, 44], [-38, 30], [40, 40], [-58, -2], [-74, 8], [20, -32], [44, -56], [-10, -56], [66, 66], [-30, 72], [62, -30],
]; // prettier-ignore

/** The hidden pebbles' places. */
export const HIDDEN_PEBBLES: readonly (readonly [number, number])[] = [
  [-20, 8], [24, 10], [-6, -24], [-62, 34], [72, 34], [78, 58], [52, 72], [-30, 88], [14, 92], [-80, 56],
  [-92, 4], [-52, -34], [12, -60], [34, -66], [60, -46], [92, -12], [86, 22], [-16, 52], [32, 64], [0, -38],
]; // prettier-ignore
