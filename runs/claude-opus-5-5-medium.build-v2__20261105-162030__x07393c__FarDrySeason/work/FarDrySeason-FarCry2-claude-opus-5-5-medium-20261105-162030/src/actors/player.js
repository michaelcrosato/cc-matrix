// Aster: a capsule, two hands, and no visible body.
import { CharacterController, THREE } from '../../pixel-engine.js';
import { held, pressedFixed } from '../core/actions.js';
import { TUNING } from '../core/tuning.js';
import { clamp } from '../world/geom.js';
import { WATER_Y } from '../world/terrain.js';
const { Vector3 } = THREE;
const moveV = new Vector3(), eye = new Vector3();
export class Player {
  kind = 'player'; faction = 'player'; id = 'me';
  x = 0; y = 40; z = 0; hp = 100; stamina = 6; crouched = false; walkToggle = false; sprinting = false; ads = false; mapUp = false; vehicle = null; mounted = false; mountGun = null;
  guns = { melee: null, sidearm: null, main: null, special: null }; slot = 'sidearm';
  syrettes = 3; tablets = 0; stones = 0; molotovs = 0; charges = 0; planted = []; upgrades = {}; unlocked = {}; items = {}; carrying = null; toolBusy = 0; litT = 0; speed2 = 0;
  surgery = null; syretteT = 0; tabletT = 0; holdT = 0; downT = 0; landDip = 0; crouchDip = 0; airborne = 0; fallFrom = 0; bleeding = 0; burning = 0; burnClear = 0; stepT = 0;
  constructor(game) { this.game = game; }
  build(ctx) {
    this.ctx = ctx;
    this.ctrl = new CharacterController(ctx.physics, { position: [0, 60, 0], radius: 0.32, halfHeight: 0.56, speed: 5.4, jumpSpeed: 8, gravity: -24 });
    ctx.physics.tag(this.ctrl.collider, 'player');
    this.game.world.own(this.ctrl.collider, 'player', this);
  }
  teleport(x, z, yFeet) {
    const y = yFeet ?? this.game.world.land.heightAt(x, z) + 0.1;
    if (this.vehicle) this.game.vehicles.exit(true);
    this.ctrl.teleport([x, y, z]); this.ctrl.velocity.set(0, 0, 0);
    this.x = x; this.y = y; this.z = z; this.game.grounded = false; this.game.world.focusX = x; this.game.world.focusZ = z;
    this.prevY = y;
  }
  setYaw(yaw, pitch = 0) { this.ctx.camera.yaw = yaw; this.ctx.camera.pitch = pitch; }
  lookAt(x, y, z) { const e = this.eyeNow(), dx = x - e.x, dz = z - e.z; this.setYaw(Math.atan2(-dx, -dz), Math.atan2(y - e.y, Math.hypot(dx, dz))); }
  canMove() { const g = this.game; return !g.frozen && !this.surgery && !this.downT && !g.talk.locksPlayer(); }
  canAct() { const g = this.game; return this.canMove() && !g.ui.top; }
  eyeNow() {
    if (this.vehicle && !this.mounted) { const v = this.vehicle; return v.seatWorld(eye); }
    if (this.mounted && this.vehicle) return this.vehicle.gunWorld(eye);
    if (this.mounted && this.railGun) return eye.copy(this.railGun);
    return eye.set(this.x, this.y + (this.crouched ? 0.95 : 1.55), this.z);
  }
  fixed(dt) {
    const game = this.game, input = this.ctx.input;
    this.toolBusy = Math.max(0, this.toolBusy - dt); this.litT = Math.max(0, this.litT - dt); this.landDip *= 0.9;
    if (game.cheats.noclip && !this.vehicle) { this.noclipMove(dt); return; }
    if (this.vehicle || this.mounted) { this.x = this.vehicle ? this.vehicle.x : this.x; this.z = this.vehicle ? this.vehicle.z : this.z; if (this.vehicle) this.y = this.vehicle.y; return; }
    if (this.riding) { this.x = this.riding.x; this.y = this.riding.y; this.z = this.riding.z; return; }
    const canMove = this.canMove() && !game.ui.top;
    const axis = canMove ? input.moveAxis() : { x: 0, y: 0 };
    const tilt = clamp(Math.hypot(axis.x, axis.y), 0, 1);
    if (canMove && input.consumeAny(['CapsLock'])) this.walkToggle = !this.walkToggle;
    if (canMove && pressedFixed(input, 'crouch')) { this.crouched = !this.crouched; game.audio.play('cloth', { volume: 0.4 }); }
    // Speed.
    const deep = game.world.land.waterDepth(this.x, this.z) > 0.25;
    const sprintHeld = held(input, 'sprint');
    const forward = axis.y > 0.3;
    if (sprintHeld && canMove && forward && !this.crouched && !deep && !this.carrying && this.stamina > 0.1 && !this.mapUp) { this.sprinting = true; this.stamina = Math.max(0, this.stamina - dt); } else { this.sprinting = false; this.stamina = Math.min(6, this.stamina + (dt * 6) / 8); }
    if (this.stamina <= 0.1) this.exhausted = true; if (this.stamina > 1.5) this.exhausted = false;
    if (this.exhausted) { this.sprinting = false; if (!this.wasOut) { this.wasOut = true; game.audio.play('breath'); } } else this.wasOut = false;
    const walking = this.walkToggle || (game.device === 'pad' && tilt < 0.55);
    let sp = this.sprinting ? 7.4 : walking ? 3.6 : 5.4;
    if (this.crouched) sp = 2;
    if (deep) sp = Math.min(sp, 2.7);
    if (this.carrying) sp *= 0.85;
    if (this.ads) sp = Math.min(sp, 3);
    sp *= TUNING.playerSpeed;
    this.ctrl.speed = sp;
    const basisYaw = this.ctx.camera.yaw;
    const fx = -Math.sin(basisYaw), fz = -Math.cos(basisYaw), rx = -fz, rz = fx;
    moveV.set(rx * axis.x + fx * axis.y, 0, rz * axis.x + fz * axis.y);
    if (moveV.lengthSq() > 1) moveV.normalize();
    const jump = canMove && !this.crouched && pressedFixed(input, 'jump') && !game.prompt.jumpBlocked();
    this.ctrl.setInput(moveV, jump, true); // Every jump is the full 1.3 m: letting go early must not cut it short.
    if (jump && this.ctrl.grounded) game.audio.play('cloth', { volume: 0.5 });
    const wasGrounded = this.ctrl.grounded, vy = this.ctrl.velocity.y;
    this.ctrl.fixedUpdate(dt);
    const f = this.ctrl.feet;
    this.speed2 = Math.hypot(f.x - this.x, f.z - this.z) / dt;
    this.x = f.x; this.y = f.y; this.z = f.z;
    if (!this.ctrl.grounded) this.fallPeak = Math.max(this.fallPeak ?? f.y, f.y);
    if (this.ctrl.grounded && !wasGrounded) {
      const fell = (this.fallPeak ?? f.y) - f.y; this.fallPeak = undefined;
      this.landDip = Math.min(0.12, -vy * 0.008);
      if (fell > 6 && !game.cheats.god) { game.damagePlayer((fell - 6) * 8, { fall: true }); game.audio.play('grunt'); }
      if (fell > 0.5) game.audio.play('step-dirt', { volume: 0.5 });
    }
    // Steps, by surface.
    if (this.ctrl.grounded && this.speed2 > 1) {
      this.stepT -= dt * this.speed2;
      if (this.stepT <= 0) {
        this.stepT = 2.6;
        const k = game.world.land.kindAt(this.x, this.z);
        const name = this.y - game.world.land.heightAt(this.x, this.z) > 0.35 ? 'step-wood' : deep ? 'step-water' : k === 7 || k === 1 ? 'step-road' : k === 0 || k === 5 || k === 8 ? 'step-grass' : 'step-dirt';
        game.audio.play(name, { volume: this.crouched || walking ? 0.2 : 0.45, pitch: game.combat.tracerRng.range(-1, 1) });
        const noise = this.sprinting ? 40 : !this.crouched && !walking ? 25 : 0;
        if (noise && game.world.stepCount % 4 === 0) game.actors.hearShot(this.x, this.z, noise * 0.5, null);
      }
    }
    this.crouchDip += ((this.crouched ? -0.03 : 0) - this.crouchDip) * 0.2;
  }
  noclipMove(dt) {
    const input = this.ctx.input, axis = input.moveAxis(), yaw = this.ctx.camera.yaw, p = this.ctx.camera.pitch, sp = held(input, 'sprint') ? 60 : 22;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    this.x += (fx * axis.y - fz * axis.x * -1 * -1) * sp * dt; this.z += (fz * axis.y + fx * axis.x) * sp * dt; this.y += Math.sin(p) * axis.y * sp * dt;
    this.ctrl.teleport([this.x, this.y, this.z]);
  }
  catchFire() { if (this.burning <= 0 && !this.game.cheats.god) { this.burning = 1; this.burnClear = 0; this.game.audio.play('grunt'); this.game.events.emit('caughtFire'); } }
}
export { WATER_Y };
