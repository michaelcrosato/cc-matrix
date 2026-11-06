// The Island Jog path: a closed Catmull-Rom loop around the whole island, ~220 m. Pure data and math.
const BASE = [
  [0, 11], [6, 13.5], [12, 12], [17, 9], [20, 4], [18, 0], [20, -5], [17, -9], [20, -13], [14, -16], [9, -13], [8, -8], [3, -11], [-3, -14.5], [-9, -12], [-13, -15], [-19, -12], [-18, -6], [-20, -1], [-17, 3], [-19, 8], [-14, 12], [-8, 10.5], [-4, 14], [-0.5, 12.5],
];
/** Detour waypoints: a midpoint pushed sideways between each pair, so the path winds. */
export const WAYPOINTS = BASE.flatMap((p, i) => { const q = BASE[(i + 1) % BASE.length], mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, dx = q[0] - p[0], dz = q[1] - p[1], d = Math.hypot(dx, dz) || 1, off = (i % 2 ? -1 : 1) * 3.4; return [p, [mx - dz / d * off, mz + dx / d * off]]; });
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((i) => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
}
/** Sample the closed curve densely: [{x, z, s}] with arc length s. */
export function buildPath(pts = WAYPOINTS, per = 16) {
  const n = pts.length, out = []; let s = 0;
  for (let i = 0; i < n; i++) for (let k = 0; k < per; k++) {
    const p = cr(pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n], k / per);
    if (out.length) s += Math.hypot(p[0] - out[out.length - 1].x, p[1] - out[out.length - 1].z);
    out.push({ x: p[0], z: p[1], s });
  }
  const last = out[out.length - 1], first = out[0]; s += Math.hypot(first.x - last.x, first.z - last.z);
  return { pts: out, length: s };
}
/** Position and heading at arc length s (clamped, not wrapped). */
export function pathAt(path, s) {
  s = Math.max(0, Math.min(path.length - 0.001, s));
  const a = path.pts; let lo = 0, hi = a.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m].s <= s) lo = m; else hi = m; }
  const p = a[lo], q = a[Math.min(a.length - 1, lo + 1)], k = q.s > p.s ? (s - p.s) / (q.s - p.s) : 0;
  const x = p.x + (q.x - p.x) * k, z = p.z + (q.z - p.z) * k, dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1;
  return { x, z, dx: dx / d, dz: dz / d, yaw: Math.atan2(dx, dz) };
}
