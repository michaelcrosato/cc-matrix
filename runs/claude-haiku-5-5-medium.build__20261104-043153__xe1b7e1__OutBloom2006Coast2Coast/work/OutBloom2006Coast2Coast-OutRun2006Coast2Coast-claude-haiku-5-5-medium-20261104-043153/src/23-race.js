// A run (plan §7.6): the stages of a route, the daylight clock with its checkpoints, the forks, the goal, the score and
// the Bloom chain, the traffic contacts, and the counters the Love in Bloom requests read. Pure: the scene draws it and
// feeds it input; everything that happens goes on the bus.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { clamp } = E;
const T = k => OB.tune(k);
const DIFF = { Easy: { time: 1.12, traffic: .75 }, Normal: { time: 1, traffic: 1 }, Hard: { time: .92, traffic: 1.3 } };
const LEVELS = [0, 1000, 3000, 6000, 10000];   // the Bloom chain's levels 1..5 (the points that reach each)
const CAR_HALF = .24;

class Race {
  /** new OB.Race(cfg): cfg { mode ('arcade' | 'love' | 'trial' | 'demo'), car (id), paint (index), passenger (key),
   *  difficulty ('Normal'), route (fixed stage ids, or null for the pyramid), seed, cheats: { noCollide, infiniteTime,
   *  perfectRequests, autoDrift }, bot (an OB.Brain for the car, or null), traffic (true), count (trial: count up) } */
  constructor(cfg = {}) {
    this.bus = OB.bus;
    this.cfg = Object.assign({ mode: 'arcade', car: 'orchidea', paint: 0, passenger: 'marisol', difficulty: 'Normal', seed: 1, cheats: {}, traffic: true }, cfg);
    this.mode = this.cfg.mode; this.dm = DIFF[this.cfg.difficulty] || DIFF.Normal;
    this.carDef = OB.Progress.edition(OB.CARS.find(c => c.id === this.cfg.car) || OB.CARS[1]);
    this.passenger = this.mode === 'arcade' || this.mode === 'trial' ? null : this.cfg.passenger;
    this.status = 'countdown'; this.t = 0; this.countdown = 3.2;
    this.routeIds = []; this.forkRoute = [];   // the fork sides taken: 'L' / 'R'
    this.score = 0; this.bloom = { points: 0, level: 1, idle: 0 };
    this.petals = 0; this.petalMax = 0; this.requests = []; this.reqDone = [];
    this.counters = { overtakes: 0, nearmisses: 0, contacts: 0, draftT: 0, fastT: 0, driftScore: 0, longDrifts: 0, slingshots: 0, crashes: 0, collected: 0, stings: 0, gatesOk: 0, gatesWrong: 0, cuts: 0, photoPts: 0, draftPts: 0 };
    this.pacers = []; this.objects = []; this.clockOverride = null; this.routeLimit = !!this.cfg.route;
    // a mission: its route, rules and objects (the rules set the clock, the pacers and the objects)
    this.mission = this.cfg.mission ? OB.Missions.setup(this.cfg.mission, this) : null;
    if (this.mission && this.mission.m.rule === 'heartbreak') this.petals = 20;
    this.fork = null; this.checks = 0; this.goal = null; this.mood = null; this.prefTaken = 0; this.prefMissed = 0;
    this.best = { drift: 0, nearmisses: 0, slipT: 0, maxV: 0 };
    this.clock = (this.clockOverride || T('startTime')) * this.dm.time;
    this.elapsed = 0; this.lowWarned = false; this.lastStyle = 0;
    this.seed = this.cfg.seed;
    // the first stage: the fixed route's first, or S1
    const first = this.cfg.route ? this.cfg.route[0] : 'S1';
    this.enterStage(OB.World.stage(first), 0, true);
    this.car = new OB.CarSim(this.carDef, { z: 20 * OB.SEG, seed: this.seed });
    this.car.x = 0;
    this.bot = this.cfg.bot || null;
    this.stepCount = 0;
  }
  /** the road under the car: the stage's built road and the car's distance on it */
  get road() { return this.stage.road; }
  /** the decision and the approach: the next stage's names for the fork sign, or null */
  enterStage(st, carZ, first = false) {
    this.stage = st; this.routeIds.push(st.def.id);
    this.traffic = this.cfg.traffic ? new OB.Traffic(st, { seed: this.seed, difficulty: this.dm.traffic }) : { list: [], step() {}, draftSource: () => null, visible: () => [] };
    this.fork = null;
    if (!first) {
      const bonus = Math.round((T('checkpointBonus') + (3 - st.def.row)) * this.dm.time);
      this.clock += bonus; this.checks++;
      this.bus.emit('checkpoint', { id: st.def.id, bonus, row: st.def.row });
      this.bus.emit('stage:enter', { id: st.def.id });
    } else this.bus.emit('stage:enter', { id: st.def.id });
    if (!first) this.lowWarned = false;
    // the mission's objects belong to its first stage; a knockout's last place is out at each checkpoint
    this.objects = this.mission && this.mission.m.route && st.def.id === this.mission.m.route[0] ? (this.mission.rule.objects || []) : [];
    if (!first && this.mission && this.mission.rule.knockout) this.knockout(st);
    // the requests of this stage (Love in Bloom only)
    this.requests = []; this.reqWindowOpen = null;
    if (this.passenger && this.mode !== 'trial' && !this.cfg.route) for (const slot of st.def.slots || []) {
      if (!slot.n && slot.type !== 'clean') continue;
      const req = OB.Requests.make(this, st, slot); if (req) { this.requests.push(req); this.petalMax += 5; }
    }
  }
  /** start the countdown and the run: the car waits on the grid until GO */
  get live() { return this.status === 'run' || this.status === 'countdown'; }
  /** the forward speed (km/h) and the other numbers the HUD reads */
  snapshot() {
    return { stage: this.stage.def.id, z: Math.round(this.car.z), x: +this.car.x.toFixed(3), v: Math.round(this.car.v), gear: this.car.gear, rpm: Math.round(this.car.rpm),
      drift: { on: this.car.drift.on, a: +this.car.drift.a.toFixed(3), score: Math.round(this.car.drift.score) }, slip: +this.car.slip.toFixed(2), air: this.car.air,
      crash: !!this.car.crash, clock: +this.clock.toFixed(2), score: Math.round(this.score), bloom: { level: this.bloom.level, points: Math.round(this.bloom.points) },
      petals: this.petals, grade: this.grade ? this.grade() : null, route: this.routeIds.join('>'), forks: this.forkRoute.join(''), goal: this.goal, status: this.status,
      traffic: this.traffic.list.length, checks: this.checks, requests: this.requests.map(r => ({ type: r.type, state: r.state, progress: r.progress() })) };
  }
  /** a step of dt seconds: the input (intent from the player or the bot), the car, the traffic, the rules */
  step(dt, input) {
    this.t += dt; this.stepCount++;
    if (this.status === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) { this.status = 'run'; this.bus.emit('run:start', { mode: this.mode }); this.bus.emit('countdown:go', {}); }
      return;
    }
    if (this.status !== 'run') {
      // the car coasts to a stop after time up, or after the goal
      this.car.v = Math.max(0, this.car.v - 90 * dt); this.car.z += this.car.v * OB.KMH_UNITS * dt;
      this.car.step(dt, { steer: 0, gas: 0, brake: 0 }, { info: OB.World.info(this.stage, this.car.z, this.car.x), inDraft: false, dt });
      return;
    }
    const st = this.stage, car = this.car, info = OB.World.info(st, car.z, car.x);
    // the time: the clock counts down (or up in a trial), with the difficulty's share and the cheat
    this.elapsed += dt;
    if (this.mode === 'trial') { /* the trial counts up (no clock) */ }
    else if (!this.cfg.cheats.infiniteTime) {
      const was = this.clock; this.clock -= dt;
      if (this.clock <= 15 && !this.lowWarned) { this.lowWarned = true; this.bus.emit('time:low', {}); }
      if (this.clock <= 0 && was > 0) { this.clock = 0; this.status = 'over'; this.bus.emit('time:up', { stage: st.def.name }); }
    }
    // the input: a player's intent, or the bot's
    let intent;
    if (this.bot) { intent = this.bot.intent(car, { def: st.def, road: st.road, len: st.len, forkSide: this.forkSideFor(), }, this.traffic, { forkWanted: this.forkWanted(), forkSide: this.forkSideFor() }); }
    else intent = input || { steer: 0, gas: 0, brake: 0 };
    // the forks: the side the car is on at the decision point is the road it takes
    this.updateFork(dt, car);
    // the traffic: move, then the car's contacts and passes
    const ahead = this.traffic.draftSource(car.z, car.x);
    this.traffic.step(dt, car.z, car.x);
    const inDraft = !!ahead;
    const wasDrafting = car.slip > .5;
    car.step(dt, intent, { info, inDraft, dt });
    if (wasDrafting && car.slip > .5) this.counters.draftT += dt;
    if (inDraft && car.slip > .5) this.counters.draftPts += dt * car.v / 100;
    if (car.v > 240) this.counters.fastT += dt;
    if (this.mode !== 'trial' && car.v > 0) this.score += car.v * 2 * this.bloom.level * dt * (1 / 3.6) * 1.2;
    if (!this.cfg.cheats.noCollide) { this.collisions(dt); this.pacerContacts(dt); }
    this.passes(dt);
    for (const p of this.pacers) p.step(dt, this.elapsed);
    this.judgeObjects();
    if (this.mission && this.mission.rule.couple) this.coupleStep(dt);
    this.decayBloom(dt);
    // the requests: intro, active window, and the rating when the window closes
    for (const r of this.requests) OB.Requests.step(r, this, dt);
    // the drift, the slingshot and the crashes: style points and the counters
    this.onCarEvents(dt);
    // the goal and the time limits
    if (this.stage.def.goal && car.z >= this.stage.goalZ && this.goal === null) { this.finish(); return; }
    // the junction's end: the road becomes the chosen stage, the distance carried over (x is already relative)
    if (car.z >= st.len) {
      const over = car.z - st.len, next = this.fork && this.fork.next ? this.fork.next : this.pickNext();
      if (!next) { this.status = 'finish'; return; }   // a fixed route is run out: the mission's end
      this.enterStage(OB.World.stage(next), over);
      car.z = over;
    }
    this.best.drift = Math.max(this.best.drift, car.stats.bestDrift); this.best.slipT = car.stats.slipTime; this.best.maxV = Math.max(this.best.maxV, car.stats.maxV);
    if (car.v > this.best.maxV) this.best.maxV = car.v;
  }
  /** the distance the race has covered along its route (all the stages before this one, and this one's z) */
  progress() { let p = this.car.z; for (const id of this.routeIds.slice(0, -1)) p += OB.World.stage(id).len; return p; }
  /** the knockout: at a checkpoint the last racer (a pacer or the car) is out; the car out ends the run */
  knockout(st) {
    const offset = this.routeIds.slice(0, -1).reduce((a, id) => a + OB.World.stage(id).len, 0);
    const field = this.pacers.filter(p => !p.out).map(p => ({ p, d: p.prog })).concat([{ p: null, d: offset }]);
    field.sort((a, b) => a.d - b.d);
    const last = field[0];
    if (last.p) last.p.out = true; else { this.knockedOut = true; this.status = 'finish'; }
    this.bus.emit('rival:out', { id: last.p ? last.p.id : 'you' });
  }
  /** the heartbreak couple: passing steals two petals each way; behind them, every two seconds one drains from each side */
  coupleStep(dt) {
    const p = this.pacers[0], ahead = this.progress() > p.prog;
    if (this._ahead !== undefined && ahead !== this._ahead) { if (ahead) { this.petals += 2; p.petals -= 2; } else { this.petals = Math.max(0, this.petals - 2); p.petals += 2; } }
    this._ahead = ahead;
    this._coupleT = (this._coupleT || 0) + dt;
    if (this._coupleT >= 2) { this._coupleT = 0; if (ahead) p.petals = Math.max(0, p.petals - 1); else this.petals = Math.max(0, this.petals - 1); }
  }
  /** the mission's objects: each judged as the car goes by, the counts and the points they give */
  judgeObjects() {
    for (const o of this.objects) {
      const ev = OB.Objects.judge(o, this.car, this);
      if (!ev) continue;
      const c = this.counters;
      if (ev.type === 'hit' && (ev.kind === 'balloon' || ev.kind === 'gnome')) { c.collected++; this.bus.emit('obj:pop', { kind: ev.kind }); }
      else if (ev.type === 'hit' && ev.kind === 'cone') this.bus.emit('obj:cone', {});
      else if (ev.type === 'sting') { c.stings++; this.bus.emit('obj:sting', {}); }
      else if (ev.type === 'gate') { if (ev.ok) c.gatesOk++; else c.gatesWrong++; }
      else if (ev.type === 'cut') { c.cuts++; this.bus.emit('obj:snap', {}); }
      else if (ev.type === 'photo') { c.photoPts += ({ perfect: 3, great: 2, good: 1, miss: 0 })[ev.rating]; this.bus.emit('obj:photo', { rating: ev.rating }); }
    }
  }
  /** the camera's shift toward the chosen branch while the junction is in view (0 otherwise), see OB.spreadAt */
  camShift() { if (!this.fork || !this.fork.decided || !this.stage.forkZ) return 0; return (this.fork.side === 'L' ? -1 : 1) * OB.spreadAt(this.stage, this.car.z / OB.SEG); }
  /** the side a fork takes: the route plan for a bot, the passenger's preference, else the default, left */
  forkSideFor() { return this.fork ? this.fork.side : null; }
  /** the car is at the decision point of a fork and has not chosen yet */
  forkWanted() { return !!this.fork && !this.fork.decided; }
  /** the forks on the road: the approach (900 segments before), the decision (the car's side), then the junction's end */
  updateFork(dt, car) {
    const st = this.stage, def = st.def;
    if (def.goal || this.routeLimit) return;
    const z = car.z;
    if (!this.fork && z >= st.forkZ - 40 * OB.SEG) {   // (the approach: the fork is in view, 40 segments out)
      const [l, r] = OB.nextStages(def);
      this.fork = { left: l, right: r, next: null, side: null, decided: false, approached: true, decideZ: st.decideZ, pref: null };
      this.bus.emit('fork:approach', { left: l.name, right: r.name, diff: [l.diff, r.diff] });
      if (this.passenger && this.mode !== 'trial') { this.fork.pref = this.passengerPref(def); this.bus.emit('fork:pref', { side: this.fork.pref }); }
    }
    if (this.fork && !this.fork.decided && z >= this.fork.decideZ) {
      // the side: the bot's plan or the car's own side; near the middle, left (the gentler road)
      let side;
      if (this.bot) side = this.bot.forks[this.forkRoute.length] || (this.fork.pref || 'L');
      else side = car.x > .12 ? 'R' : car.x < -.12 ? 'L' : (car.vx > .05 ? 'R' : 'L');
      this.fork.side = side; this.fork.decided = true; this.fork.next = side === 'L' ? this.fork.left.id : this.fork.right.id;
      // from here the car's x is relative to its branch: the branch's offset (the spread) moves into the camera (camShift)
      car.x -= (side === 'L' ? -1 : 1) * OB.spreadAt(st, car.z / OB.SEG);
      this.forkRoute.push(side);
      if (this.passenger && this.fork.pref) {
        if (side === this.fork.pref) { this.petals += Math.round(2 * this.petalScale()); this.prefTaken++; this.bus.emit('petals', { delta: 2, reason: 'fork' }); }
        else { this.petals = Math.max(0, this.petals - 1); this.prefMissed++; this.bus.emit('petals', { delta: -1, reason: 'fork' }); }
      }
      this.bus.emit('fork:choose', { side, next: this.fork.next });
    }
  }
  /** the route's next stage when the junction ends: the chosen one, or (on a fixed route) the next stage listed */
  pickNext() {
    if (this.fork && this.fork.next) return this.fork.next;
    const route = this.cfg.route;
    if (route) return route[this.routeIds.length];
    return this.stage.def.id;
  }
  /** the passenger's fork preference: lavender on the left, the cliffs on the right, a seed for the rest */
  passengerPref(def) {
    const rng = OB.rand.stream('pref', def.id + ':' + this.cfg.passenger);
    if (this.cfg.passenger === 'marisol') return 'L';
    if (this.cfg.passenger === 'vivi') return 'R';
    return rng() < .5 ? 'L' : 'R';
  }
  petalScale() { return T('petalScale'); }
  /** collisions with the traffic: a contact in the car's lane ahead of it or beside it; the bump or the spin */
  collisions(dt) {
    const car = this.car;
    for (const v of this.traffic.list) {
      const rel = v.z - car.z;
      if (rel > -100 && rel < 260 && Math.abs(v.x - car.x) < (CAR_HALF + v.w) * .9) {
        if (v.hit > 0) continue;
        v.hit = .6;
        const r = car.collideWith({ v: v.kmh, x: v.x, id: v.type });
        this.counters.contacts++;
        this.bus.emit('contact', { with: v.type, kind: r });
        if (r === 'crash') { this.counters.crashes++; this.onCrash(); }
        if (r === 'bump') { this.onBump(); }
      }
    }
  }
  /** the rivals (pacers) on this stage bump and spin the car like the traffic does */
  pacerContacts(dt) {
    const car = this.car;
    for (const pc of this.pacers) {
      if (pc.out) continue;
      const z = pc.onStage(this); if (z === null) continue;
      const rel = z - car.z;
      if (pc.hit > 0) pc.hit -= dt;
      if (rel > -100 && rel < 260 && Math.abs(pc.lane - car.x) < (CAR_HALF + .2) * .9 && pc.hit <= 0) {
        pc.hit = .6;
        const r = car.collideWith({ v: pc.kmh, x: pc.lane, id: pc.id });
        this.counters.contacts++;
        this.bus.emit('contact', { with: pc.id, kind: r });
        if (r === 'crash') { this.counters.crashes++; this.onCrash(); }
        else this.onBump();
      }
    }
  }
  onCrash() { this.bloom.points = this.bloom.points / 2; if (this.bloom.level > 1) this.bloom.level--; this.bus.emit('car:crash', { bloom: this.bloom.level }); }
  onBump() { this.bus.emit('car:bump', {}); }
  /** overtakes and near misses: a vehicle passed on either side, with no contact in the last half second */
  passes(dt) {
    const car = this.car;
    for (const v of this.traffic.list) {
      const rel = v.z - car.z;
      const prev = v.prevRel;
      v.prevRel = rel;
      if (prev === null || prev === undefined) continue;
      if (prev > 0 && rel <= 0) {
        const dx = Math.abs(v.x - car.x);
        const gap = dx - (CAR_HALF + v.w);
        if (dx < .9 && v.hit <= 0) { this.counters.overtakes++; this.addChain(120); this.bus.emit('overtake', { id: v.id, kind: 'pass' }); this.style(); }
        if (gap > 0 && gap < .12 && car.v - v.kmh > 50 && v.hit <= 0 && !this.cfg.cheats.noCollide) {
          this.counters.nearmisses++; this.addChain(400); this.score += 500 * this.bloom.level; this.bus.emit('nearmiss', { id: v.id }); this.style();
        }
      }
    }
  }
  /** the Bloom chain: points for style, a level at each threshold, a drain after bloomDecay seconds without style */
  addChain(p) { this.bloom.points += p; this.bloom.idle = 0; const lv = this.levelFor(this.bloom.points); if (lv > this.bloom.level) { this.bloom.level = lv; this.bus.emit('bloom:level', { n: lv }); } }
  levelFor(p) { let l = 1; for (let i = 1; i < LEVELS.length; i++) if (p >= LEVELS[i]) l = i + 1; return Math.min(5, l); }
  style() { this.bloom.idle = 0; }
  decayBloom(dt) {
    this.bloom.idle += dt;
    if (this.bloom.idle > T('bloomDecay') && this.bloom.points > 0) {
      this.bloom.points = Math.max(0, this.bloom.points * (1 - .2 * dt));
      const lv = this.levelFor(this.bloom.points); if (lv < this.bloom.level) this.bloom.level = lv;
    }
  }
  /** the drift's end (its score into the chain and the counters), the slingshot, the air, the crash */
  onCarEvents(dt) {
    const car = this.car, D = car.drift;
    // a drift that just ended: its score into the chain (capped), and the long drifts for the requests
    if (this._wasDrift && !D.on) {
      const pts = Math.min(900, Math.round(this._driftScore / 20));
      this.counters.driftScore += this._driftScore; if (this._driftLen >= 1.2) this.counters.longDrifts++;
      if (pts > 0) this.addChain(pts);
      this.bus.emit('drift:end', { score: Math.round(this._driftScore), length: +this._driftLen.toFixed(2) });
    }
    if (D.on) { this._driftScore = D.score; this._driftLen = D.len; }
    this._wasDrift = D.on;
    // the slingshot's first moment
    if (car.slingT > .75 && !this._sling) { this._sling = true; this.counters.slingshots++; this.addChain(300); this.score += 300 * this.bloom.level; this.bus.emit('slingshot', {}); }
    if (car.slingT <= 0) this._sling = false;
    // a crash: the chain halved (in onCrash, through the contact); the spin is counted once
    if (car.crash && !this._crashed) { this._crashed = true; this.counters.crashes++; this.bus.emit('car:crash', { kind: car.crash.kind }); }
    if (!car.crash) this._crashed = false;
    // air: the passenger hears it
    if (car.air && !this._air) { this._air = true; this.bus.emit('air:start', {}); }
    if (!car.air) this._air = false;
  }
  /** the goal: the run ends and the mood follows (arcade: the time left; love: the grade; trial: none) */
  finish() {
    this.status = 'goal';
    this.goal = this.stage.def.goal;
    this.bus.emit('goal', { id: this.goal, mood: this.moodNow() });
  }
  /** the mood now: by the time left (arcade), by the grade (love), or the trial's neutral */
  moodNow() {
    if (this.mode === 'love' || this.mode === 'demo' && this.passenger) return this.grade ? this.grade().mood : 'Bloom';
    if (this.clock >= 20) return 'Bloom'; if (this.clock >= 5) return 'Bud'; return 'Wilt';
  }
  /** the results: the score (with the goal bonuses), the route, the style and the rewards */
  result() {
    const goal = this.goal, left = Math.max(0, this.clock);
    const route = this.routeIds.length, diff = this.routeIds.reduce((a, id) => a + OB.STAGES.find(s => s.id === id).diff, 0);
    const bonus = goal ? Math.round(left * 1000 + diff * 5000 / 5) : 0;
    const total = Math.round(this.score + bonus);
    return { mode: this.mode, goal, mood: goal ? this.moodNow() : null, score: total, bonus, time: +this.elapsed.toFixed(1), route: this.forkRoute.join(''), routeIds: this.routeIds.slice(),
      clock: +left.toFixed(1), bestDrift: Math.round(this.best.drift), nearmisses: this.counters.nearmisses, overtakes: this.counters.overtakes,
      slipT: +this.best.slipT.toFixed(1), maxV: Math.round(this.best.maxV), petals: this.petals, grade: this.grade ? this.grade() : null, requests: this.reqDone.slice(), checks: this.checks,
      passenger: this.passenger, status: this.status, contacts: this.counters.contacts, crashes: this.counters.crashes,
      mission: this.mission ? this.mission.rule.result(this) : null, knockedOut: !!this.knockedOut, counters: Object.assign({}, this.counters) };
  }
}
OB.Race = Race;
})();
