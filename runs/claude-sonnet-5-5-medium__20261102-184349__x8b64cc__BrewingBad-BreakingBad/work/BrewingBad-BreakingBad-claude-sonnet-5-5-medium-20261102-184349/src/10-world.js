/* ---- THE WORLD: Santa Muerta, New Mexico. A town of lawns and low roofs in the west; the desert, a junkyard, an RV and the
 * rival camp in the east. One TileMap, drawn from rows built in code ---- */
const T = 16, MW = 56, MH = 40;
const G = Array.from({ length: MH }, () => Array(MW).fill('s'));
const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (G[j] && G[j][i] !== undefined) G[j][i] = c; };
const house = (x, y, w, h, wall, floor, doors) => { rect(x, y, w, h, wall); rect(x + 1, y + 1, w - 2, h - 2, floor); for (const d of doors) rect(d[0], d[1], d[2], d[3], 'f'); };
rect(1, 1, 35, 38, 'r');                                   // the town: asphalt
rect(1, 10, 12, 5, 'g'); rect(13, 3, 6, 8, 'g'); rect(30, 10, 6, 5, 'g'); rect(1, 21, 8, 3, 'g'); rect(14, 32, 20, 6, 'g');   // lawns and the park
rect(14, 4, 4, 3, 'b'); rect(31, 11, 4, 3, 'b'); rect(15, 33, 4, 4, 'b'); rect(2, 33, 6, 4, 'b'); rect(34, 22, 2, 7, 'b'); rect(24, 12, 4, 2, 'b');   // brush: hide in it
house(3, 3, 8, 7, '1', 'f', [[6, 9, 2, 1]]);               // the Hoyt house
house(20, 3, 10, 7, '2', 'f', [[24, 9, 2, 1]]);            // Dusty's Hardware
house(21, 25, 13, 7, '3', 'f', [[26, 25, 2, 1]]);          // Suds & Duds car wash
house(3, 25, 10, 7, '4', 'f', [[7, 25, 2, 1]]);            // Los Gallos
rect(36, 1, 1, 14, '6'); rect(36, 21, 1, 18, '6');         // the town's edge, open where the road leaves
rect(37, 15, 18, 6, 's'); rect(36, 17, 13, 3, 'd'); rect(44, 20, 3, 6, 'd');   // the desert track
house(38, 2, 15, 9, '7', 'y', [[43, 10, 3, 1]]);           // the junkyard
house(40, 13, 8, 5, '5', 'f', [[43, 17, 2, 1]]);           // the RV
house(38, 25, 16, 13, '6', 's', [[44, 25, 3, 1]]);         // the rival camp, ringed by rock
rect(0, 0, MW, 1, '6'); rect(0, MH - 1, MW, 1, '6'); rect(0, 0, 1, MH, '6'); rect(MW - 1, 0, 1, MH, '6');
rect(1, 1, MW - 2, 1, '6'); rect(1, MH - 2, MW - 2, 1, '6'); rect(1, 1, 1, MH - 2, '6'); rect(MW - 2, 1, 1, MH - 2, '6');
rect(2, 1, 8, 1, '6');
for (const [x, y] of [[40, 22], [48, 23], [52, 12], [53, 17], [38, 21], [52, 22], [50, 34 - 12], [41, 23]]) if (G[y][x] === 's') G[y][x] = '6';
for (const [x, y, w, h] of [[14, 22, 3, 1], [12, 38 - 9, 1, 1], [29, 20, 2, 1], [6, 20, 2, 1]]) rect(x, y, w, h, '8');   // dumpsters and low walls
rect(6, 20, 2, 1, 'r'); rect(12, 29, 1, 1, 'r');
// cover in the junkyard and the camp
for (const [x, y, w, h] of [[42, 5, 2, 1], [47, 7, 1, 2], [40, 8, 2, 1], [49, 4, 2, 1], [42, 28, 3, 1], [48, 28, 3, 1], [45, 33, 3, 1], [40, 32, 1, 2], [51, 32, 1, 2]]) rect(x, y, w, h, '8');
const ROWS = G.map(r => r.join(''));
const FLOORMATS = { road: 'asphalt', sand: 'sand', lawn: 'lawngrass', brush: 'scrub', floor: 'tilefloor', dirt: 'dust', yard: 'dust' };
E.MATERIALS.asphalt = { color: '#4a4a52' }; E.MATERIALS.lawngrass = { color: '#5f8a3e' }; E.MATERIALS.scrub = { color: '#566a34' };
E.MATERIALS.tilefloor = { color: '#9a8c74' }; E.MATERIALS.dust = { color: '#b69062' };
const LEG = { r: { floor: 'road' }, s: { floor: 'sand' }, g: { floor: 'lawn' }, b: { floor: 'brush' }, f: { floor: 'floor' }, d: { floor: 'dirt' }, y: { floor: 'yard' }, c: { floor: 'road' } };
for (let i = 1; i <= 8; i++) LEG[String(i)] = { tile: i, floor: 'sand' };
const map = new E.TileMap({
  rows: ROWS, legend: LEG,
  types: {
    1: { h: 44, top: '#a85a3a', side: '#e0cfa8', face: 'plaster', roof: 'tiles', cut: true },
    2: { h: 44, top: '#7a7a82', side: '#a0462f', face: 'brick', roof: 'slab', cut: true },
    3: { h: 40, top: '#3a8a8a', side: '#b8d8d0', face: 'plaster', roof: 'plain', cut: true },
    4: { h: 44, top: '#a0301f', side: '#d8a050', face: 'timber', roof: 'tiles', cut: true, beam: '#5a3a22' },
    5: { h: 36, top: '#e8e4d8', side: '#d0c8b4', face: 'plaster', roof: 'plain', cut: true },
    6: { h: 56, top: '#b8855a', side: '#8a5c3a', face: 'rock', roof: 'plain', cut: true },
    7: { h: 22, top: '#8a6a44', side: '#6a4a2e', face: 'plank', roof: 'plain' },
    8: { h: 14, top: '#8a8a8a', side: '#6a6a70', face: 'stone', roof: 'slab' }
  },
  floorMats: FLOORMATS, floorMat: 'sand', ao: 4, outside: '#8c6a44'
});
const cellC = (cx, cy) => ({ x: cx * T + T / 2, y: cy * T + T / 2 });
const PX = (cx, cy) => cellC(cx, cy);
const WORLD = { w: MW * T, h: MH * T };

