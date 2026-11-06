import * as THREE from 'three/webgpu';
import { RAPIER, ragGroups } from './world.js';
// 10 bodies from the rig's joints (PLAN section 10). Visual segments are re-parented to the scene while it runs.
const SEG = [
  // name, joint group, [halfHeight, radius, mass], collider offset (local), parent segment
  ['torso', 'hips', [0.2, 0.22, 0.45], [0, 0.25, 0], null],
  ['head', 'head', [0.02, 0.2, 0.15], [0, 0.22, 0], 'torso'],
  ['armUL', 'shoulderL', [0.1, 0.07, 0.05], [0, -0.14, 0], 'torso'], ['armLL', 'elbowL', [0.1, 0.07, 0.04], [0, -0.14, 0], 'armUL'],
  ['armUR', 'shoulderR', [0.1, 0.07, 0.05], [0, -0.14, 0], 'torso'], ['armLR', 'elbowR', [0.1, 0.07, 0.04], [0, -0.14, 0], 'armUR'],
  ['legUL', 'hipL', [0.13, 0.09, 0.08], [0, -0.14, 0], 'torso'], ['legLL', 'kneeL', [0.13, 0.08, 0.06], [0, -0.14, 0], 'legUL'],
  ['legUR', 'hipR', [0.13, 0.09, 0.08], [0, -0.14, 0], 'torso'], ['legLR', 'kneeR', [0.13, 0.08, 0.06], [0, -0.14, 0], 'legUR'],
];
const ANCH = { head: 'spine', armUL: 'spine', armUR: 'spine', legUL: 'hips', legUR: 'hips' };
export class Ragdoll {
  constructor(pw, scene, doll) { this.pw = pw; this.scene = scene; this.doll = doll; this.parts = []; this.active = false; this.t = 0; this.by = {}; }
  start(vel = { x: 0, y: 0, z: 0 }, impulse = { x: 0, y: 1, z: 0 }) {
    if (this.active) return; this.active = true; this.t = 0; const J = this.doll.J; this.doll.root.updateMatrixWorld(true);
    for (const [name, jn, [hh, r, m], off, par] of SEG) {
      const g = J[jn]; const wp = new THREE.Vector3(), wq = new THREE.Quaternion(); g.getWorldPosition(wp); g.getWorldQuaternion(wq);
      const body = this.pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation(wp.x, wp.y, wp.z).setRotation({ x: wq.x, y: wq.y, z: wq.z, w: wq.w }).setLinearDamping(0.05).setAngularDamping(0.6).setLinvel(vel.x, vel.y, vel.z).setCanSleep(false));
      this.pw.world.createCollider(RAPIER.ColliderDesc.capsule(hh, r).setTranslation(off[0], off[1], off[2]).setMass(m).setFriction(0.7).setRestitution(0.15).setCollisionGroups(ragGroups()), body);
      const part = { name, g, body, parent: g.parent, pos: g.position.clone(), quat: g.quaternion.clone(), par }; this.parts.push(part); this.by[name] = part;
    }
    for (const p of this.parts) {
      if (!p.par) continue; const pb = this.by[p.par].body; const wp = p.body.translation(); const pt = pb.translation(); const pq = pb.rotation();
      // anchor in parent's local frame
      const q = new THREE.Quaternion(pq.x, pq.y, pq.z, pq.w).invert(); const a = new THREE.Vector3(wp.x - pt.x, wp.y - pt.y, wp.z - pt.z).applyQuaternion(q);
      const j = this.pw.world.createImpulseJoint(RAPIER.JointData.spherical({ x: a.x, y: a.y, z: a.z }, { x: 0, y: 0, z: 0 }), pb, p.body, true); j.setContactsEnabled(false); p.joint = j;
    }
    for (const p of this.parts) this.scene.attach(p.g);
    const h = this.by.head.body; h.applyImpulse({ x: impulse.x * 0.05, y: impulse.y * 0.05, z: impulse.z * 0.05 }, true);
    this.by.torso.body.applyImpulse({ x: impulse.x * 0.1, y: impulse.y * 0.15, z: impulse.z * 0.1 }, true);
  }
  sync() { if (!this.active) return; for (const p of this.parts) { const t = p.body.translation(), r = p.body.rotation(); p.g.position.set(t.x, t.y, t.z); p.g.quaternion.set(r.x, r.y, r.z, r.w); } this.torsoPos(); }
  torsoPos() { const t = this.by.torso.body.translation(); return t; }
  // returns after parts snap back; remove joints/bodies in safe order
  end() {
    if (!this.active) return; this.active = false;
    for (const p of this.parts) { try { p.parent.attach(p.g); } catch (e) { /* ignore */ } p.g.position.copy(p.pos); p.g.quaternion.copy(p.quat); }
    for (const p of this.parts) { if (p.joint) { try { this.pw.world.removeImpulseJoint(p.joint, true); } catch (e) { /* ignore */ } p.joint = null; } }
    for (const p of this.parts) this.pw.removeBody(p.body);
    this.parts = []; this.by = {};
  }
  maxSpeed() { let m = 0; for (const p of this.parts) { const v = p.body.linvel(); m = Math.max(m, Math.hypot(v.x, v.y, v.z)); } return m; }
}
