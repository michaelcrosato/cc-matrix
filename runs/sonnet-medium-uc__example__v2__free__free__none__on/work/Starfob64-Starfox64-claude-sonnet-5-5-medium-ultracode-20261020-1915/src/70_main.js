// ===================================================================
//  MAIN  -  boot, title scene, game loop
// ===================================================================
function escHtml(s) { return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function ABOUT_HTML() {
  return ABOUT_TEXT.split('\n').map((line) => {
    if (line.startsWith('## ')) return `<h2>${escHtml(line.slice(3))}</h2>`;
    if (!line.trim()) return '';
    const body = line.startsWith('- ') ? line.slice(2) : line;
    const m = body.match(/^([^:?]{2,90}[:?])\s(.*)$/);
    return line.startsWith('- ') && m ? `<p class="b"><b>${escHtml(m[1])}</b> ${escHtml(m[2])}</p>` : `<p>${escHtml(body)}</p>`;
  }).join('');
}

// ---------------------------------------------------------------- title scene (3D backdrop behind the menu)
const TitleScene = {
  t: 0, ship: null, wing: [], bg: null,
  enter() {
    this.t = 0;
    const fm = buildFighter(PALETTES.fob); G.world.add(fm.group); this.ship = fm;
    this.wing = [];
    for (const [id, x, y, z] of [['bolt', -9, 1, 5], ['kestrel', 10, 2, 7], ['newt', 0, 6, 10]]) {
      const w = buildFighter(PALETTES[id]); w.group.position.set(x, y, z); G.world.add(w.group); this.wing.push({ fm: w, x, y, z });
    }
    this.bg = bgArmada(); G.world.add(this.bg);
    G.world.add(armadaDecor());
    R.camera.userData.init = false;
  },
  update(dt) {
    this.t += dt;
    const t = this.t, s = this.ship.group;
    s.position.set(0, Math.sin(t * 0.8) * 0.25, 0);
    const roll = (t % 11) > 9.4 ? -TAU * easeInOut(((t % 11) - 9.4) / 1.6) : 0;
    s.rotation.set(Math.sin(t * 0.5) * 0.06, Math.sin(t * 0.3) * 0.15, Math.sin(t * 0.6) * 0.2 + roll, 'YXZ');
    for (const w of this.wing) { w.fm.group.position.set(w.x + Math.sin(t * 0.7 + w.z) * 0.6, w.y + Math.cos(t * 0.9 + w.x) * 0.5, w.z); w.fm.group.rotation.set(0, Math.sin(t * 0.3) * 0.1, Math.sin(t * 0.5 + w.x) * 0.15); }
    for (const f of [this.ship, ...this.wing.map((w) => w.fm)]) {
      for (const sx of [-0.95, 0.95]) { const p = f.group.localToWorld(_v1.set(sx, 0, 2.0)); FX.spark(p, _v2.set(rnd(-1, 1), rnd(-1, 1), rnd(1, 6)), 0x5ad0ff, 0.3, 0.5, 0, 1); }
    }
    for (let i = 0; i < f_streak; i++) FX.spark(_v1.set(rnd(-40, 40), rnd(-20, 20), -60), _v2.set(0, 0, 120), 0xffffff, 0.5, 0.25, 0, 0, 0.9);
    const a = t * 0.1 + 0.7, cam = R.camera;
    cam.position.set(Math.sin(a) * 12, 2.6 + Math.sin(t * 0.3) * 0.8, Math.cos(a) * 12);
    cam.lookAt(0, 0.4, 2);
    cam.fov = S.fov; cam.updateProjectionMatrix();
    this.bg.position.set(cam.position.x * 0.97, cam.position.y * 0.97, cam.position.z);
    R.focus.set(0, 0, 0);
  },
};
const f_streak = 1;

function enterTitle() {
  Attract.stop();
  clearWorld();
  G.def = { mode: 'title', id: 'title' }; G.mode = 'title'; G.paused = false; G.pl = null; G.cheat = false; G.attract = false; G.cleared = false; G.clearT = -1; G.tScale = 1;
  Phys.reset(0);
  applyTheme(THEMES.armada);
  HUD.show(false); HUD.setCenterWarning(null);
  Radio.reset(); Hint.clear();
  TitleScene.enter();
  Music.play('title');
  UI.reset(Input.touchOnly() ? 'gate' : 'title');
  UI.gateOn = Input.touchOnly();
  Input.lastActivity = performance.now();
}

// ---------------------------------------------------------------- per-frame game update
const _shakeOff = new V3();
function updateEnts(dt) {
  const rail = G.rail, railMode = G.def.mode === 'rail';
  for (const e of G.ents) {
    if (!e.alive) continue;
    e.prev = e.prev || e.pos.clone();
    e.prev.copy(e.pos);
    if (e.flash > 0) { e.flash -= dt; flashMats(e); e.fl = true; } else if (e.fl) { e.fl = false; flashMats(e); }
    if (e.def.update) e.def.update(e, dt);
    if (!e.alive) continue;
    if (e.mode === 'rel') e.pos.copy(rail.pos).add(e.rel);
    if (e.def.orient) {
      e.vel.copy(e.pos).sub(e.prev).divideScalar(Math.max(dt, 1e-4));
      if (e.vel.lengthSq() > 4 && e.mesh) { _v1.copy(e.vel).normalize(); faceDir(e.mesh, _v1); }
    }
    if (e.mesh && !e.static) e.mesh.position.copy(e.pos);
    if (e.body && !e.static) Phys.move(e);
    if (railMode && e.mode === 'world' && !e.isPartOfBoss && e.cat !== 'part' && e.kind !== 'chaser' && e.pos.z > rail.pos.z + 70) { e.alive = false; e.silent = true; }
  }
  for (let i = G.ents.length - 1; i >= 0; i--) if (!G.ents[i].alive) { removeEnt(G.ents[i]); G.ents.splice(i, 1); }
  const pl = G.pl;
  if (pl) pl.locks = pl.locks.filter((t) => t.alive);
}

function updateCameraClear(dt) {
  const pl = G.pl, cam = R.camera;
  const a = 2.2 + G.clearFly * 0.55;
  _camT.set(pl.pos.x + Math.sin(a) * 15, pl.pos.y + 3.5 + Math.sin(G.clearFly) * 1.5, pl.pos.z + Math.cos(a) * 15 + (G.def.mode === 'rail' ? 0 : 0));
  cam.position.lerp(_camT, 1 - Math.exp(-3 * dt));
  cam.lookAt(pl.pos);
  cam.fov = damp(cam.fov, S.fov, 4, dt); cam.updateProjectionMatrix();
}

function updateGame(rdt, act, passive = false) {
  const dt = rdt * G.tScale;
  const pl = G.pl, railMode = G.def.mode === 'rail';
  G.t += dt; if (!G.cleared) G.stageTime += dt;
  Tweens.update(dt);
  for (let i = G.later.length - 1; i >= 0; i--) { const l = G.later[i]; l.t -= dt; if (l.t <= 0) { G.later.splice(i, 1); l.fn(); } }
  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  if (!pl.engine && Snd.ready && !G.attract && !passive) pl.engine = Snd.engine();
  if (pl.engine) pl.engine.set(railMode ? G.rail.scale : pl.speed / 60, pl.boosting ? 1 : 0);
  if (railMode) updatePlayerRail(dt, act); else updatePlayerAR(dt, act);
  if (!G.cleared) updateDirector(dt);
  Terrain.update(G.rail.s, R.camera.position);
  updateBoss(dt);
  updateEnts(dt);
  updateWingmen(dt);
  updatePBs(dt); updateEBs(dt); updateBombs(dt); updateBeams(dt);
  if (pl.body) Phys.move(pl);
  Phys.step(dt, onContact);
  handleDeath(rdt);
  updateClear(rdt);
  // camera
  R.camera.position.sub(_shakeOff);
  if (G.camMode === 'clear') updateCameraClear(dt); else if (railMode) updateCameraRail(dt); else updateCameraAR(dt);
  const sh = R.shake * S.shake;
  _shakeOff.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(sh * 1.1);
  R.camera.position.add(_shakeOff);
  R.shake = damp(R.shake, 0, 5, dt);
  FX.update(dt);
  followScene(pl.pos);
  HUD.update(rdt);
  if (G.attract) Attract.update(rdt);
}
function followScene(focus) {
  const cam = R.camera;
  R.sky.position.copy(cam.position); R.stars.position.copy(cam.position);
  R.focus.copy(focus);
  R.sun.position.copy(focus).add(R.sunOffset || _v1.set(60, 100, 40));
  R.sun.target.position.copy(focus);
}

// ---------------------------------------------------------------- pause / frame
function pauseGame() {
  if (G.mode !== 'play' || G.paused || G.deadT >= 0 || G.cleared) return;
  G.paused = true;
  if (G.pl.chargeSnd) { G.pl.chargeSnd.stop(); G.pl.chargeSnd = null; G.pl.charging = false; }
  UI.reset('pause'); UI.ignoreNav = true;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
addEventListener('gamepaddisconnected', () => pauseGame());

let lastT = performance.now();
function tick(dt) {
  Input.poll(dt);
  if (!G.def) return;
  switch (G.mode) {
    case 'title': {
      TitleScene.update(dt);
      followScene(R.focus);
      FX.update(dt);
      const touch = Input.touchOnly();
      if (touch !== UI.gateOn) { UI.gateOn = touch; UI.reset(touch ? 'gate' : 'title'); }
      UI.update(dt);
      if (!UI.gateOn && performance.now() - Input.lastActivity > 10000) { UI.hideAll(); Attract.start(); }
      break;
    }
    case 'attract': {
      updateGame(dt, AI.act(dt));
      if (Input.lastActivity > Attract.startedAt + 150) { UI.fade(() => enterTitle()); Attract.active = false; G.mode = 'attract-exit'; }
      break;
    }
    case 'attract-exit': FX.update(dt); break;
    case 'play': {
      if (G.paused) { followScene(G.pl.pos); if (Input.act.pause && UI.stack.length <= 1) resumeGame(); else UI.update(dt); }
      else {
        if (Input.act.pause) { pauseGame(); UI.update(dt); }
        else updateGame(dt, Input.act);
      }
      break;
    }
    default: { // results, gameover, ending: world keeps drifting behind the menu
      if (G.pl) updateGame(dt, emptyAct(), true);
      UI.update(dt);
    }
  }
}
function frame() {
  const now = performance.now();
  let dt = (now - lastT) / 1000; lastT = now;
  dt = Math.min(dt, 0.05);
  try { tick(dt); } catch (e) { console.error(e); if (!frame.err) { frame.err = true; showFatal('Runtime error: ' + (e && e.message ? e.message : e), true); } }
  renderFrame();
}
// UI.ignoreNav support (skip the frame that opened a menu so the same press does not close it)
const _uiUpdate = UI.update.bind(UI);
UI.update = function (dt) { if (this.ignoreNav) { this.ignoreNav = false; return; } _uiUpdate(dt); };
const _uiShow = UI.show.bind(UI);
UI.show = function (def) { this.ignoreNav = true; _uiShow(def); };
const _uiOpen = UI.open.bind(UI);
UI.open = function (id, data) { if (this.cur) this.cur.focus = this.focus; _uiOpen(id, data); };

function showFatal(msg, soft) {
  const f = $('#fatal');
  f.innerHTML = `<div class="fbox"><h2>${soft ? 'Something went wrong' : 'Cannot start STARFOB 64'}</h2><p>${escHtml(String(msg))}</p>${soft ? '' : '<p>This game requires a browser with WebGPU (recent Chrome / Edge / Safari Technology Preview) — there is no fallback renderer.</p>'}</div>`;
  f.classList.add('on');
}

async function boot() {
  UI.init();
  document.documentElement.style.setProperty('--hud', S.hudScale);
  if (Input.touchOnly()) { UI.reset('gate'); UI.gateOn = true; }
  const boot = $('#boot');
  try {
    boot.querySelector('p').textContent = 'Starting WebGPU renderer…';
    await initRenderer($('#gpu'));
    boot.querySelector('p').textContent = 'Starting physics…';
    await Phys.init();
  } catch (e) {
    console.error(e);
    boot.classList.add('off');
    showFatal(e && e.message ? e.message : e);
    return;
  }
  G.world = new THREE.Group(); R.scene.add(G.world);
  HUD.init();
  applySettings();
  boot.classList.add('off');
  enterTitle();
  lastT = performance.now();
  R.renderer.setAnimationLoop(frame);
}
boot();
