// THE SCENES: the title (with the attract mode after ten seconds, and the touch-only screen), the menu, the exhibition
// setup, the Mega Cup (its hub and the story beats), the match (with the dev panel and the penalty choice), the results
// and the About & Credits pages. The engine's pause menu, settings and controls come with the game.

// the input's idle check: any key, pad button, click or stick movement counts as activity
const activity = I => I.anyPressed() || Math.hypot(...I.move()) > .3 || (I.pointer && I.pointer() && I.pointer().moved);
function touchOnlyNow() {
  const coarse = typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches;
  const fine = typeof matchMedia === 'function' && matchMedia('(any-pointer: fine)').matches;
  return coarse && !fine && game.input.padIndex == null;
}

// the commentators' portraits: Barry, Ros and the referee's whistle. They are close-ups in the dialog box.
const BARRY = new E.Humanoid({ build: 'heroic', size: 1.1, hair: 'short', weapon: null, outfit: 'coat', colors: { cloth: '#7a1a2a', skin: '#f0d0b8', hair: '#c8c0b0' } });
const ROS = new E.Humanoid({ build: 'heroic', size: 1.1, hair: 'short', weapon: null, outfit: 'coat', colors: { cloth: '#1a2a52', skin: '#e8c0a0', hair: '#8a8a90' } });
const TALK = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#e8c070', voice: null });
const talkBabble = { last: 0, base: 330 };
// each commentator's voice: the babble's base pitch
const SPEAKER_BASE = { 'BARRY BELLOWS': 330, 'ROS RUCKER': 220, 'GRISTLE': 140 };
function say(text, opts) {
  if (SM.commentary === 'off') return;
  const name = (opts && opts.name) || 'BARRY BELLOWS';
  talkBabble.base = SPEAKER_BASE[name] || 260;
  TALK.say(text, Object.assign({ name, auto: 2.4, modal: false, alpha: .85, portrait: BARRY, portraitOpts: { zoom: 3, turn: .4 } }, opts || {}));
}
// the babble on each letter the commentary types (the speakers' voices, in code)
function babbleStep() {
  const shown = Math.floor(TALK.shown || 0);
  if (shown > talkBabble.last && SM.commentary === 'on' && TALK.open) {
    const page = TALK.pages && TALK.pages[TALK.i], txt = typeof page === 'string' ? page : (page && page.text) || '';
    const ch = txt[shown - 1];
    if (ch && ch !== ' ') SM.babble(ch, talkBabble.base);
  }
  talkBabble.last = shown;
}

// the seats of the local players: the keyboard's and the pads' (the engine's game.players)
const menu = new E.Menu(game, ['EXHIBITION', 'MEGA CUP', 'RECORDS', 'ABOUT & CREDITS', 'SETTINGS'], {
  x: 'center', y: 88, title: null,
  onPick: i => { if (i === 0) game.go('setup'); else if (i === 1) game.go('cup'); else if (i === 2) game.go('records'); else if (i === 3) game.go('about'); else game.menu('settings'); }
});
const recordsScene = {
  enter() { game.audio.music(SM.songs.title); },
  update() { const I = game.input; if (I.pressed('cancel') || I.pressed('confirm')) game.go('menu'); },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    const t = recordsTables();
    r.overlay(g => {
      E.font.title(g, 'RECORDS', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
      [['BIGGEST WINS', 'margin', 'pts'], ['MOST TRIES', 'tries', 'tries'], ['BIGGEST HIT', 'hit', 'm']].forEach(([title, key, unit], c) => {
        const x = 18 + c * 102;
        E.ui.box(g, x, 46, 96, 150, { bg: '#141a2c', border: '#3a4460', alpha: .9 });
        E.font.text(g, title, x + 48, 52, '#ffe08a', { align: 'center', font: 'tiny', outline: false });
        (t[key] || []).slice(0, 5).forEach(([name, v], i) => E.font.text(g, (i + 1) + '. ' + name + ' ' + v + unit, x + 6, 70 + i * 22, '#f0ecdc', { font: 'tiny', outline: false }));
      });
    });
    r.text('CONFIRM OR CANCEL: BACK', r.W / 2, r.H - 14, '#8a92aa', { align: 'center' });
  }
};
const touchMenu = new E.Menu(game, ['SETTINGS'], { x: 'center', y: 150, onPick: () => game.menu('settings') });
// RECORDS: three tables kept in E.store (the best margin, the most tries in a match, the biggest hit)
const RECORDS_SEED = { margin: [['NAN', 34], ['BIG', 12]], tries: [['TIN', 5], ['FRI', 3]], hit: [['DAV', 40], ['UNI', 22]] };
function recordsTables() { return E.store.get('smashby:records', RECORDS_SEED); }
function addRecord(table, name, value) {
  const t = recordsTables(); t[table] = (t[table] || []).concat([[name, value]]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  E.store.set('smashby:records', t);
}
SM.addRecord = addRecord;

// THE TITLE
const title = {
  enter() { SM.idle = 0; SM.touchOnly = touchOnlyNow(); game.audio.music(SM.songs.title); game.lights.enabled = false; game.weather = null; },
  update(dt) {
    const I = game.input;
    if (SM.touchOnly && (I.anyPressed() && I.lastDevice !== 'touch')) SM.touchOnly = false;
    if (activity(I)) SM.idle = 0;
    if (SM.touchOnly) { touchMenu.update(dt); return; }
    if (I.pressed('start') || I.pressed('confirm')) return game.go('menu');
    SM.idle += dt;
    if (SM.idle > 10) game.go('match', SM.attractData());
  },
  draw(r) {
    r.sky(['#1a1038', '#3a2a60', '#2a4a3a']);
    const m = Math.round(r.H / 2);
    r.overlay(g => {
      E.font.title(g, 'SMASHBY', r.W / 2, m - 66, { scale: 4, align: 'center', colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      E.font.text(g, 'BIG HITS, BIGGER HAIR, SEVEN A SIDE', r.W / 2, m - 14, '#c8d0e8', { align: 'center', outline: false });
    });
    if (SM.touchOnly) {
      r.text('CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, m + 2, '#ffe7a8', { align: 'center', scale: 2 });
      r.text('Connect a controller or a keyboard to play.', r.W / 2, m + 24, '#c8d0e8', { align: 'center' });
      touchMenu.draw(r);
    } else {
      r.text(('PRESS ' + game.input.label('start')).toUpperCase(), r.W / 2, m + 30, '#ffffff', { align: 'center', shadow: '#000' });
    }
  }
};

// THE MENU
const menuScene = {
  enter() { game.audio.music(SM.songs.title); SM.idle = 0; },
  update(dt) {
    const I = game.input;
    if (activity(I)) SM.idle = 0;
    if (!menu.update(dt)) { if (I.pressed('cancel')) game.go('title'); }
    SM.idle += dt; if (SM.idle > 10) game.go('match', SM.attractData());
  },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'SMASHBY', r.W / 2, 22, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 });
    });
    menu.draw(r);
    const desc = ['Pick the away side and the venue, and play one match', 'Four matches, the Muddy Duck to the Megadome', 'The people behind the pub team', 'Sound, controls and difficulty'][menu.i || 0];
    r.text(desc, r.W / 2, r.H - 20, '#c8d0e8', { align: 'center', scale: 1 });
  }
};

