/* DENSHA DE HALO! · the simulation: one stage's run, pure logic, headless and deterministic.
 * Per fixed step (1/120 s): lever -> train dynamics -> other trains, blocks, aspects -> ATS, SPAD, limits -> events,
 * crossings -> station approach, stop, judgment, dwell, departure -> calls and horn -> Halo Time, score, comfort -> clock.
 * It never draws or plays: it writes what happened to run.out ({ k: 'judge' | 'toast' | 'say' | 'sfx' | ... }), which the
 * drive scene turns into the HUD, sound and story. Units: s and distances in metres, v in km/h, accelerations in km/h/s. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, clamp = E.clamp;
const ASPECT_V = { G: 999, YG: 65, Y: 45, YY: 25, R: 0 };
DH.ASPECT_V = ASPECT_V;
const JUDGE_COL = { 'PERFECT HALO!': '#ffd84a', 'GREAT!': '#5ae0ff', GOOD: '#6aee7a', OK: '#ffffff', SHORT: '#ffa040', 'OVERRUN!': '#ff5a4a', 'OVER THE MARK': '#ff3a3a', 'ON TIME!': '#ffd84a', EARLY: '#c8c8ff', 'SMOOTH!': '#ff8ac8', 'MISSED STOP': '#ff3a3a', 'WRONG STOP': '#ff8a3a' };
DH.JUDGE_COL = JUDGE_COL;

class Run {
  constructor(stageId, o = {}) {
    const base = DH.STAGES[stageId]; if (!base) throw new Error('no stage ' + stageId);
    this.o = o; this.id = stageId;
    this.stage = Object.assign({}, base, o.free ? { tod: o.tod !== undefined ? o.tod : base.tod, weather: o.weather || base.weather, train: o.train || base.train } : {});
    if (o.weather) this.stage.weather = o.weather;
    if (o.tod !== undefined) this.stage.tod = o.tod;
    const R = this.R = DH.route(this.stage.route);
    this.T = DH.TRAINS[o.train || this.stage.train];
    this.cars = this.stage.cars; this.len = this.cars * DH.CAR; this.key = String(this.cars >= 10 ? 10 : 6);
    this.track = o.track || 'A';
    this.diff = DH.DIFF[o.difficulty || (DH.game && DH.game.settings.difficulty) || 'Normal'] || DH.DIFF.Normal;
    this.out = []; this.said = new Set(); this.fired = []; this.tips = new Set();
    this.t = 0; this.clock = this.stage.startClock;
    this.rain = this.stage.weather === 'rain'; this.fogAll = this.stage.weather === 'fog' && false;
    // stops, with unwrapped targets
    let prev = null;
    this.stops = this.stage.stops.map((q, i) => {
      const st = R.station(q.id), raw = st.stop[this.key] !== undefined ? st.stop[this.key] : st.stop[6];
      const target = prev === null ? (this.stage.tutorial ? raw : raw) : prev + R.ahead(prev, raw);
      prev = target;
      return { i, id: q.id, st, arr: q.arr === undefined ? null : q.arr, dep: q.dep === undefined ? null : q.dep, target, judged: false };
    });
    this.passes = (this.stage.passes || []).map(p => { const st = R.station(p.id); const raw = st.stop[6]; return { id: p.id, st, at: p.at, target: this.stops[0].target + R.ahead(this.stops[0].target, raw), done: false }; });
    for (const st of R.stations) st.passing = this.passes.some(p => p.id === st.id);
    // the train
    const startS = this.stage.tutorial ? this.stage.startS : this.stops[0].target;
    this.s = startS; this.v = 0; this.P = 0; this.B = 0; this.a = 0; this.aPrev = 0; this.jerk = 0;
    this.li = this.stage.tutorial ? 0 : -this.T.nb + 2;   // standing with a service brake on, at a platform
    this.slipT = 0; this.slip = false; this.slide = false; this.rollback = 0; this.rbStart = null;
    this.ebUsedAt = -1e9; this.ebHazard = false; this.lastNotchChange = []; this.notchesSincePilot = 0;
    this.stopIdx = 0; this.phase = this.stage.tutorial ? 'run' : 'dwell';
    this.doors = this.stage.tutorial ? 'closed' : 'open'; this.doorAnim = this.stage.tutorial ? 0 : 1; this.pilot = !!this.stage.tutorial;
    this.grace = this.stage.tutorial ? 99 : Math.min(99, Math.round(this.diff.grace * (DH.T.graceStart / 25)));
    this.graceStart = this.grace;
    this.score = 0; this.comfort = 100; this.comfortT = 0; this.pts = { stops: 0, punct: 0, calls: 0, smooth: 0, pen: 0 };
    this.stats = { perfect: 0, ontime: 0, smooth: 0, calls: 0, great: 0, missed: 0, overruns: 0, slides: 0, slips: 0, ebs: 0, horns: 0, stopErr: [], judged: [], km: 0, spad: 0 };
    this.lastJudgment = null; this.overGame = false; this.done = false; this.endT = null;
    // signals on my track, and every other signal shown clear
    this.sigs = R.signals.filter(sg => sg.track === this.track);
    for (const sg of R.signals) if (sg.track !== this.track) sg.aspect = 'G';
    for (const sg of this.sigs) { sg.aspect = 'R'; sg.held = false; sg.sighted = false; }
    this.force = {};
    this.lastAspect = null; this.lastSig = null;
    // the starting signal of each stop is held at red until the departure procedure clears it
    for (const sp of this.stops) { sp.startSig = this.sigs.find(sg => { const d = R.ahead(sp.st.stop[this.key] !== undefined ? sp.st.stop[this.key] : sp.st.stop[6], sg.s); return d > 0 && d < 160; }) || null; if (sp.startSig) sp.startSig.held = true; }
    if (this.stage.tutorial) { const d2 = this.sigs.find(sg => sg.id === 'D-2'); if (d2) d2.held = true; }
    this.ats = { ringing: false, t: 0, confirmed: false, sig: null, chime: false };
    // calls on my track (horn boards are not call points), limits, horn zones, crossings, emitters
    this.calls = R.calls.filter(c => c.kind !== 'horn' && (!c.track || c.track === this.track)).map(c => Object.assign({}, c, { state: 'wait' }));
    this.depCall = null; this.firstPowerAfterClear = false;
    this.limits = R.limits.map(l => Object.assign({}, l, { state: 'idle' }));
    this.horns = R.horns.map(h => Object.assign({}, h, { hold: 0, done: false, inside: false }));
    for (const cr of R.crossings) { cr.warn = false; cr.gate = 0; cr.blocked = false; }
    for (const em of R.emitters) em.flashing = false;
    this.cart = { active: false, crossing: null, stoppedT: 0, cleared: false, hit: false };
    this.violation = null; this.backup = false; this.short = null; this.restops = 0;
    this.hornDown = false; this.hornT = 0; this.flash = null;
    // events
    this.events = (this.stage.events || []).filter(ev => !(this.stage.parallel && /rival|doorRush|glare/.test(ev.type))).map(ev => Object.assign({ fired: false }, ev));
    this.festival = !!this.stage.festival; this.fog = null; this.glare = null; this.workersWave = 0; this.rush = null;
    this.actors = []; this.parked = [];
    this._initActors();
    // the first stop: the train stands in its dwell, doors open
    if (!this.stage.tutorial) {
      const sp = this.stops[0]; sp.judged = true;
      this.dw = this._dwellPlan(sp, this.clock - 4); this.dw.opened = true; this.dw.phase = 'boarding';
    } else { this.dw = null; this.tut = { i: 0, t: 0, flags: {} }; this._say('hoshino', this.stage.steps[0].line); }
    this.maxScore = this._max();
    this.checkpoint = null;
    this.prevS = this.s;
  }
  /* ---------- helpers ---------- */
  emit(k, o = {}) { o.k = k; this.out.push(o); return o; }
  _say(who, line, o = {}) { this.emit('say', Object.assign({ who, line }, o)); }
  _rule(key) { if (this.said.has(key) || !DH.RULE_LINES[key]) return; this.said.add(key); const [w, l] = DH.RULE_LINES[key]; this._say(w, l); }
  tip(id) { if (this.tips.has(id)) return; this.tips.add(id); this.emit('tip', { id }); }
  get rear() { return this.s - this.len; }
  get vms() { return this.v / 3.6; }
  get notchName() { const nb = this.T.nb; return this.li <= -nb - 1 ? 'EB' : this.li < 0 ? 'B' + (-this.li) : this.li === 0 ? 'N' : 'P' + this.li; }
  get isEB() { return this.li <= -this.T.nb - 1; }
  get nextStop() { return this.stops[this.stopIdx] || null; }
  ahead(x) { return x - this.s; }
  wrapS(s) { return this.R.loop ? DH.wrap(s, this.R.len) : s; }
  /** distance from our front to a route position s (unwrapped toward the next occurrence ahead, or behind by up to 100 m) */
  dTo(s) { return this.R.ahead(this.wrapS(this.s), this.wrapS(s)); }
  sightDist() { return this.fog && this.fogActive ? 180 : 600; }
  addGrace(d, label) {
    if (this.stage.tutorial) return;
    if (d < 0) { if (DH.dev.god || DH.dev.freeze || this.o.cheat) return; d *= this.diff.pen; }
    if (DH.dev.freeze) return;
    d = Math.round(d * 10) / 10;
    this.grace = clamp(this.grace + d, 0, 99);
    this.emit('halo', { d, label });
    if (this.grace <= 0 && !this.overGame) { this.overGame = true; this.phase = 'over'; this.emit('gameOver', {}); }
  }
  addPts(n, cat) { if (this.stage.tutorial) return; this.score += n; if (cat) this.pts[cat] += n; }
  comfortHit(n) { if (this.stage.tutorial) return; this.comfort = clamp(this.comfort - n * DH.T.comfortSens, 0, 100); this.comfortT = 0; if (this.comfort < 60) this._rule('comfortLow'); }
  /* ---------- the train actors this stage needs ---------- */
  _initActors() {
    const R = this.R, st = this.stage;
    if (st.route === 'depot') for (const sd of R.sidings || []) this.parked.push(new DH.TrainActor({ id: 'parked' + sd.x, s: sd.len - 10, cars: 6, kind: sd.x < 0 ? 'h3000' : 'h8000', dir: 1, lights: false, x: sd.x, track: 'S', blocks: false, dest: 'NOT IN SERVICE' }));
    if (st.id === 'S1' || st.id === 'S5') this.parked.push(new DH.TrainActor({ id: 'termTrain', s: 15, cars: 6, kind: 'h8000', dir: 1, lights: false, x: 3.8 + 3.8 * 0, track: 'B', blocks: false, xAt: s => (R.trackX('B', s) || 3.8), dest: 'OUT OF SERVICE' }));
    for (const ev of this.events) {
      if (ev.type === 'preceding') {
        const a = new DH.TrainActor({ id: 'freight', kind: 'freight', cars: 16, len: 18 + 15 * 16, s: 5445, dir: 1, lights: true, track: 'A', blocks: true, seed: 3, dest: '' });
        a.xAt = s => { if (a.loop && s > 6700 && s < 7220) return R.trackX('P', s) !== null ? R.trackX('P', s) : 0; if (s >= 4780 && s < 5250 && R.trackX('F', s) !== null) return R.trackX('F', s); return 0; };
        a.script = { phase: 'yard', join: DH.tsec('10:16:20'), stopAt: 6300, waitUntil: null, loopAt: 7100 };
        this.actors.push(a); this.freight = a; ev.fired = true; this.fired.push(ev.id);
      }
      if (ev.type === 'rival') {
        const sg = this.stops[0];
        const a = new DH.TrainActor({ id: 'rival', kind: 'skyliner', cars: 8, s: sg.target - 30, dir: 1, lights: true, track: 'D', blocks: false, dest: 'SKY LINER EXPRESS', xAt: s => (R.trackX('D', s) !== null ? R.trackX('D', s) : 7) });
        a.script = { phase: 'wait', v: 0 };
        this.actors.push(a); this.rival = a; ev.fired = true; this.fired.push(ev.id);
      }
    }
    if (this.o.parkedOthers) for (const p of this.o.parkedOthers) this.actors.push(p);
  }
  _spawnOncoming(ev) {
    const R = this.R, trk = ev.track || (R.trackX('B', this.wrapS(this.s + 1400)) !== null ? 'B' : 'B');
    const s0 = this.s + 1400;
    const a = new DH.TrainActor({ id: 'onc:' + ev.id, kind: ev.kind || 'inner', cars: 6, s: s0, dir: -1, v: 80, lights: true, track: trk, blocks: false, dest: 'HALO LINE INNER', xAt: s => { const x = R.trackX(trk, DH.wrap(s, R.len)); return x === null ? 3.8 : x; } });
    a.script = { phase: 'run', vset: ev.v || 80, whooshed: false }; a.oncoming = true;
    if (ev.type === 'flash') { a.flashEv = ev; a.lights = true; this.flash = { actor: a, state: 'wait', t: 0 }; }
    this.actors.push(a);
  }
  /* ---------- the max score for ranks ---------- */
  _max() {
    if (this.stage.tutorial) return 1;
    const first = this.stops[0].target, last = this.stops[this.stops.length - 1].target, nS = this.stops.length - 1;
    const inRange = s => { const d = this.R.ahead(this.wrapS(first), this.wrapS(s)); return d > 0 && d < last - first; };
    const calls = this.calls.filter(c => c.kind !== 'crossing' && inRange(c.s) && !(c.kind === 'start' && this.stops.some(sp => sp.startSig === c.sig))).length + nS;
    const horns = this.horns.filter(h => inRange(h.s)).length, hazard = this.events.some(e => e.type === 'obstruction') ? 1 : 0, flash = this.events.some(e => e.type === 'flash') ? 1 : 0;
    this.nCalls = calls; this.nHorns = horns;
    const halo = Math.min(99, this.graceStart + nS * 10 + calls * .5 + horns + hazard * 5 + flash * 2);
    return nS * 1800 + calls * 100 + horns * 100 + hazard * 800 + halo * 50 + 500;
  }
  rank() { if (this.stage.tutorial) return 'S'; const f = this.finalScore() / this.maxScore; return f >= .9 ? 'S' : f >= .75 ? 'A' : f >= .55 ? 'B' : f >= .35 ? 'C' : 'D'; }
  finalScore() { return Math.round(this.score + this.grace * 50 + this.comfort * 5); }
  /* ---------- one step ---------- */
  step(dt, c = {}) {
    if (this.phase === 'over' || this.done) { this.clock += dt; this.t += dt; return; }
    const T = DH.T, TR = this.T, nb = TR.nb, np = TR.np;
    this.t += dt; this.clock += dt;
    const sPrev = this.s;
    // 1. the lever
    const moving = this.v > .05;
    const setLi = n => { if (n === this.li) return; const old = this.li; this.li = n; this.emit('sfx', { name: 'clack', d: n - old }); const now = this.t; this.lastNotchChange.push([now, old]); while (this.lastNotchChange.length && now - this.lastNotchChange[0][0] > .4) this.lastNotchChange.shift(); if (moving && this.lastNotchChange.length && Math.abs(n - this.lastNotchChange[0][1]) >= 3) { this.comfortHit(2); this.lastNotchChange.length = 0; } if (n > 0 && old <= 0 && this.pilot) this.notchesSincePilot++; };
    if (c.eb && !this.isEB) { setLi(-nb - 1); this.emit('sfx', { name: 'ebclunk' }); this.ebUsedAt = this.s; this.stats.ebs++; this.comfortHit(15); this._ebJudge(); }
    if (c.power) {
      if (this.isEB) { if (this.v < .05) setLi(-nb); else this.emit('toast', { text: 'EB: STOP FIRST', color: '#ff8a4a' }); }
      else { if (this.li >= 0 && !this.pilot && !this.stage.tutorial) { this.emit('sfx', { name: 'doorsbuzz' }); this.emit('toast', { text: 'DOORS', color: '#ffa040' }); } setLi(Math.min(np, this.li + 1)); }
    }
    if (c.brake) setLi(Math.max(-nb - 1, this.li - 1));
    if (c.neutral && !this.isEB) setLi(0);
    if (this.backup) this.li = -1;
    // 2. dynamics
    const n = this.li, doorsOk = this.pilot && this.doors === 'closed';
    const vabs = Math.abs(this.v);
    let tgtP = 0;
    if (n > 0 && doorsOk && !this.isEB) tgtP = TR.aP[n] * T.accelScale * Math.min(1, TR.vk[n] / Math.max(vabs, 1)) * clamp((TR.vmax - vabs) / 5, 0, 1);
    const bscale = T.brakeScale, aEB = T.ebDecel * TR.aEB / 5;
    let tgtB = this.isEB ? aEB : n < 0 ? TR.bk * (-n) * bscale : 0;
    if (this.phase === 'dwell' && vabs < .05 && n >= 0 && !doorsOk) tgtB = Math.max(tgtB, 1.5);   // the holding brake while the doors are open
    const lagK = T.brakeLag / .7, tA = Math.max(.02, TR.lagA * lagK), tR = Math.max(.02, TR.lagR * lagK), tPw = TR.lagP;
    this.P += (tgtP - this.P) * (1 - Math.exp(-dt / tPw));
    this.B += (tgtB - this.B) * (1 - Math.exp(-dt / (tgtB > this.B ? (this.isEB ? .3 : tA) : tR)));
    const adh = this.rain ? T.adhesionRain : 6.0;
    if (this.slipT > 0) this.slipT -= dt;
    if (this.P > adh && this.slipT <= 0) { this.slipT = .8; this.slip = true; this.stats.slips++; this.comfortHit(3); this.emit('sfx', { name: 'slip' }); this.emit('rumble', { s: .4, t: .3 }); this._rule('firstSlip'); this.tip('slip'); }
    if (this.slipT <= 0) this.slip = false;
    const Pe = this.slipT > 0 ? this.P * .4 : this.P;
    let Be = this.B;
    if (Be > adh && vabs > .5) { Be = adh * .85; if (!this.slide) { this.slide = true; this.stats.slides++; this.comfortHit(3); this.emit('sfx', { name: 'slide' }); this._rule('firstSlide'); } } else if (Be <= adh) this.slide = false;
    this.Pe = Pe; this.Be = Be;
    const res = (.03 + .0005 * vabs + .000012 * vabs * vabs) * T.resistScale;
    const grd = -.0353 * this.R.gradeAt(this.wrapS(this.s)) * T.gradeScale;
    const a0 = Pe + grd - (this.v > .001 ? res : this.v < -.001 ? -res : 0);
    let v1;
    if (Math.abs(this.v) > .001) { const sg = Math.sign(this.v), a = a0 - Be * sg; v1 = this.v + a * dt; if (Math.sign(v1) !== sg) v1 = 0; }
    else if (Math.abs(a0) > Be) v1 = (a0 - Be * Math.sign(a0)) * dt; else v1 = 0;
    if (this.backup) v1 = this.s > this.backup.to + .02 ? -5 : 0;
    const aNow = (v1 - this.v) / dt;
    this.jerk += ((aNow - this.aPrev) / dt - this.jerk) * Math.min(1, dt * 8);
    this.aPrev = aNow; this.a += (aNow - this.a) * Math.min(1, dt * 10);
    const wasMoving = Math.abs(this.v) > .001;
    this.v = Math.min(TR.vmax + 2, v1);
    this.s += this.v / 3.6 * dt;
    this.stats.km += Math.abs(this.v / 3.6 * dt) / 1000;
    // rollback
    if (this.v < -.001 && !this.backup) { if (this.rbStart === null) { this.rbStart = sPrev; this.emit('toast', { text: 'ROLLBACK!', color: '#ff8a4a' }); } }
    else if (this.rbStart !== null && this.v >= 0) { const rb = this.rbStart - this.s; if (rb > 1) { this.addGrace(-2, 'ROLLBACK'); this.comfortHit(5); } this.rbStart = null; }
    const stoppedNow = wasMoving && Math.abs(this.v) <= .001;
    this.stopDecel = stoppedNow ? Be : this.stopDecel;
    // 3. other trains, blocks and aspects
    this._actors(dt);
    this._aspects();
    // 4. ATS, SPAD, speed checks
    this._ats(dt, sPrev, c);
    this._limits(sPrev);
    // 5. events and crossings
    this._events(dt, sPrev, c);
    this._crossings(dt);
    // 6. stations
    if (this.stage.tutorial) this._tutorial(dt, stoppedNow, c); else this._stations(dt, stoppedNow, sPrev, c);
    // 7. calls and horn
    this._calls(dt, c);
    this._horn(dt, c);
    // 8. comfort recovers on smooth running
    this.comfortT += dt; if (this.comfortT >= 8) { this.comfortT = 0; if (this.comfort < 100 && Math.abs(this.v) > 1) this.comfort = Math.min(100, this.comfort + 1); }
    if (this.grace <= 10 && this.grace > 0 && !this.stage.tutorial) this._rule('graceLow');
    this.doorAnim = E.approach(this.doorAnim, this.doors === 'open' ? 1 : 0, dt * 1.2);
    this.prevS = this.s;
  }
  _ebJudge() {
    const hazard = this.cart.active || this.ats.ringing || (this.flashEmergency) || this.stage.tutorial;
    if (!hazard && this.v > 5 && !this.o.cheat) { this.addGrace(-3, 'EMERGENCY'); this.addPts(-200, 'pen'); this.emit('toast', { text: 'EMERGENCY', color: '#ff5a4a' }); this._rule('ebNoHazard'); }
    else this.emit('toast', { text: 'EMERGENCY', color: '#ff5a4a' });
    this.emit('rumble', { s: .8, t: .4 });
  }
  /* ---------- other trains ---------- */
  _actors(dt) {
    const R = this.R;
    for (const a of this.actors) {
      const sc = a.script || {};
      if (a.id === 'freight') {
        if (sc.phase === 'yard' && this.clock >= sc.join) sc.phase = 'run';
        if (sc.phase === 'run') { const d = sc.stopAt - a.s; a.v = Math.max(0, Math.min(a.v + 1.2 * dt, 45, Math.sqrt(2 * 2.5 * 3.6 * Math.max(0, d - 2)) + .3)); if (d < .5 || (a.v < .1 && d < 3)) { a.v = 0; sc.phase = 'held'; sc.waitUntil = this.clock + 40; } }
        if (sc.phase === 'held' && this.clock >= sc.waitUntil) sc.phase = 'loop';
        if (sc.phase === 'loop') { if (a.s > 6780 && !a.loop) a.loop = true; const d = sc.loopAt - a.s; a.v = Math.max(0, Math.min(a.v + 1.2 * dt, 45, Math.sqrt(2 * 2.5 * 3.6 * Math.max(0, d - 2)) + .3)); if (d < .5) { a.v = 0; sc.phase = 'stand'; } }
        if (a.loop && a.rear > 6790) a.blocksOff = true;
        a.s += a.v / 3.6 * dt;
      } else if (a.id === 'rival') {
        const us = this.s;
        if (sc.phase === 'wait' && this.v > 1) { sc.phase = 'lag'; sc.t = 0; }
        if (sc.phase === 'lag') { sc.t += dt; if (sc.t > 5) sc.phase = 'level'; }
        if (sc.phase === 'level') { const want = this.v + clamp((us - 4 - a.s) * .8, -8, 12); a.v = E.approach(a.v, Math.max(0, want), 3 * dt); if (R.ahead(12100, DH.wrap(us, R.len)) > 700) sc.phase = 'ahead'; }
        if (sc.phase === 'ahead') { const tgt = this.stops[this.stops.length - 1].target + 10, d = tgt - a.s; const vmax = Math.min(95, Math.sqrt(Math.max(0, 2 * 3 * 3.6 * (d - 1)))); a.v = E.approach(a.v, vmax, 2.5 * dt); if (d < 1) { a.v = 0; sc.phase = 'koen'; a.doorOpen = 1; } }
        a.s += a.v / 3.6 * dt;
      } else if (a.oncoming) {
        a.v = sc.vset; a.s -= a.v / 3.6 * dt;
        if (!sc.whooshed && a.s < this.s + 5) { sc.whooshed = true; this.emit('whoosh', {}); this.emit('shake', { n: 2 }); }
        if (this.flash && this.flash.actor === a) {
          const d = a.s - this.s;
          if (this.flash.state === 'wait' && d < 520) { this.flash.state = 'flashing'; this.flash.t = 0; a.flash = true; this.emit('sfx', { name: 'toot' }); this.tip('flash'); }
          if (this.flash.state === 'flashing') { this.flash.t += dt; a.flash = Math.floor(this.flash.t * 4) % 2 === 0; if (this.hornDown) { this.flash.state = 'answered'; a.flash = false; this.addGrace(2, 'ANSWERED'); this.addPts(200, 'calls'); this.emit('toast', { text: 'HORN ANSWERED +2', color: '#ffd84a' }); this._rule('flashOk'); } else if (this.flash.t > 4) { this.flash.state = 'missed'; a.flash = false; } }
        }
        if (a.s < this.s - 400) a.gone = true;
      }
    }
    this.actors = this.actors.filter(a => !a.gone);
  }
  /* ---------- blocks and aspects ---------- */
  _aspects() {
    const sigs = this.sigs, n = sigs.length, R = this.R; if (!n) return;
    const occ = new Uint8Array(n);
    for (const a of this.actors) {
      if (!a.blocks || a.blocksOff || a.track !== this.track) continue;
      const f = DH.wrap(a.dir > 0 ? a.s : a.rear, R.len), r = DH.wrap(a.dir > 0 ? a.rear : a.s, R.len);
      const lim = a.loop ? 6780 : null;
      for (let i = 0; i < n; i++) {
        const lo = sigs[i].s, hi = i + 1 < n ? sigs[i + 1].s : (R.loop ? sigs[0].s + R.len : R.len + 1e6);
        let hitAny = false;
        for (const off of R.loop ? [0, -R.len, R.len] : [0]) { const ff = (lim !== null ? Math.min(a.s, lim) : f) + off, rr = r + off; if (ff >= lo && rr < hi) hitAny = true; }
        if (hitAny) occ[i] = 1;
      }
    }
    for (let i = 0; i < n; i++) {
      const sg = sigs[i];
      let clear = 0; for (let j = 0; j < 3; j++) { const k = R.loop ? (i + j) % n : i + j; if (k >= n) { clear++; continue; } if (occ[k]) break; clear++; }
      let asp = clear === 0 ? 'R' : clear === 1 ? 'Y' : clear === 2 ? 'YG' : 'G';
      if (sg.held) asp = 'R';
      if (sg.forced && asp !== 'R') asp = sg.forced;
      if (this.force[sg.id]) asp = this.force[sg.id];
      sg.aspect = asp;
    }
    this.blockOcc = occ;
    // sighting
    const sd = this.sightDist();
    for (const sg of sigs) { const d = this.dTo(sg.s); sg.sighted = d > -20 && d < sd && !(this.R.flagAt(sg.s) & 1 && !(this.R.flagAt(this.wrapS(this.s)) & 1) && d > 120); sg.fogBoost = this.fogActive ? 1 : 0; }
  }
  nextSignals(k = 3) { const out = []; for (const sg of this.sigs) { const d = this.dTo(sg.s); if (d > -2 && d < 3000) out.push({ sg, d }); } out.sort((a, b) => a.d - b.d); return out.slice(0, k); }
  /* ---------- ATS: the bell at a red signal's beacon, confirm in time or it brakes; SPAD ---------- */
  _ats(dt, sPrev, c) {
    const A = this.ats;
    for (const sg of this.sigs) {
      const isOurStart = this.stops.some(sp => sp.startSig === sg && !this.passes.some(p => p.st === sp.st));
      const b = sg.s - 600, d0 = this.R.ahead(this.wrapS(sPrev), this.wrapS(b)), d1 = this.R.ahead(this.wrapS(this.s), this.wrapS(b));
      if (!isOurStart && sg.kind !== 'shunt' && sg.look !== 'shunt' && d0 > 0 && d1 <= 0 && d0 < 50 && sg.aspect === 'R') { A.ringing = true; A.t = 0; A.confirmed = false; A.sig = sg; this.emit('ats', { on: true }); this._rule('firstAts'); this.tip('ats'); }
      // SPAD: the front crosses a red signal
      const e0 = this.R.ahead(this.wrapS(sPrev), this.wrapS(sg.s)), e1 = this.R.ahead(this.wrapS(this.s), this.wrapS(sg.s));
      if (e0 > 0 && e1 <= 0 && e0 < 50) {
        this.lastSig = sg; this.lastAspect = sg.aspect;
        if (sg.aspect === 'Y' || sg.aspect === 'YY') this._rule('firstYellow');
        if (sg.aspect === 'R' && !this.o.cheat) { this.li = -this.T.nb - 1; this.stats.spad++; this.addGrace(-20, 'SPAD'); this.addPts(-1000, 'pen'); this.emit('banner', { text: 'SIGNAL PASSED AT DANGER', color: '#ff3a3a' }); this.emit('sfx', { name: 'ebclunk' }); this._rule('spad'); this.ebUsedAt = this.s; }
      }
    }
    if (A.ringing && !A.confirmed) {
      A.t += dt;
      if (c.ats) { A.confirmed = true; A.chime = true; this.emit('ats', { on: false, confirmed: true }); this.emit('toast', { text: 'ATS CONFIRMED', color: '#6aee7a' }); }
      else if (A.t > DH.T.atsTime) { A.ringing = false; this.li = -this.T.nb - 1; this.ebUsedAt = this.s; this.stats.ebs++; if (!this.o.cheat) { this.addGrace(-10, 'ATS'); this.addPts(-500, 'pen'); } this.emit('banner', { text: 'ATS EMERGENCY BRAKE', color: '#ff3a3a' }); this.emit('ats', { on: false }); this.emit('sfx', { name: 'ebclunk' }); }
    }
    if (A.confirmed && A.chime) { if (this.v < 15 || !A.sig || A.sig.aspect !== 'R') { A.chime = false; A.ringing = false; this.emit('ats', { on: false, done: true }); } }
    else if (c.ats && !A.ringing) { /* a confirm with nothing ringing: the button still clicks */ }
  }
  /* ---------- speed limits ---------- */
  limitNow() {
    const R = this.R, f = this.wrapS(this.s), r = this.wrapS(this.rear);
    let v = Math.min(R.lineAt(f), R.lineAt(r), this.T.vmax), why = 'line';
    for (const l of this.limits) if (l.state === 'active' && l.v < v) { v = l.v; why = l.slow ? 'slow' : 'board'; }
    if (this.lastAspect && ASPECT_V[this.lastAspect] < v && this.lastAspect !== 'R') { v = ASPECT_V[this.lastAspect]; why = 'signal'; }
    return { v, why };
  }
  nextLimit() {
    let best = null;
    for (const l of this.limits) { if (l.state !== 'idle') continue; const d = this.dTo(l.s); if (d > 0 && d < 1500 && (!best || d < best.d)) best = { v: l.v, d }; }
    return best;
  }
  _limits(sPrev) {
    for (const l of this.limits) {
      const d0 = this.R.ahead(this.wrapS(sPrev), this.wrapS(l.s)), d1 = this.dTo(l.s);
      if (l.state === 'idle' && d0 > 0 && d1 <= 0 && d0 < 50) {
        l.state = 'active'; this.tip('limit');
        if (this.v > l.v + 10 && !this.o.cheat) { this.li = -this.T.nb - 1; this.ebUsedAt = this.s; this.emit('banner', { text: 'ATS SPEED CHECK', color: '#ff3a3a' }); this.addGrace(-5, 'ATS'); }
      }
      if (l.state === 'active' && l.until !== null) { const u = this.R.ahead(this.wrapS(this.rear), this.wrapS(l.until)); if (u <= 0 && u > -60) l.state = 'past'; }
      if (l.state === 'active' && l.until === null) l.state = 'past';
      if (l.state === 'past' && this.dTo(l.s) > 100 && this.R.loop) l.state = this.dTo(l.s) < 3000 ? 'idle' : 'past';
    }
    const lim = this.limitNow(), tol = DH.T.limitTol;
    if (this.v > lim.v + tol) {
      const key = lim.why + ':' + lim.v;
      if (!this.violation || this.violation.key !== key) {
        this.violation = { key, peak: this.v, v: lim.v };
        if (!this.o.cheat) { this.addGrace(-2, 'LIMIT'); this.addPts(-300, 'pen'); }
        this.emit('toast', { text: 'LIMIT!', color: '#ff5a4a' }); this._rule('limit'); this.emit('sfx', { name: 'warn' });
      } else if (this.v > this.violation.peak) {
        const steps = Math.floor((this.v - lim.v - tol) / 5) - Math.floor((this.violation.peak - lim.v - tol) / 5);
        if (steps > 0 && !this.o.cheat) this.addGrace(-steps, 'LIMIT');
        this.violation.peak = this.v;
      }
    } else if (this.violation && this.v < lim.v) this.violation = null;
    // a curve taken too fast also spills the coffee
    if (lim.why === 'board' && this.v > lim.v + 5) this.comfortHit(5 / 120);
  }
  /* ---------- events ---------- */
  _events(dt, sPrev, c) {
    const s = this.s;
    for (const ev of this.events) {
      if (ev.fired) continue;
      if (ev.at !== undefined && typeof ev.at === 'number') {
        const d0 = this.R.ahead(this.wrapS(sPrev), this.wrapS(ev.at)), d1 = this.dTo(ev.at);
        if (!(d0 > 0 && d1 <= 0 && d0 < 60)) continue;
      } else if (!['festival', 'workers', 'kota', 'fuji', 'doorRush', 'finale', 'glare', 'fog'].includes(ev.type)) continue;
      if (['kota', 'fuji', 'doorRush', 'finale'].includes(ev.type)) continue;   // these fire from the station logic
      ev.fired = true; this.fired.push(ev.id);
      switch (ev.type) {
        case 'radio': this._say(ev.who, ev.line); break;
        case 'tip': this.tip(ev.tip); break;
        case 'oncoming': case 'flash': this._spawnOncoming(ev); break;
        case 'festival': this.festival = true; this._rule('festival'); break;
        case 'workers': this.workers = this.R.workers[0] || null; break;
        case 'obstruction': { const cr = this.R.crossings.find(q => q.id === ev.crossing); this.cart.active = true; this.cart.crossing = cr; cr.blocked = true; for (const em of this.R.emitters) if (em.crossing === ev.crossing) em.flashing = true; this.emit('sfx', { name: 'alarm' }); this._rule('hazard'); this.tip('obstruction'); break; }
        case 'fog': this.fog = { from: ev.from, to: ev.to }; break;
        case 'glare': this.glare = { from: ev.from, to: ev.to }; break;
      }
    }
    if (this.fog) { const a = this.dTo(this.fog.from), b = this.dTo(this.fog.to); this.fogActive = a < 150 && b > -50; } else this.fogActive = false;
    this.glareOn = !!(this.glare && this.dTo(this.glare.from) <= 0 && this.dTo(this.glare.to) > 0);
    // the obstruction: stop before the crossing; it clears 12 s after we stop
    const K = this.cart;
    if (K.active && K.crossing) {
      const d = this.dTo(K.crossing.s);
      if (Math.abs(this.v) < .01 && d > 0 && d < 400) { K.stoppedT += dt; if (K.stoppedT > 12) { K.active = false; K.cleared = true; K.crossing.blocked = false; for (const em of this.R.emitters) em.flashing = false; this.addGrace(5, 'HAZARD'); this.addPts(800, 'calls'); this.emit('banner', { text: 'HAZARD AVOIDED', color: '#6aee7a' }); this._rule('hazardOk'); this.stats.hazard = true; this.emit('sfx', { name: 'jingle_good' }); } }
      if (d <= 0) { K.active = false; K.hit = true; K.crossing.blocked = false; for (const em of this.R.emitters) em.flashing = false; this.addGrace(-15, 'HAZARD'); this.addPts(-800, 'pen'); this.comfortHit(30); this.emit('banner', { text: 'HAZARD!', color: '#ff3a3a' }); this.emit('shake', { n: 6 }); this.emit('sfx', { name: 'crash' }); }
    }
    // workers: the horn makes them wave; passing under the limit, they bow
    if (this.workers) { const d = this.dTo(this.workers.lookout); if (d < 350 && d > -320 && this.hornDown && !this.workersWave) { this.workersWave = 1; this._rule('workersWave'); } }
  }
  _crossings(dt) {
    for (const cr of this.R.crossings) {
      const d = this.dTo(cr.s), eta = this.v > 1 ? d / (this.v / 3.6) : 1e9, rearPast = this.dTo(cr.s + cr.road) < -this.len - 2;
      const want = (d > -this.len - cr.road - 2 && d < 500 && (eta < 25 || d < 150)) && !rearPast;
      if (want && !cr.warn) { cr.warn = true; cr.downT = 0; }
      if (!want && cr.warn && (rearPast || d > 520)) cr.warn = false;
      cr.downT = (cr.downT || 0) + (cr.warn ? dt : 0);
      cr.gate = E.approach(cr.gate, cr.warn && cr.downT > 4 ? 1 : 0, dt / 3);
    }
  }
  /* ---------- stations ---------- */
  _dwellPlan(sp, t0) {
    const T = DH.T, dep = sp.dep !== null ? sp.dep : t0 + T.dwell;
    let pilotAt = Math.max(dep - 3, t0 + T.dwell, t0 + 14);
    return { sp, t0, pilotAt, closeAt: pilotAt - 2.5, melodyAt: pilotAt - 2.5 - 1.5 - 7, annAt: pilotAt - 4, opened: false, phase: 'arrive', melodied: false, announced: false, closed: false, buzzed: false, piloted: false, cleared: false, rush: false };
  }
  _stations(dt, stoppedNow, sPrev, c) {
    const sp = this.nextStop;
    // the dwell sequence
    if (this.phase === 'dwell' && this.dw) this._dwell(dt);
    if (this.phase === 'end') { this.endT = (this.endT || 0) + dt; if (this.endT > (this.stage.finale ? 1.5 : 3.5) && !this.done) { this.done = true; this.emit('stageEnd', { ok: true }); } return; }
    if (!sp) return;
    const d = sp.target - this.s;
    if (d < 600 && !sp.approached) { sp.approached = true; this.emit('approach', { st: sp.st }); if (this.stopIdx === 1) this.tip('stop'); if (this.cars >= 10) this.tip('ten'); }
    // a passing station: a stop there is a wrong stop
    for (const p of this.passes) { const pd = p.target - this.s; if (!p.done && stoppedNow && Math.abs(pd) < 50) { p.done = true; this.addGrace(-5, 'WRONG STOP'); this.emit('judge', { label: 'WRONG STOP', color: JUDGE_COL['WRONG STOP'], items: [] }); } }
    // the back-up crawl after an over-the-mark
    if (this.backup) { if (this.s <= this.backup.to + .02 && Math.abs(this.v) < .01) { this.s = this.backup.to; this.backup = false; this._judge(sp, 0, true); } return; }
    // missed: past the mark by more than 50 m while moving
    if (this.phase === 'run' && -d > 50 && this.v > .5) {
      this.addGrace(-10, 'MISSED STOP'); this.emit('judge', { label: 'MISSED STOP', color: JUDGE_COL['MISSED STOP'], items: [] });
      sp.judged = true; sp.missed = true;
      if (this.stopIdx >= this.stops.length - 1) { this.phase = 'end'; } else { this.stopIdx++; }
      return;
    }
    // creeping up after a short stop
    if (this.short) { this.short.t += dt; if (Math.abs(this.v) > .3) this.short.moved = true; if (!this.short.moved && this.short.t > 6) { const err = this.s - sp.target; this.short = null; this._judge(sp, err, false, 'SHORT'); return; } }
    if (stoppedNow && this.phase === 'run' && Math.abs(d) <= 50) {
      const err = this.s - sp.target, win = DH.T.stopWindow * this.diff.win;
      if (this.short) { this.restops++; this.addGrace(-1, 'RE-STOP'); }
      if (err < -1 * win && err >= -5 * win) {
        if (!this.short) { this.short = { t: 0, moved: false }; this.emit('toast', { text: 'SHORT ' + (-err).toFixed(1) + ' m: CREEP UP', color: '#ffa040' }); this.emit('stopcam', { err, label: 'SHORT', sp, prelim: true }); return; }
        if (this.short && this.short.t > 6) { this.short = null; this._judge(sp, err, false, 'SHORT'); return; }
        this.short.moved = false; this.short.t = Math.min(this.short.t, 6); return;
      }
      if (err < -5 * win) { this.emit('toast', { text: 'MOVE UP ' + (-err).toFixed(1) + ' m', color: '#ffa040' }); this.short = null; return; }
      this.short = null;
      this._judge(sp, err, false);
    }
  }
  _judge(sp, err, afterBackup, forced) {
    const T = DH.T, win = T.stopWindow * this.diff.win, items = [];
    let label, dg = 0, pts = 0;
    const a = Math.abs(err);
    if (forced === 'SHORT') { label = 'SHORT'; dg = -Math.round(a); }
    else if (afterBackup) { label = 'OK'; pts = 200; }
    else if (err > 5 * win) { label = 'OVER THE MARK'; dg = -10; pts = -300; this.stats.overruns++; this.backup = { to: sp.target }; this.emit('judge', { label, color: JUDGE_COL[label], err, items: [['-10 s', '#ff5a4a']] }); this.addGrace(-10, 'OVER'); this.addPts(-300, 'pen'); this.emit('sfx', { name: 'jingle_bad' }); this._rule('overrun'); return; }
    else if (err > 1 * win) { label = 'OVERRUN!'; dg = -T.overrunCost * a; this.stats.overruns++; this._rule('overrun'); }
    else if (a <= .1 * win) { label = 'PERFECT HALO!'; dg = 5; pts = 1000; this.stats.perfect++; }
    else if (a <= .3 * win) { label = 'GREAT!'; dg = 3; pts = 700; }
    else if (a <= .7 * win) { label = 'GOOD'; dg = 1; pts = 400; }
    else { label = 'OK'; pts = 200; }
    sp.judged = true; sp.err = err; sp.label = label;
    this.stats.stopErr.push(err); this.stats.judged.push(label);
    this.lastJudgment = { label, err, station: sp.id };
    if (dg) items.push([(dg > 0 ? '+' : '') + (Math.round(dg * 10) / 10) + ' s', dg > 0 ? '#ffd84a' : '#ff5a4a']);
    this.addGrace(dg, label); if (pts) this.addPts(pts, pts > 0 ? 'stops' : 'pen');
    // arrival time
    const extra = [];
    if (sp.arr !== null) {
      const late = this.clock - sp.arr, w = T.onTimeWindow;
      if (Math.abs(late) <= w) { extra.push(['ON TIME!', JUDGE_COL['ON TIME!']]); this.addGrace(3, 'ON TIME'); this.addPts(500, 'punct'); this.stats.ontime++; sp.ontime = true; }
      else if (late > w) { const n = Math.round(late - w); extra.push(['LATE +' + Math.round(late), '#ff5a4a']); this.addGrace(-n * T.lateCost, 'LATE'); this._rule('late'); }
      else { extra.push(['EARLY ' + Math.round(-late) + ' s', JUDGE_COL.EARLY]); this.addPts(100, 'punct'); this._rule('early'); }
      sp.late = late;
    }
    // a smooth stop: eased off at the end, no emergency brake in the last 100 m
    const smooth = (this.stopDecel || 9) <= 1.0 && this.s - this.ebUsedAt > 100 && !afterBackup;
    if (smooth) { extra.push(['SMOOTH!', JUDGE_COL['SMOOTH!']]); this.addGrace(2, 'SMOOTH'); this.addPts(300, 'smooth'); this.stats.smooth++; sp.smooth = true; }
    else if ((this.stopDecel || 0) > 2.0) this.comfortHit(8);
    this.emit('judge', { label, color: JUDGE_COL[label] || '#fff', err, items: items.concat(extra), station: sp.id });
    this.emit('sfx', { name: label === 'PERFECT HALO!' ? 'jingle_perfect' : label === 'GREAT!' ? 'jingle_great' : label === 'GOOD' || label === 'OK' ? 'jingle_good' : 'jingle_bad' });
    if (label === 'PERFECT HALO!') { this.emit('rumble', { s: .3, t: .2 }); this._rule('perfect'); }
    this.emit('stopcam', { err, label, sp });
    // doors open on the platform side, then the dwell (or the end)
    this.phase = 'dwell'; this.li = Math.min(this.li, -1);
    this.dw = this._dwellPlan(sp, this.clock);
    if (this.stopIdx >= this.stops.length - 1) this.dw.last = true;
    for (const ev of this.events) if (!ev.fired && ev.station === sp.id && ['kota', 'fuji', 'doorRush', 'finale'].includes(ev.type)) { ev.fired = true; this.fired.push(ev.id); this.dw[ev.type] = true; }
  }
  _dwell(dt) {
    const w = this.dw, now = this.clock;
    if (!w.opened && now >= w.t0 + 1) { w.opened = true; this.doors = 'open'; this.pilot = false; this.emit('doors', { open: true, side: w.sp.st.doorSide }); this.emit('sfx', { name: 'doorchime' });
      if (w.kota) { this._rule('kota'); this._rule('kota2'); }
      if (w.fuji) this._rule('fuji');
    }
    if (w.last) { if (w.opened && !w.ended) { w.ended = true; this.phase = 'end'; this.endT = 0; if (w.finale) this.emit('finale', {}); } return; }
    if (w.doorRush && !w.rush && now >= w.melodyAt + 3) { w.rush = true; w.pilotAt += 8; w.closeAt += 8; w.annAt += 8; this.emit('doorRush', {}); this._rule('doorRush'); this._rule('doorRush2'); this._rule('doorRush3'); this.emit('sfx', { name: 'doorchime' }); this.stats.rush = true; }
    if (!w.melodied && now >= w.melodyAt) { w.melodied = true; this.emit('melody', { station: w.sp.st.melody || w.sp.id }); }
    if (!w.announced && now >= w.annAt) { w.announced = true; this._say('mika', 'The doors are closing. Please stand clear.', { soft: true }); }
    if (!w.closed && now >= w.closeAt) { w.closed = true; this.doors = 'closed'; this.emit('doors', { open: false }); this.emit('sfx', { name: 'doorthunk' }); }
    if (!w.buzzed && now >= w.closeAt + 1) { w.buzzed = true; this.emit('sfx', { name: 'buzzer' }); }
    if (!w.piloted && now >= w.pilotAt) {
      w.piloted = true; this.pilot = true; this.emit('sfx', { name: 'pilot' }); this.emit('pilot', {});
      if (w.sp.startSig) w.sp.startSig.held = false;
      this.notchesSincePilot = 0;
      this.depCall = { open: false, sig: w.sp.startSig, t: 0, done: false, sp: w.sp };
      this.checkpoint = this.save();
      this.tip('depart');
    }
    if (this.depCall && !this.depCall.open && !this.depCall.done && w.piloted) {
      const sg = this.depCall.sig;
      if (!sg || sg.aspect !== 'R') { this.depCall.open = true; this.depCall.t = 0; w.cleared = true; this.emit('clear', {}); }
    }
    if (w.piloted && this.v > .5) { this.phase = 'run'; this.stopIdx++; this.dw = null; }
  }
  /* ---------- the tutorial (S0) ---------- */
  _tutorial(dt, stoppedNow, c) {
    if (this.phase === 'end') { this.endT = (this.endT || 0) + dt; if (this.endT > 4 && !this.done) { this.done = true; this.emit('stageEnd', { ok: true }); } return; }
    const tut = this.tut, steps = this.stage.steps, st = steps[tut.i]; if (!st) return;
    tut.t += dt;
    const next = () => { tut.i++; tut.t = 0; this.emit('sfx', { name: 'jingle_good' }); const ns = steps[tut.i]; if (ns) { this._say('hoshino', ns.line); this.emit('tutStep', { i: tut.i }); if (ns.id === 'call') { const d2 = this.sigs.find(q => q.id === 'D-2'); if (d2) d2.held = false; this.depCall = { open: true, sig: d2, t: 0, done: false, tut: true }; } } else { for (const l of this.stage.pass) this._say(l[0], l[1]); this.phase = 'end'; this.endT = 0; this.emit('certificate', {}); } };
    const markJudge = (sp) => { const err = this.s - sp.target, a = Math.abs(err); const label = a <= .1 ? 'PERFECT HALO!' : a <= .3 ? 'GREAT!' : a <= .7 ? 'GOOD' : a <= 1 ? 'OK' : err > 0 ? 'OVERRUN!' : 'SHORT'; this.emit('judge', { label, color: JUDGE_COL[label], err, items: [] }); this.emit('stopcam', { err, label, sp }); this.lastJudgment = { label, err }; if (label === 'PERFECT HALO!') this.stats.perfect++; this.stats.stopErr.push(err); return { err, label }; };
    switch (st.id) {
      case 'p1': if (this.v >= 10) next(); break;
      case 'coast': if (this.li === 0 && tut.t > .5) next(); break;
      case 'brake': if (this.v < 5 && this.li < 0) next(); break;
      case 'mark1': if (stoppedNow) { const sp = this.stops[0]; if (Math.abs(this.s - sp.target) < 40) { markJudge(sp); next(); } } break;
      case 'call': if (this.depCall && this.depCall.done) { this.depCall = null; next(); } break;
      case 'limit': if (this.v >= 35 && this.dTo(430) < 0) next(); break;
      case 'mark2': if (stoppedNow) { const sp = this.stops[1]; if (Math.abs(this.s - sp.target) < 60) { const j = markJudge(sp); if ((this.stopDecel || 9) <= 1.0) { this.emit('toast', { text: 'SMOOTH!', color: JUDGE_COL['SMOOTH!'] }); this.stats.smooth++; } next(); } } break;
      case 'eb': if (!tut.flags.pulled && this.isEB && this.v > 15) tut.flags.pulled = true; if (tut.flags.pulled && this.v < .01 && !this.isEB) next(); if (tut.flags.pulled && this.v < .01 && this.isEB && !tut.flags.told) { tut.flags.told = true; this.emit('toast', { text: 'RELEASE: LEVER UP', color: '#ffd84a' }); } break;
      case 'mark3': if (stoppedNow) { const sp = this.stops[2]; if (Math.abs(this.s - sp.target) < 60) { const j = markJudge(sp); if (Math.abs(j.err) <= 1) next(); else { this._say('hoshino', 'Again. Back up, and stop on it.'); this.s = sp.target - 120; this.v = 0; this.li = -2; this.B = 1; tut.t = 0; this.emit('reset', {}); } } } break;
    }
  }
  /* ---------- point and call ---------- */
  openCalls() {
    const out = [];
    if (this.depCall && this.depCall.open && !this.depCall.done) out.push({ dep: true, call: this.depCall, d: 0 });
    for (const cl of this.calls) if (cl.state === 'open') out.push({ call: cl, d: this.dTo(cl.s) });
    return out;
  }
  _phrase(cl) {
    const C = DH.CALLS;
    if (cl.kind === 'signal' || cl.kind === 'start') { const a = cl.sig.aspect; if (a === 'G') return cl.sig.kind === 'home' ? C.homeG : cl.kind === 'start' ? C.start : C.blockG; return C[a] || C.R; }
    if (cl.kind === 'limit') return C.limit(cl.v);
    if (cl.kind === 'approach') return cl.st.passing ? C.pass : C.approach;
    if (cl.kind === 'crossing') return C.crossing;
    return C.blockG;
  }
  makeCall(target, auto) {
    const T = DH.T;
    if (target.dep) {
      const dc = target.call; dc.done = true; dc.open = false;
      const great = this.notchesSincePilot === 0 || dc.tut;
      this.stats.calls++; if (!auto && !dc.tut) { if (great) this.stats.great++; this.addPts(great ? 100 : 50, 'calls'); if (great) this.addGrace(.5, 'CALL'); }
      this.emit('call', { phrase: DH.CALLS.start, grade: auto ? 'AUTO' : great ? 'GREAT' : 'OK', s: dc.sig ? dc.sig.s : this.s + 50, x: dc.sig ? (this.R.trackX(this.track, dc.sig.s) || 0) - 2.4 : -2, y: 5 });
      if (dc.sig) { const cl = this.calls.find(q => q.sig === dc.sig); if (cl) cl.state = 'done'; }
      return;
    }
    const cl = target.call, d = this.dTo(cl.s); cl.state = 'done';
    const great = d >= 60 && d <= T.callGreat;
    const ph = this._phrase(cl);
    this.stats.calls++;
    if (!auto) { if (great) this.stats.great++; this.addPts(great ? 100 : 50, 'calls'); if (great) this.addGrace(.5, 'CALL'); }
    this.emit('call', { phrase: ph, grade: auto ? 'AUTO' : great ? 'GREAT' : 'OK', s: cl.s, x: cl.x, y: cl.y, kind: cl.kind });
  }
  _calls(dt, c) {
    const autoC = (DH.game && DH.game.settings.autoCalls) || this.o.autoCalls;
    for (const cl of this.calls) {
      const d = this.dTo(cl.s);
      if (cl.state === 'wait' && d <= 180 && d > 30) {
        if (cl.kind === 'signal' || cl.kind === 'start') { if (!cl.sig.sighted) continue; if (this.stops.some(sp => sp.startSig === cl.sig && sp.i < this.stopIdx)) { cl.state = 'done'; continue; } if (this.stops.some(sp => sp.startSig === cl.sig && sp.i === this.stopIdx && this.phase === 'dwell')) continue; }
        cl.state = 'open';
      }
      if (cl.state === 'open' && d <= 30) { cl.state = 'missed'; if (cl.kind !== 'crossing') { this.stats.missed++; this._rule('missedCall'); } }
      if (cl.state === 'open' && autoC && d <= 90) this.makeCall({ call: cl }, true);
      if ((cl.state === 'done' || cl.state === 'missed') && this.R.loop && d > 1000 && d < 3000) cl.state = 'wait';
    }
    if (this.depCall && this.depCall.open && !this.depCall.done) {
      this.depCall.t += dt;
      if (autoC) this.makeCall({ dep: true, call: this.depCall }, true);
      else if (this.depCall.t > 15 || (this.depCall.sig && this.dTo(this.depCall.sig.s) < 25)) { this.depCall.open = false; this.depCall.done = true; if (!this.depCall.tut) this.stats.missed++; }
    }
    if (c.call) {
      const open = this.openCalls(); if (!open.length) return;
      let pick = null;
      if (c.callTarget) pick = open.find(o => (o.call.sig && o.call.sig === c.callTarget) || o.call === c.callTarget || (o.call.id && o.call.id === c.callTarget.id));
      if (!pick) pick = open.sort((a, b) => a.d - b.d)[0];
      this.makeCall(pick, false);
    }
  }
  /* ---------- the horn ---------- */
  _horn(dt, c) {
    this.hornDown = !!c.horn;
    for (const h of this.horns) {
      const d = this.R.ahead(this.wrapS(h.s), this.wrapS(this.s));
      const inside = d >= 0 && d <= h.len;
      if (inside && !h.inside) { h.inside = true; h.hold = 0; h.done = false; this.tip('horn'); }
      if (inside && this.hornDown && !h.done) { h.hold += dt; if (h.hold >= .5) { h.done = true; this.addGrace(1, 'HORN'); this.addPts(100, 'calls'); this.stats.horns++; this.emit('toast', { text: 'HORN +1', color: '#ffd84a' }); } }
      if (!inside && h.inside) { h.inside = false; if (!h.done && d > h.len && d < h.len + 50) { if (this.diff.hornMiss) this.addGrace(-1, 'HORN'); this.emit('toast', { text: 'NO HORN', color: '#ffa040' }); } }
    }
  }
  /* ---------- checkpoints ---------- */
  save() {
    const keep = ['s', 'v', 'li', 'P', 'B', 'clock', 't', 'grace', 'score', 'comfort', 'stopIdx', 'phase', 'doors', 'pilot', 'lastAspect', 'ebUsedAt', 'notchesSincePilot', 'workersWave', 'festival', 'restops'];
    const o = {}; for (const k of keep) o[k] = this[k];
    o.pts = Object.assign({}, this.pts); o.stats = JSON.parse(JSON.stringify(this.stats));
    o.stops = this.stops.map(sp => ({ judged: sp.judged, approached: sp.approached, err: sp.err, label: sp.label, ontime: sp.ontime, smooth: sp.smooth, late: sp.late }));
    o.events = this.events.map(e => e.fired); o.fired = this.fired.slice();
    o.calls = this.calls.map(c => c.state); o.limits = this.limits.map(l => l.state); o.horns = this.horns.map(h => [h.inside, h.done, h.hold]);
    o.actors = this.actors.map(a => ({ id: a.id, s: a.s, v: a.v, track: a.track, loop: a.loop, blocksOff: a.blocksOff, script: JSON.parse(JSON.stringify(a.script || {})), doorOpen: a.doorOpen, gone: false }));
    o.held = this.sigs.map(sg => sg.held); o.cart = Object.assign({}, this.cart, { crossing: this.cart.crossing ? this.cart.crossing.id : null });
    o.depCall = this.depCall ? { open: this.depCall.open, done: this.depCall.done, t: this.depCall.t, sig: this.depCall.sig ? this.depCall.sig.id : null } : null;
    o.dw = this.dw ? Object.assign({}, this.dw, { sp: this.dw.sp.i }) : null;
    return JSON.parse(JSON.stringify(o));
  }
  restore(o, continueMode) {
    for (const k in o) if (!['pts', 'stats', 'stops', 'events', 'fired', 'calls', 'limits', 'horns', 'actors', 'held', 'cart', 'depCall', 'dw'].includes(k)) this[k] = o[k];
    this.pts = Object.assign({}, o.pts); this.stats = JSON.parse(JSON.stringify(o.stats));
    o.stops.forEach((q, i) => Object.assign(this.stops[i], q));
    o.events.forEach((f, i) => { this.events[i].fired = f; }); this.fired = o.fired.slice();
    o.calls.forEach((st, i) => { this.calls[i].state = st; }); o.limits.forEach((st, i) => { this.limits[i].state = st; }); o.horns.forEach((h, i) => { this.horns[i].inside = h[0]; this.horns[i].done = h[1]; this.horns[i].hold = h[2]; });
    this.actors = this.actors.filter(a => o.actors.some(q => q.id === a.id));
    for (const q of o.actors) { const a = this.actors.find(x => x.id === q.id); if (a) { Object.assign(a, { s: q.s, v: q.v, track: q.track, loop: q.loop, blocksOff: q.blocksOff, doorOpen: q.doorOpen }); a.script = q.script; } }
    o.held.forEach((h, i) => { this.sigs[i].held = h; });
    const cr = o.cart.crossing ? this.R.crossings.find(q => q.id === o.cart.crossing) : null; this.cart = Object.assign({}, o.cart, { crossing: cr });
    if (cr) cr.blocked = this.cart.active;
    for (const em of this.R.emitters) em.flashing = this.cart.active && em.crossing === (cr && cr.id);
    this.depCall = o.depCall ? { open: o.depCall.open, done: o.depCall.done, t: o.depCall.t, sig: this.sigs.find(sg => sg.id === o.depCall.sig) || null } : null;
    this.dw = o.dw ? Object.assign({}, o.dw, { sp: this.stops[o.dw.sp] }) : null;
    this.overGame = false; this.done = false; this.endT = null; this.backup = false; this.short = null; this.violation = null;
    this.ats = { ringing: false, t: 0, confirmed: false, sig: null, chime: false };
    if (continueMode) { this.grace = this.graceStart; this.score = Math.round(this.score / 2); }
    this.out.length = 0; this.emit('restored', {});
  }
}
DH.Run = Run;
})();
