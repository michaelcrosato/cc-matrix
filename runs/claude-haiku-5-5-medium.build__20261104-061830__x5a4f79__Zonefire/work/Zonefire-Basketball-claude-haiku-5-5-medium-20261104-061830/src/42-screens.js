/* ---- THE SCREENS (plan §11.3–11.4): title, main menu, join, team select, lineup, court and rules, the matchup card, results,
 * Hall of Blam, How to Play, About and Credits, and the touch-only notice. Each is a scene of the engine; a menu screen
 * has a FocusList (the mouse, a pad or the keyboard), a preview panel at the right, and a prompt bar. ---- */
const SETUP = { home: 'hightops', away: 'breakers', court: 'skybox', qLen: 120, difficulty: 'Pro', powerups: true, twists: true, humans: [], mode: 'exhibition' };
const screenIdle = dt => {   // ten seconds without input on a title or menu screen starts the attract mode (§13)
  const active = game.players.some(I => I && (I.anyPressed() || (I.move()[0] || I.move()[1]))) || !!game.input.clicked() || (game.input.pointer() && S.lastPointer && (S.lastPointer[0] !== game.input.pointer()[0] || S.lastPointer[1] !== game.input.pointer()[1]));
  S.lastPointer = game.input.pointer();
  if (active) S.idle = 0; else S.idle = (S.idle || 0) + dt;
  if (S.idle >= 10 && game.sceneName !== 'attract') { S.idle = 0; game.go('attract', null, { fade: .3 }); return true; }   // (touch-only devices get it too: §11.7)
  return false;
};
const touchOnlyNow = () => !!S.touchOnly;
/** the touch-only device check (§11.7): touch and no fine pointer nor hover; a gamepad or a key press lifts it at once */
const checkTouchOnly = () => {
  const touch = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0), fine = typeof matchMedia === 'function' && (matchMedia('(any-pointer: fine)').matches || matchMedia('(any-hover: hover)').matches);
  S.touchOnly = !!touch && !fine && !S.everKey && !(game.input.lastDevice === 'gamepad');
  return S.touchOnly;
};

/* ---- TITLE ---- */
const COMIC_STAR = [[0, -22], [7, -8], [22, -7], [11, 3], [14, 18], [0, 10], [-14, 18], [-11, 3], [-22, -7], [-7, -8]];
scenes.title = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'title'; S.idle = 0; checkTouchOnly(); playSong('title'); L.enabled = false; S.titleRigs = S.titleRigs || [0, 1].map(i => makePlayer(i, i ? 'riptide' : 'volt', i ? AWAY : HOME)); },
  update(dt) {
    if (screenIdle(dt)) return;
    if (S.touchOnly) return;
    if (anyPressed('start') || anyPressed('confirm')) { anyConsume('confirm'); game.go('menu', null, { fade: .25 }); }
  },
  draw(r) {
    const t = game.time;
    r.sky(['#07061a', '#1d1240', '#3a1a5a']);
    r.starfield({ count: 60, speed: 6, dir: 'left' });
    r.overlay(g => { px.disc(g, r.W * .82, r.H * .2, 26, '#f4e8ff'); px.disc(g, r.W * .82 + 6, r.H * .2 - 4, 24, '#1d1240'); });
    // the Skybox's skyline: a few silhouettes and a neon billboard
    r.overlay(g => { for (let i = 0; i < 14; i++) { const w = 60 + (i * 37) % 70, h = 80 + (i * 53) % 120, x = (i * 97) % r.W; px.rect(g, x, r.H * .72 - h, w, h, '#140c2a'); } });
    // the two heroes of the title, in their alley-oop pose: one leaps, one lifts
    S.titleRigs.forEach((p, i) => {
      const x = r.W / 2 + (i ? 46 : -46), y = r.H * .66, lift = Math.max(0, Math.sin(t * 2 + i)) * 18;
      p.rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: i ? PI : 0, pose: i ? 'cheer' : null, air: lift > 4, run: 0 });
      r.actor(x, y, lift, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view));
    });
    r.overlay(g => {
      E.font.title(g, 'ZONEFIRE', r.W / 2, r.H * .12, { align: 'center', scale: Math.max(3, Math.min(6, Math.floor(r.W / 260))), colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 4, depthColor: '#4a0c2a' });
      if (Math.sin(t * 5) > -.2) E.font.text(g, 'BLAM!', r.W * .82 + 24, r.H * .2 - 26, '#ff3ca6', { align: 'center', scale: 2, outline: false, shadow: '#000' });
      E.font.text(g, 'No fouls. No mercy. All BLAM.', r.W / 2, r.H * .12 + 48, C.cyan, { align: 'center', scale: 2, shadow: '#000', outline: false });
      if (S.touchOnly) {
        E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H * .8, C.gold, { align: 'center', scale: 2, shadow: '#000', outline: false });
        E.ui.box(g, r.W / 2 - 110, r.H * .86, 220, 40, { bg: ['#ff3ca6', '#8a1a5a'], border: '#ffe08a' });
        E.font.text(g, 'SETTINGS', r.W / 2, r.H * .86 + 12, C.ink, { align: 'center', scale: 2, outline: false });
        const c = game.input.clicked(); if (c && c[0] > r.W / 2 - 110 && c[0] < r.W / 2 + 110 && c[1] > r.H * .86 && c[1] < r.H * .86 + 40) game.menu('settings');
      } else if (Math.sin(t * 4) > -.3) {
        E.font.text(g, 'PRESS START', r.W / 2, r.H * .8, C.ink, { align: 'center', scale: 3, shadow: '#000', outline: false });
        promptLine(g, '{confirm} START', r.W / 2 - 70, r.H * .8 + 36, { scale: 1 });
      }
      E.font.text(g, E.versionLabel ? E.versionLabel() : 'v0.85.2', r.W - 8, r.H - 10, C.muted, { align: 'right', scale: 1, outline: false });
    });
  }
};

