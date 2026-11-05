// The fork's renderer (plan E1, in game code): when a junction is in view the road splits. Two branch surfaces run out of
// the junction, each centred on its own offset (the spread eases from 0 to 2.4 half-roads over the junction), with the
// gore between them. Beyond the junction each branch carries on as its stage. Before the decision both are drawn; after
// it, only the chosen one, and the car rides with it (its x is kept relative to the branch), so the switch to the next
// stage at the junction's end does not move the picture. Painted far to near, like the engine's road.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px } = E;
const SPREAD = 2.4;

/** the spread of the junction at a segment index of a stage: 0 before it, SPREAD after it, eased across it */
function spreadAt(st, k) {
  const j0 = Math.round(st.junction / OB.SEG), j1 = Math.round(st.len / OB.SEG);
  if (k <= j0) return 0;
  if (k >= j1) return SPREAD;
  const u = (k - j0) / (j1 - j0);
  return SPREAD * (-Math.cos(u * Math.PI) / 2 + .5);
}
OB.spreadAt = spreadAt;

/** the branches now: both before the decision, the chosen one after it (side -1 = left, +1 = right) */
function branchesOf(race, st) {
  const [l, r] = OB.nextStages(st.def).map(d => OB.World.stage(d.id));
  if (race.fork && race.fork.decided) return [{ side: race.fork.side === 'L' ? -1 : 1, st: race.fork.side === 'L' ? l : r }];
  return [{ side: -1, st: l }, { side: 1, st: r }];
}

/** the rows of the view, near to far: each depth k with its road pieces. A piece: the segment, its centre offset (half
 *  roads), the bend at its start and its slope, the road it belongs to, and the height it sits at. */
function rowsOf(race, st, v) {
  const road = st.road, segs = road.segs, N = segs.length, L = road.o.segment, drawN = road.o.draw;
  const base = road.seg(v.z), baseIdx = base.i, pct = (v.z % L) / L;
  const jIdx = Math.round(st.junction / L);
  const branches = race.fork || st.forkZ ? branchesOf(race, st) : null;
  // the shared road's bend, as the engine's road accumulates it
  let x = 0, dx = -(base.curve * pct);
  const tracks = [];   // per branch: its own bend and slope from the junction on
  const rows = [];
  for (let k = 0; k < drawN; k++) {
    const idx = baseIdx + k;
    if (!branches || idx < jIdx) {
      const s = segs[idx % N];
      rows.push({ k, s, wz: s.z + (s.i < baseIdx ? road.length : 0), x0: x, x1: x + dx, off: 0, road, yoff: 0 });
      x += dx; dx += s.curve;
      continue;
    }
    if (!tracks.length) for (const b of branches) tracks.push({ b, x, dx });   // the branches start from the shared bend
    for (const t of tracks) {
      let s, wz, road2, yoff = 0, sOff = t.b.side * SPREAD;
      if (idx < N) { s = segs[idx]; wz = s.z + (s.i < baseIdx ? road.length : 0); road2 = road; sOff = t.b.side * spreadAt(st, idx); }
      else {
        const ns = t.b.st.road.segs, nidx = idx - N;
        if (nidx >= ns.length) continue;
        s = ns[nidx]; wz = s.z + nidx * L; road2 = t.b.st.road; yoff = segs[N - 1].y1;
      }
      rows.push({ k, s, wz, x0: t.x, x1: t.x + t.dx, off: sOff, road: road2, yoff });
      t.x += t.dx; t.dx += s.curve;
    }
  }
  return rows;
}

