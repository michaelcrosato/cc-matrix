// The Bosun and the crane. Three brine sacs. Drop the pallet on him, then shoot his back.
import { glowMaterial, PALETTE, RAPIER, THREE } from '../../../pixel-engine.js';
import { TUNING } from '../../data/tuning.js';
import { addItem } from '../../core/run.js';
import { Humanoid, buildProp } from '../actor.js';
import { rayCapsule, raySphere } from '../combat.js';
const v = new THREE.Vector3();
const SAC_OFF = [[-0.17, 0.46, -0.21], [0.17, 0.46, -0.21], [0, 0.2, -0.21]];
export class Bosun {
  constructor(a) {
    this.a = a; const L = a.level, S = 2.6; this.scale = S; this.h = new Humanoid(a.ctx, 'bosun', { scale: S }); this.root = this.h.root; this.h.attach('HandR', 'w-anchor', { as: 'anchor' }); this.pos = new THREE.Vector3(L.wx(17.5), 0, L.wz(6)); this.prev = this.pos.clone(); this.yaw = 0; this.state = 'ROAR'; this.t = 2; this.speed = 1.1; this.phase = 1; this.hp = 1; this.dead = false; this.sacs = [0, 1, 2].map((i) => ({ i, hp: 180, dead: false, pos: new THREE.Vector3(), obj: this.root.getObjectByName(`Sac${i}`) })); this.kneel = 0; this.hideT = 0; this.addsT = 40; this.cool = 2; this.lastLOS = 0; this.h.play('BosunRoar');
    a.ctx.audio.play('bellow'); const P = a.ctx.physics; this.body = P.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, 1.6, this.pos.z)); const c = P.world.createCollider(RAPIER.ColliderDesc.capsule(1.1, 0.75), this.body); P.tag(c, 'noCamera', 'enemy');
    // Crane
    const k = L.markers.k[0]; L.addSolidProp('crane-cab', k.x, k.z, 1.57); this.railZ = L.wz(18); this.x0 = L.wx(5); this.x1 = L.wx(30); this.palletDir = 1; this.px = this.x0; this.reload = 0; this.dropT = 0; this.zones = L.markers.z; this.zoneX = [L.wx(14), L.wx(23)];
    this.pallet = buildProp('pallet'); this.pallet.object.position.set(this.px, 8, this.railZ); a.ctx.scene.add(this.pallet.object); this.palletY = 8;
    for (const col of [13, 14, 15, 22, 23, 24]) for (const row of [17, 18, 19]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.02, 0.96), this.yellow()); m.position.set(L.wx(col), 0.03, L.wz(row)); a.ctx.scene.add(m); }
    a.dame.hide({ x: k.x, z: k.z }); a.dame.spot = null; a.dame.root.visible = false; a.dame.hidden = true; a.dame.mode = 'hide'; a.commandSpots.push({ x: 0, z: 0, radius: 400, verb: 'RELEASE THE CRANE', when: () => !this.dead && this.reload <= 0 && this.overZone(), act: () => this.drop() }); a.commandSpots.at(-1).any = true;
    this.lamp = a.ctx.lights.request({ position: [this.px, 7, this.railZ], color: 0xffd040, intensity: 0, radius: 12 }); this.barT = 1; a.bossBar = this; a.extraHud = (ui) => this.hud(ui); a.nearestCmd = () => { const s = a.commandSpots.find((c) => c.radius === 400); return s && s.when() ? s : null; };
    a.ctx.tweens.call(0.1, () => a.say('COMMODORE', 'BOSUN. DO THE THING WITH THE ANCHOR.', 2));
  }
  yellow() { return glowMaterial(PALETTE.sand); }
  overZone() { return this.zoneX.some((x) => Math.abs(this.px - x) < 1.6); }
  drop() { const a = this.a; this.reload = 15; this.dropT = 0.7; a.ctx.audio.play('chain'); a.ctx.audio.play('crane'); a.say('DAME', 'Mind your head, young woman.', 1); }
  hud(ui) { if (this.dead) return; const k = this.sacs.filter((s) => !s.dead).length; const label = this.kneel > 0 ? 'SACS EXPOSED. SHOOT!' : this.reload > 0 ? `PALLET RELOADS ${Math.ceil(this.reload)}` : this.overZone() ? 'PALLET OVER THE ZONE: COMMAND THE DAME' : 'PALLET TRAVELLING'; ui.center(8, 'THE BOSUN', { color: 'red' }); for (let i = 0; i < 3; i++) { ui.bar(ui.W / 2 - 62 + i * 42, 18, 40, 4, this.sacs[i].hp / 180, 'lime'); } ui.center(26, label, { color: this.kneel > 0 ? 'lime' : this.overZone() && this.reload <= 0 ? 'sand' : 'mist' }); }
  fixed(dt) {
    if (this.dead) return; const a = this.a; this.prev.copy(this.pos); this.t -= dt; this.cool -= dt; this.reload = Math.max(0, this.reload - dt);
    if (!this.dropT) { this.px += this.palletDir * 3.2 * dt; if (this.px > this.x1) this.palletDir = -1; if (this.px < this.x0) this.palletDir = 1; }
    if (this.dropT > 0) { this.dropT -= dt; this.palletY = 8 * Math.max(0, this.dropT / 0.7) ** 2; if (this.dropT <= 0) this.palletLand(); } else if (this.palletY < 8) { this.palletY = Math.min(8, this.palletY + dt * 0.6); }
    this.pallet.object.position.set(this.px, this.palletY, this.railZ); this.lamp.intensity = this.overZone() && this.reload <= 0 ? 16 : 0; this.lamp.position?.set?.(this.px, 6, this.railZ);
    const T = a.nearestPlayer(this.pos); if (!T) return; const d = Math.hypot(T.pos.x - this.pos.x, T.pos.z - this.pos.z);
    if (this.phase >= 2) { this.addsT -= dt; if (this.addsT <= 0) { this.addsT = 40; for (let i = 0; i < 4; i++) { const s = a.level.markers.a[0]; a.spawnEnemy('gaffer', s.x + i - 2, s.z - 2); } } }
    const fac = 1 + (3 - this.sacs.filter((s) => !s.dead).length) * 0.15;
    switch (this.state) {
      case 'ROAR': if (this.t <= 0) this.go('WALK'); break;
      case 'WALK': { this.face(T.pos, 3 * dt); const ok = a.los(this.pos, T.pos, 0); this.hideT = ok ? 0 : this.hideT + dt; if (d > 2.5) this.move(T, dt, this.speed * fac); this.pickAttack(T, d); break; }
      case 'SWEEP': this.face(T.pos, 2 * dt); if (this.t <= 0.26 && !this.hit) { this.hit = true; a.ctx.audio.play('kickwhoosh'); if (d < 7.3 && !T.dead) { if (d < 4.2) this.closeSweep(T); else T.hurt(45, this.pos, { knock: true }); } a.ctx.engine.shake.add(0.3); } if (this.t <= 0) { if (this.phase >= 3 && !this.dbl) { this.dbl = true; this.go('SWEEP', 1.1); } else { this.dbl = false; this.go('WALK'); this.cool = 2; } } break;
      case 'THROW': this.face(T.pos, 2 * dt); if (this.t < 0.4 && !this.hit) { this.hit = true; this.throwAnchor(T); } if (this.t <= 0) { this.go('WALK'); this.cool = 2.5; } break;
      case 'STOMP': if (this.t < 0.3 && !this.hit) { this.hit = true; a.ctx.audio.play('palletdrop'); a.ctx.engine.shake.add(0.5); a.ctx.particles.burst('dust', this.pos, { count: 20 }); if (d < 3.4) T.hurt(25, this.pos, { knock: true }); } if (this.t <= 0) { this.go('WALK'); this.cool = 1.8; } break;
      case 'GRAB': this.face(T.pos, dt); if (this.t <= 0.3 && !this.hit) { this.hit = true; if (d < 3.4) this.grabPlayer(T); } if (this.t <= 0) { this.go('WALK'); this.cool = 3; } break;
      case 'KNEEL': this.kneel -= dt; if (this.kneel <= 0) { this.go('ROAR', 1); a.ctx.audio.play('bellow'); } break;
    }
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: 1.6, z: this.pos.z });
  }
  closeSweep(T) { const a = this.a; if (a.qte.active || T.god) return T.hurt(45, this.pos, { knock: true }); a.qte.start({ owner: T, type: 'press', button: 'dodge', label: 'DODGE', time: TUNING.qteWindow, onDone: (ok) => { if (ok) { T.invuln = 1; a.ctx.audio.play('kickwhoosh'); } else T.hurt(45, this.pos, { knock: true }); } }); }
  grabPlayer(T) { const a = this.a; if (a.qte.active || T.god) return; T.locked = true; a.ctx.audio.play('hurtmax'); a.qte.start({ owner: T, type: 'mash', label: 'BREAK FREE', fill: 9, drain: 0.6, time: 4, mashTimeoutOk: false, onDone: (ok) => { T.locked = false; if (!ok) T.hurt(60, this.pos, { knock: true }); else T.invuln = 1; } }); }
  pickAttack(T, d) { if (this.cool > 0) return; const R = this.a.rng; if (this.hideT > 4 || (d > 8 && d < 18 && R.chance(0.6))) { this.hideT = 0; this.go('THROW', 1.5); return; } if (d < 3 && R.chance(0.3)) { this.go('GRAB', 0.9); return; } if (d < 3.2) { this.go('STOMP', 0.9); return; } if (d < 7) { this.go('SWEEP', 1.25); return; } this.cool = 0.5; }
  throwAnchor(T) { const a = this.a, from = this.h.jointPos('HandR'), to = T.pos.clone(); const air = 1.0, g = 14; const pr = a.addProjectile({ kind: 'anchor', model: 'w-anchor', pos: from, vel: new THREE.Vector3((to.x - from.x) / air, (to.y - from.y) / air + 0.5 * g * air, (to.z - from.z) / air), g, life: air, r: 0.01, stops: false, onLand: (p) => { a.ctx.audio.play('palletdrop', a.spatialPlay(p.pos)); a.ctx.engine.shake.add(0.5); a.ctx.particles.burst('dust', p.pos, { count: 20 }); const cov = a.level.coverNear(p.pos.x, p.pos.z, 1.5); if (cov) a.level.breakCover(cov); for (const P of a.players) if (Math.hypot(P.pos.x - p.pos.x, P.pos.z - p.pos.z) < 2) P.hurt(40, p.pos, { knock: true }); } }); pr.dead = true; this.h.props.anchor.visible = false; a.ctx.tweens.call(air + 2, () => { if (this.h.props.anchor) this.h.props.anchor.visible = true; a.ctx.audio.play('chain', a.spatialPlay(this.pos, 0.6)); }); a.addTelegraphMark(to.clone().setY(0.04), air); a.ctx.audio.play('kickwhoosh'); }
  palletLand() { const a = this.a; a.ctx.audio.play('palletdrop'); a.ctx.engine.shake.add(0.8); a.ctx.particles.burst('dust', [this.px, 0.3, this.railZ], { count: 30 }); const d = Math.hypot(this.pos.x - this.px, this.pos.z - this.railZ); if (d < 2.6) this.stagger(8); for (const e of a.enemies) if (!e.dead && Math.hypot(e.pos.x - this.px, e.pos.z - this.railZ) < 2) e.damage(200, 'torso', { explosive: true }); for (const P of a.players) if (Math.hypot(P.pos.x - this.px, P.pos.z - this.railZ) < 1.6) P.hurt(40, [this.px], { knock: true }); }
  stagger(t) { this.chainHit = false; this.kneel = t; this.go('KNEEL', t); this.a.ctx.engine.hitstop(0.1); this.a.ctx.audio.play('bellow'); this.a.say('MAX', 'Falling objects. Clause nine.', 1.5); }
  explosion(p, r) { if (this.state !== 'KNEEL' && this.pos.distanceTo(p) < r + 2) this.stagger(4); }
  go(s, t = 1) { this.state = s; this.t = t; this.hit = false; this.anim = null; }
  face(p, k) { const want = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); let d = want - this.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; this.yaw += d * Math.min(1, k); }
  move(T, dt, sp) { const a = this.a, nav = a.flowNav(0, T), o = [0, 0]; if (!nav.flowDirection(this.pos.x, this.pos.z, o)) return; const nx = this.pos.x + o[0] * sp * dt, nz = this.pos.z + o[1] * sp * dt; if (a.level.enemyCanStand(nx, this.pos.z, 0)) this.pos.x = nx; if (a.level.enemyCanStand(this.pos.x, nz, 0)) this.pos.z = nz; }
  rayParts(o, d) {
    if (this.dead) return []; const out = [], J = this.h.joints, S = this.scale; for (const s of this.sacs) { if (s.dead) continue; const t = raySphere(o, d, s.pos, 0.34 * S * (this.kneel > 0 ? 1.4 : 1)); if (t != null) out.push({ t, part: { hit: (dmg, pt) => this.hitSac(s, dmg, pt) }, zone: 'head' }); }
    if (this.kneel > 0 && !this.chainHit) { const t = raySphere(o, d, v.set(this.px, 3.6, this.railZ), 0.7); if (t != null) out.push({ t, part: { hit: (dmg, pt, wid) => this.hitChain(pt, wid) } }); }
    const pelvis = J.Pelvis.getWorldPosition(new THREE.Vector3()), head = J.Head.getWorldPosition(new THREE.Vector3()); const t = rayCapsule(o, d, pelvis, head, 0.32 * S); if (t != null) out.push({ t: t + 0.02, part: { hit: (dmg, pt, wid) => this.hitBody(dmg, pt, wid) }, zone: 'torso' }); return out;
  }
  hitSac(s, dmg, pt) { const a = this.a, k = this.kneel > 0 ? 2 : 1; s.hp -= dmg * k; a.ctx.particles.burst('brine', pt); a.ctx.audio.play('bodyhit'); this.h.flash(); if (s.hp <= 0) { s.dead = true; if (s.obj) s.obj.visible = false; a.fx.blast(pt, 1.6); a.ctx.audio.play('headpop'); a.ctx.audio.play('bellow'); const left = this.sacs.filter((x) => !x.dead).length; this.phase = 4 - left; if (a.rain && this.phase >= 3) a.rain.intensity = 1; if (left === 0) this.die(); else this.go('ROAR', 1.2); } }
  /** A harpoon through the chain pins the pallet on him: 3 more seconds. */
  hitChain(pt, wid) { const a = this.a; a.ctx.particles.burst('spark', pt); a.ctx.audio.play('chain'); if (wid === 'harpoon') { this.chainHit = true; this.kneel += 3; this.t += 3; } }
  hitBody(dmg, pt, wid) { const a = this.a; a.ctx.particles.burst('spark', pt, { count: 3 }); a.ctx.audio.play('armorping', { volume: 0.5 }); const s = this.sacs.find((x) => !x.dead); if (s) { s.hp -= dmg * 0.04; this.h.flash(1); } }
  knifeHit(P) { if (Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z) < 2.6) { const s = this.sacs.find((x) => !x.dead); if (s && this.kneel > 0) this.hitSac(s, 12, this.h.jointPos('Torso')); } }
  die() { const a = this.a; this.dead = true; this.go('DEAD'); a.ctx.physics.remove(this.body); this.h.play('Death', { fade: 0.1 }); a.ctx.engine.hitstop(0.15); a.ctx.engine.shake.add(1); a.ctx.engine.screen?.shockwave?.(this.pos, { radius: 0.6 }); a.ctx.audio.play('palletdrop'); addItem(a.run, 'blackpearl'); a.say('MAX', 'Black Pearl. For the file.', 2); a.spawnDrop(this.pos.x, this.pos.z + 2, { money: 2000 }); for (const e of a.enemies) if (!e.dead) e.die({}); a.extraHud = null; a.nearestCmd = () => null; a.dame.unhide(); a.dame.hidden = false; a.dame.mode = 'follow'; a.dame.pos.set(a.level.markers.k[0].x + 1.2, 0, a.level.markers.k[0].z + 1.2); a.dame.prev.copy(a.dame.pos); this.lamp.release?.(); }
  update(dt) {
    const a = this.a, A = a.ctx.physics.alpha; this.root.position.lerpVectors(this.prev, this.pos, this.dead ? 1 : A); this.root.rotation.y = this.yaw; if (this.dead) { this.h.update(dt); return; }
    const c = { ROAR: 'BosunRoar', WALK: 'BosunDrag', SWEEP: 'BosunSweep', THROW: 'BosunThrow', STOMP: 'BosunStomp', GRAB: 'Grapple', KNEEL: 'BosunKneel' }[this.state]; if (this.anim !== c) { this.anim = c; this.h.play(c, { restart: true, timeScale: c === 'BosunDrag' ? this.speed * 1.2 : 1 }); } this.h.update(dt);
    this.root.updateWorldMatrix(true, true); for (const s of this.sacs) { v.set(...SAC_OFF[s.i]); s.pos.copy(v).applyMatrix4(this.h.joints.Torso.matrixWorld); }
  }
}
