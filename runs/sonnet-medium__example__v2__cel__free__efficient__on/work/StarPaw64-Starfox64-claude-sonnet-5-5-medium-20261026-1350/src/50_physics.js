// ---------------------------------------------------------------- Physics: Rapier 0.19.3. Kinematic colliders for gameplay entities (scene queries for hit detection),
// dynamic bodies for debris, fixed colliders for obstacles/ground.
const GRP = { PLAYER: 1, ENEMY: 2, OBST: 4, PICKUP: 8, DEBRIS: 16, GROUND: 32, WING: 64, Q: 0x8000 };
const grp = (m, f) => ((m & 0xffff) << 16) | (f & 0xffff);
const Phys = {
  world: null, byHandle: new Map(), debrisList: [], ground: null, gravScale: 1, ready: false,
  async init() { await RAPIER.init(); this.ready = true; },
  newWorld(gravY = -22, groundOn = true) {
    if (this.world) { try { this.world.free(); } catch (e) { /* ignore */ } }
    this.world = new RAPIER.World({ x: 0, y: gravY, z: 0 }); this.byHandle.clear(); this.debrisList.length = 0; this.ground = null; this.gravScale = gravY === 0 ? 0.04 : 1;
    if (groundOn) {
      const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0));
      this.ground = b; this.world.createCollider(RAPIER.ColliderDesc.cuboid(500, 1, 500).setCollisionGroups(grp(GRP.GROUND, GRP.DEBRIS | GRP.Q)).setFriction(0.8).setRestitution(0.3), b);
    }
  },
  moveGround(x, z) { if (this.ground) this.ground.setTranslation({ x, y: -1, z }, true); },
  // attach a collider to an entity; kind 'kin' (moves) or 'fixed'
  attach(ent, o) {
    const w = this.world, bd = (o.kind === 'fixed' ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.kinematicPositionBased()).setTranslation(o.pos.x, o.pos.y, o.pos.z);
    if (o.quat) bd.setRotation({ x: o.quat.x, y: o.quat.y, z: o.quat.z, w: o.quat.w });
    const body = w.createRigidBody(bd);
    const cd = o.half ? RAPIER.ColliderDesc.cuboid(o.half[0], o.half[1], o.half[2]) : RAPIER.ColliderDesc.ball(o.r);
    cd.setCollisionGroups(grp(o.group, GRP.Q)); if (o.offset) cd.setTranslation(o.offset[0], o.offset[1], o.offset[2]);
    const col = w.createCollider(cd, body); ent.body = body; ent.col = col; this.byHandle.set(col.handle, ent); return ent;
  },
  detach(ent) { if (!ent.body || !this.world) return; this.byHandle.delete(ent.col.handle); try { this.world.removeRigidBody(ent.body); } catch (e) { /* ignore */ } ent.body = null; ent.col = null; },
  sync(ent) { if (ent.body) ent.body.setNextKinematicTranslation({ x: ent.pos.x, y: ent.pos.y, z: ent.pos.z }); },
  step(dt) {
    this.world.timestep = clamp(dt, 1 / 240, 1 / 30); this.world.step();
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i]; d.life -= dt; const t = d.body.translation(), q = d.body.rotation();
      d.mesh.position.set(t.x, t.y, t.z); d.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      const k = d.life < 0.6 ? Math.max(0.01, d.life / 0.6) : 1; d.mesh.scale.setScalar(k);
      if (d.life <= 0 || t.y < -40) { R.scene.remove(d.mesh); this.world.removeRigidBody(d.body); this.debrisList.splice(i, 1); }
    }
  },
  // nearest hit along a segment. mask = GRP bits to hit. returns {ent, t, point} or null
  ray(from, to, mask) {
    const dir = to.clone().sub(from), len = dir.length(); if (len < 1e-5) return null; dir.multiplyScalar(1 / len);
    const hit = this.world.castRay(new RAPIER.Ray({ x: from.x, y: from.y, z: from.z }, { x: dir.x, y: dir.y, z: dir.z }), len, true, undefined, grp(GRP.Q, mask));
    if (!hit) return null; const t = hit.timeOfImpact ?? hit.toi;
    return { ent: this.byHandle.get(hit.collider.handle) || null, t, point: from.clone().addScaledVector(dir, t), group: hit.collider.collisionGroups() >>> 16 };
  },
  // all entities overlapping a sphere
  overlap(pos, r, mask) {
    const out = []; if (!this.world) return out;
    this.world.intersectionsWithShape({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Ball(r), (col) => { const e = this.byHandle.get(col.handle); if (e) out.push(e); return true; }, undefined, grp(GRP.Q, mask));
    return out;
  },
  debris(pos, n, color, size = 1) {
    for (let i = 0; i < n; i++) {
      const s = rr(0.25, 0.55) * Math.sqrt(size), mesh = mk(G.box(1, 1, 1), toon(color), { outline: 0.08, scale: [s * rr(0.7, 1.4), s, s * rr(0.7, 1.4)] });
      mesh.position.copy(pos); R.scene.add(mesh);
      const v = V3(rr(-1, 1), rr(0.4, 1.3), rr(-1, 1)).multiplyScalar(rr(8, 18) * Math.sqrt(size));
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setLinvel(v.x, v.y, v.z).setAngvel({ x: rr(-8, 8), y: rr(-8, 8), z: rr(-8, 8) }).setGravityScale(this.gravScale).setLinearDamping(this.gravScale < 1 ? 0.2 : 0.05));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(s * 0.5, s * 0.5, s * 0.5).setCollisionGroups(grp(GRP.DEBRIS, GRP.GROUND)).setRestitution(0.35).setFriction(0.7), body);
      this.debrisList.push({ body, mesh, life: rr(1.6, 2.8) });
    }
  },
  clearDebris() { for (const d of this.debrisList) { R.scene.remove(d.mesh); } this.debrisList.length = 0; },
};
