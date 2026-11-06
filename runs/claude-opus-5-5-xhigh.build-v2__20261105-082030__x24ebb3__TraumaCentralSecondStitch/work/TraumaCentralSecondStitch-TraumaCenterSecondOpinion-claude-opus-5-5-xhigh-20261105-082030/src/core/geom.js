// Plain geometry on the operating field. No engine, no DOM.
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/** A curved or straight path from `at`, heading `dir` degrees (0 = +x, 90 = +z, screen down), curving `arc` radians. */
export function arcPath(at, dir, len, arc = 0, n = 0) {
  const steps = n || Math.max(2, Math.ceil(len / 0.25));
  let h = (dir * Math.PI) / 180;
  const dh = arc / steps;
  const out = [[at[0], at[1]]];
  let x = at[0], z = at[1];
  const ds = len / steps;
  for (let i = 0; i < steps; i++) {
    h += dh;
    x += Math.cos(h) * ds;
    z += Math.sin(h) * ds;
    out.push([round3(x), round3(z)]);
  }
  return out;
}
export const round3 = (v) => Math.round(v * 1000) / 1000;
export function circlePath(cx, cz, r, n = 28, start = -Math.PI / 2) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    out.push([round3(cx + Math.cos(a) * r), round3(cz + Math.sin(a) * r)]);
  }
  return out;
}
export function pathLength(path) {
  let l = 0;
  for (let i = 1; i < path.length; i++) l += dist(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
  return l;
}
/** Point at arc length s. */
export function pathAt(path, s, out = [0, 0]) {
  let left = Math.max(0, s);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const l = dist(a[0], a[1], b[0], b[1]);
    if (left <= l || i === path.length - 1) {
      const t = l > 0 ? clamp(left / l, 0, 1) : 0;
      out[0] = a[0] + (b[0] - a[0]) * t;
      out[1] = a[1] + (b[1] - a[1]) * t;
      return out;
    }
    left -= l;
  }
  out[0] = path[0][0];
  out[1] = path[0][1];
  return out;
}
/** Heading (radians) of the path at arc length s. */
export function pathHeading(path, s) {
  let left = Math.max(0, s);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const l = dist(a[0], a[1], b[0], b[1]);
    if (left <= l || i === path.length - 1) return Math.atan2(b[1] - a[1], b[0] - a[0]);
    left -= l;
  }
  return 0;
}
/** Nearest point of the path to (x, z), limited to arc lengths in [sMin, sMax]. */
export function projectPath(path, x, z, sMin = 0, sMax = Infinity) {
  let best = Infinity, bestS = sMin, walked = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l = Math.hypot(dx, dz);
    if (l === 0) continue;
    const end = walked + l;
    if (end >= sMin && walked <= sMax) {
      let t = ((x - a[0]) * dx + (z - a[1]) * dz) / (l * l);
      const tMin = (sMin - walked) / l, tMax = (sMax - walked) / l;
      t = clamp(t, Math.max(0, tMin), Math.min(1, tMax));
      const d = Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
      if (d < best) { best = d; bestS = walked + l * t; }
    }
    walked = end;
  }
  return { s: bestS, d: best };
}
