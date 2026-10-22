'use strict';
/* ===== Boss encounters: each boss is a small state machine built from ordinary enemy parts ===== */
ENEMIES.bossArm = { hp: 26, r: 4.4, score: 300, lock: true, build: () => buildBossArm(), init() {}, update(e, dt) {},
  onDeath(e, g) { g.comm('gloam', 'My arms! You\'ll pay for that!', 2.4); FX.explosion(e.mesh.position, 2.2); g.shake(0.8); } };
ENEMIES.bossCore = { hp: 70, r: 4.4, score: 1500, lock: true, build: () => buildBossCore(), init(e) { e.invuln = true; }, update(e, dt) { e.mesh.rotation.y += dt * 2; },
  onDeath(e, g) { g.bossDie(); } };
ENEMIES.hivePlate = { hp: 14, r: 4, score: 300, lock: true, build: () => buildHivePlate(), init() {}, update(e, dt) {},
  onDeath(e, g) { FX.explosion(e.mesh.position, 1.8); g.shake(0.6); } };
ENEMIES.hiveCore = { hp: 90, r: 5, score: 2000, lock: true, build: () => buildHiveCore(), init(e) { e.invuln = true; }, update(e, dt) { e.mesh.rotation.y += dt * 1.2; e.mesh.rotation.z += dt * 0.7; },
  onDeath(e, g) { g.bossDie(); } };