/** draw the stage's view: the normal road when no junction is in view, else the split road */
OB.drawStage = (r, race, v) => {
  const st = race.stage, road = st.road;
  const L = road.o.segment;
  const inView = !!st.forkZ && !r.viewport && Math.floor(v.z / L) + road.o.draw > Math.round(st.junction / L) - 1;
  if (!inView) return road.draw(r, v);
  const o = road.o, W = r.W, H = r.H, t = OB.game.time || 0, fog = o.fog && E.hex(o.fog.color);
  const rows = rowsOf(race, st, v);
  const C = { x: (v.x || 0) * o.width, y: (v.h === undefined ? o.height : v.h) + road.yAt(v.z), z: v.z, cx: W / 2, cy: H / 2, hw: W / 2, hh: H / 2, pct: (v.z % L) / L, bend: [] };
  road._cam = C;
  r.overlay(g => {
    if (o.sky && o.sky.draw) o.sky.draw(Object.create(r, { ctx: { value: g }, bw: { value: W }, bh: { value: H }, W: { value: W }, H: { value: H }, ix: { value: v.turn || 0 }, iy: { value: 0 } }));
    else px.rect(g, 0, 0, W, H, o.sky || '#6aa8e8');
    // the rows by depth, far to near: the grass across each depth, then each piece's rumble, road and lanes
    const byK = new Map();
    for (const row of rows) { if (!byK.has(row.k)) byK.set(row.k, []); byK.get(row.k).push(row); }
    const cars = v.cars || [];
    for (const k of [...byK.keys()].sort((a, b) => b - a)) {
      const pieces = byK.get(k).map(row => {
        const p1 = road._p(row.x0 * o.width + row.off * o.width, row.s.y0 + row.yoff, row.wz, C);
        const p2 = road._p(row.x1 * o.width + row.off * o.width, row.s.y1 + row.yoff, row.wz + L, C);
        return { row, p1, p2 };
      }).filter(q => q.p1 && q.p2 && q.p1.d > road.depth);
      if (!pieces.length) continue;
      const first = pieces[0], colors0 = first.row.road.o.colors, alt0 = Math.floor(first.row.s.i / o.rumble) % 2;
      const top = Math.min(first.p1.y, first.p2.y), hgt = Math.abs(first.p1.y - first.p2.y) + 1;
      px.rect(g, 0, top, W, hgt, colors0.grass[alt0]);
      for (const q of pieces) {
        const rc = q.row.road.o.colors, cols = q.row.s.colors ? Object.assign({}, rc, q.row.s.colors) : rc;
        const alt = Math.floor(q.row.s.i / o.rumble) % 2, lanes = q.row.road.o.lanes || o.lanes;
        q.row.road.dressBand(g, { x: 0, w: W }, q.row.s, q.p1, q.p2, alt);   // (the ground, walls and spans of this piece)
        const quad = (x1, w1, x2, w2, c) => px.poly(g, [[x1 - w1, q.p1.y], [x1 + w1, q.p1.y], [x2 + w2, q.p2.y], [x2 - w2, q.p2.y]], c);
        const kk = Math.max(6, 2 * lanes);
        quad(q.p1.x, q.p1.w * (1 + 1 / kk), q.p2.x, q.p2.w * (1 + 1 / kk), cols.rumble[alt]);
        quad(q.p1.x, q.p1.w, q.p2.x, q.p2.w, cols.road[alt]);
        if (!alt) for (let l = 1; l < lanes; l++) { const u = -1 + 2 * l / lanes; quad(q.p1.x + u * q.p1.w, q.p1.w / (16 * lanes), q.p2.x + u * q.p2.w, q.p2.w / (16 * lanes), cols.lane); }
      }
      if (fog) { const f = 1 - Math.exp(-((k / o.draw) ** 2) * o.fog.density); if (f > .01) { g.fillStyle = `rgba(${fog[0]},${fog[1]},${fog[2]},${f.toFixed(3)})`; g.fillRect(0, top, W, hgt); px.reset(g); } }
      for (const q of pieces) for (const th of (q.row.s.things || [])) { g.globalAlpha = 1; road._thing(g, th.what, q.p1.x + q.p1.scale * th.offset * o.width, q.p1.y, q.p1.scale, th.scale, t); }
    }
    // the cars: on the current stage's own road, at the centre of their segment
    for (const c of cars) {
      if (c.z < v.z - L || c.z > v.z + 9 * L) continue;
      const row = rows.find(rw => rw.road === road && rw.s === road.seg(c.z) && rw.off === 0);
      if (!row) continue;
      const p1 = road._p(row.x0 * o.width, row.s.y0, row.wz, C), p2 = road._p(row.x1 * o.width, row.s.y1, row.wz + L, C);
      if (!p1 || !p2) continue;
      const u = (((c.z - row.wz) % road.length + road.length) % road.length) / L;
      road._thing(g, c, p1.x + (p2.x - p1.x) * u + p1.scale * c.x * o.width, p1.y + (p2.y - p1.y) * u, p1.scale, 8, t);
    }
    px.reset(g);
  });
  return road;
};
})();
