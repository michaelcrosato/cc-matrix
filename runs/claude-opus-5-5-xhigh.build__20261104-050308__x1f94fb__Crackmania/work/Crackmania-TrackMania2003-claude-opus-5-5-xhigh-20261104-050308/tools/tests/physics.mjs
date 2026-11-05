// covers: src/car/sim.js, src/track/physics.js, src/race/course.js, src/config.js
import { E } from '../node-env.mjs';
import { compile } from '../../src/track/track.js';
import { Course } from '../../src/race/course.js';
import { newCar, placeCar, stepCar, tuning, carHash } from '../../src/car/sim.js';
import { frameAt } from '../../src/track/blocks.js';
import { LIFT } from '../../src/track/geometry.js';
import { add, mul, dot, len } from '../../src/lib/v3.js';
const dt = 1 / 120, R = () => E.RAPIER;
const course = (program, env = 'dustbowl') => new Course(compile({ id: 'P', env, start: [2, 10], program }), R());
function at(c, type, s, kmh, model = 'coyote') { const b = c.track.blocks.find(q => q.type === type), car = newCar(model), T = tuning(model), f = frameAt(b, s); f.p = add(f.p, f.u, LIFT); placeCar(car, f, T); car.v = mul(car.f, kmh / 3.6); return { car, T }; }
function drive(c, car, T, secs, ctl) { const log = []; for (let i = 0; i < secs * 120; i++) { stepCar(car, typeof ctl === 'function' ? ctl(car, i) : ctl, dt, c.ph, T, { assist: c.assistOf }); log.push(car); } return car; }
export default T => {
  const S = course('ST S26 FN');
  { const { car, T: tu } = at(S, 'ST', 8, 0); let t100 = null; let top = 0; for (let i = 0; i < 120 * 30; i++) { stepCar(car, { gas: 1 }, dt, S.ph, tu); top = Math.max(top, car.kmh); if (t100 === null && car.kmh >= 100) t100 = i / 120; }
    T.check('0-100 km/h in 2.3-3.3 s', t100 >= 2.3 && t100 <= 3.3, 't=' + t100); T.check('top speed reaches 97% of vtop', top >= 230 * .97, top.toFixed(1)); }
  { const { car, T: tu } = at(S, 'S', 0, 100); const x0 = car.p[0]; drive(S, car, tu, 3, { brake: 1 }); T.check('100-0 braking in 12-22 m', car.p[0] - x0 >= 12 && car.p[0] - x0 <= 22, (car.p[0] - x0).toFixed(1) + ' m'); }
  // bends: a wide right at 90 holds the lane, at 130 it runs wide; a tight right at 80 runs wide
  const bend = (type, kmh) => { const c = course('ST S2 ' + type + ' S3 FN'), { car, T: tu } = at(c, 'S', 16, kmh); const b = c.track.blocks.find(q => q.type === type); let worst = 0; for (let i = 0; i < 240; i++) { const sp = car.kmh, want = kmh; const ctl = { steer: 0, gas: sp < want ? .6 : 0 }; let near = null, nd = 1e9; for (let s = 0; s <= 80; s += 1) { const f = frameAt(b, Math.min(s, 75)), d = len(add(car.p, f.p, -1)); if (d < nd) { nd = d; near = f; } } const e = dot(add(car.p, near.p, -1), near.r); ctl.steer = Math.max(-1, Math.min(1, -e * .4 + (type[0] === 'R' ? .55 : -.55) * (nd < 30 ? 1 : 0))); stepCar(car, ctl, dt, c.ph, tu); if (nd < 40) worst = Math.max(worst, Math.abs(e)); } return worst; };
  T.check('R2 at 90 km/h holds the lane', bend('R2', 90) < 6, bend('R2', 90).toFixed(1));
  // the loop: full throttle from >= 60 km/h stays on, exits upright; <= 40 km/h drops at the top; coasting >= 115 holds, <= 95 fails
  const L = course('ST S LOOPR S3 FN');
  const loop = (kmh, gas) => { const { car, T: tu } = at(L, 'LOOPR', 31, kmh); let held = true, minUp = 1; for (let i = 0; i < 600; i++) { stepCar(car, { gas }, dt, L.ph, tu, { assist: L.assistOf }); if (!car.grounded && !car.flop) held = false; minUp = Math.min(minUp, car.u[2]); } return { held, minUp, up: car.u[2] }; };
  for (const v of [60, 100, 150]) { const r = loop(v, 1); T.check('loop held at ' + v + ' km/h full gas', r.held && r.minUp < -.9 && r.up > .9, JSON.stringify(r)); }
  T.check('loop drops at 40 km/h', !loop(40, 1).held);
  T.check('loop coasting holds at 120', loop(120, 0).held); T.check('loop coasting fails at 95', !loop(95, 0).held || loop(95, 0).minUp > -.5);
  // a crest: the steep hill at 120 km/h throws you
  { const c = course('ST S2 U1 S3 FN'), { car, T: tu } = at(c, 'S', 0, 120); drive(c, car, tu, 5, () => ({ gas: 1 })); T.check('U1 crest at 120 km/h: airborne', car.airMax > .15, 'air ' + car.airMax.toFixed(2)); }
  // the kicker over a 2-cell canyon lands on the landing at speed
  { const c = course('ST S3 BO S KI GAP2 LA S3 FN'), { car, T: tu } = at(c, 'S', 0, 170); const land = c.track.blocks.find(b => b.type === 'LA'); drive(c, car, tu, 7, { gas: 1 }); T.check('kicker clears the gap', car.p[2] > -1 && car.p[0] > frameAt(land, 0).p[0], car.p.map(v => v.toFixed(1)).join(',')); }
  // a wall: no penetration, speed partly kept
  { const c = course('ST S2 R2 S3 FN'); const b = c.track.blocks.find(q => q.type === 'R2'), f = frameAt(b, 20); const car = newCar('coyote'), tu = tuning('coyote'); placeCar(car, { p: add(add(f.p, f.r, -3), [0, 0, LIFT]), t: f.t, u: f.u }, tu); car.v = mul(add(f.t, f.r, -.6), 100 / 3.6 / 1.166); const v0 = car.kmh || 100; let minOut = 0; for (let i = 0; i < 240; i++) { stepCar(car, { gas: 0 }, dt, c.ph, tu); const e = dot(add(car.p, f.p, -1), f.r); minOut = Math.min(minOut, e); }
    T.check('wall at 100 km/h: no penetration', minOut > -9.5, 'lateral ' + minOut.toFixed(2)); T.check('wall: speed partly kept', car.kmh > 25, car.kmh.toFixed(0)); }
  // ice: less traction from standstill, cornering slower
  { const ci = course('ST IS10 FN', 'frostpeak'), ca = course('ST S10 FN', 'frostpeak'); const a1 = at(ci, 'IS', 4, 0, 'coyote'), a2 = at(ca, 'S', 4, 0, 'coyote'); drive(ci, a1.car, a1.T, .5, { gas: 1 }); drive(ca, a2.car, a2.T, .5, { gas: 1 }); T.check('ice caps acceleration', a1.car.kmh <= a2.car.kmh * .6, a1.car.kmh.toFixed(1) + ' vs ' + a2.car.kmh.toFixed(1)); }
  // a boost pad adds at least 9 m/s
  { const c = course('ST S BO S4 FN'), { car, T: tu } = at(c, 'BO', 2, 60); const v0 = len(car.v); drive(c, car, tu, .6, { gas: 0 }); T.check('boost pad adds >= 9 m/s', len(car.v) - v0 >= 7, (len(car.v) - v0).toFixed(1)); }
  // flop: upside down on the road, upright within a second
  { const { car, T: tu } = at(S, 'S', 10, 0); car.u = [0, 0, -1]; car.r = [0, -1, 0]; car.p[2] += 1.5; car.grounded = false; drive(S, car, tu, 2, { gas: 0 }); T.check('flop recovers upright', car.u[2] > .9, car.u.map(v => v.toFixed(2)).join(',')); }
  // determinism: the same inputs twice, the same state
  const h = () => { const c = course('ST S2 R2 S U1 S2 L2 S FN'), { car, T: tu } = at(c, 'ST', 8, 0); for (let i = 0; i < 1200; i++) stepCar(car, { gas: 1, steer: Math.sin(i / 60) * .5, brake: i % 300 < 20 ? 1 : 0 }, dt, c.ph, tu); return carHash(car); };
  T.eq('deterministic', h(), h());
};
