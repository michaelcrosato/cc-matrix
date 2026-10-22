// ===== 06_entities: entity base, shots, enemy AI, bosses, scenery =====
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _a = V3(), _b = V3(), _c = V3();

class Ent {
  constructor(kind, group, o = {}) {
    this.kind = kind; this.group = group; this.alive = true;
    this.hp = o.hp ?? 1; this.maxHp = this.hp; this.r = o.r ?? 1.5; this.score = o.score ?? 0;
    this.cat = o.cat ?? CAT.ENEMY; this.targetable = o.targetable ?? true; this.contact = o.contact ?? 15;
    this.act = o.act ?? 240; this.squad = o.squad || null; this.drop = o.drop || null;
    this.t = 0; this.st = 'idle'; this.vel = V3(); this.pulse = 0; this.invuln = false; this.big = o.big || 0;
    this.params = o.params || {}; this.anchor = o.anchor || null; this.parent = o.parent || null;
    this.keep = !!o.keep; this.ph = Math.random() * 6; this.fireT = rr(0.6, 1.6); this.name = o.name || kind;
    this.colors = o.colors || [0x7a5a98, 0xe2562f, 0xffc040]; this.p = group.position; this.noCount = !!o.noCount;
  }
  wpos(out = _c) {
    if (this.anchor) { this.anchor.updateWorldMatrix(true, false); return this.anchor.getWorldPosition(out); }
    return out.copy(this.group.position);
  }
  damage(n, src) {
    if (!this.alive) return false;
    const p = this.wpos(V3());
    if (this.invuln) { Fx.burst(p, 3, { speed: 8, life: 0.25, size: 0.2, color: 0xaab8ff }); Sfx.deflect(); return false; }
    this.hp -= n; this.pulse = 0.12;
    Fx.burst(p, 4, { speed: 9, life: 0.3, size: 0.22, color: [0xffffff, 0xffe080] });
    Sfx.hit();
    if (src && (src.from === 'p')) Game.registerHit();
    if (this.hp <= 0) this.die(src);
    return true;
  }
  die(src) {
    if (!this.alive) return;
    this.alive = false;
    const p = this.wpos(V3());
    Fx.explosion(p, this.big || Math.max(0.7, this.r * 0.55));
    Sfx.explosion(this.big ? 1.6 : Math.min(1.4, this.r * 0.5));
    if (this.kind === 'asteroid') Phys.spawnDebris(p, 6, { size: this.r * 0.12, speed: 14, color: 0x8a7d78, colors: [0x8a7d78, 0x6a5a58, 0x7fe8ff] });
    else Phys.spawnDebris(p, this.big ? 10 : 4, { size: 0.35, speed: 16, colors: this.colors, trail: 1, vz: this.big ? 0 : 10 });
    Game.onKill(this, src);
    Game.removeEnt(this, true);
  }
}

