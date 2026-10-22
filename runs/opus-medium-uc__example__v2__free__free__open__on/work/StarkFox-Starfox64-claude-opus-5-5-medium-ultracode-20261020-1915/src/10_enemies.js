// ===== 10_enemies.js — enemy archetypes, rail flight patterns, all-range AI, bosses, pickups =====
const HIT_MAT = glow(0xffffff, 2.6);

class Entity {
  constructor(mesh, o = {}) {
    this.mesh = mesh; this.alive = true; this.hostile = o.hostile ?? true; this.lockable = o.lockable ?? true;
    this.hp = this.maxHp = o.hp ?? 1; this.hits = o.hits ?? 1; this.radius = o.radius ?? 3;
    this.pos = V3(); this.prev = V3(); this.vel = V3(); this.age = 0; this.flashT = 0;
    this.drop = o.drop || null; this.color = o.color ?? 0x8a3a2a; this.expSize = o.expSize ?? 1;
    this._parts = [];
    mesh.traverse((c) => { if (c.isMesh && c.name !== 'outline' && !c.isInstancedMesh) this._parts.push([c, c.material]); });
    if (o.collider !== false) this.collider = Phys.addSensor(this, o.shape || { type: 'ball', r: this.radius }, o.group ?? GRP.ENEMY);
    R.scene.add(mesh);
    G.ents.push(this);
  }
  worldPos() { return this.pos; }
  flash() {
    if (this.flashT <= 0) for (const [m] of this._parts) m.material = HIT_MAT;
    this.flashT = 0.07;
  }
  damage(n, src, point) {
    if (!this.alive) return false;
    this.hp -= n;
    this.flash();
    if (point) FX.sparksAt(point, 5, 0xffe0a0, 22);
    AudioSys.play('hit', { volume: 0.35, pitch: rand(0.9, 1.2) });
    if (this.hp <= 0) { this.die(src); return true; }
    return false;
  }
  die(src) {
    this.alive = false;
    FX.explode(this.pos, this.expSize, { color: this.color, vel: this.vel.clone().multiplyScalar(0.5) });
    AudioSys.play(this.expSize > 2 ? 'explosionBig' : this.expSize > 1.2 ? 'explosion' : 'explosionSmall', { pan: this.pan() });
    FX.addShake(0.35 * this.expSize, 0.15);
    if (src !== 'none') Game.addHits(this.hits, this.pos, src);
    if (this.drop) spawnPickup(this.drop, this.pos.clone());
    this.dispose();
  }
  pan() { const P = G.player; if (!P) return 0; return clamp(_v1.subVectors(this.pos, P.pos).dot(P.rightVec()) / 60, -1, 1); }
  dispose() {
    this.alive = false;
    this.mesh.removeFromParent();
    if (this.collider) Phys.removeCollider(this.collider);
    this.collider = null;
  }
  baseUpdate(dt) {
    this.age += dt;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) for (const [m, mat] of this._parts) m.material = mat; }
    this.mesh.position.copy(this.pos);
    if (this.collider) Phys.syncCollider(this.collider, this.pos);
  }
  faceVelocity(dt, rate = 10, bankK = 0.03) {
    if (this.vel.lengthSq() < 0.5) return;
    _m1.lookAt(V3(), _v1.copy(this.vel), V3(0, 1, 0));
    const want = _q1.setFromRotationMatrix(_m1);
    const side = this.lastVel ? this.lastVel.clone().cross(this.vel).y : 0;
    want.multiply(_q2.setFromAxisAngle(V3(0, 0, 1), clamp(side * bankK, -1.1, 1.1)));
    this.mesh.quaternion.slerp(want, 1 - Math.exp(-dt * rate));
    this.lastVel = this.vel.clone();
  }
  facePoint(p, dt, rate = 6) {
    _m1.lookAt(this.pos, p, V3(0, 1, 0));
    // lookAt(eye,target) builds +Z toward eye; our models face -Z, so this points them at p
    const want = _q1.setFromRotationMatrix(_m1);
    this.mesh.quaternion.slerp(want, 1 - Math.exp(-dt * rate));
  }
  /** Fire an aimed shot with target leading. */
  shoot(from, speed = 150, spread = 0, o = {}) {
    const P = G.player;
    if (!P || !P.alive || G.cinematic) return;
    const tgt = o.target || P;
    const tp = tgt.pos.clone();
    const dist = tp.distanceTo(from);
    tp.addScaledVector(tgt.vel || V3(), dist / speed * 0.9);
    const dir = tp.sub(from).normalize();
    if (spread) dir.add(V3(rand(-spread, spread), rand(-spread, spread), rand(-spread, spread))).normalize();
    const s = fireShot('eshot', 'enemy', from, dir.multiplyScalar(speed), { life: 4, color: o.color, scale: o.scale });
    s.dmgMul = o.dmgMul || 1;
    s.radius = o.radius || 0;
    if (!o.silent) AudioSys.play('enemyLaser', { volume: 0.35, pan: this.pan() });
    return s;
  }
  onPlayerTouch(P) {
    if (P.invuln > 0) return;
    P.takeHit(14, this.pos);
    FX.sparksAt(P.pos, 12);
    this.damage(6, 'player');
  }
}

