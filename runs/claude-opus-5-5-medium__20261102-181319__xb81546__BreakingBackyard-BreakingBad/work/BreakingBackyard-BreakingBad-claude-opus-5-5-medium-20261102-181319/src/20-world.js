/* ---------------- the world: Las Brujas, New Mexico (a grid of blocks, built as rows for a TileMap) ---------------- */
const T = 16, C = c => c * T + T / 2;   // a cell's centre in world units
const TW = 60, TH = 44;
const ROADH = [10, 24, 36], ROADV = [14, 32, 48];
const BLOCKS = { A: [16, 0, 31, 9], B: [34, 0, 47, 9], C: [50, 0, 59, 9], E: [16, 12, 31, 23], F: [34, 12, 47, 23], G: [50, 12, 59, 23],
  H: [16, 26, 31, 35], I: [34, 26, 47, 35], J: [50, 26, 59, 35], K: [16, 38, 31, 43], M: [34, 38, 47, 43], N: [50, 38, 59, 43] };
const WALLTYPES = {
  1: { h: 30, top: '#a8583a', side: '#d8c8a8', face: 'plaster', roof: 'tiles', cut: true },          // houses: stucco, terracotta
  2: { h: 36, top: '#7a746a', side: '#c8b088', face: 'plaster', roof: 'slab', cut: true },            // commercial: tan stucco, flat roof
  3: { h: 10, top: '#c8b898', side: '#b8a888', face: 'plaster', roof: 'slab' },                       // low adobe wall
  4: { h: 13, top: '#4a6a32', side: '#3a5a2a', face: 'hedge', roof: 'leaves' },                       // hedge
  5: { h: 18, top: '#6a5a4a', side: '#7a5a3a', face: 'rock', roof: 'speckle' },                       // junk heaps
  6: { h: 44, top: '#5a5e62', side: '#8a8e90', face: 'brick', roof: 'slab', cut: true },             // the industrial laundry
  7: { h: 22, top: '#8a7a6a', side: '#7a6a5a', face: 'brick', roof: 'slab' },                        // cinderblock wall
  8: { h: 30, top: '#4a7a9a', side: '#d8e4ec', face: 'plaster', roof: 'slab', cut: true }             // the car wash: white and blue
};
const grid = [], axis = [];
const put = (x, y, ch) => { if (x >= 0 && y >= 0 && x < TW && y < TH) grid[y][x] = ch; };
const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, ch); };
const frame = (x0, y0, x1, y1, ch) => { for (let x = x0; x <= x1; x++) { put(x, y0, ch); put(x, y1, ch); } for (let y = y0; y <= y1; y++) { put(x0, y, ch); put(x1, y, ch); } };
function buildTown() {
  for (let y = 0; y < TH; y++) { grid.push(new Array(TW).fill('.')); axis.push(new Array(TW).fill(null)); }
  // roads: two lanes, a yellow line between them; the west end runs out into the desert as dirt
  for (const r of ROADH) for (let x = 0; x < TW; x++) for (const yy of [r, r + 1]) { put(x, yy, x < 8 ? '_' : '='); axis[yy][x] = 'h' + (r + 1) * T; }
  for (const c of ROADV) for (let y = 0; y < TH; y++) for (const xx of [c, c + 1]) { const cross = grid[y][xx] === '='; put(xx, y, '='); axis[y][xx] = cross ? 'x' : 'v' + (c + 1) * T; }
  for (const k in BLOCKS) { const [x0, y0, x1, y1] = BLOCKS[k]; rect(x0, y0, x1, y1, ','); frame(x0, y0, x1, y1, '-'); }
  // A: the Gray residence, the backyard and its RV, the pool
  rect(17, 1, 22, 8, ','); rect(20, 2, 22, 7, 'p');
  for (let y = 1; y <= 8; y++) put(17, y, 'W'); for (let x = 17; x <= 22; x++) { put(x, 1, 'W'); if (x !== 19 && x !== 20) put(x, 8, 'W'); }
  rect(23, 2, 27, 6, '#'); rect(23, 7, 27, 7, 'p'); rect(28, 2, 30, 7, ',');
  // B: the neighbours
  rect(35, 2, 39, 6, '#'); rect(42, 2, 46, 6, '#'); for (let x = 40; x <= 41; x++) for (let y = 1; y <= 7; y++) put(x, y, y % 3 === 0 ? 'H' : ',');
  // C: the junkyard
  rect(51, 1, 58, 8, '_'); for (let x = 51; x <= 58; x++) { put(x, 1, 'K'); if (x < 53 || x > 55) put(x, 8, 'K'); } for (let y = 1; y <= 8; y++) { put(51, y, 'K'); put(58, y, 'K'); }
  for (const [x, y] of [[53, 3], [56, 3], [57, 4], [53, 6], [56, 6]]) put(x, y, 'J');
  // D: the desert (west): a few rock outcrops
  for (const [x, y] of [[3, 4], [4, 4], [9, 15], [2, 30], [3, 30], [10, 39]]) put(x, y, 'J');
  // E: the strip mall (a lawyer, a taco franchise) and its lot
  rect(17, 13, 30, 16, 'B'); rect(17, 17, 30, 17, '-'); rect(17, 18, 30, 22, ':');
  // F: Bubble Bros Car Wash
  rect(36, 13, 44, 15, 'C'); rect(35, 16, 46, 22, ':'); rect(35, 13, 35, 16, ':'); rect(45, 13, 46, 16, ':');
  // G: the park
  for (const [x, y] of [[52, 14], [57, 15], [52, 21], [57, 20]]) put(x, y, 'H');
  // H: houses
  rect(17, 27, 21, 31, '#'); rect(25, 27, 30, 31, '#'); rect(17, 32, 21, 33, 'p'); rect(25, 32, 30, 33, 'p');
  // I: Lavanderia Brillante, the industrial laundry
  rect(35, 27, 46, 32, 'L'); rect(35, 33, 46, 34, ':');
  // J: the Sunset Inn motel
  rect(51, 27, 58, 29, 'B'); rect(51, 30, 58, 34, ':');
  // K, M, N: the south side
  rect(18, 39, 22, 42, '#'); rect(25, 39, 29, 42, '#'); rect(36, 39, 40, 42, '#'); rect(52, 39, 57, 41, '#');
  return grid.map(r => r.join(''));
}
const TOWN_ROWS = buildTown();
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const shadeC = (c, k) => [clamp(c[0] + k, 0, 255), clamp(c[1] + k, 0, 255), clamp(c[2] + k, 0, 255)];
function floorTex(x, y, tag) {
  const xi = Math.floor(x), yi = Math.floor(y), h = hash(xi, yi), n = E.noise2(x / 23, y / 23) * 10;
  const cx = Math.floor(x / T), cy = Math.floor(y / T);
  switch (tag) {
    case 'road': {
      const a = axis[cy] && axis[cy][cx];
      if (a && a[0] === 'h') { const line = +a.slice(1); if (Math.abs(y - line) < 1 && (xi % 24) < 12) return [222, 184, 60]; }
      if (a && a[0] === 'v') { const line = +a.slice(1); if (Math.abs(x - line) < 1 && (yi % 24) < 12) return [222, 184, 60]; }
      return shadeC([62, 60, 64], (h - .5) * 14 + n * .4);
    }
    case 'walk': return (xi % T === 0 || yi % T === 0) ? [118, 114, 108] : shadeC([156, 150, 140], (h - .5) * 10 + n * .3);
    case 'lot': return ((xi % 32) < 1 && (yi % 64) > 6 && (yi % 64) < 40) ? [214, 214, 206] : shadeC([76, 74, 76], (h - .5) * 12 + n * .4);
    case 'grass': return shadeC(h > .93 ? [150, 150, 80] : [104, 124, 62], n + (h - .5) * 16);
    case 'dirt': return shadeC([142, 108, 74], n + (h - .5) * 18 + (h > .97 ? -30 : 0));
    case 'patio': return (xi % 8 === 0 || yi % 8 === 0) ? [140, 98, 72] : shadeC([186, 128, 92], (h - .5) * 10);
    case 'lino': return (((xi >> 3) + (yi >> 3)) & 1) ? shadeC([196, 196, 188], (h - .5) * 6) : shadeC([92, 104, 110], (h - .5) * 6);
    case 'epoxy': return (xi % 32 === 0 || yi % 32 === 0) ? [60, 72, 70] : shadeC([96, 116, 112], n * .5 + (h - .5) * 8);
    default: return shadeC(h > .985 ? [120, 96, 70] : [200, 162, 112], n * 1.2 + (h - .5) * 16);   // sand
  }
}
const FLOORS = { '.': 'sand', ',': 'grass', '=': 'road', '-': 'walk', ':': 'lot', '_': 'dirt', p: 'patio', f: 'lino', e: 'epoxy' };
const LEGEND = { '#': 1, B: 2, W: 3, H: 4, J: 5, L: 6, K: 7, C: 8 };
for (const ch in FLOORS) LEGEND[ch] = { floor: FLOORS[ch] };
const town = new E.TileMap({ rows: TOWN_ROWS, legend: LEGEND, types: WALLTYPES, floorTex, ao: 4, outside: '#c8a270' });

