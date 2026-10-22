'use strict';
/* ===== Entity registry: enemy kinds, obstacles, pickups, bosses (all data-driven) =====
   def.init(e,o,g)   def.update(e,dt,g)   def.onDeath(e,g)   — add a kind here to add an enemy. */
const DIFF = [{ dmg: 0.65, fire: 0.7, spd: 0.85 }, { dmg: 1, fire: 1, spd: 1 }, { dmg: 1.4, fire: 1.35, spd: 1.15 }];
const _v = new THREE.Vector3();

const ENEMIES = {
  /* harmless training target */
  dummy: {
    hp: 1, r: 2.2, score: 0, lock: true, build: () => { const g = new THREE.Group(); part(g, G.ico, M(0x3ad0ff, { e: 0x1a90cc, ei: 1.2 }), 0, 0, 0, 1.6); part(g, G.tor, M(0xffffff, { e: 0xffffff }), 0, 0, 0, 2.4); glow(g, 0x44ccff, 6, 0, 0, 0, 0.6); return g; },
    init(e, o) { e.rel = true; e.dz = 150; e.cv = 18; e.hold = 60; e.hx = e.x; e.hy = e.y; },
    update(e, dt) { e.mesh.rotation.y += dt * 2; e.mesh.rotation.x += dt; if (e.t > 16) e.hold = 0; },
  },
  drone: {
    hp: 1, r: 2.0, score: 10, lock: true, build: buildDrone,
    init(e, o, g) { e.rel = true; e.dz = 240; e.cv = 38 * DIFF[Settings.difficulty].spd; e.amp = rand(6, 14); e.ph = o.ph || 0; e.fireT = rand(1.1, 2.2) / DIFF[Settings.difficulty].fire; e.pat = o.pat || 'weave'; e.shots = o.pat === 'tutorial' ? 3 : 2; e.hx = e.x; e.hy = e.y; e.hold = 0; },
    update(e, dt, g) {
      const w = Math.sin(e.t * 1.8 + e.ph);
      if (e.pat === 'tutorial') { e.x = e.hx; e.y = e.hy; }
      else { e.x = e.hx + w * e.amp * Math.min(1, e.t * 0.5); e.y = e.hy + Math.cos(e.t * 1.3 + e.ph) * 3; }
      e.mesh.rotation.z = -w * 0.6; e.mesh.rotation.y = 0;
      if (e.dz < 150 && e.dz > 22 && e.shots > 0) { e.fireT -= dt; if (e.fireT <= 0) { e.shots--; e.fireT = rand(1.2, 2) / DIFF[Settings.difficulty].fire; g.enemyShoot(e.mesh.position, 78 * DIFF[Settings.difficulty].spd, 1.0); } }
      if (e.dz < -40) e.cull = true;
    },
  },
  fighter: {
    hp: 3, r: 2.6, score: 25, lock: true, build: buildFighter,
    init(e, o, g) { e.rel = true; e.dz = 260; e.cv = 30 * DIFF[Settings.difficulty].spd; e.hold = 90; e.fireT = 1.5; e.hx = e.x; e.hy = e.y; e.ph = o.ph || 0; e.burst = 0; },
    update(e, dt, g) {
      const k = e.t;
      e.x = e.hx + Math.sin(k * 0.9 + e.ph) * 22; e.y = e.hy + Math.sin(k * 1.7 + e.ph) * 5;
      e.mesh.rotation.z = -Math.cos(k * 0.9 + e.ph) * 0.8;
      e.fireT -= dt;
      if (e.fireT <= 0 && e.dz < 170 && e.dz > 20) { e.burst = 3; e.fireT = 2.4 / DIFF[Settings.difficulty].fire; e.bt = 0; }
      if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.burst--; e.bt = 0.14; g.enemyShoot(e.mesh.position, 88 * DIFF[Settings.difficulty].spd, 0.9); } }
      if (e.t > 12 && e.hold > 0) e.hold = 0;
      if (e.dz < -40) e.cull = true;
    },
  },
  gunship: {
    hp: 14, r: 4.6, score: 100, lock: true, build: buildGunship,
    init(e, o, g) { e.rel = true; e.dz = 250; e.cv = 24; e.hold = 110; e.hx = e.x; e.hy = e.y; e.fireT = 2; e.part = 0; },
    update(e, dt, g) {
      e.x = e.hx + Math.sin(e.t * 0.6) * 18; e.y = e.hy + Math.sin(e.t * 0.9) * 4; e.mesh.rotation.z = -Math.cos(e.t * 0.6) * 0.25;
      e.fireT -= dt;
      if (e.fireT <= 0 && e.dz < 190) { e.fireT = 1.8 / DIFF[Settings.difficulty].fire; for (const s of [-1, 1]) { _v.copy(e.mesh.position); _v.x += 2.1 * s; _v.y -= 1.2; for (let i = -1; i <= 1; i++) g.enemyShoot(_v, 74 * DIFF[Settings.difficulty].spd, 0.6, i * 0.09); } }
      if (e.t > 22 && e.hold > 0) e.hold = 0;
      if (e.dz < -40) e.cull = true;
    },
    onDeath(e, g) { g.dropCrate(e.mesh.position, Math.random() < 0.5 ? 'bomb' : 'repair'); },
  },
  turret: {
    hp: 2, r: 2.6, score: 20, lock: true, build: buildTurret,
    init(e, o, g) { e.fireT = rand(0.5, 1.8); e.ground = true; e.mesh.position.y = canyonH(e.x, e.mesh.position.z) + 0.2; },
    update(e, dt, g) {
      const dz = e.mesh.position.z - g.pz;
      if (dz < 0 && dz > -170) {
        _v.set(g.P.ox, g.P.oy, g.pz).sub(e.mesh.position); const head = e.mesh.userData.head;
        head.rotation.y = Math.atan2(-_v.x, -_v.z);
        e.fireT -= dt; if (e.fireT <= 0) { e.fireT = 2.1 / DIFF[Settings.difficulty].fire; _v.copy(e.mesh.position); _v.y += 3; g.enemyShoot(_v, 62 * DIFF[Settings.difficulty].spd, 1.0); }
      }
    },
  },
  mine: {
    hp: 1, r: 2.4, score: 5, lock: true, build: buildMine, contact: 0,
    init(e) { e.spin = rand(0.5, 1.5); },
    update(e, dt, g) { e.mesh.rotation.x += dt * e.spin; e.mesh.rotation.y += dt; const dz = e.mesh.position.z - g.pz; if (dz > 30) e.cull = true;
      if (g.P.alive && dz < 0 && dz > -9 && _v.set(g.P.ox, g.P.oy, g.pz).distanceTo(e.mesh.position) < 8) { g.explodeMine(e); } },
    onDeath(e, g) { g.blast(e.mesh.position, 9, 12, true); },
  },
  asteroid: {
    hp: 6, r: 5, score: 15, lock: true, build: null,
    mk(o) { return buildAsteroid(o.r || 6, o.seed || 1); },
    init(e, o) { e.r = (o.r || 6) * 0.82; e.hp = e.maxhp = Math.ceil((o.r || 6) * 0.7); e.rot = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-0.5, 0.5)).multiplyScalar(0.6); e.size = o.r || 6; e.solidRock = true; },
    update(e, dt, g) { e.mesh.rotation.x += e.rot.x * dt; e.mesh.rotation.y += e.rot.y * dt; if (e.mesh.position.z - g.pz > 40) e.cull = true; },
    onDeath(e, g) { if (e.size > 7) for (let i = 0; i < 3; i++) { const c = g.spawnEnemy('asteroid', e.mesh.position.x + rand(-4, 4), e.mesh.position.y + rand(-3, 3), e.mesh.position.z + rand(-4, 4), { r: e.size * 0.45, seed: i + 3 }, true); if (c) { c.vel = new THREE.Vector3(rand(-14, 14), rand(-8, 8), rand(-10, 10)); } } },
  },
  chaser: {
    hp: 2, r: 2.4, score: 30, lock: true, build: buildChaser,
    init(e, o, g) { e.target = o.target; e.chase = true; e.fireT = 1; e.ph = rand(0, 6); },
    update(e, dt, g) {
      const w = e.target;
      if (!w || !w.alive) { e.mesh.position.z += 40 * dt; if (e.mesh.position.z - g.pz > 30) e.cull = true; return; }
      const tp = w.pos, p = e.mesh.position;
      p.x = damp(p.x, tp.x + Math.sin(e.t * 1.4 + e.ph) * 4, 4, dt); p.y = damp(p.y, tp.y + Math.cos(e.t * 1.1 + e.ph) * 2, 4, dt); p.z = damp(p.z, tp.z + 15, 5, dt);
      e.mesh.rotation.z = Math.sin(e.t * 1.4 + e.ph) * 0.5;
      w.hp -= dt * 4.5 * DIFF[Settings.difficulty].dmg * (w.hp > 0 ? 1 : 0); w.chased = true;
      e.fireT -= dt; if (e.fireT <= 0) { e.fireT = 0.35; g.visualShot(p, tp); }
    },
    onDeath(e, g) { if (e.target && e.target.alive) { g.comm(e.target.id, pick(['Thanks, Lark! That was close!', 'Phew! You\'re a lifesaver!', 'Nice shooting!']), 2.2); g.P.score += 200; g.addSquad(0.12); e.target.chased = false; } },
  },
  missile: {
    hp: 1, r: 1.8, score: 5, lock: true, build: buildMissile,
    init(e, o, g) { e.vel = o.vel || new THREE.Vector3(0, 0, 40); e.life = 8; },
    update(e, dt, g) {
      _v.set(g.P.ox, g.P.oy, g.pz).sub(e.mesh.position); const d = _v.length(); _v.normalize();
      e.vel.lerp(_v.multiplyScalar(58), Math.min(1, dt * 1.3)); e.mesh.position.addScaledVector(e.vel, dt); e.mesh.lookAt(_v.copy(e.mesh.position).add(e.vel));
      e.life -= dt; if (e.life <= 0) e.cull = true;
      if (g.P.alive && d < 3.6) { g.hurt(14, e.mesh.position); e.hp = 0; g.killEnemy(e, true); }
    },
    onDeath(e, g) { FX.explosion(e.mesh.position, 0.6); },
  },
  generator: { hp: 14, r: 3.4, score: 60, lock: true, build: buildGenerator, init() {}, update(e, dt) { e.mesh.rotation.z += dt; } },
  cruiserCore: {
    hp: 28, r: 5, score: 150, lock: true, build: () => buildBossCore(), init(e) { e.invuln = true; },
    update(e, dt) { e.mesh.rotation.y += dt * 1.5; e.mesh.rotation.x += dt; },
  },
  cruiser: {
    hp: 1, r: 1, score: 0, lock: false, build: buildCruiser,
    init(e, o, g) {
      e.rel = true; e.dz = 300; e.cv = 30; e.hold = 108; e.mesh.scale.setScalar(1.4); e.hx = e.x; e.hy = e.y; e.invuln = true; e.noCollide = true; e.fireT = 2; e.kids = [];
      const mk = (kind, dx, dy, dz2) => { const k = g.spawnEnemy(kind, 0, 0, 0, {}, true); k.parent = e; k.off = new THREE.Vector3(dx, dy, dz2); e.kids.push(k); return k; };
      e.gens = [mk('generator', -15, 4, 28), mk('generator', 15, 4, 28)]; e.core = mk('cruiserCore', 0, 11, 14);
      e.obsRef = g.addObstacle(e.mesh, [{ x: 0, y: 0, z: 0, hx: 11, hy: 5, hz: 49 }, { x: 0, y: 8, z: 14, hx: 6, hy: 5, hz: 14 }], true);
      g.cruiser = e; g.comm('quill', 'Generators are the weak point. Knock them out!', 3, true);
    },
    update(e, dt, g) {
      e.x = e.hx + Math.sin(e.t * 0.35) * 8; e.y = e.hy + Math.sin(e.t * 0.5) * 3; e.mesh.rotation.z = Math.sin(e.t * 0.35) * 0.1;
      const alive = e.gens.filter((k) => k.alive).length;
      if (alive === 0 && e.core.invuln) { e.core.invuln = false; g.comm('quill', 'Shields are down — hit the core!', 2.6, true); FX.ring(e.core.mesh.position, 40, 0.8, 0xffffff); }
      e.fireT -= dt;
      if (e.fireT <= 0 && e.dz < 190) { e.fireT = (alive ? 1.5 : 1) / DIFF[Settings.difficulty].fire; for (const s of [-1, 1]) { _v.copy(e.mesh.position); _v.x += 11 * s; _v.y += 4; _v.z -= 34; g.enemyShoot(_v, 70 * DIFF[Settings.difficulty].spd, 0.8); } }
      if (e.t > 50 && e.hold > 0 && e.core.alive) e.hold = 108;
    },
  },
};
const PICKUPS = {
  ring: { r: 5.2, build: () => buildRing(0xffcf3a), apply(g) { g.P.rings++; g.healPlayer(25); Audio.sfx('ring'); g.P.score += 50; if (g.P.rings % 3 === 0) { g.P.maxShield = Math.min(160, g.P.maxShield + 20); g.healPlayer(999); g.toast('SHIELD EXTENDED'); } } },
  crate_bomb: { r: 3.6, build: () => buildCrate('bomb'), apply(g) { g.P.bombs = Math.min(5, g.P.bombs + 1); g.toast('NOVA BOMB +1'); Audio.sfx('pickup'); g.P.score += 100; } },
  crate_laser: { r: 3.6, build: () => buildCrate('laser'), apply(g) { if (g.P.laser < 3) { g.P.laser++; g.toast(g.P.laser === 2 ? 'TWIN LASERS' : 'HYPER LASERS'); } else { g.toast('LASERS MAXED · +500'); g.P.score += 500; } Audio.sfx('pickup'); } },
  crate_repair: { r: 3.6, build: () => buildCrate('repair'), apply(g) { g.healPlayer(60); g.toast('REPAIR +60'); Audio.sfx('pickup'); for (const w of g.wingmen) if (w.alive) w.hp = Math.min(w.maxhp, w.hp + 30); } },
};