/* ---- MAIN MENU: a big list at the left; a live preview at the right for the focused entry ---- */
const menuItems = () => {
  const tour = S.progress.tour;
  const items = [
    { label: tour ? 'CONTINUE TOUR' : 'BLAM TOUR', sub: tour ? 'STOP ' + (tour.stop + 1) : 'STORY', on: () => (tour ? goTourContinue() : goTourNew()) },
    { label: 'EXHIBITION', sub: 'ANY TEAMS', on: () => goExhibition() },
    { label: 'BLAM CAMP', sub: (S.progress.camp || []).length + ' / 10', on: () => game.go('camp', null, { fade: .2 }) },
    { label: 'HALL OF BLAM', sub: 'RECORDS', on: () => game.go('hall', null, { fade: .2 }) },
    { label: 'HOW TO PLAY', sub: '3 PAGES', on: () => game.go('howto', { from: 'menu' }, { fade: .2 }) },
    { label: 'OPTIONS', sub: 'SETTINGS', on: () => game.menu('settings') },
    { label: 'ABOUT', sub: 'CREDITS', on: () => game.go('about', { page: 0 }, { fade: .2 }) }
  ];
  return items;
};
scenes.menu = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'menu'; S.idle = 0; playSong('menu'); S.menuList = S.menuList || new FocusList([], { x: 36, y: 0, gap: 28, w: 300, onBack: () => game.go('title', null, { fade: .2 }) }); S.menuList.setItems(menuItems()); S.menuList.onBack = () => game.go('title', null, { fade: .2 }); },
  update(dt) { if (screenIdle(dt)) return; S.menuList.nav(dt); if (anyPressed('start') && game.players[0]) game.menu('settings'); },
  draw(r) {
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    const L = S.menuList; L.y = r.H * .24; L.x = Math.max(24, r.W * .06);
    const boxes = L.draw(r, { x: L.x, y: L.y, gap: Math.max(26, r.H * .085), w: Math.min(360, r.W * .36), scale: 2 });
    L.pointer(r, boxes);
    const it = L.items[L.i] || {}, px0 = r.W * .48, py = r.H * .24;
    r.overlay(g => {
      panel(g, px0, py - 12, r.W * .46, r.H * .56);
      E.font.title(g, it.label || '', px0 + 20, py + 6, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
      menuPreview(g, it.label || '', px0 + 20, py + 60, r);
    });
    r.overlay(g => E.font.title(g, 'ZONEFIRE', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 }));
    promptBar(r, MENU_PROMPT);
  }
};
/** the preview of a menu entry: words and small pictures of what it is */
const menuPreview = (g, label, x, y, r) => {
  const lines = {
    'BLAM TOUR': ['FOUR STOPS, FIVE COURTS, ONE GOLDEN BLAMBOOZLE.', 'WIN THREE AND YOU FACE THE BLAMBOTS.', 'THE TOUR MAP AND ITS SAVES ARE KEPT.'],
    'CONTINUE TOUR': ['PICK UP WHERE YOUR TOUR LEFT OFF.', 'THE TOUR SCORE COUNTS TOWARD HALL OF BLAM.'],
    'EXHIBITION': ['ANY TWO TEAMS, ANY COURT, UP TO FOUR PLAYERS.', 'SET THE QUARTERS, THE CPU AND THE TWISTS.'],
    'BLAM CAMP': ['TEN LESSONS FROM DEE DEE.', 'MOVE, PASS, SHOOT, DUNK, ALLEY-OOP, SUPERNOVA.'],
    'HALL OF BLAM': ['THE TOP TEN TOUR SCORES, BY INITIALS.', 'AND THE RECORDS: MOST POINTS, BEST DUNK.'],
    'HOW TO PLAY': ['WHAT YOU CAN DO, AND WHAT YOU CAN\'T.', 'WITH THE GLYPHS OF YOUR DEVICE.'],
    'OPTIONS': ['BUTTON SYMBOLS, DIFFICULTY, THE RULES OF THE GAME.', 'AND THE SOUND, THE SCREEN AND THE CAMERA.'],
    'ABOUT': ['CREDITS, THE SOURCE, AND THE FEEDBACK.', 'A FEW SECRETS ARE ON THIS PAGE TOO.']
  };
  const ls = lines[label] || ['THE GAME IS READY.'];
  ls.forEach((t, i) => E.font.text(g, t, x, y + i * 22, C.ink, { scale: 1, shadow: '#000', outline: false, wrap: 0 }));
  // a small picture: two team colours squaring off (the exhibition and the tour), a court line, or a shooter
  const cc = [teamDef('hightops').colors.jersey, teamDef('breakers').colors.jersey];
  px.rect(g, x, y + 130, 60, 40, cc[0]); px.rect(g, x + 100, y + 130, 60, 40, cc[1]);
  E.font.text(g, 'VS', x + 80, y + 140, C.gold, { align: 'center', scale: 2, outline: false, shadow: '#000' });
};

