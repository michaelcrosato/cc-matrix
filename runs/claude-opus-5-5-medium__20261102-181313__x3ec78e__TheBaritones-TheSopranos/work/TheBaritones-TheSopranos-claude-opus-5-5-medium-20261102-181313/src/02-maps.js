/* ---- MAPS: drawn in code from rectangles, so a designer moves a building by changing one line ---- */
const rgb = h => E.hex(h);
const RAMP = (c, n = 5, s = .7) => E.ramp(c, n, s).map(rgb);
const GR = [RAMP('#4e8a3a'), RAMP('#5a9a42')], WALK = RAMP('#b8b2a6', 5, .4), ASPH = RAMP('#3a3a42', 5, .3), DRIVE = RAMP('#c8c0b0', 5, .3),
  GRAVEL = RAMP('#8a7a68', 5, .5), POOL = RAMP('#3aa8d8', 5, .8), DECK = RAMP('#d8ccb8', 5, .4), SNOW = RAMP('#e8eef8', 5, .3), ICE = RAMP('#9ad0e8', 5, .5),
  CARPET = RAMP('#6a2a3a', 5, .5), WOOD = RAMP('#8a5a32', 5, .6), TILE_A = RAMP('#e8e4dc', 3, .2), TILE_B = RAMP('#2a2a30', 3, .2), DIRT = RAMP('#6a5240', 5, .5);
const YEL = rgb('#e8c040'), WHT = rgb('#e8e8e0');

function grid(w, h, fill) { const g = Array.from({ length: h }, () => Array(w).fill(fill)); g.rect = (x, y, rw, rh, ch) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (j >= 0 && j < h && i >= 0 && i < w) g[j][i] = ch; }; return g; }