// ---------------------------------------------------------------- rail-space flight patterns
// Each returns {dz, x, y} relative to the rail at time t (s); `done` when finished.
const PATTERNS = {
  swoop: (p) => (t) => {
    const k = clamp(t / p.T, 0, 1), e = smooth(k);
    return { dz: lerp(p.dz0 ?? 330, p.dz1 ?? -70, k), x: lerp(p.x0, p.x1, e) + Math.sin(k * Math.PI) * (p.arcX || 0), y: lerp(p.y0, p.y1, e) + Math.sin(k * Math.PI) * (p.arcY || 0), done: k >= 1 };
  },
  cross: (p) => (t) => {
    const k = clamp(t / p.T, 0, 1);
    return { dz: (p.dz ?? 130) + Math.sin(k * Math.PI) * 30, x: lerp(p.x0, p.x1, k), y: p.y0 + Math.sin(k * TAU) * (p.arcY ?? 8), done: k >= 1 };
  },
  chase: (p) => (t) => {
    // comes from behind the player, overtakes, harasses, leaves
    const a = 2.2, h = p.hold ?? 4;
    if (t < a) { const k = smooth(t / a); return { dz: lerp(-45, p.dz ?? 95, k), x: lerp(p.x0, p.x1, k), y: lerp(p.y0 - 6, p.y1, k) }; }
    if (t < a + h) { const u = t - a; return { dz: (p.dz ?? 95) + Math.sin(u * 1.3) * 12, x: p.x1 + Math.sin(u * 1.7 + p.ph) * 14, y: p.y1 + Math.cos(u * 1.2 + p.ph) * 6, fire: true }; }
    const u = (t - a - h) / 2;
    return { dz: (p.dz ?? 95) + u * 260, x: p.x1 + u * 30 * Math.sign(p.x1 || 1), y: p.y1 + u * 90, done: u >= 1 };
  },
  hover: (p) => (t) => {
    const a = 1.8, h = p.hold ?? 6;
    if (t < a) { const k = smooth(t / a); return { dz: lerp(340, p.dz ?? 110, k), x: p.x0, y: p.y0 }; }
    if (t < a + h) { const u = t - a; return { dz: (p.dz ?? 110) + Math.sin(u * 0.9) * 10, x: p.x0 + Math.sin(u * 1.1 + p.ph) * 18, y: p.y0 + Math.sin(u * 1.6 + p.ph) * 7, fire: true }; }
    const u = (t - a - h) / 1.6;
    return { dz: (p.dz ?? 110) - u * 40, x: p.x0 + u * 140 * (p.x0 >= 0 ? 1 : -1), y: p.y0 + u * 40, done: u >= 1 };
  },
  dive: (p) => (t) => {
    const k = clamp(t / p.T, 0, 1);
    return { dz: lerp(260, -60, k), x: lerp(p.x0, p.x1, k), y: lerp(90, p.y1 ?? -4, smooth(Math.min(1, k * 1.6))), done: k >= 1 };
  },
  corkscrew: (p) => (t) => {
    const k = clamp(t / p.T, 0, 1);
    const a = k * TAU * 1.5 + p.ph;
    return { dz: lerp(340, -60, k), x: (p.x0 || 0) + Math.cos(a) * 24, y: (p.y0 || 0) + Math.sin(a) * 14, done: k >= 1 };
  },
};

class RailFlyer extends Entity {
  constructor(kind, pattern, params, o = {}) {
    const mesh = kind === 'gunship' ? Models.gunship() : kind === 'dart' ? Models.dart() : Models.fighter();
    const base = { fighter: { hp: 2, hits: 1, radius: 3.2 }, gunship: { hp: 14, hits: 3, radius: 6.5, expSize: 2 }, dart: { hp: 1, hits: 1, radius: 2.4 } }[kind];
    super(mesh, { ...base, ...o, color: kind === 'gunship' ? 0x5a4a6a : 0xb8441e });
    this.kind = kind;
    this.path = PATTERNS[pattern]({ ph: rand(0, TAU), ...params });
    this.s0 = Rail.s; this.fireCD = rand(1.2, 2.6) / G.diffFire();
    this.canFire = o.fire ?? (kind !== 'dart');
    this.escape = false;
    this.update(0);
  }
  update(dt) {
    if (this.escape) {
      // chaser that got away after a wingman-in-trouble event
      this.pos.addScaledVector(_v1.set(0, 1, 0).add(this.vel.clone().normalize()), 220 * dt);
      this.escT = (this.escT || 0) + dt;
      this.baseUpdate(dt);
      if (this.escT > 2) this.dispose();
      return;
    }
    const t = this.age;
    const r = this.path(t);
    this.prev.copy(this.pos);
    Rail.toWorld(Rail.s + r.dz, r.x, r.y, this.pos);
    if (dt > 0) this.vel.subVectors(this.pos, this.prev).multiplyScalar(1 / dt);
    if (r.fire || this.kind === 'gunship') { const P = G.player; if (P) this.facePoint(P.pos, dt, 5); }
    else this.faceVelocity(dt, 8, 0.002);
    // fire when ahead of the player
    this.fireCD -= dt;
    if (this.canFire && this.fireCD <= 0 && r.dz > 35 && r.dz < 300) {
      this.fireCD = (this.kind === 'gunship' ? rand(1.0, 1.6) : rand(1.6, 3.2)) / G.diffFire();
      const m = this.mesh.userData.muzzles;
      const from = m && m.length ? m[0].getWorldPosition(V3()) : this.pos.clone();
      if (this.kind === 'gunship') { for (let i = 0; i < 3; i++) this.shoot(from, 140, 0.05 * i, { silent: i > 0 }); }
      else this.shoot(from, 150, 0.02);
    }
    this.baseUpdate(dt);
    if (r.done) this.dispose();
  }
}

// kamikaze needle that homes toward the player's rail-local position
class Dart extends Entity {
  constructor(x, y) {
    super(Models.dart(), { hp: 1, hits: 1, radius: 2.4, color: 0xd04020 });
    this.lx = x; this.ly = y; this.dz = 420; this.update(0);
  }
  update(dt) {
    const P = G.player;
    this.dz -= 230 * dt;
    if (P && this.dz > 40) { this.lx = damp(this.lx, P.lx, 1.2, dt); this.ly = damp(this.ly, P.ly, 1.2, dt); }
    this.prev.copy(this.pos);
    Rail.toWorld(Rail.s + this.dz, this.lx, this.ly, this.pos);
    if (dt > 0) this.vel.subVectors(this.pos, this.prev).multiplyScalar(1 / dt);
    this.faceVelocity(dt, 14);
    if (Math.random() < 0.6) FX.engineTrail(this.pos, V3(), 0xff6a2a, 0.6);
    this.baseUpdate(dt);
    if (this.dz < -50) this.dispose();
  }
}

class Turret extends Entity {
  constructor(pos, o = {}) {
    super(Models.turret(), { hp: 4, hits: 1, radius: 3.5, color: 0x5a5a62, ...o });
    this.pos.copy(pos); this.fireCD = rand(0.5, 2);
    this.baseUpdate(0);
  }
  update(dt) {
    const P = G.player;
    if (P) {
      const u = this.mesh.userData;
      const to = _v1.subVectors(P.pos, this.pos);
      u.head.rotation.y = damp(u.head.rotation.y, Math.atan2(-to.x, -to.z), 5, dt);
      u.barrel.rotation.x = damp(u.barrel.rotation.x, Math.atan2(to.y, Math.hypot(to.x, to.z)), 5, dt);
      const d = to.length();
      this.fireCD -= dt;
      const ahead = _v2.subVectors(this.pos, P.pos).dot(P.nose) > 30;
      if (this.fireCD <= 0 && d < 380 && ahead) { this.fireCD = rand(1.4, 2.4) / G.diffFire(); this.shoot(u.muzzle.getWorldPosition(V3()), 160, 0.01); }
      if (_v2.subVectors(this.pos, P.pos).dot(P.nose) < -80 && G.mode === 'rails') this.dispose();
    }
    this.baseUpdate(dt);
  }
}

