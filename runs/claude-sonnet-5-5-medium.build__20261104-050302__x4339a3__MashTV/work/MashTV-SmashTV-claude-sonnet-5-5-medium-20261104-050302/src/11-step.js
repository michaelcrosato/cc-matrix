// MASH TV: the authoritative step: contestants, weapons, projectiles, collisions, doors, waves, phases.
const WP = World.prototype;
const SMALL_FOE = { orb: 1, shard: 1, coin: 1, card: 1, static: 1, butter: 1, gravy: 1, beam: 0 };

WP.dm = function () { return MT.T.dmgMul * (this.dmgBoost || 1); };
WP.getIntent = function (c) {
  if (c.kind === 'remote') return c.intent || { move: [0, 0], aim: null, fire: false };
  if (c.kind === 'bot' || (c.auto && MT.bot)) return MT.bot.think(this, c);
  if (c.input && !MT.overlay.open && !(this.session && MT.sessionOverlay && MT.sessionOverlay.open) && !this.inputOff) return MT.intentFrom(c.input, c, this);
  return { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
};

WP.foeShot = function (x, y, ang, speed, kind, o = {}) {
  const d = MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'];
  const sp = Math.min(130, speed) * MT.T.enemyBulletSpeed * d.eb * (this.bulletBoost || 1);
  const col = { orb: '#ff9a3c', shard: '#ffd23a', beam: '#ffe9a0', static: '#d8f0ff', card: '#ff6a9a', coin: '#ffd23a', butter: '#ffe27a', gravy: '#b86a30', tot: '#d8a050' }[kind] || '#ff9a3c';
  const b = this.fShots.fire({ x, y, z: o.z === undefined ? 12 : o.z, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: o.r || ({ shard: 2, beam: 2, static: 2, card: 3, coin: 3 }[kind] || 3), team: 'f', color: col, core: '#fff', life: o.life || 4, dmg: 1, data: { id: this.nextId++, kind } });
  if (b) { b.kind = kind; b.id = b.data.id; b.ang = ang; b.spin = o.spin; }
  return b;
};
WP.lob = function (kind, x, y, tx, ty, o = {}) {
  const a = E.arc({ x, y, z: o.z0 || 12 }, { x: tx, y: ty, z: 0 }, 260, { time: o.time || .7 });
  const l = { id: this.nextId++, kind, x, y, z: o.z0 || 12, vx: a.vx, vy: a.vy, vz: a.vz, tx, ty, t: 0, owner: o.owner };
  this.lobs.push(l); return l;
};
WP.splat = function (x, y, kind) {
  const r = kind === 'tot' ? 0 : 10;
  this.decals.push({ kind: kind === 'tomato' ? 'tomato' : 'scorch', x, y, t: 6, life: 6 });
  if (kind === 'tomato') { this.puddles = this.puddles || []; this.puddles.push({ x, y, r: 14, t: 6 }); this.event('splat', { x, y }); }
  for (const c of this.cs) if (c.state === 'alive' && r && MT.hyp(c.x - x, c.y - y) < r + 5) this.hurtContestant(c, 1, 'tomato', 0, MT.angTo({ x, y }, c));
  this.game.particles.bits(x, y, 4, 8, kind === 'tomato' ? ['#d02828', '#ff5a3a', '#fff'] : ['#ffd23a', '#fff']);
};
WP.explode = function (x, y, r, dmgC, dmgE, owner, o = {}) {
  this.game.particles.explosion(x, y, 8, o.size || 1); this.event('boom', { x, y, r });
  this.decals.push({ kind: 'scorch', x, y, t: 5, life: 5 });
  if (dmgC) for (const c of this.cs) if (c.state === 'alive' && MT.hyp(c.x - x, c.y - y) < r + 4) this.hurtContestant(c, dmgC, o.src || 'blast', 0, MT.angTo({ x, y }, c));
  if (dmgE) for (const e of this.enemies) if (e.alive && !e.hidden && MT.hyp(e.x - x, e.y - y) < r + e.r) this.hurtEnemy(e, dmgE, owner !== undefined ? { slot: owner } : null, { ang: MT.angTo({ x, y }, e), quiet: true });
  if (dmgE && this.boss) this.boss.hitCircle(this, x, y, r, dmgE, owner);
};

// ---- contestants ----------------------------------------------------------------------------------------------------
WP.puddleSlow = function (c) { if (!this.puddles) return 1; for (const p of this.puddles) if (MT.hyp(c.x - p.x, c.y - p.y) < p.r) return .6; return 1; };
WP.updateContestant = function (c, dt) {
  if (c.kind === 'remote') return this.updateRemote(c, dt);
  const I = c.intent || { move: [0, 0] }, g = this.game;
  c.flash = Math.max(0, c.flash - dt); c.hurtT = Math.max(0, c.hurtT - dt); c.arrowT = Math.max(0, c.arrowT - dt);
  if (c.invuln > 0) c.invuln -= dt; c.slideCd = Math.max(0, c.slideCd - dt); c.boatCd = Math.max(0, c.boatCd - dt); c.fireCd = Math.max(0, c.fireCd - dt);
  c.landK = Math.max(0, c.landK - dt * 3);
  if (c.wT > 0 && c.wpn !== 'blaster') { c.wT -= dt; if (c.wT <= 0) { c.wpn = 'blaster'; c.wT = 0; this.event('expire', { slot: c.slot }); } }
  for (const k in c.addons) { c.addons[k] -= dt; if (c.addons[k] <= 0) { delete c.addons[k]; this.event('expire', { slot: c.slot }); } }
  c.laserOn = false;
  if (c.state === 'walkin') {
    const dx = c.walkTo[0] - c.x, dy = c.walkTo[1] - c.y, L = Math.hypot(dx, dy);
    c.walkT -= dt; const sp = L > 3 ? 70 : 0; c.body.vx = dx / (L || 1) * sp; c.body.vy = dy / (L || 1) * sp; c.body.update(dt, this.noClipMap()); c.x = c.body.x; c.y = c.body.y;
    c.vx = c.body.vx; c.vy = c.body.vy; if (sp) c.face = Math.atan2(dy, dx);
    if (c.walkT <= 0) { c.state = 'alive'; c.invuln = Math.max(c.invuln, .3); }
    return;
  }
  if (c.state === 'dying') { c.respawnT -= dt; c.down = Math.min(1, c.down + dt * 2); if (c.respawnT <= 0) this.respawn(c); return; }
  if (c.state === 'drop') {
    c.dropZ = Math.max(0, c.dropZ - dt * 140); c.z = c.dropZ; if (c.dropZ <= 0) { c.state = 'alive'; c.landK = 1; this.game.particles.dust(c.x, c.y, 2, 6); this.event('land', { slot: c.slot }); } return;
  }
  if (c.state === 'out') {
    if (c.input && c.input.pressed('start') && !this.session) { c.lives = MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'].hp ? (MT.T.startLives || MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'].lives) : 3; c.cash = Math.floor(c.cash / 2); c.continues++; this.respawn(c); this.event('rejoin', { slot: c.slot }); }
    return;
  }
  if (c.state !== 'alive') return;
  // facing & aim
  if (I.aim !== null && I.aim !== undefined) c.aim = I.aim; else if (I.move[0] || I.move[1]) c.aim = Math.atan2(I.move[1], I.move[0]);
  const firing = !!I.fire && c.boatT <= 0; c.fireOn = firing && c.slideT < .2;
  const moving = Math.hypot(I.move[0], I.move[1]) > .1;
  if (firing) c.face = c.aim; else if (moving) c.face = Math.atan2(I.move[1], I.move[0]);
  if (moving) c.lastMove = [I.move[0], I.move[1]];
  // slide
  if (I.slide && c.slideCd <= 0 && c.slideT <= 0 && c.boatT <= 0) {
    const d = moving ? norm2(I.move) : [Math.cos(c.face), Math.sin(c.face)]; c.slideDir = d; c.slideT = .28; c.slideCd = MT.T.slideCooldown * (c.addons.speed > 0 ? .6 : 1);
    this.event('slide', { slot: c.slot, x: c.x, y: c.y }); g.particles.dust(c.x, c.y, 2, 6);
  }
  let vx, vy;
  const spd = MT.T.playerSpeed * (c.addons.speed > 0 ? 1.45 : 1) * this.puddleSlow(c);
  if (c.slideT > 0) { c.slideT -= dt; vx = c.slideDir[0] * MT.T.slideSpeed; vy = c.slideDir[1] * MT.T.slideSpeed; c.slideU = 1 - c.slideT / .28; }
  else if (c.boatT > 0) { vx = vy = 0; }
  else if (c.kbT > 0) { c.kbT -= dt; vx = c.body.vx * .9; vy = c.body.vy * .9; }
  else { vx = I.move[0] * spd; vy = I.move[1] * spd; c.slideU = 0; }
  // conveyors etc.
  const push = this.pushAt(c.x, c.y); vx += push[0]; vy += push[1];
  c.body.vx = vx; c.body.vy = vy;
  if (this.cheats && this.cheats.noclip) { c.body.x += vx * dt; c.body.y += vy * dt; } else c.body.update(dt, this.map);
  c.x = c.body.x; c.y = c.body.y; c.vx = vx; c.vy = vy; this.pushOutStatics(c);
  // showboat
  if (I.showboat && c.boatCd <= 0 && c.boatT <= 0 && c.slideT <= 0) { c.boatT = .6; c.boatCd = 3; c.boatCancel = false; c.boatPose = ['cheer', 'hips', 'wave'][(c.boatN = (c.boatN || 0) + 1) % 3]; }
  if (c.boatT > 0) { c.boatT -= dt; if (c.boatT <= 0) this.finishShowboat(c); }
  // bomb
  if (I.bomb && (c.bombs > 0 || (this.cheats && this.cheats.infBombs))) { if (!(this.cheats && this.cheats.infBombs)) c.bombs--; this.showstopper(c); }
  // weapons
  if (firing && c.slideT < .2) this.fireWeapon(c, dt);
  this.addonStep(c, dt);
  if (c.wpn === 'laser' && !c.laserOn) c.laserHum = 0;
};
const norm2 = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
WP.noClipMap = function () { return this.map; };
WP.finishShowboat = function (c) {
  if (c.boatCancel) { c.boatCancel = false; return; }
  let n = 0, m = 0; for (const e of this.enemies) if (e.alive && e.count !== false) { const d = MT.hyp(e.x - c.x, e.y - c.y); if (d < 64) n++; if (d < 32) m++; }
  const gain = Math.min(30, 4 + 3 * n + 3 * m); this.addRating(gain); c.boatGain += gain;
  this.event('showboat', { slot: c.slot, gain, x: c.x, y: c.y, n });
};
WP.showstopper = function (c) {
  this.game.flash('#ffffff', .12, .7); this.game.particles.ring(c.x, c.y, 8, 190, '#ffffff', .5); this.game.particles.glints(c.x, c.y, 14, 30, '#fff');
  if (this.mode !== 'client') { for (const e of this.enemies) if (e.alive && !e.hidden) { this.hurtEnemy(e, 25, { slot: c.slot }, { quiet: true, ang: MT.angTo(c, e) }); if (e.alive) e.stun = Math.max(e.stun || 0, 1); }
  if (this.boss) this.boss.hitAll(this, 30, c.slot); this.fShots.clear(); this.lobs.length = 0; this.addRating(8); } this.event('bomb', { slot: c.slot, x: c.x, y: c.y });
  if (!this.session && !this.game.headless) this.game.freeze(.08);
};

