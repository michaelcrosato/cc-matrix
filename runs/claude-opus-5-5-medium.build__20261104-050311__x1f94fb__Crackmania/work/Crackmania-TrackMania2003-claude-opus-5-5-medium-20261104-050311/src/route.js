// The route sampled every 2 m from Start to Finish: what the bot drives, the camera flies over, the minimap draws and
// progress is measured along. Also the racing line and the speed profile (src/bot.js uses them).
import { BLOCKS } from './blocks.js';
import { ENV_GEO } from './geometry.js';
import { carSI, surfGrip, CFG } from './config.js';
import { dot, cross, sub, len, norm, clamp } from './v3.js';

export function sampleRoute(track, route) {
  const out = []; let dist = 0;
  const hw = ENV_GEO[track.env].roadW / 2 - 1.4;
  route.list.forEach((el, k) => {
    const B = BLOCKS[el.b.type], L = B.path.len, n = Math.max(2, Math.round(L / 2));
    if (el.jump !== undefined && out.length) {   // the air between a kicker and its landing
      const a = out[out.length - 1], f = track.frame(el, 0), gap = len(sub(f.p, a.p)), m = Math.max(1, Math.round(gap / 2));
      for (let i = 1; i < m; i++) { const q = i / m; out.push({ p: [a.p[0] + (f.p[0] - a.p[0]) * q, a.p[1] + (f.p[1] - a.p[1]) * q, a.p[2] + (f.p[2] - a.p[2]) * q], t: a.t, u: [0, 0, 1], r: a.r, d: dist += gap / m, hw, surface: 'air', air: true, block: el.b, k }); }
      dist += gap / m;
    }
    for (let i = (k === 0 ? 0 : 1); i <= n; i++) {
      const s = L * i / n, f = track.frame(el, s);
      if (out.length) dist += len(sub(f.p, out[out.length - 1].p));
      const rs = el.rev ? L - s : s;
      out.push(Object.assign(f, { d: dist, hw: B.cross ? 6 : hw, surface: B.boost && rs >= B.boost[0] && rs <= B.boost[1] ? 'boost' : B.surface, block: el.b, k, loop: !!B.assist, kicker: el.b.type === 'KI', landing: el.b.type === 'LA', gate: B.gate !== null && Math.abs(rs - B.gate) < 3 }));
    }
  });
  // curvature in the surface plane (signed: + turns right)
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 2)], b = out[Math.min(out.length - 1, i + 2)], ds = Math.max(.5, b.d - a.d);
    const c = out[i], ang = Math.asin(clamp(dot(cross(a.t, b.t), c.u), -1, 1));
    c.kappa = c.loop || c.air ? 0 : ang / ds;
  }
  return out;
}

/** a racing line (lateral offsets) and a speed profile for a car. skill 0..1 */
export function plan(samples, carId, skill = 1) {
  const T = carSI(carId), n = samples.length, e = new Float32Array(n);
  // the line: the centreline smoothed toward its neighbours (cuts corners to the inside), held inside the corridor
  const fixed = i => { const s = samples[i]; return s.loop || s.kicker || s.landing || s.gate || s.surface === 'boost' || s.air; };
  for (const w of [8, 4, 2]) for (let it = 0; it < 40; it++) for (let i = w; i < n - w; i++) {
    if (fixed(i)) { e[i] = 0; continue; }
    const s = samples[i], a = samples[i - w], b = samples[i + w];
    const pa = [a.p[0] + a.r[0] * e[i - w], a.p[1] + a.r[1] * e[i - w], a.p[2] + a.r[2] * e[i - w]], pb = [b.p[0] + b.r[0] * e[i + w], b.p[1] + b.r[1] * e[i + w], b.p[2] + b.r[2] * e[i + w]];
    const mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2], cur = [s.p[0] + s.r[0] * e[i], s.p[1] + s.r[1] * e[i], s.p[2] + s.r[2] * e[i]];
    const hw = s.hw * (.6 + .4 * skill);
    e[i] = clamp(e[i] + .5 * dot(sub(mid, cur), s.r), -hw, hw);
  }
  // re-measure curvature along the line, then the speeds
  const pts = samples.map((s, i) => [s.p[0] + s.r[0] * e[i], s.p[1] + s.r[1] * e[i], s.p[2] + s.r[2] * e[i]]);
  const v = new Float32Array(n), G = CFG.gravity * 9.81;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    if (s.loop || s.air || s.kicker || s.landing || s.u[2] < .97) { v[i] = T.vtop * 1.3; continue; }   // (banks hold you)
    const a = pts[Math.max(0, i - 2)], b = pts[i], c = pts[Math.min(n - 1, i + 2)];
    const ab = norm(sub(b, a)), bc = norm(sub(c, b)), ds = Math.max(.5, len(sub(c, a)) / 2);
    const k = Math.abs(Math.asin(clamp(len(cross(ab, bc)), 0, 1))) / ds;
    const sg = surfGrip(s.surface === 'boost' ? 'road' : s.surface, carId), bank = s.u[2] < .995 ? G * Math.sqrt(1 - s.u[2] * s.u[2]) : 0;
    const alat = (T.grip * sg * (.75 + .25 * skill)) * .92 + bank * .9;
    v[i] = k > 1e-4 ? Math.min(T.vtop * 1.3, Math.sqrt(alat / k)) : T.vtop * 1.3;
  }
  // braking: backward pass
  for (let i = n - 2; i >= 0; i--) {
    const ds = Math.max(.1, samples[i + 1].d - samples[i].d), sg = surfGrip(samples[i].surface === 'boost' ? 'road' : samples[i].surface === 'air' ? 'road' : samples[i].surface, carId);
    const B = Math.min(T.B, G * sg * 1.2) * (.75 + .2 * skill);
    v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * B * ds));
  }
  return { e, v, pts };
}
/** the nearest sample to a point, searching a window after `from` (never jumps between a loop's two lanes) */
export function nearest(samples, p, from = 0, back = 6, ahead = 30) {
  let bi = from, bd = 1e18;
  const a = Math.max(0, from - back), b = Math.min(samples.length - 1, from + ahead);
  for (let i = a; i <= b; i++) { const q = samples[i].p, d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2; if (d < bd) { bd = d; bi = i; } }
  return { i: bi, d2: bd };
}
export function nearestGlobal(samples, p) { return nearest(samples, p, 0, 0, samples.length); }
