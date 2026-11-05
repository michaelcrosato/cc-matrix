/* MASH TV — 09-bosses: the boss framework (§5.9) and its three bosses. A boss has parts (each with HP and armour), phases
 * written as task scripts, and a death that pours out the reward. Its drawing reads only its own state. */

class Boss {
  constructor(W, kind, o = {}) {
    this.W = W; this.kind = kind; this.x = o.x || 184; this.y = o.y || -30; this.parts = []; this.tasks = []; this.alive = true;
    this.phase = 0; this.t = 0; this.scale = 1 + .5 * (W.players.filter(c => c.inPlay).length - 1);
    this.hpMul = MT.T.bossHp * this.scale;
    this.hitFlash = 0; this.dying = 0; this.stance = 'enter';
  }
  part(id, ox, oy, r, hp, o = {}) {
    const p = Object.assign({ id, ox, oy, r, max: Math.round(hp * this.hpMul), hp: Math.round(hp * this.hpMul), armor: 1, alive: true, weak: 1 }, o);
    this.parts.push(p); return p;
  }
  partPos(p) { return [this.x + p.ox, this.y + p.oy]; }
  get body() { return this.parts[0]; }
  hitBy(s, W) {
    for (const p of this.parts) {
      if (!p.alive || p.open === false) continue;
      const [px, py] = this.partPos(p);
      if (MT.dist(s.x, s.y, px, py) < p.r + s.r) {
        const f = p.armor * p.weak;
        if (f < .2) { W.sparks(s.x, s.y, 2); return true; }
        p.hp -= s.dmg * f * MT.T.dmgMul; this.hitFlash = .1; W.stats.hits++;
        if (p.hp <= 0) { p.alive = false; this.partDestroyed(p, W); }
        return true;
      }
    }
    return false;
  }
  partDestroyed(p, W) { W.ratingsAdd(10, 'part'); W.burst({ x: this.x + p.ox, y: this.y + p.oy }); W.popup(this.x + p.ox, this.y + p.oy, 'DESTROYED', '#ff8a4a'); if (p.onDestroy) p.onDestroy(this, W); }
  damageAll(n, W) { for (const p of this.parts) if (p.alive && p.id !== 'hub') { p.hp -= n * p.armor; if (p.hp <= 0) { p.alive = false; this.partDestroyed(p, W); } } }
  step(dt, W) {
    this.t += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
    MT.tickTasksOf(this, dt);
    this.updateParts(dt, W);
  }
  updateParts() {}
  // the death: the reward shower and the end (§5.9); the boss's own line
  die(W) {
    if (!this.alive) return; this.alive = false; this.dying = 2.5; this.dyingT = 0; this.tasks = [];
    W.emit('boss-dies', { boss: this.kind });
    for (let i = 0; i < 30; i++) W.pickups.push(W.mkPickup('bill', this.x + MT.rand(-60, 60), this.y + MT.rand(-40, 40)));
    for (let i = 0; i < 2; i++) W.pickups.push(W.mkPickup('prize', this.x + MT.rand(-40, 40), this.y + MT.rand(-30, 30)));
    W.pickups.push(W.mkPickup('capsule', this.x, this.y + 30, { cap: MT.pick(MT.CAPSULES) }));
    W.shake(10); W.flashT = .3;
  }
}
MT.tickTasksOf = (o, dt) => {
  for (const t of o.tasks) {
    if (t.done) continue;
    if (t.wait > 0) { t.wait -= dt; continue; }
    if (t.cond) { if (!t.cond()) continue; t.cond = null; }
    const r = t.gen.next(); if (r.done) { t.done = true; continue; }
    if (typeof r.value === 'number') t.wait = r.value; else if (typeof r.value === 'function') t.cond = r.value;
  }
  o.tasks = o.tasks.filter(t => !t.done);
};
const nearestOf = (W, x, y) => W.nearestPlayer(x, y) || W.players.find(c => c.inPlay) || null;
const aimAt = (W, x, y) => { const p = nearestOf(W, x, y); return p ? Math.atan2(p.y - y, p.x - x) : Math.PI / 2; };