// ---- weapons --------------------------------------------------------------------------------------------------------------
WP.fireWeapon = function (c, dt) {
  const w = c.wpn, a = c.aim, mx = c.x + Math.cos(a) * 10, my = c.y + Math.sin(a) * 10, sp = MT.T.bulletSpeed, dmg = this.dm();
  if (w === 'laser') { c.laserOn = true; this.laserStep(c, dt); return; }
  if (c.fireCd > 0) return;
  const shot = (ang, d, col) => { const b = this.pShots.fire({ x: mx, y: my, z: 14, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 2.5, life: .9, team: 'p', color: col || '#ffe066', core: '#fff', dmg: d, data: { owner: c.slot, w } }); return b; };
  if (w === 'blaster') { shot(a, dmg); c.fireCd = 1 / MT.T.fireRate; this.event('shot', { slot: c.slot, w }); }
  else if (w === 'spread') { for (const o of [-.227, 0, .227]) shot(a + o, dmg, '#7affb0'); c.fireCd = 1 / 8; this.event('shot', { slot: c.slot, w }); }
  else if (w === 'rockets') { this.rockets.push({ id: this.nextId++, x: mx, y: my, a, v: 180, t: 0, owner: c.slot, dmg }); c.fireCd = 1 / 3.5; this.event('shot', { slot: c.slot, w }); }
  else if (w === 'popcorn') {
    let dist = 90; if (c.intent && c.intent.mouseAt) dist = Math.min(90, MT.hyp(c.intent.mouseAt[0] - c.x, c.intent.mouseAt[1] - c.y));
    const tx = c.x + Math.cos(a) * dist, ty = c.y + Math.sin(a) * dist; const l = this.lob('bag', mx, my, tx, ty, { time: .55, owner: c.slot }); l.dmg = dmg; c.fireCd = 1 / 2.5; this.event('shot', { slot: c.slot, w });
  }
};
WP.laserStep = function (c, dt) {
  const a = c.aim, ox = c.x + Math.cos(a) * 10, oy = c.y + Math.sin(a) * 10; let len = 0;
  for (; len < 400; len += 4) { const x = ox + Math.cos(a) * len, y = oy + Math.sin(a) * len; if (this.map.heightAt(x, y) > 10) break; }
  c.laserLen = len; c.laserA = a;
  const dx = Math.cos(a), dy = Math.sin(a);
  for (const e of this.enemies) {
    if (!e.alive || e.hidden || e.invuln) continue; const px = e.x - ox, py = e.y - oy, t = px * dx + py * dy; if (t < 0 || t > len + e.r) continue;
    const d = Math.abs(px * dy - py * dx); if (d < e.r + 2) this.hurtEnemy(e, 16 * dt * this.dm(), { slot: c.slot }, { quiet: true, ang: a });
  }
  if (this.boss) this.boss.hitRay(this, ox, oy, a, len, 16 * dt * this.dm(), c.slot);
  c.laserHum = (c.laserHum || 0) - dt; if (c.laserHum <= 0) { c.laserHum = .12; this.event('laser', { slot: c.slot }); }
  if (MT.fxr() < .3) this.game.particles.sparks(ox + dx * len, oy + dy * len, 10, 1);
};
WP.addonStep = function (c, dt) {
  if (c.addons.records > 0) {
    c.recA = (c.recA || 0) + 4.2 * dt;
    for (let k = 0; k < 2; k++) {
      const ang = c.recA + k * Math.PI, rx = c.x + Math.cos(ang) * 26, ry = c.y + Math.sin(ang) * 26;
      for (const e of this.enemies) { if (!e.alive || e.hidden || e.invuln) continue; if (MT.hyp(e.x - rx, e.y - ry) < e.r + 5 && !(e.recCd > this.time)) { e.recCd = this.time + .15; this.hurtEnemy(e, 2 * this.dm(), { slot: c.slot }, { ang }); } }
      for (const b of this.fShots.list) if (!b.dead && SMALL_FOE[b.kind] && MT.hyp(b.x - rx, b.y - ry) < b.r + 6) { b.dead = true; this.game.particles.sparks(b.x, b.y, 12, 3); }
      if (this.boss) this.boss.hitCircle(this, rx, ry, 5, 2 * this.dm() * dt * 3, c.slot);
    }
  }
  if (c.addons.shield > 0) for (const e of this.enemies) { if (!e.alive || e.hidden || e.invuln) continue; if (MT.hyp(e.x - c.x, e.y - c.y) < e.r + 14 && !(e.shCd > this.time)) { e.shCd = this.time + .2; this.hurtEnemy(e, 1, { slot: c.slot }, { ang: MT.angTo(c, e) }); } }
  if (c.addons.speed > 0 && MT.hyp(c.vx, c.vy) > 40 && MT.fxr() < .3) c.ghostT = .2;
};

