// What a map character means. Pure: used by collision, nav, terrain and tests.
import { TOWN_ROWS } from '../data/townMap.js';

export const COLS = 80, ROWS = 64;
const T = {
  '.': { surface: 'lawn', h: 0, walk: true },
  ':': { surface: 'lawn', h: 2, walk: true },
  '=': { surface: 'path', h: 0, walk: true },
  '"': { surface: 'path', h: 2, walk: true },
  _: { surface: 'plaza', h: 0, walk: true },
  s: { surface: 'sand', h: 0, walk: true },
  '~': { water: 'sea', h: -1, walk: false },
  w: { water: 'river', h: -1, walk: false },
  o: { water: 'pond', h: -1, walk: false },
  m: { water: 'mouth', h: -1, walk: false },
  t: { water: 'sea', h: -1, walk: false },
  W: { water: 'river', h: 1.2, walk: false, high: true },
  f: { surface: 'cliff', h: 2, walk: false, fall: true },
  B: { surface: 'dock', h: 2.04, walk: true, bridge: true },
  '^': { surface: 'path', h: 0, walk: true, ramp: true },
  b: { surface: 'dock', h: 0.04, walk: true, bridge: true },
  d: { surface: 'dock', h: 0.04, walk: true, bridge: true },
  C: { surface: 'lawn', h: 2, walk: false, cliff: true },
  '#': { surface: 'lawn', h: 0, walk: false, ring: true },
  H: { surface: 'lawn', h: 2, walk: false, ring: true },
};
export const tileInfo = (c) => T[c] ?? T['#'];
export const tileChar = (x, z) => (x < 0 || z < 0 || x >= COLS || z >= ROWS ? '#' : TOWN_ROWS[z][x]);
export const tileAt = (x, z) => tileChar(Math.floor(x), Math.floor(z));

/** The ground's height at a point: a pure function. Ramps run from the terrace (north) to the ground (south). */
export function groundHeight(x, z) {
  const c = tileAt(x, z);
  if (c === '^') {
    const z0 = Math.floor(z);
    let top = z0;
    while (tileChar(Math.floor(x), top - 1) === '^') top--;
    let bottom = z0;
    while (tileChar(Math.floor(x), bottom + 1) === '^') bottom++;
    const t = (z - top) / (bottom + 1 - top);
    return 2 * (1 - t);
  }
  const info = tileInfo(c);
  return info.h;
}
export const isWaterTile = (x, z) => !!tileInfo(tileAt(x, z)).water;
export const waterKind = (x, z) => tileInfo(tileAt(x, z)).water ?? null;
export const walkableTile = (x, z) => tileInfo(tileAt(x, z)).walk === true;
export const acreOf = (x, z) => ({ col: Math.min(4, Math.max(0, Math.floor(x / 16))), row: Math.min(3, Math.max(0, Math.floor(z / 16))) });
export const key = (x, z) => `${Math.floor(x)},${Math.floor(z)}`;
export const unkey = (k) => k.split(',').map(Number);