/* THE TOWN: two avenues across, two streets down, ten lots */
const TOWN = (() => {
  const W = 60, Hh = 44, g = grid(W, Hh, '.');
  const HR = [[14, 16], [27, 29]], VR = [[22, 24], [38, 40]];
  for (const [a, b] of HR) { g.rect(1, a - 1, W - 2, 1, ','); g.rect(1, b + 1, W - 2, 1, ','); }
  for (const [a, b] of VR) { g.rect(a - 1, a === 22 ? 13 : 1, 1, Hh - 2, ','); g.rect(b + 1, a === 22 ? 13 : 1, 1, Hh - 2, ','); }
  for (const [a, b] of HR) g.rect(1, a, W - 2, b - a + 1, '=');
  for (const [a, b] of VR) for (let y = a === 22 ? 13 : 1; y < Hh - 1; y++) for (let x = a; x <= b; x++) g[y][x] = g[y][x] === '=' ? '+' : '|';
  // Sal's house, the pool, the driveway
  g.rect(2, 1, 19, 11, '.'); g.rect(3, 2, 9, 5, 'H'); g.rect(13, 2, 7, 7, 'w'); g.rect(14, 3, 5, 4, '~'); g.rect(6, 7, 3, 6, '_');
  // the park: paths and a gazebo lawn
  g.rect(26, 1, 11, 11, '.'); g.rect(26, 6, 11, 1, 't'); g.rect(31, 1, 1, 12, 't');
  // the therapist's office and its lot
  g.rect(42, 1, 17, 12, 'p'); g.rect(45, 2, 11, 5, 'O');
  // the row of shops: Fusco's Meats, Dolce Vita, Il Gabbiano, Spin City, Sully's Pre-Owned
  g.rect(1, 18, 20, 8, ','); g.rect(2, 18, 8, 5, 'B'); g.rect(12, 18, 8, 5, 'K');
  g.rect(26, 18, 11, 8, ','); g.rect(27, 18, 9, 5, 'R');
  g.rect(42, 18, 17, 8, ','); g.rect(42, 18, 7, 5, 'L'); g.rect(50, 18, 9, 8, 'p'); g.rect(55, 18, 4, 3, 'S');
  // the night: the Velvet Brass and its lot, the Moonlight Diner, the sanitation yard
  g.rect(1, 31, 20, 12, 'p'); g.rect(3, 32, 10, 5, 'C');
  g.rect(26, 31, 11, 12, 'p'); g.rect(27, 32, 9, 4, 'D');
  g.rect(42, 31, 17, 12, 'g'); g.rect(50, 31, 9, 4, 'W');
  g.rect(0, 0, W, 1, '#'); g.rect(0, Hh - 1, W, 1, '#'); g.rect(0, 0, 1, Hh, '#'); g.rect(W - 1, 0, 1, Hh, '#');
  const legend = {
    '#': 1, H: 2, O: 3, B: 4, K: 5, R: 6, L: 7, S: 8, C: 9, D: 10, W: 11,
    '.': { floor: 'lawn' }, ',': { floor: 'walk' }, '=': { floor: 'rh' }, '|': { floor: 'rv' }, '+': { floor: 'rx' }, '_': { floor: 'drive' },
    p: { floor: 'lot' }, g: { floor: 'yard' }, w: { floor: 'deck' }, '~': { floor: 'pool', block: true }, t: { floor: 'path' }
  };
  const types = {
    1: { h: 18, face: 'hedge', roof: 'leaves', top: '#3a7a3a', side: '#2a5a2e', cut: true, cutH: 6 },
    2: { h: 34, face: 'plaster', roof: 'tiles', top: '#9a4a3a', side: '#e8dcc4', cut: true, cutH: 8 },
    3: { h: 52, face: 'stone', roof: 'slab', top: '#6a6a72', side: '#a8a49a', course: 10, cut: true, cutH: 8 },
    4: { h: 36, face: 'brick', roof: 'slab', top: '#5a4a44', side: '#9a3a2a', cut: true, cutH: 8 },
    5: { h: 32, face: 'plaster', roof: 'slab', top: '#8a6a6a', side: '#f0d8d0', cut: true, cutH: 8 },
    6: { h: 36, face: 'brick', roof: 'tiles', top: '#3a6a3a', side: '#c8b088', cut: true, cutH: 8 },
    7: { h: 30, face: 'plaster', roof: 'slab', top: '#5a6a7a', side: '#a8c8e0', cut: true, cutH: 8 },
    8: { h: 26, face: 'plank', roof: 'slab', top: '#7a7a7a', side: '#f0f0e8', cut: true, cutH: 8 },
    9: { h: 38, face: 'plank', roof: 'slab', top: '#2a2a32', side: '#3a2448', cut: true, cutH: 8 },
    10: { h: 30, face: 'steel', roof: 'slab', top: '#8a8a92', side: '#c8ccd4', cut: true, cutH: 8 },
    11: { h: 46, face: 'rusted', roof: 'slab', top: '#5a5a5a', side: '#7a6a5a', cut: true, cutH: 8 }
  };
  const C = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });
  // where things are: doors face south (their y is the wall's face), people stand in front
  const at = {
    hero: C(7, 8), paper: C(7, 12), donna: C(13, 9.4), ducks: C(16, 4.5), houseDoor: { x: 7.5 * T, y: 7 * T },
    office: { x: 50.5 * T, y: 7 * T }, officeStand: C(50, 8),
    fusco: { x: 6 * T, y: 23 * T }, gino: C(6, 24), nickyStand: C(4, 24.5),
    bakery: { x: 16 * T, y: 23 * T }, baker: C(16, 24),
    gabbiano: { x: 31.5 * T, y: 23 * T }, chef: C(31, 24),
    laundry: { x: 45.5 * T, y: 23 * T }, murray: C(45, 24),
    sully: C(54, 22.5), sullyDoor: { x: 57 * T, y: 21 * T },
    club: { x: 8 * T, y: 37 * T }, frankie: C(8, 38.2),
    diner: { x: 31.5 * T, y: 36 * T }, dinerStand: C(31, 37.5),
    yard: C(48, 38), yardGate: C(42, 38), suv: { x: 11 * T, y: 11.5 * T, angle: Math.PI / 2 }
  };
  // things solid where they stand: shapes and props (dumpsters, the patio, the car lot)
  const solids = [
    ['table', 28 * T, 24.5 * T], ['table', 34.5 * T, 24.5 * T], ['bench', 28.5 * T, 3 * T], ['bench', 34 * T, 9.5 * T], ['bench', 28 * T, 9.5 * T],
    ['crate', 44 * T, 33 * T], ['crate', 45 * T, 33.2 * T], ['barrel', 47 * T, 32.5 * T], ['barrel', 47.6 * T, 33.3 * T], ['sack', 10.2 * T, 23.6 * T],
    ['barrel', 13 * T, 39 * T], ['crate', 20 * T, 32 * T], ['cart', 49 * T, 9.5 * T]
  ];
  const props = [];
  const lamp = (x, y) => props.push({ prop: 'streetlamp', x, y, light: true, r: 3 });
  for (let x = 4; x < W - 2; x += 9) { lamp(x * T, 12.8 * T); lamp((x + 4) * T, 17.6 * T); lamp(x * T, 25.8 * T); lamp((x + 4) * T, 30.6 * T); }
  for (const [x, y] of [[3, 9], [12, 11], [19, 10], [27, 2], [35, 3], [27, 10], [35, 10], [33, 2], [29, 8], [20, 2]]) props.push({ prop: E.hash2(x, y) < .5 ? 'tree' : 'pine', x: x * T, y: y * T, r: 6, size: 1.3 });
  for (const [x, y] of [[2.5, 7.6], [11.6, 7.6], [10, 9], [4, 11], [43, 2], [56.5, 8], [24.5, 2]]) props.push({ prop: 'bush', x: x * T, y: y * T, r: 5, size: 1.1 });
  for (const [x, y] of [[13, 7.6], [19.6, 7.6]]) props.push({ prop: 'flowers', x: x * T, y: y * T, size: 1, color: '#f06a9a' });
  props.push({ prop: 'hydrant', x: 11 * T, y: 13.4 * T, r: 3 }, { prop: 'hydrant', x: 36 * T, y: 26.4 * T, r: 3 }, { prop: 'trashcan', x: 1.8 * T, y: 23.4 * T, r: 3 }, { prop: 'trashcan', x: 41.6 * T, y: 23.4 * T, r: 3 }, { prop: 'trashcan', x: 26.6 * T, y: 30.4 * T, r: 3 });
  props.push({ prop: 'sign', x: 8.6 * T, y: 13.2 * T, r: 3, text: 'BARITONE' }, { prop: 'firedrum', x: 44 * T, y: 40 * T, r: 4, light: true }, { prop: 'firedrum', x: 56 * T, y: 41 * T, r: 4, light: true }, { prop: 'sandbags', x: 43 * T, y: 36 * T, r: 6 });
  // faces: doors, awnings, windows and the shop signs (drawn on the wall faces)
  const faces = [
    { prop: 'door', x: 7.5 * T, y: 7 * T, color: '#6a3a22' }, { prop: 'window', x: 4.5 * T, y: 7 * T, z: 12, size: .7 }, { prop: 'window', x: 10.5 * T, y: 7 * T, z: 12, size: .7 },
    { prop: 'door', x: 50.5 * T, y: 7 * T, color: '#3a3a4a' }, { prop: 'window', x: 47 * T, y: 7 * T, z: 18, size: .8 }, { prop: 'window', x: 54 * T, y: 7 * T, z: 18, size: .8 },
    { prop: 'door', x: 6 * T, y: 23 * T, color: '#7a2a1a' }, { prop: 'awning', x: 6 * T, y: 23 * T, z: 24, color: '#c83a2a' }, { prop: 'window', x: 3.5 * T, y: 23 * T, z: 10, size: .7 }, { prop: 'window', x: 8.5 * T, y: 23 * T, z: 10, size: .7 },
    { prop: 'door', x: 16 * T, y: 23 * T, color: '#e8a0b0' }, { prop: 'awning', x: 16 * T, y: 23 * T, z: 22, color: '#f0a0c0' },
    { prop: 'door', x: 31.5 * T, y: 23 * T, color: '#2a5a2a' }, { prop: 'awning', x: 29 * T, y: 23 * T, z: 24, color: '#2a8a3a' }, { prop: 'awning', x: 34 * T, y: 23 * T, z: 24, color: '#e8e8e8' },
    { prop: 'door', x: 45.5 * T, y: 23 * T, color: '#3a6a9a' }, { prop: 'awning', x: 45.5 * T, y: 23 * T, z: 21, color: '#3a8ac8' },
    { prop: 'door', x: 57 * T, y: 21 * T, color: '#e8c020' },
    { prop: 'door', x: 8 * T, y: 37 * T, color: '#8a2a8a' }, { prop: 'lantern', x: 5 * T, y: 37 * T, z: 30, anchor: 'top', light: '#ff60c0' }, { prop: 'lantern', x: 11 * T, y: 37 * T, z: 30, anchor: 'top', light: '#ff60c0' },
    { prop: 'door', x: 31.5 * T, y: 36 * T, color: '#c83030' }, { prop: 'window', x: 28.5 * T, y: 36 * T, z: 10, size: .8 }, { prop: 'window', x: 34.5 * T, y: 36 * T, z: 10, size: .8 },
    { prop: 'door', x: 54 * T, y: 35 * T, color: '#5a5a3a' }
  ];
  // the signs above the doors, in the house font: [text, x, face y, z, color]
  const signs = [['FUSCO\'S MEATS', 6 * T, 23 * T, 33, '#ffe8c0'], ['DOLCE VITA', 16 * T, 23 * T, 29, '#ffd0e0'], ['IL GABBIANO', 31.5 * T, 23 * T, 33, '#e8ffe0'],
    ['SPIN CITY', 45.5 * T, 23 * T, 27, '#d0e8ff'], ['SULLY\'S', 57 * T, 21 * T, 23, '#fff0a0'], ['THE VELVET BRASS', 8 * T, 37 * T, 35, '#ff80e0'], ['MOONLIGHT DINER', 31.5 * T, 36 * T, 27, '#80e8ff'],
    ['DR. E. MARCHETTI, M.D.', 50.5 * T, 7 * T, 32, '#f0f0f0'], ['BARITONE SANITATION', 54 * T, 35 * T, 40, '#e8c020']];
  const parked = [{ kind: 'sedan', x: 52 * T, y: 23 * T, angle: Math.PI / 2, color: '#3a5a9a' }, { kind: 'sedan', x: 52 * T, y: 19.5 * T, angle: Math.PI / 2, color: '#e8e8e8' },
    { kind: 'cab', x: 44 * T, y: 10 * T, angle: 0 }, { kind: 'sedan', x: 15 * T, y: 40.5 * T, angle: 0, color: '#4a2a5a' }, { kind: 'van', x: 29 * T, y: 40 * T, angle: 0 },
    { kind: 'truck', x: 46 * T, y: 36.5 * T, angle: Math.PI, color: '#3a6a3a' }, { kind: 'truck', x: 55 * T, y: 39.5 * T, angle: 0, color: '#3a6a3a' }];
  return { id: 'town', name: 'North Caldwell, NJ', W, H: Hh, rows: g.map(r => r.join('')), legend, types, at, solids, props, faces, signs, parked, roads: { HR, VR } };
})();