class Tank extends Entity {
  constructor(pos, dir, o = {}) {
    super(Models.tank(), { hp: 6, hits: 2, radius: 4, color: 0x6a5a3a, expSize: 1.4, ...o });
    this.pos.copy(pos); this.dir = dir.clone().setY(0).normalize(); this.fireCD = rand(1, 2.5); this.walk = 0;
    this.mesh.quaternion.setFromUnitVectors(V3(0, 0, -1), this.dir);
    this.baseUpdate(0);
  }
  update(dt) {
    this.walk += dt * 6;
    this.pos.addScaledVector(this.dir, 7 * dt);
    const gy = World.heightAt(this.pos.x, this.pos.z);
    if (gy > -900) this.pos.y = gy;
    const u = this.mesh.userData;
    u.legs.forEach((l, i) => (l.rotation.x = Math.sin(this.walk + i * Math.PI * 0.5) * 0.45));
    const P = G.player;
    if (P) {
      const to = _v1.subVectors(P.pos, this.pos);
      const local = to.clone().applyQuaternion(this.mesh.quaternion.clone().invert());
      u.turret.rotation.y = damp(u.turret.rotation.y, Math.atan2(-local.x, -local.z), 4, dt);
      this.fireCD -= dt;
      const ahead = _v2.subVectors(this.pos, P.pos).dot(P.nose) > 40;
      if (this.fireCD <= 0 && to.length() < 340 && ahead) { this.fireCD = rand(1.8, 3) / G.diffFire(); this.shoot(u.muzzle.getWorldPosition(V3()), 130, 0.02, { color: 0xff8a1a }); }
      if (_v2.subVectors(this.pos, P.pos).dot(P.nose) < -80 && G.mode === 'rails') this.dispose();
    }
    this.baseUpdate(dt);
  }
}

class Mine extends Entity {
  constructor(pos, o = {}) {
    super(Models.mine(), { hp: 2, hits: 1, radius: 2.6, color: 0x444450, lockable: false, ...o });
    this.pos.copy(pos); this.spin = V3(rand(-1, 1), rand(-1, 1), rand(-1, 1));
    this.baseUpdate(0);
  }
  update(dt) {
    this.mesh.rotation.x += this.spin.x * dt; this.mesh.rotation.y += this.spin.y * dt;
    const l = this.mesh.userData.light;
    if (l) l.visible = Math.sin(this.age * 8) > 0;
    const P = G.player;
    if (P && P.alive && P.pos.distanceTo(this.pos) < 9) { P.takeHit(12, this.pos); this.die('none'); return; }
    if (P && G.mode === 'rails' && _v2.subVectors(this.pos, P.pos).dot(P.nose) < -60) { this.dispose(); return; }
    this.baseUpdate(dt);
  }
}

class Crate extends Entity {
  constructor(pos, drop, o = {}) {
    super(Models.supplyCrate(), { hp: 3, hits: 0, radius: 3, color: 0x8a8a40, lockable: true, drop, expSize: 0.8, ...o });
    this.pos.copy(pos); this.baseUpdate(0);
  }
  update(dt) {
    this.mesh.rotation.y += dt * 0.8;
    this.pos.y += Math.sin(this.age * 2) * 0.02;
    const P = G.player;
    if (P && G.mode === 'rails' && _v2.subVectors(this.pos, P.pos).dot(P.nose) < -60) { this.dispose(); return; }
    this.baseUpdate(dt);
  }
  onPlayerTouch(P) { this.damage(9, 'player'); }
}

// homing missile — shootable
class Missile extends Entity {
  constructor(pos, dir, o = {}) {
    const g = new THREE.Group();
    const body = mkMesh(new THREE.ConeGeometry(0.7, 3.2, 8), toon(0xd8d8e0), { thickness: 0.06 });
    body.rotation.x = -Math.PI / 2; g.add(body);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), glow(0xff3a2a, 4)); tip.position.z = -1.7; g.add(tip);
    super(g, { hp: 1, hits: 1, radius: 2, color: 0xd8d8e0, lockable: true, expSize: 0.7, ...o });
    this.pos.copy(pos); this.dir = dir.clone().normalize(); this.speed = o.speed ?? 95; this.life = o.life ?? 6;
    this.turn = o.turn ?? 1.6;
    this.baseUpdate(0);
    AudioSys.play('missileWarn', { volume: 0.6 });
  }
  update(dt) {
    const P = G.player;
    this.life -= dt;
    if (P && P.alive) {
      const want = _v1.subVectors(P.pos, this.pos).normalize();
      this.dir.lerp(want, 1 - Math.exp(-dt * this.turn)).normalize();
      if (P.pos.distanceTo(this.pos) < 4.5) { P.takeHit(11, this.pos); this.die('none'); return; }
    }
    this.prev.copy(this.pos);
    this.pos.addScaledVector(this.dir, this.speed * dt);
    if (G.mode === 'rails') this.pos.addScaledVector(Rail.frame(Rail.s).tan, Rail.speed * dt * 0.5);
    this.vel.subVectors(this.pos, this.prev).multiplyScalar(1 / Math.max(dt, 1e-4));
    this.mesh.quaternion.setFromUnitVectors(V3(0, 0, -1), this.dir);
    if (Math.random() < 0.7) FX.smokePuff(this.pos, 0.8, 0.6, 0xc8c8d0);
    if (this.life <= 0) { this.die('none'); return; }
    this.baseUpdate(dt);
  }
}