// EXHIBITION: the away side, the venue and the half length; PLAY
const SETUP = { i: 0, away: 1, venue: 0, halves: 120 };
const setupScene = {
  enter() { SETUP.i = 0; game.audio.music(SM.songs.title); },
  update(dt) {
    const I = game.input, rows = 4;
    if (I.pressed('up')) SETUP.i = (SETUP.i + rows - 1) % rows;
    if (I.pressed('down')) SETUP.i = (SETUP.i + 1) % rows;
    const dir = I.pressed('right') ? 1 : I.pressed('left') ? -1 : 0;
    if (dir && SETUP.i === 0) SETUP.away = ((SETUP.away - 1 + dir + 4) % 4) + 1;
    if (dir && SETUP.i === 1) SETUP.venue = (SETUP.venue + dir + 4) % 4;
    if (dir && SETUP.i === 2) { const hs = [120, 180, 240, 300]; SETUP.halves = hs[(hs.indexOf(SETUP.halves) + dir + 4) % 4]; }
    if (I.pressed('confirm') && SETUP.i === 3) game.go('match', { home: 0, away: SETUP.away, venue: SETUP.venue, halves: SETUP.halves });
    if (I.pressed('confirm') && SETUP.i < 3) { SETUP.i = Math.min(3, SETUP.i + 1); }
    if (I.pressed('cancel')) game.go('menu');
  },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'EXHIBITION', r.W / 2, 22, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
      const t = SM.TEAMS[SETUP.away], v = SM.VENUES[SETUP.venue];
      const rows = [['AWAY SIDE', t.name], ['VENUE', v.name], ['HALF LENGTH', ['2 minutes', '3 minutes', '4 minutes', '5 minutes'][[120, 180, 240, 300].indexOf(SETUP.halves)]], ['PLAY', 'MUDDINGTON MUDLARKS V ' + t.short]];
      rows.forEach(([k, val], i) => {
        const y = 74 + i * 34, on = SETUP.i === i;
        E.ui.box(g, r.W / 2 - 170, y - 6, 340, 26, { bg: on ? '#2a3a60' : '#141a2c', border: on ? '#ffe08a' : '#3a4460', alpha: .85 });
        E.font.text(g, (on ? '> ' : '  ') + k, r.W / 2 - 160, y + 2, on ? '#ffe08a' : '#c8d0e8', { outline: false, scale: 1 });
        E.font.text(g, val, r.W / 2 + 160, y + 2, '#f0ecdc', { outline: false, align: 'right' });
      });
    });
    r.text('UP DOWN CHOOSE   LEFT RIGHT CHANGE   CONFIRM PLAY   CANCEL BACK', r.W / 2, r.H - 16, '#8a92aa', { align: 'center' });
  }
};

