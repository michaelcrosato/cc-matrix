/* SCENES: title (over Room 7, the camera drifting toward the snowing window; idle 10 s → attract), play (Room 7 is a
 * mode of play), results, game over, credits. The modal manager opens canvas screens over play or the title. */
S7.ui = {
  modal: null, kind: null, msgs: [],
  open(kind, o = {}) { const C = S7.MODALS[kind]; if (!C) return; this.modal = new C(Object.assign({ sim: S7.sim }, o)); this.kind = kind; if (S7.sim) S7.sim.uiOpen = true; S7.sfx('confirm'); if (S7.game.audio.duck) S7.game.audio.duck(true); this.pausable(false); },
  /** while a screen is open, Escape and Options close it instead of pausing */
  pausable(on) { if (!S7.scenes) return; for (const k of ['play', 'echorun']) if (S7.scenes[k]) S7.scenes[k].pausable = on; },
  close() { const m = this.modal; this.modal = null; this.kind = null; this.pausable(true); if (S7.sim) S7.sim.uiOpen = false; if (S7.game.audio.duck) S7.game.audio.duck(false); S7.game.input.consumeAll(); if (m && m.onClose) m.onClose(); return m; },
  update() { if (!this.modal) return false; const nv = UI.nav(S7.game); this.modal.t += 1 / 120; if (this.modal.update(nv) === 'close') this.close(); return true; },
  draw(r) { if (this.modal) r.overlay(g => this.modal.draw(g, r)); this.drawMsgs(r); },
  toastMsg(text) { this.msgs.push({ text, at: typeof performance !== 'undefined' ? performance.now() : 0, t: 0 }); },
  drawMsgs(r) { if (!this.msgs.length) return; r.overlay(g => { let y = Math.round(r.H * .05) + 32; for (const m of this.msgs) { m.t = typeof performance !== 'undefined' ? (performance.now() - m.at) / 1000 : m.t + 1 / 60; UI.text(g, m.text, r.W / 2, y, '#ffe0a0', { align: 'center' }); y += 10; } }); this.msgs = this.msgs.filter(m => m.t < 3.5); }
};

