// Licence tests: the setup for a test, the judge that watches an attempt, and the demonstration's brain.
import { aiDrive } from './sim.js';
import { indexOfS, loadTrack, RaceSim, trackPoint, wrapS } from './race.js';
import { TRACKS } from '../data/tracks.js';
import { fullInstall } from './tuning.js';

export function placeS(tr, at) { return wrapS(tr, at.s !== undefined ? at.s : tr.cornerS[at.c] + (at.off ?? 0)); }
export const legCount = (test) => test.legs?.length ?? 1;
export const legCar = (test, leg) => test.legs?.[leg] ?? test.carId;
export function testSetup(test, leg = 0, assists = {}, player = 0) {
  const carId = legCar(test, leg), { tr } = loadTrack(test.track);
  const startS = placeS(tr, test.start);
  return {
    kind: 'licence', track: test.track, laps: 0, hour: test.hour ?? TRACKS[test.track].hour, start: test.standing ? 'standing' : 'flying', startS, startSpeed: test.startSpeed ?? 0, contact: false,
    wear: 0, fuel: 0, cars: [{ carId, install: null, name: 'YOU', paint: null, player, assists: { abs: true, tcs: 5, asm: 5, auto: true, ...assists, ...(test.assists ?? {}) } }],
    test: test.id, leg,
  };
}
// Watches one attempt. status: running, pass, fail. time counts per the plan's rules; penalties are added at the end.
export class Judge {
  constructor(test, sim) {
    this.test = test; this.sim = sim; const tr = sim.tr;
    this.status = 'running'; this.reason = ''; this.time = 0; this.running = !test.standing && test.kind !== 'lap'; this.penalty = 0; this.offT = 0; this.startProgress = 0; this.lastRel = 0;
    this.startS = placeS(tr, test.start);
    this.distance = test.kind === 'lap' ? tr.length + wrapRel(tr, 0 - this.startS) : test.end ? wrapS(tr, placeS(tr, test.end) - this.startS) : 0;
    if (test.kind === 'lap') this.lineAt = wrapS(tr, 0 - this.startS);
    this.travelled = 0; this.lastS = sim.cars[0].c.loc.s;
    if (test.box) { this.boxFrom = wrapS(tr, test.box.s - this.startS) - test.box.len / 2; this.boxTo = this.boxFrom + test.box.len; this.limit = this.boxTo + 40; }
    if (test.cones) {
      this.cones = [];
      for (let k = 0; k < test.cones.count; k++) { const s = test.cones.from + k * test.cones.spacing, pt = trackPoint(tr, s, 0); this.cones.push({ s, rel: wrapS(tr, s - this.startS), x: pt.x, y: pt.y, z: pt.z, yaw: pt.yaw, side: k % 2 ? -1 : 1, hit: false, passed: false, tumble: 0 }); }
    }
    this.coneHits = 0;
    this.timeLimit = (test.medals?.bronze ?? 120) * 2.2 + 15;
  }
  fail(reason) { if (this.status === 'running') { this.status = 'fail'; this.reason = reason; this.sim.events.push({ type: 'testFail', reason }); } }
  pass() { if (this.status === 'running') { this.status = 'pass'; this.sim.events.push({ type: 'testPass', time: this.total }); } }
  get total() { return this.time + this.penalty; }
  get totalWithBase() { return this.total + (this.base ?? 0); }
  step(dt) {
    if (this.status !== 'running') return;
    const sim = this.sim, tr = sim.tr, e = sim.cars[0], c = e.c, test = this.test;
    let ds = c.loc.s - this.lastS; if (ds > tr.length / 2) ds -= tr.length; else if (ds < -tr.length / 2) ds += tr.length;
    this.travelled += ds; this.lastS = c.loc.s;
    if (!this.running) {
      if (test.kind === 'lap') { if (this.travelled >= this.lineAt) { this.running = true; this.lapFrom = this.travelled; } }
      else if (Math.hypot(c.vx, c.vz) > 0.5) this.running = true;
    }
    if (this.running) this.time += dt;
    // Limits
    if (!c.onTrack) { this.offT += dt; if (this.offT > 0.6 && !test.allowOff) return this.fail('OFF THE ROAD'); } else this.offT = 0;
    if (test.noMargin && c.wallHits > 0) return this.fail('THE WALL WAS TOUCHED');
    if (e.recoveries > 0) return this.fail('RECOVERY ENDS THE ATTEMPT');
    if (this.time > this.timeLimit) return this.fail('THE EXAMINER HAS GONE HOME');
    if (e.wrongWay) return this.fail('THAT IS THE WRONG WAY');
    if (test.kind === 'stop') {
      const v = Math.hypot(c.vx, c.vz);
      if (this.travelled > this.boxTo + 4) return this.fail('PAST THE BOX');
      if (this.running && v < 0.25 && this.travelled > 5) { if (this.travelled >= this.boxFrom - 1 && this.travelled <= this.boxTo + 1) return this.pass(); return this.fail('STOPPED OUTSIDE THE BOX'); }
    } else if (test.kind === 'lap') {
      if (this.running && this.travelled - this.lapFrom >= tr.length) return this.pass();
    } else {
      if (test.cones) for (const k of this.cones) {
        if (!k.hit && Math.hypot(c.x - k.x, c.z - k.z) < 1.5) { k.hit = true; k.tumble = 1; this.penalty += 1; this.coneHits++; sim.events.push({ type: 'cone', hit: true }); }
        if (!k.passed && this.travelled >= k.rel) { k.passed = true; if (!k.hit && Math.sign(c.loc.t) !== k.side) { this.penalty += 1; k.missed = true; this.coneHits++; sim.events.push({ type: 'cone', hit: false }); } }
      }
      if (this.travelled >= this.distance) return this.pass();
    }
  }
}
function wrapRel(tr, s) { return wrapS(tr, s); }
// The examiner's brain. Pure pursuit from aiDrive, with a stop or a weave on top. Used by Demonstration and by medals.mjs.
export class DemoBrain {
  constructor(test, sim, judge, { skill = 0.97 } = {}) { this.test = test; this.sim = sim; this.judge = judge; this.skill = skill; const e = sim.cars[0]; this.speeds = e.speeds; this.decel = Math.min(1.25, (e.p.brakeG ?? 1.25)) * 9.81 * e.p.tyreMu * 0.78; }
  input() {
    const sim = this.sim, e = sim.cars[0], c = e.c, tr = sim.tr, line = sim.line, j = this.judge, test = this.test, u = Math.hypot(c.vx, c.vz);
    let lane = 0, speeds = this.speeds;
    if (test.cones) {
      const k = j.cones.find((x) => !x.passed);
      if (k) lane = k.side * 3.1 - line.off[c.loc.i]; else lane = -line.off[c.loc.i];
    } else if (test.kind === 'stop') lane = -line.off[c.loc.i];
    const inp = aiDrive(c, tr, line, speeds, { skill: this.skill, lane, tcs: 0.7, asm: 0.6 });
    if (test.kind === 'stop') {
      const target = (j.boxFrom + j.boxTo) / 2, d = target - j.travelled, vStop = Math.sqrt(Math.max(0, 2 * this.decel * Math.max(0, d)));
      if (u > vStop + 0.3 || d < 0.5) { inp.throttle = 0; inp.brake = 1; } else if (u > vStop - 2) { inp.throttle = 0; inp.brake = 0.5; } else { inp.throttle = 1; inp.brake = 0; }
    } else if (test.cones) { const limit = 62 / 3.6; if (u > limit) { inp.throttle = 0; inp.brake = 0.4; } else { inp.throttle = 1; inp.brake = 0; } }
    return inp;
  }
}
export function runHeadless(test, { skill = 0.97, steps = 60 * 400 } = {}) { // a whole attempt in Node: returns the demonstration's time
  let total = 0, status = 'pass', reason = '';
  for (let leg = 0; leg < legCount(test); leg++) {
    const sim = new RaceSim({ ...testSetup(test, leg), record: false, seed: 1 }), judge = new Judge(test, sim), brain = new DemoBrain(test, sim, judge, { skill });
    sim.cars[0].player = null; sim.cars[0].autoDrive = true;
    sim.aiInput = () => brain.input();
    for (let i = 0; i < steps && judge.status === 'running'; i++) { sim.step([]); sim.drainEvents(); judge.step(1 / 60); }
    if (judge.status !== 'pass') { status = 'fail'; reason = `${legCar(test, leg)}: ${judge.reason || 'ran out of time'} at ${judge.travelled.toFixed(0)} m`; break; }
    total += judge.total;
  }
  return { time: total, status, reason };
}
void indexOfS; void fullInstall;
