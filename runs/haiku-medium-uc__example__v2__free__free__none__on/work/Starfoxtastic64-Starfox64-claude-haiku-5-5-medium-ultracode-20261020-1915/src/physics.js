// Rapier (compat build, WASM embedded) wrapper.
// Static colliders carry a tag ('asteroid', 'wall') so ray and overlap queries map back to game objects.
// Debris is a dynamic body that tumbles and bounces, then is removed by the FX layer.
import RAPIER from '@dimforge/rapier3d-compat';

export class Physics {
  static async create() {
    await RAPIER.init();
    return new Physics();
  }

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.tags = new Map(); // collider handle -> { tag, owner }
    this.ballCache = new Map();
    this.identity = { x: 0, y: 0, z: 0, w: 1 };
  }

  // Fixed body with a single collider. Returns a handle object for later removal.
  addStatic(desc, x, y, z, tag, owner) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    const collider = this.world.createCollider(desc, body);
    this.tags.set(collider.handle, { tag, owner });
    return { body, handle: collider.handle };
  }

  addBall(radius, x, y, z, tag, owner) {
    return this.addStatic(RAPIER.ColliderDesc.ball(radius), x, y, z, tag, owner);
  }

  addBox(hx, hy, hz, x, y, z, tag, owner) {
    return this.addStatic(RAPIER.ColliderDesc.cuboid(hx, hy, hz), x, y, z, tag, owner);
  }

  removeStatic(ref) {
    if (!ref || !ref.body) return;
    this.tags.delete(ref.handle);
    this.world.removeRigidBody(ref.body);
  }

  // Ray from origin along dir (unit vector). Returns { t, tag, owner } for the first hit within maxT.
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    const ray = new RAPIER.Ray({ x: ox, y: oy, z: oz }, { x: dx, y: dy, z: dz });
    const hit = this.world.castRay(ray, maxT, true);
    if (!hit) return null;
    const info = this.tags.get(hit.collider.handle);
    if (!info) return null;
    return { t: hit.timeOfImpact, tag: info.tag, owner: info.owner };
  }

  // Every tagged collider overlapping a sphere at (x, y, z).
  overlapSphere(x, y, z, radius) {
    const key = radius.toFixed(2);
    let shape = this.ballCache.get(key);
    if (!shape) {
      shape = new RAPIER.Ball(radius);
      this.ballCache.set(key, shape);
    }
    const out = [];
    this.world.intersectionsWithShape({ x, y, z }, this.identity, shape, (collider) => {
      const info = this.tags.get(collider.handle);
      if (info) out.push(info);
      return true;
    });
    return out;
  }

  // Tumbling chunk of debris, bounced off the environment and removed by the caller.
  spawnDebris(x, y, z, vx, vy, vz, size) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setLinvel(vx, vy, vz)
        .setAngvel({ x: Math.random() * 6 - 3, y: Math.random() * 6 - 3, z: Math.random() * 6 - 3 })
        .setLinearDamping(0.35)
        .setAngularDamping(0.2),
    );
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(size, size, size).setRestitution(0.5).setDensity(1.0), body);
    return body;
  }

  removeBody(body) {
    if (body) this.world.removeRigidBody(body);
  }

  step(dt) {
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
  }
}
