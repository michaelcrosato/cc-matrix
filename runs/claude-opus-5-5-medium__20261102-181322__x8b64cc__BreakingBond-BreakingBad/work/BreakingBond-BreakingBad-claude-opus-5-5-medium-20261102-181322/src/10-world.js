/* =====================================================================================
 * 10 WORLD — the locations of Alamo Verde, New Mexico. Each location is data: rows of cells (walls by type, floor
 * tags), its set dressing (shapes, props), its lights and its mood (day or night, weather). Missions place people on
 * them. A designer adds a location by adding an entry to LOCATIONS.
 * ===================================================================================== */
const pad = (rows, w) => rows.map(r => r.length >= w ? r.slice(0, w) : r + r.slice(-1).repeat(w - r.length));
const WALLS = {
  1: { h: 44, top: '#5a4a42', side: '#9a6a52', face: 'brick', roof: 'slab', cut: true, cutH: 8 },                    // school's outer brick
  2: { h: 38, top: '#8a8478', side: '#d8cfba', face: 'plaster', roof: 'plain', cut: true, cutH: 6 },                 // interior walls
  3: { h: 13, top: '#2a2a30', side: '#6a6e78', face: 'steel', roof: 'plain' },                                         // lab benches
  4: { h: 30, top: '#3a5a7a', side: '#4a7aa8', face: 'metal', roof: 'plain' },                                         // lockers
  5: { h: 28, top: '#6a4a2a', side: '#8a6a42', face: 'plank', roof: 'plain' },                                         // storeroom shelves
  6: { h: 12, top: '#7a6a5a', side: '#a89070', face: 'plank', roof: 'plain' },                                         // wooden fence
  7: { h: 46, top: '#b8704a', side: '#a05a38', face: 'rock', roof: 'plain', cut: true, cutH: 10 },                     // desert mesa
  8: { h: 22, top: '#6a4a3a', side: '#7a5a48', face: 'rusted', roof: 'speckle' },                                       // junk piles
  9: { h: 20, top: '#8a9098', side: '#6a7078', face: 'iron', roof: 'plain', cut: true, cutH: 6 },                     // chain-link / sheet fence
  10: { h: 34, top: '#a04a32', side: '#e0c8a0', face: 'plaster', roof: 'tiles', cut: true, cutH: 8 },                 // adobe house, tile roof
  11: { h: 36, top: '#7a7a82', side: '#c8c0b4', face: 'plaster', roof: 'slab', cut: true, cutH: 8 },                  // stucco shops
  12: { h: 30, top: '#c8a040', side: '#e8d8b0', face: 'plaster', roof: 'plain', cut: true, cutH: 8 },                 // Pollo Sol
  13: { h: 10, top: '#5a8a3a', side: '#4a6a2a', face: 'hedge', roof: 'leaves' },                                      // hedges
  14: { h: 26, top: '#8a7a68', side: '#a8987e', face: 'timber', roof: 'tiles', cut: true, cutH: 8 }                  // trailer / shack
};
const tile = (o) => o;

