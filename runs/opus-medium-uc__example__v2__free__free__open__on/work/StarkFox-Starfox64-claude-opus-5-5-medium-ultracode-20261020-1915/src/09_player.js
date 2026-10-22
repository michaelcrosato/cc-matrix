// ===== 09_player.js — game state, projectiles, player ship, wingmen =====
const G = {
  state: 'boot', mode: 'rails', stageId: null, stage: null, time: 0, stageTime: 0,
  player: null, wingmen: [], ents: [], shots: [], boss: null,
  hits: 0, stageHits: 0, totalHits: 0, lives: 3, bombs: 3, laser: 0, gold: 0, goldTotal: 0, shieldMax: 100,
  attract: false, cinematic: false, checkpoint: null, routeTaken: [], camMode: 0, paused: false,
  diffDmg() { return [0.55, 1, 1.45][Settings.difficulty]; },
  diffFire() { return [0.55, 1, 1.35][Settings.difficulty]; },
};
const LASER_COL = [0x6dff6a, 0x6dff6a, 0x5ab8ff];

// ---------------------------------------------------------------- projectiles
const ShotGeo = {
  laser: new THREE.BoxGeometry(0.32, 0.32, 7),
  hyper: new THREE.BoxGeometry(0.55, 0.55, 9),
  core: new THREE.SphereGeometry(1, 12, 8),
  halo: new THREE.SphereGeometry(1.7, 12, 8),
  bomb: new THREE.CapsuleGeometry(0.6, 1.6, 4, 8),
};
class Shot {
  constructor(kind, owner, pos, vel, o = {}) {
    this.kind = kind; this.owner = owner; this.pos = pos.clone(); this.vel = vel.clone(); this.prev = pos.clone();
    this.life = o.life ?? 1.6; this.dmg = o.dmg ?? 1; this.target = o.target || null; this.alive = true; this.age = 0;
    this.radius = o.radius ?? 0;
    let m;
    if (kind === 'laser') {
      m = new THREE.Mesh(o.hyper ? ShotGeo.hyper : ShotGeo.laser, glow(o.color ?? 0x6dff6a, 3.2));
    } else if (kind === 'eshot') {
      m = new THREE.Group();
      m.add(new THREE.Mesh(ShotGeo.core, glow(0xffffff, 2.5)));
      const h = new THREE.Mesh(ShotGeo.halo, glow(o.color ?? 0xff3a2a, 2.8, { additive: true, opacity: 0.8 }));
      m.add(h);
      m.scale.setScalar(o.scale ?? 0.85);
    } else if (kind === 'charge') {
      m = new THREE.Group();
      m.add(new THREE.Mesh(ShotGeo.core, glow(0xeaffea, 3)));
      m.add(new THREE.Mesh(ShotGeo.halo, glow(0x4dff6a, 3, { additive: true, opacity: 0.85 })));
      m.scale.setScalar(1.6);
    } else if (kind === 'bomb') {
      m = new THREE.Group();
      const b = mkMesh(ShotGeo.bomb, toon(0xff3a4a, { emissive: 0xff2030, emissiveIntensity: 0.6 }), { thickness: 0.08 });
      b.rotation.x = Math.PI / 2; m.add(b);
      m.add(new THREE.Mesh(ShotGeo.halo, glow(0xff5060, 2.2, { additive: true, opacity: 0.6 })));
    }
    m.position.copy(pos);
    if (kind === 'laser') m.lookAt(_v1.copy(pos).add(vel));
    this.mesh = m;
    R.scene.add(m);
  }
  kill() { this.alive = false; this.mesh.removeFromParent(); }
}
function fireShot(kind, owner, pos, vel, o) { const s = new Shot(kind, owner, pos, vel, o); G.shots.push(s); return s; }

function detonateBomb(pos) {
  FX.bombBlast(pos);
  AudioSys.play('bombExplode');
  FX.addShake(3.5, 0.6);
  Input.rumble(1, 1, 450);
  let kills = 0;
  for (const e of G.ents) {
    if (!e.alive || !e.hostile) continue;
    if (e.worldPos().distanceTo(pos) < 75 + (e.radius || 0)) { if (e.damage(14, 'bomb')) kills++; }
  }
  for (const s of G.shots) if (s.alive && s.owner === 'enemy' && s.pos.distanceTo(pos) < 90) { FX.sparksAt(s.pos, 4); s.kill(); }
  if (kills > 1) Game.bonus(kills - 1, pos);
}
function detonateCharge(pos) {
  FX.explode(pos, 2.2, { debris: false });
  FX.shockwave(pos, 26, 0x6dff6a, 0.5);
  AudioSys.play('explosion');
  let kills = 0;
  for (const e of G.ents) {
    if (!e.alive || !e.hostile) continue;
    if (e.worldPos().distanceTo(pos) < 26 + (e.radius || 0)) { if (e.damage(8, 'charge')) kills++; }
  }
  if (kills > 1) Game.bonus(kills - 1, pos);
}