// ---------- Shots ----------
const Shots = {
  list: [],
  clear() { for (const s of this.list) s.mesh.parent && s.mesh.parent.remove(s.mesh); this.list.length = 0; },
  add(s) { Game.root.add(s.mesh); this.list.push(s); return s; },
  player(pos, vel, dmg, lv) {
    const col = lv >= 3 ? 0xff9ad8 : lv === 2 ? 0x9affc8 : 0x7fe8ff;
    const m = new THREE.Mesh(box(0.16, 0.16, 3.6), glowC(col)); m.position.copy(pos);
    m.lookAt(pos.x + vel.x, pos.y + vel.y, pos.z + vel.z);
    const s = this.add({ mesh: m, pos: m.position, vel: vel.clone(), life: 1.25, dmg, from: 'p', r: 1.3, tgt: null, assist: true, splash: 0 });
    // aim-assist target pick: nearest targetable close to the beam line
    const as = S().aimAssist;
    if (as > 0) {
      let best = null, bd = 1e9; const sp = s.pos;
      for (const e of Game.ents) {
        if (!e.alive || !e.targetable || e.invuln) continue;
        const ep = e.wpos(_c); const dz = sp.z - ep.z;
        if (dz < 10 || dz > 320) continue;
        const lat = Math.hypot(ep.x - sp.x, ep.y - sp.y);
        const lim = (2.5 + dz * 0.05) * as + e.r * 0.6;
        if (lat < lim && lat < bd) { bd = lat; best = e; }
      }
      s.tgt = best;
    }
    return s;
  },
  homing(pos, tgt, dmg) {
    const m = new THREE.Group();
    m.add(new THREE.Mesh(sph(0.5, 8, 6), glowC(0xffe060)));
    const tail = new THREE.Mesh(coneBack(0.35, 2.2, 6), glowC(0xff8030)); tail.position.z = 1.4; m.add(tail);
    m.position.copy(pos);
    const v = V3(rr(-1, 1) * 30, rr(0.2, 1) * 30, -50);
    return this.add({ mesh: m, pos: m.position, vel: v, life: 3.2, dmg, from: 'p', r: 1.8, tgt, homing: true, splash: 7, speed: 135, turn: 6, age: 0 });
  },
  enemy(pos, vel, dmg, o = {}) {
    const col = o.color ?? 0xff4aa8;
    const m = new THREE.Group();
    m.add(new THREE.Mesh(sph(o.size ?? 0.5, 8, 6), glowC(col)));
    m.add(new THREE.Mesh(sph((o.size ?? 0.5) * 1.7, 8, 6), new THREE.MeshBasicNodeMaterial({ color: col, transparent: true, opacity: 0.28, fog: false, depthWrite: false })));
    m.position.copy(pos);
    return this.add({ mesh: m, pos: m.position, vel: vel.clone(), life: o.life ?? 6, dmg, from: 'e', r: o.size ?? 0.5, harmless: !!o.harmless });
  },
  update(dt) {
    const P = Game.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i]; let dead = false;
      s.life -= dt; if (s.life <= 0) dead = true;
      if (!dead && s.from === 'p') dead = this.updatePlayerShot(s, dt);
      else if (!dead) dead = this.updateEnemyShot(s, dt, P);
      if (dead) { s.mesh.parent && s.mesh.parent.remove(s.mesh); this.list.splice(i, 1); }
    }
  },
  updatePlayerShot(s, dt) {
    const prev = _b.copy(s.pos);
    if (s.homing) {
      s.age += dt;
      if (!s.tgt || !s.tgt.alive) {
        let best = null, bd = 1e9;
        for (const e of Game.ents) { if (!e.alive || !e.targetable) continue; const d = e.wpos(_a).distanceToSquared(s.pos); if (d < bd && e.wpos(_a).z < s.pos.z + 5) { bd = d; best = e; } }
        s.tgt = best;
      }
      if (s.tgt) {
        const tp = s.tgt.wpos(_a); const want = _c.copy(tp).sub(s.pos).normalize().multiplyScalar(s.speed);
        s.vel.lerp(want, 1 - Math.exp(-s.turn * dt));
      } else s.vel.z = damp(s.vel.z, -s.speed, 2, dt);
      s.vel.setLength(Math.min(s.speed, s.vel.length() + 160 * dt));
      s.mesh.quaternion.setFromUnitVectors(_a.set(0, 0, -1), _c.copy(s.vel).normalize());
      if (Math.random() < 0.8) Fx.emit(s.pos, V3(), 0.35, 0.35, 0xffa040, 0, 2);
    } else if (s.tgt && s.tgt.alive && s.assist) {
      const tp = s.tgt.wpos(_a); const sp = s.vel.length();
      const want = _c.copy(tp).sub(s.pos).normalize().multiplyScalar(sp);
      s.vel.lerp(want, 1 - Math.exp(-2.4 * S().aimAssist * dt));
      s.mesh.lookAt(s.pos.x + s.vel.x, s.pos.y + s.vel.y, s.pos.z + s.vel.z);
    }
    s.pos.addScaledVector(s.vel, dt);
    // swept test: midpoint + endpoint
    for (const k of [0.5, 1]) {
      _a.copy(prev).lerp(s.pos, k);
      const hit = Phys.first(_a, s.r, CAT.ENEMY | CAT.OBST);
      if (hit) {
        if (hit.cat === CAT.OBST) { Fx.burst(_a, 5, { speed: 10, life: 0.3, size: 0.25, color: [0xffd090, 0xffffff] }); return true; }
        if (s.splash) this.splash(_a, s.splash, s.dmg * 0.6, hit);
        const prevLevel = Game.player.laserLv;
        hit.damage(s.dmg, s);
        if (s.splash) { Fx.explosion(_a.clone(), 0.5, { shake: 0.2 }); Sfx.explosion(0.4); }
        return true;
      }
    }
    return false;
  },
  splash(p, r, dmg, except) {
    Phys.overlap(p, r, CAT.ENEMY, (e) => { if (e !== except && e.alive) e.damage(dmg, { from: 'p' }); return true; });
  },
  updateEnemyShot(s, dt, P) {
    s.pos.addScaledVector(s.vel, dt);
    s.mesh.scale.setScalar(1 + Math.sin(performance.now() * 0.02 + s.life * 9) * 0.15);
    if (s.harmless) return s.life < 0.2;
    if (s.pos.z > P.pos.z + 60) return true;
    const d = s.pos.distanceTo(P.pos);
    if (P.rolling > 0 && d < 5.6 && P.state === 'alive') {
      // barrel roll reflect
      Sfx.deflect(); Fx.burst(s.pos, 6, { speed: 12, life: 0.3, size: 0.25, color: [0x9affff, 0xffffff] });
      let best = null, bd = 1e9;
      for (const e of Game.ents) { if (!e.alive || !e.targetable) continue; const ep = e.wpos(_a); if (ep.z > P.pos.z - 10) continue; const dd = ep.distanceToSquared(s.pos); if (dd < bd) { bd = dd; best = e; } }
      s.from = 'p'; s.dmg = 3; s.r = 1.6; s.life = 2.5; s.assist = false; s.tgt = best;
      s.vel.set(rr(-8, 8), rr(-4, 8), -160);
      if (best) s.vel.copy(best.wpos(_a).sub(s.pos).normalize().multiplyScalar(160));
      s.mesh.children[0].material = glowC(0x9affff);
      Game.stats.deflected++; Game.onDeflect();
      return false;
    }
    if (d < 2.0 && P.state === 'alive') { P.hurt(s.dmg, 'shot'); Fx.burst(s.pos, 6, { speed: 10, life: 0.3, size: 0.3, color: 0xff6aa0 }); return true; }
    return false;
  },
};