/* set dressing: solid shapes (bodies stop at them), props (lamps, cacti, palms) */
const DECOR = [];     // [kind, id, x, y, opts]
const SOLIDS = [];
const solid = (id, x, y, o = {}) => { SOLIDS.push([id, x, y, o]); town.solid(id, x, y, 0, o); };
const prop = (id, x, y, o = {}) => DECOR.push(['prop', id, x, y, o]);
const shape = (id, x, y, o = {}) => DECOR.push(['shape', id, x, y, o]);
(function dress() {
  // the RV in the backyard, the grill; the family sedan in the drive; the pool
  solid('rv', C(19) - 8, C(4) + 4, { facing: Math.PI / 2 }); solid('grill', C(20), C(2) + 2);
  solid('sedan', C(29), C(9) - 2, { facing: Math.PI / 2, mats: { b: 'carwhite' } });
  shape('pool', C(29) - 2, C(4) + 2, { shadow: false }); shape('table', C(22) + 2, C(3), { facing: Math.PI / 2 }); shape('chair', C(22) + 2, C(2) - 2, { facing: Math.PI / 2 });
  // streetlamps along every sidewalk
  for (const k in BLOCKS) { const [x0, y0, x1, y1] = BLOCKS[k]; for (let x = x0 + 2; x < x1; x += 6) { if (y1 < TH - 1) prop('streetlamp', C(x), C(y1) + 6, {}); } }
  for (const c of ROADV) for (let y = 3; y < TH; y += 8) prop('streetlamp', C(c - 1) + 4, C(y), {});
  // the desert: cacti, rocks, a burned-out car
  const dr = E.rng(11);
  for (let i = 0; i < 38; i++) { const x = 8 + dr() * 190, y = 8 + dr() * (TH * T - 16); const cy = Math.floor(y / T); if (ROADH.some(r => cy >= r - 1 && cy <= r + 2)) continue; prop(dr() < .65 ? 'cactus' : dr() < .5 ? 'rock' : 'grass', x, y, { size: .9 + dr() * .5 }); }
  solid('pickup', C(5), C(18), { facing: 1.1, mats: { b: 'rusted' } });
  // the junkyard: wrecks, drums, crates, a fire barrel
  solid('pickup', C(54) + 4, C(2) + 8, { facing: .2, mats: { b: 'rusted' } }); solid('sedan', C(57) - 4, C(6), { facing: 2.6, mats: { b: 'rusted' } });
  for (const [x, y] of [[52, 5], [55, 4], [52, 7]]) solid('barrel', C(x), C(y), { facing: x });
  solid('crate', C(56), C(7) - 4, { facing: .3 }); prop('firedrum', C(55), C(6) + 4, { light: true });
  // the strip mall: palms, a dumpster round the back, cars in the lot, awnings
  for (const x of [17, 23, 30]) prop('palm', C(x), C(17) + 10, { size: 1.2 });
  solid('dumpster', C(31) - 2, C(12) + 10, { facing: Math.PI / 2 }); solid('sedan', C(19), C(20), { facing: Math.PI / 2, mats: { b: 'carred' } });
  solid('sedan', C(25), C(20), { facing: -Math.PI / 2, mats: { b: 'caryellow' } }); solid('pickup', C(28) + 4, C(21), { facing: Math.PI / 2 });
  // the car wash: a car mid-wash, cones, a bubbly sign
  solid('sedan', C(40), C(19), { facing: 0, mats: { b: 'carblue' } }); solid('vending', C(45), C(17), { facing: Math.PI / 2 });
  for (const x of [36, 43]) prop('trashcan', C(x), C(17) + 2, {});
  // the park: trees, benches, flowers
  for (const [x, y] of [[54, 14], [55, 21], [51, 17], [58, 18]]) prop('tree', C(x), C(y), { size: 1.2 });
  solid('bench', C(54), C(16), { facing: Math.PI / 2 }); solid('bench', C(56), C(19), { facing: -Math.PI / 2 });
  for (const [x, y] of [[53, 19], [56, 13], [51, 21]]) prop('flowers', C(x), C(y), {});
  // houses: mailboxes, hydrants, bushes
  for (const [x, y] of [[23, 34], [27, 34], [20, 43], [27, 43], [38, 43], [35, 8], [44, 8]]) solid('mailbox', C(x), C(y) - 6, {});
  for (const [x, y] of [[16, 11], [33, 23], [47, 26], [31, 37], [49, 9]]) prop('hydrant', C(x) + 4, C(y) - 4, {});
  for (const [x, y] of [[22, 32], [24, 32], [34, 7], [47, 7], [17, 42], [30, 40]]) prop('bush', C(x), C(y), {});
  // the laundry: drums and crates along its lot, a forklift-yellow pickup
  for (const [x, y] of [[35, 34], [46, 34]]) solid('drum', C(x), C(y), {});
  solid('crate', C(44), C(34), { facing: .1 }); solid('pickup', C(37), C(34) + 2, { facing: 0, mats: { b: 'caryellow' } });
  // the motel: vending, cars
  solid('vending', C(51), C(30), { facing: Math.PI / 2 }); solid('sedan', C(55), C(32), { facing: Math.PI / 2, mats: { b: 'cargreen' } });
  // parked cars along the roads
  solid('sedan', C(15) + 2, C(30), { facing: Math.PI / 2, mats: { b: 'carred' } }); solid('sedan', C(33) + 2, C(5), { facing: -Math.PI / 2 });
  solid('pickup', C(48) - 2, C(40), { facing: Math.PI / 2 });
})();
// the signs: drawn in the world over each business
const SIGNS = [
  [C(20) + 2, C(16) + 8, 44, 'LENNY SHAPIRO, ESQ.', '#f0e0a0'], [C(20) + 2, C(16) + 8, 36, 'YOU NEED LENNY!', '#e8c040'],
  [C(27), C(16) + 8, 44, 'TACO TRANQUILO', '#ff9a4a'], [C(27), C(16) + 8, 36, 'calm food, fast', '#f0d8b0'],
  [C(40), C(15) + 8, 40, 'BUBBLE BROS CAR WASH', '#c8f0ff'], [C(40) + 8, C(32) + 8, 50, 'LAVANDERIA BRILLANTE', '#e8e8f0'],
  [C(55), C(29) + 8, 42, 'SUNSET INN', '#ff7a5a'], [C(55), C(1) + 4, 26, 'RAFA\'S SALVAGE', '#e8c070'], [C(25), C(6) + 8, 36, '308 PIEDRA LANE', '#f0e8d8']
];

