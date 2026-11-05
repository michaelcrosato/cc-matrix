/* =====================================================================================================================
 * THE MATCH SIMULATION. It reads only intents (from seats: devices, the network, tests) and the CPU brain, and writes
 * only its own plain state. Nothing here draws, plays a sound or reads Math.random: it emits events on TT.bus.
 * Files 10-15 extend Match.prototype: 10 core (players, movement, ball, control), 11 play (passing, kicking, carrier
 * moves, contact), 12 laws (touch, scoring, fouls, the referee, advantage, cards), 13 set pieces, 14 AI, 15 arcade.
 * ===================================================================================================================== */
const FREE = { free: 1, pass: 1, kick: 1 };          // states that accept movement
const BUTTONS = ['x', 'sq', 'ci', 'tri', 'l1', 'r1'];
TT.emptyIntent = () => ({ mx: 0, my: 0, turbo: false, pr: {}, hd: {}, rl: {}, aim: null, click: null, mkick: null, hold: {} });

class Match {
  /** o: { home, away, venue, weather ('venue' | key), time, halfLen, sudden, cup, drill, attract, session, seed, diff,
   *  homeDiff, awayDiff, seats: [{ kind, input, team, label, color }], kits } */
  constructor(o) {
    this.o = o = Object.assign({ home: 'mud', away: 'bad', venue: 'muddington', weather: 'venue', time: null, seed: 7, diff: 'Pro', sudden: false, halfLen: null }, o);
    this.rng = TT.makeRng(o.seed);
    this.venue = TT.VENUES[o.venue] || TT.VENUES.muddington;
    this.time = o.time || this.venue.time;
    const wk = o.weather && o.weather !== 'venue' ? TT.WEATHERS[o.weather] : null;
    this.weather = wk ? wk.w : this.venue.weather;
    this.windy = wk ? !!wk.wind : !!this.venue.wind;
    this.rain = !!(this.weather && this.weather.kind === 'rain');
    this.hazardKind = o.noHazard ? null : this.venue.hazard;
    this.t = 0; this.phase = 'intro'; this.sub = ''; this.phaseT = 0; this.over = false; this.result = null;
    this.half = 1; this.clock = 0; this.hooter = false; this.sudden = false; this.suddenT = 0;
    this.score = [0, 0]; this.hype = [0, 0]; this.dir = [1, -1]; this.poss = 0; this.lastScore = -1;
    this.teamIds = [o.home, o.away];
    this.teams = this.teamIds.map(id => TT.TEAMS[id]);
    this.kits = this.pickKits();
    this.diffs = [TT.DIFF[o.homeDiff || o.diff] || TT.DIFF.Pro, TT.DIFF[o.awayDiff || o.diff] || TT.DIFF.Pro];
    this.stats = [0, 1].map(() => ({ poss: 0, terr: 0, tries: 0, convs: 0, convAtt: 0, pens: 0, tackles: 0, missed: 0, bigHits: 0, monsters: 0, metres: 0, breaks: 0, turnovers: 0, offloads: 0, cards: 0, passes: 0, kicks: 0, scrums: 0, lineouts: 0, rucks: 0 }));
    this.players = [];
    for (let team = 0; team < 2; team++) this.teams[team].roster.forEach((d, slot) => this.players.push(this.makePlayer(team, slot, d)));
    this.ball = { x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, st: 'dead', holder: -1, kind: '', from: -1, to: -1, team: 0, rot: 0, spin: 0, t: 0, land: null, fwd: false, long: false, tried: {}, aimTeam: -1, power: 0, mega: false };
    this.ref = { x: G.CX, y: G.Y0 + 60, z: 0, vx: 0, vy: 0, f: PI / 2, down: 0, call: null, callT: 0, signal: '', sigT: 0, card: '' };
    this.setp = null; this.adv = null; this.cards = []; this.pending = null;
    this.powerups = []; this.puT = 18 + this.rng() * 10; this.hazards = []; this.hazT = 14 + this.rng() * 8;
    this.wind = { s: this.windy ? .5 : 0, a: this.rng() * TAU, t: 15 };
    this.events = []; this.log = []; this.banners = []; this.replayAsk = null; this.lastPassT = -9; this.lastKickT = -9;
    this.seats = (o.seats || []).map((s, i) => Object.assign({ i, pid: -1, kind: 'local', team: 0, label: 'P' + (i + 1), color: E.PLAYER_COLORS[i] || '#ffe08a', I: TT.emptyIntent(), held: {}, heldT: {}, lastSwitch: 0 }, s));
    this.watchdog = 0; this.ruckCount = 0; this.tryRun = null; this.counts = {};
    this.onFireTeam = -1; this.triesRow = {}; this.useIt = 0;
    this.kickoffTeam = 0;
    if (o.halfLen) this.halfLenOverride = o.halfLen;
    this.formation('kickoff', 0, true);
  }
  get halfLen() { return this.halfLenOverride || TUNE.v.halfLength; }
  /** kits: the away side wears its change strip when the two home jerseys are too alike */
  pickKits() {
    const [a, b] = this.teams, lum = h => { const c = E.hex(h); return .3 * c[0] + .59 * c[1] + .11 * c[2]; };
    const clash = Math.abs(lum(a.home.cloth) - lum(b.home.cloth)) < 60 || a.id === b.id;
    return [a.home, clash ? b.away : b.home];
  }
  makePlayer(team, slot, d) {
    return {
      id: team * 7 + slot, team, slot, role: d.role, d, name: d.name, nick: d.nick, boss: !!d.boss,
      spd: d.spd, pow: d.pow, hnd: d.hnd, kck: d.kck, tkl: d.tkl, size: d.size,
      x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, f: team ? PI : 0,
      st: 'free', stT: 0, stDur: 0, turbo: TUNE.v.turboTank, turboIdle: 9, turboOn: false,
      cool: 0, evade: 0, fendT: 0, stepCd: 0, fendCd: 0, lastStep: -9, charge: -1, chargeT: 0, stun: 0, mud: 0,
      ctl: -1, pu: null, fire: 0, sup: null, binT: 0, yellow: 0, cheap: 0, red: false, held: 0, holdBy: -1,
      tries: 0, tackles: 0, metres: 0, monsters: 0, breaks: 0, turnovers: 0, hitBest: 0, inGoalT: 0,
      ai: { tx: G.CX, ty: G.CY, dec: 0, wait: 0, plan: null, buy: 0, chase: false },
      a: { pose: '', down: 0, flip: 0, air: 0, act: '', u: 0, expr: '', hurt: 0, cele: 0, crouch: 0, lean: 0, spin: 0 },
      pk: 0, pkMode: '', pressT: {}
    };
  }
  /* ------------------------------------------------------------------ helpers */
  P(id) { return this.players[id]; }
  team(t) { return this.players.filter(p => p.team === t); }
  onPitch(p) { return p.st !== 'bin' && p.st !== 'off'; }
  able(p) { return FREE[p.st] === 1 || p.st === 'step' || p.st === 'spin'; }
  standing(p) { return this.onPitch(p) && p.st !== 'down' && p.st !== 'launch' && p.st !== 'dive' && p.st !== 'tdive' && p.st !== 'up'; }
  carrier() { return this.ball.st === 'held' ? this.players[this.ball.holder] : null; }
  oppLine(t) { return this.dir[t] > 0 ? G.X1 : G.X0; }
  ownLine(t) { return this.dir[t] > 0 ? G.X0 : G.X1; }
  /** how far toward the opponents' line (along team t's attack direction) */
  adv1(t, x) { return (x - G.CX) * this.dir[t]; }
  inGoal(t, x) { return this.dir[t] > 0 ? x > G.X1 : x < G.X0; }
  emit(name, data = {}) { const e = Object.assign({ t: this.t }, data); this.events.push([name, e]); TT.bus.emit(name, Object.assign({ m: this }, e)); }
  banner(text, o = {}) { this.emit('banner', Object.assign({ text }, o)); }
  refCall(key) { this.ref.call = TT.REF_CALLS[key] || key; this.ref.callT = 1.4; this.emit('refCall', { text: this.ref.call }); }
  hypeAdd(t, n) { if (t < 0 || t > 1) return; const k = n * TUNE.v.hypeMult; this.hype[t] = clamp(this.hype[t] + k, 0, 100); }
  setSt(p, st, dur = 0) { p.st = st; p.stT = 0; p.stDur = dur; }
  /** the seat driving team t's players, if any human is on that team (for set-piece presses) */
  seatsOf(t) { return this.seats.filter(s => s.team === t && s.kind !== 'cpu'); }
  /* ------------------------------------------------------------------ the step */
  step(dt) {
    if (this.over) return;
    dt *= TUNE.v.gameSpeed;
    if (dt <= 0) return;
    this.t += dt; this.phaseT += dt;
    this.control(dt);
    for (const p of this.players) p.I = p.ctl >= 0 ? this.seats[p.ctl].I : this.ai(p, dt);
    const h = this['ph_' + this.phase];
    if (h) h.call(this, dt);
    this.refStep(dt);
    this.arcadeStep(dt);
    this.statsStep(dt);
    this.watch(dt);
    for (const s of this.seats) s.I.pr = {}; // presses are one-shot
  }
  /** a phase that runs too long resolves itself (and says so: tests fail on it) */
  watch(dt) {
    const lim = { play: 1e9, ruck: 8, scrum: 14, lineout: 12, kickoff: 25, setkick: 40, penalty: 25, dead: 6, try: 14, intro: 12, half: 30, dropout: 25 }[this.phase] || 1e9;
    if (this.phaseT > lim) { this.emit('watchdog', { phase: this.phase, sub: this.sub }); this.counts.watchdog = (this.counts.watchdog || 0) + 1; this.resolveStuck(); }
  }
  resolveStuck() {
    const ph = this.phase;
    if (ph === 'ruck') this.ruckEnd(true);
    else if (ph === 'scrum' || ph === 'lineout') this.restartPlay(this.setp ? this.setp.team : this.poss, this.setp ? this.setp.x : G.CX, G.CY);
    else if (ph === 'setkick') this.setKickResult(false, 'miss');
    else if (ph === 'penalty') this.penaltyChoose(0);
    else if (ph === 'try' || ph === 'dead') this.afterDead();
    else if (ph === 'kickoff' || ph === 'dropout') this.kickoffKick(null);
    else if (ph === 'intro') this.goPhase('kickoff');
    else if (ph === 'half') this.secondHalf();
  }
  goPhase(ph, sub = '') { this.phase = ph; this.sub = sub; this.phaseT = 0; this.emit('phase', { phase: ph }); if (ph === 'kickoff') this.kickoffSetup(this.kickoffTeam, 'kickoff'); }
  /* ------------------------------------------------------------------ movement */
  speedOf(p) {
    let s = TUNE.v.runSpeed * (.8 + .04 * Math.min(10, p.spd));
    if (this.ball.holder === p.id && this.ball.st === 'held') s *= .96;
    if (this.inMud(p)) s *= .8;
    if (p.charge >= 0) s *= 1.15;
    if (p.sup && p.sup.kind === 'thunder') s *= 1.35;
    if (p.sup && p.sup.kind === 'hurricane') s *= 2;
    if (p.held > 0) s *= .4;
    if (p.boss) s *= .95;
    return s;
  }
  turboActive(p) { return p.turboOn && (p.turbo > 0 || this.unlimitedTurbo(p)); }
  unlimitedTurbo(p) { return p.fire > 0 || (p.pu && p.pu.kind === 'pie') || (TT.cheats.infTurbo && this.isHumanTeam(p.team)) || (this.o.attract); }
  isHumanTeam(t) { return this.seats.some(s => s.team === t && s.kind !== 'cpu'); }
  /** move a free player by its intent: velocity eases to the stick at the acceleration, turbo, facing */
  movePlayer(p, I, dt, mult = 1) {
    const m = Math.hypot(I.mx, I.my), mx = m > 1 ? I.mx / m : I.mx, my = m > 1 ? I.my / m : I.my;
    p.turboOn = !!I.turbo && m > .2;
    const tb = this.turboActive(p);
    let sp = this.speedOf(p) * mult * (tb ? TUNE.v.turboMult : 1);
    let acc = TUNE.v.accel * (1.15 - .03 * Math.min(10, p.pow)) * (this.inMud(p) ? .6 : 1);
    const tx = mx * sp, ty = my * sp, dx = tx - p.vx, dy = ty - p.vy, d = Math.hypot(dx, dy), step = acc * dt;
    if (d <= step) { p.vx = tx; p.vy = ty; } else { p.vx += dx / d * step; p.vy += dy / d * step; }
    if (m > .15) p.f = E.approachAng(p.f, Math.atan2(my, mx), dt * (this.ball.holder === p.id ? 8 : 10));
    // turbo tank
    if (tb && !this.unlimitedTurbo(p)) { const was = p.turbo; p.turbo = Math.max(0, p.turbo - dt); p.turboIdle = 0; if (p.turbo <= 0 && was > 0) this.emit('sputter', { id: p.id }); }
    else { p.turboIdle += dt; if (p.turboIdle > .6) p.turbo = Math.min(TUNE.v.turboTank, p.turbo + TUNE.v.turboRegen * TUNE.v.turboTank * dt); }
    if (this.unlimitedTurbo(p)) p.turbo = TUNE.v.turboTank;
    p.x += p.vx * dt; p.y += p.vy * dt;
    this.bound(p);
  }
  /** keep bodies inside the stadium (the stands stop them; out of play is a rule, not a wall) */
  bound(p) {
    p.x = clamp(p.x, G.DX0 - 40, G.DX1 + 40); p.y = clamp(p.y, G.Y0 - 38, G.Y1 + 38);
  }
  /** ease a body with no intent to a stop */
  brake(p, dt, k = 600) { p.vx = approach(p.vx, 0, k * dt); p.vy = approach(p.vy, 0, k * dt); p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p); }
  /** walk a body toward a spot (formations at stoppages); returns true when there */
  walkTo(p, x, y, dt, speed = 1) {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d < 2) { p.vx = p.vy = 0; p.x = x; p.y = y; return true; }
    const sp = Math.min(d / dt, this.speedOf(p) * speed);
    p.vx = approach(p.vx, dx / d * sp, 900 * dt); p.vy = approach(p.vy, dy / d * sp, 900 * dt);
    p.f = E.approachAng(p.f, Math.atan2(dy, dx), dt * 10);
    p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p);
    return false;
  }
  inMud(p) { return this.hazardKind === 'mud' && this.mudAt(p.x, p.y); }
  mudAt(x, y) { if (!this.mudBlobs) this.makeMud(); for (const b of this.mudBlobs) if ((x - b.x) ** 2 / (b.rx * b.rx) + (y - b.y) ** 2 / (b.ry * b.ry) < 1) return true; return false; }
  makeMud() {
    const R = TT.makeRng(77); this.mudBlobs = [];
    const n = 5 + Math.floor(R() * 2);
    for (let i = 0; i < n; i++) this.mudBlobs.push({ x: G.X0 + 120 + R() * (G.W - 240), y: G.Y0 + 70 + R() * (G.H - 140), rx: 40 + R() * 40, ry: 26 + R() * 24 });
  }
  /* ------------------------------------------------------------------ the players' common step (states, timers) */
  stepPlayers(dt, freeMove = true) {
    for (const p of this.players) {
      if (!this.onPitch(p)) { this.binStep(p, dt); continue; }
      p.stT += dt; p.cool = Math.max(0, p.cool - dt); p.evade = Math.max(0, p.evade - dt); p.fendT = Math.max(0, p.fendT - dt);
      p.stepCd = Math.max(0, p.stepCd - dt); p.fendCd = Math.max(0, p.fendCd - dt); p.ai.buy = Math.max(0, p.ai.buy - dt);
      if (this.inMud(p)) p.mud = Math.min(.6, p.mud + dt * .03);
      if (p.held > 0) { p.held -= dt; if (p.held <= 0) this.gangShrug(p); }
      switch (p.st) {
        case 'free': case 'pass': case 'kick':
          if (p.st !== 'free' && p.stT >= p.stDur) this.setSt(p, 'free');
          if (freeMove) this.movePlayer(p, p.I, dt, p.st === 'free' ? 1 : .55); else this.brake(p, dt);
          this.actions(p, p.I, dt);
          break;
        case 'step': p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p); if (p.I && p.I.pr.x && p.stT > .02 && this.ball.holder === p.id && this.ball.st === 'held') { this.doSpin(p); break; } if (p.stT >= p.stDur) this.setSt(p, 'free'); break;
        case 'spin': this.movePlayer(p, p.I, dt, .85); p.a.spin = p.stT / p.stDur; if (p.stT >= p.stDur) { this.setSt(p, 'free'); p.vx *= .85; p.vy *= .85; } break;
        case 'lunge': p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p); if (p.stT >= p.stDur) this.setSt(p, 'stumble', .5); break;
        case 'stumble': this.brake(p, dt, 300); if (p.stT >= p.stDur) this.setSt(p, 'free'); break;
        case 'dive': this.diveStep(p, dt); break;
        case 'tdive': { const k = Math.exp(-dt * 4); p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p); if (p.stT >= p.stDur) this.setSt(p, 'down', .5); break; }
        case 'down': this.brake(p, dt, 500); if (p.stT >= p.stDur && !p.pin) this.setSt(p, 'up', .4); break;
        case 'up': this.brake(p, dt); if (p.stT >= p.stDur) this.setSt(p, 'free'); break;
        case 'launch': this.launchStep(p, dt); break;
        case 'stun': this.brake(p, dt); if (p.stT >= p.stDur) this.setSt(p, 'free'); break;
        case 'cele': this.brake(p, dt, 200); break;
        case 'ruck': case 'set': break;   // the set piece moves them
      }
      if (p.charge >= 0) this.chargeStep(p, dt);
    }
    this.separate();
  }
  /** players push apart a little (no stacking), except those locked in rucks and set pieces */
  separate() {
    const L = this.players;
    for (let i = 0; i < L.length; i++) {
      const a = L[i]; if (!this.onPitch(a) || a.st === 'ruck' || a.st === 'set' || a.st === 'launch') continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j]; if (!this.onPitch(b) || b.st === 'ruck' || b.st === 'set' || b.st === 'launch') continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 8 + (a.boss || b.boss ? 6 : 0);
        if (d > 0 && d < min) { const k = (min - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
      }
    }
  }
  /* ------------------------------------------------------------------ the ball */
  stepBall(dt) {
    const b = this.ball;
    b.rot += dt * (b.st === 'air' ? (b.kind === 'pass' ? 18 : 12) : b.st === 'loose' ? Math.hypot(b.vx, b.vy) * .08 : 0);
    if (b.st === 'held') {
      const c = this.players[b.holder];
      if (!c) { b.st = 'loose'; return; }
      const f = c.f, side = c.team ? -1 : 1;
      b.x = c.x + Math.cos(f) * 3 + Math.cos(f + PI / 2) * 3 * side; b.y = c.y + Math.sin(f) * 3 + Math.sin(f + PI / 2) * 3 * side;
      b.z = c.z + (c.st === 'down' || c.st === 'tdive' ? 3 : 15 * c.size); b.vx = c.vx; b.vy = c.vy; b.vz = 0;
      return;
    }
    if (b.st === 'dead' || b.st === 'placed') { b.vx = b.vy = b.vz = 0; return; }
    b.t += dt;
    const x0 = b.x, y0 = b.y;
    if (b.st === 'air' || b.z > 0.5) {
      b.vz -= 600 * dt;
      const drag = Math.exp(-dt * .3); b.vx *= drag; b.vy *= drag;
      if (this.wind.s > 0 && b.kind !== 'pass') { const w = 40 * this.wind.s * TUNE.v.windMult * dt; b.vx += Math.cos(this.wind.a) * w; b.vy += Math.sin(this.wind.a) * w; }
    } else { const f = Math.exp(-dt * (this.rain ? 1.1 : 1.4)); b.vx *= f; b.vy *= f; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    // the goal plane: kicks at the posts are judged as they cross the try line
    if (b.aimTeam >= 0) this.postCheck(b, x0, y0);
    if (b.z <= 0 && b.vz < 0) {
      b.z = 0;
      if (b.vz < -30) {
        // the oval bounce: the ground velocity turned by up to 70 degrees, the rebound anything from dead to lively
        const ch = TUNE.v.bounceChaos * (b.kind === 'grubber' ? 1.4 : 1);
        const a = (this.rng() * 2 - 1) * 70 * PI / 180 * ch, c = Math.cos(a), s = Math.sin(a);
        const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c;
        const hk = b.kind === 'grubber' && this.rng() < .3 ? 1.6 : 1;
        b.vx = vx * .8; b.vy = vy * .8; b.vz = -b.vz * .45 * (.3 + this.rng() * .95) * hk;
        if (b.vz < 12) b.vz = 0;
        this.emit('bounce', { x: b.x, y: b.y, v: Math.abs(b.vz) });
      } else b.vz = 0;
      if (b.st === 'air') this.ballLands();
      b.st = 'loose';
    }
    // the ball is not stopped by anything but the ground; the stands' fronts stop a rolling ball
    if (b.x < 30) { b.x = 30; b.vx = Math.abs(b.vx) * .4; } if (b.x > G.COLS * T - 30) { b.x = G.COLS * T - 30; b.vx = -Math.abs(b.vx) * .4; }
    if (b.y < 50) { b.y = 50; b.vy = Math.abs(b.vy) * .4; } if (b.y > G.Y1 + 60) { b.y = G.Y1 + 60; b.vy = -Math.abs(b.vy) * .4; }
  }
  /** a pass or kick in the air came down without being caught */
  ballLands() {
    const b = this.ball;
    if (b.kind === 'pass' && b.fwd) { this.forwardPass(b.from, b.x, b.y); return; }
    if (b.kind === 'kickoff' && this.kickoffCheck(null)) return;
    if (b.kind === 'pass') this.emit('spill', { x: b.x, y: b.y });
    b.aimTeam = -1;
  }
  /** release the ball from its holder into the air: velocity (vx, vy, vz) and what it is */
  release(p, vx, vy, vz, kind, to = -1) {
    const b = this.ball;
    if (p) { b.x = p.x + Math.cos(p.f) * 4; b.y = p.y + Math.sin(p.f) * 4; }   // from the passer's or kicker's hands
    b.st = 'air'; b.holder = -1; b.vx = vx; b.vy = vy; b.vz = vz; b.kind = kind; b.from = p ? p.id : -1; b.to = to; b.t = 0;
    b.team = p ? p.team : b.team; b.tried = {}; b.fwd = false; b.z = Math.max(b.z, kind === 'pass' ? 14 : 4);
    b.t0Key = this.t; b.spillFwd = false;
    if (p) { this.poss = p.team; p.cool = .25; }
    b.land = this.predictLanding();
  }
  /** where the ball in the air will come down (no wind, no bounce): for landing rings and catchers */
  predictLanding() {
    const b = this.ball, g = 600, t = (b.vz + Math.sqrt(Math.max(0, b.vz * b.vz + 2 * g * b.z))) / g;
    const k = (1 - Math.exp(-.3 * t)) / .3;   // horizontal drag
    return { x: b.x + b.vx * k, y: b.y + b.vy * k, t };
  }
  /** a player takes the ball */
  give(p, how = 'catch') {
    const b = this.ball, prevTeam = b.st === 'held' ? this.players[b.holder].team : b.team;
    b.st = 'held'; b.holder = p.id; b.kind = ''; b.to = -1; b.aimTeam = -1; b.t = 0; b.team = p.team;
    if (this.poss !== p.team || prevTeam !== p.team) { this.emit('possession', { team: p.team, id: p.id, how }); }
    this.poss = p.team; p.inGoalT = 0; p.carryX = p.x;
    this.emit('catch', { id: p.id, how });
  }
  /* ------------------------------------------------------------------ control: which player each seat drives */
  control(dt) {
    for (const s of this.seats) {
      if (s.kind === 'cpu') continue;
      let p = this.players[s.pid];
      if (!p || p.team !== s.team || !this.onPitch(p) || p.ctl !== s.i) { this.assign(s, this.bestFor(s)); p = this.players[s.pid]; }
      const I = s.I, c = this.carrier();
      // the team gains the ball: the seat takes the carrier (with two humans on a side, the nearer one)
      if (c && c.team === s.team && c.id !== s.pid && c.ctl < 0) {
        const mates = this.seats.filter(q => q.team === s.team && q.kind !== 'cpu' && q !== s);
        const nearer = mates.every(q => { const qp = this.players[q.pid]; return !qp || dist(this.players[s.pid] || c, c) <= dist(qp, c) || this.players[q.pid] === c; });
        if (nearer && this.phase !== 'scrum' && this.phase !== 'lineout') this.assign(s, c.id);
      }
      if (this.phase === 'setkick' || this.phase === 'penalty') continue;
      const cur = this.players[s.pid];
      const mine = c && c.team === s.team;
      if (!mine && this.phase === 'play') {
        // buttons: L1 / R1 move up / down the line, O to the man nearest the ball, a click on a teammate
        if (I.pr.l1 || I.pr.r1) this.switchLine(s, I.pr.l1 ? -1 : 1);
        else if (I.pr.ci && !(cur && cur.sup)) this.assign(s, this.nearestBall(s.team, s));
        if (I.click >= 0 && I.click !== null) { const q = this.players[I.click]; if (q && q.team === s.team && this.canTake(q, s)) this.assign(s, q.id); }
        // auto-switch (Settings, Game): Assisted on each pass or kick, and when no one is in range; Full: always the best
        const mode = this.o.autoSwitch || 'Assisted';
        if (mode !== 'Manual' && cur && !(cur.sup && cur.sup.kind === 'hurricane') && cur.charge < 0) {
          if (mode === 'Full' && this.t - s.lastSwitch > .5) { const b = this.bestDefender(s.team, s); if (b >= 0 && b !== s.pid) this.assign(s, b, true); }
          if (mode === 'Assisted' && (this.ball.t < .02 && this.ball.st === 'air' && this.ball.team !== s.team && this.t - s.lastSwitch > .3)) { const b = this.bestDefender(s.team, s); if (b >= 0 && b !== s.pid) this.assign(s, b, true); }
          if (cur.st === 'down' || cur.st === 'up' || cur.st === 'dive' || cur.st === 'launch') { if (this.t - s.lastSwitch > .4) { const b = this.bestDefender(s.team, s); if (b >= 0 && b !== s.pid) this.assign(s, b, true); } }
        }
      }
      if (this.phase === 'play' && this.ball.st !== 'held' && this.ball.team === s.team && this.ball.kind === 'pass' && this.ball.to >= 0) {
        const rcv = this.players[this.ball.to]; if (rcv && rcv.ctl < 0 && rcv.team === s.team && this.ball.t > .05) this.assign(s, rcv.id);
      }
    }
  }
  canTake(p, s) { return p && p.team === s.team && this.onPitch(p) && (p.ctl < 0 || p.ctl === s.i) && p.st !== 'down' && p.st !== 'launch' && !(this.parked && this.parked.has(p.id)); }
  assign(s, id, auto) {
    if (id < 0 || id === undefined) return;
    const old = this.players[s.pid]; if (old && old.ctl === s.i) old.ctl = -1;
    const p = this.players[id]; if (!p) return;
    if (p.ctl >= 0 && p.ctl !== s.i) return;
    s.pid = id; p.ctl = s.i; s.lastSwitch = this.t;
    if (p.charge >= 0 && !s.I.hd.x) p.charge = -1;
    this.emit('switch', { seat: s.i, id, auto: !!auto });
  }
  bestFor(s) {
    const c = this.carrier();
    if (c && c.team === s.team && (c.ctl < 0 || c.ctl === s.i)) return c.id;
    const b = this.bestDefender(s.team, s); if (b >= 0) return b;
    const any = this.players.find(p => this.canTake(p, s)); return any ? any.id : -1;
  }
  nearestBall(team, s) {
    let best = -1, bd = 1e9; const b = this.ball;
    for (const p of this.players) if (p.team === team && this.canTake(p, s)) { const d = dist2(p.x, p.y, b.x, b.y); if (d < bd) { bd = d; best = p.id; } }
    return best;
  }
  /** the defender best placed to make the tackle: the soonest to reach where the ball is going */
  bestDefender(team, s) {
    const b = this.ball, c = this.carrier(), tx = c ? c.x + c.vx * .3 : (b.land && b.st === 'air' ? b.land.x : b.x), ty = c ? c.y + c.vy * .3 : (b.land && b.st === 'air' ? b.land.y : b.y);
    let best = -1, bd = 1e9;
    for (const p of this.players) {
      if (p.team !== team || !this.canTake(p, s || { i: -9, team })) continue;
      if (p.st === 'down' || p.st === 'up' || p.st === 'dive') continue;
      const d = dist2(p.x, p.y, tx, ty) / (this.speedOf(p) * .01 + 1);
      if (d < bd) { bd = d; best = p.id; }
    }
    return best;
  }
  /** move a seat's control one man up (-1, toward the far touchline: smaller y) or down the line */
  switchLine(s, side) {
    const cur = this.players[s.pid]; if (!cur) return;
    const c = this.players.filter(p => p.team === s.team && p.id !== cur.id && this.canTake(p, s) && (p.y - cur.y) * side > 0)
      .sort((a, b) => Math.abs(a.y - cur.y) - Math.abs(b.y - cur.y))[0];
    if (c) this.assign(s, c.id);
  }
}
TT.Match = Match;
