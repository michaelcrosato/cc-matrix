// The regression numbers from the plan: spec sheet, laps at 97% AI pace, determinism, reverse, manual, airborne, contact, wear and fuel.
import { suite } from './_lib.mjs';
import { aiDrive, buildTrack, carParams, collideCars, newCar, racingLine, speedProfile, stepCar } from '../../src/game/sim/sim.js';
import { CARS } from '../../src/game/data/carphysics.js';
import { TRACKS } from '../../src/game/data/tracks.js';
import { RaceSim, trackPoint } from '../../src/game/sim/race.js';
const t = suite();
const SPEC = { pico: [10.5, null, 163, 45], kite: [7.4, 36.1, 214, 43], ginga: [6.6, 24.0, 243, 43], moth: [6.7, 31.2, 219, 42], brandt32: [6.1, 17.6, 278, 42], ryu: [4.4, 17.3, 243, 41], longhorn: [6.5, 15.9, 285, 43], heck: [4.8, 13.8, 301, 40], libeccio: [5.0, 12.8, 279, 40], kiteCup: [5.8, 18.6, 219, 35], ryuRally: [4.0, 13.1, 217, 41], works: [4.4, 9.8, 289, 32], corsa: [3.8, 8.2, 299, 30], type9: [3.4, 7.0, 314, 27] };
const LAPS = { pico: [136, 133, 150, 75, 163, 128], kite: [125, 124, 140, 64, 157, 118], ginga: [122, 120, 135, 59, 146, 115], moth: [123, 121, 135, 61, 145, 115], brandt32: [120, 118, 133, 58, 145, 112], ryu: [117, 115, 127, 57, 139, 110], longhorn: [121, 120, 135, 58, 147, 113], heck: [115, 113, 126, 62, 137, 108], libeccio: [114, 112, 126, 59, 137, 106], kiteCup: [110, 109, 125, 54, 143, 105], ryuRally: [116, 114, 126, 58, 115, 109], works: [104, 102, 115, 49, 142, 97], corsa: [101, 99, 111, 54, 137, 94], type9: [92, 90, 105, 41, 129, 87] };
const ORDER = ['kestrel', 'cedar', 'harbour', 'saltline', 'redclay', 'proving'];
const tracks = Object.fromEntries(ORDER.map((k) => [k, buildTrack(TRACKS[k])]));
const lines = Object.fromEntries(ORDER.map((k) => [k, racingLine(tracks[k])]));
// A long flat road for the spec sheet.
const flat = buildTrack({ corners: [[60000, 0, 300, 0, 40, 0], [60000, 3000, 300, 0, 40, 0], [-60000, 3000, 300, 0, 40, 0], [-60000, 0, 300, 0, 40, 0]], surface: 'asphalt', edge: 'grass', runoff: 20, wearRate: 0 });
const NOWEAR = { wearRate: 0, fuelRate: 0 };
function spec(id) {
  const p = carParams(CARS[id]), c = newCar(p, flat, 0, 0), dt = 1 / 240; let t100 = null, t200 = null, time = 0, top = 0;
  for (let i = 0; i < 240 * 200; i++) { stepCar(c, { steer: 0, throttle: 1, brake: 0, abs: true, auto: true, tcs: 0.5, asm: 0.5 }, dt, flat, NOWEAR); time += dt; const u = c.u * 3.6; top = Math.max(top, u); if (t100 === null && u >= 100) t100 = time; if (t200 === null && u >= 200) t200 = time; }
  const c2 = newCar(p, flat, 0, 0); c2.vx = Math.sin(c2.yaw) * (100 / 3.6); c2.vz = Math.cos(c2.yaw) * (100 / 3.6); let x0 = c2.x, z0 = c2.z, guard = 0;
  while (Math.hypot(c2.vx, c2.vz) > 0.3 && guard++ < 240 * 30) stepCar(c2, { steer: 0, throttle: 0, brake: 1, abs: true, auto: true, tcs: 0.5, asm: 0.5 }, dt, flat, NOWEAR);
  return { t100, t200, top, stop: Math.hypot(c2.x - x0, c2.z - z0) };
}
for (const id of Object.keys(SPEC)) {
  const s = spec(id), [a, b, top, stop] = SPEC[id];
  t.near(s.t100, a, Math.max(0.3, a * 0.05), `${id} 0-100`);
  if (b !== null) t.near(s.t200 ?? 999, b, Math.max(0.5, b * 0.05), `${id} 0-200`);
  t.near(s.top, top, top * 0.05, `${id} top speed`);
  t.near(s.stop, stop, Math.max(2, stop * 0.05), `${id} 100-0`);
}
function lapTime(id, k, skill = 0.97) {
  const tr = tracks[k], line = lines[k], p = carParams(CARS[id]), c = newCar(p, tr, 0, 0), speeds = speedProfile(tr, line, p, tr.surface === 'dirt' ? (p.tyreTable?.dirt ?? 0.62) : 1), dt = 1 / 240;
  let inp = null, laps = 0, lastS = 0, time = 0, lap2 = null, start2 = 0, guard = 0;
  while (laps < 3 && guard++ < 240 * 900) {
    if (guard % 4 === 1) inp = aiDrive(c, tr, line, speeds, { skill });
    stepCar(c, inp, dt, tr, NOWEAR); time += dt;
    if (lastS > tr.length * 0.9 && c.loc.s < tr.length * 0.1) { laps++; if (laps === 1) start2 = time; if (laps === 2) lap2 = time - start2; }
    lastS = c.loc.s;
  }
  return lap2 ?? 9999;
}
for (const id of Object.keys(LAPS)) ORDER.forEach((k, i) => t.near(lapTime(id, k), LAPS[id][i], 3, `${id} on ${k} lap`));
// Determinism
const run = () => { const tr = tracks.kestrel, cars = ['ginga', 'kite', 'ryu'].map((id, i) => newCar(carParams(CARS[id]), tr, i * 3 + 1, i % 2 ? 2 : -2)), sp = cars.map((c) => speedProfile(tr, lines.kestrel, c.p)); for (let f = 0; f < 3600; f++) { const inps = cars.map((c, i) => aiDrive(c, tr, lines.kestrel, sp[i], { skill: 0.95 }, cars)); for (let s = 0; s < 4; s++) { cars.forEach((c, i) => stepCar(c, inps[i], 1 / 240, tr)); collideCars(cars); } } return cars.map((c) => `${c.x.toFixed(4)},${c.z.toFixed(4)},${c.wear[0].toFixed(5)}`).join('|'); };
t.eq(run(), run(), 'same inputs give the same race');
// Reverse
{ const tr = tracks.proving, c = newCar(carParams(CARS.kite), tr, 0, 0); for (let i = 0; i < 480; i++) stepCar(c, { steer: 0, throttle: 0.8, brake: 0, reverse: true, abs: true, auto: true }, 1 / 240, tr); t.ok(c.u < -1, `reverse moves backward: ${c.u}`); }
// Manual gears
{ const tr = tracks.proving, c = newCar(carParams(CARS.ginga), tr, 0, 0); stepCar(c, { steer: 0, throttle: 1, brake: 0, auto: false, up: true }, 1 / 240, tr); t.eq(c.gear, 2, 'manual upshift works'); for (let i = 0; i < 240; i++) stepCar(c, { steer: 0, throttle: 1, brake: 0, auto: false }, 1 / 240, tr); const g = c.gear; c.shift = 0; c.vx = Math.sin(c.yaw) * 75; c.vz = Math.cos(c.yaw) * 75; stepCar(c, { steer: 0, throttle: 1, brake: 0, auto: false, down: true }, 1 / 240, tr); t.eq(c.gear, g, 'a downshift that would over-rev is refused'); }
// Airborne on Red Clay's crest
{ const tr = tracks.redclay, line = lines.redclay, c = newCar(carParams(CARS.ryuRally), tr, 0, 0), sp = speedProfile(tr, line, c.p, 0.72); let air = 0; for (let f = 0; f < 60 * 240; f++) { const inp = aiDrive(c, tr, line, sp, { skill: 1 }); for (let s = 0; s < 4; s++) stepCar(c, inp, 1 / 240, tr, NOWEAR); if (c.airborne) air += 1 / 60; } t.ok(air > 0.1, `crests lift the car: ${air.toFixed(2)} s`); }
// Contact doesn't explode
{ const tr = tracks.kestrel, line = lines.kestrel, cars = []; for (let i = 0; i < 8; i++) cars.push(newCar(carParams(CARS.ginga), tr, (tr.N - i * 3) % tr.N, i % 2 ? 2.2 : -2.2)); const sp = speedProfile(tr, line, cars[0].p); let maxV = 0; for (let f = 0; f < 60 * 120; f++) { const inps = cars.map((c) => aiDrive(c, tr, line, sp, { skill: 0.95 }, cars)); for (let s = 0; s < 4; s++) { cars.forEach((c, i) => stepCar(c, inps[i], 1 / 240, tr)); collideCars(cars); } for (const c of cars) maxV = Math.max(maxV, Math.hypot(c.vx, c.vz)); } t.ok(maxV < 90 && cars.every((c) => Number.isFinite(c.x)), `an 8-car race stays sane: max ${maxV.toFixed(1)} m/s`); }
// Wear and fuel over ten laps at Harbour
{ const tr = tracks.harbour, line = lines.harbour, c = newCar(carParams(CARS.libeccio), tr, 0, 0), sp = speedProfile(tr, line, c.p); let laps = 0, last = 0, g = 0; while (laps < 10 && g++ < 60 * 1800) { const inp = aiDrive(c, tr, line, sp, { skill: 0.95 }); for (let s = 0; s < 4; s++) stepCar(c, inp, 1 / 240, tr); if (last > tr.length * 0.9 && c.loc.s < tr.length * 0.1) laps++; last = c.loc.s; } const mean = c.wear.reduce((a, b) => a + b) / 4; t.ok(mean < 0.7, `tyres wear over distance: ${mean.toFixed(2)}`); t.ok(c.fuel < 0.55, `fuel falls over distance: ${c.fuel.toFixed(2)}`); }
// Pit entry: on the apron at the line in a long race; a deliberate move in a short one, so running wide is not a stop. The AI stays out in short races.
{ const entry = (laps, off) => { const s = new RaceSim({ track: 'kestrel', laps, start: 'flying', startS: -300, startSpeed: 90, contact: false, record: false, cars: [{ carId: 'ginga', player: 0, assists: {}, name: 'YOU' }] }), e = s.cars[0], at = s.tr.pit.in - 2, pt = trackPoint(s.tr, at, s.tr.width[0] / 2 + off), c = e.c; c.x = pt.x; c.y = pt.y; c.z = pt.z; c.yaw = pt.yaw; c.loc.i = pt.i; c.loc.s = ((at % s.tr.length) + s.tr.length) % s.tr.length; c.loc.t = s.tr.width[0] / 2 + off; e.lastS = c.loc.s; c.vx = Math.sin(pt.yaw) * 25; c.vz = Math.cos(pt.yaw) * 25; for (let i = 0; i < 12 && !e.pit; i++) s.step([{ throttle: 0.3 }]); return !!e.pit; };
  t.ok(entry(10, 1), 'a ten-lap race: the apron takes you into the pits'); t.ok(!entry(3, 1), 'a short race: running wide does not'); t.ok(entry(3, 4.5), 'a short race: a deliberate move does'); }
