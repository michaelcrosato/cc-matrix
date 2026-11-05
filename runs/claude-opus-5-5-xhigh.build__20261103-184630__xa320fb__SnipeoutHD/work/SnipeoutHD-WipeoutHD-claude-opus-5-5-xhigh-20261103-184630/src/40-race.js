// SNIPEOUT HD: the race director. Lifecycle (intro, grid, countdown with launch revs, racing, finished, results),
// laps and sectors, positions, wrong way, elimination (DNF or respawn), results with estimated times, and every
// mode's rules: QUICK RACE, TIME TRIAL, HOT LAP, SNIPEOUT, OVERCLOCK, ACADEMY (drills), VERSUS, GRAND PRIX rounds
// and the AI Hub session. Deterministic: the seed, the track, the class, the tuning and the controls decide it.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16;

/* ---- the modes' rules ---- */
const BLANK = { steer: 0, pitch: 0, thrust: 0, brakeL: 0, brakeR: 0, fire: false, firePressed: false, fireReleased: false, absorb: false, shiftL: false, shiftR: false, flick: 0, camera: false, lookBack: false };
const MODES = SN.MODES = {
  race: { label: 'QUICK RACE', weapons: true, rubberBand: true, laps: 3 },
  season: { label: 'SEASON', weapons: true, rubberBand: true, laps: 3 },
  gp: { label: 'GRAND PRIX', weapons: true, rubberBand: true, laps: 3 },
  timetrial: { label: 'TIME TRIAL', weapons: false, solo: true, laps: 3, ghost: true, noStuck: false },
  hotlap: { label: 'HOT LAP', weapons: false, solo: true, laps: 10, flying: true, ghost: true, endRun: true, bestLapCounts: true },
  snipeout: { label: 'SNIPEOUT', weapons: true, table: 'snipeout', noAutopilot: true, respawn: true, target: 10, timeLimit: 300, laps: 99 },
  overclock: { label: 'OVERCLOCK', weapons: false, solo: true, noSpeedPads: true, autoThrust: true, wallMul: 1.5, rescueCost: 20, laps: 999, zoneTime: 12, endRun: true, skin: 'overclock' },
  academy: { label: 'ACADEMY', weapons: true, solo: true, respawn: true, laps: 999, noStuck: true },
  versus: { label: 'VERSUS', weapons: true, rubberBand: true, laps: 3 },
  hub: { label: 'AI HUB SESSION', weapons: true, rubberBand: false, respawn: true, laps: 3 }
};

