/* A run (PLAN §7.6): one race object for every mode. Stages and forks, the daylight clock and checkpoints, the start
 * line, the goal, the score and the Bloom chain, rivals, ghosts, per-player cameras for split screen. It reads input
 * (or a bot's intent), steps the sim and emits events on OB.bus; it never draws (51-race-scenes.js does).
 * cfg: { mode, route: { stages, end } | null (the pyramid), car, paint, driver, passenger, outfit, transmission,
 *        rules, rivals, traffic, ghost, players, seed, cheats, bot, clock: seconds | 'up', startline } */
(() => {
'use strict';
const OB = window.OB, E = OB.E, SEG = OB.SEG, W = OB.World, tu = k => OB.tuning[k];
const START_Z = 24 * SEG, GANTRY_Z = 27 * SEG;
const LEVELS = [0, 1000, 3000, 6000, 10000];

class Race {
  constructor(cfg) {
    this.cfg = cfg = Object.assign({ mode: 'arcade', players: 1, seed: 1, traffic: true, startline: true }, cfg);
    this.mode = cfg.mode; this.t = 0; this.raceT = 0; this.phase = 'countdown'; this.cd = cfg.countdown !== undefined ? cfg.countdown : 3.6;
    this.route = cfg.route || null; this.start = this.route ? this.route.stages[0] : (cfg.startStage || 'S1');
    this.cheats = Object.assign({}, OB.cheats, cfg.cheats || {});
    this.traffic = new OB.Traffic({ seed: cfg.seed, hub: cfg.mode === 'hub', mult: cfg.traffic === false ? 0 : typeof cfg.traffic === 'number' ? cfg.traffic : 1 });
    const diff = OB.game && OB.game.settings ? { easy: 1.12, normal: 1, hard: .92 }[OB.game.settings.difficulty] || 1 : 1;
    this.diffK = diff;
    this.clockUp = cfg.clock === 'up'; this.clock = this.clockUp ? 0 : (cfg.clock || tu('startTime') * diff);
    this.objects = []; this.events = []; this.banners = []; this.done = null; this.ghostRec = []; this.ghostT = 0; this.goalT = 0; this.slowT = 0;
    this.players = []; for (let i = 0; i < cfg.players; i++) this.players.push(this._player(i));
    this.rivals = (cfg.rivals || []).map((r, i) => this._rival(r, i));
    this.traffic.activate(this.start, START_Z);
    this.subs = [];
    const on = (n, fn) => this.subs.push(OB.bus.on(n, fn));
    on('*', (d, n) => this._event(n, d || {}));
    this.rules = cfg.rules ? OB.Rules[cfg.rules.kind](cfg.rules, this) : null;
    this.requests = (cfg.mode === 'love' || (cfg.rules && cfg.rules.kind === 'love')) && OB.Requests ? new OB.Requests(this, this.players[0]) : null;
    if (OB.Passenger) for (const P of this.players) OB.Passenger.attach(this, P);
    if (this.rules && this.rules.onStart) this.rules.onStart();
    if (cfg.ghost) this.ghost = { data: cfg.ghost, i: 0 };
    OB.bus.emit('run:start', { mode: this.mode, start: this.start });
    if (!this.cfg.startline) this.cd = Math.min(this.cd, 1.2);
  }
  dispose() { for (const u of this.subs) u(); this.subs = []; if (this.requests && this.requests.dispose) this.requests.dispose(); }
  _player(i) {
    const cfg = this.cfg, pc = (cfg.cars && cfg.cars[i]) || {}, id = 'p' + (i + 1);
    const st = OB.STAGES[this.start], lanes = st.lanes, lane = cfg.players > 1 ? (i === 0 ? 0 : lanes - 1) : Math.floor(lanes / 2), x = -1 + (2 * lane + 1) / lanes;
    const car = new OB.CarSim({ id, model: pc.model || cfg.car || 'orchidea', stage: this.start, z: START_Z, x: cfg.players > 1 ? x : (lanes % 2 ? 0 : -.5), manual: (pc.transmission || cfg.transmission) === 'manual', cheats: this.cheats });
    const P = { i, id, car, paint: pc.paint || cfg.paint, driver: pc.driver || cfg.driver || 'leo', passenger: pc.passenger || cfg.passenger || 'marisol', outfit: pc.outfit !== undefined ? pc.outfit : (cfg.outfit || 0),
      input: OB.game && OB.game.players ? OB.game.players[i] : null, bot: null, cam: { off: 0, mode: (OB.game && OB.game.settings && OB.game.settings.camera) || 'chase' },
      score: 0, bloom: { lvl: 1, pts: 0, idle: 9 }, petals: 0, petalMax: 0, stats: { bestDrift: 0, nearmiss: 0, slip: 0, overtakes: 0, drifts: 0, crashes: 0, bumps: 0, airs: 0 },
      route: '', stages: [this.start], stageT: 0, splits: [], finished: false, finishT: 0, sibling: null, prevStage: null, prevSide: 0, speech: null, pose: null, steerK: 0, place: 1, forkWarned: {}, timeUp: false };
    const b = (cfg.bots && cfg.bots[i]) || (i === 0 && cfg.bot);
    if (b) { P.bot = new OB.Brain(Object.assign({ plan: cfg.plan || null }, b === true ? {} : b)); if (b.seek) P.bot.o.targets = car => this.seek(car); }
    return P;
  }
  _rival(r, i) {
    const cast = OB.CAST[r.who] || OB.CAST.kiki, lanes = OB.STAGES[this.start].lanes;
    const car = new OB.CarSim({ id: 'r' + i, model: (cast.car && cast.car.model) || 'gardenia', stage: this.start, z: START_Z - (i % 2) * 1200 + 600, x: -1 + (2 * ((i + 1) % lanes) + 1) / lanes, cheats: {} });
    car.rival = true; car.topMul = r.top || 1;
    const P = { i, id: car.id, rival: true, who: r.who, name: r.name || cast.name, paint: (cast.car && cast.car.paint) || '#9ae84a', car, bot: new OB.Brain(Object.assign({ plan: this.route ? null : 'L' }, r.brain || {})), cam: { off: 0 }, route: '', stages: [this.start], score: 0, drift: 0, slipPts: 0, petals: 20, out: false, finished: false, finishT: 0, prevStage: null, persona: r };
    return P;
  }
  get p1() { return this.players[0]; }
  /** where a bot aims for the request objects ahead: hit balloons and gnomes, the right side of a cone, the ribbon's
   *  gap, away from bees; slow to a stop in a photo box */
  seek(car) {
    let best = null;
    for (const o of this.objects) {
      if (!o.alive || o.stage !== car.stage || o.hitBy[car.id] && o.want === 'hit' && o.kind !== 'ribbon') continue;
      const dz = o.z - car.z; if (dz < (o.kind === 'cone' ? 120 : o.kind === 'ribbon' ? -600 : -100) || dz > 2600) continue;
      if (o.kind === 'photo' && !(o.box && o.box.done) && !(this.requests && this.requests.cur && this.requests.cur.box && this.requests.cur.box.done)) { if (dz < 2600 && dz > -2 * OB.SEG) { this.p1.bot.o.slow = dz < 120 ? 1 : 55; return { x: 0 }; } }
      let x = null;
      if (o.want === 'hit' && o.kind !== 'photoEnd') x = o.x;
      if (o.kind === 'cone') x = o.x + o.side * .42;
      if (o.want === 'avoid' && dz < 2200) { const arr = dz / Math.max(300, car.v * OB.KMH), fx = o.sway ? o.x0 + Math.sin((o.t + arr) * o.sway[1] + o.sway[2]) * o.sway[0] : o.x; x = fx > 0 ? -.78 : .78; }
      if (x !== null && (!best || dz < best.dz)) best = { x, dz, ignore: o.follow || null, slow: o.kind === 'ribbon' ? 150 : o.kind === 'bee' ? 170 : 0 };
    }
    if (this.p1.bot) this.p1.bot.o.slow = best ? (best.slow || 205) : 0;
    return best;
  }
  /** put a car at a stage and distance (Dev Mode's warp, the attract mode), running */
  teleport(P, stage, z, v = 200, x = 0) {
    const c = P.car; c.stage = stage; c.z = z; c.x = x; c.side = 0; c.v = v; c.crash.t = 0; c.held = false; c.drift.on = false;
    P.prevStage = null; P.sibling = null; P.stages = [stage]; P.forkWarned = {}; this.traffic.activate(stage, z);
    for (const R of this.rivals) { R.car.stage = stage; R.car.z = z + 400 + R.i * 300; R.car.v = v; R.car.held = false; R.stages = [stage]; }
    if (this.phase === 'countdown') { this.phase = 'run'; this.cd = 0; }
    for (const Q of this.players) Q.car.held = false;
  }
  openSide(stage) {
    if (!this.route) return 0;
    const st = this.route.stages, i = st.indexOf(stage); if (i < 0 || i >= st.length - 1) return 0;
    const f = OB.forkOf(stage); return f && f[0] === st[i + 1] ? -1 : 1;
  }
  closedSide(stage) { const o = this.openSide(stage); return o ? -o : (this.route && this.route.stages[this.route.stages.length - 1] === stage ? 0 : 0); }
  isLastStage(stage) { return this.route ? this.route.stages[this.route.stages.length - 1] === stage : OB.STAGES[stage].row === 5; }
  /* ---- a step ---- */
  step(dt) {
    this.t += dt;
    for (const k in OB.cheats) this.cheats[k] = !!(OB.cheats[k] || (this.cfg.cheats || {})[k]);
    const all = this.players.concat(this.rivals.filter(r => !r.out));
    if (this.phase === 'countdown') {
      const was = this.cd; this.cd -= dt;
      for (const P of this.players) { const I = this._intent(P), c = P.car; c.rpm += ((I.gas > .1 ? 1500 + 6800 * I.gas : 1500) - c.rpm) * Math.min(1, dt * 3); c.held = true; }
      for (const R of this.rivals) R.car.held = true;
      for (const n of [3, 2, 1]) if (was > n && this.cd <= n) OB.bus.emit('countdown', { n });
      if (this.cd <= 0) {
        this.phase = 'run'; OB.bus.emit('countdown', { n: 0 }); OB.bus.emit('go', {});
        for (const P of all) { P.car.held = false; if (!P.rival && P.car.rpm >= 6000 && P.car.rpm <= 7400) { P.car.v = 25; P.car.boost = 25; OB.bus.emit('start:perfect', { car: P.id }); } else if (!P.rival && P.car.rpm > 7500) OB.bus.emit('start:spin', { car: P.id }); if (P.rival) P.car.v = 10; }
      }
      this.traffic.step(dt, this.players.map(P => P.car), this.cheats.freezeTraffic);
      return;
    }
    if (this.phase === 'run' || this.phase === 'cruise') this.raceT += dt;
    // players, then rivals: intent, the sim, the road's stages
    for (const P of all) {
      if (P.out) continue;
      const c = P.car, I = (P.finished && !P.rival && this.phase !== 'cruise') || P.timeUp ? { steer: 0, gas: 0, brake: P.timeUp ? .3 : .6 } : this._intent(P);
      if (P.rival) this._rubber(P);
      c.step(dt, I, { traffic: this.cheats.noTraffic ? [] : this.traffic.inStage(c.stage), others: all.map(q => q.car).concat(this.players.length > 1 ? [] : []), race: this });
      this._advance(P, dt);
      if (!P.rival) {
        if (I.horn) { const v = this.traffic.horn(c); OB.bus.emit('horn', { car: P.id, veh: v && v.id }); }
        if (I.camera) { const m = ['chase', 'high', 'bumper']; P.cam.mode = m[(m.indexOf(P.cam.mode) + 1) % 3]; OB.bus.emit('camera', { mode: P.cam.mode }); }
        if (I.radio && P.i === 0) OB.bus.emit('radio:next', {});
        this.traffic.detect(c, (n, d) => OB.bus.emit(n, d));
        if (c.slip > .5) P.stats.slip += dt;
        if (!P.finished) P.stageT += dt;
        // score and the Bloom chain
        if (this.phase === 'run' && !P.finished) { P.score += c.v * 2 * P.bloom.lvl * dt; if (c.drift.on) this._chain(P, dt * Math.abs(c.drift.a) * 900, true); }
        P.bloom.idle += dt;
        if (P.bloom.idle > tu('bloomDecay') && P.bloom.pts > 0) { P.bloom.pts = Math.max(0, P.bloom.pts * (1 - .2 * dt) - 5 * dt); this._level(P); }
        if (P.sibling) P.sibling.alpha = Math.max(0, 1 - Math.max(0, c.z - OB.CAM_H) / (70 * SEG));
      }
    }
    this._places();
    this.traffic.step(dt, this.players.map(P => P.car).concat(this.rivals.filter(r => !r.out).map(r => r.car)), this.cheats.freezeTraffic);
    if (OB.Objects) OB.Objects.step(this, dt);
    if (this.requests) this.requests.step(dt);
    if (this.rules && this.rules.onStep) this.rules.onStep(dt);
    // the ghost: record at 10 Hz
    this.ghostT += dt; if (this.ghostT >= .1 && this.phase === 'run') { this.ghostT -= .1; const c = this.p1.car; if (this.ghostRec.length < 6000) this.ghostRec.push([c.stage, Math.round(c.z), +c.x.toFixed(3), +c.yaw.toFixed(2)]); }
    // the clock
    if (this.phase === 'run') {
      if (this.clockUp) this.clock += dt;
      else if (!this.cheats.infiniteTime) {
        const was = this.clock; this.clock -= dt;
        if (was > 10 && this.clock <= 10) OB.bus.emit('time:low', {});
        if (this.clock <= 0) { this.clock = 0; this._timeUp(); }
      }
      if (this.rules && this.rules.isOver && this.rules.isOver()) this._end('rules');
    }
    if (this.phase === 'goal' || this.phase === 'timeup') { this.goalT += dt; if (this.goalT > (this.phase === 'goal' ? 3.2 : 3.5)) this.done = this.done || { reason: this.phase }; }
  }
  _intent(P) {
    const ctx = () => ({ traffic: this.cheats.noTraffic ? [] : this.traffic.inStage(P.car.stage), others: this.players.map(q => q.car).concat(this.rivals.map(r => r.car)) });
    if (P.bot) return P.bot.intent(P.car, ctx());
    if (this.cheats.autoDrive) { P.auto = P.auto || new OB.Brain({ plan: c => (this.requests && this.requests.pref) || 'L' }); return P.auto.intent(P.car, ctx()); }
    const In = P.input; if (!In) return { steer: 0, gas: 0, brake: 0 };
    const mv = In.move()[0], kb = In.lastDevice !== 'gamepad';
    if (kb) { const tgt = Math.sign(mv) * (Math.abs(mv) > .3 ? 1 : 0), rate = tgt === 0 ? 1 / .08 : 1 / .12; P.steerK += E.clamp(tgt - P.steerK, -rate / 120, rate / 120); }
    else P.steerK = mv;
    const gas = Math.max(In.analog ? In.analog('gas') : (In.down('gas') ? 1 : 0), P.i > 0 && kb && In.down('up') ? 1 : 0);
    const brake = Math.max(In.analog ? In.analog('brake') : (In.down('brake') ? 1 : 0), P.i > 0 && kb && In.down('down') ? 1 : 0);
    return { steer: P.steerK, gas, brake, drift: In.down('drift'), driftPress: In.pressed('drift'), shiftUp: In.pressed('shiftUp'), shiftDown: In.pressed('shiftDown'), horn: In.pressed('horn'), camera: In.pressed('camera'), radio: In.pressed('radio') };
  }
  _rubber(R) {
    const P = this.p1; if (!P) return;
    const lead = this.progress(R) - this.progress(P);
    R.car.topMul = (R.persona.top || 1) * (1 + tu('rivalRubber') * E.clamp(-lead / 16000, -.08, .1));
  }
  /** metres along the run so far (for places and the hub's progress) */
  progress(P) { let d = 0; for (const id of P.stages.slice(0, -1)) d += W.get(id).segs.length * SEG; return d + P.car.z; }
  _places() { const all = this.players.concat(this.rivals.filter(r => !r.out)); const sorted = all.slice().sort((a, b) => (b.finished ? 1e9 - b.finishT : this.progress(b)) - (a.finished ? 1e9 - a.finishT : this.progress(a))); sorted.forEach((P, i) => { P.place = i + 1; }); }
  _advance(P, dt) {
    const c = P.car, S = W.get(c.stage);
    if (S.juncStart >= 0) {
      if (!P.rival && !P.forkWarned[c.stage] && c.z >= (S.juncStart - 130) * SEG) { P.forkWarned[c.stage] = 1; const f = OB.forkOf(c.stage); OB.bus.emit('fork:approach', { car: P.id, left: f[0], right: f[1], closed: this.closedSide(c.stage) }); }
      if (c.z >= S.juncStart * SEG && !P.rival) for (const id of OB.forkOf(c.stage)) this.traffic.activate(id, 0);
      if (!c.side && c.z >= S.decide * SEG) {
        let side = c.x < 0 ? -1 : 1; const open = this.openSide(c.stage);
        if (this.cfg.forceSide) side = this.cfg.forceSide;
        if (open && side !== open && !this.cfg.forceSide) { c.v *= .45; c.x = open * W.spread(S, c.z) - open * .55; c.contacts++; side = open; OB.bus.emit('car:bump', { car: P.id, with: 'barrier' }); }
        if (open) side = open;
        c.side = side; P.route += side < 0 ? 'L' : 'R';
        OB.bus.emit('fork:choose', { car: P.id, side, next: OB.forkOf(c.stage)[side < 0 ? 0 : 1] });
      }
      if (c.z >= S.segs.length * SEG) {
        const side = c.side || (c.x < 0 ? -1 : 1), f = OB.forkOf(c.stage), next = f[side < 0 ? 0 : 1], other = f[side < 0 ? 1 : 0];
        c.z -= S.segs.length * SEG; c.x -= side * OB.SPREAD; c.side = 0; P.prevStage = c.stage; P.prevSide = side; c.stage = next; P.stages.push(next);
        if (!P.rival) { P.sibling = { stage: other, lat: -side * 2 * OB.SPREAD, alpha: 1 }; this._checkpoint(P, next); }
        else OB.bus.emit('rival:checkpoint', { car: P.id, stage: next });
        return;
      }
    }
    // the finish: a sprint arch on a fixed route's last stage, or a goal at the end of row 5
    if (!P.finished) {
      const sprint = this.route && this.route.end === 'sprint' && this.isLastStage(c.stage) && c.z >= (S.len - 2) * SEG;
      const goal = S.goalSeg >= 0 && c.z >= S.goalSeg * SEG;
      if (sprint || goal) this._finish(P, goal ? S.data.goal : null);
    }
  }
  _checkpoint(P, id) {
    const row = OB.STAGES[id].row, bonus = this.clockUp ? 0 : Math.round(tu('checkpointBonus') * this.diffK - (row - 2) * 1);
    if (!this.clockUp && !this.cfg.noBonus) this.clock += bonus;
    P.splits.push(P.stageT); const split = P.stageT; P.stageT = 0;
    OB.bus.emit('checkpoint', { car: P.id, id, bonus: this.clockUp || this.cfg.noBonus ? 0 : bonus, split });
    OB.bus.emit('stage:enter', { car: P.id, id });
  }
  _finish(P, goal) {
    P.finished = true; P.finishT = this.raceT;
    if (P.rival) { OB.bus.emit('rival:finish', { car: P.id }); return; }
    P.splits.push(P.stageT);
    P.goal = goal; P.timeLeft = this.clockUp ? 0 : this.clock;
    if (!this.clockUp) P.score += Math.round(this.clock * 1000);
    if (!this.route) P.score += P.stages.reduce((a, id) => a + OB.STAGES[id].diff * 5000, 0);
    P.score = Math.round(P.score);
    OB.bus.emit('goal', { car: P.id, id: goal, time: this.raceT });
    if (this.players.every(q => q.finished)) { if (this.cfg.cruise) this.phase = 'cruise'; else { this.phase = 'goal'; this.goalT = 0; this.slowT = 1; } }
  }
  _timeUp() {
    if (this.phase !== 'run') return;
    this.phase = 'timeup'; this.goalT = 0;
    for (const P of this.players) if (!P.finished) P.timeUp = true;
    OB.bus.emit('time:up', { stage: this.p1.car.stage });
  }
  _end(reason) { if (this.phase === 'run') { this.phase = 'goal'; this.goalT = 0; for (const P of this.players) if (!P.finished) { P.finished = true; P.finishT = this.raceT; } this.endReason = reason; } }
  _chain(P, pts, quiet) {
    P.bloom.pts = Math.min(LEVELS[4] * 1.4, P.bloom.pts + pts); if (!quiet || pts > 5) P.bloom.idle = 0;
    this._level(P);
  }
  _level(P) {
    let l = 1; for (let i = 1; i < LEVELS.length; i++) if (P.bloom.pts >= LEVELS[i]) l = i + 1;
    if (l !== P.bloom.lvl) { const up = l > P.bloom.lvl; P.bloom.lvl = l; OB.bus.emit('bloom:level', { car: P.id, n: l, up }); if (l === 5 && up) OB.bus.emit('fullbloom', { car: P.id }); }
  }
  _event(n, d) {
    const P = this.players.find(p => p.id === d.car); if (!P) return;
    const lvl = P.bloom.lvl, add = s => { if (this.phase === 'run') P.score += s * lvl; };
    if (n === 'nearmiss') { add(500); P.stats.nearmiss++; this._chain(P, 400); }
    else if (n === 'overtake') { add(100); P.stats.overtakes++; this._chain(P, 120); }
    else if (n === 'slingshot') { add(300); this._chain(P, 300); }
    else if (n === 'drift:end') { add(d.score); P.stats.drifts++; P.stats.bestDrift = Math.max(P.stats.bestDrift, d.score); }
    else if (n === 'car:crash') { P.stats.crashes++; P.bloom.pts *= .5; if (P.bloom.lvl > 1) P.bloom.pts = Math.min(P.bloom.pts, LEVELS[P.bloom.lvl - 2]); this._level(P); }
    else if (n === 'car:bump') P.stats.bumps++;
    else if (n === 'air:land') P.stats.airs++;
    else if (n === 'req:end' && d.rating === 0) this._chain(P, 800);
  }
  /* ---- what a viewport draws ---- */
  view(P, h, depth) {
    const c = P.car, ahead = h * depth; let z = c.z - ahead, stage = c.stage, x = c.x, sibling = P.sibling;
    if (z < 0 && P.prevStage) { const PS = W.get(P.prevStage); z += PS.segs.length * SEG; stage = P.prevStage; x = c.x + P.prevSide * OB.SPREAD; sibling = null; }
    const want = c.vx * .1 + c.drift.a * .35 + c.steerVis * .04;
    P.cam.off += (want - P.cam.off) * .08;
    return { stage, z: Math.max(0, z), x: x - P.cam.off, sibling, closed: this.closedSide(stage) };
  }
  snapshot() {
    const P = this.p1, c = P.car;
    return { phase: this.phase, mode: this.mode, stage: c.stage, seg: Math.floor(c.z / SEG), z: Math.round(c.z), x: +c.x.toFixed(3), v: Math.round(c.v), gear: c.gear, rpm: Math.round(c.rpm), drift: { on: c.drift.on, a: +c.drift.a.toFixed(2), score: Math.round(c.drift.score) },
      slip: +c.slip.toFixed(2), air: c.air > 0, crash: c.crash.t > 0, clock: +this.clock.toFixed(2), score: Math.round(P.score), bloom: { level: P.bloom.lvl, points: Math.round(P.bloom.pts) }, petals: P.petals, petalMax: P.petalMax,
      route: P.route, stages: P.stages.slice(), goal: P.goal || null, finished: P.finished, traffic: this.traffic.list.length, rivals: this.rivals.map(r => ({ id: r.who, stage: r.car.stage, z: Math.round(r.car.z), place: r.place, out: r.out })), place: P.place,
      request: this.requests ? this.requests.snap() : null, raceT: +this.raceT.toFixed(2), side: c.side, contacts: c.contacts, stats: Object.assign({}, P.stats) };
  }
  hash() { const P = this.p1, c = P.car; return [c.stage, Math.round(c.z), c.x.toFixed(2), Math.round(c.v), this.clock.toFixed(1), Math.round(P.score), P.petals].join('|'); }
}
OB.Race = { create: cfg => new Race(cfg), LEVELS, START_Z, GANTRY_Z };
})();
