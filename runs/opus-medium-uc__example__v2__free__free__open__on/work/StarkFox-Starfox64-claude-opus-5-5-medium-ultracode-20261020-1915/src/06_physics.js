// ===== 06_physics.js — Rapier world: static level colliders, entity sensors, ray/shape queries, debris =====
const GRP = { STATIC: 1, PLAYER: 2, ENEMY: 4, DEBRIS: 8, PICKUP: 16, ALLY: 32 };
const groups = (member, filter) => (member << 16) | filter;

const Phys = {
  world: null, owner: new Map(), debris: [], ready: false,
  async init() {
    await RAPIER.init();
    this.ready = true;
    this.reset(-22);
  },
  reset(gravityY = -22) {
    if (this.world) this.world.free();
    this.world = new RAPIER.World({ x: 0, y: gravityY, z: 0 });
    this.owner.clear();
    for (const d of this.debris) d.mesh.removeFromParent();
    this.debris.length = 0;
  },
  // ---- static level geometry ----
  addStaticBox(pos, half, quat) {
    const d = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(pos.x, pos.y, pos.z)
      .setCollisionGroups(groups(GRP.STATIC, GRP.PLAYER | GRP.DEBRIS | GRP.ENEMY));
    if (quat) d.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    return this.world.createCollider(d);
  },
  addStaticBall(pos, r) {
    const d = RAPIER.ColliderDesc.ball(r).setTranslation(pos.x, pos.y, pos.z)
      .setCollisionGroups(groups(GRP.STATIC, GRP.PLAYER | GRP.DEBRIS | GRP.ENEMY));
    return this.world.createCollider(d);
  },
  addStaticTrimesh(geometry, matrix) {
    const pos = geometry.getAttribute('position');
    const verts = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      _v1.fromBufferAttribute(pos, i);
      if (matrix) _v1.applyMatrix4(matrix);
      verts[i * 3] = _v1.x; verts[i * 3 + 1] = _v1.y; verts[i * 3 + 2] = _v1.z;
    }
    const idx = geometry.index ? new Uint32Array(geometry.index.array) : Uint32Array.from({ length: pos.count }, (_, i) => i);
    const d = RAPIER.ColliderDesc.trimesh(verts, idx).setCollisionGroups(groups(GRP.STATIC, GRP.PLAYER | GRP.DEBRIS | GRP.ENEMY));
    return this.world.createCollider(d);
  },
  // ---- entity sensors (kinematic, moved every frame) ----
  addSensor(entity, shape, group) {
    let d;
    if (shape.type === 'box') d = RAPIER.ColliderDesc.cuboid(shape.hx, shape.hy, shape.hz);
    else if (shape.type === 'capsule') d = RAPIER.ColliderDesc.capsule(shape.hh, shape.r);
    else d = RAPIER.ColliderDesc.ball(shape.r);
    d.setSensor(true).setCollisionGroups(groups(group, GRP.PLAYER | GRP.ALLY | GRP.ENEMY | GRP.STATIC))
      .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.DEFAULT | RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED | RAPIER.ActiveCollisionTypes.FIXED_FIXED);
    const c = this.world.createCollider(d);
    this.owner.set(c.handle, entity);
    return c;
  },
  removeCollider(c) {
    if (!c || !this.world) return;
    this.owner.delete(c.handle);
    try { this.world.removeCollider(c, false); } catch (e) { /* already gone after reset */ }
  },
  syncCollider(c, pos, quat) {
    c.setTranslation({ x: pos.x, y: pos.y, z: pos.z });
    if (quat) c.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
  },
  // ---- queries ----
  _ray: null,
  /** Segment cast from a to b against groups mask. Returns {collider, entity, point, toi} or null. */
  segment(a, b, mask, excludeCollider) {
    const dir = _v2.subVectors(b, a);
    const len = dir.length();
    if (len < 1e-4) return null;
    dir.multiplyScalar(1 / len);
    const ray = new RAPIER.Ray({ x: a.x, y: a.y, z: a.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRay(ray, len, true, undefined, groups(0xffff, mask), excludeCollider);
    if (!hit) return null;
    const toi = hit.timeOfImpact ?? hit.toi;
    return { collider: hit.collider, entity: this.owner.get(hit.collider.handle) || null, toi, point: V3(a.x + dir.x * toi, a.y + dir.y * toi, a.z + dir.z * toi) };
  },
  /** All colliders overlapping a sphere. Results are gathered first and handled after the query
   *  returns: mutating the world (spawning debris, removing colliders) inside a Rapier callback is not allowed. */
  overlapSphere(pos, r, mask, cb) {
    const shape = new RAPIER.Ball(r);
    const hits = [];
    this.world.intersectionsWithShape({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: 0, z: 0, w: 1 }, shape, (c) => { hits.push(c); return true; }, undefined, groups(0xffff, mask));
    for (const c of hits) cb(c, this.owner.get(c.handle) || null);
  },
  /** Ground height under xz (downward cast against static geometry). */
  groundY(x, z, from = 600) {
    const ray = new RAPIER.Ray({ x, y: from, z }, { x: 0, y: -1, z: 0 });
    const hit = this.world.castRay(ray, from + 400, true, undefined, groups(0xffff, GRP.STATIC));
    return hit ? from - (hit.timeOfImpact ?? hit.toi) : -999;
  },
  // ---- dynamic debris (real rigid bodies bouncing off the level) ----
  spawnDebris(pos, vel, color, count = 6, size = 1) {
    for (let i = 0; i < count; i++) {
      if (this.debris.length > 140) { const old = this.debris.shift(); this._killDebris(old); }
      const s = size * rand(0.5, 1.2);
      const mesh = Models.debrisChunk(color, s);
      mesh.position.copy(pos);
      R.scene.add(mesh);
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x + rand(-1, 1), pos.y + rand(-1, 1), pos.z + rand(-1, 1))
        .setLinvel(vel.x + rand(-28, 28), vel.y + rand(-10, 34), vel.z + rand(-28, 28))
        .setAngvel({ x: rand(-12, 12), y: rand(-12, 12), z: rand(-12, 12) })
        .setLinearDamping(0.15).setCcdEnabled(true));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(s * 0.5, s * 0.4, s * 0.5).setRestitution(0.45).setFriction(0.8).setDensity(2)
        .setCollisionGroups(groups(GRP.DEBRIS, GRP.STATIC)), body);
      this.debris.push({ mesh, body, life: rand(2.5, 4.5), smoke: Math.random() < 0.5 });
    }
  },
  _killDebris(d) { d.mesh.removeFromParent(); try { this.world.removeRigidBody(d.body); } catch (e) { /* reset */ } },
  step(dt) {
    if (!this.world) return;
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      const t = d.body.translation(), q = d.body.rotation();
      d.mesh.position.set(t.x, t.y, t.z);
      d.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      if (d.smoke && Math.random() < dt * 14) FX.smokePuff(d.mesh.position, 1.2, 0.6);
      if (d.life < 0.6) d.mesh.scale.setScalar(Math.max(0.01, d.life / 0.6));
      if (d.life <= 0) { this._killDebris(d); this.debris.splice(i, 1); }
    }
  },
};
