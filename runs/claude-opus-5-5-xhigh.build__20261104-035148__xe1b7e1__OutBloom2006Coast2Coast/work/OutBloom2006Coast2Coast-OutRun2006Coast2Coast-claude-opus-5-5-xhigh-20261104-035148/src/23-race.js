/* OutBloom — a run: one race from a RaceConfig, in every mode. Drivers (players, rivals, the Versus CPU, bots) drive
 * CarSims on stage roads; the daylight clock counts down (or up); each checkpoint extends it; at each fork the side a
 * driver is on picks the next stage, and at the junction's end the race switches to that stage seamlessly; the goal
 * ends the run. Score, the Bloom chain, collisions with traffic and scenery, overtakes and near misses, ghosts and the
 * rules hooks (Love in Bloom, missions) all live here. Drawing reads it and never changes it. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { clamp } = E, SEG = OB.SEG;
const sgn = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const BLOOM_AT = [0, 1000, 3000, 6000, 10000];

class Driver {
  constructor(race, o) {
    Object.assign(this, { race, id: o.id, kind: o.kind, idx: o.idx || 0, input: o.input || null, brain: o.brain || null, name: o.name || o.id, persona: o.persona || null,
      carId: o.car, edition: !!o.edition, paint: o.paint, driver: o.driver || 'leo', passenger: o.passenger || null, outfit: o.outfit || 0, color: o.color || null,
      stage: null, road: null, routeStr: '', routeIdx: 0, decided: false, branch: 0, finished: false, finishTime: null, out: false, place: 1,
      score: 0, bloom: { level: 1, points: 0, lastT: 0 }, petals: 0, stageT0: 0, stageTimes: [], splits: [], intentSt: {}, lastIntent: null, prevZ: 0, checkpoints: 0,
      stats: { bestDrift: 0, nearMisses: 0, overtakes: 0, slipTime: 0, crashes: 0, bumps: 0, drifts: 0, maxSpeed: 0, slingshots: 0, airs: 0, scrapes: 0, offroadT: 0 },
      cam: { lagX: 0, x: 0, mode: o.camera || 'chase' }, skyFrom: null, skyT: 1, otherStrand: null, hornT: 0 });
    const spec = OB.carStats(o.car, o.edition);
    this.car = new OB.CarSim(spec, { transmission: o.transmission || 'auto', driftInput: o.driftInput || 'all', assist: o.assist || 'low', id: o.id, skill: o.skill || 1, isPlayer: o.kind === 'player' });
  }
  relX() { return this.car.x; }
  absX() { return this.branch ? this.branch * this.road.splitAt(this.car.z) + this.car.x : this.car.x; }
  /** progress in route units: stages done and the share of this one */
  progress() { const len = this.road.stageLen * SEG; return this.routeIdx + clamp(this.car.z / len, 0, 1.2); }
  metres() { return Math.round((this.race.distBefore(this) + this.car.z) / 10); }
}

