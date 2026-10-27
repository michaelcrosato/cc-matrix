// ---------------------------------------------------------------- Game session core: stage loading, pilots, cameras, damage, pickups, flow
const Game = {
  active: false, kind: 'rail', st: null, stageIdx: 0, cfg: null, pilots: [], enemies: [], shots: [], pickups: [], obstacles: [], wingmen: [], hazards: [], bombs: [], chasers: [],
  rail: null, a: { s: 0, speed: 46, mul: 1 }, evIdx: 0, time: 0, state: 'intro', stateT: 0, paused: false, attract: false, boss: null, camState: null,
  stats: { kills: 0, spawned: 0, pipSaved: null, time: 0 }, chunks: null, env: null, groundMesh: null, shake: 0, flash: 0, over: false, hintsShown: {}, adviceCd: 0, arPhase: 0, arKills: 0, arT: 0, results: null,

  start(cfg) {
    this.cfg = cfg; this.attract = !!cfg.attract; this.stageIdx = cfg.startIndex || 0; this.over = false; this.results = null; this.hintsShown = {};
    this.pilots = cfg.players.map((pl, i) => this.makePilot(pl.slot ?? i, pl.dev, pl.ai ? pl.ai : null, this.attract ? 99 : 3));
    this.totalScore = 0; this.active = true; this.runStats = []; this.loadStage(cfg.stageIds[this.stageIdx]);
  },
  makePilot(slot, dev, ai, lives) {
    const col = PLAYER_COLORS[slot % 4];
    return { slot, dev, ai, color: col, lives, hp: 100, maxHp: 100, bombs: 3, score: 0, kills: 0, hits: 0, wlevel: 1, charge: 0, charging: false, lockT: 0, locks: [], rollT: 0, rollDir: 1, rollCd: 0, boostMeter: 1, boostOn: false, boostCd: 0, invuln: 0, alive: true, out: false, respawnT: 0, x: 0, y: 7, vx: 0, vy: 0, pz: 0, aimX: 0, aimY: 0, fireCd: 0, ship: null, pos: V3(), vel: V3(), speedMul: 1, hitstun: 0, ctl: blankCtl(), crashCd: 0, tailed: false, deaths: 0, rings: 0, medals: 0,
      yaw: 0, pitch: 0, roll: 0, speed: 55, man: null, manT: 0, cam: { yaw: 0, pitch: 0, pos: V3(), init: false }, aimDir: V3(0, 0, -1), reticle: V3(), ringChain: 0, ringChainT: 0, dmgTaken: 0 };
  },
  loadStage(id) {
    const st = this.st = STAGES[id]; this.kind = st.kind; this.stageId = id;
    R.clearWorld(); FX.reset(); Phys.clearDebris(); Phys.newWorld(this.kind === 'rail' ? -22 : 0, this.kind === 'rail');
    this.enemies = []; this.shots = []; this.pickups = []; this.obstacles = []; this.wingmen = []; this.hazards = []; this.bombs = []; this.chasers = []; this.boss = null; this.env = null; this.chunks = null; this.groundMesh = null;
    this.evIdx = 0; this.evs = this.kind === 'rail' ? buildEventList(st) : []; this.time = 0; this.state = 'intro'; this.stateT = 0; this.arPhase = 0; this.arKills = 0; this.arT = 0; this.a = { s: 0, speed: st.speed || 46, mul: 1, base: st.speed || 46 }; this.stats = { kills: 0, spawned: 0, pipSaved: null, time: 0, wingLost: 0 };
    this.timers = []; this.arSpawned = 0; this.spawnT = 1; this.rival = null; this.chaseWatch = false; this.chaseWatchAR = false; this.camState = null; this.shake = 0; this.flash = 0; this.hintsShown = {};
    R.setPalette(st.palette); Hud.reset(); Comms.reset();
    if (this.kind === 'rail') {
      this.rail = new Rail(st.path); this.chunks = buildRailScenery(st, this.rail);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200), R.groundMat); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; g.userData.noDispose = true; R.world.add(g); this.groundMesh = g;
    } else { this.env = buildSpaceEnv(); this.rail = null; }
    const n = this.pilots.length;
    this.pilots.forEach((p, i) => {
      p.hp = p.maxHp = Math.max(100, p.maxHp); p.hp = p.maxHp; p.bombs = Math.max(3, p.bombs); p.alive = !p.out; p.invuln = 3; p.charge = 0; p.charging = false; p.locks = []; p.rollT = 0; p.boostMeter = 1; p.vx = p.vy = 0; p.pz = 0; p.hitstun = 0; p.respawnT = 0; p.man = null; p.tailed = false; p.stageKills = 0; p.stageScore0 = p.score; p.cam.init = false;
      if (p.ship) R.world.remove(p.ship); p.ship = buildShip({ body: p.color.body, accent: p.color.accent }); R.world.add(p.ship);
      if (this.kind === 'rail') { p.x = (i - (n - 1) / 2) * 7; p.y = 8; p.pos = this.rail.toWorld(0, p.x, p.y); }
      else { const ang = (i / n) * TAU + 0.6; p.pos.set(Math.cos(ang) * 40, 0, Math.sin(ang) * 40 + 40); p.yaw = ang + Math.PI / 2 + Math.PI; p.pitch = 0; p.speed = 55; }
      p.ship.position.copy(p.pos); Phys.attach(p, { r: 1.5, group: GRP.PLAYER, pos: p.pos });
    });
    if (this.kind === 'rail') this.setupRailWingmen(); else this.setupARWingmen();
    Music.play(st.music); A.play('stage'); this.followCamera(1, true);
    if (this.kind === 'rail') Hud.banner(st.name.toUpperCase(), st.sub); else { Hud.banner(st.name.toUpperCase(), st.sub); Comms.say('ar_intro', 2.5); }
    if (A.ctx) { A.loopStart('engine', 'sawtooth', 70, 0.05); }
  },
  // ---- main update
  update(dt) {
    if (!this.active) return; if (this.paused) { this.followCamera(0, false); return; }
    this.time += dt; this.stateT += dt; this.stats.time += dt; this.adviceCd -= dt; this.shake = Math.max(0, this.shake - dt * 2.4); this.flash = Math.max(0, this.flash - dt * 1.8);
    Hud.update(dt); Comms.update(dt); Tweens.update(dt); this.runTimers(dt);
    if (this.kind === 'rail') this.updateRail(dt); else this.updateAR(dt);
    for (const p of this.pilots) if (p.ai) AIPilot.think(p, dt);
    FX.update(dt); this.updateEngineSound();
  },
  updateEngineSound() {
    if (!A.loops.engine) return; const p = this.pilots.find((q) => q.alive); const sp = p ? (this.kind === 'rail' ? p.speedMul : p.speed / 55) : 0.5;
    A.loopSet('engine', 50 + sp * 38, p ? 0.8 : 0.2, 260 + sp * 300);
  },
  after(sec, fn) { this.timers.push({ t: sec, fn }); },
  runTimers(dt) { for (const k of this.timers) k.t -= dt; const due = this.timers.filter((k) => k.t <= 0); this.timers = this.timers.filter((k) => k.t > 0); for (const k of due) k.fn(); },
  alivePilots() { return this.pilots.filter((p) => p.alive); },
  nearestPilot(pos, filter) { let best = null, bd = 1e9; for (const p of this.pilots) { if (!p.alive) continue; if (filter && !filter(p)) continue; const d = p.pos.distanceToSquared(pos); if (d < bd) { bd = d; best = p; } } return best; },
  hpScale() { return 1 + 0.6 * (this.pilots.filter((p) => !p.out).length - 1); },

  // ---- cameras
  followCamera(dt, snap) { if (this.kind === 'rail') this.camRail(dt, snap); else this.camAR(dt, snap); },
  camRail(dt, snap) {
    const al = this.alivePilots(), src = al.length ? al : this.pilots; let cx = 0, cy = 0; for (const p of src) { cx += p.x; cy += p.y; } cx /= src.length; cy /= src.length;
    const a = this.a, intro = this.state === 'intro' ? Math.max(0, 1 - this.stateT / 3.2) : 0, r = this.rail;
    const camP = r.toWorld(a.s - 21, cx * 0.35, 6.5 + cy * 0.38 + intro * 10), look = r.toWorld(a.s + 34, cx * 0.55, 5 + cy * 0.42);
    const cs = this.camState || (this.camState = { pos: camP.clone(), look: look.clone(), roll: 0, fov: 62 });
    const k = snap ? 1 : 1 - Math.exp(-6 * dt); cs.pos.lerp(camP, k); cs.look.lerp(look, k);
    const boost = src.some((p) => p.boostOn) ? 1 : 0, brake = src.some((p) => p.ctl && p.ctl.brake && !p.boostOn) ? 1 : 0; cs.fov = damp(cs.fov, 62 + boost * 14 - brake * 6 + intro * 10, 4, dt || 0.016);
    const cam = R.cams[0]; cam.position.copy(cs.pos); if (Settings.shake && this.shake > 0) cam.position.add(V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).multiplyScalar(this.shake * 0.8));
    cam.up.set(0, 1, 0); cam.lookAt(cs.look); cs.roll = damp(cs.roll, -cx * 0.0035, 3, dt || 0.016); cam.rotateZ(cs.roll); cam.fov = cs.fov; cam.updateProjectionMatrix(); R.followSun(this.rail.toWorld(a.s + 20, 0, 0));
    if (this.groundMesh) { const p = r.toWorld(a.s, 0, 0); this.groundMesh.position.set(p.x, 0, p.z); Phys.moveGround(p.x, p.z); }
  },
  views() {
    const W = innerWidth, H = innerHeight, out = []; const n = this.pilots.length;
    if (this.kind === 'rail' || n === 1) { R.cams[0].aspect = W / H; R.cams[0].updateProjectionMatrix(); out.push({ cam: R.cams[0], x: 0, y: 0, w: W, h: H, pi: this.kind === 'rail' ? -1 : 0 }); return out; }
    const rects = n === 2 ? [[0, 0, W / 2, H], [W / 2, 0, W / 2, H]] : [[0, 0, W / 2, H / 2], [W / 2, 0, W / 2, H / 2], [0, H / 2, W / 2, H / 2], [W / 2, H / 2, W / 2, H / 2]];
    for (let i = 0; i < n; i++) { while (R.cams.length <= i) R.cams.push(new THREE.PerspectiveCamera(70, 1, 0.5, 2600)); const [x, y, w, h] = rects[i], cam = R.cams[i]; cam.aspect = w / h; cam.updateProjectionMatrix(); out.push({ cam, x, y, w, h, pi: i }); }
    return out;
  },

  // ---- spawn helpers
  addObj(mesh) { R.world.add(mesh); return mesh; },
  popup(pos, text, color = '#ffe23a') { Hud.popup(pos, text, color); },

  // ---- pilot damage / death
  hurtPilot(p, dmg, kind = 'shot') {
    if (!p.alive || p.invuln > 0 || this.state === 'clear') return false; if (this.attract) { FX.burst(p.pos, 0xff8a3a, 6, 10, 0.4, 0.4); return false; }
    if (kind === 'shot' && p.rollT > 0) return false;
    p.hp -= dmg; p.invuln = kind === 'crash' ? 1.2 : 0.55; p.dmgTaken += dmg; this.shake = Math.max(this.shake, kind === 'crash' ? 1.2 : 0.55); this.flash = Math.max(this.flash, 0.5); Hud.hurt(p, dmg);
    FX.burst(p.pos, 0xffe23a, 10, 14, 0.5, 0.5); A.play('hurt'); Input.rumble(p.dev, 1, 0.8, 220);
    if (p.hp <= 0) { p.hp = 0; this.killPilot(p); } else if (p.hp < p.maxHp * 0.3 && !p.lowWarn) { p.lowWarn = true; A.play('warn'); }
    if (p.hp > p.maxHp * 0.35) p.lowWarn = false; return true;
  },
  killPilot(p) {
    p.alive = false; p.deaths++; p.locks = []; p.charge = 0; p.charging = false; A.loopStop('charge'); FX.explosion(p.pos, 2.4, { color: p.color.accent }); p.ship.visible = false; p.wlevel = Math.max(1, p.wlevel - 1);
    this.shake = 1.6; Input.rumble(p.dev, 1, 1, 500); Phys.detach(p); if (this.attract) { p.lives = 99; }
    p.lives--; if (p.lives < 0) { p.out = true; p.lives = 0; Hud.alert('PILOT ' + (p.slot + 1) + ' DOWN', '#ff5b6b', 2.5); if (this.pilots.every((q) => q.out)) this.gameOver(); }
    else p.respawnT = 2.6;
  },
  respawnPilot(p) {
    p.alive = true; p.hp = p.maxHp; p.invuln = 3.2; p.ship.visible = true; p.vx = p.vy = 0; p.hitstun = 0; p.rollT = 0; A.play('respawn'); p.lowWarn = false;
    if (this.kind === 'rail') { const al = this.pilots.find((q) => q.alive && q !== p); p.x = al ? clamp(al.x + 6, -12, 12) : 0; p.y = 8; p.pz = 0; }
    else { const al = this.pilots.find((q) => q.alive && q !== p); const base = al ? al.pos : V3(0, 0, 0); p.pos.copy(base).add(V3(rr(-30, 30), rr(-10, 10), rr(-30, 30))); p.speed = 55; }
    Phys.attach(p, { r: 1.5, group: GRP.PLAYER, pos: p.pos }); FX.burst(p.pos, p.color.accent, 24, 20, 0.7, 0.5);
  },
  gameOver() {
    if (this.over) return; this.over = true; this.state = 'over'; Music.stop(true); Music.sting('lose'); A.loopStop('charge');
    this.after(1.8, () => { if (this.active && this.over && !this.attract) UI.show('gameover'); });
  },
  addScore(p, pts, pos, label) { if (!p) return; p.score += pts; if (pos) this.popup(pos, label || ('+' + pts)); },

  // ---- pickups
  spawnPickup(kind, pos, o = {}) {
    const mesh = kind === 'ring' ? buildRing(false) : kind === 'gold' ? buildRing(true) : buildPickup(kind); R.world.add(mesh); mesh.position.copy(pos);
    const e = { kind: 'pickup', type: kind, pos: pos.clone(), mesh, es: o.es, ex: o.ex, ey: o.ey, t: rr(0, 6), dead: false };
    Phys.attach(e, { r: kind === 'ring' || kind === 'gold' ? 2.4 : 2.2, group: GRP.PICKUP, pos: e.pos }); this.pickups.push(e); return e;
  },
  collect(p, e) {
    if (e.dead) return; e.dead = true; const t = e.type;
    if (t === 'ring' || t === 'repair') { const heal = t === 'ring' ? 12 : 40; p.hp = Math.min(p.maxHp, p.hp + heal); A.play('ring'); this.popup(e.pos, t === 'ring' ? 'REPAIR' : 'BIG REPAIR', '#7dffb0'); p.ringChain = (p.ringChainT > 0 ? p.ringChain : 0) + 1; p.ringChainT = 2.2; p.rings++; if (p.ringChain === 3 && t === 'ring') { p.hp = Math.min(p.maxHp, p.hp + 25); this.popup(p.pos, '3-RING BONUS!', '#ffe23a'); A.play('item'); } }
    else if (t === 'gold') { p.maxHp += 25; p.hp = p.maxHp; A.play('gold'); this.popup(e.pos, 'MAX HEALTH UP!', '#ffe23a'); Hud.alert('MAX HEALTH +25', '#ffe23a', 1.8); this.addScore(p, 500); }
    else if (t === 'bomb') { p.bombs = Math.min(9, p.bombs + 1); A.play('item'); this.popup(e.pos, 'NOVA BOMB +1', '#ff9a8a'); }
    else if (t === 'laser') { p.wlevel = Math.min(3, p.wlevel + 1); A.play('item'); this.popup(e.pos, p.wlevel === 3 ? 'HYPER LASER!' : 'TWIN LASER!', '#8ae8ff'); Hud.alert(p.wlevel === 3 ? 'HYPER LASER' : 'TWIN LASER', '#8ae8ff', 1.8); }
    else if (t === 'life') { p.lives = Math.min(9, p.lives + 1); A.play('gold'); this.popup(e.pos, '1-UP!', '#ffe23a'); }
    FX.burst(e.pos, 0xffffff, 12, 14, 0.5, 0.4); Input.rumble(p.dev, 0.2, 0.6, 90); this.addScore(p, 50);
  },
  removePickup(e) { R.world.remove(e.mesh); Phys.detach(e); e.dead = true; },

  // ---- stage completion
  stageClear() {
    if (this.state === 'clear') return; this.state = 'clear'; this.stateT = 0; Music.stop(true); Music.sting('win'); A.play('stage');
    Comms.say(this.kind === 'rail' ? 'clear1' : 'clear2', 2.2); Hud.banner('MISSION COMPLETE', this.st.name);
    for (const p of this.pilots) if (p.alive) p.invuln = 99;
    this.after(this.attract ? 5.2 : 6.5, () => { if (this.active && this.state === 'clear') this.finishStage(); });
  },
  finishStage() {
    const st = this.st, total = this.kind === 'rail' ? st.totalEnemies : (st.quota + 8), kills = this.stats.kills, gold = kills >= total * st.medalAt;
    this.results = { stage: st, kills, total, time: this.stats.time, gold, pipSaved: this.stats.pipSaved, pilots: this.pilots.map((p) => ({ slot: p.slot, score: p.score, kills: p.stageKills || 0, lives: p.lives, hp: p.hp, deaths: p.deaths })), last: this.stageIdx >= this.cfg.stageIds.length - 1 };
    this.runStats.push(this.results); if (this.attract) { this.nextStage(); return; }
    if (gold) { const sv = Save.get(); sv.medals = sv.medals || {}; sv.medals[st.id] = true; Save.set(sv); }
    this.paused = true; UI.show('results');
  },
  nextStage() {
    this.paused = false;
    if (this.stageIdx >= this.cfg.stageIds.length - 1) { if (this.attract) { this.stageIdx = 0; this.loadStage(this.cfg.stageIds[0]); return; } this.paused = true; UI.show('finale'); return; }
    this.stageIdx++; this.loadStage(this.cfg.stageIds[this.stageIdx]);
  },
  retryStage() { this.paused = false; this.over = false; for (const p of this.pilots) { p.lives = 3; p.out = false; p.score = p.stageScore0 ?? 0; p.alive = true; } this.loadStage(this.st.id); },
  end() { this.timers = []; this.active = false; this.paused = false; A.loopStop('engine'); A.loopStop('charge'); Phys.clearDebris(); FX.reset(); Hud.reset(); Comms.reset(); R.clearWorld(); for (const p of this.pilots) { p.ship = null; } this.pilots = []; this.enemies = []; this.shots = []; },
};
