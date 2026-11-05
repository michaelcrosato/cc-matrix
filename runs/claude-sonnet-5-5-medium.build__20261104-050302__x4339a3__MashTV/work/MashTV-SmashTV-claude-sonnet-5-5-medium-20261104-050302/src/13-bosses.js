// MASH TV: the boss framework and the three bosses. Boss drawing reads only the fields below (x, y, phase, sub, rot, open, parts[]).
WP.nearest = function (x, y) { let b = null, bd = 1e9; for (const c of this.cs) if (c.state === 'alive') { const d = MT.hyp(c.x - x, c.y - y); if (d < bd) { bd = d; b = c; } } return b || this.cs[0] || { x: 184, y: 160 }; };
WP.ring = function (x, y, n, speed, off, kind, o) { for (let i = 0; i < n; i++) this.foeShot(x, y, off + i / n * MT.TAU, speed, kind || 'orb', o); };
WP.bossSetup = function () { const B = MT.BOSSES[this.rm.boss]; this.boss = new B(this); this.bossIntroLock = false; };

class Boss {
  constructor(w, kind, name) {
    this.kind = kind; this.name = name; this.x = 184; this.y = 70; this.phase = 1; this.sub = 'idle'; this.t = 0; this.dead = false; this.parts = []; this.rot = 0; this.open = false;
    this.mul = MT.T.bossHp * (1 + .5 * (Math.max(1, w.nPlayers) - 1)); this.rs = this; this.timers = {}; this.stunT = 0; this.deathT = 0; this.flash = 0; this.hidden = false;
  }
  addPart(id, ox, oy, r, hp, o = {}) { const p = Object.assign({ id, ox, oy, r, hp: hp * this.mul, max: hp * this.mul, armor: 1, weak: 1, alive: true, active: true, flash: 0 }, o); this.parts.push(p); return p; }
  part(id) { return this.parts.find(p => p.id === id); }
  px(p) { return this.x + p.ox; } py(p) { return this.y + p.oy; }
  partAlive(id) { const p = this.part(id); return !!(p && p.alive); }
  hitParts() { const out = []; if (this.hidden || this.dead) return out; for (const p of this.parts) if (p.alive && p.active) out.push({ isPart: true, boss: this, part: p, x: this.px(p), y: this.py(p), r: p.r, alive: true }); return out; }
  armorOf(p) { const a = typeof p.armor === 'function' ? p.armor(this) : p.armor; return a * (p.weakNow ? p.weakNow(this) : 1); }
  hitPart(w, t, dmg, owner, ang) {
    const p = t.part; if (!p.alive) return; let d = dmg * this.armorOf(p);
    if (this.invulnerable && this.invulnerable(p)) d = 0;
    if (w.cheats && w.cheats.oneHit) d = 9999;
    if (d < dmg * .2 && d > 0) { w.game.particles.sparks(t.x, t.y, 14, 2); w.event('tink', { x: t.x, y: t.y }); }
    else if (d > 0) { w.game.particles.sparks(t.x, t.y, 14, 2, ang); w.event('bossHit', { x: t.x, y: t.y }); }
    p.hp -= d; p.flash = .08; this.flash = .08;
    if (p.hp <= 0) this.killPart(w, p, owner);
  }
  killPart(w, p, owner) {
    p.alive = false; p.hp = 0; const x = this.px(p), y = this.py(p);
    w.game.particles.explosion(x, y, 14, 1); w.game.shake(4); w.addRating(10); w.event('partDown', { id: p.id, x, y, boss: this.kind });
    const c = w.cs.find(q => q.slot === owner); if (c) w.addCash(c, 1000 * ((MT.run && MT.run.ep) || 1));
    if (p.onDestroy) p.onDestroy(w, this);
  }
  hitCircle(w, x, y, r, dmg, owner) { for (const t of this.hitParts()) if (MT.hyp(t.x - x, t.y - y) < r + t.r) this.hitPart(w, t, dmg, owner, 0); }
  hitRay(w, ox, oy, a, len, dmg, owner) { const dx = Math.cos(a), dy = Math.sin(a); for (const t of this.hitParts()) { const px = t.x - ox, py = t.y - oy, tt = px * dx + py * dy; if (tt < 0 || tt > len + t.r) continue; if (Math.abs(px * dy - py * dx) < t.r + 2) this.hitPart(w, t, dmg, owner, a); } }
  hitAll(w, dmg, owner) { for (const t of this.hitParts()) this.hitPart(w, t, dmg, owner, 0); }
  tick(dt) { for (const k in this.timers) if (this.timers[k] > 0) this.timers[k] -= dt; for (const p of this.parts) if (p.flash > 0) p.flash -= dt; if (this.flash > 0) this.flash -= dt; }
  due(k, every, dt) { if (this.timers[k] === undefined) this.timers[k] = every; if (this.timers[k] <= 0) { this.timers[k] = every; return true; } return false; }
  hpFrac() { let hp = 0, max = 0; for (const p of this.parts) if (p.main) { hp += Math.max(0, p.hp); max += p.max; } return max ? hp / max : 0; }
  start(w) {} introUpdate(w, dt) {} deathStart(w) { this.deathT = 0; } deathUpdate(w, dt) {}
  toNet() { return [this.kind, Math.round(this.x * 10), Math.round(this.y * 10), this.phase, this.sub, Math.round(this.rot * 1000), this.open ? 1 : 0, this.hidden ? 1 : 0, this.dead ? 1 : 0, this.parts.map(p => p.alive ? Math.max(1, Math.round(p.hp / p.max * 100)) : 0), this.extra ? this.extra() : 0]; }
  fromNet(a) { this.x = a[1] / 10; this.y = a[2] / 10; this.phase = a[3]; this.sub = a[4]; this.rot = a[5] / 1000; this.open = !!a[6]; this.hidden = !!a[7]; this.dead = !!a[8]; a[9].forEach((v, i) => { const p = this.parts[i]; if (p) { p.alive = v > 0; p.hp = v / 100 * p.max; } }); if (this.fromExtra) this.fromExtra(a[10]); }
  contact(w, dt) { for (const c of w.cs) if (c.state === 'alive' && MT.hyp(c.x - this.x, c.y - this.y) < (this.contactR || 0) + c.r * .7) w.hurtContestant(c, this.contactDmg || 1, 'boss', 0, MT.angTo(this, c)); }
}
MT.Boss = Boss;
const chain = (w, x, y, n) => { for (let i = 0; i < n; i++) w.game.after(i * .15, () => w.game.particles.explosion(x + (MT.fxr() - .5) * 40, y + (MT.fxr() - .5) * 30, 10, 1)); };