// THE MEGA CUP: four matches, the story beats before each, the cup kept in E.store
const CUP_ROUNDS = [
  { opp: 1, venue: 0, title: 'ROUND ONE', story: [
    ['BARRY', 'Welcome to a damp Muddington Park, where the Mudlarks open their Mega Cup against the Bramblewick Badgers!'],
    ['ROS', 'Damp is generous, Barry. I\'ve seen drier rivers.'],
    ['NAN PEMBERTON', 'I\'ve propped since before your dad had teeth, sonny.']] },
  { opp: 2, venue: 1, title: 'QUARTER-FINAL', story: [
    ['JONTY SWIFT', 'Gorgeous evening. Gorgeous ground. Gorgeous me. Do try to keep up, darlings.'],
    ['GRISTLE', 'Watch the wind. Watch the chicken. Don\'t ask about the chicken.']] },
  { opp: 3, venue: 2, title: 'SEMI-FINAL', story: [
    ['ANVIL OKAFOR', 'We forge champions here. Everyone else, we melt down for scrap.'],
    ['GRISTLE', 'Don\'t stand on the glowing bits. Wheels. Wheels, look at me. The GLOWING bits.']] },
  { opp: 4, venue: 3, title: 'GRAND FINAL', story: [
    ['SIR RUPERT GOLDBRICK', 'Charming little pub team. I\'ll buy the lot of you. The pub, the pies, the muddy bird. Name your price.'],
    ['THE FRIDGE', 'Not for sale.'],
    ['GRISTLE', 'The pies are for sale. Two-fifty. WE\'RE not.'],
    ['BARRY', 'BIG UNIT BRANNIGAN! Two metres of pure invoice!'],
    ['ROS', 'You\'ll need two men to bring him down, minimum. Bring a ladder.']] }
];
const cupSave = () => E.store.get('smashby:cup', { round: 0, won: 0 });
const cupMenu = new E.Menu(game, ['PLAY NEXT MATCH', 'NEW CUP', 'BACK'], { x: 'center', y: 150, onPick: i => {
  if (i === 0) { const c = cupSave(); if (c.round >= 4) return game.go('about'); return game.go('story', { cup: true, round: c.round }); }
  if (i === 1) { E.store.set('smashby:cup', { round: 0, won: 0 }); return game.go('cup'); }
  return game.go('menu');
} });
const cupScene = {
  enter() { game.audio.music(SM.songs.title); },
  update(dt) { cupMenu.update(dt); if (game.input.pressed('cancel')) game.go('menu'); },
  draw(r) {
    r.sky(['#101a30', '#2a3a50', '#3a5a40']);
    const c = cupSave();
    r.overlay(g => {
      E.font.title(g, 'MEGA CUP', r.W / 2, 16, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 });
      CUP_ROUNDS.forEach((rd, i) => {
        const x = 20 + i * 92, won = i < c.round, next = i === c.round;
        E.ui.box(g, x, 58, 84, 74, { bg: next ? '#2a3a60' : '#141a2c', border: next ? '#ffe08a' : won ? '#8aff9a' : '#3a4460', alpha: .9 });
        E.font.text(g, rd.title, x + 42, 64, '#f0ecdc', { align: 'center', font: 'tiny', outline: false });
        E.font.text(g, SM.TEAMS[rd.opp].short, x + 42, 84, '#ffe7a8', { align: 'center', outline: false });
        E.font.text(g, SM.VENUES[rd.venue].label, x + 42, 98, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
        E.font.text(g, won ? 'WON' : next ? 'NEXT' : 'LOCKED', x + 42, 116, won ? '#8aff9a' : next ? '#ffe08a' : '#6a7090', { align: 'center', font: 'tiny', outline: false });
      });
    });
    cupMenu.draw(r);
    if (c.round >= 4) r.text('THE MEGA CUP IS YOURS', r.W / 2, r.H - 20, '#ffe08a', { align: 'center', scale: 2 });
  }
};