/* THE PINE BARRENS: snow, pines, a frozen pond, a hunter's cabin, the road out */
const BARRENS = (() => {
  const W = 52, Hh = 40, g = grid(W, Hh, 's');
  g.rect(0, 0, W, 1, '#'); g.rect(0, Hh - 1, W, 1, '#'); g.rect(0, 0, 1, Hh, '#'); g.rect(W - 1, 0, 1, Hh, '#');
  g.rect(18, 14, 9, 6, 'i');             // the frozen pond
  g.rect(36, 4, 7, 5, 'X');              // the hunter's cabin
  g.rect(1, 34, W - 2, 3, 'r');          // the road out, ploughed
  const trees = [];
  for (let y = 2; y < 33; y++) for (let x = 2; x < W - 2; x++) {
    const h = E.hash2(x * 3, y * 7);
    const clear = (x > 3 && x < 9 && y > 2 && y < 9) || (g[y][x] !== 's') || (x > 34 && x < 45 && y > 2 && y < 12) || Math.abs(x - 6 - (y > 9 ? (y - 9) * .9 : 0)) < 2 && y < 30;
    const path = (y > 18 && y < 22 && x > 26) || (x > 44 && x < 48 && y > 8);
    if (!clear && !path && h < .21) trees.push([x, y]);
  }
  const legend = { '#': 1, X: 2, s: { floor: 'snow' }, i: { floor: 'ice' }, r: { floor: 'road' } };
  const types = { 1: { h: 24, face: 'hedge', roof: 'snow', top: '#e8eef8', side: '#2a4a3a', cut: true, cutH: 6 }, 2: { h: 30, face: 'plank', roof: 'snow', top: '#e8eef8', side: '#6a4a2a', cut: true, cutH: 8 } };
  const C = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });
  const at = { hero: C(5, 5), nicky: C(7, 5), van: { x: 6 * T, y: 3.5 * T, angle: 0 }, shoe: C(14, 20), cabin: { x: 39.5 * T, y: 9 * T }, lenny: C(39, 11), exit: C(46, 35), pond: C(22, 17) };
  const props = [{ prop: 'firedrum', x: 10 * T, y: 12 * T, light: true, r: 4, warm: true }, { prop: 'firedrum', x: 28 * T, y: 24 * T, light: true, r: 4, warm: true },
    { prop: 'firedrum', x: 41 * T, y: 13 * T, light: true, r: 4, warm: true }, { prop: 'firedrum', x: 15 * T, y: 30 * T, light: true, r: 4, warm: true }, { prop: 'firedrum', x: 46 * T, y: 26 * T, light: true, r: 4, warm: true }];
  for (const [x, y] of trees) props.push({ prop: 'pine', x: (x + .5) * T, y: (y + .5) * T, r: 6, size: 1.2 + E.hash2(x, y) * .5, color: '#2a5a44', tree: true });
  const faces = [{ prop: 'door', x: 39.5 * T, y: 9 * T, color: '#4a2a1a' }, { prop: 'window', x: 37.5 * T, y: 9 * T, z: 12, size: .6, colors: ['#ffd070', '#ffb040'] }];
  const signs = [['ROUTE 72  ->', 46 * T, 34 * T, 6, '#e8e8e8']];
  return { id: 'barrens', name: 'The Pine Barrens', W, H: Hh, rows: g.map(r => r.join('')), legend, types, at, solids: [], props, faces, signs, parked: [{ kind: 'van', x: 6 * T, y: 3.5 * T, angle: 0, color: '#e8e8e0' }], trees };
})();

