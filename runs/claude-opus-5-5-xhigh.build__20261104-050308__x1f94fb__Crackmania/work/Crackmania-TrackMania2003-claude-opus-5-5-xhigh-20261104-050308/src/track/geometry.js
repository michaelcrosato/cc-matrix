// CRACKMANIA ribbon mesher (PLAN §4.3): each block's path swept with its environment's cross-section into render
// triangles per material (three.js winding, metres, y up) and collision triangles (Rapier winding, world metres, z up)
// with a surface tag; the base plate with its chasms, chasm walls, water and the boundary wall
import { TYPES, CELL, LEVEL, GRID, GX, GY, frameAt, cellWorld } from './blocks.js';
import { add, mul, cross, norm } from '../lib/v3.js';

export const LIFT = .1;   // every road sits this far above its level (the plate at level 0 never fights it)
export const SECTION = {
  dustbowl: { hw: 7, curb: 1, curbH: .14, railH: .9, railT: .35, th: .6 },
  hedgerow: { hw: 6, curb: .8, curbH: .12, railH: .8, railT: .5, th: .6 },
  frostpeak: { hw: 6, curb: .8, curbH: .12, railH: 1.1, railT: .6, th: .6 }
};
export const ROADW = env => SECTION[env].hw;

class Part {
  constructor() { this.pos = []; this.uv = []; this.idx = []; }
  get n() { return this.pos.length / 3; }
}
class Coll { constructor(surface) { this.surface = surface; this.pos = []; this.idx = []; } get n() { return this.pos.length / 3; } }

/** the cross-section for a block: a polyline of points { o (across, + right), h (up), g (true: drop to the base) } and
 *  the parts between them: [{ a, b, part, surf }] (surf: collision surface, or null: drawn only) */
function section(env, T, pl, track) {
  const S = SECTION[env], hw = S.hw, c = S.curb, cH = S.curbH, bH = S.railH, bt = S.railT, th = S.th;
  const elevated = pl.L > 0, solid = !!(T.hill || T.kicker || T.landing), turnOuter = T.turn ? (T.turn > 0 ? 'L' : 'R') : null;
  let railL = elevated || T.hill || turnOuter === 'L', railR = elevated || T.hill || turnOuter === 'R';
  if (T.kicker || T.landing) railL = railR = false;
  if (T.cp || T.finish || T.start) { railL = railR = elevated; }
  if (T.loop) {   // lips both sides, the band's back face
    const lip = .5, P = [{ o: -hw - c - bt, h: -th }, { o: -hw - c - bt, h: lip }, { o: -hw - c, h: lip }, { o: -hw - c, h: cH }, { o: -hw, h: 0 }, { o: hw, h: 0 }, { o: hw + c, h: cH }, { o: hw + c, h: lip }, { o: hw + c + bt, h: lip }, { o: hw + c + bt, h: -th }];
    const parts = ['rail', 'rail', 'rail', 'curb', 'road', 'curb', 'rail', 'rail', 'rail', 'under'];
    const surf = ['wall', 'wall', 'wall', 'road', 'road', 'road', 'wall', 'wall', 'wall', null];
    return { P, segs: P.map((_, i) => ({ a: i, b: (i + 1) % P.length, part: parts[i], surf: surf[i] })) };
  }
  const P = [], segs = [], push = (pt, part, surf) => { P.push(pt); if (part) segs.push({ a: P.length - 2, b: P.length - 1, part, surf }); };
  const low = solid || elevated;
  // left side, from the outside bottom up
  if (railL) { push({ o: -hw - c - bt, h: -th, g: solid }); push({ o: -hw - c - bt, h: cH + bH }, solid ? 'side' : 'rail', 'wall'); push({ o: -hw - c, h: cH + bH }, 'rail', 'wall'); push({ o: -hw - c, h: cH }, 'rail', 'wall'); }
  else if (low) { push({ o: -hw - c, h: -th, g: solid }); push({ o: -hw - c, h: cH }, 'side', null); }
  else { push({ o: -hw - c - .5, h: -LIFT - .02 }); push({ o: -hw - c, h: cH }, 'curb', 'road'); }
  push({ o: -hw, h: 0 }, 'curb', 'road');
  push({ o: hw, h: 0 }, 'road', 'ROAD');
  push({ o: hw + c, h: cH }, 'curb', 'road');
  if (railR) { push({ o: hw + c, h: cH + bH }, 'rail', 'wall'); push({ o: hw + c + bt, h: cH + bH }, 'rail', 'wall'); push({ o: hw + c + bt, h: -th, g: solid }, solid ? 'side' : 'rail', 'wall'); }
  else if (low) push({ o: hw + c, h: -th, g: solid }, 'side', null);
  else push({ o: hw + c + .5, h: -LIFT - .02 }, 'curb', 'road');
  if (low) segs.push({ a: P.length - 1, b: 0, part: 'under', surf: null });
  return { P, segs };
}

