/* ---- WORLD: areas as data. The town is generated from lists of roads, lots and buildings; interiors are text rows ----
 * A designer adds a building with one line in BUILDINGS, a door with one line in DOORS, and props in the area's DRESS. */

const TW = 72, TH = 48;
// wall types: height, face, roof, colors. cut: lowered when it would hide the player
const WALLS = {
  1: { h: 22, face: 'hedge', roof: 'leaves', top: '#3a6a34', side: '#2a5428', cut: true },
  2: { h: 44, face: 'plaster', roof: 'tiles', top: '#8a4a3a', side: '#e0d4b8', cut: true },          // home
  3: { h: 56, face: 'stone', roof: 'slab', top: '#6a6a72', side: '#b4ae9e', cut: true },            // Dr. Melba's
  4: { h: 38, face: 'brick', roof: 'slab', top: '#5a4038', side: '#a04a3a', course: 3, cut: true }, // pork store
  5: { h: 34, face: 'plaster', roof: 'slab', top: '#6a5a5a', side: '#e8c4c0', cut: true },          // pastry shop
  6: { h: 40, face: 'stone', roof: 'tiles', top: '#9a5a3a', side: '#d8bc84', cut: true },           // Vesuvio
  7: { h: 36, face: 'none', roof: 'slab', top: '#2a1a30', side: '#4a2a5a', cut: true },             // Bada Boom
  8: { h: 30, face: 'none', roof: 'slab', top: '#8a8a96', side: '#c8ccd8', cut: true },             // diner
  9: { h: 28, face: 'plank', roof: 'slab', top: '#4a4038', side: '#7a6448', cut: true },            // yard office
  10: { h: 16, face: 'plank', roof: 'plain', top: '#6a6a70', side: '#8a8a92', cut: true },          // yard fence
  11: { h: 40, face: 'timber', roof: 'tiles', top: '#7a3a2a', side: '#d8c8a8', beam: '#5a3a24', cut: true },   // houses
  12: { h: 42, face: 'brick', roof: 'slab', top: '#6a5a50', side: '#b8947a', course: 3, cut: true },          // Green Groves
  13: { h: 10, face: 'stone', roof: 'grass', top: '#4a7a3a', side: '#9a9488', cut: true }           // planter
};
const ROADS = [[0, 14, TW - 1, 16], [0, 32, TW - 1, 34], [10, 0, 12, TH - 1], [36, 0, 38, TH - 1], [60, 0, 62, TH - 1]];
const LOTS = [[52, 3, 59, 12, 'lot'], [13, 17, 35, 23, 'lot'], [40, 17, 59, 22, 'lot'], [63, 17, 70, 24, 'lot'], [21, 11, 23, 13, 'lot'],
  [26, 3, 34, 10, 'patio'], [14, 36, 34, 45, 'dirt'], [40, 42, 59, 46, 'walk'], [63, 42, 70, 46, 'walk'], [48, 23, 50, 31, 'walk']];
const POOL = [28, 4, 33, 8];
const BUILDINGS = [
  { id: 'home', t: 2, r: [15, 5, 24, 10] }, { id: 'office', t: 3, r: [42, 5, 50, 11] },
  { id: 'pork', t: 4, r: [14, 25, 22, 30] }, { id: 'pastry', t: 5, r: [25, 26, 33, 30] },
  { id: 'vesuvio', t: 6, r: [40, 24, 47, 30] }, { id: 'club', t: 7, r: [51, 23, 59, 30] },
  { id: 'diner', t: 8, r: [63, 25, 70, 30] }, { id: 'yardoffice', t: 9, r: [15, 41, 19, 44] },
  { id: 'groves', t: 12, r: [42, 36, 52, 41] }, { id: 'house1', t: 11, r: [64, 36, 69, 41] },
  { id: 'planter1', t: 13, r: [44, 3, 48, 3] }, { id: 'planter2', t: 13, r: [26, 11, 26, 12] }
];
// the yard's fence, with its gate on the avenue
const FENCE = (() => { const c = []; for (let x = 13; x <= 35; x++) { if (x < 22 || x > 26) c.push([x, 35]); c.push([x, 46]); } for (let y = 35; y <= 46; y++) { c.push([13, y]); c.push([35, y]); } return c; })();

