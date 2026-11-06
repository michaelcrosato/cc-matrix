/**
 * @file Courses as data: Paddle Glide's gates round the lagoon and Island Jog's coast path. Adding a route is adding a row.
 */
export const LAGOON_RADIUS = 16;

/** Paddle Glide's twelve gates, as angles round the lagoon, turned so the first is ahead of the launch. */
export const GATES = 12;

/** Island Jog's coast path, past every landmark, clockwise from the pier. */
export const COAST: readonly (readonly [number, number])[] = [
  [8, 84], [36, 80], [58, 72], [76, 56], [86, 36], [88, 12], [86, -14], [76, -40], [58, -58], [36, -68], [14, -74],
  [-12, -74], [-36, -66], [-58, -50], [-78, -30], [-90, -6], [-88, 18], [-76, 36], [-52, 52], [-30, 66], [-10, 80],
]; // prettier-ignore
