/* Skiller7: the sim. Deterministic, fixed step (1/120 s), in metres. It owns every rule: the rail walker, the junctions,
 * gates, pickups, the first-person aim and the shots, the Whiteouts (invisible until scanned), personas and their
 * abilities, the Sweep, bosses, the echo timer. It never touches the 3D world: it leaves events in sim.ev for the
 * presenter, the sound and the HUD to read. */
S7.prog = null;   // the player's progress (saved): rime, red, unlocked personas, upgrades, picked pickups, best times

S7.newProgress = () => ({
  rime: 0, red: 3, unlocked: { patrol: true, racer: true, baron: true },
  upg: { hp: 0, ammo: 0, scan: 0 }, picked: {}, notes: {}, bossDown: {}, echoBest: null, rankBest: {}
});

S7.Sim = class Sim {
  constructor(area, opts = {}) {
    this.area = S7.prepareLegs(area);
    this.opts = opts;
    this.t = 0;
    this.ev = [];
    this.camOverride = null;   // a cutscene's camera (set by the scenes' cuts): { at, look, fov }
    this.braking = false;
    S7.seed(opts.seed || 1);
    this.legId = area.start || Object.keys(area.legs)[0];
    this.s = 0;
    this.dir = 1;
    this.speed = 0;
    this.mode = 'rail';
    this.junction = null;     // { options: [legIds], pick }
    this.gateOpen = {};
    this.fired = {};          // waves fired
    this.boss = null;
    this.complete = false;
    this.over = false;
    this.enemies = [];
    this.footprints = [];
    this.nextId = 1;
    this.aimYaw = 0;          // radians, relative to the walk direction
    this.aimPitch = 0;
    this.scanT = 0;           // seconds left on the scan pulse's ring
    this.scanCD = 0;
    this.stunT = 0;
    this.longT = 0;
    this.tuckT = 0;
    this.frozenSwitchT = 0;
    this.switchT = 0;
    this.thawT = 0;
    this.stats = { kills: 0, thaws: 0, shots: 0, hits: 0, revealed: 0, deaths: 0, pickups: 0, blasts: 0, time: 0, rime: 0, red: 0 };
    this.trace = [];          // echo: the run's distance over time
    this.traceT = 0;
    const roster = S7.ROSTER.filter(id => S7.prog.unlocked[id]);
    const cur = S7.prog.current;
    if (cur && roster.includes(cur)) roster.splice(roster.indexOf(cur), 1), roster.unshift(cur);
    this.roster = roster.length ? roster : ['patrol'];
    this.heroes = this.roster.map(id => this.makePersona(id));
    this.cur = 0;
    this.ev.push({ type: 'start', area: area.id });
  }

  makePersona(id) {
    const P = S7.PERSONAS[id], W = S7.WEAPONS[P.weapon], u = S7.prog.upg;
    const maxHp = Math.round(S7.live.heroHP + u.hp * 2);
    const mag = Math.round(W.mag * S7.live.ammoMult * (1 + .25 * u.ammo));
    return { id, hp: maxHp, maxHp, mag, magMax: mag, reloadT: 0, cdShot: 0, cdAbility: 0, frozen: false, charged: false,
      abilityT: 0, rescue: 0 };
  }
  get me() { return this.heroes[this.cur]; }
  get W() { return S7.WEAPONS[S7.PERSONAS[this.me.id].weapon]; }
  get leg() { return this.area.legs[this.legId]; }
  get pos() { return S7.legAt(this.area, this.legId, this.s); }
  eyePos() {
    const p = this.pos;
    return { x: p.x, y: p.y, z: p.z + 1.62, yaw: this.aimYaw + (this.dir > 0 ? p.ang : p.ang + Math.PI), pitch: this.aimPitch };
  }
  emit(type, data = {}) { data.type = type; this.ev.push(data); }
  hasAlive() { return this.heroes.some(h => !h.frozen); }

  /* ---- intents: the one interface for the player, the bot and the tests ----
   * I = { fwd, back, turn (edge), aim, fire (held), fireEdge, scan (edge), ability (edge), switchP (edge), heal (edge),
   *       interact (held), ring (held), branch (edge: -1 | 1), aimDX, aimDY (radians this step), confirm (edge) } */
  update(dt, I) {
    if (this.over || this.complete) return;
    this.t += dt;
    if (I.pay && !this.talkNear()) this.pay();
    const ringK = I.ring ? .15 : 1;
    const wdt = dt * ringK;
    const me = this.me;
    if (this.switchT > 0) this.switchT -= dt;
    if (this.stunT > 0) this.stunT -= dt;
    if (this.longT > 0) this.longT -= dt;
    if (this.tuckT > 0) this.tuckT -= dt;
    if (this.scanT > 0) this.scanT -= dt;
    if (this.scanCD > 0) this.scanCD -= dt;
    for (const h of this.heroes) {
      if (h.cdShot > 0) h.cdShot -= dt;
      if (h.cdAbility > 0) h.cdAbility -= dt;
      if (h.reloadT > 0) { h.reloadT -= dt; if (h.reloadT <= 0) { h.mag = h.magMax; this.emit('reload', { id: h.id }); } }
      if (h.abilityT > 0) h.abilityT -= dt;
    }

    // the active persona: frozen, the next alive one takes over after the freeze
    if (me.frozen) {
      this.frozenSwitchT += dt;
      if (this.frozenSwitchT > 1.2) {
        this.frozenSwitchT = 0;
        if (!this.switchTo(this.nextAlive())) { this.over = true; this.emit('gameover'); return; }
      }
      // the Sweep: hold interact to thaw a frozen persona
      if (I.interact) { this.thawT += dt; if (this.thawT > 2) { this.thawT = 0; const f = this.heroes.find(h => h.frozen); if (f) { f.frozen = false; f.hp = 2; this.emit('thaw_self', { id: f.id }); } } }
      else this.thawT = 0;
      this.updateEnemies(wdt, I);
      this.updateBoss(wdt);
      return;
    }
    if (I.switchP && this.switchT <= 0 && this.heroes.length > 1) {
      if (this.switchTo(this.nextAlive())) this.switchT = .45;
    }
    if (I.ability && me.cdAbility <= 0) this.useAbility(me);
    if (I.heal && this.prog().red > 0 && me.hp < me.maxHp) { this.prog().red--; me.hp = Math.min(me.maxHp, me.hp + 2); this.emit('heal', { id: me.id }); }
    if (I.scan && this.scanCD <= 0) this.scan();
    this.thawT = I.interact && this.heroes.some(h => h.frozen) ? this.thawT + dt : 0;
    if (this.thawT > 2) { this.thawT = 0; const f = this.heroes.find(h => h.frozen); if (f) { f.frozen = false; f.hp = 2; this.emit('thaw_self', { id: f.id }); } }

    // junction: the hero picks a branch, then walks on
    if (this.junction) {
      if (I.branch) { this.junction.pick = S7.clamp(this.junction.pick + I.branch, 0, this.junction.options.length - 1); this.emit('branch', { pick: this.junction.pick }); }
      if (!I.fwd) this.junctionArmed = true;     // the hero lets go, then presses forward again to commit
      if (I.fwd && this.junctionArmed) {
        const to = this.junction.options[this.junction.pick];
        this.junction = null;
        this.legId = to; this.s = 0; this.dir = 1;
        this.emit('leg', { leg: to, area: this.area.id });
      }
      this.updateEnemies(wdt, I);
      this.updateBoss(wdt);
      this.updateTrace(dt);
      return;
    }

    const L = this.leg;
    const aiming = !!I.aim && !L.ski;
    // walking: speed is a magnitude in m/s; dir (+1 along the leg, -1 back along it) gives the way
    if (L.ski) this.dir = 1;                                   // the black run is skied downhill only
    else if (I.turn) { this.dir = -this.dir; this.emit('turn'); }
    const walk = S7.live.walkSpeed * (this.tuckT > 0 && me.id === 'racer' ? 1.4 : 1);
    this.braking = !!(L.ski && I.back);
    if (L.ski) {
      const skiV = 9 * S7.live.slopeSpeed * (this.tuckT > 0 ? 2 : 1);
      this.speed = S7.approach(this.speed, I.back ? 0 : skiV, (I.back ? 26 : 5) * dt);   // back = the hockey stop
    } else if (!aiming && I.fwd) {
      this.speed = S7.approach(this.speed, walk, 6 * dt);
    } else {
      this.speed = S7.approach(this.speed, 0, (aiming ? 10 : 7) * dt);
    }
    this.s += this.speed * this.dir * wdt;
    this.checkGates();
    const lim = L.len;
    if (this.s >= lim) {
      this.s = lim;
      this.arriveEnd();
    } else if (this.s <= 0) {
      this.s = 0;
      if (this.dir < 0) this.speed = 0;
    }

    // aim, fire, reload
    if (aiming) {
      this.aimYaw = S7.clamp(this.aimYaw + (I.aimDX || 0) * (me.id === 'baron' ? 1 : 1), -1.25, 1.25);
      this.aimPitch = S7.clamp(this.aimPitch + (I.aimDY || 0), -.9, .8);
      this.aimYaw = S7.clamp(this.aimYaw, -1.25, 1.25);
      if (me.id === 'baron' && this.abilityOn('longlook')) this.longT = Math.max(this.longT, .2);
    } else {
      this.aimYaw = S7.approach(this.aimYaw, 0, dt * 4);
      this.aimPitch = S7.approach(this.aimPitch, 0, dt * 4);
    }
    if (S7.cheats.ammo) me.mag = me.magMax;
    if (aiming && me.cdShot <= 0 && !me.reloadT) {
      if (me.mag > 0) { if (I.fire) this.fireShot(I); }
      else if (I.fireEdge) { me.reloadT = this.W.reload; this.emit('empty', { id: me.id }); }
    }

    this.checkWaves();
    this.checkPickups();
    this.updateEnemies(wdt, I);
    this.updateBoss(wdt);
    this.stats.time += dt;
    this.mode = aiming ? 'aim' : (L.ski ? 'ski' : (this.speed !== 0 ? 'walk' : 'rail'));
    this.updateTrace(dt);
  }

  abilityOn(name) { const me = this.me; return S7.PERSONAS[me.id].ability === name; }
  prog() { return S7.prog; }
  nextAlive() {
    for (let i = 1; i <= this.heroes.length; i++) { const j = (this.cur + i) % this.heroes.length; if (!this.heroes[j].frozen) return j; }
    return -1;
  }
  switchTo(j) {
    if (j < 0) return false;
    const from = this.me.id;
    this.cur = j; this.frozenSwitchT = 0;
    this.emit('switch', { from, to: this.me.id });
    return true;
  }
  updateTrace(dt) {
    this.traceT -= dt;
    if (this.traceT <= 0 && this.leg) { this.traceT = .1; this.trace.push([+this.t.toFixed(2), this.legId, +this.s.toFixed(2)]); }
  }

  useAbility(me) {
    const P = S7.PERSONAS[me.id], a = P.ability;
    const pos = this.pos, fx = Math.cos(this.eyeYaw()), fy = Math.sin(this.eyeYaw());
    const inFront = e => { const dx = e.x - pos.x, dy = e.y - pos.y, d = Math.hypot(dx, dy); return d < 16 && (dx * fx + dy * fy) > 0; };
    const cd = { flare: 9, tuck: 8, longlook: 10, buyout: 12, echo: 14, flashbulb: 9, charge: 8 }[a] || 8;
    me.cdAbility = cd;
    if (a === 'flare') { this.stunT = 3; this.enemies.forEach(e => { if (inFront(e)) e.stun = 3; }); }
    if (a === 'tuck') this.tuckT = 4;
    if (a === 'longlook') this.longT = 5;
    if (a === 'buyout') { for (let i = 0; i < 3; i++) this.emit('rime_drop', { x: pos.x + (i - 1) * .9, y: pos.y + .6 * (i % 2) }); this.prog().rime += Math.round(3 * S7.live.rimeMult); this.stats.rime += Math.round(3 * S7.live.rimeMult); }
    if (a === 'echo') this.enemies.forEach(e => { e.revealT = Math.max(e.revealT, 4); });
    if (a === 'flashbulb') this.enemies.forEach(e => { if (inFront(e)) { e.stun = 2; e.revealT = Math.max(e.revealT, 3); } });
    if (a === 'charge') me.charged = true;
    this.emit('ability', { id: me.id, ability: a, name: P.abilityName });
  }
  eyeYaw() { const p = this.pos; return this.aimYaw + (this.dir > 0 ? p.ang : p.ang + Math.PI); }

  scan() {
    this.scanCD = 1.6; this.scanT = .7;
    const p = this.pos, yaw = this.eyeYaw(), fx = Math.cos(yaw), fy = Math.sin(yaw), R = S7.live.scanRange;
    let found = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      const front = d < 4 || (d < R && (dx * fx + dy * fy) / d > .35);
      if (front && d < R) { if (e.revealT <= 0) found++; e.revealT = S7.live.scanTime; e.scanned = true; }
    }
    this.stats.revealed += found;
    for (const f of this.footprints) if (Math.hypot(f.x - p.x, f.y - p.y) < R) f.life = Math.max(f.life, 6);
    this.emit('scan', { x: p.x, y: p.y, z: p.z, found, range: R });
  }

  fireShot(I) {
    const me = this.me, W = this.W, P = S7.PERSONAS[me.id];
    if (!S7.cheats.ammo) me.mag--;
    me.cdShot = 1 / (W.rate * S7.live.fireRate);
    if (me.mag <= 0 && !S7.cheats.ammo) me.reloadT = W.reload;
    this.stats.shots++;
    const eye = this.eyePos();
    const charged = me.charged; me.charged = false;
    const coneDeg = W.cone * S7.live.coneMult;
    const hits = [];
    for (let i = 0; i < W.pellets; i++) {
      const sp = (S7.streams.spread() - .5) * 2 * coneDeg * Math.PI / 180, sq = (S7.streams.spread() - .5) * 2 * coneDeg * Math.PI / 180;
      const yaw = eye.yaw + sp, pitch = eye.pitch + sq;
      const d = [Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)];
      const hit = this.castShot(eye, d, W, charged ? 3 : 1);
      if (hit) hits.push(hit);
    }
    if (hits.length) this.stats.hits++;
    this.emit('shot', { id: me.id, weapon: P.weapon, eye, hit: hits.length > 0, hits, charged });
  }

  /** hitscan along a ray: nearest enemy or the boss in the cone */
  castShot(o, d, W, mult) {
    let best = null, bestT = Infinity;
    const tol = (t) => t * Math.tan(W.cone * S7.live.coneMult * Math.PI / 180) * .6;
    const test = (e, spot, bodyR, id, isBoss) => {
      const px = spot[0] - o.x, py = spot[1] - o.y, pz = spot[2] - o.z;
      const t = px * d[0] + py * d[1] + pz * d[2];
      if (t < .2 || t > W.range) return;
      const qx = px - t * d[0], qy = py - t * d[1], qz = pz - t * d[2];
      const perp = Math.hypot(qx, qy, qz);
      if (perp <= bodyR + tol(t) && t < bestT) { bestT = t; best = { e, id, t, isBoss }; }
    };
    for (const e of this.enemies) {
      if (!e.alive || (e.revealT <= 0 && !S7.cheats.reveal)) continue;
      test(e, [e.x, e.y, e.z + e.warm], e.r * 1.6, 'warm', false);
      test(e, [e.x, e.y, e.z + 1.0], .42, 'body', false);
    }
    if (this.boss && this.boss.alive) {
      const b = this.boss;
      test(b, [b.x, b.y, b.z + b.warmZ], b.warmR, 'warm', true);
      test(b, [b.x, b.y, b.z + 1.6], b.bodyR, 'body', true);
    }
    if (!best) return null;
    if (best.isBoss) {
      const b = this.boss;
      const dmg = best.id === 'warm' ? 2 * mult : 1 * mult;
      b.hp -= dmg * S7.live.dmgMult;
      this.emit('boss_hit', { id: b.id, warm: best.id === 'warm', at: [b.x, b.y, b.z] });
      if (b.hp <= 0 && b.alive) this.bossDown();
      return { kind: 'boss', warm: best.id === 'warm', t: best.t };
    }
    const e = best.e;
    if (best.id === 'warm') {
      this.stats.thaws++;
      this.killEnemy(e, true);
      return { kind: 'thaw', t: best.t, at: [e.x, e.y, e.z] };
    }
    e.hp -= this.W.dmg * S7.live.dmgMult * mult;
    e.hitT = .25;
    if (e.hp <= 0) this.killEnemy(e, false);
    this.emit('hit', { at: [e.x, e.y, e.z + 1], type: e.type });
    return { kind: 'body', t: best.t, at: [e.x, e.y, e.z] };
  }

  killEnemy(e, thaw) {
    if (!e.alive) return;
    e.alive = false; e.deadT = 0;
    this.stats.kills++;
    this.emit('kill', { type: e.type, thaw, at: [e.x, e.y, e.z], laughing: e.laughing });
    if (S7.streams.drop() < .35 * S7.live.redDrops) this.emit('red_drop', { at: [e.x, e.y, e.z] });
  }

  /* ---- the Whiteouts ---- */
  spawnWave(name) {
    const list = S7.WAVES[name] || S7.WAVES.lane;
    const n = Math.max(0, Math.round(list.length * S7.live.enemyCount));
    const p = this.pos, dir = this.dir, L = this.leg.len;
    for (let i = 0; i < n; i++) {
      const [type, off] = list[i % list.length];
      const extra = Math.floor(i / list.length) * .9;
      const dist = 6.5 + off * 2.2 + extra + (dir > 0 ? 0 : 0);
      let s = S7.clamp(this.s + dir * dist, 0, L);
      if (Math.abs(s - this.s) < 2.5) s = S7.clamp(this.s - dir * 2.5, 0, L);
      const def = S7.ENEMIES[type], lat = ((i * 37) % 11 - 5) * .22;
      const e = { id: this.nextId++, type, hp: def.hp, def, leg: this.legId, s, lat, alive: true, laughing: false,
        warnT: 0, stun: 0, revealT: 0, scanned: false, hitT: 0, deadT: 0, speedK: 1, step: 0 };
      e.warm = def.warm; e.r = def.r; e.x = 0; e.y = 0; e.z = 0;
      this.placeEnemy(e);
      this.enemies.push(e);
    }
    this.emit('wave', { name, n });
  }
  placeEnemy(e) {
    const q = S7.legAt(this.area, e.leg, e.s);
    const nx = -q.dy, ny = q.dx;
    e.x = q.x + nx * e.lat; e.y = q.y + ny * e.lat; e.z = q.z;
    e.ang = q.ang;
  }

  updateEnemies(dt, I) {
    const p = this.pos;
    const longK = this.longT > 0 ? .35 : 1;
    for (const e of this.enemies) {
      if (e.hitT > 0) e.hitT -= dt;
      if (!e.alive) { e.deadT += dt; continue; }
      if (e.revealT > 0) e.revealT -= dt;
      if (e.stun > 0) { e.stun -= dt; }
      const same = e.leg === this.legId;
      const dzs = same ? (this.s - e.s) : 0;
      const dist3 = same ? Math.hypot(e.x - p.x, e.y - p.y) : 99;
      if (e.stun > 0 || this.stunT > 0 && dist3 < 16) { e.laughing = false; continue; }
      if (same) {
        const v = e.def.speed * longK;
        if (Math.abs(dzs) > e.def.arm) {
          const stepLen = v * dt * Math.sign(dzs);
          e.s += stepLen;
          e.step += Math.abs(stepLen);
          if (e.step > 1.1) { e.step = 0; this.footprints.push({ x: e.x, y: e.y, z: e.z, life: S7.live.scanTime + 1.2, leg: e.leg, s: e.s }); }
          this.placeEnemy(e);
          e.laughing = false; e.warnT = 0;
        } else {
          if (!e.laughing) { e.laughing = true; e.warnT = S7.live.enemyWarn; this.emit('laugh', { type: e.type, at: [e.x, e.y, e.z], style: e.def.laugh, loud: false }); }
          e.warnT -= dt * longK;
          if (S7.streams.laugh() < dt * 1.2) this.emit('laugh', { type: e.type, at: [e.x, e.y, e.z], style: e.def.laugh, loud: true });
          if (e.warnT <= 0) this.blast(e);
        }
      } else {
        e.laughing = false;
      }
      // footprints fade
    }
    for (const f of this.footprints) f.life -= dt;
    this.footprints = this.footprints.filter(f => f.life > 0);
    this.enemies = this.enemies.filter(e => e.alive || e.deadT < .8);
  }

  blast(e) {
    e.alive = false; e.deadT = 0; e.exploded = true;
    this.stats.blasts++;
    this.emit('explode', { at: [e.x, e.y, e.z], radius: S7.live.blastR, type: e.type });
    const p = this.pos;
    if (Math.hypot(e.x - p.x, e.y - p.y) < S7.live.blastR) this.hurt(S7.live.blastDmg * (e.def.dmg || 1) / 2, 'blast');
  }

  hurt(dmg, from) {
    const me = this.me;
    if (S7.cheats.god || me.frozen || this.switchT > 0) return;
    me.hp -= dmg;
    this.emit('hurt', { id: me.id, dmg, from, hp: me.hp });
    if (me.hp <= 0) {
      me.hp = 0; me.frozen = true; this.frozenSwitchT = 0; this.stats.deaths++;
      this.emit('freeze', { id: me.id, at: this.pos });
    }
  }

  /* ---- waves, pickups, gates, ends ---- */
  checkWaves() {
    const L = this.leg, f = L.len ? this.s / L.len : 0;
    for (let i = 0; i < this.area.waves.length; i++) {
      const w = this.area.waves[i];
      if (w.leg !== this.legId || this.fired[i] || f < w.at) continue;
      this.fired[i] = true;
      this.spawnWave(w.wave);
    }
  }
  checkPickups() {
    const P = this.prog(), L = this.leg;
    for (const pk of this.area.pickups || []) {
      if (pk.leg !== this.legId || P.picked[pk.id]) continue;
      if (Math.abs(this.s - pk.at * L.len) > 1.4) continue;
      P.picked[pk.id] = true;
      this.stats.pickups++;
      if (pk.kind === 'note') { P.notes[pk.note] = true; this.emit('note', { id: pk.note }); continue; }
      if (pk.kind === 'red') { P.red++; this.stats.red++; } else { P.rime += Math.round(2 * S7.live.rimeMult); this.stats.rime += Math.round(2 * S7.live.rimeMult); }
      this.emit('pickup', { kind: pk.kind, id: pk.id, at: this.pos });
    }
  }
  checkGates() {
    const L = this.leg;
    for (const g of this.area.gates || []) {
      if (g.leg !== this.legId || this.gateOpen[g.id]) continue;
      const gs = g.at * L.len;
      if (this.dir > 0 && this.s >= gs - .02) {
        this.s = gs - .02; this.speed = 0;
        this.gateNear = g;
        if (this.wantPay) {
          this.wantPay = false;
          if (g.kind === 'code') this.emit('code_request', { id: g.id, label: g.label, digits: g.code.length });
          else if (this.prog().rime >= g.price) { this.prog().rime -= g.price; this.openGate(g.id, g.price); }
          else this.emit('gate_fail', { id: g.id, price: g.price });
        }
      } else if (this.gateNear === g) this.gateNear = null;
    }
  }
  openGate(id, price = 0) { this.gateOpen[id] = true; this.gateNear = null; this.emit('gate', { id, price }); }
  /** interact pressed: pay a gate in front of the hero */
  pay() { if (this.gateNear) this.wantPay = true; }
  /** the person in talking range on this leg (2.6 m), or null */
  npcNear() {
    const p = this.pos;
    for (const n of this.area.npcs || []) {
      if (n.leg !== this.legId) continue;
      const q = S7.npcPos(this.area, n);
      if (Math.hypot(q.x - p.x, q.y - p.y) < 2.6) return n;
    }
    return null;
  }
  talkNear() {
    const n = this.npcNear();
    if (n) this.emit('talk', { id: n.id });
    return !!n;
  }
  arriveEnd() {
    const L = this.leg;
    if (L.finish) { this.finish(); return; }
    if (L.boss && !this.boss && !this.bossDoneFor(L.boss)) { this.startBoss(L.boss); return; }
    if (L.next && L.next.length === 1 && this.dir > 0) {
      this.legId = L.next[0]; this.s = 0; this.emit('leg', { leg: this.legId, area: this.area.id });
      return;
    }
    if (L.next && L.next.length > 1 && this.dir > 0) {
      this.junction = { options: L.next.slice(), pick: 0 };
      this.junctionArmed = false;
      this.speed = 0;
      this.emit('junction', { options: L.next.slice(), leg: this.legId });
      return;
    }
    this.speed = 0;
  }
  bossDoneFor(id) { return !!(this.prog().bossDown[this.area.id + ':' + id]); }
  startBoss(id) {
    const def = S7.BOSSES[id], L = this.leg, p = this.pos;
    const bx = p.x + p.dx * 2.2, by = p.y + p.dy * 2.2;
    this.boss = { id, name: def.name, hp: def.hp * S7.live.bossHP, maxHP: def.hp * S7.live.bossHP, x: bx, y: by, z: p.z,
      alive: true, pulseT: 3, spawnT: def.spawnEvery, warmZ: id === 'powderking' ? 2.6 : 3.1, warmR: .45, bodyR: 1.5, t: 0, phase: 1, def };
    this.speed = 0;
    this.emit('boss', { id, phase: 1, name: def.name, line: def.line });
  }
  updateBoss(dt) {
    const b = this.boss;
    if (!b || !b.alive) return;
    b.t += dt;
    const def = b.def;
    if (b.hp <= b.maxHP / 2 && b.phase === 1) { b.phase = 2; this.emit('boss', { id: b.id, phase: 2, name: def.name, line: 'Oh, the warmth! Again!' }); }
    b.pulseT -= dt;
    if (b.pulseT <= 0) {
      b.pulseT = def.pulseEvery * (b.phase === 2 ? .8 : 1);
      this.emit('boss_pulse', { at: [b.x, b.y, b.z], r: def.pulseR });
      const p = this.pos;
      if (Math.hypot(p.x - b.x, p.y - b.y) < def.pulseR) this.hurt(def.pulseDmg * 1, 'pulse');
    }
    b.spawnT -= dt;
    if (b.spawnT <= 0) {
      b.spawnT = def.spawnEvery;
      this.spawnWave(this.area.id === 't00' ? 'shaft' : 'plateau');
    }
  }
  bossDown() {
    const b = this.boss;
    b.alive = false;
    this.prog().bossDown[this.area.id + ':' + b.id] = true;
    this.emit('bossdown', { id: b.id });
    this.enemies.forEach(e => { if (e.alive) { e.alive = false; e.deadT = 0; } });
    this.complete = true;
    this.finish();
  }
  finish() {
    if (this.complete && this.finished) return;
    this.complete = true;
    this.finished = true;
    this.emit('complete', { area: this.area.id, time: this.t, stats: this.stats });
  }
}