// THE STORY: a few lines in the commentators' and the squad's voices, before a match (skippable with cancel)
const storyScene = {
  enter(data) {
    SM.story = { data, lines: CUP_ROUNDS[data.round].story };
    SM.storyLines = SM.story.lines.slice();
    SM.storyT = 0;
    game.audio.music(SM.songs.match);
  },
  update(dt) {
    const I = game.input;
    SM.storyT += dt;
    if (SM.storyT > 2.6 * SM.storyLines.length + 1 || I.pressed('cancel') || I.pressed('confirm') || I.pressed('start')) {
      const d = SM.story.data, rd = CUP_ROUNDS[d.round];
      game.go('match', { home: 0, away: rd.opp, venue: rd.venue, halves: TUNE_HALF(), cup: true, round: d.round });
    }
  },
  draw(r) {
    r.sky(['#1a1030', '#3a2050', '#402a30']);
    r.overlay(g => {
      E.font.title(g, CUP_ROUNDS[SM.story.data.round].title, r.W / 2, 26, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
      const idx = Math.min(SM.storyLines.length - 1, Math.floor(SM.storyT / 2.6));
      const [who, text] = SM.storyLines[idx];
      E.ui.box(g, 16, r.H - 92, r.W - 32, 72, { bg: '#141a3a', border: '#e8c070', alpha: .92 });
      E.font.text(g, who, 26, r.H - 84, '#ffd36a', { outline: false });
      E.font.text(g, text, 26, r.H - 68, '#f0ecdc', { outline: false, wrap: r.W - 56 });
    });
    r.text('CONFIRM TO SKIP', r.W / 2, r.H - 14, '#8a92aa', { align: 'center' });
  }
};
const TUNE_HALF = () => SM.TUNE.v.halfLength;

// THE MATCH: the sim, the seats, the camera, the events read as banners, commentary and sounds, the dev panel
SM.dev = { open: false, tab: 0, focus: 0, live: false };
const DEV_TABS = ['TUNING', 'CHEATS', 'EVENTS'];
const DEV_CHEATS = ['godMode', 'infiniteTurbo', 'alwaysHype', 'alwaysOnFire', 'refBlind', 'refStrict', 'noClock', 'bigHeads'];
const DEV_EVENTS = [
  ['Score a try (MUD)', () => SM.devTry(0)], ['Score a try (away)', () => SM.devTry(1)],
  ['Give P1 the ball', () => SM.devGive()], ['Knock-on: scrum', () => SM.devScrum()], ['Touch: lineout', () => SM.devLineout()],
  ['Foul: penalty', () => SM.devFoul()], ['Yellow card on a mate', () => SM.devCard()], ['Kick-off now', () => SM.kickoff(0)],
  ['22 drop-out now', () => SM.dropOut(1)], ['A ruck now', () => SM.devRuck()], ['Monster hit on carrier', () => SM.devMonster()],
  ['Power-up thrown on', () => SM.devPowerup()], ['Set score +5 (MUD)', () => { SM.M.score[0] += 5; }], ['Set score -5 (MUD)', () => { SM.M.score[0] = Math.max(0, SM.M.score[0] - 5); }],
  ['Clock minus 30 s', () => { SM.M.run = Math.max(0, SM.M.run - 30); }], ['Hooter now', () => { SM.M.hooter = true; }],
  ['Half time now', () => { SM.M.run = SM.M.halfLen; SM.M.hooter = true; SM.resumePlay(); }], ['Sudden death now', () => { SM.M.golden = true; }]
];
SM.devFromPause = () => { SM.devRequest = true; if (game.resume) game.resume(); };

const matchScene = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown'], camera: { zoom: [.7, 1.5], start: .95 },
  enter(data) {
    data = data || {};
    SM.matchData = data;
    SM.banners.length = 0; TALK.close && TALK.close();
    const venue = SM.VENUES[data.venue == null ? 0 : data.venue];
    SM.map = SM.buildMap(venue);
    SM.venue = venue;
    SM.CROWD = SM.CROWD || SM.crowd();
    const humans = data.attract ? [] : [{ input: game.input, side: 0, pos: 4, name: 'P1', color: E.PLAYER_COLORS[0] }];
    SM.newMatch({ home: data.home == null ? 0 : data.home, away: data.away == null ? 1 : data.away, venue: data.venue == null ? 0 : data.venue,
      halves: data.halves || TUNE_HALF(), humans, attract: !!data.attract, cup: !!data.cup, seed: data.seed || (1 + ((Date.now() / 1000) | 0) % 9000) });
    SM.M.attractOn = !!data.attract;
    const lit = venue.time !== 'day';
    game.lights.enabled = lit; game.lights.ambient = venue.time === 'night' ? .45 : .65;
    game.cam.smooth = .18; game.cam.bounds = v => SM.map.bounds(v);
    game.weather = venue.weather === 'rain' ? { kind: 'rain', amount: .7 } : venue.weather === 'storm' ? { kind: 'rain', amount: .9, lightning: .2 } : venue.weather === 'wind' ? { kind: 'leaves', amount: .35, wind: .6 } : null;
    game.audio.music(SM.songs.match);
    SM.devRequest = false; SM.dev.open = false; SM.frozen = false;
    SM.resultsGo = false;   // (a new match opens its own results when it ends)
    SM.kickoffSaid = false;
    babbleReset();
    say('AND WE\'RE UNDERWAY AT ' + venue.name.toUpperCase() + '!');
  },
  exit() { game.lights.enabled = false; game.weather = null; game.audio.music(null); TALK.close && TALK.close(); },
  update(dt) {
    const I = game.input, M = SM.M;
    if (!M) return;
    if (M.attractOn && activity(I) && (I.anyPressed() || Math.hypot(...I.move()) > .5)) return game.go('title');
    if (SM.devRequest) { SM.devRequest = false; SM.dev.open = true; SM.dev.tab = 0; SM.dev.focus = 0; }
    if (I.pressed('dev') && !M.attractOn) SM.dev.open = !SM.dev.open;
    if (SM.dev.open) { devUpdate(I); }
    else if (!M.over) {
      const pen = M.phase === 'penalty' && M.pen && M.seats.some(s => s.p && s.p.side === M.pen.side);
      if (pen && M.pen.choice === null && M.pen !== SM.penShown) { SM.penShown = M.pen; SM.penMenu.i = 0; }
      if (pen && M.pen.choice === null) { SM.penMenu.update(dt); }
      else if (M.phase !== 'penalty' || !M.pen || M.pen.choice) SM.penMenu.i = 0;
      const frozen = !!SM.frozen;
      if (!(pen && M.pen.choice === null) && !frozen) {
        SM.step(dt * SM.TUNE.v.gameSpeed);
        for (const e of M.events.splice(0)) handleEvent(e);
      } else M.events.length = 0;
    }
    if (!SM.dev.open) for (const p of M.players) p.rig.update(dt, SM.rigState(p));
    babbleStep();
    TALK.update(dt);
    if (SM.cluckyBlob) SM.cluckyBlob.update(dt, { walk: 1 });
    if (M.over && !SM.resultsGo) {
      SM.resultsGo = true;
      const md = SM.matchData || {};
      return game.go('results', { home: M.teams[0].name, away: M.teams[1].name, score: M.score.slice(), stats: M.stats, round: md.round, cupMatch: !!md.cup, attract: M.attractOn,
        players: M.players.map(p => ({ nick: p.nick, side: p.side, tries: p.tries || 0, tackles: p.tacklesMade || 0, bigHits: p.bigHits || 0, metres: p.metres || 0, hitM: p.hitM || 0 })) });
    }
    // the camera: on the ball, a little ahead of it in the attack
    // (the focus leans from the ball toward the middle of the pitch, and a ball out in the in-goal does not pull it off the field)
    const b = M.ball, d = SM.DIRS(b.lastTouch || 0);
    const fx = SM.clamp(SM.lerp(b.x + d * 24, SM.CX, .3), SM.X0 - 40, SM.X1 + 40), fy = SM.clamp(SM.lerp(b.y, SM.CY, .3), SM.Y0 + 40, SM.Y1 - 40);
    game.focus(fx, fy, 14);
  },
  draw(r) {
    const M = SM.M;
    if (!M) return;
    const venue = SM.venue;
    SM.drawVenue(r, venue);
    SM.drawWorld(r, SM.map, venue);
    r.overlay(g => {
      SM.drawBug(g, r);
      SM.drawRadar(g, r);
      SM.drawBanners(g, r, 1 / 60);
      SM.drawSetPieces(g, r);
      SM.drawPrompts(g, r, game.input, M.seats[0]);
      if (M.phase === 'penalty' && M.pen && M.pen.choice === null && M.seats.some(s => s.p && s.p.side === M.pen.side)) SM.penMenu.draw(r);
    });
    TALK.draw(r);
    if (SM.dev.open) SM.drawDevPanel(r);
    if (M.attractOn) r.text('DEMO - PRESS ANY BUTTON', r.W / 2, 60, '#ffe08a', { align: 'center', font: 'tiny' });
  }
};
function babbleReset() { talkBabble.last = 0; }

