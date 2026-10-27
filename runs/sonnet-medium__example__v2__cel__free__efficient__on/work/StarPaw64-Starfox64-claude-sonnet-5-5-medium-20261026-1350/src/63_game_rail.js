// ---------------------------------------------------------------- Rail mode: events, pilots, enemies, wingmen, boss, shots, bombs
const STATIC_TYPES = new Set(['turret', 'walker']);
function buildEventList(st) { return st.events.map((e) => Object.assign({}, e, { trig: e.s - ((e.t === 'spawn' && STATIC_TYPES.has(e.type)) || e.t === 'obst' || e.t === 'pickup' ? 300 : 0) })).sort((a, b) => a.trig - b.trig); }
const ENEMY_DEFS = {
  drone: { hp: 1, r: 1.8, score: 100, build: () => buildDrone(), size: 0.9, drop: 0.12 },
  turret: { hp: 3, r: 2.2, score: 200, build: buildTurret, size: 1.2, drop: 0.25, static: true },
  walker: { hp: 12, r: 3.6, score: 600, build: buildWalker, size: 2, drop: 0.7, static: true, hpScale: true },
  carrier: { hp: 42, r: 7, score: 2500, build: buildCarrier, size: 4, drop: 1, hpScale: true },
  minicarrier: { hp: 10, r: 4, score: 700, build: () => { const g = buildCarrier(); g.scale.setScalar(0.55); return g; }, size: 2.2, drop: 0.5 },
  missile: { hp: 1, r: 1.5, score: 50, build: buildMissile, size: 0.8, drop: 0 },
  chaser: { hp: 3, r: 1.9, score: 150, build: () => buildDrone(0x5a3a8a, 0xff7a2a), size: 1, drop: 0.2 },
  fighter: { hp: 3, r: 2.2, score: 150, build: () => buildDrone(0xc23a5a, 0xffe23a), size: 1, drop: 0.3, ar: true },
  rival: { hp: 46, r: 2.8, score: 3000, build: buildRival, size: 3, drop: 1, ar: true, hpScale: true },
  bossPart: { hp: 1, r: 3, score: 0, build: () => new THREE.Group(), size: 2, drop: 0 },
};
Object.assign(Game, {
  pan(pos) { const cam = R.cams[0], v = pos.clone().sub(cam.position), l = v.length() || 1, right = V3(1, 0, 0).applyQuaternion(cam.quaternion); return clamp(v.dot(right) / l * 1.4, -1, 1); },
  // ======================================================== RAIL UPDATE
  updateRail(dt) {
    const a = this.a, st = this.st, al = this.alivePilots();
    if (this.state === 'intro' && this.stateT > 3) { this.state = 'play'; }
    let mul = 1; if (al.length) mul = al.reduce((s, p) => s + p.speedMul, 0) / al.length;
    let target = a.base * mul; if (this.boss && !this.boss.dead) target = 14; if (this.state === 'clear') target = 150; if (this.state === 'intro') target = a.base * Math.min(1, 0.3 + this.stateT / 3 * 0.7);
    a.speed = damp(a.speed, target, 2.5, dt); a.s += a.speed * dt;
    while (this.evIdx < this.evs.length && a.s >= this.evs[this.evIdx].trig) this.fireEvent(this.evs[this.evIdx++]);
    for (const p of this.pilots) this.pilotRail(p, dt);
    this.updateWingmenRail(dt); this.updateEnemiesRail(dt); this.updateHazards(dt);
    this.syncPhysics(); this.resolveContacts(dt); this.updateShots(dt); this.updateBombs(dt); this.updatePickups(dt); this.updateObstaclesRail();
    this.followCamera(dt, false);
    if (this.state === 'over') return;
  },
  syncPhysics() { for (const p of this.pilots) if (p.alive) Phys.sync(p); for (const e of this.enemies) if (!e.dead) Phys.sync(e); for (const w of this.wingmen) if (!w.out) Phys.sync(w); for (const k of this.pickups) if (!k.dead) Phys.sync(k); Phys.step(0.0166); },
  fireEvent(ev) {
    const a = this.a, r = this.rail;
    switch (ev.t) {
      case 'spawn': this.spawnEnemy(ev.type, ev); break;
      case 'pickup': { const pos = r.toWorld(ev.s, ev.x, ev.y); this.spawnPickup(ev.kind, pos, { es: ev.s, ex: ev.x, ey: ev.y }); break; }
      case 'obst': this.spawnObstacle(ev); break;
      case 'comm': Comms.say(ev.id); break;
      case 'hint': Hud.hint(ev.id); break;
      case 'banner': Hud.banner(ev.text, ''); A.play('stage'); break;
      case 'chase': this.startChase(ev.n); break;
      case 'boss': this.startBoss(); break;
    }
  },
  // ---- pilot (rail)
  pilotRail(p, dt) {
    const a = this.a, c = p.ctl = p.ai ? p.ctl : Input.ctl(p.dev), r = this.rail, st = this.st;
    p.invuln = Math.max(0, p.invuln - dt); p.crashCd = Math.max(0, p.crashCd - dt); p.ringChainT -= dt; p.hitstun = Math.max(0, p.hitstun - dt); p.fireCd -= dt; p.rollCd -= dt;
    if (!p.alive) { if (!p.out && p.respawnT > 0) { p.respawnT -= dt; if (p.respawnT <= 0) this.respawnPilot(p); } return; }
    const intro = this.state === 'intro', clear = this.state === 'clear', bx = boundsAt(st, a.s) - 1.2, maxV = 31;
    const my = (p.ai ? 1 : Settings.pitchInv ? -1 : 1) * c.my, mx = c.mx;
    const stun = p.hitstun > 0 ? 0.25 : 1;
    p.vx = damp(p.vx, mx * maxV * stun, 7, dt); p.vy = damp(p.vy, my * maxV * 0.85 * stun, 7, dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.x > bx) { p.x = bx; p.vx = Math.min(p.vx, 0); } if (p.x < -bx) { p.x = -bx; p.vx = Math.max(p.vx, 0); }
    if (p.y > 16.5) { p.y = 16.5; p.vy = Math.min(p.vy, 0); } if (p.y < 1.8) { p.y = 1.8; p.vy = Math.max(p.vy, 0); }
    // boost / brake
    const wantBoost = c.boost && !c.brake && p.boostMeter > 0.03 && !clear && p.boostCd <= 0;
    if (wantBoost) { if (!p.boostOn) A.play('boost'); p.boostOn = true; p.boostMeter = Math.max(0, p.boostMeter - dt * 0.5); if (p.boostMeter <= 0.03) p.boostCd = 1.2; p.regenT = 0.8; } else { if (p.boostOn) { p.boostOn = false; } p.regenT = (p.regenT || 0) - dt; p.boostCd -= dt; if (p.regenT <= 0) p.boostMeter = Math.min(1, p.boostMeter + dt * 0.3); }
    if (c.brake && !p.brakeOn) A.play('brake'); p.brakeOn = c.brake;
    p.speedMul = p.boostOn ? 1.7 : c.brake ? 0.55 : 1;
    const pzT = clear ? 70 : intro ? -26 + Math.min(1, this.stateT / 3) * 26 : p.boostOn ? 11 : c.brake ? -8 : 0; p.pz = damp(p.pz, pzT, 3.5, dt);
    // barrel roll
    if ((c.rollL || c.rollR) && p.rollT <= 0 && p.rollCd <= 0 && !intro) { p.rollT = 0.7; p.rollDir = c.rollL ? 1 : -1; p.rollCd = 0.9; A.play('roll'); }
    let rollA = 0; if (p.rollT > 0) { p.rollT -= dt; rollA = p.rollDir * TAU * smooth(clamp(1 - p.rollT / 0.7, 0, 1)); }
    // transform
    const sPos = a.s + p.pz; r.toWorld(sPos, p.x, p.y, p.pos); const head = r.heading(sPos), tilt = p.vx / maxV;
    p.ship.position.copy(p.pos); p.ship.rotation.set(p.vy / maxV * 0.45, head - tilt * 0.28, -tilt * 0.85 + rollA, 'YXZ');
    p.ship.userData.wingL.rotation.z = damp(p.ship.userData.wingL.rotation.z, p.boostOn ? 0.0 : -0.06, 8, dt); p.ship.userData.wingR.rotation.z = damp(p.ship.userData.wingR.rotation.z, p.boostOn ? 0.0 : 0.06, 8, dt);
    for (const gl of p.ship.userData.glows) gl.scale.set(1, p.boostOn ? 2.4 : 1 + Math.sin(this.time * 40) * 0.15, 1);
    if (p.invuln > 0 && p.invuln < 50 && Math.floor(this.time * 20) % 2 === 0) p.ship.visible = false; else p.ship.visible = true;
    // aim
    const sens = Settings.sens, ax = clamp(c.ax * sens, -1, 1), ay = clamp((p.ai ? 1 : Settings.pitchInv ? -1 : 1) * c.ay * sens, -1, 1);
    p.aimX = damp(p.aimX, ax, 14, dt); p.aimY = damp(p.aimY, ay, 14, dt);
    const fwd = r.fwd(sPos), right = r.right(sPos);
    p.reticle.copy(p.pos).addScaledVector(fwd, 75).addScaledVector(right, p.aimX * 32).addScaledVector(V3(0, 1, 0), p.aimY * 22 + (c.mouseAim ? 0 : 0));
    p.aimDir.copy(p.reticle).sub(p.pos).normalize(); this.applyAssist(p);
    this.pilotWeapons(p, dt, c);
    // contact with obstacles
    if (p.crashCd <= 0 && !clear && !this.attract) { const hits = Phys.overlap(p.pos, 1.15, GRP.OBST); if (hits.length) this.crash(p, hits[0]); }
  },
  applyAssist(p) {
    const lvl = Settings.assist; if (!lvl) return; const maxAng = lvl === 1 ? 0.07 : 0.13, blend = lvl === 1 ? 0.45 : 0.8; let best = null, ba = maxAng;
    for (const e of this.enemies) { if (!this.lockable(e)) continue; const to = e.pos.clone().sub(p.pos), d = to.length(); if (d < 8 || d > 220) continue; const ang = Math.acos(clamp(to.normalize().dot(p.aimDir), -1, 1)); if (ang < ba) { ba = ang; best = to; } }
    if (best) p.aimDir.lerp(best, blend * (1 - ba / maxAng)).normalize();
  },
  crash(p, ob) {
    p.crashCd = 1.1; const rel = p.pos.clone().sub(ob.pos || p.pos); this.hurtPilot(p, 22, 'crash'); p.hitstun = 0.5; p.pz -= 3;
    if (this.kind === 'rail') { const s = this.a.s + p.pz, rt = this.rail.right(s); p.vx = clamp(rel.dot(rt), -1, 1) * 22 || sgn(-p.x) * 18; p.vy = rel.y > 0 ? 14 : -4; if (ob.beam) p.vy = ob.beamHigh ? -16 : 18; }
    else { p.bounceV = rel.lengthSq() > 0.01 ? rel.normalize().multiplyScalar(40) : V3(0, 0, 0).sub(p.pos).normalize().multiplyScalar(40); p.bounceT = 0.5; }
    FX.burst(p.pos, 0xb8aee0, 14, 14, 0.7, 0.7, 12); A.play('clang');
  },
  // ---- weapons shared by both modes
  pilotWeapons(p, dt, c) {
    const clear = this.state === 'clear', intro = this.state === 'intro';
    if (clear || intro) { return; }
    if (c.fire && p.fireCd <= 0 && !p.charging) { this.fireLaser(p); p.fireCd = p.wlevel === 3 ? 0.1 : 0.135; }
    // charge / lock-on
    if (c.charge) {
      if (!p.charging) { p.charging = true; p.charge = 0; p.locks = []; A.loopStart('charge', 'sawtooth', 200, 0.08); }
      p.charge = Math.min(1, p.charge + dt / 1.15); p.lockT -= dt; if (p.lockT <= 0) { this.scanLocks(p); p.lockT = 0.08; }
      A.loopSet('charge', 200 + p.charge * 700, 1, 800 + p.charge * 2500);
    } else if (p.charging) { p.charging = false; A.loopStop('charge'); this.fireCharged(p); p.charge = 0; p.locks = []; p.fireCd = 0.35; }
    p.locks = p.locks.filter((e) => !e.dead);
    if (c.bomb && p.bombs > 0) this.launchBomb(p);
    if (c.advice && this.adviceCd <= 0) { this.adviceCd = 4; Comms.advice(); }
  },
  lockable(e) { return !e.dead && !e.armor && e.active !== false && !e.noLock && e.type !== 'bossRoot'; },
  scanLocks(p) {
    if (p.charge < 0.1) return; const maxLocks = 1 + Math.floor(clamp((p.charge - 0.1) / 0.85, 0, 1) * 5.99), cone = Math.cos(this.kind === 'rail' ? 0.2 : 0.24);
    for (const e of this.enemies) {
      if (p.locks.length >= maxLocks) break; if (!this.lockable(e) || p.locks.includes(e)) continue;
      const to = e.pos.clone().sub(p.pos), d = to.length(); if (d < 10 || d > 320) continue; if (to.normalize().dot(p.aimDir) > cone) { p.locks.push(e); A.play('lock', 0, p.locks.length); Input.rumble(p.dev, 0, 0.3, 50); }
    }
  },
  fireLaser(p) {
    const dir = p.aimDir, right = V3().crossVectors(dir, V3(0, 1, 0)).normalize(), lvl = p.wlevel, offs = lvl === 1 ? [0] : [-0.95, 0.95];
    for (const o of offs) this.addShot({ owner: 'p', pilot: p, pos: p.pos.clone().addScaledVector(right, o).addScaledVector(dir, 2.5), vel: dir.clone().multiplyScalar(this.kind === 'rail' ? 230 : 320), dmg: lvl === 3 ? 2 : 1, life: 1.5, kind: 'laser', color: lvl === 3 ? 0x9ff0ff : p.color.accent, size: lvl === 3 ? 0.9 : 0.6, len: lvl === 3 ? 4.5 : 3.2 });
    A.play(lvl === 1 ? 'laser' : lvl === 2 ? 'laser2' : 'laser3', this.kind === 'rail' ? this.pan(p.pos) * 0.5 : 0);
  },
  fireCharged(p) {
    const dir = p.aimDir, right = V3().crossVectors(dir, V3(0, 1, 0)).normalize();
    if (p.locks.length) {
      const burst = { n: 0, locks: p.locks.length };
      p.locks.forEach((e, i) => { const ang = (i / p.locks.length) * TAU, side = right.clone().multiplyScalar(Math.cos(ang)).addScaledVector(V3(0, 1, 0), Math.sin(ang)); this.addShot({ owner: 'p', pilot: p, pos: p.pos.clone().addScaledVector(dir, 2), vel: dir.clone().multiplyScalar(40).addScaledVector(side, 38), dmg: 3, life: 3.2, kind: 'homing', target: e, color: p.color.accent, size: 0.9, len: 2.2, turn: 5.5, speed: 150, burst, delay: 0.05 * i }); });
      A.play('chargeShot', 0); Input.rumble(p.dev, 0.5, 0.9, 200);
    } else if (p.charge > 0.45) {
      this.addShot({ owner: 'p', pilot: p, pos: p.pos.clone().addScaledVector(dir, 3), vel: dir.clone().multiplyScalar(190), dmg: 6, life: 1.7, kind: 'plasma', color: p.color.accent, size: 2.0, len: 4.5, aoe: 7 }); A.play('chargeShot', 0); Input.rumble(p.dev, 0.7, 0.4, 160);
    } else this.fireLaser(p);
  },
  addShot(o) {
    let mesh;
    if (o.owner === 'p') {
      mesh = new THREE.Group(); const core = new THREE.Mesh(G.box(o.size * 0.5, o.size * 0.5, o.len), unlit(0xffffff)), glow = new THREE.Mesh(G.box(o.size, o.size, o.len * 0.9), unlit(o.color, { transparent: true, opacity: 0.85 })); mesh.add(glow, core);
      if (o.kind === 'plasma' || o.kind === 'homing') { const orb = new THREE.Mesh(G.sph(o.size * 0.9, 8, 6), unlit(o.color)); mesh.add(orb); }
    } else {
      mesh = new THREE.Group(); mesh.add(new THREE.Mesh(G.sph(0.8, 8, 6), unlit(o.color || 0xff3a6a)), new THREE.Mesh(G.sph(0.4, 8, 6), unlit(0xffffff))); const ring = new THREE.Mesh(G.tor(1.05, 0.12, 4, 12), unlit(0xffe23a)); mesh.add(ring); o.ring = ring; o.size = o.size || 0.9;
    }
    mesh.position.copy(o.pos); if (o.vel.lengthSq() > 0 && o.owner === 'p') mesh.quaternion.setFromUnitVectors(V3(0, 0, -1), o.vel.clone().normalize());
    R.world.add(mesh); o.mesh = mesh; o.prev = o.pos.clone(); o.age = 0; this.shots.push(o); return o;
  },
  removeShot(s) { R.world.remove(s.mesh); s.dead = true; },
  updateShots(dt) {
    for (const s of this.shots) {
      if (s.dead) continue; s.age += dt; s.life -= dt; if (s.life <= 0) { this.removeShot(s); continue; } if (s.delay > 0) { s.delay -= dt; }
      s.prev.copy(s.pos);
      if (s.kind === 'homing') {
        if (s.target && !s.target.dead) { const want = s.target.pos.clone().sub(s.pos).normalize(), cur = s.vel.clone().normalize(), ang = Math.acos(clamp(cur.dot(want), -1, 1)), step = Math.min(ang, s.turn * dt * (1 + s.age * 1.5)); if (ang > 1e-4) { const axis = cur.clone().cross(want).normalize(); cur.applyAxisAngle(axis, step); } const sp = Math.min(s.speed, s.vel.length() + 400 * dt); s.vel.copy(cur.multiplyScalar(sp)); }
        if (Math.random() < 0.7) FX.spark(s.pos, V3(rr(-2, 2), rr(-2, 2), rr(-2, 2)), s.color, 0.35, 0.5);
      }
      if (s.kind === 'missileShot') { /* enemy homing orb handled as enemy entity */ }
      s.pos.addScaledVector(s.vel, dt); s.mesh.position.copy(s.pos);
      if (s.owner === 'p' && s.vel.lengthSq() > 1) s.mesh.quaternion.setFromUnitVectors(V3(0, 0, -1), s.vel.clone().normalize()); else if (s.ring) { s.ring.rotation.x += dt * 8; s.ring.rotation.y += dt * 5; }
      if (s.kind === 'plasma' && Math.random() < 0.8) FX.spark(s.pos, V3(rr(-3, 3), rr(-3, 3), rr(-3, 3)), s.color, 0.4, 0.8);
      if (s.owner === 'e') { // barrel roll reflection
        let reflected = false;
        for (const p of this.pilots) if (p.alive && p.rollT > 0 && p.pos.distanceToSquared(s.pos) < 60) {
          const tgt = this.enemies.filter((e) => !e.dead && e.type !== 'bossPart' && !e.armor).sort((x, y) => x.pos.distanceToSquared(s.pos) - y.pos.distanceToSquared(s.pos))[0];
          const dir = tgt ? tgt.pos.clone().sub(s.pos).normalize() : s.vel.clone().normalize().negate(); s.owner = 'p'; s.pilot = p; s.kind = 'laser'; s.dmg = 3; s.vel.copy(dir.multiplyScalar(170)); s.life = 2; s.len = 3; s.size = 0.9; s.color = 0x9ff0ff; reflected = true;
          R.world.remove(s.mesh); s.mesh = new THREE.Group(); s.mesh.add(new THREE.Mesh(G.box(0.9, 0.9, 3), unlit(0x9ff0ff)), new THREE.Mesh(G.sph(0.9, 8, 6), unlit(0xffffff))); s.mesh.position.copy(s.pos); R.world.add(s.mesh); FX.burst(s.pos, 0x9ff0ff, 8, 12, 0.4, 0.5); A.play('clang'); this.addScore(p, 20, s.pos, 'REFLECT'); break;
        }
        if (reflected) continue;
      }
      const mask = s.owner === 'p' ? (GRP.ENEMY | GRP.OBST | GRP.GROUND) : (GRP.PLAYER | GRP.WING | GRP.OBST | GRP.GROUND);
      let hit = Phys.ray(s.prev, s.pos, mask); let ent = hit && hit.ent, point = hit && hit.point;
      if (!hit) { const ov = Phys.overlap(s.pos, s.size * 0.7, mask); if (ov.length) { ent = ov[0]; point = s.pos.clone(); hit = { ent, point }; } }
      if (hit) this.shotHit(s, ent, point);
    }
    this.shots = this.shots.filter((s) => !s.dead);
  },
  shotHit(s, ent, point) {
    if (!ent) { FX.burst(point, s.owner === 'p' ? 0xffe23a : 0xff7a5a, 6, 10, 0.3, 0.4); if (s.kind !== 'plasma') this.removeShot(s); else { this.plasmaBurst(s, point); this.removeShot(s); } return; }
    if (ent.kind === 'enemy') {
      if (s.owner !== 'p') return;
      if (s.kind === 'plasma') { this.plasmaBurst(s, point); this.removeShot(s); return; }
      this.hitEnemy(ent, s.dmg, s.pilot, point, s); this.removeShot(s);
    } else if (ent.kind === 'rock' || ent.kind === 'obst') { FX.burst(point, 0xcfc4ee, 5, 9, 0.3, 0.4); A.play('clang', 0, 0.5); if (s.kind === 'plasma') this.plasmaBurst(s, point); this.removeShot(s); }
    else if (ent.slot !== undefined && s.owner === 'e') { if (ent.alive) { this.hurtPilot(ent, s.dmg, 'shot'); FX.burst(point, 0xff5a7a, 5, 8, 0.3, 0.4); this.removeShot(s); } }
    else if (ent.kind === 'wing' && s.owner === 'e') { this.hurtWing(ent, s.dmg); this.removeShot(s); }
  },
  plasmaBurst(s, point) { FX.explosion(point, 1.4, { debris: false }); for (const e of Phys.overlap(point, s.aoe, GRP.ENEMY)) this.hitEnemy(e, e.armor ? 0 : 3, s.pilot, e.pos, s); },
  hitEnemy(e, dmg, pilot, point, shot) {
    if (e.dead) return; if (e.armor) { FX.burst(point || e.pos, 0xcfd4ff, 4, 14, 0.25, 0.35); A.play('clang', this.pan(e.pos), 0.6); return; }
    if (e.active === false) { FX.burst(point || e.pos, 0xcfd4ff, 4, 14, 0.25, 0.35); A.play('clang', this.pan(e.pos), 0.6); return; }
    if (e.invuln > 0) { FX.burst(point || e.pos, 0x9ff0ff, 4, 14, 0.25, 0.35); return; }
    e.hp -= dmg; e.flashT = 0.07; if (pilot) pilot.hits++; A.play('hit', this.pan(e.pos), 0.8); FX.burst(point || e.pos, 0xffe23a, 4, 12, 0.3, 0.4);
    if (e.boss) e.boss.flashT = 0.06;
    if (e.hp <= 0) this.killEnemy(e, pilot, shot);
  },
  killEnemy(e, pilot, shot) {
    if (e.dead) return; e.dead = true; const def = e.def; let pts = def.score;
    if (shot && shot.burst) { shot.burst.n++; pts *= shot.burst.n; if (shot.burst.n > 1) this.popup(e.pos, 'x' + shot.burst.n + '  +' + pts, '#8ae8ff'); else this.popup(e.pos, '+' + pts); } else if (pts) this.popup(e.pos, '+' + pts);
    if (pilot) { pilot.score += pts; pilot.kills++; pilot.stageKills = (pilot.stageKills || 0) + 1; }
    if (def.score) this.stats.kills++;
    const big = def.size >= 2; FX.explosion(e.pos, def.size, { color: e.debrisColor || 0x8a7fae, pan: this.pan(e.pos) }); if (big) { this.shake = Math.max(this.shake, 0.8); FX.ring(e.pos, 0xffe23a, 18 * def.size / 2, 0.6); }
    if (Math.random() < def.drop && this.kind === 'rail' && !e.noDrop) this.spawnPickup(Math.random() < 0.7 ? 'ring' : 'repair', e.pos.clone(), { es: e.es, ex: e.ex, ey: Math.max(3, e.ey || e.pos.y) });
    if (e.onDeath) e.onDeath(e, pilot);
    if (this.kind === 'allrange') this.arOnKill(e, pilot);
    Phys.detach(e); R.world.remove(e.mesh);
  },
  // ---- bombs
  launchBomb(p) {
    p.bombs--; const dir = p.aimDir.clone(); A.play('bomb'); this.flash = 0.9; this.shake = Math.max(this.shake, 1.2); Input.rumble(p.dev, 1, 1, 350);
    const mesh = new THREE.Mesh(G.sph(1, 20, 14), new THREE.MeshBasicNodeMaterial({ color: 0xfff4b0, transparent: true, opacity: 0.45, side: THREE.DoubleSide })); mesh.position.copy(p.pos); R.world.add(mesh);
    this.bombs.push({ pos: p.pos.clone(), dir, t: 0, hit: new Set(), pilot: p, mesh }); FX.ring(p.pos, 0xfff4b0, 60, 0.9);
  },
  updateBombs(dt) {
    for (const b of this.bombs) {
      b.t += dt; b.pos.addScaledVector(b.dir, 60 * dt); const r = 6 + b.t * 52; b.mesh.position.copy(b.pos); b.mesh.scale.setScalar(r); b.mesh.material.opacity = Math.max(0, 0.5 - b.t * 0.33);
      for (const e of Phys.overlap(b.pos, r, GRP.ENEMY)) { if (b.hit.has(e) || e.dead) continue; b.hit.add(e); if (e.armor) continue; this.hitEnemy(e, e.boss ? 14 : 10, b.pilot, e.pos, null); }
      for (const s of this.shots) if (!s.dead && s.owner === 'e' && s.pos.distanceToSquared(b.pos) < r * r) { FX.burst(s.pos, 0xfff4b0, 4, 8, 0.3, 0.4); this.removeShot(s); }
    }
    for (const b of this.bombs) if (b.t > 1.5) { R.world.remove(b.mesh); b.dead = true; } this.bombs = this.bombs.filter((b) => !b.dead);
  },
  // ---- contacts, pickups, obstacles
  resolveContacts(dt) {
    for (const p of this.pilots) {
      if (!p.alive) continue;
      for (const k of Phys.overlap(p.pos, 1.6, GRP.PICKUP)) this.collect(p, k);
      if (p.crashCd <= 0 && this.state !== 'clear') for (const e of Phys.overlap(p.pos, 1.5, GRP.ENEMY)) { if (e.dead || e.active === false && !e.armor) continue; if (e.type === 'bossPart' || e.boss) { this.crash(p, e); break; } this.hurtPilot(p, e.type === 'missile' ? 20 : 12, 'crash'); p.crashCd = 0.8; this.killEnemy(e, p, null); break; }
    }
  },
  updatePickups(dt) {
    for (const k of this.pickups) { if (k.dead) continue; k.t += dt; k.mesh.rotation.y += dt * 2.2; k.mesh.position.y = k.pos.y + Math.sin(k.t * 3) * 0.35; if (this.kind === 'rail') { if (k.es < this.a.s - 40) { this.removePickup(k); } } else { k.life -= dt; if (k.life <= 0) this.removePickup(k); } }
    this.pickups = this.pickups.filter((k) => !k.dead);
  },
  spawnObstacle(ev) {
    const r = this.rail, bx = boundsAt(this.st, ev.s), kind = ev.kind; const heading = r.heading(ev.s), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, heading, 0)), parts = [];
    const add = (mesh, half, lx, ly, flags = {}) => { const pos = r.toWorld(ev.s, lx, ly); mesh.position.copy(pos); mesh.rotation.y = heading; R.world.add(mesh); const e = Object.assign({ kind: 'obst', pos: pos.clone(), mesh, es: ev.s }, flags); Phys.attach(e, { half, group: GRP.OBST, kind: 'fixed', pos, quat: q }); this.obstacles.push(e); };
    const beam = (y0, y1, c, flags) => { const w = bx * 2 + 6; const m = buildBlock(w, y1 - y0, 3.2, c); add(m, [w / 2, (y1 - y0) / 2, 1.6], 0, y0 + (y1 - y0) / 2, Object.assign({ beam: true }, flags)); m.position.y = r.toWorld(ev.s, 0, y0).y; };
    const pillar = (x, h, rad = 1.9) => { const m = buildPillar(h, rad); add(m, [rad, h / 2, rad], x, h / 2, {}); m.position.y = 0; };
    if (kind === 'pillar') pillar(ev.x, ev.h || 22); else if (kind === 'pillarPair') { pillar(-bx - 0.3, 24, 3.5); pillar(bx + 0.3, 24, 3.5); pillar(-bx * 0.55, 24, 2.2); pillar(bx * 0.55, 24, 2.2); }
    else if (kind === 'archHigh') { pillar(-bx - 0.5, 14, 2.4); pillar(bx + 0.5, 14, 2.4); beam(9.5, 13.5, STONE2, { beamHigh: true }); }
    else if (kind === 'archLow') { pillar(-bx - 0.5, 14, 2.4); pillar(bx + 0.5, 14, 2.4); beam(2.2, 6.8, STONE2, {}); }
    else if (kind === 'beamHigh') { beam(8, 12, 0x6f6490, { beamHigh: true }); pillar(-bx - 1, 16, 2.6); pillar(bx + 1, 16, 2.6); }
    else if (kind === 'beamLow') { beam(2.2, 6.2, 0x6f6490, {}); pillar(-bx - 1, 16, 2.6); pillar(bx + 1, 16, 2.6); }
  },
  updateObstaclesRail() { for (const o of this.obstacles) if (!o.gone && o.es < this.a.s - 60) { o.gone = true; R.world.remove(o.mesh); Phys.detach(o); } this.obstacles = this.obstacles.filter((o) => !o.gone); },
  // ---- enemies
  spawnEnemy(type, o = {}) {
    const def = ENEMY_DEFS[type]; if (!def) return null; const a = this.a, mesh = def.build(); R.world.add(mesh);
    const hp = def.hp * (def.hpScale ? this.hpScale() : 1);
    const e = { kind: 'enemy', type, def, hp, maxhp: hp, r: def.r, mesh, pos: V3(), t: 0, cd: rr(0.8, 2.4), dead: false, pat: o.pat || 'swoop', ex0: o.x || 0, ey0: o.y ?? 0, phase: o.phase ?? rr(0, 6), amp: o.amp ?? 3, slow: o.slow, mini: o.mini, flashT: 0, burst: 0, kids: 0, debrisColor: type === 'drone' ? 0xc23a5a : 0x8a7fae };
    e.static = !!def.static; e.es = e.static ? (o.s ?? a.s + 250) : a.s + (o.dist || 250); e.ex = e.ex0; e.ey = e.static ? 0 : e.ey0; e.vs = e.static ? 0 : (type === 'carrier' ? -14 : type === 'minicarrier' ? -16 : e.slow ? -22 : -34);
    if (type === 'minicarrier') { e.ey0 = o.y ?? 14; e.ey = e.ey0; }
    if (this.kind === 'rail' && !o.noCount) this.stats.spawned++;
    this.placeEnemy(e); Phys.attach(e, { r: def.r, group: GRP.ENEMY, pos: e.pos }); this.enemies.push(e); return e;
  },
  placeEnemy(e) { this.rail.toWorld(e.es, e.ex, e.ey, e.pos); e.mesh.position.copy(e.pos); },
  enemyShoot(e, from, tgtPos, speed = 52, dmg = 8, lead = 0.35, tvel) {
    const d = tgtPos.clone(); if (tvel) d.addScaledVector(tvel, from.distanceTo(tgtPos) / speed * lead); const dir = d.sub(from).normalize();
    this.addShot({ owner: 'e', pos: from.clone(), vel: dir.multiplyScalar(speed), dmg, life: 6, kind: 'bolt', color: 0xff3a6a, size: 0.9 }); A.play('enemyShot', this.pan(from), 1);
  },
  pickTarget(e) { // pilots mostly, sometimes wingmen
    const wing = this.wingmen.filter((w) => !w.out && w.pos); if (wing.length && Math.random() < 0.15) return pick(wing); return this.nearestPilot(e.pos) || null;
  },
  updateEnemiesRail(dt) {
    const a = this.a, r = this.rail;
    for (const e of this.enemies) {
      if (e.dead) continue; e.t += dt; const rd = e.es - a.s; const def = e.def;
      if (e.flashT > 0) { e.flashT -= dt; setFlash(e.mesh, true); } else if (e.flashT !== -1) { setFlash(e.mesh, false); e.flashT = -1; } if (e.flashT === 0) e.flashT = -1;
      switch (e.type) {
        case 'drone': case 'chaser': this.aiDroneRail(e, dt, rd); break;
        case 'turret': this.aiTurretRail(e, dt, rd); break;
        case 'walker': this.aiWalkerRail(e, dt, rd); break;
        case 'carrier': case 'minicarrier': this.aiCarrierRail(e, dt, rd); break;
        case 'missile': this.aiMissile(e, dt); break;
        case 'bossRoot': this.aiBoss(e, dt); break;
        case 'bossPart': break;
      }
      if (e.rail !== false && e.type !== 'missile' && e.type !== 'bossRoot' && e.type !== 'bossPart') { this.placeEnemy(e); }
      if (e.type !== 'missile' && e.type !== 'bossRoot' && e.type !== 'bossPart' && rd < -70) { e.dead = true; e.gone = true; Phys.detach(e); R.world.remove(e.mesh); }
      if (e.type === 'missile' && e.life <= 0) { e.dead = true; e.gone = true; Phys.detach(e); R.world.remove(e.mesh); FX.explosion(e.pos, 0.6, { debris: false }); }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  },
  faceBack(e, extra = 0) { e.mesh.rotation.set(0, this.rail.heading(e.es) + Math.PI + extra, 0); },
  aiDroneRail(e, dt, rd) {
    const t = e.t;
    if (e.type === 'chaser') return this.aiChaser(e, dt);
    e.es += e.vs * dt;
    if (e.pat === 'strafe') { const dir = e.ex0 >= 0 ? 1 : -1; e.ex = e.ex0 + dir * clamp((rd - 60) * 0.3, 0, 45) - dir * Math.max(0, 60 - rd) * 0.25; e.ey = e.ey0 + Math.sin(t * 2 + e.phase) * 1; }
    else if (e.pat === 'loop') { e.ex = e.ex0 + Math.sin(t * 1.2 + e.phase) * e.amp; e.ey = e.ey0 + Math.max(0, 55 - rd) * 0.75; }
    else { e.ex = e.ex0 + Math.sin(t * 1.4 + e.phase) * e.amp; e.ey = e.ey0 + Math.cos(t * 1.1 + e.phase) * e.amp * 0.5; }
    this.faceBack(e); e.mesh.rotation.z = Math.sin(t * 1.4 + e.phase) * 0.5; if (e.mesh.userData.spin) e.mesh.userData.spin.rotation.z += dt * 9;
    e.cd -= dt; if (e.cd <= 0 && rd > 28 && rd < 150) { const tg = this.pickTarget(e); if (tg) { this.enemyShoot(e, e.pos, tg.pos, 50, 8, 0.4, tg.vel); } e.cd = rr(1.6, 3.4) * (this.pilots.length > 2 ? 0.8 : 1); }
  },
  aiTurretRail(e, dt, rd) {
    e.ey = 0; e.pos.y = 0; const tg = this.nearestPilot(e.pos), pv = e.mesh.userData.pivot;
    if (tg) { const to = tg.pos.clone().sub(e.pos); const ang = Math.atan2(-to.x, -to.z); pv.rotation.y = ang - e.mesh.rotation.y; pv.rotation.x = clamp(Math.atan2(to.y, Math.hypot(to.x, to.z)), 0, 1.2) * 0; }
    e.mesh.rotation.y = this.rail.heading(e.es);
    e.cd -= dt; if (e.cd <= 0 && rd > 15 && rd < 135 && tg) { this.enemyShoot(e, e.pos.clone().add(V3(0, 2, 0)), tg.pos, 48, 8, 0.45, tg.vel); e.cd = rr(2.0, 3.2); }
  },
  aiWalkerRail(e, dt, rd) {
    const tg = this.nearestPilot(e.pos), u = e.mesh.userData; e.ey = 0;
    const targetX = tg ? tg.x : 0; const prevX = e.ex; e.ex += clamp(targetX - e.ex, -1, 1) * 5 * dt; const moving = Math.abs(e.ex - prevX) / dt > 1;
    u.legs.forEach((l, i) => { l.rotation.x = moving || rd < 140 ? Math.sin(e.t * 3.2 + (i % 2) * Math.PI) * 0.5 : 0; }); u.torso.position.y = 3.6 + Math.sin(e.t * 6.4) * 0.12;
    e.mesh.rotation.y = this.rail.heading(e.es) + Math.PI;
    e.cd -= dt; if (rd > 20 && rd < 150 && tg) { if (e.cd <= 0) { e.burst = 3; e.cd = 3.4; e.bcd = 0; e.volley = (e.volley || 0) + 1; if (e.volley % 3 === 0) this.spawnMissile(e.pos.clone().add(V3(0, 5, 0)), tg); } }
    if (e.burst > 0) { e.bcd -= dt; if (e.bcd <= 0 && tg) { this.enemyShoot(e, e.pos.clone().add(V3(0, 4.8, 0)), tg.pos, 54, 9, 0.5, tg.vel); e.burst--; e.bcd = 0.22; } }
  },
  aiCarrierRail(e, dt, rd) {
    e.es += e.vs * dt; e.vs = rd < 70 ? damp(e.vs, 0, 1, dt) : e.vs; e.ex = e.ex0 + Math.sin(e.t * 0.6) * (e.mini ? 6 : 9); e.ey = e.ey0 + Math.sin(e.t * 0.9) * 1.5; this.faceBack(e); e.mesh.rotation.z = Math.sin(e.t * 0.6) * 0.12;
    const tg = this.nearestPilot(e.pos); e.cd -= dt;
    if (e.cd <= 0 && rd > 20 && rd < 160 && tg) { e.cd = e.mini ? 2.2 : 1.7; this.enemyShoot(e, e.pos.clone().add(V3(-2, 0, 0)), tg.pos, 52, 8, 0.4, tg.vel); if (!e.mini) this.enemyShoot(e, e.pos.clone().add(V3(2, 0, 0)), tg.pos, 52, 8, 0.4, tg.vel); e.volley = (e.volley || 0) + 1; if (!e.mini && e.volley % 4 === 0) this.spawnMissile(e.pos.clone(), tg); }
    if (!e.mini) { e.spawnCd = (e.spawnCd ?? 2) - dt; if (e.spawnCd <= 0 && rd < 170 && e.kids < 7) { e.spawnCd = 3.4; e.kids++; const k = this.spawnEnemy('drone', { x: e.ex + rr(-6, 6), y: e.ey - 2, pat: 'swoop', amp: 4, noCount: true }); if (k) { k.es = e.es - 4; k.ex = e.ex; k.ex0 = clamp(e.ex + rr(-10, 10), -16, 16); k.ey0 = clamp(e.ey - 2, 3, 14); k.vs = -32; } } }
  },
  spawnMissile(pos, target) {
    const e = this.spawnEnemy('missile', { noCount: true, x: 0, y: 0 }); if (!e) return; e.rail = false; e.pos.copy(pos); e.mesh.position.copy(pos); e.vel = V3(0, 0, 0); e.target = target; e.life = 7; e.speed = 66; e.t = 0; this.stats.spawned--; A.play('enemyShot', this.pan(pos), 1.4);
    const tp = target.pos.clone().sub(pos).normalize(); e.vel.copy(tp.multiplyScalar(30)); return e;
  },
  aiMissile(e, dt) {
    e.life -= dt; const tg = e.target && (e.target.alive !== false && !e.target.out) ? e.target : this.nearestPilot(e.pos); if (!tg) return;
    const want = tg.pos.clone().sub(e.pos).normalize(), cur = e.vel.clone().normalize(), ang = Math.acos(clamp(cur.dot(want), -1, 1)), step = Math.min(ang, 1.5 * dt);
    if (ang > 1e-4) cur.applyAxisAngle(cur.clone().cross(want).normalize(), step); e.vel.copy(cur.multiplyScalar(Math.min(e.speed, e.vel.length() + 40 * dt))); e.pos.addScaledVector(e.vel, dt); e.mesh.position.copy(e.pos);
    e.mesh.quaternion.setFromUnitVectors(V3(0, 0, -1), e.vel.clone().normalize()); FX.spark(e.pos.clone().addScaledVector(e.vel.clone().normalize(), -1.5), V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)), 0xffa030, 0.5, 0.8);
    if (e.pos.y < 0.5) e.life = 0;
  },
  aiChaser(e, dt) {
    const w = e.victim; if (!w || w.out) { e.es -= 10 * dt; e.ex += 8 * dt; e.ey += 5 * dt; return; }
    e.es = w.es - 11 + Math.sin(e.t * 1.7 + e.phase) * 3; e.ex = damp(e.ex, w.ex + Math.sin(e.t * 1.3 + e.phase * 2) * 5, 3, dt); e.ey = damp(e.ey, clamp(w.ey + Math.cos(e.t * 1.1 + e.phase) * 3, 2.5, 15), 3, dt);
    this.faceBack(e, Math.PI); e.mesh.rotation.z = Math.sin(e.t * 1.5 + e.phase) * 0.4; if (e.mesh.userData.spin) e.mesh.userData.spin.rotation.z += dt * 9;
    e.cd -= dt; if (e.cd <= 0) { e.cd = rr(1.1, 1.9); this.enemyShoot(e, e.pos, w.pos, 60, 4, 0, null); }
  },
  // ---- wingmen
  setupRailWingmen() {
    const defs = [{ who: 'hop', body: 0xf4f4ea, accent: 0x4cc36b, dx: -13, dy: 9, dz: 26, ears: true }, { who: 'rook', body: 0x4a4263, accent: 0xb35cff, dx: 13, dy: 10, dz: 32 }, { who: 'pip', body: 0xe8ffd8, accent: 0xffd33d, dx: 0, dy: 6, dz: 40 }];
    for (const d of defs) {
      const ship = buildShip({ body: d.body, accent: d.accent, ears: d.ears, scale: 0.95 }); R.world.add(ship);
      const w = { kind: 'wing', who: d.who, ship, hp: d.who === 'pip' ? 80 : 120, maxhp: d.who === 'pip' ? 80 : 120, es: d.dz, ex: d.dx, ey: d.dy, dx: d.dx, dy: d.dy, dz: d.dz, t: rr(0, 6), ph: rr(0, 6), fireCd: rr(0.5, 1.5), out: false, pos: V3(), vel: V3(), chased: false, r: 1.8, outT: 0 };
      this.rail.toWorld(w.es, w.ex, w.ey, w.pos); ship.position.copy(w.pos); Phys.attach(w, { r: 1.8, group: GRP.WING, pos: w.pos }); this.wingmen.push(w);
    }
  },
  updateWingmenRail(dt) {
    const a = this.a, r = this.rail;
    for (const w of this.wingmen) {
      w.t += dt; const prev = w.pos.clone();
      if (w.out) { w.outT += dt; w.es += 30 * dt; w.ey += 12 * dt; w.ex += (w.dx > 0 ? 1 : -1) * 10 * dt; if (w.outT > 2.5 && w.ship.parent) { R.world.remove(w.ship); } }
      else {
        const wob = w.chased ? 11 : 4.5; const tx = w.dx + Math.sin(w.t * 0.7 + w.ph) * wob + (w.chased ? Math.sin(w.t * 2.1) * 4 : 0); w.es = a.s + w.dz + Math.sin(w.t * 0.5 + w.ph) * 3; w.ex = damp(w.ex, clamp(tx, -16, 16), 2.5, dt); w.ey = damp(w.ey, clamp(w.dy + Math.cos(w.t * 0.9 + w.ph) * (w.chased ? 4 : 2), 3, 15), 2.5, dt);
        w.fireCd -= dt; if (w.fireCd <= 0) { let best = null, bd = 1e9; for (const e of this.enemies) { if (e.dead || e.armor || e.type === 'bossRoot' || e.active === false) continue; const rd = e.es !== undefined && e.rail !== false ? e.es - a.s : 999; if (rd < 22 || rd > 140) continue; const d = e.pos.distanceTo(w.pos); if (d < bd) { bd = d; best = e; } } if (best) { const dir = best.pos.clone().sub(w.pos).normalize(); this.addShot({ owner: 'p', pilot: null, pos: w.pos.clone(), vel: dir.multiplyScalar(210), dmg: 1, life: 1.2, kind: 'laser', color: w.who === 'hop' ? 0x4cc36b : w.who === 'rook' ? 0xb35cff : 0xffd33d, size: 0.55, len: 3 }); } w.fireCd = rr(0.5, 1.1); }
      }
      r.toWorld(w.es, w.ex, w.ey, w.pos); w.vel.copy(w.pos).sub(prev).multiplyScalar(1 / Math.max(dt, 0.001));
      w.ship.position.copy(w.pos); const tilt = clamp((w.ex - (w.ex0 ?? w.ex)) * 0, -1, 1); w.ship.rotation.set(0, r.heading(w.es), Math.sin(w.t * 0.7 + w.ph) * 0.35 * (w.chased ? 2 : 1) + tilt, 'YXZ');
      if (w.flashT > 0) { w.flashT -= dt; setFlash(w.ship, true); } else if (w.flashT !== -1) { setFlash(w.ship, false); w.flashT = -1; }
    }
  },
  hurtWing(w, dmg) {
    if (w.out) return; w.hp -= dmg; w.flashT = 0.08; FX.burst(w.pos, 0xff8a3a, 6, 10, 0.4, 0.5); if (w.who === 'pip' && w.chased) Hud.pipHurt = 1;
    if (w.hp <= 0) { w.out = true; Phys.detach(w); FX.explosion(w.pos, 1, { debris: false }); this.stats.wingLost++; if (w.who === 'pip') { this.stats.pipSaved = false; Comms.say('pip_lost', 0.2); for (const c of this.enemies) if (c.type === 'chaser') c.victim = null; } else Comms.say(null, 0, [[w.who, "I'm hit! Falling back!"]]); }
  },
  startChase(n) {
    const pip = this.wingmen.find((w) => w.who === 'pip'); if (!pip || pip.out) return; pip.chased = true; this.stats.pipSaved = null;
    for (let i = 0; i < n; i++) { const c = this.spawnEnemy('chaser', { x: 0, y: 8, phase: i * 2.1, noCount: true }); if (!c) continue; c.victim = pip; c.es = pip.es - 11; c.ex = pip.ex + (i - 1) * 4; c.ey = pip.ey; c.cd = 1 + i * 0.5; this.stats.spawned++; }
    this.chaseWatch = true;
  },
  // ---- hazards (boss stomp shock / laser curtains)
  updateHazards(dt) {
    const a = this.a;
    if (this.chaseWatch && !this.enemies.some((e) => e.type === 'chaser' && !e.dead)) { this.chaseWatch = false; const pip = this.wingmen.find((w) => w.who === 'pip'); if (pip && !pip.out) { pip.chased = false; this.stats.pipSaved = true; Comms.say('pip_saved'); for (const p of this.pilots) this.addScore(p, 500, null); } }
    for (const hz of this.hazards) {
      hz.t += dt;
      if (hz.type === 'shock') { hz.es += hz.vs * dt; const pos = this.rail.toWorld(hz.es, 0, 0.6); hz.mesh.position.copy(pos); hz.mesh.rotation.y = this.rail.heading(hz.es); hz.mesh.scale.y = 1 + Math.sin(hz.t * 20) * 0.15; for (const p of this.pilots) if (p.alive && !hz.hit.has(p) && Math.abs(this.a.s + p.pz - hz.es) < 2.8 && p.y < 5.2) { hz.hit.add(p); this.hurtPilot(p, 16, 'crash'); } if (hz.es < a.s - 10) hz.dead = true; }
      else if (hz.type === 'curtain') {
        const tele = hz.t < hz.tele, firing = !tele && hz.t < hz.tele + 0.9; hz.es = a.s + 35; const pos = this.rail.toWorld(hz.es, hz.x, 20); hz.mesh.position.copy(pos); hz.mesh.rotation.y = this.rail.heading(hz.es);
        hz.mesh.material.opacity = tele ? 0.18 + Math.sin(hz.t * 18) * 0.08 : firing ? 0.8 : 0; hz.mesh.material.color.set(tele ? 0xff3a3a : 0xffffff);
        if (!hz.fired && !tele) { hz.fired = true; A.play('beam', 0); this.shake = 1; }
        if (firing) for (const p of this.pilots) if (p.alive && Math.abs(p.x - hz.x) < hz.w / 2 + 0.8) this.hurtPilot(p, 14 * dt * 3.2 + 0.001, 'crash');
        if (hz.t > hz.tele + 1) hz.dead = true;
      }
    }
    for (const hz of this.hazards) if (hz.dead) R.world.remove(hz.mesh); this.hazards = this.hazards.filter((h) => !h.dead);
  },
  // ---- boss
  startBoss() {
    const a = this.a, g = buildBoss(); R.world.add(g); const sc = this.hpScale();
    const boss = { kind: 'enemy', type: 'bossRoot', def: ENEMY_DEFS.bossPart, mesh: g, es: a.s + 170, ex: 0, ey: 0, t: 0, phase: 0, hp: 1, maxhp: 1, pos: V3(), dead: false, active: false, noLock: true, parts: [], dist: 170, noDrop: true, flashT: -1, cdA: 2.5, cdB: 7, cdC: 11, cdD: 8, coreOpen: false, openT: 0, burstN: 0, bcd: 0, r: 0 };
    const mkPart = (name, hp, r, armor, score) => { const p = { kind: 'enemy', type: 'bossPart', def: { hp, r, score, size: score ? 2.4 : 1, drop: 0, build: null }, part: name, boss, hp: hp * sc, maxhp: hp * sc, r, mesh: new THREE.Group(), pos: V3(), dead: false, armor, active: !armor && name !== 'core', flashT: -1, noDrop: true }; p.def = { hp, r, score, size: score ? 2.8 : 1, drop: 0 }; Phys.attach(p, { r, group: GRP.ENEMY, pos: p.pos }); this.enemies.push(p); boss.parts.push(p); return p; };
    boss.cannonL = mkPart('cannonL', 26, 3.2, false, 1500); boss.cannonR = mkPart('cannonR', 26, 3.2, false, 1500); boss.core = mkPart('core', 60, 2.6, false, 8000); boss.pBody = mkPart('body', 1, 7.5, true, 0); boss.pHead = mkPart('head', 1, 4.2, true, 0);
    boss.cannonL.active = boss.cannonR.active = false; boss.core.active = false; boss.core.armor = true; boss.cannonL.armor = boss.cannonR.armor = true;
    for (const p of [boss.cannonL, boss.cannonR]) p.onDeath = () => { if (boss.cannonL.dead && boss.cannonR.dead) this.bossPhase(2); };
    boss.core.onDeath = () => this.bossDie(boss); boss.core.noLock = false;
    this.boss = boss; this.enemies.push(boss); this.placeEnemy(boss); Hud.bossBar = { boss, name: 'GNARLBOT MK-IV' }; Music.play('boss'); Comms.say('boss_intro', 0.6); A.play('warn'); Hud.alert('WARNING', '#ff5b6b', 2.4);
  },
  bossPhase(n) {
    const b = this.boss; if (!b || b.dead) return; b.phase = n;
    if (n === 2) { Comms.say('boss_cannons'); b.coreOpen = true; b.openT = 0; A.play('shield'); b.cdA = 2; this.shake = 1; }
    if (n === 3) { Comms.say('boss_half'); }
  },
  aiBoss(b, dt) {
    const a = this.a, g = b.mesh, u = g.userData, tgs = this.alivePilots(); if (!tgs.length) return; b.t += dt;
    b.dist = b.phase === 0 ? damp(b.dist, 112, 0.9, dt) : 112 + Math.sin(b.t * 0.3) * 6; b.es = a.s + b.dist; b.ex = Math.sin(b.t * 0.33) * (b.phase >= 3 ? 14 : 10);
    if (b.phase === 0 && b.t > 4.2) { b.phase = 1; b.cannonL.armor = b.cannonR.armor = false; b.cannonL.active = b.cannonR.active = true; }
    this.rail.toWorld(b.es, b.ex, 0, b.pos); g.position.copy(b.pos); g.rotation.y = this.rail.heading(b.es) + Math.PI;
    // procedural animation: walk cycle + breathing + arm sway + jaw
    u.legs.forEach((l, i) => { l.rotation.x = Math.sin(b.t * 2.2 + i * Math.PI) * 0.45; }); u.hip.position.y = 11 + Math.abs(Math.sin(b.t * 2.2)) * 0.6; u.head.rotation.y = Math.sin(b.t * 0.7) * 0.25; u.head.rotation.z = Math.sin(b.t * 0.5) * 0.06;
    u.cannons.forEach((c, i) => { c.rotation.y = Math.sin(b.t * 0.9 + i * 2) * 0.18; c.rotation.x = Math.sin(b.t * 1.1 + i) * 0.06; });
    const jawT = b.coreOpen ? 0.75 : 0; u.jaw.rotation.x = damp(u.jaw.rotation.x, jawT, 5, dt); const pulse = 1 + Math.sin(b.t * 9) * 0.12; u.core.scale.setScalar(b.coreOpen ? pulse : 0.6); u.eyes.forEach((e) => e.scale.setScalar(1 + Math.sin(b.t * 6) * 0.15));
    if (b.flashT > 0) { b.flashT -= dt; setFlash(g, true); } else if (b.flashT !== -1) { setFlash(g, false); b.flashT = -1; }
    g.updateMatrixWorld(true);
    // part colliders follow animated rig
    const wp = (obj, off) => obj.localToWorld(off.clone());
    b.cannonL.pos.copy(wp(u.cannons[0], V3(0, 0, -4.5))); b.cannonR.pos.copy(wp(u.cannons[1], V3(0, 0, -4.5))); b.core.pos.copy(wp(u.core, V3(0, 0, 0))); b.pBody.pos.copy(wp(u.torso, V3(0, 0, 0))); b.pHead.pos.copy(wp(u.head, V3(0, 0, -1)));
    if (b.cannonL.dead && !b.cannonL.vis) { b.cannonL.vis = true; u.cannons[0].visible = false; } if (b.cannonR.dead && !b.cannonR.vis) { b.cannonR.vis = true; u.cannons[1].visible = false; }
    if (b.phase === 0) return;
    const tg = pick(tgs), fire = (from, tgt, spd = 56, dmg = 9) => this.enemyShoot({ pos: from }, from, tgt.pos, spd, dmg, 0.45, tgt.vel), rate = b.phase >= 3 ? 1.5 : 1;
    // shoulder cannons: aimed bursts
    if (!(b.cannonL.dead && b.cannonR.dead)) { b.cdA -= dt * rate; if (b.cdA <= 0) { b.cdA = 2.3; b.burstN = 3; b.bcd = 0; b.side = (b.side || 0) ^ 1; } }
    if (b.burstN > 0) { b.bcd -= dt; if (b.bcd <= 0) { const c = b.side ? b.cannonR : b.cannonL; const c2 = b.side ? b.cannonL : b.cannonR; const src = !c.dead ? c : !c2.dead ? c2 : null; if (src) { fire(src.pos.clone(), tg); } b.burstN--; b.bcd = 0.2; } }
    // core spread (phase 2+)
    if (b.phase >= 2 && b.coreOpen) { b.cdB -= dt * rate; if (b.cdB <= 0) { b.cdB = 1.9; const base = tg.pos.clone().sub(b.core.pos).normalize(); for (let i = -3; i <= 3; i++) { const d = base.clone().applyAxisAngle(V3(0, 1, 0), i * 0.13); this.addShot({ owner: 'e', pos: b.core.pos.clone(), vel: d.multiplyScalar(48), dmg: 7, life: 6, kind: 'bolt', color: 0xff3a9a, size: 0.9 }); } A.play('enemyShot', 0, 1.5); } }
    else if (b.phase === 1) { b.cdB -= dt; if (b.cdB <= 0) { b.cdB = 7.5; this.spawnMissile(b.cannonL.dead ? b.pHead.pos.clone() : b.cannonL.pos.clone(), tg); this.spawnMissile(b.cannonR.dead ? b.pHead.pos.clone() : b.cannonR.pos.clone(), pick(tgs)); } }
    // stomp shockwave
    b.cdC -= dt * rate; if (b.cdC <= 0) { b.cdC = b.phase === 1 ? 11 : 9; u.legs[0].rotation.x = -0.9; A.play('stomp'); this.shake = 1.1; const w = this.rail.right(0), mesh = new THREE.Mesh(G.box(boundsAt(this.st, a.s) * 2 + 24, 1.4, 2.4), new THREE.MeshBasicNodeMaterial({ color: 0xff9a2a })); R.world.add(mesh); this.hazards.push({ type: 'shock', es: b.es - 8, vs: -42, t: 0, mesh, hit: new Set() }); FX.ring(b.pos, 0xff9a2a, 22, 0.6); if (!this.hintsShown.shock) { this.hintsShown.shock = true; Hud.hint('shock'); } }
    // laser curtain
    if (b.phase >= 2) { b.cdD -= dt * rate; if (b.cdD <= 0) { b.cdD = b.coreOpen ? 11 : 6; const mat = new THREE.MeshBasicNodeMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }), w = 6.4, mesh = new THREE.Mesh(G.box(w, 40, 90), mat); R.world.add(mesh); const x = clamp(tg.x, -boundsAt(this.st, a.s) + 3, boundsAt(this.st, a.s) - 3); this.hazards.push({ type: 'curtain', x, w, t: 0, tele: 1.5, es: a.s + 35, mesh }); A.play('warn'); if (!this.hintsShown.beam) { this.hintsShown.beam = true; Comms.say('boss_beam'); } } }
    // core open/close cycle
    if (b.phase >= 2 && !b.core.dead) { b.openT += dt; if (b.coreOpen && b.openT > 11) { b.coreOpen = false; b.openT = 0; b.cdD = 0.4; } else if (!b.coreOpen && b.openT > 3.8) { b.coreOpen = true; b.openT = 0; A.play('shield'); } b.core.active = b.coreOpen; b.core.armor = !b.coreOpen; }
    if (b.phase === 2 && b.core.hp < b.core.maxhp * 0.5) this.bossPhase(3);
  },
  bossDie(b) {
    if (b.dead) return; b.dead = true; this.boss.dying = true; this.stats.kills += 5; Hud.bossBar = null; Music.stop(true); Comms.say('boss_dead', 0.5); this.state = 'bossdeath'; this.stateT = 0;
    for (const e of this.enemies) if (e.type === 'missile') e.life = 0; for (const s of this.shots) if (s.owner === 'e') this.removeShot(s);
    for (let n = 1; n <= 14; n++) this.after(0.26 * n, () => { const p = b.pos.clone().add(V3(rr(-6, 6), rr(2, 20), rr(-5, 5))); FX.explosion(p, rr(1.5, 3.2), { color: 0x7c64b4 }); this.shake = 1.2; });
    this.after(0.26 * 15, () => { FX.explosion(b.pos.clone().add(V3(0, 10, 0)), 7, { color: 0x7c64b4 }); FX.ring(b.pos.clone().add(V3(0, 10, 0)), 0xffe23a, 80, 1.2); b.mesh.visible = false; for (const q of b.parts) { q.dead = true; Phys.detach(q); } for (const p of this.pilots) this.addScore(p, 5000 / this.pilots.length, null); this.stageClear(); });
  },
});
