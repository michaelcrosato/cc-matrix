/* ---- TITLE (12.1): the Ol' Icebox at night, spotlights sweeping the ice, two teams skating lazily (the real AI), the
 * logo slamming in, PRESS ANY BUTTON, then six big tiles: CUP RUN, EXHIBITION, PRACTICE, RECORDS, SETTINGS, ABOUT.
 * Touch-only devices: "Controller or keyboard required" and a big SETTINGS button. 10 s idle: the attract reel ---- */
const Title = (() => {
  const st = { sawPad: false, sawKey: false };
  if (!NODE && typeof addEventListener !== 'undefined') { addEventListener('keydown', () => { st.sawKey = true; }, true); addEventListener('gamepadconnected', () => { st.sawPad = true; }); }
  /** a lazy AI game behind the title and menus */
  function background() {
    const homes = Save.data.finished ? ['muskrats'] : ['muskrats'], away = ['drillers', 'lumberjacks', 'bruisers', 'marauders'][Math.floor(RNG.fx() * 4)];
    const m = Match.create({ mode: 'title', home: homes[0], away, arena: 'icebox', humans: [], intros: false, replays: 'off', rules: { fights: false, items: false, hazards: false, clock: false, boom: false }, seed: Math.floor(RNG.fx() * 1e6) });
    m.setPhase('intro', .1); return m;
  }
  return { st, background, get sawPad() { return st.sawPad; }, get sawKey() { return st.sawKey; } };
})();

