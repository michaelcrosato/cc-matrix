import { RAPIER, dollGroups } from './world.js';
import { tuning } from '../data/tuning.js';

// The doll's balance core: a torque-limited controller on a ball joint at the foot (PLAN section 4).
export class Balancer {
  constructor(pw, { lane = 0, x = 0, y = 0, z = 0, params = {} } = {}) {
    this.pw = pw; this.lane = lane;
    this.p = Object.assign({ maxLean: null, margin: null, zeta: null, ankleMax: null, reflex: null, fallAngle: null, diff: 1, ankleScale: 1, distScale: 1 }, params);
    this.foot = pw.body(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z));
    this.body = pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y + 0.75, z).setCanSleep(false).setAdditionalSolverIterations(4));
    this.col = pw.world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.25).setMass(1).setCollisionGroups(dollGroups(lane)), this.body);
    this.makeJoint();
    this.wx = 0; this.wz = 0; this.wishX = 0; this.wishZ = 0;
    this.leanX = 0; this.leanZ = 0; this.angX = 0; this.angZ = 0;
    this.nx = 0; this.nz = 0; this.pushX = 0; this.pushZ = 0; this.kickX = 0; this.kickZ = 0; this.kickT = 0;
    this.flailLeft = 0; this.flailCd = 0; this.fallen = false; this.t = 0; this.seed = 0.3;
    this.sway = 0; this.tremor = 0; this.footBase = { x, y, z };
    this.footV = { x: 0, z: 0 };
    this.enabled = true; this.halfMargin = false;
    this.fx = x; this.fz = z;
  }
  makeJoint() {
    this.joint = this.pw.world.createImpulseJoint(RAPIER.JointData.spherical({ x: 0, y: 0, z: 0 }, { x: 0, y: -0.75, z: 0 }), this.foot, this.body, true);
    this.joint.setContactsEnabled(false);
  }
  get par() {
    const p = this.p, t = tuning;
    return {
      maxLean: (p.maxLean ?? t.maxLean) * Math.PI / 180,
      margin: (p.margin ?? t.margin) * (this.halfMargin ? 0.5 : 1),
      zeta: p.zeta ?? t.zeta,
      ankleMax: (p.ankleMax ?? t.ankleMax) * p.diff * p.ankleScale,
      reflex: p.reflex ?? t.reflex,
      fall: (p.fallAngle ?? t.fallAngle) * Math.PI / 180,
    };
  }
  setWish(x, z) { const m = Math.hypot(x, z); if (m > 1) { x /= m; z /= m; } this.wishX = x; this.wishZ = z; }
  flail() { if (this.flailCd > 0 || this.fallen) return false; this.flailLeft = 0.35; this.flailCd = tuning.flailCooldown; return true; }
  // shove: add to the unclamped disturbance for dur seconds
  shove(nx, nz, dur = 0.3) { this.kickX = nx; this.kickZ = nz; this.kickT = dur; }
  // each fixed step, before world.step()
  prestep(dt) {
    if (!this.enabled || this.fallen) return;
    const P = this.par; const G = 9.81 * 0.75, I = 0.75 * 0.75 + 0.06;
    const K = G * (1 + P.margin), wn = Math.sqrt((K - G) / I), D = 2 * P.zeta * wn * I;
    this.t += dt;
    if (this.flailLeft > 0) this.flailLeft -= dt;
    if (this.flailCd > 0) this.flailCd -= dt;
    if (this.kickT > 0) this.kickT -= dt;
    const r = 1 - Math.exp(-P.reflex * dt);
    this.wx += (this.wishX - this.wx) * r; this.wz += (this.wishZ - this.wz) * r;
    const tx = this.wx * P.maxLean, tz = this.wz * P.maxLean;
    const q = this.body.rotation();
    const ux = 2 * (q.x * q.y - q.w * q.z), uy = 1 - 2 * (q.x * q.x + q.z * q.z), uz = 2 * (q.y * q.z + q.w * q.x);
    this.leanX = Math.atan2(ux, uy); this.leanZ = Math.atan2(uz, uy);
    const w = this.body.angvel();
    let Tx = -(G * Math.sin(tx) + K * (this.leanX - tx)) + D * w.z;
    let Tz = -(G * Math.sin(tz) + K * (this.leanZ - tz)) - D * w.x;
    const limit = P.ankleMax * (this.flailLeft > 0 ? tuning.flailBoost : 1);
    const m = Math.hypot(Tx, Tz); if (m > limit) { Tx *= limit / m; Tz *= limit / m; }
    const t = this.t, ph = this.seed, sw = this.sway * tuning.swayScale * this.p.distScale, tr = this.tremor * tuning.tremorScale * this.p.distScale;
    let nx = sw * (Math.sin(t * 0.9 + ph) * 0.6 + Math.sin(t * 1.73 + ph * 2.1) * 0.4) + tr * (Math.sin(t * 8.2 + 1.1) * 0.6 + Math.sin(t * 18.3) * 0.4);
    let nz = sw * (Math.sin(t * 0.77 + ph * 1.7) * 0.6 + Math.sin(t * 1.51 + ph * 0.6) * 0.4) + tr * (Math.sin(t * 7.1 + 2.3) * 0.6 + Math.sin(t * 15.7 + 0.7) * 0.4);
    nx += this.pushX + (this.kickT > 0 ? this.kickX : 0); nz += this.pushZ + (this.kickT > 0 ? this.kickZ : 0);
    this.nx = nx; this.nz = nz;
    this.body.resetTorques(true);
    this.body.addTorque({ x: Tz + nz, y: -w.y * 0.6, z: -(Tx + nx) }, true);
  }
  // the lean as the player sees it, normalised to the disc
  get cobX() { return this.leanX / this.par.maxLean; }
  get cobZ() { return this.leanZ / this.par.maxLean; }
  get leanDeg() { return Math.hypot(this.leanX, this.leanZ) * 180 / Math.PI; }
  checkFall() { return !this.fallen && Math.hypot(this.leanX, this.leanZ) > this.par.fall; }
  // smooth foot motion: set a target velocity, the foot low-passes toward it (tau)
  moveFoot(vx, vz, dt, tau = 0.5) {
    const a = 1 - Math.exp(-dt / tau);
    this.footV.x += (vx - this.footV.x) * a; this.footV.z += (vz - this.footV.z) * a;
    this.fx += this.footV.x * dt; this.fz += this.footV.z * dt;
    this.foot.setNextKinematicTranslation({ x: this.fx, y: this.footBase.y, z: this.fz });
  }
  place(x, y, z) { this.fx = x; this.fz = z; this.footBase.y = y; this.foot.setTranslation({ x, y, z }, true); this.foot.setNextKinematicTranslation({ x, y, z }); }
  disable() { this.fallen = true; this.body.setEnabled(false); }
  // after a ragdoll: reset pose, velocities and the cached lean
  recover(x, z) {
    this.fallen = false;
    if (x !== undefined) { this.fx = x; this.fz = z; }
    this.foot.setTranslation({ x: this.fx, y: this.footBase.y, z: this.fz }, true);
    this.foot.setNextKinematicTranslation({ x: this.fx, y: this.footBase.y, z: this.fz });
    this.body.setEnabled(true);
    this.body.setTranslation({ x: this.fx, y: this.footBase.y + 0.75, z: this.fz }, true);
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true); this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.leanX = 0; this.leanZ = 0; this.wx = 0; this.wz = 0; this.wishX = 0; this.wishZ = 0; this.flailLeft = 0;
  }
  // free body for the air (springboard): remove the joint
  freeJoint() { if (this.joint) { this.pw.world.removeImpulseJoint(this.joint, true); this.joint = null; } }
  relink() { if (!this.joint) this.makeJoint(); }
  addCollider(desc) { return this.pw.world.createCollider(desc, this.body); }
  dispose() { this.pw.removeBody(this.body); this.pw.removeBody(this.foot); }
}
