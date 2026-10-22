// ===================================================================
//  ENEMIES / OBSTACLES / PICKUPS  -  data-driven definitions
//  Each def: { cat, hp, r, score, build(e), init(e,o), update(e,dt), die(e,o), shield?, orient? }
// ===================================================================
const _ta = new V3(), _tb = new V3();
function aimAt(obj, worldTarget) {
  obj.getWorldPosition(_ta);
  _tb.copy(_ta).multiplyScalar(2).sub(worldTarget);
  obj.lookAt(_tb);
}
function wreck(pos, n, hex, speed = 14, size = 0.5) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(GEO.box, tm(hex));
    m.scale.set(rnd(0.6, 1.4) * size * 1.6, rnd(0.3, 0.7) * size * 1.6, rnd(0.6, 1.4) * size * 1.6);
    m.castShadow = true;
    const v = new V3(rnd(-1, 1), rnd(0.1, 1), rnd(-1, 1)).normalize().multiplyScalar(speed * rnd(0.4, 1));
    Phys.addDebris(m, pos, v, new V3(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)), size, rnd(1.8, 3));
  }
}
function defaultDie(e, scale = 1, hex = 0xff9a30, wreckHex = 0x4a3a6a) {
  FX.explosion(e.pos, scale, hex);
  wreck(e.pos, 4 + Math.floor(scale * 2), wreckHex, 12 * scale, 0.45 * scale);
  Snd.play(scale > 1.4 ? 'bigExplosion' : 'explosion', { pan: Snd.panFor(e.pos) });
  shake(0.12 * scale);
}
function relGone(e) { e.alive = false; e.silent = true; }
function playerDist(e) { return e.pos.distanceTo(G.pl.pos); }

