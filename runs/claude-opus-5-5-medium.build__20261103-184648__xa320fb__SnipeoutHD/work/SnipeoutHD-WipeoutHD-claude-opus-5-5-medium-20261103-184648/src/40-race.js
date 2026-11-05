// The race director (§3.3): lifecycle (intro, grid, countdown with launch revs, racing, finished), laps and sectors,
// positions, wrong way, elimination (DNF or respawn), every mode's rules, rubber band, results, recording and the hash
(() => {
const SN = globalThis.SN, V = SN.V;
const MODES = {
  race:     { weapons: true, rubber: true, elim: 'dnf', laps: 3, field: 8 },
  timetrial:{ weapons: false, rubber: false, elim: 'dnf', laps: 3, field: 1, speedPads: true },
  hotlap:   { weapons: false, rubber: false, elim: 'dnf', laps: 99, field: 1, flying: true },
  snipeout: { weapons: true, rubber: false, elim: 'respawn', laps: 99, field: 8, target: 10, limit: 300 },
  overclock:{ weapons: false, rubber: false, elim: 'end', laps: 999, field: 1, speedPads: false, autoThrust: true, zoneT: 12 },
  academy:  { weapons: true, rubber: false, elim: 'respawn', laps: 99, field: 1 },
  hub:      { weapons: true, rubber: false, elim: 'respawn', laps: 3, field: 8 }
};
SN.MODES = MODES;
SN.MODE_NAMES = { race: 'RACE', timetrial: 'TIME TRIAL', hotlap: 'HOT LAP', snipeout: 'SNIPEOUT', overclock: 'OVERCLOCK', academy: 'ACADEMY', hub: 'GHOST RACE', gp: 'GRAND PRIX', versus: 'VERSUS' };

class Race {
  /** o: { track, mode, cls, laps, seed, entrants: [{ pilot, team, control: 'human'|'ai', player }], rules, attract, intro, replay, tune, cheats, difficulty } */
  constructor(o) {
    this.o = o; this.track = typeof o.track === 'string' ? SN.getTrack(o.track) : o.track;
    this.mode = o.mode || 'race'; this.cls = o.cls || 'spark'; this.seed = (o.seed ?? 1) >>> 0;
    this.rules = Object.assign({}, MODES[this.mode] || MODES.race, o.rules || {});
    this.laps = o.laps || this.rules.laps; this.attract = !!o.attract; this.hub = !!o.hub;
    this.difficulty = SN.DIFFICULTY[o.difficulty || 'Normal'] || SN.DIFFICULTY.Normal;
    this._rngs = {}; this.events = []; this.log = []; this.t = -3; this.state = o.intro === false ? 'countdown' : 'intro'; this.stateT = 0; this.steps = 0;
    this.cheats = Object.assign({ god: false, infiniteWeapon: false, giveWeapon: null, aiWeaponsOff: false, freezeAI: false, ghostAI: false }, o.cheats || {});
    if (o.tune) SN.Tune.load(o.tune);
    this.tune = SN.Tune.snapshot();
    this.weapons = new SN.Weapons(this);
    this.ships = (o.entrants || []).map((e, i) => {
      const p = SN.PILOT[e.pilot] || {}, sk = e.control === 'ai' ? Math.min(1.05, this.difficulty.skill + (p.skill || 0) + (p.team === 'nullset' ? .02 : 0)) : 1;
      return SN.Ship.make(this, { i, pilot: e.pilot, team: e.team, control: e.control, player: e.player, skill: e.skill ?? sk, aggr: (p.aggr || 1) * this.difficulty.aggr, ghost: e.ghost });
    });
    this.humans = this.ships.filter(s => s.control === 'human');
    this.zone = 1; this.zoneT = 0; this.flyingDone = false; this.finishT = 0; this.sealed = false; this.timeLimit = this.rules.limit || 0;
    if (this.mode === 'snipeout') this.target = o.target || this.rules.target;
    // the grid: humans at the back (the source's way), AI by skill
    const order = this.ships.slice().sort((a, b) => (a.control === 'human') - (b.control === 'human') || b.skill - a.skill);
    order.forEach((sh, k) => { const g = this.track.grid[Math.min(k, 7) + (k >= 8 ? 0 : 0)]; SN.Ship.place(sh, this, g.s, g.u, 0); sh.p = this.progressOf(sh, true); });
    if (this.rules.flying) for (const sh of this.ships) { const s0 = SN.wrap(-300 * 16, this.track.L); SN.Ship.place(sh, this, s0, 0, sh.st.top * .8); sh.p = this.progressOf(sh, true); }
    this.frames = []; this.replay = o.replay || null; this.replayI = 0;
    this.getHuman = o.getHuman || null;
    this.positions(); this.events.length = 0;
  }
  rng(name) { return this._rngs[name] || (this._rngs[name] = SN.rng(this.seed ^ SN.hashString(name))); }
  emit(e) { e.at = this.t; this.events.push(e); }
  /** continuous progress: lap * L + s (laps counted from the line; the grid is just behind it) */
  progressOf(sh, init) {
    if (init) { const ds = SN.wrapDiff(0, sh.s, this.track.L); return ds; }
    return sh.p;
  }
  skipIntro() { if (this.state === 'intro') { this.state = 'grid'; this.stateT = 0; this.skipAt = this.steps; } }
  get going() { return this.state === 'racing' || this.state === 'finished'; }
  /** one fixed step of the whole race */
  step(dt) {
    if (this.replay && this.replay.skipAt !== undefined && this.steps === this.replay.skipAt) this.skipIntro();
    this.events.length = 0; this.steps++;
    const T = this.track, L = T.L;
    // lifecycle
    this.stateT += dt;
    if (this.state === 'intro' && this.stateT >= 6) { this.state = 'grid'; this.stateT = 0; }
    if (this.state === 'grid' && this.stateT >= 1.5) { this.state = 'countdown'; this.stateT = 0; this.t = -3; }
    if (this.state === 'countdown') {
      const before = this.t; this.t = this.externalClock ? this.externalClock() : this.t + dt;
      if (Math.floor(before) !== Math.floor(this.t) && this.t < 0) this.emit({ t: 'count', n: -Math.floor(this.t) });
      if (this.t >= 0) { this.state = 'racing'; this.stateT = 0; this.emit({ t: 'go' }); this.launch(); }
    } else if (this.going) this.t = this.externalClock ? Math.max(this.t, this.externalClock()) : this.t + dt;
    // controls, physics, weapons
    const frame = [];
    for (const sh of this.ships) {
      let c = this.controlsFor(sh, frame);
      if (this.state === 'countdown' && sh.control === 'human') this.revs(sh, c, dt);
      if (this.state === 'countdown' && sh.control !== 'human') sh.revs = .8;
      if (this.rules.autoThrust && this.state === 'racing') c.thrust = 1;
      if (this.rules.flying && !this.flyingDone && this.state !== 'racing') { c = Object.assign({}, c, { thrust: 1 }); }
      if (sh.control === 'ai' && this.cheats.freezeAI) { c = { steer: 0, pitch: 0, thrust: 0, brakeL: 1, brakeR: 1 }; }
      sh.ctl = c;
      SN.Ship.step(sh, c, dt, this);
      if (this.going) this.weapons.use(sh, c);
      if (this.attract) { sh.energy = 100; }
    }
    if (this.recording !== false && this.humans.length && !this.replay) this.frames.push(frame);
    SN.Ship.collide(this);
    this.weapons.step(dt);
    // progress, laps, wrong way, rubber band
    for (const sh of this.ships) {
      if (sh.rescueT > 0 || sh.elim) continue;
      const ds = SN.wrapDiff(sh._lastS ?? sh.s, sh.s, L); sh._lastS = sh.s;
      const p0 = sh.p; if (Math.abs(ds) < L / 4) sh.p += ds;
      if (this.rules.flying && p0 < 0 && sh.p >= 0) sh.lapStart = this.t;   // (a flying lap is timed from the line)
      sh.sector = Math.floor(SN.wrap(sh.s, L) / (L / 8));
      if (this.going && !sh.finished) {
        while (sh.p >= (sh.lap + 1) * L) this.lapDone(sh);
        const fr = T.frameAt(sh.s), back = V.dot(sh.F, fr.F) < -.2 && SN.Ship.speed(sh) > 300;
        sh.wrongT = back ? sh.wrongT + dt : 0;
        if (sh.wrongT > 1.2 && !sh.wrongWay) { sh.wrongWay = true; this.emit({ t: 'wrongway', ship: sh }); }
        if (!back) sh.wrongWay = false;
      }
    }
    if (this.rules.rubber && this.humans.length && this.going) {
      const pp = Math.max(...this.humans.map(h => h.p)), rb = this.difficulty.rb * SN.Tune.T.aiRubberBand;
      for (const sh of this.ships) if (sh.control === 'ai') sh.topMul = (this.difficulty.top || 1) * (1 + rb * Math.max(-1, Math.min(1, (pp - sh.p) / 32000)) * .04);
    }
    if (this.mode === 'overclock' && this.state === 'racing') this.overclock(dt);
    if (this.mode === 'snipeout' && this.going && !this.sealed) {
      const lead = this.ships.reduce((a, b) => b.points > a.points ? b : a);
      if (lead.points >= this.target || this.t >= this.timeLimit) this.finishAll();
    }
    this.positions();
    // the end: when the humans are done, the rest get 8 s (or are estimated)
    if (this.state === 'racing' && this.humans.length && this.humans.every(h => h.finished || h.elim && this.rules.elim !== 'respawn')) { this.state = 'finished'; this.stateT = 0; this.emit({ t: 'raceOver' }); }
    if (this.state === 'racing' && !this.humans.length && this.ships.every(s => s.finished || s.elim)) { this.state = 'finished'; this.stateT = 0; }
    if (this.state === 'finished' && !this.sealed && (this.stateT > 8 || this.ships.every(s => s.finished || s.dnf))) this.seal();
    if (this.state === 'finished' && this.sealed && this.stateT > 10) this.state = 'results';
    this.log.push(...this.events.filter(e => e.t !== 'scrape' && e.t !== 'bolt'));
    if (this.log.length > 4000) this.log.splice(0, this.log.length - 3000);
  }
  /** the controls for one craft this step (and the frame for the recording) */
  controlsFor(sh, frame) {
    let c;
    if (sh.control === 'human') {
      if (this.replay) { c = this.replayFrame(sh); }
      else { c = this.getHuman ? this.getHuman(sh) : SN.Input ? SN.Input.controls(sh.player) : {}; const pk = SN.Replay.pack(c); if (frame) frame.push(pk); c = SN.Replay.unpack(pk); }   // (the sim runs on exactly what the replay will see)
      if (sh.autoT > 0) { const a = SN.AI.controls(sh, this, { skill: 1, weapons: false }); a.absorb = 0; c = a; }
    } else c = sh.drone ? { steer: 0, pitch: 0, thrust: 0, brakeL: 1, brakeR: 1 } : SN.AI.controls(sh, this, this.attract ? { cheat: true } : {});
    return c;
  }
  replayFrame(sh) {
    const fr = this.replay.frames[this.steps - 1]; const k = this.humans.indexOf(sh);
    return fr && fr[k] ? SN.Replay.unpack(fr[k]) : { steer: 0, pitch: 0, thrust: 0 };
  }
  /** launch revs during the countdown: hold thrust to rev; GO in the window = PERFECT START, too high = STALL */
  revs(sh, c, dt) { sh.revs = Math.max(0, Math.min(1, sh.revs + (c.thrust ? .6 : -.8) * dt)); }
  launch() {
    for (const sh of this.ships) {
      if (sh.control !== 'human') { sh.boostT = .3; sh.boostMul = 1.1; continue; }
      if (sh.revs >= .72 && sh.revs <= .88) { sh.boostT = 1; sh.boostMul = 1.25; sh.launchBoost = 1; this.emit({ t: 'perfect', ship: sh }); }
      else if (sh.revs > .95) { sh.stallT = .5; this.emit({ t: 'stall', ship: sh }); }
    }
    if (this.rules.flying) this.flyingDone = true;
  }
  lapDone(sh) {
    sh.lap++;
    const time = this.t - sh.lapStart; sh.lapStart = this.t;
    const valid = !(this.rules.flying && sh.lap === 1 && this.flyingStart === undefined && false);
    sh.lapTimes.push(time);
    const best = time < sh.bestLap; if (best) sh.bestLap = time;
    this.emit({ t: 'lap', ship: sh, lap: sh.lap, time, best });
    if (this.mode === 'hotlap' && sh.lap >= 10) this.finish(sh);
    else if (sh.lap >= this.laps && this.mode !== 'snipeout' && this.mode !== 'overclock' && this.mode !== 'academy') this.finish(sh);
    else if (sh.lap === this.laps - 1 && this.laps > 1 && this.mode !== 'hotlap' && this.mode !== 'snipeout') this.emit({ t: 'finalLap', ship: sh });
  }
  finish(sh) {
    if (sh.finished) return;
    sh.finished = true; sh.finishTime = this.t;
    const place = this.ships.filter(s => s.finished).length;
    this.emit({ t: 'finish', ship: sh, place, time: this.t });
  }
  finishAll() { for (const sh of this.ships) if (!sh.finished) { sh.finished = true; sh.finishTime = this.t; } this.emit({ t: 'snipeoutEnd' }); if (this.state === 'racing') { this.state = 'finished'; this.stateT = 0; } this.seal(); }
  /** End run (Hot Lap, Overclock): counts as finishing */
  endRun() { for (const sh of this.humans) this.finish(sh); if (this.state === 'racing') { this.state = 'finished'; this.stateT = 0; } this.seal(); }
  seal() {
    if (this.sealed) return; this.sealed = true;
    for (const sh of this.ships) if (!sh.finished && !sh.dnf) {   // an estimated time: the distance left at its average speed
      const left = this.laps * this.track.L - sh.p, avg = Math.max(300, sh.p / Math.max(1, this.t));
      sh.finishTime = this.t + Math.max(0, left) / avg; sh.estimated = true; sh.finished = true;
    }
    this.positions();
  }
  positions() {
    const was = this.ships.map(s => s.place);
    const order = this.ships.slice().sort((a, b) => {
      if (this.mode === 'snipeout') return b.points - a.points || b.p - a.p;
      if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return b.p - a.p;
    });
    order.forEach((s, k) => { s.place = k + 1; });
    if (this.going) this.ships.forEach((s, i) => { if (s.control === 'human' && was[i] !== s.place && !s.finished) this.emit({ t: 'pos', ship: s, from: was[i], to: s.place }); });
    this.order = order;
  }
  onHit(tg, by, weapon, killed) {
    if (this.mode === 'snipeout' && by && by !== tg && this.going && !this.sealed) { by.points += 1; if (killed) { by.points += 3; by.kills++; if (weapon === 'rail') { by.points += 1; this.emit({ t: 'sniped', ship: tg, by }); } } }
    else if (killed && weapon === 'rail') this.emit({ t: 'sniped', ship: tg, by });
  }
  onElim(sh, by, cause) {
    const how = this.rules.elim;
    if (how === 'respawn' || this.attract) { sh.respawnT = 3; }
    else if (how === 'end') { sh.dnf = true; if (sh.control === 'human') this.endRun(); }
    else { sh.dnf = true; sh.finished = false; }
  }
  respawn(sh) {
    const s = sh.lastGood; SN.Ship.place(sh, this, SN.wrap(s, this.track.L), 0, 0);
    sh.elim = false; sh.energy = 100; sh.invT = 2; sh.respawnT = 0; sh.stagger = 0;
    this.emit({ t: 'respawn', ship: sh });
  }
  overclock(dt) {
    this.zoneT += dt;
    const per = this.rules.zoneT * (this.attract ? 1 / 6 : 1);
    while (this.zoneT >= per) {
      this.zoneT -= per; this.zone++;
      for (const sh of this.ships) if (!sh.elim) { sh.energy = Math.min(100, sh.energy + 5); }
      this.emit({ t: 'zone', n: this.zone });
    }
    const topK = .75 + .06 * this.zone;
    for (const sh of this.ships) sh.topMul = topK * 1440 / sh.st.top;
  }
  /** results: one row per craft */
  results() {
    const leader = this.order[0];
    return this.order.map(sh => ({
      place: sh.place, pilot: sh.pilot, name: sh.name, team: sh.team, control: sh.control, player: sh.player, time: sh.finishTime, est: !!sh.estimated,
      gap: sh.finished && leader.finished ? sh.finishTime - leader.finishTime : null, best: sh.bestLap, points: sh.points, dnf: !!sh.dnf, lap: sh.lap, kills: sh.kills
    }));
  }
  hash() {
    const list = [];
    for (const sh of this.ships) list.push(sh.p, sh.u, sh.h, SN.Ship.speed(sh), sh.energy, sh.lap);
    this.weapons.hashList(list);
    return SN.hashNumbers(list);
  }
  /** the record to replay this race: re-simulated from the seed and the human controls */
  record() {
    return { intro: this.o.intro !== false, skipAt: this.skipAt, seed: this.seed, track: this.track.id, cls: this.cls, mode: this.mode, laps: this.laps, entrants: this.o.entrants, tune: this.tune, cheats: Object.assign({}, this.cheats), difficulty: this.o.difficulty, rules: this.o.rules, frames: this.frames, steps: this.steps, hash: this.hash(), target: this.target };
  }
}
SN.Race = Race;

/** the standard 8-craft field: the player(s), their teammate, the rival, and every team represented (§4.1) */
SN.field = (humans, o = {}) => {
  const used = new Set(humans.map(h => h.pilot)), out = humans.map(h => Object.assign({ control: 'human' }, h));
  const rival = humans.some(h => h.team === 'nullset') ? 'luca' : 'kaizero';
  const want = [];
  for (const h of humans) { const mate = SN.pilotsOf(h.team).find(p => !used.has(p.id)); if (mate) want.push(mate.id); }
  want.push(rival);
  for (const t of SN.TEAMS) { const p = SN.pilotsOf(t.id).find(p => !used.has(p.id) && !want.includes(p.id)); if (p) want.push(p.id); }
  for (const p of SN.PILOTS) if (!want.includes(p.id)) want.push(p.id);
  for (const id of want) { if (out.length >= (o.size || 8)) break; if (used.has(id)) continue; used.add(id); out.push({ pilot: id, team: SN.PILOT[id].team, control: 'ai' }); }
  return out;
};
SN.rivalOf = team => team === 'nullset' ? 'luca' : 'kaizero';
})();
