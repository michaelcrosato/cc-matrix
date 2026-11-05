/* the places: yard, town, therapy, woods (the dream), diner. Maps are built from rules, not typed out. */
(() => {
const G = SD, E = G.E, P = G.P;

const LEG = {
  g: { tile: 0, floor: 'grass' }, p: { tile: 0, floor: 'paving' }, r: { tile: 0, floor: 'road' }, w: { tile: 0, floor: 'water', block: true },
  i: { tile: 0, floor: 'wood' }, t: { tile: 0, floor: 'tile' }, s: { tile: 0, floor: 'snow' }, c: { tile: 0, floor: 'carpet' }, k: { tile: 0, floor: 'rubble' },
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9
};
const TYPES = {
  1: { h: 36, face: 'brick', roof: 'slab', top: '#6b4a40', side: '#9a5a44' },        // pork store
  2: { h: 36, face: 'plaster', roof: 'tiles', top: '#8a5a50', side: '#d8c8a8' },      // laundromat / house
  3: { h: 38, face: 'brick', roof: 'slab', top: '#40303c', side: '#7a2a3a' },        // lounge
  4: { h: 36, face: 'plaster', roof: 'tiles', top: '#a85a3a', side: '#e8c86a' },      // pizzeria
  5: { h: 38, face: 'stone', roof: 'slab', top: '#555a66', side: '#8a909c' },         // therapy
  6: { h: 34, face: 'plaster', roof: 'plain', top: '#9ab0b8', side: '#d8e4e8' },      // diner
  7: { h: 22, face: 'hedge', roof: 'leaves', top: '#2c5a34', side: '#1f4a2a' },       // hedge / tree
  8: { h: 9, face: 'plank', roof: 'plain', top: '#9a7a50', side: '#7a5a3a' },         // low fence
  9: { h: 34, face: 'hedge', roof: 'leaves', top: '#3a5a4c', side: '#1a3a2c' }          // snowy pine mass
};
const col = (r, g, b, j, x, y, s) => { const v = (G.hash(x >> 1, y >> 1) - .5) * j; return [r + v, g + v, b + v]; };
const floorTex = (x, y, tag) => {
  switch (tag) {
    case 'grass': return col(62, 112, 58, 22, x, y);
    case 'paving': { const m = (x % 16 < 1 || y % 8 < 1); const v = m ? -26 : 0; return col(150 + v, 144 + v, 138 + v, 12, x, y); }
    case 'road': { const line = (Math.floor(y / 16) === 13 && (x % 32) < 16 && y % 16 < 2); return line ? [222, 196, 90] : col(58, 58, 66, 10, x, y); }
    case 'water': { const w = Math.sin(x * .25 + G.game.time * 1.5) * Math.cos(y * .3 - G.game.time) * 14; return [50 + w, 130 + w, 190 + w, 0]; }
    case 'wood': { const m = (y % 6 < 1) ? -22 : 0; return col(122 + m, 82 + m, 52 + m, 10, x, y); }
    case 'tile': { const chk = (((x >> 4) + (y >> 4)) & 1); return chk ? col(224, 220, 210, 6, x, y) : col(52, 58, 64, 6, x, y); }
    case 'snow': return col(226, 234, 246, 14, x, y);
    case 'carpet': return col(118, 38, 52, 16, x, y);
    case 'rubble': return col(96, 90, 86, 20, x, y);
    default: return col(80, 80, 80, 8, x, y);
  }
};

function grid(w, h, fill) {
  const c = Array.from({ length: h }, () => Array(w).fill(fill));
  return { c, w, h,
    set(x, y, ch) { if (x >= 0 && y >= 0 && x < w && y < h) c[y][x] = ch; },
    get(x, y) { return (x < 0 || y < 0 || x >= w || y >= h) ? '1' : c[y][x]; },
    rect(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch); },
    rows() { return c.map(r => r.join('')); } };
}
const mkMap = (gr, outside) => new E.TileMap({ rows: gr.rows(), legend: LEG, types: TYPES, floorTex, ao: 5, outside: outside || '#15151c' });

/* ---------- yard (the Soprano-ish house, the pool, the ducks) ---------- */
function yard() {
  const g = grid(30, 22, 'g');
  g.rect(0, 0, 29, 5, '2');                       // the house, its back wall
  g.rect(2, 6, 16, 9, 'p');                       // patio
  g.rect(14, 10, 15, 21, 'p');                    // path to the gate
  g.rect(18, 8, 28, 18, 'p'); g.rect(19, 9, 27, 17, 'w');
  g.rect(0, 6, 0, 21, '7'); g.rect(29, 6, 29, 21, '7'); g.rect(0, 21, 13, 21, '7'); g.rect(16, 21, 29, 21, '7');
  [[3, 12], [4, 12], [5, 16], [9, 18], [10, 18], [22, 20], [23, 20]].forEach(([x, y]) => g.set(x, y, '7'));
  const map = mkMap(g, '#2a4a30');
  const docks = [P(18, 11), P(18, 14), P(22, 18)];
  const ducks = [P(19, 11), P(19, 14), P(22, 17)];
  return {
    name: 'yard', label: 'The Yard', map, music: 'town', ambient: .78, spawn: P(11, 9), tint: null,
    props: [
      { n: 'tree', x: 40, y: 200 }, { n: 'tree', x: 440, y: 130 }, { n: 'bush', x: 120, y: 180 }, { n: 'bush', x: 330, y: 330 }, { n: 'flowers', x: 60, y: 112 },
      { n: 'flowers', x: 200, y: 108 }, { n: 'firedrum', x: 12 * 16, y: 7 * 16, o: { light: true } }, { n: 'pot', x: 9 * 16 + 8, y: 7 * 16 + 4 }, { n: 'lamp', x: 17 * 16, y: 8 * 16 },
      { n: 'bush', x: 380, y: 100 }, { n: 'flowers', x: 300, y: 340 }, { n: 'sign', x: 15 * 16 + 8, y: 20 * 16 }
    ],
    solids: [{ x: 12 * 16, y: 7 * 16, r: 7 }, { x: 9 * 16 + 8, y: 7 * 16 + 4, r: 6 }, { x: 40, y: 200, r: 5 }, { x: 440, y: 130, r: 5 }],
    exits: [{ x0: 14 * 16, y0: 20 * 16 + 8, x1: 16 * 16, y1: 22 * 16, to: 'town', spawn: P(2, 12), label: 'To town', needs: 'yardDone' }],
    docks, ducks, bread: P(9, 7), carm: P(6, 7),
    labels: [{ x: 15 * 16 + 8, y: 19 * 16, z: 30, text: 'TOWN' }],
    lights: [{ x: 12 * 16, y: 7 * 16, z: 14, r: 46, i: .55, color: '#ffa860' }]
  };
}

/* ---------- town ---------- */
function town() {
  const W = 60, H = 28, g = grid(W, H, 'p');
  g.rect(0, 0, W - 1, 0, '1'); g.rect(0, H - 1, W - 1, H - 1, '1'); g.rect(W - 1, 0, W - 1, H - 1, '7'); g.rect(0, 0, 0, H - 1, '7');
  g.rect(0, 11, W - 2, 16, 'r');                  // the road
  g.set(0, 11, 'r'); g.rect(0, 11, 0, 16, 'r');   // west opening toward the yard
  const bld = (x0, y0, x1, y1, t) => g.rect(x0, y0, x1, y1, String(t));
  bld(3, 1, 15, 8, 1); bld(19, 1, 33, 8, 3); bld(38, 1, 49, 8, 2);        // north: pork store, lounge, laundromat
  bld(3, 19, 15, 26, 4); bld(23, 19, 33, 26, 5); bld(40, 19, 52, 26, 6);  // south: pizzeria, therapy, diner
  g.rect(16, 1, 18, 8, 'p'); g.rect(34, 1, 37, 8, 'p'); g.rect(50, 1, 58, 8, 'g');
  g.rect(16, 19, 22, 26, 'k'); g.rect(34, 19, 39, 26, 'p'); g.rect(53, 19, 58, 26, 'g');
  [[52, 3], [54, 5], [56, 2], [55, 7], [57, 4]].forEach(([x, y]) => g.set(x, y, '7'));
  [[55, 21], [57, 23], [54, 25], [56, 20]].forEach(([x, y]) => g.set(x, y, '7'));
  g.rect(1, 1, 2, 8, 'g'); g.rect(1, 19, 2, 26, 'g');
  const map = mkMap(g, '#101018');
  const lamps = [8, 22, 36, 50].flatMap(x => [{ x: x * 16, y: 10 * 16 + 4 }, { x: (x + 6) * 16, y: 17 * 16 + 4 }]);
  const shops = [
    { id: 'gino', name: 'GINO', title: "Gino's Pork & Cold Cuts", at: P(9, 9), door: P(9, 8), label: [9 * 16 + 8, 8 * 16 + 14], tough: .5, pay: 420, flavor: 'pork' },
    { id: 'stella', name: 'STELLA', title: 'Suds & Duds Laundromat', at: P(43, 9), door: P(43, 8), label: [44 * 16, 8 * 16 + 14], tough: .25, pay: 260, flavor: 'laundry' },
    { id: 'maria', name: 'MARIA', title: "Mama Maria's Pizzeria", at: P(9, 17), door: P(9, 18), label: [10 * 16, 18 * 16 + 2], tough: .7, pay: 580, flavor: 'pizza' }
  ];
  return {
    name: 'town', label: 'Main Street', map, music: 'town', ambient: .55, spawn: P(2, 13), tint: null, shops,
    props: [
      ...lamps.map(l => ({ n: 'streetlamp', x: l.x, y: l.y, o: { light: true } })),
      { n: 'awning', x: 9 * 16 + 8, y: 8 * 16 + 10 }, { n: 'awning', x: 43 * 16 + 8, y: 8 * 16 + 10 }, { n: 'awning', x: 26 * 16 + 8, y: 8 * 16 + 10 }, { n: 'awning', x: 9 * 16 + 8, y: 18 * 16 + 4 },
      { n: 'trashcan', x: 17 * 16, y: 7 * 16 }, { n: 'trashcan', x: 35 * 16, y: 6 * 16 }, { n: 'hydrant', x: 20 * 16, y: 10 * 16 + 6 }, { n: 'hydrant', x: 47 * 16, y: 17 * 16 + 6 },
      { n: 'crate', x: 14 * 16, y: 9 * 16 + 8 }, { n: 'barrel', x: 5 * 16, y: 17 * 16 + 4 }, { n: 'tree', x: 1 * 16 + 8, y: 5 * 16 }, { n: 'tree', x: 1 * 16 + 8, y: 22 * 16 },
      { n: 'pine', x: 54 * 16, y: 4 * 16 }, { n: 'bush', x: 53 * 16, y: 22 * 16 }, { n: 'sandbags', x: 18 * 16, y: 22 * 16 }, { n: 'bones', x: 20 * 16, y: 24 * 16 },
      { n: 'sign', x: 27 * 16, y: 10 * 16 }, { n: 'firedrum', x: 36 * 16, y: 4 * 16, o: { light: true } }, { n: 'trashcan', x: 38 * 16, y: 22 * 16 }, { n: 'lamp', x: 25 * 16, y: 9 * 16 + 4 }
    ],
    solids: [{ x: 17 * 16, y: 7 * 16, r: 5 }, { x: 35 * 16, y: 6 * 16, r: 5 }, { x: 14 * 16, y: 9 * 16 + 8, r: 6 }, { x: 5 * 16, y: 17 * 16 + 4, r: 6 }, { x: 20 * 16, y: 10 * 16 + 6, r: 4 }, { x: 47 * 16, y: 17 * 16 + 6, r: 4 },
      ...lamps.map(l => ({ x: l.x, y: l.y, r: 3 })), { x: 36 * 16, y: 4 * 16, r: 7 }],
    exits: [
      { x0: 0, y0: 11 * 16, x1: 10, y1: 17 * 16, to: 'yard', spawn: P(14.5, 19), label: 'Home' },
      { x0: 28 * 16, y0: 18 * 16, x1: 30 * 16, y1: 19 * 16 + 8, to: 'therapy', spawn: P(8.5, 8), label: "Dr. Mel-Fee's office", needs: 'therapyOpen', door: true },
      { x0: 45 * 16, y0: 18 * 16, x1: 47 * 16, y1: 19 * 16 + 8, to: 'diner', spawn: P(9, 8), label: 'Meadowlark Diner', needs: 'dinerOpen', door: true }
    ],
    labels: [
      { x: 9 * 16 + 8, y: 8 * 16 + 4, z: 26, text: "GINO'S PORK" }, { x: 26 * 16 + 8, y: 8 * 16 + 4, z: 26, text: 'BADA BING-O' }, { x: 43 * 16 + 8, y: 8 * 16 + 4, z: 26, text: 'SUDS & DUDS' },
      { x: 9 * 16 + 8, y: 19 * 16 - 2, z: 26, text: "MAMA MARIA'S" }, { x: 28 * 16 + 8, y: 19 * 16 - 2, z: 26, text: 'DR. MEL-FEE, PHD' }, { x: 46 * 16, y: 19 * 16 - 2, z: 26, text: 'MEADOWLARK DINER' }
    ],
    ambush: [P(57, 12), P(57, 14), P(57, 13)],
    lights: [{ x: 26 * 16 + 8, y: 9 * 16, z: 14, r: 64, i: .9, color: '#ff4a7a' }, { x: 46 * 16, y: 19 * 16 - 2, z: 14, r: 56, i: .7, color: '#ffe8a0' }]
  };
}

/* ---------- therapy ---------- */
function therapy() {
  const g = grid(18, 11, 'i');
  g.rect(0, 0, 17, 2, '5'); g.rect(0, 0, 0, 10, '5'); g.rect(17, 0, 17, 10, '5'); g.rect(0, 10, 7, 10, '5'); g.rect(10, 10, 17, 10, '5');
  g.rect(4, 4, 13, 8, 'c');
  const map = mkMap(g, '#0e0c12');
  return {
    name: 'therapy', label: "Dr. Mel-Fee's Office", map, music: 'therapy', ambient: .72, spawn: P(7, 7), tint: null,
    props: [
      { n: '_box', x: 7 * 16 + 4, y: 5 * 16 + 8, w: 36, d: 12, h: 8, top: '#8a3a3a', side: '#6a2a2a' }, { n: '_box', x: 7 * 16 + 4, y: 5 * 16 + 1, w: 36, d: 4, h: 18, top: '#8a3a3a', side: '#5a2020' },
      { n: 'window', x: 5 * 16, y: 3 * 16, o: { size: 1.4 } }, { n: 'window', x: 12 * 16, y: 3 * 16, o: { size: 1.4 } }, { n: 'pot', x: 2 * 16, y: 4 * 16 }, { n: 'pot', x: 15 * 16 + 8, y: 4 * 16 },
      { n: 'chest', x: 2 * 16, y: 7 * 16 }, { n: 'candle', x: 9 * 16, y: 6 * 16, o: { light: true } }, { n: 'banner', x: 8 * 16, y: 3 * 16 }, { n: 'bush', x: 15 * 16 + 8, y: 8 * 16 }
    ],
    solids: [{ x: 2 * 16, y: 4 * 16, r: 5 }, { x: 15 * 16 + 8, y: 4 * 16, r: 5 }, { x: 2 * 16, y: 7 * 16, r: 6 }, { x: 9 * 16, y: 6 * 16, r: 4 }, { x: 6 * 16 + 4, y: 5 * 16 + 8, r: 6 }, { x: 8 * 16 + 4, y: 5 * 16 + 8, r: 6 }],
    exits: [{ x0: 7 * 16, y0: 10 * 16 - 4, x1: 10 * 16, y1: 11 * 16 + 8, to: 'town', spawn: P(29, 17.5), label: 'Leave', needs: 'therapyDone' }],
    couch: P(7, 6), doc: P(12, 7),
    labels: [], lights: [{ x: 9 * 16, y: 6 * 16, z: 16, r: 80, i: .8, color: '#ffc880' }]
  };
}

/* ---------- woods: the dream ---------- */
function woods() {
  const W = 46, H = 34, g = grid(W, H, '9'), rnd = G.rng(77);
  const path = [[4, 30], [12, 27], [18, 21], [13, 15], [21, 10], [31, 9], [38, 6]];
  const carve = (x, y, r, ch) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1 && x + i > 0 && y + j > 0 && x + i < W - 1 && y + j < H - 1) g.set(x + i, y + j, ch); };
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) g.set(x, y, rnd() < .26 ? '9' : 's');
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i], [x1, y1] = path[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let k = 0; k <= n; k++) carve(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 2, 's');
  }
  carve(38, 6, 6, 's'); carve(4, 30, 3, 's');
  const map = mkMap(g, '#0c1018');
  const trees = []; const r2 = G.rng(5);
  for (let i = 0; i < 40; i++) { const x = 2 + r2() * 42, y = 2 + r2() * 30; if (g.get(Math.floor(x), Math.floor(y)) === 's' && Math.hypot(x - 38, y - 6) > 8 && Math.hypot(x - 4, y - 30) > 4) trees.push({ n: 'pine', x: x * 16, y: y * 16 }); }
  const solids = trees.map(t => ({ x: t.x, y: t.y, r: 4 }));
  return {
    name: 'woods', label: 'The Piney Flats (a dream)', map, music: 'woods', ambient: .3, spawn: P(4, 30), tint: null, weather: { kind: 'snow', amount: .9, wind: .35 },
    props: trees.concat([{ n: 'bones', x: 21 * 16, y: 10 * 16 + 4 }, { n: 'crystal', x: 12 * 16, y: 17 * 16 }, { n: 'skull', x: 31 * 16, y: 9 * 16 }]),
    solids, exits: [], duck: P(5.5, 29), arena: P(38, 6), enc1: [P(14, 15), P(11, 17)], enc2: [P(24, 9), P(27, 10)],
    tracks: path.map(([x, y]) => P(x, y)),
    labels: [], lights: []
  };
}

