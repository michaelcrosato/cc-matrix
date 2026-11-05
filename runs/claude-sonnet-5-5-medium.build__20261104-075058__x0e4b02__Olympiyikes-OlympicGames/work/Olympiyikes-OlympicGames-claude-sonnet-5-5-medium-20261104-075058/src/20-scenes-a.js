// Olympiyikes! scenes A: flow, title, menu, attract, setup, nations, opening, day card, event card, play.
(() => {
'use strict';
const E = My3D2dge, O = OLY, { px } = E, game = O.game, clamp = E.clamp;
const C = O.C;

// ================================================================ the flow state machine
const SAVE_KEY = 'save';
O.flow = {
  setup: { length: 'Full 12', playlist: 'Track & Pool', qual: true },
  players: [],   // [{p, nat}]
  mode: 'games',
  startMeet() {
    const st = this.setup, humans = this.players.map(h => ({ p: h.p, nat: h.nat }));
    let sched = O.SCHEDULE.slice(), mode = 'games';
    if (st.length !== 'Full 12') { mode = 'quick'; sched = st.playlist === 'Random 4' ? O.SCHEDULE.slice().sort(() => 0).slice() : O.PLAYLISTS[st.playlist].slice(); if (st.playlist === 'Random 4') { const r = E.rng((Date.now() & 0xffff) + 7); sched = O.SCHEDULE.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).slice(0, 4).map(a => a[1]); } }
    const m = O.newMeet(mode, humans, sched, { qual: st.qual && humans.length === 1 });
    m.qualOn = mode === 'games' && st.qual && humans.length === 1;
    O.go('opening');
  },
  continueSave() {
    const sv = O.store.get(SAVE_KEY, null); if (!sv) return;
    const m = O.newMeet(sv.mode, sv.humans, sv.schedule, { seed: sv.seed, qual: sv.qualOn });
    Object.assign(m, { day: sv.day, medals: sv.medals, pts: sv.pts, torches: sv.torches, yikes: sv.yikes || 0, qualOn: sv.qualOn });
    this.beginDay();
  },
  save() {
    const m = O.meet; if (!m || m.mode !== 'games' || O.inHub) return;
    O.store.set(SAVE_KEY, { mode: m.mode, humans: m.humans, schedule: m.schedule, day: m.day, medals: m.medals, pts: m.pts, torches: m.torches, seed: m.seed, yikes: m.yikes, qualOn: m.qualOn });
  },
  clearSave() { O.store.set(SAVE_KEY, null); },
  hasSave() { return !!O.store.get(SAVE_KEY, null); },
  beginDay() {
    const m = O.meet; if (m.day >= m.schedule.length) return this.finale();
    const evId = m.schedule[m.day];
    // story beats before certain days
    if (m.mode === 'games' && m.day === 6 && !m.halfDone) { m.halfDone = true; return O.go('beat', { kind: 'half' }); }
    O.go('daycard', { ev: evId });
  },
  toEventCard(evId, o = {}) { O.go('eventcard', Object.assign({ ev: evId }, o)); },
  toPlay(evId, only, o = {}) { const m = O.meet; const humans = only || m.humans.map((h, i) => i); O.go('play', Object.assign({ ev: evId, humans }, o), { fade: 'iris' }); },
  // called by play with {scores: {humanIdx: {v, note}}}
  afterPlay(evId, scores, practice) {
    const m = O.meet, ev = O.EV[evId]; m.pend = m.pend || { ev: evId, scores: {} }; if (m.pend.ev !== evId) m.pend = { ev: evId, scores: {} };
    Object.assign(m.pend.scores, scores);
    const failed = [];
    if (m.qualOn && !practice && !O.cheat.qual) m.humans.forEach((h, i) => { const sc = m.pend.scores[i]; if (sc && !O.Records.better(ev, sc.v, ev.qual) && sc.v !== ev.qual) failed.push(i); });
    if (failed.length) { if (!O.cheat.torches) m.torches--; return O.go('torch', { ev: evId, failed, out: m.torches <= 0 && !O.cheat.torches }); }
    this.showResults(evId, practice);
  },
  showResults(evId, practice) {
    const m = O.meet, ev = O.EV[evId], scores = m.pend ? m.pend.scores : {};
    const hs = {}; m.humans.forEach((h, i) => { if (scores[i]) hs[i] = scores[i]; });
    const rows = O.resolve(m, ev, hs, practice);
    if (!practice) O.award(m, ev, rows);
    m.pend = null;
    const recs = [];
    rows.forEach(r => { if (r.human && !O.inHub) { r.wr = O.Records.isWR(ev, r.v); if (O.Records.qualifies(ev, r.v)) recs.push(r); } });
    O.go('results', { ev: evId, rows, practice, recs });
  },
  afterResults(d) {
    if (d.recs && d.recs.length) return O.go('initials', Object.assign({}, d, { i: 0 }));
    this.afterInitials(d);
  },
  afterInitials(d) {
    const m = O.meet;
    if (d.practice || m.mode === 'single') { return O.go(m.mode === 'single' ? 'eventcard' : 'menu', { ev: d.ev, single: true }); }
    O.go('podium', d);
  },
  afterPodium(d) { O.go('medals', d); },
  afterMedals() {
    const m = O.meet; m.day++; this.save();
    if (m.day >= m.schedule.length) return this.finale();
    this.beginDay();
  },
  finale() { O.go('closing'); }
};

// ================================================================ attract mode
const ATTRACT_ORDER = ['sprint', 'skijump', 'diving', 'downhill', 'swim', 'archery', 'figure', 'javelin', 'bobsled', 'weights', 'curling', 'hockey'];
O.Attract = {
  i: 0,
  start() {
    O.cheat.perfect = true;
    O.newMeet('attract', [], ATTRACT_ORDER, { seed: 4242 + this.i });
    this.next();
  },
  next() {
    const id = ATTRACT_ORDER[this.i % ATTRACT_ORDER.length]; this.i++;
    O.go('play', { ev: id, humans: [], attract: true }, { fade: 'iris' });
  },
  stop() { O.cheat.perfect = false; O.Fireworks.clear(); O.Comms.clear(); }
};

// ================================================================ TITLE
const ATHLETE_POSES = ['cheer', 'wave', 'hips', 'guard', 'cheer', 'hips', 'wave', 'cheer'];
O.scene('title', {
  menu: true, view: 'brawler', lock: 0.3, rigs: null,
  enter() {
    if (O.Attract) O.Attract.stop(); O.music('title'); this.rigs = O.NATIONS.map(n => O.makeRig(n)); this.t = 0; game.setView('brawler'); game.weather = null; O.Fireworks.clear();
    if (O.inHub && O.Hub) { O.Hub.begin(); return; }
  },
  update(dt) {
    this.t += dt; this.rigs.forEach((rg, i) => rg.update(dt, { x: (i - 3.5) * 24, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t * .5 + i) * .4, pose: ATHLETE_POSES[(i + Math.floor(this.t / 3)) % 8] }));
    game.focus(0, 0, 52);
    if (this.t % 4 < dt) game.particles.fire(-180, 40, 40, 2, { size: 3 });
    if (O.locked()) return;
    if (O.touchOnly) {
      const c = game.input.clicked(); if (c && this.btn && c[0] >= this.btn[0] && c[0] < this.btn[0] + this.btn[2] && c[1] >= this.btn[1] && c[1] < this.btn[1] + this.btn[3]) game.menu('settings');
      return;
    }
    if (O.pressedAny('confirm') || O.pressedAny('start') || game.input.clicked()) { O.sfx('confirm'); O.go('menu'); }
  },
  draw(r) {
    O.backdrop('stadium').draw(r);
    r.decal(g => {
      const W = r.W, H = r.H;
      // winter half: floodlit ski jump on the right
      px.poly(g, [[W * .55, 0], [W, 0], [W, H], [W * .45, H]], 'rgba(14,20,70,.55)');
      px.poly(g, [[W * .62, H * .42], [W * .98, H * .72], [W * .98, H * .8], [W * .6, H * .5]], '#e8f4ff'); px.rect(g, W * .6, H * .48, 6, H * .4, '#8aa0c8');
      for (let k = 0; k < 8; k++) px.rect(g, W * .62 + k * 40 % 160, H * .08 + (k * 29) % 30, 1, 1, '#fff');
      // summer half: stadium bowl on the left
      px.rect(g, 0, H * .6, W * .55, H * .4, '#4b7a3a'); O.stands(g, r, H * .34, H * .26, 5, .6, 0);
      px.rect(g, 0, H * .6, W, 3, '#3a2a1a');
      // floodlight towers
      [W * .22, W * .5, W * .78].forEach(x => { px.rect(g, x, H * .2, 3, H * .4, '#556'); px.rect(g, x - 8, H * .17, 19, 7, '#ffe9a8'); });
      // cauldron + flame
      const cx = W * .12, cy = H * .62; px.rect(g, cx - 2, cy, 5, 20, '#8a6a2a'); px.poly(g, [[cx - 10, cy - 8], [cx + 10, cy - 8], [cx + 6, cy + 2], [cx - 6, cy + 2]], '#f2b632');
      px.poly(g, [[cx, cy - 26 - Math.sin(game.real * 9) * 3], [cx - 7, cy - 8], [cx + 7, cy - 8]], '#ff6a1a'); px.poly(g, [[cx, cy - 18], [cx - 3, cy - 8], [cx + 3, cy - 8]], '#ffe27a');
      // blimp
      const bx = (game.real * 8) % (W + 120) - 60, by = H * .12; px.ell ? px.ell(g, bx, by, 34, 10, '#f4f4f4') : px.disc(g, bx, by, 10, '#f4f4f4'); px.rect(g, bx - 16, by - 2, 32, 4, '#e8443a'); px.rect(g, bx - 6, by + 8, 12, 4, '#556');
    });
    this.rigs.forEach((rg, i) => r.actor((i - 3.5) * 24, 0, 0, (g, ox, oy) => rg.draw(g, ox, oy, r.view)));
    r.overlay(g => {
      O.emblem(g, r.W / 2, 28, 0.8);
      O.title(g, 'OLYMPIYIKES!', r.W / 2, 50, r.W > 380 ? 5 : 4);
      O.T(g, O.tagline.toUpperCase(), r.W / 2, 100, '#ffe27a', { s: 2, align: 'center' });
      if (O.touchOnly) {
        const w = 300, h = 74, x = (r.W - w) / 2, y = r.H - 112; O.panel(g, x, y, w, h);
        O.T(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, y + 8, '#fff', { s: 2, align: 'center' }); O.T(g, 'Connect a controller or keyboard to play.', r.W / 2, y + 28, '#cfd8ff', { s: 1, align: 'center' });
        const bw = 120, bh = 24, bx = r.W / 2 - bw / 2, by = y + 42; O.focusBar(g, bx, by, bw, bh); O.T(g, 'SETTINGS', r.W / 2, by + 5, '#fff', { s: 2, align: 'center' }); this.btn = [bx, by, bw, bh];
      } else {
        const a = (Math.sin(game.real * 4) + 1) / 2; const lab = 'PRESS'; const w = O.TW(lab, 2) + 4 + O.Prompt.width('confirm', { size: 2 }); const x = (r.W - w) / 2, y = r.H - 58;
        if (a > .25) { O.T(g, lab, x, y + 3, '#fff', { s: 2 }); O.Prompt.draw(g, x + O.TW(lab, 2) + 4, y, 'confirm', { size: 2 }); }
      }
      O.T(g, 'v' + O.version + ' • engine ' + (E.version || ''), r.W - 6, r.H - 9, '#7f89b8', { s: 1, align: 'right' });
      O.T(g, '© 2026 OLYMPIYIKES ORGANISING COMMITTEE (ASKED NICELY)', 6, r.H - 9, '#7f89b8', { s: 1 });
    });
  }
});