// places: where the player is (for the HUD's place line and the ambient mood)
const PLACES = [
  ['Hoyt house', 3, 3, 8, 7], ['Dusty\'s Hardware', 20, 3, 10, 7], ['Suds & Duds', 21, 25, 13, 7], ['Los Gallos', 3, 25, 10, 7], ['The RV', 40, 13, 8, 5],
  ['Junkyard', 38, 2, 15, 9], ['Rival camp', 38, 25, 16, 13], ['Desert track', 36, 15, 20, 11], ['Calle Sol', 0, 0, 36, 40]
];
const placeAt = (x, y) => { const cx = x / T, cy = y / T; for (const p of PLACES) if (cx >= p[1] && cx < p[1] + p[3] && cy >= p[2] && cy < p[2] + p[4]) return p[0]; return 'Desert'; };
const inBox = (x, y, name) => { const p = PLACES.find(q => q[0] === name), cx = x / T, cy = y / T; return cx >= p[1] && cx < p[1] + p[3] && cy >= p[2] && cy < p[2] + p[4]; };
const hidden = (x, y) => map.floorAt(x, y) === 'brush';

// set dressing: solid shapes (walk into one) and flat props (lamps, plants)
const SOLIDS = [];
const solid = (id, cx, cy, o = {}) => { const p = PX(cx, cy); SOLIDS.push([id, p.x, p.y, o]); map.solid(id, p.x, p.y, 0, o); };
const PROPS = [];
const prop = (name, cx, cy, o = {}) => { const p = PX(cx, cy); PROPS.push([name, p.x + (o.dx || 0), p.y + (o.dy || 0), o]); };
// town
solid('table', 6, 5, { facing: 0 }); solid('bed', 9, 4, { facing: 0 }); solid('bookcase', 4, 4, { facing: 0 });
solid('table', 24, 6, { facing: 0 }); solid('shelf', 22, 4, { facing: 0 }); solid('shelf', 27, 4, { facing: 0 }); solid('crate', 28, 7, { facing: .4 });
solid('table', 27, 28, { facing: 0 }); solid('barrel', 23, 27, { facing: 1 }); solid('crate', 31, 27, { facing: .3 });
solid('table', 6, 28, { facing: 0 }); solid('table', 10, 28, { facing: 0 }); solid('chair', 5, 29, { facing: 0 }); solid('chair', 11, 29, { facing: 3 });
solid('barrel', 30, 18, { facing: 1 }); solid('crate', 2, 19, { facing: .2 }); solid('barrel', 33, 33, { facing: 2 }); solid('cart', 17, 36, { facing: 0 });
solid('crate', 11, 36, { facing: .5 }); solid('barrel', 12, 17, { facing: .5 }); solid('crate', 13, 17, { facing: .1 });
for (const [n, x, y] of [['tree', 15, 5], ['tree', 17, 9], ['tree', 14, 9], ['palm', 5, 12], ['palm', 10, 12], ['tree', 32, 12], ['tree', 33, 13], ['bush', 2, 11], ['bush', 12, 11], ['flowers', 4, 11], ['flowers', 8, 11],
  ['streetlamp', 12, 15], ['streetlamp', 20, 15], ['streetlamp', 28, 15], ['streetlamp', 34, 20], ['streetlamp', 8, 20], ['streetlamp', 18, 20], ['hydrant', 14, 14], ['trashcan', 19, 10], ['trashcan', 31, 9],
  ['sign', 24, 10], ['sign', 26, 24], ['sign', 7, 24], ['awning', 24, 9], ['awning', 7, 25], ['bush', 16, 12], ['bush', 17, 6], ['bush', 32, 14], ['bush', 16, 35], ['bush', 4, 35], ['tree', 3, 22], ['tree', 6, 22],
  ['lamp', 6, 8], ['lamp', 24, 4], ['lantern', 7, 26], ['lamp', 27, 27]]) prop(n, x, y, n === 'awning' ? { dy: 6 } : {});