// ---------------------------------------------------------------- all-range AI
class Ace extends Entity {
  constructor(pos, o = {}) {
    super(o.mesh || Models.ace(o.palette), { hp: o.hp ?? 16, hits: o.hits ?? 5, radius: 3.6, color: 0x3a2a4a, expSize: 1.6, ...o });
    this.name = o.name || 'Ace'; this.pos.copy(pos); this.dir = V3(rand(-1, 1), 0, rand(-1, 1)).normalize();
    this.speed = o.speed ?? 82; this.turnRate = o.turn ?? 1.7; this.fireCD = rand(1, 2); this.jink = 0; this.jinkDir = V3();
    this.target = null; this.retarget = 0; this.skill = o.skill ?? 1;
    this.baseUpdate(0);
  }
  update(dt) {
    const P = G.player;
    this.retarget -= dt;
    if (this.retarget <= 0 || !this.target || (this.target.isWingman && !this.target.active)) {
      this.retarget = rand(5, 9);
      const opts = [P, ...G.wingmen.filter((w) => w.active)];
      this.target = Math.random() < 0.6 ? P : pick(opts);
    }
    const T = this.target || P;
    let desired = _v1.subVectors(T.pos, this.pos).addScaledVector(T.vel || V3(), 0.6).normalize();
    // evade if the player sits on our tail
    if (P && P.alive) {
      const fromP = _v2.subVectors(this.pos, P.pos);
      const d = fromP.length();
      if (d < 140 && fromP.normalize().dot(P.nose) > 0.94 && this.jink <= 0 && Math.random() < dt * 1.6 * this.skill) {
        this.jink = rand(1.0, 1.8);
        this.jinkDir.set(rand(-1, 1), rand(-0.6, 0.8), rand(-1, 1)).normalize();
        if (Math.random() < 0.3) Game.radioOnce('jackalEvade', 'jackal', 'You\'ll have to do better than that, pup!');
      }
    }
    if (this.jink > 0) { this.jink -= dt; desired = this.jinkDir; }
    // stay inside the arena and away from the ground plane
    const lim = (G.stage.arenaRadius || 1100) * 0.85;
    if (this.pos.length() > lim) desired = _v3.copy(this.pos).negate().normalize();
    this.dir.lerp(desired, 1 - Math.exp(-dt * this.turnRate)).normalize();
    this.prev.copy(this.pos);
    const boost = this.jink > 0 ? 1.35 : 1;
    this.pos.addScaledVector(this.dir, this.speed * boost * dt);
    this.vel.copy(this.dir).multiplyScalar(this.speed * boost);
    this.faceVelocity(dt, 7, 0.0009);
    this.fireCD -= dt;
    const toT = _v3.subVectors(T.pos, this.pos);
    const dist = toT.length();
    if (this.fireCD <= 0 && dist < 380 && toT.normalize().dot(this.dir) > 0.95) {
      this.fireCD = rand(0.6, 1.3) / G.diffFire();
      const m = this.mesh.userData.muzzles;
      const from = m && m.length ? m[0].getWorldPosition(V3()) : this.pos.clone();
      this.shoot(from, 190, 0.015, { target: T, color: 0xc23bff });
      if (T.isWingman && Math.random() < 0.3) T.damage(4);
    }
    for (const e of this.mesh.userData.engines || []) FX.engineTrail(e.getWorldPosition(_v2), V3(), 0xc23bff, 0.6);
    this.baseUpdate(dt);
  }
  die(src) {
    super.die(src);
    if (this.onDeath) this.onDeath();
  }
}

class Drone extends Entity {
  constructor(pos, o = {}) {
    super(Models.fighter(), { hp: 3, hits: 1, radius: 3.2, color: 0xb8441e, ...o });
    this.pos.copy(pos); this.dir = V3(rand(-1, 1), rand(-0.3, 0.3), rand(-1, 1)).normalize(); this.speed = rand(70, 85);
    this.fireCD = rand(1, 3); this.mode = 'attack'; this.modeT = rand(3, 6);
    this.baseUpdate(0);
  }
  update(dt) {
    const P = G.player;
    this.modeT -= dt;
    if (this.modeT <= 0) { this.mode = this.mode === 'attack' ? 'loop' : 'attack'; this.modeT = this.mode === 'attack' ? rand(4, 7) : rand(1.5, 2.5); this.loopDir = V3(rand(-1, 1), rand(-0.5, 1), rand(-1, 1)).normalize(); }
    let desired = this.mode === 'attack' && P ? _v1.subVectors(P.pos, this.pos).normalize() : this.loopDir || this.dir;
    if (this.pos.length() > (G.stage.arenaRadius || 1100) * 0.85) desired = _v1.copy(this.pos).negate().normalize();
    this.dir.lerp(desired, 1 - Math.exp(-dt * 1.4)).normalize();
    this.prev.copy(this.pos);
    this.pos.addScaledVector(this.dir, this.speed * dt);
    this.vel.copy(this.dir).multiplyScalar(this.speed);
    this.faceVelocity(dt, 6, 0.0008);
    this.fireCD -= dt;
    if (P && this.fireCD <= 0 && this.mode === 'attack') {
      const to = _v2.subVectors(P.pos, this.pos); const d = to.length();
      if (d < 320 && to.normalize().dot(this.dir) > 0.9) { this.fireCD = rand(1.4, 2.6) / G.diffFire(); this.shoot(this.pos.clone().addScaledVector(this.dir, 3), 160, 0.03); }
    }
    this.baseUpdate(dt);
  }
}

// ---------------------------------------------------------------- pickups & rings
class Pickup extends Entity {
  constructor(kind, pos, o = {}) {
    const isRing = kind === 'silver' || kind === 'gold' || kind === 'checkpoint';
    const mesh = isRing ? Models.ring(kind) : Models.pickup(kind);
    super(mesh, { hostile: false, lockable: false, hp: 1, radius: kind === 'checkpoint' ? 15 : isRing ? 5 : 4, group: GRP.PICKUP });
    this.kind = kind; this.isRing = isRing; this.pos.copy(pos); this.base = pos.clone(); this.magnet = o.magnet ?? !isRing;
    if (o.face) this.mesh.quaternion.setFromUnitVectors(V3(0, 0, 1), o.face);
    this.baseUpdate(0);
  }
  damage() { return false; }
  update(dt) {
    const P = G.player;
    if (!this.isRing) { this.mesh.rotation.y += dt * 2.2; this.pos.y = this.base.y + Math.sin(this.age * 3) * 0.8; }
    else this.mesh.rotation.z += dt * (this.kind === 'checkpoint' ? 0.4 : 1.5);
    if (P && P.alive && this.magnet) {
      const d = P.pos.distanceTo(this.pos);
      if (d < 28) { this.base.lerp(P.pos, 1 - Math.exp(-dt * 5)); this.pos.x = this.base.x; this.pos.z = this.base.z; }
    }
    if (P && G.mode === 'rails' && _v2.subVectors(this.pos, P.pos).dot(P.nose) < -60) { this.dispose(); return; }
    if (this.age > 40 && G.mode === 'allrange') { this.dispose(); return; }
    this.baseUpdate(dt);
  }
  onPlayerTouch(P) {
    if (!this.alive) return;
    Game.collect(this.kind, this.pos);
    FX.sparksAt(this.pos, 18, this.kind === 'gold' ? 0xffd040 : 0xdfefff, 30);
    if (this.isRing) FX.shockwave(this.pos, this.radius * 1.8, this.kind === 'gold' ? 0xffd040 : 0xcfe8ff, 0.4, V3(0, 0, 1).applyQuaternion(this.mesh.quaternion));
    this.dispose();
  }
}
function spawnPickup(kind, pos, o) { return new Pickup(kind, pos, o); }

