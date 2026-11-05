/* DENSHA DE HALO! · route data: Akari City's zones (scenery sets), its twelve stations, the Halo Line (a 20.6 km loop,
 * clockwise, double track, quad track from 11,800 to 15,600) and the depot. Routes are designer-editable scripts of
 * [s, command, params]; DH.compileRoute turns them into the world. In-game text is ASCII (the font has no kana). */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, A = DH.ART;

DH.STATIONS = {
  akari: { name: 'AKARI CENTRAL', en: 'Akari Central' }, hanabatake: { name: 'HANABATAKE', en: 'Flower Fields' }, kujira: { name: 'KUJIRA-BASHI', en: 'Whale Bridge' },
  minato: { name: 'MINATO-MAE', en: 'Harbor Front' }, todai: { name: 'TODAI-SHITA', en: 'Below the Lighthouse' }, okiku: { name: 'OKIKU-DERA', en: 'Great Chrysanthemum Temple' },
  yuhi: { name: 'YUHI-ZAKA', en: 'Sunset Slope' }, shotengai: { name: 'SHOTENGAI', en: 'Shopping Arcade' }, daigaku: { name: 'DAIGAKU-MAE', en: 'University' },
  koen: { name: 'SAKURA-KOEN', en: 'Cherry Blossom Park' }, hoshimi: { name: 'HOSHIMI-DAI', en: 'Stargazing Heights' }, kawasemi: { name: 'KAWASEMI', en: 'Kingfisher' },
  mark1: { name: 'MARK 1', en: 'Depot mark one' }, mark2: { name: 'MARK 2', en: 'Depot mark two' }, gate: { name: 'DEPOT GATE', en: 'Staff halt' }
};
DH.RING_ORDER = ['akari', 'hanabatake', 'kujira', 'minato', 'todai', 'okiku', 'yuhi', 'shotengai', 'daigaku', 'koen', 'hoshimi', 'kawasemi'];

/* ---------- zones: ground, ballast, masts, backdrop, and what grows and stands in them ---------- */
const BD = {
  city: [{ kind: 'city', color: '#6a7a9a', h: 26, par: 1, seed: 1 }, { kind: 'city', color: '#8090b0', h: 16, par: 1, seed: 2 }],
  hills: [{ kind: 'hills', color: '#6a8aa8', h: 30, seed: 3 }, { kind: 'hills', color: '#7aa07a', h: 14, seed: 4 }],
  sea: [{ kind: 'hills', color: '#7a9ab8', h: 18, seed: 5 }, { kind: 'sea', color: '#4a7ab0', h: 6, seed: 6 }],
  mountains: [{ kind: 'mountains', color: '#5a6a8a', h: 52, seed: 7 }, { kind: 'hills', color: '#5a7a5a', h: 16, seed: 8 }],
  cliffs: [{ kind: 'mountains', color: '#6a7a8a', h: 36, seed: 9 }, { kind: 'sea', color: '#3a6aa8', h: 5, seed: 10 }]
};
DH.ZONES = {
  downtown: { ground: ['#8a8a86', '#82827e'], ballast: '#7a746a', masts: 'lattice', wall: true, backdrop: BD.city, gen: 'city', mix: { commuter: 5, student: 2, elder: 1, tourist: 1 } },
  'suburb-flowers': { ground: ['#6a9a48', '#5f9042'], backdrop: BD.hills.concat([{ kind: 'city', color: '#9aa8c0', h: 8, seed: 11 }]), gen: 'suburb', flowers: true, mix: { commuter: 3, student: 3, kid: 2, elder: 2 } },
  riverside: { ground: ['#7a9a5a', '#6f8f50'], water: '#3a6a9a', backdrop: BD.sea, gen: 'river', mix: { commuter: 2, elder: 2, tourist: 2 } },
  harbor: { ground: ['#5a5a5e', '#545458'], backdrop: BD.sea, gen: 'harbor', mix: { commuter: 4, elder: 1, tourist: 1 } },
  cliff: { ground: ['#6a8a4a', '#5f7f42'], backdrop: BD.cliffs, gen: 'cliff', mix: { elder: 3, tourist: 2 } },
  'temple-town': { ground: ['#a89a80', '#a09278'], backdrop: BD.hills, gen: 'temple', mix: { festival: 5, elder: 2, kid: 2, tourist: 2 } },
  hills: { ground: ['#5a8a3a', '#548234'], backdrop: BD.sea, gen: 'hills', mix: { elder: 2, student: 2, commuter: 2 } },
  'city-elevated': { ground: ['#6a6a70', '#646468'], masts: 'lattice', wall: true, backdrop: BD.city, gen: 'cityHigh', mix: { commuter: 5, student: 2, tourist: 2 } },
  campus: { ground: ['#5aa048', '#529840'], backdrop: BD.city, gen: 'campus', mix: { student: 7, commuter: 1 } },
  park: { ground: ['#6ab050', '#62a848'], backdrop: BD.hills, gen: 'park', mix: { kid: 2, tourist: 3, elder: 2, student: 2 } },
  'hills-north': { ground: ['#4a7a3a', '#447234'], backdrop: BD.mountains, gen: 'north', mix: { commuter: 2, elder: 2 } },
  'river-north': { ground: ['#7aa850', '#72a048'], water: '#3a6a9a', backdrop: BD.mountains, gen: 'paddies', mix: { elder: 3, commuter: 2 } },
  depot: { ground: ['#7a746a', '#726c62'], ballast: '#6a645a', backdrop: BD.city, gen: 'depot', mix: { commuter: 1 } }
};

