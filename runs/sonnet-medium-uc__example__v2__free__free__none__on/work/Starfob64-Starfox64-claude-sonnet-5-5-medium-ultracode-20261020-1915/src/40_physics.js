// ===================================================================
//  PHYSICS  -  Rapier 0.19.3 wrapper
//  * kinematic colliders for ships / bullets / pickups, fixed colliders for scenery
//  * swept ray-casts for projectiles, shape queries for nova blasts
//  * contact events for ramming / pickups, dynamic rigid bodies for debris and shed wings
// ===================================================================
const Phys = {
  world: null, eq: null, map: new Map(), debris: [], ground: null, ready: false,
  async init() { await RAPIER.init(); this.ready = true; this.reset(0); },
  reset(gravityY = 0, groundY = null) {
    if (this.world) { try { this.world.free(); } catch (e) { /* ignore */ } }
    for (const d of this.debris) if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
    this.debris.length = 0; this.map.clear();
    this.world = new RAPIER.World({ x: 0, y: gravityY, z: 0 });
    this.eq = new RAPIER.EventQueue(true);
    this.ground = null;
    if (groundY !== null) {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY - 1, 0));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(4000, 1, 4000).setCollisionGroups(ig(GRP.GROUND, GRP.DEBRIS)).setRestitution(0.35).setFriction(0.8), body);
    }
  },
  shapeDesc(s) {
    if (s.ball !== undefined) return RAPIER.ColliderDesc.ball(s.ball);
    if (s.box) return RAPIER.ColliderDesc.cuboid(s.box[0], s.box[1], s.box[2]);
    if (s.cap) return RAPIER.ColliderDesc.capsule(s.cap[0], s.cap[1]);
    return RAPIER.ColliderDesc.ball(1);
  },
  baseDesc(s, mem, filter, sensor) {
    return this.shapeDesc(s).setSensor(!!sensor).setCollisionGroups(ig(mem, filter))
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
  },
  addKin(ent, shape, mem, filter, sensor = false) {
    const p = ent.pos;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z));
    const col = this.world.createCollider(this.baseDesc(shape, mem, filter, sensor), body);
    ent.body = body; ent.collider = col; this.map.set(col.handle, ent);
  },
  addFixed(ent, shape, mem, filter, quat) {
    const p = ent.pos;
    const d = RAPIER.RigidBodyDesc.fixed().setTranslation(p.x, p.y, p.z);
    if (quat) d.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    const body = this.world.createRigidBody(d);
    const col = this.world.createCollider(this.baseDesc(shape, mem, filter, false), body);
    ent.body = body; ent.collider = col; this.map.set(col.handle, ent);
  },
  remove(ent) {
    if (!ent.body) return;
    this.map.delete(ent.collider.handle);
    try { this.world.removeRigidBody(ent.body); } catch (e) { /* ignore */ }
    ent.body = null; ent.collider = null;
  },
  move(ent) { if (ent.body) ent.body.setNextKinematicTranslation(ent.pos); },
  step(dt, onContact) {
    this.world.timestep = clamp(dt, 1 / 240, 1 / 30);
    this.world.step(this.eq);
    this.eq.drainCollisionEvents((h1, h2, started) => {
      const a = this.map.get(h1), b = this.map.get(h2);
      if (a && b) onContact(a, b, started);
    });
    // sync debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        try { this.world.removeRigidBody(d.body); } catch (e) { /* ignore */ }
        if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
        this.debris.splice(i, 1); continue;
      }
      const t = d.body.translation(), r = d.body.rotation();
      d.mesh.position.set(t.x, t.y, t.z); d.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      if (d.life < 0.6) d.mesh.scale.setScalar(Math.max(0.01, d.life / 0.6) * (d.baseScale || 1));
    }
  },
  // closest swept hit; returns {ent, t} or null
  ray(origin, dir, maxT, groups, pred) {
    const hit = this.world.castRay(new RAPIER.Ray(origin, dir), maxT, true, undefined, groups, undefined, undefined, pred);
    if (!hit) return null;
    const ent = this.map.get(hit.collider.handle);
    return ent ? { ent, t: hit.timeOfImpact } : null;
  },
  overlap(center, radius, groups, cb) {
    this.world.intersectionsWithShape(center, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Ball(radius), (c) => {
      const e = this.map.get(c.handle);
      if (e) cb(e);
      return true;
    }, undefined, groups);
  },
  // dynamic debris chunk (mesh is added to scene here)
  addDebris(mesh, pos, vel, angVel, size = 0.5, life = 3) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z)
      .setLinvel(vel.x, vel.y, vel.z).setAngvel({ x: angVel.x, y: angVel.y, z: angVel.z }).setLinearDamping(0.1).setAngularDamping(0.05));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(size, size * 0.4, size).setRestitution(0.4).setCollisionGroups(ig(GRP.DEBRIS, GRP.GROUND)), body);
    mesh.position.copy(pos);
    R.scene.add(mesh);
    this.debris.push({ body, mesh, life, baseScale: mesh.scale.x });
  },
};