class Race {
  constructor(cfg) {
    this.cfg = cfg = Object.assign({ mode: 'arcade', route: { pyramid: true }, difficulty: 'Normal', traffic: true, players: null, rivals: [], rules: [], seed: 1 }, cfg);
    this.seed = cfg.seed >>> 0; this.visits = {};
    this.mode = cfg.mode; this.t = 0; this.phase = cfg.noIntro ? 'countdown' : 'grid'; if (cfg.rolling) this.phase = 'race'; this.phaseT = 0; this.goStep = null;
    this.clockUp = !!cfg.clockUp || cfg.mode === 'trial' || cfg.mode === 'hub';
    const dk = { Easy: 1.12, Normal: 1, Hard: .92 }[cfg.difficulty] || 1; this.dk = dk;
    this.clock = cfg.startTime !== undefined ? cfg.startTime : OB.tune('startTime') * dk;
    this.traffic = new OB.Traffic(this);
    this.drivers = []; this.events = []; this.rules = []; this.ghosts = []; this.ghostRec = []; this.recT = 0; this.result = null; this.endReason = null;
    this.forkPref = null; this.banner = []; this.finishOrder = []; this.lowWarned = false; this.goalT = 0; this.objects = [];
    OB.World.setMirror(!!cfg.mirror);
    // the route: the pyramid with forks open, or a fixed list of stages (the other branch of each fork closed)
    this.fixed = cfg.route && cfg.route.stages ? cfg.route.stages.slice() : null;
    OB.World.openAll();
    if (this.fixed) for (let i = 0; i < this.fixed.length - 1; i++) { const f = OB.FORKS[this.fixed[i]]; if (f) OB.World.closeBranch(this.fixed[i], f[0] === this.fixed[i + 1] ? -1 : 1); }
    if (this.fixed) { const lastF = OB.FORKS[this.fixed[this.fixed.length - 1]]; if (lastF && cfg.route.sprint) OB.World.closeBranch(this.fixed[this.fixed.length - 1], null); }
    const first = this.fixed ? this.fixed[0] : 'S1';
    // the players
    const pls = cfg.players || [{ car: cfg.car || 'orchidea', edition: cfg.edition, paint: cfg.paint, driver: cfg.driver, passenger: cfg.passenger, outfit: cfg.outfit, transmission: cfg.transmission, bot: cfg.bot, camera: cfg.camera }];
    const startX = pls.length > 1 ? [-.45, .45] : [cfg.startX !== undefined ? cfg.startX : .3];
    pls.forEach((p, i) => {
      const input = p.input || (i === 0 ? OB.game.input : (OB.game.players[i] || null));
      const brain = p.bot ? new OB.Brain(Object.assign({ targets: true }, p.bot === true ? {} : p.bot)) : null;
      const d = new Driver(this, { id: 'p' + (i + 1), kind: 'player', idx: i, input: brain ? null : input, brain, name: p.name || ('P' + (i + 1)), car: p.car || 'orchidea', edition: p.edition, paint: p.paint, driver: p.driver, passenger: p.passenger, outfit: p.outfit,
        transmission: p.transmission || OB.setting('transmission'), driftInput: brain ? 'button' : OB.setting('driftInput'), assist: brain ? 'off' : OB.setting('assist'), camera: p.camera || OB.setting('camera') });
      d.color = p.color || null; d.cpu = !!p.cpu;
      this.place(d, first, (cfg.zStart !== undefined ? cfg.zStart : (first === 'S1' ? 18 : 6)) * SEG + (cfg.zStartUnits || 0), startX[i] || 0);
      this.drivers.push(d);
    });
    // rivals (missions): behind or beside the player on the grid
    (cfg.rivals || []).forEach((r, i) => {
      const P = OB.PERSONAS[r.persona || r]; const per = typeof r === 'string' ? { persona: r } : r;
      const d = new Driver(this, { id: 'r' + (i + 1), kind: 'rival', car: P.car, paint: P.paint, name: P.name, persona: per.persona || r, brain: new OB.Brain(Object.assign({}, P, per.brain || {}, { skill: (P.skill || 1) * OB.tune('rivalSkill') * (per.skill || 1) })), skill: (P.skill || 1) * OB.tune('rivalSkill') * (per.skill || 1), driver: P.rig || 'kiki', transmission: 'auto', assist: 'off', driftInput: 'button' });
      this.place(d, first, ((first === 'S1' ? 18 : 6) - (i % 2 ? 0 : 2.5) - Math.floor(i / 2) * 3) * SEG, i % 2 ? -.45 : .45);
      this.drivers.push(d);
    });
    this.players = this.drivers.filter(d => d.kind === 'player');
    this.p1 = this.players[0];
    // ghosts: the best run for this stage or route, and AI Hub ghosts (added by the hub module)
    if (cfg.ghost) this.ghosts.push({ id: 'best', name: 'BEST', data: cfg.ghost, color: '#ffffff', t: 0 });
    // the rules: Love in Bloom's requests, a mission's rules, the race's own
    for (const r of cfg.rules || []) { const h = typeof r === 'function' ? r(this) : r; if (h) this.rules.push(h); }
    this.requestTargets = d => { const out = []; for (const h of this.rules) if (h.targets) out.push(...h.targets(d)); return out; };
    this.offBus = OB.bus.on('*', (d, name) => this.onEvent(name, d));
    for (const h of this.rules) if (h.onStart) h.onStart(this);
    if (cfg.rolling) for (const d of this.drivers) d.car.v = 210;
    this.traffic.ensure(first, 46000);
    OB.bus.emit('run:start', { mode: this.mode, stage: first });
    OB.bus.emit('stage:enter', { id: first, car: 'p1' });
  }
  visit(id) { return (this.visits[id] = (this.visits[id] || 0) + 1); }
  place(d, stage, z, x) { d.stage = stage; d.road = OB.World.stage(stage); d.car.reset(z, x); d.prevZ = z; d.stageT0 = this.t; d.cam.lagX = x; }
  distBefore(d) { const st = this.fixed || OB.routeStages(d.routeStr); let s = 0; for (let i = 0; i < d.routeIdx && i < st.length; i++) s += OB.World.stage(st[i]).length; return s; }
  /** the open branch at a fork on a fixed route: { side, next } (or null where the forks are open) */
  fixedNext(d) {
    if (!this.fixed) return null; const next = this.fixed[d.routeIdx + 1]; if (!next) return null;
    const f = OB.FORKS[d.stage]; if (!f) return null; return { side: f[0] === next ? -1 : 1, next };
  }
  isLastStage(d) { return this.fixed ? d.routeIdx >= this.fixed.length - 1 : OB.STAGES[d.stage].row === 5; }
  /** the finish on this road for this driver: the goal arch, or a sprint arch at the stage's end */
  finishZ(d) {
    if (!this.isLastStage(d)) return null;
    const r = this.cfg.route || {};
    if (r.end === 'junction' && d.road.junctionAt) return d.road.length - SEG;
    if (r.sprint || !d.road.goalZ) return d.road.sprintZ;
    return d.road.goalZ;
  }
  bonusFor(row) { return OB.tune('checkpointBonus' + row) * this.dk; }
  emit(name, data) { OB.bus.emit(name, data); }
  get running() { return this.phase === 'race'; }