/* ---- EXHIBITION: join (1–4 players, sides), teams, lineup, court and rules, the matchup ---- */
const joinState = () => S.join || (S.join = { slots: [null, null, null, null] });
const goExhibition = () => { S.mode = 'exhibition'; S.setup = Object.assign({}, SETUP, { humans: [] }); S.joinOn = true; game.allowJoin({ max: 4, onJoin: (input, n) => { const slot = n - 1; joinState().slots[slot] = { input, side: slot % 2 ? AWAY : HOME, ready: false, name: 'P' + n }; } }); joinState().slots[0] = { input: game.players[0] || game.input, side: HOME, ready: false, name: 'P1' }; game.go('join', null, { fade: .2 }); };
/** the join screen (§11.4): four slots; each joined player moves its card to HOME or AWAY, ✕ is ready, ○ leaves */
scenes.join = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'join'; S.idle = 0; S.joinSel = 0; },
  update(dt) {
    if (screenIdle(dt)) return;
    const J = joinState();
    for (let i = 0; i < 4; i++) {
      const sl = J.slots[i]; if (!sl) continue;
      if (sl.input && sl.input.pressed && sl.input.pressed('right')) sl.side = AWAY;
      if (sl.input && sl.input.pressed && sl.input.pressed('left')) sl.side = HOME;
      if (sl.input && sl.input.pressed && sl.input.pressed('confirm')) sl.ready = !sl.ready;
      if (sl.input && sl.input.pressed && sl.input.pressed('cancel') && i > 0) { J.slots[i] = null; game.removePlayer && game.removePlayer(sl.input); }
    }
    const p1 = J.slots[0];
    if (p1 && p1.ready && game.input.pressed('start')) { game.allowJoin(false); game.go('teams', null, { fade: .2 }); }
    if (game.input.pressed('cancel') && !(p1 && p1.ready)) { game.allowJoin(false); game.go('menu', null, { fade: .2 }); }
  },
  draw(r) {
    const J = joinState();
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'EXHIBITION', 'JOIN: UP TO FOUR PLAYERS, ANY DEVICE', r.W);
      const cw = Math.min(220, r.W * .2), gap = 16, x0 = r.W / 2 - (cw * 4 + gap * 3) / 2;
      for (let i = 0; i < 4; i++) {
        const sl = J.slots[i], x = x0 + i * (cw + gap), y = r.H * .3, side = sl ? (sl.side === HOME ? 'HOME' : 'AWAY') : null;
        panel(g, x, y, cw, r.H * .42, { border: sl ? (sl.ready ? C.ok : C.accent) : C.line });
        E.font.title(g, 'P' + (i + 1), x + cw / 2, y + 16, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
        if (!sl) { E.font.text(g, 'PRESS START', x + cw / 2, y + r.H * .2, C.muted, { align: 'center', scale: 1, outline: false }); continue; }
        E.font.text(g, side, x + cw / 2, y + 60, sl.side === HOME ? C.cyan : C.gold, { align: 'center', scale: 2, outline: false, shadow: '#000' });
        E.font.text(g, sl.ready ? 'READY' : 'NOT READY', x + cw / 2, y + 96, sl.ready ? C.ok : C.muted, { align: 'center', scale: 1, outline: false });
        promptLine(g, '{shoot} LEFT/RIGHT {confirm} READY', x + 10, y + r.H * .3, { scale: 1 });
      }
      const left = J.slots.filter(Boolean).length;
      E.font.text(g, left === 1 ? 'CPU FILLS THE REST' : left + ' PLAYERS', r.W / 2, r.H * .8, C.muted, { align: 'center', scale: 1, outline: false });
    });
    promptBar(r, [['{confirm}', 'READY'], ['{cancel}', 'BACK'], ['{start}', 'START']]);
  }
};

/* the team select: two cards, left and right cycles the teams (the unlocked ones), ✕ locks, △ the bio card */
const unlockedTeams = () => all('team').filter(t => !t.locked || (t.id === 'blambots' && S.progress.unlocked.bots) || (t.id === 'allstars' && S.progress.unlocked.allstars));
scenes.teams = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'teams'; S.idle = 0; S.teamsSel = [0, 1]; S.teamsLock = [false, false]; const T = unlockedTeams(); S.teamsSel = [T.findIndex(t => t.id === SETUP.home), T.findIndex(t => t.id === SETUP.away)]; if (S.teamsSel[0] < 0) S.teamsSel[0] = 0; if (S.teamsSel[1] < 0) S.teamsSel[1] = 1; },
  update(dt) {
    if (screenIdle(dt)) return;
    const T = unlockedTeams();
    for (let s = 0; s < 2; s++) {
      if (S.teamsLock[s]) continue;
      if (game.input.pressed(s === 0 ? 'left' : 'right')) S.teamsSel[s] = (S.teamsSel[s] - 1 + T.length) % T.length;
      if (game.input.pressed(s === 0 ? 'right' : 'left')) S.teamsSel[s] = (S.teamsSel[s] + 1) % T.length;
    }
    if (game.input.pressed('confirm')) { S.teamsLock[0] = true; }
    if (game.input.pressed('cancel')) { if (S.teamsLock[0]) S.teamsLock[0] = false; else game.go('join', null, { fade: .2 }); }
    if (S.teamsLock[0] && game.input.pressed('confirm') && S.teamsLock[1] !== undefined) { S.setup.home = T[S.teamsSel[0]].id; S.setup.away = T[S.teamsSel[1]].id; game.go('lineup', null, { fade: .2 }); }
  },
  draw(r) {
    const T = unlockedTeams();
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'TEAM SELECT', 'LEFT AND RIGHT CHOOSE · CONFIRM LOCKS', r.W);
      for (let s = 0; s < 2; s++) {
        const t = T[S.teamsSel[s]], x = s ? r.W * .52 : r.W * .05, y = r.H * .22, w = r.W * .43, h = r.H * .64;
        panel(g, x, y, w, h, { border: t.colors.jersey });
        px.rect(g, x + 10, y + 10, 12, h - 20, t.colors.jersey);
        E.font.title(g, t.name, x + 36, y + 14, { scale: 2, colors: ['#fffbe8', t.colors.trim], depth: 2 });
        E.font.text(g, (s ? 'AWAY' : 'HOME') + (S.teamsLock[s] ? ' · LOCKED' : ''), x + 36, y + 56, C.gold, { scale: 1, outline: false, shadow: '#000' });
        E.font.text(g, 'COURT: ' + COURTS[t.court].name, x + 36, y + 74, C.cyan, { scale: 1, outline: false, shadow: '#000' });
        E.font.text(g, t.style.toUpperCase(), x + 36, y + 92, C.ink, { scale: 1, outline: false, shadow: '#000' });
        rosterOf(t.id).forEach((p, i) => { const px0 = x + 36 + i * (w / 3.4); ratingPips(g, px0, y + 120, p, { gap: 16, scale: 1 }); E.font.text(g, p.name, px0, y + h - 36, C.ink, { scale: 1, outline: false, shadow: '#000' }); });
      }
    });
    promptBar(r, [['{confirm}', 'LOCK'], ['{cancel}', 'BACK']]);
  }
};

