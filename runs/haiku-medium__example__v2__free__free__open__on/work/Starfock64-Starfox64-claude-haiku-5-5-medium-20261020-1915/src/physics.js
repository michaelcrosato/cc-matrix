// Rapier 3D physics for asteroids and shot-apart debris.
// Zero gravity (space). Bodies are dynamic, so they bounce off each other and tumble.
import RAPIER from '@dimforge/rapier3d-compat';

export class Physics {
  constructor() {
    this.world = null;
    this.entries = [];
  }

  static async create() {
    await RAPIER.init();
    const p = new Physics();
    p.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    return p;
  }

  // Creates a sphere-collider body and attaches the mesh so step() can sync them.
  add({ mesh, parent, radius, pos, vel = [0, 0, 0], spin = [0, 0, 0], restitution = 0.6, life = Infinity, kind = 'debris', data = null }) {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(...pos)
      .setLinearDamping(0.02)
      .setAngularDamping(0.05)
      .setLinvel(...vel)
      .setAngvel({ x: spin[0], y: spin[1], z: spin[2] });
    const body = this.world.createRigidBody(desc);
    this.world.createCollider(RAPIER.ColliderDesc.ball(radius).setRestitution(restitution).setDensity(1), body);
    const entry = { body, mesh, radius, life, kind, data, dead: false };
    this.entries.push(entry);
    mesh.position.set(...pos);
    parent.add(mesh);
    return entry;
  }

  remove(entry) {
    if (entry.dead) return;
    entry.dead = true;
    this.world.removeRigidBody(entry.body);
    entry.mesh.removeFromParent();
  }

  impulse(entry, [x, y, z]) {
    entry.body.applyImpulse({ x, y, z }, true);
  }

  step(dt) {
    if (!this.world) return;
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
    for (const e of this.entries) {
      if (e.dead) continue;
      const t = e.body.translation();
      const r = e.body.rotation();
      e.mesh.position.set(t.x, t.y, t.z);
      e.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      e.life -= dt;
    }
    // Sweep dead or expired bodies.
    this.entries = this.entries.filter((e) => {
      if (e.dead) return false;
      if (e.life <= 0 || e.mesh.position.z > 30 || e.mesh.position.z < -260) {
        this.remove(e);
        return false;
      }
      return true;
    });
  }

  clear() {
    for (const e of this.entries) this.remove(e);
    this.entries = [];
  }
}
