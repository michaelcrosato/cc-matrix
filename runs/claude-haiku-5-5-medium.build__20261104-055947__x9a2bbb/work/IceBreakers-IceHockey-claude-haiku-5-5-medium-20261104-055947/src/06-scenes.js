/* ---- THE SCENES: the title, attract, exhibition set-up, the Cup Run, cutscenes, results, practice, records, about,
 * dev mode, and the touch-only notice. Every menu answers to the stick, the d-pad, the keys and the mouse. ---- */
const wrap = (v, n) => ((v % n) + n) % n;
const touchOnly = typeof matchMedia === 'function' && matchMedia('(pointer: coarse) and (hover: none)').matches;
const rec = () => Object.assign({ games: 0, wins: 0, goals: 0, hits: 0, kaboomGoals: 0, shutouts: 0, drills: 0, chapters: 0 }, store.get('records', {}));
const STORY_SAVE = () => Object.assign({ cleared: 0, stars: [0, 0, 0, 0, 0] }, store.get('story', {}));
let lastResult = null, attractSeed = 1, idleT = 0, setupRows = [], dev = { kaboom: false };
const setup = { home: 0, away: 1, arena: 0 };
const ITEM_H = 18;

/** a match's set-up: the teams, the arena, the seed, and the modifiers a Cup Run choice gives the player's team */
function makeMatch(cfg) {
  simRng = E.rng(cfg.seed || 1);
  newMatch(cfg);
  const mods = cfg.mods || {};
  if (mods.boom) M.boom[0] = mods.boom;
  if (mods.goalie) M.teams[0].def.goalie.rfx += mods.goalie;
  if (mods.turbo) M.teams[0].def.rate.spd += mods.turbo;
  if (mods.shot) M.teams[0].def.rate.sht += mods.shot;
  if (mods.hit) M.teams[0].def.rate.hit += mods.hit;
  if (mods.defend) { M.teams[0].def.rate.hit += 1; M.teams[0].def.goalie.size += 1; }
  if (mods.fight) M.teams[0].def.rate.fgt += mods.fight;
  // the Cup Run's final: the boss is the rival goalie, quicker and bigger than the rest
  if (cfg.mode === 'story' && cfg.chapter === STORY.length - 1) { M.teams[1].def.goalie.rfx += 2; M.teams[1].def.goalie.size += 2; M.banner = 'BOSS: ' + M.teams[1].def.goalieName; M.bannerT = 3; }
  if (cfg.drill) { M.clock = 999; M.period = 1; if (cfg.drill.kind === 'kaboom') M.boom[0] = 100; }
  if (cfg.attract) { M.clock = 45; for (let t = 0; t < 2; t++) M.boom[t] = 60; }
  return M;
}
/** the exhibition's and the story's set-up: pick a team, an arena, its players (press 2, or Start on a pad, to join) */
function setupRowsFor() {
  return [
    { label: 'YOUR TEAM', value: () => TEAMS[setup.home].name, step: d => { setup.home = wrap(setup.home + d, TEAMS.length); } },
    { label: 'OPPONENT', value: () => TEAMS[setup.away].name, step: d => { setup.away = wrap(setup.away + d, TEAMS.length); if (setup.away === setup.home) setup.away = wrap(setup.away + d, TEAMS.length); } },
    { label: 'ARENA', value: () => ARENAS[setup.arena].name, step: d => { setup.arena = wrap(setup.arena + d, ARENAS.length); } },
    { label: 'PLAYERS', value: () => game.players.length + (game.players.length === 1 ? ' PLAYER' : ' PLAYERS') + '  (2 OR START TO JOIN)', step: () => {} },
    { label: 'FACE OFF', action: () => startExhibition() },
    { label: 'BACK', action: () => game.go('title') }
  ];
}
function startExhibition() {
  if (setup.home === setup.away) { setup.away = (setup.home + 1) % TEAMS.length; }
  game.allowJoin(false);
  game.go('match', { cfg: { teams: [setup.home, setup.away], arena: setup.arena, humans: Math.max(1, Math.min(4, game.players.length)), seed: (Date.now() % 100000) + 1, mode: 'exhibition' } }, { fade: 'iris' });
}
/** the Cup Run: the chapter's game, from its seed and its choice */
function startStory(ch, choice) {
  const s = STORY[ch];
  game.go('match', { cfg: { teams: [0, s.rival], arena: s.arena, humans: Math.max(1, game.players.length), seed: 1000 * (ch + 1) + 7, mode: 'story', chapter: ch, mods: choice || {} } }, { fade: 'iris' });
}
/** a menu row drawn in the 10-foot style: big type, a clear cursor, a value on the right */
function drawRows(g, r, rows, sel, y0) {
  rows.forEach((row, i) => {
    const y = y0 + i * ITEM_H, on = i === sel, x = r.W / 2 - 150;
    E.ui.box(g, x, y - 2, 300, ITEM_H - 2, { bg: on ? '#2b3a64' : '#141826', border: on ? '#ffe08a' : '#3a4060', alpha: .9 });
    E.font.text(g, row.label, x + 8, y + 3, on ? '#fffbe8' : '#c8d0e8', { font: 'normal', outline: '#000' });
    if (row.value) E.font.text(g, row.value(), x + 292, y + 3, on ? '#ffe08a' : '#8a92b8', { font: 'tiny', align: 'right', outline: '#000' });
  });
}
/** the cursor and the mouse: a click picks the row under it (hover moves the cursor), a row's own step (left and right) changes its value */
function listInput(rows, st, y0, r) {
  const I = game.input, n = rows.length;
  if (I.pressed('up')) { st.i = wrap(st.i - 1, n); A.sfx('blip'); }
  if (I.pressed('down')) { st.i = wrap(st.i + 1, n); A.sfx('blip'); }
  const c = I.clicked && I.clicked();
  if (c) rows.forEach((row, i) => { const y = y0 + i * ITEM_H; if (c[0] >= r.W / 2 - 150 && c[0] <= r.W / 2 + 150 && c[1] >= y - 2 && c[1] < y + ITEM_H - 4) { st.i = i; if (row.action) row.action(); else if (row.step) { row.step(1); A.sfx('select'); } } });
  const row = rows[st.i];
  if (I.pressed('left') && row.step) { row.step(-1); A.sfx('blip'); }
  if (I.pressed('right') && row.step) { row.step(1); A.sfx('blip'); }
  if (I.pressed('confirm') && row.action) { I.consume('confirm'); A.sfx('select'); row.action(); }
  if (I.pressed('confirm') && row.step && !row.action) { I.consume('confirm'); row.step(1); }
}

