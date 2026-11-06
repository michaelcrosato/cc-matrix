import RAPIER from '@dimforge/rapier3d-compat';
export { RAPIER };
export const GROUND = 0x0001, RAGDOLL = 0x1000;
export const PROP = (l) => 0x0010 << l, DOLL = (l) => 0x0100 << l;
export const groups = (m, f) => ((m & 0xffff) << 16) | (f & 0xffff);
export const G_GROUND = groups(GROUND, 0xffff);
export const G_DOLL = (l) => groups(DOLL(l), PROP(l));
export const G_PROP = (l) => groups(PROP(l), DOLL(l) | PROP(l) | GROUND);
export const G_RAGDOLL = groups(RAGDOLL, GROUND);
let live = 0;
export const liveWorlds = () => live;
export function makeWorld({ gravity = 9.81, iterations = 8 } = {}) {
  const world = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
  world.timestep = 1 / 120;
  world.integrationParameters.numSolverIterations = iterations;
  live++;
  const free = world.free.bind(world);
  world.free = () => { live--; free(); };
  return world;
}
export function addGroundPlane(world, y = 0, half = 80, friction = .8) {
  const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, y - .5, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(half, .5, half).setFriction(friction).setCollisionGroups(G_GROUND), b);
  return b;
}
