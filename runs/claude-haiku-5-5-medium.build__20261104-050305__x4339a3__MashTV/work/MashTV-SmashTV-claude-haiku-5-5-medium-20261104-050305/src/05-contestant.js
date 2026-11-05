/* MASH TV — 05-contestant: a contestant (§5.1), its weapons and add-ons (§5.2), its shot pools and their collisions.
 * The contestant reads an intent object (01-input) and never an E.Input directly. */

MT.WEAPONS = {   // primaries: one at a time; the add-ons stack on top
  blaster: { name: 'STUDIO BLASTER', kind: 'primary', rate: 'fireRate', dur: Infinity },
  spread: { name: 'TRIPLE PLAY', kind: 'primary', rate: 8, dur: 14 },
  rockets: { name: 'PRIME-TIME ROCKETS', kind: 'primary', rate: 3.5, dur: 12 },
  popcorn: { name: 'POPCORN POPPER', kind: 'primary', rate: 2.5, dur: 12 },
  laser: { name: 'LIMELIGHT LASER', kind: 'primary', rate: 0, dur: 10 },
  records: { name: 'GOLD RECORDS', kind: 'addon', dur: 15 },
  shield: { name: 'SPONSOR SHIELD', kind: 'addon', dur: 8 },
  speed: { name: 'SPEED SNEAKERS', kind: 'addon', dur: 10 },
  bomb: { name: 'SHOWSTOPPER', kind: 'instant' },
  life: { name: 'ENCORE', kind: 'instant' }
};
MT.PRIMARY_ORDER = ['blaster', 'spread', 'rockets', 'popcorn', 'laser'];

class Contestant {
  constructor(W, slot, o = {}) {
    this.W = W; this.slot = slot; this.n = slot + 1; this.id = 'c' + slot;
    this.look = MT.LOOKS[slot % 4]; this.name = MT.slots[slot].name; this.color = MT.slots[slot].color;
    this.x = o.x || 0; this.y = o.y || 0; this.r = 6; this.face = o.face !== undefined ? o.face : -Math.PI / 2; this.aim = null;
    this.diff = W.diff; this.maxHp = o.hp || this.diff.hp; this.hp = this.maxHp;
    this.lives = o.lives !== undefined ? o.lives : (MT.T.startLives || this.diff.lives); this.lives = o.lives !== undefined ? o.lives : this.lives;
    this.cash = o.cash || 0; this.prizes = []; this.kills = 0; this.deaths = 0; this.boatGain = 0; this.bombs = o.bombs !== undefined ? o.bombs : 2;
    this.weapon = { id: 'blaster', t: Infinity }; this.addons = {};
    this.state = 'play'; this.invulnT = 0; this.slideT = 0; this.slideCd = 0; this.slideDir = [0, 0]; this.fireCd = 0;
    this.showT = 0; this.showCd = 0; this.showGain = 0; this.showPose = 'cheer'; this.hurtT = 0; this.respawnT = 0; this.walkT = 1.2;
    this.dropZ = 0; this.dead = false; this.vx = 0; this.vy = 0; this.lastIntent = null; this.orbit = 0; this.records = []; this.blink = 0;
    this.continues = 0; this.kick = 0; this.rig = MT.lookRig(slot); this.pm = 0;
    this.speedMul = 1; this.bombFlash = 0; this.lastHitBy = null; this.arrowT = 2.5;
  }
  get alive() { return this.state === 'play' || this.state === 'walk'; }
  get inPlay() { return this.state === 'play' || this.state === 'walk' || this.state === 'drop'; }
  get wpn() { return this.weapon.id; }
  get addonsOn() { return Object.keys(this.addons).filter(k => this.addons[k].t > 0); }
  get shielded() { return (this.addons.shield && this.addons.shield.t > 0) || false; }
  get slowed() { return this.W.splatAt(this.x, this.y) ? .6 : 1; }

  // gives a pickup's weapon or add-on, the same way for a claim made by anyone
  give(kind) {
    const T = MT.T.puDuration, def = MT.WEAPONS[kind];
    if (!def) return;
    if (def.kind === 'primary') {
      if (this.weapon.id !== kind) { this.weapon = { id: kind, t: def.dur * T }; this.fireCd = 0; }
      else this.weapon.t = def.dur * T;
      this.W.emit('powerup', { c: this, kind });
    } else if (def.kind === 'addon') { this.addons[kind] = { t: def.dur * T }; this.W.emit('powerup', { c: this, kind }); }
    else if (kind === 'bomb') { if (this.bombs >= 3) this.W.cashGive(this, 2000, null, 'SHOWSTOPPER'); else this.bombs++; this.W.emit('bomb-pickup', { c: this }); }
    else if (kind === 'life') { this.lives++; this.W.emit('encore', { c: this }); }
  }