function aimedDir(from, speed, spread = 0.02, leadK = 1) {
  const P = Game.player;
  const d = from.distanceTo(P.pos); const t = d / Math.max(10, speed + 30);
  _a.copy(P.pos).addScaledVector(P.vel, t * leadK);
  const dir = _a.sub(from).normalize();
  dir.x += rr(-spread, spread); dir.y += rr(-spread, spread); dir.z += rr(-spread, spread);
  return dir.normalize();
}
function enemyFire(from, speed = 62, dmg = 10, o = {}) {
  const dir = aimedDir(from, speed, o.spread ?? 0.03, o.lead ?? 1);
  Shots.enemy(from, dir.multiplyScalar(speed), dmg * Game.eDmg(), o);
  Fx.burst(from, 2, { speed: 4, life: 0.15, size: 0.3, color: o.color ?? 0xff90c0 });
  if (!o.quiet) Sfx.eLaser();
}

// ---------- Enemy AI ----------
const AI = {};
const faceFlip = (g) => { g.rotation.y = Math.PI; };

AI.flyer = (e, dt) => {
  const P = Game.player, o = e.params, pos = e.p, g = e.group;
  e.t += dt;
  const dz = pos.z - P.pos.z; // negative while ahead
  const ahead = -dz;
  const U = g.userData;
  if (U.flames) for (const f of U.flames) f.scale.set(1, 1, 0.8 + Math.random() * 0.5);
  if (e.st === 'idle') {
    pos.y += Math.sin(e.t * 2 + e.ph) * 0.02;
    if (ahead < e.act) { e.st = 'attack'; e.t = 0; e.x0 = pos.x; e.y0 = pos.y; }
    return;
  }
  if (e.st === 'attack') {
    const spd = o.speed ?? 38;
    e.vel.z = damp(e.vel.z, spd, 2, dt);
    const near = sstep(220, 20, ahead);
    let tx = pos.x, ty = pos.y;
    switch (o.pattern) {
      case 'dive': tx = lerp(e.x0, P.pos.x, near); ty = lerp(e.y0, P.pos.y, near * 0.9); break;
      case 'strafe': tx = e.x0 + (o.dir ?? 1) * e.t * (o.sx ?? 16); ty = e.y0 + Math.sin(e.t * 1.2 + e.ph) * 3; break;
      default: e.x0 = lerp(e.x0, P.pos.x, 0.35 * dt); tx = e.x0 + Math.sin(e.t * (o.freq ?? 1.5) + e.ph) * (o.amp ?? 9); ty = e.y0 + Math.cos(e.t * (o.freq ?? 1.5) * 0.8 + e.ph) * (o.amp ?? 9) * 0.45;
    }
    const px = pos.x, py = pos.y;
    pos.x = damp(pos.x, tx, 2.6, dt); pos.y = damp(pos.y, ty, 2.6, dt); pos.z += e.vel.z * dt;
    const bx = (pos.x - px) / Math.max(dt, 1e-3), by = (pos.y - py) / Math.max(dt, 1e-3);
    g.rotation.set(clamp(-by * 0.025, -0.5, 0.5), Math.PI + clamp(bx * 0.02, -0.5, 0.5), clamp(-bx * 0.06, -1.2, 1.2) + (o.spin ? e.t * 6 : 0));
    // fire
    e.fireT -= dt;
    if (e.fireT <= 0 && ahead > 40 && ahead < 280 && !o.silent) {
      enemyFire(pos, o.shotSpeed ?? 62, o.dmg ?? 9);
      if ((e.burstLeft = (e.burstLeft ?? (o.burst ?? 1)) - 1) > 0) e.fireT = 0.13; else { e.fireT = (o.fireRate ?? 1.8) * rr(0.8, 1.25); e.burstLeft = undefined; }
    }
    if (pos.z > P.pos.z - 3) { e.st = o.tail ? 'tail' : 'pass'; e.t = 0; if (o.tail) { Game.warnTail(e); } }
    return;
  }
  if (e.st === 'pass') {
    pos.z += (e.vel.z + 20) * dt; pos.x += Math.sign(pos.x - P.pos.x || 1) * 14 * dt; pos.y += 4 * dt;
    g.rotation.z += dt * 2;
    if (pos.z > P.pos.z + 80) Game.removeEnt(e, false);
    return;
  }
  if (e.st === 'tail') {
    pos.z = damp(pos.z, P.pos.z + 24 + Math.sin(e.t * 1.3) * 4, 3, dt);
    pos.x = damp(pos.x, P.pos.x + Math.sin(e.t * 1.1 + e.ph) * 6, 2.2, dt);
    pos.y = damp(pos.y, P.pos.y + 2 + Math.cos(e.t * 0.9 + e.ph) * 3, 2.2, dt);
    g.rotation.set(0, 0, Math.sin(e.t * 1.1) * 0.5);
    e.fireT -= dt;
    if (e.fireT <= 0) { e.fireT = 1.5; const dir = aimedDir(pos, 85, 0.03); Shots.enemy(pos, dir.multiplyScalar(85), 7 * Game.eDmg(), { color: 0xffa040 }); Sfx.eLaser(); }
    e.tailLife = (e.tailLife ?? 14) - dt;
    if (e.tailLife <= 0) { e.st = 'flee'; e.t = 0; }
    return;
  }
  if (e.st === 'flee') {
    pos.z -= 70 * dt; pos.y += 20 * dt; g.rotation.z += dt * 3;
    if (e.t > 3) Game.removeEnt(e, false);
    return;
  }
  if (e.st === 'chase') {
    const w = e.chaseTarget;
    if (!w || w.state !== 'chased') { e.st = 'flee'; return; }
    pos.x = damp(pos.x, w.pos.x + e.off.x + Math.sin(e.t * 2.1 + e.ph) * 2, 4, dt);
    pos.y = damp(pos.y, w.pos.y + e.off.y + Math.cos(e.t * 1.7 + e.ph) * 1.5, 4, dt);
    pos.z = damp(pos.z, w.pos.z + e.off.z, 4, dt);
    g.rotation.set(0, 0, Math.sin(e.t * 2) * 0.4);
    e.fireT -= dt;
    if (e.fireT <= 0) {
      e.fireT = 0.85;
      const dir = _a.copy(w.pos).sub(pos).normalize();
      Shots.enemy(pos, dir.clone().multiplyScalar(110), 0, { color: 0xff8060, harmless: true, life: 0.25, size: 0.4 });
      w.hit(3.2);
    }
  }
};

