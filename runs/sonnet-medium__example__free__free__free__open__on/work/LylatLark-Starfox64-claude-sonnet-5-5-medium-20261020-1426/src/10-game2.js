'use strict';
/* ===== Game part 2: events, enemies, obstacles, bullets, wingmen, bosses, camera ===== */
const FIXED_KINDS = ['turret', 'mine', 'asteroid'];
const Y_AXIS = new THREE.Vector3(0, 1, 0);
function segSphere(a, b, c, r) { // segment a→b vs sphere (c,r)
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, l2 = abx * abx + aby * aby + abz * abz;
  let t = l2 > 0 ? ((c.x - a.x) * abx + (c.y - a.y) * aby + (c.z - a.z) * abz) / l2 : 0; t = clamp(t, 0, 1);
  const dx = a.x + abx * t - c.x, dy = a.y + aby * t - c.y, dz = a.z + abz * t - c.z; return dx * dx + dy * dy + dz * dz <= r * r;
}
Object.assign(Game, {
  /* ---------- timeline ---------- */
  prepareEvents() {
    this.evs = this.level.events.map((e) => {
      const fixed = e.t === 'obs' || e.t === 'ring' || e.t === 'crate' || (e.t === 'spawn' && FIXED_KINDS.includes(e.kind));
      return Object.assign({}, e, { due: e.at - (fixed ? 420 : 0), done: false });
    });
  },
  processEvents() {
    if (!this.evs || this.evsFor !== this.level) { this.prepareEvents(); this.evsFor = this.level; }
    for (const ev of this.evs) if (!ev.done && this.progress >= ev.due) { ev.done = true; this.runEvent(ev); }
  },
  resetEventsToCheckpoint() { for (const ev of this.evs) ev.done = ev.at < this.checkpoint; },
  runEvent(ev) {
    switch (ev.t) {
      case 'comm': this.comm(ev.who, ev.text, ev.dur || 3.5); break;
      case 'banner': this.banner(ev.text, ev.sub); break;
      case 'tut': if (!this.attract) { this.tut = { id: ev.id, text: ev.text, t: 0, done: false, doneT: 0, base: Object.assign({}, this.P.stat) }; HUD.tut(ev.text, false); } break;
      case 'spawn': this.spawnEnemy(ev.kind, ev.x, ev.y, -ev.at, ev.o || {}); break;
      case 'ring': this.spawnPickup('ring', ev.x, ev.y, -ev.at); break;
      case 'crate': this.spawnPickup('crate_' + ev.kind, ev.x, ev.y, -ev.at); break;
      case 'obs': this.spawnObstacle(ev); break;
      case 'chase': { const w = this.wingmen.find((q) => q.id === ev.who && q.alive); if (w) for (let i = 0; i < ev.n; i++) this.spawnEnemy('chaser', w.pos.x, w.pos.y, w.pos.z + 40, { target: w }); break; }
      case 'checkpoint': this.checkpoint = ev.at; this.toast('CHECKPOINT'); break;
      case 'boss': this.startBoss(ev.kind); break;
    }
  },

  /* ---------- spawning ---------- */
  spawnEnemy(kind, x, y, z, o = {}) {
    const def = ENEMIES[kind]; if (!def) return null;
    const mesh = def.mk ? def.mk(o) : def.build();
    const e = { kind, def, mesh, hp: def.hp, maxhp: def.hp, r: def.r, score: def.score, lock: def.lock, alive: true, t: 0, x, y, dz: 0, rel: false, boss: false, invuln: false, flash: 0 };
    mesh.position.set(x, y, z); this.scene.add(mesh); this.enemies.push(e);
    if (def.init) def.init(e, o, this);
    e.maxhp = e.hp;
    if (e.rel) { e.dz += (o.delay || 0) * 50; mesh.position.set(e.x, e.y, this.pz - e.dz); }
    return e;
  },
  spawnPickup(key, x, y, z) {
    const def = PICKUPS[key]; const mesh = def.build(); mesh.position.set(x, y, z); this.scene.add(mesh);
    const p = { key, def, mesh, r: def.r, t: 0 }; this.pickups.push(p); return p;
  },
  dropCrate(pos, kind) { this.spawnPickup('crate_' + kind, pos.x, pos.y, pos.z); },
  spawnObstacle(ev) {
    const o = ev.o || {}, z = -ev.at;
    if (ev.kind === 'tower') {
      const h = o.h || 30, base = this.level.env === 'canyon' ? canyonH(ev.x, z) : (o.floating ? -12 : -h / 2); const m = buildTower(h, 5); m.position.set(ev.x, base, z); this.scene.add(m);
      this.addObstacle(m, [{ x: 0, y: h / 2, z: 0, hx: 2.5, hy: h / 2, hz: 2.5 }]);
    } else if (ev.kind === 'arch') {
      const h = o.h || 26, span = 26, base = (o.floating || this.level.env !== 'canyon') ? -12 : canyonH(ev.x, z); const m = buildArch(span, h); m.position.set(ev.x, base, z); this.scene.add(m);
      this.addObstacle(m, [{ x: -(span / 2 + 2), y: h / 2, z: 0, hx: 2, hy: h / 2, hz: 2 }, { x: span / 2 + 2, y: h / 2, z: 0, hx: 2, hy: h / 2, hz: 2 }, { x: 0, y: h + 1.5, z: 0, hx: span / 2 + 4, hy: 1.5, hz: 2.2 }]);
    }
  },
  addObstacle(mesh, boxes, follow) { const o = { mesh, boxes, follow: !!follow }; this.obstacles.push(o); return o; },

  /* ---------- enemies ---------- */
  updateEnemies(dt) {
    const P = this.P, boostExtra = (this.speed - this.level.speed) * 0.6;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]; if (!e.alive) continue;
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      if (e.rel) {
        const cv = (e.cv + boostExtra) * (this.state === 'play' || this.state === 'intro' ? 1 : 0.2);
        if (e.hold > 0) { if (e.dz > e.hold) e.dz -= cv * dt; else e.dz = e.hold; } else e.dz -= cv * dt;
        if (e.def.update) e.def.update(e, dt, this);
        e.mesh.position.set(e.x, e.y, this.pz - e.dz);
        if (e.dz < -60) e.cull = true;
      } else {
        if (e.parent) { if (!e.manual) { const pm = (e.parent.mesh || e.parent.group).position; e.mesh.position.copy(pm).add(e.off); } }
        else if (e.vel && e.kind === 'asteroid') e.mesh.position.addScaledVector(e.vel, dt);
        if (e.def.update) e.def.update(e, dt, this);
      }
      if (e.cull) { this.removeEnemy(e); continue; }
      // ram the player
      if (P.alive && !e.noCollide && !e.hide && e.kind !== 'dummy' && this.state === 'play') {
        const d = e.mesh.position.distanceTo(_v.set(P.ox, P.oy, this.pz));
        if (d < e.r + 1.7) {
          if (this.hurt(e.boss ? 22 : e.kind === 'asteroid' ? 20 : 14, e.mesh.position, { long: true })) { P.vx += sign0(P.ox - e.mesh.position.x) * 14; P.vy += sign0(P.oy - e.mesh.position.y) * 8; }
          if (!e.boss && !e.invuln && e.kind !== 'gunship') this.damageEnemy(e, 99, 'ram');
        }
      }
    }
  },
  removeEnemy(e) { e.alive = false; this.scene.remove(e.mesh); const i = this.enemies.indexOf(e); if (i >= 0) this.enemies.splice(i, 1); const li = this.P.locks.indexOf(e); if (li >= 0) this.P.locks.splice(li, 1); },
  damageEnemy(e, dmg, src, quiet) {
    if (!e.alive) return;
    if (e.invuln) { FX.burst(e.mesh.position, 4, { speed: 14, size: 1.4, life: 0.3, colors: [0xffffff, 0xaaddff] }); Audio.sfx('ping'); return; }
    e.hp -= dmg; e.flash = 0.1;
    FX.burst(e.mesh.position, 3, { speed: 12, size: 1.2, life: 0.3, colors: [0xffee99, 0xffffff] });
    if (src !== 'wing') Input.rumble(0.1, 0.4, 50);
    if (e.hp <= 0) this.killEnemy(e, false, src);
    else if (e.boss) this.shake(0.12);
  },
  killEnemy(e, silent, src, batch) {
    if (!e.alive) return;
    e.alive = false; const P = this.P;
    const sz = e.boss ? 2.5 : clamp(e.r * 0.4, 0.7, 2.4);
    this.removeEnemy(e); e.alive = false;
    FX.explosion(e.mesh.position, sz, !silent || e.boss);
    if (e.boss) this.shake(0.5);
    if (!silent && e.def.onDeath) e.def.onDeath(e, this);
    if (e.kind === 'cruiserCore') this.cruiserDown(e.parent);
    if (e.kind === 'cruiser') return;
    if (src !== 'wing' && !silent && e.kind !== 'dummy') {
      P.hits++; P.kills++; P.chain++; this.chainT = 2.6;
      const mult = 1 + Math.min(P.chain, 10) * 0.1; P.score += Math.round(e.score * 10 * mult);
      this.addSquad(e.boss ? 0.05 : 0.03 + e.maxhp * 0.003);
      if (P.chain === 5 || P.chain === 10 || P.chain === 20) this.toast('CHAIN ×' + P.chain);
    } else if (e.kind === 'dummy') { HUD.dummyHit(); }
  },
  explodeMine(e) { this.killEnemy(e, false, 'ram'); },
  blast(pos, radius, dmg, hurtPlayer) {
    for (const e of this.enemies.slice()) { if (!e.alive || e.boss || e.invuln || e.kind === 'dummy') continue; if (e.mesh.position.distanceTo(pos) < radius + e.r) this.damageEnemy(e, dmg, 'blast'); }
    if (hurtPlayer && this.P.alive && pos.distanceTo(_v.set(this.P.ox, this.P.oy, this.pz)) < radius + 1) this.hurt(14, pos);
    this.shake(0.3);
  },
  cruiserDown(c) {
    if (!c || c.done) return; c.done = true; this.cruiser = null;
    this.comm('quill', 'Warden destroyed! Excellent work, Lark!', 3, true);
    const p = c.mesh.position.clone();
    for (let i = 0; i < 12; i++) Tween.add(0.01, () => {}, { delay: i * 0.18, done: () => { if (this.state === 'idle') return; FX.explosion(p.clone().add(new THREE.Vector3(rand(-9, 9), rand(-3, 8), rand(-30, 30))), 2.2); this.shake(0.5); } });
    Tween.add(0.01, () => {}, { delay: 2.3, done: () => { if (c.mesh.parent) this.scene.remove(c.mesh); } });
    c.alive = false; const o = this.obstacles.find((q) => q.mesh === c.mesh); if (o) this.obstacles.splice(this.obstacles.indexOf(o), 1);
    const ci = this.enemies.indexOf(c); if (ci >= 0) this.enemies.splice(ci, 1);
    this.P.score += 5000; this.P.hits += 5; this.addSquad(0.3);
  },

  /* ---------- obstacles / pickups ---------- */
  updateObstacles(dt) {
    const P = this.P;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i], mp = o.mesh.position;
      if (!o.follow && mp.z - this.pz > 80) { this.scene.remove(o.mesh); this.obstacles.splice(i, 1); continue; }
      if (!P.alive || this.state !== 'play') continue;
      for (const b of o.boxes) {
        const cx = mp.x + b.x, cy = mp.y + b.y, cz = mp.z + b.z;
        const dx = Math.max(Math.abs(P.ox - cx) - b.hx, 0), dy = Math.max(Math.abs(P.oy - cy) - b.hy, 0), dz = Math.max(Math.abs(this.pz - cz) - b.hz, 0);
        if (dx * dx + dy * dy + dz * dz < 2.2 * 2.2) {
          if (this.hurt(25, mp, { long: true })) { P.vx += sign0(P.ox - cx) * 22; P.vy += sign0(P.oy - cy) * 10; this.shake(0.9); FX.explosion(new THREE.Vector3(P.ox, P.oy, this.pz - 2), 0.8); }
        }
      }
    }
  },
  bulletInObstacle(pos, r) {
    for (const o of this.obstacles) {
      if (o.follow) continue; // capital-ship hulls don't stop shots, so weak points stay hittable
      const mp = o.mesh.position; if (Math.abs(mp.z - pos.z) > 60) continue;
      for (const b of o.boxes) if (Math.abs(pos.x - (mp.x + b.x)) < b.hx + r && Math.abs(pos.y - (mp.y + b.y)) < b.hy + r && Math.abs(pos.z - (mp.z + b.z)) < b.hz + r) return true;
    }
    return false;
  },
  updatePickups(dt) {
    const P = this.P;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]; p.t += dt; p.mesh.rotation.y += dt * 1.6; if (p.key === 'ring') p.mesh.rotation.z += dt * 0.6; else p.mesh.rotation.x += dt;
      if (p.mesh.position.z - this.pz > 40) { this.scene.remove(p.mesh); this.pickups.splice(i, 1); continue; }
      if (!P.alive) continue;
      const d = p.mesh.position.distanceTo(_v.set(P.ox, P.oy, this.pz));
      if (d < 16 && d > 3) { const dir = _v.clone().sub(p.mesh.position).normalize(); if (p.mesh.position.z - this.pz < 0) p.mesh.position.addScaledVector(dir, dt * 10); }
      if (d < p.r + 2.4) { p.def.apply(this); FX.burst(p.mesh.position, 14, { speed: 18, size: 2, life: 0.6, colors: [0xffe066, 0xffffff] }); FX.ring(p.mesh.position, 14, 0.4, 0xffe066); this.scene.remove(p.mesh); this.pickups.splice(i, 1); Input.rumble(0.2, 0.5, 90); }
    }
  },

  /* ---------- bullets ---------- */
  updateBullets(dt) {
    const P = this.P;
    this.updateBomb(dt);
    for (let i = this.pb.length - 1; i >= 0; i--) {
      const b = this.pb[i]; let dead = false; b.prev.copy(b.pos);
      if (b.kind === 'homing') {
        if (!b.target || !b.target.alive) { b.target = null; let bd = 1e9; for (const e of this.enemies) { if (!e.alive || !e.lock || e.hide || e.invuln) continue; const d = e.mesh.position.distanceToSquared(b.pos); if (d < bd && e.mesh.position.z < b.pos.z) { bd = d; b.target = e; } } }
        const sp = Math.min(260, b.vel.length() + 240 * dt);
        if (b.target) { _v.copy(b.target.mesh.position).sub(b.pos).normalize().multiplyScalar(sp); b.vel.lerp(_v, Math.min(1, dt * b.turn)); } else b.vel.setLength(sp);
        b.mesh.lookAt(_v.copy(b.pos).add(b.vel));
        if (Math.random() < 0.7) FX.spawn(b.pos, { color: 0xffaa55, size: 2, life: 0.3, grow: 0.5, op: 0.8 });
      }
      b.pos.addScaledVector(b.vel, dt); b.life -= dt; if (b.life <= 0) dead = true;
      if (!dead) for (const e of this.enemies) {
        if (!e.alive || e.hide || b.hit.has(e) || e.kind === 'cruiser') continue;
        if (segSphere(b.prev, b.pos, e.mesh.position, e.r + b.r)) {
          b.hit.add(e); const was = e.alive;
          this.damageEnemy(e, b.dmg * (b.kind === 'homing' ? 1 : 1), b.kind === 'wing' ? 'wing' : 'pb');
          if (b.batch && was && !e.alive) { this.batchKills = this.batchKills || {}; this.batchKills[b.batch] = (this.batchKills[b.batch] || 0) + 1; if (this.batchKills[b.batch] === 3) { this.toast('TRIPLE KILL +500'); P.score += 500; } }
          if (!b.pierce) { dead = true; break; }
        }
      }
      if (!dead && this.bulletInObstacle(b.pos, b.r * 0.5)) { dead = true; FX.burst(b.pos, 4, { speed: 12, size: 1.2, life: 0.3, colors: [0xffffff, 0xccddff] }); }
      if (dead || b.pos.z < this.pz - 520) { this.scene.remove(b.mesh); this.pb.splice(i, 1); }
    }
    for (let i = this.eb.length - 1; i >= 0; i--) {
      const b = this.eb[i]; b.prev.copy(b.pos); b.pos.addScaledVector(b.vel, dt); b.life -= dt;
      let dead = b.life <= 0 || b.pos.z > this.pz + 30;
      b.mesh.scale.setScalar(1 + Math.sin(this.time * 20 + i) * 0.12);
      if (!dead && this.bulletInObstacle(b.pos, 0.5)) { dead = true; FX.burst(b.pos, 3, { speed: 10, size: 1.2, life: 0.25, colors: [0xff8866] }); }
      if (!dead && P.alive && this.state === 'play') {
        const d = b.pos.distanceTo(_v.set(P.ox, P.oy, this.pz));
        if (P.rollT > 0 && d < 8.5) { this.reflect(b); dead = true; }
        else if (d < b.r + 1.7) { this.hurt(b.dmg, b.pos); dead = true; FX.burst(b.pos, 6, { speed: 14, size: 1.6, life: 0.3, colors: [0xff7744, 0xffee99] }); }
      }
      if (!dead) for (const w of this.wingmen) { if (w.alive && w.pos.distanceToSquared(b.pos) < 9) { w.hp -= b.dmg * 0.8; dead = true; FX.burst(b.pos, 5, { speed: 12, size: 1.5, life: 0.3 }); break; } }
      if (dead) { this.scene.remove(b.mesh); this.eb.splice(i, 1); }
    }
  },
  reflect(b) {
    const P = this.P; let best = null, bd = 1e9;
    for (const e of this.enemies) { if (!e.alive || e.hide || e.invuln || !e.lock) continue; const dz = this.pz - e.mesh.position.z; if (dz < 5 || dz > 260) continue; const d = e.mesh.position.distanceTo(b.pos); if (d < bd) { bd = d; best = e; } }
    const vel = best ? best.mesh.position.clone().sub(b.pos).normalize().multiplyScalar(210) : new THREE.Vector3(rand(-20, 20), rand(-10, 10), -210);
    this.spawnPB(b.pos.clone(), vel, 4, 0xffe866, 'reflect', { target: null });
    P.deflects++; this.addSquad(0.04); Audio.sfx('deflect'); Input.rumble(0.1, 0.5, 70); FX.ring(b.pos, 8, 0.3, 0x99eeff);
    if (P.deflects % 6 === 0) this.toast('DEFLECT ×' + P.deflects);
  },
  makeEB(pos, dir, speed, dmg = 10, col = 0xff4a3a) {
    const m = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: 0xfff0d8, fog: false })); m.scale.setScalar(0.8); m.position.copy(pos); glow(m, col, 4.2, 0, 0, 0, 0.85, true); this.scene.add(m);
    this.eb.push({ mesh: m, pos: m.position, prev: pos.clone(), vel: dir.clone().multiplyScalar(speed), r: 0.8, dmg, life: 6 });
  },
  enemyShoot(pos, speed, lead = 1, spread = 0) {
    const P = this.P, dm = DIFF[Settings.difficulty]; let t = pos.distanceTo(_v.set(P.ox, P.oy, this.pz)) / speed;
    const tgt = new THREE.Vector3();
    for (let k = 0; k < 2; k++) { tgt.set(P.ox + P.vx * t * lead * 0.6, P.oy + P.vy * t * lead * 0.6, this.pz - this.speed * t * lead); t = pos.distanceTo(tgt) / speed; }
    const dir = tgt.sub(pos).normalize(); dir.x += rand(-0.012, 0.012); dir.y += rand(-0.012, 0.012); dir.normalize();
    if (spread) dir.applyAxisAngle(Y_AXIS, spread);
    this.makeEB(pos, dir, speed, 10 * dm.dmg / dm.dmg); // damage scaling applied in hurt()
    if (this.time - (this._lastShotSnd || 0) > 0.07) { Audio.sfx('enemyShot'); this._lastShotSnd = this.time; }
  },
  shootDir(pos, dir, speed) { this.makeEB(pos, dir, speed, 8, 0xff55cc); if (this.time - (this._lastShotSnd || 0) > 0.09) { Audio.sfx('enemyShot'); this._lastShotSnd = this.time; } },
  ringShot(pos, n, speed, ph) { for (let i = 0; i < n; i++) { const a = (i / n) * TAU + ph; this.makeEB(pos, new THREE.Vector3(Math.cos(a) * 0.5, Math.sin(a) * 0.4, 1).normalize(), speed, 9, 0xff8844); } Audio.sfx('enemyShot'); },
  visualShot(from, to) { const d = to.clone().sub(from).normalize(); FX.spawn(from, { v: d.multiplyScalar(110), color: 0xff5555, size: 1.6, life: 0.18, grow: 0, op: 1, drag: 0 }); },
  sweep(lane) {
    const m = new THREE.Mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.scale.set(0.5, 110, 240); this.scene.add(m);
    this.sweeps.push({ mesh: m, lane, t: 0, warn: 1.4, fire: 0.45, fired: false }); this.comm('gloam', pick(['Nowhere to run!', 'Burn!']), 1.6); Audio.sfx('alarm');
  },
  updateSweeps(dt) {
    const P = this.P;
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const s = this.sweeps[i]; s.t += dt; s.mesh.position.set(s.lane, 10, this.pz - 90);
      if (s.t < s.warn) { s.mesh.scale.x = 0.4 + Math.sin(s.t * 30) * 0.15; s.mesh.material.opacity = 0.25 + 0.2 * Math.sin(s.t * 20); }
      else if (s.t < s.warn + s.fire) {
        if (!s.fired) { s.fired = true; Audio.sfx('bigExplode'); this.shake(0.7); }
        s.mesh.scale.x = 7; s.mesh.material.opacity = 0.9; s.mesh.material.color.set(0xffddaa);
        if (P.alive && this.state === 'play' && Math.abs(P.ox - s.lane) < 4.8) this.hurt(30, s.mesh.position, { long: true });
      } else { this.scene.remove(s.mesh); this.sweeps.splice(i, 1); }
    }
  },

  /* ---------- wingmen ---------- */
  updateWingmen(dt) {
    const P = this.P;
    for (const w of this.wingmen) {
      if (!w.alive) continue;
      const tx = P.ox * 0.55 + w.off.x * (w.chased ? 0.5 : 1) + Math.sin(this.time * 0.8 + w.ph) * (w.chased ? 9 : 2.5), ty = P.oy * 0.5 + w.off.y + Math.sin(this.time * 1.1 + w.ph) * (w.chased ? 4 : 1.2);
      const z = this.pz + w.off.z + (this.state === 'outro' ? -Math.min(80, this.stateT * 30) : 0);
      w.pos.x = damp(w.pos.x, tx, 2.2, dt); w.pos.y = damp(w.pos.y, ty, 2.2, dt); w.pos.z = damp(w.pos.z, z, 2.5, dt);
      w.mesh.position.copy(w.pos); w.mesh.rotation.z = damp(w.mesh.rotation.z, -(tx - w.pos.x) * 0.12, 6, dt); w.mesh.rotation.x = 0;
      if (!w.rollT && Math.random() < dt * 0.05) w.rollT = 0.6; if (w.rollT > 0) { w.rollT -= dt; w.mesh.userData.roll.rotation.z = (1 - Math.max(0, w.rollT) / 0.6) * TAU; } else w.mesh.userData.roll.rotation.z = 0;
      w.mesh.userData.core.scale.setScalar(2.2 + Math.sin(this.time * 30 + w.ph) * 0.2);
      w.fireT -= dt;
      if (w.fireT <= 0 && this.state === 'play') {
        w.fireT = rand(0.7, 1.3);
        const ts = this.enemies.filter((e) => e.alive && e.lock && !e.invuln && !e.hide && e.kind !== 'dummy' && w.pos.z - e.mesh.position.z > 15 && w.pos.z - e.mesh.position.z < 210);
        if (ts.length) { const t = pick(ts); this.spawnPB(w.pos.clone().add(new THREE.Vector3(0, 0, -4)), t.mesh.position.clone().sub(w.pos).normalize().multiplyScalar(260), 1, 0x88ffdd, 'wing'); }
      }
      if (w.chased && !w.warned) { w.warned = true; }
      if (!w.chased) w.warned = false;
      if (w.hp < w.maxhp * 0.35 && w.chased && !w.cry) { w.cry = true; this.comm(w.id, 'I can\'t shake him! Hurry!', 2.4); }
      if (w.hp <= 0) this.wingmanDown(w);
    }
  },
  wingmanDown(w) {
    w.alive = false; FX.explosion(w.pos, 1.6); this.scene.remove(w.mesh);
    this.comm(w.id, pick(['I\'m hit! Going down! Good luck, Lark!', 'Mayday, mayday... eject!']), 3, true);
    for (const e of this.enemies) if (e.target === w) e.target = null;
    this.shake(0.4);
  },

  /* ---------- bosses ---------- */
  startBoss(kind) {
    const def = BOSSES[kind]; this.boss = { kind, def, t: 0, dying: false, deathT: 0 };
    Audio.music(def.music); this.banner('WARNING', def.name); Audio.sfx('alarm');
    def.start(this, this.boss); HUD.bossBar(def.name, 1);
    this.checkpoint = Math.max(this.checkpoint, this.progress - 60);
  },
  updateBoss(dt) {
    const b = this.boss; if (!b) return;
    b.t += dt;
    if (b.dying) {
      b.deathT += dt; b.dz = b.dz || 100;
      if (Math.random() < dt * 9) FX.explosion(b.group.position.clone().add(new THREE.Vector3(rand(-14, 14), rand(-8, 10), rand(-6, 6))), rand(1.2, 2.4));
      if (b.deathT > 3.6 && !b.finished) { b.finished = true; FX.explosion(b.group.position, 7); this.shake(2); this.scene.remove(b.group); Input.rumble(1, 1, 800); this.levelComplete(); }
      return;
    }
    b.def.update(this, b, dt);
    let hp = 0, mx = 0; for (const p of b.parts) { mx += p.maxhp; hp += Math.max(0, p.hp); }
    b.frac = hp / mx; HUD.bossBar(b.def.name, b.frac);
  },
  bossDie() {
    const b = this.boss; if (!b || b.dying) return; b.dying = true; b.deathT = 0;
    for (const p of b.parts) if (p.alive) this.killEnemy(p, true);
    for (const e of this.enemies.slice()) if (e.kind === 'missile') this.killEnemy(e, true);
    this.eb.forEach((x) => this.scene.remove(x.mesh)); this.eb = [];
    HUD.bossBar(null); this.comm('gloam', 'Impossible... the Veil... will... fall...', 3, true);
    this.timeScale = 1; Audio.sfx('bigExplode');
  },
  levelComplete() {
    this.setState('outro'); Audio.music('win'); Audio.sfx('win'); this.banner('MISSION COMPLETE', this.level.name);
    this.comm('quill', 'Outstanding, Lark Squadron! Sector secured. Return to base.', 4, true);
  },
  updateOutro(dt) {
    const P = this.P; P.ox = damp(P.ox, 0, 1.5, dt); P.oy = damp(P.oy, 5 + this.stateT * 2, 1.2, dt); P.vx = 0; P.vy = 0;
    this.speed = damp(this.speed, this.level.speed * 2.4, 1.4, dt);
    P.rollT = this.stateT > 1 && this.stateT < 1.7 ? 0.55 * (1.7 - this.stateT) / 0.7 : 0;
    if (this.stateT > 7 && !this.finishing) { this.finishing = true; this.finishLevel(); }
  },
  finishLevel() {
    const P = this.P, lv = this.level;
    const alive = this.wingmen.filter((w) => w.alive).length;
    const bonus = alive * 1000 + P.rings * 100 + Math.max(0, Math.round((lv.length / 46 * 3 - this.time) * 10)) + P.lives * 500;
    P.score += bonus;
    const medal = P.hits >= lv.medal.gold ? 'GOLD' : P.hits >= lv.medal.silver ? 'SILVER' : 'BRONZE';
    this.results = { level: lv.name, hits: P.hits, score: P.score, bonus, time: this.time, wingmen: alive, rings: P.rings, medal, deflects: P.deflects, deaths: P.deaths, idx: this.levelIdx };
    if (!this.attract) {
      const prev = Save.best[lv.id] || 0; if (P.score > prev) Save.best[lv.id] = P.score;
      const order = { BRONZE: 1, SILVER: 2, GOLD: 3 }; if ((order[Save.medals[lv.id]] || 0) < order[medal]) Save.medals[lv.id] = medal;
      Save.unlocked = Math.max(Save.unlocked, Math.min(LEVELS.length, this.levelIdx + 2)); Save.commit();
    }
    this.finishing = false; this.setState('done');
    if (this.attract) { if (this.onAttractDone) this.onAttractDone(); } else { HUD.show(false); UI.results(this.results); }
  },

  /* ---------- tutorial ---------- */
  updateTutorial(dt) {
    const t = this.tut; if (!t) return; t.t += dt; const P = this.P, b = t.base, s = P.stat;
    if (!t.done) {
      const ok = { move: s.moved - b.moved > 0.7, fire: s.fired - b.fired >= 3, charge: s.locked - b.locked >= 2, roll: s.rolled - b.rolled >= 1, boost: (s.boosted - b.boosted > 0.5) || (s.braked - b.braked > 0.5) }[t.id];
      if (ok || t.t > 16) { t.done = true; t.doneT = 0; if (ok) { Audio.sfx('pickup'); HUD.tut(t.text, true); } }
    } else { t.doneT += dt; if (t.doneT > 1.3) { HUD.tut(null); this.tut = null; } }
  },

  /* ---------- visuals ---------- */
  updateShipVisual(dt) {
    const P = this.P, m = this.shipMesh; if (!m) return;
    m.position.set(P.ox, P.oy, this.pz); m.rotation.z = P.bank; m.rotation.x = P.pitch; m.rotation.y = P.vx * -0.006;
    const ud = m.userData;
    ud.roll.rotation.z = P.rollT > 0 ? -P.rollDir * TAU * Ease.inOut(1 - P.rollT / 0.55) : 0;
    const fl = 1.7 + (P.boosting ? 1.8 : P.braking ? -0.7 : 0) + Math.sin(this.time * 40) * 0.15;
    for (const w of ud.wings) { w.fl.scale.set(fl, fl, 1); w.w.rotation.z = damp(w.w.rotation.z, P.boosting ? -0.12 * w.s : (P.braking ? 0.18 * w.s : 0), 6, dt); }
    ud.core.scale.setScalar(2.2 + (P.boosting ? 1.6 : 0) + P.charge * 3);
    m.visible = P.alive && !(P.invuln > 0 && !this.god && Math.floor(this.time * 18) % 2 === 0);
    if (P.alive) { this.flameT -= dt; if (this.flameT <= 0) { this.flameT = P.boosting ? 0.02 : 0.05; for (const s of [-1, 1]) FX.spawn(_v.set(P.ox + 2.7 * s, P.oy - 0.3, this.pz + 2.2), { v: new THREE.Vector3(0, 0, 14), color: P.boosting ? 0xaaeeff : 0x66ccff, size: P.boosting ? 2.2 : 1.2, life: 0.35, grow: -0.5, op: 0.7 }); } }
    const cm = P.charge > 0; if (cm && Math.random() < 0.5) FX.spawn(_v.set(P.ox + rand(-3, 3), P.oy + rand(-3, 3), this.pz - 4 + rand(-2, 2)), { color: 0x99eeff, size: 1.2, life: 0.25, grow: -0.6, op: 0.9, v: new THREE.Vector3(0, 0, -20) });
  },
  updateCamera(dt) {
    const P = this.P, cam = World.camera, pz = this.pz;
    let tp = _v.set(P.ox * 0.6, P.oy * 0.55 + 4.8, pz + 19 + (P.boosting ? 3 : P.braking ? -2 : 0));
    let look = new THREE.Vector3(P.ox * 0.3, P.oy * 0.35 + 1, pz - 40);
    if (this.state === 'intro') {
      const k = Ease.inOut(clamp(this.introT / 4.2, 0, 1)), s = new THREE.Vector3(P.ox + 15 - this.introT * 1.2, P.oy + 1.5, pz + 2 - this.introT * 3);
      tp = s.lerp(tp.clone(), k); look = new THREE.Vector3(P.ox, P.oy, pz - 5).lerp(look, k); this.camPos.copy(tp);
    } else if (this.state === 'outro') {
      const k = clamp(this.stateT / 3, 0, 1); const side = new THREE.Vector3(P.ox + 20 * k, P.oy + 3, pz + 14 - 12 * k);
      this.camPos.lerp(side, 1 - Math.exp(-2 * dt)); look = new THREE.Vector3(P.ox, P.oy, pz - 4);
    } else if (this.state === 'dead') { /* hold */ look.set(P.ox, P.oy, pz - 6); this.camPos.z += 0; }
    else { this.camPos.x = damp(this.camPos.x, tp.x, 6, dt); this.camPos.y = damp(this.camPos.y, tp.y, 6, dt); this.camPos.z = tp.z; }
    this.camLook.x = damp(this.camLook.x, look.x, 8, dt); this.camLook.y = damp(this.camLook.y, look.y, 8, dt); this.camLook.z = look.z;
    cam.position.copy(this.camPos);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
    const sh = this.shakeAmt * 1.4; cam.position.x += rand(-sh, sh); cam.position.y += rand(-sh, sh);
    if (this.state === 'intro') cam.lookAt(look); else cam.lookAt(this.camLook);
    this.camRoll = damp(this.camRoll, -P.vx * 0.006 + (P.rollT > 0 ? 0 : 0), 4, dt); cam.rotateZ(this.camRoll);
    const fov = P.boosting ? 82 : P.braking ? 58 : 66; cam.fov = damp(cam.fov, this.state === 'intro' ? 55 + 11 * Ease.inOut(clamp(this.introT / 4.2, 0, 1)) : fov, 4, dt); cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    _v.set(P.ox, P.oy, pz - 80).project(cam); this.reticleNdc.set(_v.x, _v.y);
  },

  /* ---------- HUD hooks ---------- */
  comm(who, text, dur, prio) { HUD.comm(who, text, dur || 3, prio); },
  toast(t) { HUD.toast(t); },
  banner(t, s) { HUD.banner(t, s); },
});