/* THE OFFICE: two chairs, a window, books; a box of tissues nobody uses */
const OFFICE = (() => {
  const W = 14, Hh = 10, g = grid(W, Hh, 'c');
  g.rect(0, 0, W, 2, '#'); g.rect(0, Hh - 1, W, 1, '#'); g.rect(0, 0, 1, Hh, '#'); g.rect(W - 1, 0, 1, Hh, '#');
  const legend = { '#': 1, c: { floor: 'carpet' } };
  const types = { 1: { h: 40, face: 'plaster', roof: 'plain', top: '#3a3040', side: '#d8ccb8', cut: true, cutH: 4 } };
  const C = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });
  return { id: 'office', name: 'Dr. Marchetti\'s Office', W, H: Hh, rows: g.map(r => r.join('')), legend, types,
    at: { sal: C(4.3, 5), melfi: C(9.7, 5) },
    solids: [['chair', 4.3 * T, 5.5 * T, { facing: 0 }], ['chair', 9.7 * T, 5.5 * T, { facing: Math.PI }], ['bookcase', 2 * T, 2.6 * T], ['bookcase', 3.5 * T, 2.6 * T], ['table', 7 * T, 7.5 * T], ['pot', 12 * T, 2.8 * T]],
    props: [{ prop: 'lamp', x: 11.5 * T, y: 3 * T, light: true }, { prop: 'flowers', x: 7 * T, y: 7.5 * T, z: 10, color: '#f0d050' }],
    faces: [{ prop: 'window', x: 7 * T, y: 2 * T, z: 12, size: 1.1, colors: ['#a8d8ff', '#e8f4ff'] }, { prop: 'banner', x: 10.5 * T, y: 2 * T, z: 14, size: .6, color: '#3a5a8a', emblem: '#e8e8e8' }],
    signs: [], parked: [] };
})();

