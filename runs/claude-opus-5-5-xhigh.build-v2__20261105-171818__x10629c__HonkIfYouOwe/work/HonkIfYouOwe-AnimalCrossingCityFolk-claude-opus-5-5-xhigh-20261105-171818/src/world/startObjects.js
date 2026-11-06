// The village's starting population: about 55 trees, 6 rocks, flowers around homes, driftwood, shells.
import { Stream } from '../core/rng.js';
import { BUILDINGS, LAMPS, BENCHES, LANDMARKS } from '../data/town.js';
import { tileChar, tileInfo, key } from './tiles.js';

const FOOTPRINT_MARGIN = 1;
function occupied() {
  const s = new Set();
  for (const b of BUILDINGS) for (let z = b.z - FOOTPRINT_MARGIN; z < b.z + b.d + FOOTPRINT_MARGIN + 1; z++) for (let x = b.x - FOOTPRINT_MARGIN; x < b.x + b.w + FOOTPRINT_MARGIN; x++) s.add(`${x},${z}`);
  for (const [x, z] of [...LAMPS, ...BENCHES]) s.add(key(x, z));
  for (const [x, z] of Object.values(LANDMARKS)) s.add(key(x, z));
  return s;
}
const canPlant = (x, z, occ, objs, surface = 'lawn') => {
  if (occ.has(`${x},${z}`) || objs[`${x},${z}`]) return false;
  const c = tileChar(x, z);
  const info = tileInfo(c);
  return info.walk && info.surface === surface;
};
export function startObjects(seed) {
  const objs = {};
  const occ = occupied();
  const rng = new Stream(`${seed}:start`);
  const tree = (x, z, kind) => { if (canPlant(x, z, occ, objs, kind === 'palm' ? 'sand' : 'lawn')) { objs[`${x},${z}`] = { k: 'tree', kind, fruit: kind === 'pear' ? 3 : kind === 'palm' ? 2 : 0, regrow: 0, stage: 3, hits: 0 }; return true; } return false; };
  const scatter = (x0, z0, x1, z1, n, kind) => { let placed = 0, tries = 0; while (placed < n && tries++ < n * 40) { const x = rng.int(x0, x1), z = rng.int(z0, z1); if (Math.abs(x % 3) === 0 || rng.chance(0.4)) { if (tree(x, z, kind)) placed++; } } };
  scatter(3, 3, 15, 13, 12, 'pine'); // Pine Wood
  scatter(46, 2, 60, 9, 9, 'pear'); // Pear Orchard
  scatter(64, 17, 77, 21, 7, 'pine'); scatter(64, 28, 77, 33, 4, 'pine'); // Mossy Wood
  scatter(44, 17, 53, 18, 2, 'pear'); scatter(3, 17, 13, 24, 3, 'pear'); scatter(30, 3, 34, 13, 2, 'pine');
  scatter(14, 42, 15, 47, 1, 'pear'); scatter(47, 42, 50, 47, 2, 'pear'); scatter(60, 42, 62, 47, 1, 'pear'); scatter(3, 42, 13, 47, 3, 'pear'); scatter(34, 27, 37, 33, 2, 'pear');
  scatter(64, 50, 77, 55, 8, 'palm'); scatter(30, 50, 34, 54, 1, 'palm');
  const rockAt = [[10, 22], [36, 20], [47, 30], [63, 18], [12, 46], [60, 30], [36, 30], [75, 32]];
  for (const [x, z] of rockAt) if (canPlant(x, z, occ, objs)) objs[`${x},${z}`] = { k: 'rock', hits: 0 };
  // Flowers around homes
  const beds = [[16, 25, 0, 0], [18, 25, 1, 1], [22, 32, 1, 1], [19, 32, 0, 1], [29, 26, 2, 2], [33, 26, 2, 4], [49, 24, 3, 3], [53, 24, 2, 0], [59, 28, 2, 0], [63, 28, 2, 4], [69, 27, 0, 0], [73, 27, 3, 3], [63, 47, 3, 4], [68, 47, 1, 1], [72, 47, 0, 1], [77, 47, 2, 2], [66, 41, 1, 2], [74, 39, 0, 0], [14, 39, 3, 3], [47, 37, 1, 0]];
  for (const [x, z, species, color] of beds) if (canPlant(x, z, occ, objs) || canPlant(x, z, occ, objs, 'path')) objs[`${x},${z}`] = { k: 'flower', species, color, wet: 0, wilt: 0 };
  // Shells and driftwood
  for (const [x, z] of [[17, 53], [52, 52], [66, 56]]) if (canPlant(x, z, occ, objs, 'sand')) objs[`${x},${z}`] = { k: 'driftwood', item: 'driftLog' };
  return objs;
}