// the penalty's menu for the human side: TAP & GO, KICK AT GOAL (if in range), KICK FOR TOUCH
SM.penMenu = new E.Menu(game, ['TAP & GO', 'KICK AT GOAL', 'KICK FOR TOUCH'], { x: 'center', y: 96, title: 'PENALTY', onPick: i => { const M = SM.M; if (M && M.pen) M.pen.choice = ['tap', 'kick', 'touch'][i]; } });

// the events of the simulation, as the match shows them: banners, the commentary, the sounds, the crowd
function handleEvent(e) {
  const A2 = game.audio, M = SM.M;
  const pick = list => list[Math.floor(SM.fx() * list.length) % list.length];
  const line = (cat, vars) => { const l = SM.LINES[cat]; if (l && l.length) say(SM.REPLACE(pick(l), Object.assign({ venue: SM.venue.name, score: M.score.join(' - '), team: M.teams[0].name, player: '' }, vars || {}))); };
  switch (e.t) {
    case 'kickoff': if (!SM.kickoffSaid) { SM.kickoffSaid = true; } break;
    case 'kickoffKick': A2.sfx('kick'); break;
    case 'try': A2.sfx('tryTune'); A2.sfx('crowd'); SM.banner('TRY!', '#ffe08a', 2); game.shake && game.shake(3); line('try', { player: e.name }); break;
    case 'bigHit': A2.sfx('crunch'); SM.banner('BIG HIT!', '#ffb347', 1.1); line('bigHit'); game.shake && game.shake(2); break;
    case 'monsterHit': A2.sfx('boom'); SM.banner('MONSTER HIT!', '#ff6a4a', 1.6); line('monsterHit'); game.shake && game.shake(5); break;
    case 'tackle': A2.sfx('thud'); break;
    case 'brokenTackle': A2.sfx('thud'); break;
    case 'sidestep': SM.banner('SIDESTEP!', '#8aff9a', .9); line('sidestep'); break;
    case 'spin': SM.banner('SPIN!', '#8aff9a', .8); break;
    case 'fend': SM.banner('FEND!', '#8aff9a', .8); line('fend'); break;
    case 'fended': SM.banner('HAND-OFF!', '#8aff9a', .9); break;
    case 'beaten': SM.banner('BEATEN!', '#8aff9a', .9); break;
    case 'pass': A2.sfx('kick'); break;
    case 'dummy': if (e.n) { SM.banner('DUMMY!', '#c8d0e8', .9); line('dummy'); } break;
    case 'kick': A2.sfx('kick'); break;
    case 'bounce': A2.sfx('bounce'); break;
    case 'intercept': SM.banner('INTERCEPT!', '#ff8a6a', 1.2); A2.sfx('crunch'); break;
    case 'kickCaught': break;
    case 'knockOn': SM.banner('KNOCK-ON', '#ff8a6a', 1.2); line('knockOn'); break;
    case 'foul': SM.banner(e.kind === 'cheap' ? 'CHEAP SHOT!' : e.kind === 'high' ? 'HIGH SHOT!' : 'PENALTY!', '#ff8a6a', 1.6); line('penalty'); A2.sfx('whistle'); break;
    case 'unseen': SM.banner('UNSEEN!', '#c8d0e8', 1.2); line('penalty'); break;
    case 'unseenCheap': SM.banner('UNSEEN!', '#c8d0e8', 1.4); say('Ooh... the ref\'s missed that one completely.'); A2.sfx('crowd'); break;
    case 'yellow': SM.banner('YELLOW CARD!', '#ffe08a', 2); A2.sfx('yellow'); line('yellow'); break;
    case 'red': SM.banner('RED CARD!', '#ff6a4a', 2.4); A2.sfx('yellow'); say('RED CARD! Early bath!'); break;
    case 'clucky': SM.banner('CAPTAIN CLUCKY!', '#fffbe8', 1.8); A2.sfx('crowd'); say('It\'s CAPTAIN CLUCKY! The mascot\'s on the pitch again!'); break;
    case 'binOut': SM.banner('BACK ON!', '#8aff9a', 1); break;
    case 'ruck': A2.sfx('crunch'); break;
    case 'ruckWon': break;
    case 'turnover': SM.banner('TURNOVER!', '#ff8a6a', 1.3); line('jackal'); break;
    case 'jackal': SM.banner('JACKAL!', '#ff8a6a', 1.3); line('jackal'); break;
    case 'scrum': SM.banner('SCRUM', '#ffe7a8', 1.2); line('scrum'); A2.sfx('whistle'); break;
    case 'scrumWon': break;
    case 'pushoverTry': SM.banner('PUSHOVER TRY!', '#ffe08a', 2); break;
    case 'earlyEngagement': SM.banner('EARLY ENGAGEMENT', '#ff8a6a', 1.4); A2.sfx('whistle'); break;
    case 'lineout': SM.banner('LINEOUT', '#ffe7a8', 1.2); line('lineout'); break;
    case 'lineoutSteal': SM.banner('STOLEN!', '#ff8a6a', 1.4); break;
    case 'lineoutWon': break;
    case 'touch': SM.banner('TOUCH!', '#c8d0e8', 1.1); break;
    case 'deadBall': SM.banner('DEAD BALL', '#c8d0e8', 1.1); break;
    case 'dropOut': SM.banner('22 DROP-OUT', '#c8d0e8', 1.1); break;
    case 'goal': if (e.kind === 'drop') { SM.banner('DROP GOAL!', '#ffe08a', 1.8); line('dropGoal'); } else { SM.banner('CONVERTED!', '#ffe08a', 1.6); line('conversionGood'); } A2.sfx('tryTune'); break;
    case 'miss': SM.banner(e.kind === 'drop' ? 'NO GOAL' : 'WIDE!', '#c8d0e8', 1.4); line('conversionMiss'); A2.sfx('doink'); break;
    case 'powerupThrown': SM.banner('POWER-UP!', '#8aff9a', 1.2); line('powerup'); break;
    case 'powerupTaken': if (e.type === 'pie') { SM.banner('MEAT PIE!', '#ffb347', 1.4); A2.sfx('pie'); } else { SM.banner('AIR HORN!', '#ffe08a', 1.8); A2.sfx('horn'); } break;
    case 'super': SM.banner(e.kind === 'thunder' ? 'THUNDER RUN!' : 'HURRICANE HIT!', '#ff8a6a', 2); A2.sfx('super'); line('superRun'); break;
    case 'onFire': SM.banner('HE\'S ON FIRE!', '#ff8a6a', 2); line('onFire'); break;
    case 'wind': SM.banner('GUST!', '#c8d0e8', 1); break;
    case 'grateWarn': A2.sfx('flame'); SM.banner('FLAME JETS!', '#ff8a6a', 1.2); break;
    case 'grateBurn': A2.sfx('flame'); break;
    case 'lightning': A2.sfx('zap'); SM.banner('LIGHTNING!', '#fff6c0', 1.4); break;
    case 'hooter': A2.sfx('hooter'); SM.banner('HOOTER!', '#ff6a4a', 2); line('hooter'); break;
    case 'halftime': A2.sfx('whistle'); SM.banner('HALF TIME', '#ffe7a8', 2); line('halftime'); break;
    case 'golden': SM.banner('GOLDEN POINT!', '#ffe08a', 2.4); line('hooter'); break;
    case 'fulltime': A2.sfx('hooter'); SM.banner('FULL TIME', '#ffe08a', 2.4); line('fulltime', { team: M.score[0] > M.score[1] ? M.teams[0].name : M.score[1] > M.score[0] ? M.teams[1].name : 'nobody' }); break;
    case 'lineoutDone': break;
    case 'phase': break;
    case 'penalty': break;
    default: break;
  }
}

