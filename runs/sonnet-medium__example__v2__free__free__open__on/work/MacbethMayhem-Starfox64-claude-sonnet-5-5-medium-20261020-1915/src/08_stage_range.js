/* ===================== 08 ALL-RANGE STAGE: dogfight over Birnam Fortress ===================== */
const CARRIER_POS = new V3(0, 70, -220);

class Solid extends Ent {
  constructor(mesh, boxes) {
    super('solid'); this.team = 'o'; this.solid = true; this.targetable = false; this.countsAsKill = false; this.cols = []; this.mesh = mesh; this.group = GRP.STATIC; this.rs = 0;
    for (const b of boxes) {
      const d = RAPIER.ColliderDesc.cuboid(b[3], b[4], b[5]).setTranslation(b[0], b[1], b[2]).setCollisionGroups(Phys.groups(GRP.STATIC));
      const c = Phys.world.createCollider(d); Phys.colMap.set(c.handle, this); this.cols.push(c);
    }
  }
  onBullet(b) { FX.burst(b.pos, 3, 8, 0.3, 0.3, 0xffffff, 0xffc040); return true; }
  damage() { return false; } syncBody() {} syncMesh() {}
  dispose() { for (const c of this.cols) { Phys.colMap.delete(c.handle); try { Phys.world.removeCollider(c, false); } catch (e) { /* gone */ } } this.cols = []; if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh); }
}

class Flyer extends Ent {
  constructor(st, kind, pos) {
    super(kind); const ace = kind === 'ace';
    this.pos.copy(pos); this.fwd = new V3(0, 0, 1).applyAxisAngle(_UPV, rand(TAU)); this.speed = ace ? 92 : rand(70, 82); this.maxHp = this.hp = ace ? 16 : 3; this.score = ace ? 2000 : 150; this.debrisColor = ace ? 0xe0b43a : 0x8a2f6a;
    this.mesh = MODELS.fighter(); if (ace) { this.mesh.scale.setScalar(1.5); this.baseScale = 1.5; this.mesh.userData.parts.eye.material = glowMat(0xff3a3a); }
    Gfx.world.add(this.mesh); this.state = 'attack'; this.stT = 0; this.fireT = rand(1, 2.5); this.turn = ace ? 2.6 : 1.9; this.tgt = null; this.retarget = 0; this.breakDir = new V3(); this.bank = 0;
    this.attachBall(ace ? 3.2 : 2.4, GRP.ENEMY); this.quat.setFromUnitVectors(new V3(0, 0, -1), this.fwd);
  }
  pickTarget(st) {
    const allies = W.allies.filter((a) => a.alive);
    this.tgt = Math.random() < 0.7 || !allies.length ? st.player : pick(allies); this.retarget = rand(6, 12);
  }
  update(dt, st) {
    const P = st.player; this.t += dt; this.fireT -= dt; this.retarget -= dt; this.stT -= dt;
    if (!this.tgt || !this.tgt.alive || this.retarget <= 0) { this.pickTarget(st); if (!this.tgt.alive) this.tgt = P; }
    const tp = this.tgt.pos, to = _t1.copy(tp).sub(this.pos), dist = to.length();
    const tdir = _t2.copy(to).normalize(), dot = tdir.dot(this.fwd);
    let want = tdir;
    if (this.state === 'attack') {
      // lead the target a little
      const tv = this.tgt === P ? _t3.copy(P.aimFwd).multiplyScalar(P.speed) : _t3.set(0, 0, 0);
      want = _t2.copy(tp).addScaledVector(tv, Math.min(1.2, dist / 120)).sub(this.pos).normalize();
      if (dist < 28 || (dist < 70 && dot < 0.2)) { this.state = 'break'; this.stT = rand(1.6, 2.6); this.breakDir.set(rand(-1, 1), rand(-0.4, 0.8), rand(-1, 1)).normalize(); if (dot > 0) this.breakDir.addScaledVector(this.fwd, 1.5).normalize(); }
    } else { want = this.breakDir; if (this.stT <= 0) this.state = 'attack'; }
    // altitude safety
    if (this.pos.y < -20) want = _t2.copy(want).add(_t3.set(0, 1.2, 0)).normalize();
    // keep inside the arena
    const hd = Math.hypot(this.pos.x, this.pos.z); if (hd > 560) want = _t2.copy(want).addScaledVector(_t3.set(-this.pos.x, 0, -this.pos.z).normalize(), 1.4).normalize();
    // turn toward desired heading
    const ang = this.fwd.angleTo(want);
    if (ang > 1e-3) { const k = Math.min(1, (this.turn * dt) / ang); this.fwd.lerp(want, k).normalize(); }
    const sp = this.speed * (this.state === 'break' ? 1.1 : 1);
    this.pos.addScaledVector(this.fwd, sp * dt);
    // avoid carrier hull
    const cd = this.pos.distanceTo(CARRIER_POS); if (cd < 70) this.pos.addScaledVector(_t3.copy(this.pos).sub(CARRIER_POS).normalize(), (70 - cd) * 0.5);
    // orientation with banking
    _tq.setFromUnitVectors(_t3.set(0, 0, -1), this.fwd); const cr = _t1.crossVectors(this.fwd, want).y; this.bank = damp(this.bank, clamp(-cr * 2.2, -1.1, 1.1), 5, dt);
    this.quat.copy(_tq); _tq.setFromAxisAngle(_t3.set(0, 0, -1), this.bank); this.quat.multiply(_tq);
    this.mesh.userData.parts.flame.scale.z = 0.8 + Math.sin(this.t * 40) * 0.2;
    // shoot
    if (this.fireT <= 0 && this.state === 'attack' && dist < 150 && dot > 0.93) {
      this.fireT = this.kind === 'ace' ? 0.5 : rand(0.8, 1.4);
      const o = _t3.copy(this.pos).addScaledVector(this.fwd, 3);
      const aim = _t2.copy(tp).addScaledVector(this.tgt === P ? _t1.copy(P.aimFwd).multiplyScalar(P.speed) : _t1.set(0, 0, 0), dist / 70).sub(o).normalize();
      aim.x += rand(-0.03, 0.03); aim.y += rand(-0.03, 0.03);
      Bullets.spawn({ team: 'e', kind: 'orb', pos: o, vel: aim.multiplyScalar(76), dmg: this.kind === 'ace' ? 11 : 8, life: 3.2, r: 0.7, hp: 1 }); Sfx.enemyLaser();
    }
    this.syncBody(); this.syncMesh();
  }
  onDeath() {
    if (Math.random() < 0.18) W.stage.dropPickup(this.pos, pick(['ring', 'ring', 'bomb']));
    if (this.kind === 'ace') { W.stage.say('maldoon', 'My sister! Fair is foul and foul is fair... but you will pay!'); W.stage.dropPickup(this.pos, 'gold'); }
    const w = W.allies.find((a) => a.alive && a.chaser === this); if (w) { w.chaser = null; W.stage.say(w.id, 'Thanks, Lead! That one was glued to my tail!'); W.stage.rescued.add(w.id); }
  }
}

