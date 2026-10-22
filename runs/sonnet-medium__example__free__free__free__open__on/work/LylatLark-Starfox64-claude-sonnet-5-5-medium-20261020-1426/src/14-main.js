'use strict';
/* ===== Main: boot, loop, title scene, attract mode, flow between screens ===== */
const Title = {
  ships: [], t: 0, tz: 0, on: false,
  enter() {
    if (this.on) return; this.on = true; World.setEnv('canyon'); this.t = 0; this.tz = 0;
    for (const [style, ox, oy, oz] of [['lark', 0, 0, 0], ['kestrel', -13, 2, 14], ['bramble', 13, 3, 20], ['tink', 0, -4, 32]]) { const m = buildShip(style); World.scene.add(m); this.ships.push({ m, ox, oy, oz, ph: rand(0, 6) }); }
    World.camera.fov = 52; World.camera.updateProjectionMatrix();
  },
  exit() { for (const s of this.ships) World.scene.remove(s.m); this.ships = []; this.on = false; FX.clear(); },
  update(dt) {
    this.t += dt; this.tz -= dt * 46; const z = this.tz;
    this.ships.forEach((s, i) => {
      s.m.position.set(s.ox + Math.sin(this.t * 0.6 + s.ph) * 1.5, s.oy + 3 + Math.sin(this.t * 0.9 + s.ph) * 1.2, z + s.oz);
      s.m.rotation.z = Math.cos(this.t * 0.6 + s.ph) * 0.25; s.m.rotation.x = Math.sin(this.t * 0.9 + s.ph) * 0.05;
      if (i === 0 && Math.sin(this.t * 0.4) > 0.97 && !s.rolling) { s.rolling = 0.0001; }
      if (s.rolling) { s.rolling += dt; s.m.userData.roll.rotation.z = -TAU * Ease.inOut(Math.min(1, s.rolling / 0.8)); if (s.rolling > 0.8) { s.rolling = 0; s.m.userData.roll.rotation.z = 0; } }
      if (Math.random() < dt * 25) for (const sd of [-1, 1]) FX.spawn(new THREE.Vector3(s.m.position.x + 2.7 * sd, s.m.position.y - 0.3, s.m.position.z + 2.2), { v: new THREE.Vector3(0, 0, 14), color: 0x66ccff, size: 1.3, life: 0.35, grow: -0.5, op: 0.7 });
    });
    const a = this.t * 0.12, lead = this.ships[0].m.position, cam = World.camera;
    cam.position.set(lead.x + Math.sin(a) * 26 - 8, lead.y + 5 + Math.sin(a * 1.7) * 3, lead.z + 8 + Math.cos(a) * 22);
    cam.lookAt(lead.x + 2, lead.y + 1, lead.z - 6); cam.translateX(-7); cam.updateMatrixWorld(true);
    FX.update(dt); World.update(dt, new THREE.Vector3(lead.x, lead.y, lead.z), 46, this.t);
  },
};

