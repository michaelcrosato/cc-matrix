// Polyline helpers. Pure.
export const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function polyLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  return l;
}
export function pointAt(pts, s) {
  let left = s;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = dist(a[0], a[1], b[0], b[1]);
    if (left <= l || i === pts.length - 1) { const t = l > 0 ? clamp(left / l, 0, 1) : 0; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
    left -= l;
  }
  return [pts[0][0], pts[0][1]];
}
/** Nearest point on the path within [from, from+window] of arc length: { s, d, x, z }. */
export function project(pts, x, z, from = 0, window = Infinity) {
  let best = { s: from, d: Infinity, x: 0, z: 0 }, walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    if (l > 0) {
      const lo = clamp((from - walked) / l, 0, 1), hi = clamp((from + window - walked) / l, 0, 1);
      if (hi >= lo && walked + l >= from && walked <= from + window) {
        const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (l * l), lo, hi);
        const px = a[0] + dx * t, pz = a[1] + dz * t, d = dist(x, z, px, pz);
        if (d < best.d) best = { s: walked + l * t, d, x: px, z: pz };
      }
    }
    walked += l;
  }
  return best;
}
export function curve(at, dir, pull, arc, n = 8) {
  const m = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / m, uz = dir[1] / m, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, b = Math.sin(t * Math.PI) * arc;
    pts.push([at[0] + ux * pull * t - uz * b, at[1] + uz * pull * t + ux * b]);
  }
  return pts;
}
export function circle(cx, cz, rx, rz = rx, n = 18, start = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = start + (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]); }
  return pts;
}
export function smoothPath(ctrl, sub = 6) {
  if (ctrl.length < 3) return ctrl.map((p) => [p[0], p[1]]);
  const out = [], P = (i) => ctrl[clamp(i, 0, ctrl.length - 1)];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((a) => 0.5 * (2 * p1[a] + (p2[a] - p0[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (3 * p1[a] - p0[a] - 3 * p2[a] + p3[a]) * t3)));
    }
  }
  out.push([...ctrl[ctrl.length - 1]]);
  return out;
}