/* ---------- zone scenery generators (one 50 m cell on one side) ---------- */
const pickW = (rr, list) => { const t = list.reduce((a, q) => a + q[1], 0); let u = rr() * t; for (const q of list) { u -= q[1]; if (u <= 0) return q; } return list[0]; };
const HOUSE_ROOF = ['#3a5a8a', '#5a5a6a', '#b85a3a', '#4a4a52'];
const building = (o, facade, color, h, setback, depth, lenB) => {
  const { s, side, edge, rr, drop, strip } = o, len = lenB || 12 + rr() * 26, x0 = edge + side * setback, x1 = x0 + side * depth, s0 = s + rr() * Math.max(1, 50 - len);
  const faces = DH.buildingFaces(facade, color);
  if (facade === 'house' || facade === 'machiya' || facade === 'farm') faces.top = HOUSE_ROOF[Math.floor(rr() * HOUSE_ROOF.length)];
  strip(s0, len, x0, x1, -drop, -drop + h, faces, { kind: 'building', lit: true, seed: Math.floor(rr() * 99) });
  if (facade === 'house' || facade === 'machiya' || facade === 'farm') { const xm = (x0 + x1) / 2; strip(s0 + 1, len - 2, xm - depth * .25, xm + depth * .25, -drop + h, -drop + h + 1.6, { side: faces.top, top: E.shade(faces.top, .15), end0: faces.top, end1: faces.top }, { kind: 'roof' }); }
  if (facade === 'apartment' && rr() < .6) for (let q = 0; q < len; q += 3) strip(s0 + q, 2.2, x0 - side * .05, x0 - side * .7, -drop + 3, -drop + 3.9, { side: '#e8e8e8', top: '#c8c8c8' }, { kind: 'balcony' });
};
const trees = (o, kinds, n, near = 3, far = 30) => { for (let i = 0; i < n; i++) o.thing(DH.ART.tree(o.s + o.rr() * 50, o.edge + o.side * (near + o.rr() * (far - near)), kinds[Math.floor(o.rr() * kinds.length)], .8 + o.rr() * .5, o.rr())); };
DH.ZONE_GEN = {
  city: o => { const { rr } = o; for (let i = 0; i < 2; i++) { const t = pickW(rr, [['office', 4], ['hotel', 2], ['shop', 2], ['apartment', 2]]); building(o, t[0], null, t[0] === 'office' ? 18 + rr() * 30 : 10 + rr() * 14, 6 + i * 22 + rr() * 6, 12 + rr() * 10); } if (rr() < .5) o.thing(DH.ART.lamp(o.s + rr() * 50, o.edge + o.side * 2)); },
  cityHigh: o => { const { rr } = o; for (let i = 0; i < 2; i++) { const t = pickW(rr, [['office', 3], ['shop', 3], ['apartment', 3]]); building(o, t[0], null, 9 + rr() * 26, 4 + i * 20 + rr() * 5, 10 + rr() * 10); } },
  suburb: o => { const { rr, z } = o; const t = pickW(rr, [['house', 5], ['apartment', 3], ['konbini', 1], ['field', 3]]);
    if (t[0] === 'field') { for (let i = 0; i < 4; i++) o.thing(DH.ART.flowers(o.s + i * 12, o.edge + o.side * (6 + rr() * 20), [['#e04a6a', '#f0c030', '#ffffff'], ['#8a4ac8', '#f070a0', '#ffe0f0'], ['#f0a020', '#f0e040', '#e04a2a']][Math.floor(rr() * 3)])); }
    else building(o, t[0], t[0] === 'house' ? ['#e8e0d0', '#d8d0c0', '#f0e8d8', '#c8d0d8'][Math.floor(rr() * 4)] : null, t[0] === 'apartment' ? 9 + rr() * 6 : 5.5 + rr() * 1.5, 8 + rr() * 12, 7 + rr() * 5);
    trees(o, ['tree', 'tree', 'bush'], 1); if (rr() < .55) o.thing(DH.ART.pole(o.s + 20, o.edge + o.side * 3.5)); },
  river: o => { const { rr } = o; trees(o, ['willow', 'tree'], 2, 4, 40); if (rr() < .3) building(o, 'farm', '#a89070', 4, 20 + rr() * 20, 8); },
  harbor: o => { const { rr } = o; const t = pickW(rr, [['warehouse', 5], ['containers', 4]]);
    if (t[0] === 'warehouse') building(o, 'warehouse', ['#a8a090', '#8a9aa8', '#b8a080'][Math.floor(rr() * 3)], 8 + rr() * 4, 6 + rr() * 10, 14 + rr() * 10, 30 + rr() * 18);
    else { const cols = ['#c84a2a', '#2a8a5a', '#e0a020', '#3a6ac8', '#8a3a8a']; for (let i = 0; i < 3; i++) for (let j = 0; j < 1 + Math.floor(rr() * 3); j++) { const x0 = o.edge + o.side * (8 + i * 3); o.strip(o.s + 5 + rr() * 10, 12, x0, x0 + o.side * 2.4, j * 2.6, j * 2.6 + 2.5, { side: cols[Math.floor(rr() * 5)], top: '#5a5a5a', end0: '#4a4a4a', end1: '#4a4a4a' }, { kind: 'container' }); } } },
  cliff: o => { const { rr } = o; trees(o, ['pine', 'pine', 'bush'], 3, 3, 30); if (o.side < 0 && rr() < .4) building(o, 'house', '#d8d0c0', 5, 14 + rr() * 10, 7); if (rr() < .3) o.strip(o.s, 50, o.edge + o.side * 1.5, o.edge + o.side * 2.1, 0, 1.4, { side: '#8a8478', top: '#9a9488' }, { kind: 'stonewall' }); },
  temple: o => { const { rr } = o; const t = pickW(rr, [['machiya', 6], ['shop', 3]]); building(o, t[0], t[0] === 'machiya' ? '#5a4030' : '#e8d8c0', 6 + rr() * 3, 6 + rr() * 8, 8 + rr() * 4); trees(o, ['pine', 'maple'], 1, 3, 20); if (rr() < .25) o.thing(DH.ART.landmark(o.s + 25, o.edge + o.side * 4, 'torii', .7)); },
  hills: o => { const { rr } = o; if (rr() < .55) building(o, 'house', ['#e8e0d0', '#c8d0d8', '#e0d0c0'][Math.floor(rr() * 3)], 5.5, 8 + rr() * 18, 7); trees(o, ['cedar', 'bamboo', 'tree'], 2, 3, 30); if (rr() < .3) o.strip(o.s, 50, o.edge + o.side * 1.2, o.edge + o.side * 1.6, -.2, 2.2, { side: '#8a8a80', top: '#9a9a90' }, { kind: 'retaining' }); },
  campus: o => { const { rr } = o; if (rr() < .55) building(o, 'campus', null, 10 + rr() * 8, 15 + rr() * 15, 14); trees(o, ['ginkgo', 'ginkgo', 'tree'], 2, 3, 25); },
  park: o => { const { rr } = o; trees(o, ['sakura', 'sakura', 'tree'], 3, 3, 35); if (rr() < .4) o.thing(DH.ART.lamp(o.s + rr() * 50, o.edge + o.side * 6)); if (rr() < .3) o.thing(DH.ART.bench(o.s + rr() * 50, o.edge + o.side * 7)); },
  north: o => { const { rr } = o; if (rr() < .4) building(o, 'house', '#d8d0c0', 5.5, 10 + rr() * 20, 7); trees(o, ['cedar', 'cedar', 'pine'], 3, 3, 35); if (rr() < .5) o.thing(DH.ART.pole(o.s + 10, o.edge + o.side * 3.5)); },
  paddies: o => { const { rr } = o; if (rr() < .3) building(o, 'farm', '#c8b898', 5, 18 + rr() * 20, 9); trees(o, ['tree', 'willow'], 1, 10, 40); if (rr() < .4) o.thing(DH.ART.pole(o.s + 30, o.edge + o.side * 3.5)); },
  depot: o => { const { rr } = o; if (rr() < .7) building(o, 'warehouse', '#8a8a92', 9, 6 + rr() * 6, 18, 40); if (rr() < .5) o.thing(DH.ART.lamp(o.s + rr() * 50, o.edge + o.side * 2)); }
};

