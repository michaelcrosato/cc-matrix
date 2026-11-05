/* 50-title: title, main menu, How to Play, About & Credits, the touch-only notice, Beach Match setup. */
G.INFO = {
  source: 'Dead or Alive Xtreme Beach Volleyball',
  plan: 'PLAN.md (written by claude-opus-5-5 at max effort)',
  genre: 'Sports (arcade 2v2 beach volleyball) with life-sim (vacation calendar, friendship, shops) and minigames (rhythm, casino)',
  perspective: 'Side-on broadcast view for matches (with a serve cam); three-quarter view for places, map and menus',
  tech: 'my-3D2dge engine v0.85.2 (single-file build, patched), plain JavaScript, Web Audio synth, AI Hub session client 1.4.0',
  art: 'The engine\'s native style: HD pixel-rigged Humanoids on a PS1-resolution canvas, with new beach, court, crowd, casino and pool art',
  anim: 'Engine Humanoid rigs and E.MOVES (cast, overhead) with timed swing phases, dives, celebrations and per-game poses',
  audio: 'All code: 8 music tracks, a jingle, about 45 sound effects, Animalese-style voices per character. No audio files',
  online: 'AI Hub shared-world sessions (host runs the match, other copies send inputs); local 1-4 players on one machine',
  testing: 'Headless scripted tests with game.advance and game.debug (suites for rules, AI, flow, UI, hub) plus a few screenshots',
  research: 'Read the engine handoff and AI Hub README; knowledge of the source game, no web research beyond that',
  env: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium'
};

/* ---- the idle tracker used by the title and menu ---- */
G.idle = { t: 0, ptr: null };
G.idleStep = dt => {
  const I = G.game.input, p = I.pointer(); let act = I.anyPressed() || !!I.clicked() || Math.hypot(...I.move()) > .25;
  if (p) { if (G.idle.ptr && (Math.abs(p[0] - G.idle.ptr[0]) + Math.abs(p[1] - G.idle.ptr[1]) > 3)) act = true; G.idle.ptr = [p[0], p[1]]; }
  if (act) G.idle.t = 0; else G.idle.t += dt;
  return G.idle.t;
};
G.idleLimit = () => G.touchOnly ? 3 : 10;

const TITLE_CAST = ['mika', 'hana', 'gwen', 'ruby', 'tomo', 'ines'];
const frontCommon = {
  setup(self) { self.t = 0; self.rigs = TITLE_CAST.map(id => G.rig(id, null, null, 1.4)); G.idle.t = 0; G.idle.ptr = null; G.game.focus(0, -20, 12); G.game.lights.enabled = false; },
  stage(self, dt) { TITLE_CAST.forEach((id, i) => { const x = (i - 2.5) * 44; self.rigs[i].update(dt, { x, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(self.t * .7 + i) * .25, pose: i === 0 ? 'cheer' : null, expr: 'smile' }); }); },
  drawStage(self, r, sc = 1) { TITLE_CAST.forEach((id, i) => { const x = (i - 2.5) * 44 * sc; r.shadow(x, 0, 7, .3); r.actor(x, 0, 0, (g, ox, oy) => self.rigs[i].draw(g, ox, oy, r.view)); }); }
};

