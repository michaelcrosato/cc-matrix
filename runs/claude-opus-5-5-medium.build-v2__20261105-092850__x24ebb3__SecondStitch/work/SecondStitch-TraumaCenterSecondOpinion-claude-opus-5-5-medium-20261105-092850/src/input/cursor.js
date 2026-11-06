// The stick/keys tip integrator, pure so a network client moves its own tip with the same numbers.
import { TOOLS } from '../sim/tools.js';
import { validTargets, aimPoint } from '../sim/entities.js';

export const FIELD = { xMin: -7.4, xMax: 7.4, zMin: -4, zMax: 3.6 };
/** Velocity curve from the plan: speed · |s|^2.2 · direction, steady multiplies. */
export function integrateTip(tip, sx, sz, { speed, steady, steadyFactor, assist = 0, stroke = null, near = false, dt = 1 / 60 }) {
  let m = Math.hypot(sx, sz);
  if (m > 1) { sx /= m; sz /= m; m = 1; }
  if (m <= 0) return;
  let v = speed * Math.pow(m, 2.2);
  if (steady) v *= steadyFactor;
  if (near) v *= 1 - 0.4 * Math.min(1, assist / 0.4); // Low = 60% within reach of a valid target
  let vx = (sx / m) * v, vz = (sz / m) * v;
  if (stroke && assist > 0) { // damp drift perpendicular to the stroke
    const dot = vx * stroke[0] + vz * stroke[1];
    const px = vx - stroke[0] * dot, pz = vz - stroke[1] * dot;
    const k = 0.5 * Math.min(1, assist / 0.4);
    vx -= px * k; vz -= pz * k;
  }
  tip.x = Math.max(FIELD.xMin, Math.min(FIELD.xMax, tip.x + vx * dt));
  tip.z = Math.max(FIELD.zMin, Math.min(FIELD.zMax, tip.z + vz * dt));
}
export function nearTarget(sim, seat, x, z) {
  const list = validTargets(sim, seat.tool, seat.table);
  for (const e of list) { const [ax, az] = aimPoint(e); if (Math.hypot(ax - x, az - z) < 0.6) return true; }
  return false;
}
/** Direction of an active stroke at the seat's tip, for perpendicular damping. */
export function strokeDir(sim, seat) {
  const id = seat.stroke ?? seat.dressing;
  if (!id) return null;
  const e = sim.ents.find((c) => c.id === id);
  if (!e?.pts) return null;
  const n = e.pts.length;
  for (let i = 1; i < n; i++) {
    const a = e.pts[i - 1], b = e.pts[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > 0) {
      const t = ((seat.x - a[0]) * (b[0] - a[0]) + (seat.z - a[1]) * (b[1] - a[1])) / (l * l);
      if (t <= 1 || i === n - 1) return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    }
  }
  return null;
}
/** Right-stick flick direction to wheel slot, clockwise from top. */
export function flickSlot(rx, ry) {
  if (Math.hypot(rx, ry) < 0.6) return -1;
  let a = Math.atan2(rx, -ry);
  if (a < 0) a += Math.PI * 2;
  return Math.round(a / (Math.PI / 4)) % 8;
}
export const toolAtSlot = (i) => TOOLS[i];

/** A network client's own tip: it moves at once, and eases toward the host's only once it has drifted over a unit. */
export function correctDrift(tip, serverX, serverZ) {
  if (serverX == null || Math.hypot(serverX - tip.x, serverZ - tip.z) <= 1) return false;
  tip.x += (serverX - tip.x) * 0.04;
  tip.z += (serverZ - tip.z) * 0.04;
  return true;
}
