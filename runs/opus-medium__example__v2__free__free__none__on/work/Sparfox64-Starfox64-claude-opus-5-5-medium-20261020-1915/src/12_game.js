// ===== 12_game.js — game state machine, checkpoints, cutscenes, camera, attract-mode AI =====
const ZERO_CTL = { mx: 0, my: 0, fire: false, firePressed: false, fireReleased: false, bombPressed: false, boost: false, brake: false, bankL: false, bankR: false, rollL: false, rollR: false, loop: false };
const SKY = {
  sea: { top: 0x2f7fe0, hor: 0xbfe7ff, fog: 0xa8dcff },
  city: { top: 0x4a7fd0, hor: 0xffe2b8, fog: 0xf0d8c0 },
  canyon: { top: 0x6a4a9a, hor: 0xffb070, fog: 0xe8a070 },
  arena: { top: 0x2a1a48, hor: 0xd86a70, fog: 0x8a4a68 },
};
const Game = {
  state: 'boot', mode: 'rail', d: 0, speed: BASE_SPEED, route: 'alpha', t: 0, dt: 1 / 60, timeScale: 1, speedOverride: null,
  hits: 0, score: 0, stats: {}, evI: 0, checkpoint: null, attract: false, missionTime: 0, hintsShown: new Set(), cut: null, deathT: 0,
  camPos: V3(0, 40, 40), camLook: V3(), fov: 64, arTimers: [], attractSeg: 0, attractT: 0, cpTaken: false,
  best: (() => { try { return JSON.parse(localStorage.getItem('sparfox64.best') || '{"hits":0,"score":0}'); } catch (e) { return { hits: 0, score: 0 }; } })(),
  _skyA: new THREE.Color(), _skyB: new THREE.Color(), _skyC: new THREE.Color(),
  resetStats() { this.stats = { shots: 0, landed: 0, kills: 0, rings: 0, rescues: 0, deflects: 0, damage: 0 }; },
  // ---------- flow ----------
  clearWorld() {
    Enemies.clear(); Projectiles.clear(); Items.clear(); FX.clear(); Comms.clear(); HUD.clearAll();
    if (Carrier.active) Carrier.end(); if (Boss.active) Boss.end();
    this.timeScale = 1; this.speedOverride = null; this.cut = null; this.arTimers = [];
  },
  toTitle(first = false) {
    this.clearWorld(); UI.closeAll();
    this.attract = false; document.getElementById('demoTag').style.display = 'none';
    this.state = 'title'; this.mode = 'rail'; this.route = 'alpha'; this.d = 120; this.speed = 40;
    Player.resetFull(); Player.cheat = true; Player.invuln = 0; Wingmen.reset(null);
    HUD.visible = false; Audio_.playSong('title'); Audio_.setEngine(0, 0);
    UI.open(first ? Screens.press() : Screens.main(), true);
    Input.idle = 0;
    this.updateTouchGate();
  },
  newGame() {
    this.attract = false; Player.cheat = false; document.getElementById('demoTag').style.display = 'none';
    Player.resetFull(); this.resetStats(); this.missionTime = 0; Comms.used.clear(); this.hintsShown.clear(); HUD.usedActions.clear();
    this.checkpoint = { d: 0, label: 'Mission Start', hits: 0, score: 0, route: 'alpha', mode: 'rail', wing: null, bombs: 3, laser: 0, stats: { ...this.stats } };
    this.beginAt(this.checkpoint, true);
  },
  startFromCheckpoint() { if (!this.checkpoint) return this.newGame(); this.beginAt(this.checkpoint, false); },
  beginAt(cp, intro) {
    this.clearWorld(); UI.closeAll();
    this.attract = false; Player.cheat = false; document.getElementById('demoTag').style.display = 'none';
    this.mode = 'rail'; this.route = cp.route; this.d = cp.d; this.speed = BASE_SPEED; this.hits = cp.hits; this.score = cp.score;
    this.stats = { ...cp.stats }; this.cpTaken = cp.d >= L.CHECK;
    Wingmen.reset(cp.wing); Player.resetLife(); Player.bombs = Math.max(Player.bombs, cp.bombs); Player.laser = cp.laser;
    if (cp.d <= L.GATES[0]) World.resetGates(-1);
    this.evI = LEVEL.findIndex(e => e.d >= cp.d); if (this.evI < 0) this.evI = LEVEL.length;
    HUD.visible = true; Audio_.unlock(); Audio_.startEngine();
    this.state = 'playing';
    if (cp.mode === 'allrange') { this.enterAllRange(true); return; }
    Audio_.playSong(cp.route === 'beta' && cp.d >= L.BRANCH ? 'canyon' : 'stage');
    Rail.frame(this.d, this.route); this.camPos.copy(Rail.pos).addScaledVector(Rail.fwd, -30).add(V3(0, 8, 0)); this.camLook.copy(Rail.pos).addScaledVector(Rail.fwd, 40);
    if (intro) this.startIntro();
    else HUD.banner(cp.label.toUpperCase(), `${Player.lives} ${Player.lives === 1 ? 'life' : 'lives'} remaining`, 2);
  },
  saveCheckpoint(d, label, mode = 'rail') {
    this.checkpoint = { d, label, hits: this.hits, score: this.score, route: this.route, mode, wing: Wingmen.snapshot(), bombs: Player.bombs, laser: Player.laser, stats: { ...this.stats } };
  },
  pause() { if (this.state !== 'playing' || this.attract) return; this.state = 'paused'; Audio_.play('pause'); Audio_.setEngine(0, 0); UI.open(Screens.pause(), true); },
  resume() { UI.closeAll(); this.state = 'playing'; this.lastResume = performance.now(); Audio_.play('pause'); },
  // ---------- scoring ----------
  addHits(n, pos, label) {
    if (this.state === 'title') return;
    this.hits += n; this.score += Math.round(n * 100 * (1 + Settings.difficulty * 0.5));
    if (pos) HUD.popup(label ? `${label} +${n}` : `+${n}`, pos, label ? '#7dffb0' : '#ffd23f');
  },
  hint(key) {
    if (!Settings.hints || this.attract || this.state === 'title' || this.hintsShown.has(key)) return;
    this.hintsShown.add(key); HUD.hint(HINTS[key](), 6);
  },
  // ---------- events ----------
  decideRoute() {
    const all = World.gates.every(g => g.passed);
    this.route = this.attract ? (this.attractRoute || 'alpha') : (all ? 'beta' : 'alpha');
    if (this.route === 'beta') HUD.banner('HIDDEN ROUTE', 'Rustvein Canyon', 2.5);
    else if (!this.attract) { const n = World.gates.filter(g => g.passed).length; HUD.toast(`${n}/5 gates — staying on the city route`); }
  },
  enterAllRange(fromCheckpoint = false) {
    Enemies.clear(); Projectiles.clear(); Items.clear();
    if (Carrier.active) Carrier.end();
    this.mode = 'allrange';
    if (fromCheckpoint) { Player.pos.set(L.ARENA.x, 60, L.ARENA.z + 560); }
    Player.yaw = 0; Player.pitch = 0; Player.arSpeed = AR_SPEED; Player.loopT = -1;
    for (const w of Wingmen.list) { w.pos.copy(Player.pos).add(V3(w.off[0], w.off[1], -w.off[2])); w.arDir.set(0, 0, -1); w.state = w.active ? 'formation' : 'gone'; }
    Boss.start();
    if (!this.attract) this.saveCheckpoint(L.ALLRANGE, 'Boss Arena', 'allrange');
    this.cpTaken = true;
    Audio_.playSong('boss');
    const start = this.t;
    this.state = this.attract ? 'attract' : 'cutscene';
    Comms.say('kraag', 'So, the Sparfox brats crawl into my garden. Behold the Basalt Leviathan!', 4, null, true);
    Comms.say('hollis', 'That\'s their command fortress. Team — all-range attack, take it down!', 3.4);
    this.cut = {
      dur: this.attract ? 3 : 5.2, t: 0,
      cam: dt => { const bp = Boss.group.position; _v1.copy(Player.pos).add(_v2.set(30, 14, 30)); this.camPos.lerp(_v1, clamp(dt * 2, 0, 1)); this.camLook.lerp(bp, clamp(dt * 3, 0, 1)); },
      end: () => { if (!this.attract) this.state = 'playing'; HUD.banner('ALL-RANGE MODE', 'Destroy the Basalt Leviathan', 2.4); this.hint('allrange'); },
    };
    this.arTimers = [{ t: start + 28, fn: () => Wingmen.chase('wren') }, { t: start + 55, fn: () => Wingmen.chase('tusk') }, { t: start + 85, fn: () => Wingmen.chase('moss') }];
  },
  startIntro() {
    this.state = 'cutscene';
    HUD.banner('VERDANT REACH', 'Mission 1 · Liberate the Reach', 3.6);
    this.cut = {
      dur: 5.5, t: 0, skippable: true,
      cam: (dt, k) => {
        Rail.frame(this.d, this.route);
        const a = lerp(-0.4, Math.PI, smooth(0, 1, k));
        _v1.copy(Player.pos).addScaledVector(Rail.fwd, -Math.cos(a) * 30).addScaledVector(Rail.right, Math.sin(a) * 26).addScaledVector(Rail.up, 6 + Math.sin(k * Math.PI) * 6);
        this.camPos.lerp(_v1, k > 0.85 ? clamp(dt * 6, 0, 1) : 1); this.camLook.copy(Player.pos).addScaledVector(Rail.fwd, 10 + k * 30);
      },
      end: () => { this.state = 'playing'; },
    };
  },
  onPlayerDeath() {
    if (this.attract) return;
    this.state = 'dying'; this.deathT = 0;
    Comms.say(pick(['tusk', 'wren', 'moss']), pick(['VALE!! Nooo!', 'Vale\'s down! Vale!', 'We lost Vale!']), 2.4, null, true);
  },
  afterDeath() {
    if (Player.lives > 0) { Player.lives--; this.beginAt(this.checkpoint, false); }
    else { this.state = 'gameover'; Audio_.playSong('gameover'); Audio_.setEngine(0, 0); HUD.visible = false; UI.open(Screens.gameover(), true); }
  },
  onBossDefeated() {
    if (this.attract) { this.nextAttract(); return; }
    this.state = 'outro'; Audio_.playSong('win');
    Comms.say('hollis', 'Leviathan destroyed! Outstanding work, Team Sparfox. Verdant Reach is free.', 3.6, null, true);
    Comms.say('wren', 'Not bad, Vale. Not bad at all.', 2.6);
    Comms.say('tusk', 'Regroup on me. Let\'s head home.', 2.6);
    this.cut = {
      dur: 9, t: 0, skippable: true,
      cam: (dt, k) => { const a = k * 2.4; _v1.copy(Player.pos).add(_v2.set(Math.cos(a) * 40, 10 - k * 6, Math.sin(a) * 40)); this.camPos.lerp(_v1, clamp(dt * 2.5, 0, 1)); this.camLook.lerp(Player.pos, clamp(dt * 6, 0, 1)); },
      end: () => this.showResults(),
    };
  },
  showResults() {
    this.state = 'results'; HUD.visible = false; Audio_.setEngine(0, 0);
    const alive = Wingmen.list.filter(w => w.active).length;
    const medal = this.hits >= 170 && alive === 3;
    const newBest = this.hits > this.best.hits;
    if (newBest || this.score > this.best.score) { this.best = { hits: Math.max(this.hits, this.best.hits), score: Math.max(this.score, this.best.score) }; try { localStorage.setItem('sparfox64.best', JSON.stringify(this.best)); } catch (e) { /* storage unavailable */ } }
    const m = Math.floor(this.missionTime / 60), s = Math.floor(this.missionTime % 60);
    this.checkpoint = null;
    UI.open(Screens.results({
      hits: this.hits, acc: this.stats.shots ? Math.round(100 * this.stats.landed / this.stats.shots) : 0, rings: this.stats.rings, rescues: this.stats.rescues,
      team: alive === 3 ? 'All wingmen safe' : `${alive}/3 wingmen`, time: `${m}:${String(s).padStart(2, '0')}`, score: this.score, medal,
      medalNeed: this.hits < 170 ? `${170 - this.hits} more hits needed` : 'keep all wingmen flying', newBest,
      route: this.route === 'beta' ? 'the hidden Rustvein Canyon' : 'the Port Halcyon city core',
    }), true);
  },
  // ---------- attract mode ----------
  startAttract() {
    this.attract = true; this.attractSeg = 0; this.resetStats();
    document.getElementById('demoTag').style.display = 'block';
    UI.closeAll(); this.runAttractSegment();
  },
  ATTRACT: [{ d: 0, dur: 32 }, { d: 1180, dur: 26 }, { d: 2840, dur: 34 }, { d: 4000, dur: 30, route: 'beta' }, { d: 5850, dur: 30, route: 'beta' }, { d: 5420, dur: 26, route: 'alpha' }, { d: L.ALLRANGE, dur: 50, ar: true }],
  runAttractSegment() {
    const seg = this.ATTRACT[this.attractSeg % this.ATTRACT.length];
    this.attractRoute = seg.route || 'alpha';
    this.clearWorld();
    Player.resetFull(); Player.cheat = true; Player.laser = 2; Player.bombs = 9;
    this.mode = 'rail'; this.route = seg.d >= L.BRANCH ? this.attractRoute : 'alpha'; this.d = seg.d; this.speed = BASE_SPEED; this.hits = 0; this.score = 0;
    Wingmen.reset(null); Player.resetLife(); Player.invuln = 0;
    World.resetGates(-1);
    this.evI = LEVEL.findIndex(e => e.d >= seg.d); if (this.evI < 0) this.evI = LEVEL.length;
    HUD.visible = true; this.state = 'attract'; this.attractT = 0; this.attractDur = seg.dur;
    Audio_.playSong(seg.ar ? 'boss' : this.route === 'beta' ? 'canyon' : 'stage');
    Rail.frame(this.d, this.route); this.camPos.copy(Rail.pos).addScaledVector(Rail.fwd, -30); this.camLook.copy(Rail.pos);
    if (seg.ar) { Player.pos.set(L.ARENA.x, 60, L.ARENA.z + 560); this.enterAllRange(true); }
  },
  nextAttract() { this.attractSeg++; this.fade(() => this.runAttractSegment()); },
  fade(fn) { const f = document.getElementById('fade'); f.classList.add('on'); setTimeout(() => { fn(); f.classList.remove('on'); }, 520); },
  // ---------- per-frame ----------
  readControls() {
    return { mx: Input.mx, my: Input.my, fire: Input.held('fire'), firePressed: Input.pressed('fire'), fireReleased: Input.released('fire'), bombPressed: Input.pressed('bomb'), boost: Input.held('boost'), brake: Input.held('brake'), bankL: Input.held('bankL'), bankR: Input.held('bankR'), rollL: Input.doubleTap.bankL, rollR: Input.doubleTap.bankR, loop: Input.pressed('loop') };
  },
  frame(dt) {
    const sdt = dt * this.timeScale; this.dt = Math.max(sdt, 1e-4); this.t += sdt;
    switch (this.state) {
      case 'title': this.titleUpdate(sdt); if (Input.idle > 10 && UI.top && !UI.top.noAttract && (UI.stack.length === 1) && !this.touchGateShown) this.startAttract(); break;
      case 'attract':
        if (Input.anyNew) { this.toTitle(); break; }
        this.attractT += dt;
        if (this.attractT > this.attractDur && !document.getElementById('fade').classList.contains('on')) { this.attractT = -99; this.nextAttract(); }
        this.sim(sdt, AI.control(sdt));
        break;
      case 'playing':
        if (Input.pressed('pause') && performance.now() - (this.lastResume || 0) > 200) { this.pause(); break; }
        if (Input.pressed('skip')) Comms.skip();
        this.missionTime += dt;
        this.sim(sdt, this.readControls());
        break;
      case 'cutscene':
        if (this.cut && this.cut.skippable && this.cut.t > 0.5 && (Input.pressed('confirm') || Input.pressed('pause'))) this.cut.t = this.cut.dur;
        this.sim(sdt, ZERO_CTL);
        break;
      case 'dying':
        this.deathT += dt; this.speed = damp(this.speed, 15, 2, dt);
        this.sim(sdt, ZERO_CTL);
        if (this.deathT > 3) this.fade(() => this.afterDeath()), this.state = 'fading';
        break;
      case 'outro':
        if (this.cut && this.cut.t > 1 && (Input.pressed('confirm') || Input.pressed('pause'))) this.cut.t = this.cut.dur;
        Player.pos.addScaledVector(Player.fwd, 70 * sdt).add(_v1.set(0, 20 * sdt * (this.cut ? this.cut.t / 3 : 1), 0)); Player.mesh.position.copy(Player.pos);
        Wingmen.update(sdt); FX.update(sdt); Physics.step(sdt); World.update(sdt, this.t); this.updateCut(sdt); this.applyCamera(sdt);
        break;
      default: break;
    }
    if (this.state !== 'paused' && this.state !== 'gameover') Comms.update(dt);
    if (this.state === 'paused' || this.state === 'gameover' || this.state === 'results' || this.state === 'fading') this.applyCamera(0);
    Gfx.update(sdt, Player.pos);
    Audio_.setEngine(['playing', 'attract', 'cutscene', 'dying'].includes(this.state) && !Player.dead ? 1 : 0, Game.mode === 'allrange' ? (Player.arSpeed - 22) / 86 : (this.speed - 22) / 86);
    this.updateSky(dt);
  },
  titleUpdate(dt) {
    this.d += dt * 40; if (this.d > 1350) this.d = 120;
    const P = Player;
    P.ox = Math.sin(this.t * 0.4) * 10; P.oy = 6 + Math.sin(this.t * 0.6) * 3;
    Rail.frame(this.d, 'alpha');
    P.pos.copy(Rail.pos).addScaledVector(Rail.right, P.ox).addScaledVector(Rail.up, P.oy);
    _m1.makeBasis(Rail.right, Rail.up, _v1.copy(Rail.fwd).negate()); P.quat.setFromRotationMatrix(_m1);
    _e1.set(0, 0, Math.sin(this.t * 0.4 + 1) * 0.3, 'YXZ'); P.quat.multiply(_q1.setFromEuler(_e1));
    P.mesh.position.copy(P.pos); P.mesh.quaternion.copy(P.quat); P.mesh.visible = true;
    this.speed = 40; Wingmen.update(dt); FX.update(dt); World.update(dt, this.t);
    const a = this.t * 0.12;
    _v1.copy(P.pos).addScaledVector(Rail.fwd, Math.cos(a) * 34 + 10).addScaledVector(Rail.right, Math.sin(a) * 34).addScaledVector(Rail.up, 10 + Math.sin(a * 2) * 5);
    this.camPos.lerp(_v1, clamp(dt * 2, 0, 1)); this.camLook.lerp(_v2.copy(P.pos).addScaledVector(Rail.fwd, 12), clamp(dt * 4, 0, 1));
    Gfx.camera.position.copy(this.camPos); Gfx.camera.up.set(0, 1, 0); Gfx.camera.lookAt(this.camLook);
    Gfx.camera.fov = 55; Gfx.camera.updateProjectionMatrix();
  },
  sim(dt, ctl) {
    const P = Player;
    if (this.mode === 'rail') this.d += this.speed * dt;
    // timeline events
    while (this.evI < LEVEL.length && LEVEL[this.evI].d <= this.d && this.mode === 'rail') { const ev = LEVEL[this.evI++]; if (!ev.route || ev.route === this.route) ev.run(); }
    for (const tm of this.arTimers) if (!tm.done && this.t >= tm.t) { tm.done = true; tm.fn(); }
    P.update(dt, ctl);
    if (this.mode === 'rail') this.checkGates();
    Carrier.update(dt); Boss.update(dt);
    Enemies.update(dt); Wingmen.update(dt);
    Physics.step(dt);
    Projectiles.update(dt); Items.update(dt);
    if (!P.dead && !P.looping) {
      Physics.overlapBall(P.pos, 2.0, Physics.G_STATIC | Physics.G_ENEMY, (o, c) => {
        if (o.kind !== 'static') return true;
        const t = c.translation(); _v3.set(t.x - P.pos.x, t.y - P.pos.y, t.z - P.pos.z);
        const side = _v3.dot(_v2.set(1, 0, 0).applyQuaternion(P.quat)) > 0 ? 'R' : 'L';
        P.crash(12, side);
        if (this.mode === 'rail') { P.ox += side === 'R' ? -4 : 4; P.vx = side === 'R' ? -30 : 30; }
        else { P.pos.addScaledVector(P.fwd, -4); P.yaw += side === 'R' ? 0.5 : -0.5; }
        return false;
      });
    }
    FX.update(dt); World.update(dt, this.t);
    this.updateCut(dt);
    this.applyCamera(dt);
  },
  checkGates() {
    for (const g of World.gates) {
      if (g.passed || g.missed || this.d < g.d) continue;
      if (Player.pos.distanceTo(g.mesh.position) < 11.5) { g.passed = true; g.mesh.userData.glow.material.color.setRGB(0.6, 4, 1.2); Audio_.play('gate'); const n = World.gates.filter(x => x.passed).length; HUD.toast(n === 5 ? 'ALL GATES CLEARED!' : `Gate ${n}/5`); }
      else { g.missed = true; g.mesh.userData.glow.material.color.setRGB(0.6, 0.6, 0.8); if (!this.attract) HUD.toast('Gate missed'); }
    }
    if (!this.cpTaken && this.d >= L.CHECK) {
      this.cpTaken = true;
      const through = Player.pos.distanceTo(World.checkpointRing.position) < 18;
      if (through) { Player.shield = Player.maxShield; Audio_.play('checkpoint'); }
      if (!this.attract) this.saveCheckpoint(L.CHECK, 'Port Halcyon Checkpoint');
      HUD.banner('CHECKPOINT', through ? 'Shield restored' : 'Progress saved', 2);
    }
  },
  updateCut(dt) {
    if (!this.cut) return;
    this.cut.t += dt;
    if (this.cut.t >= this.cut.dur) { const c = this.cut; this.cut = null; c.end(); }
  },
  applyCamera(dt) {
    const cam = Gfx.camera, P = Player;
    let fovT = 64;
    if (this.cut) { this.cut.cam(dt, clamp(this.cut.t / this.cut.dur, 0, 1)); cam.up.set(0, 1, 0); }
    else if (dt > 0 && this.mode === 'rail') {
      Rail.frame(this.d, this.route);
      _v1.copy(Rail.pos).addScaledVector(Rail.right, P.ox * 0.72).addScaledVector(Rail.up, P.oy * 0.62 + 7).addScaledVector(Rail.fwd, -26);
      if (P.looping) _v2.copy(P.pos); else _v2.copy(Rail.pos).addScaledVector(Rail.right, P.ox * 0.85).addScaledVector(Rail.up, P.oy * 0.72 + 2).addScaledVector(Rail.fwd, 50);
      this.camPos.x = damp(this.camPos.x, _v1.x, 7, dt); this.camPos.y = damp(this.camPos.y, _v1.y, 7, dt); this.camPos.z = damp(this.camPos.z, _v1.z, 7, dt);
      this.camLook.lerp(_v2, clamp(dt * (P.looping ? 4 : 10), 0, 1));
      cam.up.copy(Rail.up);
      fovT = P.boosting ? 78 : P.braking ? 56 : 64;
    } else if (dt > 0 && this.mode === 'allrange') {
      const lam = P.looping ? 1.8 : 4.5;
      _v1.copy(P.pos).addScaledVector(P.fwd, -24).add(_v2.set(0, 7, 0));
      if (!P.looping) { this.camPos.x = damp(this.camPos.x, _v1.x, lam, dt); this.camPos.y = damp(this.camPos.y, _v1.y, lam, dt); this.camPos.z = damp(this.camPos.z, _v1.z, lam, dt); }
      else this.camPos.lerp(_v1, clamp(dt * 0.8, 0, 1));
      this.camLook.lerp(_v2.copy(P.pos).addScaledVector(P.fwd, P.looping ? 0 : 22), clamp(dt * 8, 0, 1));
      cam.up.set(0, 1, 0);
      fovT = P.boosting ? 78 : P.braking ? 56 : 66;
    }
    if (this.state === 'dying') this.camLook.lerp(P.pos, clamp(dt * 2, 0, 1));
    cam.position.copy(this.camPos);
    cam.lookAt(this.camLook);
    if (this.mode === 'rail' && !this.cut) cam.rotateZ(-P.bank * 0.07 - P.vx / 36 * 0.05);
    Gfx.applyShake(this.t);
    this.fov = damp(this.fov, fovT, 4, Math.max(dt, 0.0001));
    cam.fov = this.fov; cam.updateProjectionMatrix();
  },
  updateSky(dt) {
    let a = SKY.sea, b = SKY.sea, k = 0;
    const d = this.d, beta = this.route === 'beta';
    if (this.mode === 'allrange') { a = b = SKY.arena; }
    else if (d < 3300) { a = b = SKY.sea; }
    else if (d < 4200) { a = SKY.sea; b = SKY.city; k = smooth(3300, 4200, d); }
    else if (d < 8300) { a = SKY.city; b = beta ? SKY.canyon : SKY.city; k = beta ? smooth(5400, 5900, d) : 0; }
    else { a = beta ? SKY.canyon : SKY.city; b = SKY.arena; k = smooth(8300, 8700, d); }
    const mixc = (x, y, out) => out.set(x).lerp(this._skyC.set(y), k);
    mixc(a.top, b.top, this._skyA); const top = this._skyA.getHex();
    mixc(a.hor, b.hor, this._skyA); const hor = this._skyA.getHex();
    mixc(a.fog, b.fog, this._skyA); const fog = this._skyA.getHex();
    Gfx.setSkyColors(top, hor, fog, this.mode === 'allrange' ? 400 : 320, this.mode === 'allrange' ? 1900 : 1500);
    Gfx.hemi.intensity = lerp(1.1, 0.8, this.mode === 'allrange' ? 1 : 0);
  },
  touchGateShown: false, kbSeen: false,
  updateTouchGate() {
    const coarseOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    const show = coarseOnly && !Input.getPad() && !this.kbSeen && !this.gateSuppressed;
    this.touchGateShown = show;
    document.getElementById('touchGate').style.display = show ? 'flex' : 'none';
  },
};
addEventListener('keydown', () => { if (!Game.kbSeen) { Game.kbSeen = true; Game.updateTouchGate(); } });

