/* SCREENS: title, main menu, join (1-4 players), team select (with each human's player), court and rules, the matchup
 * card (the cheat-code window), results (MVP, the Blam of the Game, the box score, initials for the Hall of Blam), Hall of
 * Blam, How to Play (3 pages), About/Credits (with the report pages). Every screen works with any one device alone. */
const MENU_BG = new E.Backdrop({ sky: ['#07051a', '#1e1040', '#4a1a5a'], moon: { x: .85, y: .16, r: 9 }, stars: 70, layers: [{ kind: 'city', color: '#2a1a48', y: .62, height: .4, parallax: .05, windows: '#ff7ad8' }, { kind: 'city', color: '#140c28', y: .76, height: .32, parallax: .15, windows: '#5ae8ff', seed: 6 }] });
function menuBackdrop(r, t) {
  game.focus(t * 20, 0, 0); MENU_BG.draw(r); L.enabled = false;
  r.overlay(g => { for (let k = 0; k < 6; k++) { const y = (k * 47 + t * 18) % (r.H + 40) - 20; px.blend(g, .08, 'add', () => px.rect(g, 0, Math.round(y), r.W, 6, k % 2 ? '#ff3ca6' : '#2de2ff')); } });
}
const menuScene = (o) => Object.assign({ view: 'side', input: KEYS, pausable: false, menuScreen: true, back() { if (this.onBack) { this.onBack(); return true; } return false; } }, o);
function anyPause() { return game.players.some(I => I.pressed('pause')); }
const players = () => game.players;

/* ---- TITLE ---- */
const TITLE = { t: 0, rigs: null };
function titleRigs() {
  if (TITLE.rigs) return TITLE.rigs;
  TITLE.rigs = [dressRig(get('player', 'volt'), 'hightops'), dressRig(get('player', 'riptide'), 'breakers'), dressRig(get('player', 'torque'), 'crushers'), dressRig(get('player', 'ember'), 'magma')];
  return TITLE.rigs;
}
SCENES.title = menuScene({
  enter() { S.scene = 'title'; TITLE.t = 0; music('title'); game.weather = null; idleReset(); },
  update(dt) {
    TITLE.t += dt;
    if (S.touchOnly) { const cl = game.input.clicked(); if (cl && TITLE.btn && hitBox(cl, TITLE.btn)) game.menu('settings'); return; }
    if (players().some(I => I.pressed('start') || I.pressed('confirm')) || game.input.clicked()) { players().forEach(I => I.consumeAll()); A.sfx('confirm'); go('menu'); }
    if (anyPause()) game.menu('settings');
    const rigs = titleRigs(), t = TITLE.t;
    rigs.forEach((rg, k) => { const u = (t * .5 + k * .25) % 1, jump = Math.max(0, Math.sin(u * TAU)) * 14 * (k % 2 ? 1 : .4); rg.bb.targets = k === 0 ? (u < .5 ? both([3, 0, 30 + jump], 2) : { R: [2, 3, 44], L: [3, -4, 18] }) : MOVES[['raiseRoof', 'chestPound', 'blowFingers', 'flex'][k]](t); rg.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, expr: 'smile' }); });
  },
  draw(r) {
    menuBackdrop(r, TITLE.t);
    r.overlay(g => {
      const t = TITLE.t, cy = Math.round(r.H * .3);
      logo(g, r.W / 2, cy - 20, Math.max(4, Math.floor(r.W / 90)), t);
      txt(g, 'NO FOULS. NO MERCY. ALL BLAM.', r.W / 2, cy + 30, UI.accent2, 1, 'center');
      // the four crews
      const rigs = titleRigs(), sp = Math.min(80, r.W / 5);
      rigs.forEach((rg, k) => { const x = r.W / 2 + (k - 1.5) * sp + (k > 1 ? 30 : -30), y = r.H - 16; rg.draw(g, Math.round(x), Math.round(y), E.charView(E.VIEWS.side)); });
      if (S.touchOnly) {
        txt(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H * .5, '#ffffff', tw('CONTROLLER OR KEYBOARD REQUIRED', 2) < r.W - 16 ? 2 : 1, 'center');
        const bw = 120, bx = Math.round(r.W / 2 - bw / 2), by = Math.round(r.H * .5 + 26); TITLE.btn = [bx, by, bw, 26];
        E.ui.box(g, bx, by, bw, 26, { bg: [UI.accent, E.shade(UI.accent, -.4)], border: '#ffffff' }); txt(g, 'SETTINGS', r.W / 2, by + 6, '#ffffff', 2, 'center');
      } else if (Math.floor(t * 2) % 2 === 0) promptLine(g, 'PRESS {confirm} TO START', r.W / 2, cy + 46, game.input, { align: 'center', scale: 1 });
      txt(g, 'BASKETBLAM ' + VERSION + '  -  ENGINE ' + E.versionLabel().replace(/·/g, '-'), 6, r.H - 10, '#6a5e8a', 1, 'left', { outline: false });
    });
  }
});
const hitBox = (p, b) => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3];

