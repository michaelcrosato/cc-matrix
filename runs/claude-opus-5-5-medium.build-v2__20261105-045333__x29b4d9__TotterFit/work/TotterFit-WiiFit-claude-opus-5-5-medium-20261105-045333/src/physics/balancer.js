// The balance core: one dynamic body on a ball joint at the foot. Everything that stands uses it.
import { RAPIER, G_DOLL } from './world.js';
import { T } from '../core/tuning.js';
const rad = (d) => d * Math.PI / 180;
export class Balancer {
  constructor(world, lane, fx, fy, fz, opts = {}) {
    this.world = world; this.lane = lane; this.opts = opts;
    this.fx = fx; this.fy = fy; this.fz = fz;
    this.foot = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(fx, fy, fz));
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(fx, fy + .75, fz).setCanSleep(false).setAdditionalSolverIterations(4));
    this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(.5, .25).setMass(1).setCollisionGroups(G_DOLL(lane)), this.body);
    this.makeJoint();
    this.wx = 0; this.wz = 0; this.leanX = 0; this.leanZ = 0; this.nx = 0; this.nz = 0;
    this.flailLeft = 0; this.flailCool = 0; this.enabled = true; this.free = false;
    this.mods = { ankle: 1, margin: null, zeta: null, reflex: null, maxLean: null };
    this.t = 0;
  }
  makeJoint() {
    this.joint = this.world.createImpulseJoint(RAPIER.JointData.spherical({ x: 0, y: 0, z: 0 }, { x: 0, y: -.75, z: 0 }), this.foot, this.body, true);
    this.joint.setContactsEnabled(false);
  }
  maxLeanRad() { return rad(this.opts.maxLean ?? T.maxLean); }
  margin() { return this.mods.margin ?? this.opts.margin ?? T.margin; }
  ankle() { return (this.opts.ankleMax ?? T.ankleMax) * this.mods.ankle; }
  /** Call before world.step(). wish is on the unit disc, in world x/z. */
  step(dt, wishX, wishZ) {
    this.t += dt;
    if (this.flailLeft > 0) this.flailLeft -= dt;
    if (this.flailCool > 0) this.flailCool -= dt;
    if (!this.enabled || this.free) { this.readLean(); return; }
    const G = T.gravity * .75, I = .75 * .75 + .06;
    const margin = this.margin();
    const K = G * (1 + margin), wn = Math.sqrt(Math.max(.01, K - G) / I);
    const zeta = this.mods.zeta ?? this.opts.zeta ?? T.zeta;
    const D = 2 * zeta * wn * I;
    const reflex = this.mods.reflex ?? this.opts.reflex ?? T.reflex;
    const r = 1 - Math.exp(-reflex * dt);
    this.wx += (wishX - this.wx) * r; this.wz += (wishZ - this.wz) * r;
    const maxLean = this.maxLeanRad();
    const tx = this.wx * maxLean, tz = this.wz * maxLean;
    this.readLean();
    const w = this.body.angvel();
    let Tx = -(G * Math.sin(tx) + K * (this.leanX - tx)) + D * w.z;
    let Tz = -(G * Math.sin(tz) + K * (this.leanZ - tz)) - D * w.x;
    const limit = this.ankle() * (this.flailLeft > 0 ? T.flailBoost : 1);
    const m = Math.hypot(Tx, Tz); if (m > limit) { Tx *= limit / m; Tz *= limit / m; }
    this.body.resetTorques(true);
    this.body.addTorque({ x: Tz + this.nz, y: -w.y * .6, z: -(Tx + this.nx) }, true);
  }
  readLean() {
    const q = this.body.rotation();
    const ux = 2 * (q.x * q.y - q.w * q.z), uy = 1 - 2 * (q.x * q.x + q.z * q.z), uz = 2 * (q.y * q.z + q.w * q.x);
    this.leanX = Math.atan2(ux, uy); this.leanZ = Math.atan2(uz, uy);
    this.angle = Math.atan2(Math.hypot(ux, uz), uy);
  }
  get cobX() { return this.leanX / this.maxLeanRad(); }
  get cobZ() { return this.leanZ / this.maxLeanRad(); }
  flail() { if (this.flailCool > 0) return false; this.flailLeft = .35; this.flailCool = T.flailCooldown; return true; }
  moveFoot(x, y, z) { this.fx = x; this.fy = y; this.fz = z; this.foot.setNextKinematicTranslation({ x, y, z }); }
  /** Reset to upright, including the cached lean: a stale lean falls again at once, for ever. */
  reset() {
    this.body.setTranslation({ x: this.fx, y: this.fy + .75, z: this.fz }, true);
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true); this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetTorques(true);
    this.leanX = 0; this.leanZ = 0; this.angle = 0; this.wx = 0; this.wz = 0;
  }
  setEnabled(on) { this.enabled = on; this.body.setEnabled(on); this.collider.setEnabled(on); }
  /** Springboard: free flight. Removes the foot joint. */
  release() { if (this.joint) { this.world.removeImpulseJoint(this.joint, true); this.joint = null; } this.free = true; }
  reattach() { this.free = false; this.reset(); this.makeJoint(); }
}