// the dev panel's rows: the tuning sliders, the cheats, the events
function devRows() {
  if (SM.dev.tab === 0) return [['RESET ALL TO DEFAULTS', null]].concat(SM.TUNE_DEFS.map(t => [t.label, t]));
  if (SM.dev.tab === 1) return DEV_CHEATS.map(k => [k, k]);
  return DEV_EVENTS.map(([label, fn]) => [label, fn]);
}
function devUpdate(I) {
  const rows = devRows();
  if (I.pressed('dev') || I.pressed('cancel')) { SM.dev.open = false; return; }
  if (I.pressed('down')) SM.dev.focus = (SM.dev.focus + 1) % rows.length;
  if (I.pressed('up')) SM.dev.focus = (SM.dev.focus + rows.length - 1) % rows.length;
  if (I.pressed('r1')) { SM.dev.tab = (SM.dev.tab + 1) % 3; SM.dev.focus = 0; }
  if (I.pressed('l1')) { SM.dev.tab = (SM.dev.tab + 2) % 3; SM.dev.focus = 0; }
  if (I.pressed('tri')) SM.dev.live = !SM.dev.live;
  SM.frozen = !SM.dev.live;
  const [label, spec] = rows[SM.dev.focus] || [];
  if (SM.dev.tab === 0 && spec) {
    const dir = I.repeat('right', .3, .08) ? 1 : I.repeat('left', .3, .08) ? -1 : 0;
    if (dir) SM.TUNE.set(spec.key, SM.TUNE.v[spec.key] + dir * spec.step);
    if (I.pressed('sq')) SM.TUNE.reset(spec.key);
  }
  if (SM.dev.tab === 0 && SM.dev.focus === 0 && I.pressed('confirm')) SM.TUNE.reset();
  if (SM.dev.tab === 1 && spec) { if (I.pressed('confirm') || I.pressed('left') || I.pressed('right')) SM.CHEATS[spec] = !SM.CHEATS[spec]; }
  if (SM.dev.tab === 2 && spec && I.pressed('confirm')) spec();
}
SM.drawDevPanel = function (r) {
  const rows = devRows(), x0 = Math.round(r.W * .55), w = r.W - x0;
  r.overlay(g => {
    E.ui.box(g, x0, 0, w, r.H, { bg: '#0c1020', border: '#e8c070', alpha: .92 });
    E.font.text(g, 'DEV MODE   ' + (SM.dev.live ? 'LIVE' : 'FROZEN'), x0 + 8, 6, '#ffe08a', { outline: false, font: 'tiny' });
    DEV_TABS.forEach((t, i) => E.font.text(g, t, x0 + 8 + i * 48, 16, i === SM.dev.tab ? '#ffe08a' : '#6a7090', { outline: false, font: 'tiny' }));
    const top = Math.max(0, SM.dev.focus - 6);
    for (let i = 0; i < 12 && top + i < rows.length; i++) {
      const [label, spec] = rows[top + i], y = 28 + i * 14, on = top + i === SM.dev.focus;
      if (on) px.rect(g, x0 + 2, y - 2, w - 4, 12, '#2a3a60');
      let val = '';
      if (SM.dev.tab === 0 && spec) val = String(SM.TUNE.v[spec.key]);
      if (SM.dev.tab === 1 && spec) val = SM.CHEATS[spec] ? 'ON' : 'OFF';
      E.font.text(g, label, x0 + 6, y, on ? '#ffe08a' : '#c8d0e8', { outline: false, font: 'tiny' });
      if (val) E.font.text(g, val, x0 + w - 8, y, '#f0ecdc', { outline: false, font: 'tiny', align: 'right' });
    }
    E.font.text(g, 'UP DOWN  LEFT RIGHT  X FIRE  L1 R1 TAB  TRI LIVE  O BACK', x0 + 4, r.H - 10, '#8a92aa', { outline: false, font: 'tiny' });
  });
};