  /* ---- a fixed step ---- */
  step(dt) {
    if (this.phase === 'done') return;
    this.t += dt; this.phaseT += dt;
    // the start: the grid's cutscene, then the countdown (with the rev start); a hub round's GO is the hub's clock
    if (this.phase === 'grid') { if (this.phaseT > (this.cfg.introTime || 2.2) || (this.p1.input && this.p1.input.pressed('confirm') && this.mode !== 'hub')) { this.phase = 'countdown'; this.phaseT = 0; } }
    if (this.phase === 'countdown') {
      const hubT = this.cfg.hubTime ? this.cfg.hubTime() : null, left = hubT !== null ? -hubT / 1000 : 3 - this.phaseT;
      const n = Math.ceil(left);
      if (n !== this.lastCount && n >= 1 && n <= 3) { this.lastCount = n; this.emit('countdown', { n }); }
      for (const d of this.drivers) { const it = this.intentOf(d, dt); d.car.rpm += (1500 + clamp(it.gas, 0, 1) * 6800 - d.car.rpm) * Math.min(1, dt * 5); d.car.started = false; }
      if (left <= 0) {
        this.phase = 'race'; this.phaseT = 0; this.emit('countdown', { n: 0 }); this.emit('go', {});
        for (const d of this.drivers) {
          d.stageT0 = this.t;
          if (d.car.rpm >= 6000 && d.car.rpm <= 7000) { d.car.v = 25; d.perfectStart = true; this.emit('start:perfect', { car: d.id }); }
          else if (d.car.rpm > 7500) d.car.wheelspin = .7;
        }
      }
      for (const h of this.rules) if (h.onStep) h.onStep(this, 0);
      return;
    }
    const racing = this.phase === 'race' || this.phase === 'finish';
    // the drivers
    for (const d of this.drivers) {
      if (d.out) continue;
      const it = (racing && !d.finished) || d.kind !== 'player' ? this.intentOf(d, dt) : { steer: 0, gas: this.phase === 'timeup' ? 0 : .4, brake: this.phase === 'timeup' ? .25 : 0 };
      if (d.finished && d.kind !== 'player') { it.gas = .5; }
      if (this.phase === 'timeup' && d.kind === 'player') { it.gas = 0; it.brake = .3; it.steer = 0; }
      d.lastIntent = it;
      const info = OB.World.info(d.road, d.car.z, d.car.x, d.branch);
      const ahead = this.aheadOf(d);
      const curveAhead = d.road.curveAt(d.car.z + 1800);
      if (d.kind === 'rival') this.rubber(d);
      d.prevZ = d.car.z;
      d.car.step(dt, it, info, (n, data) => this.emit(n, data), { ahead, curveAhead, autoDrift: d.kind === 'player' || !!OB.cheats.autoDrift });
      this.gusts(d, dt);
      this.scenery(d, info);
      this.fork(d);
      this.checkpoint(d);
      if (d.kind === 'player') { d.stats.maxSpeed = Math.max(d.stats.maxSpeed, d.car.v); if (d.car.slip > .5) d.stats.slipTime += dt; if (d.car.offroad) d.stats.offroadT += dt; }
      if (it.horn) { this.traffic.horn(d); this.emit('horn', { car: d.id }); }
      // the finish
      const fz = this.finishZ(d);
      if (fz !== null && !d.finished && d.car.z >= fz && racing) this.finish(d);
      if (d.finished && this.isLastStage(d) && d.car.z > d.road.length - 3 * SEG) { d.car.z = d.road.length - 3 * SEG; d.car.v = 0; }
    }
    // traffic: spawned ahead of everyone, the next stages' too when a fork is in sight
    const keep = new Set();
    for (const d of this.drivers) {
      if (d.out) continue; keep.add(d.stage); this.traffic.ensure(d.stage, d.car.z + 46000);
      if (d.road.junctionAt && d.car.z + 46000 > d.road.length) for (const n of OB.FORKS[d.stage]) { keep.add(n); this.traffic.ensure(n, Math.min(30000, d.car.z + 46000 - d.road.length)); }
      if (d.otherStrand) keep.add(d.otherStrand.stage);
    }
    this.traffic.prune(keep);
    if (!OB.cheats.freezeTraffic) this.traffic.step(dt, this.drivers.filter(d => !d.out));
    this.collisions(dt);
    this.detect();
    // the clock, the score's trickle, the Bloom chain's decay
    if (racing) {
      if (this.phase === 'finish' && !this.players.some(p => !p.finished && !p.out)) { /* everyone in: the clock holds */ }
      else if (this.clockUp) this.clock += dt;
      else if (!OB.cheats.infiniteTime) {
        this.clock -= dt;
        if (this.clock < 10 && !this.lowWarned) { this.lowWarned = true; this.emit('time:low', {}); }
        if (this.clock <= 0) { this.clock = 0; this.timeUp(); }
      }
      this.tickBloom(dt);
      for (const d of this.players) {
        if (d.finished) continue;
        if (this.mode !== 'trial') d.score += d.car.v * 2 * d.bloom.level * dt;
        const B = d.bloom; if (this.t - B.lastT > OB.tune('bloomDecay')) { B.points *= Math.pow(.8, dt); this.bloomLevel(d); }
      }
      // ghosts: player 1 sampled at 10 Hz
      this.recT += dt; if (this.recT >= .1 && !this.p1.finished) { this.recT -= .1; this.ghostRec.push([this.p1.routeIdx, Math.round(this.p1.car.z), +this.p1.absX().toFixed(3), +this.p1.car.yaw.toFixed(3)]); if (this.ghostRec.length > 6000) this.ghostRec.shift(); }
      this.places();
    }
    if (this.phase === 'timeup' && this.phaseT > 3.2) this.end('timeup');
    if (this.phase === 'finish') { this.goalT += dt; if (this.goalT > (this.cfg.finishHold || 2.4) && (this.players.every(p => p.finished || p.out) || this.goalT > (this.cfg.finishWait || 22))) this.end('goal'); }
    for (const h of this.rules) { if (h.onStep) h.onStep(this, dt); if (h.isOver && this.phase === 'race' && h.isOver(this)) { this.end(h.overReason || 'rules'); break; } }
  }
  intentOf(d, dt) {
    if (d.brain) return d.brain.intent(d, this, dt);
    if (OB.cheats.autoDrive && d.kind === 'player' && d.idx === 0) { if (!this.autoBrain) this.autoBrain = new OB.Brain({ targets: true }); return this.autoBrain.intent(d, this, dt); }
    if (!d.input) return { steer: 0, gas: 0, brake: 0 };
    return OB.readIntent(d.input, d.intentSt, dt);
  }
  /** what is ahead of a driver for its slipstream: traffic and the other drivers, dz and dx */
  aheadOf(d) {
    const out = [], z = d.car.z, x = d.absX();
    for (const v of this.traffic.of(d.stage)) { const dz = v.z - z; if (dz > 0 && dz < 3500) out.push({ id: 'v' + v.id, dz: dz - v.len / 2, dx: this.vehAbsX(d.road, v) - x, v: v.v }); }
    for (const o of this.drivers) if (o !== d && !o.out && o.stage === d.stage) { const dz = o.car.z - z; if (dz > 0 && dz < 3500) out.push({ id: o.id, dz, dx: o.absX() - x, v: o.car.v }); }
    return out;
  }
  vehAbsX(road, v) { return v.branch ? v.branch * road.splitAt(v.z) + v.x : v.x; }
  rubber(d) {
    const pl = this.p1; if (!pl) return; const lead = (this.distBefore(d) + d.car.z) - (this.distBefore(pl) + pl.car.z);
    d.car.topMul = 1 + OB.tune('rivalRubber') * clamp(-lead / 16000, -.08, .1);
  }
  gusts(d, dt) {
    for (const g of d.road.events) {
      if (g.kind !== 'gust') continue;
      const key = 'g' + g.z0;
      if (!d['w' + key] && d.car.z > g.z0 - 3500 && d.car.z < g.z0) { d['w' + key] = true; if (d.kind === 'player') this.emit('gust:warn', { car: d.id, dir: g.dir }); }
      if (!d[key] && d.car.z >= g.z0) { d[key] = true; d.car.gust = { t: 0, dir: g.dir }; this.emit('gust', { car: d.id, dir: g.dir }); }
    }
  }
  /** scenery beyond the edge: a spin-out above 110 km/h, else a bump back; the gore's cushions push to the nearer branch */
  scenery(d, info) {
    const car = d.car; if (car.crash || car.invuln > 0 || OB.cheats.noCollide && d.kind === 'player') return;
    for (const t of info.hits) {
      if (t.cushion) { if (car.bumpT <= 0) { const side = info.absX >= 0 ? 1 : -1; car.v *= .75; car.bump(car.v, 0, (n, x) => this.emit(n, Object.assign({ car: d.id }, x)), 'cushion'); car.x += side * .25; car.vx = side * 1.4; } return; }
      if (t.barrier !== undefined) { car.spin('barrier', (n, x) => this.emit(n, Object.assign({ car: d.id }, x)), -t.barrier * this.road0(d)); return; }
      if (Math.abs(info.absX) < .95 && !t.sign) continue;
      if (car.v > 110) { car.spin('scenery', (n, x) => this.emit(n, Object.assign({ car: d.id }, x)), sgn(car.x) * .75); }
      else { car.v *= .5; car.x = sgn(car.x) * .95; car.vx = 0; car.bump(car.v, 0, (n, x) => this.emit(n, Object.assign({ car: d.id }, x)), 'scenery'); }
      return;
    }
  }
  road0() { return 1; }
  /** the fork: the decision point (the side the driver is on), then the seamless switch at the junction's end */
  fork(d) {
    const road = d.road, car = d.car; if (!road.junctionAt || (d.finished && this.isLastStage(d))) return;
    if (!d.approached && car.z > road.junctionAt - 900 * SEG / 4.5 && d.kind === 'player') { d.approached = true; this.emit('fork:approach', { car: d.id, left: OB.FORKS[d.stage][0], right: OB.FORKS[d.stage][1] }); }
    if (!d.decided && car.z >= road.junctionAt && road.splitAt(car.z) >= OB.DECIDE) {
      const abs = car.x, fx = this.fixedNext(d);
      let side = fx ? fx.side : (this.forceSide && d.kind === 'player' ? this.forceSide : (abs < 0 ? -1 : 1));
      d.decided = true; d.branch = side; car.branch = side;
      car.x = abs - side * road.splitAt(car.z);
      if (fx && Math.abs(car.x) > 1.25) { car.x = -side * .9; car.bump(car.v * .8, 0, (n, x) => this.emit(n, Object.assign({ car: d.id }, x)), 'barrier'); }
      d.forkSide = side;
      this.emit('fork:choose', { car: d.id, side, next: OB.FORKS[d.stage][side < 0 ? 0 : 1], forced: !!fx });
    }
    if (car.z >= road.length) {
      const side = d.branch || (car.x < 0 ? -1 : 1), next = this.fixed ? this.fixed[d.routeIdx + 1] : OB.FORKS[d.stage][side < 0 ? 0 : 1];
      if (!next) { car.z = road.length - 1; return; }
      const other = OB.FORKS[d.stage][side < 0 ? 1 : 0];
      d.stageTimes.push(+(this.t - d.stageT0).toFixed(2));
      car.z -= road.length; car.branch = 0; d.branch = 0; d.decided = false; d.approached = false;
      d.cam.lagX -= side * OB.SPREAD; d.cam.x -= side * OB.SPREAD;
      d.skyFrom = d.stage; d.skyT = 0;
      d.otherStrand = { stage: other, x0: (side < 0 ? 1 : -1) * OB.SPREAD * 2 };
      d.routeStr += side < 0 ? 'L' : 'R'; d.routeIdx++; d.stage = next; d.road = OB.World.stage(next); d.stageT0 = this.t; d.cpDone = false;
      this.emit('stage:enter', { id: next, car: d.id, route: d.routeStr });
    }
  }
  /** the checkpoint arch at the start of every stage after the first: the clock extended */
  checkpoint(d) {
    const car = d.car;
    if (!d.cpDone && d.routeIdx > 0 && car.z >= 2 * SEG) {
      d.cpDone = true; d.checkpoints++;
      const row = OB.STAGES[d.stage].row, bonus = this.clockUp ? 0 : Math.round(this.bonusFor(row));
      if (d.kind === 'player' && d.idx === 0 && !this.clockUp) this.clock += bonus;
      if (d.kind === 'player') this.emit('checkpoint', { car: d.id, id: d.stage, bonus, row, split: d.stageTimes[d.stageTimes.length - 1] });
    }
    if (d.otherStrand && car.z > 150 * SEG) d.otherStrand = null;
    if (d.skyT < 1) d.skyT = Math.min(1, d.skyT + 1 / 1.5 / 120);
  }
  finish(d) {
    d.finished = true; d.finishTime = this.t; this.finishOrder.push(d.id);
    d.stageTimes.push(+(this.t - d.stageT0).toFixed(2));
    const goal = this.fixed ? (this.cfg.route.goal || null) : OB.STAGES[d.stage].goal;
    d.goal = goal || null;
    if (d.kind === 'player') {
      if (this.mode !== 'trial' && this.mode !== 'hub' && this.mode !== 'versus' && !this.clockUp) d.score += Math.round(Math.max(0, this.clock)) * 1000 + OB.routeStages(d.routeStr).reduce((a, s) => a + OB.STAGES[s].diff, 0) * 5000 * (this.fixed ? 0 : 1);
      this.emit('goal', { car: d.id, id: goal, stage: d.stage, time: d.finishTime, clock: this.clock, route: d.routeStr });
      if (this.phase === 'race') { this.phase = 'finish'; this.goalT = 0; if (this.mode !== 'versus') this.slowmo = 1; }
    } else this.emit('rival:finish', { car: d.id, persona: d.persona });
  }
  timeUp() { if (this.phase !== 'race') return; this.phase = 'timeup'; this.phaseT = 0; this.emit('time:up', { stage: this.p1.stage }); }
  end(reason) {
    if (this.phase === 'done') return;
    this.phase = 'done'; this.endReason = reason;
    const res = this.result = { reason, mode: this.mode, cfg: this.cfg, t: this.t, clock: this.clock, ghost: this.ghostRec.slice(),
      players: this.players.map(d => ({ id: d.id, name: d.name, score: Math.round(d.score), route: d.routeStr, stage: d.stage, goal: d.goal || null, finished: d.finished, time: d.finishTime, stageTimes: d.stageTimes.slice(), petals: d.petals, stats: Object.assign({}, d.stats), place: d.place, metres: d.metres(), car: d.carId, passenger: d.passenger, progress: d.progress() })),
      rivals: this.drivers.filter(d => d.kind === 'rival').map(d => ({ id: d.id, persona: d.persona, finished: d.finished, time: d.finishTime, out: d.out, place: d.place })) };
    for (const h of this.rules) if (h.result) Object.assign(res, h.result(this) || {});
    this.emit('run:end', { reason, mode: this.mode });
    this.dispose();
  }
  dispose() { if (this.offBus) { this.offBus(); this.offBus = null; } for (const h of this.rules) if (h.onEnd) h.onEnd(this); OB.World.openAll(); }

