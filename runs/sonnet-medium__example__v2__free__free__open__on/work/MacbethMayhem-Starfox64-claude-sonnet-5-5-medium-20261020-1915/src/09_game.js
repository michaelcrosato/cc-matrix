/* ===================== 09 GAME: state machine, screens, attract mode, dev tools ===================== */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const makeStage = (id, o) => (id === 'range' ? new RangeStage(STAGES.range, o) : new RailStage(STAGES.rail, o));
const MEDAL_COL = { GOLD: '#ffd23a', SILVER: '#d8e0ee', BRONZE: '#d88a4a', NONE: '#7a7090' };

/* ---------- title backdrop ---------- */
const TitleScene = {
  ships: [], t: 0,
  build() {
    Gfx.clearWorld(); FX.reset(); Debris.clear(); Bullets.clear(); W.reset(); Phys.reset();
    const th = STAGES.rail.theme; Gfx.setTheme(th);
    const gt = groundTexture(th.ground[0], th.ground[1], th.ground[2], 11); gt.repeat.set(60, 60);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), toon(0xffffff, { map: gt })); g.position.y = -40; g.receiveShadow = true; Gfx.world.add(g);
    const rng = mulberry(5), R = (a, b) => a + rng() * (b - a), batch = new DecorBatch();
    for (let i = 0; i < 90; i++) { const a = rng() * TAU, r = R(260, 1500); const h = R(40, 160); batch.add(pick(['mesa', 'mesa', 'spire']), Math.cos(a) * r, -40 + h / 2, Math.sin(a) * r - 300, rng() * TAU, R(20, 70), h, R(20, 70), pick([0x9a4a38, 0xb25c40, 0x7a3a34, 0xc47048])); }
    for (let i = 0; i < 50; i++) batch.add('cloud', R(-1500, 1500), R(40, 260), R(-1800, -200), 0, R(60, 160), R(14, 30), R(40, 90), 0xffd0c0);
    batch.build(Gfx.world);
    this.ships = [];
    const pos = [[0, 0, 0, null], [-9, 1.5, 10, WING[0]], [9, 1.5, 10, WING[1]], [0, -2, 20, WING[2]]];
    for (const [x, y, z, d] of pos) { const m = MODELS.ship(d ? d.color : {}); m.position.set(x, y, z); m.traverse((o) => { if (o.isMesh) o.castShadow = true; }); Gfx.world.add(m); this.ships.push({ m, x, y, z, ph: rand(TAU) }); }
    this.t = 0; Gfx.camera.fov = 52; Gfx.camera.updateProjectionMatrix(); Dust.visible(true);
    Gfx.sun.shadow.camera.updateProjectionMatrix();
  },
  update(dt) {
    this.t += dt; const t = this.t;
    for (const s of this.ships) {
      s.m.position.set(s.x + Math.sin(t * 0.7 + s.ph) * 0.6, s.y + Math.sin(t * 1.1 + s.ph) * 0.5, s.z); s.m.rotation.set(Math.sin(t * 0.6 + s.ph) * 0.05, 0, Math.sin(t * 0.9 + s.ph) * 0.18);
      const p = s.m.userData.parts; const f = 1.1 + Math.sin(t * 40 + s.ph) * 0.1; p.flame1.scale.z = f; p.flame2.scale.z = f;
    }
    const a = Math.sin(t * 0.18) * 0.5; const camPos = new V3(Math.sin(a) * 16 + 6, 3.2 + Math.sin(t * 0.3) * 1.2, Math.cos(a) * 16 + 10);
    Gfx.camera.position.copy(camPos); Gfx.camera.up.set(0, 1, 0); Gfx.camera.lookAt(0, 0.5, 0); Gfx.updateSky(Gfx.camera.position);
    Gfx.followShadow(new V3(0, 0, 8));
    if (Math.random() < dt * 40) { const s = pick(this.ships); const o = new V3(0, 0, 2.9).applyEuler(s.m.rotation).add(s.m.position); FX.spawn(o, _t2.set(0, 0, 12), 0.35, 0.5, 0xffe08a, 0xff4a2a, { drag: 0.5 }); }
    Dust.update(Gfx.camera.position, _t3.set(0, 0, -1), 160, 50); FX.update(dt);
  },
};

