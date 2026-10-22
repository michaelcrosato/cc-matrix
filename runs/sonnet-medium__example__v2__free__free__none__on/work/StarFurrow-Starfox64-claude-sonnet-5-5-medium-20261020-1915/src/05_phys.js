// ===== 05_phys: Rapier 0.19.3 — kinematic hit volumes for every actor, spatial queries for shots/pickups, dynamic debris =====
const Phys = {
  world: null, byHandle: new Map(), balls: new Map(), debris: [], q: { x: 0, y: 0, z: 0, w: 1 }, ground: null, scene: null,
  newWorld(gravityY = 0) {
    if (this.world) { try { this.world.free(); } catch (e) { /* already freed */ } }
    this.world = new RAPIER.World({ x: 0, y: gravityY, z: 0 });
    this.byHandle.clear(); this.debris.length = 0; this.ground = null;
  },
  groups(cat) { return (((cat << 16) | 0xffff) >>> 0); },
  qgroups(mask) { return (((0xffff << 16) | mask) >>> 0); },
  ball(r) {
    const k = Math.round(r * 100);
    let b = this.balls.get(k); if (!b) { b = new RAPIER.Ball(r); this.balls.set(k, b); }
    return b;
  },
  // Attach a kinematic body + collider to an entity. Shape: {r} ball or {hx,hy,hz} box.
  attach(ent, shape, cat) {
    const o = ent.anchor || ent.group; o.updateWorldMatrix(true, false);
    const p = o.getWorldPosition(new THREE.Vector3());
    const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z));
    const cd = shape.r !== undefined ? RAPIER.ColliderDesc.ball(shape.r) : RAPIER.ColliderDesc.cuboid(shape.hx, shape.hy, shape.hz);
    cd.setCollisionGroups(this.groups(cat));
    const col = this.world.createCollider(cd, rb);
    ent.body = rb; ent.col = col; ent.cat = cat;
    this.byHandle.set(col.handle, ent);
  },
  // Fixed (static) collider
  attachFixed(ent, shape, cat) {
    const o = ent.anchor || ent.group; o.updateWorldMatrix(true, false);
    const p = o.getWorldPosition(new THREE.Vector3());
    const cd = shape.r !== undefined ? RAPIER.ColliderDesc.ball(shape.r) : RAPIER.ColliderDesc.cuboid(shape.hx, shape.hy, shape.hz);
    cd.setTranslation(p.x, p.y, p.z).setCollisionGroups(this.groups(cat));
    const col = this.world.createCollider(cd);
    ent.col = col; ent.cat = cat; ent.fixed = true;
    this.byHandle.set(col.handle, ent);
  },
  // Additional static collider owned by an entity (arch lintels, pylons, ...), centre in world space.
  extraFixed(ent, c, hx, hy, hz, cat) {
    const cd = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(c.x, c.y, c.z).setCollisionGroups(this.groups(cat));
    const col = this.world.createCollider(cd);
    (ent.extras || (ent.extras = [])).push(col);
    this.byHandle.set(col.handle, ent);
    return col;
  },
  sync(ent) {
    if (!ent.body) return;
    const o = ent.anchor || ent.group;
    if (ent.anchor) o.updateWorldMatrix(true, false);
    const p = ent.anchor ? o.getWorldPosition(this._v || (this._v = new THREE.Vector3())) : o.position;
    ent.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
  },
  detach(ent) {
    if (ent.extras && this.world) { for (const c of ent.extras) { this.byHandle.delete(c.handle); try { this.world.removeCollider(c, false); } catch (e) { /* ignore */ } } ent.extras = null; }
    if (ent.col) this.byHandle.delete(ent.col.handle);
    if (ent.body && this.world) { try { this.world.removeRigidBody(ent.body); } catch (e) { /* ignore */ } }
    else if (ent.col && this.world) { try { this.world.removeCollider(ent.col, false); } catch (e) { /* ignore */ } }
    ent.body = null; ent.col = null;
  },
  // Ball overlap query. Hits are gathered first and callbacks run afterwards, so callbacks may safely
  // mutate the physics world. cb(ent) may return false to stop early.
  overlap(pos, r, mask, cb) {
    const found = [];
    this.world.intersectionsWithShape(pos, this.q, this.ball(r), (c) => {
      const e = this.byHandle.get(c.handle);
      if (e && e.alive && !found.includes(e)) found.push(e);
      return true;
    }, undefined, this.qgroups(mask));
    for (const e of found) { if (e.alive && cb(e) === false) break; }
  },
  // Highest-priority entity touching the ball: real targets > boss hulls > static obstacles.
  first(pos, r, mask) {
    let best = null, bp = 9;
    this.world.intersectionsWithShape(pos, this.q, this.ball(r), (c) => {
      const e = this.byHandle.get(c.handle);
      if (!e || !e.alive) return true;
      const pr = e.kind === 'boss' ? 1 : e.cat === CAT.OBST ? 2 : 0;
      if (pr < bp) { bp = pr; best = e; }
      return bp !== 0;
    }, undefined, this.qgroups(mask));
    return best;
  },
  setGround(y) {
    if (y === null) return;
    const cd = RAPIER.ColliderDesc.cuboid(2000, 1, 100000).setTranslation(0, y - 1, 0).setCollisionGroups((((CAT.GROUND << 16) | (CAT.DEBRIS | CAT.PLAYER)) >>> 0));
    this.ground = this.world.createCollider(cd);
  },
  // Spawn dynamic tumbling debris chunks (real rigid-body simulation).
  spawnDebris(pos, n, o = {}) {
    for (let i = 0; i < n; i++) {
      if (this.debris.length > 140) { this.killDebris(this.debris[0]); }
      const s = (o.size || 0.5) * rr(0.5, 1.3);
      const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x + rr(-1, 1) * s, pos.y + rr(-1, 1) * s, pos.z + rr(-1, 1) * s)
        .setLinvel(rr(-1, 1) * (o.speed || 14) + (o.vx || 0), rr(-0.3, 1) * (o.speed || 14) + (o.vy || 0), rr(-1, 1) * (o.speed || 14) + (o.vz || 0))
        .setAngvel({ x: rr(-8, 8), y: rr(-8, 8), z: rr(-8, 8) }).setLinearDamping(o.damp === undefined ? 0.2 : o.damp).setAngularDamping(0.1));
      const cd = RAPIER.ColliderDesc.cuboid(s, s * 0.6, s * 0.8).setRestitution(0.35).setFriction(0.6)
        .setCollisionGroups((((CAT.DEBRIS << 16) | CAT.GROUND) >>> 0));
      this.world.createCollider(cd, rb);
      const col = Array.isArray(o.colors) ? pick(o.colors) : (o.color || 0x8a7d78);
      const mesh = mk(box(1, 0.6, 0.8), toon(col, o.emissive || 0, 0.5), { outline: 0.05 });
      mesh.scale.setScalar(s * 2); mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.debris.push({ rb, mesh, base: s * 2, life: (o.life || 2.6) * rr(0.7, 1.2), trail: o.trail || 0 });
    }
  },
  killDebris(d) {
    try { this.world.removeRigidBody(d.rb); } catch (e) { /* ignore */ }
    this.scene.remove(d.mesh);
    const i = this.debris.indexOf(d); if (i >= 0) this.debris.splice(i, 1);
  },
  step(dt) {
    if (!this.world) return;
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]; d.life -= dt;
      if (d.life <= 0) { this.killDebris(d); continue; }
      const t = d.rb.translation(); const r = d.rb.rotation();
      d.mesh.position.set(t.x, t.y, t.z); d.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      const k = Math.min(1, d.life / 0.5); d.mesh.scale.setScalar(d.base * k);
      if (d.trail && Math.random() < 0.5) Fx.emit(d.mesh.position, new THREE.Vector3(), 0.3, 0.3, 0xff8030, 0, 1);
    }
  },
};