/** the free camera (Dev Mode) */
S7.freeCam = (game, sim, dt) => {
  const P = S7.pres, I = game.input, c = P.free || (P.free = Object.assign({}, sim.cam.pose));
  const mv = I.move(), pa = I.padAim || [0, 0], m = S7.mouseDelta(), sp = 320 * dt;
  c.yaw += (pa[0] * 2.2 * dt) + m[0] * .003; c.pitch = clamp(c.pitch - pa[1] * 1.6 * dt - m[1] * .003, -1.4, 1.4);
  const f = [Math.cos(c.yaw), Math.sin(c.yaw)], r = [-f[1], f[0]];
  c.x += (f[0] * -mv[1] + r[0] * mv[0]) * sp; c.y += (f[1] * -mv[1] + r[1] * mv[0]) * sp;
  if (I.down('pageR')) c.z += sp; if (I.down('pageL')) c.z -= sp;
  if (S7.pres.cur) S7.pres.cur.world.camera.capture = true;
};
S7.makeScenes = (game, sim, pres, hud, audio, voice) => {
  const scenes = {};
  const snd = () => { if (audio) audio.update(1 / 60); };
  /* ---------------- title ---------------- */
  let titleMenu = null, titleT = 0;
  const hasSave = () => { try { return !!(game.saves && game.saves.latest()); } catch (e) { return false; } };
  const buildTitle = () => {
    titleMenu = new ListMenu([
      { label: 'NEW GAME', on: () => S7.ui.open('difficulty', { onDone: true }) },
      { label: 'CONTINUE', disabled: !hasSave(), on: () => S7.continueGame() },
      { label: 'LOAD', disabled: !hasSave(), on: () => { if (game.saves && game.saves.show) game.saves.show('load', s => { if (s) game.go('play', { loaded: true }); }); } },
      { label: 'ECHO RUN', on: () => game.go('echorun', {}) },
      { label: 'SETTINGS', on: () => game.menu('settings') },
      { label: 'ABOUT & CREDITS', on: () => S7.ui.open('about') }
    ], { i: hasSave() ? 1 : 0 });
    S7.titleMenu = titleMenu;   // for tests and the bot: which item has the focus, and where each is drawn
  };
  scenes.title = {
    input: S7.INPUT, touch: [],
    enter() {
      sim.o.attract = false; sim.o.bot = false; S7.Input.reset(); titleT = 0;
      sim.titleBackdrop(); audio && audio.music('title'); buildTitle(); game.input.consumeAll();
      if (game.input.touchEnabled !== undefined) game.input.touchEnabled = false;
    },
    update(dt) {
      S7.Input.tick(dt); titleT += dt;
      sim.update(dt, S7.noIntents()); pres.step(dt); snd();
      const m = S7.ui.modal;
      if (m) {
        S7.ui.update();
        if (!S7.ui.modal && S7.ui.kind === null && m instanceof DifficultyModal && m.result && m.result !== 'back') { S7.newGame(m.result); return; }
        
      } else {
        const touch = S7.touchOnly();
        if (touch) { const c = game.input.clicked && game.input.clicked(); if (c && UI.hit(c, ...(this.setBox || [0, 0, 0, 0]))) game.menu('settings'); }
        else titleMenu.update(UI.nav(game), game);
      }
      if (game.shell && game.shell.screen) S7.Input.idleShell = (S7.Input.idleShell || 0) + dt; else S7.Input.idleShell = 0;
      // 10 s without input on the title or a menu starts attract mode; the About pages are reading, so they allow a minute
      if (S7.Input.idle > (S7.ui.kind === 'about' ? 60 : 10) && !S7.inSession) { if (S7.ui.modal) S7.ui.close(); if (game.shell && game.shell.screen) game.shell.hide(); game.go('attract', {}); }
    },
    draw(r) {
      pres.draw(r);
      r.overlay(g => {
        UI.veil(g, r, .35, '#05030a');
        const S = UI.safe(r);
        UI.title(g, 'SKILLER', r.W / 2 - 14, S.y0 + 8, 5);
        E.font.title(g, '7', r.W / 2 + E.font.width('SKILLER', { scale: 5 }) / 2 - 6, S.y0 + 8, { scale: 5, colors: ['#ff5060', '#d81e2a', '#a01018'], outline: INK, depth: 2, depthColor: '#2a0a0e' });
        UI.text(g, 'SEVEN KILLERS, ONE MOUNTAIN', r.W / 2, S.y0 + 58, RED, { align: 'center', scale: 1 });
        if (S7.touchOnly()) {
          UI.panel(g, r.W / 2 - 150, r.H * .45, 300, 70, .85);
          UI.big(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H * .45 + 8, 1);
          UI.text(g, 'Connect a controller or a keyboard to play.', r.W / 2, r.H * .45 + 24, MUTED, { align: 'center' });
          scenes.title.setBox = [r.W / 2 - 50, r.H * .45 + 40, 100, 20];
          UI.panel(g, ...scenes.title.setBox, 1, RED); UI.text(g, 'SETTINGS', r.W / 2, r.H * .45 + 44, '#ffffff', { align: 'center', scale: 2 });
        } else titleMenu.draw(g, r.W / 2, r.H * .42, { scale: 2, lh: 13, gap: 8 });
        UI.text(g, 'v' + S7.VERSION + ' · ' + S7.BUILD + ' · my-3D2dge ' + E.version, S.x0, S.y1 - 6, '#6a6570');
        if (!S7.touchOnly()) UI.prompt(g, [['confirm', 'SELECT']], S.x1, S.y1 - 8, { align: 'right' });
      });
      S7.ui.draw(r);
    }
  };
  /* ---------------- play ---------------- */
  scenes.play = {
    pausable: true, input: S7.INPUT, touch: [],
    enter(d = {}) {
      sim.o.attract = false; sim.o.bot = !!d.bot || S7.bot.active; sim.titleMode = false; sim.hideHero = false; game.input.consumeAll();
      if (sim.st) audio && audio.areaMusic(sim.st.area);
    },
    update(dt) {
      S7.Input.tick(dt); hud.update(dt);
      if (S7.ui.update()) { pres.step(0); return; }
      if (sim.uiRequest && !S7.bot.active) { const q = sim.uiRequest; sim.uiRequest = null; if (q.kind === 'save') { if (game.saves && game.saves.show && !S7.inSession) { game.saves.canSave = true; game.saves.show('save', () => { game.saves.canSave = false; }); } } else S7.ui.open(q.kind, q); return; }
      if (sim.mode === 'gameover') { game.go('gameover', {}); return; }
      if (sim.resultsReady !== null && sim.resultsReady !== undefined) { const t = sim.resultsReady; sim.resultsReady = null; game.go('results', { target: t }); return; }
      if (sim.creditsReady) { sim.creditsReady = false; game.go('credits', {}); return; }
      // Dev Mode's free camera: the sticks or WASD and the mouse fly it, Q / E go down and up; the sim holds still
      if (CHEAT.freeCam && S7.pres) { S7.freeCam(game, sim, dt); pres.step(0); return; }
      if (S7.pres) S7.pres.free = null;
      const I = S7.bot && S7.bot.active ? S7.bot.intents(sim) : S7.readIntents(game, hud);
      if (I.mapP && !sim.aim.on && !sim.talk && !sim.cutscene && !S7.inSession) { S7.ui.open('map'); return; }
      game.timeScale = T.timeScale * (sim.slowmo ? sim.slowmo.k : 1);
      if (sim.slowmo) { sim.slowmo.t -= dt; if (sim.slowmo.t <= 0) sim.slowmo = null; }
      sim.update(dt, I);
      pres.step(dt); snd();
      if (voice) voice.talkTick(sim.talk);
      // the pointer lock follows aim mode with the mouse in look mode
      S7.pointerLock(sim.aim.on && game.settings.mouseMode !== 'pointer' && game.input.lastDevice !== 'gamepad' && !S7.bot.active);
    },
    exit() { S7.pointerLock(false); game.timeScale = 1; },
    draw(r) { pres.draw(r); if (!S7.ui.modal) hud.draw(r); S7.ui.draw(r); }
  };
  /* ---------------- results (§7.20): the rank badge and six stats, the Concierge's note ---------------- */
  let res = null, resMenu = null;
  scenes.results = {
    input: S7.INPUT,
    enter(d) {
      const t = d.target, R = sim.st.results[t]; R.done = true;
      res = { t, R, rank: S7.rankOf(R, t), time: 0 };
      sim.st.flags['rank' + t] = res.rank.id;
      audio && audio.music('rank');
      resMenu = new ListMenu([{ label: 'CONTINUE', on: () => { game.go('play', {}); sim.startBeat(t === 0 ? 't00_results_done' : 'epilogue'); } }]);
    },
    update(dt) { S7.Input.tick(dt); res.time += dt; if (res.time > 1) resMenu.update(UI.nav(game)); pres.step(0); },
    draw(r) {
      pres.draw(r);
      r.overlay(g => {
        UI.veil(g, r, .86, '#08060a'); const R = res.R, S = UI.safe(r);
        UI.big(g, 'TARGET ' + String(res.t).padStart(2, '0') + ' — ' + (res.t === 0 ? 'TURN-DOWN SERVICE' : 'APRÈS'), r.W / 2, S.y0, 2);
        const k = Math.min(1, res.time / .6);
        S7.drawRank(g, res.rank.id, r.W / 2, S.y0 + 44, 10 + 12 * k);
        UI.text(g, res.rank.name, r.W / 2, S.y0 + 70, '#ffffff', { align: 'center', scale: 2 });
        const crit = R.kills ? Math.round(R.crits / R.kills * 100) : 0;
        const stats = [['TIME', S7.fmtTime(R.time, false)], ['WHITEOUTS THAWED', R.kills], ['CRITICAL', crit + '%'], ['RED COLLECTED', R.red], ['PERSONAS FROZEN', R.frozen], ['HINTS BOUGHT', R.hints]];
        stats.forEach(([l, v], i) => { const x = r.W * (i % 2 ? .56 : .14), y = S.y0 + 92 + Math.floor(i / 2) * 22; UI.text(g, l, x, y, MUTED); UI.text(g, String(v), x + r.W * .3, y - 2, '#ffffff', { scale: 2, align: 'right' }); });
        const note = { dblack: 'Impeccable. The Department has no notes.', black: 'Clean work. A little mess on the carpet.', blue: 'The guest checked out. Some of the staff did too.', green: 'Messy, Madame. Housekeeping will bill you.' }[res.rank.id];
        UI.text(g, 'CONCIERGE: "' + note + '"', r.W / 2, S.y0 + 164, '#e0dcd4', { align: 'center', wrap: r.W * .8 });
        if (res.time > 1) resMenu.draw(g, r.W / 2, S.y1 - 22, { scale: 2 });
      });
    }
  };
  /* ---------------- game over: Continue (the newer of the autosave and the clock's) or Quit ---------------- */
  let goMenu = null, goT = 0;
  scenes.gameover = {
    input: S7.INPUT,
    enter() {
      goT = 0; audio && audio.music('gameover');
      goMenu = new ListMenu([{ label: 'CONTINUE', on: () => S7.continueGame(true) }, !S7.inSession && { label: 'QUIT TO TITLE', on: () => game.go('title') }].filter(Boolean));
    },
    update(dt) { S7.Input.tick(dt); goT += dt; if (goT > 1.2) goMenu.update(UI.nav(game)); pres.step(0); },
    draw(r) { pres.draw(r); r.overlay(g => { UI.veil(g, r, Math.min(.85, goT), '#000'); UI.title(g, 'THE MOUNTAIN KEEPS YOU.', r.W / 2, r.H * .3, 2, { colors: ['#ffffff', '#c8d8f0', '#8aa8d8'] }); if (goT > 1.2) goMenu.draw(g, r.W / 2, r.H * .55, { scale: 2, lh: 13, gap: 8 }); }); }
  };
  /* ---------------- credits (after the epilogue): big type scrolling, then the title ---------------- */
  let cr = 0;
  scenes.credits = {
    input: S7.INPUT,
    enter() { cr = 0; audio && audio.music('epilogue'); },
    update(dt) { S7.Input.tick(dt); cr += dt; if (cr > 3 && (game.input.anyPressed() || cr > S7.CREDITS.length * 2.2 + 8)) game.go('title'); },
    draw(r) {
      r.overlay(g => {
        UI.rect(g, 0, 0, r.W, r.H, '#000');
        const y0 = r.H - cr * 26;
        S7.CREDITS.forEach((l, i) => { const y = y0 + i * 22; if (y < -20 || y > r.H + 10) return; if (l[0]) UI.text(g, l[0], r.W / 2, y, RED, { align: 'center' }); UI.text(g, l[1], r.W / 2, y + 9, '#f4f1ea', { align: 'center', scale: l[2] || 1 }); });
      });
    }
  };
  return scenes;
};

