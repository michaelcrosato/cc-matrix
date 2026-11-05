// Vector helpers in engine axes ([x, y, z]: x east, y south, z up). Positions are engine units (16 a metre).
export const U = 16;
export const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** a vector turned about a unit axis by an angle (Rodrigues) */
export function turn(v, axis, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), d = dot(axis, v) * (1 - c), k = cross(axis, v);
  return [v[0] * c + k[0] * s + axis[0] * d, v[1] * c + k[1] * s + axis[1] * d, v[2] * c + k[2] * s + axis[2] * d];
}
/** the frame of a car or a track point: forward f, right r, up u, with u = f x r0 and r = u x f (a right-handed set) */
export function frameFrom(f, r0) {
  const u = norm(cross(f, r0)), r = norm(cross(u, f));
  return { f, r, u };
}
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const approach = (x, to, step) => (x < to ? Math.min(to, x + step) : Math.max(to, x - step));
