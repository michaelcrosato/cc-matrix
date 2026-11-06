// Pickup, technical, cargo truck, tanker on the engine's Vehicle. They rust and stall like everything else.
import { THREE, Vehicle, buildModel, setLookLayer, spatialize, RAPIER } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { MODELS } from '../art/models.js';
import { ROADS } from '../content/roads.js';
import { pointAlong, polyLength } from '../world/ground.js';
import { clamp, lerp, wrapAngle } from '../core/rng.js';
const { Vector3, Quaternion, Group } = THREE;
const _p = new Vector3(), _q = new Quaternion(), _v = new Vector3(), _f = new Vector3();
export const KINDS = {
  pickup: { model: 'pickup', o: { size: [0.95, 0.45, 2.2], mass: 12, power: 160, topSpeed: 26, wheelRadius: 0.42, suspension: 0.45, stiffness: 30, grip: 2.6 }, seat: [0.38, 0.85, 0.1], door: [1.6, 0, 0], bonnet: [0, 0, 3.0], hpK: 1 },
  technical: { model: 'technical', o: { size: [0.95, 0.45, 2.2], mass: 13, power: 165, topSpeed: 25, wheelRadius: 0.42, suspension: 0.45, stiffness: 30, grip: 2.6 }, seat: [0.38, 0.85, 0.1], door: [1.6, 0, 0], bonnet: [0, 0, 3.0], gunSeat: [0, 1.5, -1.5], hpK: 1.2 },
  truck: { model: 'truck', o: { size: [1.1, 0.55, 3.1], mass: 24, power: 240, topSpeed: 18, wheelRadius: 0.46, suspension: 0.5, stiffness: 38, grip: 2.4 }, seat: [0.44, 1.12, 1.0], door: [1.9, 0, 1], bonnet: [0, 0, 3.8], hpK: 1.5 },
  tanker: { model: 'tanker', o: { size: [1.1, 0.55, 3.1], mass: 26, power: 240, topSpeed: 17, wheelRadius: 0.46, suspension: 0.5, stiffness: 38, grip: 2.4 }, seat: [0.44, 1.12, 1.0], door: [1.9, 0, 1], bonnet: [0, 0, 3.8], hpK: 1.2, explosive: true },
};
export const WRECK = { pickup: { paint: 'ink', hood: 'night', roof: 'night', lamp: 'night', dark: 'ink' }, technical: { paint: 'ink', hood: 'night', roof: 'night', lamp: 'night', dark: 'ink', gun: 'ink' }, truck: { paint: 'ink', hood: 'night', roof: 'night', lamp: 'night', slat: 'night', canvas: 'plum', dark: 'ink' }, tanker: { paint: 'ink', hood: 'night', roof: 'night', lamp: 'night', tank: 'night', band: 'plum', dark: 'ink' } };
export class Vehicle2 {
  kind2 = 'vehicle'; hp = 100; alive = true; stalled = false; driver = null; x = 0; z = 0; y = 0; onFire = 0; explodeIn = 0; cough = 0; smokeT = 0; lastVel = 0; crew = 0; speed = 0;
  constructor(game, kind, at, yaw, palette) {
    const ctx = game.ctx;
    game.nextVehicleId = (game.nextVehicleId ?? 0) + 1;
    this.id = game.nextVehicleId;
    this.game = game; this.kind = kind; this.def = KINDS[kind];
    const y = game.world.heightAt(at[0], at[1]) + 1.1;
    this.car = new Vehicle(ctx.physics, { ...this.def.o, at: [at[0], y, at[1]], yaw });
    this.x = at[0]; this.z = at[1]; this.y = y;
    this.collider = this.car.body.collider(0);
    game.hitMap.set(this.collider.handle, { kind: 'vehicle', ref: this });
    if (game.views) {
      const build = buildModel(this.def.model, { catalog: MODELS, palette });
      this.object = build.object;
      setLookLayer(this.object, 'actors');
      this.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
      ctx.scene.add(this.object);
      ctx.physics.bind(this.car.body, this.object);
      this.wheels = [0, 1, 2, 3].map(() => {
        const w = buildModel('wheel', { catalog: MODELS }).object;
        setLookLayer(w, 'actors');
        w.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        this.object.add(w);
        return w;
      });
      this.turret = this.object.getObjectByName('Turret');
    }
  }
  get yaw() { return this.car.yaw; }
  hurt(a, source) {
    const g = this.game;
    if (!this.alive) return;
    if (g.dev.god && this.driver === 'player') return;
    this.hp -= (a / TUNING.vehicleToughness) / this.def.hpK;
    if (this.driver === 'player') { g.hudTouch('vehicle'); g.rumble(0.3, 0.08); }
    if (this.hp <= 10 && this.onFire <= 0 && this.hp > 0 && source !== 'stall-script') { this.onFire = 8; g.events.emit('vehicle-burning', this); }
    if (this.hp <= 0) {
      this.wreckage = (this.wreckage ?? 0) + a;
      this.hp = 0;
      if (this.onFire > 0 || source === 'rocket' || source === 'blast' || this.def.explosive || this.payroll || this.wreckage > 40) this.explode();
      else this.stall();
    }
  }
  stall() {
    if (this.stalled) return;
    this.stalled = true;
    this.game.sfx.at('starter-cough', this.x, this.z, { max: 60 });
    this.game.events.emit('vehicle-stalled', this);
  }
  explode() {
    const g = this.game;
    if (!this.alive) return;
    this.alive = false; this.stalled = true;
    g.damage.blast(this.x, this.y + 0.8, this.z, this.def.explosive ? 14 : 7, this.def.explosive ? 260 : 120, 'world', { fire: this.def.explosive ? 12 : 5 });
    if (this.driver === 'player') { g.driving.eject(); g.body.hurt(70, 'blast'); }
    g.events.emit('vehicle-destroyed', this);
    // Swap to the burnt palette.
    if (this.object) {
      const pal = WRECK[this.kind];
      const old = this.object;
      const w = buildModel(this.def.model, { catalog: MODELS, palette: pal }).object;
      setLookLayer(w, 'actors');
      w.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.ctx.physics.unbind(old);
      g.ctx.scene.remove(old);
      g.ctx.scene.add(w);
      g.ctx.physics.bind(this.car.body, w);
      this.object = w; this.wheels = []; this.turret = null;
    }
    this.onFire = 0;
    g.after(1, () => g.fire.ignite(this.x, this.z, 4, 'world'));
  }
  /** Full repair overnight, partial at the bonnet: back to 50 HP. */
  repair(to = 50) { this.wreckage = 0; this.hp = Math.max(this.hp, to); this.stalled = false; this.onFire = 0; this.explodeIn = 0; this.cough = 3.2; this.game.events.emit('vehicle-repaired', this); }
  place(x, z, yaw) {
    const y = this.game.world.heightAt(x, z) + 1.1;
    this.car.reset([x, y, z], yaw);
    this.x = x; this.z = z; this.y = y;
  }
  fixedUpdate(ctx, dt, input) {
    const g = this.game;
    const t = this.car.body.translation();
    this.x = t.x; this.y = t.y; this.z = t.z;
    if (!this.alive) { this.car.drive({ throttle: 0, steer: 0, brake: true }, dt); return; }
    this.car.o.topSpeed = (this.def.o.topSpeed / 26) * TUNING.vehicleTopSpeed;
    const inRiver = g.ground.isWater(this.x, this.z) && !g.ground.isFord(this.x, this.z) && this.y < 40.2;
    let powerK = 1;
    if (this.hp < 35) powerK = 0.6;
    if (this.stalled || inRiver) powerK = 0;
    if (this.cough > 0) { this.cough -= dt; powerK *= 0.6 + 0.4 * Math.abs(Math.sin(this.cough * 9)); }
    const inp = input ?? { throttle: 0, steer: 0, brake: true };
    this.car.o.power = this.def.o.power;
    const throttle = inp.throttle * powerK;
    this.car.drive({ throttle, steer: inp.steer, brake: inp.brake, handbrake: inp.handbrake }, dt);
    this.speed = this.car.speed;
    // Collisions: a hard stop over 8 m/s hurts.
    const v = this.car.body.linvel();
    const sp = Math.hypot(v.x, v.y, v.z);
    const dv = this.lastVel - sp;
    if (dv > 8) { this.hurt(dv * 2.2, 'crash'); if (this.driver === 'player') { ctx.engine.shake.add(clamp(dv * 0.04, 0.2, 0.8)); g.sfx.play('crash', { volume: 0.9 }); g.body.hurt(dv * 0.5, 'crash'); } }
    this.lastVel = sp;
    // Fire.
    if (g.fire.isBurning(this.x, this.z)) this.hurt(6 * dt, 'fire');
    if (this.onFire > 0) {
      this.onFire -= dt;
      if (this.onFire <= 0) this.explode();
    }
    // Smoke and flames.
    if ((this.smokeT -= dt) <= 0) {
      this.smokeT = 0.12;
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), L = this.def.o.size[2] * 0.8;
      if (this.hp < 35 && this.alive) ctx.particles.burst('vehicle-smoke', [this.x + fx * L, this.y + 0.9, this.z + fz * L]);
      if (this.hp <= 10 || this.onFire > 0) ctx.particles.burst('vehicle-flame', [this.x + fx * L, this.y + 0.9, this.z + fz * L], { count: 3 });
    }
  }
  update(ctx, dt) {
    if (!this.object) return;
    if (this.wheels) for (let i = 0; i < this.wheels.length; i++) { this.car.wheelPose(i, _p, _q, true); this.wheels[i].position.copy(_p); this.wheels[i].quaternion.copy(_q); }
  }
  dispose() {
    const g = this.game;
    if (this.object) { g.ctx.physics.unbind(this.object); g.ctx.scene.remove(this.object); }
    g.hitMap.delete(this.collider.handle);
    this.car.dispose();
  }
}