/* ---------- the Halo Line ---------- */
const Q = (list) => list;   // (a marker for track layouts)
DH.HALO_SCRIPT = [
  // zones and line speeds
  [19900, 'zone', 'downtown'], [700, 'zone', 'suburb-flowers'], [2500, 'zone', 'riverside'], [3600, 'zone', 'harbor'], [5800, 'zone', 'cliff'], [7500, 'zone', 'temple-town'],
  [9300, 'zone', 'hills'], [11700, 'zone', 'city-elevated'], [13200, 'zone', 'campus'], [14500, 'zone', 'park'], [16000, 'zone', 'hills-north'], [18000, 'zone', 'river-north'],
  [19900, 'line', { v: 70 }], [700, 'line', { v: 85 }], [3510, 'line', { v: 95 }], [8300, 'line', { v: 85 }], [11700, 'line', { v: 80 }], [15600, 'line', { v: 85 }],
  // geometry
  [520, 'curve', { len: 260, r: 900, dir: 'R' }], [900, 'curve', { len: 330, r: 500, dir: 'L' }], [2700, 'curve', { len: 400, r: 1200, dir: 'R' }],
  [3700, 'curve', { len: 300, r: 700, dir: 'L' }], [4400, 'curve', { len: 300, r: 800, dir: 'R' }], [6100, 'curve', { len: 400, r: 400, dir: 'R' }], [7650, 'curve', { len: 400, r: 700, dir: 'R' }],
  [9300, 'curve', { len: 300, r: 600, dir: 'R' }], [9900, 'curve', { len: 300, r: 450, dir: 'L' }], [10900, 'curve', { len: 300, r: 500, dir: 'L' }],
  [12400, 'curve', { len: 400, r: 800, dir: 'R' }], [14000, 'curve', { len: 400, r: 1000, dir: 'L' }], [15700, 'curve', { len: 400, r: 600, dir: 'R' }],
  [17800, 'curve', { len: 300, r: 700, dir: 'L' }], [19600, 'curve', { len: 250, r: 600, dir: 'R' }], [20000, 'curve', { len: 150, r: 500, dir: 'R' }],
  [1800, 'grade', { len: 300, permille: 8 }], [4400, 'grade', { len: 600, permille: -6 }], [7600, 'grade', { len: 800, permille: -10 }], [9200, 'grade', { len: 1100, permille: 25 }],
  [10700, 'grade', { len: 750, permille: -20 }], [16100, 'grade', { len: 800, permille: 15 }], [17500, 'grade', { len: 700, permille: -12 }], [19560, 'grade', { len: 300, permille: -6 }],
  // track layouts: islands at the right-side stations, the Minato yard, the Todai loop, the quad section
  [3200, 'tracks', { len: 85, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 3.8, x1: 7.4 }] }], [3475, 'tracks', { len: 100, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 7.4, x1: 3.8 }] }],
  [4780, 'tracks', { len: 60, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 3.8, x1: 3.8 }, { id: 'F', x0: 16, x1: 10.5, side: true }] }],
  [5150, 'tracks', { len: 100, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 3.8, x1: 3.8 }, { id: 'F', x0: 10.5, x1: 0, side: true, end: true }] }],
  [6700, 'tracks', { len: 60, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 3.8, x1: 3.8 }, { id: 'P', x0: 0, x1: -7 }] }],
  [7150, 'tracks', { len: 60, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 3.8, x1: 3.8 }, { id: 'P', x0: -7, x1: 0, end: true }] }],
  [10200, 'tracks', { len: 75, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 3.8, x1: 7.4 }] }], [10470, 'tracks', { len: 75, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 7.4, x1: 3.8 }] }],
  [11650, 'tracks', { len: 150, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 3.8, x1: 14 }, { id: 'C', x0: 0, x1: -7 }, { id: 'D', x0: 0, x1: 7 }] }],
  [15600, 'tracks', { len: 150, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 14, x1: 3.8 }, { id: 'C', x0: -7, x1: 0, end: true }, { id: 'D', x0: 7, x1: 0, end: true }] }],
  [18550, 'tracks', { len: 75, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 3.8, x1: 7.4 }] }], [18820, 'tracks', { len: 75, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'B', x0: 7.4, x1: 3.8 }] }],
  // structures
  [2600, 'bridge', { len: 600, kind: 'truss', water: 'river' }], [19200, 'bridge', { len: 300, kind: 'girder', water: 'river' }], [6050, 'tunnel', { len: 500 }],
  [11700, 'viaduct', { len: 1500, h: 8 }], [150, 'overpass', { w: 18, h: 7 }], [14100, 'overpass', { w: 12, h: 7 }], [20150, 'overpass', { w: 14, h: 7 }], [8200, 'overpass', { w: 10, h: 6.5 }],
  // stations (s = the platform's rear end)
  [-230, 'station', { id: 'akari', len: 245, side: 'L', stop: { 6: 0, 10: 8 }, roof: [-215, 5], crowd: 3, prev: 'kawasemi', next: 'hanabatake', platforms: [[-5.4, -1.6, 'island'], [5.4, 9.2, 'side']] }],
  [1420, 'station', { id: 'hanabatake', len: 190, side: 'L', stop: { 6: 1600 }, crowd: 2, prev: 'akari', next: 'kujira' }],
  [3290, 'station', { id: 'kujira', len: 175, side: 'R', stop: { 6: 3450 }, crowd: 2, prev: 'hanabatake', next: 'minato' }],
  [4925, 'station', { id: 'minato', len: 190, side: 'L', stop: { 6: 5100 }, crowd: 2, prev: 'kujira', next: 'todai', platforms: [[-5.4, -1.6, 'side']] }],
  [6780, 'station', { id: 'todai', len: 185, side: 'L', stop: { 6: 6950 }, crowd: 1, prev: 'minato', next: 'okiku', platforms: [[-5.4, -1.6, 'island']] }],
  [8530, 'station', { id: 'okiku', len: 185, side: 'L', stop: { 6: 8700 }, crowd: 3, prev: 'todai', next: 'yuhi' }],
  [10280, 'station', { id: 'yuhi', len: 185, side: 'R', stop: { 6: 10450 }, crowd: 1, prev: 'okiku', next: 'shotengai' }],
  [11880, 'station', { id: 'shotengai', len: 230, side: 'quad', doors: 'L', stop: { 6: 12100, 10: 12108 }, crowd: 3, prev: 'yuhi', next: 'daigaku' }],
  [13480, 'station', { id: 'daigaku', len: 230, side: 'quad', doors: 'L', stop: { 6: 13700, 10: 13708 }, crowd: 3, prev: 'shotengai', next: 'koen' }],
  [15080, 'station', { id: 'koen', len: 230, side: 'quad', doors: 'L', stop: { 6: 15300, 10: 15308 }, crowd: 3, prev: 'daigaku', next: 'hoshimi' }],
  [16930, 'station', { id: 'hoshimi', len: 185, side: 'L', stop: { 6: 17100 }, crowd: 1, prev: 'koen', next: 'kawasemi' }],
  [18630, 'station', { id: 'kawasemi', len: 185, side: 'R', stop: { 6: 18800 }, crowd: 1, prev: 'hoshimi', next: 'akari' }],
  // signals on our track (A): S1
  [60, 'signal', { id: 'AK-S', kind: 'start' }], [700, 'signal', { id: 'B101' }], [1250, 'signal', { id: 'B102' }], [1380, 'signal', { id: 'HB-H', kind: 'home' }], [1660, 'signal', { id: 'HB-S', kind: 'start' }],
  [2150, 'signal', { id: 'B103' }], [2950, 'signal', { id: 'B104' }], [3250, 'signal', { id: 'KJ-H', kind: 'home' }],
  // S2
  [3510, 'signal', { id: 'KJ-S', kind: 'start' }], [3900, 'signal', { id: 'B201' }], [4300, 'signal', { id: 'B202' }], [4880, 'signal', { id: 'MN-H', kind: 'home' }], [5160, 'signal', { id: 'MN-S', kind: 'start' }],
  [5600, 'signal', { id: 'M5600' }], [6000, 'signal', { id: 'M6000' }], [6600, 'signal', { id: 'B205' }], [6740, 'signal', { id: 'TD-H', kind: 'home' }], [7010, 'signal', { id: 'TD-S', kind: 'start' }],
  [7600, 'signal', { id: 'B207' }], [8480, 'signal', { id: 'OK-H', kind: 'home' }],
  // S3
  [8760, 'signal', { id: 'OK-S', kind: 'start' }], [9200, 'signal', { id: 'B301' }], [9800, 'signal', { id: 'B302' }], [10230, 'signal', { id: 'YZ-H', kind: 'home' }], [10510, 'signal', { id: 'YZ-S', kind: 'start' }],
  [11000, 'signal', { id: 'B303' }], [11600, 'signal', { id: 'B304' }], [11830, 'signal', { id: 'SG-H', kind: 'home' }],
  // S4 and PR (the quad's other tracks get their own copies below)
  [12170, 'signal', { id: 'SG-S', kind: 'start' }], [13000, 'signal', { id: 'B401' }], [13440, 'signal', { id: 'DG-H', kind: 'home' }], [13770, 'signal', { id: 'DG-S', kind: 'start' }],
  [14400, 'signal', { id: 'B403' }], [15030, 'signal', { id: 'KO-H', kind: 'home' }],
  // S5
  [15370, 'signal', { id: 'KO-S', kind: 'start' }], [16000, 'signal', { id: 'B501' }], [16600, 'signal', { id: 'B502' }], [16880, 'signal', { id: 'HM-H', kind: 'home' }], [17170, 'signal', { id: 'HM-S', kind: 'start' }],
  [17700, 'signal', { id: 'B503' }], [18200, 'signal', { id: 'B504' }], [18580, 'signal', { id: 'KW-H', kind: 'home' }], [18870, 'signal', { id: 'KW-S', kind: 'start' }],
  [19500, 'signal', { id: 'B505' }], [19950, 'signal', { id: 'B506' }], [20330, 'signal', { id: 'AK-H', kind: 'home', forced: 'YY' }],
  // limits
  [200, 'limit', { v: 45, until: 420 }], [880, 'limit', { v: 70, until: 1260 }], [2450, 'limit', { v: 75, until: 3250 }], [3650, 'limit', { v: 80, until: 4050 }], [5960, 'limit', { v: 60, until: 6600 }],
  [9850, 'limit', { v: 60, until: 10250 }], [10850, 'limit', { v: 55, until: 11250 }], [12350, 'limit', { v: 70, until: 12850 }], [15650, 'limit', { v: 70, until: 16150 }], [17750, 'limit', { v: 70, until: 18150 }], [20200, 'limit', { v: 45, until: 20450 }],
  // horn boards, crossings, workers, the obstruction emitter
  [1050, 'horn'], [2300, 'horn'], [5940, 'horn'], [9470, 'horn'], [11400, 'horn'], [14350, 'horn'], [19100, 'horn'],
  [1110, 'crossing', { id: 'X1', road: 6, cars: 3 }], [9050, 'crossing', { id: 'X2', road: 6, cars: 2 }], [11500, 'crossing', { id: 'X3', road: 7, cars: 2, special: true }],
  [16450, 'crossing', { id: 'X4', road: 6, cars: 2 }], [18350, 'crossing', { id: 'X5', road: 6, cars: 2 }], [7300, 'crossing', { id: 'X6', road: 6, cars: 2 }],
  [9600, 'workers', { until: 9900, limit: 25, lookout: 9550 }], [11150, 'emitter', { id: 'E3', crossing: 'X3' }],
  // landmarks
  [-120, 'landmark', { id: 'terminal', x: -38 }], [1500, 'landmark', { id: 'greenhouse', x: -30 }], [2950, 'landmark', { id: 'whale', x: 140, scale: 1.4 }], [4600, 'landmark', { id: 'cranes', x: 48 }],
  [5400, 'landmark', { id: 'ferry', x: 110 }], [6900, 'landmark', { id: 'lighthouse', x: -70 }], [8650, 'landmark', { id: 'gate', x: -18 }], [8820, 'landmark', { id: 'pagoda', x: -50 }],
  [10520, 'landmark', { id: 'shrine', x: 28 }], [12000, 'landmark', { id: 'neon', x: -24 }], [13800, 'landmark', { id: 'clocktower', x: 40 }], [13950, 'landmark', { id: 'dome', x: -42 }],
  [15200, 'landmark', { id: 'ferris', x: 70 }], [17200, 'landmark', { id: 'observatory', x: -44 }]
];
// the quad's other tracks run clockwise in the Parallel Run, each with the same blocks as ours
for (const t of ['C', 'D', 'B']) for (const [s, id, kind] of [[12170, 'SG-S', 'start'], [13000, 'B401', 'block'], [13440, 'DG-H', 'home'], [13770, 'DG-S', 'start'], [14400, 'B403', 'block'], [15030, 'KO-H', 'home']]) DH.HALO_SCRIPT.push([s, 'signal', { id: id + '/' + t, kind, track: t }]);

