import { RAPIER, ragdollGroups, rotateVec } from './world.js';

const PARTS = [
  { name: 'torso', hh: 0.2, r: 0.22, mass: 0.45, joint: 'hips' },
  { name: 'head', hh: 0.02, r: 0.2, mass: 0.15, joint: 'head' },
  { name: 'armUL', hh: 0.1, r: 0.07, mass: 0.05, joint: 'shoulderL' },
  { name: 'armUR', hh: 0.1, r: 0.07, mass: 0.05, joint: 'shoulderR' },
  { name: 'armLL', hh: 0.1, r: 0.07, mass: 0.04, joint: 'elbowL' },
  { name: 'armLR', hh: 0.1, r: 0.07, mass: 0.04, joint: 'elbowR' },
  { name: 'legUL', hh: 0.13, r: 0.09, mass: 0.08, joint: 'hipL' },
  { name: 'legUR', hh: 0.13, r: 0.09, mass: 0.08, joint: 'hipR' },
  { name: 'legLL', hh: 0.13, r: 0.08, mass: 0.06, joint: 'kneeL' },
  { name: 'legLR', hh: 0.13, r: 0.08, mass: 0.06, joint: 'kneeR' },
];

/** Parent index for the spherical joints. Torso is the root. */
const PARENT = [null, 0, 0, 0, 2, 3, 0, 0, 6, 7];

function worldOf(body, local) {
  const t = body.translation();
  const q = body.rotation();
  const r = rotateVec({ x: q.x, y: q.y, z: q.z, w: q.w }, local);
  return { x: t.x + r.x, y: t.y + r.y, z: t.z + r.z };
}

const LOCAL = {
  hips: { x: 0, y: -0.15, z: 0 },
  head: { x: 0, y: 0.45, z: 0 },
  shoulderL: { x: -0.28, y: 0.25, z: 0 },
  shoulderR: { x: 0.28, y: 0.25, z: 0 },
  elbowL: { x: -0.28, y: 0.02, z: 0 },
  elbowR: { x: 0.28, y: 0.02, z: 0 },
  hipL: { x: -0.12, y: -0.35, z: 0 },
  hipR: { x: 0.12, y: -0.35, z: 0 },
  kneeL: { x: -0.12, y: -0.62, z: 0 },
  kneeR: { x: 0.12, y: -0.62, z: 0 },
};

/**
 * Spawn a 10-part ragdoll from the core's pose. The core should already be disabled.
 * Returns handles that must be dropped in the same breath as they are removed.
 */
export function spawnRagdoll(world, doll) {
  const vel = doll.body.linvel();
  const bodies = [];
  const joints = [];
  for (let i = 0; i < PARTS.length; i++) {
    const part = PARTS[i];
    const local = LOCAL[part.joint];
    const at = worldOf(doll.body, local);
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(at.x, Math.max(0.2, at.y), at.z)
        .setLinvel(vel.x, vel.y, vel.z)
        .setCanSleep(false)
        .setLinearDamping(0.05)
        .setAngularDamping(0.6),
    );
    world.createCollider(
      RAPIER.ColliderDesc.capsule(part.hh, part.r)
        .setMass(part.mass)
        .setFriction(0.7)
        .setRestitution(0.15)
        .setCollisionGroups(ragdollGroups()),
      body,
    );
    bodies.push(body);
    const parent = PARENT[i];
    if (parent != null) {
      const joint = world.createImpulseJoint(
        RAPIER.JointData.spherical({ x: 0, y: 0, z: 0 }, { x: 0, y: part.hh + 0.02, z: 0 }),
        bodies[parent],
        body,
        true,
      );
      joint.setContactsEnabled(false);
      joints.push(joint);
    }
  }
  const head = bodies[1];
  if (head) head.applyImpulse({ x: vel.x * 0.2, y: 1.4, z: vel.z * 0.2 + 0.4 }, true);
  return { bodies, joints, parts: PARTS };
}

/** Remove every ragdoll handle. Callers must drop their own references on the same line. */
export function removeRagdoll(world, rag) {
  if (!rag) return;
  const joints = rag.joints.splice(0);
  const bodies = rag.bodies.splice(0);
  for (const joint of joints) {
    try { world.removeImpulseJoint(joint, true); } catch { /* already gone */ }
  }
  for (const body of bodies) {
    try { world.removeRigidBody(body); } catch { /* already gone */ }
  }
}

export function ragdollNan(rag) {
  if (!rag) return false;
  for (const body of rag.bodies) {
    const t = body.translation();
    if (!Number.isFinite(t.x) || !Number.isFinite(t.y) || !Number.isFinite(t.z)) return true;
  }
  return false;
}
