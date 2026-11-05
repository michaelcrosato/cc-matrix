// SNIPEOUT HD: the track. A closed centripetal Catmull-Rom through the TrackDef's points, resampled every 2 m into
// slices, each with its centre, frame (banked), width and flags (gap, drop, tunnel, open edge, pit). Track space is
// (s along the centre line, u to the right, h above the surface). locate() is always local to the craft's last s,
// which keeps overpasses safe. Also the racing line, the AI speed profile per class, pads, sectors, the grid and the
// minimap. Node-safe and deterministic.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16;
const FLAG = SN.TFLAG = { GAP: 1, DROP: 2, TUNNEL: 4, OPEN_L: 8, OPEN_R: 16, PIT: 32 };

/* App. A: the planning checker's spline and resample (used as is) */
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

class Track {
  /** build a track from its def (metres); throws with the track's id and the reason when the data is invalid */
  static build(def, o = {}) { const t = new Track(def); t._build(o); return t; }
  constructor(def) { this.def = def; this.id = def.id; }
  _build(o) {
    const def = this.def, org = def.origin || [0, 0, 0];
    const P = def.points.map(p => [(p[0] + org[0]) * U, (p[1] + org[1]) * U, (p[2] + org[2]) * U]);
    const res = resampleClosed(catmullClosed(P, 64), 32);
    const N = res.pts.length, ds = res.ds, L = res.L;
    const i0 = Math.round(def.start * U / ds) % N;
    this.N = N; this.ds = ds; this.L = L; this.rawStart = i0 * ds;
    this.knots = res.knots.map(k => ((k - this.rawStart) % L + L) % L);   // s of each control point (rebased)
    const A = n => new Float64Array(n);
    const Cx = this.Cx = A(N), Cy = this.Cy = A(N), Cz = this.Cz = A(N);
    for (let i = 0; i < N; i++) { const p = res.pts[(i + i0) % N]; Cx[i] = p[0]; Cy[i] = p[1]; Cz[i] = p[2]; }
    const Fx = this.Fx = A(N), Fy = this.Fy = A(N), Fz = this.Fz = A(N);
    for (let i = 0; i < N; i++) { const a = (i - 1 + N) % N, b = (i + 1) % N; const dx = Cx[b] - Cx[a], dy = Cy[b] - Cy[a], dz = Cz[b] - Cz[a], l = Math.hypot(dx, dy, dz) || 1; Fx[i] = dx / l; Fy[i] = dy / l; Fz[i] = dz / l; }
    // plan curvature (signed: + turns right), from the heading change over +-10 m
    const head = A(N); for (let i = 0; i < N; i++) head[i] = Math.atan2(Fy[i], Fx[i]);
    const kap = this.kappa = A(N), K = 5;
    for (let i = 0; i < N; i++) kap[i] = SN.wrapAngle(head[(i + K) % N] - head[(i - K + N) % N]) / (2 * K * ds);
    this.heading = head;
    // width: per control point, interpolated between knots
    const hw = this.hw = A(N), wOf = cp => (def.widths && def.widths[cp]) || def.width;
    const kn = this.knots, nk = kn.length;
    for (let c = 0; c < nk; c++) {
      const s0 = kn[c], s1 = kn[(c + 1) % nk], w0 = wOf(c), w1 = wOf((c + 1) % nk), span = ((s1 - s0) % L + L) % L || L;
      for (let k = 0; k * ds < span; k++) { const s = s0 + k * ds, i = Math.round(((s % L) + L) % L / ds) % N; hw[i] = (w0 + (w1 - w0) * (k * ds / span)) * U / 2; }
    }
    for (let i = 0; i < N; i++) if (!hw[i]) hw[i] = def.width * U / 2;
    // features into flags and lists
    const flags = this.flags = new Uint8Array(N), dropZ = this.dropZ = A(N), dropB = this.dropB = A(N);
    this.sOf = f => (((this.knots[f.cp] + (f.d || 0) * U) % L) + L) % L;
    this.idx = s => { let i = Math.floor((((s % L) + L) % L) / ds); return i >= N ? 0 : i; };
    const range = (a, b, fn) => { let i = this.idx(a); const j = this.idx(b); for (let n = 0; n < N && i !== j; n++, i = (i + 1) % N) fn(i); };
    // bank: auto from curvature, smoothed over +-40 m; manual runs override with a 60 m blend
    const bank = this.bank = A(N), raw = A(N);
    for (let i = 0; i < N; i++) { const R = 1 / Math.max(1e-9, Math.abs(kap[i])) / U; raw[i] = Math.sign(kap[i]) * Math.min(28, 1600 / R) * Math.PI / 180; }
    const W = Math.round(40 * U / ds);
    for (let i = 0; i < N; i++) { let t = 0; for (let k = -W; k <= W; k++) t += raw[(i + k + N) % N]; bank[i] = t / (2 * W + 1); }
    for (const b of def.banks || []) {
      const sa = this.knots[b.from], sb = this.knots[b.to], blend = 60 * U, sgn = Math.sign(this._kapAvg(sa, sb)) || 1, tgt = sgn * b.deg * Math.PI / 180;
      const span = ((sb - sa) % L + L) % L;
      for (let x = -blend; x <= span + blend; x += ds) {
        const i = this.idx(sa + x), w = x < 0 ? 1 + x / blend : x > span ? 1 - (x - span) / blend : 1;
        bank[i] = bank[i] + (tgt - bank[i]) * SN.smooth01(w);
      }
    }
    this.jumps = [];
    for (const j of def.jumps || []) {
      const a = this.knots[j.from], b = this.knots[j.to], ib = this.idx(b);
      const J = { kind: j.kind, name: j.name, s0: a, s1: b, z0: Cz[this.idx(a)], z1: Cz[ib], minSpeed: (j.minSpeed || 0) * U };
      this.jumps.push(J);
      range(a + ds, b, i => { flags[i] |= j.kind === 'gap' ? FLAG.GAP : FLAG.DROP; dropZ[i] = Cz[ib]; dropB[i] = bank[ib]; });
    }
    this.tunnels = (def.tunnels || []).map(t => { const a = this.sOf(t.a), b = this.sOf(t.b); range(a, b, i => { flags[i] |= FLAG.TUNNEL; }); return { s0: a, s1: b, style: t.style }; });
    this.open = (def.openEdges || []).map(e => { const a = this.sOf(e.a), b = this.sOf(e.b); range(a, b, i => { flags[i] |= e.side === 'left' ? FLAG.OPEN_L : FLAG.OPEN_R; }); return { s0: a, s1: b, side: e.side }; });
    if (def.pit) { const a = this.sOf(def.pit.a), b = this.sOf(def.pit.b); this.pit = { s0: a, s1: b, side: def.pit.side === 'left' ? -1 : 1, w: def.pit.w * U }; range(a, b, i => { flags[i] |= FLAG.PIT; }); }
    else this.pit = null;
    // frames (banked): R' and U' per slice
    const Rx = this.Rx = A(N), Ry = this.Ry = A(N), Rz = this.Rz = A(N), Ux = this.Ux = A(N), Uy = this.Uy = A(N), Uz = this.Uz = A(N);
    for (let i = 0; i < N; i++) {
      const f = SN.frame([Fx[i], Fy[i], Fz[i]], SN.ZUP, bank[i]);
      Rx[i] = f.R[0]; Ry[i] = f.R[1]; Rz[i] = f.R[2]; Ux[i] = f.U[0]; Uy[i] = f.U[1]; Uz[i] = f.U[2];
    }
    // pads: speed pads 8 m x 6 m, weapon pads 6 m x 6 m (a row of three across unless one u is given)
    this.pads = [];
    for (const p of def.speedPads || []) this.pads.push({ kind: 'speed', s: this.sOf(p), u: (p.u || 0) * U, hl: 4 * U, hw: 3 * U });
    for (const p of def.weaponPads || []) { const us = p.u !== undefined ? [p.u] : [-8, 0, 8]; for (const u of us) this.pads.push({ kind: 'weapon', s: this.sOf(p), u: u * U, hl: 3 * U, hw: 3 * U }); }
    this.pads.forEach((p, k) => { p.id = k; });
    this.sectors = Array.from({ length: 8 }, (_, k) => k * L / 8);
    this.grid = Array.from({ length: 8 }, (_, k) => { const row = Math.floor(k / 2), side = k % 2 ? 1 : -1; return { s: ((-(10 + row * 16 + (k % 2) * 6) * U) % L + L) % L, u: side * 4.5 * U }; });
    // 2D buckets of slice indices (32 m cells): the terrain carve, particles, cameras, scenery placement
    const cell = this.cell = 32 * U, B = this.buckets = new Map();
    for (let i = 0; i < N; i++) { const r = hw[i] + 24 * U; for (let gx = Math.floor((Cx[i] - r) / cell); gx <= Math.floor((Cx[i] + r) / cell); gx++) for (let gy = Math.floor((Cy[i] - r) / cell); gy <= Math.floor((Cy[i] + r) / cell); gy++) { const k = gx * 65536 + gy; let l = B.get(k); if (!l) B.set(k, l = []); if (l[l.length - 1] !== i) l.push(i); } }
    this._overpasses();
    this._line();
    this._profiles();
    this._minimap();
    if (o.validate !== false) this.validate();
  }
  _kapAvg(a, b) { let t = 0; const i0 = this.idx(a), i1 = this.idx(b); for (let i = i0, n = 0; i !== i1 && n < this.N; i = (i + 1) % this.N, n++) t += this.kappa[i]; return t; }
  /** pairs of track sections that pass over each other: { sLow, sHigh, clearance (m) } */
  _overpasses() {
    const N = this.N, out = []; const seen = new Set();
    for (let i = 0; i < N; i += 2) {
      const near = this.bucketAt(this.Cx[i], this.Cy[i]);
      for (const j of near) {
        if (j <= i) continue;
        const dsep = Math.min(Math.abs(i - j), N - Math.abs(i - j)) * this.ds; if (dsep < 300 * U) continue;
        const d = Math.hypot(this.Cx[i] - this.Cx[j], this.Cy[i] - this.Cy[j]); if (d > this.hw[i] + this.hw[j] + 6 * U) continue;
        const key = Math.round(i / 40) + ':' + Math.round(j / 40); if (seen.has(key)) continue; seen.add(key);
        out.push({ i, j, d, dz: this.Cz[j] - this.Cz[i] });
      }
    }
    // one per crossing: the pair whose centres come closest in plan
    const groups = [];
    for (const p of out) { const g = groups.find(g => Math.abs(g.i - p.i) < 120 && Math.abs(g.j - p.j) < 120); if (g) { if (p.d < g.d) Object.assign(g, p); } else groups.push(Object.assign({}, p)); }
    this.overpasses = groups.map(g => { const low = g.dz > 0 ? g.i : g.j, high = g.dz > 0 ? g.j : g.i; return { sLow: low * this.ds, sHigh: high * this.ds, iLow: low, iHigh: high, clearance: Math.abs(g.dz) / U, planDist: g.d / U }; });
    this.overlapping = out.filter(p => Math.abs(p.dz) < 12 * U);
  }
  /** slice indices in the bucket at (x, y) */
  bucketAt(x, y) { return this.buckets.get(Math.floor(x / this.cell) * 65536 + Math.floor(y / this.cell)) || []; }
  /** the nearest slice in plan to (x, y), with a surface below zHint (or any), within maxD: { i, d, z } or null */
  query(x, y, zHint = Infinity, maxD = Infinity) {
    let best = null, bd = maxD;
    for (const i of this.bucketAt(x, y)) {
      const z = this.Cz[i]; if (z > zHint + 8 * U) continue;
      const d = Math.hypot(x - this.Cx[i], y - this.Cy[i]); if (d < bd) { bd = d; best = i; }
    }
    return best === null ? null : { i: best, d: bd, z: this.Cz[best] };
  }
  /** the surface's height under (x, y) below z: the track, else -Infinity (particles land on it) */
  groundBelow(x, y, z) {
    let best = -Infinity;
    for (const i of this.bucketAt(x, y)) {
      if (this.flags[i] & FLAG.GAP) continue;
      const dx = x - this.Cx[i], dy = y - this.Cy[i], u = dx * this.Rx[i] + dy * this.Ry[i], f = dx * this.Fx[i] + dy * this.Fy[i];
      if (Math.abs(f) > this.ds || Math.abs(u) > this.hw[i] + 16) continue;
      const sz = this.flags[i] & FLAG.DROP ? this.dropZ[i] : this.Cz[i] + this.Rz[i] * u;
      if (sz <= z + 4 && sz > best) best = sz;
    }
    return best;
  }