/* ---------------- MASHY, THE NETWORK'S BELOVED MASCOT (room 1-B) ---------------- */
class Mashy extends Boss {
  constructor(W) {
    super(W, 'mashy', { x: 184, y: -30 });
    this.body2 = this.part('body', 0, 0, 26, 160, { armor: .15 });
    this.arms = [this.part('left', -30, 6, 10, 45, { onDestroy: (b, W2) => b.armGone(W2) }), this.part('right', 30, 6, 10, 45, { onDestroy: (b, W2) => b.armGone(W2) })];
    this.hatch = this.part('hatch', 0, 14, 9, 80, { weak: 2, open: false });
    this.armsLeft = 2; this.hpPct = 1; this.tasks.push(MT.task(this.script(W)));
    this.armFast = 1;
  }
  armGone(W) { this.armsLeft--; this.body2.armor = this.armsLeft > 0 ? .15 : .5; W.popup(this.x, this.y - 20, 'ARM OFF!', '#ffcc33'); if (this.armsLeft === 0) { this.stance = 'phase2'; this.armFast = 1.3; } }
  *script(W) {
    // entrance: the north door bursts open and Mashy rolls in to y 70 over two seconds
    this.stance = 'enter'; W.sfx && 0;
    for (let k = 0; k < 40; k++) { this.y = -30 + (100) * (k / 40) * (k / 40 < 1 ? 1 : 1); yield .05; }
    this.y = 70; W.emit('boss-intro-done', { boss: 'mashy' });
    W.emit('boss-line', { key: 'mashy-intro' });
    this.stance = 'phase1';
    this.tasks.push(MT.task(this.cannons(W)));
    this.tasks.push(MT.task(this.gatling(W)));
    this.tasks.push(MT.task(this.phaseSwitch(W)));
    this.tasks.push(MT.task(this.drift(W)));
  }
  *drift(W) { let dir = 1; while (true) { if (this.parts[0].alive && this.stance !== 'phase3') { this.x += 30 * dir * .05; if (this.x > 280) dir = -1; if (this.x < 88) dir = 1; } yield .05; } }
  *cannons(W) {   // the Butter Cannon: a five-way spread at the nearest contestant, every 1.8 s
    while (true) {
      yield 1.8 / this.armFast;
      if (this.stance !== 'phase1' || !this.arms.some(a => a.alive)) continue;
      const a = aimAt(W, this.x, this.y);
      for (let i = -2; i <= 2; i++) W.fShot(this.x - 14 * (this.arms[0].alive ? 1 : 0), this.y + 6, a + i * .225, 95 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'butter');
    }
  }
  *gatling(W) {   // the Gravy Gatling: a 1.2 s stream, sweeping 100 degrees, every 3.2 s
    while (true) {
      yield 3.2 / this.armFast;
      if (this.stance !== 'phase1' || !this.arms[1].alive) continue;
      const a0 = aimAt(W, this.x, this.y) - .87, t0 = 0;
      for (let k = 0; k < 12; k++) { const a = a0 + k / 12 * 1.75; W.fShot(this.x + 30, this.y + 6, a, 120 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'gravy'); yield .1; }
    }
  }
  *phaseSwitch(W) {
    yield () => this.armsLeft === 0; this.stance = 'phase2';
    this.hatch.open = false;
    this.tasks.push(MT.task(this.hatchLoop(W)));
    this.tasks.push(MT.task(this.ring(W)));
    this.tasks.push(MT.task(this.tots(W)));
    this.tasks.push(MT.task(this.goonsS(W)));
    yield () => this.body2.hp < this.body2.max * .35; this.stance = 'phase3';
    W.emit('boss-line', { key: 'mashy-phase3' }); W.popup(this.x, this.y - 30, 'MASHY\'S GONE MASHY!', '#ff3344');
    this.tasks.push(MT.task(this.charges(W)));
    this.tasks.push(MT.task(this.clapbotsEW(W)));
  }
  *hatchLoop(W) { while (this.stance === 'phase2') { this.hatch.open = false; yield 2.3; this.hatch.open = true; yield 2.2; } }
  *ring(W) { while (this.stance === 'phase2' || this.stance === 'phase3') { yield 2.5; if (this.hatch.open) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + (Math.floor(this.t) % 2) * .13; W.fShot(this.x, this.y, a, 80 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'orb'); } } }
  *tots(W) { while (this.stance === 'phase2') { yield 5; for (let i = 0; i < 3; i++) { const t = nearestOf(W, this.x, this.y); if (!t) break; W.lobs.push({ sx: this.x, sy: this.y, x: this.x, y: this.y, z: 20, tx: t.x, ty: t.y, t: 0, dur: .9, kind: 'tot', owner: this }); } } }
  *goonsS(W) { while (this.stance === 'phase2') { yield 9; W.spawnAt('S', 'goon', 6, .2); } }
  *charges(W) {   // phase 3: a 0.9 s rev, then 170 u/s toward the target, bouncing off the walls; three, then a rest with the hatch open
    for (let k = 0; k < 3; k++) {
      yield 1.5; const p = nearestOf(W, this.x, this.y); if (!p) { k--; continue; }
      W.emit('telegraph', { e: this, kind: 'mashy' }); yield .9;
      const a = Math.atan2(p.y - this.y, p.x - this.x); this.vx = Math.cos(a) * 170; this.vy = Math.sin(a) * 170;
      for (let s = 0; s < 150; s++) { this.x += this.vx * .02; this.y += this.vy * .02; if (this.x < 40 || this.x > 328) this.vx = -this.vx; if (this.y < 40 || this.y > 200) this.vy = -this.vy; this.x = Math.max(40, Math.min(328, this.x)); this.y = Math.max(40, Math.min(200, this.y)); if (MT.dist(this.x, this.y, p.x, p.y) < 20) break; yield .02; }
    }
    this.hatch.open = true; yield 2.5; this.hatch.open = false;
    this.tasks.push(MT.task(this.charges(W)));
  }
  *clapbotsEW(W) { while (this.stance === 'phase3') { yield 10; W.spawnAt('E', 'clapbot', 3, .2); W.spawnAt('W', 'clapbot', 3, .2); } }
  updateParts(dt, W) {
    this.hatch.open = this.hatch.open && this.stance !== 'phase1';
    if (this.dying > 0) { this.dyingT += dt; this.dying -= dt; if (this.dying <= 0) W.bossDone(this); return; }
    this.body2.hp = Math.max(this.body2.hp, 0);
    if (this.parts[0].alive === false) { this.die(W); return; }
    // the arms ride the body; the body is down when its HP is gone
    for (const a of this.arms) a.hp <= 0 && a.alive && (a.alive = false);
    if (this.body2.hp <= 0 && this.alive) { this.body2.alive = false; this.die(W); }
  }
  draw(r) {}
}

