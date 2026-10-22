// ===== 06_player.js — the player starfighter: rail flight, all-range flight, maneuvers, weapons =====
const BASE_SPEED = 55, BOOST_SPEED = 108, BRAKE_SPEED = 22, AR_SPEED = 58;
const Player = {
  mesh: null, pos: V3(), vel: V3(), quat: new THREE.Quaternion(), fwd: V3(0, 0, -1), up: V3(0, 1, 0),
  ox: 0, oy: 0, vx: 0, vy: 0, loopOff: V3(),
  yaw: 0, pitch: 0, arSpeed: AR_SPEED,
  bank: 0, spin: 0, rollT: 0, rollDir: 1, loopT: -1, loopKind: 'loop', loopYaw0: 0, loopPitch0: 0,
  shield: 100, maxShield: 100, lives: 3, bombs: 3, laser: 0, wings: { L: 3, R: 3 },
  meter: 1, meterLock: false, boosting: false, braking: false,
  invuln: 0, dead: false, charge: 0, holdT: 0, lockTarget: null, fireCD: 0, lowBeep: 0,
  bombObj: null, crashCD: 0, cheat: false, smokeT: 0,
  init() {
    this.mesh = makeFighter(0x2f7bff, 0xffcc33);
    Gfx.scene.add(this.mesh);
    // shield bubble flashes when hit / deflecting
    this.bubble = mesh(new THREE.IcosahedronGeometry(5.2, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.6, 4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.mesh.add(this.bubble);
    this.rollFx = mesh(new THREE.TorusGeometry(6, 0.3, 4, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 3, 4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.mesh.add(this.rollFx);
  },
  resetFull() {
    this.maxShield = Math.round(100 * diff().shield); this.shield = this.maxShield; this.lives = 3; this.bombs = 3; this.laser = 0;
    this.goldRings = 0; this.goldTotal = 0; this.extended = false; this.resetLife();
  },
  resetLife() {
    this.shield = this.maxShield; this.wings.L = 3; this.wings.R = 3; this.dead = false; this.invuln = 2.5; this.meter = 1; this.meterLock = false;
    this.ox = 0; this.oy = 0; this.vx = 0; this.vy = 0; this.spin = 0; this.rollT = 0; this.loopT = -1; this.charge = 0; this.holdT = 0; this.lockTarget = null; this.bank = 0;
    this.mesh.visible = true; this.mesh.userData.wings.L.visible = true; this.mesh.userData.wings.R.visible = true; this.bombObj = null;
  },
  get rolling() { return this.rollT > 0; },
  get looping() { return this.loopT >= 0; },
  forwardSpeed() {
    if (Game.mode === 'allrange') return this.arSpeed;
    if (this.looping) return 10;
    return Game.speed;
  },
  // ---------- per-frame ----------
  update(dt, ctl) {
    if (this.dead) return;
    this.invuln = Math.max(0, this.invuln - dt); this.fireCD -= dt; this.crashCD -= dt;
    // boost / brake meter
    const wantBoost = ctl.boost && !this.meterLock && !this.looping, wantBrake = ctl.brake && !this.meterLock && !this.looping && !wantBoost;
    this.boosting = wantBoost; this.braking = wantBrake;
    if (wantBoost || wantBrake) { this.meter -= dt * 0.42; if (this.meter <= 0) { this.meter = 0; this.meterLock = true; } }
    else { this.meter = Math.min(1, this.meter + dt * (this.meterLock ? 0.32 : 0.45)); if (this.meterLock && this.meter >= 1) this.meterLock = false; }
    if (this.cheat) { this.meter = 1; this.meterLock = false; }
    // barrel roll (double tap L1/R1) — deflects bullets
    if (ctl.rollL || ctl.rollR) { if (!this.rolling) { this.rollT = 0.62; this.rollDir = ctl.rollL ? 1 : -1; Audio_.play('roll'); Input.rumble(0.1, 0.4, 120); HUD.used('roll'); } }
    if (this.rolling) { this.rollT -= dt; this.spin += this.rollDir * dt * TAU * 2 / 0.62; if (this.rollT <= 0) { this.spin = 0; this.rollT = 0; } }
    const bankT = (ctl.bankL ? 1 : 0) - (ctl.bankR ? 1 : 0);
    // somersault / U-turn
    if (ctl.loop && !this.looping && this.meter > 0.3 && !this.meterLock) {
      this.loopT = 0; this.meter = Math.max(0, this.meter - 0.3); Audio_.play('loop'); HUD.used('loop');
      if (Game.mode === 'allrange') { this.loopKind = 'uturn'; this.loopYaw0 = this.yaw; this.loopPitch0 = this.pitch; } else this.loopKind = 'loop';
    }
    if (Game.mode === 'allrange') this.updateAllRange(dt, ctl, bankT); else this.updateRail(dt, ctl, bankT);
    // visuals
    const fl = this.mesh.userData.flame;
    const fk = this.boosting ? 2.2 : this.braking ? 0.4 : 1;
    fl.scale.set(1, 1, damp(fl.scale.z, fk * (0.9 + Math.random() * 0.25), 12, dt));
    this.bubble.material.opacity = Math.max(0, this.bubble.material.opacity - dt * 3);
    this.rollFx.material.opacity = this.rolling ? 0.45 : Math.max(0, this.rollFx.material.opacity - dt * 4);
    this.rollFx.rotation.z += dt * 20;
    this.mesh.visible = this.invuln > 0 && this.invuln < 2.4 ? Math.floor(this.invuln * 14) % 2 === 0 : true;
    if (this.wings.L <= 0 || this.wings.R <= 0 || this.shield < this.maxShield * 0.25) { this.smokeT -= dt; if (this.smokeT < 0) { this.smokeT = 0.05; FX.smokePuff(_v1.copy(this.pos).addScaledVector(this.fwd, 3), 0.9); } }
    // low shield alarm
    if (this.shield < this.maxShield * 0.25) { this.lowBeep -= dt; if (this.lowBeep < 0) { this.lowBeep = 1.2; Audio_.play('lowShield'); } }
    this.updateWeapons(dt, ctl);
  },
  updateRail(dt, ctl, bankT) {
    const maxLat = 36, sens = Settings.sensitivity;
    let mx = ctl.mx * sens, my = ctl.my * sens;
    const climb = Settings.pilotPitch ? my : -my;
    this.bank = damp(this.bank, bankT, 8, dt);
    const latBoost = 1 + Math.abs(this.bank) * 0.6 * (Math.sign(-mx) === Math.sign(this.bank) || mx === 0 ? 1 : 0);
    this.vx = damp(this.vx, clamp(mx, -1, 1) * maxLat * latBoost - this.bank * 14, 5.5, dt);
    this.vy = damp(this.vy, clamp(climb, -1, 1) * maxLat * 0.85, 5.5, dt);
    if (!this.looping) {
      this.ox = clamp(this.ox + this.vx * dt, -50, 50);
      this.oy += this.vy * dt;
    }
    // Game.speed drives rail progress
    let target = BASE_SPEED;
    if (this.boosting) target = BOOST_SPEED; else if (this.braking) target = BRAKE_SPEED;
    if (this.looping) target = 8;
    if (Game.speedOverride !== null) target = Game.speedOverride;
    Game.speed = damp(Game.speed, target, 3, dt);
    Rail.frame(Game.d, Game.route);
    const ground = terrainH(Rail.pos.x + Rail.right.x * this.ox, Rail.pos.z + Rail.right.z * this.ox);
    const minY = Math.max(ground, 0) + 3 - Rail.pos.y, maxY = 42;
    this.oy = clamp(this.oy, minY - 1.5, maxY);
    // loop maneuver: vertical circle in rail space
    let pitchExtra = 0;
    this.loopOff.set(0, 0, 0);
    if (this.looping) {
      this.loopT += dt; const k = clamp(this.loopT / 1.5, 0, 1), ph = k * TAU, R = 20;
      this.loopOff.set(0, (1 - Math.cos(ph)) * R, -Math.sin(ph) * R * 1.2);
      pitchExtra = ph;
      if (k >= 1) this.loopT = -1;
    }
    this.pos.copy(Rail.pos).addScaledVector(Rail.right, this.ox).addScaledVector(Rail.up, this.oy + this.loopOff.y).addScaledVector(Rail.fwd, -this.loopOff.z);
    // ground scrape
    const gy = Math.max(terrainH(this.pos.x, this.pos.z), 0);
    if (this.pos.y < gy + 2.2 && !this.looping) {
      this.oy += (gy + 2.2 - this.pos.y); this.pos.y = gy + 2.2; this.vy = Math.abs(this.vy) + 12;
      if (gy <= 0.01) { if (this.crashCD <= 0) { FX.splash(this.pos); this.crashCD = 0.6; } }
      else this.crash(8, this.ox > 0 ? 'R' : 'L');
    }
    // orientation
    _m1.makeBasis(Rail.right, Rail.up, _v1.copy(Rail.fwd).negate());
    this.quat.setFromRotationMatrix(_m1);
    const yaw = -this.vx / maxLat * 0.35, pitch = this.vy / maxLat * 0.32 + pitchExtra;
    const roll = -this.vx / maxLat * 0.55 + this.bank * 1.35 + this.spin;
    _e1.set(pitch, yaw, roll, 'YXZ'); _q1.setFromEuler(_e1);
    this.quat.multiply(_q1);
    this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(this.quat);
    // aim direction (no roll)
    _e1.set(pitch, yaw, 0, 'YXZ'); _q2.setFromEuler(_e1);
    _m1.makeBasis(Rail.right, Rail.up, _v1.copy(Rail.fwd).negate()); _q1.setFromRotationMatrix(_m1).multiply(_q2);
    this.fwd.set(0, 0, -1).applyQuaternion(_q1); this.up.set(0, 1, 0).applyQuaternion(_q1);
    this.vel.copy(Rail.fwd).multiplyScalar(Game.speed).addScaledVector(Rail.right, this.vx).addScaledVector(Rail.up, this.vy);
  },
  updateAllRange(dt, ctl, bankT) {
    const sens = Settings.sensitivity;
    const mx = clamp(ctl.mx * sens, -1, 1), my = clamp(ctl.my * sens, -1, 1);
    const climb = Settings.pilotPitch ? my : -my;
    let target = AR_SPEED; if (this.boosting) target = BOOST_SPEED; else if (this.braking) target = 26;
    this.arSpeed = damp(this.arSpeed, target, 3, dt);
    this.bank = damp(this.bank, bankT, 8, dt);
    // leaving the arena forces a U-turn
    const dc = _v1.set(this.pos.x - L.ARENA.x, 0, this.pos.z - L.ARENA.z);
    if (dc.length() > L.ARENA_R && !this.looping) {
      const outward = Math.atan2(-dc.x, -dc.z); const facing = angleWrap(this.yaw - outward);
      if (Math.abs(facing) < 1.2) { this.loopT = 0; this.loopKind = 'uturn'; this.loopYaw0 = this.yaw; this.loopPitch0 = this.pitch; HUD.banner('TURNING AROUND', 'Stay inside the combat zone', 1.6); Audio_.play('loop'); }
    }
    let roll;
    if (this.looping) {
      this.loopT += dt; const k = clamp(this.loopT / 1.3, 0, 1);
      const phi = lerp(this.loopPitch0, Math.PI, k), rho = smooth(0.55, 1, k) * Math.PI;
      _q1.setFromAxisAngle(UP, this.loopYaw0); _q2.setFromAxisAngle(_v1.set(1, 0, 0), phi); _q1.multiply(_q2); _q2.setFromAxisAngle(_v1.set(0, 0, 1), rho); _q1.multiply(_q2);
      this.quat.copy(_q1);
      this.fwd.set(0, 0, -1).applyQuaternion(this.quat); this.up.set(0, 1, 0).applyQuaternion(this.quat);
      if (k >= 1) { this.loopT = -1; this.yaw = angleWrap(this.loopYaw0 + Math.PI); this.pitch = 0; }
      roll = 0;
    } else {
      const turn = (-mx * 1.35 + this.bank * 0.9);
      this.yaw = angleWrap(this.yaw + turn * dt * (1 + Math.abs(this.bank) * 0.5));
      this.pitch = clamp(this.pitch + climb * 1.25 * dt, -1.1, 1.1);
      if (Math.abs(climb) < 0.1) this.pitch = damp(this.pitch, 0, 0.8, dt);
      roll = clamp(turn, -1.4, 1.4) * 0.65 + this.bank * 0.7 + this.spin;
      _e1.set(this.pitch, this.yaw, 0, 'YXZ'); this.quat.setFromEuler(_e1);
      this.fwd.set(0, 0, -1).applyQuaternion(this.quat); this.up.set(0, 1, 0).applyQuaternion(this.quat);
      _e1.set(this.pitch, this.yaw, roll, 'YXZ'); this.quat.setFromEuler(_e1);
    }
    this.vel.copy(this.fwd).multiplyScalar(this.arSpeed);
    this.pos.addScaledVector(this.vel, dt);
    const gy = Math.max(terrainH(this.pos.x, this.pos.z), 0);
    if (this.pos.y < gy + 3) { this.pos.y = gy + 3; this.pitch = Math.max(this.pitch, 0.35); if (gy > 0.01) this.crash(6, Math.random() < 0.5 ? 'L' : 'R'); }
    if (this.pos.y > 340) { this.pos.y = 340; this.pitch = Math.min(this.pitch, 0); }
    this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(this.quat);
  },
  // ---------- weapons ----------
  muzzles() {
    const out = [];
    const r = _v2.set(1, 0, 0).applyQuaternion(this.mesh.quaternion);
    if (this.laser === 0) out.push(this.pos.clone().addScaledVector(this.fwd, 5));
    else { out.push(this.pos.clone().addScaledVector(r, 4.4).addScaledVector(this.fwd, 1)); out.push(this.pos.clone().addScaledVector(r, -4.4).addScaledVector(this.fwd, 1)); }
    return out;
  },
  aimDir() {
    const dir = this.fwd.clone();
    if (Settings.aimAssist || this.cheat) {
      let best = null, bestA = this.cheat ? 0.2 : 0.07;
      for (const e of Enemies.list) {
        if (!e.alive || !e.lockable) continue;
        _v3.copy(e.pos).sub(this.pos); const dist = _v3.length(); if (dist > 420 || dist < 8) continue;
        const a = _v3.normalize().angleTo(this.fwd); if (a < bestA) { bestA = a; best = e; }
      }
      if (best) { _v3.copy(best.pos).addScaledVector(best.vel || V3(), best.pos.distanceTo(this.pos) / 420).sub(this.pos).normalize(); dir.lerp(_v3, 0.85).normalize(); }
    }
    return dir;
  },
  updateWeapons(dt, ctl) {
    if (ctl.firePressed && this.fireCD <= 0) { this.fireLaser(); this.holdT = 0; }
    if (ctl.fire) {
      this.holdT += dt;
      if (this.holdT > 0.3) {
        const before = this.charge; this.charge = Math.min(1, this.charge + dt / 0.55);
        if (before === 0) { Audio_.play('charge'); }
        if (this.charge >= 1 && before < 1) { Audio_.play('charged'); Input.rumble(0, 0.3, 80); }
        if (this.charge >= 1) this.findLock();
      }
      // auto fire while holding in attract mode
      if (this.cheat && this.fireCD <= 0 && this.holdT < 0.3) this.fireLaser();
    }
    if (ctl.fireReleased) {
      if (this.charge >= 1) this.fireCharge();
      this.charge = 0; this.holdT = 0; this.lockTarget = null;
    }
    if (this.lockTarget && !this.lockTarget.alive) this.lockTarget = null;
    if (ctl.bombPressed) {
      if (this.bombObj && this.bombObj.alive) { Projectiles.detonateBomb(this.bombObj); }
      else if (this.bombs > 0 || this.cheat) { if (!this.cheat) this.bombs--; this.bombObj = Projectiles.bomb(this.pos.clone().addScaledVector(this.fwd, 4), this.fwd.clone(), this.lockTarget); Audio_.play('bombLaunch'); HUD.used('bomb'); }
      else { Audio_.play('menuBack'); HUD.toast('No smart bombs left'); }
    }
  },
  fireLaser() {
    this.fireCD = 0.085;
    const dir = this.aimDir();
    for (const m of this.muzzles()) Projectiles.laser(m, dir, this.laser, this.forwardSpeed());
    Audio_.play('laser', { level: this.laser }); Game.stats.shots++;
  },
  findLock() {
    if (this.lockTarget && this.lockTarget.alive) return;
    let best = null, bestS = 0.16;
    for (const e of Enemies.list) {
      if (!e.alive || !e.lockable) continue;
      _v3.copy(e.pos).sub(this.pos); const dist = _v3.length(); if (dist > 600) continue;
      if (_v3.dot(this.fwd) < 0) continue;
      _v3.copy(e.pos).project(Gfx.camera); const r = HUD.reticleNdc;
      const s = Math.hypot(_v3.x - r.x, (_v3.y - r.y) * 0.8);
      if (s < bestS && _v3.z < 1) { bestS = s; best = e; }
    }
    if (best) { this.lockTarget = best; Audio_.play('lock'); }
  },
  fireCharge() {
    Projectiles.chargeShot(this.pos.clone().addScaledVector(this.fwd, 5), this.fwd.clone(), this.lockTarget, this.forwardSpeed());
    Audio_.play('chargeShot'); Input.rumble(0.3, 0.5, 150); HUD.used('charge');
  },
  // ---------- damage ----------
  hurt(amount, kind = 'bullet') {
    if (this.dead || this.invuln > 0 || this.cheat || Game.state !== 'playing') return false;
    this.shield -= amount * diff().dmg;
    this.invuln = kind === 'crash' ? 0.9 : 0.45;
    this.bubble.material.opacity = 0.7;
    Audio_.play('hurt'); Input.rumble(0.8, 0.6, 220); Gfx.addShake(0.9);
    HUD.damageFlash = 1; Game.stats.damage += amount;
    if (this.shield <= 0) { this.shield = 0; this.die(); }
    return true;
  },
  crash(amount, side) {
    if (this.crashCD > 0 || this.cheat) return;
    this.crashCD = 0.7;
    Audio_.play('scrape'); FX.sparks(this.pos, 12);
    if (this.hurt(amount, 'crash')) this.damageWing(side);
  },
  damageWing(side) {
    if (this.wings[side] <= 0) return;
    this.wings[side]--;
    if (this.wings[side] <= 0) {
      this.mesh.userData.wings[side].visible = false;
      const p = this.pos.clone().addScaledVector(_v2.set(side === 'L' ? -1 : 1, 0, 0).applyQuaternion(this.quat), 3);
      FX.explode(p, 1, { vel: this.vel }); Audio_.play('wingBreak');
      if (this.laser > 0) { this.laser = 0; }
      Comms.say('moss', `Your ${side === 'L' ? 'left' : 'right'} wing is busted! Lasers are down to single fire — grab a Wing Repair (W).`, 4, 'wing');
    }
  },
  repairWings() { this.wings.L = 3; this.wings.R = 3; this.mesh.userData.wings.L.visible = true; this.mesh.userData.wings.R.visible = true; },
  die() {
    this.dead = true; this.mesh.visible = false;
    FX.explode(this.pos, 4, { vel: this.vel }); Input.rumble(1, 1, 700);
    Game.onPlayerDeath();
  },
};
