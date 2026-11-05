// The autopilot: it follows the track's centreline with pure pursuit, slows for the bends it can see (sideways bends
// only: a loop is taken at speed), and throttles or brakes to that speed. It drives the same car as the player; it is
// the driver for attract mode, the dev mode's "Drive" and the medal times.
import { U, sub, dot, norm, clamp, len, cross } from '../lib/vec.js';
import { nearestSample } from '../track/turtle.js';

/** the bot's state for one car on one track */
export function makeBot(T, skill = 1) {
  return { T, i: 0, skill, lastI: 0 };
}

/** the sideways bend (radians a metre) at sample i, from the track's own directions (pitch is left out) */
function bendAt(T, i) {
  const a = Math.min(T.n - 1, i + 6), b = Math.max(0, i - 6);
  let d = T.H[a] - T.H[b]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d) / Math.max(1, a - b);
}

/** controls for one step: car (engine units), bot (makeBot), returns { steer, gas, brake } */
export function botControls(car, bot) {
  const T = bot.T, pm = [car.p[0] / U, car.p[1] / U, car.p[2] / U];
  const near = nearestSample(T, pm, bot.i, 30, 60);
  bot.i = near.i;
  const speed = len(car.v) / U;                                // m/s
  const la = 9 + .32 * speed * bot.skill;                      // metres ahead to aim at
  const j = Math.min(T.n - 1, bot.i + Math.round(la));
  const Q = T.P[j], d = norm(sub(Q, pm));
  const dp = sub(d, car.u.map(x => x * dot(d, car.u)));
  // in the car's plane: right (+) or left (-) of its nose
  const r = norm(cross(car.u, car.f));
  const err = Math.atan2(dot(dp, r), dot(dp, car.f));
  const steer = clamp(err * 2.4, -1, 1);
  // speed for the bends ahead: a sideways bend of curvature k takes at most sqrt(maxLat / k)
  let vt = 64;
  for (let k = 0; k <= 60; k += 4) {
    const i = Math.min(T.n - 1, bot.i + k), kap = bendAt(T, i);
    if (kap > 1e-3) vt = Math.min(vt, Math.sqrt((12 * bot.skill) / kap));
  }
  vt = Math.max(vt, 8);
  let gas = 0, brake = 0;
  if (car.grounded) {
    if (speed < vt) gas = 1;
    else if (speed > vt * 1.06) brake = clamp((speed - vt) / 6, 0, 1);
  }
  return { steer, gas, brake, target: j };
}
