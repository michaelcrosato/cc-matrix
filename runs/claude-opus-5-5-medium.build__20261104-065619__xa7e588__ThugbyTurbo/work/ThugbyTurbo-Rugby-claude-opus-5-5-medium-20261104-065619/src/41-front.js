/* ---- THE FRONT END: title, menu, records, about, credits. Behind them, a real match ticks over quietly under the
 * Megadome's lights (the presentation running a tiny CPU loop) ---- */
TT.bg = {
  ensure(venue) {
    if (M && M.o.backdrop && !M.over && (!venue || M.venue.id === venue)) return;
    TT.cfg.quietComm = true;
    TT.startMatch({ home: 'mud', away: 'meg', venue: venue || 'dome', seed: 99, backdrop: true, skipIntro: true, attract: true, seats: [] });
    TT.cfg.quietComm = false;
    const g = TT.game; g.lights.enabled = true; g.lights.ambient = .5; g.weather = null;
  },
  step(dt) {
    if (!M || !M.o.backdrop) return;
    const it = TT.control.collect(dt); TT.sim.step(dt, it); TT.pres.update(dt, M);
    if (M.phase === 'full') { const v = M.venue.id; M.over = true; TT.bg.ensure(v); }
    const b = M.ball; TT.game.focus(b.x, b.y + (G.CY - b.y) * .3, 8);
  },
  draw(r, dim = .45) { if (M && M.o.backdrop) TT.pres.drawWorld(r, M); r.overlay(g => px.blend(g, dim, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#202848'))); }
};
const FRONT = { view: 'broadcast', views: ['broadcast'], input: TT.KEYS, res: 'ps1', touch: [], camera: false };
const logo = (g, W, y, s = 4) => {
  E.font.title(g, 'THUGBY', W / 2, y, { align: 'center', scale: s, colors: ['#fff6c8', '#ffd040', '#ff8a20', '#c83010'], depth: 3, depthColor: '#3a0a04' });
  E.font.title(g, 'TURBO', W / 2, y + s * 9 + 2, { align: 'center', scale: s, colors: ['#e8f4ff', '#80c8ff', '#3a80f0', '#1a3aa0'], depth: 3, depthColor: '#0a1440' });
};
TT.logo = logo;

TT.scenes.title = Object.assign({}, FRONT, {
  enter() { TT.bg.ensure(); TT.audio.music('title'); TT.idle.t = 0; TT.checkTouchOnly(); TT.game.input.touchEnabled = false; this.t = 0; },
  update(dt) {
    this.t += dt; TT.bg.step(dt);
    const g = TT.game;
    if (TT.cfg.touchOnly) {
      const c = g.input.clicked && g.input.clicked();
      if (c && this.setBtn && c[0] >= this.setBtn[0] && c[0] < this.setBtn[0] + this.setBtn[2] && c[1] >= this.setBtn[1] && c[1] < this.setBtn[1] + this.setBtn[3]) g.menu('settings');
      TT.idle.t += dt; if (TT.idle.t > 10) { TT.idle.t = 0; TT.attract.start(); }
      return;
    }
    if (this.t > .4 && g.players.some(I => I.pressed('start') || I.pressed('confirm') || I.pressed('x')) || (g.input.clicked && g.input.clicked() && this.t > .4)) { g.players.forEach(I => I.consumeAll()); TT.audio.sfx('confirm'); g.go('menu'); return; }
    TT.idleStep(dt);
  },
  draw(r) {
    TT.bg.draw(r, .35);
    r.overlay(g => {
      const W = r.W, H = r.H, bob = Math.round(Math.sin(this.t * 2) * 2);
      logo(g, W, 30 + bob, 4);
      E.font.text(g, 'BIG HITS, BIGGER HAIR, SEVEN A SIDE', W / 2, 112, '#ffe8c0', { align: 'center', outline: '#000' });
      if (TT.cfg.touchOnly) {
        E.font.title(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, 140, { align: 'center', scale: 1, colors: ['#ffffff', '#ffd040'] });
        E.font.text(g, 'Connect a controller or a keyboard to play.', W / 2, 160, '#c8d0e8', { align: 'center', outline: '#000' });
        const bw = 120, bx = Math.round(W / 2 - bw / 2), by = 180; this.setBtn = [bx, by, bw, 26];
        E.ui.box(g, bx, by, bw, 26, { bg: ['#4a3a10', '#2a2008'], border: '#ffe060' }); E.font.text(g, 'SETTINGS', W / 2, by + 6, '#ffffff', { align: 'center', scale: 2, outline: false });
      } else if (Math.floor(this.t * 1.6) % 2 === 0) E.font.title(g, 'PRESS START', W / 2, 150, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      if (!TT.cfg.touchOnly) TT.ui.footer(g, W, H, '{b:start} START     LIVE ON CHANNEL THUD');
      E.font.text(g, 'CHANNEL THUD SPORT  ' + E.versionLabel(), 4, H - 30, '#6a7490', { font: 'tiny', outline: false });
    });
  }
});

const MENU_ITEMS = () => [
  { id: 'cup', label: () => TT.cupSaved() ? 'CONTINUE THE CUP' : 'MEGA CUP', desc: 'The story: the Mudlarks, a pub side, take on the Turbo Sevens Mega Cup.' },
  { id: 'newcup', label: 'NEW MEGA CUP', desc: 'Start the cup again from the Muddy Duck.', hidden: !TT.cupSaved() },
  { id: 'exhibition', label: 'EXHIBITION', desc: 'Any two teams, any stadium. 1 to 4 players: versus or co-op.' },
  { id: 'training', label: 'TRAINING GROUND', desc: "Coach Gristle's nine drills. Every move in the game, one at a time." },
  { id: 'records', label: 'RECORDS', desc: 'Biggest wins, most tries, the biggest hit. Initials only.' },
  { id: 'settings', label: 'SETTINGS', desc: 'Difficulty, half length, controller buttons, camera, sound...' },
  { id: 'about', label: 'ABOUT & CREDITS', desc: 'Who made this, how, and what they thought of it.' }
].filter(i => !i.hidden);
TT.scenes.menu = Object.assign({}, FRONT, {
  enter() {
    TT.bg.ensure(); TT.audio.music('title'); TT.idle.t = 0;
    const items = MENU_ITEMS();
    this.menu = new TT.ui.BigMenu(items, { y: 84, w: 240, rowH: 24, onPick: (i, it) => this.pick(it.id), onCancel: () => TT.game.go('title') });
  },
  pick(id) {
    const g = TT.game;
    if (id === 'cup') { if (TT.cupSaved()) { TT.cupLoad(); g.go('cup'); } else { TT.cupNew(); g.go('story', { id: 'prologue' }); } }
    else if (id === 'newcup') { TT.cupNew(); g.go('story', { id: 'prologue' }); }
    else if (id === 'exhibition') g.go('join', { mode: 'exhibition' });
    else if (id === 'training') g.go('training', {});
    else if (id === 'records') g.go('records', {});
    else if (id === 'settings') g.menu('settings');
    else if (id === 'about') g.go('about');
  },
  update(dt) { TT.bg.step(dt); if (TT.game.paused) return; this.menu.update(dt); TT.idleStep(dt); },
  draw(r) {
    TT.bg.draw(r, .5);
    r.overlay(g => {
      const W = r.W, H = r.H;
      logo(g, W, 10, 2);
      this.menu.draw(g, W);
      const it = this.menu.items[this.menu.i];
      E.ui.box(g, W / 2 - 170, H - 46, 340, 22, { bg: '#0c1020', border: '#3a4460', alpha: .85, gradient: false });
      E.font.text(g, it.desc, W / 2, H - 39, '#ffe8c0', { align: 'center', outline: false });
      TT.ui.footer(g, W, H, '{b:up}{b:down} CHOOSE   {b:confirm} PICK   {b:cancel} BACK');
    });
  }
});

/* ---- records: three tables, a page each (the arcade module's tables and initials) ---- */
TT.recordsInit = () => {
  if (TT.cab) return;
  TT.cab = new E.Arcade(TT.game, { id: 'thugby', idle: 10, demo: 300, scores: 8, hud: false });
  for (const mode of ['margin', 'tries', 'hit']) if (!TT.cab.table(mode).length) {
    const k = 'arcade:thugby:' + mode; try { E.store.set(k, TT.RECORD_SEEDS[mode].map(([name, score]) => ({ name, score }))); } catch (e) { /* storage blocked */ }
  }
};
TT.scenes.records = Object.assign({}, FRONT, {
  enter(d) { TT.recordsInit(); TT.bg.ensure(); this.page = 0; this.t = 0; this.attract = d && d.attract; TT.idle.t = 0; },
  update(dt) {
    this.t += dt; TT.bg.step(dt);
    const g = TT.game, P = g.players;
    if (this.attract) { if (TT.anyInput() && this.t > .5) { P.forEach(I => I.consumeAll()); g.go('title'); return; } if (this.t > 8) g.go('title'); this.page = Math.floor(this.t / 2.7) % 3; return; }
    if (P.some(I => I.pressed('right') || I.pressed('r1'))) { this.page = (this.page + 1) % 3; TT.audio.sfx('select'); }
    if (P.some(I => I.pressed('left') || I.pressed('l1'))) { this.page = (this.page + 2) % 3; TT.audio.sfx('select'); }
    const c = g.input.clicked && g.input.clicked(); if (c) { this.page = (this.page + 1) % 3; }
    if (P.some(I => I.pressed('cancel') || I.pressed('confirm'))) { P.forEach(I => I.consumeAll()); g.go('menu'); return; }
    TT.idleStep(dt);
  },
  draw(r) {
    TT.bg.draw(r, .6);
    const modes = [['margin', 'BIGGEST WINS (POINTS)'], ['tries', 'MOST TRIES IN A MATCH'], ['hit', 'BIGGEST HIT (METRES x10)']];
    const [mode, title] = modes[this.page];
    TT.cab.drawTable(r, mode, 50, title);
    r.overlay(g => { logo(g, r.W, 4, 1); if (!this.attract) TT.ui.footer(g, r.W, r.H, '{b:l1}{b:r1} PAGE ' + (this.page + 1) + '/3   {b:cancel} BACK'); });
  }
});

/* ---- about & credits: five pages; the same text as the build's chat reply ---- */
TT.scenes.about = Object.assign({}, FRONT, {
  enter() { this.page = 0; TT.bg.ensure(); TT.idle.t = 0; this.scroll = 0; },
  update(dt) {
    TT.bg.step(dt); const g = TT.game, P = g.players, n = TT.ABOUT.length;
    if (P.some(I => I.pressed('right') || I.pressed('r1'))) { this.page = (this.page + 1) % n; this.scroll = 0; TT.audio.sfx('select'); }
    if (P.some(I => I.pressed('left') || I.pressed('l1'))) { this.page = (this.page + n - 1) % n; this.scroll = 0; TT.audio.sfx('select'); }
    if (P.some(I => I.repeat('down'))) this.scroll++; if (P.some(I => I.repeat('up'))) this.scroll = Math.max(0, this.scroll - 1);
    const c = g.input.clicked && g.input.clicked(); if (c) { this.page = (this.page + (c[0] > g.W / 2 ? 1 : n - 1)) % n; this.scroll = 0; }
    if (P.some(I => I.pressed('cancel') || I.pressed('confirm'))) { P.forEach(I => I.consumeAll()); g.go('menu'); return; }
    TT.idleStep(dt);
  },
  draw(r) {
    TT.bg.draw(r, .75);
    r.overlay(g => {
      const W = r.W, H = r.H, pg = TT.ABOUT[this.page];
      E.font.title(g, pg.title, W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#ffb347'] });
      const lines = []; for (const para of pg.lines) { const ws = E.font.wrap(para, W - 30); for (const l of ws) lines.push(l); lines.push(''); }
      const vis = Math.floor((H - 70) / 10); this.scroll = Math.min(this.scroll, Math.max(0, lines.length - vis));
      lines.slice(this.scroll, this.scroll + vis).forEach((l, i) => E.font.text(g, l, 15, 32 + i * 10, l.endsWith(':') || /^[A-Z ]+:/.test(l) ? '#ffe8c0' : '#e0e4f0', { outline: false }));
      TT.ui.footer(g, W, H, '{b:l1}{b:r1} PAGE ' + (this.page + 1) + '/' + TT.ABOUT.length + '   {b:up}{b:down} SCROLL   {b:cancel} BACK');
    });
  }
});

TT.scenes.credits = Object.assign({}, FRONT, {
  enter() { this.t = 0; TT.audio.music('third'); TT.bg.ensure('park'); },
  update(dt) {
    this.t += dt; TT.bg.step(dt); const g = TT.game;
    if ((this.t > 3 && g.players.some(I => I.pressed('confirm') || I.pressed('cancel'))) || this.t > 46) { g.players.forEach(I => I.consumeAll()); g.go('title'); }
  },
  draw(r) {
    TT.bg.draw(r, .7);
    r.overlay(g => {
      const W = r.W, H = r.H, y0 = Math.round(H - this.t * 22);
      const roll = [['T', 'THUGBY TURBO'], ['', 'An original game inspired by rugby.'], ['', 'Every team, person and place is made up.'], ['', ''], ['H', 'DESIGN, CODE, ART, MUSIC, VOICES'], ['', 'claude-opus-5-5 (Anthropic), reasoning effort medium'], ['', 'from a plan written by claude-opus-5-5 at max effort'], ['', ''], ['H', 'ENGINE'], ['', 'my-3D2dge v0.85.2'], ['', ''], ['H', 'ONLINE'], ['', 'AI Hub Session Protocol v1, client 1.4.0'], ['', ''], ['H', 'STARRING'],
        ...TT.TEAMS[0].players.map(p => ['', p.name + ' "' + p.nick + '"']), ['', 'Coach Gordon Gristle'], ['', 'Big Dave'], ['', 'Nan Pemberton and the Bramblewick Badgers'], ['', 'Captain Clucky'], ['', ''], ['H', 'COMMENTARY'], ['', 'Barry Bellows and Ros Rucker'], ['', 'Referee: Nigel Blewitt'], ['', ''], ['H', 'NO MUDLARKS WERE HARMED'], ['', '(Several were muddied.)'], ['', ''], ['T', 'LAST ORDERS!']];
      roll.forEach(([k, s], i) => {
        const y = y0 + i * 14; if (y < -20 || y > H) return;
        if (k === 'T') E.font.title(g, s, W / 2, y, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd040', '#ff8a20'] });
        else E.font.text(g, s, W / 2, y, k === 'H' ? '#ffe08a' : '#e0e4f0', { align: 'center', outline: '#000' });
      });
      if (this.t > 3) TT.prompt(g, '{b:confirm} TITLE', W - 40, H - 14, TT.game.input);
    });
  }
});
