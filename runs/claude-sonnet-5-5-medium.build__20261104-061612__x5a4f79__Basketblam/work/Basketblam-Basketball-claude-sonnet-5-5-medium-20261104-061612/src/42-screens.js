/* BASKETBLAM - menu screens: title, exhibition setup, Hall of Blam, How to Play, About/Credits */
const scenes = {};
let memProgress = null;   // (kept for the visit when the browser blocks storage, as in a hub session or a test)
const store = {
  progress() { const saved = E.store.get('bb:progress', null) || memProgress || {}; return Object.assign({ tour: null, unlocked: false, camp: [], records: { mostPoints: 0, bestStyle: 0, toursWon: 0, dunks: 0, games: 0, wins: 0 } }, JSON.parse(JSON.stringify(saved))); },
  save(p) { memProgress = JSON.parse(JSON.stringify(p)); E.store.set('bb:progress', p); S.progress = p; }
};
const unlockedAll = () => S.dev.unlockAll || store.progress().unlocked;
const teamLocked = i => TEAMS[i].secret && !unlockedAll();
const IDLE_MS = 10000;
const W_ = () => (game.W || 427);
let idleMs = 0, lastMouse = null;
function touchIdle(dt) {
  const I = game.input, m = mouseHud(); let moved = false;
  if (m && lastMouse && (Math.abs(m[0] - lastMouse[0]) + Math.abs(m[1] - lastMouse[1])) > 1) moved = true; lastMouse = m;
  const mv = I.move(); if (I.anyPressed() || Math.hypot(mv[0], mv[1]) > .3 || moved) { idleMs = 0; }
  else idleMs += dt * 1000;
  if (I.lastDevice === 'gamepad') S.padSeen = true;
}
function go(name, data) { idleMs = 0; game.input.consumeAll(); game.go(name, data); }