class Race {
  /**
   * o: { track (a built SN.Track), mode, cls, laps, seed, entrants: [{ pilot, team, control: 'human' | 'ai' | 'ghost' |
   * 'drone', pi }], difficulty, intro (true: the 6 s flyover first), rules (overrides), clock (a hub's: () => ms) }
   */
  constructor(o) {
    this.o = o; this.track = o.track; this.mode = o.mode || 'race'; this.cls = o.cls || 'SPARK'; this.seed = (o.seed >>> 0) || 1;
    this.difficulty = o.difficulty || 'Normal';
    this.rules = Object.assign({}, MODES[this.mode] || MODES.race, o.rules || {});
    if (this.mode === 'versus' && o.versusMode === 'snipeout') Object.assign(this.rules, MODES.snipeout, { label: 'VERSUS SNIPEOUT' });
    this.laps = o.laps || this.rules.laps || 3;
    this.events = []; this.log = []; this.t = 0; this.clock = 0; this.stateT = 0; this.state = o.intro === false ? (o.flyingStart ? 'racing' : 'countdown') : 'intro';
    this.finishOrder = []; this.sealed = false; this.timers = []; this.zone = 1; this.zoneT = 0; this.endReason = null; this.paused = false;
    this.tune = SN.Tune.snapshot();
    this.weapons = new SN.Weapons(this);
    const T = this.track;
    this.ships = o.entrants.map((e, k) => {
      const s = new SN.Ship({ id: k, idx: k, pilot: e.pilot, team: e.team || SN.PILOTS[e.pilot].team, control: e.control, pi: e.pi, champion: e.champion });
      s.st = SN.craftStats(s.team, this.cls, e.champion); s.ghost = e.control === 'ghost'; s.drone = e.control === 'drone'; s.hubId = e.hubId; s.seatColor = e.color; s.label = e.label;
      return s;
    });
    this.humans = this.ships.filter(s => s.control === 'human');
    this.player = this.humans[0] || null;
    this.controls = this.humans.map(s => null);
    // the grid: slot by entrant order (the field is ordered by the caller: fastest at the front, the player at the back)
    let slot = 0;
    for (const s of this.ships) {
      if (s.ghost || s.drone) { s.putOn(T, 0, 0, 0); continue; }
      const g = T.grid[Math.min(7, slot++)];
      if (this.rules.flying || o.flyingStart) { s.putOn(T, (T.L - 300 * U) % T.L, 0, s.st.top * .8); s.p = -300 * U; }
      else { s.putOn(T, g.s, g.u, 0); s.p = T.dS(0, g.s); }
    }
    if (this.rules.flying || o.flyingStart) { this.state = o.intro === false ? 'racing' : this.state; }
    if (this.mode === 'overclock') for (const s of this.ships) s.topK = .75 + .06 * this.zone;
    this.recording = o.record !== false ? { seed: this.seed, track: T.id, cls: this.cls, mode: this.mode, laps: this.laps, difficulty: this.difficulty, tune: this.tune,
      entrants: o.entrants.map(e => Object.assign({}, e)), rules: o.rules || null, versusMode: o.versusMode || null, flyingStart: !!o.flyingStart, intro: o.intro !== false, drill: o.drill || 0, cheats: Object.assign({}, SN.cheats), skip: -1, frames: this.humans.map(() => []) } : null;
    this.n = 0;
    this.positions(); if (this.rules.init) this.rules.init(this);
    if (this.state === 'racing') this._go(true);
  }
  /** a random stream for one purpose ('pickup', 'ai:3'): the same seed gives the same numbers */
  rng(name) { return SN.rng((this.seed ^ SN.hashString(name)) >>> 0); }
  later(dt, fn) { this.timers.push({ at: this.clock + dt, fn }); }
  jumpAt(s) { const T = this.track; for (const J of T.jumps) { const a = T.dS(J.s0, s), b = T.dS(s, J.s1); if (a >= -20 && b >= -40 * U) return J; } return null; }
  jumpLipZ(s) { const T = this.track; for (const J of T.jumps) { const a = T.dS(J.s0, s), b = T.dS(s, J.s1); if (a >= -10 && b >= -400 * U) return Math.min(J.z0, J.z1); } return T.Cz[T.idx(s)]; }
  skipIntro() { if (this.state === 'intro') { this.state = 'grid'; this.stateT = 0; if (this.recording) this.recording.skip = this.n; } }
  /** a human's controls for this step (the race scene reads them from the inputs, the replay from its frames) */
  setControls(i, c) { this.controls[i] = c; }

