/* The race simulation: pure and deterministic. Fixed dt steps, seeded streams, no drawing. It talks to everything else
 * through OB.bus. Handling: power slide (brake tap or the drift button), slipstream and slingshot, traffic, the Bloom
 * chain, the daylight clock, forks, and the passenger's requests (Love in Bloom). */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { clamp } = E;
const AHEAD = OB.AHEAD, W2 = 2000;
class Race {
  /** o: { mode: 'drive'|'trial'|'tour'|'hub'|'attract', car, color, pass, stage (first stage id), seed, ai, mission, countdown } */
  constructor(o = {}) {
    this.o = o; this.mode = o.mode || 'drive'; this.car = OB.CARS.find(c => c.id === (o.car || 'orchidea')) || OB.CARS[0];
    this.color = o.color == null ? 0 : o.color; this.passId = ['marisol', 'dante', 'wren'][o.pass || 0] || 'marisol';
    this.seed = (o.seed || 1) >>> 0; this.rng = OB.rand.stream('race', this.seed); this.rngT = o.trafficRng || OB.rand.stream('traffic', this.seed); this.rngR = OB.rand.stream('req', this.seed);
    this.ai = !!o.ai; this.god = !!o.ai || !!o.god; this.countUp = ['hub', 'trial', 'versus'].includes(this.mode); this.manual = !!o.manual; this.gear = 1; this.prevShift = 0;
    this.mission = o.mission || null;
    this.score = 0; this.petals = 0; this.mood = 60; this.chain = { n: 0, t: 0, mult: 1 }; this.route = []; this.t = 0; this.raceT = 0; this.stageT = 0; this.state = 'count'; this.countT = o.countdown == null ? 3.4 : o.countdown;
    this.clock = this.countUp ? 0 : (this.mission ? this.mission.limit : OB.T.startTime);
    this.stats = { passes: 0, near: 0, drifts: 0, bestDrift: 0, driftPts: 0, crashes: 0, slings: 0, drafts: 0, reqDone: 0, reqFail: 0, km: 0, maxSpeed: 0 };
    this.speed = 0; this.x = 0; this.z = 0; this.steer = 0; this.bank = 0; this.crash = 0; this.invuln = 0; this.bump = 0; this.boost = 0;
    this.drift = { on: false, dir: 0, t: 0, angle: 0, pts: 0, byBtn: false, still: 0 }; this.draft = 0; this.charge = 0; this.drafting = false; this.sling = 0;
    this.req = null; this.reqT = 6 + this.rngR() * 4; this.reqLog = []; this.lastLane = 1; this.lanes = 0; this.cleanT = 0; this.prevBrake = false; this.prevDrift = false; this.prevRadio = false; this.prevHorn = false; this.hornT = 0;
    this.choice = null; this.finished = false; this.station = o.station || 0; this.banner = null; this.flash = 0; this.rivals = []; this.ghostRec = []; this.ghostT = 0; this.endT = 0; this.driftAcc = 0;
    this.skid = 0; this.wind = 0; this.stageCount = 0; this.timeout = false; this.missionDone = null; this.noCrash = true; this.distance = 0;
    this.loadStage(o.stage == null ? 0 : o.stage, true);
  }
  get pz() { return this.z + AHEAD; }
  get stageDef() { return this.stage.def; }
  loadStage(id, first) {
    this.stage = OB.getStage(id); this.road = this.stage.road; this.stageId = id; this.route.push(id); this.z = 0; this.stageT = 0; this.stageCount++;
    this.traffic = this.stage.spawn(this.o.noTraffic ? 0 : OB.T.trafficDensity, this.rngT);
    for (const c of this.traffic) c.v = c.base * OB.T.trafficSpeed;
    this.choice = null; this.finished = false; this.rivals = [];
    if (this.mission && this.mission.rule === 'rival') this.rivals = [{ kind: 'rival', z: 2500, x: .33, v: 0, w: 380, len: 440, col: '#d8283a', draw: OB.drawVehicle, lane: 2, tx: .33, minDx: 9e9 }];
    if (!first) { this.x = clamp(this.x, -.8, .8); this.banner = { text: this.stage.def.name, sub: OB.BIOMES[this.stage.def.biome].label + ' · ' + OB.TOD[this.stage.def.tod].label, t: 0, kind: 'stage' }; OB.bus.emit('stage', { race: this, id }); }
  }
  /** one fixed step. ctl: { steer -1..1, gas, brake, drift, horn, radio } */
  update(dt, ctl) {
    const T = OB.T, car = this.car; this.t += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 3) this.banner = null; }
    if (this.state === 'count') { this.countT -= dt; this.settleTraffic(dt, false); if (this.countT <= 0) { this.state = 'go'; this.banner = { text: 'GO!', t: 0, kind: 'go' }; OB.bus.emit('go', { race: this }); } this.steer = 0; this.recordGhost(dt); return; }
    if (this.state === 'over' || this.state === 'goal' || this.state === 'done') { this.endT += dt; this.coast(dt); this.settleTraffic(dt, true); return; }
    this.raceT += dt; this.stageT += dt;
    if (this.chain.t > 0) { this.chain.t -= dt; if (this.chain.t <= 0) { this.chain.n = 0; this.chain.mult = 1; } }
    if (this.countUp) this.clock += dt; else if (!OB.dev.infTime && !this.god) { this.clock -= dt; if (this.clock <= 0) { this.clock = 0; this.state = 'over'; this.timeout = true; this.endT = 0; OB.bus.emit('timeout', { race: this }); return; } }
    if (this.invuln > 0) this.invuln -= dt; if (this.bump > 0) this.bump -= dt; if (this.hornT > 0) this.hornT -= dt; if (this.flash > 0) this.flash -= dt;
    const dv0 = Math.abs(this.speed);
    // ---- speed ----
    const off = Math.abs(this.x) > 1.08, topBase = car.top * T.topScale;
    let top = topBase * (off ? T.offroadDrag : 1);
    // gears: automatic follows speed; manual is shifted by the player (ctl.shift +1 / -1)
    const GT = [0, .3, .5, .68, .85, 1];
    if (this.manual) { const sh = ctl.shift || 0; if (sh && sh !== this.prevShift) { this.gear = clamp(this.gear + sh, 1, 5); OB.bus.emit('shift', { race: this, gear: this.gear }); } this.prevShift = sh; }
    else this.gear = clamp(1 + Math.floor((this.speed / car.top) / .2), 1, 5);
    const gearTop = GT[this.gear] * car.top * T.topScale * 1.04; if (this.manual) top = Math.min(top, gearTop * (off ? T.offroadDrag : 1));
    this.rpm = clamp(this.speed / Math.max(1, gearTop), 0, 1.2);
    if (this.boost > 0) { top *= 1 + .13 * T.boostPower; this.boost -= dt; }
    if (this.drafting) top *= 1 + .05 * T.draftPower;
    if (this.crash > 0) {
      this.crash -= dt; this.speed = Math.max(0, this.speed - 430 * dt); this.x += (Math.sign(this.x || 1) * .45 - this.x) * Math.min(1, dt * 3); this.drift.on = false; this.drift.angle *= .9;
      if (this.crash <= 0) this.invuln = 1.1;
    } else {
      if (ctl.gas && this.speed < top) this.speed = Math.min(top, this.speed + (88 * car.acc * T.accel * (this.manual ? 1.25 - this.gear * .08 : 1) * (1 - this.speed / top) + 14 * car.acc * T.accel + (this.boost > 0 ? 50 * T.boostPower : 0)) * dt);
      else if (this.speed > top) this.speed = Math.max(top, this.speed - 90 * dt);
      if (ctl.brake) this.speed = Math.max(0, this.speed - 190 * T.brake * dt);
      if (!ctl.gas && !ctl.brake) this.speed = Math.max(0, this.speed - (24 + this.speed * .05) * dt);
    }
    // ---- steering, bends, power slide ----
    const spd = this.speed, pct = spd / car.top, auth = Math.min(1, spd / 90), D = this.drift, curve = this.road.curveAt(this.pz);
    const tgt = clamp(ctl.steer || 0, -1, 1); this.steer += (tgt - this.steer) * Math.min(1, dt * 10);
    const brakeTap = !!ctl.brake && !this.prevBrake, driftPress = !!ctl.drift && !this.prevDrift;
    if (!D.on && this.crash <= 0 && spd > 130 && (driftPress || (brakeTap && Math.abs(this.steer) > .3)) && Math.abs(this.steer) > .12) {
      D.on = true; D.dir = Math.sign(this.steer) || Math.sign(curve) || 1; D.t = 0; D.pts = 0; D.byBtn = driftPress; D.still = 0; OB.bus.emit('driftstart', { race: this, dir: D.dir });
      if (brakeTap) this.speed = Math.max(0, this.speed - 6);
    }
    const assist = { Off: 0, Low: .25, High: .5 }[OB.game.settings.steerAssist] || 0;
    let push = curve * pct * pct * dt * .62 * T.curvePush * (1 - assist) / (car.grip);
    if (D.on) {
      D.t += dt; if (this.req && this.req.def.kind === 'long') { this.req.p = Math.max(this.req.p, D.t); if (this.req.p >= this.req.def.goal) this.finishRequest(true); } push *= .28 / Math.max(.4, T.grip);
      const want = D.dir * (.55 + .45 * clamp(this.steer * D.dir, 0, 1)) * (this.steer * D.dir < -.5 ? .3 : 1);
      D.angle += (want - D.angle) * Math.min(1, dt * 5);
      const pts = spd * dt * .72 * (.5 + Math.abs(D.angle)) * T.driftScore * car.drift * (1 + this.chain.mult * .15);
      D.pts += pts; this.driftAcc += pts; this.speed = Math.max(0, this.speed - 7 * dt);
      const held = D.byBtn ? ctl.drift : true;
      if (this.steer * D.dir < .1) D.still += dt; else D.still = Math.max(0, D.still - dt);
      if (!held || (!D.byBtn && D.still > .35) || (brakeTap && D.t > .3) || spd < 100 || off || (D.byBtn && D.t > .2 && !ctl.drift)) this.endDrift('end');
      else if (Math.floor(D.t * 6) !== Math.floor((D.t - dt) * 6)) this.skid = .25;
    } else D.angle += (0 - D.angle) * Math.min(1, dt * 6);
    this.x += this.steer * dt * 2.3 * T.steer * auth * (D.on ? 1.35 : 1) * (this.crash > 0 ? 0 : 1) - push;
    this.x = clamp(this.x, -2.6, 2.6);
    const dz = spd * 12 * dt; this.z += dz; this.distance += dz; this.stats.maxSpeed = Math.max(this.stats.maxSpeed, spd);
    this.stats.km += spd * dt / 3600; this.scoreF = (this.scoreF || 0) + dz * .02 * (1 + .1 * (this.chain.mult - 1)); if (this.scoreF >= 1) { const w = Math.floor(this.scoreF); this.score += w; this.scoreF -= w; }
    this.bank += ((curve * pct * .12 + this.steer * .6) - this.bank) * Math.min(1, dt * 6);
    this.prevBrake = !!ctl.brake; this.prevDrift = !!ctl.drift;
    // ---- scenery ----
    if (this.crash <= 0 && this.invuln <= 0 && Math.abs(this.x) > 1.2 && spd > 20 && this.road.hits(this.pz, this.x, .12).length) this.doCrash('scenery', null);
    // ---- traffic ----
    this.settleTraffic(dt, true); this.trafficInteract(dt, ctl);
    // ---- horn, radio ----
    if (ctl.horn && !this.prevHorn) { this.hornT = .6; OB.bus.emit('horn', { race: this }); this.reqEvent('horn'); }
    this.prevHorn = !!ctl.horn;
    if (ctl.radio && !this.prevRadio) { this.station = (this.station + 1) % OB.SONGS.length; OB.bus.emit('radio', { race: this, station: this.station }); this.reqEvent('radio'); }
    this.prevRadio = !!ctl.radio;
    // lanes crossed (for weave requests)
    const ln = this.x < -.33 ? 0 : this.x > .33 ? 2 : 1; if (ln !== this.lastLane) { this.lanes++; this.lastLane = ln; if (this.req && this.req.kind === 'weave') this.reqAdd(1); }
    // ---- the passenger ----
    this.updateRequests(dt);
    this.mood = clamp(this.mood - dt * .35 / OB.T.passengerPatience, 0, 100);
    this.skid = Math.max(0, this.skid - dt);
    // ---- mission rules ----
    if (this.mission) this.checkMission(dt);
    // ---- the rival ----
    for (const r of this.rivals) { const gap = this.pz - r.z; r.v = clamp((this.mission.rivalSpeed || 230) + clamp(gap * .006, -40, 28), 120, 300); r.z += r.v * 12 * dt; if (r.z + 400 >= this.stage.gateZ && this.state === 'go') { this.fail('rival'); } }
    // ---- the gate ----
    if (this.pz >= this.stage.gateZ) this.passGate();
    this.recordGhost(dt);
  }
  recordGhost(dt) { this.ghostT += dt; if (this.ghostT >= .1) { this.ghostT -= .1; this.ghostRec.push([this.stageId, Math.round(this.z), Math.round(this.x * 100) / 100, Math.round(this.speed), Math.round(this.drift.angle * 100) / 100]); } }
  coast(dt) { this.speed = Math.max(0, this.speed - 110 * dt); this.z += this.speed * 12 * dt; this.x += (0 - this.x) * Math.min(1, dt); this.steer *= .9; this.drift.on = false; this.drift.angle *= .9; }
  endDrift(why) {
    const D = this.drift; if (!D.on) return; D.on = false;
    if (D.t > .5) {
      const gain = D.pts * (1 + this.chain.mult * .1); this.addScore(gain, true); this.stats.drifts++; this.stats.driftPts += D.pts; this.stats.bestDrift = Math.max(this.stats.bestDrift, Math.round(D.pts));
      this.boost = Math.max(this.boost, Math.min(2.4, D.t * .42 * OB.T.driftBoost)); this.reqEvent('boost'); this.mood = Math.min(100, this.mood + 4); this.bumpChain();
      OB.bus.emit('drift', { race: this, pts: D.pts, t: D.t }); this.reqEvent('driftpts', D.pts);
    }
    D.pts = 0;
  }
  bumpChain() { const c = this.chain; c.n++; c.t = 3.6; c.mult = Math.min(8, 1 + Math.floor(c.n / 3)); }
  addScore(v, silent) { this.score += Math.round(v * this.chain.mult); }
  doCrash(kind, car) {
    if (this.god && this.ai) return; if (OB.dev.god) return;
    this.endDrift('crash'); this.crash = 1.3 * Math.max(.2, OB.T.crashPenalty); this.speed *= .22; this.stats.crashes++; this.noCrash = false; this.cleanT = 0; this.mood = Math.max(0, this.mood - 18);
    this.chain.n = 0; this.chain.mult = 1; this.chain.t = 0; this.boost = 0; this.charge = 0; this.drafting = false;
    if (OB.T.crashPenalty > 0 && !this.countUp && !this.mission) this.clock = Math.max(1, this.clock - 2 * OB.T.crashPenalty);
    OB.bus.emit('crash', { race: this, kind, car });
  }
  settleTraffic(dt, active) {
    const T = this.traffic, pz = this.pz;
    for (let i = 0; i < T.length; i++) {
      const c = T[i]; if (!active) continue; c.z += c.v * 12 * dt;
      // keep distance from the car ahead in the same lane
      let slow = false; for (let j = 0; j < T.length; j += 1) { const d = T[j]; if (d !== c && d.lane === c.lane && d.z > c.z && d.z - c.z < c.len + 700 && d.v < c.v) { c.v = Math.max(d.v - 2, 30); slow = true; break; } }
      if (!slow && c.v < c.base * OB.T.trafficSpeed) c.v = Math.min(c.base * OB.T.trafficSpeed, c.v + 12 * dt);
      c.changeT -= dt;
      if (c.changeT <= 0 && c.kind !== 'rival') {
        c.changeT = 5 + this.rngT() * 9; const nl = Math.max(0, Math.min(2, c.lane + (this.rngT() < .5 ? -1 : 1)));
        if (nl !== c.lane && !T.some(d => d !== c && (d.lane === nl || d.tx === OB.LANES[nl]) && Math.abs(d.z - c.z) < 1100) && Math.abs(c.z - pz) > 1500) { c.lane = nl; c.tx = OB.LANES[nl]; }
      }
      c.x += (c.tx - c.x) * Math.min(1, dt * .9);
    }
    for (const r of this.rivals) r.x += (r.tx - r.x) * Math.min(1, dt);
  }
  trafficInteract(dt, ctl) {
    const pz = this.pz, px = this.x, car = this.car; let draftT = null;
    for (const c of this.traffic) {
      const dz = c.z - pz;
      if (dz > 6000 || dz < -4500) continue;
      const dxu = Math.abs(c.x - px) * W2, hit = (c.w + 380) * .5 * .92;
      // slipstream target
      if (dz > 300 && dz < 2500 && dxu < c.w * .5 + 420 && this.speed > 150 && (!draftT || dz < draftT.z - pz)) draftT = c;
      if (Math.abs(dz) < c.len * .5 + 170) { c.minDx = Math.min(c.minDx, dxu); if (this.crash <= 0 && this.invuln <= 0 && this.bump <= 0 && dxu < hit) {
        const rel = this.speed - c.v;
        if (rel > 55 || dz > c.len * .2) { this.doCrash('traffic', c); c.v = Math.max(c.v, this.speed * .6); }
        else { this.bump = .5; this.speed = Math.min(this.speed, c.v * .9); this.x += px < c.x ? -.26 : .26; this.mood = Math.max(0, this.mood - 5); OB.bus.emit('bump', { race: this, car: c }); }
      } }
      if (!c.passed && c.z + c.len * .5 < pz - 90) {
        c.passed = true; this.stats.passes++; this.addScore(300); this.bumpChain(); OB.bus.emit('pass', { race: this, car: c }); this.reqEvent('pass');
        if (this.speed > 140 && c.minDx < (c.w + 380) * .5 + 260 && c.minDx >= hit * .98 && this.crash <= 0) { this.stats.near++; this.addScore(600 * OB.T.nearMissScore); this.bumpChain(); this.mood = Math.min(100, this.mood + 5); OB.bus.emit('near', { race: this, car: c }); this.reqEvent('near'); }
      }
    }
    for (const r of this.rivals) { const dz = r.z - pz; r.minDx = Math.abs(r.x - px) * W2; if (Math.abs(dz) < 300 && r.minDx < 330 && this.crash <= 0 && this.invuln <= 0) { this.bump = .5; this.x += px < r.x ? -.25 : .25; this.speed = Math.min(this.speed, r.v); OB.bus.emit('bump', { race: this, car: r }); } }
    // slipstream: charge builds behind a car, leave it for a slingshot
    const was = this.drafting;
    if (draftT && this.crash <= 0) { this.drafting = true; this.charge = Math.min(1, this.charge + dt * .5 * Math.max(.2, OB.T.draftPower)); if (!was) { this.stats.drafts++; OB.bus.emit('draft', { race: this }); this.reqEvent('draft'); } this.draftCar = draftT; }
    else { this.drafting = false; if (was && this.charge > .5) { const b = this.charge; this.boost = Math.max(this.boost, 1.3 * b * OB.T.boostPower); this.sling = 1; this.reqEvent('boost'); this.stats.slings++; this.addScore(500 * b); this.bumpChain(); OB.bus.emit('sling', { race: this, power: b }); this.reqEvent('sling'); this.charge = 0; } else this.charge = Math.max(0, this.charge - dt * .6); }
    if (this.sling > 0) this.sling = Math.max(0, this.sling - dt);
  }
  passGate() {
    const def = this.stage.def;
    this.addScore(5000);
    if (!def.next) { this.state = 'goal'; this.endT = 0; this.goalIdx = def.idx; this.finished = true; OB.bus.emit('goal', { race: this }); return; }
    if (this.mission) { const m = this.mission; if (['reach', 'clean', 'rival'].includes(m.rule)) this.missionDone = { ok: true }; else if (!this.missionDone) this.missionDone = { ok: false, why: 'short' }; }
    if (this.mode === 'trial' || this.mode === 'tour' || this.o.single) { this.state = 'goal'; this.endT = 0; this.finished = true; this.choice = this.x < 0 ? 0 : 1; OB.bus.emit(this.missionDone && !this.missionDone.ok ? 'missionfail' : 'goal', { race: this, single: true }); return; }
    const c = this.x < 0 ? 0 : 1; this.choice = c;
    if (this.o.fixedRoute) { const nx = this.o.fixedRoute[this.stageCount]; if (nx == null) { this.state = 'goal'; this.endT = 0; this.finished = true; this.goalIdx = 0; OB.bus.emit('goal', { race: this, single: true }); return; } this.mood = Math.min(100, this.mood + 6); OB.bus.emit('checkpoint', { race: this, choice: c, to: nx }); this.loadStage(nx); this.banner = { text: 'FLOWER SPRINT', sub: this.stage.def.name, t: 0, kind: 'extended' }; return; }
    if (!this.countUp && !OB.dev.infTime) this.clock += OB.T.checkpointTime;
    this.mood = Math.min(100, this.mood + 6); OB.bus.emit('checkpoint', { race: this, choice: c, to: def.next[c] });
    this.loadStage(def.next[c]);
    this.banner = { text: OB.LINES.extended[this.stageCount % 3], sub: this.stage.def.name, t: 0, kind: 'extended' };
  }
  fail(why) { if (this.state !== 'go') return; this.state = 'over'; this.endT = 0; this.missionDone = { ok: false, why }; OB.bus.emit('missionfail', { race: this, why }); }
  checkMission(dt) {
    const m = this.mission; if (this.state !== 'go') return;
    const win = () => { this.state = 'goal'; this.endT = 0; this.finished = true; this.missionDone = { ok: true }; OB.bus.emit('missionwin', { race: this }); };
    if (m.rule === 'drift' && this.stats.driftPts + (this.drift.on ? this.drift.pts : 0) >= m.target) win();
    else if (m.rule === 'sling' && this.stats.slings >= m.target) win();
    else if (m.rule === 'pass' && this.stats.passes >= m.target) win();
    else if (m.rule === 'near' && this.stats.near >= m.target) win();
    else if (m.rule === 'clean' && !this.noCrash) this.fail('crash');
    if (this.clock <= 0 && this.state === 'go') this.fail('time');
  }
  /* ---- Love in Bloom ---- */
  updateRequests(dt) {
    if (this.mode === 'trial' || this.mode === 'tour' || this.o.noRequests) return;
    const T = OB.T;
    if (!this.req) { this.reqT -= dt; if (this.reqT <= 0 && this.speed > 40) this.startRequest(); return; }
    const r = this.req, d = r.def; r.t += dt;
    if (d.kind === 'fast') { if (this.speed >= d.speed) r.p += dt; else r.p = Math.max(0, r.p - dt * .6); }
    else if (d.kind === 'slow') { if (this.speed < d.speed && this.speed > 40) r.p += dt; else r.p = Math.max(0, r.p - dt); }
    else if (d.kind === 'center') { if (Math.abs(this.x) < .3) r.p += dt; else r.p = 0; }
    else if (d.kind === 'clean') { if (this.crash > 0) r.p = 0; else r.p += dt; }
    if (r.p >= d.goal - 1e-6) return this.finishRequest(true);
    if (r.t > d.time) this.finishRequest(false);
  }
  startRequest() {
    const pool = OB.REQUESTS.filter(q => !this.reqLog.slice(-4).includes(q.id)), d = pool[Math.floor(this.rngR() * pool.length) % pool.length];
    this.req = { def: d, p: 0, t: 0 }; this.reqLog.push(d.id); OB.bus.emit('reqstart', { race: this, req: this.req });
  }
  finishRequest(ok) {
    const r = this.req; this.req = null; this.reqT = (9 + this.rngR() * 8) / OB.T.requestRate;
    if (ok) { this.petals += r.def.petals; this.stats.reqDone++; this.mood = Math.min(100, this.mood + 22); this.addScore(1000 * r.def.petals); OB.game && (this.flash = .5); OB.bus.emit('reqdone', { race: this, req: r }); }
    else { this.stats.reqFail++; this.mood = Math.max(0, this.mood - 12); OB.bus.emit('reqfail', { race: this, req: r }); }
  }
  reqAdd(n) { if (this.req) { this.req.p += n; if (this.req.p >= this.req.def.goal - 1e-6) this.finishRequest(true); } }
  reqEvent(k, v) {
    if (!this.req) return; const d = this.req.def;
    if (k === 'driftpts' && d.kind === 'drift') this.reqAdd(v);
    else if (k === d.kind && (k === 'boost' || k === 'pass' || k === 'near' || k === 'draft' || k === 'sling' || k === 'radio')) this.reqAdd(1);
    else if (k === 'horn' && d.kind === 'horn') { if (this.traffic.some(c => c.z > this.pz + 300 && c.z < this.pz + 4000 && Math.abs(c.x - this.x) < .5)) this.reqAdd(1); }
  }
  /** a driver for the attract mode and the dev bot: steers to a free lane, drifts bends, always gas */
  aiControl() {
    const pz = this.pz, x = this.x; let best = 0, bestScore = -1e9;
    for (const lx of [-.66, 0, .66]) {
      let sc = -Math.abs(lx - x) * 200; for (const c of this.traffic) { const dz = c.z - pz; if (dz > -300 && dz < 3600 && Math.abs(c.x - lx) < .3) sc -= (3600 - dz) * .8; if (dz > 300 && dz < 2400 && Math.abs(c.x - lx) < .22 && this.speed > 150) sc += 80; }
      if (this.stage.def.next) sc += (lx < 0 ? -1 : 1) * (this.o.fork == null ? 0 : (this.o.fork ? 400 : -400)) * (this.pz > this.stage.gateZ - 14000 ? 1 : 0);
      if (sc > bestScore) { bestScore = sc; best = lx; }
    }
    const ahead = this.road.curveAt(pz + 1800), curNow = this.road.curveAt(pz);
    const want = clamp((best - x) * 2.6 + curNow * .09, -1, 1);
    const wantDrift = Math.abs(ahead) > 3.6 && this.speed > 190 && !this.drift.on;
    const hornNow = this.req && this.req.def.kind === 'horn';
    return { steer: want * (wantDrift ? 0 : 1) + (wantDrift ? Math.sign(ahead) * .8 : 0), gas: this.speed < 300, brake: false, drift: Math.abs(curNow) > 3.2 && this.speed > 190, horn: !!hornNow && this.t % 2 < .1, radio: this.req && this.req.def.kind === 'radio' && this.t % 3 < .1 };
  }
  snapshot() {
    return { state: this.state, stage: this.stageId, z: Math.round(this.z), x: +this.x.toFixed(2), speed: Math.round(this.speed), clock: +this.clock.toFixed(1), score: this.score, petals: this.petals, mood: Math.round(this.mood), drifting: this.drift.on, crash: this.crash > 0, req: this.req && this.req.def.id, chain: this.chain.mult, stats: this.stats, route: this.route };
  }
}
OB.Race = Race;
})();
