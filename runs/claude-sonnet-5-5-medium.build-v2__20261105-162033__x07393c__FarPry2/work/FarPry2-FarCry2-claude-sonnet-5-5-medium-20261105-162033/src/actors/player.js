// The player: capsule controller, first-person eye, movement states.
import { CharacterController, THREE } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { held, consume, pressed } from '../core/actions.js';

const SPEED = { walk: 3.6, run: 5.4, sprint: 7.4, crouch: 2.0, wade: 2.7 };

export class PlayerSystem {
  name = 'player';
  hp = 100; stamina = 6; crouched = false; sprinting = false; wading = false;
  pos = new THREE.Vector3(); eye = new THREE.Vector3(); move = new THREE.Vector3(); vel = new THREE.Vector3();
  walkToggle = false; eyeH = 1.55; bob = 0; landDip = 0;
  seated = false;
  setup(g) {
    this.g = g;
    const w = g.world;
    const y = w.heightAt(0, 20);
    this.ctrl = new CharacterController(g.ctx.physics, { position: [0, y + 0.5, 20], radius: 0.35, halfHeight: 0.55, speed: 5.4, jumpSpeed: 8, gravity: -24 });
    g.ctx.physics.tag(this.ctrl.collider, 'player');
  }
  teleport(x, z, yaw) {
    const y = this.g.world.heightAt(x, z) + 0.3;
    this.ctrl.teleport([x, y, z]);
    if (yaw !== undefined) { this.g.ctx.camera.yaw = yaw; }
  }
  get feet() { return this.ctrl.feet; }
  eyePos(out) {
    const f = this.ctrl.feet, h = this.crouched ? 0.95 : 1.55;
    this.eyeH += (h - this.eyeH) * 0.2;
    return out.set(f.x, f.y + this.eyeH, f.z);
  }
  fixed(g, dt) {
    const input = g.ctx.input;
    const cam = g.ctx.camera;
    if (!g.canMove() || this.onRail) { this.ctrl.setInput(this.move.set(0, 0, 0), false, false); this.ctrl.fixedUpdate(dt); return; }
    const a = input.moveAxis();
    const mag = Math.min(1, Math.hypot(a.x, a.y));
    const yaw = cam.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    this.move.set(rx * a.x + fx * a.y, 0, rz * a.x + fz * a.y);
    if (this.move.lengthSq() > 1) this.move.normalize();
    const f = this.ctrl.feet;
    const k = g.world.kindAt(f.x, f.z);
    this.wading = k === 4;
    if (consume(input, 'crouch')) this.crouched = !this.crouched;
    const wantSprint = held(input, 'sprint') && a.y > 0.3 && this.stamina > 0.05 && !this.crouched && !this.wading && !g.weaponBusyForSprint?.();
    this.sprinting = wantSprint;
    let sp = SPEED.run;
    if (input.isDown('CapsLock')) this.walkToggle = true; else this.walkToggle = false;
    if (mag < 0.55 && input.padAxis && (Math.abs(input.padAxis.x) + Math.abs(input.padAxis.y)) > 0.05) sp = SPEED.walk;
    if (this.walkToggle) sp = SPEED.walk;
    if (this.crouched) sp = SPEED.crouch;
    if (this.sprinting) sp = SPEED.sprint;
    if (this.wading) sp = Math.min(sp, SPEED.wade);
    sp *= TUNING.playerSpeed * (g.carryPenalty?.() ?? 1);
    this.ctrl.speed = sp;
    const jump = consume(input, 'jump');
    this.ctrl.setInput(this.move, jump && !this.crouched, input.isDown('Space') || input.isDown('PadCross'));
    this.ctrl.fixedUpdate(dt);
    if (this.sprinting) this.stamina = Math.max(0, this.stamina - dt); else this.stamina = Math.min(6, this.stamina + dt * (6 / 8));
    this.speed2 = this.ctrl.velocity.x * this.ctrl.velocity.x + this.ctrl.velocity.z * this.ctrl.velocity.z;
    // fall damage
    const vy = this.ctrl.velocity.y;
    if (!this.ctrl.grounded) this.minVy = Math.min(this.minVy ?? 0, vy);
    else { if ((this.minVy ?? 0) < -Math.sqrt(2 * 24 * 6)) g.hurt?.(Math.round((-this.minVy - 12) * 6), 'fall'); this.minVy = 0; }
  }
  frame(g, dt) {
    this.bob += Math.sqrt(this.speed2 || 0) * dt * 1.8;
    this.pos.copy(this.ctrl.feet);
  }
  state() { const f = this.ctrl.feet; return { pos: [+f.x.toFixed(1), +f.y.toFixed(1), +f.z.toFixed(1)], hpv: this.hp, crouched: this.crouched, sprinting: this.sprinting }; }
}