// A keyboard-style driver, through the input layer's filter: no recoveries, few wall touches, close to the AI's laps.
for (const [id, k, i] of [['kite', 'kestrel', 0], ['ginga', 'kestrel', 0], ['brandt32', 'cedar', 1], ['ryu', 'harbour', 2], ['heck', 'kestrel', 0], ['libeccio', 'cedar', 1], ['works', 'harbour', 2], ['moth', 'proving', 5], ['kiteCup', 'cedar', 1], ['ryuRally', 'redclay', 4]]) {
  const sim = new RaceSim({ track: k, laps: 2, hour: 12, start: 'flying', startS: -200, startSpeed: 100, contact: false, wear: 0, fuel: 0, record: false, cars: [{ carId: id, player: 0, assists: { abs: true, tcs: 5, asm: 5, auto: true }, name: 'YOU' }] }), e = sim.cars[0]; let steer = 0, th = 0, br = 0, g = 0; const dt = 1 / 60, ramp = (x, to) => x + Math.max(-dt / 0.1, Math.min(dt / 0.1, to - x));
  while (!e.finished && g++ < 60 * 600) { const c = e.c, want = aiDrive(c, sim.tr, sim.line, e.speeds, { skill: 0.9, tcs: 0.5, asm: 0.5 }), to = Math.abs(want.steer) > 0.2 ? Math.sign(want.steer) : 0, rate = to === 0 || Math.sign(to) !== Math.sign(steer) ? 6 : 3.2; steer += Math.max(-rate * dt, Math.min(rate * dt, to - steer)); th = ramp(th, want.throttle > 0.3 ? 1 : 0); br = ramp(br, want.brake > 0.1 ? 1 : 0); sim.step([{ steer, throttle: th, brake: br }]); }
  t.ok(e.finished, `keyboard driver finishes ${id} on ${k}`); t.eq(e.recoveries, 0, `no recoveries: ${id} on ${k}`); t.ok(e.bestLap && e.bestLap < LAPS[id][i] / 0.9 * 0.97 + 8, `${id} on ${k} keyboard lap ${e.bestLap?.toFixed(1)}, AI ${LAPS[id][i]}`);
}
t.done();