// desert
for (const [n, x, y] of [['cactus', 40, 15], ['cactus', 51, 17], ['cactus', 38, 22], ['cactus', 52, 20], ['rock', 43, 22], ['rock', 50, 15], ['bones', 49, 20], ['skull', 41, 21], ['cactus', 49, 24], ['rock', 38, 23], ['cactus', 53, 24],
  ['sign', 37, 17]]) prop(n, x, y);
// junkyard
for (const [id, x, y, f] of [['cart', 40, 4, 0], ['cart', 49, 8, 1.2], ['barrel', 41, 10, 1], ['barrel', 51, 5, 2], ['crate', 45, 5, .3], ['crate', 50, 10, .1], ['barrel', 47, 4, 0], ['cart', 44, 8, .6]]) solid(id, x, y, { facing: f });
for (const [n, x, y] of [['firedrum', 46, 9], ['trashcan', 42, 9], ['lamp', 45, 3], ['bones', 48, 6], ['skull', 40, 6]]) prop(n, x, y);
// the RV
solid('table', 43, 15, { facing: 0 }); solid('crate', 45, 15, { facing: .2 }); solid('barrel', 41, 14, { facing: 0 });
prop('lamp', 44, 14); prop('sign', 44, 18);
// the camp
for (const [id, x, y, f] of [['barrel', 40, 27, 1], ['barrel', 41, 27, 2], ['crate', 51, 27, .3], ['crate', 51, 26, 0], ['barrel', 40, 35, 0], ['cart', 49, 35, .4], ['crate', 47, 28, .9], ['table', 45, 31, 0], ['crate', 44, 31, 0], ['barrel', 52, 35, 2]]) solid(id, x, y, { facing: f });
for (const [n, x, y] of [['firedrum', 43, 31], ['firedrum', 49, 31], ['brazier', 46, 27], ['sandbags', 44, 28], ['banner', 45, 26], ['banner', 47, 26], ['skull', 52, 31], ['bones', 41, 33], ['torch', 40, 30], ['torch', 52, 29], ['lamp', 40, 36], ['tree', 52, 36]]) prop(n, x, y);

// zone anchors (cells)
const AT = {
  start: PX(7, 12), home: PX(6, 6), hardware: PX(24, 5), clerk: PX(24, 5), junk: PX(44, 12), pinky: PX(44, 8), rv: PX(44, 16), rvDoor: PX(44, 18), cook: PX(43, 16),
  dealer: PX(8, 27), gallos: PX(8, 27), wash: PX(28, 28), washDoor: PX(27, 24), campGate: PX(45, 24), boss: PX(46, 32), marnie: PX(24, 27),
  town: PX(18, 17), track: PX(40, 19)
};
