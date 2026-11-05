/* AMERICAN FOOTBALL FIASCO: the scenes. Title (with the touch-only notice), attract mode (AI plays, cheats, any input exits),
 * the match (Exhibition, THE FIASCO CUP, Practice), results, the Hall of Fiasco, About and Credits, and Dev mode (the sliders,
 * opened from the pause menu, returning to the same match). */
(() => {
'use strict';
const FF = window.FF, E = FF.E, D = FF.data, S = FF.sim, V = FF.view, { px, clamp, lerp } = FF;
const game = FF.game, A = FF.A, scenes = FF.scenes, store = E.store;
// the radio types its lines as the scene runs: every scene that shows one ticks it
const radio = dt => { const t = FF.talk(); if (t) t.update(dt); };

/* ---- the modes: what a match is, from the title's pick ---- */
const cupIndex = () => clamp(store.get('cup:chapter', 0), 0, D.CHAPTERS.length - 1);
// the cutscenes of the cup: the owner and the captain before each game, and after it the owner's word on the result
const preLines = i => { const ch = D.CHAPTERS[i]; return [['OWNER', ch.intro[0]]].concat(ch.intro[1] ? [['CAPTAIN', ch.intro[1]]] : [], [['CAPTAIN', 'Right. Let us go and lose to the ' + D.opponent(ch).name + ' with dignity.']]); };
const postLines = (i, won) => { const ch = D.CHAPTERS[i], last = i + 1 >= D.CHAPTERS.length; return [['OWNER', won > 0 ? ch.win[0] : ch.lose[0]]].concat(won > 0 && last ? [['OWNER', 'THE FIASCO CUP IS OURS. Somebody call the newspaper, and then call the other newspaper.']] : []); };
const modeCfg = (mode, data) => {
  if (mode === 'drill') { const dr = D.DRILLS.find(d => d.key === (data && data.drill)) || D.DRILLS[0]; return { mode, human: [0], drill: dr, chapter: { title: 'DRILL', opp: 1, difficulty: .6, quarter: 9999 }, seed: 21 }; }
  if (mode === 'cup') { const ch = D.CHAPTERS[cupIndex()]; return { mode, human: [0], chapter: ch, seed: 11 + cupIndex(), showNames: false }; }
  if (mode === 'practice') return { mode, practice: true, human: [0], chapter: { title: 'PRACTICE', opp: 1, difficulty: .45, quarter: 9999 }, seed: 5 };
  return { mode: 'exhibition', human: [0], chapter: { title: 'EXHIBITION', opp: 1, difficulty: 1, quarter: 120 }, seed: 3 };
};
FF.cupIndex = cupIndex;
FF.setResults = d => { resultsData = d; };

// the field's build is cached by the colors (the chapter changes the opponent's end zone)
let builtKey = '';
const buildFor = ch => {
  const L = D.TEAMS[0].ez, Rt = D.opponent(ch).ez, key = L + Rt;
  if (key !== builtKey) { FF.field.build(L, Rt); builtKey = key; }
};
FF.buildFor = buildFor;

/* ---- TITLE ---- */
let titleMenu, aboutMenu, resultsMenu, idle = 0, resultsData = null, resultsItems = [];
const titleItems = () => [
  { label: 'EXHIBITION', disabled: FF.touchOnly }, { label: 'VERSUS (2 PLAYERS)', disabled: FF.touchOnly }, { label: 'THE FIASCO CUP', disabled: FF.touchOnly }, { label: 'PRACTICE DRILLS', disabled: FF.touchOnly },
  'HALL OF FIASCO', 'ABOUT AND CREDITS', 'OPTIONS'
];
scenes.title = {
  enter() { A.music(FF.titleSong); idle = 0; titleMenu = new E.Menu(game, titleItems(), { y: 120, x: 'center', onPick: pickTitle }); },
  update(dt) {
    radio(dt);
    if (game.input.anyPressed()) idle = 0; else idle += dt;
    if (idle > 10) return game.go('attract', null, { fade: 'dissolve', seconds: .5 });   // no input for ten seconds: the attract mode
    titleMenu.update(dt);
  },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'AMERICAN FOOTBALL', r.W / 2, 22, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
      E.font.title(g, 'FIASCO', r.W / 2, 50, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      E.font.text(g, 'THE TUMBLEWEED JUNCTION FISCOS HAVE LOST 99 IN A ROW', r.W / 2, 96, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
      if (FF.touchOnly) E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H - 36, '#ffe7a8', { align: 'center', font: 'tiny', outline: '#000' });
      else E.font.text(g, FF.prompt('confirm', 'PICK') + '   ' + FF.label('cancel') + ' BACK', r.W / 2, r.H - 16, '#8a90a8', { align: 'center', font: 'tiny', outline: false });
    });
    titleMenu.draw(r);
  }
};
function pickTitle(i) {
  const item = titleItems()[i], label = typeof item === 'string' ? item : item.label;
  if (label === 'EXHIBITION') game.go('play', { mode: 'exhibition' });
  else if (label === 'VERSUS (2 PLAYERS)') game.go('play', { mode: 'versus' });
  else if (label === 'THE FIASCO CUP') game.go('cutscene', { lines: preLines(cupIndex()), next: { scene: 'play', data: { mode: 'cup' } } }, { fade: 0 });
  else if (label === 'PRACTICE DRILLS') game.go('drills');
  else if (label === 'HALL OF FIASCO') game.go('hall');
  else if (label === 'ABOUT AND CREDITS') game.go('about');
  else if (label === 'OPTIONS') game.menu('settings');
}