class Flak extends Ent {
  constructor(st, pos) {
    super('flak'); this.pos.copy(pos); this.mesh = MODELS.flak(); this.parts = this.mesh.userData.parts; Gfx.world.add(this.mesh);
    this.maxHp = this.hp = 5; this.score = 250; this.debrisColor = 0xb04a3a; this.fireT = rand(1, 3); this.attachBall(3.2, GRP.ENEMY); this.meshDy = 0; this.mesh.position.copy(pos); this.parts.head.rotation.order = 'YXZ';
  }
  update(dt, st) {
    const P = st.player; this.fireT -= dt; const d = this.pos.distanceTo(P.pos);
    this.mesh.updateMatrixWorld(); const lo = this.mesh.worldToLocal(_t2.copy(P.pos)); this.parts.head.rotation.y = damp(this.parts.head.rotation.y, Math.atan2(-lo.x, -lo.z), 6, dt); this.parts.head.rotation.x = damp(this.parts.head.rotation.x, clamp(Math.atan2(lo.y - 1.9, Math.hypot(lo.x, lo.z)), 0, 1.4), 6, dt);
    if (this.fireT <= 0 && d < 260 && d > 30 && lo.y > 0) { this.fireT = rand(1.4, 2.4); st.enemyShoot(this, 62, 0.6, this.parts.head.getWorldPosition(_t3), rand(-0.05, 0.05)); }
  }
}

class CoreNode extends Ent {
  constructor(st, kind, pos, hp, model) {
    super(kind); this.pos.copy(pos); this.mesh = model; this.parts = model.userData.parts; Gfx.world.add(this.mesh); this.mesh.position.copy(pos);
    this.maxHp = this.hp = hp; this.score = kind === 'core' ? 6000 : 800; this.debrisColor = 0x66a0b0; this.deathSize = 1.8; this.active = kind !== 'core';
    this.attachBall(kind === 'core' ? 9 : 7, GRP.ENEMY); this.meshDy = 0; this.bombScale = 0.5; this.countsAsKill = true;
    this.cpos = pos.clone(); if (kind === 'generator') this.meshDy = -12; // orb centre offset
    if (kind === 'generator') this.pos.y += 12;
  }
  damage(d, src) {
    if (!this.active) { FX.burst(src && src.pos || this.pos, 3, 12, 0.3, 0.3, 0xffffff, 0x66f0ff); Sfx.deflect(); return false; }
    return super.damage(d, src);
  }
  update(dt) { if (this.kind === 'generator' && this.parts) { this.parts.shell.rotation.y += dt; this.parts.orb.scale.setScalar(1 + Math.sin(this.t * 5) * 0.08); } this.t += dt; if (this.kind === 'core') { const m = this.mesh.userData.parts.window; if (m) m.material = this.active ? glowMat(0x66f0ff) : glowMat(0xffc84a); } }
  onDeath() { W.stage.nodeDown(this); }
  syncMesh() { this.mesh.position.copy(this.cpos); }
}

