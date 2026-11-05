/* AMERICAN FOOTBALL FIASCO — the match simulation. It owns athletes, the ball, the rules and the clock in world units
 * (1 yard = 10 units; x runs downfield for side 0, to the right). It never reads a rig, a camera or the DOM: the
 * presentation reads its state and drains its `events`. */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF, T = FF.T, { clamp, lerp } = E;
const Y = 10, GL0 = 100, GL1 = 1100, FX = 1200, YMIN = 104, YMAX = 488, CY = 296;
FF.FIELD = { Y, GL0, GL1, FX, YMIN, YMAX, CY };
const dst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const dirOf = s => (s === 0 ? 1 : -1);
const yardline = (x, s) => (s === 0 ? (x - GL0) / Y : (GL1 - x) / Y);   // 0..100 from the team's own goal line

class Match {
  constructor(o = {}) {
    this.o = o; this.rng = E.rng(o.seed || 20261104);
    this.teams = [FF.TEAMS[o.home || 'fiascos'], FF.TEAMS[o.away || 'bruisers']];
    this.humans = o.humans || [true, false];
    this.mode = o.mode || 'exh'; this.bossKind = o.boss || null; this.cheat = !!o.cheat; this.noClock = !!o.noClock;
    this.quarters = o.quarters || 4; this.qlen = o.qlen || T.quarter;
    this.score = [0, 0]; this.q = 1; this.clock = this.qlen; this.time = 0; this.events = [];
    this.poss = 0; this.down = 1; this.los = GL0 + 25 * Y; this.by = CY; this.fd = this.los + T.gain * Y;
    this.phase = 'call'; this.callStage = 0; this.pt = 0; this.callO = null; this.callD = null; this.callTime = 0;
    this.turbo = [100, 100]; this.meter = [0, 0]; this.card = [null, null]; this.fire = [0, 0]; this.streak = [0, 0];
    this.fx = { rocket: [0, 0], warp: [0, 0] }; this.mascot = null; this.bolts = [];
    this.stats = [0, 1].map(() => ({ yards: 0, passes: 0, comps: 0, hits: 0, ints: 0, fumbles: 0, tds: 0, sacks: 0, first: 0, plays: 0 }));
    this.longest = 0; this.over = false; this.winner = -1; this.ot = false; this.lights = true; this.adj = [0, 0];
    this.ball = { x: this.los, y: CY, z: 0, vx: 0, vy: 0, vz: 0, state: 'held', carrier: null, side: 0, rot: 0 };
    this.P = [];
    for (let s = 0; s < 2; s++) for (let k = 0; k < 7; k++) {
      const r = this.teams[s].r, h = ((FF.hash(this.teams[s].id + k) % 100) / 100) - .5;
      this.P.push({ id: s * 7 + k, side: s, k, role: FF.OFF_ROLES[k], x: this.los, y: CY, vx: 0, vy: 0, z: 0, vz: 0, face: s ? Math.PI : 0, state: 'idle', st: 0,
        speed: r.spd * (1 + h * .08), tk: r.str * (1 + h * .06), hnd: r.hnd * (1 + h * .06), str: r.str * (1 + h * .1), tx: this.los, ty: CY, route: null, ri: 0,
        engaged: null, blockT: 0, cool: 0, evade: 0, armT: 0, diveT: 0, jumpT: 0, turbo: false, slow: 1, human: false, ball: false, ass: null, hitC: 0, jukeCd: 0, armCd: 0, pose: '', poseT: 0, dvx: 0, dvy: 0 });
    }
    this.ctlLock = [null, null]; this.live = null; this.res = null; this.kick = null; this.rec = []; this.recT = 0; this.replay = null; this.lastGain = 0; this.msg = '';
    if (o.start) Object.assign(this, o.start);
    this.fd = this.fdLine(); this.placeIdle();
  }
  dir(s) { return dirOf(s); }
  rnd() { return this.rng(); }
  ev(type, d) { this.events.push(Object.assign({ type, t: this.time }, d || {})); }
  off() { return this.P.slice(this.poss * 7, this.poss * 7 + 7); }
  def() { return this.P.slice((1 - this.poss) * 7, (1 - this.poss) * 7 + 7); }
  fdLine() { const d = dirOf(this.poss); return clamp(this.los + d * T.gain * Y, GL0, GL1); }
  toGo() { const d = dirOf(this.poss); return Math.max(1, Math.round((this.fd - this.los) * d / Y)); }
  goalDist() { const d = dirOf(this.poss); return Math.round(((d > 0 ? GL1 : GL0) - this.los) * d / Y); }
  carrier() { return this.ball.carrier; }

  /* ---------- lining up ---------- */
  formation(p, off) {
    const d = dirOf(this.poss), f = (off ? FF.OFF_FORM : FF.DEF_FORM)[p.role];
    return [this.los + d * f[0] * Y, this.by + d * f[1] * Y];
  }
  placeIdle() {
    const off = this.poss;
    for (const p of this.P) {
      p.role = (p.side === off ? FF.OFF_ROLES : FF.DEF_ROLES)[p.k];
      const [x, y] = this.formation(p, p.side === off); p.x = p.tx = x; p.y = p.ty = y; p.vx = p.vy = 0; p.state = 'idle'; p.face = dirOf(off) > 0 ? 0 : Math.PI; p.z = 0;
      p.ball = false; p.engaged = null; p.slow = 1; p.evade = 0; p.armT = 0; p.route = null; p.ass = null; p.human = false; p.pose = '';
    }
    this.ball.state = 'spot'; this.ball.carrier = null; this.ball.x = this.los; this.ball.y = this.by; this.ball.z = 0; this.ball.side = off;
  }

  /* ---------- play calling ---------- */
  needCall() { return this.phase === 'call' ? (this.callStage === 0 ? (this.humans[this.poss] ? 'off' : null) : (this.humans[1 - this.poss] ? 'def' : null)) : null; }
  chooseOff(id) {
    if (this.phase !== 'call' || this.callStage !== 0) return false;
    if (id === 'fg' || id === 'punt') { this.callO = id; this.startKick(id); return true; }
    if (!FF.PLAYS[id]) return false; this.callO = id; this.callStage = 1; return true;
  }
  chooseDef(id) { if (this.phase !== 'call' || this.callStage !== 1 || !FF.DEFS[id]) return false; this.callD = id; this.beginSet(); return true; }
  aiOffCall() {
    const d = dirOf(this.poss), gd = this.goalDist(), r = this.rnd(), tg = this.toGo(), lead = this.score[this.poss] - this.score[1 - this.poss];
    if (this.down === 4) {
      if (gd + 17 <= 50 - (this.mode === 'attract' ? 0 : 0) && (lead <= 3 || tg > 3 || this.clock < 20)) return 'fg';
      if (gd > 55 && tg > 2) return 'punt';
      if (r < .5) return tg > 5 ? 'bomb' : 'dive';
    }
    if (tg > 12) return r < .5 ? 'bomb' : r < .85 ? 'slants' : 'flea';
    if (tg <= 4) return r < .55 ? 'dive' : r < .8 ? 'sweep' : r < .95 ? 'slants' : 'flea';
    const bag = ['slants', 'slants', 'bomb', 'screen', 'dive', 'dive', 'sweep', 'flea'];
    void d; return bag[Math.floor(r * bag.length)];
  }
  aiDefCall() {
    const r = this.rnd(), tg = this.toGo();
    if (tg <= 4) return r < .5 ? 'blitz' : r < .75 ? 'spy' : 'man';
    if (tg > 14) return r < .5 ? 'zone' : r < .8 ? 'man' : 'spy';
    return FF.DEF_ORDER[Math.floor(r * 4)];
  }

  beginSet() {
    this.phase = 'set'; this.pt = 0; const off = this.poss;
    for (const p of this.P) {
      p.role = (p.side === off ? FF.OFF_ROLES : FF.DEF_ROLES)[p.k];
      const [x, y] = this.formation(p, p.side === off); p.tx = x; p.ty = y; p.state = 'set'; p.pose = ''; p.ball = false; p.engaged = null; p.slow = 1; p.z = 0; p.route = null; p.ass = null; p.evade = 0; p.armT = 0; p.cool = 0;
    }
    this.ball.state = 'spot'; this.ball.carrier = null; this.ball.x = this.los; this.ball.y = this.by; this.ball.z = 0;
    this.ev('set', { off: this.callO, def: this.callD });
  }