/* ---- ATTRACT: the match plays itself, cheats (turbo never runs out), any input exits ---- */
scenes.attract = {
  pausable: false,
  enter() {
    A.music(FF.song); const ch = D.CHAPTERS[(Math.random() * D.CHAPTERS.length) | 0];
    buildFor(ch); S.start({ attract: true, human: null, chapter: Object.assign({}, ch, { quarter: 45 }), seed: (Math.random() * 1e6) | 0 });
  },
  update(dt) {
    if (game.input.anyPressed()) return game.go('title', null, { fade: 0 });
    if (S.over) { return game.go('title', null, { fade: 0 }); }
    radio(dt); S.update(dt); V.focus();
  },
  draw(r) {
    V.frame(r);
    r.overlay(g => { E.font.title(g, 'ATTRACT', r.W / 2, 4, { align: 'center', scale: 2, colors: ['#ffe08a', '#ffb347'], depth: 2 }); E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 14, '#fffbe8', { align: 'center', font: 'tiny', outline: '#000' }); });
  }
};

/* ---- THE MATCH: pause (Escape or Start) opens the menu, which has the Dev mode ---- */
scenes.play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown'], res: 'ps1', expand: true, camera: { zoom: [.5, 1.6], start: .6 },
  enter(data) {
    if (data && data.resume) return;                       // back from the Dev mode: the match goes on
    const mode = (data && data.mode) || 'exhibition', cfg = modeCfg(mode, data);
    buildFor(cfg.chapter); FF.field.lights();
    A.music(FF.song);
    if (S.extras) S.extras.enter();
    S.start(cfg);
    if (mode === 'versus') FF.joinVersus();
    else game.allowJoin(false);
    if (cfg.mode === 'cup') { const ch = cfg.chapter; for (const line of ch.intro) FF.radio(line, 3); }
    else FF.radio(D.LINES.kickoff[0], 2.6);
  },
  update(dt) {
    if (S.over) { resultsData = { mode: S.cfg.mode, score: S.score.slice(), stats: S.stats, chapter: S.cfg.chapter, cfg: S.cfg }; return game.go('results', null, { fade: 0 }); }
    // the call: the human's cards (up, down, left, right, pick)
    const I = S.ctrlOf(S.poss), humanOff = !!I;
    if (S.phase === 'call' && humanOff && I.pressed('juke') && S.extras && S.extras.meter >= 100 && S.poss === 0) { I.consume('juke'); S.extras.useCard(); }
    if (S.extras && S.extras.replaying()) { S.extras.replayStep(dt); radio(dt); V.focus(); return; }
    if (S.phase === 'call' && humanOff && !S.drill) {
      const n = D.CARDS.length;
      if (I.pressed('right')) S.cursor = (S.cursor + 1) % n;
      if (I.pressed('left')) S.cursor = (S.cursor + n - 1) % n;
      if (I.pressed('down') || I.pressed('up')) S.cursor = (S.cursor + 4) % n;
      if (I.pressed('confirm')) {
        const k = D.CARDS[S.cursor];
        if (D.PLAYS[k].kind === 'kick' && S.down !== 4) { FF.radio('Not on this down, coach. Pick a run or a throw.', 1.8); A.sfx('cancel'); }
        else { A.sfx('select'); S.pickCall(k); }
      }
    }
    radio(dt); S.update(dt); V.focus();
  },
  draw(r) { V.frame(r); }
};
// the attract and the pause menu's Dev mode return to the match (resume), not a new one
FF.devFromPause = () => { game.resume(); game.go('dev', { back: 'play' }, { fade: 0 }); };