/* ---------- diner ---------- */
function diner() {
  const g = grid(20, 12, 't');
  g.rect(0, 0, 19, 2, '6'); g.rect(0, 0, 0, 11, '6'); g.rect(19, 0, 19, 11, '6'); g.rect(0, 11, 8, 11, '6'); g.rect(11, 11, 19, 11, '6');
  const map = mkMap(g, '#0e0e14');
  return {
    name: 'diner', label: 'Meadowlark Diner', map, music: 'diner', ambient: .55, spawn: P(9.5, 9), tint: null,
    props: [
      { n: '_box', x: 8 * 16, y: 6 * 16, w: 30, d: 16, h: 10, top: '#e8e0d0', side: '#9a8a70' }, { n: '_box', x: 8 * 16 - 24, y: 6 * 16, w: 10, d: 28, h: 8, top: '#a82a2a', side: '#7a1a1a' }, { n: '_box', x: 8 * 16 + 24, y: 6 * 16, w: 10, d: 28, h: 8, top: '#a82a2a', side: '#7a1a1a' },
      { n: '_box', x: 14 * 16, y: 4 * 16 + 4, w: 70, d: 12, h: 14, top: '#d8d8e0', side: '#4a6a8a' },
      { n: 'window', x: 4 * 16, y: 3 * 16, o: { size: 1.3 } }, { n: 'window', x: 15 * 16, y: 3 * 16, o: { size: 1.3 } }, { n: 'lamp', x: 9 * 16, y: 4 * 16 },
      { n: 'crate', x: 3 * 16, y: 6 * 16 }, { n: 'crate', x: 3 * 16, y: 8 * 16 }, { n: 'pot', x: 17 * 16, y: 4 * 16 }, { n: 'sign', x: 10 * 16, y: 10 * 16 }
    ],
    solids: [], exits: [], booth: P(8, 6), labels: [{ x: 9.5 * 16, y: 10.5 * 16, z: 26, text: 'OPEN' }],
    lights: [{ x: 9 * 16, y: 4 * 16, z: 20, r: 120, i: .8, color: '#ffe8b0' }]
  };
}

G.buildArea = name => ({ yard, town, therapy, woods, diner })[name]();
})();
