// The front end: the title (with its mode menu, the touch-only card and the idle timer that starts the attract mode), the
// exhibition setup, the match results, the Playbook and the About screens, and the attract loop (a CPU match with cheats).
BZ.isTouchOnly = () => {
  if (location.hash === '#touch') return true;
  try {
    return (navigator.maxTouchPoints > 0) && !matchMedia('(any-pointer: fine)').matches;
  } catch (e) { return false; }
};

// Any press or pointer movement counts as input for the idle timer.
BZ.anyInput = game => {
  const I = game.input;
  if (I.anyPressed()) return true;
  const p = I.pointer(), last = BZ.lastPointer;
  BZ.lastPointer = p ? p.slice() : null;
  return !!(p && last && (p[0] !== last[0] || p[1] !== last[1]));
};

BZ.titleScene = {
  enter() {
    BZ.idle = 0; BZ.playSong('title');
    const touchOnly = BZ.isTouchOnly();
    BZ.touchOnly = touchOnly;
    const items = touchOnly ? ['OPTIONS'] : ['PLAY BALL', 'HOME RUN DERBY', 'SPRING TRAINING', 'OPTIONS', 'ABOUT'];
    BZ.titleMenu = new E.Menu(BZ.game, items, {
      x: 'center', y: BZ.game.H * .56, title: null,
      onPick: (i) => {
        const label = items[i];
        if (label === 'OPTIONS') BZ.game.menu('settings');
        else if (label === 'PLAY BALL') BZ.game.go('exhibition');
        else if (label === 'HOME RUN DERBY') BZ.game.go('derbySetup');
        else if (label === 'SPRING TRAINING') BZ.game.go('training');
        else if (label === 'ABOUT') BZ.game.go('about', { page: 0 });
      }
    });
  },
  exit() { BZ.playSong(null); },
  update(dt) {
    const game = BZ.game;
    if (BZ.anyInput(game)) BZ.idle = 0; else BZ.idle += dt;
    if (BZ.idle > 10) { BZ.idle = 0; game.go('attract'); return; }
    BZ.titleMenu.update(dt);
  },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#0c1430', '#3a2a60']);
    // a ballpark in silhouette: the stands and the lights
    r.overlay(g => {
      E.px.rect(g, 0, Math.round(H * .66), W, H, '#1a2a1a');
      for (let i = 0; i < 12; i++) E.px.rect(g, 8 + i * (W / 12), Math.round(H * .48), 4, Math.round(H * .2), '#2a2a3a');
      for (let i = 0; i < 4; i++) E.px.disc(g, 40 + i * (W / 4), Math.round(H * .44), 3, '#ffe6a0');
    });
    r.overlay(g => {
      E.font.title(g, 'BATZOOKA', W / 2, H * .12, { scale: 3, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a' });
      E.font.title(g, 'BASEBALL', W / 2, H * .12 + 34, { scale: 2, align: 'center', colors: ['#e8f4ff', '#9ac8ff'], outline: '#0a1020', depth: 2, depthColor: '#1a2a4a' });
      BZ.text(g, 'OVER THE TOP. OVER THE WALL. OVER THE MOON.', W / 2, H * .36, '#ffe6a0', { align: 'center', scale: 1.1 });
    });
    if (BZ.touchOnly) {
      r.overlay(g => {
        E.ui.box(g, W / 2 - 170, H * .4, 340, 34, { bg: ['#1a1d2a', '#0b0d16'], border: '#ffe6a0', alpha: .9 });
        BZ.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, H * .4 + 12, '#ffe6a0', { align: 'center', scale: 1.2 });
      });
    }
    BZ.titleMenu.draw(r);
    r.overlay(g => BZ.text(g, BZ.prompt('confirm', 'SELECT') + '   ' + BZ.prompt('pause', 'MENU'), W / 2, H * .92, '#c8d0f0', { align: 'center', scale: 1.2, shadow: null }));
  }
};