// ---- MASHY ----------------------------------------------------------------------------------------------------------------
class Mashy extends Boss {
  constructor(w) {
    super(w, 'mashy', 'MASHY'); this.x = 184; this.y = -40; this.contactR = 26; this.dir = 1; this.contactDmg = 1; this.sub = 'enter';
    this.addPart('body', 0, 0, 26, 160, { main: true, armor: b => (b.partAlive('armL') || b.partAlive('armR')) ? .15 : .5 });
    this.addPart('armL', -30, 6, 10, 45); this.addPart('armR', 30, 6, 10, 45);
    this.addPart('hatch', 0, 14, 9, 160 * .5, { active: false, weakNow: b => 2, armor: 1, hatch: true });
    this.part('hatch').hp = this.part('hatch').max = 80 * this.mul;
    this.part('armL').onDestroy = (w, b) => { w.game.particles.smoke(b.x - 30, b.y + 6, 12, 8); };
    this.part('armR').onDestroy = (w, b) => { w.game.particles.smoke(b.x + 30, b.y + 6, 12, 8); };
    this.part('hatch').main = false; this.eyeJ = 0; this.treadT = 0;
  }
  introUpdate(w, dt) { this.t += dt; this.y = Math.min(70, this.y + 55 * dt); this.treadT += 55 * dt; }
  start(w) { this.sub = 'fight'; this.y = 70; this.t = 0; }
  update(w, dt) {
    this.tick(dt); this.t += dt; this.eyeJ += dt; const body = this.part('body'), hatch = this.part('hatch');
    const armL = this.partAlive('armL'), armR = this.partAlive('armR');
    if (this.phase === 1 && !armL && !armR) { this.phase = 2; this.t = 0; this.timers = {}; }
    if (this.phase === 2 && body.hp / body.max < .35) { this.phase = 3; this.t = 0; this.timers = {}; this.sub = 'rest'; this.charges = 0; w.event('bossPhase3', { boss: 'mashy' }); this.restT = 1; }
    hatch.active = this.open && hatch.alive;
    const near = w.nearest(this.x, this.y);
    if (this.phase === 1) {
      this.x += this.dir * 30 * dt; this.treadT += 30 * dt; if (this.x > 268) this.dir = -1; if (this.x < 100) this.dir = 1; this.y = 70;
      const fast = (armL ^ armR) ? 1.3 : 1;
      if (armL && this.due('butter', 1.8 / fast, dt)) { const a = MT.angTo({ x: this.x - 30, y: this.y + 6 }, near); for (let i = -2; i <= 2; i++) w.foeShot(this.x - 30, this.y + 10, a + i * .225, 95, 'butter', { r: 3.5 }); w.event('bossShoot', { x: this.x, y: this.y }); }
      if (armR) { if (this.sub === 'stream') { this.streamT -= dt; this.streamAcc += dt * 10 * fast; while (this.streamAcc >= 1) { this.streamAcc--; const u = 1 - this.streamT / 1.2; w.foeShot(this.x + 30, this.y + 10, this.streamA + (u - .5) * 1.75, 120, 'gravy', { r: 3 }); } if (this.streamT <= 0) this.sub = 'fight'; }
        else if (this.due('gravy', 3.2 / fast, dt)) { this.sub = 'stream'; this.streamT = 1.2; this.streamAcc = 0; this.streamA = MT.angTo({ x: this.x + 30, y: this.y }, near); } }
    } else if (this.phase === 2) {
      this.x += this.dir * 25 * dt; this.treadT += 25 * dt; if (this.x > 268) this.dir = -1; if (this.x < 100) this.dir = 1;
      if (this.open) { if (this.t - this.openAt > 2.2) this.open = false; } else if (this.due('hatch', 4.5, dt)) { this.open = true; this.openAt = this.t; w.event('hatchOpen', {}); }
      if (this.due('ring', 2.5, dt)) { this.ringN = (this.ringN || 0) + 1; w.ring(this.x, this.y + 8, 14, 80, this.ringN % 2 ? .22 : 0, 'orb'); }
      if (this.due('tot', 5, dt)) for (let i = 0; i < 3; i++) { const c = w.cs[i % Math.max(1, w.cs.length)] || near; w.lob('tot', this.x, this.y, MT.clamp(c.x + (i - 1) * 24, 30, 338), MT.clamp(c.y, 40, 210), { time: .9 }); }
      if (this.due('goons', 9, dt)) w.queueSpawn('S', 'goon', 6, .3);
    } else {
      if (this.sub === 'rest') { this.restT -= dt; this.open = true; if (this.restT <= 0) { this.open = false; this.sub = 'tele'; this.teleT = .9; this.ca = MT.angTo(this, near); } }
      else if (this.sub === 'tele') { this.teleT -= dt; this.ca = MT.angTo(this, near); this.treadT += 20 * dt; if (this.teleT <= 0) { this.sub = 'charge'; this.cvx = Math.cos(this.ca) * 170; this.cvy = Math.sin(this.ca) * 170; } }
      else if (this.sub === 'charge') {
        this.x += this.cvx * dt; this.y += this.cvy * dt; this.treadT += 170 * dt; let hit = false;
        if (this.x < 46) { this.x = 46; this.cvx = Math.abs(this.cvx); hit = true; } if (this.x > 322) { this.x = 322; this.cvx = -Math.abs(this.cvx); hit = true; }
        if (this.y < 44) { this.y = 44; this.cvy = Math.abs(this.cvy); hit = true; } if (this.y > 196) { this.y = 196; this.cvy = -Math.abs(this.cvy); hit = true; }
        this.contactDmg = 2; this.contact(w, dt);
        if (hit) { w.game.shake(5); this.charges++; w.event('wallCrash', { x: this.x, y: this.y }); this.sub = this.charges % 3 === 0 ? 'rest2' : 'tele'; this.teleT = .9; this.restT = 2.5; if (this.sub === 'rest2') { this.sub = 'rest'; } }
      }
      if (this.due('clap', 10, dt)) w.queueSpawn('sides', 'clapbot', 3, .2);
      if (this.sub !== 'charge') { this.contactDmg = 1; }
      if (this.sub === 'rest') this.y += (70 - this.y) * Math.min(1, dt * 1.5);
    }
    this.x = MT.clamp(this.x, 46, 322);
    if (this.phase < 3 || this.sub !== 'charge') this.contact(w, dt);
    if (this.part('body').hp <= 0) this.dead = true;
  }
  deathStart(w) { this.open = true; this.hidden = false; w.event('bossDead', { boss: 'mashy', x: this.x, y: this.y }); w.fShots.clear(); w.enemies.forEach(e => { if (e.alive) { e.noCash = true; e.alive = false; } }); }
  deathUpdate(w, dt) {
    this.deathT += dt; if (Math.floor((this.deathT - dt) * 7) !== Math.floor(this.deathT * 7) && this.deathT < 2) w.game.particles.explosion(this.x + (MT.fxr() - .5) * 60, this.y + (MT.fxr() - .5) * 40, 14, 1);
    if (this.deathT >= 2 && !this.shower) { this.shower = true; w.game.flash('#ffffff', .3, .8); w.game.particles.bits(this.x, this.y, 20, 60, ['#e8d8a0', '#fff', '#c8a860']); w.scatterCash(this.x, this.y, 30); w.addPickup('prize', this.x - 20, this.y + 20, { vz: 120, vx: -30, vy: 30 }); w.addPickup('prize', this.x + 20, this.y + 20, { vz: 120, vx: 30, vy: 30 }); w.addPickup('cap', this.x, this.y + 30, { vz: 120 }); this.gone = true; }
  }
  extra() { return [Math.round(this.treadT * 10), this.ca ? Math.round(this.ca * 100) : 0, this.sub === 'tele' ? 1 : 0]; }
  fromExtra(a) { if (!a) return; this.treadT = a[0] / 10; this.ca = a[1] / 100; this.teleOn = !!a[2]; }
}
MT.BOSSES.mashy = Mashy;

