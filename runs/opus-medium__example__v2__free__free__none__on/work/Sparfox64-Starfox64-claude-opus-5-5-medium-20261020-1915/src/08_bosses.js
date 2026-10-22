// ===== 08_bosses.js — rail mid-boss (Attack Carrier) and all-range boss (Basalt Leviathan) =====
function partPose(e, group) { e.pos.copy(e.local).applyMatrix4(group.matrixWorld); e.mesh.quaternion.copy(group.quaternion); }

const Carrier = {
  active: false, group: null, parts: [],
  build() {
    const g = new THREE.Group();
    const hull = toon(0x5a5a6a, { flatShading: true }), red = toon(0xb83a30, { flatShading: true }), dark = toon(0x2a2a34, { flatShading: true });
    g.add(mesh(new THREE.BoxGeometry(24, 9, 80), hull));
    const nose = new THREE.ConeGeometry(12, 22, 4); nose.rotateX(-Math.PI / 2); nose.rotateZ(Math.PI / 4); nose.scale(1, 0.55, 1); g.add(mesh(nose, hull, 0, 0, -51));
    g.add(mesh(new THREE.BoxGeometry(30, 2, 60), red, 0, -4, 4));
    g.add(mesh(new THREE.BoxGeometry(14, 6, 16), dark, 0, 0, -30));
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(2, 1, 2), glow(4, 2, 0.5), 10, 4.6, -30 + i * 12));
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(2, 1, 2), glow(4, 2, 0.5), -10, 4.6, -30 + i * 12));
    for (const s of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(2.6, 3.2, 8, 8).rotateX(Math.PI / 2), dark, s * 8, 0, 42)); g.add(mesh(new THREE.CircleGeometry(2.6, 12), glow(1.2, 2.5, 5), s * 8, 0, 46.1)); }
    Gfx.scene.add(shadowed(g, true, false));
    this.group = g; g.visible = false;
    this.mkPod = () => { const p = new THREE.Group(); p.add(mesh(new THREE.CylinderGeometry(5, 6, 22, 10).rotateX(Math.PI / 2), red)); p.add(mesh(new THREE.SphereGeometry(3, 10, 8), glow(5, 1.2, 0.4), 0, 0, 11)); for (const s of [-1, 1]) p.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 8, 6).rotateX(Math.PI / 2), dark, s * 3, 3, -12)); return shadowed(p, true, false); };
    this.mkBridge = () => { const p = new THREE.Group(); p.add(mesh(new THREE.BoxGeometry(12, 8, 12), hull)); p.add(mesh(new THREE.BoxGeometry(10, 2, 3), glow(3, 3.6, 4.5), 0, 1.5, 6.1)); p.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 10, 5), dark, 3, 8, 0)); p.add(mesh(new THREE.SphereGeometry(1, 6, 6), glow(5, 0.5, 0.3), 3, 13.5, 0)); return shadowed(p, true, false); };
  },
  start() {
    if (this.active) return;
    this.active = true; this.t = 0; this.phase = 'enter'; this.rel = -90; this.lx = 0; this.ly = 75; this.launchT = 5; this.bridgeT = 2;
    this.group.visible = true;
    this.hullCol = Physics.addMoverBox(12, 4.5, 40, { kind: 'static' }, Physics.G_ENEMY);
    const P = (local, model, hp, radius, extra = {}) => Enemies.spawn('part', Object.assign({ model, hp, radius, local, keep: true, railRel: false, boss: true, hits: 3, noRam: true, boomSize: 2.5, update: e => partPose(e, this.group) }, extra));
    const podDeath = () => { if (this.pods.every(p => !p.alive)) { this.bridge.shielded = false; Comms.say('moss', 'Both engine pods are down! The bridge shield is open — hit it now!', 3.5, null, true); } };
    this.pods = [P(V3(-22, -1, 10), this.mkPod(), 14 * (1 + Settings.difficulty * 0.25), 7, { onDeath: podDeath }), P(V3(22, -1, 10), this.mkPod(), 14 * (1 + Settings.difficulty * 0.25), 7, { onDeath: podDeath })];
    this.bridge = P(V3(0, 9, 20), this.mkBridge(), 26 * (1 + Settings.difficulty * 0.25), 7, { shielded: true, onDeath: (e, by) => { if (by) this.destroyed(); }, onBlocked: () => { if (!this.blockedTold) { this.blockedTold = true; Comms.say('moss', 'The bridge is shielded! Take out the two engine pods first!', 3); } } });
    this.parts = [...this.pods, this.bridge];
    this.maxHp = this.parts.reduce((a, p) => a + p.maxHp, 0);
    HUD.bossBar = { name: 'ATTACK CARRIER  GRIMHOLD', frac: () => this.parts.reduce((a, p) => a + (p.alive ? Math.max(0, p.hp) : 0), 0) / this.maxHp, show: false };
    Audio_.play('alarm');
    Comms.say('tusk', 'Big contact on radar — coming in from behind! It\'s an attack carrier!', 3.5, null, true);
    Comms.say('moss', 'I\'m patching its shield readout into your HUD!', 3, 'bossbar');
    Comms.say('kraag', 'Little pilots. The Grimhold will swat you from my sky.', 3.5);
  },
  destroyed() {
    this.phase = 'dying'; this.dieT = 0;
    Game.addHits(10, this.group.position, 'CARRIER BONUS');
    Comms.say('wren', 'Ha! That flying junkyard is going down!', 3, null, true);
  },
  end() {
    this.active = false; this.group.visible = false; Physics.remove(this.hullCol); this.hullCol = null;
    for (const p of this.parts) if (p.alive) Enemies.kill(p, false, true);
    HUD.bossBar = null;
  },
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.phase === 'enter') {
      this.rel = damp(this.rel, 120, 0.7, dt); this.ly = damp(this.ly, 24, 0.7, dt);
      if (this.t > 5) { this.phase = 'fight'; }
    } else if (this.phase === 'fight') {
      this.lx = Math.sin(this.t * 0.4) * 30; this.ly = 22 + Math.sin(this.t * 0.7) * 8;
      if (Game.d > L.MIDBOSS_END) { this.phase = 'flee'; Comms.say('tusk', 'It\'s getting away! Forget it — keep moving.', 3); }
      for (const p of this.pods) if (p.alive) { p.fireT -= dt * diff().enemyFire; if (p.fireT <= 0) { p.fireT = rand(1.8, 2.6); for (let i = -1; i <= 1; i++) { const b = Projectiles.enemyShot(p.pos.clone(), Player, 80); b.vel.applyAxisAngle(UP, i * 0.12); } } }
      if (this.bridge.alive && !this.bridge.shielded) { this.bridgeT -= dt * diff().enemyFire; if (this.bridgeT <= 0) { this.bridgeT = 1.6; for (let i = 0; i < 5; i++) { const b = Projectiles.enemyShot(this.bridge.pos.clone(), Player, 70); b.vel.applyAxisAngle(Rail.fwd, (i - 2) * 0.25).applyAxisAngle(UP, (i - 2) * 0.08); } } }
      this.launchT -= dt;
      if (this.launchT <= 0) { this.launchT = 7; for (const s of [-1, 1]) Enemies.spawn('dart', B.hold({ ahead: this.rel - 30, lx0: this.lx + s * 14, ly0: this.ly - 4, hold: 70, life: 6, wa: 30, phase: s })); }
    } else if (this.phase === 'flee') {
      this.rel += dt * 90; this.ly += dt * 25;
      if (this.rel > 900) this.end();
    } else if (this.phase === 'dying') {
      this.dieT += dt; this.ly -= dt * 6;
      if (Math.random() < dt * 14) FX.explode(_v1.set(rand(-14, 14), rand(-4, 6), rand(-38, 38)).applyMatrix4(this.group.matrixWorld).clone(), rand(1, 2), { debris: true });
      this.group.rotation.z += dt * 0.1;
      if (this.dieT > 2.4) { FX.explode(this.group.position.clone(), 5); Gfx.flashLight(this.group.position, 300, 1.2); HUD.banner('CARRIER DESTROYED', '+10 bonus hits', 2.4); this.end(); return; }
    }
    Rail.point(Game.d + this.rel, this.lx, this.ly, Game.route, this.group.position);
    _v1.copy(this.group.position).add(Rail.fwd);
    this.group.lookAt(_v1.x, _v1.y, _v1.z);
    this.group.rotateY(Math.PI);
    if (this.phase !== 'dying') this.group.rotateZ(Math.sin(this.t * 0.7) * 0.08);
    this.group.updateMatrixWorld(true);
    if (this.hullCol) { const q = this.group.quaternion; this.hullCol.setTranslation(this.group.position); this.hullCol.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }); }
    if (HUD.bossBar && this.phase === 'fight') HUD.bossBar.show = true;
  },
};

