/* 11-match: the Match, pure simulation. It reads Intents (from human, bot, remote and script controllers), moves the
 * ball and the footballers, applies the rules and emits events on EF.bus. It never reads devices, plays sounds or draws.
 * Modes: kickoff/setpiece, play, dead (a stoppage with a restart pending), goal, var, halftime, fulltime, shootout, over. */
const SURF = { grass: [1, .55], wet: [.7, .45], hard: [.8, .6], snow: [1.7, .35], mud: [3, .2], puddle: [4, .15] };
let FID = 0;
class Match {
  constructor(o) {
    this.o = o = Object.assign({ home: 'kipperton', away: 'hoofington', stadium: null, seed: 1, slots: [], draws: 'allowed', buffs: [] }, o);
    this.seed = o.seed >>> 0 || 1; this.rng = E.rng(this.seed);
    this.teams = [EF.get('team', o.home), EF.get('team', o.away)];
    this.st = Object.assign({}, EF.get('stadium', o.stadium || this.teams[0].stadium));
    if (o.weather) this.st.weather = o.weather === 'none' ? null : Object.assign({}, this.st.weather, o.weather);
    if (o.surface) this.st.surface = o.surface;
    if (o.time && o.time !== 'stadium' && o.time !== this.st.time) {
      const SK = { day: ['#4a9ae8', '#8ac8f0', '#f0e8c0'], dusk: ['#2a1a3a', '#6a3a4a', '#d0806a'], night: ['#04040c', '#10142a', '#2a2a40'] };
      this.st.time = o.time; this.st.look = Object.assign({}, this.st.look, { sky: SK[o.time] }); this.st.lights = Object.assign({}, this.st.lights, { ambient: { day: 1, dusk: .62, night: .45 }[o.time], flood: o.time !== 'day', color: (this.st.lights && this.st.lights.color) || '#fff0d0' });
    }
    if (o.fog) this.st.fogAll = true;
    this.surface = this.st.surface || 'grass';
    this.map = o.map || buildMap(this.st);
    this.ref = EF.get('referee', o.referee || this.st.referee || 'haltwhistle');
    this.halfLen = o.halfLength || 120;
    this.t = 0; this.clock = 0; this.half = o.shootoutOnly ? 5 : 1; this.swapped = false; this.score = [0, 0]; this.stopped = 0; this.stoppage = 0; this.boardShown = false;
    this.mode = 'kickoff'; this.modeT = 0; this.owner = null; this.last = null; this.lastTouch = -1; this.kickHold = 0;
    this.euph = [0, 0]; this.euroT = [0, 0]; this.superUsed = [false, false]; this.superFlight = null; this.duel = null;
    this.stats = [0, 1].map(() => ({ shots: 0, onTarget: 0, passes: 0, passDone: 0, tackles: 0, poss: 0, corners: 0, fouls: 0, cards: 0, recover: 0 }));
    this.goals = []; this.events = []; this.evSeq = 0; this.chain = [0, 0]; this.shot = null; this.foul = null; this.deferred = []; this.cards = [];
    this.flags = {}; this.cheats = Object.assign({}, EF.Dev ? EF.Dev.cheats : {}); this.bus = null; this.celebration = null;
    this.buff = { speed: [1, 1], tackle: [1, 1], regen: [1, 1], passAcc: [1, 1], strict: 1, gain: [1, 1] };
    const d = EF.diff(); this.diff = d;
    // the footballers: 5 a side, roles from the formation, keepers first
    this.players = [];
    for (let s = 0; s < 2; s++) {
      const team = this.teams[s], form = EF.get('formation', (o.formation && o.formation[s]) || team.formation), roles = Object.keys(form.roles);
      const order = team.players.slice().sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos]);
      order.forEach((pd, i) => this.players.push(new Footballer(this, s, i, pd, roles[i] || 'FWD', form)));
    }
    this.side = [0, 1].map(s => this.players.filter(f => f.side === s));
    this.keeper = [0, 1].map(s => this.side[s].find(f => f.gk));
    for (const b of o.buffs || []) applyBuff(this, b.side, b.kind);
    if (o.startEuph) for (let s = 0; s < 2; s++) this.euph[s] = clamp(o.startEuph[s] || 0, 0, 100);
    // the ball
    const b = this.ball = new E.Body({ x: P.CX, y: P.CY, r: 3, friction: 0, bounce: EF.T.ballBounce, gravity: EF.T.ballGravity });
    b.spin = 0; b.roll = 0; b.to = null; b.kind = null; b.lastT = 0;
    // humans: each slot holds one footballer of its side at a time
    this.slots = (o.slots || []).map((s, i) => Object.assign({ i, side: 0, f: null, ctl: null, held: 0, menu: false }, s));
    this.brains = [new TeamBrain(this, 0), new TeamBrain(this, 1)];
    this.events = [];
    if (o.shootoutOnly) this.startShootout(); else if (o.training) this.mode = 'play'; else this.kickoff(this.rng() < .5 ? 0 : 1, true);
    this.kickoffSide0 = this.sp ? this.sp.side : 0;
    for (const sl of this.slots) if (!sl.f) this.assignSlot(sl);
  }
  /* ---- frames of reference ---- */
  dir(s) { return P.attackDir(s, this.swapped); }
  goalX(s) { return P.goalLineX(this.dir(s)); }           // the goal side s attacks
  ownGoalX(s) { return P.goalLineX(-this.dir(s)); }
  get minute() {
    if (this.half >= 5) return 120;
    if (this.half === 3) return 90 + Math.min(15, this.clock / 60 * 15);
    return (this.half - 1) * 45 + this.clock / this.halfLen * 45;
  }
  minuteLabel() {
    if (this.half >= 5 || this.mode === 'shootout') return 'PENS';
    const m = this.minute, base = this.half === 1 ? 45 : this.half === 2 ? 90 : 105;
    if (this.half === 3) return 'ET ' + Math.floor(m) + "'";
    return m >= base ? base + '+' + Math.max(1, Math.ceil(m - base)) + "'" : Math.floor(m) + "'";
  }
  get session() { return !!this.o.session; }
  emit(type, d = {}) {
    const ev = Object.assign({ t: this.t, n: ++this.evSeq }, d);
    this.events.push([type, ev]); if (this.events.length > 64) this.events.shift();
    if (!this.o.silent) EF.bus.emit(type, Object.assign(ev, { match: this }));
    return ev;
  }
  gain(s, v, why) {
    if (this.cheats.pure || this.o.pure) return;
    const k = v > 0 ? EF.T.euphoriaGain * (this.buff.gain[s] || 1) * (this.teams[s].crowd && this.teams[s].crowd.factor || 1) * (this.isCpuSide(s) ? this.diff.gain : 1) : 1;
    const before = this.euph[s];
    if (this.euroT[s] > 0) return;
    this.euph[s] = clamp(this.euph[s] + v * k, 0, 100);
    if (Math.floor(before / 33.4) !== Math.floor(this.euph[s] / 33.4) && this.euph[s] > before) this.emit('euphoriaGain', { side: s, v: this.euph[s], why });
    if (before < 100 && this.euph[s] >= 100) this.emit('euphoriaFull', { side: s });
  }
  isCpuSide(s) { return !this.slots.some(sl => sl.side === s && !sl.menu); }
  humanSide(s) { return this.slots.some(sl => sl.side === s); }

  /* ---- slots (humans) ---- */
  assignSlot(sl, f) {
    const free = this.side[sl.side].filter(p => !p.gk && !p.sentOff && !this.slots.some(o => o !== sl && o.f === p));
    if (!f) f = free.sort((a, b) => dist(a.body, this.ball) - dist(b.body, this.ball))[0];
    if (!f || (this.slots.some(o => o !== sl && o.f === f))) return;
    if (sl.f) sl.f.human = null;
    sl.f = f; f.human = sl.i;
  }
  switchSlot(sl, next) {
    const cands = this.side[sl.side].filter(p => !p.gk && !p.sentOff && p !== sl.f && !this.slots.some(o => o !== sl && o.f === p) && p.state !== 'off');
    if (!cands.length) return;
    cands.sort((a, b) => dist(a.body, this.ball) - dist(b.body, this.ball));
    let pick = cands[0];
    if (next && sl.lastSwitchT > this.t - 1 && cands.length > 1) pick = cands[(sl.switchN = (sl.switchN || 0) + 1) % cands.length];
    else sl.switchN = 0;
    sl.lastSwitchT = this.t; this.assignSlot(sl, pick); this.emit('switch', { slot: sl.i, who: pick.id });
  }

  /* ---- the main step ---- */
  update(dt, realDt = dt) {
    this.t += dt; this.modeT += dt; this.realDt = realDt;
    this.cheats = EF.Dev ? EF.Dev.cheats : this.cheats;
    // Europhoria counts down through stoppages
    for (let s = 0; s < 2; s++) if (this.euroT[s] > 0) { this.euroT[s] = Math.max(0, this.euroT[s] - dt); this.euph[s] = 100 * this.euroT[s] / EF.T.europhoriaTime; if (this.euroT[s] === 0) { this.euph[s] = 0; this.emit('europhoriaEnd', { side: s }); } }
    if (this.cheats.fullEuph0 && this.euroT[0] <= 0) this.euph[0] = 100;
    if (this.cheats.fullEuph1 && this.euroT[1] <= 0) this.euph[1] = 100;
    const m = this.mode;
    if (m === 'over') { this.stepBodies(dt, false); return; }
    if (m === 'halftime') { this.stepBodies(dt, false); if (this.modeT > 4.5) this.secondHalf(); return; }
    if (m === 'fulltime') { this.stepBodies(dt, false); if (this.modeT > 3) this.afterFullTime(); return; }
    if (m === 'shootout') { this.shootoutStep(dt); return; }
    if (m === 'goal') { this.stepBodies(dt, false); this.ballLoose(dt, true); this.celebrateStep(dt); return; }
    if (m === 'var') { this.stepBodies(dt, false); this.varStep(dt); this.stopped += dt; return; }
    if (m === 'dead') {
      this.stepBodies(dt, false); this.ballLoose(dt, true); this.stopped += dt;
      if (this.dead && (this.dead.t -= dt) <= 0) { const fn = this.dead.then; this.dead = null; fn(); }
      return;
    }
    if (m === 'setpiece' || m === 'kickoff') { this.setpieceStep(dt); this.runClock(dt); return; }
    // play
    this.kickHold = Math.max(0, this.kickHold - dt);
    this.stepBodies(dt, true);
    if (this.mode !== 'play') return;
    this.superStep(dt);
    if (this.mode !== 'play') return;
    // the invincible keeper cheat: anything heading into his goal is his
    for (let s = 0; s < 2; s++) if (this.cheats['keeper' + s] && !this.owner && !this.superFlight) {
      const k = this.keeper[s], gx = this.ownGoalX(s), b = this.ball;
      if (k && !k.sentOff && (b.x - gx) * (P.CX - gx) > 0 && Math.abs(b.x - gx) < 26 && Math.abs(b.y - P.CY) < P.GH + 8 && b.z < P.BAR + 4 && b.vx * (gx - P.CX) > 0 && !(this.last && this.last === k)) { k.body.x = gx + (gx > P.CX ? -6 : 6); k.body.y = b.y; k.setState('run'); keeperCatch(k, 'cheat'); }
    }
    if (!this.superFlight) this.ballStep(dt);
    if (this.mode !== 'play') return;
    this.foulStep(dt);
    this.eventsStep(dt);
    if (this.owner) this.stats[this.owner.side].poss += dt; else if (this.last) this.stats[this.last.side].poss += dt * .5;
    for (let s = 0; s < 2; s++) if (this.euroT[s] <= 0 && this.euph[s] > 0 && this.euph[s] < 100) this.euph[s] = Math.max(0, this.euph[s] - EF.T.euphoriaDecay * dt);
    this.goldenMoment();
    this.runClock(dt);
  }
  runClock(dt) {
    if (this.o.training || this.cheats.freezeClock || this.o.noClock) return;
    this.clock += dt;
    if (this.half === 3) { if (this.clock >= 60) this.endExtraTime(); return; }
    const m = this.minute, base = this.half * 45;
    if (!this.boardShown && m >= base - 1) {
      this.stoppage = clamp(Math.round(this.stopped / 12), 1, 5); this.boardShown = true;
      this.emit('board', { add: this.stoppage });
    }
    if (this.boardShown && m >= base + this.stoppage) {
      const u = P.toUV(1, this.ball.x, this.ball.y)[0], danger = u < .25 || u > .75;
      if (!danger || m >= base + this.stoppage + 2 || this.mode !== 'play') this.endHalf();
    }
  }
  endHalf() {
    this.owner = null; this.sp = null; this.foul = null;
    if (this.half === 1) { this.mode = 'halftime'; this.modeT = 0; this.emit('whistle', { kind: 'half' }); this.emit('half', {}); }
    else this.fullTime();
  }
  secondHalf() {
    this.half = 2; this.clock = 0; this.stopped = 0; this.boardShown = false; this.swapped = !this.swapped;
    this.kickoff(1 - this.kickoffSide0, true);
  }
  fullTime() {
    this.owner = null; this.sp = null; this.mode = 'fulltime'; this.modeT = 0; this.emit('whistle', { kind: 'full' });
    this.emit('fulltime', { score: this.score.slice() });
  }
  afterFullTime() {
    const draw = this.score[0] === this.score[1], rule = this.o.draws;
    if (draw && this.half < 3 && (rule === 'cup' || rule === 'golden') && !this.session) {
      this.half = 3; this.clock = 0; this.emit('extraTime', {}); this.kickoff(this.rng() < .5 ? 0 : 1, true); return;
    }
    if (draw && (rule === 'cup' || rule === 'pens') && !this.session) { this.startShootout(); return; }
    this.finish();
  }
  endExtraTime() { if (this.o.draws === 'cup' || this.o.draws === 'pens') { this.mode = 'fulltime'; this.modeT = 0; this.emit('whistle', { kind: 'full' }); } else this.fullTime(); }
  finish() {
    this.mode = 'over'; this.modeT = 0;
    const w = this.winner();
    this.emit('over', { winner: w, score: this.score.slice(), pens: this.so ? this.so.score.slice() : null });
  }
  winner() {
    if (this.score[0] !== this.score[1]) return this.score[0] > this.score[1] ? 0 : 1;
    if (this.so && this.so.score[0] !== this.so.score[1]) return this.so.score[0] > this.so.score[1] ? 0 : 1;
    return -1;
  }
  goldenMoment() {
    for (let s = 0; s < 2; s++) {
      const t = this.teams[s], tac = EF.get('tactic', t.tactic);
      if (tac && tac.gimmick === 'galacticos' && !this.flags['golden' + s] && this.half === 2 && this.minute >= 80 && this.score[s] <= this.score[1 - s] && !this.cheats.pure) {
        this.flags['golden' + s] = true; this.euph[s] = 100; this.emit('goldenMoment', { side: s }); this.triggerEurophoria(s);
      }
    }
  }

  /* ---- bodies: every footballer's step (controls on in play) ---- */
  stepBodies(dt, live) {
    const intents = new Map();
    if (live) {
      for (const sl of this.slots) {
        if (!sl.f || sl.f.sentOff) this.assignSlot(sl);
        if (!sl.f || sl.menu) continue;
        const it = sl.ctl ? sl.ctl.intent(this, sl, dt) : null;
        if (it) { intents.set(sl.f, it); this.slotActions(sl, it); }
      }
      this.autoSwitch();
      for (const b of this.brains) b.update(dt, intents);
    }
    for (const f of this.players) {
      const it = live ? (intents.get(f) || f.botIntent || NO_INTENT) : NO_INTENT;
      f.step(dt, it, live);
    }
    this.ref && refStep(this, dt);
  }
  slotActions(sl, it) {
    const f = sl.f;
    if (it.sw && it.sw.pressed && this.owner !== f && !(it.pass && it.pass.down)) this.switchSlot(sl, true);
    else if (it.through && it.through.pressed && this.owner !== f && this.owner && this.owner.side !== sl.side) this.switchSlot(sl, true);
    else if (it.through && it.through.pressed && !this.owner && this.owner !== f) this.switchSlot(sl, true);
    if (it.target && this.owner !== f) { const t = this.players.find(p => p.id === it.target); if (t && t.side === sl.side && !t.gk) this.assignSlot(sl, t); }
    if (it.euphoria && this.euph[sl.side] >= 100 && this.euroT[sl.side] <= 0) this.triggerEurophoria(sl.side);
  }
  autoSwitch() {
    for (const sl of this.slots) {
      if (sl.menu || !sl.f) continue;
      const rule = sl.switching || game.settings.switching || 'assisted';
      if (rule === 'manual') continue;
      if (rule === 'assisted' && sl.ctl && sl.ctl.sprinting) continue;
      const f = sl.f, b = this.ball;
      // a pass on its way to a teammate: take him; the other side has it: the nearer of us
      if (b.to && b.to.side === sl.side && b.to !== f && !b.to.gk && this.owner !== f && !this.slots.some(o => o.f === b.to)) { this.assignSlot(sl, b.to); continue; }
      if (this.owner && this.owner.side === sl.side && this.owner !== f && !this.owner.gk && !this.slots.some(o => o.f === this.owner)) { this.assignSlot(sl, this.owner); continue; }
      if ((!this.owner || this.owner.side !== sl.side) && this.t - (sl.lastSwitchT || -9) > .8) {
        const near = this.side[sl.side].filter(p => !p.gk && !p.sentOff && !this.slots.some(o => o !== sl && o.f === p)).sort((a, c) => dist(a.body, b) - dist(c.body, b))[0];
        if (near && near !== f && dist(near.body, b) + 40 < dist(f.body, b)) { this.assignSlot(sl, near); sl.lastSwitchT = this.t; }
      }
    }
  }

  /* ---- the ball ---- */
  ballStep(dt) {
    const b = this.ball;
    if (this.owner) { this.ownedBall(dt); return; }
    this.ballLoose(dt, false);
  }
  ownedBall(dt) {
    const b = this.ball, o = this.owner, ob = o.body;
    if (o.gk && o.state === 'keeper-hold') { b.x = ob.x + Math.cos(o.facing) * 3; b.y = ob.y + Math.sin(o.facing) * 3; b.z = ob.z + 14; b.vx = b.vy = b.vz = 0; return; }
    const sp = hyp(ob.vx, ob.vy), off = sp < 10 ? 5 : o.sprinting ? 11 + Math.sin(this.t * 9) * 2 : 7 + 2 * Math.sin(this.t * 12);
    b.x = ob.x + Math.cos(o.facing) * off; b.y = ob.y + Math.sin(o.facing) * off; b.z = 0; b.vx = ob.vx; b.vy = ob.vy; b.vz = 0; b.onGround = true; b.spin = 0;
    b.roll += sp * dt;
  }
  surfaceAt(x, y) {
    const t = this.map.tagAt ? this.map.tagAt(x, y) : null;
    return SURF[t || this.surface] || SURF.grass;
  }
  ballLoose(dt, dead) {
    const b = this.ball;
    if (this.owner) { this.ownedBall(dt); return; }
    const vx0 = b.vx, vy0 = b.vy, sp = hyp(b.vx, b.vy), [fr, bo] = this.surfaceAt(b.x, b.y);
    if (b.spin && sp > 20) { const k = b.spin * dt; b.vx += -vy0 * k; b.vy += vx0 * k; b.spin *= Math.exp(-dt * 1.4); }
    if (b.z <= .5) { const f = Math.exp(-dt * EF.T.ballFriction * fr); b.vx *= f; b.vy *= f; }
    else { const f = Math.exp(-dt * .12); b.vx *= f; b.vy *= f; const w = this.st.weather && this.st.weather.wind; if (w) b.vy += w * 20 * dt; }
    // the lucchetto pitch: small random deflections
    if (this.st.uneven && b.z <= .5 && sp > 40 && this.rng() < dt * 1.5) { const a = (this.rng() - .5) * .25, c = Math.cos(a), s = Math.sin(a); const nx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = nx; }
    b.bounce = EF.T.ballBounce * bo / .55; b.gravity = EF.T.ballGravity;
    const inGoal = this.insideGoal(b.x, b.y);
    if (inGoal) { const f = Math.exp(-dt * 5); b.vx *= f; b.vy *= f; b.spin = 0; }
    b.update(dt, this.map);
    this.netStep(b);
    if (b.hitWall && sp > 60) this.emit('bounce', { kind: inGoal ? 'net' : 'boards', x: b.x, y: b.y, s: sp });
    if (b.bounced && sp > 30) this.emit('bounce', { kind: 'ground', x: b.x, y: b.y, s: sp, surf: this.map.tagAt(b.x, b.y) || this.surface });
    b.roll += hyp(b.vx, b.vy) * dt;
    this.woodwork(b);
    if (this.bus) this.busHit(b);
    if (this.o.training && this.o.training.ballStep) { this.o.training.ballStep(this, dt); }
    if (dead || this.mode !== 'play') return;
    // interceptions and touches are in the footballers' steps; here: goals and out of play
    for (const gx of [P.X0, P.X1]) {
      const past = gx === P.X0 ? b.x < gx - b.r : b.x > gx + b.r;
      if (!past) continue;
      if (b.prevPast === gx) continue;
      const dirIn = gx === P.X1 ? 1 : -1;   // the side attacking this goal has dir === dirIn
      const attSide = this.dir(0) === dirIn ? 0 : 1;
      if (Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2) { b.prevPast = gx; this.goalScored(attSide); return; }
      if (this.o.training) { this.o.training.out && this.o.training.out(this, 'goalline'); return; }
      // out: over the goal line
      const lastAtt = this.last && this.last.side === attSide;
      this.restartLater(lastAtt ? 'goalkick' : 'corner', lastAtt ? 1 - attSide : attSide, b.y);
      return;
    }
    b.prevPast = null;
    if (b.y < P.Y0 - 20 || b.y > P.Y1 + 20 || b.x < P.X0 - 60 || b.x > P.X1 + 60) {
      if (this.o.training) { this.o.training.out && this.o.training.out(this, 'crowd'); return; }
      this.crowdThrow(); return;
    }
    if (b.y < P.Y0 - 3 || b.y > P.Y1 + 3) {
      // between the touchline and the boards: rolling along the apron, it comes back off the boards. A ball resting there is
      // given back by the fans
      if (sp < 8 && b.z < 1) { this.crowdThrow(); return; }
    }
  }
  /** the nets: inside a goal the ball is held by the back, the sides and the roof (soft: it barely bounces) */
  netStep(b) {
    for (const gx of [P.X0, P.X1]) {
      const d = gx === P.X0 ? -1 : 1, depth = (b.x - gx) * d;
      if (depth <= 0 || depth > P.NET + 24 || Math.abs(b.y - P.CY) > P.GH + 4 || b.z > P.BAR) continue;
      let hit = false;
      if (depth > P.NET - b.r) { b.x = gx + d * (P.NET - b.r); if (b.vx * d > 0) { b.vx = -b.vx * .15; hit = true; } }
      for (const sy of [-1, 1]) { const edge = P.CY + sy * P.GH; if ((b.y - edge) * sy > -b.r) { b.y = edge - sy * b.r; if (b.vy * sy > 0) { b.vy = -b.vy * .15; hit = true; } } }
      const roof = lerp(P.BAR, P.BAR - 6, clamp(depth / P.NET, 0, 1)); if (b.z > roof - b.r) { b.z = roof - b.r; if (b.vz > 0) b.vz = 0; }
      if (hit && this.t - (b.netT || -9) > .3) { b.netT = this.t; this.emit('bounce', { kind: 'net', x: b.x, y: b.y, s: 100 }); }
    }
  }
  insideGoal(x, y) { return (x < P.X0 || x > P.X1) && Math.abs(y - P.CY) < P.GH + 2; }
  woodwork(b) {
    if (b.z > P.BAR + 6) return;
    for (const gx of [P.X0, P.X1]) {
      if (Math.abs(b.x - gx) > 8) continue;
      for (const py of [P.CY - P.GH, P.CY + P.GH]) {
        if (b.z > P.BAR) continue;
        const dx = b.x - gx, dy = b.y - py, d = hyp(dx, dy);
        if (d < 5 && d > .01) {
          const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
          if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; b.x = gx + nx * 5.1; b.y = py + ny * 5.1; b.spin = 0; this.woodworkHit(b, 'post'); }
        }
      }
      if (Math.abs(b.y - P.CY) < P.GH) {
        const dx = b.x - gx, dz = b.z - P.BAR, d = hyp(dx, dz);
        if (d < 5 && d > .01) {
          const nx = dx / d, nz = dz / d, vn = b.vx * nx + b.vz * nz;
          if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vz -= 1.7 * vn * nz; b.x = gx + nx * 5.1; b.z = P.BAR + nz * 5.1; b.onGround = false; this.woodworkHit(b, 'bar'); }
        }
      }
    }
  }
  woodworkHit(b, kind) {
    if (this.t - (b.woodT || -9) < .2) return; b.woodT = this.t;
    const s = this.last ? this.last.side : 0;
    this.emit('woodwork', { kind, x: b.x, y: b.y, z: b.z, side: s, who: this.last && this.last.id });
    if (this.last) this.gain(this.last.side, 7, 'woodwork');
    if (this.shot) this.shot.done = true;
  }
  busHit(b) {
    const k = this.bus; if (!k.on) return;
    if (b.z > 30) return;
    if (b.x > k.x0 && b.x < k.x1 && b.y > k.y0 && b.y < k.y1) {
      if (this.superFlight) return;
      // bounce back out the way it came
      const fromFront = (b.vx > 0) === (k.x0 > P.CX);
      if (fromFront) { b.vx = -b.vx * .5; b.x = b.vx < 0 ? k.x0 - 1 : k.x1 + 1; } else { b.vy = -b.vy * .5; }
      this.emit('busHit', { x: b.x, y: b.y });
      if (this.shot) this.shot.done = true;
    }
  }

  /* ---- possession and kicks ---- */
  takeBall(f) {
    const b = this.ball, prev = this.last;
    if (b.superPath) return;
    const wasPass = b.to && b.kind && (b.kind === 'pass' || b.kind === 'through' || b.kind === 'lob' || b.kind === 'cross');
    this.owner = f; b.spin = 0; b.superPath = null; b.superName = null;
    if (wasPass && prev && prev.side === f.side && prev !== f) {
      this.stats[f.side].passDone++; this.chain[f.side]++; this.chain[1 - f.side] = 0;
      this.emit('passDone', { side: f.side, who: f.id, from: prev.id, kind: b.kind, chain: this.chain[f.side] });
      this.gain(f.side, Math.min(8, 2 + this.chain[f.side] - 1), 'pass');
      if (b.oneTwo && b.oneTwo.from === f) this.emit('oneTwo', { side: f.side, who: f.id });
    } else if (prev && prev.side !== f.side) {
      this.chain[f.side] = 1; this.chain[1 - f.side] = 0;
      if (b.kind === 'pass' || b.kind === 'through' || b.kind === 'lob' || b.kind === 'cross') this.emit('intercept', { side: f.side, who: f.id });
      this.stats[f.side].recover++;
      this.emit('recover', { side: f.side, who: f.id });
    }
    b.to = null; b.kind = null; this.last = f; this.lastTouch = f.side;
    if (this.shot) this.shot.done = true;
    this.emit('touch', { who: f.id, side: f.side });
    if (b.oneTwo && b.oneTwo.mate === f) { f.oneTwoT = .35; f.oneTwoTo = b.oneTwo.from; }
    b.oneTwo = null;
  }
  kickBall(f, vx, vy, vz, kind, to) {
    const b = this.ball; this.owner = null; this.last = f; this.lastTouch = f.side; this.kickHold = 0;
    b.vx = vx; b.vy = vy; b.vz = vz; b.onGround = vz <= 0; b.spin = 0; b.kind = kind; b.to = to || null; b.kickT = this.t; b.superPath = null; b.superName = null;
    if (b.z < 0) b.z = 0;
    f.cool = .3;
  }

  /* ---- goals ---- */
  goalScored(side) {
    const by = this.last, own = by && by.side !== side;
    if (this.o.training) { this.o.training.goal && this.o.training.goal(this, side, by); return; }
    this.score[side]++;
    const g = { side, who: by ? by.id : null, name: by ? (own ? by.data.name + ' (OG)' : by.data.name) : '?', minute: this.minuteLabel(), own: !!own, kind: (this.shot && this.shot.kind) || (this.ball.kind || 'shot'), t: this.t, super: !!this.ball.superName };
    this.goals.push(g);
    if (by && !own) by.goals++;
    this.mode = 'goal'; this.modeT = 0; this.owner = null; this.shot = null; this.foul = null;
    this.celebration = { side, scorer: own ? null : by, t: 0, pick: -1, picked: false, cpu: !this.humanSide(side) || !by || !by.human === null };
    this.gain(side, 35, 'goal'); this.euph[1 - side] = Math.max(0, this.euph[1 - side] - 10);
    this.emit(own ? 'ownGoal' : 'goal', Object.assign({}, g));
    if (this.half === 3) this.flags.goldenGoal = true;
    if (this.bus && this.bus.on && g.super) { this.bus.on = false; this.emit('busGone', { side: this.bus.side }); }
    if (this.bus && this.bus.on && side !== this.bus.side) this.emit('busBeaten', { side });
  }
  celebrateStep(dt) {
    const c = this.celebration; if (!c) { this.afterGoal(); return; }
    c.t += dt;
    const f = c.scorer;
    if (f && !f.sentOff && c.t < 3.4) {
      // the scorer runs to the nearest corner flag; teammates run in to him
      const cx = this.ball.x > P.CX ? P.X1 - 12 : P.X0 + 12, cy = f.body.y < P.CY ? P.Y0 + 12 : P.Y1 - 12;
      if (!c.target) c.target = [lerp(f.body.x, cx, .6), lerp(f.body.y, cy, .6)];
      if (c.pick < 0 && c.t > 1.4) c.pick = celebrationFor(this, f, -1);
      for (const p of this.side[c.side]) {
        if (p.gk || p.sentOff) continue;
        p.celebrate = c.t > 1.2 ? (p === f ? EF.get('celebration', c.pick < 0 ? 'cheer' : c.pick) : 'pile') : null;
        const tx = p === f ? c.target[0] : f.body.x + (p.idx - 2) * 8, ty = p === f ? c.target[1] : f.body.y + 6;
        p.goTo(tx, ty, p === f ? 120 : 100, dt);
      }
      for (const p of this.side[1 - c.side]) { p.dejected = true; p.goTo(p.body.x, p.body.y, 0, dt); }
    }
    if (c.t >= (c.long ? 4.2 : 3.6)) this.afterGoal();
  }
  pickCelebration(k) {
    const c = this.celebration; if (!c || c.picked || !c.scorer || c.t > 2.4) return;
    const list = celebrationChoices(this, c.scorer); c.picked = true; c.pick = list[k] || list[0];
    const cel = EF.get('celebration', c.pick); c.long = true;
    this.emit('celebrate', { side: c.side, who: c.scorer.id, kind: c.pick, name: cel.name });
    this.gain(c.side, cel.euphoria || 8, 'celebrate');
    if (cel.yellow) this.deferred.push({ f: c.scorer, kind: 'yellow', why: 'shirt' });
  }
  afterGoal() {
    const c = this.celebration; this.celebration = null;
    if (c && !c.picked && c.scorer) { const sig = c.pick < 0 ? 'cheer' : c.pick; this.emit('celebrate', { side: c.side, who: c.scorer.id, kind: sig, name: (EF.get('celebration', sig) || {}).name || '' }); }
    for (const p of this.players) { p.celebrate = null; p.dejected = false; }
    if (this.flags.goldenGoal) { this.flags.goldenGoal = false; this.emit('goldenGoal', {}); this.fullTime(); return; }
    if (this.onReplay && this.onReplay(c) && !this.session) { this.mode = 'dead'; this.dead = { t: 999, then: () => {} }; this.replayWait = true; return; }
    this.kickoff(c ? 1 - c.side : 0, false);
  }
  replayDone() { if (this.replayWait) { this.replayWait = false; this.dead = null; this.kickoff(1 - (this.goals.length ? this.goals[this.goals.length - 1].side : 0), false); } }

  /* ---- restarts ---- */
  restartLater(kind, side, y) {
    this.owner = null; this.shot = null;
    const b = this.ball;
    this.mode = 'dead'; this.modeT = 0;
    this.emit('out', { kind, side });
    this.dead = { t: 1.1, then: () => this.startSetpiece(kind, side, { y }) };
    this.applyDeferred();
  }
  crowdThrow() {
    const b = this.ball, side = this.last ? 1 - this.last.side : 0;
    this.owner = null; this.mode = 'dead'; this.modeT = 0; this.shot = null;
    const fx = clamp(b.x, P.X0 + 30, P.X1 - 30), fy = b.y < P.CY ? P.Y0 - 40 : P.Y1 + 30;
    this.emit('crowdThrow', { side, x: fx, y: fy });
    this.applyDeferred();
    this.dead = { t: 1.2, then: () => {
      const tgt = this.side[side].filter(p => !p.gk && !p.sentOff).sort((p, q) => hyp(p.body.x - fx, p.body.y - fy) - hyp(q.body.x - fx, q.body.y - fy))[0];
      b.x = fx; b.y = fy < P.CY ? P.Y0 + 3 : P.Y1 - 3; b.z = 30;
      const tx = tgt ? tgt.body.x : P.CX, ty = tgt ? tgt.body.y : P.CY;
      const v = E.arc({ x: b.x, y: b.y, z: b.z }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 50 });
      b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.onGround = false; b.kind = 'throw'; b.to = tgt || null; this.last = null; this.lastTouch = -1;
      this.mode = 'play'; this.modeT = 0;
      // nobody of the other side may take it for a moment
      for (const p of this.side[1 - side]) p.cool = Math.max(p.cool, .6);
    } };
  }
  applyDeferred() {
    for (const d of this.deferred.splice(0)) giveCard(this, d.f, d.kind, d.why);
  }
  kickoff(side, fresh) {
    this.owner = null; this.shot = null; this.foul = null; this.superFlight = null;
    const b = this.ball; b.x = P.CX; b.y = P.CY; b.z = 0; b.vx = b.vy = b.vz = 0; b.spin = 0; b.superPath = null; b.to = null; b.kind = null; b.prevPast = null;
    this.startSetpiece('kickoff', side, {});
    this.emit('kickoff', { side, fresh: !!fresh, half: this.half });
    this.applyDeferred();
  }
}
EF.Match = Match;
const POS_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
const NO_INTENT = { move: [0, 0], aim: null, sprint: false, pass: {}, shoot: {}, lob: {}, through: {}, skill: {}, sw: {}, dive: {}, euphoria: false, target: null, none: true };
EF.NO_INTENT = NO_INTENT;
function applyBuff(m, s, kind) {
  if (kind === 'hairdryer') { m.buff.speed[s] = 1.1; m.buff.tackle[s] = 1.1; m.buff.strict = 1.2; m.flags.hairdryer = s; }
  if (kind === 'arm') { m.buff.regen[s] = 1.25; m.euph[s] = Math.min(100, m.euph[s] + 15); }
  if (kind === 'tactics') { m.buff.passAcc[s] = .9; }
  if (kind === 'underdog') { m.buff.gain[s] = 1.5; }
  if (kind === 'loyal') { m.euph[s] = Math.min(100, m.euph[s] + 20); }
  if (kind === 'jetski') { m.euph[s] = Math.min(100, m.euph[s] + 10); }
}
EF.applyBuff = applyBuff;
