/* TITLE + CUTSCENES + START */
UI.cutscene = (pages, done, opt) => {
  opt = opt || {}; let i = 0, skipped = false; const cut = { skip() { if (skipped) return; skipped = true; UI.cut = null; UI.curCut = null; UI.dlg.close(); UI.applyTimeScale(); if (done) done(); } };
  const next = () => { if (skipped) return; if (i >= pages.length) { UI.cut = null; UI.curCut = null; if (done) done(); return; } const pg = pages[i++]; UI.cut = true; UI.curCut = cut; UI.say(pg, { name: opt.name || '', voice: opt.voice || B.VOICES.narrator, place: 'middle', done: next }); };
  next(); return cut;
};
const touchOnly = () => { const c = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !(matchMedia('(hover: hover)').matches); return c && !UI.seenKeys; };
UI.touchOnly = touchOnly;
UI.idle = 0;
UI.titleItems = () => {
  const items = []; if (game.saves && game.saves.any) items.push(['Continue', 'continue']); items.push(['New Game', 'new'], ['Load Game', 'load'], ['Rat Run', 'rat'], ['Settings', 'settings'], ['About & Credits', 'about']); return items;
};
UI.titleFocus = new UI.Focus();
scenes.title = {
  view: 'iso', input: UI.INPUT(),
  enter() {
    if (B.inSession()) { game.go('race'); return; }
    UI.attract = false; UI.screen = null; UI.idle = 0; game.timeScale = 1; if (!B.S || B.S.race || B.S.over || B.S.ended || B.S.floor !== 'f1') B.startGame(4242); B.S.party.cx = 3; B.S.party.cy = 12; B.S.party.dir = 0; V.enter('f1'); B.Music.cur = null; B.Music.play('title'); UI.titleT = 0; UI.titleFocus.cur = 0; UI.titleFocus.id = null;
    V.camOverride = (w) => { const t = UI.titleT, k = Math.min(1, t / 40); w.camera.fixed = { x: 3 * 32 + 16 + Math.sin(t * .15) * 6, y: 12 * 32 + 16 - k * 30, z: 26 + Math.sin(t * .3) * 1.5, yaw: -Math.PI / 2 + Math.sin(t * .2) * .08, pitch: -.02, fov: 62 }; };
  },
  exit() { V.camOverride = null; },
  update(dt) {
    UI.titleT += dt; const inp = game.input; if (inp.lastDevice === 'gamepad' && inp.anyPressed()) UI.seenKeys = true;
    const anyIn = inp.anyPressed() || (inp.held && inp.held.size > 0) || (inp.padAxes || []).some(a => Math.abs(a) > .3) || UI.pointerMoved();
    if (UI.screen) { UI.idle = 0; UI.screen.update(dt); B.update(dt); V.update(dt); UI.pump(); return; }
    if (anyIn) UI.idle = 0; else UI.idle += dt;
    if (UI.idle >= 10) { UI.idle = 0; game.go('attract'); return; }
    const items = UI.titleItems(), F = UI.titleFocus; F.begin(); const r = game.r || { W: game.W, H: game.H }; const bw = 120, bh = 15, x0 = Math.round((r.W - bw) / 2), y0 = Math.round(r.H * .5);
    items.forEach((it, i) => F.add(it[1], x0, y0 + i * (bh + 2), bw, bh)); const res = F.run();
    if (res && (res.act === 'confirm' || res.act === 'click') && res.item) UI.titleAct(res.item.id);
    B.update(dt); V.update(dt); UI.pump(); if ((UI.titleT % 12) < dt) game.shake(2);
  },
  draw(r) {
    if (V.cur) V.cur.draw(r);
    r.overlay(g => {
      UI.veil(g, r, .38); const E2 = E, cx = Math.round(r.W / 2);
      UI.title(g, 'EYE OF THE', cx, Math.round(r.H * .06), { scale: 2 }); UI.title(g, 'BOLT-HOLDER', cx, Math.round(r.H * .06) + 22, { scale: 4 });
      UI.text(g, B.TAGLINE, cx, Math.round(r.H * .06) + 62, '#ffd8a0', { align: 'center' });
      const sh = (Math.sin(UI.titleT * 1.2) + 1) / 2; g.fillStyle = 'rgba(255,240,200,' + (.15 * sh) + ')'; g.fillRect(cx - 80 + Math.floor(sh * 160), Math.round(r.H * .06) + 22, 3, 30);
      if (UI.screen) { UI.screen.draw(g, r); return; }
      const items = UI.titleItems(), F = UI.titleFocus;
      items.forEach((it, i) => { const q = F.items[i]; if (!q) return; const sel = F.cur === i; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sel }); UI.text(g, it[0], q.x + q.w / 2, q.y + 4, sel ? UI.PAL.focus : UI.PAL.text, { align: 'center' }); });
      if (UI.touchOnly()) { const w = Math.min(r.W - 8, 250), ls = UI.wrap('Connect a controller or a keyboard to play.', w - 12), h = 22 + ls.length * 9; UI.panel(g, Math.round(cx - w / 2), r.H - h - 12, w, h); UI.text(g, 'Controller or keyboard required.', cx, r.H - h - 6, UI.PAL.focus, { align: 'center' }); ls.forEach((l, i) => UI.text(g, l, cx, r.H - h + 6 + i * 9, UI.PAL.text, { align: 'center' })); }
      else UI.prompts(g, [['confirm', 'Select'], ['up', 'Move']], cx, r.H - 14, { center: true });
      UI.text(g, 'v' + B.VERSION + ' - ' + E.versionLabel().replace(/[^\x20-\x7e]/g, '-'), 4, r.H - 10, UI.PAL.dim, { font: 'tiny' });
    });
    if (UI.dlg) UI.dlg.draw(r);
  }
};
UI.lastPtr = null;
UI.pointerMoved = () => { const p = game.input.pointer && game.input.pointer(); if (!p) return false; const l = UI.lastPtr; UI.lastPtr = p.slice(); return !!(l && Math.abs(l[0] - p[0]) + Math.abs(l[1] - p[1]) > 4) || !!game.input.clicked(); };
UI.titleAct = (id) => {
  switch (id) {
    case 'continue': { const s = game.saves.latest(); if (s) game.saves.load(s.slot); break; }
    case 'new': UI.open('create'); break;
    case 'load': game.saves.show('load'); break;
    case 'rat': B.startRace(Date.now() % 100000); game.go('race'); break;
    case 'settings': game.menu('settings'); break;
    case 'about': UI.open('about'); break;
  }
};
UI.beginCampaign = (members, diff) => {
  B.startGame((Date.now() & 0xffffff) | 1, members, diff || game.settings.difficulty || 'normal'); game.go('play', { intro: true });
};
