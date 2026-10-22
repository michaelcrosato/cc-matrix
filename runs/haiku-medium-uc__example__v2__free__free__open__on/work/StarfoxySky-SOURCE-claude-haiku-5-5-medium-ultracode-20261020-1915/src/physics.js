// Rapier (rapier3d-compat 0.19.3) wrapper. One physics world per mission.
//   - enemies, boss parts: kinematic position-based bodies (we drive them, Rapier answers queries)
//   - rocks and debris: dynamic bodies that tumble and collide
//   - canyon pillars: static bodies
//   - player lasers: world raycasts; ship collisions: shape overlap queries

import RAPIER from '@dimforge/rapier3d-compat';

let ready = null;
export function initRapier() {
  if (!ready) ready = RAPIER.init();
  return ready;
}

const IDENTITY_ROT = { x: 0, y: 0, z: 0, w: 1 };

export class Physics {
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.world.timestep = 1 / 60;
    this.entityByCollider = new Map();
  }

  addKinematic(entity, radius) {
    const { x, y, z } = entity.pos;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z),
    );
    const col = this.world.createCollider(RAPIER.ColliderDesc.ball(radius), body);
    this.entityByCollider.set(col.handle, entity);
    return body;
  }

  addDynamic(entity, radius, density = 2) {
    const { x, y, z } = entity.pos;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setGravityScale(0)
        .setLinearDamping(0)
        .setAngularDamping(0.1),
    );
    const col = this.world.createCollider(
      RAPIER.ColliderDesc.ball(radius).setDensity(density).setRestitution(0.4).setFriction(0.2),
      body,
    );
    this.entityByCollider.set(col.handle, entity);
    return body;
  }

  addStaticCylinder(entity, radius, halfHeight, x, y, z) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    const col = this.world.createCollider(RAPIER.ColliderDesc.cylinder(halfHeight, radius), body);
    this.entityByCollider.set(col.handle, entity);
    return body;
  }

  // Syncs a kinematic body to its entity's position before the step.
  setKinematic(body, p) {
    body.setNextKinematicTranslation(p);
  }

  remove(entity) {
    if (!entity.body) return;
    for (let i = 0; i < entity.body.numColliders(); i++) {
      this.entityByCollider.delete(entity.body.collider(i).handle);
    }
    this.world.removeRigidBody(entity.body);
    entity.body = null;
  }

  step() {
    this.world.step();
  }

  // Ray cast from origin along dir (unit length) up to maxT. Returns the nearest hit entity.
  raycast(origin, dir, maxT) {
    const ray = new RAPIER.Ray(origin, dir);
    const hit = this.world.castRay(ray, maxT, true);
    if (!hit) return null;
    const entity = this.entityByCollider.get(hit.collider.handle);
    if (!entity) return null;
    return { entity, t: hit.timeOfImpact };
  }

  // All entities whose colliders overlap a ball at position p.
  overlapBall(p, radius) {
    const out = [];
    this.world.intersectionsWithShape(p, IDENTITY_ROT, new RAPIER.Ball(radius), (handle) => {
      const e = this.entityByCollider.get(handle);
      if (e) out.push(e);
      return true;
    });
    return out;
  }
}
