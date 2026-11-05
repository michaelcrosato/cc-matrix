// The mesher: each block's path swept with the environment's cross-section into render triangles (per material, with
// UVs) and collision triangles (per surface). Collision triangles are wound so (b - a) x (c - a) points along the road's
// up in world axes (x east, y south, z up); the view reverses them for three.js. Pure numbers: runs headless.
import { BLOCKS, CELL, LEVEL } from './blocks.js';
import { toWorld, ORIGIN, GRID } from './track.js';
import { localFrame } from './blocks.js';
import { add, scale } from './v3.js';

export const ENV_GEO = {
  dustbowl: { roadW: 14, curb: 1, rail: .9, plate: 'sand', roadMat: 'asphalt' },
  hedgerow: { roadW: 12, curb: .8, rail: .8, plate: 'grass', roadMat: 'tarmac' },
  frostpeak: { roadW: 12, curb: .8, rail: 1.2, plate: 'snow', roadMat: 'snowroad' }
};

class Mesh {   // positions (world metres), uvs, indices
  constructor() { this.pos = []; this.uv = []; this.idx = []; }
  quad(a, b, c, d, ua, ub, uc, ud) {   // a-b along one edge (s), c-d the next: a(i,left) b(i,right) c(i+1,left) d(i+1,right)
    const n = this.pos.length / 3; this.pos.push(...a, ...b, ...c, ...d); this.uv.push(...ua, ...ub, ...uc, ...ud);
    this.idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
  }
}
class Col {   // collision triangles
  constructor() { this.pos = []; this.idx = []; }
  quad(a, b, c, d) { const n = this.pos.length / 3; this.pos.push(...a, ...b, ...c, ...d); this.idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
}

/** samples along a block's path: world frames at s = 0 .. len */
export function sampleBlock(b) {
  const B = BLOCKS[b.type], P = B.path, n = B.cross || /^(S|DS|IS|ST|FN|CP|BO)$/.test(b.type) ? 4 : Math.max(4, Math.ceil(P.len / 1.2));
  const out = [], ss = B.boost ? [0, B.boost[0], 16, B.boost[1], P.len] : Array.from({ length: n + 1 }, (_, i) => P.len * i / n);
  for (const s of ss) { const f = toWorld(localFrame(B, s), b.rot, b.cx, b.cy, b.L); f.s = s; out.push(f); }
  return out;
}
const at = (f, lat, h) => [f.p[0] + f.r[0] * lat + f.u[0] * h, f.p[1] + f.r[1] * lat + f.u[1] * h, f.p[2] + f.r[2] * lat + f.u[2] * h];

/** build a block: { render: { mat: Mesh }, collide: { surface: Col }, supports: [[x, y, ztop]] } */
export function buildBlock(b, env, out) {
  const B = BLOCKS[b.type]; if (!B.path) return;
  const G = ENV_GEO[env], hw = G.roadW / 2, cw = G.curb, S = sampleBlock(b);
  const R = out.render, C = out.collide;
  const mat = name => R[name] || (R[name] = new Mesh()), col = name => C[name] || (C[name] = new Col());
  const surf = B.surface === 'road' ? 'road' : B.surface;
  const roadMat = B.surface === 'road' ? G.roadMat : B.surface;
  const elevated = b.L > 0 || /^[UD][12]$/.test(b.type) || /^B[LR]2$/.test(b.type);
  let railL = false, railR = false, lips = B.rails === 'lips';
  if (B.rails === 'auto') {
    if (elevated) railL = railR = true;
    else if (B.path.side || /[LR][123]$/.test(b.type)) { const side = /R\d$/.test(b.type) ? 1 : -1; if (side > 0) railL = true; else railR = true; }   // the outer edge of a turn
  }
  const flat = B.cross;
  const w = flat ? CELL / 2 : hw;
  for (let i = 0; i < S.length - 1; i++) {
    const f0 = S[i], f1 = S[i + 1], v0 = f0.s / 8, v1 = f1.s / 8;
    const boost = B.boost && f0.s >= B.boost[0] - .01 && f1.s <= B.boost[1] + .01;
    // road
    const L0 = at(f0, -w, 0), R0 = at(f0, w, 0), L1 = at(f1, -w, 0), R1 = at(f1, w, 0);
    mat(flat ? roadMat + 'X' : roadMat).quad(L0, R0, L1, R1, [0, v0], [1, v0], [0, v1], [1, v1]);
    col(boost ? 'boost' : surf).quad(L0, R0, L1, R1);
    if (flat) continue;
    // curbs (drivable, a little raised)
    for (const sd of [-1, 1]) {
      const a0 = at(f0, sd * w, 0), a1 = at(f1, sd * w, 0), b0 = at(f0, sd * (w + cw), .15), b1 = at(f1, sd * (w + cw), .15);
      const m = mat('curb'), cv0 = f0.s / 2, cv1 = f1.s / 2;
      if (sd < 0) { m.quad(b0, a0, b1, a1, [0, cv0], [1, cv0], [0, cv1], [1, cv1]); col(surf).quad(b0, a0, b1, a1); }
      else { m.quad(a0, b0, a1, b1, [0, cv0], [1, cv0], [0, cv1], [1, cv1]); col(surf).quad(a0, b0, a1, b1); }
    }
    // barriers: inner faces solid, outer and top for the picture
    const ew = w + cw;
    for (const [on, sd] of [[railL || lips, -1], [railR || lips, 1]]) {
      if (!on) continue;
      const h = lips ? .5 : G.rail, m = mat(lips ? 'lip' : 'rail');
      const a0 = at(f0, sd * ew, 0), a1 = at(f1, sd * ew, 0), t0 = at(f0, sd * ew, h), t1 = at(f1, sd * ew, h);
      const o0 = at(f0, sd * (ew + .3), 0), o1 = at(f1, sd * (ew + .3), 0), q0 = at(f0, sd * (ew + .3), h), q1 = at(f1, sd * (ew + .3), h);
      const rv0 = f0.s / 4, rv1 = f1.s / 4;
      // inner face: normal toward the road (wound so its normal points to -sd along r)
      if (sd < 0) { m.quad(t0, a0, t1, a1, [0, rv0], [1, rv0], [0, rv1], [1, rv1]); col('wall').quad(t0, a0, t1, a1); }
      else { m.quad(a0, t0, a1, t1, [1, rv0], [0, rv0], [1, rv1], [0, rv1]); col('wall').quad(a0, t0, a1, t1); }
      // top and outer face (render only)
      if (sd < 0) { m.quad(q0, t0, q1, t1, [0, rv0], [.2, rv0], [0, rv1], [.2, rv1]); m.quad(o0, q0, o1, q1, [0, rv0], [1, rv0], [0, rv1], [1, rv1]); }
      else { m.quad(t0, q0, t1, q1, [0, rv0], [.2, rv0], [0, rv1], [.2, rv1]); m.quad(q0, o0, q1, o1, [1, rv0], [0, rv0], [1, rv1], [0, rv1]); }
    }
    // underside and skirts of anything off the ground (render only)
    const ground = Math.min(f0.p[2], f1.p[2]) < .05 && f0.u[2] > .99 && b.L === 0;
    if (!ground) {
      const ow = ew + ((railL || railR || lips) ? .3 : 0), d = .7;
      const u0 = at(f0, -ow, -d), u1 = at(f1, -ow, -d), v0b = at(f0, ow, -d), v1b = at(f1, ow, -d);
      const m = mat('under');
      m.quad(v0b, u0, v1b, u1, [0, 0], [1, 0], [0, 1], [1, 1]);
      const sL0 = at(f0, -ow, 0), sL1 = at(f1, -ow, 0), sR0 = at(f0, ow, 0), sR1 = at(f1, ow, 0);
      m.quad(u0, sL0, u1, sL1, [0, 0], [0, 1], [1, 0], [1, 1]); m.quad(sR0, v0b, sR1, v1b, [0, 1], [0, 0], [1, 1], [1, 0]);
    }
  }
  // supports: pillars every 16 m under elevated, upright road
  if (!B.assist) {
    let next = 8;
    for (const f of S) if (f.s >= next) { next += 16; if (f.p[2] > 1.5 && f.u[2] > .8) for (const sd of [-1, 1]) { const q = at(f, sd * (hw - 1.5), -.7); out.supports.push([q[0], q[1], q[2]]); } }
  } else {
    // a loop stands on two legs each side of the circle
    const c = S[Math.floor(S.length / 2)];
    out.supports.push([c.p[0], c.p[1], 0, 'loop', c.p[2]]);
  }
  // gates
  if (B.gate !== null) { const g = toWorld(localFrame(B, B.gate), b.rot, b.cx, b.cy, b.L); out.gates.push({ b, kind: b.type, ...g, hw: hw + 1 }); }
  if (B.boost) { const g0 = toWorld(localFrame(B, B.boost[0]), b.rot, b.cx, b.cy, b.L); out.pads.push({ b, ...g0, len: B.boost[1] - B.boost[0], hw }); }
}

/** the whole track: blocks, the base plate (with holes for chasms), chasm walls and water, the boundary */
export function buildTrack(track) {
  const env = track.env, out = { render: {}, collide: {}, supports: [], gates: [], pads: [], blocks: {} };
  for (const b of track.blocks) {
    const one = { render: {}, collide: {}, supports: out.supports, gates: out.gates, pads: out.pads };
    buildBlock(b, env, one);
    out.blocks[b.id] = one;
  }
  const ch = track.chasms(), plate = new Mesh(), walls = new Mesh(), water = new Mesh();
  const O = ORIGIN, C = CELL;
  for (let cy = 0; cy < GRID; cy++) for (let cx = 0; cx < GRID; cx++) {
    const k = cx + ',' + cy, x0 = O + cx * C, y0 = O + cy * C, x1 = x0 + C, y1 = y0 + C;
    if (!ch[k]) { plate.quad([x0, y0, -.05], [x0, y1, -.05], [x1, y0, -.05], [x1, y1, -.05], [x0 / 8, y0 / 8], [x0 / 8, y1 / 8], [x1 / 8, y0 / 8], [x1 / 8, y1 / 8]); continue; }
    const depth = ch[k] === 'water' ? 2 : 60;
    if (ch[k] === 'water') water.quad([x0, y0, -2], [x0, y1, -2], [x1, y0, -2], [x1, y1, -2], [0, 0], [0, 4], [4, 0], [4, 4]);
    const nb = [[0, -1, [x0, y0], [x1, y0]], [1, 0, [x1, y0], [x1, y1]], [0, 1, [x1, y1], [x0, y1]], [-1, 0, [x0, y1], [x0, y0]]];
    for (const [dx, dy, a, bb] of nb) {
      const nk = (cx + dx) + ',' + (cy + dy); if (ch[nk]) continue;
      walls.quad([a[0], a[1], 0], [bb[0], bb[1], 0], [a[0], a[1], -depth], [bb[0], bb[1], -depth], [0, 0], [C / 8, 0], [0, depth / 8], [C / 8, depth / 8]);
    }
  }
  out.plate = plate; out.chasmWalls = walls; out.water = water; out.chasms = ch;
  return out;
}
