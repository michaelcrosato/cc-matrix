// ---------------------------------------------------------------- front-end and between-room screens (10-foot: big text, at most 6 items)
MT.scenes = MT.scenes || {};
const UI = MT.ui, TX = MT.ui.T;
const frontIdle = (scene) => { if (MT.idle.t >= 10 && !(MT.game.shell && MT.game.shell.screen)) { MT.idle.t = 0; MT.game.go('attract', { from: scene }); return true; } return false; };
const goBack = (to = 'title') => { MT.sfx('back'); MT.game.go(to, {}, { fade: .15 }); };
MT.unlocked = () => MT.store.get('mashtv:eps', [1]).slice();
MT.unlock = n => { const u = MT.unlocked(); if (!u.includes(n)) { u.push(n); MT.store.set('mashtv:eps', u); } };

// ---------------- TITLE (with the main menu); touch-only devices get the notice
MT.scenes.title = {
  input: MT.MENU, skippable: false,
  enter() {
    this.t = 0; MT.music.play('theme', { fade: .4 }); MT.detectTouch(); MT.idle.t = 0; MT.run = null; MT.lines.clear(); MT.banner.clear();
    const items = MT.TEXT.menu.map((label, i) => ({ label, act: () => this.pick(i) }));
    this.menu = new UI.FocusList(items, { i: this.menuI || 0 });
    this.touchBtn = null;
  },
  pick(i) {
    this.menuI = i; const g = MT.game;
    if (i === 0) g.go('difficulty', {}); else if (i === 1) g.go('episodes', {}); else if (i === 2) g.go('howto', {}); else if (i === 3) g.go('scores', {}); else if (i === 4) g.menu('settings'); else g.go('about', {});
  },
  update(dt) {
    MT.frame(dt); this.t += dt;
    if (frontIdle('title')) return;
    if (MT.touch.only) { const c = UI.clicked(); if (c && this.touchBtn && UI.inRect(c, this.touchBtn)) MT.game.menu('settings'); return; }
    if (!(MT.game.shell && MT.game.shell.screen)) this.menu.update(dt);
  },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      const cx = r.W / 2, u = Math.min(1, this.t / .9), drop = MT.ease.outBounce(u), s = r.H > 340 ? 3 : 2, ly = Math.round(12 + 6 * s + (r.H > r.W ? 40 : 0) + (1 - drop) * -90);
      MT.drawLogo(g, cx, ly, s);
      TX(g, 'LIVE FROM STUDIO 9', cx, ly + 11 * s, '#2ee6ff', { align: 'center' });
      if (MT.touch.only) {
        const w = Math.min(300, r.W - 20), x = cx - w / 2, y = ly + 26 * s + 6; UI.panel(g, x, y, w, 70, { border: '#ff3344' });
        TX(g, MT.TEXT.touch.title, cx, y + 8, '#ff3344', { align: 'center' }); TX(g, MT.TEXT.touch.body, cx, y + 22, '#fff7e8', { align: 'center', font: 'tiny' });
        this.touchBtn = [cx - 50, y + 36, 100, 24]; UI.panel(g, cx - 50, y + 36, 100, 24, { border: '#ffcc33' }); TX(g, 'SETTINGS', cx, y + 44, '#ffcc33', { align: 'center' });
      } else {
        const w = 170, x = Math.round(cx - w / 2), y = Math.max(ly, 12 + 6 * s) + 26 * s + 6;
        this.menu.draw(g, r, x, y, w, { rowH: Math.min(22, Math.floor((r.H - y - 26) / 6)) });
        UI.promptBar(g, r, [['confirm', 'SELECT'], ['up', ''], ['down', 'CHOOSE']]);
      }
      TX(g, E.versionLabel().replace(/·/g, '-') + ' - MASH TV ' + MT.VERSION, 4, r.H - 26, '#6a5a8a', { font: 'tiny' });
    });
  }
};
// ---------------- DIFFICULTY
MT.scenes.difficulty = {
  input: MT.MENU,
  enter(d = {}) { this.d = d; this.list = new UI.FocusList(['ROOKIE', 'CONTESTANT', 'CHAMPION'].map(k => ({ label: k, act: () => MT.game.go('lobby', { diff: k, mode: d.mode || 'arcade', ep: d.ep || 1 }) })), { i: 1, onCancel: () => goBack(d.back || 'title') }); },
  update(dt) { MT.frame(dt); if (frontIdle('difficulty')) return; this.list.update(dt); },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      UI.title(g, r, MT.TEXT.difficulty.title, 16);
      const cx = r.W / 2, w = 180; this.list.draw(g, r, cx - w / 2, 56, w, { rowH: 26 });
      const D = MT.DIFF[this.list.cur.label]; const y = 140;
      UI.panel(g, cx - 150, y, 300, 40, { border: '#2ee6ff' });
      TX(g, D.desc, cx, y + 8, '#fff7e8', { align: 'center' }); TX(g, 'HEALTH ' + D.hp + '   LIVES ' + D.lives, cx, y + 22, '#ffcc33', { align: 'center' });
      UI.promptBar(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
// ---------------- THE CONTESTANT LOBBY: join 1-4, pick a look, ready up
MT.scenes.lobby = {
  input: MT.MENU,
  enter(d = {}) {
    this.d = d; this.t = 0; this.count = -1;
    const g = MT.game; this.seats = [{ input: g.input, look: 0, ready: false }];
    for (const p of g.players.slice(1)) this.seats.push({ input: p, look: this.seats.length, ready: false });
    g.allowJoin({ max: 4, keys: false, onJoin: (inp) => { if (this.seats.length < 4) { this.seats.push({ input: inp, look: this.seats.length % 4, ready: false }); MT.sfx('bell'); } } });
    this.rigs = [0, 1, 2, 3].map(i => MT.cfg.skipRigs ? null : MT.looks.make(i, MT.COLORS.p[i], 1.2));
    MT.music.play('theme');
  },
  exit() { MT.game.allowJoin(false); },
  update(dt) {
    MT.frame(dt); this.t += dt;
    if (this.seats.length === 1 && !this.seats[0].ready && frontIdle('lobby')) return;
    const c = UI.clicked();
    this.seats.forEach((s, i) => {
      const I = s.input, rc = this.rects && this.rects[i];
      if (I.repeat('left', .3, .15) || c && rc && UI.inRect(c, rc.l)) { if (!s.ready) { s.look = (s.look + 3) % 4; MT.sfx('blip'); } }
      if (I.repeat('right', .3, .15) || c && rc && UI.inRect(c, rc.r)) { if (!s.ready) { s.look = (s.look + 1) % 4; MT.sfx('blip'); } }
      if (I.pressed('confirm') || c && rc && UI.inRect(c, rc.ok)) { if (!s.ready) { s.ready = true; MT.sfx('bell'); MT.babble.crowd('cheer', .4); } }
      if (I.pressed('cancel')) {
        if (s.ready) { s.ready = false; MT.sfx('back'); this.count = -1; }
        else if (i === 0) { goBack('difficulty'); return; }
        else { MT.game.removePlayer(I); this.seats.splice(i, 1); MT.sfx('back'); }
      }
    });
    const all = this.seats.every(s => s.ready);
    if (all && this.count < 0) { this.count = 2; MT.sfx('go'); }
    if (!all) this.count = -1;
    if (this.count >= 0) { this.count -= dt; if (this.count <= 0) this.start(); }
    for (let i = 0; i < 4; i++) if (this.rigs[i]) { const s = this.seats[i]; if (s && this.rigs[i]._look !== s.look) { this.rigs[i] = MT.looks.make(s.look, MT.COLORS.p[i], 1.2); this.rigs[i]._look = s.look; } this.rigs[i] && this.rigs[i].update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: s && s.ready ? 'cheer' : s ? 'hips' : 'kneel', expr: s && s.ready ? 'smile' : null }); }
  },
  start() {
    const d = this.d, players = this.seats.map((s, i) => ({ slot: i, look: s.look, input: s.input }));
    MT.newRun({ mode: d.mode || 'arcade', diff: d.diff || 'CONTESTANT', ep: d.ep || 1, players });
    if (d.mode === 'rehearsal') MT.game.go('play', { ep: d.ep });
    else MT.game.go('cut', { id: 'cold' });
  },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    this.rects = [];
    r.overlay(g => {
      UI.title(g, r, MT.TEXT.lobby.title, 10);
      if (this.d.mode === 'rehearsal') TX(g, 'REHEARSAL: EPISODE ' + this.d.ep + ' (NO HIGH SCORES)', r.W / 2, 34, '#2ee6ff', { align: 'center' });
      const n = 4, pw = Math.min(96, (r.W - 20) / 4 - 6), x0 = r.W / 2 - (pw + 6) * n / 2 + 3, y = 46, h = r.H - y - 30;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (pw + 6), s = this.seats[i], col = MT.COLORS.p[i];
        UI.panel(g, x, y, pw, h, { border: s ? col : '#3a2a4a', alpha: .85 });
        px.blend(g, .18, 'add', () => px.poly(g, [[x + pw / 2 - 6, y], [x + pw / 2 + 6, y], [x + pw - 4, y + h - 30], [x + 4, y + h - 30]], s ? col : '#3a3a4a'));
        TX(g, 'P' + (i + 1), x + 6, y + 5, col);
        if (!s) { TX(g, 'PRESS', x + pw / 2, y + h / 2 - 16, '#8a7a9a', { align: 'center' }); MT.glyph.draw(g, x + pw / 2 - 18, y + h / 2 - 4, 'start', { lastDevice: 'gamepad', glyphs: MT.game.input.glyphs, map: { start: ['Pad9'] } }); TX(g, MT.TEXT.lobby.join, x + pw / 2, y + h / 2 + 12, '#8a7a9a', { align: 'center' }); continue; }
        const L = MT.looks.LOOKS[s.look];
        const k = MT.pk ? 1 : 1; const ox = x + pw / 2, oy = y + h - 34;
        px.ell(g, ox, oy + 2, 18, 5, '#ffcc33'); px.ell(g, ox, oy + 1, 16, 4, '#5a3a20');
        if (this.rigs[i] && !MT.cfg.skipRigs) this.rigs[i].draw(g, ox, oy, MT.game.view);
        TX(g, L.name, ox, y + 18, '#ffffff', { align: 'center' });
        const lr = [x + 2, y + 40, 14, 40], rr = [x + pw - 16, y + 40, 14, 40], ok = [x + 8, y + h - 24, pw - 16, 16];
        this.rects[i] = { l: lr, r: rr, ok };
        if (!s.ready) { TX(g, '←', lr[0] + 3, lr[1] + 16, '#ffcc33'); TX(g, '→', rr[0] + 3, rr[1] + 16, '#ffcc33'); MT.glyph.prompt(g, ox, ok[1] + 3, [['confirm', 'READY']], s.input, { align: 'center' }); }
        else { UI.bulbs(g, x - 2, y - 2, pw + 4, h + 4, MT.game.real, col); TX(g, MT.TEXT.lobby.ready, ox, ok[1] + 4, '#22ff66', { align: 'center' }); }
      }
      if (this.count >= 0) { TX(g, MT.TEXT.lobby.lets, r.W / 2, r.H / 2 - 10, '#ffcc33', { align: 'center', scale: 3 }); }
      UI.promptBar(g, r, [['left', ''], ['right', 'LOOK'], ['confirm', 'READY'], ['cancel', 'BACK']]);
    });
  }
};
// ---------------- HOW TO PLAY (a scene, and the same panel over a paused game)
MT.howtoPanel = {
  page: 0, done: null, t: 0,
  open(done) { this.page = 0; this.done = done; this.t = 0; },
  update(dt) {
    this.t += dt; const n = MT.TEXT.howto.length;
    if (UI.nav('right') || UI.nav('tabR')) { this.page = (this.page + 1) % n; MT.sfx('page'); }
    if (UI.nav('left') || UI.nav('tabL')) { this.page = (this.page + n - 1) % n; MT.sfx('page'); }
    const c = UI.clicked(); if (c && this.next && UI.inRect(c, this.next)) { this.page = (this.page + 1) % n; MT.sfx('page'); }
    if (UI.nav('cancel') || UI.nav('confirm') && this.page === n - 1) { MT.sfx('back'); this.done && this.done(); }
    else if (UI.nav('confirm')) { this.page = (this.page + 1) % n; MT.sfx('page'); }
  },
  draw(r) {
    r.overlay(g => {
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0414'));
      const P = MT.TEXT.howto[this.page], cx = r.W / 2, I = UI.lastI();
      UI.title(g, r, P.title, 10); TX(g, (this.page + 1) + ' / ' + MT.TEXT.howto.length, cx, 34, '#8a7a9a', { align: 'center' });
      const w = Math.min(r.W - 20, 360), x = cx - w / 2, y = 46;
      UI.panel(g, x, y, w, r.H - y - 30, { alpha: .9 });
      if (P.rows) P.rows.forEach(([a, label], i) => { const yy = y + 10 + i * 22; MT.glyph.draw(g, x + 12, yy, a, I); if (a !== 'aim' && a !== 'move' && I.lastDevice === 'gamepad') { const alt = { slide: 'Pad6', bomb: 'Pad5', showboat: 'Pad4' }[a]; } TX(g, label, x + 80, yy + 2, '#fff7e8'); });
      if (P.lines) { let yy = y + 10; for (const L of P.lines) { for (const s of E.font.wrap(L, w - 24)) { TX(g, s, x + 12, yy, '#fff7e8'); yy += 10; } yy += 6; } }
      if (P.items) P.items.forEach((id, i) => { const W2 = MT.WEAPONS[id] || MT.ADDONS[id], yy = y + 12 + i * 34; MT.drawCapsule(g, x + 20, yy + 8, id, 1, MT.game.real); TX(g, W2.name, x + 36, yy, W2.color); for (const [k, s] of E.font.wrap(W2.desc, w - 50).entries()) TX(g, s, x + 36, yy + 10 + k * 9, '#fff7e8'); });
      this.next = [x + w - 40, r.H - 50, 36, 16]; TX(g, 'NEXT →', x + w - 38, r.H - 46, '#ffcc33');
      UI.promptBar(g, r, [['tabL', ''], ['tabR', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};
MT.scenes.howto = {
  input: MT.MENU,
  enter() { MT.howtoPanel.open(() => goBack('title')); },
  update(dt) { MT.frame(dt); if (frontIdle('howto')) return; MT.howtoPanel.update(dt); },
  draw(r) { UI.backdrop(r, MT.game.real); MT.howtoPanel.draw(r); }
};
// ---------------- EPISODES (rehearsals)
MT.scenes.episodes = {
  input: MT.MENU,
  enter() { const u = MT.unlocked(); this.list = new UI.FocusList([1, 2, 3].map(n => ({ label: 'EPISODE ' + n + ': ' + MT.EPISODES[n].title, disabled: !u.includes(n), act: () => MT.game.go('lobby', { mode: 'rehearsal', ep: n, diff: 'CONTESTANT' }) })), { onCancel: () => goBack('title') }); },
  update(dt) { MT.frame(dt); if (frontIdle('episodes')) return; this.list.update(dt); },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      UI.title(g, r, 'EPISODES', 12); const cx = r.W / 2, w = Math.min(r.W - 30, 260);
      TX(g, 'REHEARSE ANY EPISODE YOU HAVE REACHED. NO HIGH SCORES.', cx, 38, '#2ee6ff', { align: 'center', font: 'tiny' });
      this.list.draw(g, r, cx - w / 2, 54, w, { rowH: 28 });
      this.list.items.forEach((it, i) => { if (it.disabled) TX(g, 'LOCKED', cx + w / 2 - 36, 54 + i * 28 + 8, '#6a5a7a', { font: 'tiny' }); });
      UI.promptBar(g, r, [['confirm', 'REHEARSE'], ['cancel', 'BACK']]);
    });
  }
};
// ---------------- TOP EARNERS
MT.scenes.scores = {
  input: MT.MENU,
  enter(d = {}) { this.d = d; this.t = 0; },
  update(dt) { MT.frame(dt); this.t += dt; if (frontIdle('scores')) return; if (UI.nav('cancel') || UI.nav('confirm') || UI.clicked()) goBack('title'); },
  draw(r) { UI.backdrop(r, MT.game.real); MT.drawScores(r, this.d.hi); r.overlay(g => UI.promptBar(g, r, [['confirm', 'OK'], ['cancel', 'BACK']])); }
};
MT.drawScores = (r, hi) => {
  const t = MT.cab ? MT.cab.table('show') : [];
  r.overlay(g => {
    const cx = r.W / 2; MT.drawLogo(g, cx, 26, 2, true); UI.title(g, r, 'TOP EARNERS', 44);
    const w = Math.min(r.W - 30, 240), x = cx - w / 2, y = 64; UI.panel(g, x, y, w, 10 * 14 + 10, { bg: ['#4a1020', '#2a0814'], border: '#ffcc33' });
    for (let i = 0; i < 10; i++) { const e = t[i], yy = y + 6 + i * 14, c = hi && e && e.name === hi.name && e.score === hi.score ? '#22ff66' : i === 0 ? '#ffcc33' : '#fff7e8'; TX(g, (i + 1) + '.', x + 24, yy, c, { align: 'right' }); TX(g, e ? e.name : '---', x + 32, yy, c); TX(g, e ? MT.money(e.score) : '$0', x + w - 10, yy, c, { align: 'right' }); }
  });
};
// ---------------- ABOUT & CREDITS: paged, big text; Source Information and the three feedback sections from about.json
MT.aboutPages = () => {
  const A = MT.ABOUT || {}, pages = [];
  const add = (title, lines) => { const per = 12, all = []; for (const L of lines) for (const s of E.font.wrap(L, 340)) all.push(s); for (let i = 0; i < Math.max(1, all.length); i += per) pages.push({ title: title + (all.length > per ? ' (' + (Math.floor(i / per) + 1) + '/' + Math.ceil(all.length / per) + ')' : ''), lines: all.slice(i, i + per) }); };
  add('WHAT IS MASH TV?', ['MASH TV IS A 1-4 PLAYER TWIN-STICK ARENA SHOOTER SET INSIDE THE DEADLIEST GAME SHOW ON TELEVISION.', 'FIGHT THROUGH SEALED STUDIO ROOMS, GRAB CASH AND RIDICULOUS PRIZES, PLAY TO THE CAMERAS TO KEEP THE RATINGS UP, AND SURVIVE THREE EPISODES TO THE SEASON FINALE.', 'COLLECT FIVE GOLDEN KEYS TO OPEN THE SECRET GREEN ROOM.']);
  add('CREDITS', MT.TEXT.credits.filter(Boolean));
  const si = A.sourceInformation || {};
  const SI_LABELS = [['date', 'DATE'], ['source', 'SOURCE'], ['plan', 'PLAN'], ['genre', 'GENRE'], ['perspective', 'PERSPECTIVE'], ['tech', 'TECH'], ['artDirection', 'ART DIRECTION'], ['animation', 'ANIMATION'], ['audio', 'AUDIO'], ['online', 'ONLINE'], ['testing', 'TESTING'], ['research', 'RESEARCH'], ['environment', 'ENVIRONMENT'], ['model', 'MODEL'], ['usage', 'USAGE']];
  add('SOURCE INFORMATION', SI_LABELS.map(([k, l]) => l + ': ' + String(si[k] || 'unknown').toUpperCase()));
  const Q = A.questions || {};
  const qa = (title, key) => add(title, (A[key] || []).map((a, i) => ((Q[key] || [])[i] ? String(Q[key][i]).toUpperCase() + ' ' : '') + String(a).toUpperCase()));
  qa('TESTING FEEDBACK', 'testingFeedback'); qa('ENGINE FEEDBACK', 'engineFeedback'); qa('PROMPT FEEDBACK', 'promptFeedback');
  return pages;
};
MT.scenes.about = {
  input: MT.MENU,
  enter() { this.pages = MT.aboutPages(); this.page = 0; },
  update(dt) {
    MT.frame(dt); if (frontIdle('about')) return; const n = this.pages.length;
    if (UI.nav('right') || UI.nav('tabR') || UI.nav('confirm')) { this.page = (this.page + 1) % n; MT.sfx('page'); }
    if (UI.nav('left') || UI.nav('tabL')) { this.page = (this.page + n - 1) % n; MT.sfx('page'); }
    const c = UI.clicked(); if (c) { this.page = (this.page + (c[0] > MT.game.W / 2 ? 1 : n - 1)) % n; MT.sfx('page'); }
    if (UI.nav('cancel')) goBack('title');
  },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      const P = this.pages[this.page], cx = r.W / 2, w = Math.min(r.W - 16, 360), x = cx - w / 2;
      UI.title(g, r, P.title.length > 22 ? 'ABOUT & CREDITS' : P.title, 8);
      if (P.title.length > 22) TX(g, P.title, cx, 30, '#2ee6ff', { align: 'center' });
      TX(g, (this.page + 1) + ' / ' + this.pages.length, cx, 40, '#8a7a9a', { align: 'center', font: 'tiny' });
      UI.panel(g, x, 48, w, r.H - 78, { alpha: .9 });
      P.lines.forEach((s, i) => TX(g, s, x + 10, 56 + i * 11, '#fff7e8'));
      UI.promptBar(g, r, [['tabL', ''], ['tabR', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};
// ---------------- THE PRIZE RECAP (after each boss)
MT.scenes.recap = {
  input: MT.MENU, skippable: true,
  enter(d = {}) {
    this.ep = d.ep || 1; this.t = 0; this.i = 0; this.step = .9; this.shown = 0; this.done = false; this.fake = !!d.fake; this.left = false; this.mvp = null; this.doneT = 0;
    const run = MT.run; if (run) run.recaps++;
    MT.unlock(Math.min(3, this.ep + 1));
    this.cols = (d.fake ? MT.fakeRecap() : run.contestants).map(c => ({ c, list: c.prizes.filter(p => p.ep === this.ep || this.ep === 3 && p.ep === 4), total: 0, shownTotal: 0 }));
    this.queue = []; this.cols.forEach((col, k) => col.list.forEach(p => this.queue.push([k, p])));
    MT.music.play('recap', { fade: .5 }); MT.lines.say('PENNY', (this.ep === 3 ? MT.TEXT.recap.open3 : MT.TEXT.recap.open)[1], { prio: 3 });
    this.penny = MT.cfg.skipRigs ? null : MT.cast.penny;
  },
  update(dt) {
    MT.frame(dt); this.t += dt;
    const fast = UI.held('confirm') ? 4 : 1; if (UI.nav('confirm')) MT.lines.skip();
    for (const col of this.cols) col.shownTotal = Math.min(col.total, col.shownTotal + dt * Math.max(2000, col.total) * 1.5 * fast);
    if (this.t > 1.2 && !this.done) {
      this.step -= dt * fast;
      if (this.step <= 0) {
        if (this.shown < this.queue.length) { const [k, p] = this.queue[this.shown++]; this.cols[k].total += p.value; MT.sfx('bell'); MT.lines.say('PENNY', p.name + '! ' + p.line, { prio: 2 }); this.step = 1.6; }
        else { this.done = true; this.doneT = this.t; const mvp = this.cols.slice().sort((a, b) => b.c.cash - a.c.cash)[0]; if (mvp) this.mvp = mvp.c.name; const cl = MT.TEXT.recap.close[this.ep] || MT.TEXT.recap.close[1]; MT.lines.say(cl[0], cl[1], { prio: 3 }); MT.babble.crowd('applause', 1); }
      }
    }
    if (this.done && (this.t - this.doneT > 3.5 && !MT.lines.busy || UI.nav('confirm') && this.t - this.doneT > .5) && !this.left) { this.left = true; this.next(); }
  },
  next() {
    if (this.fake) return; const run = MT.run;
    if (this.ep < 3) { MT.game.go('play', { ep: this.ep + 1 }); return; }
    if (run.keys >= 5) { MT.game.go('cut', { id: 'green' }); return; }
    MT.game.go('ending', { kind: 'a' });
  },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      const cx = r.W / 2; UI.title(g, r, 'PRIZE RECAP', 8, '#ff8ad8'); TX(g, 'EPISODE ' + this.ep + ': ' + MT.EPISODES[Math.min(3, this.ep)].title, cx, 30, '#2ee6ff', { align: 'center' });
      if (this.penny) { px.ell(g, 34, r.H - 36, 22, 6, '#ffcc33'); px.ell(g, 34, r.H - 37, 20, 5, '#5a1a6a'); this.penny.update(1 / 120, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: this.done ? 'cheer' : 'wave', expr: 'smile' }); this.penny.draw(g, 34, r.H - 38, MT.game.view); }
      const n = this.cols.length, cw = Math.min(110, (r.W - 80) / n), x0 = cx - cw * n / 2 + 20;
      this.cols.forEach((col, k) => {
        const x = x0 + k * cw, y = 42, c = col.c; UI.panel(g, x + 2, y, cw - 4, r.H - y - 52, { border: c.color, alpha: .85 });
        if (c.rig && !MT.cfg.skipRigs) c.rig.drawPortrait(g, x + 6, y + 4, 20, { zoom: 2.6, bg: '#2a1446' });
        TX(g, c.name, x + 30, y + 6, c.color); TX(g, MT.money(col.shownTotal), x + 30, y + 15, '#ffcc33');
        let shownHere = 0; for (let q = 0; q < this.shown; q++) if (this.queue[q][0] === k) shownHere++;
        col.list.slice(0, shownHere).slice(-6).forEach((p, i) => { const yy = y + 30 + i * 16; px.sprite(g, MT.spr.icon(p.icon[0], p.icon[1], p.icon[2]), x + 6, yy); const nm = E.font.wrap(p.name, cw - 26, { font: 'tiny' }); TX(g, nm[0] + (nm.length > 1 ? '...' : ''), x + 20, yy, '#fff7e8', { font: 'tiny' }); TX(g, MT.money(p.value), x + 20, yy + 7, '#7ad88a', { font: 'tiny' }); });
        if (!col.list.length && this.done) TX(g, MT.TEXT.recap.none, x + cw / 2, y + 40, '#8a7a9a', { align: 'center', font: 'tiny' });
      });
      if (this.done && this.mvp) TX(g, MT.fill(MT.TEXT.recap.mvp, { NAME: this.mvp }), cx, r.H - 46, Math.floor(MT.game.real * 3) % 2 ? '#ffcc33' : '#ffffff', { align: 'center', scale: 2 });
      if (MT.lines.current) MT.ui.lowerThird(g, r); else UI.promptBar(g, r, [['confirm', 'SPEED UP']]);
    });
  }
};
MT.fakeRecap = () => [0, 1].map(i => { const c = new MT.Contestant(i, { look: i }); c.cash = 48000 + i * 13000; c.prizes = MT.PRIZES[1].slice(i * 2, i * 2 + 3).map(p => ({ name: p[0], value: p[1] * 3, icon: p[3], line: p[2], ep: 1 })); return c; });
// ---------------- GAME OVER, INITIALS, ENDINGS, CREDITS
MT.scenes.gameover = {
  input: MT.MENU, skippable: true,
  enter() { this.t = 0; MT.music.play(null); MT.music.sting('stGameOver'); MT.lines.sayAll(MT.TEXT.gameOver, { prio: 3 }); for (const c of (MT.run ? MT.run.contestants : [])) { c.state = 'play'; } },
  update(dt) { MT.frame(dt); this.t += dt; for (const c of MT.run ? MT.run.contestants : []) if (c.rig && !MT.cfg.skipRigs) c.rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, down: 1, expr: 'wince' }); if (UI.nav('confirm') && this.t > .8) MT.lines.skip(); if (this.t > 2 && !MT.lines.busy || this.t > 14) MT.game.go('initials', {}); },
  draw(r) {
    r.sky(['#05020a', '#0a0414', '#140a24']);
    r.overlay(g => {
      const cx = r.W / 2; px.blend(g, .2, 'add', () => px.poly(g, [[cx - 4, 0], [cx + 4, 0], [cx + 70, r.H - 40], [cx - 70, r.H - 40]], '#fff4c0'));
      E.font.title(g, "AND THAT'S A WRAP!", cx, 24, { scale: 2, align: 'center', colors: ['#ff3344', '#ff8a5a'], outline: '#1a0a24' });
      (MT.run ? MT.run.contestants : []).forEach((c, i, a) => { const x = cx + (i - (a.length - 1) / 2) * 40; if (c.rig && !MT.cfg.skipRigs) c.rig.draw(g, x, r.H - 60, MT.game.view); TX(g, MT.money(c.cash), x, r.H - 50, c.color, { align: 'center', font: 'tiny' }); });
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
MT.scenes.initials = {
  input: MT.MENU,
  enter(d = {}) {
    const run = MT.run; this.order = []; this.hi = null;
    const eligible = run && run.mode === 'arcade' && (MT.cfg.allowScores || !MT.devActive() && !run.devTouched);
    if (eligible) for (const c of run.contestants) if (MT.cab.qualifies(c.cash, 'show')) this.order.push(c);
    if (d.fake) this.order = [{ name: 'P1', cash: 123450, color: MT.COLORS.p[0], input: MT.game.input, slot: 0 }];
    this.k = -1; this.nextOne();
    MT.music.play('ending');
  },
  nextOne() {
    this.k++; const c = this.order[this.k];
    if (!c) { MT.game.go('scores', { hi: this.hi }); return; }
    MT.cab.enter(c.cash, 'show', name => { this.hi = { name, score: c.cash }; this.nextOne(); }, c.input || MT.game.input);
  },
  update(dt) { MT.frame(dt); MT.cab.update(dt); },
  draw(r) {
    UI.backdrop(r, MT.game.real); const c = this.order[this.k];
    if (c) { r.overlay(g => { TX(g, 'P' + (c.slot + 1) + ' ' + (c.name || ''), r.W / 2, 8, c.color, { align: 'center', scale: 2 }); }); MT.cab.draw(r); r.overlay(g => UI.promptBar(g, r, [['up', ''], ['down', 'LETTER'], ['confirm', 'NEXT']], c.input || MT.game.input)); }
  }
};
MT.scenes.ending = {
  input: MT.MENU, skippable: true,
  enter(d = {}) {
    this.kind = d.kind || 'a'; this.t = 0; this.step = 0; this.stinger = false; this.st2 = this.st3 = this.st4 = 0; MT.music.play('ending', { fade: .8 });
    this.lights = 8; const L = this.kind === 'b' ? MT.TEXT.endingB : MT.TEXT.endingA;
    MT.lines.say(L[0][0], L[0][1], { prio: 3, onDone: () => { this.step = 1; } });
    this.cs = MT.run ? MT.run.contestants : MT.fakeRecap();
  },
  update(dt) {
    MT.frame(dt); this.t += dt; const L = this.kind === 'b' ? MT.TEXT.endingB : MT.TEXT.endingA;
    for (const c of this.cs) if (c.rig && !MT.cfg.skipRigs) c.rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'smile' });
    if (UI.nav('confirm')) MT.lines.skip();
    if (this.step === 1) { this.step = 2; this.st2 = this.t; MT.lines.say(L[1][0], L[1][1], { prio: 3, onDone: () => { this.step = 3; this.st3 = this.t; } }); if (this.kind === 'b') MT.babble.crowd('cheer', 1); }
    if (this.kind === 'b' && this.step >= 2) this.lights = Math.max(0, 8 - Math.floor((this.t - this.st2) * 1.5));
    if (this.step === 3 && this.kind === 'b' && this.t - this.st3 > 2.5 && !this.stinger) { this.stinger = true; MT.lines.say(L[2][0], L[2][1], { prio: 3, onDone: () => { this.step = 4; this.st4 = this.t; } }); }
    if (this.step === 3 && this.kind === 'a') { this.step = 4; this.st4 = this.t; }
    if (this.step === 4 && this.t - this.st4 > 3 || this.t > 40) MT.game.go('credits', {});
  },
  draw(r) {
    const b = this.kind === 'b';
    r.sky(b && this.lights === 0 ? ['#020104', '#050208', '#08040c'] : ['#0c0618', '#1c0c30', '#2a1446']);
    r.overlay(g => {
      const cx = r.W / 2;
      for (let i = 0; i < 8; i++) if (!b || i < this.lights) px.blend(g, .1, 'add', () => px.poly(g, [[r.W * (i + .5) / 8 - 3, 0], [r.W * (i + .5) / 8 + 3, 0], [r.W * (i + .5) / 8 + 30, r.H], [r.W * (i + .5) / 8 - 30, r.H]], '#fff4c0'));
      this.cs.forEach((c, i, a) => { const x = cx + (i - (a.length - 1) / 2) * 44; if (c.rig && !MT.cfg.skipRigs) c.rig.draw(g, x, r.H - 64, MT.game.view); });
      if (b && this.step >= 2) { px.rect(g, cx + 80, r.H - 100, 30, 40, '#3a3a48'); px.disc(g, cx + 95, r.H - 84, 9, this.lights ? '#ff3344' : '#5a0a14'); TX(g, 'OFF', cx + 95, r.H - 70, '#fff7e8', { align: 'center', font: 'tiny' }); }
      if (!b && this.step >= 2 && MT.cast.robo && !MT.cfg.skipRigs) { MT.cast.robo.drawPortrait(g, r.W - 70, 40, 50, { zoom: 2.4, bg: '#140a24' }); TX(g, 'BEHIND THE CURTAIN...', r.W - 45, 94, '#8a7a9a', { align: 'center', font: 'tiny' }); }
      if (this.step >= 4) {
        const t1 = b ? 'MASH TV - CANCELLED.' : 'MASH TV WILL RETURN.', t2 = b ? 'THANKS FOR WATCHING.' : 'FIND 5 GOLDEN KEYS TO OPEN THE GREEN ROOM';
        E.font.title(g, t1, cx, 30, { scale: 2, align: 'center', colors: ['#ffcc33', '#ff7a5a'], outline: '#1a0a24' }); TX(g, t2, cx, 56, '#2ee6ff', { align: 'center' });
        if (b) { UI.panel(g, cx - 90, 70, 180, 34, { border: '#2ee6ff' }); TX(g, 'CHANNEL 3,000', cx, 76, '#2ee6ff', { align: 'center' }); TX(g, 'TONIGHT: MASHED POTATOES!', cx, 88, '#fff7e8', { align: 'center' }); }
      }
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
MT.scenes.credits = {
  input: MT.MENU, skippable: true,
  enter() { this.t = 0; MT.music.play('ending'); },
  update(dt) { MT.frame(dt); this.t += dt; if (this.t > 1 && (UI.nav('confirm') || UI.nav('cancel')) || this.t > 22) MT.game.go(MT.run && MT.run.mode === 'arcade' ? 'initials' : 'title', {}); },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      const cx = r.W / 2, y0 = r.H + 10 - this.t * 22;
      MT.TEXT.credits.forEach((s, i) => { const y = y0 + i * 16; if (y > -10 && y < r.H) { if (i === 0) MT.drawLogo(g, cx, y, 2, true); else TX(g, s, cx, y, i % 4 === 2 ? '#ffcc33' : '#fff7e8', { align: 'center', scale: s.length < 22 ? 2 : 1 }); } });
      UI.promptBar(g, r, [['confirm', 'SKIP']]);
    });
  }
};
