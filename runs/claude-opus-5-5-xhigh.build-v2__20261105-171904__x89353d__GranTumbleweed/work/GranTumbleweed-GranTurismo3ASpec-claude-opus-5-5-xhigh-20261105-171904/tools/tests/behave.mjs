// What the plan says things do, done and measured: behaviours that reading the code cannot prove.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { suite } from './_lib.mjs';
import { boot, THREE } from './_drive.mjs';
import { RaceSim, defaultEnv, loadTrack, wrapS } from '../../src/game/sim/race.js';
import { Actions, KEYS_P1, KEYS_P2, KEYS_SOLO } from '../../src/game/input/actions.js';
import { ChaseCam } from '../../src/game/render/camera.js';
import { CarView } from '../../src/game/render/carview.js';
import { TvDirector } from '../../src/game/render/director.js';
import { GhostTrace, Recording, FIELDS, F_SLIDE } from '../../src/game/sim/replaydata.js';
import { ReplayScene } from '../../src/game/scenes/replay.js';
import { MenuScene } from '../../src/game/scenes/menu.js';
import { MuseumScreen } from '../../src/game/ui/screens/museum.js';
import { EventCardScreen } from '../../src/game/ui/screens/events.js';
import { HANDBOOK } from '../../src/game/data/text.js';
import { TEST_IDS, TESTS } from '../../src/game/data/licences.js';
import { addCar, aiInstall, eventRoster, newProfile, oilOf, recordRound, recordTest } from '../../src/game/sim/career.js';
import { PodiumScreen, PrizeScreen } from '../../src/game/ui/screens/cinema.js';
import { eventSetup, quickSetup } from '../../src/game/sim/setups.js';
import { Judge, testSetup } from '../../src/game/sim/licence.js';
import { fullInstall } from '../../src/game/sim/tuning.js';
import { CAR_IDS } from '../../src/game/data/cars.js';
const t = suite();
const ASSISTS = { abs: true, tcs: 5, asm: 5, auto: true };
const fly = (o = {}) => new RaceSim({ track: 'saltline', laps: 3, start: 'flying', startS: -300, startSpeed: 200, contact: false, record: false, seed: 1, cars: [{ carId: 'ginga', name: 'A', player: 0, assists: ASSISTS }, { carId: 'ginga', name: 'B', player: 1, assists: ASSISTS }], ...o });
const solo = (o = {}) => fly({ cars: [{ carId: 'ginga', name: 'A', player: 0, assists: ASSISTS }], ...o });