AI.drone = (e, dt) => {
  const U = e.group.userData; e.t += dt;
  U.ring.rotation.z += dt * 2.4; U.ring.rotation.x = Math.PI / 2 + Math.sin(e.t) * 0.4;
  U.core.rotation.y += dt;
  if (e.params.bob !== false) e.p.y = (e.y0 ?? (e.y0 = e.p.y)) + Math.sin(e.t * 1.4 + e.ph) * 1.2;
  e.group.rotation.y = Math.PI;
  const ahead = P_AHEAD(e);
  if (e.params.fire) {
    e.fireT -= dt;
    if (e.fireT <= 0 && ahead > 30 && ahead < 230) { e.fireT = e.params.fire; enemyFire(e.p, 55, 8, { color: 0xffb040 }); }
  }
  if (ahead < -80) Game.removeEnt(e, false);
};
const P_AHEAD = (e) => Game.player.pos.z - e.wpos(_c).z;

AI.turret = (e, dt) => {
  const P = Game.player; const head = e.group.userData.head; e.t += dt;
  const hp = head.getWorldPosition(_a); const dx = P.pos.x - hp.x, dy = P.pos.y - hp.y, dz = P.pos.z - hp.z;
  head.rotation.order = 'YXZ'; head.rotation.y = damp(head.rotation.y, Math.atan2(-dx, -dz), 6, dt);
  head.rotation.x = damp(head.rotation.x, clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.2, 1.3), 6, dt);
  const ahead = -dz;
  if (ahead < e.act && ahead > 20) {
    e.fireT -= dt;
    if (e.fireT <= 0) {
      if ((e.burstLeft = (e.burstLeft ?? 3) - 1) > 0) e.fireT = 0.14; else { e.fireT = (e.params.fireRate ?? 2.3) * rr(0.85, 1.2); e.burstLeft = undefined; }
      const mp = _b.copy(hp); mp.y += 0.2;
      enemyFire(mp, 66, 10, { spread: 0.035 });
    }
  }
  if (ahead < -60) Game.removeEnt(e, false);
};

AI.mine = (e, dt) => {
  const P = Game.player; e.t += dt; const ahead = P_AHEAD(e);
  e.group.rotation.x += dt * 0.8; e.group.rotation.y += dt * 1.1;
  const s = 1 + Math.sin(e.t * 6) * 0.06; e.group.scale.setScalar(s * (1 + e.pulse * 0.8));
  if (e.st === 'idle') { if (ahead < e.act) e.st = 'hunt'; return; }
  e.p.x = damp(e.p.x, P.pos.x, 0.5, dt); e.p.y = damp(e.p.y, P.pos.y, 0.5, dt); e.p.z += (e.params.speed ?? 16) * dt;
  if (ahead < -60) Game.removeEnt(e, false);
};

AI.asteroid = (e, dt) => {
  const U = e.group.userData; e.group.rotation.x += U.spin.x * dt; e.group.rotation.y += U.spin.y * dt; e.group.rotation.z += U.spin.z * dt;
  e.group.scale.setScalar(1 + e.pulse * 0.4);
  if (e.params.drift) { e.p.x += e.params.drift.x * dt; e.p.y += e.params.drift.y * dt; }
  if (P_AHEAD(e) < -80) Game.removeEnt(e, false);
};

AI.ring = (e, dt) => {
  e.t += dt; e.group.rotation.z += dt * 0.9;
  const s = 1 + Math.sin(e.t * 3) * 0.03; e.group.scale.setScalar(s);
  if (P_AHEAD(e) < -40) { Game.removeEnt(e, false); }
};
AI.crate = (e, dt) => {
  e.t += dt; const sp = e.group.userData.spin; sp.rotation.y += dt * 2; sp.position.y = Math.sin(e.t * 2.4) * 0.6;
  if (P_AHEAD(e) < -40) Game.removeEnt(e, false);
};

