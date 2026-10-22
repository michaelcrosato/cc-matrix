// ===== 07_entities.js — projectiles, enemies, items/rings, wingmen =====
const Projectiles = {
  list: [], geoLaser: null, geoBullet: null,
  init() {
    this.geoLaser = new THREE.CylinderGeometry(0.22, 0.22, 7, 5); this.geoLaser.rotateX(Math.PI / 2);
    this.geoBullet = new THREE.IcosahedronGeometry(1, 1);
    this.matL = [glow(0.4, 4.5, 0.8), glow(0.5, 4.5, 1.2), glow(0.8, 2.2, 6)];
    this.matWing = glow(4.5, 2.5, 0.5);
    this.matE = glow(5, 1.0, 0.6); this.matDeflect = glow(1, 4, 5);
    this.matCharge = glow(1.5, 5, 2, { transparent: true, opacity: 0.95 });
    this.matBomb = glow(5, 0.8, 3);
  },
  add(p) { this.list.push(p); Gfx.scene.add(p.mesh); return p; },
  laser(from, dir, level, baseSpeed, owner = 'player') {
    const m = new THREE.Mesh(this.geoLaser, owner === 'player' ? this.matL[level] : this.matWing);
    if (level === 2) m.scale.set(1.6, 1.6, 1.3);
    m.position.copy(from); m.quaternion.setFromUnitVectors(_v1.set(0, 0, -1), dir);
    return this.add({ kind: 'laser', owner, mesh: m, pos: from.clone(), prev: from.clone(), vel: dir.clone().multiplyScalar(430 + baseSpeed), life: 0.85, dmg: level === 2 ? 2 : 1, alive: true });
  },
  enemyShot(from, target, speed = 85, lead = true) {
    const t = from.distanceTo(target.pos) / speed;
    _v1.copy(target.pos); if (lead && target.vel) _v1.addScaledVector(target.vel, t * 0.85);
    const dir = _v1.sub(from).normalize();
    const m = new THREE.Mesh(this.geoBullet, this.matE); m.scale.setScalar(1.1); m.position.copy(from);
    _v2.copy(from).project(Gfx.camera); Audio_.play('enemyShot', { pan: clamp(_v2.x, -1, 1) * 0.6, vol: clamp(1.2 - from.distanceTo(Gfx.camera.position) / 400, 0.15, 1) });
    return this.add({ kind: 'ebullet', mesh: m, pos: from.clone(), prev: from.clone(), vel: dir.multiplyScalar(speed), life: 5, dmg: 7, alive: true, deflected: false });
  },
  chargeShot(from, dir, target, baseSpeed) {
    const m = new THREE.Mesh(this.geoBullet, this.matCharge); m.scale.setScalar(1.8); m.position.copy(from);
    return this.add({ kind: 'charge', mesh: m, pos: from.clone(), prev: from.clone(), vel: dir.multiplyScalar(200 + baseSpeed), life: 1.8, target, alive: true });
  },
  bomb(from, dir, target) {
    const m = new THREE.Mesh(this.geoBullet, this.matBomb); m.scale.setScalar(1.3); m.position.copy(from);
    const b = this.add({ kind: 'bomb', mesh: m, pos: from.clone(), prev: from.clone(), vel: dir.multiplyScalar(170 + Player.forwardSpeed()), life: 1.1, target, alive: true });
    return b;
  },
  remove(p) { p.alive = false; Gfx.scene.remove(p.mesh); },
  blast(pos, radius, dmg, byPlayer = true) {
    let kills = 0;
    for (const e of Enemies.list) {
      if (!e.alive) continue;
      const r = radius + (e.radius || 2);
      if (e.pos.distanceToSquared(pos) < r * r) { if (Enemies.damage(e, dmg, e.pos, byPlayer, true)) kills++; }
    }
    return kills;
  },
  detonateBomb(b) {
    if (!b.alive) return;
    this.remove(b);
    const pos = b.pos;
    // expanding pink shock sphere
    FX.spawn('fire', pos, V3(), 4, 0.9, new THREE.Color(5, 1.2, 3.5), { size2: 70 });
    FX.spawn('ring', pos, V3(), 6, 0.8, new THREE.Color(4, 2, 4), { size2: 90 }).mesh.lookAt(Gfx.camera.position);
    FX.explode(pos, 2.5, { debris: false });
    Audio_.play('bomb'); Gfx.addShake(1.6); Input.rumble(1, 0.8, 500); Gfx.flashLight(pos, 200, 0.9, 0xff60c0);
    for (const p of this.list) if (p.alive && p.kind === 'ebullet' && p.pos.distanceTo(pos) < 80) { this.remove(p); FX.sparks(p.pos, 3); }
    const kills = this.blast(pos, 62, 30);
    if (kills > 1) Game.addHits(kills - 1, pos, 'BOMB BONUS');
  },
  update(dt) {
    for (const p of this.list) {
      if (!p.alive) continue;
      p.life -= dt; p.prev.copy(p.pos);
      if (p.kind === 'charge' && p.target && p.target.alive) {
        _v1.copy(p.target.pos).sub(p.pos); const dist = _v1.length();
        const spd = p.vel.length(); p.vel.lerp(_v1.normalize().multiplyScalar(spd), clamp(dt * 9, 0, 1));
        if (dist < 4 + (p.target.radius || 2)) { this.detonateCharge(p); continue; }
      }
      if (p.kind === 'bomb' && p.target && p.target.alive) { _v1.copy(p.target.pos).sub(p.pos).normalize().multiplyScalar(p.vel.length()); p.vel.lerp(_v1, clamp(dt * 5, 0, 1)); }
      p.pos.addScaledVector(p.vel, dt); p.mesh.position.copy(p.pos);
      if (p.kind === 'charge') { p.mesh.scale.setScalar(1.8 + Math.sin(Game.t * 40) * 0.3); if (Math.random() < 0.6) FX.spawn('spark', p.pos, V3(rand(-4, 4), rand(-4, 4), rand(-4, 4)), 0.5, 0.25, new THREE.Color(1, 4, 2)); }
      if (p.kind === 'bomb') { if (Math.random() < 0.8) FX.spawn('fire', p.pos, V3(), 0.8, 0.3, new THREE.Color(4, 1, 3)); }
      // terrain / water
      const gy = terrainH(p.pos.x, p.pos.z);
      if (p.pos.y < Math.max(gy, 0)) {
        if (p.kind === 'bomb') { this.detonateBomb(p); continue; }
        if (p.kind === 'charge') { this.detonateCharge(p); continue; }
        FX.sparks(p.pos, 3, gy < 0 ? new THREE.Color(2, 3, 4) : undefined); this.remove(p); continue;
      }
      if (p.life <= 0) {
        if (p.kind === 'bomb') this.detonateBomb(p); else if (p.kind === 'charge') this.detonateCharge(p); else this.remove(p);
        continue;
      }
      if (p.kind === 'laser' && p.owner === 'enemy') continue;
      if (p.kind === 'laser' || p.kind === 'charge' || p.kind === 'bomb' || (p.kind === 'ebullet' && p.deflected)) {
        const filt = Physics.G_STATIC | Physics.G_ENEMY | (p.kind === 'laser' && p.owner === 'player' ? Physics.G_FRIEND : 0);
        const hit = Physics.cast(p.prev, p.pos, filt);
        if (hit && hit.owner) {
          if (p.kind === 'bomb') { p.pos.copy(hit.point); this.detonateBomb(p); continue; }
          if (p.kind === 'charge') { p.pos.copy(hit.point); this.detonateCharge(p); continue; }
          if (hit.owner.kind === 'static') { FX.sparks(hit.point, 4); this.remove(p); continue; }
          if (hit.owner.kind === 'enemy') {
            const e = hit.owner.e; if (e.alive) { Enemies.damage(e, p.kind === 'ebullet' ? 3 : p.dmg, hit.point, p.owner !== 'wing'); if (p.owner === 'player') Game.stats.landed++; }
            this.remove(p); continue;
          }
          if (hit.owner.kind === 'friend') { hit.owner.w.friendlyFire(); FX.sparks(hit.point, 4); this.remove(p); continue; }
        }
      } else if (p.kind === 'ebullet') {
        // vs player: segment-point distance
        if (!Player.dead && segDist(p.prev, p.pos, Player.pos) < 2.8) {
          if (Player.rolling) { p.deflected = true; p.mesh.material = this.matDeflect; p.vel.negate().add(_v1.set(rand(-20, 20), rand(-10, 20), 0)); p.life = 1.5; Audio_.play('deflect'); FX.sparks(p.pos, 4, new THREE.Color(1, 4, 5)); Game.stats.deflects++; if (Game.stats.deflects === 1) HUD.toast('Deflected!'); continue; }
          if (Player.hurt(p.dmg)) { FX.sparks(p.pos, 6); this.remove(p); continue; }
        }
        for (const w of Wingmen.list) if (w.active && segDist(p.prev, p.pos, w.pos) < 2.5) { w.hurt(4); this.remove(p); break; }
        if (!p.alive) continue;
        if (p.mesh) p.mesh.scale.setScalar(1.1 + Math.sin(Game.t * 30 + p.life * 10) * 0.25);
      }
    }
    this.list = this.list.filter(p => p.alive);
    if (this.list.length > 900) { for (const p of this.list.slice(0, 200)) this.remove(p); this.list = this.list.filter(p => p.alive); }
  },
  detonateCharge(p) {
    if (!p.alive) return;
    this.remove(p);
    FX.spawn('fire', p.pos, V3(), 3, 0.5, new THREE.Color(1.5, 5, 2), { size2: 26 });
    FX.sparks(p.pos, 14, new THREE.Color(1, 5, 2));
    Audio_.play('explode', { size: 1.5 }); Gfx.flashLight(p.pos, 80, 0.5, 0x60ff90);
    const kills = this.blast(p.pos, 24, 6);
    if (kills > 1) Game.addHits(kills - 1, p.pos, kills >= 4 ? 'GREAT!' : 'MULTI-HIT');
  },
  clear() { for (const p of this.list) Gfx.scene.remove(p.mesh); this.list.length = 0; },
};
function segDist(a, b, p) {
  _v1.copy(b).sub(a); const l2 = _v1.lengthSq();
  let t = l2 > 0 ? _v2.copy(p).sub(a).dot(_v1) / l2 : 0; t = clamp(t, 0, 1);
  return _v2.copy(a).addScaledVector(_v1, t).distanceTo(p);
}