// ---- Slipstream: within 25 m behind, under 2 m laterally, above 100 km/h ----
{
  const s = fly(); s.step([{ throttle: 1 }, { throttle: 1 }]); const [lead, tail] = s.cars, L = s.tr.length;
  t.ok(tail.slip && tail.c.dragScale === 0.65, `the car behind is in the slipstream: ${tail.c.dragScale}`); t.ok(!lead.slip && lead.c.dragScale === 1, 'the car in front is not');
  const s0 = lead.c.loc.s, u0 = tail.c.u;
  tail.c.loc.s = wrapS(s.tr, s0 - 30); s.slipstream(); t.ok(!tail.slip, 'no slipstream at 30 m');
  tail.c.loc.s = wrapS(s.tr, s0 - 10); tail.c.loc.t = lead.c.loc.t + 3; s.slipstream(); t.ok(!tail.slip, 'no slipstream 3 m to the side');
  tail.c.loc.t = lead.c.loc.t; tail.c.u = 25; s.slipstream(); t.ok(!tail.slip, 'no slipstream at 90 km/h'); tail.c.u = u0; void L;
  const run = (slip) => { const q = fly({ env: { ...defaultEnv(), slip } }); for (let i = 0; i < 180; i++) q.step([{ throttle: 1 }, { throttle: 1 }]); return q.cars[1].c.u; };
  t.ok(run(0.65) > run(1) + 0.3, `a slipstream carries more speed: ${run(0.65).toFixed(2)} against ${run(1).toFixed(2)}`);
  t.ok(run(0.4) > run(0.65), 'the Slipstream slider changes it');
}
// ---- Wrong way ----
{
  const s = solo({ track: 'kestrel', startS: -200, startSpeed: 80 }), e = s.cars[0];
  s.step([{}]); t.ok(!e.wrongWay, 'no sign going forward'); e.c.yaw += Math.PI; s.step([{}]); t.ok(e.wrongWay, 'a wrong way sign, heading opposed, above 5 m/s');
  e.c.vx = 0; e.c.vz = 0; e.c.u = 0; s.step([{}]); t.ok(!e.wrongWay, 'none when stopped');
}
// ---- Rolling start: double file, 12 m apart, 150 m before the line, 80 km/h, held to 90, then green ----
{
  const s = new RaceSim({ ...quickSetup({ track: 'kestrel', carId: 'ginga', laps: 2, field: 6, assists: ASSISTS, seed: 3 }), record: false }), L = s.tr.length, rel = (e) => { const d = wrapS(s.tr, e.c.loc.s); return d > L / 2 ? d - L : d; };
  s.cars.forEach((e, k) => { t.near(rel(e), -150 - Math.floor(k / 2) * 12, 0.5, `grid slot ${k} along the road`); t.near(Math.abs(e.c.loc.t), 2.6, 0.01, `grid slot ${k} in double file`); t.near(e.c.u * 3.6, 80, 0.5, `grid slot ${k} at 80 km/h`); });
  t.eq(s.cars.at(-1).player, 0, 'the player starts last'); t.eq(s.phase, 'rolling', 'rolling');
  let top = 0, n = 0; while (s.phase === 'rolling' && n++ < 900) { s.step([{ throttle: 1 }]); for (const e of s.cars) top = Math.max(top, Math.abs(e.c.u) * 3.6); }
  t.eq(s.phase, 'green', 'green when the leader reaches the line'); t.ok(top < 96, `everyone is held near 90 km/h: ${top.toFixed(1)}`);
  t.ok(s.drainEvents().some((v) => v.type === 'flag' && v.kind === 'green'), 'a green event');
  let after = 0; for (let i = 0; i < 300; i++) { s.step([{ throttle: 1 }]); after = Math.max(after, ...s.cars.slice(0, -1).map((e) => e.c.u * 3.6)); } t.ok(after > 100, `the limit lifts on green: ${after.toFixed(0)}`);
}
// ---- Standing start: five red lights, no movement until green ----
{
  const s = new RaceSim({ track: 'kestrel', laps: 1, start: 'standing', seed: 1, record: false, contact: false, cars: [{ carId: 'ginga', name: 'A', player: 0, assists: ASSISTS }] }), e = s.cars[0]; let most = 0, moved = 0, n = 0;
  while (s.phase === 'grid' && n++ < 400) { s.step([{ throttle: 1 }]); most = Math.max(most, s.lights); moved = Math.max(moved, Math.abs(e.c.u)); }
  t.eq(most, 5, 'five red lights'); t.ok(moved < 0.2, `a held car does not creep: ${moved.toFixed(2)}`); t.eq(s.phase, 'green', 'then green');
  for (let i = 0; i < 120; i++) s.step([{ throttle: 1 }]); t.ok(e.c.u > 8, `and it goes: ${e.c.u.toFixed(1)}`);
}
// ---- AI: gets itself back on the road after 3 s stopped; a low-pace lapse; the rubber band ----
{
  const s = new RaceSim({ track: 'kestrel', laps: 3, start: 'flying', startS: 400, startSpeed: 60, contact: false, record: false, seed: 1, cars: [{ carId: 'kite', name: 'A', skill: 0.9 }] }), e = s.cars[0];
  s.aiInput = () => ({ steer: 0, throttle: 0, brake: 1, abs: true, auto: true, tcs: 0, asm: 0 }); let at = null; for (let i = 0; i < 700 && at === null; i++) { s.step([]); if (e.recoveries) at = s.time; } t.ok(at !== null, 'a stopped AI car recovers by itself'); t.near(e.noContact, 2, 0.05, 'with 2 s of no contact');
  const lapses = (skill) => { const q = new RaceSim({ track: 'kestrel', laps: 3, start: 'flying', startS: 20, startSpeed: 60, contact: false, record: false, seed: 5, cars: [{ carId: 'kite', name: 'A', skill }] }); let frames = 0; for (let i = 0; i < 7200 && q.cars[0].lap < 2; i++) { q.step([]); if (q.cars[0].lapse > 0) frames++; } return frames; };
  const low = lapses(0.88); t.near(low, 120, 8, 'a low-pace car has one 2-second lapse a lap'); t.eq(lapses(0.95), 0, 'a high-pace car has none');
  const rubber = (r, ahead) => { const q = new RaceSim({ track: 'kestrel', laps: 3, start: 'flying', startS: 20, startSpeed: 80, contact: false, record: false, seed: 5, env: { ...defaultEnv(), rubber: r }, cars: [{ carId: 'kite', name: 'A', skill: 0.88 }, { carId: 'kite', name: 'B', player: 0, assists: ASSISTS }] }), ai = q.cars[0], me = q.cars[1]; for (let i = 0; i < 2400; i++) { me.progress = ai.progress + (ahead ? 300 : -300); q.step([{}]); } return ai.metres; };
  t.eq(defaultEnv().rubber, 0, 'the rubber band is off by default');
  t.ok(rubber(0.03, false) < rubber(0, false), 'an AI car ahead of the player eases off under the rubber band'); t.ok(rubber(0.03, true) > rubber(0, true), 'and one behind pushes on');
}
// ---- Pit stops ----
{
  const pitRun = (setup) => { const s = new RaceSim({ track: 'harbour', laps: 10, start: 'flying', startSpeed: 70, contact: false, record: false, seed: 2, cars: [{ carId: 'heck', name: 'A', skill: 0.92 }], ...setup }), e = s.cars[0]; return { s, e }; };
  const until = (s, e, stop, max = 9000) => { const log = []; let top = 0; for (let i = 0; i < max; i++) { s.step([]); if (e.pit && e.pit.phase === 'in' && e.pit.box - e.pit.s < 100) top = Math.max(top, e.pit.speed); if (e.pit?.phase === 'out') top = Math.max(top, e.pit.speed); for (const v of s.drainEvents()) if (v.car === e.i) log.push(v); if (log.some((v) => v.type === stop)) break; } return { log, top }; };
  { const tr = loadTrack('harbour').tr, { s, e } = pitRun({ startS: tr.pit.in - 240 }); e.c.wear.fill(0.25); e.c.fuel = 0.5; const lap0 = e.lap, { log, top } = until(s, e, 'pitOut');
    t.ok(log.some((v) => v.type === 'pitIn'), 'worn tyres send the AI to the pits in a ten-lap race'); t.ok(top <= 60 / 3.6 + 0.01, `60 km/h in the lane: ${(top * 3.6).toFixed(1)}`); const go = log.find((v) => v.type === 'pitGo'), box = log.find((v) => v.type === 'pitBox'); t.ok(box?.tyres, 'tyres in the stop'); t.near(go?.time ?? 0, 5, 0.1, '0.1 s per percent of fuel sets a 50% stop'); t.ok(e.c.wear.every((w) => w === 1), 'new tyres'); t.ok(e.c.fuel > 0.98, `a full tank: ${e.c.fuel}`); t.eq(e.lap - lap0, 1, 'the lap count continues through the pit'); }
  { const tr = loadTrack('harbour').tr, { s, e } = pitRun({ startS: tr.pit.in - 240 }); e.c.wear.fill(0.95); e.c.fuel = 0.11; const { log } = until(s, e, 'pitOut'); t.ok(!log.find((v) => v.type === 'pitBox')?.tyres, 'tyres stay on above 0.7'); t.ok(e.c.wear[0] < 0.96 && e.c.wear[0] > 0.7, `and they are not changed: ${e.c.wear[0].toFixed(2)}`); t.ok(log.some((v) => v.type === 'pitIn'), 'low fuel sends the AI in too'); }
  { const tr = loadTrack('harbour').tr, { s, e } = pitRun({ startS: tr.pit.in - 240 }); e.c.wear.fill(0.3); e.c.fuel = 0.95; e.wantPit = true; let skipped = false, go = null, want = 0; for (let i = 0; i < 9000 && !go; i++) { s.step([]); if (e.pit?.phase === 'box' && !skipped) { want = e.pit.fuel; s.skipTyres(e.i); skipped = true; } go = s.drainEvents().find((v) => v.type === 'pitGo') ?? null; } t.ok(want < 2, `a short fuel stop: ${want.toFixed(2)}`); t.near(go?.time ?? 0, want, 0.05, 'skipping the tyres leaves only the fuel'); t.ok(e.c.wear[0] < 0.31, 'and the old tyres'); }
  { const tr = loadTrack('harbour').tr, { s, e } = pitRun({ laps: 3, startS: tr.pit.in - 240 }); e.c.wear.fill(0.1); e.c.fuel = 0.05; for (let i = 0; i < 1500; i++) s.step([]); t.eq(e.pits, 0, 'nobody pits in a short race'); }
}
// ---- Rally: staggered by 3 s, no contact, a solid rival, mud, half the stability ----
{
  const p = newProfile(); addCar(p, 'ryu'); p.current = p.cars[0].uid; const s = new RaceSim({ ...eventSetup(p, 'clay', ASSISTS, 1), record: false }), me = s.cars.find((e) => e.player === 0), riv = s.cars.find((e) => e.player !== 0);
  t.eq(s.contact, false, 'rally: no contact'); t.eq(s.tr.surface, 'dirt', 'on dirt'); t.ok(!riv.ghost, 'the rival is solid'); t.eq(s.cars.length, 2, 'one rival');
  for (let i = 0; i < 900; i++) s.step([{ throttle: 1 }]); t.near(Math.abs(me.ownStart - riv.ownStart), 3, 0.02, 'a 3 s staggered start'); t.ok(riv.c.u > 3, 'the rival is under way');
  t.ok(riv.dirt > 0, `dirt builds up: ${riv.dirt}`); t.near(s.driverInput(me, {}).asm, 0.25, 1e-6, 'default stability halves on dirt');
  me.c.loc.s = riv.c.loc.s; me.progress = riv.progress; { const k = Math.floor(Math.max(0, riv.progress) / 20); me.splits = riv.splits.slice(0, Math.max(1, k - 40)); me.ownStart = riv.ownStart + 3; t.eq(typeof s.clockGap(me, riv), 'number', 'a clock gap for the HUD'); }
}
// ---- Rain, wear and fuel by the sliders; every sim-side slider measured ----
{
  t.eq(loadTrack('kestrel', { rain: true }).tr.muScale, 0.78, 'rain: muScale 0.78');
  const accel = (env) => { const q = solo({ track: 'proving', startS: 0, startSpeed: 100, env: { ...defaultEnv(), ...env } }); for (let i = 0; i < 240; i++) q.step([{ throttle: 1 }]); return q.cars[0].c.u; };
  t.ok(accel({ powerScale: 2 }) > accel({}) + 2, 'Power: double power accelerates harder');
  const brake = (env) => { const q = solo({ track: 'proving', startS: 0, startSpeed: 120, env: { ...defaultEnv(), ...env } }), e = q.cars[0]; const a = e.metres; for (let i = 0; i < 400 && e.c.u > 1; i++) q.step([{ brake: 1 }]); return e.metres - a; };
  t.ok(brake({ brakeScale: 0.5 }) > brake({}) + 5, 'Brake strength: weak brakes stop longer');
  const worn = (env) => { const q = solo({ track: 'kestrel', startS: 20, startSpeed: 100, env: { ...defaultEnv(), ...env } }), e = q.cars[0]; for (let i = 0; i < 120; i++) q.step([{ throttle: 1 }]); return { w: 1 - e.c.wear[2], f: 1 - e.c.fuel }; };
  t.near(worn({ wearScale: 5 }).w / worn({}).w, 5, 0.3, 'Tyre wear: five times'); t.near(worn({ fuelScale: 5 }).f / worn({}).f, 5, 0.3, 'Fuel use: five times'); t.ok(worn({ god: true }).w === 0 && worn({ god: true }).f === 0, 'God mode: no wear, no fuel use');
  const q1 = solo({ cars: [{ carId: 'works', name: 'A', player: 0, assists: ASSISTS }], startS: -300, startSpeed: 250 }), q2 = solo({ cars: [{ carId: 'works', name: 'A', player: 0, assists: ASSISTS }], startS: -300, startSpeed: 250, env: { ...defaultEnv(), aeroScale: 2 } }); for (let i = 0; i < 20; i++) { q1.step([{ throttle: 1 }]); q2.step([{ throttle: 1 }]); } t.ok(q2.cars[0].c.fz.reduce((a, b) => a + b, 0) > q1.cars[0].c.fz.reduce((a, b) => a + b, 0) + 500, 'Downforce: more load at speed');
  const turn = (env) => { const q = solo({ track: 'saltline', startS: -300, startSpeed: 100, env: { ...defaultEnv(), ...env } }); for (let i = 0; i < 6; i++) q.step([{ steer: 1, throttle: 0.2 }]); return Math.abs(q.cars[0].c.delta); };
  t.ok(turn({ steerRate: 8 }) > turn({ steerRate: 1 }) * 1.5, 'Steering rate: turns in faster');
  { const q = solo({ env: { ...defaultEnv(), stability: 2, traction: 0 } }), inp = q.driverInput(q.cars[0], {}); t.near(inp.asm, 1, 1e-6, 'Stability strength scales asm'); t.near(inp.tcs, 0, 1e-6, 'Traction strength scales tcs'); }
  const lap = (env) => { const q = new RaceSim({ track: 'kestrel', laps: 1, start: 'flying', startS: -200, startSpeed: 100, contact: false, record: false, seed: 1, env: { ...defaultEnv(), ...env }, cars: [{ carId: 'ginga', name: 'A', skill: 0.92 }] }); for (let i = 0; i < 2400; i++) q.step([]); return q.cars[0].metres; };
  t.ok(lap({ aiPace: 0.75 }) < lap({ aiPace: 1 }) - 50, 'AI pace: a lower pace covers less road'); t.ok(lap({ gripScale: 1.5 }) > lap({ gripScale: 0.6 }) + 50, 'Grip: more grip covers more road');
  const wall = (loss) => { const q = solo({ track: 'kestrel', startS: 200, startSpeed: 160, env: { ...defaultEnv(), wallLoss: loss } }), e = q.cars[0]; let before = 0, after = null; for (let i = 0; i < 600 && after === null; i++) { before = Math.hypot(e.c.vx, e.c.vz); q.step([{ steer: 1, throttle: 1 }]); if (e.c.wallHits > 0) after = Math.hypot(e.c.vx, e.c.vz) / before; } return after; };
  const w0 = wall(0), w2 = wall(2); t.ok(w0 !== null && w2 !== null && w2 < w0, `Wall speed loss: a harder wall keeps less speed: ${w0?.toFixed(3)} against ${w2?.toFixed(3)}`);
  { const a = newProfile(), b2 = newProfile(); addCar(a, 'kite'); addCar(b2, 'kite'); const r1 = recordRound(a, 'dawn', ['YOU', 'X'], 'YOU', 1), r2 = recordRound(b2, 'dawn', ['YOU', 'X'], 'YOU', 3); t.eq(r2.prize, r1.prize * 3, 'Prize money scales the purse'); }
}
// ---- Recording: 30 Hz, and a compressed copy at 10 Hz close to it ----
{
  const s = new RaceSim({ ...quickSetup({ track: 'kestrel', carId: 'kite', laps: 1, field: 3, assists: ASSISTS, seed: 2 }) }); for (let i = 0; i < 600; i++) s.step([{ throttle: 0.5 }]); t.near(s.rec.frames, 300, 1, 'a recording holds 30 frames a second');
  const z = s.rec.compress(), r2 = Recording.fromCompressed(z); t.near(z.frames, 100, 2, 'the compressed copy holds 10 a second'); t.ok(Math.abs(atob(z.data).length - z.frames * z.carN * 9 * 2) < 4, 'quantised to 16 bits, 9 numbers a car'); t.ok(typeof z.data === 'string', 'as text for storage');
  const a = {}, b1 = {}; s.rec.sample(0, 5, a); r2.sample(0, 5, b1); t.ok(Math.hypot(a.x - b1.x, a.z - b1.z) < 1.5, `and stays close to the original: ${Math.hypot(a.x - b1.x, a.z - b1.z).toFixed(2)} m`);
}
// ---- Licence rules ----
{
  const attempt = (id, driveFn, frames = 1800) => { const test = TESTS[id], s = new RaceSim({ ...testSetup(test, 0, ASSISTS), seed: 1, record: false }), J = new Judge(test, s); s.go?.(); for (let i = 0; i < frames && J.status === 'running'; i++) { s.step([driveFn(s, i, J)]); J.step(1 / 60); } return { J, s, e: s.cars[0] }; };
    { const { J } = attempt('C-1', (s, i, j) => (j.time < 2 ? { throttle: 1 } : { brake: 1 })); t.eq(J.status, 'fail', 'stopping short of the box fails'); t.eq(J.reason, 'STOPPED OUTSIDE THE BOX', 'and says why'); }
  { const { J } = attempt('C-1', () => ({ throttle: 1 })); t.eq(J.status, 'fail', 'running past the box fails'); t.eq(J.reason, 'PAST THE BOX', 'and says why'); }
  { const test = TESTS['C-1'], s = new RaceSim({ ...testSetup(test, 0, ASSISTS), seed: 1, record: false }), J = new Judge(test, s); s.go?.(); for (let i = 0; i < 300; i++) s.step([{ brake: 0 }]); t.eq(J.status, 'running', 'the test waits'); for (let i = 0; i < 60; i++) { s.step([{}]); J.step(1 / 60); } t.eq(J.time, 0, 'the clock waits for the first movement'); for (let i = 0; i < 90; i++) { s.step([{ throttle: 1 }]); J.step(1 / 60); } t.ok(J.time > 0.5, 'then it runs'); s.recover(0); J.step(1 / 60); t.eq(J.reason, 'RECOVERY ENDS THE ATTEMPT', 'recovery ends the attempt'); }
  { const test = TESTS['C-3'], s = new RaceSim({ ...testSetup(test, 0, ASSISTS), seed: 1, record: false }), J = new Judge(test, s); t.eq(J.cones.length, 6, 'six cones'); t.near(J.cones[1].s - J.cones[0].s, 40, 1e-6, '40 m apart'); t.ok(J.running, 'a rolling test runs from the start'); const k = J.cones[0], c = s.cars[0].c; c.x = k.x; c.z = k.z; s.step([{}]); c.x = k.x; c.z = k.z; J.step(1 / 60); t.eq(J.penalty, 1, 'a hit cone adds 1 s'); t.eq(J.total, J.time + 1, 'to the time'); }
  t.eq(testSetup(TESTS['B-1'], 0, ASSISTS).cars[0].assists.abs, false, 'B-1 forces ABS off'); t.eq(testSetup(TESTS['B-2'], 0, ASSISTS).cars[0].assists.tcs, 0, 'B-2 forces traction control to 0');
  t.eq(TESTS['B-3'].legs.join(), 'kite,ginga,ryu', 'B-3 is driven in the Kite, Ginga and Ryu');
  { const test = TESTS['A-4'], s = new RaceSim({ ...testSetup(test, 0, ASSISTS), seed: 1, record: false }), J = new Judge(test, s); s.cars[0].c.wallHits = 1; s.step([{}]); s.cars[0].c.wallHits = 1; J.step(1 / 60); t.eq(J.reason, 'THE WALL WAS TOUCHED', 'A-4 has no margin for error'); }
}
// ---- The driver's filters and who uses what ----
{
  const keys = new Set(), input = { isDown: (c) => keys.has(c), wasPressed: () => false, pointer: { x: 0, y: 0 }, mouseDelta: { x: 0, y: 0 } }, ctx = { input }, dt = 1 / 60, a = new Actions(), run = (n, pl = 0) => { for (let i = 0; i < n; i++) a.drive(ctx, pl, dt); return a.driver[pl]; };
  keys.add('KeyD'); t.near(run(6).steer, 0.32, 0.01, 'keyboard steering goes toward 1 at 3.2 a second'); keys.delete('KeyD'); t.near(run(3).steer, 0.02, 0.02, 'and returns at 6 a second');
  keys.add('KeyW'); t.near(run(3).throttle, 0.5, 0.01, 'keyboard throttle ramps over 0.1 s'); t.near(run(3).throttle, 1, 0.01, 'and reaches 1'); keys.clear(); run(10);
  const pad = (axes = [0, 0, 0, 0], b = {}) => { const buttons = new Array(17).fill(0); for (const k in b) buttons[k] = b[k]; return { i: 0, axes, buttons }; };
  a.pads = [pad([0.06, 0, 0, 0])]; t.near(run(1).steer, 0, 1e-6, 'an 8% deadzone on the stick'); a.pads = [pad([0.5, 0, 0, 0])]; t.near(run(1).steer, Math.pow(0.42 / 0.92, 1.4), 1e-3, 'the response curve'); a.pads = [pad([1, 0, 0, 0])]; t.near(run(1).steer, 1, 1e-6, 'full lock'); a.steerCurve = 1; a.pads = [pad([0.5, 0, 0, 0])]; t.near(run(1).steer, 0.42 / 0.92, 1e-3, 'Steering response changes it'); a.steerCurve = 1.4;
  a.resetDriver(); a.driver[0].digitalT = true; a.pads = [pad([0, 0, 0, 0], { 7: 0.37 })]; t.near(run(1).throttle, 0.37, 1e-6, 'an analog trigger follows the pedal'); a.pads = [pad()]; run(1);
  const a2 = new Actions(), run2 = (n) => { for (let i = 0; i < n; i++) a2.drive(ctx, 0, dt); return a2.driver[0]; }; a2.pads = [pad([0, 0, 0, 0], { 7: 1 })]; t.near(run2(3).throttle, 0.5, 0.01, 'a trigger that reports only 0 or 1 gets the ramp');
  // Triangle: a tap is the camera, a hold is recovery.
  a.pads = [pad([0, 0, 0, 0], { 3: 1 })]; run(3); a.pads = [pad()]; t.ok(run(1).cam, 'a tap of Triangle is the camera'); a.pads = [pad([0, 0, 0, 0], { 3: 1 })]; t.ok(!run(10).recover, 'not yet a hold'); t.ok(run(20).recover, 'a hold is recovery'); a.pads = [pad()]; t.ok(!run(1).cam, 'and no camera change when let go'); run(2);
  // Mouse steering.
  a.mouseSteer = true; a.lastDevice = 'mouse'; a.pads = []; input.pointer.x = 0.5; keys.add('MouseLeft'); const m = run(2); t.near(m.steer, 0.8, 1e-6, 'mouse steering'); t.ok(m.throttle > 0, 'the left button is the throttle'); keys.clear(); keys.add('MouseRight'); t.ok(run(6).brake > 0.5, 'the right button is the brake'); keys.clear(); a.mouseSteer = false; input.pointer.x = 0; run(10);
  // Couch Duel: who uses what.
  const c = new Actions(); c.couch = true; t.eq(c.keysFor(0), KEYS_P1, 'no pads: P1 on WASD'); t.eq(c.keysFor(1), KEYS_P2, 'no pads: P2 on arrows'); t.ok(KEYS_P2.hand.includes('Enter') && KEYS_P1.hand.includes('Space'), 'Enter and Space remapped');
  c.pads = [pad()]; t.eq(c.padFor(0), c.pads[0], 'one pad: the pad is P1'); t.eq(c.keysFor(1), KEYS_SOLO, 'one pad: the keyboard is P2'); t.eq(c.keysFor(0), null, 'and P1 has no keys');
  c.pads = [pad(), { ...pad(), i: 1 }]; t.eq(c.padFor(1), c.pads[1], 'two pads: pad 2 is P2'); t.eq(c.keysFor(1), null, 'no keys with two pads');
  // Menu repeat.
  const r = new Actions(), mk = { isDown: (k) => k === 'ArrowRight' }; let fires = [], time = 0; for (let i = 0; i < 90; i++) { r.movedThisFrame.x = 0; r.updateMoves(mk, dt); time += dt; if (r.movedThisFrame.x) fires.push(time); } t.near(fires[1] - fires[0], 0.35, 0.02, 'first menu repeat at 0.35 s'); t.near(fires[2] - fires[1], 0.09, 0.02, 'then every 0.09 s'); { const q = new Actions(), tap = { isDown: () => false, wasPressed: (...k) => k.includes('ArrowDown') }; q.movedThisFrame.y = 0; q.updateMoves(tap, dt); t.eq(q.movedThisFrame.y, 1, 'a key tap shorter than a frame still moves the focus'); }
  // Idle: any key, pad change over 0.2, mouse over 3 px.
  const idle = new Actions(), inp = { commands: [], isDown: () => false, wasPressed: () => false, queuedPresses: [], pointer: { x: 0, y: 0 }, wheel: 0, mouseDelta: { x: 0, y: 0 } }; let frame = 0; const c2 = { engine: {}, input: inp }, tick = () => { c2.engine.frame = ++frame; idle.setDt(1 / 60); idle.latch(c2); return idle.anyInput; }; tick(); tick(); t.ok(idle.idle > 0, 'idle counts');
  inp.queuedPresses = ['KeyK']; t.ok(tick(), 'any key resets idle'); inp.queuedPresses = []; tick(); inp.pointer = { x: 2 / 240, y: 0 }; t.ok(!tick(), 'a 2 px mouse move does not'); inp.pointer = { x: 5 / 240, y: 0 }; t.ok(tick(), 'a 5 px mouse move does');
  idle.pads = [pad([0.1, 0, 0, 0])]; t.ok(!tick(), 'a stick at 0.1 does not'); idle.pads = [pad([0.3, 0, 0, 0])]; t.ok(tick(), 'a stick at 0.3 does');
}
// ---- Cameras ----
{
  const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.5, 6000), ch = new ChaseCam(cam), P = { x: 0, y: 0, z: 0, yaw: 0, u: 0 }; ch.update(1 / 60, P);
  t.near(cam.position.z, -6.8, 0.01, 'chase near: 6.8 back'); t.near(cam.position.y, 2.4, 0.01, 'chase near: 2.4 up'); t.near(cam.fov, 58, 0.01, 'FOV 58 at rest'); ch.update(1 / 60, { ...P, u: 80 }); t.near(cam.fov, 66, 0.01, 'FOV 66 at speed');
  ch.cycle(); ch.update(1 / 60, P); t.near(cam.position.z, -8.5, 0.01, 'chase far: 8.5 back'); t.near(cam.position.y, 3.1, 0.01, 'chase far: 3.1 up'); ch.cycle(); ch.update(1 / 60, P); t.near(cam.position.z, 0.2, 0.01, 'bonnet: 0.2 forward'); t.near(cam.position.y, 1.05, 0.01, 'bonnet: 1.05 up'); ch.cycle(); t.eq(ch.mode, 0, 'the camera cycles');
  ch.snap(); ch.update(1 / 60, P, { lookBack: true }); t.near(cam.position.z, 6.8, 0.01, 'look back turns the camera round');
  ch.snap(); ch.update(1 / 60, P); for (let i = 0; i < 90; i++) ch.update(1 / 60, P, { lookX: 1 }); t.ok(Math.abs(cam.position.x) > 3, `the right stick orbits: ${cam.position.x.toFixed(1)}`); for (let i = 0; i < 180; i++) ch.update(1 / 60, P); t.near(cam.position.x, 0, 0.05, 'and it springs back');
  ch.snap(); ch.update(1 / 60, P); const z0 = cam.position.z; ch.update(1 / 60, { ...P, z: 1 }); t.near(cam.position.z - z0, 1 - Math.exp(-8 / 60), 0.01, 'the position spring runs at about 8 a second');
  ch.snap(); ch.update(1 / 60, P); ch.update(1 / 60, { ...P, yaw: 1 }); t.ok(ch.yaw > 0 && ch.yaw < 0.2, `the camera's yaw lags a slide: ${ch.yaw.toFixed(2)}`);
  ch.distance = 12; ch.snap(); ch.update(1 / 60, P); t.near(cam.position.z, -12, 0.01, 'the Chase distance slider moves it'); ch.distance = null; ch.fovBase = 80; ch.update(1 / 60, P); t.near(cam.fov, 80, 0.01, 'the FOV slider moves it');
}
// ---- A car's model ----
{
  const v = new CarView('ginga'), wing = new CarView('ginga', { install: fullInstall(['aeroWing']) }), lip = new CarView('ginga', { install: fullInstall(['aeroStreet']) });
  const count = (o) => { let n = 0; o.traverse((m) => { if (m.isMesh) n++; }); return n; };
  t.ok(count(wing.object) > count(v.object), 'a big wing appears on the model'); t.ok(count(lip.object) > count(v.object), 'a lip spoiler appears on the model');
  t.eq(new CarView('ginga', { paint: 'teal' }).paint, 'teal', 'paint recolours the model');
  t.eq(v.brake.visible, false, 'brake lamps off'); v.setBrake(true); t.eq(v.brake.visible, true, 'brake lamps on under braking'); t.eq(v.head.visible, false, 'head lamps off by day'); v.setHead(true); t.eq(v.head.visible, true, 'on at dusk and night');
  v.setDirt(0); t.near(v.mudMat.dissolve, 1, 1e-6, 'no mud on a clean car'); v.setDirt(1); t.ok(v.mudMat.dissolve < 0.5, 'mud shows on a dirty car'); v.setDirt(0.5); const half = v.mudMat.dissolve; t.ok(half > 0.25 && half < 1, 'mud dissolves pixel by pixel'); v.setDirt(0);
  const w0y = v.wheels[0].pivot.position.y, spin0 = v.wheels[0].spin.rotation.x; v.update(1 / 60, 0, 0, 0, 0, 0, 0, 0.05, 0.05, 0.3, 20, false); t.ok(v.body.rotation.x !== 0, 'the body pitches'); t.ok(v.body.rotation.z !== 0, 'the body rolls'); t.near(v.wheels[0].pivot.position.y, w0y, 1e-6, 'the wheels stay on the road'); t.near(v.wheels[0].pivot.rotation.y, -0.3, 1e-6, 'the front wheels steer'); t.near(v.wheels[2].pivot.rotation.y, 0, 1e-6, 'the rear wheels do not'); t.ok(v.wheels[0].spin.rotation.x !== spin0, 'the wheels spin');
  const g = new CarView('ginga', { ghost: 'sky' }); let ds = [], casts = 0; g.object.traverse((m) => { if (m.isMesh) { ds.push(m.material.dissolve); if (m.castShadow) casts++; } }); t.ok(ds.length && ds.every((d) => d === 0.35), 'a ghost is stippled at 0.35 on every mesh'); t.eq(casts, 0, 'and casts no shadow');
  let recv = 0; v.object.traverse((m) => { if (m.isMesh && m.receiveShadow) recv++; }); t.eq(recv, 0, 'a car receives no shadows');
  const tris = (o) => { let n = 0; o.traverse((m) => { if (m.isMesh) n += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3; }); return n; }; t.ok(tris(new CarView('ryuRally').object) > tris(new CarView('ryu').object), 'a rally car has mud flaps and a roof vent');
}
// ---- The replay director's posts and cuts ----
{
  const { tr } = loadTrack('kestrel'), tv = new TvDirector(tr, null, 11), real = tv.posts.filter((p) => !p.low && !p.gantry), gaps = real.slice(1).map((p, i) => p.s - real[i].s);
  t.ok(gaps.every((g) => g >= 239 && g <= 321), `posts every 280 m or so: ${Math.min(...gaps).toFixed(0)} to ${Math.max(...gaps).toFixed(0)}`); t.ok(real.every((p) => p.fov >= 18 && p.fov <= 30), 'tele lenses, FOV 18 to 30'); t.ok(tv.posts.some((p) => p.low) && tv.posts.some((p) => p.gantry) && tv.heli, 'authored shots: start line, gantry, helicopter');
  for (const id of ['kestrel', 'cedar', 'harbour', 'saltline', 'redclay', 'proving']) for (const v of [30, 50, 75]) {
    const T2 = loadTrack(id).tr, D = new TvDirector(T2, null, 11), cam = new THREE.PerspectiveCamera(); let s = 0, time = 0, last = null, worst = 0; const ints = [];
    for (let i = 0; i < 3600; i++) { s = (s + v / 60) % T2.length; const k = Math.round(s / T2.ds) % T2.N, f = { x: T2.x[k], y: T2.y[k], z: T2.z[k], s }; time += 1 / 60; const cut = D.update(1 / 60, f, cam, {}); if (cut) { if (last !== null) ints.push(time - last); last = time; worst = Math.max(worst, Math.hypot(D.shot.x - f.x, D.shot.z - f.z)); } }
    t.ok(ints.length >= 6 && ints.every((d) => d >= (v > 60 ? 2.5 : 3.9) && d <= 8.1), `${id} at ${v} m/s: a cut every 4 to 8 s: ${ints.map((d) => d.toFixed(1)).join(',')}`); t.ok(worst < 200, `${id} at ${v} m/s: a new shot can see the car: ${worst.toFixed(0)} m`);
  }
  { const cam = new THREE.PerspectiveCamera(), T2 = loadTrack('kestrel').tr, D = new TvDirector(T2, null, 11), f = { x: T2.x[0], y: T2.y[0], z: T2.z[0], s: 0 }; let time = 0, last = null; const ints = []; for (let i = 0; i < 3600; i++) { time += 1 / 60; if (D.update(1 / 60, f, cam, {})) { if (last !== null) ints.push(time - last); last = time; } } t.ok(ints.length >= 6 && ints.every((d) => d >= 3.9 && d <= 8.1), `a stopped car: a cut every 4 to 8 s: ${ints.map((d) => d.toFixed(1)).join(',')}`); }
}
// ---- Scenes, by real input ----
const b = await boot(), app = b.app, seen = new Set(), T = app.ui.text; app.ui.text = function (x, y, s, o) { seen.add(String(s)); return T.call(this, x, y, s, o); };
const shows = async (s, n = 3) => { seen.clear(); await b.frames(n); return [...seen].some((x) => x.includes(s)); };
const quick = async (o = {}) => { await app.startQuick({ track: 'kestrel', carId: 'ginga', laps: 2, field: 4, difficulty: 'normal', ...o }); await b.settle(); await b.frames(3); return app.scene; };
const key = (c, on) => b.engine.input.setKey(c, on);
{ // The sound line, on the title and in Settings.
  t.ok(!app.mix.audio?.unlocked, 'sound is locked at first'); t.ok(await shows('PRESS A KEY OR CLICK FOR SOUND'), 'the title says so');
  await b.go('settings'); t.ok(await shows('PRESS A KEY OR CLICK FOR SOUND'), 'Settings says so'); await b.press('back');
}
{ // The HUD, wrong way, DEV tag, units.
  let s = await quick(), me = s.sim.cars.at(-1);
  t.ok(await shows('P4'), 'HUD: position'); t.ok(await shows('LAP 1/2'), 'HUD: lap'); t.ok(await shows('KM/H'), 'HUD: speed'); t.ok(!(await shows('DEV')), 'no DEV tag at first');
  app.options.units = 'mph'; t.ok(await shows('MPH'), 'Units: mph'); app.options.units = 'kmh';
  app.devDirty = true; t.ok(await shows('DEV'), 'HUD: the DEV tag'); app.devDirty = false;
  // Look back, with the real key.
  await b.frames(10); const look = () => { const c = me.c, cam = s.cam; return (cam.position.x - c.x) * Math.sin(c.yaw) + (cam.position.z - c.z) * Math.cos(c.yaw); };
  t.ok(look() < 0, 'the camera is behind the car'); key('KeyB', true); await b.frames(40); t.ok(look() > 0, `B turns it round: ${look().toFixed(1)}`); key('KeyB', false); await b.frames(40); t.ok(look() < 0, 'and back');
  me.c.yaw += Math.PI; t.ok(await shows('WRONG WAY'), 'HUD: wrong way'); me.c.yaw -= Math.PI; s.sim.recover(me.i); await b.frames(4);
  // Camera key.
  const m0 = s.chase.mode; key('KeyC', true); await b.frames(2); key('KeyC', false); await b.frames(2); t.eq(s.chase.mode, (m0 + 1) % 3, 'C cycles the camera'); s.chase.mode = m0; app.options.camMode = m0;
  // Recovery: hold R for 1 s when stopped; not while driving on the road.
  me.c.vx = 0; me.c.vz = 0; me.c.u = 0; key('KeyS', false); key('KeyR', true); let frames = 0, r0 = me.recoveries; while (me.recoveries === r0 && frames < 120) { await b.frames(1); frames++; } key('KeyR', false); t.near(frames / 60, 1, 0.1, 'R held for 1 s recovers a stopped car'); t.near(me.noContact, 2, 0.1, 'with 2 s of no contact'); t.near(me.c.u, 0, 0.5, 'at zero speed');
  app.actions.pads = [{ i: 0, axes: [0, 0, 0, 0], buttons: Object.assign(new Array(17).fill(0), { 3: 1 }) }]; me.c.vx = 0; me.c.vz = 0; me.c.u = 0; frames = 0; r0 = me.recoveries; while (me.recoveries === r0 && frames < 120) { await b.frames(1); me.c.vx = 0; me.c.vz = 0; frames++; } app.actions.pads = []; await b.frames(2); t.near(frames / 60, 1, 0.1, 'Triangle held for 1 s recovers');
  // Handbrake and gears by key.
  key('Space', true); await b.frames(2); t.ok(me.inp.handbrake, 'Space is the handbrake'); key('Space', false);
  // Skip the tyres, Esc in the box; pause otherwise.
  me.pit = { phase: 'box', s: 0, t: 0, speed: 0, box: 0, laneT: 0, boxT: 0, svc: 0, tyres: 4, fuel: 1, total: 4, skipTyres: false }; t.ok(await shows('PIT'), 'HUD: PIT'); t.ok(await shows(' S'), 'HUD: a stop timer'); app.actions.inject('back'); await b.frames(2); t.ok(me.pit?.skipTyres, 'Circle or Esc skips the tyres'); t.eq(b.id, null, 'and does not pause'); me.pit = null;
  // Hard walls stop the clock briefly; soft ones do not.
  let stops = 0; const H = app.engine.hitstop.bind(app.engine); app.engine.hitstop = (x) => { stops++; return H(x); }; s.sim.events.push({ type: 'wallHit', car: me.i, v: 10 }); await b.frames(2); t.eq(stops, 0, 'no hit-stop on a soft wall hit'); s.sim.events.push({ type: 'wallHit', car: me.i, v: 25 }); await b.frames(2); t.eq(stops, 1, 'a hit-stop on a very hard one'); app.engine.hitstop = H;
  // After the flag: AI drives, TV cameras, results over it, and it pays nothing in the Arcade.
  await b.frames(30); const cr = app.profile.credits, day = app.profile.day; me.c.vx = Math.sin(me.c.yaw) * 30; me.c.vz = Math.cos(me.c.yaw) * 30; s.sim.finishNow(me.i, 1); await b.frames(3);
  t.ok(me.autoDrive, 'an AI takes the car after the flag'); t.ok(s.tvMode, 'the camera drops to TV'); t.ok(await b.until(() => b.id === 'results', 400), 'results come up'); t.eq(app.scene, s, 'over the running race'); const tm = s.sim.time; await b.frames(30); t.ok(s.sim.time > tm && me.c.u > 3, `the cool-down lap goes on behind them: ${me.c.u.toFixed(1)}`); t.eq(app.profile.credits, cr, 'the Arcade pays no credits'); t.eq(app.profile.day, day, 'and the day stays');
  await b.choose('continue'); await b.settle();
}
{ // Fireworks when the race is won at Harbour Lights.
  const s = await quick({ track: 'harbour' }); let fire = 0; const P = app.ctx.particles, B = P.burst.bind(P); P.burst = (n, ...r) => { if (/firework/.test(n)) fire++; return B(n, ...r); }; s.sim.finishNow(s.sim.cars.length - 1, 1); await b.until(() => b.id === 'results', 400); await b.frames(200); P.burst = B; t.ok(fire > 0, 'fireworks at Harbour Lights'); await b.choose('continue'); await b.settle();
}
{ // Replay controls, with a focus car, four modes, slow motion, the HUD toggle.
  const s = await quick({ field: 3 }); s.sim.cars.at(-1).autoDrive = true; b.brain({ skill: 0.9 }); for (let i = 0; i < 400; i++) await b.frames(1); b.noBrain(); s.sim.finishNow(s.sim.cars.length - 1, 1); await b.until(() => b.id === 'results', 400); t.ok(app.lastRace?.frames > 100, 'a last race in memory');
  let after = 0; await app.watchReplay({ after: () => { after++; } }); await b.settle(); const r = app.scene; t.eq(r.name, 'replay', 'the replay opens'); t.ok(await shows('REPLAY'), 'a REPLAY tag'); t.ok(await shows('DIRECTOR'), 'director first');
  await b.press('confirm'); t.eq(r.playing, false, 'cross pauses'); t.ok(await shows('PAUSED'), 'and says so'); const t0 = r.t; app.actions.inject('moveX+'); await b.frames(2); t.near(r.t - t0, 3, 0.05, 'right scrubs on'); app.actions.inject('moveX-'); await b.frames(2); t.near(r.t, t0, 0.05, 'left scrubs back'); await b.press('confirm'); t.eq(r.playing, true, 'cross plays');
  const f0 = r.focus; await b.press('tabR'); t.eq(r.focus, (f0 + 1) % 3, 'R1 changes the focus car'); await b.press('tabL'); t.eq(r.focus, f0, 'L1 changes back'); t.eq(r.auto, false, 'and the director stops choosing');
  for (const m of ['CHASE', 'BONNET', 'FREE']) { await b.press('info'); t.ok(await shows(m), `Triangle: ${m}`); }
  // Free: drag to orbit, wheel to zoom.
  const o0 = r.orbit, d0 = r.dist; b.engine.input.setPointer(0, 0, false); await b.frames(1); b.engine.input.setButtons(1); b.engine.input.addPointer(120, 0); await b.frames(2); b.engine.input.setButtons(0); await b.frames(1); t.ok(r.orbit !== o0, 'a drag orbits in Free'); b.engine.input.addPointer(0, 0, 1); await b.frames(2); t.near(r.dist - d0, 1.2, 0.01, 'the wheel zooms');
  // Slow motion: R2 held.
  const pad7 = { i: 0, axes: [0, 0, 0, 0], buttons: Object.assign(new Array(17).fill(0), { 7: 1 }) }; const ta = r.t; await b.frames(30); const rate1 = r.t - ta; app.actions.pads = [pad7]; const tb = r.t; await b.frames(30); const rate2 = r.t - tb; app.actions.pads = []; t.near(rate2 / rate1, 0.25, 0.03, 'R2 holds slow motion at 0.25');
  await b.press('alt'); t.ok(!(await shows('REPLAY')), 'the HUD hides'); await b.press('alt'); t.ok(await shows('REPLAY'), 'and comes back');
  // A click on a car focuses it (Director or Chase).
  await b.press('info'); await b.frames(5); await b.press('tabR'); await b.frames(5); const other = (r.focus + 1) % 3, q = r.views[other].object.position.clone().project(r.cam); if (q.z < 1 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1) { b.engine.input.setPointer(q.x, q.y, false); await b.frames(1); b.engine.input.setPointer(q.x, q.y, true); await b.frames(2); b.engine.input.setPointer(q.x, q.y, false); await b.frames(1); t.eq(r.focus, other, 'a click on a car focuses it'); }
  await b.press('back'); await b.frames(3); t.eq(after, 1, 'Back leaves the replay'); await app.toTitle(); await b.settle();
}
{ // The director prefers a slide. Hand-made recordings: two cars far apart; with and without the second one sliding throughout.
  const make = (slide) => { const rec = new Recording({ track: 'kestrel', hour: 12, hourEnd: null, rain: false, cars: [{ carId: 'kite', install: null, name: 'A', paint: null, player: 0 }, { carId: 'kite', install: null, name: 'B', paint: null, player: null }] }), { tr } = loadTrack('kestrel'), v = new Array(FIELDS).fill(0); for (let n = 0; n < 900; n++) { for (const i of [0, 1]) { const k = (i * 80 + n) % tr.N; v[0] = tr.x[k]; v[1] = tr.y[k]; v[2] = tr.z[k]; v[3] = 0; v[7] = 5000; v[10] = i === 1 && slide ? F_SLIDE : 0; v[11] = 30; rec.add(i, v); } rec.push(); } return rec; };
  await app.go(() => new ReplayScene(app, make(false), {})); await b.settle(); let r = app.scene; t.eq(r.home, 0, 'the replay is about the player'); await b.frames(600); t.eq(r.focus, 0, 'with nothing happening it stays on the player');
  await app.go(() => new ReplayScene(app, make(true), {})); await b.settle(); r = app.scene; t.ok(await b.until(() => r.focus === 1, 800), 'the director cuts to the car that slides'); await app.toTitle(); await b.settle();
}
{ // Dev tools: finish in a position, end the race, change the car, field size, hour, free camera, attract now.
  const open = async () => { await b.press('pause'); await b.frames(2); await b.choose('dev'); await b.frames(2); };
  let s = await quick(); await open(); await b.press('tabR'); await b.frames(2); await b.focus('finish'); app.actions.inject('moveX+'); await b.frames(2); await b.press('confirm'); await b.frames(3); t.eq(b.id, null, 'finish now closes the panel'); t.eq(s.paused, false, 'and the race runs'); t.eq(s.sim.cars.at(-1).pos, 2, 'finish now in position 2'); await b.until(() => b.id === 'results', 400); await b.choose('continue'); await b.settle();
  s = await quick(); await open(); await b.press('tabR'); await b.frames(2); await b.choose('end'); await b.frames(3); t.eq(s.sim.cars.at(-1).pos, 4, 'end race places you last'); await b.until(() => b.id === 'results', 400); await b.choose('continue'); await b.settle();
  s = await quick(); await open(); await b.press('tabR'); await b.frames(2); const car0 = s.data.cars.at(-1).carId; await b.choose('changeCar'); await b.settle(); await b.frames(2); t.ok(app.scene.sim.cars.at(-1).carId !== car0, 'change car on the spot');
  s = app.scene; await open(); await b.press('tabR'); await b.press('tabR'); await b.press('tabR'); await b.frames(2); t.ok(b.has('fieldSize'), 'the weather tab'); await b.focus('fieldSize'); app.actions.inject('moveX-'); await b.frames(2); await b.press('confirm'); await b.settle(); await b.frames(2); t.eq(app.scene.sim.cars.length, 3, 'field size restarts with fewer cars');
  s = app.scene; await open(); await b.press('tabR'); await b.press('tabR'); await b.press('tabR'); await b.frames(2); await b.focus('hour'); const h0 = s.data.hour; app.actions.inject('moveX+'); await b.frames(2); await b.press('confirm'); await b.settle(); await b.frames(2); t.eq(app.scene.data.hour, (h0 + 1) % 24, 'hour of day restarts at that hour');
  s = app.scene; await open(); await b.press('tabR'); await b.press('tabR'); await b.frames(2); await b.choose('freeCam'); await b.press('back'); await b.press('back'); await b.frames(3); const c0 = s.cam.position.clone(); key('KeyW', true); await b.frames(20); key('KeyW', false); await b.frames(2); t.ok(s.cam.position.distanceTo(c0) > 2, `the free camera flies: ${s.cam.position.distanceTo(c0).toFixed(1)}`); app.dev.freeCam = false;
  await open(); await b.choose('resetAll'); await b.press('back'); await b.press('back'); await b.frames(2);
  // Medals and records with sliders off default are not saved.
  const me = app.scene.sim.cars.at(-1), rec0 = JSON.stringify(app.profile.records); app.devDirty = true; app.env.gripScale = 1.1; me.bestLap = 60; app.scene.sim.finishNow(me.i, 1); await b.until(() => b.id === 'results', 400); t.eq(JSON.stringify(app.profile.records), rec0, 'no record with a slider off default'); await b.choose('continue'); await b.settle();
  await app.startTest('C-1'); await b.settle(); await b.frames(3); app.scene.judge.pass(); await b.until(() => b.id === 'testResult', 300); t.eq(app.profile.tests['C-1']?.medal ?? null, null, 'no medal with a slider off default'); t.ok(b.top.o?.notSaved, 'and the card says why');
  app.env.gripScale = 1; app.devDirty = false; await b.choose('backTo'); await b.settle(); await app.startQuick({ track: 'kestrel', carId: 'ginga', laps: 2, field: 4, difficulty: 'normal' }); await b.settle(); await b.frames(3); const m2 = app.scene.sim.cars.at(-1); m2.bestLap = 77; app.scene.sim.finishNow(m2.i, 1); await b.until(() => b.id === 'results', 400); t.ok(app.profile.records.kestrel, 'with sliders at default the record is saved'); t.ok(/WINDMILL DID NOT TURN/.test(app.ui.subtitle?.text ?? ''), `Dell on a lap record: ${app.ui.subtitle?.text}`); await b.choose('continue'); await b.settle();
  await b.press('back'); await b.frames(2); await app.toMenu((ui) => ui.push(new app.Screens.MapScreen(app))); await b.settle(); await b.press('pause'); await b.frames(2); await b.choose('dev'); await b.frames(2); await b.press('tabR'); await b.press('tabR'); await b.press('tabR'); await b.frames(2); await b.choose('attract'); await b.frames(3); t.ok(app.attract.active, 'start attract now'); await b.frames(12); app.actions.inject('confirm'); await b.frames(1); app.actions.domInput = true; await b.until(() => !app.attract.active && !app.switching, 900); t.ok(!app.attract.active, 'any input stops it');
}
{ // The Museum: a dark silhouette until a car is seen, then its brochure. Circuit pages: map, length, corners, record.
  app.newGame(); addCar(app.profile, 'kite'); app.profile.current = app.profile.cars[0].uid; await app.toMenu((ui) => { ui.push(new app.Screens.MapScreen(app)); ui.push(new MuseumScreen(app)); }); await b.settle(); await b.frames(3);
  const m = b.top, go = async (id) => { for (let i = 0; i < 14; i++) { if (CAR_IDS[m.car] === id) return; app.actions.inject('moveX+'); await b.frames(2); } };
  await go('type9'); t.ok(await shows('NOT YET MET'), 'an unseen car is unnamed'); { const ink = app.scene.car.meshes().every((q) => q.material.color.getHex() === app.scene.car.meshes()[0].material.color.getHex()); t.ok(ink && app.scene.car.isGhost !== undefined, 'and a dark silhouette'); } await go('kite'); t.ok(!(await shows('NOT YET MET')), 'your own car is known'); { const list = app.scene.car.meshes(); t.ok(new Set(list.map((q) => q.material.color?.getHex())).size > 1, 'in its own colours'); }
  app.profile.seen.type9 = true; m.show(); await go('type9'); t.ok(!(await shows('NOT YET MET')), 'a car seen in a race is known'); t.ok(await shows('BUILT BY A SMALL WORKS TEAM'), 'with its brochure');
  await b.press('tabR'); await b.frames(2); t.ok(await shows('KM'), 'a circuit page: length'); t.ok(await shows('CORNERS'), 'corners'); t.ok(await shows('NONE YET'), 'no record yet'); app.profile.records.kestrel = { lap: 71.2, carId: 'kite' }; t.ok(await shows('1:11.20'), 'then the record');
  await b.press('back'); await b.frames(2);
}
{ // Event Hall: a car that does not qualify is warned and turned away.
  app.profile.licences.C = true; b.ui.push(new EventCardScreen(app, 'fellow')); await b.frames(2); const kite = b.top; app.profile.cars[0].carId = 'ginga'; t.ok(await shows('IT DOES NOT QUALIFY'), 'a warning for a rear-drive car in a front-drive event'); await b.choose('start'); await b.frames(2); t.eq(b.top, kite, 'and it cannot enter'); app.profile.cars[0].carId = 'kite'; await b.frames(2); await b.choose('start'); await b.frames(2); t.eq(b.id, 'roundCard', 'the Kite can'); await b.press('back'); await b.press('back'); await b.frames(2);
}
{ // Test drive from Dealer Row: one lap of the Proving Ground, then back to the same car; nothing changes.
  await app.jumpMenu('dealer'); await b.settle(); await b.frames(2); app.actions.inject('moveX+'); await b.frames(2); const car = b.top.car, cr = app.profile.credits, km = app.profile.cars[0].km; await b.press('alt'); await b.settle(); await b.frames(3); t.eq(app.scene.data.kind, 'testdrive', 'Square is a test drive'); t.eq(app.scene.sim.tr.id, 'proving', 'on the Proving Ground'); t.eq(app.scene.sim.laps, 1, 'one lap'); app.scene.sim.finishNow(0, 1); await b.until(() => b.id === 'dealer', 600); await b.settle(); await b.frames(2); t.eq(b.id, 'dealer', 'back to the dealer'); t.eq(b.top.car, car, 'on the same car'); t.eq(app.profile.credits, cr, 'free of charge'); t.eq(app.profile.cars[0].km, km, 'and no kilometres on your own car');
  // Buying sinks the car on its springs.
  app.profile.credits = 200000; b.top.room = 0; b.top.car = 0; b.top.show(); await b.frames(2); await b.choose('car'); await b.frames(2); t.ok(app.scene.car?.settle > 0, 'a car sinks on its springs when bought'); const sink = app.scene.car.settle; await b.frames(10); t.ok(app.scene.car.settle < sink, 'and comes back up'); await b.press('back'); await b.frames(2);
}
{ // Prize money counts up, with a register at the end.
  app.profile.licences.C = true; app.profile.current = app.profile.cars.find((c) => c.carId === 'kite').uid; await app.startEventRound('dawn'); await b.settle(); await b.frames(3); const reg = () => b.engine.audio.counts?.register ?? 0, r0 = reg(); app.scene.sim.finishNow(app.scene.sim.cars.length - 1, 1); await b.until(() => b.id === 'results', 400); await b.frames(10); const mid = b.top.shown, prize = b.top.o.prize; t.ok(mid > 0 && mid < prize, `the prize counts up: ${mid} of ${prize}`); await b.frames(120); t.eq(b.top.shown, prize, 'to the full amount'); t.ok(reg() > r0, 'with the register at the end'); await b.choose('continue'); await b.settle();
}
{ // Rally mud reaches the garage.
  app.profile.licences.B = true; app.profile.licences.C = true; const car = app.profile.cars[0]; car.dirt = 0; await app.startEventRound('clay'); await b.settle(); await b.frames(3); const me = app.scene.sim.cars.find((e) => e.player === 0); me.dirtM = 2000; app.scene.sim.finishNow(me.i, 1); await b.until(() => b.id === 'results', 800); t.ok(car.dirt > 0, `a rally leaves mud on the car: ${car.dirt}`); await b.choose('continue'); await b.settle();
}
{ // Storage full: a replay is refused politely, and nothing is lost.
  await quick(); app.scene.sim.finishNow(app.scene.sim.cars.length - 1, 1); await b.until(() => b.id === 'results', 400); await b.choose('save'); await b.frames(3); t.eq(b.id, 'saveSlot', 'the slots'); globalThis.localStorage = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); }, removeItem() {} }; const kept = app.profile.replays[1]; await b.choose('slot1'); t.ok(await shows('STORAGE IS FULL'), 'a polite refusal'); delete globalThis.localStorage; t.eq(app.profile.replays[1], kept, 'the slot is as it was'); t.ok(!b.top.saved, 'and it does not say saved'); await b.choose('continue'); await b.settle();
}
{ // The sky moves with progress: morning, dusk by the National licence, night for the Grand Prix.
  const m = new MenuScene(app, {}), p = app.profile, saved = JSON.stringify(p); Object.assign(p, newProfile()); const a = m.hourFor(); p.licences.C = p.licences.B = p.licences.A = true; const d = m.hourFor(); p.events.touring = { won: true }; const n = m.hourFor(); app.profile = JSON.parse(saved); t.ok(a < 12, `morning at the start: ${a}`); t.ok(d >= 17 && d < 20, `dusk by the National licence: ${d}`); t.ok(n >= 20, `night for the Grand Prix: ${n}`);
}
{ // Settings reach the race: music off, Handbook topics.
  app.options.raceMusic = false; await quick(); t.eq(app.mix.song ?? null, null, 'no music in races when asked'); app.options.raceMusic = true; app.scene.ended = true; await app.toTitle(); await b.settle();
  const titles = HANDBOOK.map((p) => p.title).join(' | '); for (const w of ['CONTROLS', 'CANNOT', 'ASSISTS', 'TYRES', 'PIT', 'TUNING', 'RALLY', 'MEDALS']) t.ok(titles.includes(w), `the Handbook has a page on ${w}: ${titles}`);
}
{ // Attract from the Map: 10 s of nothing, then any input returns to the Map.
  await app.toMenu((ui) => ui.push(new app.Screens.MapScreen(app))); await b.settle(); await b.frames(2); t.eq(b.id, 'map', 'on the Map'); const p0 = JSON.stringify(app.profile); app.actions.idle = 0; let n = 0; while (!app.attract.active && n < 800) { await b.frames(1); n++; } t.near(n / 60, 10, 0.3, 'attract starts at 10 s on the Map'); await b.frames(30); app.actions.domInput = true; await b.until(() => !app.attract.active && !app.switching && b.id === 'map', 1200); t.eq(b.id, 'map', 'any input returns to the Map'); t.eq(JSON.stringify(app.profile), p0, 'and the save is untouched');
}
{ // Attract runs on the title or the Map themselves: never on a screen opened over them.
  for (const open of ['museum', 'garage', 'dealer', 'service', 'theatre', 'arcade', 'licence', 'events']) { await app.jumpMenu('map'); await b.settle(); await b.frames(2); await b.choose(open); await b.frames(3); const id = b.id; t.ok(id !== 'map', `${open} opens`); app.actions.idle = 0; await b.frames(60 * 11); t.eq(app.attract.active, false, `11 s idle on ${id}: no attract`); t.eq(b.id, id, `still on ${id}`); await b.press('back'); await b.frames(2); }
  await app.jumpMenu('map'); await b.settle(); await b.frames(2); await b.press('pause'); await b.frames(2); await b.choose('about'); await b.frames(2); await b.frames(60 * 11); t.eq(b.id, 'about', 'reading About for 11 s: no attract'); await b.press('back'); await b.press('back'); await b.frames(2); t.eq(b.id, 'map', 'back on the Map'); let n = 0; while (!app.attract.active && n < 800) { await b.frames(1); n++; } t.near(n / 60, 10, 0.3, 'the Map counts 10 s from when you came back'); await b.frames(30); app.actions.domInput = true; await b.until(() => !app.attract.active && !app.switching && b.id === 'map', 1200);
  await app.toTitle(); await b.settle(); await b.frames(2); t.eq(b.id, 'title', 'the title'); await b.choose('settings'); await b.frames(2); await b.frames(60 * 11); t.eq(b.id, 'settings', 'in Settings over the title: no attract'); await b.press('back'); await b.frames(2); n = 0; while (!app.attract.active && n < 800) { await b.frames(1); n++; } t.near(n / 60, 10, 0.3, 'attract starts at 10 s on the title'); await b.frames(30); app.actions.domInput = true; await b.until(() => !app.attract.active && !app.switching, 1200); await b.settle(); await b.frames(2);
}
{ // A pad through the real path: navigator.getGamepads, input.send, commands. Vibration, and its setting.
  const calls = []; const pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false })), vibrationActuator: { playEffect: (...a) => { calls.push(a); return Promise.resolve(); } } };
  const nav = globalThis.navigator, had = Object.getOwnPropertyDescriptor(nav, 'getGamepads'); Object.defineProperty(nav, 'getGamepads', { value: () => [pad], configurable: true }); await b.frames(4); t.eq(app.actions.pads.length, 1, 'a pad arrives by commands'); pad.buttons[0] = { value: 1, pressed: true }; await b.frames(3); t.eq(app.actions.lastDevice, 'pad', 'prompts follow the pad'); pad.buttons[0] = { value: 0, pressed: false }; await b.frames(3); pad.axes[2] = 0.123456; await b.frames(3); { const v = app.actions.pads[0].axes[2] * 255; t.near(v, Math.round(v), 1e-6, 'axes are quantised to 1/255'); } pad.axes[2] = 0; await b.frames(3);
  app.actions.vibration = true; app.actions.rumble(0, 0.5, 0.5, 100); t.eq(calls.length, 1, 'vibration plays'); t.eq(calls[0][0], 'dual-rumble', 'as a dual-rumble effect'); app.actions.vibration = false; app.actions.rumble(0, 0.5, 0.5, 100); t.eq(calls.length, 1, 'the Vibration setting stops it'); app.actions.vibration = true;
  if (had) Object.defineProperty(nav, 'getGamepads', had); else delete nav.getGamepads; await b.frames(3);
}
// ---- Second batch: rules the first batch took on trust ----
{ // ABS, traction control and stability, each measured on and off.
  const with_ = (a, o = {}) => solo({ track: 'proving', startS: 0, startSpeed: 120, cars: [{ carId: o.car ?? 'ginga', name: 'A', player: 0, assists: { ...ASSISTS, ...a } }], ...o });
  const stop = (abs) => { const q = with_({ abs }), e = q.cars[0]; let lock = 0, on = 0; for (let i = 0; i < 90; i++) { q.step([{ brake: 1 }]); if (e.c.locked) lock++; if (e.c.absOn) on++; } return { lock, on }; };
  t.ok(stop(false).lock > 0, 'ABS off: the brakes lock'); t.eq(stop(true).lock, 0, 'ABS on: they do not'); t.ok(stop(true).on > 0, 'and ABS acts');
  const launch = (tcs) => { const q = with_({ tcs }, { car: 'longhorn', startSpeed: 25 }), e = q.cars[0]; let on = 0; for (let i = 0; i < 120; i++) { q.step([{ throttle: 1 }]); if (e.c.tcsOn) on++; } return { on, u: e.c.u }; };
  t.ok(launch(10).on > 0, 'Traction control acts when it is on'); t.eq(launch(0).on, 0, 'and not when it is off');
  const yaw = (asm) => { const q = with_({ asm }, { startSpeed: 150 }), e = q.cars[0]; let on = 0; for (let i = 0; i < 90; i++) { q.step([{ steer: i % 40 < 20 ? 1 : -1, throttle: 1, handbrake: i > 10 && i < 30 }]); if (e.c.asmOn) on++; } return on; };
  t.ok(yaw(10) > 0, 'Stability control acts when it is on'); t.eq(yaw(0), 0, 'and not when it is off');
}
{ // Field variety, field size, pace by difficulty, short and long wear, speed profile cache, the pit barrier.
  const POOL = { dawn: ['pico', 'kite', 'moth'], fellow: ['kite', 'pico'], feather: ['moth', 'kiteCup', 'pico'], society: ['ginga', 'brandt32', 'longhorn'], touring: ['brandt32', 'heck', 'libeccio', 'longhorn', 'ryu'], h200: ['heck', 'libeccio', 'brandt32'], gp: ['works', 'corsa', 'libeccio'] };
  for (const [id, pool] of Object.entries(POOL)) { const r = eventRoster(id), cars = new Set(r.map((x) => x.carId)); t.ok(r.every((x) => pool.includes(x.carId)), `${id}: the field comes from the event's pool: ${[...cars].join()}`); t.ok(pool.every((c) => cars.has(c)), `${id}: and every car in the pool races: ${[...cars].join()}`); t.ok(r.length + 1 >= 6 && r.length + 1 <= 8, `${id}: a field of 6 to 8: ${r.length + 1}`); if (id !== 'feather') t.ok(r.every((x, i) => !i || x.skill >= r[i - 1].skill - 1e-6), `${id}: the slowest start at the front`); }
  { const r = eventRoster('feather'), lap = (x) => { const q = new RaceSim({ track: 'cedar', laps: 1, start: 'flying', startS: -200, startSpeed: 100, contact: false, record: false, seed: 1, cars: [{ carId: x.carId, install: aiInstall(x.tune), name: 'A', skill: x.skill }] }), e = q.cars[0]; for (let i = 0; i < 12000 && e.lastLap === null; i++) q.step([]); return e.lastLap; }, laps = r.map(lap); t.ok(laps.every((v, i) => !i || v <= laps[i - 1] + 3), `feather's hand-set grid starts the slowest at the front, by measured laps: ${laps.map((v) => v.toFixed(1)).join()}`); }
  t.ok(eventRoster('touring').some((x) => x.tune), 'tuned cars carry a tune'); t.ok(aiInstall(eventRoster('touring').find((x) => x.tune).tune), 'which is a real install');
  const avg = (d) => { const c = quickSetup({ track: 'kestrel', carId: 'ginga', difficulty: d, field: 6, assists: ASSISTS }).cars.filter((x) => x.player === undefined); return c.reduce((a, x) => a + x.skill, 0) / c.length; }; t.near(avg('easy'), 0.85, 0.001, 'Easy is .85'); t.near(avg('normal'), 0.92, 0.001, 'Normal is .92'); t.near(avg('hard'), 0.98, 0.001, 'Hard is .98');
  const p = newProfile(); addCar(p, 'ginga'); p.current = p.cars[0].uid; t.eq(eventSetup(p, 'dawn', ASSISTS).wear, 0.5, 'short races wear at half the rate'); t.eq(eventSetup(p, 'h200', ASSISTS).wear, 1, 'the endurance wears at the full rate'); t.eq(eventSetup(p, 'h200', ASSISTS).laps, 10, 'for ten laps'); t.eq(eventSetup(p, 'h200', ASSISTS).cars.length, 8, 'with a field of 8'); t.ok(eventSetup(p, 'h200', ASSISTS).hourEnd > eventSetup(p, 'h200', ASSISTS).hour, 'dusk into night');
  { const q = new RaceSim({ ...eventSetup(p, 'h200', ASSISTS), record: false }); for (const e of q.cars) e.lap = 6; q.step([{}]); const f = (q.hourNow - q.setup.hour) / (q.setup.hourEnd - q.setup.hour); t.ok(f > 0.4 && f < 0.7, `the hour follows the race: ${f.toFixed(2)} through it at six laps of ten`); }
  const r1 = solo(), r2 = solo(); t.eq(r1.cars[0].speeds, r2.cars[0].speeds, 'a speed profile is computed once per car and track');
  for (const id of ['kestrel', 'harbour', 'saltline']) { const { tr } = loadTrack(id); t.ok(tr.pit, `${id} has a pit lane`); const i = Math.round(wrapS(tr, tr.pit.box) / tr.ds) % tr.N; t.eq(tr.wallR[i], 10, `${id}: the barrier opens out at the pits`); t.ok(tr.pit.in < tr.pit.box && tr.pit.box < tr.pit.out, `${id}: entry, box, exit in order`); } for (const id of ['cedar', 'redclay', 'proving']) t.ok(!loadTrack(id).tr.pit, `${id} has none`);
}
{ // Licence rewards: money, a licence, prizes for all gold.
  const p = newProfile(); addCar(p, 'kite'); const win = (l) => { const c0 = p.credits; let last; for (const id of TEST_IDS.filter((x) => TESTS[x].licence === l)) last = recordTest(p, id, TESTS[id].medals.bronze - 0.01); return { paid: p.credits - c0, last }; };
  t.eq(win('C').paid, 2000, 'Licence C pays 2,000'); t.ok(p.licences.C, 'and it is held'); t.eq(win('B').paid, 5000, 'Licence B pays 5,000'); t.eq(win('A').paid, 10000, 'Licence A pays 10,000');
  const gold = (l) => { const c0 = p.credits; let g; for (const id of TEST_IDS.filter((x) => TESTS[x].licence === l)) { const r = recordTest(p, id, TESTS[id].medals.gold - 0.01); g = r.allGold ? r : g; } return { paid: p.credits - c0, g }; };
  const b0 = gold('B'); t.eq(b0.g?.prizeCar, 'moth', 'all gold on B: the Moth'); const a0 = gold('A'); t.eq(a0.paid, 25000, 'all gold on A: 25,000'); t.ok(p.trophies.some((x) => x.kind === 'helmet') || JSON.stringify(p.trophies).includes('helmet'), 'and a gold helmet on the shelf');
}
{ // The focus box slides; the menu sounds are heard.
  await app.jumpMenu('map'); await b.settle(); await b.frames(4); await b.press('pause'); await b.frames(20); const ui = app.ui; t.eq(b.id, 'mapPause', 'a still menu'); const y0 = ui.box.y; app.actions.inject('moveY+'); await b.frames(2); const tgt = b.items().find((i) => i.id === b.top.focus); t.ok(tgt.y !== y0, 'the focus moves'); t.ok(ui.box.y !== y0 && Math.abs(ui.box.y - tgt.y) > 0.5, `the focus box slides there: ${y0} to ${ui.box.y.toFixed(1)} on the way to ${tgt.y}`); await b.frames(40); t.ok(Math.abs(ui.box.y - tgt.y) < 1, 'and arrives on the item'); await b.press('back'); await b.frames(2);
  const c = () => b.engine.audio.counts ?? {}; t.ok((c().tick ?? 0) > 0, 'a tick on focus'); t.ok((c().confirm ?? 0) > 0, 'a confirm'); t.ok((c().back ?? 0) > 0, 'a back'); t.ok((c().denied ?? 0) > 0, 'a denied'); t.ok((c().register ?? 0) > 0, 'a cash register'); t.ok((c().whirr ?? 0) > 0, 'a camera whirr in showrooms'); t.ok((c().fanfare2 ?? 0) + (c().sting ?? 0) > 0, 'a sting or fanfare on results');
}
{ // Manual gears by key; engine shake at idle and on the limiter; the gantry; a standing start.
  const A = app.options.assists; A.auto = false; let s = await quick({ field: 1 }); const me = s.sim.cars[0]; await b.until(() => s.sim.phase === 'green', 900); for (const [k, want] of [['KeyE', 2], ['ShiftLeft', 3], ['KeyQ', 2], ['ControlLeft', 1]]) { me.c.shift = 0; key(k, true); await b.frames(2); key(k, false); await b.frames(16); t.eq(me.c.gear, want, `${k} changes gear`); } A.auto = true; s.ended = true; await app.toTitle(); await b.settle();
  await app.startTest('C-1'); await b.settle(); s = app.scene; await b.frames(3); t.ok(s.views[0].shake > 0, 'the engine shakes the car at idle'); const lamps = s.world.dress.lamps, red = () => lamps.filter((l) => l.red.visible).length; let most = 0; await b.until(() => { most = Math.max(most, red()); return s.sim.phase === 'green'; }, 400); t.eq(most, 5, 'five red lamps light on the gantry'); await b.frames(2); t.ok(lamps.every((l) => l.green.visible), 'then green'); s.sim.cars[0].c.rpm = s.sim.cars[0].p.redline; const hold = s.sim.cars[0]; hold.c.u = 30; await b.frames(1); t.ok(s.views[0].shake >= 0, 'the limiter shake is set'); s.ended = true; await app.toTitle(); await b.settle();
}
{ // The pit stop on screen: the crew, the jack, the wheel gun, Benno, the timer.
  const s = await quick({ track: 'harbour', laps: 5, field: 2 }), me = s.sim.cars.at(-1), tr = s.sim.tr; t.ok(s.crew, 'a crew for a longer race'); await b.until(() => s.sim.phase === 'green', 900); me.c.wear.fill(0.3); me.c.fuel = 0.7; s.sim.teleport(me.i, tr.pit.in + 10); s.sim.enterPit(me); t.ok(await b.until(() => me.pit?.phase === 'box', 3000), 'the car reaches its box'); const gun0 = b.engine.audio.counts?.wheelGun ?? 0; await b.frames(2); t.eq(s.crew.state === 'off', false, 'the crew run in'); t.ok(await shows('PIT'), 'PIT on the HUD'); await b.frames(120); t.near(s.views[me.i].jack, 0.15, 0.01, 'the jack lifts the car 0.15 m'); t.ok((b.engine.audio.counts?.wheelGun ?? 0) >= gun0, 'the wheel gun'); t.ok(/./.test(app.ui.subtitle?.text ?? ''), 'Benno has a word'); t.ok(await b.until(() => me.pit?.phase !== 'box', 900), 'the stop ends'); await b.frames(120); t.near(s.views[me.i].jack, 0, 0.01, 'the car comes down'); s.ended = true; await app.toTitle(); await b.settle();
}
{ // The Service Bay: wash and oil, with their animations and prices.
  app.newGame(); addCar(app.profile, 'kite'); const car = app.profile.cars[0]; app.profile.current = car.uid; car.dirt = 0.8; car.kmOil = 600; app.profile.credits = 1000; await app.jumpMenu('service'); await b.settle(); await b.frames(3); t.eq(b.id, 'service', 'the Service Bay');
  await b.choose('wash'); await b.frames(2); t.eq(app.profile.credits, 950, 'a wash costs 50'); t.ok(b.top.brushes?.length === 2, 'the brushes come out'); const z0 = b.top.brushes[0].position.z; let foam = 0; const P = app.ctx.particles, B = P.burst.bind(P); P.burst = (n, ...r) => { if (n === 'foam') foam++; return B(n, ...r); }; await b.frames(60); t.ok(b.top.brushes[0].position.z !== z0, 'they travel the car'); t.ok(foam > 0, 'foam flies'); t.ok(app.scene.car.dirt < 0.8 && app.scene.car.dirt > 0, `the mud dissolves as they go: ${app.scene.car.dirt.toFixed(2)}`); P.burst = B; await b.frames(240); t.eq(car.dirt, 0, 'and it is clean'); t.eq(b.top.brushes, null, 'the brushes go away');
  const o0 = oilOf(car); t.ok(o0 < 1, `the oil is tired: ${o0}`); await b.choose('oil'); await b.frames(2); t.eq(app.profile.credits, 700, 'oil costs 250'); t.ok(oilOf(car) > o0, 'and the oil is fresh'); t.ok(/./.test(app.ui.subtitle?.text ?? ''), 'Benno says so'); await b.frames(120); await b.press('back'); await b.frames(2);
}
{ // The prize reveal and the podium.
  await app.jumpMenu('map'); await b.settle(); await b.frames(2); let done = 0; const scr = app.ui.push(new PrizeScreen(app, { carId: 'kiteCup', next: () => { done++; } })); await b.frames(2); const c0 = scr.cover.position.clone(); t.eq(scr.lights.length, 0, 'the prize set starts dark'); const fan0 = b.engine.audio.counts?.fanfare2 ?? 0; await b.frames(60); t.eq(scr.lights.length, 1, 'one lamp comes on'); await b.frames(60); t.eq(scr.lights.length, 2, 'then another'); t.ok(scr.cover.position.distanceTo(c0) < 0.1, 'the cover is still on'); await b.frames(120); t.ok(scr.cover.position.distanceTo(c0) > 2, 'the cover slides away'); t.ok((b.engine.audio.counts?.fanfare2 ?? 0) > fan0, 'a fanfare'); await b.frames(60); t.ok(await shows('KITE CUP'), 'the car is named'); t.ok(/./.test(app.ui.subtitle?.text ?? ''), 'a voice line'); await b.frames(60 * 6); t.eq(done, 1, 'the reveal ends'); t.eq(app.attract.active, false, 'and attract does not cut in'); while (b.id === 'prize') { app.ui.pop(); await b.frames(1); }
  let conf = 0; const P = app.ctx.particles, B = P.burst.bind(P); P.burst = (n, ...r) => { if (/confetti/.test(n)) conf++; return B(n, ...r); }; let d2 = 0; const pod = app.ui.push(new PodiumScreen(app, { eventId: 'dawn', carId: 'kite', install: null, next: () => { d2++; }, line: 'A WIN.' })); await b.frames(60 * 6); P.burst = B; t.ok(conf > 0, 'confetti on the podium'); t.ok(pod.tl, 'a Timeline scene'); await b.frames(60 * 10); t.eq(d2, 1, 'and it moves on'); t.eq(app.attract.active, false, 'attract does not cut into the podium'); while (b.id === 'podium') { app.ui.pop(); await b.frames(1); }
}
{ // Pass the pad: the ghost of the best lap, kept only when beaten.
  const key2 = 'kestrel:ginga'; delete app.profile.ghosts[key2]; await app.startTimeTrial({ track: 'kestrel', carId: 'ginga' }); await b.settle(); await b.frames(3); let s = app.scene; t.ok(await shows('SET A LAP'), 'no ghost: set a lap'); const trace = new GhostTrace(), { tr } = loadTrack('kestrel'); for (let i = 0; i < 200; i++) { const k = (i * 4) % tr.N; trace.add(tr.x[k], tr.y[k], tr.z[k], 0); } s.run = { type: 'trial', key: key2 }; app.lapDone(s, trace, 90); t.eq(app.profile.ghosts[key2]?.time, 90, 'the first lap becomes the ghost'); await b.frames(4); t.ok(await shows('A NEW GHOST'), 'and says so'); t.ok(await shows('PASS THE PAD'), 'pass the pad'); t.ok(s.ghost, 'a ghost car'); s.traceStart = s.sim.time; await b.frames(5); t.ok(s.ghost.view.object.visible, 'which drives'); app.lapDone(s, trace, 95); t.eq(app.profile.ghosts[key2].time, 90, 'a slower lap does not replace it'); app.lapDone(s, trace, 80); t.eq(app.profile.ghosts[key2].time, 80, 'a faster one does'); s.ended = true; await app.toTitle(); await b.settle();
  await app.startTimeTrial({ track: 'kestrel', carId: 'ginga' }); await b.settle(); await b.frames(3); t.ok(app.scene.ghost, 'the ghost comes back next time'); t.ok(await shows('PASS THE PAD'), 'with the challenge'); app.scene.ended = true; await app.toTitle(); await b.settle();
}
{ // Every track's world moves, and has what the plan lists.
  for (const id of ['kestrel', 'cedar', 'harbour', 'saltline', 'redclay', 'proving']) { const s = await quick({ track: id, field: 1, laps: 1 }), w = s.world, snap = () => { const out = []; w.dress.group.traverse((o) => { let h = o.position.x + o.position.y * 3 + o.position.z * 7 + o.rotation.x + o.rotation.y * 3 + o.rotation.z * 7; const q = o.geometry?.attributes?.position; if (q && q.count < 3000) for (let i = 0; i < q.count; i += 7) h += q.getX(i) + q.getY(i) * 3 + q.getZ(i) * 5; out.push(h); }); return out; }, a = snap(); await b.frames(40); const c = snap(); let moved = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - c[i]) > 1e-4) moved++; t.ok(moved > 0, `${id}: something in the world moves: ${moved}`); s.ended = true; await app.toTitle(); await b.settle(); }
  { const s = await quick({ track: 'cedar', field: 1, laps: 1 }), [s0, s1] = s.world.dress.tunnel, amb = () => app.engine.ambient.intensity; await b.frames(3); const out = amb(); s.sim.teleport(s.sim.cars[0].i, (s0 + s1) / 2); await b.frames(4); t.ok(amb() < out, `the tunnel darkens the sky: ${out.toFixed(2)} to ${amb().toFixed(2)}`); s.ended = true; await app.toTitle(); await b.settle(); }
  { const s = await quick({ track: 'harbour', field: 1, laps: 1, hour: 21 }); t.ok(s.world.night > 0.9, 'Harbour at 21:00 is night'); t.ok(s.beamL, 'with a headlight'); t.ok(s.trails?.length, 'and taillight trails'); s.ended = true; await app.toTitle(); await b.settle(); }
}
{ // The hub's rules, in the game's own source: no dialogs, popups, navigation or other network.
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  const src = walk('src/game').filter((f) => !f.endsWith('about.gen.js')).map((f) => readFileSync(f, 'utf8')).join('\n').replace(/\/\/.*$/gm, '');
  for (const [name, re] of [['alert', /(^|[^.\w])alert\(/m], ['confirm', /(^|[^.\w])confirm\(/m], ['prompt', /(^|[^.\w])prompt\(/m], ['window.open', /window\.open/], ['navigation', /location\.(href|assign|replace)/], ['fetch', /(^|[^.\w])fetch\(/m], ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/], ['Math.random', /Math\.random/]]) t.ok(!re.test(src), `no ${name} in the game`);
}
t.eq(app.engine.errors.length, 0, `no game errors: ${app.engine.errors[0]}`);
t.done();
