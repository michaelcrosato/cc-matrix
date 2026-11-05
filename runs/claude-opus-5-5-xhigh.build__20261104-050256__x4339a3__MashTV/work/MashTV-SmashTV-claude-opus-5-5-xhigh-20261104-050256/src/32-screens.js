// ---- front-end and between-room scenes: title, menu, difficulty, lobby, how to play, episodes, scores, about,
//      the prize recap, game over and initials. Every one: big text, at most six focusable items, a prompt bar ----
const BACKDROP = { arena: null };
function backdrop(r, t, dim = .55) {
  if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio', { corner: true });
  const A = BACKDROP.arena;
  A.draw(r, t, null);
  r.overlay(g => px.blend(g, dim, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')));
}
function frontStep(dt, name) {
  if (MT.idle.scene !== name || MT.idle.sceneT !== game.sceneName) { MT.idle.scene = name; MT.idle.sceneT = game.sceneName; MT.idle.reset(); }
  MT.idleStep(dt); LINES.step(1 / 120); MT.banners.step(dt); MT.studioStep(dt, null);
  if (!game.headless) { if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio'); BACKDROP.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); }
  game.lights.enabled = true; game.lights.ambient = .5;
  if (MT.IDLE_SCENES.includes(name) && MT.idle.t >= 10 && !(game.shell && game.shell.screen)) { MT.idle.reset(); game.go('attract', {}, { fade: 'white', seconds: .3 }); return true; }
  return false;
}
function frontCam() { if (!game.headless) { if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio'); BACKDROP.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); } game.lights.enabled = true; game.lights.ambient = .5; }
MT.frontCam = frontCam;
MT.IDLE_SCENES = ['title', 'howto', 'episodes', 'scores', 'about', 'lobby', 'difficulty'];
const FRONT = { view: 'threequarter', input: MASH_MENU, expand: true, touch: [], camera: { zoom: false } };
const scene = (o) => Object.assign({}, FRONT, o);
const versionLine = () => ((typeof E.versionLabel === 'function' ? E.versionLabel() : 'my-3D2dge ' + E.version) + '  -  MASH TV ' + MT.VERSION).replace(/·/g, '-');
const rowsLayout = (r, n, y0, w = 220, h = 20, gap = 4) => Array.from({ length: n }, (_, i) => ({ x: Math.round(r.W / 2 - w / 2), y: y0 + i * (h + gap), w, h }));
const screenWH = () => ({ W: game.screen.W || 427, H: game.screen.H || 240 });
// ------------------------------------------------------------------------------------------------ title
MT.scenes = MT.scenes || {};
MT.scenes.title = scene({
  enter(d = {}) { this.t = 0; this.phase = d.menu ? 'menu' : 'press'; this.st = { i: 0 }; MT.music.play('theme'); MT.idle.reset(); game.allowJoin(false); MT.run = MT.run && MT.run.mode === 'session' ? MT.run : null; for (const p of game.players) p.touchEnabled = false; this.touchBtn = null; },
  update(dt) {
    this.t += dt; if (frontStep(dt, 'title')) return;
    const nav = UI.nav(), touch = MT.touchOnly();
    if (touch) { const c = game.input.clicked(); if (c && this.touchBtn && UI.clickIn(this.touchBtn)) game.menu('settings'); return; }
    if (this.phase === 'press') { if (nav.confirm || nav.start || game.input.clicked()) { this.phase = 'menu'; MT.sfx('bell'); } return; }
    const items = MT.TEXT.ui.menu.map(label => ({ label })), { W, H } = screenWH();
    const res = UI.listStep(this.st, items, rowsLayout({ W, H }, items.length, Math.round(H * .44), 220, 19, 3), nav);
    if (nav.cancel) { this.phase = 'press'; MT.sfx('back'); }
    if (res.picked >= 0) {
      const k = res.picked;
      if (k === 0) game.go('difficulty', {}); else if (k === 1) game.go('episodes', {}); else if (k === 2) game.go('howto', {}); else if (k === 3) game.go('scores', { after: 'title' }); else if (k === 4) game.menu('settings'); else game.go('about', {});
    }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .45);
    r.overlay(g => {
      const k = E.ease.outBounce(clamp(this.t / 1, 0, 1)), ly = Math.round(-80 + k * (r.H * .1 + 80));
      const lh = UI.logo(g, r.W / 2, ly, r.W >= 400 ? 4 : 3, t);
      UI.text(g, MT.TEXT.ui.sub, r.W / 2, ly + lh + 4, '#2ee6ff', { align: 'center' });
      if (MT.touchOnly()) {
        const w = Math.min(r.W - 30, 300), x = r.W / 2 - w / 2, y = r.H * .52;
        UI.panel(g, x, y, w, 70); UI.bulbs(g, x, y, w, 70, t, { on: '#ff3344' });
        UI.text(g, MT.TEXT.ui.touchNotice, r.W / 2, y + 10, '#ffcc33', { align: 'center', scale: w > 280 ? 1 : 1 });
        UI.text(g, MT.TEXT.ui.touchSub, r.W / 2, y + 22, '#c9b6e4', { align: 'center', font: 'tiny' });
        const bw = 120, bh = 22, bx = Math.round(r.W / 2 - bw / 2), by = Math.round(y + 38); this.touchBtn = { x: bx, y: by, w: bw, h: bh };
        px.rect(g, bx, by, bw, bh, '#ffcc33'); UI.text(g, MT.TEXT.ui.settings, r.W / 2, by + 4, '#140a24', { align: 'center', scale: 2, shadow: false });
      } else if (this.phase === 'press') {
        if (Math.floor(t * 2) % 2 === 0) { const I = UI.lastInput(); const items = [['confirm', MT.TEXT.ui.toStart]]; const w = MT.glyph.measure(items, I, { scale: 2 }) + UI.width(MT.TEXT.ui.press, 2) + 6; const x = r.W / 2 - w / 2; UI.text(g, MT.TEXT.ui.press, x, r.H * .62, '#fff7e8', { scale: 2 }); MT.glyph.prompt(g, x + UI.width(MT.TEXT.ui.press, 2) + 6, r.H * .62 - 2, items, I, { scale: 2 }); }
      } else {
        const items = MT.TEXT.ui.menu, R = rowsLayout(r, items.length, Math.round(r.H * .44), 220, 19, 3);
        UI.panel(g, R[0].x - 8, R[0].y - 6, R[0].w + 16, R.length * 22 + 10, { alpha: .8 });
        items.forEach((label, i) => UI.row(g, R[i], label, this.st.i === i, t));
        UI.promptBar(g, r, [['confirm', MT.TEXT.ui.select], ['cancel', MT.TEXT.ui.back]]);
      }
      UI.text(g, versionLine(), 4, r.H - 8, '#7a6a8a', { font: 'tiny' });
    });
  },
});
// ------------------------------------------------------------------------------------------------ difficulty
MT.scenes.difficulty = scene({
  enter(d = {}) { this.st = { i: 1 }; this.d = d; },
  update(dt) {
    if (frontStep(dt, 'difficulty')) return;
    const nav = UI.nav(), keys = Object.keys(DIFF), { W, H } = screenWH();
    const res = UI.listStep(this.st, keys.map(k => ({ label: k })), rowsLayout({ W, H }, 3, 70, 300, 40, 6), nav);
    if (nav.cancel) { MT.sfx('back'); game.go(this.d.rehearsal ? 'episodes' : 'title', { menu: true }); }
    if (res.picked >= 0) game.go('lobby', Object.assign({}, this.d, { diff: keys[res.picked] }));
  },
  draw(r) {
    const t = game.real; backdrop(r, t);
    r.overlay(g => {
      UI.title(g, MT.TEXT.ui.difficulty, r.W / 2, 22, 2);
      const keys = Object.keys(DIFF), R = rowsLayout(r, 3, 70, 300, 40, 6);
      keys.forEach((k, i) => { const D = DIFF[k], f = this.st.i === i; UI.panel(g, R[i].x, R[i].y, R[i].w, R[i].h, { alpha: .85, border: f ? '#ffcc33' : '#5a4a6a' }); if (f) UI.bulbs(g, R[i].x, R[i].y, R[i].w, R[i].h, t); UI.text(g, D.label, R[i].x + 10, R[i].y + 6, f ? '#ffcc33' : '#fff7e8', { scale: 2 }); UI.text(g, D.blurb, R[i].x + 10, R[i].y + 24, '#c9b6e4'); UI.text(g, D.hp + ' HP, ' + D.lives + ' LIVES', R[i].x + R[i].w - 10, R[i].y + 8, '#5fe0a0', { align: 'right' }); });
      UI.promptBar(g, r, [['confirm', MT.TEXT.ui.select], ['cancel', MT.TEXT.ui.back]]);
    });
  },
});
// ------------------------------------------------------------------------------------------------ the contestant lobby
MT.scenes.lobby = scene({
  enter(d = {}) {
    this.d = d; this.t = 0; this.count = -1; this.slots = [{ input: game.input, look: 0, ready: false }, null, null, null];
    for (const p of game.players.slice(1)) this.addSlot(p);
    game.allowJoin({ max: 4, keys: false, onJoin: q => this.addSlot(q) });
    this.rigs = [0, 1, 2, 3].map(i => makeContestantRig(i, i)); MT.music.play('theme');
  },
  exit() { game.allowJoin(false); },
  addSlot(q) { const i = this.slots.findIndex(s => !s); if (i < 0) return; this.slots[i] = { input: q, look: i, ready: false }; this.rigs[i] = makeContestantRig(i, i); MT.sfx('bell'); },
  update(dt) {
    this.t += dt;
    const anyJoined = this.slots.filter(Boolean).length > 1 || this.slots[0].ready;
    if (!anyJoined && frontStep(dt, 'lobby')) return; else if (anyJoined) { MT.idleStep(dt); LINES.step(1 / 120); if (!game.headless) { if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio'); BACKDROP.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); } }
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i]; if (!s) continue; const I = s.input;
      if (!MT.cfg.skipRigs) this.rigs[i].update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: s.ready ? 'cheer' : null, expr: s.ready ? 'smile' : null });
      if (I.pressed('left') && !s.ready) { s.look = (s.look + 3) % 4; this.rigs[i] = makeContestantRig(i, s.look); MT.sfx('blip'); }
      if (I.pressed('right') && !s.ready) { s.look = (s.look + 1) % 4; this.rigs[i] = makeContestantRig(i, s.look); MT.sfx('blip'); }
      if (I.pressed('confirm') || (I.pressed('start') && i > 0)) { if (!s.ready) { s.ready = true; MT.sfx('bell'); MT.babble.say('YES!', 'contestant' + (i + 1)); } }
      if (I.pressed('cancel')) { if (s.ready) { s.ready = false; MT.sfx('back'); this.count = -1; } else if (i === 0) { MT.sfx('back'); game.go(this.d.rehearsal ? 'episodes' : 'difficulty', this.d); return; } else { game.removePlayer(I); this.slots[i] = null; MT.sfx('back'); } }
    }
    const c = game.input.clicked(); if (c && this.rects) this.rects.forEach((R, i) => { if (!R || !this.slots[i] || this.slots[i].input !== game.input) return; if (UI.clickIn(R.l)) { const s = this.slots[i]; s.look = (s.look + 3) % 4; this.rigs[i] = makeContestantRig(i, s.look); } if (UI.clickIn(R.r)) { const s = this.slots[i]; s.look = (s.look + 1) % 4; this.rigs[i] = makeContestantRig(i, s.look); } if (UI.clickIn(R.ok)) this.slots[i].ready = true; });
    const joined = this.slots.filter(Boolean), allReady = joined.length && joined.every(s => s.ready);
    if (allReady && this.count < 0) { this.count = 2; MT.sfx('countgo'); }
    if (!allReady) this.count = -1;
    if (this.count >= 0) { this.count -= dt; if (this.count <= 0) this.start(); }
  },
  start() {
    const d = this.d, run = MT.newRun({ mode: d.rehearsal ? 'rehearsal' : 'arcade', diff: d.diff || 'CONTESTANT', ep: d.rehearsal || 1 });
    this.slots.forEach((s, i) => { if (!s) return; s.input.use(MASH_PLAY); MT.addRunPlayer({ slot: i, look: s.look, ctl: 'local', input: s.input }); });
    if (d.rehearsal && d.rehearsal > 1) game.go('play', { room: MT.EPISODES[d.rehearsal].start, intro: 'episode' });
    else game.go('play', { room: '1-1', intro: d.rehearsal ? 'episode' : 'coldOpen' });
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .5);
    r.overlay(g => {
      UI.title(g, MT.TEXT.ui.lobby, r.W / 2, 8, 2);
      if (this.d.rehearsal) UI.text(g, MT.TEXT.ui.rehearsal + ': EPISODE ' + this.d.rehearsal, r.W / 2, 28, '#2ee6ff', { align: 'center' });
      const pw = Math.min(96, (r.W - 30) / 4), ph = 150, y = 44; this.rects = [];
      for (let i = 0; i < 4; i++) {
        const x = Math.round(r.W / 2 - pw * 2 - 9 + i * (pw + 6)), s = this.slots[i], col = SLOT_COLORS[i];
        game.lights.add(0, 0, 0, 0, 0);
        UI.panel(g, x, y, pw, ph, { alpha: .82, border: s ? col : '#3a2a50' });
        px.blend(g, .25, 'add', () => px.poly(g, [[x + pw / 2 - 6, y], [x + pw / 2 + 6, y], [x + pw - 4, y + ph - 30], [x + 4, y + ph - 30]], s ? '#fff6d0' : '#3a2a50'));
        px.rect(g, x + 8, y + ph - 34, pw - 16, 8, '#c8a040'); px.rect(g, x + 8, y + ph - 34, pw - 16, 2, '#fff6b0');
        UI.text(g, 'P' + (i + 1), x + 6, y + 4, col);
        if (!s) {
          if (Math.floor(t * 2) % 2 === 0) { UI.text(g, MT.TEXT.ui.press, x + pw / 2, y + 50, '#c9b6e4', { align: 'center' }); const I = game.input; const fake = { lastDevice: 'gamepad', glyphs: I.glyphs, map: MASH_MENU, codeLabel: c2 => c2 }; MT.glyph.draw(g, x + pw / 2 - 12, y + 62, 'start', fake); UI.text(g, MT.TEXT.ui.join, x + pw / 2, y + 78, '#c9b6e4', { align: 'center' }); }
          this.rects.push(null); continue;
        }
        const L = LOOKS[s.look];
        this.rigs[i].drawPortrait(g, x + pw / 2 - 28, y + 18, 56, { zoom: 2.6, turn: .3, bg: E.tones(col).deep, frame: true });
        UI.text(g, L.name, x + pw / 2, y + 80, col, { align: 'center', scale: 2 });
        UI.text(g, MT.TEXT.contestantLines[s.look].split('!')[0].slice(0, 22), x + pw / 2, y + 98, '#c9b6e4', { align: 'center', font: 'tiny' });
        const R = { l: { x: x + 4, y: y + 40, w: 14, h: 18 }, r: { x: x + pw - 18, y: y + 40, w: 14, h: 18 }, ok: { x: x + 8, y: y + ph - 24, w: pw - 16, h: 18 } };
        this.rects.push(R);
        if (!s.ready) { UI.text(g, '<', R.l.x + 4, R.l.y + 4, '#ffcc33', { scale: 2 }); UI.text(g, '>', R.r.x + 2, R.r.y + 4, '#ffcc33', { scale: 2 }); }
        if (s.ready) { px.rect(g, R.ok.x, R.ok.y, R.ok.w, R.ok.h, '#3aff6a'); UI.text(g, MT.TEXT.ui.ready, x + pw / 2, R.ok.y + 5, '#140a24', { align: 'center', shadow: false }); }
        else { MT.glyph.prompt(g, x + pw / 2, R.ok.y + 3, [['confirm', 'READY']], s.input, { align: 'center' }); }
      }
      if (this.count >= 0) UI.title(g, MT.TEXT.ui.letsPlay + ' ' + Math.ceil(this.count), r.W / 2, y + ph + 4, 2, { colors: ['#3aff6a', '#2ee6ff'] });
      else UI.promptBar(g, r, [['left', ''], ['right', MT.TEXT.ui.look], ['confirm', MT.TEXT.ui.ready], ['cancel', MT.TEXT.ui.back]]);
    });
  },
});
// ------------------------------------------------------------------------------------------------ how to play
MT.scenes.howto = scene({
  enter(d = {}) { this.page = 0; this.from = d.from || 'title'; },
  update(dt) {
    if (frontStep(dt, 'howto')) return;
    const nav = UI.nav(), n = MT.TEXT.howto.length;
    if (nav.right || nav.tabR || nav.confirm) { if (this.page < n - 1) { this.page++; MT.sfx('page'); } else if (nav.confirm) { game.go('title', { menu: true }); } }
    if (nav.left || nav.tabL) { if (this.page > 0) { this.page--; MT.sfx('page'); } }
    if (nav.cancel) { MT.sfx('back'); game.go('title', { menu: true }); }
    if (this.arrows) { if (UI.clickIn(this.arrows.r) && this.page < n - 1) this.page++; if (UI.clickIn(this.arrows.l) && this.page > 0) this.page--; }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .6);
    r.overlay(g => MT.drawHowto(g, r, this.page, t, this));
  },
});
MT.drawHowto = (g, r, page, t, self) => {
  const P = MT.TEXT.howto[page], n = MT.TEXT.howto.length, I = UI.lastInput(), w = Math.min(r.W - 20, 380), x = Math.round(r.W / 2 - w / 2), y = 10, h = r.H - 44;
  UI.panel(g, x, y, w, h, { alpha: .9 });
  UI.title(g, 'HOW TO PLAY: ' + P.title, r.W / 2, y + 6, 2);
  UI.text(g, (page + 1) + ' / ' + n, x + w - 8, y + 8, '#c9b6e4', { align: 'right' });
  let yy = y + 30;
  if (P.rows) for (const [a, label] of P.rows) { const iw = MT.glyph.draw(g, x + 14, yy, a, I, { scale: 1 }); if (a === 'move' || a === 'aim') { } UI.text(g, label, x + 20 + Math.max(iw, 30), yy + 2, '#fff7e8'); yy += 18; }
  if (P.rows) { if (I.lastDevice === 'gamepad') { UI.text(g, 'FACE BUTTONS WORK TOO:', x + 14, yy + 4, '#2ee6ff'); let gx = x + 20 + UI.width('FACE BUTTONS WORK TOO:'); for (const [code, lab] of [['Pad0', 'SLIDE'], ['Pad1', 'SHOWSTOPPER'], ['Pad3', 'SHOWBOAT']]) { gx += MT.glyph.drawCode(g, gx, yy + 2, code, I) + 2; UI.text(g, lab, gx, yy + 4, '#fff7e8'); gx += UI.width(lab) + 8; } } else UI.text(g, 'ARROW KEYS FIRE IN 8 WAYS - HOLD LEFT CLICK TO FIRE AT THE MOUSE', r.W / 2, yy + 4, '#2ee6ff', { align: 'center', font: 'tiny' }); }
  if (P.text) for (const para of P.text) { for (const ln of FONT.wrap(para, w - 28)) { UI.text(g, ln, x + 14, yy, '#fff7e8'); yy += 10; } yy += 6; }
  if (P.items) for (const id of P.items) { const W2 = WEAPONS[id]; if (id === 'bomb') px.sprite(g, SPR.bulb, x + 14, yy); else if (id === 'life') px.sprite(g, SPR.star, x + 13, yy); else { px.sprite(g, SPR.tv, x + 12, yy - 1); UI.text(g, W2.letter, x + 18, yy + 4, W2.color, { align: 'center', shadow: false }); } UI.text(g, W2.name, x + 32, yy, W2.color || '#ffcc33'); UI.text(g, W2.blurb, x + 32, yy + 9, '#c9b6e4', { font: 'tiny' }); yy += 26; }
  if (P.extra) for (const para of P.extra) for (const ln of FONT.wrap(para, w - 28)) { UI.text(g, ln, x + 14, yy, '#2ee6ff'); yy += 10; }
  if (self) self.arrows = { l: { x: x, y: y + h / 2 - 10, w: 16, h: 20 }, r: { x: x + w - 16, y: y + h / 2 - 10, w: 16, h: 20 } };
  if (page > 0) UI.text(g, '<', x + 4, y + h / 2 - 6, '#ffcc33', { scale: 2 }); if (page < n - 1) UI.text(g, '>', x + w - 12, y + h / 2 - 6, '#ffcc33', { scale: 2 });
  UI.promptBar(g, r, [['left', ''], ['right', 'PAGE'], ['cancel', MT.TEXT.ui.back]]);
};
// ------------------------------------------------------------------------------------------------ episodes (rehearsals)
MT.scenes.episodes = scene({
  enter() { this.st = { i: 0 }; this.best = E.store.get('mashtv:eps', 1); },
  update(dt) {
    if (frontStep(dt, 'episodes')) return;
    const nav = UI.nav(), items = [1, 2, 3].map(k => ({ label: MT.EPISODES[k].title, disabled: k > this.best })), { W, H } = screenWH();
    const res = UI.listStep(this.st, items, rowsLayout({ W, H }, 3, 64, 300, 40, 8), nav);
    if (nav.cancel) { MT.sfx('back'); game.go('title', { menu: true }); }
    if (res.picked >= 0) game.go('difficulty', { rehearsal: res.picked + 1 });
  },
  draw(r) {
    const t = game.real; backdrop(r, t);
    r.overlay(g => {
      UI.title(g, 'EPISODES', r.W / 2, 14, 2); UI.text(g, 'REHEARSALS: SAME RULES, NO TOP EARNERS ENTRY', r.W / 2, 36, '#2ee6ff', { align: 'center', font: 'tiny' });
      const R = rowsLayout(r, 3, 64, 300, 40, 8);
      [1, 2, 3].forEach((k, i) => { const ep = MT.EPISODES[k], lock = k > this.best, f = this.st.i === i; UI.panel(g, R[i].x, R[i].y, R[i].w, R[i].h, { alpha: .85, border: f ? '#ffcc33' : '#5a4a6a' }); if (f) UI.bulbs(g, R[i].x, R[i].y, R[i].w, R[i].h, t); UI.text(g, 'EPISODE ' + k, R[i].x + 10, R[i].y + 5, lock ? '#6a5a7a' : '#2ee6ff'); UI.text(g, lock ? MT.TEXT.ui.locked : ep.title, R[i].x + 10, R[i].y + 17, lock ? '#6a5a7a' : f ? '#ffcc33' : '#fff7e8', { scale: 2 }); if (!lock) UI.text(g, ep.place, R[i].x + R[i].w - 10, R[i].y + 6, '#c9b6e4', { align: 'right', font: 'tiny' }); });
      UI.promptBar(g, r, [['confirm', MT.TEXT.ui.select], ['cancel', MT.TEXT.ui.back]]);
    });
  },
});
// ------------------------------------------------------------------------------------------------ top earners
MT.scenes.scores = scene({
  enter(d = {}) { this.after = d.after || 'title'; this.t = 0; this.attract = !!d.attract; },
  update(dt) {
    this.t += dt; if (!this.attract && frontStep(dt, 'scores')) return;
    if (this.attract) { MT.idleStep(dt); return; }
    const nav = UI.nav(); if ((nav.cancel || nav.confirm || game.input.clicked()) && this.t > .12) { MT.sfx('back'); game.go(this.after, { menu: true }); }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .6);
    r.overlay(g => { const w = Math.min(r.W - 40, 260), x = r.W / 2 - w / 2; UI.panel(g, x, 8, w, r.H - 40, { bg: ['#5a3a10', '#2a1446'] }); UI.bulbs(g, x, 8, w, r.H - 40, t); });
    MT.cab.drawTable(r, 'show', 16, MT.TEXT.ui.scores);
    if (!this.attract) r.overlay(g => UI.promptBar(g, r, [['confirm', 'OK'], ['cancel', MT.TEXT.ui.back]]));
  },
});
// ------------------------------------------------------------------------------------------------ about & credits (paged)
MT.aboutPages = () => {
  const A = MT.ABOUT, pages = [];
  pages.push({ title: 'WHAT IS MASH TV?', lines: A.what });
  pages.push({ title: 'CREDITS', lines: MT.TEXT.credits.filter(Boolean) });
  const si = A.exitInterview.sourceInformation, labels = { date: 'DATE', source: 'SOURCE', plan: 'PLAN', genre: 'GENRE', perspective: 'PERSPECTIVE', tech: 'TECH', artDirection: 'ART DIRECTION', animation: 'ANIMATION', audio: 'AUDIO', online: 'ONLINE', testing: 'TESTING', research: 'RESEARCH', environment: 'ENVIRONMENT', model: 'MODEL', usage: 'USAGE' };
  pages.push({ title: 'SOURCE INFORMATION', pairs: Object.keys(labels).map(k => [labels[k], si[k]]) });
  const qa = (title, qs, ans) => pages.push({ title, pairs: qs.map((q, i) => [q, ans[i]]) });
  qa('TESTING FEEDBACK', A.questions.testing, A.exitInterview.testingFeedback);
  qa('ENGINE FEEDBACK', A.questions.engine, A.exitInterview.engineFeedback);
  qa('PROMPT FEEDBACK', A.questions.prompt, A.exitInterview.promptFeedback);
  return pages;
};
/** split pages into screens that fit (no dense web-style walls of text) */
MT.aboutScreens = (W, H) => {
  const out = [], maxW = Math.min(W - 40, 380), lines = Math.floor((H - 70) / 9);
  for (const p of MT.aboutPages()) {
    const rows = [];
    if (p.lines) for (const l of p.lines) for (const ln of FONT.wrap(l, maxW)) rows.push([ln, '#fff7e8']);
    if (p.pairs) for (const [k, v] of p.pairs) { for (const ln of FONT.wrap(k, maxW)) rows.push([ln, '#ffcc33']); for (const ln of FONT.wrap(String(v), maxW - 8)) rows.push(['  ' + ln, '#fff7e8']); rows.push(['', '']); }
    for (let i = 0, k = 0; i < rows.length; i += lines, k++) out.push({ title: p.title + (rows.length > lines ? ' (' + (k + 1) + '/' + Math.ceil(rows.length / lines) + ')' : ''), rows: rows.slice(i, i + lines), section: p.title });
  }
  return out;
};
MT.scenes.about = scene({
  enter() { this.page = 0; },
  update(dt) {
    if (frontStep(dt, 'about')) return;
    const { W, H } = screenWH(), n = MT.aboutScreens(W, H).length, nav = UI.nav();
    if (nav.right || nav.tabR || nav.confirm) { if (this.page < n - 1) { this.page++; MT.sfx('page'); } }
    if (nav.left || nav.tabL) { if (this.page > 0) { this.page--; MT.sfx('page'); } }
    if (nav.down && this.page < n - 1) this.page++; if (nav.up && this.page > 0) this.page--;
    if (nav.cancel) { MT.sfx('back'); game.go('title', { menu: true }); }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .7);
    r.overlay(g => {
      const S = MT.aboutScreens(r.W, r.H), p = S[Math.min(this.page, S.length - 1)], w = Math.min(r.W - 20, 400), x = Math.round(r.W / 2 - w / 2);
      UI.panel(g, x, 6, w, r.H - 34, { alpha: .92 });
      UI.text(g, p.title, r.W / 2, 12, '#ff2e88', { align: 'center', scale: 1 });
      UI.text(g, (this.page + 1) + '/' + S.length, x + w - 8, 12, '#7a6a8a', { align: 'right', font: 'tiny' });
      p.rows.forEach(([ln, c], i) => UI.text(g, ln, x + 10, 28 + i * 9, c));
      UI.promptBar(g, r, [['left', ''], ['right', 'PAGE'], ['cancel', MT.TEXT.ui.back]]);
    });
  },
});
// ------------------------------------------------------------------------------------------------ the prize recap
MT.scenes.recap = scene({
  enter(d = {}) {
    this.ep = d.ep || (MT.run && MT.run.ep) || 1; this.t = 0; this.k = 0; this.step = 0; this.done = false; this.finished = false; this.fake = !!d.fake;
    if (!MT.run) { MT.newRun({ mode: 'test' }); MT.addRunPlayer({ slot: 0, input: game.input }); }
    const run = MT.run; run.recaps = (run.recaps || 0) + 1;
    this.cols = run.contestants.map(c => ({ c, prizes: c.pr.prizes.slice(c.pr.recapFrom || 0), shown: 0, total: 0, shownCash: 0 }));
    if (this.fake) this.cols.forEach(col => { col.prizes = MT.TEXT.prizes[this.ep].slice(0, 3).map(p => ({ name: p.name, value: p.value, icon: p.icon, line: p.line })); });
    for (const col of this.cols) col.c.pr.recapFrom = col.c.pr.prizes.length;
    this.penny = makePenny(); MT.music.play('recap');
    LINES.clear(); LINES.seq(this.ep === 3 ? 'recap3' : 'recap');
    this.queue = []; for (const col of this.cols) col.prizes.forEach((p, i) => this.queue.push({ col, i }));
    this.mvp = this.cols.slice().sort((a, b) => (b.c.pr.epCash || 0) - (a.c.pr.epCash || 0))[0];
    this.next = 2.2;
  },
  update(dt) {
    this.t += dt; LINES.step(1 / 120); frontCam();
    if (!MT.cfg.skipRigs) this.penny.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: Math.floor(this.t) % 2 ? 'wave' : 'hips', expr: 'smile' });
    const nav = UI.nav(), fast = nav.holdConfirm;
    if (nav.confirm) { LINES.skip(); this.next = Math.min(this.next, .05); }
    for (const col of this.cols) { const target = col.prizes.slice(0, col.shown).reduce((a, p) => a + p.value, 0); col.shownCash = approach(col.shownCash, target, Math.max(500, target) * dt * (fast ? 8 : 2)); }
    this.next -= dt * (fast ? 6 : 1);
    if (this.next <= 0) {
      if (this.step < this.queue.length) { const q = this.queue[this.step++]; q.col.shown++; MT.sfx('bell'); const p = q.col.prizes[q.i]; if (!fast) LINES.say('PENNY', p.line, 3); this.next = fast ? .25 : 1.6; }
      else if (!this.done) { this.done = true; this.mvpT = 0; MT.music.sting('clear'); MT.babble.crowd('applause', 1); LINES.seq(this.ep === 1 ? 'recap1End' : this.ep === 2 ? 'recap2End' : 'recap3'); this.next = fast ? .5 : 3; }
      else this.finish();
    }
  },
  finish() {
    if (this.finished) return; this.finished = true;
    const run = MT.run; for (const c of run.contestants) c.pr.epCash = 0;
    if (this.fake || run.mode === 'test' && !run.contestants.length) { game.go('title', {}); return; }
    if (this.ep < 3) { run.ep = this.ep + 1; game.go('play', { room: MT.EPISODES[this.ep + 1].start, intro: 'episode' }); }
    else if ((run.keys || 0) >= 5) game.go('play', { room: 'GR', intro: 'greenroom' });
    else game.go('ending', { kind: 'a' });
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .55);
    r.overlay(g => {
      UI.title(g, 'PRIZE RECAP', r.W / 2, 6, 2); UI.text(g, 'EPISODE ' + this.ep + ': ' + MT.EPISODES[this.ep].title, r.W / 2, 26, '#2ee6ff', { align: 'center' });
      if (!MT.cfg.skipRigs) { px.ell(g, 34, r.H - 42, 26, 6, '#c8a040'); px.ell(g, 34, r.H - 44, 22, 4, '#5a3a10'); this.penny.drawPortrait(g, 8, r.H - 106, 52, { zoom: 2.4, turn: .3, bg: '#1ab0b0', frame: true }); UI.text(g, 'PENNY PRIZE', 34, r.H - 52, '#ff8ad8', { align: 'center', font: 'tiny' }); }
      const n = this.cols.length, cw = Math.min(110, (r.W - 90) / Math.max(1, n));
      this.cols.forEach((col, i) => {
        const x = Math.round(70 + i * (cw + 4)), y = 38, h = r.H - 80, c = col.c, color = SLOT_COLORS[c.slot];
        UI.panel(g, x, y, cw, h, { alpha: .85, border: color });
        if (!MT.cfg.skipRigs) c.rig.drawPortrait(g, x + 4, y + 4, 20, { zoom: 1.6, turn: .4, bg: E.tones(color).deep });
        UI.text(g, c.pr.name, x + 28, y + 6, color); UI.text(g, money(col.shownCash), x + 28, y + 16, '#ffcc33', { font: 'tiny' });
        col.prizes.slice(0, col.shown).slice(-Math.floor((h - 40) / 22)).forEach((p, k) => { const yy = y + 30 + k * 22; if (SPR.prize[p.icon]) px.sprite(g, SPR.prize[p.icon], x + 4, yy); FONT.wrap(p.name, cw - 22, { font: 'tiny' }).slice(0, 2).forEach((ln, j) => UI.text(g, ln, x + 18, yy + j * 6, '#fff7e8', { font: 'tiny' })); UI.text(g, money(p.value), x + cw - 4, yy + 13, '#5fe0a0', { align: 'right', font: 'tiny' }); });
        if (!col.prizes.length) UI.text(g, 'NO PRIZES... YET!', x + cw / 2, y + 40, '#7a6a8a', { align: 'center', font: 'tiny' });
      });
      if (this.done && this.mvp) { const k = E.ease.outBack(clamp((this.next < 3 ? 3 - this.next : 0) / .5, 0, 1)); UI.title(g, fill(MT.TEXT.ui.mvp, { NAME: this.mvp.c.pr.name }), r.W / 2, r.H - 40 - (1 - k) * 10, 2, { colors: ['#ffcc33', '#ff9a3c'] }); }
      UI.promptBar(g, r, [['confirm', 'FASTER (HOLD: SKIP)']]);
    });
    HUD.draw(r, { contestants: [], ratings: new Ratings(), room: null, run: MT.run, phase: '' }, t, { onlyLines: true });
  },
});
// ------------------------------------------------------------------------------------------------ game over
MT.scenes.gameover = scene({
  enter() { this.t = 0; MT.music.play(null); MT.music.sting('gameover'); LINES.clear(); LINES.seq('gameOver'); this.rigs = (MT.run ? MT.run.contestants : []).map(c => makeContestantRig(c.slot, c.pr.look)); },
  update(dt) {
    this.t += dt; LINES.step(1 / 120); frontCam();
    if (!MT.cfg.skipRigs) this.rigs.forEach((rg, i) => rg.update(dt, { x: AR.CX + (i - (this.rigs.length - 1) / 2) * 30, y: 132, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'down', down: 1, expr: 'wince' }));
    const nav = UI.nav(); if (nav.confirm) LINES.skip();
    if (this.t > 2 && (!LINES.busy() || nav.holdConfirm) || this.t > 14) MT.finishRun();
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .45);
    this.rigs.forEach((rg, i) => { const x = AR.CX + (i - (this.rigs.length - 1) / 2) * 30; r.shadow(x, 132, 9, .5); r.actor(x, 132, 0, (g, ox, oy) => rg.draw(g, ox, oy, r.view), {}); });
    game.lights.add(AR.CX, 130, 0, 90, 1, { color: '#fff6d0' });
    r.overlay(g => {
      px.blend(g, .3, 'add', () => px.poly(g, [[r.W / 2 - 10, 0], [r.W / 2 + 10, 0], [r.W / 2 + 80, r.H * .7], [r.W / 2 - 80, r.H * .7]], '#fff6d0'));
      UI.title(g, MT.TEXT.ui.wrap, r.W / 2, r.H * .14, 3, { colors: ['#ff3344', '#7a1020'] });
      const run = MT.run; if (run) run.contestants.forEach((c, i) => { const x = r.W / 2 + (i - (run.contestants.length - 1) / 2) * 70; UI.text(g, c.pr.name, x, r.H * .62, SLOT_COLORS[c.slot], { align: 'center' }); UI.text(g, 'WOULD HAVE WON ' + money(c.pr.cash + c.pr.prizes.reduce((a, p) => a + p.value, 0) * 2), x, r.H * .62 + 10, '#ffcc33', { align: 'center', font: 'tiny' }); });
    });
    HUD.draw(r, { contestants: [], ratings: new Ratings(), room: null, run: MT.run, phase: '' }, t, { onlyLines: true });
  },
});
// ------------------------------------------------------------------------------------------------ initials (each qualifying contestant, with their own input)
MT.scenes.initials = scene({
  enter(d = {}) { this.queue = (d.queue || []).slice(); this.cur = null; this.t = 0; MT.music.play('ending'); this.nextEntry(); },
  nextEntry() {
    this.cur = this.queue.shift() || null;
    if (!this.cur) { game.go('scores', { after: 'title' }); return; }
    const I = this.cur.input || game.input; I.use(MASH_MENU);
    MT.cab.enter(this.cur.cash, 'show', name => { this.cur.done = name; this.t = 0; this.nextEntry(); }, I);
  },
  update(dt) { this.t += dt; MT.cab.update(dt); frontCam(); },
  draw(r) {
    const t = game.real; backdrop(r, t, .7);
    const e = MT.cab.entry, cur = this.cur;
    r.overlay(g => {
      if (!e || !cur) return;
      const col = SLOT_COLORS[cur.slot], w = 240, x = r.W / 2 - w / 2, y = r.H * .12;
      UI.panel(g, x, y, w, 150, { border: col }); UI.bulbs(g, x, y, w, 150, t, { on: col });
      UI.title(g, 'TOP EARNER!', r.W / 2, y + 8, 2); UI.text(g, 'P' + (cur.slot + 1) + ' ' + cur.name + '  ' + money(cur.cash), r.W / 2, y + 30, col, { align: 'center' });
      const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-! '.split('');
      for (let i = 0; i < 3; i++) { const cx = r.W / 2 + (i - 1) * 34, on = e.i === i, ch = L[e.name[i]] || '?'; px.rect(g, cx - 13, y + 50, 26, 34, on ? '#3a1e5a' : '#1a0c30'); if (on) UI.bulbs(g, cx - 13, y + 50, 26, 34, t); UI.text(g, ch, cx + 1, y + 57, on ? '#ffcc33' : '#fff7e8', { align: 'center', scale: 3 }); if (on) { UI.text(g, '↑', cx, y + 40, '#ffcc33', { align: 'center' }); UI.text(g, '↓', cx, y + 88, '#ffcc33', { align: 'center' }); } }
      MT.glyph.prompt(g, r.W / 2, y + 112, [['dpad', 'LETTER'], ['confirm', 'NEXT']], cur.input || game.input, { align: 'center' });
    });
  },
});
