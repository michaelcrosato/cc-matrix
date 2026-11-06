/** @file Pure stroke geometry used by tool rules, aiming assistance and the surgeon bot. */
import type { Point, Target } from '../../data/types';
export const clamp = (n: number, a: number, b: number): number => Math.max(a, Math.min(b, n));
export const dist = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function pathLength(path: Point[]): number {
  let d = 0;
  for (let i = 1; i < path.length; i++) d += dist(path[i - 1], path[i]);
  return d;
}
export function pathAt(path: Point[], along: number): Point {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      d = dist(a, b);
    if (along <= d)
      return [a[0] + (b[0] - a[0]) * clamp(along / d, 0, 1), a[1] + (b[1] - a[1]) * clamp(along / d, 0, 1)];
    along -= d;
  }
  return path.at(-1) ?? [0, 0];
}
export function nearest(
  path: Point[],
  x: number,
  z: number,
): { distance: number; along: number; side: number; point: Point } {
  let distance = Infinity,
    along = 0,
    side = 0,
    sum = 0;
  let point: Point = [x, z];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      l = Math.hypot(dx, dz),
      t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (l * l || 1), 0, 1),
      p: Point = [a[0] + dx * t, a[1] + dz * t],
      d = dist(p, [x, z]);
    if (d < distance) {
      distance = d;
      along = sum + l * t;
      side = Math.sign(dx * (z - a[1]) - dz * (x - a[0]));
      point = p;
    }
    sum += l;
  }
  return { distance, along, side, point };
}
export const distanceTo = (t: Target, x: number, z: number): number =>
  t.path.length ? nearest(t.path, x, z).distance : Math.hypot(t.x - x, t.z - z);
