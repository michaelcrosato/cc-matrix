// ---- the World: everything in one room; the authoritative step, the damage pipeline, kill credit, the room's phases ----
const FOE = {
  orb: { r: 3, color: '#ff9a3c', core: '#fff0a0' }, shard: { r: 2, color: '#ffb030', core: '#fff6c0' }, beam: { r: 2, color: '#ffcc33', core: '#ffffff', long: true },
  coin: { r: 3, color: '#ffcc33', core: '#8a5a08' }, card: { r: 3, color: '#fff7e8', core: '#d02a3a', card: true }, static: { r: 2.5, color: '#c8d0e0', core: '#ffffff', jitter: true },
  gravy: { r: 3, color: '#a0602a', core: '#e0a060' }, butter: { r: 3, color: '#ffe070', core: '#fffbe0' }, shell: { r: 4, color: '#3a3448', core: '#ff3344', shell: true },
  spark: { r: 2.5, color: '#ff9a3c', core: '#ffffff' },
};
MT.FOE = FOE;
let EID = 1, BID = 1;
MT.resetIds = () => { EID = 1; BID = 1; MT.resetPickupIds(); };
class World {
  constructor(o = {}) {
    this.room = o.room; this.mode = o.mode || 'auth'; this.session = !!o.session; this.attract = !!o.attract; this.cosmetic = this.mode === 'mirror';
    this.run = o.run || MT.run;
    this.arena = new Arena(o.set || (o.room && o.room.set) || 'studio', { hazards: (o.room && o.room.hazards) || [] });
    this.contestants = []; this.enemies = []; this.targets = []; this.pickups = []; this.proj = []; this.lobs = []; this.decals = []; this.boss = null;
    this.pShots = new E.Bullets(game, { plane: 'ground', max: 600 }); this.fShots = new E.Bullets(game, { plane: 'ground', max: 700, sparks: true });
    this.hash = new E.SpatialHash(32);
    this.ratings = (this.run && this.run.ratings) || new Ratings();
    this.phase = 'ENTER'; this.phaseT = 0; this.wave = 0; this.wavesSpawned = false; this.script = null; this.cos = []; this.timers = []; this.time = 0; this.lastDt = 1 / 120;
    this.events = []; this.ring = []; this.evSeq = 0; this.outcome = null; this.exitPick = null; this.hurry = 0; this.mk = {}; this.quietFx = false; this.entry = o.entry || 'S';
    this.clearT = 0; this.mimesPlaced = 0; this.mimesKilled = 0; this.keyDropped = false; this.surviveLeft = 0; this.cage = null; this.started = false; this.stats = { kinds: {}, killed: {}, weapons: {}, hazards: {} };
    this.freeze = false;
  }
  // ---------------------------------------------------------------- helpers
  playerCount() { return Math.max(1, this.contestants.length); }
  countedAlive() { let n = 0; for (const e of this.enemies) if (!e.dead && ENEMIES[e.kind].counted && !e.harmless) n++; return n; }
  pendingDelayed() { let n = 0; for (const t of this.timers) if (t.spawn) n++; return n; }
  delayed(t, fn, spawn = false) { this.timers.push({ t, fn, spawn }); }
  event(name, data = {}) { const ev = { name, data, seq: ++this.evSeq, at: this.time }; this.events.push(ev); return ev; }
  shake(n) { if (!this.session) game.shake(n * MT.T.shakeMul); }
  freePoint(minD = 50) {
    for (let k = 0; k < 40; k++) { const x = AR.X0 + 20 + RNG.spawn() * (AR.X1 - AR.X0 - 40), y = AR.Y0 + 20 + RNG.spawn() * (AR.Y1 - AR.Y0 - 40); if (this.contestants.every(c => !c.alive || Math.hypot(c.x - x, c.y - y) >= minD) && !this.arena.map.heightAt(x, y)) return [x, y]; }
    return [AR.CX, AR.CY];
  }
  contestantById(id) { return this.contestants.find(c => c.netId === id); }
  // ---------------------------------------------------------------- spawning
  spawnEnemy(kind, x, y, o = {}) {
    const A = ENEMIES[kind]; if (!A) { if (game) game.fail('spawn', new Error('no enemy kind ' + kind)); return null; }
    const e = { id: EID++, kind, x, y, z: 0, vx: 0, vy: 0, face: Math.PI / 2, hp: A.hp * MT.T.enemyHp, r: A.r, state: 'walk', t: 0, flash: 0, dead: false, stunT: 0, entering: !o.inside && !o.leap && !o.drop && !!o.door, door: o.door || null, alpha: 1 };
    e.maxHp = e.hp;
    if (o.door) { const D = DOORS[o.door]; e.face = Math.atan2(D.ny, D.nx); }
    A.make(this, e, o);
    if (o.key) e.carriesKey = true;
    e.rs = { kind, x, y, z: 0, face: e.face, vx: 0, vy: 0, state: e.state, t: 0, t2: 0, hpPct: 1, flash: 0, alpha: e.alpha };
    this.enemies.push(e);
    this.stats.kinds[kind] = (this.stats.kinds[kind] || 0) + 1;
    if (!o.quiet) this.event('spawn', { kind, id: e.id });
    return e;
  }
  /** a heckler leaping over the wall from the bleachers */
  spawnAudience(kind) {
    const side = RNG.spawn() < .5 ? -1 : 1, sx = side < 0 ? -30 : 398, sy = 40 + RNG.spawn() * 160, tx = side < 0 ? 40 + RNG.spawn() * 60 : 328 - RNG.spawn() * 60, ty = 30 + RNG.spawn() * 180;
    const e = this.spawnEnemy(kind, sx, sy, { leap: true }); if (!e) return;
    e.leap = { sx, sy, tx, ty, t: 0, T: .7 }; e.z = 20;
    this.event('leap', { id: e.id });
  }
  /** from the ceiling: a shadow telegraphs for .6 s, then it falls */
  spawnDrop(kind) {
    const [x, y] = this.freePoint(50); const e = this.spawnEnemy(kind, x, y, { drop: true }); if (!e) return;
    e.dropT = 0; e.z = 90;
  }
  addPickup(p) { this.pickups.push(p); return p; }
  addTarget(kind, x, y, o = {}) { const A = TARGETS[kind]; const t = Object.assign({ id: EID++, kind, x, y, z: 0, hp: A.hp, maxHp: A.hp, r: A.r, dead: false, flash: 0 }, o); this.targets.push(t); if (kind !== 'cage') try { t.solid = this.arena.map.solid(A.shape, x, y, 0, { facing: Math.PI / 2 }); } catch (e) { /* none */ } return t; }
  // ---------------------------------------------------------------- foe projectiles
  fireFoe(kind, x, y, ang, speed, o = {}) {
    const F = FOE[kind] || FOE.orb;
    const b = this.fShots.fire({ x, y, z: o.z || 10, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: o.r || F.r, life: o.life || 4.5, dmg: o.dmg || 1, team: 'f', color: F.color, core: F.core, data: { id: BID++, kind, src: o.src } });
    if (b && F.shell) b.onWall = q => this.explodeFoe(q.x, q.y, 16, 1, 'shell', q.data.id);
    return b;
  }
  /** a lob (tomato, tot) that lands at (tx, ty) after T seconds, its landing ringed in red the whole way */
  lob(kind, x, y, z, tx, ty, T, o = {}) {
    const a = E.arc({ x, y, z }, { x: tx, y: ty, z: 0 }, 360, { time: T });
    this.lobs.push({ id: BID++, kind, x, y, z, vx: a.vx, vy: a.vy, vz: a.vz, g: 360, tx, ty, t: 0, T, src: o.id });
  }
  // ---------------------------------------------------------------- the damage pipeline
  damageEnemy(e, dmg, src = {}) {
    if (e.dead || e.entering || e.leap || (e.dropT !== undefined && e.dropT < .9) || ENEMIES[e.kind].harmless) return false;
    if (MT.cheats.oneHit && !this.session) dmg = 1e6;
    const A = ENEMIES[e.kind]; if (A.dmgMul) dmg *= A.dmgMul(e);
    if (src.owner !== undefined && src.owner !== null) { const ow = this.contestantById(src.owner); if (ow && ow.dmgMul) dmg *= ow.dmgMul; }
    e.hp -= dmg; e.flash = .08;
    if (!src.beam) { const a = src.x !== undefined ? Math.atan2(e.y - src.y, e.x - src.x) : 0; if (!A.big && !A.child && A.speed) { e.x += Math.cos(a) * 1.5; e.y += Math.sin(a) * 1.5; } if (game.particles && !this.quietFx) game.particles.sparks(e.x, e.y, 10, 2, a, { color: '#fff0a0' }); }
    if (e.hp <= 0) this.killEnemy(e, src);
    return true;
  }
  killEnemy(e, src = {}) {
    if (e.dead) return; e.dead = true;
    const A = ENEMIES[e.kind], owner = src.owner !== undefined && src.owner !== null ? this.contestantById(src.owner) : null;
    this.stats.killed[e.kind] = (this.stats.killed[e.kind] || 0) + 1;
    if (!src.self || src.w === 'fuse') {
      if (owner && !src.noCash) { this.credit(owner, A.cash, { at: e, quiet: A.cash < 1000 }); owner.pr.kills++; }
      let gain = A.rat;
      if (owner) { const m = this.mk[owner.netId] || (this.mk[owner.netId] = { n: 0, t: -1 }); if (this.time - m.t < .4) m.n++; else m.n = 1; m.t = this.time; if (m.n > 2) { gain += 2; if (m.n === 5) this.event('multikill', { c: owner, n: m.n }); } }
      if (!src.noCash) this.ratings.add(gain, this);
    }
    this.event('kill', { kind: e.kind, x: e.x, y: e.y, id: e.id, big: !!A.big, owner: owner && owner.netId, w: src.w });
    if (!src.noCash && !src.self) MT.rollDrops(this, e);
    if (e.carriesKey) this.dropKey(e.x, e.y);
    if (e.kind === 'mime' && e.placed) { this.mimesKilled++; if (this.room && this.room.key && this.room.key.rule === 'mimes' && this.mimesKilled >= this.mimesPlaced) this.dropKey(e.x, e.y); }
    if (A.onDeath) A.onDeath(e, this);
  }
  damageTarget(t, dmg, src = {}) {
    if (t.dead || TARGETS[t.kind].invulnerable) return;
    t.hp -= dmg; t.flash = .08;
    if (t.hp <= 0) {
      t.dead = true; const owner = src.owner !== undefined ? this.contestantById(src.owner) : null;
      if (t.solid) { const i = this.arena.map.solids.indexOf(t.solid); if (i >= 0) this.arena.map.solids.splice(i, 1); }
      this.event('targetBroken', { kind: t.kind, x: t.x, y: t.y });
      if (owner) this.ratings.add(TARGETS[t.kind].rat, this);
      if (t.kind === 'crate') {
        const n = 3 + Math.floor(RNG.drops() * 3);
        for (let i = 0; i < n; i++) { const a = RNG.drops() * TAU, sp = 40 + RNG.drops() * 40; this.addPickup(MT.makePickup(rpick(RNG.drops, ['bill', 'bill', 'stack', 'gold']), t.x, t.y, { z: 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 90 })); }
        if (RNG.drops() < .5) this.addPickup(MT.makePickup('prize', t.x, t.y, { z: 4, vz: 110 }));
        if (t.key) this.dropKey(t.x, t.y);
      }
      if (t.kind === 'lock') { if (owner) this.credit(owner, TARGETS.lock.cash, { at: t }); if (this.targets.filter(q => q.kind === 'lock' && !q.dead).length === 0) this.openVault(); }
    }
  }
  damageBossPart(p, dmg, src = {}) { if (this.boss) this.boss.damage(this, p, dmg, src); }
  /** a player explosion: rockets, popcorn, a dolly tank's death (hurtsAll: the tank's blast hurts enemies too) */
  explode(x, y, r, dmg, owner, w, small, tankBlast) {
    if (!this.quietFx) { if (small) { if (game.particles) { game.particles.bits(x, y, 4, 8, ['#fff0a0', '#ffffff', '#ffcc33']); game.particles.ring(x, y, 2, r, '#fff0a0', .25); } MT.sfx('pop'); } else { if (game.particles) game.particles.explosion(x, y, 6, r / 24, { shake: 0, freeze: false }); MT.sfx('boom'); this.shake(2); if (this.decals.length < 220) this.decals.push({ kind: 'scorch', x, y, r: r * .6, t: 0, life: 8 }); } }
    if (this.cosmetic || !(dmg > 0)) return;
    for (const e of this.enemies) if (!e.dead && dist2(e, { x, y }) < (r + e.r) ** 2) this.damageEnemy(e, dmg, { owner, w, x, y });
    if (this.boss) for (const p of this.boss.parts) if (p.alive && this.boss.partHittable(p)) { const q = this.boss.partPos(p); if (dist2(q, { x, y }) < (r + p.r) ** 2) this.damageBossPart(p, dmg, { owner, w }); }
    for (const t of this.targets) if (!t.dead && dist2(t, { x, y }) < (r + t.r) ** 2) this.damageTarget(t, dmg, { owner, w });
    if (tankBlast) for (const c of this.contestants) if (dist2(c, { x, y }) < (r + c.r) ** 2) this.hurtContestant(c, 1, { kind: 'tank', x, y });
  }
  /** a foe's blast (a mime, a shell, a tater tot): hurts contestants in range */
  explodeFoe(x, y, r, dmg, kind, id) {
    if (!this.quietFx && game.particles) { game.particles.explosion(x, y, 4, r / 30, { shake: 0, freeze: false, debris: false }); game.particles.bits(x, y, 6, 10, PALETTE[kind] || PALETTE.mime); }
    if (!this.quietFx) { MT.sfx(kind === 'mime' ? 'pfft' : 'shellboom'); this.shake(2); }
    this.event('blast', { x, y, r, kind });
    for (const c of this.contestants) if (c.ctl !== 'remote' && dist2(c, { x, y }) < (r + c.r) ** 2) this.hurtContestant(c, dmg, { kind, id, x, y });
  }
  hurtContestant(c, dmg, src = {}) {
    if (!c.targetable || c.invulnerable || c.ctl === 'remote' || c.ctl === 'mirror') return false;
    if (c.boatT > 0) c.boatHit = true;
    c.hp -= dmg; c.invuln = MT.T.invulnTime; c.hurtT = 1.0; c.hurtCount++;
    if (src.x !== undefined) { const a = Math.atan2(c.y - src.y, c.x - src.x); c.body.push(Math.cos(a) * 120, Math.sin(a) * 120, 0); }
    this.ratings.lose(12);
    if (!this.session) game.freeze(.03);
    if (c.input && c.input.rumble) c.input.rumble(.5, .15);
    if (!this.quietFx) { if (this.session) { game.particles.impact(c.x, c.y, 14, 7, '#ffe070'); game.particles.sparks(c.x, c.y, 14, 8, null, { color: '#ffb85c' }); } else game.hitFx(c.x, c.y, 14, { power: .6, damage: dmg, sound: false, rumble: false }); }
    this.event('hurt', { c, dmg, kind: src.kind, id: src.id });
    if (c.hp <= 0) this.killContestant(c);
    return true;
  }
  killContestant(c) {
    c.state = 'dead'; c.deadT = 2; c.hp = 0; c.pr.deaths++; c.boatT = 0;
    c.weapon = 'blaster'; c.wT = 0; for (const k in c.addons) c.addons[k] = 0;
    if (this.session) { c.pr.cash = Math.max(0, c.pr.cash - 2500); } else c.pr.lives = Math.max(0, c.pr.lives - 1);
    this.ratings.lose(25);
    if (game.particles && !this.quietFx) { game.particles.bits(c.x, c.y, 10, 30, [SLOT_COLORS[c.slot], '#ffffff', '#ffcc33']); game.particles.ring(c.x, c.y, 4, 30, SLOT_COLORS[c.slot], .4); }
    this.event('died', { c });
  }
  /** two seconds after a death: drop back in on a cable, or out of lives */
  afterDeath(c) {
    if (this.session || c.pr.lives > 0) { const D = DOORS[this.entry] || DOORS.S, [x, y] = [D.x + D.nx * 50 + (c.slot - 1.5) * 14, D.y + D.ny * 50]; c.dropIn(clamp(x, AR.X0 + 10, AR.X1 - 10), clamp(y, AR.Y0 + 10, AR.Y1 - 10)); }
    else { c.state = 'out'; this.event('out', { c }); }
  }
  /** a contestant out of lives continues on their own: full lives, half their winnings */
  continueContestant(c) { c.pr.lives = startLivesNow(); c.pr.cash = Math.floor(c.pr.cash / 2); c.pr.continues++; c.state = 'dead'; c.deadT = .1; this.event('continued', { c }); }
  allOut() { return this.contestants.length > 0 && this.contestants.every(c => c.state === 'out'); }
  // ---------------------------------------------------------------- money, the show
  credit(c, amount, o = {}) {
    if (!c || !(amount > 0)) return 0;
    const v = Math.round(amount * this.ratings.X * MT.T.cashMul * (this.room && this.room.cashRoom ? 1.5 : 1));
    c.pr.cash += v; c.pr.epCash = (c.pr.epCash || 0) + v;
    if (!this.attract && !this.session) { while (c.pr.nextLife < EXTRA_LIVES.length && c.pr.cash >= EXTRA_LIVES[c.pr.nextLife]) { c.pr.nextLife++; c.pr.lives++; this.event('extraLife', { c }); } }
    if (o.at && !o.quiet && game.particles && !this.quietFx) game.particles.text(o.at.x, o.at.y, 16, '+' + money(v), SLOT_COLORS[c.slot], { scale: 1 });
    return v;
  }
  collect(c, p) {
    p.dead = true; const K = PICKUPS[p.kind];
    if (K.cashy) { this.credit(c, K.cash, { at: p }); this.event('cash', { c, v: K.cash, kind: p.kind }); return; }
    if (p.kind === 'capsule') { MT.giveItem(this, c, p.wpn); this.stats.weapons[p.wpn] = (this.stats.weapons[p.wpn] || 0) + 1; this.event('powerup', { c, w: p.wpn }); return; }
    if (p.kind === 'bomb') { MT.giveItem(this, c, 'bomb'); this.event('powerup', { c, w: 'bomb' }); return; }
    if (p.kind === 'life') { MT.giveItem(this, c, 'life'); this.event('extraLife', { c }); return; }
    if (p.kind === 'prize') {
      const pz = MT.nextPrize(this);
      const v = this.credit(c, pz.value, { at: p }); c.pr.prizes.push({ name: pz.name, value: v, icon: pz.icon, line: pz.line });
      this.ratings.add(2, this); this.event('prize', { c, prize: pz, v }); return;
    }
    if (p.kind === 'key') {
      if (this.session) { this.credit(c, 10000, { at: p }); this.event('key', { c, n: 0, session: true }); return; }
      this.run.keys = (this.run.keys || 0) + 1; this.run.keyRooms = this.run.keyRooms || []; if (this.room) this.run.keyRooms.push(this.room.id);
      this.ratings.add(5, this); this.event('key', { c, n: this.run.keys }); return;
    }
    if (p.kind === 'statue') { const v = this.credit(c, 100000, { at: p }); c.pr.prizes.push({ name: MT.TEXT.grandPrize.name, value: v, icon: 'network', line: MT.TEXT.grandPrize.line }); this.event('statue', { c, v }); this.bonusDone = true; }
  }
  dropKey(x, y) {
    if (this.keyDropped) return; this.keyDropped = true;
    const p = this.addPickup(MT.makePickup('key', clamp(x, AR.X0 + 10, AR.X1 - 10), clamp(y, AR.Y0 + 10, AR.Y1 - 10), { z: 6, vz: 120, placed: true }));
    this.event('keyDrop', { x: p.x, y: p.y });
    return p;
  }
  openCage() { if (!this.cage || this.cage.opened) return; this.cage.opened = true; this.event('cage', {}); const t = this.targets.find(q => q.kind === 'cage'); if (t) t.dead = true; }
  openVault() { this.event('vault', {}); this.dropKey(120, 40); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (RNG.drops() - .5) * 2, sp = 50 + RNG.drops() * 60; this.addPickup(MT.makePickup(rpick(RNG.drops, ['stack', 'gold', 'gold', 'case']), 80 + RNG.drops() * 60, 34, { z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 80 })); } this.vaultOpen = true; }
  startPrime() {
    const Rt = this.ratings; Rt.prime = MT.T.primeTime; Rt.primeCount++;
    this.event('prime', {});
    if (this.cosmetic) return;
    for (let i = 0; i < 3; i++) { const side = i % 2 ? 1 : -1, sx = side < 0 ? -40 : 408, sy = 60 + RNG.drops() * 120, [tx, ty] = this.freePoint(20), a = E.arc({ x: sx, y: sy, z: 30 }, { x: tx, y: ty, z: 0 }, 400, { time: 1.1 }); this.addPickup(MT.makePickup('capsule', sx, sy, { z: 30, vx: a.vx, vy: a.vy, vz: a.vz })); }
  }
  /** the producers' stunt when the ratings flatline: the episode's stunt kind from a random door */
  stunt() {
    const ep = MT.EPISODES[this.room && this.room.ep] || MT.EPISODES[1], d = rpick(RNG.spawn, DOOR_IDS);
    for (const [kind, n] of ep.stunt) this.arena.queueSpawn(d, kind, n, .2);
    this.ratings.add(15, this); this.event('stunt', {});
  }
  showstopper(c) {
    if (!MT.cheats.infBombs && !c.infBombs) c.pr.bombs = Math.max(0, c.pr.bombs - 1);
    if (!this.quietFx) { game.flash('#ffffff', .12); MT.sfx('flashbulb'); this.shake(6); }
    if (game.particles && !this.quietFx) { game.particles.ring(c.x, c.y, 4, 260, '#ffffff', .5); for (let i = 0; i < 24; i++) game.particles.glints(AR.X0 + RNG.fx() * 336, AR.Y0 + RNG.fx() * 208, 8, 1, '#fff6c0', 6); }
    this.event('bomb', { c });
    if (this.cosmetic) return;
    for (const e of this.enemies) if (!e.dead && !e.entering && !ENEMIES[e.kind].harmless) { e.stunT = 1; this.damageEnemy(e, 25, { owner: c.netId, w: 'bomb', x: c.x, y: c.y }); }
    if (this.boss) for (const p of this.boss.parts) if (p.alive && this.boss.partHittable(p)) this.damageBossPart(p, 30, { owner: c.netId, w: 'bomb' });
    this.fShots.clear(); this.lobs.length = 0;
    this.ratings.add(8, this);
    if (!this.session) game.freeze(.08);
  }
  showboatDone(c) {
    let n = 0, m = 0; for (const e of this.enemies) if (!e.dead && ENEMIES[e.kind].counted) { const d = dist(e, c); if (d < 64) n++; if (d < 32) m++; }
    if (c.boatHit) { this.event('boatFail', { c }); return; }
    const g = Math.min(30, 4 + 3 * n + 3 * m), got = this.ratings.add(g, this); c.pr.boatGain += got;
    this.event('showboat', { c, gain: Math.round(got) });
  }
  // ---------------------------------------------------------------- the authoritative step
  step(dt) {
    this.lastDt = dt; this.time += dt; this.phaseT += dt;
    for (const t of this.timers) { t.t -= dt; if (t.t <= 0) { t.dead = true; t.fn(); } }
    E.prune(this.timers, t => t.dead);
    // 1-2: contestants
    for (const c of this.contestants) {
      let intent = null;
      if (c.state === 'play') {
        if (c.ctl === 'bot' || (c.ctl === 'local' && MT.cheats.autopilot && c.slot === 0 && !this.session)) intent = MT.bot.intent(this, c, dt);
        else if (c.ctl === 'local' && !MT.overlay.open && !(MT.net && MT.net.overlayOpen)) intent = MT.intentFrom(c.input, c);
        if (intent && this.aimAssist(c, intent)) { /* nudged */ }
      }
      if (c.ctl === 'remote' || c.ctl === 'mirror') { if (MT.net) MT.net.stepRemote(this, c, dt); }
      else c.step(dt, this, intent);
    }
    // 3: enemies
    const fr = MT.cheats.freeze && !this.session;
    this.hash.build(this.enemies.filter(e => !e.dead && !e.entering && !ENEMIES[e.kind].child));
    for (const e of this.enemies) { if (e.dead) continue; e.t += dt; e.flash = Math.max(0, e.flash - dt); this.stepEnemy(e, dt, fr); }
    // 4: the boss
    if (this.boss && !fr) this.boss.step(this, dt);
    // 5: projectiles
    this.pShots.update(dt, this.arena.map);
    this.fShots.update(dt, this.arena.map);
    MT.stepProjectiles(this, dt);
    this.stepLobs(dt);
    // 6: collisions
    this.collide(dt);
    MT.stepPickups(this, dt);
    this.stepHazards(dt);
    // 7: the dead go; ratings
    E.prune(this.enemies, e => e.dead);
    E.prune(this.targets, t => t.dead && t.kind !== 'cage');
    for (const d of this.decals) d.t += dt; E.prune(this.decals, d => d.t > d.life);
    const playing = this.phase === 'WAVES' || this.phase === 'BOSS';
    if (playing || this.phase === 'CLEAR' || this.phase === 'EXIT') this.ratings.step(dt, this, this.phase === 'WAVES');
    // 8: the room's script, doors, phases
    if (this.script && !fr) this.script.step(dt);
    for (const co of this.cos) co.step(dt); E.prune(this.cos, co => co.done);
    this.arena.update(dt, (kind, x, y, door, extra) => this.spawnEnemy(kind, x, y, Object.assign({ door }, extra || {})));
    this.stepPhase(dt);
    // 11: rigs
    if (!MT.cfg.skipRigs) { for (const c of this.contestants) c.animate(dt); for (const e of this.enemies) MT.animateEnemy(e, dt); if (this.boss) this.boss.animate(dt); }
    for (const c of this.contestants) c.syncRs();
  }
  aimAssist(c, it) {
    if (!it.aim && it.aim !== 0) return false;
    if (it.aimSrc !== 'pad' || game.settings.aimAssist === false) return false;
    let best = null, bd = 170;
    for (const e of this.enemies) { if (e.dead || e.entering || !ENEMIES[e.kind].counted) continue; const d = dist(e, c); if (d > bd) continue; const da = Math.abs(angDiff(it.aim, angTo(c, e))); if (da < .175) { bd = d; best = e; } }
    if (best) { it.aim = it.aim + angDiff(it.aim, angTo(c, best)) * .5; return true; }
    return false;
  }
  stepEnemy(e, dt, frozen) {
    const A = ENEMIES[e.kind];
    if (e.leap) { const L = e.leap; L.t += dt; const k = clamp(L.t / L.T, 0, 1); e.x = lerp(L.sx, L.tx, k); e.y = lerp(L.sy, L.ty, k); e.z = 20 + Math.sin(k * Math.PI) * 40 - k * 20; if (k >= 1) { e.leap = null; e.z = 0; } this.syncEnemy(e); return; }
    if (e.dropT !== undefined && e.dropT < .9) { e.dropT += dt; e.z = e.dropT < .6 ? 90 : 90 * (1 - (e.dropT - .6) / .3); if (e.dropT >= .9) { e.z = 0; if (!this.quietFx && game.particles) game.particles.dust(e.x, e.y, 0, 8); MT.sfx('land', { vol: .5 }); } this.syncEnemy(e); return; }
    if (e.entering) {
      const D = DOORS[e.door], sp = Math.max(40, (A.speed || 40)) * MT.T.enemySpeed;
      e.x += D.nx * sp * dt; e.y += D.ny * sp * dt; e.face = Math.atan2(D.ny, D.nx); e.vx = D.nx * sp; e.vy = D.ny * sp;
      if (inInterior(e.x, e.y, e.r + 2)) e.entering = false;
      if (A.after) A.after(e, dt, this);
      this.syncEnemy(e); return;
    }
    if (e.stunT > 0) { e.stunT -= dt; e.vx = e.vy = 0; this.syncEnemy(e); return; }
    if (frozen) { e.vx = e.vy = 0; this.syncEnemy(e); return; }
    A.update(e, dt, this);
    if (!A.child) {
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (A.speed && !A.big) this.hash.near(e.x, e.y, 12, o => { if (o === e || o.dead) return; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || .01, ov = (e.r + o.r) * .8 - d; if (ov > 0) { e.x += dx / d * ov * .3; e.y += dy / d * ov * .3; } });
      if (!e.noCollide) this.arena.map.collide(e);
      clampInterior(e, e.r * .6);
    }
    if (A.after) A.after(e, dt, this);
    this.syncEnemy(e);
  }
  syncEnemy(e) {
    const s = e.rs; s.x = e.x; s.y = e.y; s.z = e.z; s.face = e.face; s.vx = e.vx; s.vy = e.vy; s.state = e.state; s.t = e.t; s.flash = e.flash; s.alpha = e.alpha;
    s.hpPct = clamp(e.hp / e.maxHp, 0, 1); s.t2 = e.fuse || e.chargeT || e.tele || 0; s.turret = e.turret; s.recoil = e.recoil; s.tread = e.tread; s.flashT = e.flashT;
  }
  stepLobs(dt) {
    for (const L of this.lobs) {
      L.t += dt; L.vz -= L.g * dt; L.x += L.vx * dt; L.y += L.vy * dt; L.z += L.vz * dt;
      if (L.z <= 0) {
        L.dead = true;
        if (L.kind === 'tomato') {
          this.decals.push({ kind: 'splat', x: L.x, y: L.y, r: 14, t: 0, life: 6, seed: L.id });
          if (!this.quietFx) { MT.sfx('splat'); if (game.particles) game.particles.bits(L.x, L.y, 2, 10, ['#d02a3a', '#ff5a3a', '#8a1020']); }
          for (const c of this.contestants) if (c.ctl !== 'remote' && dist2(c, L) < (10 + c.r) ** 2) this.hurtContestant(c, 1, { kind: 'tomato', id: L.id, x: L.x, y: L.y });
        } else if (L.kind === 'tot') { for (let i = 0; i < 6; i++) this.fireFoe('shard', L.x, L.y, i / 6 * TAU + L.id, bulletSpd(90), { life: 1.4 }); if (!this.quietFx) MT.sfx('pop'); }
      }
    }
    E.prune(this.lobs, L => L.dead);
  }
  collide(dt) {
    const W = this;
    // player shots hit enemies, boss parts, targets
    if (!this.cosmetic) {
      this.pShots.hit(this.enemies.filter(e => !e.dead && !e.entering && !e.leap && !(e.dropT !== undefined && e.dropT < .9) && !ENEMIES[e.kind].harmless), (b, e) => { W.damageEnemy(e, b.dmg, { owner: b.data.owner, w: b.data.w, x: b.x - b.vx * .01, y: b.y - b.vy * .01 }); if (b.data.pierceLeft !== undefined && --b.data.pierceLeft < 0) b.dead = true; }, 'p');
      if (this.boss) { const parts = this.boss.hitList(); this.pShots.hit(parts, (b, q) => { W.damageBossPart(q.part, b.dmg, { owner: b.data.owner, w: b.data.w }); }, 'p'); }
      if (this.targets.length) this.pShots.hit(this.targets.filter(t => !t.dead), (b, t) => { if (TARGETS[t.kind].invulnerable) { if (!this.quietFx) MT.sfx('tink'); return; } W.damageTarget(t, b.dmg, { owner: b.data.owner, w: b.data.w }); }, 'p');
    } else {   // a client's cosmetic shots die on what they touch (a spark)
      this.pShots.hit(this.enemies.filter(e => !e.dead), (b) => { if (game.particles) game.particles.sparks(b.x, b.y, 10, 2, null, { color: '#fff0a0' }); }, 'p');
      if (this.boss) this.pShots.hit(this.boss.hitList(), () => {}, 'p');
    }
    // foe shots and contact hit the contestants this copy simulates
    const mine = this.contestants.filter(c => c.targetable && c.ctl !== 'remote' && c.ctl !== 'mirror');
    if (mine.length) {
      this.fShots.hit(mine, (b, c) => {
        if (c.invulnerable) { if (c.addons.shield > 0 && game.particles) game.particles.sparks(b.x, b.y, 10, 3, null, { color: '#2ee6ff' }); return; }
        if (b.data.kind === 'shell') this.explodeFoe(b.x, b.y, 16, 1, 'shell', b.data.id); else W.hurtContestant(c, b.dmg, { kind: b.data.kind, id: b.data.id, x: b.x, y: b.y });
      }, 'f');
      for (const b of this.fShots.list) {   // near misses: a foe shot that passes close without hitting
        if (b.dead) continue;
        for (const c of mine) { const d2 = dist2(b, c), R = c.r + 7 + b.r; if (d2 < R * R && !(b.near && b.near.has(c.cid))) { (b.near || (b.near = new Set())).add(c.cid); if (!c.invulnerable) { const g = this.ratings.near(this); if (g) this.event('nearMiss', { c }); } } }
      }
      for (const e of this.enemies) {
        const A = ENEMIES[e.kind]; if (e.dead || e.entering || e.leap || !A.contact || e.stunT > 0 || (e.dropT !== undefined && e.dropT < .9)) continue;
        for (const c of mine) if (dist2(e, c) < (e.r + c.r - 2) ** 2) {
          if (c.addons.shield > 0) { e.shieldT = (e.shieldT || 0) - dt; if (e.shieldT <= 0) { e.shieldT = .2; this.damageEnemy(e, 1, { owner: c.netId, w: 'shield', x: c.x, y: c.y }); } continue; }
          const dmg = A.contact * MT.T.contactDmg; if (dmg > 0) this.hurtContestant(c, dmg, { kind: e.kind, id: e.id, x: e.x, y: e.y });
        }
      }
    }
    // shells explode on walls; the dolly tank's shots at a wall
    for (const b of this.fShots.list) if (b.data.kind === 'shell' && b.t >= b.life - .02) this.explodeFoe(b.x, b.y, 16, 1, 'shell', b.data.id);
    // gold records: orbiting discs that cut enemies and eat small foe shots
    for (const c of this.contestants) {
      if (!(c.addons.records > 0) || !c.targetable) continue;
      for (let i = 0; i < 2; i++) {
        const a = c.recA + i * Math.PI, x = c.x + Math.cos(a) * 26, y = c.y + Math.sin(a) * 26;
        if (!this.cosmetic) for (const e of this.enemies) { if (e.dead || e.entering) continue; if ((e.x - x) ** 2 + (e.y - y) ** 2 < (e.r + 5) ** 2) { const k = e.id * 2 + i, last = c.recHit.get(k) || -9; if (this.time - last >= .15) { c.recHit.set(k, this.time); this.damageEnemy(e, 2 * MT.T.dmgMul, { owner: c.netId, w: 'records', x, y }); } } }
        for (const b of this.fShots.list) if (!b.dead && b.data.kind !== 'shell' && (b.x - x) ** 2 + (b.y - y) ** 2 < 36) { b.dead = true; if (game.particles) game.particles.sparks(b.x, b.y, 10, 2, null, { color: '#ffcc33' }); }
      }
    }
  }
  stepHazards(dt) {
    const h = this.arena.pyro();
    if (h) for (const v of h.vents) if (v.state === 'fire') {
      if (this.phase === 'WAVES') this.stats.hazards.pyro = 1;
      for (const c of this.contestants) if (c.ctl !== 'remote' && c.ctl !== 'mirror' && !v.hit.has(c.cid) && dist2(c, v) < (12 + c.r) ** 2) { v.hit.add(c.cid); this.hurtContestant(c, 1, { kind: 'pyro', x: v.x, y: v.y }); this.stats.hazards.pyro = 1; }
      if (!this.cosmetic) for (const e of this.enemies) if (!e.dead && !e.entering && dist2(e, v) < (12 + e.r) ** 2) this.damageEnemy(e, 3 * dt, { owner: null, w: 'pyro', beam: true });
    }
    if (this.arena.hazards.some(q => q.kind === 'conveyor')) for (const c of this.contestants) if (this.arena.beltAt(c.x, c.y)) this.stats.hazards.conveyor = 1;
    for (const d of this.decals) if (d.kind === 'splat') for (const c of this.contestants) if (dist2(c, d) < d.r * d.r) c.slowT = .1;
  }
  // ---------------------------------------------------------------- the room's phases
  setPhase(p) { this.phase = p; this.phaseT = 0; this.event('phase', { p }); }
  /** begin the room: contestants walk in from the entry door */
  begin() {
    this.started = true;
    const room = this.cosmetic ? {} : (this.room || {});
    for (const [kind, cx, cy] of room.place || []) { const [x, y] = cellW(cx, cy); const e = this.spawnEnemy(kind, x, y, { inside: true, quiet: true }); if (e && kind === 'mime') { e.placed = true; this.mimesPlaced++; } }
    if (room.crates) { const keyIdx = room.key && room.key.rule === 'crate' ? Math.floor(RNG.spawn() * room.crates.length) : -1; room.crates.forEach(([cx, cy], i) => { const [x, y] = cellW(cx, cy); this.addTarget('crate', x, y, { key: i === keyIdx }); }); }
    if (room.locks) for (const [cx, cy] of room.locks) { const [x] = cellW(cx, cy); this.addTarget('lock', x, 26); }
    if (room.key && room.key.rule === 'survive') { this.cage = { x: AR.CX, y: AR.CY, opened: false }; this.arena.cage = { x: AR.CX, y: AR.CY, h: 1 }; this.addTarget('cage', AR.CX, AR.CY); this.addPickup(MT.makePickup('key', AR.CX, AR.CY, { placed: true, locked: () => this.cage && !this.cage.opened })); this.keyDropped = true; }
    if (room.key && room.key.rule === 'belt') { const [x, y] = cellW(room.key.at[0], room.key.at[1]); this.addPickup(MT.makePickup('key', x, y, { placed: true, belt: true })); this.keyDropped = true; }
    if (room.key && room.key.rule === 'place') { const [x, y] = cellW(room.key.at[0], room.key.at[1]); this.addPickup(MT.makePickup('key', x, y, { placed: true })); this.keyDropped = true; }
    if (this.session && room.key && !['mimes', 'carrier', 'crate'].includes(room.key.rule)) { /* keys still appear in the lightning round */ }
    this.arena.entry(this.entry);
    const n = this.contestants.length;
    this.contestants.forEach((c, i) => { if (c.state === 'out') return; c.walkIn(this.entry, i, n); });
    this.setPhase('ENTER');
  }
  stepPhase(dt) {
    const room = this.room || {};
    switch (this.phase) {
      case 'ENTER': if (this.phaseT >= 1.2) { this.setPhase(room.type === 'boss' ? 'BOSS_INTRO' : room.type === 'bonus' ? 'BONUS' : 'INTRO'); if (room.type === 'boss') MT.BOSSES[room.boss].enter(this); if (room.type === 'bonus') this.beginBonus(); } break;
      case 'INTRO': if (this.phaseT >= (this.attract ? .2 : 1.6)) { this.setPhase('WAVES'); this.script = new Co(MT.roomScript(this, room)); } break;
      case 'WAVES':
        if (this.wavesSpawned && this.countedAlive() === 0 && this.arena.pendingSpawns() === 0 && this.pendingDelayed() === 0) this.roomClear();
        break;
      case 'BOSS_INTRO': if (this.boss && this.boss.introDone) this.setPhase('BOSS'); break;
      case 'BOSS': if (this.boss && this.boss.dead) { this.setPhase('BOSS_DEATH'); } break;
      case 'BOSS_DEATH': if (this.phaseT >= 3) this.roomClear(); break;
      case 'BONUS': this.stepBonus(dt); break;
      case 'CLEAR': if (this.phaseT >= 1.6) { if (room.type === 'boss' || room.type === 'bonus' || room.final) { this.outcome = { done: true }; this.setPhase('DONE'); } else this.openExits(); } break;
      case 'EXIT': this.stepExit(dt); break;
    }
  }
  roomClear() {
    const room = this.room || {};
    this.clearT = this.time;
    const fast = room.par && this.time < room.par + 4;
    for (const c of this.contestants) if (c.alive) this.credit(c, 1000 * (room.ep || 1) * (fast ? 1.5 : 1), {});
    for (const b of this.fShots.list) b.life = Math.min(b.life, b.t + .3);
    this.lobs.length = 0;
    if (room.key && room.key.rule === 'final' && !this.session) { this.dropKey(AR.CX, AR.CY); this.event('keyRise', {}); }
    this.event('clear', { fast, room: room.id });
    this.setPhase('CLEAR');
  }
  openExits() {
    const room = this.room || {};
    this.setPhase('EXIT'); this.hurry = 0;
    const exits = room.exits || {};
    for (const d in exits) { const to = MT.ROOMS[exits[d]]; if (!to) continue; this.arena.setExit(d, { name: room.lightning ? 'NEXT' : to.name, icon: MT.roomIcon(to), key: !!(to.key && !room.lightning && !(this.run.keyRooms || []).includes(to.id)), room: exits[d] }); }
    this.event('exits', {});
  }
  stepExit(dt) {
    this.hurry += dt;
    if (this.hurry > 25 && Math.floor((this.hurry - dt - 25) / 6) !== Math.floor((this.hurry - 25) / 6)) { this.event('hurry', {}); const ds = DOOR_IDS.filter(d => !this.arena.doors[d].isExit); for (let i = 0; i < 4; i++) this.arena.queueSpawn(ds[i % ds.length], 'clapbot', 1, .2); }
    if (!this.exitPick) {
      for (const c of this.contestants) { if (!c.targetable) continue; const d = this.arena.inExit(c); if (d) { this.chooseExit(d, c); break; } }
    } else {
      this.exitPick.t += dt;
      if (this.exitPick.t >= .8 && !this.outcome) { this.outcome = { exit: this.exitPick.door, to: this.arena.doors[this.exitPick.door].target }; this.setPhase('DONE'); }
    }
  }
  chooseExit(d, c) {
    if (this.exitPick || !this.arena.doors[d] || this.arena.doors[d].state !== 'exit') return false;
    this.exitPick = { door: d, t: 0, by: c && c.netId };
    for (const q of this.contestants) if (q.alive) { q.state = 'exit'; q.exitTo = d; }
    this.event('exitPicked', { door: d, to: this.arena.doors[d].target });
    return true;
  }
  // ---------------------------------------------------------------- the green room
  beginBonus() { this.bonusT = 0; this.statueUp = false; for (let i = 0; i < 6; i++) { const [x, y] = this.freePoint(30); this.spawnEnemy('paparazzo', x, y, { inside: true, quiet: true }); } this.event('bonusStart', {}); }
  stepBonus(dt) {
    this.bonusT += dt;
    this._rain = (this._rain || 0) - dt;
    if (this.bonusT < 40 && !this.bonusDone) {
      while (this._rain <= 0) { this._rain += .25; const [x, y] = this.freePoint(0); this.addPickup(MT.makePickup(RNG.drops() < .15 ? 'prize' : rpick(RNG.drops, ['bill', 'stack', 'gold', 'case', 'bill', 'stack']), x, y, { z: 80, vz: -20 })); }
      this._snap = (this._snap || 3) - dt; if (this._snap <= 0) { this._snap = 3; const p = this.enemies.filter(e => e.kind === 'paparazzo'); if (p.length) { const e = p[Math.floor(RNG.fx() * p.length)]; e.flashT = .2; this.event('snap', { x: e.x, y: e.y }); } }
    }
    if (this.bonusT >= 30 && !this.statueUp) { this.statueUp = true; this.addPickup(MT.makePickup('statue', AR.CX, AR.CY, { placed: true, rise: 0 })); this.event('statueUp', {}); }
    if (this.bonusDone || this.bonusT >= 40) { if (!this.bonusEnd) { this.bonusEnd = true; this.event('bonusEnd', {}); this.delayed(2, () => { this.outcome = { done: true }; this.setPhase('DONE'); }); } }
  }
  // ---------------------------------------------------------------- drawing (reads render state only)
  draw(r, t) {
    this.arena.draw(r, t, this);
    for (const d of this.decals) { const a = clamp(1 - d.t / d.life, 0, 1); if (d.kind === 'confetti') r.decal(g => { const [sx, sy] = r.w(d.x, d.y, 0); if (a > .5 || Math.floor(d.t * 8) % 2) px.rect(g, Math.round(sx), Math.round(sy), 2, 1, d.c); }); else if (d.kind === 'scorch') r.decal(() => r.groundDisc(d.x, d.y, d.r, '#140a14', .6 * a)); }
    for (const d of this.decals) if (d.kind === 'splat') { const a = clamp(1 - d.t / d.life, 0, 1); r.decal(() => { r.groundDisc(d.x, d.y, d.r, '#8a1020', .75 * a); r.groundDisc(d.x + 3, d.y - 2, d.r * .55, '#d02a3a', .8 * a); r.groundDisc(d.x - 5, d.y + 3, 3, '#ff5a3a', .8 * a); }); }
    for (const tg of this.targets) if (!tg.dead && TARGETS[tg.kind].shape) { r.shape(TARGETS[tg.kind].shape, tg.x, tg.y, 0, { facing: Math.PI / 2 }); if (tg.flash > 0) { tg.flash -= 1 / 60; } }
    MT.drawPickups(r, this, t);
    for (const c of this.contestants) c.draw(r, t, this);
    for (const e of this.enemies) { if (e.dead) continue; if (e.dropT !== undefined && e.dropT < .6) { r.decal(() => r.groundDisc(e.rs.x, e.rs.y, 6 + e.dropT * 6, '#000000', .5)); continue; } ENEMIES[e.kind].draw(r, e, t, this); }
    if (this.boss) this.boss.draw(r, t, this);
    MT.drawProjectiles(r, this, t);
    this.pShots.draw(r);
    this.drawFoeShots(r, t);
    for (const L of this.lobs) {
      r.decal(() => { r.groundRing(L.tx, L.ty, L.kind === 'tomato' ? 10 : 8, '#ff3344', .9); r.groundDisc(L.x, L.y, 3, '#000000', .4); });
      r.queue(L.x, L.y, L.z, g => { const [sx, sy] = r.w(L.x, L.y, L.z); if (L.kind === 'tomato') { px.disc(g, sx, sy, 3.5, '#5a0810'); px.disc(g, sx, sy, 2.8, '#e8302a'); px.dot(g, sx - 1, sy - 1, '#ffb0a0'); px.dot(g, sx, sy - 3, '#3a9a3a'); } else { px.rect(g, sx - 3, sy - 2, 6, 4, '#5a3a10'); px.rect(g, sx - 2, sy - 2, 4, 3, '#d8a040'); } }, { bias: 1 });
    }
  }
  drawFoeShots(r, t) {
    for (const b of this.fShots.list) {
      if (!r.visible(b.x, b.y, b.z, 12, 12, 12)) continue;
      const F = FOE[b.data.kind] || FOE.orb;
      r.queue(b.x, b.y, b.z, g => {
        let [x, y] = r.w(b.x, b.y, b.z); if (F.jitter) { x += (Math.random() - .5) * 2; y += (Math.random() - .5) * 2; }
        const rad = Math.max(1.5, b.r * r.view.scale);
        if (F.long) { const [tx, ty] = r.w(b.x - b.vx * .06, b.y - b.vy * .06, b.z); px.line(g, tx, ty, x, y, '#5a2a08', Math.round(rad * 2 + 1)); px.line(g, tx, ty, x, y, F.color, Math.round(rad * 2 - 1)); px.line(g, tx, ty, x, y, F.core, 1); return; }
        if (F.card) { const s = Math.sin(t * 16 + b.data.id); px.rect(g, x - 3 * Math.abs(s) - 1, y - 4, 6 * Math.abs(s) + 2, 8, '#140a24'); px.rect(g, x - 3 * Math.abs(s), y - 3, 6 * Math.abs(s), 6, F.color); px.dot(g, x, y, F.core); return; }
        px.disc(g, x, y, rad + 1, '#140a24'); px.disc(g, x, y, rad, F.color); px.disc(g, x - .5, y - .5, Math.max(.8, rad * .45), F.core);
      }, { bias: .3, emissive: true });
    }
  }
}
MT.World = World;
