import RAPIER from '@dimforge/rapier3d-compat';

let ready = null;

export function physicsReady() {
  ready ??= RAPIER.init();
  return ready;
}

/** Flat field: screen x → world x, screen y → world −z, tissue at y = 0. */
export class FieldPhysics {
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
    this.tips = new Map();
    this.bodies = new Map();
    this.joints = new Map();
  }

  tip(id, x, y) {
    let body = this.tips.get(id);
    if (!body) {
      body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, 0.2, -y));
      this.tips.set(id, body);
    }
    body.setNextKinematicTranslation({ x, y: 0.2, z: -y });
    return body;
  }

  ensureItem(e) {
    let body = this.bodies.get(e.id);
    if (body) return body;
    body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(e.x, 0.15, -e.y).setLinearDamping(2).setAngularDamping(3),
    );
    this.world.createCollider(RAPIER.ColliderDesc.ball(0.05).setDensity(2), body);
    this.bodies.set(e.id, body);
    return body;
  }

  grip(e, tipBody) {
    if (this.joints.has(e.id)) return;
    const item = this.ensureItem(e);
    const joint = this.world.createImpulseJoint(
      RAPIER.JointData.spring(0, 60, 6, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
      tipBody,
      item,
      true,
    );
    this.joints.set(e.id, joint);
  }

  release(e) {
    const joint = this.joints.get(e.id);
    if (!joint) return;
    this.world.removeImpulseJoint(joint, true);
    this.joints.delete(e.id);
  }

  rope(a, b, len) {
    const key = `${a.id}:${b.id}`;
    if (this.joints.has(key)) return;
    const ja = this.ensureItem(a);
    const jb = this.ensureItem(b);
    const joint = this.world.createImpulseJoint(
      RAPIER.JointData.rope(len, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
      ja,
      jb,
      true,
    );
    this.joints.set(key, joint);
  }

  step() {
    this.world.step();
    for (const [id, body] of this.bodies) {
      const t = body.translation();
      const e = this.entityById?.(id);
      if (!e || e.embedded) continue;
      e.x = t.x;
      e.y = -t.z;
    }
  }

  free() {
    this.world.free();
  }
}