/* the lineup: three players per side, pick the starters; the third is on the bench for the subs */
scenes.lineup = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'lineup'; S.idle = 0; S.lineupSel = [0, 0]; S.lineupDone = [false, false]; },
  update(dt) {
    if (screenIdle(dt)) return;
    for (let s = 0; s < 2; s++) { if (S.lineupDone[s]) continue; const team = s ? S.setup.away : S.setup.home, n = rosterOf(team).length; if (game.input.pressed(s === 0 ? 'left' : 'right')) S.lineupSel[s] = (S.lineupSel[s] + n - 1) % n; if (game.input.pressed(s === 0 ? 'right' : 'left')) S.lineupSel[s] = (S.lineupSel[s] + 1) % n; }
    if (game.input.pressed('confirm')) S.lineupDone[0] = true;
    if (game.input.pressed('cancel')) { if (S.lineupDone[0]) S.lineupDone[0] = false; else game.go('teams', null, { fade: .2 }); }
    if (S.lineupDone[0]) { S.setup.lineup = [S.lineupSel[0], S.lineupSel[1]]; if (S.mode === 'tour') return tourAfterLineup(); game.go('rules', null, { fade: .2 }); }
  },
  draw(r) {
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'LINEUP', 'PICK YOUR STARTERS · THE THIRD IS ON THE BENCH', r.W);
      for (let s = 0; s < 2; s++) {
        const team = teamDef(s ? S.setup.away : S.setup.home), ros = rosterOf(team.id), x = s ? r.W * .52 : r.W * .05, y = r.H * .24, w = r.W * .43;
        E.font.title(g, team.short, x + 10, y - 26, { scale: 2, colors: ['#fffbe8', team.colors.trim], depth: 2 });
        ros.forEach((p, i) => { const yy = y + i * 110, focus = i === S.lineupSel[s] && !S.lineupDone[s]; panel(g, x, yy, w, 100, { border: focus ? C.accent : C.line }); E.font.text(g, p.name + ' #' + p.number, x + 16, yy + 12, focus ? C.ink : '#d8cfee', { scale: 2, outline: false, shadow: '#000' }); E.font.text(g, p.role.toUpperCase(), x + 16, yy + 40, C.cyan, { scale: 1, outline: false }); ratingPips(g, x + w - 200, yy + 10, p, { gap: 10, scale: 1 }); });
        E.font.text(g, S.lineupDone[s] ? 'LOCKED' : (s ? 'AWAY' : 'HOME') + ' CHOOSES', x + 10, y + 340, S.lineupDone[s] ? C.ok : C.muted, { scale: 1, outline: false });
      }
    });
    promptBar(r, [['{confirm}', 'LOCK'], ['{cancel}', 'BACK']]);
  }
};