// ================================================================ MAIN MENU
O.scene('menu', {
  menu: true, view: 'brawler', lock: .3,
  enter(d) { game.setView('brawler'); this.t = 0; O.music('title'); this.build(); O.Fireworks.clear(); if (d && d.single && O.meet && O.meet.mode === 'single') { O.flow.mode = 'single'; } },
  build() {
    const items = [];
    if (O.flow.hasSave()) items.push({ label: 'CONTINUE GAMES', id: 'cont', desc: 'Resume The Games at the next day.' });
    items.push({ label: 'THE GAMES', id: 'games', desc: 'The campaign: opening ceremony, 12 days of events, medals, a rival. Or a Quick Games of 4. 1 to 4 players.' });
    items.push({ label: 'SINGLE EVENT', id: 'single', desc: 'Pick any of the 12 events, play it for glory or practice it alone. 1 to 4 players.' });
    items.push({ label: 'RECORDS', id: 'records', desc: 'World records, top-5 tables, laurels and the medal cabinet.' });
    items.push({ label: 'HOW TO PLAY', id: 'howto', desc: 'Mash, timing, hype and turbo, and every event on one card.' });
    items.push({ label: 'SETTINGS', id: 'settings', desc: 'Display, sound, controls, prompts, assists and difficulty.' });
    items.push({ label: 'ABOUT & CREDITS', id: 'about', desc: 'Source information, feedback, credits and engine changes.' });
    this.items = items;
    this.menu = new O.Menu10(items, { onBack: () => O.go('title'), onPick: (i, it) => this.pick(it.id) });
  },
  pick(id) {
    if (id === 'cont') return O.flow.continueSave();
    if (id === 'games') { O.flow.mode = 'games'; return O.go('gamesSetup'); }
    if (id === 'single') { O.flow.mode = 'single'; return O.go('nations', { next: 'single' }); }
    if (id === 'records') return O.go('records'); if (id === 'howto') return O.go('howto'); if (id === 'about') return O.go('about');
    if (id === 'settings') return game.menu('settings');
  },
  update(dt) { this.t += dt; this.menu.update(); },
  draw(r) {
    r.sky(['#1a1f5a', '#3a2a78', '#b05a8a']); const t = this.t;
    r.overlay(g => {
      O.stars(g, r, 60, 9);
      O.title(g, 'OLYMPIYIKES!', 120, 12, 2); O.emblem(g, r.W - 56, 34, .9);
      const x = 16, y = 40; this.menu.draw(g, x, y, 200, { lh: 20 });
      // vignette
      const cur = this.items[this.menu.i], vx = 240, vy = 44, vw = r.W - vx - 16, vh = 120; O.panel(g, vx, vy, vw, vh, { alpha: .75 });
      const cx = vx + vw / 2, cy = vy + vh / 2;
      if (cur.id === 'games') { O.NATIONS.forEach((n, i) => O.flag(g, vx + 10 + (i % 4) * ((vw - 20) / 4), vy + 18 + Math.floor(i / 4) * 40 + Math.sin(t * 3 + i) * 2, 34, 22, n)); O.T(g, '12 DAYS • 8 NATIONS', cx, vy + vh - 18, '#ffe27a', { s: 1, align: 'center' }); }
      else if (cur.id === 'single') { const id = O.SCHEDULE[Math.floor(t * 1.5) % 12]; O.picto(g, id, cx, cy - 8, 2.4, '#fff'); O.T(g, O.EV[id].name.toUpperCase(), cx, vy + vh - 18, '#ffe27a', { s: 1, align: 'center' }); }
      else if (cur.id === 'records') { px.poly(g, [[cx - 20, cy - 30], [cx + 20, cy - 30], [cx + 14, cy + 4], [cx - 14, cy + 4]], '#f2b632'); px.rect(g, cx - 3, cy + 4, 6, 14, '#f2b632'); px.rect(g, cx - 16, cy + 18, 32, 6, '#8a6a2a'); px.rect(g, cx - 4, cy - 24, 3, 20, '#fff3'); O.T(g, 'WR ' + O.EV.sprint.wr, cx, vy + vh - 18, '#ffe27a', { s: 1, align: 'center' }); }
      else if (cur.id === 'howto') { O.T(g, '?', cx, cy - 26, '#ffe27a', { s: 7, align: 'center' }); }
      else if (cur.id === 'settings') { px.disc(g, cx, cy - 4, 22, '#cfd8ff'); px.disc(g, cx, cy - 4, 10, '#1c2760'); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t; px.rect(g, cx + Math.cos(a) * 24 - 3, cy - 4 + Math.sin(a) * 24 - 3, 6, 6, '#cfd8ff'); } }
      else if (cur.id === 'cont') { O.picto(g, O.meet && O.meet.schedule ? 'sprint' : 'sprint', cx, cy - 6, 2.4, '#fff'); const sv = O.store.get(SAVE_KEY, null); if (sv) O.T(g, 'NEXT: DAY ' + (sv.day + 1), cx, vy + vh - 18, '#ffe27a', { s: 1, align: 'center' }); }
      else { O.emblem(g, cx, cy, 1.6); }
      // description
      const lines = O.wrap(cur.desc, r.W - 40, 1); lines.forEach((l, i) => O.T(g, l, 20, r.H - 56 + i * 10, '#dfe6ff', { s: 1 }));
      O.strip(g, r, [['confirm', 'Select'], ['cancel', 'Back']], 0);
    });
  }
});

