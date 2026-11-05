/* SKILLER7 — the scenes: title (the menu, attract after 10 s idle, the touch-only notice), play (modals freeze the sim;
 * intents from the devices or the bot; the time scale for the ring, slow motion and the slalom), attract, credits, hub. */
S7.startNewGame = diffName => {
  S7.newGame({ seed: 7, difficulty: diffName || 'Piste' });
  if (S7.game.settings && S7.game.settings.difficulty !== G.difficulty) S7.game.settings.set('difficulty', G.difficulty);
  S7.enterArea('room7', 'door', { noAutosave: true });
  S7.runBeat('cold_open');
  S7.toPlay();
};
S7.toPlay = () => { UI.closeAll(); S7.game.go('play', null, { fade: 'white', seconds: .5 }); };
S7.continueGame = () => {
  const sv = S7.game.saves, l = sv && sv.latest();
  if (l && sv.load(l.slot)) return;
  S7.game.go('title');
};
const titleMenuItems = () => {
  const sv = S7.game.saves, any = !!(sv && sv.latest && sv.latest());
  return [
    { label: 'NEW GAME', onPick: () => UI.open('difficulty') },
    { label: 'CONTINUE', disabled: !any, onPick: () => S7.continueGame() },
    { label: 'LOAD', disabled: !any, onPick: () => sv.show('load', () => {}) },
    { label: 'ECHO RUN', onPick: () => S7.startEchoSolo() },
    { label: 'SETTINGS', onPick: () => S7.game.menu('settings') },
    { label: 'ABOUT & CREDITS', onPick: () => UI.open('about') }
  ];
};
S7.makeScenes = game => {
  const scenes = {};
  let titleList = null, touchNotice = false;
  scenes.title = {
    touch: [], camera: false,
    enter() { UI.closeAll(); game.paused = false; game.input.touchEnabled = false; titleList = new UI.List(titleMenuItems()); IDLE.t = 0; IDLE.lastNow = 0; S7.music('title'); S7.presenter.title && S7.presenter.title(true); G && (G.attract = false); game.timeScale = 1; S7.BOT.on = false; },
    exit() { S7.presenter.title && S7.presenter.title(false); },
    update(dt) {
      const rdt = 1 / 120;
      touchNotice = S7.touchOnly();
      const active = idleTick(rdt) || UI.modal() && false;
      if (game.paused || game.shell && game.shell.screen) IDLE.t = 0;   // (an engine settings screen open over the title: the timer counts in draw)
      if (UI.update(dt)) { if (active) IDLE.t = 0; return; }
      titleList.items = titleMenuItems();
      if (touchNotice) { const c = In.click(); if (c && UI.setBtn && inRect(c, UI.setBtn)) game.menu('settings'); }
      else titleList.update();
      if (IDLE.t >= 10) game.go('attract', null, { fade: 'white', seconds: .4 });
    },
    draw(r) {
      S7.presenter.drawTitle ? S7.presenter.drawTitle(r) : null;
      if (game.shell && game.shell.screen) { IDLE.t += 1 / 60; if (IDLE.t >= 10) { game.shell.hide && game.shell.hide(); game.go('attract'); } }
      r.overlay(g => {
        px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a'));
        const top = Math.round(r.H * .1);
        E.font.title(g, 'SKILLER', r.W / 2 - 14, top, { scale: 5, colors: ['#ffffff', '#f4f1ea', '#d8d0c8'], outline: '#05040a', depth: 3, depthColor: '#3a3438', align: 'center' });
        E.font.title(g, '7', r.W / 2 + tw('SKILLER', 5) / 2 - 6, top, { scale: 5, colors: ['#ff5060', RED, '#8a0a14'], outline: '#05040a', depth: 3, depthColor: '#3a0a10' });
        txt(g, 'SEVEN KILLERS, ONE MOUNTAIN', r.W / 2 - tw('SEVEN KILLERS, ONE MOUNTAIN') / 2, top + 46, RED);
        if (touchNotice) {
          const s1 = 'CONTROLLER OR KEYBOARD REQUIRED', s2 = 'Connect a controller or a keyboard to play';
          txt(g, s1, r.W / 2 - tw(s1, 2) / 2, r.H * .5, INK, { scale: 2 }); txt(g, s2, r.W / 2 - tw(s2) / 2, r.H * .5 + 22, MUTED);
          UI.setBtn = [r.W / 2 - 60, r.H * .5 + 44, 120, 24]; box(g, UI.setBtn[0], UI.setBtn[1], 120, 24, { bg: [RED, '#8a1018'], border: INK }); txt(g, 'SETTINGS', r.W / 2 - tw('SETTINGS', 2) / 2, UI.setBtn[1] + 5, INK, { scale: 2 });
        } else if (!UI.modal()) {
          titleList.draw(g, r.W / 2 - 90, Math.round(r.H * .42), 180, { scale: 2, rh: 19 });
          UI.prompts(g, r, [['confirm', 'SELECT']], r.H - Math.round(r.H * .05) - 12);
        }
        txt(g, 'v' + S7.VERSION + ' · ' + S7.BUILD + ' · my-3D2dge ' + (E.version || ''), Math.round(r.W * .05), r.H - Math.round(r.H * .05) - 2, '#5a5460');
        UI.draw(g, r);
      });
    }
  };
  scenes.play = {
    pausable: true, touch: [], camera: false,
    enter() { if (!G) { S7.newGame({}); S7.enterArea('room7', 'door', { noAutosave: true }); } S7.presenter.enterArea(G.area); S7.music((S7.AREAS[G.area] || {}).music); game.input.touchEnabled = false; },
    update(dt) {
      if (UI.update(dt)) return;
      const I = S7.BOT.on ? S7.bot.intent(dt) : readHumanIntent(dt);
      if (!S7.BOT.on) UI.worldIntent(I);
      if (!S7.BOT.on && I.ringReleased && G.mode !== 'ring') { /* (a tap while aiming: the scan has it) */ }
      if (G.cut && !S7.BOT.on && game.input.pressed('start') && !UI.modal()) UI.open('skip');
      const slalomAim = G.boss && G.boss.id === 'hansi' && G.boss.phase === 2 && G.aim.on;
      game.timeScale = (G.mode === 'ring' ? .15 : G.slowmo ? .5 : slalomAim ? .6 : 1) * T.timeScale * (CHEATS.slowCrit && game.timeScale < .3 ? 1 : 1);
      simUpdate(dt, I);
      S7.presenter.step(dt);
      if (G.mode === 'results' && !UI.modal()) UI.open('results');
      if (G.mode === 'gameover' && G.gameoverT > 1.2 && !UI.modal()) { S7.music('gameover', { restart: true }); UI.open('gameover'); }
      if (G.mode === 'end') game.go('credits', null, { fade: 'black', seconds: 1 });
      if (I.map && G.mode === 'play' && !G.aim.on && !(S7.hubActive && S7.hubActive())) UI.open('map');
    },
    draw(r) { S7.presenter.draw(r); r.overlay(g => { UI.hud(g, r, 1 / 60); UI.draw(g, r); }); }
  };
  scenes.attract = S7.attractScene(game);
  scenes.credits = {
    touch: [],
    enter() { S7.music('credits'); this.t = 0; },
    update(dt) { this.t += dt; if (this.t > 2 && (game.input.anyPressed() || In.click())) game.go('title'); if (this.t > 90) game.go('title'); },
    draw(r) {
      r.overlay(g => {
        px.rect(g, 0, 0, r.W, r.H, '#000');
        const L = S7.CREDITS, y0 = r.H - this.t * 22;
        L.forEach((l, i) => { const y = y0 + i * 20; if (y < -20 || y > r.H + 10) return; const big = l.startsWith('#'), s = big ? l.slice(1) : l; txt(g, s, r.W / 2 - tw(s, big ? 2 : 1) / 2, y, big ? RED : INK, { scale: big ? 2 : 1 }); });
        if (this.t > 2) UI.prompts(g, r, [['confirm', 'TITLE']], r.H - 16);
      });
    }
  };
  if (S7.hubScene) scenes.hub = S7.hubScene(game);
  return scenes;
};
