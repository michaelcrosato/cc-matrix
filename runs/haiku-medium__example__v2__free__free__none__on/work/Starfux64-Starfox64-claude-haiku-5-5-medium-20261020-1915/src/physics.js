// Rapier wrapper. Gameplay objects are kinematic (we move them); the player is a sensor.
// Colliders map back to gameplay targets through their handle.
import RAPIER from '@dimforge/rapier3d-compat';

let ready = false;
export async function initPhysics() {
  if (ready) return;
  await RAPIER.init();
  ready = true;
}

export class Physics {
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.owners = new Map(); // collider handle -> gameplay target
  }

  // Kinematic body that follows setTranslation each frame.
  body(x, y, z) {
    const desc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z);
    return this.world.createRigidBody(desc);
  }

  // Attach a collider to a body. `offset` moves it inside the body's frame.
  collider(body, radius, owner, { sensor = false, offset = null } = {}) {
    let desc = RAPIER.ColliderDesc.ball(radius).setSensor(sensor);
    if (offset) desc = desc.setTranslation(offset[0], offset[1], offset[2]);
    const col = this.world.createCollider(desc, body);
    this.owners.set(col.handle, owner);
    return col;
  }

  moveBody(body, x, y, z) {
    body.setNextKinematicTranslation({ x, y, z });
  }

  removeBody(body) {
    if (!body) return;
    const cols = [];
    for (let i = 0; i < body.numColliders(); i++) cols.push(body.collider(i));
    for (const c of cols) this.owners.delete(c.handle);
    this.world.removeRigidBody(body);
  }

  step() {
    this.world.step();
  }

  // Calls f(owner) for every target whose collider overlaps `col`.
  overlapping(col, f) {
    this.world.intersectionPairsWith(col, (other) => {
      const owner = this.owners.get(other.handle);
      if (owner) f(owner);
    });
  }

  // First solid hit along a ray. Returns { owner, toi } or null. `exclude` skips one collider.
  raycast(origin, dir, maxToi, exclude = null) {
    const ray = new RAPIER.Ray(origin, dir);
    // Power-up rings never stop a laser.
    const notRing = (c) => this.owners.get(c.handle)?.kind !== 'ring';
    const hit = this.world.castRay(ray, maxToi, true, undefined, undefined, exclude, undefined, notRing);
    if (!hit) return null;
    const owner = this.owners.get(hit.collider.handle);
    if (!owner) return null;
    return { owner, toi: hit.timeOfImpact };
  }

  clear() {
    this.owners.clear();
    this.world.free();
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  }
}