  // each step: movement, slide, fire, showboat, the timers and the rig's pose (the rig is posed by the world)
  step(dt, I, W) {
    this.kick = Math.max(0, this.kick - dt * 3);
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    this.bombFlash = Math.max(0, this.bombFlash - dt);
    this.arrowT = Math.max(0, this.arrowT - dt);
    for (const k in this.addons) { this.addons[k].t -= dt; if (this.addons[k].t <= 0) { delete this.addons[k]; W.emit('pwrexp', { c: this, kind: k }); } }
    if (this.weapon.id !== 'blaster') { this.weapon.t -= dt; if (this.weapon.t <= 0) { this.weapon = { id: 'blaster', t: Infinity }; W.emit('pwrexp', { c: this, kind: 'blaster' }); } }
    this.speedMul = this.addons.speed ? 1.45 : 1;
    if (this.state === 'dead') { this.respawnT -= dt; if (this.respawnT <= 0) this.beginDrop(W); return; }
    if (this.state === 'drop') { this.dropZ = Math.max(0, this.dropZ - 140 * dt); if (this.dropZ <= 0) { this.state = 'play'; this.invulnT = 2.5; this.bombs = Math.max(1, this.bombs); this.arrowT = 3; W.emit('land', { c: this }); } return; }
    if (this.state === 'out') return;
    if (this.walkT > 0) { this.walkT -= dt; this.state = 'walk'; this.invulnT = Math.max(this.invulnT, .5); this.walkTarget(W, dt); if (this.walkT <= 0) this.state = 'play'; return; }
    if (this.state !== 'play') return;
    const cannot = this.showT > 0;
    if (this.showCd > 0) this.showCd -= dt;
    if (this.slideCd > 0) this.slideCd -= dt;
    if (this.slideT > 0) {   // the slide: a dive in the move direction (or the facing)
      this.slideT -= dt;
      const sp = MT.T.slideSpeed * this.slowed;
      this.move(this.slideDir[0] * sp * dt, this.slideDir[1] * sp * dt, W);
      if (this.slideT <= 0) this.slideCd = MT.T.slideCooldown * (this.addons.speed ? .6 : 1);
    } else if (cannot) {
      this.showT -= dt;
      if (this.showT <= 0) this.finishShowboat(W);
    } else {
      const sp = MT.T.playerSpeed * this.speedMul * this.slowed;
      if (I.move) this.move(I.move[0] * sp * dt, I.move[1] * sp * dt, W);
      if (I.aim !== null) { this.aim = I.aim; this.face = I.aim; }
      else if (I.move && (I.move[0] || I.move[1])) { this.face = Math.atan2(I.move[1], I.move[0]); this.aim = null; }
      if (I.slide && this.slideCd <= 0) this.startSlide(I);
      if (I.bomb) W.showstop(this);
      if (I.showboat && this.showCd <= 0) this.startShowboat(W);
      if (I.fire) this.fire(dt, W, I);
      else this.fireCd = Math.min(this.fireCd, 0);
    }
    this.records.length && this.updateRecords(dt, W);
    if (this.addons.records && !this.records.length) this.makeRecords();
    if (!this.addons.records) this.records.length = 0;
    this.lastIntent = I;
  }
  walkTarget(W, dt) {   // the walk-in: from the entry door to the formation (§5.1)
    const f = W.formation(this.slot), dx = f[0] - this.x, dy = f[1] - this.y, d = Math.hypot(dx, dy);
    if (d > .5) { const s = Math.min(d, 80 * dt); this.move(dx / d * s, dy / d * s, W); this.face = Math.atan2(dy, dx); }
  }
  move(dx, dy, W) {
    this.x += dx; this.y += dy; W.wallClamp(this);
    if (this.state === 'play') W.touchFloor(this);
  }
  startSlide(I) {
    const d = I.move && (I.move[0] || I.move[1]) ? I.move : [Math.cos(this.face), Math.sin(this.face)], L = Math.hypot(d[0], d[1]) || 1;
    this.slideDir = [d[0] / L, d[1] / L]; this.slideT = .28; this.face = Math.atan2(this.slideDir[1], this.slideDir[0]);
    this.W.emit('slide', { c: this });
  }
  startShowboat(W) {
    this.showT = .6; this.showCd = 3; this.showGain = 0; this.poseIdx = (this.poseIdx || 0) + 1; this.showPose = ['cheer', 'hips', 'wave'][this.poseIdx % 3];
    W.emit('showboat-start', { c: this });
  }
  finishShowboat(W) {   // ratings gain 4 + 3n + 3m (cap 30), where n counts within 64 and m within 32 (§5.1)
    let n = 0, m = 0;
    for (const e of W.enemies) if (e.alive && e.counted) { const d = MT.dist(this.x, this.y, e.x, e.y); if (d <= 64) n++; if (d <= 32) m++; }
    const gain = Math.min(30, 4 + 3 * n + 3 * m) * MT.T.ratingsGain * (this.hitInPose ? 0 : 1);
    this.hitInPose = false;
    if (gain > 0) { W.ratingsAdd(gain, 'boat'); W.popup(this.x, this.y, 'STYLE +' + Math.round(gain), this.color); }
    this.boatGain += gain; W.emit('boat', { c: this, gain, n, m });
  }
  fire(dt, W, I) {
    const aim = this.aim !== null ? this.aim : this.face;
    this.fireCd -= dt;
    const id = this.weapon.id;
    if (id === 'laser') { W.laserBeam(this, aim, dt); return; }
    const def = MT.WEAPONS[id], rate = def.rate === 'fireRate' ? MT.T.fireRate : def.rate;
    while (this.fireCd <= 0) {
      this.fireCd += 1 / rate; this.shoot(W, aim, id);
      if (this.fireCd < -.2) this.fireCd = 0;
    }
  }
  shoot(W, aim, id) {
    const mx = this.x + Math.cos(aim) * 10, my = this.y + Math.sin(aim) * 10;
    if (id === 'blaster') { W.pshot(mx, my, aim, MT.T.bulletSpeed, 1 * MT.T.dmgMul, this); W.emit('shoot', { c: this, w: id }); }
    else if (id === 'spread') { for (const d of [-13, 0, 13]) W.pshot(mx, my, aim + d * Math.PI / 180, MT.T.bulletSpeed, 1 * MT.T.dmgMul, this); W.emit('shoot', { c: this, w: id }); }
    else if (id === 'rockets') { W.rocket(mx, my, aim, this); W.emit('shoot', { c: this, w: id }); }
    else if (id === 'popcorn') { W.popcorn(this, aim); W.emit('shoot', { c: this, w: id }); }
  }
  makeRecords() { this.records = [{ a: 0 }, { a: Math.PI }]; }
  updateRecords(dt, W) {
    this.orbit += 4.2 * dt;
    for (const o of this.records) { o.x = this.x + Math.cos(this.orbit + o.a) * 26; o.y = this.y + Math.sin(this.orbit + o.a) * 26; }
    for (const o of this.records) W.recordHits(this, o, dt);
  }
  // a hit on the contestant (damage pipeline: §5.1); returns true if it landed
  hurt(dmg, src, W) {
    if (this.state !== 'play' && this.state !== 'walk') return false;
    if (this.W && this.W.run && this.W.run.cheats && this.W.run.cheats.god) return false;
    if (this.invulnT > 0 || this.shielded) return false;
    if (this.slideT > .06) return false;   // the slide's i-frames: its first 0.22 s (slideT runs .28 down to 0)
    this.hp -= dmg; this.hurtT = .35; this.invulnT = MT.T.invulnTime; this.hitInPose = true; this.showT = 0;
    W.emit('hurt', { c: this, dmg, src });
    if (src && src.x !== undefined) { const L = Math.hypot(this.x - src.x, this.y - src.y) || 1; this.x += (this.x - src.x) / L * 6; this.y += (this.y - src.y) / L * 6; W.wallClamp(this); }
    if (this.hp <= 0) this.die(W);
    return true;
  }
  die(W) {
    this.deaths++;
    if (W.run && W.run.mode === 'session') { this.cash = Math.max(0, this.cash - 2500); this.lives = 99; W.emit('death', { c: this }); this.state = 'dead'; this.respawnT = 2.0; this.weapon = { id: 'blaster', t: Infinity }; this.addons = {}; this.records = []; this.slideT = 0; this.showT = 0; this.hp = this.maxHp; return; }
    this.lives = Math.max(0, this.lives - 1); this.weapon = { id: 'blaster', t: Infinity }; this.addons = {}; this.records = [];
    this.slideT = 0; this.showT = 0;
    W.ratingsAdd(-25, 'death'); W.emit('death', { c: this });
    if (this.lives > 0) { this.state = 'dead'; this.respawnT = 2.0; }
    else { this.state = 'out'; this.hp = 0; this.respawnT = 0; W.emit('out', { c: this }); }
    this.hp = this.maxHp;
  }
  beginDrop(W) {   // the cable drop: from the ceiling under a spotlight, near the entry door
    const p = W.dropPoint(this.slot);
    this.x = p[0]; this.y = p[1]; this.state = 'drop'; this.dropZ = 70; this.walkT = 0; this.hp = this.maxHp; this.kick = 1;
    this.bombs = Math.max(this.bombs, 1); W.emit('respawn', { c: this });
  }
  // the Start press brings an out contestant back: full lives, half the winnings (the producer's cut)
  continueOn(W) {
    this.state = 'drop'; this.dropZ = 70; this.lives = this.diff.lives; this.hp = this.maxHp; this.cash = Math.floor(this.cash / 2);
    this.continues++; this.bombs = Math.max(this.bombs, 1); this.records = []; this.addons = {}; this.weapon = { id: 'blaster', t: Infinity };
    const p = W.dropPoint(this.slot); this.x = p[0]; this.y = p[1]; W.emit('steal', { c: this });
  }
  get rsState() {
    const pose = this.state === 'out' || this.state === 'dead' ? 'down' : this.showT > 0 ? this.showPose : undefined;
    return { x: this.x, y: this.y, z: this.dropZ, vx: this.vx, vy: this.vy, facing: this.face, aim: this.aim !== null ? this.aim : undefined,
      point: this.fireCd > -.05 && this.aim !== null && this.state === 'play' && !this.showT, hurt: this.hurtT > 0, pose, flip: this.slideT > 0 ? 1 - this.slideT / .28 : undefined,
      expr: this.showT > 0 ? 'smile' : this.hurtT > 0 ? 'wince' : undefined, down: this.state === 'out' ? 1 : undefined };
  }
}

