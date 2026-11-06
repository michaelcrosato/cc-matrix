/**
 * @file The water and land courses (PLAN.md section 6): Paddle Glide's twelve gates round the lagoon and the coast path's
 * ring of flags. Each a table; a new course is a new table.
 *
 * Game code, sim-side data.
 *
 * @example
 * GATES.length; // 12
 */

/** Paddle Glide's course: a circle out in the lagoon, its centre and radius. */
export const LAGOON = { x: -82, z: 128, radius: 30 } as const;

/** The twelve gates, as angles round the lagoon. */
export const GATES: readonly number[] = Array.from(
  { length: 12 },
  (_v, i) => Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 12,
);

/** The coast path, in order: past every landmark and back to the Plaza. */
export const COAST: readonly (readonly [number, number])[] = [
  [8, 44], [22, 62], [34, 78], [52, 76], [66, 72], [82, 58], [90, 36], [90, 12], [92, -12], [84, -38], [64, -56],
  [40, -66], [18, -66], [-4, -66], [-26, -64], [-50, -52], [-76, -34], [-92, -8], [-94, 20], [-82, 48], [-60, 66],
  [-36, 76], [-14, 66], [-4, 48],
]; // prettier-ignore