/* the court and rules (Exhibition): the court cards, the quarter, the CPU, power-ups and twists; START */
const RULE_ROWS = () => [
  { label: 'COURT', sub: COURTS[S.setup.court].name, cycle: 'court' },
  { label: 'QUARTER', sub: setting('quarter') || '2:00', cycle: 'quarter' },
  { label: 'CPU', sub: setting('difficulty') || 'Pro', cycle: 'difficulty' },
  { label: 'POWER-UPS', sub: setting('powerups') || 'On', cycle: 'powerups' },
  { label: 'TWISTS', sub: setting('twists') || 'On', cycle: 'twists' },
  { label: 'START', sub: '', on: () => startExhibition() }
];
const cycleSetting = (key, dir) => { const spec = GAME_SETTINGS.find(s => s.key === key); const i = spec.options.indexOf(game.settings[key]); game.settings.set(key, spec.options[(i + dir + spec.options.length) % spec.options.length]); };
scenes.rules = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'rules'; S.idle = 0; S.rulesList = S.rulesList || new FocusList([], { x: 40, y: 0, gap: 40, w: 420, onBack: () => game.go('lineup', null, { fade: .2 }) }); },
  update(dt) {
    if (screenIdle(dt)) return;
    const rows = RULE_ROWS(); S.rulesList.setItems(rows);
    const L = S.rulesList;
    if (game.input.pressed('left') || game.input.pressed('right')) {
      const row = rows[L.i]; const dir = game.input.pressed('right') ? 1 : -1;
      if (row.cycle === 'court') { const ids = all('court').map(c => c.id); const i = ids.indexOf(S.setup.court); const next = ids[(i + dir + ids.length) % ids.length]; if (COURTS[next]) S.setup.court = next; }
      else if (row.cycle) cycleSetting(row.cycle === 'quarter' ? 'quarter' : row.cycle === 'difficulty' ? 'difficulty' : row.cycle, dir);
    }
    L.nav(dt);
  },
  draw(r) {
    const L = S.rulesList, rows = RULE_ROWS(), c = COURTS[S.setup.court];
    r.sky(c.sky);
    const boxes = L.draw(r, { x: 40, y: r.H * .28, gap: Math.max(34, r.H * .09), w: r.W * .3, scale: 2, subX: r.W * .3 - 80 });
    L.pointer(r, boxes);
    r.overlay(g => {
      screenTitle(g, 'COURT AND RULES', 'LEFT AND RIGHT CHANGE A LINE', r.W);
      const cw = r.W * .5, x = r.W * .42, y = r.H * .2;
      panel(g, x, y, cw, r.H * .6, { border: c.floor.line ? '#2de2ff' : C.line });
      E.font.title(g, c.name, x + 20, y + 16, { scale: 2, colors: ['#fffbe8', '#2de2ff'], depth: 2 });
      E.font.text(g, 'TWIST: ' + ({ jackpot: 'JACKPOT SPOT', wind: 'SEA BREEZE', slick: 'OIL SLICKS', eruption: 'ERUPTIONS AND VENTS', boss: 'THE BLAMBOTS' }[c.twist] || 'NONE'), x + 20, y + 70, C.gold, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'CHOOSE A COURT WITH LEFT AND RIGHT ON THE COURT LINE.', x + 20, y + 96, C.muted, { scale: 1, outline: false });
    });
    promptBar(r, MENU_PROMPT);
  }
};
const startExhibition = () => {
  const s = S.setup;
  s.qLen = { '1:00': 60, '1:30': 90, '2:00': 120, '3:00': 180 }[setting('quarter')] || 120;
  s.difficulty = setting('difficulty');
  s.powerups = setting('powerups') !== 'Off';
  s.twists = setting('twists') !== 'Off';
  const used = { [HOME]: 0, [AWAY]: 0 };
  s.humans = joinState().slots.filter(Boolean).map(sl => { const k = used[sl.side]++; return { slot: sl.side * 2 + k, input: sl.input }; });
  game.allowJoin(false);
  game.go('matchup', null, { fade: .2 });
};

/* the matchup card: the starters face off; the six seconds of codes (§10.8) */
/* the cheat codes (§10.8): entered on the matchup card by any player; each gives a chime and a line, and lasts that game */
const CODES = [
  { name: 'BIG HEADS', steps: ['up', 'up', 'turbo', 'pass'], apply: () => { S.setup.bigHeads = true; } },
  { name: 'POWER-UPS ON', steps: ['shoot', 'shoot', 'pass', 'turbo'], apply: () => { S.setup.powerups = true; } },
  { name: 'INFINITE TURBO', steps: ['turbo', 'turbo', 'turbo', 'up', 'up'], apply: () => { S.setup.cheats = Object.assign(S.setup.cheats || {}, { infTurbo: true }); } },
  { name: 'NO TWISTS', steps: ['down', 'down', 'shove'], apply: () => { S.setup.twists = false; } },
  { name: 'SKY DUNKS', steps: ['oop', 'oop', 'up', 'shoot'], apply: () => { S.setup.cheats = Object.assign(S.setup.cheats || {}, { skyDunks: true }); } },
  { name: 'MOON GRAVITY', steps: ['up', 'oop', 'up', 'oop'], apply: () => { S.setup.cheats = Object.assign(S.setup.cheats || {}, { moonGravity: true }); } },
  { name: 'TOURNAMENT MODE', steps: ['down', 'left', 'right', 'down'], apply: () => { S.setup.powerups = false; S.setup.twists = false; S.setup.tournament = true; S.setup.cheats = Object.assign(S.setup.cheats || {}, { tournament: true }); }, pure: true }
];
const codeEntered = name => { const c = CODES.find(x => x.name === name); if (!c) return; if (S.codes.includes(name)) return; c.apply(); S.codes.push(name); if (!c.pure) S.setup.cheated = true; S.codeChime = game.time; S.matchupT -= 0; caption('comeback', {}, 'VINNIE'); };
scenes.matchup = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'matchup'; S.matchupT = 0; S.codes = []; S.idle = 0; S.setup.cheats = S.setup.cheats || {}; },
  update(dt) {
    S.matchupT += dt;
    for (const c of CODES) { if (S.codes.includes(c.name)) continue; for (const I of game.players) { if (I && I.sequence && I.sequence(c.steps, { window: .6 })) { codeEntered(c.name); S.matchupT -= 2; break; } } }
    if (game.input.pressed('confirm') || game.input.pressed('start')) { return startMatchFromSetup(); }
    if (S.matchupT > 6) startMatchFromSetup();
  },
  draw(r) {
    const home = teamDef(S.setup.home), away = teamDef(S.setup.away);
    r.sky(COURTS[S.setup.court].sky);
    r.overlay(g => {
      screenTitle(g, 'TONIGHT\'S MATCHUP', COURTS[S.setup.court].name, r.W);
      const hp = rosterOf(home.id)[(S.setup.lineup || [0, 0])[0]], ap = rosterOf(away.id)[(S.setup.lineup || [0, 0])[1]];
      if (hp) portraitOf(g, hp.rigObj || (hp.rigObj = dressRig(hp, home)), r.W * .25 - 60, r.H * .3, 120);
      if (ap) portraitOf(g, ap.rigObj || (ap.rigObj = dressRig(ap, away)), r.W * .75 - 60, r.H * .3, 120);
      E.font.text(g, home.short, r.W * .25, r.H * .7, home.colors.jersey, { align: 'center', scale: 2, shadow: '#000', outline: false });
      E.font.text(g, away.short, r.W * .75, r.H * .7, away.colors.jersey, { align: 'center', scale: 2, shadow: '#000', outline: false });
      E.font.text(g, 'VS', r.W / 2, r.H * .4, C.gold, { align: 'center', scale: 4, shadow: '#000', outline: false });
      E.font.text(g, 'CODES: ' + (S.codes.length ? S.codes.join(' · ') : 'ENTER A CODE, OR START TO PLAY'), r.W / 2, r.H * .84, C.muted, { align: 'center', scale: 1, outline: false });
    });
    promptBar(r, [['{confirm}', 'START'], ['{start}', 'SKIP']]);
  }
};
const startMatchFromSetup = () => {
  const s = S.setup;
  game.go('court', { court: s.court, qLen: s.qLen || 120, humans: s.humans.length ? s.humans : [{ slot: 0, input: game.input }], home: s.home, away: s.away, difficulty: s.difficulty, powerups: s.powerups !== false, twists: s.twists !== false, lineup: s.lineup, mode: 'exhibition', cheats: s.cheats || {}, bigHeads: !!s.bigHeads || setting('bigHeads') === 'On', moonGravity: !!(s.cheats && s.cheats.moonGravity) }, { fade: .2 });
};