/* ---- MAIN MENU ---- */
const MAIN = new FocusList([
  { label: 'BLAM TOUR', id: 'tour', about: 'Four games, five courts, one Golden Blamboozle. Beat the street crews, then the robots.', onPick: () => go('tourstart') },
  { label: 'EXHIBITION', id: 'exhibition', about: 'Any teams, any court, one to four players on this machine.', onPick: () => go('join') },
  { label: 'BLAM CAMP', id: 'camp', about: 'Ten quick lessons with Dee Dee. Learn every move in five minutes.', onPick: () => go('camplist') },
  { label: 'HALL OF BLAM', id: 'hall', about: 'The best Tour scores and the records.', onPick: () => go('hall') },
  { label: 'HOW TO PLAY', id: 'howto', about: 'The controls, the rules, the courts and the power-ups.', onPick: () => go('howto', { back: 'menu' }) },
  { label: 'OPTIONS', id: 'options', about: 'Sound, voices, button symbols, camera, difficulty and more.', onPick: () => game.menu('settings') },
  { label: 'ABOUT', id: 'about', about: 'Credits, and how this game was made.', onPick: () => go('about') }
], { onBack: () => go('title') });
SCENES.menu = menuScene({
  enter() { S.scene = 'menu'; music('title'); idleReset(); },
  onBack() { go('title'); },
  update(dt) { MAIN.update(dt); if (anyPause()) game.menu('settings'); },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r), w = Math.min(190, r.W * .42), h = 22;
      logo(g, sf.x + w / 2, sf.y, 2, game.time);
      MAIN.draw(g, sf.x, sf.y + 30, w, h, { gap: 3, scale: 2 });
      // the preview panel
      const px0 = sf.x + w + 14, pw = sf.x + sf.w - px0, it = MAIN.cur;
      if (pw > 120) {
        panel(g, px0, sf.y + 30, pw, 7 * 25 - 3, it.label);
        E.font.wrap(it.about, pw - 20, { scale: 1 }).forEach((ln, i) => txt(g, ln, px0 + 10, sf.y + 54 + i * 10, UI.ink, 1));
        previewArt(g, it.id, px0 + pw / 2, sf.y + 30 + 7 * 25 - 30, pw);
      }
      promptBar(g, r, '{move} CHOOSE   {confirm} SELECT   {cancel} BACK');
    });
  }
});
function previewArt(g, id, cx, by, pw) {
  const t = game.time;
  if (id === 'tour') { const n = 4; for (let k = 0; k < n; k++) { const x = cx + (k - 1.5) * Math.min(34, pw / 6), won = S.progress && S.progress.tour && S.progress.tour.stop > k; px.disc(g, x, by - 10, 9, won ? UI.gold : '#3a2a5a'); txt(g, k < 3 ? String(k + 1) : 'F', x, by - 14, '#ffffff', 1, 'center'); if (k) px.line(g, x - Math.min(34, pw / 6) + 9, by - 10, x - 9, by - 10, '#6a5a8a', 1); } }
  else if (id === 'exhibition') { const a = titleRigs(); a[0].drawPortrait(g, cx - 50, by - 44, 40); a[2].drawPortrait(g, cx + 10, by - 44, 40); txt(g, 'VS', cx, by - 30, UI.gold, 2, 'center'); }
  else if (id === 'camp') npcRig('deedee').drawPortrait(g, cx - 20, by - 44, 40);
  else if (id === 'hall') E.font.title(g, '★', cx, by - 40, { scale: 4, colors: ['#fff6c0', '#ffd23a', '#c88a10'], align: 'center' });
  else if (id === 'about') npcRig('vinnie').drawPortrait(g, cx - 20, by - 44, 40);
  else if (id === 'options') { glyph(g, 'Pad9', cx - 20, by - 30, 2); }
  else if (id === 'howto') { glyph(g, 'Pad2', cx - 40, by - 30, 2); glyph(g, 'Pad0', cx - 12, by - 30, 2); glyph(g, 'Pad1', cx + 16, by - 30, 2); }
}

/* ---- JOIN (Exhibition): P1-P4 slide to HOME or AWAY, confirm to be ready; CPU fills the rest ---- */
const JOIN = { side: [], ready: [] };
SCENES.join = menuScene({
  enter() {
    S.scene = 'join'; idleReset(); music('menu');
    while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]);
    JOIN.side = [0]; JOIN.ready = [false];
    game.allowJoin({ max: 4, onJoin: (I, n) => { JOIN.side[n - 1] = (n - 1) % 2; JOIN.ready[n - 1] = false; I.glyphs = setting('symbols'); A.sfx('confirm'); } });
  },
  exit() { game.allowJoin(false); },
  onBack() { go('menu'); },
  update(dt) {
    const P0 = game.players;
    P0.forEach((I, k) => {
      if (I.pressed('left')) { JOIN.side[k] = 0; JOIN.ready[k] = false; A.sfx('select'); }
      if (I.pressed('right')) { JOIN.side[k] = 1; JOIN.ready[k] = false; A.sfx('select'); }
      if (I.pressed('confirm')) { if (JOIN.ready[k] && k === 0) startTeams(); else { JOIN.ready[k] = true; A.sfx('confirm'); } }
      if (I.pressed('cancel')) { if (k === 0) { if (JOIN.ready[0]) JOIN.ready[0] = false; else go('menu'); } else { game.removePlayer(I); JOIN.side.splice(k, 1); JOIN.ready.splice(k, 1); A.sfx('cancel'); } }
      if (I.pressed('start') && k === 0) startTeams();
    });
    const cl = game.input.clicked(); if (cl && JOIN.go && hitBox(cl, JOIN.go)) startTeams();
    // at most two humans a side
    for (const s of [0, 1]) { const on = JOIN.side.map((v, k) => v === s ? k : -1).filter(k => k >= 0); if (on.length > 2) JOIN.side[on[2]] = 1 - s; }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r); txt(g, 'EXHIBITION: WHO\'S PLAYING?', r.W / 2, sf.y, UI.gold, 2, 'center');
      const colW = Math.min(150, sf.w / 3); txt(g, 'HOME', r.W / 2 - colW, sf.y + 24, UI.accent, 2, 'center'); txt(g, 'AWAY', r.W / 2 + colW, sf.y + 24, UI.accent2, 2, 'center');
      for (let k = 0; k < 4; k++) {
        const I = game.players[k], y = sf.y + 48 + k * 26;
        if (!I) { txt(g, 'P' + (k + 1) + ': PRESS START (PAD) OR ' + (k === 1 ? '2 (KEYBOARD)' : 'START'), r.W / 2, y + 6, '#6a5e8a', 1, 'center'); continue; }
        const x = r.W / 2 + (JOIN.side[k] ? colW : -colW) - 50;
        E.ui.box(g, x, y, 100, 22, { bg: JOIN.ready[k] ? [I.color, E.shade(I.color, -.4)] : '#2a1e44', border: I.color });
        txt(g, 'P' + (k + 1) + (JOIN.ready[k] ? ' READY' : ''), x + 50, y + 4, '#ffffff', 2, 'center');
        txt(g, '←', x - 10, y + 6, UI.dim, 1); txt(g, '▸', x + 104, y + 6, UI.dim, 1);
      }
      const n = game.players.length;
      txt(g, 'CPU FILLS THE EMPTY SEATS.  ' + (n < 4 ? 'KEYBOARD P2: PRESS 2, THEN ARROWS + . / ,' : ''), r.W / 2, sf.y + 160, UI.dim, 1, 'center');
      const bw = 130, bx = Math.round(r.W / 2 - bw / 2), by = sf.y + 176; JOIN.go = [bx, by, bw, 22];
      E.ui.box(g, bx, by, bw, 22, { bg: JOIN.ready[0] ? [UI.accent, E.shade(UI.accent, -.4)] : '#2a1e44', border: '#ffffff' }); txt(g, 'CONTINUE', r.W / 2, by + 4, '#ffffff', 2, 'center');
      promptBar(g, r, '{move} SIDE   {confirm} READY   {confirm} AGAIN: CONTINUE   {cancel} BACK');
    });
  }
});
function startTeams() {
  const humans = game.players.map((I, k) => ({ input: I, side: JOIN.side[k] || 0 }));
  S.setup = { mode: 'exhibition', humans, teams: ['hightops', 'breakers'], pick: [0, 0], court: null };
  A.sfx('confirm'); go('teams');
}