function updateShots(dt) {
  const P = G.player;
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    if (!s.alive) { G.shots.splice(i, 1); continue; }
    s.age += dt; s.life -= dt;
    s.prev.copy(s.pos);
    // homing for charge shots / bombs with a locked target
    if (s.target && s.target.alive && (s.kind === 'charge' || s.kind === 'bomb')) {
      const sp = s.vel.length();
      const want = _v1.subVectors(s.target.worldPos(), s.pos).normalize().multiplyScalar(sp);
      s.vel.lerp(want, 1 - Math.exp(-dt * 9));
    }
    s.pos.addScaledVector(s.vel, dt);
    s.mesh.position.copy(s.pos);
    if (s.kind === 'laser') s.mesh.lookAt(_v1.copy(s.pos).add(s.vel));
    if (s.kind === 'bomb' || s.kind === 'charge') FX.engineTrail(s.pos, V3(), s.kind === 'bomb' ? 0xff5060 : 0x6dff6a, 1.2);
    if (s.kind === 'eshot') s.mesh.rotation.z += dt * 10;

    if (s.owner === 'player' || s.owner === 'ally') {
      const mask = GRP.ENEMY | GRP.STATIC | GRP.PICKUP | (s.owner === 'player' ? GRP.ALLY : 0);
      const hit = Phys.segment(s.prev, s.pos, mask);
      if (hit) {
        const e = hit.entity;
        if (s.kind === 'bomb') { detonateBomb(hit.point); s.kill(); continue; }
        if (s.kind === 'charge') { detonateCharge(hit.point); s.kill(); continue; }
        if (e && e.isWingman) { if (s.owner === 'player') e.friendlyFire(); FX.sparksAt(hit.point, 6, 0xffffff); s.kill(); continue; }
        if (e && e.alive) {
          if (e.armored && !e.armored()) { FX.sparksAt(hit.point, 8, 0xd0e0ff, 30); AudioSys.play('deflect', { volume: 0.4, pitch: 1.6 }); }
          else { if (s.owner === 'player') Game.stat('landed'); e.damage(s.dmg, s.owner, hit.point); }
        } else FX.sparksAt(hit.point, 5, 0xffe0a0, 20);
        s.kill(); continue;
      }
      if (s.kind === 'bomb' && s.life <= 0) { detonateBomb(s.pos); s.kill(); continue; }
      if (s.kind === 'charge' && s.life <= 0) { detonateCharge(s.pos); s.kill(); continue; }
    } else if (s.owner === 'enemy') {
      // vs player (barrel roll deflects)
      if (P && P.alive) {
        const d = s.pos.distanceTo(P.pos);
        if (P.rollT > 0 && d < 9) {
          s.owner = 'player';
          s.vel.multiplyScalar(-1.4);
          s.life = 1.2; s.dmg = 2;
          FX.sparksAt(s.pos, 10, 0x9fe8ff, 40);
          AudioSys.play('deflect');
          Game.stat('deflects');
          continue;
        }
        if (d < 2.6 + (s.radius || 0)) { P.takeHit(8 * (s.dmgMul || 1), s.pos); FX.sparksAt(s.pos, 10, 0xff8060); s.kill(); continue; }
      }
      for (const w of G.wingmen) {
        if (w.active && s.pos.distanceTo(w.pos) < 3) { w.damage(6); s.kill(); break; }
      }
      if (!s.alive) continue;
      const hit = Phys.segment(s.prev, s.pos, GRP.STATIC);
      if (hit) { FX.sparksAt(hit.point, 4, 0xff8060, 15); s.kill(); continue; }
    }
    if (s.life <= 0) s.kill();
  }
}