/* SCHOOL: J. P. Wynne-ish "Alamo Verde High": the chemistry classroom, the locked storeroom, the hallway, the lot. */
const SCHOOL_ROWS = [
  '##############################',
  '#............=.SSSS.=........#',
  '#............=......=........#',
  '#............=.SSSS.=........#',
  '#............=......=........#',
  '#............=.SSSS.=........#',
  '#............=......=........#',
  '#............====.====.......#',
  '#............=......=........#',
  '#..bbb..bbb..=......=........#',
  '#####_########______=====_####',
  '#____________________________#',
  '#_LLLLL____LLLLL_______LLLL__#',
  '#____________________________#',
  '#############____#############',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'ffffffffffffffffffffffffffffff'
];
/* DESERT: the To'hajiilee-ish flats an hour from town, mesas, the RV's cook spot. */
function desertRows(W = 44, H = 32, seed = 11) {
  const rnd = E.rng(seed), rows = [];
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) s += (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 'M' : '.'; rows.push(s.split('')); }
  const blob = (cx, cy, rx, ry) => { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + rnd() * .3) rows[y][x] = 'M'; };
  blob(7, 6, 3, 2); blob(34, 5, 4, 2); blob(38, 24, 3, 3); blob(6, 25, 2, 3); blob(25, 27, 3, 1); blob(18, 4, 2, 1);
  for (let i = 0; i < 26; i++) { const x = 2 + Math.floor(rnd() * (W - 4)), y = 2 + Math.floor(rnd() * (H - 4)); if (Math.abs(x - 22) > 6 || Math.abs(y - 16) > 5) rows[y][x] = rows[y][x] === '.' ? ',' : rows[y][x]; }
  for (let y = 12; y <= 20; y++) for (let x = 16; x <= 28; x++) rows[y][x] = '.';   // the cook site stays clear
  return rows.map(r => r.join(''));
}
/* JUNKYARD: Two-Tone Tito's yard: lanes between junk piles, a crusher, his trailer. */
const JUNK_ROWS = [
  '9999999999999999999999999999999999',
  '9........JJJ.............JJJJ....9',
  '9.TTTT...JJJ......JJ.....JJJJ....9',
  '9.TTTT............JJ.............9',
  '9.TTTT...................JJ......9',
  '9.......JJJJ......JJJJ...JJ......9',
  '9.......JJJJ......JJJJ...........9',
  '9.JJ.............................9',
  '9.JJ.......JJ..........JJJJ......9',
  '9..........JJ..........JJJJ...JJ.9',
  '9....JJJ.......................JJ9',
  '9....JJJ.........JJJ.............9',
  '9................JJJ.....JJJ.....9',
  '9..JJ....................JJJ.....9',
  '9..JJ........JJJJ................9',
  '9............JJJJ.........JJ.....9',
  '9.....JJ..................JJ.....9',
  '9.....JJ.......................JJ9',
  '9..............................JJ9',
  '9999999999999999.....999999999999'
];
/* TOWN: a few Alamo Verde blocks at night: houses, Barry's office, the car wash, Pollo Sol, alleys. */
const TOWN_ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
  'H,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,H',
  'H,hhhhh,,ggg,,hhhhh,,,,,,SSSSSS,,,,,,PPPPPP,,H',
  'H,hhhhh,,ggg,,hhhhh,,,,,,SSSSSS,,,,,,PPPPPP,,H',
  'H,hhhhh,,,,,,,hhhhh,,,,,,SSSSSS,,,,,,PPPPPP,,H',
  'H::::::::::::::::::::::::::::::::::::::::::::H',
  'H============================================H',
  'H============================================H',
  'H::::::::::::::::::::::::::::::::::::::::::::H',
  'H,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,,,::,,,,,,H',
  'H,hhhhh,,,ggg,,,::,,SSSSSSS,,,,,,,,,::,hhhhh,H',
  'H,hhhhh,,,ggg,,,::,,SSSSSSS,,,,,,,,,::,hhhhh,H',
  'H,hhhhh,,,,,,,,,::,,SSSSSSS,,,hhhh,,::,hhhhh,H',
  'H,,,,,,,,,,,,,,,::,,,,,,,,,,,,hhhh,,::,,,,,,,H',
  'H::::::::::::::::::::::::::::::::::::::::::::H',
  'H============================================H',
  'H============================================H',
  'H::::::::::::::::::::::::::::::::::::::::::::H',
  'H,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,H',
  'H,hhhhh,,ggg,,,,,,,,,,,,,,,,,,,,,,,,,,hhhhh,,H',
  'H,hhhhh,,ggg,,,,,,,,,,,,,,,,,,,,,,,,,,hhhhh,,H',
  'H,hhhhh,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,hhhhh,,H',
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH'
];

// floors: linoleum, hallway tiles, asphalt with parking lines, sand, cracked yard dirt, sidewalks, roads with lane marks
const FLOORS = {
  school: (x, y, tag) => {
    if (tag === 'lot') { const c = E.tex.plain(x, y, { base: '#3c3a3e', amount: .18 }); if ((((x % 64) + 64) % 64 < 1.6 && (y % 96) < 40) || (y > 300 && y < 302)) return [210, 190, 90]; return c; }
    if (tag === 'hall') return E.tex.checker(x, y, { a: '#b8ae9c', b: '#9c917e', size: 16 });
    if (x > 13 * 16 && x < 21 * 16 && y < 10 * 16) return E.tex.plain(x, y, { base: '#7a7468', amount: .2 });
    return E.tex.checker(x, y, { a: '#d6ccb4', b: '#c4b89e', size: 8 });
  },
  desert: (x, y, tag) => tag === 'scrub' ? E.tex.dirt(x, y, { base: '#b88a58', dark: '#9a6e44', light: '#cfa070' }) : E.tex.dirt(x, y, { base: '#d0a06a', dark: '#b8865a', light: '#e4bc86' }),
  junk: (x, y) => { const c = E.tex.dirt(x, y, { base: '#7a6448', dark: '#5e4c36', light: '#907656' }); return E.hash2(Math.floor(x / 5), Math.floor(y / 5)) > .97 ? [60, 50, 44] : c; },
  town: (x, y, tag) => {
    if (tag === 'road') { const c = E.tex.plain(x, y, { base: '#34323a', amount: .16 }); const ry = ((y % 64) + 64) % 64; if (Math.abs(ry - 31) < 1 && (x % 24) < 12) return [220, 200, 90]; return c; }
    if (tag === 'walk') return E.tex.checker(x, y, { a: '#9a948a', b: '#8c867c', size: 16 });
    return E.tex.dirt(x, y, { base: '#8a7a5a', dark: '#706246', light: '#a08e68' });
  }
};