/* the title: the logo, the rink under it, the heroes on the ice, the menu; idle for ten seconds it goes to attract */
const titleMap = buildRink(ARENAS[0]);
const titleItems = touchOnly ? [{ label: 'SETTINGS', disabled: false }] : ['EXHIBITION', 'CUP RUN', 'PRACTICE', 'RECORDS', 'ABOUT & CREDITS', 'SETTINGS'];
const titleMenu = new E.Menu(game, titleItems, { y: 120, onPick(i) {
  if (touchOnly) return game.menu('settings');
  [() => game.go('setup'), () => game.go('story'), () => game.go('practice'), () => game.go('records'), () => game.go('about', { from: 'title' }), () => game.menu('settings')][i]();
} });
scenes.title = {
  view: 'threequarter', views: ['threequarter', 'topdown'], input: KEYS, res: 'ps1', touch: false,
  enter() { A.music('title'); idleT = 0; game.follow(null); game.cam.bounds = null; },
  update(dt) {
    if (game.input.pressed('camera')) game.nextView();
    const any = game.input.anyPressed();
    idleT = any ? 0 : idleT + dt;
    if (idleT > 10) { idleT = 0; game.go('attract', null, { fade: 'iris' }); return; }
    titleMenu.update(dt);
    game.focus(CX, CY, 0);
  },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    titleMap.drawFloor(r); titleMap.queueWalls(r);
    r.overlay(g => {
      E.font.title(g, 'ICE BREAKERS', r.W / 2, 22, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
      E.font.text(g, 'THREE A SIDE. GOALIES. GLASS. KABOOM.', r.W / 2, 62, '#fffbe8', { align: 'center', shadow: '#000', outline: '#000' });
    });
    titleMenu.y = touchOnly ? 168 : 100;
    if (touchOnly) r.overlay(g => { E.ui.box(g, r.W / 2 - 160, 92, 320, 52, { bg: '#141826', border: '#ffe08a', alpha: .9 }); E.font.text(g, 'Controller or keyboard required', r.W / 2, 104, '#fffbe8', { align: 'center', outline: false }); E.font.text(g, 'This game plays on a TV with a pad, or a keyboard and mouse.', r.W / 2, 122, '#c8d0e8', { align: 'center', font: 'tiny', outline: false }); });
    titleMenu.draw(r);
    const how = game.input.lastDevice === 'gamepad' ? 'D-pad to pick   ' + game.input.label('confirm') + ' to play' : 'Arrows or W S to pick   Enter to play   Mouse works too';
    if (!touchOnly) r.text(how, r.W / 2, r.H - 16, '#b8b0d8', { align: 'center', shadow: '#000', outline: false });
  }
};