// ================================================================ GAMES SETUP
O.scene('gamesSetup', {
  menu: true, lock: .3, view: 'brawler',
  enter() { this.i = 0; game.setView('brawler'); },
  rows() { const s = O.flow.setup, rows = [{ k: 'length', label: 'LENGTH', opts: ['Full 12', 'Quick 4'] }]; if (s.length !== 'Full 12') rows.push({ k: 'playlist', label: 'PLAYLIST', opts: ['Track & Pool', 'Snow & Ice', 'Greatest Hits', 'Random 4'] }); rows.push({ k: 'diff', label: 'DIFFICULTY', opts: ['Easy', 'Normal', 'Hard'] }); if (s.length === 'Full 12') rows.push({ k: 'qual', label: 'QUALIFYING', opts: ['On', 'Off'] }); rows.push({ k: 'go', label: 'START' }); return rows; },
  val(k) { const s = O.flow.setup; return k === 'diff' ? game.settings.difficulty : k === 'qual' ? (s.qual ? 'On' : 'Off') : s[k]; },
  setVal(k, v) { const s = O.flow.setup; if (k === 'diff') game.settings.set('difficulty', v); else if (k === 'qual') s.qual = v === 'On'; else s[k] = v; },
  update(dt) {
    if (O.locked()) return; const rows = this.rows(); this.i = Math.min(this.i, rows.length - 1);
    for (const p of game.players) {
      if (p.repeat('up', .35, .12)) { this.i = (this.i + rows.length - 1) % rows.length; O.sfx('select'); } if (p.repeat('down', .35, .12)) { this.i = (this.i + 1) % rows.length; O.sfx('select'); }
      const row = rows[this.i], d = p.repeat('right', .35, .15) ? 1 : p.repeat('left', .35, .15) ? -1 : 0;
      if (d && row.opts) { const cur = row.opts.indexOf(this.val(row.k)); this.setVal(row.k, row.opts[(cur + d + row.opts.length) % row.opts.length]); O.sfx('select'); }
      if (p.pressed('confirm')) { if (row.k === 'go') { O.sfx('confirm'); O.go('nations', { next: 'games' }); } else if (row.opts) { const cur = row.opts.indexOf(this.val(row.k)); this.setVal(row.k, row.opts[(cur + 1) % row.opts.length]); O.sfx('select'); } }
      if (p.pressed('cancel')) { O.sfx('cancel'); O.go('menu'); }
    }
    const pt = O.lastPointer, c = game.input.clicked();
    if (this.rects) this.rects.forEach((q, k) => { if (O.pointerMoved && pt && pt[0] >= q[0] && pt[0] < q[0] + q[2] && pt[1] >= q[1] && pt[1] < q[1] + q[3]) this.i = k; if (c && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) { this.i = k; const row = rows[k]; if (row.k === 'go') O.go('nations', { next: 'games' }); else if (row.opts) { const cur = row.opts.indexOf(this.val(row.k)); this.setVal(row.k, row.opts[(cur + 1) % row.opts.length]); } } });
  },
  draw(r) {
    r.sky(['#101a50', '#2a2c78', '#6a3a8a']);
    r.overlay(g => {
      O.stars(g, r, 50, 4); O.title(g, 'THE GAMES', r.W / 2, 14, 3);
      const rows = this.rows(), w = 300, x = (r.W - w) / 2, y = 62; this.rects = [];
      rows.forEach((row, k) => {
        const yy = y + k * 28, sel = k === this.i; this.rects.push([x, yy, w, 26]); if (sel) O.focusBar(g, x, yy, w, 26); else px.rect(g, x, yy, w, 26, 'rgba(10,14,50,.7)');
        O.T(g, row.label, x + 12, yy + 6, sel ? '#fff' : '#cfd8ff', { s: 2 });
        if (row.opts) O.T(g, '← ' + this.val(row.k) + ' →', x + w - 10, yy + 6, '#ffe27a', { s: 2, align: 'right' });
      });
      const desc = { length: 'Full: all 12 events over 12 days. Quick: four events.', playlist: 'Which four events.', diff: 'CPU skill and timing windows.', qual: 'Miss the qualifying mark and a torch goes out. Solo only.', go: 'Choose your nation next.' }[rows[this.i].k];
      O.T(g, desc, r.W / 2, r.H - 44, '#dfe6ff', { s: 1, align: 'center' }); O.strip(g, r, [['confirm', 'Select'], [['left', 'right'], 'Change'], ['cancel', 'Back']], 0);
    });
  }
});

