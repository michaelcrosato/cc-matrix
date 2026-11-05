/* DENSHA DE HALO! · the route compiler: a designer's route script (sorted [s, command, params]) becomes 5 m segments,
 * strips and things for the renderer, and the logic lists (signals, limits, stations, crossings, horn zones, calls).
 * Commands: zone, line, tracks, curve, grade, limit, signal, station, tunnel, bridge, crossing, horn, workers, overpass,
 * viaduct, landmark, scenery, emitter, siding. Auto: masts, km posts, ATS beacons, call points, poles, sound walls and
 * zone scenery from a seeded stream per 50 m cell per side. validateRoute(R, stages) checks a route against its stages. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, A = DH.ART, S = A.STRIP;
const SEG = 5;
const smooth = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);

DH.compileRoute = def => {
  const len = def.len, n = Math.round(len / SEG), loop = !!def.loop;
  const W = s => loop ? DH.wrap(s, len) : s;
  const R = {
    id: def.id, len, n, loop, zones: [], curve: new Float32Array(n), y: new Float32Array(n + 1), head: new Float32Array(n + 1), grade: new Float32Array(n),
    flags: new Uint8Array(n), zone: new Uint8Array(n), drop: new Float32Array(n), line: new Float32Array(n), tracks: new Array(n), strips: new Array(n), things: new Array(n),
    signals: [], limits: [], stations: [], crossings: [], horns: [], calls: [], tunnels: [], bridges: [], workers: [], emitters: [], landmarks: [], kms: [], occupied: new Uint8Array(Math.ceil(n / 10) * 2 + 2)
  };
  for (let i = 0; i < n; i++) { R.strips[i] = []; R.things[i] = []; }
  const segOf = s => { const i = Math.floor(W(s) / SEG); return loop ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i)); };
  const span = (s0, l, fn) => { const a = Math.floor(s0 / SEG), m = Math.max(1, Math.round(l / SEG)); for (let j = 0; j < m; j++) { const i = loop ? (((a + j) % n) + n) % n : a + j; if (i < 0 || i >= n) continue; fn(i, (j + .5) / m); } };
  const addStrip = st => { st.s0 = W(st.s0); st.s1 = st.s0 + (st.len !== undefined ? st.len : st.s1Rel); if (!loop) st.s1 = Math.min(st.s1, len); span(st.s0, st.s1 - st.s0, i => R.strips[i].push(st)); return st; };
  const strip = (s0, l, x0, x1, y0, y1, faces, extra) => addStrip(Object.assign({ s0, len: l, x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, faces }, extra || {}));
  const thing = th => { th.s = W(th.s); R.things[segOf(th.s)].push(th); return th; };
  const occ = (s0, l, side) => { for (let s = s0; s < s0 + l; s += 50) { const c = Math.floor(W(s) / 50); if (side <= 0) R.occupied[c * 2] = 1; if (side >= 0) R.occupied[c * 2 + 1] = 1; } };
  const isOcc = (c, side) => R.occupied[c * 2 + (side > 0 ? 1 : 0)];
  const cmds = def.script.map(c => [W(c[0]), c[1], c[2] || {}]).sort((a, b) => a[0] - b[0]);
  const by = name => cmds.filter(c => c[1] === name);
  // zones
  const zoneIds = [];
  for (const [s, , id] of by('zone')) if (!zoneIds.includes(id)) zoneIds.push(id);
  R.zones = zoneIds.map(id => Object.assign({ id }, DH.ZONES[id]));
  const zc = by('zone');
  for (let i = 0; i < n; i++) {
    const s = i * SEG; let z = zc.length ? zc[zc.length - 1][2] : zoneIds[0];
    for (const c of zc) if (c[0] <= s) z = c[2];
    R.zone[i] = Math.max(0, zoneIds.indexOf(z));
  }
  R.zoneAt = s => R.zones[R.zone[segOf(s)]];
  // line speed
  const lc = by('line');
  for (let i = 0; i < n; i++) { let v = def.lineSpeed || 85; const s = i * SEG; if (lc.length) v = lc[lc.length - 1][2].v; for (const c of lc) if (c[0] <= s) v = c[2].v; R.line[i] = v; }
  // curves (eased over 20 m at each end)
  for (const [s, , p] of by('curve')) {
    const c = SEG * SEG / p.r * (p.dir === 'L' ? -1 : 1), m = Math.round(p.len / SEG), e = Math.min(4, Math.floor(m / 3));
    span(s, p.len, (i, u) => { const j = Math.round(u * m - .5), w = j < e ? (j + .5) / e : j >= m - e ? (m - j - .5) / e : 1; R.curve[i] += c * Math.max(0, Math.min(1, w)); });
    R.calls; (R.curves || (R.curves = [])).push({ s, len: p.len, r: p.r, dir: p.dir });
  }
  // grades (eased over 50 m), heights integrated; a loop's residual is spread so the ring closes
  for (const [s, , p] of by('grade')) {
    const m = Math.round(p.len / SEG), e = Math.min(10, Math.floor(m / 3));
    span(s, p.len, (i, u) => { const j = Math.round(u * m - .5), w = j < e ? (j + .5) / e : j >= m - e ? (m - j - .5) / e : 1; R.grade[i] += p.permille * Math.max(0, Math.min(1, w)); });
  }
  for (let i = 0; i < n; i++) R.y[i + 1] = R.y[i] + R.grade[i] / 1000 * SEG;
  if (loop) { const res = R.y[n]; for (let i = 0; i <= n; i++) R.y[i] -= res * i / n; for (let i = 0; i < n; i++) R.grade[i] = (R.y[i + 1] - R.y[i]) / SEG * 1000; }
  for (let i = 0; i < n; i++) R.head[i + 1] = R.head[i] + R.curve[i] / SEG;
  // tracks: a base layout, then transitions
  let layout = (def.tracks0 || [{ id: 'A', x: 0 }, { id: 'B', x: 3.8 }]).map(t => Object.assign({ el: true }, t));
  const tc = by('tracks');
  const layoutAt = [];
  for (let i = 0; i < n; i++) R.tracks[i] = null;
  let lastI = 0;
  const fillLayout = (i0, i1, lay) => { for (let i = i0; i < i1 && i < n; i++) R.tracks[i] = lay.map(t => ({ id: t.id, x0: t.x, x1: t.x, el: t.el !== false && !t.side, side: !!t.side })); };
  for (const [s, , p] of tc) {
    const i0 = Math.floor(s / SEG), m = Math.max(1, Math.round((p.len || 100) / SEG));
    fillLayout(lastI, i0, layout);
    for (let j = 0; j < m; j++) {
      const i = i0 + j; if (i >= n) break;
      R.tracks[i] = p.list.map(t => ({ id: t.id, x0: t.x0 + (t.x1 - t.x0) * smooth(j / m), x1: t.x0 + (t.x1 - t.x0) * smooth((j + 1) / m), el: t.el !== false, side: !!t.side }));
    }
    layout = p.list.filter(t => !t.end).map(t => ({ id: t.id, x: t.x1, el: t.el !== false, side: !!t.side }));
    lastI = i0 + m;
  }
  fillLayout(lastI, n, layout);
  R.trackX = (id, s) => { const tr = R.tracks[segOf(s)]; const t = tr && tr.find(q => q.id === id); if (!t) return null; const u = (W(s) / SEG) % 1; return t.x0 + (t.x1 - t.x0) * u; };
  // helpers the game reads
  R.sAt = i => i * SEG;
  R.segOf = segOf;
  R.yAt = s => { s = W(s); const i = Math.min(n - 1, Math.max(0, Math.floor(s / SEG))), u = (s - i * SEG) / SEG; return R.y[i] + (R.y[i + 1] - R.y[i]) * u; };
  R.headAt = s => { s = W(s); const i = Math.min(n - 1, Math.max(0, Math.floor(s / SEG))), u = (s - i * SEG) / SEG; return R.head[i] + (R.head[i + 1] - R.head[i]) * u; };
  R.gradeAt = s => R.grade[segOf(s)];
  R.curveAt = s => R.curve[segOf(s)];
  R.lineAt = s => R.line[segOf(s)];
  R.flagAt = s => R.flags[segOf(s)];
  R.ahead = (from, to) => { let d = to - from; if (loop) { d = ((d % len) + len) % len; if (d > len - 100) d -= len; } return d; };

  // ---------- structures ----------
  const LEFT = t => Math.min(...t.map(q => Math.min(q.x0, q.x1))), RIGHT = t => Math.max(...t.map(q => Math.max(q.x0, q.x1)));
  for (const [s, , p] of by('tunnel')) {
    span(s, p.len, i => { R.flags[i] |= 1; });
    const tr = R.tracks[segOf(s)], lx = LEFT(tr) - 2.6, rx = RIGHT(tr) + 2.6;
    strip(s, p.len, lx - 70, lx, 0, 24, { side: S.tunnelWall, top: S.hillTop, end0: S.portal, end1: S.portal }, { kind: 'hill' });
    strip(s, p.len, rx, rx + 70, 0, 24, { side: S.tunnelWall, top: S.hillTop, end0: S.portal, end1: S.portal }, { kind: 'hill' });
    strip(s, p.len, lx, rx, 6.2, 24, { under: '#3a3632', top: S.hillTop, end0: S.portal, end1: S.portal }, { kind: 'roof' });
    R.tunnels.push({ s, len: p.len }); occ(s - 50, p.len + 100, 0);
  }
  for (const [s, , p] of by('bridge')) {
    span(s, p.len, i => { R.flags[i] |= 2; R.drop[i] = 8; });
    const tr = R.tracks[segOf(s)], lx = LEFT(tr) - 2.3, rx = RIGHT(tr) + 2.3;
    if (p.kind === 'truss') {
      for (const x of [lx, rx]) strip(s, p.len, x - .1, x + .1, 0, 7.5, { side: S.truss('#4a6aa0') }, { kind: 'truss' });
      strip(s, p.len, lx, rx, 7.3, 7.6, { under: '#3a5a8a' }, { kind: 'brace' });
    } else for (const x of [lx, rx]) strip(s, p.len, x - .25, x + .25, -1.4, .8, { side: '#5a7a9a', top: '#4a6a8a' }, { kind: 'girder' });
    strip(s, p.len, lx + .2, rx - .2, -1.4, -.2, { side: '#4a5a6a', under: '#3a4a5a' }, { kind: 'deck' });
    for (let q = 0; q < p.len; q += 60) strip(s + q, 4, lx + 1, rx - 1, -9, -1.4, { side: '#7a7a78', end0: '#8a8a88', end1: '#8a8a88' }, { kind: 'pier' });
    R.bridges.push({ s, len: p.len, kind: p.kind, water: p.water }); occ(s, p.len, 0);
  }
  for (const [s, , p] of by('viaduct')) {
    span(s, p.len, i => { R.flags[i] |= 8; R.drop[i] = p.h; });
    const tr = R.tracks[segOf(s)];
    for (let q = 0; q < p.len; q += 25) {
      const tq = R.tracks[segOf(s + q)], lx = LEFT(tq) - 2.6, rx = RIGHT(tq) + 2.6;
      strip(s + q, 25, lx - .3, lx, -1.2, .9, { side: S.wall('#a8a49c', '#8a8680'), top: '#c8c4bc' }, { kind: 'parapet' });
      strip(s + q, 25, rx, rx + .3, -1.2, .9, { side: S.wall('#a8a49c', '#8a8680'), top: '#c8c4bc' }, { kind: 'parapet' });
      if (q % 50 === 0) strip(s + q, 2, lx + 1, rx - 1, -p.h, -1.2, { side: '#8a8680', end0: '#9a968e', end1: '#9a968e' }, { kind: 'pier' });
    }
  }
  for (const [s, , p] of by('overpass')) {
    const w = p.w || 14, h = p.h || 7;
    strip(s, w, -90, 90, h, h + 1.3, { under: '#6a6a70', end0: S.wall('#a8a8a0', '#c8c8c0'), end1: S.wall('#a8a8a0', '#c8c8c0'), top: '#5a5a60' }, { kind: 'overpass' });
    strip(s, w, -90, 90, h + 1.3, h + 2.2, { end0: S.fence, end1: S.fence }, { kind: 'rail' });
    const tr = R.tracks[segOf(s)], lx = LEFT(tr) - 3.5, rx = RIGHT(tr) + 3.5;
    for (const x of [lx, rx]) strip(s + 2, w - 4, x - .5, x + .5, 0, h, { side: '#9a9890', end0: '#a8a8a0', end1: '#a8a8a0' }, { kind: 'pier' });
    occ(s - 20, w + 40, 0);
  }
  // signals (and their ATS beacons, block boundaries and call points)
  for (const [s, , p] of by('signal')) {
    const track = p.track || 'A', tx = R.trackX(track, s) || 0;
    const sig = { id: p.id, s, track, kind: p.kind || 'block', look: p.look || null, aspect: 'R', forced: p.forced || null, sighted: false };
    R.signals.push(sig);
    thing(A.signal(sig, tx - 2.4));
    if (sig.kind !== 'shunt') thing(A.beacon(s - 600, tx));
    R.calls.push({ id: 'call:' + p.id, s, x: tx - 2.4, y: 5.2, kind: sig.kind === 'start' ? 'start' : 'signal', sig, track });
  }
  R.signals.sort((a, b) => a.s - b.s);
  // limits: a board, an END board, a call point
  for (const [s, , p] of by('limit')) {
    const until = p.until !== undefined ? W(p.until) : null;
    R.limits.push({ s, v: p.v, until, track: p.track || 'A' });
    thing(A.limitBoard(s, -2.9, p.v));
    if (until !== null) thing(A.limitBoard(until, -2.9, p.v, true));
    R.calls.push({ id: 'call:L' + Math.round(s), s, x: -2.9, y: 2.6, kind: 'limit', v: p.v });
  }
  for (const [s] of by('horn')) { R.horns.push({ s, len: 150 }); thing(A.hornBoard(s, -2.8)); R.calls.push({ id: 'call:H' + Math.round(s), s, x: -2.8, y: 2.4, kind: 'horn' }); }
  for (const [s, , p] of by('workers')) {
    const w = { s, until: W(p.until), limit: p.limit || 25, lookout: W(p.lookout || s - 50) };
    R.workers.push(w);
    thing(A.slowBoard(s - 150, -2.9, w.limit)); thing(A.slowBoard(w.until, -2.9, w.limit, true));
    R.limits.push({ s: s - 150, v: w.limit, until: w.until, track: 'A', slow: true });
    R.calls.push({ id: 'call:W' + Math.round(s), s: s - 150, x: -2.9, y: 2, kind: 'limit', v: w.limit });
  }
  for (const [s, , p] of by('emitter')) { const em = { s, id: p.id, crossing: p.crossing, flashing: false }; R.emitters.push(em); thing(A.emitter(s, -2.8, em)); }
  // crossings: a road band, gates, lamps, waiting traffic
  for (const [s, , p] of by('crossing')) {
    const road = p.road || 6, cr = { id: p.id, s, road, warn: false, gate: 0, cars: p.cars || 2, special: !!p.special, things: [] };
    span(s, road, i => { R.flags[i] |= 4; });
    const tr = R.tracks[segOf(s)], lx = LEFT(tr) - 3, rx = RIGHT(tr) + 3;
    thing(A.crossing(cr, lx, -1)); const c2 = A.crossing(cr, rx, 1); c2.s = s + road; thing(c2);
    const rr = DH.rng('cross:' + p.id), cols = ['#e8e8e8', '#e04a3a', '#3a7ad0', '#f0c030', '#4ac060', '#2a2a30'];
    for (let k = 0; k < (p.cars || 2); k++) { const side = k % 2 ? 1 : -1, car = A.keiCar(s + road * (side > 0 ? .3 : .7), side > 0 ? rx + 4 + Math.floor(k / 2) * 4.5 : lx - 4 - Math.floor(k / 2) * 4.5, cols[Math.floor(rr() * cols.length)]); cr.things.push(thing(car)); }
    R.crossings.push(cr);
    R.calls.push({ id: 'call:X' + p.id, s, x: lx, y: 3, kind: 'crossing', cr });
    occ(s - 50, road + 100, 0);
  }
  // stations: platforms, canopies, boards, props; approach boards; stop markers
  const stationCmds = by('station');
  stationCmds.forEach(([s, , p], si) => {
    const meta = (DH.STATIONS || {})[p.id] || { name: p.id.toUpperCase(), en: p.id };
    const st = Object.assign({ id: p.id, s, len: p.len, side: p.side, stop: {}, platforms: [], name: meta.name, en: meta.en, melody: p.melody || p.id, crowd: p.crowd || 2, passing: false, doorSide: p.doors || (p.side === 'R' ? 'R' : 'L') }, {});
    for (const k in p.stop) st.stop[k] = W(p.stop[k]);
    const plats = p.platforms || (p.side === 'R' ? [[1.6, 5.8, 'island']] : p.side === 'quad' ? [[-5.4, -1.6, 'island'], [8.6, 12.4, 'island']] : [[-5.4, -1.6, 'side'], [5.4, 9.2, 'side']]);
    const roof = p.roof || [s + p.len * .25, s + p.len * .8];
    for (const [x0, x1, kind] of plats) {
      const edges = [];
      if (kind === 'island' || x1 < 0) edges.push({ x: x1, in: -1 });
      if (kind === 'island' || x0 > 0) edges.push({ x: x0, in: 1 });
      strip(s, p.len, x0, x1, -.4, 1.1, { side: S.wall('#8a8680', '#6a6660'), top: S.platformTop(edges), end0: '#9a968e', end1: '#9a968e' }, { kind: 'platform' });
      // canopy and columns
      strip(roof[0], roof[1] - roof[0], x0 - .3, x1 + .3, 3.6, 3.9, { under: S.canopyUnder, side: '#8a8a92', top: '#6a6a72', end0: '#8a8a92', end1: '#8a8a92' }, { kind: 'canopy', lit: true });
      const mid = (x0 + x1) / 2;
      for (let q = roof[0] + 5; q < roof[1]; q += 10) thing(A.column(q, mid, 2.5));
      if (kind === 'side') strip(s, p.len, x1 < 0 ? x0 - .1 : x1, x1 < 0 ? x0 : x1 + .1, 1.1, 2.3, { side: S.fence }, { kind: 'fence' });
      // props along the platform
      const prev = (DH.STATIONS[p.prev] || {}).name, next = (DH.STATIONS[p.next] || {}).name;
      for (let q = 25; q < p.len - 10; q += 40) thing(A.nameBoard(s + q, mid, { name: meta.name, en: meta.en, prev, next }));
      thing(A.bench(s + p.len * .42, mid + (x1 < 0 ? -.8 : .8) * (kind === 'island' ? 0 : 1)));
      thing(A.bench(s + p.len * .62, mid));
      thing(A.vending(s + p.len * .5, kind === 'island' ? mid : x1 < 0 ? x0 + .7 : x1 - .7, ['#d83030', '#3060c8', '#f0f0f0'][si % 3]));
      thing(A.bin(s + p.len * .55, mid));
      thing(A.clock(s + p.len * .7, mid));
      thing(A.ledBoard(s + p.len * .35, mid, st));
      thing(A.poster(s + p.len * .3, kind === 'island' ? mid : x1 < 0 ? x0 + .3 : x1 - .3));
      if (kind === 'island' && x1 - x0 > 3) strip(s + p.len * .45, 9, mid - .9, mid + .9, 1.1, 3.4, { side: S.wall('#b8b4ac', '#d8d4cc'), top: '#8a8a92', end0: '#3a3a42', end1: '#b8b4ac' }, { kind: 'stairs' });
      st.platforms.push({ x0, x1, kind });
    }
    // the station building behind the first side platform, or beside an island
    const bx = plats.length ? (plats[0][0] < 0 ? plats[0][0] - 3 : plats[0][1] + 3) : 0;
    if (plats.length) strip(s + p.len * .3, p.len * .35, bx < 0 ? bx - 10 : bx, bx < 0 ? bx : bx + 10, -.4, 9, { side: S.facade('#d8d0c0', { win: '#4a5a7a', pitch: 3.5 }), top: '#6a6a72', end0: S.facade('#c8c0b0', { pitch: 3.5 }), end1: S.facade('#c8c0b0', { pitch: 3.5 }) }, { kind: 'building', seed: si * 7, lit: true });
    // stop markers on the edge serving our track
    const edgeX = (() => { const e = st.doorSide === 'L' ? -1.6 : 1.6; return e + (st.doorSide === 'L' ? -.35 : .35); })();
    for (const k in st.stop) {
      if (p.side === 'quad') for (const mx of [-1.95, -5.05, 8.95, 12.05]) thing(A.stopMarker(st.stop[k], mx, k));
      else thing(A.stopMarker(st.stop[k], plats.length ? edgeX : -1.9, k));
    }
    // the approach board, 400 m before the 6-car stop (it reads STOP or PASS for the stage)
    const st6 = st.stop[6] !== undefined ? st.stop[6] : st.stop[Object.keys(st.stop)[0]];
    const ab = A.stopBoard(st6 - 400, -2.9, false); ab.draw0 = ab.draw; ab.draw = (g, sx, sy, k, C) => A.stopBoard(0, 0, st.passing).draw(g, sx, sy, k, C); thing(ab);
    R.calls.push({ id: 'call:A' + p.id, s: st6 - 400, x: -2.9, y: 2.4, kind: 'approach', st });
    R.stations.push(st);
    occ(s - 60, p.len + 120, 0);
  });
  R.stations.forEach((st, i) => { st.index = i; });
  R.station = id => R.stations.find(q => q.id === id);
  // landmarks and manual scenery
  for (const [s, , p] of by('landmark')) { R.landmarks.push({ s, id: p.id, x: p.x }); thing(A.landmark(s, p.x, p.id, p.scale || 1)); occ(s - 50, 100, p.x < 0 ? -1 : 1); }
  for (const [s, , p] of by('scenery')) {
    if (p.thing === 'tree') thing(A.tree(s, p.x, p.kind, p.size || 1)); else if (p.thing === 'lamp') thing(A.lamp(s, p.x));
    else if (p.thing === 'building') strip(s, p.len || 20, p.x, p.x + (p.w || 10) * (p.x < 0 ? -1 : 1), p.y0 || 0, p.h, DH.buildingFaces(p.facade || 'office', p.color), { kind: 'building', lit: true, seed: Math.round(s) });
  }
  for (const [s, , p] of by('siding')) { /* parked trains on sidings are actors the stage places (logic only) */ (R.sidings || (R.sidings = [])).push({ s, len: p.len, x: p.x }); }

  // ---------- automatic line-side ----------
  for (let s = 0; s < len; s += 50) {
    const i = segOf(s); if (R.flags[i] & 1) continue;
    const tr = R.tracks[i]; if (!tr || !tr.length) continue;
    const lx = LEFT(tr) - 2.6, rx = RIGHT(tr) + 2.4, z = R.zones[R.zone[i]] || {};
    const kind = z.masts || 'concrete';
    thing(A.mast(s, lx, rx - lx - 2, kind));
    if (tr.length > 1) thing(A.mast(s + .5, rx, -(rx - lx) / 2, kind));
  }
  for (let s = 0; s < len; s += 100) { const i = segOf(s); if (R.flags[i] & 3) continue; const tr = R.tracks[i]; thing(A.kmPost(s + 2, LEFT(tr) - 3.3, (s / 1000).toFixed(1))); }
  // zone scenery: a seeded stream per 50 m cell per side
  for (let c = 0; c < Math.floor(len / 50); c++) {
    const s = c * 50, i = segOf(s), z = R.zones[R.zone[i]] || {}, drop = R.drop[i] || 0, tr = R.tracks[i];
    if (R.flags[i] & 1) continue;
    for (const side of [-1, 1]) {
      const rr = DH.rng('cell:' + R.id + ':' + c + ':' + side);
      const edge = side < 0 ? LEFT(tr) - 4 : RIGHT(tr) + 4;
      if (z.wall && !isOcc(c, side) && !(R.flags[i] & 6)) strip(s, 50, side < 0 ? edge - .3 : edge, side < 0 ? edge : edge + .3, -drop * 0, 2.4, { side: S.wall('#b0aca2', '#d0ccc2'), top: '#c8c4bc' }, { kind: 'soundwall' });
      if (isOcc(c, side) && rr() < .7) continue;
      if (R.flags[i] & 2) { if (rr() < .3) thing(A.tree(s + rr() * 50, edge + side * (30 + rr() * 30), 'willow', 1)); continue; }
      const gen = DH.ZONE_GEN[z.gen || 'suburb'];
      if (gen) gen({ s, side, edge, rr, drop, strip, thing, z, R });
    }
  }
  return R;
};