scenes.title = {
  view: 'threequarter', views: ['threequarter'], camera: { zoom: false },
  enter(d) {
    d = d || {};
    this.state = d.menu ? 'menu' : 'press'; this.t = 0; this.slam = d.menu ? 1 : 0;
    this.m = Title.background(); World.prepare(this.m); L.enabled = true; L.ambient = .42; Cam.snap(Rink.C.x, Rink.C.y);
    Synth.music('theme');
    const S2 = Save, cont = S2.totalStars() > 0 || Object.keys(S2.data.done).length;
    this.tiles = new UI.Tiles([
      { id: 'cup', label: 'CUP RUN', sub: cont ? (S2.data.finished ? 'CUP WON · REPLAY IT' : 'CONTINUE · CHAPTER ' + Math.min(5, S2.nextChapter())) : 'NEW · SAVE THE ICEBOX', icon: (g, x, y, w, h) => Cup.draw(g, x + w / 2, y + 14, 1) },
      { id: 'exh', label: 'EXHIBITION', sub: '1-4 PLAYERS', icon: (g, x, y, w, h) => { Logo.draw(g, 'muskrats', x + w / 2 - 22, y + 5, 20); Logo.draw(g, 'drillers', x + w / 2 + 2, y + 5, 20); } },
      { id: 'prac', label: 'PRACTICE', sub: "MARGE'S 7 DRILLS", icon: (g, x, y, w, h) => { px.rect(g, x + w / 2 - 10, y + 8, 20, 14, '#1a3a20'); px.rect(g, x + w / 2 - 9, y + 9, 18, 12, '#2a5a30'); E.font.text(g, 'X O', x + w / 2, y + 12, '#ffffff', { align: 'center', font: 'tiny', outline: false }); } },
      { id: 'rec', label: 'RECORDS', sub: 'STARS, SHOTS, HITS', icon: (g, x, y, w, h) => E.font.text(g, '★', x + w / 2, y + 8, UI.GOLD, { align: 'center', scale: 2, outline: '#000' }) },
      { id: 'set', label: 'SETTINGS', sub: 'CAMERA, SOUND, CONTROLS', icon: (g, x, y, w, h) => { px.disc(g, x + w / 2, y + 15, 7, '#9fb2cc'); px.disc(g, x + w / 2, y + 15, 3, '#0e1830'); } },
      { id: 'about', label: 'ABOUT', sub: 'CREDITS AND NOTES', icon: (g, x, y, w, h) => E.font.text(g, '?', x + w / 2, y + 8, '#7ab8ff', { align: 'center', scale: 2, outline: '#000' }) }
    ], { cols: 3, w: 116, h: 54, gap: 8, i: d.tile || 0, onPick: it => this.pick(it.id) });
    UI.Idle.reset(); game.input.consumeAll();
  },
  pick(id) {
    if (id === 'cup') game.go('storymap', null, { fade: 'wipe' });
    else if (id === 'exh') game.go('sides', null, { fade: 'wipe' });
    else if (id === 'prac') game.go('practice', null, { fade: 'wipe' });
    else if (id === 'rec') game.go('records', null, { fade: 'wipe' });
    else if (id === 'set') game.menu('settings');
    else if (id === 'about') game.go('about', null, { fade: 'wipe' });
  },
  update(dt) {
    this.t += dt; this.slam = Math.min(1, this.slam + dt * 2.2);
    const m = this.m; Match.m = m;
    Match.step(dt); Crowd.step(dt, m); Fx.frame(m, dt); Cam.update(m, dt, { zoom: .66 });
    if (m.phase === 'goal' && m.phaseT < -2.5) Match.placeFaceoff(m, 'center');
    if (game.paused || (game.shell && game.shell.screen)) { UI.Idle.reset(); return; }
    const idle = UI.Idle.step(dt);
    if (idle > 10) return game.go('attract', null, { fade: 'dissolve' });
    const touch = touchOnly();
    if (touch) { const ck = game.input.clicked(); if (ck && this.setBtn && ck[0] >= this.setBtn[0] && ck[0] < this.setBtn[0] + this.setBtn[2] && ck[1] >= this.setBtn[1] && ck[1] < this.setBtn[1] + this.setBtn[3]) game.menu('settings'); return; }
    if (this.state === 'press') {
      if (this.t > .5 && game.players.some(I => I.anyPressed()) || game.input.clicked()) { this.state = 'menu'; Synth.horn(false, 1.4); P.explosion(Rink.C.x, Rink.C.y, 20, 1.2, { freeze: false, shake: 0, debris: false }); game.players.forEach(I => I.consumeAll()); Synth.sfx('menuSel'); }
      return;
    }
    this.tiles.update(dt);
    if (UI.anyP('cancel')) { this.state = 'press'; Synth.sfx('menuBack'); }
  },
  draw(r) {
    const m = this.m; World.draw(r, m);
    const t = game.real;
    // spotlights sweeping the ice
    for (let i = 0; i < 3; i++) { const x = Rink.C.x + Math.sin(t * .5 + i * 2.1) * 300, y = Rink.C.y + Math.cos(t * .37 + i) * 120; L.add(x, y, 40, 110, 1.1, { color: ['#ffffff', '#ffe8c0', '#cfe8ff'][i] }); }
    r.overlay(g => {
      px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#5a6a8a'));
      const s = this.slam, k = s < 1 ? 1 + (1 - E.ease.outBack(s)) * 2 : 1, logoY = this.state === 'press' ? r.H * .22 : 10, fit = Math.floor((r.W - 16) / Math.max(1, E.font.width('ICE HOC-KABOOM'))), sc = Math.max(1, Math.min(fit, Math.round((r.W > 400 ? 5 : 4) * k * (this.state === 'menu' ? .8 : 1))));
      E.font.title(g, 'ICE HOC-KABOOM', r.W / 2 + (s < 1 ? Math.sin(t * 60) * (1 - s) * 4 : 0), logoY, { align: 'center', scale: sc, colors: ['#ffffff', '#cfe8ff', '#ffb347', '#ff6a2a', '#c8202a'], depth: 4, depthColor: '#1a0a14' });
      if (Save.data.finished) Cup.draw(g, r.W / 2 + E.font.width('ICE HOC-KABOOM', { scale: sc }) / 2 + 14, logoY + sc * 3, 1.4);
      const touch = touchOnly();
      if (touch) {
        const bs = r.W >= 420 ? 2 : 1, bw = Math.min(r.W - 12, 300); UI.panel(g, r.W / 2 - bw / 2, r.H * .5, bw, 40, { border: '#ff8a8a' }); E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H * .5 + (bs > 1 ? 8 : 10), '#ffffff', { align: 'center', scale: bs, outline: '#000' });
        E.font.text(g, bs > 1 ? 'Connect a gamepad or a keyboard to play. The demo plays on.' : 'Connect a gamepad or keyboard.', r.W / 2, r.H * .5 + 26, UI.MUTED, { align: 'center', outline: false });
        this.setBtn = [r.W / 2 - 60, r.H * .5 + 50, 120, 30]; UI.panel(g, this.setBtn[0], this.setBtn[1], 120, 30, { focus: true }); E.font.text(g, 'SETTINGS', r.W / 2, this.setBtn[1] + 10, UI.GOLD, { align: 'center', scale: 2, outline: '#000' });
      } else if (this.state === 'press') {
        E.font.text(g, 'OVER-THE-TOP 3-ON-3 ARCADE HOCKEY', r.W / 2, logoY + sc * 9 + 6, '#ffe8a0', { align: 'center', outline: '#000' });
        if (Math.floor(t * 2) % 2 === 0) Glyphs.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H * .7, { align: 'center', color: '#ffffff', scale: 2 });
      } else {
        this.tiles.y = Math.max(logoY + 46, Math.round(r.H / 2 - 50)); this.tiles.draw(g, r);
        const it = this.tiles.items[this.tiles.i], key = { cup: 'cuprun', exh: 'exhibition', prac: 'practice', rec: 'records', set: 'settings', about: 'about' }[it.id];
        E.font.text(g, TEXT.blurbs[key], r.W / 2, this.tiles.y + 124, '#cfe0f4', { align: 'center', outline: '#000' });
        UI.legend(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
      }
      E.font.text(g, E.versionLabel() + ' · ' + GAME_TITLE + ' ' + VERSION, 6, r.H - 10, '#6a7a90', { outline: false });
    });
  }
};
