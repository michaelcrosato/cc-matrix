/**
 * @file What lies around the island: the 12 plaques, the 20 hidden pebbles, the benches and the props that dress each
 * station, as plain rows. Heights come from the ground at run time. Add a row, get a thing.
 */
export const PLAQUES: readonly (readonly [number, number])[] = [
  [10, 44], [-14, 30], [-40, 8], [-62, -4], [42, 12], [60, 34], [-48, 74], [24, -38], [-10, -72], [52, 74], [70, -46], [64, -2],
]; // prettier-ignore

export const HIDDEN_PEBBLES: readonly (readonly [number, number])[] = [
  [26, 60], [-26, 56], [-74, 30], [-84, 2], [-52, -38], [-24, -60], [16, -62], [52, -30], [78, -24], [82, 18],
  [72, 40], [46, 62], [10, 78], [-14, 72], [-36, 44], [-20, 12], [20, 16], [34, -14], [-30, -18], [6, -30],
]; // prettier-ignore

export const BENCHES: readonly (readonly [number, number, number])[] = [
  [12, 22, 0], [-30, 34, 1.2], [38, 40, -1.2], [8, -56, 3.1], [-66, 40, 1.8],
]; // prettier-ignore

/** Static dressing: [prop, x, z, yaw]. */
export const DRESSING: readonly (readonly [string, number, number, number])[] = [
  ['prop:platform', 0, 28, 0], ['prop:noticeboard', 12, 34, -1.57], ['prop:drinksTable', -11, 40, 0],
  ['prop:pavilion', -52, 18, 0], ['prop:jettyPosts', -70, -14, 0], ['prop:annex', 52, 22, 0],
  ['prop:hut', 64, 52, 3.1], ['prop:hut', 74, 58, 2.6], ['prop:hut', 54, 60, 3.4],
  ['prop:ferryPier', 0, 96, 0], ['prop:lighthouse', 84, -60, 0], ['prop:centreStone', 0, 0, 0],
  ['prop:sandTerrace', 30, -48, 0], ['prop:eastTerrace', 74, 8, 0], ['prop:cliffLip', 0, -88, 0],
  ['prop:parasol', 58, 90, 0], ['prop:parasol', 70, 86, 1], ['prop:lounger', 62, 92, 0.2], ['prop:lounger', 74, 88, -0.4],
  ['prop:palm', -18, 46, 0], ['prop:palm', 22, 50, 1], ['prop:palm', -70, 64, 2], ['prop:palm', -40, 66, 0.5], ['prop:palm', 84, 40, 3],
  ['prop:palm', 44, 70, 1.4], ['prop:palm', 16, 72, 4], ['prop:palm', -16, 66, 2], ['prop:palm', 70, 20, 1], ['prop:palm', -74, 8, 4],
  ['prop:rock', -44, 84, 0], ['prop:rock', 40, -70, 1], ['prop:rock', -70, -50, 2], ['prop:rock', 90, 0, 3], ['prop:rock', -92, 30, 4],
  ['prop:rock', 18, -82, 5], ['prop:rock', -20, -84, 0.6], ['prop:rock', 70, 72, 2.2],
]; // prettier-ignore