// ---------- enemies ----------
const ETYPES = {
  dart: { hp: 1, hits: 1, radius: 3, model: () => makeDart() },
  ace: { hp: 2, hits: 1, radius: 3, model: () => makeDart(0x3a70d6) },
  hunter: { hp: 3, hits: 1, radius: 3.4, model: () => makeHunter() },
  tank: { hp: 2, hits: 1, radius: 4.5, model: () => makeTank(), ground: true },
  turret: { hp: 3, hits: 1, radius: 4, model: () => makeTurret(), ground: true },
  hauler: { hp: 8, hits: 3, radius: 7, model: () => makeHauler() },
  gnat: { hp: 1, hits: 1, radius: 2.6, model: () => { const g = makeDart(0xe0c030); g.scale.setScalar(0.7); return g; } },
  spinner: { hp: 1, hits: 1, radius: 3, model: () => makeSpinner() },
  missile: { hp: 1, hits: 0, radius: 2, model: () => makeMissile() },
  part: { hp: 10, hits: 2, radius: 6, model: () => new THREE.Group() },
};
const Enemies = {
  list: [], groups: {},
  spawn(type, o = {}) {
    const T = ETYPES[type];
    const mdl = o.model || T.model();
    mdl.traverse(c => { if (c.isMesh && c.material.isMeshToonMaterial) c.material = c.material.clone(); });
    Gfx.scene.add(mdl);
    const e = Object.assign({ type, hp: T.hp, maxHp: T.hp, hits: T.hits, radius: T.radius, mesh: mdl, pos: V3(), vel: V3(), alive: true, t: 0, lockable: type !== 'missile', flash: 0, rel: 0, lx: 0, ly: 0, fireT: rand(0.8, 2.2), railRel: !T.ground && Game.mode !== 'allrange' }, o);
    e.hp *= (o.hpMul || 1); e.maxHp = e.hp;
    e.collider = Physics.addMover(e.radius, { kind: 'enemy', e }, Physics.G_ENEMY);
    if (o.init) o.init(e);
    this.place(e);
    this.list.push(e);
    if (e.group) { (this.groups[e.group] ||= { total: 0, killed: 0, dead: 0 }).total++; }
    return e;
  },
  place(e) {
    if (e.railRel) {
      Rail.point(Game.d + e.rel, e.lx, e.ly, Game.route, _v3);
      e.vel.copy(_v3).sub(e.pos).divideScalar(Math.max(Game.dt, 1e-3));
      e.pos.copy(_v3);
    }
    e.mesh.position.copy(e.pos);
    e.collider.setTranslation({ x: e.pos.x, y: e.pos.y, z: e.pos.z });
  },
  damage(e, dmg, point, byPlayer = true, splash = false) {
    if (!e.alive) return false;
    if (e.shielded) { FX.sparks(point, 3, new THREE.Color(2, 3, 5)); Audio_.play('deflect', { vol: 0.5 }); if (e.onBlocked) e.onBlocked(e); return false; }
    if (e.armored && !splash && dmg < 2) { FX.sparks(point, 3, new THREE.Color(3, 3, 3)); Audio_.play('hitEnemy', { vol: 0.4 }); return false; }
    e.hp -= dmg; e.flash = 1;
    if (e.onHit) e.onHit(e, dmg);
    if (e.hp <= 0) { this.kill(e, byPlayer); return true; }
    FX.sparks(point, 4); Audio_.play('hitEnemy');
    return false;
  },
  kill(e, byPlayer = true, silent = false) {
    if (!e.alive) return;
    e.alive = false;
    if (!silent) {
      FX.explode(e.pos, e.boomSize || (e.radius > 5 ? 2.2 : 1.1), { vel: e.vel });
      if (byPlayer && e.hits) Game.addHits(e.hits, e.pos);
      if (byPlayer) Game.stats.kills++;
      if (e.drop) Items.spawn(e.drop, e.pos.clone());
      if (e.group && this.groups[e.group]) {
        const g = this.groups[e.group]; g.dead++; if (byPlayer) g.killed++;
        if (g.killed === g.total && g.total >= 3) Game.addHits(3, e.pos, 'SQUADRON BONUS');
      }
    }
    if (e.onDeath) e.onDeath(e, byPlayer, silent);
    this.dispose(e);
  },
  dispose(e) {
    e.alive = false;
    Gfx.scene.remove(e.mesh); Physics.remove(e.collider); e.collider = null;
  },
  update(dt) {
    for (const e of this.list) {
      if (!e.alive) continue;
      e.t += dt;
      if (e.update) e.update(e, dt);
      if (!e.alive) continue;
      this.place(e);
      if (e.flash > 0) {
        e.flash = Math.max(0, e.flash - dt * 6);
        const f = e.flash;
        e.mesh.traverse(c => { if (c.isMesh && c.material.isMeshToonMaterial) c.material.emissive.setRGB(f, f, f); });
      }
      // despawn behind the camera on rails
      if (Game.mode !== 'allrange' && !e.keep) {
        const rel = e.railRel ? e.rel : (-e.pos.z - Game.d);
        if (rel < -60 || rel > 1400) { this.kill(e, false, true); continue; }
      }
      // ram the player
      if (!Player.dead && !e.noRam && e.pos.distanceToSquared(Player.pos) < (e.radius + 2) ** 2) {
        if (e.type === 'missile') { FX.explode(e.pos, 1, { debris: false }); this.kill(e, false, true); Player.hurt(12); }
        else if (!Player.looping) { Player.crash(10, e.pos.x > Player.pos.x ? 'R' : 'L'); if (e.hp <= 3) this.kill(e, true); }
      }
    }
    this.list = this.list.filter(e => e.alive);
  },
  clear() { for (const e of this.list) this.dispose(e); this.list.length = 0; this.groups = {}; },
  // generic helpers for behaviors
  inFront(e, min = 30, max = 380) { const r = e.railRel ? e.rel : (-e.pos.z - Game.d); return Game.mode === 'allrange' || (r > min && r < max); },
  tryFire(e, dt, rate = 1, speed = 85) {
    e.fireT -= dt * rate * diff().enemyFire;
    if (e.fireT <= 0) {
      e.fireT = rand(1.6, 3.2);
      if (!Player.dead && this.inFront(e) && e.pos.distanceTo(Player.pos) < 420) { Projectiles.enemyShot(e.pos.clone(), Player, speed); return true; }
    }
    return false;
  },
  face(e, dir, dt, k = 8, roll = 0) {
    if (!e.baseQ) e.baseQ = e.mesh.quaternion.clone();
    if (dir.lengthSq() > 1e-6) { _m1.lookAt(_v1.set(0, 0, 0), _v2.copy(dir).negate(), UP); _q1.setFromRotationMatrix(_m1); e.baseQ.slerp(_q1, clamp(dt * k, 0, 1)); }
    e.roll = damp(e.roll || 0, roll, 6, dt);
    e.mesh.quaternion.copy(e.baseQ).multiply(_q2.setFromAxisAngle(_v1.set(0, 0, 1), e.roll));
  },
};

