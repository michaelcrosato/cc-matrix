/* Scenes, input, attract reel, dev panel, and the Hub table. The sim stays free of drawing. */
(() => {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const GAME = (G.GAME ||= {});
  const E = G.My3D2dge;
  const HUB = G.AIHub || null;
  const inSession = !!(HUB && HUB.active);
  const CFG = GAME.CFG;
  const TITLE = CFG.GAME_TITLE;

  const RT = {
    diff: 'resident',
    prefsReady: false,
    S: null,
    def: null,
    mode: 'case',
    fromStory: false,
    redirect: false,
    chartFor: null,
    chartCase: null,
    light: null,
    miss: 0,
    leftOp: false,
    fieldKey: '',
    field: null,
    menu: null,
    devOpen: false,
    devTab: 0,
    devI: 0,
    cheatUsed: false,
    attract: false,
    loops: 0,
    seg: 0,
    segT: 0,
    mouseInit: false,
    mouseT: 0,
    idle: 0,
    suppress: 0,
    ranks: {},
    cleared: {},
    saved: {},
    chapter: 1,
    visitors: [],
    nearDoor: false,
    hero: { x: 200, y: 160, tx: null, ty: null },
    door: { x: 210, y: 180 },
    line: '',
    lineT: 0,
    creditPage: 0,
    logOpen: false,
    latched: false,
    pending: 'story',
    fileCase: 'c1',
    lobbyN: 1,
  };
  const PREFS = {
    assist: 0.6,
    cursor: 330,
    swap: false,
    sustain: 'hold',
    hints: true,
    blood: 'red',
    text: 1,
  };
  GAME.PREFS = PREFS;

  const PERSON = {
    c1: 'agnes', c2: 'slide', c3: 'tam', c4: 'ned', c5: 'ilse', c6: 'oyelaran',
    c7: 'yusuf', c8: 'perpetua', c9: 'hollis', c10: 'percy', c11: 'clementine',
  };

  const DEF = E.Input.DEFAULT;
  const INPUT = Object.assign({}, DEF, {
    up: ['ArrowUp', 'Pad12'],
    down: ['ArrowDown', 'Pad13'],
    left: ['ArrowLeft', 'Pad14'],
    right: ['ArrowRight', 'Pad15'],
    useTool: ['Pad7', 'Pad0', 'Mouse0', 'Space'],
    fine: ['Pad6', 'ShiftLeft', 'ShiftRight'],
    gift: ['Pad3', 'KeyF', 'Mouse1'],
    consult: ['Pad2', 'KeyC'],
    toolPrev: ['Pad4', 'KeyQ', 'WheelUp'],
    toolNext: ['Pad5', 'KeyE', 'WheelDown'],
    wheelHold: ['Mouse2'],
    curU: ['KeyW', 'ArrowUp'],
    curD: ['KeyS', 'ArrowDown'],
    curL: ['KeyA', 'ArrowLeft'],
    curR: ['KeyD', 'ArrowRight'],
    nudgeU: ['Pad12'],
    nudgeD: ['Pad13'],
    nudgeL: ['Pad14'],
    nudgeR: ['Pad15'],
    tool1: ['Digit1'], tool2: ['Digit2'], tool3: ['Digit3'], tool4: ['Digit4'],
    tool5: ['Digit5'], tool6: ['Digit6'], tool7: ['Digit7'], tool8: ['Digit8'],
    interact: ['Pad0', 'KeyE', 'Enter'],
    skip: ['Pad2', 'ControlLeft'],
    log: ['Pad3', 'KeyB'],
    more: ['Pad3', 'KeyM'],
  });

  const SETTINGS = [
    { key: 'music', value: 0.1 },
    { key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] },
    { key: 'voices', label: 'Voices', type: 'slider', group: 'Sound', value: 0.9, min: 0, max: 1, step: 0.05, apply: (g, v) => { g.audio.voiceVolume = v; if (g.audio.applyVolume) g.audio.applyVolume(); } },
    { key: 'difficulty', label: 'Difficulty', type: 'select', value: 'resident', options: [['intern', 'Intern'], ['resident', 'Resident'], ['attending', 'Attending']], apply: (g, v) => { RT.diff = v; } },
    { key: 'assist', label: 'Surgical assist', type: 'slider', value: 0.6, min: 0, max: 1.4, step: 0.05, apply: (g, v) => { PREFS.assist = v; } },
    { key: 'cursorSpeed', label: 'Cursor speed', type: 'slider', value: 330, min: 80, max: 500, step: 10, apply: (g, v) => { PREFS.cursor = v; } },
    { key: 'swapSticks', label: 'Swap sticks', type: 'toggle', value: false, apply: (g, v) => { PREFS.swap = !!v; } },
    { key: 'sustain', label: 'Sustained tools', type: 'select', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']], apply: (g, v) => { PREFS.sustain = v; } },
    { key: 'hints', label: 'Hints', type: 'toggle', value: true, apply: (g, v) => { PREFS.hints = !!v; } },
    { key: 'blood', label: 'Blood color', type: 'select', value: 'red', options: [['red', 'Red'], ['rose', 'Rose'], ['ink', 'Ink']], apply: (g, v) => { PREFS.blood = v; } },
    { key: 'textSpeed', label: 'Text speed', type: 'slider', value: 1, min: 0.5, max: 3, step: 0.25, apply: (g, v) => { PREFS.text = v; } },
  ];

  const CONTROLS = {
    useTool: 'Use tool', fine: 'Steady hand', gift: 'The Steady', consult: 'Consult',
    toolPrev: 'Previous tool', toolNext: 'Next tool', wheelHold: 'Tool wheel',
    interact: 'Talk or use', more: 'Ask for more time',
    tool1: false, tool2: false, tool3: false, tool4: false, tool5: false, tool6: false, tool7: false, tool8: false,
  };

  const game = new E.Game({
    canvas: 'screen',
    id: TITLE,
    res: [426, 240],
    expand: true,
    view: 'side',
    touch: 'never',
    draw: true,
    live: inSession,
    autoPause: !inSession,
    corner: !inSession,
    input: INPUT,
    menu: {
      quit: inSession ? false : 'title',
      saves: true,
      items: inSession ? [] : [['Dev Mode', () => GAME.openDev()]],
      settings: SETTINGS,
      controls: CONTROLS,
    },
  });
  game.input.names = CONTROLS;

  const ui = new E.Shell(game, {
    tv: true,
    theme: {
      paper: 'rgba(6,22,26,.94)',
      accent: '#5ff0e0',
      line: 'rgba(95,240,224,.35)',
      ink: '#e8fbf6',
      muted: '#8fb8b0',
      danger: '#ff7a6a',
    },
  });

  GAME.openDev = () => {
    if (inSession) return;
    RT.devOpen = true;
    RT.devTab = 0;
    RT.devI = 0;
    if (game.shell) game.shell.hide();
  };

  function origin() {
    return [(game.W - CFG.FIELD_W) >> 1, (game.H - CFG.FIELD_H) >> 1];
  }
  function playTune() {
    const t = CFG.cloneTune(GAME.TUNE);
    const def = CFG.TUNING.hands;
    /* A dev slider that has left the documented default wins. Settings apply while that slider still sits on the default. */
    if (t.hands.cursor === def.cursor) t.hands.cursor = PREFS.cursor;
    if (t.hands.assist === def.assist) t.hands.assist = PREFS.assist;
    return t;
  }
  function makeMenu(items, onPick, onCancel) {
    return new E.Menu(game, items, {
      scale: 2, rows: 6,
      color: '#e8fbf6', pick: '#5ff0e0', dim: '#8fb8b0',
      bg: '#06141a', border: '#5ff0e0',
      onPick, onCancel,
    });
  }
  function go(name, data) {
    game.go(name, data, { fade: game.fadeTime });
  }

  const people = {};
  for (const id in GAME.CAST) {
    const c = GAME.CAST[id];
    people[id] = {
      name: c.name,
      portrait: (g, x, y, size) => {
        let expr = 'neutral';
        if (story.running && story.node) {
          const steps = story.nodes[story.node];
          const line = steps && steps[story._i - 1];
          if (line && line.who === id && line.expr) expr = line.expr;
        }
        GAME.Art.bust(g, id, { expr }, x, y, size || 40);
      },
    };
  }
  const story = new E.Story(game, {
    people,
    nodes: GAME.NODES,
    on: {
      op(st, step) {
        RT.fromStory = true;
        RT.redirect = true;
        const id = step.caseId;
        if (GAME.LIGHT[id] && RT.chartFor !== id) go('chart', { caseId: id });
        else {
          beginCase(id, { difficulty: RT.diff, seed: 3, fromStory: true });
          go('op');
        }
      },
      ward() {
        RT.redirect = true;
        go('ward');
      },
      credits() {
        RT.redirect = true;
        RT.creditPage = 0;
        go('credits');
      },
    },
  });
  story.talk.voice = (ch) => { try { GAME.Audio.blip(ch); } catch (e) { /* quiet */ } };
  story.talk.bg = '#06141a';
  story.talk.border = '#5ff0e0';
  story.talk.color = '#e8fbf6';
  story.talk.nameColor = '#5ff0e0';

  function beginCase(id, opts) {
    opts = opts || {};
    let def = GAME.CASES[id];
    if (id === 'ferry' || (def && def.id === 'ferry')) def = GAME.roundsCase(opts.players || 1);
    if (!def) return null;
    RT.def = def;
    RT.mode = opts.mode || def.mode || 'case';
    if (opts.fromStory != null) RT.fromStory = opts.fromStory;
    const S = GAME.Op.create(def, {
      seed: opts.seed == null ? 3 : opts.seed,
      difficulty: opts.difficulty || RT.diff || 'resident',
      players: opts.players || 1,
      phase: opts.phase || 0,
    });
    if (opts.clockDelta) S.clock += opts.clockDelta;
    if (opts.steadyDelta) S.steady += opts.steadyDelta;
    if (opts.cheat) S.cheat = Object.assign({}, S.cheat, opts.cheat);
    RT.S = S;
    RT.leftOp = false;
    RT.fieldKey = '';
    return S;
  }
  GAME.beginCase = beginCase;

  function recordRank() {
    const S = RT.S;
    if (!S || !S.won || RT.attract || RT.cheatUsed || GAME.TUNE.dirty) return;
    if (S.lab || S.mode === 'rounds' || S.id === 'lab' || S.id === 'ferry') return;
    const ch = S.cheat || {};
    if (ch.reveal || ch.infSteady || ch.lockVitals || ch.freezeClock || ch.oneHit) return;
    RT.ranks[S.id] = S.rank;
    RT.cleared[S.id] = true;
    if (PERSON[S.id]) RT.saved[PERSON[S.id]] = true;
    const def = GAME.CASES[S.id];
    if (def && def.chapter) RT.chapter = def.chapter;
  }

  function resumeHeld() {
    if (!(RT.fromStory && story._held)) return false;
    RT.redirect = false;
    story.resume();
    if (!RT.redirect) go('story');
    return true;
  }

  function leaveResults() {
    if (resumeHeld()) return;
    const S = RT.S;
    if (S && (S.lab || S.id === 'lab')) { go('menu'); return; }
    if (RT.mode === 'rounds' || (S && S.mode === 'rounds')) { go('lobby'); return; }
    if (S && S.won && RT.fromStory) { go('ward'); return; }
    go('menu');
  }

  function readLocal(p) {
    const I = game.input;
    const [ox, oy] = origin();
    let digit = 0;
    for (let n = 1; n <= 8; n++) if (I.pressed('tool' + n)) digit = n;
    const tools = CFG.TOOLS;
    const idx = Math.max(0, tools.indexOf(p.tool));
    if (!digit && I.pressed('toolPrev')) digit = ((idx + 7) % 8) + 1;
    if (!digit && I.pressed('toolNext')) digit = ((idx + 1) % 8) + 1;
    const devOpen = RT.devOpen;
    const keys = devOpen ? [0, 0] : [
      (I.down('curR') ? 1 : 0) - (I.down('curL') ? 1 : 0),
      (I.down('curD') ? 1 : 0) - (I.down('curU') ? 1 : 0),
    ];
    const nudge = devOpen ? [0, 0] : [
      (I.down('nudgeR') ? 1 : 0) - (I.down('nudgeL') ? 1 : 0),
      (I.down('nudgeD') ? 1 : 0) - (I.down('nudgeU') ? 1 : 0),
    ];
    const swap = !!PREFS.swap;
    const aimSrc = (swap ? I.padMove : I.padAim) || [0, 0];
    const moveSrc = (swap ? (I.padAim || [0, 0]) : (I.padMove || [0, 0]));
    const aim = [aimSrc[0] || 0, aimSrc[1] || 0];
    const move = [moveSrc[0] || 0, moveSrc[1] || 0];
    let mouse = null;
    const ptr = I.pointer();
    if (ptr && (I.lastDevice === 'mouse' || I._fedAt)) mouse = [ptr[0] - ox, ptr[1] - oy];
    let trig = I.value('useTool') || 0;
    if (PREFS.sustain === 'toggle') {
      if (I.pressed('useTool')) RT.latched = !RT.latched;
      trig = RT.latched ? 1 : 0;
    }
    const pan = I.pan();
    if (!digit && I.down('wheelHold') && pan && Math.hypot(pan[0], pan[1]) > 8) {
      move[0] += pan[0] / Math.max(8, Math.hypot(pan[0], pan[1]));
      move[1] += pan[1] / Math.max(8, Math.hypot(pan[0], pan[1]));
    }
    return {
      digit, mouse, aim, move, keys, nudge,
      fine: I.down('fine'),
      trig,
      gift: I.down('gift'),
      consult: I.down('consult'),
      cancel: I.down('cancel'),
    };
  }

  function drive(S, dt, opts) {
    opts = opts || {};
    const inputs = [];
    const n = S.players.length;
    for (let i = 0; i < n; i++) {
      const p = S.players[i];
      if (p.gone) { inputs.push({ tool: p.tool, trig: 0 }); continue; }
      let dev;
      if (opts.remote && opts.remote[i]) {
        dev = opts.remote[i];
      } else if (i === 0 && game.debug && game.debug.driver && !RT.attract) {
        dev = game.debug.driver(S, dt) || GAME.Bot.device(S, 0, dt);
      } else if (i === 0 && RT.auto && !RT.attract) {
        dev = GAME.Bot.device(S, 0, dt);
      } else if (i === 0 && !opts.bots && !RT.attract) {
        dev = readLocal(p);
      } else {
        dev = GAME.Bot.device(S, i, dt);
      }
      GAME.Wheel.update(p, dev, dt);
      const tune = playTune();
      if (dev.mouse) GAME.Cursor.update(p, { mouse: dev.mouse, fine: dev.fine }, S, dt, tune);
      else GAME.Cursor.update(p, { aim: dev.aim, keys: dev.keys, nudge: dev.nudge, fine: dev.fine }, S, dt, tune);
      const row = {
        tool: p.tool,
        trig: dev.trig || 0,
        fine: !!dev.fine,
        gift: !!dev.gift,
        consult: !!dev.consult,
        cancel: !!dev.cancel,
        mouse: !!dev.mouse,
      };
      if (dev.x != null) { row.x = dev.x; row.y = dev.y; }
      inputs.push(row);
    }
    try { GAME.Op.step(S, inputs, dt, playTune()); }
    catch (e) { game.fail('op', e); }
    if (S.ev) for (const ev of S.ev) { try { GAME.Audio.onEv(ev); } catch (err) { /* quiet */ } }
    return S;
  }

  function fieldOf(S) {
    const key = (S.site || 'abdomen') + ':' + (S.seed || 1) + ':' + game.W + 'x' + game.H;
    if (RT.fieldKey !== key) {
      RT.field = GAME.Art.fieldFor(S.site || 'abdomen', S.seed || 1, game.W, game.H);
      RT.fieldKey = key;
    }
    return RT.field;
  }

  const COL = {
    shard: '#d5dee6', laceration: '#e05050', wound: '#c43030', bleeder: '#ff4040', arteryTear: '#ff2060',
    pool: '#601828', polyp: '#e08898', mass: '#c06078', clot: '#682838', patch: '#e07070',
    nerve: '#e2c14a', eloquent: '#f0d060', retractor: '#c8d0d4', bead: '#5ff0e0', nest: '#14383c',
    lobe: '#7a5cff', eye: '#d0c8ff', tendril: '#3ec8b0', uvula: '#9a78ff', voice: '#5ff0e0', reed: '#8fd0c8',
    repeat: '#f5b700', slur: '#9ad8d0', hook: '#d0d4d8', screw: '#e8e0c8', wire: '#f0d060', lead: '#88e0c8',
    cut: '#f2f0e6', fed: '#401018', bite: '#e05050',
  };
  function bloodCol() {
    if (PREFS.blood === 'rose') return '#e07098';
    if (PREFS.blood === 'ink') return '#2a2030';
    return null;
  }

  function drawOp(r, S, ribbon) {
    const [ox, oy] = origin();
    r.sky(['#071018', '#102028']);
    const F = S ? fieldOf(S) : null;
    const allow = (typeof document !== 'undefined') || GAME.Art.force;
    if (allow && F) {
      try { F.shade({ beat: ((S.t || 0) % 1), slow: !!S.breath, dim: S.dim || 0 }); }
      catch (e) { /* painter */ }
    }
    r.overlay(g => {
      const px = E.px;
      if (F && F.cv && F.cv.width) { try { g.drawImage(F.cv, 0, 0); } catch (e) { /* no image */ } }
      px.rect(g, 0, 0, r.W, Math.max(0, oy), '#102830');
      px.rect(g, 0, oy + CFG.FIELD_H, r.W, Math.max(0, r.H - oy - CFG.FIELD_H), '#102830');
      px.rect(g, 0, oy, Math.max(0, ox), CFG.FIELD_H, '#102830');
      px.rect(g, ox + CFG.FIELD_W, oy, Math.max(0, r.W - ox - CFG.FIELD_W), CFG.FIELD_H, '#102830');
      px.rect(g, ox + 8, oy + 8, CFG.FIELD_W - 16, CFG.FIELD_H - 16, '#0c2428');
      if (!S) return;
      const ink = bloodCol();
      for (const o of S.objects) {
        if (!o.alive && o.type !== 'retractor') continue;
        if (o.hidden && !o.marked) continue;
        const x = o.x + ox, y = o.y + oy;
        let c = COL[o.type] || '#9ad0c8';
        if (ink && (o.type === 'bleeder' || o.type === 'pool' || o.type === 'wound' || o.type === 'laceration' || o.type === 'arteryTear')) c = ink;
        const rad = o.type === 'pool' ? 8 + (o.vol || 0) * 0.15 : o.type === 'mass' ? (o.rad || 12) : o.type === 'bead' ? 3 : 4;
        if (o.guide && o.guide.length > 1 && (o.type === 'cut' || o.type === 'mass' || o.type === 'slur')) {
          for (let k = 1; k < o.guide.length; k++) px.line(g, o.guide[k - 1][0] + ox, o.guide[k - 1][1] + oy, o.guide[k][0] + ox, o.guide[k][1] + oy, '#f2f0e6', 1);
        }
        px.disc(g, x, y, rad, o.done ? '#2a403c' : c);
        if (o.marked) px.disc(g, x, y, rad + 3, '#5ff0e0');
      }
      if (S.ghostT > 0 && S.ghosts && S.ghosts.length) {
        for (let gi = 0; gi < S.ghosts.length; gi++) {
          const gh = S.ghosts[gi];
          const marks = (gh.cursors || []).concat(gh.strains || []);
          for (let mi = 0; mi < marks.length; mi++) {
            const xy = marks[mi];
            if (!xy) continue;
            px.disc(g, xy[0] + ox, xy[1] + oy, 3, '#67d6ff');
          }
        }
      }
      if (S.breath) {
        px.rect(g, ox + 20, oy + 16, CFG.FIELD_W - 40, 2, '#bfefff');
        px.rect(g, ox + 20, oy + CFG.FIELD_H - 18, CFG.FIELD_W - 40, 2, '#bfefff');
      }
      if (RT.wheelShow > 0 && S.players[0] && !S.players[0].gone) {
        const c = S.players[0];
        for (const w of CFG.WHEEL) {
          const x = c.x + ox + w.x * 22, y = c.y + oy + w.y * 22;
          const on = c.tool === w.tool;
          px.disc(g, x, y, on ? 8 : 5, on ? '#5ff0e0' : '#14343c');
          GAME.Art.toolIcon(g, w.tool, x - 4, y - 4, 1);
        }
      }
      for (const p of S.players) if (!p.gone) GAME.Art.drawHand(g, p, ox, oy);
      const vit = Math.max(0, Math.ceil(S.vitals));
      const clk = Math.max(0, Math.ceil(S.clock));
      E.font.text(g, 'VIT ' + vit, 8, 6, vit < 30 ? '#ff7a6a' : '#e8fbf6', { scale: 2, outline: '#06141a' });
      E.font.text(g, 'CLK ' + clk, 8, 26, clk < 20 ? '#ff7a6a' : '#e8fbf6', { scale: 2, outline: '#06141a' });
      E.font.text(g, (S.phaseName || '') + '  ' + (S.activeDoc || ''), 8, 48, '#8fb8b0', { outline: '#06141a' });
      const tool = (S.players[0] && S.players[0].tool) || 'forceps';
      GAME.Art.toolIcon(g, tool, r.W - 28, r.H - 28, 1);
      E.font.text(g, tool.toUpperCase(), r.W - 8, r.H - 36, '#e8fbf6', { align: 'right', outline: '#06141a' });
      if (PREFS.hints) E.font.text(g, game.input.label('useTool'), r.W - 8, r.H - 14, '#5ff0e0', { align: 'right', outline: false });
      const steady = Math.round(S.steady || 0);
      E.font.text(g, 'STEADY ' + steady, 8, r.H - 16, '#5ff0e0', { outline: '#06141a' });
      if (S.codeBlue) E.font.text(g, 'SHOCK', r.W / 2, 64, '#ff7a6a', { align: 'center', scale: 2, outline: '#06141a' });
      if (S.dressing) E.font.text(g, 'DRESSING', r.W / 2, 64, '#f2f0e6', { align: 'center', scale: 2, outline: '#06141a' });
      if (ribbon) E.font.text(g, 'DEMO', r.W - 8, 6, '#f5b700', { align: 'right', scale: 2, outline: '#06141a' });
      if (GAME.TUNE.dirty || RT.cheatUsed) E.font.text(g, 'DEV', 8, 66, '#f5b700', { outline: '#06141a' });
      if (S.t != null && GAME.BARKS && GAME.BARKS.length) {
        const bark = GAME.BARKS[Math.floor(S.t / 4) % GAME.BARKS.length];
        E.font.text(g, bark, r.W / 2, r.H - 28, '#d8e4dc', { align: 'center', outline: '#06141a' });
      }
      if (RT.devOpen) drawDev(g, r);
    });
  }

  const CHEATS = [
    ['reveal', 'Reveal'],
    ['infSteady', 'Infinite Steady'],
    ['lockVitals', 'Lock vitals'],
    ['freezeClock', 'Freeze clock'],
    ['oneHit', 'One hit'],
    ['auto', 'Autosurgeon'],
    ['slow', 'Slow motion'],
    ['win', 'Clear phase'],
    ['lose', 'Force a loss'],
    ['code', 'Vitals to zero'],
  ];
  const SLOW = [0.25, 0.5, 1, 2];

  function devRows() {
    if (RT.devTab === 1) return CHEATS.map(c => c[1]);
    if (RT.devTab === 2) {
      const rows = [];
      for (const id of GAME.ORDER) {
        const def = GAME.CASES[id];
        const n = (def.phases || []).length;
        for (let p = 0; p < n; p++) rows.push(id + ' ' + (def.phases[p].name || p));
      }
      rows.push('Grand Rounds');
      rows.push('Skills Lab');
      return rows;
    }
    return GAME.Dev.KEYS.map(k => k[0]).concat(['Reset tuning']);
  }

  function devAct(dir) {
    const S = RT.S;
    if (RT.devTab === 0) {
      const keys = GAME.Dev.KEYS;
      if (RT.devI >= keys.length) { if (dir === 0) GAME.Dev.reset(); return; }
      if (!dir) return;
      const [path, lo, hi] = keys[RT.devI];
      const [g, k] = path.split('.');
      const step = (hi - lo) / 20;
      const cur = GAME.TUNE[g][k];
      const v = Math.max(lo, Math.min(hi, Math.round((cur + dir * step) * 1000) / 1000));
      GAME.Dev.set(path, v);
      return;
    }
    RT.cheatUsed = true;
    if (dir !== 0 && RT.devTab !== 1) return;
    if (RT.devTab === 1 && dir === 0) {
      const key = CHEATS[RT.devI][0];
      if (key === 'auto') { RT.auto = !RT.auto; RT.cheatUsed = true; return; }
      if (key === 'slow') {
        const i = SLOW.indexOf(game.timeScale);
        game.timeScale = SLOW[(i + 1) % SLOW.length] || 1;
        RT.cheatUsed = true;
        return;
      }
      if (key === 'win' && S) {
        RT.cheatUsed = true;
        for (const o of S.objects) { o.done = true; o.prog = 1; }
        if (S.strain) {
          S.strain.done = true;
          if (S.strain.beads) for (const b of S.strain.beads) b.dead = true;
          if (S.strain.worms) for (const w of S.strain.worms) w.done = true;
          if (S.strain.lobes) for (const L of S.strain.lobes) L.dead = true;
        }
        if (S.flags && S.flags.needIv) S.flags.iv = S.flags.needIv;
        S.hold = false;
        return;
      }
      if (key === 'lose' && S) { RT.cheatUsed = true; GAME.Sim.lose(S, 'dev'); return; }
      if (key === 'code' && S) { RT.cheatUsed = true; S.vitals = 0; return; }
      if (S) {
        S.cheat = S.cheat || {};
        const on = !S.cheat[key];
        GAME.Dev.cheat(S, key, on);
        RT.cheatUsed = true;
      }
      return;
    }
    if (RT.devTab === 2 && dir === 0) {
      const rows = devRows();
      const label = rows[RT.devI] || '';
      RT.cheatUsed = true;
      if (label === 'Grand Rounds') { beginCase('ferry', { players: 1, fromStory: false }); go('op'); return; }
      if (label === 'Skills Lab') { beginCase('lab', { fromStory: false }); go('op'); return; }
      const sp = label.indexOf(' ');
      const id = sp < 0 ? label : label.slice(0, sp);
      const def = GAME.CASES[id];
      if (!def) return;
      const name = sp < 0 ? '' : label.slice(sp + 1);
      let phase = 0;
      (def.phases || []).forEach((ph, i) => { if ((ph.name || String(i)) === name) phase = i; });
      beginCase(id, { phase, fromStory: false });
      go('op');
    }
  }

  function handleDev() {
    if (!RT.devOpen || inSession) return false;
    const I = game.input;
    const rows = devRows();
    if (I.pressed('cancel')) { RT.devOpen = false; I.consumeAll(); return true; }
    if (I.pressed('toolPrev')) RT.devTab = (RT.devTab + 2) % 3;
    if (I.pressed('toolNext')) RT.devTab = (RT.devTab + 1) % 3;
    if (I.pressed('up')) RT.devI = (RT.devI + rows.length - 1) % rows.length;
    if (I.pressed('down')) RT.devI = (RT.devI + 1) % rows.length;
    if (RT.devI >= rows.length) RT.devI = 0;
    if (I.pressed('left')) devAct(-1);
    if (I.pressed('right') || I.pressed('confirm')) devAct(I.pressed('confirm') ? 0 : 1);
    return true;
  }

  function drawDev(g, r) {
    const px = E.px;
    const rows = devRows();
    const tabs = ['Tune', 'Cheats', 'Jump'];
    px.rect(g, r.W - 168, 8, 160, r.H - 16, '#06141a');
    E.font.text(g, tabs[RT.devTab], r.W - 160, 12, '#f5b700', { outline: false });
    const first = Math.max(0, Math.min(RT.devI - 6, rows.length - 12));
    for (let i = 0; i < 12 && first + i < rows.length; i++) {
      const k = first + i;
      const on = k === RT.devI;
      E.font.text(g, (on ? '> ' : '  ') + rows[k], r.W - 160, 28 + i * 12, on ? '#5ff0e0' : '#8fb8b0', { outline: false });
    }
  }

  function drawTitle(r, t) {
    r.sky(['#071018', '#0e2430']);
    r.overlay(g => {
      GAME.Art.titleBackdrop(g, r.W, r.H, t || game.real || 0);
      E.font.title(g, 'OPEN TABLE', r.W / 2, 28, { scale: 2, align: 'center', colors: ['#f4fff8', '#9aefe4', '#1c6e78'] });
      E.font.text(g, TITLE, r.W / 2, 78, '#e8fbf6', { align: 'center', scale: 1, outline: '#06141a' });
      E.font.text(g, "Don't let it go quiet", r.W / 2, 96, '#5ff0e0', { align: 'center', outline: false });
      const y = 120;
      let x = 24;
      const beat = [0, 2, 0, 6, 0, 2, 8, 0, 1, 0, 4, 0];
      for (let i = 0; i < beat.length; i++) {
        const h = 2 + beat[i];
        E.px.rect(g, x, y - h, 6, h, '#7CFFB2');
        x += 10;
      }
      const prompt = game.input.label('confirm');
      E.font.text(g, prompt, r.W / 2, r.H - 28, '#e8fbf6', { align: 'center', scale: 2, outline: '#06141a' });
    });
  }

  function snapshot() {
    const S = RT.S;
    const [ox, oy] = origin();
    let mark = null;
    if (RT.light && RT.light.mark) mark = [ox + RT.light.mark[0], oy + RT.light.mark[1]];
    const choice = !!(story.talk && story.talk.open && story.talk.choices && story.talk.choices.length && !story.talk.typing);
    return {
      scene: game.sceneName,
      menu: RT.menu ? { i: RT.menu.i, labels: RT.menu.items.map(it => (typeof it === 'string' ? it : it.label)) } : null,
      story: story.running ? story.node : null,
      held: !!story._held,
      choice,
      op: S ? {
        id: S.id, won: !!S.won, lost: !!S.lost, phase: S.phase, phaseName: S.phaseName,
        clock: S.clock, vitals: S.vitals, score: S.score, rank: S.rank,
        breath: !!S.breath, worldScale: S.worldScale, closed: !!S.closed,
      } : null,
      lightbox: mark,
      ward: { patients: RT.visitors.slice(), nearDoor: !!RT.nearDoor },
      attract: RT.attract ? { on: true, loops: RT.loops, seg: RT.seg } : null,
      dev: { open: !!RT.devOpen, dirty: !!GAME.TUNE.dirty },
      ranks: Object.assign({}, RT.ranks),
      cleared: Object.assign({}, RT.cleared),
      reel: RT.loops,
    };
  }

  const REEL = [
    { kind: 'story', t: 4 },
    { kind: 'op', id: 'c1', t: 15, cheat: { lockVitals: true, freezeClock: true, oneHit: true } },
    { kind: 'op', id: 'c3', t: 8, cheat: { lockVitals: true, freezeClock: true, oneHit: true } },
    { kind: 'op', id: 'c6', t: 8, cheat: { lockVitals: true, freezeClock: true, oneHit: true } },
    { kind: 'op', id: 'c7', t: 8, cheat: { lockVitals: true, freezeClock: true, infSteady: true } },
    { kind: 'rounds', t: 8 },
    { kind: 'op', id: 'c11', t: 8, cheat: { lockVitals: true, freezeClock: true, oneHit: true } },
    { kind: 'card', t: 4 },
    { kind: 'title', t: 8 },
  ];

  function startSegment() {
    const seg = REEL[RT.seg];
    RT.segT = 0;
    if (seg.kind === 'op') {
      const S = beginCase(seg.id, { fromStory: false, cheat: seg.cheat, seed: 3 });
      if (S) S.mode = 'attract';
      game.setView('overhead');
    } else if (seg.kind === 'rounds') {
      const S = beginCase('ferry', { players: 4, fromStory: false, cheat: { lockVitals: true, freezeClock: true, oneHit: true } });
      if (S) S.mode = 'attract';
      game.setView('overhead');
    } else if (seg.kind === 'story') {
      game.setView('side');
      if (!RT.reelStory) {
        RT.reelStory = new E.Story(game, {
          people,
          nodes: { beat: [GAME.NODES.start[0]] },
          on: {},
        });
      }
      RT.reelStory.skip = true;
      RT.reelStory.run('beat');
    } else game.setView('side');
  }

  const H = {
    info: null,
    phase: 'solo',
    over: false,
    accS: 0,
    accI: 0,
    snapN: 0,
    inN: 0,
    heard: 0,
    hands: {},
    view: null,
    card: null,
    local: -1,
  };

  function hubFinish() {
    if (H.over || !H.info || !H.info.isHost) return;
    H.over = true;
    const info = H.info;
    const S = RT.S;
    const scoreOf = (id) => {
      const idx = info.players.findIndex(q => q.id === id);
      const p = S && S.players[idx];
      return p ? (p.actions | 0) : 0;
    };
    const ids = info.players.map(q => q.id);
    ids.sort((a, b) => scoreOf(b) - scoreOf(a));
    const standings = [];
    for (const id of ids) {
      const last = standings[standings.length - 1];
      if (last && scoreOf(last[0]) === scoreOf(id)) last.push(id);
      else standings.push([id]);
    }
    const scores = {};
    for (const id of ids) scores[id] = scoreOf(id);
    const best = ids[0];
    const detail = (scores[best] || 0) + ' clean actions';
    const awards = best == null ? [] : [{ id: best, title: 'Steadiest Hand', detail: detail.slice(0, 40) }];
    try { HUB.send({ t: 'over', n: ++H.snapN }); } catch (e) { /* late */ }
    HUB.finish({
      standings,
      scores,
      won: !!(S && S.closed),
      awards,
      stats: { clock: S ? Math.round(S.clock) : 0, vitals: S ? Math.round(S.vitals) : 0 },
    });
  }

  const TYPE_N = {};
  ['shard', 'laceration', 'wound', 'bleeder', 'arteryTear', 'pool', 'polyp', 'mass', 'clot', 'bead', 'nest', 'lobe', 'eye', 'tendril', 'voice', 'repeat', 'retractor'].forEach((t, i) => { TYPE_N[t] = i + 1; });

  function sendSnap() {
    const S = RT.S;
    const info = H.info;
    if (!S || !info) return;
    const objs = [];
    for (const o of S.objects) {
      if (objs.length >= 28) break;
      if (o.done && o.type !== 'retractor') continue;
      let flags = (o.done ? 1 : 0) | (o.hidden ? 2 : 0) | (o.marked ? 4 : 0) | (o.alive ? 8 : 0);
      objs.push([o.id, o.x | 0, o.y | 0, TYPE_N[o.type] || 0, flags]);
    }
    const ps = info.players.map((q, i) => {
      const p = S.players[i];
      if (!p) return [q.id, 0, 0, 0, 0, 0, 1];
      const tool = Math.max(0, CFG.TOOLS.indexOf(p.tool));
      return [q.id, p.x | 0, p.y | 0, tool, p.trig > 0.3 ? 1 : 0, p.actions | 0, p.gone ? 1 : 0];
    });
    HUB.send({
      t: 's', n: ++H.snapN,
      clock: S.clock | 0, vitals: S.vitals | 0, phase: S.phase | 0,
      won: S.won ? 1 : 0, closed: S.closed ? 1 : 0, breath: S.breath ? 1 : 0,
      o: objs, p: ps,
    }, { reliable: false });
  }

  function applyHands() {
    const remote = {};
    const info = H.info;
    if (!info) return remote;
    for (const key in H.hands) {
      const i = +key;
      const hnd = H.hands[key];
      if (!hnd) continue;
      remote[i] = { x: hnd.x, y: hnd.y, trig: hnd.trig || 0, digit: hnd.digit || 0, aim: [0, 0], mouse: null };
    }
    return remote;
  }

  async function connect() {
    if (!HUB || !HUB.active) { H.phase = 'solo'; return; }
    let info = null;
    try { info = await HUB.connect({ mode: 'shared-world', seats: [1, 4], card: true }); }
    catch (e) { H.phase = 'solo'; return; }
    if (!info) { H.phase = 'solo'; return; }
    H.info = info;
    H.phase = 'wait';
    H.local = info.players.findIndex(q => q.id === info.me);
    HUB.on('card', c => { H.card = c; });
    HUB.on('start', () => { H.phase = 'count'; });
    HUB.on('message', (d, from) => {
      if (!d) return;
      if (info.isHost) {
        if (d.t === 'i') {
          const idx = info.players.findIndex(q => q.id === from);
          if (idx >= 0) {
            H.hands[idx] = { x: d.x, y: d.y, trig: d.trig || 0, digit: d.digit || 0, n: d.n || 0 };
            const p = RT.S && RT.S.players[idx];
            if (p && d.x != null) { p.x = d.x; p.y = d.y; p.bx = d.x; p.by = d.y; p.trig = d.trig || 0; }
          }
        }
      } else if (from === info.host && d.t === 's' && d.n > H.heard) {
        H.heard = d.n;
        H.view = d;
      }
    });
    HUB.on('leave', ({ id }) => {
      const idx = info.players.findIndex(q => q.id === id);
      if (RT.S && RT.S.players[idx]) RT.S.players[idx].gone = true;
    });
    HUB.on('time-up', () => { if (info.isHost) hubFinish(); });
    HUB.on('end', () => { H.phase = 'over'; try { game.audio.music(null); game.audio.mute(true); } catch (e) { /* quiet */ } });
    if (info.isHost) {
      const rng = HUB.rng('sim');
      const seed = ((rng() * 0x7fffffff) >>> 0) || 1;
      const n = Math.max(1, Math.min(4, info.players.length || 1));
      beginCase('ferry', { players: n, seed, fromStory: false, mode: 'rounds' });
    }
    HUB.ready();
  }

  function stickHot(I) {
    const a = I.padAim, m = I.padMove;
    return (a && Math.hypot(a[0], a[1]) > 0.25) || (m && Math.hypot(m[0], m[1]) > 0.25);
  }

  game.hook('input', (dt) => {
    const I = game.input;
    if (RT.suppress > 0) { RT.suppress--; I.consumeAll(); return; }
    if (!RT.mouseInit) { RT.mouseInit = true; RT.mouseT = I.mouse ? I.mouse.t : 0; }
    let mouseMoved = false;
    if (I.mouse && I.mouse.t !== RT.mouseT) { mouseMoved = true; RT.mouseT = I.mouse.t; }
    const scene = game.sceneName;
    if (scene === 'attract') {
      const hit = I.anyPressed() || I.clicked() || stickHot(I) || mouseMoved || (I.held && I.held.size > 0);
      if (hit) {
        RT.attract = false;
        RT.idle = 0;
        go('title');
        I.consumeAll();
        RT.suppress = 1;
      }
      return;
    }
    const watch = scene === 'title' || scene === 'menu' || scene === 'casefiles' || scene === 'lobby';
    const shellUp = !!(game.shell && game.shell.screen);
    if (!watch || shellUp || game.paused || inSession) { RT.idle = 0; return; }
    let active = I.anyPressed() || !!I.clicked() || stickHot(I) || mouseMoved;
    if (I.held && I.held.size > 0) active = true;
    if (active) RT.idle = 0;
    else RT.idle += dt;
    if (RT.idle >= 10) {
      RT.idle = 0;
      RT.attract = true;
      RT.seg = 0;
      RT.loops = RT.loops || 0;
      go('attract');
    }
  });

  game.hook('enter', (name) => {
    const song = {
      title: 'night', menu: 'night', difficulty: 'night', casefiles: 'night', about: 'night',
      story: 'night', chart: 'night', op: 'theatre', results: 'ward', ward: 'ward',
      credits: 'end', lobby: 'night', lab: 'theatre', attract: 'hush', hub: 'theatre',
    }[name] || 'night';
    try { GAME.Audio.play(song); } catch (e) { /* quiet */ }
  });

  const CAM = { zoom: false, wheel: false };

  const scenes = {
    title: {
      view: 'side', camera: CAM,
      enter() { RT.menu = null; RT.attract = false; },
      update() {
        const I = game.input;
        if (I.pressed('confirm') || I.pressed('start')) go('menu');
      },
      draw(r) { drawTitle(r, game.real); },
    },
    menu: {
      view: 'side', camera: CAM,
      enter() {
        RT.menu = makeMenu(['New Game', 'Case Files', 'Grand Rounds', 'Skills Lab', 'About'], (i, label) => {
          if (label === 'New Game') {
            story.stop();
            RT.saved = {}; RT.ranks = {}; RT.cleared = {}; RT.chapter = 1; RT.chartFor = null;
            RT.fromStory = true; RT.pending = 'story'; RT.cheatUsed = false;
            go('difficulty');
          } else if (label === 'Case Files') go('casefiles');
          else if (label === 'Grand Rounds') go('lobby');
          else if (label === 'Skills Lab') { RT.pending = 'lab'; RT.fromStory = false; go('difficulty'); }
          else if (label === 'About') go('about');
        }, () => go('title'));
      },
      update() { if (RT.menu) RT.menu.update(); },
      draw(r) {
        drawTitle(r, game.real * 0.2);
        if (RT.menu) RT.menu.draw(r);
      },
    },
    difficulty: {
      view: 'side', camera: CAM,
      enter() {
        const items = ['Intern', 'Resident', 'Attending'];
        RT.menu = makeMenu(items, (i) => {
          RT.diff = ['intern', 'resident', 'attending'][i];
          if (game.settings && game.settings.set) { try { game.settings.set('difficulty', RT.diff); } catch (e) { /* pref */ } }
          if (RT.pending === 'lab') { beginCase('lab', { difficulty: RT.diff, fromStory: false }); go('op'); }
          else if (RT.pending === 'file') { beginCase(RT.fileCase, { difficulty: RT.diff, fromStory: false }); go('op'); }
          else go('story');
        }, () => go('menu'));
        RT.menu.i = 0;
      },
      update() { if (RT.menu) RT.menu.update(); },
      draw(r) {
        r.sky(['#071018', '#102028']);
        r.overlay(g => {
          GAME.Art.stage(g, 'office', r.W, r.H, game.real);
          E.font.text(g, 'DIFFICULTY', r.W / 2, 16, '#5ff0e0', { align: 'center', scale: 2, outline: '#06141a' });
        });
        if (RT.menu) RT.menu.draw(r);
      },
    },
    casefiles: {
      view: 'side', camera: CAM,
      enter() {
        const items = GAME.ORDER.map(id => {
          const def = GAME.CASES[id];
          const rank = RT.ranks[id] ? '  ' + RT.ranks[id] : '';
          return (def.name || id) + rank;
        });
        RT.menu = makeMenu(items, (i) => {
          RT.fileCase = GAME.ORDER[i];
          RT.pending = 'file';
          RT.fromStory = false;
          go('difficulty');
        }, () => go('menu'));
      },
      update() { if (RT.menu) RT.menu.update(); },
      draw(r) {
        r.sky(['#071018', '#102028']);
        r.overlay(g => E.font.text(g, 'CASE FILES', r.W / 2, 12, '#5ff0e0', { align: 'center', scale: 2, outline: '#06141a' }));
        if (RT.menu) RT.menu.draw(r);
      },
    },
    lobby: {
      view: 'side', camera: CAM,
      enter() {
        RT.menu = makeMenu(['1 surgeon', '2 surgeons', '3 surgeons', '4 surgeons'], (i) => {
          RT.lobbyN = i + 1;
          beginCase('ferry', { players: RT.lobbyN, fromStory: false, mode: 'rounds' });
          go('op');
        }, () => go('menu'));
      },
      update() { if (RT.menu) RT.menu.update(); },
      draw(r) {
        r.sky(['#071018', '#102028']);
        r.overlay(g => {
          E.font.text(g, 'GRAND ROUNDS', r.W / 2, 16, '#5ff0e0', { align: 'center', scale: 2, outline: '#06141a' });
          E.font.text(g, 'One patient. Shared hands.', r.W / 2, 40, '#8fb8b0', { align: 'center', outline: false });
        });
        if (RT.menu) RT.menu.draw(r);
      },
    },
    story: {
      view: 'side', camera: CAM,
      enter() {
        if (!story.running && !story._held) {
          story.skip = !!(game.debug && game.debug.skipStory);
          story.run('start');
        }
      },
      update(dt) {
        const I = game.input;
        if (I.down('skip') || (game.debug && game.debug.skipStory)) {
          story.skip = true;
          story.talk.speed = 1e6;
        } else story.talk.speed = PREFS.text || 1;
        if (I.pressed('log')) RT.logOpen = !RT.logOpen;
        if (!story.running && !story._held) { go('title'); return; }
        story.update(dt);
      },
      draw(r) {
        const stage = RT.chapter >= 4 ? 'chapel' : RT.chapter === 3 ? 'harbor' : RT.chapter === 2 ? 'office' : 'theatre';
        r.sky(['#071018', '#102028']);
        r.overlay(g => GAME.Art.stage(g, stage, r.W, r.H, game.real));
        story.draw(r);
        if (RT.logOpen) r.overlay(g => {
          E.px.rect(g, 8, 8, r.W - 16, 70, '#06141a');
          const lines = story.log.slice(-4);
          lines.forEach((ln, i) => E.font.text(g, (ln.name ? ln.name + ': ' : '') + ln.text, 12, 12 + i * 14, '#e8fbf6', { outline: false }));
        });
      },
    },
    chart: {
      view: 'overhead', camera: CAM,
      enter(data) {
        const id = data && data.caseId;
        RT.chartCase = id;
        RT.light = GAME.LIGHT[id] || null;
        RT.miss = 0;
      },
      update() {
        const I = game.input;
        const light = RT.light;
        if (!light) {
          beginCase(RT.chartCase, { fromStory: true, seed: 3 });
          go('op');
          return;
        }
        const c = I.clicked();
        if (!c) return;
        const [ox, oy] = origin();
        const mx = ox + light.mark[0], my = oy + light.mark[1];
        const d = Math.hypot(c[0] - mx, c[1] - my);
        if (d <= 14) {
          RT.chartFor = RT.chartCase;
          const S = beginCase(RT.chartCase, { fromStory: true, seed: 3 });
          if (S) { S.clock += 20; S.steady += 20; }
          go('op');
        } else {
          RT.miss += 1;
          if (RT.miss >= 3) {
            RT.chartFor = RT.chartCase;
            const S = beginCase(RT.chartCase, { fromStory: true, seed: 3 });
            if (S) S.clock -= 10 * RT.miss;
            go('op');
          }
        }
      },
      draw(r) {
        r.sky(['#0c1418', '#183028']);
        r.overlay(g => {
          GAME.Art.stage(g, 'office', r.W, r.H, 0);
          const light = RT.light;
          E.font.text(g, 'SECOND OPINION', r.W / 2, 12, '#5ff0e0', { align: 'center', scale: 2, outline: '#06141a' });
          if (!light) return;
          const text = light.text || '';
          E.font.text(g, text, r.W / 2, 36, '#e8fbf6', { align: 'center', outline: '#06141a', wrap: r.W - 40 });
          const [ox, oy] = origin();
          const mx = ox + light.mark[0], my = oy + light.mark[1];
          E.px.rect(g, mx - 6, my - 1, 12, 2, '#f5b700');
          E.px.rect(g, mx - 1, my - 6, 2, 12, '#f5b700');
          E.font.text(g, 'Misses ' + RT.miss, 8, r.H - 16, '#8fb8b0', { outline: false });
        });
      },
    },
    op: {
      view: 'overhead', camera: CAM, pausable: true,
      enter() { game.setView('overhead'); },
      update(dt) {
        const S = RT.S;
        if (!S) { go('menu'); return; }
        handleDev();
        game.focus(game.W / 2, game.H / 2, 0);
        const fast = game.debug && game.debug.driver && !RT.attract;
        if (fast) {
          for (let k = 0; k < 16; k++) drive(S, 1 / 45);
        } else drive(S, dt);
        const mv = game.input.padMove || [0, 0];
        if (Math.hypot(mv[0] || 0, mv[1] || 0) > 0.6 || game.input.down('wheelHold')) RT.wheelShow = 0.35;
        else RT.wheelShow = Math.max(0, (RT.wheelShow || 0) - dt);
        if ((S.won || S.lost) && !RT.leftOp) {
          RT.leftOp = true;
          if (!RT.attract) go('results');
        }
      },
      draw(r) { game.focus(game.W / 2, game.H / 2, 0); drawOp(r, RT.S, false); },
    },
    results: {
      view: 'side', camera: CAM,
      enter() {
        recordRank();
        const S = RT.S;
        const items = S && S.lost ? ['Retry', 'Give up'] : ['Continue'];
        RT.menu = makeMenu(items, (i, label) => {
          if (label === 'Retry' && RT.S) {
            GAME.Op.retryPhase(RT.S);
            RT.leftOp = false;
            go('op');
            return;
          }
          leaveResults();
        });
      },
      update() { if (RT.menu) RT.menu.update(); },
      draw(r) {
        const S = RT.S;
        r.sky(['#071018', '#102028']);
        r.overlay(g => {
          GAME.Art.stage(g, 'theatre', r.W, r.H, 0);
          const head = S && S.won ? 'CLOSED' : 'LOST';
          E.font.text(g, head, r.W / 2, 16, S && S.won ? '#5ff0e0' : '#ff7a6a', { align: 'center', scale: 2, outline: '#06141a' });
          if (S) {
            const tag = (GAME.TUNE.dirty || RT.cheatUsed) ? 'DEV' : (S.rank || '');
            E.font.text(g, tag + '   ' + Math.round(S.score || 0), r.W / 2, 42, '#e8fbf6', { align: 'center', scale: 2, outline: '#06141a' });
            E.font.text(g, 'Vitals ' + Math.round(S.vitals) + '   Clock ' + Math.round(S.clock), r.W / 2, 66, '#8fb8b0', { align: 'center', outline: false });
          }
        });
        if (RT.menu) RT.menu.draw(r);
      },
    },
    ward: {
      view: 'threequarter', camera: CAM, pausable: true,
      enter() {
        game.saves.canSave = true;
        try { game.saves.autosave(); } catch (e) { /* visit only */ }
        const W = game.W, H = game.H;
        RT.door = { x: (W / 2) | 0, y: H - 36 };
        RT.hero = { x: RT.door.x - 18, y: RT.door.y, tx: null, ty: null };
        const list = (GAME.WARD[RT.chapter] || GAME.WARD[1] || []).filter(id => RT.saved[id]);
        RT.visitors = list.map((id, i) => ({ id, x: 36 + i * 40, y: 70 }));
        RT.nearDoor = true;
        RT.line = '';
      },
      exit() { game.saves.canSave = false; },
      update(dt) {
        if (handleDev()) {
          /* panel owns the arrows; walking still uses the letter keys below when the panel is shut */
        }
        const I = game.input;
        const h = RT.hero;
        if (!RT.devOpen) {
          let ax = 0, ay = 0;
          const m = I.move();
          ax += m[0]; ay += m[1];
          if (I.held && I.held.has('KeyA')) ax -= 1;
          if (I.held && I.held.has('KeyD')) ax += 1;
          if (I.held && I.held.has('KeyW')) ay -= 1;
          if (I.held && I.held.has('KeyS')) ay += 1;
          const c = I.clicked();
          if (c) { h.tx = c[0]; h.ty = c[1]; }
          if (ax || ay) {
            const L = Math.hypot(ax, ay) || 1;
            h.x += (ax / L) * 80 * dt;
            h.y += (ay / L) * 80 * dt;
            h.tx = null;
          } else if (h.tx != null) {
            const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
            if (d < 2) h.tx = null;
            else { h.x += dx / d * Math.min(d, 80 * dt); h.y += dy / d * Math.min(d, 80 * dt); }
          }
          h.x = Math.max(12, Math.min(game.W - 12, h.x));
          h.y = Math.max(28, Math.min(game.H - 16, h.y));
        }
        const doorD = Math.hypot(h.x - RT.door.x, h.y - RT.door.y);
        RT.nearDoor = doorD <= 36;
        if (RT.lineT > 0) RT.lineT -= dt;
        if (!RT.devOpen && (I.pressed('confirm') || I.pressed('interact'))) {
          if (RT.nearDoor) {
            if (!resumeHeld()) go('menu');
            return;
          }
          for (const v of RT.visitors) {
            if (Math.hypot(h.x - v.x, h.y - v.y) < 28) {
              const p = GAME.PEOPLE[v.id];
              RT.line = p ? p.name + ': ' + p.line : '';
              RT.lineT = 4;
            }
          }
        }
      },
      draw(r) {
        game.focus(r.W / 2, r.H / 2, 0);
        r.sky(['#0c1814', '#163028']);
        r.overlay(g => {
          const px = E.px;
          GAME.Art.stage(g, 'theatre', r.W, r.H, game.real);
          px.rect(g, RT.door.x - 10, RT.door.y - 16, 20, 28, '#c8a45a');
          px.rect(g, RT.door.x - 2, RT.door.y - 2, 3, 3, '#f0e2b0');
          for (const v of RT.visitors) GAME.Art.bust(g, v.id, { expr: 'smile' }, v.x - 16, v.y - 28, 36);
          px.disc(g, RT.hero.x, RT.hero.y, 5, '#e8443a');
          E.font.text(g, 'WARD', 8, 8, '#5ff0e0', { scale: 2, outline: '#06141a' });
          if (RT.nearDoor) E.font.text(g, game.input.label('interact'), RT.door.x, RT.door.y - 22, '#e8fbf6', { align: 'center', outline: '#06141a' });
          if (RT.line && RT.lineT > 0) E.font.text(g, RT.line, r.W / 2, r.H - 28, '#e8fbf6', { align: 'center', outline: '#06141a', wrap: r.W - 24 });
          if (RT.devOpen) drawDev(g, r);
        });
      },
    },
    credits: {
      view: 'side', camera: CAM,
      enter() { RT.creditPage = 0; },
      update() {
        const I = game.input;
        const pages = creditPages();
        if (I.pressed('confirm') || I.pressed('right') || I.pressed('start')) {
          RT.creditPage += 1;
          if (RT.creditPage >= pages.length) {
            RT.redirect = false;
            if (story._held) story.resume();
            if (!RT.redirect) go('story');
          }
        } else if (I.pressed('left') && RT.creditPage > 0) RT.creditPage -= 1;
      },
      draw(r) {
        const pages = creditPages();
        const page = pages[Math.min(RT.creditPage, pages.length - 1)];
        r.sky(['#070c14', '#142028']);
        r.overlay(g => {
          GAME.Art.stage(g, 'harbor', r.W, r.H, game.real);
          E.font.text(g, page.title, r.W / 2, 16, '#5ff0e0', { align: 'center', scale: 2, outline: '#06141a' });
          const body = page.body || '';
          E.font.text(g, body, 16, 44, '#e8fbf6', { outline: '#06141a', wrap: r.W - 32 });
          E.font.text(g, game.input.label('confirm'), r.W - 8, r.H - 14, '#8fb8b0', { align: 'right', outline: false });
        });
      },
    },
    about: {
      view: 'side', camera: CAM,
      enter() { RT.creditPage = 0; },
      update() {
        const I = game.input;
        const pages = aboutPages();
        if (I.pressed('cancel')) { go('menu'); return; }
        if (I.pressed('confirm') || I.pressed('right')) {
          RT.creditPage = Math.min(pages.length - 1, RT.creditPage + 1);
        } else if (I.pressed('left') && RT.creditPage > 0) RT.creditPage -= 1;
      },
      draw(r) {
        const pages = aboutPages();
        const page = pages[RT.creditPage] || pages[0];
        r.sky(['#071018', '#102028']);
        r.overlay(g => {
          E.font.text(g, page.title, 12, 8, '#5ff0e0', { scale: 2, outline: '#06141a' });
          E.font.text(g, page.body, 12, 32, '#e8fbf6', { outline: '#06141a', wrap: r.W - 24 });
        });
      },
    },
    attract: {
      view: 'side', camera: CAM,
      enter() {
        RT.attract = true;
        RT.seg = 0;
        startSegment();
      },
      exit() { RT.attract = false; },
      update(dt) {
        const seg = REEL[RT.seg];
        RT.segT += dt;
        if (seg.kind === 'story' && RT.reelStory) RT.reelStory.update(dt);
        if ((seg.kind === 'op' || seg.kind === 'rounds') && RT.S && !RT.S.won && !RT.S.lost) {
          game.focus(game.W / 2, game.H / 2, 0);
          drive(RT.S, dt, { bots: true });
        }
        if (RT.segT >= seg.t) {
          RT.seg += 1;
          if (RT.seg >= REEL.length) { RT.seg = 0; RT.loops += 1; }
          startSegment();
        }
      },
      draw(r) {
        const seg = REEL[RT.seg];
        if (seg.kind === 'title') drawTitle(r, game.real);
        else if (seg.kind === 'card') {
          r.sky(['#071018', '#102028']);
          r.overlay(g => {
            E.font.text(g, 'DEMO', r.W / 2, 40, '#f5b700', { align: 'center', scale: 2, outline: '#06141a' });
            E.font.text(g, TITLE, r.W / 2, 70, '#e8fbf6', { align: 'center', outline: '#06141a' });
          });
        } else if (seg.kind === 'story') {
          r.sky(['#071018', '#102028']);
          r.overlay(g => {
            GAME.Art.stage(g, 'theatre', r.W, r.H, game.real);
            E.font.text(g, 'DEMO', 8, 8, '#f5b700', { scale: 2, outline: '#06141a' });
          });
          if (RT.reelStory) RT.reelStory.draw(r);
        } else drawOp(r, RT.S, true);
      },
    },
    hub: {
      view: 'overhead', camera: CAM, pausable: true,
      enter() { game.setView('overhead'); },
      update(dt) {
        const I = game.input;
        const info = H.info;
        if (!info) return;
        const server = !!(info.server || HUB.server || H.local < 0);
        if (H.phase === 'wait') {
          if (I.pressed('confirm') || I.pressed('start')) HUB.answer('ready');
          if (I.pressed('more')) HUB.answer('more');
          const c = I.clicked();
          if (c) HUB.answer(c[1] > game.H * 0.7 ? 'more' : 'ready');
          return;
        }
        if (H.phase === 'count' && HUB.time() >= 0) H.phase = 'play';
        if (H.phase !== 'play' || H.over) return;
        const S = RT.S;
        if (info.isHost && S) {
          game.focus(game.W / 2, game.H / 2, 0);
          const remote = applyHands();
          if (!server && H.local >= 0) {
            const mine = readLocal(S.players[H.local] || S.players[0]);
            remote[H.local] = mine;
          }
          drive(S, dt, { remote, bots: true });
          for (const key in remote) {
            const i = +key;
            const hnd = remote[i];
            if (hnd && hnd.x != null && S.players[i]) {
              /* host already applied x,y through the step */
            }
          }
          H.accS += dt;
          if (H.accS >= 1 / 12) { H.accS = 0; sendSnap(); }
        } else if (!server) {
          const p = { tool: 'forceps', x: 213, y: 150 };
          const mine = readLocal(p);
          H.accI += dt;
          if (H.accI >= 1 / 15) {
            H.accI = 0;
            const ptr = mine.mouse || [p.x, p.y];
            const pin = H.pin;
            HUB.send({
              t: 'i', n: ++H.inN,
              x: pin ? pin.x : Math.round(ptr[0]),
              y: pin ? pin.y : Math.round(ptr[1]),
              trig: pin ? (pin.trig || 0) : (mine.trig > 0.3 ? 1 : 0),
              digit: mine.digit || 0,
            }, { to: info.host, reliable: false });
          }
        }
      },
      draw(r) {
        const info = H.info;
        if (info && (info.server || HUB.server)) return;
        if (H.phase === 'play' && RT.S && H.info && H.info.isHost) { drawOp(r, RT.S, false); return; }
        r.sky(['#071018', '#14504a']);
        r.overlay(g => {
          E.font.text(g, TITLE, 8, 8, '#e8fbf6', { outline: false });
          E.font.text(g, H.phase, 8, 22, '#5ff0e0', { outline: false });
          const left = H.card && H.card.left != null ? Math.ceil(H.card.left / 1000) : '';
          if (left !== '') E.font.text(g, String(left), 8, 36, '#f5b700', { outline: false });
          E.font.text(g, game.input.label('confirm'), 8, r.H - 28, '#e8fbf6', { outline: false });
          E.font.text(g, game.input.label('more'), 8, r.H - 16, '#8fb8b0', { outline: false });
          if (info) {
            info.players.forEach((q, i) => {
              const col = CFG.SEAT[i] || q.color || '#e8443a';
              E.px.disc(g, 20, 60 + i * 16, 4, col);
              E.font.text(g, String(q.name || ('P' + (i + 1))).slice(0, 12), 30, 54 + i * 16, col, { outline: false });
            });
          }
        });
      },
    },
  };

  function aboutPages() {
    const A = GAME.ABOUT;
    const order = GAME.About.ORDER;
    const labels = GAME.About.LABELS;
    const src = order.map(k => labels[k] + ': ' + A.sourceInformation[k]).join('\n');
    return [
      { title: 'Source Information', body: src },
      { title: 'Testing Feedback', body: A.testingFeedback.join('\n') },
      { title: 'Engine Feedback', body: A.engineFeedback.join('\n') },
      { title: 'Prompt Feedback', body: A.promptFeedback.join('\n') },
    ];
  }
  function creditPages() {
    const cast = Object.keys(GAME.CAST).map(id => GAME.CAST[id].name + '  ' + GAME.CAST[id].role).join('\n');
    return [{ title: 'Open Table', body: cast }].concat(aboutPages(), [
      { title: 'Incoming', body: 'A chart is on the night desk. The shift is over. The next one starts at seven.' },
    ]);
  }

  game.saves.write = () => ({
    data: {
      ranks: RT.ranks, cleared: RT.cleared, saved: RT.saved, chapter: RT.chapter,
      story: story.state(), diff: RT.diff,
    },
    place: 'St. Erasmus Harbor Hospital',
    level: RT.chapter || 1,
  });
  game.saves.read = (save) => {
    const d = save && save.data || {};
    RT.ranks = d.ranks || {};
    RT.cleared = d.cleared || {};
    RT.saved = d.saved || {};
    RT.chapter = d.chapter || 1;
    RT.diff = d.diff || RT.diff;
    if (d.story) story.restore(d.story);
  };
  game.saves.canSave = false;

  game.debug = {
    skipStory: false,
    driver: null,
    snapshot,
  };
  G.__ot = () => game.debug.snapshot();
  G.__hubProbe = () => ({
    phase: H.phase,
    over: !!H.over,
    host: !!(H.info && H.info.isHost),
    scene: game.sceneName,
    active: !!(HUB && HUB.active),
    players: (RT.S && RT.S.players || []).map(p => ({ id: p.id, x: p.x, y: p.y, tool: p.tool, trig: p.trig, actions: p.actions })),
    t: HUB && HUB.active ? HUB.time() : 0,
  });
  G.__hubInject = (x, y, trig) => {
    if (!H.info) return;
    if (H.info.isHost && RT.S) {
      const idx = H.local >= 0 ? H.local : 0;
      const p = RT.S.players[idx];
      if (p) { p.x = x; p.y = y; p.bx = x; p.by = y; p.trig = trig || 0; }
      return;
    }
    H.pin = { x, y, trig: trig || 0 };
    try {
      HUB.send({ t: 'i', n: ++H.inN, x, y, trig: trig || 0, digit: 0 }, { to: H.info.host, reliable: true });
    } catch (e) { /* not in a session */ }
  };

  if (typeof document !== 'undefined') document.title = TITLE;

  try { GAME.Audio.install(game); } catch (e) { /* headless */ }
  game.audio.sfxVolume = 1;
  game.audio.voiceVolume = 0.9;
  game.audio.volume = 0.7;
  if (game.audio.musicVolume == null || game.audio.musicVolume > 0.2) game.audio.musicVolume = 0.1;
  if (game.audio.applyVolume) game.audio.applyVolume();

  game.start({
    scene: inSession ? 'hub' : 'title',
    scenes,
  });
  try { GAME.Audio.play(inSession ? 'theatre' : 'night'); } catch (e) { /* quiet */ }

  if (inSession) connect();

  GAME.Shell = { game, story, RT, snapshot, beginCase, people };
})();