DH.DEPOT_SCRIPT = [
  [0, 'zone', 'depot'], [0, 'line', { v: 45 }],
  [350, 'tracks', { len: 50, list: [{ id: 'A', x0: 0, x1: 0 }, { id: 'S1', x0: -4.5, x1: 0, side: true, end: true }, { id: 'S2', x0: 4.5, x1: 0, side: true, end: true }] }],
  [400, 'curve', { len: 200, r: 800, dir: 'L' }],
  [340, 'signal', { id: 'D-2', kind: 'start', look: 'shunt' }],
  [175, 'station', { id: 'mark1', len: 130, side: 'L', stop: { 6: 300 }, platforms: [], crowd: 0 }],
  [495, 'station', { id: 'mark2', len: 130, side: 'L', stop: { 6: 620 }, platforms: [], crowd: 0 }],
  [775, 'station', { id: 'gate', len: 130, side: 'L', stop: { 6: 900 }, platforms: [[-5.4, -1.6, 'side']], roof: [860, 920], crowd: 0, prev: 'mark2', next: 'akari' }],
  [430, 'limit', { v: 40, until: 990 }],
  [0, 'siding', { len: 350, x: -4.5 }], [0, 'siding', { len: 350, x: 4.5 }]
];
DH.ROUTES = {};
DH.routeDefs = {
  halo: { id: 'halo', len: DH.LOOP, loop: true, script: DH.HALO_SCRIPT, lineSpeed: 85 },
  depot: { id: 'depot', len: 1000, loop: false, script: DH.DEPOT_SCRIPT, lineSpeed: 45, tracks0: [{ id: 'A', x: 0 }, { id: 'S1', x: -4.5, side: true }, { id: 'S2', x: 4.5, side: true }] }
};
DH.route = id => DH.ROUTES[id] || (DH.ROUTES[id] = DH.compileRoute(DH.routeDefs[id]));
})();