/* facades for the parametric town */
DH.buildingFaces = (facade, color) => {
  const F = { office: ['#8a96a8', '#3a5a7a', 3, 3.5], apartment: ['#d8ccb8', '#4a5a6a', 3, 2.8], house: ['#e8e0d0', '#4a5a6a', 4, 2.8], shop: ['#e8d8c0', '#5a6a7a', 3, 3], konbini: ['#f0f0f0', '#3a6a9a', 3, 3.5],
    warehouse: ['#a8a090', '#5a5a5a', 6, 4], machiya: ['#5a4030', '#d8b880', 2.2, 2.6], hotel: ['#c8b8a0', '#3a4a6a', 2.5, 3], campus: ['#c8b098', '#4a5a7a', 3, 3.5], farm: ['#c8b898', '#4a4a4a', 4, 2.8] }[facade] || ['#a8a8a8', '#4a4a5a', 3, 3];
  const base = color || F[0], o = { win: F[1], pitch: F[2], floor: F[3], litN: facade === 'office' ? 5 : 3 };
  return { side: DH.ART.STRIP.facade(base, o), end0: DH.ART.STRIP.facade(E.shade(base, -.12), o), end1: DH.ART.STRIP.facade(E.shade(base, -.12), o), top: facade === 'house' || facade === 'machiya' || facade === 'farm' ? (color ? '#6a4a3a' : '#5a5a6a') : '#7a7a80' };
};

