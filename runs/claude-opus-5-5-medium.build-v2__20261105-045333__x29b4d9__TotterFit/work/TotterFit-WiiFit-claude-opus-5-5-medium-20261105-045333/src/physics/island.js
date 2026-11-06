// Do not move the island. Tilt gravity. Rapier sees a fixed flat disc.
import { RAPIER, G_GROUND, G_PROP, makeWorld, groups, GROUND } from './world.js';
import { T } from '../core/tuning.js';
const rad = (d) => d * Math.PI / 180;
export class TiltModel {
  constructor({ K, C, W, clamp = rad(26) }) { this.K = K; this.C = C; this.W = W; this.clamp = clamp; this.tx = 0; this.tz = 0; this.vx = 0; this.vz = 0; this.restX = 0; this.restZ = 0; }
  step(dt, sumX, sumZ, K = this.K, W = this.W) {
    this.vx += (K * this.restX + W * sumX - K * this.tx - this.C * this.vx) * dt; this.tx += this.vx * dt;
    this.vz += (K * this.restZ + W * sumZ - K * this.tz - this.C * this.vz) * dt; this.tz += this.vz * dt;
    const m = Math.hypot(this.tx, this.tz); if (m > this.clamp) { this.tx *= this.clamp / m; this.tz *= this.clamp / m; }
  }
  applyGravity(world, g = T.gravity) { world.gravity = { x: g * Math.sin(this.tx), y: -g * Math.cos(Math.hypot(this.tx, this.tz)), z: g * Math.sin(this.tz) }; }
  applyGroup(group) {
    const a = Math.hypot(this.tx, this.tz) || 1e-9, s = Math.sin(a / 2);
    group.quaternion.set(this.tz / a * s, 0, -this.tx / a * s, Math.cos(a / 2));
  }
}
export function makeIslandWorld() {
  const world = makeWorld({ iterations: 6 });
  const base = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -.5, 0));
  world.createCollider(RAPIER.ColliderDesc.cylinder(.5, 22).setFriction(.9).setCollisionGroups(groups(GROUND, 0xffff)), base);
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(Math.cos(a) * 22.1, 1, Math.sin(a) * 22.1).setRotation({ x: 0, y: Math.sin(-a / 2), z: 0, w: Math.cos(-a / 2) }));
    world.createCollider(RAPIER.ColliderDesc.cuboid(.15, 1, 1.9).setCollisionGroups(groups(GROUND, 0xffff)), b);
  }
  return world;
}
export function restWeight() { return T.islandSpring * rad(T.islandWeight) / 22; }
export { G_GROUND, G_PROP };
