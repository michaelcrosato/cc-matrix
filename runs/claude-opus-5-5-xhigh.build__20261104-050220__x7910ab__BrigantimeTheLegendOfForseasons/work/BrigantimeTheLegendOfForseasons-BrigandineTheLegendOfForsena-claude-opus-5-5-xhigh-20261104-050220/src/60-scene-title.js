// TITLE, PROLOGUE: the logo over a diorama of the continent around Meridian's clock tower (the seasons sweep round it),
// the menu (Continue, New Campaign, Skirmish, Load, How to Play, Settings, About & Credits), the version, the touch-only
// notice with its large Settings button, and the attract mode after 10 seconds without input. The prologue crawl
// plays before a new campaign (auto-advance every 5 s, or confirm).

const TU = G.UI, TP = E.px;
const TS = { t: 0, st: { f: 0 } };
G.TitleState = TS;   // read by the browser mouse test and the debug tools
G.SCENES.title = {
  view: 'threequarter', input: G.PRESET, camera: { zoom: [.55, .55], start: .55 },
  enter() {
    TS.t = 0; G.In.idle = 0; G.In.seatInput = null;
    if (!G.Camp.wm) G.Camp.wm = new G.WorldMap();
    TS.season = 0; TS.sim = TS.sim || G.CampaignSim.create({ seed: 3, humans: ['verdance'] });
    G.Camp.wm.update(TS.sim, 'spring');
    G.game.lights.enabled = true; G.game.lights.ambient = .85;
    G.game.cam.bounds = null; G.game.resetCamera && G.game.resetCamera();
    G.game.weather = { kind: 'petals', amount: .3, wind: .2 };
    G.music('title');
    G.detectTouchOnly();
    TS.items = null;
  },
  update(dt) {
    G.inputTick(dt); TS.t += dt; TU.tickToasts(dt);
    if (TU.modalUpdate()) return;
    // the diorama: the seasons sweep round every 8 seconds
    const si = Math.floor(TS.t / 8) % 4; if (si !== TS.season) { TS.season = si; const s = G.SEASONS[si]; G.Camp.wm.update(TS.sim, s); G.game.weather = s === 'spring' ? { kind: 'petals', amount: .3, wind: .2 } : G.weatherFor(s); }
    const a = TS.t * .05; G.game.focus(512 + Math.cos(a) * 60, 520 + Math.sin(a) * 40, 30);
    if (G.In.idle > 10) { G.Attract.start(); return; }
    if (G.In.touchOnly) {
      const c = G.inp().clicked && G.inp().clicked();
      if (c && TS.setBtn && c[0] >= TS.setBtn.x && c[0] < TS.setBtn.x + TS.setBtn.w && c[1] >= TS.setBtn.y && c[1] < TS.setBtn.y + TS.setBtn.h) G.game.menu('settings');
      return;
    }
    const rows = menuRows(); TS.rows = rows;
    const res = TU.nav(TS.st, TS.items || TU.synth(rows.length));
    if (res === 'pick') { const row = rows[TS.st.f]; if (row && !row.disabled) { G.sfx('ui_confirm'); row.act(); } }
    if (TU.why) { TU.toast(TU.why, TU.COL.bad); TU.why = null; }
  },
  draw(r) {
    G.Camp.wm.draw(r, TS.t);
    r.overlay(g => {
      const k = TU.k(), W = r.W, H = r.H;
      TP.blend(g, .45, 'multiply', () => TP.rect(g, 0, 0, W, H * .42, '#20184a'));
      const bob = Math.round(Math.sin(TS.t * 1.5) * 1.5);
      E.font.title(g, 'BRIGANTIME', W / 2, 16 + bob, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10', depth: 3, depthColor: '#5a2a1a', align: 'center' });
      TU.text(g, 'THE LEGEND OF FORSEASONS', W / 2, 50, '#f0e8d8', { align: 'center' });
      TU.text(g, G.ABOUT.tagline, W / 2, 61, '#b8b0c8', { align: 'center', scale: 1 });
      if (E.versionLabel) TU.text(g, 'v' + G.VERSION + ' • ' + E.versionLabel().replace(/·/g, '•'), 6, H - 10, '#8a86a0', { scale: 1 });
      if (G.In.touchOnly) {
        const w = 220, h = 70, x = Math.round((W - w) / 2), y = Math.round(H * .55);
        TU.box(g, x, y, w, h, { alpha: .96 }); TU.text(g, 'Controller or keyboard required', W / 2, y + 10, '#ffffff', { align: 'center' });
        TS.setBtn = { x: x + 50, y: y + 32, w: w - 100, h: 26 };
        TP.rect(g, TS.setBtn.x, TS.setBtn.y, TS.setBtn.w, TS.setBtn.h, '#2e3a78'); TU.text(g, 'SETTINGS', W / 2, TS.setBtn.y + 8, TU.COL.focus, { align: 'center', scale: 2 });
        return;
      }
      const rows = TS.rows || menuRows(), lh = 13 * k, mw = 130 * k, mx = Math.round(W / 2 - mw / 2), my = Math.round(Math.max(H * .5, H - rows.length * lh - 30 * k));
      TU.box(g, mx - 8, my - 6, mw + 16, rows.length * lh + 10, { alpha: .82 });
      TS.items = rows.map((row, i) => ({ x: mx, y: my + i * lh, w: mw, h: lh - 1, disabled: row.disabled }));
      rows.forEach((row, i) => { const on = i === TS.st.f, it = TS.items[i]; if (on) TP.rect(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, '#2e3a78'); TU.text(g, row.label, W / 2, it.y + 2, row.disabled ? '#6a6680' : on ? TU.COL.focus : '#ffffff', { align: 'center' }); if (on) TU.focusFrame(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, TS.t); });
    });
    if (!G.In.touchOnly) TU.prompts(r, [['up', 'Choose'], ['confirm', 'Select']]);
    TU.modalDraw(r, TS.t); TU.drawToasts(r);
  }
};
function menuRows() {
  const latest = G.game.saves && G.game.saves.latest ? G.game.saves.latest() : null;
  return [
    latest ? { label: 'Continue', act: () => G.loadLatest() } : null,
    { label: 'New Campaign', act: () => G.game.go('setup', {}) },
    { label: 'Skirmish', act: () => G.game.go('skirmishSetup', {}) },
    { label: 'Load', act: () => { if (!G.game.saves.show('load')) TU.toast('Loading needs the menu', TU.COL.bad); }, disabled: G.game.saves && G.game.saves.list && G.game.saves.list().some(s => !s.empty) ? false : 'No saved campaigns' },
    { label: 'How to Play', act: () => G.game.go('help', { back: 'title' }) },
    { label: 'Settings', act: () => G.game.menu('settings') },
    { label: 'About & Credits', act: () => G.game.go('about', { back: 'title' }) }
  ].filter(Boolean);
}

/* ---- the prologue crawl ---- */
const PR = { t: 0, i: 0 };
G.SCENES.prologue = {
  view: 'threequarter', input: G.PRESET,
  enter(d) { PR.t = 0; PR.i = 0; PR.done = d.done; G.music('title'); G.game.weather = { kind: 'ash', amount: .15, wind: .1 }; },
  update(dt) {
    G.inputTick(dt); PR.t += dt; const inp = G.inp();
    if (G.holdDone('cancel', .8) || G.holdDone('confirm', 1)) { PR.done(); return; }
    if (inp.pressed('confirm') && PR.t > .4 || PR.t > 5) { PR.i++; PR.t = 0; if (PR.i >= G.PROLOGUE.length) PR.done(); }
    G.game.focus(512, 480 - PR.i * 8, 30);
  },
  draw(r) {
    G.Camp.wm.draw(r, PR.t + PR.i * 5);
    r.overlay(g => {
      const k = TU.k(), W = r.W, H = r.H;
      TP.blend(g, .6, 'multiply', () => TP.rect(g, 0, 0, W, H, '#14102a'));
      const line = G.PROLOGUE[PR.i] || '', a = Math.min(1, PR.t * 2);
      const lines = E.font.wrap(line.replace(/\{[^}]*\}/g, ''), Math.min(W - 40, 300) * k, { scale: k });
      lines.forEach((l, i) => TU.text(g, l, W / 2, H / 2 - lines.length * 6 * k + i * 12 * k, a > .5 ? '#f0e8d8' : '#8a86a0', { align: 'center' }));
      TU.text(g, (PR.i + 1) + ' / ' + G.PROLOGUE.length, W / 2, H - 30 * k, TU.COL.dim, { align: 'center' });
    });
    TU.prompts(r, [['confirm', 'Next'], ['cancel', 'Hold: Skip']]);
  }
};