/* ===== TITLE ===== */
const titleHeroes = [];
function titleRigs() {
  if (titleHeroes.length) return titleHeroes;
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]].forEach(([t, k], i) => titleHeroes.push({ rig: makeRig(TEAMS[t].players[k], TEAMS[t], { size: 1.7 }), t, x: 0, ph: i * .7 }));
  return titleHeroes;
}
let titleList = null, titleBg = null;
function titleItems() {
  const prog = store.progress(), items = [];
  if (prog.tour && prog.tour.stop < TOUR.length) items.push({ label: 'CONTINUE TOUR', sub: 'Stop ' + (prog.tour.stop + 1) + ' of 4 with ' + TEAMS[prog.tour.team].name, fn: () => startTour(prog.tour.team, prog.tour.stop) });
  items.push({ label: 'BLAM TOUR', sub: 'The story: four courts, one crown', fn: () => go('tourteam') });
  items.push({ label: 'EXHIBITION', sub: '1-4 players, any crews, any court', fn: () => go('setup') });
  items.push({ label: 'BLAM CAMP', sub: 'Learn every move, with drills', fn: () => startCamp() });
  items.push({ label: 'HALL OF BLAM', sub: 'Records and the roster book', fn: () => go('hall') });
  items.push({ label: 'HOW TO PLAY', sub: 'Controls, rules and power-ups', fn: () => go('howto') });
  items.push({ label: 'OPTIONS', sub: 'Sound, controls, prompts', fn: () => game.menu('settings') });
  items.push({ label: 'ABOUT / CREDITS', sub: 'Who, what and how', fn: () => go('credits') });
  return items;
}
scenes.title = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter() {
    game.resetCamera(); game.follow(null); game.cam.bounds = null; L.enabled = false; game.allowJoin(false); S.mode = 'title';
    titleList = new FocusList(titleItems()); titleBg = titleBg || new E.Backdrop({ sky: ['#0a0620', '#2a0f48', '#7a1a50', '#e8601a'], stars: 40, layers: [{ kind: 'city', color: '#140828', y: .74, height: .28, parallax: 0 }, { kind: 'city', color: '#0a0418', y: .86, height: .2, parallax: 0 }] });
    music('title'); idleMs = 0; titleRigs(); game.setZoom(1);
  },
  update(dt) {
    touchIdle(dt);
    const touch = touchOnlyDevice();
    if (touch) { const c = game.input.clicked && game.input.clicked(); if (c && c[1] < 24) game.menu('settings'); if (c && c[0] > W_() - 70 && c[1] < 24) game.menu('settings'); if (idleMs > 3000) return startAttract(); return; }
    const sel = titleList.update(dt);
    // cheat code: unlock the secret crews
    if (game.input.sequence && game.input.sequence(['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'], { window: 4 })) { const p = store.progress(); p.unlocked = true; store.save(p); sfx('jackpot'); S.titleNote = 'SECRET CREWS UNLOCKED'; S.titleNoteT = 3; }
    S.titleNoteT = Math.max(0, (S.titleNoteT || 0) - dt);
    if (idleMs > IDLE_MS) startAttract();
  },
  draw(r) {
    const W = r.W, H = r.H, t = game.time;
    titleBg.draw(r);
    r.sky && 0;
    r.overlay(g => {
      px.rect(g, 0, H - 70, W, 70, '#0a0418');
      // spotlight beams
      px.blend && px.blend(g, .15, 'add', () => { for (let i = 0; i < 3; i++) { const x = W * (.55 + i * .15) + Math.sin(t * .8 + i) * 16; px.poly(g, [[x - 3, 0], [x + 3, 0], [x + 40, H - 70], [x - 40, H - 70]], '#ffd890'); } });
      // heroes lineup at the right
      const heroes = titleRigs();
      heroes.forEach((h, i) => { h.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0, pose: i % 2 ? 'hips' : 'cheer', vx: 0, vy: 0 }); });
      const logoY = 10;
      bigText(g, 'BASKETBLAM', W * .5 - (touchOnlyDevice() ? 0 : 60), logoY, { scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0502a'], depth: 4, depthColor: '#4a1408' });
      txt(g, 'OVER-THE-TOP 2-ON-2 ARCADE BASKETBALL. NO FOULS. NO MERCY. ALL BLAM.', W * .5 - (touchOnlyDevice() ? 0 : 60), logoY + 38, '#ffe8c8', { align: 'center', font: 'tiny' });
    });
    // heroes drawn as portraits row near the bottom right via the overlay
    r.overlay(g => {
      const heroes = titleRigs();
      heroes.forEach((h, i) => { const x = W - 130 + (i % 3) * 42, y = 70 + Math.floor(i / 3) * 62; try { h.rig.drawPortrait(g, x, y, 40, { zoom: 2.4, turn: .3 + (i % 3) * .1, bg: TEAMS[h.t].dark, frame: TEAMS[h.t].color }); } catch (e) { } });
      if (touchOnlyDevice()) {
        panel(g, W / 2 - 120, H / 2 - 24, 240, 48); bigText(g, 'CONTROLLER OR KEYBOARD', W / 2, H / 2 - 16, { scale: 1 }); txt(g, 'REQUIRED', W / 2, H / 2 - 4, '#ffd36a', { align: 'center' });
        panel(g, W - 70, 4, 66, 18); txt(g, 'SETTINGS', W - 37, 9, '#fff', { align: 'center', font: 'tiny' });
        return;
      }
      titleList.draw(g, 14, 62, 170, 20, 3);
      const dev = lastDev();
      drawPrompts(g, dev === 'gamepad' || dev === 'keyboard' ? [['move', 'SELECT'], ['confirm', 'GO']] : [['confirm', 'CLICK TO GO']], W / 2, H - 14);
      if (S.titleNoteT > 0) txt(g, S.titleNote, W / 2, 42, '#ffe08a', { align: 'center' });
      const left = Math.max(0, Math.ceil((IDLE_MS - idleMs) / 1000));
      if (left <= 4 && left > 0) txt(g, 'DEMO IN ' + left, W - 8, H - 22, '#9a9ac8', { align: 'right', font: 'tiny' });
    });
  }
};