// ================================================================ NATION SELECT + JOIN
O.scene('nations', {
  menu: true, lock: .3, view: 'brawler',
  enter(d) {
    this.next = d.next; this.cur = []; this.lock = []; this.t = 0; this.rig = {}; this.go = 0; game.setView('brawler');
    this.add(0); O.NATIONS.forEach(n => { this.rig[n.id] = O.makeRig(n, { size: 1.5 }); });
    game.allowJoin({ max: 4, onJoin: (inp, n) => { this.add(game.players.indexOf(inp)); O.sfx('confirm'); } });
  },
  exit() { game.allowJoin(false); },
  add(p) { if (this.cur[p] !== undefined) return; let idx = p % 8; while (this.lock.some(l => l === idx)) idx = (idx + 1) % 8; this.cur[p] = idx; this.lock[p] = null; },
  update(dt) {
    this.t += dt; const nat = O.NATIONS[this.cur[0]];
    O.NATIONS.forEach((n, i) => { this.rig[n.id].update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + .3, pose: i === this.cur[0] ? 'cheer' : 'hips' }); });
    game.focus(0, 0, 30);
    if (O.locked()) return;
    for (let p = 0; p < game.players.length; p++) {
      const pi = game.players[p]; if (this.cur[p] === undefined) this.add(p);
      if (this.lock[p] !== null) { if (pi.pressed('cancel')) { this.lock[p] = null; O.sfx('cancel'); } continue; }
      let c = this.cur[p];
      if (pi.repeat('right', .3, .12)) c = (c % 4 === 3) ? c - 3 : c + 1; if (pi.repeat('left', .3, .12)) c = (c % 4 === 0) ? c + 3 : c - 1;
      if (pi.repeat('down', .3, .12)) c = (c + 4) % 8; if (pi.repeat('up', .3, .12)) c = (c + 4) % 8;
      if (c !== this.cur[p]) { this.cur[p] = c; O.sfx('select'); }
      if (pi.pressed('confirm')) this.tryLock(p);
      else if (pi.pressed('cancel')) { if (p === 0) { O.sfx('cancel'); return O.go(this.next === 'single' ? 'menu' : 'gamesSetup'); } else { game.removePlayer(pi); this.cur.length = Math.min(this.cur.length, game.players.length); this.lock.length = this.cur.length; } }
    }
    if (this.rects && O.pointerMoved && O.lastPointer) this.rects.forEach((q, k) => { const pt = O.lastPointer; if (this.lock[0] === null && pt[0] >= q[0] && pt[0] < q[0] + q[2] && pt[1] >= q[1] && pt[1] < q[1] + q[3] && this.cur[0] !== k) { this.cur[0] = k; O.sfx('select'); } });
    const c = game.input.clicked(); if (c && this.rects) this.rects.forEach((q, k) => { if (c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3] && this.lock[0] === null) { this.cur[0] = k; this.tryLock(0); } });
    if (this.lock.length && this.lock.every(l => l !== null) && game.players.length === this.lock.length) { this.go += dt; if (this.go > .9 || O.pressedAny('start')) this.proceed(); } else this.go = 0;
  },
  tryLock(p) { const c = this.cur[p]; if (this.lock.some((l, i) => l === c && i !== p)) { O.sfx('ol_nope'); return; } this.lock[p] = c; O.sfx('ol_good'); },
  proceed() {
    const humans = this.lock.map((l, p) => ({ p, nat: O.NATIONS[l].id }));
    O.flow.players = humans;
    if (this.next === 'single') { O.newMeet('single', humans, [], { qual: false }); O.go('single'); } else O.flow.startMeet();
  },
  draw(r) {
    r.sky(['#101a50', '#223a8a', '#4a6ab0']);
    r.overlay(g => {
      O.stars(g, r, 40, 3); O.T(g, 'CHOOSE YOUR NATION', r.W / 2, 8, '#fff', { s: 2, align: 'center' });
      const gw = 52, gh = 34, gx = 14, gy = 34, gapx = 10, gapy = 22; this.rects = [];
      O.NATIONS.forEach((n, i) => {
        const x = gx + (i % 4) * (gw + gapx), y = gy + Math.floor(i / 4) * (gh + gapy + 18); this.rects.push([x - 4, y - 4, gw + 8, gh + 22]);
        O.flag(g, x, y, gw, gh, n); O.T(g, n.id, x + gw / 2, y + gh + 4, '#fff', { s: 2, align: 'center' });
        game.players.forEach((pp, p) => { if (this.cur[p] === i) { const col = E.PLAYER_COLORS[p], lk = this.lock[p] !== null && this.lock[p] !== undefined; const o = p * 2; px.rect(g, x - 3 - o, y - 3 - o, gw + 6 + 2 * o, 2, col); px.rect(g, x - 3 - o, y + gh + 1 + o, gw + 6 + 2 * o, 2, col); px.rect(g, x - 3 - o, y - 3 - o, 2, gh + 6 + 2 * o, col); px.rect(g, x + gw + 1 + o, y - 3 - o, 2, gh + 6 + 2 * o, col); O.T(g, 'P' + (p + 1) + (lk ? '*' : ''), x + 2 + p * 18, y - 12, col, { s: 1 }); } });
      });
      const nat = O.NATIONS[this.cur[0]], px0 = 14 + 4 * (gw + gapx) + 6, pw = r.W - px0 - 12;
      O.panel(g, px0, 34, pw, r.H - 74, { alpha: .8 });
      O.flag(g, px0 + 8, 40, 30, 20, nat); O.T(g, nat.name, px0 + 44, 42, '#ffe27a', { s: 2 }); O.T(g, nat.athlete.name, px0 + 8, 62, '#fff', { s: 1 });
      nat.bioLines = nat.bioLines || O.wrap(nat.bio, pw - 66, 1); nat.bioLines.forEach((l, i) => O.T(g, l, px0 + 8, 78 + i * 9, '#cfd8ff', { s: 1 }));
      this.rig[nat.id].drawPortrait(g, px0 + pw - 52, 66, 44);
      const sp = Object.entries(nat.skills).sort((a, b) => b[1] - a[1]).slice(0, 3); sp.forEach(([id], i) => O.picto(g, id, px0 + 22 + i * 36, r.H - 62, .9, '#fff'));
      O.T(g, 'SPECIALTIES', px0 + 8, r.H - 90, '#9fb0ff', { s: 1 });
      const tip = game.players.length < 4 ? 'P2-P4: press ' + (game.input.lastDevice === 'gamepad' ? 'Options on another pad' : '2 on the keyboard') + ' to join' : 'All players joined'; O.T(g, tip, r.W / 2, r.H - 32, '#ffe27a', { s: 1, align: 'center' });
      if (this.go > 0) O.banner(g, r, 'GET READY!', r.H * .45, '#4fe0a8', 3);
      O.strip(g, r, [['confirm', 'Lock in'], ['cancel', 'Back']], 0);
    });
    },
  drawAthlete(r) { const nat = O.NATIONS[this.cur[0]], rg = this.rig[nat.id]; r.actor(60, 0, 0, (g, ox, oy) => rg.draw(g, ox, oy + 20, r.view), { }); }
});

