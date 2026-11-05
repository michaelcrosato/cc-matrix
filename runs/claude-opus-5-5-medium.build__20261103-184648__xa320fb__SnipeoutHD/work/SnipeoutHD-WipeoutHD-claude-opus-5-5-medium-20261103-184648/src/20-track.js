// Track: a closed centripetal Catmull-Rom ribbon resampled into 2 m slices, each with a banked frame, a width and a kind
// (deck, gap, drop); features in track space (s along, u across, h up); local Newton location; the racing line and the
// per-class speed profile that every AI, the autopilot, the attract mode and the test bots drive by
(() => {
const SN = globalThis.SN, V = SN.V;
const U = 16, DEG = Math.PI / 180;

function catmullClosed(P, k = 64) {
  const n = P.length, out = [], d = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const t0 = 0, t1 = Math.sqrt(d(p0, p1)), t2 = t1 + Math.sqrt(d(p1, p2)), t3 = t2 + Math.sqrt(d(p2, p3));
    for (let j = 0; j < k; j++) {
      const t = t1 + (t2 - t1) * j / k, q = [];
      for (let c = 0; c < 3; c++) {
        const A1 = (t1 - t) / (t1 - t0) * p0[c] + (t - t0) / (t1 - t0) * p1[c];
        const A2 = (t2 - t) / (t2 - t1) * p1[c] + (t - t1) / (t2 - t1) * p2[c];
        const A3 = (t3 - t) / (t3 - t2) * p2[c] + (t - t2) / (t3 - t2) * p3[c];
        const B1 = (t2 - t) / (t2 - t0) * A1 + (t - t0) / (t2 - t0) * A2;
        const B2 = (t3 - t) / (t3 - t1) * A2 + (t - t1) / (t3 - t1) * A3;
        q.push((t2 - t) / (t2 - t1) * B1 + (t - t1) / (t2 - t1) * B2);
      }
      out.push([q[0], q[1], q[2], i]);
    }
  }
  return out;
}
function resampleClosed(dense, ds) {
  const n = dense.length, acc = [0], knots = [];
  for (let i = 1; i <= n; i++) { const a = dense[i - 1], b = dense[i % n]; acc.push(acc[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
  for (let i = 0; i < n; i++) if (i === 0 || dense[i][3] !== dense[i - 1][3]) knots[dense[i][3]] = acc[i];
  const L = acc[n], m = Math.round(L / ds), step = L / m, pts = [];
  for (let k = 0, j = 0; k < m; k++) {
    const s = k * step; while (acc[j + 1] < s) j++;
    const a = dense[j], b = dense[(j + 1) % n], f = (s - acc[j]) / (acc[j + 1] - acc[j]);
    pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }
  return { L, ds: step, pts, knots };
}
SN.catmullClosed = catmullClosed; SN.resampleClosed = resampleClosed;

const KIND = { deck: 0, gap: 1, drop: 2 };
class Track {
  static build(def) { return new Track(def); }
  constructor(def) {
    this.def = def; this.id = def.id; this.name = def.name;
    const O = def.origin || [0, 0, 0];
    const P = def.points.map(p => [(p[0] + O[0]) * U, (p[1] + O[1]) * U, (p[2] + O[2]) * U]);
    const { L, ds, pts: raw, knots: rawKnots } = resampleClosed(catmullClosed(P, 64), 32);
    const n = raw.length, shift = Math.round(def.start * U / ds);
    this.L = L; this.ds = ds; this.n = n;
    const pts = raw.map((_, i) => raw[(i + shift) % n]);
    this.knots = rawKnots.map(k => SN.wrap(k - shift * ds, L));
    const at = f => SN.wrap(this.knots[f.cp] + (f.d || 0) * U, L);
    this.at = at;
    // per-slice arrays
    const C = this.C = new Float64Array(n * 3), F = this.F = new Float64Array(n * 3), R = this.R = new Float64Array(n * 3), Up = this.Up = new Float64Array(n * 3);
    const hw = this.hw = new Float64Array(n), kind = this.kind = new Uint8Array(n), kappa = this.kappa = new Float64Array(n), bank = this.bank = new Float64Array(n);
    const flags = this.flags = new Uint8Array(n);      // 1 tunnel, 2 pit, 4 open left, 8 open right
    const idx = s => ((Math.floor(s / ds) % n) + n) % n;
    this.idx = idx;
    const inRange = (s, a, b) => { s = SN.wrap(s, L); return a <= b ? s >= a && s <= b : s >= a || s <= b; };
    this.inRange = inRange;
    for (let i = 0; i < n; i++) { C[i * 3] = pts[i][0]; C[i * 3 + 1] = pts[i][1]; C[i * 3 + 2] = pts[i][2]; }
    // jumps: gap / drop ranges (the drop's lower deck at the far edge's height)
    this.jumps = (def.jumps || []).map(j => ({ kind: j.kind, name: j.name, a: this.knots[j.from], b: this.knots[j.to], minSpeed: j.minSpeed || 0 }));
    for (const j of this.jumps) {
      const fe = idx(j.b), lip = idx(j.a), z1 = C[fe * 3 + 2]; j.zLip = C[lip * 3 + 2]; j.z1 = z1; j.lipI = lip; j.farI = fe;
      for (let i = 0; i < n; i++) { const s = i * ds; if (inRange(s, j.a + ds * .5, j.b - ds * .5)) { kind[i] = KIND[j.kind]; if (j.kind === 'drop') C[i * 3 + 2] = z1; } }
    }
    // tangents and plan headings
    const head = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let a = (i - 1 + n) % n, b = (i + 1) % n;
      if (kind[b] !== kind[i]) b = i; if (kind[a] !== kind[i]) a = i;
      let fx = C[b * 3] - C[a * 3], fy = C[b * 3 + 1] - C[a * 3 + 1], fz = C[b * 3 + 2] - C[a * 3 + 2];
      if (kind[i]) fz = 0;
      const l = Math.hypot(fx, fy, fz) || 1; F[i * 3] = fx / l; F[i * 3 + 1] = fy / l; F[i * 3 + 2] = fz / l;
      head[i] = Math.atan2(fy, fx);
    }
    for (let i = 0; i < n; i++) {   // plan curvature over +-10 m: + = turning right (heading angle grows)
      const a = (i - 5 + n) % n, b = (i + 5) % n; let dh = head[b] - head[a]; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
      kappa[i] = dh / (10 * ds);
    }
    // widths per control point, interpolated
    const W = def.width, Wcp = def.widths || {}, ncp = def.points.length;
    for (let i = 0; i < n; i++) {
      const s = i * ds; let j = 0, best = -1;
      for (let c = 0; c < ncp; c++) { const d = SN.wrap(s - this.knots[c], L); if (best < 0 || d < best) { best = d; j = c; } }
      const j2 = (j + 1) % ncp, seg = SN.wrap(this.knots[j2] - this.knots[j], L) || 1, f = Math.min(1, best / seg);
      const w = (Wcp[j] || W) + ((Wcp[j2] || W) - (Wcp[j] || W)) * f; hw[i] = w * U / 2;
    }
    // bank: auto from the curvature (1600 / radius in metres, up to 28 deg), smoothed over +-40 m; manual runs override it
    const raw2 = new Float64Array(n);
    for (let i = 0; i < n; i++) { const k = kappa[i] * U, R_m = Math.abs(k) > 1e-6 ? 1 / Math.abs(k) : 1e9; raw2[i] = Math.sign(kappa[i]) * Math.min(28, 1600 / R_m) * DEG; }
    for (let i = 0; i < n; i++) { let sum = 0; for (let k = -20; k <= 20; k++) sum += raw2[(i + k + n) % n]; bank[i] = kind[i] ? 0 : sum / 41; }
    for (const bk of def.banks || []) {
      const a = this.knots[bk.from], b = this.knots[bk.to]; let sk = 0; for (let i = 0; i < n; i++) if (inRange(i * ds, a, b)) sk += kappa[i];
      const target = Math.sign(sk || 1) * bk.deg * DEG, blend = 60 * U;
      for (let i = 0; i < n; i++) {
        const s = i * ds; if (!inRange(s, SN.wrap(a - blend, L), SN.wrap(b + blend, L))) continue;
        const da = SN.wrapDiff(a, s, L), db = SN.wrapDiff(s, b, L), k = Math.min(1, Math.max(0, Math.min((da + blend) / blend, (db + blend) / blend)));
        bank[i] = bank[i] + (target - bank[i]) * k;
      }
    }
    for (let i = 0; i < n; i++) {
      const fr = SN.frame([F[i * 3], F[i * 3 + 1], F[i * 3 + 2]], [0, 0, 1], bank[i]);
      R[i * 3] = fr.R[0]; R[i * 3 + 1] = fr.R[1]; R[i * 3 + 2] = fr.R[2]; Up[i * 3] = fr.U[0]; Up[i * 3 + 1] = fr.U[1]; Up[i * 3 + 2] = fr.U[2];
    }
    // tunnels, pit, open edges
    this.tunnels = (def.tunnels || []).map(t => ({ a: at(t.a), b: at(t.b), style: t.style }));
    for (const t of this.tunnels) for (let i = 0; i < n; i++) if (inRange(i * ds, t.a, t.b)) flags[i] |= 1;
    const pit = def.pit; this.pit = pit ? { a: at(pit.a), b: at(pit.b), side: pit.side === 'left' ? -1 : 1, w: pit.w * U } : null;
    if (this.pit) for (let i = 0; i < n; i++) if (inRange(i * ds, this.pit.a, this.pit.b)) flags[i] |= 2;
    this.openEdges = (def.openEdges || []).map(o => ({ a: at(o.a), b: at(o.b), side: o.side === 'left' ? -1 : 1 }));
    for (const o of this.openEdges) for (let i = 0; i < n; i++) if (inRange(i * ds, o.a, o.b)) flags[i] |= o.side < 0 ? 4 : 8;
    // pads
    this.speedPads = (def.speedPads || []).map((p, k) => ({ id: 'sp' + k, kind: 'speed', s: at(p), u: (p.u || 0) * U, hl: 4 * U, hwid: 3 * U }));
    this.weaponPads = [];
    (def.weaponPads || []).forEach((p, k) => { const s = at(p), us = p.u !== undefined ? [p.u * U] : [-8 * U, 0, 8 * U]; us.forEach((u, m) => this.weaponPads.push({ id: 'wp' + k + '_' + m, kind: 'weapon', s, u, hl: 3 * U, hwid: 3 * U })); });
    this.pads = [...this.speedPads, ...this.weaponPads];
    this.sectors = Array.from({ length: 8 }, (_, k) => k * L / 8);
    this.grid = Array.from({ length: 8 }, (_, k) => { const row = Math.floor(k / 2), odd = k % 2; return { s: SN.wrap(-(10 + row * 16 + odd * 6) * U, L), u: (odd ? 4.5 : -4.5) * U }; });
    // 2D buckets (cell 32 m) of slice indices
    const cell = this.cell = 32 * U; this.buckets = new Map();
    for (let i = 0; i < n; i++) { const kx = Math.floor(C[i * 3] / cell), ky = Math.floor(C[i * 3 + 1] / cell), key = kx * 65536 + ky; let b = this.buckets.get(key); if (!b) this.buckets.set(key, b = []); b.push(i); }
    this.overpasses = this._overpasses();
    this._lineAndProfiles();
    this.minimap = []; for (let i = 0; i < n; i += 10) this.minimap.push([C[i * 3], C[i * 3 + 1], C[i * 3 + 2]]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of this.minimap) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    this.bounds = [x0, y0, x1, y1];
    this.validate();
  }
  _overpasses() {
    const n = this.n, C = this.C, out = [], seen = new Set();
    for (let i = 0; i < n; i += 2) {
      const near = this.near(C[i * 3], C[i * 3 + 1], 30 * U);
      for (const j of near) {
        if (Math.abs(SN.wrapDiff(i * this.ds, j * this.ds, this.L)) < 200 * U) continue;
        const d = Math.hypot(C[i * 3] - C[j * 3], C[i * 3 + 1] - C[j * 3 + 1]); if (d > this.hw[i] + this.hw[j]) continue;
        const dz = C[j * 3 + 2] - C[i * 3 + 2]; if (dz <= 0) continue;
        const key = Math.round(i / 40) + ':' + Math.round(j / 40); if (seen.has(key)) continue; seen.add(key);
        out.push({ lower: i, upper: j, clearance: dz / U });
      }
    }
    return out;
  }
  /** slice indices whose centre lies within r (plan) of (x, y) */
  near(x, y, r) {
    const cell = this.cell, out = [], k = Math.ceil(r / cell), kx = Math.floor(x / cell), ky = Math.floor(y / cell), C = this.C;
    for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) { const bk = this.buckets.get((kx + a) * 65536 + ky + b); if (bk) for (const i of bk) if (Math.hypot(C[i * 3] - x, C[i * 3 + 1] - y) <= r) out.push(i); }
    return out;
  }
  /** the frame at s, interpolated: { C, F, R, U, hw, bank, kind, flags, i } (out reused) */
  frameAt(s, out = { C: [0, 0, 0], F: [0, 0, 0], R: [0, 0, 0], U: [0, 0, 0] }) {
    const n = this.n, ds = this.ds, x = SN.wrap(s, this.L) / ds, i = Math.floor(x) % n, j = (i + 1) % n, f = x - Math.floor(x), C = this.C, F = this.F, R = this.R, Up = this.Up;
    const same = this.kind[i] === this.kind[j], k = same ? f : (f < .5 ? 0 : 1);
    for (let c = 0; c < 3; c++) { out.C[c] = C[i * 3 + c] + (C[j * 3 + c] - C[i * 3 + c]) * k; out.F[c] = F[i * 3 + c] + (F[j * 3 + c] - F[i * 3 + c]) * f; out.R[c] = R[i * 3 + c] + (R[j * 3 + c] - R[i * 3 + c]) * f; out.U[c] = Up[i * 3 + c] + (Up[j * 3 + c] - Up[i * 3 + c]) * f; }
    V.norm(out.F); V.norm(out.R); V.norm(out.U);
    const ii = f < .5 ? i : j;
    out.hw = this.hw[i] + (this.hw[j] - this.hw[i]) * f; out.bank = this.bank[i] + (this.bank[j] - this.bank[i]) * f; out.kind = this.kind[ii]; out.flags = this.flags[ii]; out.i = ii;
    return out;
  }
  /** a point on the surface at (s, u): [x, y, z] */
  point(s, u = 0, h = 0, out = [0, 0, 0]) { const f = this.frameAt(s, this._f || (this._f = { C: [0, 0, 0], F: [0, 0, 0], R: [0, 0, 0], U: [0, 0, 0] })); for (let c = 0; c < 3; c++) out[c] = f.C[c] + f.R[c] * u + f.U[c] * h; return out; }
  /** local Newton search from sHint -> { s, u, h } (never global: overpasses stay apart) */
  locate(P, sHint, out = { s: 0, u: 0, h: 0 }) {
    const f = this._lf || (this._lf = { C: [0, 0, 0], F: [0, 0, 0], R: [0, 0, 0], U: [0, 0, 0] }); let s = sHint;
    for (let it = 0; it < 3; it++) { this.frameAt(s, f); const d = (P[0] - f.C[0]) * f.F[0] + (P[1] - f.C[1]) * f.F[1] + (P[2] - f.C[2]) * f.F[2]; s = SN.wrap(s + Math.max(-64, Math.min(64, d)), this.L); if (Math.abs(d) < .01) break; }
    this.frameAt(s, f);
    const dx = P[0] - f.C[0], dy = P[1] - f.C[1], dz = P[2] - f.C[2];
    out.s = s; out.u = dx * f.R[0] + dy * f.R[1] + dz * f.R[2]; out.h = dx * f.U[0] + dy * f.U[1] + dz * f.U[2]; out.kind = f.kind; out.flags = f.flags; out.hw = f.hw;
    return out;
  }
  /** is there a wall on side (-1 left, +1 right) at s? */
  wall(s, side) { const fl = this.flags[this.idx(s)], k = this.kind[this.idx(s)]; if (k === 1) return false; return !(fl & (side < 0 ? 4 : 8)); }
  /** the nearest slice whose surface lies below zHint at (x, y), or -1 */
  query(x, y, zHint = 1e9) {
    const C = this.C, R = this.R; let best = -1, bd = 1e18;
    for (const i of this.near(x, y, 48 * U)) {
      if (this.kind[i] === 1) continue;
      const dx = x - C[i * 3], dy = y - C[i * 3 + 1], al = dx * this.F[i * 3] + dy * this.F[i * 3 + 1]; if (Math.abs(al) > this.ds * 1.5) continue;
      const rl = Math.hypot(R[i * 3], R[i * 3 + 1]) || 1, u = (dx * R[i * 3] + dy * R[i * 3 + 1]) / rl / rl; if (Math.abs(u) > this.hw[i] + 2 * U) continue;
      const z = C[i * 3 + 2] + R[i * 3 + 2] * u; if (z > zHint + 8) continue;
      const d = zHint - z; if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  /** the track surface z under (x, y) at or below z, else -Infinity (sparks land on the deck) */
  groundBelow(x, y, z) {
    const i = this.query(x, y, z); if (i < 0) return -Infinity;
    const C = this.C, R = this.R, dx = x - C[i * 3], dy = y - C[i * 3 + 1], rl = Math.hypot(R[i * 3], R[i * 3 + 1]) || 1, u = (dx * R[i * 3] + dy * R[i * 3 + 1]) / rl / rl;
    return C[i * 3 + 2] + R[i * 3 + 2] * u;
  }
  jumpAt(s) { for (const j of this.jumps) if (this.inRange(s, j.a, j.b)) return j; return null; }
  inTunnel(s) { return !!(this.flags[this.idx(s)] & 1); }
  /** the racing line's lateral offset (u) at s */
  line(s) { const x = SN.wrap(s, this.L) / this.ds, i = Math.floor(x) % this.n, j = (i + 1) % this.n, f = x - Math.floor(x); return this.lineU[i] + (this.lineU[j] - this.lineU[i]) * f; }
  /** the line's target speed at s for a class (u/s) */
  vline(s, cls = 'spark') { const p = this.profiles[cls] || this.profiles.spark; return p[this.idx(s)]; }
  curvL(s) { return this.kL[this.idx(s)]; }
  _lineAndProfiles() {
    const n = this.n, C = this.C, R = this.R, hw = this.hw, lu = this.lineU = new Float64Array(n), P = new Float64Array(n * 3);
    const gapNear = new Uint8Array(n);
    for (const j of this.jumps) for (let i = 0; i < n; i++) if (this.inRange(i * this.ds, SN.wrap(j.a - 150 * U, this.L), SN.wrap(j.b + 30 * U, this.L))) gapNear[i] = 1;
    for (let it = 0; it < 400; it++) {
      for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) P[i * 3 + c] = C[i * 3 + c] + R[i * 3 + c] * lu[i];
      for (let i = 0; i < n; i++) {
        const a = (i - 1 + n) % n, b = (i + 1) % n; let d = 0;
        for (let c = 0; c < 3; c++) d += ((P[a * 3 + c] + P[b * 3 + c]) / 2 - C[i * 3 + c]) * R[i * 3 + c];
        lu[i] += .5 * (d - lu[i]);
        if (gapNear[i]) lu[i] *= .2;
        const lim = Math.max(0, hw[i] - 3.5 * U); lu[i] = Math.max(-lim, Math.min(lim, lu[i]));
      }
    }
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) P[i * 3 + c] = C[i * 3 + c] + R[i * 3 + c] * lu[i];
    const kL = this.kL = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = (i - 4 + n) % n, b = (i + 4) % n, h1 = Math.atan2(P[i * 3 + 1] - P[a * 3 + 1], P[i * 3] - P[a * 3]), h2 = Math.atan2(P[b * 3 + 1] - P[i * 3 + 1], P[b * 3] - P[i * 3]);
      let dh = h2 - h1; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
      const L1 = Math.hypot(P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1]) || 1; kL[i] = this.kind[i] ? 0 : dh / (L1 / 2);
    }
    this.profiles = {};
    for (const c of SN.CLASSES) {
      const top = c.top * 1.012, alat = 640 * Math.pow(top / 1440, 1.5) * 1.15, athr = .55 * top, dec = 450 * (top / 1440), v = new Float64Array(n), ds = this.ds;
      for (let i = 0; i < n; i++) v[i] = Math.min(top, Math.sqrt(alat / Math.max(1e-9, Math.abs(kL[i]))));
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i <= n; i++) { const a = (i - 1) % n, b = i % n; v[b] = Math.min(v[b], Math.sqrt(v[a] * v[a] + 2 * Math.max(0, athr * (1 - (v[a] / top) ** 2)) * ds)); }
        for (let i = n - 1; i >= 0; i--) { const a = i, b = (i + 1) % n; v[a] = Math.min(v[a], Math.sqrt(v[b] * v[b] + 2 * dec * ds)); }
      }
      for (const j of this.jumps) if (j.kind === 'gap') { const vJ = Math.min(top * .97, Math.max(1360, j.minSpeed * U * 1.15)); for (let i = 0; i < n; i++) if (gapNear[i]) v[i] = Math.max(v[i], vJ); }
      this.profiles[c.id] = v;
    }
  }
  validate() {
    const d = this.def, km = this.L / U / 1000;
    if (d.lengthKm && Math.abs(km - d.lengthKm) / d.lengthKm > .015) throw new Error('track ' + d.id + ': length ' + km.toFixed(3) + ' km, expected ' + d.lengthKm);
    for (const o of this.overpasses) if (o.clearance < 12) throw new Error('track ' + d.id + ': overpass clearance ' + o.clearance.toFixed(1) + ' m < 12 m');
    for (const p of this.pads) if (this.jumpAt(p.s)) throw new Error('track ' + d.id + ': pad ' + p.id + ' inside a jump');
    for (const p of this.weaponPads) if (Math.abs(p.u) + p.hwid > this.hw[this.idx(p.s)] - U) throw new Error('track ' + d.id + ': weapon pad ' + p.id + ' outside the track');
    if (this.pit) for (const j of this.jumps) if (this.inRange(j.a, this.pit.a, this.pit.b)) throw new Error('track ' + d.id + ': jump in the pit lane');
    return true;
  }
  /** tightest radius (m) and slope range (%) outside jumps: for the checker */
  stats() {
    let rmin = 1e9, smin = 0, smax = 0, at = 0;
    for (let i = 0; i < this.n; i++) { if (this.kind[i]) continue; const r = 1 / Math.max(1e-9, Math.abs(this.kappa[i])) / U; if (r < rmin) { rmin = r; at = i * this.ds / U; } const sl = this.F[i * 3 + 2] / Math.hypot(this.F[i * 3], this.F[i * 3 + 1]) * 100; smin = Math.min(smin, sl); smax = Math.max(smax, sl); }
    return { km: this.L / U / 1000, rmin, at, smin, smax, overpasses: this.overpasses.map(o => o.clearance), slices: this.n };
  }
}
SN.Track = Track;
SN._trackCache = {};
SN.getTrack = id => SN._trackCache[id] || (SN._trackCache[id] = Track.build(SN.TRACKS[id]));
})();
