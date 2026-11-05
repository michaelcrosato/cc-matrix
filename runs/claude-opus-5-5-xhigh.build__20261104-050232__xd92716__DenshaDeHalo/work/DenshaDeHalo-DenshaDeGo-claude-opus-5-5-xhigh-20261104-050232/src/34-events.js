/* 34-events: what happens along a stage, as data: { type, at: { s | clock | dwell (a station id) | start }, ...params }.
 * Each fires once (logged in run.eventsFired). Also always on: every level crossing in the stage (bells when our ETA is
 * under 25 s or we are within 500 m, gates down 4 s later, up once our rear clears), first-time tips, and the
 * tutorial's steps. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, { clamp } = E;
class Events {
  constructor(run) {
    this.run = run; const S = run.stage, R = run.R;
    this.list = (S.events || []).map((e, i) => Object.assign({ i, done: false, id: e.type + ':' + i }, e));
    this.crossings = R.crossings.filter(c => run._inStage(c.s)).map(c => ({ c, s: run.U(c.s) }));
    for (const x of R.crossings) { x.warn = false; x.gate = 1; x.blocked = false; }
    for (const em of R.emitters) em.on = false;
    this.fog = []; this.glare = S.glare ? { s0: run.U(S.glare[0]), s1: run.U(S.glare[1]) } : null; this.obst = null; this.flash = null; this.workers = []; this.crowdK = 1;
    run.fogAt = s => { let f = run.weather === 'fog' ? 1 : 0; for (const z of this.fog) { const e = 120; f = Math.max(f, clamp(Math.min(s - z.s0 + e, z.s1 + e - s) / e, 0, 1) * (z.k || 1)); } return f; };
    run.glareAt = s => { const g = this.glare; if (!g) return 0; return clamp(Math.min(s - g.s0, g.s1 - s) / 80, 0, 1); };
    if (S.tutorial) this.tut = new Tutorial(run);
    run.tut = this.tut;
  }
  save() { return { done: this.list.map(e => e.done), fog: this.fog.slice(), obst: this.obst && Object.assign({}, this.obst), flash: this.flash && Object.assign({}, this.flash), crowdK: this.crowdK }; }
  load(d) { d.done.forEach((v, i) => { this.list[i].done = v; }); this.fog = d.fog.slice(); this.obst = d.obst; this.flash = d.flash; this.crowdK = d.crowdK; }
  fire(e) {
    const run = this.run; e.done = true; run.eventsFired.push(e.type + (e.id && e.type === 'workers' ? '' : '') ); run.emit('event', { e });
    const H = HANDLERS[e.type]; if (H) H.call(this, e, run);
  }
  /** force an event of a type now (Dev Mode: trigger) */
  trigger(type) {
    // a test event acts just ahead of the train: the next crossing for an obstruction, a work site 450 m on
    const run = this.run, nextX = run.R.crossings.map(c => ({ c, d: run.N(c.s) - run.s })).filter(q => q.d > 150).sort((a, b) => a.d - b.d)[0];
    const e = { type, id: type + ':dev', dev: true, at: {}, done: false, track: 'B', livery: 'h8000', cars: 6, v: 80, crossing: nextX ? nextX.c.id : (run.R.crossings.find(c => c.special) || {}).id, lines: [{ who: 'hoshino', text: 'A test. Stay sharp.' }] };
    if (type === 'obstruction' && !run.R.crossings.length) return false;
    if (type === 'doorRush' && !(run.dwell && !run.dwell.done)) { run.emit('toast', { text: 'DOOR RUSH: STOP AT A STATION FIRST' }); return false; }
    if (type === 'ats') { const g = run.sigs.find(q => run.U(q.s) > run.s + 50); if (g) { run._atsRing(g); return true; } return false; }
    this.fire(e); return true;
  }
  step(dt) {
    const run = this.run, s = run.s, ps = run.prevS;
    for (const e of this.list) {
      if (e.done) continue; const a = e.at || {};
      let go = false;
      if (a.start) go = true;
      else if (a.s !== undefined) { const u = run.U(a.s); go = ps < u && s >= u || (s >= u && run.t < .1); }
      else if (a.clock) go = run.clock >= DH.parseClock(a.clock);
      else if (a.dwell) { const d = run.dwell; go = !!(d && !d.done && d.stop.st.id === a.dwell && run.clock >= d.t0 + (e.delay || .5)); }
      if (go) this.fire(e);
    }
    this._crossings(dt); this._obstruction(dt); this._flash(dt); this._workers(dt);
    if (this.tut) this.tut.step(dt);
    this._tips();
  }
  _crossings(dt) {
    const run = this.run, v = Math.max(run.train.v / 3.6, .1);
    for (const X of this.crossings) {
      const c = X.c, d = X.s - run.s, rearPast = run.s - run.len > X.s + c.road + 2;
      const near = d > -run.len - c.road && !rearPast && (d / v < 25 || d < 500);
      if (near && !c.warn) { c.warn = true; c.gateT = 0; run.emit('crossingWarn', { c }); if (!this._xSaid) { this._xSaid = true; run.emit('tip', { id: 'crossing' }); } }
      if (c.warn) { c.gateT += dt; c.gate = clamp(1 - (c.gateT - 4) / 3, 0, 1); }
      if (c.warn && rearPast) { c.warn = false; c.raising = true; }
      if (c.raising) { c.gate = Math.min(1, c.gate + dt / 3); if (c.gate >= 1) c.raising = false; }
      c.dist = d;
    }
  }
  hazardAhead() { const o = this.obst; return !!(o && o.active && o.s - this.run.s < 700); }
  _obstruction(dt) {
    const o = this.obst, run = this.run; if (!o || !o.active) return;
    const d = o.s - run.s;
    if (Math.abs(run.train.v) > 1) o.moved = true;
    if (Math.abs(run.train.v) < .05 && o.moved && d > 0 && d < 1200 && !o.stopped) { o.stopped = true; o.clearT = 0; if (!o.scored) { o.scored = true; run.misc.hazard = true; run.bonus(5, 800, 'HAZARD AVOIDED', 'hazard'); run.emit('hazardAvoided', {}); } }
    if (o.stopped) { o.clearT += dt; if (o.clearT >= 12) { o.active = false; o.c.blocked = false; if (o.em) o.em.on = false; run.emit('obstructionClear', {}); } }
    if (!o.stopped && d < 0) { o.active = false; o.c.blocked = false; if (o.em) o.em.on = false; run.penalty(15, 1000, 'COLLISION', 'collision'); run.train.emergency(run.t); run.camShake = 1.4; run.emit('collision', {}); }
  }
  _flash(dt) {
    const f = this.flash, run = this.run; if (!f || f.done) return;
    f.t += dt; if (f.a) f.a.flash = f.t < 1.2 ? 1 : 0;
    if (run.horn && f.t > .3 && f.t < 4.8) { f.done = true; run.misc.flash = true; run.bonus(2, 200, 'ANSWERED!', 'flash'); run.emit('flashAnswered', {}); }
    else if (f.t >= 4.8) { f.done = true; run.emit('flashMissed', {}); }
  }
  _workers(dt) {
    const run = this.run;
    for (const w of this.workers) {
      const d = w.s - run.s;
      if (!w.warned && d < 420) { w.warned = true; run.emit('workersAhead', { w }); }
      if (run.horn && d < 450 && d > -300) w.waved = true;
      w.slow = run.train.v <= (w.limit || 25) + .5;
      w.state = run.s > w.until + 20 ? 'done' : d < 260 ? (w.waved ? (w.slow && d < 60 ? 'bow' : 'wave') : 'look') : 'work';
    }
  }
  _tips() {
    const run = this.run, tip = id => { if (!run.tips.has(id)) { run.tips.add(id); run.emit('tip', { id }); } };
    if (run.ats.ringing) tip('ats');
    if (run.openCall) tip(run.openCall.kind === 'start' ? 'departCall' : 'call');
    if (run.lastAspect === 'Y' || run.lastAspect === 'YG') tip('yellow');
    if (run.train.st.slipT > 0) tip('slip');
    if (run.train.st.slide) tip('slide');
    if (run.grace <= 10 && !run.frozen) tip('grace');
    const nl = run.nextLimit(); if (nl && nl.d < 300) tip('limit');
    for (const z of run.hornZones) if (!z.done && z.s - run.s < 250 && z.s > run.s) tip('horn');
    const ns = run.nextStop(); if (ns && !ns.pass && ns.dist < 600 && ns.dist > 0) tip('stop');
    if (ns && ns.pass && ns.dist < 600 && ns.dist > 0) tip('pass');
    if (run.dep && !run.dep.called && !run.pilot) tip('pilot');
  }
}
/* ---- event handlers ---- */
const HANDLERS = {
  radio(e, run) { run.emit('radio', { lines: e.lines }); },
  oncoming(e, run) {
    // a train on the other track, 1,400 m ahead, coming at us
    const a = run.addActor({ id: 'oncoming' + e.i, track: e.track || 'B', dir: -1, cars: e.cars || 6, livery: e.livery || 'h8000', s: run.s + (e.ahead || 1400), v: (e.v || 80) / 3.6, blocks: false, removeBehind: 600, legs: [{ vmax: e.v || 80 }] });
    a.passed = false; a.update = (A, dt, R) => { if (!A.passed && R.N(A.s) - DH.trainLength(A.cars) * 0 < R.s) { A.passed = true; R.camShake = Math.max(R.camShake, .5); R.emit('passTrain', { a: A }); } };
  },
  freight(e, run) {
    // S2: the harbour freight joins our track at 5,250, stops with its front at 6,300 for 40 s, then takes the Todai loop
    const a = run.addActor({ id: 'freight', track: 'Y', dir: 1, cars: 13, livery: 'freight', seed: 5, s: 4950, v: 0, blocks: true, lights: true, path: [{ s: -1e9, track: 'Y' }, { s: 5245, track: 'A' }, { s: 6660, track: 'LP' }],
      legs: [{ until: { clock: '10:15:58' } }, { vmax: 45, accel: .5, stopAt: 6300, decel: .5, dwell: 40 }, { vmax: 40, accel: .5, stopAt: 6990, decel: .45 }] });
  },
  rival(e, run) {
    // S4: the Sky Liner on the express track: alongside to 12,800, then away at 95, past Daigaku, first into Koen
    const R0 = run.s;
    const a = run.addActor({ id: 'rival', track: 'C', dir: 1, cars: 6, livery: 'skyliner', s: run.s + 2, v: 0, blocks: false, lights: true, phase: 'wait' });
    a.update = (A, dt, R) => {
      if (A.phase === 'wait') { if (R.dwell && R.dwell.done || R.t > 40) A.phase = 'along'; A.v = 0; return; }
      if (A.phase === 'along') { const tgt = R.s + 14, d = tgt - R.N(A.s); A.v = Math.max(0, Math.min(R.train.v / 3.6 + d * .4, 85 / 3.6)); if (R.s > 12800) { A.phase = 'away'; R.emit('rivalAway', {}); } return; }
      if (A.phase === 'away') { const stop = R.R.stations.find(q => q.id === 'koen').stop[6] + 8, d = R.N(stop) - R.N(A.s), vAllow = Math.sqrt(Math.max(0, 2 * .7 * (d - 1))); A.v = Math.min(A.v + .6 * dt, 95 / 3.6, vAllow); if (d < .5) { A.v = 0; A.phase = 'stand'; A.doors = 1; A.doorSide = 'R'; } }
    };
  },
  doorRush(e, run) {
    const d = run.dwell; if (!d || d.done) return;
    d.rush = { at: Math.max(run.clock + .5, d.closeAt - .3), secs: 8, opened: false, done: false };
    run.emit('radio', { lines: [{ who: 'kenji', text: 'Wait! Wait for me!' }, { who: 'mika', text: 'One moment please! Doors re-opening!' }], delayFirst: Math.max(0, d.closeAt - run.clock - 2) });
    run.emit('kenji', {});
    run.once('depart', () => run.emit('radio', { lines: [{ who: 'hoshino', text: 'Eight seconds. Earn them back. Without speeding.' }] }));
  },
  festival(e, run) { this.crowdK = 2; run.festival = true; run.emit('festival', {}); },
  fog(e, run) { this.fog.push({ s0: run.U(e.s0), s1: run.U(e.s1), k: 1 }); run.emit('fogIn', {}); },
  glare(e, run) { run.emit('glare', {}); },
  obstruction(e, run) {
    const c = run.R.crossings.find(q => q.id === e.crossing); if (!c) return;
    c.blocked = true; const em = c.emitter || null; if (em) em.on = true;
    this.obst = { c, s: e.dev ? run.N(c.s) : run.U(c.s), active: true, stopped: false, em, clearT: 0, moved: !e.dev };   // (from Dev Mode at a standstill: it counts once the train has moved)
    run.emit('obstruction', { c });
    run.emit('radio', { lines: [{ who: 'mika', text: 'The crossing alarm! Something\'s on the tracks!' }] });
    run.once('obstructionClear', () => run.emit('radio', { lines: [{ who: 'hoshino', text: 'The takoyaki survived. So did we.' }] }));
  },
  workers(e, run) {
    let w = e.dev ? null : run.R.workers.find(q => q.id === (e.site || 'WK1'));
    if (!w) {   // a work site ahead (Dev Mode), far enough to brake to 25 from the speed now: the crew and a slow order
      const s0 = run.s + 500 + 8 * run.train.v, until = s0 + 240; w = { id: 'WK-dev', s: s0, until, lookout: s0 - 50, crew: [{ s: s0 + 40, x: -3.4 }, { s: s0 + 100, x: 6.6 }, { s: s0 + 160, x: -3.4 }], dev: true };
      run.extraLimits.push({ id: 'W-dev', s: s0, until, v: 25, track: run.track, slow: true });
    }
    const site = { s: w.dev ? w.s : run.U(w.s), until: w.dev ? w.until : run.U(w.until), limit: 25, lookout: w.dev ? w.lookout : run.U(w.lookout), crew: w.crew, waved: false, state: 'work', src: w };
    this.workers.push(site);
    run.emit('workers', { w, site });
  },
  flash(e, run) {
    // S5: Sato's last train on the other track flashes its headlights for Hoshino; answer with the horn
    const a = run.addActor({ id: 'sato', track: 'B', dir: -1, cars: 6, livery: 'h8000', s: run.s + 900, v: 60 / 3.6, blocks: false, removeBehind: 400, legs: [{ vmax: 60 }] });
    this.flash = { a, t: 0, done: false };
    run.emit('radio', { lines: [{ who: 'hoshino', text: 'That\'s Sato. Thirty years. He\'s flashing for me... Answer him.' }] });
  },
  kota(e, run) { run.kota = true; run.emit('radio', { lines: [{ who: 'kota', text: 'Haro! Haro! Mister driver!' }, { who: 'mika', text: 'Our biggest fan is here again.' }] }); },
  fuji(e, run) { run.fuji = true; },
  finale(e, run) { run.finale = true; run.emit('finaleBow', {}); }
};
DH.EVENT_TYPES = Object.keys(HANDLERS);
/* ---- the tutorial (S0): a step at a time, Hoshino's line, the hint; marks judged without penalty ---- */
class Tutorial {
  constructor(run) {
    this.run = run; this.i = -1; this.t = 0; this.marks = []; this.passed = false; this.retries = 0;
    run.frozen = true; run.phase = 'run'; run.pilot = true; run.doors = 0; run.dwell = null; run.s = run.stage.startS || 10; run.prevS = run.s; run.sEnd = 900;
    this.next();
  }
  get cur() { return DH.TUTORIAL[this.i]; }
  holdShunt(g) { return g.id === 'DP-2' && !(this.i > 4 || (this.i === 4 && this.called)); }
  next() {
    this.i++; this.t = 0; this.stopped = false; this.called = false; this.ebDone = false; const st = this.cur;
    if (!st) { this.passed = true; this.run.finish(); return; }
    this.run.emit('tutStep', { i: this.i, step: st });
    this.run.emit('radio', { lines: [{ who: 'hoshino', text: st.say }], tut: true });
    if (st.call) { this.run.dep = { opened: this.run.t, powered: false, called: false, st: { id: 'depot' } }; }
  }
  step(dt) {
    const run = this.run, st = this.cur; if (!st || this.passed) return; this.t += dt;
    if (this.retryT !== undefined) { this.retryT -= dt; if (this.retryT <= 0) { this.retryT = undefined; run.s = 760; run.prevS = 760; run.train.reset(); } return; }
    if (st.done && st.done(run) && this.t > 1.2) return this.next();
    if (st.stopAt !== undefined) {
      const err = run.s - st.stopAt;
      if (Math.abs(run.train.v) < .01 && run._wasMovingT && Math.abs(err) < 60) {
        run._wasMovingT = false;
        const J = this.judge(err, st);
        if (st.final && Math.abs(err) > 1) { this.retries++; run.emit('judge', J); run.emit('radio', { lines: [{ who: 'hoshino', text: Math.abs(err) > 5 ? 'No. Again. Back down the yard.' : 'Close is not on the mark. Again.' }] }); run.emit('tutRetry', {}); this.retryT = 2.5; return; }
        if (!st.final && Math.abs(err) > 8) { run.emit('radio', { lines: [{ who: 'hoshino', text: err < 0 ? 'Short. Creep up to the board.' : 'Past it. Back off and try again.' }] }); if (err > 0) { run.s = st.stopAt - 80; run.prevS = run.s; run.train.reset(); } return; }
        run.emit('judge', J); this.marks.push(J);
        this.waitNext = 3.2;
      }
      if (Math.abs(run.train.v) > .5) run._wasMovingT = true;
      if (err > 60 && Math.abs(run.train.v) > .5) { run.emit('radio', { lines: [{ who: 'hoshino', text: 'Past it. Stop. We will do it again.' }] }); run.s = st.stopAt - 160; run.prevS = run.s; run.train.reset(); }
    }
    if (this.waitNext !== undefined) { this.waitNext -= dt; if (this.waitNext <= 0) { this.waitNext = undefined; return this.next(); } }
    if (st.call && run.dep && run.dep.missed) { run.dep = { opened: run.t, powered: false, called: false, st: { id: 'depot' } }; run.emit('radio', { lines: [{ who: 'hoshino', text: 'You moved without calling. Point at the signal. Say it.' }] }); }
    if (st.call) { if (run.dep && run.dep.called) { this.called = true; if (this.t > .5 && !this.callDone) { this.callDone = true; this.waitNext = 1.6; } } }
    if (st.eb) { if (run.train.isEB && run.train.v > 3) this.ebDone = true; if (this.ebDone && Math.abs(run.train.v) < .01 && !run.train.isEB) return this.next(); if (this.ebDone && Math.abs(run.train.v) < .01 && run.train.isEB && !this.relSaid) { this.relSaid = true; run.emit('radio', { lines: [{ who: 'hoshino', text: 'Stopped. Now release it: lever up, out of EB.' }] }); } }
  }
  judge(err, st) {
    const a = Math.abs(err), decel = -this.run.train.st.a; let J = null;
    for (const [w, label, sec, pts, key] of DH.JUDGE) if (a <= w) { J = { label, key }; break; }
    if (!J) J = err < 0 ? { label: 'SHORT', key: 'short' } : { label: 'OVERRUN!', key: 'overrun' };
    J.err = err; J.station = 'mark'; J.smooth = decel <= 1.05; J.clock = this.run.clock; J.tut = true; J.time = st.smooth ? (J.smooth ? 'SMOOTH!' : 'NOT SMOOTH') : null;
    return J;
  }
}
DH.Events = Events; DH.Tutorial = Tutorial;
// one-shot listeners on a run
DH.Run.prototype.once = function (type, fn) { const w = (d, r) => { this.handlers[type] = this.handlers[type].filter(f => f !== w); fn(d, r); }; return this.on(type, w); };
})();
