export const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function pathLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += dist(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]); return L; }
export function pointAt(p, s) {
  for (let i = 1; i < p.length; i++) {
    const l = dist(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]);
    if (s <= l || i === p.length - 1) { const t = l ? clamp(s / l, 0, 1) : 0; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t]; }
    s -= l;
  }
  return p[0];
}
// nearest arc-length parameter on path to (x,z), searching s in [s0, s1]; returns [s, d]
export function nearestS(p, x, z, s0 = 0, s1 = Infinity) {
  let best = 0, bd = Infinity, acc = 0;
  for (let i = 1; i < p.length; i++) {
    const ax = p[i - 1][0], az = p[i - 1][1], bx = p[i][0], bz = p[i][1], l = dist(ax, az, bx, bz);
    if (acc + l >= s0 && acc <= s1 && l > 0) {
      let t = ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (l * l);
      t = clamp(t, clamp((s0 - acc) / l, 0, 1), clamp((s1 - acc) / l, 0, 1));
      const d = dist(x, z, ax + (bx - ax) * t, az + (bz - az) * t);
      if (d < bd) { bd = d; best = acc + t * l; }
    }
    acc += l;
  }
  return [best, bd];
}
export const SAFE = { x: 6, z0: -3.6, z1: 3.0 };
