// Max Ransom: movement, aim state, reload, melee timers. Reads an Intent, never ctx.input.
import { THREE, CharacterController, SpringChain, toonMaterial, PALETTE } from '../../pixel-engine.js';
import { Humanoid } from './actor.js';
import { TUNING } from '../data/tuning.js';
import { WEAPONS } from '../data/weapons.js';
import { turnToward, clamp, angleDiff } from './geom.js';

const { Vector3 } = THREE;
const MAX_SPEED = 10;

export class Player {
  constructor(area, x, z, o = {}) {
    this.area = area; this.run = area.run;
    this.x = x; this.z = z; this.y = 0; this.px = x; this.pz = z; this.yaw = o.yaw ?? 0; this.speed = 0;
    this.ctrl = new CharacterController(area.ctx.physics, { position: [x, 0, z], speed: MAX_SPEED, radius: 0.3, halfHeight: 0.5, jumpSpeed: 0, gravity: -22 });
    area.ctx.physics.tag(this.ctrl.collider, 'noCamera'); area.ctx.physics.tag(this.ctrl.collider, 'player');
    this.h = new Humanoid(o.model || 'max', { scale: 1 }); this.h.attachTo(area.ctx.scene);
    this.gunObj = null; this.gunId = null;
    this.state = 'free'; this.stateT = 0; this.aiming = false;
    this.fireCd = 0; this.reloadT = 0; this.reloading = false; this.invuln = 0; this.meleeT = 0; this.meleeKind = null;
    this.slowT = 0; this.netT = 0; this.limpets = []; this.grabbed = null; this.grabMash = 0; this.dead = false; this.downed = false;
    this.lockT = 0; this.vault = null; this.noMove = false; this.healCd = 0; this.dodgeT = 0; this.kickT = 0; this.sway = 0;
    this.color = o.color || null; this.name = o.name || 'MAX';
    this.recoil = 0; this.moveDir = new Vector3(); this.stepT = 0;
    this.equip(this.run.equipped);
    // the red scarf tail: a spring chain behind the neck
    this.scarf = new SpringChain({ segments: 6, length: 0.12 }); this.scarfMeshes = [];
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), toonMaterial(PALETTE.red)); m.castShadow = false; area.ctx.scene.add(m); this.scarfMeshes.push(m); }
  }
  updateScarf(dt) {
    const h = this.h; if (!h.j.Torso) return;
    const v = h.j.Torso.getWorldPosition(new Vector3()); v.y += 0.55; const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    v.x -= fx * 0.15; v.z -= fz * 0.15;
    try { this.scarf.update(Math.max(dt, 1e-4), [v.x, v.y, v.z], [[-fz, 0, fx], [0, 1, 0], [-fx, 0, -fz]]); } catch { return; }
    const pts = this.scarf.points; for (let i = 0; i < this.scarfMeshes.length && i < pts.length - 1; i++) { const p = pts[i + 1]; this.scarfMeshes[i].position.set(p[0], p[1], p[2]); this.scarfMeshes[i].visible = !h.hidden && h.root.visible; }
  }
  get hp() { return this.run.hp; }
  set hp(v) { this.run.hp = v; }
  get weapon() { return WEAPONS[this.run.equipped]; }
  equip(id) {
    if (!WEAPONS[id]) return;
    this.run.equipped = id; this.reloading = false; this.reloadT = 0;
    if (this.gunObj) { this.gunObj.removeFromParent(); this.gunObj = null; }
    const model = { pistol: 'gun-pistol', scatter: 'gun-scatter', rifle: 'gun-rifle', harpoon: 'gun-harpoon' }[id];
    this.gunObj = this.h.hold('HandR', model, [0, -0.04, 0.02], [90, 0, 0]);
    this.gunId = id;
  }
  /** Muzzle position in world space. */
  muzzle(out = new Vector3()) {
    this.h.root.updateMatrixWorld(true);
    const hand = this.h.worldOf('HandR', out);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    return out.set(hand.x + fx * 0.5, hand.y + 0.05, hand.z + fz * 0.5);
  }
  canAct() { return !this.dead && !this.downed && this.state !== 'vault' && this.state !== 'climb' && this.state !== 'locked' && !this.area.cutsceneActive; }
  fixedUpdate(intent, dt) {
    const a = this.area, T = TUNING;
    this.px = this.x; this.pz = this.z;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.healCd > 0) this.healCd -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.netT > 0) this.netT -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 4);
    const f = this.ctrl.feet; this.x = f.x; this.z = f.z;
    const locked = !this.canAct() || this.state === 'melee';
    if (this.state === 'melee') { this.meleeT -= dt; if (this.meleeT <= 0) { this.state = 'free'; this.meleeKind = null; } }
    if (this.state === 'vault' || this.state === 'climb') {
      this.vault.t += dt; const k = clamp(this.vault.t / this.vault.dur, 0, 1);
      const nx = this.vault.fx + (this.vault.tx - this.vault.fx) * k, nz = this.vault.fz + (this.vault.tz - this.vault.fz) * k;
      const ny = this.vault.fy + ((this.vault.ty ?? this.vault.fy) - this.vault.fy) * k; this.ctrl.teleport([nx, ny, nz]); this.ctrl.velocity?.set?.(0, 0, 0); this.x = nx; this.z = nz; this.y = ny;
      if (k >= 1) { const cb = this.vault.done; this.state = 'free'; this.vault = null; cb?.(); }
      this.ctrl.setInput(new Vector3(), false, false); this.ctrl.fixedUpdate(dt);
      return;
    }
    // limpets and grabs hold you in place until shaken
    if (this.grabbed) { this._mashFree(intent); }
    if (this.limpets.length) { this._shakeLimpets(intent); }
    const held = this.grabbed || locked || a.qteBlocks || this.noMove;
    // aim / move
    const wasAiming = this.aiming;
    this.aiming = !held && !!intent.aim && !this.reloading ? true : (!held && !!intent.aim && this.reloading);
    if (this.dead || this.downed) this.aiming = false;
    let sp = 0; const mv = this.moveDir.set(0, 0, 0);
    if (!held && !this.dead && !this.downed) {
      const mag = Math.min(1, Math.hypot(intent.mx, intent.my));
      if (mag > 0.05) {
        const cy = a.cam.yaw;
        const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
        mv.set((fx * intent.my + rx * intent.mx), 0, (fz * intent.my + rz * intent.mx)).normalize();
        let target = mag < 0.55 ? 1.6 : T.walkSpeed;
        if (intent.run) target = T.runSpeed;
        if (this.aiming) target = T.aimWalkSpeed;
        if (this.slowT > 0) target *= 0.6; if (this.netT > 0) target *= 0.6;
        if (a.level.charAt(this.x, this.z) === '%') target *= 0.7;
        sp = target * (this.aiming ? 1 : 1);
        if (this.aiming && T.aimWalkSpeed <= 0) sp = 0;
      }
    }
    // acceleration 18 m/s^2
    const accel = 18 * dt;
    this.speed = this.speed < sp ? Math.min(sp, this.speed + accel) : Math.max(sp, this.speed - accel * 1.5);
    if (this.aiming) {
      this.yaw = turnToward(this.yaw, a.cam.yaw, 14 * dt);
    } else if (this.speed > 0.1 && mv.lengthSq() > 0) {
      const ty = Math.atan2(mv.x, mv.z);
      if (intent.quick && !this.quickT) { this.quickT = 0.3; this.yaw = ty; }
      this.yaw = turnToward(this.yaw, ty, (540 * Math.PI / 180) * dt);
    }
    if (this.quickT) this.quickT = Math.max(0, this.quickT - dt);
    const vec = new Vector3(mv.x, 0, mv.z).multiplyScalar(this.speed / MAX_SPEED);
    if (this.speed > 0.01 && mv.lengthSq() > 0) {
      a.beltPush?.(this, vec);
    }
    const belt = a.beltVelocityAt?.(this.x, this.z); if (belt) { vec.x += belt[0] / MAX_SPEED; vec.z += belt[1] / MAX_SPEED; }
    this.ctrl.setInput(vec, false, false); this.ctrl.fixedUpdate(dt);
    const f3 = this.ctrl.feet; this.x = f3.x; this.z = f3.z; this.y = f3.y;
    // reload timer
    if (this.reloading) { this.reloadT -= dt; if (this.reloadT <= 0) { this.reloading = false; this.run.reload(this.run.equipped); a.audio('reload3'); } }
    if (!held && !this.dead && !this.downed) this._actions(intent, dt);
  }
  _actions(intent, dt) {
    const a = this.area, w = this.weapon, st = this.run.stat(w.id);
    if (intent.weaponDelta) a.cycleWeapon(intent.weaponDelta);
    if (intent.weaponSlot) a.selectWeaponSlot(intent.weaponSlot);
    if (intent.heal) a.useHerb();
    if (intent.grenadeSwap) a.cycleGrenade();
    if (intent.reload && !this.reloading && (this.run.mags[w.id] ?? 0) < st.mag && this.run.ammo(w.id) > 0) this.startReload();
    if (this.aiming) {
      if (intent.firePressed || (intent.fire && w.id === 'scatter' && false)) {
        if (this.fireCd <= 0 && !this.reloading) {
          if ((this.run.mags[w.id] ?? 0) > 0) a.firePlayer();
          else { a.audio('dry'); this.fireCd = 0.25; if (this.run.ammo(w.id) > 0) this.startReload(); else a.say?.bark('MAX', "THAT'S NOT IN THE BUDGET.", 3); }
        }
      }
      if (intent.grenade) a.throwGrenade();
    } else if (intent.knife && this.state === 'free') a.knife();
  }
  startReload() {
    const w = this.weapon, st = this.run.stat(w.id);
    this.reloading = true; this.reloadT = st.reload / TUNING.reloadSpeed;
    this.area.audio('reload1');
    this.area.ctx.tweens.call(this.reloadT * 0.45, () => this.area.audio('reload2'));
    if (this.area.rng.chance(0.15)) this.area.bark('MAX', 'ONE MOMENT, PLEASE.', 2);
  }
  _mashFree(intent) {
    if (intent.actionPressed) { this.grabMash += 1; if (this.grabMash >= 5) { const g = this.grabbed; this.grabbed = null; this.grabMash = 0; if (g && !g.dead) { g.setState('RECOVER', 0.8); g.cd = 1.5; } this.area.audio('hit'); } }
  }
  _shakeLimpets(intent) {
    if (intent.actionPressed || intent.knife) { this.shake = (this.shake || 0) + 1; if (this.shake >= 3) { this.shake = 0; const l = this.limpets.pop(); if (l && !l.dead) { l.knockdown(1.5, this.x, this.z); } this.area.audio('hit'); } }
  }
  beginGrab(e) { this.grabbed = e; this.grabMash = 0; }
  doMelee(kind, dur) { this.state = 'melee'; this.meleeKind = kind; this.meleeT = dur; }
  startTraverse(kind, tx, tz, dur, done, ty) {
    this.state = kind; this.vault = { fx: this.x, fz: this.z, fy: this.y || 0, ty, tx, tz, dur, t: 0, done };
    this.yaw = Math.atan2(tx - this.x, tz - this.z); this.invuln = Math.max(this.invuln, dur);
  }
  teleport(x, z, y = 0) { this.ctrl.teleport([x, y, z]); this.x = this.px = x; this.z = this.pz = z; this.y = y; }
  /** Per rendered frame. */
  updateVisual(dt, alpha) {
    const h = this.h, root = h.root;
    const ix = this.px + (this.x - this.px) * alpha, iz = this.pz + (this.z - this.pz) * alpha;
    root.position.set(ix, (this.y || 0) + (this.state === 'vault' ? Math.sin(clamp(this.vault.t / this.vault.dur, 0, 1) * Math.PI) * 0.35 : 0), iz); root.rotation.y = this.yaw;
    this.chooseAnim(dt);
    h.aim.on = this.aiming && !this.reloading; h.aim.pitch = this.area.cam.pitch;
    h.update(dt); this.updateScarf(dt);
    h.placeShadow(0);
  }
  chooseAnim(dt) {
    const h = this.h, w = this.weapon;
    if (this.dead) { h.play('Death', { once: true, hold: true }); return; }
    if (this.downed) { h.play('KnockedDown', { once: true, hold: true }); return; }
    if (this.state === 'vault') { h.play('Vault', { once: true }); return; }
    if (this.state === 'climb') { h.play('Climb'); return; }
    if (this.state === 'melee') {
      const m = this.meleeKind;
      const clip = { kick: 'Roundhouse', throw: 'HipThrow', knife: 'KnifeSlash', door: 'DoorKick', stagger: 'Stagger', pickup: 'Grab', boost: 'Boost', dodge: 'Roll', hurt: 'HitReact', throwg: 'Throw', command: 'Wave' }[m] || 'Punch';
      h.play(clip, { once: true, speed: m === 'kick' ? 1.1 : 1 }); return;
    }
    if (this.grabbed) { h.play('Hurt', { once: true }); return; }
    if (this.aiming) {
      const up = this.reloading ? (w.long ? 'ReloadLong' : 'ReloadPistol') : (w.long ? 'AimLong' : 'AimPistol');
      const fire = this.recoil > 0.5 ? (w.long ? 'FireLong' : 'FirePistol') : null;
      h.layers('Idle', fire || up, { upperOnce: !!fire || this.reloading }); return;
    }
    if (this.reloading) { h.layers(this.speed > 0.4 ? 'Walk' : 'Idle', w.long ? 'ReloadLong' : 'ReloadPistol', { upperOnce: true, lowerSpeed: Math.max(0.4, this.speed / 2) }); return; }
    if (this.speed > 3.6) h.play('MaxJog', { speed: Math.max(0.6, this.speed / 4.8) });
    else if (this.speed > 0.2) h.play('Walk', { speed: Math.max(0.5, this.speed / 2) });
    else h.play('Idle');
  }
  dispose() { this.h.dispose(); }
}
Player.prototype.blocksAt = function blocksAt(x, z, r) { return Math.hypot(x - this.x, z - this.z) < r; };