// ---------------------------------------------------------------- player
class Player {
  constructor() {
    this.mesh = Models.playerShip({ body: 0xeef1f6, accent: 0xff7a1a, trim: 0x1b2233, glow: 0x59d6ff });
    R.scene.add(this.mesh);
    this.pos = V3(); this.prevPos = V3(); this.vel = V3(); this.quat = new THREE.Quaternion(); this.nose = V3(0, 0, -1);
    this.collider = Phys.addSensor(this, { type: 'ball', r: 2.4 }, GRP.PLAYER);
    this.reset();
    this.retA = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.85, 4, 1), glow(0x9dff8a, 2.4, { transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    this.retB = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.8, 4, 1), glow(0x9dff8a, 2.4, { transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
    for (const r of [this.retA, this.retB]) { r.renderOrder = 10; r.material.depthTest = false; r.geometry.rotateZ(Math.PI / 4); R.scene.add(r); }
    this.trailT = 0;
  }
  reset() {
    this.alive = true; this.shield = G.shieldMax; this.wingHP = [3, 3];
    this.lx = 0; this.ly = 0; this.vx = 0; this.vy = 0; this.dz = 0;
    this.rollT = 0; this.rollDir = 1; this.rollCD = 0; this.bank = 0; this.bankVis = 0; this.maneuver = null;
    this.boost = 1; this.boostLock = false; this.boosting = false; this.braking = false;
    this.chargeT = 0; this.fireHeld = 0; this.lock = null; this.rapidCD = 0;
    this.invuln = 0; this.yaw = 0; this.pitch = 0; this.speed = 70; this.visRoll = 0; this.flipRoll = 0;
    this.scrapeCD = 0; this.chargeSnd = null; this.lowSnd = null;
    this.in = { sx: 0, sy: 0 };
    if (this.mesh) { this.mesh.visible = true; this.mesh.userData.wingL.visible = true; this.mesh.userData.wingR.visible = true; }
  }
  get laserLevel() { return (this.wingHP[0] <= 0 || this.wingHP[1] <= 0) ? 0 : G.laser; }

  // ---- shared controls ----
  controls(dt, ai) {
    const I = ai || {
      sx: Input.st.steerX, sy: Input.st.steerY * (Settings.flightInvert ? -1 : 1),
      boost: Input.st.boostAmt > 0.3, brake: Input.st.brakeAmt > 0.3,
      fireP: Input.pressed('fire'), fireH: Input.held('fire'), fireR: Input.released('fire'), rapid: Input.held('rapid'),
      bomb: Input.pressed('bomb'), roll: Input.roll, bankL: Input.held('rollL'), bankR: Input.held('rollR'), flip: Input.pressed('flip'),
    };
    this.in = I;
    // boost / brake meter
    const wantBoost = I.boost && !this.boostLock && !this.maneuver;
    const wantBrake = I.brake && !this.boostLock && !wantBoost && !this.maneuver;
    if (wantBoost || wantBrake) {
      this.boost -= dt * 0.55;
      if (this.boost <= 0) { this.boost = 0; this.boostLock = true; }
    } else {
      this.boost = Math.min(1, this.boost + dt * 0.32);
      if (this.boostLock && this.boost >= 1) this.boostLock = false;
    }
    if (wantBoost && !this.boosting) { AudioSys.play('roll', { pitch: 0.6 }); Input.rumble(0.2, 0.5, 200); }
    this.boosting = wantBoost; this.braking = wantBrake;
    if (G.attract) { this.boost = 1; this.boostLock = false; }
    // barrel roll (double tap) & bank (hold)
    this.rollCD -= dt;
    if (I.roll && this.rollT <= 0 && this.rollCD <= 0 && !this.maneuver) {
      this.rollT = 0.62; this.rollDir = I.roll; this.rollCD = 0.15;
      AudioSys.play('roll'); Game.hintDone('roll'); Game.stat('rolls');
    }
    if (this.rollT > 0) this.rollT -= dt;
    const bankTarget = (I.bankR ? -1 : 0) + (I.bankL ? 1 : 0);
    this.bank = damp(this.bank, bankTarget, 10, dt);
    // somersault / U-turn
    if (I.flip && !this.maneuver && this.rollT <= 0) {
      if (G.mode === 'allrange' && I.brake) this.startManeuver('uturn');
      else this.startManeuver('loop');
    }
    // weapons
    this.weapons(dt, I);
  }
  startManeuver(type) {
    if (type === 'loop') { this.maneuver = { type, t: 0, T: 1.45, y0: this.ly, dz0: this.dz, yaw0: this.yaw, pitch0: this.pitch }; AudioSys.play('somersault'); Game.hintDone('flip'); }
    else { this.maneuver = { type, t: 0, T: 1.25, yaw0: this.yaw, pitch0: this.pitch }; AudioSys.play('uturn'); Game.hintDone('uturn'); }
    Game.stat('loops');
    this.boost = Math.max(0, this.boost - 0.35);
  }
  muzzles() {
    const u = this.mesh.userData;
    this.mesh.updateMatrixWorld(true);
    return [u.gunL.getWorldPosition(V3()), u.gunR.getWorldPosition(V3())];
  }
  weapons(dt, I) {
    if (G.cinematic) return;
    const lvl = this.laserLevel;
    const fireLaser = () => {
      const [a, b] = this.muzzles();
      const v = this.nose.clone().multiplyScalar(720).add(this.vel);
      const col = LASER_COL[lvl];
      const opts = { dmg: lvl === 2 ? 2 : 1, hyper: lvl === 2, color: col, life: 0.9 };
      if (lvl === 0) { const c = a.add(b).multiplyScalar(0.5); fireShot('laser', 'player', c, v, opts); FX.muzzle(c, col); }
      else { fireShot('laser', 'player', a, v, opts); fireShot('laser', 'player', b, v, opts); FX.muzzle(a, col); FX.muzzle(b, col); }
      AudioSys.play(lvl === 0 ? 'laser' : lvl === 1 ? 'laserTwin' : 'laserHyper', { volume: 0.7 });
      Game.stat('shots');
    };
    if (I.fireP) { fireLaser(); this.fireHeld = 0; }
    if (I.fireH) {
      this.fireHeld += dt;
      if (this.fireHeld > 0.32) {
        const before = this.chargeT;
        this.chargeT = Math.min(1, this.chargeT + dt / 0.65);
        if (!this.chargeSnd) this.chargeSnd = AudioSys.loop('charge');
        this.chargeSnd && this.chargeSnd.set({ level: this.chargeT });
        if (this.chargeT >= 1 && before < 1) { AudioSys.play('lock', { pitch: 0.8 }); Input.rumble(0.1, 0.3, 80); }
        if (this.chargeT >= 1) this.findLock();
      }
    }
    if (I.fireR) {
      if (this.chargeT >= 1) {
        const [a, b] = this.muzzles();
        const c = a.add(b).multiplyScalar(0.5);
        fireShot('charge', 'player', c, this.nose.clone().multiplyScalar(this.lock ? 260 : 380).add(this.vel), { target: this.lock, life: this.lock ? 3 : 1.1 });
        AudioSys.play('chargeShot'); Input.rumble(0.3, 0.6, 140);
        Game.hintDone('charge'); Game.stat('charges');
      }
      this.chargeT = 0; this.fireHeld = 0; this.lock = null;
      if (this.chargeSnd) { this.chargeSnd.stop(); this.chargeSnd = null; }
    }
    this.rapidCD -= dt;
    if (I.rapid && this.rapidCD <= 0) { fireLaser(); this.rapidCD = 0.11; }
    if (I.bomb) {
      if (G.bombs > 0 || G.attract) {
        if (!G.attract) G.bombs--;
        const [a, b] = this.muzzles();
        fireShot('bomb', 'player', a.add(b).multiplyScalar(0.5), this.nose.clone().multiplyScalar(220).add(this.vel), { target: this.lock || this.findLock(true), life: 1.0 });
        AudioSys.play('bomb'); Game.hintDone('bomb'); Game.stat('bombs');
      } else AudioSys.play('menuBack', { volume: 0.5 });
    }
  }
  findLock(peek) {
    let best = null, bd = 0.13;
    for (const e of G.ents) {
      if (!e.alive || !e.hostile || !e.lockable) continue;
      const wp = e.worldPos();
      const to = _v1.subVectors(wp, this.pos);
      const dist = to.length();
      if (dist > 520 || dist < 8) continue;
      const ang = 1 - to.multiplyScalar(1 / dist).dot(this.nose);
      if (ang < bd) { bd = ang; best = e; }
    }
    if (!peek) {
      if (best && best !== this.lock) AudioSys.play('lock');
      this.lock = best;
    }
    return best;
  }

  // ---- damage ----
  takeHit(dmg, from, wing) {
    if (!this.alive || this.invuln > 0 || G.attract || G.cinematic) return;
    dmg *= G.diffDmg();
    this.shield -= dmg;
    this.invuln = 0.35;
    R.hitU.value = 0.9;
    FX.addShake(1.6, 0.25);
    Input.rumble(0.8, 0.5, 220);
    AudioSys.play('playerHit');
    Game.stat('damage', dmg);
    // wing damage: hits on a side chip that wing
    const side = wing ?? (from ? (_v1.subVectors(from, this.pos).dot(this.rightVec()) > 0 ? 1 : 0) : -1);
    if (side >= 0 && Math.random() < (wing !== undefined ? 1 : 0.4)) {
      const was = this.wingHP[side];
      this.wingHP[side] = Math.max(0, was - 1);
      if (was > 0 && this.wingHP[side] === 0) {
        const w = side ? this.mesh.userData.wingR : this.mesh.userData.wingL;
        w.visible = false;
        FX.explode(w.getWorldPosition(V3()), 0.8, { color: 0xeef1f6 });
        AudioSys.play('wingBreak');
        Game.radio('tobi', side ? 'Your right wing is gone! Lasers are back to single — grab a wing repair!' : 'Your left wing is gone! Lasers are back to single — grab a wing repair!', 2);
      }
    }
    if (this.shield <= G.shieldMax * 0.25 && this.shield > 0 && !this.lowWarned) { this.lowWarned = true; AudioSys.play('alarm'); Game.radio('marlow', 'Your shield is low, Vix! Look for silver rings!', 1); }
    if (this.shield <= 0) this.die();
  }
  rightVec() { return V3(1, 0, 0).applyQuaternion(this.quat); }
  die() {
    this.alive = false; this.shield = 0;
    FX.explode(this.pos, 3, { color: 0xeef1f6 });
    FX.addShake(4, 0.8);
    AudioSys.play('explosionBig');
    Input.rumble(1, 1, 700);
    this.mesh.visible = false;
    this.retA.visible = this.retB.visible = false;
    if (this.chargeSnd) { this.chargeSnd.stop(); this.chargeSnd = null; }
    Game.onPlayerDeath();
  }
  heal(n) { this.shield = Math.min(G.shieldMax, this.shield + n); if (this.shield > G.shieldMax * 0.25) this.lowWarned = false; }
  repairWings() {
    this.wingHP = [3, 3];
    this.mesh.userData.wingL.visible = true; this.mesh.userData.wingR.visible = true;
  }

  // ---- update: rails mode ----
  updateRails(dt, frameS) {
    const I = this.in;
    const BX = 24, BYlo = -20, BYhi = 19;
    const acc = this.bank !== 0 ? 1 + Math.abs(this.bank) * 0.6 : 1;
    const tx = I.sx * 40 * acc, ty = -I.sy * 32;
    this.vx = damp(this.vx, tx, 6, dt);
    this.vy = damp(this.vy, ty, 6, dt);
    // during somersault the stick is ignored for altitude
    const m = this.maneuver;
    let pitchExtra = 0;
    if (m && m.type === 'loop') {
      m.t += dt;
      const k = Math.min(1, m.t / m.T);
      const th = k * TAU;
      const Rr = 26;
      this.ly = m.y0 + Rr * (1 - Math.cos(th)) * 0.9;
      this.dz = m.dz0 + Rr * Math.sin(th) - Rail.speed * m.t * 0.75;
      pitchExtra = th;
      if (k >= 1) { this.maneuver = null; this.ly = m.y0; }
    } else {
      this.lx += this.vx * dt; this.ly += this.vy * dt;
      this.dz = damp(this.dz, 0, 1.6, dt);
    }
    if (this.lx < -BX) { this.lx = -BX; this.vx = Math.max(0, this.vx); }
    if (this.lx > BX) { this.lx = BX; this.vx = Math.min(0, this.vx); }
    if (!m) { if (this.ly < BYlo) { this.ly = BYlo; this.vy = Math.max(0, this.vy); } if (this.ly > BYhi) { this.ly = BYhi; this.vy = Math.min(0, this.vy); } }
    const f = Rail.frame(frameS + this.dz);
    this.prevPos.copy(this.pos);
    this.pos.copy(f.pos).addScaledVector(f.right, this.lx).addScaledVector(f.up, this.ly);
    // ground clearance via physics ray
    const gy = Phys.groundY(this.pos.x, this.pos.z, this.pos.y + 60);
    if (gy > -900 && this.pos.y < gy + 3) {
      const push = gy + 3 - this.pos.y;
      this.ly += push; this.pos.y += push; this.vy = Math.max(this.vy, 14);
      this.scrapeCD -= dt;
      if (this.scrapeCD <= 0) { this.scrapeCD = 0.3; this.takeHit(4, null, Math.random() < 0.5 ? 0 : 1); FX.sparksAt(_v1.set(this.pos.x, gy, this.pos.z), 14, 0xffd080, 30); }
    }
    if (dt > 0) this.vel.subVectors(this.pos, this.prevPos).multiplyScalar(1 / dt);
    // orientation: rail basis × input-driven yaw/pitch/roll
    _m1.makeBasis(f.right, f.up, _v1.copy(f.tan).negate());
    const base = _q1.setFromRotationMatrix(_m1);
    const nx = this.vx / 40, ny = this.vy / 32;
    const yaw = -nx * 0.32, pitch = ny * 0.26 + pitchExtra;
    if (this.rollT > 0) this.visRoll = -this.rollDir * TAU * smooth(1 - this.rollT / 0.62);
    else this.visRoll = 0;
    this.bankVis = damp(this.bankVis, this.bank * 1.45, 12, dt);
    const roll = -nx * 0.55 + this.bankVis + this.visRoll;
    const aimQ = _q2.setFromEuler(_e1.set(pitch, yaw, 0, 'YXZ'));
    const aim = base.clone().multiply(aimQ);
    this.nose.set(0, 0, -1).applyQuaternion(aim);
    this.quat.copy(aim).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), roll));
    this.commonVisuals(dt);
    this.collisions(dt, f);
  }

  // ---- update: all-range mode ----
  updateAllRange(dt) {
    const I = this.in;
    const tgtSpeed = this.boosting ? 135 : this.braking ? 34 : 72;
    this.speed = damp(this.speed, tgtSpeed, 3, dt);
    const m = this.maneuver;
    let q;
    if (m) {
      m.t += dt;
      const k = Math.min(1, m.t / m.T);
      const span = m.type === 'loop' ? TAU : Math.PI;
      const th = smooth(k) * span;
      q = new THREE.Quaternion().setFromEuler(_e1.set(m.pitch0, m.yaw0, 0, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), th));
      if (k >= 1) {
        this.maneuver = null;
        if (m.type === 'uturn') { this.yaw = m.yaw0 + Math.PI; this.pitch = -m.pitch0; this.flipRoll = Math.PI; }
      }
    }
    if (!m) {
      const turn = 1 + Math.abs(this.bank) * 0.8;
      this.yaw -= I.sx * 1.55 * turn * dt;
      this.pitch = clamp(this.pitch - I.sy * 1.25 * dt, -1.2, 1.2);
      this.pitch = damp(this.pitch, 0, I.sy ? 0 : 0.35, dt);
      q = new THREE.Quaternion().setFromEuler(_e1.set(this.pitch, this.yaw, 0, 'YXZ'));
    }
    this.flipRoll = damp(this.flipRoll, 0, 5, dt);
    this.nose.set(0, 0, -1).applyQuaternion(q);
    this.prevPos.copy(this.pos);
    this.pos.addScaledVector(this.nose, this.speed * dt);
    if (this.pos.y < -400) this.pos.y = -400;
    if (dt > 0) this.vel.subVectors(this.pos, this.prevPos).multiplyScalar(1 / dt);
    // arena boundary: auto U-turn
    const lim = G.stage.arenaRadius || 1100;
    if (this.pos.length() > lim && !this.maneuver && this.nose.dot(this.pos) > 0) {
      this.startManeuver('uturn');
      Game.toast('TURNING BACK — LEAVING COMBAT AREA');
    }
    if (this.rollT > 0) this.visRoll = -this.rollDir * TAU * smooth(1 - this.rollT / 0.62); else this.visRoll = 0;
    this.bankVis = damp(this.bankVis, this.bank * 1.45 - (m ? 0 : I.sx * 0.7), 8, dt);
    this.quat.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), this.bankVis + this.visRoll + this.flipRoll));
    this.commonVisuals(dt);
    this.collisions(dt, null);
  }

  commonVisuals(dt) {
    this.mesh.position.copy(this.pos);
    this.mesh.quaternion.copy(this.quat);
    Phys.syncCollider(this.collider, this.pos);
    this.invuln -= dt;
    // invulnerability blink
    this.mesh.visible = this.alive && !(this.invuln > 0 && Math.floor(this.invuln * 30) % 2 === 0);
    const u = this.mesh.userData;
    const thr = this.boosting ? 2.2 : this.braking ? 0.4 : 1;
    for (const e of u.engines) { e.scale.setScalar(lerp(e.scale.x, thr * (0.9 + Math.random() * 0.2), 0.4)); }
    this.trailT -= dt;
    if (this.trailT <= 0 && this.alive) {
      this.trailT = 0.016;
      for (const e of u.engines) FX.engineTrail(e.getWorldPosition(_v1), V3(), this.boosting ? 0x8ff0ff : 0x59d6ff, this.boosting ? 0.9 : 0.55);
      if (this.shield < G.shieldMax * 0.3 || this.wingHP[0] <= 0 || this.wingHP[1] <= 0) if (Math.random() < 0.35) FX.smokePuff(this.pos, 1.2, 0.8, 0x4a4a50);
    }
    // reticles
    const show = this.alive && !G.cinematic;
    this.retA.visible = this.retB.visible = show;
    if (show) {
      this.retA.position.copy(this.pos).addScaledVector(this.nose, 42);
      this.retB.position.copy(this.pos).addScaledVector(this.nose, 90);
      this.retA.quaternion.copy(R.camera.quaternion); this.retB.quaternion.copy(R.camera.quaternion);
      const c = this.chargeT >= 1 ? (this.lock ? 0xff4a4a : 0xffe04a) : 0x9dff8a;
      this.retA.material.color.set(c).multiplyScalar(2.4); this.retB.material.color.set(c).multiplyScalar(2.4);
      const pulse = this.chargeT > 0 ? 1 + Math.sin(G.time * 30) * 0.1 * this.chargeT : 1;
      this.retA.scale.setScalar(pulse); this.retB.scale.setScalar(pulse * (1 - this.chargeT * 0.25));
    }
  }
  collisions(dt, f) {
    if (!this.alive) return;
    Phys.overlapSphere(this.pos, 2.4, GRP.STATIC | GRP.ENEMY | GRP.PICKUP, (c, ent) => {
      if (ent) { if (ent.alive && ent.onPlayerTouch) ent.onPlayerTouch(this); return; }
      if (World.terrainCollider && c.handle === World.terrainCollider.handle) {
        if (f) { this.vx = -Math.sign(this.lx) * 30; this.lx *= 0.96; }
        this.scrapeCD -= dt;
        if (this.scrapeCD <= 0) { this.scrapeCD = 0.3; this.takeHit(5, null, Math.random() < 0.5 ? 0 : 1); FX.sparksAt(this.pos, 12, 0xffd080, 30); }
        return;
      }
      // solid obstacle: bounce away from it
      const t = c.translation();
      const away = _v1.set(this.pos.x - t.x, this.pos.y - t.y, this.pos.z - t.z);
      if (f) {
        const ax = away.dot(f.right), ay = away.dot(f.up);
        const n = Math.hypot(ax, ay) || 1;
        this.vx = (ax / n) * 55; this.vy = (ay / n) * 40;
        this.lx += (ax / n) * 2.5; this.ly += (ay / n) * 2.5;
      } else {
        away.normalize();
        this.pos.addScaledVector(away, 4);
        this.yaw += Math.PI * 0.5 * (Math.random() < 0.5 ? 1 : -1);
      }
      if (this.invuln <= 0) { this.takeHit(12, V3(t.x, t.y, t.z)); FX.sparksAt(this.pos, 16, 0xffd080, 35); AudioSys.play('hit'); }
    });
  }
}