/* THE DINER: booths, the counter, the jukebox, a door with a bell */
const DINER = (() => {
  const W = 16, Hh = 11, g = grid(W, Hh, 'k');
  g.rect(0, 0, W, 2, '#'); g.rect(0, Hh - 1, W, 1, '#'); g.rect(0, 0, 1, Hh, '#'); g.rect(W - 1, 0, 1, Hh, '#');
  g.rect(9, 0, 1, 1, '#');
  g.rect(1, 2, 6, 1, 'n');   // the counter
  const legend = { '#': 1, n: 2, k: { floor: 'checker' } };
  const types = { 1: { h: 38, face: 'steel', roof: 'plain', top: '#2a2a30', side: '#c8ccd4', cut: true, cutH: 4 }, 2: { h: 12, face: 'steel', roof: 'plain', top: '#e84a4a', side: '#c8ccd4' } };
  const C = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });
  return { id: 'diner', name: 'The Moonlight Diner', W, H: Hh, rows: g.map(r => r.join('')), legend, types,
    at: { sal: C(11, 6.2), door: C(8, 9.2), juke: { x: 13.5 * T, y: 2.6 * T }, seats: [C(12.6, 6.2), C(11, 4.6), C(12.6, 4.6)], booth: C(11.8, 5.4), waitress: C(4, 3.6) },
    solids: [['table', 11.8 * T, 5.6 * T, { scale: 1.1 }], ['bench', 11.8 * T, 3.8 * T], ['bench', 11.8 * T, 7.2 * T], ['table', 5 * T, 6.5 * T], ['stool', 2 * T, 3.6 * T], ['stool', 3.5 * T, 3.6 * T], ['stool', 5 * T, 3.6 * T]],
    props: [{ prop: 'lamp', x: 8 * T, y: 2.6 * T, light: true }, { prop: 'lamp', x: 1.6 * T, y: 8.5 * T, light: true }],
    faces: [{ prop: 'window', x: 3 * T, y: 2 * T, z: 16, size: .8, colors: ['#203060', '#304080'] }, { prop: 'window', x: 12 * T, y: 2 * T, z: 16, size: .8, colors: ['#203060', '#304080'] }],
    signs: [], parked: [] };
})();