  /* ---- collisions: drivers against traffic and against each other ---- */
  collisions() {
    const T = OB.tuning;
    for (const d of this.drivers) {
      const car = d.car; if (d.out || car.crash || car.invuln > 0) continue;
      if (OB.cheats.noCollide && (d.kind === 'player' || this.mode === 'attract')) continue;
      const ax = d.absX();
      for (const v of this.traffic.of(d.stage)) {
        if (v.spinT > 0) continue;
        const dz = v.z - car.z, reach = (v.len + OB.CAR_LEN) / 2;
        if (Math.abs(dz) > reach) continue;
        const vx = this.vehAbsX(d.road, v), dx = vx - ax, wsum = (v.hw + OB.PLAYER_HW) * .9;
        if (Math.abs(dx) > wsum) continue;
        const ev = (n, x) => this.emit(n, Object.assign({ car: d.id }, x));
        const sideOn = Math.abs(dz) < reach * .45;
        if (sideOn) { const s = dx > 0 ? -1 : 1; car.bump(v.v, s, ev, 'traffic'); v.x -= s * .06; v.near[d.id] = true; continue; }
        if (dz > 0) {
          const closing = car.v - v.v;
          if (closing < T.spinThreshold) { car.bump(v.v, 0, ev, 'traffic'); car.z = v.z - reach - 10; car.x += dx > 0 ? -.08 : .08; }
          else if (car.spin('traffic', ev, (ax > 0 ? .75 : -.75) - (d.branch ? 0 : 0))) { v.spinT = 1.3; v.spinDir = dx > 0 ? 1 : -1; v.honk = 1.2; }
          v.near[d.id] = true; v.passed[d.id] = 'hit';
        }
      }
      for (const o of this.drivers) {
        if (o === d || o.out || o.stage !== d.stage || o.car.crash || o.finished || d.finished) continue;
        const dz = o.car.z - car.z; if (Math.abs(dz) > OB.CAR_LEN || dz < 0) continue;
        const dx = o.absX() - ax; if (Math.abs(dx) > OB.PLAYER_HW * 2 * .9) continue;
        const ev = (n, x) => this.emit(n, Object.assign({ car: d.id }, x));
        if (Math.abs(dz) < OB.CAR_LEN * .45) { const s = dx > 0 ? -1 : 1; car.bump(o.car.v, s, ev, o.id); o.car.x -= s * .08; o.car.vx = -s * .6; }
        else if (car.v - o.car.v < T.spinThreshold) { car.bump(o.car.v, 0, ev, o.id); o.car.v += 4; }
        else { car.spin(o.id, ev); o.car.v *= .85; }
      }
    }
  }
  /** overtakes and near misses, from each player's passing of each vehicle */
  detect() {
    for (const d of this.players) {
      if (d.out || d.car.crash) continue;
      const z0 = d.prevZ, z1 = d.car.z, ax = d.absX();
      for (const v of this.traffic.of(d.stage)) {
        if (v.passed[d.id]) continue;
        const vz = v.z;
        if (z0 < vz && z1 >= vz) {
          const dx = Math.abs(this.vehAbsX(d.road, v) - ax), gap = dx - (v.hw + OB.PLAYER_HW);
          v.passed[d.id] = true;
          if (d.car.contactT < .5) continue;
          if (dx < 1.2) { d.stats.overtakes++; this.emit('overtake', { car: d.id, id: v.id, kind: v.type }); }
          if (gap > 0 && gap < .12 && d.car.v - v.v > 50) { d.stats.nearMisses++; this.emit('nearmiss', { car: d.id, id: v.id, gap: +gap.toFixed(3) }); }
          if (v.pair && v.ribbon && !v.ribbon.snapped) { const mid = (this.vehAbsX(d.road, v) + this.vehAbsX(d.road, v.pair)) / 2; if (Math.abs(ax - mid) < .16) { v.ribbon.snapped = true; this.emit('obj:snap', { car: d.id, id: v.id }); } }
        }
      }
      for (const o of this.drivers) if (o !== d && o.kind === 'rival' && o.stage === d.stage && !o.out) {
        const key = 'pass' + o.id, ahead = o.car.z > d.car.z;
        if (d[key] === undefined) d[key] = ahead;
        if (d[key] && !ahead) this.emit('rival:pass', { car: d.id, id: o.id, by: d.id });
        if (!d[key] && ahead) this.emit('rival:pass', { car: o.id, id: d.id, by: o.id });
        d[key] = ahead;
      }
    }
  }
  places() {
    const list = this.drivers.filter(d => !d.out).sort((a, b) => (b.finished ? 1e6 - (b.finishTime || 0) : b.progress()) - (a.finished ? 1e6 - (a.finishTime || 0) : a.progress()));
    list.forEach((d, i) => { d.place = i + 1; });
  }

