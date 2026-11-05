/* THE MATCH: pure simulation. It reads Intents, moves bodies, applies the rules and emits events on EF.bus. It never
 * reads input devices, plays sounds or draws: the bots, the attract mode, replays, tests and the network host all drive
 * it the same way. Its only randomness is this.rng (seeded). Other fragments add methods to Match.prototype:
 * the ball (12), footballers (13), keepers (14), team AI (15), rules and set pieces (16), the referee (17),
 * Euphoria and super strikes (18), matchday events (20). */
class Match {
  /** o: { home, away, stadium, seed, halfLength, humans: [{ input, side, ctl }], kind: 'kickabout' | 'cup' | 'penalties' |
   *  'training' | 'attract' | 'session', draws: 'allowed' | 'golden' | 'penalties' | 'cup', shootoutOnly, weather, time,
   *  ball, referee, buffs: [{}, {}], euphoria: [a, b], kits: ['home', 'away'], formation: [id, id], cheats, pure } */
  constructor(o = {}) {
    this.o = o;
    this.seed = o.seed !== undefined ? o.seed >>> 0 : (EF.seedNext = ((EF.seedNext || Date.now()) * 1103515245 + 12345) >>> 0);
    this.rng = E.rng(this.seed);
    this.kind = o.kind || 'kickabout';
    this.t = 0;                         // match time (seconds of sim)
    this.teams = [EF.get('team', o.home || 'kipperton'), EF.get('team', o.away || 'hoofington')];
    this.stadium = EF.get('stadium', o.stadium || this.teams[0].stadium);
    this.weather = o.weather || this.stadium.weather || null;
    this.timeOfDay = o.time || this.stadium.time || 'day';
    this.pitch = EF.Pitch.get(this.stadium, this.weather);
    this.surface = this.weather && this.weather.kind === 'snow' ? 'snow' : this.weather && this.weather.kind === 'rain' ? 'wet' : this.stadium.surface || 'grass';
    this.ballStyle = o.ball || (this.surface === 'snow' ? 'orange' : 'classic');
    this.halfLen = o.halfLength || EF.halfLength();
    this.draws = o.draws || 'allowed';
    this.pure = !!o.pure; this.cheats = Object.assign({}, o.cheats || {});
    this.buffs = [Object.assign({}, (o.buffs || [])[0] || {}), Object.assign({}, (o.buffs || [])[1] || {})];
    this.diff = o.diff || EF.diff();
    this.kits = o.kits || EF.Art.pickKits(this.teams[0], this.teams[1]);
    this.formation = [0, 1].map(s => EF.get('formation', (o.formation || [])[s] || this.teams[s].formation));
    this.tactic = [0, 1].map(s => EF.get('tactic', this.teams[s].tactic));
    // the state the presentation, replays and the network read
    this.mode = 'kickoff'; this.modeT = 0; this.half = 1; this.clock = 0; this.stopT = 0; this.stoppage = 0; this.stoppageShown = false;
    this.score = [0, 0]; this.goals = []; this.euphoria = (o.euphoria || [0, 0]).slice(); this.europhoria = null; this.superUsed = false;
    this.owner = null; this.lastTouch = null; this.lastKick = null; this.passChain = [0, 0]; this.possT = [0, 0];
    this.kickoffSide = 0; this.firstKick = 0; this.kickHold = 0; this.golden = false; this.over = false; this.result = null;
    this.setpiece = null; this.shootout = null; this.var = null; this.pendingCard = null; this.advantage = null; this.celebration = null;
    this.notice = null; this.bus = null; this.fog = 0; this.lightsOut = 0; this.events = [];   // matchday events live
    this.eventsDone = { 1: 0, 2: 0 }; this.slowmo = null; this.duel = null; this.lastFoul = null;
    this.stats = { shots: [0, 0], onTarget: [0, 0], passes: [0, 0], passesDone: [0, 0], tackles: [0, 0], fouls: [0, 0], corners: [0, 0], freekicks: [0, 0],
      cards: [0, 0], saves: [0, 0], supers: [0, 0], skills: [0, 0], headers: [0, 0], recoveries: [0, 0], nutmegs: [0, 0], per: {} };
    this.ball = new EF.Ball(this);
    this.players = []; this.side = [[], []];
    for (const s of [0, 1]) this.buildSide(s);
    this.ref = new EF.Referee(this, EF.get('referee', o.referee || this.stadium.referee || 'haltwhistle'));
    this.brains = [new EF.TeamBrain(this, 0), new EF.TeamBrain(this, 1)];
    this.humans = [];
    for (const h of o.humans || []) this.addHuman(h);
    this.onEnd = o.onEnd || null;
    this.eventOn = !this.pure && o.events !== false;
    if (o.shootoutOnly) this.startShootout(true);
    else this.startKickoff(0, true);
  }
  /* ---- sides and directions: side 0 attacks +x in the first half; the ends swap at half time ---- */
  dir(s) { const d = this.half === 2 ? -1 : 1; return s === 0 ? d : -d; }
  goalX(s) { return this.dir(s) > 0 ? EF.P.X1 : EF.P.X0; }       // the goal side s attacks
  ownGoalX(s) { return this.dir(s) > 0 ? EF.P.X0 : EF.P.X1; }    // the goal side s defends
  /** u: 0 at side s's own goal line .. 1 at the one it attacks */
  u(s, x) { const P = EF.P; return this.dir(s) > 0 ? (x - P.X0) / P.L : (P.X1 - x) / P.L; }
  xOfU(s, u) { const P = EF.P; return this.dir(s) > 0 ? P.X0 + u * P.L : P.X1 - u * P.L; }
  keeper(s) { return this.side[s].find(f => f.role === 'GK' && !f.sentOff && !f.ghost) || null; }
  outfield(s) { return this.side[s].filter(f => f.role !== 'GK' && !f.sentOff && !f.ghost); }
  active(s) { return this.side[s].filter(f => !f.sentOff && !f.ghost); }
  team(s) { return this.teams[s]; }
  emit(type, ev = {}) { ev.t = this.t; if (ev.side === undefined && ev.who) ev.side = ev.who.side; if (ev.who && typeof ev.who === 'object') { ev.whoId = ev.who.id; } ev.match = this; return EF.bus.emit(type, ev); }
  get minute() { return this.minuteAt(this.clock); }
  minuteAt(c) { if (this.half >= 3) return 90 + Math.min(15, c / 60 * 15); return (this.half - 1) * 45 + c / this.halfLen * 45; }
  get clockText() {
    if (this.shootout) return 'PENS';
    const m = this.minute, base = this.half >= 3 ? 90 : this.half * 45;
    if (this.half >= 3) return 'ET ' + Math.min(105, Math.floor(m) + 1) + "'";
    if (m >= base) return base + '+' + Math.min(this.stoppage || 1, Math.floor(m - base) + 1) + "'";
    return Math.floor(m) + 1 + "'";
  }
  /** a footballer's side's Euphoria factor (the team's crowd, difficulty for the CPU, the underdog boost) */
  euFactor(s) { const t = this.teams[s], cpu = !this.humans.some(h => h.side === s); return (t.crowd && t.crowd.factor || 1) * (cpu && this.kind !== 'attract' ? this.diff.eu : 1) * (this.buffs[s].euphoriaGain || 1); }
  /* ---- the squads ---- */
  buildSide(s) {
    const T = this.teams[s], F = this.formation[s], roles = Object.keys(F.roles);
    const roster = T.players.slice().sort((a, b) => (a.pos === 'GK' ? 0 : 1) - (b.pos === 'GK' ? 0 : 1));
    const gk = roster.find(p => p.pos === 'GK'), out = roster.filter(p => p !== gk);
    const order = { DEF: 0, MID: 1, FWD: 2 };
    out.sort((a, b) => order[a.pos] - order[b.pos]);
    const outRoles = roles.filter(r => !F.roles[r].keeper);
    const assign = [[gk, roles.find(r => F.roles[r].keeper)]].concat(out.map((p, i) => [p, outRoles[i]]));
    for (const [p, slot] of assign) {
      const f = new EF.Footballer(this, s, this.side[s].length, p, slot);
      this.side[s].push(f); this.players.push(f);
    }
    this.players.forEach((f, i) => { f.id = i; });
  }
  /** change side s's formation during the match (a team talk, a red card, catenaccio's 3-1): slots are reassigned */
  setFormation(s, id) {
    const F = EF.get('formation', id); if (!F) return; this.formation[s] = F;
    const roles = Object.keys(F.roles).filter(r => !F.roles[r].keeper), out = this.side[s].filter(f => f.role !== 'GK');
    out.forEach((f, i) => { f.slot = roles[Math.min(i, roles.length - 1)]; });
  }
  /* ---- humans: each controls one footballer at a time and switches on his own ---- */
  addHuman(h) {
    const slot = { input: h.input || null, side: h.side, fb: null, n: this.humans.length, ctl: h.ctl || null, remote: !!h.remote, id: h.id !== undefined ? h.id : this.humans.length,
      color: h.color || E.PLAYER_COLORS[this.humans.length] || '#ffe08a', name: h.name || (h.input && h.input.name) || 'P' + (this.humans.length + 1), used: {}, cpu: false, stats: { Goals: 0, Shots: 0, Tackles: 0 } };
    this.humans.push(slot);
    slot.ctl = slot.ctl || new EF.HumanController(this, slot);
    this.pickFor(slot, true);
    return slot;
  }
  removeHuman(slot) { const i = this.humans.indexOf(slot); if (i < 0) return; if (slot.fb) slot.fb.human = null; this.humans.splice(i, 1); }
  /** the footballer a human should hold: the nearest to the ball not held by another (never the keeper in open play) */
  pickFor(slot, first) {
    const s = slot.side, free = this.outfield(s).filter(f => !f.human || f.human === slot);
    if (!free.length) return;
    const b = this.ball, c = free.slice().sort((a, b2) => H.d(a.body, b) - H.d(b2.body, b))[0];
    const pref = first && free.find(f => f.data.captain) || c;
    this.giveTo(slot, first ? pref : c);
  }
  giveTo(slot, f) {
    if (!f || f.sentOff || (f.human && f.human !== slot)) return false;
    if (slot.fb === f) return true;
    if (slot.fb) slot.fb.human = null;
    slot.fb = f; f.human = slot; slot.switchT = this.t;
    return true;
  }
  /** switch: the teammate nearest the ball not held by anyone, then the next on another press */
  switchHuman(slot, next) {
    const s = slot.side, b = this.ball.pos();
    const list = this.outfield(s).filter(f => (!f.human || f.human === slot) && f.state !== 'off').sort((a, c) => H.d(a.body, b) - H.d(c.body, b));
    if (!list.length) return;
    let pick = list[0];
    if (pick === slot.fb || next) { const i = list.indexOf(slot.fb); pick = list[(i + 1) % list.length]; if (!next && list[0] !== slot.fb) pick = list[0]; }
    if (pick !== slot.fb) { this.giveTo(slot, pick); this.emit('switch', { who: pick, human: slot }); }
  }
  humanOf(f) { return f.human; }
  hasHuman(s) { return this.humans.some(h => h.side === s && !h.cpu); }
  /** the intent for footballer f this step: his human's, else his team's bot */
  intentFor(f, dt) {
    if (this.script) { const it = this.script(f, dt); if (it) return it; }
    if (f.human && !f.human.cpu && !this.cheats.watch && !(EF.Dev && EF.Dev.takesInput())) return f.human.ctl.intent(f, dt);
    return this.brains[f.side].intent(f, dt);
  }

