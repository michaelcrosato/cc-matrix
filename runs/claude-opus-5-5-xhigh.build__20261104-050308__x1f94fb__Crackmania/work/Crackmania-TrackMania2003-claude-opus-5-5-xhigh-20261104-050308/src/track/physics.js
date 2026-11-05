// CRACKMANIA track physics (PLAN §4.3): our own RAPIER.World of fixed colliders (roads, curbs, walls, the plate, props),
// used only for ray casts and shape casts. World metres, z up. Each collider maps to { blockId, surface }
export class TrackPhysics {
  constructor(RAPIER) {
    this.R = RAPIER; this.pw = new RAPIER.World({ x: 0, y: 0, z: 0 }); this.map = new Map(); this.byBlock = new Map();
    this.body = this.pw.createRigidBody(RAPIER.RigidBodyDesc.fixed()); this.dirty = true;
    this.flags = RAPIER.TriMeshFlags ? RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES : undefined;
    this._ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 });
    this.wallOnly = c => { const m = this.map.get(c.handle); return !!m && m.surface === 'wall'; };
  }
  free() { if (this.pw) { this.pw.free(); this.pw = null; } }
  _track(key, col, info) { this.map.set(col.handle, info); if (!this.byBlock.has(key)) this.byBlock.set(key, []); this.byBlock.get(key).push(col); this.dirty = true; return col; }
  /** a trimesh: positions (world metres, z up) and indices wound so (b-a)x(c-a) is the surface's up */
  trimesh(key, pos, idx, surface, blockId = key) {
    if (!idx.length) return null;
    const d = this.R.ColliderDesc.trimesh(new Float32Array(pos), new Uint32Array(idx), this.flags).setFriction(0);
    return this._track(key, this.pw.createCollider(d, this.body), { blockId, surface });
  }
  box(key, x, y, z, hx, hy, hz, yaw = 0, surface = 'wall') {
    const d = this.R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setRotation({ x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) });
    return this._track(key, this.pw.createCollider(d, this.body), { blockId: key, surface });
  }
  cylinder(key, x, y, z0, r, h, surface = 'wall') {
    const d = this.R.ColliderDesc.cylinder(h / 2, r).setTranslation(x, y, z0 + h / 2).setRotation({ x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 });
    return this._track(key, this.pw.createCollider(d, this.body), { blockId: key, surface });
  }
  /** add a block's collision geometry ({ coll: [{ pos, idx, surface }], pillars }) */
  addGeometry(key, geo, blockId = key) {
    for (const c of geo.coll) this.trimesh(key, c.pos, c.idx, c.surface, blockId);
    for (const [x, y, top, w] of geo.pillars || []) this.box(key, x, y, top / 2, w / 2, w / 2, top / 2);
  }
  remove(key) {
    const L = this.byBlock.get(key); if (!L) return;
    for (const c of L) { this.map.delete(c.handle); this.pw.removeCollider(c, false); }
    this.byBlock.delete(key); this.dirty = true;
  }
  clear() { for (const k of [...this.byBlock.keys()]) this.remove(k); }
  /** after adding or removing colliders: let the queries see them */
  commit() { if (this.dirty) { this.pw.step(); this.dirty = false; } }
  /** the first surface along a ray: { toi, normal: [x, y, z], point, surface, blockId } or null */
  ray(o, d, max, pred) {
    this.commit();
    const R = this._ray; R.origin.x = o[0]; R.origin.y = o[1]; R.origin.z = o[2]; R.dir.x = d[0]; R.dir.y = d[1]; R.dir.z = d[2];
    const h = this.pw.castRayAndGetNormal(R, max, true, undefined, undefined, undefined, undefined, pred);
    if (!h) return null;
    const m = this.map.get(h.collider.handle) || { surface: 'wall', blockId: null }, t = h.timeOfImpact;
    return { toi: t, normal: [h.normal.x, h.normal.y, h.normal.z], point: [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t], surface: m.surface, blockId: m.blockId };
  }
  /** cast a box (half extents, rotation quaternion { x, y, z, w }) along vel for up to maxToi (time units of vel): the
   *  first wall it meets { toi, normal (from the wall toward the box), witness } or null */
  castBox(pos, rot, vel, half, maxToi) {
    this.commit();
    const shape = this._box || (this._box = new this.R.Cuboid(half[0], half[1], half[2]));
    if (shape.halfExtents.x !== half[0] || shape.halfExtents.y !== half[1] || shape.halfExtents.z !== half[2]) { shape.halfExtents.x = half[0]; shape.halfExtents.y = half[1]; shape.halfExtents.z = half[2]; }
    const h = this.pw.castShape({ x: pos[0], y: pos[1], z: pos[2] }, rot, { x: vel[0], y: vel[1], z: vel[2] }, shape, .02, maxToi, false, undefined, undefined, undefined, undefined, this.wallOnly);
    if (!h) return null;
    return { toi: h.time_of_impact, normal: [h.normal1.x, h.normal1.y, h.normal1.z], witness: [h.witness1.x, h.witness1.y, h.witness1.z] };   // (normal1 and witness1: world space, from the wall toward the box; normal2 is in the box's own frame)
  }
  /** does the box overlap any wall now? */
  overlapsBox(pos, rot, half) {
    const shape = this._box2 || (this._box2 = new this.R.Cuboid(half[0], half[1], half[2])); shape.halfExtents.x = half[0]; shape.halfExtents.y = half[1]; shape.halfExtents.z = half[2];
    let hit = false; this.pw.intersectionsWithShape({ x: pos[0], y: pos[1], z: pos[2] }, rot, shape, () => { hit = true; return false; }, undefined, undefined, undefined, undefined, this.wallOnly);
    return hit;
  }
  /** the ground (any surface but walls) straight below a point: { z, normal, surface } or null */
  groundBelow(x, y, z = 400) { const h = this.ray([x, y, z], [0, 0, -1], z + 100, c => !this.wallOnly(c)); return h ? { z: h.point[2], normal: h.normal, surface: h.surface, blockId: h.blockId } : null; }
}