// ---- THE WHEEL OF MISFORTUNE -------------------------------------------------------------------------------------------------
const SEGS = ['TOMATO TIME', 'LASER LIGHTS', 'MIME TIME', 'BANKRUPT', 'DISCO FEVER', 'GOON SQUAD', 'JACKPOT', 'SPIN AGAIN'];
MT.WHEEL_SEGS = SEGS;
class Wheel extends Boss {
  constructor(w) {
    super(w, 'wheel', 'THE WHEEL OF MISFORTUNE'); this.x = 184; this.y = 74; this.contactR = 0; this.rot = 0; this.sub = 'idle'; this.void = [0, 0, 0, 0, 0, 0, 0, 0]; this.pointerSeg = 0; this.click = 0;
    this.addPart('core', 0, 0, 14, 220, { main: true, armor: b => (b.phase === 1 && !b.jackpotOn) ? .15 : 1 });
    for (let i = 0; i < 8; i++) { const p = this.addPart('b' + i, 0, 0, 7, 18); p.seg = i; p.onDestroy = (w, b) => { b.void[i] = 1; }; }
    this.forced = null;
  }
  segAngle(i) { return this.rot + (i + .5) * Math.PI / 4; }
  hitParts() { for (const p of this.parts) if (p.seg !== undefined) { const a = this.segAngle(p.seg); p.ox = Math.cos(a) * 34; p.oy = Math.sin(a) * 34; } return super.hitParts(); }
  introUpdate(w, dt) { this.rot += dt * 2; }
  start(w) { this.sub = 'spin'; this.t = 0; this.spinFrom = this.rot; this.spinDur = 2.5; this.pick(w); }
  pick(w) {
    const live = []; for (let i = 0; i < 8; i++) if (!this.void[i]) live.push(i);
    this.target = this.forced && this.forced.length ? this.forced.shift() : live[Math.floor(MT.R.ai() * live.length)] !== undefined ? live[Math.floor(MT.R.ai() * live.length)] : 7;
    if (this.void[this.target]) this.target = live[0];
    const dest = -Math.PI / 2 - (this.target + .5) * Math.PI / 4; let delta = ((dest - this.spinFrom) % MT.TAU + MT.TAU) % MT.TAU; delta += MT.TAU * (3 + Math.floor(MT.R.ai() * 2)); this.spinTo = this.spinFrom + delta;
  }
  update(w, dt) {
    this.tick(dt); this.t += dt; const core = this.part('core');
    const gone = this.void.reduce((a, b) => a + b, 0);
    if (this.phase === 1 && gone >= 4) { this.phase = 2; this.sub = 'break'; this.t = 0; w.event('wheelBreaks', {}); w.game.shake(6); this.vx = 60; this.vy = 60; this.contactR = 40; this.contactDmg = 2; this.rollT = 0; }
    if (this.sub === 'spin') {
      const u = Math.min(1, this.t / this.spinDur), k = E.ease.outCubic(u), prev = this.rot; this.rot = this.spinFrom + (this.spinTo - this.spinFrom) * k;
      const segNow = Math.floor((((-Math.PI / 2 - this.rot) % MT.TAU + MT.TAU) % MT.TAU) / (Math.PI / 4)); if (segNow !== this.pointerSeg) { this.pointerSeg = segNow; this.click = .1; w.event('wheelClick', {}); }
      if (u >= 1) { this.sub = 'attack'; this.t = 0; this.stopped = this.target; w.event('wheelStop', { seg: this.target, name: SEGS[this.target] }); this.beginAttack(w); }
    } else if (this.sub === 'attack') { this.attackUpdate(w, dt); }
    else if (this.sub === 'stun') { this.stunT -= dt; if (this.stunT <= 0) { this.jackpotOn = false; this.nextSpin(w); } }
    else if (this.sub === 'break') {
      // phase 2: rolls around the arena
      this.x += this.vx * dt; this.y += this.vy * dt; this.rot += dt * 3; let hit = false;
      if (this.x < 56) { this.x = 56; this.vx = Math.abs(this.vx); hit = true; } if (this.x > 312) { this.x = 312; this.vx = -Math.abs(this.vx); hit = true; }
      if (this.y < 76) { this.y = 76; this.vy = Math.abs(this.vy); hit = true; } if (this.y > 184) { this.y = 184; this.vy = -Math.abs(this.vy); hit = true; }
      const sp = 85, l = Math.hypot(this.vx, this.vy) || 1; this.vx *= sp / l; this.vy *= sp / l;
      if (hit) { w.event('wallCrash', { x: this.x, y: this.y }); for (let i = 0; i < 8; i++) w.foeShot(this.x, this.y, i / 8 * MT.TAU + this.t, 75, 'orb'); }
      this.contact(w, dt);
      if (this.t > 6 && this.sub === 'break') { this.sub = 'spin2'; this.t = 0; this.spinFrom = this.rot; this.spinDur = 1.8; this.pick(w); this.vxs = this.vx; this.vys = this.vy; }
    } else if (this.sub === 'spin2') {
      const u = Math.min(1, this.t / this.spinDur); this.rot = this.spinFrom + (this.spinTo - this.spinFrom) * E.ease.outCubic(u);
      if (u >= 1) { this.stopped = this.target; w.event('wheelStop', { seg: this.target, name: SEGS[this.target] }); this.beginAttack(w); this.sub = 'attack2'; this.t = 0; }
    } else if (this.sub === 'attack2') { this.attackUpdate(w, dt); }
    if (this.click > 0) this.click -= dt;
    core.main = true; if (core.hp <= 0) this.dead = true;
  }
  nextSpin(w) { this.sub = this.phase === 2 ? 'break' : 'spin'; this.t = 0; this.spinFrom = this.rot; this.spinDur = this.fastSpin ? 1.6 : 2.5; this.fastSpin = false; if (this.phase === 1) this.pick(w); else { this.vx = this.vxs || 60; this.vy = this.vys || 60; } this.attackTimes = null; this.beams = null; }
  beginAttack(w) {
    const s = this.stopped, near = w.nearest(this.x, this.y); this.attackT = 0; this.attackDur = 4 + MT.R.ai() * 2; this.fired = 0; this.beams = null;
    switch (s) {
      case 0: this.attackDur = 3.2; break;
      case 1: this.beams = [0, 1, 2, 3].map(i => ({ a: MT.R.ai() * MT.TAU + i * Math.PI / 2, t: 0 })); this.attackDur = 5.2; break;
      case 2: { let n = 0, tries = 0; while (n < 6 && tries < 80) { tries++; const x = 40 + MT.R.ai() * 288, y = 70 + MT.R.ai() * 140; if (w.living().every(c => MT.hyp(c.x - x, c.y - y) > 40)) { const m = w.spawnEnemy('mime', x, y, {}); m.entering = false; w.game.particles.smoke(x, y, 8, 5, { size: 3, color: '#fff' }); n++; } } this.attackDur = 2.5; break; }
      case 3: w.loseRating(10); w.event('bankrupt', {}); for (let k = 0; k < 2; k++) w.ring(this.x, this.y, 20, 85 * (this.boost || 1), k * .157, 'coin'); this.attackDur = 2.5; break;
      case 4: for (let i = 0; i < 2; i++) { const e = w.spawnEnemy('disco', this.x + (i ? 30 : -30), this.y + 20, {}); e.entering = false; } this.attackDur = 4; break;
      case 5: w.queueSpawn('sides', 'goon', 5, .25); w.queueSpawn('S', 'goon', 2, .25); this.attackDur = 5; break;
      case 6: w.game.particles.bits(184, 120, 30, 60, ['#ffcc33', '#fff', '#ff2e88']); w.scatterCash(this.x, this.y + 30, 20); w.addPickup('cap', this.x, this.y + 40, { vz: 100 }); this.jackpotOn = true; this.stunT = 3; this.sub = this.phase === 2 ? 'stun' : 'stun'; w.event('jackpot', {}); return;
      case 7: this.fastSpin = true; this.boost = 1.2; w.event('spinAgain', {}); this.nextSpin(w); return;
    }
    this.sub = this.phase === 2 ? 'attack2' : 'attack';
  }
  attackUpdate(w, dt) {
    this.attackT += dt; const s = this.stopped, near = w.nearest(this.x, this.y);
    if (s === 0) { const want = Math.floor(this.attackT / .3); while (this.fired < Math.min(8, want)) { this.fired++; const left = MT.R.ai() < .5, c = w.cs[this.fired % Math.max(1, w.cs.length)] || near; const ax = left ? -30 : 398, ay = 40 + MT.R.ai() * 160; w.lob('tomato', ax, ay, MT.clamp(c.x + (MT.R.ai() - .5) * 30, 26, 342), MT.clamp(c.y + (MT.R.ai() - .5) * 30, 26, 214), { time: .8, z0: 30 }); w.event('throw', { x: ax, y: ay }); } }
    if (s === 1 && this.beams) { for (const b of this.beams) { b.t += dt; const tele = .8; if (b.t > tele) { const u = Math.min(1, (b.t - tele) / 4); b.ang = b.a + u * 1.2; for (const c of w.cs) if (c.state === 'alive') { const px = c.x - this.x, py = c.y - this.y, ax = Math.cos(b.ang), ay = Math.sin(b.ang), tt = px * ax + py * ay; if (tt > 0 && Math.abs(px * ay - py * ax) < 5) w.hurtContestant(c, 1, 'beam', 0, b.ang); } } else b.ang = b.a; } }
    if (this.attackT >= this.attackDur) { this.boost = 1; this.nextSpin(w); this.beams = null; }
    if (this.phase === 2 && this.sub === 'attack2') { /* wheel stands still while landing; the roll resumes */ if (this.attackT >= this.attackDur) { this.sub = 'break'; this.t = 0; this.vx = this.vxs || 60; this.vy = this.vys || 60; } }
  }
  deathStart(w) { w.event('bossDead', { boss: 'wheel', x: this.x, y: this.y }); w.fShots.clear(); w.enemies.forEach(e => { if (e.alive) { e.noCash = true; e.alive = false; } }); this.beams = null; }
  deathUpdate(w, dt) { this.deathT += dt; this.rot += dt * Math.max(0, 6 - this.deathT * 2.5); if (Math.floor((this.deathT - dt) * 6) !== Math.floor(this.deathT * 6) && this.deathT < 2.4) w.game.particles.explosion(this.x + (MT.fxr() - .5) * 60, this.y + (MT.fxr() - .5) * 60, 10, .8); if (this.deathT >= 2.4 && !this.shower) { this.shower = true; w.game.flash('#fff', .3, .7); w.scatterCash(this.x, this.y, 30); w.addPickup('prize', this.x - 16, this.y + 20, { vz: 120, vx: -30 }); w.addPickup('prize', this.x + 16, this.y + 20, { vz: 120, vx: 30 }); w.addPickup('cap', this.x, this.y + 30, { vz: 120 }); } }
  extra() { return [this.stopped === undefined ? -1 : this.stopped, this.jackpotOn ? 1 : 0, this.beams ? this.beams.map(b => Math.round((b.ang || b.a) * 100) + (b.t > .8 ? 10000 : 0)) : 0, this.void.join('')]; }
  fromExtra(a) { if (!a) return; this.stopped = a[0] < 0 ? undefined : a[0]; this.jackpotOn = !!a[1]; this.beams = a[2] ? a[2].map(v => ({ ang: (v % 10000) / 100, t: v >= 10000 ? 1 : 0 })) : null; this.void = a[3].split('').map(Number); }
}
MT.BOSSES.wheel = Wheel;

