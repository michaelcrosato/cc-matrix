// ---------------------------------------------------------------- All-range mode: free flight, U-turn/loop, fighters, rival ace, wingmen
const UP = V3(0, 1, 0), ZERO = V3(0, 0, 0), _m4 = new THREE.Matrix4(), _eu = new THREE.Euler(), _q = new THREE.Quaternion();
function orientTo(mesh, dir, roll = 0, k = 1) { _m4.lookAt(ZERO, dir, UP); _q.setFromRotationMatrix(_m4); if (roll) _q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), roll)); if (k >= 1) mesh.quaternion.copy(_q); else mesh.quaternion.slerp(_q, k); }
function steerDir(dir, want, rate, dt) { const ang = Math.acos(clamp(dir.dot(want), -1, 1)); if (ang < 1e-4) return 0; const step = Math.min(ang, rate * dt), axis = dir.clone().cross(want); if (axis.lengthSq() < 1e-8) axis.set(0, 1, 0); axis.normalize(); const before = dir.clone(); dir.applyAxisAngle(axis, step).normalize(); return before.cross(dir).y / Math.max(dt, 1e-4); }
const ARENA_R = 400;
Object.assign(Game, {
  updateAR(dt) {
    if (this.state === 'intro' && this.stateT > 3) this.state = 'play';
    for (const p of this.pilots) this.pilotAR(p, dt);
    this.updateWingmenAR(dt); this.updateEnemiesAR(dt); if (this.state === 'play') this.updateARFlow(dt);
    this.syncPhysics(); this.resolveContacts(dt); this.updateShots(dt); this.updateBombs(dt); this.updatePickups(dt);
    for (const r of this.env.rocks) r.m.rotation.x += r.spin.x * dt, r.m.rotation.y += r.spin.y * dt;
    this.followCamera(dt, false);
    if (this.env.stars) this.env.stars.position.copy(R.cams[0].position);
  },
  setupARWingmen() {
    const defs = [{ who: 'hop', body: 0xf4f4ea, accent: 0x4cc36b, ears: true }, { who: 'rook', body: 0x4a4263, accent: 0xb35cff }, { who: 'pip', body: 0xe8ffd8, accent: 0xffd33d }];
    defs.forEach((d, i) => {
      const ship = buildShip({ body: d.body, accent: d.accent, ears: d.ears, scale: 0.95 }); R.world.add(ship);
      const w = { kind: 'wing', who: d.who, ship, hp: d.who === 'pip' ? 80 : 120, maxhp: d.who === 'pip' ? 80 : 120, pos: V3(Math.cos(i * 2.1) * 70, rr(-10, 10), Math.sin(i * 2.1) * 70), dir: V3(0, 0, -1), speed: 60, t: rr(0, 6), ph: rr(0, 6), fireCd: 1, out: false, vel: V3(), chased: false, outT: 0, r: 1.8, ar: true };
      ship.position.copy(w.pos); Phys.attach(w, { r: 1.8, group: GRP.WING, pos: w.pos }); this.wingmen.push(w);
    });
  },
  // ---- player flight
  pilotAR(p, dt) {
    const c = p.ctl = p.ai ? p.ctl : Input.ctl(p.dev);
    p.invuln = Math.max(0, p.invuln - dt); p.crashCd = Math.max(0, p.crashCd - dt); p.hitstun = Math.max(0, p.hitstun - dt); p.fireCd -= dt; p.rollCd -= dt; p.manCd = (p.manCd || 0) - dt; p.ringChainT -= dt;
    if (!p.alive) { if (!p.out && p.respawnT > 0) { p.respawnT -= dt; if (p.respawnT <= 0) this.respawnPilot(p); } return; }
    const intro = this.state === 'intro', clear = this.state === 'clear', my = (p.ai ? 1 : Settings.pitchInv ? -1 : 1) * c.my;
    // maneuvers: boost + stick down = U-turn, boost + stick up = loop
    if (!p.man && c.boost && p.manCd <= 0 && !intro && !clear && Math.abs(c.my) > 0.85) { p.man = { type: c.my < 0 ? 'uturn' : 'loop', t: 0, dur: c.my < 0 ? 0.95 : 1.5, yaw0: p.yaw, pitch0: p.pitch }; p.manCd = 2; A.play('uturn'); }
    let manRoll = 0;
    if (p.man) {
      const m = p.man; m.t += dt; const k = clamp(m.t / m.dur, 0, 1);
      if (m.type === 'uturn') { p.yaw = m.yaw0 + Math.PI * smooth(k); p.pitch = m.pitch0 * (1 - k) + Math.sin(k * Math.PI) * 0.4; manRoll = -Math.sin(k * Math.PI) * 1.5; }
      else { p.pitch = m.pitch0 + TAU * smooth(k); }
      if (k >= 1) { if (m.type === 'loop') p.pitch = m.pitch0; p.man = null; }
    } else if (!intro) {
      p.yaw -= c.mx * 1.9 * dt * (p.hitstun > 0 ? 0.3 : 1); p.pitch = clamp(p.pitch + my * 1.55 * dt, -1.25, 1.25);
      if (Math.abs(c.my) < 0.1) p.pitch = damp(p.pitch, 0, 0.35, dt);
    }
    if (p.pitch > Math.PI) p.pitch -= TAU; if (p.pitch < -Math.PI) p.pitch += TAU;
    // arena boundary
    const dist = p.pos.length(); p.outside = dist > ARENA_R;
    if (p.outside && !p.man) { const want = p.pos.clone().negate().normalize(), wy = Math.atan2(-want.x, -want.z); p.yaw += clamp(wrapPi(wy - p.yaw), -1, 1) * 3.2 * dt; p.pitch = damp(p.pitch, Math.asin(clamp(want.y, -1, 1)), 2.5, dt); if (!p.outWarn || this.time - p.outWarn > 4) { p.outWarn = this.time; A.play('warn'); } }
    // speed
    const wantBoost = c.boost && !c.brake && p.boostMeter > 0.03 && p.boostCd <= 0 && !p.man && !clear;
    if (wantBoost) { if (!p.boostOn) A.play('boost'); p.boostOn = true; p.boostMeter = Math.max(0, p.boostMeter - dt * 0.4); if (p.boostMeter <= 0.03) p.boostCd = 1.2; p.regenT = 0.8; } else { p.boostOn = false; p.regenT = (p.regenT || 0) - dt; p.boostCd -= dt; if (p.regenT <= 0) p.boostMeter = Math.min(1, p.boostMeter + dt * 0.3); }
    if (c.brake && !p.brakeOn) A.play('brake'); p.brakeOn = c.brake;
    const spT = intro ? 40 : p.boostOn || p.man ? 105 : c.brake ? 30 : 58; p.speed = damp(p.speed, spT, 2.6, dt); p.speedMul = p.speed / 58;
    // roll
    if ((c.rollL || c.rollR) && p.rollT <= 0 && p.rollCd <= 0 && !intro) { p.rollT = 0.7; p.rollDir = c.rollL ? 1 : -1; p.rollCd = 0.9; A.play('roll'); }
    let rollA = 0; if (p.rollT > 0) { p.rollT -= dt; rollA = p.rollDir * TAU * smooth(clamp(1 - p.rollT / 0.7, 0, 1)); }
    p.bank = damp(p.bank || 0, -c.mx * 0.75, 6, dt);
    const fwd = V3(0, 0, -1).applyEuler(_eu.set(p.pitch, p.yaw, 0, 'YXZ'));
    p.vel.copy(fwd).multiplyScalar(p.speed); p.pos.addScaledVector(p.vel, dt);
    if (p.bounceT > 0) { p.bounceT -= dt; p.pos.addScaledVector(p.bounceV, dt * (p.bounceT / 0.5)); }
    p.ship.position.copy(p.pos); p.ship.rotation.set(p.pitch, p.yaw, p.bank + rollA + manRoll, 'YXZ');
    for (const gl of p.ship.userData.glows) gl.scale.set(1, p.boostOn || p.man ? 2.4 : 1 + Math.sin(this.time * 40) * 0.15, 1);
    if (p.invuln > 0 && p.invuln < 50 && Math.floor(this.time * 20) % 2 === 0) p.ship.visible = false; else p.ship.visible = true;
    // aim: stick-relative fine aim cone
    const sens = Settings.sens, ax = clamp(c.ax * sens, -1, 1), ay = clamp((p.ai ? 1 : Settings.pitchInv ? -1 : 1) * c.ay * sens, -1, 1); p.aimX = damp(p.aimX, ax, 14, dt); p.aimY = damp(p.aimY, ay, 14, dt);
    const qs = p.ship.quaternion; p.aimDir.set(p.aimX * 0.17, p.aimY * 0.12, -1).normalize().applyQuaternion(qs); p.reticle.copy(p.pos).addScaledVector(p.aimDir, 130); this.applyAssist(p);
    this.pilotWeapons(p, dt, c);
    // tail warning (any enemy behind within 260 units)
    p.tailed = false; for (const e of this.enemies) { if (e.dead || e.type !== 'fighter' && e.type !== 'rival') continue; const to = e.pos.clone().sub(p.pos), d = to.length(); if (d < 260 && d > 5 && to.normalize().dot(fwd) < -0.8 && e.dir.dot(fwd) > 0.3) { p.tailed = true; break; } }
    if (p.tailed) { p.tailT = (p.tailT || 0) + dt; if (p.tailT > 0.2 && (p.tailBeep || 0) < this.time) { p.tailBeep = this.time + 0.9; A.play('tail'); } if (p.tailT > 2 && !this.hintsShown.tail) { this.hintsShown.tail = true; Comms.say('ar_tail'); Hud.hint('uturn'); } } else p.tailT = 0;
    if (p.crashCd <= 0 && !clear && !this.attract) { const hits = Phys.overlap(p.pos, 1.3, GRP.OBST); if (hits.length) this.crash(p, hits[0]); }
  },
  camAR(dt, snap) {
    const n = this.pilots.length; let avg = V3();
    for (let i = 0; i < n; i++) {
      const p = this.pilots[i]; while (R.cams.length <= i) R.cams.push(new THREE.PerspectiveCamera(70, 1, 0.5, 2600)); const cam = R.cams[i], cs = p.cam;
      if (!cs.init || snap) { cs.yaw = p.yaw; cs.pitch = p.pitch; cs.init = true; }
      const k = dt ? 1 - Math.exp(-6.5 * dt) : 1; cs.yaw += wrapPi(p.yaw - cs.yaw) * k; cs.pitch += wrapPi(p.pitch - cs.pitch) * k;
      const q = _q.setFromEuler(_eu.set(cs.pitch, cs.yaw, (p.bank || 0) * -0.25, 'YXZ')).clone(); const intro = this.state === 'intro' ? Math.max(0, 1 - this.stateT / 3) : 0;
      const off = V3(0, 3.1 + intro * 6, 13.5 + (p.boostOn ? 4 : 0) + intro * 12).applyQuaternion(q); cam.position.copy(p.pos).add(off); cam.quaternion.copy(q);
      if (Settings.shake && this.shake > 0) cam.position.add(V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).multiplyScalar(this.shake * 0.8));
      const fov = 66 + (p.boostOn || p.man ? 14 : 0) + (p.brakeOn ? -6 : 0); cam.fov = damp(cam.fov, fov, 4, dt || 0.016); cam.updateProjectionMatrix(); avg.add(p.pos);
    }
    avg.multiplyScalar(1 / Math.max(1, n)); R.followSun(avg);
  },
  // ---- enemies
  spawnFighter(o = {}) {
    const al = this.alivePilots(), center = al.length ? pick(al).pos : V3(); const def = ENEMY_DEFS.fighter, mesh = def.build(); R.world.add(mesh); mesh.scale.setScalar(1.35);
    const dir = V3(rr(-1, 1), rr(-0.4, 0.4), rr(-1, 1)).normalize(), pos = o.pos || center.clone().addScaledVector(dir, rr(260, 340)); if (!o.pos && pos.length() > ARENA_R - 30) pos.multiplyScalar((ARENA_R - 40) / pos.length());
    const e = { kind: 'enemy', type: 'fighter', def, hp: def.hp, maxhp: def.hp, r: def.r, mesh, pos, dir: center.clone().sub(pos).normalize(), speed: 62, state: 'chase', stateT: 0, cd: rr(1, 2.5), dead: false, t: 0, flashT: -1, rail: false, ar: true, breakDir: V3(), bank: 0, victim: o.victim || null, debrisColor: 0xc23a5a, jink: 0 };
    mesh.position.copy(pos); Phys.attach(e, { r: def.r * 1.2, group: GRP.ENEMY, pos: e.pos }); this.enemies.push(e); this.stats.spawned++; return e;
  },
  spawnRival() {
    const def = ENEMY_DEFS.rival, mesh = def.build(); R.world.add(mesh); const al = this.alivePilots(), center = al.length ? al[0].pos : V3();
    const pos = center.clone().add(V3(rr(-1, 1), 0.1, rr(-1, 1)).normalize().multiplyScalar(300)); const hp = def.hp * this.hpScale();
    const e = { kind: 'enemy', type: 'rival', def, hp, maxhp: hp, r: def.r, mesh, pos, dir: center.clone().sub(pos).normalize(), speed: 88, state: 'chase', stateT: 0, cd: 1.5, dead: false, t: 0, flashT: -1, rail: false, ar: true, breakDir: V3(), bank: 0, debrisColor: 0x3a2d52, jink: 0, invuln: 0, thresholds: [0.66, 0.33], dodgeCd: 4 };
    mesh.position.copy(pos); Phys.attach(e, { r: def.r, group: GRP.ENEMY, pos: e.pos }); this.enemies.push(e); this.rival = e; Hud.bossBar = { boss: e, name: 'NIGHT CLAW' }; this.stats.spawned++; return e;
  },
  arShoot(e, dmg = 6, speed = 175) {
    const tg = e.victim && !e.victim.out ? e.victim : this.nearestPilot(e.pos); if (!tg) return; const nose = e.pos.clone().addScaledVector(e.dir, 3.2), right = V3().crossVectors(e.dir, UP).normalize();
    const lead = tg.vel ? tg.pos.clone().addScaledVector(tg.vel, nose.distanceTo(tg.pos) / speed * 0.5) : tg.pos.clone(); const dir = lead.sub(nose).normalize(); dir.lerp(e.dir, 0.35).normalize();
    const offs = e.type === 'rival' ? [-0.9, 0.9] : [0];
    for (const o of offs) this.addShot({ owner: 'e', pos: nose.clone().addScaledVector(right, o), vel: dir.clone().multiplyScalar(speed), dmg, life: 3.2, kind: 'bolt', color: e.type === 'rival' ? 0xffa030 : 0xff3a6a, size: 0.9 });
    A.play('enemyShot', this.pan(nose) * 0.6, 1);
  },
  updateEnemiesAR(dt) {
    for (const e of this.enemies) {
      if (e.dead) continue; e.t += dt; if (e.flashT > 0) { e.flashT -= dt; setFlash(e.mesh, true); } else if (e.flashT !== -1) { setFlash(e.mesh, false); e.flashT = -1; }
      if (e.type === 'missile') { this.aiMissile(e, dt); if (e.life <= 0) { e.dead = true; Phys.detach(e); R.world.remove(e.mesh); FX.explosion(e.pos, 0.6, { debris: false }); } continue; }
      const rival = e.type === 'rival', tg = e.victim && !e.victim.out ? e.victim : this.nearestPilot(e.pos); if (!tg) { e.pos.addScaledVector(e.dir, e.speed * dt); e.mesh.position.copy(e.pos); continue; }
      const to = tg.pos.clone().sub(e.pos), dist = to.length(), tvel = tg.vel || ZERO, aimP = tg.pos.clone().addScaledVector(tvel, dist / 170 * 0.3), des = aimP.sub(e.pos).normalize();
      e.stateT -= dt; let turn = rival ? 2.3 : e.victim ? 1.9 : 1.55, spT = rival ? 90 : e.victim ? 74 : 62, bankT = 0;
      if (e.state === 'chase') {
        bankT = steerDir(e.dir, des, turn, dt);
        if (dist < (rival ? 55 : 42) && Math.random() < 0.5) { e.state = 'break'; e.stateT = rr(1.4, 2.6); e.breakDir.set(rr(-1, 1), rr(-0.6, 0.6), rr(-1, 1)).normalize(); const away = e.pos.clone().sub(tg.pos).normalize(); e.breakDir.addScaledVector(away, 1.4).normalize(); }
        e.cd -= dt; const ang = Math.acos(clamp(e.dir.dot(des), -1, 1));
        if (e.cd <= 0 && dist < 380 && ang < 0.1 && this.state !== 'clear') { this.arShoot(e, rival ? 7 : 6); e.cd = rival ? rr(0.35, 0.6) : rr(0.7, 1.25); }
      } else if (e.state === 'break') { bankT = steerDir(e.dir, e.breakDir, 2.0, dt); spT *= 1.1; if (e.stateT <= 0) e.state = 'chase'; }
      // dodge rolls / jinks when targeted
      for (const p of this.pilots) { if (!p.alive || e.jink > 0) continue; const toE = e.pos.clone().sub(p.pos); const d = toE.length(); if (d < 280 && toE.normalize().dot(p.aimDir) > 0.994 && Math.random() < (rival ? 0.9 : 0.5) * dt * 3) { e.jink = 0.55; e.jinkDir = Math.random() < 0.5 ? 1 : -1; e.breakDir.copy(V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize()); if (rival) e.invuln = 0.55; } }
      let rollA = 0; if (e.jink > 0) { e.jink -= dt; const side = V3().crossVectors(e.dir, UP).normalize().multiplyScalar(e.jinkDir * 14 * dt); e.pos.add(side); e.pos.y += e.breakDir.y * 12 * dt; rollA = e.jinkDir * TAU * smooth(1 - e.jink / 0.55); }
      if (e.invuln > 0) e.invuln -= dt;
      if (e.pos.length() > ARENA_R + 20) steerDir(e.dir, e.pos.clone().negate().normalize(), 2.6, dt);
      e.speed = damp(e.speed, spT, 2, dt); e.pos.addScaledVector(e.dir, e.speed * dt); e.bank = damp(e.bank, clamp(-bankT * 0.5, -1.1, 1.1), 5, dt);
      e.mesh.position.copy(e.pos); orientTo(e.mesh, e.dir, e.bank + rollA); if (e.mesh.userData.spin) e.mesh.userData.spin.rotation.z += dt * 9;
      if (rival && e.thresholds.length && e.hp < e.maxhp * e.thresholds[0]) { e.thresholds.shift(); if (e.thresholds.length === 1) { Comms.say('claw_half'); for (let i = 0; i < 2; i++) this.spawnFighter(); } else { Comms.say('claw_low'); for (let i = 0; i < 3; i++) this.spawnFighter(); } A.play('warn'); }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  },
  // ---- wingmen (AI fliers)
  updateWingmenAR(dt) {
    const al = this.alivePilots(); const center = al.length ? al.reduce((s, p) => s.add(p.pos), V3()).multiplyScalar(1 / al.length) : V3();
    for (const w of this.wingmen) {
      w.t += dt; if (w.flashT > 0) { w.flashT -= dt; setFlash(w.ship, true); } else if (w.flashT !== -1) { setFlash(w.ship, false); w.flashT = -1; }
      if (w.out) { w.outT += dt; w.pos.addScaledVector(w.dir, 70 * dt); w.ship.position.copy(w.pos); if (w.outT > 2.5 && w.ship.parent) R.world.remove(w.ship); continue; }
      let target = null, bd = 1e9; for (const e of this.enemies) { if (e.dead || e.type === 'missile') continue; if (w.chased && e.victim !== w) continue; const d = e.pos.distanceToSquared(w.pos) + (e.victim && e.victim !== w ? 1e5 : 0); if (d < bd && d < 600 * 600) { bd = d; target = e; } }
      let des; if (w.chased) { const orb = V3(Math.cos(w.t * 0.9 + w.ph) * 60, Math.sin(w.t * 0.7) * 25, Math.sin(w.t * 0.9 + w.ph) * 60); des = center.clone().add(orb).sub(w.pos).normalize(); }
      else if (target) des = target.pos.clone().addScaledVector(target.dir || ZERO, 8).sub(w.pos).normalize();
      else { const orb = V3(Math.cos(w.t * 0.25 + w.ph) * 90, Math.sin(w.t * 0.2 + w.ph) * 20, Math.sin(w.t * 0.25 + w.ph) * 90); des = center.clone().add(orb).sub(w.pos).normalize(); }
      const bankT = steerDir(w.dir, des, w.chased ? 2.0 : 1.7, dt); if (w.pos.length() > ARENA_R) steerDir(w.dir, w.pos.clone().negate().normalize(), 2.6, dt);
      w.speed = damp(w.speed, w.chased ? 78 : 64, 2, dt); w.pos.addScaledVector(w.dir, w.speed * dt); w.vel.copy(w.dir).multiplyScalar(w.speed); w.ship.position.copy(w.pos); orientTo(w.ship, w.dir, damp(w.bank || 0, clamp(-bankT * 0.5, -1, 1), 5, dt)); w.bank = w.ship.rotation.z;
      w.fireCd -= dt; if (!w.chased && target && w.fireCd <= 0) { const to = target.pos.clone().sub(w.pos), d = to.length(); if (d < 380 && Math.acos(clamp(w.dir.dot(to.normalize()), -1, 1)) < 0.12) { this.addShot({ owner: 'p', pilot: null, pos: w.pos.clone().addScaledVector(w.dir, 3), vel: to.multiplyScalar(260), dmg: 1, life: 1.6, kind: 'laser', color: w.who === 'hop' ? 0x4cc36b : w.who === 'rook' ? 0xb35cff : 0xffd33d, size: 0.55, len: 3 }); w.fireCd = rr(0.35, 0.7); } }
    }
    if (this.chaseWatchAR && !this.enemies.some((e) => e.victim && !e.dead)) { this.chaseWatchAR = false; const pip = this.wingmen.find((w) => w.who === 'pip'); if (pip && !pip.out) { pip.chased = false; this.stats.pipSaved = true; Comms.say('pip_saved'); } }
  },
  // ---- stage flow (designer-tunable via STAGES.belt.quota)
  updateARFlow(dt) {
    const st = this.st, al = this.alivePilots(); if (!al.length) return; this.arT += dt; const n = this.pilots.filter((p) => !p.out).length;
    const fighters = this.enemies.filter((e) => e.type === 'fighter' && !e.dead && !e.victim).length;
    if (this.arPhase === 0) {
      this.spawnT = (this.spawnT ?? 1) - dt; const want = Math.min(4 + n * 2, st.quota - this.arKills - 0); const outstanding = st.quota - this.arKills;
      if (this.spawnT <= 0 && fighters < want && fighters < outstanding && (this.arSpawned || 0) < st.quota) { this.spawnT = 1.1; this.spawnFighter(); this.arSpawned = (this.arSpawned || 0) + 1; }
      if (this.arKills >= Math.floor(st.quota / 2) && !this.hintsShown.half) { this.hintsShown.half = true; Comms.say('ar_half'); }
      if (this.arT > 38 && !this.hintsShown.pip) { this.hintsShown.pip = true; const pip = this.wingmen.find((w) => w.who === 'pip'); if (pip && !pip.out) { pip.chased = true; this.chaseWatchAR = true; Comms.say('pip_ar'); for (let i = 0; i < 2; i++) { const e = this.spawnFighter({ victim: pip, pos: pip.pos.clone().add(V3(rr(-1, 1), rr(-0.3, 0.3), 1).normalize().multiplyScalar(60)) }); e.speed = 70; } } }
      if (this.arT > 14 && !this.hintsShown.boostTip) { this.hintsShown.boostTip = true; Comms.say('ar_boost'); Hud.hint('loop'); }
      if (this.arT > 12 && !this.hintsShown.pk1) { this.hintsShown.pk1 = true; this.arPickup('laser'); }
      if (this.arT > 24 && !this.hintsShown.pk2) { this.hintsShown.pk2 = true; this.arPickup('repair'); this.arPickup('bomb'); }
      if (this.arT > 52 && !this.hintsShown.pk3) { this.hintsShown.pk3 = true; this.arPickup('repair'); this.arPickup('gold'); }
      if (this.arKills >= st.quota && !this.enemies.some((e) => e.type === 'fighter' && !e.victim && !e.dead)) { this.arPhase = 1; this.spawnRival(); Comms.say('claw_intro'); Music.play('boss'); Hud.alert('WARNING', '#ff5b6b', 2.4); A.play('warn'); this.arPickup('repair'); this.arPickup('bomb'); }
    } else if (this.arPhase === 1) {
      if (this.rival && !this.rival.dead && Math.random() < dt * 0.02 && fighters < 2) this.spawnFighter();
    }
  },
  arPickup(kind) { const al = this.alivePilots(), c = al.length ? pick(al).pos : V3(); const pos = c.clone().add(V3(rr(-1, 1), rr(-0.2, 0.2), rr(-1, 1)).normalize().multiplyScalar(rr(70, 130))); const k = this.spawnPickup(kind, pos); k.life = 40; this.popup(pos, '!', '#7dffb0'); },
  arOnKill(e, pilot) {
    if (e.type === 'fighter' && !e.victim) this.arKills++;
    if (e.type === 'rival') { this.arPhase = 2; Hud.bossBar = null; this.rival = null; Comms.say('claw_dead', 0.4); Music.stop(true); this.stats.kills += 4; for (const p of this.pilots) this.addScore(p, 4000 / this.pilots.length, null); for (const o of this.enemies) if (o !== e && !o.dead && o.type !== 'rival') { o.hp = 0; this.after(rr(0.2, 1.2), () => { if (!o.dead && this.active) this.killEnemy(o, null, null); }); } FX.ring(e.pos, 0xffb000, 90, 1.2); this.state = 'rivaldeath'; this.stateT = 0; this.after(3.2, () => { if (this.active && this.kind === 'allrange') this.stageClear(); }); }
  },
});
