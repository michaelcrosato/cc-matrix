/* MASH TV — 14-scenes: the front end (title and main menu, difficulty, the contestant lobby, episodes, how to play, top
 * earners, about and credits, game over) and the play scene that ticks the World and draws the broadcast. Every screen works
 * with a pad, the keyboard, or the mouse (hover moves focus, click picks). */

// a list of rows that every player can move through; mouse hover focuses, a click picks (screen-pixel rows from the last draw)
class MenuList {
  constructor(items, o = {}) { this.items = items; this.focus = o.focus || 0; this.rects = []; this.onPick = o.onPick; this.onFocus = o.onFocus; this.y0 = o.y0 || 90; this.rowH = o.rowH || 22; this.w = o.w || 220;   /* (buffer pixels: the overlay's units, a third of a 1080p screen's) */ this.x = o.x; this.cx = o.cx; }
  update(G) {
    const ps = G.players || [G.input];
    for (const p of ps) {
      if (p.repeat('up', .3, .14)) this.move(-1);
      if (p.repeat('down', .3, .14)) this.move(1);
    }
    for (const p of ps) {
      if (p.pressed('confirm') || p.pressed('start')) { this.pick(this.focus); break; }
      const pt = p.pointer && p.pointer(); if (pt) { const i = this.rects.findIndex(r => pt[0] >= r[0] && pt[0] < r[0] + r[2] && pt[1] >= r[1] && pt[1] < r[1] + r[3]); if (i >= 0 && i !== this.focus) { this.focus = i; if (this.onFocus) this.onFocus(i); } }
      const c = p.clicked && p.clicked(); if (c) { const i = this.rects.findIndex(r => c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (i >= 0) { this.focus = i; this.pick(i); break; } }
    }
  }
  move(d) { let n = this.focus + d; while (this.items[n] && this.items[n].disabled) n += d; if (n >= 0 && n < this.items.length) { this.focus = n; if (this.onFocus) this.onFocus(n); MT.sfx('blip', { vol: .4 }); } }
  pick(i) { const it = this.items[i]; if (!it || it.disabled) return; MT.sfx('confirm'); if (this.onPick) this.onPick(i, it); }
  draw(r) {
    const cx = this.cx !== undefined ? this.cx : r.W / 2, w = this.w, x = Math.round(cx - w / 2); this.rects = [];
    this.items.forEach((it, i) => {
      const y = Math.round(this.y0 + i * this.rowH), foc = i === this.focus, h = this.rowH - 3;
      this.rects.push([x, y, w, h]);
      r.overlay(g => {
        E.ui.box(g, x, y, w, h, { bg: foc ? ['#ffcc33', '#b07a00'] : ['#241240', '#0e061e'], border: foc ? '#fff7e8' : '#ff2e88', alpha: .95 });
        const col = it.disabled ? '#6a5a7a' : foc ? '#15121c' : '#fff7e8';
        E.font.text(g, it.label, cx, y + Math.round((h - 7) / 2), col, { scale: 2, align: 'center', shadow: foc ? undefined : '#000' });
      });
    });
  }
}
MT.MenuList = MenuList;
// the front-end idle clock (10 s on the title and the menus: the attract mode, §12)
MT.idle = { t: 0, serial: -1 };
MT.idleTick = (G, dt) => {
  const any = (G.players || [G.input]).some(p => p.anyPressed && p.anyPressed()) || (G.players || []).some(p => p.pointer && p.pointer() && p.pointer()[0] !== undefined && MT.idle.moved);
  if (MT.inputSerial !== MT.idle.serial || any) { MT.idle.t = 0; MT.idle.serial = MT.inputSerial; return false; }
  MT.idle.t += dt;
  return MT.idle.t >= 10;
};
MT.hudSafe = (r) => ({ top: Math.round(r.H * .04) });

/* ---------- the touch-only notice (§11.7) ---------- */
MT.touchNotice = (r, G) => {
  r.overlay(g => {
    E.ui.box(g, r.W / 2 - 150, r.H / 2 - 40, 300, 80, { bg: ['#1a0a30', '#0c0418'], border: '#ffcc33', alpha: .95 });
    E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H / 2 - 22, '#ffcc33', { scale: 1, align: 'center' });
  });
};

