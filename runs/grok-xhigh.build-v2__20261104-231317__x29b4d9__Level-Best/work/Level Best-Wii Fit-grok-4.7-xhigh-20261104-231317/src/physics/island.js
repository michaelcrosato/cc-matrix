import { DEG } from './balancer.js';

/** Tilt gravity. The island mesh rotates; Rapier stays on a fixed disc. */
export function createTilt(restDeg = 9) {
  return { tx: restDeg * DEG, tz: 0, vx: 0, vz: 0 };
}

export function stepTilt(st, dt, restX, restZ, px, pz, spring = 2.2, rimDeg = 4) {
  const K = spring;
  const C = 1.8;
  const W = (K * (rimDeg * DEG)) / 22;
  st.vx += (K * restX + W * px - K * st.tx - C * st.vx) * dt;
  st.tx += st.vx * dt;
  st.vz += (K * restZ + W * pz - K * st.tz - C * st.vz) * dt;
  st.tz += st.vz * dt;
  return st;
}

export function gravityFromTilt(tx, tz, g = 9.81) {
  const a = Math.hypot(tx, tz);
  return { x: g * Math.sin(tx), y: -g * Math.cos(a), z: g * Math.sin(tz) };
}

/** Rest tilt in radians. Progress, not skill: 9° times the steps still ahead. */
export function restTiltRad(completed, total, restDeg = 9) {
  const t = Math.max(1, total);
  const c = Math.max(0, Math.min(t, completed));
  return restDeg * DEG * (1 - c / t);
}

export function tiltQuaternion(tx, tz) {
  const a = Math.hypot(tx, tz) || 1e-9;
  const s = Math.sin(a / 2);
  return { x: (tz / a) * s, y: 0, z: (-tx / a) * s, w: Math.cos(a / 2) };
}

/** Detune in cents. Exactly 0 when the island is level. */
export function detuneCents(tiltRad, time) {
  const deg = Math.abs(tiltRad) * (180 / Math.PI);
  if (deg === 0) return 0;
  return deg * 1.6 * Math.sin(time * 0.7);
}