G.scenes.title = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'title',
  enter() {
    frontCommon.setup(this); G.music('title'); G.attract = null;
    try { const im = E.store.get('aoa-postcard', null); if (im) { this.card = { id: 'title', img: im, caption: '', loc: '', day: 1, slot: 0 }; } } catch (e) { this.card = null; }
    if (G.state && G.attractSaved) { G.state = G.attractSaved; G.attractSaved = null; }
  },
  update(dt) {
    this.t += dt; frontCommon.stage(this, dt); const I = G.game.input;
    const idle = G.idleStep(dt);
    if (idle > G.idleLimit()) { G.startAttract(); return; }
    if (G.touchOnly) return;
    if (I.pressed('confirm') || I.pressed('start') || I.clicked() || I.pressed('play')) { G.sfx('confirm'); G.game.go('menu'); }
  },
  draw(r) {
    const W = r.W, H = r.H; const bg = G.beach(r, this.t, { horizon: .46 });
    frontCommon.drawStage(this, r);
    if (this.card) r.overlay(g => { const x = W - 74, y = H - 60; px.rect(g, x + 2, y + 2, 66, 40, '#00000066'); E.ui.box(g, x, y, 66, 40, { bg: ['#fffaf0', '#f0e6c8'], border: '#c8962a', gradient: false }); G.drawPostcard(g, this.card, x + 3, y + 3, 60, 28); G.text(g, 'Greetings!', x + 33, y + 31, '#3a2410', { align: 'center', shadow: null }); });
    r.overlay(g => {
      G.logo(g, W, 12, 3); G.text(g, G.TAGLINE, W / 2, 62, '#fff6c8', { align: 'center' });
      if (G.touchOnly) { G.panel(g, W / 2 - 95, H * .55, 190, 30); G.text(g, 'Controller or keyboard required', W / 2, H * .55 + 10, '#ffd24a', { align: 'center' }); }
      else if (Math.floor(this.t * 2) % 2 === 0) G.text(g, 'PRESS ' + G.label('confirm').toUpperCase() + ' TO START', W / 2, H - 22, '#ffffff', { align: 'center' });
      G.text(g, E.versionLabel ? E.versionLabel() : '', 4, H - 9, '#ffffff88');
    });
    if (G.touchOnly) {
      this.btn = [W / 2 - 40, H * .55 + 36, 80, 14];
      r.overlay(g => { E.ui.box(g, this.btn[0], this.btn[1], 80, 14, { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' }); G.text(g, 'SETTINGS', W / 2, this.btn[1] + 4, '#fff', { align: 'center' }); });
      const c = G.game.input.clicked(); if (c && G.hit(c, this.btn)) G.game.menu('settings');
    }
  }
});

G.scenes.menu = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'menu',
  enter() {
    frontCommon.setup(this); G.music('title'); G.attract = null; if (G.attractSaved) { G.state = G.attractSaved; G.attractSaved = null; }
    const game = G.game, latest = (() => { try { return game.saves.latest(); } catch (e) { return null; } })();
    const items = [];
    if (latest) items.push({ label: 'Continue', value: latest.place, onPick: () => { G.game.saves.load(latest.slot); } });
    items.push({ label: 'New Vacation', onPick: () => { G.state = G.newState((Date.now() % 100000) + 17); G.reseedWorld(); G.installSaves(game); G.game.go('invitation', { next: () => G.game.go('map') }); } });
    items.push({ label: 'Beach Match', onPick: () => G.game.go('exhibition') });
    items.push({ label: 'Postcards', onPick: () => { if (!G.state) { G.state = G.newState(1); } G.game.go('album', { back: 'menu' }); } });
    items.push({ label: 'How to Play', onPick: () => G.game.go('howto') });
    items.push({ label: 'Settings', onPick: () => G.game.menu('settings') });
    items.push({ label: 'About & Credits', onPick: () => G.game.go('about') });
    this.menu = new G.Menu(items, { x: 14, y: 84, w: 150, gap: 14, onCancel: () => G.game.go('title') });
  },
  update(dt) {
    this.t += dt; frontCommon.stage(this, dt);
    const idle = G.idleStep(dt); if (idle > G.idleLimit()) { G.startAttract(); return; }
    this.menu.update(dt);
  },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { horizon: .46 });
    r.shadow(0, 0, 1, 0);
    TITLE_CAST.forEach((id, i) => { const x = 90 + (i - 2.5) * 34; r.shadow(x, 6, 6, .3); r.actor(x, 6, 0, (g, ox, oy) => this.rigs[i].draw(g, ox, oy, r.view)); });
    r.overlay(g => { G.logo(g, W, 8, 2); });
    this.menu.draw(r);
    G.drawPrompts(r, [['confirm', 'Select'], ['cancel', 'Title']]);
  }
});