  step(dt) {
    this.events.length = 0;
    if (this.paused) return;
    // the humans' controls, quantised exactly as the recording keeps them (so a replay gives the same race)
    const qc = this._qc || (this._qc = this.humans.map(() => SN.Controls.blank()));
    for (let i = 0; i < this.humans.length; i++) { const code = Race.encode(this.controls[i] || BLANK); Race.decode(code[0], code[1], qc[i]); this._recordCode(i, code); }
    this.n++; this.clock += dt; this.stateT += dt;
    for (const tm of this.timers) if (!tm.done && this.clock >= tm.at) { tm.done = true; tm.fn(); }
    if (this.timers.some(t => t.done)) this.timers = this.timers.filter(t => !t.done);
    const st = this.state;
    if (st === 'intro') { if (this.stateT >= 6) { this.state = 'grid'; this.stateT = 0; } this._holdGrid(dt); return; }
    if (st === 'grid') { if (this.stateT >= 1.5) { this.state = 'countdown'; this.stateT = 0; this._beep = 3; } this._holdGrid(dt); return; }
    if (st === 'countdown') {
      const ext = this.o.clock, tc = ext ? 3 + ext() / 1000 : this.stateT;
      if (ext && !isFinite(tc)) { this._holdGrid(dt); return; }
      const n = 3 - Math.floor(tc); if (n < this._beep && n > 0) { this._beep = n; this.events.push({ t: 'count', n }); }
      if (this._beep === undefined) this._beep = 4;
      this._holdGrid(dt, true);
      if (tc >= 3) this._go();
      return;
    }
    // racing (and finished: the field races on while the results wait)
    this.t += dt;
    const T = this.track, pl = this.player;
    let hi = 0;
    for (const s of this.ships) {
      if (s.ghost || s.drone) continue;
      if (s.elim) { if (s.respawnT > 0) { s.respawnT -= dt; if (s.respawnT <= 0) this._respawn(s); } continue; }
      let c;
      if (s.control === 'human') {
        c = qc[hi]; hi++;
        if (s.autoT > 0 || s.finished) c = SN.AI.controls(s, this, { skill: 1, weapons: s.autoT > 0 ? false : true });
      } else c = this._aiControls(s);
      // rubber band (AI only): a little faster behind the leading human, a little slower ahead
      if (s.control === 'ai' && this.rules.rubberBand && this.humans.length) {
        const ref = this.humans.reduce((a, b) => a.p > b.p ? a : b), rb = (SN.DIFFICULTY[this.difficulty] || SN.DIFFICULTY.Normal).rb * SN.Tune.T.aiRubberBand;
        s.topK = 1 + rb * E.clamp((ref.p - s.p) / 32000, -1, 1) * .04;
      }
      SN.Ship.step(s, c, dt, this);
      if (this.rules.weapons) this.weapons.use(s, c, dt);
    }
    SN.collide(this.ships, this);
    this.weapons.step(dt);
    for (const s of this.ships) this._lapStep(s, dt);
    this.positions();
    if (this.rules.step) this.rules.step(this, dt);
    this._modeStep(dt);
    if (this.state === 'racing' && this.humans.length && this.humans.every(h => h.finished || h.dnf)) this._playerDone();
    this._finishCheck(dt);
  }
  _aiControls(s) {
    const c = SN.AI.controls(s, this, this.rules.aiOpts ? this.rules.aiOpts(s) : {});
    const f = c.fire; c.firePressed = f && !s._aiFire; c.fireReleased = !f && s._aiFire; s._aiFire = f;
    return c;
  }
  _recordCode(i, code) {
    const R = this.recording; if (!R) return;
    const f = R.frames[i], last = f.length ? f[f.length - 1] : null;
    if (last && last[0] === code[0] && last[1] === code[1]) last[2]++; else f.push([code[0], code[1], 1]);
  }
  /** controls -> [analog word, button bits] (Int8 steer and pitch, Uint8 airbrakes; a bit each for the buttons) */
  static encode(c) {
    const b8 = x => Math.round(E.clamp(x, -1, 1) * 127) & 255, u8 = x => Math.round(E.clamp(x, 0, 1) * 255) & 255;
    const q = b8(c.steer) + b8(c.pitch) * 256 + u8(c.brakeL) * 65536 + u8(c.brakeR) * 16777216;
    const bits = (c.thrust ? 1 : 0) | (c.fire ? 2 : 0) | (c.firePressed ? 4 : 0) | (c.fireReleased ? 8 : 0) | (c.absorb ? 16 : 0) | (c.shiftL ? 32 : 0) | (c.shiftR ? 64 : 0) | (c.flick < 0 ? 128 : c.flick > 0 ? 256 : 0) | (c.camera ? 512 : 0) | (c.lookBack ? 1024 : 0);
    return [q, bits];
  }
  static decode(q, bits, o) {
    const s8 = x => ((x & 255) << 24 >> 24) / 127;
    o.steer = s8(q); o.pitch = s8(Math.floor(q / 256)); o.brakeL = (Math.floor(q / 65536) & 255) / 255; o.brakeR = (Math.floor(q / 16777216) & 255) / 255;
    o.thrust = bits & 1 ? 1 : 0; o.fire = !!(bits & 2); o.firePressed = !!(bits & 4); o.fireReleased = !!(bits & 8); o.absorb = !!(bits & 16);
    o.shiftL = !!(bits & 32); o.shiftR = !!(bits & 64); o.flick = bits & 128 ? -1 : bits & 256 ? 1 : 0; o.camera = !!(bits & 512); o.lookBack = !!(bits & 1024);
    return o;
  }
  _holdGrid(dt, revs) {
    // the field waits on the grid; the launch revs build while thrust is held (humans) or by plan (AI)
    for (const s of this.ships) {
      if (s.ghost || s.drone) continue;
      s.savePrev();
      if (!revs) continue;
      let held = false;
      if (s.control === 'human') { const c = this._qc[this.humans.indexOf(s)]; held = !!(c && c.thrust); }
      else { const A = s._rev || (s._rev = { at: 1.6 + this.rng('rev:' + s.idx)() * 1.2 }); held = this.stateT > A.at; }
      s.revs = held ? Math.min(1, s.revs + .6 * dt) : Math.max(0, s.revs - .8 * dt);
    }
  }
  _go(silent) {
    this.state = 'racing'; this.stateT = 0; this.t = 0;
    if (!silent) this.events.push({ t: 'go' });
    for (const s of this.ships) {
      if (s.ghost || s.drone) continue;
      s.lapT0 = 0;
      if (s.revs >= .72 && s.revs <= .88) { s.boostT = 1; s.boostMul = 1.25; this.events.push({ t: 'perfectstart', ship: s }); }
      else if (s.revs > .95) { s.stallT = .5; this.events.push({ t: 'stall', ship: s }); }
      s.revs = 0;
    }
  }
  _lapStep(s, dt) {
    if (s.ghost || s.drone || s.elim) return;
    const T = this.track, L = T.L;
    // sectors in order, then the line forward: a lap
    const sec = Math.floor((((s.p % L) + L) % L) / (L / 8));
    if (s.p >= 0 && sec === s.sector + 1) s.sector = sec;
    if (!s.started && s.p >= 0) { s.started = true; if (this.rules.flying) s.lapT0 = this.t; s.sector = 0; }
    const done = s.lapsDone || 0;
    if (s.started && s.p >= (done + 1) * L && s.sector >= 7) {
      s.lapsDone = done + 1; s.sector = 0;
      const lt = this.t - s.lapT0; s.lastLap = lt; s.laps.push(lt); s.lapT0 = this.t;
      const best = lt < s.bestLap; if (best) s.bestLap = lt;
      this.events.push({ t: 'lap', ship: s, lap: s.lapsDone, time: lt, best });
      if (!this.rules.endRun && s.lapsDone === this.laps - 1 && !s.finished) this.events.push({ t: 'finallap', ship: s });
      if (!this.rules.endRun && s.lapsDone >= this.laps && !s.finished && !this.rules.target) this._finish(s);
      if (this.rules.endRun && this.mode === 'hotlap' && s.lapsDone >= this.laps && !s.finished) this._finish(s);
    }
    s.lap = Math.min(this.laps, (s.lapsDone || 0) + 1);
    // wrong way (humans)
    if (s.control === 'human' && !s.rescue) {
      const tf = T.frameAt(s.s, this._wf || (this._wf = undefined)); this._wf = tf;
      const back = V.dot(s.F, tf.F) < -.2 && s.speed > 300;
      s.wrongT = back ? s.wrongT + dt : 0;
      const was = s.wrong; s.wrong = s.wrongT > 1.2;
      if (s.wrong && !was) this.events.push({ t: 'wrongway', ship: s });
    }
  }
  _finish(s) {
    s.finished = true; s.finishT = this.t; this.finishOrder.push(s);
    this.events.push({ t: 'finish', ship: s, place: this.finishOrder.length, time: this.t });
    if (s.control === 'human' && this.humans.every(h => h.finished || h.dnf)) this._playerDone();
  }
  _playerDone() { if (this.state === 'racing') { this.state = 'finished'; this.stateT = 0; this.events.push({ t: 'racedone' }); } }
  /** order: finished by time, then progress; DNF last */
  positions() {
    const list = this.ships.filter(s => !s.drone && !s.hidden);
    const key = s => this.rules.target ? s.points * 1e9 + s.stats.kills * 1e7 + s.p : s.dnf ? -1e12 + s.p : s.finished ? 1e12 - s.finishT * 1000 : s.p;
    list.sort((a, b) => key(b) - key(a) || a.idx - b.idx);
    list.forEach((s, i) => { const was = s.place; s.place = i + 1; if (was && was !== s.place && s.control === 'human' && this.state === 'racing') this.events.push({ t: 'position', ship: s, from: was, to: s.place }); });
    this.order = list;
    return list;
  }
  eliminate(s, by, cause) {
    if (s.elim) return;
    s.elim = true; s.energy = 0; s.weapon = null; s.siphon = null; s.shieldT = 0; s.autoT = 0; s.boostT = 0;
    const sniped = cause === 'rail';
    this.events.push({ t: 'elim', ship: s, by: by || null, cause, sniped, x: s.P[0], y: s.P[1], z: s.P[2] });
    if (by && by !== s) { by.stats.kills++; if (this.rules.onElim) this.rules.onElim(this, by, s, sniped); }
    if (this.rules.respawn) s.respawnT = 3;
    else if (this.mode === 'overclock') { this.endReason = 'energy'; s.dnf = false; this._finish(s); }
    else { s.dnf = true; if (s.control === 'human' && this.humans.every(h => h.finished || h.dnf)) this._playerDone(); }
  }
  _respawn(s) {
    const T = this.track; s.elim = false; s.energy = 100; s.invT = 2;
    const sOld = s.s, at = (s.sGood + 10 * U) % T.L; s.putOn(T, at, 0, s.st.top * .3); s.p += T.dS(sOld, at);
    this.events.push({ t: 'respawn', ship: s });
  }
  _modeStep(dt) {
    const R = this.rules;
    if (this.mode === 'overclock' && this.state === 'racing') {
      this.zoneT += dt;
      const per = R.zoneTime || 12;
      if (this.zoneT >= per) { this.zoneT -= per; this.zoneUp(); }
    }
    if (R.target && this.state === 'racing') {
      const leader = this.ships.filter(s => !s.ghost && !s.drone).reduce((a, b) => b.points > a.points ? b : a);
      if (leader.points >= R.target || this.t >= R.timeLimit) this._endScore(leader.points >= R.target ? 'target' : 'time');
    }
  }
  zoneUp(n = 1) {
    for (let k = 0; k < n; k++) {
      this.zone++;
      for (const s of this.ships) { s.topK = .75 + .06 * this.zone; if (!s.elim) s.energy = Math.min(100, s.energy + 5); }
      this.events.push({ t: 'zone', n: this.zone });
    }
  }
  _endScore(why) {
    this.endReason = why;
    const list = this.ships.filter(s => !s.ghost && !s.drone).sort((a, b) => b.points - a.points || b.stats.kills - a.stats.kills || b.p - a.p);
    for (const s of list) if (!s.finished) { s.finished = true; s.finishT = this.t; this.finishOrder.push(s); }
    this.events.push({ t: 'scoreend', why });
    this._playerDone(); this.state = 'finished'; this.stateT = 0;
  }
  /** end the run now (Overclock, Hot Lap: the pause menu's End run): counts as finishing */
  endRun() {
    if (this.sealed) return;
    for (const h of this.humans) if (!h.finished) { this.endReason = 'ended'; this._finish(h); }
    this._playerDone();
  }
  _finishCheck(dt) {
    if (this.state !== 'finished' || this.sealed) return;
    const all = this.ships.every(s => s.ghost || s.drone || s.finished || s.dnf);
    if (all || this.stateT >= (this.rules.solo ? 1.5 : 8)) this.seal();
  }
  /** seal the results: the unfinished get an estimated time from their remaining distance */
  seal() {
    if (this.sealed) return;
    const T = this.track;
    for (const s of this.ships) {
      if (s.ghost || s.drone || s.finished || s.dnf) continue;
      const rest = Math.max(0, this.laps * T.L - s.p), avg = Math.max(200, s.p / Math.max(1, this.t));
      s.finished = true; s.estimated = true; s.finishT = this.t + rest / avg; this.finishOrder.push(s);
    }
    this.positions(); this.sealed = true; this.state = 'results'; this.stateT = 0;
    this.events.push({ t: 'sealed' });
    if (this.recording) { this.recording.hash = this.hash(); this.recording.steps = this.n; }
  }
  /** the results: one row per craft, in order */
  results() {
    const list = this.positions(), lead = list[0];
    return list.map((s, i) => ({ place: i + 1, ship: s, pilot: s.pilot, name: s.name, team: s.team, human: s.control === 'human', pi: s.pi,
      time: s.dnf ? null : s.finishT, gap: s.dnf || !lead || i === 0 ? 0 : s.finishT - lead.finishT, bestLap: s.bestLap, points: s.points, dnf: s.dnf, estimated: !!s.estimated, zone: this.zone, kills: s.stats.kills, hits: s.stats.hits }));
  }
  /** FNV-1a over every craft's (p, u, h, speed, energy, lap) and every shot's (s, u) */
  hash() {
    const list = [];
    for (const s of this.ships) list.push(s.p, s.u, s.h, s.speed, s.energy, s.lapsDone || 0, s.points);
    this.weapons.hashList(list);
    return SN.hashNumbers(list);
  }
}
SN.Race = Race;

