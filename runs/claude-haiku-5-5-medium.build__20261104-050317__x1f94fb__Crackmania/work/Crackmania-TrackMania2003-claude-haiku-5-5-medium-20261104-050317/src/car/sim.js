// The car: a kinematic, surface-following arcade model (the validated core from the plan, Appendix A), with steering,
// analog throttle and brake, drift grip and boost. Four rays from the wheels find the road; the car is not a rigid body,
// so it holds a loop on the road's own curve when it is fast enough. Positions are engine units; tuning is in metres.
import { U, add, sub, scale, dot, cross, len, norm, turn, clamp } from '../lib/vec.js';

/** the tuning, in metres, m/s and seconds (every value the dev sliders can change is here) */
export const TUNE = {
  gas: 12,          // m/s² at a standstill, full throttle
  vtop: 64,         // m/s the engine runs out at (230 km/h)
  drag: .0004,      // per metre travelled a second, a squared drag
  brake: 18,        // m/s² braking
  reverse: 6,       // m/s² reversing
  vrev: 14,         // m/s the top reverse speed
  grip: 12,         // /s: how fast sideways speed dies on the road
  driftGrip: 2.5,   // /s: the same, drifting (brake and steer at speed)
  steerRate: 2.6,   // rad/s at a standstill
  steerFall: 28,    // m/s at which the steering halves
  adhesion: 9.81,   // m/s² a surface can hold the car on by its own grip, faded out below 15 m/s
  gravity: 9.81,    // m/s²
  boost: 9,         // m/s² extra on a boost pad
  boostTime: 1.1,   // s a boost pad lasts
  align: 30,        // /s: how fast the car's up turns to the road's
  ride: .55,        // m: the car's middle above the road
  reach: .9,        // m: how far it still counts as on the road below that
};
export const TUNE_DEFAULT = Object.freeze(JSON.parse(JSON.stringify(TUNE)));
/** wheels: forward, lateral (right +), in metres */
const WHEELS = [[1.35, -.8], [1.35, .8], [-1.35, -.8], [-1.35, .8]];

export function makeCar(p, f, u = [0, 0, 1]) {
  return { p: p.slice(), v: [0, 0, 0], f: norm(f), u: norm(u), n: norm(u), grounded: false, kappa: 0, slip: 0, load: 0,
    boostT: 0, steer: 0, airT: 0 };
}
export function resetCar(c, p, f, u) {
  Object.assign(c, { p: p.slice(), v: [0, 0, 0], f: norm(f), u: norm(u), n: norm(u), grounded: true, kappa: 0, slip: 0, load: 0, boostT: 0, steer: 0, airT: 0 });
}

/** the road under the car: phys.cast(origin, dir, len) → { toi, n: [x, y, z] } | null (engine units) */
function probe(c, phys, T) {
  const r = cross(c.u, c.f), hits = [], lift = .5 * U, reachLen = lift + (T.ride + T.reach) * U;
  for (const [lx, ly] of WHEELS) {
    const o = add(add(add(c.p, c.f, lx * U), r, ly * U), c.u, lift);
    const h = phys.cast(o, scale(c.u, -1), reachLen);
    if (h) hits.push({ point: add(o, c.u, -h.toi), normal: h.n, d: h.toi - lift });
  }
  return hits;
}