const BOSSES = {
  bastion: {
    name: 'GANTRY TITAN', music: 'boss',
    start(g, b) {
      b.group = buildBastion(); b.group.scale.setScalar(1.5); g.scene.add(b.group); b.dzT = 112; b.dz = 430; b.armT = [1.5, 2.6]; b.ringT = 3; b.missT = 5; b.sweepT = 6; b.openT = 0; b.phase = 1;
      b.armL = g.spawnEnemy('bossArm', 0, 0, 0, {}, true); b.armR = g.spawnEnemy('bossArm', 0, 0, 0, {}, true); b.core = g.spawnEnemy('bossCore', 0, 0, 0, {}, true);
      b.armL.off = new THREE.Vector3(-22, 4, -6); b.armR.off = new THREE.Vector3(22, 4, -6); b.core.off = new THREE.Vector3(0, 3, -12.5);
      for (const p of [b.armL, b.armR, b.core]) { p.parent = b; p.boss = true; }
      b.parts = [b.armL, b.armR, b.core]; g.comm('gloam', 'So the little lark flew all this way to die. The Titan will crush you!', 4, true);
    },
    update(g, b, dt) {
      b.dz = damp(b.dz, b.dzT, 1.6, dt);
      b.group.position.set(Math.sin(b.t * 0.5) * 22 * (b.phase === 1 ? 1 : 1.2), 14 + Math.sin(b.t * 0.7) * 4, g.pz - b.dz);
      b.group.userData.gate.scale.y = b.core.invuln ? 7 : 1.2;
      const armsAlive = (b.armL.alive ? 1 : 0) + (b.armR.alive ? 1 : 0);
      const readyToShoot = b.dz < 190;
      b.phase = armsAlive ? 1 : (b.core.hp > b.core.maxhp * 0.4 ? 2 : 3);
      if (b.phase === 1) { b.openT += dt; const c = b.openT % 8; const open = c > 4.6; if (b.core.invuln === open) { b.core.invuln = !open; if (open) Audio.sfx('ping'); } }
      else if (b.core.invuln) { b.core.invuln = false; g.comm('bramble', 'Its core is exposed! Hit it with everything!', 3, true); g.banner('CORE EXPOSED', ''); }
      if (!readyToShoot) return;
      const dm = DIFF[Settings.difficulty];
      for (let i = 0; i < 2; i++) { const arm = i ? b.armR : b.armL; if (!arm.alive) continue; b.armT[i] -= dt; if (b.armT[i] <= 0) { b.armT[i] = (phaseArm(b) + i * 0.4) / dm.fire; b.bt = b.bt || [0, 0]; for (let k = 0; k < 3; k++) setTimeout(() => { if (g.boss === b && arm.alive && g.state === 'play') { _v.copy(arm.mesh.position); _v.z -= 6; g.enemyShoot(_v, 82 * dm.spd, 0.9); } }, k * 130); } }
      if (b.phase >= 2) {
        b.ringT -= dt; if (b.ringT <= 0) { b.ringT = (b.phase === 2 ? 2.8 : 2) / dm.fire; g.ringShot(b.core.mesh.position, b.phase === 2 ? 14 : 20, 44 * dm.spd, b.t); }
        b.missT -= dt; if (b.missT <= 0) { b.missT = 5.5 / dm.fire; for (const s of [-1, 1]) { const m = g.spawnEnemy('missile', 0, 0, 0, { vel: new THREE.Vector3(s * 26, 14, 24) }, true); m.mesh.position.copy(b.group.position).add(new THREE.Vector3(14 * s, 0, 0)); } }
      }
      if (b.phase === 3) { b.sweepT -= dt; if (b.sweepT <= 0) { b.sweepT = 5.2; g.sweep(g.P.ox + rand(-6, 6)); } }
    },
  },
  hivemaw: {
    name: 'HIVE MAW', music: 'boss',
    start(g, b) {
      b.group = new THREE.Group(); g.scene.add(b.group); b.dzT = 118; b.dz = 430; b.phase = 1; b.spin = 0; b.spiral = 0; b.fireT = 2; b.sweepT = 7; b.ringT = 4; b.plateT = 2;
      const shell = buildHiveCore(); shell.scale.setScalar(1.7); b.group.add(shell); b.shell = shell;
      b.core = g.spawnEnemy('hiveCore', 0, 0, 0, {}, true); b.core.parent = b; b.core.off = new THREE.Vector3(); b.core.boss = true; b.core.r = 7; b.core.mesh.visible = false;
      b.plates = []; for (let i = 0; i < 6; i++) { const p = g.spawnEnemy('hivePlate', 0, 0, 0, {}, true); p.parent = b; p.manual = true; p.ang = (i / 6) * TAU; p.boss = true; p.mesh.scale.setScalar(1.6); p.r = 5.5; b.plates.push(p); }
      b.parts = [b.core, ...b.plates]; g.comm('gloam', 'Welcome to my Hive. Nothing leaves the Veil alive!', 4, true);
    },
    update(g, b, dt) {
      b.dz = damp(b.dz, b.dzT, 1.6, dt);
      b.group.position.set(Math.sin(b.t * 0.4) * 18, 12 + Math.cos(b.t * 0.55) * 5, g.pz - b.dz);
      b.core.mesh.position.copy(b.group.position); b.shell.rotation.y += dt * 0.6; b.shell.rotation.x += dt * 0.3;
      const alive = b.plates.filter((p) => p.alive).length;
      b.spin += dt * (0.7 + (6 - alive) * 0.25);
      b.plates.forEach((p, i) => { if (!p.alive) return; const a = p.ang + b.spin, r = 16 + Math.sin(b.t * 2 + i) * 1.5; p.mesh.position.set(b.group.position.x + Math.cos(a) * r, b.group.position.y + Math.sin(a) * r, b.group.position.z); p.mesh.rotation.z = a; });
      b.phase = alive > 2 ? 1 : (b.core.hp > b.core.maxhp * 0.4 ? 2 : 3);
      if (b.phase > 1 && b.core.invuln) { b.core.invuln = false; g.comm('kestrel', 'Plating is cracking — core\'s open!', 2.8, true); g.banner('CORE EXPOSED', ''); }
      if (b.dz > 190) return;
      const dm = DIFF[Settings.difficulty];
      b.fireT -= dt;
      if (b.fireT <= 0) {
        b.fireT = (b.phase === 1 ? 0.22 : b.phase === 2 ? 0.14 : 0.1) / dm.fire; b.spiral += 0.5 * (b.phase);
        _v.copy(b.group.position); const a = b.spiral;
        g.shootDir(_v, new THREE.Vector3(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 1).normalize(), 52 * dm.spd);
        if (b.phase === 3) g.shootDir(_v, new THREE.Vector3(Math.cos(a + Math.PI) * 0.42, Math.sin(a + Math.PI) * 0.42, 1).normalize(), 52 * dm.spd);
      }
      b.plateT -= dt;
      if (b.plateT <= 0 && b.phase === 1) { b.plateT = 2.2 / dm.fire; const p = pick(b.plates.filter((q) => q.alive)); if (p) g.enemyShoot(p.mesh.position, 80 * dm.spd, 0.9); }
      if (b.phase >= 2) { b.sweepT -= dt; if (b.sweepT <= 0) { b.sweepT = b.phase === 2 ? 6 : 4.2; g.sweep(g.P.ox + rand(-5, 5)); } }
      if (b.phase === 3) { b.ringT -= dt; if (b.ringT <= 0) { b.ringT = 3.3 / dm.fire; g.ringShot(b.group.position, 18, 42 * dm.spd, b.t); } }
    },
  },
};
function phaseArm(b) { return 2.1; }
