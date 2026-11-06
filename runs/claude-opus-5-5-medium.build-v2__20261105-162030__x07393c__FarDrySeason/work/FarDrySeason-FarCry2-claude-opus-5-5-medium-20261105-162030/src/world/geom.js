export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
  const t = l ? clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1) : 0;
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
export function polyDist(px, pz, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) best = Math.min(best, segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return best;
}
export function polyLength(pts) { let l = 0; for (let i = 0; i + 1 < pts.length; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return l; }
/** A point at distance s along a polyline, with the heading of its segment (radians: 0 faces +Z). */
export function polyPoint(pts, s, out = {}) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dz);
    if (s <= l || i + 2 === pts.length) { const t = l ? s / l : 0; out.x = pts[i][0] + dx * t; out.z = pts[i][1] + dz * t; out.yaw = Math.atan2(dx, dz); out.seg = i; return out; }
    s -= l;
  }
  return out;
}
export function angleDiff(a, b) { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