/** one block's geometry: { parts: { name: Part }, coll: [Coll], pillars: [[x, y, zTop, w]], gates } */
export function blockGeometry(pl, env, track) {
  const T = TYPES[pl.type], out = { parts: {}, coll: [], pillars: [] };
  if (!T.path || T.gap || T.deco) return out;
  const part = n => out.parts[n] || (out.parts[n] = new Part());
  const S = SECTION[env];
  if (T.cross) return crossing(pl, env, out, part);
  const sec = section(env, T, pl, track), L = T.len;
  const curved = T.turn || T.hill || T.kicker || T.landing || T.loop || T.bank || pl.type === 'BU';
  const N = curved ? Math.max(8, Math.ceil(L / (T.loop ? .8 : 1.2))) : 8;
  const zb = Math.min(...T.cells.map(c => cellWorld(pl, c)[2])) * LEVEL;
  // frames along the path
  const F = []; for (let i = 0; i <= N; i++) { const s = L * i / N, f = frameAt(pl, s); f.s = s; F.push(f); }
  const surfAt = s => T.boost && s >= T.boost[0] - .01 && s <= T.boost[1] + .01 ? 'boost' : T.surface;
  const pt = (f, q) => {
    const p = add(add(f.p, f.r, q.o), f.u, q.h + LIFT);
    if (q.g) p[2] = zb - .02;
    return p;
  };
  // the road splits where the boost pad starts and ends (its own collider and material)
  const cuts = T.boost ? [0, T.boost[0], T.boost[1], L] : [0, L];
  for (const sg of sec.segs) {
    const a = sec.P[sg.a], b = sec.P[sg.b], name = sg.part === 'road' ? (T.surface === 'dirt' ? 'dirt' : T.surface === 'ice' ? 'ice' : 'road') : sg.part;
    for (let ci = 0; ci < cuts.length - 1; ci++) {
      const s0 = cuts[ci], s1 = cuts[ci + 1];
      const fr = [];
      for (const f of F) if (f.s > s0 + 1e-6 && f.s < s1 - 1e-6) fr.push(f);
      const f0 = frameAt(pl, s0), f1 = frameAt(pl, s1); f0.s = s0; f1.s = s1; fr.unshift(f0); fr.push(f1);
      const surf = sg.surf === 'ROAD' ? surfAt((s0 + s1) / 2) : sg.surf;
      const pn = sg.part === 'road' && surf === 'boost' ? 'boost' : name, P0 = part(pn), C = surf ? new Coll(surf) : null;
      const base = P0.n, cb = C ? C.n : 0, wlen = Math.hypot(b.o - a.o, b.h - a.h);
      for (const f of fr) {
        const A = pt(f, a), B = pt(f, b);
        P0.pos.push(A[0], A[2], A[1], B[0], B[2], B[1]);
        const v = f.s / (pn === 'curb' ? 2 : pn === 'rail' || pn === 'side' || pn === 'under' ? 4 : 8);
        if (sg.part === 'road') P0.uv.push((a.o + S.hw) / (2 * S.hw), v, (b.o + S.hw) / (2 * S.hw), v);
        else if (pn === 'curb') P0.uv.push(0, v, 1, v);
        else P0.uv.push(0, v, wlen / 2, v);
        if (C) C.pos.push(A[0], A[1], A[2], B[0], B[1], B[2]);
      }
      for (let i = 0; i < fr.length - 1; i++) {
        const A = base + i * 2, B = A + 1, D = A + 2, Cc = A + 3;
        P0.idx.push(A, B, D, B, Cc, D);   // three's winding (the reflection of Rapier's)
        if (C) { const a2 = cb + i * 2, b2 = a2 + 1, d2 = a2 + 2, c2 = a2 + 3; C.idx.push(a2, d2, b2, b2, d2, c2); }
      }
      if (C) out.coll.push(C);
    }
  }
  // supports under the block where it stands above the plate: pillars every 16 m along both edges
  if (zb > 0 || (pl.L > 0)) {
    const step = 16, n = Math.max(1, Math.round(L / step));
    for (let i = 0; i <= n; i++) {
      const f = frameAt(pl, Math.min(L - .5, Math.max(.5, L * i / n)));
      if (f.u[2] < .5) continue;   // (no pillar under a loop's upper half)
      for (const side of [-1, 1]) {
        const q = add(f.p, f.r, side * (S.hw + S.curb * .5)), top = (T.hill || T.kicker || T.landing) ? zb : q[2] + LIFT - S.th;
        if (top < 1.5) continue;
        const cx = Math.floor((q[0] - GX) / CELL), cy = Math.floor((q[1] - GY) / CELL);
        if (track && lowerRoadAt(track, cx, cy, top, pl)) continue;   // supports never stand in a lane below
        out.pillars.push([q[0], q[1], top, env === 'dustbowl' ? 1.4 : 1.6]);
      }
    }
  }
  return out;
}
function lowerRoadAt(track, cx, cy, top, self) {
  for (let l = 0; l < Math.floor(top / LEVEL) + 1; l++) { const b = track.at(cx, cy, l); if (b && b !== self && !TYPES[b.type].gap && b.L * LEVEL < top - 1) return true; }
  return false;
}
function crossing(pl, env, out, part) {
  const S = SECTION[env], c = cellWorld(pl, [0, 0, 0]), x0 = GX + c[0] * CELL, y0 = GY + c[1] * CELL, z = pl.L * LEVEL + LIFT;
  const P = part('road'), C = new Coll('road'), b = P.n;
  // a square deck, its road texture across x; corner curbs are the plain road's edge
  const q = [[x0, y0], [x0 + CELL, y0], [x0 + CELL, y0 + CELL], [x0, y0 + CELL]];
  for (const [x, y] of q) { P.pos.push(x, z, y); P.uv.push((x - x0) / CELL, (y - y0) / 8); C.pos.push(x, y, z); }
  P.idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  C.idx.push(0, 1, 2, 0, 2, 3);
  out.coll.push(C);
  if (pl.L > 0) for (const [x, y] of [[x0 + 2, y0 + 2], [x0 + CELL - 2, y0 + 2], [x0 + 2, y0 + CELL - 2], [x0 + CELL - 2, y0 + CELL - 2]]) out.pillars.push([x, y, z - S.th, 1.6]);
  return out;
}