  /* ---------- the snap ---------- */
  snap() {
    const off = this.poss, d = dirOf(off), play = FF.PLAYS[this.callO], offP = this.off(), defP = this.def();
    const by = (arr, role) => arr.find(p => p.role === role);
    const qb = by(offP, 'QB');
    this.phase = 'live'; this.pt = 0; this.rec = []; this.recT = 0;
    const L = this.live = { t: 0, play, defc: this.callD, mode: play.kind === 'run' ? 'handoff' : 'pocket', handed: false, backed: false, thrown: false, caught: false, free: false, big: false, mega: false,
      qb, rb: by(offP, 'RB'), start: this.los, over: false, endT: 0, turnover: false, poss: off, thrower: null, decideT: (play.decide || 1.5) * (0.85 + this.rnd() * .5), pressured: false, tdBy: -1, fumbleBy: -1, passes: 0, hits: 0, lat: 0, sweepPitch: false };
    this.ball.state = 'held'; this.ball.carrier = qb; qb.ball = true; this.ball.side = off;
    // offense routes (world waypoints)
    for (const p of offP) {
      p.state = 'run'; p.ri = 0; p.route = null; p.ass = null;
      if (play.routes && play.routes[p.role]) p.route = play.routes[p.role].map(([fx, fy]) => ({ x: p.x + d * fx * Y, y: p.y + d * fy * Y }));
      if (play.kind === 'run' && p.role === 'RB') p.route = play.path.map(([fx, fy]) => ({ x: this.los + d * fx * Y, y: this.by + d * fy * Y }));
      if (play.kind === 'trick' && p.role === 'RB') p.route = [{ x: this.los + d * -3 * Y, y: this.by + d * -1 * Y }];
    }
    // defense assignments
    const wr1 = by(offP, 'WR1'), wr2 = by(offP, 'WR2'), te = by(offP, 'TE'), rb = by(offP, 'RB');
    const c = this.callD;
    for (const p of defP) {
      p.state = 'run'; const r = p.role; let a = { kind: 'zone' };
      if (r === 'DL1' || r === 'DL2') a = { kind: 'rush' };
      else if (c === 'blitz') a = (r === 'LB1' || r === 'LB2') ? { kind: 'rush' } : r === 'DB1' ? { kind: 'man', t: wr1 } : r === 'DB2' ? { kind: 'man', t: wr2 } : { kind: 'zone', sx: 18, sy: 0 };
      else if (c === 'man') a = r === 'LB1' ? { kind: 'man', t: te } : r === 'LB2' ? { kind: 'man', t: rb } : r === 'DB1' ? { kind: 'man', t: wr1 } : r === 'DB2' ? { kind: 'man', t: wr2 } : { kind: 'zone', sx: 18, sy: 0 };
      else if (c === 'spy') a = r === 'LB1' ? { kind: 'spy' } : r === 'LB2' ? { kind: 'zone', sx: 7, sy: 6 } : r === 'DB1' ? { kind: 'zone', sx: 13, sy: -10 } : r === 'DB2' ? { kind: 'zone', sx: 13, sy: 10 } : { kind: 'zone', sx: 19, sy: 0 };
      else a = r === 'LB1' ? { kind: 'zone', sx: 7, sy: -6 } : r === 'LB2' ? { kind: 'zone', sx: 7, sy: 6 } : r === 'DB1' ? { kind: 'zone', sx: 14, sy: -11 } : r === 'DB2' ? { kind: 'zone', sx: 14, sy: 11 } : { kind: 'zone', sx: 20, sy: 0 };
      p.ass = a;
    }
    this.stats[off].plays++; for (const s of [0, 1]) if (this.fire[s] > 0) this.fire[s]--;
    this.ev('snap', { x: this.los, y: this.by });
  }

  /* ---------- the frame ---------- */
  update(dtIn, ctl) {
    const dt = Math.min(dtIn, 1 / 30) * T.gameSpeed; this.time += dt; ctl = ctl || [null, null];
    for (const s of [0, 1]) { this.fx.rocket[s] = Math.max(0, this.fx.rocket[s] - dt); this.fx.warp[s] = Math.max(0, this.fx.warp[s] - dt); }
    for (const b of this.bolts) b.t -= dt; this.bolts = this.bolts.filter(b => b.t > 0);
    switch (this.phase) {
      case 'call': this.updCall(dt, ctl); break;
      case 'set': this.updSet(dt, ctl); break;
      case 'live': this.updLive(dt, ctl); break;
      case 'dead': this.updDead(dt); break;
      case 'kick': this.updKick(dt, ctl); break;
      case 'score': this.updScore(dt); break;
      case 'qend': this.pt += dt; if (this.pt > 2.4) this.nextQuarter(); break;
      case 'half': this.pt += dt; if (this.pt > 5 && ([0, 1].every(s => !this.humans[s] || this.adj[s] !== 0) || this.pt > 16)) this.nextQuarter(); break;
      default: break;
    }
    // team meters that always tick
    for (const s of [0, 1]) if (this.turbo[s] < 100) this.turbo[s] = Math.min(100, this.turbo[s] + T.turboRegen * dt * (this.phase === 'live' ? .35 : 2));
  }
  updCall(dt) {
    this.pt += dt; this.callTime += dt;
    if (this.callStage === 0 && !this.humans[this.poss]) { if (this.pt > .35) { const c = this.aiOffCall(); this.chooseOff(c); } }
    else if (this.callStage === 1 && !this.humans[1 - this.poss]) { if (this.pt > .35) { this.chooseDef(this.aiDefCall()); } }
  }
  updSet(dt, ctl) {
    this.pt += dt; let settled = true;
    for (const p of this.P) {
      const dx = p.tx - p.x, dy = p.ty - p.y, dd = Math.hypot(dx, dy);
      if (dd > 1.2) { const v = Math.min(dd / dt, 90); p.vx = dx / dd * v; p.vy = dy / dd * v; p.x += p.vx * dt; p.y += p.vy * dt; settled = false; p.face = Math.atan2(dy, dx); }
      else { p.vx = p.vy = 0; p.face = dirOf(this.poss) > 0 ? 0 : Math.PI; }
    }
    const humanOff = this.humans[this.poss], c = ctl[this.poss];
    if (settled && ((humanOff && c && c.a && this.pt > .5) || (!humanOff && this.pt > 1.1) || this.pt > 9)) this.snap();
  }

