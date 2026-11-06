// The player: a grounded capsule, stance, stamina, footsteps, the use scan. No visible body.
import { THREE, CharacterController, Squash } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { K } from '../world/ground.js';
import { RIVER_Y } from '../content/roads.js';
import { clamp, lerp, wrapAngle } from '../core/rng.js';
import { F } from '../world/fire.js';
const { Vector3 } = THREE;
const _v = new Vector3(), _f = new Vector3(), _r = new Vector3();
export class Player {
  stance = 'stand'; walkToggle = false; sprinting = false; stamina = 6; eyeH = 1.55; noise = 0; wading = false; inGrass = false; moving = false; speedNow = 0;
  stepDist = 0; prevY = 0; airFrom = null; bob = 0; bobAmp = 0; landDip = 0; landSpring = Object.assign(new Squash(), { stiffness: 90, damping: 12 }); litUntil = 0; seat = null; frozen = false; carrying = null; hidden = false; flying = false;
  constructor(game) { this.game = game; this.feet = new Vector3(); this.eye = new Vector3(); this.move = new Vector3(); }
  build(ctx, at = [-120, 60, 150]) {
    const y = this.game.world.heightAt(at[0], at[2]) + 0.3;
    this.cc = new CharacterController(ctx.physics, { position: [at[0], y, at[2]], radius: 0.34, halfHeight: 0.56, speed: 5.4, jumpSpeed: 8, gravity: -24 });
    ctx.physics.tag(this.cc.collider, 'player');
    this.game.hitMap.set(this.cc.collider.handle, { kind: 'player', ref: this });
    this.feet.copy(this.cc.feet);
  }
  teleport(x, z, y) {
    const g = this.game;
    const yy = y ?? g.world.heightAt(x, z) + 0.2;
    this.cc.teleport([x, yy, z]);
    this.cc.velocity.set(0, 0, 0);
    this.feet.set(x, yy, z);
    this.airFrom = null;
    g.fireView?.sweep();
    if (g.grass) g.grass.primeAll = true;
  }
  setYaw(y, p = 0) { const rig = this.game.ctx.camera; rig.yaw = y; rig.pitch = p; }
  get yaw() { return this.game.ctx.camera.yaw ?? 0; }
  get pitch() { return this.game.ctx.camera.pitch ?? 0; }
  forward(out = _f) { const y = this.yaw, p = this.pitch; return out.set(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)); }
  fixedUpdate(ctx, dt) {
    const g = this.game, a = g.actions;
    if (this.seat) { this.feet.copy(this.seat.feet()); this.noise = 0; return; }
    if (this.flying) { this.fly(ctx, dt); return; }
    const axis = this.frozen || g.scene.locksMove ? { x: 0, y: 0 } : a.axis();
    const yaw = this.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const tilt = Math.min(1, Math.hypot(axis.x, axis.y));
    if (!this.frozen && !g.scene.locksMove) {
      if (a.take('crouch')) this.stance = this.stance === 'crouch' ? 'stand' : 'crouch';
      if (g.ctx.input.consumePress('CapsLock')) this.walkToggle = !this.walkToggle;
    }
    this.wading = g.ground.isWater(this.feet.x, this.feet.z) && this.feet.y < RIVER_Y - 0.1;
    const padTilted = a.device === 'pad' && tilt > 0.05 && tilt < 0.62;
    const walking = this.walkToggle || padTilted;
    if (a.device === 'pad' && a.take('sprint')) this.sprintLatch = true;
    if (axis.y <= 0.3 || this.stamina <= 0) this.sprintLatch = false;
    const wantSprint = (a.down('sprint') || this.sprintLatch) && axis.y > 0.3 && !g.weapons.aiming && !this.carrying && !this.wading;
    let speed = 5.4;
    if (this.stance === 'crouch') speed = 2.0;
    else if (walking) speed = 3.6;
    this.sprinting = false;
    if (wantSprint && this.stamina > 0 && this.stance !== 'crouch') { this.sprinting = true; speed = 7.4; this.stamina = Math.max(0, this.stamina - dt); }
    else {
      if (this.stamina <= 0 && !this.winded) { this.winded = true; g.sfx.play('breath', { volume: 0.7 }); g.after(0.9, () => g.sfx.play('breath', { volume: 0.5 })); }
      this.stamina = Math.min(6, this.stamina + dt * (6 / 8));
      if (this.stamina > 2) this.winded = false;
    }
    if (this.wading) speed = Math.min(speed, 2.7);
    if (this.carrying) speed *= 0.85;
    speed *= TUNING.playerSpeed * (g.weapons.aiming ? 0.72 : 1) * g.body.moveFactor();
    this.cc.speed = speed;
    this.move.set(fx * axis.y + rx * axis.x, 0, fz * axis.y + rz * axis.x);
    const ml = this.move.length();
    if (ml > 1) this.move.multiplyScalar(1 / ml);
    this.moving = ml > 0.05 && !this.frozen;
    const jump = !this.frozen && !g.scene.locksMove && !g.mapUp && a.take('jump');
    this.cc.setInput(this.move, jump, a.down('jump'));
    const wasGrounded = this.cc.grounded;
    this.cc.fixedUpdate(dt);
    this.feet.copy(this.cc.feet);
    // Falling.
    if (!this.cc.grounded && this.airFrom === null) this.airFrom = this.feet.y;
    if (this.cc.grounded && this.airFrom !== null) {
      const drop = this.airFrom - this.feet.y;
      this.airFrom = null;
      if (drop > 1.2) { this.landSpring.kick(-clamp(drop * 0.35, 0.4, 2.4)); g.sfx.play('land', { volume: 0.5 }); }
      if (drop > 6) g.body.hurt((drop - 6) * 9, 'fall');
    }
    if (this.feet.y < 5) { this.teleport(this.feet.x, this.feet.z); }
    // Noise and footsteps.
    const k = g.ground.kindAt(this.feet.x, this.feet.z);
    this.inGrass = (k === K.CROP || k === K.GRASS || k === K.WOOD) && !g.fire.isBurnt(this.feet.x, this.feet.z);
    this.speedNow = this.moving && this.cc.grounded ? speed : 0;
    this.noise = !this.moving ? 0 : this.sprinting ? 40 : (this.stance === 'crouch' || walking) ? 0 : 25;
    this.stepDist += this.speedNow * dt;
    const stride = this.sprinting ? 2.5 : this.stance === 'crouch' ? 1.5 : 1.9;
    if (this.stepDist > stride) {
      this.stepDist = 0;
      const surf = this.wading ? 'water' : (k === K.ROAD || k === K.RAIL || k === K.TRACK) ? 'road' : (k === K.GRASS || k === K.CROP || k === K.WOOD || k === K.BANK) ? (g.fire.isBurnt(this.feet.x, this.feet.z) ? 'dirt' : 'grass') : (g.world.onDeck?.(this.feet) ? 'wood' : 'dirt');
      g.sfx.play(`step-${surf}`, { volume: this.stance === 'crouch' ? 0.2 : this.sprinting ? 0.55 : 0.36 });
    }
    // Being in a burning cell.
    if (g.fire.isBurning(this.feet.x, this.feet.z) && !this.wading) g.body.catchFire();
  }
  fly(ctx, dt) {
    const g = this.game, a = g.actions, axis = a.axis();
    const fwd = this.forward(_f), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw), sp = a.down('sprint') ? 60 : 22;
    this.feet.x += (fwd.x * axis.y + rx * axis.x) * sp * dt;
    this.feet.y += (fwd.y * axis.y + (a.down('jump') ? 1 : 0) - (a.down('crouch') ? 1 : 0)) * sp * dt;
    this.feet.z += (fwd.z * axis.y + rz * axis.x) * sp * dt;
    this.feet.y = Math.max(this.feet.y, g.world.heightAt(this.feet.x, this.feet.z) + 0.2);
    this.cc.teleport([this.feet.x, this.feet.y, this.feet.z]);
    this.noise = 0;
  }
  seatOnTrain(index, offset) {
    const g = this.game;
    const seat = g.train.seatOn(index, offset);
    this.seat = seat;
    this.cc.collider.setEnabled(false);
    g.vm.setVisible(false);
    this.trainSeat = seat;
    return seat;
  }
  leaveTrain(x, z) {
    const g = this.game;
    this.seat = null; this.trainSeat = null;
    this.cc.collider.setEnabled(true);
    this.teleport(x, z);
    g.vm.setVisible(true);
    g.vm.showGun(g.weapons.gun?.id ?? 'cane', false);
  }
  /** Visual eye height and bob. `alpha`-blended feet keep the camera smooth. */
  update(ctx, dt) {
    const g = this.game;
    if (this.seat) { this.seat.eye(this.eye); return this.eye; }
    const want = this.stance === 'crouch' ? 0.95 : 1.55;
    this.eyeH = lerp(this.eyeH, want, 1 - Math.exp(-dt * 10));
    const feet = this.flying ? this.feet : this.cc.interpolatedFeet(ctx.physics.alpha);
    const sway = this.game.body.bodySway ?? 0;
    // The landing dips what you hold, not your head.
    this.landSpring.update(dt);
    this.landDip = -this.landSpring.value;
    this.eye.set(feet.x, feet.y + this.eyeH - (this.wading ? 0.3 : 0), feet.z);
    this.bob += this.speedNow * dt * 1.8;
    this.bobAmp = lerp(this.bobAmp, this.speedNow > 0 ? clamp(this.speedNow / 7, 0.3, 1) : 0, 1 - Math.exp(-dt * 8));
    return this.eye;
  }
}