  /* ---- frames and the surface at (s, u) ---- */
  /** interpolated frame at s: { C, F, R, U, hw, bank, i, f, flags } (reuses out) */
  frameAt(s, out = { C: [0, 0, 0], F: [0, 0, 0], R: [0, 0, 0], U: [0, 0, 0], hw: 0, bank: 0, i: 0, f: 0, flags: 0 }) {
    const L = this.L, N = this.N; s = ((s % L) + L) % L;
    const x = s / this.ds, i = Math.floor(x) % N, j = (i + 1) % N, f = x - Math.floor(x);
    const lr = (a) => a[i] + (a[j] - a[i]) * f;
    V.set(out.C, lr(this.Cx), lr(this.Cy), lr(this.Cz));
    V.norm(out.F, V.set(out.F, lr(this.Fx), lr(this.Fy), lr(this.Fz)));
    V.norm(out.R, V.set(out.R, lr(this.Rx), lr(this.Ry), lr(this.Rz)));
    V.norm(out.U, V.set(out.U, lr(this.Ux), lr(this.Uy), lr(this.Uz)));
    out.hw = lr(this.hw); out.bank = lr(this.bank); out.i = i; out.f = f; out.flags = this.flags[f < .5 ? i : j];
    return out;
  }
  /** the surface at (s, u): { P, N, kind: 'deck' | 'gap' | 'drop', wallL, wallR, ceil, hw, fr } (reuses out) */
  surface(s, u, out) {
    out = out || { P: [0, 0, 0], N: [0, 0, 1], kind: 'deck', wallL: true, wallR: true, ceil: 0, hw: 0, fr: null };
    const fr = out.fr = this.frameAt(s, out.fr || undefined), fl = fr.flags;
    out.hw = fr.hw; out.wallL = !(fl & FLAG.OPEN_L); out.wallR = !(fl & FLAG.OPEN_R); out.ceil = fl & FLAG.TUNNEL ? 12 * U : 0; out.pit = !!(fl & FLAG.PIT);
    if (fl & FLAG.GAP) { out.kind = 'gap'; out.wallL = out.wallR = false; return out; }
    if (fl & FLAG.DROP) {
      out.kind = 'drop';
      const i = fr.i, z1 = this.dropZ[i], b1 = this.dropB[i];
      const rh = Math.hypot(fr.R[0], fr.R[1]) || 1, rx = fr.R[0] / rh, ry = fr.R[1] / rh;
      V.set(out.P, fr.C[0] + rx * u, fr.C[1] + ry * u, z1 - Math.sin(b1) * u);
      V.set(out.N, rx * Math.sin(b1), ry * Math.sin(b1), Math.cos(b1));
      return out;
    }
    out.kind = 'deck';
    V.addS(out.P, fr.C, fr.R, u); V.copy(out.N, fr.U);
    return out;
  }
  /** track coordinates of a world point near sHint: { s, u, h } (3 local Newton steps: never jumps to another deck) */
  locate(P, sHint, out = { s: 0, u: 0, h: 0 }) {
    const fr = this._lf || (this._lf = undefined);
    let s = sHint, F = this._lfr || (this._lfr = { C: [0, 0, 0], F: [0, 0, 0], R: [0, 0, 0], U: [0, 0, 0] });
    for (let k = 0; k < 3; k++) {
      this.frameAt(s, F);
      const d = (P[0] - F.C[0]) * F.F[0] + (P[1] - F.C[1]) * F.F[1] + (P[2] - F.C[2]) * F.F[2];
      s += Math.max(-64, Math.min(64, d));
    }
    s = ((s % this.L) + this.L) % this.L;
    this.frameAt(s, F);
    const dx = P[0] - F.C[0], dy = P[1] - F.C[1], dz = P[2] - F.C[2];
    out.s = s; out.u = dx * F.R[0] + dy * F.R[1] + dz * F.R[2];
    const srf = this._ls = this.surface(s, out.u, this._ls);
    out.h = srf.kind === 'gap' ? dx * F.U[0] + dy * F.U[1] + dz * F.U[2] : (P[0] - srf.P[0]) * srf.N[0] + (P[1] - srf.P[1]) * srf.N[1] + (P[2] - srf.P[2]) * srf.N[2];
    return out;
  }
  /** signed short distance from a to b along the loop */
  dS(a, b) { const L = this.L; let d = ((b - a) % L + L) % L; if (d > L / 2) d -= L; return d; }
  /** a world point at (s, u, h) */
  point(s, u, h = 0, out = [0, 0, 0]) { const srf = this._pt = this.surface(s, u, this._pt); if (srf.kind === 'gap') { V.addS(out, srf.fr.C, srf.fr.R, u); V.addS(out, out, srf.fr.U, h); } else V.addS(out, srf.P, srf.N, h); return out; }

