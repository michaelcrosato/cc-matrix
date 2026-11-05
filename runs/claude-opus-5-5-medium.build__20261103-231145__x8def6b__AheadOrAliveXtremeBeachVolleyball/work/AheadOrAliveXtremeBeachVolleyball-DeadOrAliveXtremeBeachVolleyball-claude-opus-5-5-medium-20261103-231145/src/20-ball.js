/* 20-ball: the ball is not a Body. It is the current launch { t0, p, v, k, g, ay, wob, by, kind }, flown in closed form
 * (drag k, gravity g) so every copy of the game agrees on where it is at any time, with no integration drift. Each new
 * launch precomputes when it crosses the net plane and where it lands. */
G.Ball = {
  R: 3.5,
  make(t0, p, v, o = {}) {
    const L = { t0, p: p.slice(), v: v.slice(), k: Math.max(1e-4, o.k === undefined ? G.T.ballDrag : o.k), g: o.g === undefined ? G.T.ballGravity : o.g, ay: o.ay || 0, wob: o.wob || null, by: o.by === undefined ? -1 : o.by, kind: o.kind || 'pass', side: o.side === undefined ? -1 : o.side, spd: 0 };
    L.spd = Math.hypot(v[0], v[1], v[2]);
    G.Ball.prep(L); return L;
  },
  at(L, t) {
    const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau), g = L.g, [x0, y0, z0] = L.p, [vx, vy, vz] = L.v;
    let y = y0 + vy * (1 - e) / k + L.ay * (tau / k - (1 - e) / (k * k));
    if (L.wob) y += L.wob.a * Math.sin(L.wob.w * tau + L.wob.ph) * Math.min(1, tau / .3);
    return [x0 + vx * (1 - e) / k, y, z0 + (vz + g / k) * (1 - e) / k - g * tau / k];
  },
  vel(L, t) { const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau), g = L.g; return [L.v[0] * e, L.v[1] * e + L.ay * (1 - e) / k, (L.v[2] + g / k) * e - g / k]; },
  /** seconds after t0 at the top of the flight (0 if it starts falling) */
  apexTau(L) { const k = L.k, g = L.g, vz = L.v[2]; if (vz <= 0) return 0; const e = (g / k) / (vz + g / k); return -Math.log(e) / k; },
  /** the time on the descending branch at height h (or null if it never gets that high) */
  timeAtHeight(L, h) {
    const ta = this.apexTau(L), za = this.at(L, L.t0 + ta)[2]; if (za < h) return null;
    let a = ta, b = ta + 0.05; while (this.at(L, L.t0 + b)[2] > h && b < 12) b = b * 1.6 + .05;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (this.at(L, L.t0 + m)[2] > h) a = m; else b = m; }
    return L.t0 + (a + b) / 2;
  },
  /** the time it rises through height h (or null) */
  timeRising(L, h) {
    const ta = this.apexTau(L), z0 = L.p[2]; if (z0 >= h || this.at(L, L.t0 + ta)[2] < h) return null;
    let a = 0, b = ta; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (this.at(L, L.t0 + m)[2] < h) a = m; else b = m; }
    return L.t0 + (a + b) / 2;
  },
  /** solve a launch from `from` to reach `to` ([x, y, z]) after T seconds */
  aim(from, to, T, k = G.T.ballDrag, g = G.T.ballGravity) {
    k = Math.max(1e-4, k); const q = (1 - Math.exp(-k * T)) / k;
    return [(to[0] - from[0]) / q, (to[1] - from[1]) / q, ((to[2] - from[2]) + g * T / k) / q - g / k];
  },
  prep(L) {
    const NX = G.COURT.NET_X, R = this.R, [x0] = L.p, vx = L.v[0], k = L.k;
    // when x crosses the net plane (x is monotonic)
    L.tNet = null;
    if (Math.abs(vx) > 1e-6 && (NX - x0) * vx > 0) { const e = 1 - (NX - x0) * k / vx; if (e > 0 && e < 1) L.tNet = L.t0 - Math.log(e) / k; }
    L.tLand = this.timeAtHeight(L, R) || (L.t0 + 3);
    if (L.tNet !== null && L.tNet > L.tLand) L.tNet = null;
    L.land = this.at(L, L.tLand);
    L.netDone = false;
  },
  /** what happens at the net plane: 'clear' | 'tape' | 'net' | 'outside' */
  netCheck(L) {
    if (L.tNet === null) return null;
    const q = this.at(L, L.tNet), R = this.R, C = G.COURT;
    if (Math.abs(q[1] - C.CY) > 64 + R) return { kind: 'outside', q };
    if (q[2] - R > C.NET_H) return { kind: 'clear', q };
    if (q[2] + R >= C.NET_H - 3) return { kind: 'tape', q };
    return { kind: 'net', q };
  },
  inCourt(p) { const C = G.COURT, R = this.R; return p[0] >= C.X0 - R && p[0] <= C.X1 + R && p[1] >= C.Y0 - R && p[1] <= C.Y1 + R; },
  sideOf(x) { return x < G.COURT.NET_X ? 0 : 1; }
};
/* the ball's look: a white ball with blue and yellow panels, turning with its speed */
G.BALL_SPR = [
  E.sprite(['..wwww..', '.wwbbww.', 'wwbbbyyw', 'wbbwwyyw', 'wwwwyyww', 'wyywwwbw', '.wyyybb.', '..wwww..'], { w: '#f8f8f4', b: '#2a6ad8', y: '#ffd23a' }),
  E.sprite(['..wwww..', '.wyywbw.', 'wwyywbbw', 'wwwwwbbw', 'wbbwwwww', 'wbbbyyww', '.wwbyyw.', '..wwww..'], { w: '#f8f8f4', b: '#2a6ad8', y: '#ffd23a' }),
  E.sprite(['..wwww..', '.wbbwww.', 'wbbbwyyw', 'wwbwwyyw', 'wwwwwyww', 'wyywbbbw', '.wyywbb.', '..wwww..'], { w: '#f8f8f4', b: '#2a6ad8', y: '#ffd23a' })
];