const Game = {
  state: 'boot', stage: null, checkpoint: null, attractIdx: 0, attractT: 0, attractStart: 0, inputFlag: 0, paused: false, last: 0, fps: 60, fpsT: 0, frames: 0, devGod: false, transitioning: false, touchChecked: 0,
  async boot() {
    UI.init(); Input.init();
    Input.onAny = () => { Game.inputFlag = performance.now(); };
    try {
      UI.setLoading('Starting WebGPU renderer…');
      await Gfx.init($('#gl'));
      UI.setLoading('Loading Rapier physics…'); await Phys.init();
      FX.init(); Dust.init(); makeEnemyAI(); setOutlines(Settings.outlines); this.applyShadows();
    } catch (err) {
      console.error(err);
      UI.hideLoading(); UI.showScreen({ cls: 'error', html: `<div class="errbox"><div class="t1">WEBGPU REQUIRED</div><div class="t2">${String(err.message || err)}</div><div class="t3">Macbeth Mayhem needs a browser with WebGPU (recent Chrome, Edge or Safari). There is no WebGL fallback.</div></div>`, prompts: [] });
      return;
    }
    UI.hideLoading(); this.last = performance.now();
    TitleScene.build(); this.state = 'splash'; this.showSplash();
    Gfx.renderer.setAnimationLoop((t) => this.loop(t));
    addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') this.pause(); });
    addEventListener('blur', () => { if (this.state === 'play') this.pause(); });
    window.__game = this;
  },
  applyShadows() { Gfx.renderer.shadowMap.enabled = Settings.shadows; Gfx.sun.castShadow = Settings.shadows; Gfx.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
  showSplash() {
    UI.showScreen({ cls: 'splash', html: `<div class="logo big"><div class="l1">MACBETH</div><div class="l2">MAYHEM</div><div class="l3">A BIRNAM WING RAIL SHOOTER</div></div><div class="press">PRESS ANY BUTTON</div>`, prompts: null, onShow: () => {} });
    this.splashShown = true; this.splashT0 = performance.now();
  },
  /* ---------- state transitions ---------- */
  async goTitle(fast) {
    if (this.transitioning) return; this.transitioning = true;
    UI.fade(true, fast ? 100 : 350); await sleep(fast ? 120 : 380);
    this.disposeStage(); UI.showHUD(false); UI.commClear(); UI.clearHint(false); UI.hideScreen(); UI.setBossBar(null);
    TitleScene.build(); this.state = 'title'; Sfx.playMusic('title'); Sfx.setEngine(false, 0);
    this.paused = false; document.body.classList.remove('playing');
    this.checkpoint = null;
    SCREENS.title(); Input.lastActivity = performance.now(); UI.fade(false, 500); this.transitioning = false;
  },
  disposeStage() {
    if (this.stage) { this.stage.dispose(); this.stage = null; }
    Gfx.clearWorld(); FX.reset(); Debris.clear(); Bullets.clear(); W.reset(); Phys.reset(); Gfx.hemi.intensity = 1.15; Dust.visible(true);
    for (const e of ['ret1', 'ret2']) UI.els[e].style.display = 'none';
    UI.updateArrows([]); UI.els.warn.classList.add('hidden'); UI.setObjective('');
    UI.locks.forEach((d) => (d.style.display = 'none'));
  },
  async startStage(id, opts = {}) {
    if (this.transitioning) return; this.transitioning = true;
    Sfx.init(); Sfx.resume(); Sfx.applyVolumes();
    UI.fade(true, 300); await sleep(340);
    UI.hideScreen(); this.disposeStage(); UI.commClear(); UI.clearHint(false);
    const st = makeStage(id, opts); st.build(); this.stage = st; this.stageId = id; this.stageOpts = opts;
    if (this.devGod && st.player) st.player.god = true;
    UI.showHUD(true); UI.updateHUD(st, 0);
    this.state = opts.attract ? 'attract' : 'play'; this.paused = false; this.attractT = 0; this.attractStart = performance.now(); this.inputFlag = 0;
    document.body.classList.add('playing'); Dust.visible(true);
    if (!opts.attract) Progress.plays++, saveProgress();
    UI.fade(false, 500); this.transitioning = false;
  },
  pause() {
    if (this.state !== 'play') return; this.state = 'paused'; Sfx.setEngine(false, 0); document.body.classList.remove('playing');
    SCREENS.pause();
  },
  resume() { UI.hideScreen(); this.state = 'play'; document.body.classList.add('playing'); },
  async playerDied(st) {
    if (this.attractActive()) return;
    this.state = 'gameover'; document.body.classList.remove('playing'); Sfx.playMusic('defeat'); SCREENS.gameover();
  },
  stageComplete(st) {
    if (this.attractActive()) { this.nextAttract(); return; }
    const P = st.player, total = Math.max(1, st.spawnedKillable), ratio = W.hits / total, m = st.def.medals;
    const medal = ratio >= m[2] && st.lost.size === 0 ? 'GOLD' : ratio >= m[1] ? 'SILVER' : ratio >= m[0] ? 'BRONZE' : 'NONE';
    const res = { id: st.def.id, name: st.def.name, hits: W.hits, total, score: Math.floor(W.score), time: W.time, rescued: st.rescued.size, lost: [...st.lost], shield: Math.ceil(P.hp), medal, route: st.route };
    const prevBest = Progress.best[res.id] || 0; res.newBest = res.score > prevBest; if (res.newBest) Progress.best[res.id] = res.score;
    const order = ['NONE', 'BRONZE', 'SILVER', 'GOLD']; if (order.indexOf(medal) > order.indexOf(Progress.medals[res.id] || 'NONE')) Progress.medals[res.id] = medal;
    saveProgress(); this.results = res; this.state = 'results'; document.body.classList.remove('playing'); UI.showHUD(false); Sfx.setEngine(false, 0);
    SCREENS.results(res);
  },
  attractActive() { return this.state === 'attract'; },
  /* ---------- attract mode ---------- */
  ATTRACT: [{ id: 'rail', startS: 700, dur: 38, route: 'B' }, { id: 'rail', startS: 5080, dur: 36 }, { id: 'range', dur: 46 }, { id: 'rail', startS: 3380, dur: 34, route: 'A' }, { id: 'rail', startS: 1900, dur: 34, route: 'B' }],
  startAttract() { const seg = this.ATTRACT[this.attractIdx % this.ATTRACT.length]; this.startStage(seg.id, { attract: true, startS: seg.startS, route: seg.route }); },
  async nextAttract() { if (this.transitioning) return; this.attractIdx++; const seg = this.ATTRACT[this.attractIdx % this.ATTRACT.length]; this.state = 'attract-wait'; this.transitioning = false; await this.startStage(seg.id, { attract: true, startS: seg.startS, route: seg.route }); },
  async exitAttract() { this.state = 'attract-exit'; await this.goTitle(true); Input.lastActivity = performance.now(); },
  /* ---------- main loop ---------- */
  loop(now) {
    let dt = (now - this.last) / 1000; this.last = now; dt = clamp(dt, 0.0005, 0.05);
    this.frames++; this.fpsT += dt; if (this.fpsT > 0.5) { this.fps = this.frames / this.fpsT; this.frames = 0; this.fpsT = 0; }
    Input.update(dt);
    const nav = Input.nav, ctl = Input.ctl;
    if (this.lastDev !== Input.lastDevice) { this.lastDev = Input.lastDevice; UI.refreshPrompts(); }
    // touch-only devices: no touch controls
    if (this.state === 'splash' || this.state === 'title') {
      if (now - this.touchChecked > 300) {
        this.touchChecked = now; const need = Input.touchOnly();
        if (need && !this.touchMode) { this.touchMode = true; if (!UI.cur || UI.cur.cls.includes('splash') || UI.cur.cls.includes('title')) UI.hideScreen(); UI.els.touch.classList.remove('hidden'); }
        else if (!need && this.touchMode) { this.touchMode = false; UI.els.touch.classList.add('hidden'); UI.hideScreen(); if (this.state === 'splash') this.showSplash(); else SCREENS.title(); }
      }
      if (this.touchMode) { TitleScene.update(dt); if (UI.cur) UI.handleNav(nav, dt); Gfx.renderer.render(Gfx.scene, Gfx.camera); Input.pressedKeys.clear(); return; }
    }
    switch (this.state) {
      case 'splash':
        TitleScene.update(dt);
        if (this.inputFlag > this.splashT0 + 250) { this.state = 'title'; Sfx.init(); Sfx.resume(); Sfx.applyVolumes(); Sfx.playMusic('title'); UI.hideScreen(); SCREENS.title(); Input.lastActivity = performance.now(); }
        break;
      case 'title':
        TitleScene.update(dt); UI.handleNav(nav, dt);
        if (Input.idleSeconds() > 10 && !this.transitioning && !UI.cur?.noAttract) this.startAttract();
        break;
      case 'attract':
        this.attractT += dt; this.stage.update(dt, ctl); UI.updateHUD(this.stage, dt);
        if (this.inputFlag > this.attractStart + 600 && now - this.inputFlag < 400) { this.exitAttract(); }
        else if (this.attractT > this.ATTRACT[this.attractIdx % this.ATTRACT.length].dur) this.nextAttract();
        break;
      case 'play':
        if (ctl.pauseDown) { this.pause(); break; }
        this.stage.update(dt, ctl); UI.updateHUD(this.stage, dt);
        break;
      case 'paused':
        UI.handleNav(nav, dt); if (ctl.pauseDown && !nav.back) { /* pause toggles via menu back */ }
        break;
      case 'gameover': case 'results':
        if (this.stage) { this.stage.updateCamera(dt, false); FX.update(dt); Debris.update(dt); }
        UI.handleNav(nav, dt); UI.updateComms(dt);
        break;
      default: break;
    }
    if (UI.devOn) this.updateDev(dt);
    Phys.updateDebug();
    Gfx.renderer.render(Gfx.scene, Gfx.camera);
    Input.pressedKeys.clear();
  },
  /* ---------- designer / debug tools (F3) ---------- */
  updateDev(dt) {
    const d = UI.els.dev; if (!UI.devOn) return; const st = this.stage, P = st && st.player;
    let h = `<b>DEV · F3</b> ${this.fps.toFixed(0)} fps · state ${this.state}<br>`;
    if (st && P) {
      h += `stage ${st.def.id} · t ${W.time.toFixed(1)}s · ents ${W.ents.length} · bullets ${W.bullets.length} · debris ${Debris.list.length} · bodies ${Phys.world.bodies.len ? Phys.world.bodies.len() : '?'}<br>`;
      if (st.mode === 'rail') h += `s ${P.s.toFixed(0)} / ${st.path.length.toFixed(0)} · route ${st.route || '-'} · events left ${st.events.filter((e) => !e.done).length}<br>`;
      h += `hp ${P.hp.toFixed(0)} god ${P.god} · hits ${W.hits}/${st.spawnedKillable}<br>`;
    }
    h += `<i>1 drone · 2 swooper · 3 gunship · 4 mine · 5 turret · I god · C colliders · N +400 · B boss · K kill all · H refill · R reload stage</i>`;
    d.innerHTML = h;
    if (this.state !== 'play' || !st) return;
    for (const k of Input.pressedKeys) {
      if (k === 'KeyI') { P.god = !P.god; this.devGod = P.god; }
      else if (k === 'KeyC') Phys.toggleDebug(!Phys.debugOn);
      else if (k === 'KeyK') { for (const e of W.ents) if (e.alive && e.team === 'e' && e.kind !== 'boss' && e.kind !== 'bossbody') e.damage(999, { pos: e.pos }); }
      else if (k === 'KeyH') { P.hp = P.maxHp; P.bombs = 6; P.laser = 3; }
      else if (k === 'KeyR') this.startStage(st.def.id, {});
      else if (st.mode === 'rail') {
        if (k === 'KeyN') { P.s += 400; for (const e of st.events) if (e.at < P.s - 260 && !e.route) e.done = true; }
        else if (k === 'KeyB') { P.s = st.def.bossAt - 300; for (const e of st.events) if (e.at < st.def.bossAt - 100) e.done = true; }
        else if ('Digit1Digit2Digit3Digit4Digit5'.includes(k)) { const kind = { Digit1: 'drone', Digit2: 'swooper', Digit3: 'gunship', Digit4: 'mine', Digit5: 'turret' }[k]; st.spawnWave({ kind, n: kind === 'gunship' ? 1 : 3, form: 'line', x: 0, y: 2 }, P.s + 140, 0); }
      } else if (st.mode === 'range' && 'Digit1Digit2'.includes(k)) st.spawnFighters(k === 'Digit1' ? 1 : 3);
    }
  },
};

/* ---------- screens ---------- */
function settingsItems(backFn) {
  const S = Settings, sv = () => saveSettings();
  return [
    { type: 'slider', label: 'MASTER VOLUME', get: () => S.master, set: (v) => { S.master = v; Sfx.applyVolumes(); sv(); }, min: 0, max: 1, step: 0.1, desc: 'Overall loudness.' },
    { type: 'slider', label: 'MUSIC VOLUME', get: () => S.music, set: (v) => { S.music = v; Sfx.applyVolumes(); sv(); }, min: 0, max: 1, step: 0.1, desc: 'Background music level.' },
    { type: 'slider', label: 'EFFECTS VOLUME', get: () => S.sfx, set: (v) => { S.sfx = v; Sfx.applyVolumes(); sv(); Sfx.laser(); }, min: 0, max: 1, step: 0.1, desc: 'Lasers, explosions and voices.' },
    { type: 'toggle', label: 'INVERT HORIZONTAL', get: () => S.invertH, set: (v) => { S.invertH = v; sv(); }, desc: 'Gamepad fix: flips left/right stick input if your controller reports it reversed.' },
    { type: 'toggle', label: 'INVERT VERTICAL', get: () => S.invertV, set: (v) => { S.invertV = v; sv(); }, desc: 'Gamepad fix: flips up/down stick input. Also gives classic flight-stick controls.' },
    { type: 'slider', label: 'STICK DEADZONE', get: () => S.deadzone, set: (v) => { S.deadzone = v; sv(); }, min: 0, max: 0.4, step: 0.05, fmt: (v) => Math.round(v * 100) + '%', desc: 'Ignore small stick movements. Raise this if the ship drifts.' },
    { type: 'slider', label: 'SENSITIVITY', get: () => S.sens, set: (v) => { S.sens = v; sv(); }, min: 0.5, max: 1.5, step: 0.1, fmt: (v) => v.toFixed(1) + 'x', desc: 'Ship turning and strafing speed.' },
    { type: 'toggle', label: 'VIBRATION', get: () => S.rumble, set: (v) => { S.rumble = v; sv(); if (v) Input.rumble(0.5, 0.5, 200); }, desc: 'Controller rumble on hits and explosions.' },
    { type: 'slider', label: 'SCREEN SHAKE', get: () => S.shake, set: (v) => { S.shake = v; sv(); }, min: 0, max: 1, step: 0.25, fmt: (v) => (v === 0 ? 'OFF' : Math.round(v * 100) + '%'), desc: 'Camera shake intensity.' },
    { type: 'toggle', label: 'AIM ASSIST', get: () => S.aimAssist, set: (v) => { S.aimAssist = v; sv(); }, desc: 'Lasers bend slightly toward nearby enemies.' },
    { type: 'toggle', label: 'TUTORIAL HINTS', get: () => S.hints, set: (v) => { S.hints = v; sv(); }, desc: 'Show button prompts when new mechanics appear.' },
    { type: 'toggle', label: 'CEL OUTLINES', get: () => S.outlines, set: (v) => { S.outlines = v; setOutlines(v); sv(); }, desc: 'Ink outlines around ships and scenery.' },
    { type: 'toggle', label: 'SHADOWS', get: () => S.shadows, set: (v) => { S.shadows = v; Game.applyShadows(); sv(); }, desc: 'Dynamic sun shadows.' },
    { type: 'button', label: 'RESET TO DEFAULTS', action: () => { Object.assign(Settings, DEFAULT_SETTINGS); saveSettings(); Sfx.applyVolumes(); setOutlines(Settings.outlines); Game.applyShadows(); UI.showScreen(UI.cur); UI.toast('Settings reset', 'good'); }, desc: 'Restore every option to its default value.' },
    { type: 'button', label: 'BACK', action: backFn, desc: '' },
  ];
}
SCREENS.settings = () => {
  const back = () => UI.popScreen();
  const scr = {
    cls: 'panelscreen settings', noAttract: false,
    html: `<div class="ptitle">SETTINGS</div><div class="settings-grid"><div class="menuhost list"></div><div class="side"><div class="monitor"><div class="mt">LEFT STICK AS THE GAME SEES IT</div><canvas id="stickmon" width="180" height="180"></canvas><div class="mn" id="stickn">no controller input</div></div><div class="desc"></div></div></div>`,
    items: null, onBack: back,
    onShow: (s) => { scr.cv = s.querySelector('#stickmon'); scr.n = s.querySelector('#stickn'); },
    onUpdate: () => {
      const cv = scr.cv; if (!cv) return; const g = cv.getContext('2d'), w = cv.width, c = w / 2; g.clearRect(0, 0, w, w);
      g.fillStyle = 'rgba(14,10,28,0.8)'; g.beginPath(); g.arc(c, c, c - 4, 0, TAU); g.fill(); g.strokeStyle = '#4ab6c4'; g.lineWidth = 3; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.moveTo(c, 8); g.lineTo(c, w - 8); g.moveTo(8, c); g.lineTo(w - 8, c); g.stroke();
      g.fillStyle = '#888'; g.font = '14px Arial'; g.textAlign = 'center'; g.fillText('UP', c, 20); g.fillText('DOWN', c, w - 8); g.textAlign = 'left'; g.fillText('L', 8, c - 4); g.textAlign = 'right'; g.fillText('R', w - 8, c - 4);
      const x = Input.ctl.x, y = Input.ctl.y; g.fillStyle = '#ffb24a'; g.beginPath(); g.arc(c + x * (c - 20), c + y * (c - 20), 11, 0, TAU); g.fill(); g.strokeStyle = '#140b1c'; g.stroke();
      const dirs = []; if (x < -0.3) dirs.push('LEFT'); if (x > 0.3) dirs.push('RIGHT'); if (y < -0.3) dirs.push('UP'); if (y > 0.3) dirs.push('DOWN');
      scr.n.textContent = Input.pad ? (dirs.length ? 'ship goes ' + dirs.join(' + ') : 'centered') : 'no controller connected (keyboard works)';
    },
  };
  UI.showScreen(Object.assign(scr, { items: settingsItems(back) }));
  // `showScreen` renders the menu into the first .menuhost
};
SCREENS.controls = () => {
  const rows = [['fire', 'Fire lasers (hold)'], ['charge', 'Hold to lock on, release for homing shots'], ['bomb', 'Nova Bomb'], ['rollL', 'Barrel Roll left (deflects shots)'], ['rollR', 'Barrel Roll right (deflects shots)'], ['boost', 'Boost'], ['brake', 'Brake'], ['uturn', 'U-Turn (all-range stages)'], ['pause', 'Pause']];
  const gp = (a) => `<span class="glyph pad ${GLYPH_PAD[a][1]}">${GLYPH_PAD[a][0]}</span>`, kb = (a) => `<span class="glyph key">${GLYPH_KEY[a]}</span>`;
  const back = () => UI.popScreen();
  UI.showScreen({
    cls: 'panelscreen controls', onBack: back, onConfirm: back, prompts: [['back', 'BACK']],
    html: `<div class="ptitle">CONTROLS</div><div class="ctl-grid"><div class="ch">ACTION</div><div class="ch">CONTROLLER</div><div class="ch">KEYBOARD</div>
      <div class="cr">Steer ship</div><div class="cr">${gp('move')} LEFT STICK</div><div class="cr">${kb('move')}</div>
      ${rows.map(([a, t]) => `<div class="cr">${t}</div><div class="cr">${gp(a)}</div><div class="cr">${kb(a)}${a === 'rollL' ? ' or double-tap A' : a === 'rollR' ? ' or double-tap D' : ''}${a === 'rollL' ? '' : ''}</div>`).join('')}
      <div class="cr">Menus</div><div class="cr">${gp('nav')} ${gp('confirm')} ${gp('back')}</div><div class="cr">${kb('nav')} ${kb('confirm')} ${kb('back')}</div></div>
      <div class="note">Tip: if your gamepad's stick feels reversed, use Settings → Invert Horizontal / Invert Vertical.</div>`,
  });
};
SCREENS.about = () => {
  const back = () => UI.popScreen();
  UI.showScreen({ cls: 'panelscreen about', onBack: back, scroll: true, prompts: [['nav', 'SCROLL'], ['back', 'BACK']], html: `<div class="ptitle">ABOUT & CREDITS</div><div class="scroll">${ABOUT_HTML}</div>` });
};
SCREENS.stageSelect = () => {
  const back = () => UI.popScreen();
  const cards = Object.values(STAGES).map((s) => {
    const medal = Progress.medals[s.id] || 'NONE', best = Progress.best[s.id] || 0;
    return { type: 'card', cls: 'stagecard', html: `<div class="sc-n">STAGE ${s.num}</div><div class="sc-t">${s.name.toUpperCase()}</div><div class="sc-m">${s.mode === 'rail' ? 'ON-RAILS · BRANCHING ROUTES' : 'ALL-RANGE DOGFIGHT'}</div><div class="sc-b">${s.blurb}</div><div class="sc-s"><span class="medal" style="background:${MEDAL_COL[medal]}"></span>${medal === 'NONE' ? 'NO MEDAL' : medal + ' MEDAL'} · BEST ${String(best).padStart(7, '0')}</div>`, action: () => Game.startStage(s.id) };
  });
  UI.showScreen({ cls: 'panelscreen select', row: true, items: cards, onBack: back, prompts: [['nav', 'CHOOSE'], ['confirm', 'LAUNCH'], ['back', 'BACK']], html: `<div class="ptitle">MISSION SELECT</div><div class="menuhost cards"></div>` });
};
SCREENS.title = () => {
  UI.showScreen({
    cls: 'title', html: `<div class="logo"><div class="l1">MACBETH</div><div class="l2">MAYHEM</div><div class="l3">A BIRNAM WING RAIL SHOOTER</div></div><div class="menuhost side"></div><div class="ver">WebGPU · Three.js r180 · Rapier 0.19.3 · hi-score ${String(Math.max(0, ...Object.values(Progress.best), 0)).padStart(7, '0')}</div>`,
    items: [
      { label: 'START MISSION', sub: 'Stage 1 · Macbeth Rail Yard', action: () => Game.startStage('rail') },
      { label: 'MISSION SELECT', action: () => UI.pushScreen('stageSelect') },
      { label: 'SETTINGS', action: () => UI.pushScreen('settings') },
      { label: 'CONTROLS', action: () => UI.pushScreen('controls') },
      { label: 'ABOUT & CREDITS', action: () => UI.pushScreen('about') },
    ], onBack: () => {},
  });
};
SCREENS.pause = () => {
  const items = [{ label: 'RESUME', action: () => Game.resume() }];
  const cpOk = Game.checkpoint && Game.checkpoint.stage === Game.stageId;
  if (cpOk) items.push({ label: 'RESTART FROM CHECKPOINT', action: () => Game.startStage(Game.stageId, { startS: Game.checkpoint.s, route: Game.checkpoint.route }) });
  items.push({ label: 'RESTART STAGE', action: () => Game.startStage(Game.stageId, {}) }, { label: 'SETTINGS', action: () => UI.pushScreen('settings') }, { label: 'CONTROLS', action: () => UI.pushScreen('controls') }, { label: 'QUIT TO TITLE', action: () => Game.goTitle() });
  const st = Game.stage;
  UI.showScreen({ cls: 'panelscreen pause', items, onBack: () => Game.resume(), prompts: [['nav', 'NAVIGATE'], ['confirm', 'SELECT'], ['back', 'RESUME']],
    html: `<div class="ptitle">PAUSED</div><div class="pstat">${st ? st.def.name.toUpperCase() + ' · ' + fmtTime(W.time) + ' · HITS ' + W.hits : ''}</div><div class="menuhost list"></div>` });
};
SCREENS.gameover = () => {
  const cpOk = Game.checkpoint && Game.checkpoint.stage === Game.stageId;
  const items = [];
  if (cpOk) items.push({ label: 'RETRY FROM CHECKPOINT', sub: Game.checkpoint.s ? 'continue the run' : '', action: () => Game.startStage(Game.stageId, { startS: Game.checkpoint.s, route: Game.checkpoint.route }) });
  items.push({ label: 'RETRY STAGE', action: () => Game.startStage(Game.stageId, {}) }, { label: 'QUIT TO TITLE', action: () => Game.goTitle() });
  UI.showScreen({ cls: 'panelscreen gameover', items, onBack: () => {}, html: `<div class="ptitle red">MISSION FAILED</div><div class="pstat">The Lancer was shot down. "Out, out, brief candle!"</div><div class="menuhost list"></div>` });
};
SCREENS.results = (r) => {
  const rank = r.medal === 'GOLD' ? 'S' : r.medal === 'SILVER' ? 'A' : r.medal === 'BRONZE' ? 'B' : 'C';
  const items = [];
  if (r.id === 'rail') items.push({ label: 'NEXT MISSION', sub: 'Stage 2 · Dunsinane Skies', action: () => Game.startStage('range') });
  items.push({ label: 'RETRY STAGE', action: () => Game.startStage(r.id, {}) }, { label: 'QUIT TO TITLE', action: () => Game.goTitle() });
  const wing = WING.map((w) => `<span class="wpill ${r.lost.includes(w.id) ? 'lost' : ''}">${CHARS[w.id].name}</span>`).join('');
  UI.showScreen({
    cls: 'panelscreen results', items, onBack: () => {}, prompts: [['nav', 'NAVIGATE'], ['confirm', 'SELECT']],
    html: `<div class="ptitle gold">MISSION COMPLETE</div><div class="rname">${r.name.toUpperCase()}${r.route ? ' · ROUTE ' + r.route : ''}${r.id === 'range' ? ' · DEMO COMPLETE — THANKS FOR FLYING WITH BIRNAM WING!' : ''}</div>
      <div class="res-grid"><div class="rr"><span>HITS</span><b>${r.hits} / ${r.total}</b></div><div class="rr"><span>SCORE</span><b>${String(r.score).padStart(7, '0')}</b>${r.newBest ? '<em>NEW BEST</em>' : ''}</div><div class="rr"><span>TIME</span><b>${fmtTime(r.time)}</b></div><div class="rr"><span>SHIELD LEFT</span><b>${r.shield}</b></div><div class="rr"><span>WINGMEN</span><div class="wp">${wing}</div></div></div>
      <div class="medalbox"><div class="rankbig" style="color:${MEDAL_COL[r.medal]}">${rank}</div><div class="medalname" style="color:${MEDAL_COL[r.medal]}">${r.medal === 'NONE' ? 'NO MEDAL' : r.medal + ' MEDAL'}</div><div class="mnote">Gold: 90% hits and all wingmen alive</div></div><div class="menuhost list"></div>`,
    onShow: () => { if (r.medal !== 'NONE') setTimeout(() => Sfx.medal(), 500); },
  });
};