/* ---- RESULTS: the final, the MVP, BLAM OF THE GAME, a box score on page two ---- */
scenes.results = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter(d) { S.scene = 'results'; S.resultsPage = 0; S.resultsList = new FocusList([], { x: 40, y: 0, gap: 44, w: 300, onBack: () => game.go('menu', null, { fade: .2 }) }); S.results = d || {}; },
  update(dt) {
    if (game.input.pressed('right')) S.resultsPage = Math.min(1, S.resultsPage + 1);
    if (game.input.pressed('left')) S.resultsPage = Math.max(0, S.resultsPage - 1);
    if (S.mode === 'tour') {
      const won = (S.results.match.score[0] > S.results.match.score[1]), margin = Math.abs(S.results.match.score[0] - S.results.match.score[1]);
      S.resultsList.setItems([{ label: 'CONTINUE', on: () => { if (won) { tourResult(true, margin); tourNextAfterWin(); } else { tourResult(false, 0); game.go('loss', null, { fade: .2 }); } } }]);
      S.resultsList.nav(dt);
      return;
    }
    const items = [{ label: 'REMATCH', on: () => { const d = S.results.rematch; if (d) game.go('court', d, { fade: .2 }); else game.go('rules', null); } }, { label: 'NEW TEAMS', on: () => game.go('teams', null, { fade: .2 }) }, { label: 'MAIN MENU', on: () => game.go('menu', null, { fade: .2 }) }];
    S.resultsList.setItems(items); S.resultsList.nav(dt);
  },
  draw(r) {
    const d = S.results, m = d.match || {}, sc = m.score || [0, 0];
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, sc[0] === sc[1] ? 'TIE GAME' : (sc[0] > sc[1] ? (d.homeName || 'HOME') : (d.awayName || 'AWAY')) + ' WINS', d.courtName || '', r.W);
      if (S.resultsPage === 0) {
        E.font.title(g, sc[0] + ' - ' + sc[1], r.W / 2, r.H * .28, { align: 'center', scale: 5, colors: ['#fffbe8', '#ffe08a'], depth: 4 });
        E.font.text(g, 'MVP: ' + (d.mvp || '-'), r.W / 2, r.H * .55, C.gold, { align: 'center', scale: 2, shadow: '#000', outline: false });
        E.font.text(g, 'BLAM OF THE GAME: ' + (d.blam || '-'), r.W / 2, r.H * .63, C.cyan, { align: 'center', scale: 1, shadow: '#000', outline: false });
      } else {
        const rows = d.box || [];
        E.font.text(g, 'PLAYER            PTS  REB  AST  STL  BLK  DNK', r.W * .3, r.H * .3, C.gold, { scale: 1, outline: false });
        rows.forEach((row, i) => E.font.text(g, row, r.W * .3, r.H * .3 + 26 + i * 24, C.ink, { scale: 1, outline: false, shadow: '#000' }));
      }
    });
    S.resultsList.draw(r, { x: r.W * .06, y: r.H * .6, gap: 46, w: 300, scale: 2 });
    promptBar(r, [['{confirm}', 'SELECT'], ['{cancel}', 'MENU']]);
  }
};