/* ===== ATTRACT ===== */
let attractN = 0;
function startAttract() { go('attract'); }
function attractMatchCfg() {
  const pairs = [[0, 1, 'alley'], [2, 1, 'roof'], [3, 0, 'lunar'], [1, 2, 'dome'], [4, 0, 'lunar']], p = pairs[attractN++ % pairs.length];
  return { teams: [p[0], p[1]], court: p[2], mode: 'attract', qLen: 24, difficulty: 'All-Star', seed: 100 + attractN, humans: {} };
}

/* ===== EXHIBITION SETUP ===== */
const setupState = { home: 0, away: 1, court: 0, mode: 0, row: 0, diff: 1, q: 1 };
const SETUP_MODES = ['VS CPU', 'CO-OP vs CPU', 'VERSUS'];
function nextFree(i, d) { let k = i; for (let n = 0; n < TEAMS.length; n++) { k = (k + d + TEAMS.length) % TEAMS.length; if (!teamLocked(k)) return k; } return i; }
scenes.setup = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter() { game.follow(null); L.enabled = false; setupState.row = 0; setupState.diff = ['Rookie', 'Pro', 'All-Star', 'Legend'].indexOf(game.settings.difficulty); setupState.q = ['1:00', '1:30', '2:00', '3:00'].indexOf(game.settings.quarter); if (setupState.diff < 0) setupState.diff = 1; if (setupState.q < 0) setupState.q = 1; game.allowJoin({ max: 4 }); music('camp'); S.setupRects = []; },
  exit() { game.allowJoin(false); },
  update(dt) {
    touchIdle(dt); const I = game.input, st = setupState, rows = 7;
    if (I.repeat('up', .3, .12)) { st.row = (st.row + rows - 1) % rows; sfx('tick', { vol: 1.5 }); } if (I.repeat('down', .3, .12)) { st.row = (st.row + 1) % rows; sfx('tick', { vol: 1.5 }); }
    const m = mouseHud(); if (m && S.setupRects) { const k = S.setupRects.findIndex(r => m[0] >= r[0] && m[0] <= r[0] + r[2] && m[1] >= r[1] && m[1] <= r[1] + r[3]); if (k >= 0 && k !== S.setupHover) { st.row = k; S.setupHover = k; } }
    const c = I.clicked && I.clicked(); let click = 0;
    if (c && S.setupRects) { const k = S.setupRects.findIndex(r => c[0] >= r[0] && c[0] <= r[0] + r[2] && c[1] >= r[1] && c[1] <= r[1] + r[3]); if (k >= 0) { st.row = k; click = c[0] > S.setupRects[k][0] + S.setupRects[k][2] / 2 ? 1 : -1; if (k >= 5) click = 2; } }
    let d = 0; if (I.repeat('left', .35, .15)) d = -1; if (I.repeat('right', .35, .15)) d = 1; if (click === 1 || click === -1) d = click;
    if (d) {
      sfx('tick', { vol: 1.5 });
      if (st.row === 0) st.home = nextFree(st.home, d); else if (st.row === 1) st.away = nextFree(st.away, d);
      else if (st.row === 2) st.court = (st.court + d + 4) % 4; else if (st.row === 3) st.mode = (st.mode + d + 3) % 3;
      else if (st.row === 4) { st.diff = (st.diff + d + 4) % 4; game.settings.set('difficulty', ['Rookie', 'Pro', 'All-Star', 'Legend'][st.diff]); }
      else if (st.row === 5) { st.q = (st.q + d + 4) % 4; game.settings.set('quarter', ['1:00', '1:30', '2:00', '3:00'][st.q]); }
    }
    if ((I.pressed('confirm') || I.pressed('start') || click === 2) && st.row >= 5) { if (st.row === 6 || click === 2 && st.row === 6) { startExhibition(); return; } if (st.row === 5) { st.q = (st.q + 1) % 4; game.settings.set('quarter', ['1:00', '1:30', '2:00', '3:00'][st.q]); } }
    if (I.pressed('confirm') && st.row === 4) { st.diff = (st.diff + 1) % 4; game.settings.set('difficulty', ['Rookie', 'Pro', 'All-Star', 'Legend'][st.diff]); }
    if (I.pressed('confirm') && st.row < 4) { if (st.row === 0) st.home = nextFree(st.home, 1); else if (st.row === 1) st.away = nextFree(st.away, 1); else if (st.row === 2) st.court = (st.court + 1) % 4; else st.mode = (st.mode + 1) % 3; }
    if (I.pressed('cancel')) { I.consumeAll(); go('title'); }
  },
  draw(r) {
    const W = r.W, H = r.H, st = setupState;
    r.sky(['#0e0a28', '#241048', '#4a1a58']);
    r.overlay(g => {
      bigText(g, 'EXHIBITION', W / 2, 6, { scale: 3 });
      const rowsDef = [
        ['HOME', TEAMS[st.home].name, TEAMS[st.home].color], ['AWAY', TEAMS[st.away].name, TEAMS[st.away].color], ['COURT', COURTS[COURT_ORDER[st.court]].name, '#ffd36a'],
        ['MODE', SETUP_MODES[st.mode], '#8ad0ff'], ['CPU LEVEL', ['Rookie', 'Pro', 'All-Star', 'Legend'][st.diff], '#ff9a6a'], ['QUARTER', ['1:00', '1:30', '2:00', '3:00'][st.q], '#c8ff9a'], ['', 'TIP OFF!', '#ffffff']
      ];
      S.setupRects = [];
      const x0 = 12, w = 210;
      rowsDef.forEach(([lb, val, col], i) => {
        const y = 36 + i * 22, foc = st.row === i; S.setupRects.push([x0, y, w, 20]);
        E.ui.box(g, x0, y, w, 20, { bg: foc ? ['#ffb830', '#e8601a'] : ['#2a2c44', '#1a1c30'], border: foc ? '#fff6c0' : '#5a5e88', alpha: 1 });
        if (i < 6) { txt(g, lb, x0 + 8, y + 7, foc ? '#2a1204' : '#9a9ac8', { font: 'tiny', outline: false }); txt(g, val, x0 + w - 24, y + 6, foc ? '#2a1204' : col, { align: 'right', outline: false }); if (foc) { txt(g, '←', x0 + w - 18 - E.font.width(val) - 4, y + 6, '#2a1204', { outline: false }); } txt(g, i < 6 && foc ? '▸' : '', x0 + w - 12, y + 6, '#2a1204', { outline: false }); }
        else bigText(g, val, x0 + w / 2, y + 4, { scale: 1, colors: foc ? ['#ffffff', '#fff6c0', '#ffe080'] : ['#c8c8e8', '#a0a0d0', '#8080b0'] });
      });
      // right side: previews
      const cx = W - 110;
      [st.home, st.away].forEach((ti, k) => {
        const t = TEAMS[ti], y = 36 + k * 76; panel(g, cx - 96, y, 196, 70, { border: t.color });
        txt(g, t.name, cx - 90, y + 4, t.color); txt(g, t.blurb, cx - 90, y + 14, '#9a9ac8', { font: 'tiny' });
        t.players.forEach((p, j) => { drawPortraitOf(g, p, t, cx - 90 + j * 96, y + 24, 38); txt(g, p.name, cx - 48 + j * 96, y + 24, '#fff', { font: 'tiny' }); ratingPips(g, Math.round((p.ratings.zoom + p.ratings.dime) / 2), cx - 48 + j * 96, y + 34); txt(g, 'SPEED', cx - 48 + j * 96, y + 40, '#7a7aa8', { font: 'tiny', outline: false }); ratingPips(g, Math.round((p.ratings.slam + p.ratings.swat) / 2), cx - 48 + j * 96, y + 49); txt(g, 'POWER', cx - 48 + j * 96, y + 55, '#7a7aa8', { font: 'tiny', outline: false }); });
      });
      // players
      const P = game.players, mode = st.mode;
      const asg = mode === 1 ? ['HOME', 'HOME', 'AWAY', 'AWAY'] : mode === 2 ? ['HOME', 'AWAY', 'HOME', 'AWAY'] : ['HOME', 'HOME', 'HOME', 'HOME'];
      for (let i = 0; i < 4; i++) { const x = 12 + i * 52, y = 206; txt(g, 'P' + (i + 1) + (P[i] ? ' ' + (mode === 0 ? 'HOME' : asg[i]) : ' --'), x, y, P[i] ? E.PLAYER_COLORS[i] : '#5a5a78', { font: 'tiny' }); }
      txt(g, COURTS[COURT_ORDER[st.court]].twistText, 12, 194, '#c8c8e8', { font: 'tiny' });
      drawPrompts(g, [['move', 'CHOOSE'], ['confirm', 'GO'], ['cancel', 'BACK']], W - 120, H - 12);
      txt(g, 'MORE PLAYERS: PRESS START ON A PAD, OR 2 ON THE KEYBOARD', W - 8, H - 24, '#ffe08a', { font: 'tiny', align: 'right' });
    });
  }
};
function startExhibition() {
  const st = setupState, P = game.players, humans = {};
  const mode = st.mode;
  if (mode === 0) { for (let i = 0; i < P.length; i++) humans[i === 0 ? 0 : 1] = humans[i === 0 ? 0 : 1] || P[i]; }
  else if (mode === 1) { P.forEach((inp, i) => { humans[i] = inp; }); if (P.length === 1) { } }
  else { const order = [0, 2, 1, 3]; P.forEach((inp, i) => { humans[order[i]] = inp; }); }
  const ids = { teams: [st.home, st.away], court: COURT_ORDER[st.court], mode: 'exhibition', humans, qLen: QUARTER_LEN[['1:00', '1:30', '2:00', '3:00'][st.q]], difficulty: ['Rookie', 'Pro', 'All-Star', 'Legend'][st.diff] };
  go('match', { cfg: ids });
}