  /* ---------- the live play ---------- */
  setHuman() {
    for (const p of this.P) p.human = false;
    const L = this.live, b = this.ball;
    for (const s of [0, 1]) {
      if (!this.humans[s] || T.aiOnly) { this.ctlOf = this.ctlOf || [null, null]; this.ctlOf[s] = null; continue; }
      let ctlP = null;
      if (b.state === 'held' && b.carrier && b.carrier.side === s) ctlP = b.carrier;
      else if (b.state === 'air' && b.target && b.side === s) ctlP = b.target;
      else if (b.state === 'held' && L.mode === 'handoff' && L.poss === s && !L.handed) ctlP = null;
      else {
        const refp = b.carrier || b;
        const lock = this.ctlLock[s];
        if (lock && lock.side === s && lock.state !== 'down' && lock.state !== 'stun') ctlP = lock;
        else { let bd = 1e9; for (const p of this.P) if (p.side === s && p.state !== 'down') { const d = dst(p, refp) + (p.engaged ? 40 : 0); if (d < bd) { bd = d; ctlP = p; } } }
      }
      if (ctlP) ctlP.human = true;
      this.ctlOf = this.ctlOf || [null, null]; this.ctlOf[s] = ctlP;
    }
  }
  speedOf(p, turbo) {
    const s = p.side; let v = (turbo ? T.turboSpeed : T.runSpeed) * p.speed;
    if (this.fx.rocket[s] > 0) v *= 1.6; if (this.fx.warp[1 - s] > 0) v *= .45;
    if (this.fire[s] > 0) v *= 1.07; if (p.engaged) v *= .3; if (p.ball) v *= .97; if (this.bossKind === 'frost' && p.frozen > 0) v *= .5;
    return v * p.slow;
  }
  steer(p, vx, vy, dt, k = 9) { p.dvx = vx; p.dvy = vy; const a = Math.min(1, dt * k); p.vx += (vx - p.vx) * a; p.vy += (vy - p.vy) * a; }
  goTo(p, x, y, dt, f = 1, turbo = false, stop = 2) {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy), v = this.speedOf(p, turbo) * f;
    if (d < stop) this.steer(p, 0, 0, dt); else this.steer(p, dx / d * Math.min(v, d / dt * .9), dy / d * Math.min(v, d / dt * .9), dt);
  }
  updLive(dt, ctl) {
    const L = this.live, b = this.ball, offS = L.poss;
    L.t += dt;
    if (!T.noClock && !this.noClock && !L.over) this.clock = Math.max(0, this.clock - dt);
    if (!L.over) this.setHuman();
    // per-player timers
    for (const p of this.P) {
      p.cool = Math.max(0, p.cool - dt); p.evade = Math.max(0, p.evade - dt); p.armT = Math.max(0, p.armT - dt); p.jukeCd = Math.max(0, p.jukeCd - dt); p.armCd = Math.max(0, p.armCd - dt);
      p.slow = Math.min(1, p.slow + dt * .6); if (p.frozen > 0) p.frozen -= dt;
      if (p.state === 'stun' || p.state === 'down') { p.st -= dt; if (p.st <= 0 && !(p.state === 'down' && L.over)) { p.state = 'run'; p.st = 0; } }
      if (p.state === 'dive') { p.diveT -= dt; if (p.diveT <= 0) { p.state = 'down'; p.st = .7; p.dive = false; } }
      if (p.z > 0 || p.vz) { p.vz -= 520 * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; } }
    }
    if (!L.over) {
      for (const s of [0, 1]) if ((!this.humans[s] || T.aiOnly) && this.card[s] && L.t > .9 && (L.free || L.handed || L.thrown) && this.ball.carrier && this.rnd() < dt * 1.2) this.useCard(s);   // the CPU plays its cards too
      this.controlPlayers(dt, ctl);
      this.aiOffense(dt, ctl); this.aiDefense(dt);
      this.blocking(dt, ctl);
    }
    // move
    for (const p of this.P) {
      if (p.state === 'down' || p.state === 'stun' || L.over) { p.vx *= Math.max(0, 1 - dt * 7); p.vy *= Math.max(0, 1 - dt * 7); }
      if (p.engaged && p.engaged.state !== 'down') { /* pinned: the block pushes */ }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.y = clamp(p.y, YMIN - 22, YMAX + 22); p.x = clamp(p.x, GL0 - 95, GL1 + 95);
      const sp = Math.hypot(p.vx, p.vy); if (sp > 6 && p.state !== 'down') p.face = Math.atan2(p.vy, p.vx);
    }
    this.separate();
    if (!L.over) { this.updBall(dt, ctl); this.contacts(dt); this.updMascot(dt); this.checkEnd(dt); }
    else { L.endT += dt; }
    // record for replays
    this.recT += dt; if (this.recT >= 1 / 30) { this.recT = 0; this.rec.push(this.snapshot()); if (this.rec.length > 420) this.rec.shift(); }
    // meter drain for human turbo handled in controlPlayers
  }
  snapshot() {
    return { b: [this.ball.x, this.ball.y, this.ball.z, this.ball.state === 'held' ? 1 : 0], p: this.P.map(p => [p.x, p.y, p.z, p.face, p.state, p.vx, p.vy]), c: this.ball.carrier ? this.ball.carrier.id : -1 };
  }
  separate() {
    const P = this.P;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const a = P[i], c = P[j]; if (a.state === 'down' || c.state === 'down') continue;
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d < 7 && d > .01) { const push = (7 - d) * .5; a.x -= dx / d * push; a.y -= dy / d * push; c.x += dx / d * push; c.y += dy / d * push; }
    }
  }

  /* ---------- human control ---------- */
  controlPlayers(dt, ctl) {
    const L = this.live, b = this.ball;
    for (const s of [0, 1]) {
      const c = ctl[s], p = this.ctlOf && this.ctlOf[s];
      if (!c || !p || !this.humans[s] || T.aiOnly) continue;
      const mag = Math.hypot(c.mx, c.my), nx = mag > .01 ? c.mx / Math.max(1, mag) : 0, ny = mag > .01 ? c.my / Math.max(1, mag) : 0;
      let turbo = false;
      if (c.turbo && mag > .2 && (this.turbo[s] > 1 || T.godTurbo)) { turbo = true; if (!T.godTurbo) this.turbo[s] = Math.max(0, this.turbo[s] - T.turboDrain * dt); }
      p.turbo = turbo;
      if (p.state === 'down' || p.state === 'stun') continue;
      if (p.state === 'dive') { continue; }
      let sp = this.speedOf(p, turbo);
      if (p.evadeVx !== undefined && p.evade > 0) { this.steer(p, p.evadeVx, p.evadeVy, dt, 18); }
      else this.steer(p, nx * sp, ny * sp, dt);
      if (p.jukeT > 0) p.jukeT -= dt;
      // swap defender
      if (c.swap || (c.b && !p.ball && !(b.state === 'held' && b.carrier && b.carrier.side === s && L.mode === 'handoff'))) {
        if (b.state !== 'held' || b.carrier.side !== s) {
          const ref = b.carrier || b; let best = null, bd = 1e9;
          for (const q of this.P) if (q.side === s && q !== p && q.state !== 'down' && q.state !== 'stun') { const d = dst(q, ref); if (d < bd) { bd = d; best = q; } }
          if (best && (c.swap || c.b)) { this.ctlLock[s] = best; this.ev('swap', { id: best.id }); }
        }
      }
      if (p.ball) this.carrierActions(p, c, nx, ny, dt);
      else if (b.state === 'air' && b.target === p) { if (c.x || c.a) this.jump(p); }
      else if (p.side !== (b.carrier ? b.carrier.side : L.poss) || b.state !== 'held') {
        // defense (or no ball): a dive-tackle, x jump / swat
        if (c.a && p.diveT <= 0 && p.cool <= 0 && !p.engaged) this.dive(p, nx, ny);
        if (c.x) this.jump(p);
        if (p.engaged && (c.a || c.x)) p.engaged.blockT -= .22;   // mash to shed
      }
      if (c.y) this.useCard(s);
    }
  }
  jump(p) { if (p.z <= 0.1) { p.vz = 150; p.jumpT = .5; p.pose = 'jump'; } }
  dive(p, nx, ny) {
    const ang = (Math.abs(nx) + Math.abs(ny) > .1) ? Math.atan2(ny, nx) : p.face;
    p.state = 'dive'; p.diveT = .42; const v = T.turboSpeed * 1.25 * p.speed;
    p.vx = Math.cos(ang) * v; p.vy = Math.sin(ang) * v; p.face = ang; p.cool = .8; p.dive = true; this.ev('dive', { id: p.id });
  }
  carrierActions(p, c, nx, ny, dt) {
    const L = this.live, s = p.side;
    if (c.a && p.jukeCd <= 0 && p.evade <= 0) {   // juke: a sideways burst you cannot be tackled during
      const sx = nx || Math.cos(p.face), sy = ny || Math.sin(p.face), px = -sy, py = sx, sign = ((FF.hash('j' + Math.floor(this.time * 10)) & 1) ? 1 : -1);
      p.evade = .32; p.jukeCd = .9; const sp = this.speedOf(p, true);
      // dodge to the side of the nearest chaser
      let nearest = null, nd = 1e9; for (const q of this.P) if (q.side !== s && q.state !== 'down') { const d = dst(p, q); if (d < nd) { nd = d; nearest = q; } }
      let side = sign; if (nearest) side = ((nearest.x - p.x) * px + (nearest.y - p.y) * py) > 0 ? -1 : 1;
      p.evadeVx = (sx * .6 + px * side * 1.2) * sp; p.evadeVy = (sy * .6 + py * side * 1.2) * sp; p.vx = p.evadeVx; p.vy = p.evadeVy;
      this.ev('juke', { id: p.id, x: p.x, y: p.y }); p.pose = 'juke'; p.poseT = .35;
    }
    if (c.b && p.armCd <= 0) {   // stiff-arm: shove whoever is close
      p.armT = .35; p.armCd = 1; p.pose = 'arm'; p.poseT = .4; this.ev('arm', { id: p.id });
      for (const q of this.P) if (q.side !== s && q.state !== 'down' && dst(p, q) < 17) { q.state = 'stun'; q.st = .9; q.vx += (q.x - p.x) * 4; q.vy += (q.y - p.y) * 4; q.engaged = null; this.gainMeter(s, 12); this.ev('shove', { id: q.id }); }
    }
    if (c.x && L.mode !== 'handoff') this.lateral(p, null);
    if (c.x && L.mode === 'handoff' && !L.handed && p === L.qb) this.handoff();
    // QB throw
    if (L.mode === 'pocket' && p === L.qb && this.ball.state === 'held') {
      const recs = this.receivers();
      const idx = c.a ? 0 : c.b ? 1 : c.x ? 2 : c.y ? 3 : -1;
      // y is the card button on a carrier, so only the first three receivers (+ the back, through the swap button)
      if (idx >= 0 && idx < 3 && recs[idx]) this.throwTo(p, recs[idx], true);
      if (c.swap && recs[3]) this.throwTo(p, recs[3], true);
    }
    if (c.a && L.mode === 'pocket' && p === L.qb) p.evade = 0;
    if (p.evade <= 0) p.evadeVx = undefined;
  }
  receivers() { const o = this.off(), g = r => o.find(p => p.role === r); return [g('WR1'), g('WR2'), g('TE'), g('RB')].filter(Boolean); }

  /* ---------- offense AI ---------- */
  aiOffense(dt, ctl) {
    const L = this.live, b = this.ball, off = L.poss, d = dirOf(off), skill = T.aiSkill;
    for (const p of this.P) {
      if (p.human || p.state === 'down' || p.state === 'stun' || p.state === 'dive') continue;
      const hasBall = b.carrier && b.carrier.side === p.side, airMine = b.state === 'air' && b.side === p.side;
      if (!hasBall && !airMine) continue;
      if (p === b.carrier) { if (p === L.qb && !L.free && !L.scramble && (L.mode === 'pocket' || L.mode === 'handoff')) this.aiQB(p, dt, skill); else this.aiCarrier(p, dt, skill); continue; }
      if (b.state === 'air' && b.target === p) { this.goTo(p, b.ex, b.ey, dt, 1, true); continue; }
      if (L.free || (b.state === 'held' && L.poss !== p.side)) { this.aiEscort(p, dt); continue; }
      if (p.side !== off) continue;
      // scripted offense
      if (p.role === 'OL1' || p.role === 'OL2' || (p.role === 'TE' && (L.play.kind === 'run' || !p.route))) continue;   // blockers: see blocking()
      if (p.role === 'QB') this.aiQB(p, dt, skill);
      else if (p.role === 'RB' && L.play.kind === 'run' && !L.handed) this.goTo(p, p.route[0].x, p.route[0].y, dt, .8);
      else if (p.route && p.ri < p.route.length) {
        const w = p.route[p.ri]; this.goTo(p, w.x, w.y, dt, .95, true, 3); if (dst(p, w) < 4) p.ri++;
      } else if (p.route) { this.steer(p, 0, 0, dt); const qb = L.qb; p.face = Math.atan2(qb.y - p.y, qb.x - p.x); }
      else if (p.role !== 'QB' && p.role !== 'OL1' && p.role !== 'OL2') this.steer(p, 0, 0, dt);
    }
  }
  aiQB(qb, dt, skill) {
    const L = this.live, b = this.ball, d = dirOf(L.poss), play = L.play;
    if (b.carrier !== qb) {
      if (L.play.kind === 'run') this.goTo(qb, this.los - d * 5 * Y, this.by, dt, .5);
      else this.steer(qb, 0, 0, dt);
      return;
    }
    if (L.play.kind === 'run') {   // run play: the QB turns and hands off
      if (!L.handed) {
        this.steer(qb, 0, 0, dt);
        if (L.t >= play.handoff) { if (play.toss) this.pitch(qb, L.rb); else this.handoff(); }
      }
      return;
    }
    // pass / trick: drop back, wait, throw
    if (play.kind === 'trick' && !L.handed) { this.steer(qb, 0, 0, dt); if (L.t >= play.handoff) this.handoff(); return; }
    const dropX = this.los - d * play.drop * Y, dropY = this.by;
    if ((this.los - qb.x) * d < play.drop * Y - 3) this.goTo(qb, dropX, dropY, dt, .9); else this.steer(qb, 0, 0, dt);
    const tAI = L.decideT + (L.back ? 0 : 0);
    // pressure: a defender within reach
    let near = 1e9; for (const q of this.def()) if (q.state !== 'down' && !q.engaged) near = Math.min(near, dst(qb, q));
    if (near < 17 && L.t > .9) L.pressured = true;
    if ((L.t > tAI && (!play.back || L.backed)) || (L.pressured && L.t > 1.1 && this.rnd() < dt * 3)) {
      if (L.pressured && this.rnd() < .3 * (1 - skill) + .12 && L.t > 1.5) { L.scramble = true; this.aiCarrier(qb, dt, skill); }   // scramble
      const target = this.bestReceiver(qb);
      if (target) this.throwTo(qb, target, false);
    } else if (L.scramble) this.aiCarrier(qb, dt, skill);
  }
  bestReceiver(qb) {
    let best = null, bs = -1e9; const dd = dirOf(qb.side), defs = this.def();
    for (const r of this.receivers()) {
      if (r === qb || r.state === 'down') continue;
      let sep = 60; for (const q of defs) sep = Math.min(sep, dst(q, r));
      const down = (r.x - this.los) * dd / Y;
      const sc = sep * 1.3 + Math.min(down, 25) * .8 - Math.abs(r.y - qb.y) * .02 + this.rnd() * 14 * (1.1 - T.aiSkill);
      if (sc > bs) { bs = sc; best = r; }
    }
    return best;
  }
  aiCarrier(p, dt, skill) {
    const L = this.live, d = dirOf(p.side), defs = this.P.filter(q => q.side !== p.side && q.state !== 'down');
    const sp = this.speedOf(p, true) * (.82 + .18 * skill);
    if (p.role === 'RB' && L.play.kind === 'run' && p.route && p.ri < p.route.length && L.t < 2.2 && p.side === L.poss && !L.free) {
      const w = p.route[p.ri]; this.goTo(p, w.x, w.y, dt, 1, true, 2); if (dst(p, w) < 5) p.ri++;
      if ((p.x - this.los) * d > 20) L.free = true;
      this.aiMoves(p, defs); return;
    }
    if ((p.x - this.los) * d > 14 || L.mode === 'free') L.free = true;
    let best = 0, bc = 1e9;
    for (let a = -1.25; a <= 1.26; a += .25) {
      const ang = (d > 0 ? 0 : Math.PI) + a * d, hx = Math.cos(ang), hy = Math.sin(ang);
      let cost = 0;
      for (const look of [26, 56]) {
        const qx = p.x + hx * look, qy = p.y + hy * look;
        for (const q of defs) { const dd = Math.hypot(qx - (q.x + q.vx * .3), qy - (q.y + q.vy * .3)); if (dd < 44) cost += (44 - dd) * (look < 40 ? 1.1 : .7); }
        if (qy < YMIN + 8) cost += (YMIN + 8 - qy) * 2.5; if (qy > YMAX - 8) cost += (qy - (YMAX - 8)) * 2.5;
      }
      cost -= hx * d * 38 * (1.2 - skill * .3);
      cost += Math.abs(a) * 3;
      if (cost < bc) { bc = cost; best = ang; }
    }
    this.steer(p, Math.cos(best) * sp, Math.sin(best) * sp, dt);
    this.aiMoves(p, defs);
  }
  aiMoves(p, defs) {
    if (p.evade > 0) return;
    let nd = 1e9, nq = null; for (const q of defs) { const dd = dst(p, q); if (dd < nd) { nd = dd; nq = q; } }
    if (!nq) return;
    if (nd < 20 && p.jukeCd <= 0 && this.rnd() < .06 + T.aiSkill * .06) {
      const dx = nq.x - p.x, dy = nq.y - p.y, px = -dy, py = dx, l = Math.hypot(px, py) || 1, sp = this.speedOf(p, true), side = this.rnd() < .5 ? 1 : -1;
      p.evade = .3; p.jukeCd = 1.2; p.evadeVx = px / l * side * sp * 1.1; p.evadeVy = py / l * side * sp * 1.1; p.vx = p.evadeVx; p.vy = p.evadeVy;
      p.pose = 'juke'; p.poseT = .35; this.ev('juke', { id: p.id, x: p.x, y: p.y });
    } else if (nd < 13 && p.armCd <= 0 && this.rnd() < .08) {
      p.armT = .35; p.armCd = 1.4; p.pose = 'arm'; p.poseT = .4; this.ev('arm', { id: p.id });
      for (const q of defs) if (dst(p, q) < 17) { q.state = 'stun'; q.st = .9; q.engaged = null; this.ev('shove', { id: q.id }); }
    }
    if (p.evade <= 0) p.evadeVx = undefined; else if (p.evadeVx !== undefined) { p.vx = p.evadeVx; p.vy = p.evadeVy; }
  }
  aiEscort(p, dt) {
    // a teammate has the ball: block the nearest opponent ahead of the carrier
    const c = this.ball.carrier; if (!c) { this.aiLoose(p, dt); return; }
    if (c.side !== p.side) return;
    const d = dirOf(p.side); let best = null, bd = 1e9;
    for (const q of this.P) if (q.side !== p.side && q.state !== 'down') { const aheadOf = (q.x - c.x) * d > -12; const dd = dst(q, c) + (aheadOf ? 0 : 60); if (dd < bd && !q.engaged) { bd = dd; best = q; } }
    if (!best || p.engaged) { if (!p.engaged) this.goTo(p, c.x + d * 40, c.y + (p.k % 2 ? 24 : -24), dt, .95, true); return; }
    const tx = best.x + (c.x - best.x) * .15, ty = best.y + (c.y - best.y) * .15;
    this.goTo(p, tx, ty, dt, 1, true, 1);
  }
  aiLoose(p, dt) { const b = this.ball; this.goTo(p, b.x, b.y, dt, 1, true, 1); }

  /* ---------- defense AI ---------- */
  aiDefense(dt) {
    const L = this.live, b = this.ball, offS = L.poss;
    for (const p of this.P) {
      if (p.human || p.state === 'down' || p.state === 'stun' || p.state === 'dive') continue;
      const holder = b.carrier;
      const isDef = holder ? p.side !== holder.side : (b.state === 'air' ? p.side !== b.side : true);
      if (!isDef) continue;
      if (b.state === 'loose') { this.goTo(p, b.x, b.y, dt, 1, true, 1); continue; }
      if (b.state === 'air') {
        if (b.lateral) { this.goTo(p, b.ex, b.ey, dt, 1, true, 1); continue; }
        // go to the landing spot if within range, rest cover
        const dd = Math.hypot(b.ex - p.x, b.ey - p.y);
        const covering = p.ass && p.ass.kind === 'man' && p.ass.t === b.target;
        if (dd < 90 || covering) { this.goTo(p, b.ex, b.ey, dt, 1, true, 1); continue; }
      }
      const carrier = holder;
      if (carrier && (L.free || carrier !== L.qb || L.scramble || L.play.kind === 'run' && L.handed)) { this.pursue(p, carrier, dt); continue; }
      const a = p.ass; if (!a) { this.pursue(p, carrier || b, dt); continue; }
      const dd = dirOf(L.poss), qb = L.qb;
      if (a.kind === 'rush') {
        if (p.engaged) { this.pushEngaged(p, dt); continue; }
        const tgt = carrier || qb; this.goTo(p, tgt.x, tgt.y, dt, .98 + T.aiSkill * .06, true, 1);
      } else if (a.kind === 'spy') {
        const tx = qb.x + dd * 70, ty = qb.y; this.goTo(p, tx, ty, dt, .95); if (L.t > 2.4 || (carrier && carrier !== qb)) this.pursue(p, carrier || qb, dt);
      } else if (a.kind === 'man' && a.t) {
        const tgt = a.t; this.goTo(p, tgt.x + dd * 14 + tgt.vx * .15, tgt.y + tgt.vy * .15, dt, .93 + T.aiSkill * .09, true, 1);
      } else {
        const tx = this.los + dd * a.sx * Y, ty = this.by + dd * a.sy * Y;
        // shade toward the nearest receiver in the zone
        let tgt = null, td = 70; for (const r of this.receivers()) { const q = Math.hypot(r.x - tx, r.y - ty); if (q < td && (r.x - this.los) * dd > 15) { td = q; tgt = r; } }
        if (tgt && L.t > 1.2) this.goTo(p, (tx + tgt.x) / 2 + dd * 6, (ty + tgt.y) / 2, dt, .9, true, 1); else this.goTo(p, tx, ty, dt, .8);
      }
    }
  }
  pursue(p, c, dt) {
    const d = Math.hypot(c.x - p.x, c.y - p.y), lead = clamp(d / (T.turboSpeed), 0, .8);
    this.goTo(p, c.x + (c.vx || 0) * lead, c.y + (c.vy || 0) * lead, dt, .95 + T.aiSkill * .08, true, 1);
  }
  pushEngaged(p, dt) { const q = p.engaged; if (!q) return; this.steer(p, (q.vx || 0) * .2, (q.vy || 0) * .2, dt); }

  /* ---------- blocking ---------- */
  blocking(dt, ctl) {
    const L = this.live, off = L.poss, d = dirOf(off), qb = L.qb;
    const defs = this.def().filter(q => q.state !== 'down');
    const prot = this.ball.carrier && this.ball.carrier.side === off ? this.ball.carrier : qb;
    for (const p of this.off()) {
      const blocker = p.role === 'OL1' || p.role === 'OL2' || (p.role === 'TE' && (L.play.kind === 'run' || !p.route)) || (L.play.id === 'screen' && p.role === 'TE');
      if (!blocker) continue;
      if (p.state === 'down' || p.state === 'stun') { if (p.engaged) { p.engaged.engaged = null; p.engaged = null; } continue; }
      if (p.human) continue;
      if (p.engaged) {
        const q = p.engaged; if (q.state === 'down') { p.engaged = null; continue; }
        p.blockT -= dt; q.blockT = p.blockT;
        this.steer(p, 0, 0, dt); this.steer(q, d * 6 * (1 - 1 / (p.str + .01)) + (prot.x - q.x) * .02, (prot.y - q.y) * .02, dt);
        if (p.blockT <= 0) { q.engaged = null; p.engaged = null; q.slow = .5; p.cool = .6; this.ev('shed', { id: q.id }); }
        continue;
      }
      // pick the closest unengaged defender that is near the protected player
      let best = null, bd = 1e9;
      for (const q of defs) { if (q.engaged) continue; const dd = dst(q, prot) * .5 + dst(q, p) * .5; if (dd < bd) { bd = dd; best = q; } }
      if (!best) continue;
      const tx = best.x + (prot.x - best.x) * .22, ty = best.y + (prot.y - best.y) * .22;
      this.goTo(p, tx, ty, dt, 1, true, 1);
      if (dst(p, best) < 9 && p.cool <= 0 && !best.engaged && !best.human) this.engage(p, best);
    }
    // defenders that are controlled by the human can still be blocked if a blocker bumps them
    for (const q of defs) if (q.human && !q.engaged) for (const p of this.off()) if ((p.role === 'OL1' || p.role === 'OL2' || p.role === 'TE') && !p.engaged && !p.human && p.cool <= 0 && dst(p, q) < 8) { this.engage(p, q); break; }
  }
  engage(p, q) {
    p.engaged = q; q.engaged = p; const b = T.blockHold * (p.str / Math.max(.6, q.str)) * (.8 + this.rnd() * .4) * (q.human ? .8 : 1);
    if (this.bossKind === 'tank' && q.side === 1) q.blockT = p.blockT = b * .6; else q.blockT = p.blockT = b;
    this.ev('block', { x: p.x, y: p.y });
  }

  /* ---------- the ball ---------- */
  handoff() {
    const L = this.live, qb = L.qb, rb = L.rb; if (L.handed) return;
    L.handed = true; qb.ball = false; rb.ball = true; this.ball.carrier = rb; L.mode = L.play.kind === 'trick' ? 'trickrb' : 'run'; this.ev('handoff', { id: rb.id });
    rb.ri = 0;
  }
  pitch(from, to) {
    const L = this.live; L.handed = true; L.sweepPitch = true;
    this.lateral(from, to);
  }
  lateral(from, toP) {
    const L = this.live, b = this.ball; if (b.state !== 'held' || b.carrier !== from) return;
    let tgt = toP, bd = 1e9;
    if (!tgt) for (const q of this.P) if (q.side === from.side && q !== from && q.state !== 'down' && q.state !== 'stun') { const d = dst(from, q); if (d < bd && d < 110) { bd = d; tgt = q; } }
    if (!tgt) return;
    L.lat++; this.launch(from, tgt, 150, true);
    this.ev('lateral', { id: from.id });
  }
  throwTo(qb, rec, human) {
    const L = this.live; if (this.ball.state !== 'held' || this.ball.carrier !== qb) return;
    L.thrown = true; L.mode = 'air'; L.thrower = qb; L.passes++;
    this.stats[qb.side].passes++;
    this.launch(qb, rec, T.passSpeed, false, human);
    this.ev('throw', { id: qb.id, to: rec.id, x: qb.x, y: qb.y });
  }
  launch(from, rec, speed, lateral, human) {
    const b = this.ball; let ex = rec.x, ey = rec.y, tt = 0;
    for (let i = 0; i < 3; i++) { tt = Math.hypot(ex - from.x, ey - from.y) / speed; ex = rec.x + (rec.vx || 0) * tt; ey = rec.y + (rec.vy || 0) * tt; }
    if (!human && !lateral) { const err = (1.2 - T.aiSkill) * 26; ex += (this.rnd() - .5) * 2 * err; ey += (this.rnd() - .5) * 2 * err; }
    ey = clamp(ey, YMIN - 10, YMAX + 10);
    b.state = 'air'; b.sx = from.x; b.sy = from.y; b.sz = 16; b.ex = ex; b.ey = ey; b.ez = 12; b.T = Math.max(.12, Math.hypot(ex - from.x, ey - from.y) / speed); b.u = 0;
    b.apex = lateral ? 6 : clamp(Math.hypot(ex - from.x, ey - from.y) * .13, 6, 30); b.target = rec; b.thrower = from; b.side = from.side; b.lateral = lateral; b.carrier = null; from.ball = false;
    b.x = from.x; b.y = from.y; b.z = 16; b.rot = Math.atan2(ey - from.y, ex - from.x); b.age = 0;
  }
  updBall(dt, ctl) {
    const b = this.ball, L = this.live;
    if (b.state === 'held' && b.carrier) { const c = b.carrier; b.x = c.x + Math.cos(c.face) * 4; b.y = c.y + Math.sin(c.face) * 4; b.z = c.state === 'down' ? 2 : 12 + c.z; b.rot = c.face; return; }
    if (b.state === 'air') {
      b.u += dt / b.T; b.age += dt; const u = Math.min(1, b.u);
      b.x = lerp(b.sx, b.ex, u); b.y = lerp(b.sy, b.ey, u); b.z = lerp(b.sz, b.ez, u) + 4 * b.apex * u * (1 - u);
      if (b.u > .5) this.catchCheck(dt);
      if (b.state === 'air' && b.u >= 1) {
        // nobody got it
        b.state = 'loose'; b.vx = b.vy = 0; b.vz = 0; b.z = 0; b.age = 0;
        if (b.lateral) { this.ev('fumble', { x: b.x, y: b.y, lat: true }); L.fumbleBy = b.thrower.side; }
        else { this.ev('incomplete', { x: b.x, y: b.y }); this.endPlay('incomplete', this.los); }
      }
      return;
    }
    if (b.state === 'loose') {
      b.age += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vz -= 520 * dt; b.z += b.vz * dt;
      if (b.z <= 0) { b.z = 0; if (Math.abs(b.vz) > 40) { b.vz = -b.vz * .45; this.ev('bounce', { x: b.x, y: b.y }); } else b.vz = 0; b.vx *= Math.max(0, 1 - dt * 2.2); b.vy *= Math.max(0, 1 - dt * 2.2); }
      b.rot += dt * 9;
      if (b.age > .3) {
        let best = null, bd = 12; for (const p of this.P) if (p.state !== 'down' && p.state !== 'stun') { const d = dst(p, b); if (d < bd && b.z < 18) { bd = d; best = p; } }
        if (best) this.pickUp(best);
      }
      if (b.y < YMIN - 12 || b.y > YMAX + 12) this.endPlay('out', clamp(b.x, GL0, GL1));
      return;
    }
  }
  pickUp(p) {
    const b = this.ball, L = this.live; b.state = 'held'; b.carrier = p; p.ball = true; b.side = p.side; b.target = null; L.free = true; L.mode = 'free';
    if (p.side !== L.poss) { L.turnover = true; L.poss = p.side; this.ev('turnover', { id: p.id, x: p.x, y: p.y }); this.stats[p.side].ints += L.thrown && !L.fumbleBy ? 0 : 0; }
    else this.ev('recover', { id: p.id });
    this.ctlLock = [null, null]; p.state = 'run';
  }
  catchCheck(dt) {
    const b = this.ball, L = this.live; let best = null, bd = 1e9;
    for (const p of this.P) {
      if (p.state === 'down' || p.state === 'stun' || p === b.thrower && b.age < .35) continue;
      if (b.lateral && p.side === b.side && p !== b.target) continue;
      const reach = 11 + (p.z > 4 ? 7 : 0) + (p.human ? 2 : 0), d = dst(p, b), dz = Math.abs(b.z - (p.z + 14));
      if (d < reach && dz < 20 + (p.z > 4 ? 10 : 0) && d < bd) { bd = d; best = p; }
    }
    if (!best) return;
    if (best.side === b.side) {
      let near = 0; for (const q of this.P) if (q.side !== b.side && q.state !== 'down' && dst(q, b) < 16) near++;
      const pc = b.lateral ? 1 : clamp(T.catchChance * best.hnd - near * .16 + (best.human ? .08 : 0), .1, .98);
      if (this.rnd() < pc) { this.completeCatch(best); }
      else { this.ev('drop', { id: best.id, x: best.x, y: best.y }); b.state = 'loose'; b.vx = b.vy = 0; b.vz = 40; b.age = 0; b.target = null; this.endPlay('incomplete', this.los); }
    } else {
      const pi = clamp(T.intChance * best.hnd + (best.human ? (best.z > 4 ? .3 : .14) : 0) + (this.fire[best.side] > 0 ? .1 : 0), .02, .95);
      if (this.rnd() < pi) { b.state = 'held'; b.carrier = best; best.ball = true; b.side = best.side; L.turnover = true; L.poss = best.side; L.free = true; L.mode = 'free'; L.intBy = best.id; this.stats[best.side].ints++; this.ev('int', { id: best.id, x: best.x, y: best.y }); this.gainMeter(best.side, 30); this.ctlLock = [null, null]; best.state = 'run'; }
      else { this.ev('batted', { id: best.id, x: best.x, y: best.y }); b.state = 'loose'; b.vx = (this.rnd() - .5) * 40; b.vy = (this.rnd() - .5) * 40; b.vz = 60; b.age = .0; b.target = null; this.endPlay('incomplete', this.los); this.gainMeter(best.side, 10); }
    }
  }
  completeCatch(p) {
    const b = this.ball, L = this.live; b.state = 'held'; b.carrier = p; p.ball = true; b.target = null; L.caught = true; L.free = (p.x - this.los) * dirOf(p.side) > 8 || L.lateral; L.mode = 'free'; L.free = true;
    if (!b.lateral) { this.stats[p.side].comps++; this.gainMeter(p.side, 10); this.ev('catch', { id: p.id, x: p.x, y: p.y }); } else this.ev('lat-catch', { id: p.id });
    this.ctlLock = [null, null]; if (p.state !== 'run') p.state = 'run';
  }

  /* ---------- contact ---------- */
  contacts(dt) {
    const b = this.ball, L = this.live, c = b.carrier; if (b.state !== 'held' || !c || c.state === 'down') return;
    const reachBase = T.tackleReach;
    for (const dfn of this.P) {
      if (dfn.side === c.side || dfn.state === 'down' || dfn.state === 'stun' || dfn.cool > 0) continue;
      if (dfn.engaged && !dfn.human) continue;
      const reach = reachBase + (dfn.state === 'dive' ? 6 : 0) + (this.fire[dfn.side] > 0 ? 2 : 0);
      const d = dst(dfn, c); if (d > reach) continue;
      dfn.cool = .4;
      if (c.evade > 0) { dfn.state = 'stun'; dfn.st = .55; this.ev('miss', { id: dfn.id, x: dfn.x, y: dfn.y }); this.gainMeter(c.side, 14); continue; }
      let p = T.tackleChance * dfn.tk;
      if (dfn.state === 'dive') p += .2; if (c.armT > 0) p -= .38; if (c === L.qb && L.mode === 'pocket') p += .15; if (c.human) p -= .06;
      if (this.bossKind === 'tank' && dfn.side === 1) p += .1; if (this.fire[c.side] > 0) p -= .12; if (this.fx.rocket[c.side] > 0) p -= .15;
      if (this.rnd() < p) { this.tackle(dfn, c); return; }
      dfn.state = 'stun'; dfn.st = .65; this.ev('broke', { id: c.id, x: c.x, y: c.y }); this.gainMeter(c.side, 12);
    }
  }
  tackle(d, c) {
    const L = this.live, rel = Math.hypot(d.vx - c.vx, d.vy - c.vy), dsp = Math.hypot(d.vx, d.vy), big = (dsp > T.hitSpeed && rel > T.hitSpeed * 1.7) || (d.state === 'dive' && dsp > T.runSpeed * .9 && rel > T.hitSpeed * 1.3);
    const mega = big && (this.fire[d.side] > 0 || this.fx.rocket[d.side] > 0) && rel > T.hitSpeed * 2.1;
    c.state = 'down'; c.st = 1.4; c.vx = d.vx * .5; c.vy = d.vy * .5; c.ball = this.ball.carrier === c; d.state = d.state === 'dive' ? 'down' : 'run'; if (d.state === 'down') d.st = .5;
    if (this.mode === 'attract' || !this.humans[0] && !this.humans[1]) { /* cheat no-op */ }
    this.stats[d.side].hits += big ? 1 : 0;
    if (big) { L.big = true; L.hits++; if (mega) L.mega = true; this.gainMeter(d.side, 24); this.ev(mega ? 'mega' : 'bighit', { id: d.id, vic: c.id, x: c.x, y: c.y, dx: d.vx, dy: d.vy });
      if (this.bossKind === 'frost' && d.side === 1) { const s = c.side; this.turbo[s] = 0; for (const q of this.P) if (q.side === s) q.frozen = 3; this.ev('freeze', { side: s }); }
      if (this.rnd() < T.fumbleChance * (this.bossKind === 'tank' && d.side === 1 ? 1.4 : 1) * (mega ? 1.3 : 1)) { this.fumble(c, d); return; }
    } else this.ev('tackle', { id: d.id, vic: c.id, x: c.x, y: c.y });
    if (c === L.qb && this.ball.carrier === c && c.x * dirOf(c.side) < this.los * dirOf(c.side) + 20) { this.stats[d.side].sacks++; this.ev('sack', { x: c.x, y: c.y, id: c.id }); this.gainMeter(d.side, 18); }
    const x = c.x;
    // safety: tackled in own end zone
    const own = c.side === 0 ? x < GL0 : x > GL1;
    this.endPlay(own ? 'safety' : 'tackle', x);
  }
  fumble(c, d) {
    const b = this.ball, L = this.live; b.state = 'loose'; b.carrier = null; c.ball = false; b.x = c.x; b.y = c.y; b.z = 14; b.vx = d.vx * .7 + (this.rnd() - .5) * 60; b.vy = d.vy * .7 + (this.rnd() - .5) * 60; b.vz = 120 + this.rnd() * 60; b.age = 0; b.target = null;
    L.fumbleBy = c.side; this.stats[c.side].fumbles++; this.ev('fumble', { id: c.id, x: c.x, y: c.y });
  }
  gainMeter(s, v) {
    if (this.card[s]) return; this.meter[s] = Math.min(100, this.meter[s] + v * T.meterGain * (this.cheat ? 2.5 : 1));
    if (this.meter[s] >= 100) { this.card[s] = FF.CARD_LIST[Math.floor(this.rnd() * FF.CARD_LIST.length)]; this.ev('card-ready', { side: s, card: this.card[s] }); }
  }
  useCard(s) {
    const L = this.live; if (!this.card[s] || this.phase !== 'live' || !L || L.over) return false;
    const c = this.card[s]; this.card[s] = null; this.meter[s] = 0; this.ev('card', { side: s, card: c });
    const cr = this.ball.carrier;
    if (c === 'rocket') this.fx.rocket[s] = 4;
    else if (c === 'warp') this.fx.warp[s] = 4;
    else if (c === 'bolt') {
      const ref = cr || this.ball, list = this.P.filter(p => p.side !== s && p.state !== 'down').sort((a, b) => dst(a, ref) - dst(b, ref)).slice(0, 2);
      for (const p of list) { p.state = 'down'; p.st = 2.2; p.engaged = null; p.vx = p.vy = 0; this.bolts.push({ x: p.x, y: p.y, t: .6 }); }
      this.ev('bolt', { pts: list.map(p => [p.x, p.y]) });
    } else if (c === 'mascot') {
      const d = dirOf(s), from = cr || this.P.find(p => p.side === s);
      this.mascot = { side: s, x: from.x - d * 10, y: from.y, vx: 0, vy: 0, t: 5, kind: cr && cr.side === s ? 'lead' : 'chase' };
      this.ev('mascot', { side: s });
    }
    return true;
  }
  updMascot(dt) {
    const m = this.mascot; if (!m) return; m.t -= dt; if (m.t <= 0) { this.mascot = null; return; }
    const d = dirOf(m.side), cr = this.ball.carrier;
    if (m.kind === 'lead' && cr && cr.side === m.side) { const tx = cr.x + d * 28, ty = cr.y; const dx = tx - m.x, dy = ty - m.y, l = Math.hypot(dx, dy) || 1; m.vx = dx / l * 85; m.vy = dy / l * 85; }
    else { const tgt = cr && cr.side !== m.side ? cr : null; if (tgt) { const dx = tgt.x - m.x, dy = tgt.y - m.y, l = Math.hypot(dx, dy) || 1; m.vx = dx / l * 90; m.vy = dy / l * 90; } else { m.vx = d * 85; m.vy = 0; } }
    m.x += m.vx * dt; m.y += m.vy * dt;
    for (const p of this.P) if (p.side !== m.side && p.state !== 'down' && dst(p, m) < 15) {
      if (p === this.ball.carrier) { this.tackle(m.d0 || { vx: m.vx, vy: m.vy, side: m.side, state: 'run', id: -1 }, p); this.mascot = null; return; }
      p.state = 'down'; p.st = 1.8; p.engaged = null; p.vx = m.vx * .8; p.vy = m.vy * .8; this.ev('mascot-hit', { x: p.x, y: p.y });
    }
  }

  /* ---------- the end of a play ---------- */
  checkEnd(dt) {
    const L = this.live, b = this.ball, c = b.carrier;
    if (c && b.state === 'held') {
      if (c.side === 0 ? c.x >= GL1 : c.x <= GL0) {
        if (!(c.side === L.start && false)) { this.touchdown(c); return; }
      }
      if (c.y < YMIN || c.y > YMAX) { this.ev('out', { x: c.x, y: c.y }); this.endPlay('out', clamp(c.x, GL0 - 0, GL1)); return; }
      // the tackled, ball down
      if (c.state === 'down' && !L.over) { this.endPlay('tackle', c.x); return; }
      // a carrier running backwards into own end zone with nobody near is fine: the safety needs a tackle
    }
    // QB held too long: sack timer (human QBs hold forever otherwise)
    if (L.mode === 'pocket' && L.t > 10 && c === L.qb) { c.state = 'down'; c.st = 1; this.ev('sack', { x: c.x, y: c.y, id: c.id }); this.endPlay('tackle', c.x); }
    if (L.t > 28 && !L.over) this.endPlay('tackle', c ? c.x : this.los);
  }
  touchdown(c) {
    const L = this.live; if (L.over) return;
    L.over = true; L.tdBy = c.side; this.score[c.side] += 6; this.stats[c.side].tds++;
    const yds = Math.round((c.side === 0 ? c.x - L.start : L.start - c.x) / Y); this.longest = Math.max(this.longest, Math.abs(Math.round(Math.abs(c.x - L.start) / Y)));
    this.ev('td', { id: c.id, side: c.side, x: c.x, y: c.y, yards: yds });
    this.gainMeter(c.side, 30);
    this.res = { kind: 'td', side: c.side, spot: c.x }; this.phase = 'score'; this.pt = 0; this.afterGood(c.side, true);
    this.replayCand = true;
  }
  endPlay(kind, spot) {
    const L = this.live; if (L.over) return; L.over = true;
    this.res = { kind, spot: clamp(spot, GL0 - 40, GL1 + 40) };
    this.phase = 'dead'; this.pt = 0;
    for (const p of this.P) { p.engaged = null; }
    this.ev('whistle', { kind, x: spot });
    this.replayCand = L.big || kind === 'safety' || !!L.turnover;
  }
  updDead(dt) {
    this.pt += dt;
    // players keep drifting then stop; replay trigger handled by the presentation
    for (const p of this.P) { p.vx *= Math.max(0, 1 - dt * 6); p.vy *= Math.max(0, 1 - dt * 6); p.x += p.vx * dt; p.y += p.vy * dt; p.st -= dt; if (p.state === 'down' && p.st <= 0 && this.pt > .9) p.state = 'run'; }
    if (this.ball.state === 'loose') { this.ball.x += this.ball.vx * dt * .5; this.ball.y += this.ball.vy * dt * .5; this.ball.vx *= .96; this.ball.vy *= .96; this.ball.z = Math.max(0, this.ball.z + this.ball.vz * dt); this.ball.vz -= 520 * dt; if (this.ball.z <= 0) { this.ball.z = 0; this.ball.vz = 0; } }
    if (this.pt > (this.res.kind === 'incomplete' ? 1.1 : 1.7) && !this.replay) this.afterPlay();
  }
  updScore(dt) {
    this.pt += dt;
    for (const p of this.P) { p.vx *= Math.max(0, 1 - dt * 5); p.vy *= Math.max(0, 1 - dt * 5); p.x += p.vx * dt; p.y += p.vy * dt; }
    if (this.pt > 3.8 && !this.replay) {
      const s = this.res.side;
      if (this.ot) { this.finish(); return; }
      this.los = this.res.side === 0 ? GL1 - 20 : GL0 + 20; // PAT spot (2 yd line, kicked from 12)
      this.poss = s; this.startKick('pat');
    }
  }
  afterGood() { /* hook for streak accounting on a score */ this.endStreak(this.res.side, true); }
  endStreak(side, good) {
    const s = side, o = 1 - side;
    if (good) { this.streak[s]++; this.streak[o] = 0; if (this.streak[s] >= T.streakNeed && this.fire[s] <= 0) { this.fire[s] = 3; this.streak[s] = 0; this.ev('streak', { side: s }); } }
  }
  afterPlay() {
    const L = this.live, r = this.res, off = L.poss, start = L.start, d0 = dirOf(this.poss), old = this.poss;
    let spot = r.spot;
    if (r.kind === 'safety') {
      const scorer = 1 - off; this.score[scorer] += 2; this.ev('safety', { side: scorer }); this.poss = scorer; this.los = scorer === 0 ? GL0 + 35 * Y : GL1 - 35 * Y; this.newDown(); this.endStreak(scorer, true);
      this.after(); return;
    }
    const gain = Math.round((spot - start) * d0 / Y);
    if (L.turnover || off !== old) {
      this.poss = off; this.los = clamp(spot, GL0 + 8, GL1 - 8); this.newDown(); this.ev('possession', { side: off }); this.endStreak(off, true);
      this.after(); return;
    }
    // ordinary play
    this.lastGain = gain; this.stats[old].yards += gain; if (r.kind !== 'incomplete') this.los = clamp(spot, GL0 + 1, GL1 - 1);
    const good = gain >= 5 || (this.down > 0 && (this.los - this.fd) * d0 >= 0);
    this.endStreak(good ? old : 1 - old, true);
    if ((this.los - this.fd) * d0 >= 0) { this.down = 1; this.fd = this.fdLine(); this.stats[old].first++; this.ev('first', { x: this.los }); }
    else { this.down++; if (this.down > 4) { this.ev('downs', {}); this.poss = 1 - old; this.newDown(); } }
    this.after();
  }
  newDown() { this.down = 1; this.by = clamp(this.by, CY - 50, CY + 50); this.fd = this.fdLine(); }
  after() {
    this.by = clamp(this.live ? (this.ball.carrier ? this.ball.carrier.y : this.by) : this.by, CY - 55, CY + 55);
    this.fd = this.fdLine(); this.live = null;
    this.rec.length = 0;
    this.endOrNext();
  }
  endOrNext() {
    if (this.clock <= 0 && !T.noClock && !this.noClock) { this.endQuarter(); return; }
    this.toCall();
  }
  toCall() { this.phase = 'call'; this.callStage = 0; this.pt = 0; this.callO = null; this.callD = null; this.callTime = 0; this.placeIdle(); this.ev('call', {}); }
  endQuarter() {
    if (this.ot) { this.finish(); return; }
    if (this.q >= this.quarters) {
      if (this.score[0] === this.score[1]) { this.ot = true; this.q++; this.clock = 60; this.poss = this.rnd() < .5 ? 0 : 1; this.los = this.poss === 0 ? GL0 + 25 * Y : GL1 - 25 * Y; this.newDown(); this.ev('ot', {}); this.toCall(); return; }
      this.finish(); return;
    }
    this.phase = this.q === Math.floor(this.quarters / 2) && this.quarters > 2 ? 'half' : 'qend'; this.pt = 0; this.ev(this.phase === 'half' ? 'half' : 'quarter', { q: this.q });
  }
  nextQuarter() {
    this.q++; this.clock = this.qlen;
    if (this.q === Math.floor(this.quarters / 2) + 1 && this.quarters > 2) {   // second half: the team that did not start gets the ball
      this.poss = 1; this.los = GL1 - 25 * Y; this.newDown();
      for (const s of [0, 1]) { if (this.adj[s] === 1) this.turbo[s] = 100; if (this.adj[s] === 2) this.meter[s] = 70; if (this.adj[s] === 3) this.fire[s] = 5; }
    }
    this.toCall();
  }
  adjust(side, which) { this.adj[side] = which + 1; }
  finish() {
    this.phase = 'final'; this.over = true; this.winner = this.score[0] === this.score[1] ? -1 : (this.score[0] > this.score[1] ? 0 : 1); this.pt = 0; this.live = null; this.ev('final', { winner: this.winner });
    for (const p of this.P) { p.state = 'idle'; p.vx = p.vy = 0; }
  }

  /* ---------- kicks ---------- */
  startKick(type) {
    const s = this.poss, d = dirOf(s);
    const dist = type === 'pat' ? Math.abs((s === 0 ? GL1 : GL0) - this.los) / Y + 10 + 7 : type === 'fg' ? Math.abs((s === 0 ? GL1 : GL0) - this.los) / Y + 10 + 7 : 0;
    this.phase = 'kick'; this.pt = 0;
    this.kick = { type, side: s, stage: 0, t: 0, pw: 0, ac: 0, dist, dir: d, made: null, human: this.humans[s] && !T.aiOnly, res: null, flight: 0, ft: 0, outcome: null, aiT: .9 + this.rnd() * .6, aiAim: (this.rnd() - .5) * 2 * (1 - T.aiSkill * .6) };
    // line up a kick formation
    for (const p of this.P) { p.state = 'set'; p.engaged = null; }
    const kx = this.los - d * 12 * Y, ky = CY; this.kick.kx = kx; this.kick.ky = ky;
    this.ball.state = 'spot'; this.ball.x = kx + d * 4; this.ball.y = ky; this.ball.z = 0; this.ball.carrier = null; this.ball.side = s;
    for (const p of this.P) {
      const mine = p.side === s, k = p.k;
      if (mine) { p.tx = k === 0 ? kx : this.los - d * (k <= 3 ? 1.5 : 1.8) * Y; p.ty = k === 0 ? ky : CY + (k - 3.5) * 14; if (k === 0) { p.tx = kx; p.ty = ky; } }
      else { p.tx = this.los + d * 3 * Y; p.ty = CY + (k - 3) * 14; }
      p.face = d > 0 ? 0 : Math.PI;
    }
    this.ev('kick-start', { kind: type });
  }
  updKick(dt, ctl) {
    const k = this.kick; k.t += dt; this.pt += dt;
    for (const p of this.P) {   // walk to the kick formation
      const dx = p.tx - p.x, dy = p.ty - p.y, dd = Math.hypot(dx, dy); if (dd > 1.5) { const v = Math.min(dd / dt, 80); p.vx = dx / dd * v; p.vy = dy / dd * v; p.x += p.vx * dt; p.y += p.vy * dt; p.face = Math.atan2(dy, dx); } else { p.vx = p.vy = 0; p.face = k.dir > 0 ? 0 : Math.PI; }
    }
    const c = ctl[k.side], press = k.human ? (c && c.a) : false;
    if (k.stage === 0 && k.t > 1.0) { k.stage = 1; k.t = 0; }
    else if (k.stage === 1) {
      k.pw = 0.5 + 0.5 * Math.sin(k.t * 4.6 - Math.PI / 2);   // 0..1 oscillation
      if (press && k.t > .15) { k.pwSet = k.pw; k.stage = 2; k.t = 0; this.ev('kick-pw', { v: k.pw }); }
      else if (!k.human && k.t > k.aiT) { k.pw = clamp(0.62 + this.rnd() * .38, 0, 1); k.pwSet = k.pw; k.stage = 2; k.t = 0; }
    } else if (k.stage === 2) {
      k.ac = Math.sin(k.t * 5.2 * (1 + k.dist * .004));
      if (press && k.t > .15) { k.acSet = k.ac; this.resolveKick(); }
      else if (!k.human && k.t > k.aiT * .7) { k.ac = k.aiAim * .6; k.acSet = k.ac; this.resolveKick(); }
    } else if (k.stage === 3) {
      k.ft += dt; const u = Math.min(1, k.ft / k.fT);
      const b = this.ball; b.x = lerp(k.kx + k.dir * 4, k.endX, u); b.y = lerp(k.ky, k.endY, u); b.z = 4 * k.apex * u * (1 - u) + 6; b.rot += dt * 14; b.state = 'kicked';
      if (u >= 1) this.finishKick();
    } else if (k.stage === 4) { if (k.t > 1.6 && !this.replay) this.afterKick(); }
    if (k.stage === 4) k.t += 0;
  }
  resolveKick() {
    const k = this.kick, d = k.dir, b = this.ball; k.stage = 3; k.ft = 0; k.t = 0;
    const pw = k.pwSet, ac = k.acSet;
    this.ev('kick', { kind: k.type });
    if (k.type === 'punt') {
      const yards = 24 + pw * 38 + (1 - Math.abs(ac)) * 4; k.yards = yards; k.fT = 1.9 + yards * .02; k.apex = 70 + yards;
      let ex = this.los + d * yards * Y; ex = clamp(ex, GL0 - 40, GL1 + 40); k.endX = ex; k.endY = CY + ac * 60; k.outcome = 'punt';
    } else {
      const need = clamp((k.dist - 12) / 52, .12, 1), tol = clamp(0.5 - k.dist * .0062, .12, .5);
      const good = pw >= need * 0.93 && Math.abs(ac) < tol;
      const gx = d > 0 ? GL1 + 100 : GL0 - 100;   // the uprights at the back of the end zone
      k.made = good; k.outcome = good ? 'good' : (pw < need * .93 ? 'short' : 'wide'); k.fT = 1.4 + k.dist * .01; k.apex = 55 + k.dist * .6;
      k.endX = gx - d * (pw < need * .93 ? (need * .93 - pw) * 560 : 0); k.endY = CY + (good ? ac / tol * 18 : (ac >= 0 ? 1 : -1) * (Math.abs(ac) < tol ? 40 : 36 + Math.abs(ac) * 40));
      if (pw >= need * .93 && !good) k.endY = CY + (ac >= 0 ? 1 : -1) * 48;
    }
  }
  finishKick() {
    const k = this.kick; k.stage = 4; k.t = 0; const s = k.side, b = this.ball;
    if (k.type === 'punt') { this.ev('punt-land', { x: k.endX }); }
    else if (k.made) {
      this.score[s] += k.type === 'pat' ? 1 : 3; this.ev(k.type === 'pat' ? 'pat-good' : 'fg-good', { side: s }); this.endStreak(s, true); this.gainMeter(s, k.type === 'pat' ? 5 : 22);
      this.replayCand = k.type === 'fg';
    } else { this.ev(k.type === 'pat' ? 'pat-miss' : 'fg-miss', { side: s }); this.endStreak(1 - s, true); }
    b.state = 'dead';
  }
  afterKick() {
    const k = this.kick, s = k.side, d = k.dir; this.kick = null;
    if (k.type === 'punt') {
      let x = k.endX; const rs = 1 - s;
      if (s === 0 ? x >= GL1 : x <= GL0) x = rs === 0 ? GL0 + 20 * Y : GL1 - 20 * Y;   // touchback
      this.poss = rs; this.los = clamp(x, GL0 + 5, GL1 - 5); this.newDown(); this.ev('possession', { side: rs });
    } else if (k.type === 'pat') { this.poss = 1 - s; this.los = this.poss === 0 ? GL0 + 25 * Y : GL1 - 25 * Y; this.newDown(); if (this.ot) { this.finish(); return; } }
    else if (k.made) { if (this.ot) { this.finish(); return; } this.poss = 1 - s; this.los = this.poss === 0 ? GL0 + 25 * Y : GL1 - 25 * Y; this.newDown(); }
    else { this.poss = 1 - s; const spot = this.los; this.los = this.poss === 0 ? clamp(spot, GL0 + 20 * Y, GL1 - Y * 5) : clamp(spot, GL0 + 5 * Y, GL1 - 20 * Y); this.newDown(); }
    this.live = null; this.ball.state = 'spot';
    this.endOrNext();
  }
  /* quick helper for the dev tools */
  devScore(s, v) { this.score[s] = Math.max(0, this.score[s] + v); }
  devCard(s, id) { this.card[s] = id || 'rocket'; this.meter[s] = 100; this.ev('card-ready', { side: s, card: this.card[s] }); }
  devSkipQuarter() { this.clock = 0; if (this.phase === 'call') this.endQuarter(); }
  devTD(s) { if (this.phase === 'live' && this.live && !this.live.over) { const p = this.P.find(q => q.side === s); this.ball.carrier = p; p.ball = true; this.ball.state = 'held'; p.x = s === 0 ? GL1 : GL0; this.touchdown(p); } }
}
FF.Match = Match; FF.yardline = yardline; FF.dirOf = dirOf;
})();