// ================================================================ OPENING CEREMONY
O.scene('opening', {
  lock: .2, view: 'brawler',
  enter() { this.t = 0; this.rigs = O.NATIONS.map(n => O.makeRig(n)); this.hold = 0; game.setView('brawler'); O.music('ceremony'); O.Comms.sayRaw('BIFF', 'Welcome to the first ever Summer AND Winter Games, held in the same fortnight, in the same town, by mistake!', 5); this.said = 0; },
  update(dt) {
    this.t += dt; const t = this.t;
    this.rigs.forEach((rg, i) => { const x = -160 + (t - i * 1.0) * 30; rg.update(dt, { x, y: 0, z: 0, vx: 26, vy: 0, facing: 0 }); });
    game.focus(0, 0, 26);
    if (t > 9 && !this.lit) { this.lit = true; O.Fireworks.burst(120, 60, '#ffd36a'); O.Fireworks.burst(260, 70); O.sfx('ol_record'); O.Comms.sayRaw('ELOISE', 'The cauldron is lit! The cauldron is lit! Somebody get the extinguisher! No, wait, do not!', 5); }
    if (this.lit && t % 1.2 < dt) O.Fireworks.burst(60 + O.crnd() * 300, 40 + O.crnd() * 40);
    if (this.said === 0 && t > 3) { this.said = 1; O.Comms.sayRaw('ELOISE', 'Here come the nations! Look at the little flags! I am going to cry!', 4); }
    const holdIn = game.players.some(p => p.down('confirm')) || false; this.hold = holdIn && !O.locked() ? this.hold + dt : 0;
    if (this.hold > 1 || t > 15) O.flow.beginDay();
  },
  draw(r) {
    O.backdrop('stadium').draw(r); const t = this.t;
    r.decal(g => { const a = r.w(-400, 0, 0); O.stands(g, r, a[1] - 60, 56, 3, this.lit ? 1 : .5, 0); px.rect(g, 0, a[1] - 4, r.W, r.H, '#4b7a3a'); O.groundQuad(r, g, -400, -40, 400, 60, '#c4553a'); });
    this.rigs.forEach((rg, i) => { const x = -160 + (t - i * 1.0) * 30; r.actor(x, 0, 0, (g, ox, oy) => { rg.draw(g, ox, oy, r.view); const n = O.NATIONS[i]; px.rect(g, ox + 6, oy - 62, 1, 40, '#ddd'); O.flag(g, ox + 7, oy - 62, 18, 12, n); }); });
    r.overlay(g => {
      const cx = r.W - 56, cy = r.H - 80; px.rect(g, cx - 2, cy, 5, 36, '#8a6a2a'); px.poly(g, [[cx - 12, cy - 6], [cx + 12, cy - 6], [cx + 7, cy + 6], [cx - 7, cy + 6]], '#f2b632');
      if (this.lit) { px.poly(g, [[cx, cy - 34 - Math.sin(game.real * 9) * 3], [cx - 9, cy - 6], [cx + 9, cy - 6]], '#ff6a1a'); px.poly(g, [[cx, cy - 22], [cx - 4, cy - 6], [cx + 4, cy - 6]], '#ffe27a'); }
      O.banner(g, r, 'OPENING CEREMONY', 34, '#ffe27a', 2);
      const idx = clamp(Math.floor(t - .0), 0, 7); if (t < 9) { const n = O.NATIONS[clamp(Math.floor(t / 1.0) , 0, 7)]; O.flag(g, r.W / 2 - 24, 62, 48, 32, n); O.T(g, n.name, r.W / 2, 100, '#fff', { s: 2, align: 'center' }); }
      px.rect(g, r.W / 2 - 40, r.H - 40, 80, 4, '#161a3c'); px.rect(g, r.W / 2 - 40, r.H - 40, 80 * clamp(this.hold, 0, 1), 4, '#ffe27a'); O.T(g, 'HOLD', r.W / 2 - 14, r.H - 32, '#cfd8ff', { s: 1 }); O.Prompt.draw(g, r.W / 2 + 6, r.H - 34, 'confirm', { }); O.T(g, 'TO SKIP', r.W / 2 + 20, r.H - 32, '#cfd8ff', { s: 1 });
    });
  }
});

