/* 20-ball: the ball is not a Body: it is the current launch { t0, p, v, k, g, ay, wob, by, kind }, flown in closed form on
 * the match clock (drag k, gravity g, an optional side wind ay and a float serve's wobble). Every machine agrees on where
 * it is at any time, which the online play relies on. Each launch precomputes its events: when it crosses the net
 * plane, when it lands and where. */
const K_MIN = 1e-4;
G.Ball = {
  make(t0, p, v, o = {}) {
    const L = { t0, p: p.slice(), v: v.slice(), k: Math.max(K_MIN, o.k !== undefined ? o.k : G.T.ballDrag), g: o.g !== undefined ? o.g : G.T.ballGravity, ay: o.ay || 0, wob: o.wob || null, by: o.by === undefined ? null : o.by, kind: o.kind || 'free' };
    G.Ball.events(L);
    return L;
  },
  /** position at match time t */
  at(L, t) {
    const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau), q = (1 - e) / k;
    let y = L.p[1] + L.v[1] * q + (L.ay ? L.ay * (tau / k - q / k) : 0);
    if (L.wob) y += L.wob.a * Math.sin(L.wob.w * tau + L.wob.ph) * Math.min(1, tau / .3);
    return [L.p[0] + L.v[0] * q, y, L.p[2] + (L.v[2] + L.g / k) * q - L.g * tau / k];
  },
  vel(L, t) {
    const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau);
    return [L.v[0] * e, L.v[1] * e + (L.ay ? L.ay * (1 - e) / k : 0), (L.v[2] + L.g / k) * e - L.g / k];
  },
  /** the velocity that takes a ball from `from` to `to` in T seconds (wind subtracted) */
  aim(from, to, T, o = {}) {
    const k = Math.max(K_MIN, o.k !== undefined ? o.k : G.T.ballDrag), g = o.g !== undefined ? o.g : G.T.ballGravity, ay = o.ay || 0, d = (1 - Math.exp(-k * T)) / k;
    const vx = (to[0] - from[0]) / d, vy = (to[1] - from[1] - (ay ? ay * (T / k - d / k) : 0)) / d, vz = ((to[2] - from[2]) + g * T / k) / d - g / k;
    return [vx, vy, vz];
  },
  apexT(L) { const k = L.k, a = L.g / k, e = a / (L.v[2] + a); return L.v[2] <= 0 ? L.t0 : L.t0 + (-Math.log(e) / k); },
  /** the time on the way down when the ball is at height h (after `after`), or null */
  timeAtHeight(L, h, after = L.t0) {
    const ta = Math.max(G.Ball.apexT(L), after), za = G.Ball.at(L, ta)[2];
    if (za < h) return null;
    let lo = ta, hi = ta + .05;
    while (G.Ball.at(L, hi)[2] > h) { hi += .05; if (hi - L.t0 > 12) return null; }
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (G.Ball.at(L, m)[2] > h) lo = m; else hi = m; if (hi - lo < 1e-4) break; }
    return (lo + hi) / 2;
  },
  /** the crossing of the net plane and the landing, computed once per launch */
  events(L) {
    const C = G.C, r = C.BALL_R;
    L.tNet = null;
    const vx = L.v[0];
    if (Math.abs(vx) > 1e-6 && (C.NET_X - L.p[0]) / vx > 0) {
      const e = 1 - (C.NET_X - L.p[0]) * L.k / vx;
      if (e > 0) { L.tNet = L.t0 + (-Math.log(e) / L.k); const q = G.Ball.at(L, L.tNet); L.netAt = q; }
    }
    // landing: z = r on the way down
    L.tLand = G.Ball.timeAtHeight(L, r) || L.t0 + 6;
    L.land = G.Ball.at(L, L.tLand);
    L.landIn = L.land[0] >= C.X0 - r && L.land[0] <= C.X1 + r && L.land[1] >= C.Y0 - r && L.land[1] <= C.Y1 + r;
    L.landSide = L.land[0] < C.NET_X ? 0 : 1;
    if (L.tNet !== null && L.tNet > L.tLand) L.tNet = null;   // lands before it reaches the net
    return L;
  },
  /** how the net plane meets this launch: 'clear' | 'tape' | 'net' | 'antenna' (null: it never crosses) */
  netClass(L) {
    if (L.tNet === null) return null;
    const C = G.C, r = C.BALL_R, q = L.netAt;
    if (Math.abs(q[1] - C.CY) > (C.Y1 - C.Y0) / 2 + r) return 'antenna';
    if (q[2] - r > C.NET_H) return 'clear';
    if (q[2] + r >= C.NET_H - 3) return 'tape';
    return 'net';
  },
  sideOf: x => (x < G.C.NET_X ? 0 : 1),
  inCourt(x, y, m = 0) { const C = G.C; return x >= C.X0 + m && x <= C.X1 - m && y >= C.Y0 + m && y <= C.Y1 - m; }
};
/* the ball's sprite: white with blue and yellow panels, turned by its speed */
G.BALL_SPR = [
  E.sprite(['..www..', '.wbbyw.', 'wbwwwyw', 'wbwwyyw', 'wwbyyww', '.wwbbw.', '..www..'], { w: '#f8f6f0', b: '#3a7ad8', y: '#ffd04a' }),
  E.sprite(['..www..', '.wyybw.', 'wywwwbw', 'wyywwbw', 'wwyybww', '.wwyyw.', '..www..'], { w: '#f8f6f0', b: '#3a7ad8', y: '#ffd04a' }),
  E.sprite(['..www..', '.wwbbw.', 'wwbwwyw', 'wbwwwyw', 'wbwwyyw', '.wyyyw.', '..www..'], { w: '#f8f6f0', b: '#3a7ad8', y: '#ffd04a' })
];
G.drawBall = (r, x, y, z, spin = 0, o = {}) => {
  r.shadow(x, y, 4 - Math.min(2, z * .03), .42);
  const fr = G.BALL_SPR[Math.abs(Math.floor(spin)) % 3];
  r.sprite(x, y, z, fr, { anchor: 'center' });
  if (o.trail && o.trail.length > 1) r.queue(x, y, z, g => { px.blend(g, .4, 'add', () => { for (let i = 1; i < o.trail.length; i++) { const a = r.w(...o.trail[i - 1]), b = r.w(...o.trail[i]); px.line(g, a[0], a[1], b[0], b[1], i > o.trail.length - 3 ? '#ffffff' : '#ffd36a', 1); } }); }, { bias: -.5, emissive: true });
};