/* ---- RESULTS: the final score, the stats, what's next ---- */
scenes.results = {
  enter() {
    const d = resultsData || { score: [0, 0], stats: null, mode: 'exhibition' };
    const won = d.score[0] > d.score[1] ? 1 : d.score[0] < d.score[1] ? -1 : 0;
    // (the record is kept once per match: the reel and back again do not count it twice)
    const first = !d.recorded; d.recorded = true;
    const hall = store.get('hall', { games: 0, wins: 0, losses: 0, tds: 0, bigHits: 0, megaHits: 0, best: 0, passes: 0, cup: 0 });
    if (first) { hall.games++; if (won > 0) hall.wins++; if (won < 0) hall.losses++; hall.tds += d.stats.td[0]; hall.bigHits += d.stats.bigHits; hall.megaHits += d.stats.megaHits; hall.passes += d.stats.pass; hall.best = Math.max(hall.best, d.score[0]); store.set('hall', hall); }
    if (first && d.mode === 'cup') {
      const i = cupIndex(); d.prevIdx = i;
      if (won > 0) { if (i + 1 >= D.CHAPTERS.length) { store.set('cup:chapter', 0); hall.cup++; store.set('hall', hall); } else store.set('cup:chapter', i + 1); }
      if (first) FF.radio(won > 0 ? D.CHAPTERS[i].win[0] : D.CHAPTERS[i].lose[0], 4);
    } else if (first) FF.radio(won > 0 ? D.LINES.win[0] : won < 0 ? D.LINES.lose[0] : 'A draw. Nobody has ever heard of a draw in this town.', 3);
    resultsData = Object.assign(d, { won });
    const cup = d.mode === 'cup', reel = !!(S.extras && S.extras.clips.length);
    // the menu: the next step, the highlights (when there are any), the menu
    resultsItems = [cup ? (won > 0 ? 'NEXT CHAPTER' : 'TRY AGAIN') : 'REMATCH', ...(reel ? ['HIGHLIGHTS'] : []), 'MENU'];
    if (window.AIHub && AIHub.active) { resultsMenu = new E.Menu(game, [], { y: 170, x: 'center', onPick: () => {} }); } else resultsMenu = new E.Menu(game, resultsItems, { y: 170, x: 'center', onPick: i => { const k = resultsItems[i]; if (k === 'HIGHLIGHTS') game.go('reel', null, { fade: 0 }); else if (k === 'MENU') game.go('title'); else if (d.mode === 'cup') { const i = d.prevIdx, finished = won > 0 && i + 1 >= D.CHAPTERS.length; game.go('cutscene', { lines: postLines(i, won), next: finished ? { scene: 'title' } : { scene: 'cutscene', data: { lines: preLines(cupIndex()), next: { scene: 'play', data: { mode: 'cup' } } } } }, { fade: 0 }); }
      else game.go('play', { mode: d.mode, drill: d.drill }, { fade: 0 }); } });
  },
  update(dt) { radio(dt); resultsMenu.update(dt); if (game.input.pressed('cancel')) game.go('title'); },
  draw(r) {
    const d = resultsData;
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      const w = d.won, title = w > 0 ? 'FISCOS WIN' : w < 0 ? 'FISCOS LOSE' : 'A DRAW';
      E.font.title(g, title, r.W / 2, 22, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
      E.font.text(g, D.TEAMS[0].short + ' ' + d.score[0] + '  -  ' + d.score[1] + ' ' + (d.chapter ? D.opponent(d.chapter).short : 'OPP'), r.W / 2, 62, '#f0ecdc', { align: 'center', scale: 2, shadow: '#000', outline: false });
      const s = d.stats;
      const rows = ['YARDS ' + s.yards[0] + ' - ' + s.yards[1], 'TOUCHDOWNS ' + s.td[0] + ' - ' + s.td[1], 'BIG HITS ' + s.bigHits + ' (MEGA ' + s.megaHits + ')', 'PASSES ' + s.pass + '   PICKS ' + s.ints + '   FUMBLES ' + s.fumbles];
      rows.forEach((t, i) => E.font.text(g, t, r.W / 2, 94 + i * 12, '#c8d0e8', { align: 'center', font: 'tiny', outline: false }));
      E.font.text(g, FF.prompt('confirm', 'PICK'), r.W / 2, r.H - 14, '#8a90a8', { align: 'center', font: 'tiny', outline: false });
    });
    resultsMenu.draw(r);
  }
};