/** a rank badge: one or two black diamonds, a blue square, a green circle (white-edged, readable on any ground) */
S7.drawRank = (g, id, x, y, r) => {
  const dia = (cx, c) => { UI.diamond(g, cx, y, r + 2, '#f4f1ea', true); UI.diamond(g, cx, y, r, c, true); };
  if (id === 'dblack') { dia(x - r * .9, '#101014'); dia(x + r * .9, '#101014'); }
  else if (id === 'black') dia(x, '#101014');
  else if (id === 'blue') { UI.rect(g, x - r - 2, y - r - 2, 2 * r + 4, 2 * r + 4, '#f4f1ea'); UI.rect(g, x - r, y - r, 2 * r, 2 * r, '#2a6ad8'); }
  else { E.px.disc(g, x, y, r + 2, '#f4f1ea'); E.px.disc(g, x, y, r, '#2aa04a'); }
};
/** the title's backdrop: Room 7 in the sim, nobody walking, the camera drifting over the bed toward the window */
Sim.prototype.titleBackdrop = function () {
  this.resetTransient();
  this.st = this.freshState('piste'); this.o.noClock = true;
  this.enterArea('room7', 'door', { silent: true, noEnter: true, noSave: true });
  this.titleMode = true; this.hideHero = true;
  this.camOverride = { t: 0, at: t => [(9.5 - Math.sin(t * .05) * 2) * M, (8.8 - t * .02 % 3) * M, (2.6 + Math.sin(t * .1) * .3) * M], look: t => [(5 + Math.sin(t * .07) * 2) * M, 1.6 * M, 1.4 * M], fov: 54 };
  this.toasts = [];
};