class RangeWing extends Ent {
  constructor(st, def, i) {
    super('wing'); this.team = 'p'; this.id = def.id; this.def = def; this.targetable = false; this.countsAsKill = false; this.group = GRP.ALLY;
    this.maxHp = this.hp = 70; this.chasers = 0; this.fwd = new V3(0, 0, -1); this.speed = 74; this.fireT = rand(1, 2); this.t = rand(10); this.callT = rand(10, 20); this.mesh = MODELS.ship(def.color); Gfx.world.add(this.mesh); this.parts = this.mesh.userData.parts; this.bank = 0;
    this.pos.copy(st.player.pos).add(new V3(def.ox * 1.4, 4 + i * 3, 30 + i * 12)); this.attachBall(1.6, GRP.ALLY); this.tgt = null; this.retarget = 0; this.chaser = null;
  }
  hurt(d) { if (!this.alive) return; this.hp -= d; this.pulse = 1; if (this.hp <= 0) this.die(); }
  onBullet(b) { if (b.team === 'e') { this.hurt(b.dmg || 4); return true; } return false; }
  damage(d) { this.hurt(d); return false; }
  die() { if (!this.alive) return; this.alive = false; FX.explosion(this.pos, 1.8); Sfx.explode(2); W.stage.say(this.id, pick(['I\'m hit! Eject! Tell Command I fought well!', 'Goodnight, sweet prince... ahhh!'])); W.stage.lost.add(this.id); }
  update(dt, st) {
    const P = st.player; this.t += dt; this.fireT -= dt; this.retarget -= dt; this.callT -= dt;
    if (!this.tgt || !this.tgt.alive || this.retarget <= 0) { let b = null, bd = 1e9; for (const e of W.ents) { if (!e.alive || e.team !== 'e' || (e.kind !== 'fighter' && e.kind !== 'ace')) continue; const d = e.pos.distanceTo(this.pos); if (d < bd) { bd = d; b = e; } } this.tgt = b; this.retarget = rand(3, 6); }
    let want;
    if (this.tgt && this.tgt.alive && this.pos.distanceTo(this.tgt.pos) < 300) want = _t1.copy(this.tgt.pos).sub(this.pos).normalize();
    else want = _t1.copy(P.pos).addScaledVector(P.aimFwd, 40).add(_t2.set(this.def.ox * 1.5, 6, 0)).sub(this.pos).normalize();
    if (Math.hypot(this.pos.x, this.pos.z) > 520) want.add(_t2.set(-this.pos.x, 0, -this.pos.z).normalize()).normalize();
    if (this.pos.y < -10) want.y += 1; if (this.pos.distanceTo(CARRIER_POS) < 70) want.add(_t2.copy(this.pos).sub(CARRIER_POS).normalize().multiplyScalar(2)).normalize();
    const ang = this.fwd.angleTo(want); if (ang > 1e-3) this.fwd.lerp(want, Math.min(1, 1.8 * dt / ang)).normalize();
    this.pos.addScaledVector(this.fwd, this.speed * dt);
    const cr = _t2.crossVectors(this.fwd, want).y; this.bank = damp(this.bank, clamp(-cr * 2.2, -1, 1), 5, dt);
    _tq.setFromUnitVectors(_t3.set(0, 0, -1), this.fwd); this.quat.copy(_tq); _tq.setFromAxisAngle(_t3.set(0, 0, -1), this.bank); this.quat.multiply(_tq);
    this.parts.flame1.scale.z = this.parts.flame2.scale.z = 0.9 + Math.sin(this.t * 40) * 0.1;
    if (this.tgt && this.tgt.alive && this.fireT <= 0 && this.fwd.dot(_t1.copy(this.tgt.pos).sub(this.pos).normalize()) > 0.95 && this.pos.distanceTo(this.tgt.pos) < 200) { this.fireT = 0.3; Bullets.spawn({ team: 'p', kind: 'ally', pos: this.pos, vel: _t2.copy(this.fwd).multiplyScalar(190), dmg: 1, life: 1.2, r: 0.55 }); }
    // call for help when a fighter is tailing
    if (this.callT <= 0) { for (const e of W.ents) if (e.alive && (e.kind === 'fighter') && e.tgt === this && e.pos.distanceTo(this.pos) < 70) { this.callT = 18; this.chaser = e; W.stage.say(this.id, pick(['Enemy on my tail! Lead, help!', 'He is glued to me — shoot him off!'])); break; } this.callT = Math.min(this.callT, 4); }
    this.syncBody(); this.syncMesh();
  }
}

