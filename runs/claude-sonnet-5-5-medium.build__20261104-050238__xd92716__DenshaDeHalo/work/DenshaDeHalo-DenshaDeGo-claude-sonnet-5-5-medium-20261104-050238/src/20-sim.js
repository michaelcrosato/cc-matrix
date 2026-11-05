/* The simulation: stages, the train's physics, the lever, signals + ATS, stops, calls, Halo Time, score, the autopilot.
 * Everything here is plain numbers and runs headless in fixed steps (tests, calibration, attract mode all use it). */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, R = DH.route, clamp = E.clamp;
const LEN = R.length;

/* ---------- stages ---------- */
DH.STAGES = [
  { id: 'S0', n: 0, title: 'First Whistle', sub: 'Training Run', train: 'H5', from: 0, stops: [1, 2], tod: 6 * 3600 + 10 * 60, weather: 'clear', lead: false, tutorial: true,
    brief: 'Orientation shift. Two stations, no traffic, one very patient instructor. Learn the lever, the marker and the call.' },
  { id: 'S1', n: 1, title: 'Morning Commute', sub: 'Shift 1', train: 'H5', from: 2, stops: [3, 4, 5], tod: 7 * 3600 + 40 * 60, weather: 'clear', lead: true, leadCap: 66,
    brief: 'The 07:40 is full of people who are already late. A slower train runs ahead of you. Signals will tell you so.' },
  { id: 'S2', n: 2, title: 'Rain Check', sub: 'Shift 2', train: 'L3', from: 5, stops: [6, 7], tod: 11 * 3600 + 20 * 60, weather: 'rain', lead: false, rush: 7,
    brief: 'Rain on the rails. The Pocket L3 bites hard, but wet steel does not. A school trip is waiting at Neko Market.' },
  { id: 'S3', n: 3, title: 'Golden Hour', sub: 'Shift 3', train: 'X7', from: 8, stops: [9, 10, 11], tod: 17 * 3600 + 20 * 60, weather: 'clear', lead: true, leadCap: 70, obstruction: 3,
    brief: 'The Comet X7 is fast and heavy. A level crossing near Matsu Garden has had some trouble lately. Mind the horn board.' },
  { id: 'S4', n: 4, title: 'Fog Over the Ring', sub: 'Shift 4', train: 'H5', from: 11, stops: [0, 1, 2], tod: 21 * 3600 + 5 * 60, weather: 'fog', lead: true, leadCap: 70, slow: { s: 0, off: 520, len: 260, limit: 25 },
    brief: 'Night fog. A track crew works on the Akari stretch, so a slow order applies. Call it and obey it.' },
  { id: 'S5', n: 5, title: 'The Last Train', sub: 'Final Shift', train: 'X7', from: 8, stops: [9, 10, 11, 0], tod: 23 * 3600 + 5 * 60, weather: 'storm', lead: true, leadCap: 66, obstruction: 3, rush: 10, slow: { s: 9, off: 700, len: 220, limit: 30 },
    brief: 'The last service of the last day. Storm, signals, a slow order and one very important stop. Close the ring.' },
  { id: 'PR', n: 6, title: 'Parallel Run', sub: 'AI Hub', train: 'H5', from: 0, stops: [1, 2, 3], tod: 7 * 3600, weather: 'clear', lead: false, parallel: true,
    brief: 'Everyone drives the same line at the same time. Best stops and timetable win.' }
];
DH.stageById = id => DH.STAGES.find(s => s.id === id);

/* ---------- levers ---------- */
DH.notchName = (lever, T) => lever <= -9 ? 'EB' : lever < 0 ? 'B' + (-lever) : lever === 0 ? 'N' : 'P' + lever;

const CAL = new Map();
DH.calKey = (stage, diff, weather) => [stage.id, stage.from, stage.stops.join('-'), stage.train, diff, weather].join('|');   // calibrated leg times per stage + difficulty