// the seats the dev events use
SM.devPlayer = (side, pref) => SM.M.players.find(p => p.side === side && p.pos === (pref == null ? 4 : pref) && p.bin <= 0) || SM.M.players.find(p => p.side === side && p.bin <= 0);
SM.devTry = side => { const p = SM.devPlayer(side, 3); const d = SM.DIRS(side); p.x = side === 0 ? SM.X1 + 30 : SM.X0 - 30; p.y = SM.CY; SM.M.ball.owner = p; SM.M.ball.state = 'held'; SM.tryScored(p); };
SM.devGive = () => { const seat = SM.M.seats[0]; if (seat && seat.p) { SM.M.ball.owner = seat.p; SM.M.ball.state = 'held'; SM.M.ball.lastTouch = seat.p.side; } };
SM.devScrum = () => { const b = SM.M.ball; SM.startScrum(b.x, b.y, 1 - (b.lastTouch || 0)); };
SM.devLineout = () => { SM.startLineout(SM.M.ball.x, SM.Y0 + 51, 1); };
SM.devFoul = () => { const seat = SM.M.seats[0]; const opp = SM.M.players.find(p => p.side !== (seat ? seat.p.side : 0) && p.bin <= 0); if (opp) SM.foul('late', opp, opp.x, opp.y, false); };
SM.devCard = () => { const p = SM.M.players.find(q => q.side === 0 && q.pos === 6 && q.bin <= 0) || SM.M.players.find(q => q.side === 0 && q.bin <= 0); if (p) SM.sendOff(p); };
SM.devRuck = () => { const b = SM.M.ball; SM.startRuck(b.x, b.y, b.lastTouch || 0); };
SM.devMonster = () => { const c = SM.M.ball.owner || SM.M.players.find(p => p.side === 0 && p.bin <= 0); const d = SM.M.players.find(p => p.side !== c.side && p.bin <= 0); if (!c || !d) return; d.x = c.x - 6; d.y = c.y; d.facing = 0; d.side === 1 ? d.facing = Math.PI : 0; SM.tackle(d, true, 1.2); };
SM.devPowerup = () => { SM.M.powerups.push({ x: SM.CX, y: SM.CY + 40, type: 'pie', life: 15 }); };