/* ---------------- THE WHEEL OF MISFORTUNE (room 2-B) ---------------- */
MT.WHEEL_SEGS = ['TOMATO TIME', 'LASER LIGHTS', 'MIME TIME', 'BANKRUPT', 'DISCO FEVER', 'GOON SQUAD', 'JACKPOT', 'SPIN AGAIN'];
class Wheel extends Boss {
  constructor(W) {
    super(W, 'wheel', { x: 184, y: 52 });
    this.hub = this.part('hub', 0, 0, 14, 220, { armor: .15, id: 'hub' });
    this.clusters = MT.WHEEL_SEGS.map((name, i) => this.part('c' + i, 0, 0, 7, 18, { seg: i, name, onDestroy: (b, W2) => b.clusterGone(i, W2) }));
    this.angle = 0; this.spin = 0; this.spinSpeed = 0; this.segAlive = 8; this.loose = false; this.stunned = 0; this.seg = -1; this.nextAttack = 0; this.faster = 1;
    this.tasks.push(MT.task(this.script(W)));
  }
  clusterGone(i, W) { this.clusters[i].alive = false; this.segAlive--; W.popup(this.x, this.y + 40, 'VOID', '#666'); if (this.segAlive <= 4 && !this.loose) { this.loose = true; W.emit('boss-line', { key: 'wheel-loose' }); this.hub.armor = .5; this.tasks.push(MT.task(this.rollAround(W))); } }
  get hpLeft() { return this.hub.hp; }
  *script(W) {
    yield 1.8;   // the wheel drops onto its mount
    W.emit('boss-intro-done', { boss: 'wheel' }); W.emit('boss-line', { key: 'wheel-intro' });
    while (!this.loose && this.alive) {
      // spin for 2.5 s, then stop on a random living segment
      const spinT = 2.5 / this.faster; let t = 0;
      while (t < spinT) { this.spinSpeed = 6 * (1 - t / spinT) + 1; this.angle += this.spinSpeed * .02; t += .02; yield .02; }
      const alive = this.clusters.map((c, i) => c.alive ? i : -1).filter(i => i >= 0);
      if (!alive.length) break;
      const forced = this.forcedSegs && this.forcedSegs.length ? MT.WHEEL_SEGS.indexOf(this.forcedSegs.shift()) : -1;   // (the attract reel forces its segments)
      this.seg = forced >= 0 && this.clusters[forced].alive ? forced : alive[Math.floor(MT.rng.ai() * alive.length)];
      const target = -this.seg * Math.PI / 4 - Math.PI / 2;
      const a0 = this.angle, da = ((target - a0) % (Math.PI * 2) + Math.PI * 8) % (Math.PI * 2);
      for (let k = 0; k <= 50; k++) { const u = k / 50; this.angle = a0 + da * (1 - Math.pow(1 - u, 3)); if (k % 8 === 0) W.emit('wheel-click', {}); yield .04; }
      W.emit('boss-line', { key: 'wheel-seg', name: MT.WHEEL_SEGS[this.seg] });
      W.popup(this.x, this.y - 40, MT.WHEEL_SEGS[this.seg], '#ffcc33');
      yield* this.attack(W, MT.WHEEL_SEGS[this.seg]);
    }
    if (this.alive && this.loose) yield () => false;
  }
  *attack(W, name) {
    const p = () => nearestOf(W, this.x, this.y);
    const f = MT.T.enemyBulletSpeed * MT.run.diff.bullet;
    switch (name) {
      case 'TOMATO TIME': for (let i = 0; i < 8; i++) { const t = p(); if (t) W.lobTomato({ x: 184 + MT.rand(-120, 120), y: 20 }, t, .6); yield .3; } yield 1; break;
      case 'LASER LIGHTS': {   // four beams from the hub, sweeping 1.2 rad over four seconds (telegraphed for 0.8 s first)
        const beams = [0, 1, 2, 3].map(i => ({ a0: i * Math.PI / 2 + .2, t: 0, hit: 0 })); W.beams = (W.beams || []).concat(beams.map(b => Object.assign(b, { owner: this })));
        const life = { t: 0 }; this._beams = beams;
        for (let t = 0; t < 4.8; t += .05) { for (const b of beams) { b.a = b.a0 + Math.max(0, (t - .8)) / 4 * 1.2; b.t = t; } yield .05; }
        this._beams = null; W.beams = (W.beams || []).filter(b => !beams.includes(b)); break;
      }
      case 'MIME TIME': for (let i = 0; i < 6; i++) { let x, y, k = 0; do { x = MT.rand(40, 330); y = MT.rand(40, 200); k++; } while (W.players.some(c => MT.dist(c.x, c.y, x, y) < 40) && k < 50); W.spawnEnemy('mime', x, y, { counted: false }); } yield 1; break;
      case 'BANKRUPT': for (let ring = 0; ring < 2; ring++) { for (let i = 0; i < 20; i++) W.fShot(this.x, this.y, i / 20 * Math.PI * 2 + ring * .15, 85 * f, 'coin'); W.ratingsAdd(-10, 'bankrupt'); yield .4; } MT.sting('bankrupt'); yield 1; break;
      case 'DISCO FEVER': for (let i = 0; i < 2; i++) W.spawnEnemy('disco', this.x + (i ? 20 : -20), this.y + 30, { entering: false, cd: 3 }); yield 1; break;
      case 'GOON SQUAD': W.spawnAt('E', 'goon', 4, .2); W.spawnAt('W', 'goon', 4, .2); W.spawnAt('S', 'goon', 4, .2); yield 1; break;
      case 'JACKPOT': for (let i = 0; i < 20; i++) W.pickups.push(W.mkPickup('bill', MT.rand(60, 310), MT.rand(60, 210))); W.pickups.push(W.mkPickup('capsule', 184, 120, { cap: MT.pick(MT.CAPSULES) })); this.hub.armor = 1; this.stunned = 3; yield 3; this.hub.armor = .15; break;
      case 'SPIN AGAIN': this.faster = 1.5; this.spinAgainBullet = 1.2; yield .5; this.faster = 1; break;
    }
  }
  *rollAround(W) {   // phase 2: the wheel tears off its mount and rolls at 85 u/s, bouncing off the walls
    this.rolling = true; this.vx = 85 * (MT.rng.ai() < .5 ? 1 : -1); this.vy = 60;
    yield 1;
    this.rolling = true;
  }
  updateParts(dt, W) {
    if (this.dying > 0) { this.dyingT += dt; this.dying -= dt; if (this.dying <= 0) W.bossDone(this); return; }
    for (const c of this.clusters) if (c.alive) { const a = this.angle + c.seg * Math.PI / 4; c.ox = Math.cos(a) * 34; c.oy = Math.sin(a) * 34; }
    if (this.rolling) {
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.x < 50 || this.x > 318) { this.vx = -this.vx; W.fSpray && 0; for (let i = 0; i < 8; i++) W.fShot(this.x, this.y, i / 8 * 6.28, 60, 'orb'); }
      if (this.y < 40 || this.y > 200) this.vy = -this.vy;
      this.x = Math.max(44, Math.min(324, this.x)); this.y = Math.max(40, Math.min(200, this.y));
      this.angle += this.vx * dt / 44;   // the wheel turns as it rolls
      for (const c of W.players) if (c.inPlay && MT.dist(c.x, c.y, this.x, this.y) < 40 && (this._roll || 0) <= 0) { W.hurtPlayer(c, 2, this); this._roll = .8; }
      this._roll = Math.max(0, (this._roll || 0) - dt);
    }
    if (this.hub.hp <= 0 && this.alive) { this.hub.alive = false; this.die(W); }
  }
  draw(r) {}
}