// ---- drone: basic fighter that flies at the player in sine-weave
ENEMIES.drone = {
  hp: 2, r: 1.5, score: 100, orient: true,
  build: () => buildDrone(),
  init(e, o) {
    e.v = o.v || 62; e.x0 = e.rel.x; e.y0 = e.rel.y; e.amp = o.amp === undefined ? 9 : o.amp; e.freq = o.freq || 1.3; e.ph = o.ph === undefined ? rnd(0, 6) : o.ph;
    e.move = o.move || 'sine'; e.shotT = o.shot === undefined ? rnd(0.8, 2.2) : o.shot; e.vx = o.vx || 0;
  },
  update(e, dt) {
    e.t += dt;
    e.rel.z += e.v * dt;
    if (e.move === 'sine') { e.rel.x = e.x0 + Math.sin(e.t * e.freq + e.ph) * e.amp; e.rel.y = e.y0 + Math.cos(e.t * e.freq * 0.8 + e.ph) * e.amp * 0.45; }
    else if (e.move === 'strafe') { e.rel.x = e.x0 + e.vx * e.t; e.rel.y = e.y0 + Math.sin(e.t * 2 + e.ph) * 2; }
    else if (e.move === 'loop') { const a = e.t * 2.4 + e.ph; e.rel.x = e.x0 + Math.cos(a) * e.amp; e.rel.y = e.y0 + Math.sin(a) * e.amp * 0.8; }
    e.shotT -= dt;
    if (e.shotT <= 0 && e.rel.z < -55 && e.rel.z > -280) { enemyShotAtPlayer(e.pos, { speed: 78, spread: 2.5 }); e.shotT = rnd(1.5, 3); }
    if (e.rel.z > 28) relGone(e);
  },
  die: (e) => defaultDie(e, 1, 0xff6a40, 0x6a3fa0),
};
// ---- swooper: fast crossing pass
ENEMIES.swooper = {
  hp: 2, r: 1.7, score: 120, orient: true,
  build: () => buildSwooper(),
  init(e, o) { e.x0 = e.rel.x; e.y0 = e.rel.y; e.z0 = e.rel.z; e.x1 = o.x1 === undefined ? -e.x0 : o.x1; e.z1 = o.z1 === undefined ? 20 : o.z1; e.T = o.T || 4.2; e.dy = o.dy === undefined ? 6 : o.dy; e.fired = false; },
  update(e, dt) {
    e.t += dt;
    const u = e.t / e.T;
    e.rel.x = lerp(e.x0, e.x1, smooth(u));
    e.rel.y = e.y0 + Math.sin(u * Math.PI) * e.dy;
    e.rel.z = lerp(e.z0, e.z1, u);
    if (!e.fired && u > 0.45) { e.fired = true; enemyShotAtPlayer(e.pos, { speed: 85 }); }
    if (u >= 1) relGone(e);
  },
  die: (e) => defaultDie(e, 1, 0xffa040, 0xe86a28),
};
// ---- mine: drifts, homes when the player gets close, detonates in a blast
ENEMIES.mine = {
  hp: 1, r: 1.9, score: 80,
  build: () => buildMine(),
  init(e) { e.noRam = true; },
  update(e, dt) {
    e.t += dt;
    e.mesh.rotation.y += dt * 0.8; e.mesh.rotation.x += dt * 0.5;
    e.mesh.userData.light.scale.setScalar(0.45 + 0.2 * Math.abs(Math.sin(e.t * 5)));
    if (e.mode === 'rel') { e.rel.z += G.rail.speed * dt * (e.drift === undefined ? 1 : e.drift); if (e.rel.z > 30) { relGone(e); return; } }
    const pl = G.pl;
    if (!pl.dead) {
      const d = playerDist(e);
      if (d < 55 && (G.def.mode === 'ar' || e.pos.z < pl.pos.z + 10)) {
        _v1.copy(pl.pos).sub(e.pos).normalize();
        if (e.mode === 'rel') { e.rel.addScaledVector(_v1, 10 * dt); } else e.pos.addScaledVector(_v1, 11 * dt);
      }
    }
  },
  onTouch(e) { kill(e); },
  die(e) {
    FX.explosion(e.pos, 1.3, 0xff5030);
    Snd.play('explosion', { pan: Snd.panFor(e.pos) });
    wreck(e.pos, 3, 0x555570, 14, 0.4);
    const pl = G.pl;
    if (!pl.dead && playerDist(e) < 9) hurt(18, e.pos, 'crash');
    shake(0.3);
  },
};
// ---- turret: ground emplacement
ENEMIES.turret = {
  hp: 3, r: 2, score: 150, static: true,
  build: () => buildTurret(),
  init(e) { e.shotT = rnd(0.5, 2); e.burst = 0; },
  update(e, dt) {
    const pl = G.pl;
    if (pl.dead) return;
    const d = playerDist(e);
    aimAt(e.mesh.userData.head, pl.pos);
    e.shotT -= dt;
    if (e.shotT <= 0 && d < 340 && d > 50 && e.pos.z < pl.pos.z - 20) {
      const o = e.mesh.userData.head.localToWorld(_v1.set(0, 0.1, -2.6));
      enemyShotAtPlayer(o.clone(), { speed: 80, spread: 2 });
      e.burst++;
      e.shotT = e.burst % 2 ? 0.28 : rnd(1.5, 2.4);
    }
  },
  die: (e) => defaultDie(e, 1.1, 0xff7a30, 0x59506a),
};
// ---- gunship: mid-boss
ENEMIES.gunship = {
  hp: 46, r: 5, score: 800, orient: false, isMid: true,
  build: () => buildGunship(),
  init(e, o) { e.phase = 0; e.fireT = 2; e.spawnT = 6; e.fan = 0; e.armor = false; e.leaveT = o.leaveT || 52; Radio.say('kestrel', 'Heavy gunship dead ahead! Take out those engines!'); },
  onHit(e) { },
  update(e, dt) {
    e.t += dt;
    const enter = clamp(e.t / 3, 0, 1);
    const rage = e.hp < e.maxHp * 0.5 ? 1.5 : 1;
    if (e.t < e.leaveT) {
      e.rel.x = Math.sin(e.t * 0.55 * rage) * 24;
      e.rel.y = 4 + Math.sin(e.t * 0.9) * 6;
      e.rel.z = lerp(-320, -125, easeOut(enter)) + Math.sin(e.t * 0.35) * 18;
    } else { e.rel.z += 70 * dt; e.rel.y += 10 * dt; if (e.rel.z > 40) relGone(e); }
    e.mesh.rotation.z = Math.cos(e.t * 0.55 * rage) * -0.25;
    e.mesh.rotation.y = Math.sin(e.t * 0.5) * 0.1;
    e.fireT -= dt;
    if (e.fireT <= 0 && enter >= 1 && e.t < e.leaveT) {
      e.fan++;
      const n = e.fan % 3 === 0 ? 7 : 4;
      for (let i = 0; i < n; i++) {
        const d = _v1.copy(G.pl.pos).sub(e.pos).normalize();
        d.x += (i - (n - 1) / 2) * 0.07; d.y += rnd(-0.02, 0.02);
        fireEB(e.pos.clone().add(_v2.set((i % 2 ? 1 : -1) * 4.5, -0.5, -2)), d, { speed: 66, color: 0xff7a30 });
      }
      e.fireT = 2.1 / rage;
    }
    e.spawnT -= dt;
    if (e.spawnT <= 0 && enter >= 1 && e.t < e.leaveT - 5) {
      e.spawnT = 8;
      for (let i = 0; i < 2; i++) spawn('drone', e.pos.clone(), { mode: 'rel', v: 45, amp: 14, ph: i * 3, shot: 1 });
    }
  },
  die(e) {
    FX.explosion(e.pos, 3, 0xff8a30); FX.flash(e.pos, 30, 0xffffff, 0.6);
    wreck(e.pos, 14, 0x5a4a7a, 26, 0.9);
    Snd.play('bigExplosion', { pan: Snd.panFor(e.pos) }); shake(0.9);
    Radio.say('bolt', 'Gunship down! Nice work, Fob!');
    G.flags.midDown = (G.flags.midDown || 0) + 1;
  },
};
// ---- chaser: tails a wingman
ENEMIES.chaser = {
  hp: 3, r: 1.6, score: 200, orient: true, noRam: false,
  build: () => buildDrone(),
  init(e) { e.mode = 'world'; e.shotT = 0.2; },
  update(e, dt) {
    e.t += dt;
    const w = e.wing;
    if (!w || w.state !== 'ok') {
      // lost its prey: peel away and get shot or leave
      e.pos.z += 30 * dt; e.pos.x += Math.sin(e.t) * 20 * dt; e.pos.y += 6 * dt;
      if (e.pos.z > G.pl.pos.z + 60 && G.def.mode === 'rail') relGone(e);
      return;
    }
    const wob = _v1.set(Math.sin(e.t * 2.1) * 2.5, Math.cos(e.t * 1.7) * 1.8 + 0.5, 14 + Math.sin(e.t * 0.9) * 2);
    if (G.def.mode === 'ar') wob.set(0, 0, 0).addScaledVector(w.fwd, -15).add(_v2.set(Math.sin(e.t * 2.1) * 3, Math.cos(e.t * 1.7) * 2, 0));
    const goal = _v3.copy(w.pos).add(wob);
    e.pos.lerp(goal, 1 - Math.exp(-4 * dt));
    e.shotT -= dt;
    if (e.shotT <= 0) {
      e.shotT = 0.3;
      const d = _v1.copy(w.pos).sub(e.pos).normalize();
      FX.spark(e.pos, _v2.copy(d).multiplyScalar(110), 0xff4a8a, 0.25, 0.7, 0, 0);
      if (Math.random() < 0.3) Snd.play('enemyShot', { vol: 0.25, pan: Snd.panFor(e.pos) });
    }
  },
  die(e) {
    defaultDie(e, 1.1, 0xff6a40, 0x6a3fa0);
    const w = e.wing;
    if (w && w.state === 'ok' && !e.lost) { w.chaser = null; rescueWingman(w); }
  },
};
// ---- tower / building
ENEMIES.tower = {
  cat: 'obst', hp: 4, r: 3, score: 200, static: true,
  build(e) {
    const h = e.h || 14, w = e.w || 5;
    const wrap = new THREE.Group(), t = buildTower(h, w, e.hex || 0x8a7aa8);
    t.position.y = -h / 2; wrap.add(t); wrap.userData.mats = t.userData.mats;
    return wrap;
  },
  shape: (e) => ({ box: [(e.w || 5) / 2 * 1.1, (e.h || 14) / 2 + 1, (e.w || 5) / 2 * 1.1] }),
  die(e) { defaultDie(e, 1.5, 0xffa040, 0x8a7aa8); wreck(e.pos, 6, 0x4a3a68, 16, 0.8); },
};
// ---- pillar / slab: indestructible rock
ENEMIES.pillar = {
  cat: 'obst', hp: 9999, r: 3, static: true,
  build(e) {
    const g = new THREE.Group();
    g.add(mk(GEO.box, tm(e.hex || 0xb8573a), { s: [e.w || 6, e.h || 40, e.d || 6], out: 0.09 }));
    if (e.cap !== false) g.add(mk(GEO.box, tm(e.hex2 || 0xd9794a), { p: [0, (e.h || 40) / 2 + 0.5, 0], s: [(e.w || 6) * 1.12, 1.2, (e.d || 6) * 1.12], out: 0.07 }));
    return g;
  },
  shape: (e) => ({ box: [(e.w || 6) / 2, (e.h || 40) / 2, (e.d || 6) / 2] }),
};
// ---- asteroid
ENEMIES.asteroid = {
  cat: 'obst', hp: 3, r: 3, score: 60, static: true,
  build(e) {
    const g = buildAsteroid(e.r, e.hex || 0x7a6a8a, e.seed || 1);
    g.userData.spin = new V3(rnd(-0.4, 0.4), rnd(-0.4, 0.4), rnd(-0.2, 0.2));
    return g;
  },
  shape: (e) => ({ ball: e.r * 0.9 }),
  init(e) { if (e.r > 4.5) { e.hp = 9999; e.score = 0; e.countHit = false; } else { e.hp = Math.max(1, Math.round(e.r * 0.8)); } },
  update(e, dt) { const s = e.mesh.userData.spin; e.mesh.rotation.x += s.x * dt; e.mesh.rotation.y += s.y * dt; e.mesh.rotation.z += s.z * dt; },
  die(e) { FX.explosion(e.pos, Math.min(1.8, e.r * 0.35), 0xc0a0ff); wreck(e.pos, 5, e.hex || 0x7a6a8a, 14, e.r * 0.2); Snd.play('explosion', { pan: Snd.panFor(e.pos), vol: 0.7 }); },
};
// ---- energy gate (ring of hazard bars; fly through the middle)
ENEMIES.gateBar = {
  cat: 'obst', hp: 9999, r: 2, static: true,
  build(e) {
    if (!e.visual) return null;
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(e.gr, 0.9, 8, 40), glowMat(e.color || 0x40ffe0, 0.95, false, 1.8)); g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(e.gr, 2.0, 8, 40), glowMat(e.color || 0x40ffe0, 0.25, true, 1.3)); g.add(ring2);
    g.userData.spin = ring2;
    return g;
  },
  shape: (e) => ({ box: e.box }),
  update(e, dt) { if (e.mesh) e.mesh.userData.spin.scale.setScalar(1 + Math.sin(G.t * 4) * 0.06); },
};
// ---- pickups and rings
ENEMIES.pickup = {
  cat: 'pickup', hp: 1, r: 2.6,
  build(e) { return e.type === 'silver' || e.type === 'gold' ? buildRing(e.type) : buildPickup(e.type); },
  init(e) { e.r = e.type === 'gold' ? 4.4 : e.type === 'silver' ? 3.4 : 2.8; if (e.collider) { try { e.collider.setRadius(e.r); } catch (er) { /* ignore */ } } e.baseY = e.pos.y; },
  update(e, dt) {
    e.t += dt;
    const sp = e.mesh.userData.spin;
    if (sp) { if (e.type === 'silver' || e.type === 'gold') sp[0].rotation.z += dt * 2; else { sp[0].rotation.x += dt * 1.5; sp[1].rotation.y += dt * 2.5; } }
    if (e.type !== 'silver' && e.type !== 'gold') e.mesh.position.y = e.pos.y + Math.sin(e.t * 3) * 0.4;
    // gentle magnet in rail mode (UX: forgiving pickups)
    const pl = G.pl;
    if (!pl.dead) {
      const d = playerDist(e);
      if (d < 16 && e.type !== 'gold' && e.type !== 'silver') { _v1.copy(pl.pos).sub(e.pos).normalize(); e.pos.addScaledVector(_v1, 22 * dt * (1 - d / 16 + 0.3)); }
    }
  },
};
// ---- all-range fighter
ENEMIES.bandit = {
  hp: 3, r: 1.7, score: 120, orient: false,
  build: () => buildDrone(),
  init(e, o) {
    e.fw = o.fw ? o.fw.clone() : new V3(rnd(-1, 1), rnd(-0.2, 0.2), rnd(-1, 1)).normalize();
    e.speed = o.speed || rnd(55, 66); e.state = 'attack'; e.stT = 0; e.shotT = rnd(0.5, 2); e.turn = o.turn || rnd(1.5, 2.1);
    e.breakDir = new V3(); e.onTail = false; e.burst = 0;
  },
  update(e, dt) {
    e.t += dt;
    const pl = G.pl;
    const tgt = e.wing && e.wing.state === 'ok' ? e.wing : pl;
    const toT = _v1.copy(tgt.pos).sub(e.pos);
    const dist = toT.length();
    const desired = _v2;
    if (e.state === 'attack') {
      desired.copy(toT).addScaledVector(tgt.vel, 0.35).normalize();
      if (dist < 30 + rnd(0, 5)) {
        e.state = 'break'; e.stT = rnd(1.4, 2.6);
        e.breakDir.set(rnd(-1, 1), rnd(-0.6, 0.8), rnd(-1, 1)).normalize();
        if (e.breakDir.dot(e.fw) < 0.1) e.breakDir.addScaledVector(e.fw, 1).normalize();
      }
    } else {
      desired.copy(e.breakDir);
      e.stT -= dt;
      if (e.stT <= 0) e.state = 'attack';
    }
    // arena containment
    const horiz = Math.hypot(e.pos.x, e.pos.z), arena = (G.def.arena || 420) - 30;
    if (horiz > arena || Math.abs(e.pos.y) > 150) desired.set(-e.pos.x, -e.pos.y * 0.8, -e.pos.z).normalize();
    // keep fighters off the dreadnought hull
    if (G.boss && G.boss.avoid) { const a = G.boss.avoid(e.pos); if (a) desired.add(a).normalize(); }
    e.fw.lerp(desired, clamp(e.turn * dt, 0, 1)).normalize();
    const sp = e.speed * (e.state === 'break' ? 1.15 : 1);
    e.pos.addScaledVector(e.fw, sp * dt);
    e.vel.copy(e.fw).multiplyScalar(sp);
    e.mesh.position.copy(e.pos);
    _v3.copy(e.pos).sub(e.fw);
    e.mesh.lookAt(_v3);
    e.mesh.rotateZ(Math.sin(e.t * 1.7) * 0.4);
    // tail detection vs player
    if (tgt === pl) {
      e.onTail = dist < 95 && _v3.copy(e.pos).sub(pl.pos).normalize().dot(pl.aim) < -0.5;
    } else e.onTail = false;
    e.shotT -= dt;
    if (e.shotT <= 0 && !pl.dead && tgt === pl && dist < 170 && e.fw.dot(toT.normalize()) > 0.95 && e.state === 'attack') {
      enemyShotAtPlayer(e.pos, { speed: 85, spread: 2, lead: 0.8 });
      e.burst++;
      e.shotT = e.burst % 3 ? 0.18 : rnd(1.6, 2.8);
    }
  },
  die: (e) => defaultDie(e, 1, 0xff6a40, 0x6a3fa0),
};
