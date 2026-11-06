import { RAPIER, groups } from './world.js';
import { tun, rel } from '../core/tuning.js';

const RAD = Math.PI / 180;
const H = 0.75, I = 0.75 * 0.75 + 0.06;

/**
 * The balance core: one dynamic body on a ball joint at the foot, driven by a torque-limited
 * spring toward the lean the player asks for. Every standing thing in the game uses it.
 */
export class Balancer {
  constructor(world, laneIndex, fx, fy, fz, opts = {}) {
    this.world = world;
    this.lane = laneIndex;
    this.fx = fx; this.fy = fy; this.fz = fz;
    this.params = { maxLean: 18, margin: 0.45, zeta: 0.4, ankleMax: 4.6, reflex: 10, ...opts };
    this.ph = opts.ph ?? 0;
    this.diff = opts.diff || { ankle: 1, dist: 1 };
    this.foot = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(fx, fy, fz));
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(fx, fy + H, fz).setCanSleep(false).setAdditionalSolverIterations(4));
    this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.25).setMass(1)
      .setCollisionGroups(groups.doll(laneIndex)), this.body);
    this._joinFoot();
    this.wx = 0; this.wz = 0;
    this.wishX = 0; this.wishZ = 0;
    this.leanX = 0; this.leanZ = 0;
    this.extX = 0; this.extZ = 0;
    this.sway = 0; this.tremor = 0;
    this.flailLeft = 0; this.flailCool = 0;
    this.time = 0;
    this.enabled = true;
    this.air = false;
    this.breathScale = 1;
  }
  _joinFoot() {
    this.joint = this.world.createImpulseJoint(
      RAPIER.JointData.spherical({ x: 0, y: 0, z: 0 }, { x: 0, y: -H, z: 0 }), this.foot, this.body, true);
    this.joint.setContactsEnabled(false);
  }
  /** Radians of maximum lean with event params and live tuning. */
  get maxLean() { return this.params.maxLean * rel('maxLean') * RAD; }
  /** The dot on the Balance Disc: lean as a share of max lean. */
  get cobX() { return this.leanX / this.maxLean; }
  get cobZ() { return this.leanZ / this.maxLean; }
  get lean() { return Math.hypot(this.leanX, this.leanZ); }
  flail() {
    if (this.flailCool > 0) return false;
    this.flailLeft = 0.35; this.flailCool = tun.flailCooldown;
    return true;
  }
  pre(dt) {
    if (!this.enabled) return;
    this.time += dt;
    if (this.air) { this.body.resetTorques(true); this.extX = 0; this.extZ = 0; return; }
    this.flailLeft = Math.max(0, this.flailLeft - dt);
    this.flailCool = Math.max(0, this.flailCool - dt);
    const p = this.params, grav = tun.gravity;
    const G = grav * H;
    const margin = p.margin * rel('margin');
    const zeta = p.zeta * rel('zeta');
    const K = G * (1 + margin), wn = Math.sqrt((K - G) / I), D = 2 * zeta * wn * I;
    const r = 1 - Math.exp(-p.reflex * rel('reflex') * dt);
    this.wx += (this.wishX - this.wx) * r; this.wz += (this.wishZ - this.wz) * r;
    const ml = this.maxLean;
    const tx = this.wx * ml, tz = this.wz * ml;
    const q = this.body.rotation();
    const ux = 2 * (q.x * q.y - q.w * q.z), uy = 1 - 2 * (q.x * q.x + q.z * q.z), uz = 2 * (q.y * q.z + q.w * q.x);
    this.leanX = Math.atan2(ux, uy); this.leanZ = Math.atan2(uz, uy);
    const w = this.body.angvel();
    let Tx = -(G * Math.sin(tx) + K * (this.leanX - tx)) + D * w.z;
    let Tz = -(G * Math.sin(tz) + K * (this.leanZ - tz)) - D * w.x;
    const limit = p.ankleMax * rel('ankleMax') * this.diff.ankle * (this.flailLeft > 0 ? tun.flailBoost : 1);
    const m = Math.hypot(Tx, Tz);
    if (m > limit) { Tx *= limit / m; Tz *= limit / m; }
    const t = this.time, ph = this.ph, sway = this.sway * tun.swayScale * this.diff.dist * this.breathScale,
      trem = this.tremor * tun.tremorScale * this.diff.dist * this.breathScale;
    const nx = sway * (Math.sin(t * 0.9 + ph) * 0.6 + Math.sin(t * 1.73 + ph * 2.1) * 0.4)
      + trem * (Math.sin(t * 8.2 + 1.1) * 0.6 + Math.sin(t * 18.3) * 0.4) + this.extX;
    const nz = sway * (Math.sin(t * 0.77 + ph * 1.7) * 0.6 + Math.sin(t * 1.51 + ph * 0.6) * 0.4)
      + trem * (Math.sin(t * 7.1 + 2.3) * 0.6 + Math.sin(t * 15.7 + 0.7) * 0.4) + this.extZ;
    this.body.resetTorques(true);
    this.body.addTorque({ x: Tz + nz, y: -w.y * 0.6, z: -(Tx + nx) }, true);
    this.extX = 0; this.extZ = 0;
  }
  moveFoot(x, y, z) {
    this.fx = x; this.fy = y; this.fz = z;
    this.foot.setNextKinematicTranslation({ x, y, z });
  }
  /** Read the lean after the step. */
  post() {
    if (!this.enabled) return;
    const q = this.body.rotation();
    const ux = 2 * (q.x * q.y - q.w * q.z), uy = 1 - 2 * (q.x * q.x + q.z * q.z), uz = 2 * (q.y * q.z + q.w * q.x);
    this.leanX = Math.atan2(ux, uy); this.leanZ = Math.atan2(uz, uy);
  }
  disable() { this.enabled = false; this.body.setEnabled(false); }
  /** Springboard: the core waits out of the way, still enabled, while the ragdoll has the water. */
  park() {
    this.enabled = false;
    this.body.setGravityScale(0, true);
    this.body.setTranslation({ x: this.fx, y: -60, z: this.fz }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  unpark() { this.body.setGravityScale(1, true); this.recover(); }
  /** Stand back up: pose, velocities and the cached lean all reset, or the doll falls again for ever. */
  recover() {
    this.body.setEnabled(true);
    this.body.setTranslation({ x: this.fx, y: this.fy + H, z: this.fz }, true);
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.leanX = 0; this.leanZ = 0; this.wx = 0; this.wz = 0;
    this.enabled = true; this.flailLeft = 0;
  }
  /** Cut the core free of the foot (Springboard's air). */
  release() { if (this.joint) { this.world.removeImpulseJoint(this.joint, true); this.joint = null; this.air = true; } }
  reattach() { if (!this.joint) { this._joinFoot(); this.air = false; } }
}