function buildTown() {
  const g = Array.from({ length: TH }, () => Array(TW).fill('grass'));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < TW && y < TH) g[y][x] = v; };
  for (const [x0, y0, x1, y1] of ROADS) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, 'road');
  // sidewalks: every cell beside a road
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (g[y][x] !== 'road') {
    let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[y + dy] && g[y + dy][x + dx] === 'road') near = true;
    if (near) g[y][x] = 'walk';
  }
  for (const [x0, y0, x1, y1, f] of LOTS) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y][x] !== 'road' && g[y][x] !== 'walk') set(x, y, f);
  for (let y = POOL[1]; y <= POOL[3]; y++) for (let x = POOL[0]; x <= POOL[2]; x++) set(x, y, 'water');
  for (let y = 36; y <= 45; y++) for (let x = 14; x <= 34; x++) set(x, y, 'dirt');
  // walls: the hedge round the edge, buildings, the fence
  const wall = Array.from({ length: TH }, () => Array(TW).fill(0));
  for (let x = 0; x < TW; x++) { wall[0][x] = 1; wall[TH - 1][x] = 1; } for (let y = 0; y < TH; y++) { wall[y][0] = 1; wall[y][TW - 1] = 1; }
  for (const b of BUILDINGS) for (let y = b.r[1]; y <= b.r[3]; y++) for (let x = b.r[0]; x <= b.r[2]; x++) wall[y][x] = b.t;
  for (const [x, y] of FENCE) wall[y][x] = 10;
  // rows for the TileMap: each cell a legend letter (wall type, or a floor tag)
  const FL = { grass: '.', road: '=', walk: ':', lot: ',', water: '~', patio: '+', dirt: '%' }, WL = 'ABCDEFGHIJKLM';
  const rows = g.map((row, y) => row.map((f, x) => wall[y][x] ? WL[wall[y][x] - 1] : FL[f]).join(''));
  const legend = { '.': { floor: 'grass' }, '=': { floor: 'road' }, ':': { floor: 'walk' }, ',': { floor: 'lot' }, '~': { floor: 'water', block: true }, '+': { floor: 'patio' }, '%': { floor: 'dirt' } };
  for (let i = 0; i < WL.length; i++) legend[WL[i]] = i + 1;
  return new E.TileMap({ rows, legend, types: WALLS, floorTex: townFloor, ao: 4, outside: '#2a4a26' });
}

/* floors: asphalt with lane paint, concrete slabs, lawns, parking lots, a pool, a patio, the yard's dirt */
const C3 = h => E.hex(h);
const FC = { tar: C3('#3e3e46'), tar2: C3('#46464e'), yel: C3('#d8b03a'), wht: C3('#d8d8d0'), slab: C3('#a8a49a'), slab2: C3('#9c988e'), seam: C3('#7a766e'),
  grass: C3('#4a7a34'), grass2: C3('#568a3a'), grass3: C3('#3e6a2c'), lot: C3('#4a4a52'), water: C3('#3a9ad0'), water2: C3('#5ab8e8'), tile: C3('#d8d0c0'), tile2: C3('#c4bca8'),
  dirt: C3('#7a6448'), dirt2: C3('#6a5640'), check1: C3('#e8e4dc'), check2: C3('#2a2a30') };