// the results: the score with the teams, the Player of the Match, four stat tiles
const resultsScene = {
  enter(data) { SM.results = data; game.audio.music(SM.songs.title); },
  update(dt) {
    const I = game.input;
    if (SM.results.attract) { SM.attractT = (SM.attractT || 0) + dt; if (SM.attractT > 8 || I.anyPressed()) { SM.attractT = 0; return game.go('title'); } return; }
    if (I.pressed('confirm') || I.pressed('start') || I.pressed('cancel')) {
      const d = SM.results;
      if (!d.cupMatch && !d.attract && !d.recorded) {
        d.recorded = true;
        addRecord('margin', 'YOU', Math.abs(d.score[0] - d.score[1]));
        addRecord('tries', 'YOU', d.stats[0].tries);
        const hit = (d.players || []).filter(p => p.side === 0).reduce((a, p) => Math.max(a, p.hitM || 0), 0);
        if (hit > 0) addRecord('hit', 'YOU', Math.round(hit));
      }
      if (d.cupMatch) {
        if (d.score[0] > d.score[1]) {
          const c = cupSave(), next = Math.max(c.round, (d.round || 0) + 1);
          E.store.set('smashby:cup', { round: next, won: c.won + 1 });
        }
        return game.go('cup');
      }
      return game.go(d.attract ? 'title' : 'menu');
    }
  },
  draw(r) {
    const d = SM.results;
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, d.score[0] > d.score[1] ? 'MUDLARKS WIN' : d.score[0] < d.score[1] ? 'MUDLARKS LOSE' : 'DRAW', r.W / 2, 22, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
      E.font.text(g, 'MUDDINGTON ' + d.score[0] + ' - ' + d.score[1] + ' ' + d.away.toUpperCase(), r.W / 2, 60, '#f0ecdc', { align: 'center', scale: 1, outline: false });
      const tiles = [['TRIES', d.stats[0].tries + ' - ' + d.stats[1].tries], ['BIG HITS', d.stats[0].bigHits + ' - ' + d.stats[1].bigHits],
        ['METRES', Math.round(d.stats[0].metres) + ' - ' + Math.round(d.stats[1].metres)], ['POSSESSION', Math.round(100 * d.stats[0].poss / Math.max(1, d.stats[0].poss + d.stats[1].poss)) + '%']];
      tiles.forEach(([k, v], i) => {
        const x = 24 + i * 96;
        E.ui.box(g, x, 84, 88, 52, { bg: '#141a2c', border: '#3a4460', alpha: .9 });
        E.font.text(g, k, x + 44, 92, '#8a92aa', { align: 'center', font: 'tiny', outline: false });
        E.font.text(g, v, x + 44, 110, '#ffe7a8', { align: 'center', outline: false });
      });
      const mvp = d.players.filter(p => p.side === 0).sort((a, b) => (b.tries * 10 + b.bigHits * 4 + b.tackles + b.metres / 10) - (a.tries * 10 + a.bigHits * 4 + a.tackles + a.metres / 10))[0];
      if (mvp) E.font.text(g, 'PLAYER OF THE MATCH: ' + mvp.nick.toUpperCase() + '  (' + mvp.tries + ' TRIES, ' + mvp.tackles + ' TACKLES)', r.W / 2, 150, '#ffd36a', { align: 'center', outline: false });
    });
    r.text(('PRESS ' + game.input.label('confirm')).toUpperCase() + ' TO CONTINUE', r.W / 2, r.H - 22, '#ffffff', { align: 'center', shadow: '#000' });
  }
};

// ABOUT & CREDITS: five pages (the text is in 03-about.js)
let aboutPage = 0;
const aboutScene = {
  enter() { aboutPage = 0; game.audio.music(SM.songs.title); },
  update() {
    const I = game.input;
    if (I.pressed('r1') || I.pressed('right')) aboutPage = (aboutPage + 1) % SM.ABOUT.length;
    if (I.pressed('l1') || I.pressed('left')) aboutPage = (aboutPage + SM.ABOUT.length - 1) % SM.ABOUT.length;
    if (I.pressed('cancel') || I.pressed('confirm')) game.go('menu');
  },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    const page = SM.ABOUT[aboutPage];
    r.overlay(g => {
      E.font.title(g, page.title, r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
      let y = 48;
      for (const line of page.lines) { for (const l of E.font.wrap(line, r.W - 40, { outline: false })) { E.font.text(g, l, 20, y, '#f0ecdc', { outline: false }); y += 10; } y += 4; }
      E.font.text(g, (aboutPage + 1) + ' / ' + SM.ABOUT.length + '   LEFT RIGHT TURN   CONFIRM BACK', r.W / 2, r.H - 14, '#8a92aa', { align: 'center', outline: false, font: 'tiny' });
    });
  }
};

SM.scenes = { title, menu: menuScene, setup: setupScene, cup: cupScene, story: storyScene, match: matchScene, results: resultsScene, about: aboutScene, records: recordsScene };
