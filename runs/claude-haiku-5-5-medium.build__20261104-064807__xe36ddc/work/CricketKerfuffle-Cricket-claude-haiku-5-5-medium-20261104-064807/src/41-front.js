/* ---- THE FRONT END: the title, the setup rows, the toss, the story map and its dialogue, the results with the Wisden-
 * style report, the About and Credits pages, Nets and the Super Over Showdown. Every screen has at most six choices,
 * big type, and a footer of prompts that follow the device. ---- */
// the profile: story progress, the teams unlocked (the first two start open; a Quick Match win unlocks the other side),
// and the career stats (sixes hit, the fastest ball bowled). A save that can't be read gives a new profile.
G.profileDefaults = () => ({ v: 1, chapter: 1, stars: [0, 0, 0], best: {}, unlocks: [0, 1], stats: { sixes: 0, fastest: 0 } });
G.profile = () => {
  const p = E.store.get('kerfuffle:profile', null);
  if (!p || p.v !== 1) return G.profileDefaults();
  return Object.assign(G.profileDefaults(), p, { stats: Object.assign({ sixes: 0, fastest: 0 }, p.stats || {}) });
};
G.unlockedTeams = () => { const u = G.profile().unlocks; return G.TEAMS.map((_, i) => i).filter(i => u.includes(i)); };
// a finished match adds its sixes and fastest ball to the career, and a Quick Match win unlocks the other side
G.recordMatch = m => {
  const P = G.profile();
  P.stats.sixes += m.stats.sixes || 0;
  P.stats.fastest = Math.max(P.stats.fastest || 0, m.fastestKmh || 0);
  if (G.setupState && G.setupState.mode === 'quick' && m.result && m.result.winner === 0 && !P.unlocks.includes(m.cfg.teams[1])) P.unlocks.push(m.cfg.teams[1]);
  G.saveProfile(P);
};
G.saveProfile = p => E.store.set('kerfuffle:profile', p);
G.touchOnly = () => {
  const mm = typeof matchMedia === 'function' ? matchMedia('(any-pointer: fine)') : null;
  const touchy = !!(mm && !mm.matches && (navigator.maxTouchPoints || 0) > 0);
  return touchy && !G.nonTouchSeen;
};
G.footer = (r, items) => {
  r.overlay(g => {
    px.rect(g, 0, r.H - 13, r.W, 13, '#0b0814');
    G.promptRow(g, items, 6, r.H - 10);
  });
};
// a row menu: rows of label and values, left and right change a value, up and down move, confirm acts
G.rowMenu = (rows, o = {}) => ({
  rows, i: 0, t: 0,
  update(I, dt) {
    const up = I.pressed('up'), down = I.pressed('down'), left = I.pressed('left'), right = I.pressed('right');
    if (up) this.i = (this.i + rows.length - 1) % rows.length;
    if (down) this.i = (this.i + 1) % rows.length;
    const row = rows[this.i];
    if (row.values && (left || right)) { const n = row.values.length; row.idx = ((row.idx || 0) + (right ? 1 : n - 1)) % n; if (row.onChange) row.onChange(row.values[row.idx], row.idx); G.game.audio.sfx('select', { vol: .3 }); }
    if (I.pressed('confirm') && row.act) { I.consumeAll(); row.act(); return true; }
    if (I.pressed('cancel') && o.back) { I.consumeAll(); o.back(); return true; }
    return false;
  },
  draw(r, x, y) {
    rows.forEach((row, k) => {
      const yy = y + k * 17, sel = k === this.i;
      r.overlay(g => {
        if (sel) { px.rect(g, x - 6, yy - 3, r.W - (x - 6) * 2, 15, '#2f2a52'); px.rect(g, x - 6, yy - 3, 2, 15, '#ffd23a'); }
        E.font.text(g, row.label, x, yy, sel ? '#ffe08a' : '#e8e0f0', { outline: '#0b0814' });
        if (row.values) E.font.text(g, (sel ? '< ' : '') + row.values[row.idx || 0] + (sel ? ' ▸' : ''), r.W - x, yy, sel ? '#ffffff' : '#c8c0e0', { align: 'right', outline: '#0b0814' });
      });
    });
  }
});