// ---------------------------------------------------------------- boss parts
class BossPart extends Entity {
  constructor(boss, node, o) {
    super(new THREE.Group(), { hp: o.hp, hits: o.hits ?? 3, radius: o.radius, lockable: true, ...o });
    this.mesh.removeFromParent();
    this.boss = boss; this.node = node; this.isBossPart = true; this.name = o.name || 'part';
    this._parts = [];
    node.traverse((c) => { if (c.isMesh && c.name !== 'outline') this._parts.push([c, c.material]); });
    this.locked = o.locked || (() => false);
  }
  worldPos() { return this.node.getWorldPosition(this.pos); }
  armored() { return !this.locked(); }
  damage(n, src, point) {
    if (!this.alive) return false;
    if (this.locked()) { if (point) FX.sparksAt(point, 6, 0xd0e0ff); return false; }
    return super.damage(n, src, point);
  }
  die(src) {
    this.alive = false;
    const p = this.worldPos().clone();
    FX.explode(p, this.expSize || 2.2, { color: this.color });
    AudioSys.play('explosionBig');
    FX.addShake(1.5, 0.4);
    Input.rumble(0.7, 0.7, 300);
    Game.addHits(this.hits, p, src);
    if (this.collider) Phys.removeCollider(this.collider);
    this.collider = null;
    this.boss.onPartDestroyed(this);
  }
  update(dt) {
    this.age += dt;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) for (const [m, mat] of this._parts) m.material = mat; }
    if (this.collider) Phys.syncCollider(this.collider, this.worldPos());
  }
  onPlayerTouch(P) { if (P.invuln <= 0) P.takeHit(15, this.worldPos()); }
}