/* ---- TEAM SELECT: a card per side; left/right cycles the team, up/down picks the human's player ---- */
const unlocked = id => !get('team', id).locked || (S.progress && S.progress.unlocked && S.progress.unlocked.teams) || DEV.unlockAll;
function teamList() { return all('team').filter(t => !t.hidden && unlocked(t.id)).map(t => t.id); }
const TS = { side: 0, locked: [false, false] };
SCENES.teams = menuScene({
  enter() { S.scene = 'teams'; idleReset(); TS.locked = [false, false]; TS.side = 0; if (S.setup.mode === 'tour') TS.locked[1] = true; },
  onBack() { go(S.setup.mode === 'tour' ? 'menu' : 'join'); },
  update(dt) {
    const st = S.setup, list = teamList();
    for (const side of [0, 1]) {
      if (TS.locked[side]) continue;
      const ctl = st.humans.filter(h => h.side === side).map(h => h.input), inputs = ctl.length ? ctl : (side === TS.side ? [game.input] : []);
      for (const I of inputs) {
        if (I.pressed('left') || I.pressed('right')) { const k = list.indexOf(st.teams[side]); let n = (k + (I.pressed('left') ? -1 : 1) + list.length) % list.length; if (list[n] === st.teams[1 - side] && st.mode !== 'exhibition') n = (n + 1) % list.length; st.teams[side] = list[n]; st.pick[side] = 0; A.sfx('select'); }
        if (I.pressed('up') || I.pressed('down')) { st.pick[side] = (st.pick[side] + (I.pressed('up') ? 2 : 1)) % 3; A.sfx('select'); }
        if (I.pressed('confirm')) { TS.locked[side] = true; A.sfx('confirm'); if (!ctl.length) TS.side = 1 - side; }
        if (I.pressed('cancel')) { A.sfx('cancel'); if (side === 1 && !ctl.length && TS.locked[0] && st.mode === 'exhibition') { TS.locked[0] = false; TS.side = 0; } else go(st.mode === 'tour' ? 'menu' : 'join'); return; }
      }
      // the mouse: click a side's arrows, or its card to lock it
      const cl = game.input.clicked(); if (cl && TS.boxes) { const b = TS.boxes[side]; if (b) { if (hitBox(cl, b.l)) { const k = list.indexOf(st.teams[side]); st.teams[side] = list[(k - 1 + list.length) % list.length]; A.sfx('select'); } else if (hitBox(cl, b.r)) { const k = list.indexOf(st.teams[side]); st.teams[side] = list[(k + 1) % list.length]; A.sfx('select'); } else if (hitBox(cl, b.card)) { TS.locked[side] = true; A.sfx('confirm'); } } }
    }
    if (TS.locked[0] && TS.locked[1]) { if (st.mode === 'tour') return tourBegin(); go('courtsel'); }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const st = S.setup, sf = safe(r), cw = Math.min(200, (sf.w - 16) / 2);
      txt(g, st.mode === 'tour' ? 'BLAM TOUR: PICK YOUR CREW' : 'PICK YOUR TEAMS', r.W / 2, sf.y, UI.gold, 2, 'center');
      TS.boxes = [];
      for (const side of [0, 1]) {
        if (st.mode === 'tour' && side === 1) continue;
        const x = st.mode === 'tour' ? Math.round(r.W / 2 - cw / 2) : side ? r.W / 2 + 8 : r.W / 2 - 8 - cw, y = sf.y + 22, h = sf.h - 50, tm = get('team', st.teams[side]);
        const humans = st.humans.filter(hh => hh.side === side);
        E.ui.box(g, x, y, cw, h, { bg: [E.shade(tm.jersey, -.3), E.shade(tm.jersey, -.7)], border: TS.locked[side] ? '#ffffff' : tm.trim });
        TS.boxes[side] = { l: [x, y, 20, 30], r: [x + cw - 20, y, 20, 30], card: [x + 20, y + 30, cw - 40, h - 30] };
        txt(g, '←', x + 6, y + 6, '#ffffff', 2); txt(g, '▸', x + cw - 16, y + 6, '#ffffff', 2);
        txt(g, side ? 'AWAY' : 'HOME', x + cw / 2, y + 4, '#ffffff', 1, 'center');
        txt(g, tm.short, x + cw / 2, y + 14, '#ffffff', 2, 'center');
        txt(g, tm.style.toUpperCase(), x + cw / 2, y + 32, tm.trim, 1, 'center');
        const ps = tm.players.map(id => get('player', id));
        ps.forEach((p, k) => {
          const py = y + 46 + k * Math.min(56, (h - 70) / 3), chosen = humans.length && st.pick[side] === k;
          if (chosen) E.ui.box(g, x + 4, py - 2, cw - 8, 52, { bg: '#ffffff22', border: humans[0].input.color });
          npcRig(p.id).drawPortrait(g, x + 8, py, 24);
          txt(g, p.name, x + 36, py, '#ffffff', 1); txt(g, p.role, x + 36, py + 9, UI.dim, 1);
          RATINGS.forEach((rk, i) => { const cx2 = x + 36 + (i % 4) * Math.floor((cw - 44) / 4), cy2 = py + 20 + Math.floor(i / 4) * 12; txt(g, RATING_NAMES[rk].slice(0, 4), cx2, cy2, UI.dim, 1, 'left', { font: undefined }); for (let q = 0; q < 10; q += 2) px.rect(g, cx2 + q * 1.4, cy2 + 8, 2, 2, q < p.ratings[rk] ? tm.trim : '#2a2440'); });
          if (chosen) txt(g, humans.map(hh => 'P' + hh.input.player).join(' '), x + cw - 8, py, humans[0].input.color, 1, 'right');
        });
        if (TS.locked[side]) txt(g, 'LOCKED IN', x + cw / 2, y + h - 14, UI.good, 1, 'center');
        else if (!humans.length && side !== TS.side) txt(g, 'CPU', x + cw / 2, y + h - 14, UI.dim, 1, 'center');
      }
      promptBar(g, r, '{move} TEAM / PLAYER   {confirm} LOCK IN   {cancel} BACK');
    });
  }
});