class RangePlayer extends RailPlayer {
  constructor(st) {
    super(st); this.yaw = 0; this.pitch = 0; this.speed = st.def.speed; this.pos.set(0, 80, 420); this.uturn = 0; this.uCd = 0; this.knock = new V3(); this.oob = 0; this.bankV = 0; this.winCx = 0;
  }
  update(dt, c, st) {
    if (this.dead) { this.deadT += dt; return; }
    this.t += dt; this.invuln = Math.max(0, this.invuln - dt); this.fireCd -= dt; this.rollCd -= dt; this.uCd -= dt;
    const intro = st.introT > 0, lock = st.cinematic || (intro && st.introT > 1.0);
    const cx = lock ? 0 : c.x, cy = lock ? 0 : c.y;
    // ---- turning ----
    if (!lock && this.uturn <= 0 && this.uCd <= 0 && c.uturnDown) { this.uturn = 0.95; this.uStart = this.yaw; this.uDir = cx >= 0 ? -1 : 1; Sfx.boost(); }
    if (this.uturn > 0) {
      this.uturn -= dt; const k = easeInOut(clamp(1 - this.uturn / 0.95, 0, 1)); this.yaw = this.uStart + Math.PI * k * this.uDir; this.pitch = damp(this.pitch, 0, 5, dt); this.visRoll = -this.uDir * k * Math.PI; this.visPitch = 0;
      if (this.uturn <= 0) { this.uCd = 0.5; this.visRoll = 0; }
    } else {
      this.yaw += -cx * 1.75 * Settings.sens * (this.braking ? 1.35 : 1) * dt;
      this.pitch = clamp(this.pitch + -cy * 1.45 * Settings.sens * dt, -1.2, 1.2);
      if (Math.abs(cy) < 0.1) this.pitch = damp(this.pitch, 0, 0.5, dt);
    }
    // ---- speed ----
    let mul = 1;
    if (!lock) {
      if (c.boost && this.boost > 0.02 && this.boostLock <= 0 && !c.brake) { mul = 1.7; this.boost = Math.max(0, this.boost - 0.38 * dt); if (this.boost <= 0.02) this.boostLock = 1.2; if (!this.boosting) { this.boosting = true; Sfx.boost(); } }
      else { this.boosting = false; this.boost = Math.min(1, this.boost + (c.brake ? 0.5 : 0.2) * dt); }
      if (c.brake && !c.boost) { mul = 0.5; if (!this.braking) { this.braking = true; Sfx.brake(); } } else this.braking = false;
    }
    this.boostLock -= dt; if (intro) mul = Math.max(mul, 1 + st.introT * 0.4);
    this.speedMul = damp(this.speedMul, mul, 4, dt); this.speed = st.def.speed * this.speedMul;
    const cp = Math.cos(this.pitch);
    const fwd = this.aimFwd.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    this.aimRight.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    // ---- barrel roll (sideways dodge) ----
    if (!lock && this.rolling <= 0 && this.rollCd <= 0 && this.uturn <= 0 && (c.rollLDown || c.rollRDown)) { this.rolling = 0.65; this.rollDir = c.rollLDown ? -1 : 1; this.rollCd = 0.35; Sfx.roll(); W.rolledOnce = true; }
    if (this.rolling > 0) { this.rolling -= dt; this.visRoll = -this.rollDir * easeInOut(1 - Math.max(0, this.rolling) / 0.65) * TAU; this.pos.addScaledVector(this.aimRight, this.rollDir * 22 * dt); this.deflect(st); if (this.rolling <= 0) this.visRoll = 0; }
    this.pos.addScaledVector(fwd, this.speed * dt); this.pos.addScaledVector(this.knock, dt); this.knock.multiplyScalar(Math.exp(-3 * dt));
    // ---- arena limits ----
    const hd = Math.hypot(this.pos.x, this.pos.z - CARRIER_POS.z * 0.5), R = st.def.arena;
    if (hd > R * 0.9) { this.oob += dt; st.oobWarn = true; if (this.oob > 3.5 || hd > R * 1.08) { const want = Math.atan2(this.pos.x, this.pos.z - CARRIER_POS.z * 0.5); this.yaw = damp(this.yaw, want + Math.round((this.yaw - want) / TAU) * TAU, 1.6, dt); } } else { this.oob = 0; st.oobWarn = false; }
    if (this.pos.y > 300) { this.pos.y = 300; this.pitch = Math.min(this.pitch, 0); }
    if (this.pos.y < -40) { this.pos.y = -40; this.pitch = Math.max(this.pitch, 0.3); this.hurt(8, this.pos, true); }
    // ---- orientation ----
    this.bankV = damp(this.bankV, cx * 0.7 * (this.uturn > 0 ? 0 : 1), 6, dt);
    _te.set(this.pitch, this.yaw, 0, 'YXZ'); this.quat.setFromEuler(_te);
    _te.set(0, 0, -this.bankV + this.visRoll); const rq = _tq.setFromEuler(_te); this.tilt.copy(this.quat).multiply(rq);
    const wingTarget = this.boosting ? 0.5 : this.braking ? -0.35 : 0;
    this.parts.wingL.rotation.z = damp(this.parts.wingL.rotation.z, -wingTarget * 0.5, 8, dt); this.parts.wingR.rotation.z = -this.parts.wingL.rotation.z;
    const fl = (this.boosting ? 2.0 : this.braking ? 0.4 : 1) * (0.9 + Math.sin(this.t * 40) * 0.1); this.parts.flame1.scale.set(1, 1, fl); this.parts.flame2.scale.set(1, 1, fl);
    this.mesh.visible = !(this.invuln > 0 && Math.floor(this.t * 20) % 2 === 0);
    if (!lock) this.weapons(dt, c, st);
    this.syncBody();
    Phys.overlapBall(this.pos, 1.15, GRP.STATIC | GRP.ENEMY | GRP.PICKUP, (e) => {
      if (!e || !e.alive) return true;
      if (e instanceof Pickup) { e.collect(this); return true; }
      if (e.solid) { if (this.hurt(26, e.pos, true)) { this.knock.copy(fwd).multiplyScalar(-45); this.pos.addScaledVector(fwd, -6); this.speedMul = 0.4; } return true; }
      if (e.team === 'e' && (e instanceof Flyer)) { if (this.hurt(14, e.pos, true)) { e.damage(4, { pos: this.pos }); } }
      return true;
    });
    W.hudHeat = this.boost; Sfx.setEngine(true, (this.speedMul - 0.4) / 1.4, this.boosting);
    this.trailT -= dt; if (this.trailT <= 0) { this.trailT = 0.04; const o = _t1.set(0, 0, 2.9).applyQuaternion(this.tilt).add(this.pos); FX.spawn(o, _t2.set(0, 0, 0), this.boosting ? 0.34 : 0.2, 0.28, 0xffe08a, 0xff4a2a, { drag: 1 }); }
  }
}