/** the base plate (every grid cell but the chasms), chasm walls, water, the boundary: { parts, coll } */
export function plateGeometry(track, env, o = {}) {
  const out = { parts: {}, coll: [] }, part = n => out.parts[n] || (out.parts[n] = new Part());
  const P = part('plate'), C = new Coll(o.off || 'sand');
  const chasm = (x, y) => track.chasms.get(x + ',' + y);
  // runs of plate cells per row (fewer triangles)
  for (let y = 0; y < GRID; y++) {
    let x = 0;
    while (x < GRID) {
      if (chasm(x, y)) { x++; continue; }
      let x1 = x; while (x1 + 1 < GRID && !chasm(x1 + 1, y)) x1++;
      const ax = GX + x * CELL, bx = GX + (x1 + 1) * CELL, ay = GY + y * CELL, by = ay + CELL, b = P.n, cb = C.n;
      for (const [px, py] of [[ax, ay], [bx, ay], [bx, by], [ax, by]]) { P.pos.push(px, 0, py); P.uv.push((px - GX) / 8, (py - GY) / 8); C.pos.push(px, py, 0); }
      P.idx.push(b, b + 2, b + 1, b, b + 3, b + 2); C.idx.push(cb, cb + 1, cb + 2, cb, cb + 2, cb + 3);
      x = x1 + 1;
    }
  }
  out.coll.push(C);
  // chasm walls: a cliff of rock (a canyon, 60 m) or a bank down to the water (2.5 m)
  const W = part('rock'), WB = part('bank'), WA = part('water'), WC = new Coll('wall');
  for (const [k, kind] of track.chasms) {
    const [x, y] = k.split(',').map(Number), deep = kind === 'water' ? 2.6 : 60, M = kind === 'water' ? WB : W;
    const x0 = GX + x * CELL, y0 = GY + y * CELL, x1 = x0 + CELL, y1 = y0 + CELL;
    const edges = [[0, -1, [x0, y0], [x1, y0]], [1, 0, [x1, y0], [x1, y1]], [0, 1, [x1, y1], [x0, y1]], [-1, 0, [x0, y1], [x0, y0]]];
    for (const [dx, dy, a, b] of edges) {
      const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < GRID && ny < GRID && chasm(nx, ny)) continue;
      const s = M.n; M.pos.push(a[0], 0, a[1], b[0], 0, b[1], b[0], -deep, b[1], a[0], -deep, a[1]);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) / 8; M.uv.push(0, 0, L, 0, L, deep / 8, 0, deep / 8);
      M.idx.push(s, s + 2, s + 1, s, s + 3, s + 2);   // facing into the chasm
      const c = WC.n; WC.pos.push(a[0], a[1], 0, b[0], b[1], 0, b[0], b[1], -deep, a[0], a[1], -deep); WC.idx.push(c, c + 1, c + 2, c, c + 2, c + 3);
    }
    if (kind === 'water') {
      const s = WA.n; for (const [px, py] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) { WA.pos.push(px, -1.7, py); WA.uv.push((px - GX) / 16, (py - GY) / 16); }
      WA.idx.push(s, s + 2, s + 1, s, s + 3, s + 2);
      const f = WB.n; for (const [px, py] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) { WB.pos.push(px, -2.6, py); WB.uv.push((px - GX) / 8, (py - GY) / 8); }
      WB.idx.push(f, f + 2, f + 1, f, f + 3, f + 2);
    }
  }
  if (WC.n) out.coll.push(WC);
  // the boundary: a low wall all round the grid
  const B = part('boundary'), BC = new Coll('wall'), G = GRID * CELL, h = 2, t = .8;
  const box = (x0, y0, x1, y1) => {
    const s = B.n, c = BC.n, v = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    for (const [x, y] of v) B.pos.push(x, 0, y); for (const [x, y] of v) B.pos.push(x, h, y);
    const L = Math.max(x1 - x0, y1 - y0) / 4; B.uv.push(0, 0, L, 0, L, 0, 0, 0, 0, .5, L, .5, L, .5, 0, .5);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; B.idx.push(s + i, s + 4 + i, s + j, s + j, s + 4 + i, s + 4 + j); }
    B.idx.push(s + 4, s + 7, s + 5, s + 5, s + 7, s + 6);
    for (const [x, y] of v) BC.pos.push(x, y, 0); for (const [x, y] of v) BC.pos.push(x, y, h);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; BC.idx.push(c + i, c + j, c + 4 + i, c + j, c + 4 + j, c + 4 + i); }
  };
  box(GX - t, GY - t, GX + G + t, GY); box(GX - t, GY + G, GX + G + t, GY + G + t); box(GX - t, GY, GX, GY + G); box(GX + G, GY, GX + G + t, GY + G);
  out.coll.push(BC);
  return out;
}
/** box pillars into a part: [x, y, top, w] down to the plate */
export function pillarGeometry(pillars, part) {
  for (const [x, y, top, w] of pillars) {
    const s = part.n, h = w / 2, v = [[x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h]];
    for (const [px, py] of v) part.pos.push(px, 0, py); for (const [px, py] of v) part.pos.push(px, top, py);
    for (let i = 0; i < 4; i++) part.uv.push(0, 0); for (let i = 0; i < 4; i++) part.uv.push(0, top / 4);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; part.idx.push(s + i, s + 4 + i, s + j, s + j, s + 4 + i, s + 4 + j); }
    // (uv: around the pillar)
    for (let i = 0; i < 4; i++) { part.uv[(s + i) * 2] = i * w / 4; part.uv[(s + 4 + i) * 2] = i * w / 4; }
  }
}
export { Part };