/* ---- SNIPEOUT scoring: +1 a hit, +3 an elimination, +1 more by RAILSHOT (SNIPED) ---- */
MODES.snipeout.onHit = (R, by, target) => { if (by !== target) by.points += 1; };
MODES.snipeout.onElim = (R, by, target, sniped) => { by.points += 3 + (sniped ? 1 : 0); R.events.push({ t: 'points', ship: by, n: 3 + (sniped ? 1 : 0), sniped }); };
MODES.hub.onElim = null;

/* ---- the field: who races (every team, the rival always, the player's teammate; AI by skill, the player last) ---- */
SN.field = (o) => {
  const { humans = [], size = 8, difficulty = 'Normal' } = o;
  const used = new Set(humans.map(h => h.pilot)), teams = new Set(humans.map(h => h.team)), rival = SN.rivalFor(humans[0] ? humans[0].team : 'kestrel');
  const ai = [];
  const add = id => { if (!used.has(id) && ai.length < size - humans.length) { used.add(id); ai.push(id); } };
  for (const h of humans) for (const p of SN.TEAMS[h.team].pilots) add(p);   // the teammate
  add(rival);
  for (const t of SN.TEAM_ORDER) if (!teams.has(t) && !ai.some(p => SN.PILOTS[p].team === t)) add(SN.TEAMS[t].pilots[o.seed ? (o.seed + t.length) % 2 : 0]);
  for (const p of SN.PILOT_ORDER) add(p);
  ai.sort((a, b) => (SN.PILOTS[b].skill + (SN.PILOTS[b].team === 'nullset' ? .02 : 0)) - (SN.PILOTS[a].skill + (SN.PILOTS[a].team === 'nullset' ? .02 : 0)) || SN.PILOT_ORDER.indexOf(a) - SN.PILOT_ORDER.indexOf(b));
  return ai.map(p => ({ pilot: p, team: SN.PILOTS[p].team, control: 'ai' })).concat(humans.map((h, i) => ({ pilot: h.pilot, team: h.team, control: 'human', pi: i, champion: h.champion })));
};