/* ---------------- LANCE LUSTRE LIVE! → THE NETWORK (room 3-B) ---------------- */
class Lance extends Boss {
  constructor(W) {
    super(W, 'lance', { x: 184, y: 90 });
    this.podium = this.part('podium', 0, 0, 22, 260, { armor: 1 });
    this.turrets = [this.part('tL', -22, -6, 8, 30), this.part('tR', 22, -6, 8, 30)];
    this.phaseName = 'starmaker'; this.lanceAway = false; this.netwk = false; this.tvs = []; this.eye = null; this.channelsOff = 0;
    this.tasks.push(MT.task(this.script(W)));
  }
  *script(W) {
    yield 1.5; W.emit('boss-intro-done', { boss: 'lance' }); W.emit('boss-line', { key: 'lance-intro' });
    this.tasks.push(MT.task(this.patterns(W)));
    this.tasks.push(MT.task(this.breaks(W)));
    this.tasks.push(MT.task(this.hover(W)));
  }
  *hover(W) { while (this.phaseName === 'starmaker') { const p = nearestOf(W, this.x, this.y); if (p) { const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1; const want = 120; this.x += (dx / d * (want - d)) * .02; this.y += (dy / d * (want - d)) * .02; } this.x = Math.max(60, Math.min(308, this.x)); this.y = Math.max(40, Math.min(150, this.y)); yield .02; } }
  *patterns(W) {
    const f = MT.T.enemyBulletSpeed * MT.run.diff.bullet;
    while (this.phaseName === 'starmaker') {
      // CUE CARD CYCLONE: three arms of card bullets spiralling, 12 a second for 3 s
      for (let k = 0; k < 36 && this.phaseName === 'starmaker'; k++) { for (let a = 0; a < 3; a++) W.fShot(this.x, this.y, k * .25 + a * 2.094, 100 * f, 'card'); yield .25; }
      yield 1;
      // MIC DROP: a shadow telegraphs the landing, then the slam: 24 orbs and a shockwave
      const p = nearestOf(W, this.x, this.y); const tx = p ? p.x : 184, ty = p ? p.y : 120;
      W.decals.push({ x: tx, y: ty, t: 1.0, kind: 'shadow', r: 30 });
      yield 1.0;
      this.x = tx; this.y = ty - 20;
      for (let i = 0; i < 24; i++) W.fShot(tx, ty, i / 24 * Math.PI * 2, 80 * f, 'orb');
      W.rings = (W.rings || []); W.rings.push({ x: tx, y: ty, r: 80, t: .5 });
      for (const c of W.players) if (c.inPlay && MT.dist(c.x, c.y, tx, ty) < 80 && c.slideT <= 0) W.hurtPlayer(c, 1, { x: tx, y: ty });
      yield 1.5;
      // SPOTLIGHT SWEEP: each living turret throws a cone that sweeps the floor
      if (this.turrets.some(t => t.alive)) { W.spots = this.turrets.filter(t => t.alive).map((t, i) => ({ x: this.x + (i ? 22 : -22), y: this.y, a: i ? Math.PI * .75 : Math.PI * .25, t: 0, sweep: 3 })); yield 3; W.spots = []; }
      yield 1;
    }
  }
  *breaks(W) {   // COMMERCIAL BREAK at 66 % and 33 %: Lance flies off, adds arrive for 12 s
    for (const at of [.66, .33]) {
      yield () => this.podium.hp <= this.podium.max * at || this.phaseName !== 'starmaker';
      if (this.phaseName !== 'starmaker') return;
      this.lanceAway = true; W.emit('boss-line', { key: 'lance-break' }); W.emit('commercial', {});
      W.spawnAt('E', 'goon', 3, .2); W.spawnAt('W', 'goon', 3, .2); W.spawnAt('N', 'clapbot', 3, .2); W.spawnAt('S', 'brute', 1, .2);
      yield 12; this.lanceAway = false;
    }
  }
  partDestroyedHook() {}
  updateParts(dt, W) {
    if (this.dying > 0) { this.dyingT += dt; this.dying -= dt; if (this.dying <= 0) W.bossDone(this); return; }
    if (this.phaseName === 'starmaker' && this.podium.hp <= 0) { this.phaseName = 'robot'; this.podium.alive = false; W.emit('boss-line', { key: 'lance-down' }); W.emit('lance-robot', {}); this.tasks.push(MT.task(this.network(W))); }
    if (this.phaseName === 'network') { this.updateNetwork(dt, W); }
  }
  *network(W) {   // the robot reveal, then the north wall rises: 12 TVs and THE EYE
    yield 2.5; this.phaseName = 'network'; W.emit('network-rise', {});
    this.x = 184; this.y = 84;   // the wall: a 4 x 3 grid of TVs and THE EYE, all inside the arena
    this.tvs = []; for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) this.tvs.push(this.part('tv' + (row * 4 + col), -66 + col * 44, -64 + row * 16, 10, 22, { tv: true, ch: 'idle', timer: 3 + col * .4 }));
    this.eye = this.part('eye', 0, -40, 18, 300, { armor: .15, eye: true, open: false });
    this.netTimer = 0;
    W.emit('boss-line', { key: 'network-intro' });
  }
  updateNetwork(dt, W) {
    for (const t of this.tvs) {
      if (!t.alive) continue;
      t.timer -= dt; if (t.timer <= 0) { t.timer = 4 + MT.rng.ai() * 2; t.ch = MT.pick(['static', 'news', 'cartoon', 'shopping', 'lance'], MT.rng.ai); this.channel(t, W); }
    }
    this.channelsOff = this.tvs.filter(t => !t.alive).length;
    this.eye.armor = this.channelsOff >= 8 ? 1 : .15;
    this.eye.open = this.channelsOff >= 8;
    if (this.eye.open) { this.netTimer += dt; }
    if (this.eye.hp <= 0 && this.alive) { this.eye.alive = false; W.emit('boss-line', { key: 'network-down' }); this.die(W); }
  }
  channel(t, W) {   // each channel flips with a 0.5 s flicker, and at most four TVs are active at once
    const [x, y] = this.partPos(t); const p = nearestOf(W, x, y);
    if (t.ch === 'static' && p) for (let i = 0; i < 5; i++) W.fShot(x, y, Math.atan2(p.y - y, p.x - x) + (i - 2) * .12, 110 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'static');
    else if (t.ch === 'news' && p) { W.beams = (W.beams || []).concat([{ x: p.x, y: 0, vertical: true, t: .8, life: 1, owner: this }]); }
    else if (t.ch === 'cartoon') { W.spawnEnemy('clapbot', x, y + 10, {}); W.spawnEnemy('clapbot', x + 6, y + 10, {}); }
    else if (t.ch === 'shopping') W.pickups.push(W.mkPickup('bill', p ? p.x + 20 : 184, p ? p.y : 120));
    else if (t.ch === 'lance') for (let i = -1; i <= 1; i++) W.fShot(x, y, Math.PI / 2 + i * .3, 100 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'orb');
  }
  draw(r) {}
}

// the boss classes by room
MT.BOSS_CLASS = { mashy: Mashy, wheel: Wheel, lance: Lance };
