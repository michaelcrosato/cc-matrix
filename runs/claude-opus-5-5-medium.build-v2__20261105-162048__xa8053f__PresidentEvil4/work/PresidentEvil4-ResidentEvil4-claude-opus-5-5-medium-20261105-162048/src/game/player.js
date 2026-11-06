// Max Ransom. Reads an Intent, never the keyboard. Plant your feet: you cannot move while aiming.
import { CharacterController, glowMaterial, SpringChain, THREE, toonMaterial, PALETTE, setLookLayer } from '../../pixel-engine.js';
import { TUNING } from '../data/tuning.js';
import { WEAPONS, GRENADES } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { BARKS } from '../data/dialogue.js';
import { ammoOf, bestHerb, count, diff, ownedWeapons, removeItem, statsOf, takeAmmo, useHerb } from '../core/run.js';
import { device, rumble } from '../core/device.js';
import { castShot, pointAt } from './combat.js';
import { Humanoid } from './actor.js';
const v = new THREE.Vector3(), v2 = new THREE.Vector3();
const MODEL_OF = { pistol: 'w-pistol', scatter: 'w-scatter', rifle: 'w-rifle', harpoon: 'w-harpoon' };
const FIRE_SND = { pistol: 'pistol', scatter: 'scatter', rifle: 'rifle', harpoon: 'harpoon' };
const CAM = { explore: { dist: 4.0, up: 0.45, side: 0.55, fov: 55 }, aim: { dist: 2.9, up: 0.1, side: 0.95, fov: 42 }, scope: { dist: 0.3, up: 0.28, side: 0.25, fov: 16 } };
export class Player {
  constructor(area, x, z, o = {}) {
    this.area = area; const P = area.ctx.physics; this.index = o.index ?? 0; this.floor = o.floor ?? 0; this.remote = !!o.remote; this.model = o.model ?? 'max'; this.god = false; this.noclip = false;
    this.pos = new THREE.Vector3(x, this.floor * area.floorH, z); this.prev = this.pos.clone(); this.vel = new THREE.Vector3(); this.yaw = o.yaw ?? Math.PI; this.camYaw = this.yaw; this.camPitch = 0; this.modelYaw = this.yaw;
    if (!this.remote) { this.body = new CharacterController(P, { position: [x, this.pos.y, z], speed: 12, radius: 0.3, halfHeight: 0.5 }); P.tag(this.body.collider, 'noCamera', 'player'); }
    this.h = new Humanoid(area.ctx, this.model, { layered: true, palette: o.palette }); this.root = this.h.root; this.fire = 0; this.reloadT = 0; this.action = null; this.actionT = 0; this.locked = false; this.invuln = 0; this.dead = false; this.limpets = 0; this.slowT = 0; this.shake = 0; this.aiming = false; this.recoil = 0; this.aimK = 0; this.sway = 0; this.lastDamage = area.ctx.time; this.hitDir = null; this.hitDirT = 0; this.shots = 0; this.lowT = 0; this.heartT = 0; this.gripBy = null; this.chainWeapon = null; this.reach = 1; this.dot = new THREE.Vector3(); this.dotZone = null; this.dotOn = false; this.shoulder = 1; this.flash = 0;
    this.laser = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1), glowMaterial(PALETTE.red)); this.laser.castShadow = false; this.laser.visible = false; area.ctx.scene.add(this.laser);
    this.setWeaponModel(); this.h.play('Idle'); if (this.model === 'max') { this.knifeProp = this.h.attach('HandL', 'w-knife', { as: 'knife' }); this.knifeProp.visible = false; }
    // Scarf: spring chain tail. The camera sits behind her all game: her back is her best side.
    this.scarf = new SpringChain({ segments: 5, length: 0.11 }); this.scarfMeshes = [];
    const col = o.scarf ?? PALETTE.red; const mat = toonMaterial(col);
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.13 - i * 0.012), mat); m.castShadow = true; setLookLayer(m, 'actors'); area.ctx.scene.add(m); this.scarfMeshes.push(m); }
    this.light = area.ctx.lights.request({ follow: this.root, offset: [0.3, 1.5, 0.9], color: 0xffe0a0, intensity: area.fillLight ?? 0.7, radius: 5, priority: 8 });
    this.cam = { ...CAM.explore }; this.camTarget = new THREE.Vector3();
    this.h.update(0);
  }
  get run() { return this.area.run; }
  get weapon() { return this.run.weapon; }
  get stats() { return statsOf(this.run, this.weapon); }
  get wstate() { return this.run.weapons[this.weapon]; }
  setWeaponModel() { this.h.detach('gun'); if (!this.remote || true) { const id = this.area.weaponOf?.(this) ?? this.weapon; this.h.attach('HandR', MODEL_OF[id] ?? 'w-pistol', { as: 'gun' }); this.gunId = id; } }
  teleport(x, z, floor = this.floor, yaw = null) { this.floor = floor; this.pos.set(x, floor * this.area.floorH, z); this.prev.copy(this.pos); this.vel.set(0, 0, 0); this.body?.teleport([x, this.pos.y, z]); if (yaw != null) { this.camYaw = this.yaw = this.modelYaw = yaw; } }
  /** Fixed step. */
  fixed(dt, i) {
    const A = this.area; if (this.remote) return; this.prev.copy(this.pos);
    if (this.invuln > 0) this.invuln -= dt; if (this.fire > 0) this.fire -= dt; if (this.slowT > 0) this.slowT -= dt; this.hitDirT = Math.max(0, this.hitDirT - dt); this.flash = Math.max(0, this.flash - dt);
    if (i.absYaw != null) { this.camYaw = i.absYaw; i.absYaw = null; } if (i.absPitch != null) { this.camPitch = i.absPitch; i.absPitch = null; }
    let mx = 0, mz = 0;
    if (this.dead) { this.drive(dt, 0, 0); return; }
    if (A.qte.active && A.qte.owner === this) { A.qte.feed(i); this.drive(dt, 0, 0); return; }
    if (this.locked) { this.aiming = false; this.drive(dt, 0, 0); return; }
    if (this.reloadT > 0) { this.reloadT -= dt * TUNING.reloadSpeed; if (this.reloadT <= 0) this.finishReload(); }
    if (this.action) { this.tickAction(dt, i); return; }
    // Aiming
    const canAim = i.aim && !this.grabbed && !this.noAim; const wasAim = this.aiming; this.aiming = canAim; if (this.aiming && !wasAim) this.area.onAim?.(this);
    if (i.turn && !this.aiming) { this.startAction('quickturn', 0.3); this.turnFrom = this.camYaw; this.turnTo_ = this.camYaw + Math.PI; i.turn = false; return; }
    if ((i.next || i.prev || i.slot >= 0) && !this.dameMode) this.cycleWeapon(i);
    if (i.shoulder) { this.shoulder = -this.shoulder; i.shoulder = false; }
    if (i.reload) { if (!this.dameMode) this.startReload(); i.reload = false; }
    if (i.heal) { this.quickHeal(); i.heal = false; }
    if (i.command) { A.command?.(); i.command = false; }
    if (this.aiming && !this.dameMode) {
      if (i.throw) { this.throwGrenade(); i.throw = false; }
      if ((i.fire || i.firePressed) && this.fire <= 0 && this.reloadT <= 0) this.shoot();
      else if (i.firePressed && this.reloadT > 0) { /* still reloading */ }
    } else i.throw = false;
    if (i.knife && this.dameMode) { i.knife = false; A.dameWhack?.(this); }
    if (i.knife && !this.aiming) { this.startAction('knife', 0.4); i.knife = false; this.h.play; A.ctx.audio.play('knife'); this.knifeHit = false; return; }
    i.knife = false;
    if (i.action) { i.action = false; if (A.interact.fire(this)) return; }
    // Move
    const tilt = Math.min(1, Math.hypot(i.moveX, i.moveY)); let speed = tilt < 0.55 ? 1.6 * (TUNING.walkSpeed / 3) : TUNING.walkSpeed; if (i.run && tilt > 0.1) speed = TUNING.runSpeed;
    if (this.aiming) speed = TUNING.aimWalkSpeed; if (this.dameMode) speed = i.run ? 3.2 : 2.2; if (this.noMove) speed = 0;
    if (this.slowT > 0) speed *= 0.6;
    if (this.shallowK) speed *= this.shallowK;
    if (tilt > 0.01 && speed > 0) {
      const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw), rx = -Math.cos(this.camYaw), rz = Math.sin(this.camYaw);
      const wx = rx * i.moveX + fx * i.moveY, wz = rz * i.moveX + fz * i.moveY, L = Math.max(1, Math.hypot(wx, wz)); mx = (wx / L) * speed * Math.min(1, tilt * 1.2); mz = (wz / L) * speed * Math.min(1, tilt * 1.2);
    }
    this.drive(dt, mx, mz);
    if (this.aiming) this.yaw = this.camYaw; else if (Math.hypot(mx, mz) > 0.1) { const want = Math.atan2(mx, mz); let d = want - this.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; this.yaw += Math.sign(d) * Math.min(Math.abs(d), (540 * Math.PI / 180) * dt); }
  }
  /** Accelerate to (mx,mz) m/s and move the body. */
  drive(dt, mx, mz, belts = true) {
    const A = this.area, acc = 18 * dt; const dx = mx - this.vel.x, dz = mz - this.vel.z, L = Math.hypot(dx, dz); if (L > acc) { this.vel.x += (dx / L) * acc; this.vel.z += (dz / L) * acc; } else { this.vel.x = mx; this.vel.z = mz; }
    let bx = 0, bz = 0; if (belts) { const b = A.level?.beltAt(this.pos.x, this.pos.z, this.floor); if (b) { bx = b[0]; bz = b[1]; } }
    if (this.noclip) { this.pos.x += (this.vel.x + bx) * dt * 2; this.pos.z += (this.vel.z + bz) * dt * 2; this.body.teleport([this.pos.x, this.pos.y, this.pos.z]); return; }
    v.set((this.vel.x + bx) / 12, 0, (this.vel.z + bz) / 12); this.body.setInput(v, false, false); this.body.fixedUpdate(dt); const f = this.body.feet; this.pos.copy(f);
    if (A.level) this.shallowK = A.level.isShallow(this.pos.x, this.pos.z) ? 0.7 : (A.waterK ?? 1);
  }
  // ---- Fire
  aimRay(o, d) {
    const c = this.cam, cy = this.camYaw, cp = this.camPitch; d.set(Math.sin(cy) * Math.cos(cp), Math.sin(cp), Math.cos(cy) * Math.cos(cp));
    if (this.rigPos) { o.copy(this.rigPos).addScaledVector(d, Math.max(0, c.dist - 0.4)); } else { o.copy(this.pos); o.y += 1.5; }
    return d;
  }
  shoot() {
    const A = this.area, W = this.stats, run = this.run;
    if (this.wstate.ammo <= 0) { this.fire = 0.3; A.ctx.audio.play('dryclick'); if (ammoOf(run, this.weapon) > 0 || A.infiniteAmmo) this.startReload(); else A.barkMax(BARKS.max.empty); return; }
    if (!A.infiniteAmmo) this.wstate.ammo--;
    this.fire = W.interval / TUNING.fireRate; run.stats.shots++; this.h.playUpper(W.clip === 'Long' ? 'FireLong' : 'FirePistol', { restart: true, fade: 0.02 }); this.upperT = 0.14; A.ctx.audio.play(FIRE_SND[this.weapon]); A.noise?.(this.pos.x, this.pos.z, 14);
    A.ctx.engine.shake.add(0.12 * A.app.settings.shake); rumble(0.5, 0.3, 90); this.recoil = Math.min(0.08, this.recoil + (W.pellets > 1 ? 0.05 : 0.024));
    const o = v, d = v2; this.aimRay(o, d); const sw = A.ctx.time;
    const swayAmt = W.sway * TUNING.laserSway * 0.003, swx = Math.sin(sw * 1.7) * swayAmt, swy = Math.cos(sw * 1.3) * swayAmt; this.applyAngle(d, swx, swy);
    const muzzle = this.h.jointPos('HandR'); A.fx.shot(muzzle); A.ctx.particles.burst('spark', muzzle, { count: 3 });
    A.fireLocal?.(this, o, d, this.weapon);
    let anyHit = false;
    for (let p = 0; p < W.pellets; p++) {
      const dir = d.clone(); if (W.pellets > 1) { const R = A.rng, a = R.range(0, 6.283), r = Math.tan((W.cone * Math.PI) / 180) * Math.sqrt(R.next()); this.spreadDir(dir, Math.cos(a) * r, Math.sin(a) * r); }
      if (A.resolveShots === false) continue;
      if (A.resolveShot(this, o, dir, W, this.weapon)) anyHit = true;
    }
    if (anyHit) run.stats.hits++;
    if (this.wstate.ammo <= 0 && ammoOf(run, this.weapon) === 0 && !A.infiniteAmmo && this.reloadT <= 0) A.barkMax(BARKS.max.empty, 0.5);
    if (this.weapon === 'harpoon' && this.h.props.gun) { const b = this.h.props.gun.getObjectByName?.('Bolt'); if (b) b.visible = false; }
  }
  spreadDir(d, a, b) { const rx = -Math.cos(this.camYaw), rz = Math.sin(this.camYaw); d.x += rx * a; d.z += rz * a; d.y += b; d.normalize(); }
  applyAngle(d, a, b) { this.spreadDir(d, a, b); }
  startReload() {
    const W = this.stats, st = this.wstate; if (this.reloadT > 0 || st.ammo >= W.mag) return; if (ammoOf(this.run, this.weapon) <= 0 && !this.area.infiniteAmmo) { this.area.ctx.audio.play('dryclick'); this.area.barkMax(BARKS.max.empty, 1); return; }
    this.reloadT = W.reload; this.reloadMax = W.reload; const c = { pistol: 'ReloadPistol', scatter: 'ReloadPump', rifle: 'ReloadBolt', harpoon: 'ReloadBolt' }[this.weapon]; this.h.playUpper(c, { restart: true, timeScale: (40 / 30) / W.reload * TUNING.reloadSpeed }); this.upperT = W.reload / TUNING.reloadSpeed; this.area.ctx.audio.play('reload1'); this.area.ctx.tweens.call(W.reload * 0.5 / TUNING.reloadSpeed, () => this.area.ctx.audio.play('reload2')); this.area.barkMax(BARKS.max.reload, 0.1);
  }
  finishReload() { const W = this.stats, st = this.wstate; const want = W.mag - st.ammo; st.ammo += this.area.infiniteAmmo ? want : takeAmmo(this.run, this.weapon, want); this.area.ctx.audio.play('reload3'); if (this.h.props.gun) { const b = this.h.props.gun.getObjectByName?.('Bolt'); if (b) b.visible = true; } }
  cycleWeapon(i) {
    const list = ownedWeapons(this.run); if (!list.length) return; let k = list.indexOf(this.weapon);
    if (i.slot >= 0) { const id = list[i.slot]; i.slot = -1; if (id) k = list.indexOf(id); else return; } else k = (k + (i.next ? 1 : -1) + list.length) % list.length;
    i.next = i.prev = false; this.setWeapon(list[k]);
  }
  setWeapon(id) { if (id === this.run.weapon) return; this.run.weapon = id; this.reloadT = 0; this.setWeaponModel(); this.upperName = null; this.area.ctx.audio.play('reload1'); }
  quickHeal() { const h = bestHerb(this.run); if (!h || (this.run.health >= this.run.maxHealth && !(this.area.dame && this.area.dame.hp < this.area.dame.maxHp * 0.7))) { this.area.ctx.audio.play('uideny'); return; } useHerb(this.run, h); if (this.area.dame) this.area.dame.hp = Math.min(this.area.dame.maxHp, this.area.dame.hp + ITEMS[h.id].heal * this.area.dame.maxHp); this.area.ctx.audio.play('pickup'); this.area.ctx.particles.burst('sparkle', this.root.position); }
  throwGrenade() {
    const run = this.run, it = run.items.find((x) => ITEMS[x.id].kind === 'grenade'); if (!it) { this.area.ctx.audio.play('uideny'); return; }
    removeItem(run, it); this.upperT = 0.5; this.h.playUpper('Throw', { restart: true }); this.area.ctx.audio.play('kickwhoosh');
    this.area.throwGrenade(this, ITEMS[it.id].grenade, this.dotOn ? this.dot : null);
  }
  // ---- Actions (locked moves)
  startAction(name, t, data = {}) { this.action = name; this.actionT = t; this.actionMax = t; this.actionData = data; if (this.knifeProp) this.knifeProp.visible = name === 'knife'; this.aiming = false; this.vel.set(0, 0, 0); this.upperName = null; const clip = { kick: 'Roundhouse', takedown: 'HipThrow', knife: 'KnifeSlash', door: 'DoorKick', vault: 'Vault', ladder: 'LadderUp', quickturn: 'QuickTurn', push: 'Push', hurt: 'Stagger', knocked: 'KnockedDown', getup: 'GetUp', boost: 'Boost', stamp: 'StampForm', drop: 'Fall', grabbed: 'Grapple', throw: 'Throw' }[name] ?? 'Idle'; this.h.upperName = null; this.h.play(clip, { fade: 0.06, restart: true, timeScale: { kick: 22 / 30 / Math.max(0.1, t), takedown: 24 / 30 / t, knife: 12 / 30 / t, vault: 20 / 30 / t, door: 16 / 30 / t }[name] ?? 1 }); this.clipName = clip; }
  tickAction(dt, i) {
    this.actionT -= dt; const k = 1 - this.actionT / this.actionMax, D = this.actionData; let mx = 0, mz = 0;
    const name = this.action;
    if (name === 'quickturn') { this.camYaw = this.turnFrom + Math.PI * Math.min(1, k); this.yaw = this.camYaw; }
    else if (name === 'knife' && !this.knifeHit && k > 0.3) { this.knifeHit = true; this.area.knifeHit(this); }
    else if (name === 'kick' && !D.done && k > 0.42) { D.done = true; this.area.kickHit(this, D.target, D.kind); }
    else if (name === 'vault' || name === 'ladder' || name === 'drop') {
      this.pos.x = D.fx + (D.tx - D.fx) * k; this.pos.z = D.fz + (D.tz - D.fz) * k; this.pos.y = D.fy + (D.ty - D.fy) * k + (name === 'vault' ? Math.sin(k * Math.PI) * 0.55 : 0);
      this.body.teleport([this.pos.x, this.pos.y, this.pos.z]);
    } else if (name === 'push') { const b = D.prop; b.pos[0] = D.fx + (D.tx - D.fx) * k; b.pos[1] = D.fz + (D.tz - D.fz) * k; b.object.position.set(b.pos[0], 0, b.pos[1]); this.pos.x = D.px + (D.tx - D.fx) * k; this.pos.z = D.pz + (D.tz - D.fz) * k; this.body.teleport([this.pos.x, this.pos.y, this.pos.z]); }
    else if (name === 'door' && !D.done && k > 0.34) { D.done = true; this.area.level.openDoor(D.door, this.pos); this.area.doorKnock(D.door, this); }
    else if (name === 'knocked' && this.actionT <= 0) { this.action = null; this.startAction('getup', 0.55); return; }
    if (['kick', 'hurt', 'takedown', 'knocked'].includes(name)) { const K = D.back ? 2.4 * (1 - k) : 0; mx = (D.back?.[0] ?? 0) * K; mz = (D.back?.[1] ?? 0) * K; }
    if (!['vault', 'ladder', 'drop', 'push'].includes(name)) this.drive(dt, mx, mz, false); else this.vel.set(0, 0, 0);
    if (this.actionT <= 0) { const e = D.onEnd; if (name === 'ladder' || name === 'vault' || name === 'drop') { this.floor = D.toFloor ?? this.floor; this.body.teleport([D.tx, D.ty, D.tz]); this.pos.set(D.tx, D.ty, D.tz); this.prev.copy(this.pos); } this.action = null; this.h.upperName = null; if (this.knifeProp) this.knifeProp.visible = false; if (e) e(); }
  }
  // ---- Damage
  hurt(amount, from, o = {}) {
    const A = this.area; if (this.dead || A.cheatGod || this.god) return false; if (this.invuln > 0 && !o.dot) return false;
    if (A.remoteHurt) { A.remoteHurt(this, amount, from, o); return true; }
    const D = diff(this.run);
    if (o.saw && !o.dodged && D.sawLethal) { this.run.health = 0; this.die('saw'); return true; }
    let dmg = amount * D.dmg * TUNING.damageTaken; this.run.health -= dmg; (this.hurtLog ??= []).push(`${o.by?.type ?? (o.dot ? 'dot' : 'x')}:${Math.round(dmg)}`); if (this.hurtLog.length > 8) this.hurtLog.shift(); this.run.stats.tookDamage += dmg;
    this.lastDamage = A.ctx.time; A.rankOnHurt?.();
    if (!o.dot) { this.invuln = 0.35; A.ctx.audio.play('hurtmax'); A.ctx.engine.shake.add(0.3 * A.app.settings.shake); rumble(0.9, 0.5, 180); this.h.flash(); this.flash = 0.2; if (from) { this.hitDir = Math.atan2(from.x - this.pos.x, from.z - this.pos.z); this.hitDirT = 0.8; }
      if (!this.action && !this.grabbed) { const dx = this.pos.x - (from?.x ?? this.pos.x), dz = this.pos.z - (from?.z ?? this.pos.z), L = Math.hypot(dx, dz) || 1; this.startAction(o.knock ? 'knocked' : 'hurt', o.knock ? 0.9 : 0.28, { back: [dx / L, dz / L] }); } }
    if (this.run.health <= this.run.maxHealth * 0.25 && (this.lowT ?? 0) <= 0) { this.lowT = 12; A.barkMax(BARKS.max.low); }
    if (this.run.health <= 0) { this.run.health = 0; this.die(o.saw ? 'saw' : 'hit'); }
    return true;
  }
  die(why) { const A = this.area; if (this.dead) return; if (A.preventDeath?.(this, why)) return; this.dead = true; this.locked = true; this.aiming = false; this.action = null; this.h.upperName = null; this.h.play('Death', { fade: 0.08 }); A.onPlayerDead?.(this, why); }
  grabbedBy(e) {
    const A = this.area; if (this.grabbed || this.dead || this.action === 'kick' || this.invuln > 0 || A.cheatGod || this.god || A.qte.active) return false;
    this.grabbed = e; this.startAction('grabbed', 99); A.ctx.audio.play('hurtmax');
    A.qte.start({ owner: this, type: 'mash', label: 'BREAK FREE', fill: 8, drain: 0.6, time: 6, onTick: (dt) => this.hurt(6 * dt, e.pos, { dot: true }), onDone: (ok) => { this.grabbed = null; this.action = null; this.invuln = 0.8; if (!e.dead) { e.setState('KNOCKDOWN', 2.2); } } });
    return true;
  }
  startSawDodge(e) {
    const A = this.area; if (A.qte.active || this.dead || this.god || A.cheatGod) return;
    A.qte.start({ owner: this, type: 'press', button: 'dodge', label: 'DODGE', time: TUNING.qteWindow, onDone: (ok) => { if (ok) { this.invuln = 1.2; const dx = this.pos.x - e.pos.x, dz = this.pos.z - e.pos.z, L = Math.hypot(dx, dz) || 1; const tx = this.pos.x + (dz / L) * 2, tz = this.pos.z - (dx / L) * 2; if (A.level.enemyCanStand(tx, tz, this.floor)) { this.startAction('hurt', 0.25, { back: [dz / L, -dx / L] }); } A.ctx.audio.play('kickwhoosh'); } } });
  }
  // ---- Frame
  update(dt) {
    const A = this.area, a = A.ctx.physics.alpha; if (!this.remote) this.root.position.lerpVectors(this.prev, this.pos, a); this.modelYawStep(dt); this.root.rotation.y = this.modelYaw;
    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.lowT = Math.max(0, (this.lowT ?? 0) - dt); this.upperT = Math.max(0, (this.upperT ?? 0) - dt);
    if (!this.dead && !this.action) {
      const up = this.aiming ? (this.stats.clip === 'Long' ? 'AimLong' : 'AimPistol') : null; const overlay = this.upperT > 0 && this.h.upperName;
      if (!overlay) { if (up !== (this.h.upperName ?? null)) this.h.playUpper(up, { fade: 0.1 }); else if (!up && this.h.upperName) this.h.playUpper(null); }
      if (speed > 3.6) { this.h.play('Run', { timeScale: speed / 6 }); this.h.setTimeScale(speed / 6); } else if (speed > 0.4) { this.h.play('Walk', { timeScale: speed / 2 }); this.h.setTimeScale(speed / 2); } else this.h.play(this.lowHealth() ? 'IdleLook' : 'Idle', { timeScale: 1 });
    }
    this.h.update(dt);
    if (this.aiming && this.h.joints.ArmR) { const p = -this.camPitch - this.recoil * 2; for (const j of ['ArmR', 'ArmL']) this.h.joints[j].rotateX(p); this.h.joints.Torso.rotateX(-this.camPitch * 0.25); this.h.joints.Head.rotateX(-this.camPitch * 0.4); }
    this.recoil = Math.max(0, this.recoil - dt * 0.2);
    this.updateScarf(dt);
  }
  lowHealth() { return this.run && this.run.health < this.run.maxHealth * 0.25; }
  modelYawStep(dt) { let d = this.yaw - this.modelYaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; this.modelYaw += d * Math.min(1, 18 * dt); }
  updateScarf(dt) {
    const J = this.h.joints.Torso; J.updateWorldMatrix(true, false); const e = J.matrixWorld.elements;
    const root = [e[12] + e[8] * -0.17 + e[4] * 0.52, e[13] + e[5] * 0.52, e[14] + e[10] * -0.17 + e[6] * 0.52]; const right = [e[0], e[1], e[2]], upv = [e[4], e[5], e[6]], fwd = [-e[8], -e[9], -e[10]];
    this.scarf.update(Math.min(dt, 0.033), root, [right, upv, fwd]); const pts = this.scarf.points;
    this.scarfMeshes.forEach((m, i) => { const p = pts[Math.min(i, pts.length - 1)], q = pts[Math.min(i + 1, pts.length - 1)]; m.position.set(p[0], p[1], p[2]); m.lookAt(q[0], q[1], q[2]); m.visible = this.root.visible; });
  }
  updateLaser() {
    const A = this.area, on = this.aiming && !this.dead && !this.action; this.laser.visible = on; this.dotOn = on; if (!on) return;
    const o = v, d = v2; this.aimRay(o, d); const t = A.ctx.time; const swayAmt = this.stats.sway * TUNING.laserSway * 0.003; this.spreadDir(d, Math.sin(t * 1.7) * swayAmt, Math.cos(t * 1.3) * swayAmt);
    const r = castShot(A, o, d, 0, 80, 0); const first = r.hits[0]; const T = first ? first.t : r.wallT; pointAt(o, d, T, this.dot); this.dotZone = first?.zone ?? null; this.dotHit = first ?? null;
    const m = this.h.jointPos('HandR'); m.addScaledVector(d, this.stats.clip === 'Long' ? 0.7 : 0.35); const len = m.distanceTo(this.dot); this.laser.position.lerpVectors(m, this.dot, 0.5); this.laser.lookAt(this.dot); this.laser.scale.z = Math.max(0.01, len);
    this.laser.visible = !(this.stats.scope);
  }
  remove() { this.h.remove(); this.area.ctx.scene.remove(this.laser); for (const m of this.scarfMeshes) this.area.ctx.scene.remove(m); this.light?.release(); }
}
export { CAM };
