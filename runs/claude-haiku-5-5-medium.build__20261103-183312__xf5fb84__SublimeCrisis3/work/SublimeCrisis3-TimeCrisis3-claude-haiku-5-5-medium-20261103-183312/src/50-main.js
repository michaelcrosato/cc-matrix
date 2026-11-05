// 50-main.js: the game object and the scene flow (plan 3.4, 4.14). One E.Game with the engine's standard pause menu,
// settings and controls; our scenes are title, menu, select, difficulty, briefing, play, results, gameover, records,
// about, howto, notice, attract. The AI Hub session (46-hub.js) is a separate entry when the hub opened the page.
//
// Flow: title -> menu -> ARCADE (1 -> 3, then the ending and initials) | CO-OP | STAGE SELECT | TRAINING | RECORDS |
// SETTINGS | ABOUT | HOW TO PLAY. A title or menu left idle 10 s runs the attract mode (53-attract in 45-attract.js).

TC.current = { play: null, arcade: null, mode: 'arcade', stage: 1, difficulty: 'Normal', carry: null, coop: false };

// Our settings, through the engine's settings (saved per game; shown in the Settings screen).
TC.defineSettings = function (game) {
  const D = [
    { key: 'difficulty', label: 'Difficulty (new runs)', type: 'select', value: 'Normal', options: ['Easy', 'Normal', 'Hard'], group: 'Game' },
    { key: 'aimAssist', label: 'Aim assist (pad)', type: 'select', value: 'Medium', options: ['Off', 'Low', 'Medium', 'High'], group: 'Controller' },
    { key: 'padSpeed', label: 'Aim speed (pad)', type: 'slider', value: 1, min: 0.5, max: 2, step: 0.1, group: 'Controller' },
    { key: 'coverMode', label: 'Cover control', type: 'select', value: 'Hold', options: ['Hold', 'Toggle'], group: 'Controller' },
    { key: 'autoFire', label: 'Hold to repeat (handgun)', type: 'toggle', value: true, group: 'Controller' },
    { key: 'reticle', label: 'Reticle', type: 'select', value: 'Cross', options: ['Cross', 'Ring', 'Dot'], group: 'Game' },
    { key: 'threatSize', label: 'Crisis rings', type: 'select', value: 'Normal', options: ['Normal', 'Large'], group: 'Game' },
    { key: 'subtitles', label: 'Subtitles', type: 'toggle', value: true, group: 'Game' },
    { key: 'wobble', label: 'Retro texture wobble', type: 'toggle', value: false, group: 'Game' },
  ];
  for (const sp of D) {
    try { game.settings.define(sp); } catch (e) { game.fail && game.fail('setting ' + sp.key, e); }
  }
  TC.settings = {};
};

// The records: the arcade's tables by mode, the training record and the intel bottles (E.store).
TC.records = function () {
  return { training: E.store ? E.store.get('training', null) : null, intel: E.store ? E.store.get('intel', []) : [] };
};

// Build the game and its scenes. Called once from the page.
TC.boot = function () {
  // In an AI Hub session the page has no pause, no corner menu and no full-screen button: the hub owns those.
  const hub = TC.inHub();
  const game = TC.game = new E.Game({
    canvas: 'screen', res: [426, 240], expand: true, bg: '#05070f', input: TC.PRESET,
    autoPause: !hub, corner: !hub, backGesture: !hub, fullscreen: hub ? false : 'tap', id: 'sublime-crisis-3',
    menu: hub ? false : {
      items: [
        ['How to play', () => game.go('howto', { from: 'play' }, { fade: 0 })],
        ['Dev mode', () => TC.Dev.openFrom(game)],
      ],
      controls: TC.CONTROL_NAMES,
      quit: 'title',
    },
    camera: { zoom: false },
  });
  TC.defineSettings(game);
  // Touch-only devices get no touch controls at all (TASK.md); the notice and the gear are the only things on screen.
  if (TC.touchOnly()) game.input.touchEnabled = false;
  TC.arcade = new E.Arcade(game, { id: 'sublime-crisis-3', lives: 0, hud: false, idle: 10, demo: 28, scores: 6 });
  TC.defineSounds(game);
  return game;
};