// ---- projectiles --------------------------------------------------------------------------------------------------------
WP.targetList = function () {
  const t = []; for (const e of this.enemies) if (e.alive && !e.hidden && !e.invuln) t.push(e);
  if (this.boss) for (const p of this.boss.hitParts()) t.push(p);
  return t;
};
WP.updateProjectiles = function (dt) {
  this.pShots.update(dt, this.map); this.fShots.update(dt, this.map);
  for (const b of this.fShots.list) { if (b.kind === 'card') b.spinA = (b.spinA || 0) + dt * 10; if (b.kind === 'shell' && b.dead) { /* handled in onWall */ } }
  // player bolts vs targets
  const targets = this.targetList();
  this.pShots.hit(targets, (b, t) => {
    const ang = Math.atan2(b.vy, b.vx), owner = b.data.owner;
    if (t.isPart) t.boss.hitPart(this, t, b.dmg, owner, ang); else this.hurtEnemy(t, b.dmg, { slot: owner }, { ang });
  }, 'p');
  // rockets
  for (const k of this.rockets) {
    k.t += dt; k.v = Math.min(300, k.v + 130 * dt); k.x += Math.cos(k.a) * k.v * dt; k.y += Math.sin(k.a) * k.v * dt;
    if (MT.fxr() < .8) this.game.particles.smoke(k.x - Math.cos(k.a) * 4, k.y - Math.sin(k.a) * 4, 12, 1, { size: 3 });
    let boom = k.t > .9 || this.map.heightAt(k.x, k.y) > 8;
    if (!boom) for (const t of targets) if (MT.hyp(t.x - k.x, t.y - k.y) < (t.r || 8) + 3) { boom = true; if (t.isPart) t.boss.hitPart(this, t, 4 * this.dm(), k.owner, k.a); else this.hurtEnemy(t, 4 * this.dm(), { slot: k.owner }, { ang: k.a, quiet: true }); break; }
    if (boom) { k.dead = true; this.explode(k.x, k.y, 24, 0, 3 * this.dm(), k.owner); this.event('rocketBoom', { x: k.x, y: k.y }); }
  }
  this.rockets = this.rockets.filter(k => !k.dead);
  // lobs: bags, tomatoes, tots, shells-in-air
  for (const l of this.lobs) {
    l.t += dt; l.vz -= 260 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
    if (l.z <= 0 && l.t > .05) {
      l.dead = true;
      if (l.kind === 'bag') { this.explode(l.x, l.y, 18, 0, 2 * (l.dmg || 1), l.owner, { size: .6 }); for (let i = 0; i < 6; i++) { const a = i / 6 * MT.TAU; this.pShots.fire({ x: l.x, y: l.y, z: 10, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2.5, life: .35, team: 'p', pierce: true, color: '#fff2b0', core: '#fff', dmg: 1.5 * (l.dmg || 1), data: { owner: l.owner, w: 'popcorn' } }); } this.event('pop', { x: l.x, y: l.y }); }
      else if (l.kind === 'tomato') this.splat(l.x, l.y, 'tomato');
      else if (l.kind === 'tot') { this.splat(l.x, l.y, 'tot'); for (let i = 0; i < 6; i++) this.foeShot(l.x, l.y, i / 6 * MT.TAU + .3, 80, 'shard', { life: 1.4, z: 8 }); }
    }
  }
  this.lobs = this.lobs.filter(l => !l.dead);
  // foe shots vs contestants
  for (const b of this.fShots.list) {
    if (b.dead) continue;
    for (const c of this.cs) {
      if (c.state !== 'alive') continue; const d = MT.hyp(b.x - c.x, b.y - c.y);
      if (d < b.r + 4.5) { b.dead = true; if (b.kind === 'shell') this.explode(b.x, b.y, 16, 1, 1, undefined, { src: 'shell', size: .7 }); else this.hurtContestant(c, b.dmg || 1, b.kind, b.id, Math.atan2(b.vy, b.vx)); break; }
      else if (d < b.r + 7 && !b.near && c.invuln <= 0 && (this.nearCap = (this.nearCap || 0)) < 3) { b.near = true; this.nearCap++; this.addRating(.5); }
    }
  }
  this.nearCap = (this.time % 1 < dt) ? 0 : this.nearCap;
  for (const b of this.fShots.list) if (b.dead && b.kind === 'shell' && !b.done) { b.done = true; this.explode(b.x, b.y, 16, 1, 1, undefined, { src: 'shell', size: .7 }); }
  this.pShots.list = this.pShots.list.filter(b => !b.dead);
};