// ---------- enemy behaviors (formation patterns) ----------
const B = {
  // fly from ahead toward the player along a curve, then peel away
  swoop: o => ({
    rel: o.ahead || 340, lx: o.lx0, ly: o.ly0, update(e, dt) {
      const k = clamp(e.t / (o.dur || 4), 0, 1);
      e.rel += ((o.speed ?? -20) - Game.speed) * dt;
      e.lx = lerp(o.lx0, o.lx1, smooth(0, 1, k)) + Math.sin(e.t * (o.wf || 2)) * (o.wa || 4);
      e.ly = lerp(o.ly0, o.ly1, smooth(0, 1, k)) + Math.cos(e.t * (o.wf || 2)) * (o.wa || 4) * 0.5;
      if (e.rel < 50) { e.ly += dt * 60; e.lx += Math.sign(e.lx || 1) * dt * 50; }
      Enemies.face(e, _v4.copy(Player.pos).sub(e.pos), dt, 4, Math.sin(e.t * 3) * 0.4);
      Enemies.tryFire(e, dt, o.fire ?? 1);
    },
  }),
  // cross the screen from one side to the other while keeping pace
  cross: o => ({
    rel: o.ahead || 160, lx: o.lx0, ly: o.ly0, update(e, dt) {
      const k = e.t / (o.dur || 3.5);
      e.lx = lerp(o.lx0, o.lx1, k); e.ly = o.ly0 + Math.sin(k * Math.PI * (o.waves || 1)) * (o.amp || 12);
      e.rel += (o.drift || -6) * dt;
      _v4.copy(Rail.right).multiplyScalar(Math.sign(o.lx1 - o.lx0));
      Enemies.face(e, _v4, dt, 6, -Math.sign(o.lx1 - o.lx0) * 0.7);
      if (k > 1.3) Enemies.kill(e, false, true);
      Enemies.tryFire(e, dt, o.fire ?? 0.8);
    },
  }),
  // tailers: come from behind, overtake, harass from the front, then flee
  tail: o => ({
    rel: -45, lx: o.lx0, ly: o.ly0, update(e, dt) {
      if (e.t < 5) { // behind the player: shoot at them, overtake slowly
        e.rel += ((e.t < 3 ? BASE_SPEED + 4 : BASE_SPEED + 18) - Game.speed) * dt;
        e.lx = damp(e.lx, Player.ox + Math.sin(e.t * 2 + o.lx0) * 10, 1.5, dt); e.ly = damp(e.ly, Player.oy + 4, 1.5, dt);
        if (e.rel < 0) { e.fireT -= dt * diff().enemyFire; if (e.fireT <= 0) { e.fireT = rand(1.4, 2.4); if (!Player.dead) Projectiles.enemyShot(e.pos.clone(), Player, 75, false); } HUD.behindWarn = 0.3; }
      } else {
        e.rel += ((e.rel < 70 ? BASE_SPEED + 30 : Game.speed) - Game.speed) * dt;
        e.lx += Math.sin(e.t * 1.5) * dt * 20; e.ly += Math.cos(e.t * 1.2) * dt * 8;
        if (e.t > 11) { e.ly += dt * 40; e.rel += dt * 60; }
        Enemies.tryFire(e, dt, 0.9);
      }
      Enemies.face(e, _v4.copy(Rail.fwd), dt, 6, Math.sin(e.t * 2) * 0.5);
    },
  }),
  // hold position ahead and weave
  hold: o => ({
    rel: o.ahead || 260, lx: o.lx0, ly: o.ly0, update(e, dt) {
      const tgt = o.hold || 110;
      e.rel = e.t < (o.life || 8) ? damp(e.rel, tgt, 1.2, dt) : e.rel + dt * 80;
      e.lx = o.lx0 + Math.sin(e.t * (o.wf || 1.1) + (o.phase || 0)) * (o.wa || 25);
      e.ly = o.ly0 + Math.cos(e.t * 1.7 + (o.phase || 0)) * 8;
      Enemies.face(e, _v4.copy(Player.pos).sub(e.pos), dt, 4);
      Enemies.tryFire(e, dt, o.fire ?? 1.2);
    },
  }),
  // sine chain (gnat swarm)
  chain: o => ({
    rel: (o.ahead || 380) + o.i * 14, lx: o.lx0, ly: o.ly0, group: o.group, update(e, dt) {
      e.rel += (-25 - Game.speed) * dt;
      const ph = e.t * 2.2 - o.i * 0.5;
      e.lx = o.lx0 + Math.sin(ph) * (o.amp || 26); e.ly = o.ly0 + Math.sin(ph * 2) * 6;
      Enemies.face(e, _v4.copy(Rail.fwd).negate().addScaledVector(Rail.right, Math.cos(ph) * 0.8), dt, 8);
      if (o.i === 0) Enemies.tryFire(e, dt, 0.6);
    },
  }),
  // passing hauler carrying a supply item
  haul: o => ({
    rel: o.ahead || 240, lx: o.lx0, ly: o.ly0, drop: o.drop, update(e, dt) {
      const k = e.t / (o.dur || 7);
      e.lx = lerp(o.lx0, o.lx1, k); e.ly = o.ly0 + Math.sin(e.t) * 3; e.rel += -4 * dt;
      Enemies.face(e, _v4.copy(Rail.right).multiplyScalar(Math.sign(o.lx1 - o.lx0)).addScaledVector(Rail.fwd, -0.4), dt, 3);
      if (k > 1.2) Enemies.kill(e, false, true);
    },
  }),
  // flyby: overtakes from behind high above — target practice
  flyby: o => ({
    rel: -40, lx: o.lx0, ly: o.ly0, update(e, dt) {
      e.rel += 55 * dt; e.ly -= dt * 2; e.lx += Math.sin(e.t * 2) * dt * 6;
      Enemies.face(e, _v4.copy(Rail.fwd), dt, 6);
      if (e.rel > 150) { e.ly += dt * 30; }
      if (e.t > 9) Enemies.kill(e, false, true);
    },
  }),
};
// ground units: world anchored
function spawnGround(type, d, lx, o = {}) {
  const p = Rail.point(d, lx, 0, o.route || Game.route);
  p.y = Math.max(terrainH(p.x, p.z), 0) + (o.yOff || 0);
  if (o.onRoof) p.y = o.onRoof;
  const heading = rand(0, TAU);
  return Enemies.spawn(type, Object.assign({
    pos: p, railRel: false, armored: false, update(e, dt) {
      const tur = e.mesh.userData.turret;
      if (type === 'tank' && e.t < (o.drive || 6)) { e.pos.x += Math.sin(heading) * dt * 8; e.pos.z += Math.cos(heading) * dt * 8; e.pos.y = Math.max(terrainH(e.pos.x, e.pos.z), 0); e.mesh.rotation.y = heading + Math.PI; }
      if (tur) { _v4.copy(Player.pos).sub(e.pos); const yaw = Math.atan2(-_v4.x, -_v4.z) - e.mesh.rotation.y; tur.rotation.y = damp(tur.rotation.y, yaw, 4, dt); }
      Enemies.tryFire(e, dt, o.fire ?? 0.9, 80);
    },
  }, o));
}
function spawnSpinner(d, lx, ly, route) {
  const p = Rail.point(d, lx, ly, route || Game.route);
  return Enemies.spawn('spinner', {
    pos: p, railRel: false, base: p.clone(), noRam: true, update(e, dt) {
      e.mesh.rotation.y += dt * 2; e.mesh.rotation.x += dt; e.pos.y = e.base.y + Math.sin(e.t * 2 + lx) * 4;
      if (!Player.dead && e.pos.distanceTo(Player.pos) < 13) { FX.explode(e.pos, 1.6); if (e.pos.distanceTo(Player.pos) < 11) Player.hurt(14); Enemies.kill(e, false, true); }
    },
  });
}
// all-range fighters
function spawnHunter(pos, o = {}) {
  return Enemies.spawn(o.type || 'hunter', Object.assign({
    pos: pos.clone(), railRel: false, keep: true, speed: o.speed || 52, dir: V3(rand(-1, 1), 0, rand(-1, 1)).normalize(),
    update(e, dt) {
      const tgt = e.chase && e.chase.active ? e.chase : Player;
      _v4.copy(tgt.pos).sub(e.pos);
      const dist = _v4.length();
      if (dist > 30 || e.t % 6 < 3) e.dir.lerp(_v4.normalize(), clamp(dt * 1.1, 0, 1)).normalize();
      else e.dir.lerp(_v4.set(-_v4.z, 0.3, _v4.x).normalize(), clamp(dt * 1.5, 0, 1)).normalize();
      const gy = Math.max(terrainH(e.pos.x, e.pos.z), 0); if (e.pos.y < gy + 15) e.dir.y = Math.abs(e.dir.y) + 0.3;
      e.dir.normalize();
      e.pos.addScaledVector(e.dir, e.speed * dt); e.vel.copy(e.dir).multiplyScalar(e.speed);
      Enemies.face(e, e.dir, dt, 10, Math.sin(e.t * 2) * 0.6);
      if (tgt === Player) {
        _v4.copy(Player.pos).sub(e.pos).normalize();
        if (_v4.dot(e.dir) > 0.9 && dist < 300) Enemies.tryFire(e, dt, 1.3, 95);
      } else if (dist < 120) { e.chaseT = (e.chaseT || 0) + dt; if (e.chaseT > 1.2) { e.chaseT = 0; tgt.hurt(5); FX.sparks(tgt.pos, 4); } }
    },
  }, o));
}
function spawnMissile(from, dir) {
  Audio_.play('missile');
  return Enemies.spawn('missile', {
    pos: from.clone(), railRel: false, keep: true, dir: dir.clone(), boomSize: 0.8,
    update(e, dt) {
      _v4.copy(Player.pos).sub(e.pos).normalize();
      e.dir.lerp(_v4, clamp(dt * (e.t < 0.6 ? 0.5 : 1.6), 0, 1)).normalize();
      const sp = 60 + Math.min(e.t * 10, 25);
      e.pos.addScaledVector(e.dir, sp * dt); e.vel.copy(e.dir).multiplyScalar(sp);
      Enemies.face(e, e.dir, dt, 20);
      if (Math.random() < 0.7) FX.smokePuff(e.pos, 0.7, new THREE.Color(0.7, 0.7, 0.72));
      if (e.t > 7 || e.pos.y < terrainH(e.pos.x, e.pos.z)) { FX.explode(e.pos, 0.8, { debris: false }); Enemies.kill(e, false, true); }
      if (Player.rolling && e.pos.distanceTo(Player.pos) < 7) { FX.sparks(e.pos, 6, new THREE.Color(1, 4, 5)); Enemies.kill(e, false); Audio_.play('deflect'); }
    },
  });
}