/* ---- How to Play ---- */
G.openHowto = () => { G.howtoBack = G.game.sceneName; if (G.game.paused) G.game.resume(); try { if (G.game.shell && G.game.shell.hide) G.game.shell.hide(); } catch (e) { /* none */ } G.overlay.push(G.howtoOverlay()); };
G.howtoOverlay = () => ({
  name: 'howto', i: 0,
  update() { const I = G.game.input; if (I.pressed('left') && this.i > 0) { this.i--; G.sfx('select'); } if (I.pressed('right') && this.i < G.HOWTO.length - 1) { this.i++; G.sfx('select'); } if (I.pressed('cancel') || I.pressed('pause')) G.overlay.pop(this); return true; },
  draw(r) { G.drawHowto(r, this.i); }
});
G.drawHowto = (r, i) => {
  const W = r.W, H = r.H, pg = G.HOWTO[i];
  r.overlay(g => {
    px.rect(g, 0, 0, W, H, '#0b2430ee'); E.font.title(g, 'HOW TO PLAY', W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
    G.panel(g, 20, 36, W - 40, 130); E.font.text(g, pg[0], W / 2, 42, '#ffd24a', { align: 'center', outline: false, shadow: '#000' });
    let y = 58; pg[1].forEach(p => { G.wrap(p, W - 64).forEach(ln => { G.text(g, ln, 30, y, '#ffffff'); y += 10; }); y += 6; });
    // controls table for this device
    if (i === 1) { const lines = [['Move', G.isPad() ? 'Left stick' : 'WASD / arrows'], ['Play', G.label('play')], ['Dive', G.label('dive')], ['Call "Mine!"', G.label('call')], ['Camera', G.label('cam')]]; lines.forEach((ln, k) => { G.text(g, ln[0], 40, y + k * 10, '#bfe9ee'); G.text(g, ln[1], 140, y + k * 10, '#fff6c8'); }); }
    G.text(g, (i + 1) + ' / ' + G.HOWTO.length, W / 2, H - 32, '#fff6c8', { align: 'center' });
  });
  G.drawPrompts(r, [['left', 'Prev'], ['right', 'Next'], ['cancel', 'Close']]);
};
G.scenes.howto = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'howto',
  enter() { this.i = 0; this.t = 0; G.game.focus(0, 0, 14); },
  update(dt) { this.t += dt; const I = G.game.input; if (I.pressed('left') && this.i > 0) { this.i--; G.sfx('select'); } if ((I.pressed('right') || I.pressed('confirm')) && this.i < G.HOWTO.length - 1) { this.i++; G.sfx('select'); } else if (I.pressed('confirm') && this.i >= G.HOWTO.length - 1) G.game.go('menu'); if (I.pressed('cancel')) G.game.go('menu'); const c = I.clicked(); if (c) { if (c[0] > G.game.W / 2 && this.i < G.HOWTO.length - 1) this.i++; else if (c[0] <= G.game.W / 2 && this.i > 0) this.i--; } },
  draw(r) { G.beach(r, this.t, { noPalms: true }); G.drawHowto(r, this.i); }
});

/* ---- About & Credits: Source Information, Testing, Engine and Prompt feedback ---- */
G.ABOUT = () => {
  const I = G.INFO, fb = G.FEEDBACK || {};
  return [
    ['SOURCE INFORMATION', [
      'Date: ' + G.DATE, 'Source: ' + I.source, 'Plan: ' + I.plan, 'Genre: ' + I.genre, 'Perspective: ' + I.perspective, 'Tech: ' + I.tech, 'Art direction: ' + I.art, 'Animation: ' + I.anim, 'Audio: ' + I.audio, 'Online: ' + I.online,
      'Testing: ' + I.testing, 'Research: ' + I.research, 'Environment: ' + I.env, 'Model: ' + I.model, 'Usage: ' + (fb.usage || 'unknown')]],
    ['TESTING FEEDBACK', fb.testing || ['unknown']],
    ['ENGINE FEEDBACK', fb.engine || ['unknown']],
    ['PROMPT FEEDBACK', fb.prompt || ['unknown']],
    ['CREDITS', ['Ahead or Alive: Xtreme Beach Volleyball is an original game inspired by Dead or Alive Xtreme Beach Volleyball.', 'Cast, story, art and sound are original. Built on my-3D2dge and the AI Hub session client.', 'Stay ahead. Stay alive. Stay tanned.']]
  ];
};
G.scenes.about = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'about',
  enter() { this.t = 0; this.page = 0; this.scroll = 0; G.game.focus(0, 0, 14); this.pages = G.ABOUT(); },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (I.pressed('left') && this.page > 0) { this.page--; this.scroll = 0; G.sfx('select'); } if (I.pressed('right') && this.page < this.pages.length - 1) { this.page++; this.scroll = 0; G.sfx('select'); }
    if (I.pressed('tab') || I.pressed('tabNext')) { this.page = (this.page + 1) % this.pages.length; this.scroll = 0; }
    if (I.pressed('down') || I.repeat('down', .3, .06)) this.scroll += 10; if (I.pressed('up') || I.repeat('up', .3, .06)) this.scroll = Math.max(0, this.scroll - 10);
    if (I.pressed('cancel')) G.game.go('menu');
    const c = I.clicked(); if (c && c[1] < 20) this.page = clamp(Math.floor(c[0] / ((G.game.W - 62) / this.pages.length)), 0, this.pages.length - 1);
  },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { noPalms: true });
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0b2430ee');
      this.pages.forEach((p, i) => { const w = Math.round((W - 62) / this.pages.length); E.ui.box(g, i * w + 1, 1, w - 2, 15, this.page === i ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a' }); G.text(g, p[0].split(' ')[0], i * w + w / 2, 5, '#fff', { align: 'center' }); });
      const pg = this.pages[this.page]; G.text(g, pg[0], W / 2, 20, '#ffd24a', { align: 'center' });
      const lines = []; pg[1].forEach(p => { G.wrap(p, W - 28).forEach(ln => lines.push(ln)); lines.push(''); });
      const maxS = Math.max(0, lines.length * 9 - (H - 54)); this.scroll = Math.min(this.scroll, maxS);
      const clipY0 = 32, clipY1 = H - 22;
      lines.forEach((ln, i) => { const y = clipY0 + i * 9 - this.scroll; if (y >= clipY0 - 2 && y < clipY1) G.text(g, ln, 12, y, '#ffffff'); });
    });
    G.drawPrompts(r, [['left', 'Prev'], ['right', 'Next'], ['down', 'Scroll'], ['cancel', 'Back']]);
  }
});

