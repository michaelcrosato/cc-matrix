/* 21b-route-builders: what each route command builds (stations from one kit, tunnels, bridges, viaducts, crossings,
 * work sites) and the automatic dressing: catenary masts, km posts, sound walls, utility poles and seeded zone scenery
 * per 50 m cell per side, skipping cells a station, bridge, tunnel, crossing or landmark holds. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, L = DH.L;

/* ---- stations ----
 * side 'L': side platforms (ours on the left); 'R': an island between our track and the other (the other spreads out);
 * 'quad': two islands across four tracks; 'loop': an island with a passing loop on the left; 'terminal': an island and
 * a side platform with the hall. stop: { 6: s, 10: s } the stop markers (the train's front stops there). */
DH.buildStation = (c, s, p) => {
  const { R, A, addThing, addStrip, occupy } = c, len = p.len || 180, s1 = s + len, mid = s + len / 2;
  const st = { id: p.id, name: p.name, en: p.en, s0: s, s1: s + len, len, stop: p.stop, side: p.side, melody: p.melody || p.id, crowd: p.crowd || 1, home: p.home, start: p.start, doors: {}, platforms: [], landmark: p.landmark, prev: p.prev, next: p.next, zone: c.segOf(mid).zone };
  R.stations.push(st);
  const plats = [];
  const B = R.trackX('B', mid);
  if (p.side === 'L' || p.side === 'terminal') { plats.push({ x0: -5.4, x1: -1.6, edges: [-1.6], back: -5.4 }); st.doors.A = 'L'; }
  if (p.side === 'L' && B !== null) { plats.push({ x0: B + 1.6, x1: B + 5.4, edges: [B + 1.6], back: B + 5.4 }); st.doors.B = 'L'; }
  if (p.side === 'R' || p.side === 'terminal') {
    // the other track spreads round an island: 3.8 -> 7.2 and back, eased over 80 m
    plats.push({ x0: 1.6, x1: 5.6, edges: [1.6, 5.6] }); st.doors.A = 'R'; st.doors.B = 'R';
  }
  if (p.side === 'quad') { plats.push({ x0: -5.4, x1: -1.6, edges: [-5.4, -1.6] }, { x0: 8.6, x1: 12.4, edges: [8.6, 12.4] }); Object.assign(st.doors, { A: 'L', D: 'R', C: 'R', B: 'L' }); }
  if (p.side === 'loop') { plats.push({ x0: -5.8, x1: -1.6, edges: [-5.8, -1.6] }); st.doors.A = 'L'; st.doors.LP = 'R'; }
  st.platforms = plats;
  const roof = p.roof ? [p.roof[0], p.roof[1]] : [s + len * .2, s + len * .8];
  for (const pl of plats) {
    addStrip(A.strips('platform', { s0: s, s1, x0: pl.x0, x1: pl.x1, edges: pl.edges }));
    addStrip(A.strips('canopy', { s0: roof[0], s1: roof[1], x0: pl.x0 - (pl.edges.length > 1 ? 0 : 0), x1: pl.x1, col: p.colour || '#3a6ab0' }));
    const cx = (pl.x0 + pl.x1) / 2, wid = pl.x1 - pl.x0;
    for (let q = roof[0] + 5; q < roof[1]; q += 10) addThing(A.thing('column', { s: q, x: cx, y: 1.1, h: 2.5 }));
    // name boards every 40 m on each edge, the furniture down the middle, a clock, an LED board, the stairs
    for (const e of pl.edges) {
      const bx = e + (e > cx ? -.9 : .9);
      for (let q = s + 20; q < s1 - 10; q += 40) addThing(A.thing('nameBoard', { s: q, x: bx, y: 1.1, name: p.name, en: p.en, prev: p.prev, next: p.next, line: '#f2c230' }));
    }
    const R2 = E.rng(DH.hash(R.id + p.id + pl.x0));
    for (let q = s + 12; q < s1 - 8; q += 16) {
      const r = R2(); const kind = r < .35 ? 'bench' : r < .55 ? 'vending' : r < .7 ? 'bin' : r < .8 ? 'poster' : null;
      if (kind) addThing(A.thing(kind, { s: q, x: kind === 'poster' && pl.back !== undefined ? pl.back + (pl.back < 0 ? .5 : -.5) : kind === 'poster' ? cx + (R2() < .5 ? -1 : 1) * (wid / 2 - 1.3) : cx + (wid > 3.9 ? (R2() - .5) * .6 : 0), y: 1.1, col: ['#d02a2a', '#2a6ad0', '#f4f4f0'][Math.floor(R2() * 3)] }));
    }
    addThing(A.thing('clock', { s: mid, x: cx, y: 1.1 })); addThing(A.thing('ledBoard', { s: mid + 25, x: cx, y: 1.1, text: 'LOCAL  ' + (p.dest || 'HALO LINE') }));
    addStrip(A.strips('box', { kind: 'stairs', s0: mid - 18, s1: mid - 4, x0: cx - 1.1, x1: cx + 1.1, y0: 1.1, y1: 3.4, col: '#c8c4bc', top: '#9a968e', end: { col: '#8a867e', pattern: F => { F.rect(F.x + .2, F.xr - .2, 1.1, 3.0, '#3a3a40'); } } }));
    if (pl.back !== undefined) addStrip(A.strips('fence', { s: s + 2, len: len - 4, x: pl.back + (pl.back < 0 ? .1 : -.1), y0: 1.1, h: 1.2 }));
  }
  // the stop markers on our edge (and each other track's edge), a 400 m approach board, the station building
  for (const tr of Object.keys(st.doors)) {
    if (!R.trackX(tr, mid) && tr !== 'A') continue;
    const tx = R.trackX(tr, mid) || 0, side = st.doors[tr] === 'L' ? -1 : 1;
    for (const n in p.stop) addThing(A.thing('stopMarker', { s: p.stop[n], x: tx + side * 1.85, y: 1.1, cars: +n }));
  }
  const stopS = p.stop[6];
  const ab = addThing(A.thing('approachBoard', { s: stopS - 400, x: -2.3, station: p.id, text: 'STOP' }));
  ab.dynText = true; R.calls.push({ id: 'app:' + p.id, s: stopS - 400, kind: 'approach', station: p.id, track: 'A', x: -2.3 });
  ab.pick = 'app:' + p.id;
  if (p.side === 'L' || p.side === 'terminal') addStrip(A.strips('building', { s: mid - 25, len: 50, x: -7.5, d: 10, h: 7, kind: p.side === 'terminal' ? 'office' : 'house', roof: p.side === 'terminal' ? 'flat' : 'gable', roofCol: '#4a5a6a', wall: '#e8e0d0', seed: 3 }));
  occupy(s - 20, s1 + 20, -40, 30, 'station');
  st.spawns = plats.map(pl => ({ x0: pl.x0, x1: pl.x1, edges: pl.edges }));
  return st;
};