// ---------- items & rings ----------
const Items = {
  list: [],
  spawn(type, pos) {
    let m;
    if (type === 'silver' || type === 'gold') m = makeRing(type === 'gold');
    else m = makeItem(type);
    m.position.copy(pos); Gfx.scene.add(m);
    const it = { type, pos: pos.clone(), mesh: m, alive: true, t: 0, radius: type === 'gold' || type === 'silver' ? 7 : 6 };
    this.list.push(it); return it;
  },
  atRail(type, d, lx, ly, route) { return this.spawn(type, Rail.point(d, lx, ly, route || Game.route)); },
  update(dt) {
    for (const it of this.list) {
      if (!it.alive) continue;
      it.t += dt;
      if (it.type === 'silver' || it.type === 'gold') { it.mesh.lookAt(Gfx.camera.position); it.mesh.rotateZ(it.t * 2); }
      else { it.mesh.userData.box.rotation.y += dt * 2; it.mesh.userData.box.rotation.x = Math.sin(it.t) * 0.3; it.mesh.userData.halo.lookAt(Gfx.camera.position); it.mesh.position.y = it.pos.y + Math.sin(it.t * 3) * 0.6; }
      const dist = it.pos.distanceTo(Player.pos);
      // gentle magnet: modern quality-of-life
      if (dist < 18 && !Player.dead) { it.pos.lerp(Player.pos, clamp(dt * 3, 0, 1)); it.mesh.position.x = it.pos.x; it.mesh.position.z = it.pos.z; if (it.type === 'silver' || it.type === 'gold') it.mesh.position.y = it.pos.y; }
      if (dist < it.radius && !Player.dead) { this.collect(it); continue; }
      const rel = -it.pos.z - Game.d;
      if (Game.mode !== 'allrange' && rel < -60) { it.alive = false; Gfx.scene.remove(it.mesh); }
    }
    this.list = this.list.filter(i => i.alive);
  },
  collect(it) {
    it.alive = false; Gfx.scene.remove(it.mesh);
    const P = Player;
    Input.rumble(0, 0.35, 90);
    switch (it.type) {
      case 'silver': P.shield = Math.min(P.maxShield, P.shield + 20); Audio_.play('ring'); Game.stats.rings++; HUD.toast('Silver Ring  +Shield'); break;
      case 'gold':
        P.shield = Math.min(P.maxShield, P.shield + 30); Audio_.play('goldRing'); Game.stats.rings++; P.goldRings++; P.goldTotal++;
        if (P.goldRings >= 3) {
          P.goldRings = 0;
          if (!P.extended) { P.extended = true; P.maxShield += 50; P.shield = P.maxShield; HUD.banner('SHIELD EXTENDED', 'Max shield increased', 2); }
          else { P.lives++; Audio_.play('oneUp'); HUD.banner('1 UP', 'Extra life', 2); }
        } else HUD.toast(`Gold Ring ${P.goldRings}/3`);
        break;
      case 'laser':
        Audio_.play('pickup');
        if (P.wings.L <= 0 || P.wings.R <= 0) { P.repairWings(); HUD.toast('Wings repaired'); }
        P.laser = Math.min(2, P.laser + 1); HUD.banner(P.laser === 2 ? 'HYPER LASER' : 'TWIN LASER', 'Laser upgraded', 1.8);
        if (P.laser === 1) Comms.say('tusk', 'Twin lasers! Now you\'re cookin\'.', 2.6, 'laserup');
        break;
      case 'bomb': P.bombs = Math.min(9, P.bombs + 1); Audio_.play('pickup'); HUD.toast(`Smart Bomb +1  (${P.bombs})`); Game.hint('bomb'); break;
      case 'wing': P.repairWings(); Audio_.play('pickup'); HUD.toast('Wings repaired'); break;
      case 'shield': P.shield = P.maxShield; Audio_.play('pickup'); HUD.toast('Shield fully restored'); break;
      case 'life': P.lives++; Audio_.play('oneUp'); HUD.banner('1 UP', '', 1.6); break;
    }
  },
  clear() { for (const it of this.list) Gfx.scene.remove(it.mesh); this.list.length = 0; },
};