const LOCATIONS = {
  school: {
    name: 'Alamo Verde High', rows: SCHOOL_ROWS, w: 30, floor: FLOORS.school,
    legend: { '#': 1, '=': 2, b: 3, L: 4, S: 5, f: 6, ',': { floor: 'lot' }, '_': { floor: 'hall' } },
    dress: [['chalkboard', 6.5, 1.2, { facing: Math.PI / 2 }], ['desk', 3, 3.5], ['desk', 5.5, 3.5], ['desk', 8, 3.5], ['desk', 10.5, 3.5], ['desk', 3, 5.6], ['desk', 5.5, 5.6], ['desk', 8, 5.6], ['desk', 10.5, 5.6],
      ['desk', 3, 7.6], ['desk', 5.5, 7.6], ['desk', 10.5, 7.6], ['labbench', 3.8, 9.3, { solid: false }], ['labbench', 8.8, 9.3, { solid: false }], ['vending', 27.6, 11.3, { facing: Math.PI / 2 }],
      ['drum', 19.5, 1.5], ['sedan', 4, 17.5, { facing: Math.PI / 2 }], ['sedan', 8, 17.5, { facing: Math.PI / 2, mats: { b: '#8a3a32 none' } }],
      ['sedan', 20, 17.5, { facing: -Math.PI / 2, mats: { b: '#3a5a8a none' } }], ['sedan', 24, 17.5, { facing: -Math.PI / 2, mats: { b: '#c8c0a8 none' } }], ['bench', 26, 15.6, { facing: Math.PI / 2 }],
      ['table', 24.5, 3.5], ['chair', 23.3, 3.5, { facing: 0 }], ['chair', 25.7, 3.5, { facing: Math.PI }], ['bookcase', 27.8, 1.6, { facing: Math.PI / 2 }]],
    props: [['sign', 15, 14.7, 0, {}], ['streetlamp', 2, 15.6, 0, { light: true }], ['streetlamp', 27.5, 20.3, 0, { light: true }], ['trashcan', 12.4, 13.3, 0, {}], ['pot', 1.6, 1.6, 0, {}]],
    lamps: [[6.5, 5, 40, 120, .8, '#fff4dc'], [17, 4, 34, 70, .55, '#e8f0ff'], [25, 5, 40, 90, .7, '#fff0d0'], [7, 12, 34, 90, .6, '#e8f0ff'], [20, 12, 34, 90, .6, '#e8f0ff']],
    outside: '#2a2620'
  },
  desert: {
    name: 'The Flats, 40 miles out', rowsFn: () => desertRows(), w: 44, floor: FLOORS.desert,
    legend: { M: 7, ',': { floor: 'scrub' } },
    dress: [['rv', 22, 15, { facing: 0.3 }], ['cookrig', 25.5, 17.4, { facing: Math.PI / 2, solid: false }], ['drum', 19.2, 14.2], ['drum', 19.8, 15.4, { mats: { b: '#a83a2a metal' } }], ['crate', 26.5, 13.8], ['mesa', 12, 20], ['mesa', 31, 11], ['mesa', 30, 23]],
    props: [['cactus', 14, 10, 0, { size: 1.3 }], ['cactus', 30, 18, 0, { size: 1.2 }], ['cactus', 10, 14, 0, { size: 1.4 }], ['cactus', 36, 14, 0, { size: 1.1 }], ['cactus', 20, 24, 0, { size: 1.3 }], ['cactus', 27, 8, 0, { size: 1.2 }],
      ['rock', 16, 21, 0, {}], ['rock', 29, 13, 0, {}], ['bones', 33, 20, 0, {}], ['skull', 11, 18, 0, {}], ['bush', 24, 22, 0, {}], ['bush', 17, 9, 0, {}], ['firedrum', 18.4, 17.8, 0, { light: true }]],
    lamps: [], outside: '#c8955e', weather: { kind: 'sand', amount: .25, wind: .6 }
  },
  junk: {
    name: "Two-Tone Tito's Salvage", rows: JUNK_ROWS, w: 34, floor: FLOORS.junk,
    legend: { 9: 9, J: 8, T: 14 },
    dress: [['crusher', 16, 9], ['junker', 6, 12, { facing: .4 }], ['junker', 28, 14, { facing: 2.2 }], ['junker', 21, 3, { facing: 1.1 }], ['tires', 13, 17], ['tires', 30, 6], ['tires', 4, 16], ['drum', 8, 3.5], ['drum', 22, 16.5], ['dumpster', 10, 18, { facing: Math.PI / 2 }], ['sedan', 18, 17.8, { facing: -Math.PI / 2, mats: { b: '#c83a8a none' } }]],
    props: [['firedrum', 7, 8, 0, { light: true }], ['firedrum', 24, 11, 0, { light: true }], ['firedrum', 12, 15, 0, { light: true }], ['streetlamp', 17, 18.6, 0, { light: true }], ['sign', 3, 6, 0, {}], ['trashcan', 31, 17, 0, {}], ['crate', 25, 2, 0, {}]],
    lamps: [[3.5, 3.5, 30, 60, .7, '#ffb060']], outside: '#3a3028'
  },
  town: {
    name: 'Central Alamo Verde', rows: TOWN_ROWS, w: 46, floor: FLOORS.town,
    legend: { H: 6, h: 10, g: 13, S: 11, P: 12, '=': { floor: 'road' }, ':': { floor: 'walk' }, ',': { floor: 'yard' } },
    dress: [['carwash', 28, 13.5, { facing: Math.PI / 2 }], ['fryer', 36.5, 8.6], ['bench', 12, 8.6, { facing: Math.PI / 2 }], ['bench', 32, 17.6, { facing: Math.PI / 2 }], ['dumpster', 23.5, 13, { facing: Math.PI / 2 }], ['dumpster', 9, 18.4, { facing: Math.PI / 2 }],
      ['sedan', 6, 9.4, { facing: 0 }], ['sedan', 41, 18.4, { facing: Math.PI, mats: { b: '#c8b03a none' } }], ['sedan', 22, 4.4, { facing: 0, mats: { b: '#5a3a8a none' } }], ['sedan', 30, 9.5, { facing: Math.PI, mats: { b: '#3a7a7a none' } }]],
    props: [['streetlamp', 4, 5.2, 0, { light: true }], ['streetlamp', 14, 5.2, 0, { light: true }], ['streetlamp', 24, 5.2, 0, { light: true }], ['streetlamp', 34, 5.2, 0, { light: true }], ['streetlamp', 43, 5.2, 0, { light: true }],
      ['streetlamp', 8, 17.8, 0, { light: true }], ['streetlamp', 20, 17.8, 0, { light: true }], ['streetlamp', 30, 17.8, 0, { light: true }], ['streetlamp', 40, 17.8, 0, { light: true }],
      ['hydrant', 18, 8.6, 0, {}], ['hydrant', 38, 14.4, 0, {}], ['trashcan', 26, 8.6, 0, {}], ['trashcan', 16, 13.4, 0, {}], ['awning', 28.5, 5.1, 0, {}], ['awning', 40.5, 5.1, 0, { color: '#e8a020' }], ['palm', 2, 13, 0, {}], ['palm', 44, 9, 0, {}], ['cactus', 33, 13, 0, {}]],
    lamps: [[40.5, 3.5, 30, 70, .8, '#ffd060'], [28.5, 3.5, 30, 60, .6, '#a0e0ff'], [23, 11, 30, 50, .5, '#ffe0a0']], outside: '#1c1a20'
  }
};

