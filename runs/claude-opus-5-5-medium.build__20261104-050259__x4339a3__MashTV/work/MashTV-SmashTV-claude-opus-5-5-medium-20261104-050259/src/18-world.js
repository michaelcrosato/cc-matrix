// ---------------------------------------------------------------- the World: everything in one room, stepped authoritatively
MT.World = class World {
  constructor(o) {
    this.room = o.room; this.ep = o.room.ep || 1; this.mode = o.mode || 'arcade'; this.entry = o.entry || 'S';
    this.arena = new MT.Arena(o.room.set || (MT.EPISODES[this.ep] || {}).set || 'studio');
    this.contestants = o.contestants || []; this.enemies = []; this.pickups = []; this.solids = [];
    this.pShots = new MT.Shots('p'); this.fShots = new MT.Shots('f');
    this.ratings = o.ratings || new MT.Ratings(); this.ratings.stuntDone = false; this.ratings.low = 0;
    this.boss = null; this.phase = 'enter'; this.phaseT = 0; this.t = 0; this.timers = []; this.scripts = [];
    this.events = []; this.seq = o.seq || 0; this.keysOn = o.keysOn !== false; this.keyGiven = false;
    this.hash = new E.SpatialHash(32); this.waveIdx = -1; this.wavesTotal = 0; this.allSpawned = false; this.cleared = false;
    this.exitDir = null; this.exitT = 0; this.hurryT = 0; this.cashMul = o.room.cashMul || 1; this.dropBoost = o.room.dropBoost || 1;
    this.laserBeams = []; this.jumboClock = null; this.stats = { spawned: {}, killed: {} }; this.lastDt = 1 / 120; this.result = null;
    this.tutorial = o.tutorial || false; this.intro = o.intro !== false; this.onLeave = o.onLeave || null;
    MT.W = this;
  }
  // ------------------------------------------------ lifecycle
  start() {
    const room = this.room, n = this.contestants.length;
    this.contestants.forEach((c, k) => { if (c.state === 'gone') return; c.placeWalkIn(this.entry, k, n); if (c.state === 'out') { c.x = -100; } });
    this.arena.slam(this.entry);
    for (const [kind, cx, cy] of room.place || []) { const [x, y] = MT.cell(cx, cy); const e = this.spawnAt(kind, x, y, { placed: true }); if (e) e.placed = true; }
    for (const [at, item, where] of room.items || []) this.later(at + 1.2, () => this.placeItem(item, where, true));
    if (room.hazards) for (const h of room.hazards) { if (h.kind === 'conveyor') this.arena.addConveyor(h.rows, h.dirs); if (h.kind === 'vents') this.arena.addVents(h.cx, h.cy, h.patterns, h.every); }
    if (room.pedestals) for (const p of room.pedestals) { const [x, y] = MT.cell(p[0], p[1]); this.arena.pedestals.push({ x, y }); }
    MT.keyRules.setup(this, room);
    this.event('roomEnter', { id: room.id, name: room.name, boss: !!room.boss, ep: this.ep });
  }
  dispose() { for (const s of this.scripts) s.cancel(); this.scripts.length = 0; this.timers.length = 0; if (MT.W === this) MT.W = null; }
  later(t, fn, spawn) { this.timers.push({ at: this.t + t, fn, spawn: !!spawn }); }
  pending() { let n = 0; for (const d in this.arena.doors) n += this.arena.doors[d].queue.filter(q => MT.ENEMIES[q.kind].counted).length; for (const t of this.timers) if (t.spawn) n++; return n; }
  script(gen) { const s = MT.game.script(gen); this.scripts.push(s); return s; }
  event(name, data = {}, net = true) {
    data.ev = name; MT.emit('world:' + name, data); MT.react.on(name, data, this);
    if (net) { this.seq++; this.events.push({ seq: this.seq, name, data, t: this.t }); if (this.events.length > 60) this.events.shift(); }
  }
  setPhase(p) { this.phase = p; this.phaseT = 0; this.event('phase', { p }, false); }
  // ------------------------------------------------ queries
  target(e) {
    let best = null, bd = 1e18;
    for (const c of this.contestants) { if (!(c.state === 'play' || c.state === 'drop' || c.state === 'walkin')) continue; const d = MT.d2(e, c); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  alive() { let n = 0; for (const e of this.enemies) if (!e.dead && e.counted) n++; return n; }
  queuesEmpty() { for (const d in this.arena.doors) if (this.arena.doors[d].queue.length) return false; return !this.timers.some(t => t.spawn); }
  living() { return this.contestants.filter(c => c.state !== 'out' && c.state !== 'gone'); }
  // ------------------------------------------------ spawning
  spawnAt(kind, x, y, o = {}) {
    const A = MT.ENEMIES[kind]; if (!A) throw new Error('no enemy ' + kind);
    const big = kind === 'discoBig';
    const e = { id: MT.nid(), kind: big ? 'disco' : kind, A, x, y, z: 0, vx: 0, vy: 0, r: A.r, hp: A.hp * (kind === 'crate' || kind === 'lock' || kind === 'paparazzi' ? 1 : MT.T.enemyHp), state: 'move', t: 0, face: Math.PI / 2,
      flash: 0, stun: 0, counted: A.counted, cash: A.cash, dead: false, entering: null, leap: null, dropT: 0, placed: !!o.placed };
    e.max = e.hp; e.rs = e;   // the render state the painters read (the enemy itself, or a mirror's copy)
    A.init && A.init(e, Object.assign({ big }, o), this);
    e.rig = MT.cfg.skipRigs ? null : (MT.enemyRig(e.kind) || null);
    if (e.kind === 'mime' && e.rig) MT.mimeBox(e.rig, e);
    this.enemies.push(e); if (A.solid) this.solids.push(e);
    this.stats.spawned[kind] = (this.stats.spawned[kind] || 0) + 1; MT.run && (MT.run.seen[kind] = true);
    MT.keyRules.onSpawn(this, e); this.event('spawn', { kind, id: e.id }, false);
    return e;
  }
  spawnAtDoor(kind, d, o) {
    const P = AR.doors[d], j = MT.Rr(-14, 14, 'spawn');
    const x = P.x - P.nx * 22 + (P.nx === 0 ? j : 0), y = P.y - P.ny * 22 + (P.ny === 0 ? j : 0);
    const e = this.spawnAt(kind, x, y, o); e.entering = { nx: P.nx, ny: P.ny }; e.face = Math.atan2(P.ny, P.nx); return e;
  }
  spawnAudience(kind, side, o) {
    const sx = side === 'W' ? -30 : 398, sy = MT.Rr(40, 200, 'spawn'), tx = side === 'W' ? MT.Rr(40, 120, 'spawn') : MT.Rr(248, 328, 'spawn'), ty = MT.Rr(40, 200, 'spawn');
    const e = this.spawnAt(kind, sx, sy, o); e.leap = { sx, sy, tx, ty, t: 0, d: .7 }; e.z = 20; this.event('leap', { x: sx, y: sy }, false); return e;
  }
  spawnDrop(kind, o) {
    let x = AR.cx, y = AR.cy;
    for (let k = 0; k < 20; k++) { x = MT.Rr(40, 328, 'spawn'); y = MT.Rr(40, 200, 'spawn'); if (this.contestants.every(c => c.state === 'out' || Math.hypot(c.x - x, c.y - y) > 50)) break; }
    const e = this.spawnAt(kind, x, y, o); e.dropT = .9; e.z = 90; return e;
  }
  // ------------------------------------------------ player fire
  fireBolt(c, a, dmg) {
    const mx = c.x + Math.cos(a) * 10, my = c.y + Math.sin(a) * 10, sp = MT.T.bulletSpeed;
    this.pShots.fire({ kind: 'bolt', x: mx, y: my, z: 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.5, life: .9, dmg: dmg * MT.T.dmgMul, owner: c.slot });
  }
  fireRocket(c) { const a = c.aim; this.pShots.fire({ kind: 'rocket', x: c.x + Math.cos(a) * 10, y: c.y + Math.sin(a) * 10, z: 14, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, accel: [400, 300], r: 3, life: .9, dmg: 4 * MT.T.dmgMul, splash: 3 * MT.T.dmgMul, owner: c.slot }); }
  fireBag(c) {
    const a = c.aim; let d = 90;
    if (c === (MT.game.input && this.contestants[0]) && MT.game.input.lastDevice === 'mouse') { const m = MT.game.mouseGround(); if (m) d = clamp(Math.hypot(m[0] - c.x, m[1] - c.y), 30, 90); }
    const tx = c.x + Math.cos(a) * d, ty = c.y + Math.sin(a) * d, t = .55, vz = 500 * t / 2 + (0 - 12) / t;
    this.pShots.fire({ kind: 'bag', x: c.x, y: c.y, z: 12, vx: (tx - c.x) / t, vy: (ty - c.y) / t, vz, grav: 500, r: 3, life: 3, dmg: 2 * MT.T.dmgMul, owner: c.slot });
  }
  laser(c, dt) {
    const a = c.laserAng, x0 = c.x + Math.cos(a) * 10, y0 = c.y + Math.sin(a) * 10, dx = Math.cos(a), dy = Math.sin(a);
    let L = 600; for (const [lim, d] of [[AR.x0, dx], [AR.x1, dx]]) { const t = (lim - x0) / d; if (d && t > 0) L = Math.min(L, t); } for (const [lim, d] of [[AR.y0, dy], [AR.y1, dy]]) { const t = (lim - y0) / d; if (d && t > 0) L = Math.min(L, t); }
    this.laserBeams.push({ x0, y0, x1: x0 + dx * L, y1: y0 + dy * L, c: c.slot });
    const dmg = 16 * dt * MT.T.dmgMul;
    for (const e of this.enemies) { if (e.dead || e.entering || e.leap || e.A.harmless) continue; const t = (e.x - x0) * dx + (e.y - y0) * dy; if (t < 0 || t > L) continue; const px2 = x0 + dx * t - e.x, py2 = y0 + dy * t - e.y; if (px2 * px2 + py2 * py2 < (e.r + 2) * (e.r + 2)) this.damage(e, dmg, c, true); }
    if (this.boss) this.boss.laser(x0, y0, dx, dy, L, dmg, c);
  }
  // ------------------------------------------------ foe fire
  foe(e, kind, a, speed, o = {}) {
    if (MT.CHEATS.freeze) return null;
    const sp = speed * bspd();
    return this.fShots.fire(Object.assign({ kind, x: e.x + Math.cos(a) * (e.r + 2), y: e.y + Math.sin(a) * (e.r + 2), z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: kind === 'shard' ? 2 : 3, life: 3.2, src: e.kind }, o));
  }
  lob(from, tx, ty, kind, o = {}) {
    if (MT.CHEATS.freeze) return null;
    const t = (o.time || .9) / Math.max(.5, bspd()), g = 400, z0 = o.z || 18, vz = g * t / 2 - z0 / t;
    return this.fShots.fire(Object.assign({ kind, x: from.x, y: from.y, z: z0, vx: (tx - from.x) / t, vy: (ty - from.y) / t, vz, grav: g, r: 3, life: 6, tx, ty, src: from.kind }, o));
  }
  lobTomato(e, tg, off = 0) {
    const tx = clamp(tg.x + (tg.vx || 0) * .6 + off, AR.x0 + 6, AR.x1 - 6), ty = clamp(tg.y + (tg.vy || 0) * .6, AR.y0 + 6, AR.y1 - 6);
    this.lob(e, tx, ty, 'tomato', { time: .9 }); this.event('throw', { x: e.x, y: e.y }, false);
  }
  landLob(b) {
    if (b.team === 'p') {   // the popcorn bag bursts into kernels
      this.explode({ x: b.x, y: b.y, r: 18, dmg: b.dmg, team: 'p', owner: b.owner, small: true });
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; this.pShots.fire({ kind: 'kernel', x: b.x, y: b.y, z: 6, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2, life: .35, dmg: 1.5 * MT.T.dmgMul, pierce: 1, owner: b.owner }); }
      this.event('popcorn', { x: b.x, y: b.y }, false); return;
    }
    if (b.kind === 'tomato') { this.arena.addSplat(b.x, b.y); this.event('splat', { x: b.x, y: b.y }); for (const c of this.contestants) if (c.canBeHit && Math.hypot(c.x - b.x, c.y - b.y) < 10 + c.r) c.hurt(1, b, this); return; }
    if (b.kind === 'tot') { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + MT.R() * .5; this.fShots.fire({ kind: 'shard', x: b.x, y: b.y, z: 8, vx: Math.cos(a) * 85 * bspd(), vy: Math.sin(a) * 85 * bspd(), r: 2, life: 1.4 }); } this.event('pop', { x: b.x, y: b.y }, false); return; }
    if (b.kind === 'mic') { this.boss && this.boss.micLand && this.boss.micLand(b); }
  }
  bulletWall(b) { if (b.kind === 'rocket' || b.kind === 'shell') this.explode(b); else if (b.team === 'p' && MT.fxr() < .5) this.event('spark', { x: b.x, y: b.y }, false); }
  explode(b) {
    const big = b.big, r = b.r && b.r > 6 ? b.r : (b.kind === 'shell' ? 16 : b.kind === 'rocket' ? 24 : 18);
    this.event('boom', { x: b.x, y: b.y, big: !!big, small: !!b.small }, true);
    this.arena.scorches.push({ x: b.x, y: b.y, r: r * .6, t: 6 });
    if (b.team === 'p') {
      const dmg = b.splash !== undefined ? b.splash : (b.dmg || 2), owner = b.owner !== undefined ? this.contestants.find(c => c.slot === b.owner) : null;
      for (const e of this.enemies) if (!e.dead && !e.entering && !e.leap && !e.A.harmless && Math.hypot(e.x - b.x, e.y - b.y) < r + e.r) this.damage(e, dmg, owner);
      if (this.boss) this.boss.splash(b.x, b.y, r, dmg, owner);
    } else {
      for (const c of this.contestants) if (c.canBeHit && Math.hypot(c.x - b.x, c.y - b.y) < r + c.r - 2) c.hurt(1, b, this);
    }
  }
  popperBurst(e) { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const s = this.foe(e, 'shard', a, 90, { life: 1.2, r: 2 }); if (s) { s.x = e.x; s.y = e.y; } } this.event('pop', { x: e.x, y: e.y, big: true }); }
  mimeBlast(e) { this.event('boom', { x: e.x, y: e.y, small: true }); for (const c of this.contestants) if (c.canBeHit && Math.hypot(c.x - e.x, c.y - e.y) < 36) c.hurt(1, e, this); }
  // ------------------------------------------------ damage and death
  damage(e, dmg, src, quiet) {
    if (e.dead || e.A.harmless || e.leap || (e.dropT > .3)) return;
    if (MT.CHEATS.oneHit && src) dmg = e.hp;
    if (src && MT.run && MT.run.mode === 'attract') dmg *= 3;
    dmg *= (e.A.dmgMul ? e.A.dmgMul(e) : 1);
    e.hp -= dmg; e.flash = .08;
    if (!quiet) this.event('hit', { x: e.x, y: e.y, k: e.kind }, false);
    if (e.hp <= 0) this.kill(e, src);
  }
  kill(e, src, o = {}) {
    if (e.dead) return; e.dead = true;
    if (e.A.onDeath) e.A.onDeath(e, this);
    MT.keyRules.onKill(this, e);
    this.stats.killed[e.kind] = (this.stats.killed[e.kind] || 0) + 1; if (MT.run) MT.run.killedKinds[e.kind] = true;
    if (o.silent) { this.event('die', { x: e.x, y: e.y, k: e.kind, id: e.id }); return; }
    const X = this.ratings.X;
    const killer = src || null, cash = Math.round((e.cash || 0) * X * MT.T.cashMul * this.cashMul);
    if (killer) { killer.kills++; if (cash) killer.addCash(cash, this); }
    this.ratings.gain(e.A.rat || 0, this); this.ratings.kill(this);
    this.event('die', { x: e.x, y: e.y, k: e.kind, id: e.id, cash, slot: killer ? killer.slot : -1, big: !!e.A.big });
    if (!o.noDrop) this.rollDrops(e);
  }
  rollDrops(e) {
    const caps = this.pickups.filter(p => p.kind === 'cap').length, cash = this.pickups.filter(p => MT.PICKUPS[p.kind].cash).length;
    for (const [k, p] of e.A.drops || []) {
      const mul = MT.T.dropMul * (k === 'bill' ? this.dropBoost : 1);
      if (!MT.chance(p * mul)) continue;
      if (k === 'cap' && caps >= 3) continue; if (MT.PICKUPS[k] && MT.PICKUPS[k].cash && cash >= 25) continue;
      if (k === 'cap') this.addPickup('cap', e.x, e.y, { w: MT.Rpick(MT.CAPSULES, 'drops') });
      else this.addPickup(k, e.x, e.y);
      break;
    }
  }
  crateSpill(e) {
    for (let i = 0, n = MT.Ri(3, 5, 'drops'); i < n; i++) this.addPickup(MT.Rpick(['bill', 'bill', 'stack', 'gold'], 'drops'), e.x, e.y, { vx: MT.Rr(-80, 80, 'drops'), vy: MT.Rr(-80, 80, 'drops'), vz: 120 });
    if (MT.chance(.5)) this.addPickup('prize', e.x, e.y, { vx: MT.Rr(-40, 40, 'drops'), vy: MT.Rr(-40, 40, 'drops'), vz: 140 });
    this.solids = this.solids.filter(s => s !== e); this.event('crate', { x: e.x, y: e.y });
  }
  lockBroken(e) {
    if (!this.enemies.some(o => o !== e && !o.dead && o.kind === 'lock')) {
      if (this.arena.safe) this.arena.safe.open = true; this.event('vault', { x: 72, y: 24 });
      if (this.keysOn && !this.keyGiven) this.dropKey(72, 30, false);
      for (let i = 0; i < 10; i++) this.addPickup(MT.Rpick(['stack', 'gold', 'bill'], 'drops'), 72, 26, { vx: MT.Rr(-90, 90, 'drops'), vy: MT.Rr(20, 120, 'drops'), vz: 150 });
    }
  }
  dropKey(x, y, placed, rise) {
    if (this.keyGiven) return; this.keyGiven = true;
    const p = this.addPickup('key', x, y, { placed: true, z: rise ? 0 : 10, vz: rise ? 160 : 100 }); this.event('keyDrop', { x, y }); return p;
  }
  addPickup(kind, x, y, o = {}) { const p = new MT.Pickup(kind, x, y, o); this.pickups.push(p); return p; }
  placeItem(item, where, pedestal) {
    let x, y, drop = false;
    if (where === 'center') { x = AR.cx; y = AR.cy + 30; }
    else if (where === 'drop') { drop = true; x = MT.Rr(60, 308, 'spawn'); y = MT.Rr(50, 190, 'spawn'); }
    else { [x, y] = MT.cell(where[0], where[1]); }
    const kind = MT.CAPSULES.includes(item) ? 'cap' : item;
    const p = this.addPickup(kind, x, y, { w: kind === 'cap' ? item : null, z: drop ? 90 : 0, placed: !drop && kind === 'cap', vz: 0 });
    if (pedestal) p.z = 6;
    this.event('item', { x, y, w: item });
    return p;
  }
  // ------------------------------------------------ collection
  collect(c, p) {
    if (p.dead) return; p.dead = true;
    const X = this.ratings.X, mul = X * MT.T.cashMul * this.cashMul;
    const k = p.kind;
    if (MT.PICKUPS[k].cash) { const v = Math.round(MT.PICKUPS[k].value * mul); c.addCash(v, this); this.event('cash', { slot: c.slot, v, x: p.x, y: p.y }); return; }
    if (k === 'prize') {
      const pr = MT.nextPrize(this.ep), v = Math.round(pr.value * mul); c.addCash(v, this); c.prizes.push({ name: pr.name, value: v, base: pr.value, icon: pr.icon, line: pr.line, ep: this.ep });
      this.ratings.gain(2, this); this.event('prize', { slot: c.slot, name: pr.name, v, x: p.x, y: p.y }); return;
    }
    if (k === 'key') {
      if (this.mode === 'session') { c.addCash(10000, this); this.event('keySession', { slot: c.slot, x: p.x, y: p.y }); return; }
      MT.run.keys++; MT.run.keyRooms[this.room.id] = true; this.ratings.gain(5, this); this.event('key', { slot: c.slot, n: MT.run.keys, x: p.x, y: p.y }); return;
    }
    if (k === 'cap') { this.equip(c, p.w); return; }
    if (k === 'bomb') { if (c.bombs >= 3) { c.addCash(2000, this); } else c.bombs++; this.event('bombGet', { slot: c.slot, x: p.x, y: p.y }); return; }
    if (k === 'life') { c.lives++; this.event('extraLife', { slot: c.slot, x: p.x, y: p.y }); return; }
    if (k === 'statue') { const v = Math.round(100000 * mul); c.addCash(v, this); c.prizes.push({ name: 'THE NETWORK (YES, ALL OF IT)', value: v, base: 100000, icon: ['screen', '#ffcc33', '#c8202a'], line: 'YOU OWN THE SHOW NOW!', ep: 4 }); this.event('statue', { slot: c.slot, v }); this.greenDone = true; return; }
  }
  equip(c, w) {
    if (MT.WEAPONS[w]) { if (c.wpn === w) c.wpnT = MT.WEAPONS[w].dur * MT.T.puDuration; else { c.wpn = w; c.wpnT = MT.WEAPONS[w].dur * MT.T.puDuration; } }
    else if (MT.ADDONS[w]) c.addons[w] = MT.ADDONS[w].dur * MT.T.puDuration;
    if (MT.run) MT.run.usedW[w] = true;
    this.event('powerup', { slot: c.slot, w, x: c.x, y: c.y });
  }
  // ------------------------------------------------ the show's verbs
  showstopper(c, force) {
    if (!force) { if (c.bombs <= 0) return; if (!MT.CHEATS.infBombs && !(MT.run && MT.run.mode === 'attract')) c.bombs--; }
    this.event('bomb', { slot: c.slot, x: c.x, y: c.y });
    for (const e of this.enemies) if (!e.dead && !e.A.harmless && !e.leap && !e.entering) { this.damage(e, 25, c, true); e.stun = 1; }
    if (this.boss) this.boss.bomb(30, c);
    this.fShots.clear();
    this.ratings.gain(8, this); if (MT.run) MT.run.bombsUsed++;
  }
  showboatDone(c) {
    let n = 0, m = 0; for (const e of this.enemies) { if (e.dead || !e.counted) continue; const d = MT.dist(c, e); if (d < 64) n++; if (d < 32) m++; }
    if (this.boss) { const d = MT.dist(c, this.boss); if (d < 70) n += 2; }
    const gain = Math.min(30, 4 + 3 * n + 3 * m);
    this.ratings.gain(gain, this); c.boatGain += gain; if (MT.run) MT.run.boats++;
    this.event('showboat', { slot: c.slot, gain, x: c.x, y: c.y });
  }
  continueContestant(c) {
    if (this.mode === 'attract') return;
    c.lives = MT.startLives(); c.cash = Math.floor(c.cash / 2); c.hp = MT.maxHp(); c.respawn(this); if (MT.run) MT.run.continues++;
    this.event('continueOne', { slot: c.slot });
  }
  primeShower() {
    for (let i = 0; i < 3; i++) {
      const side = i % 2 ? 'E' : 'W', from = { x: side === 'W' ? -20 : 388, y: MT.Rr(40, 200, 'drops') }, tx = MT.Rr(60, 308, 'drops'), ty = MT.Rr(50, 190, 'drops');
      const p = this.addPickup('cap', from.x, from.y, { w: MT.Rpick(MT.CAPSULES, 'drops'), z: 30, vz: 220 }); p.vx = (tx - from.x) * 1.4; p.vy = (ty - from.y) * 1.4;
    }
    this.event('confettiCannon', {});
  }
  stunt() {
    const ep = MT.EPISODES[this.ep] || MT.EPISODES[1], d = MT.Rpick(['N', 'E', 'S', 'W'], 'spawn');
    const [kind, n] = ep.stunt; this.arena.queueSpawn(d, kind, n, .2); this.event('stunt', { kind, d });
  }
  // ------------------------------------------------ the authoritative step
  step(dt, intents) {
    this.t += dt; this.phaseT += dt; this.lastDt = dt; this.laserBeams.length = 0;
    for (let i = 0; i < this.timers.length; i++) { const tm = this.timers[i]; if (tm.at <= this.t) { tm.done = true; tm.fn(); } }
    E.prune(this.timers, t => t.done);
    // 1-2: contestants
    for (const c of this.contestants) c.update(dt, intents[c.slot] || MT.NOINTENT(), this);
    // 3: enemies
    this.hash.build(this.enemies.filter(e => !e.dead && !e.static));
    for (const e of this.enemies) if (!e.dead) this.stepEnemy(e, dt);
    // 4: boss
    if (this.boss) this.boss.update(dt, this);
    // 5: projectiles
    this.pShots.update(dt, this); this.fShots.update(dt, this);
    // 6: collisions
    this.collide(dt);
    // pickups
    for (const p of this.pickups) p.update(dt, this);
    E.prune(this.pickups, p => p.dead);
    E.prune(this.enemies, e => e.dead);
    // 7-8: ratings, doors, phases
    this.ratings.update(dt, this, this.phase === 'waves' && !this.room.bonus);
    this.arena.update(dt, this);
    this.phaseStep(dt);
  }
  stepEnemy(e, dt) {
    const A = e.A;
    e.flash = Math.max(0, e.flash - dt);
    if (e.leap) {
      const L = e.leap; L.t += dt; const u = Math.min(1, L.t / L.d); e.x = lerp(L.sx, L.tx, u); e.y = lerp(L.sy, L.ty, u); e.z = 20 + Math.sin(u * Math.PI) * 50 - u * 20; e.vx = (L.tx - L.sx) / L.d; e.vy = (L.ty - L.sy) / L.d; e.face = Math.atan2(e.vy, e.vx);
      if (u >= 1) { e.leap = null; e.z = 0; }
      A.pose && A.pose(e, dt); return;
    }
    if (e.dropT > 0) { e.dropT -= dt; e.z = e.dropT > .3 ? 90 : 90 * (e.dropT / .3); if (e.dropT <= 0) { e.z = 0; this.event('thud', { x: e.x, y: e.y }, false); } A.pose && A.pose(e, dt); return; }
    if (e.entering) {
      const sp = Math.max(40, A.speed || 40) * espd();
      e.x += e.entering.nx * sp * dt; e.y += e.entering.ny * sp * dt; e.vx = e.entering.nx * sp; e.vy = e.entering.ny * sp;
      if (MT.inInterior(e.x, e.y, e.r + 2)) e.entering = null;
      A.pose && A.pose(e, dt); return;
    }
    if (e.stun > 0 || MT.CHEATS.freeze) { e.stun = Math.max(0, e.stun - dt); e.vx = e.vy = 0; A.pose && A.pose(e, dt); return; }
    A.update(e, dt, this);
    if (!e.static && !e.dead) {
      e.x += e.vx * dt; e.y += e.vy * dt;
      const push = this.arena.conveyorPush(e); e.x += push * dt;
      // a soft push apart, so crowds don't stack
      this.hash.near(e.x, e.y, 20, o => { if (o === e || o.dead || o.kind === 'seg' || e.kind === 'seg') return; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), m = (e.r + o.r) * .8; if (d > 0 && d < m) { const k = (m - d) / d * .5; e.x += dx * k * .5; e.y += dy * k * .5; } });
      for (const s of this.solids) if (s !== e && !s.dead) { const d = MT.dist(e, s), m = e.r + s.r; if (d < m && d > 0) { e.x = s.x + (e.x - s.x) / d * m; e.y = s.y + (e.y - s.y) / d * m; } }
      if (e.kind !== 'seg') MT.clampInterior(e, e.r);
      const vent = this.arena.ventAt(e.x, e.y); if (vent) this.damage(e, 3 * dt, null, true);
    }
    A.pose && A.pose(e, dt);
  }
  collide(dt) {
    const H = this.hash; H.build(this.enemies.filter(e => !e.dead && !e.entering && !e.leap && !(e.dropT > .3) && !e.A.harmless));
    for (const b of this.pShots.list) {
      if (b.dead || b.grav) continue;
      const owner = this.contestants.find(c => c.slot === b.owner) || null;
      H.near(b.x, b.y, b.r + 14, e => {
        if (b.dead || e.dead) return; if (b.hitIds && b.hitIds.includes(e.id)) return;
        if (Math.hypot(e.x - b.x, e.y - b.y) > e.r + b.r) return;
        if (b.kind === 'rocket') { b.dead = true; this.damage(e, b.dmg, owner); this.explode(b); return; }
        this.damage(e, b.dmg, owner);
        if (b.pierce > 0) { b.pierce--; (b.hitIds = b.hitIds || []).push(e.id); } else b.dead = true;
      });
      if (!b.dead && this.boss) { const hit = this.boss.hitTest(b); if (hit) { if (b.kind === 'rocket') { this.boss.damagePart(hit, b.dmg, owner); this.explode(b); } else this.boss.damagePart(hit, b.dmg, owner); b.dead = true; } }
    }
    // foe bullets against contestants (and the gold records)
    for (const b of this.fShots.list) {
      if (b.dead || b.grav) continue;
      for (const c of this.contestants) {
        if (!c.canBeHit) continue;
        if (c.addons.records > 0 && MT.SMALL_FOE[b.kind]) { for (const o of MT.recordPos(c, this.t)) if (Math.hypot(o[0] - b.x, o[1] - b.y) < 6 + b.r) { b.dead = true; this.event('tink', { x: b.x, y: b.y }, false); break; } if (b.dead) break; }
        const d = Math.hypot(c.x - b.x, c.y - b.y);
        if (d < c.r * .8 + b.r) {
          if (c.iframes) { if (c.addons.shield > 0) { b.dead = true; } continue; }
          if (c.hurt(1, b, this)) { b.dead = true; if (b.kind === 'shell') this.explode(b); break; }
        } else if (d < c.r + b.r + 7 && !b.nearDone) { b.nearDone = true; this.ratings.near(this); }
      }
    }
    // contact, records and shields against enemies
    for (const c of this.contestants) {
      if (c.state !== 'play') continue;
      const rec = c.addons.records > 0 ? MT.recordPos(c, this.t) : null;
      H.near(c.x, c.y, 40, e => {
        if (e.dead) return; const d = Math.hypot(e.x - c.x, e.y - c.y);
        if (rec) for (const o of rec) if (Math.hypot(o[0] - e.x, o[1] - e.y) < e.r + 5) { e.recCd = e.recCd || 0; if (this.t >= e.recCd) { e.recCd = this.t + .15; this.damage(e, 2 * MT.T.dmgMul, c); } }
        if (c.addons.shield > 0 && d < e.r + 14) { e.shCd = e.shCd || 0; if (this.t >= e.shCd) { e.shCd = this.t + .2; this.damage(e, 1, c); } }
        if (e.dead || !e.A.contact || e.kind === 'goon' && !(e.atk && e.atk.phase === 'active') && d > e.r + c.r - 3) return;
        if (d < e.r + c.r - 2 && e.stun <= 0) c.hurt(e.A.contact * MT.T.contactDmg || 0, e, this);
      });
      if (this.boss) this.boss.contact(c, this);
      if (this.arena.ventAt(c.x, c.y)) c.hurt(1, { x: c.x, y: c.y - 1 }, this);
      if (c.state !== 'play') continue;
      for (const p of this.pickups) if (!p.dead && p.z < 14 && Math.hypot(p.x - c.x, p.y - c.y) < c.r + 7) this.collect(c, p);
    }
    // the magnet, once the room is clear
    if (this.cleared) for (const p of this.pickups) { if (!MT.PICKUPS[p.kind].cash) continue; let best = null, bd = 60; for (const c of this.contestants) { if (c.state !== 'play') continue; const d = MT.dist(c, p); if (d < bd) { bd = d; best = c; } } if (best) { const a = MT.ang(p, best); p.x += Math.cos(a) * 110 * dt; p.y += Math.sin(a) * 110 * dt; } }
  }
  // ------------------------------------------------ the room's phases
  phaseStep(dt) {
    const R = this.room;
    switch (this.phase) {
      case 'enter':
        if (this.phaseT >= 1.2) { if (R.boss) { this.setPhase('bossIntro'); this.boss = MT.BOSSES[R.boss].create(this); MT.run && (MT.run.bossesSeen[R.boss] = true); } else this.setPhase('intro'); }
        break;
      case 'intro':
        if (this.phaseT >= (this.intro ? 1.6 : .2)) { this.setPhase('waves'); this.script(MT.runRoom(this, R)); this.event('mash', {}); }
        break;
      case 'waves': {
        if (R.bonus) { if (this.greenDone || this.phaseT >= R.bonus.dur) { this.result = 'bonus'; this.setPhase('done'); } else MT.greenRoomStep(this, dt); break; }
        if (this.allSpawned && this.alive() === 0) this.clearRoom();
        break;
      }
      case 'bossIntro': if (this.boss.introDone) this.setPhase('boss'); break;
      case 'boss': if (this.boss.dead) { this.setPhase('bossDeath'); } break;
      case 'bossDeath': if (this.phaseT >= 3.2) { this.boss = null; this.clearRoom(true); } break;
      case 'clear':
        if (this.phaseT >= 1.6) {
          const exits = this.exitsFor();
          if (!exits.length) { this.result = this.room.boss ? 'boss' : 'end'; this.setPhase('done'); }
          else { for (const [d, dest] of exits) { const room = MT.ROOMS[dest]; this.arena.setExit(d, dest, this.mode === 'session' ? 'NEXT' : room ? room.name : 'NEXT', room ? MT.roomIcon(room) : 'star'); } this.setPhase('exit'); this.event('exits', {}); }
        }
        break;
      case 'exit': {
        this.hurryT += dt;
        if (this.phaseT > 25 && this.hurryT > 6) { this.hurryT = 0; const non = ['N', 'E', 'S', 'W'].filter(d => this.arena.doors[d].state !== 'exit'); this.event('hurry', {}); for (const d of non.slice(0, 2)) this.arena.queueSpawn(d, 'clapbot', 2, .3); }
        for (const c of this.contestants) { if (c.state !== 'play') continue; const d = this.arena.exitHit(c); if (d) { this.exitDir = d; this.exitDest = this.arena.doors[d].dest; this.setPhase('leaving'); this.event('exitChosen', { d, dest: this.exitDest, slot: c.slot }); break; } }
        break;
      }
      case 'leaving': if (this.phaseT >= .8) { this.result = 'exit'; this.setPhase('done'); } break;
      default: break;
    }
  }
  exitsFor() {
    const R = this.room; if (!R.exits) return [];
    return Object.entries(R.exits);
  }
  clearRoom(boss) {
    if (this.cleared) return; this.cleared = true; this.setPhase('clear');
    MT.keyRules.onRoomEnd(this);
    const X = this.ratings.X, fast = R => this.t < (R.par || 999) + 2.4;
    const bonus = Math.round(1000 * this.ep * X * (fast(this.room) ? 1.5 : 1) * MT.T.cashMul);
    for (const c of this.contestants) if (c.state === 'play' || c.state === 'drop') c.addCash(bonus, this);
    for (const b of this.fShots.list) b.life = Math.min(b.life, .25);
    this.event('clear', { bonus, fast: fast(this.room), boss: !!boss });
  }
  // ------------------------------------------------ drawing
  draw(r) {
    const set = this.arena.setId;
    MT.sets.outside(r, set, this);
    this.arena.draw(r, this);
    MT.sets.lights(r, set, this);
    for (const p of this.pickups) p.draw(r, this);
    for (const e of this.enemies) { if (e.dead) continue; if (e.dropT > .3) { r.decal(() => r.groundDisc(e.x, e.y, 8, '#000', .5)); continue; } e.A.draw(r, e); }
    if (this.boss) this.boss.draw(r, this);
    for (const c of this.contestants) { c.draw(r, this); if (c.addons.records > 0 && c.state === 'play') MT.drawRecords(r, c, this.t); }
    this.pShots.draw(r); this.fShots.draw(r);
    // lob telegraphs: a red ring where each tomato will land
    r.decal(() => { for (const b of this.fShots.list) if (b.grav && b.tx !== undefined) r.groundRing(b.tx, b.ty, 10, Math.floor(MT.game.time * 10) % 2 ? '#ff3344' : '#ffcc33', .8); });
    for (const L of this.laserBeams) {
      r.queue((L.x0 + L.x1) / 2, (L.y0 + L.y1) / 2, 14, g => { const a = r.w(L.x0, L.y0, 14), b = r.w(L.x1, L.y1, 14); px.line(g, a[0], a[1], b[0], b[1], '#0a6a8a', 5); px.line(g, a[0], a[1], b[0], b[1], '#2ee6ff', 3); px.line(g, a[0], a[1], b[0], b[1], '#ffffff', 1); }, { emissive: true });
      for (let k = 0; k <= 4; k++) MT.game.lights.add(lerp(L.x0, L.x1, k / 4), lerp(L.y0, L.y1, k / 4), 14, 30, .5, { color: '#2ee6ff' });
    }
    for (const b of this.fShots.list) if (!b.grav && (b.id & 3) === 0) MT.game.lights.add(b.x, b.y, 10, 16, .35, { color: '#ff9a3c' });
  }
};
MT.recordPos = (c, t) => { const a = t * 4.2; return [[c.x + Math.cos(a) * 26, c.y + Math.sin(a) * 26], [c.x + Math.cos(a + Math.PI) * 26, c.y + Math.sin(a + Math.PI) * 26]]; };
MT.drawRecords = (r, c, t) => {
  for (const [x, y] of MT.recordPos(c, t)) r.queue(x, y, 12, g => { const p = r.w(x, y, 12), k = MT.pk(r); px.disc(g, p[0], p[1], 5 * k, '#5a3a00'); px.disc(g, p[0], p[1], 4.2 * k, '#ffcc33'); px.disc(g, p[0], p[1], 1.6 * k, '#1a1a1a'); px.dot(g, p[0] - 2 * k, p[1] - 2 * k, '#ffffff'); }, { emissive: true });
};
MT.roomIcon = room => room.boss ? 'skull' : room.type === 'cash' ? 'cash' : room.type === 'armory' ? 'gun' : room.type === 'hazard' ? 'flame' : room.type === 'key' ? 'key' : 'sword';
MT.greenRoomStep = (W, dt) => {
  W._grT = (W._grT || 0) - dt;
  if (W._grT <= 0) { W._grT = .25; const x = MT.Rr(40, 328, 'drops'), y = MT.Rr(40, 200, 'drops'); W.addPickup(MT.chance(.15) ? 'prize' : MT.Rpick(['bill', 'stack', 'gold', 'case'], 'drops'), x, y, { z: 90 }); }
  W._flashT = (W._flashT || 3) - dt;
  if (W._flashT <= 0) { W._flashT = 3; const p = W.enemies.filter(e => e.kind === 'paparazzi'); if (p.length) { MT.Rpick(p, 'fx').flashT = .3; W.event('papFlash', {}); } }
  if (!W.statueUp && W.phaseT >= 30) { W.statueUp = true; W.addPickup('statue', AR.cx, AR.cy, { placed: true, z: 0, vz: 120 }); W.event('statueRise', {}); }
};
