import RAPIER from '@dimforge/rapier3d-compat';
import { FIXED_DT } from '../data/config.js';

let initPromise = null;

export function initRapier() {
  if (!initPromise) {
    const bytes = globalThis.__LEVEL_BEST_WASM__ || null;
    initPromise = bytes ? RAPIER.init({ module_or_path: bytes }) : RAPIER.init();
  }
  return initPromise;
}

export { RAPIER, FIXED_DT };

export const GROUND = 0x0001;
export const RAGDOLL = 0x1000;

export function propBit(i) {
  return 0x0010 << i;
}

export function dollBit(i) {
  return 0x0100 << i;
}

export function group(member, filter) {
  return ((member & 0xffff) << 16) | (filter & 0xffff);
}

export function dollGroups(i) {
  return group(dollBit(i), propBit(i));
}

export function propGroups(i) {
  return group(propBit(i), dollBit(i) | propBit(i) | GROUND);
}

export function groundGroups() {
  return group(GROUND, 0x00f0 | RAGDOLL);
}

export function ragdollGroups() {
  return group(RAGDOLL, GROUND);
}

export function makeWorld(iterations = 8) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_DT;
  world.integrationParameters.numSolverIterations = iterations;
  return world;
}

export function addGround(world, half = 30, friction = 0.9) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.3, 0));
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(half, 0.3, half).setFriction(friction).setCollisionGroups(groundGroups()),
    body,
  );
  return body;
}

/** One standing doll: kinematic foot, dynamic capsule, ball joint at the sole. */
export function createDollBody(world, lane, x, z) {
  const foot = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, 0, z));
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, 0.75, z)
      .setCanSleep(false)
      .setAdditionalSolverIterations(4),
  );
  world.createCollider(
    RAPIER.ColliderDesc.capsule(0.5, 0.25).setMass(1).setFriction(0.5).setCollisionGroups(dollGroups(lane)),
    body,
  );
  const joint = world.createImpulseJoint(
    RAPIER.JointData.spherical({ x: 0, y: 0, z: 0 }, { x: 0, y: -0.75, z: 0 }),
    foot,
    body,
    true,
  );
  joint.setContactsEnabled(false);
  return { foot, body, joint, lane, homeX: x, homeZ: z };
}

export function bodyCount(world) {
  return world.bodies.len();
}

export function freeWorld(world) {
  if (world && !world.freed) {
    world.free();
    world.freed = true;
  }
}

export function quatFromYaw(yaw) {
  const h = yaw * 0.5;
  return { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) };
}

export function rotateVec(q, v) {
  const { x: qx, y: qy, z: qz, w: qw } = q;
  const { x: vx, y: vy, z: vz } = v;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return {
    x: vx + qw * tx + (qy * tz - qz * ty),
    y: vy + qw * ty + (qz * tx - qx * tz),
    z: vz + qw * tz + (qx * ty - qy * tx),
  };
}

export function bodyPoint(body, local) {
  const t = body.translation();
  const q = body.rotation();
  const r = rotateVec(q, local);
  return { x: t.x + r.x, y: t.y + r.y, z: t.z + r.z };
}

export function finiteVec(v) {
  return v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}