/* ---------- the pools: pShots (team p) and fShots (team f), rockets, popcorn bags and kernels ---------- */
MT.projectiles = {
  pshot(W, x, y, a, speed, dmg, owner) {
    W.pShots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 2.5, dmg, owner, life: .9, kind: 'bolt' });
  },
  rocket(W, x, y, a, owner) {
    W.rockets.push({ x, y, a, speed: 180, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: .9, owner, t: 0, trail: [] });
  },
  popcorn(W, c, a) {
    const tx = c.x + Math.cos(a) * 90, ty = c.y + Math.sin(a) * 90;
    W.lobs.push({ sx: c.x, sy: c.y, x: c.x, y: c.y, z: 4, tx, ty, t: 0, dur: .6, owner: c, kind: 'popcorn' });
  },
  updateRockets(W, dt) {
    for (const k of W.rockets) {
      k.t += dt; k.life -= dt; const sp = Math.min(300, 180 + 120 * k.t / .5);
      k.x += Math.cos(k.a) * sp * dt; k.y += Math.sin(k.a) * sp * dt;
      k.trail.push([k.x, k.y]); if (k.trail.length > 6) k.trail.shift();
      let hit = null;
      for (const e of W.enemies) if (e.alive && MT.dist(k.x, k.y, e.x, e.y) < e.r + 3) { hit = e; break; }
      if (hit || k.life <= 0 || !MT.inArena(k.x, k.y, -4)) { W.rocketBoom(k, hit); k.dead = true; }
    }
    W.rockets = W.rockets.filter(k => !k.dead);
  },
  updateLobs(W, dt) {
    for (const l of W.lobs) {
      l.t += dt; const u = Math.min(1, l.t / l.dur);
      l.x = lerpN(l.sx, l.tx, u); l.y = lerpN(l.sy, l.ty, u); l.z = 4 + 40 * Math.sin(Math.PI * u);
      if (u >= 1) { l.dead = true; if (l.kind === 'tomato') W.tomatoSplat(l); else W.popcornBoom(l); }
    }
    W.lobs = W.lobs.filter(l => !l.dead);
  },
  updateShots(W, dt) {
    for (const s of W.pShots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0 || !MT.inArena(s.x, s.y, -1)) s.dead = true;
      else if (W.doorBlocks(s.x, s.y)) s.dead = true;
    }
    W.pShots = W.pShots.filter(s => !s.dead);
    for (const s of W.fShots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.z !== undefined) { s.vz -= 500 * dt; s.z = Math.max(0, s.z + s.vz * dt); }
      if (s.life <= 0 || !MT.inArena(s.x, s.y, -2)) s.dead = true;
    }
    W.fShots = W.fShots.filter(s => !s.dead);
  }
};
function lerpN(a, b, t) { return a + (b - a) * t; }