/** check a route (and the stages that use it): stations in order, stops inside their platforms, home signals before
 *  their platform, every limit ends, no signal in a portal, block boundaries increasing. Returns a list of problems */
DH.validateRoute = (R, stages = []) => {
  const bad = [];
  for (let i = 1; i < R.stations.length; i++) if (R.stations[i].s <= R.stations[i - 1].s) bad.push('stations out of order: ' + R.stations[i].id);
  for (const st of R.stations) for (const k in st.stop) {
    const t = st.stop[k], start = st.s, end = st.s + st.len, rel = R.ahead(start, t);
    if (rel < DH.CAR * +k - .5 || rel > st.len + .5) bad.push('stop ' + k + ' of ' + st.id + ' outside its platform (' + rel.toFixed(1) + ' m in a ' + st.len + ' m platform)');
  }
  for (const sg of R.signals) {
    if (sg.kind === 'home') { const st = R.stations.find(q => { const d = R.ahead(sg.s, q.s); return d >= 0 && d < 400; }); if (!st) bad.push('home signal ' + sg.id + ' has no platform after it'); }
    for (const tn of R.tunnels) { const d = R.ahead(tn.s, sg.s); if (Math.abs(d) < 10 || Math.abs(d - tn.len) < 10) bad.push('signal ' + sg.id + ' in a tunnel portal'); }
  }
  for (const lm of R.limits) if (lm.until === null && !lm.slow && lm.v < 1) bad.push('a limit with no end at ' + lm.s);
  const byTrack = {};
  for (const sg of R.signals) (byTrack[sg.track] || (byTrack[sg.track] = [])).push(sg.s);
  for (const t in byTrack) for (let i = 1; i < byTrack[t].length; i++) if (byTrack[t][i] <= byTrack[t][i - 1]) bad.push('block boundaries not increasing on ' + t);
  for (const sg of stages) if (sg.route === R.id) for (const st of sg.stops || []) if (!R.station(st.id)) bad.push(sg.id + ': stop ' + st.id + ' is not on ' + R.id);
  return bad;
};
})();