/* ---- HALL OF FIASCO: the records ---- */
scenes.hall = {
  update() { if (game.input.pressed('cancel') || game.input.pressed('confirm')) game.go('title'); },
  draw(r) {
    const h = store.get('hall', { games: 0, wins: 0, losses: 0, tds: 0, bigHits: 0, megaHits: 0, best: 0, passes: 0, cup: 0 });
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'HALL OF FIASCO', r.W / 2, 18, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 });
      const rows = [['GAMES', h.games], ['WINS', h.wins], ['LOSSES', h.losses], ['MOST POINTS IN A GAME', h.best], ['TOUCHDOWNS', h.tds], ['BIG HITS', h.bigHits], ['MEGA HITS', h.megaHits], ['PASSES', h.passes], ['FIASCO CUPS', h.cup]];
      rows.forEach(([k, v], i) => { E.font.text(g, k, r.W / 2 - 110, 56 + i * 16, '#c8d0e8', { font: 'tiny', outline: false }); E.font.text(g, String(v), r.W / 2 + 110, 56 + i * 16, '#ffe7a8', { font: 'tiny', outline: false, align: 'right' }); });
      E.font.text(g, FF.label('cancel') + ' BACK', r.W / 2, r.H - 16, '#8a90a8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* ---- ABOUT AND CREDITS: the Source Information, the feedback, the engine and the thanks; pages by left and right ---- */
const ABOUT_PAGES = [
  ['AMERICAN FOOTBALL FIASCO', 'A 7-A-SIDE OVER-THE-TOP FOOTBALL GAME', '', 'SOURCE INFORMATION',
    'Date: ' + D.SOURCE.date, 'Source: ' + D.SOURCE.source, 'Plan: ' + D.SOURCE.plan, 'Genre: ' + D.SOURCE.genre,
    'Perspective: ' + D.SOURCE.perspective, 'Tech: ' + D.SOURCE.tech],
  ['SOURCE INFORMATION (CONT.)', 'Art direction: ' + D.SOURCE.artDirection, 'Animation: ' + D.SOURCE.animation, 'Audio: ' + D.SOURCE.audio,
    'Online: ' + D.SOURCE.online, 'Testing: ' + D.SOURCE.testing, 'Research: ' + D.SOURCE.research],
  ['SOURCE INFORMATION (END)', 'Environment: ' + D.SOURCE.environment, 'Model: ' + D.SOURCE.model, 'Usage: ' + D.SOURCE.usage, '',
    'Thanks to the my-3D2dge engine, and to the Tumbleweed Junction Fiascos for the tradition.'],
];
scenes.about = {
  enter() { this.page = 0; },
  update() {
    const I = game.input;
    if (I.pressed('right') || I.pressed('down')) this.page = Math.min(ABOUT_PAGES.length - 1, this.page + 1);
    if (I.pressed('left') || I.pressed('up')) this.page = Math.max(0, this.page - 1);
    if (I.pressed('cancel') || (I.pressed('confirm') && this.page === ABOUT_PAGES.length - 1)) game.go('title');
  },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      const lines = ABOUT_PAGES[this.page];
      E.font.title(g, lines[0], r.W / 2, 10, { align: 'center', scale: 1, colors: ['#fffbe8', '#ffe08a'], depth: 1 });
      let y = 36;
      for (const t of lines.slice(1)) { for (const w of E.font.wrap(t, r.W - 24, { font: 'tiny' })) { E.font.text(g, w, 12, y, '#f0ecdc', { font: 'tiny', outline: false }); y += 9; } }
      E.font.text(g, 'PAGE ' + (this.page + 1) + ' OF ' + ABOUT_PAGES.length + '   ' + FF.prompt('cancel', 'BACK'), r.W / 2, r.H - 14, '#8a90a8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* ---- DEV MODE: the live sliders for the balance, with a reset to the defaults; back returns to the match ---- */
const DEV_ROWS = [
  ['runSpeed', 'Run speed', 60, 140, 2], ['turboSpeed', 'Turbo speed', 90, 170, 2], ['turboDrain', 'Turbo drain per second', 0, 80, 2],
  ['cpuSpeed', 'CPU speed', 50, 120, 2], ['tackleChance', 'Tackle chance', 0, 1, .05], ['breakTackle', 'Turbo breaks a tackle by', 0, 1, .05],
  ['bigHit', 'Big hit chance on a tackle', 0, 1, .05], ['fumbleChance', 'Fumble chance on a hit', 0, 1, .02], ['intercept', 'Interception chance', 0, 1, .05],
  ['catchCovered', 'Catch chance, covered', 0, 1, .05], ['hotTime', 'Blazing seconds', 2, 30, 1], ['quarterSecs', 'Quarter length (seconds)', 30, 300, 15],
  ['difficulty', 'CPU difficulty', .5, 1.6, .05], ['slowMo', 'Game speed', .25, 1.5, .25],
  ['infiniteTurbo', 'Infinite turbo (cheat)', 'bool'], ['showNames', 'Name tags', 'bool'], ['lightsOut', 'LIGHTS OUT in the second quarter', 'bool'], ['lab', 'PLAY LAB: 160 measured plays', 'action']
];
scenes.dev = {
  pausable: false,
  enter(data) { this.back = (data && data.back) || 'title'; this.i = 0; },
  update(dt) {
    const I = game.input, n = DEV_ROWS.length + 2;
    if (I.pressed('down')) this.i = (this.i + 1) % n;
    if (I.pressed('up')) this.i = (this.i + n - 1) % n;
    const row = DEV_ROWS[this.i];
    if (row && row[2] === 'action') { if (I.pressed('confirm')) return game.go('lab', { back: this.back }, { fade: 0 }); }
    else if (row) {
      const [k, , lo, hi, step] = row;
      if (row[2] === 'bool') { if (I.pressed('confirm') || I.pressed('left') || I.pressed('right')) FF.tune[k] = !FF.tune[k]; }
      else {
        if (I.pressed('right') || I.repeat && I.repeat('right', .4, .08)) FF.tune[k] = Math.min(hi, +(FF.tune[k] + step).toFixed(3));
        if (I.pressed('left') || I.repeat && I.repeat('left', .4, .08)) FF.tune[k] = Math.max(lo, +(FF.tune[k] - step).toFixed(3));
      }
      if (k === 'slowMo') game.timeScale = FF.tune.slowMo;
    } else if (this.i === DEV_ROWS.length && I.pressed('confirm')) { FF.resetTune(); game.timeScale = 1; A.sfx('select'); }
    else if (this.i === DEV_ROWS.length + 1 && I.pressed('confirm')) return game.go(this.back, { resume: true }, { fade: 0 });
    if (I.pressed('cancel')) return game.go(this.back, { resume: true }, { fade: 0 });
  },
  draw(r) {
    r.sky(['#0a0c18', '#141a30', '#1e2a40']);
    r.overlay(g => {
      E.font.title(g, 'DEV MODE', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#ffe08a', '#ffb347'], depth: 2 });
      const top = 36, step = Math.max(9, Math.min(12, (r.H - 60) / (DEV_ROWS.length + 2)));
      DEV_ROWS.forEach((row, i) => {
        const y = top + i * step, sel = i === this.i, [k, label] = row, v = FF.tune[k];
        const val = row[2] === 'bool' ? (v ? 'ON' : 'OFF') : (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v));
        E.font.text(g, (sel ? '> ' : '  ') + label, r.W / 2 - 130, y, sel ? '#ffe7a8' : '#c8d0e8', { font: 'tiny', outline: false });
        E.font.text(g, val, r.W / 2 + 130, y, sel ? '#ffe7a8' : '#f0ecdc', { font: 'tiny', outline: false, align: 'right' });
      });
      const y2 = top + DEV_ROWS.length * step + 4;
      E.font.text(g, (this.i === DEV_ROWS.length ? '> ' : '  ') + 'RESET TO DEFAULTS', r.W / 2 - 130, y2, this.i === DEV_ROWS.length ? '#ffe7a8' : '#c8d0e8', { font: 'tiny', outline: false });
      E.font.text(g, (this.i === DEV_ROWS.length + 1 ? '> ' : '  ') + 'BACK TO THE MATCH', r.W / 2 - 130, y2 + step, this.i === DEV_ROWS.length + 1 ? '#ffe7a8' : '#c8d0e8', { font: 'tiny', outline: false });
      E.font.text(g, FF.prompt('confirm', 'CHANGE') + '   ' + FF.label('cancel') + ' BACK', r.W / 2, r.H - 14, '#8a90a8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
/* ---- CUTSCENES: the owner and the captain, in a talk with their portraits, the babble voices; then the next scene ---- */
const portraits = {
  OWNER: new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, hat: { style: 'band', color: '#8a2a3a' }, outfit: 'coat', colors: { cloth: '#3a2a22', coat: '#4a3428', hair: '#c8c8c8', skin: '#c89070', trim: '#f0c040' } }),
  CAPTAIN: new E.Humanoid({ size: 1.3, weapon: null, hat: 'cap', hair: 'spiky', colors: { cloth: '#8a2a3a', pants: '#f0e2b8', hair: '#3a2418', skin: '#a87050', trim: '#f0c040' } })
};
scenes.cutscene = {
  pausable: false,
  enter(d) {
    this.lines = (d && d.lines) || [['OWNER', 'Hello.']]; this.next = (d && d.next) || { scene: 'title' }; this.i = 0;
    this.talk = new E.Dialog(game, { place: 'bottom', border: '#e8c070', voice: FF.babble, speed: 40 });
    A.music(FF.titleSong);
    this.speak();
  },
  speak() {
    if (this.i >= this.lines.length) return game.go(this.next.scene, this.next.data, { fade: 0 });
    const [who, text] = this.lines[this.i++];
    this.talk.say(text, { name: who, portrait: portraits[who] || portraits.OWNER, portraitSize: 56, modal: true, onDone: () => this.speak() });
  },
  update(dt) { this.talk.update(dt); },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => E.font.text(g, FF.prompt('confirm', 'NEXT'), r.W / 2, r.H - 14, '#8a90a8', { align: 'center', font: 'tiny', outline: false }));
    this.talk.draw(r);
  }
};

/* ---- THE HIGHLIGHT REEL: the match's last replays, one after another, each with its name ---- */
scenes.reel = {
  enter() { S.extras.reel.i = 0; S.extras.reel.on = false; S.extras.reelNext(); FF.buildFor(S.cfg.chapter); },
  update(dt) {
    radio(dt); const X = S.extras;
    if (X.replay) { X.replayStep(dt); V.focus(); return; }
    if (!X.reelNext() && game.input.anyPressed()) game.go('results', null, { fade: 0 });
  },
  draw(r) { V.frame(r); r.overlay(g => { const X = S.extras; if (X.replay || X.reel.on) E.font.title(g, 'HIGHLIGHT: ' + X.label, r.W / 2, r.H * .1, { align: 'center', scale: 1, colors: ['#ffffff', '#ffe08a'], depth: 1 }); else E.font.text(g, FF.prompt('confirm', 'BACK TO THE RESULTS'), r.W / 2, r.H - 14, '#c8d0e8', { align: 'center', font: 'tiny', outline: '#000' }); }); }
};

/* ---- PRACTICE DRILLS: three drills, three reps each; the menu gives each one's words ---- */
scenes.drills = {
  enter() { this.menu = new E.Menu(game, D.DRILLS.map(d => d.name).concat(['BACK']), { y: 96, x: 'center', onPick: i => i < D.DRILLS.length ? game.go('play', { mode: 'drill', drill: D.DRILLS[i].key }, { fade: 0 }) : game.go('title', null, { fade: 0 }) }); },
  update(dt) { radio(dt); this.menu.update(dt); if (game.input.pressed('cancel')) game.go('title'); },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'PRACTICE DRILLS', r.W / 2, 22, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 });
      const d = D.DRILLS[this.menu.i];
      if (d) E.font.text(g, d.desc, r.W / 2, r.H - 40, '#f0ecdc', { align: 'center', outline: false, wrap: r.W - 40 });
      E.font.text(g, 'THREE REPS EACH. ' + FF.prompt('confirm', 'START'), r.W / 2, r.H - 16, '#8a90a8', { align: 'center', font: 'tiny', outline: false });
    });
    this.menu.draw(r);
  }
};

