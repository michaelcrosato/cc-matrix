/* Densha de Halo! · 31-sim: the world of a stage, stepped at 1/120 s. Pure: no drawing, no sound, no engine.
 * It owns the train (30-train), the signals and blocks, the other trains, the speed limits, ATS, the stops and the dwell
 * and departure sequence, the timetable and the clock, Halo Time, the score and comfort, the calls and the horn, the
 * crossings and the events. Scenes read it through snapshot() and steer it through cmd(). Rules: sections 4.4 to 4.11.
 * Each step runs in the order of section 3.4. Everything that happens is announced on bus ('sound', 'judgment', ...). */
(() => {
'use strict';
const DH = window.DH;

const DIFF = {
  easy: { name: 'Easy', grace: 40 / 25, win: 1.5, pen: 0.5 },
  normal: { name: 'Normal', grace: 1, win: 1.0, pen: 1.0 },
  expert: { name: 'Expert', grace: 15 / 25, win: 0.7, pen: 1.5 }
};
DH.DIFF = DIFF;
const ASPECT_SPEED = { G: null, YG: 65, Y: 45, YY: 25, R: 0 };   // G means the line speed
DH.ASPECT_SPEED = ASPECT_SPEED;
const LAMPS = { R: [0, 0, 1, 0], Y: [1, 0, 0, 0], YG: [1, 1, 0, 0], G: [0, 1, 0, 0], YY: [1, 0, 0, 1] };
DH.LAMPS = LAMPS;

/* another train: its own speed and legs (no lag model; it never affects the player's train, only the blocks it occupies).
 * A leg: { v (km/h target), acc (km/h/s), until (route s, stop passing it), stopAt (route s, stop there), dwell (s), lane,
 * wait (s before it starts), at (the clock to start at) } */
class TrainActor {
  constructor(o) {
    this.id = o.id; this.kind = o.kind || 'other'; this.spec = DH.TRAINS[o.train || 'freight'];
    this.lane = o.lane || 'B'; this.dir = o.dir || 1; this.s = o.s; this.v = o.v || 0;
    this.cars = o.cars || (this.spec ? this.spec.cars : 4); this.carLen = 20;
    this.legs = (o.legs || []).map(l => Object.assign({}, l)); this.leg = 0; this.wait = 0;
    this.clockAt = o.clockAt === undefined ? null : o.clockAt; this.done = false;
    this.light = o.light || 'tail';
  }
  get length() { return this.cars * this.carLen; }
  get rear() { return this.s - this.dir * this.length; }
  span() { return this.dir > 0 ? [this.rear, this.s] : [this.s, this.rear]; }
  step(dt, world) {
    if (this.done) return;
    if (this.clockAt !== null && world.clock() < this.clockAt) return;
    const L = this.legs[this.leg];
    if (!L) { this.v = Math.max(0, this.v - 6 * dt); this.s += this.dir * this.v / 3.6 * dt; const R = world.route; if (this.v === 0 && (this.s < R.from - 200 || this.s > R.to + 200)) this.done = true; return; }   // a parked train stays on the line
    if (L.lane) this.lane = L.lane;
    if (this.wait > 0) { this.wait -= dt; this.v = 0; if (this.wait <= 0) this.leg++; return; }
    const acc = L.acc || 4;
    let want = L.v === undefined ? this.v : L.v;
    if (L.stopAt !== undefined) {
      const rem = (L.stopAt - this.s) * this.dir;
      if (rem <= 0.05) { this.s = L.stopAt; this.v = 0; this.wait = L.dwell || 0; this.leg++; return; }
      want = Math.min(want, Math.sqrt(2 * 0.6 * rem) * 3.6);   // brake to stop on the mark (0.6 m/s^2)
    }
    this.v += DH.clamp(want - this.v, -acc * dt, acc * dt);
    this.s += this.dir * this.v / 3.6 * dt;
    if (L.until !== undefined && (this.s - L.until) * this.dir >= 0) this.leg++;
  }
}
DH.TrainActor = TrainActor;

class Sim {
  constructor(stage, route, opts = {}) {
    this.stage = stage; this.route = route; this.opts = opts;
    this.difficulty = opts.difficulty || 'normal'; this.D = DIFF[this.difficulty] || DIFF.normal;
    this.t = 0; this.clockOffset = DH.parseClock(stage.startClock || '06:40:00');
    this.bus = new DH.Bus();
    this.spec = DH.TRAINS[stage.train || 'h8000'];
    this.cars = stage.cars || 6;
    this.train = new DH.Train(this.spec, { s: stage.startS || 0 });
    this.train.cars = this.cars;
    this.weather = stage.weather || 'clear'; this.dryRail = this.weather !== 'rain';
    this.fogDist = 900;
    this.hour = stage.hour === undefined ? 12 : stage.hour;
    // scoring and state
    this.haloStart = Math.round(DH.TUNING.graceStart * this.D.grace); this.halo = this.haloStart; this.haloMax = 99;
    this.score = 0; this.comfort = 100; this.comfortCalm = 0; this.gameOver = false; this.finished = false;
    this.stats = { stops: 0, perfect: 0, great: 0, good: 0, ok: 0, onTime: 0, late: 0, early: 0, smooth: 0, short: 0, overruns: 0, over: 0,
      calls: 0, callsGreat: 0, horn: 0, hornMiss: 0, slips: 0, ats: 0, spad: 0, limit: 0, ebs: 0, km: 0, hazard: 0, missed: 0, wrong: 0, rollback: 0 };
    this.judgments = []; this.toasts = []; this.subtitles = []; this.log = [];
    this.events = new Set(); this.fired = [];
    this.sighted = new Set(); this.atsLatched = new Set(); this.spadLatched = new Set(); this.signalPassed = new Set();
    this.limitBroken = false; this.limitPeak = 0; this.slowOrder = null; this.aspectCap = null;
    this.atsRinging = false; this.atsTimer = 0; this.atsOn = false; this.speedAlarm = false;
    this.horn = { held: false, tHeld: 0, sounded: new Set(), missed: new Set() };
    this.dwell = null; this.backup = null; this.obstruction = null; this.crossingGates = {};
    this.lastDecel = 0; this.lastEbS = -1e9; this.prevS = this.train.s; this.readySignals = new Set();
    this.firstPowerDone = false; this.callOpen = null; this.departedFlag = false;
    this.checkpoint = null; this.stopLabels = {}; this.lastStopErr = 0; this.stopLog = [];
    this.setup();
  }

  // ---- the stage's set-up: stops, signals, calls, the others ----
  setup() {
    const st = this.stage, R = this.route;
    const lastStop = (st.stops || []).reduce((m, x) => { const a = x.target !== undefined ? x.target : R.stopOf(x.id, this.cars); return a === undefined ? m : Math.max(m, a); }, 0);
    this.stageSpan = st.span || [st.startS || R.from, Math.max(lastStop, st.startS || 0) + 60];
    this.stops = (st.stops || []).map(x => {
      const station = R.stationById(x.id);
      const target = x.target !== undefined ? x.target : R.stopOf(x.id, this.cars);
      const tgt = target !== undefined ? target : (station && station.stops ? Object.values(station.stops)[0] : this.train.s);
      return Object.assign({}, x, { st: station, target: tgt, arrival: x.arr ? DH.parseClock(x.arr) : null, departure: x.dep ? DH.parseClock(x.dep) : null,
        judged: false, done: false, restops: 0, shortT: null, startSig: station ? R.signals.find(g => g.kind === 'start' && g.s >= station.end - 5 && g.s <= station.end + 420) || null : null });
    });
    this.passes = (st.passes || []).map(p => { const station = R.stationById(p.id); return { id: p.id, at: station ? station.start : p.at, arr: p.at, passed: false }; });
    this.signals = R.signals.slice().sort((a, b) => a.s - b.s);
    for (const g of this.signals) g.aspect = 'R';
    this.others = (st.trains || []).map(o => new TrainActor(o));
    this.limits = R.limits.slice();
    if (this.stage.lineSpeed) this.limits = this.limits.slice();
    this.buildCalls();
    this.stopIdx = 0;
    if (st.startStopped) {   // the stage opens with the train standing at its first stop, doors open
      const first = this.stops[0];
      this.train.s = first.target; this.train.v = 0; this.stopIdx = 1; first.judged = true; first.done = true;
      this.beginDwell(first, this.clockOffset, true);
    }
    this.prevS = this.train.s;
    this.recordCheckpoint('start');
  }
  buildCalls() {
    const R = this.route, calls = this.calls = [];
    const add = (o) => calls.push(Object.assign({ called: false }, o));
    for (const g of this.signals) if (g.kind === 'start' || g.kind === 'home') add({ s: g.s, id: g.id, kind: 'signal', sig: g.id });
    for (const L of this.limits) add({ s: L.s, id: 'lim' + L.s, kind: 'limit', v: L.v });
    for (const h of R.horns) add({ s: h.s, id: 'horn' + h.s, kind: 'horn' });
    for (const x of this.stops) if (x.st) add({ s: x.st.start - 400, id: 'app' + x.id, kind: 'approach', stopId: x.id });
    for (const p of this.passes) add({ s: p.at - 400, id: 'pass' + p.id, kind: 'pass' });
  }

  // ---- the clock and the lever ----
  clock() { return this.clockOffset + this.t; }
  pilotLit() { return !this.dwell || this.dwell.pilotLit; }
  doorsOpen() { return !!(this.dwell && this.dwell.doorsOpen); }
  cmd(name, val) {
    const T = this.train;
    if (this.gameOver || this.finished) return null;
    switch (name) {
      case 'power': {
        if (this.dwell && !this.dwell.pilotLit && T.notch >= 0 && !T.eb) this.bus.emit('note', 'doors');
        const moved = T.power();
        if (moved) this.bus.emit('notch', { name: T.notchName, dir: 1 });
        if (T.eb === false && moved && this.callOpen && this.callOpen.kind === 'departure' && !this.firstPowerDone) this.firstPowerDone = true;
        return moved;
      }
      case 'brake': { const moved = T.brake(); if (moved) this.bus.emit('notch', { name: T.notchName, dir: -1 }); return moved; }
      case 'neutral': if (!T.eb) { T.neutral(); this.bus.emit('notch', { name: 'N', dir: 0 }); } return true;
      case 'eb': if (!T.eb) this.emergency(); return true;
      case 'ats': return this.confirmATS();
      case 'horn': this.setHorn(!!val); return true;
      case 'call': return this.call();
      default: return null;
    }
  }
  emergency() {
    const T = this.train;
    if (T.eb) return;
    T.emergency(); this.stats.ebs++; this.lastEbS = T.s;
    this.penalty(15);
    if (!this.hazardOn()) { this.addTime(-3 * this.D.pen, 'EMERGENCY'); this.addScore(-200); }
    this.bus.emit('eb');
  }
  hazardOn() { return !!(this.obstruction && this.obstruction.active && !this.obstruction.passed); }

  // ---- the halo time, score, comfort and the toasts ----
  addTime(v, why) {
    if (!v || this.stage.frozenHalo) return;
    this.halo = Math.min(this.haloMax, this.halo + v);
    this.toast(why, v);
    if (this.halo <= 0 && !this.gameOver) { this.halo = 0; this.gameOver = true; this.bus.emit('gameover'); }
  }
  addScore(p) { this.score += p; }
  toast(text, v) { this.toasts.push({ text, v, t: this.t }); if (this.toasts.length > 4) this.toasts.shift(); }
  judge(label, halo, pts) { this.judgments.push({ label, t: this.t, halo, pts }); this.bus.emit('judgment', { label, halo, pts }); }
  setSubtitle(who, text) { this.subtitles.push({ who, text, t: this.t, until: this.t + 4.5 }); if (this.subtitles.length > 2) this.subtitles.shift(); this.bus.emit('line', { who, text }); }
  penalty(c) { this.comfort = Math.max(0, this.comfort - c * DH.TUNING.comfortSens); }

  // ---- signals and blocks (section 4.4) ----
  occupied(a, b) {
    const T = this.train;
    if (T.s > a && T.rear < b) return true;
    for (const o of this.others) {
      if (o.done || o.lane !== 'A') continue;
      const [lo, hi] = o.span(); if (hi > a && lo < b) return true;
    }
    return false;
  }
  aspectOf(g) {
    if (g.kind === 'shunt') return 'R';
    if (g.forced) return g.forced;
    if (g.kind === 'start' && !this.readySignals.has(g.id)) return 'R';
    if (g.obstruct && this.hazardOn()) return 'R';
    const i0 = this.signals.indexOf(g);
    let c = 0;
    for (let i = i0; i < this.signals.length && c < 3; i++) {
      const sg = this.signals[i], nxt = this.signals[i + 1] ? this.signals[i + 1].s : this.route.to;
      if (this.occupied(sg.s, nxt)) break;
      if (i > i0 && sg.kind === 'start' && !this.readySignals.has(sg.id)) break;
      c++;
    }
    return ['R', 'Y', 'YG', 'G'][Math.min(c, 3)];
  }
  updateSignals() {
    const T = this.train, prev = this.prevS;
    for (const g of this.signals) {
      const prevAsp = g.aspect;
      g.aspect = this.aspectOf(g);
      const d = g.s - T.s;
      const range = this.fogDist < 400 ? 180 : 600;
      if (!this.sighted.has(g.id) && d >= 0 && d <= range) { this.sighted.add(g.id); this.bus.emit('sighted', { id: g.id, aspect: g.aspect }); }
      // the front crosses the signal this step: a red at that moment is a SPAD
      if (prev < g.s && T.s >= g.s && !this.signalPassed.has(g.id)) {
        this.signalPassed.add(g.id);
        g.passedAsp = prevAsp;   // the aspect it showed as we passed: its speed cap applies from here on
        if (prevAsp === 'R' && g.kind !== 'shunt' && !this.spadLatched.has(g.id)) this.spad(g);
      }
    }
    let last = null;
    for (const g of this.signals) if (g.s <= T.s) last = g;
    this.lastPassed = last;
    this.aspectCap = last && last.passedAsp && last.passedAsp !== 'G' ? ASPECT_SPEED[last.passedAsp] : null;
  }
  spad(g) {
    this.spadLatched.add(g.id); this.stats.spad++;
    this.addTime(-20 * this.D.pen, 'SIGNAL PASSED AT DANGER'); this.addScore(-1000); this.penalty(15);
    this.judge('SIGNAL PASSED AT DANGER', -20 * this.D.pen, -1000);
    this.setSubtitle('Hoshino', 'Stop! That was a red.');
    this.bus.emit('spad', { id: g.id });
    this.emergency();
  }
  confirmATS() {
    if (!this.atsRinging) return false;
    this.atsRinging = false; this.atsOn = true;
    this.bus.emit('atsConfirm'); this.toast('ATS CONFIRM', 0);
    return true;
  }
  updateATS(dt) {
    const T = this.train, prev = this.prevS;
    for (const g of this.signals) {
      if (g.kind === 'shunt') continue;
      const beacon = g.s - 600;
      if (prev < beacon && T.s >= beacon && g.aspect === 'R' && !this.atsLatched.has(g.id)) {
        this.atsLatched.add(g.id);
        if (T.s < g.s) {
          this.atsRinging = true; this.atsTimer = DH.TUNING.atsTime; this.stats.ats++;
          this.bus.emit('ats', { id: g.id }); this.toast('ATS!', 0);
          this.setSubtitle('Hoshino', 'ATS. Confirm it, then brake.');
        }
      }
    }
    if (this.atsRinging) {
      this.atsTimer -= dt;
      if (this.atsTimer <= 0) { this.atsRinging = false; this.addTime(-3 * this.D.pen, 'ATS EB'); this.emergency(); }
    }
    if (this.atsOn && (T.v < 15 || (this.lastPassed && this.lastPassed.aspect !== 'R' && this.lastPassed.aspect !== 'Y'))) this.atsOn = false;
    // the speed check: over the limit by more than 10 km/h fires the brake, once per section
    const lim = this.limitInForce(), over = T.v - lim;
    if (over > 10 && !this.speedAlarm && !T.eb) { this.speedAlarm = true; this.addTime(-3 * this.D.pen, 'ATS EB'); this.emergency(); }
    if (over < 0) this.speedAlarm = false;
  }

  // ---- speed limits (section 4.5) ----
  limitInForce() {
    const T = this.train, R = this.route;
    let lim = R.lineSpeedAt(T.s) || 85;
    if (this.stage.lineSpeed) lim = Math.min(lim, this.stage.lineSpeed);
    for (const L of this.limits) {
      // in force while the front is in its section, and the section lasts until its END board (the rear passes it)
      if (T.s >= L.s && (L.end === null || T.rear <= L.end)) lim = Math.min(lim, L.v);
    }
    if (this.aspectCap !== null) lim = Math.min(lim, this.aspectCap);
    if (this.slowOrder) lim = Math.min(lim, this.slowOrder);
    return lim;
  }
  updateLimits() {
    const T = this.train, lim = this.limitInForce(), tol = DH.TUNING.limitTol, over = T.v - lim;
    if (over > tol) {
      if (!this.limitBroken) {
        this.limitBroken = true; this.limitPeak = over; this.stats.limit++;
        this.addTime(-2 * this.D.pen, 'LIMIT!'); this.addScore(-300); this.penalty(3);
        this.judge('LIMIT!', -2 * this.D.pen, -300); this.bus.emit('limit', { v: lim });
      } else if (over > this.limitPeak + 5) {
        const extra = Math.floor((over - this.limitPeak) / 5); this.limitPeak = over;
        this.addTime(-extra * this.D.pen, 'LIMIT!');
      }
    } else if (over < 0 && this.limitBroken) { this.limitBroken = false; this.limitPeak = 0; }
  }

  // ---- crossings, gates and the obstruction (section 4.11) ----
  updateCrossings() {
    const T = this.train;
    for (const c of this.route.crossings) {
      const d = c.s - T.s;
      let g = this.crossingGates[c.id] || (this.crossingGates[c.id] = { down: false });
      if (!g.down && d > -20 && (d < 500 || (T.v > 1 && d / (T.v / 3.6) < 25))) { g.down = true; this.bus.emit('gates', { id: c.id, down: true }); }
      if (g.down && T.rear > c.s + 12) { g.down = false; this.bus.emit('gates', { id: c.id, down: false }); }
    }
    const st = this.stage.obstruction;
    if (st && !this.obstruction) {
      const c = this.route.crossings.find(x => x.id === st.id);
      if (c && c.s - T.s < 350 && c.s - T.s > -20) {
        this.obstruction = { id: st.id, active: true, passed: false, stoppedAt: null, counted: false };
        this.bus.emit('obstruction', { id: st.id, on: true }); this.fire('obstruction');
      }
    }
    const ob = this.obstruction;
    if (ob && ob.active) {
      const c = this.route.crossings.find(x => x.id === ob.id);
      if (c && !ob.passed && T.s > c.s - 1 && T.rear < c.s + 1) {
        ob.passed = true; this.addTime(-3 * this.D.pen, 'HAZARD'); this.addScore(-200); this.bus.emit('hazard');
        this.emergency();
      }
      if (c && !ob.counted && T.v === 0 && T.s < c.s - 3) {
        ob.counted = true; ob.stoppedAt = this.t;
        this.addTime(5, 'HAZARD AVOIDED'); this.addScore(800); this.stats.hazard++; this.judge('HAZARD AVOIDED', 5, 800);
        this.setSubtitle('Mika', 'The crossing alarm! Something is on the tracks!');
      }
      if (ob.stoppedAt !== null && this.t - ob.stoppedAt > 12) { ob.active = false; this.bus.emit('obstruction', { id: ob.id, on: false }); }
    }
  }

  // ---- the horn (section 4.7) ----
  setHorn(on) {
    const H = this.horn;
    if (on && !H.held) { H.held = true; H.tHeld = 0; this.bus.emit('horn', { on: true }); }
    if (!on && H.held) { H.held = false; this.bus.emit('horn', { on: false }); }
  }
  updateHorn(dt) {
    const H = this.horn, T = this.train;
    if (H.held) H.tHeld += dt;
    for (const h of this.route.horns) {
      if (h.s < this.stageSpan[0] || h.s > this.stageSpan[1]) continue;
      const key = 'horn' + h.s, inZone = T.s >= h.s && T.s < h.s + h.zone;
      if (inZone && H.held && H.tHeld >= 0.5 && !H.sounded.has(key)) {
        H.sounded.add(key); this.stats.horn++;
        this.addTime(1, 'HORN +1'); this.addScore(100); this.judge('HORN +1', 1, 100);
        this.bus.emit('hornOK', { s: h.s });
      }
      if (T.s >= h.s + h.zone && !H.sounded.has(key) && !H.missed.has(key)) {
        H.missed.add(key); this.stats.hornMiss++;
        if (this.difficulty !== 'easy') this.addTime(-1 * this.D.pen, 'NO HORN');
      }
    }
    if (H.held && this.route.workers) for (const w of this.route.workers) if (T.s > w.s - 300 && T.s < w.until) this.bus.emit('workersHeard', { s: w.s });
  }

  // ---- the calls (section 4.7) ----
  openCall(kind) { this.callOpen = { kind, opened: this.t, made: false }; this.firstPowerDone = false; this.bus.emit('callOpen', { kind }); }
  call() {
    const T = this.train;
    if (this.callOpen && this.callOpen.kind === 'departure') {
      const great = !this.firstPowerDone;
      this.callOpen.made = true; this.callOpen = null;
      this.scoreCall(great, 'departure');
      return { kind: 'departure', great };
    }
    let best = null, bd = 1e9;
    for (const c of this.calls) {
      if (c.called || c.s < this.stageSpan[0] || c.s > this.stageSpan[1] + 400) continue;
      const d = c.s - T.s;
      if (d > 30 && d <= 180 && d < bd && (c.kind !== 'signal' || this.sighted.has(c.sig))) { best = c; bd = d; }
    }
    if (!best) { this.bus.emit('callMiss'); return null; }
    best.called = true;
    const great = bd >= 60 && bd <= DH.TUNING.callGreat;
    this.scoreCall(great, best.kind, best);
    return { kind: best.kind, great, point: best };
  }
  scoreCall(great, kind, point) {
    this.stats.calls++;
    if (great) { this.stats.callsGreat++; this.addTime(0.5, 'CALL GREAT'); this.addScore(100); this.judge('CALL GREAT', .5, 100); }
    else { this.addScore(50); this.judge('CALL', 0, 50); }
    this.bus.emit('call', { kind, great, point: point || null });
  }
  updateCalls() {
    if (this.opts.autoCalls) for (const c of this.calls) {
      if (c.called) continue;
      const d = c.s - this.train.s;
      if (d <= DH.TUNING.callGreat && d > 60 && (c.kind !== 'signal' || this.sighted.has(c.sig))) { c.called = true; this.bus.emit('call', { kind: c.kind, great: true, auto: true, point: c }); }
    }
    if (this.callOpen && this.callOpen.kind === 'departure' && this.t - this.callOpen.opened > 60) this.callOpen = null;
  }

  // ---- stations: the stop judgment, the dwell and the departure (section 4.6) ----
  classify(err) {
    const W = DH.TUNING.stopWindow * this.D.win;
    if (err > 50 || err < -50) return null;
    if (err <= W * 1.0 && err >= -W * 1.0) return 'ok';
    if (err < -W && err >= -5) return 'short';
    if (err < -5) return 'moveup';
    if (err > W && err <= 5) return 'over';
    return 'overmark';
  }
  stopJudgment(x) {
    const T = this.train, err = T.s - x.target, W = DH.TUNING.stopWindow * this.D.win;
    let label, halo, pts;
    if (err <= 0.10 * W) { label = 'PERFECT HALO!'; halo = 5; pts = 1000; this.stats.perfect++; }
    else if (err <= 0.30 * W) { label = 'GREAT!'; halo = 3; pts = 700; this.stats.great++; }
    else if (err <= 0.70 * W) { label = 'GOOD'; halo = 1; pts = 400; this.stats.good++; }
    else { label = 'OK'; halo = 0; pts = 200; this.stats.ok++; }
    this.finishStop(x, label, halo, pts, err);
  }
  finishStop(x, label, halo, pts, err) {
    this.addTime(halo, label); this.addScore(pts); this.judge(label, halo, pts);
    x.label = label; x.err = err; x.judged = true;
    this.stopLabels[x.id] = label; this.lastStopErr = err; this.stopLog.push({ id: x.id, label, err, smooth: false });
    this.arrivalJudgment(x);
    const sm = this.smoothOK(); if (sm) this.stopLog[this.stopLog.length - 1].smooth = true;
    if (sm) { this.stats.smooth++; this.addTime(2, 'SMOOTH!'); this.addScore(300); this.judge('SMOOTH!', 2, 300); }
    this.stats.stops++;
    this.stopIdx++;
    if (this.stage.noDwell) { this.recordCheckpoint('stop'); return; }
    this.beginDwell(x, this.clock());
  }
  arrivalJudgment(x) {
    if (x.arrival === null) return;
    const d = this.clock() - x.arrival, W = DH.TUNING.onTimeWindow;
    if (Math.abs(d) <= W) { this.stats.onTime++; this.addTime(3, 'ON TIME!'); this.addScore(500); this.judge('ON TIME!', 3, 500); }
    else if (d > W) { const h = -DH.TUNING.lateCost * (d - W) * this.D.pen; this.stats.late++; this.addTime(h, 'LATE +' + Math.round(d)); this.judge('LATE +' + Math.round(d), h, 0); }
    else { this.stats.early++; this.addScore(100); this.judge('EARLY', 0, 100); }
  }
  smoothOK() { return Math.abs(this.lastDecel) <= 1.0 && this.train.s - this.lastEbS > 100; }
  shortStop(x, err) { this.stats.short++; this.finishStop(x, 'SHORT', err * this.D.pen, 0, err); }
  overrunStop(x, err) {
    this.stats.overruns++;
    this.finishStop(x, 'OVERRUN!', -err * DH.TUNING.overrunCost * this.D.pen, 0, err);
  }

  updateStations(dt) {
    const T = this.train, x = this.stops[this.stopIdx];
    for (const p of this.passes) {
      if (!p.passed && T.s >= p.at) {
        p.passed = true;
        if (Math.abs(T.v) < 0.05 && Math.abs(T.s - p.at) < 50) { this.stats.wrong++; this.addTime(-5 * this.D.pen, 'WRONG STOP'); this.judge('WRONG STOP', -5 * this.D.pen, 0); this.setSubtitle('Hoshino', 'Wrong stop. That station is a pass.'); }
      }
    }
    if (this.dwell) { this.stepDwell(); if (this.stopIdx >= this.stops.length && this.dwell && this.dwell.closed) this.endStage(); return; }
    if (this.backup) return;
    if (!x) { if (!this.finished && this.stops.length) this.endStage(); return; }
    const err = T.s - x.target, stopped = Math.abs(T.v) < 0.05;
    // a stop approached from below: the creep window
    if (x.shortT !== null && T.v > 0.3 && !x.restarted) { x.restarted = true; x.restops++; this.addTime(-1 * this.D.pen, 'RE-STOP'); }
    if (x.shortT !== null) x.shortT -= (T.v > 0.3 ? 0 : dt);
    if (stopped && !x.judged) {
      const cls = this.classify(err);
      if (cls === 'ok') this.stopJudgment(x);
      else if (cls === 'over') this.overrunStop(x, err);
      else if (cls === 'short') {
        if (x.shortT === null) { x.shortT = 6; x.restarted = false; this.bus.emit('short', { m: -err }); this.setSubtitle('Hoshino', 'Short. Ease forward to the mark.'); }
        else if (x.shortT <= 0 || x.restops >= 3) this.shortStop(x, err);
        else if (x.restarted) { x.restarted = false; if (this.classify(err) === 'ok') this.stopJudgment(x); }
      } else if (cls === 'overmark') {
        this.backup = { x, target: x.target };
        this.addTime(-10 * this.D.pen, 'OVER THE MARK'); this.addScore(-300); this.stats.over++; this.judge('OVER THE MARK', -10 * this.D.pen, -300);
        this.setSubtitle('Hoshino', 'Back up to the mark.');
      }
    }
    // past the mark without stopping: a missed stop
    if (!x.judged && T.s > x.target + 50) {
      x.judged = true; x.done = true; this.stats.missed++;
      this.addTime(-10 * this.D.pen, 'MISSED STOP'); this.addScore(-300); this.judge('MISSED STOP', -10 * this.D.pen, -300);
      this.setSubtitle('Hoshino', 'Missed. We were meant to stop there.');
      this.stopIdx++;
      if (this.stopIdx >= this.stops.length) this.endStage();
    }
  }
  inFog(s) { return (this.stage.fogPatches || []).some(([a, b]) => s >= a && s <= b); }
  /** the back-up at 5 km/h to the mark (over the mark), then the stop is judged as OK */
  updateBackup(dt) {
    const b = this.backup, T = this.train;
    T.eb = false; T.notch = 0; T.v = -5; T.s -= 5 / 3.6 * dt;
    if (T.s <= b.target + 1) {
      T.s = Math.max(T.s, b.target); T.v = 0; this.backup = null;
      this.stats.ok++;
      this.finishStop(b.x, 'OK', 0, 200, T.s - b.target);
    }
  }
  beginDwell(x, T0, initial) {
    const dep = x.departure !== null ? x.departure : T0 + 20;
    const min = DH.TUNING.dwell;
    const melodyAt = Math.max(dep - 9, T0 + 6);
    const closeAt = Math.max(melodyAt + 7, dep - 4, T0 + min);
    this.dwell = { x, T0, dep, doorsAt: T0 + 1, melodyAt, closeAt, pilotAt: closeAt + 1.5, signalAt: 0, doorsOpen: false, melodyDone: false,
      closed: false, pilotLit: false, rushed: false, initial: !!initial };
    this.dwell.signalAt = Math.max(dep - 3, this.dwell.pilotAt);
    this.phase = 'dwell';
    this.bus.emit('doors', { open: false });
    this.recordCheckpoint('stop');
  }
  stepDwell() {
    const d = this.dwell, now = this.clock(), x = d.x;
    if (!d.doorsOpen && !d.closed && now >= d.doorsAt) { d.doorsOpen = true; this.bus.emit('doors', { open: true }); this.bus.emit('chime', 'open'); }
    if (!d.melodyDone && now >= d.melodyAt) { d.melodyDone = true; this.bus.emit('melody', { id: x.st ? x.st.melody : 'todai' }); this.bus.emit('pa', { id: x.id }); }
    if (d.doorsOpen && d.melodyDone && !d.closed && now >= d.closeAt) {
      d.closed = true; d.doorsOpen = false; this.bus.emit('doors', { open: false }); this.bus.emit('chime', 'close');
    }
    if (d.closed && !d.buzz && now >= d.closeAt + 1) { d.buzz = true; this.bus.emit('buzzer'); }
    if (d.closed && !d.pilotLit && now >= d.pilotAt) { d.pilotLit = true; this.bus.emit('pilot'); }
    if (d.pilotLit && now >= d.signalAt) {
      if (x.startSig) this.readySignals.add(x.startSig.id);
      if (!d.departCall) { d.departCall = true; this.openCall('departure'); }
    }
    // the train leaves once it's moving: the dwell ends
    if (d.pilotLit && this.train.v > 0.5) { this.dwell = null; this.phase = 'run'; this.recordCheckpoint('depart'); }
  }
  /** a door rush (S4): the doors re-open for 8 s more */
  doorRush() { const d = this.dwell; if (!d || d.rushed || !d.closed) return false; d.rushed = true; d.closeAt += 8; d.pilotAt += 8; d.signalAt += 8; d.closed = false; d.doorsOpen = true; d.melodyDone = true; this.bus.emit('doors', { open: true }); return true; }
  endStage() { if (this.finished) return; this.finished = true; this.recordCheckpoint('end'); this.bus.emit('stageEnd'); }

  // ---- comfort (section 4.10) ----
  updateComfort(dt) {
    const T = this.train;
    if (T.eb && !this.ebHit) { this.ebHit = true; this.penalty(15); }
    if (!T.eb) this.ebHit = false;
    if (T.slipT > 0 && !this.slipHit) { this.slipHit = true; this.stats.slips++; this.penalty(3); this.bus.emit('slip'); this.toast('SLIP', 0); }
    if (T.slipT <= 0) this.slipHit = false;
    if (T.slide && !this.slideHit) { this.slideHit = true; this.penalty(3); this.bus.emit('slide'); }
    if (!T.slide) this.slideHit = false;
    if (Math.abs(T.a) < 1.5 && T.v > 1) this.comfortCalm += dt; else this.comfortCalm = 0;
    if (this.comfortCalm >= 8) { this.comfortCalm = 0; this.comfort = Math.min(100, this.comfort + 1); }
    if (this.dwell === null && T.v === 0 && this.prevV > 0 && this.lastBrakeA < -2) { this.penalty(8); }
    this.prevV = T.v;
    this.lastBrakeA = T.a;
  }

  // ---- events (section 4.11) ----
  fire(id) { if (this.events.has(id)) return false; this.events.add(id); this.fired.push(id); return true; }
  updateEvents() {
    const T = this.train;
    for (const e of this.stage.events || []) {
      if (this.events.has(e.id)) continue;
      const go = (e.at !== undefined && T.s >= e.at) || (e.clock !== undefined && this.clock() >= DH.parseClock(e.clock)) || (e.stop && this.dwell && this.dwell.x && this.dwell.x.id === e.stop && this.dwell.closed);
      if (go) this.runEvent(e);
    }
  }
  runEvent(e) {
    this.fire(e.id);
    switch (e.type) {
      case 'oncoming': this.others.push(new TrainActor({ id: e.id, kind: 'oncoming', train: 'h8000', lane: e.lane || 'B', dir: -1, s: this.train.s + (e.ahead || 1400), v: 80, cars: 6, legs: [{ v: 80, acc: 4 }] })); this.bus.emit('oncoming', e); break;
      case 'radio': this.setSubtitle(e.who, e.text); this.bus.emit('radio', e); break;
      case 'tip': this.bus.emit('tip', e); break;
      case 'doorRush': this.doorRush(); this.setSubtitle('Mika', 'One moment please! Doors re-opening!'); this.bus.emit('doorRush'); break;
      case 'flash': this.flashAt = this.t; this.bus.emit('flash', e); break;
      case 'workers': this.bus.emit('workers', e); break;   // (the slow order itself is the route's board, section 4.11)
      case 'fog': this.bus.emit('fog', e); break;
      case 'glare': this.bus.emit('glare', e); break;
      case 'festival': this.bus.emit('festival', e); break;
      case 'other': this.others.push(new TrainActor(e.train)); this.bus.emit('other', e); break;
      default: this.bus.emit('event', e);
    }
  }

  // ---- the step (section 3.4) ----
  step(dt) {
    if (this.gameOver || this.finished) return;
    this.t += dt;
    if (this.backup) { this.updateBackup(dt); this.prevS = this.train.s; return; }
    const T = this.train, R = this.route;
    const env = { grade: R.gradeAt(T.s), dry: this.dryRail, traction: this.pilotLit() && !this.doorsOpen() };
    const before = T.s;
    T.step(dt, env);
    this.stats.km += Math.max(0, T.s - before) / 1000;
    if (T.v > 0 && T.v <= 3) this.lastDecel = T.a;
    if (T.rolled > 0.5 && !this.rollHit) { this.rollHit = true; this.stats.rollback++; this.addTime(-2 * this.D.pen, 'ROLLBACK'); this.penalty(5); }
    for (const o of this.others) o.step(dt, this);
    this.fogDist = this.inFog(T.s) ? 180 : 900;
    this.updateSignals();
    this.updateATS(dt);
    this.updateLimits();
    this.updateCrossings();
    this.updateHorn(dt);
    this.updateCalls();
    this.updateStations(dt);
    this.updateComfort(dt);
    this.updateEvents();
    this.toasts = this.toasts.filter(t => this.t - t.t < 2.6);
    this.subtitles = this.subtitles.filter(s => this.t < s.until);
    this.prevS = T.s;
  }

  // ---- checkpoints (section 4.9) ----
  recordCheckpoint(why) {
    this.checkpoint = { why, s: this.train.s, clock: this.clock(), halo: this.halo, score: this.score, comfort: this.comfort, stopIdx: this.stopIdx,
      fired: this.fired.slice(), t: this.t, stats: JSON.parse(JSON.stringify(this.stats)), others: this.others.map(o => ({ id: o.id, s: o.s, v: o.v, leg: o.leg, done: o.done })) };
  }
  /** the maximum score the stage can give (section 4.9 "Max") and the rank cut-offs */
  maxPoints() {
    const first = this.stage.startStopped ? 1 : 0;
    const judged = this.stops.slice(first).length;
    const arrivals = this.stops.slice(first).filter(x => x.arrival !== null).length;
    const calls = this.calls.filter(c => c.s >= this.stageSpan[0] && c.s <= this.stageSpan[1]).length;
    const horns = this.route.horns.filter(h => h.s >= this.stageSpan[0] && h.s <= this.stageSpan[1]).length;
    const maxHalo = this.haloStart + judged * 5 + arrivals * 3 + judged * 2 + horns * 1 + calls * 0.5;
    return judged * 1000 + arrivals * (500 + 300) + calls * 100 + horns * 100 + (this.stage.obstruction ? 800 : 0) + maxHalo * 50 + 100 * 5;
  }
  rankOf(total) {
    const M = this.maxPoints(), f = total / M;
    return f >= .9 ? 'S' : f >= .75 ? 'A' : f >= .55 ? 'B' : f >= .35 ? 'C' : 'D';
  }
  totals() {
    const halo = Math.max(0, this.halo), base = this.score;
    const bonus = halo * 50 + this.comfort * 5;
    return { score: this.score, halo: Math.round(halo), comfort: Math.round(this.comfort), total: Math.round(base + bonus), max: Math.round(this.maxPoints()) };
  }

  // ---- what the scenes and tests read ----
  snapshot() {
    const T = this.train, next = this.stops[this.stopIdx] || null;
    const ahead = this.signals.filter(g => g.s > T.s).slice(0, 3).map(g => ({ id: g.id, dist: Math.round(g.s - T.s), aspect: g.aspect, sighted: this.sighted.has(g.id) }));
    return {
      t: Math.round(this.t * 100) / 100, clock: DH.clock(this.clock()), s: Math.round(T.s * 10) / 10, km: Math.round(T.s) / 1000, v: Math.round(T.v * 10) / 10,
      notch: T.notchName, notchNum: T.notch, cab: T.spec.cab, P: T.P, B: T.B, a: T.a, jerk: T.jerk, eb: T.eb, slip: T.slipT > 0, slide: T.slide,
      halo: Math.round(this.halo * 10) / 10, score: Math.round(this.score), comfort: Math.round(this.comfort), limit: this.limitInForce(),
      nextStop: next ? { id: next.id, dist: Math.round(next.target - T.s), target: next.target, arr: next.arr || null } : null,
      signals: ahead, lastJudgment: this.judgments.length ? this.judgments[this.judgments.length - 1] : null, judgments: this.judgments.map(j => j.label),
      events: this.fired.slice(), doors: this.doorsOpen(), pilot: this.pilotLit(), ats: { ringing: this.atsRinging, confirmed: this.atsOn },
      stopped: Math.abs(T.v) < 0.05, finished: this.finished, gameOver: this.gameOver, stats: JSON.parse(JSON.stringify(this.stats)),
      weather: this.weather, fogDist: this.fogDist, call: this.callOpen ? this.callOpen.kind : null, backup: !!this.backup,
      obstruction: !!(this.obstruction && this.obstruction.active), difficulty: this.difficulty, toasts: this.toasts.map(t => t.text),
      others: this.others.map(o => ({ id: o.id, s: Math.round(o.s), v: Math.round(o.v), lane: o.lane, done: o.done }))
    };
  }
}
DH.Sim = Sim;
})();