/* ---- TITLE: the village green at golden hour, the menu, and the attract timer ---- */
G.scenes.title = {
  view: 'side',
  enter() {
    G.game.lights.enabled = false;
    G.game.setView('side');
    G.game.follow(null);
    G.game.audio.music(G.SONG_TITLE);
    G.idle = 0;
    G.menu = new E.Menu(G.game, [
      { label: 'STORY', disabled: false }, 'QUICK MATCH', 'VERSUS', 'SUPER OVER SHOWDOWN', 'NETS', 'EXTRAS'
    ], { x: 'center', y: 96, onPick: i => G.titlePick(i), onCancel: () => {} });
    G.menu.sound = true;
  },
  update(dt) {
    const I = G.game.input;
    if (I.anyPressed() && I.lastDevice !== 'touch') G.nonTouchSeen = true;
    const busy = I.anyPressed() || (I.mouse && G.mouseMoved(I));
    if (busy) G.idle = 0; else G.idle += dt;
    if (G.idle >= 10 && !G.touchOnly()) { G.game.go('attract', null, { fade: 'black', seconds: 0.4 }); return; }
    if (G.touchOnly()) { if (G.idle >= 10) { G.game.go('attract', null, { fade: 'black', seconds: 0.4 }); return; } return; }
    G.menu.update(dt);
  },
  draw(r) {
    G.drawTitleScene(r, G.game.time);
    if (G.touchOnly()) {
      r.overlay(g => {
        E.ui.box(g, r.W / 2 - 110, r.H / 2 - 44, 220, 88, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.95 });
        E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H / 2 - 30, '#ffe08a', { align: 'center', outline: '#0b0814', wrap: 200 });
        E.font.text(g, 'This game is played with a pad or keys.', r.W / 2, r.H / 2 - 4, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
        E.font.text(g, 'SETTINGS', r.W / 2, r.H / 2 + 22, '#ffffff', { align: 'center', outline: '#0b0814' });
      });
      return;
    }
    G.menu.draw(r);
    G.footer(r, [['shot', 'SELECT'], ['block', 'BACK']]);
    r.overlay(g => {
      E.font.text(g, G.VERSION_LINE, 4, 4, '#8a84a8', { font: 'tiny', outline: '#0b0814' });
      if (Math.floor(G.game.time * 2) % 2) E.font.text(g, 'PRESS ' + (G.game.input.label('shot') || 'ENTER').toUpperCase(), r.W / 2, r.H - 26, '#ffffff', { align: 'center', outline: '#0b0814' });
    });
  }
};
G.VERSION_LINE = 'KERFUFFLE v' + G.VERSION + ' - MY-3D2DGE 0.85.2';
G.titlePick = i => {
  G.game.audio.sfx('confirm');
  if (i === 0) return G.openStory();
  if (i === 1) return G.game.go('setup', { mode: 'quick' });
  if (i === 2) return G.game.go('setup', { mode: 'versus' });
  if (i === 3) return G.game.go('showdown');
  if (i === 4) return G.game.go('nets');
  if (i === 5) return G.game.go('extras');
};
// the title's art: the green, a pavilion, a batter, the cow, and the logo
G.drawTitleScene = (r, t) => {
  r.sky(['#8fc4ff', '#ffe6b0']);
  r.overlay(g => {
    px.rect(g, 0, Math.round(r.H * 0.55), r.W, r.H, '#5e9c3e');
    for (let x = 0; x < r.W; x += 24) px.rect(g, x, Math.round(r.H * 0.55) + 2, 12, r.H, '#6fae4a');
    px.rect(g, 0, Math.round(r.H * 0.55) - 2, r.W, 2, '#ffffff');
    // the pavilion, the tree and the church
    px.rect(g, r.W - 96, Math.round(r.H * 0.36), 80, 40, '#e8e0d0');
    px.rect(g, r.W - 98, Math.round(r.H * 0.34), 84, 6, '#8a2a2a');
    px.rect(g, r.W - 60, Math.round(r.H * 0.42), 14, 18, '#2f6b3a');
    px.disc(g, 40, Math.round(r.H * 0.38), 22, '#2f6b3a');
    px.rect(g, 38, Math.round(r.H * 0.38), 4, 22, '#6a4a2a');
    px.rect(g, 180, Math.round(r.H * 0.3), 10, 30, '#f2ead8');
    px.rect(g, 178, Math.round(r.H * 0.3) - 6, 14, 6, '#8a2a2a');
  });
  r.overlay(g => {
    E.font.title(g, 'CRICKET', r.W / 2, 14, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a', align: 'center' });
    E.font.title(g, 'KERFUFFLE', r.W / 2, 42, { scale: 2, colors: ['#f4fff4', '#8ad8a8', '#2f6b3a'], outline: '#0b1a10', depth: 2, depthColor: '#14301c', align: 'center' });
    E.font.text(g, 'an over-the-top arcade cricket game, with tea', r.W / 2, 66, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
  });
  // the batter knocking up: a stick figure of a batter, animated by the sine of time
  r.overlay(g => {
    const bx = r.W - 150, by = Math.round(r.H * 0.6), sw = Math.sin(t * 2) * 6;
    px.rect(g, bx, by - 22, 4, 22, '#c8b8a0');
    px.rect(g, bx + 4, by - 16, 8, 3, '#f2ead8');
    px.line(g, bx + 8, by - 14, bx + 22 + sw, by - 4, '#6b4a28', 2);
    px.line(g, bx + 14, by - 22, bx + 22 + sw, by - 16, '#e8d8a8', 3);
  });
};

/* ---- EXTRAS: settings, about and credits ---- */
G.scenes.extras = {
  enter() { G.extrasMenu = new E.Menu(G.game, ['SETTINGS', 'ABOUT AND CREDITS'], { x: 'center', y: 110, onPick: i => { if (i === 0) G.game.menu('settings'); else G.game.go('about', { page: 0 }); }, onCancel: () => G.game.go('title') }); },
  update(dt) { if (G.game.input.pressed('cancel')) { G.game.input.consumeAll(); return G.game.go('title'); } G.extrasMenu.update(dt); },
  draw(r) { r.sky(['#2a2052', '#4a3a72']); r.overlay(g => E.font.title(g, 'EXTRAS', r.W / 2, 30, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' })); G.extrasMenu.draw(r); G.footer(r, [['shot', 'SELECT'], ['block', 'BACK']]); }
};

/* ---- SETUP: the match rows for a Quick Match or a Versus, then the toss ---- */
G.scenes.setup = {
  enter(data) {
    const mode = data && data.mode || 'quick';
    // a Quick Match opponent must be unlocked; a Versus has every side
    const open = mode === 'quick' ? G.unlockedTeams() : G.TEAMS.map((_, i) => i);
    const teamVals = G.TEAMS.map(t => t.name);
    G.setupState = { mode, home: 0, away: open.find(i => i !== 0) !== undefined ? open.find(i => i !== 0) : 0, ground: 0, overs: Math.max(0, ['1', '2', '3', '5'].indexOf(G.setting('overs'))), wkts: Math.max(0, ['2', '3', '5', '10'].indexOf(String(G.setting('wickets')))), bat: 0, p2: false, layout: 0 };
    const S = G.setupState;
    G.setupRows = G.rowMenu([
      { label: 'HOME', values: teamVals, idx: S.home, onChange: (v, k) => { S.home = k; if (S.away === k) S.away = (k + 1) % G.TEAMS.length; } },
      { label: 'AWAY', values: open.map(i => teamVals[i]), idx: Math.max(0, open.indexOf(S.away)), onChange: (v, k) => { S.away = open[k]; if (S.home === S.away) S.home = (S.away + 1) % G.TEAMS.length; } },
      { label: 'GROUND', values: G.GROUND_ORDER.map(g => G.GROUNDS[g].name), idx: 0, onChange: (v, k) => { S.ground = k; } },
      { label: 'OVERS', values: ['1', '2', '3', '5'], idx: S.overs, onChange: (v, k) => { S.overs = k; } },
      { label: 'WICKETS', values: ['2', '3', '5', '10'], idx: S.wkts, onChange: (v, k) => { S.wkts = k; } },
      { label: 'TEAMS', values: ['1 v 1', '2 v 2', 'CO-OP'], idx: S.layout, onChange: (v, k) => { S.layout = k; } },
      { label: 'DIFFICULTY', values: ['County', 'Village', 'Test', 'Kerfuffle!'], idx: Math.max(0, ['County', 'Village', 'Test', 'Kerfuffle!'].indexOf(G.setting('difficulty'))), onChange: (v) => { game.settings.set('difficulty', v); } },
      { label: 'KERFUFFLE RULES', values: ['On', 'Off'], idx: G.setting('kerfRules') === 'Off' ? 1 : 0, onChange: (v) => { game.settings.set('kerfRules', v); } },
      { label: mode === 'versus' ? 'PLAYER 2: PRESS START TO JOIN' : 'START MATCH', act: () => G.setupStart(mode) },
      { label: 'BACK', act: () => G.game.go('title') }
    ], { back: () => G.game.go('title') });
    G.setupRows.i = 0;
    // a second player may join the Versus for the Gentlemen's side
    G.game.allowJoin({ max: 4, onJoin: (input, n) => { S.p2 = n >= 2; } });
  },
  exit() { G.game.allowJoin(false); },
  update(dt) {
    const I = G.game.input;
    G.setupRows.update(I, dt);
  },
  draw(r) {
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => E.font.title(g, G.setupState.mode === 'versus' ? 'VERSUS' : 'QUICK MATCH', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
    G.setupRows.draw(r, 24, 50);
    G.footer(r, [['shot', 'CHOOSE'], ['block', 'BACK']]);
  }
};
G.setupStart = mode => {
  const S = G.setupState;
  const home = S.home, away = S.away === S.home ? (S.home + 1) % G.TEAMS.length : S.away;
  const overs = [1, 2, 3, 5][S.overs];
  const wk = [2, 3, 5, 10][S.wkts];
  // the layout: 1 v 1 has a second human for the Gentlemen's side; 2 v 2 has two a side; co-op is two against the CPU
  const layout = ['1v1', '2v2', 'coop'][S.layout];
  G.layout = layout;
  // a side is human only where a player has joined it (the first player is always Kerfuffle's)
  const P = G.game.players || [G.game.input];
  const humanSides = layout === 'coop' ? [0] : (P.length >= 2 ? [0, 1] : [0]);
  G.game.go('toss', { cfg: { teams: [home, away], ground: G.GROUND_ORDER[S.ground], overs, wickets: wk, kerf: G.setting('kerfRules') !== 'Off', seed: 1000 + (G.game.time * 1000 | 0) % 9000, humanSides, mode } });
};

/* ---- THE TOSS: call heads or tails with the coin; the winner bats or bowls ---- */
G.scenes.toss = {
  enter(data) {
    G.tossCfg = data.cfg;
    G.tossStage = 'call'; G.tossT = 0; G.tossResult = null;
    G.tossRng = E.rng(G.tossCfg.seed + 3);
  },
  update(dt) {
    const I = G.game.input;
    G.tossT += dt;
    if (G.tossStage === 'call' && (I.pressed('shot') || I.pressed('block'))) {
      G.tossChoice = I.pressed('shot') ? 'heads' : 'tails';
      G.tossStage = 'flip'; G.tossT = 0; I.consumeAll();
    } else if (G.tossStage === 'flip' && G.tossT > 1.6) {
      const heads = G.tossRng() < 0.5;
      G.tossWon = (heads ? 'heads' : 'tails') === G.tossChoice;
      G.tossStage = 'result'; G.tossT = 0;
      G.game.audio.sfx('coin');
    } else if (G.tossStage === 'result' && G.tossT > 0.6) {
      const humanWins = G.tossWon;
      if (!humanWins) { G.tossStage = 'cpu'; G.tossT = 0; G.tossCpuBat = G.GROUNDS[G.tossCfg.ground].overcast ? false : true; }
      else G.tossStage = 'choose';
    } else if (G.tossStage === 'cpu' && G.tossT > 1.6) {
      G.startTossMatch(!G.tossCpuBat);
    } else if (G.tossStage === 'choose') {
      if (I.pressed('shot')) G.startTossMatch(true);
      else if (I.pressed('block')) G.startTossMatch(false);
    }
  },
  draw(r) {
    r.sky(['#8fc4ff', '#ffe6b0']);
    const cfg = G.tossCfg;
    const home = G.TEAMS[cfg.teams[0]], away = G.TEAMS[cfg.teams[1]];
    r.overlay(g => {
      E.font.title(g, 'THE TOSS', r.W / 2, 16, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, home.name + ' v ' + away.name, r.W / 2, 50, '#ffffff', { align: 'center', outline: '#0b0814' });
      const coin = G.tossStage === 'flip' ? (Math.floor(G.tossT * 12) % 2 ? 'HEADS' : 'TAILS') : G.tossStage === 'result' ? (G.tossWon ? G.tossChoice : G.tossChoice === 'heads' ? 'tails' : 'heads').toUpperCase() : '';
      if (G.tossStage === 'call') E.font.text(g, 'CALL IT: ' + (G.game.input.label('shot') || 'J') + ' HEADS  ' + (G.game.input.label('block') || 'L') + ' TAILS', r.W / 2, r.H / 2 - 10, '#ffe08a', { align: 'center', outline: '#0b0814' });
      if (coin) E.font.text(g, coin, r.W / 2, r.H / 2 - 10, '#ffffff', { scale: 2, align: 'center', outline: '#0b0814' });
      if (G.tossStage === 'result') E.font.text(g, G.tossWon ? 'YOU WON THE TOSS' : 'THE CPU WON THE TOSS', r.W / 2, r.H / 2 + 14, '#ffffff', { align: 'center', outline: '#0b0814' });
      if (G.tossStage === 'choose') E.font.text(g, 'BAT   ' + (G.game.input.label('shot') || 'J') + '        BOWL   ' + (G.game.input.label('block') || 'L'), r.W / 2, r.H / 2 + 14, '#ffe08a', { align: 'center', outline: '#0b0814' });
      if (G.tossStage === 'cpu') E.font.text(g, G.tossCpuBat ? 'THE CPU BATS FIRST' : 'THE CPU BOWLS FIRST', r.W / 2, r.H / 2 + 14, '#ffffff', { align: 'center', outline: '#0b0814' });
    });
    G.footer(r, [['shot', 'HEADS'], ['block', 'TAILS']]);
  }
};
G.startTossMatch = humanBats => {
  const cfg = Object.assign({}, G.tossCfg);
  cfg.batFirst = humanBats ? 0 : 1;
  if (cfg.humanSides && cfg.humanSides.indexOf(0) < 0) cfg.humanSides = [0];
  // the match's batting order: the side batting first is the one that won the bat or bowl choice
  if (!humanBats) cfg.batFirst = 1;
  G.startMatch(cfg, {});
};

/* ---- STORY: the map of the Grand Kerfuffle: three chapters, the prologue, the endings ---- */
G.openStory = () => {
  const P = G.profile();
  if (P.started && (P.chapter > 1 || P.stars.some(x => x > 0))) return G.game.go('storychoice');   // a saved story: Continue or New Game
  if (!P.started) { P.started = true; G.saveProfile(P); G.game.go('cutscene', { lines: G.STORY_PROLOGUE, then: 'story' }); return; }
  G.game.go('story');
};
// a new story clears the campaign progress (chapters and stars) and keeps the profile's unlocks and stats
G.resetStory = () => { const P = G.profile(); P.started = false; P.chapter = 1; P.stars = G.CHAPTERS.map(() => 0); G.saveProfile(P); };
const storyFrame = (r, sub) => {
  r.sky(['#8fc4ff', '#ffe6b0']);
  r.overlay(g => {
    E.font.title(g, 'THE GRAND KERFUFFLE', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
    E.font.text(g, sub, r.W / 2, 58, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
  });
};
G.scenes.storychoice = {
  enter() {
    G.storyChoice = new E.Menu(G.game, ['CONTINUE', 'NEW GAME', 'BACK'], { x: 'center', y: 96, onPick: i => {
      if (i === 0) return G.game.go('story');
      if (i === 1) return G.game.go('storynew');
      return G.game.go('title');
    }, onCancel: () => G.game.go('title') });
  },
  update(dt) { G.storyChoice.update(dt); },
  draw(r) { storyFrame(r, 'A saved story was found.'); G.storyChoice.draw(r); G.footer(r, [['shot', 'CHOOSE'], ['block', 'BACK']]); }
};
G.scenes.storynew = {
  enter() {
    G.storyChoice = new E.Menu(G.game, ['YES, START AGAIN', 'NO, KEEP IT'], { x: 'center', y: 96, onPick: i => {
      if (i === 0) { G.resetStory(); return G.game.go('cutscene', { lines: G.STORY_PROLOGUE, then: 'story' }); }
      return G.game.go('storychoice');
    }, onCancel: () => G.game.go('storychoice') });
  },
  update(dt) { G.storyChoice.update(dt); },
  draw(r) { storyFrame(r, 'Starting again overwrites the saved story. Are you sure?'); G.storyChoice.draw(r); G.footer(r, [['shot', 'CHOOSE'], ['block', 'BACK']]); }
};
G.scenes.story = {
  enter() {
    const P = G.profile();
    G.storyMenu = new E.Menu(G.game, G.CHAPTERS.map(c => ({ label: c.id + '  ' + c.title, disabled: c.id > P.chapter })).concat([{ label: 'BACK', disabled: false }]),
      { x: 'center', y: 80, onPick: i => { if (i === G.CHAPTERS.length) return G.game.go('title'); const c = G.CHAPTERS[i]; if (c.id > P.chapter) return; G.game.go('chapter', { id: c.id }); }, onCancel: () => G.game.go('title') });
  },
  update(dt) { G.storyMenu.update(dt); },
  draw(r) {
    const P = G.profile();
    r.sky(['#8fc4ff', '#ffe6b0']);
    r.overlay(g => {
      E.font.title(g, 'THE GRAND KERFUFFLE', r.W / 2, 12, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'Thrumpton wants the green for parking. Win five matches.', r.W / 2, 40, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.storyMenu.draw(r);
    r.overlay(g => {
      CHAPTER_STARS(g, P, r);
    });
    G.footer(r, [['shot', 'PLAY'], ['block', 'BACK']]);
  }
};
const CHAPTER_STARS = (g, P, r) => {
  G.CHAPTERS.forEach((c, i) => {
    const s = P.stars[i] || 0;
    E.font.text(g, '*'.repeat(s) + '.'.repeat(3 - s), r.W - 60, 80 + i * 17, '#ffd23a', { font: 'tiny', outline: '#0b0814' });
  });
};
// a chapter: its pre-match scene, then the match, the post-match scene and the goals
G.scenes.chapter = {
  enter(data) {
    const c = G.CHAPTERS.find(x => x.id === data.id);
    G.chapter = c;
    G.game.go('cutscene', { lines: c.pre, then: 'chapterMatch' });
  }
};
G.scenes.chapterMatch = {
  enter() {
    const c = G.chapter;
    const cfg = { teams: [0, c.opp], ground: c.ground, overs: c.overs, wickets: c.wickets, kerf: !!c.kerf || c.id >= 2, seed: 77 + c.id * 13, batFirst: c.batFirst ? 0 : 1, humanSides: [0], mode: 'story', chapter: c.id, forceRain: !!c.forceRain };
    G.startMatch(cfg, { chapter: c.id });
  }
};
G.chapterDone = (match) => {
  const c = G.chapter;
  const won = !!(match.result && match.result.winner === 0);
  const view = { won, stats: match.stats, targetsHit: match.targetsHit, innings: match.innings };
  const goals = c.goals.map(([, test]) => !!test(view));
  const stars = goals.filter(Boolean).length;
  const P = G.profile();
  P.stars[c.id - 1] = Math.max(P.stars[c.id - 1] || 0, stars);
  if (won && P.chapter === c.id) P.chapter = c.id + 1;
  G.saveProfile(P);
  G.lastGoals = goals;
  return { won, stars, goals };
};

/* ---- CUTSCENE: the dialogue over a plain backdrop, with a portrait-less caption box ---- */
G.scenes.cutscene = {
  enter(data) {
    G.cut = { lines: data.lines.slice(), then: data.then, idx: 0 };
    G.talk = new E.Dialog(G.game, { lines: 2, place: 'bottom', border: '#e8c070', speed: 42 });
    G.talk.say(G.cut.lines.map(([n, t]) => t), { name: G.cut.lines[0][0], modal: true });
    G.cutLine = 0;
    G.game.audio.music(G.SONG_TEA);
  },
  update(dt) {
    const I = G.game.input;
    if (G.talk && G.talk.update(dt)) return;
    if (I.pressed('shot') || I.pressed('confirm') || I.pressed('cancel')) {
      I.consumeAll();
      return G.cutDone();
    }
  },
  draw(r) {
    r.sky(['#8fc4ff', '#ffe6b0']);
    r.overlay(g => { px.rect(g, 0, Math.round(r.H * 0.6), r.W, r.H, '#5e9c3e'); });
    if (G.talk) G.talk.draw(r);
    G.footer(r, [['shot', 'CONTINUE']]);
  }
};
G.cutDone = () => {
  const then = G.cut.then;
  if (then === 'story') return G.game.go('story');
  if (then === 'chapterMatch') return G.game.go('chapterMatch');
  if (then === 'ending') return G.game.go('cutscene', { lines: G.STORY_ENDING, then: 'title' });
  if (then === 'title') return G.game.go('title');
  return G.game.go('title');
};

/* ---- RESULTS: the banner, the margin, the key stats and the match report, then rematch, continue or menu ---- */
G.matchEnded = m => {
  if (G.matchOpts && G.matchOpts.attract) return G.game.go('attract', null, { fade: 0 });
  if (G.matchOpts && G.matchOpts.lesson) return G.lessonEnded(m);
  if (G.matchOpts && G.matchOpts.hub) return G.hubRoundEnded(m);
  if (G.matchOpts && G.matchOpts.nets) return G.game.go('results', { match: m, kind: 'nets' });
  if (G.matchOpts && G.matchOpts.showdown) {
    const best = E.store.get('kerfuffle:showdown:best', {});
    const score = G.showdownScore(m);
    const key = G.showMode === 'bat' ? 'bat' : 'bowl';
    if (score > (best[key] || 0)) { best[key] = score; E.store.set('kerfuffle:showdown:best', best); }
    G.showScore = score;
    if (G.tableQualifies(key, score)) return G.game.go('initials', { mode: key, score });
    return G.game.go('results', { match: m, kind: 'showdown' });
  }
  if (G.matchOpts && G.matchOpts.chapter) {
    G.recordMatch(m);
    const res = G.chapterDone(m);
    G.chapterResult = res;
    return G.game.go('results', { match: m, kind: 'chapter', res });
  }
  G.recordMatch(m);
  return G.game.go('results', { match: m, kind: 'quick' });
};
G.reportFor = (m) => {
  const res = m.result;
  const A = G.TEAMS[m.cfg.teams[0]], B = G.TEAMS[m.cfg.teams[1]];
  const names = { 0: A.name, 1: B.name };
  if (!res || res.kind === 'tie') return G.MATCH_REPORTS.tie.replace('{hero}', 'the scorer');
  const winner = names[res.winner], loser = names[1 - res.winner];
  const inn = m.innings[0];
  const top = inn.bat.slice().sort((a, b) => b.runs - a.runs)[0];
  const batName = m.team(inn.side).squad[top.p];
  const bowl = m.team(1 - inn.side).squad[m.team(1 - inn.side).bowlers[0]];
  const wkts = inn.wkts, runs = inn.runs;
  const line = res.kind === 'chase'
    ? G.fill(G.MATCH_REPORTS.win, { winner, target: m.innings[1].target, topBat: batName, topRuns: top.runs, notOut: top.out ? '' : ' not out', sixes: m.stats.sixes, topBowl: bowl, wkts, runs })
    : G.fill(G.MATCH_REPORTS.win, { winner, target: m.innings[1] ? m.innings[1].target : runs, topBat: batName, topRuns: top.runs, notOut: '', sixes: m.stats.sixes, topBowl: bowl, wkts, runs });
  return loser && res.kind !== 'chase' ? line.replace(/set \d+,/, 'set ' + (m.innings[1] ? m.innings[1].target : runs) + ',') : line;
};
G.scenes.results = {
  enter(data) {
    G.resData = data;
    const labels = data.kind === 'chapter' ? ['CONTINUE', 'HIGHLIGHTS'] : data.kind === 'nets' || data.kind === 'showdown' ? ['REMATCH', 'MENU'] : ['REMATCH', 'HIGHLIGHTS', 'MENU'];
    G.resLabels = labels;
    G.resMenu = new E.Menu(G.game, labels, { x: 'center', y: 150, onPick: i => G.resultPick(i), onCancel: () => G.game.go('title') });
    G.game.audio.music(G.SONG_TITLE);
    G.resReport = G.reportFor(data.match);
  },
  update(dt) { G.resMenu.update(dt); },
  draw(r) {
    const d = G.resData, m = d.match, res = m.result;
    r.sky(['#2a3a72', '#e8a060']);
    r.overlay(g => {
      const A = G.TEAMS[m.cfg.teams[0]], B = G.TEAMS[m.cfg.teams[1]];
      const win = res && res.winner === 0;
      E.font.title(g, res && res.kind === 'tie' ? 'A TIE!' : win ? 'KERFUFFLE WIN' : (res ? G.TEAMS[m.cfg.teams[res.winner]].name.toUpperCase() + ' WIN' : 'RESULT'), r.W / 2, 10, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      const margin = res ? (res.kind === 'chase' ? 'by ' + res.wicketsLeft + ' wickets' : res.kind === 'defend' ? 'by ' + res.margin + ' runs' : res.kind === 'super' ? 'in a Super Over' : '') : '';
      E.font.text(g, margin, r.W / 2, 42, '#ffffff', { align: 'center', outline: '#0b0814' });
      E.font.text(g, A.id + ' ' + m.innings[0].runs + '/' + m.innings[0].wkts + '   ' + B.id + ' ' + (m.innings[1] ? m.innings[1].runs + '/' + m.innings[1].wkts : '-'), r.W / 2, 56, '#ffe08a', { align: 'center', outline: '#0b0814' });
      E.font.text(g, m.stats.sixes + ' sixes  ' + m.stats.fours + ' fours  ' + m.stats.wickets + ' wickets', r.W / 2, 68, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
      if (d.kind === 'chapter' && d.res) {
        E.font.text(g, d.res.won ? 'STARS EARNED: ' + d.res.stars + ' of 3' : 'THE SCORER SAYS: NEVER MIND, DEAR', r.W / 2, 80, '#ffd23a', { align: 'center', outline: '#0b0814' });
      }
      const words = G.wrapLines(G.resReport || '', r.W - 40, 'tiny');
      words.slice(0, 3).forEach((w, k) => E.font.text(g, w, 20, 96 + k * 9, '#e8e0f0', { font: 'tiny', outline: '#0b0814' }));
    });
    G.resMenu.draw(r);
    G.footer(r, [['shot', 'SELECT']]);
  }
};
G.wrapLines = (s, w, font) => E.font.wrap(s, w, { font });
G.resultPick = i => {
  const d = G.resData;
  if (G.resLabels[i] === 'HIGHLIGHTS') { G.hlReturn = d; return G.game.go('highlights'); }
  if (G.resLabels[i] === 'MENU') return G.game.go('title');
  if (d.kind === 'chapter') {
    const won = G.chapterResult && G.chapterResult.won;
    const lines = won ? G.CHAPTERS[G.chapter.id - 1].post : G.LOSS_LINES;
    const then = !won ? 'story' : G.chapter.id === G.CHAPTERS.length ? 'ending' : 'story';
    return G.game.go('cutscene', { lines, then });
  }
  if (d.kind === 'nets') return G.game.go('nets');
  if (d.kind === 'showdown') return G.game.go('showdown');
  if (i === 0) return G.startMatchFromSetup();
  return G.game.go('title');
};
G.startMatchFromSetup = () => G.startMatch(Object.assign({}, G.lastCfg), G.matchOpts || {});

/* ---- ABOUT AND CREDITS: paged, one topic a page. The text is the same as the chat reply's sections. ---- */
G.scenes.about = {
  enter(data) { G.aboutPage = data && data.page || 0; },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('right') || I.pressed('down')) { G.aboutPage = (G.aboutPage + 1) % G.ABOUT.length; I.consumeAll(); }
    if (I.pressed('left') || I.pressed('up')) { G.aboutPage = (G.aboutPage + G.ABOUT.length - 1) % G.ABOUT.length; I.consumeAll(); }
    if (I.pressed('cancel') || I.pressed('confirm')) { I.consumeAll(); return G.game.go('extras'); }
  },
  draw(r) {
    const page = G.ABOUT[G.aboutPage];
    r.sky(['#241a40', '#3a2a62']);
    r.overlay(g => {
      E.font.title(g, page.title, r.W / 2, 10, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, (G.aboutPage + 1) + ' / ' + G.ABOUT.length, r.W - 6, 6, '#c8c0e0', { font: 'tiny', align: 'right', outline: '#0b0814' });
      page.lines.slice(0, 10).forEach((l, k) => E.font.text(g, l, 14, 40 + k * 14, '#f4f0ff', { font: 'tiny', outline: '#0b0814' }));
    });
    G.footer(r, [['shot', 'BACK'], ['run', 'NEXT PAGE']]);
  }
};
G.ABOUT = [
  { title: 'SOURCE INFORMATION', lines: [
    'Date: 2026-11-04 06:48:07', 'Source: Cricket (over the top arcade style)', 'Plan: PLAN.md (the build folder)',
    'Genre: arcade sports (cricket) with a comedy story', 'Perspective: broadcast camera behind the bowler; a wide follow camera',
    'Tech: my-3D2dge v0.85.2 (unmodified), AI Hub client 1.4.0, plain JavaScript', 'Art: engine HD pixel rigs; a ground, kits and stumps drawn in code',
    'Animation: the engine rigs, poses and E.move("slash") for the swing', 'Audio: chip-synth effects and songs; formant gibberish voices; crowd',
    'Online: AI Hub parallel Super Over, 1 to 4 players. Model: claude-haiku-5-5, effort medium'] },
  { title: 'TECH AND ENGINE', lines: [
    'Engine: my-3D2dge v0.85.2 (MIT, Michael Crosato). Unmodified: no engine files changed.', 'Views: a custom broadcast View (12 deg, scale 1.45) and a wide View.',
    'Floor: a TileMap of 72 by 72 cells, with mown stripes, creases and rope painted in code.', 'Rigs: E.Humanoid in kit colours; the bat is drawn by the game.',
    'Sound: game.audio chip voices; formant voices and crowd noise on its audio context.', 'Hub: the session client is the first script in head; tags follow it.',
    'Tests: node test/run.mjs (headless and bundle) and browser checks in Chromium.', 'Everything else is original and synthesized in code.'] },
  { title: 'ART, ANIMATION AND AUDIO', lines: [
    'Ground: 16-unit cells, mown stripes, white creases, rope, surround.', 'Players: heroic and chibi rigs in kit colours, with bats.',
    'Batting swing: the engine slash move, timed to the contact.', 'Bowling: the run-up and a meter; the release is the rig stride.',
    'Music: a brass march for the title, a bouncy theme for the match.', 'Voices: Sir Aubrey and Dazza in gibberish, captions on.',
    'Crowd: a roar is noise through band-pass filters.', 'No audio files are loaded.'] },
  { title: 'ONLINE AND TESTING', lines: [
    'AI Hub parallel Super Over: six balls, two wickets, the same balls for every copy.', 'The card is the game\'s own: Ready and More time.',
    'node test/run.mjs: 272 checks in twelve suites (ball, sim, specials, features, flow, play, multi, hub, bundle, browser, showcase, brief).', 'Browser: the file opens from file:// with no errors and no requests.',
    'AI Hub harness: passes for 1, 2 and 4 players (4 on a slow, lossy link).', 'Headless: game.advance and game.debug drive every suite.'] },
  { title: 'TESTING FEEDBACK', lines: [
    'Issues found: about a dozen, all fixed. Rigs never animated; the bat and pitch did not draw;', 'the hub round played two innings; the idle timer ran late; the touch gate was off;',
    'the input preset dropped the menu actions; a removed helper broke commentary.', 'Critical (game-breaking for their feature): the hub round, the rigs and the idle timer.',
    'Most helpful: the headless match runs to a result, with the in-play cap and the scorecard check.', 'Least helpful: toss timing checks that needed rewriting after the flow changed.'] },
  { title: 'ENGINE FEEDBACK', lines: [
    'Liked most: the View system and the rig draw, with r.w projection for every point.', 'Stuck: an input preset without the defaults warns; actor drawing is local space.',
    'Built ourselves: the ball physics and predictor, timing, fielders, running, the umpire, the bat.', 'Hardest: a broadcast look and world points drawn inside actors.',
    'Changed in the engine: none. No engine file was edited.', 'Wish: a rig option for a two-handed bat grip, and world points inside actors.'] },
  { title: 'PROMPT FEEDBACK', lines: [
    'Liked most: the exit-interview shape, and the explicit hub and testing rules.', 'Confusing: PLAN.md and TASK.md disagree on names. TASK won, but it cost time.',
    'Hardest: the plan is bigger than one session. The scope had to be cut.', 'Change: a must-have list and a scope budget, and one set of names.'] },
  { title: 'CREDITS', lines: [
    'Cricket Kerfuffle. The Grand Kerfuffle is a comedy in five chapters.', 'Engine: my-3D2dge by Michael Crosato (MIT).',
    'Hub: AI Hub Session Protocol v1, client 1.4.0.', 'Built with Claude Haiku 5.5 (medium effort).',
    'Doris the cow did not ask to be in this, and is thrilled about it.', 'Press BACK to leave.'] }
];
