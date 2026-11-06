import { buildTrack, carParams, newCar, stepCar } from '../src/game/sim/sim.js';
import { CAR_IDS } from '../src/game/data/cars.js';
import { tunedParams } from '../src/game/sim/tuning.js';
export function flatTrack() { return buildTrack({ name: 'flat', corners: [[0, 0, 60, 0, 20, 0], [8000, 0, 60, 0, 20, 0], [8000, 8000, 60, 0, 20, 0], [0, 8000, 60, 0, 20, 0]], runoff: 50 }); }
export function specSheet(id) {
  const tr = flatTrack(), p = tunedParams(id); const c = newCar(p, tr, 2, 0); const res = {};
  const env = { wearRate: 0, fuelRate: 0 }; let t = 0;
  const inp = { steer: 0, throttle: 1, brake: 0, abs: true, tcs: 0.5, asm: 0, auto: true, steerRate: 3 };
  for (let k = 0; k < 240 * 70; k++) { stepCar(c, inp, 1 / 240, tr, env); t += 1 / 240; const v = Math.hypot(c.vx, c.vz) * 3.6; if (!res.z100 && v >= 100) res.z100 = t; if (!res.z200 && v >= 200) res.z200 = t; res.top = v; }
  const c2 = newCar(p, tr, 2, 0); c2.vz = 100 / 3.6; // brake 100->0 (heading may be any direction, use speed)
  const sn = Math.sin(c2.yaw), cs = Math.cos(c2.yaw); c2.vx = sn * 100 / 3.6; c2.vz = cs * 100 / 3.6; c2.gear = 4; let d = 0;
  for (let k = 0; k < 240 * 20 && Math.hypot(c2.vx, c2.vz) > 0.5; k++) { const v0 = Math.hypot(c2.vx, c2.vz); stepCar(c2, { steer: 0, throttle: 0, brake: 1, abs: true, tcs: 0, asm: 0, auto: true, steerRate: 3 }, 1 / 240, tr, env); d += v0 / 240; }
  res.brake = d; return res;
}
if (process.argv[1].endsWith('spec.mjs')) for (const id of CAR_IDS) { const r = specSheet(id); console.log(id.padEnd(9), (r.z100 ?? 0).toFixed(1), (r.z200 ?? 0).toFixed(1), r.top.toFixed(0), r.brake.toFixed(0)); }