// ---------------------------------------------------------------- BOSS 1: Granite Strider (rails)
class StriderBoss {
  constructor() {
    this.name = 'GRANITE STRIDER'; this.alive = true; this.hostile = true; this.lockable = false; this.radius = 20;
    this.mesh = Models.strider();
    this.mesh.scale.setScalar(1.5);
    R.scene.add(this.mesh);
    this.pos = V3(); this.vel = V3(); this.gap = 135; this.lat = 0; this.walk = 0; this.t = 0; this.phase = 0; this.atkT = 3; this.age = 0;
    const u = this.mesh.userData;
    const armsGone = () => !this.parts.armL.alive && !this.parts.armR.alive;
    this.parts = {
      armL: new BossPart(this, u.armL, { hp: 34, radius: 6, name: 'L-POD', hits: 5, color: 0xa8432a }),
      armR: new BossPart(this, u.armR, { hp: 34, radius: 6, name: 'R-POD', hits: 5, color: 0xa8432a }),
    };
    u.chestPlates.forEach((pl, i) => { this.parts['plate' + i] = new BossPart(this, pl, { hp: 9, radius: 3.4, name: 'PLATE', hits: 2, locked: () => !armsGone(), color: 0x4a4f5a, expSize: 1.2 }); });
    this.parts.core = new BossPart(this, u.core, { hp: 80, radius: 4.5, name: 'CORE', hits: 20, locked: () => this.phase < 2, color: 0x48f0ff, expSize: 3 });
    this.maxHp = Object.values(this.parts).reduce((a, p) => a + p.maxHp, 0);
    // armour body: absorbs shots (sparks), counts as solid
    this.body = new Entity(new THREE.Group(), { hp: 1e9, radius: 12, lockable: false, shape: { type: 'capsule', hh: 18, r: 10 } });
    this.body.armored = () => false;
    this.body.update = () => { this.body.pos.copy(this.mesh.position).add(V3(0, 42, 0)); Phys.syncCollider(this.body.collider, this.body.pos); };
    this.body.damage = () => false;
    this.beam = null; this.stompRings = [];
    this.update(0);
  }
  worldPos() { return this.pos; }
  hpFrac() { return Object.values(this.parts).reduce((a, p) => a + Math.max(0, p.alive ? p.hp : 0), 0) / this.maxHp; }
  onPartDestroyed(part) {
    if (part.name.endsWith('POD')) {
      part.node.visible = false;
      Phys.spawnDebris(part.worldPos(), V3(0, 10, 0), 0xa8432a, 8, 2.5);
      if (!this.parts.armL.alive && !this.parts.armR.alive) { this.phase = 1; Game.radio('tobi', 'Both pods are down! Its chest armour is loosening — hit those plates!', 2); }
      else Game.radio('marlow', 'One arm down! Keep it up!', 1);
    } else if (part.name === 'PLATE') {
      part.node.visible = false;
      Phys.spawnDebris(part.worldPos(), V3(0, 8, -10), 0x4a4f5a, 4, 2);
      const left = Object.keys(this.parts).filter((k) => k.startsWith('plate') && this.parts[k].alive).length;
      if (left === 0) { this.phase = 2; Game.radio('tobi', 'The core is exposed! Charge a shot and let it have it!', 2); Game.radio('croak', 'Insolent vermin! Strider, CRUSH THEM!', 2); AudioSys.play('bossAlarm'); }
    } else if (part.name === 'CORE') this.defeat();
  }
  defeat() {
    this.alive = false; this.phase = 3; this.deathT = 0;
    Game.onBossDefeated(this);
  }
  update(dt) {
    this.age += dt;
    const u = this.mesh.userData;
    if (!this.alive) {
      // collapse with chained explosions
      this.deathT += dt;
      if (Math.random() < dt * 12) FX.explode(this.pos.clone().add(V3(rand(-14, 14), rand(5, 50), rand(-10, 10))), rand(1.5, 3), { debris: Math.random() < 0.4, color: 0xa8432a });
      this.mesh.rotation.x = damp(this.mesh.rotation.x, -0.5, 1, dt);
      this.mesh.position.y -= dt * 6;
      if (this.deathT > 3.2 && !this.gone) { this.gone = true; FX.explode(this.pos.clone().add(V3(0, 30, 0)), 8, { color: 0xa8432a }); FX.bombBlast(this.pos.clone().add(V3(0, 30, 0))); AudioSys.play('explosionBig'); this.mesh.visible = false; }
      return;
    }
    // walk backwards ahead of the player along the loop
    const P = G.player;
    this.lat = Math.sin(this.age * 0.35) * 16;
    const s = Rail.s + this.gap;
    const f = Rail.frame(s);
    const prev = this.pos.clone();
    this.pos.copy(f.pos).addScaledVector(f.right, this.lat);
    const gy = World.heightAt(this.pos.x, this.pos.z);
    this.pos.y = gy;
    this.vel.subVectors(this.pos, prev).multiplyScalar(1 / Math.max(dt, 1e-4));
    this.walk += prev.distanceTo(this.pos) / 9;
    const ph = this.walk;
    const L = u.legL, Rr = u.legR;
    L.hip.rotation.x = Math.sin(ph) * 0.45; Rr.hip.rotation.x = Math.sin(ph + Math.PI) * 0.45;
    L.knee.rotation.x = Math.max(0, Math.cos(ph)) * 0.6; Rr.knee.rotation.x = Math.max(0, Math.cos(ph + Math.PI)) * 0.6;
    L.foot.rotation.x = -L.hip.rotation.x - L.knee.rotation.x * 0.5; Rr.foot.rotation.x = -Rr.hip.rotation.x - Rr.knee.rotation.x * 0.5;
    u.hips.position.y = 24 + Math.abs(Math.cos(ph)) * 1.2;
    // footfall stomps
    const step = Math.floor(ph / Math.PI);
    if (step !== this.lastStep) {
      this.lastStep = step;
      FX.addShake(0.6, 0.2); AudioSys.play('explosionSmall', { pitch: 0.5, volume: 0.5 });
      FX.puffs && FX.smokePuff(this.pos.clone().add(V3(rand(-5, 5), 1, 0)), 5, 1, 0x9a8a70);
      if (this.phase === 2 && step % 2 === 0) this.stomp();
    }
    this.mesh.position.copy(this.pos);
    // face the player (local -Z toward the camera side)
    _m1.lookAt(this.pos, P ? _v1.set(P.pos.x, this.pos.y, P.pos.z) : f.pos, V3(0, 1, 0));
    this.mesh.quaternion.setFromRotationMatrix(_m1);
    u.torso.rotation.y = P ? clamp(Math.sin(this.age * 0.7) * 0.15, -0.3, 0.3) : 0;
    u.eye.material = this.beamCharge ? HIT_MAT : u.eye.material;
    for (const p of Object.values(this.parts)) if (p.alive) p.update(dt);
    this.body.update(dt);
    if (!G.cinematic) this.attacks(dt);
    this.updateBeam(dt);
    this.updateStomps(dt);
  }
  muzzle(i) { const c = this.mesh.userData.cannons; return c[i % c.length].getWorldPosition(V3()); }
  attacks(dt) {
    this.atkT -= dt * G.diffFire();
    if (this.atkT > 0) return;
    const P = G.player; if (!P || !P.alive) return;
    if (this.phase === 0) {
      const r = Math.random();
      if (r < 0.5) { for (let i = 0; i < 6; i++) setTimeoutGame(() => this.alive && this.parts.armL.alive && this.fanFrom(this.muzzle(2 + (i % 3)), 3), i * 0.12); for (let i = 0; i < 6; i++) setTimeoutGame(() => this.alive && this.parts.armR.alive && this.fanFrom(this.muzzle(5 + (i % 3)), 3), 0.4 + i * 0.12); this.atkT = 3.2; }
      else { const arms = [this.parts.armL, this.parts.armR].filter((a) => a.alive); for (const a of arms) for (let i = 0; i < 2; i++) new Missile(a.worldPos().clone().add(V3(0, 4, 0)), V3(rand(-0.5, 0.5), 1, -0.4), { speed: 80, turn: 1.2 }); this.atkT = 3.8; }
    } else if (this.phase === 1) {
      if (Math.random() < 0.5) { for (let i = 0; i < 8; i++) setTimeoutGame(() => this.alive && this.fanFrom(this.muzzle(i % 2), 5), i * 0.18); this.atkT = 3.4; }
      else { this.startBeam(); this.atkT = 4.5; }
    } else if (this.phase === 2) {
      const r = Math.random();
      if (r < 0.4) { this.startBeam(); this.atkT = 3.8; }
      else if (r < 0.7) { for (let i = 0; i < 3; i++) new Missile(this.pos.clone().add(V3(rand(-8, 8), 60, 0)), V3(rand(-0.6, 0.6), 1, 0), { speed: 85 }); this.atkT = 3.2; }
      else { for (let i = 0; i < 10; i++) setTimeoutGame(() => this.alive && this.fanFrom(this.muzzle(i % 2), 7), i * 0.12); this.atkT = 3; }
    }
  }
  fanFrom(from, n) {
    const P = G.player; if (!P) return;
    const base = _v1.subVectors(P.pos, from).normalize();
    const right = V3().crossVectors(base, V3(0, 1, 0)).normalize();
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.07;
      const d = base.clone().addScaledVector(right, a);
      const s = fireShot('eshot', 'enemy', from, d.normalize().multiplyScalar(150), { life: 4, color: 0xff7a1a, scale: 1.1 });
      s.dmgMul = 1.1;
    }
    AudioSys.play('enemyLaser', { volume: 0.5, pitch: 0.8 });
  }
  startBeam() {
    const P = G.player; if (!P) return;
    this.beamCharge = 1.3; this.beamY = P.pos.y; this.beamDir = Math.random() < 0.5 ? 1 : -1;
    AudioSys.play('alarm'); Game.toast('BEAM INCOMING — CHANGE ALTITUDE!', 1.4);
    Game.hint('beam', 'The Strider\'s eye beam sweeps at your height — climb or dive to dodge it!');
  }
  updateBeam(dt) {
    const u = this.mesh.userData;
    if (this.beamCharge > 0) {
      this.beamCharge -= dt;
      u.eye.scale.setScalar(1 + Math.sin(G.time * 40) * 0.3 + 0.6);
      if (this.beamCharge <= 0) {
        this.beamT = 1.5;
        if (!this.beam) { this.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1, 10, 1, true), glow(0xff3a2a, 4, { additive: true })); this.beam.geometry.rotateX(Math.PI / 2); this.beam.geometry.translate(0, 0, -0.5); R.scene.add(this.beam); }
        this.beam.visible = true; AudioSys.play('chargeShot', { pitch: 0.5 });
      }
      return;
    }
    u.eye.scale.setScalar(1);
    if (this.beamT > 0 && this.beam) {
      this.beamT -= dt;
      const eye = u.eye.getWorldPosition(V3());
      const P = G.player;
      const k = 1 - this.beamT / 1.5;
      const f = Rail.frame(Rail.s);
      const sweepX = lerp(-60, 60, this.beamDir > 0 ? k : 1 - k);
      const tgt = f.pos.clone().addScaledVector(f.right, sweepX); tgt.y = this.beamY;
      const dir = tgt.sub(eye);
      const len = dir.length() + 120;
      dir.normalize();
      this.beam.position.copy(eye);
      this.beam.quaternion.setFromUnitVectors(V3(0, 0, -1), dir);
      this.beam.scale.set(1 + Math.random() * 0.3, 1 + Math.random() * 0.3, len);
      if (Math.random() < 0.5) FX.sparksAt(eye.clone().addScaledVector(dir, len - 120), 3, 0xff6a3a);
      if (P && P.alive) {
        const rel = _v1.subVectors(P.pos, eye);
        const proj = rel.dot(dir);
        const dist = rel.addScaledVector(dir, -proj).length();
        if (proj > 0 && dist < 3.6) P.takeHit(10, eye);
      }
      if (this.beamT <= 0) this.beam.visible = false;
    }
  }
  stomp() {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.6, 6, 48), glow(0xffa040, 3, { additive: true }));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(this.pos).add(V3(0, 2, 0));
    R.scene.add(ring);
    this.stompRings.push({ mesh: ring, r: 4, hit: false });
    FX.addShake(1.4, 0.3);
    AudioSys.play('explosion', { pitch: 0.6 });
    Game.hint('stomp', 'Shockwaves roll along the ground — stay high to avoid them!');
  }
  updateStomps(dt) {
    const P = G.player;
    for (let i = this.stompRings.length - 1; i >= 0; i--) {
      const s = this.stompRings[i];
      s.r += 120 * dt;
      s.mesh.scale.set(s.r, s.r, 1 + s.r * 0.02);
      s.mesh.material.opacity = 1 - s.r / 260;
      if (P && P.alive && !s.hit) {
        const dxz = Math.hypot(P.pos.x - s.mesh.position.x, P.pos.z - s.mesh.position.z);
        if (Math.abs(dxz - s.r) < 5 && P.pos.y - s.mesh.position.y < 14) { s.hit = true; P.takeHit(12, s.mesh.position); }
      }
      if (s.r > 260) { s.mesh.removeFromParent(); this.stompRings.splice(i, 1); }
    }
  }
  dispose() {
    this.mesh.removeFromParent();
    for (const p of Object.values(this.parts)) { p.alive = false; if (p.collider) Phys.removeCollider(p.collider); }
    this.body.dispose();
    if (this.beam) this.beam.removeFromParent();
    this.stompRings.forEach((s) => s.mesh.removeFromParent());
  }
}