// The exhibition setup: the innings, the park, a second player (who joins with Start), and Play Ball.
BZ.exhibitionOpts = { innings: 3, park: 'kernel' };
BZ.INNINGS = [1, 3, 5, 7, 9];
BZ.exhibitionScene = {
  enter() { BZ.game.allowJoin({ max: 2 }); BZ.setupRow = 0; BZ.playSong('title'); },
  exit() { BZ.game.allowJoin(false); },
  update() {
    const game = BZ.game, I = game.input, o = BZ.exhibitionOpts, rows = 4;
    if (I.pressed('cancel')) { game.go('title'); return; }
    if (I.pressed('down')) BZ.setupRow = (BZ.setupRow + 1) % rows;
    if (I.pressed('up')) BZ.setupRow = (BZ.setupRow + rows - 1) % rows;
    // the mouse: a row under the pointer is the focus, and a click picks it
    const p = game.input.pointer(), click = game.input.clicked();
    let rowAt = null;
    if (p) {
      const r = Math.floor((p[1] - game.H * .36 + 4) / 32);
      if (r >= 0 && r < rows && p[0] > game.W / 2 - 150 && p[0] < game.W / 2 + 150) rowAt = r;
    }
    if (rowAt !== null) BZ.setupRow = rowAt;
    const step = I.pressed('right') ? 1 : I.pressed('left') ? -1 : 0;
    if (step && BZ.setupRow === 0) o.innings = BZ.INNINGS[BZ.clamp(BZ.INNINGS.indexOf(o.innings) + step, 0, BZ.INNINGS.length - 1)];
    if (step && BZ.setupRow === 1) o.park = o.park === 'kernel' ? 'moondome' : 'kernel';
    if (I.pressed('confirm') || (click && rowAt !== null)) {
      if (BZ.setupRow === 0) o.innings = BZ.INNINGS[(BZ.INNINGS.indexOf(o.innings) + 1) % BZ.INNINGS.length];
      else if (BZ.setupRow === 1) o.park = o.park === 'kernel' ? 'moondome' : 'kernel';
      else if (BZ.setupRow === 2) BZ.playBall(game);
      else game.go('title');
    }
  },
  draw(r) {
    const W = r.W, H = r.H, o = BZ.exhibitionOpts, n = BZ.game.players.length;
    r.sky(['#101848', '#402a70']);
    const names = ['INNINGS  ' + o.innings, 'PARK  ' + BZ.PARKS[o.park].name.toUpperCase(), 'PLAY BALL', 'BACK'];
    r.overlay(g => {
      E.font.title(g, 'EXHIBITION', W / 2, H * .1, { scale: 2, align: 'center' });
      BZ.text(g, 'P1 HOME  ·  ' + (n > 1 ? 'P2 VISITORS' : 'PRESS START FOR P2, THE VISITORS'), W / 2, H * .24, '#ffe6a0', { align: 'center', scale: 1.2 });
      names.forEach((label, i) => {
        const on = BZ.setupRow === i, y = H * .36 + i * 32;
        E.ui.box(g, W / 2 - 150, y - 4, 300, 26, { bg: on ? ['#ffe6a0', '#c8a060'] : ['#1a1d2a', '#0b0d16'], border: on ? '#ffffff' : '#c8a060', alpha: .9 });
        BZ.text(g, label, W / 2, y + 4, on ? '#1a1020' : '#ffffff', { align: 'center', scale: 1.7, shadow: null });
      });
      BZ.text(g, 'LEFT AND RIGHT CHANGE  ·  ' + BZ.prompt('confirm', 'PICK'), W / 2, H * .9, '#c8d0f0', { align: 'center', scale: 1.1 });
    });
  }
};

// Play ball: a match with the player (or two) on the sides they chose.
BZ.playBall = game => {
  const o = BZ.exhibitionOpts;
  BZ.field = null;
  BZ.park = o.park;
  BZ.field = BZ.buildField();
  BZ.startMatch(game, { innings: o.innings, p1: 1, human: [!!game.players[1], true], seed: 20261104 + o.innings });
};

