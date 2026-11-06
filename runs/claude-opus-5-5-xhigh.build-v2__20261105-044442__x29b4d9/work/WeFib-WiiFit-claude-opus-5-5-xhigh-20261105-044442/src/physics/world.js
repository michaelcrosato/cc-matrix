import RAPIER from '@dimforge/rapier3d-compat';
import { FIXED_DT } from '../data/config.js';
import { tun } from '../core/tuning.js';

export { RAPIER };
export async function initPhysics() { await RAPIER.init(); }

// Collision groups: (membership << 16) | filter.
export const GROUND = 0x0001, RAGDOLL = 0x1000;
export const PROP = (i) => 0x0010 << i;
export const DOLL = (i) => 0x0100 << i;
const allProps = 0x00F0;
export const groups = {
  ground: () => (GROUND << 16) | 0xFFFF & ~0x0F00,
  ragdoll: () => (RAGDOLL << 16) | GROUND,
  prop: (i) => ((PROP(i) << 16) | DOLL(i) | PROP(i) | GROUND) >>> 0,
  doll: (i) => ((DOLL(i) << 16) | PROP(i)) >>> 0,
  anyProp: () => ((allProps << 16) | allProps | GROUND) >>> 0,
};

export function createWorld({ iterations = 8, gravity } = {}) {
  const g = gravity || { x: 0, y: -tun.gravity, z: 0 };
  const world = new RAPIER.World(g);
  world.timestep = FIXED_DT;
  world.integrationParameters.numSolverIterations = iterations;
  return world;
}

export function groundCollider(world, x = 0, y = -0.5, z = 0, hx = 80, hy = 0.5, hz = 80) {
  const c = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(0.8).setCollisionGroups(groups.ground());
  return world.createCollider(c);
}
