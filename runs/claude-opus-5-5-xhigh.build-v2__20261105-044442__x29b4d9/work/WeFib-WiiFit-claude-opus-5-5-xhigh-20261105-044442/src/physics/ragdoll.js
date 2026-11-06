import { RAPIER, groups } from './world.js';
import * as THREE from 'three/webgpu';

// One dynamic body per doll segment, built from the rig at its current world pose.
const SEG = [
  { joint: 'hips', hh: 0.2, r: 0.22, m: 0.45, off: 0.25, parent: null },
  { joint: 'head', hh: 0.02, r: 0.2, m: 0.15, off: 0.05, parent: 'hips' },
  { joint: 'shoulderL', hh: 0.1, r: 0.07, m: 0.05, off: -0.1, parent: 'hips' },
  { joint: 'elbowL', hh: 0.1, r: 0.07, m: 0.04, off: -0.1, parent: 'shoulderL' },
  { joint: 'shoulderR', hh: 0.1, r: 0.07, m: 0.05, off: -0.1, parent: 'hips' },
  { joint: 'elbowR', hh: 0.1, r: 0.07, m: 0.04, off: -0.1, parent: 'shoulderR' },
  { joint: 'hipL', hh: 0.13, r: 0.09, m: 0.08, off: -0.1, parent: 'hips' },
  { joint: 'kneeL', hh: 0.13, r: 0.08, m: 0.06, off: -0.1, parent: 'hipL' },
  { joint: 'hipR', hh: 0.13, r: 0.09, m: 0.08, off: -0.1, parent: 'hips' },
  { joint: 'kneeR', hh: 0.13, r: 0.08, m: 0.06, off: -0.1, parent: 'hipR' },
];

const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _iq = new THREE.Quaternion();

export class Ragdoll {
  /** holder: a Group whose local space matches physics space. */
  constructor(world, doll, holder, velocity = { x: 0, y: 0, z: 0 }, kick = null) {
    this.world = world; this.doll = doll; this.holder = holder;
    this.bodies = {}; this.joints = []; this.segs = [];
    holder.updateWorldMatrix(true, true);
    doll.root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert();
    const m = new THREE.Matrix4(), s = new THREE.Vector3();
    // Read poses first, then reparent: the extremities must come off before their parents move.
    const poses = {};
    for (const seg of SEG) {
      const g = doll.joints[seg.joint];
      m.multiplyMatrices(inv, g.matrixWorld);
      m.decompose(_p, _q, s);
      poses[seg.joint] = { p: _p.clone(), q: _q.clone() };
    }
    for (const seg of SEG) {
      const pose = poses[seg.joint], g = doll.joints[seg.joint];
      const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pose.p.x, pose.p.y, pose.p.z)
        .setRotation({ x: pose.q.x, y: pose.q.y, z: pose.q.z, w: pose.q.w })
        .setLinearDamping(0.05).setAngularDamping(0.6).setCcdEnabled(false)
        .setLinvel(velocity.x, velocity.y, velocity.z));
      world.createCollider(RAPIER.ColliderDesc.capsule(seg.hh, seg.r).setTranslation(0, seg.off, 0)
        .setMass(seg.m).setFriction(0.7).setRestitution(0.15).setCollisionGroups(groups.ragdoll()), b);
      this.bodies[seg.joint] = b;
      if (seg.parent) {
        const pp = poses[seg.parent];
        _iq.copy(pp.q).invert();
        _v.copy(pose.p).sub(pp.p).applyQuaternion(_iq);
        const j = world.createImpulseJoint(RAPIER.JointData.spherical({ x: _v.x, y: _v.y, z: _v.z }, { x: 0, y: 0, z: 0 }), this.bodies[seg.parent], b, true);
        j.setContactsEnabled(false);
        this.joints.push(j);
      }
      this.segs.push({ g, b, parent: g.parent });
    }
    for (const s2 of this.segs.slice().reverse()) holder.attach(s2.g);
    if (kick) this.bodies.head.applyImpulse(kick, true);
    this.sync();
  }
  sync() {
    for (const s of this.segs) {
      const t = s.b.translation(), r = s.b.rotation();
      s.g.position.set(t.x, t.y, t.z);
      s.g.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
  /** Where the body lies now, in physics space. */
  centre() { return this.bodies.hips.translation(); }
  /** Remove the bodies and give the rig back to the doll. */
  end() {
    for (const j of this.joints) this.world.removeImpulseJoint(j, true);
    this.joints = [];
    for (const s of this.segs) { this.world.removeRigidBody(s.b); s.b = null; }
    for (const s of this.segs) {
      s.parent.add(s.g);
      const rest = this.doll.rest[s.g.name];
      s.g.position.copy(rest.p); s.g.quaternion.copy(rest.q); s.g.scale.setScalar(1);
    }
    this.segs = []; this.bodies = {};
  }
}
