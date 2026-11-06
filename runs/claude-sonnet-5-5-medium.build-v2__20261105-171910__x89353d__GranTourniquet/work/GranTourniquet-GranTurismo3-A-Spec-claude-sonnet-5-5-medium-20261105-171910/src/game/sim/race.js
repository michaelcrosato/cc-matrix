// RaceSim: a field of cars on one track. Plain JS. Calls sim.js stepCar 4x per 60 Hz step. Plan section 5.
import { buildTrack, racingLine, speedProfile, newCar, stepCar, collideCars, aiDrive, locate } from './sim.js';
import { TRACKS } from '../data/tracks.js';
import { tunedParams } from './tuning.js';
export const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const TRACK_CACHE = new Map(), LINE_CACHE = new Map(), PROFILE_CACHE = new Map();
export function getTrack(id) { // a fresh buildTrack per sim (tr is mutated by rain and pits), but the racing line is cached
  const tr = buildTrack(TRACKS[id]); tr.id = id; if (!LINE_CACHE.has(id)) LINE_CACHE.set(id, racingLine(tr)); return { tr, line: LINE_CACHE.get(id) };
}
export function getProfile(tr, line, p, id) {
  const mu = tr.muScale ?? 1, key = id + '|' + mu + '|' + [p.carId, Math.round(p.mass), Math.round(p.powerW / 1000), p.tyreMu.toFixed(2), p.clA.toFixed(2), p.cdA.toFixed(2), p.tyreTable?.dirt ?? 0].join('|');
  if (!PROFILE_CACHE.has(key)) PROFILE_CACHE.set(key, speedProfile(tr, line, p, (tr.surface === 'dirt' ? (p.tyreTable?.dirt ?? 0.62) : 1) * mu)); return PROFILE_CACHE.get(key);
}
const wrap = (a, L) => ((a % L) + L) % L;
export const KMH = 3.6;
const PIT_SPEED = 60 / 3.6;