// ================================================================ DAY CARD (broadcast bumper) + STORY BEATS
const WEATHER = { stadium: 'SUNNY, 29 degC, A BLIMP', pool: 'WARM, 30 degC, SPLASHY', range: 'BREEZY, 24 degC, A SMALL FLAG', hall: 'INDOORS, SWEATY', snow: 'FLURRIES, -4 degC, WIND IN THE EARS', ice: 'COLD, -2 degC, VERY SLIPPERY' };
O.scene('daycard', {
  lock: .6, view: 'brawler',
  enter(d) {
    this.ev = O.EV[d.ev]; this.t = 0; const m = O.meet; this.nat = O.NAT[m.humans[0].nat]; this.rig = O.makeRig(this.nat, { size: 1.6 }); game.setView('brawler');
    this.rival = m.humans[0].nat !== 'TRB'; O.music(this.ev.season === 'summer' ? 'summer' : 'winter'); O.Comms.say('start');
    this.lines = [this.nat.athlete.name + ' of ' + this.nat.name, this.nat.bio, this.ev.season === 'summer' ? 'Summer day. Sunscreen: optional. Bravery: required.' : 'Winter day. Hat: mandatory. Dignity: pending.'];
    this.bg = this.ev.venue;
  },
  update(dt) { this.t += dt; this.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + .4, pose: 'hips', expr: 'smile' }); game.focus(0, 0, 30); if (!O.locked() && (O.pressedAny('confirm') || game.input.clicked() || this.t > 9)) { O.sfx('confirm'); O.go('eventcard', { ev: this.ev.id }); } },
  draw(r) {
    O.backdrop(this.bg).draw(r);
    r.decal(g => { const a = r.w(-300, 0, 0); px.rect(g, 0, a[1] - 3, r.W, r.H, this.ev.season === 'summer' ? '#4b9a4a' : '#e8f4ff'); });
    r.overlay(g => {
      const m = O.meet, slide = clamp(this.t * 3, 0, 1);
      px.rect(g, 0, 18, r.W * slide, 34, 'rgba(10,12,44,.92)'); px.rect(g, 0, 18, r.W * slide, 2, '#f2b632');
      O.T(g, 'DAY ' + (m.day + 1) + ' • ' + this.ev.name.toUpperCase(), 14, 24, '#fff', { s: 3 });
      O.picto(g, this.ev.id, r.W - 36, 36, 1.4, '#fff');
      O.T(g, (this.ev.season === 'summer' ? 'SUMMER' : 'WINTER') + ' GAMES • ' + WEATHER[this.ev.venue], 14, 56, '#ffe27a', { s: 1 });
      const ly = r.H - 94; px.rect(g, 0, ly, r.W, 76, 'rgba(10,12,44,.9)'); px.rect(g, 0, ly, r.W, 2, '#f2b632'); px.rect(g, 0, ly, 110, 12, '#e8443a'); O.T(g, 'UP CLOSE & PERSONAL', 6, ly + 3, '#fff', { s: 1 });
      this.rig.drawPortrait(g, 10, ly + 16, 52); O.flag(g, 68, ly + 18, 26, 17, this.nat);
      this.lines.forEach((l, i) => { const w = r.W - 116; O.wrap(l, w, 1).forEach((ll, k) => O.T(g, ll, 102, ly + 16 + i * 17 + k * 8, i === 0 ? '#ffe27a' : '#dfe6ff', { s: 1 })); });
      O.strip(g, r, [['confirm', 'Continue']], 0);
    });
  }
});