/* ---- COURT & RULES ---- */
const CS = { i: 0, row: 0 };
const courtUnlocked = id => id !== 'dome' || (S.progress && S.progress.unlocked && S.progress.unlocked.teams) || DEV.unlockAll || S.setup.teams.includes('blambots') || S.setup.teams.includes('allstars');
const RULE_ROWS = [
  { label: 'QUARTER', key: 'quarter', vals: [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00']] },
  { label: 'CPU', key: 'difficulty', vals: [['rookie', 'ROOKIE'], ['pro', 'PRO'], ['allstar', 'ALL-STAR'], ['blam', 'BLAM']] },
  { label: 'POWER-UPS', key: 'powerups', vals: [[true, 'ON'], [false, 'OFF']] },
  { label: 'TWISTS', key: 'twists', vals: [[true, 'ON'], [false, 'OFF']] }
];
SCENES.courtsel = menuScene({
  enter() { S.scene = 'courtsel'; idleReset(); CS.row = 0; const home = get('team', S.setup.teams[0]).court; CS.i = Math.max(0, COURTS.indexOf(home)); if (!courtUnlocked(COURTS[CS.i])) CS.i = 0; },
  onBack() { go('teams'); },
  update(dt) {
    const rows = 1 + RULE_ROWS.length + 1;
    for (const I of game.players) {
      if (I.repeat('up', .35, .12)) { CS.row = (CS.row + rows - 1) % rows; A.sfx('select'); }
      if (I.repeat('down', .35, .12)) { CS.row = (CS.row + 1) % rows; A.sfx('select'); }
      const d = I.repeat('left', .35, .15) ? -1 : I.repeat('right', .35, .15) ? 1 : 0;
      if (d) { A.sfx('select'); if (CS.row === 0) { do { CS.i = (CS.i + d + COURTS.length) % COURTS.length; } while (!courtUnlocked(COURTS[CS.i])); } else if (CS.row <= RULE_ROWS.length) cycleRule(RULE_ROWS[CS.row - 1], d); }
      if (I.pressed('confirm') || I.pressed('start')) { if (CS.row === rows - 1 || I.pressed('start') || CS.row === 0) { A.sfx('confirm'); return beginExhibition(); } else cycleRule(RULE_ROWS[CS.row - 1], 1); }
      if (I.pressed('cancel')) { A.sfx('cancel'); return go('teams'); }
    }
    const ptr = game.input.pointer(), cl = game.input.clicked();
    if (CS.boxes) { if (ptr) CS.boxes.forEach((b, k) => { if (b && hitBox(ptr, b.box) && CS.row !== b.row) { CS.row = b.row; } }); if (cl) for (const b of CS.boxes) if (b && hitBox(cl, b.box)) { if (b.court !== undefined) { if (courtUnlocked(COURTS[b.court])) CS.i = b.court; } else if (b.row <= RULE_ROWS.length && b.row > 0) cycleRule(RULE_ROWS[b.row - 1], 1); else if (b.row === rows - 1) beginExhibition(); A.sfx('select'); } }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r); txt(g, 'COURT AND RULES', r.W / 2, sf.y, UI.gold, 2, 'center');
      CS.boxes = [];
      const cw = Math.min(76, (sf.w - 20) / 5);
      COURTS.forEach((id, k) => {
        const c = get('court', id), x = Math.round(r.W / 2 + (k - 2.5) * (cw + 4)), y = sf.y + 22, sel = k === CS.i, lock = !courtUnlocked(id);
        E.ui.box(g, x, y, cw, 54, { bg: lock ? '#120c1c' : [c.sky.sky[1], c.sky.sky[2]], border: sel ? '#ffffff' : (CS.row === 0 ? UI.line : '#2a2040') });
        const fl = c.base; px.rect(g, x + 3, y + 30, cw - 6, 20, 'rgb(' + fl.map(Math.round).join(',') + ')'); px.rect(g, x + 3, y + 39, cw - 6, 1, c.line);
        txt(g, lock ? 'LOCKED' : c.name.replace('THE ', ''), x + cw / 2, y + 4, lock ? '#5a4e70' : '#ffffff', 1, 'center');
        if (sel) txt(g, '↓', x + cw / 2, y - 9, '#ffffff', 1, 'center');
        CS.boxes.push({ box: [x, y, cw, 54], row: 0, court: k });
      });
      const c = get('court', COURTS[CS.i]);
      txt(g, c.place.toUpperCase() + '  -  TWIST: ' + { jackpot: 'THE JACKPOT SPOT', wind: 'SEA BREEZE', oil: 'OIL SLICKS', eruption: 'ERUPTIONS AND STEAM VENTS', boss: 'THE BOSS' }[c.twist], r.W / 2, sf.y + 82, UI.dim, 1, 'center');
      RULE_ROWS.forEach((row, k) => {
        const y = sf.y + 98 + k * 20, sel = CS.row === k + 1, v = row.vals.find(x => x[0] === setting(row.key)) || row.vals[0], w = 220, x = Math.round(r.W / 2 - w / 2);
        E.ui.box(g, x, y, w, 17, { bg: sel ? [UI.accent, E.shade(UI.accent, -.4)] : '#2a1e44', border: sel ? '#ffffff' : UI.line });
        txt(g, (sel ? '▸ ' : '') + row.label, x + 6, y + 4, '#ffffff', 1); txt(g, '← ' + v[1] + ' →', x + w - 6, y + 4, UI.gold, 1, 'right');
        CS.boxes.push({ box: [x, y, w, 17], row: k + 1 });
      });
      const y = sf.y + 98 + RULE_ROWS.length * 20 + 4, w = 160, x = Math.round(r.W / 2 - w / 2), sel = CS.row === RULE_ROWS.length + 1;
      E.ui.box(g, x, y, w, 22, { bg: sel ? [UI.good, E.shade(UI.good, -.5)] : '#2a1e44', border: '#ffffff' }); txt(g, 'TIP IT OFF!', r.W / 2, y + 4, '#ffffff', 2, 'center');
      CS.boxes.push({ box: [x, y, w, 22], row: RULE_ROWS.length + 1 });
      promptBar(g, r, '{move} CHOOSE   {confirm} START   {cancel} BACK');
    });
  }
});
function cycleRule(row, d) { const k = row.vals.findIndex(x => x[0] === setting(row.key)); game.settings.set(row.key, row.vals[(k + d + row.vals.length) % row.vals.length][0]); }
function beginExhibition() {
  const st = S.setup; st.court = COURTS[CS.i];
  go('matchup', { cfg: buildCfg(st) });
}
/** a match config from a setup: humans to slots; each human's chosen player starts */
function buildCfg(st, extra = {}) {
  const teams = st.teams.map((id, side) => {
    const tm = get('team', id), lineup = tm.players.slice(), first = lineup[st.pick[side] || 0];
    const humans = st.humans.filter(h => h.side === side);
    const starters = humans.length ? [first, ...lineup.filter(x => x !== first)].slice(0, 2) : lineup.slice(0, 2);
    return { id, lineup, starters };
  });
  const humans = [];
  for (const side of [0, 1]) st.humans.filter(h => h.side === side).forEach((h, k) => humans.push({ input: h.input, slot: side * 2 + k }));
  return Object.assign({ court: st.court, mode: st.mode, teams, humans, quarter: setting('quarter'), difficulty: setting('difficulty'), powerups: setting('powerups'), twists: setting('twists') }, extra);
}