AI.missile = (e, dt) => {
  const P = Game.player; e.t += dt;
  const want = _a.copy(P.pos).sub(e.p).normalize().multiplyScalar(e.params.speed ?? 42);
  e.vel.lerp(want, 1 - Math.exp(-(e.params.turn ?? 1.4) * dt));
  e.p.addScaledVector(e.vel, dt);
  e.group.quaternion.setFromUnitVectors(_b.set(0, 0, -1), _c.copy(e.vel).normalize());
  e.group.userData.flame.scale.set(1, 1, 0.7 + Math.random() * 0.6);
  if (Math.random() < 0.7) Fx.emit(_a.copy(e.p).addScaledVector(e.vel, -0.03), V3(), 0.4, 0.4, 0xffb050, 0, 2);
  if (e.t > 8 || e.p.z > P.pos.z + 50) Game.removeEnt(e, false);
};

AI.walker = (e, dt) => {
  const P = Game.player, U = e.group.userData; e.t += dt; const ahead = P_AHEAD(e);
  U.legs.forEach((l, i) => { l.rotation.x = Math.sin(e.t * 3 + (i % 2) * Math.PI + (i > 1 ? 1 : 0)) * 0.25; });
  U.body.position.y = 4.2 + Math.abs(Math.sin(e.t * 3)) * 0.25;
  e.group.rotation.y = Math.PI;
  if (ahead > e.act) return;
  e.p.x = (e.x0 ?? (e.x0 = e.p.x)) + Math.sin(e.t * 0.7 + e.ph) * 14;
  e.p.z += 6 * dt;
  e.fireT -= dt;
  if (e.fireT <= 0 && ahead > 40) {
    e.fireT = 3.3;
    const mp = U.pod.getWorldPosition(V3()); Game.spawnMissile(mp, 40, 1.3);
    if (e.params.double) { setTimeout(() => { if (e.alive) Game.spawnMissile(U.pod.getWorldPosition(V3()), 40, 1.3); }, 380); }
    Sfx.missile();
    const mp2 = U.body.getWorldPosition(V3()); mp2.z -= 2; mp2.y += 1;
    for (let i = 0; i < 2; i++) setTimeout(() => { if (e.alive) enemyFire(mp2, 60, 9); }, 200 + i * 180);
  }
  if (ahead < -60) Game.removeEnt(e, false);
};

AI.carrier = (e, dt) => {
  const P = Game.player; e.t += dt; const ahead = P_AHEAD(e);
  const U = e.group.userData; for (const f of U.flames) f.scale.set(1, 1, 0.8 + Math.random() * 0.4);
  e.group.rotation.y = Math.PI; e.group.rotation.z = Math.sin(e.t * 0.5) * 0.03;
  if (ahead > e.act) return;
  e.p.z += (e.params.speed ?? 10) * dt;
  e.fireT -= dt;
  if (e.fireT <= 0 && ahead > 30) {
    e.fireT = 2.2;
    for (const off of [-4, 4]) { const mp = _a.set(e.p.x + off, e.p.y + 2, e.p.z - 10); enemyFire(mp, 60, 10, { spread: 0.05 }); }
  }
  e.launchT = (e.launchT ?? 3) - dt;
  if (e.launchT <= 0 && (e.launched ?? 0) < (e.params.launches ?? 6) && ahead > 60) {
    e.launchT = 3.2; e.launched = (e.launched ?? 0) + 1;
    Game.say('buckle', 'Carrier is launching fighters! Pick them off!', 3.2, true);
    Game.spawnScout(e.p.x + rr(-4, 4), e.p.y + 2, e.p.z - 12, { pattern: pick(['weave', 'dive']), speed: 40, hp: 2 });
  }
  if (ahead < -90) Game.removeEnt(e, false);
};

// Laser gate: two destructible pylons; destroy either to switch the beam off
AI.laserGate = (e, dt) => {
  e.t += dt;
  const U = e.group.userData; const on = e.beamOn;
  U.beam.visible = on; if (on) { U.beam.scale.y = 0.8 + Math.sin(e.t * 25) * 0.25; }
  if (P_AHEAD(e) < -60) { for (const p of e.pylons || []) Game.removeEnt(p, false); Game.removeEnt(e, false); }
};

AI.obst = (e, dt) => {
  if (e.params.spin) e.group.rotation.z += e.params.spin * dt;
  if (P_AHEAD(e) < -80) Game.removeEnt(e, false);
};

AI.part = () => {};

