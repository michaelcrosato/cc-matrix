// Rapier 0.19.3 wrapper: static scenery, sensor hitboxes for actors, dynamic debris / toppling towers / asteroids.
import RAPIER from '@dimforge/rapier3d-compat';

export const G = { STATIC: 1, ACTOR: 2, DEBRIS: 4, HAZARD: 8, QUERY: 16 };
// rapier interaction groups: (membership << 16) | filter
const groups = (member, filter) => ((member & 0xffff) << 16) | (filter & 0xffff);

let ready = null;
export function initPhysics() {
  if (!ready) ready = RAPIER.init();
  return ready;
}

export class Physics {
  constructor(gravity = -30) {
    this.world = new RAPIER.World({ x: 0, y: gravity, z: 0 });
    this.data = new Map();   // collider handle -> user data
    this.bodies = [];        // dynamic bodies synced to meshes
    this.ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
    this.idRot = { x: 0, y: 0, z: 0, w: 1 };
  }
  free() { this.world.free(); this.data.clear(); this.bodies.length = 0; }
  setGravity(y) { this.world.gravity = { x: 0, y, z: 0 }; }

  addStaticBox(pos, half, rotY = 0, data = { kind: 'static' }) {
    const q = quatY(rotY);
    const d = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(pos.x, pos.y, pos.z).setRotation(q)
      .setCollisionGroups(groups(G.STATIC, G.DEBRIS | G.HAZARD | G.QUERY));
    const c = this.world.createCollider(d);
    this.data.set(c.handle, data); return c;
  }
  addStaticBall(pos, r, data = { kind: 'static' }) {
    const d = RAPIER.ColliderDesc.ball(r).setTranslation(pos.x, pos.y, pos.z).setCollisionGroups(groups(G.STATIC, G.DEBRIS | G.HAZARD | G.QUERY));
    const c = this.world.createCollider(d); this.data.set(c.handle, data); return c;
  }
  addGround(y = 0) {
    const d = RAPIER.ColliderDesc.cuboid(4000, 1, 200000).setTranslation(0, y - 1, 0).setFriction(0.8).setCollisionGroups(groups(G.STATIC, G.DEBRIS | G.HAZARD | G.QUERY));
    const c = this.world.createCollider(d); this.data.set(c.handle, { kind: 'ground' }); return c;
  }
  // sensor hitbox for an actor (enemy, boss part, wingmate). Moved manually each frame.
  addActor(r, data) {
    const d = RAPIER.ColliderDesc.ball(r).setSensor(true).setCollisionGroups(groups(G.ACTOR, G.QUERY));
    const c = this.world.createCollider(d); this.data.set(c.handle, data); return c;
  }
  remove(c) {
    if (!c) return;
    this.data.delete(c.handle);
    try { this.world.removeCollider(c, true); } catch (e) { /* already removed */ }
  }
  // dynamic body linked to an Object3D (debris, toppled pillar, asteroid)
  addDynamic(obj, shape, opts = {}) {
    const p = obj.position, q = obj.quaternion;
    const bd = RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setLinearDamping(opts.linDamp ?? 0.05).setAngularDamping(opts.angDamp ?? 0.2);
    if (opts.ccd) bd.setCcdEnabled(true);
    const body = this.world.createRigidBody(bd);
    let cd;
    if (shape.type === 'box') cd = RAPIER.ColliderDesc.cuboid(shape.x, shape.y, shape.z).setTranslation(shape.ox || 0, shape.oy || 0, shape.oz || 0);
    else cd = RAPIER.ColliderDesc.ball(shape.r);
    cd.setDensity(opts.density ?? 1).setRestitution(opts.restitution ?? 0.3).setFriction(0.7);
    const member = opts.hazard ? G.HAZARD : G.DEBRIS;
    cd.setCollisionGroups(groups(member, G.STATIC | G.HAZARD | G.QUERY | (opts.hazard ? G.DEBRIS : 0)));
    const col = this.world.createCollider(cd, body);
    if (opts.data) this.data.set(col.handle, opts.data);
    if (opts.vel) body.setLinvel(opts.vel, true);
    if (opts.ang) body.setAngvel(opts.ang, true);
    const rec = { body, col, obj, life: opts.life ?? Infinity, onExpire: opts.onExpire };
    this.bodies.push(rec);
    return rec;
  }
  removeDynamic(rec) {
    const i = this.bodies.indexOf(rec); if (i >= 0) this.bodies.splice(i, 1);
    this.data.delete(rec.col.handle);
    try { this.world.removeRigidBody(rec.body); } catch (e) { /* ignore */ }
  }
  step(dt) {
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const r = this.bodies[i];
      const t = r.body.translation(), q = r.body.rotation();
      r.obj.position.set(t.x, t.y, t.z); r.obj.quaternion.set(q.x, q.y, q.z, q.w);
      r.life -= dt;
      if (r.life <= 0) { this.removeDynamic(r); if (r.onExpire) r.onExpire(r); }
    }
  }
  // Raycast along a segment against actors + static scenery + hazards. Returns {data, toi, collider} or null.
  raySegment(from, dir, len, mask = G.ACTOR | G.STATIC | G.HAZARD, exclude) {
    this.ray.origin = { x: from.x, y: from.y, z: from.z };
    this.ray.dir = { x: dir.x, y: dir.y, z: dir.z };
    const hit = this.world.castRay(this.ray, len, true, undefined, groups(G.QUERY, mask), undefined, undefined,
      exclude ? (c) => { const d = this.data.get(c.handle); return !d || !exclude(d); } : undefined);
    if (!hit) return null;
    return { data: this.data.get(hit.collider.handle), toi: hit.timeOfImpact, collider: hit.collider };
  }
  // all colliders overlapping a sphere
  overlapSphere(pos, r, mask, cb) {
    const shape = new RAPIER.Ball(r);
    this.world.intersectionsWithShape({ x: pos.x, y: pos.y, z: pos.z }, this.idRot, shape, (c) => {
      const d = this.data.get(c.handle); if (d) return cb(d, c) !== false; return true;
    }, undefined, groups(G.QUERY, mask));
  }
}

function quatY(a) { return { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) }; }
export { RAPIER };