/* attract: the arena's own game, played by the CPU with BOOM already up, to show the rink. Any press returns to the title. */
scenes.attract = {
  view: 'threequarter', views: ['threequarter', 'topdown'], input: KEYS, res: 'ps1', camera: { zoom: [.7, 1.6] },
  enter() { attractSeed++; const a = attractSeed; makeMatch({ teams: [a % TEAMS.length, (a + 2) % TEAMS.length], arena: a % ARENAS.length, humans: 0, seed: a * 37 + 11, mode: 'attract', attract: true }); A.music(SONG_ATTRACT); },
  update(dt) {
    if (game.input.anyPressed()) { game.go('title', null, { fade: 'iris' }); return; }
    matchStep(dt); rigsStep(dt); talk.update(dt);
    if (M.phase === 'over' && M.timer <= 0) { attractSeed++; makeMatch({ teams: [attractSeed % TEAMS.length, (attractSeed + 2) % TEAMS.length], arena: attractSeed % ARENAS.length, humans: 0, seed: attractSeed * 37 + 11, mode: 'attract', attract: true }); }
  },
  draw(r) { drawMatch(r); r.overlay(g => { E.font.title(g, 'ATTRACT', r.W / 2, 30, { align: 'center', scale: 2, colors: ['#ffe08a', '#ffb347'] }); E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 30, '#fffbe8', { align: 'center', shadow: '#000', outline: false }); }); }
};