/* ---- tunnels: walls and a roof round the tracks, lamps, a dark floor, portals at both mouths ---- */
DH.buildTunnel = (c, a, b, p) => {
  const { R, A, addThing, addStrip, span, extent, segOf } = c, ex = extent(segOf((a + b) / 2)), x0 = ex[0] - 2.6, x1 = ex[1] + 2.6, H = 6.2;
  const wall = { col: '#5a5650', pattern: F => { if (F.k > 2) for (let u = Math.ceil(F.u0 / 5) * 5; u < F.u1; u += 5) F.rect(u, u + .1, F.y0, F.y1, '#4a4640'); F.rect(F.u0, F.u1, F.y0, F.y0 + .5, '#3e3a36'); } };
  addStrip(E.Rail && A.strips('box', { kind: 'tunnelWall', s0: a, s1: b, x0: x0 - .5, x1: x0, y0: 0, y1: H, side: wall, end: '#5a5650', top: '#4a4640' }));
  addStrip(A.strips('box', { kind: 'tunnelWall', s0: a, s1: b, x0: x1, x1: x1 + .5, y0: 0, y1: H, side: wall, end: '#5a5650', top: '#4a4640' }));
  addStrip(A.strips('box', { kind: 'tunnelRoof', s0: a, s1: b, x0: x0 - .5, x1: x1 + .5, y0: H, y1: H + .8, col: '#4a4640', under: { col: '#46423c', pattern: F => { if (F.k > 2) for (let u = Math.ceil(F.u0 / 10) * 10; u < F.u1; u += 10) F.rect(u, u + .2, 0, F.xr - F.x, '#3a3632'); } } }));
  for (let q = a + 12; q < b; q += 25) addThing(A.thing('lamp', { s: q, x: x0 + .1, bias: -1 }));
  span(a, b, sg => { sg.groundCol = ['#2e2c2a', '#2a2826']; });
  addThing(A.thing('portal', { s: a, x: 0, x0, x1, facing: 1, col: p.hill || '#4e6a40', label: p.name || '' }));
  addThing(A.thing('portal', { s: b, x: 0, x0, x1, facing: -1, col: p.hill || '#4e6a40', label: p.name || '' }));
};