O.scene('beat', {
  lock: .6, view: 'brawler',
  enter(d) {
    this.d = d; this.t = 0; const m = O.meet; const tbl = O.medalTable(m); const my = tbl.findIndex(x => x.nat === m.humans[0].nat) + 1;
    this.nat = O.NAT[m.humans[0].nat]; this.rig = O.makeRig(this.nat, { size: 1.6 }); this.rival = O.makeRig(O.NAT.TRB, { size: 1.6 }); game.setView('brawler'); O.music('ceremony');
    if (d.kind === 'half') {
      this.head = 'HALFTIME REPORT'; const lead = tbl[0];
      this.lines = ['Six days down, six to go. You stand ' + my + (my === 1 ? 'st' : my === 2 ? 'nd' : my === 3 ? 'rd' : 'th') + ' in the medal table.', lead.nat === this.nat.id ? 'Max Overdrive is "not worried at all", which is how you know he is worried.' : O.NAT[lead.nat].name + ' lead the table. Max Overdrive claims credit anyway.', 'Yikes so far: ' + m.yikes + '. The mascot has filed a complaint.'];
      O.Comms.sayRaw('ELOISE', 'Halftime! Time for orange slices and emotional support!', 4);
    }
  },
  update(dt) { this.t += dt; this.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'hips' }); this.rival.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'wave' }); game.focus(0, 0, 30); if (!O.locked() && (O.pressedAny('confirm') || game.input.clicked() || this.t > 12)) { O.sfx('confirm'); O.flow.beginDay(); } },
  draw(r) {
    r.sky(['#101a50', '#2a2c78', '#6a3a8a']);
    r.overlay(g => {
      O.stars(g, r, 40, 6); O.title(g, this.head, r.W / 2, 14, 3);
      O.panel(g, 14, 56, r.W - 28, 110, { alpha: .85 }); this.rig.drawPortrait(g, 22, 66, 52); this.rival.drawPortrait(g, r.W - 74, 66, 52);
      this.lines.forEach((l, i) => O.wrap(l, r.W - 190, 1).forEach((ll, k) => O.T(g, ll, 86, 66 + i * 30 + k * 9, '#fff', { s: 1 })));
      O.strip(g, r, [['confirm', 'Continue']], 0);
    });
  }
});