/* ---- ACADEMY: eleven drills at Port Solenne, SPARK, solo ---- */
const DRILLS = SN.DRILLS = [
  { id: 'thrust', name: 'THRUST', text: 'Hold {thrust} to thrust. Reach 250 km/h.', start: { grid: true } },
  { id: 'steer', name: 'STEER', text: 'Steer with {steer} through the three gates.', start: { cp: 1, d: 60, v: 200 } },
  { id: 'brakes', name: 'AIRBRAKES', text: 'Squeeze {brakeL} or {brakeR} through the lighthouse hairpin. Stay off the walls.', start: { cp: 18, d: -150, v: 220 } },
  { id: 'pitch', name: 'PITCH', text: 'Downhill: hold {noseDown} to pitch the nose down and gain speed.', start: { cp: 10, d: 0, v: 200 } },
  { id: 'pads', name: 'SPEED PADS', text: 'Blue chevrons boost you. Hit two speed pads.', start: { cp: 16, d: -100, v: 200 } },
  { id: 'weapons', name: 'WEAPONS', text: 'Amber pads arm you. Collect a weapon, then fire {fire} at the target drone.', start: { cp: 2, d: -100, v: 220 } },
  { id: 'absorb', name: 'ABSORB', text: 'Not every weapon is worth firing. Collect one and absorb it with {absorb}.', start: { cp: 11, d: -100, v: 200 } },
  { id: 'shift', name: 'SIDE-SHIFT', text: 'Mines ahead. Side-shift with {shiftL} or {shiftR} to slip past.', start: { cp: 15, d: -200, v: 220 } },
  { id: 'roll', name: 'BARREL ROLL', text: 'Off the Harbour Step, flick {steer} left-right, or press {shiftL} / {shiftR} in the air. Land the roll for a boost.', start: { cp: 11, d: -100, v: 300 } },
  { id: 'pit', name: 'PIT LANE', text: 'Shield low. Ride the green pit strip to recharge to full.', start: { cp: 21, d: 0, v: 200, energy: 40 } },
  { id: 'lap', name: 'FULL LAP', text: 'Put it together. One lap under sixty seconds.', start: { grid: true } }
];
MODES.academy.init = R => {
  const A = R.academy = { i: R.o.drill || 0, state: 'card', t: 0, tries: 0, firstTry: [], passed: [], retries: 0, msg: null };
  R.state = 'racing'; R.stateT = 0; R.t = 0;
  SN.Academy.begin(R);
};
MODES.academy.forcePickup = (ship, W) => { const A = W.race.academy; if (!A) return null; const d = DRILLS[A.i]; return d.id === 'weapons' ? 'swarm' : d.id === 'absorb' ? 'mine' : null; };
MODES.academy.step = (R, dt) => SN.Academy.step(R, dt);
SN.Academy = {
  begin(R) {
    const A = R.academy, d = DRILLS[A.i], T = R.track, s = R.player;
    A.state = 'go'; A.t = 0; A.data = { gates: 0, pads: 0, held: 0, pitchT: 0, v0: 0, wall: false, hit: false, shifted: -9, mineHit: false, picked: false, lap0: 0 };
    R.weapons.shots.length = 0; R.weapons.mines.length = 0; s.weapon = null; s.energy = d.start.energy || 100; s.siphon = null; s.boostT = 0;
    for (const o of R.ships) if (o.drone) { o.hidden = true; o.elim = false; }
    if (d.start.grid) { const g = T.grid[3]; s.putOn(T, g.s, 0, 0); s.p = T.dS(0, g.s); s.lapsDone = 0; s.started = false; s.sector = 0; }
    else { const at = T.sOf({ cp: d.start.cp, d: d.start.d }), sOld = s.s; s.putOn(T, at, Tr0(T, at), d.start.v / SN.KMH); s.p += T.dS(sOld, at); }
    A.data.v0 = s.speed; A.data.s0 = s.s;
    if (d.id === 'weapons') { const dr = R.ships.find(o => o.drone); if (dr) { dr.hidden = false; dr.energy = 100; dr.elim = false; const ds = T.sOf({ cp: 3, d: 100 }); dr.putOn(T, ds, 0, 0); dr.droneHP = 30; } }
    if (d.id === 'shift') {
      // three mines across two thirds of the width; the gap is the last third, on the side away from the racing line
      const ms = T.sOf({ cp: 15, d: 40 }), hw = T.hw[T.idx(ms)], line = T.line(ms), gapSide = line > 0 ? -1 : 1;
      for (const f of [-.78, -.33, .11]) R.weapons.mines.push({ kind: 'mine', owner: null, s: ms, u: gapSide * f * hw, h: 8, armT: 0, life: 60, dmg: 6, id: R.weapons.nextId++, drill: true });
      A.data.mineS = ms; A.data.gapSide = gapSide;
    }
    if (d.id === 'lap') { s.lapsDone = 0; s.started = false; A.data.lap0 = 0; }
    R.events.push({ t: 'drill', id: d.id, phase: 'start', i: A.i });
  },
  step(R, dt) {
    const A = R.academy; if (!A || A.state === 'done') return;
    const d = DRILLS[A.i], s = R.player, T = R.track, D = A.data, kmh = s.speed * SN.KMH;
    A.t += dt;
    if (A.state === 'pass' || A.state === 'fail') { if (A.t > 2) { if (A.state === 'pass') { A.i++; if (A.i >= DRILLS.length) { A.state = 'done'; R.events.push({ t: 'academydone' }); R.endRun(); return; } } else { A.retries++; } A.tries = A.state === 'pass' ? 0 : A.tries + 1; SN.Academy.begin(R); } return; }
    const pass = () => { A.state = 'pass'; A.t = 0; if (A.tries === 0) A.firstTry.push(d.id); A.passed.push(d.id); R.events.push({ t: 'drill', id: d.id, ok: true, i: A.i }); };
    const fail = why => { A.state = 'fail'; A.t = 0; A.msg = why; R.events.push({ t: 'drill', id: d.id, ok: false, why, i: A.i }); };
    for (const e of R.events) { if (e.ship !== s) continue; if (e.t === 'wall') D.wall = true; if (e.t === 'pad' && e.kind === 'speed') D.pads++; if (e.t === 'hit') D.hit = true; if (e.t === 'pickup') D.picked = true; if (e.t === 'sideshift') D.shifted = A.t; if (e.t === 'rescue') { fail('RESCUED'); return; } }
    const ds = T.dS(D.s0, s.s);
    switch (d.id) {
      case 'thrust': if (kmh >= 250) pass(); else if (A.t > 20) fail('TOO SLOW'); break;
      case 'steer': {
        const gs = [0, 1, 2].map(k => ({ s: (D.s0 + (60 + 100 * k) * U) % T.L, u: [-4, 4, -4][k] * U }));
        A.gates = gs;
        const g = gs[D.gates]; if (g && Math.abs(T.dS(g.s, s.s)) < 40) { if (Math.abs(s.u - g.u) <= 3.5 * U) { D.gates++; R.events.push({ t: 'gate', n: D.gates }); } else fail('MISSED A GATE'); }
        if (D.gates >= 3) pass(); else if (ds > 400 * U || A.t > 20) fail('MISSED A GATE');
        break;
      }
      case 'brakes': {
        if (Math.max(s.lastBrake[0], s.lastBrake[1]) > .3) D.held += dt;
        if (D.wall) { fail('WALL CONTACT'); break; }
        if (ds > 330 * U) { if (D.held >= .5 && kmh >= 150) pass(); else fail(D.held < .5 ? 'USE THE AIRBRAKES' : 'TOO SLOW ON EXIT'); }
        else if (A.t > 25) fail('TOO SLOW');
        break;
      }
      case 'pitch': if (s.lastPitch >= .5) D.pitchT += dt; if (D.pitchT >= 1 && kmh >= D.v0 * SN.KMH + 15) pass(); else if (ds > 260 * U || A.t > 15) fail('NOSE DOWN ON THE DESCENT'); break;
      case 'pads': if (D.pads >= 2) pass(); else if (ds > 1000 * U || A.t > 30) fail('MISSED THE PADS'); break;
      case 'weapons': { const dr = R.ships.find(o => o.drone); if (dr && dr.droneHit) { dr.droneHit = false; pass(); } else if (dr && T.dS(dr.s, s.s) > 200 * U) fail('MISSED THE DRONE'); else if (A.t > 30) fail('TOO SLOW'); break; }
      case 'absorb': if (R.events.some(e => e.t === 'absorb' && e.ship === s)) pass(); else if (ds > 900 * U || A.t > 25) fail(D.picked ? 'ABSORB IT' : 'MISSED THE PAD'); break;
      case 'shift': {
        if (R.events.some(e => e.t === 'hit' && e.ship === s && e.weapon === 'mine')) { fail('HIT A MINE'); break; }
        if (T.dS(D.mineS, s.s) > 30 * U) { if (A.t - D.shifted < 1.5 + (T.dS(D.mineS, s.s) / Math.max(200, s.speed))) pass(); else fail('SIDE-SHIFT PAST THEM'); }
        else if (A.t > 20) fail('TOO SLOW');
        break;
      }
      case 'roll': { const r = R.events.find(e => e.t === 'roll' && e.ship === s); if (r) { if (r.ok) pass(); else fail('BOTCHED: LAND THE ROLL'); } else if (s.grounded && ds > 500 * U) fail('ROLL IN THE AIR'); else if (A.t > 20) fail('TOO SLOW'); break; }
      case 'pit': if (s.energy >= 99) pass(); else if (ds > 700 * U || A.t > 30) fail('STAY IN THE GREEN STRIP'); break;
      case 'lap': { const l = R.events.find(e => e.t === 'lap' && e.ship === s); if (l) { if (l.time <= 60) pass(); else fail('OVER SIXTY SECONDS'); } else if (A.t > 90) fail('OVER SIXTY SECONDS'); break; }
    }
  },
  medal(A) { return A.firstTry.length >= DRILLS.length ? 'gold' : A.retries <= 3 ? 'silver' : 'bronze'; }
};
function Tr0(T, s) { return E.clamp(T.line(s) * .5, -T.hw[T.idx(s)] * .5, T.hw[T.idx(s)] * .5); }

// the target drone: a hovering ring that any weapon hit counts on
SN.on('drone-hit', () => {});
const _hit = SN.Weapons.prototype.hit;
SN.Weapons.prototype.hit = function (target, by, weapon, dmg, o) {
  if (target.drone) { target.droneHit = true; this.race.events.push({ t: 'hit', ship: target, by, weapon, dmg, x: target.P[0], y: target.P[1], z: target.P[2] }); if (by) by.stats.hits++; return dmg; }
  return _hit.call(this, target, by, weapon, dmg, o);
};
})();
