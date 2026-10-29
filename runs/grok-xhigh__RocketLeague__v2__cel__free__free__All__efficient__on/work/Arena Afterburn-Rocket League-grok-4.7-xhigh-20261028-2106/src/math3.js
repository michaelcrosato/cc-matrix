/** Vectors and the one car basis. Euler order matches Three.js 'YXZ' (pitch, yaw, roll). */

export function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function len(a) {
  return Math.hypot(a.x, a.y, a.z);
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

/**
 * Columns of the Three.js YXZ matrix.
 * Local forward is −Z. yaw 0 → forward (0,0,−1), right (1,0,0), up (0,1,0).
 * Positive pitch raises the nose (forward gains +Y).
 */
export function carAxes(yaw, pitch, roll) {
  const c1 = Math.cos(pitch);
  const s1 = Math.sin(pitch);
  const c2 = Math.cos(yaw);
  const s2 = Math.sin(yaw);
  const c3 = Math.cos(roll);
  const s3 = Math.sin(roll);
  const right = {
    x: c2 * c3 + s1 * s2 * s3,
    y: s3 * c1,
    z: -s2 * c3 + s1 * c2 * s3,
  };
  const up = {
    x: -c2 * s3 + s1 * s2 * c3,
    y: c1 * c3,
    z: s2 * s3 + s1 * c2 * c3,
  };
  const back = {
    x: s2 * c1,
    y: -s1,
    z: c1 * c2,
  };
  const forward = { x: -back.x, y: -back.y, z: -back.z };
  return { right, up, forward, back };
}

/** Yaw whose flat forward (−Z at yaw 0) aligns with dir on the ground plane. */
export function yawFromFlatDirection(dir) {
  return Math.atan2(-dir.x, -dir.z);
}

export function worldToLocal(origin, axes, point) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dz = point.z - origin.z;
  return {
    x: dx * axes.right.x + dy * axes.right.y + dz * axes.right.z,
    y: dx * axes.up.x + dy * axes.up.y + dz * axes.up.z,
    z: dx * axes.back.x + dy * axes.back.y + dz * axes.back.z,
  };
}

export function localToWorld(origin, axes, local) {
  return {
    x: origin.x + axes.right.x * local.x + axes.up.x * local.y + axes.back.x * local.z,
    y: origin.y + axes.right.y * local.x + axes.up.y * local.y + axes.back.y * local.z,
    z: origin.z + axes.right.z * local.x + axes.up.z * local.y + axes.back.z * local.z,
  };
}