  /* ---- scoring and the Bloom chain, from the bus ---- */
  onEvent(name, e) {
    const d = e && e.car && this.drivers.find(q => q.id === e.car); if (!d || d.kind !== 'player') { for (const h of this.rules) if (h.onEvent) h.onEvent(this, name, e); return; }
    const L = d.bloom.level, style = pts => { d.bloom.points += pts; d.bloom.lastT = this.t; this.bloomLevel(d); };
    const sc = this.mode !== 'trial';
    switch (name) {
      case 'nearmiss': if (sc) d.score += 500 * L; style(400); break;
      case 'overtake': if (sc) d.score += 100 * L; style(120); break;
      case 'slingshot': if (sc) d.score += 300 * L; style(300); d.stats.slingshots++; break;
      case 'drift:end': if (sc) d.score += e.score * L; d.stats.drifts++; d.stats.bestDrift = Math.max(d.stats.bestDrift, e.score); style(Math.min(4000, e.score * .25)); break;
      case 'drift:start': d.bloom.lastT = this.t; break;
      case 'req:end': if (e.rating === 'Perfect') style(800); break;
      case 'car:crash': d.stats.crashes++; d.bloom.points = Math.min(d.bloom.points / 2, BLOOM_AT[Math.max(0, d.bloom.level - 2)]); this.bloomLevel(d, true); break;
      case 'car:bump': d.stats.bumps++; break;
      case 'car:scrape': d.stats.scrapes++; break;
      case 'air:land': d.stats.airs++; break;
    }
    for (const h of this.rules) if (h.onEvent) h.onEvent(this, name, e);
  }
  bloomLevel(d, quiet) {
    const B = d.bloom; let lv = 1; for (let i = 1; i < BLOOM_AT.length; i++) if (B.points >= BLOOM_AT[i]) lv = i + 1;
    if (lv !== B.level) { const up = lv > B.level; B.level = lv; if (!quiet || !up) this.emit('bloom:level', { car: d.id, n: lv, up }); }
  }
  /** drifting adds chain points every step (the bus hears only starts and ends) */
  tickBloom(dt) { for (const d of this.players) if (d.car.drift.on) { d.bloom.points += Math.abs(d.car.drift.a) * dt * 900; d.bloom.lastT = this.t; this.bloomLevel(d); } }