/* ---- bridges: truss sides (or Kujira-bashi's whale-back arch), a girder deck, water below ---- */
DH.buildBridge = (c, a, b, p) => {
  const { R, A, addThing, addStrip, extent, segOf } = c, ex = extent(segOf((a + b) / 2)), xl = ex[0] - 2.2, xr = ex[1] + 2.2, col = p.col || '#3a7ac8';
  c.span(a, b, sg => { sg.deck = [xl, xr, '#6a6a6e']; });
  const girder = { col: E.tones(col).sh, pattern: F => { if (F.k > 2) for (let u = Math.ceil(F.u0 / 4) * 4; u < F.u1; u += 4) F.rect(u, u + .2, F.y0, F.y1, E.tones(col).deep); } };
  addStrip(A.strips('box', { kind: 'deck', s0: a, s1: b, x0: xl - .2, x1: xl, y0: -1.8, y1: .6, side: girder, end: girder, top: '#6a6a6e' }));
  addStrip(A.strips('box', { kind: 'deck', s0: a, s1: b, x0: xr, x1: xr + .2, y0: -1.8, y1: .6, side: girder, end: girder, top: '#6a6a6e' }));
  if (p.kind === 'arch') {
    const n = Math.round((b - a) / 10);
    for (let i = 0; i <= n; i++) { const u = i / n, h = Math.sin(u * Math.PI) * (p.h || 18) + .6, u2 = (i + 1) / n, h2 = Math.sin(Math.min(1, u2) * Math.PI) * (p.h || 18) + .6;
      for (const x of [xl - .1, xr + .1]) addThing(A.thing('archBridge', { s: a + u * (b - a), x, ah: h, nh: i < n ? h2 : h, step: (b - a) / n })); }
  } else for (const x of [xl, xr]) addStrip(A.strips('truss', { s0: a, s1: b, x, h: p.h || 6.5, col }));
  // piers in the water every 50 m
  for (let q = a + 50; q < b - 20; q += 50) for (const x of [xl, xr]) addStrip(A.strips('box', { kind: 'pier', s0: q, s1: q + 3, x0: x - 1, x1: x + 1, y0: -(p.drop || 8), y1: -1.8, col: '#a8a49c' }));
  if (p.boats) for (let i = 0; i < p.boats; i++) addThing(A.thing('boat', { s: a + 60 + i * 140, x: (i % 2 ? 1 : -1) * (18 + i * 7), y: -(p.drop || 8), col: ['#e8e8e0', '#d84a2a', '#2a6aa8'][i % 3] }));
};
/* ---- viaducts: the line carried high over the town (the ground drops away), parapets and piers ---- */
DH.buildViaduct = (c, a, b, p) => {
  const { R, A, addStrip, segOf, extent, span } = c, h = p.h || 8;
  span(a - 40, b + 40, sg => { const ex = extent(sg); sg.deck = [ex[0] - 3.45, ex[1] + 3.45, '#8e8a84']; });
  for (let q = a; q < b; q += 50) {
    const ex = extent(segOf(q + 25)), xl = ex[0] - 3.2, xr = ex[1] + 3.2;
    addStrip(A.strips('box', { kind: 'parapet', s0: q, s1: q + 50, x0: xl - .25, x1: xl, y0: -1.2, y1: 1.1, side: { col: '#b8b4ac', pattern: F => { F.rect(F.u0, F.u1, .9, 1.1, '#d0ccc4'); } }, top: '#d0ccc4' }));
    addStrip(A.strips('box', { kind: 'parapet', s0: q, s1: q + 50, x0: xr, x1: xr + .25, y0: -1.2, y1: 1.1, side: { col: '#b8b4ac', pattern: F => { F.rect(F.u0, F.u1, .9, 1.1, '#d0ccc4'); } }, top: '#d0ccc4' }));
    for (let r = q + 10; r < q + 50; r += 25) for (const x of [xl + .4, xr - .4]) addStrip(A.strips('box', { kind: 'pier', s0: r, s1: r + 2, x0: x - .8, x1: x + .8, y0: -h, y1: -1.2, col: '#a8a49c' }));
  }
};
/* ---- level crossings: the road band, gates and lamps both sides, cars waiting; special ones get an emitter ---- */
DH.buildCrossing = (c, s, p) => {
  const { R, A, addThing, occupy, segOf, extent, span } = c, w = p.road || 6, ex = extent(segOf(s)), cx = { id: p.id, s, s1: s + w, road: w, warn: false, gate: 1, gateT: 0, special: !!p.special, blocked: false, cars: p.cars || 2, peds: p.peds || 1 };
  R.crossings.push(cx);
  span(s, s + w, sg => { sg.flags.crossing = true; sg.road = { a: s, b: s + w }; });
  addThing(A.thing('gate', { s: s - .4, x: ex[0] - 2.6, side: -1, cx, len: 4.2 }));
  addThing(A.thing('gate', { s: s + w + .4, x: ex[1] + 2.6, side: 1, cx, len: 4.2 }));
  const r = E.rng(DH.hash(R.id + p.id));
  for (let i = 0; i < (p.cars || 2); i++) { const left = i % 2 === 0; addThing(A.thing('kei', { s: s + (left ? 1.5 : 4.5), x: left ? ex[0] - 8 - i * 4.5 : ex[1] + 8 + i * 4.5, col: ['#f0f0ec', '#e8c040', '#3a6ab0', '#c03a3a', '#2a2a2a'][Math.floor(r() * 5)], flip: !left })); }
  if (p.special) { const em = { id: 'EM-' + p.id, s: s - 350, crossing: p.id, x: (R.trackX('A', s - 350) || 0) - 2.4, on: false }; R.emitters.push(em); em.thing = addThing(A.thing('emitter', { s: em.s, x: em.x, em, pick: 'emit:' + em.id })); cx.emitter = em; }
  occupy(s - 25, s + w + 25, -30, 30, 'crossing');
  R.calls.push({ id: 'xing:' + p.id, s, kind: 'crossing', track: 'A', x: ex[0] - 2.6, crossing: p.id, optional: true });
};
/* ---- track work: a 25 slow order, a lookout with a flag and whistle, the crew beside the line ---- */
DH.buildWorkers = (c, s, p) => {
  const { R, A, addThing } = c, until = p.until || s + 300;
  const lim = { id: 'W' + Math.round(s), s, until, v: p.limit || 25, track: 'A', slow: true };
  R.limits.push(lim);
  lim.board = addThing(A.thing('slowBoard', { s, x: -2.3, v: lim.v, pick: 'lim:' + lim.id })); addThing(A.thing('slowEnd', { s: until, x: -2.3 }));
  R.calls.push({ id: 'lim:' + lim.id, s, kind: 'limit', track: 'A', v: lim.v, x: -2.3 });
  const w = { id: p.id || 'WK', s, until, lookout: p.lookout || s - 50, crew: [], waved: false };
  for (let q = s + 30, i = 0; q < until - 20; q += 45, i++) w.crew.push({ s: q, x: i % 2 ? -3.4 : 6.6 });
  for (let q = s + 10; q < until; q += 60) addThing(A.thing('workSign', { s: q, x: -2.9 }));
  R.workers.push(w);
};