/* ---- HALL OF BLAM: the top ten tour scores by initials, and the records ---- */
scenes.hall = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'hall'; S.hallBack = new FocusList([{ label: 'BACK' }], { x: 40, y: 0, gap: 40, w: 200, onBack: () => game.go('menu', null, { fade: .2 }) }); },
  update(dt) { S.hallBack.nav(dt); if (game.input.pressed('cancel')) game.go('menu', null, { fade: .2 }); },
  draw(r) {
    const hall = (S.progress.hall || []).slice(0, 10), rec = S.progress.records;
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'HALL OF BLAM', 'THE TOP TEN TOUR SCORES', r.W);
      panel(g, r.W * .06, r.H * .24, r.W * .55, r.H * .66);
      hall.forEach((h, i) => E.font.text(g, (i + 1 + '').padStart(2, ' ') + '  ' + h.initials + '  ' + h.team.padEnd(12, ' ') + h.score, r.W * .08, r.H * .26 + i * 34, i === 0 ? C.gold : C.ink, { scale: 2, outline: false, shadow: '#000' }));
      if (!hall.length) E.font.text(g, 'NO TOUR SCORES YET.', r.W * .08, r.H * .26, C.muted, { scale: 2, outline: false });
      panel(g, r.W * .66, r.H * .24, r.W * .28, r.H * .3);
      E.font.text(g, 'RECORDS', r.W * .68, r.H * .26, C.gold, { scale: 2, outline: false, shadow: '#000' });
      E.font.text(g, 'MOST POINTS: ' + (rec.mostPoints || 0), r.W * .68, r.H * .34, C.ink, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'BEST DUNK: ' + (rec.bestDunk || '-'), r.W * .68, r.H * .38, C.ink, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'TOURS WON: ' + (rec.toursWon || 0), r.W * .68, r.H * .42, C.ink, { scale: 1, outline: false, shadow: '#000' });
    });
    promptBar(r, [['{cancel}', 'BACK']]);
  }
};

/* ---- HOW TO PLAY: three pages: the controls with their callouts; the rules; the twists and the power-ups ---- */
scenes.howto = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter(d) { S.scene = 'howto'; S.howPage = 0; S.howFrom = d && d.from; },
  update(dt) {
    if (game.input.pressed('right')) S.howPage = Math.min(2, S.howPage + 1);
    if (game.input.pressed('left')) S.howPage = Math.max(0, S.howPage - 1);
    if (game.input.pressed('cancel') || game.input.pressed('confirm') && S.howPage === 2) game.go('menu', null, { fade: .2 });
  },
  draw(r) {
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'HOW TO PLAY', ['CONTROLS', 'RULES: WHAT YOU CAN AND CAN\'T DO', 'TWISTS AND POWER-UPS'][S.howPage] + '  ·  ←/→ TURN', r.W);
      panel(g, r.W * .05, r.H * .24, r.W * .9, r.H * .6);
      const L = [];
      if (S.howPage === 0) {
        for (const [a, label] of Object.entries(ACTION_NAMES)) L.push([a, label]);
        L.forEach(([a, label], i) => { const y = r.H * .28 + i * (r.H * .09); promptLine(g, '{' + a + '}', r.W * .1, y, { scale: 2 }); E.font.text(g, label.toUpperCase(), r.W * .34, y, C.ink, { scale: 2, outline: false, shadow: '#000' }); });
        E.font.text(g, 'MOVE WITH THE STICK OR WASD · HOLD SHOOT TO JUMP, RELEASE AT THE TOP', r.W * .1, r.H * .8, C.cyan, { scale: 1, outline: false });
        E.font.text(g, 'DUNKS NEED TURBO AND RANGE · SUPERNOVA: THREE BASKETS IN A ROW', r.W * .1, r.H * .84, C.cyan, { scale: 1, outline: false });
      } else if (S.howPage === 1) {
        const rules = ['2 ON 2, FULL COURT, FOUR QUARTERS. NO FOULS. NO TRAVELING. NO THREE SECONDS.', 'SHOVING, STEALS AND BODY CONTACT ARE LEGAL.', 'A SHOT CLOCK OF 20 SECONDS. DUNKS NEED TURBO.', 'GOALTENDING COUNTS FOR THE SHOOTER.', 'SUPERNOVA: UNLIMITED TURBO AND MORE POWER, UNTIL THE OTHER SIDE SCORES.', 'A TIE AFTER FOUR: OVERTIME, THEN SUDDEN BLAM.', 'NOBODY LEAVES THE COURT. THREE STRAIGHT = SUPERNOVA.'];
        rules.forEach((t, i) => E.font.text(g, t, r.W * .1, r.H * .28 + i * (r.H * .07), C.ink, { scale: 1, outline: false, shadow: '#000' }));
      } else {
        const twist = ['JACKPOT SPOT: A RING ON THE FLOOR, A MADE JUMP SHOT FROM IT SCORES +2', 'SEA BREEZE: A GUST SHOVES THE BALL. WATCH THE WINDSOCK', 'OIL SLICKS: SLIDE AND SLIP ON THE SHINY SPOTS', 'ERUPTIONS AND VENTS: TELEGRAPHED LAVA BOMBS, A PUFF OF STEAM', 'THE BLAMBOTS: OVERCLOCK, MAGNET HANDS, A SYSTEM REBOOT'];
        twist.forEach((t, i) => E.font.text(g, t, r.W * .1, r.H * .28 + i * (r.H * .07), C.gold, { scale: 1, outline: false, shadow: '#000' }));
        E.font.text(g, 'POWER-UPS: ROCKET KICKS · GLUE GLOVES · LASER SIGHT · MOON SHOES · BLAM BOMB · GOLD BALL', r.W * .1, r.H * .7, C.cyan, { scale: 1, outline: false });
      }
    });
    promptBar(r, [['{cancel}', 'BACK'], ['{confirm}', 'DONE']]);
  }
};