class Run {
  constructor(stage, opts = {}) {
    this.stage = stage; this.T = DH.TRAINS[stage.train]; this.opts = opts;
    this.diff = opts.difficulty || 'Normal';
    this.tune = DH.TUNING;
    this.weather = opts.weather || stage.weather; this.tod = opts.tod !== undefined ? opts.tod : stage.tod;
    this.stops = stage.stops.slice(); this.startStation = stage.from;
    this.s0 = R.markerOf(stage.from); this.s = this.s0; this.v = 0; this.lever = -8; this.brakeEff = 0; this.acc = 0; this.accPrev = 0; this.jerkF = 0;
    this.t = 0; this.clock = this.tod; this.halo = this.tune.haloStart; this.haloMax = this.tune.haloStart; this.score = 0;
    this.phase = 'dwell'; this.dwellT = 0; this.dwellLeft = 7; this.doors = true; this.canDepart = false; this.station = stage.from; this.nextIdx = 0;
    this.events = []; this.log = []; this.results = []; this.finished = false; this.failed = null; this.comfort = 100; this.calls = 0; this.callsMissed = 0; this.horns = 0;
    this.atsMode = null; this.atsTimer = 0; this.atsRing = false; this.atsConfirmed = 0; this.atsPenalized = false; this.atsReason = '';
    this.hornHeld = 0; this.hornTime = 0; this.jolts = 0; this.stopRecord = []; this.trace = []; this.attempts = 0; this.short = false;
    this.target = null; this.callOpen = null; this.callDone = new Set(); this.callMiss = new Set(); this.hornDone = new Set();
    this.rushLeft = 0; this.obstructed = null; this.obsHorn = 0; this.obsWait = 0;
    this.sig = []; for (const sg of R.signals) this.sig.push({ sg, aspect: 'G', wasPassed: false });
    this.lead = stage.lead ? { s: this.s0 + 1500, v: 0, dwell: 10, idx: 0, phase: 'dwell', cap: stage.leadCap || 62, len: 120 } : null;
    this.slow = stage.slow ? { s0: R.markerOf(stage.slow.s) + stage.slow.off, s1: R.markerOf(stage.slow.s) + stage.slow.off + stage.slow.len, limit: stage.slow.limit } : null;
    if (this.slow) { this.slow.s0 = this.s0 + (R.wrap(this.slow.s0 - this.s0)); this.slow.s1 = this.slow.s0 + stage.slow.len; }
    this.obs = null;
    if (stage.obstruction !== undefined) { const c = R.crossings[stage.obstruction]; let cs = this.s0 + R.wrap(c.s - this.s0); this.obs = { s: cs, active: true, id: c.id, driven: 0 }; }
    this.leg = null; this.buildTimetable(); this.beginLeg();
    if (this.lead) { this.lead.s = this.timetable[0].s; this.lead.idx = 1; this.lead.dwell = 16; }
    this.oncoming = [];   // decorative: trains on the other track
    this.rng = DH.rngFor('run:' + stage.id);
    for (let i = 0; i < 3; i++) this.oncoming.push({ s: this.s0 + 800 + this.rng() * 5000, v: 18 + this.rng() * 8, len: 120 });
    this.jolt = 0; this.ghosts = [];
    this.nextEventSlow = false;
  }
  /* ---- the timetable: legs calibrated by the autopilot, so it is always attainable ---- */
  buildTimetable() {
    const key = DH.calKey(this.stage, this.diff, this.weather), par = this.opts.par || CAL.get(key) || DH.calibrate(this.stage, this.diff, this.weather);
    this.timetable = []; let t = 7;
    for (let k = 0; k < this.stops.length; k++) {
      const arr = t + par[k], dep = arr + this.tune.dwell; this.timetable.push({ station: this.stops[k], arr, dep, dist: 0 }); t = dep;
    }
    // marker positions along the unwrapped path
    let pos = this.s0;
    for (let k = 0; k < this.stops.length; k++) { const m = R.markerOf(this.stops[k]); pos += R.wrap(m - pos); if (pos - this.s0 < 100 && k === 0 && R.wrap(m - this.s0) === 0) pos += LEN; this.timetable[k].s = pos; }
    this.firstDep = 7; this.depSched = 7;
  }
  beginLeg() { this.leg = this.timetable[this.nextIdx] || null; this.target = this.leg; this.stopJudged = false; this.attempts = 0; this.short = false; }
  push(kind, data = {}) { this.events.push(Object.assign({ kind, t: this.t }, data)); }
  pen(n, why) {
    if (this.tune.infiniteHalo) return; const d = n * this.tune.penaltyScale; this.halo -= d; this.push('penalty', { amount: d, why });
    if (this.halo <= 0) { this.halo = 0; this.fail('HALO TIME UP'); }
  }
  gain(n) { this.halo = Math.min(this.haloMax, this.halo + n); }
  fail(why) { if (this.failed || this.finished) return; this.failed = why; this.push('fail', { why }); }
  /* ---- lever commands ---- */
  notchUp() { if (this.atsMode || this.failed) return; if (this.lever === -9) { if (this.v < .3) this.lever = -8; return; } if (this.lever >= this.T.pn) return; if (this.lever >= 0 && !this.canDepart) { this.push('doors'); return; } this.lever++; this.push('notch'); }
  notchDown() { if (this.atsMode || this.failed) return; if (this.lever <= -8) return; this.lever--; this.push('notch'); }
  neutral() { if (this.atsMode || this.failed) return; if (this.lever === -9 && this.v >= .3) return; this.lever = 0; this.push('notch'); }
  eb() { if (this.failed) return; if (this.lever !== -9) { this.lever = -9; this.atsMode = null; this.push('eb'); if (this.v > 1) this.pen(5, 'EMERGENCY BRAKE'); } }
  /* ---- queries ---- */
  limitNow() {
    let l = Math.min(R.at.limit(this.s), this.T.maxKmh);
    if (this.slow && this.s > this.slow.s0 - 10 && this.s < this.slow.s1 + 10) l = Math.min(l, this.slow.limit);
    return l;
  }
  // upcoming signals: { sig, dist, aspect }
  nextSignals(n = 3) {
    const out = [];
    for (const e of this.sig) {
      const base = this.s0 + R.wrap(e.sg.s - this.s0);
      for (const sp of [base, base + LEN]) { if (sp >= this.s - 5 && sp < this.s + 1800 && sp < this.timetable[this.timetable.length - 1].s + 40) out.push({ e, sg: e.sg, pos: sp, dist: sp - this.s, aspect: e.aspect }); }
    }
    out.sort((a, b) => a.dist - b.dist); return out.slice(0, n);
  }
  nextHornBoard() {
    for (const h of R.horns) { const p = this.s0 + R.wrap(h.s - this.s0); for (const sp of [p, p + LEN]) { if (sp + 250 > this.s && sp < this.s + 400 && !this.hornDone.has(h.id + ':' + Math.round(sp))) return { h, pos: sp, at: sp + 250, dist: sp - this.s }; } }
    return null;
  }
  distToMark() { return this.leg ? this.leg.s - this.s : 1e9; }
  decelAt(notch) { return notch >= 9 ? this.T.eb : this.T.brake * notch / 8; }
  /* ---- the step ---- */
  step(dt, inp = {}) {
    if (this.finished || this.failed) { this.v = Math.max(0, this.v - 2 * dt); this.s += this.v * dt; return; }
    const T = this.T, tune = this.tune;
    this.t += dt; this.clock = this.tod + this.t;
    if (inp.horn) { this.hornHeld += dt; this.hornTime += dt; } else this.hornHeld = 0;
    if (inp.ats) this.atsConfirmed = 5;
    this.atsConfirmed = Math.max(0, this.atsConfirmed - dt);
    this.updateLead(dt); this.updateSignals(); this.updateOncoming(dt);
    // doors and dwell
    if (this.phase === 'dwell') {
      this.dwellT += dt; this.v = 0; this.brakeEff = Math.max(this.brakeEff, T.brake * .5);
      if (this.rushLeft > 0) this.rushLeft -= dt;
      const ready = (this.cal ? this.dwellT >= 6 : this.t >= this.depSched) && this.dwellT >= 6 && this.rushLeft <= 0;
      if (this.doors && ready) { this.doors = false; this.push('doorsClosed'); }
      this.canDepart = !this.doors && ready;
      if (this.canDepart && !this._departed) { this._departed = true; this.push('departReady'); }
      this.lever = Math.min(this.lever, this.canDepart ? this.T.pn : 0);
      if (this.canDepart && this.lever > 0 && !this.finalStop) { this.phase = 'run'; this.legStartT = this.t; this.push('depart'); }
      this.stepBrake(dt, this.lever < 0 ? this.decelAt(-this.lever) : 0);
      this.checkFinish();
      return;
    }
    // running
    let lever = this.lever;
    // ATS
    this.atsLogic(dt);
    if (this.atsMode) lever = this.atsMode === 'eb' ? -9 : -8;
    const P = lever > 0 ? lever / T.pn : 0, kmh = this.v * 3.6;
    let aPow = P * T.accel * tune.accelScale * (1 - .5 * Math.min(1, kmh / (T.maxKmh + 10))) / 3.6;
    if (kmh > T.maxKmh) aPow = 0;
    const grip = (this.weather === 'rain' || this.weather === 'storm') ? tune.wetGrip : this.weather === 'fog' ? .96 : 1;
    const bDemand = lever < 0 ? this.decelAt(-lever) : 0;
    this.stepBrake(dt, bDemand, lever === -9);
    const aBrake = this.brakeEff * tune.brakeScale * grip / 3.6 / T.mass * (T.mass > 1 ? 1.25 : 1) * (T.mass > 1 ? 1 : 1);
    const aGrade = -9.81 * R.at.grade(this.s - 40) * tune.gradeEffect / T.mass * (T.mass > 1 ? 1 : 1);
    const aRes = -(.015 + .00011 * this.v * this.v) ;
    const vOld = this.v; let a = aPow - (this.v > 0.02 ? aBrake : 0) + aGrade + aRes;
    this.v = Math.max(0, this.v + a * dt);
    if (this.v < .03 && a <= 0 && vOld < .06) this.v = 0;
    if (this.v === 0 && vOld > 0) this.stopDecel = aBrake * 3.6;
    this.s += (this.v + vOld) * .5 * dt; this.acc = (this.v - vOld) / dt;
    this.jerkF += ((this.acc - this.accPrev) / dt - this.jerkF) * Math.min(1, dt * 6); this.accPrev = this.acc;
    // comfort: harsh braking or power chops
    const jerk = Math.abs(this.jerkF);
    if (jerk > 3.5 && this.v > 1) { this.comfort = Math.max(0, this.comfort - (jerk - 3.5) * dt * 2.2); }
    this.comfort = Math.min(100, this.comfort + dt * .35);
    this.trace.push([this.t, this.s, this.v]); if (this.trace.length > 2400) this.trace.splice(0, 600);
    this.updateEvents(dt);
    this.updateCalls();
    this.updateStop(dt);
    this.checkLeadCollision();
  }
  stepBrake(dt, demand, eb) {
    const tau = Math.max(.05, (eb ? .25 : this.T.lag * this.tune.brakeLag) * (demand > this.brakeEff ? 1 : .5));
    this.brakeEff += (demand - this.brakeEff) * (1 - Math.exp(-dt / tau));
    if (Math.abs(demand - this.brakeEff) < .005) this.brakeEff = demand;
  }
  /* ---- ATS: overspeed, red/yellow signals, the station guard ---- */
  atsLogic(dt) {
    if (this.tune.noATS) { this.atsRing = false; this.atsMode = null; return; }
    const kmh = this.v * 3.6, tol = this.tune.limitTol; let over = false, reason = '', hard = false;
    const lim = this.limitNow();
    if (kmh > lim + tol) { over = true; reason = 'OVERSPEED ' + lim; }
    // the braking pattern to the next restriction (red 0, yellow 45)
    const aPat = this.T.brake * .75 / 3.6 * (this.T.mass > 1 ? .9 : 1);
    for (const n of this.nextSignals(2)) {
      const vt = n.aspect === 'R' ? 0 : n.aspect === 'Y' ? 45 / 3.6 : 999;
      if (vt < 100) {
        const d = n.dist - (n.aspect === 'R' ? 22 : 0), vmax = Math.sqrt(vt * vt + 2 * aPat * Math.max(0, d)) * 3.6;
        if (kmh > vmax + tol + 2) { over = true; reason = n.aspect === 'R' ? 'RED SIGNAL' : 'CAUTION'; }
        if (n.aspect === 'R' && kmh > 5 && kmh > Math.sqrt(2 * this.T.brake * .95 / 3.6 * Math.max(1, n.dist - 16)) * 3.6) { hard = true; reason = 'RED SIGNAL'; }
      }
    }
    // the station guard: only when a stop is no longer possible with the service brake
    if (this.leg) { const d = this.distToMark(); if (d > -6 && d < 700 && this.v > 3) { const vmax = Math.sqrt(2 * this.T.brake * 1.1 / 3.6 * Math.max(0, d + 8)) * 3.6; if (kmh > vmax + 2) { hard = true; reason = 'STATION GUARD'; } } }
    if (this.atsMode) {
      if (kmh < 1 || (this.atsMode === 'b8' && !over && kmh <= lim - 1)) { this.atsMode = null; this.atsRing = false; this.lever = Math.min(this.lever, -1); if (this.v < .3) this.lever = -8; this.push('atsRelease'); }
      return;
    }
    if (hard) { this.atsMode = 'eb'; this.atsReason = reason; this.atsRing = false; this.push('ats', { reason, hard: true }); this.pen(6, 'ATS: ' + reason); this.lever = -9; this.atsMode = 'eb'; return; }
    if (over) {
      if (!this.atsRing) { this.atsRing = true; this.atsTimer = 4.5; this.atsReason = reason; this.push('atsWarn', { reason }); }
      if (this.atsConfirmed > 0 && this.atsTimer > 1.5) this.atsTimer = Math.max(this.atsTimer, 3);   // a confirm buys a little time, not a pass
      this.atsTimer -= dt;
      if (this.atsTimer <= 0) { this.atsMode = 'b8'; this.atsRing = false; this.push('ats', { reason, hard: false }); this.pen(8, 'ATS: ' + reason); this.lever = -8; }
    } else if (this.atsRing) { this.atsRing = false; this.push('atsClear'); }
  }
  /* ---- the lead train and signals ---- */
  updateLead(dt) {
    const L = this.lead; if (!L) return;
    const idx = L.idx, tt = this.timetable;
    if (idx >= tt.length) { if (L.phase === 'dwell') { L.dwell -= dt; if (L.dwell > 0) return; L.phase = 'run'; } L.v = Math.min(L.cap / 3.6, L.v + .8 * dt); L.s += L.v * dt; return; }
    const mark = tt[idx].s;
    if (L.phase === 'dwell') { L.dwell -= dt; L.v = 0; if (L.dwell <= 0) L.phase = 'run'; return; }
    const d = mark - L.s, lim = Math.min(L.cap, R.at.limit(L.s)) / 3.6, vmax = Math.sqrt(2 * 1.0 * Math.max(0, d - 1)), vt = Math.min(lim, vmax);
    L.v += clamp(vt - L.v, -1.4 * dt, .85 * dt); if (L.v < .05 && d < 2) { L.v = 0; L.phase = 'dwell'; L.dwell = 22; L.idx++; L.s = mark; return; }
    L.s += L.v * dt;
  }
  updateSignals() {
    const L = this.lead; if (!L) { for (const e of this.sig) e.aspect = 'G'; return; }
    const rear = L.s - L.len;
    for (const e of this.sig) {
      const base = this.s0 + R.wrap(e.sg.s - this.s0); let asp = 'G';
      for (const sp of [base, base + LEN]) { const dl = rear - sp; if (dl > 0 && dl < 620) asp = 'R'; else if (dl >= 620 && dl < 1300 && asp === 'G') asp = 'Y'; }
      if (this.v < .1 && e.aspect === 'R' && asp === 'G') this.push('clear');
      e.aspect = asp;
    }
  }
  updateOncoming(dt) { for (const o of this.oncoming) { o.s -= o.v * dt; if (o.s < this.s - 700) { o.s = this.s + 2500 + this.rng() * 3000; o.v = 18 + this.rng() * 8; } } }
  checkLeadCollision() {
    const L = this.lead; if (!L) return;
    if (this.s > L.s - L.len - 12 && L.v < this.v) { this.s = L.s - L.len - 12; this.fail('COLLISION WITH THE TRAIN AHEAD'); }
    // passing a red signal
    for (const n of this.nextSignals(1)) if (n.dist < 1 && n.aspect === 'R' && !n.e.wasPassed) { n.e.wasPassed = true; this.fail('SIGNAL PASSED AT DANGER'); }
  }
  /* ---- stage events: the crossing, the slow order, the door rush ---- */
  updateEvents(dt) {
    const o = this.obs;
    if (o && o.active) {
      const d = o.s - this.s;
      if (d > 0 && d < 520 && this.hornHeld > 0) { this.obsHorn += dt; if (this.obsHorn > 1.1) { o.active = false; this.push('obsClear', { how: 'horn' }); this.gain(3); this.score += 300; } }
      if (d > 0 && d < 300 && this.v < .2) { this.obsWait += dt; if (this.obsWait > 9) { o.active = false; this.push('obsClear', { how: 'wait' }); } }
      if (d < 6 && d > -2 && o.active) { this.fail('COLLISION AT THE CROSSING'); }
      if (d < -5) o.active = false;
      if (d < 700 && d > 640 && !o.warned) { o.warned = true; this.push('radio', { who: 'Control', text: 'Driver, vehicle reported stopped on the crossing ahead. Use the horn.' }); }
    }
    this.obstructed = o && o.active ? o : null;
    if (this.slow && !this.slow.said && this.s > this.slow.s0 - 500) { this.slow.said = true; this.push('radio', { who: 'Control', text: 'Slow order ahead, ' + this.slow.limit + ' km/h. Track crew on the line.' }); }
  }
  /* ---- point and call ---- */
  callTargets() {
    const out = [];
    for (const n of this.nextSignals(2)) out.push({ id: 'sg' + n.sg.id + ':' + Math.round(n.pos), kind: 'signal', dist: n.dist, win: 120, text: n.aspect === 'G' ? 'SIGNAL, GREEN!' : n.aspect === 'Y' ? 'SIGNAL, CAUTION!' : 'SIGNAL, STOP!', pos: n.pos, aspect: n.aspect });
    if (this.leg && this.phase === 'run') out.push({ id: 'mk' + this.nextIdx, kind: 'marker', dist: this.distToMark(), win: 190, text: 'STOP MARKER, OK!', pos: this.leg.s });
    if (this.slow && this.s < this.slow.s0) out.push({ id: 'sl', kind: 'slow', dist: this.slow.s0 - this.s, win: 140, text: 'SLOW ORDER ' + this.slow.limit + ', OK!', pos: this.slow.s0 });
    return out.filter(t => t.dist < t.win * this.tune.callWindow && !this.callDone.has(t.id) && !this.callMiss.has(t.id));
  }
  updateCalls() {
    const open = this.callTargets();
    this.callOpen = open.length ? open.reduce((a, b) => a.dist < b.dist ? a : b) : null;
    // misses: a target that has slipped inside the minimum distance without a call
    const seen = [];
    for (const n of this.nextSignals(1)) if (n.dist < 6) seen.push('sg' + n.sg.id + ':' + Math.round(n.pos));
    for (const id of seen) if (!this.callDone.has(id) && !this.callMiss.has(id)) this.missCall(id, 2);
    if (this.leg && this.phase === 'run' && this.distToMark() < 6 && !this.callDone.has('mk' + this.nextIdx) && !this.callMiss.has('mk' + this.nextIdx)) this.missCall('mk' + this.nextIdx, 3);
    if (this.slow && this.s > this.slow.s0 - 4 && !this.callDone.has('sl') && !this.callMiss.has('sl')) this.missCall('sl', 2);
  }
  missCall(id, p) { this.callMiss.add(id); this.callsMissed++; if (this.diff !== 'Easy') this.pen(p, 'MISSED CALL'); this.push('callMiss'); }
  call() {
    const t = this.callOpen; if (!t || this.failed || this.finished) return null;
    this.callDone.add(t.id); this.calls++; this.score += 100; this.gain(.6); this.push('call', { text: t.text, what: t.kind }); this.callOpen = null; return t;
  }
  /* ---- stopping ---- */
  windows() { const w = this.tune.stopWindow * (this.diff === 'Easy' ? 1.5 : this.diff === 'Hard' ? .7 : 1); return { perfect: .35 * w, great: 1 * w, good: 2 * w, ok: 4 * w }; }
  updateStop(dt) {
    if (!this.leg || this.phase !== 'run') return;
    const d = this.distToMark();
    if (this.v < .01 && !this.stopJudged && this.t > 1 && d < 80) this.judge(d);
    // a horn board
    const hb = this.nextHornBoard(); if (hb && hb.dist < 0 && this.hornHeld > .5) { this.hornDone.add(hb.h.id + ':' + Math.round(hb.pos)); this.horns++; this.score += 50; this.gain(1); this.push('hornOk'); }
    if (hb && hb.at - this.s < 8 && !this.hornDone.has(hb.h.id + ':' + Math.round(hb.pos))) this.hornDone.add(hb.h.id + ':' + Math.round(hb.pos));
  }
  judge(d) {
    const e = -d, W = this.windows(), ab = Math.abs(e); // e > 0: overrun (front past the marker)
    this.stopJudged = true; const leg = this.leg, late = this.t - leg.arr;
    if (e < -W.ok - .01 && this.attempts < 2) { this.attempts++; this.short = true; this.stopJudged = false; this.pen(2, 'SHORT OF THE MARK'); this.push('short', { e }); this.stopCrawl = true; return; }
    let grade, pts, gain = 0;
    if (ab <= W.perfect) { grade = 'PERFECT'; pts = 1000; gain = 5; } else if (ab <= W.great) { grade = 'GREAT'; pts = 700; gain = 3; } else if (ab <= W.good) { grade = 'GOOD'; pts = 400; gain = 1; }
    else if (ab <= W.ok) { grade = 'OK'; pts = 200; } else if (e > 0) { grade = 'OVERRUN'; pts = 0; this.pen(10, 'OVERRUN'); } else { grade = 'SHORT'; pts = 0; }
    const stopDecel = this.stopDecel || 0, smooth = stopDecel < 1.1 ? 'SMOOTH' : stopDecel < 2.4 ? 'FIRM' : 'JOLT';
    if (smooth === 'JOLT') { this.comfort = Math.max(0, this.comfort - 12); this.jolts++; } else if (smooth === 'SMOOTH') this.gain(1);
    const timeGrade = Math.abs(late) <= 2 ? 'ON TIME' : late < 0 ? 'EARLY' : 'LATE';
    let tpts = 0;
    if (timeGrade === 'ON TIME') { tpts = 500 - Math.round(Math.abs(late) * 50); this.gain(3); } else if (timeGrade === 'LATE') { this.pen(Math.min(15, (late - 2) * .6), 'LATE'); tpts = 0; } else tpts = 250;
    const cpts = Math.round(this.comfort * 3 + (smooth === 'SMOOTH' ? 150 : smooth === 'FIRM' ? 60 : 0));
    this.gain(gain);
    const rec = { station: leg.station, name: R.stations[leg.station].name, e, grade, pts, timeGrade, late, tpts, cpts, smooth, comfort: Math.round(this.comfort), stopDecel, trace: this.traceBefore(), t: this.t };
    this.score += pts + tpts + cpts; this.results.push(rec); this.log.push(rec);
    if (grade === 'OVERRUN' || (grade === 'SHORT')) { this.s = leg.s + (grade === 'OVERRUN' ? 2.5 : -2.5); rec.reset = true; }
    this.push('judge', rec);
    this.phase = 'dwell'; this.dwellT = 0; this.doors = true; this.canDepart = false; this._departed = false; this.lever = -8; this.v = 0; this.stopCrawl = false; this.stopDecel = 0; this.depSched = leg.dep; rec.runTime = this.t - (this.legStartT || 0) - 0;
    this.nextIdx++; this.stopsDone = this.nextIdx;
    this.rushLeft = (this.stage.rush === leg.station) ? 7 : 0; if (this.rushLeft) this.push('rush');
    const crowd = R.stations[leg.station].crowd; if (crowd) this.push('board', { n: crowd.length });
    if (this.nextIdx >= this.stops.length) { this.beginLeg(); this.leg = null; this.finalStop = true; } else this.beginLeg();
    this.comfort = Math.min(100, this.comfort + 25);
  }
  traceBefore() { const n = this.trace.length, from = Math.max(0, n - 700); return this.trace.slice(from).filter((_, i) => i % 6 === 0).map(q => [q[0], q[1], q[2]]); }
  checkFinish() {
    if (this.finalStop && this.phase === 'dwell' && this.dwellT > 5.5 && !this.finished) { this.finished = true; this.push('finish'); }
  }
  /* summary for the results screen */
  summary() {
    const pts = this.results.length * (1000 + 500 + 450 + 150), got = this.score - this.calls * 100 - this.horns * 50;
    let pct = pts ? clamp(this.score / (pts + this.results.length * 150), 0, 1) : 0;
    pct = pct * (this.halo / this.haloMax * .25 + .75);
    const rank = this.failed ? 'F' : pct > .9 ? 'S' : pct > .78 ? 'A' : pct > .62 ? 'B' : 'C';
    return { rank, pct, score: Math.round(this.score), halo: Math.round(this.halo), comfort: Math.round(this.comfort), perfect: this.results.filter(r => r.grade === 'PERFECT').length, stops: this.results.length, calls: this.calls, callsMissed: this.callsMissed, results: this.results };
  }
}
DH.Run = Run;