/* ---- THE MATCHUP CARD: the starters face off; the cheat-code window ---- */
const MU = { t: 0, cfg: null, codes: [] };
SCENES.matchup = menuScene({
  enter(d) { S.scene = 'matchup'; MU.t = 0; MU.cfg = d.cfg; MU.codes = []; MU.cfg.cheats = MU.cfg.cheats || {}; music('menu'); idleReset(); },
  onBack() { if (MU.cfg.mode === 'tour') go('tourmap'); else go('courtsel'); },
  update(dt) {
    MU.t += dt;
    for (const I of game.players) for (const c of all('code')) if (I.sequence(c.steps, { window: 1.2 })) {
      if (MU.cfg.cheats[c.id]) continue; MU.cfg.cheats[c.id] = true; MU.codes.push(c.name); A.sfx('code_ok'); MU.t = Math.min(MU.t, 2);
      if (c.id === 'turbo') { const h = MU.cfg.humans.find(hh => hh.input === I); MU.cfg.cheats['turbo' + (h ? Math.floor(h.slot / 2) : 0)] = true; }
      if (c.id === 'tournament') { MU.cfg.cheats = { tournament: true }; MU.codes = ['TOURNAMENT MODE']; }
    }
    const skip = game.players.some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked();
    if (MU.t > 7 || (skip && MU.t > .5)) { game.players.forEach(I => I.consumeAll()); const cfg = MU.cfg; cfg.starred = Object.keys(cfg.cheats).some(k => k !== 'tournament'); go('match', cfg); }
    if (game.players.some(I => I.pressed('cancel'))) this.onBack();
  },
  draw(r) {
    const cfg = MU.cfg, court = get('court', cfg.court);
    backdropOf(cfg.court).draw(r); game.focus(XM, 0, 0); L.enabled = false;
    r.overlay(g => {
      const sf = safe(r);
      E.font.title(g, "TONIGHT'S MATCHUP", r.W / 2, sf.y, { scale: 2, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 2, align: 'center' });
      txt(g, court.name + '  -  ' + court.place.toUpperCase(), r.W / 2, sf.y + 22, UI.ink, 1, 'center');
      cfg.teams.forEach((t, side) => {
        const tm = get('team', t.id), x = side ? r.W / 2 + 14 : r.W / 2 - 14, al = side ? 'left' : 'right', slide = Math.min(1, MU.t * 3), ox = (1 - slide) * (side ? 200 : -200);
        txt(g, tm.name, x + ox, sf.y + 40, tm.jersey, 1, al);
        t.starters.forEach((id, k) => { const p = get('player', id), px1 = side ? x + ox : x + ox - 60, py = sf.y + 54 + k * 66; npcRig(id).drawPortrait(g, Math.round(px1), py, 60, { turn: side ? -.5 : .5 }); txt(g, p.name, side ? px1 + 64 : px1 - 4, py + 8, '#ffffff', 1, side ? 'left' : 'right'); txt(g, p.role, side ? px1 + 64 : px1 - 4, py + 18, UI.dim, 1, side ? 'left' : 'right'); const h = cfg.humans.find(hh => hh.slot === side * 2 + k); if (h) txt(g, h.input.name, side ? px1 + 64 : px1 - 4, py + 28, h.input.color, 1, side ? 'left' : 'right'); });
      });
      E.font.title(g, 'VS', r.W / 2, sf.y + 90, { scale: 3, colors: ['#ffffff', '#ffd23a', '#ff3a1a'], depth: 2, align: 'center' });
      MU.codes.forEach((c, i) => txt(g, c + ': ON', r.W / 2, sf.y + 130 + i * 10, UI.good, 1, 'center'));
      if (cfg.stopLabel) txt(g, cfg.stopLabel, r.W / 2, sf.y + 32, UI.gold, 1, 'center');
      txt(g, 'TIP-OFF IN ' + Math.max(0, Math.ceil(7 - MU.t)), r.W / 2, r.H - 34, UI.dim, 1, 'center');
      promptBar(g, r, '{confirm} TIP IT OFF   ENTER CODES NOW...');
    });
  }
});