/* ===== HALL OF BLAM ===== */
let hallI = 0;
scenes.hall = {
  view: 'broadcast', input: KEYS, res: 'ps1', enter() { hallI = 0; L.enabled = false; },
  update(dt) { touchIdle(dt); const I = game.input; hallI = cycle(I, TEAMS.length, hallI); if (I.pressed('cancel') || I.pressed('confirm')) go('title'); },
  draw(r) {
    const W = r.W, H = r.H, p = store.progress(), rec = p.records;
    r.sky(['#0e0a28', '#1a1048', '#3a1a58']);
    r.overlay(g => {
      bigText(g, 'HALL OF BLAM', W / 2, 6, { scale: 3 });
      panel(g, 12, 38, 170, 150);
      const rows = [['GAMES PLAYED', rec.games], ['WINS', rec.wins], ['MOST POINTS (ONE GAME)', rec.mostPoints], ['BEST STYLE SCORE', rec.bestStyle], ['TOTAL DUNKS', rec.dunks], ['TOURS WON', rec.toursWon]];
      rows.forEach(([a, b], i) => { txt(g, a, 20, 48 + i * 18, '#9a9ac8', { font: 'tiny' }); txt(g, String(b), 172, 46 + i * 18, '#ffd36a', { align: 'right', scale: 1 }); });
      txt(g, 'SECRET CREWS: ' + (unlockedAll() ? 'UNLOCKED' : 'LOCKED (WIN THE TOUR)'), 20, 160, unlockedAll() ? '#8aff9a' : '#ff8a8a', { font: 'tiny' });
      txt(g, 'TOUR: ' + (p.tour ? 'STOP ' + Math.min(4, p.tour.stop + 1) + ' WITH ' + TEAMS[p.tour.team].name : 'NOT STARTED'), 20, 172, '#c8c8e8', { font: 'tiny' });
      // roster book
      const t = TEAMS[hallI], bx = 192, bw = W - bx - 10;
      panel(g, bx, 38, bw, 150, { border: t.color });
      txt(g, '←  ' + t.name + '  ▸', bx + bw / 2, 44, t.color, { align: 'center' });
      if (t.secret && !unlockedAll()) { txt(g, 'LOCKED', bx + bw / 2, 100, '#ff8a8a', { align: 'center', scale: 2 }); txt(g, 'WIN THE BLAM TOUR TO UNLOCK', bx + bw / 2, 120, '#c8c8e8', { align: 'center', font: 'tiny' }); }
      else t.players.forEach((pl, j) => {
        const y = 58 + j * 64; drawPortraitOf(g, pl, t, bx + 8, y, 44); txt(g, pl.name, bx + 58, y, '#fff');
        RK.forEach((k, i) => { const cx = bx + 58 + (i % 2) * 68, cy = y + 12 + Math.floor(i / 2) * 11; txt(g, RICON[k], cx, cy, '#8a8ab8', { font: 'tiny', outline: false }); ratingPips(g, pl.ratings[k], cx + 22, cy + 1); });
      });
      drawPrompts(g, [['move', 'BROWSE CREWS'], ['cancel', 'BACK']], W / 2, H - 14);
    });
  }
};

