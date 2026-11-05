/* ---- THE ARCADE LAYER: hype and supers (THUNDER RUN, HURRICANE HIT), ON FIRE, crowd-thrown power-ups, venue hazards
 * (mud, the chicken, flame jets, lightning), wind, the referee flattened; and force(): every dev EVENT, also used by the
 * attract director and the tests ---- */
const GRATES = [];
for (let i = 0; i < 8; i++) { const x = G.X0 + 70 + i * (G.W - 140) / 7; GRATES.push({ x, y: G.Y0 + 32 }, { x, y: G.Y1 - 32 }); }
TT.GRATES = GRATES;
Object.assign(Match.prototype, {
  doSuper(p) {
    if (this.hype[p.team] < 100 && !(TT.cheats.hypeFull && this.isHumanTeam(p.team)) && !this.o.attract) return false;
    if (p.sup) return false;
    const has = this.ball.st === 'held' && this.ball.holder === p.id;
    if (!has) { const c = this.carrier(); if (!c || c.team === p.team) return false; }
    this.hype[p.team] = 0;
    p.sup = { kind: has ? 'thunder' : 'hurricane', t: has ? TUNE.v.superTime * (p.boss ? 1.5 : 1) : 2, retarget: 1 };
    this.emit('superStart', { id: p.id, kind: p.sup.kind, boss: p.boss });
    this.banner(has ? (p.boss ? 'UNIT TRAIN!' : 'THUNDER RUN!') : 'HURRICANE HIT!', { color: '#ffd040', big: true });
    return true;
  },
  endSuper(p) { if (!p.sup) return; const k = p.sup.kind; p.sup = null; this.emit('superEnd', { id: p.id, kind: k }); },
  arcadeStep(dt) {
    const live = this.phase === 'play' || this.phase === 'ruck';
    if (TT.cheats.hypeFull) for (const t of [0, 1]) if (this.isHumanTeam(t)) this.hype[t] = 100;
    if (this.o.attract && this.o.attractHype) this.hype = [100, 100];
    for (const p of this.players) {
      if (p.sup) {
        p.sup.t -= dt;
        if (p.sup.kind === 'hurricane') {
          const c = this.carrier();
          if (!c || c.team === p.team) { if (p.sup.retarget-- <= 0 || !c) this.endSuper(p); }
          else if (FREE[p.st] && this.phase === 'play') { const a = angTo(p, c), sp = this.speedOf(p) * 1.1; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.f = a; if (dist(p, c) < 16 + (c.size - 1) * 8) this.contact(p, c, 'hurricane'); }
        }
        if (p.sup && (p.sup.t <= 0 || (p.sup.kind === 'thunder' && this.ball.holder !== p.id))) this.endSuper(p);
      }
      if (p.fire > 0 && live) { p.fire -= dt; if (p.fire <= 0) { p.fire = 0; this.emit('fireOut', { id: p.id }); } }
      if (p.pu && p.pu.t > 0) { p.pu.t -= dt; if (p.pu.t <= 0) { this.emit('powerupEnd', { id: p.id, kind: p.pu.kind }); p.pu = null; } }
    }
    if (TT.cheats.onFire) { const s = this.seats[0]; const p = s && this.players[s.pid]; if (p && !(p.fire > 0)) { p.fire = 90; this.emit('onFire', { id: p.id }); } }
    if (this.megaBoot) for (const t of [0, 1]) if (this.megaBoot[t] > 0) this.megaBoot[t] -= dt;
    // the wind shifts every 15-25 s
    if (this.windy) { this.wind.t -= dt; if (this.wind.t <= 0) { this.wind.t = 15 + this.rng() * 10; this.wind.s = this.rng(); this.wind.a = this.rng() * TAU; this.emit('windShift', { s: this.wind.s }); } }
    if (!live) { this.hazardStep(dt, false); return; }
    // power-ups: a fan in the stand throws one on every 30 s (+-10) of open play
    if (!this.o.noPowerups && this.phase === 'play') {
      this.puT -= dt;
      if (this.puT <= 0 && !this.powerups.some(q => !q.taken)) { this.puT = TUNE.v.powerupEvery + (this.rng() * 20 - 10); this.throwPowerup(); }
    }
    this.powerupStep(dt);
    this.hazardStep(dt, true);
  },
  throwPowerup(kind, at) {
    kind = kind || TT.POWERUP_ORDER[Math.floor(this.rng() * TT.POWERUP_ORDER.length)];
    const b = this.ball;
    let x, y, n = 0;
    do { x = G.X0 + 80 + this.rng() * (G.W - 160); y = G.Y0 + 50 + this.rng() * (G.H - 100); n++; } while (n < 20 && dist2(x, y, b.x, b.y) < 80);
    if (at) { x = at.x; y = at.y; }
    const fromX = clamp(x + (this.rng() - .5) * 200, G.X0, G.X1), fromY = G.Y0 - 70;
    const q = { kind, x, y, z: 0, fx: fromX, fy: fromY, t: 0, fly: 1.1, on: false, taken: false, life: 15, chaser: -1 };
    this.powerups.push(q);
    this.emit('powerupThrow', { kind, x, y });
    return q;
  },
  powerupStep(dt) {
    for (const q of this.powerups) {
      if (q.taken) continue;
      q.t += dt;
      if (!q.on) { if (q.t >= q.fly) { q.on = true; q.t = 0; this.emit('powerupLand', { kind: q.kind, x: q.x, y: q.y }); const ch = this.players.filter(p => p.ctl < 0 && this.standing(p) && this.ball.holder !== p.id && dist(p, q) < 100).sort((a, b) => dist(a, q) - dist(b, q))[0]; q.chaser = ch ? ch.id : -1; } continue; }
      if (q.t >= q.life) { q.taken = true; this.emit('powerupGone', { kind: q.kind }); continue; }
      const p = this.players.find(o => this.standing(o) && FREE[o.st] && dist(o, q) < 10 + (o.size - 1) * 4);
      if (p) this.takePowerup(p, q);
    }
    this.powerups = this.powerups.filter(q => !q.taken || q.t < 1);
  },
  takePowerup(p, q) {
    q.taken = true; q.t = 0;
    const k = q.kind, P = TT.POWERUPS[k];
    if (k === 'horn') this.hypeAdd(p.team, 40);
    else if (k === 'boot') { this.megaBoot = this.megaBoot || [0, 0]; this.megaBoot[p.team] = P.time; }
    else { p.pu = { kind: k, t: P.time }; if (k === 'pie') p.turbo = TUNE.v.turboTank; }
    this.emit('powerupTake', { id: p.id, kind: k, team: p.team });
    this.banner(P.name + '!', { color: '#ffe08a' });
  },
  /* ---- hazards ---- */
  hazardStep(dt, live) {
    for (const h of this.hazards) h.t += dt;
    const k = this.hazardKind, every = TUNE.v.hazardEvery;
    if (live && k && k !== 'mud' && every > 0) {
      this.hazT -= dt * every;
      if (this.hazT <= 0) { this.startHazard(k); this.hazT = k === 'chicken' ? 50 + this.rng() * 20 : k === 'flames' ? 14 + this.rng() * 10 : 20 + this.rng() * 10; }
    }
    for (const h of this.hazards) {
      if (h.kind === 'chicken') this.chickenStep(h, dt);
      else if (h.kind === 'flame') this.flameStep(h, dt);
      else if (h.kind === 'bolt') this.boltStep(h, dt);
    }
    this.hazards = this.hazards.filter(h => !h.done);
    if (this.hazardKind === 'mud' && live && this.ball.holder >= 0 && this.ball.st === 'held') { const c = this.players[this.ball.holder]; if (c && this.inMud(c) && !c.mudSaid) { c.mudSaid = true; this.emit('mud', { id: c.id }); } }
  },
  startHazard(kind, o = {}) {
    const b = this.ball;
    if (kind === 'chicken') {
      const top = this.rng() < .5, x = clamp(b.x + (this.rng() - .5) * 160, G.X0 + 40, G.X1 - 40);
      const h = { kind: 'chicken', x, y: top ? G.Y0 - 30 : G.Y1 + 30, tx: x + (this.rng() - .5) * 200, ty: top ? G.Y1 + 40 : G.Y0 - 40, t: 0, warn: 1, life: 7, hit: {} };
      h.sp = dist2(h.x, h.y, h.tx, h.ty) / 6;
      this.hazards.push(h); this.emit('hazardWarn', { kind: 'chicken' });
    } else if (kind === 'flames') {
      const near = GRATES.slice().sort((a, q) => dist2(a.x, a.y, b.x, b.y) - dist2(q.x, q.y, b.x, b.y));
      const pick = near.slice(0, 6).filter(() => this.rng() < .75).slice(0, 4);
      if (!pick.length) pick.push(near[0]);
      pick.forEach((g, i) => this.hazards.push({ kind: 'flame', x: g.x, y: g.y, t: -i * .35, warn: 1.0, burn: 1.2, hit: {} }));
      this.emit('hazardWarn', { kind: 'flames' });
    } else if (kind === 'lightning') {
      const a = this.rng() * TAU, r = o.near ? 10 : 60 + this.rng() * 140;
      this.hazards.push({ kind: 'bolt', x: clamp(b.x + Math.cos(a) * r, G.X0 + 20, G.X1 - 20), y: clamp(b.y + Math.sin(a) * r, G.Y0 + 20, G.Y1 - 20), t: 0, warn: 1.4, hit: false });
      this.emit('hazardWarn', { kind: 'lightning' });
    } else if (kind === 'mud') {
      const c = this.carrier(); if (c) { c.mud = .6; this.emit('mud', { id: c.id }); }
    }
  },
  chickenStep(h, dt) {
    if (h.t < h.warn) return;
    const a = Math.atan2(h.ty - h.y, h.tx - h.x); h.f = a;
    h.x += Math.cos(a) * h.sp * dt; h.y += Math.sin(a) * h.sp * dt;
    if (!h.on) { h.on = true; this.emit('hazard', { kind: 'chicken' }); }
    for (const p of this.players) if (this.standing(p) && !h.hit[p.id] && dist(p, h) < 14 && p.st !== 'set' && p.st !== 'ruck') { h.hit[p.id] = 1; this.knockDown(p, 1.1, a + (this.rng() - .5)); this.emit('chickenHit', { id: p.id }); }
    if (!this.ref.down && dist(this.ref, h) < 14) this.refDown();
    if (dist2(h.x, h.y, h.tx, h.ty) < 8 || h.t > h.warn + h.life) h.done = true;
  },
  flameStep(h, dt) {
    if (h.t < h.warn || h.t > h.warn + h.burn) { if (h.t > h.warn + h.burn + .3) h.done = true; return; }
    if (!h.lit) { h.lit = true; this.emit('hazard', { kind: 'flames', x: h.x, y: h.y }); }
    for (const p of this.players) if (this.standing(p) && !h.hit[p.id] && dist(p, h) < 12) {
      h.hit[p.id] = 1; this.setSt(p, 'stun', 1.2); p.a.act = 'toasted'; p.toast = 2.5; p.charge = -1;
      if (this.ball.holder === p.id && this.ball.st === 'held') this.spillFrom(p, false);
      this.emit('toasted', { id: p.id });
    }
  },
  boltStep(h) {
    if (h.t < h.warn || h.hit) { if (h.hit && h.t > h.warn + .8) h.done = true; return; }
    h.hit = true;
    this.emit('hazard', { kind: 'lightning', x: h.x, y: h.y });
    for (const p of this.players) if (this.onPitch(p) && p.st !== 'launch' && dist(p, h) < 36) {
      this.setSt(p, 'stun', 1.5); p.a.act = 'zapped'; p.zap = .25; p.charge = -1;
      if (this.ball.holder === p.id && this.ball.st === 'held') this.spillFrom(p, false);
      this.emit('zapped', { id: p.id });
    }
    if (!this.ref.down && dist(this.ref, h) < 36) this.refDown();
  },
  refDown() {
    if (this.o.session && false) return;
    this.ref.down = 8; this.ref.vx = this.ref.vy = 0;
    this.emit('refDown', {});
    this.banner('REF DOWN!', { color: '#ff6a3a', sub: 'ANYTHING GOES!' });
  },
  /* ---- force(name): every dev-panel EVENT (and the attract director's showcase, and the tests) ---- */
  force(name, o = {}) {
    const team = o.team !== undefined ? o.team : (this.seats[0] ? this.seats[0].team : 0);
    const me = () => { const s = this.seats[0]; return s && s.pid >= 0 ? this.players[s.pid] : this.players.find(p => p.team === team && this.standing(p)); };
    const playable = () => { if (this.phase !== 'play') { for (const p of this.players) if (p.st === 'set' || p.st === 'ruck' || p.st === 'cele') this.setSt(p, 'free'); this.setp = null; this.pending = null; this.goPhase('play'); } };
    const giveTo = p => { playable(); for (const q of this.players) if (q.pin) { q.pin = false; } if (!this.standing(p)) this.setSt(p, 'free'); this.give(p, 'force'); return p; };
    switch (name) {
      case 'tryHome': case 'tryAway': { const t = name === 'tryHome' ? 0 : 1, p = this.players.find(q => q.team === t && this.standing(q)) || this.players[t * 7]; giveTo(p); p.x = this.oppLine(t) + this.dir[t] * 20; p.y = G.CY + (o.wide ? 200 : 40); return this.tryScored(p, p.x, p.y, 'force'); }
      case 'give': return giveTo(o.id !== undefined ? this.players[o.id] : me());
      case 'ball5m': { const p = giveTo(me()); p.x = this.oppLine(p.team) - this.dir[p.team] * (G.L5 + 4); p.y = G.CY + 60; return p; }
      case 'knockOn': { const p = giveTo(this.players.find(q => q.team === team && this.standing(q))); return this.knockOn(p); }
      case 'touch': { playable(); return this.touch(o.team !== undefined ? o.team : team, clamp(this.ball.x, G.X0 + 80, G.X1 - 80), o.far ? G.Y0 : G.Y1, false); }
      case 'penalty': { playable(); return this.penaltyAward(team, clamp(this.ball.x, G.X0 + 100, G.X1 - 100), this.ball.y, 'force'); }
      case 'freeKick': { playable(); return this.penaltyAward(team, this.ball.x, this.ball.y, 'force', true); }
      case 'scrum': { playable(); return this.scrumSetup(team, clamp(this.ball.x, G.X0 + 80, G.X1 - 80), this.ball.y); }
      case 'yellow': { const p = this.players.find(q => q.team === (o.team !== undefined ? o.team : 1 - team) && this.onPitch(q) && q.ctl < 0 && q.slot > 0); return this.giveCard(p, 'yellow'); }
      case 'kickoff': { this.setp = null; this.pending = null; this.kickoffTeam = team; for (const p of this.players) if (p.st === 'set' || p.st === 'ruck' || p.st === 'cele') this.setSt(p, 'free'); return this.goPhase('kickoff'); }
      case 'dropout': { this.setp = null; this.pending = null; return this.dropoutSetup(o.team !== undefined ? o.team : team); }
      case 'ruck': { const c = this.carrier() || giveTo(me()); this.setSt(c, 'down', 9); c.pin = true; return this.startRuck(c); }
      case 'monster': { let c = this.carrier(); if (!c) c = giveTo(this.players.find(q => q.team === 1 - team && this.standing(q))); const h = this.players.filter(q => q.team !== c.team && this.standing(q)).sort((a, b) => dist(a, c) - dist(b, c))[0]; if (!h) return; h.x = c.x + Math.cos(c.f) * 12; h.y = c.y + Math.sin(c.f) * 12; h.f = angTo(h, c); return this.tackled(h, c, 'monster'); }
      case 'powerup': return this.throwPowerup(o.kind, o.at);
      case 'hazard': { const k = o.kind || this.hazardKind || 'lightning'; if (k === 'mud') return this.startHazard('mud'); return this.startHazard(k, o); }
      case 'fire': { const p = o.id !== undefined ? this.players[o.id] : me(); p.fire = 90; return this.emit('onFire', { id: p.id }); }
      case 'thunder': { const p = this.carrier() && this.carrier().team === team ? this.carrier() : giveTo(me()); this.hype[p.team] = 100; return this.doSuper(p); }
      case 'hurricane': { let c = this.carrier(); if (!c || c.team === team) { if (!c) c = giveTo(this.players.find(q => q.team === 1 - team && this.standing(q))); } const p = me(); if (p.team === c.team) return; this.hype[p.team] = 100; return this.doSuper(p); }
      case 'hooter': this.clock = this.halfLen; return;
      case 'halftime': if (this.half === 1) { this.clock = this.halfLen; this.hooter = true; this.setp = null; this.pending = null; return this.endHalf(); } return;
      case 'fulltime': { this.half = 2; this.clock = this.halfLen; this.setp = null; this.pending = null; this.hooter = true; return this.endHalf(); }
      case 'sudden': { this.score[1] = this.score[0]; this.half = 2; this.setp = null; this.pending = null; return this.suddenDeath(); }
      case 'score': this.score[o.team || 0] = Math.max(0, this.score[o.team || 0] + (o.n || 5)); return;
      case 'clock': this.clock = clamp(this.clock + (o.n || -30), 0, this.halfLen); if (this.clock < this.halfLen) this.hooter = false; return;
      case 'refDown': return this.refDown();
      case 'dropGoal': { const p = giveTo(this.players.find(q => q.team === team && q.slot === 4 && this.standing(q)) || me()); p.x = this.oppLine(p.team) - this.dir[p.team] * 140; p.y = G.CY + 20; p.f = this.dir[p.team] > 0 ? 0 : PI; return this.doKick(p, 'drop', this.oppLine(p.team), G.CY, .95); }
      case 'cheap': { const p = this.players.find(q => q.team === team && this.standing(q) && this.ball.holder !== q.id && q.ctl < 0); const v = this.players.find(q => q.team !== team && this.standing(q) && this.ball.holder !== q.id); if (!p || !v) return; playable(); p.x = v.x - 10; p.y = v.y; p.f = 0; p.cool = 0; this.setSt(p, 'free'); return this.cheapShot(p, v); }
    }
  }
});