/* exhibition set-up */
const setupState = { i: 0 };
scenes.setup = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { setupRows = setupRowsFor(); setupState.i = 0; game.allowJoin({ max: 4 }); game.players.forEach(p => p && p.consumeAll && p.consumeAll()); A.music('title'); },
  exit() { game.allowJoin(false); },
  update(dt) { setupRows = setupRowsFor(); listInput(setupRows, setupState, 62, { W: game.W }); },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'EXHIBITION', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      drawRows(g, r, setupRows, setupState.i, 62);
      E.font.text(g, 'The home side wears its dark colours, the away side white. Keys: arrows, Enter.', r.W / 2, r.H - 30, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* the Cup Run: five games. Each chapter: its intro, one choice, the game, the result. Three stars a chapter. */
const storyState = { i: 0 };
scenes.story = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { storyState.i = Math.min(STORY_SAVE().cleared, STORY.length - 1); A.music('title'); },
  update(dt) {
    const I = game.input, sv = STORY_SAVE();
    if (I.pressed('left')) storyState.i = wrap(storyState.i - 1, STORY.length);
    if (I.pressed('right')) storyState.i = wrap(storyState.i + 1, STORY.length);
    if (I.pressed('cancel')) game.go('title');
    if (I.pressed('confirm')) { I.consume('confirm'); if (storyState.i <= sv.cleared) game.go('cutscene', { chapter: storyState.i }); else A.sfx('cancel'); }
  },
  draw(r) {
    const sv = STORY_SAVE();
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'THE CUP RUN', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      STORY.forEach((s, i) => {
        const x = 8 + i * (r.W - 16) / 5, w = (r.W - 16) / 5 - 6, on = i === storyState.i, locked = i > sv.cleared;
        E.ui.box(g, x, 60, w, 120, { bg: on ? '#2b3a64' : '#141826', border: on ? '#ffe08a' : '#3a4060', alpha: .92 });
        E.font.text(g, 'GAME ' + (i + 1), x + 6, 66, locked ? '#5a6080' : '#ffe08a', { font: 'tiny', outline: false });
        E.font.text(g, locked ? 'LOCKED' : TEAMS[s.rival].name, x + 6, 84, locked ? '#5a6080' : '#fffbe8', { font: 'tiny', outline: false, wrap: w - 12 });
        E.font.text(g, ARENAS[s.arena].name, x + 6, 110, '#8a92b8', { font: 'tiny', outline: false, wrap: w - 12 });
        E.font.text(g, '*'.repeat(sv.stars[i] || 0) || '-', x + 6, 150, '#ffd36a', { font: 'tiny', outline: false });
      });
      const s = STORY[storyState.i];
      E.font.text(g, s.title, r.W / 2, 200, '#ffe7a8', { align: 'center', outline: false });
      E.font.text(g, ARENAS[s.arena].blurb, r.W / 2, 216, '#c8d0e8', { align: 'center', font: 'tiny', outline: false, wrap: r.W - 40 });
      E.font.text(g, prompt('confirm', 'PLAY') + '   ' + prompt('cancel', 'BACK'), r.W / 2, r.H - 26, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* the cutscene: the chapter's lines, then the choice, then the game */
const csState = { ch: 0, step: 0, i: 0, rows: [] };
scenes.cutscene = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter(d) { csState.ch = d.chapter; csState.step = 0; csState.i = 0; csState.pg = new E.Humanoid({ size: 1.2, build: 'bulky', hat: { style: 'helmet', color: TEAMS[0].away }, colors: { cloth: TEAMS[0].home, pants: '#1a1a22', trim: TEAMS[0].trim, boot: '#1a1a20', hair: TEAMS[0].hair[0], skin: TEAMS[0].skin[0], belt: TEAMS[0].trim } }); csState.rv = new E.Humanoid({ size: 1.2, build: 'bulky', hat: { style: 'helmet', color: TEAMS[STORY[d.chapter].rival].away }, colors: { cloth: TEAMS[STORY[d.chapter].rival].home, pants: '#1a1a22', trim: TEAMS[STORY[d.chapter].rival].trim, boot: '#1a1a20', hair: TEAMS[STORY[d.chapter].rival].hair[0], skin: TEAMS[STORY[d.chapter].rival].skin[0], belt: TEAMS[STORY[d.chapter].rival].trim } }); const s = STORY[csState.ch]; csState.rows = [{ label: s.choice.a[0], step: null, action: () => startStory(csState.ch, s.choice.a[1]) }, { label: s.choice.b[0], action: () => startStory(csState.ch, s.choice.b[1]) }]; A.music('title'); },
  update(dt) {
    const I = game.input, s = STORY[csState.ch];
    if (csState.step === 0) { if (I.pressed('confirm') || I.pressed('chirp') || I.pressed('pass')) { I.consume('confirm'); I.consume('pass'); csState.i++; if (csState.i >= s.intro.length) csState.step = 1; } return; }
    listInput(csState.rows, csState, 150, { W: game.W });
  },
  draw(r) {
    const s = STORY[csState.ch];
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.ui.box(g, 16, 30, r.W - 32, r.H - 60, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      E.font.text(g, 'GAME ' + (csState.ch + 1) + ': ' + s.title, r.W / 2, 42, '#ffe08a', { align: 'center', scale: 2, outline: false });
      csState.pg.drawPortrait(g, 52, 70, 34, { zoom: 1.1, turn: .3 });   // (your goalie, and the rival's, in the cutscene)
      csState.rv.drawPortrait(g, r.W - 52, 70, 34, { zoom: 1.1, turn: -.3 });
      if (csState.step === 0) {
        E.font.text(g, s.intro[csState.i] || '', r.W / 2, 132, '#fffbe8', { align: 'center', wrap: r.W - 190, outline: '#000' });
        E.font.text(g, prompt('confirm', 'NEXT'), r.W / 2, r.H - 56, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
      } else {
        E.font.text(g, s.choice.q, r.W / 2, 100, '#fffbe8', { align: 'center', wrap: r.W - 190, outline: false });
        drawRows(g, r, csState.rows, csState.i, 150);
      }
    });
  }
};

/* the results: the score, the stars, the stats; a story game's win moves the Cup Run on */
const resState = { i: 0 };
function resultRows() {
  const L = lastResult || {}, story = L.mode === 'story';
  if (L.mode === 'session') return [];   // (a session's results are the hub's: it removes the game when they are shown)
  const rows = [{ label: story && L.won && L.chapter < STORY.length - 1 ? 'NEXT GAME' : (story ? 'CONTINUE' : 'NEW GAME'), action: () => {
    if (story) { if (L.won && L.chapter < STORY.length - 1) game.go('story'); else if (L.won) game.go('credits'); else game.go('story'); }
    else if (L.drill) game.go('practice'); else game.go('setup');
  } }];
  if (L.drill) rows[0] = { label: L.drill.ok ? 'NEXT DRILL' : 'TRY AGAIN', action: () => game.go('practice') };
  rows.push({ label: 'MENU', action: () => game.go('title') });
  return rows;
}
scenes.results = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { resState.i = 0; A.music('victory'); },
  update(dt) { if (Net.live || (lastResult && lastResult.mode === 'session')) return; listInput(resultRows(), resState, 150, { W: game.W }); },
  draw(r) {
    const L = lastResult || {};
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.ui.box(g, 16, 20, r.W - 32, r.H - 40, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      const head = L.won === undefined ? (L.draw ? 'A DRAW' : 'FULL TIME') : L.won ? 'WIN!' : 'LOSS';
      E.font.title(g, head, r.W / 2, 26, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      E.font.text(g, (L.home || '') + '  ' + (L.score || '') + '  ' + (L.away || ''), r.W / 2, 60, '#fffbe8', { align: 'center', scale: 2, outline: false });
      E.font.text(g, 'THE THREE STARS', r.W / 2, 84, '#ffe7a8', { align: 'center', font: 'tiny', outline: false });
      (L.stars || []).forEach((s, i) => E.font.text(g, (i + 1) + '  ' + s.name + '  ' + s.g + 'G ' + s.a + 'A ' + s.hits + 'H', r.W / 2, 96 + i * 10, '#c8d0e8', { align: 'center', font: 'tiny', outline: false }));
      if (L.line) E.font.text(g, L.line, r.W / 2, 130, '#ffe7a8', { align: 'center', font: 'tiny', outline: false, wrap: r.W - 60 });
      if (L.stars2 !== undefined) E.font.text(g, '*'.repeat(L.stars2) + ' CUP RUN GAME ' + (L.chapter + 1), r.W / 2, 178, '#ffd36a', { align: 'center', font: 'tiny', outline: false });
      drawRows(g, r, resultRows(), resState.i, 150);
    });
  }
};

/* the practice: Coach Marge's three drills, each an objective and a clock */
const DRILLS = [
  { id: 'wrist', name: 'WRIST SHOT', goal: 'Score 3 goals', need: 3, limit: 120, line: 'Hold the shot button for a second: that is the wind-up.' },
  { id: 'pass', name: 'PASS AND TAP', goal: 'Complete 4 passes to a teammate', need: 4, limit: 120, line: 'Point the stick at a teammate and tap pass. Your team mates make the rest.' },
  { id: 'hit', name: 'HIT AND HOLD', goal: 'Land 2 big hits', need: 2, limit: 150, line: 'Skate into them with the shoot button. Turbo gives you more to land.' },
  { id: 'onGoal', name: 'ON NET', goal: 'Put 3 shots on net', need: 3, limit: 150, line: 'Get in front of the net, inside the faceoff circle, and shoot at the mouth.' },
  { id: 'fight', name: 'DROP THE GLOVES', goal: 'Win a fight', need: 1, limit: 150, line: 'Lob at a rival within reach to drop the gloves, then tap pass and shoot to swing.' },
  { id: 'kaboom', name: 'KABOOM', goal: 'Score a KABOOM goal', need: 1, limit: 150, line: 'Your BOOM meter starts full, so your team goes KABOOM. A full wind-up makes a KABOOM shot.' },
  { id: 'glass', name: 'GLASS', goal: 'Break 1 glass panel', need: 1, limit: 150, line: 'Skate hard into the boards. The glass is not as strong as it looks.' }
];
const drillState = { i: 0 };
scenes.practice = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { drillState.i = 0; A.music('title'); },
  update() { const rows = DRILLS.map(d => ({ label: d.name, action: () => game.go('match', { cfg: { teams: [0, 2], arena: 0, humans: 1, seed: 99 + DRILLS.indexOf(d), mode: 'practice', drill: { kind: d.id, need: d.need, limit: d.limit, name: d.name, goal: d.goal } } }, { fade: 'iris' }) })).concat([{ label: 'BACK', action: () => game.go('title') }]); listInput(rows, drillState, 60, { W: game.W }); },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'PRACTICE', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      E.font.text(g, 'COACH MARGE SAYS: THE OL\' ICEBOX ICE IS COLD. GET ON IT.', r.W / 2, 60, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
      DRILLS.forEach((d, i) => { E.font.text(g, d.name + ': ' + d.goal, r.W / 2 - 150, 60 + i * 16, i === drillState.i ? '#ffe08a' : '#c8d0e8', { font: 'tiny', outline: '#000' }); });
      E.font.text(g, DRILLS[drillState.i].line, r.W / 2, 186, '#fffbe8', { align: 'center', font: 'tiny', outline: false, wrap: r.W - 60 });
      E.font.text(g, prompt('confirm', 'START') + '   ' + prompt('cancel', 'BACK'), r.W / 2, r.H - 30, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* the records: the career totals, kept by the game */
scenes.records = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { A.music('title'); },
  update() { if (game.input.pressed('cancel') || game.input.pressed('confirm')) { game.input.consumeAll(); game.go('title'); } },
  draw(r) {
    const R = rec();
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.ui.box(g, 16, 16, r.W - 32, r.H - 32, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      E.font.title(g, 'RECORDS', r.W / 2, 26, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      const rows = [['GAMES PLAYED', R.games], ['WINS', R.wins], ['GOALS', R.goals], ['BIG HITS', R.hits], ['KABOOM GOALS', R.kaboomGoals], ['SHUTOUTS', R.shutouts], ['DRILLS DONE', R.drills], ['CUP RUN GAMES WON', R.chapters]];
      rows.forEach(([k, v], i) => { E.font.text(g, k, r.W / 2 - 120, 70 + i * 16, '#c8d0e8', { outline: false }); E.font.text(g, String(v), r.W / 2 + 120, 70 + i * 16, '#ffe08a', { align: 'right', outline: false }); });
      E.font.text(g, prompt('confirm', 'BACK'), r.W / 2, r.H - 34, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* about: the credits, then the source information and the feedback the game was built with */
const ABOUT_PAGES = [
  { title: 'CREDITS', lines: TEXT.credits },
  { title: 'SOURCE INFORMATION', lines: SOURCE_LINES },
  { title: 'TESTING FEEDBACK', lines: TESTING_LINES },
  { title: 'ENGINE FEEDBACK', lines: ENGINE_LINES },
  { title: 'PROMPT FEEDBACK', lines: PROMPT_LINES }
];
const aboutState = { p: 0, from: 'title' };
scenes.about = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter(d) { aboutState.p = 0; aboutState.from = d && d.from || 'title'; A.music('title'); },
  update() {
    const I = game.input;
    if (I.pressed('right')) aboutState.p = wrap(aboutState.p + 1, ABOUT_PAGES.length);
    if (I.pressed('left')) aboutState.p = wrap(aboutState.p - 1, ABOUT_PAGES.length);
    if (I.pressed('cancel') || I.pressed('confirm')) { I.consumeAll(); if (aboutState.from === 'match') game.go('match', { resume: true }); else game.go('title'); }
  },
  draw(r) {
    const pg = ABOUT_PAGES[aboutState.p];
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.ui.box(g, 10, 10, r.W - 20, r.H - 20, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      E.font.title(g, pg.title, r.W / 2, 16, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      let y = 50;
      for (const ln of pg.lines) { const h = E.font.text(g, ln, 22, y, '#e8e4f4', { font: 'tiny', outline: false, wrap: r.W - 44 }); y += h.h + 4; }
      E.font.text(g, prompt('left', '<') + ' ' + prompt('right', '>') + ' PAGES   ' + prompt('confirm', 'BACK'), r.W / 2, r.H - 26, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
scenes.credits = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { A.music('victory'); creditT = 0; },
  update(dt) { creditT += dt; if (game.input.anyPressed() && creditT > 1) { game.go('story'); } if (creditT > 60) game.go('title'); },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => { TEXT.credits.forEach((ln, i) => E.font.text(g, ln, r.W / 2, r.H - creditT * 14 + i * 22, i === 0 ? '#ffe08a' : '#e8e4f4', { align: 'center', scale: i === 0 ? 2 : 1, outline: '#000' })); });
  }
};
let creditT = 0;

/* dev mode: the live sliders, the cheats, a reset to the defaults. From the pause menu, or #dev. */
const devState = { i: 0, from: 'title' };
function devRows() {
  const rows = TUNE_KEYS.map(k => ({ label: TUNE_META[k][1], value: () => { const v = T[k], st = TUNE_META[k][4]; return (st < 1 ? v.toFixed(2) : String(Math.round(v))) + (T[k] === TUNE_DEFAULTS[k] ? '' : ' *'); }, step: d => tuneSet(k, T[k] + d * TUNE_META[k][4]), action: () => tuneReset(k) }));
  rows.push({ label: 'CHEAT: INFINITE KABOOM', value: () => dev.kaboom ? 'ON' : 'OFF', step: () => { dev.kaboom = !dev.kaboom; }, action: () => { dev.kaboom = !dev.kaboom; } });
  rows.push({ label: 'CHEAT: FILL BOOM', action: () => { if (M) M.boom = [100, 100]; } });
  rows.push({ label: 'CHEAT: END THE PERIOD NOW', action: () => { if (M && M.phase === 'play') M.clock = 0.01; } });
  rows.push({ label: 'OPEN THE ANIMATION LAB', action: () => game.go('lab', { from: 'dev' }) });
  rows.push({ label: 'CHEAT: OCTOPUS ON THE ICE', action: () => { if (M) (M.slips = M.slips || []).push({ x: CX, y: CY, r: 10 }); } });
  rows.push({ label: 'RESET ALL TO DEFAULTS', action: () => { tuneReset(); } });
  rows.push({ label: 'BACK', action: () => game.go(devState.from === 'match' ? 'match' : devState.from, devState.from === 'match' ? { resume: true } : null) });
  return rows;
}
scenes.dev = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter(d) { devState.from = d && d.from || 'title'; devState.i = 0; A.music(null); },
  update() { listInput(devRows(), devState, 40, { W: game.W }); },
  draw(r) {
    const rows = devRows(), grp = i => TUNE_META[TUNE_KEYS[i]] ? TUNE_META[TUNE_KEYS[i]][0] : '';
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    const start = Math.max(0, Math.min(devState.i - 5, rows.length - 11));
    r.overlay(g => {
      E.font.title(g, 'DEV MODE', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      E.ui.box(g, 8, 34, r.W - 16, r.H - 42, { bg: '#0c1020', border: '#3a4060', alpha: .9 });
      const win = rows.slice(start, start + 11);
      win.forEach((row, j) => {
        const i = start + j, y = 40 + j * ITEM_H, on = i === devState.i, x = r.W / 2 - 150;
        E.ui.box(g, x, y - 2, 300, ITEM_H - 2, { bg: on ? '#2b3a64' : '#141826', border: on ? '#ffe08a' : '#3a4060', alpha: .9 });
        E.font.text(g, row.label, x + 8, y + 3, on ? '#fffbe8' : '#c8d0e8', { font: 'tiny', outline: '#000' });
        if (row.value) E.font.text(g, row.value(), x + 292, y + 3, on ? '#ffe08a' : '#8a92b8', { font: 'tiny', align: 'right', outline: '#000' });
      });
      E.font.text(g, 'LEFT / RIGHT: CHANGE   ENTER: RESET OR TOGGLE   * CHANGED', r.W / 2, r.H - 16, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* the animation lab (dev): every pose and attack of the rig, one after another, on a skater in the rink's kit */
const LAB_POSES = ['idle', 'cheer', 'guard', 'kneel', 'crouch', 'wave', 'hips', 'down', 'die', 'block'];
const LAB_MOVES = ['jab', 'cross', 'hook', 'uppercut', 'haymaker', 'elbow', 'slash', 'thrust'];
const labState = { i: 0, t: 0, from: 'title' };
scenes.lab = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter(d) {
    labState.i = 0; labState.t = 0; labState.from = d && d.from || 'title';
    labState.rig = new E.Humanoid({ size: 1.4, build: 'heroic', hair: 'spiky', colors: { cloth: TEAMS[0].home, pants: '#1a1a22', trim: TEAMS[0].trim, boot: '#1a1a20', hair: TEAMS[0].hair[1], skin: TEAMS[0].skin[1], belt: TEAMS[0].trim } });
    game.follow(null); game.cam.bounds = null; game.focus(0, 0, 14);
  },
  update(dt) {
    const I = game.input, n = LAB_POSES.length + LAB_MOVES.length;
    labState.t += dt;
    if (I.pressed('right')) { labState.i = (labState.i + 1) % n; labState.t = 0; }
    if (I.pressed('left')) { labState.i = (labState.i - 1 + n) % n; labState.t = 0; }
    if (I.pressed('cancel')) { I.consumeAll(); game.go(labState.from === 'dev' ? 'title' : 'title'); return; }
    const k = labState.i;
    const state = k < LAB_POSES.length ? { pose: LAB_POSES[k] === 'idle' ? null : LAB_POSES[k] } : { attack: E.move(LAB_MOVES[k - LAB_POSES.length], Math.min(1, (labState.t % 1.4) / 1.4)) };
    labState.rig.update(dt, Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }, state));
  },
  draw(r) {
    const k = labState.i, name = k < LAB_POSES.length ? LAB_POSES[k] : LAB_MOVES[k - LAB_POSES.length];
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.shadow(0, 0, 8, .35);
    r.actor(0, 0, 0, (g, ox, oy) => labState.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'ANIMATION LAB', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      E.font.text(g, (k < LAB_POSES.length ? 'POSE: ' : 'MOVE: ') + name.toUpperCase() + '   ' + (k + 1) + ' / ' + (LAB_POSES.length + LAB_MOVES.length), r.W / 2, r.H - 40, '#ffe7a8', { align: 'center', outline: '#000' });
      E.font.text(g, prompt('left', 'PREVIOUS') + '   ' + prompt('right', 'NEXT') + '   ' + prompt('cancel', 'BACK'), r.W / 2, r.H - 24, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