/* ===== HOW TO PLAY ===== */
let howPage = 0;
const HOW = [
  { title: 'THE GAME', lines: ['Two against two. Four quarters. Score more than the other crew.', 'Dunks and jumpers both count: 2 points, 3 from behind the arc.', 'NO FOULS. Shoving, swatting and swiping are all LEGAL.', 'Three baskets in a row and your whole crew goes SUPERNOVA:', 'fast, deadly, on fire, and the backboard is in danger.', 'Shot clock is 20 seconds. Tied after four quarters? Overtime,', 'then SUDDEN BLAM: next basket wins.'] },
  { title: 'CONTROLS', pad: [['move', 'Move / dribble'], ['shoot', 'HOLD to jump, RELEASE at the top to shoot. With turbo near the hoop: DUNK. Without the ball: jump to block'], ['pass', 'Pass to your teammate. Without the ball: steal swipe'], ['turbo', 'Hold to sprint and jump higher. Needed to dunk'], ['shove', 'With ball: spin move. Without: SHOVE'], ['oop', 'Alley-oop lob to your teammate. Without the ball: call for it'], ['taunt', 'Taunt (dead balls only)']] },
  { title: 'WHAT YOU CAN AND CAN\'T DO', lines: ['CAN: shove anyone, steal from behind, block dunks, goaltend.', 'CAN: jump on a rebound, tip passes, swat shots at the top.', 'CAN\'T: leave the court (the crowd shoves you back).', 'CAN\'T: shoot without the ball, or dunk with an empty turbo tank.', 'Release at the very top of your jump for a PERFECT shot (green).', 'A hand in your face hurts your chances. Jumpers contested', 'by a jumping defender hurt even more.', 'Time out? No. This is arcade basketball.'] },
  { title: 'POWER-UPS & COURTS', lines: ['ROCKET KICKS: unlimited turbo and extra speed.', 'GOLD BALL: your next basket counts double.', 'GIANT HANDS: huge reach for steals, blocks and catches.', 'ICE CUBE: freezes the nearest rival.', 'ALLEY: puddles make you skate.   ROOFTOP: wind pushes the ball.', 'DOME: the JACKPOT SPOT adds +2.   LUNAR LOT: low gravity, huge air.'] }
];
scenes.howto = {
  view: 'broadcast', input: KEYS, res: 'ps1', enter() { howPage = 0; },
  update(dt) { touchIdle(dt); const I = game.input; howPage = cycle(I, HOW.length, howPage); if (I.pressed('cancel') || I.pressed('confirm')) go(S.fromGame ? 'match' : 'title'); },
  draw(r) {
    const W = r.W, H = r.H, p = HOW[howPage];
    r.sky(['#0e0a28', '#1a1048', '#3a1a58']);
    r.overlay(g => {
      bigText(g, 'HOW TO PLAY', W / 2, 6, { scale: 3 });
      panel(g, 14, 38, W - 28, 164);
      bigText(g, p.title, W / 2, 46, { scale: 1 });
      if (p.lines) p.lines.forEach((l, i) => txt(g, l, 28, 68 + i * 14, '#e8e4f8'));
      if (p.pad) p.pad.forEach(([ac, d], i) => { const y = 66 + i * 18; drawGlyph(g, ac, 24, y); E.font.wrap(d, W - 90, { font: 'tiny' }).forEach((l, k) => txt(g, l, 46, y + 2 + k * 8, '#e8e4f8', { font: 'tiny' })); });
      for (let i = 0; i < HOW.length; i++) px.rect(g, W / 2 - 20 + i * 11, 194, 8, 4, i === howPage ? '#ffd36a' : '#3a3c58');
      drawPrompts(g, [['move', 'PAGES'], ['cancel', 'BACK']], W / 2, H - 14);
    });
  }
};