/* ---- the floors: asphalt with its lines, sidewalks in squares, mowed lawns, a pool, snow, a checkerboard ---- */
function floorTex(x, y, tag) {
  const cx = Math.floor(x / T), cy = Math.floor(y / T), lx = x - cx * T, ly = y - cy * T, n = E.noise2(x / 9, y / 9), h = E.hash2(Math.floor(x / 2), Math.floor(y / 2));
  const sp = (P, i) => P[clamp(i + (h < .08 ? -1 : h > .94 ? 1 : 0), 0, P.length - 1)];
  switch (tag) {
    case 'lawn': { const stripe = Math.floor(x / 24) % 2; return sp(GR[stripe], n < .35 ? 1 : n > .7 ? 3 : 2); }
    case 'walk': return (lx < .9 || ly < .9) ? WALK[1] : sp(WALK, n > .6 ? 3 : 2);
    case 'rh': case 'rv': case 'rx': case 'road': {
      if (tag === 'road') return sp(SNOW, 1);   // the barrens' ploughed road
      const roads = TOWN.roads;
      if (tag === 'rh') { const r = roads.HR.find(([a, b]) => cy >= a && cy <= b); if (r) { const mid = (r[0] + r[1] + 1) / 2 * T; if (Math.abs(y - mid) < .8 && Math.floor(x / 12) % 2 === 0) return YEL; } }
      if (tag === 'rv') { const r = roads.VR.find(([a, b]) => cx >= a && cx <= b); if (r) { const mid = (r[0] + r[1] + 1) / 2 * T; if (Math.abs(x - mid) < .8 && Math.floor(y / 12) % 2 === 0) return YEL; } }
      if (tag === 'rx') { const hr = roads.HR.find(([a, b]) => cy >= a && cy <= b), vr = roads.VR.find(([a, b]) => cx >= a && cx <= b);
        if (hr && vr && ((x - vr[0] * T < 3 && Math.floor(y / 4) % 2 === 0) || ((vr[1] + 1) * T - x < 3 && Math.floor(y / 4) % 2 === 0))) return WHT; }
      return sp(ASPH, n > .62 ? 3 : n < .3 ? 1 : 2);
    }
    case 'drive': return (lx < .7) ? DRIVE[1] : sp(DRIVE, n > .5 ? 3 : 2);
    case 'lot': { if (Math.abs(lx - 1) < .7 && Math.floor(y / T) % 3 !== 0) return rgb('#d8d8d0'); return sp(ASPH, n > .55 ? 2 : 1); }
    case 'yard': return sp(GRAVEL, n > .55 ? 3 : n < .3 ? 1 : 2);
    case 'deck': return (lx < .8 || ly < .8) ? DECK[1] : sp(DECK, 3);
    case 'pool': { const w = Math.sin(x / 5 + y / 7) + Math.sin(y / 3.3 - x / 9); return POOL[w > 1.3 ? 4 : w > .2 ? 3 : 2]; }
    case 'path': return sp(DIRT, n > .5 ? 3 : 2);
    case 'snow': { const tr = E.noise2(x / 30, y / 30); return sp(SNOW, tr > .62 ? 3 : tr < .32 ? 1 : 2); }
    case 'ice': { const c = Math.sin(x / 7 + y / 11) * Math.cos(y / 6); return ICE[c > .6 ? 4 : c < -.5 ? 1 : 2]; }
    case 'carpet': return (Math.floor(x / 4) + Math.floor(y / 4)) % 7 === 0 ? CARPET[3] : sp(CARPET, 2);
    case 'checker': return ((cx + cy) % 2 ? TILE_A : TILE_B)[ly < .7 || lx < .7 ? 0 : 1];
  }
  return sp(GR[0], 2);
}

/* the map of a place, built once and kept: its TileMap and its solids */
const MAPS = {};
function mapOf(def) {
  if (MAPS[def.id]) return MAPS[def.id];
  const m = new E.TileMap({ rows: def.rows, legend: def.legend, types: def.types, floorTex, ao: 6, outside: def.id === 'barrens' ? '#c8d0e0' : '#1a1a20' });
  for (const [id, x, y, o] of def.solids) m.solid(id, x, y, 0, o || { facing: E.hash2(x, y) * 4 > 2 ? Math.PI / 2 : 0 });
  for (const p of def.props) if (p.r && p.tree) { const [cx, cy] = m.toCell(p.x, p.y); m.block(cx, cy, true); }
  m.def = def;
  return (MAPS[def.id] = m);
}
const PLACES = { town: TOWN, barrens: BARRENS, office: OFFICE, diner: DINER };
