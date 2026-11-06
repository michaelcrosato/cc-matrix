// The village map, authored as data and generated from regions. 1 tile = 1 m. Fronts and doors face south.
import { seeded } from '../core/rng.js';
import { NEIGHBOURS } from '../data/neighbours.js';
export const TW = 80, TD = 64;
export const T = { GRASS: 0, PATH: 1, WATER: 2, SEA: 3, SAND: 4, BRIDGE: 5, PLAZA: 6, FOREST: 7, DOCK: 8 };
export const BLOCK_T = new Set([T.WATER, T.SEA, T.FOREST]);
// Buildings: footprint x,z,w,d; door tile is the bottom-middle tile of the footprint (walk into it).
const B = (id, x, z, w, d, kind, extra = {}) => ({ id, x, z, w, d, kind, door: [x + Math.floor(w / 2), z + d - 1], ...extra });
export const BUILDINGS = [
  B('bus', 2, 19, 4, 3, 'bus'), B('hall', 7, 16, 5, 4, 'hall'), B('museum', 12, 5, 6, 5, 'museum'), B('store', 36, 15, 5, 4, 'store'), B('mothwick', 43, 15, 5, 4, 'mothwick'),
  B('home', 45, 30, 4, 4, 'home'), B('lighthouse', 53, 34, 2, 2, 'lighthouse', { noDoor: true }),
  ...NEIGHBOURS.filter(n => n.id !== 'fitch').map(n => B(n.id, n.home[0], n.home[1], 3, 3, 'cottage', { owner: n.id })),
];
export const PLAZA = { x0: 16, z0: 18, x1: 26, z1: 26 };
export const SPAWNS = { bus: [4, 23], plaza: [21, 22], home: [46, 35], store: [38, 20], hall: [9, 21], museum: [14, 10], lookout: [54, 7], beach: [34, 38], dock: [38, 40] };
export const LANDMARKS = { oldPear: [21, 21], bell: [17.5, 19.5], notice: [24.5, 19.5], lookoutBench: [54, 6], lamp: [[17, 22], [25, 22], [40, 21], [9, 22], [46, 36]], bench: [[19, 25], [23, 25]] };
/** The Lookout hill: a +2 m plateau (a cliff ring, walkable top) with a ramp on its south side. */
export const HILLS = [
  { x0: 50, z0: 3, x1: 58, z1: 9, rampX0: 53, rampX1: 55, rampZ1: 10, h: 2 },   // the Lookout hill
  { x0: 6, z0: 3, x1: 24, z1: 11, rampX0: 14, rampX1: 16, rampZ1: 12, h: 2 },     // the upper terrace, with the Museum on it
];
export const HILL = HILLS[0];
export function groundHeight(x, z) {
  for (const H of HILLS) {
    if (x >= H.x0 && x <= H.x1 && z >= H.z0 && z <= H.z1 - 1) return H.h;
    if (x >= H.rampX0 && x <= H.rampX1 && z > H.z1 - 1 && z <= H.rampZ1) return Math.max(0, (H.rampZ1 - z) / (H.rampZ1 - (H.z1 - 1)) * H.h);
  }
  return 0;
}
export const onHill = (x, z) => HILLS.some(H => x >= H.x0 - 1 && x <= H.x1 + 1 && z >= H.z0 - 1 && z <= H.rampZ1 + 1);
export const DOCK = { x0: 36, z0: 40, x1: 39, z1: 44 };
export const ISLAND = { x0: 30, z0: 54, x1: 48, z1: 60 };
export const waterKind = (x, z) => { if (z >= 41) return 'sea'; if (z >= 36) return 'mouth'; if (x >= 25 && x <= 34 && z >= 27 && z <= 31) return 'pond'; return 'river'; };
export function buildTownTiles() {
  const g = new Uint8Array(TW * TD); const set = (x, z, v) => { if (x >= 0 && x < TW && z >= 0 && z < TD) g[z * TW + x] = v; };
  const get = (x, z) => (x < 0 || x >= TW || z < 0 || z >= TD) ? T.FOREST : g[z * TW + x];
  const fill = (x0, z0, x1, z1, v) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, z, v); };
  fill(0, 0, TW - 1, TD - 1, T.GRASS);
  fill(0, 0, TW - 1, 2, T.FOREST); fill(0, 0, 1, TD - 1, T.FOREST); fill(TW - 2, 0, TW - 1, TD - 1, T.FOREST);
  fill(2, 38, TW - 3, 40, T.SAND); fill(0, 41, TW - 1, TD - 1, T.SEA);
  fill(29, 3, 31, 40, T.WATER); fill(25, 27, 34, 31, T.WATER); fill(28, 36, 32, 40, T.WATER);
  // main road and plaza
  fill(2, 21, TW - 4, 22, T.PATH); fill(PLAZA.x0, PLAZA.z0, PLAZA.x1, PLAZA.z1, T.PLAZA);
  fill(DOCK.x0, DOCK.z0, DOCK.x1, DOCK.z1, T.DOCK); fill(37, 45, 38, 53, T.DOCK); fill(30, 53, 48, 60, T.GRASS); fill(29, 53, 49, 53, T.SAND); fill(29, 60, 49, 61, T.SAND); fill(29, 54, 29, 60, T.SAND); fill(49, 54, 49, 60, T.SAND); fill(37, 39, 38, 40, T.DOCK);
  const pathV = (x, z0, z1) => fill(x, Math.min(z0, z1), x, Math.max(z0, z1), T.PATH);
  const pathH = (z, x0, x1) => fill(Math.min(x0, x1), z, Math.max(x0, x1), z, T.PATH);
  for (const b of BUILDINGS) {
    if (b.noDoor) continue; const [dx, dz] = b.door;
    // path from the tile south of the door to the nearest road
    const sz = dz + 1; if (sz < 21) pathV(dx, sz, 21); else if (sz > 22) pathV(dx, 22, sz); else set(dx, sz, T.PATH);
  }
  pathH(11, 18, 28); pathH(11, 32, 44); pathV(24, 11, 18); pathV(40, 11, 14); pathV(29, 3, 10);
  pathV(52, 5, 8); pathH(8, 50, 54); pathH(30, 58, 72); pathV(66, 10, 30); fill(TW - 10, 38, TW - 6, 40, T.SAND); fill(5, 21, 5, 23, T.PATH);
  pathV(38, 36, 38); fill(33, 37, 40, 37, T.SAND);
  fill(29, 11, 31, 12, T.BRIDGE); fill(29, 21, 31, 22, T.BRIDGE);
  // footprints: forest-ish "blocked" via building list (not tile type); keep ground as grass under them
  for (const b of BUILDINGS) for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) if (get(x, z) === T.WATER || get(x, z) === T.FOREST) set(x, z, T.GRASS);
  return g;
}
/** Static features (initial world content): trees, rocks, flowers, planted deterministically. */
export function initialFeatures(seed = 1) {
  const r = seeded('town', seed); const tiles = buildTownTiles();
  const at = (x, z) => tiles[z * TW + x];
  const occ = new Set(); for (const b of BUILDINGS) for (let z = b.z - 1; z < b.z + b.d + 2; z++) for (let x = b.x - 1; x < b.x + b.w + 1; x++) occ.add(x + ',' + z);
  const free = (x, z, pad = 0) => { if (onHill(x, z)) return false; if (x < 3 || x > TW - 4 || z < 4 || z > 40) return false; for (let dz = -pad; dz <= pad; dz++) for (let dx = -pad; dx <= pad; dx++) { const t = at(x + dx, z + dz); if (t !== T.GRASS && t !== T.SAND) return false; if (occ.has((x + dx) + ',' + (z + dz))) return false; } return true; };
  const trees = [], rocks = [], flowers = [], used = new Set();
  const place = (list, n, kinds, pad, area = [3, 4, TW - 4, 38]) => { let tries = 0; while (list.length < n && tries++ < 4000) { const x = r.int(area[0], area[2]), z = r.int(area[1], area[3]); if (!free(x, z, pad) || used.has(x + ',' + z)) continue; used.add(x + ',' + z); list.push({ x, z, ...kinds(x, z) }); } };
  place(trees, 78, () => { const k = r.pick(['oak', 'oak', 'pine', 'pear', 'pear']); return { kind: k, fruit: k === 'pear' ? 3 : 0, stage: 3, hp: 3 }; }, 1, [3, 4, TW - 4, 36]);
  let palms = []; place(palms, 6, () => ({ kind: 'palm', fruit: 0, stage: 3, hp: 3 }), 0, [4, 38, TW - 5, 39]); trees.push(...palms);
  place(rocks, 8, () => ({ kind: 'rock', hp: 4 }), 1, [3, 4, TW - 4, 36]);
  for (const [x, z] of [[33, 57], [36, 59], [42, 56], [45, 58], [31, 55]]) { if (at(x, z) === T.GRASS) trees.push({ x, z, kind: 'palm', fruit: 0, stage: 3, hp: 3 }); }
  let id = 0; for (const t of trees) t.id = 't' + id++; id = 0; for (const k of rocks) k.id = 'r' + id++;
  for (const b of BUILDINGS) if (b.kind === 'cottage' || b.kind === 'home') { for (let i = 0; i < 4; i++) { const x = b.x + r.int(-1, b.w), z = b.z + b.d + r.int(1, 2); if (at(x, z) === T.GRASS && !used.has(x + ',' + z)) { used.add(x + ',' + z); flowers.push({ x, z, sp: r.int(0, 3), col: r.int(0, 3), wet: 0, age: 1 }); } } }
  return { tiles, trees, rocks, flowers };
}
export function blockedGrid(tiles, trees = [], rocks = []) {
  const bl = new Uint8Array(TW * TD);
  for (let i = 0; i < tiles.length; i++) if (BLOCK_T.has(tiles[i])) bl[i] = 1;
  for (const b of BUILDINGS) for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) bl[z * TW + x] = 1;
  for (const b of BUILDINGS) if (!b.noDoor) bl[b.door[1] * TW + b.door[0]] = 0;
  for (const H of HILLS) { for (let x = H.x0; x < H.x1; x++) for (const z of [H.z0, H.z1 - 1]) if (!(z === H.z1 - 1 && x >= H.rampX0 && x < H.rampX1)) bl[z * TW + x] = 1; for (let z = H.z0; z < H.z1; z++) { bl[z * TW + H.x0] = 1; bl[z * TW + H.x1 - 1] = 1; } }
  for (const t of trees) if (t.stage >= 1 && !t.felled) bl[t.z * TW + t.x] = 1;
  for (const k of rocks) if (!k.gone) bl[k.z * TW + k.x] = 1;
  return bl;
}
/** Flood fill from a start tile over unblocked tiles; returns a Set of indices. */
export function flood(bl, sx, sz) { const seen = new Set(); const q = [[sx, sz]]; seen.add(sz * TW + sx); while (q.length) { const [x, z] = q.pop(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= TW || nz >= TD) continue; const i = nz * TW + nx; if (bl[i] || seen.has(i)) continue; seen.add(i); q.push([nx, nz]); } } return seen; }
