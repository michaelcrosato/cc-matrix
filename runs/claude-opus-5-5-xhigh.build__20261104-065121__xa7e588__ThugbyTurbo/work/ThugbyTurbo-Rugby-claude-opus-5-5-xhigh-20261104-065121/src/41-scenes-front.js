/* ---- THE FRONT: a live CPU match behind the menus (the real presentation), the title, the main menu, records, about,
 * the idle clock that starts the attract mode after 10 s ---- */
const BG = TT.BG = {
  m: null, pres: null, venue: null, t: 0,
  ensure(venue = 'muddington', home = 'mud', away = 'bad', time = 'night') {
    if (this.m && this.venue === venue + time) return;
    this.venue = venue + time;
    this.m = new TT.Match({ home, away, venue, time, seed: 4242 + venue.length, noClock: true, skipIntro: true, noPowerups: true, noHazard: true, halfLen: 9999, attract: false });
    this.m.goPhase('kickoff');
    this.pres = new TT.Pres(this.m);
    TT.cheatsSaved = null;
  },
  update(dt) {
    const m = this.m; if (!m) return;
    TT.bus.muted = true;
    try { m.step(dt); } finally { TT.bus.muted = false; }
    if (m.over || m.t > 400) { this.venue = null; this.ensure(); }
    this.pres.update(dt, m);
    const c = m.carrier(), b = m.ball;
    this.t += dt;
    TT.game.focus(lerp(c ? c.x : b.x, G.CX, .3) + Math.sin(this.t * .1) * 60, lerp(c ? c.y : b.y, G.CY, .5), 10);
  },
  draw(r, dim = .45) {
    if (!this.m) return;
    this.pres.draw(r, this.m, { refCone: false, seatColor: () => '#ffe060' });
    r.overlay(g => { g.fillStyle = 'rgba(4,6,14,' + dim + ')'; g.fillRect(0, 0, r.W + 4, r.H + 4); px.reset && px.reset(g); });
  }
};
// the simulation's events are quiet while the backdrop match plays (no commentary, no sounds)
{ const emit = TT.bus.emit.bind(TT.bus); TT.bus.emit = function (name, data) { if (this.muted) return; emit(name, data); }; }
/** the idle clock on the title and the menus: 10 s without any input starts the attract mode */
const Idle = TT.Idle = {
  t: 0,
  update(dt) {
    const game = TT.game;
    if (UI.anyInput(game)) this.t = 0; else this.t += dt;
    if (game.paused || game._menuOpen) this.t = 0;
    if (this.t >= 10 && !SESSION) { this.t = 0; TT.Attract.begin(); return true; }
    return false;
  }
};
const FRONT = { view: 'broadcast', views: ['broadcast'], input: KEYS, res: 'ps1', expand: true, touch: [], pausable: false, camera: false };
TT.scenes.title = Object.assign({}, FRONT, {
  enter() { BG.ensure(); TT.sound.music('title'); Idle.t = 0; this.t = 0; TT.game.lights.enabled = true; TT.game.setView('broadcast'); this.btn = null; },
  update(dt) {
    this.t += dt; BG.update(dt);
    if (Idle.update(dt)) return;
    const game = TT.game, ck = game.input.clicked();
    if (TT.touchOnly) { if (ck && this.btn && UI.inRect(ck, this.btn)) game.menu('settings'); return; }
    if (this.t > .4 && (game.players.some(q => q.pressed('start') || q.pressed('confirm') || q.pressed('x')) || ck)) { game.input.consumeAll(); TT.sound.ui('pick'); game.go('menu'); }
  },
  draw(r) {
    BG.draw(r, .35);
    r.overlay(g => {
      const cx = r.W / 2, y = Math.round(r.H * .14), bob = Math.sin(this.t * 2) * 2;
      FONT.title(g, 'THUGBY', cx, y + bob, { align: 'center', scale: 6, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 4, depthColor: '#5a1a0a' });
      FONT.title(g, 'TURBO', cx + 30, y + 46 - bob, { align: 'center', scale: 4, colors: ['#ffffff', '#80e0ff', '#3a86e8', '#1a3a8a'], depth: 3, depthColor: '#0a1440' });
      UI.txt(g, 'BIG HITS, BIGGER HAIR, SEVEN A SIDE', cx, y + 82, '#ffe7a8', { align: 'center' });
      if (TT.touchOnly) {
        if (UI.w('CONTROLLER OR KEYBOARD REQUIRED', { scale: 2 }) > r.W - 12) { UI.txt(g, 'CONTROLLER OR KEYBOARD', cx, r.H * .62 - 20, '#ffffff', { align: 'center', scale: 2 }); UI.txt(g, 'REQUIRED', cx, r.H * .62 - 2, '#ffffff', { align: 'center', scale: 2 }); }
        else UI.txt(g, 'CONTROLLER OR KEYBOARD REQUIRED', cx, r.H * .62, '#ffffff', { align: 'center', scale: 2 });
        UI.txt(g, 'Connect a controller or a keyboard to play.', cx, r.H * .62 + 22, '#c8d0e8', { align: 'center' });
        const w = 120, h = 30; this.btn = [cx - w / 2, r.H * .62 + 40, w, h];
        UI.panel(g, this.btn[0], this.btn[1], w, h, { focus: true }); UI.txt(g, 'SETTINGS', cx, this.btn[1] + 8, '#ffe060', { align: 'center', scale: 2 });
      } else if (Math.floor(this.t * 1.6) % 2 === 0) UI.prompt(g, '{b:start}  PRESS START', cx, r.H * .7, TT.game.input, { align: 'center', scale: 2 });
      UI.txt(g, 'CHANNEL THUD PRESENTS  -  AN ORIGINAL GAME INSPIRED BY RUGBY', cx, r.H - 26, '#a8b0c8', { align: 'center', font: 'tiny' });
      UI.txt(g, E.versionLabel ? 'my-3D2dge ' + E.versionLabel().split(' ')[0] : '', 6, r.H - 12, '#6a7088', { font: 'tiny' });
    });
  }
});
TT.scenes.menu = Object.assign({}, FRONT, {
  enter() {
    BG.ensure(); TT.sound.music('title'); Idle.t = 0; TT.game.setView('broadcast');
    const save = TT.Cup.saved();
    this.menu = new UI.BigMenu([
      save ? { label: 'CONTINUE CUP', desc: 'Back to the Mega Cup: ' + TT.CUP[Math.min(3, save.round)].round, fn: () => TT.Cup.continue() } : null,
      { label: save ? 'NEW MEGA CUP' : 'MEGA CUP', desc: 'The story: a pub team against the world. Training plus four matches.', fn: () => TT.Cup.start() },
      { label: 'EXHIBITION', desc: 'Any two teams, any stadium, 1 to 4 players: versus or co-op.', fn: () => TT.game.go('join', { mode: 'exhibition' }) },
      { label: 'TRAINING GROUND', desc: 'Coach Gristle\'s nine drills. Every move in the game, one at a time.', fn: () => TT.game.go('training') },
      { label: 'RECORDS', desc: 'Biggest wins, most tries, biggest hits.', fn: () => TT.game.go('records') },
      { label: 'SETTINGS', desc: 'Display, sound, comfort, game options, controls.', fn: () => TT.game.menu('settings') },
      { label: 'ABOUT & CREDITS', desc: 'Who made this, how, and what it\'s about.', fn: () => TT.game.go('about') }
    ].filter(Boolean), { onBack: () => TT.game.go('title') });
  },
  update(dt) { BG.update(dt); if (Idle.update(dt)) return; if (TT.game.paused) return; this.menu.update(TT.game.input, TT.game); },
  draw(r) {
    BG.draw(r, .55);
    r.overlay(g => {
      FONT.title(g, 'THUGBY TURBO', r.W / 2, 14, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
      this.menu.draw(g, r.W / 2, 56, { scale: 2, w: 220, descY: 43 });
      UI.hints(g, r, '{b:confirm} SELECT   {b:cancel} BACK', TT.game.input);
    });
  }
});
TT.scenes.records = Object.assign({}, FRONT, {
  enter() { BG.ensure(); this.page = 0; Idle.t = 0; },
  update(dt) {
    BG.update(dt); if (Idle.update(dt)) return;
    const I = TT.game.input, ck = I.clicked();
    if (I.pressed('right') || I.pressed('r1')) { this.page = (this.page + 1) % 3; TT.sound.ui('move'); }
    if (I.pressed('left') || I.pressed('l1')) { this.page = (this.page + 2) % 3; TT.sound.ui('move'); }
    if (ck) this.page = (this.page + (ck[0] > TT.game.W / 2 ? 1 : 2)) % 3;
    if (I.pressed('cancel') || I.pressed('confirm')) TT.game.go('menu');
  },
  draw(r) {
    BG.draw(r, .6);
    const mode = ['margin', 'tries', 'hit'][this.page];
    TT.arcade.drawTable(r, mode, 26, TT.RECORD_TITLES[mode]);
    r.overlay(g => { UI.txt(g, (this.page + 1) + ' / 3', r.W / 2, r.H - 32, '#a8b0c8', { align: 'center' }); UI.hints(g, r, '{b:l1}{b:r1} PAGE   {b:cancel} BACK', TT.game.input); });
  }
});
TT.scenes.about = Object.assign({}, FRONT, {
  enter() { BG.ensure(); this.page = 0; this.scroll = 0; Idle.t = 0; },
  update(dt) {
    BG.update(dt); if (Idle.update(dt)) return;
    const I = TT.game.input, n = TT.ABOUT.length, ck = I.clicked();
    if (I.pressed('right') || I.pressed('r1')) { this.page = (this.page + 1) % n; this.scroll = 0; TT.sound.ui('move'); }
    if (I.pressed('left') || I.pressed('l1')) { this.page = (this.page + n - 1) % n; this.scroll = 0; TT.sound.ui('move'); }
    if (I.repeat('down', .25, .06)) this.scroll += 1; if (I.repeat('up', .25, .06)) this.scroll = Math.max(0, this.scroll - 1);
    if (ck) { this.page = (this.page + (ck[0] > TT.game.W / 2 ? 1 : n - 1)) % n; this.scroll = 0; }
    if (I.pressed('cancel') || I.pressed('confirm')) TT.game.go('menu');
  },
  draw(r) {
    BG.draw(r, .75);
    r.overlay(g => {
      const P = TT.ABOUT[this.page], w = Math.min(r.W - 24, 520), x = r.W / 2 - w / 2;
      UI.txt(g, (this.page + 1) + ' / ' + TT.ABOUT.length, 8, 8, '#a8b0c8');
      FONT.title(g, P.title, r.W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#e0662a'] });
      const lines = [];
      for (const [h, t] of P.rows) { if (h) lines.push(['h', h]); for (const l of FONT.wrap(t, w - 8)) lines.push(['t', l]); lines.push(['s', '']); }
      const lh = 9, top = 32, vis = Math.floor((r.H - top - 30) / lh);
      this.scroll = Math.min(this.scroll, Math.max(0, lines.length - vis));
      lines.slice(this.scroll, this.scroll + vis).forEach(([k, l], i) => UI.txt(g, l, k === 'h' ? x : x + 6, top + i * lh, k === 'h' ? '#ffe060' : '#e8ecf8'));
      if (lines.length > vis) UI.txt(g, '▸ MORE', r.W - 14, r.H - 32, '#a8b0c8', { align: 'right' });
      UI.hints(g, r, '{b:l1}{b:r1} PAGE   {b:stick} SCROLL   {b:cancel} BACK', TT.game.input);
    });
  }
});
