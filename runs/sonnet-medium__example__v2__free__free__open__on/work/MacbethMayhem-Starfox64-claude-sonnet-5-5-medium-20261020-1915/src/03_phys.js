/* ===================== 03 PHYSICS + ENTITIES + PROJECTILES ===================== */
const GRP = { STATIC: 1, ENEMY: 2, PLAYER: 4, PICKUP: 8, DEBRIS: 16, ALLY: 32 };
const ALLMASK = 0xffff;
const IDQ = { x: 0, y: 0, z: 0, w: 1 };

const Phys = {
  world: null, colMap: new Map(), balls: new Map(), debugLines: null, debugOn: false,
  async init() { await RAPIER.init(); this.reset(); },
  reset() {
    if (this.world) { try { this.world.free(); } catch (e) { /* already freed */ } }
    this.world = new RAPIER.World({ x: 0, y: -22, z: 0 });
    this.colMap.clear();
  },
  ball(r) { r = Math.round(r * 100) / 100; let b = this.balls.get(r); if (!b) { b = new RAPIER.Ball(r); this.balls.set(r, b); } return b; },
  /** membership/filter for a collider created in the given group */
  groups(memb) { return ((memb << 16) | ALLMASK) >>> 0; },
  addGround(y) {
    const d = RAPIER.ColliderDesc.cuboid(9000, 2, 9000).setTranslation(0, y - 2, 0).setCollisionGroups(this.groups(GRP.STATIC)).setRestitution(0.35).setFriction(0.8);
    const c = this.world.createCollider(d); this.ground = c; return c;
  },
  step(dt) { this.world.timestep = clamp(dt, 1 / 240, 1 / 20); this.world.step(); },
  /** iterate colliders overlapping a sphere. cb(entity|null, collider) return false to stop.
   *  Hits are collected first: mutating the Rapier world inside the query callback would alias the borrowed wasm world. */
  overlapBall(pos, r, mask, cb) {
    const found = [];
    this.world.intersectionsWithShape(pos, IDQ, this.ball(r), (col) => { found.push(col); return true; }, undefined, ((ALLMASK << 16) | mask) >>> 0);
    for (const col of found) { const e = this.colMap.get(col.handle) || null; if (cb(e, col) === false) break; }
  },
  remove(ent) {
    if (ent.col) { this.colMap.delete(ent.col.handle); try { this.world.removeCollider(ent.col, false); } catch (e) { /* gone */ } ent.col = null; }
    if (ent.body) { try { this.world.removeRigidBody(ent.body); } catch (e) { /* gone */ } ent.body = null; }
  },
  toggleDebug(on) {
    this.debugOn = on;
    if (on && !this.debugLines) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 40000), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(4 * 40000), 4));
      this.debugLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, fog: false, depthTest: false })); this.debugLines.frustumCulled = false; this.debugLines.renderOrder = 999; Gfx.scene.add(this.debugLines);
    }
    if (this.debugLines) this.debugLines.visible = on;
  },
  updateDebug() {
    if (!this.debugOn || !this.debugLines) return;
    const b = this.world.debugRender(), g = this.debugLines.geometry;
    const n = Math.min(b.vertices.length / 3, 40000);
    g.attributes.position.array.set(b.vertices.subarray(0, n * 3)); g.attributes.color.array.set(b.colors.subarray(0, n * 4));
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.setDrawRange(0, n);
  },
};

/* ---------- shared world state for a running stage ---------- */
const W = {
  mode: 'rail', ents: [], bullets: [], pickups: [], time: 0, score: 0, hits: 0, kills: 0, shake: 0, hitstop: 0, slow: 1, timeScale: 1,
  player: null, allies: [], stage: null, root: null, boss: null, enemyKills: 0,
  reset() { this.ents = []; this.bullets = []; this.pickups = []; this.time = 0; this.score = 0; this.hits = 0; this.kills = 0; this.shake = 0; this.hitstop = 0; this.slow = 1; this.player = null; this.allies = []; this.boss = null; },
  add(e) { this.ents.push(e); return e; },
  addShake(v) { this.shake = Math.min(1.5, this.shake + v * Settings.shake); },
};

