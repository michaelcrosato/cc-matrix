// Ragdoll from the rig: one body per segment, built at the segment's world transform.
import * as THREE from 'three/webgpu';
import { RAPIER, G_RAGDOLL } from './world.js';
const SEG = [
  // joint, kind parent, hh, r, mass, collider offset y
  ['hips', null, .2, .22, .45, .28],
  ['head', 'hips', .02, .2, .15, .22],
  ['shoulderL', 'hips', .1, .07, .05, -.16],
  ['elbowL', 'shoulderL', .1, .07, .04, -.14],
  ['shoulderR', 'hips', .1, .07, .05, -.16],
  ['elbowR', 'shoulderR', .1, .07, .04, -.14],
  ['hipL', 'hips', .13, .09, .08, -.12],
  ['kneeL', 'hipL', .13, .08, .06, -.14],
  ['hipR', 'hips', .13, .09, .08, -.12],
  ['kneeR', 'hipR', .13, .08, .06, -.14],
];
const v = new THREE.Vector3(), q = new THREE.Quaternion(), v2 = new THREE.Vector3(), q2 = new THREE.Quaternion();
export class Ragdoll {
  constructor(world, doll, parentGroup, vel = { x: 0, y: 0, z: 0 }, kick = { x: 0, y: 0, z: 0 }) {
    this.world = world; this.doll = doll; this.parent = parentGroup; this.parts = []; this.joints = [];
    doll.group.updateWorldMatrix(true, true);
    const P = parentGroup; P.updateWorldMatrix(true, false);
    const invP = new THREE.Matrix4().copy(P.matrixWorld).invert();
    const m = new THREE.Matrix4(), s = new THREE.Vector3();
    const byName = {};
    const worlds = {};
    for (const [name] of SEG) { const j = doll.joints[name]; m.multiplyMatrices(invP, j.matrixWorld); const p = new THREE.Vector3(), r = new THREE.Quaternion(); m.decompose(p, r, s); worlds[name] = { p, r }; }
    for (const [name, par, hh, rad, mass, off] of SEG) {
      const j = doll.joints[name], w = worlds[name];
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(w.p.x, w.p.y, w.p.z).setRotation({ x: w.r.x, y: w.r.y, z: w.r.z, w: w.r.w })
        .setLinearDamping(.05).setAngularDamping(.6).setLinvel(vel.x, vel.y, vel.z));
      world.createCollider(RAPIER.ColliderDesc.capsule(hh, rad).setTranslation(0, off, 0).setMass(mass).setFriction(.7).setRestitution(.15).setCollisionGroups(G_RAGDOLL), body);
      const rec = { name, j, body, homeParent: j.parent, homePos: j.position.clone(), homeQuat: j.quaternion.clone() };
      this.parts.push(rec); byName[name] = rec;
      if (par) {
        const pw = worlds[par];
        v.copy(w.p).sub(pw.p).applyQuaternion(q.copy(pw.r).invert());
        const joint = world.createImpulseJoint(RAPIER.JointData.spherical({ x: v.x, y: v.y, z: v.z }, { x: 0, y: 0, z: 0 }), byName[par].body, body, true);
        joint.setContactsEnabled(false);
        this.joints.push(joint);
      }
    }
    byName.head.body.applyImpulse(kick, true);
    for (const r of this.parts) parentGroup.attach(r.j);
    this.head = byName.head;
    this.t = 0;
  }
  sync() {
    for (const r of this.parts) {
      const p = r.body.translation(), o = r.body.rotation();
      r.j.position.set(p.x, p.y, p.z); r.j.quaternion.set(o.x, o.y, o.z, o.w);
    }
  }
  headPos() { return this.parts[0].body.translation(); }
  remove() {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const r = this.parts[i];
      r.homeParent.add(r.j); r.j.position.copy(r.homePos); r.j.quaternion.copy(r.homeQuat);
    }
    for (const j of this.joints) this.world.removeImpulseJoint(j, true);
    for (const r of this.parts) this.world.removeRigidBody(r.body);
    this.parts = []; this.joints = [];
  }
}