/* ===== ABOUT / CREDITS ===== */
const SOURCE_INFO = [
  ['Date', '2026-11-04 06:16:12'], ['Source', 'Basketball (over the top arcade style)'], ['Plan', 'PLAN.md (written by claude-opus-5-5 at max effort)'],
  ['Genre and Perspective', 'Arcade sports, 2-on-2 basketball; side-on broadcast camera (orthographic, pitch 30 deg, High view option)'],
  ['Tech', 'my-3D2dge v0.85.2 (modified copy), AI Hub Session Client 1.4.0, plain JavaScript, Canvas 2D, Web Audio; Node 24 and Playwright for tests'],
  ['Art Direction', 'The engine\'s native HD pixel style: shaded Humanoid rigs, textured court floors, tiered stands, comic banners, neon night courts'],
  ['Animation', 'The engine\'s Humanoid rig animation (poses, moves, procedural gait) with hand-built dunk, shot and spin choreography'],
  ['Audio', 'All music, effects and voices synthesized in code: chip songs, Web Audio effects, Animalese-style gibberish voices. No audio files'],
  ['Online', 'AI Hub Session Protocol v1, parallel mode: a seeded BLAM SHOWDOWN where every player plays the same match'],
  ['Testing', 'Headless scripted play-throughs with game.advance, plus browser checks and screenshots'],
  ['Research', 'Read the engine handoff docs, sports kit and AI Hub protocol; no other research'],
  ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'], ['Model', 'Anthropic, claude-sonnet-5-5, reasoning effort medium'],
  ['Scope', 'A trimmed vertical slice of PLAN.md: 5 crews (10 players), 4 courts with twists, 8 dunks, 4 power-ups, 10 camp lessons, a 4-stop story tour, dev mode with 25 live sliders, attract mode, local 1-4 players and a parallel-mode AI Hub round'],
  ['Usage', 'unknown'],
  ['Engine changes', '1) Dialog.voice may be a function (letter, index, text) so a synthesized voice speaks as lines type. 2) audio.sfxBus and audio.musicBus public getters so voices and crowd follow the volume settings.']
];
let credY = 0;
scenes.credits = {
  view: 'broadcast', input: KEYS, res: 'ps1', enter() { credY = 0; music('victory'); },
  update(dt) { touchIdle(dt); const I = game.input; if (I.down('down')) credY += dt * 90; if (I.down('up')) credY -= dt * 90; credY = clamp(credY, 0, 260); if (I.pressed('cancel') || I.pressed('start')) go('title'); },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#0e0a28', '#241048', '#4a1a58']);
    r.overlay(g => {
      bigText(g, 'ABOUT BASKETBLAM', W / 2, 6, { scale: 2 });
      panel(g, 10, 30, W - 20, H - 56);
      let y = 38 - credY;
      for (const [k, v] of SOURCE_INFO) {
        const lines = E.font.wrap(v, W - 150, { font: 'tiny' }); if (y > 20 && y < H - 40) txt(g, k.toUpperCase(), 18, y, '#ffd36a', { font: 'tiny' });
        lines.forEach((l, i) => { if (y + i * 8 > 24 && y + i * 8 < H - 34) txt(g, l, 120, y + i * 8, '#e8e4f8', { font: 'tiny' }); });
        y += Math.max(1, lines.length) * 8 + 5;
      }
      txt(g, 'Thanks for playing! Special thanks to the crowd, who are all the same six people.', 18, y + 6, '#c8c8e8', { font: 'tiny' });
      drawPrompts(g, [['move', 'SCROLL'], ['cancel', 'BACK']], W / 2, H - 14);
    });
  }
};