/* ---- RESULTS ---- */
const RS = { page: 0, list: null, initials: null };
function mvpOf() { return S.players.slice().sort((a, b) => (b.stats.PTS + b.stats.BLK * 2 + b.stats.STL * 2 + b.stats.DNK) - (a.stats.PTS + a.stats.BLK * 2 + a.stats.STL * 2 + a.stats.DNK))[0]; }
SCENES.results = menuScene({
  enter(d) {
    S.scene = 'results'; RS.page = 0; const m = S.match, cfg = (d && d.cfg) || m.cfg; RS.cfg = cfg;
    const humanTeam = (cfg.humans[0] && Math.floor(cfg.humans[0].slot / 2)), won = m.winner === humanTeam;
    sting(won || humanTeam === undefined ? 'victory' : 'defeat'); music('menu');
    const items = [];
    if (cfg.mode === 'tour') items.push({ label: won ? 'CONTINUE' : 'REMATCH', onPick: () => tourAfterMatch(won) });
    else { items.push({ label: 'REMATCH', onPick: () => go('matchup', { cfg: Object.assign({}, cfg, { seed: undefined, cheats: {} }) }) }); items.push({ label: 'NEW TEAMS', onPick: () => { S.setup.humans = cfg.humans.map(h => ({ input: h.input, side: Math.floor(h.slot / 2) })); go('teams'); } }); }
    if (cfg.mode === 'tour' && !won) items.push({ label: 'QUIT TOUR', onPick: () => tourQuit() });
    items.push({ label: 'MAIN MENU', onPick: () => go('menu') });
    RS.list = new FocusList(items, { horizontal: true, onBack: () => {} });
    recordGame(m, cfg);
  },
  update(dt) {
    if (RS.initials) return initialsStep();
    for (const I of game.players) if (I.pressed('oop')) { RS.page = 1 - RS.page; A.sfx('select'); }
    RS.list.update(dt);
  },
  draw(r) {
    menuBackdrop(r, game.time);
    const m = S.match;
    r.overlay(g => {
      const sf = safe(r), mvp = mvpOf();
      E.font.title(g, 'FINAL', r.W / 2, sf.y, { scale: 3, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 2, align: 'center' });
      txt(g, teamName(0) + '  ' + m.score[0] + '   -   ' + m.score[1] + '  ' + teamName(1), r.W / 2, sf.y + 30, '#ffffff', 2, 'center');
      if (RS.cfg.starred) txt(g, '★ CHEATS USED: NO HALL OF BLAM', r.W / 2, sf.y + 48, UI.gold, 1, 'center');
      if (RS.page === 0) {
        npcRig(mvp.id).drawPortrait(g, Math.round(r.W / 2 - 110), sf.y + 60, 56);
        txt(g, 'MVP: ' + mvp.name, r.W / 2 - 46, sf.y + 64, UI.gold, 2);
        txt(g, mvp.stats.PTS + ' PTS  ' + mvp.stats.DNK + ' DUNKS  ' + mvp.stats.BLK + ' BLK  ' + mvp.stats.STL + ' STL', r.W / 2 - 46, sf.y + 84, '#ffffff', 1);
        const best = m.plays.slice().sort((a, b) => b.v - a.v)[0];
        txt(g, 'BLAM OF THE GAME: ' + (best ? best.name + ' - ' + best.what.toUpperCase() + ' (' + best.v + ')' : 'NOBODY. AWKWARD.'), r.W / 2, sf.y + 126, UI.accent2, 1, 'center');
        txt(g, 'STYLE POINTS  ' + m.style[0] + '  -  ' + m.style[1], r.W / 2, sf.y + 140, UI.dim, 1, 'center');
      } else {
        const cols = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'DNK'], x0 = Math.round(r.W / 2 - 140);
        cols.forEach((c, k) => txt(g, c, x0 + 120 + k * 28, sf.y + 60, UI.gold, 1, 'center'));
        S.players.forEach((p, i) => { const y = sf.y + 74 + i * 14; txt(g, p.name, x0, y, p.team ? UI.accent2 : UI.accent, 1); cols.forEach((c, k) => txt(g, p.stats[c], x0 + 120 + k * 28, y, '#ffffff', 1, 'center')); });
      }
      const w = Math.min(110, (sf.w - 20) / RS.list.items.length); RS.list.draw(g, Math.round(r.W / 2 - (w + 4) * RS.list.items.length / 2), r.H - 56, w, 20, { scale: 1, center: true });
      if (RS.initials) drawInitials(g, r);
      promptBar(g, r, '{move} CHOOSE   {confirm} SELECT   {oop} BOX SCORE');
    });
  }
});
/** records and the Hall of Blam entry */
function recordGame(m, cfg) {
  const prog = S.progress, rec = prog.records;
  for (const p of S.players) if (p.human && p.stats.PTS > (rec.mostPoints || 0) && !cfg.starred) { rec.mostPoints = p.stats.PTS; rec.mostPointsBy = p.name; }
  const best = m.plays.filter(x => x.what === 'dunk' || x.what === 'shatter' || x.what === 'alley-oop').sort((a, b) => b.v - a.v)[0];
  if (best && best.v > (rec.bestDunk || 0) && !cfg.starred) { rec.bestDunk = best.v; rec.bestDunkBy = best.name; }
  saveProgress();
}
const hallList = () => store.get('bb:hall', [{ i: 'VNX', team: 'ALL-STARS', score: 9000 }, { i: 'DDD', team: 'ALL-STARS', score: 7000 }, { i: 'GGW', team: 'BLAMBOTS', score: 5000 }, { i: 'RSC', team: 'HIGHTOPS', score: 3000 }, { i: 'BLM', team: 'MAGMA', score: 1500 }]);
function qualifies(score) { const l = hallList(); return l.length < 10 || score > l[l.length - 1].score; }
function startInitials(score, team, onDone) { RS.initials = { score, team, letters: [0, 0, 0], k: 0, onDone }; }
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ★';
function initialsStep() {
  const S0 = RS.initials;
  for (const I of game.players) {
    if (I.repeat('up', .3, .1)) { S0.letters[S0.k] = (S0.letters[S0.k] + 1) % ABC.length; A.sfx('select'); }
    if (I.repeat('down', .3, .1)) { S0.letters[S0.k] = (S0.letters[S0.k] + ABC.length - 1) % ABC.length; A.sfx('select'); }
    if (I.pressed('left')) S0.k = Math.max(0, S0.k - 1); if (I.pressed('right')) S0.k = Math.min(2, S0.k + 1);
    if (I.pressed('confirm')) { if (S0.k < 2) { S0.k++; A.sfx('confirm'); } else { const l = hallList(); l.push({ i: S0.letters.map(k => ABC[k]).join(''), team: S0.team, score: S0.score }); l.sort((a, b) => b.score - a.score); store.set('bb:hall', l.slice(0, 10)); RS.initials = null; A.sfx('code_ok'); if (S0.onDone) S0.onDone(); emit('hallEntry', {}); } }
  }
}
function drawInitials(g, r) {
  const S0 = RS.initials, w = 220, h = 90, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2);
  panel(g, x, y, w, h, 'NEW HALL OF BLAM SCORE!');
  txt(g, String(S0.score), r.W / 2, y + 24, '#ffffff', 2, 'center');
  S0.letters.forEach((k, i) => { const lx = r.W / 2 + (i - 1) * 26; txt(g, ABC[k], lx, y + 48, i === S0.k ? UI.gold : '#ffffff', 3, 'center'); if (i === S0.k) txt(g, '↑', lx, y + 72, UI.gold, 1, 'center'); });
  promptLine(g, '{move} LETTERS   {confirm} NEXT', r.W / 2, y + h + 6, game.input, { align: 'center' });
}

