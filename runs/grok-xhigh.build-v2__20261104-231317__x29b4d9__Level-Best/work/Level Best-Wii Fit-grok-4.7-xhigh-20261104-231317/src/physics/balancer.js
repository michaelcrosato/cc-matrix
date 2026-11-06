/** The balance core. One step, shared by every standing event and by the tests. */

export const DEG = Math.PI / 180;
const COM = 0.75;

export function freshBalance() {
  return {
    wishX: 0,
    wishZ: 0,
    wx: 0,
    wz: 0,
    leanX: 0,
    leanZ: 0,
    flailLeft: 0,
    flailCool: 0,
    fallen: false,
    falls: 0,
    recoverLeft: 0,
    grace: 0,
    nxHold: 0,
    nzHold: 0,
  };
}

export function constantsFor(margin, zeta) {
  const G = 9.81 * COM;
  const I = COM * COM + 0.06;
  const K = G * (1 + margin);
  const wn = Math.sqrt(Math.max(0, (K - G) / I));
  const D = 2 * zeta * wn * I;
  return { G, I, K, D, limit: K - G };
}

export function readLean(body) {
  const q = body.rotation();
  const ux = 2 * (q.x * q.y - q.w * q.z);
  const uy = 1 - 2 * (q.x * q.x + q.z * q.z);
  const uz = 2 * (q.y * q.z + q.w * q.x);
  const leanX = Math.atan2(ux, uy);
  const leanZ = Math.atan2(uz, uy);
  const tilt = Math.atan2(Math.hypot(ux, uz), uy);
  return { leanX, leanZ, tilt, ux, uy, uz };
}

/** Slow sway plus a little tremor. ph comes from the event seed. Units are N·m. */
export function swayTorque(time, ph, sway, tremor) {
  const nx = sway * (Math.sin(time * 0.9 + ph) * 0.6 + Math.sin(time * 1.73 + ph * 2.1) * 0.4)
    + tremor * (Math.sin(time * 8.2 + 1.1) * 0.6 + Math.sin(time * 18.3) * 0.4);
  const nz = sway * (Math.sin(time * 0.77 + ph * 1.7) * 0.6 + Math.sin(time * 1.51 + ph * 0.6) * 0.4)
    + tremor * (Math.sin(time * 7.1 + 2.3) * 0.6 + Math.sin(time * 15.7 + 0.7) * 0.4);
  return { nx, nz };
}

export function pressFlail(state, cooldown) {
  if (state.flailCool > 0 || state.flailLeft > 0 || state.fallen) return false;
  state.flailLeft = 0.35;
  state.flailCool = cooldown;
  return true;
}

export function tickTimers(state, dt) {
  if (state.flailLeft > 0) state.flailLeft = Math.max(0, state.flailLeft - dt);
  if (state.flailCool > 0) state.flailCool = Math.max(0, state.flailCool - dt);
  if (state.grace > 0) state.grace = Math.max(0, state.grace - dt);
  if (state.recoverLeft > 0) state.recoverLeft = Math.max(0, state.recoverLeft - dt);
}

/**
 * Apply the ankle torque for one fixed step. Call before world.step().
 * tune: { maxLean (deg), margin, zeta, ankleMax, reflex, flailBoost, swayScale, disturbScale }
 * nx, nz are disturbances in N·m, added after the ankle clamp.
 */
export function balanceStep(body, state, dt, tune, nx = 0, nz = 0) {
  if (!body.isEnabled()) return readLean(body);
  const maxLean = tune.maxLean * DEG;
  const reflex = tune.reflex;
  const r = 1 - Math.exp(-reflex * dt);
  state.wx += (state.wishX - state.wx) * r;
  state.wz += (state.wishZ - state.wz) * r;
  const tx = state.wx * maxLean;
  const tz = state.wz * maxLean;
  const lean = readLean(body);
  state.leanX = lean.leanX;
  state.leanZ = lean.leanZ;
  const { G, K, D } = constantsFor(tune.margin, tune.zeta);
  const w = body.angvel();
  let Tx = -(G * Math.sin(tx) + K * (lean.leanX - tx)) + D * w.z;
  let Tz = -(G * Math.sin(tz) + K * (lean.leanZ - tz)) - D * w.x;
  const limit = tune.ankleMax * (state.flailLeft > 0 ? tune.flailBoost : 1);
  const m = Math.hypot(Tx, Tz);
  if (m > limit) {
    Tx *= limit / m;
    Tz *= limit / m;
  }
  const ds = tune.disturbScale ?? 1;
  const ss = tune.swayScale ?? 1;
  body.resetTorques(true);
  body.addTorque({ x: Tz + nz * ds * ss, y: -w.y * 0.6, z: -(Tx + nx * ds * ss) }, true);
  return lean;
}

/** After world.step(), decide whether this lean is a fall. */
export function checkFall(body, state, tune, godMode = false) {
  if (godMode || state.fallen || state.grace > 0 || !body.isEnabled()) return false;
  const lean = readLean(body);
  state.leanX = lean.leanX;
  state.leanZ = lean.leanZ;
  if (lean.tilt >= tune.fallAngle * DEG) {
    state.fallen = true;
    state.falls += 1;
    state.recoverLeft = tune.recoverTime;
    return true;
  }
  return false;
}

/** Put the core back on its foot. Clears the cached lean so it does not fall again at once. */
export function resetCore(doll, state) {
  const { body } = doll;
  body.setEnabled(true);
  body.setTranslation({ x: doll.homeX, y: 0.75, z: doll.homeZ }, true);
  body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  state.leanX = 0;
  state.leanZ = 0;
  state.wx = 0;
  state.wz = 0;
  state.wishX = 0;
  state.wishZ = 0;
  state.fallen = false;
  state.grace = 0.35;
  state.recoverLeft = 0;
}

export function tuneFrom(values, extra = {}) {
  return {
    maxLean: extra.maxLean ?? values.maxLean,
    margin: extra.margin ?? values.margin,
    zeta: values.zeta,
    ankleMax: (extra.ankleMax ?? values.ankleMax) * (extra.ankleMul ?? 1),
    reflex: extra.reflex ?? values.reflex,
    flailBoost: values.flailBoost,
    fallAngle: values.fallAngle,
    recoverTime: values.recoverTime,
    swayScale: (extra.swayScale ?? 1) * (values.swayScale ?? 1),
    disturbScale: extra.disturbScale ?? 1,
  };
}

/** Difficulty: Gentle / Standard / Honest. */
export function difficultyOf(name) {
  if (name === 'gentle') return { ankleMul: 1.25, disturb: 0.65, rhythm: 1.4 };
  if (name === 'honest') return { ankleMul: 0.9, disturb: 1.2, rhythm: 0.8 };
  return { ankleMul: 1, disturb: 1, rhythm: 1 };
}

export function cobOf(state, maxLeanDeg) {
  const m = Math.max(1e-4, maxLeanDeg * DEG);
  return { x: state.leanX / m, z: state.leanZ / m };
}