/* ---------- base entity ---------- */
class Ent {
  constructor(kind) {
    this.kind = kind; this.alive = true; this.pos = new V3(); this.quat = new QT(); this.mesh = null; this.col = null; this.body = null;
    this.hp = 1; this.maxHp = 1; this.r = 1; this.team = 'e'; this.score = 0; this.pulse = 0; this.t = 0; this.targetable = true; this.armor = 0; this.group = GRP.ENEMY; this.dying = false; this.age = 0;
  }
  attachBall(r, group = GRP.ENEMY, sensor = false) {
    this.r = r; this.group = group;
    this.body = Phys.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, this.pos.y, this.pos.z));
    const d = RAPIER.ColliderDesc.ball(r).setCollisionGroups(Phys.groups(group)).setSensor(sensor);
    this.col = Phys.world.createCollider(d, this.body); Phys.colMap.set(this.col.handle, this); return this;
  }
  attachBox(hx, hy, hz, group = GRP.ENEMY, fixed = false) {
    this.group = group;
    const q = this.quat;
    if (fixed) {
      const d = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(this.pos.x, this.pos.y, this.pos.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setCollisionGroups(Phys.groups(group));
      this.col = Phys.world.createCollider(d);
    } else {
      this.body = Phys.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, this.pos.y, this.pos.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
      this.col = Phys.world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setCollisionGroups(Phys.groups(group)), this.body);
    }
    Phys.colMap.set(this.col.handle, this); return this;
  }
  syncBody() { if (this.body) { this.body.setTranslation(this.pos, true); this.body.setRotation(this.quat, true); } }
  syncMesh() {
    if (!this.mesh) return;
    this.mesh.position.copy(this.pos); if (this.meshDy) this.mesh.position.y -= this.meshDy; this.mesh.quaternion.copy(this.quat);
    if (this.pulse > 0) { const s = 1 + this.pulse * 0.14; this.mesh.scale.setScalar((this.baseScale || 1) * s); this.pulse = Math.max(0, this.pulse - 0.1); }
  }
  /** returns true if killed */
  damage(d, src) {
    if (!this.alive || this.dying) return false;
    d = Math.max(0, d - this.armor);
    this.hp -= d; this.pulse = 1;
    FX.burst(src && src.pos ? src.pos : this.pos, 4, 14, 0.35, 0.35, 0xffffff, 0xffc040, { drag: 2 });
    Sfx.hit();
    if (src && src.team === 'p' && src.fromPlayer) { W.hudHit = 1; }
    if (this.hp <= 0) { this.die(src); return true; }
    this.onDamaged && this.onDamaged(d, src);
    return false;
  }
  die(src) {
    if (!this.alive) return; this.alive = false;
    const big = this.r > 4 ? 2.2 : this.r > 2.5 ? 1.5 : 1;
    FX.explosion(this.pos, big * (this.deathSize || 1)); Sfx.explode(big);
    W.addShake(0.15 * big);
    if (this.team === 'e' && this.countsAsKill !== false) { W.hits++; W.kills++; W.score += this.score; W.lastKillT = W.time; if (src && src.fromPlayer) W.hudKill = 1; }
    Debris.burst(this.pos, Math.min(10, 3 + Math.floor(this.r * 2)), this.debrisColor || 0x6b3aa0, Math.max(0.3, this.r * 0.25));
    this.onDeath && this.onDeath(src);
    Input.rumble(0.2, 0.5, 120);
  }
  dispose() {
    Phys.remove(this);
    if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }
}

/* ---------- debris using real dynamic rigid bodies ---------- */
const Debris = {
  list: [], geo: null,
  burst(pos, n, color, size = 0.5, vel) {
    if (this.list.length > 90) return;
    this.geo = this.geo || G.box(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const s = size * rand(0.5, 1.3);
      const body = Phys.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x + rand(-0.5, 0.5), pos.y + rand(-0.5, 0.5), pos.z + rand(-0.5, 0.5)).setLinvel(rand(-14, 14) + (vel ? vel.x : 0), rand(4, 18) + (vel ? vel.y : 0), rand(-14, 14) + (vel ? vel.z : 0)).setAngvel({ x: rand(-8, 8), y: rand(-8, 8), z: rand(-8, 8) }).setLinearDamping(0.05));
      const col = Phys.world.createCollider(RAPIER.ColliderDesc.cuboid(s / 2, s / 2, s / 2).setRestitution(0.45).setFriction(0.6).setCollisionGroups(((GRP.DEBRIS << 16) | GRP.STATIC) >>> 0), body);
      const m = new THREE.Mesh(this.geo, toon(pick([color, 0x3a3550, 0xd8b24a, color]))); m.scale.set(s, s * rand(0.5, 1), s); m.castShadow = true;
      const ol = new THREE.Mesh(this.geo, OUTLINE_MAT); ol.scale.setScalar(1.25); m.add(ol);
      Gfx.world.add(m); this.list.push({ body, col, m, t: 0, life: rand(2.2, 4) });
    }
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i]; d.t += dt;
      const p = d.body.translation(), r = d.body.rotation();
      d.m.position.set(p.x, p.y, p.z); d.m.quaternion.set(r.x, r.y, r.z, r.w);
      if (d.t > d.life * 0.7) d.m.scale.multiplyScalar(0.94);
      if (d.t > d.life || p.y < -80) { this.remove(i); }
    }
  },
  remove(i) { const d = this.list[i]; try { Phys.world.removeRigidBody(d.body); } catch (e) { /* gone */ } if (d.m.parent) d.m.parent.remove(d.m); this.list.splice(i, 1); },
  clear() { for (let i = this.list.length - 1; i >= 0; i--) { const d = this.list[i]; if (d.m.parent) d.m.parent.remove(d.m); } this.list.length = 0; },
};

