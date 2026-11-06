// Builds the circuit from the sim's track record: road bands, kerbs, lines, skirts, barriers, pit lane, boards.
import { THREE, toonMaterial, PALETTE, mergeStaticMeshes } from '../../pixel-engine.js';
import { PIT_WIDTH } from '../sim/race.js';
const { Color, BufferGeometry, Float32BufferAttribute, Mesh, BoxGeometry, PlaneGeometry } = THREE;
const P = PALETTE;
export const LOOKS = {
  kestrel: { road: 0x4c4f5e, road2: 0x565968, ground: [P.green, 0x2f8f50, 0x3f9a4a], plane: 0x2f8050, far: [0x2b6f5a, 0x3a8a60], barrier: ['white', 'mist'], hills: 26 },
  cedar: { road: 0x45485a, road2: 0x4e5163, ground: [0x256d5b, 0x1f5f58, 0x2f7a55], plane: 0x1f5a55, far: [0x29366f, 0x24507a], barrier: ['slate', 'mist'], hills: 40 },
  harbour: { road: 0x333c57, road2: 0x3b4460, ground: [0x46506e, 0x3c4660, 0x505a78], plane: 0x24305a, far: [0x1a1c2c, 0x29366f], barrier: ['slate', 'red'], hills: 0 },
  saltline: { road: 0x566c86, road2: 0x60768f, ground: [0xf4f4f4, 0xe4e6ee, 0xd8dcea], plane: 0xeeeef2, far: [0xb13e53, 0xef7d57], barrier: ['white', 'red'], hills: 0 },
  redclay: { road: 0xcf7a48, road2: 0xd98552, ground: [0xb85a3e, 0xc96a44, 0xa84f3c], plane: 0xa84f3c, far: [0x8b3f46, 0xb13e53], barrier: ['orange', 'sand'], hills: 34, canyon: true },
  proving: { road: 0x5a5d70, road2: 0x646779, ground: [0x8a9a6a, 0x7a9060, 0x98a678], plane: 0x7f9163, far: [0x4d8a78, 0x41a6f6], barrier: ['white', 'orange'], hills: 6 },
};
let seedV = 12345;
const rnd = () => { seedV = (seedV * 16807) % 2147483647; return seedV / 2147483647; };
const col = new Color();
function vertexMesh(pos, colr, opts = {}) {
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('color', new Float32BufferAttribute(colr, 3)); g.computeVertexNormals();
  const m = new Mesh(g, toonMaterial(0xffffff, { vertexColors: true })); m.receiveShadow = opts.receive !== false; m.castShadow = !!opts.cast; return m;
}
/** from(h) and to(h) give the two edges of the band as t offsets, for half-width h. Quads share no vertices. */
export function band(tr, from, to, lift, colourAt, sink = null) {
  const pos = [], colr = [], up = from(1) < to(1);
  const Q = (i, f) => { const k = i % tr.N, t = f(tr.width[k] / 2, k); return [tr.x[k] - tr.tz[k] * t, tr.y[k] + lift - t * Math.sin(tr.bank[k]), tr.z[k] + tr.tx[k] * t]; };
  for (let i = 0; i < tr.N; i++) {
    const c = colourAt(i); if (c === null) continue;
    const a = Q(i, from), b = Q(i, to), d = Q(i + 1, from), e = Q(i + 1, to);
    col.set(c);
    for (const v of up ? [a, b, d, b, e, d] : [a, d, b, b, d, e]) { pos.push(...v); colr.push(col.r, col.g, col.b); }
  }
  return vertexMesh(pos, colr);
}
export const pointAt = (tr, s, t = 0) => { const L = tr.length, i = Math.round((((s % L) + L) % L) / tr.ds) % tr.N; return { i, x: tr.x[i] - tr.tz[i] * t, z: tr.z[i] + tr.tx[i] * t, y: tr.y[i] - t * Math.sin(tr.bank[i]), yaw: Math.atan2(tr.tx[i], tr.tz[i]) }; };
/** A coarse grid over the track, for "is anything else of the circuit close to here". */
export function trackGrid(tr, cell = 24) {
  const m = new Map(), key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < tr.N; i++) { const k = key(tr.x[i], tr.z[i]); (m.get(k) ?? m.set(k, []).get(k)).push(i); }
  return { near(x, z, r, skipI = -1, skipSpan = 0) {
    const cr = Math.ceil(r / cell), cx = Math.floor(x / cell), cz = Math.floor(z / cell); let best = Infinity;
    for (let a = -cr; a <= cr; a++) for (let b = -cr; b <= cr; b++) for (const i of m.get(`${cx + a},${cz + b}`) ?? []) {
      if (skipI >= 0) { let d = Math.abs(i - skipI); d = Math.min(d, tr.N - d); if (d < skipSpan) continue; }
      const dd = Math.hypot(tr.x[i] - x, tr.z[i] - z) - tr.width[i] / 2; if (dd < best) best = dd;
    }
    return best;
  } };
}
export function buildTrackMeshes(T, lookId, opts = {}) {
  const tr = T.tr, look = LOOKS[lookId], out = [], dirt = tr.surface === 'dirt', pools = opts.pools ?? null;
  const lit = (hex, i) => { if (!pools) return hex; const b = pools[i] ?? 0; if (!b) return hex; col.set(hex); const c2 = new Color(0xffcd75); col.lerp(c2, b * 0.4); return col.getHex(); };
  const speeds = opts.speeds, rub = new Color();
  // road, alternating 8 m bands; darker rubber where the profile falls
  out.push(band(tr, (h) => -h, (h) => h, 0, (i) => { let c = i % 4 < 2 ? look.road : look.road2; if (speeds && !dirt && speeds[(i + 1) % tr.N] < speeds[i] - 0.05) { rub.set(c).multiplyScalar(0.86); c = rub.getHex(); } return lit(c, i); }));
  // kerbs on the inside of corners, red and white every 4 m
  const hard = (i, s) => Math.abs(tr.kappa[i]) > 0.006 && Math.sign(tr.kappa[i]) === s;
  const kerbNear = (i, s) => { for (let k = -2; k <= 2; k++) if (hard((i + k + tr.N) % tr.N, s)) return true; return false; };
  if (!dirt) for (const s of [-1, 1]) {
    out.push(band(tr, (h) => s * h, (h) => s * (h + 1.6), 0.02, (i) => (kerbNear(i, s) ? (i % 2 ? P.red : P.white) : (T.pit && s === 1 && inPit(T, i) ? 0x565968 : look.road2))));
    out.push(band(tr, (h) => s * (h - 0.5), (h) => s * (h - 0.25), 0.03, () => 0xf4f4f4));
  }
  // centre dashes on the straight
  if (!dirt) out.push(band(tr, () => -0.12, () => 0.12, 0.03, (i) => { const d = Math.min(i, tr.N - i) * tr.ds; return d < 200 && i % 4 < 2 ? 0xf4f4f4 : null; }));
  // start line, chequered, and a grid
  const pos = [], colr = [], sq = (x0, z0, x1, z1, y, c) => { col.set(c); for (const v of [[x0, y, z0], [x1, y, z0], [x0, y, z1], [x1, y, z0], [x1, y, z1], [x0, y, z1]]) { pos.push(...v); colr.push(col.r, col.g, col.b); } };
  const quadAt = (s0, s1, t0, t1, c, lift = 0.05) => { const a = pointAt(tr, s0, t0), b = pointAt(tr, s0, t1), d = pointAt(tr, s1, t0), e = pointAt(tr, s1, t1); col.set(c); const up = t0 < t1; for (const v of up ? [a, b, d, b, e, d] : [a, d, b, b, d, e]) { pos.push(v.x, v.y + lift, v.z); colr.push(col.r, col.g, col.b); } };
  const hw0 = tr.width[0] / 2;
  for (let r = 0; r < 2; r++) for (let k = 0; k < Math.ceil(hw0); k++) for (const sgn of [-1, 1]) { const t0 = sgn * k, t1 = sgn * (k + 1); quadAt(-1 + r, r, Math.min(t0, t1), Math.max(t0, t1), (k + r) % 2 ? P.white : P.ink); }
  for (let g = 0; g < 8; g++) { const s = -12 - 8 * g, t = g % 2 ? 2.6 : -2.6; quadAt(s, s + 0.5, t - 1.2, t + 1.2, 0xf4f4f4); }
  // pit lane apron
  if (T.pit) {
    out.push(band(tr, (h) => h + 1.6, (h) => h + PIT_WIDTH + 2, 0.01, (i) => (inPit(T, i) ? 0x6b7490 : null)));
    const L = tr.length, ent = T.pit.inS;
    quadAt(ent, ent + 4, hw0 - 0.6, hw0 + PIT_WIDTH, 0xffcd75, 0.06);
    for (let k = 0; k < 8; k++) quadAt(ent + 12 + k * 10, ent + 16 + k * 10, hw0 - 0.8, hw0 - 0.4, 0xffcd75, 0.06);
    for (let k = 0; k < 8; k++) { const s = ent + T.pit.boxD + (k - 3.5) * 14; quadAt(s - 3, s + 3, hw0 + 2, hw0 + 2 + 0.2, 0xf4f4f4, 0.06); quadAt(s - 3, s - 2.8, hw0 + 2, hw0 + PIT_WIDTH - 1, 0xf4f4f4, 0.06); }
    void L;
  }
  out.push(vertexMesh(pos, colr));
  // skirts
  out.push(...buildSkirts(T, look));
  // barriers
  out.push(...buildBarriers(T, look));
  // braking boards at 300, 200, 100 before major corners
  const boards = [];
  tr.def.corners.forEach((c, n) => {
    if (c[2] > 45) return;
    for (const d of [300, 200, 100]) {
      const s = tr.cornerS[n] - d - 30, side = -Math.sign(tr.kappa[Math.round(tr.cornerS[n] / tr.ds) % tr.N] || 1), hw = tr.width[Math.round(((s + tr.length) % tr.length) / tr.ds) % tr.N] / 2, q = pointAt(tr, s, side * (hw + Math.min(2.4, (side > 0 ? tr.wallR : tr.wallL)[Math.round(((s + tr.length) % tr.length) / tr.ds) % tr.N] * 0.6)));
      if (Math.abs(tr.kappa[q.i]) > 0.01) continue;
      const m = new Mesh(new BoxGeometry(1.0, 1.0, 0.1), toonMaterial(d === 100 ? P.red : P.white)); m.position.set(q.x, q.y + 1.2, q.z); m.rotation.y = q.yaw; m.castShadow = true; boards.push(m);
      const stripes = d / 100; for (let k = 0; k < stripes; k++) { const b = new Mesh(new BoxGeometry(0.8, 0.14, 0.12), toonMaterial(d === 100 ? P.white : P.ink)); b.position.set(q.x, q.y + 0.95 + k * 0.26, q.z); b.rotation.y = q.yaw; boards.push(b); }
      const post = new Mesh(new BoxGeometry(0.16, 0.8, 0.16), toonMaterial(P.slate)); post.position.set(q.x, q.y + 0.4, q.z); boards.push(post);
    }
  });
  if (boards.length) out.push(...mergeStaticMeshes(boards));
  // the plane under it all
  const low = Math.min(...tr.y) - 3, plane = new Mesh(new PlaneGeometry(12000, 12000).rotateX(-Math.PI / 2), toonMaterial(look.plane)); plane.position.set(0, low, 0); plane.receiveShadow = true; out.push(plane);
  return out;
}
export const inPit = (T, i) => { if (!T.pit) return false; const d = (i * T.tr.ds - T.pit.inS + T.tr.length) % T.tr.length; return d < T.pit.span; };
function hillNoise(x, z) { return Math.sin(x * 0.013 + z * 0.007) * 0.5 + Math.sin(x * 0.031 - z * 0.019) * 0.3 + Math.sin(x * 0.067 + z * 0.043) * 0.2; }
/** Height of the ground next to the road, used by skirts and dressing alike. */
export function groundHeight(T, lookId, i, side, d) {
  const tr = T.tr, look = LOOKS[lookId];
  const yRoad = tr.y[i], base = tr.yMin ?? (tr.yMin = Math.min(...tr.y)) - 3, x = tr.x[i] - tr.tz[i] * side * d, z = tr.z[i] + tr.tx[i] * side * d;
  const f = Math.min(1, Math.max(0, (d - 2) / 70)), ease = f * f * (3 - 2 * f), hill = look.hills * Math.max(0, hillNoise(x, z)) * ease;
  if (look.canyon) return yRoad + (d > 14 ? (d - 14) * 0.55 * (0.8 + 0.4 * Math.sin(i * 0.05)) : 0) + hill * 0.25;
  // start from the height of the banked road's edge, then ease down to the land
  const edgeY = yRoad - side * (tr.width[i] / 2 + Math.min(d, 14)) * Math.sin(tr.bank[i]);
  return edgeY * (1 - ease) + (base + hill) * ease;
}
function buildSkirts(T, look) {
  const tr = T.tr, lookId = T.id === 'redclay' ? 'redclay' : T.id;
  const grid = trackGrid(tr), cols = [0, 2.2, 6, 14, 30, 60, 110], pos = [], colr = [], reach = [new Float64Array(tr.N), new Float64Array(tr.N)];
  [-1, 1].forEach((s, si) => {
    for (let i = 0; i < tr.N; i++) {
      const hw = tr.width[i] / 2; let lim = 120; const k = tr.kappa[i];
      if (Math.sign(k) === s && Math.abs(k) > 1e-4) lim = Math.min(lim, 0.82 / Math.abs(k) - hw);
      for (let d = 20; d <= 120; d += 20) { const x = tr.x[i] - tr.tz[i] * s * (hw + d), z = tr.z[i] + tr.tx[i] * s * (hw + d); const n = grid.near(x, z, 30, i, 25); if (n < 22) { lim = Math.min(lim, Math.max(4, d * 0.5)); break; } }
      reach[si][i] = Math.max(3, lim);
    }
    // smooth the reach so skirts have no spikes
    for (let pass = 0; pass < 3; pass++) { const a = reach[si], b = new Float64Array(tr.N); for (let i = 0; i < tr.N; i++) b[i] = Math.min(a[i], (a[(i - 1 + tr.N) % tr.N] + a[i] + a[(i + 1) % tr.N]) / 3); reach[si] = b; }
    const R = reach[si];
    for (let i = 0; i < tr.N; i++) {
      const q = (i + 1) % tr.N, h0 = tr.width[i] / 2, h1 = tr.width[q] / 2;
      for (let c = 0; c < cols.length - 1; c++) {
        const d0 = cols[c], d1 = cols[c + 1], a0 = Math.min(d0, R[i]), b0 = Math.min(d1, R[i]), a1 = Math.min(d0, R[q]), b1 = Math.min(d1, R[q]);
        if (b0 - a0 < 0.01 && b1 - a1 < 0.01) continue;
        const v = (j, h, d) => [tr.x[j] - tr.tz[j] * s * (h + d + 1.6), groundHeight(T, lookId, j, s, d + 1.6) - 0.02 - (h + 1.6) * s * Math.sin(tr.bank[j]) * 0, tr.z[j] + tr.tx[j] * s * (h + d + 1.6)];
        const A = v(i, h0, a0), B = v(i, h0, b0), C = v(q, h1, a1), D = v(q, h1, b1), n = Math.floor(i / 8 + c * 3 + (Math.sin(i * 0.37 + c) > 0.3 ? 1 : 0));
        col.set(look.ground[((n % 3) + 3) % 3]);
        for (const p of s > 0 ? [A, B, C, B, D, C] : [A, C, B, B, C, D]) { pos.push(...p); colr.push(col.r, col.g, col.b); }
      }
    }
  });
  T.grid = grid; T.reach = reach;
  return [vertexMesh(pos, colr)];
}
const BARRIER_C = { white: 0xf4f4f4, mist: 0x94b0c2, slate: 0x566c86, red: 0xb13e53, orange: 0xef7d57, sand: 0xffcd75 };
function buildBarriers(T, look) {
  const tr = T.tr, pos = [], colr = [], H = T.id === 'harbour' ? 1.2 : 0.9;
  [-1, 1].forEach((s) => {
    const walls = s > 0 ? tr.wallR : tr.wallL;
    for (let i = 0; i < tr.N; i++) {
      const q = (i + 1) % tr.N, a = tr.width[i] / 2 + walls[i], b = tr.width[q] / 2 + walls[q];
      if (Math.abs(a - b) > 3) continue; // the pit opening
      const yb = (j, t) => Math.max(tr.y[j] - s * t * Math.sin(tr.bank[j]) - 0.2, groundHeight(T, T.id, j, s, t - tr.width[j] / 2) - 0.2);
      const A = [tr.x[i] - tr.tz[i] * s * a, yb(i, a), tr.z[i] + tr.tx[i] * s * a], B = [tr.x[q] - tr.tz[q] * s * b, yb(q, b), tr.z[q] + tr.tx[q] * s * b], C = [A[0], A[1] + H, A[2]], D = [B[0], B[1] + H, B[2]];
      const corner = Math.abs(tr.kappa[i]) > 0.012, cn = corner ? (i % 2 ? BARRIER_C.red : BARRIER_C.white) : (i % 6 < 3 ? BARRIER_C[look.barrier[0]] : BARRIER_C[look.barrier[1]]);
      col.set(cn);
      for (const p of s > 0 ? [A, C, B, B, C, D, A, B, C, B, D, C] : [A, B, C, B, D, C, A, C, B, B, C, D]) { pos.push(...p); colr.push(col.r, col.g, col.b); }
    }
  });
  const m = vertexMesh(pos, colr, { cast: true }); return [m];
}
/** The racing line as a dashed ribbon, red where the profile says brake. */
export function drivingLineMesh(T, speeds) {
  const tr = T.tr, line = T.line, pos = [], colr = [];
  for (let i = 0; i < tr.N; i += 1) {
    if (i % 3 === 2) continue; const q = (i + 1) % tr.N, w = 0.35, rx0 = -tr.tz[i], rz0 = tr.tx[i], rx1 = -tr.tz[q], rz1 = tr.tx[q];
    const y0 = tr.y[i] - line.off[i] * Math.sin(tr.bank[i]) + 0.08, y1 = tr.y[q] - line.off[q] * Math.sin(tr.bank[q]) + 0.08;
    const a = [line.px[i] - rx0 * w, y0, line.pz[i] - rz0 * w], b = [line.px[i] + rx0 * w, y0, line.pz[i] + rz0 * w], d = [line.px[q] - rx1 * w, y1, line.pz[q] - rz1 * w], e = [line.px[q] + rx1 * w, y1, line.pz[q] + rz1 * w];
    const braking = speeds[(i + 3) % tr.N] < speeds[i] - 0.1; col.set(braking ? P.red : P.lime);
    for (const v of [a, b, d, b, e, d]) { pos.push(...v); colr.push(col.r, col.g, col.b); }
  }
  const m = vertexMesh(pos, colr, { receive: false }); return m;
}
export { vertexMesh };