// ---------- Hazards (shockwaves, beams) used by bosses ----------
const Hazards = {
  list: [],
  clear() { for (const h of this.list) h.mesh.parent && h.mesh.parent.remove(h.mesh); this.list.length = 0; },
  wave(z) {
    const m = new THREE.Mesh(box(120, 3.4, 1.2), new THREE.MeshBasicNodeMaterial({ color: 0xff7040, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.set(0, 1.7, z); Game.root.add(m);
    this.list.push({ type: 'wave', mesh: m, t: 0, hit: false });
    Sfx.stomp();
  },
  beam(x, fromZ) {
    const m = new THREE.Mesh(box(1, 1, 1), new THREE.MeshBasicNodeMaterial({ color: 0xff3050, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    Game.root.add(m);
    this.list.push({ type: 'beam', mesh: m, t: 0, x: x, dir: Math.random() < 0.5 ? -1 : 1, fromZ, hurtT: 0, y: 0 });
    Sfx.beam(); Sfx.warn();
  },
  update(dt) {
    const P = Game.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i]; h.t += dt; let dead = false;
      if (h.type === 'wave') {
        h.mesh.position.z += 62 * dt; h.mesh.scale.y = 1 + Math.sin(h.t * 14) * 0.15;
        if (!h.hit && h.mesh.position.z > P.pos.z - 1 && h.mesh.position.z < P.pos.z + 3 && P.pos.y < 6.5) { P.hurt(22, 'wave'); h.hit = true; }
        if (h.mesh.position.z > P.pos.z + 40) dead = true;
      } else if (h.type === 'beam') {
        // telegraph 1.4s, fire 1.6s sweeping across
        const boss = Game.boss;
        const tele = h.t < 1.4;
        if (!tele) h.x += h.dir * 9 * dt;
        h.x = clamp(h.x, -24, 24);
        const len = Math.max(10, Math.abs((boss ? boss.group.position.z : h.fromZ) - P.pos.z) + 20);
        h.mesh.scale.set(tele ? 0.25 : 5.5, tele ? 0.25 : 40, len);
        h.mesh.position.set(h.x, tele ? 0.3 : 12, P.pos.z - len / 2 + 10);
        h.mesh.material.opacity = tele ? 0.45 : 0.6 + Math.sin(h.t * 40) * 0.2;
        if (!tele) { h.hurtT -= dt; if (Math.abs(P.pos.x - h.x) < 3.8 && h.hurtT <= 0 && P.state === 'alive') { P.hurt(14, 'beam'); h.hurtT = 0.5; } }
        if (h.t > 3.2 || !boss || !boss.alive) dead = true;
      }
      if (dead) { h.mesh.parent && h.mesh.parent.remove(h.mesh); this.list.splice(i, 1); }
    }
  },
};

// ---------- Bosses ----------
class Boss extends Ent {
  constructor(type, model, o) {
    super('boss', model, { hp: 9999, r: o.r, targetable: false, contact: 30, keep: true, big: o.big || 4, cat: CAT.ENEMY });
    this.type = type; this.parts = []; this.phase = 1; this.invuln = true; this.title = o.title; this.noCount = true;
    this.dying = false; this.dyingT = 0;
  }
  addPart(name, anchor, hp, r, o = {}) {
    const pe = new Ent('part', new THREE.Object3D(), { hp, r, anchor, parent: this, targetable: true, contact: 25, keep: true, big: o.big || 1.4, score: o.score ?? 400, noCount: false });
    pe.partName = name; pe.invuln = !!o.invuln; pe.partRef = anchor;
    Game.add(pe, { r }, true);
    this.parts[name] = pe; this.parts.push(pe);
    return pe;
  }
  partAlive(n) { return this.parts[n] && this.parts[n].alive; }
  healthFrac() {
    let cur = 0, max = 0;
    for (const p of this.parts) { if (p.countsForBar === false) continue; max += p.maxHp; cur += Math.max(0, p.hp); }
    return max ? clamp(cur / max, 0, 1) : 0;
  }
  damage(n) { Fx.burst(this.wpos(V3()), 2, { speed: 6, life: 0.2, size: 0.2, color: 0xaab8ff }); return false; }
  explodeAt(local, size) { const p = V3(rr(-1, 1) * local.x, rr(-0.5, 1) * local.y, rr(-1, 1) * local.z).add(this.group.position); Fx.explosion(p, size); Sfx.explosion(size); }
  die() { /* handled by AI via defeated() */ }
  defeated() {
    if (this.dying) return; this.dying = true; this.dyingT = 0;
    Game.onBossDefeated(this);
  }
}

AI.boss = (b, dt) => {
  b.t += dt;
  if (b.dying) {
    b.dyingT += dt;
    b.group.rotation.z += dt * 0.25; b.group.position.y -= (b.type === 'crawler' ? 0 : 3) * dt;
    if (Math.random() < dt * 10) b.explodeAt(b.type === 'crawler' ? V3(10, 12, 12) : V3(6, 2, 8), 1.4 + Math.random());
    if (b.dyingT > 3.4 && b.alive) {
      b.alive = false;
      Fx.explosion(b.group.position.clone().add(V3(0, 6, 0)), 5, { shake: 2 }); Sfx.explosion(3);
      Phys.spawnDebris(b.group.position.clone().add(V3(0, 6, 0)), 16, { size: 1.2, speed: 22, colors: [0x58486e, 0x6a5848, 0xff8030], trail: 1 });
      Game.removeEnt(b, true);
      Game.onBossGone();
    }
    return;
  }
  (BossAI[b.type] || (() => {}))(b, dt);
};

const BossAI = {};
BossAI.gunship = (b, dt) => {
  const P = Game.player, U = b.group.userData, pos = b.p;
  const arrive = sstep(0, 3.2, b.t);
  const tz = P.pos.z - 92 + Math.sin(b.t * 0.4) * 9;
  pos.z = b.t < 3.2 ? lerp(P.pos.z - 260, tz, arrive) : damp(pos.z, tz, 3, dt);
  const tx = P.pos.x * 0.4 + Math.sin(b.t * 0.55) * (b.phase === 2 ? 15 : 10), ty = P.pos.y * 0.3 + Math.sin(b.t * 0.8) * 5;
  const ox = pos.x; pos.x = damp(pos.x, tx, 1.6, dt); pos.y = damp(pos.y, ty, 1.6, dt);
  b.group.rotation.set(0, Math.PI, clamp((ox - pos.x) * 1.5, -0.5, 0.5) + Math.sin(b.t * 0.55) * 0.12);
  U.eye.scale.setScalar(1 + Math.sin(b.t * 6) * 0.08);
  const ready = b.t > 3.4;
  if (!ready) return;
  const tl = b.partAlive('turL'), tr = b.partAlive('turR');
  if (b.phase === 1 && !tl && !tr) {
    b.phase = 2; b.parts.core.invuln = false; b.parts.core.targetable = true; b.group.userData.eye.material = toon(0xff3050, 0xff2040, 1.6);
    Game.say('granny', 'Its shield is down! Hit the red eye!', 3, true); Sfx.alarm(); Game.banner('CORE EXPOSED!', '#ff7090');
  }
  // turrets fire alternately
  for (const [n, pt] of [['turL', b.parts.turL], ['turR', b.parts.turR]]) {
    if (!pt || !pt.alive) continue;
    pt.fireT -= dt;
    if (pt.fireT <= 0) {
      pt.fireT = (b.phase === 1 ? 1.7 : 2.4) * rr(0.85, 1.2);
      const wp = pt.wpos(V3()); wp.z -= -2;
      for (let i = 0; i < 3; i++) setTimeout(() => { if (pt.alive && b.alive) enemyFire(pt.wpos(V3()), 66, 10, { spread: 0.04, color: 0xff7040 }); }, i * 130);
    }
  }
  b.fireT -= dt;
  if (b.phase === 2 && b.fireT <= 0) {
    b.fireT = 1.8;
    const ep = b.parts.core.wpos(V3());
    for (const sx of [-0.12, 0, 0.12]) { const d = aimedDir(ep, 60, 0.01); d.x += sx; d.normalize(); Shots.enemy(ep, d.multiplyScalar(60), 11 * Game.eDmg(), { color: 0xff3050, size: 0.65 }); }
    Sfx.eLaser();
  }
  b.missileT = (b.missileT ?? 4) - dt;
  if (b.missileT <= 0 && b.phase === 2) { b.missileT = 4.5; for (const s of [-1, 1]) Game.spawnMissile(b.group.position.clone().add(V3(s * 5, -1, -4)), 36, 1.2); Sfx.missile(); }
  const eL = b.parts.engL, eR = b.parts.engR;
  // engines are optional targets that shed health pickups
  for (const e of [eL, eR]) if (e && !e.alive && !e.shed) { e.shed = true; Game.spawnPickup('ring', P.pos.x * 0.3, P.pos.y * 0.3, P.pos.z - 90); }
  // charge: swoops close to the player periodically (phase 2)
  b.chargeT = (b.chargeT ?? 8) - dt;
  if (b.phase === 2 && b.chargeT <= 0) { b.chargeT = 9; b.charging = 2.2; Sfx.warn(); }
  if (b.charging > 0) { b.charging -= dt; pos.z += 38 * dt * Math.sin((2.2 - b.charging) / 2.2 * Math.PI); }
  if (b.parts.core && !b.parts.core.alive && !b.dying) b.defeated();
};

BossAI.crawler = (b, dt) => {
  const P = Game.player, U = b.group.userData, pos = b.p;
  const arrive = sstep(0, 4, b.t);
  const tz = P.pos.z - 118;
  pos.z = b.t < 4 ? lerp(P.pos.z - 300, tz, arrive) : damp(pos.z, tz, 4, dt);
  pos.x = Math.sin(b.t * 0.35) * 14; pos.y = 0;
  b.group.rotation.y = Math.PI;
  U.legs.forEach((l, i) => { l.rotation.x = Math.sin(b.t * 2.2 + (i % 2) * Math.PI + (i > 1 ? 1.5 : 0)) * 0.28; });
  U.body.position.y = 17 + Math.abs(Math.sin(b.t * 2.2)) * 0.6;
  if (b.t < 4.2) return;
  const gens = (b.partAlive('genL') ? 1 : 0) + (b.partAlive('genR') ? 1 : 0);
  if (b.phase === 1 && gens === 0) {
    b.phase = 2; b.parts.core.invuln = false; U.parts.coreShell.visible = false; b.parts.core.targetable = true;
    Game.say('granny', 'Shield generators down! The core is open — hit it!', 3.4, true); Sfx.alarm(); Game.banner('CORE EXPOSED!', '#ff7090');
  }
  if (b.phase === 2 && b.parts.core.hp < b.parts.core.maxHp * 0.5 && !b.rage) { b.rage = true; Game.say('hazel', 'It is getting angry. Watch the beam!', 2.6, true); }
  const rate = b.rage ? 0.65 : 1;
  for (const n of ['canL', 'canR']) {
    const c = b.parts[n]; if (!c || !c.alive) continue;
    c.fireT -= dt;
    if (c.fireT <= 0) { c.fireT = 2.0 * rate * rr(0.85, 1.2); for (let i = 0; i < 3; i++) setTimeout(() => { if (c.alive && b.alive) enemyFire(c.wpos(V3()), 68, 10, { spread: 0.035, color: 0xff7040 }); }, i * 120); }
  }
  b.missileT = (b.missileT ?? 5) - dt;
  if (b.missileT <= 0) { b.missileT = 6 * rate; const pw = U.body.position; for (let i = 0; i < (b.phase === 2 ? 3 : 2); i++) setTimeout(() => { if (b.alive) Game.spawnMissile(U.body.getWorldPosition(V3()).add(V3(rr(-6, 6), 8, 0)), 38, 1.3); }, i * 260); Sfx.missile(); }
  b.stompT = (b.stompT ?? 6.5) - dt;
  if (b.stompT <= 0) { b.stompT = 8 * rate; Hazards.wave(b.p.z + 12); Game.say('marrow', 'Shockwave! Fly high!', 1.8, true); Fx.trauma = Math.min(1, Fx.trauma + 0.5); }
  b.beamT = (b.beamT ?? 7) - dt;
  if (b.phase === 2 && b.beamT <= 0) { b.beamT = 8 * rate; Hazards.beam(P.pos.x, b.p.z); }
  for (const g of [b.parts.genL, b.parts.genR]) if (g && !g.alive && !g.shed) { g.shed = true; Game.spawnPickup('ring', 0, 12, P.pos.z - 100); }
  if (b.parts.core && !b.parts.core.alive && !b.dying) b.defeated();
};

// ---------- Scenery ----------
function buildBiodome() {
  const g = new THREE.Group();
  g.add(mk(sph(8, 18, 12), toon(0x9ae8ff, 0x60c0ff, 0.3, { transparent: true, opacity: 0.55 }), { shadow: false }));
  g.add(mk(cyl(7, 8, 2, 12), toon(0x6a5a80), { outline: 0.15, pos: [0, -7.5, 0] }));
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.add(mk(cone(0.9, 4, 5), toon(0x5ac860, 0x40a040, 0.2), { outline: 0.06, pos: [Math.cos(a) * 3.4, -4.2, Math.sin(a) * 3.4], rot: [-Math.PI / 2, 0, 0] })); }
  const ring = mk(tor(12, 0.5, 6, 32), toon(0xffd040, 0xffb020, 0.4), { outline: 0.1 }); ring.rotation.x = Math.PI / 2.3; g.add(ring);
  return g;
}

const Scenery = {
  group: null, chunks: new Map(), kind: 'space', CH: 80, env: null,
  init(scene) { this.group = new THREE.Group(); scene.add(this.group); },
  reset(kind, env) {
    for (const [, c] of this.chunks) { disposeTree(c); this.group.remove(c); }
    this.chunks.clear(); this.kind = kind; this.env = env;
  },
  update(pz) {
    const CH = this.CH; const cur = Math.floor(-pz / CH);
    for (let i = Math.max(0, cur - 1); i <= cur + Math.ceil(940 / CH); i++) if (!this.chunks.has(i)) this.build(i);
    for (const [i, c] of this.chunks) if (i < cur - 2) { disposeTree(c); this.group.remove(c); this.chunks.delete(i); }
  },
  build(i) {
    const CH = this.CH; const g = new THREE.Group(); const z0 = -i * CH;
    if (this.kind === 'canyon') {
      const col = this.env.rock; const floorCol = this.env.floor;
      g.add(ownBox(300, 2, CH, i % 2 ? floorCol : (floorCol & 0xfefefe) + 0x0c0804, { recv: true, pos: [0, -1, z0 - CH / 2], outline: 0 }));
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const w = rr(14, 30), h = rr(28, 78), d = rr(22, 42);
          const rock = buildRock(w, h, d, col); rock.position.set(side * (rr(40, 54) + w / 2 + k * 2), 0, z0 - (k + 0.5) * CH / 3 + rr(-6, 6)); g.add(rock);
        }
        const far = buildRock(rr(30, 50), rr(70, 120), rr(50, 80), (col & 0xfefefe) + 0x181008); far.position.set(side * rr(95, 130), 0, z0 - rr(10, CH - 10)); g.add(far);
      }
      for (let k = 0; k < 4; k++) {
        const s = rr(1, 2.6); const b = mk(ico(1, 0), toon((col & 0xfefefe) + 0x181008), { outline: 0.05, recv: true, pos: [rr(-36, 36), s * 0.3, z0 - rr(0, CH)], scl: [s, s * 0.7, s * rr(0.8, 1.3)] }); b.rotation.y = rr(0, 6); g.add(b);
      }
      for (let k = 0; k < 3; k++) {  // dry shrubs
        const sh = mk(cone(0.5, rr(1.5, 3), 5), toon(0x7a8a3a), { outline: 0.05, pos: [rr(-38, 38), 1, z0 - rr(0, CH)] }); sh.rotation.x = -Math.PI / 2; g.add(sh);
      }
    } else {
      for (let k = 0; k < 3; k++) {
        const size = rr(6, 20); const a = buildAsteroid(size, ri(0, 3), this.env.rock || 0x6e6272);
        const side = Math.random() < 0.5 ? -1 : 1;
        a.position.set(side * rr(48, 150), rr(-70, 70), z0 - rr(0, CH)); g.add(a);
      }
      if (i % 3 === 1) { const b = buildBiodome(); b.position.set((Math.random() < 0.5 ? -1 : 1) * rr(60, 110), rr(-30, 40), z0 - CH / 2); b.scale.setScalar(rr(0.8, 1.5)); g.add(b); }
    }
    this.chunks.set(i, g); this.group.add(g);
  },
};
