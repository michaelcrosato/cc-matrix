/* THUGBY TURBO — front-end scenes: title, attract, touch-only, cup, story, exhibition, training, records, about, results. */
const SCENES = {};
const TEAM_IDS = ['hawks', 'rovers', 'titans', 'mudlarks', 'dockers', 'flames', 'meteors'], VENUE_IDS = ['muddington', 'docks', 'furnace', 'megadome'];
const cycle = (arr, cur, d) => arr[(arr.indexOf(cur) + d + arr.length) % arr.length];
const OPT = { home: 'hawks', away: 'rovers', venue: 'muddington', players: 0, half: 120 };
TT.touchOnly = false;
function detectTouchOnly() {
  try { const m = matchMedia; const coarse = m('(any-pointer: coarse)').matches, fine = m('(any-pointer: fine)').matches; TT.touchOnly = coarse && !fine; } catch (e) { TT.touchOnly = false; }
  const off = () => { TT.touchOnly = false; };
  addEventListener('keydown', off); addEventListener('gamepadconnected', off); addEventListener('mousemove', e => { if (e.pointerType !== 'touch') off(); }, { once: false });
}
const anyInput = (inp) => inp.anyPressed() || Math.hypot(...inp.move()) > .2 || (inp.clicked && inp.clicked());