// ---------------------------------------------------------------- wingmen
const WINGMEN = {
  marlow: { name: 'Marlow', palette: { body: 0xe9edf2, accent: 0x8a93a6, trim: 0x22283a, glow: 0x9fd4ff }, slot: [-17, 3, 8] },
  kestrel: { name: 'Kestrel', palette: { body: 0xe9edf2, accent: 0x2f7bff, trim: 0x16203a, glow: 0x59d6ff }, slot: [15, 5, 9] },
  tobi: { name: 'Tobi', palette: { body: 0xe9edf2, accent: 0x3fc84a, trim: 0x18301c, glow: 0xa6ff7a }, slot: [0, 13, 14] },
};
class Wingman {
  constructor(id) {
    this.id = id; this.def = WINGMEN[id]; this.isWingman = true;
    this.mesh = Models.playerShip(this.def.palette);
    this.mesh.scale.setScalar(0.92);
    R.scene.add(this.mesh);
    this.pos = V3(); this.vel = V3(); this.quat = new THREE.Quaternion();
    this.hp = 100; this.active = true; this.retreating = 0; this.alive = true;
    this.collider = Phys.addSensor(this, { type: 'ball', r: 2.6 }, GRP.ALLY);
    this.trouble = null; this.shootCD = rand(1, 3); this.ffCD = 0; this.weave = rand(0, TAU);
    this.target = null; this.yaw = 0; this.pitch = 0; this.lx = this.def.slot[0]; this.ly = this.def.slot[1]; this.dz = this.def.slot[2];
    this.trailT = 0;
  }
  damage(n) {
    if (!this.active || G.attract) return;
    this.hp -= n * G.diffDmg();
    FX.sparksAt(this.pos, 6, 0xff9060);
    if (this.hp <= 0) {
      this.hp = 0; this.active = false; this.retreating = 3;
      Game.radio(this.id, pick(['I\'m hit bad! Pulling out for repairs!', 'Taking heavy damage — heading back to base!']), 3);
      FX.explode(this.pos, 0.8, { debris: false });
      Game.stat('wingmenLost');
    }
  }
  friendlyFire() {
    if (this.ffCD > 0) return;
    this.ffCD = 4; this.damage(3);
    Game.radio(this.id, pick({ marlow: ['Easy with that trigger, kid!'], kestrel: ['Hey! Whose side are you on?!', 'Watch your fire, hotshot!'], tobi: ['Ow! That was ME, Vix!'] }[this.id]), 1);
  }
  startTrouble(chaser, dur = 9) { this.trouble = { t: 0, dur, chaser }; }
  update(dt) {
    this.ffCD -= dt;
    this.weave += dt;
    if (this.retreating > 0) {
      this.retreating -= dt;
      this.pos.addScaledVector(V3(0, 0.6, 0).add(this.forward()), 160 * dt);
      this.mesh.position.copy(this.pos);
      if (this.retreating <= 0) this.mesh.visible = false;
      return;
    }
    if (!this.active) { this.mesh.visible = false; Phys.syncCollider(this.collider, V3(0, -9999, 0)); return; }
    this.mesh.visible = true;
    const prev = this.pos.clone();
    if (G.mode === 'rails') this.updateRails(dt); else this.updateFree(dt);
    this.vel.subVectors(this.pos, prev).multiplyScalar(1 / Math.max(dt, 1e-4));
    // orientation from velocity
    if (this.vel.lengthSq() > 1) {
      _m1.lookAt(V3(), _v1.copy(this.vel), V3(0, 1, 0));
      const want = new THREE.Quaternion().setFromRotationMatrix(_m1);
      const lateral = this.vel.clone().normalize().cross(V3(0, 1, 0)).dot(this.lastVel || this.vel) || 0;
      want.multiply(_q2.setFromAxisAngle(V3(0, 0, 1), clamp(lateral * 0.02, -0.9, 0.9)));
      this.quat.slerp(want, 1 - Math.exp(-dt * 8));
    }
    this.lastVel = this.vel.clone();
    this.mesh.position.copy(this.pos);
    this.mesh.quaternion.copy(this.quat);
    Phys.syncCollider(this.collider, this.pos);
    this.trailT -= dt;
    if (this.trailT <= 0) { this.trailT = 0.03; for (const e of this.mesh.userData.engines) FX.engineTrail(e.getWorldPosition(_v1), V3(), this.def.palette.glow, 0.5); }
    if (this.hp < 40 && Math.random() < 0.2) FX.smokePuff(this.pos, 1, 0.7);
    this.combat(dt);
  }
  forward() { return V3(0, 0, -1).applyQuaternion(this.quat); }
  updateRails(dt) {
    const P = G.player;
    let tx, ty, tdz;
    if (this.trouble) {
      const tr = this.trouble;
      tr.t += dt;
      const k = tr.t / tr.dur;
      tx = Math.sin(k * TAU * 1.2) * 32; ty = 8 + Math.sin(k * TAU * 2.1) * 9; tdz = 70 + Math.sin(k * 5) * 15;
      if (!tr.chaser.alive) {
        this.trouble = null;
        Game.radio(this.id, pick({ marlow: ['Thanks, Vix. You\'re becoming quite the pilot.', 'Much obliged. Your father would be proud.'], kestrel: ['Hmph. I had him... but thanks.', 'Fine. I owe you one.'], tobi: ['Phew! Thanks, Vix! I thought I was toast!'] }[this.id]), 2);
        Game.stat('rescues');
      } else if (tr.t > tr.dur) {
        this.trouble = null;
        tr.chaser.escape = true;
        this.damage(28);
        if (this.active) Game.radio(this.id, pick(['Argh! He shredded my wing panel!', 'Too late — I\'m hit!']), 2);
      }
    } else {
      const s = this.def.slot;
      tx = s[0] + Math.sin(this.weave * 0.7) * 4 + P.lx * 0.35;
      ty = s[1] + Math.sin(this.weave * 1.1) * 2.5 + P.ly * 0.3;
      tdz = s[2] + Math.sin(this.weave * 0.5) * 5;
    }
    this.lx = damp(this.lx, tx, 2.2, dt); this.ly = damp(this.ly, ty, 2.2, dt); this.dz = damp(this.dz, tdz, 1.6, dt);
    Rail.toWorld(Rail.s + this.dz, this.lx, this.ly, this.pos);
  }
  updateFree(dt) {
    // all-range: hold formation near the player, break off to engage targets
    const P = G.player;
    let goal;
    if (this.target && this.target.alive && this.target.worldPos().distanceTo(this.pos) < 500) goal = this.target.worldPos().clone().addScaledVector(this.target.vel || V3(), 0.4);
    else {
      this.target = null;
      const s = this.def.slot;
      goal = P.pos.clone().add(V3(s[0] * 2, s[1] * 1.5, -s[2] * 1.5).applyQuaternion(P.quat));
      if (Math.random() < dt * 0.4) this.target = this.pickTarget();
    }
    if (this.trouble) {
      const tr = this.trouble; tr.t += dt;
      goal = P.pos.clone().addScaledVector(P.nose, 90).add(V3(Math.sin(tr.t * 1.5) * 60, Math.cos(tr.t * 1.1) * 30, 0));
      if (!tr.chaser.alive) { this.trouble = null; Game.radio(this.id, pick({ marlow: ['Good shooting!'], kestrel: ['About time.'], tobi: ['You saved me!'] }[this.id]), 2); Game.stat('rescues'); }
      else if (tr.t > tr.dur) { this.trouble = null; this.damage(25); }
    }
    const fwd = this.forward();
    const want = _v1.subVectors(goal, this.pos);
    const dist = want.length();
    want.normalize();
    const nf = fwd.lerp(want, 1 - Math.exp(-dt * 1.8)).normalize();
    const sp = clamp(dist * 0.8, 60, 120);
    this.pos.addScaledVector(nf, sp * dt);
    const lim = (G.stage.arenaRadius || 1100) * 0.95;
    if (this.pos.length() > lim) this.pos.setLength(lim);
    _m1.lookAt(V3(), nf, V3(0, 1, 0));
    this.quat.setFromRotationMatrix(_m1);
  }
  pickTarget() {
    let best = null, bd = 1e9;
    for (const e of G.ents) { if (!e.alive || !e.hostile || e.isBossPart) continue; const d = e.worldPos().distanceTo(this.pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  combat(dt) {
    this.shootCD -= dt;
    if (this.shootCD > 0 || G.cinematic) return;
    this.shootCD = rand(0.25, 0.6);
    const fwd = this.forward();
    for (const e of G.ents) {
      if (!e.alive || !e.hostile || e.isBossPart) continue;
      const to = _v1.subVectors(e.worldPos(), this.pos);
      const d = to.length();
      if (d > 320 || d < 5) continue;
      if (to.multiplyScalar(1 / d).dot(fwd) < 0.93) continue;
      const v = to.clone().multiplyScalar(650).add(this.vel);
      fireShot('laser', 'ally', this.pos.clone().addScaledVector(fwd, 4), v, { dmg: 1, color: this.def.palette.glow, life: 0.8 });
      AudioSys.play('laser', { volume: 0.25, pitch: 1.15 });
      break;
    }
  }
  dispose() { this.mesh.removeFromParent(); Phys.removeCollider(this.collider); }
}