// ---- enemies ------------------------------------------------------------------------------------------------------------
WP.updateEnemies = function (dt) {
  if (this.freezeE > 0) { this.freezeE -= dt; if (this.cheats) return; }
  if (this.cheats && this.cheats.freezeEnemies) return;
  const hash = this.hash || (this.hash = new E.SpatialHash(24)); hash.build(this.enemies.filter(e => e.alive && !e.noSep));
  const living = this.living().filter(c => c.state === 'alive');
  for (const e of this.enemies) {
    if (!e.alive) continue; const A = MT.ENEMIES[e.kind];
    e.age += dt; e.t += dt; e.flash = Math.max(0, e.flash - dt); e.hpPct = Math.max(0, e.hp / e.max);
    if (e.stun > 0) { e.stun -= dt; e.vx = e.vy = 0; if (A.stunUpdate) A.stunUpdate(this, e, dt); continue; }
    if (e.dropT !== undefined && e.dropT > 0) { e.dropT -= dt; e.hidden = e.dropT > 0; if (e.dropT <= 0) { e.invuln = false; e.hidden = false; this.game.particles.dust(e.x, e.y, 2, 8); if (living.some(c => MT.hyp(c.x - e.x, c.y - e.y) < 14)) for (const c of living) if (MT.hyp(c.x - e.x, c.y - e.y) < 14) this.hurtContestant(c, 1, 'drop', 0, MT.angTo(e, c)); } continue; }
    if (e.leap) { const L = e.leap; L.t += dt / .7; const u = Math.min(1, L.t); e.x = L.x0 + (L.x1 - L.x0) * u; e.y = L.y0 + (L.y1 - L.y0) * u; e.z = Math.sin(u * Math.PI) * 40; e.face = Math.atan2(L.y1 - L.y0, L.x1 - L.x0); if (u >= 1) { e.leap = null; e.z = 0; e.invuln = false; e.entering = false; } e.body.x = e.x; e.body.y = e.y; continue; }
    // target
    let tgt = null, td = 1e9; for (const c of living) { const d = MT.hyp(c.x - e.x, c.y - e.y); if (d < td) { td = d; tgt = c; } }
    e.tgt = tgt; e.td = td;
    if (A.update) A.update(this, e, dt, tgt, td);
    // knockback
    if (e.kb[0] || e.kb[1]) { e.x += e.kb[0] * dt * 3; e.y += e.kb[1] * dt * 3; e.kb[0] *= .85; e.kb[1] *= .85; if (Math.abs(e.kb[0]) + Math.abs(e.kb[1]) < 2) e.kb = [0, 0]; }
    // separation
    if (!e.noSep) hash.near(e.x, e.y, 10, o => { if (o === e || !o.alive) return; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || .1; if (d < 10) { e.x += dx / d * (10 - d) * .3; e.y += dy / d * (10 - d) * .3; } });
    // walls
    if (e.entering) {
      if (e.x > 16 + e.r && e.x < 352 - e.r && e.y > 16 + e.r && e.y < 224 - e.r) e.entering = false;
    } else if (!e.noWall && A.collide !== false) {
      e.body.x = e.x; e.body.y = e.y; e.body.vx = 0; e.body.vy = 0; e.body.update(0, this.map); e.x = e.body.x; e.y = e.body.y;
      e.x = MT.clamp(e.x, 16 + e.r, 352 - e.r); e.y = MT.clamp(e.y, 16 + e.r, 224 - e.r);
    }
    if (!e.noPush) { const p = this.pushAt(e.x, e.y); e.x += p[0] * dt; e.y += p[1] * dt; }
    // contact damage
    if (A.contact && !e.harmless) for (const c of living) if (MT.hyp(c.x - e.x, c.y - e.y) < e.r + c.r * .75) this.hurtContestant(c, Math.max(0, Math.round(A.contact * MT.T.contactDmg)) || 0, 'contact', e.id, MT.angTo(e, c));
  }
  this.enemies = this.enemies.filter(e => e.alive || (e.deadT = (e.deadT || 0) + dt) < 0);
};
// shared enemy movement helpers (enemy speed multipliers applied)
MT.eSpeed = function (sp) { return sp * MT.T.enemySpeed * MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'].es; };
MT.moveToward = function (w, e, tx, ty, sp, dt) { const dx = tx - e.x, dy = ty - e.y, L = Math.hypot(dx, dy) || 1; e.vx = dx / L * sp; e.vy = dy / L * sp; e.x += e.vx * dt; e.y += e.vy * dt; e.face = Math.atan2(dy, dx); };

// ---- pickups -----------------------------------------------------------------------------------------------------------------
WP.updatePickups = function (dt) {
  const clear = this.phase === 'clear' || this.phase === 'exit';
  for (const p of this.pickups) {
    p.t += dt; if (p.ttl < 1e8) p.ttl -= dt; if (p.ttl <= 0) { p.dead = true; continue; }
    if (p.z > 0 || p.vz > 0) { p.vz -= 260 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.z <= 0) { p.z = 0; p.vz = Math.abs(p.vz) > 50 ? -p.vz * .35 : 0; p.vx *= .5; p.vy *= .5; } p.x = MT.clamp(p.x, 20, 348); p.y = MT.clamp(p.y, 20, 220); }
    const push = this.pushAt(p.x, p.y); if (push[0] || push[1]) { p.x += push[0] * dt; p.y += push[1] * dt; if (p.x < 6) p.x += 372; if (p.x > 374) p.x -= 372; }
    let best = null, bd = 1e9;
    for (const c of this.cs) { if (c.state !== 'alive' && c.state !== 'walkin') continue; const d = MT.hyp(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
    if (!best) continue;
    if (clear && p.cash && bd < 60) { const k = 90 * dt / (bd || 1); p.x += (best.x - p.x) * k * .5 + (best.x - p.x) / bd * 60 * dt; p.y += (best.y - p.y) * k * .5 + (best.y - p.y) / bd * 60 * dt; }
    if (p.caged && !this.keyCage.open) continue;
    if (bd < best.r + p.r && (p.z < 14)) { if (this.mode === 'server') continue; this.collect(best, p); }
  }
  this.pickups = this.pickups.filter(p => !p.dead);
  if (this.puddles) { for (const p of this.puddles) p.t -= dt; this.puddles = this.puddles.filter(p => p.t > 0); }
  for (const d of this.decals) d.t -= dt; this.decals = this.decals.filter(d => d.t > 0);
  for (const p of this.pops) p.t -= dt; this.pops = this.pops.filter(p => p.t > 0);
};
WP.pushAt = function (x, y) { let px = 0, py = 0; for (const h of this.hazards) if (h.push) { const v = h.push(x, y); px += v[0]; py += v[1]; } return [px, py]; };

// ---- doors ----------------------------------------------------------------------------------------------------------------------
WP.setDoorCells = function (dn, id) { for (const [cx, cy] of MT.DOORS[dn].cells) this.map.set(cx, cy, id); };
WP.updateDoors = function (dt) {
  for (const dn in this.doors) {
    const d = this.doors[dn]; d.t += dt;
    if (d.state === 'exit') continue;
    if (d.state === 'closed') { if (d.queue.length && d.queue[0].at - this.time < .35) { d.state = 'opening'; d.t = 0; this.event('doorOpen', { door: dn }); } }
    else if (d.state === 'opening') { if (d.t >= .35) { d.state = 'open'; d.t = 0; d.hold = 0; } }
    else if (d.state === 'open') {
      let spawned = 0;
      while (d.queue.length && d.queue[0].at <= this.time && spawned < 2) { const q = d.queue.shift(); this.spawnAtDoor(dn, q); spawned++; }
      if (!d.queue.length) { d.hold += dt; if (d.hold > .6) { d.state = 'closing'; d.t = 0; } } else d.hold = 0;
    } else if (d.state === 'closing') { if (d.t >= .3) { d.state = 'closed'; d.t = 0; this.game.particles.dust(MT.DOORS[dn].x, MT.DOORS[dn].y, 4, 6); this.event('doorSlam', { door: dn }); } }
  }
  for (let i = this.spawnQ.length - 1; i >= 0; i--) { const q = this.spawnQ[i]; if (q.at <= this.time) { this.spawnQ.splice(i, 1); this.spawnWhere(q); } }
};
WP.openExits = function () {
  for (const dn in (this.rm.exits || {})) { const d = this.doors[dn]; d.state = 'exit'; d.exit = this.rm.exits[dn]; this.setDoorCells(dn, 0); }
  this.event('exitsOpen', {});
};

// ---- waves & phases ----------------------------------------------------------------------------------------------------
WP.startWave = function (i) {
  const w = this.rm.waves[i]; this.waveI = i; this.waveT = this.time;
  for (const s of (w.spawn || [])) { const [door, kind, n, gap] = s; const key = this.rm.key; this.queueSpawn(door, kind, n, gap); if (key && key.rule === 'carrier' && key.kind === kind && i === (key.wave !== undefined ? key.wave : this.rm.waves.length - 1)) this.markCarrier(door, kind); }
  for (const it of (w.items || [])) this.dropItem(it[0], it[1]);
  if (w.script && MT.SCRIPTS[w.script]) MT.SCRIPTS[w.script](this);
  this.event('wave', { i, n: this.rm.waves.length });
};
WP.markCarrier = function (door, kind) {
  const nth = this.rm.key.nth || 1; let seen = 0;
  const arr = DOORS_OK[door] ? this.doors[door].queue : this.spawnQ;
  const list = arr.filter(q => q.kind === kind); const q = list[Math.min(list.length, nth) - 1]; if (q) q.carryKey = true;
};
WP.dropItem = function (kind, where) {
  let x = 184, y = 120, fixed = false, o = {};
  if (Array.isArray(where)) { [x, y] = MT.cellXY(where[0], where[1]); fixed = true; o.pedestal = true; }
  else if (where === 'drop') { let t = 0; do { x = 40 + MT.R.drops() * 288; y = 40 + MT.R.drops() * 160; t++; } while (t < 20 && this.living().some(c => MT.hyp(c.x - x, c.y - y) < 40)); o.z = 90; }
  const k = ['bomb', 'life'].includes(kind) ? kind : 'cap'; o.fixed = fixed; if (k === 'cap') o.w = kind; if (!fixed) o.ttl = 14;
  const p = this.addPickup(k, x, y, o); if (p && o.z) { p.z = o.z; }
  return p;
};
WP.runWaves = function (dt) {
  const rm = this.rm, tw = this.time - this.time0;
  for (const it of this.itemQ) if (!it.done && tw >= it[0] || (!it.done && it.at !== undefined && tw >= it.at)) { it.done = true; this.dropItem(it.kind, it.where); }
  if (this.survive) return this.runSurvive(dt);
  if (rm.green) return this.runGreen(dt);
  const nextI = this.waveI + 1;
  if (nextI < rm.waves.length) {
    const w = rm.waves[nextI]; const since = nextI === 0 ? tw : this.time - this.waveT; let go = false;
    if (nextI === 0) go = since >= (w.at || 0); else { if (w.at !== undefined && since >= w.at) go = true; if (w.left !== undefined && this.alive() <= w.left) go = true; if (w.at === undefined && w.left === undefined) go = true; }
    if (go) this.startWave(nextI);
  } else if (!this.wavesDone) this.wavesDone = true;
  if (this.wavesDone && this.alive() === 0 && !this.scriptBusy) this.roomClear();
};
WP.runSurvive = function (dt) {
  const s = this.survive, rm = this.rm; s.t += dt; const tw = s.t;
  s.acc = s.acc || { g: 0, c: 0, p: 0 };
  if (tw < s.len) {
    s.acc.g += dt; s.acc.c += dt; s.acc.p += dt;
    if (s.acc.g >= 1.2) { s.acc.g = 0; for (const d of 'NESW') this.queueSpawn(d, 'goon', 1, .1); }
    if (s.acc.c >= 4) { s.acc.c = 0; this.queueSpawn(MT.pickOf('spawn', ['N', 'E', 'S', 'W']), 'clapbot', 2, .2); }
    if (s.acc.p >= 7) { s.acc.p = 0; this.queueSpawn(MT.pickOf('spawn', ['N', 'E', 'S', 'W']), 'popper', 1, .2); }
    if (tw >= 20 && this.keyCage && !this.keyCage.open) { this.keyCage.open = true; this.event('cageOpen', {}); }
  } else if (!s.last) { s.last = true; this.queueSpawn('all', 'goon', 4, .2); this.wavesDone = true; }
  if (s.last && this.alive() === 0) this.roomClear();
};
WP.roomClear = function () {
  if (this.phase !== 'waves') return;
  this.phase = 'clear'; this.phaseT = 0; this.cleared = true; this.clearTime = this.time - this.time0; this.fShots.clear();
  const ep = (MT.run && MT.run.ep) || 1, fast = this.rm.par && this.clearTime < this.rm.par;
  for (const c of this.cs) if (c.state === 'alive') { const amt = Math.round(1000 * ep * this.rat.X * (fast ? 1.5 : 1)); this.addCash(c, amt); }
  if (this.rm.key && this.rm.key.rule === 'final' && !this.keyDropped) { this.keyDropped = true; this.addPickup('key', 184, 120, { fixed: true, vz: 100 }); }
  this.event('clear', { fast, time: this.clearTime });
};
WP.stepPhase = function (dt) {
  const rm = this.rm;
  if (this.phase === 'enter') { if (this.phaseT >= 1.2) { this.phase = rm.boss ? 'bossIntro' : 'intro'; this.phaseT = 0; this.event(rm.boss ? 'bossIntro' : 'roomIntro', { room: rm.id }); } }
  else if (this.phase === 'intro') { if (this.phaseT >= (this.demo ? .3 : (this.rm.green ? 1 : 2))) { this.phase = 'waves'; this.phaseT = 0; this.time0 = this.time; this.event('roomStart', {}); } }
  else if (this.phase === 'bossIntro') { if (this.boss.introUpdate) this.boss.introUpdate(this, dt); if (this.bossIntroDone || this.phaseT > 4.2) { this.phase = 'boss'; this.phaseT = 0; this.time0 = this.time; this.boss.start(this); } }
  else if (this.phase === 'waves') this.runWaves(dt);
  else if (this.phase === 'boss') { this.boss.update(this, dt); if (this.boss.dead) { this.phase = 'bossDeath'; this.phaseT = 0; this.boss.deathStart(this); } }
  else if (this.phase === 'bossDeath') { this.boss.deathUpdate(this, dt); if (this.phaseT >= 3.2) { this.phase = 'clear'; this.phaseT = 0; this.bossDead = true; this.cleared = true; this.event('clear', { boss: true }); if (this.onBossDone) this.onBossDone(this); } }
  else if (this.phase === 'clear') {
    if (this.phaseT >= 1.5 && !rm.boss) { this.phase = 'exit'; this.phaseT = 0; this.openExits(); this.event('exit', {}); }
  } else if (this.phase === 'exit') {
    if (this.exitPicked) { this.exitT -= dt; if (this.exitT <= 0 && this.onExit) { const cb = this.onExit; this.onExit = null; cb(this.exitPicked, this.doors[this.exitPicked].exit); } }
    else {
      for (const dn in this.doors) { const d = this.doors[dn]; if (d.state !== 'exit') continue; const D = MT.DOORS[dn]; for (const c of this.cs) if (c.state === 'alive' && MT.hyp(c.x - D.x, c.y - D.y) < 14) { this.exitPicked = dn; this.exitT = .8; this.event('exitPicked', { door: dn }); break; } if (this.exitPicked) break; }
      this.hurryT += dt;
      if (this.hurryT > 25 && !this.hurried) { this.hurried = true; this.event('hurry', {}); }
      if (this.hurried) { this.hurryAcc = (this.hurryAcc || 0) + dt; if (this.hurryAcc >= 6) { this.hurryAcc = 0; for (const dn in this.doors) if (this.doors[dn].state !== 'exit') this.queueSpawn(dn, 'clapbot', 4, .2); } }
    }
  }
};

// ---- the step ------------------------------------------------------------------------------------------------------------
WP.step = function (dt) {
  if (this.mode === 'client') return this.mirrorStep(dt);
  this.time += dt; this.phaseT += dt;
  for (const c of this.cs) if (c.state !== 'gone') c.intent = (this.phase === 'enter' || this.phase === 'bossIntro' && this.bossIntroLock) ? { move: [0, 0] } : this.getIntent(c);
  for (const c of this.cs) if (c.state !== 'gone') this.updateContestant(c, dt);
  this.updateEnemies(dt);
  this.updateProjectiles(dt);
  for (const h of this.hazards) h.update(dt, this);
  this.updatePickups(dt);
  this.updateDoors(dt);
  this.stepPhase(dt);
  this.tickRatings(dt);
  if (this.keyCage && this.keyCage.open && !this.keyCage.gone) { this.keyCage.gone = true; }
  this.shakeT = Math.max(0, this.shakeT - dt);
  if (!MT.cfg.skipRigs) this.animate(dt);
  if (this.cheats && this.cheats.god) for (const c of this.cs) if (c.state === 'alive') c.invuln = Math.max(c.invuln, .1);
  if (this.onAllOut && this.cs.length && this.cs.every(q => q.state === 'out' || q.state === 'gone') && !this.allOutFired) { this.allOutFired = true; this.onAllOut(); }
};

// ---- the Green Room (bonus) ----------------------------------------------------------------------------------------------
WP.runGreen = function (dt) {
  const tw = this.time - this.time0, g = this.green = this.green || { acc: 0, flash: 3, statue: false, done: false, flashT: 0 };
  g.acc += dt * 4; while (g.acc >= 1) { g.acc--; const x = 30 + MT.R.drops() * 308, y = 30 + MT.R.drops() * 180; const k = MT.R.drops(); this.addPickup(k < .12 ? 'prize' : k < .5 ? 'bill' : k < .8 ? 'stack' : 'bar', x, y, { z: 80, ttl: 8 }); }
  g.flash -= dt; if (g.flash <= 0) { g.flash = 3; this.game.flash('#ffffff', .15, .5); this.event('camFlash', {}); }
  if (tw >= 30 && !g.statue) { g.statue = true; this.addPickup('statue', 184, 120, { fixed: true, vz: 100 }); this.event('statueRise', {}); }
  if ((tw >= 40 || this.statuette) && !g.done) { g.done = true; this.phase = 'clear'; this.phaseT = 0; this.cleared = true; if (this.onDone) this.onDone(); }
};