// ---------- wingmen ----------
const WING_DEF = [
  { id: 'tusk', color: 0xa06a30, trim: 0xe0e0e0, off: [-24, 5, 20] },
  { id: 'wren', color: 0x20b8d0, trim: 0xffffff, off: [24, 8, 28] },
  { id: 'moss', color: 0x60b040, trim: 0xffd040, off: [-6, 15, 38] },
];
const Wingmen = {
  list: [],
  init() {
    this.list = WING_DEF.map(d => {
      const mesh = makeFighter(d.color, d.trim); mesh.scale.setScalar(0.95); Gfx.scene.add(mesh);
      const w = {
        id: d.id, mesh, off: d.off, hp: 100, active: true, state: 'formation', pos: V3(), vel: V3(), lx: d.off[0], ly: d.off[1], rel: d.off[2], t: rand(0, 10), fireT: rand(1, 3), ffT: 0, hurtT: 0,
        yaw: 0, pitch: 0, arDir: V3(0, 0, -1),
        friendlyFire() { if (Player.cheat || Game.state !== 'playing') return; this.hp -= 3; this.mesh.userData.flame.scale.z = 3; if (this.ffT <= 0) { this.ffT = 6; Comms.say(this.id, pick(FF_LINES[this.id]), 2.4); } if (this.hp <= 0) Wingmen.retire(this); },
        hurt(n) { if (Game.state !== 'playing' || Player.cheat) return; this.hp -= n; this.hurtT = 0.3; if (this.hp <= 0) Wingmen.retire(this); },
      };
      w.collider = Physics.addMover(3, { kind: 'friend', w }, Physics.G_FRIEND);
      return w;
    });
  },
  get(id) { return this.list.find(w => w.id === id); },
  reset(snapshot) {
    for (const w of this.list) {
      const s = snapshot && snapshot[w.id];
      w.hp = s ? s.hp : 100; w.active = w.hp > 0; w.state = w.active ? 'formation' : 'gone'; w.mesh.visible = w.active;
      w.lx = w.off[0]; w.ly = w.off[1]; w.rel = w.off[2]; w.pursuer = null; w.leaveT = 0;
    }
  },
  snapshot() { const s = {}; for (const w of this.list) s[w.id] = { hp: w.hp }; return s; },
  retire(w) {
    if (w.state === 'leaving' || w.state === 'gone') return;
    w.hp = 0; w.state = 'leaving'; w.leaveT = 0;
    if (w.pursuer && w.pursuer.alive) Enemies.kill(w.pursuer, false, true);
    Comms.say(w.id, RETIRE_LINES[w.id], 3.5, null, true);
    FX.explode(w.pos, 1, { debris: false });
  },
  // scripted rescue event: an enemy locks onto a wingman
  chase(id) {
    const w = this.get(id); if (!w || !w.active || w.state !== 'formation') return;
    w.state = 'chased'; w.chaseT = 0;
    if (Game.mode === 'allrange') {
      w.pursuer = spawnHunter(w.pos.clone().addScaledVector(w.arDir, -40), { chase: w, speed: 50, hpMul: 1, hits: 2 });
    } else {
      w.rel = 80;
      w.pursuer = Enemies.spawn('ace', {
        rel: 60, lx: w.lx, ly: w.ly, hits: 2, update(e, dt) {
          e.rel = damp(e.rel, w.rel - 20, 2, dt); e.lx = damp(e.lx, w.lx, 2.5, dt); e.ly = damp(e.ly, w.ly, 2.5, dt);
          Enemies.face(e, _v4.copy(w.pos).sub(e.pos), dt, 6);
          e.shotT = (e.shotT || 0) - dt; if (e.shotT <= 0) { e.shotT = 0.5; Projectiles.laser(e.pos.clone(), _v4.copy(w.pos).sub(e.pos).normalize(), 0, Game.speed, 'enemy'); }
        },
      });
    }
    w.pursuer.onDeath = (e, byPlayer) => { if (byPlayer && w.active && w.state === 'chased') { w.state = 'formation'; Comms.say(w.id, pick(THANKS_LINES[w.id]), 3); Game.addHits(2, e.pos, 'RESCUE BONUS'); Game.stats.rescues++; } };
    Comms.say(w.id, pick(HELP_LINES[w.id]), 3.2, null, true);
    Game.hint('rescue');
  },
  update(dt) {
    for (const w of this.list) {
      w.ffT -= dt; w.t += dt; w.hurtT -= dt;
      if (w.state === 'gone') { w.mesh.visible = false; w.active = false; continue; }
      const prev = _v4.copy(w.pos);
      if (w.state === 'leaving') {
        w.leaveT += dt; w.pos.y += dt * 40; w.pos.addScaledVector(Player.fwd, dt * 60);
        if (Math.random() < 0.6) FX.smokePuff(w.pos, 1.2);
        if (w.leaveT > 3) { w.state = 'gone'; w.active = false; w.mesh.visible = false; }
      } else if (Game.mode === 'allrange') {
        // orbit the arena and dogfight
        const tgt = w.state === 'chased' ? _v3.copy(w.pos).addScaledVector(w.arDir, 50).add(_v2.set(Math.sin(w.t * 1.7) * 30, Math.sin(w.t) * 10, Math.cos(w.t * 1.3) * 30)) : _v3.set(L.ARENA.x + Math.cos(w.t * 0.25 + w.off[0]) * 260, 60 + Math.sin(w.t * 0.5) * 30, L.ARENA.z + Math.sin(w.t * 0.25 + w.off[0]) * 260);
        _v2.copy(tgt).sub(w.pos).normalize(); w.arDir.lerp(_v2, clamp(dt * 1.2, 0, 1)).normalize();
        w.pos.addScaledVector(w.arDir, 56 * dt);
        w.pos.y = Math.max(w.pos.y, Math.max(terrainH(w.pos.x, w.pos.z), 0) + 12);
        this.shoot(w, dt);
      } else {
        if (w.state === 'chased') { w.rel = damp(w.rel, 85, 1, dt); w.lx = Math.sin(w.t * 1.3) * 36; w.ly = 8 + Math.sin(w.t * 2.1) * 10; }
        else {
          // sidestep out of the player's line of fire
          const inLine = Math.abs(Player.ox - w.lx) < 7 && Math.abs(Player.oy - w.ly) < 7;
          w.dodge = damp(w.dodge || 0, inLine ? 12 : 0, 3, dt);
          w.rel = damp(w.rel, w.off[2], 0.8, dt); w.lx = damp(w.lx, w.off[0] + Math.sin(w.t * 0.7) * 5, 1.2, dt); w.ly = damp(w.ly, w.off[1] + Math.sin(w.t * 0.9) * 3 + w.dodge, 1.2, dt);
        }
        Rail.point(Game.d + w.rel, w.lx, w.ly, Game.route, w.pos);
        this.shoot(w, dt);
      }
      if (w.state === 'chased') {
        w.chaseT += dt;
        if (w.chaseT > 14 && w.pursuer && w.pursuer.alive) { w.hp -= 30; Comms.say(w.id, pick(HURT_LINES[w.id]), 3); FX.explode(w.pos, 0.8, { debris: false }); Enemies.kill(w.pursuer, false, true); w.state = 'formation'; if (w.hp <= 0) this.retire(w); }
        else if (!w.pursuer || !w.pursuer.alive) w.state = w.hp > 0 ? 'formation' : w.state;
      }
      w.vel.copy(w.pos).sub(prev).divideScalar(Math.max(dt, 1e-3));
      w.mesh.position.copy(w.pos);
      if (w.vel.lengthSq() > 1) { _m1.lookAt(_v1.set(0, 0, 0), _v2.copy(w.vel).negate(), UP); _q1.setFromRotationMatrix(_m1); _q2.setFromAxisAngle(_v1.set(0, 0, 1), Math.sin(w.t * 1.4) * 0.3 + (w.state === 'chased' ? Math.sin(w.t * 3) * 0.9 : 0)); _q1.multiply(_q2); w.mesh.quaternion.slerp(_q1, clamp(dt * 6, 0, 1)); }
      w.mesh.visible = true;
      if (w.collider) w.collider.setTranslation({ x: w.pos.x, y: w.pos.y, z: w.pos.z });
      if (w.hp < 40 && Math.random() < dt * 8) FX.smokePuff(w.pos, 0.8);
    }
  },
  shoot(w, dt) {
    w.fireT -= dt; if (w.fireT > 0 || w.state === 'leaving') return;
    w.fireT = rand(1.4, 2.8);
    let best = null, bd = 260;
    for (const e of Enemies.list) { if (!e.alive || e.type === 'missile' || e.boss) continue; const dd = e.pos.distanceTo(w.pos); if (dd < bd && e !== w.pursuer) { bd = dd; best = e; } }
    if (best) Projectiles.laser(w.pos.clone(), _v1.copy(best.pos).sub(w.pos).normalize().clone(), 0, 50, 'wing');
  },
};
const HELP_LINES = { tusk: ['Got a bandit on my six! Shake him loose, Vale!', 'He\'s all over me — a little help here!'], wren: ['Hey! Get this creep off my tail!', 'Vale! Bandit behind me — HELP!'], moss: ['Uh-oh! Enemy behind me! Vale, please!', 'I can\'t shake him! Help!'] };
const THANKS_LINES = { tusk: ['Much obliged, kid.', 'Good shooting. I owe you one.'], wren: ['Hmph. I had him... but thanks.', 'Nice! Okay, you\'re alright.'], moss: ['Phew! Thanks, Vale!', 'You saved my bacon — er, my flippers!'] };
const HURT_LINES = { tusk: ['Argh! Took a hit — I\'m still flying.'], wren: ['Ow! That one stung!'], moss: ['Yow! My shields are fried!'] };
const RETIRE_LINES = { tusk: 'Systems critical... Tusk heading back to the carrier!', wren: 'I\'m going down — Wren pulling out!', moss: 'Too much damage! Moss returning to base!' };
const FF_LINES = { tusk: ['Easy with that trigger!', 'Wrong target, kid!'], wren: ['HEY! Watch your fire!', 'Shoot THEM, not me!'], moss: ['Ack! I\'m on your side!', 'Friendly fire! Friendly!'] };