  /* ---- for the HUD and tests ---- */
  snapshot() {
    const d = this.p1, c = d.car;
    return { mode: this.mode, phase: this.phase, stage: d.stage, seg: Math.floor(c.z / SEG), z: Math.round(c.z), x: +c.x.toFixed(3), absX: +d.absX().toFixed(3), v: Math.round(c.v), gear: c.gear + 1, rpm: Math.round(c.rpm),
      drift: { on: c.drift.on, a: +c.drift.a.toFixed(3), score: Math.round(c.drift.score) }, slip: +c.slip.toFixed(2), air: c.air, crash: !!c.crash, clock: +this.clock.toFixed(2), score: Math.round(d.score),
      bloom: { level: d.bloom.level, points: Math.round(d.bloom.points) }, petals: d.petals, route: d.routeStr, goal: d.goal || null, finished: d.finished, branch: d.branch, decided: d.decided,
      rivals: this.drivers.filter(q => q.kind === 'rival').map(q => ({ id: q.persona, z: Math.round(q.car.z), x: +q.car.x.toFixed(2), place: q.place, stage: q.stage, out: q.out })), traffic: this.traffic.of(d.stage).length, t: +this.t.toFixed(2) };
  }
  stateHash() { const d = this.p1, c = d.car; return [d.stage, Math.round(c.z), +c.x.toFixed(3), Math.round(c.v * 10), Math.round(this.clock * 10), Math.round(d.score), d.petals]; }
}
OB.RaceClass = Race;
OB.Driver = Driver;
OB.BLOOM_AT = BLOOM_AT;
OB.Race = {
  current: null,
  create(cfg) { if (this.current && this.current.phase !== 'done') this.current.dispose(); this.current = new Race(cfg); return this.current; },
  restartCurrent() { const r = this.current; if (!r || OB.env.hub) return; OB.game.resume(); r.dispose(); r.phase = 'done'; OB.game.go('race', Object.assign({}, r.cfg, { noIntro: false }), { fade: 'wipe' }); },
  retireCurrent() { const r = this.current; if (!r || OB.env.hub) return; OB.game.resume(); if (r.phase !== 'done') { r.end('retire'); } OB.game.go(r.cfg.returnTo || 'menu', r.cfg.returnData, { fade: 'wipe' }); }
};
})();