/* ---- Beach Match: exhibition setup for 1-4 local players ---- */
G.scenes.exhibition = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'exhibition',
  enter() {
    this.t = 0; G.music('promenade'); G.game.focus(0, 0, 14); const game = G.game;
    this.roster = ['you', 'mika', 'hana', 'gwen', 'ruby', 'tomo', 'ines', 'sonny', 'pepper'];
    this.slots = [{ c: 0, ctl: 1 }, { c: 1, ctl: 0 }, { c: 4, ctl: 0 }, { c: 5, ctl: 0 }]; this.i = 0; this.opt = { to: 7, time: 0, diff: 1 }; this.rows = ['slot0', 'slot1', 'slot2', 'slot3', 'to', 'time', 'diff', 'start'];
    game.allowJoin({ max: 4, onJoin: (inp, n) => { const free = this.slots.findIndex((s, k) => !s.ctl && k !== 0); if (free >= 0) this.slots[free].ctl = n; } });
    this.rigs = {}; this.msg = '';
  },
  exit() { G.game.allowJoin(false); },
  rig(id) { return this.rigs[id] || (this.rigs[id] = G.rig(id, null, null, 1.1)); },
  cfg() { const res = []; return { teams: [[this.roster[this.slots[0].c], this.roster[this.slots[1].c]], [this.roster[this.slots[2].c], this.roster[this.slots[3].c]]], to: this.opt.to, time: this.opt.time ? 'sunset' : undefined, skillBonus: [0, [-.15, 0, .15][this.opt.diff] - 0] }; },
  start() {
    const game = G.game, cfg = this.cfg(), ctl = this.slots.map(s => s.ctl ? Object.assign(G.localCtl(game.players[s.ctl - 1] || game.input), { pnum: s.ctl - 1 }) : { type: 'ai' });
    if (!ctl.some(c => c.type !== 'ai')) { this.msg = 'Give at least one slot a controller (press ' + G.label('confirm') + ' on a slot).'; return; }
    game.go('match', { cfg, ctl, humanTeam: 0, time: cfg.time, rematch: true, onEnd: () => G.game.go('exhibition') });
  },
  update(dt) {
    this.t += dt; const I = G.game.input, n = this.rows.length;
    if (I.pressed('up') || I.repeat('up', .35, .1)) { this.i = (this.i + n - 1) % n; G.sfx('select'); } if (I.pressed('down') || I.repeat('down', .35, .1)) { this.i = (this.i + 1) % n; G.sfx('select'); }
    const row = this.rows[this.i], dx = (I.pressed('right') || I.repeat('right', .35, .1) ? 1 : 0) - (I.pressed('left') || I.repeat('left', .35, .1) ? 1 : 0);
    if (row.startsWith('slot')) { const s = this.slots[+row[4]]; if (dx) { s.c = (s.c + dx + this.roster.length) % this.roster.length; G.sfx('select'); }
      if (I.pressed('confirm') || I.pressed('tab')) { const maxp = Math.max(1, G.game.players.length); s.ctl = (s.ctl + 1) > maxp ? 0 : s.ctl + 1; if (s.ctl === 0 && +row[4] === 0 && this.slots.every(q => !q.ctl)) s.ctl = 1; G.sfx('confirm'); } }
    else if (row === 'to' && dx) { this.opt.to = clamp(this.opt.to + dx * 2, 3, 15); G.sfx('select'); }
    else if (row === 'time' && dx) { this.opt.time = 1 - this.opt.time; G.sfx('select'); }
    else if (row === 'diff' && dx) { this.opt.diff = clamp(this.opt.diff + dx, 0, 2); G.sfx('select'); }
    else if (row === 'start' && I.pressed('confirm')) this.start();
    const c = I.clicked(); if (c) { for (let k = 0; k < n; k++) { const y = 46 + k * 15; if (c[1] >= y - 2 && c[1] < y + 12 && c[0] > 20 && c[0] < G.game.W - 20) { this.i = k; if (this.rows[k] === 'start') this.start(); else if (this.rows[k].startsWith('slot')) { const s = this.slots[+this.rows[k][4]]; if (c[0] > G.game.W / 2) { s.c = (s.c + 1) % this.roster.length; } else { s.ctl = (s.ctl + 1) > Math.max(1, G.game.players.length) ? 0 : s.ctl + 1; } } } } }
    if (I.pressed('cancel')) G.game.go('menu');
    for (const s of this.slots) this.rig(this.roster[s.c]).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t) * .4 });
  },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { noPalms: true });
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0b2430cc'); E.font.title(g, 'BEACH MATCH', W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
      G.text(g, 'Players on this machine: ' + Math.max(1, G.game.players.length) + '   (Start on another pad or 2 on the keyboard to join)', W / 2, 30, '#bfe9ee', { align: 'center' });
      this.rows.forEach((row, k) => {
        const y = 46 + k * 15, sel = k === this.i; E.ui.box(g, 20, y - 2, W - 40, 14, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .92 });
        if (row.startsWith('slot')) { const si = +row[4], s = this.slots[si], c = G.CAST[this.roster[s.c]]; G.text(g, (si < 2 ? 'Team A' : 'Team B') + ' ' + ((si % 2) + 1), 26, y + 2, '#bfe9ee'); G.text(g, '◀ ' + c.full.split(' ')[0] + ' ' + (c.style) + ' ▶', W / 2 - 10, y + 2, '#fff', { align: 'center' }); G.text(g, s.ctl ? 'P' + s.ctl : 'CPU', W - 26, y + 2, s.ctl ? E.PLAYER_COLORS[s.ctl - 1] : '#9ab', { align: 'right' }); }
        else if (row === 'to') { G.text(g, 'First to', 26, y + 2, '#bfe9ee'); G.text(g, '◀ ' + this.opt.to + ' ▶', W - 26, y + 2, '#fff', { align: 'right' }); }
        else if (row === 'time') { G.text(g, 'Time of day', 26, y + 2, '#bfe9ee'); G.text(g, '◀ ' + (this.opt.time ? 'Sunset' : 'Noon') + ' ▶', W - 26, y + 2, '#fff', { align: 'right' }); }
        else if (row === 'diff') { G.text(g, 'CPU skill', 26, y + 2, '#bfe9ee'); G.text(g, '◀ ' + ['Easy', 'Normal', 'Hard'][this.opt.diff] + ' ▶', W - 26, y + 2, '#fff', { align: 'right' }); }
        else G.text(g, 'START MATCH', W / 2, y + 2, '#ffffff', { align: 'center' });
      });
      if (this.msg) G.text(g, this.msg, W / 2, H - 28, '#ffb0a0', { align: 'center' });
    });
    G.drawPrompts(r, [['confirm', 'Change / Start'], ['cancel', 'Back']]);
  }
});