class RangeStage {
  constructor(def, opts = {}) {
    this.def = def; this.opts = opts; this.mode = 'range'; this.attract = !!opts.attract; this.path = null; this.route = null; this.introT = 0; this.cinematic = false; this.ended = false; this.endT = 0;
    this.phase = 1; this.wave = 0; this.waveClear = true; this.nodesLeft = 4; this.rescued = new Set(); this.lost = new Set(); this.spawnedKillable = 0; this.time = 0; this.camPos = new V3(); this.camLook = new V3(); this.camInit = false; this.camYaw = 0; this.camPitch = 0;
    this.tmp = new V3(); this.aiState = { chargeT: 0, rollT: 0, uT: 0 }; this.cp = null; this.hint = null; this.oobWarn = false; this.nextSupply = 22; this.lightT = rand(4, 8); this.sayQ = 0; this.deathHandled = false; this.generators = []; this.flaks = []; this.carrierMesh = null; this.spawnT = 0; this.hangarT = 14;
  }
  say(who, text) { UI.comm(who, text); }
  banner(a, b) { UI.banner(a, b); }
  toast(t, k) { UI.toast(t, k); }
  lockable(e) { return e.alive && e.team === 'e' && e.targetable !== false && e.active !== false && e.kind !== 'bossbody' && e.kind !== 'boss'; }
  relCoords() { return { ds: 0, x: 0, y: 0 }; }
  dropPickup(pos, kind) { W.add(new Pickup(this, kind, 0, 0, 0, { pos: pos.clone(), life: 14 })); }
  aimAssist(origin, fwd) {
    const dir = new V3().copy(fwd); if (!Settings.aimAssist) return dir;
    let best = null, bd = 0.09;
    for (const e of W.ents) { if (!this.lockable(e)) continue; this.tmp.copy(e.pos).sub(origin); const d = this.tmp.length(); if (d < 12 || d > 320) continue; const a = this.tmp.normalize().angleTo(fwd); if (a < bd) { bd = a; best = e; } }
    if (best) { this.tmp.copy(best.pos).sub(origin).normalize(); dir.lerp(this.tmp, 0.8).normalize(); }
    return dir;
  }
  enemyShoot(e, speed, inacc, from, ang = 0) {
    const P = this.player; if (!P.alive) return;
    const src = from ? from : e.pos, d = src.distanceTo(P.pos); if (d < 10) return;
    const aim = this.tmp.copy(P.pos).addScaledVector(P.aimFwd, P.speed * (d / speed) * 0.9);
    aim.x += rand(-1, 1) * inacc * d * 0.06; aim.y += rand(-1, 1) * inacc * d * 0.06; aim.z += rand(-1, 1) * inacc * d * 0.06;
    const dir = aim.sub(src).normalize(); if (ang) dir.applyAxisAngle(_UPV, ang);
    Bullets.spawn({ team: 'e', kind: 'orb', pos: src, vel: dir.multiplyScalar(speed), dmg: 9, life: 6, r: 0.75, hp: 1 }); Sfx.enemyLaser();
  }
  enemyMissile(e, pos) {
    const P = this.player; if (!P.alive) return;
    const dir = new V3().copy(P.pos).sub(pos).normalize().add(new V3(rand(-0.2, 0.2), rand(0, 0.3), rand(-0.2, 0.2))).normalize();
    Bullets.spawn({ team: 'e', kind: 'missile', pos: pos.clone(), vel: dir.multiplyScalar(48), dmg: 16, life: 8, r: 1.0, hp: 3, target: P, turn: 1.1 }); Sfx.missile();
  }
  build() {
    const def = this.def, th = def.theme;
    Gfx.clearWorld(); FX.reset(); Debris.clear(); Bullets.clear(); W.reset(); Phys.reset(); Gfx.setTheme(th); W.stage = this; W.mode = 'range';
    // cloud sea
    const gt = groundTexture(th.ground[0], th.ground[1], th.ground[2], 5); gt.repeat.set(70, 70);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), toon(0xffffff, { map: gt })); sea.position.y = -50; sea.receiveShadow = true; Gfx.world.add(sea);
    Phys.addGround(-48);
    const rng = mulberry(77), R = (a, b) => a + rng() * (b - a), batch = new DecorBatch();
    for (let i = 0; i < 420; i++) { const a = rng() * TAU, r = R(60, 1500); batch.add('cloud', Math.cos(a) * r, R(-62, -38), Math.sin(a) * r - 100, rng() * TAU, R(30, 90), R(10, 24), R(30, 90), pick([0xfff0fa, 0xe8d8f4, 0xf8e4f0, 0xd8c8ec])); }
    for (let i = 0; i < 26; i++) { const a = rng() * TAU, r = R(200, 900), x = Math.cos(a) * r, z = Math.sin(a) * r - 100, y = R(-10, 160), s = R(14, 40); batch.add('mesa', x, y, z, rng() * TAU, s, R(4, 9), s, pick([0x7a5a7a, 0x8a6a6a, 0x6a5a8a])); batch.add('rock', x, y - s * 0.5, z, 0, s * 0.8, s * 0.9, s * 0.8, 0x5a4a6a); batch.add('spire', x, y + 10, z, 0, s * 0.15, 14, s * 0.15, 0x4a8a5a); }
    for (let i = 0; i < 60; i++) { const a = rng() * TAU, r = R(1400, 2600); batch.add('cloud', Math.cos(a) * r, R(100, 700), Math.sin(a) * r, rng() * TAU, R(150, 320), R(40, 90), R(150, 320), 0xf0c8d8); }
    for (let i = 0; i < 10; i++) { const a = rng() * TAU, r = R(1600, 2400); batch.add('spire', Math.cos(a) * r, 150, Math.sin(a) * r, 0, R(80, 160), R(300, 600), R(80, 160), 0x4a3a6a); }
    batch.build(Gfx.world);
    // carrier
    const cm = MODELS.carrier(); cm.position.copy(CARRIER_POS); Gfx.world.add(cm); this.carrierMesh = cm; this.carrier = { pos: CARRIER_POS.clone() };
    const C = CARRIER_POS;
    const boxes = [[C.x, C.y, C.z, 35, 11, 130], [C.x, C.y + 15, C.z + 10, 26, 6, 100], [C.x, C.y, C.z - 175, 18, 18, 45], [C.x, C.y + 36, C.z + 70, 9, 12, 14], [C.x, C.y + 49, C.z + 70, 11, 1.5, 16], [C.x - 52, C.y - 2, C.z + 70, 12, 7, 30], [C.x + 52, C.y - 2, C.z + 70, 12, 7, 30]];
    const solid = new Solid(null, boxes); W.add(solid); this.solid = solid;
    cm.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // shield dome (cosmetic)
    this.shield = new THREE.Mesh(G.sph(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x66f0ff, transparent: true, opacity: 0.06, wireframe: true, depthWrite: false })); this.shield.scale.set(170, 90, 260); this.shield.position.copy(C).add(new V3(0, 20, 0)); Gfx.world.add(this.shield);
    // generators, flak, core
    for (const [x, z] of [[-22, -60], [22, -60], [-22, 50], [22, 50]]) { const g = new CoreNode(this, 'generator', new V3(C.x + x, C.y + 21, C.z + z), 16, MODELS.generator()); W.add(g); this.generators.push(g); this.spawnedKillable++; }
    for (const [x, z] of [[-30, -100], [30, -100], [-30, 0], [30, 0], [-30, 100], [30, 100], [0, -20], [0, 40]]) { const f = new Flak(this, new V3(C.x + x, C.y + 21, C.z + z)); W.add(f); this.flaks.push(f); this.spawnedKillable++; }
    this.core = new CoreNode(this, 'core', new V3(C.x, C.y + 41, C.z + 55), 70, new THREE.Group()); this.core.mesh.userData.parts = {}; W.add(this.core); this.core.mesh.add(new THREE.Mesh(G.sph(8, 14, 10), glowMat(0xff6a3a))); this.spawnedKillable += 4;
    this.coreGlow = this.core.mesh.children[0];
    // player + wingmen
    this.player = new RangePlayer(this); W.player = this.player; W.add(this.player);
    this.player.pos.set(0, 90, 420); this.player.yaw = 0; if (this.opts.attract) this.player.god = true;
    WING.forEach((d, i) => { const w = new RangeWing(this, d, i); W.allies.push(w); W.add(w); });
    if (!this.attract) this.introT = 3.2;
    this.player.update(0.001, { x: 0, y: 0 }, this);
    this.updateCamera(0.016, true);
    UI.setBossBar(null); Sfx.playMusic(def.music);
    this.script = 0; this.phaseSay = {};
    if (!this.attract) { this.say('hollin', 'Birnam Fortress is hovering over the storm. Clear the Syndicate fighters first, Lead!'); setTimeout(() => { if (W.stage === this) UI.banner('STAGE 2', 'DUNSINANE SKIES'); }, 300); }
    if (!this.attract && Settings.hints) { this.hint = HINTS.uturn; UI.setHint(this.hint, this); this.hintT = 0; }
    this.sayQ = 0;
  }
  spawnFighters(n, ace) {
    const P = this.player;
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), r = rand(260, 400); const pos = new V3(Math.cos(a) * r, rand(30, 150), CARRIER_POS.z * 0.5 + Math.sin(a) * r);
      const f = new Flyer(this, 'fighter', pos); W.add(f); this.spawnedKillable++;
    }
    if (ace) { const f = new Flyer(this, 'ace', new V3(rand(-200, 200), 120, -420)); W.add(f); this.spawnedKillable++; this.aceRef = f; this.say('maldoon', 'Behold my sister, Gwyn the Weird! She shall turn your wing to splinters!'); }
    Sfx.warn();
  }
  enemiesLeft() { let n = 0; for (const e of W.ents) if (e.alive && (e.kind === 'fighter' || e.kind === 'ace')) n++; return n; }
  nodeDown(n) {
    W.hits += 1; W.score += n.score;
    if (n.kind === 'generator') {
      this.nodesLeft--; this.shield.material.opacity = 0.015 + this.nodesLeft * 0.012;
      if (this.nodesLeft > 0) this.say(pick(['bram', 'rook', 'tansy']), `Generator down! ${this.nodesLeft} to go!`);
      else { this.phase = 3; this.core.active = true; this.shield.visible = false; this.say('hollin', 'Shields are gone! Hit the bridge core and end this!'); UI.banner('CORE EXPOSED', ''); Sfx.warn(); Sfx.playMusic(this.def.bossMusic); }
    } else if (n.kind === 'core') { this.carrierDying = true; this.cinematic = true; this.ended = true; this.endT = 0; Sfx.playMusic('victory'); W.slow = 0.4; this.say('maldoon', 'Out, out, brief candle! Birnam Wood... is come to Dunsinane...'); UI.banner('MISSION COMPLETE', ''); }
  }
  aiControl(dt) {
    const P = this.player, st = this.aiState; P.god = true; st.rollT -= dt; st.uT -= dt;
    const c = { x: 0, y: 0, fire: false, charge: false, chargeUp: false, bomb: false, bombDown: false, boost: false, brake: false, rollLDown: false, rollRDown: false, uturnDown: false, uturn: false };
    let best = null, bd = 1e9, near = 0;
    for (const e of W.ents) { if (!this.lockable(e)) continue; const d = e.pos.distanceTo(P.pos); if (d < 140) near++; const w = d + (e.kind === 'flak' ? 200 : 0); if (w < bd) { bd = w; best = e; } }
    let tp = best ? best.pos : CARRIER_POS;
    const hd = Math.hypot(P.pos.x, P.pos.z - CARRIER_POS.z * 0.5); if (hd > this.def.arena * 0.8) tp = new V3(0, 90, CARRIER_POS.z * 0.5);
    const inv = P.quat.clone().invert(), lo = new V3().copy(tp).sub(P.pos).applyQuaternion(inv), dist = lo.length();
    const yawErr = Math.atan2(-lo.x, -lo.z), pitchErr = Math.atan2(lo.y, Math.hypot(lo.x, lo.z));
    c.x = -clamp(yawErr * 2.2, -1, 1); c.y = -clamp(pitchErr * 2.2, -1, 1);
    c.fire = Math.abs(yawErr) < 0.2 && Math.abs(pitchErr) < 0.25 && dist < 320;
    if (Math.abs(yawErr) > 2.4 && st.uT <= 0 && P.uturn <= 0) { c.uturnDown = true; st.uT = 4; }
    if (dist > 280) c.boost = true; if (dist < 60 && best && best.kind !== 'fighter') c.brake = true;
    for (const b of W.bullets) { if (b.alive && b.team === 'e' && b.pos.distanceTo(P.pos) < 20 && st.rollT <= 0 && P.rolling <= 0 && Math.random() < 0.07) { st.rollT = 2.5; if (Math.random() < 0.5) c.rollLDown = true; else c.rollRDown = true; break; } }
    if (near >= 5 && P.bombs > 0 && Math.random() < 0.01) c.bombDown = true;
    if (near >= 3 && P.chargeT === 0 && Math.random() < 0.01) st.chargeT = 1.0;
    if (st.chargeT > 0) { st.chargeT -= dt; c.charge = true; c.fire = false; if (st.chargeT <= 0) { c.charge = false; c.chargeUp = true; } }
    return c;
  }
  update(dt0, ctlIn) {
    let dt = dt0; if (W.hitstop > 0) { W.hitstop -= dt0; dt = dt0 * 0.08; } dt *= this.ended ? W.slow : 1;
    this.time += dt; W.time += dt; this.introT = Math.max(0, this.introT - dt);
    const P = this.player; const c = this.attract ? this.aiControl(dt) : ctlIn; this.ctl = c;
    // hints
    if (this.hint) { this.hintT += dt; if (this.hint.done(c, P) && this.hintT > 0.6) { this.hint = null; UI.clearHint(true); } else if (this.hintT > 12) { this.hint = null; UI.clearHint(false); } }
    // ---- mission script ----
    if (!this.ended && this.introT <= 0) {
      this.spawnT -= dt;
      if (this.phase === 1) {
        if (this.wave === 0 && this.time > 4) { this.wave = 1; this.spawnFighters(4); }
        else if (this.wave > 0 && this.wave < 3 && this.enemiesLeft() <= 1 && this.spawnT <= 0) { this.wave++; this.spawnT = 4; this.spawnFighters(this.wave === 2 ? 5 : 5, this.wave === 3); if (this.wave === 2) this.say('rook', 'More of them! Is there no end to these wretched Hexwings?'); if (this.wave === 3) { this.hint = HINTS.radar; UI.setHint(this.hint, this); this.hintT = 6; } }
        else if (this.wave === 3 && this.enemiesLeft() === 0 && this.spawnT <= 0) { this.phase = 2; this.say('hollin', 'Fighters down. Shield generators are the glowing orbs on the hull — shoot them all!'); UI.banner('PHASE 2', 'BREAK THE SHIELD'); Sfx.warn(); }
      } else {
        this.hangarT -= dt; if (this.hangarT <= 0) { this.hangarT = this.phase === 3 ? 14 : 20; if (this.enemiesLeft() < 4) this.spawnFighters(2); }
      }
      // carrier cannon volley
      this.volleyT = (this.volleyT === undefined ? 9 : this.volleyT) - dt;
      if (this.volleyT <= 0 && this.phase >= 2) { this.volleyT = this.phase === 3 ? 6 : 10; for (let i = 0; i < (this.phase === 3 ? 3 : 2); i++) setTimeout(() => { if (W.stage === this && !this.ended) this.enemyMissile(null, new V3(CARRIER_POS.x + rand(-40, 40), CARRIER_POS.y + 25, CARRIER_POS.z + rand(-40, 120))); }, i * 300); }
      this.nextSupply -= dt; if (this.nextSupply <= 0) { this.nextSupply = 24; if (P.hp < P.maxHp * 0.8 || P.bombs < 2) { const a = rand(TAU); W.add(new Pickup(this, P.bombs < 2 ? 'bomb' : 'ring', 0, 0, 0, { pos: new V3(Math.cos(a) * 160, rand(40, 110), CARRIER_POS.z * 0.5 + Math.sin(a) * 160), life: 25 })); this.toast('SUPPLY SPOTTED — CHECK RADAR', 'good'); } }
    }
    // objective text
    if (this.phase === 1) UI.setObjective(`DESTROY FIGHTERS <b>${this.enemiesLeft()}</b>`);
    else if (this.phase === 2) UI.setObjective(`SHIELD GENERATORS <b>${this.nodesLeft}</b> / 4`);
    else if (!this.ended) UI.setObjective('DESTROY THE BRIDGE CORE');
    else UI.setObjective('');
    if (this.phase === 3 && !this.ended) W.hudBoss = { name: 'BIRNAM FORTRESS · CORE', hp: this.core.hp, max: this.core.maxHp };
    else if (this.aceRef && this.aceRef.alive) W.hudBoss = { name: 'GWYN THE WEIRD', hp: this.aceRef.hp, max: this.aceRef.maxHp };
    // lightning
    this.lightT -= dt; if (this.lightT <= 0) { this.lightT = rand(5, 11); this.lightning = 1; Sfx.noise({ ft: 'lowpass', f1: 400, f2: 60, dur: 1.4, vol: 0.25, delay: 0.3 }); }
    if (this.lightning) { this.lightning = Math.max(0, this.lightning - dt * 3); Gfx.hemi.intensity = 1.15 + this.lightning * 1.6; }
    P.update(dt, c, this);
    for (const e of W.ents) {
      if (!e.alive || e === P) continue;
      if (e instanceof Flyer || e instanceof Flak || e instanceof RangeWing) e.update(dt, this);
      else if (e instanceof CoreNode) { e.update(dt); e.syncBody(); e.syncMesh(); }
      else if (e instanceof Pickup) { e.update(dt, this); e.syncBody(); e.syncMesh(); }
    }
    if (this.core.alive) { this.coreGlow.scale.setScalar(this.core.active ? 1 + Math.sin(this.time * 8) * 0.12 : 0.8); this.coreGlow.material = glowMat(this.core.active ? 0x66f0ff : 0xff6a3a); }
    P.syncMesh(); P.mesh.quaternion.copy(P.tilt);
    Phys.step(dt); Bullets.update(dt);
    for (let i = W.ents.length - 1; i >= 0; i--) { const e = W.ents[i]; if (!e.alive && e !== P) { e.dispose(); W.ents.splice(i, 1); } }
    if (this.carrierDying) { this.endT; if (Math.random() < dt * 16) { const p = new V3(rand(-35, 35), rand(-8, 40), rand(-130, 130)).add(CARRIER_POS); FX.explosion(p, rand(1.5, 3)); Sfx.explode(3); W.addShake(0.4); } this.carrierMesh.position.y -= dt * 3; this.carrierMesh.rotation.z += dt * 0.01; }
    FX.update(dt); Debris.update(dt);
    W.shake = Math.max(0, W.shake - dt * 2.2); if (W.flashWhite) W.flashWhite = Math.max(0, W.flashWhite - dt * 2);
    if (this.ended) { this.endT += dt0; W.slow = Math.min(1, W.slow + dt0 * 0.3); if (this.endT > 7 && !this.completed) { this.completed = true; Game.stageComplete(this); } }
    if (P.dead && P.deadT > 2.6 && !this.deathHandled) { this.deathHandled = true; Game.playerDied(this); }
    this.updateCamera(dt0, false); Gfx.followShadow(P.pos);
    UI.setBossBar(W.hudBoss); W.hudBoss = null;
    UI.els.warn.classList.toggle('hidden', !this.behindWarn(P));
    UI.els.warn.textContent = this.oobWarn ? 'WARNING — RETURN TO THE COMBAT AREA' : 'WARNING — ENEMY BEHIND YOU';
    if (this.oobWarn) UI.els.warn.classList.remove('hidden');
    this.updateArrows();
    Dust.update(Gfx.camera.position, P.aimFwd, P.speed);
  }
  behindWarn(P) { if (!P.alive) return false; for (const e of W.ents) { if (!e.alive || e.kind !== 'fighter' && e.kind !== 'ace' || e.tgt !== P) continue; const d = this.tmp.copy(e.pos).sub(P.pos); const L = d.length(); if (L < 55 && d.normalize().dot(P.aimFwd) < -0.45) { return true; } } return false; }
  updateArrows() {
    const list = [], cam = Gfx.camera; let n = 0;
    for (const e of W.ents) {
      if (!e.alive || e.team !== 'e' || (e.kind !== 'fighter' && e.kind !== 'ace')) continue;
      const p = Gfx.project(e.pos); const inside = p.vis && p.x > 40 && p.x < Gfx.w - 40 && p.y > 40 && p.y < Gfx.h - 40; if (inside) continue;
      let dx = p.x - Gfx.w / 2, dy = p.y - Gfx.h / 2; if (!p.vis) { dx = -dx; dy = -dy; }
      const ang = Math.atan2(dy, dx), m = Math.max(Math.abs(dx) / (Gfx.w / 2 - 50), Math.abs(dy) / (Gfx.h / 2 - 50));
      list.push({ x: Gfx.w / 2 + dx / m, y: Gfx.h / 2 + dy / m, ang: ang + Math.PI / 2, col: e.kind === 'ace' ? '#ffd23a' : '#ff4a6a' }); if (++n >= 6) break;
    }
    UI.updateArrows(list);
  }
  updateCamera(dt, snap) {
    const P = this.player, cam = Gfx.camera, intro = this.introT > 0 ? this.introT / 3.2 : 0;
    const k = snap ? 1 : 1 - Math.exp(-5.5 * dt);
    const dy = ((P.yaw - this.camYaw + Math.PI) % TAU + TAU) % TAU - Math.PI; this.camYaw += dy * k; this.camPitch = lerp(this.camPitch, P.pitch * 0.7, snap ? 1 : 1 - Math.exp(-4 * dt));
    const back = 13 + (P.speedMul - 1) * 3 + intro * 22, cp = Math.cos(this.camPitch);
    const dir = this.tmp.set(-Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), -Math.cos(this.camYaw) * cp);
    const desired = P.pos.clone().addScaledVector(dir, -back).add(new V3(0, 4.2 + intro * 5, 0));
    if (snap || !this.camInit) { this.camPos.copy(desired); this.camInit = true; } else this.camPos.lerp(desired, 1 - Math.exp(-12 * dt));
    cam.position.copy(this.camPos); if (W.shake > 0) cam.position.add(new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(W.shake * 0.55));
    cam.up.set(0, 1, 0); this.camLook.copy(P.pos).addScaledVector(P.aimFwd, 45); cam.lookAt(this.camLook);
    cam.rotateZ(-P.bankV * 0.15 * (P.uturn > 0 ? 0 : 1));
    const baseFov = Gfx.baseFov || 62, tf = baseFov + (P.boosting ? 10 : P.braking ? -5 : 0) + intro * 14 + W.shake * 3;
    cam.fov = damp(cam.fov, tf, 6, dt || 0.016); cam.updateProjectionMatrix(); Gfx.updateSky(cam.position);
  }
  reticle() { const P = this.player; return Gfx.project(this.tmp.copy(P.pos).addScaledVector(P.aimFwd, 70)); }
  dispose() { Sfx.setEngine(false, 0); Gfx.hemi.intensity = 1.15; }
}