/** one fixed step (dt seconds) with controls ctl = { steer: -1..1, gas: 0..1, brake: 0..1 } */
export function stepCar(c, ctl, dt, phys, T = TUNE) {
  const g = [0, 0, -T.gravity * U], rideU = T.ride * U, reachU = T.reach * U, hits = probe(c, phys, T);
  let n = null, d = 0;
  if (hits.length === 4) { n = norm(cross(sub(hits[1].point, hits[2].point), sub(hits[0].point, hits[3].point))); if (dot(n, c.u) < 0) n = scale(n, -1); }
  else if (hits.length >= 2) n = norm(hits.reduce((s, h) => add(s, h.normal), [0, 0, 0]));
  if (n) d = hits.reduce((s, h) => s + h.d, 0) / hits.length;
  if (n && dot(n, c.u) < .3) n = null;                      // a wall or a ceiling: not the road
  const wasGrounded = c.grounded;
  if (n) {
    const vn = dot(c.v, n), pull = dot(g, n);
    const k0 = c.grounded ? -dot(sub(n, c.n), norm(c.v)) / Math.max(1, len(c.v) * dt) : 0;
    c.kappa = c.grounded ? c.kappa + (k0 - c.kappa) * Math.min(1, dt / .04) : 0;
    const vt2 = Math.max(0, len(c.v) ** 2 - vn * vn), adhesion = T.adhesion * U * Math.min(1, Math.sqrt(vt2) / (15 * U));
    c.load = vt2 * c.kappa - pull + adhesion;
    c.slip = c.load >= 0 ? 0 : c.slip + dt;
    c.grounded = c.grounded ? (c.slip < .06 && d < rideU + reachU) : (vn < 0 && d < rideU + reachU * .6);
  } else c.grounded = false;
  if (c.grounded) {
    c.u = norm(add(c.u, sub(n, c.u), Math.min(1, T.align * dt)));
    c.f = norm(sub(c.f, scale(c.u, dot(c.f, c.u))));
    c.v = sub(c.v, scale(n, dot(c.v, n)));
    const traction = Math.max(0, c.load), sp = dot(c.v, c.f), spm = sp / U;
    // steering: the car turns about its up; less at speed, and drift grip when braking into a turn
    const spd = len(c.v) / U, steerIn = clamp(ctl.steer || 0, -1, 1), rate = T.steerRate / (1 + spd / T.steerFall);
    const drifting = (ctl.brake || 0) > .5 && Math.abs(steerIn) > .3 && spd > 15;
    c.steer += (steerIn - c.steer) * Math.min(1, dt * 8);
    if (Math.abs(spm) > .5 || (ctl.gas || 0) > 0) c.f = norm(turn(c.f, c.u, c.steer * rate * dt * Math.sign(spm || 1)));   // (+ turns right)
    c.f = norm(sub(c.f, scale(c.u, dot(c.f, c.u))));
    // the throttle, the brake and the boost along the road
    let a = sub(g, scale(n, dot(g, n)));
    const boost = c.boostT > 0 ? 1 : 0; c.boostT = Math.max(0, c.boostT - dt);
    const top = T.vtop * (boost ? 1.25 : 1);
    if ((ctl.gas || 0) > 0) a = add(a, c.f, (ctl.gas || 0) * Math.min(traction, (T.gas + (boost ? T.boost : 0)) * U * Math.max(0, 1 - (Math.max(0, spm) / top) ** 1.6)));
    if ((ctl.brake || 0) > 0) {
      if (spm > .5) a = add(a, c.f, -(ctl.brake) * Math.min(traction, T.brake * U));
      else if (spm > -T.vrev) a = add(a, c.f, -(ctl.brake) * Math.min(traction, T.reverse * U));
    }
    a = add(a, c.v, -T.drag * len(c.v) / U);                 // drag: a little more the faster it goes
    const r = cross(c.u, c.f), vl = dot(c.v, r), grip = drifting ? T.driftGrip : T.grip, maxDv = traction * dt;
    c.v = add(c.v, r, -clamp(vl * Math.min(1, grip * dt), -maxDv, maxDv));
    c.v = add(c.v, a, dt);
    c.p = add(c.p, c.v, dt);
    c.p = add(c.p, n, (rideU - d) * Math.min(1, 25 * dt));
    c.n = n;
    c.airT = 0;
  } else {
    c.airT += dt;
    c.v = add(c.v, g, dt);
    c.v = scale(c.v, 1 - T.drag * .3 * (len(c.v) / U) * dt);
    c.p = add(c.p, c.v, dt);
    c.f = norm(add(c.f, sub(norm(c.v), c.f), Math.min(1, 1.5 * dt)));
    const r = norm(cross(c.u, c.f)); c.u = norm(cross(c.f, r)); c.n = c.u;
    c.steer += (0 - c.steer) * Math.min(1, dt * 4);
  }
  c.landed = !wasGrounded && c.grounded;
  return c;
}