SCENES.title = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter(data) { const game = TT.game; game.input.touchEnabled = false; UI.idle = 0; UI.t = 0; UI.mxy = null; this.build(); music('title'); },
  build() {
    const cup = loadJSON('thugby:cup', null), started = cup && cup.round > 0 && cup.round < 4;
    this.m = mkMenu([
      { label: started ? 'CONTINUE MEGA CUP' : 'MEGA CUP', fn: () => TT.game.go('cup') },
      { label: 'EXHIBITION', fn: () => TT.game.go('exhibition') }, { label: 'TRAINING GROUND', fn: () => TT.game.go('training') },
      { label: 'RECORDS', fn: () => TT.game.go('records') }, { label: 'SETTINGS', fn: () => TT.game.menu('settings') }, { label: 'ABOUT & CREDITS', fn: () => TT.game.go('about') }], { y: 92, w: 170, sp: 20, scale: 1.5 });
    this.m.scale = 1;
    this.m.sp = 18;
  },
  update(dt) {
    const game = TT.game, inp = game.input; UI.t += dt; UI.idle += dt;
    const pm = inp.pointer && inp.pointer(); if (pm) { if (UI.mxy && Math.abs(pm[0] - UI.mxy[0]) + Math.abs(pm[1] - UI.mxy[1]) > 2) UI.idle = 0; UI.mxy = pm.slice(); }
    if (anyInput(inp)) UI.idle = 0;
    if (TT.touchOnly) { const ck = inp.clicked && inp.clicked(); if (ck && ck[1] > 150) game.menu('settings'); if (UI.idle > 10) game.go('match', { mode: 'attract' }); return; }
    const it = menuStep(this.m, inp, game, dt); if (it) it.fn();
    if (UI.idle > 10) game.go('match', { mode: 'attract' });
  },
  draw(r) {
    const inp = TT.game.input; backdrop(r, UI.t);
    r.overlay(g => {
      const W = r.W, H = r.H; titleLogo(g, W, 12, UI.t); E.font.text(g, 'OVER-THE-TOP ARCADE RUGBY SEVENS', W / 2, 78, '#ffe9b0', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
      if (TT.touchOnly) { E.ui.box(g, 6, 96, W - 12, 48, { alpha: .9 }); E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, 102, '#ffffff', { align: 'center', scale: 1.5, shadow: '#000', outline: false }); E.font.text(g, 'Connect a controller or a keyboard to play.', W / 2, 124, '#c0c8e8', { align: 'center', shadow: '#000', outline: false }); E.ui.box(g, W / 2 - 60, 160, 120, 28, { bg: ['#3a5a9a', '#1a2a5a'], border: '#ffe070' }); E.font.text(g, 'SETTINGS', W / 2, 168, '#fff', { align: 'center', scale: 1.5 }); return; }
      menuDraw(g, this.m, W, H, inp);
      const p = getPortraits(); p.BARRY.drawPortrait(g, 16, H - 62, 44); p.ROS.drawPortrait(g, W - 60, H - 62, 44);
      E.font.text(g, 'LIVE ON CHANNEL THUD', 6, 4, '#ff6060', { shadow: '#000', outline: false, font: 'tiny' });
      footer(g, W, H, inp, '{x} SELECT   {ci} BACK   IDLE 10s: ATTRACT');
      E.font.text(g, 'v' + TT.version + '  my-3D2dge ' + E.version, W - 4, 4, '#8890b0', { align: 'right', font: 'tiny' });
    });
  }
};
// ---------- cup
const CUPSAVE = () => loadJSON('thugby:cup', { round: 0, results: [] });
SCENES.cup = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; const c = CUPSAVE(); this.c = c; const done = c.round >= 4; this.m = mkMenu([
    { label: done ? 'REPLAY THE FINAL' : 'PLAY ' + CUP[Math.min(3, c.round)].title, fn: () => TT.game.go('story', { cup: done ? 3 : c.round, stage: 'pre' }) },
    { label: 'TRAINING GROUND', fn: () => TT.game.go('training') }, { label: 'RESTART CUP', fn: () => { saveJSON('thugby:cup', { round: 0, results: [] }); TT.game.go('cup'); } }, { label: 'BACK', fn: () => TT.game.go('title') }], { y: 150, w: 150, sp: 20, scale: 1 }); this.m.onBack = () => TT.game.go('title'); music('menu'); },
  update(dt) { UI.t += dt; const it = menuStep(this.m, TT.game.input, TT.game, dt); if (it) it.fn(); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => {
    const W = r.W, H = r.H; header(g, W, 'THE MEGA CUP', 'FOUR MATCHES. ONE TROPHY. NO MERCY.');
    CUP.forEach((c, i) => { const x = 10 + i * 102, y = 44, T = TEAMS[c.opp], done = i < this.c.round, next = i === Math.min(3, this.c.round); E.ui.box(g, x, y, 96, 88, { bg: done ? ['#1f4a2a', '#0e2012'] : next ? ['#3a4a9a', '#1a2260'] : ['#20202c', '#101018'], border: next ? '#ffe070' : done ? '#80ff80' : '#404058' });
      E.font.text(g, c.title, x + 48, y + 5, next ? '#ffe070' : '#c0c8e8', { align: 'center', font: 'tiny', shadow: '#000', outline: false }); px.rect(g, x + 28, y + 16, 40, 24, T.c1); px.rect(g, x + 28, y + 36, 40, 4, T.c2); E.font.text(g, T.crest, x + 48, y + 20, T.c2, { align: 'center', scale: 2 }); E.font.text(g, T.short, x + 48, y + 46, '#fff', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, VENUES[c.venue].name, x + 48, y + 58, '#a0a8d0', { align: 'center', font: 'tiny' }); E.font.text(g, done ? 'WON ' + (this.c.results[i] || '') : next ? 'UP NEXT' : 'LOCKED', x + 48, y + 74, done ? '#80ff80' : next ? '#ffe070' : '#707890', { align: 'center', font: 'tiny' }); });
    E.font.text(g, CUP[Math.min(3, this.c.round)].hint, W / 2, 138, '#ffd9a0', { align: 'center', shadow: '#000', outline: false });
    menuDraw(g, this.m, W, H, inp); footer(g, W, H, inp, '{x} SELECT   {ci} BACK'); }); }
};
SCENES.story = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter(d) { UI.t = 0; this.d = d; const c = CUP[d.cup]; this.lines = d.stage === 'pre' ? c.pre : [['COACH', c.post[0]]]; if (d.stage === 'post') { const T = TEAMS[c.opp]; this.lines = [['BARRY', 'And that is full time!'], ['COACH', c.post[0]]]; } this.i = 0; this.ch = 0; this.say(); music('menu'); },
  say() { const l = this.lines[this.i]; this.ch = 0; this.full = false; TT.voice(l[0], l[1]); },
  update(dt) { UI.t += dt; const inp = TT.game.input, l = this.lines[this.i]; this.ch = Math.min(l[1].length, this.ch + dt * 38);
    if (inp.pressed('confirm') || inp.pressed('x') || (inp.clicked && inp.clicked())) { if (this.ch < l[1].length) this.ch = l[1].length; else { this.i++; if (this.i >= this.lines.length) { if (this.d.stage === 'pre') TT.game.go('match', { mode: 'cup', cup: this.d.cup }); else TT.game.go('cup'); } else this.say(); } }
    if (inp.pressed('cancel') || inp.pressed('start')) { if (this.d.stage === 'pre') TT.game.go('match', { mode: 'cup', cup: this.d.cup }); else TT.game.go('cup'); } },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H, l = this.lines[this.i], c = CUP[this.d.cup]; header(g, W, c.title, TEAMS[c.opp].name + ' @ ' + VENUES[c.venue].name);
    const rig = getPortraits()[l[0]]; E.ui.box(g, 20, 70, 387, 100, { alpha: .9 }); if (rig) rig.drawPortrait(g, 28, 80, 64); E.font.text(g, l[0], 104, 80, '#ffd070', { scale: 2, shadow: '#000', outline: false });
    E.font.text(g, l[1].slice(0, Math.floor(this.ch)), 104, 104, '#ffffff', { wrap: 290, shadow: '#000', outline: false }); footer(g, W, H, inp, '{x} NEXT   {pause} SKIP'); }); }
};
// ---------- exhibition
SCENES.exhibition = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; const nm = ['1 PLAYER', '2 PLAYERS: CO-OP', '2 PLAYERS: VERSUS'];
    this.m = mkMenu([
      { label: () => 'HOME: ' + TEAMS[OPT.home].short, adjust: d => { OPT.home = cycle(TEAM_IDS, OPT.home, d); } }, { label: () => 'AWAY: ' + TEAMS[OPT.away].short, adjust: d => { OPT.away = cycle(TEAM_IDS, OPT.away, d); } },
      { label: () => 'STADIUM: ' + VENUES[OPT.venue].name, adjust: d => { OPT.venue = cycle(VENUE_IDS, OPT.venue, d); } }, { label: () => nm[OPT.players], adjust: d => { OPT.players = (OPT.players + d + 3) % 3; } },
      { label: () => 'HALVES: ' + (OPT.half / 60) + ' MIN', adjust: d => { OPT.half = clamp(OPT.half + d * 60, 120, 300); } },
      { label: 'KICK OFF!', fn: () => { if (OPT.home === OPT.away) OPT.away = cycle(TEAM_IDS, OPT.away, 1); TT.game.go('match', { mode: 'exh', home: OPT.home, away: OPT.away, venue: OPT.venue, players: OPT.players, half: OPT.half }); } }, { label: 'BACK', fn: () => TT.game.go('title') }], { y: 62, w: 240, sp: 20, scale: 1 });
    this.m.onBack = () => TT.game.go('title'); music('menu'); },
  update(dt) { UI.t += dt; const it = menuStep(this.m, TT.game.input, TT.game, dt); if (it) it.fn(); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H; header(g, W, 'EXHIBITION', 'ANY TWO TEAMS, ANY STADIUM, UP TO TWO PLAYERS');
    menuDraw(g, this.m, W, H, inp); const A = TEAMS[OPT.home], B = TEAMS[OPT.away]; px.rect(g, 30, 190, 60, 20, A.c1); px.rect(g, 30, 206, 60, 4, A.c2); px.rect(g, W - 90, 190, 60, 20, B.c1); px.rect(g, W - 90, 206, 60, 4, B.c2); E.font.text(g, 'VS', W / 2, 196, '#ffe070', { align: 'center', scale: 2, shadow: '#000', outline: false });
    E.font.text(g, VENUES[OPT.venue].blurb, W / 2, 218, '#c0c8e8', { align: 'center', shadow: '#000', outline: false, font: 'tiny' }); if (OPT.players) E.font.text(g, 'P2: PRESS 2 / ENTER ON KEYBOARD, OR START ON A SECOND PAD', W / 2, 40, '#ffd9a0', { align: 'center', font: 'tiny' }); footer(g, W, H, inp, '{x} CHANGE   {l1}{r1} ADJUST   {ci} BACK'); }); }
};
// ---------- training
SCENES.training = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; const done = loadJSON('thugby:drills', {}); this.done = done; this.m = mkMenu(DRILLS.map((d, i) => ({ label: (done[d.id] ? '[DONE] ' : '') + (i + 1) + '. ' + d.name, fn: () => TT.game.go('match', { mode: 'drill', drill: d.id }) })).concat([{ label: 'BACK', fn: () => TT.game.go('title') }]), { y: 36, w: 200, sp: 18, scale: 1 }); this.m.onBack = () => TT.game.go('title'); music('menu'); },
  update(dt) { UI.t += dt; const it = menuStep(this.m, TT.game.input, TT.game, dt); if (it) it.fn(); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H; header(g, W, 'TRAINING GROUND', 'NINE DRILLS. EACH ONE IS A LESSON.'); menuDraw(g, this.m, W, H, inp);
    const D = DRILLS[this.m.i]; if (D) { E.ui.box(g, 10, 198, W - 20, 28, { alpha: .8 }); E.font.text(g, D.text, 16, 202, '#fff', { wrap: W - 40, shadow: '#000', outline: false, font: 'tiny' }); E.font.text(g, 'GOAL: ' + D.goal, 16, 214, '#ffe070', { font: 'tiny' }); } footer(g, W, H - 24, inp, '{x} START   {ci} BACK'); }); }
};
// ---------- records
SCENES.records = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; this.rec = getRecords(); this.k = 0; music('menu'); },
  update(dt) { UI.t += dt; const inp = TT.game.input; if (inp.pressed('right') || inp.pressed('r1')) this.k = (this.k + 1) % 4; if (inp.pressed('left') || inp.pressed('l1')) this.k = (this.k + 3) % 4; if (inp.pressed('cancel') || inp.pressed('confirm') || inp.pressed('ci') || (inp.clicked && inp.clicked())) TT.game.go('title'); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H; header(g, W, 'RECORDS', 'THE LEAGUE OF LEGENDS (AND BAZ)'); const [key, name, unit] = REC.cats[this.k];
    E.font.text(g, '<  ' + name + '  >', W / 2, 46, '#ffe070', { align: 'center', scale: 1, shadow: '#000', outline: false }); this.rec[key].forEach((e, i) => { const y = 66 + i * 22; E.ui.box(g, W / 2 - 100, y, 200, 18, { alpha: .8 }); E.font.text(g, (i + 1) + '.', W / 2 - 92, y + 5, '#a0a8d0'); E.font.text(g, e.n, W / 2 - 64, y + 3, '#fff', { scale: 1.5, shadow: '#000', outline: false }); E.font.text(g, e.s + ' ' + unit, W / 2 + 92, y + 5, '#ffe070', { align: 'right' }); }); footer(g, W, H, inp, '{l1}{r1} TABLE   {ci} BACK'); }); }
};
// ---------- results (with initials for records)
SCENES.results = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter(d) {
    UI.t = 0; this.d = d; const s = d.sum; this.s = s; this.ini = [0, 0, 0]; this.ii = 0; this.entry = null;
    const margin = s.score[0] - s.score[1]; const cats = [['margin', margin], ['tries', s.st[0].tries], ['hits', s.st[0].bigHits], ['metres', Math.round(s.st[0].metres)]]; this.cand = d.mode === 'drill' || d.mode === 'online' ? [] : cats.filter(([k, v]) => qualifies(k, v));
    this.entry = this.cand.length ? this.cand[0] : null;
    if (d.mode === 'cup' && s.win === 0) { const c = CUPSAVE(); if (c.round <= d.cup) { c.round = d.cup + 1; c.results[d.cup] = s.score[0] + '-' + s.score[1]; saveJSON('thugby:cup', c); } }
    this.m = mkMenu(d.mode === 'cup' ? (s.win === 0 ? [{ label: d.cup >= 3 ? 'CHAMPIONS!' : 'CONTINUE', fn: () => TT.game.go('story', { cup: d.cup, stage: 'post' }) }] : [{ label: 'TRY AGAIN', fn: () => TT.game.go('match', { mode: 'cup', cup: d.cup }) }, { label: 'MENU', fn: () => TT.game.go('title') }]) : [{ label: 'REMATCH', fn: () => TT.game.go('match', d.again) }, { label: 'MAIN MENU', fn: () => TT.game.go('title') }], { y: 190, w: 130, sp: 18, scale: 1 }); this.m.y = 192;
    music(s.win === 0 ? 'title' : 'menu'); if (A() && TT.cfg.present) try { A().sting && A().sting(s.win === 0 ? SONGS.win : SONGS.lose); } catch (e) { /* ok */ }
  },
  update(dt) { UI.t += dt; const inp = TT.game.input;
    if (this.entry) { if (inp.repeat('up', .3, .1)) this.ini[this.ii] = (this.ini[this.ii] + 1) % 26; if (inp.repeat('down', .3, .1)) this.ini[this.ii] = (this.ini[this.ii] + 25) % 26; if (inp.pressed('right')) this.ii = Math.min(2, this.ii + 1); if (inp.pressed('left')) this.ii = Math.max(0, this.ii - 1);
      if (inp.pressed('confirm') || inp.pressed('x')) { if (this.ii < 2) this.ii++; else { addRecord(this.entry[0], this.entry[1], this.ini.map(i => String.fromCharCode(65 + i)).join('')); this.cand.shift(); this.entry = this.cand[0] || null; this.ii = 0; TT.game.audio.sfx('confirm'); } } return; }
    const it = menuStep(this.m, inp, TT.game, dt); if (it) it.fn(); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H, s = this.s, T = [TEAMS[s.teams[0]], TEAMS[s.teams[1]]];
    header(g, W, s.win === 0 ? (this.d.mode === 'drill' ? 'DRILL COMPLETE!' : 'VICTORY!') : s.win === 1 ? 'DEFEAT' : 'DRAW', this.d.mode === 'drill' ? '' : T[0].short + ' ' + s.score[0] + ' - ' + s.score[1] + ' ' + T[1].short);
    if (this.d.mode !== 'drill') { const tiles = [['TRIES', s.st[0].tries + ' - ' + s.st[1].tries], ['BIG HITS', s.st[0].bigHits + ' - ' + s.st[1].bigHits], ['METRES', Math.round(s.st[0].metres) + ' - ' + Math.round(s.st[1].metres)], ['POSSESSION', Math.round(100 * s.st[0].poss / Math.max(1, s.st[0].poss + s.st[1].poss)) + '%']];
      tiles.forEach(([k, v], i) => { const x = 14 + i * 100; E.ui.box(g, x, 48, 94, 50, { alpha: .88 }); E.font.text(g, k, x + 47, 54, '#a0a8d0', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, v, x + 47, 72, '#ffe070', { align: 'center', scale: 1.5, shadow: '#000', outline: false }); });
      if (s.potm !== null) E.font.text(g, 'PLAYER OF THE MATCH: ' + s.potmName.toUpperCase(), W / 2, 108, '#ffffff', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, '"' + (s.win === 0 ? 'Magnificent. Almost like it was planned.' : s.win === 1 ? 'We lost. The pies were good though.' : 'A draw. Rugby\'s way of shrugging.') + '" - BARRY & ROS', W / 2, 122, '#c0c8e8', { align: 'center', shadow: '#000', outline: false, font: 'tiny' }); }
    else E.font.text(g, DRILLS.find(d => d.id === this.d.drill).goal + ' — DONE', W / 2, 70, '#80ff80', { align: 'center', scale: 1.5, shadow: '#000', outline: false });
    if (this.entry) { E.ui.box(g, W / 2 - 100, 132, 200, 52, { alpha: .95, border: '#ffe070' }); E.font.text(g, 'NEW RECORD: ' + REC.cats.find(c => c[0] === this.entry[0])[1], W / 2, 136, '#ffe070', { align: 'center', font: 'tiny' }); for (let i = 0; i < 3; i++) { const x = W / 2 - 40 + i * 30; E.font.text(g, String.fromCharCode(65 + this.ini[i]), x + 6, 150, i === this.ii ? '#ffffff' : '#a0a8d0', { scale: 3 }); if (i === this.ii) { px.poly(g, [[x + 8, 146], [x + 16, 146], [x + 12, 142]], '#ffe070'); px.poly(g, [[x + 8, 176], [x + 16, 176], [x + 12, 180]], '#ffe070'); } } }
    else menuDraw(g, this.m, W, H, inp);
    footer(g, W, H, inp, this.entry ? '{x} SET LETTER  UP/DOWN CHANGE' : '{x} SELECT'); }); }
};
// ---------- about & credits
SCENES.about = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; this.off = 0; this.lines = buildAboutLines(); music('menu'); },
  update(dt) { UI.t += dt; const inp = TT.game.input; if (inp.down('down')) this.off += dt * 90; if (inp.down('up')) this.off -= dt * 90; this.off = clamp(this.off, 0, Math.max(0, this.lines.length * 9 - 150)); if (inp.pressed('cancel') || inp.pressed('ci')) TT.game.go('title'); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H; header(g, W, 'ABOUT & CREDITS'); E.ui.box(g, 8, 34, W - 16, H - 58, { alpha: .9 });
    this.lines.forEach((l, i) => { const y = 40 + i * 9 - this.off; if (y < 36 || y > H - 34) return; E.font.text(g, l.t, 14, y, l.h ? '#ffe070' : '#e0e4f4', { font: 'tiny' }); }); footer(g, W, H, inp, 'UP/DOWN SCROLL   {ci} BACK'); }); }
};
function buildAboutLines() {
  const out = []; const wrap = (t, h) => { for (const w of E.font.wrap(t, 400, { font: 'tiny' }).split ? E.font.wrap(t, 400, { font: 'tiny' }).split('\n') : [].concat(E.font.wrap(t, 400, { font: 'tiny' }))) out.push({ t: w, h }); };
  for (const [title, rows] of TT.about) { out.push({ t: title, h: true }); for (const r of rows) wrap(r, false); out.push({ t: ' ' }); }
  return out;
}
