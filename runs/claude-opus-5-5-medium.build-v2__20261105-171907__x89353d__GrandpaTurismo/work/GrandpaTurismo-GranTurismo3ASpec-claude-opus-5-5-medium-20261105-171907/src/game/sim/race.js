// RaceSim: field, laps, flags, starts, pit lane, slipstream, licence runs, results, replay feed, events. Plain JS: no engine, no DOM.
import { buildTrack, racingLine, speedProfile, newCar, stepCar, collideCars, aiDrive, locate, G } from './sim.js';
import { TRACKS } from '../data/tracks.js';
export const TUNE_DEFAULTS = { grip: 1, power: 1, brake: 1, downforce: 1, wear: 1, fuel: 1, steerRate: 3, stability: 1, traction: 1, aiPace: 0, rubber: 0, wallLoss: 1, slip: 0.65, prize: 1, chase: 8.5, fov: 58 };
export const PIT_WIDTH = 8;
const trackCache = new Map(), profileCache = new Map();
export function getTrack(id) {
  let e = trackCache.get(id);
  if (e) return e;
  const def = TRACKS[id], tr = buildTrack(def), line = racingLine(tr);
  e = { id, def, tr, line, pit: null };
  if (def.pit) {
    const L = tr.length, inS = (def.pit.in + L) % L, span = def.pit.out - def.pit.in;
    for (let i = 0; i < tr.N; i++) { const d = (i * tr.ds - inS + L) % L; if (d < span) tr.wallR[i] = PIT_WIDTH + 2; }
    e.pit = { inS, span, boxD: def.pit.box - def.pit.in };
  }
  trackCache.set(id, e);
  return e;
}
export function profileFor(trackId, p, rain = false) {
  const key = `${trackId}|${rain ? 1 : 0}|${p.mass}|${p.powerW}|${p.tyreMu}|${p.clA}|${p.cdA}|${p.tyreTable?.dirt ?? ''}`;
  let v = profileCache.get(key);
  if (!v) { const { tr, line } = getTrack(trackId), base = tr.surface === 'dirt' ? p.tyreTable?.dirt ?? 0.62 : 1; v = speedProfile(tr, line, p, base * (rain ? 0.78 : 1)); profileCache.set(key, v); }
  return v;
}
function mulberry(a) { return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const REC_CH = 12;
const wrapS = (s, L) => ((s % L) + L) % L;
export function resolveS(ref, tr) { return wrapS((ref.c != null ? tr.cornerS[ref.c] : ref.s ?? 0) + (ref.off ?? 0), tr.length); }

export class RaceSim {
  /** setup: { track, laps, cars:[{ params, name, color, ai, skill, seat, oil, key, install, carId, god }], start: rolling|standing|stagger, rules:{ contact, wearMult, fuelMult, pits, holdLights }, rain, seed, tune, test, record } */
  constructor(setup) {
    this.setup = setup;
    const T = getTrack(setup.track);
    this.T = T; this.tr = T.tr; this.line = T.line; this.tr.muScale = setup.rain ? 0.78 : 1;
    this.rand = mulberry((setup.seed ?? 1) >>> 0);
    this.rules = { contact: true, wearMult: 0.5, fuelMult: 1, pits: !!T.pit, ...(setup.rules ?? {}) };
    this.tune = setup.tune ?? { ...TUNE_DEFAULTS };
    this.laps = setup.laps ?? 1; this.t = 0; this.frame = 0; this.events = []; this.phase = 'grid'; this.lights = 0; this.green = false; this.done = false; this.results = null; this.greenT = 0; this.flagT = null;
    this.env = {}; this.envGod = {}; this.inputs = []; this.lapSeen = 0;
    this.cars = setup.cars.map((o, i) => this.spawn(o, i));
    this.order = [...this.cars];
    this.contactField = [];
    this.startKind = setup.test ? 'test' : setup.start ?? 'rolling';
    this.placeField();
    this.rec = setup.record === false ? null : { n: 0, cap: 2048, every: 2, data: this.cars.map(() => new Float32Array(2048 * REC_CH)) };
    if (setup.test) this.initTest(setup.test, setup.run ?? 0);
  }
  spawn(o, i) {
    const c = newCar(o.params, this.tr, 0, 0);
    Object.assign(c, { idx: i, name: o.name ?? `CAR ${i + 1}`, color: o.color ?? 'red', ai: !!o.ai, seat: o.seat ?? -1, skill: o.skill ?? 0.92, key: o.key ?? `ai${i}`, carId: o.carId ?? o.params.carId, install: o.install ?? null, oil: o.oil ?? 1, god: !!o.god,
      lap: 0, prevS: 0, midSeen: false, lapStart: 0, startT: 0, startDelay: o.startDelay ?? 0, bestLap: Infinity, lastLap: 0, finishT: null, stopT: 0, lapseT: 0, nextLapse: 10 + this.rand() * 20, phaseOff: this.rand() * 6.28, lane: 0, pit: null, pits: 0, wantPit: false, noHit: 0, metres: 0, topSpeed: 0, walls: 0, wrongWay: false, slip: false, revHold: 0, reversing: false, gearLast: 1, sliding: false, cooldown: false, position: i + 1, recovered: 0, hadContact: 0, airT: 0, offT: 0, stuckT: 0 });
    return c;
  }
  placeField() {
    const { tr } = this, L = tr.length, n = this.cars.length;
    this.cars.forEach((c, i) => {
      let s = 0, t = 0, v = 0;
      if (this.startKind === 'rolling') { s = L - 150 - 12 * Math.floor(i / 2) * 2; t = i % 2 ? 2.6 : -2.6; v = 80 / 3.6; s = L - 150 - 12 * i; }
      else if (this.startKind === 'standing') { s = L - 12 - 8 * i; t = n === 1 ? 0 : i % 2 ? 2.6 : -2.6; }
      else if (this.startKind === 'stagger') { s = L - 12; t = 0; }
      this.placeCar(c, s, t, v);
    });
    this.phase = this.startKind === 'rolling' ? 'rolling' : this.startKind === 'test' ? 'test' : 'lights';
  }
  placeCar(c, s, t, v) {
    const { tr } = this, i = Math.round(wrapS(s, tr.length) / tr.ds) % tr.N, rx = -tr.tz[i], rz = tr.tx[i];
    c.x = tr.x[i] + rx * t; c.z = tr.z[i] + rz * t; c.y = tr.y[i] - t * Math.sin(tr.bank[i]); c.vy = 0; c.yaw = Math.atan2(tr.tx[i], tr.tz[i]); c.vx = tr.tx[i] * v; c.vz = tr.tz[i] * v; c.r = 0; c.delta = 0; c.ax = 0; c.ay = 0;
    c.loc.i = i; c.loc.s = i * tr.ds; c.loc.t = t; c.prevS = c.loc.s; c.u = v;
    // pick a gear that suits the speed
    const p = c.p; c.gear = 1; for (let g = 0; g < p.gears.length; g++) { const rpm = (v / p.R) * (60 / (2 * Math.PI)) * p.gears[g] * p.final; c.gear = g + 1; if (rpm < p.upshift * 0.85) break; }
  }
  get player() { return this.cars.find((c) => c.seat === 0) ?? this.cars[0]; }
  // ---- licence runs
  initTest(test, run) {
    const { tr } = this, L = tr.length, c = this.cars[0];
    const startS = resolveS(test.from, tr);
    const v = (test.startSpeed ?? 0) / 3.6;
    this.placeCar(c, startS, 0, v);
    const toD = test.to ? wrapS(resolveS(test.to, tr) - startS, L) : null;
    this.run = { test, startS, dist: toD, run: 0, moving: !test.standing && !test.flying, tStart: test.standing || test.flying ? null : 0, time: 0, failed: false, reason: null, over: false, hits: 0, offT: 0, flyingStarted: false, cones: [], medal: 0 };
    if (test.cones) for (let i = 0; i < test.cones.n; i++) { const at = wrapS(test.cones.at + i * test.cones.gap - (test.from.s ?? 0), L); this.run.cones.push({ at, side: i % 2 ? 1 : -1, hit: false, passed: false, fly: 0, i }); }
    this.green = true; this.greenT = 0; this.lapStart = 0;
  }
  stepTest() {
    const R = this.run, c = this.cars[0], { tr } = this, L = tr.length;
    if (R.over) return;
    const prev = c.prevRun ?? 0;
    let ds = c.loc.s - (c.lastRunS ?? R.startS); if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L; c.lastRunS = c.loc.s;
    R.run += ds; c.prevRun = R.run;
    const speed = Math.hypot(c.vx, c.vz);
    if (R.tStart == null && !R.test.flying && speed > 0.3) R.tStart = this.t;
    if (R.tStart != null) R.time = this.t - R.tStart;
    for (const k of R.cones) {
      if (k.passed) continue;
      const i = Math.round(wrapS(R.startS + k.at, L) / tr.ds) % tr.N, x = tr.x[i], z = tr.z[i];
      if (Math.hypot(c.x - x, c.z - z) < 1.3 && !k.hit) { k.hit = true; R.hits++; this.events.push({ t: 'cone', car: c, x, z, y: tr.y[i] }); }
      if (R.run > k.at + 1) { k.passed = true; const onSide = Math.sign(c.loc.t) === k.side; if (!onSide && !k.hit) { k.hit = true; k.missed = true; R.hits++; this.events.push({ t: 'coneMiss', car: c }); } }
    }
    if (R.test.limits?.offroad) { if (!c.onTrack) R.offT += 1 / 60; else R.offT = Math.max(0, R.offT - 1 / 120); if (R.offT > 0.6) return this.endTest(true, 'OFF THE ROAD'); }
    if (R.test.flying) {
      if (!R.flyingStarted && prev < R.run && c.prevS > L * 0.9 && c.loc.s < L * 0.1) { R.flyingStarted = true; R.tStart = this.t; R.run = 0; c.prevRun = 0; R.lapRun = true; this.events.push({ t: 'lap', car: c }); }
      else if (R.flyingStarted && R.run > L * 0.5 && c.prevS > L * 0.9 && c.loc.s < L * 0.1) return this.endTest(false);
    } else if (R.test.box) {
      const b = R.test.box, boxFrom = wrapS(b.at - (R.test.from.s ?? 0), L), boxTo = boxFrom + b.len;
      R.boxFrom = boxFrom; R.boxTo = boxTo;
      if (R.run > boxTo + 12) return this.endTest(true, 'THE BOX HAS NOT MOVED');
      if (speed < 0.25 && R.run > 5) { if (R.run >= boxFrom && R.run <= boxTo) return this.endTest(false); if (R.time > 2) return this.endTest(true, 'THE BOX HAS NOT MOVED'); }
    } else if (R.dist != null && R.run >= R.dist) return this.endTest(false);
    const cap = R.test.medals ? R.test.medals.bronze * 3 + 10 : 400;
    if (R.time > cap) this.endTest(true, 'TIME');
  }
  endTest(failed, reason = null) {
    const R = this.run; R.over = true; R.failed = failed; R.reason = reason; R.total = R.time + R.hits;
    this.done = true; this.phase = 'done'; this.events.push({ t: 'testEnd', failed, reason, time: R.total });
    const c = this.cars[0]; c.ai = true; c.cooldown = true; c.skill = 0.6;
  }
  /** A demonstration's brain: the AI, plus the stop box and the cone weave. Used by the medal tool, Demonstration and the scripted player. */
  testBrain(skill = 0.97) {
    const c = this.cars[0], R = this.run, sp = profileFor(this.setup.track, c.p, this.setup.rain);
    let lane = 0;
    if (R.cones.length) { const look = Math.max(6, Math.hypot(c.vx, c.vz) * 0.7); let next = R.cones.find((k) => k.at + 2 > R.run); if (next) { const f = Math.max(0, 1 - Math.abs(next.at - (R.run + look)) / 35); lane = next.side * 2.8 * Math.min(1, f * 2.2) - (this.line.off[c.loc.i]); } else lane = -this.line.off[c.loc.i]; }
    const inp = aiDrive(c, this.tr, this.line, sp, { skill, lane, tcs: this.testAssist('tcs', 0.7), asm: this.testAssist('asm', 0.6) });
    const asst = R.test.assists ?? {};
    if (asst.abs === false) inp.abs = false;
    if (R.test.box) {
      const b = R.test.box, boxFrom = wrapS(b.at - (R.test.from.s ?? 0), this.tr.length), mid = boxFrom + b.len * 0.4, rem = Math.max(0, mid - R.run), speed = Math.hypot(c.vx, c.vz), a = (c.p.brakeG ?? 1.25) * G * 0.62, vT = Math.sqrt(2 * a * rem);
      inp.steer = aiDrive(c, this.tr, this.line, sp, { skill: 2, lane: -this.line.off[c.loc.i] }).steer;
      if (speed > vT) { inp.throttle = 0; inp.brake = asst.abs === false ? 0.66 : 0.9; } else { inp.throttle = rem < 2 ? 0 : 1; inp.brake = rem < 2 ? 1 : 0; }
    }
    return inp;
  }
  testAssist(k, dflt) { const a = this.run?.test.assists?.[k]; return a == null ? dflt : a; }
  // ---- one fixed step
  go() { if (!this.green) this.setGreen(); }
  setGreen() { this.green = true; this.greenT = this.t; this.phase = 'green'; this.lights = 0; for (const c of this.cars) { c.startT = this.t + c.startDelay; if (this.startKind !== 'rolling') c.lapStart = c.startT; } this.events.push({ t: 'green' }); }
  buildEnv() {
    const u = this.tune, base = { gripScale: u.grip, powerScale: u.power, brakeScale: u.brake, aeroScale: u.downforce, wearRate: 0.0012 * this.rules.wearMult * u.wear, fuelRate: 0.0018 * this.rules.fuelMult * u.fuel, wallLoss: u.wallLoss };
    this.env = base; this.envGod = { ...base, wearRate: 0, fuelRate: 0, wallLoss: 0 };
  }
  aiInput(c) {
    const sp = profileFor(this.setup.track, c.p, this.setup.rain), u = this.tune;
    let skill = (u.aiPace > 0 ? u.aiPace + (c.skill - (this.setup.paceMid ?? c.skill)) : c.skill);
    if (u.rubber > 0 && !c.cooldown) { const me = this.player, gap = this.metresOf(me) - this.metresOf(c); skill += Math.max(-u.rubber, Math.min(u.rubber, gap * 0.0002)); }
    if (c.lapseT > 0) { c.lapseT -= 1 / 60; skill -= 0.04; }
    else if (c.skill < 0.93 && this.t > c.nextLapse && !c.cooldown) { c.lapseT = 2; c.nextLapse = this.t + this.tr.length / 45 * (0.7 + this.rand() * 0.6); }
    c.lane = Math.sin(this.t * 0.31 + c.phaseOff) * 0.6;
    { const low = Math.min(...c.wear); skill *= Math.sqrt(0.72 + 0.28 * Math.sqrt(low)); } // a tired tyre is driven as one
    const field = this.rules.contact ? this.contactField : null, inp = aiDrive(c, this.tr, this.line, sp, { skill, lane: c.lane, tcs: 0.7, asm: 0.6 }, field);
    return inp;
  }
  applyHolds(c, inp) {
    const speed = Math.hypot(c.vx, c.vz);
    if (this.phase === 'rolling') { if (speed > 25) { inp.throttle = 0; if (speed > 27) inp.brake = Math.max(inp.brake ?? 0, 0.3); } }
    else if (!this.green || this.t < c.startT) { inp.revs = inp.throttle; inp.throttle = 0; inp.brake = 1; }
    if (c.finishT != null && !c.ai) { c.ai = true; }
    return inp;
  }
  /** Reverse: hold brake at a standstill for 0.4 s. Any throttle returns to first. */
  applyReverse(c, inp) {
    const u = c.u ?? 0;
    if (c.reversing) {
      if (inp.throttle > 0.05) { c.reversing = false; c.revHold = 0; inp.reverse = false; }
      else { inp.reverse = true; inp.throttle = inp.brake; inp.brake = 0; inp.auto = false; if (c.gear !== 1) c.gear = 1; }
    } else if (Math.abs(u) < 0.4 && inp.brake > 0.3 && inp.throttle < 0.05) { c.revHold += 1 / 60; if (c.revHold > 0.4) c.reversing = true; }
    else c.revHold = 0;
    return inp;
  }
  step(inputs = []) {
    this.buildEnv(); this.t += 1 / 60; this.frame++;
    const dt = 1 / 240, { tr, cars } = this;
    // lights
    if (this.phase === 'lights' && !this.rules.holdLights) { const k = this.t; this.lights = Math.min(5, Math.floor(k / 0.7)); if (k > 4.2) this.setGreen(); }
    this.contactField.length = 0; for (const c of cars) if (!c.inPit && c.noHit <= 0) this.contactField.push(c);
    for (const c of cars) {
      let inp;
      if (c.pit) inp = this.pitDrive(c);
      else if (c.ai) inp = this.aiInput(c);
      else { inp = { ...(inputs[c.seat] ?? { steer: 0, throttle: 0, brake: 0 }) }; }
      if (!c.pit) { if (c.ai) inp = this.applyHolds(c, inp); else { inp = this.applyHolds(c, inp); if (this.green && this.t >= c.startT) inp = this.applyReverse(c, inp); } }
      inp.steerRate = c.ai ? inp.steerRate ?? 6 : this.tune.steerRate;
      inp.asm = (inp.asm ?? 0) * this.tune.stability; inp.tcs = Math.min(1, (inp.tcs ?? 0) * this.tune.traction);
      if (c.finishT != null && inp.brake === 0 && c.cooldown && Math.hypot(c.vx, c.vz) > 33) inp.throttle = Math.min(inp.throttle, 0.3);
      c.dragScale = c.slip ? this.tune.slip : 1;
      c.lastInp = inp;
      const gear0 = c.gear, up0 = inp.up, dn0 = inp.down;
      for (let k = 0; k < 4; k++) {
        stepCar(c, inp, dt, tr, c.god ? this.envGod : this.env);
        if (k === 0) { inp.up = false; inp.down = false; }
      }
      inp.up = up0; inp.down = dn0;
      if (c.gear !== gear0) this.events.push({ t: 'shift', car: c, up: c.gear > gear0 });
    }
    if (this.rules.contact) { for (let k = 0; k < 4; k++) collideCars(this.contactField); }
    for (const c of cars) this.postCar(c);
    if (this.run) this.stepTest(); else this.updateRace();
    if (this.rec && this.frame % this.rec.every === 0 && !this.recordingStopped) this.record();
    for (const c of cars) c.prevS = c.loc.s;
  }
  postCar(c) {
    const { tr } = this, L = tr.length, speed = Math.hypot(c.vx, c.vz), s = c.loc.s;
    locate(tr, c.x, c.z, c.loc.i, c.loc);
    c.u = c.vx * Math.sin(c.yaw) + c.vz * Math.cos(c.yaw);
    if (c.noHit > 0) c.noHit -= 1 / 60;
    if (speed > c.topSpeed) c.topSpeed = speed;
    if (c.contact > 0) {
      if (c.contact > 1.2) { if (c.touching) this.events.push({ t: 'carHit', car: c, v: c.contact }); else { c.walls++; this.events.push({ t: 'wallHit', car: c, v: c.contact }); } }
      c.contact = 0; c.touching = null;
    }
    if (c.airborne) c.airT += 1 / 60; else { if (c.airT > 0.12) this.events.push({ t: 'land', car: c, air: c.airT }); c.airT = 0; }
    if (c.surface === 'kerb' && speed > 8) c.onKerb = true; else c.onKerb = false;
    if (this.run) return;
    // laps
    let ds = c.loc.s - c.prevS; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    if (this.green || this.phase === 'rolling') c.metres += Math.max(0, ds);
    if (s > L * 0.3 && s < L * 0.7) c.midSeen = true;
    if (c.prevS > L * 0.9 && c.loc.s < L * 0.1 && (c.midSeen || c.lap === 0)) this.crossLine(c);
    // wrong way
    const tan = Math.atan2(tr.tx[c.loc.i], tr.tz[c.loc.i]); let e = tan - Math.atan2(c.vx, c.vz); while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    c.wrongWay = speed > 5 && Math.abs(e) > 2.2;
    // slipstream
    c.slip = false;
    if (speed > 100 / 3.6 && this.rules.contact) for (const b of this.cars) { if (b === c) continue; let gap = (b.loc.s - c.loc.s + L) % L; if (gap < 25 && gap > 3 && Math.abs(b.loc.t - c.loc.t) < 2) { c.slip = true; break; } }
    // pit entry
    const P = this.T.pit;
    if (P && this.rules.pits && !c.pit && c.finishT == null && this.green) {
      const d = (c.loc.s - P.inS + L) % L, halfW = tr.width[c.loc.i] / 2;
      if (c.ai && !c.cooldown) { const mean = c.wear.reduce((a, b) => a + b, 0) / 4; if (this.rules.endurance && (mean < 0.3 || c.fuel < 0.12)) c.wantPit = true; }
      if (d < 80 && c.wrongWay === false && ((c.loc.t > halfW - 0.8 && !c.ai) || (c.ai && c.wantPit && d < 30))) this.enterPit(c);
    }
    // AI recovery: stuck for 3 s
    if (this.green && c.ai && !c.pit && !(c.finishT != null) && this.t > c.startT + 1) { if (speed < 1.5) { c.stopT += 1 / 60; if (c.stopT > 3) this.recover(c); } else c.stopT = 0; }
    if (c.ai && !c.pit && this.green && Math.abs(c.loc.t) > tr.width[c.loc.i] / 2 + tr.wallL[c.loc.i] + 6) this.recover(c);
    if (c.pit) this.stepPit(c);
  }
  crossLine(c) {
    c.midSeen = false;
    if (c.lap === 0) { if (this.phase === 'rolling') this.setGreen(); c.lap = 1; if (this.startKind === 'rolling') c.lapStart = this.t; this.events.push({ t: 'lapStart', car: c }); return; }
    const time = this.t - c.lapStart; c.lapStart = this.t; c.lastLap = time;
    const isBest = time < c.bestLap; if (isBest) c.bestLap = time;
    this.events.push({ t: 'lap', car: c, time, best: isBest, lap: c.lap });
    c.lap++;
    if (c.lap > this.laps && c.finishT == null) {
      c.finishT = this.t - c.startT; this.events.push({ t: 'finish', car: c, time: c.finishT });
      if (this.flagT == null) this.flagT = this.t;
      if (c.seat >= 0) { c.ai = true; c.cooldown = true; c.skill = 0.72; }
    }
  }
  metresOf(c) { if (c.lap === 0) return c.loc.s - this.tr.length; return (c.lap - 1) * this.tr.length + c.loc.s; }
  updateRace() {
    const ord = this.order; ord.sort((a, b) => { if (a.finishT != null || b.finishT != null) { if (a.finishT != null && b.finishT != null) return a.finishT - b.finishT; return a.finishT != null ? -1 : 1; } return this.metresOf(b) - this.metresOf(a); });
    if (this.startKind === 'stagger') ord.sort((a, b) => { if (a.finishT != null && b.finishT != null) return a.finishT - b.finishT; const ma = a.finishT != null ? 1e9 : this.metresOf(a), mb = b.finishT != null ? 1e9 : this.metresOf(b); return mb - ma; });
    ord.forEach((c, i) => (c.position = i + 1));
    if (this.done) return;
    const humans = this.cars.filter((c) => c.seat >= 0);
    const allDone = humans.length ? humans.every((c) => c.finishT != null) : this.cars.every((c) => c.finishT != null);
    const timeUp = this.flagT != null && this.t - this.flagT > (this.rules.flagGrace ?? 90);
    if (allDone || timeUp) this.finishRace(timeUp && !allDone);
  }
  finishRace(timedOut = false) {
    if (this.done) return;
    this.done = true; this.phase = 'done'; this.timedOut = timedOut; this.computeResults(); this.events.push({ t: 'raceEnd' });
    for (const c of this.cars) if (c.seat >= 0) { c.ai = true; c.cooldown = true; c.skill = 0.72; }
  }
  computeResults() {
    const L = this.tr.length, total = this.laps * L, avg = (c) => Math.max(10, c.metres / Math.max(1, this.t - c.startT));
    const rows = this.cars.map((c) => {
      const est = c.finishT ?? this.t - c.startT + Math.max(0, total - Math.max(0, this.metresOf(c))) / avg(c);
      return { idx: c.idx, name: c.name, key: c.key, carId: c.carId, time: est, estimated: c.finishT == null, best: c.bestLap, player: c.seat === 0, seat: c.seat, color: c.color, top: c.topSpeed, walls: c.walls, finished: c.finishT != null };
    }).sort((a, b) => a.time - b.time);
    this.results = rows;
  }
  /** A stopped or lost car goes back on the road. */
  recover(c) {
    if (this.run) { this.endTest(true, 'RECOVERY ENDS THE ATTEMPT'); return; }
    const i = c.loc.i, off = this.line.off[i];
    this.placeCar(c, i * this.tr.ds, off, 0); c.prevS = c.loc.s; c.noHit = 2; c.stopT = 0; c.recovered++; c.reversing = false; c.gear = 1;
    this.events.push({ t: 'recover', car: c });
  }
  enterPit(c) {
    const P = this.T.pit, box = P.boxD + (c.idx - 3.5) * 14;
    c.pit = { state: 'in', box, timer: 0, tyres: true, tyreT: 0, fuelT: 0, d: 0, skip: false, total: 0 };
    c.inPit = true; c.wantPit = false; c.pits++; this.events.push({ t: 'pitIn', car: c });
  }
  skipTyres(c) { if (c.pit && c.pit.state === 'stop' && !c.pit.skip) { c.pit.skip = true; c.pit.tyreT = 0; c.pit.tyres = false; } }
  stepPit(c) {
    const P = this.T.pit, L = this.tr.length, st = c.pit, d = (c.loc.s - P.inS + L) % L, speed = Math.hypot(c.vx, c.vz); st.d = d;
    if (st.state === 'in' && d >= st.box - 0.8 && speed < 2) {
      st.state = 'stop'; const mean = c.wear.reduce((a, b) => a + b, 0) / 4; st.tyres = mean < 0.7; st.tyreT = st.tyres ? 4 : 0; st.fuelT = (1 - c.fuel) * 100 * 0.1; c.vx = c.vz = 0;
      this.events.push({ t: 'pitStop', car: c, tyres: st.tyres });
    } else if (st.state === 'stop') {
      c.vx = 0; c.vz = 0; c.r = 0; st.total += 1 / 60;
      if (st.tyreT > 0) { st.tyreT -= 1 / 60; if (st.tyreT <= 0) { c.wear = [1, 1, 1, 1]; this.events.push({ t: 'pitTyres', car: c }); } }
      if (st.fuelT > 0) { st.fuelT -= 1 / 60; c.fuel = Math.min(1, c.fuel + 0.1 / 60); }
      if (st.tyreT <= 0 && st.fuelT <= 0) { st.state = 'out'; c.fuel = Math.max(c.fuel, c.fuel); this.events.push({ t: 'pitDone', car: c }); }
    } else if (st.state === 'out' && d > P.span - 8) { c.pit = null; c.inPit = false; this.events.push({ t: 'pitOut', car: c }); }
  }
  pitDrive(c) {
    const P = this.T.pit, st = c.pit, tr = this.tr, L = tr.length, u = Math.hypot(c.vx, c.vz), look = Math.max(6, u * 0.7), idx = (c.loc.i + Math.round(look / tr.ds)) % tr.N, dAhead = (idx * tr.ds - P.inS + L) % L, hw = tr.width[idx] / 2;
    let lane = hw + PIT_WIDTH / 2; if (dAhead < 30) lane = hw + (PIT_WIDTH / 2) * (dAhead / 30); if (dAhead > P.span - 40) lane = hw + (PIT_WIDTH / 2) * ((P.span - dAhead) / 40) - 2 * (1 - (P.span - dAhead) / 40);
    const rx = -tr.tz[idx], rz = tr.tx[idx], tx = tr.x[idx] + rx * lane - c.x, tz = tr.z[idx] + rz * lane - c.z, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), fwd = tx * sn + tz * cs, rgt = -tx * cs + tz * sn, curv = (2 * rgt) / Math.max(1, fwd * fwd + rgt * rgt);
    const au = Math.max(Math.abs(c.u), 5), limit = Math.min(c.p.lock, Math.atan((c.p.L * c.p.tyreMu * G * 1.1) / (au * au)) + c.p.alphaP * 0.9 + Math.abs(c.beta));
    const inp = { steer: Math.max(-1, Math.min(1, Math.atan(curv * c.p.L) / limit)), abs: true, auto: true, tcs: 0.8, asm: 0.7, steerRate: 6, throttle: 0, brake: 0 };
    let vT = 60 / 3.6;
    if (st.state === 'in') { const rem = st.box - st.d; vT = Math.min(vT, Math.sqrt(Math.max(0, 2 * 6 * Math.max(0, rem - 0.5)))); }
    if (st.state === 'stop') vT = 0;
    if (st.state === 'out') { /* out at pit limit */ }
    const err = vT - u; inp.throttle = err > 0.5 ? 0.7 : err > -0.2 ? 0.25 : 0; inp.brake = err < -0.4 ? Math.min(1, -err / 5 + 0.2) : 0;
    return inp;
  }
  // ---- replay feed
  record() {
    const r = this.rec;
    if (r.n >= r.cap) { r.cap *= 2; r.data = r.data.map((a) => { const b = new Float32Array(r.cap * REC_CH); b.set(a); return b; }); }
    const o = r.n * REC_CH;
    this.cars.forEach((c, i) => {
      const a = r.data[i], flags = (c.lastInp?.brake > 0.1 ? 1 : 0) | (c.sliding ? 2 : 0) | (c.airborne ? 4 : 0) | (c.inPit ? 8 : 0) | (c.pit?.state === 'stop' ? 16 : 0);
      a[o] = c.x; a[o + 1] = c.y; a[o + 2] = c.z; a[o + 3] = c.yaw; a[o + 4] = c.ax; a[o + 5] = c.ay; a[o + 6] = c.delta; a[o + 7] = c.rpm; a[o + 8] = c.lastInp?.throttle ?? 0; a[o + 9] = c.gear; a[o + 10] = flags; a[o + 11] = c.u;
    });
    r.n++;
  }
  replayData() {
    if (!this.rec) return null;
    const r = this.rec;
    return { track: this.setup.track, hour: this.setup.hour, rain: !!this.setup.rain, n: r.n, hz: 30, data: r.data.map((a) => a.subarray(0, r.n * REC_CH)), cars: this.cars.map((c) => ({ carId: c.carId, name: c.name, color: c.color, install: c.install, seat: c.seat })), label: this.setup.label ?? '' };
  }
  // ---- dev tools
  teleport(c, s) { this.placeCar(c, s, 0, Math.hypot(c.vx, c.vz)); c.prevS = c.loc.s; c.midSeen = c.loc.s > this.tr.length * 0.3; }
  finishNow(place = 1) {
    const me = this.player, t = this.t - me.startT;
    this.cars.forEach((c, i) => { if (c === me) return; c.finishT = t + (i + 1 < place ? -(place - i) : i + 1) * 1.1; });
    me.finishT = t; me.ai = true; me.cooldown = true;
    this.flagT = this.t; this.finishRace();
  }
  saveState() { const num = (c) => { const o = {}; for (const k in c) { const v = c[k]; if (typeof v === 'number' || typeof v === 'boolean' || (Array.isArray(v) && typeof v[0] === 'number')) o[k] = Array.isArray(v) ? [...v] : v; } o.loc = { ...c.loc }; o.pit = c.pit ? { ...c.pit } : null; return o; }; return JSON.stringify({ t: this.t, frame: this.frame, phase: this.phase, green: this.green, greenT: this.greenT, lights: this.lights, flagT: this.flagT, done: this.done, cars: this.cars.map(num) }); }
  loadState(json) { const s = JSON.parse(json); Object.assign(this, { t: s.t, frame: s.frame, phase: s.phase, green: s.green, greenT: s.greenT, lights: s.lights, flagT: s.flagT, done: s.done }); s.cars.forEach((o, i) => Object.assign(this.cars[i], o)); if (!s.done) this.results = null; }
  hash() {
    let h = 2166136261; const add = (v) => { h ^= Math.round(v * 100) | 0; h = Math.imul(h, 16777619); };
    for (const c of this.cars) { add(c.x); add(c.z); add(c.y); add(c.lap); add(c.wear[0]); add(c.fuel); }
    return (h >>> 0).toString(16);
  }
  takeEvents() { const e = this.events; this.events = []; return e; }
}
