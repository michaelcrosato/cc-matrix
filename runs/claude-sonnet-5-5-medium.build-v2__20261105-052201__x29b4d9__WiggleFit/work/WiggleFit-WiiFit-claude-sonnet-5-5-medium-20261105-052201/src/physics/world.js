import RAPIER from '@dimforge/rapier3d-compat';
export { RAPIER };
let inited = false;
export async function initRapier() { if (!inited) { const w = console.warn; console.warn = () => {}; try { await RAPIER.init(); } finally { console.warn = w; } inited = true; } }
export const GROUND = 0x0001;
export const propBits = (lane) => 0x0010 << lane;
export const dollBits = (lane) => 0x0100 << lane;
export const RAG = 0x1000;
export const dollGroups = (lane) => ((dollBits(lane)) << 16) | propBits(lane);
export const propGroups = (lane) => ((propBits(lane)) << 16) | (GROUND | propBits(lane) | dollBits(lane));
export const groundGroups = () => (GROUND << 16) | (0xffff);
export const ragGroups = () => (RAG << 16) | GROUND;
export class PhysWorld {
  constructor(gravity = 9.81) {
    this.world = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
    this.world.timestep = 1 / 120;
    this.world.integrationParameters.numSolverIterations = 8;
    this.bodies = new Set();
    this.time = 0;
  }
  body(desc) { const b = this.world.createRigidBody(desc); this.bodies.add(b); return b; }
  removeBody(b) { if (!b || !this.bodies.has(b)) return; this.bodies.delete(b); this.world.removeRigidBody(b); }
  ground(hx, hy, hz, x = 0, y = -hy, z = 0) {
    const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.9).setCollisionGroups(groundGroups()), b);
    return b;
  }
  step() { this.world.step(); this.time += 1 / 120; }
  count() { return this.world.bodies.len(); }
  free() { try { this.world.free(); } catch (e) { /* already freed */ } this.bodies.clear(); }
}