// ================================================================ EVENT CARD
O.scene('eventcard', {
  lock: .5, view: 'brawler',
  enter(d) {
    this.ev = O.EV[d.ev]; this.d = d; game.setView('brawler'); this.single = O.meet && O.meet.mode === 'single'; O.music(this.ev.season === 'summer' ? 'summer' : 'winter');
    O.playData = null;
  },
  update(dt) {
    if (O.locked()) return;
    if (O.pressedAny('confirm') || game.input.clicked()) { O.sfx('confirm'); const m = O.meet; O.practice = false; return O.flow.toPlay(this.ev.id, null, { practice: false }); }
    if (this.single && O.pressedAny('turbo')) { O.sfx('confirm'); return O.flow.toPlay(this.ev.id, null, { practice: true }); }
    if (O.pressedAny('cancel')) { O.sfx('cancel'); if (this.single) O.go('single'); else O.go('menu'); }
  },
  draw(r) {
    r.sky(this.ev.season === 'summer' ? ['#2a6ad8', '#6ac0f8', '#ffe9b0'] : ['#16225a', '#3a58b0', '#bfe0ff']);
    r.overlay(g => {
      const ev = this.ev; O.panel(g, 12, 12, r.W - 24, r.H - 40, { alpha: .9 });
      O.picto(g, ev.id, 52, 52, 2.2, '#fff'); O.T(g, ev.name.toUpperCase(), 92, 26, '#ffe27a', { s: 3 }); O.T(g, (ev.season === 'summer' ? 'SUMMER' : 'WINTER') + ' • ' + ev.venue.toUpperCase(), 92, 52, '#9fb0ff', { s: 1 });
      O.wrap(ev.goal, r.W - 60, 1).forEach((l, i) => O.T(g, l, 28, 84 + i * 10, '#fff', { s: 1 }));
      const pi = 0; let y = 106;
      ev.rows({}).forEach(row => { let x = 34; if (Array.isArray(row[0])) { if (row[0][0] === 'mashL') x += O.Prompt.pair(g, x, y, 'mashL', 'mashR', { pi }) + 4; else row[0].forEach(a => { x += O.Prompt.draw(g, x, y, a, { pi }) + 2; }); } else x += O.Prompt.draw(g, x, y, row[0], { pi }) + 4; O.T(g, row[1], x + 4, y + 1, '#dfe6ff', { s: 1 }); y += 15; });
      const wr = O.Records.worldRecord(ev), top = O.Records.table(ev)[0];
      O.T(g, 'QUALIFYING  ' + ev.fmt(ev.qual), 28, r.H - 76, '#ffb0a0', { s: 1 }); O.T(g, 'WORLD RECORD  ' + ev.fmt(wr), 28, r.H - 64, '#ffe27a', { s: 1 }); if (top) O.T(g, 'BEST  ' + ev.fmt(top.v) + ' ' + top.n, 28, r.H - 52, '#cfd8ff', { s: 1 });
      const m = O.meet; if (m && m.humans.length) { m.humans.forEach((h, i) => O.T(g, 'P' + (i + 1) + ' ' + O.NAT[h.nat].id, r.W - 90, 28 + i * 10, E.PLAYER_COLORS[h.p], { s: 1 })); }
      const items = [['confirm', 'Start'], ['cancel', 'Back']]; if (this.single) items.splice(1, 0, ['turbo', 'Practice']); O.strip(g, r, items, 0);
    });
  }
});
})();