function townFloor(x, y, tag) {
  const cx = x / T, cy = y / T, n = E.noise2(x * .05, y * .05);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  if (tag === 'road') {
    let c = mix(FC.tar, FC.tar2, n * .9);
    // centre lines: double yellow on the avenues, dashed white on the streets
    const ay = (y % (18 * T)), onAveA = cy >= 14 && cy < 17, onAveB = cy >= 32 && cy < 35, onStreet = [10, 36, 60].some(s => cx >= s && cx < s + 3);
    if (onAveA || onAveB) { const mid = (onAveA ? 15.5 : 33.5) * T; if (!onStreet && Math.abs(y - mid) < 1.6 && Math.abs(y - mid) > .4) c = FC.yel; }
    if (onStreet && !(onAveA || onAveB)) { const s = [10, 36, 60].find(s => cx >= s && cx < s + 3), mid = (s + 1.5) * T; if (Math.abs(x - mid) < .8 && (y % 24) < 12) c = FC.wht; }
    // crosswalks at the intersections' edges
    if (onStreet && (onAveA || onAveB) === false) { /* (handled above) */ }
    void ay;
    if (E.hash2(Math.floor(x / 3), Math.floor(y / 3)) > .985) c = mix(c, FC.slab, .3);
    return c;
  }
  if (tag === 'walk') {
    const sx = x % 16, sy = y % 16; let c = E.hash2(Math.floor(x / 16), Math.floor(y / 16)) > .5 ? FC.slab : FC.slab2;
    if (sx < 1 || sy < 1) c = FC.seam; else if (sx < 2 || sy < 2) c = mix(c, [255, 255, 255], .12);
    return mix(c, FC.seam, n * .25);
  }
  if (tag === 'lot') {
    let c = mix(FC.lot, FC.tar2, n);
    if ((x % 32) < 1.2 && (y % 48) < 30) c = FC.wht;
    return c;
  }
  if (tag === 'water') {
    const w = Math.sin(x * .3 + y * .2) + Math.sin(y * .45 - x * .1);
    let c = mix(FC.water, FC.water2, (w + 2) / 4);
    if (w > 1.55) c = [220, 245, 255];
    return [c[0], c[1], c[2], .25];
  }
  if (tag === 'patio') { const c = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) ? FC.tile : FC.tile2; return (x % 8 < .8 || y % 8 < .8) ? mix(c, FC.seam, .5) : c; }
  if (tag === 'dirt') { let c = mix(FC.dirt, FC.dirt2, n); if (E.hash2(Math.floor(x), Math.floor(y)) > .93) c = mix(c, [40, 30, 20], .4); return c; }
  if (tag === 'checker') return ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) ? FC.check1 : FC.check2;
  // grass: mown stripes and clover
  let c = mix(FC.grass, FC.grass2, (Math.floor(x / 24) & 1) * .6 + n * .3);
  if (E.hash2(Math.floor(x), Math.floor(y)) > .9) c = FC.grass3;
  if (E.hash2(Math.floor(x / 2), Math.floor(y / 2) + 7) > .995) c = [230, 220, 120];
  return c;
}

/* interiors: rows of a room; legend letters for walls and floor tags; each has its own floor look */
const ROOMS = {
  office: { name: "Dr. Melba's office", floor: 'rug', rows: [
    'WWWWWWWWWWWW',
    'W..........W',
    'W..........W',
    'W..........W',
    'W..........W',
    'W..........W',
    'W..........W',
    'WWWWW..WWWWW'], wall: { h: 44, face: 'plaster', side: '#d8ccb4', top: '#5a4a3a', cut: true }, low: { h: 8, face: 'plaster', side: '#c8bca4', top: '#5a4a3a' } },
  pork: { name: "Satolli's Pork Store", floor: 'checker', rows: [
    'WWWWWWWWWWWWWW',
    'W............W',
    'W............W',
    'W............W',
    'W............W',
    'W............W',
    'W............W',
    'W............W',
    'WWWWWW..WWWWWW'], wall: { h: 44, face: 'brick', side: '#c8b8a0', top: '#4a3a30', course: 3, cut: true }, low: { h: 8, face: 'brick', side: '#a89880', top: '#4a3a30' } },
  club: { name: 'The Bada Boom', floor: 'club', rows: [
    'WWWWWWWWWWWWWWWW',
    'W..............W',
    'W..............W',
    'W..............W',
    'W..............W',
    'W..............W',
    'W..............W',
    'W..............W',
    'W..............W',
    'WWWWWWW..WWWWWWW'], wall: { h: 44, face: 'none', side: '#3a1a40', top: '#1a0a20', cut: true }, low: { h: 8, face: 'none', side: '#2a1430', top: '#1a0a20' } },
  diner: { name: "Holstein's", floor: 'checker', rows: [
    'WWWWWWWWWWWWWW',
    'W............W',
    'W............W',
    'W............W',
    'W............W',
    'W............W',
    'W............W',
    'W............W',
    'WWWWWW..WWWWWW'], wall: { h: 40, face: 'none', side: '#c8a878', top: '#6a4a3a', cut: true }, low: { h: 8, face: 'none', side: '#a8885a', top: '#6a4a3a' } },
  groves: { name: 'Green Groves', floor: 'tile', rows: [
    'WWWWWWWWWWWW',
    'W..........W',
    'W..........W',
    'W..........W',
    'W..........W',
    'W..........W',
    'WWWWW..WWWWW'], wall: { h: 44, face: 'plaster', side: '#c8d8c0', top: '#4a5a4a', cut: true }, low: { h: 8, face: 'plaster', side: '#a8b8a0', top: '#4a5a4a' } }
};
function roomFloor(kind) {
  return (x, y) => {
    const n = E.noise2(x * .08, y * .08);
    if (kind === 'checker') return ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) ? [232, 226, 214] : [52, 48, 58];
    if (kind === 'club') { const k = ((Math.floor(x / 16) + Math.floor(y / 16)) & 1); return k ? [46 + n * 20, 20, 52] : [30, 12, 36 + n * 10]; }
    if (kind === 'tile') return ((x % 12) < .8 || (y % 12) < .8) ? [150, 160, 150] : [200 + n * 15, 210 + n * 10, 196];
    // a rug on planks
    const plank = Math.floor(y / 6), u = (x + plank * 23) % 40, base = [120 + n * 20, 82 + n * 12, 52];
    if (x > 40 && x < 152 && y > 30 && y < 100) { const b = (x < 46 || x > 146 || y < 36 || y > 94); return b ? [150, 60, 40] : [120 + (Math.sin(x * .3) * Math.sin(y * .3) > .2 ? 40 : 0), 40, 46]; }
    return (y % 6 < .7 || u < .7) ? [80, 52, 34] : base;
  };
}
function buildRoom(id) {
  const R = ROOMS[id], rows = R.rows.map((row, y) => y === R.rows.length - 1 ? row.replace(/W/g, 'w') : row);
  return new E.TileMap({ rows, legend: { W: 1, w: 2, '.': { floor: 'in' } }, types: { 1: R.wall, 2: R.low }, floorTex: roomFloor(R.floor), ao: 5, outside: '#0e0a10' });
}