  /* ---- the step ---- */
  update(dt) {
    if (this.over && this.mode === 'over') return;
    this.t += dt; this.modeT += dt;
    if (this.notice) { this.notice.t += dt / Math.max(.05, game.timeScale || 1); if (this.notice.t > this.notice.dur) this.notice = null; }
    if (this.slowmo) { this.slowmo.t -= dt / Math.max(.05, game.timeScale); if (this.slowmo.t <= 0) { this.slowmo = null; this.wantScale = 1; } }
    this.euphoriaStep(dt);
    const M = this.mode;
    if (M === 'shootout') { this.shootoutStep(dt); this.stepBodies(dt, true); return; }
    if (M === 'var') { this.varStep(dt); this.stepBodies(dt, true); return; }
    if (M === 'card') { this.cardStep(dt); this.stepBodies(dt, true); return; }
    if (M === 'goal' || M === 'celebrate') { this.goalStep(dt); this.stepBodies(dt, M === 'celebrate'); this.ball.update(dt); return; }
    if (M === 'replay') { this.replayWait(dt); return; }
    if (M === 'halftime') { if (this.modeT > 4.2) this.secondHalf(); this.stepBodies(dt, true); return; }
    if (M === 'fulltime') { this.stepBodies(dt, true); if (this.modeT > 3 && !this.over) this.finish(); return; }
    if (M === 'kickoff' || M === 'setpiece') this.setpieceStep(dt);
    // play (and set pieces once taken): the clock, the bodies, the ball, the rules
    if (this.mode === 'play' || (this.mode === 'setpiece' && this.setpiece && this.setpiece.taken)) this.clockStep(dt);
    for (const b of this.brains) b.update(dt);
    this.stepBodies(dt, false);
    if (this.mode === 'play' || this.mode === 'setpiece' || this.mode === 'kickoff') this.ball.update(dt);
    this.ownerBall(dt);
    this.ref.update(dt);
    this.advantageStep(dt);
    if (this.eventOn) this.eventsStep(dt);
    if (this.owner) this.possT[this.owner.side] += dt;
    this.kickHold = Math.max(0, this.kickHold - dt);
  }
  /** every footballer's step; frozen: no intents (they walk to their spots or stand) */
  stepBodies(dt, frozen) {
    for (const f of this.players) {
      const it = frozen || f.frozen ? f.idleIntent() : this.intentFor(f, dt);
      f.step(dt, it, frozen);
    }
    this.separate();
    if (!frozen) this.pickup();
  }
  /** keep bodies from overlapping (cheap pairs: ten players) */
  separate() {
    const L = this.players;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j]; if (a.sentOff || b.sentOff || a.ghost || b.ghost) continue;
      const A = a.body, B = b.body, dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), m = A.r + B.r - 1;
      if (d < m && d > 1e-4 && Math.abs(A.z - B.z) < 14) {
        const k = (m - d) / 2, ux = dx / d, uy = dy / d;
        A.x -= ux * k; A.y -= uy * k; B.x += ux * k; B.y += uy * k;
        const cs = (A.vx - B.vx) * ux + (A.vy - B.vy) * uy;
        if (cs > 220 && this.mode === 'play') this.collide(a, b, cs);
      }
    }
  }
  /* ---- possession ---- */
  setOwner(f, how) {
    const was = this.owner;
    if (f === was) return;
    if (was && was.holding) { was.holding = false; was.holdT = 0; }
    this.owner = f;
    if (f) {
      const b = this.ball; b.owner = f; b.superPath = null; b.spin = 0; b.decoys = null; f.ownT = 0;
      const prev = this.lastTouch; this.touch(f);
      if (b.pass && b.pass.from && b.pass.from !== f) {
        if (b.pass.from.side === f.side) {
          this.stats.passesDone[f.side]++; this.passChain[f.side]++; this.passChain[1 - f.side] = 0;
          this.emit('passDone', { who: f, from: b.pass.from, kind: b.pass.kind, chain: this.passChain[f.side] });
          if (b.pass.oneTwo && b.pass.from.human) this.oneTwoReturn(b.pass.from, f);
        } else { this.passChain = [0, 0]; this.passChain[f.side] = 0; this.emit('intercept', { who: f, from: b.pass.from }); this.stats.recoveries[f.side]++; }
      } else if (prev && prev.side !== f.side && how !== 'restart') { this.passChain = [0, 0]; this.emit('recover', { who: f, from: prev }); this.stats.recoveries[f.side]++; }
      b.pass = null;
      this.emit('possess', { who: f, how });
      // auto switching: a pass reaching a teammate, or the human side losing the ball
      for (const h of this.humans) if (h.side === f.side && f !== h.fb && !f.human && f.role !== 'GK' && this.autoSwitch(h)) this.giveTo(h, f);
      // the human side lost it: control goes to the teammate nearest the ball (unless he is already the man)
      for (const h of this.humans) if (h.side !== f.side && h.fb && !h.cpu && this.autoSwitch(h) && how !== 'restart') {
        const near = this.outfield(h.side).filter(q => !q.human || q.human === h).sort((a, c) => H.d(a.body, f.body) - H.d(c.body, f.body))[0];
        if (near && near !== h.fb && H.d(near.body, f.body) + 20 < H.d(h.fb.body, f.body)) this.giveTo(h, near);
      }
    } else this.ball.owner = null;
  }
  autoSwitch(h) { const m = game.settings.switching; if (h.remote) return true; if (m === 'manual') return false; if (m === 'assisted' && h.fb && h.fb.lastIntent && h.fb.lastIntent.sprint) return false; return true; }
  touch(f) { this.lastTouch = f; f.lastTouchT = this.t; this.emit('touch', { who: f }); }
  /** a loose ball: whoever reaches it first takes it (section 6.2) */
  pickup() {
    const b = this.ball; if (this.owner || b.superPath || this.mode === 'goal' || b.held) return;
    if (!(this.mode === 'play' || (this.mode === 'setpiece' && this.setpiece && this.setpiece.taken) || this.mode === 'kickoff')) return;
    const sp = Math.hypot(b.vx, b.vy), vzOk = b.z < 9 || (b.z < 17 && Math.abs(b.vz) < 90 && sp < 170);
    if (!vzOk) return;
    let best = null, bd = 1e9;
    for (const f of this.players) {
      if (!f.canTake()) continue;
      if (this.kickHold > 0 && f.side !== this.kickoffSide && Math.hypot(b.x - EF.P.CX, b.y - EF.P.CY) < 60) continue;
      if (this.setpiece && this.setpiece.taken && this.setpiece.taker === f && !this.setpiece.touched && f.role !== 'GK') continue;   // (a taker cannot touch it twice)
      const d = Math.hypot(b.x - f.body.x, b.y - f.body.y), reach = (sp > EF.T.trapSpeed ? 4.5 : 9) + (f.role === 'GK' && f.inOwnBox() ? 3 : 0);
      if (d < reach && d < bd) { bd = d; best = f; }
    }
    if (!best) return;
    if (this.setpiece && this.setpiece.taken) this.setpiece.touched = true;
    const pass = b.pass;
    if (pass && pass.from && pass.from.side !== best.side && sp > 110 && best.role !== 'GK') {   // an interception: take it, or deflect it
      const p = .35 + .5 * best.stat('tackle') / 100;
      if (this.rng() > p) {
        const a = Math.atan2(b.vy, b.vx) + (this.rng() - .5) * 1.6, s2 = sp * .55;
        b.vx = Math.cos(a) * s2; b.vy = Math.sin(a) * s2; b.vz = 30 + this.rng() * 30; b.pass = null; best.cool = .25; this.touch(best);
        this.emit('deflect', { who: best }); return;
      }
    }
    if (sp > EF.T.trapSpeed && best.role !== 'GK') {   // a heavy first touch: it bobbles ahead
      const k = 4 + (1 - best.stat('skill') / 100) * 6, a = best.facing;
      this.touch(best); b.pass = null;
      b.vx = Math.cos(a) * (40 + k * 6); b.vy = Math.sin(a) * (40 + k * 6); b.vz = 20; best.cool = .12; return;
    }
    this.setOwner(best, 'trap');
  }
  /** the owned ball sits ahead of its owner's feet (section 6.2) */
  ownerBall(dt) {
    const f = this.owner, b = this.ball; if (!f) return;
    if (f.state === 'down' || f.state === 'launched' || f.sentOff) { this.setOwner(null); return; }
    f.ownT += dt;
    if (f.role === 'GK' && f.holding) { const h = f.handPoint(); b.x = h[0]; b.y = h[1]; b.z = h[2]; b.vx = b.vy = b.vz = 0; return; }
    const B = f.body, sp = Math.hypot(B.vx, B.vy), sprint = f.sprinting && sp > 100;
    const off = sp < 15 ? 5 : sprint ? 10 + 2 * Math.sin(f.stride * 2) : 7 + 2 * Math.sin(f.stride * 2);
    b.x = B.x + Math.cos(f.facing) * off; b.y = B.y + Math.sin(f.facing) * off; b.z = 0; b.vx = B.vx; b.vy = B.vy; b.vz = 0; b.onGround = true;
    b.roll += sp * dt; b.spin = 0;
    // the ball against the boards: it cannot be dribbled through them
    const P = EF.P; b.y = clamp(b.y, P.Y0 + 3, P.Y1 - 3);
  }
  /* ---- notices for the HUD (KICK OFF, GOAL!, ADVANTAGE! ...) ---- */
  note(text, o = {}) { this.notice = { text, t: 0, dur: o.dur || 1.6, color: o.color || null, sub: o.sub || null, big: o.big !== false }; this.emit('notice', { text, sub: o.sub }); }
  /** slow motion for a moment (super strikes, bicycle kicks, the Save Duel), counted in real time */
  slow(scale, seconds) { this.slowmo = { t: seconds }; this.wantScale = scale; }
  /** a step for anything waiting on a mode (the presentation's replay holds the match) */
  replayWait() { /* the replay player releases it (EF.Replay) */ }
  snapshotLite() { return { mode: this.mode, half: this.half, clock: +this.clock.toFixed(2), minute: Math.floor(this.minute), score: this.score.slice(), euphoria: this.euphoria.map(v => Math.round(v)), owner: this.owner ? this.owner.data.name : null }; }
}
EF.Match = Match;