/* where things are: interaction points, buyers' corners, the DEA's beats */
const SPOT = {
  rv: { x: C(19) - 8, y: C(6) + 10 }, dusty: { x: C(21), y: C(7) }, home: { x: C(25), y: C(7) + 6 }, skyler: { x: C(24), y: C(8) },
  lenny: { x: C(20), y: C(17) + 2 }, taco: { x: C(27), y: C(17) + 2 }, back: { x: C(31) + 2, y: C(14) }, carwash: { x: C(38), y: C(16) + 4 },
  laundry: { x: C(40) + 8, y: C(33) + 2 }, rafa: { x: C(55), y: C(5) }, junkgate: { x: C(54), y: C(9) },
  heroStart: { x: C(21), y: C(5) }, arena: { x: C(40), y: C(20) }
};
const BUYER_SPOTS = [[54, 17], [23.5, 33], [52.5, 33], [10, 22], [44, 40.5], [31, 26.5], [12, 12.5]].map(([x, y], i) => ({ i, x: x * T + 8, y: y * T + 8 }));
const BEATS = [
  [[16, 12], [31, 12], [47, 12], [47, 23], [31, 23], [16, 23]],
  [[16, 26], [33, 26], [47, 26], [47, 35], [16, 35]],
  [[50, 12], [59, 12], [59, 35], [50, 35], [50, 24]],
  [[15, 0], [15, 43], [33, 43], [33, 0]].map(([x, y]) => [x, clamp(y, 1, 42)])
].map(b => new E.Path(b.map(([x, y]) => [C(x), C(y), 0]), { closed: true }));