// The match's results: the line score, the winner, the drill (for a lesson), and the way on.
BZ.resultsScene = {
  enter(data) {
    BZ.resultsData = data;
    BZ.resultsDone = data.drill ? BZ.lessonResult(BZ.M) : null;
    BZ.playSong('results');
  },
  exit() { BZ.playSong(null); },
  update() {
    const game = BZ.game, I = game.input, d = BZ.resultsData;
    if (I.pressed('confirm')) {
      if (d.opts && d.opts.lesson) return game.go('training');
      if (d.opts && d.opts.attract) return game.go('attract');
      return BZ.playBall(game);
    }
    if (I.pressed('cancel')) game.go(d.opts && d.opts.lesson ? 'training' : 'title');
  },
  draw(r) {
    const W = r.W, H = r.H, d = BZ.resultsData, S = d.S, L = BZ.lineScore(S), park = BZ.PARKS[BZ.park];
    r.sky(park.night ? ['#060818', '#2a2a5a'] : park.sky);
    r.overlay(g => {
      E.ui.box(g, W / 2 - 220, 14, 440, H - 28, { bg: ['#1a1d2a', '#0b0d16'], border: '#c8a060', alpha: .92 });
      E.font.title(g, 'FINAL', W / 2, 26, { scale: 2, align: 'center' });
      const x0 = W / 2 - 200, cols = L.cols, cw = Math.min(26, 300 / (cols + 3));
      BZ.text(g, 'TEAM', x0, 70, '#c8d0f0', { scale: 1.2 });
      for (let i = 0; i < cols; i++) BZ.text(g, String(i + 1), x0 + 120 + i * cw, 70, '#c8d0f0', { scale: 1.2, align: 'center' });
      BZ.text(g, 'R', x0 + 120 + cols * cw + 12, 70, '#ffe6a0', { scale: 1.2, align: 'center' });
      BZ.text(g, 'H', x0 + 120 + cols * cw + 12 + 28, 70, '#ffe6a0', { scale: 1.2, align: 'center' });
      [0, 1].forEach(t => {
        const y = 92 + t * 22, row = t === 0 ? L.away : L.home;
        BZ.text(g, BZ.TEAMS[t].short, x0, y, BZ.TEAMS[t].color, { scale: 1.4 });
        for (let i = 0; i < cols; i++) BZ.text(g, row[i] || '', x0 + 120 + i * cw, y, '#ffffff', { scale: 1.2, align: 'center' });
        BZ.text(g, String(S.score[t]), x0 + 120 + cols * cw + 12, y, '#ffe6a0', { scale: 1.6, align: 'center' });
        BZ.text(g, String(S.hits[t]), x0 + 120 + cols * cw + 40, y, '#ffffff', { scale: 1.2, align: 'center' });
      });
      const winner = S.score[0] === S.score[1] ? 'A TIE: THE SEASON GOES ON' : BZ.TEAMS[S.score[0] > S.score[1] ? 0 : 1].name.toUpperCase() + ' WIN';
      BZ.text(g, winner, W / 2, 150, '#ffe6a0', { align: 'center', scale: 1.6 });
      if (d.drill) {
        const done = BZ.resultsDone;
        BZ.text(g, done ? 'LESSON COMPLETE' : 'NOT YET: ' + d.drill.got + ' OF ' + d.drill.goal, W / 2, 180, done ? '#7ad06a' : '#ff9a6a', { align: 'center', scale: 1.7 });
      }
      BZ.text(g, BZ.prompt('confirm', d.opts && d.opts.lesson ? 'BACK TO TRAINING' : 'PLAY AGAIN') + '     ' + BZ.prompt('cancel', 'TITLE'), W / 2, H - 36, '#ffffff', { align: 'center', scale: 1.4 });
    });
  }
};

// The Playbook: how to play, by device, and the rules the game keeps, simplifies and leaves out. Pages in the box.
BZ.playbookScene = {
  enter(data) {
    BZ.talk = BZ.talkFor(BZ.game);
    BZ.talk.say(BZ.PLAYBOOK, { name: 'PLAYBOOK', modal: true, onDone: () => BZ.game.go(BZ.backScene || 'title') });
  },
  exit() {},
  update(dt) { BZ.talk.update(dt); },
  draw(r) { r.sky(['#101848', '#402a70']); BZ.talk.draw(r); }
};

// About and Credits: the pages in the box, the Source Information and the feedback among them.
BZ.aboutScene = {
  enter() {
    BZ.talk = BZ.talkFor(BZ.game);
    BZ.talk.say(BZ.ABOUT, { name: 'ABOUT', modal: true, onDone: () => BZ.game.go(BZ.backScene || 'title') });
  },
  exit() {},
  update(dt) { BZ.talk.update(dt); },
  draw(r) { r.sky(['#101848', '#402a70']); BZ.talk.draw(r); }
};

// The attract mode: a CPU match with cheats (the Batzooka is always full), looping, until any input.
BZ.startAttract = game => {
  BZ.field = BZ.field || BZ.buildField();
  BZ.attractN = (BZ.attractN || 0) + 1;
  BZ.M = BZ.newMatchRun({ innings: 3, human: [false, false], attract: true, cpuLevel: 8, seed: 5000 + BZ.attractN });
  BZ.beginHalfIntro(BZ.M);
};
BZ.attractScene = {
  enter() { BZ.startAttract(BZ.game); BZ.playSong('attract'); BZ.talkFor(BZ.game); },
  exit() { BZ.playSong(null); },
  update(dt) {
    const game = BZ.game;
    if (game.input.anyPressed()) { game.go('title'); return; }
    BZ.matchUpdate(game, BZ.M, dt);
    },
  draw(r) {
    BZ.matchDraw(r, BZ.M);
    r.overlay(g => {
      if (Math.floor(BZ.game.time * 2) % 2 === 0) BZ.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 20, '#ffe6a0', { align: 'center', scale: 1.4 });
      BZ.text(g, 'ATTRACT', 12, r.H - 20, '#c8d0f0', { scale: 1.1 });
    });
  }
};
