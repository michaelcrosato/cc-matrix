// RaceSim: the field, laps, flags, starts, pit lane, slipstream, results, replay feed and events. Plain JS, no engine.
import { aiDrive, buildTrack, collideCars, G, newCar, racingLine, RHO, speedProfile, stepCar } from './sim.js';
import { TRACKS } from '../data/tracks.js';
import { tunedParams } from './tuning.js';
import { F_AIR, F_BRAKE, F_HEAD, F_LOCK, F_PIT, F_SLIDE, FIELDS, GhostTrace, Recording } from './replaydata.js';

export const PIT_WIDTH = 8, PIT_SPEED = 60 / 3.6;
const lineCache = new Map(), profileCache = new Map();
export function loadTrack(id, { rain = false } = {}) {
  const tr = buildTrack(TRACKS[id]);
  tr.id = id; tr.name = TRACKS[id].name; tr.pit = TRACKS[id].pit ?? null;
  if (rain) tr.muScale = 0.78;
  if (!lineCache.has(id)) lineCache.set(id, racingLine(tr));
  if (tr.pit) { const inner = tr.pit.in; tr.pit = { ...tr.pit, lead: inner - 60 }; forPit(tr, (i) => { tr.wallR[i] = PIT_WIDTH + 2; }); }
  return { tr, line: lineCache.get(id) };
}
export const wrapS = (tr, s) => ((s % tr.length) + tr.length) % tr.length;
const rel = (tr, s) => { let d = wrapS(tr, s); if (d > tr.length / 2) d -= tr.length; return d; };
function forPit(tr, fn) { const from = tr.pit.lead ?? tr.pit.in; for (let i = 0; i < tr.N; i++) { const d = rel(tr, i * tr.ds); if (d >= from && d <= tr.pit.out) fn(i, d); } }
export function trackPoint(tr, s, t, out = {}) {
  const S = wrapS(tr, s), f = S / tr.ds, i = Math.floor(f) % tr.N, j = (i + 1) % tr.N, u = f - Math.floor(f), L = (a) => a[i] + (a[j] - a[i]) * u, tx = L(tr.tx), tz = L(tr.tz), bk = L(tr.bank);
  out.x = L(tr.x) - tz * t; out.z = L(tr.z) + tx * t; out.y = L(tr.y) - t * Math.sin(bk); out.yaw = Math.atan2(tx, tz); out.i = i; out.tx = tx; out.tz = tz; out.width = L(tr.width); out.bank = bk; out.slope = tr.slope[i];
  return out;
}
export function indexOfS(tr, s) { return Math.round(wrapS(tr, s) / tr.ds) % tr.N; }
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function carProfile(tr, line, p, carId, installKey) {
  const key = `${tr.id}|${carId}|${installKey}|${tr.muScale}`;
  let v = profileCache.get(key);
  if (!v) {
    const surf = (tr.surface === 'dirt' ? (p.tyreTable?.dirt ?? 0.62) : 1) * tr.muScale;
    // Steep banking: the flat-road estimate is too hopeful, and a car that overdrives it scrapes the wall and eats its tyres.
    // Measured on Saltline: this limit is quicker and clean for every car. It leaves flat circuits alone.
    let vCap = null;
    for (let i = 0; i < tr.N; i++) if (Math.abs(tr.bank[i]) > 0.15) {
      vCap ??= new Float64Array(tr.N).fill(110);
      const mu = p.tyreMu * 0.57 * surf, tb = Math.tan(Math.abs(tr.bank[i])), muB = (mu + tb) / Math.max(0.2, 1 - mu * tb), den = Math.max(Math.abs(line.kappa[i]), 1e-5) - (muB * (RHO * p.clA)) / (2 * p.mass);
      vCap[i] = den > 1e-5 ? Math.min(110, Math.sqrt((muB * G) / den)) : 110;
    }
    v = speedProfile(tr, line, vCap ? { ...p, vCap } : p, surf); profileCache.set(key, v);
  }
  return v;
}
export const defaultEnv = () => ({ gripScale: 1, powerScale: 1, brakeScale: 1, aeroScale: 1, wearScale: 1, fuelScale: 1, wallLoss: 1, stability: 1, traction: 1, rubber: 0, slip: 0.65, aiPace: null, god: false, steerRate: 3 });
const BASE_WEAR = 0.0012, BASE_FUEL = 0.0018;
export class RaceSim {
  // setup: { kind, track, laps, rain, start, startS, startSpeed, contact, wear, fuel, cars: [{ carId, install, oil, name, paint, skill, player, assists, seat }], seed, stagger }
  constructor(setup) {
    this.setup = setup; this.kind = setup.kind ?? 'race'; this.laps = setup.laps ?? 1; this.rng = mulberry(setup.seed ?? 1);
    const { tr, line } = loadTrack(setup.track, { rain: setup.rain }); this.tr = tr; this.line = line;
    this.contact = setup.contact !== false; this.wearMul = setup.wear ?? 1; this.fuelMul = setup.fuel ?? 1; this.env = setup.env ?? defaultEnv();
    this.frame = 0; this.time = 0; this.greenAt = null; this.phase = 'grid'; this.lights = 0; this.lightT = 0; this.events = []; this.order = []; this.done = false; this.leaderFinishedAt = null; this.hold = !!setup.hold; this.subEnv = {}; this.flaggedAt = null; this.hourNow = setup.hour ?? TRACKS[setup.track].hour; this.cool = false;
    this.cars = setup.cars.map((d, i) => this.makeEntry(d, i));
    this.placeGrid();
    this.players = this.cars.filter((e) => e.player !== null && e.player !== undefined);
    this.order = this.cars.slice();
    this.rec = setup.record === false ? null : new Recording({ track: setup.track, hour: this.hourNow, hourEnd: setup.hourEnd ?? null, rain: !!setup.rain, cars: this.cars.map((e) => ({ carId: e.carId, install: e.install, name: e.name, paint: e.paint, player: e.player ?? null })) });
    this.recVals = new Array(FIELDS).fill(0);
    this.updateOrder();
  }
  makeEntry(d, i) {
    const p = tunedParams(d.carId, d.install), tr = this.tr, c = newCar(p, tr, 0, 0), installKey = d.install ? JSON.stringify(d.install) : '';
    c.oil = d.oil ?? 1;
    const e = { i, carId: d.carId, install: d.install ?? null, name: d.name ?? `CAR ${i + 1}`, paint: d.paint ?? null, player: d.player ?? null, seat: d.seat ?? null, c, p, installKey, speeds: carProfile(tr, this.line, p, d.carId, installKey), skill: d.skill ?? 0.9, assists: d.assists ?? null, lap: 0, lastS: 0, lapStart: null, lastLap: null, bestLap: null, finished: false, finishTime: null, retired: false, progress: 0, pit: null, noContact: 0, stopped: 0, recoveries: 0, walls: 0, topSpeed: 0, wrongWay: false, reverse: false, brakeHold: 0, dirt: d.dirt ?? 0, dirtM: 0, metres: 0, lapse: 0, lapseAt: 0.2 + 0.6 * this.rng(), phase: this.rng() * 6.28, slip: false, autoDrive: false, wantPit: false, pits: 0, startDelay: d.startDelay ?? 0, ownStart: null, splits: [], lastSurface: null, lastGear: 1, lastWalls: 0, lastAir: false, airT: 0, lockT: 0, onLapDirty: false, flagged: false, input: null, laneNow: 0 };
    return e;
  }
  placeGrid() {
    const s = this.setup, tr = this.tr, n = this.cars.length;
    const place = (e, S, t, speed) => { const i = indexOfS(tr, S), pt = trackPoint(tr, S, t), c = e.c; c.x = pt.x; c.z = pt.z; c.y = pt.y; c.yaw = pt.yaw; c.loc.i = i; c.loc.s = wrapS(tr, S); c.loc.t = t; c.vx = Math.sin(pt.yaw) * speed; c.vz = Math.cos(pt.yaw) * speed; c.u = speed; e.lastS = wrapS(tr, S); c.laneNow = t - this.line.off[i]; e.gridT = t; };
    const kind = s.start ?? 'standing';
    if (kind === 'rolling') {
      this.phase = 'rolling';
      this.cars.forEach((e, k) => place(e, -150 - Math.floor(k / 2) * 12, k % 2 ? 2.6 : -2.6, 80 / 3.6));
    } else if (kind === 'flying') {
      this.phase = 'green'; this.greenAt = 0;
      const S = s.startS ?? -220;
      this.cars.forEach((e, k) => { place(e, S - k * 12, 0, (s.startSpeed ?? 120) / 3.6); e.ownStart = 0; });
    } else { // standing, and rally's stagger
      this.phase = 'grid';
      const S0 = s.startS ?? -12;
      this.cars.forEach((e, k) => {
        const row = Math.floor(k / 2), staggered = kind === 'stagger';
        place(e, staggered ? S0 : S0 - row * 9, staggered || this.cars.length === 1 ? 0 : k % 2 ? 2.6 : -2.6, 0);
      });
    }
    this.updateProgressAll();
  }
  updateProgressAll() { for (const e of this.cars) e.progress = this.progressOf(e); }
  progressOf(e) { return (e.lap - 1) * this.tr.length + (e.lap === 0 ? wrapS(this.tr, e.c.loc.s) : e.c.loc.s); }
  go() { if (this.phase === 'grid') { this.hold = false; this.green(); } }
  green() { this.phase = 'green'; this.greenAt = this.time; for (const e of this.cars) if (e.startDelay === 0) e.ownStart = this.time; this.events.push({ type: 'flag', kind: 'green' }); }
  emit(type, car, extra) { this.events.push({ type, car: car?.i ?? -1, ...extra }); }
  drainEvents() { const ev = this.events; this.events = []; return ev; }
  envFor(e) {
    const v = this.env, god = v.god && e.player !== null, se = this.subEnv;
    se.gripScale = v.gripScale; se.powerScale = v.powerScale; se.brakeScale = v.brakeScale; se.aeroScale = v.aeroScale;
    se.wearRate = god ? 0 : BASE_WEAR * this.wearMul * v.wearScale; se.fuelRate = god ? 0 : BASE_FUEL * this.fuelMul * v.fuelScale; se.wallLoss = god ? 0 : v.wallLoss;
    return se;
  }
  aiInput(e, skillMul = 1) {
    const c = e.c, tr = this.tr, u = Math.hypot(c.vx, c.vz);
    let skill = (this.env.aiPace ?? e.skill) * skillMul * (tr.def.aiScale ?? 1);
    const wearNow = (c.wear[0] + c.wear[1] + c.wear[2] + c.wear[3]) / 4; skill *= Math.sqrt(0.72 + 0.28 * Math.sqrt(wearNow)); // a worn tyre has less to give, and the AI knows it
    if (e.lapse > 0) { skill -= 0.04; e.lapse -= 1 / 60; }
    if (this.env.rubber > 0 && this.players.length) { const lead = this.players[0].progress - e.progress; skill += Math.max(-1, Math.min(1, lead / 150)) * this.env.rubber; }
    let lane = Math.sin(e.phase + this.time * 0.3) * 0.6;
    if (this.phase === 'rolling') { lane = (e.gridT ?? 0) - this.line.off[c.loc.i]; }
    const field = this.contact && !e.finished ? (this.rawCars ??= this.cars.map((x) => x.c)) : null;
    const inp = aiDrive(c, tr, this.line, e.speeds, { skill, lane }, field);
    if (this.phase === 'rolling') { const err = 88 / 3.6 - u; inp.throttle = err > 0 ? Math.min(1, err) : 0; inp.brake = err < -1 ? 0.3 : 0; }
    if (tr.surface === 'dirt') inp.asm = (inp.asm ?? 0.6) * 0.5;
    return inp;
  }
  driverInput(e, raw) {
    // raw: { steer, throttle, brake, handbrake, up, down } from the input layer. Assists come from the profile.
    const c = e.c, a = e.assists ?? {}, env = this.env, inp = e.input ?? (e.input = {});
    let throttle = raw.throttle ?? 0, brake = raw.brake ?? 0;
    const speed = c.u;
    // Reverse: hold the brake at a standstill for 0.4 s. Any throttle returns to first.
    if (e.reverse) { if (throttle > 0.05) { e.reverse = false; c.gear = 1; } else { throttle = brake; brake = 0; } }
    else if (brake > 0.2 && throttle < 0.05 && Math.abs(speed) < 0.5) { e.brakeHold += 1 / 60; if (e.brakeHold > 0.4) { e.reverse = true; e.brakeHold = 0; c.gear = 1; } } else e.brakeHold = 0;
    inp.steer = raw.steer ?? 0; inp.throttle = throttle; inp.brake = brake; inp.handbrake = !!raw.handbrake; inp.reverse = e.reverse;
    inp.abs = a.abs !== false; inp.auto = a.auto !== false; inp.up = !!raw.up; inp.down = !!raw.down;
    inp.tcs = Math.min(1, ((a.tcs ?? 5) / 10) * env.traction); inp.asm = Math.min(1, ((a.asm ?? 5) / 10) * env.stability * (this.tr.surface === 'dirt' ? 0.5 : 1)); inp.steerRate = env.steerRate;
    if (this.phase === 'rolling') { if (c.u > 25) { inp.throttle = 0; if (c.u > 26) inp.brake = Math.max(inp.brake, 0.3); } }
    if (this.phase === 'grid') { inp.throttle = 0; inp.brake = 1; inp.handbrake = false; inp.reverse = false; }
    if (e.ownStart === null && this.phase !== 'rolling') { inp.throttle = 0; inp.brake = 1; }
    return inp;
  }
  step(inputs = []) {
    const dt = 1 / 60;
    this.frame++; this.time += dt;
    if (this.phase === 'grid' && !this.hold) {
      this.lightT += dt;
      const lit = Math.min(5, Math.floor(this.lightT / 0.6));
      if (lit !== this.lights) { this.lights = lit; this.events.push({ type: 'flag', kind: 'lights', n: lit }); }
      if (this.lightT > 3.4) this.green();
    }
    if (this.phase === 'rolling') {
      const leader = this.cars.reduce((a, b) => (this.progressOf(a) > this.progressOf(b) ? a : b));
      if (this.progressOf(leader) >= 0 && leader.lap >= 1) { this.green(); }
    }
    for (const e of this.cars) {
      if (e.ownStart === null && this.phase === 'green' && this.time - this.greenAt >= e.startDelay) { e.ownStart = this.time; if (e.player !== null) this.events.push({ type: 'flag', kind: 'green', own: true }); }
    }
    this.slipstream();
    for (const e of this.cars) {
      const human = e.player !== null && !e.autoDrive && !e.finished && !e.retired;
      if (e.pit) { e.inp = null; continue; }
      if (human) e.inp = this.driverInput(e, inputs[e.player] ?? {});
      else {
        const held = (this.phase === 'grid') || (e.ownStart === null && this.phase !== 'rolling');
        e.inp = held ? { steer: 0, throttle: 0, brake: 1, abs: true, auto: true, tcs: 0, asm: 0 } : this.aiInput(e, e.finished ? 0.82 : 1);
      }
    }
    const contactCars = this.contact ? this.cars.filter((e) => !e.pit && e.noContact <= 0 && !e.ghost).map((e) => e.c) : null;
    for (let sub = 0; sub < 4; sub++) {
      for (const e of this.cars) {
        if (e.pit) continue;
        const inp = e.inp;
        if (sub > 0 && inp.up) { inp.up = false; }
        if (sub > 0 && inp.down) { inp.down = false; }
        stepCar(e.c, inp, 1 / 240, this.tr, this.envFor(e));
      }
      if (contactCars) collideCars(contactCars);
    }
    for (const e of this.cars) this.post(e, dt);
    if (this.setup.hourEnd !== undefined && this.setup.hourEnd !== null && this.laps > 0) {
      const lead = Math.max(0, Math.max(...this.cars.map((e) => e.progress))) / (this.laps * this.tr.length);
      this.hourNow = (this.setup.hour ?? 18.5) + (this.setup.hourEnd - (this.setup.hour ?? 18.5)) * Math.min(1, lead);
    }
    this.updateOrder();
    this.checkFinish();
    if (this.rec && this.frame % 2 === 0) this.record();
  }
  slipstream() {
    const tr = this.tr, slip = this.env.slip;
    for (const e of this.cars) {
      e.slip = false; e.c.dragScale = 1;
      if (Math.abs(e.c.u) < 100 / 3.6 || e.pit) continue;
      for (const b of this.cars) {
        if (b === e || b.pit) continue;
        let gap = (b.c.loc.s - e.c.loc.s + tr.length) % tr.length;
        if (gap > 0.5 && gap < 25 && Math.abs(b.c.loc.t - e.c.loc.t) < 2) { e.c.dragScale = slip; e.slip = true; break; }
      }
    }
  }
  post(e, dt) {
    const c = e.c, tr = this.tr;
    if (e.pit) this.stepPit(e, dt);
    if (e.noContact > 0) e.noContact -= dt;
    // Lap count: s wraps from past 90% to under 10% going forward.
    const s = c.loc.s, L = tr.length;
    if (e.lastS > L * 0.9 && s < L * 0.1) this.crossLine(e);
    else if (e.lastS < L * 0.1 && s > L * 0.9) { if (e.lap > 0) e.lap--; }
    const moved = Math.min(5, Math.abs(wrapDelta(s, e.lastS, L)));
    e.metres += moved;
    if (c.surface === 'dirt' || c.surface === 'gravel') { e.dirtM += moved; e.dirt = Math.min(1, e.dirt + moved * 0.0002); }
    e.lastS = s;
    e.progress = this.progressOf(e);
    e.topSpeed = Math.max(e.topSpeed, Math.abs(c.u));
    const sp = Math.hypot(c.vx, c.vz);
    // Wrong way
    const dot = Math.sin(c.yaw) * tr.tx[c.loc.i] + Math.cos(c.yaw) * tr.tz[c.loc.i];
    e.wrongWay = !e.pit && dot < 0 && sp > 5;
    // Events
    if (c.gear !== e.lastGear) { this.emit('shift', e, { up: c.gear > e.lastGear, gear: c.gear }); e.lastGear = c.gear; }
    if (c.surface !== e.lastSurface) { if (c.surface === 'kerb' && sp > 8) this.emit('kerb', e); e.lastSurface = c.surface; }
    if (c.wallHits !== e.lastWalls) { e.walls += c.wallHits - e.lastWalls; if (c.contact > 0.6) this.emit('wallHit', e, { v: c.contact }); e.lastWalls = c.wallHits; }
    else if (c.touching) { if (c.contact > 0.6) this.emit('carHit', e, { v: c.contact }); }
    c.touching = null; c.contact = 0;
    if (c.locked) { e.lockT += dt; if (e.lockT > 0.08 && !e.lockedNow) { e.lockedNow = true; this.emit('lockup', e); } } else { e.lockT = 0; e.lockedNow = false; }
    if (c.airborne !== e.lastAir) { if (e.lastAir && e.airT > 0.12) this.emit('land', e, { air: e.airT, v: Math.abs(c.vy) }); e.lastAir = c.airborne; e.airT = 0; }
    if (c.airborne) e.airT += dt;
    // Pit entry
    if (tr.pit && !e.pit && !e.finished) {
      const d = rel(tr, s), halfW = tr.width[c.loc.i] / 2, human = e.player !== null && !e.autoDrive, mouth = d > tr.pit.in - 4 && d < tr.pit.in + 8;
      c.inPit = d >= tr.pit.lead && d <= tr.pit.out && c.loc.t > halfW;
      if (human) { if (c.u > 1 && c.loc.t > halfW + (this.laps >= 10 ? 0.3 : 3) && d >= tr.pit.in - 4 && d < tr.pit.box - 40) this.enterPit(e); } // in a short race it takes a deliberate move: running wide off the last corner is not a pit stop
      else if (mouth && (e.wantPit || this.needsPit(e))) this.enterPit(e);
    }
    // AI: wants a stop; and AI that stops gets itself back on the road.
    const isAi = e.player === null || e.autoDrive;
    if (isAi && !e.pit) {
      if (this.needsPit(e)) e.wantPit = true;
      if (sp < 1 && this.phase === 'green' && e.ownStart !== null) { e.stopped += dt; if (e.stopped > 3) this.recover(e.i); } else e.stopped = 0;
      if (e.skill < 0.93 && e.lapse <= 0 && e.lapseAt >= 0) { const f = s / L; if (Math.abs(f - e.lapseAt) < 0.004 && !e.lapsedThisLap) { e.lapse = 2; e.lapsedThisLap = true; } }
    }
    // Splits: the time at each 20 m, for gap readouts between staggered cars.
    if (e.ownStart !== null) { const k = Math.floor(Math.max(0, e.progress) / 20); if (k >= e.splits.length) { for (let n = e.splits.length; n <= k; n++) e.splits[n] = this.time - e.ownStart; } }
  }
  needsPit(e) { if (!e.p) return false; const mean = (e.c.wear[0] + e.c.wear[1] + e.c.wear[2] + e.c.wear[3]) / 4; return !!this.tr.pit && (mean < 0.3 || e.c.fuel < 0.12) && !e.finished && this.laps >= 10; }
  crossLine(e) {
    e.lap++; e.lapsedThisLap = false;
    const now = this.time;
    if (e.lapStart !== null && !e.finished) {
      const t = now - e.lapStart; e.lastLap = t; if (e.bestLap === null || t < e.bestLap) { e.bestLap = t; }
      this.emit('lap', e, { time: t, lap: e.lap });
    } else if (e.lap === 1) this.emit('lap', e, { time: null, lap: 1 });
    e.lapStart = now;
    if (!e.finished && this.laps > 0 && e.lap > this.laps && this.phase !== 'rolling') {
      e.finished = true; e.finishTime = e.ownStart !== null ? now - e.ownStart : now;
      this.emit('flag', e, { kind: 'finish', own: e.player !== null });
      if (this.leaderFinishedAt === null) this.leaderFinishedAt = now;
      if (e.player !== null) e.autoDrive = true;
    } else if (!e.finished && this.laps > 0 && e.lap === this.laps && e.player !== null) this.emit('flag', e, { kind: 'finalLap' });
  }
  enterPit(e) {
    const c = e.c, tr = this.tr, halfW = tr.width[c.loc.i] / 2;
    e.pit = { phase: 'in', s: rel(tr, c.loc.s), t: c.loc.t, speed: Math.min(Math.abs(c.u), 45), box: tr.pit.box + (e.i - this.cars.length / 2) * 12, laneT: halfW + 3.6, boxT: halfW + 5.6, svc: 0, tyres: 0, fuel: 0, skipTyres: false, startedAt: this.time };
    c.inPit = true; e.wantPit = false; e.pits++; c.dragScale = 1;
    this.emit('pitIn', e);
  }
  stepPit(e, dt) {
    const c = e.c, tr = this.tr, P = e.pit, A = 14;
    if (P.phase === 'in') {
      const dist = P.box - P.s, stopV = Math.sqrt(Math.max(0, 2 * 7 * dist));
      const want = Math.min(PIT_SPEED, stopV);
      P.speed = P.speed > want ? Math.max(want, P.speed - A * dt) : Math.min(want, P.speed + 8 * dt);
      P.s += P.speed * dt;
      P.t += (P.laneT - P.t) * Math.min(1, dt * 1.8);
      if (dist < 28) P.t += (P.boxT - P.t) * Math.min(1, dt * 2.2);
      if (dist < 0.3 || (P.speed < 0.3 && dist < 3)) {
        P.phase = 'box'; P.speed = 0;
        const mean = (c.wear[0] + c.wear[1] + c.wear[2] + c.wear[3]) / 4;
        P.tyres = mean < 0.7 ? 4 : 0;
        P.fuel = (1 - c.fuel) * 100 * 0.1;
        P.total = Math.max(P.tyres, P.fuel);
        this.emit('pitBox', e, { tyres: P.tyres > 0, fuel: P.fuel });
      }
    } else if (P.phase === 'box') {
      P.svc += dt;
      if (P.fuel > 0) c.fuel = Math.min(1, c.fuel + (dt / 0.1) / 100);
      if (P.skipTyres) P.tyres = 0;
      if (P.svc >= Math.max(P.tyres, P.fuel)) {
        if (P.tyres > 0) { c.wear[0] = c.wear[1] = c.wear[2] = c.wear[3] = 1; }
        P.phase = 'out'; this.emit('pitGo', e, { time: P.svc });
      }
    } else if (P.phase === 'out') {
      P.speed = Math.min(PIT_SPEED, P.speed + 9 * dt);
      P.s += P.speed * dt;
      const halfW = tr.width[c.loc.i] / 2, remain = tr.pit.out - P.s;
      if (remain > 90) P.t += (P.laneT - P.t) * Math.min(1, dt * 1.5); else P.t += (halfW - 1.8 - P.t) * Math.min(1, dt * 0.9);
      if (remain <= 0) {
        const pt = trackPoint(tr, P.s, P.t); c.vx = Math.sin(pt.yaw) * P.speed; c.vz = Math.cos(pt.yaw) * P.speed; c.inPit = false; e.pit = null; e.noContact = 1.5; c.delta = 0; c.r = 0;
        this.emit('pitOut', e);
        return;
      }
    }
    const pt = trackPoint(tr, P.s, P.t);
    c.x = pt.x; c.z = pt.z; c.y = pt.y; c.yaw = pt.yaw; c.vy = 0; c.vx = Math.sin(pt.yaw) * P.speed; c.vz = Math.cos(pt.yaw) * P.speed; c.u = P.speed; c.w = 0; c.r = 0; c.delta *= 0.9; c.ax = 0; c.ay = 0;
    c.rpm = c.p.idle + P.speed * 120; c.gear = 1; c.sliding = false; c.locked = false; c.airborne = false; c.surface = 'apron';
    c.loc.i = pt.i; c.loc.s = wrapS(tr, P.s); c.loc.t = P.t;
  }
  skipTyres(i) { const P = this.cars[i]?.pit; if (P && P.phase === 'box') P.skipTyres = true; }
  recover(i) {
    const e = this.cars[i], c = e.c, tr = this.tr, line = this.line;
    if (e.pit) return false;
    const k = c.loc.i, x = line.px[k], z = line.pz[k], yaw = Math.atan2(tr.tx[k], tr.tz[k]);
    c.x = x; c.z = z; c.y = tr.y[k]; c.vy = 0; c.yaw = yaw; c.vx = 0; c.vz = 0; c.r = 0; c.delta = 0; c.gear = 1; c.ax = 0; c.ay = 0; c.shift = 0; c.loc.t = line.off[k]; c.u = 0; c.w = 0; c.laneNow = 0;
    e.noContact = 2; e.reverse = false; e.stopped = 0; e.recoveries++;
    this.emit('recover', e);
    return true;
  }
  retire(i) { const e = this.cars[i]; e.retired = true; e.autoDrive = true; e.finished = true; e.finishTime = null; }
  updateOrder() {
    const score = (e) => (e.retired ? -1e9 : e.finished && e.finishTime !== null ? 1e9 - e.finishTime : e.progress);
    this.order = this.cars.slice().sort((a, b) => score(b) - score(a));
    this.order.forEach((e, k) => { e.pos = k + 1; });
  }
  checkFinish() {
    // After the leader flag, a player gets a while to finish; then they are flagged where they are.
    if (this.leaderFinishedAt !== null && !this.done) {
      const best = this.cars.reduce((a, e) => (e.bestLap && (!a || e.bestLap < a) ? e.bestLap : a), null) ?? 90;
      if (this.time - this.leaderFinishedAt > Math.max(60, best * 1.25)) {
        for (const e of this.cars) if (!e.finished && !e.flagged) { e.flagged = true; if (e.player !== null) { e.finished = true; e.finishTime = null; e.autoDrive = true; this.emit('flag', e, { kind: 'finish', own: true, flagged: true }); } }
      }
    }
    if (!this.done && this.players.length && this.players.every((e) => e.finished)) {
      // Rally: the clock decides, so wait until the rival has finished or its clock has passed ours.
      const stagger = this.setup.start === 'stagger', me = this.players[0], rival = stagger ? this.cars.find((x) => x !== me) : null;
      if (!stagger || !rival || rival.finished || me.finishTime === null || (rival.ownStart !== null && this.time - rival.ownStart > me.finishTime)) { this.done = true; this.doneAt = this.time; }
    }
  }
  // Times shown to the player: leader's time, gaps for the rest.
  results() {
    const rows = this.order.map((e) => ({ i: e.i, name: e.name, carId: e.carId, player: e.player, pos: e.pos, time: e.finishTime, finished: e.finished && !e.retired && e.finishTime !== null, retired: e.retired, best: e.bestLap, progress: e.progress }));
    const leader = rows[0], lapLen = this.tr.length;
    for (const r of rows) {
      if (r === leader) { r.text = r.finished ? formatTime(r.time) : '--:--'; continue; }
      if (r.finished) r.text = `+${(r.time - leader.time).toFixed(2)}`;
      else if (r.retired) r.text = 'RETIRED';
      else { const laps = Math.max(0, Math.floor((leader.progress - r.progress) / lapLen)); r.text = laps >= 1 ? `+${laps} LAP` : 'RUNNING'; }
    }
    return rows;
  }
  gapAhead(e) {
    const k = this.order.indexOf(e); if (k <= 0) return null;
    const a = this.order[k - 1], d = a.progress - e.progress, v = Math.max(8, Math.abs(e.c.u));
    return d / v;
  }
  gapBehind(e) {
    const k = this.order.indexOf(e); if (k < 0 || k >= this.order.length - 1) return null;
    const b = this.order[k + 1], d = e.progress - b.progress, v = Math.max(8, Math.abs(b.c.u));
    return d / v;
  }
  // Rally: how far ahead on the clock, comparing our time now to the rival's time at this same place.
  clockGap(e, rival) {
    if (e.ownStart === null || rival.ownStart === null) return null;
    const k = Math.floor(Math.max(0, e.progress) / 20);
    const theirs = rival.splits[k], mine = this.time - e.ownStart;
    if (theirs !== undefined) return mine - theirs; // positive: we are behind
    const k2 = Math.floor(Math.max(0, rival.progress) / 20), mineThere = e.splits[k2], theirNow = this.time - rival.ownStart;
    return mineThere !== undefined ? mineThere - theirNow : null;
  }
  record() {
    const v = this.recVals;
    for (const e of this.cars) {
      const c = e.c, inp = e.inp, br = inp ? inp.brake > 0.05 : e.pit?.phase === 'in';
      v[0] = c.x; v[1] = c.y; v[2] = c.z; v[3] = c.yaw; v[4] = this.bodyPitch(e); v[5] = this.bodyRoll(e); v[6] = c.delta; v[7] = c.rpm; v[8] = inp ? inp.throttle : 0.2; v[9] = c.gear;
      v[10] = (br ? F_BRAKE : 0) | (c.sliding ? F_SLIDE : 0) | (c.airborne ? F_AIR : 0) | (e.pit ? F_PIT : 0) | (c.locked ? F_LOCK : 0) | F_HEAD; v[11] = c.u;
      this.rec.add(e.i, v);
    }
    this.rec.push();
  }
  bodyPitch(e) { const c = e.c, tr = this.tr; return -c.ax * 0.004 - Math.atan(tr.slope[c.loc.i] * Math.sign(c.u || 1)) * (Math.cos(c.yaw - Math.atan2(tr.tx[c.loc.i], tr.tz[c.loc.i])) > 0 ? 1 : -1); }
  bodyRoll(e) { const c = e.c, tr = this.tr; return c.ay * 0.008 + tr.bank[c.loc.i]; }
  fingerprint() {
    let h = 2166136261 >>> 0;
    const mix = (v) => { h ^= v | 0; h = Math.imul(h, 16777619) >>> 0; };
    for (const e of this.cars) { mix(Math.round(e.c.x * 100)); mix(Math.round(e.c.z * 100)); mix(e.lap); mix(Math.round(e.c.wear[0] * 10000)); mix(Math.round(e.c.fuel * 10000)); }
    return h.toString(16);
  }
  // Dev mode's save state: the sim as JSON, without its references.
  saveState() {
    return JSON.stringify({ time: this.time, frame: this.frame, phase: this.phase, greenAt: this.greenAt, cars: this.cars.map((e) => { const { p, touching, ...c } = e.c; return { c, lap: e.lap, lastS: e.lastS, lapStart: e.lapStart, bestLap: e.bestLap, lastLap: e.lastLap, finished: e.finished, finishTime: e.finishTime, ownStart: e.ownStart, autoDrive: e.autoDrive, pit: e.pit, metres: e.metres }; }), done: this.done, leaderFinishedAt: this.leaderFinishedAt });
  }
  loadState(json) {
    const s = JSON.parse(json);
    this.time = s.time; this.frame = s.frame; this.phase = s.phase; this.greenAt = s.greenAt; this.done = s.done; this.leaderFinishedAt = s.leaderFinishedAt;
    s.cars.forEach((d, i) => { const e = this.cars[i]; Object.assign(e.c, d.c); e.lap = d.lap; e.lastS = d.lastS; e.lapStart = d.lapStart; e.bestLap = d.bestLap; e.lastLap = d.lastLap; e.finished = d.finished; e.finishTime = d.finishTime; e.ownStart = d.ownStart; e.autoDrive = d.autoDrive; e.pit = d.pit; e.metres = d.metres; e.progress = this.progressOf(e); });
    this.updateOrder();
  }
  teleport(i, s) { const e = this.cars[i], tr = this.tr, c = e.c, pt = trackPoint(tr, s, 0); c.x = pt.x; c.z = pt.z; c.y = pt.y; c.yaw = pt.yaw; c.loc.i = pt.i; c.loc.s = wrapS(tr, s); c.loc.t = 0; c.vx = 0; c.vz = 0; c.r = 0; c.delta = 0; c.vy = 0; e.lastS = c.loc.s; e.progress = this.progressOf(e); }
  // Dev: finish now in position n (1-based).
  finishNow(i, n = 1) {
    const e = this.cars[i], others = this.cars.filter((x) => x !== e), base = this.time;
    const mine = Math.max(30, base - (e.ownStart ?? 0));
    others.forEach((o, k) => { const ahead = k < n - 1; if (!o.finished) { o.finished = true; o.finishTime = mine + (ahead ? -8 + k : 2 + k); } });
    if (!e.finished) { e.finished = true; e.finishTime = mine; e.autoDrive = e.player !== null; }
    this.leaderFinishedAt = this.leaderFinishedAt ?? base;
    this.updateOrder(); this.checkFinish();
    this.emit('flag', e, { kind: 'finish', own: true });
  }
}
function wrapDelta(a, b, L) { let d = a - b; if (d > L / 2) d -= L; else if (d < -L / 2) d += L; return d; }
export function formatTime(t) {
  if (t === null || t === undefined || !Number.isFinite(t)) return '--:--.-';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
}
export { GhostTrace, G };
