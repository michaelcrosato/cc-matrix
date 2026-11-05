/* 20-ball: the ball is a closed-form launch, never an integrated body: every machine computes the same path from
 * the same launch. A launch: { t0, p: [x,y,z], v: [vx,vy,vz], g, k, kind, side } and its events (net, landing).
 *   tau = t - t0; e = exp(-k tau)
 *   x = x0 + vx(1-e)/k;  y = y0 + vy(1-e)/k;  z = z0 + (vz + g/k)(1-e)/k - g tau/k
 *   velocity: (vx e, vy e, (vz + g/k) e - g/k) */
G.C = { X0: 224, X1: 480, Y0: 176, Y1: 304, NET_X: 352, NET_H: 44, CY: 240, RB: 3.5, TILE: 16, ANT: 64 };
G.KMIN = .001;
G.launchMake = function (o) {
  const k = Math.max(G.KMIN, o.k !== undefined ? o.k : G.T.ballDrag), g = o.g !== undefined ? o.g : G.T.ballGravity;
  const L = { t0: o.t0, p: o.p.slice(), v: o.v.slice(), k, g, kind: o.kind || 'pass', side: o.side === undefined ? -1 : o.side, from: o.from, by: o.by || null, id: (G._launchId = (G._launchId || 0) + 1) };
  G.launchEvents(L);
  return L;
};
G.flight = function (L, t, out) {
  const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau), ik = 1 / k, gk = L.g * ik, vzk = L.v[2] + gk;
  const o = out || {};
  o.x = L.p[0] + L.v[0] * (1 - e) * ik;
  o.y = L.p[1] + L.v[1] * (1 - e) * ik;
  o.z = L.p[2] + vzk * (1 - e) * ik - gk * tau;
  o.vx = L.v[0] * e; o.vy = L.v[1] * e; o.vz = vzk * e - gk;
  return o;
};
G.flightAt = (L, t) => G.flight(L, t, {});
/* solve a monotone-ish function for its crossing of zero in [lo, hi] by bisection */
G.bisect = function (f, lo, hi, iters) {
  let a = lo, b = hi, fa = f(a);
  for (let i = 0; i < (iters || 40); i++) {
    const m = (a + b) / 2, fm = f(m);
    if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
};
/* the launch's events, computed once: the net crossing and the landing */
G.launchEvents = function (L) {
  const C = G.C, r = C.RB;
  L.tNet = null; L.tLand = null;
  const toNet = L.v[0] !== 0 && Math.sign(C.NET_X - L.p[0]) === Math.sign(L.v[0]);
  if (toNet) {
    const f = t => G.flightAt(L, t).x - C.NET_X;
    const lo = L.t0, hi = L.t0 + 6;
    if (f(lo) * f(hi) <= 0) L.tNet = G.bisect(f, lo, hi, 44);
  }
  // landing: the first time after the apex that z falls through r
  let tPrev = L.t0, step = 1 / 60, t = L.t0, found = null;
  for (let n = 0; n < 60 * 12; n++) {
    t = L.t0 + n * step;
    const s = G.flightAt(L, t);
    if (s.z <= r && (s.vz <= 0 || n > 0)) {
      if (n === 0) { found = L.t0; break; }
      found = G.bisect(tt => G.flightAt(L, tt).z - r, tPrev, t, 40);
      break;
    }
    tPrev = t;
  }
  if (found !== null) { L.tLand = found; const s = G.flightAt(L, found); L.landX = s.x; L.landY = s.y; }
  if (L.tNet !== null) { const s = G.flightAt(L, L.tNet); L.netX = s.x; L.netY = s.y; L.netZ = s.z; }
};
/* the time after the apex that the ball falls through height h, from time `from` on (null if never) */
G.timeAtHeight = function (L, h, from) {
  const end = L.tLand !== null ? L.tLand : L.t0 + 8;
  let t0 = Math.max(from !== undefined ? from : L.t0, L.t0);
  let prev = G.flightAt(L, t0), step = 1 / 60;
  for (let t = t0 + step; t <= end + 1e-6; t += step) {
    const s = G.flightAt(L, t);
    if (prev.z > h && s.z <= h && s.vz <= 0) return G.bisect(tt => G.flightAt(L, tt).z - h, t - step, t, 40);
    prev = s;
  }
  return null;
};
/* launch a ball from p so that it arrives at target (x, y, z) at time T after t0 */
G.aimVel = function (p, target, T, g, k) {
  k = Math.max(G.KMIN, k); const e = Math.exp(-k * T), ik = 1 / k, gk = g * ik, den = (1 - e);
  return [(target[0] - p[0]) * k / den, (target[1] - p[1]) * k / den, ((target[2] - p[2]) + gk * T) * k / den - gk];
};
/* the net outcome of a launch, once it has crossed */
G.netOutcome = function (L) {
  const C = G.C, r = C.RB;
  if (L.tNet === null) return 'none';
  if (Math.abs(L.netY - C.CY) > C.ANT + r) return 'antenna';
  if (L.netZ - r > C.NET_H) return 'clear';
  if (L.netZ + r >= C.NET_H - 3) return 'cord';
  return 'net';
};
/* where a ball lands: which court, and whether it is in */
G.landCourt = function (L) {
  const C = G.C, r = C.RB;
  if (L.tLand === null) return null;
  const inside = L.landX >= C.X0 - r && L.landX <= C.X1 + r && L.landY >= C.Y0 - r && L.landY <= C.Y1 + r;
  return { side: L.landX < C.NET_X ? 0 : 1, inside };
};