// ---------- attract-mode pilot (cheats freely: invincible, infinite boost/bombs, wide aim assist) ----------
const AI = {
  t: 0, fireCycle: 0, bombCD: 4, rollCD: 0, loopCD: 0, prevFire: false, boostT: 0,
  control(dt) {
    this.t += dt; this.fireCycle += dt; this.bombCD -= dt; this.rollCD -= dt; this.loopCD -= dt;
    const P = Player, c = { ...ZERO_CTL };
    let tgt = null, best = 1e9;
    for (const e of Enemies.list) {
      if (!e.alive || !e.lockable) continue;
      _v1.copy(e.pos).sub(P.pos); const dist = _v1.length();
      const ahead = _v1.dot(P.fwd);
      if (Game.mode === 'rail' && (ahead < 25 || ahead > 380)) continue;
      const score = dist - (e.boss ? 200 : 0) - (e.type === 'hauler' ? 150 : 0);
      if (score < best) { best = score; tgt = e; }
    }
    let goal = null;
    if (Game.mode === 'rail') {
      const gate = World.gates.find(g => !g.passed && !g.missed && g.d > Game.d && g.d - Game.d < 260);
      const item = Items.list.find(i => { const r = -i.pos.z - Game.d; return r > 20 && r < 200; });
      goal = gate ? gate.mesh.position : item ? item.pos : tgt ? tgt.pos : null;
      Rail.frame(Game.d, Game.route);
      let dx = 0, dy = 10;
      if (goal) { _v1.copy(goal).sub(Rail.pos); dx = _v1.dot(Rail.right); dy = _v1.dot(Rail.up); if (!gate && !item) dy += 2; }
      else { dx = Math.sin(this.t * 0.5) * 20; dy = 10 + Math.sin(this.t * 0.7) * 8; }
      c.mx = clamp((dx - P.ox) / 10, -1, 1);
      const climb = clamp((dy - P.oy) / 10, -1, 1); c.my = Settings.pilotPitch ? climb : -climb;
      if (HUD.behindWarn > 0 && this.loopCD <= 0) { c.loop = true; this.loopCD = 6; }
      this.boostT -= dt; if (!tgt && this.boostT < 0 && Math.random() < dt * 0.3) this.boostT = 1.5;
      c.boost = this.boostT > 0;
    } else {
      goal = tgt ? tgt.pos : Boss.active ? Boss.group.position : L.ARENA;
      _v1.copy(goal).sub(P.pos);
      const dist = _v1.length();
      const desiredYaw = Math.atan2(-_v1.x, -_v1.z);
      let dyaw = angleWrap(desiredYaw - P.yaw);
      if (dist < 70) dyaw = angleWrap(dyaw + Math.PI * 0.6);
      c.mx = clamp(-dyaw * 1.6, -1, 1);
      const desiredPitch = Math.atan2(_v1.y + (dist < 70 ? 40 : 0), Math.hypot(_v1.x, _v1.z));
      const climb = clamp((desiredPitch - P.pitch) * 2.2, -1, 1); c.my = Settings.pilotPitch ? climb : -climb;
      if (Math.abs(dyaw) > 2.4 && this.loopCD <= 0) { c.loop = true; this.loopCD = 5; }
    }
    // firing pattern: laser bursts, then a charged lock-on shot
    const cyc = this.fireCycle % 3.2;
    if (cyc < 1.8) { const tap = Math.floor(cyc / 0.11) % 2 === 0; c.fire = tap; c.firePressed = tap && !this.prevFire; c.fireReleased = !tap && this.prevFire; }
    else { c.fire = cyc < 3.1; c.firePressed = !this.prevFire && c.fire; c.fireReleased = this.prevFire && !c.fire; }
    this.prevFire = c.fire;
    // roll when shots are incoming
    if (this.rollCD <= 0) for (const p of Projectiles.list) if (p.kind === 'ebullet' && !p.deflected && p.pos.distanceTo(P.pos) < 35) { c.rollL = Math.random() < 0.5; c.rollR = !c.rollL; this.rollCD = 1.4; break; }
    if (this.bombCD <= 0 && Enemies.list.filter(e => e.alive && e.pos.distanceTo(P.pos) < 220).length >= 5) { c.bombPressed = true; this.bombCD = 9; }
    return c;
  },
};