/* ---------------- the superlab, under the laundry: steel, tanks, the office ---------------- */
const LAB_ROWS = [
  '################################',
  '#WWWWWWWWWWW#OOOOOO#WWWWWWWWWWW#',
  '#eeeeeeeeeee#ffffff#eeeeeeeeeee#',
  '#eeeeeeeeeee#ffffff#eeeeeeeeeee#',
  '#eeeeeeeeeee##ff####eeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeee##eeeeeeeeeeeeeeeeee##eeee#',
  '#eeee##eeeeeeeeeeeeeeeeee##eeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeee##eeeeeeeeeeeeeeeeee##eeee#',
  '#eeee##eeeeeeeeeeeeeeeeee##eeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '##############eeee##############'
];
const lab = new E.TileMap({ rows: LAB_ROWS, legend: { '#': 1, W: 2, O: 3, e: { floor: 'epoxy' }, f: { floor: 'lino' } },
  types: { 1: { h: 40, top: '#3a3e42', side: '#6a7276', face: 'brick', roof: 'slab', cut: true }, 2: { h: 24, top: '#8a9296', side: '#a8b0b4', face: 'plank', roof: 'slab' }, 3: { h: 26, top: '#5a4a3a', side: '#8a7a64', face: 'timber', roof: 'slab' } },
  floorTex, ao: 6, outside: '#141618' });
const LAB_SOLIDS = [];
(function dressLab() {
  const s = (id, x, y, o = {}) => { LAB_SOLIDS.push([id, x, y, o]); lab.solid(id, x, y, 0, o); };
  for (const [x, y] of [[3, 3], [7, 3], [24, 3], [28, 3]]) s('tank', C(x), C(y), {});
  for (const [x, y] of [[10, 7], [21, 7], [10, 15], [21, 15]]) s('labtable', C(x), C(y), { facing: Math.PI / 2 });
  for (const [x, y] of [[14, 10], [17, 12], [3, 11], [28, 11], [14, 16], [17, 16]]) s('drum', C(x), C(y), {});
  s('desk', C(17), C(2) + 2, { facing: -Math.PI / 2 });
})();
const LAB_SPOT = { start: { x: C(15) + 8, y: C(16) }, vela: { x: C(17), y: C(3) + 2 }, mack: { x: C(15) + 8, y: C(6) }, office: { x: C(15) + 8, y: C(4) + 4 } };
