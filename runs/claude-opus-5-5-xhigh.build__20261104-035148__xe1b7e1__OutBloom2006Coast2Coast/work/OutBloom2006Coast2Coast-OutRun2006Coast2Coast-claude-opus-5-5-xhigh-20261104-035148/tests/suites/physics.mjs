// physics: top speed and 0-100 per car, brakes, the curve-hold targets, drift entry by all three inputs (none below
// 120), counter-steer, drift score, slipstream and slingshot, off-road, rails, bump against spin, crest air, gusts
import { boot } from '../lib/boot.mjs';
export default async function (t) {
  const { OB } = boot(), dt = 1 / 120;
  const flat = (o = {}) => Object.assign({ curve: 0, curv: 0, onRoad: true, absX: 0, ground: 'grass', edge: null, junction: false, seg: { edgeL: null, edgeR: null }, data: {} }, o);
  const mk = (id = 'orchidea', o = {}) => new OB.CarSim(OB.carStats(id), Object.assign({ transmission: 'auto', driftInput: 'all', assist: 'off' }, o));
  for (const id of OB.CAR_ORDER) {
    const c = mk(id); let tt = 0; while (c.v < 100 && tt < 20) { c.step(dt, { gas: 1, steer: 0 }, flat()); tt += dt; }
    const spec = OB.CARS[id]; t(id + ' 0-100 within 3%', Math.abs(tt - spec.zeroTo100) / spec.zeroTo100 < .03, tt.toFixed(2) + ' vs ' + spec.zeroTo100);
    for (let i = 0; i < 120 * 60; i++) c.step(dt, { gas: 1, steer: 0 }, flat());
    t(id + ' top speed within 3%', Math.abs(c.v - spec.top) / spec.top < .03, c.v.toFixed(1) + ' vs ' + spec.top);
  }
  { const c = mk(); c.v = 200; let tt = 0; while (c.v > 0 && tt < 5) { c.step(dt, { brake: 1, steer: 0 }, flat()); tt += dt; } t('brakes stop from 200 in about a second', tt > .6 && tt < 1.4, tt.toFixed(2)); }
  // the curve-hold design targets: hold at full lock and full speed, does x drift outward?
  const holds = (curve, frac) => { const c = mk(); c.v = c.vtop * frac; c.x = 0; for (let i = 0; i < 240; i++) { c.step(dt, { gas: 1, steer: Math.sign(curve) }, flat({ curve })); c.v = c.vtop * frac; } return c.x * Math.sign(curve) > -.05; };
  t('a curve of 3 holds at full speed', holds(3, 1));
  t('a curve of 4 needs a lift at 95% or more', !holds(4, .95));
  t('a curve of 4 holds at 85%', holds(4, .85));
  t('a curve of 6 cannot be held flat out without a drift', !holds(6, .9));
  const driftHold = () => { const c = mk(); c.v = c.vtop * .86; c._tryDrift({ steer: 1 }, 'test', () => {}); for (let i = 0; i < 240; i++) { c.step(dt, { gas: 1, steer: 1, driftBtn: true }, flat({ curve: 6 })); } return c.x > -.05 || c.drift.on; };
  t('a clean drift takes a 6 at about 85%', driftHold());
  // drift entry
  const entry = (how, v, steer = 1) => { const c = mk(); c.v = v; let started = false; const ev = n => { if (n === 'drift:start') started = true; };
    if (how === 'tap') { for (let i = 0; i < 20; i++) c.step(dt, { gas: 1, brake: 1, steer }, flat(), ev); c.step(dt, { gas: 1, brake: 0, steer }, flat(), ev); }
    if (how === 'button') c.step(dt, { gas: 1, steer, driftPressed: true, driftBtn: true }, flat(), ev);
    if (how === 'shift') { c.o.transmission = 'manual'; c.gear = 4; c.step(dt, { gas: 1, steer, shiftDown: true }, flat(), (n) => ev(n)); c.shiftDownT = OB.now(); c.step(dt, { gas: 1, steer, shiftUp: true }, flat(), ev); }
    return started; };
  for (const how of ['tap', 'button', 'shift']) { t('drift entry by ' + how, entry(how, 220)); t('no drift by ' + how + ' below 120', !entry(how, 100)); }
  t('no drift without steering', !entry('button', 220, 0));
  { const c = mk(); c.v = 220; c._tryDrift({ steer: 1 }, 't', () => {}); for (let i = 0; i < 60; i++) c.step(dt, { gas: 1, steer: 1 }, flat({ curve: 3 })); const a1 = Math.abs(c.drift.a);
    for (let i = 0; i < 60; i++) c.step(dt, { gas: 1, steer: -1 }, flat({ curve: 3 })); t('counter-steer straightens the drift', Math.abs(c.drift.a) < a1, a1.toFixed(2) + ' -> ' + c.drift.a.toFixed(2));
    t('drift score accumulates', c.drift.score > 100 || !c.drift.on, c.drift.score); }
  // slipstream and the slingshot
  { const c = mk(); c.v = 250; let sling = false; for (let i = 0; i < 240; i++) c.step(dt, { gas: 1, steer: 0 }, flat(), (n) => { if (n === 'slingshot') sling = true; }, { ahead: [{ id: 'v1', dz: 900, dx: 0, v: 120 }] });
    t('slipstream builds behind a car', c.slip > .9, c.slip);
    c.step(dt, { gas: 1, steer: 0 }, flat(), (n) => { if (n === 'slingshot') sling = true; }, { ahead: [{ id: 'v1', dz: 900, dx: .6, v: 120 }] });
    t('pulling out fires the slingshot', sling); }
  // off-road, rails, scenery
  { const c = mk(); c.v = 260; for (let i = 0; i < 360; i++) c.step(dt, { gas: 1, steer: 0 }, flat({ onRoad: false, ground: 'grass' })); t('off-road slows to about half', c.v < OB.CARS.orchidea.top * .56, c.v); }
  { const c = mk(); c.v = 200; c.x = 1.1; let scraped = false, spun = false; for (let i = 0; i < 120; i++) c.step(dt, { gas: 1, steer: 1 }, flat({ edge: { kind: 'rail', off: 1.18 }, absX: c.x }), n => { if (n === 'car:scrape') scraped = true; if (n === 'car:crash') spun = true; });
    t('rails scrape without spinning', scraped && !spun && c.x <= 1.18, c.x); }
  { const c = mk(); c.v = 150; c.bump(110, 0, () => {}); t('a slow closing bump matches speed below the other car', c.v < 110 && !c.crash, c.v); }
  { const c = mk(); c.v = 240; c.spin('traffic', () => {}); t('a spin-out drops speed to 30%', c.crash && c.v <= 240 * .31 + 1, c.v); for (let i = 0; i < 200; i++) c.step(dt, { gas: 1 }, flat()); t('after a spin-out the car is back facing ahead', !c.crash && Math.abs(c.x) === .75 && c.invuln > 0, c.x); }
  { const c = mk(); c.v = 260; let air = false; c.step(dt, { gas: 1 }, flat({ curv: -2e-4 }), n => { if (n === 'air:start') air = true; }); t('a big crest gives air', air && c.air); const vx0 = c.vx; c.step(dt, { gas: 1, steer: 1 }, flat()); t('steering is cut in the air', c.air && Math.abs(c.vx - vx0) < .1); }
  { const c = mk(); c.v = 250; c.gust = { t: 0, dir: 1 }; for (let i = 0; i < 120; i++) c.step(dt, { gas: 1, steer: 0 }, flat()); t('a gust pushes the car', c.x > .1, c.x); }
}
