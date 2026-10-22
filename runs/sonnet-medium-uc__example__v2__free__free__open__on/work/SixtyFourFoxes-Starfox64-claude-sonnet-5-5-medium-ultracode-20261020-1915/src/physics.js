// Rapier 0.19.3 wrapper: collision groups, kinematic sensors-as-solids, debris dynamics.
import RAPIER from '@dimforge/rapier3d-compat';

export const G = { PLAYER: 1, PBULLET: 2, ENEMY: 4, EBULLET: 8, OBST: 16, PICKUP: 32, ALLY: 64, DEBRIS: 128, GROUND: 256 };
const grp = (m, f) => ((m & 0xffff) << 16) | (f & 0xffff);
export const FILTER = {
  player: grp(G.PLAYER, G.ENEMY | G.EBULLET | G.OBST | G.PICKUP),
  pbullet: grp(G.PBULLET, G.ENEMY | G.OBST),
  enemy: grp(G.ENEMY, G.PLAYER | G.PBULLET),
  ebullet: grp(G.EBULLET, G.PLAYER | G.ALLY | G.OBST),
  obst: grp(G.OBST, G.PLAYER | G.PBULLET | G.EBULLET),
  pickup: grp(G.PICKUP, G.PLAYER),
  ally: grp(G.ALLY, G.EBULLET),
  debris: grp(G.DEBRIS, G.GROUND | G.DEBRIS),
  ground: grp(G.GROUND, G.DEBRIS),
};

export class Physics {
  static async create() { await RAPIER.init(); return new Physics(); }
  constructor() {
    this.R = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -26, z: 0 });
    this.events = new RAPIER.EventQueue(true);
    this.byCollider = new Map();
    this.pairs = [];
  }
  reset() {
    this.world.free(); this.events.free();
    this.world = new RAPIER.World({ x: 0, y: -26, z: 0 });
    this.events = new RAPIER.EventQueue(true);
    this.byCollider.clear();
  }
  // Kinematic solid with events. shapes: [{type:'ball',r}|{type:'box',hx,hy,hz}|{type:'cyl',hh,r, ox,oy,oz}]
  kinematic(pos, shapes, filter, owner) {
    const R = RAPIER;
    const body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z));
    const cols = [];
    for (const sh of shapes) {
      let d;
      if (sh.type === 'ball') d = R.ColliderDesc.ball(sh.r);
      else if (sh.type === 'box') d = R.ColliderDesc.cuboid(sh.hx, sh.hy, sh.hz);
      else d = R.ColliderDesc.cylinder(sh.hh, sh.r);
      d.setTranslation(sh.ox || 0, sh.oy || 0, sh.oz || 0)
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(R.ActiveCollisionTypes.ALL)
        .setCollisionGroups(filter).setSensor(false);
      const c = this.world.createCollider(d, body);
      this.byCollider.set(c.handle, owner); cols.push(c);
    }
    return { body, cols };
  }
  setFilter(cols, filter) { for (const c of cols) c.setCollisionGroups(filter); }
  move(body, p) { body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z }); }
  remove(handle) {
    if (!handle || !handle.body) return;
    for (const c of handle.cols) this.byCollider.delete(c.handle);
    if (this.world.getRigidBody(handle.body.handle)) this.world.removeRigidBody(handle.body);
  }
  debrisBody(pos, half, vel, spin, owner) {
    const R = RAPIER;
    const body = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setLinvel(vel.x, vel.y, vel.z).setAngvel(spin).setCcdEnabled(false).setLinearDamping(0.05).setAngularDamping(0.2));
    const c = this.world.createCollider(R.ColliderDesc.cuboid(half.x, half.y, half.z).setRestitution(0.25).setFriction(0.7).setDensity(1.2).setCollisionGroups(FILTER.debris), body);
    return { body, cols: [c] };
  }
  groundSlab(pos, hx, hz) {
    const R = RAPIER;
    const body = this.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y - 1, pos.z));
    const c = this.world.createCollider(R.ColliderDesc.cuboid(hx, 1, hz).setCollisionGroups(FILTER.ground), body);
    return { body, cols: [c] };
  }
  impulseRadius(center, radius, strength, bodies) {
    for (const b of bodies) {
      const t = b.translation(); const dx = t.x - center.x, dy = t.y - center.y, dz = t.z - center.z;
      const d = Math.hypot(dx, dy, dz); if (d > radius || d < 0.01) continue;
      const k = strength * (1 - d / radius) / d;
      b.applyImpulse({ x: dx * k, y: dy * k + strength * 0.2, z: dz * k }, true);
    }
  }
  step(dt) {
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step(this.events);
    this.pairs.length = 0;
    this.events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const a = this.byCollider.get(h1), b = this.byCollider.get(h2);
      if (a && b) this.pairs.push([a, b]);
    });
    return this.pairs;
  }
}
export { RAPIER };
