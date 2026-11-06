// Ray vs sphere and capsule, pure math (no allocation in the hot path beyond results).
const EPS = 1e-9;
/** Distance along a unit ray to a sphere, or -1. */
export function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const mx = ox - cx, my = oy - cy, mz = oz - cz;
  const b = mx * dx + my * dy + mz * dz, c = mx * mx + my * my + mz * mz - r * r;
  if (c > 0 && b > 0) return -1;
  const disc = b * b - c; if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc); return t < 0 ? 0 : t;
}
/** Distance along a unit ray to a capsule (segment a-b, radius r), or -1. Samples the closest-approach analytically with an end-cap sphere check. */
export function rayCapsule(ox, oy, oz, dx, dy, dz, ax, ay, az, bx, by, bz, r) {
  const ex = bx - ax, ey = by - ay, ez = bz - az;
  const wx = ox - ax, wy = oy - ay, wz = oz - az;
  const ee = ex * ex + ey * ey + ez * ez;
  if (ee < EPS) return raySphere(ox, oy, oz, dx, dy, dz, ax, ay, az, r);
  const de = dx * ex + dy * ey + dz * ez, we = wx * ex + wy * ey + wz * ez, dw = dx * wx + dy * wy + dz * wz, ww = wx * wx + wy * wy + wz * wz;
  // infinite cylinder: |w + t d - s e|^2 = r^2 with s = (we + t de)/ee
  const A = 1 - de * de / ee, B = dw - de * we / ee, C = ww - we * we / ee - r * r;
  let best = -1;
  if (Math.abs(A) > 1e-8) {
    const disc = B * B - A * C;
    if (disc >= 0) {
      const t = (-B - Math.sqrt(disc)) / A;
      if (t >= 0) { const s = (we + t * de) / ee; if (s >= 0 && s <= 1) best = t; }
    }
  }
  const t1 = raySphere(ox, oy, oz, dx, dy, dz, ax, ay, az, r), t2 = raySphere(ox, oy, oz, dx, dy, dz, bx, by, bz, r);
  for (const t of [t1, t2]) if (t >= 0 && (best < 0 || t < best)) best = t;
  return best;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function angleDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
export function turnToward(cur, target, maxStep) { const d = angleDiff(cur, target); return Math.abs(d) <= maxStep ? target : cur + Math.sign(d) * maxStep; }
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
