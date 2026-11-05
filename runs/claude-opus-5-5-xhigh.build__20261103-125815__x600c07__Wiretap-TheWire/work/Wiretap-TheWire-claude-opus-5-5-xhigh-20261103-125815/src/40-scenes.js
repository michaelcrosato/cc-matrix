/* 40-scenes: the per-step globals every scene runs first (idle timer and attract, prompts following the device, the
   touch-only notice, the notebook on Create's release), then the frame scenes: title, episode card, shutdown, credits,
   About & Credits, and the AI Hub's "Connecting…". */
const Globals = {
  idle: 0, attract: false, auto: false, choose: null, touchOnly: false, keySeen: false, lastPtr: null, createHeld: false, createPause: false,
  blocked() { return UI.active || Talk.open || game.paused || !!(game.shell && game.shell.screen); },
  init() {
    if (HEADLESS) return;
    const poke = () => { this.idle = 0; if (this.attract) Attract.exit(); };
    addEventListener('keydown', e => { this.keySeen = true; if (this.touchOnly) this.setTouchOnly(false); poke(); }, true);
    addEventListener('pointerdown', poke, true); addEventListener('wheel', poke, true); addEventListener('touchstart', poke, true);
    addEventListener('pointermove', e => { const p = [e.clientX, e.clientY]; if (this.lastPtr && Math.hypot(p[0] - this.lastPtr[0], p[1] - this.lastPtr[1]) > 6) { this.lastPtr = p; poke(); } else if (!this.lastPtr) this.lastPtr = p; }, true);
    addEventListener('gamepadconnected', () => { if (this.touchOnly) this.setTouchOnly(false); });
    const mq = q => typeof matchMedia === 'function' && matchMedia(q).matches;
    this.touchOnly = mq('(pointer: coarse)') && !mq('(any-pointer: fine)') && ((navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window);
    if (this.touchOnly) { game.input.touchEnabled = false; try { game.settings.set('touch', 'off'); } catch (e) { /* none */ } }
  },
  setTouchOnly(v) { this.touchOnly = v; if (game.sceneName === 'title' && game.scene.menu) game.scene.menu(); },
  padActive() {
    try { const ps = navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []; for (const p of ps) { if (!p) continue; if (p.buttons.some(b => b && (b.pressed || b.value > .5))) return true; if (p.axes.some(a => Math.abs(a) > .3)) return true; } } catch (e) { /* blocked */ }
    return false;
  },
  tick(dt) {
    Prompts.watch(game.input);
    if (!HEADLESS && this.padActive()) { this.idle = 0; if (this.touchOnly) this.setTouchOnly(false); if (this.attract) Attract.exit(); }
    if (HEADLESS && game.input.anyPressed()) { this.idle = 0; if (this.attract) Attract.exit(); }
    if (HEADLESS) this.idle += dt; else { const now = performance.now(); this.idle += Math.min(1, Math.max(0, (now - (this.lastNow || now)) / 1000)); this.lastNow = now; }
    if (this.attract) Attract.tick(dt);
    UI.tick(dt); Amb.tick(dt);
    const tp = UI.top(); if (tp && tp.el) tp.el.classList.toggle('talking', Talk.open);
    if (Prompts.dirty) { Prompts.dirty = false; UI.relegend(); }
    // attract: 10 s idle on the title or its menus (not on Settings, About or Controls: a player may be reading)
    const top = UI.top(), idleOK = !top || top.spec.idleOK;
    if (!this.attract && game.sceneName === 'title' && idleOK && !(game.shell && game.shell.screen) && this.idle > 10 && !(window.AIHub && AIHub.active)) Attract.start();
    // Create (Pad8) opens the notebook on release, unless Options was pressed during the hold (Create + Options is the AI Hub's)
    const I = game.input;
    if (I.down('notebook') && I.lastDevice === 'gamepad') { this.createHeld = true; if (I.pressed('pause')) this.createPause = true; if (window.AIHub && AIHub.active) I.suppress('pause'); }
  },
  /** the notebook key: Tab/N press, or Create's release */
  notebookPressed() {
    const I = game.input;
    if (I.lastDevice !== 'gamepad') return I.pressed('notebook');
    if (I.released('notebook')) { const ok = this.createHeld && !this.createPause; this.createHeld = false; this.createPause = false; return ok; }
    return false;
  }
};
/** every scene runs the globals first, and leaves no screen of its own behind */
function withGlobals(sc) {
  const u = sc.update, ex = sc.exit, dr = sc.draw;
  sc.update = function (dt) { Globals.tick(dt); if (u) u.call(sc, dt); };
  sc.draw = function (r) { if (dr) dr.call(sc, r); if (Globals.attract && !r.viewport) Attract.draw(r); };
  sc.exit = function () { if (!sc.keepUI) UI.closeAll(); Talk.stop(); if (shell) shell.hud({}); if (ex) ex.call(sc); };
  return sc;
}
const scenes = {};

/* ---- TITLE: a live diorama of the corner at night in the rain, the camera turning a quarter every 20 seconds ---- */
const TitleBG = {
  sim: null, t: 0,
  setup() { World.cur = World.map; Flow.reset(World.map); World.setTOD('nightRain'); this.sim = new CornerSim({ rate: .3, night: true, patrols: true, autoReup: true }); Crowd.reset(10, null, 31); this.t = 0; Perception.setup([], []); },
  tick(dt) { this.t += dt; this.sim.tick(dt, []); Crowd.tick(dt); World.tick(dt, []); if (this.t > 20) { this.t = 0; game.rotateView(90); } game.focus(W(31), W(33), 16); World.focus = { x: W(31), y: W(33) }; },
  draw(r) { World.draw(r); this.sim.draw(r); for (const a of Crowd.list) drawAgent(r, a, { bg: true }); drawBubbles(r, this.sim.all(), null); }
};
function drawLogo(r, y0 = 18, scale = 4) {
  r.overlay(g => {
    const cx = Math.round(r.W / 2), y = y0;
    // the telephone wire behind the logo, with sneakers hanging from it
    let prev = null; for (let i = 0; i <= 16; i++) { const u = i / 16, x = lerp(-10, r.W + 10, u), yy = y + 12 + Math.sin(u * Math.PI) * 14; if (prev) px.line(g, prev[0], prev[1], x, yy, '#0a0808', 2); prev = [x, yy]; }
    const sx = Math.round(cx + 70), sy = y + 26 + Math.round(Math.sin(game.real * 1.2) * 1.5);
    px.line(g, sx, sy - 5, sx - 3, sy + 6, '#0a0808'); px.line(g, sx, sy - 5, sx + 3, sy + 7, '#0a0808'); px.rect(g, sx - 6, sy + 6, 5, 3, '#e8e6e0'); px.rect(g, sx + 2, sy + 7, 5, 3, '#e8e6e0'); px.rect(g, sx - 6, sy + 8, 5, 1, '#c82a2a');
    E.font.title(g, 'WIRETAP', cx, y, { align: 'center', scale, colors: ['#fff6dc', '#ffcf7a', '#e08a2a'], depth: 3, depthColor: '#3a1a0a' });
    E.font.text(g, "Somebody's always listening.", cx, y + scale * 9 + 6, '#e8dcc0', { align: 'center', shadow: '#000', outline: false });
    E.font.text(g, 'WIRETAP 1.0 · ' + (E.versionLabel ? E.versionLabel() : ''), 4, 3, '#8a8478', { font: 'tiny', outline: false });
  });
}
scenes.title = withGlobals({
  view: 'iso', views: ['iso'], camera: false,
  enter() {
    game.resetCamera(); game.setZoom(1.15); Snd.music('theme'); Amb.set('streetNight', true); TitleBG.setup(); Globals.idle = 0;
    if (shell) shell.hud({}); this.menu();
  },
  menu() {
    UI.closeAll();
    if (Globals.touchOnly) {
      UI.open({ id: 'touch', cls: 'touchnote', idleOK: true, onBack: null, html: () => `<div class="panel narrow"><div class="kicker">WIRETAP</div><h1>Controller or keyboard required</h1><p class="lede">Connect a controller or keyboard to play. The demo will run in the meantime.</p><button class="btn primary" data-f="settings">Settings</button></div>`,
        onSelect: () => game.menu('settings') });
      return;
    }
    const latest = (() => { try { return game.saves.latest(); } catch (e) { return null; } })();
    const items = [latest && ['continue', 'Continue', latest.place || 'Your case'], ['new', 'New case', 'Episode 1: Eyes On'], ['episodes', 'Episodes', 'Start any episode you have reached'],
      ['versus', 'The Game', 'Corner vs Detail, 1-4 players'], ['settings', 'Settings', 'Controls, symbols, stick inversion, difficulty'], ['about', 'About & Credits', 'How this was made']].filter(Boolean);
    UI.open({ id: 'title', cls: 'title-menu clear', idleOK: true, onBack: null,
      html: () => `<div class="menu">${items.map(([id, l, s]) => `<button class="mi" data-f="${id}">${esc(l)}<small>${esc(s)}</small></button>`).join('')}</div><div class="tagline">An original game inspired by The Wire (HBO, 2002-2008).</div>`,
      legend: [['confirm', 'Select']],
      onSelect: id => {
        if (id === 'continue') { try { game.saves.load(latest.slot); } catch (e) { Director.newGame(); } }
        else if (id === 'new') { UI.closeAll(); Director.newGame(); }
        else if (id === 'episodes') { const s = UI.top(); Director.episodeMenu(() => UI.close()); UI.top().spec.idleOK = true; }
        else if (id === 'versus') { UI.closeAll(); game.go('versusSetup'); }
        else if (id === 'settings') game.menu('settings');
        else if (id === 'about') About.open();
      } });
  },
  update(dt) { TitleBG.tick(dt); },
  draw(r) { TitleBG.draw(r); drawLogo(r); }
});

/* ---- EPISODE CARD: black, white text, the epigraph ---- */
scenes.card = withGlobals({
  enter(d) { this.b = d.beat; this.ep = EPISODES[this.b.ep - 1]; this.t = 0; Snd.music(null); game.lights.enabled = false; game.weather = null; if (this.b.ep === 1) Snd.sting('beatDone'); Snd.play('reel'); Amb.stop(); },
  update(dt) { this.t += dt; if (this.t > 1.2 && (game.input.pressed('confirm') || game.input.pressed('start'))) this.t = 99; if (this.t > (Globals.auto ? 3.5 : 7.5)) { this.t = -999; Director.done(); } },
  draw(r) {
    r.sky(['#000000', '#000000']);
    const a = Math.min(1, this.t / .8), e = this.ep, cy = Math.round(r.H / 2);
    r.overlay(g => {
      if (a < .5) return;
      E.font.title(g, 'WIRETAP', r.W / 2, cy - 64, { align: 'center', scale: 2, colors: ['#fff6dc', '#ffcf7a', '#e08a2a'], depth: 2, depthColor: '#3a1a0a' });
      E.font.text(g, 'EPISODE ' + this.b.ep, r.W / 2, cy - 28, '#9a9080', { align: 'center', outline: false });
      E.font.text(g, e.title.toUpperCase(), r.W / 2, cy - 16, '#ffffff', { align: 'center', scale: 2, outline: false });
      if (this.t > 1.6) {
        const lines = E.font.wrap('"' + e.epigraph + '"', Math.min(r.W - 40, 300)); lines.forEach((l, i) => E.font.text(g, l, r.W / 2, cy + 14 + i * 11, '#e8e0d0', { align: 'center', outline: false }));
        E.font.text(g, '- ' + e.by, r.W / 2, cy + 18 + lines.length * 11, '#9a9080', { align: 'center', outline: false });
      }
      if (this.t > 2) Glyph.prompt(g, 'confirm', 'Continue', r.W - 12, r.H - 18, '#9a9080', 'right');
    });
  }
});

/* ---- SHUT DOWN: Brass hit zero ---- */
scenes.shutdown = withGlobals({
  view: 'brawler', camera: false,
  enter() {
    World.cur = roomMap('office'); World.setTOD('interior'); Snd.music('montage'); Amb.set('annex');
    this.nav = new Agent({ person: 'navarre', x: 3.5 * T, y: 2 * T }); this.nav.facing = Math.PI / 2; this.nav.pose = 'carry';
    game.focus(3.5 * T, 2.5 * T, 10); game.setZoom(1.6);
    Talk.play([['navarre', 'Detail Nine is disbanded, effective Monday.'], ['navarre', 'The Major wanted bodies. We gave him a case file. Pack your desk, Dana.']], () => {
      UI.choose({ kicker: 'Shut down', title: 'The detail is done', text: 'The Major ran out of patience. You can try that part again, or see how it ends from here.', back: false,
        cards: [{ id: 'retry', label: 'Retry from the last autosave', sub: 'Back to the start of the last part' }, { id: 'end', label: 'See how it ends', sub: 'The Shut Down ending' }] },
      id => { if (id === 'retry') { STATE.meters.brass = Math.max(STATE.meters.brass, 25); Director.restartBeat(); } else { F().path = 'shut'; game.go('montage', {}); } });
    });
  },
  update(dt) { if (Talk.update(dt)) return; this.nav.update(dt); },
  draw(r) { drawRoom(r, 'office'); drawAgent(r, this.nav); for (let i = 0; i < 3; i++) r.shape('crate', (2 + i * 1.4) * T, 3.2 * T, 0, { facing: i }); Talk.draw(r); }
});

/* ---- CREDITS: the roll after the finale ---- */
scenes.credits = withGlobals({
  enter() { this.t = 0; Snd.music('theme'); game.lights.enabled = false; game.weather = null; E.store.set('wiretap:unlocked', 5); STATE.unlocked = 5; this.lines = CREDITS.roll; Amb.stop(); },
  update(dt) { this.t += dt * (game.input.down('confirm') ? 4 : 1); if (this.t > this.lines.length * 1.6 + 10 || game.input.pressed('cancel') || game.input.pressed('start')) { this.t = -1e9; game.go('title'); } },
  draw(r) {
    r.sky(['#050405', '#0c0a0c', '#141012']);
    r.overlay(g => {
      const y0 = r.H - this.t * 18;
      this.lines.forEach((l, i) => { const y = Math.round(y0 + i * 16); if (y < -10 || y > r.H + 10) return; const head = l.startsWith('#'); E.font.text(g, head ? l.slice(1) : l, r.W / 2, y, head ? '#ffb347' : '#e8e0d0', { align: 'center', outline: false, scale: head ? 1 : 1 }); });
      Glyph.prompt(g, 'cancel', 'Skip', r.W - 10, r.H - 16, '#6a6458', 'right');
    });
  }
});

/* ---- ABOUT & CREDITS (DOM pages, L1/R1) ---- */
const About = {
  open() {
    const ei = CREDITS.exitInterview, si = ei.sourceInformation;
    const SI = [['Date', si.date], ['Source', si.source], ['Genre', si.genre], ['Perspective', si.perspective], ['Tech', si.tech], ['Art direction', si.artDirection], ['Animation', si.animation], ['Audio', si.audio], ['Online', si.online], ['Testing', si.testing], ['Research', si.research], ['Environment', si.environment], ['Model', si.model], ['Usage', si.usage]];
    const qa = (qs, as) => `<ol>${qs.map((q, i) => `<li><b>${esc(q)}</b>${esc(as[i] || 'unknown')}</li>`).join('')}</ol>`;
    const pages = [
      ['Credits', `<p>${CREDITS.about.map(esc).join('</p><p>')}</p>`],
      ['Source Information', `<dl>${SI.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`],
      ['Testing Feedback', qa(CREDITS.questions.testing, ei.testingFeedback)],
      ['Engine Feedback', qa(CREDITS.questions.engine, ei.engineFeedback)],
      ['Prompt Feedback', qa(CREDITS.questions.prompt, ei.promptFeedback)]
    ];
    let p = 0;
    const s = UI.open({ id: 'about', cls: 'about',
      html: () => `<div class="panel"><div class="kicker">About & Credits · ${p + 1} / ${pages.length}</div><div class="tabs">${pages.map((x, i) => `<span class="tab${i === p ? ' on' : ''}">${esc(x[0])}</span>`).join('')}</div><h1>${esc(pages[p][0])}</h1><div class="scroll" data-f="page" tabindex="-1">${pages[p][1]}</div></div>`,
      legend: [['tabPrev', 'Previous page'], ['tabNext', 'Next page'], ['up', 'Scroll'], ['cancel', 'Back']], noNav: true,
      onTab: d => { p = (p + d + pages.length) % pages.length; UI.render(s); },
      tick: dt => { const el = s.el && s.el.querySelector('.scroll'); if (!el) return; const I = game.input, mv = I.move()[1] + (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0); if (Math.abs(mv) > .2) el.scrollTop += mv * 520 * dt; if (I.pressed('left')) s.spec.onTab(-1); if (I.pressed('right')) s.spec.onTab(1); },
      onSelect: () => {} });
  }
};

/* ---- the AI Hub: straight into the round, no title, no menus ---- */
scenes.hubWait = withGlobals({ enter() { game.lights.enabled = false; }, update() {}, draw(r) { r.sky(['#060506', '#100c0c']); r.overlay(g => { E.font.title(g, 'WIRETAP', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 3, colors: ['#fff6dc', '#ffcf7a', '#e08a2a'], depth: 2, depthColor: '#3a1a0a' }); E.font.text(g, 'Connecting' + '...'.slice(0, 1 + Math.floor(game.real * 2) % 3), r.W / 2, r.H / 2 + 10, '#e8e0d0', { align: 'center', outline: false }); }); } });