// ---- LANCE LUSTRE LIVE! -> THE NETWORK ------------------------------------------------------------------------------------------------
class Lance extends Boss {
  constructor(w) {
    super(w, 'lance', 'LANCE LUSTRE'); this.x = 184; this.y = 96; this.contactR = 0; this.stage = 'starmaker'; this.sub = 'enter'; this.cycle = 0; this.bob = 0; this.breaks = 0; this.wallU = 0; this.channels = []; this.eyeOpen = 0;
    this.addPart('podium', 0, 0, 22, 260, { main: true }); this.addPart('turL', -38, 4, 8, 30); this.addPart('turR', 38, 4, 8, 30);
    for (let i = 0; i < 12; i++) { const col = i % 4, row = Math.floor(i / 4); const tx = [96, 132, 236, 272][col], ty = 28 + row * 22; const p = this.addPart('tv' + i, 0, 0, 10, 22, { active: false, alive: false, tv: true, tx, ty }); p.hp = p.max = 22 * this.mul; }
    this.addPart('eye', 0, 0, 18, 300, { active: false, alive: false, main: false, armor: b => b.tvsGone() >= 8 ? 1 : .15 });
    this.cones = []; this.shock = null; this.slam = null; this.entered = false;
  }
  tvsGone() { return this.parts.filter(p => p.tv && !p.alive && p.wasAlive).length; }
  px(p) { return p.tv ? p.tx : p.id === 'eye' ? 184 : this.x + p.ox; }
  py(p) { return p.tv ? p.ty : p.id === 'eye' ? 54 : this.y + p.oy; }
  introUpdate(w, dt) { this.t += dt; this.bob += dt; }
  start(w) { this.sub = 'cycle'; this.t = 0; this.timers = {}; this.pattern = 0; this.startPattern(w); }
  invulnerable(p) { return this.hidden; }
  update(w, dt) { this.tick(dt); this.t += dt; this.bob += dt; if (this.stage === 'starmaker') this.updateA(w, dt); else this.updateB(w, dt); }
  hover(w, dt) {
    const near = w.nearest(this.x, this.y), d = MT.hyp(near.x - this.x, near.y - this.y), a = MT.angTo(near, this);
    let tx = this.x, ty = this.y; if (d < 100 || d > 140) { const want = MT.clamp(d, 100, 140); tx = near.x + Math.cos(a) * want; ty = near.y + Math.sin(a) * want; }
    tx = MT.clamp(tx, 70, 298); ty = MT.clamp(ty, 84, 125); this.x += (tx - this.x) * Math.min(1, dt * 1.2); this.y += (ty - this.y) * Math.min(1, dt * 1.2);
  }
  startPattern(w) { const seq = ['cyclone', 'micdrop', 'sweep']; this.sub = seq[this.pattern % 3]; this.pattern++; this.t = 0; this.cyc = 0; this.slam = null; this.cones = []; if (this.sub === 'sweep') { this.cones = ['turL', 'turR'].filter(id => this.partAlive(id)).map((id, i) => ({ id, a: MT.angTo(this, w.nearest(this.x, this.y)) + (i ? .5 : -.5), dir: i ? -1 : 1, lit: 0, t: 0 })); if (!this.cones.length) { this.cones = []; } } }
  updateA(w, dt) {
    const pod = this.part('podium'), f = pod.hp / pod.max;
    if (this.sub === 'break') {
      this.t += 0; this.breakT -= dt; this.hidden = true; this.x += (184 - this.x) * dt; this.y = Math.max(40, this.y - 60 * dt);
      if (this.breakT <= 0 || (this.breakT < 9.5 && w.alive() === 0)) { this.hidden = false; this.y = 96; this.x = 184; this.sub = 'cycle'; this.pattern = 0; this.startPattern(w); }
      return;
    }
    if (this.hidden) this.hidden = false;
    if (f <= .66 && this.breaks === 0 || f <= .33 && this.breaks === 1) { this.breaks++; this.sub = 'break'; this.breakT = 12; this.hidden = true; w.fShots.clear(); w.event('commercial', {}); w.queueSpawn('N', 'goon', 6, .3); w.queueSpawn('sides', 'clapbot', 3, .3); w.queueSpawn('S', 'brute', 1, .5); return; }
    if (pod.hp <= 0) { this.crash(w); return; }
    if (this.sub !== 'micdrop' || this.slam == null || this.slam.state === 'rise') this.hover(w, dt);
    const near = w.nearest(this.x, this.y);
    if (this.sub === 'cyclone') {
      this.cyc += dt * 12; while (this.cycFired === undefined || this.cycFired < Math.floor(this.cyc)) { this.cycFired = (this.cycFired === undefined ? 0 : this.cycFired) + 1; const k = this.cycFired; for (let arm = 0; arm < 3; arm++) w.foeShot(this.x, this.y + 6, this.t * 1.4 + arm * MT.TAU / 3, 100, 'card', { r: 3 }); if (k > 36) break; } if (this.t > 3) { this.cycFired = undefined; this.startPattern(w); }
    } else if (this.sub === 'micdrop') {
      if (!this.slam) { this.slam = { state: 'tele', t: 0, x: near.x, y: near.y }; }
      const s = this.slam; s.t += dt;
      if (s.state === 'tele') { s.x += (near.x - s.x) * Math.min(1, dt * 2); s.y += (near.y - s.y) * Math.min(1, dt * 2); if (s.t >= 1) { s.state = 'rise'; s.t = 0; } }
      else if (s.state === 'rise') { if (s.t >= .5) { s.state = 'fall'; s.t = 0; this.x = s.x; this.y = s.y; } }
      else if (s.state === 'fall') { if (s.t >= .2) { s.state = 'done'; s.t = 0; w.game.shake(6); w.event('micDrop', { x: s.x, y: s.y }); w.ring(s.x, s.y, 24, 90, 0, 'orb'); this.shock = { x: s.x, y: s.y, r: 4, hit: {} }; } }
      else if (s.state === 'done' && s.t > 1.2) this.startPattern(w);
    } else if (this.sub === 'sweep') {
      for (const c of this.cones) { c.t += dt; c.a += c.dir * dt * .55; c.lit = c.t > .5 ? 1 : 0; if (c.lit) for (const q of w.cs) if (q.state === 'alive') { const ang = MT.angTo(this, q), inCone = Math.abs(E.angDiff(c.a, ang)) < .16 && MT.hyp(q.x - this.x, q.y - this.y) > 20; if (inCone) { q.litT = (q.litT || 0) + dt; if (q.litT >= .4) { q.litT = 0; w.hurtContestant(q, 1, 'spotlight', 0, ang); } } else q.litT = Math.max(0, (q.litT || 0) - dt); } }
      if (this.t > 5.5) this.startPattern(w);
    }
    if (this.shock) { this.shock.r += 120 * dt; for (const c of w.cs) if (c.state === 'alive') { const d = MT.hyp(c.x - this.shock.x, c.y - this.shock.y); if (Math.abs(d - this.shock.r) < 5 && !this.shock.hit[c.slot]) { this.shock.hit[c.slot] = 1; w.hurtContestant(c, 1, 'shockwave', 0, MT.angTo(this.shock, c)); } } if (this.shock.r > 80) this.shock = null; }
    for (const p of this.parts) if (p.id.startsWith('tur')) p.active = p.alive;
  }
  crash(w) {
    this.sub = 'crash'; this.stage = 'transition'; this.t = 0; w.fShots.clear(); this.cones = []; this.shock = null; w.event('lanceRobot', { x: this.x, y: this.y }); w.game.particles.explosion(this.x, this.y, 12, 2); w.game.shake(8);
    for (const p of this.parts) if (!p.tv && p.id !== 'eye') { p.alive = false; p.active = false; }
    w.enemies.forEach(e => { if (e.alive) { e.noCash = true; e.alive = false; } }); this.pause = 5.5;
  }
  updateB(w, dt) {
    if (this.stage === 'transition') {
      this.pause -= dt; if (this.pause > 0) { this.wallU = Math.max(0, Math.min(1, (3.5 - this.pause) / 2.5)); return; }
      this.stage = 'network'; this.sub = 'fight'; this.t = 0; this.timers = {}; this.hidden = false; this.wallU = 1; w.event('networkReveal', {});
      for (const p of this.parts) if (p.tv) { p.alive = true; p.active = true; p.wasAlive = true; p.hp = p.max; } const eye = this.part('eye'); eye.alive = true; eye.active = true; eye.hp = eye.max = 300 * this.mul; eye.main = true; this.part('podium').main = false; this.name = 'THE NETWORK';
      return;
    }
    const eye = this.part('eye'), near = w.nearest(184, 54); const gone = this.tvsGone();
    this.channels = this.channels.filter(ch => { ch.t += dt; const p = this.part('tv' + ch.i); if (!p || !p.alive) return false; return ch.t < ch.len; });
    if (this.channels.length < 4 && this.due('flip', 1.2, dt)) {
      const alive = this.parts.filter(p => p.tv && p.alive && !this.channels.some(c => 'tv' + c.i === p.id)); if (alive.length) {
        const p = alive[Math.floor(MT.R.ai() * alive.length)], i = +p.id.slice(2), ch = ['static', 'news', 'cartoon', 'shopping', 'lance'][Math.floor(MT.R.ai() * 5)];
        this.channels.push({ i, ch, t: 0, len: ch === 'news' ? 2 : 1.2, fired: false, tele: .5 }); this.timers.flip = 1.2 + MT.R.ai() * 1.8; w.event('channel', { ch, i });
      }
    }
    for (const c of this.channels) {
      const p = this.part('tv' + c.i), x = this.px(p), y = this.py(p);
      if (c.t > c.tele && !c.fired) { c.fired = true;
        if (c.ch === 'static') for (let k = 0; k < 5; k++) w.foeShot(x, y, MT.angTo({ x, y }, near) + (k - 2) * .18, 95, 'static', { r: 2 });
        else if (c.ch === 'cartoon') { for (let k = 0; k < 2; k++) { const e = w.spawnEnemy('clapbot', x + (k ? 8 : -8), y + 14, {}); e.entering = false; } }
        else if (c.ch === 'shopping') w.addPickup('bill', x, y + 20, { vz: 60, ttl: 8 });
        else if (c.ch === 'lance') for (const o of [-.35, 0, .35]) w.foeShot(x, y, MT.angTo({ x, y }, near) + o, 100, 'orb');
      }
      if (c.ch === 'news' && c.t > c.tele + .8 && c.t < c.tele + 1.8) for (const q of w.cs) if (q.state === 'alive' && Math.abs(q.x - x) < 5 + q.r * .6 && q.y > y) w.hurtContestant(q, 1, 'newsbeam', 0, Math.PI / 2);
    }
    eye.active = true;
    if (gone >= 8) { this.eyeOpen = Math.min(1, this.eyeOpen + dt * 2); if (this.due('eye', 3, dt)) { this.eyeMode = (this.eyeMode || 0) + 1; this.eyeT = 0; } this.eyeT = (this.eyeT || 0) + dt; if (this.eyeMode) { if (this.eyeMode % 2) { this.spA = (this.spA || 0) + dt * 2.2; this.spAcc = (this.spAcc || 0) + dt * 10; while (this.spAcc >= 1) { this.spAcc--; for (let arm = 0; arm < 2; arm++) w.foeShot(184, 60, this.spA + arm * Math.PI, 95, 'orb'); } } else if (this.eyeT < dt * 1.5) w.ring(184, 60, 18, 85, MT.R.ai(), 'orb'); } }
    if (eye.hp <= 0) this.dead = true;
  }
  deathStart(w) { w.event('bossDead', { boss: 'lance', x: 184, y: 54 }); w.fShots.clear(); w.enemies.forEach(e => { if (e.alive) { e.noCash = true; e.alive = false; } }); this.channels = []; }
  deathUpdate(w, dt) { this.deathT += dt; const k = Math.floor(this.deathT * 4); if (k !== this.lastK && k < 12) { this.lastK = k; const p = this.parts.filter(q => q.tv)[k]; if (p) { w.game.particles.explosion(this.px(p), this.py(p), 10, 1); p.alive = false; } } if (this.deathT >= 2.8 && !this.shower) { this.shower = true; w.game.flash('#fff', .6, 1); w.scatterCash(184, 80, 30); w.addPickup('prize', 160, 90, { vz: 120 }); w.addPickup('prize', 208, 90, { vz: 120 }); } }
  extra() { return [this.stage, Math.round(this.wallU * 100), Math.round(this.eyeOpen * 100), this.channels.map(c => [c.i, c.ch, Math.round(c.t * 10)]), this.cones.map(c => [Math.round(c.a * 100), c.lit]), this.slam ? [this.slam.state, Math.round(this.slam.x), Math.round(this.slam.y)] : 0, this.shock ? [Math.round(this.shock.x), Math.round(this.shock.y), Math.round(this.shock.r)] : 0, this.parts.map(p => p.alive ? 1 : 0).join('')]; }
  fromExtra(a) { if (!a) return; this.stage = a[0]; this.wallU = a[1] / 100; this.eyeOpen = a[2] / 100; this.channels = a[3].map(c => ({ i: c[0], ch: c[1], t: c[2] / 10, tele: .5 })); this.cones = a[4].map(c => ({ a: c[0] / 100, lit: c[1] })); this.slam = a[5] ? { state: a[5][0], x: a[5][1], y: a[5][2], t: 0 } : null; this.shock = a[6] ? { x: a[6][0], y: a[6][1], r: a[6][2] } : null; if (this.stage !== 'starmaker') for (const p of this.parts) if (p.tv) p.wasAlive = true; }
}
MT.BOSSES.lance = Lance;