/* ---- HALL OF BLAM ---- */
SCENES.hall = menuScene({
  enter() { S.scene = 'hall'; idleReset(); music('menu'); },
  onBack() { go('menu'); },
  update() { if (game.players.some(I => I.pressed('cancel') || I.pressed('confirm')) || game.input.clicked()) { A.sfx('cancel'); go('menu'); } },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => drawHall(g, r));
    r.overlay(g => promptBar(g, r, '{cancel} BACK'));
  }
});
function drawHall(g, r) {
  const sf = safe(r), l = hallList(), rec = S.progress.records;
  E.font.title(g, 'HALL OF BLAM', r.W / 2, sf.y, { scale: 3, colors: ['#fff6c0', '#ffd23a', '#c88a10'], depth: 2, align: 'center' });
  l.slice(0, 10).forEach((e, k) => { const y = sf.y + 34 + k * 13; txt(g, (k + 1) + '.', r.W / 2 - 110, y, UI.dim, 1, 'right'); txt(g, e.i, r.W / 2 - 100, y, k ? '#ffffff' : UI.gold, 1); txt(g, e.team, r.W / 2 - 60, y, UI.dim, 1); txt(g, e.score, r.W / 2 + 110, y, '#ffffff', 1, 'right'); });
  const y = sf.y + 34 + 10 * 13 + 6;
  txt(g, 'MOST POINTS IN A GAME: ' + (rec.mostPoints ? rec.mostPoints + ' (' + rec.mostPointsBy + ')' : '--'), r.W / 2, y, UI.accent2, 1, 'center');
  txt(g, 'BEST DUNK: ' + (rec.bestDunk ? rec.bestDunk + ' STYLE (' + rec.bestDunkBy + ')' : '--') + '   TOURS WON: ' + (rec.toursWon || 0), r.W / 2, y + 11, UI.accent2, 1, 'center');
}