/* ---- AREAS ---- */
const AREAS = {};
function area(id) { return AREAS[id]; }
function buildAreas() {
  AREAS.town = { id: 'town', name: 'North Caldwell & Newark Ave', map: buildTown(), blockers: [], dress: [], outdoor: true };
  for (const id of Object.keys(ROOMS)) AREAS[id] = { id, name: ROOMS[id].name, map: buildRoom(id), blockers: [], dress: [], outdoor: false };
  dressTown(AREAS.town); dressRooms();
}
const cellC = (cx, cy) => [cx * T + T / 2, cy * T + T / 2];

// doors: where the town and the rooms meet. at: the doorstep; to: the room and where you appear in it
const DOORS = [
  { id: 'office', at: [46.5 * T, 12.3 * T], to: 'office', label: "Dr. Melba's office" },
  { id: 'pork', at: [18.5 * T, 31.3 * T], to: 'pork', label: "Satolli's Pork Store" },
  { id: 'club', at: [55.5 * T, 31.3 * T], to: 'club', label: 'The Bada Boom' },
  { id: 'diner', at: [66.5 * T, 31.3 * T], to: 'diner', label: "Holstein's" },
  { id: 'groves', at: [47.5 * T, 42.3 * T], to: 'groves', label: 'Green Groves' }
];
const roomExit = id => { const R = ROOMS[id]; return [R.rows[0].length * T / 2, (R.rows.length - 1) * T - 6]; };

