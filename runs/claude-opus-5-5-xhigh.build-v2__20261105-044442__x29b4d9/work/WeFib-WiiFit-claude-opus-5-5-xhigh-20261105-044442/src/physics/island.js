import { RAPIER, GROUND, createWorld } from './world.js';
import { tun } from '../core/tuning.js';
import { cos } from '../core/rng.js';

const RAD = Math.PI / 180;
/** Do not move the island. Tilt gravity. Rapier sees a fixed flat disc. */
export class IslandPhysics {
  constructor() {
    this.world = createWorld({ iterations: 6 });
    this.tx = 0; this.tz = 0; this.vx = 0; this.vz = 0; this.rest = 9; this.restNow = 9; this.restAngle = 0.4;
    this.leanExtraX = 0; this.leanExtraZ = 0;
    this.walkerEnabled = false;
    // The usual ground filter leaves out doll bits so balance cores never catch on the floor. The walker is a doll, and it has to stand here.
    const stopsAll = (GROUND << 16 | 0xFFFF) >>> 0;
    const disc = RAPIER.ColliderDesc.cylinder(0.5, 22).setTranslation(0, -0.5, 0).setFriction(0.9).setCollisionGroups(stopsAll);
    this.world.createCollider(disc);
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const q = yawQ(-a);
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 1, 1.9).setTranslation(Math.cos(a) * 21.9, 1, Math.sin(a) * 21.9).setRotation(q).setFriction(0.5).setCollisionGroups(stopsAll));
    }
    // Walker
    const b = this.walker = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.9, 10).lockRotations().setCanSleep(false));
    this.walkerCol = this.world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setMass(1).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setCollisionGroups(((0x0100 << 16) | 0x0011) >>> 0), b);
    this.wantX = 0; this.wantZ = 0;
    this.props = [];
    this.addProps();
    this.q = { x: 0, y: 0, z: 0, w: 1 };
  }
  addProps() {
    for (let i = 0; i < 44; i++) {
      const a = cos(0, 6.28), r = cos(2, 19);
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(Math.cos(a) * r, 0.4, Math.sin(a) * r).setCanSleep(false).setAngularDamping(0.4).setLinearDamping(0.08));
      this.world.createCollider(RAPIER.ColliderDesc.ball(0.14).setMass(0.05).setFriction(0.8).setRestitution(0.3).setCollisionGroups(((0x0010 << 16) | 0x0111) >>> 0), body);
      this.props.push({ body, kind: 'orange', r: 0.14 });
    }
    for (let i = 0; i < 6; i++) {
      const a = cos(0, 6.28), r = cos(5, 18);
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(Math.cos(a) * r, 0.6, Math.sin(a) * r).setCanSleep(false).setAngularDamping(0.3).setLinearDamping(0.05));
      this.world.createCollider(RAPIER.ColliderDesc.ball(0.32).setMass(0.08).setFriction(0.6).setRestitution(0.6).setCollisionGroups(((0x0010 << 16) | 0x0111) >>> 0), body);
      this.props.push({ body, kind: 'ball', r: 0.32 });
    }
    for (let i = 0; i < 8; i++) {
      const a = cos(0, 6.28), r = cos(4, 18);
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(Math.cos(a) * r, 0.4, Math.sin(a) * r).setCanSleep(false));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.25, 0.3).setMass(0.5).setFriction(0.32).setCollisionGroups(((0x0010 << 16) | 0x0111) >>> 0), body);
      this.props.push({ body, kind: 'crate', r: 0.3 });
    }
  }
  /** Rest tilt in degrees, in a fixed direction. Eases on its own. */
  setRest(deg) { this.rest = deg; }
  get restTiltDeg() { return this.restNow; }
  get tiltDeg() { return Math.hypot(this.tx, this.tz) / RAD; }
  setPosition(x, z) { this.walker.setTranslation({ x, y: 0.9, z }, true); this.walker.setLinvel({ x: 0, y: 0, z: 0 }, true); }
  get pos() { return this.walker.translation(); }
  snapTilt() {
    this.restNow = this.rest;
    this.tx = this.restNow * RAD * Math.cos(this.restAngle); this.tz = this.restNow * RAD * Math.sin(this.restAngle); this.vx = 0; this.vz = 0;
  }
  /** One step. wantX, wantZ: walker speed. weight 0 means nobody is on the island. */
  step(dt, { weight = 1 } = {}) {
    this.restNow += Math.sign(this.rest - this.restNow) * Math.min(Math.abs(this.rest - this.restNow), dt * 0.9);
    const restRad = this.restNow * RAD, K = tun.islandSpring, C = 1.8 * Math.sqrt(K / 2.2);
    const restX = restRad * Math.cos(this.restAngle), restZ = restRad * Math.sin(this.restAngle);
    const W = (K * tun.islandWeight * RAD) / 22 * weight;
    const p = this.walker.translation();
    this.vx += (K * restX + W * p.x + this.leanExtraX * K - K * this.tx - C * this.vx) * dt; this.tx += this.vx * dt;
    this.vz += (K * restZ + W * p.z + this.leanExtraZ * K - K * this.tz - C * this.vz) * dt; this.tz += this.vz * dt;
    const g = tun.gravity;
    this.world.gravity = { x: g * Math.sin(this.tx), y: -g * Math.cos(Math.hypot(this.tx, this.tz)), z: g * Math.sin(this.tz) };
    const v = this.walker.linvel();
    this.walker.setLinvel({ x: this.wantX + this.tx * 3, y: v.y, z: this.wantZ + this.tz * 3 }, true);
    this.world.step();
    const a = Math.hypot(this.tx, this.tz) || 1e-9, s = Math.sin(a / 2);
    this.q.x = (this.tz / a) * s; this.q.y = 0; this.q.z = (-this.tx / a) * s; this.q.w = Math.cos(a / 2);
  }
}
function yawQ(a) { return { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) }; }
