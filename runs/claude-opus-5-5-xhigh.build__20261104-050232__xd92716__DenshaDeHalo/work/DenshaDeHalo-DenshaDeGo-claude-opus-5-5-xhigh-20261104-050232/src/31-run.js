/* 31-run: one train's run through a stage, the whole rulebook, stepped at 1/120 s. The per-step order: commands ->
 * dynamics -> other trains and blocks -> signal aspects -> ATS and speed checks -> events -> stations (approach, stop,
 * judgment, dwell, departure) -> calls and horn -> Halo Time, score, comfort. It draws nothing: it emits events
 * (run.on(type, fn)) the drive scene turns into banners, sounds and voices. Distances: run.s is the front's route metre,
 * unwrapped (it keeps counting past the loop's seam); R.wrap folds it for the route. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, { clamp } = E;
const ASPECT_V = { G: 999, YG: 65, Y: 45, YY: 25, R: 0 };
DH.ASPECT_V = ASPECT_V;
const JUDGE = [[.10, 'PERFECT HALO!', 5, 1000, 'perfect'], [.30, 'GREAT!', 3, 700, 'great'], [.70, 'GOOD', 1, 400, 'good'], [1.0, 'OK', 0, 200, 'ok']];
DH.JUDGE = JUDGE;
const CALL_PHRASE = {
  start: ['Shuppatsu, shinko!', 'Departure. Proceed!'], blockG: ['Heisoku, shinko!', 'Block. Proceed!'], homeG: ['Jonai, shinko!', 'Home signal. Proceed!'],
  YG: ['Gensoku!', 'Reduce speed!'], Y: ['Chui!', 'Caution!'], YY: ['Keikai!', 'Restricted!'], R: ['Teishi!', 'Stop!'],
  approach: ['Teisha!', 'Stopping!'], pass: ['Tsuka!', 'Passing!'], crossing: ['Fumikiri, yoshi!', 'Crossing, clear!']
};
DH.CALL_PHRASE = CALL_PHRASE;

class Run {
  /** o: { track, train, cars, difficulty, seed, ghost, autoCalls, auto } */
  constructor(stageId, o = {}) {
    const S = this.stage = DH.STAGES[stageId]; if (!S) throw new Error('no stage ' + stageId);
    this.id = stageId; this.o = o; this.R = DH.route(S.route); this.track = o.track || S.track || 'A';
    this.trainType = o.train || S.train; this.cars = o.cars || S.cars || 6; this.len = DH.trainLength(this.cars);
    this.train = new DH.Train(this.trainType); this.diff = DH.DIFF[o.difficulty || DH.diffOverride || DH.game.settings.difficulty] || DH.DIFF.normal;
    this.handlers = {}; this.log = []; this.fired = new Set(); this.t = 0; this.paused = false;
    this.weather = o.weather || S.weather || 'clear'; this.tod = o.tod !== undefined ? o.tod : S.tod;
    this.reset();
  }
  on(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); return this; }
  emit(type, d = {}) { d.type = type; d.t = this.t; for (const fn of this.handlers[type] || []) fn(d, this); for (const fn of this.handlers['*'] || []) fn(d, this); return d; }
  /** unwrap a route metre to the first one at or after the stage's start */
  U(x) { const R = this.R; if (!R.loop) return x; const s0 = this.s0, L = R.length; return s0 + (((x - s0) % L) + L) % L; }
  reset() {
    const S = this.stage, R = this.R;
    DH.seed = this.o.seed || DH.hash(this.id);
    this.stops = S.stops.map(p => { const st = R.stations.find(q => q.id === p.id); return Object.assign({}, p, { st, arrT: p.arr ? DH.parseClock(p.arr) : null, depT: p.dep ? DH.parseClock(p.dep) : null }); });
    this.passes = (S.passes || []).map(p => Object.assign({}, p, { st: R.stations.find(q => q.id === p.id), atT: DH.parseClock(p.at) }));
    const first = this.stops[0].st;
    this.s0 = (first.stop[this.cars >= 10 ? 10 : 6] !== undefined ? first.stop[this.cars >= 10 ? 10 : 6] : first.stop[6]);
    for (const p of this.stops) p.target = this.U(p.st.stop[this.cars >= 10 && p.st.stop[10] !== undefined ? 10 : 6]);
    for (const p of this.passes) p.target = this.U(p.st.stop[6]);
    this.s = this.s0; this.sEnd = this.stops[this.stops.length - 1].target; this.train.reset();
    this.clock = this.stops[0].depT - (S.lead || 20); this.startClock = this.clock;
    this.grace = this.o.graceStart || Math.round(this.diff.grace * DH.TUNING.graceStart / DH.TUNING_DEFAULTS.graceStart); this.graceStart = this.grace; this.frozen = !!S.tutorial;
    this.score = 0; this.comfort = 100; this.comfortT = 0; this.stopIdx = 1; this.phase = 'dwell';
    this.judgments = []; this.calls = { made: 0, great: 0, missed: 0, possible: 0 }; this.horns = { made: 0, missed: 0, possible: 0 };
    this.penalties = []; this.bonuses = []; this.eventsFired = []; this.misc = { ebs: 0, slips: 0, overruns: 0, limitHits: 0, spads: 0, hazard: false, flash: false };
    this.actors = []; this.sigs = (R.signals[this.track] || []).map(g => g); this.sigState = new Map();
    for (const g of this.sigs) this.sigState.set(g, { aspect: 'G', passed: false, beacon: false });
    this.limitIn = []; this.lastAspectV = 999; this.limitArmed = new Map(); this.extraLimits = [];
    this.ats = { ringing: false, t: 0, confirmed: false, chime: false, sig: null, fired: false };
    this.callTargets = this._callTargets(); this.openCall = null; this.dep = null;
    this.hornZones = R.horns.filter(h => this._inStage(h.s)).map(h => ({ h, s: this.U(h.s), held: 0, done: false, missed: false }));
    this.horns.possible = this.hornZones.length;
    this.hornHeld = 0; this.horn = false; this.prevS = this.s; this.checkpoint = null; this.creep = null; this.backup = null; this.doneT = 0;
    this.doors = 1; this.doorSide = first.doors[this.track] || 'L'; this.pilot = false; this.passengers = 0; this.boarding = 0;
    this.eb = { hazard: false, at: -1e9 }; this.rollback = 0; this.slipLamp = 0; this.overStopMsg = 0; this.limitPeak = 0;
    this.camShake = 0; this.flashes = 0; this.tips = new Set();
    // the stage starts during the first station's dwell: doors open, the departure sequence ahead
    const d0 = this.stops[0].depT;
    if (S.tutorial) { this.s0 = this.s = S.startS || 10; this.dwell = null; } else this._startDwell(this.stops[0], d0 - (S.lead || 20), true);
    if (DH.Events) this.events = new DH.Events(this);
    this._aspects(true);
    this.emit('start', {});
  }
  _inStage(x) { const u = this.U(x); return u >= this.s0 - 1 && u <= this.sEnd + 1; }
  _callTargets() {
    const R = this.R, out = [];
    for (const c of R.calls) {
      if (c.track !== this.track && !(c.kind === 'limit' || c.kind === 'approach' || c.kind === 'crossing' || c.kind === 'approachBoard')) continue;
      if (c.kind === 'signal' && c.sig.track !== this.track) continue;
      if (!this._inStage(c.s)) continue;
      const s = this.U(c.s); if (s <= this.s0 + 5) continue;
      let kind = c.kind;
      if (kind === 'approach') { if (!this.stops.some(p => p.st.id === c.station) && !this.passes.some(p => p.st.id === c.station)) continue; if (this.passes.some(p => p.st.id === c.station)) continue; }
      if (kind === 'approachBoard') { kind = 'pass'; if (!this.passes.some(p => p.st.id === c.station)) continue; }
      out.push({ id: c.id, s, kind, sig: c.sig, v: c.v, station: c.station, optional: !!c.optional, x: c.x, state: 'wait', result: null });
    }
    out.sort((a, b) => a.s - b.s);
    this.calls.possible = out.filter(c => !c.optional).length + this.stops.length - 1;
    return out;
  }
  /* ================= the step ================= */
  /** cmd: { up, down, power, brake, neutral, eb, call, horn (held), ats }: lever moves this step (up/down already
   *  resolved to power/brake by the caller), button presses */
  step(dt, cmd = {}) {
    if (this.phase === 'over' || this.phase === 'finished') { this.t += dt; this.clock += dt; this.train.step(dt, this._env()); this._move(dt); this._actors(dt); if (this.phase === 'finished') { this._dwellStep(dt); if (this.events) this.events.step(dt); } return; }
    this.t += dt; this.clock += dt;
    this._commands(cmd);
    const st = this.train.step(dt, this._env());
    this._move(dt);
    this._actors(dt);
    if ((this._ak = (this._ak || 0) + dt) >= .1) { this._ak = 0; this._aspects(); }
    this._signals(dt);
    this._limits(dt);
    if (this.events) this.events.step(dt);
    this._stations(dt, cmd);
    this._calls(dt, cmd);
    this._hornStep(dt, cmd);
    this._comfortStep(dt);
    if (st.slipT > .79) { this.misc.slips++; this.comfortHit(3, 'slip'); this.emit('slip', {}); }
    if (this.grace <= 0 && !this.frozen && !this.o.god) this.gameOver();
    this.prevS = this.s;
  }
  /** the route segment under route metre x */
  seg(x = this.s) { const R = this.R, n = R.segs.length, i = Math.floor(x / DH.L); return R.segs[R.loop ? ((i % n) + n) % n : clamp(i, 0, n - 1)]; }
  /** an actor's route metre unwrapped nearest our own */
  N(x) { const R = this.R; if (!R.loop) return x; const L = R.length; let d = ((x - this.s) % L + L) % L; if (d > L / 2) d -= L; return this.s + d; }
  _env() {
    const R = this.R, g = this.seg().grade || 0, fogWet = this.weather === 'rain';
    return { T: DH.TUNING, grade: g, wet: fogWet, doors: this.pilot && this.doors <= 0, cut: !!this.atsCut, hold: !this.pilot && Math.abs(this.train.v) < .5 && !this.stage.tutorial };
  }
  _move(dt) { const v = this.train.v; this.s += v / 3.6 * dt; this.camShake = Math.max(0, this.camShake - dt * 2); if (v < -.01) { this.rollback += -v / 3.6 * dt; } }
  _commands(c) {
    const tr = this.train, now = this.t;
    if (this.backup) return;   // backing up to the mark: the lever is the computer's
    if (c.eb) { if (tr.emergency(now)) { this.misc.ebs++; this.eb.at = this.s; this.comfortHit(15, 'eb'); this.emit('eb', { hazard: this._hazardNear() }); if (!this._hazardNear() && this.train.v > 3) this.penalty(3, 200, 'EMERGENCY', 'eb'); this.camShake = 1; } }
    if (c.neutral) { if (tr.set(0, now)) this.emit('lever', { n: tr.notch }); }
    if (c.power) { const was = tr.notch; if (tr.move(1, now)) { this.emit('lever', { n: tr.notch }); if (was <= 0 && tr.notch > 0) this._powerOn(); } else if (tr.blocked === 'EB') { tr.blocked = null; this.emit('ebRelease', {}); } }
    if (c.brake) { if (tr.move(-1, now)) this.emit('lever', { n: tr.notch }); }
    if (c.ats) this.confirmATS();
    // a lurch (a big swing of the lever while moving) shakes the passengers: felt as jerk, km/h/s per second
    if (Math.abs(tr.st.jerk) > 5 && Math.abs(tr.v) > 5 && now - (this._jerkT || -9) > 1.5) { this._jerkT = now; this.comfortHit(2, 'jerk'); }
  }
  _powerOn() {
    if (!this.pilot || this.doors > 0) { this.emit('doorsBuzz', {}); return; }
    if (this.dep && !this.dep.powered) { this.dep.powered = true; this.dep.powerT = this.t; }
  }
  /* ================= other trains and blocks ================= */
  addActor(a) { const A = Object.assign({ id: 'T' + this.actors.length, dir: 1, cars: 6, livery: 'h8000', v: 0, legs: [], leg: 0, wait: 0, lights: true, blocks: true, track: 'A', doors: 0 }, a); A.vmax = A.vmax || 0; this.actors.push(A); this.emit('actor', { a: A }); return A; }
  _actors(dt) {
    for (const a of this.actors) {
      if (a.ghost) continue;
      if (a.update) a.update(a, dt, this);
      else this._legs(a, dt);
      a.s += a.dir * a.v * dt;
      if (a.path) a.track = DH.actorTrack(a, a.s);
      if (a.flash > 0) a.flash -= dt;
      if (a.removeBehind && this.s - a.s > a.removeBehind) a.dead = true;
    }
    if (this.actors.some(a => a.dead)) this.actors = this.actors.filter(a => !a.dead);
  }
  /** a scripted train's legs: { vmax (km/h), accel, decel (m/s2), stopAt (route m), dwell (s), until: { clock } } */
  _legs(a, dt) {
    const L = a.legs[a.leg]; if (!L) { a.v = Math.max(0, a.v - 1 * dt); return; }
    if (L.until && L.until.clock !== undefined) { if (this.clock < DH.parseClock(L.until.clock)) { a.v = Math.max(0, a.v - (L.decel || 1) * dt); return; } a.leg++; return; }
    if (a.wait > 0) { a.wait -= dt; if (a.wait <= 0) a.leg++; return; }
    const vmax = (L.vmax || 0) / 3.6, acc = L.accel || .7, dec = L.decel || .8;
    if (L.stopAt !== undefined) {
      const d = a.dir * (L.stopAt - a.s), vAllow = Math.max(d > .05 ? .4 : 0, Math.sqrt(Math.max(0, 2 * dec * Math.max(0, d - .3))));
      if (d <= .1 && a.v < .5) { a.v = 0; a.s = L.stopAt; a.wait = L.dwell === undefined ? 1e9 : Math.max(.01, L.dwell); if (L.onStop) L.onStop(a, this); return; }
      a.v = Math.min(a.v + acc * dt, vmax, vAllow);
    } else { a.v = a.v < vmax ? Math.min(vmax, a.v + acc * dt) : Math.max(vmax, a.v - dec * dt); if (L.untilS !== undefined && a.dir * (a.s - L.untilS) >= 0) a.leg++; }
  }
  /** the spans of track (route metres, unwrapped near us) each train holds on our track */
  _occupied() {
    const out = [];
    for (const a of this.actors) {
      if (!a.blocks || a.ghost || a.dir !== 1) continue;
      const len = DH.trainLength(a.cars), front = this.N(a.s), rear = front - len;
      if (a.path) {   // a train changing tracks: only the part of it on our track holds our blocks
        for (let i = 0; i < a.path.length; i++) { const p = a.path[i]; if (p.track !== this.track) continue; const lo = Math.max(rear, i ? this.N(p.s) : -1e9), hi = Math.min(front, i + 1 < a.path.length ? this.N(a.path[i + 1].s) : 1e9); if (hi > lo) out.push([lo, hi]); }
        continue;
      }
      if (a.track !== this.track) continue;
      out.push([rear, front]);
    }
    return out;
  }
  /** each signal's aspect: R when its block is held (a train in it, or a starting signal holding for our dwell), else Y,
   *  YG or G by how many clear blocks follow; a route may force one (YY into the terminal) */
  _aspects() {
    const sigs = this.sigs, n = sigs.length, occ = this._occupied(), R = this.R; if (!n) return;
    const near = []; for (let i = 0; i < n; i++) { const s = this.U(sigs[i].s); near.push(s); }
    const held = i => { const g = sigs[i]; return (g.kind === 'start' && this._startHeld(g)) || (this.forced && this.forced[g.id] === 'R'); };
    const blockOcc = i => { const a = near[i], b = i + 1 < n ? near[i + 1] : near[i] + 900; let lo = a, hi = b; if (hi < lo) hi += R.length; for (const [x, y] of occ) if (y > lo && x < hi) return true; return false; };
    const order = near.map((s, i) => i).sort((p, q) => near[p] - near[q]);
    for (let k = 0; k < order.length; k++) {
      const i = order[k], g = sigs[i]; let c = 0;
      for (let j = k; j < order.length && c < 3; j++) { const q = order[j]; if (held(q) || blockOcc(q)) break; c++; }
      let a = c === 0 ? 'R' : c === 1 ? 'Y' : c === 2 ? 'YG' : 'G';
      if (g.force && a !== 'R') a = g.force;
      if (this.forced && this.forced[g.id]) a = this.forced[g.id];
      if (g.kind === 'shunt') a = this._startHeld(g) ? 'R' : 'G';
      const ss = this.sigState.get(g); if (ss.aspect !== a) { const was = ss.aspect; ss.aspect = a; if (Math.abs(near[i] - this.s) < 1500) this.emit('aspect', { sig: g, aspect: a, was }); }
      g.aspect = a;
    }
  }
  _startHeld(g) {
    // a starting signal holds red while we dwell at its station, until the departure sequence says ready
    const d = this.dwell; if (this.stage.tutorial && g.kind === 'shunt') return !!(this.tut && this.tut.holdShunt && this.tut.holdShunt(g));
    if (!d || d.done) return false;
    const st = d.stop.st; return st && g.station === st.id && !d.sigClear;
  }
  /* ================= ATS, SPAD and the signal speed ================= */
  _signals(dt) {
    const s = this.s, ps = this.prevS;
    for (const g of this.sigs) {
      const gs = this.U(g.s), ss = this.sigState.get(g);
      if (g.kind !== 'shunt' && ps < gs - 600 && s >= gs - 600 && !ss.beacon) { ss.beacon = true; if (g.aspect === 'R' && !this.stage.noATS) this._atsRing(g); }
      if (ps < gs && s >= gs) {
        ss.passed = true;
        if (g.aspect === 'R' && !this.stage.tutorial) this.spad(g);
        this.lastAspectV = ASPECT_V[g.aspect] || 999; this.lastAspect = g.aspect; this.emit('passSignal', { sig: g, aspect: g.aspect });
      }
    }
    const A = this.ats;
    if (A.ringing) {
      A.t += dt;
      if (A.confirmed) { if (this.train.v < 15 || (A.sig && A.sig.aspect !== 'R')) { A.ringing = false; A.chime = false; this.emit('atsClear', {}); } }
      else if (A.t >= DH.TUNING.atsTime) { A.ringing = false; A.fired = true; this.train.emergency(this.t); this.misc.ebs++; this.penalty(10, 500, 'ATS!', 'ats'); this.emit('atsFire', {}); this.camShake = 1; }
    }
  }
  _atsRing(g) { const A = this.ats; Object.assign(A, { ringing: true, t: 0, confirmed: false, chime: false, sig: g, fired: false }); this.emit('atsRing', { sig: g }); }
  confirmATS() { const A = this.ats; if (A.ringing && !A.confirmed) { A.confirmed = true; A.chime = true; this.emit('atsConfirm', {}); return true; } return false; }
  spad(g) {
    this.misc.spads++; this.train.emergency(this.t); this.camShake = 1;
    this.penalty(20, 1000, 'SIGNAL PASSED AT DANGER', 'spad'); this.emit('spad', { sig: g });
  }
  /* ================= speed limits ================= */
  /** the limit in force: line speed, every board over the whole train, the last signal's aspect, slow orders */
  limitAt(s = this.s) {
    let v = this.R.lineAt(s);
    const lo = s - this.len;
    for (const l of this.R.limits) { const a = this.U(l.s), b = this.U(l.until) < a ? this.U(l.until) + this.R.length : this.U(l.until); if (s >= a && lo < b) v = Math.min(v, l.v); }
    for (const l of this.extraLimits) if (s >= l.s && lo < l.until) v = Math.min(v, l.v);   // (a work site Dev Mode set up)
    v = Math.min(v, this.lastAspectV);
    return v;
  }
  /** the next limit board ahead within 1.5 km: { v, d } */
  nextLimit() {
    let best = null;
    for (const l of this.R.limits) { const a = this.U(l.s), d = a - this.s; if (d > 0 && d < 1500 && (!best || d < best.d)) best = { v: l.v, d, slow: l.slow }; }
    for (const l of this.extraLimits) { const d = l.s - this.s; if (d > 0 && d < 1500 && (!best || d < best.d)) best = { v: l.v, d, slow: l.slow }; }
    return best;
  }
  _limits(dt) {
    const v = this.train.v, lim = this.limitAt(), tol = DH.TUNING.limitTol, key = lim;
    this.limit = lim;
    // a limit board passed more than 10 over fires the ATS speed check
    for (const l of this.R.limits) { const a = this.U(l.s); if (this.prevS < a && this.s >= a && v > l.v + 10 && !this.stage.tutorial) { this.train.emergency(this.t); this.misc.ebs++; this.camShake = .8; this.emit('atsSpeed', { v, lim: l.v }); } }
    if (lim < 900 && v > lim + tol) {
      this.limitPeak = Math.max(this.limitPeak, v - lim);
      if (!this._limitHit) { this._limitHit = true; this.misc.limitHits++; this.penalty(2, 300, 'LIMIT!', 'limit'); this.emit('limit', { lim, v }); this._limitPen = 0; }
      const extra = Math.floor((this.limitPeak - tol) / 5); if (extra > this._limitPen) { this.penalty(extra - this._limitPen, 0, null, 'limit'); this._limitPen = extra; }
      if (this.limitPeak > 5) this.comfortHit(5 * dt, 'curve');
    } else if (v <= lim) { this._limitHit = false; this.limitPeak = 0; }
  }
  /* ================= Halo Time, score, comfort ================= */
  penalty(sec, pts, label, why) {
    if (this.o.god) return;
    const k = this.diff.pen, d = Math.round(sec * k * 10) / 10;
    if (!this.frozen && d) this.grace = Math.max(0, this.grace - d);
    this.score -= pts || 0;
    const p = { sec: -d, pts: -(pts || 0), label, why, t: this.t }; this.penalties.push(p);
    if (label || d) this.emit('delta', p);
    return p;
  }
  bonus(sec, pts, label, why) {
    if (!this.frozen && sec) this.grace = Math.min(99, this.grace + sec);
    this.score += pts || 0; const b = { sec, pts, label, why, t: this.t }; this.bonuses.push(b);
    if (label || sec) this.emit('delta', b);
    return b;
  }
  comfortHit(n, why) { const k = DH.TUNING.comfortSens; this.comfort = clamp(this.comfort - n * k, 0, 100); this.comfortT = 0; if (n >= 1 && why) this.emit('comfort', { n, why }); }
  _comfortStep(dt) { this.comfortT += dt; if (this.comfortT >= 8 && Math.abs(this.train.v) > 1) { this.comfortT = 0; this.comfort = Math.min(100, this.comfort + 1); } if (this.rollback > 1 && !this._rolled) { this._rolled = true; this.penalty(2, 0, 'ROLLBACK', 'rollback'); this.comfortHit(5, 'rollback'); } if (this.train.v >= 0) { this.rollback = 0; this._rolled = false; } }
  gameOver() { if (this.phase === 'over') return; this.phase = 'over'; this.train.emergency(this.t); this.emit('gameOver', {}); }
  /** the most this stage could score, for the rank */
  maxScore() {
    const nStops = this.stops.length - 1, nCalls = this.callTargets.length + nStops, nHorn = this.hornZones.length, haz = this.stage.events && this.stage.events.some(e => e.type === 'obstruction') ? 1 : 0, flash = this.stage.events && this.stage.events.some(e => e.type === 'flash') ? 1 : 0;
    const pts = nStops * (1000 + 500 + 300) + nCalls * 100 + nHorn * 100 + haz * 800 + flash * 200;
    const grace = Math.min(99, this.graceStart + nStops * (5 + 3 + 2) + nCalls * .5 + nHorn * 1 + haz * 5 + flash * 2);
    return pts + grace * 50 + 100 * 5;
  }
  finalScore() { return Math.round(this.score + this.grace * 50 + this.comfort * 5); }
  rank() { const r = this.finalScore() / this.maxScore(); return r >= .9 ? 'S' : r >= .75 ? 'A' : r >= .55 ? 'B' : r >= .35 ? 'C' : 'D'; }
  /* ================= stations ================= */
  /** the next stop (or pass) ahead: { p, dist, pass } */
  nextStop() {
    const p = this.stops[this.stopIdx]; let pass = null;
    for (const q of this.passes) if (!q.done && q.target > this.s - 20 && (!p || q.target < p.target)) { pass = q; break; }
    if (pass) return { p: pass, dist: pass.target - this.s, pass: true };
    return p ? { p, dist: p.target - this.s, pass: false } : null;
  }
  _stations(dt, cmd) {
    const v = this.train.v, tr = this.train;
    if (this.stage.tutorial) return;   // the tutorial judges its own marks
    if (this.dwell) this._dwellStep(dt);
    if (this.backup) { this._backupStep(dt); return; }
    const p = this.stops[this.stopIdx];
    // passes: on time through, or a wrong stop
    for (const q of this.passes) if (!q.done && this.prevS < q.target && this.s >= q.target) { q.done = true; q.clock = this.clock; this.emit('pass', { p: q, late: this.clock - q.atT }); }
    if (!p) return;
    const err = this.s - p.target;
    if (this.phase === 'run' && err > 50 && v > .5) {   // a stop missed
      this.penalty(10, 0, 'MISSED STOP', 'missed'); this.emit('missed', { p });
      p.missed = true; this.stopIdx++; if (this.stopIdx >= this.stops.length) this.finish();
      return;
    }
    if (this.phase === 'run' && Math.abs(v) < .01 && this._wasMoving) {
      this._wasMoving = false;
      // stopped: at a pass station by mistake?
      for (const q of this.passes) if (!q.done && Math.abs(this.s - q.target) < 50) { this.penalty(5, 0, 'WRONG STOP', 'wrong'); this.emit('wrongStop', { p: q }); }
      if (Math.abs(err) <= 50) this._judge(p, err);
    }
    if (Math.abs(v) > .5) this._wasMoving = true;
    if (this.creep) { this.creep.t += dt; if (this.creep.canSettle && this.creep.t > 6 && Math.abs(v) < .01 && !this.creep.final) { this.creep.final = true; this._settle(p, this.s - p.target, true); } }
  }
  _judge(p, err) {
    const W = DH.TUNING.stopWindow * this.diff.window, decel = -this.train.st.a, smoothOK = decel <= 1.0 + .05 && (this.s - this.eb.at > 100 || this.eb.at < -1e8);
    this._smooth = smoothOK; this._stopDecel = decel;
    if (err < -1 * W) {
      // short: creep up (6 s) or, far short, move up with the doors shut
      this.creep = this.creep || { t: 0, restops: 0 }; if (this.creep.started) { this.creep.restops++; this.penalty(1, 0, null, 'restop'); }
      this.creep.started = true; this.creep.t = 0; this.creep.final = false;
      this.emit('short', { p, err, far: err < -5 });
      if (err >= -5) this.creep.canSettle = true; else this.creep.canSettle = false;
      return;
    }
    if (this.creep && this.creep.started) { this.creep.restops++; this.penalty(1, 0, null, 'restop'); }
    this._settle(p, err, false);
  }
  /** the final judgment where the train stands (err: + past the mark) */
  _settle(p, err, fromCreep) {
    const W = DH.TUNING.stopWindow * this.diff.window, a = Math.abs(err);
    let J = null;
    if (fromCreep && err < 0 && a > W) J = { label: 'SHORT', sec: -Math.round(a) * 1, pts: 0, key: 'short' };
    else if (err > 5 * W) {
      J = { label: 'OVER THE MARK', sec: -10, pts: -300, key: 'over', backup: true };
    } else if (err > 1 * W) J = { label: 'OVERRUN!', sec: -Math.round(a * DH.TUNING.overrunCost * 10) / 10, pts: 0, key: 'overrun' };
    else for (const [w, label, sec, pts, key] of JUDGE) if (a <= w * W) { J = { label, sec, pts, key }; break; }
    if (!J) J = { label: 'OK', sec: 0, pts: 200, key: 'ok' };
    this.creep = null;
    J.err = err; J.station = p.st.id; J.stop = p; J.clock = this.clock;
    if (J.key === 'overrun' || J.key === 'over') this.misc.overruns++;
    if (J.sec > 0) this.bonus(J.sec, J.pts, null, 'stop'); else if (J.sec < 0 || J.pts < 0) this.penalty(-J.sec, -J.pts, null, 'stop'); else this.score += J.pts;
    // the arrival time against the timetable
    if (p.arrT !== null) {
      const late = this.clock - p.arrT, win = DH.TUNING.onTimeWindow;
      if (Math.abs(late) <= win) { J.time = 'ON TIME!'; J.timeKey = 'ontime'; this.bonus(3, 500, null, 'ontime'); }
      else if (late > win) { J.time = 'LATE +' + Math.round(late - win); J.timeKey = 'late'; this.penalty((late - win) * DH.TUNING.lateCost, 0, null, 'late'); }
      else { J.time = 'EARLY'; J.timeKey = 'early'; this.score += 100; }
      J.late = late;
    }
    if (this._smooth && J.key !== 'over' && !fromCreep) { J.smooth = true; this.bonus(2, 300, null, 'smooth'); } else if (this._stopDecel > 2.0) this.comfortHit(8, 'jolt');
    this.judgments.push(J); this.lastJudgment = J;
    this.emit('judge', J);
    if (J.backup) { this.backup = { p, phase: 'wait', t: 0 }; return; }
    this._arrive(p);
  }
  _backupStep(dt) {
    const B = this.backup, tr = this.train; B.t += dt;
    if (B.phase === 'wait') { tr.set(-4); if (B.t > 1.5) { B.phase = 'back'; this.emit('backup', {}); } return; }
    // back up at 5 km/h to the mark (the train is moved directly; the lever shows B1)
    const d = this.s - B.p.target; tr.notch = -1; tr.st.v = 0;
    if (d > .05) this.s -= Math.min(d, 5 / 3.6 * dt); else { this.s = B.p.target; this.backup = null; this.emit('backupDone', {}); const J = this.lastJudgment; this._arrive(B.p); }
  }
  _arrive(p) {
    this.phase = 'dwell'; this.stopIdx++;
    if (this.stopIdx >= this.stops.length) { this._startDwell(p, this.clock, false, true); return; }
    this._startDwell(p, this.clock, false);
  }
  /** the dwell: doors, melody, doors closing, the buzzer, the pilot lamp, the starting signal, the departure call */
  _startDwell(p, t0, initial, last) {
    const st = p.st, minD = DH.TUNING.dwell, dep = p.depT !== null && p.depT !== undefined ? Math.max(p.depT, t0 + minD) : t0 + minD;
    const melAt = Math.max(dep - 13, t0 + 5), closeAt = melAt + 8.5;
    this.doorSide = st.doors[this.track] || 'L';
    this.dwell = { stop: p, t0, dep, openAt: t0 + 1, melAt, closeAt, buzzAt: closeAt + 1.2, pilotAt: closeAt + 1.8, sigAt: Math.max(dep - 3, closeAt + 1.5), opened: initial, melody: false, closing: false, buzz: false, pilot: false, sigClear: false, done: false, last: !!last, extra: 0, rush: null };
    if (initial) { this.doors = 1; this.pilot = false; this.emit('doorsOpen', { side: this.doorSide, st, initial: true }); }
    this.boarding = 0;
    this.emit('dwell', { p, st, initial, last: !!last });
    if (last) this.finish();
  }
  _dwellStep(dt) {
    const d = this.dwell; if (!d || d.done) return; const c = this.clock;
    if (this.phase === 'finished') { if (!d.opened && c >= d.openAt) { d.opened = true; this.doors = 1; this.pilot = false; this.emit('doorsOpen', { side: this.doorSide, st: d.stop.st }); } return; }
    if (!d.opened && c >= d.openAt) { d.opened = true; this.doors = 1; this.pilot = false; this.emit('doorsOpen', { side: this.doorSide, st: d.stop.st }); }
    if (d.opened && this.doors > 0 && !d.closing) this.boarding = Math.min(1, this.boarding + dt / Math.max(3, d.closeAt - d.openAt - 1));
    if (!d.melody && c >= d.melAt) { d.melody = true; this.emit('melody', { st: d.stop.st }); }
    if (d.rush && !d.rush.done) { if (c >= d.rush.at && !d.rush.opened) { d.rush.opened = true; this.doors = 1; this.pilot = false; d.closing = false; d.closeAt = c + d.rush.secs; d.buzzAt = d.closeAt + 1.2; d.pilotAt = d.closeAt + 1.8; d.sigAt = Math.max(d.sigAt, d.closeAt + 1.5); this.emit('doorRush', { secs: d.rush.secs }); d.rush.done = true; } }
    if (!d.closing && c >= d.closeAt) { d.closing = true; this.emit('doorsClosing', {}); }
    if (d.closing && this.doors > 0) { this.doors = Math.max(0, this.doors - dt / 1.1); if (this.doors === 0) this.emit('doorsClosed', {}); }
    if (!d.buzz && c >= d.buzzAt) { d.buzz = true; this.emit('buzzer', {}); }
    if (!d.pilot && c >= d.pilotAt && this.doors === 0) { d.pilot = true; this.pilot = true; this.emit('pilot', {}); this.saveCheckpoint(); }
    if (!d.sigClear && c >= d.sigAt && d.pilot) { d.sigClear = true; this._aspects(); this.dep = { opened: this.t, powered: false, called: false, st: d.stop.st }; this.emit('departReady', { st: d.stop.st }); }
    if (d.sigClear && Math.abs(this.train.v) > .5) { d.done = true; this.phase = 'run'; this._wasMoving = true; this.emit('depart', { st: d.stop.st, late: this.clock - d.dep }); }
  }
  finish() { if (this.phase === 'finished') return; this.phase = 'finished'; this.doneT = this.t; this.emit('finish', { score: this.finalScore(), rank: this.rank() }); }
  /* ================= point and call, the horn ================= */
  _calls(dt, cmd) {
    const s = this.s, T = DH.TUNING, sight = this.fogAt ? (this.fogAt(s) > .3 ? 180 : 600) : 600;
    // open and close windows: 180 m to 30 m ahead (signals once sighted)
    let open = null;
    for (const c of this.callTargets) {
      if (c.state === 'done' || c.state === 'missed') continue;
      const d = c.s - s;
      if (d < 30) { if (c.state === 'open' || c.state === 'wait') { c.state = 'missed'; if (!c.optional) { this.calls.missed++; this.emit('callMissed', { c }); } } continue; }
      if (d <= 180 && d <= sight) { if (c.state === 'wait') { c.state = 'open'; this.emit('callOpen', { c }); } if (!open || c.s < open.s) open = c; }
    }
    // the departure call: from the starting signal clearing; GREAT before the first power notch
    const D = this.dep; let depOpen = null;
    if (D && !D.called && !D.missed) { if (this.t - D.opened > 15 || (D.powered && this.t - D.powerT > 6)) { D.missed = true; this.calls.missed++; this.emit('callMissed', { c: { kind: 'start' } }); } else depOpen = D; }
    this.openCall = depOpen ? { kind: 'start', dep: D } : open;
    const auto = this.o.autoCalls !== undefined ? this.o.autoCalls : DH.game.settings.autoCalls;
    let pressed = cmd.call;
    if (auto && !pressed) {   // the assist calls at the sweet spot, for no score
      if (depOpen && this.t - D.opened > .6) this._makeCall(null, true);
      else if (open && open.s - s <= (T.callGreat + 60) / 2) this._makeCall(open, true);
      return;
    }
    if (pressed) { if (depOpen) this._makeCall(null, false); else if (open) this._makeCall(open, false); else this.emit('callNothing', {}); }
  }
  _makeCall(c, auto) {
    const T = DH.TUNING; let great, phrase, kind;
    if (!c) { const D = this.dep; D.called = true; great = !D.powered; kind = 'start'; phrase = CALL_PHRASE.start; }
    else {
      const d = c.s - this.s; great = d <= T.callGreat && d >= 60; c.state = 'done'; kind = c.kind;
      if (c.kind === 'signal') { const a = c.sig.aspect; phrase = a === 'G' ? (c.sig.kind === 'home' ? CALL_PHRASE.homeG : c.sig.kind === 'start' ? CALL_PHRASE.start : CALL_PHRASE.blockG) : CALL_PHRASE[a] || CALL_PHRASE.R; }
      else if (c.kind === 'limit') phrase = ['Seigen, ' + c.v + '!', 'Limit ' + c.v + '!'];
      else phrase = CALL_PHRASE[c.kind] || CALL_PHRASE.approach;
      c.result = great ? 'great' : 'ok';
    }
    this.calls.made++; if (great && !auto) this.calls.great++;
    if (!auto) { if (great) this.bonus(.5, 100, null, 'call'); else this.score += 50; }
    this.emit('call', { c, great, auto, phrase, kind });
  }
  _hornStep(dt, cmd) {
    const on = !!cmd.horn; if (on && !this.horn) this.emit('hornOn', {}); if (!on && this.horn) this.emit('hornOff', {}); this.horn = on;
    for (const z of this.hornZones) {
      if (z.done) continue; const d = this.s - z.s;
      if (d >= 0 && d <= z.h.len) { if (on) { z.held += dt; if (z.held >= .5) { z.done = true; this.horns.made++; this.bonus(1, 100, 'HORN +1', 'horn'); this.emit('hornOK', { z }); } } }
      else if (d > z.h.len) { z.done = true; z.missed = true; this.horns.missed++; if (this.diff.hornMiss) this.penalty(1, 0, 'HORN!', 'hornMiss'); this.emit('hornMissed', { z }); }
    }
  }
  /* ================= checkpoints ================= */
  saveCheckpoint() {
    const keep = ['s', 'clock', 'grace', 'score', 'comfort', 'stopIdx', 'phase', 'doors', 'pilot', 'doorSide', 'lastAspectV', 'lastAspect', 't'];
    const cp = { v: {}, train: JSON.parse(JSON.stringify(this.train.st)), notch: this.train.notch, actors: this.actors.map(a => Object.assign({}, a, { _items: null })), dwell: Object.assign({}, this.dwell), sig: [...this.sigState.entries()].map(([g, v]) => [g.id, Object.assign({}, v)]), calls: this.callTargets.map(c => [c.state, c.result]), horns: this.hornZones.map(z => [z.held, z.done, z.missed]), counts: JSON.parse(JSON.stringify({ calls: this.calls, horns: this.horns, misc: this.misc })), judgments: this.judgments.slice(), passes: this.passes.map(p => p.done), fired: this.events ? this.events.save() : null, dep: this.dep ? Object.assign({}, this.dep) : null };
    for (const k of keep) cp.v[k] = this[k];
    this.checkpoint = cp; this.emit('checkpoint', {});
  }
  /** back to the last departure; o.continue: Halo Time back to the start value, the score halved */
  restoreCheckpoint(o = {}) {
    const cp = this.checkpoint; if (!cp) return false;
    Object.assign(this, cp.v); this.train.st = JSON.parse(JSON.stringify(cp.train)); this.train.notch = cp.notch;
    this.actors = cp.actors.map(a => Object.assign({}, a)); this.dwell = Object.assign({}, cp.dwell);
    const byId = new Map(this.sigs.map(g => [g.id, g])); for (const [id, v] of cp.sig) { const g = byId.get(id); if (g) this.sigState.set(g, Object.assign({}, v)); }
    cp.calls.forEach(([st, r], i) => { if (this.callTargets[i]) { this.callTargets[i].state = st; this.callTargets[i].result = r; } });
    cp.horns.forEach(([h, d, m], i) => { const z = this.hornZones[i]; if (z) { z.held = h; z.done = d; z.missed = m; } });
    const c = JSON.parse(JSON.stringify(cp.counts)); this.calls = c.calls; this.horns = c.horns; this.misc = c.misc; this.judgments = cp.judgments.slice();
    cp.passes.forEach((d, i) => { if (this.passes[i]) this.passes[i].done = d; });
    if (this.events && cp.fired) this.events.load(cp.fired);
    this.dep = cp.dep ? Object.assign({}, cp.dep) : null;
    this.backup = null; this.creep = null; this.ats.ringing = false; this.phase = 'dwell'; this.prevS = this.s;
    if (o.continue) { this.grace = this.graceStart; this.score = Math.round(this.score / 2); }
    this._aspects(); this.emit('restored', { continue: !!o.continue });
    return true;
  }
  _hazardNear() { return !!(this.events && this.events.hazardAhead && this.events.hazardAhead()); }
  /** the signals ahead on our track, nearest first: [{ g, d }] within maxD, at most n */
  signalsAhead(maxD = 1500, n = 3) {
    const out = []; for (const g of this.sigs) { const d = this.U(g.s) - this.s; if (d > 0 && d < maxD) out.push({ g, d }); }
    out.sort((a, b) => a.d - b.d); return out.slice(0, n);
  }
  /** what the HUD and tests read */
  snapshot() {
    const ns = this.nextStop(), tr = this.train;
    const sig = this.signalsAhead(3000, 3).map(({ g, d }) => ({ id: g.id, dist: Math.round(d), aspect: g.aspect }));
    return { stage: this.id, s: +this.s.toFixed(2), km: +(this.R.wrap ? (((this.s % this.R.length) + this.R.length) % this.R.length) / 1000 : this.s / 1000).toFixed(2), v: +tr.v.toFixed(2), notch: tr.name, grace: +this.grace.toFixed(1), score: this.score, final: this.finalScore(), clock: DH.clockStr(this.clock), phase: this.phase,
      nextStop: ns && { id: ns.p.st.id, dist: +ns.dist.toFixed(2), pass: ns.pass }, lastJudgment: this.lastJudgment ? { label: this.lastJudgment.label, err: +this.lastJudgment.err.toFixed(3), time: this.lastJudgment.time, smooth: !!this.lastJudgment.smooth } : null,
      signals: sig, limit: this.limit, comfort: Math.round(this.comfort), doors: +this.doors.toFixed(2), pilot: this.pilot, ats: { ringing: this.ats.ringing, confirmed: this.ats.confirmed }, events: this.eventsFired.slice(), calls: Object.assign({}, this.calls), horns: Object.assign({}, this.horns), misc: Object.assign({}, this.misc), rank: this.rank() };
  }
}
DH.Run = Run;
/** the track an actor with a path is on at route metre x */
DH.actorTrack = (a, x) => { if (!a.path) return a.track; let t = a.path[0].track; for (const p of a.path) if (x >= p.s) t = p.track; return t; };
})();