// Touch-only devices: the touch controls stay off on every screen, whatever the scene turned on.
TC.noTouch = function (game) {
  if (TC.touchOnly() && game.input.touchEnabled) game.input.touchEnabled = false;
};

// True when the page was opened by the AI Hub (a session): the game then plays the round, with no title.
TC.inHub = function () {
  return typeof AIHub !== 'undefined' && !!AIHub.active;
};

// The scenes. Each is { enter(data), exit(), update(dt), draw(r), back(), pausable, camera, touch }.
TC.scenes = function (game) {
  const S = {};
  const menuItems = ['ARCADE', 'CO-OP', 'STAGE SELECT', 'TRAINING', 'RECORDS', 'SETTINGS', 'ABOUT', 'HOW TO PLAY'];
  const menuDesc = [
    'Three stages, every cutscene, the ending. One player.',
    'Two players on one screen. Pad 2 presses Start to join.',
    'Any stage, any difficulty. Every stage is open.',
    'Three drills: targets, cover and reload, the specials.',
    'High scores, the best training time, the intel you found.',
    'Difficulty, aim, cover, reticle, subtitles, controls.',
    'Credits, source information, the feedback sections.',
    'Device-aware: your controls, as this device labels them.',
  ];

  // The touch-only notice: no touch controls, a settings button, and the attract mode runs as normal.
  const noticeUp = () => TC.touchOnly() && !TC.keyUnlocked;
  // The gear, bottom left on the notice: a tap opens the settings.
  const gearAt = (r) => ({ x0: 4, y0: r.H - 36, x1: 44, y1: r.H - 6 });
  const tapped = (r, box) => {
    const c = game.input.clicked && game.input.clicked();
    return !!c && c[0] >= box.x0 && c[0] <= box.x1 && c[1] >= box.y0 && c[1] <= box.y1;
  };

  S.title = {
    camera: { zoom: false }, touch: [],
    enter() {
      this.idle = 0; this.t = 0;
      // A touch-only device gets no touch controls on any screen (TASK.md).
      if (TC.touchOnly()) game.input.touchEnabled = false;
      TC.Attract.startDemo(game, this, 'title');
      game.audio.music(TC.get('song', 'title'));
    },
    update(dt) {
      this.t += dt;
      TC.noTouch(game);
      TC.Attract.updateTitle(game, this, dt);
      if (noticeUp() && tapped(null, gearAt({ H: game.screen.H }))) { game.menu('settings'); return; }
      if (game.input.anyPressed && game.input.anyPressed()) {
        if (game.input.lastDevice !== 'touch') TC.keyUnlocked = true;
        if (noticeUp()) return;
        TC.sfx(game, 'pick');
        game.go('menu', null, { fade: 0.2 });
      }
    },
    draw(r) {
      TC.Attract.drawDemo(game, this, r);
      r.overlay(g => {
        TC.panel(g, 0, 0, 0, 0);
        TC.drawLogo(g, r.W, this.t);
        if (noticeUp()) {
          TC.text(g, 'Controller or keyboard required', r.W / 2, r.H - 60, TC.PALETTE.warn, { align: 'center', scale: 2 });
          TC.text(g, 'Use the gear to change settings.', r.W / 2, r.H - 40, TC.PALETTE.dim, { align: 'center', scale: 1 });
        } else {
          const lab = TC.labelFor({ input: game.input }, 'confirm') || 'ENTER';
          if (Math.floor(this.t * 2) % 2 === 0) TC.text(g, 'PRESS ' + (lab === '✕' ? '✕' : lab.toUpperCase()), r.W / 2, r.H - 36, '#ffffff', { align: 'center', scale: 2 });
        }
        TC.text(g, E.versionLabel ? E.versionLabel() : 'v0.85.2', r.W - 4, r.H - 8, '#5a6a8a', { align: 'right', scale: 1 });
        if (noticeUp()) {
          const gb = gearAt(r);
          g.fillStyle = '#10244a'; g.fillRect(gb.x0, gb.y0, gb.x1 - gb.x0, gb.y1 - gb.y0);
          g.fillStyle = TC.PALETTE.gold; g.fillRect(gb.x0 + 12, gb.y0 + 8, 20, 4); g.fillRect(gb.x0 + 12, gb.y0 + 15, 20, 4); g.fillRect(gb.x0 + 12, gb.y0 + 22, 20, 4);
          TC.text(g, 'SETTINGS', gb.x1 + 6, gb.y0 + 10, TC.PALETTE.gold, { scale: 1 });
        }
      });
    },
  };

  S.menu = {
    camera: { zoom: false }, touch: [],
    enter() {
      this.idle = 0; this.t = 0;
      this.menu = new E.Menu(game, menuItems, {
        onPick: (i, item) => this.pick(i),
        onCancel: () => game.go('title', null, { fade: 0.2 }),
      });
      this.menu.title = null;
      TC.sfx(game, 'pick');
      TC.Attract.startDemo(game, this, 'menu');
      game.audio.music(TC.get('song', 'title'));
    },
    pick(i) {
      TC.sfx(game, 'pick');
      switch (i) {
        case 0: TC.current = Object.assign({}, TC.current, { mode: 'arcade', coop: false, stage: 1, carry: null }); game.go('difficulty', { next: 'briefing' }); break;
        case 1: TC.current = Object.assign({}, TC.current, { mode: 'coop', coop: true, stage: 1, carry: null }); game.go('difficulty', { next: 'briefing' }); break;
        case 2: game.go('select'); break;
        case 3: TC.current = Object.assign({}, TC.current, { mode: 'range', coop: false, stage: 'range', carry: null }); game.go('briefing', { stage: 'range' }); break;
        case 4: game.go('records'); break;
        case 5: game.menu('settings'); break;
        case 6: game.go('about'); break;
        case 7: game.go('howto'); break;
      }
    },
    update(dt) {
      this.t += dt;
      TC.noTouch(game);
      TC.Attract.updateTitle(game, this, dt);
      this.menu.update(dt);
    },
    draw(r) {
      TC.Attract.drawDemo(game, this, r);
      r.overlay(g => {
        TC.drawLogo(g, r.W, this.t);
        TC.panel(g, r.W / 2 - 150, 92, 300, 136);
      });
      this.menu.draw(r);
      r.overlay(g => {
        const d = menuDesc[this.menu.i] || '';
        TC.text(g, d, r.W / 2, r.H - 26, TC.PALETTE.pale || '#f4f7ff', { align: 'center', scale: 1 });
      });
    },
  };

  S.difficulty = {
    camera: { zoom: false }, touch: [],
    enter(data) {
      this.next = data && data.next;
      this.menu = new E.Menu(game, ['EASY', 'NORMAL', 'HARD'], {
        onPick: (i) => {
          const d = ['Easy', 'Normal', 'Hard'][i];
          game.settings.set('difficulty', d);
          TC.current.difficulty = d;
          TC.sfx(game, 'pick');
          if (TC.current.mode === 'coop') game.go('coop', null);
          else game.go('briefing', { stage: TC.current.stage || 1 });
        },
        onCancel: () => game.go('menu'),
      });
      this.menu.i = ['Easy', 'Normal', 'Hard'].indexOf(game.settings.difficulty || 'Normal');
    },
    update(dt) { this.menu.update(dt); },
    draw(r) {
      r.overlay(g => {
        TC.panel(g, r.W / 2 - 90, 40, 180, 40);
        TC.text(g, 'DIFFICULTY', r.W / 2, 50, TC.PALETTE.gold, { align: 'center', scale: 2 });
      });
      this.menu.draw(r);
      r.overlay(g => {
        const desc = ['7 lives. Threats come slower.', '5 lives. The standard CREST run.', '3 lives. Tighter TIME, more threats.'][this.menu.i] || '';
        TC.text(g, desc, r.W / 2, r.H - 26, '#f4f7ff', { align: 'center', scale: 1 });
      });
    },
  };

  S.select = {
    camera: { zoom: false }, touch: [],
    enter() {
      const items = [
        { label: 'HARBOR LIGHTS' }, { label: 'STORM SIGNAL' }, { label: 'THE TIDEWALL' }, { label: 'CREST RANGE' },
      ];
      this.menu = new E.Menu(game, items, {
        onPick: (i) => {
          TC.sfx(game, 'pick');
          TC.current = Object.assign({}, TC.current, { mode: 'stage', coop: false, carry: null });
          if (i === 3) { TC.current.mode = 'range'; TC.current.stage = 'range'; game.go('difficulty', { next: 'briefing' }); return; }
          TC.current.stage = i + 1;
          game.go('difficulty', { next: 'briefing' });
        },
        onCancel: () => game.go('menu'),
      });
    },
    update(dt) { this.menu.update(dt); },
    draw(r) {
      r.overlay(g => {
        TC.panel(g, r.W / 2 - 140, 30, 280, 36);
        TC.text(g, 'STAGE SELECT', r.W / 2, 42, TC.PALETTE.gold, { align: 'center', scale: 2 });
      });
      this.menu.draw(r);
    },
  };

  S.briefing = {
    camera: { zoom: false }, touch: [],
    enter(data) {
      this.stage = data && data.stage !== undefined ? data.stage : TC.current.stage;
      this.t = 0;
      this.brief = this.stage === 'range' ? TC.BRIEFS.range : TC.BRIEFS[this.stage];
      // Co-op: the second player joins with Start on a free pad, or 2 on the keyboard (the join line on the screen).
      if (TC.current.coop && game.allowJoin) game.allowJoin({ max: 2 });
    },
    update(dt) {
      this.t += dt;
      if (game.input.pressed('confirm') || game.input.pressed('fire') || game.input.pressed('cancel')) {
        if (game.input.pressed('cancel')) { game.go('menu'); return; }
        TC.sfx(game, 'pick');
        const cfg = { mode: TC.current.mode, stage: this.stage, difficulty: TC.current.difficulty, carry: TC.current.carry,
          intro: this.stage !== 'range', coop: !!TC.current.coop };
        game.go('play', { cfg }, { fade: 0.25 });
      }
    },
    draw(r) {
      r.overlay(g => {
        const b = this.brief || { title: '', lines: [] };
        TC.panel(g, 30, 30, r.W - 60, r.H - 60);
        TC.text(g, b.title, r.W / 2, 44, TC.PALETTE.gold, { align: 'center', scale: 3 });
        b.lines.forEach((ln, i) => TC.text(g, ln, r.W / 2, 96 + i * 22, TC.PALETTE.text, { align: 'center', scale: 2 }));
        if (TC.current.coop) TC.text(g, 'PLAYER 2: PRESS START ON A CONTROLLER', r.W / 2, r.H - 84, TC.PALETTE.gold, { align: 'center', scale: 2 });
        const lab = TC.labelFor({ input: game.input }, 'fire') || 'FIRE';
        if (Math.floor(this.t * 2) % 2 === 0) TC.text(g, 'PRESS ' + lab + ' TO DEPLOY', r.W / 2, r.H - 52, '#ffffff', { align: 'center', scale: 2 });
      });
    },
  };

  S.play = {
    camera: { zoom: false }, touch: [], pausable: true,
    enter(data) {
      const cfg = (data && data.cfg) || TC.current.cfg || {};
      let seats = cfg.seats;
      if (!seats) {
        seats = [{ input: game.input, name: 'P1', color: '#e8443a', agent: 'kai', mouse: true, local: true }];
        if (cfg.coop) {
          const p2 = game.players && game.players[1];
          if (p2) seats.push({ input: p2, name: 'P2', color: '#3b82f6', agent: 'mari', mouse: false, local: true });
        }
      }
      this.play = new TC.Play(game, Object.assign({}, cfg, { seats }));
      TC.current.play = this.play;
      TC.current.cfg = cfg;
      this.play.intro();
      game.audio.music(TC.get('song', this.play.sim.stage.music || 'harbor'));
    },
    update(dt) {
      const p = this.play;
      if (!p) return;
      if (TC.Dev.active()) { TC.Dev.update(dt); return; }
      p.update(dt);
      if (p.over) this.route(p.endResult);
    },
    route(result) {
      const cfg = TC.current.cfg || {};
      if (cfg.mode === 'range') { game.go('results', { result, range: true }); return; }
      TC.current.carry = this.play.sim.carryOut();
      if (result.won) {
        if (this.play.sim.stageId === 3 || this.play.sim.stageId === 'range') game.go('results', { result, last: true });
        else game.go('results', { result, next: true });
      } else {
        game.go('gameover', { result });
      }
      this.play = null;
    },
    draw(r) {
      if (this.play) this.play.draw(r);
      if (TC.Dev.active()) TC.Dev.draw(r);
    },
    back() { return false; },
  };

  S.results = {
    camera: { zoom: false }, touch: [],
    enter(data) {
      this.result = data.result; this.next = data.next; this.last = data.last; this.range = data.range;
      this.t = 0;
      if (this.result.won) TC.sfx(game, 'clear');
      game.audio.music(TC.get('song', 'results'));
    },
    update(dt) {
      this.t += dt;
      if (this.t > 1 && (game.input.pressed('confirm') || game.input.pressed('fire'))) {
        if (this.next) {
          TC.current.stage = Number(this.result.stage) + 1;
          game.go('briefing', { stage: TC.current.stage });
        } else if (this.last) {
          game.go('ending', { result: this.result });
        } else {
          TC.Arcade.enterOrRecords(game, this.result, this);
        }
      }
    },
    draw(r) {
      const res = this.result;
      r.overlay(g => {
        TC.panel(g, 20, 14, r.W - 40, r.H - 28);
        const head = res.won ? 'STAGE CLEAR' : 'GAME OVER';
        TC.text(g, head, r.W / 2, 22, res.won ? TC.PALETTE.gold : TC.PALETTE.warn, { align: 'center', scale: 3 });
        const rows = TC.resultRows(res);
        rows.forEach((row, i) => {
          const x = 40 + i * 180;
          const k = Math.min(1, this.t * 0.8);
          TC.text(g, row.name, x, 60, TC.PALETTE.text, { scale: 2 });
          TC.text(g, 'RANK ' + row.rank, x, 82, TC.PALETTE.gold, { scale: 2 });
          const stats = [['SCORE', TC.fmt(row.score * k)], ['ACCURACY', row.acc + '%'], ['KILLS', String(TC.countUp(row.kills, k))],
            ['HEADSHOTS', String(TC.countUp(row.headshots, k))], ['COVER SAVES', String(TC.countUp(row.saves, k))],
            ['LIVES LOST', String(row.lost)], ['BEST CHAIN', String(row.bestChain)], ['TOTAL', TC.fmt(row.total * k)]];
          stats.forEach(([label, v], j) => {
            TC.text(g, label, x, 110 + j * 14, TC.PALETTE.dim, { scale: 1 });
            TC.text(g, v, x + 110, 110 + j * 14, TC.PALETTE.text, { scale: 1 });
          });
        });
        if (this.t > 1) {
          const lab = TC.labelFor({ input: game.input }, 'fire') || 'FIRE';
          TC.text(g, this.next ? 'PRESS ' + lab + ' FOR THE NEXT STAGE' : 'PRESS ' + lab, r.W / 2, r.H - 26, '#ffffff', { align: 'center', scale: 1 });
        }
      });
    },
  };

  S.gameover = {
    camera: { zoom: false }, touch: [],
    enter(data) { this.result = data.result; this.t = 0; TC.sfx(game, 'gameover'); this.entering = false; },
    update(dt) {
      this.t += dt;
      if (this.t > 2 && !this.entering && (game.input.pressed('confirm') || game.input.pressed('fire'))) {
        TC.Arcade.enterOrRecords(game, this.result, this);
      }
    },
    draw(r) {
      r.overlay(g => {
        TC.text(g, 'GAME OVER', r.W / 2, r.H / 2 - 40, TC.PALETTE.warn, { align: 'center', scale: 4 });
        TC.text(g, 'SCORE ' + TC.fmt(this.result.rows[0].score), r.W / 2, r.H / 2 + 10, '#ffffff', { align: 'center', scale: 2 });
      });
    },
  };

  S.records = {
    camera: { zoom: false }, touch: [],
    enter() {
      this.page = 0;
      this.menu = new E.Menu(game, ['ARCADE', 'CO-OP', 'STAGE 1', 'STAGE 2', 'STAGE 3', 'TRAINING', 'INTEL', 'BACK'], {
        onPick: (i) => { if (i === 7) game.go('menu'); else this.page = i; },
        onCancel: () => game.go('menu'),
      });
      this.menu.x = 'left';
    },
    update(dt) { this.menu.update(dt); },
    draw(r) {
      const modes = ['arcade', 'coop', 'stage1', 'stage2', 'stage3'];
      r.overlay(g => {
        TC.panel(g, 130, 10, r.W - 140, r.H - 20);
        TC.text(g, 'RECORDS', r.W / 2 + 40, 16, TC.PALETTE.gold, { align: 'center', scale: 2 });
        if (this.page < 5) {
          const mode = modes[this.page];
          if (TC.arcade && TC.arcade.drawTable) TC.arcade.drawTable(r, mode, 34, mode.toUpperCase());
        } else if (this.page === 5) {
          const rec = TC.records().training;
          TC.text(g, 'BEST TRAINING TIME', r.W / 2 + 40, 60, TC.PALETTE.text, { align: 'center', scale: 2 });
          TC.text(g, rec ? rec.toFixed(1) + ' S' : 'NOT YET', r.W / 2 + 40, 84, TC.PALETTE.gold, { align: 'center', scale: 3 });
        } else {
          const list = TC.records().intel;
          TC.text(g, 'INTEL: ' + list.length + ' OF ' + TC.intelTotal(), r.W / 2 + 40, 40, TC.PALETTE.text, { align: 'center', scale: 2 });
          list.slice(0, 5).forEach((t, i) => TC.text(g, '- ' + t.slice(0, 60), 150, 70 + i * 16, '#cfe4ff', { scale: 1 }));
        }
      });
      this.menu.draw(r);
    },
  };

  S.about = {
    camera: { zoom: false }, touch: [],
    enter() { this.page = 0; this.pages = TC.aboutPages(); this.t = 0; },
    update(dt) {
      this.t += dt;
      const i = game.input;
      if (i.pressed('right') || i.pressed('confirm')) this.page = (this.page + 1) % this.pages.length;
      if (i.pressed('left')) this.page = (this.page + this.pages.length - 1) % this.pages.length;
      if (i.pressed('cancel')) game.go('menu');
    },
    draw(r) {
      const pg = this.pages[this.page];
      r.overlay(g => {
        TC.panel(g, 14, 12, r.W - 28, r.H - 24);
        TC.text(g, pg.title, r.W / 2, 22, TC.PALETTE.gold, { align: 'center', scale: 2 });
        let y = 52;
        for (const ln of pg.lines) {
          for (const row of TC.wrap(ln, r.W - 60, 1)) { TC.text(g, row, 30, y, TC.PALETTE.text, { scale: 1 }); y += 11; }
          y += 3;
        }
        TC.text(g, (this.page + 1) + ' / ' + this.pages.length + '   LEFT / RIGHT TO TURN   ESC TO LEAVE', r.W / 2, r.H - 22, TC.PALETTE.dim, { align: 'center', scale: 1 });
      });
    },
  };

  S.howto = {
    camera: { zoom: false }, touch: [],
    enter(data) { this.from = data && data.from; this.t = 0; },
    update(dt) {
      this.t += dt;
      if (game.input.pressed('cancel') || game.input.pressed('confirm')) { if (this.from === 'play') game.resume(); else game.go('menu'); }
    },
    draw(r) {
      const rows = TC.howtoLines({ input: game.input });
      r.overlay(g => {
        TC.panel(g, 30, 16, r.W - 60, r.H - 32);
        TC.text(g, 'HOW TO PLAY', r.W / 2, 26, TC.PALETTE.gold, { align: 'center', scale: 2 });
        rows.forEach(([a, b], i) => {
          TC.text(g, a, 52, 62 + i * 22, TC.PALETTE.text, { scale: 2 });
          TC.text(g, b, 52, 74 + i * 22, TC.PALETTE.dim, { scale: 1 });
        });
        TC.text(g, 'Duck, pop, shoot. Cover is safe, but TIME runs out.', r.W / 2, r.H - 22, TC.PALETTE.gold, { align: 'center', scale: 1 });
      });
    },
  };

  S.attract = {
    camera: { zoom: false }, touch: [],
    enter() { TC.Attract.enter(game, this); },
    update(dt) { TC.noTouch(game); TC.Attract.updateAttract(game, this, dt); },
    draw(r) { TC.Attract.drawAttract(game, this, r); },
  };

  S.ending = {
    camera: { zoom: false }, touch: [],
    enter(data) { this.result = data.result; this.t = 0; game.audio.music(TC.get('song', 'dawn')); },
    update(dt) { this.t += dt; if (this.t > 6 && (game.input.pressed('confirm') || game.input.pressed('fire'))) TC.Arcade.enterOrRecords(game, this.result, this); },
    draw(r) {
      r.overlay(g => {
        const lines = ['THE TIDEWALL HOLDS', '', 'Agents Kai and Mari closed the sluice.', 'Admiral Krake was last seen on the causeway.', '', 'Thanks for playing Sublime Crisis 3.'];
        lines.forEach((ln, i) => TC.text(g, ln, r.W / 2, r.H - 40 - this.t * 12 + i * 14, '#f4f7ff', { align: 'center', scale: 2 }));
      });
    },
  };

  // The AI Hub session: the game's own card, then the round. Not pausable: the hub starts and ends rounds.
  S.session = {
    camera: { zoom: false }, touch: [],
    enter() {
      this.t = 0;
      if (!TC.Hub.info) { game.go('title'); return; }
      game.audio.music(TC.get('song', 'harbor'));
      AIHub.ready();
    },
    update(dt) {
      this.t += dt;
      if (!TC.Hub.info) return;
      TC.Hub.cardInput(game);
      if (TC.Hub.started && !this.went) {
        this.went = true;
        const info = TC.Hub.info;
        const role = TC.Hub.server ? 'server' : TC.Hub.host ? 'host' : 'replica';
        const cfg = { hub: true, role, mode: 'shared', stage: TC.Hub.stage, difficulty: 'Normal', intro: false, seats: TC.Hub.seats(game), viewer: TC.Hub.me, cheats: {} };
        void info;
        game.go('hubplay', { cfg }, { fade: 0 });
      }
    },
    draw(r) { TC.Hub.drawCard(game, r, this.t); },
  };
  S.hubplay = Object.assign({}, S.play, { pausable: false });
  return S;
};

// The shared intel total: the bottles in the stages and the range.
TC.intelTotal = function () {
  let n = 0;
  for (const st of Object.values(TC.registry.stage)) for (const sc of st.scenes) n += (sc.bonus || []).filter(b => b.kind === 'bottle').length;
  return n;
};

// Words wrapped to a width in pixels at the font's scale.
TC.wrap = function (s, maxW, scale) {
  if (E.font && E.font.wrap) return E.font.wrap(s, maxW, { scale: scale || 1 });
  return [s];
};

// Start the game (the page's entry point).
TC.start = function () {
  const game = TC.boot();
  const scenes = TC.scenes(game);
  const hub = TC.inHub();
  const steps = [['Painting the harbor', () => {}], ['Mixing the lanterns', () => {}]];
  if (hub) steps.push(['Joining the round', async () => { TC.Hub.info = await TC.Hub.connect(); }]);
  game.start({
    scenes, scene: hub ? 'session' : 'title',
    boot: { title: 'SUBLIME CRISIS 3', steps },
  });
  return game;
};
