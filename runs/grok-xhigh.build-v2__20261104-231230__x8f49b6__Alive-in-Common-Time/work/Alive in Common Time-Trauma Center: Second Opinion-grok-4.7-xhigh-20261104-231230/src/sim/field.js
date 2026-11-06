export const DT = 1 / 60;
export const TRAY = { x: 1.62, y: 0.2, hw: 0.28, hh: 0.42 };
export const IV = { x: 1.02, y: 0.22 };

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hypot = (x, y) => Math.hypot(x, y);

export function inDrape(x, y) {
  return (x / 1.4) ** 2 + (y / 0.85) ** 2 <= 1 + 1e-6;
}

export function clampTip(x, y) {
  return [clamp(x, -1.55, 1.9), clamp(y, -0.95, 0.95)];
}

export function overTray(x, y) {
  return Math.abs(x - TRAY.x) <= TRAY.hw && Math.abs(y - TRAY.y) <= TRAY.hh;
}

export function dist(ax, ay, bx, by) {
  return hypot(ax - bx, ay - by);
}

export function distPointSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby || 1e-12;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  return { d: hypot(px - qx, py - qy), t, x: qx, y: qy };
}

export function segHit(a, b, c, d) {
  const rpx = b.x - a.x;
  const rpy = b.y - a.y;
  const qpx = d.x - c.x;
  const qpy = d.y - c.y;
  const den = rpx * qpy - rpy * qpx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c.x - a.x) * qpy - (c.y - a.y) * qpx) / den;
  const u = ((c.x - a.x) * rpy - (c.y - a.y) * rpx) / den;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { t, u, x: a.x + rpx * t, y: a.y + rpy * t };
  return null;
}

export function polyLen(points) {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return n;
}

export function projectPoly(points, x, y) {
  let best = null;
  let base = 0;
  for (let i = 1; i < points.length; i++) {
    const hit = distPointSeg(x, y, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    const seg = hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    const along = base + hit.t * seg;
    if (!best || hit.d < best.d) best = { d: hit.d, x: hit.x, y: hit.y, along };
    base += seg;
  }
  return best;
}

export function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