/* ---- PLAY LAB: CPU against CPU, every card in turn, the plays measured. A table when it is done ---- */
scenes.lab = {
  enter() { this.n = 160; this.done = false; S.extras.labStart(this.n); },
  update(dt) {
    radio(dt);
    if (!this.done) this.done = S.extras.labStep(700);
    else if (game.input.anyPressed()) game.go('title', null, { fade: 0 });
  },
  draw(r) {
    r.sky(['#0a0c18', '#141a30', '#1e2a40']);
    const L = S.extras.lab, rows = L ? L.rows : {};
    r.overlay(g => {
      E.font.title(g, 'PLAY LAB', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#ffe08a', '#ffb347'], depth: 2 });
      E.font.text(g, this.done ? 'MEASURED ' + (L ? L.n : 0) + ' PLAYS' : 'MEASURING ' + (L ? L.n : 0) + ' OF ' + this.n + '...', r.W / 2, 36, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
      E.font.text(g, 'CALL          PLAYS   AVG YDS   TD   PICK', 18, 54, '#ffe7a8', { font: 'tiny', outline: false });
      let y = 66;
      for (const k of Object.keys(rows)) { const w = rows[k], avg = w.plays ? (w.yards / w.plays).toFixed(1) : '0.0'; E.font.text(g, (D.PLAYS[k].name + '              ').slice(0, 14) + String(w.plays).padStart(5) + String(avg).padStart(9) + String(w.td).padStart(5) + String(w.to).padStart(5), 18, y, '#f0ecdc', { font: 'tiny', outline: false }); y += 12; }
      if (this.done) E.font.text(g, FF.label('confirm') + ' TO THE TITLE', r.W / 2, r.H - 14, '#8a90a8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
})();
