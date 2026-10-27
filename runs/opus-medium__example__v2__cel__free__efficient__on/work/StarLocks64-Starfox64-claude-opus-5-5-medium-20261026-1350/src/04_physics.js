// ============================================================================
// Physics — Rapier 0.19.3: static world colliders, entity sensors, ray/overlap
// queries for weapons & collisions, dynamic debris (wreckage, broken wings)
// ============================================================================
const GRP = { WORLD: 1, ENEMY: 2, PLAYER: 4, DEBRIS: 8, FRIEND: 16, PICKUP: 32 };
const groups = (member, filter) => ((member & 0xffff) << 16) | (filter & 0xffff);
const Phys = {
  world: null, owners: new Map(), debris: [], ready: false,
  async init() {
    await RAPIER.init();
    this.ready = true;
    this.reset();
  },
  reset() {
    if (this.world) { for (const d of this.debris) d.mesh.parent && d.mesh.parent.remove(d.mesh); this.world.free(); }
    this.world = new RAPIER.World({ x: 0, y: -30, z: 0 });
    this.owners.clear(); this.debris = [];
    this.groundY = null;
  },
  setGround(y) {
    this.groundY = y;
    const c = RAPIER.ColliderDesc.cuboid(20000, 2, 60000).setTranslation(0, y - 2, -20000).setRestitution(0.35).setFriction(0.8)
      .setCollisionGroups(groups(GRP.WORLD, 0xffff));
    this.world.createCollider(c);
  },
  // static obstacle (building, arch pillar, asteroid…)
  addBox(pos, half, quat = null, owner = null) {
    const d = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(pos.x, pos.y, pos.z).setCollisionGroups(groups(GRP.WORLD, 0xffff));
    if (quat) d.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    const c = this.world.createCollider(d);
    if (owner) this.owners.set(c.handle, owner);
    return c;
  },
  addBall(pos, r, owner = null, member = GRP.WORLD) {
    const d = RAPIER.ColliderDesc.ball(r).setTranslation(pos.x, pos.y, pos.z).setCollisionGroups(groups(member, 0xffff));
    if (member !== GRP.WORLD) d.setSensor(true);
    const c = this.world.createCollider(d);
    if (owner) this.owners.set(c.handle, owner);
    return c;
  },
  addSensorBox(pos, half, owner, member) {
    const d = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(pos.x, pos.y, pos.z).setCollisionGroups(groups(member, 0xffff)).setSensor(true);
    const c = this.world.createCollider(d);
    this.owners.set(c.handle, owner);
    return c;
  },
  move(c, pos, quat) {
    if (!c) return;
    c.setTranslation({ x: pos.x, y: pos.y, z: pos.z });
    if (quat) c.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
  },
  setGroup(c, member) { if (c) c.setCollisionGroups(groups(member, 0xffff)); },
  remove(c) {
    if (!c || !this.world) return;
    this.owners.delete(c.handle);
    try { this.world.removeCollider(c, false); } catch (e) { /* already removed with world reset */ }
  },
  // segment cast — returns closest hit {owner, point, normal, t}
  _ray: null,
  ray(from, dir, len, mask, exclude = null) {
    if (!this._ray) this._ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
    const r = this._ray;
    r.origin = { x: from.x, y: from.y, z: from.z }; r.dir = { x: dir.x, y: dir.y, z: dir.z };
    const pred = exclude ? (c => this.owners.get(c.handle) !== exclude) : undefined;
    const hit = this.world.castRay(r, len, true, undefined, groups(0xffff, mask), undefined, undefined, pred);
    if (!hit) return null;
    const t = hit.timeOfImpact ?? hit.toi;
    return { owner: this.owners.get(hit.collider.handle) || null, collider: hit.collider, t, point: new V3(from.x + dir.x * t, from.y + dir.y * t, from.z + dir.z * t) };
  },
  _ball: new Map(),
  overlap(pos, r, mask, cb) {
    let s = this._ball.get(r); if (!s) { s = new RAPIER.Ball(r); this._ball.set(r, s); }
    this.world.intersectionsWithShape({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: 0, z: 0, w: 1 }, s, c => { return cb(this.owners.get(c.handle) || null, c) !== false; }, undefined, groups(0xffff, mask));
  },
  // wreckage chunk with real rigid-body physics
  spawnDebris(scene, mesh, pos, vel, half = 1, life = 4, quat = null) {
    if (this.debris.length > 70) { const old = this.debris.shift(); this.world.removeRigidBody(old.body); old.mesh.parent && old.mesh.parent.remove(old.mesh); }
    const bd = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setLinvel(vel.x, vel.y, vel.z)
      .setAngvel({ x: rand(-6, 6), y: rand(-6, 6), z: rand(-6, 6) }).setLinearDamping(0.15).setAngularDamping(0.3);
    if (quat) bd.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    const body = this.world.createRigidBody(bd);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(half, half * 0.6, half).setRestitution(0.45).setFriction(0.6).setDensity(2)
      .setCollisionGroups(groups(GRP.DEBRIS, GRP.WORLD | GRP.DEBRIS)), body);
    scene.add(mesh);
    const d = { body, mesh, t: 0, life, smoke: Math.random() < 0.6 };
    this.debris.push(d);
    return d;
  },
  step(dt, scene) {
    if (!this.world) return;
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.t += dt;
      const p = d.body.translation(), q = d.body.rotation();
      d.mesh.position.set(p.x, p.y, p.z); d.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      if (d.smoke && Math.random() < dt * 14) FX.fireball(d.mesh.position, rand(0.6, 1.2), 0.7, null, 0x777788, 0x444455);
      if (d.t > d.life - 0.5) d.mesh.scale.multiplyScalar(1 - dt * 4);
      if (d.t > d.life) { this.world.removeRigidBody(d.body); d.mesh.parent && d.mesh.parent.remove(d.mesh); this.debris.splice(i, 1); }
    }
  },
};
