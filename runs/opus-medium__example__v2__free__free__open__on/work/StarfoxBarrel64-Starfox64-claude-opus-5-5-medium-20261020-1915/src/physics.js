// Rapier 0.19.3 wrapper: static world colliders, kinematic enemy sensors,
// ray-cast bullets, shape-overlap tests for the player, dynamic debris + asteroids.
import RAPIER from '@dimforge/rapier3d-compat';
import { THREE } from './gfx.js';

export const G = { STATIC: 1, ENEMY: 2, DEBRIS: 4, PLAYER: 8, ITEM: 16, FRIEND: 32, ROCK: 64, PSHOT: 128, ESHOT: 256 };
const groups = (member, filter) => ((member & 0xffff) << 16) | (filter & 0xffff);

class Physics {
  constructor() { this.R = null; this.world = null; this.owner = new Map(); this.bodies = []; }
  async init() {
    await RAPIER.init();
    this.R = RAPIER;
  }
  reset(gravityY = -30) {
    // free the previous mission's world; every body/collider removal is guarded so no wasm borrow is left dangling
    if (this.world) this.world.free();
    this.world = new this.R.World({ x: 0, y: gravityY, z: 0 });
    this.removed = new WeakSet();
    this.world.timestep = 1 / 60;
    this.owner.clear();
    this.debris = [];
    this.rocks = [];
  }
  step(dt) {
    if (!this.world) return;
    this.world.timestep = Math.min(1 / 30, Math.max(1 / 240, dt));
    this.world.step();
    // sync debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      const t = d.body.translation(), r = d.body.rotation();
      d.obj.position.set(t.x, t.y, t.z); d.obj.quaternion.set(r.x, r.y, r.z, r.w);
      if (d.life < 0.6) d.obj.scale.setScalar(Math.max(0.01, d.life / 0.6) * d.scale);
      if (d.life <= 0 || t.y < -200) {
        d.obj.parent && d.obj.parent.remove(d.obj);
        this.world.removeRigidBody(d.body);
        this.debris.splice(i, 1);
      }
    }
    for (const rk of this.rocks) {
      const t = rk.body.translation(), r = rk.body.rotation();
      rk.obj.position.set(t.x, t.y, t.z); rk.obj.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
  // ---- static colliders ----
  addStaticBox(cx, cy, cz, hx, hy, hz, owner = null, quat = null) {
    const R = this.R;
    const desc = R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz)
      .setCollisionGroups(groups(G.STATIC, 0xffff)).setRestitution(0.4).setFriction(0.8);
    if (quat) desc.setRotation(quat);
    const c = this.world.createCollider(desc);
    if (owner) this.owner.set(c.handle, owner);
    return c;
  }
  addStaticBall(cx, cy, cz, r, owner = null) {
    const c = this.world.createCollider(this.R.ColliderDesc.ball(r).setTranslation(cx, cy, cz).setCollisionGroups(groups(G.STATIC, 0xffff)));
    if (owner) this.owner.set(c.handle, owner);
    return c;
  }
  addGround(y = 0, size = 20000) {
    return this.world.createCollider(this.R.ColliderDesc.cuboid(size, 2, size).setTranslation(0, y - 2, 0)
      .setCollisionGroups(groups(G.STATIC, 0xffff)).setFriction(0.9).setRestitution(0.3));
  }
  // ---- kinematic sensors (enemies, items, friends) ----
  addSensor(owner, radius, group = G.ENEMY) {
    const R = this.R;
    const body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    const col = this.world.createCollider(R.ColliderDesc.ball(radius).setSensor(true)
      .setCollisionGroups(groups(group, G.PSHOT | G.ESHOT | G.PLAYER)), body);
    this.owner.set(col.handle, owner);
    return { body, col };
  }
  addSensorBox(owner, hx, hy, hz, group = G.ENEMY, parentBody = null, offset = null) {
    const R = this.R;
    const body = parentBody || this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    const d = R.ColliderDesc.cuboid(hx, hy, hz).setSensor(true).setCollisionGroups(groups(group, G.PSHOT | G.ESHOT | G.PLAYER));
    if (offset) d.setTranslation(offset.x, offset.y, offset.z);
    const col = this.world.createCollider(d, body);
    this.owner.set(col.handle, owner);
    return { body, col };
  }
  moveSensor(s, pos, quat) {
    s.body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
    if (quat) s.body.setNextKinematicRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
  }
  teleportSensor(s, pos) { s.body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true); }
  removeSensor(s) {
    if (!s || !this.world || this.removed.has(s.body)) return;
    this.removed.add(s.body);
    for (let i = 0; i < s.body.numColliders(); i++) this.owner.delete(s.body.collider(i).handle);
    this.world.removeRigidBody(s.body);
  }
  removeCollider(c) { if (!c || this.removed.has(c)) return; this.removed.add(c); this.owner.delete(c.handle); this.world.removeCollider(c, false); }
  // ---- queries ----
  // segment ray: returns {owner, point, t, normal} for first hit
  raySegment(from, to, member = G.PSHOT, filter = G.STATIC | G.ENEMY | G.ROCK | G.FRIEND, exclude = null) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-5) return null;
    const ray = new this.R.Ray({ x: from.x, y: from.y, z: from.z }, { x: dx / len, y: dy / len, z: dz / len });
    const hit = this.world.castRay(ray, len, true, undefined, groups(member, filter), undefined, undefined,
      exclude ? (c) => this.owner.get(c.handle) !== exclude : undefined);
    if (!hit) return null;
    const toi = hit.timeOfImpact ?? hit.toi;
    return {
      owner: this.owner.get(hit.collider.handle) || null, collider: hit.collider, t: toi,
      point: new THREE.Vector3(from.x + dx / len * toi, from.y + dy / len * toi, from.z + dz / len * toi),
    };
  }
  overlapBall(pos, r, member, filter, cb) {
    const shape = new this.R.Ball(r);
    const found = [];
    this.world.intersectionsWithShape({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: 0, z: 0, w: 1 }, shape,
      (c) => { found.push([this.owner.get(c.handle) || null, c]); return true; }, undefined, groups(member, filter));
    // callbacks run after the query so they may safely remove bodies
    for (const [o, c] of found) cb(o, c);
  }
  overlapBox(pos, quat, hx, hy, hz, member, filter, cb) {
    const shape = new this.R.Cuboid(hx, hy, hz);
    const found = [];
    this.world.intersectionsWithShape({ x: pos.x, y: pos.y, z: pos.z }, { x: quat.x, y: quat.y, z: quat.z, w: quat.w }, shape,
      (c) => { found.push([this.owner.get(c.handle) || null, c]); return true; }, undefined, groups(member, filter));
    for (const [o, c] of found) cb(o, c);
  }
  // ---- dynamic debris ----
  spawnDebris(obj, pos, vel, scene, { life = 4, size = 0.6, spin = 8 } = {}) {
    const R = this.R;
    const body = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z)
      .setLinvel(vel.x, vel.y, vel.z).setAngvel({ x: (Math.random() - 0.5) * spin, y: (Math.random() - 0.5) * spin, z: (Math.random() - 0.5) * spin })
      .setLinearDamping(0.15).setCcdEnabled(true));
    this.world.createCollider(R.ColliderDesc.cuboid(size, size, size).setRestitution(0.45).setFriction(0.7).setDensity(2)
      .setCollisionGroups(groups(G.DEBRIS, G.STATIC | G.ROCK)), body);
    obj.position.copy(pos);
    scene.add(obj);
    this.debris.push({ body, obj, life: life * (0.7 + Math.random() * 0.6), scale: obj.scale.x });
    if (this.debris.length > 260) { const d = this.debris.shift(); d.obj.parent && d.obj.parent.remove(d.obj); this.world.removeRigidBody(d.body); }
  }
  // ---- asteroids (dynamic, zero-g) ----
  addRock(obj, pos, radius, owner) {
    const R = this.R;
    const body = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z)
      .setLinvel((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4)
      .setAngvel({ x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 }).setLinearDamping(0.05).setAngularDamping(0.02));
    const col = this.world.createCollider(R.ColliderDesc.ball(radius * 0.92).setRestitution(0.8).setDensity(1.5)
      .setCollisionGroups(groups(G.ROCK, 0xffff)), body);
    this.owner.set(col.handle, owner);
    const rk = { body, col, obj, owner };
    this.rocks.push(rk);
    return rk;
  }
  removeRock(rk) {
    if (this.removed.has(rk.body)) return;
    this.removed.add(rk.body);
    const i = this.rocks.indexOf(rk); if (i >= 0) this.rocks.splice(i, 1);
    this.owner.delete(rk.col.handle);
    this.world.removeRigidBody(rk.body);
  }
  impulse(body, v) { body.applyImpulse({ x: v.x, y: v.y, z: v.z }, true); }
}

export const physics = new Physics();