// ---------------------------------------------------------------- BOSS 2: Dreadnought "Toadstool" (all-range)
class MothershipBoss {
  constructor() {
    this.name = 'DREADNOUGHT GULLET'; this.alive = true; this.hostile = true; this.lockable = false; this.radius = 60;
    this.mesh = Models.mothership();
    R.scene.add(this.mesh);
    this.pos = V3(0, 40, -200); this.vel = V3(); this.age = 0; this.phase = 0; this.atkT = 4; this.launchT = 6; this.yaw = 0;
    this.mesh.position.copy(this.pos);
    const u = this.mesh.userData;
    this.parts = {};
    u.turrets.forEach((t, i) => (this.parts['turret' + i] = new BossPart(this, t, { hp: 10, radius: 4.5, name: 'TURRET', hits: 3, color: 0x4a3a5e, expSize: 1.6 })));
    u.shieldGens.forEach((g, i) => (this.parts['gen' + i] = new BossPart(this, g, { hp: 18, radius: 5, name: 'SHIELD GEN', hits: 4, color: 0x5affd8, expSize: 2 })));
    this.parts.core = new BossPart(this, u.core, { hp: 90, radius: 8, name: 'REACTOR', hits: 30, locked: () => this.phase < 1, color: 0xff3aa0, expSize: 4 });
    this.maxHp = Object.values(this.parts).reduce((a, p) => a + p.maxHp, 0);
    // shield bubble around the reactor
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16), glow(0x5affd8, 1.6, { additive: true, opacity: 0.35 }));
    u.core.add(this.shield);
    // solid hull (moving static colliders) so the player bounces off
    this.hull = [
      { off: V3(0, 0, -10), half: V3(28, 10, 70) }, { off: V3(-36, -2, 10), half: V3(8, 8, 36) }, { off: V3(36, -2, 10), half: V3(8, 8, 36) }, { off: V3(0, 16, 20), half: V3(8, 6, 12) },
    ].map((h) => ({ ...h, c: Phys.addStaticBox(h.off, h.half) }));
    this.beam = null; this.beamCharge = 0; this.beamT = 0;
    this.update(0);
  }
  worldPos() { return this.pos; }
  hpFrac() { return Object.values(this.parts).reduce((a, p) => a + Math.max(0, p.alive ? p.hp : 0), 0) / this.maxHp; }
  onPartDestroyed(part) {
    part.node.visible = false;
    Phys.spawnDebris(part.worldPos(), V3(0, 0, 0), 0x4a3a5e, 6, 2.5);
    if (part.name === 'SHIELD GEN') {
      const left = Object.keys(this.parts).filter((k) => k.startsWith('gen') && this.parts[k].alive).length;
      if (left === 0) { this.phase = 1; this.shield.visible = false; Game.radio('tobi', 'Shield\'s down! The reactor\'s under the stern — hit it with everything!', 2); Game.radio('croak', 'NO! Turn the ship! Fire the prow cannon!', 2); AudioSys.play('bossAlarm'); }
      else Game.radio('tobi', `Shield generator down! ${left} to go!`, 1);
    } else if (part.name === 'REACTOR') this.defeat();
  }
  defeat() { this.alive = false; this.deathT = 0; Game.onBossDefeated(this); }
  update(dt) {
    this.age += dt;
    const u = this.mesh.userData;
    if (!this.alive) {
      this.deathT += dt;
      if (Math.random() < dt * 16) FX.explode(this.pos.clone().add(V3(rand(-40, 40), rand(-15, 20), rand(-80, 80)).applyQuaternion(this.mesh.quaternion)), rand(2, 4), { debris: Math.random() < 0.3, color: 0x4a3a5e });
      this.mesh.rotation.z += dt * 0.15; this.pos.y -= dt * 4; this.mesh.position.copy(this.pos);
      if (this.deathT > 4 && !this.gone) { this.gone = true; for (let i = 0; i < 3; i++) FX.bombBlast(this.pos.clone().add(V3(0, 0, (i - 1) * 50))); FX.explode(this.pos, 10); AudioSys.play('explosionBig'); this.mesh.visible = false; this.hull.forEach((h) => Phys.removeCollider(h.c)); }
      return;
    }
    // slow patrol orbit; in phase 1 it turns to bring the prow cannon onto the player
    const P = G.player;
    if (this.phase === 0) {
      this.pos.set(Math.sin(this.age * 0.05) * 160, 40 + Math.sin(this.age * 0.2) * 10, -200 + Math.cos(this.age * 0.05) * 160);
      this.yaw = damp(this.yaw, -this.age * 0.05 + Math.PI / 2, 0.5, dt);
    } else if (P) {
      const to = _v1.subVectors(P.pos, this.pos);
      this.yaw = damp(this.yaw, Math.atan2(-to.x, -to.z), this.beamT > 0 ? 0.22 : 0.4, dt);
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(0, this.yaw, Math.sin(this.age * 0.3) * 0.03);
    this.mesh.updateMatrixWorld(true);
    for (const h of this.hull) Phys.syncCollider(h.c, h.off.clone().applyQuaternion(this.mesh.quaternion).add(this.pos), this.mesh.quaternion);
    for (const e of u.engines) e.scale.setScalar(0.9 + Math.random() * 0.2);
    for (const p of Object.values(this.parts)) if (p.alive) p.update(dt);
    if (this.shield.visible) this.shield.scale.setScalar(1 + Math.sin(this.age * 4) * 0.04);
    // turrets track the player
    u.turrets.forEach((t, i) => { if (this.parts['turret' + i].alive && P) { const lp = this.mesh.worldToLocal(P.pos.clone()).sub(t.position); t.rotation.y = Math.atan2(-lp.x, -lp.z) * (t.rotation.z ? -1 : 1); } });
    if (!G.cinematic) this.attacks(dt);
    this.updateBeam(dt);
  }
  attacks(dt) {
    const P = G.player; if (!P || !P.alive) return;
    const u = this.mesh.userData;
    // turret fire
    u.turrets.forEach((t, i) => {
      const part = this.parts['turret' + i];
      if (!part.alive) return;
      part.cd = (part.cd ?? rand(1, 3)) - dt * G.diffFire();
      const from = t.userData.muzzle.getWorldPosition(V3());
      if (part.cd <= 0 && from.distanceTo(P.pos) < 520) { part.cd = rand(2.4, 3.8); part.shoot(from, 165, 0.035, { color: 0xff3a8a }); }
    });
    // hangar launches
    this.launchT -= dt;
    const drones = G.ents.filter((e) => e.alive && e instanceof Drone).length;
    if (this.launchT <= 0 && drones < 6) {
      this.launchT = 11;
      for (let i = 0; i < 2; i++) setTimeoutGame(() => { if (this.alive) new Drone(u.hangar.getWorldPosition(V3()).add(V3(rand(-5, 5), -6, 0))); }, i * 0.6);
      Game.radioOnce('hangar', 'marlow', 'It\'s launching fighters from the forward hangar!');
    }
    this.atkT -= dt * G.diffFire();
    if (this.atkT > 0) return;
    if (this.phase === 1) {
      if (Math.random() < 0.55) { this.beamCharge = 2.2; AudioSys.play('alarm'); Game.toast('PROW CANNON CHARGING — GET OUT OF ITS SIGHTS!', 2); this.atkT = 7; }
      else { for (let i = 0; i < 4; i++) new Missile(this.pos.clone().add(V3(rand(-15, 15), 20, rand(-20, 20))), V3(rand(-1, 1), 1, rand(-1, 1)), { speed: 90, turn: 1.4, life: 7 }); this.atkT = 4.5; }
    } else {
      for (let i = 0; i < 2; i++) new Missile(this.pos.clone().add(V3(rand(-15, 15), 20, rand(-20, 20))), V3(rand(-1, 1), 1, rand(-1, 1)), { speed: 85, turn: 1.2 });
      this.atkT = 6;
    }
  }
  updateBeam(dt) {
    const P = G.player;
    const prow = V3(0, -2, -88).applyQuaternion(this.mesh.quaternion).add(this.pos);
    const dir = V3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    if (this.beamCharge > 0) {
      this.beamCharge -= dt;
      FX.fire.spawn({ pos: prow.clone().add(V3(rand(-6, 6), rand(-6, 6), rand(-6, 6))), vel: V3(rand(-4, 4), rand(-4, 4), rand(-4, 4)), life: 0.25, s0: 2.5, s1: 0.2, c0: 0xffffff, c1: 0xff3aa0, int: 3 });
      if (this.beamCharge <= 0) {
        this.beamT = 2.6;
        if (!this.beam) { this.beam = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 1, 14, 1, true), glow(0xff5ab8, 4, { additive: true })); this.beam.geometry.rotateX(Math.PI / 2); this.beam.geometry.translate(0, 0, -0.5); R.scene.add(this.beam); }
        this.beam.visible = true; AudioSys.play('chargeShot', { pitch: 0.35 }); FX.addShake(1.5, 2.5);
      }
    }
    if (this.beamT > 0 && this.beam) {
      this.beamT -= dt;
      this.beam.position.copy(prow);
      this.beam.quaternion.setFromUnitVectors(V3(0, 0, -1), dir);
      this.beam.scale.set(1 + Math.random() * 0.2, 1 + Math.random() * 0.2, 1400);
      if (P && P.alive) {
        const rel = _v1.subVectors(P.pos, prow);
        const proj = rel.dot(dir);
        if (proj > 0 && rel.addScaledVector(dir, -proj).length() < 8) P.takeHit(14, prow);
      }
      for (const w of G.wingmen) if (w.active) { const rel = _v1.subVectors(w.pos, prow); const proj = rel.dot(dir); if (proj > 0 && rel.addScaledVector(dir, -proj).length() < 8) w.damage(dt * 30); }
      if (this.beamT <= 0) this.beam.visible = false;
    }
  }
  dispose() {
    this.mesh.removeFromParent();
    for (const p of Object.values(this.parts)) { p.alive = false; if (p.collider) Phys.removeCollider(p.collider); }
    if (!this.gone) this.hull.forEach((h) => Phys.removeCollider(h.c));
    if (this.beam) this.beam.removeFromParent();
  }
}

// game-time timers (pause-safe)
const GameTimers = [];
function setTimeoutGame(fn, sec) { GameTimers.push({ fn, t: sec }); }
function updateGameTimers(dt) {
  for (let i = GameTimers.length - 1; i >= 0; i--) { const t = GameTimers[i]; t.t -= dt; if (t.t <= 0) { GameTimers.splice(i, 1); t.fn(); } }
}