/* ---------- projectiles ---------- */
const BUL = {
  geo: {}, free: {},
  mesh(kind) {
    const f = this.free[kind] = this.free[kind] || [];
    if (f.length) return f.pop();
    let m;
    if (kind === 'laser' || kind === 'laser2' || kind === 'ally') {
      this.geo.laser = this.geo.laser || G.cyl(0.13, 0.13, 3.6, 5).rotateX(Math.PI / 2);
      m = new THREE.Mesh(this.geo.laser, new THREE.MeshBasicMaterial({ color: kind === 'laser' ? 0x7dff8a : kind === 'laser2' ? 0x66e8ff : 0xffe35a }));
    } else if (kind === 'orb') {
      this.geo.orb = this.geo.orb || G.sph(0.6, 8, 6);
      m = new THREE.Mesh(this.geo.orb, new THREE.MeshBasicMaterial({ color: 0xff3a8a }));
      const core = new THREE.Mesh(this.geo.orb, new THREE.MeshBasicMaterial({ color: 0xffffff })); core.scale.setScalar(0.55); m.add(core);
      const ol = new THREE.Mesh(this.geo.orb, OUTLINE_MAT); ol.scale.setScalar(1.35); m.add(ol);
    } else if (kind === 'missile') {
      this.geo.missile = this.geo.missile || noseForward(G.cone(0.35, 1.8, 6));
      m = new THREE.Mesh(this.geo.missile, new THREE.MeshBasicMaterial({ color: 0xffa23a }));
      const ol = new THREE.Mesh(this.geo.missile, OUTLINE_MAT); ol.scale.setScalar(1.4); m.add(ol);
    } else if (kind === 'homing') {
      this.geo.homing = this.geo.homing || G.sph(0.5, 8, 6);
      m = new THREE.Mesh(this.geo.homing, new THREE.MeshBasicMaterial({ color: 0x9affff }));
      const g2 = new THREE.Mesh(this.geo.homing, new THREE.MeshBasicMaterial({ color: 0x3a8aff, transparent: true, opacity: 0.55 })); g2.scale.setScalar(1.8); m.add(g2);
    } else { // charge
      this.geo.charge = this.geo.charge || G.sph(1, 12, 9);
      m = new THREE.Mesh(this.geo.charge, new THREE.MeshBasicMaterial({ color: 0xbaffd0 }));
      const g2 = new THREE.Mesh(this.geo.charge, new THREE.MeshBasicMaterial({ color: 0x2aff8a, transparent: true, opacity: 0.45 })); g2.scale.setScalar(1.7); m.add(g2);
    }
    m.frustumCulled = false; m.userData.kind = kind; return m;
  },
  release(m) { Gfx.world.remove(m); this.free[m.userData.kind].push(m); },
};
const _bd = new V3(), _bv = new V3(), _bp = new V3();
const Bullets = {
  /** o: {team:'p'|'e', kind, pos, vel, dmg, life, r, target, turn, hp, fromPlayer, pierce} */
  spawn(o) {
    const b = Object.assign({ pos: new V3(), vel: new V3(), dmg: 1, life: 2, r: 0.5, hp: 0, turn: 0, target: null, pierce: false, t: 0, alive: true }, o);
    b.pos = o.pos.clone(); b.vel = o.vel.clone(); b.mesh = BUL.mesh(o.kind); b.mesh.position.copy(b.pos);
    if (b.kind === 'charge') b.mesh.scale.setScalar(b.r); else b.mesh.scale.setScalar(1);
    this.orient(b); b.mesh.visible = true; Gfx.world.add(b.mesh); W.bullets.push(b); return b;
  },
  orient(b) {
    if (b.kind === 'orb' || b.kind === 'charge' || b.kind === 'homing') return;
    _bd.copy(b.vel).normalize(); b.mesh.quaternion.setFromUnitVectors(new V3(0, 0, -1), _bd);
  },
  kill(b, spark) {
    if (!b.alive) return; b.alive = false; BUL.release(b.mesh);
    if (spark) FX.burst(b.pos, 3, 10, 0.3, 0.3, 0xffffff, spark, { drag: 2 });
  },
  update(dt) {
    const arr = W.bullets;
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      if (!b.alive) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
      b.t += dt; b.life -= dt;
      if (b.life <= 0) { this.kill(b); continue; }
      if (b.target && b.turn > 0) {
        if (!b.target.alive) b.target = null;
        else {
          const sp = b.vel.length(); _bd.copy(b.target.pos).sub(b.pos).normalize();
          _bv.copy(b.vel).normalize().lerp(_bd, clamp(b.turn * dt, 0, 1)).normalize().multiplyScalar(sp); b.vel.copy(_bv); this.orient(b);
        }
      }
      // two sample points per step so fast projectiles can't tunnel
      let hit = false;
      for (let k = 0; k < 2 && !hit; k++) {
        const f = (k + 1) / 2; _bp.copy(b.pos).addScaledVector(b.vel, dt * f);
        const mask = b.team === 'p' ? (GRP.ENEMY | GRP.STATIC) : (GRP.PLAYER | GRP.ALLY | GRP.STATIC);
        Phys.overlapBall(_bp, b.r, mask, (ent, col) => {
          if (ent && !ent.alive) return true;
          if (ent && ent.team === b.team) return true;
          if (ent && ent.onBullet) { if (ent.onBullet(b) === false) return true; }
          else if (ent && ent.damage) ent.damage(b.dmg, b);
          else if (ent && ent.solid) { /* static obstacle absorbs shots */ }
          if (!b.pierce || !ent || ent.group === GRP.STATIC) { hit = true; return false; }
          return true;
        });
      }
      b.pos.addScaledVector(b.vel, dt); b.mesh.position.copy(b.pos);
      if (b.kind === 'missile' && Math.random() < 0.9) FX.spawn(b.pos, _bv.set(0, 0, 0), 0.4, 0.4, 0xffe0a0, 0x604040, { drag: 1 });
      if (b.kind === 'homing') FX.spawn(b.pos, _bv.set(0, 0, 0), 0.35, 0.35, 0x9affff, 0x2a5aff, { drag: 1 });
      if (b.kind === 'charge') { b.mesh.rotation.x += dt * 5; if (Math.random() < 0.7) FX.spawn(b.pos, _bv.set(rand(-2, 2), rand(-2, 2), rand(-2, 2)), 0.8, 0.4, 0xbaffd0, 0x2aff8a, { drag: 1 }); }
      if (hit) { if (b.kind === 'charge') { FX.explosion(b.pos, 1.2, 0x2aff8a); Sfx.explode(1); W.addShake(0.12); Bullets.aoe(b.pos, 12, b.dmg * 0.6, b); } this.kill(b, b.team === 'p' ? 0x7dff8a : 0xff3a8a); }
    }
    // friendly shots can destroy shootable enemy orbs
    for (const e of arr) {
      if (!e.alive || e.team !== 'e' || !e.hp) continue;
      for (const f of arr) {
        if (!f.alive || f.team !== 'p') continue;
        if (e.pos.distanceToSquared(f.pos) < (e.r + f.r + 0.5) ** 2) {
          e.hp -= f.dmg; if (!f.pierce) this.kill(f);
          if (e.hp <= 0) { this.kill(e, 0xff3a8a); FX.burst(e.pos, 8, 12, 0.5, 0.4, 0xffffff, 0xff3a8a); W.score += 10; if (f.fromPlayer) W.hudKill = 0.4; Sfx.hit(); }
          break;
        }
      }
    }
  },
  /** area damage against enemies */
  aoe(pos, radius, dmg, src, includeBullets = true) {
    const hits = [];
    for (const e of W.ents) if (e.alive && e.team === 'e' && e.targetable !== false && e.pos.distanceTo(pos) < radius + e.r) hits.push(e);
    for (const e of hits) e.damage(dmg * (e.bombScale === undefined ? 1 : e.bombScale), src ? { pos: e.pos, team: 'p', fromPlayer: src.fromPlayer } : null);
    if (includeBullets) for (const b of W.bullets) if (b.alive && b.team === 'e' && b.pos.distanceTo(pos) < radius * 1.4) { this.kill(b, 0xffffff); }
  },
  clear() { for (const b of W.bullets) if (b.alive) { b.alive = false; BUL.release(b.mesh); } W.bullets.length = 0; },
};
