(() => {
const E = My3D2dge, SN = globalThis.SN, U = SN.U, TAU = Math.PI * 2;
const { clamp, mod, wrapAngle } = SN;
const DS = 4 * U;     // a slice every 4 m

class Track {
  static build(def) {
    const t = new Track(); t.def = def; t.id = def.id;
    // dense sample of the parametric shape (metres -> units), then resample at equal arc length
    const N = 4000, dense = [], wd = [];
    for (let i = 0; i < N; i++) { const p = def.shape(i / N); dense.push([p[0] * U, p[1] * U, p[2] * U]); wd.push(p[3] * U); }
    const cum = [0]; for (let i = 1; i <= N; i++) { const a = dense[i - 1], b = dense[i % N]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
    const total = cum[N], n = Math.round(total / DS), ds = total / n;
    if (n < 100) throw new Error('track too short: ' + def.id);
    const C = [], W = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
      const d = i * ds; while (cum[j + 1] < d) j++;
      const f = (d - cum[j]) / (cum[j + 1] - cum[j] || 1), a = dense[j], b = dense[(j + 1) % N];
      C.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); W.push(wd[j]);
    }
    t.n = n; t.ds = ds; t.L = total;
    const at = i => C[mod(i, n)];
    const F3 = [], yaw = [];
    for (let i = 0; i < n; i++) { const a = at(i - 1), b = at(i + 1); F3.push(SN.v3.norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]])); yaw.push(Math.atan2(F3[i][1], F3[i][0])); }
    // curvature (rad/u, + = right turn), smoothed
    const k0 = []; for (let i = 0; i < n; i++) k0.push(wrapAngle(yaw[mod(i + 1, n)] - yaw[mod(i - 1, n)]) / (2 * ds));
    const smooth = (arr, r) => arr.map((_, i) => { let s = 0; for (let d = -r; d <= r; d++) s += arr[mod(i + d, n)]; return s / (2 * r + 1); });
    const kap = smooth(k0, 3);
    const bankT = kap.map(k => clamp(k * 900 * U / 16, -.6, .6));
    const bank = smooth(bankT, 6);
    t.C = C; t.F = []; t.R = []; t.U = []; t.w = W; t.bank = bank; t.k = kap; t.yaw = yaw; t.kmax = 0;
    for (let i = 0; i < n; i++) {
      const fr = SN.frame(F3[i]), b = bank[i], cb = Math.cos(b), sb = Math.sin(b);
      const R = [fr.R[0] * cb - fr.U[0] * sb, fr.R[1] * cb - fr.U[1] * sb, fr.R[2] * cb - fr.U[2] * sb];
      const Up = [fr.U[0] * cb + fr.R[0] * sb, fr.U[1] * cb + fr.R[1] * sb, fr.U[2] * cb + fr.R[2] * sb];
      t.F.push(F3[i]); t.R.push(R); t.U.push(Up); t.kmax = Math.max(t.kmax, Math.abs(kap[i]));
    }
    // racing line and speed profile (for the AI and the ghost pace)
    t.lineU = smooth(kap.map((k, i) => clamp(k * 14000, -.6 * W[i], .6 * W[i])), 5);
    const aLat = 2.1, vc = kap.map(k => Math.min(2.2e4, aLat / Math.max(Math.abs(k), 1e-6)));
    for (let pass = 0; pass < 3; pass++) for (let i = 2 * n; i >= 0; i--) { const a = mod(i, n), b = mod(i + 1, n); vc[a] = Math.min(vc[a], Math.sqrt(vc[b] * vc[b] + 2 * 330 * ds)); }
    t.vline = vc;
    // features: pads, pit strip, start
    t.pads = []; t.pit = { s0: .90 * total, s1: .985 * total, u0: .30, u1: .95 };
    const boosts = [.10, .36, .64, .80], weaps = [.05, .22, .45, .58, .72, .86];
    boosts.forEach((f, i) => t.pads.push({ kind: 'boost', s: f * total, u: i % 2 ? -.4 : .4, id: t.pads.length }));
    weaps.forEach((f, i) => { for (const lane of [-.5, 0, .5]) t.pads.push({ kind: 'weapon', s: f * total, u: lane, id: t.pads.length }); });
    // a few pads must not sit in the pit strip
    t.pads = t.pads.filter(p => !(p.s > t.pit.s0 - 60 * U && p.s < t.pit.s1 + 20 * U)); t.pads.forEach((p, i) => p.id = i);
    // gap jumps: the deck is missing for a stretch (metres) just past a crest
    t.gaps = (def.gaps || []).map(g => [g[0] * total, g[0] * total + (g[2] || 24) * U]);
    t.minRadius = 1 / t.kmax / U;
    t.lengthM = total / U;
    t.heightRange = [Math.min(...C.map(c => c[2])), Math.max(...C.map(c => c[2]))];
    return t;
  }
  // interpolated frame at arc length s (reuses `out`)
  frameAt(s, out) {
    s = mod(s, this.L); const x = s / this.ds, i = Math.floor(x) % this.n, f = x - Math.floor(x), j = (i + 1) % this.n;
    const o = out || { C: [0, 0, 0], F: [0, 0, 0], R: [0, 0, 0], U: [0, 0, 0], w: 0, bank: 0, k: 0, line: 0, yaw: 0 };
    for (let a = 0; a < 3; a++) { o.C[a] = this.C[i][a] + (this.C[j][a] - this.C[i][a]) * f; o.F[a] = this.F[i][a] + (this.F[j][a] - this.F[i][a]) * f; o.R[a] = this.R[i][a] + (this.R[j][a] - this.R[i][a]) * f; o.U[a] = this.U[i][a] + (this.U[j][a] - this.U[i][a]) * f; }
    const nz = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; v[0] /= l; v[1] /= l; v[2] /= l; };
    nz(o.F); nz(o.R); nz(o.U);
    o.w = this.w[i] + (this.w[j] - this.w[i]) * f; o.bank = this.bank[i] + (this.bank[j] - this.bank[i]) * f; o.k = this.k[i] + (this.k[j] - this.k[i]) * f;
    o.line = this.lineU[i] + (this.lineU[j] - this.lineU[i]) * f; o.yaw = this.yaw[i];
    return o;
  }
  // world position at (s, u, h)
  pos(s, u, h, out) { const f = this.frameAt(s, this._tmp || (this._tmp = null)); const o = out || [0, 0, 0]; for (let a = 0; a < 3; a++) o[a] = f.C[a] + f.R[a] * u + f.U[a] * h; return o; }
  speedLine(s, ahead = 0) { const i = Math.floor(mod(s + ahead, this.L) / this.ds) % this.n; return this.vline[i]; }
  curvAhead(s, d) { let m = 0, sg = 0; for (let x = 0; x <= d; x += this.ds * 2) { const i = Math.floor(mod(s + x, this.L) / this.ds) % this.n; if (Math.abs(this.k[i]) > m) { m = Math.abs(this.k[i]); sg = Math.sign(this.k[i]); } } return m * sg; }
  inGap(s) { const ss = mod(s, this.L); for (const g of this.gaps) if (ss >= g[0] && ss <= g[1]) return g; return null; }
  inPit(s, u, w) { const ss = mod(s, this.L); return ss >= this.pit.s0 && ss <= this.pit.s1 && u > this.pit.u0 * w; }
}
SN.Track = Track;
SN.trackCache = {};
SN.getTrack = id => SN.trackCache[id] || (SN.trackCache[id] = Track.build(SN.TRACKS[id]));
})();