// build a location's map once: walls, floors, and its dressing made solid where it stands
function buildLocation(id) {
  const L0 = LOCATIONS[id];
  if (L0.map) return L0;
  const rows = pad(L0.rowsFn ? L0.rowsFn() : L0.rows, L0.w);
  const types = {}; for (const k in WALLS) types[k] = Object.assign({}, WALLS[k]);
  L0.map = new E.TileMap({ rows, legend: L0.legend, types, floorTex: L0.floor, ao: 5, outside: L0.outside });
  for (const [sid, cx, cy, o] of L0.dress) if (!o || o.solid !== false) L0.map.solid(sid, (cx) * R16, (cy) * R16, 0, Object.assign({}, o || {}));
  return L0;
}
function drawLocation(r, loc, night) {
  const m = loc.map;
  m.drawFloor(r); m.queueWalls(r);
  for (const [sid, cx, cy, o] of loc.dress) r.shape(sid, cx * R16, cy * R16, 0, o ? { facing: o.facing, mats: o.mats, scale: o.scale } : undefined);
  for (const [pid, cx, cy, z, o] of loc.props) r.prop(pid, cx * R16, cy * R16, z, Object.assign({}, o, { light: night && o.light, size: o.size || 1.3 }));
  if (night) for (const [cx, cy, z, rad, it, color] of loc.lamps) L.add(cx * R16, cy * R16, z, rad, it, { color });
}