/* ---- the automatic dressing ---- */
const SETS = {
  downtown: { b: [['office', .45, 18, 45], ['apartment', .25, 14, 30], ['shop', .2, 6, 10], ['konbini', .1, 4, 5]], t: ['street'], props: ['billboard', 'streetlamp'], gap: 7, rows: 2, dense: .95 },
  suburb: { b: [['house', .55, 6, 8, 'gable'], ['apartment', .25, 8, 14], ['konbini', .08, 4, 5], ['shop', .12, 5, 7]], t: ['broad', 'sakura', 'pine'], props: ['flowers', 'greenhouse', 'bush'], poles: true, gap: 14, rows: 2, dense: .7, paddy: .15, fence: true, road: -1, fields: .5 },
  riverside: { b: [['warehouse', .5, 5, 7], ['house', .5, 5, 7, 'gable']], t: ['willow', 'broad'], props: ['bush', 'fisher'], gap: 12, rows: 1, dense: .35 },
  harbor: { b: [['warehouse', .6, 8, 12], ['office', .15, 10, 16]], t: [], props: ['containers', 'containers', 'crane'], gap: 9, rows: 2, dense: .8 },
  cliff: { b: [['house', 1, 5, 7, 'gable']], t: ['pine', 'pine', 'broad'], props: ['rock', 'rock', 'bush'], gap: 12, rows: 1, dense: .45, fence: true },
  temple: { b: [['machiya', .65, 6, 8, 'gable'], ['shop', .35, 6, 8, 'gable']], t: ['pine', 'maple'], props: ['lanternPost', 'stall', 'lanterns'], gap: 14, rows: 2, dense: .85, roof: '#3a3a42', fence: true, road: 1 },
  hills: { b: [['house', .8, 6, 8, 'gable'], ['apartment', .2, 8, 12]], t: ['cedar', 'bamboo', 'broad'], props: ['bush', 'rock'], gap: 12, rows: 1, dense: .5, retain: true, fence: true },
  city: { b: [['neon', .3, 10, 20], ['office', .35, 22, 50], ['apartment', .35, 20, 40]], t: [], props: ['billboard'], gap: 6, rows: 2, dense: .95, low: true },
  campus: { b: [['campus', .7, 12, 20], ['office', .3, 14, 24]], t: ['ginkgo', 'ginkgo', 'broad'], props: ['bike', 'bench'], gap: 12, rows: 1, dense: .6, fence: true },
  park: { b: [['house', .3, 4, 5, 'gable']], t: ['sakura', 'sakura', 'sakura', 'broad'], props: ['bench', 'lanternPost', 'bush'], gap: 10, rows: 1, dense: .25, fence: true },
  north: { b: [['house', .8, 6, 8, 'gable'], ['apartment', .2, 8, 10]], t: ['cedar', 'cedar', 'pine'], props: ['bush'], poles: true, gap: 14, rows: 1, dense: .4, fence: true, road: 1, fields: .3 },
  paddy: { b: [['house', 1, 5, 7, 'gable']], t: ['broad', 'willow'], props: ['scarecrow', 'bush'], poles: true, gap: 16, rows: 1, dense: .2, paddy: .7, fence: true, road: -1 },
  depot: { b: [['shed', 1, 8, 10]], t: [], props: ['streetlamp'], gap: 10, rows: 1, dense: .6 }
};
DH.SCENERY_SETS = SETS;
const pickW = (r, list) => { let t = 0; for (const it of list) t += it[1]; let x = r() * t; for (const it of list) { x -= it[1]; if (x <= 0) return it; } return list[0]; };
DH.autoScenery = c => {
  const { R, A, addThing, addStrip, extent, segOf, W } = c, n = R.segs.length;
  const HOUSE = ['#e8dcc4', '#d8d0c0', '#c8d0d8', '#e0c8b0', '#f0e8d8', '#d0c0a8'], ROOFS = ['#3a4a6a', '#5a5a64', '#8a4a32', '#4a5a4a', '#3a3a42'];
  for (let s = 0; s < R.length; s += 50) {
    const sg = segOf(s + 25), Z = R.zones[sg.zone] || R.zones.default, set = SETS[Z.set] || SETS.suburb, ex = extent(sg);
    // masts (not in tunnels, not on truss bridges), a km post every 100 m
    if (!sg.flags.tunnel && !(sg.flags.bridge && !sg.flags.arch)) {
      const lattice = ['downtown', 'city', 'campus', 'depot'].includes(Z.set), xs = sg.tracks.map(t => t.x0);
      const st = R.stations.find(q => { const d = W(s) - q.s0; return d >= 0 && d <= q.len; });
      if (!st) {
        if (lattice || xs.length > 2) addThing(A.thing('mast', { s, x: (ex[0] + ex[1]) / 2, posts: [ex[0] - 2.4 - (ex[0] + ex[1]) / 2, ex[1] + 2.4 - (ex[0] + ex[1]) / 2], wires: xs.map(x => x - (ex[0] + ex[1]) / 2), lattice, bias: -2 }));
        else { addThing(A.thing('mast', { s, x: ex[0] - 2.4, posts: [0], arm: 2.4, wires: [2.4], bias: -2 })); if (xs.length > 1) addThing(A.thing('mast', { s, x: ex[1] + 2.4, posts: [0], arm: -2.4, wires: [-2.4], bias: -2 })); }
      }
    }
    for (const k of [0, 50]) if (!segOf(s + k).flags.tunnel && R.id !== 'depot' || (R.id === 'depot' && k === 0)) addThing(A.thing('kmPost', { s: s + k + 2, x: ex[0] - 1.9, label: ((s + k) / 1000).toFixed(1) }));
    if (sg.flags.tunnel || sg.flags.bridge) continue;
    // walls in the city, retaining walls in the hills
    if (Z.wall && !R.isOcc(s + 25, ex[0] - 3)) { addStrip(A.strips('wall', { s, len: 50, x: ex[0] - 3.2, h: sg.flags.viaduct ? 1.6 : 2.6, col: '#b8b4aa' })); addStrip(A.strips('wall', { s, len: 50, x: ex[1] + 3.2, h: sg.flags.viaduct ? 1.6 : 2.6, col: '#b8b4aa' })); }
    if (set.retain && (Math.floor(s / 50) % 3 === 0)) addStrip(A.strips('wall', { s, len: 50, x: ex[1] + 4.5, h: 3.5, col: '#9a9488' }));
    // zone scenery: a cell per side
    for (const side of [-1, 1]) {
      const r = E.rng(DH.hash(R.id + ':' + s + ':' + side)), edge = side < 0 ? ex[0] : ex[1], baseX = edge + side * (set.gap + (Z.wall ? 1 : 0));
      if (R.isOcc(s + 25, edge + side * 8)) continue;
      const gy = sg.gy || 0, low = set.low || sg.flags.viaduct ? gy : 0;
      if (set.poles && side < 0 && Math.floor(s / 50) % 2 === 0 && !Z.wall) addThing(A.thing('pole', { s: s + 10, x: edge - 5.5, span: 100, y: gy }));
      if (set.paddy && r() < set.paddy) { addStrip(A.strips('flat', { s: s + 3, len: 44, x0: baseX, x1: baseX + side * (14 + r() * 10), y: gy + .05, col: '#5a8aa0', pattern: F => { if (F.k > 1) for (let u = Math.ceil(F.u0 / 1.5) * 1.5; u < F.u1; u += 1.5) F.rect(u, u + .25, 0, F.xr - F.x, '#6a9a4a'); } })); }
      for (let row = 0; row < set.rows; row++) {
        if (r() > set.dense) continue;
        const b = pickW(r, set.b), w = 10 + r() * 22, d = 8 + r() * (row ? 16 : 10), h = b[2] + r() * (b[3] - b[2]), x = baseX + side * (row ? 18 + r() * 12 : r() * 4);
        const s0 = s + r() * Math.max(1, 46 - w);
        if (R.isOcc(s0 + w / 2, x + side * d / 2)) continue;
        const kind = b[0], wall = kind === 'house' ? HOUSE[Math.floor(r() * HOUSE.length)] : undefined;
        addStrip(A.strips('building', { s: s0, len: Math.min(w, 46), x, d, h, y0: low, kind, roof: b[4] || 'flat', roofCol: set.roof || ROOFS[Math.floor(r() * ROOFS.length)], wall, seed: Math.floor(r() * 100), accent: ['#2a3a7a', '#7a2a2a', '#2a5a3a'][Math.floor(r() * 3)] }));
      }
      // trees and props between the line and the buildings
      const nT = set.t.length ? Math.floor(r() * 3) : 0;
      for (let i = 0; i < nT; i++) addThing(A.thing('tree', { s: s + r() * 50, x: edge + side * (7 + r() * Math.max(2, set.gap)), sp: set.t[Math.floor(r() * set.t.length)], size: .8 + r() * .4, y: low }));
      if (set.props.length && r() < .55) {
        const pk = set.props[Math.floor(r() * set.props.length)], far = pk === 'crane' || pk === 'greenhouse' || pk === 'containers';
        const o2 = { s: s + 5 + r() * 40, x: edge + side * (far ? set.gap + 14 + r() * 20 : 5 + r() * 3), seed: Math.floor(r() * 50), y: low, rows: 1 + Math.floor(r() * 3), n: 2 + Math.floor(r() * 3) };
        if (pk === 'billboard' || pk === 'stall') o2.col = ['#f2c230', '#e84a6a', '#3aa0e0'][Math.floor(r() * 3)];
        if (pk === 'bush') o2.col = ['#3e7a3a', '#4a8a3e', '#5a7a3a'][Math.floor(r() * 3)];
        addThing(A.thing(pk, o2));
      }
      // the line's boundary fence, a road beside the line, fields beyond
      if (set.fence && !Z.wall && !R.isOcc(s + 25, edge + side * 4)) addStrip(A.strips('fence', { s: s + 1, len: 48, x: edge + side * 4.2, h: 1.2, col: '#7a8a7a' }));
      if (set.road && side === set.road && !R.isOcc(s + 25, edge + side * 9)) addStrip(A.strips('flat', { s, len: 50, x0: edge + side * 6.5, x1: edge + side * 12.5, y: gy - .4, col: '#5a5a60', pattern: F => { const a = 0, b = F.xr - F.x; F.rect(F.u0, F.u1, a + .2, a + .35, '#d8d8d0'); F.rect(F.u0, F.u1, b - .35, b - .2, '#d8d8d0'); if (F.k > 1.5) for (let u = Math.ceil(F.u0 / 6) * 6; u < F.u1; u += 6) F.rect(u, u + 3, (a + b) / 2 - .08, (a + b) / 2 + .08, '#e8e0c0'); } }));
      if (set.fields && r() < set.fields && !R.isOcc(s + 25, edge + side * 20)) { const fc = ['#7aa04a', '#9aa848', '#6a9a3a', '#b8a850', '#5a8a3a'][Math.floor(r() * 5)]; addStrip(A.strips('flat', { s: s + 2, len: 46, x0: edge + side * 14, x1: edge + side * (30 + r() * 20), y: gy - .42, col: fc, pattern: F => { if (F.k > .8) for (let v = .5; v < F.xr - F.x; v += 2) F.rect(F.u0, F.u1, v, v + .5, E.tones(fc).sh); } })); }
    }
  }
};
})();