/* ---- ABOUT AND CREDITS: pages, one topic each (←/→ or L1/R1) ---- */
const ABOUT_PAGES = () => [
  { title: 'CREDITS', lines: ['ZONEFIRE: an original arcade basketball demo', 'Engine: my-3D2dge v0.85.2 (MIT), our modified copy', 'AI Hub client: aihub-session 1.4.0 (unmodified)', 'Every sound, song and voice is made in code', 'Courts, teams, the story, the announcer and the rules: all ours', 'Built by claude-haiku-5-5 (medium), from PLAN.md, on 2026-11-04'] },
  { title: 'SOURCE INFORMATION', lines: ['Date: 2026-11-04 06:18:30', 'Source: Basketball, over-the-top arcade style (genre inspiration; an original game)', 'Plan: PLAN.md (built from it; the title ZONEFIRE was drawn this run with a real RNG from 50 candidates)', 'Genre and perspective: arcade sports, 2-on-2 basketball; side-on broadcast camera (orthographic pitch 30), optional High camera', 'Tech: my-3D2dge v0.85.2 (modified), AI Hub session client 1.4.0, plain JavaScript, Canvas 2D, Web Audio', 'Art direction: the engine\'s HD style pushed to 90s arcade broadcast: five courts, each its own mood', 'Animation: the engine\'s rigs posed by math; a hand layer for the ball; a procedural dribble; wind-ups for pass, steal and shove; named celebrations and taunts; per-dunk hand keys, body crouch, slam kick and landing, spins and a flip', 'Audio: music, effects and voices made in code; voices are gibberish with captions', 'Online: AI Hub shared-world session (HUB SHOWDOWN)', 'Testing: 80 headless tests; 3 browser tests; the hub harness (all 4 scenarios pass)', 'Research: none', 'Environment: Claude Code CLI (headless); Linux (WSL2); browser: Chromium for the tests, the player\'s unknown', 'Model: Anthropic, claude-haiku-5-5, reasoning effort medium', 'Usage: about 0.7M tokens (session budget counter); API cost in USD unknown; about one hour'] },
  { title: 'TESTING FEEDBACK', lines: ['Issues caught: about 15; four were game-breaking (a ball trapped on the rim\'s centre, a quarter that never ended, players stuck in their jump, the page failing to start).', 'Most helpful: full CPU-vs-CPU matches to the final whistle, with the event counts (they found most of the rest).', 'Least helpful: the hub harness as a black box; its failures named no cause, so we ran instrumented copies.', 'The physics check (made shots in, decided misses out) was reliable and quick.'] },
  { title: 'ENGINE FEEDBACK', lines: ['Liked most: the HD rigs and their look out of the box; E.TileMap with floorTex; game.advance for headless tests; the Dialog and the input labels.', 'Got stuck or guessed wrong: E.arc\'s apex is the rise over the higher end, not an absolute height; the canvas needs document.body, so scripts must sit at the end of body.', 'Built ourselves: the shot model, the ball physics, the CPU brains, the match flow, the netcode, the voices and the songs.', 'Hardest: the ball against the arena and the rims, and the hands of a rig (the pose internals).', 'Changes to the engine: see ENGINE CHANGES (audio buses, shorts, hair styles, the Dialog voice function).', 'One change to make: a public hook for a rig\'s hand targets, so a pose layer needs no reading of solvePose.'] },
  { title: 'PROMPT FEEDBACK', lines: ['Liked most: the milestones, the tables of numbers and the test list: a clear target.', 'Confusing: the goal and STAGE.md name the folder and the file differently; the title came from a pick the plan made, not one we made.', 'Hardest: the scope in one session: eleven milestones, about 230 tests and a hub check.', 'Would change: split it into a playable core first and the polish after; give the hub check its own budget.'] },
  { title: 'ENGINE CHANGES', lines: ['Each change is marked /* ZONEFIRE: ... */ in the engine.', 'Audio buses (sfxBus, musicBus) so the voice and crowd follow the volume settings.', 'Basketball shorts on the HD legs: pants to the hem, skin below, a sock on the shin.', 'Hair styles afro, flattop and mohawk in the HD head drawing.', 'Dialog voice may be a function (letter, index, page): the gibberish voice speaks each letter.'] },
  ...((S.progress.unlocked && S.progress.unlocked.bots) ? [{ title: 'SECRETS', lines: ['THE CODES (MATCHUP CARD):', ...CODES.map(c => c.name + ': ' + c.steps.join(' · ') + (c.pure ? '  (A PURE GAME)' : ''))] }] : [])
];
scenes.about = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter(d) { S.scene = 'about'; S.aboutPage = (d && d.page) || 0; },
  update() {
    const n = ABOUT_PAGES().length;
    if (game.input.pressed('right') || game.input.pressed('confirm')) S.aboutPage = (S.aboutPage + 1) % n;
    if (game.input.pressed('left')) S.aboutPage = (S.aboutPage + n - 1) % n;
    if (game.input.pressed('cancel')) game.go('menu', null, { fade: .2 });
  },
  draw(r) {
    const pages = ABOUT_PAGES(), P = pages[S.aboutPage];
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, P.title, (S.aboutPage + 1) + ' / ' + pages.length + '  ·  ←/→ TURN', r.W);
      panel(g, r.W * .05, r.H * .24, r.W * .9, r.H * .62);
      P.lines.forEach((t, i) => E.font.text(g, t, r.W * .08, r.H * .28 + i * (r.H * .055), C.ink, { scale: 1, outline: false, shadow: '#000', wrap: r.W * .84 }));
    });
    promptBar(r, [['{cancel}', 'BACK']]);
  }
};