// setup: { track, laps, field: [{ carId, install, name, colour, player, skill, tune }], contact, start: 'rolling'|'standing'|'flying', env, rain, seed, assists, rally, startS, startSpeed, wear }
export class RaceSim {
  constructor(setup) {
    this.setup = setup; this.rand = rng(setup.seed ?? 1); const { tr, line } = getTrack(setup.track); this.tr = tr; this.line = line; this.env = { wearRate: 0.0012 * (setup.wearMul ?? 1), fuelRate: 0.0018, ...(setup.env ?? {}) };
    this.contact = setup.contact ?? true; this.laps = setup.laps ?? 3; this.time = 0; this.step_n = 0; this.events = []; this.state = setup.start === 'flying' ? 'racing' : 'grid'; this.lightT = 0; this.greenAt = null; this.rally = !!setup.rally;
    if (setup.rain) tr.muScale = 0.78;
    const pit = tr.def.pit; this.pit = pit ? { in: wrap(pit.in, tr.length), box: wrap(pit.box, tr.length), out: wrap(pit.out, tr.length) } : null;
    if (this.pit) { const L = tr.length; for (let i = 0; i < tr.N; i++) { const s = i * tr.ds, d1 = wrap(s - this.pit.in, L), span = wrap(this.pit.out - this.pit.in, L); if (d1 < span) tr.wallR[i] = 16; } }
    this.cars = setup.field.map((f, idx) => this.makeCar(f, idx));
    this.player = this.cars.find((c) => c.player) ?? null; this.finishedAll = false; this.order = [...this.cars]; this.fastest = { time: Infinity, car: null };
    this.record = []; this.recT = 0; this.metres = 0;
    this.placeGrid();
  }
  makeCar(f, idx) {
    const p = tunedParams(f.carId, f.install), tr = this.tr, c = newCar(p, tr, 0, 0);
    const skill = f.skill ?? 0.9, prof = getProfile(tr, this.line, p, tr.id);
    if (f.oil) c.oil = f.oil; if (this.setup.wear != null) c.wear = [1, 1, 1, 1].map((v) => v * this.setup.wear);
    if (f.fuel != null) c.fuel = f.fuel;
    return { idx, id: f.id ?? idx, carId: f.carId, name: f.name ?? 'CAR', colour: f.colour ?? 'red', paint: f.paint, install: f.install, player: !!f.player, c, p, prof, skill, baseSkill: skill, ai: !f.player, inp: { steer: 0, throttle: 0, brake: 0, handbrake: false, abs: true, tcs: 0.5, asm: 0.5, auto: true, steerRate: 3 }, crossings: 0, laps: 0, lapStart: 0, lastLap: null, bestLap: Infinity, finished: false, finishTime: null, lapTimes: [], stuckT: 0, lapseT: 0, lapseAt: 0, sineP: this.rand() * 6.28, noContact: 0, pitState: null, pits: 0, startDelay: 0, revT: 0, wrongWay: false, slip: false, prevGear: 1, recoverHold: 0, offTrackT: 0, positionNow: idx + 1, prog: 0, points: 0, laneBias: 0, tuned: f.tune };
  }
  placeGrid() {
    const tr = this.tr, S = this.setup, n = this.cars.length, L = tr.length;
    const grid = [...this.cars]; // slowest first (front): AI ascending, player last
    grid.sort((a, b) => (a.player ? 1 : 0) - (b.player ? 1 : 0) || a.baseSkill - b.baseSkill);
    this.grid = grid;
    grid.forEach((car, k) => {
      const row = k >> 1, side = (k & 1) ? 2.6 : -2.6; let s, speed = 0;
      if (S.start === 'rolling') { s = L - 150 - row * 12 - (k & 1) * 6; speed = 80 / 3.6; }
      else if (S.start === 'standing') { s = L - 10 - row * 9 - (k & 1) * 4; }
      else { s = wrap(S.startS ?? 0, L) - row * 12; speed = S.startSpeed ?? 0; }
      if (S.start === 'duel') { s = L - 8 - k * 0; }
      const i = Math.round(wrap(s, L) / tr.ds) % tr.N, c = newCar(car.p, tr, i, side * (S.start === 'flying' ? (S.laneT ?? 0) / 2.6 : 1));
      Object.assign(car.c, { x: c.x, z: c.z, y: c.y, yaw: c.yaw, loc: c.loc });
      car.c.vx = Math.sin(c.yaw) * speed; car.c.vz = Math.cos(c.yaw) * speed; car.c.gear = speed > 20 ? 3 : 1; car.c.rpm = car.p.idle; car.c.fuel = car.c.fuel ?? 1;
      car.crossings = (S.start === 'flying' && wrap(S.startS ?? 0, L) < L / 2) ? 1 : 0; car.gridPos = k;
      car.lapStart = 0; car.s0 = wrap(s, L); car.prevS = car.c.loc.s;
      if (S.start === 'duel') { car.startDelay = (S.rival === car ? 0 : 0); }
    });
    if (S.start === 'duel' && this.cars.length > 1) { this.cars.forEach((car, i) => { car.startDelay = i * 3; }); }
    if (S.start === 'standing') this.state = 'grid';
  }
  // -------- per-step --------
  step(inputs = {}, dt = 1 / 60) {
    this.events.length = 0; const tr = this.tr, L = tr.length;
    if (this.state === 'grid' && this.setup.hubHold) { /* the hub's clock lights the gantry and calls green */ } else if (this.state === 'grid') { this.lightT += dt; const lead = this.setup.start === 'standing' ? 5.5 : 0; if (this.setup.start === 'standing') { if (this.lightT > lead) this.green(); } else if (this.setup.start === 'duel') { this.green(); } else { /* rolling: wait for leader to reach the line */ const lead2 = this.grid[0]; if (lead2.crossings > 0) this.green(); } }
    this.time += dt; this.step_n++;
    const raceT = this.greenAt == null ? 0 : this.time - this.greenAt;
    for (const car of this.cars) this.drive(car, inputs[car.id] ?? inputs.player, dt, raceT);
    const cs = this.cars.map((x) => x.c);
    for (let sub = 0; sub < 4; sub++) {
      for (const car of this.cars) { if (car.held) continue; stepCar(car.c, car.inp, dt / 4, tr, this.env); }
      if (this.contact) collideCars(this.cars.filter((x) => x.noContact <= 0 && !x.pitState).map((x) => x.c));
      for (const car of this.cars) if (car.c.surface === 'kerb') car.kerbT = 1;
    }
    for (const car of this.cars) this.after(car, dt);
    this.updateOrder(); this.recordPoses(dt);
    if (this.player && this.player.finished && this.state !== 'over') { if (this.cars.every((c) => c.finished) || this.time - this.player.finishAt > 40) this.endRace(); }
  }
  green() { if (this.state !== 'grid') return; this.state = 'racing'; this.greenAt = this.time; this.events.push({ type: 'green' }); }
  drive(car, pin, dt, raceT) {
    const c = car.c, tr = this.tr, u = Math.hypot(c.vx, c.vz), inp = car.inp;
    if (car.pitState) return this.pitDrive(car, dt);
    if (this.state === 'grid' && this.setup.start === 'standing') { inp.steer = 0; inp.throttle = 0; inp.brake = 1; inp.handbrake = true; return; }
    if (this.state === 'grid' && this.setup.start === 'rolling') { this.rollingHold(car); return; }
    if (this.setup.start === 'duel' && raceT < car.startDelay) { inp.throttle = 0; inp.brake = 1; inp.handbrake = true; inp.steer = 0; return; }
    inp.handbrake = false;
    if (car.custom) { Object.assign(inp, car.custom(car, this)); return; }
    if (car.player && !car.ai) {
      const a = pin ?? {}; Object.assign(inp, { steer: a.steer ?? 0, throttle: a.throttle ?? 0, brake: a.brake ?? 0, handbrake: !!a.handbrake, abs: a.abs !== false, tcs: a.tcs ?? 0.5, asm: a.asm ?? 0.5, auto: a.auto !== false, up: !!a.up, down: !!a.down, steerRate: a.steerRate ?? 3 });
      if (this.rally && !a.noRallyAsm) inp.asm *= 0.5;
      // reverse: hold brake at a standstill 0.4 s
      if (inp.brake > 0.5 && u < 1 && inp.throttle < 0.1) car.revT += dt; else if (inp.throttle > 0.1) { car.revT = 0; inp.reverse = false; } else if (inp.brake < 0.1 && !inp.reverse) car.revT = 0;
      if (car.revT > 0.4 && inp.throttle < 0.1) { inp.reverse = true; } if (inp.reverse) { if (inp.throttle > 0.1) { inp.reverse = false; car.revT = 0; } else { inp.throttle = inp.brake; inp.brake = 0; } }
      this.maybeEnterPit(car);
      // hold to recover
      if (a.recover && (!c.onTrack || u < 2)) { car.recoverHold += dt; if (car.recoverHold >= 1) { this.recover(car); car.recoverHold = 0; } } else car.recoverHold = 0;
    } else this.aiInput(car, dt, raceT);
  }
  rollingHold(car) { // everyone is held to ~90 km/h until the leader reaches the line; follow the line quietly
    const u = Math.hypot(car.c.vx, car.c.vz), saved = car.skill; car.skill = 0.5; this.aiInput(car, 1 / 60, 0); car.skill = saved;
    const hold = 80 / 3.6; if (u > hold) { car.inp.throttle = 0; car.inp.brake = Math.min(0.6, (u - hold) / 4); } else if (u < hold - 1) { car.inp.throttle = 0.7; car.inp.brake = 0; } else { car.inp.throttle = 0.3; car.inp.brake = 0; }
    car.inp.steerRate = 6;
  }
  aiInput(car, dt, raceT) {
    const c = car.c, tr = this.tr; let skill = car.skill;
    if (this.setup.rubber && this.player && car !== this.player) { const gap = (this.player.prog - car.prog) / 100; skill += Math.max(-1, Math.min(1, gap)) * this.setup.rubber; }
    if (car.lapseT > 0) { car.lapseT -= dt; skill -= 0.04; }
    else if (!car.player && car.baseSkill < 0.93 && c.loc.s > car.lapseAt && car.lapseAt > 0 && car.lapseArm) { car.lapseT = 2; car.lapseArm = false; }
    car.sineP += dt * 0.4; const lane = Math.sin(car.sineP) * 0.6 + car.laneBias;
    if (car.recoverTimerAI === undefined) car.recoverTimerAI = 0;
    const o = { skill, lane, tcs: 0.7, asm: 0.6 };
    const field = this.contact ? this.cars.map((x) => x.c) : null;
    const inp = aiDrive(c, tr, this.line, car.prof, o, field); Object.assign(car.inp, inp);
    car.inp.handbrake = false; car.inp.reverse = false;
    if (this.setup.start === 'duel' || !this.contact) { /* no passing logic needed */ }
    // AI stuck: recover after 3 s
    const u = Math.hypot(c.vx, c.vz); if (u < 1.2 && this.state === 'racing' && !car.finished && raceT > 3) car.stuckT += dt; else car.stuckT = 0; if (car.stuckT > 3) { this.recover(car); car.stuckT = 0; }
    if (car.player && car.ai) { car.inp.tcs = 0.5; }
    // AI pits (endurance)
    if (this.pit && this.setup.pitAI && (!car.player || car.botPit) && !car.finished) { const w = c.wear.reduce((a, b) => a + b, 0) / 4; if ((w < 0.3 || c.fuel < 0.12) && !car.pitCalled) { car.pitCalled = true; } if (car.pitCalled) this.maybeEnterPit(car, true); }
  }
  maybeEnterPit(car, ai = false) {
    if (!this.pit || car.pitState || this.state !== 'racing') return; const c = car.c, tr = this.tr, L = tr.length, d = wrap(c.loc.s - this.pit.in, L), h = tr.width[c.loc.i] / 2;
    if (d < 60 && (ai || c.loc.t > h + 1.2) && (ai ? d < 8 : true)) { car.pitState = { phase: 'in', t: 0, tyres: true, skipTyres: false, service: 0, total: 0 }; car.pits++; car.pitCalled = false; c.inPit = true; this.events.push({ type: 'pitIn', car: car.id }); }
  }
  pitDrive(car, dt) { // autopilot: lane along t = h + 5; stops in the box; leaves at 60 km/h
    const c = car.c, tr = this.tr, L = tr.length, ps = car.pitState, inp = car.inp, h = tr.width[c.loc.i] / 2, laneT = h + 5.5;
    inp.abs = true; inp.tcs = 0.7; inp.asm = 0.5; inp.handbrake = false; inp.reverse = false; inp.auto = true; inp.steerRate = 4;
    const u = Math.hypot(c.vx, c.vz), s = c.loc.s; let ahead = 14 + u * 0.7, targetS = s + ahead, boxD = wrap(this.pit.box - s + L / 2, L) - L / 2, vT = PIT_SPEED, stop = false;
    if (ps.phase === 'in') { vT = PIT_SPEED; if (boxD < 80) vT = Math.max(2, Math.min(PIT_SPEED, Math.sqrt(2 * 5 * Math.max(0, boxD - 1.5)))); if (boxD < 1.5 && u < 1.2) { ps.phase = 'service'; ps.t = 0; const wear = c.wear.reduce((a, b) => a + b, 0) / 4; ps.tyres = (ps.tyres && (wear < 0.7)); ps.fuelNeed = 1 - c.fuel; ps.total = (ps.tyres ? 4 : 0) + ps.fuelNeed * 100 * 0.1; this.events.push({ type: 'pitStop', car: car.id, tyres: ps.tyres, total: ps.total }); } stop = boxD < 1.5; }
    if (ps.phase === 'service') { ps.t += dt; stop = true; const tyresT = ps.tyres && !ps.skipTyres ? 4 : 0, total = tyresT + ps.fuelNeed * 10; if (ps.skipTyres && ps.t > 0.2 && ps.tyres) { ps.tyres = false; } if (ps.t >= (ps.tyres ? total : ps.fuelNeed * 10)) { if (ps.tyres) c.wear = [1, 1, 1, 1]; c.fuel = 1; ps.phase = 'out'; ps.t = 0; this.events.push({ type: 'pitDone', car: car.id }); } else { if (ps.tyres && ps.t >= 4 && !ps.tyDone) { c.wear = [1, 1, 1, 1]; ps.tyDone = true; } c.fuel = Math.min(1, c.fuel + (ps.fuelNeed / Math.max(0.1, ps.fuelNeed * 10)) * dt); } }
    if (ps.phase === 'out') { vT = PIT_SPEED; const outD = wrap(this.pit.out - s, L); if (outD > L - 40 || outD < 2) { /* merged */ } const done = wrap(s - this.pit.out, L) < 60 && wrap(s - this.pit.out, L) < L / 2; if (done) { car.pitState = null; c.inPit = false; car.laneBias = 0; return; } }
    // lateral target: smoothly slide onto the pit lane (t = laneT) and back to the line at the out merge
    let tT = laneT; const sinceIn = wrap(s - this.pit.in, L), spanIn = 40; if (ps.phase === 'in' && sinceIn < spanIn) tT = c.loc.t + (laneT - c.loc.t) * Math.min(1, 0.4 + sinceIn / spanIn); if (ps.phase === 'out') { const toOut = wrap(this.pit.out - s, L); if (toOut < 90) tT = laneT * (toOut / 90) + 1 * (1 - toOut / 90); if (wrap(s - this.pit.out, L) < L / 2 && toOut > L / 2) tT = 0; }
    targetS = s + ahead; const i = Math.round(wrap(targetS, L) / tr.ds) % tr.N, tx = tr.x[i] - tr.tz[i] * tT, tz = tr.z[i] + tr.tx[i] * tT, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), dx = tx - c.x, dz = tz - c.z, fwd = dx * sn + dz * cs, rgt = -dx * cs + dz * sn, curv = (2 * rgt) / Math.max(1, fwd * fwd + rgt * rgt);
    const au = Math.max(Math.abs(c.u), 5), limit = Math.min(car.p.lock, Math.atan((car.p.L * car.p.tyreMu * 9.81 * 1.1) / (au * au)) + car.p.alphaP * 0.9 + Math.abs(c.beta));
    inp.steer = Math.max(-1, Math.min(1, Math.atan(curv * car.p.L) / limit)); const err = vT - u;
    inp.throttle = stop ? 0 : err > 0.5 ? Math.min(1, 0.3 + err * 0.3) : 0; inp.brake = stop ? 1 : err < -0.5 ? Math.min(1, -err * 0.3) : 0;
    if (stop && u < 0.5) { c.vx *= 0.5; c.vz *= 0.5; }
  }
  recover(car) { const c = car.c, tr = this.tr, i = c.loc.i, ln = this.line; c.x = ln.px[i]; c.z = ln.pz[i]; c.vx = c.vz = 0; c.r = 0; c.yaw = Math.atan2(tr.tx[i], tr.tz[i]); c.delta = 0; c.y = tr.y[i]; c.vy = 0; c.gear = 1; car.noContact = 2; car.inPit = false; this.events.push({ type: 'recover', car: car.id }); if (car.player && this.setup.noRecover) car.failed = true; }
  after(car, dt) {
    const c = car.c, tr = this.tr, L = tr.length;
    if (car.noContact > 0) car.noContact -= dt;
    // laps: s wraps past 90% to under 10% going forward
    const s = c.loc.s; if (car.prevS > L * 0.9 && s < L * 0.1) { car.crossings++; if (car.crossings > 1) { const lt = this.time - car.lapStart; car.lapTimes.push(lt); car.lastLap = lt; if (lt < car.bestLap) car.bestLap = lt; if (lt < this.fastest.time) this.fastest = { time: lt, car }; this.events.push({ type: 'lap', car: car.id, time: lt, lap: car.crossings - 1 }); car.laps = car.crossings - 1; if (!car.player) { car.lapseAt = L * (0.15 + this.rand() * 0.7); car.lapseArm = true; } }
      car.lapStart = this.time; if (car.laps >= this.laps && !car.finished) this.finish(car); }
    else if (car.prevS < L * 0.1 && s > L * 0.9 && car.crossings > 0) { car.crossings--; } // went backwards over the line
    car.prevS = s; car.prog = car.crossings >= 1 ? (car.crossings - 1) * L + s : (s > L * 0.5 ? s - L : s);
    // events
    if (c.gear !== car.prevGear) { this.events.push({ type: 'shift', car: car.id, up: c.gear > car.prevGear }); car.prevGear = c.gear; }
    if (c.contact > 2.5) { this.events.push({ type: car.c.touching && car.c.touching.contact > 0 ? 'carHit' : 'wallHit', car: car.id, v: c.contact }); } c.contact = 0; c.touching = null;
    if (c.locked && !car.wasLocked) this.events.push({ type: 'lockup', car: car.id }); car.wasLocked = c.locked;
    if (car.kerbT) { car.kerbT = 0; if (Math.hypot(c.vx, c.vz) > 10) this.events.push({ type: 'kerb', car: car.id }); }
    car.offTrackT = c.onTrack ? 0 : car.offTrackT + dt;
    // wrong way
    const tang = Math.atan2(tr.tx[c.loc.i], tr.tz[c.loc.i]); let e = tang - c.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI; car.wrongWay = Math.abs(e) > 2.2 && Math.hypot(c.vx, c.vz) > 5;
    // slipstream
    let slip = false; if (Math.hypot(c.vx, c.vz) > 100 / 3.6 && this.state === 'racing') for (const b of this.cars) { if (b === car) continue; const gap = wrap(b.c.loc.s - s, L); if (gap > 1 && gap < 25 && Math.abs(b.c.loc.t - c.loc.t) < 2) { slip = true; break; } }
    car.slip = slip; c.dragScale = slip ? (this.env.slip ?? 0.65) : 1;
    if (car.player) this.metres = Math.max(this.metres, car.prog);
  }
  finish(car) { car.finished = true; car.finishTime = this.time - (this.greenAt ?? 0) - (car.startDelay ?? 0); car.finishAt = this.time; this.events.push({ type: 'finish', car: car.id, time: car.finishTime }); if (car.player) { car.ai = true; car.finishLap = true; } }
  endRace() { this.state = 'over'; this.finishedAll = true; this.events.push({ type: 'raceOver' }); }
  updateOrder() { this.order = [...this.cars].sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.finishAt - b.finishAt : b.prog - a.prog)); this.order.forEach((c, i) => { c.positionNow = i + 1; }); }
  gapAhead(car) { const k = car.positionNow - 1; if (k <= 0) return null; const b = this.order[k - 1], dist = b.prog - car.prog; return dist / Math.max(10, Math.hypot(car.c.vx, car.c.vz)); }
  gapBehind(car) { const k = car.positionNow; if (k >= this.order.length) return null; const b = this.order[k]; return (car.prog - b.prog) / Math.max(10, Math.hypot(b.c.vx, b.c.vz)); }
  results() { // time for unfinished cars: extrapolated
    return this.order.map((car, i) => ({ pos: i + 1, car, name: car.name, carId: car.carId, finished: car.finished, time: car.finishTime ?? (this.time - (this.greenAt ?? this.time)) + Math.max(0, this.laps * this.tr.length - car.prog - 0) / Math.max(15, Math.hypot(car.c.vx, car.c.vz)), best: car.bestLap }));
  }
  recordPoses(dt) { this.recT += dt; if (this.recT < 1 / 30 - 1e-6) return; this.recT -= 1 / 30; const rec = []; for (const car of this.cars) { const c = car.c, i = c.loc.i; rec.push(c.x, c.y, c.z, c.yaw, -Math.atan(this.tr.slope[i]), c.ay * 0.009, c.delta, c.rpm, car.inp.throttle, c.gear, (car.inp.brake > 0.2 ? 1 : 0) | (c.sliding ? 2 : 0) | (c.airborne ? 4 : 0) | (car.pitState ? 8 : 0) | (car.slip ? 16 : 0), c.ax); } this.record.push(rec); }
  teleport(car, s) { const tr = this.tr, i = Math.round(((s % tr.length) + tr.length) % tr.length / tr.ds) % tr.N, c = car.c; c.x = this.line.px[i]; c.z = this.line.pz[i]; c.y = tr.y[i]; c.vx = c.vz = c.r = c.vy = 0; c.yaw = Math.atan2(tr.tx[i], tr.tz[i]); c.delta = 0; c.loc.i = i; c.loc.s = i * tr.ds; car.prevS = c.loc.s; car.noContact = 2; }
  devFinish(pos) { const player = this.player ?? this.cars[0]; const order = this.cars.filter((c) => c !== player).sort((a, b) => b.prog - a.prog); order.splice(Math.max(0, Math.min(order.length, pos - 1)), 0, player); let k = 0; for (const car of order) { if (!car.finished) { car.finished = true; car.finishTime = (this.time - (this.greenAt ?? 0)) + k * 0.7; car.finishAt = this.time + k * 0.7; } else car.finishAt = this.time + k * 0.7; k++; } if (player) player.ai = true; this.order = order; order.forEach((c, i) => { c.positionNow = i + 1; }); this.endRace(); }
  snapshot() { return JSON.parse(JSON.stringify({ time: this.time, state: this.state, greenAt: this.greenAt, cars: this.cars.map((c) => ({ c: c.c, crossings: c.crossings, laps: c.laps, prog: c.prog, lapStart: c.lapStart, finished: c.finished, finishTime: c.finishTime, prevS: c.prevS })) })); }
  restore(s) { this.time = s.time; this.state = s.state; this.greenAt = s.greenAt; s.cars.forEach((o, i) => { const car = this.cars[i]; for (const k of Object.keys(o.c)) { if (k === 'loc') Object.assign(car.c.loc, o.c.loc); else if (k !== 'p' && k !== 'touching') car.c[k] = o.c[k]; } Object.assign(car, { crossings: o.crossings, laps: o.laps, prog: o.prog, lapStart: o.lapStart, finished: o.finished, finishTime: o.finishTime, prevS: o.prevS }); }); }
  fingerprint() { let h = 0; for (const car of this.cars) { const c = car.c; h = (h * 31 + Math.round(c.x * 10) + Math.round(c.z * 10) * 7 + car.laps * 13 + Math.round(c.wear[0] * 100)) | 0; } return h >>> 0; }
}
export const POS_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