// set dressing as data: [kind, ...]. 'prop': engine props; 'shape': library shapes (solid); 'box': our turned boxes (solid);
// 'sign': a sign board; 'fn': a painter; 'lamp': a street lamp that lights at night
function dressTown(A) {
  const D = A.dress, B = A.blockers;
  const lampsAt = [];
  for (const x of [4, 18, 30, 44, 54, 68]) { lampsAt.push([x * T + 8, 13 * T + 10]); lampsAt.push([x * T + 8, 31 * T + 12]); }
  for (const y of [6, 24, 41]) { lampsAt.push([9 * T + 10, y * T]); lampsAt.push([39 * T + 6, y * T]); lampsAt.push([63 * T + 6, y * T]); }
  for (const [x, y] of lampsAt) D.push(['lamp', x, y]);
  // trees: the park, the lawns, the pine woods in the west
  const rnd = E.rng(7);
  for (let i = 0; i < 26; i++) { const x = (1.5 + rnd() * 7.5) * T, y = (1.5 + rnd() * 44) * T; if (Math.abs(y - 15.5 * T) > 30 && Math.abs(y - 33.5 * T) > 30) D.push(['prop', 'pine', x, y, { size: 1.3 + rnd() * .5 }]); }
  for (const [x, y] of [[64, 3], [68, 5], [65, 9], [69, 11], [14, 2], [25, 2], [14, 12], [36.5, 2], [57, 40], [41, 44], [53, 44]]) D.push(['prop', 'tree', x * T + 8, y * T + 8, { size: 1.4 }]);
  for (const [x, y] of [[66, 7]]) D.push(['prop', 'statue', x * T, y * T, { size: 1.3 }]);
  for (const [x, y] of [[64, 6], [68, 9]]) D.push(['shape', 'bench', x * T, y * T, { facing: 0 }]);
  for (const [x, y] of [[16, 11.5], [18, 11.5], [25, 11.5], [41, 12.5], [51, 12.5]]) D.push(['prop', 'bush', x * T, y * T, { size: 1.2 }]);
  for (const [x, y] of [[15, 11.6], [17, 11.6], [24, 11.6]]) D.push(['prop', 'flowers', x * T + 6, y * T, {}]);
  // street furniture
  for (const [k, x, y] of [['hydrant', 24, 31.6], ['trashcan', 34, 31.5], ['trashcan', 49.5, 31.5], ['hydrant', 58, 31.6], ['trashcan', 62.8, 13.3], ['hydrant', 40, 13.4], ['trashcan', 13.4, 13.4]])
    D.push(['prop', k, x * T, y * T, { size: 1.2 }]);
  // shop fronts: awnings, signs, windows
  D.push(['sign', 18.5 * T, 31 * T, 30, "SATOLLI'S PORK STORE", { color: '#ffe0b0' }]);
  D.push(['pig', 18.5 * T, 28 * T, 40]);
  D.push(['sign', 29.5 * T, 31 * T, 28, 'PASTICCERIA BELLA', { color: '#ffd0e0', border: '#e890b0' }]);
  D.push(['sign', 43.5 * T, 31 * T, 34, 'NUOVO VESUVIO', { color: '#f0e0a0' }]);
  D.push(['sign', 55.5 * T, 31 * T, 30, 'BADA BOOM', { neon: true, color: '#ff4ab0', scale: 2 }]);
  D.push(['sign', 66.5 * T, 31 * T, 26, "HOLSTEIN'S", { neon: true, color: '#4ae0ff' }]);
  D.push(['sign', 46.5 * T, 12 * T, 46, 'J. MELBA, M.D. - PSYCHIATRY', { color: '#e8e8f0', bg: ['#3a4a5a', '#1a2430'], border: '#c8d0d8' }]);
  D.push(['sign', 24.5 * T, 35 * T, 22, 'BARONI SANITATION', { color: '#d8f0b0', bg: ['#2a4a2a', '#102010'], border: '#8ab070' }]);
  D.push(['sign', 47.5 * T, 42 * T, 40, 'GREEN GROVES RETIREMENT', { color: '#e0f0d0', bg: ['#3a5a3a', '#1a2a1a'], border: '#a0c090' }]);
  D.push(['sign', 4.5 * T, 30.4 * T, 14, 'PINE BARRENS 60 MI', { color: '#f0f0d0', bg: ['#2a5a2a', '#143014'], border: '#e0e0c0' }]);
  for (const [x, c] of [[15.5, '#3a7a3a'], [21.5, '#c83a3a'], [26, '#e890b0'], [32, '#e890b0'], [41, '#2a6a3a'], [46.5, '#c8a040'], [64, '#3a6ac8'], [69, '#3a6ac8']]) D.push(['prop', 'awning', x * T, 31 * T - 2, { color: c, size: 1.3 }]);
  for (const x of [16, 21, 26.5, 31.5, 41.5, 45.5, 64.5, 68.5]) D.push(['window', x * T, 31 * T - 1]);
  for (const d of DOORS) D.push(['door', d.at[0], d.at[1] - 4]);
  D.push(['door', 19.5 * T, 11 * T - 2]);   // home's front door (no interior: the family is out)
  // the yard: a garbage truck, dumpsters, barrels
  D.push(['car', 28 * T, 40 * T, 0, '#e8e8e0', 'truck', { bin: '#2a6a3a' }]); B.push({ x: 28 * T, y: 40 * T, r: 26 }, { x: 28 * T + 24, y: 40 * T, r: 14 }, { x: 28 * T - 24, y: 40 * T, r: 14 });
  for (const [x, y] of [[22, 44], [31, 37], [16, 37]]) { D.push(['box', x * T, y * T, 0, 26, 14, 0, 18, '#2e6a4a', 'dumpster']); B.push({ x: x * T, y: y * T, r: 13 }); }
  for (const [x, y] of [[24, 37], [24.8, 37.5], [33, 43], [33.6, 44]]) D.push(['shape', 'barrel', x * T, y * T, {}]);
  for (const [x, y] of [[18, 26], [30, 21], [56, 19], [45, 20]]) { D.push(['box', x * T, y * T, 0, 26, 14, 0, 18, '#2e5a6a', 'dumpster']); B.push({ x: x * T, y: y * T, r: 13 }); }
  // parked cars along the lots
  for (const [x, y, a, c] of [[54, 5, Math.PI / 2, '#8a2a2a'], [57, 5, Math.PI / 2, '#d8d0c0'], [65, 19, Math.PI / 2, '#3a5a8a'], [68, 20, Math.PI / 2, '#e8c050'], [42, 19, 0, '#4a6a4a'], [24, 19, 0, '#6a4a7a']]) {
    D.push(['car', x * T, y * T, a, c, 'sedan']); B.push({ x: x * T, y: y * T, r: 12 });
  }
  // the pool: a ladder, loungers
  D.push(['box', 27 * T, 6 * T, 0, 22, 8, Math.PI / 2, 5, '#e8e8f0', 'lounger']); D.push(['box', 34.3 * T, 5 * T, 0, 22, 8, Math.PI / 2, 5, '#e8e8f0', 'lounger']);
  D.push(['prop', 'flowers', 34 * T, 9.5 * T, {}]);
  // the nursing home and houses: bushes
  for (const [x, y] of [[41, 42], [53.5, 42], [63.5, 42], [70, 42]]) D.push(['prop', 'bush', x * T, y * T, { size: 1.3 }]);
}
function dressRooms() {
  const O = AREAS.office, Pk = AREAS.pork, C = AREAS.club, Dn = AREAS.diner, G = AREAS.groves;
  O.dress.push(['shape', 'bookcase', 2 * T, 1.4 * T, { facing: Math.PI / 2 }], ['shape', 'bookcase', 3.4 * T, 1.4 * T, { facing: Math.PI / 2 }], ['shape', 'chair', 4 * T, 4.4 * T, { facing: 0 }],
    ['shape', 'chair', 8 * T, 4.4 * T, { facing: Math.PI }], ['prop', 'lamp', 10.5 * T, 2 * T, { light: true, size: .8 }], ['prop', 'bush', 1.6 * T, 6 * T, { size: 1 }],
    ['shape', 'table', 6 * T, 4.5 * T, { facing: 0, scale: .6 }], ['window', 6 * T, 1 * T], ['prop', 'pot', 10.4 * T, 6.4 * T, {}]);
  O.blockers.push({ x: 2.6 * T, y: 1.4 * T, r: 14 }, { x: 6 * T, y: 4.5 * T, r: 6 });
  // the pork store: the deli case, the counter, the back table where the crew sits
  Pk.dress.push(['box', 4 * T, 3 * T, 0, 80, 14, 0, 16, '#e8e8f0', 'deli'], ['box', 11 * T, 2 * T, 0, 28, 14, 0, 30, '#c8c8d0', 'fridge'],
    ['shape', 'table', 9 * T, 6 * T, { facing: 0 }], ['shape', 'chair', 8 * T, 6 * T, { facing: 0 }], ['shape', 'chair', 10 * T, 6 * T, { facing: Math.PI }], ['shape', 'chair', 9 * T, 7 * T, { facing: -Math.PI / 2 }],
    ['shape', 'shelf', 1.4 * T, 6 * T, { facing: 0 }], ['shape', 'barrel', 12.4 * T, 7 * T, {}], ['prop', 'lamp', 6.5 * T, 1.4 * T, { light: true, size: .7 }], ['window', 3 * T, 1 * T], ['window', 10 * T, 1 * T]);
  Pk.blockers.push({ x: 2.5 * T, y: 3 * T, r: 10 }, { x: 4 * T, y: 3 * T, r: 10 }, { x: 5.6 * T, y: 3 * T, r: 10 }, { x: 11 * T, y: 2 * T, r: 12 }, { x: 9 * T, y: 6 * T, r: 9 });
  // the club: the bar, stools, the stage with its pole, booths
  C.dress.push(['box', 4 * T, 2.2 * T, 0, 96, 14, 0, 18, '#5a2a1a', 'bar'], ['box', 12 * T, 2.6 * T, 0, 52, 30, 0, 6, '#2a1a3a', 'stage'], ['pole', 12 * T, 2.6 * T],
    ['box', 2 * T, 7 * T, 0, 30, 12, Math.PI / 2, 12, '#8a1a3a', 'booth'], ['box', 13.5 * T, 7 * T, 0, 30, 12, Math.PI / 2, 12, '#8a1a3a', 'booth'],
    ['shape', 'table', 4 * T, 7 * T, { scale: .7 }], ['shape', 'table', 11.5 * T, 7 * T, { scale: .7 }],
    ['sign', 8 * T, 1.05 * T, 30, 'BADA BOOM', { neon: true, color: '#ff4ab0', scale: 2 }]);
  for (let i = 0; i < 5; i++) C.dress.push(['shape', 'stool', (1.8 + i * 1.1) * T, 3.4 * T, {}]);
  C.blockers.push({ x: 2.5 * T, y: 2.2 * T, r: 10 }, { x: 4 * T, y: 2.2 * T, r: 10 }, { x: 5.5 * T, y: 2.2 * T, r: 10 }, { x: 12 * T, y: 2.6 * T, r: 16 }, { x: 2 * T, y: 7 * T, r: 9 }, { x: 13.5 * T, y: 7 * T, r: 9 });
  // the diner: booths along the window, the counter, the jukebox
  for (const x of [2.5, 5.5, 8.5]) Dn.dress.push(['shape', 'table', x * T, 2.4 * T, { scale: .75 }], ['box', (x - .9) * T, 2.4 * T, 0, 20, 7, Math.PI / 2, 9, '#8a2a2a', 'booth'], ['box', (x + .9) * T, 2.4 * T, 0, 20, 7, Math.PI / 2, 9, '#8a2a2a', 'booth']);
  Dn.dress.push(['box', 10 * T, 6 * T, 0, 52, 12, 0, 16, '#c8ccd8', 'counter'], ['jukebox', 12 * T, 2 * T], ['window', 3 * T, 1 * T], ['window', 7 * T, 1 * T], ['prop', 'lamp', 1.5 * T, 6.5 * T, { light: true, size: .7 }]);
  for (let i = 0; i < 4; i++) Dn.dress.push(['shape', 'stool', (8.6 + i * .95) * T, 7 * T, {}]);
  for (const x of [2.5, 5.5, 8.5]) Dn.blockers.push({ x: x * T, y: 2.4 * T, r: 8 }, { x: (x - 1) * T, y: 2.4 * T, r: 5 }, { x: (x + 1) * T, y: 2.4 * T, r: 5 });
  Dn.blockers.push({ x: 9 * T, y: 6 * T, r: 9 }, { x: 11 * T, y: 6 * T, r: 9 }, { x: 12 * T, y: 2 * T, r: 8 });
  G.dress.push(['shape', 'bed', 2 * T, 2 * T, { facing: Math.PI / 2 }], ['shape', 'chair', 7 * T, 3 * T, { facing: Math.PI }], ['prop', 'bush', 10.4 * T, 1.8 * T, {}], ['window', 5 * T, 1 * T],
    ['prop', 'lamp', 9.5 * T, 4.6 * T, { light: true, size: .7 }], ['shape', 'table', 5 * T, 3 * T, { scale: .6 }]);
  G.blockers.push({ x: 2 * T, y: 2 * T, r: 14 }, { x: 5 * T, y: 3 * T, r: 6 });
}

