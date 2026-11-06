// Trucks that die. Three bodies on the engine's Vehicle.
import { buildModel, setLookLayer, SpringChain, Squash, THREE, toonMaterial, Vehicle } from '../../pixel-engine.js';
import { CATALOG, WRECK_PAL } from '../art/models.js';
import { held, pressedFixed } from '../core/actions.js';
import { TUNING } from '../core/tuning.js';
import { angleDiff, clamp } from '../world/geom.js';
import { mixin } from '../core/mixin.js';
import { DrivingPart } from './driving.js';
import { RepairPart } from './repair.js';
const { Quaternion, Vector3 } = THREE;
const P = new Vector3(), R = new Quaternion(), T = new Vector3(), A = new Vector3(), B = new Vector3(), Z = new Vector3(0, 0, 1);
const WHIP = new THREE.BoxGeometry(0.012, 0.012, 1), WHIP_SEGMENTS = 5, WHIP_LENGTH = 0.2;
const columns = (q, out) => { out[0] = [...new Vector3(1, 0, 0).applyQuaternion(q).toArray()]; out[1] = [...new Vector3(0, 1, 0).applyQuaternion(q).toArray()]; out[2] = [...new Vector3(0, 0, 1).applyQuaternion(q).toArray()]; return out; };
const TYPES = {
  pickup: { model: 'pickup', size: [0.95, 0.45, 2.2], mass: 12, power: 160, topK: 1, seat: [0.42, 0.95, 0.1] },
  technical: { model: 'technical', size: [0.95, 0.45, 2.2], mass: 13, power: 160, topK: 0.95, seat: [0.42, 0.95, 0.1], gun: [0, 1.75, -1.5] },
  'cargo-truck': { model: 'cargo-truck', size: [1.05, 0.6, 2.9], mass: 20, power: 220, topK: 0.72, seat: [0.42, 1.2, 0.2], wheelR: 0.5 },
  tanker: { model: 'tanker', size: [1.05, 0.6, 2.9], mass: 24, power: 240, topK: 0.68, seat: [0.42, 1.2, 0.2], wheelR: 0.5 },
};
export class GameVehicle {
  hp = 100; seated = false; stalled = false; onFire = 0; cough = 0; aiRoad = null; aiS = 0; repairT = 0; dead = false; driverless = 0;
  constructor(game, ctx, type, x, z, yaw, tag) {
    this.game = game; this.ctx = ctx; this.type = type; this.tag = tag ?? null;
    const t = TYPES[type]; this.t = t;
    const y = game.world.land.heightAt(x, z) + 1.4;
    this.v = new Vehicle(ctx.physics, { at: [x, y, z], yaw, size: t.size, mass: t.mass, power: t.power, topSpeed: TUNING.vehicleTopSpeed * t.topK, wheelRadius: t.wheelR ?? 0.42, suspension: 0.45, stiffness: 30, grip: 2.6 });
    this.x = x; this.y = y; this.z = z; this.yaw = yaw;
    const b = buildModel(t.model, { catalog: CATALOG });
    this.object = b.object; setLookLayer(this.object, 'actors');
    this.object.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    ctx.scene.add(this.object); ctx.physics.bind(this.v.body, this.object);
    this.gunNode = this.object.getObjectByName('Gun');
    // A radio whip on the wing: it nods with every rut. The body gives on a hard knock.
    this.whip = new SpringChain({ segments: WHIP_SEGMENTS, length: WHIP_LENGTH, rest: [0, 1, 0], stiffness: 16, keep: 0.93, gravity: 1 });
    this.whipFoot = new Vector3(-t.size[0] * 0.55, t.size[1] + 0.3, t.size[2] * 0.72);
    this.whipBits = Array.from({ length: WHIP_SEGMENTS }, () => { const m = new THREE.Mesh(WHIP, toonMaterial(0x1b1b2a)); m.castShadow = false; m.frustumCulled = false; setLookLayer(m, 'actors'); ctx.scene.add(m); return m; });
    this.whipBasis = [[], [], []]; this.squash = new Squash(); this.squash.amount = 0.5;
    this.wheels = [0, 1, 2, 3].map(() => { const w = buildModel('wheel', { catalog: CATALOG, params: {} }); if (t.wheelR) w.object.scale.setScalar(t.wheelR / 0.42); this.object.add(w.object); return w.object; });
    for (let i = 0; i < this.v.body.numColliders(); i++) game.world.own(this.v.body.collider(i), 'vehicle', this);
    this.body = this.v.body;
    this.engineVoice = null;
  }
  fixed(dt, input = null) {
    const t = this.v.body.translation(); this.x = t.x; this.y = t.y; this.z = t.z; this.yaw = this.v.yaw;
    this.v.o.topSpeed = TUNING.vehicleTopSpeed * this.t.topK;
    if (this.game.world.fire.isBurning(this.x, this.z)) this.damage(6 * dt);
    if (this.onFire > 0) { this.onFire -= dt; if (this.onFire <= 0 && !this.dead) this.explode(); }
    this.cough = Math.max(0, this.cough - dt);
    let drive = input ?? { throttle: 0, steer: 0, handbrake: !this.seated && !this.aiRoad };
    const deep = this.game.world.land.waterDepth(this.x, this.z) > 0.45;
    let k = 1;
    if (this.hp < 35) k *= 0.6;
    if (this.cough > 0 && Math.sin(this.cough * 30) > 0.2) k *= 0.1;
    if (deep) k *= 0.08;
    if (this.stalled || this.dead) k = 0;
    this.v.drive({ ...drive, throttle: drive.throttle * k, brake: drive.brake || (this.stalled && !this.seated) }, dt);
    // Collisions over 8 m/s hurt.
    const sp = Math.abs(this.v.speed);
    if ((this.lastSp ?? 0) - sp > 8) { this.damage(((this.lastSp - sp) - 8) * 6); this.squash.kick(-9); this.game.audio.at('hit-metal', this.x, this.y, this.z, 40); this.ctx.engine.shake.add(this.seated ? 0.5 : 0); }
    this.lastSp = sp;
  }
  damage(n, by, blast) {
    if (this.dead) return;
    const g = this.game;
    this.hp -= n / TUNING.vehicleToughness;
    if (this.seated) g.hud.touch();
    if (this.hp < 10 && this.hp > -999 && this.onFire <= 0 && !this.dead) { this.onFire = 8; if (this.seated) g.talk.say('you', 'SHE IS ON FIRE. GET OUT.', 3); }
    if (this.hp <= 0 && blast) this.explode(by);
    else if (this.hp <= 0 && !this.stalled) { this.stalled = true; this.hp = 0; g.audio.at('stall', this.x, this.y, this.z, 50); g.events.emit('stalled', this); }
  }
  explode(by) {
    if (this.dead) return; this.dead = true; this.hp = 0; this.stalled = true; this.onFire = 0;
    const g = this.game;
    g.events.emit('vehicleDestroyed', this, by);
    if (this.seated) g.vehicles.exit(true);
    g.combat.explode(this.x, this.y + 0.5, this.z, 8, 90, by, { fire: 8, big: true });
    this.wreck();
  }
  wreck() { this.dropWhip(); if (this.driverView) { this.object.remove(this.driverView.object); this.driverView = null; } const b = buildModel(this.t.model, { catalog: CATALOG, palette: WRECK_PAL }); this.ctx.physics.unbind(this.object); const at = this.object.position.clone(), q = this.object.quaternion.clone(); for (const w of this.wheels) this.object.remove(w); this.ctx.scene.remove(this.object); this.object = b.object; this.object.position.copy(at); this.object.quaternion.copy(q); setLookLayer(this.object, 'actors'); this.ctx.scene.add(this.object); this.ctx.physics.bind(this.v.body, this.object); }
  updateWhip(dt) {
    if (!this.whipBits.length) return;
    const foot = A.copy(this.whipFoot).applyQuaternion(this.object.quaternion).add(this.object.position).toArray(), first = !this.whipSet;
    columns(this.object.quaternion, this.whipBasis);
    if (first) { this.whip.reset(foot, this.whipBasis); this.whipSet = true; } else this.whip.update(dt, foot, this.whipBasis);
    const pts = this.whip.points;
    this.whipBits.forEach((m, i) => { A.fromArray(pts[i]); B.fromArray(pts[i + 1]); m.position.copy(A).add(B).multiplyScalar(0.5); m.scale.z = A.distanceTo(B) || 0.01; m.quaternion.setFromUnitVectors(Z, B.sub(A).normalize()); });
  }
  dropWhip() { for (const m of this.whipBits) { this.ctx.scene.remove(m); m.material.dispose(); } this.whipBits = []; }
  update(dt) {
    this.squash.update(dt); const [h, v] = this.squash.scale(); this.object.scale.set(h, v, h);
    this.updateWhip(dt);
    for (let i = 0; i < 4; i++) { this.v.wheelPose(i, P, R, true); this.wheels[i].position.copy(P); this.wheels[i].quaternion.copy(R); }
    if (this.hp < 35 && !this.dead && this.game.world.look.next() < dt * 8) this.ctx.particles.burst('fire-smoke', [this.x + Math.sin(this.yaw) * 1.5, this.y + 0.8, this.z + Math.cos(this.yaw) * 1.5], { count: 1 });
    if (this.onFire > 0 && this.game.world.look.next() < dt * 30) this.ctx.particles.burst('ember', [this.x + Math.sin(this.yaw) * 1.5, this.y + 0.8, this.z + Math.cos(this.yaw) * 1.5]);
    if (this.dead && this.game.world.look.next() < dt * 3) this.ctx.particles.burst('fire-smoke', [this.x, this.y + 1, this.z], { count: 1 });
    if (this.gunNode && this.game.player.mounted && this.seated) { const q = this.object.quaternion, yaw = this.ctx.camera.yaw; void q; this.gunNode.rotation.set(-this.ctx.camera.pitch, yaw - this.yaw + Math.PI, 0); }
  }
  seatWorld(out) { out.set(...this.t.seat).applyQuaternion(this.object.quaternion); out.add(this.object.position); return out; }
  gunWorld(out) { out.set(...(this.t.gun ?? this.t.seat)).applyQuaternion(this.object.quaternion); out.add(this.object.position); return out; }
  dispose() {
    for (let i = 0; i < this.v.body.numColliders(); i++) this.game.world.owners.delete(this.v.body.collider(i).handle);
    this.dropWhip(); this.ctx.physics.unbind(this.object); this.ctx.scene.remove(this.object); this.v.dispose(); this.ctx.physics.remove(this.v.body);
  }
}
export class Vehicles {
  list = []; chase = false; repairing = null; stationary = [];
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; this.rng = ctx.random.fork('veh'); }
  spawn(type, x, z, yaw = 0, tag) { const v = new GameVehicle(this.game, this.ctx, type, x, z, yaw, tag); this.list.push(v); return v; }
  remove(v) { if (v.seated) this.exit(true); v.dispose(); this.list.splice(this.list.indexOf(v), 1); }
  clear() { for (const v of [...this.list]) this.remove(v); }
  fixed(dt) {
    const g = this.game, p = g.player, input = this.ctx.input;
    for (const v of this.list) {
      if (v === p.vehicle) continue;
      if (v.aiRoad && !v.dead) v.fixed(dt, this.aiDrive(v, dt));
      else v.fixed(dt);
    }
    const v = p.vehicle; if (!v) return;
    let throttle = 0, steer = 0, handbrake = false;
    if (!g.ui.top && !g.talk.locksPlayer() && !p.mounted) {
      const axis = input.moveAxis(); steer = g.device === 'pad' ? axis.x : (input.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (input.isDown('KeyA', 'ArrowLeft') ? 1 : 0);
      const r2 = g.analog[1] > 0.02 ? g.analog[1] : held(input, 'gas') ? 1 : 0, l2 = g.analog[0] > 0.02 ? g.analog[0] : held(input, 'brake') ? 1 : 0;
      throttle = r2 - l2; handbrake = held(input, 'handbrake');
      if (pressedFixed(input, 'chase')) { this.chase = !this.chase; if (!this.chase) g.cam.override = null; }
      if (!p.mapUp && pressedFixed(input, 'exit') && !g.prompt.has()) { this.exit(); return; }
      if (pressedFixed(input, 'swap') && v.t.gun) this.mount(v);
    } else if (p.mounted && !g.ui.top) {
      if (pressedFixed(input, 'swap') || pressedFixed(input, 'exit')) this.dismount(v);
    }
    v.fixed(dt, { throttle, steer, handbrake });
    // The road under you.
    const sp = Math.abs(v.v.speed); this.gravT = (this.gravT ?? 0) - dt;
    if (this.gravT <= 0 && sp > 4 && !p.mounted) { this.gravT = 0.5; const k = g.world.land.kindAt(v.x, v.z); if (k !== 7) g.audio.play('gravel', { volume: Math.min(0.5, sp / 40) }); }
    if (throttle < -0.3 && v.v.speed > 8 && (this.brakeT = (this.brakeT ?? 0) - dt) <= 0) { this.brakeT = 1.2; g.audio.play('brakes', { volume: 0.5 }); }
    // Keep the view turning with the truck.
    const dy = angleDiff(v.yaw, this.lastYaw ?? v.yaw); this.lastYaw = v.yaw; this.ctx.camera.yaw += dy;
    p.speed2 = Math.abs(v.v.speed);
    if (this.engine) this.engine.set({ volume: v.stalled ? 0 : 0.35 * g.sfxK(), pitch: clamp(Math.abs(v.v.speed) * 0.5 - 2, -4, 12) });
  }
  update(dt) {
    const g = this.game, p = g.player;
    for (const v of this.list) v.update(dt);
    const v = p.vehicle;
    if (v && this.chase && !p.mapUp) {
      const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
      g.cam.override = { position: [v.x - fx * 8, v.y + 3.4, v.z - fz * 8], target: [v.x + fx * 4, v.y + 1, v.z + fz * 4] };
    }
  }
}
mixin(Vehicles, DrivingPart);
mixin(GameVehicle, RepairPart);