  /* ---- the racing line and the speed profile ---- */
  _line() {
    const N = this.N, ds = this.ds, u = this.lineU = new Float64Array(N), Cx = this.Cx, Cy = this.Cy, Rx = this.Rx, Ry = this.Ry;
    const lim = i => Math.max(0, this.hw[i] - 3.5 * U);
    const gapW = new Float64Array(N);   // pull toward the centre on a gap's approach
    for (const J of this.jumps) if (J.kind === 'gap') { for (let x = -150 * U; x <= this.dS(J.s0, J.s1); x += ds) gapW[this.idx(J.s0 + x)] = .8; }
    const px = new Float64Array(N), py = new Float64Array(N);
    for (const k of [48, 32, 24, 16, 12, 8, 6, 4, 3, 2, 1]) {
      for (let it = 0; it < 40; it++) {
        for (let i = 0; i < N; i++) { px[i] = Cx[i] + Rx[i] * u[i]; py[i] = Cy[i] + Ry[i] * u[i]; }
        for (let i = 0; i < N; i++) {
          const a = (i - k + N) % N, b = (i + k) % N, mx = (px[a] + px[b]) / 2 - Cx[i], my = (py[a] + py[b]) / 2 - Cy[i];
          let t = mx * Rx[i] + my * Ry[i]; t = u[i] + .5 * (t - u[i]); if (gapW[i]) t *= 1 - gapW[i];
          const l = lim(i); u[i] = Math.max(-l, Math.min(l, t));
        }
      }
    }
    // the line's own plan curvature
    const k = this.lineK = new Float64Array(N), K = 5, hx = new Float64Array(N);
    for (let i = 0; i < N; i++) { px[i] = Cx[i] + Rx[i] * u[i]; py[i] = Cy[i] + Ry[i] * u[i]; }
    for (let i = 0; i < N; i++) { const a = (i - 1 + N) % N, b = (i + 1) % N; hx[i] = Math.atan2(py[b] - py[a], px[b] - px[a]); }
    for (let i = 0; i < N; i++) k[i] = SN.wrapAngle(hx[(i + K) % N] - hx[(i - K + N) % N]) / (2 * K * ds);
    this.linePx = px; this.linePy = py;
  }
  _profiles() {
    this.vprof = {};
    for (const cls of SN.CLASS_ORDER) this.vprof[cls] = this.profile(SN.CLASSES[cls].top);
  }
  /** the AI's target speed per slice for a top speed: corners by the grip limit, then accelerate and brake passes */
  /** a craft's own profile: its top speed and its grip (cached by key: the team, the class) */
  profileFor(key, top, gripMax) { const C = this._pf || (this._pf = {}); return C[key] || (C[key] = this.profile(top, 1.15, gripMax)); }
  profile(top, alatK = 1.15, gripMax) {
    const N = this.N, ds = this.ds, v = new Float64Array(N), k = top / 1440, alat = (gripMax || 640 * Math.pow(k, 1.5)) * alatK, dec = 450 * k * 1.1, athr = .55 * top;
    for (let i = 0; i < N; i++) {
      const fl = this.flags[i];
      v[i] = fl & (FLAG.GAP | FLAG.DROP) ? top : Math.min(top, Math.sqrt(alat / Math.max(1e-9, Math.abs(this.lineK[i]))));
    }
    // a gap wants its minimum speed on the approach
    for (const J of this.jumps) if (J.kind === 'gap') { const vj = Math.min(top, Math.max(J.minSpeed * 1.13, 1360)); for (let x = -260 * U; x <= this.dS(J.s0, J.s1); x += ds) { const i = this.idx(J.s0 + x); v[i] = Math.max(v[i], vj); } }
    for (let pass = 0; pass < 3; pass++) {
      for (let n = 0; n < N; n++) { const i = n % N, j = (n + 1) % N, a = athr * Math.max(.05, 1 - (v[i] / top) ** 2); v[j] = Math.min(v[j], Math.sqrt(v[i] * v[i] + 2 * a * ds)); }
      for (let n = N - 1; n >= 0; n--) { const i = n, j = (n + 1) % N; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * dec * ds)); }
    }
    return v;
  }
  /** the racing line's lateral offset (u) at s */
  line(s) { const x = (((s % this.L) + this.L) % this.L) / this.ds, i = Math.floor(x) % this.N, j = (i + 1) % this.N, f = x - Math.floor(x); return this.lineU[i] + (this.lineU[j] - this.lineU[i]) * f; }
  /** the target speed at s for a class (u/s) */
  vline(s, cls = 'SPARK') { const v = this.vprof[cls] || this.vprof.SPARK, i = this.idx(s); return v[i]; }
  /** an ideal-line lap time estimate for a class (s), from the profile */
  idealLap(cls) { const v = this.vprof[cls]; let t = 0; for (let i = 0; i < this.N; i++) t += this.ds / Math.max(50, v[i]); return t; }

  /* ---- the minimap: the plan polyline every 20 m fitted into a box ---- */
  _minimap() {
    const pts = []; let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
    for (let s = 0; s < this.L; s += 20 * U) { const i = this.idx(s); pts.push([this.Cx[i], this.Cy[i], this.Cz[i], s]); x0 = Math.min(x0, this.Cx[i]); y0 = Math.min(y0, this.Cy[i]); x1 = Math.max(x1, this.Cx[i]); y1 = Math.max(y1, this.Cy[i]); }
    this.map = { pts, x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
    const hi = new Set(); for (const o of this.overpasses) for (let k = -60; k <= 60; k++) hi.add(Math.floor(((o.iHigh + k) % this.N + this.N) % this.N * this.ds / (20 * U)));
    this.map.upper = hi;
  }
  /** a point (x, y) in a box of size w x h (pixels), aspect kept: [px, py] */
  mapXY(x, y, w, h) { const M = this.map, k = Math.min(w / M.w, h / M.h), ox = (w - M.w * k) / 2, oy = (h - M.h * k) / 2; return [ox + (x - M.x0) * k, oy + (y - M.y0) * k]; }

  /* ---- validation ---- */
  validate() {
    const d = this.def, err = m => { throw new Error('track ' + d.id + ': ' + m); };
    if (d.lengthKm && Math.abs(this.L / U / 1000 - d.lengthKm) / d.lengthKm > .01) err('length ' + (this.L / U / 1000).toFixed(3) + ' km is not within 1% of ' + d.lengthKm);
    for (const o of this.overpasses) if (o.clearance < 12) err('an overpass at s ' + Math.round(o.sLow / U) + ' m has only ' + o.clearance.toFixed(1) + ' m of clearance');
    if (this.overlapping.length) err('the track overlaps itself near s ' + Math.round(this.overlapping[0].i * this.ds / U) + ' m');
    for (const J of this.jumps) {
      const h0 = this.heading[this.idx(J.s0)], h1 = this.heading[this.idx(J.s1)], turn = Math.abs(SN.wrapAngle(h1 - h0)) * 180 / Math.PI;
      if (turn > (J.kind === 'gap' ? 10 : 25)) err('the jump ' + J.name + ' turns ' + turn.toFixed(1) + ' degrees');
    }
    for (const p of this.pads) { const fl = this.flags[this.idx(p.s)]; if (fl & (FLAG.GAP | FLAG.DROP)) err('a pad sits in a jump at s ' + Math.round(p.s / U)); if (Math.abs(p.u) + p.hw > this.hw[this.idx(p.s)] - 1 * U + .01) err('a pad at s ' + Math.round(p.s / U) + ' does not fit the track'); }
    if (this.pit) for (const J of this.jumps) if (this.dS(this.pit.s0, J.s0) >= 0 && this.dS(J.s0, this.pit.s1) >= 0) err('the pit lane crosses a jump');
    return true;
  }
}
SN.Track = Track;
/** the built tracks, cached by id */
SN.trackCache = {};
SN.getTrack = id => SN.trackCache[id] || (SN.trackCache[id] = Track.build(SN.TRACKS[id]));
})();