const Main = {
  mode: 'boot', idleT: 0, last: 0, campaign: false, attractIdx: 0, touchChk: 0, hudShown: false,
  init() {
    Input.init();
    World.init($('#gl'));
    Game.init(); HUD.init($('#hud')); UI.init($('#ui'));
    HUD.root.style.setProperty('--hs', Settings.hudScale);
    addEventListener('keydown', (e) => this.debugKey(e));
    addEventListener('mousemove', (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) Input.activity = true; });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.mode === 'play' && !Game.paused && ['play', 'intro'].includes(Game.state)) this.pause(); });
    this.toTitle(true);
    requestAnimationFrame((t) => { this.last = t; this.loop(t); });
  },
  debugKey(e) {
    if (e.code === 'F1') { Game.debug = !Game.debug; e.preventDefault(); }
    if (!Game.debug || !Game.P) return;
    if (e.code === 'BracketRight') Game.progress += 300;
    if (e.code === 'KeyG') Game.god = !Game.god;
    if (e.code === 'KeyB') Game.P.bombs = 5;
  },
  touchOnly() {
    const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
    return ((coarse && !fine) || (Input.touchSeen && !fine)) && !Input.padConnected && !Input.keyboardUsed;
  },
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min((now - this.last) / 1000, 0.1); this.last = now;
    Input.poll(dt);
    if (Input.activity) Audio.ensure();
    this.touchChk -= dt;
    if (this.touchChk <= 0) { this.touchChk = 0.5; this.checkTouch(); }
    if (this.mode === 'title') {
      Title.update(dt);
      const navAny = Object.values(Input.nav).some(Boolean);
      if (Input.activity || navAny) this.idleT = 0; else this.idleT += dt;
      if (this.idleT > 10 && !this.touchGate) this.startAttract();
    } else if (this.mode === 'attract') {
      Game.update(dt);
      if (Game.time > 270 && Game.state === 'play') this.nextAttract();
      if (Input.activity) this.endAttract();
    } else if (this.mode === 'play') {
      if (Input.pressed.pause && !Game.paused && ['play', 'intro', 'outro'].includes(Game.state)) this.pause();
      else if (Input.pressed.pause && Game.paused && UI.cur && UI.cur.id === 'pause') this.resume();
      if (!Game.paused) Game.update(dt);
    }
    UI.update(dt);
    const locked = !Audio.ctx || Audio.ctx.state !== 'running';
    const showHint = locked && this.mode === 'title' && !this.touchGate; if (showHint !== this.audioLocked) { this.audioLocked = showHint; $('#audiohint').style.display = showHint ? 'block' : 'none'; }
    const pl = (this.mode === 'play' && !Game.paused) || this.mode === 'attract'; if (pl !== this.playing) { this.playing = pl; document.body.classList.toggle('playing', pl); }
    if (this.mode === 'play' || this.mode === 'attract') HUD.update(Game, Game.paused ? 0 : dt);
    World.render();
    Input.clearActivity();
  },
  checkTouch() {
    const t = this.touchOnly();
    if (t && !this.touchGate && this.mode === 'title') { this.touchGate = true; UI.closeAll(); UI.open(Screens.touch()); }
    else if (!t && this.touchGate) { this.touchGate = false; this.toTitle(); }
  },
  toTitle(boot) {
    Game.cleanup(); HUD.show(false); Game.paused = false; this.mode = 'title'; Title.enter(); this.idleT = 0;
    UI.closeAll(); World.camera.fov = 52; World.camera.updateProjectionMatrix();
    this.touchGate = false; if (this.touchOnly()) { this.touchGate = true; UI.open(Screens.touch()); } else UI.open(Screens.title());
    Audio.music('title'); UI.ignoreUntil = performance.now() + 150;
  },
  openBriefing(idx, carry, campaign) {
    this.campaign = campaign;
    if (this.mode !== 'title') { Game.cleanup(); HUD.show(false); this.mode = 'title'; Game.paused = false; Title.enter(); UI.closeAll(); Audio.music('title'); }
    UI.open(Screens.briefing(idx, carry, campaign));
  },
  startLevel(idx, carry) {
    UI.tick = null; UI.closeAll(); Title.exit(); this.mode = 'play'; Game.paused = false; Game.deadHandled = false; Game.finishing = false;
    Game.start(idx, { carry });
  },
  afterResults(r) {
    const P = Game.P, nextIdx = r.idx + 1;
    if (this.campaign && nextIdx < LEVELS.length) { const carry = { lives: Math.max(P.lives, 3), score: P.score, laser: P.laser, maxShield: P.maxShield, hits: 0, deaths: 0 }; UI.closeAll(); this.openBriefing(nextIdx, carry, true); }
    else if (this.campaign) { this.toTitle(); UI.open(Screens.about()); }
    else this.toTitle();
  },
  continueGame() {
    UI.closeAll(); const P = Game.P; P.lives = 2; P.score = Math.floor(P.score * 0.7); Game.deadHandled = false; Game.respawn(); HUD.show(true);
  },
  pause() { Game.paused = true; Audio.stopCharge(); UI.ignoreUntil = performance.now() + 200; UI.stack = []; UI.cur = null; UI.open(Screens.pause()); },
  resume() { Game.paused = false; UI.closeAll(); UI.ignoreUntil = performance.now() + 200; },
  startAttract() {
    this.mode = 'attract'; UI.closeAll(); Title.exit(); AI.reset();
    Game.deadHandled = false; Game.finishing = false; Game.start(this.attractIdx % LEVELS.length, { attract: true });
    Game.onAttractDone = () => this.nextAttract();
  },
  nextAttract() { this.attractIdx++; Game.onAttractDone = null; Game.cleanup(); AI.reset(); Game.deadHandled = false; Game.finishing = false; Game.start(this.attractIdx % LEVELS.length, { attract: true }); Game.onAttractDone = () => this.nextAttract(); },
  endAttract() { Game.cleanup(); Game.attract = false; Game.god = false; Game.onAttractDone = null; this.toTitle(); UI.ignoreUntil = performance.now() + 400; },
};
window.LL = { Game, Main, UI, Input, Settings, World, HUD, Audio, LEVELS, Title, Save, Screens };
window.addEventListener('DOMContentLoaded', () => Main.init());
