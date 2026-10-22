'use strict';
/* ===== Game core: rail shooter simulation ===== */
const Game = {
  scene: null, state: 'idle', paused: false, attract: false, levelIdx: 0, level: null, P: null, pz: 0, progress: 0, speed: 0, time: 0,
  enemies: [], obstacles: [], pickups: [], pb: [], eb: [], sweeps: [], wingmen: [], shipMesh: null, boss: null, cruiser: null,
  evIdx: 0, checkpoint: 0, tut: null, stateT: 0, shakeAmt: 0, god: false, camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), camRoll: 0,
  lockBatch: 0, chainT: 0, introT: 0, reticle: { x: 0, y: 0 }, bossDeathT: 0, results: null, onEvent: null, toastQ: [], dustT: 0, alarmT: 0, flameT: 0,
  init() { this.scene = World.scene; },

  /* ---------- lifecycle ---------- */
  start(idx, opts = {}) {
    this.cleanup();
    this.levelIdx = idx; this.level = LEVELS[idx]; this.attract = !!opts.attract; this.god = this.attract;
    World.setEnv(this.level.env);
    const keep = opts.carry;
    this.P = {
      ox: 0, oy: 2, vx: 0, vy: 0, shield: 100, maxShield: keep ? keep.maxShield : 100, lives: keep ? keep.lives : 3, bombs: 3, laser: keep ? keep.laser : 1, boost: 1, boostCd: 0, boosting: false, braking: false,
      rollT: 0, rollDir: 1, rollCd: 0, invuln: 0, holdT: 0, charge: 0, locks: [], score: keep ? keep.score : 0, hits: keep ? keep.hits : 0, rings: 0, squad: 0, alive: true, chain: 0, fireCd: 0, alt: 0,
      bank: 0, pitch: 0, kills: 0, bombsUsed: 0, deaths: 0, stat: { moved: 0, fired: 0, locked: 0, rolled: 0, boosted: 0, braked: 0 }, lockT: 0, deflects: 0, lastShield: 100,
    };
    this.P.shield = this.P.maxShield;
    if (opts.carry) this.P.deaths = opts.carry.deaths || 0;
    this.progress = 0; this.pz = 0; this.time = 0; this.evIdx = 0; this.checkpoint = 0; this.boss = null; this.cruiser = null; this.tut = null; this.bossDeathT = 0; this.results = null;
    this.shipMesh = buildShip('lark'); this.shipMesh.scale.setScalar(0.8); this.scene.add(this.shipMesh);
    this.wingmen = WINGMEN.map((w, i) => {
      const m = buildShip(w.style); m.scale.setScalar(0.8); this.scene.add(m);
      const pos = new THREE.Vector3(w.off[0] * 1.5, w.off[1] - 4, 20 + i * 6);
      m.position.copy(pos);
      return { id: w.id, off: new THREE.Vector3(...w.off), mesh: m, pos, hp: 60, maxhp: 60, alive: true, chased: false, fireT: rand(0.3, 1), ph: rand(0, 6), roll: 0, warned: false };
    });
    this.speed = 0; this.setState('intro');
    this.introT = 0;
    Audio.music(this.level.music); Audio.sfx('launch');
    HUD.show(true); HUD.reset();
    this.snapCamera();
  },
  cleanup() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    for (const o of this.obstacles) this.scene.remove(o.mesh);
    for (const p of this.pickups) this.scene.remove(p.mesh);
    for (const b of this.pb) this.scene.remove(b.mesh);
    for (const b of this.eb) this.scene.remove(b.mesh);
    for (const s of this.sweeps) this.scene.remove(s.mesh);
    for (const w of this.wingmen) this.scene.remove(w.mesh);
    if (this.shipMesh) this.scene.remove(this.shipMesh);
    if (this.boss && this.boss.group) this.scene.remove(this.boss.group);
    this.enemies = []; this.obstacles = []; this.pickups = []; this.pb = []; this.eb = []; this.sweeps = []; this.wingmen = []; this.shipMesh = null; this.boss = null;
    FX.clear(); Tween.clear(); Audio.stopCharge();
    this.state = 'idle';
  },
  setState(s) { this.state = s; this.stateT = 0; },
  respawn() {
    const P = this.P;
    for (const e of this.enemies) this.scene.remove(e.mesh); for (const o of this.obstacles) this.scene.remove(o.mesh); for (const p of this.pickups) this.scene.remove(p.mesh);
    for (const b of this.pb) this.scene.remove(b.mesh); for (const b of this.eb) this.scene.remove(b.mesh); for (const s of this.sweeps) this.scene.remove(s.mesh);
    if (this.boss && this.boss.group) this.scene.remove(this.boss.group);
    this.enemies = []; this.obstacles = []; this.pickups = []; this.pb = []; this.eb = []; this.sweeps = []; this.boss = null; this.cruiser = null; this.tut = null; FX.clear();
    this.progress = this.checkpoint; this.pz = -this.progress;
    this.prepareEvents(); this.evsFor = this.level; this.resetEventsToCheckpoint();
    P.alive = true; P.shield = P.maxShield; P.bombs = Math.max(P.bombs, 3); P.invuln = 2.5; P.ox = 0; P.oy = 2; P.vx = P.vy = 0; P.boost = 1; P.charge = 0; P.holdT = 0; P.locks = []; P.laser = Math.max(1, P.laser - 1);
    this.shipMesh = buildShip('lark'); this.shipMesh.scale.setScalar(0.8); this.scene.add(this.shipMesh); this.shipMesh.visible = true;
    for (const w of this.wingmen) { if (w.alive) { w.hp = w.maxhp; w.chased = false; w.pos.set(w.off.x, w.off.y, this.pz + w.off.z); } }
    Audio.music(this.level.music); HUD.reset(); HUD.bossBar(null);
    this.setState('play'); this.snapCamera(); this.comm('quill', pick(['Back in the fight, Lark. Make it count.', 'New fighter on the line. Don\'t waste it.']), 3);
  },
  snapCamera() {
    const P = this.P; this.camPos.set(P.ox * 0.6, P.oy * 0.55 + 4.8, this.pz + 19); World.camera.position.copy(this.camPos);
    this.camLook.set(P.ox * 0.3, P.oy * 0.35 + 1, this.pz - 40); World.camera.lookAt(this.camLook);
  },

  /* ---------- controls ---------- */
  controls(dt) {
    if (this.attract) return AI.compute(this, dt);
    const I = Input;
    return { mx: I.mx, my: I.my, fire: I.down.fire, fireP: I.pressed.fire, fireR: I.released.fire, bomb: I.pressed.bomb, rollL: I.pressed.rollL, rollR: I.pressed.rollR, boost: I.down.boost, brake: I.down.brake, squad: I.pressed.squad };
  },

  /* ---------- main update ---------- */
  update(dt) {
    if (this.state === 'idle' || this.paused) return;
    dt = Math.min(dt, 1 / 24);
    this.time += dt; this.stateT += dt;
    const c = this.controls(dt), P = this.P;
    const playing = this.state === 'play';
    if (this.state === 'intro') { this.introT += dt; this.speed = this.level.speed * Ease.out(clamp(this.introT / 3, 0, 1)); if (this.introT > 4.2) this.setState('play'); }
    if (playing) this.updatePlayer(dt, c);
    else if (this.state === 'intro') { this.updatePlayer(dt, { mx: 0, my: 0, fire: false, fireP: false, fireR: false }, true); }
    else if (this.state === 'outro') this.updateOutro(dt);
    else if (this.state === 'dead') this.updateDead(dt);
    const moving = this.state === 'play' || this.state === 'intro' || this.state === 'outro';
    if (moving) { this.progress += this.speed * dt; this.pz = -this.progress; }
    if (this.state !== 'dead' || this.stateT < 1) { this.processEvents(); }
    this.updateEnemies(dt); this.updateObstacles(dt); this.updatePickups(dt); this.updateBullets(dt); this.updateSweeps(dt);
    this.updateWingmen(dt); this.updateBoss(dt); this.updateTutorial(dt);
    this.updateShipVisual(dt);
    FX.update(dt);
    this.updateCamera(dt);
    World.update(dt, new THREE.Vector3(P.ox, P.oy, this.pz), this.speed, this.time);
    if (this.chainT > 0) { this.chainT -= dt; if (this.chainT <= 0) P.chain = 0; }
    P.squad = Math.min(1, P.squad);
    if (P.invuln > 0) P.invuln -= dt;
    // low shield alarm
    if (this.state === 'play' && P.shield < P.maxShield * 0.28 && P.alive && !this.attract) { this.alarmT -= dt; if (this.alarmT <= 0) { this.alarmT = 1.1; Audio.sfx('alarm'); Input.rumble(0.2, 0.4, 120); } }
  },

  updatePlayer(dt, c, locked) {
    const P = this.P, lv = this.level, set = Settings;
    if (!P.alive) return;
    // speed model
    let target = lv.speed;
    P.boosting = false; P.braking = false;
    if (!locked) {
      if (c.boost && P.boost > 0.02 && P.boostCd <= 0) { target = lv.speed * 1.75; P.boosting = true; P.boost = Math.max(0, P.boost - dt * 0.42); if (P.boost <= 0.02) P.boostCd = 1.2; P.stat.boosted += dt; }
      else if (c.brake) { target = lv.speed * 0.5; P.braking = true; P.stat.braked += dt; }
    }
    if (P.boostCd > 0) P.boostCd -= dt;
    if (!P.boosting && P.boostCd <= 0) P.boost = Math.min(1, P.boost + dt * 0.2);
    if (!locked) this.speed = damp(this.speed, this.state === 'play' && this.boss && this.boss.dying ? lv.speed : target, 3, dt);
    // movement
    const mv = 26 * set.sens * (P.braking ? 0.8 : 1) * (P.boosting ? 0.85 : 1);
    P.vx = damp(P.vx, c.mx * mv, 9, dt); P.vy = damp(P.vy, c.my * mv * 0.8, 9, dt);
    if (P.rollT > 0) { P.vx += P.rollDir * 46 * dt * (P.rollT / 0.55) * 2; }
    P.ox += P.vx * dt; P.oy += P.vy * dt;
    const bx = 31, ymin = this.level.env === 'canyon' ? -9 : -16, ymax = 17;
    if (P.ox > bx) { P.ox = bx; P.vx = Math.min(0, P.vx); } if (P.ox < -bx) { P.ox = -bx; P.vx = Math.max(0, P.vx); }
    if (P.oy > ymax) { P.oy = ymax; P.vy = Math.min(0, P.vy); } if (P.oy < ymin) { P.oy = ymin; P.vy = Math.max(0, P.vy); }
    if (Math.abs(c.mx) + Math.abs(c.my) > 0.2) P.stat.moved += dt;
    P.bank = damp(P.bank, -P.vx * 0.032, 7, dt); P.pitch = damp(P.pitch, P.vy * 0.022, 7, dt);
    // roll
    if (P.rollCd > 0) P.rollCd -= dt;
    if (!locked && P.rollT <= 0 && P.rollCd <= 0 && (c.rollL || c.rollR)) { P.rollT = 0.55; P.rollDir = c.rollL ? -1 : 1; P.rollCd = 0.85; P.stat.rolled++; Audio.sfx('roll'); Input.rumble(0.1, 0.3, 120); }
    if (P.rollT > 0) P.rollT = Math.max(0, P.rollT - dt);
    // fire / charge / lock
    P.fireCd -= dt;
    if (!locked) {
      if (c.fireP) this.shootLaser();
      if (c.fire) {
        P.holdT += dt;
        if (P.holdT > 0.26) {
          if (P.charge === 0) { Audio.startCharge(); P.locks = []; this.lockBatch++; }
          P.charge = Math.min(1.5, P.charge + dt * 1.1); Audio.setCharge(P.charge / 1.5);
          P.lockT -= dt;
          if (P.lockT <= 0 && P.locks.length < 8) { P.lockT = 0.12; this.scanLock(); }
        }
      }
      if (c.fireR || !c.fire) {
        if (P.charge > 0) this.releaseCharge();
        P.holdT = 0; P.charge = 0; Audio.stopCharge();
      }
      if (c.bomb && P.bombs > 0 && this.state === 'play') this.fireBomb();
      if (c.squad && P.squad >= 1) this.squadCall();
    }
  },
  shootLaser() {
    const P = this.P; if (P.fireCd > 0) return; P.fireCd = 0.09; P.stat.fired++;
    const cols = [0x66ff99, 0x66f0ff, 0xffe866], dmg = [1, 1, 2][P.laser - 1];
    const offs = P.laser === 1 ? [0] : [-1.9, 1.9];
    for (const o of offs) this.spawnPB(new THREE.Vector3(P.ox + o, P.oy - 0.2, this.pz - 4), new THREE.Vector3(0, 0, -300), dmg, cols[P.laser - 1], 'laser');
    Audio.sfx(['laser', 'laser2', 'laser3'][P.laser - 1]); Input.rumble(0, 0.25, 40);
  },
  spawnPB(pos, vel, dmg, color, kind, extra = {}) {
    const g = kind === 'big' ? G.sph : G.box, m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, fog: false }));
    if (kind === 'big') m.scale.set(1.6, 1.6, 1.6); else if (kind === 'homing') m.scale.set(0.5, 0.5, 2.4); else m.scale.set(0.22, 0.22, 3.4);
    m.position.copy(pos); this.scene.add(m);
    const gl = glow(m, color, kind === 'big' ? 9 : 3.4, 0, 0, 0, 0.9);
    if (kind === 'laser' || kind === 'wing') {
      // soft aim assist toward the closest enemy near the firing line
      let best = null, bd = 1e9;
      for (const e of this.enemies) { if (!e.alive || !e.lock || e.hide) continue; const dz = pos.z - e.mesh.position.z; if (dz < 6 || dz > 200) continue; const lat = Math.hypot(e.mesh.position.x - pos.x, e.mesh.position.y - pos.y); if (lat < 2 + dz * 0.04 + e.r && lat < bd) { bd = lat; best = e; } }
      if (best) { const d = best.mesh.position.clone().sub(pos).normalize().multiplyScalar(vel.length()); vel = vel.clone().lerp(d, 0.7); }
    }
    if (vel.lengthSq() > 0) m.lookAt(pos.clone().add(vel));
    const b = Object.assign({ mesh: m, pos: m.position, prev: pos.clone(), vel, dmg, r: kind === 'big' ? 3 : 0.9, life: 1.6, kind, pierce: kind === 'big', hit: new Set() }, extra);
    this.pb.push(b); return b;
  },
  scanLock() {
    const P = this.P, cam = World.camera, v = new THREE.Vector3(); let best = null, bd = 0.36;
    for (const e of this.enemies) {
      if (!e.alive || !e.lock || e.hide || e.invuln || P.locks.includes(e)) continue;
      const dz = this.pz - e.mesh.position.z; if (dz < 8 || dz > 300) continue;
      v.copy(e.mesh.position).project(cam); if (v.z > 1) continue;
      const d = Math.hypot((v.x - this.reticleNdc.x) * (cam.aspect), v.y - this.reticleNdc.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) { P.locks.push(best); P.stat.locked++; Audio.sfx('lock', P.locks.length); Input.rumble(0, 0.2, 40); }
  },
  reticleNdc: new THREE.Vector2(),
  releaseCharge() {
    const P = this.P;
    if (P.locks.length) {
      const batch = this.lockBatch;
      for (const e of P.locks) if (e.alive) this.spawnPB(new THREE.Vector3(P.ox + rand(-1.5, 1.5), P.oy - 0.5, this.pz - 3), new THREE.Vector3(rand(-60, 60), rand(10, 50), -120), 3, 0xff9a3a, 'homing', { target: e, batch, life: 4, turn: 7 });
      if (P.locks.length >= 3) this.toast(P.locks.length + '× MULTI-LOCK');
      Audio.sfx('chargeFire'); Input.rumble(0.5, 0.7, 160);
    } else if (P.charge > 0.5) {
      this.spawnPB(new THREE.Vector3(P.ox, P.oy - 0.3, this.pz - 4), new THREE.Vector3(0, 0, -240), 6 + P.charge * 3, 0x66f0ff, 'big');
      Audio.sfx('chargeFire'); Input.rumble(0.6, 0.6, 180);
    }
    P.locks = [];
  },
  fireBomb() {
    const P = this.P; P.bombs--; P.bombsUsed++;
    const pos = new THREE.Vector3(P.ox, P.oy, this.pz - 12);
    this.bombFx = { pos, t: 0, r: 0 };
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.copy(pos); this.scene.add(m); this.bombFx.mesh = m;
    this.flashT = 0.6; FX.flash(pos, 0xffd9a0, 40, 1.2); Audio.sfx('bomb'); this.shake(1.2); Input.rumble(1, 1, 500);
    P.invuln = Math.max(P.invuln, 0.8);
  },
  updateBomb(dt) {
    const b = this.bombFx; if (!b) return;
    b.t += dt; const k = b.t / 0.9; b.r = 160 * Ease.out(Math.min(1, k)); b.mesh.scale.setScalar(b.r); b.mesh.material.opacity = 0.6 * (1 - k);
    b.pos.z = this.pz - 12 - b.r * 0.35;
    for (const e of this.enemies) { if (!e.alive || e.hide || e.bombed === b) continue; if (e.mesh.position.distanceTo(b.pos) < b.r + e.r) { e.bombed = b; this.damageEnemy(e, e.boss ? 14 : 12, 'bomb', true); } }
    for (let i = this.eb.length - 1; i >= 0; i--) { if (this.eb[i].pos.distanceTo(b.pos) < b.r) { FX.burst(this.eb[i].pos, 3, { speed: 8, size: 2, life: 0.4, colors: [0xffaa66] }); this.scene.remove(this.eb[i].mesh); this.eb.splice(i, 1); } }
    if (k >= 1) { this.scene.remove(b.mesh); this.bombFx = null; }
  },
  squadCall() {
    const P = this.P; P.squad = 0; Audio.sfx('squad'); this.toast('SQUAD STRIKE');
    const targets = this.enemies.filter((e) => e.alive && e.lock && !e.invuln && !e.hide && this.pz - e.mesh.position.z > 10 && this.pz - e.mesh.position.z < 260).sort((a, b) => b.mesh.position.z - a.mesh.position.z);
    const alive = this.wingmen.filter((w) => w.alive); let i = 0;
    for (const t of targets) { const w = alive[i++ % Math.max(1, alive.length)]; if (!w) break; this.beam(w.pos, t.mesh.position, w.mesh); setTimeout(() => { if (t.alive) this.damageEnemy(t, 5, 'squad', true); }, 80 + i * 40); if (i > 12) break; }
    if (!alive.length) this.comm('quill', 'No wingmates left to call, Lark.', 2.4);
    else this.comm(alive[0].id, pick(['Squad strike, coming in hot!', 'Covering fire!', 'On your wing, Lark!']), 2.4);
  },
  beam(a, b, tint) {
    const g = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x9ff4ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, fog: false })); this.scene.add(l);
    Tween.add(0.3, (t) => { l.material.opacity = 1 - t; }, { done: () => { this.scene.remove(l); g.dispose(); } });
  },
  hurt(dmg, src, opts = {}) {
    const P = this.P; if (!P.alive || P.invuln > 0 || this.god || this.state !== 'play') return false;
    dmg *= DIFF[Settings.difficulty].dmg;
    P.shield -= dmg; P.invuln = opts.long ? 1.4 : 0.55; P.chain = 0; this.chainT = 0;
    this.shake(opts.long ? 1.0 : 0.6); Audio.sfx('hit'); Input.rumble(0.9, 0.9, 260); HUD.hurt();
    if (P.shield <= 0) this.playerDie();
    return true;
  },
  healPlayer(n) { const P = this.P; P.shield = Math.min(P.maxShield, P.shield + n); },
  addSquad(x) { this.P.squad = Math.min(1, this.P.squad + x); },
  playerDie() {
    const P = this.P; P.alive = false; P.shield = 0; P.lives--; P.deaths++;
    FX.explosion(this.shipMesh.position, 2.4); this.shipMesh.visible = false; this.shake(1.6); Audio.stopCharge(); Audio.sfx('lose'); Input.rumble(1, 1, 700);
    P.charge = 0; P.holdT = 0; P.locks = []; this.setState('dead'); Audio.music(null);
    this.comm('quill', 'Lark is down!', 2);
  },
  updateDead(dt) {
    if (this.stateT > 3.2 && !this.deadHandled) {
      this.deadHandled = true;
      if (this.P.lives < 0) { this.setState('over'); HUD.show(false); UI.gameOver(); }
      else HUD.fadeOut(() => { this.deadHandled = false; this.respawn(); });
    }
  },
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a * Settings.shake); },
};