/* ---------- the autopilot: a braking-curve driver. Used by attract mode, calibration, the hub's demo and tests ---------- */
DH.autopilot = (run, o = {}) => {
  const T = run.T, v = run.v, kmh = v * 3.6, cheat = o.cheat, cruiseFrac = o.cruise || 1;
  if (run.failed || run.finished) return;
  if (run.callOpen && run.callOpen.dist < run.callOpen.win * .7) run.call();
  run.autoHorn = !!(run.obs && run.obs.active && run.obs.s - run.s < 480 && run.obs.s - run.s > 0) || !!(run.nextHornBoard() && run.nextHornBoard().dist < 0);
  if (run.atsMode) return;
  if (run.phase === 'dwell') { if (run.canDepart) { run.lever = Math.max(run.lever, 0); run.notchUp(); } else run.lever = -8; return; }
  let vd = (run.limitNow() - 4) / 3.6 * cruiseFrac;
  const aPlan = T.brake * (run.weather === 'rain' || run.weather === 'storm' ? .42 : .65) / 3.6 * run.tune.brakeScale / (T.mass > 1 ? 1.1 : 1);
  const lookAhead = (dist, vt) => Math.sqrt(vt * vt + 2 * aPlan * Math.max(0, dist));
  // limits ahead
  for (let d = 20; d < 900; d += 40) { const l = Math.min(R.at.limit(run.s + d), T.maxKmh) - 4; vd = Math.min(vd, lookAhead(d, Math.max(5, l) / 3.6)); if (run.slow && run.s + d > run.slow.s0 && run.s + d < run.slow.s1) vd = Math.min(vd, lookAhead(d, (run.slow.limit - 4) / 3.6)); }
  if (run.slow && run.s > run.slow.s0 && run.s < run.slow.s1) vd = Math.min(vd, (run.slow.limit - 3) / 3.6);
  for (const n of run.nextSignals(3)) { if (n.aspect === 'R') vd = Math.min(vd, lookAhead(n.dist - 40, 0)); else if (n.aspect === 'Y') vd = Math.min(vd, lookAhead(n.dist, 42 / 3.6)); }
  if (run.obs && run.obs.active) { const d = run.obs.s - run.s; if (d > 0) { vd = Math.min(vd, lookAhead(d - 60, 0)); } }
  const lead = run.lead; if (lead) { const gap = lead.s - lead.len - run.s; vd = Math.min(vd, Math.max(lead.v * .9, lookAhead(gap - 150, lead.v))); }
  let aReq = 0, d = 1e9;
  if (run.leg) { d = run.distToMark(); const vstop = Math.sqrt(2 * aPlan * Math.max(0, d - .3)); if (d < 900) vd = Math.min(vd, vstop);
    aReq = d > .5 ? v * v / (2 * Math.max(.4, d - .3)) : 9; }
  const err = v - vd;
  const bunit = T.brake / 8 / 3.6 * run.tune.brakeScale * (run.weather === 'rain' || run.weather === 'storm' ? run.tune.wetGrip : 1);
  let want = 0;
  if (err > .8) want = -clamp(Math.ceil(err / 1.6), 1, 8); else if (err < -1.5) want = clamp(Math.ceil(-err / 2.2), 1, T.pn);
  if (run.leg && d < 500 && d > 0 && v > .9) { const n = Math.ceil(aReq / bunit - .25); let sw = -clamp(n, 0, 8); if (v * 3.6 < 6 && sw < -3) sw = -3; want = Math.min(want, sw); }
  if (run.leg && d <= .3 && v > .2 && run.phase === 'run') want = -8;
  if (run.leg && v <= .9 && (d < 40 || run.short) && run.t - (run.legStartT || 0) > 3) { want = d > 1.6 ? (v < .6 ? 1 : 0) : -3; if (d < -1) want = -5; }
  { const rs = run.nextSignals(1)[0]; if (rs && rs.aspect === 'R' && rs.dist < 90 && v < 3) want = -4; }
  if (want >= 1 && !run.canDepart) want = 0;
  if (want > run.lever) run.notchUp(); else if (want < run.lever) { if (run.lever === -9) return; run.notchDown(); }
};

/* ---------- calibration: the autopilot drives every leg alone; the timetable is that plus a margin ---------- */
DH.calibrate = (stage, diff, weather) => {
  const key = DH.calKey(stage, diff, weather); if (CAL.has(key)) return CAL.get(key);
  const st2 = Object.assign({}, stage, { lead: false, rush: undefined, obstruction: undefined });
  const run = new Run(st2, { difficulty: diff, weather, par: stage.stops.map(() => 9999) }); run.cal = true;
  const dt = 1 / 30;
  for (let i = 0; i < 30 * 1500 && !run.finished && !run.failed; i++) { DH.autopilot(run, { cheat: true }); run.step(dt, {}); if (run.cal && run.phase === 'dwell') run.depSched = 0; }
  const mult = diff === 'Easy' ? 1.28 : diff === 'Hard' ? 1.0 : 1.1;
  const out = stage.stops.map((_, k) => Math.round(((run.results[k] && run.results[k].runTime) || 90) * mult + 3));
  CAL.set(key, out); return out;
};
})();