/* ---- HOW TO PLAY (3 pages, following the last device) ---- */
const HT = { page: 0, back: 'menu' };
SCENES.howto = menuScene({
  enter(d) { S.scene = 'howto'; HT.page = 0; HT.back = (d && d.back) || 'menu'; idleReset(); },
  onBack() { leaveHowto(); },
  update() {
    for (const I of game.players) { if (I.pressed('right') || I.pressed('confirm')) { if (HT.page < 2) { HT.page++; A.sfx('select'); } else if (I.pressed('confirm')) leaveHowto(); } if (I.pressed('left')) { HT.page = Math.max(0, HT.page - 1); A.sfx('select'); } if (I.pressed('cancel')) leaveHowto(); }
    const cl = game.input.clicked(); if (cl) { if (cl[0] > game.W / 2) { if (HT.page < 2) HT.page++; else leaveHowto(); } else HT.page = Math.max(0, HT.page - 1); }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r), I = game.input;
      txt(g, ['THE CONTROLS', 'THE RULES', 'COURTS AND POWER-UPS'][HT.page] + '  (' + (HT.page + 1) + '/3)', r.W / 2, sf.y, UI.gold, 2, 'center');
      if (HT.page === 0) {
        const rows = [['move', 'RUN (DRIBBLES WITH THE BALL)'], ['turbo', 'TURBO: FASTER, HIGHER. NEEDED TO DUNK'], ['shoot', 'HOLD TO JUMP, RELEASE AT THE TOP TO SHOOT'], ['shoot', 'WITH TURBO NEAR THE RIM: DUNK!   ON DEFENSE: BLOCK'], ['pass', 'PASS   ON DEFENSE: STEAL'], ['shove', 'SPIN MOVE   ON DEFENSE: SHOVE (IT\'S LEGAL!)'], ['oop', 'ALLEY-OOP TO A CUTTING TEAMMATE / CALL FOR IT'], ['taunt', 'TAUNT'], ['pause', 'PAUSE (DEV MODE IS IN THERE)']];
        rows.forEach(([a, t2], k) => { const y = sf.y + 26 + k * 19; actionGlyph(g, a, r.W / 2 - 150, y - 2, I, 1); txt(g, t2, r.W / 2 - 110, y, '#ffffff', 1); });
        txt(g, 'A CPU TEAMMATE WITH THE BALL: {pass} = PASS IT TO ME, {shoot} = SHOOT, {oop} = THROW THE OOP'.replace(/\{[a-z]+\}/g, ''), r.W / 2, sf.y + 26 + 9 * 19, UI.dim, 1, 'center');
      } else if (HT.page === 1) {
        ['2 ON 2, FULL COURT, FOUR QUARTERS.', 'NO FOULS. SHOVES, STEALS AND BODY CONTACT ARE LEGAL.', 'NO TRAVELING, NO BACKCOURT, NO OUT OF BOUNDS: THE CROWD THROWS IT BACK.', 'TWO POINTS, THREE FROM BEYOND THE ARC. DUNKS ARE TWO.', '20-SECOND SHOT CLOCK. IT RESETS WHEN A SHOT HITS THE RIM.', 'GOALTENDING (TOUCHING A SHOT ON ITS WAY DOWN) COUNTS FOR THE SHOOTER.', 'RELEASE AT THE TOP OF THE JUMP FOR A PERFECT SHOT.', 'SCORE THREE IN A ROW: SUPERNOVA! UNLIMITED TURBO, HOT SHOTS,', 'BIGGER DUNKS, AND THE GLASS MAY SHATTER.', 'TIED AFTER FOUR? OVERTIME. TWICE TIED? SUDDEN BLAM: NEXT BUCKET WINS.']
          .forEach((ln, k) => txt(g, ln, r.W / 2, sf.y + 28 + k * 14, k === 7 || k === 8 ? UI.gold : '#ffffff', 1, 'center'));
      } else {
        COURTS.forEach((id, k) => { const c = get('court', id); txt(g, c.name + ': ' + { jackpot: 'THE JACKPOT SPOT (+2 FOR A MADE JUMPER IN THE RING)', wind: 'SEA BREEZE (GUSTS BEND SHOTS)', oil: 'OIL SLICKS (SLIDE AND SLIP)', eruption: 'LAVA BOMBS AND STEAM VENTS (VOLCANO LAUNCH!)', boss: 'THE BLAMBOTS OVERCLOCK. KNOCK ONE DOWN TWICE: REBOOT' }[c.twist], sf.x + 6, sf.y + 28 + k * 12, '#ffffff', 1); });
        POWERUPS.forEach((id, k) => { const d = get('powerup', id), y = sf.y + 96 + k * 14; puIcon(g, id, sf.x + 14, y + 3); txt(g, d.name + ': ' + d.help.toUpperCase(), sf.x + 26, y, '#ffffff', 1); });
      }
      promptBar(g, r, '{move} PAGE   {confirm} NEXT   {cancel} BACK');
    });
  }
});
function leaveHowto() { A.sfx('cancel'); go(HT.back || 'menu'); }
/** How to Play inside the pause menu (the engine's help screen): the keys or buttons of the device used last */
function helpSpec() {
  const I = game.input, L0 = a => I.label(a) || a;
  return { title: 'How to Play', keys: [[I.lastDevice === 'gamepad' ? 'Left stick' : 'WASD', 'Run (dribble with the ball)'], [L0('turbo'), 'Turbo: faster, higher; needed to dunk'], [L0('shoot'), 'Hold to jump, release at the top to shoot. With turbo near the rim: DUNK. On defense: block'],
    [L0('pass'), 'Pass. On defense: steal'], [L0('shove'), 'Spin move. On defense: shove (legal!)'], [L0('oop'), 'Alley-oop to a cutting teammate, or call for it'], [L0('taunt'), 'Taunt']],
    sections: [['Rules', 'No fouls. 2 or 3 points; dunks 2. 20-second shot clock. Goaltending counts for the shooter. Three straight baskets: SUPERNOVA.']] };
}

/* ---- ABOUT / CREDITS (one topic a page) ---- */
const AB = { page: 0, scroll: 0 };
function aboutPages() {
  const pages = [['CREDITS', CREDITS.map(([a, b]) => a + ': ' + b)]];
  for (const [title, lines] of REPORT) pages.push([title, lines]);
  if ((S.progress.unlocked && S.progress.unlocked.secrets) || DEV.unlockAll) pages.push(['SECRETS', ['CHEAT CODES (ENTER ON THE MATCHUP CARD):', ...all('code').map(c => c.name + ': ' + c.steps.map(s => s.toUpperCase()).join(', '))]]);
  return pages;
}
SCENES.about = menuScene({
  enter(d) { S.scene = 'about'; AB.page = (d && d.page) || 0; AB.scroll = 0; idleReset(); },
  onBack() { go('menu'); },
  update(dt) {
    const n = aboutPages().length;
    for (const I of game.players) {
      if (I.pressed('right') || I.pressed('oop')) { AB.page = (AB.page + 1) % n; AB.scroll = 0; A.sfx('select'); }
      if (I.pressed('left')) { AB.page = (AB.page + n - 1) % n; AB.scroll = 0; A.sfx('select'); }
      if (I.down('down')) AB.scroll += dt * 60; if (I.down('up')) AB.scroll = Math.max(0, AB.scroll - dt * 60);
      if (I.pressed('cancel')) { A.sfx('cancel'); go('menu'); }
    }
    const cl = game.input.clicked(); if (cl) { AB.page = (AB.page + (cl[0] > game.W / 2 ? 1 : n - 1)) % n; AB.scroll = 0; }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r), pages = aboutPages(), [title, lines] = pages[AB.page % pages.length];
      txt(g, title + '  (' + (AB.page % pages.length + 1) + '/' + pages.length + ')', r.W / 2, sf.y, UI.gold, 2, 'center');
      panel(g, sf.x, sf.y + 20, sf.w, sf.h - 44);
      const out = []; for (const ln of lines) for (const w of E.font.wrap(ln, sf.w - 24, {})) out.push(w);
      const maxRows = Math.floor((sf.h - 56) / 10), off = Math.min(Math.floor(AB.scroll / 10), Math.max(0, out.length - maxRows));
      out.slice(off, off + maxRows).forEach((ln, i) => txt(g, ln, sf.x + 12, sf.y + 28 + i * 10, '#ffffff', 1, 'left', { outline: false }));
      if (out.length > maxRows) txt(g, '↓ MORE', sf.x + sf.w - 10, sf.y + sf.h - 34, UI.dim, 1, 'right');
      promptBar(g, r, '{move} PAGE / SCROLL   {cancel} BACK');
    });
  }
});