const Boss = {
  active: false, group: null,
  build() {
    const g = new THREE.Group();
    const purple = toon(0x4a3070, { flatShading: true }), stone = toon(0x5c5a68, { flatShading: true }), gold = toon(0xd0a040, { flatShading: true }), dark = toon(0x1e1828, { flatShading: true });
    const ring = new THREE.TorusGeometry(30, 4.5, 8, 24); ring.rotateX(Math.PI / 2); g.add(mesh(ring, stone));
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; const b = mesh(new THREE.BoxGeometry(2, 2, 2), glow(4, 0.6, 2), Math.cos(a) * 30, 4.6, Math.sin(a) * 30); g.add(b); }
    this.shellTop = mesh(new THREE.SphereGeometry(19, 12, 8, 0, TAU, 0, Math.PI / 2), purple); g.add(this.shellTop);
    this.shellBot = mesh(new THREE.SphereGeometry(19, 12, 8, 0, TAU, Math.PI / 2, Math.PI / 2), purple); g.add(this.shellBot);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const sp = mesh(new THREE.ConeGeometry(2.5, 12, 5), gold, Math.cos(a) * 12, 14, Math.sin(a) * 12); sp.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); this.shellTop.add(sp); }
    this.shellTop.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 16, 5), dark, 0, 26, 0));
    this.eye = mesh(new THREE.SphereGeometry(1.6, 8, 6), glow(5, 0.4, 0.4), 0, 34, 0); this.shellTop.add(this.eye);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; const arm = mesh(new THREE.BoxGeometry(22, 4, 5), stone, Math.cos(a) * 22, 0, Math.sin(a) * 22); arm.rotation.y = -a; g.add(arm); }
    this.coreMesh = new THREE.Group();
    this.coreMesh.add(mesh(new THREE.IcosahedronGeometry(9, 1), glow(5, 0.8, 1.4)));
    this.coreMesh.add(mesh(new THREE.IcosahedronGeometry(11, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 0.2, 0.6), wireframe: true })));
    g.add(this.coreMesh);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.add(mesh(new THREE.ConeGeometry(3, 8, 6).rotateX(Math.PI), glow(2, 1, 5), Math.cos(a) * 20, -10, Math.sin(a) * 20)); }
    // beam
    const beamG = new THREE.CylinderGeometry(2.6, 2.6, 520, 8, 1, true); beamG.rotateZ(Math.PI / 2); beamG.translate(260, 0, 0);
    this.beam = mesh(beamG, glow(5, 0.5, 1, { transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
    this.beamPivot = new THREE.Group(); this.beamPivot.add(this.beam);
    const tele = new THREE.CylinderGeometry(0.3, 0.3, 520, 4, 1, true); tele.rotateZ(Math.PI / 2); tele.translate(260, 0, 0);
    this.tele = mesh(tele, glow(4, 0.3, 0.3, { transparent: true, opacity: 0.6 })); this.beamPivot.add(this.tele);
    Gfx.scene.add(this.beamPivot); this.beamPivot.visible = false;
    Gfx.scene.add(shadowed(g, true, false)); g.visible = false; this.group = g;
    this.mkPod = () => { const p = new THREE.Group(); p.add(mesh(new THREE.CylinderGeometry(6, 7, 9, 8), gold)); p.add(mesh(new THREE.SphereGeometry(5, 10, 8), stone, 0, 5, 0)); p.add(mesh(new THREE.SphereGeometry(2.2, 8, 6), glow(5, 1.4, 0.3), 0, 6, -4)); for (const s of [-1, 1]) p.add(mesh(new THREE.CylinderGeometry(0.8, 0.8, 9, 6).rotateX(Math.PI / 2), dark, s * 2.5, 5, -7)); return shadowed(p, true, false); };
  },
  center() { return _v4.set(L.ARENA.x + Math.cos(this.t * 0.12) * 90, this.y, L.ARENA.z + Math.sin(this.t * 0.12) * 90); },
  start() {
    this.active = true; this.t = 0; this.phase = 'intro'; this.y = -40; this.open = 0; this.cycleT = 0; this.coreOpen = false; this.beamState = 'off'; this.missileT = 5; this.hunterT = 6; this.ringT = 0; this.usedBeam = false;
    this.group.visible = true; this.group.position.copy(this.center());
    this.shellCol = Physics.addMover(19, { kind: 'static' }, Physics.G_ENEMY);
    const mul = 1 + Settings.difficulty * 0.25;
    this.pods = [0, 1, 2, 3].map(i => {
      const a = i / 4 * TAU + Math.PI / 4;
      return Enemies.spawn('part', { model: this.mkPod(), hp: 16 * mul, radius: 7.5, local: V3(Math.cos(a) * 37, 2, Math.sin(a) * 37), keep: true, railRel: false, boss: true, hits: 3, noRam: true, boomSize: 2.6, fireT: rand(1, 3), update: e => partPose(e, this.group), onDeath: () => this.podDown() });
    });
    this.core = Enemies.spawn('part', { model: new THREE.Group(), hp: 60 * mul, radius: 10, local: V3(0, 0, 0), keep: true, railRel: false, boss: true, hits: 10, noRam: true, shielded: true, lockable: false, update: e => { partPose(e, this.group); e.lockable = this.coreOpen; }, onDeath: (e, by) => this.defeated(), onHit: () => { this.coreMesh.scale.setScalar(1.25); }, onBlocked: () => { if (!this.toldShell && this.phase === 'pods') { this.toldShell = true; Comms.say('moss', 'Its core is sealed inside that shell. Destroy the four cannon pods first!', 3.4); } } });
    this.parts = [...this.pods, this.core];
    this.maxHp = this.parts.reduce((a, p) => a + p.maxHp, 0);
    HUD.bossBar = { name: 'BASALT LEVIATHAN', frac: () => this.parts.reduce((a, p) => a + (p.alive ? Math.max(0, p.hp) : 0), 0) / this.maxHp, show: false };
  },
  podDown() {
    const left = this.pods.filter(p => p.alive).length;
    if (left === 2) Comms.say('tusk', 'Halfway there. Keep pouring it on!', 2.6);
    if (left === 0) { this.phase = 'core'; this.cycleT = 0; Comms.say('moss', 'All pods down! When the shell opens, hit the core!', 3.4, null, true); Comms.say('kraag', 'Insolent vermin! Leviathan — unseal!', 3); }
  },
  defeated() {
    this.phase = 'dying'; this.dieT = 0; this.beamPivot.visible = false; this.beamState = 'off';
    Game.timeScale = 0.35; HUD.bossBar = null;
    for (const e of Enemies.list) if (e.alive && !e.boss) Enemies.kill(e, true);
    Comms.say('kraag', 'No... NO! This is not the end, Sparfox! The Dominion remembers!', 4, null, true);
  },
  end() {
    this.active = false; this.group.visible = false; this.beamPivot.visible = false;
    Physics.remove(this.shellCol); this.shellCol = null;
    for (const p of this.parts || []) if (p.alive) Enemies.kill(p, false, true);
    HUD.bossBar = null;
  },
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.phase === 'intro') { this.y = damp(this.y, 75, 0.9, dt); if (this.t > 5) { this.phase = 'pods'; HUD.bossBar.show = true; } }
    else if (this.phase !== 'dying') this.y = 75 + Math.sin(this.t * 0.5) * 8;
    this.group.position.copy(this.center());
    this.group.rotation.y += dt * (this.phase === 'core' ? 0.35 : 0.22);
    this.coreMesh.rotation.x += dt * 1.3; this.coreMesh.rotation.y += dt;
    this.coreMesh.scale.setScalar(damp(this.coreMesh.scale.x, 1 + Math.sin(this.t * 6) * 0.05, 8, dt));
    this.eye.visible = Math.sin(this.t * 4) > -0.6;
    // shell open/close
    if (this.phase === 'core') {
      this.cycleT += dt;
      const lowHp = this.core.hp < this.core.maxHp * 0.5;
      if (this.coreOpen && this.cycleT > 7) { this.coreOpen = false; this.cycleT = 0; if (lowHp && !this.usedBeam) this.beamState = 'charge'; }
      else if (!this.coreOpen && this.cycleT > (this.beamState !== 'off' ? 5.2 : 4)) { this.coreOpen = true; this.cycleT = 0; this.usedBeam = false; if (lowHp && Math.random() < 0.4) this.usedBeam = false; }
      if (!this.coreOpen && this.beamState === 'off') { this.ringT -= dt; if (this.ringT <= 0) { this.ringT = 1.3; this.radial(); } }
    }
    this.open = damp(this.open, this.coreOpen ? 1 : 0, 4, dt);
    this.shellTop.position.y = this.open * 15; this.shellBot.position.y = -this.open * 15;
    this.core.shielded = this.open < 0.7;
    this.group.updateMatrixWorld(true);
    if (this.shellCol) this.shellCol.setTranslation(this.open > 0.6 ? { x: 0, y: -2000, z: 0 } : { x: this.group.position.x, y: this.group.position.y, z: this.group.position.z });
    if (this.phase === 'dying') {
      this.dieT += dt; this.y -= dt * 4;
      if (Math.random() < dt * 20) FX.explode(_v1.set(rand(-30, 30), rand(-15, 20), rand(-30, 30)).applyMatrix4(this.group.matrixWorld).clone(), rand(1.5, 3));
      if (this.dieT > 1.6) Game.timeScale = damp(Game.timeScale, 1, 2, dt);
      if (this.dieT > 3.6) { FX.explode(this.group.position.clone(), 6); Gfx.flashLight(this.group.position, 600, 2, 0xffffff); HUD.whiteFlash = 1; this.end(); Game.onBossDefeated(); }
      return;
    }
    if (this.phase === 'intro') return;
    // pods fire aimed triples, occasionally missiles
    for (const p of this.pods) if (p.alive) {
      p.fireT -= dt * diff().enemyFire;
      if (p.fireT <= 0) { p.fireT = rand(2, 3.4); if (p.pos.distanceTo(Player.pos) < 480) for (let i = -1; i <= 1; i++) { const b = Projectiles.enemyShot(p.pos.clone(), Player, 90); b.vel.applyAxisAngle(UP, i * 0.1); } }
    }
    this.missileT -= dt * diff().enemyFire;
    if (this.missileT <= 0) {
      this.missileT = this.phase === 'core' ? 3.5 : 6;
      const src = this.phase === 'pods' ? pick(this.pods.filter(p => p.alive)) : this.core;
      if (src) { spawnMissile(src.pos.clone().add(V3(0, 8, 0)), V3(0, 1, 0)); if (!this.toldMissile) { this.toldMissile = true; Comms.say('wren', 'Homing missiles! Shoot \'em down or barrel roll!', 3); } }
    }
    if (this.coreOpen && this.core.alive) { this.core.fireT -= dt * diff().enemyFire; if (this.core.fireT <= 0) { this.core.fireT = 0.9; Projectiles.enemyShot(this.core.pos.clone(), Player, 100); } }
    // escorts
    this.hunterT -= dt;
    if (this.hunterT <= 0) {
      this.hunterT = 16;
      const n = Enemies.list.filter(e => e.alive && e.type === 'hunter').length;
      for (let i = n; i < 3; i++) spawnHunter(this.group.position.clone().add(V3(rand(-60, 60), 30, rand(-60, 60))), { hits: 1 });
    }
    // sweeping beam attack
    if (this.beamState !== 'off') this.updateBeam(dt);
  },
  radial() {
    const c = this.group.position, n = 18, off = rand(0, TAU);
    for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) {
      const a = off + i / n * TAU + k * 0.17;
      const m = new THREE.Mesh(Projectiles.geoBullet, Projectiles.matE); m.scale.setScalar(1.3);
      const pos = c.clone().add(V3(Math.cos(a) * 20, (k - 0.5) * 10, Math.sin(a) * 20));
      Projectiles.add({ kind: 'ebullet', mesh: m, pos, prev: pos.clone(), vel: V3(Math.cos(a), (Player.pos.y - c.y) / 500, Math.sin(a)).multiplyScalar(55), life: 7, dmg: 8, alive: true });
    }
    Audio_.play('enemyShot', { vol: 1 });
  },
  updateBeam(dt) {
    this.beamT = (this.beamT || 0) + dt;
    const P = this.beamPivot; P.visible = true; P.position.copy(this.group.position);
    if (this.beamState === 'charge') {
      if (this.beamT < dt * 1.5) { Audio_.play('beamCharge'); Comms.say('moss', 'It\'s charging a sweep beam! Fly high or low — get out of its plane!', 3.2, null, true); this.beamAngle = Math.atan2(-(Player.pos.z - P.position.z), Player.pos.x - P.position.x) + 1.2; }
      this.beam.visible = false; this.tele.visible = Math.floor(this.beamT * 12) % 2 === 0;
      P.rotation.set(0, this.beamAngle, 0);
      if (this.beamT > 1.6) { this.beamState = 'fire'; this.beamT = 0; Audio_.play('beam'); Gfx.addShake(0.6); }
    } else if (this.beamState === 'fire') {
      this.beam.visible = true; this.tele.visible = false;
      this.beamAngle -= dt * 0.75; P.rotation.set(0, this.beamAngle, 0);
      this.beam.scale.set(1, 1 + Math.sin(this.beamT * 40) * 0.15, 1 + Math.sin(this.beamT * 40) * 0.15);
      _v2.set(520, 0, 0).applyEuler(P.rotation).add(P.position);
      if (segDist(P.position, _v2, Player.pos) < 7.5 && !Player.dead) Player.hurt(18);
      if (this.beamT > 3) { this.beamState = 'off'; this.beamT = 0; P.visible = false; this.usedBeam = true; }
    }
  },
};