/* ---------- scene: title (logo, the main menu) ---------- */
MT.menu = {};
MT.scenes = {};
MT.scenes.title = {
  view: 'threequarter', res: 'ps1', expand: true, pausable: false, touch: [], corner: undefined,
  enter() { MT.idle.t = 0; MT.idle.serial = MT.inputSerial; MT.music('theme'); MT.PLAY.stop = false;
    const items = [{ label: 'START THE SHOW', id: 'start' }, { label: 'EPISODES', id: 'episodes' }, { label: 'HOW TO PLAY', id: 'howto' },
      { label: 'TOP EARNERS', id: 'scores' }, { label: 'OPTIONS', id: 'options' }, { label: 'ABOUT & CREDITS', id: 'about' }];
    MT.menu.title = new MenuList(items, { y0: 0, w: 200, rowH: 19, onPick: (i, it) => MT.titlePick(it.id) });
    MT.menu.title.y0 = 0; MT.menu.title.rowY = 0;
  },
  update(dt) {
    const G = MT.G;
    if (MT.touchOnly()) { if (G.input.pressed('confirm')) {} }
    if (MT.idleTick(G, dt)) { G.go('attract'); return; }
    if (MT.touchOnly() || MT.lockedTouch) return;
    MT.menu.title.update(G);
  },
  draw(r) {
    const G = MT.G;
    r.sky(['#140a34', '#3a1c66']);
    MT.drawSpotlights(r, 0);
    const m = Math.round(r.H * .2);
    r.overlay(g => { E.font.title(g, 'MASH TV', r.W / 2, m, { scale: Math.max(2, Math.round(r.W / 140)), colors: ['#ff2e88', '#ffcc33'], align: 'center' }); });
    r.text('LIVE FROM STUDIO 9', r.W / 2, m + 30, '#2ee6ff', { align: 'center', scale: 1, shadow: '#000' });
    const mm = MT.menu.title; mm.cx = r.W / 2; mm.y0 = Math.round(r.H * .42); mm.draw(r);
    if (MT.touchOnly()) { MT.touchNotice(r, G); r.overlay(g => { E.ui.box(g, r.W / 2 - 60, r.H / 2 + 10, 120, 20, { bg: ['#241240', '#0e061e'], border: '#ffcc33', alpha: .95 }); E.font.text(g, 'SETTINGS', r.W / 2, r.H / 2 + 16, '#fff7e8', { scale: 1, align: 'center' }); }); const c = G.input.clicked && G.input.clicked(), R = [r.W / 2 - 60, r.H / 2 + 10, 120, 20]; if (c && c[0] >= R[0] && c[0] <= R[0] + R[2] && c[1] >= R[1] && c[1] <= R[1] + R[3]) G.menu('settings'); }
    MT.drawBrand(r);
    MT.glyphBar(r, [['confirm', 'SELECT']]);
  }
};
MT.titlePick = (id) => {
  const G = MT.G;
  if (id === 'start') return G.go('difficulty');
  if (id === 'episodes') return G.go('episodes');
  if (id === 'howto') return G.go('howto', { page: 0 });
  if (id === 'scores') return G.go('scores');
  if (id === 'options') return G.menu('settings');
  if (id === 'about') return G.go('about', { page: 0 });
};
MT.drawBrand = (r) => r.overlay(g => E.font.text(g, MT.VERSION, 6, r.H - 10, '#7a6a9a', { scale: 1 }));
MT.drawSpotlights = (r, k) => {
  if (!MT.G) return;
  for (let i = 0; i < 4; i++) { const a = MT.G.time * .5 + i * 1.6; MT.G.lights && MT.G.lights.add(184 + Math.cos(a) * 140, 120 + Math.sin(a) * 60, 40, 90, .5, { color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#ff2e88'][i] }); }
};
MT.glyphBar = (r, pairs) => r.overlay(g => { MT.glyph.prompt(g, 8, r.H - 22, pairs.map(([a, t]) => [a, t]), MT.G.input, { scale: 1 }); });

/* ---------- scene: difficulty ---------- */
MT.scenes.difficulty = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() { MT.menu.diff = new MenuList([{ label: 'ROOKIE', id: 'rookie' }, { label: 'CONTESTANT', id: 'contestant' }, { label: 'CHAMPION', id: 'champion' }], { y0: 0, w: 260, rowH: 26, onPick: (i, it) => { MT.pickDiff = it.id; MT.G.go('lobby'); }, onFocus: i => MT.diffFocus = i }); MT.diffFocus = 1; },
  update(dt) { if (MT.G.input.pressed('cancel') || MT.G.input.pressed('pause')) return MT.G.go('title'); MT.menu.diff.update(MT.G); if (MT.idleTick(MT.G, dt)) MT.G.go('attract'); },
  draw(r) {
    r.sky(['#140a34', '#3a1c66']); r.overlay(g => E.font.title(g, 'CHOOSE YOUR DIFFICULTY', r.W / 2, 22, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    const m = MT.menu.diff; m.cx = r.W / 2; m.y0 = Math.round(r.H * .3); m.draw(r);
    const d = Object.values(MT.DIFF)[MT.diffFocus];
    r.overlay(g => { E.ui.box(g, 40, r.H - 80, r.W - 80, 40, { bg: ['#1a0a30', '#0c0418'], border: '#ffcc33', alpha: .9 }); E.font.text(g, d.line + '  HP ' + d.hp + ', LIVES ' + d.lives, r.W / 2, r.H - 72, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' }); });
    MT.glyphBar(r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
  }
};

/* ---------- scene: lobby (TONIGHT'S CONTESTANTS: up to four, locally) ---------- */
MT.lobby = { entries: [], countdown: null };
MT.scenes.lobby = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() {
    const G = MT.G; MT.lobby.entries = [{ slot: 0, input: G.input, look: 0, ready: false }]; MT.lobby.countdown = null;
    G.allowJoin({ max: 4, keys: false, onJoin: (input) => { const n = G.players.indexOf(input); MT.lobby.entries.push({ slot: n, input, look: n, ready: false }); MT.sfx('confirm'); MT.lobbyAdded = true; } });
    MT.music(null);
  },
  exit() { MT.G.allowJoin(false); },
  update(dt) {
    const G = MT.G, L = MT.lobby;
    if (L.countdown !== null) { L.countdown -= dt; if (L.countdown <= 0) { MT.lobbyStart(G, L); } return; }
    for (const e of L.entries) {
      const I = e.input;
      if (I.pressed('left')) { e.look = (e.look + 3) % 4; MT.sfx('blip', { vol: .4 }); }
      if (I.pressed('right')) { e.look = (e.look + 1) % 4; MT.sfx('blip', { vol: .4 }); }
      if (I.pressed('confirm')) { e.ready = !e.ready; MT.sfx(e.ready ? 'confirm' : 'cancel'); }
      if (I.pressed('cancel')) { if (e === L.entries[0]) { G.go('difficulty'); return; } L.entries = L.entries.filter(x => x !== e); MT.sfx('cancel'); }
    }
    if (L.entries.length && L.entries.every(e => e.ready)) { L.countdown = 2; MT.banner("LET'S PLAY!", '#ffcc33', 2); MT.sfx('countdown'); }
    if (MT.lobbyAdded) MT.lobbyAdded = false;
  },
  draw(r) {
    const L = MT.lobby, G = MT.G;
    r.sky(['#140a34', '#3a1c66']);
    r.overlay(g => E.font.title(g, "TONIGHT'S CONTESTANTS", r.W / 2, 16, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    for (let s = 0; s < 4; s++) {
      const x = Math.round(r.W * (.14 + s * .24)), y = Math.round(r.H * .58), e = L.entries.find(q => q.slot === s || q.slot === undefined) ;
      const ent = L.entries[s];
      r.overlay(g => {
        E.ui.box(g, x - 36, y - 60, 72, 84, { bg: ent ? ['#241240', '#0e061e'] : ['#130a20', '#060310'], border: MT.slots[s].color, alpha: .9 });
        if (ent) {
          E.font.text(g, MT.LOOKS[ent.look].name, x, y - 52, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' });
          E.font.text(g, (ent.ready ? 'READY' : 'NOT YET'), x, y + 30, ent.ready ? '#7ad06a' : '#ffcc33', { scale: 1, align: 'center', shadow: '#000' });
        } else E.font.text(g, 'PRESS START', x, y - 4, '#8a7aa8', { scale: 1, align: 'center', wrap: 60 });
      });
      if (ent) MT.drawLookIn(r, x, y - 10, ent, s);
    }
    if (L.countdown !== null) r.overlay(g => E.font.title(g, Math.ceil(L.countdown) + '', r.W / 2, r.H / 2, { scale: 4, align: 'center', colors: ['#ffcc33', '#ff2e88'] }));
    r.overlay(g => E.font.text(g, 'ENTER / PAD SELECT TO READY, LEFT RIGHT TO CHANGE LOOK', r.W / 2, r.H - 40, '#c8c0e0', { scale: 1, align: 'center', shadow: '#000' }));
    MT.glyphBar(r, [['confirm', 'READY'], ['left', 'LOOK'], ['cancel', 'BACK']]);
  }
};
MT.drawLookIn = (r, x, y, ent, s) => {
  r.queue(x, y + 20, 6, g => { /* a portrait stand-in: the look's colours in a disc */ const [ox, oy] = r.w(x, y + 20, 6); px.disc(g, ox, oy, 12, MT.slots[s].color); px.disc(g, ox, oy - 6, 6, '#e8c8a0'); });
};
MT.lobbyStart = (G, L) => {
  const ents = L.entries.map(e => ({ slot: e.slot, input: e.input, look: e.look }));
  for (const e of ents) MT.slots[e.slot % 4].look = e.look;
  MT.startNewRun(G, { mode: 'arcade', diff: MT.pickDiff || 'contestant', slots: ents.map(e => e.slot), inputs: ents });
};
MT.startNewRun = (G, o) => {
  const run = MT.startRun({ mode: o.mode, diff: o.diff, slots: o.slots, seed: (Math.random() * 1e9 | 0) + 1 });
  run.players = o.inputs.map(e => ({ slot: e.slot, input: e.input, c: null }));
  G.go('play', { run, startEp: 1, cold: true });
};

/* ---------- scene: episodes (rehearsal: the same rules, no high score) ---------- */
MT.scenes.episodes = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() {
    const reached = E.store.get('mashtv:reached', 1);
    MT.menu.eps = new MenuList(MT.EPISODES.map((e, i) => ({ label: 'EPISODE ' + e.id + ': ' + e.title, id: e.id, disabled: e.id > reached })), { y0: 0, w: 380, rowH: 28,
      onPick: (i, it) => { MT.rehearsal = it.id; MT.G.go('lobby', { rehearsal: true }); } });
  },
  update(dt) { if (MT.G.input.pressed('cancel')) return MT.G.go('title'); MT.menu.eps.update(MT.G); },
  draw(r) {
    r.sky(['#140a34', '#3a1c66']); r.overlay(g => E.font.title(g, 'EPISODES', r.W / 2, 22, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    const m = MT.menu.eps; m.cx = r.W / 2; m.y0 = Math.round(r.H * .34); m.draw(r);
    r.overlay(g => E.font.text(g, 'LOCKED EPISODES OPEN WHEN YOU REACH THEM', r.W / 2, r.H - 40, '#8a7aa8', { scale: 1, align: 'center' }));
    MT.glyphBar(r, [['confirm', 'PLAY'], ['cancel', 'BACK']]);
  }
};

/* ---------- scene: how to play (3 pages) ---------- */
MT.HOWTO = [
  ['CONTROLS', ['MOVE: stick or WASD', 'AIM AND FIRE: right stick or mouse (fires while pushed)', 'SLIDE: dodge with i-frames', 'SHOWSTOPPER: screen bomb', 'SHOWBOAT: taunt for ratings', 'PAUSE: Options or Esc']],
  ['THE SHOW', ['Clear each room, then pick a door. Cash grows x multiplier with ratings.', 'Ratings reach 100: PRIME TIME. Ratings fall when you do nothing.', 'Golden keys: 9 in all. 5 opens the Green Room.', 'Lose all lives and your winnings are halved to continue.']],
  ['POWER-UPS', ['TRIPLE PLAY: three bolts.', 'PRIME-TIME ROCKETS: splash.', 'POPCORN POPPER: lobbed bags.', 'LIMELIGHT LASER: a beam through a line.', 'GOLD RECORDS: orbiting discs.', 'SPONSOR SHIELD, SPEED SNEAKERS, ENCORE (+1 life)']]
];
MT.scenes.howto = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter(d) { MT.howPage = (d && d.page) || 0; },
  update(dt) {
    const I = MT.G.input;
    if (I.pressed('right') || I.pressed('tabR')) MT.howPage = (MT.howPage + 1) % MT.HOWTO.length;
    if (I.pressed('left') || I.pressed('tabL')) MT.howPage = (MT.howPage + MT.HOWTO.length - 1) % MT.HOWTO.length;
    if (I.pressed('cancel') || I.pressed('confirm')) return MT.G.go('title');
    if (MT.idleTick(MT.G, dt)) MT.G.go('attract');
  },
  draw(r) {
    const [title, lines] = MT.HOWTO[MT.howPage];
    r.sky(['#140a34', '#3a1c66']);
    r.overlay(g => { E.font.title(g, 'HOW TO PLAY', r.W / 2, 18, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); E.font.text(g, title + '  ' + (MT.howPage + 1) + '/' + MT.HOWTO.length, r.W / 2, 56, '#2ee6ff', { scale: 2, align: 'center' }); });
    lines.forEach((l, i) => r.overlay(g => E.font.text(g, l, 22, 92 + i * 20, '#fff7e8', { scale: 1, shadow: '#000', wrap: r.W - 44 })));
    MT.glyphBar(r, [['left', 'PAGE'], ['confirm', 'BACK']]);
  }
};

/* ---------- scene: top earners (the arcade table) ---------- */
MT.scenes.scores = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter(d) { MT.scoresFrom = d && d.fromRun; },
  update(dt) { if (MT.G.input.pressed('confirm') || MT.G.input.pressed('cancel') || MT.G.input.pressed('start')) MT.G.go('title'); if (MT.idleTick(MT.G, dt)) MT.G.go('attract'); },
  draw(r) {
    r.sky(['#2a1408', '#6a3a1a']);
    r.overlay(g => px.rect(g, 0, 0, r.bw, r.bh, 'rgba(20,8,4,0.5)'));
    MT.cab.drawTable(r, '', 40, 'TOP EARNERS');
    MT.glyphBar(r, [['confirm', 'BACK']]);
  }
};

/* ---------- scene: about & credits (pages from src/about.json) ---------- */
MT.scenes.about = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter(d) { MT.aboutPage = (d && d.page) || 0; },
  update(dt) {
    const I = MT.G.input, n = MT.ABOUT_PAGES().length;
    if (I.pressed('right') || I.pressed('confirm') || I.pressed('tabR')) MT.aboutPage = Math.min(n - 1, MT.aboutPage + 1);
    if (I.pressed('left') || I.pressed('tabL')) MT.aboutPage = Math.max(0, MT.aboutPage - 1);
    if (I.pressed('cancel')) return MT.G.go('title');
    if (MT.idleTick(MT.G, dt)) MT.G.go('attract');
  },
  draw(r) {
    const pages = MT.ABOUT_PAGES(), p = pages[MT.aboutPage];
    r.sky(['#140a34', '#3a1c66']);
    r.overlay(g => { E.font.title(g, p.title, r.W / 2, 16, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); });
    let y = 58; const lh = E.font.lineHeight({ scale: 1 });
    for (const line of p.lines) { for (const piece of E.font.wrap(line, r.W - 32, { scale: 1 })) { r.overlay(g => E.font.text(g, piece, 16, y, '#fff7e8', { scale: 1 })); y += lh; } y += lh / 2; }
    r.overlay(g => E.font.text(g, (MT.aboutPage + 1) + '/' + pages.length, r.W - 20, r.H - 12, '#8a7aa8', { scale: 1, align: 'right' }));
    MT.glyphBar(r, [['left', 'PAGE'], ['cancel', 'BACK']]);
  }
};
MT.ABOUT_PAGES = () => {
  const A = MT.ABOUT;
  const kv = o => Object.keys(o).map(k => k[0].toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1') + ': ' + o[k]);
  return [
    { title: 'MASH TV', lines: ['A 1-4 player twin-stick arena shooter inside the deadliest game show on TV. Built with the my-3D2dge engine.', 'Original music, sound effects and voices, all made in code. Inspired by Smash TV (1990).', 'Model: ' + MT.MODEL + '.'] },
    { title: 'SOURCE INFORMATION', lines: kv(A.sourceInformation) },
    { title: 'TESTING FEEDBACK', lines: A.testingFeedback },
    { title: 'ENGINE FEEDBACK', lines: A.engineFeedback },
    { title: 'PROMPT FEEDBACK', lines: A.promptFeedback }
  ];
};

/* ---------- scene: game over (the sad trombone, the contestants down) ---------- */
MT.scenes.gameover = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() { MT.gameOverT = 0; MT.music(null); },
  update(dt) { MT.gameOverT += dt; if (MT.gameOverT > 2 && (MT.G.input.pressed('confirm') || MT.G.input.pressed('start'))) MT.G.go('title'); },
  draw(r) {
    r.sky(['#301010', '#6a2a2a']);
    r.overlay(g => E.font.title(g, 'GAME OVER', r.W / 2, r.H / 2 - 40, { scale: 3, align: 'center', colors: ['#ff3344', '#ffcc33'] }));
    r.overlay(g => E.font.text(g, 'AND THAT\'S A WRAP! FOR YOU, PERMANENTLY!', r.W / 2, r.H / 2 + 6, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' }));
    MT.glyphBar(r, [['confirm', 'TITLE']]);
  }
};

/* ---------- scene: the play scene (the run; the World is ticked by the flow's room) ---------- */
MT.scenes.play = {
  mtPreset: 'play', input: MT.MASH_PLAY, view: 'threequarter', res: 'ps1', expand: true, pausable: true, touch: [],
  camera: { zoom: false }, corner: undefined,
  enter(d) {
    const G = MT.G, S = MT.PLAY;
    G.setView(G.settings.camView === 'overhead' ? 'topdown' : 'threequarter');
    if (!(d && d.session)) G.allowJoin({ max: 4, keys: false, onJoin: (input) => MT.dropIn(input) });
    MT.scenes.play.pausable = !(d && d.session);   // a session never pauses: Esc opens its own overlay
    G.lights.enabled = true; G.lights.ambient = .55; G.lights.dark = [6, 3, 16]; G.lights.refresh && G.lights.refresh();
    G.follow && G.follow(null); G.cam.bounds = null; G.focus(184, 120, 0);
    MT.inRun = true;
    if (!MT.run) return G.go('title');
    if (d && d.rehearsal) MT.run.mode = 'rehearsal';
    S.stop = false; S.cutting = false; S.holdWorld = true; S.cold = false;
    S.job && S.job.cancel && S.job.cancel();
    if (d && d.session) S.job = MT.NET.host ? G.script(MT.sessionFlow(G, MT.run)) : null;
    else S.job = G.script(MT.flow(G, MT.run, { startEp: (d && d.startEp) || 1, skipCold: !(d && d.cold), room: d && d.room, skipCard: !!(d && d.room) }));
    MT.cab = MT.cab || null;
    MT.joinMid = true;
  },
  exit() { const G = MT.G; G.lights.enabled = false; G.allowJoin(false); MT.PLAY.W = null; MT.PLAY.job = null; },
  update(dt) {
    const G = MT.G, S = MT.PLAY;
    if (!MT.run) return;
    G.focus(184, 120, 0); MT.fitCamera(G);
    // a contestant out of lives: Start continues just them, at half their winnings
    for (const c of (S.W ? S.W.players : [])) if (c.state === 'out' && c.input && c.input.pressed('start') && MT.allOut(MT.run) === false) { c.continueOn(S.W); MT.banner(c.name + ' IS BACK', c.color, 1.8); }
    MT.updateLines(dt); MT.updateBanners(dt);
    MT.cab.update(dt);   // the continue countdown and the cards (the arcade's clock)
    if (S.recap) S.recap.t = (S.recap.t || 0) + dt;
    if (MT.cab.continuing || MT.cab.entry) return;
    if (S.ending) { MT.endingStep(G, dt); return; }
    if (MT.NET.on) { if (MT.NET.ended) { G.go('sessionend', null, { fade: 0 }); return; } if (G.input.pressed('pause') || (G.players || []).some(p => p.pressed('pause'))) MT.netOverlay.open = !MT.netOverlay.open; if (MT.netOverlay.open) MT.netOverlayUpdate(G); }
    if (MT.dev.open) { MT.dev.update(G, dt); return; }
    if (S.mapOverlay || S.howOverlay) { const I = G.input; if (I.pressed('cancel') || I.pressed('confirm')) { S.mapOverlay = null; S.howOverlay = null; } return; }
    if (MT.NET.on && !MT.NET.host) MT.netClientStep(G, dt);
    else if (S.W && !S.holdWorld && !S.cold) MT.playStep(G, dt);
    else if (S.W && S.holdWorld) { MT.playStep(G, 0); }
    if (S.greenRoom && S.W) { /* the bonus is run by the flow */ }
  },
  draw(r) {
    const G = MT.G, S = MT.PLAY, W = S.W;
    if (!MT.run) { r.sky(['#140a34', '#3a1c66']); return; }
    const set = W ? MT.SETS[W.set] : MT.SETS.studio;
    if (S.ending) { MT.drawEnding(r, S.ending); MT.hud.lowerThird(r, {}); return; }
    r.sky(['#0a0418', '#241040']);
    if (W) W.draw(r, {});
    if (W) { MT.hud.ratings(r, MT.run, W); MT.hud.roomBar(r, W); }
    if (W) MT.hud.bossBar(r, W);
    for (const c of (W ? W.players : [])) { if (c.slot !== undefined && c.n) MT.hud.panel(r, c, c.slot); }
    MT.hud.bugs(r);
    MT.hud.banners(r);
    if (MT.lineNow && !S.cold) MT.hud.lowerThird(r, {});
    if (S.cold) MT.hud.lowerThird(r, {});
    if (S.card) MT.hud.card(r, S.card.title, S.card.sub, S.card.line);
    if (S.mapCard && W) MT.hud.mapCard(r, S.mapCard.ep, S.mapCard.roomId);
    if (S.recap) MT.drawRecap(r, S.recap);
    if (S.credits) MT.drawCredits(r, S.credits);
    if (MT.dev && MT.dev.badge && MT.dev.badge()) r.overlay(g => { E.ui.box(g, r.W - 56, 4, 52, 14, { bg: ['#ff8a2a', '#c04a00'], alpha: .95 }); E.font.text(g, 'DEV', r.W - 30, 7, '#15121c', { scale: 1, align: 'center' }); });
    if (W && W.phase === 'exit') {}
    if (S.greenRoom) r.overlay(g => E.font.title(g, 'GREEN ROOM', r.W / 2, 60, { scale: 2, align: 'center', colors: ['#ffcc33', '#2ee6ff'] }));
    if (S.mapOverlay && W) { r.overlay(g => px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,4,20,0.7)')); MT.hud.mapCard(r, W.ep, W.id); }
    if (S.howOverlay) MT.drawHowOverlay(r, S.howOverlay);
    if (MT.NET.on && MT.netOverlay.open) MT.netOverlayDraw(r);
    MT.cab.draw(r, [0, 0, r.W, r.H]);   // the continue countdown, the initials entry and the cards
    if (MT.dev.open) MT.dev.draw(r);
    if (S.stop) return;
  }
};
MT.drawRecap = (r, R) => {
  const t = R.t || 0, shown = Math.floor(t / 1.4);
  const list = R.rows.map(c => ({ c, prizes: c.prizes }));
  const all = list.reduce((n, row) => n + row.prizes.length, 0);
  r.overlay(g => { px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,6,20,0.92)'); E.font.title(g, 'PRIZE RECAP: EPISODE ' + R.ep, r.W / 2, 10, { scale: 2, align: 'center', colors: ['#ff8ad8', '#ffcc33'] }); });
  // Penny's turntable stage
  r.overlay(g => { E.ui.box(g, r.W / 2 - 70, r.H - 60, 140, 26, { bg: ['#1fa8a0', '#0c5a55'], border: '#2ee6ff', alpha: .9 }); E.font.text(g, 'PENNY PRIZE', r.W / 2, r.H - 52, '#ffffff', { scale: 1, align: 'center', shadow: '#000' }); });
  let idx = 0;
  R.rows.forEach((c, i) => {
    const x = Math.round(r.W * (.2 + i * .22));
    const k = Math.min(1, Math.max(0, (t - i * .3) / 3));
    const total = Math.round(c.cash * k);
    r.overlay(g => {
      E.ui.box(g, x - 46, 26, 92, 26, { bg: ['#241240', '#0e061e'], border: c.color, alpha: .9 });
      E.font.text(g, c.name, x, 30, c.color, { scale: 1, align: 'center', shadow: '#000' });
      E.font.text(g, '$' + total.toLocaleString('en-US'), x, 42, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' });
    });
    c.prizes.forEach((p, j) => {
      if (idx++ >= shown) return;
      r.overlay(g => { E.font.text(g, p[0].slice(0, 24), x, 60 + j * 14, '#ff8ad8', { scale: 1, align: 'center', shadow: '#000' }); });
    });
  });
  if (shown >= all && all > 0) {
    const mvp = R.rows.slice().sort((a, b) => b.cash - a.cash)[0];
    r.overlay(g => E.font.title(g, 'EPISODE MVP: ' + mvp.name, r.W / 2, r.H / 2 + 20, { scale: 2, align: 'center', colors: ['#ffcc33', '#ff2e88'] }));
  }
  if (shown > 0 && shown <= all && t % 1.4 < .1) MT.sfx('prize', { vol: .3 });
  MT.drawLines(r, 'RECAP');
};
MT.drawCredits = (r, C) => {
  const y = Math.round(r.H - (C.t += 0) * 0 - 10 - MT.G.time * 0 * 0);
  r.overlay(g => { px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,6,20,0.92)'); E.font.title(g, 'MASH TV', r.W / 2, r.H / 3, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); E.font.text(g, 'MADE WITH THE MY-3D2DGE ENGINE', r.W / 2, r.H / 3 + 40, '#fff7e8', { scale: 1, align: 'center' }); E.font.text(g, 'ORIGINAL MUSIC, SOUND AND VOICES MADE IN CODE', r.W / 2, r.H / 3 + 56, '#fff7e8', { scale: 1, align: 'center' }); E.font.text(g, 'INSPIRED BY SMASH TV (1990). MODEL: ' + MT.MODEL, r.W / 2, r.H / 3 + 72, '#2ee6ff', { scale: 1, align: 'center' }); });
};
MT.drawLines = (r, tag) => {};

// the lower third's clock: lines type out, each for its own time, the voice playing with it
MT.updateLines = (dt) => {
  const L = MT.lineNow;
  if (L) { L.t += dt; if (!L.voiced) { L.voiced = true; const d = MT.babble.say(L.text, L.voice, {}); L.dur = Math.max(2.4, d + 1); } if (L.t >= L.dur) MT.lineNow = null; return; }
  if (MT.lines.length) { const n = MT.lines.shift(); n.t = 0; MT.lineNow = n; }
};
MT.updateBanners = (dt) => { for (const b of MT.banners) b.age += dt, b.t -= dt; MT.banners = MT.banners.filter(b => b.t > 0); };
// fit the arena to the screen (§5.5): the walled arena fills the screen, leaving room for the HUD at top and bottom
MT.fitCamera = (G) => {
  if (!G.W || !G.H) return;
  const zoom = Math.min(G.W / 390, (G.H - 44) / 262);
  const z = clampZ(zoom * MT.T.camZoom);
  if (Math.abs((G.zoom || 1) - z) > .01) G.setZoom(z);
};
const clampZ = z => Math.max(.6, Math.min(2.4, z));