// draws an area's dressing (night: lamps light up)
function drawDress(r, A, night) {
  for (const d of A.dress) {
    const k = d[0];
    if (k === 'prop') r.prop(d[1], d[2], d[3], 0, d[4]);
    else if (k === 'shape') r.shape(d[1], d[2], d[3], 0, d[4]);
    else if (k === 'lamp') { r.prop('streetlamp', d[1], d[2], 0, { light: night, cone: night, size: 1.2 }); if (night) L.add(d[1], d[2], 30, 70, .8, { color: '#ffd8a0' }); }
    else if (k === 'sign') signBoard(r, d[1], d[2] + .5, d[3], d[4], d[5]);
    else if (k === 'window') r.prop('window', d[1], d[2], 14, { size: .8, colors: night ? ['#ffd890', '#f0b860'] : ['#a8c8e0', '#c8e0f0'] });
    else if (k === 'door') r.prop('door', d[1], d[2], 0, { size: 1.1 });
    else if (k === 'car') drawCar(r, null, d[1], d[2], 0, d[3], d[4], d[5], Object.assign({ night: false }, d[6]));
    else if (k === 'box') { const [, x, y, z, len, wid, ang, h, col, kind] = d; r.shadow(x, y, len * .5, .3, undefined, 0); r.queue(x, y, z + h / 2, g => obox(g, r, x, y, ang, len, wid, z, z + h, col, boxLook(kind)), { solid: true }); }
    else if (k === 'pig') drawPig(r, d[1], d[2], d[3]);
    else if (k === 'pole') { r.queue(d[1], d[2], 30, g => { const a = r.w(d[1], d[2], 6), b = r.w(d[1], d[2], 60); px.line(g, a[0], a[1], b[0], b[1], '#e8e8f0', 2); px.line(g, a[0] + 1, a[1], b[0] + 1, b[1], '#8a8a98'); }); L.add(d[1], d[2], 40, 50, .9, { color: '#ff5ac8' }); }
    else if (k === 'jukebox') { const [, x, y] = d; r.queue(x, y, 12, g => obox(g, r, x, y, 0, 14, 10, 0, 26, '#a83a2a', { top: '#ffd070', faces: { right: '#ffb040' }, paint: (g2, f, pts) => { if (f === 'right') { const m = pts[3]; for (let i = 0; i < 4; i++) px.rect(g2, m[0] + 2 + i * 3, m[1] + 4, 2, 8, ['#ff4a4a', '#ffd04a', '#4aff8a', '#4ab0ff'][(i + (game.time * 4 | 0)) % 4]); } } }), { emissive: true }); L.add(x, y + 6, 20, 46, .8, { color: '#ffb050' }); }
  }
}
function boxLook(kind) {
  if (kind === 'deli') return { faces: { right: '#c8e8f0' }, top: '#f0f4f8', paint: (g, f, pts) => { if (f === 'right') { for (let i = 0; i < 7; i++) { const u = (i + .5) / 7, x = lerp(pts[0][0], pts[1][0], u), y = lerp(pts[3][1], pts[0][1], .55); px.disc(g, x, y, 2.4, i % 2 ? '#c84a4a' : '#e8a0a0'); px.dot(g, x - 1, y - 1, '#ffe0e0'); } } } };
  if (kind === 'dumpster') return { top: '#1e4a34' };
  if (kind === 'booth') return { top: '#e85a5a' };
  if (kind === 'bar') return { top: '#8a4a2a', paint: (g, f, pts) => { if (f === 'top') for (let i = 0; i < 6; i++) { const u = (i + .5) / 6, p = [lerp(pts[0][0], pts[1][0], u), lerp(pts[0][1], pts[1][1], u)]; px.rect(g, p[0], p[1] - 4, 1, 4, ['#4ac84a', '#e8c84a', '#c84a4a'][i % 3]); } } };
  if (kind === 'stage') return { top: '#5a2a6a' };
  if (kind === 'counter') return { top: '#e8e8f0' };
  return {};
}
// Satolli's pig: a pink Blob on the roof with a painted snout
const PIG = new E.Blob({ R: 9, ears: 'cat', feet: true, tail: true, mouth: true, colors: { dk: '#b85a6a', base: '#f0a0b0', lt: '#ffd0d8', spec: '#ffffff', eye: '#1a1010', pupil: '#1a1010' } });
function drawPig(r, x, y, z) {
  PIG.update(1 / 60, { look: [1, .3], walk: 0 });
  r.actor(x, y, z, (g, ox, oy) => { PIG.draw(g, ox, oy, r.view); px.ell(g, ox + 7, oy - 9, 3, 2, '#e07a8a'); px.dot(g, ox + 6, oy - 9, '#8a3a4a'); px.dot(g, ox + 8, oy - 9, '#8a3a4a'); });
}
