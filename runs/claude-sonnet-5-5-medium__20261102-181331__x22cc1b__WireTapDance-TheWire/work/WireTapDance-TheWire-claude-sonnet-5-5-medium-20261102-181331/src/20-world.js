/* ============================================================================
 * the district: a 56 x 40 block of east-side Baltimore-flavoured rowhouses, one low-rise courtyard, one detail office
 * ========================================================================== */
const MW = 56, MH = 40;
function buildRows() {
  const g = []; for (let y = 0; y < MH; y++) g.push(new Array(MW).fill('#'));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };
  const put = (x, y, ch) => { g[y][x] = ch; };
  // streets: the avenue (4 lanes), its sidewalks, the cross street, the south service road
  fill(1, 11, 54, 11, ','); fill(1, 12, 54, 15, 'a'); fill(1, 16, 54, 16, ',');
  fill(26, 17, 26, 35, ','); fill(27, 17, 29, 35, 'a'); fill(30, 17, 30, 35, ',');
  fill(1, 35, 54, 35, ','); fill(1, 36, 54, 38, 'a');
  // the detail office (an old courthouse annex basement) and the box beside it
  fill(2, 2, 15, 9, 'i'); fill(7, 10, 8, 10, 'i');
  fill(16, 5, 17, 5, 'i'); fill(18, 2, 23, 9, 't');
  // the rowhouse block: a laundromat, Ruthie's bar, the alley behind them
  fill(4, 18, 11, 23, 't'); fill(7, 17, 8, 17, 't');
  fill(14, 18, 21, 23, 'i'); fill(17, 17, 18, 17, 'i');
  fill(2, 25, 25, 26, 'a');
  // the low-rises: a ring of tall brick around the Pit, with three ways in
  fill(31, 17, 53, 34, 'R'); fill(35, 21, 49, 31, 'p');
  fill(41, 17, 43, 20, 'p'); fill(31, 25, 34, 27, 'p'); fill(41, 32, 43, 34, 'p');
  // cover and clutter: dumpsters stand chest high, fences are low enough to vault
  for (const [x, y] of [[38, 23], [39, 23], [46, 22], [47, 22], [37, 29], [37, 30], [46, 30], [45, 30], [41, 24], [44, 28]]) put(x, y, 'c');
  for (const [x, y] of [[40, 32], [44, 32], [13, 25]]) put(x, y, 'f');
  fill(7, 25, 7, 25, 'c'); fill(19, 25, 19, 25, 'c'); fill(5, 26, 5, 26, 'c');
  fill(23, 15, 25, 15, 'v'); fill(36, 14, 38, 14, 'v'); fill(3, 14, 5, 14, 'v');
  fill(2, 26, 2, 26, 'f'); fill(2, 25, 2, 25, 'f');
  // the people
  const S = (x, y, ch) => put(x, y, ch);
  S(8, 8, '@'); S(4, 4, 'K'); S(13, 8, 'U'); S(12, 3, 'b'); S(19, 5, 'X'); S(22, 5, 'Z');
  S(13, 16, 'P'); S(21, 16, 'T'); S(24, 16, 'V'); S(20, 26, 'n');
  S(42, 27, 'L'); S(38, 25, 'S'); S(46, 26, 'D');
  for (const [x, y] of [[36, 22], [49, 22], [36, 30], [49, 30], [42, 19]]) S(x, y, 'h');
  S(15, 11, 'q'); S(42, 33, 'G'); S(3, 25, 'M');
  S(10, 16, 'n'); S(34, 16, 'n'); S(28, 28, 'n'); S(46, 35, 'n'); S(22, 11, 'n'); S(6, 11, 'n');
  return g.map(r => r.join(''));
}
const FLOORS = ',a'.split('');
const LEGEND = {
  '#': 1, R: 2, c: 3, f: 4, v: 5,
  ',': { floor: 'walk' }, a: { floor: 'road' }, i: { floor: 'wood' }, t: { floor: 'tile' }, p: { floor: 'pit' },
  '@': { floor: 'wood', spawn: 'hero' }, K: { floor: 'wood', spawn: 'kowalczyk' }, U: { floor: 'wood', spawn: 'pruitt' }, b: { floor: 'wood', spawn: 'board' },
  X: { floor: 'tile', spawn: 'boxhero' }, Z: { floor: 'tile', spawn: 'boxsuspect' },
  P: { floor: 'walk', spawn: 'payphone' }, T: { floor: 'walk', spawn: 'tooley' }, V: { floor: 'walk', spawn: 'van' }, n: { floor: 'walk', spawn: 'walker' },
  L: { floor: 'pit', spawn: 'lorne' }, S: { floor: 'pit', spawn: 'sweets' }, D: { floor: 'pit', spawn: 'dray' }, h: { floor: 'pit', spawn: 'hopper' },
  q: { floor: 'walk', spawn: 'hopper2' }, G: { floor: 'pit', spawn: 'gate' }, M: { floor: 'road', spawn: 'deadend' }
};
const WALL_TYPES = {
  1: { h: 50, top: '#3d3433', side: '#7b4b3b', face: 'brick', roof: 'tiles', windows: { w: 6, h: 9, every: 16, from: 12, step: 18, glass: '#2a2a30', lit: .3 }, door: { w: 7, h: 13, color: '#4a2f22', chance: .15 }, cut: true },
  2: { h: 84, top: '#4a4540', side: '#8a5a44', face: 'brick', roof: 'slab', windows: { w: 6, h: 9, every: 16, from: 10, step: 20, glass: '#26262e', lit: .22 }, cut: true },
  3: { h: 24, top: '#2f4a38', side: '#35523f', face: 'plank', roof: 'plain' },
  4: { h: 12, top: '#7c8084', side: '#5c6064', face: 'none', roof: 'plain' },
  5: { h: 22, top: '#3b4a5c', side: '#2c3846', face: 'none', roof: 'plain' }
};
function rng2(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/** the ground: asphalt with cracks and lane paint, sidewalk slabs, worn boards, institutional tile, concrete court */
function floorTex(x, y, tag) {
  const n = rng2(Math.floor(x), Math.floor(y)), n2 = rng2(Math.floor(x / 3), Math.floor(y / 3), 7), cx = Math.floor(x / 16), cy = Math.floor(y / 16);
  switch (tag) {
    case 'road': {
      let v = 52 + n * 9 + n2 * 5, r = v, gc = v + 1, b = v + 4;
      if (cx >= 1 && cx <= 54 && cy >= 12 && cy <= 15 && (cy === 13 || cy === 14) && Math.abs((y % 32) - 16) < 1.2 && (x % 32) < 18 && cy === 13) { r = 170; gc = 150; b = 70; }
      if (n > .985) { r -= 14; gc -= 14; b -= 12; }
      return [r, gc, b];
    }
    case 'walk': { const jx = (x % 16 < 1 || y % 16 < 1) ? -22 : 0, v = 118 + n * 12 + n2 * 8 + jx; return [v, v - 2, v - 8]; }
    case 'wood': { const row = Math.floor(y / 4), v = 92 + rng2(row, Math.floor(x / 22)) * 20 + (y % 4 < 1 ? -20 : 0); return [v + 16, v - 6, v - 36]; }
    case 'tile': { const chk = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) ? 0 : 1, v = 138 + chk * 28 + n * 8; return [v - 14, v - 6, v - 22]; }
    case 'pit': { const v = 96 + n * 10 + n2 * 10 + (((x % 24) < 1 || (y % 24) < 1) ? -18 : 0); return [v, v - 4, v - 10]; }
    default: return [70, 66, 70];
  }
}
function makeMap() {
  return new E.TileMap({ rows: buildRows(), legend: LEGEND, types: WALL_TYPES, floorTex, ao: 5, outside: '#14121a' });
}
/** set dressing that lives in the world, not the map: [prop name or shape id, x, y, options] in cells */
function dressing() {
  const P = [];
  const lamp = (cx, cy) => P.push({ k: 'prop', n: 'streetlamp', x: cx, y: cy, light: true });
  for (const cx of [4, 12, 20, 34, 46, 52]) lamp(cx, 11.2);
  for (const cy of [20, 30]) lamp(30.4, cy);
  for (const [cx, cy] of [[6, 35.4], [26, 35.4], [44, 35.4]]) lamp(cx, cy);
  lamp(42.5, 20.6); lamp(37, 26); lamp(47, 26); lamp(42.5, 31.5);
  for (const [cx, cy] of [[9.5, 16.2], [24.5, 11.4], [32, 16.3], [47, 16.3]]) P.push({ k: 'prop', n: 'hydrant', x: cx, y: cy });
  for (const [cx, cy] of [[11, 16.3], [3, 11.5], [39, 11.4], [26.5, 24.5], [36.5, 20.5], [48.5, 31.2]]) P.push({ k: 'prop', n: 'trashcan', x: cx, y: cy });
  P.push({ k: 'prop', n: 'firedrum', x: 40.5, y: 28.2, light: true }, { k: 'prop', n: 'firedrum', x: 14.5, y: 24.4, light: true });
  P.push({ k: 'prop', n: 'sign', x: 7.5, y: 16.3, text: 'WASH' }, { k: 'prop', n: 'sign', x: 17.5, y: 16.3, text: 'RUTHIE’S' });
  P.push({ k: 'prop', n: 'awning', x: 7.5, y: 17.1 }, { k: 'prop', n: 'awning', x: 17.5, y: 17.1 });
  for (const [cx, cy, f] of [[43.2, 27.8, 1.57], [38, 28.5, 0], [48, 25, 3.1]]) P.push({ k: 'shape', n: 'bench', x: cx, y: cy, facing: f });
  for (const [cx, cy] of [[34.6, 33.6], [49.4, 33.6], [32.8, 21.5]]) P.push({ k: 'prop', n: 'trashcan', x: cx, y: cy });
  // detail office
  for (const [cx, cy, f] of [[5, 6, 0], [9, 5.5, 0], [4, 9, 1.57]]) P.push({ k: 'shape', n: 'table', x: cx, y: cy, facing: f });
  for (const [cx, cy, f] of [[5.2, 7.4, 3.1], [9.3, 6.9, 3.1], [6.2, 5, 1.2]]) P.push({ k: 'shape', n: 'chair', x: cx, y: cy, facing: f });
  P.push({ k: 'shape', n: 'bookcase', x: 2.6, y: 3, facing: 1.57 }, { k: 'shape', n: 'shelf', x: 15, y: 4, facing: 3.1 });
  P.push({ k: 'prop', n: 'lamp', x: 9, y: 5, light: true }, { k: 'prop', n: 'lamp', x: 5, y: 5, light: true }, { k: 'prop', n: 'lamp', x: 20.5, y: 4, light: true });
  P.push({ k: 'shape', n: 'table', x: 20.5, y: 5.5, facing: 1.57 }, { k: 'shape', n: 'chair', x: 19.4, y: 5.5, facing: 0 }, { k: 'shape', n: 'chair', x: 22.2, y: 5.5, facing: 3.14 });
  // laundromat and Ruthie's
  for (const [cx, cy] of [[5, 19], [6.5, 19], [8, 19], [9.5, 19]]) P.push({ k: 'shape', n: 'barrel', x: cx, y: cy });
  for (const [cx, cy, f] of [[15.5, 19.5, 0], [19.5, 19.5, 0], [15.5, 22, 0], [19.5, 22, 0]]) P.push({ k: 'shape', n: 'table', x: cx, y: cy, facing: f });
  P.push({ k: 'prop', n: 'lamp', x: 8, y: 21, light: true }, { k: 'prop', n: 'lamp', x: 17.5, y: 21, light: true });
  P.push({ k: 'prop', n: 'crate', x: 5, y: 22 }, { k: 'prop', n: 'crate', x: 10.4, y: 22.2 });
  return P;
}
/** the chase: where Dray runs, in cells, ending at the dead-end fence of the alley */
const CHASE_ROUTE = [[42, 35.5], [31, 35.5], [28.5, 33], [28.5, 27.5], [24, 25.5], [14, 25.5], [4, 25.5]];
/** hopper posts: base facing (radians, 0 = east, +y south) and how far each sweeps */
const HOPPER_POSTS = [
  { name: 'Pooch', cx: 36, cy: 22, face: .8, sweep: 1.0, speed: .6 },
  { name: 'Man-Man', cx: 49, cy: 22, face: 2.3, sweep: .9, speed: .5 },
  { name: 'Tay', cx: 36, cy: 30, face: -.7, sweep: .9, speed: .55 },
  { name: 'Roach', cx: 49, cy: 30, face: -2.3, sweep: .8, speed: .65 },
  { name: 'Lil Moe', cx: 42, cy: 19, face: 1.57, sweep: 1.0, speed: .7 },
  { name: 'Dink', cx: 15, cy: 11, face: 1.35, sweep: .75, speed: .5, avenue: true }
];
