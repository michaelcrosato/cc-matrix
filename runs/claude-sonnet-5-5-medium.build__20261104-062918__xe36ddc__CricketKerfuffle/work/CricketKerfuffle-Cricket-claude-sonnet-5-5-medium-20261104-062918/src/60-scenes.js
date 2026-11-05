/* ---------- front-end scenes: title, setup, story map, cutscenes, results, how to play, scores, about ---------- */
let cab = null;                 // E.Arcade: the Super Over table and the initials entry
const progress = () => store.get('progress', { chapters: 0, stars: [0, 0, 0] });
const saveProgress = p => store.set('progress', p);
let setupMode = 'quick';
const SETUP = { opp: 0, ground: 0, overs: 1, wickets: 1, diff: 1, chaos: 1 };
const OPPS = ['witt', 'gumb', 'mega', 'rain'], GROUND_IDS = ['green', 'cow', 'dome'], OVERS = [1, 2, 3, 5], WKTS = [2, 3, 5];

const backdrop = (r, t, night) => {
  r.sky(night ? ['#080818', '#1c1840', '#4a2a70'] : ['#5aaee8', '#a8dcf4', '#f6ecc4']);
  r.overlay(g => {
    // rolling hills, a pavilion and a very patient cow
    const h = r.H;
    px.rect(g, 0, h * .6, r.W, h * .4, night ? '#1e5a30' : '#3f9a3a');
    for (let x = 0; x < r.W; x += 2) px.rect(g, x, h * .6 + Math.sin(x / 40) * 4 - 4, 2, 6, night ? '#246a38' : '#4aa845');
    for (let i = 0; i < 6; i++) px.rect(g, 0, h * .66 + i * 12, r.W, 6, night ? '#226236' : '#459f40');
    px.rect(g, r.W * .08, h * .46, 70, 30, '#f0e8d0'); px.poly(g, [[r.W * .08 - 4, h * .46], [r.W * .08 + 74, h * .46], [r.W * .08 + 35, h * .46 - 18]], '#a03a30');
    for (let k = 0; k < 4; k++) px.rect(g, r.W * .08 + 6 + k * 16, h * .46 + 10, 8, 12, night ? '#ffe9a0' : '#6ab0d8');
    // a ball in the sky, forever on its way to a window
    const bt = (t * .35) % 1, bx = bt * (r.W + 40) - 20, by = h * .5 - Math.sin(bt * Math.PI) * h * .38;
    px.disc(g, bx, by, 4, '#ffffff'); px.disc(g, bx, by, 3, '#d02830');
    if (night) for (let i = 0; i < 40; i++) px.dot(g, (i * 97) % r.W, (i * 53) % (h * .5), i % 3 ? '#ffffff' : '#ffe9a0');
  });
};
const titleLogo = (r, y, sc = 3) => r.overlay(g => {
  E.font.title(g, 'CRICKET', r.W / 2, y, { scale: sc, align: 'center', colors: ['#fff6c0', '#ffd040', '#e07020'], outline: '#301008', depth: 3, depthColor: '#6a2a10' });
  E.font.title(g, 'KERFUFFLE', r.W / 2, y + sc * 9 + 6, { scale: sc + 1, align: 'center', colors: ['#d8f8ff', '#58c0f0', '#2060c0'], outline: '#081830', depth: 3, depthColor: '#102850' });
});

/* ----- title ----- */
let titleMenu = null, titleMore = null, titleState = { more: false, idle: 0, mt: null, t: 0, touchOnly: false };
const titleScene = {
  enter() {
    titleState.idle = 0; titleState.more = false; titleState.t = 0; titleState.mt = game.input.mouse.t;
    const touchOnly = !!(typeof matchMedia === 'function' && !matchMedia('(any-pointer: fine)').matches && !(navigator.getGamepads && [...navigator.getGamepads()].some(Boolean)));
    titleState.touchOnly = touchOnly;
    const go = (m) => { setupMode = m; game.go('setup'); };
    titleMenu = new BigMenu([
      { label: 'STORY MODE', hint: 'Three chapters. One missing Cup. A cow with opinions.', onPick: () => game.go('story') },
      { label: 'QUICK MATCH', hint: 'Bat, bowl and field a full match. You choose the rules.', onPick: () => go('quick') },
      { label: 'SUPER OVER', hint: 'One over, two wickets. Score as much as you dare.', onPick: () => go('super') },
      { label: 'VERSUS (2 PLAYERS)', hint: 'Two players, one screen: you bat, they bowl, then swap.', onPick: () => go('versus') },
      { label: 'SETTINGS', hint: 'Sound, display, button symbols (PlayStation or Xbox).', onPick: () => game.menu('settings') },
      { label: 'MORE...', onPick: () => { titleState.more = true; titleMore.i = 0; } },
    ], { y: 86, scale: 2, hintY: -34, hintCol: '#f6f2d0' });
    titleMore = new BigMenu([
      { label: 'HOW TO PLAY', onPick: () => game.go('howto') },
      { label: 'HIGH SCORES', onPick: () => game.go('scores') },
      { label: 'CONTROLS', onPick: () => game.menu('controls') },
      { label: 'ABOUT & CREDITS', onPick: () => game.go('about') },
      { label: 'BACK', onPick: () => { titleState.more = false; } },
    ], { y: 86, scale: 2, onCancel: () => { titleState.more = false; } });
    playMusic('title', .5);
  },
  update(dt) {
    const I = game.input, S = titleState; S.t += dt;
    // the attract mode: ten seconds without input
    if (I.anyPressed() || I.clicked() || I.mouse.t !== S.mt || hyp(...I.move()) > .3) { S.idle = 0; S.mt = I.mouse.t; } else S.idle += dt;
    if (S.idle >= 10) { S.idle = 0; startMatch({ mode: 'attract', attract: true, overs: 2, wickets: 3, opp: 'witt', ground: 'green', seed: 4242 }); return; }
    if (S.touchOnly) return;
    (S.more ? titleMore : titleMenu).update(dt);
  },
  draw(r) {
    backdrop(r, titleState.t, false);
    titleLogo(r, 12, 3);
    if (titleState.touchOnly) {
      r.overlay(g => { dark(g, 30, 110, r.W - 60, 56, .7); E.font.text(g, 'Controller or keyboard required', r.W / 2, 122, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, 'Open Settings from the menu button, top right', r.W / 2, 148, INK, { align: 'center', outline: false, shadow: '#000' }); });
      return;
    }
    (titleState.more ? titleMore : titleMenu).draw(r);
    chipsRow(r, r.H - 17, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
  },
};

/* ----- setup (quick match, super over, versus) ----- */
let setupMenu = null;
const setupScene = {
  enter() {
    const m = setupMode, items = [];
    items.push({ label: 'OPPONENT', opts: OPPS.map(o => TEAMS[o].name), v: SETUP.opp, onChange: v => { SETUP.opp = v; } });
    items.push({ label: 'GROUND', opts: GROUND_IDS.map(o => GROUNDS[o].name), v: SETUP.ground, onChange: v => { SETUP.ground = v; } });
    if (m !== 'super') { items.push({ label: 'OVERS', opts: OVERS.map(String), v: SETUP.overs, onChange: v => { SETUP.overs = v; } }); items.push({ label: 'WICKETS', opts: WKTS.map(String), v: SETUP.wickets, onChange: v => { SETUP.wickets = v; } }); }
    if (m !== 'versus') items.push({ label: 'DIFFICULTY', opts: DIFFS.map(d => d.name), v: SETUP.diff, onChange: v => { SETUP.diff = v; } });
    items.push({ label: 'CHAOS', opts: ['Calm', 'Mayhem'], v: SETUP.chaos, onChange: v => { SETUP.chaos = v; } });
    items.push({ label: 'PLAY BALL!', onPick: () => beginSetup() });
    items.push({ label: 'BACK', onPick: () => game.go('title') });
    setupMenu = new BigMenu(items, { y: 46, scale: 2, onCancel: () => game.go('title') });
  },
  update(dt) { setupMenu.update(dt); },
  draw(r) {
    backdrop(r, game.time, false);
    r.overlay(g => { dark(g, 30, 4, r.W - 60, 36, .6); E.font.text(g, setupMode === 'quick' ? 'QUICK MATCH' : setupMode === 'super' ? 'SUPER OVER' : 'VERSUS', r.W / 2, 7, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, setupMode === 'versus' ? 'Player 1 bats first. Player 2 joins on the second pad or the arrow keys.' : 'Left and right change a rule. Confirm starts the match.', r.W / 2, 26, INK, { align: 'center', outline: false, shadow: '#000' }); });
    r.overlay(g => dark(g, 60, 42, r.W - 120, 190, .5));
    setupMenu.draw(r);
  },
};
function dark2(r, y, h) { r.overlay(g => dark(g, 60, y, r.W - 120, h + 40, .45)); }
function beginSetup() {
  const m = setupMode, d = { mode: m, opp: OPPS[SETUP.opp], ground: GROUND_IDS[SETUP.ground], overs: OVERS[SETUP.overs], wickets: WKTS[SETUP.wickets], diff: SETUP.diff, chaos: SETUP.chaos ? 'all' : 'none' };
  if (m === 'super') { d.overs = 1; d.wickets = 2; d.single = true; }
  if (m === 'versus') { d.diff = 1; if (!game.players[1]) { try { game.addPlayer(game.input.padIndex !== null && navigator.getGamepads && [...navigator.getGamepads()].filter(Boolean).length > 1 ? { pad: 1 } : { keys: 'right' }); } catch (e) { game.addPlayer({ keys: 'right' }); } } }
  startMatch(d);
}

/* ----- story map ----- */
let storyMenu = null;
const storyScene = {
  enter() {
    const pr = progress(), items = [];
    CHAPTERS.forEach((c, i) => items.push({ label: (pr.stars[i] ? '★'.repeat(pr.stars[i]) + ' ' : '') + 'CHAPTER ' + c.id + ': ' + c.name.toUpperCase(), disabled: i > pr.chapters, hint: i > pr.chapters ? 'Win the previous chapter first.' : TEAMS[c.opp].name + ' • ' + GROUNDS[c.ground].name + ' • ' + c.overs + ' overs, ' + c.wickets + ' wickets', onPick: () => playChapter(i) }));
    items.push({ label: 'BACK', onPick: () => game.go('title') });
    storyMenu = new BigMenu(items, { y: 70, scale: 1, onCancel: () => game.go('title') });
    playMusic('story', .5);
  },
  update(dt) { storyMenu.update(dt); },
  draw(r) {
    backdrop(r, game.time, false);
    r.overlay(g => { dark(g, 20, 8, r.W - 40, 50, .65); E.font.text(g, 'THE GRAND KERFUFFLE', r.W / 2, 14, GOLD, { scale: 3, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, 'Find the Cup. Beat the villages. Mind the cow.', r.W / 2, 42, INK, { align: 'center', outline: false, shadow: '#000' }); dark(g, 40, 62, r.W - 80, 130, .55); });
    storyMenu.draw(r);
  },
};
function playChapter(i) {
  const c = CHAPTERS[i];
  game.go('cutscene', { lines: c.intro, night: c.ground === 'dome', title: 'CHAPTER ' + c.id + ': ' + c.name, onDone: () => startMatch({ mode: 'story', ch: i, opp: c.opp, ground: c.ground, overs: c.overs, wickets: c.wickets, diff: c.diff, chaos: c.chaos }) });
}

/* ----- cutscenes: portraits, typewriter text, gibberish voices ----- */
const SPEAKERS = {
  VICAR: { vid: 'vicar', rig: () => mkRig('rain', 'umpire', 7), col: '#d8c8ff' },
  YOU: { vid: 'you', rig: () => { const r = mkRig('kerf', 'field', 2); return r; }, col: '#a8ffb8' },
  COACH: { vid: 'coach', rig: () => mkRig('gumb', 'field', 5), col: '#ffd8a0' },
  ANNOUNCER: { vid: 'announcer', rig: () => mkRig('mega', 'field', 3), col: '#ffe060' },
};
const speakerRigs = {};
let CS = null;
const cutScene = {
  enter(d) {
    CS = { lines: d.lines, i: 0, t: 0, onDone: d.onDone, night: d.night, title: d.title, full: false, shown: -1 };
    for (const k in SPEAKERS) speakerRigs[k] = speakerRigs[k] || SPEAKERS[k].rig();
    playMusic('story', .5);
  },
  update(dt) {
    const I = game.input, L = CS.lines[CS.i]; CS.t += dt;
    if (CS.shown !== CS.i) { CS.shown = CS.i; CS.t = 0; speak(L[1], SPEAKERS[L[0]] ? SPEAKERS[L[0]].vid : 'jeremy'); }
    for (const k in speakerRigs) speakerRigs[k].update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: k === L[0] && CS.t * 38 < L[1].length ? 'shout' : undefined });
    const done = CS.t * 38 >= L[1].length;
    if (I.pressed('confirm') || I.clicked()) {
      if (!done) CS.t = 999; else { CS.i++; if (CS.i >= CS.lines.length) { const f = CS.onDone; CS = null; f && f(); return; } }
    }
    if (I.pressed('cancel') || I.pressed('start')) { const f = CS.onDone; CS = null; f && f(); }
  },
  draw(r) {
    if (!CS) return;
    const L = CS.lines[CS.i], sp = SPEAKERS[L[0]];
    backdrop(r, game.time, CS.night);
    r.overlay(g => {
      E.font.text(g, CS.title || '', r.W / 2, 8, GOLD, { align: 'center', scale: 2, outline: false, shadow: '#000' });
      const bw = r.W - 40, bx = 20, by = r.H - 92;
      speakerRigs[L[0]].drawPortrait(g, 36, by - 82, 74, { zoom: 2.6, turn: .4, bg: '#1b2840', frame: sp ? sp.col : '#fff' });
      panel(g, bx, by, bw, 74);
      E.font.text(g, L[0], bx + 8, by + 6, sp ? sp.col : GOLD, { scale: 1, outline: false, shadow: '#000' });
      const shown = L[1].slice(0, Math.floor(CS.t * 38)), lines = E.font.wrap(shown, bw - 20);
      lines.forEach((ln, k) => E.font.text(g, ln, bx + 10, by + 20 + k * 11, INK, { outline: false, shadow: '#000' }));
      E.font.text(g, glyph('confirm') + ' CONTINUE   ' + glyph('cancel') + ' SKIP', r.W - 24, r.H - 14, DIM, { align: 'right', outline: false, shadow: '#000' });
    });
  },
};

/* ----- results ----- */
let RS = null, resultMenu = null;
const resultsScene = {
  enter(d) {
    RS = d; RS.t = 0; RS.entering = false;
    if (!cab) cab = new E.Arcade(game, { id: 'kerfuffle', lives: 1, idle: 10 });
    const res = d.result, won = res && res.winner === 0, items = [];
    RS.won = d.single ? true : won;
    if (d.mode === 'story') {
      const c = CHAPTERS[d.ch], pr = progress();
      if (won) { pr.chapters = Math.max(pr.chapters, d.ch + 1); const margin = d.sides[0].score - d.sides[1].score; pr.stars[d.ch] = Math.max(pr.stars[d.ch] || 0, margin > 20 ? 3 : margin > 8 ? 2 : 1); saveProgress(pr); }
      items.push({ label: 'CONTINUE', onPick: () => game.go('cutscene', { lines: won ? c.win : c.lose, night: c.ground === 'dome', title: c.name, onDone: () => game.go(won && d.ch === CHAPTERS.length - 1 ? 'about' : 'story') }) });
      if (!won) items.push({ label: 'TRY AGAIN', onPick: () => playChapter(d.ch) });
    } else if (d.mode === 'super') {
      items.push({ label: 'PLAY AGAIN', onPick: () => startMatch(d.data) });
    } else {
      items.push({ label: 'REMATCH', onPick: () => startMatch(d.data) });
    }
    items.push({ label: 'MAIN MENU', onPick: () => game.go('title') });
    resultMenu = new BigMenu(items, { y: r_y(), scale: 2 });
    playMusic(RS.won ? 'title' : 'story', .4); sfx(RS.won ? 'cheer' : 'groan');
    if (d.mode === 'super' && cab.qualifies(d.sides[0].score, 'super')) { RS.entering = true; cab.enter(d.sides[0].score, 'super', () => { RS.entering = false; }); }
  },
  update(dt) { RS.t += dt; if (cab) cab.update(dt); if (RS.entering) return; resultMenu.update(dt); },
  draw(r) {
    backdrop(r, game.time, false);
    const d = RS, res = d.result;
    r.overlay(g => {
      panel(g, 40, 8, r.W - 80, 112);
      const head = d.single ? 'SUPER OVER COMPLETE' : (res.winner === 0 ? 'VICTORY!' : res.winner === 1 ? 'DEFEAT' : 'A TIE!');
      E.font.text(g, head, r.W / 2, 14, res.winner === 1 ? '#ff8a70' : GOLD, { scale: 3, align: 'center', outline: false, shadow: '#000' });
      if (!d.single) E.font.text(g, res.winner >= 0 ? TEAMS[d.sides[res.winner].team].name + ' win ' + res.margin : 'Honours even, and the tea is cold.', r.W / 2, 42, INK, { align: 'center', outline: false, shadow: '#000' });
      d.sides.forEach((s, i) => {
        if (d.single && i === 1) return;
        const y = 58 + i * 26;
        E.font.text(g, TEAMS[s.team].name, 60, y, INK, { outline: false, shadow: '#000' });
        E.font.text(g, s.score + '/' + s.wkts, r.W - 60, y, GOLD, { scale: 2, align: 'right', outline: false, shadow: '#000' });
        E.font.text(g, oversStr(s.balls) + ' overs • ' + s.fours + ' fours • ' + s.sixes + ' sixes', 60, y + 10, DIM, { outline: false, shadow: '#000' });
      });
    });
    if (!RS.entering) resultMenu.draw(r);
    if (cab) cab.draw(r);
  },
};
function r_y() { return 132; }

/* ----- how to play ----- */
let HP = { page: 0 };
const HOWTO = [
  { title: 'BATTING', body: [['ground', 'Drive along the ground (safe, fast)'], ['loft', 'Loft it for a six (risky: you can be caught)'], ['defend', 'Block: a dead bat, a certain contact'], ['special', 'ON FIRE when the Hype bar is full'], ['run', 'Run between the wickets: hold to keep running, tap to turn back']],
    tip: 'Push the stick or point the mouse where you want the ball to go. Press when the ring turns green.' },
  { title: 'BOWLING', body: [['ground', 'Quickie: fast and straight'], ['loft', 'Banana Swinger: swing the ball with left and right after release'], ['defend', 'Twirly Whirly: slow, and it turns'], ['special', 'THE FIREBALL when Hype is full'], ['cycle', 'Change the field: attack, balanced, defend']],
    tip: 'Place the marker on the pitch, press a delivery, then press again with the needle in the green. Over the red tip is a no ball.' },
  { title: 'FIELDING', body: [['run', 'Dive for the ball'], ['up', 'Move the highlighted fielder']], tip: 'The nearest fielder chases by himself. Catches and run outs are decided by timing, luck and the cow.' },
  { title: 'MAYHEM', body: [], tip: 'Sixes into the PUB WINDOW, TEA URN, CLOCK or BELL score bonus runs. Golden balls count double. Cows stop play. Rain makes the ball skid. Fill Hype to go ON FIRE.' },
];
const howtoScene = {
  enter() { HP.page = 0; },
  update(dt) { const I = game.input; if (I.repeat('right')) HP.page = (HP.page + 1) % HOWTO.length; if (I.repeat('left')) HP.page = (HP.page + HOWTO.length - 1) % HOWTO.length; if (I.pressed('cancel') || I.pressed('confirm') && HP.page === HOWTO.length - 1) game.go('title'); if (I.pressed('confirm') && HP.page < HOWTO.length - 1) HP.page++; const c = I.clicked(); if (c) { if (c[0] > game.screen.W / 2) HP.page = Math.min(HOWTO.length - 1, HP.page + 1); else HP.page = Math.max(0, HP.page - 1); } },
  draw(r) {
    backdrop(r, game.time, false);
    const P = HOWTO[HP.page];
    r.overlay(g => {
      panel(g, 24, 8, r.W - 48, r.H - 36);
      E.font.text(g, P.title, r.W / 2, 16, GOLD, { scale: 3, align: 'center', outline: false, shadow: '#000' });
      P.body.forEach((b, k) => { const y = 52 + k * 20; E.font.text(g, glyph(b[0]), 48, y, '#ffe27a', { scale: 2, outline: false, shadow: '#000' }); E.font.text(g, b[1], 120, y + 4, INK, { outline: false, shadow: '#000' }); });
      const lines = E.font.wrap(P.tip, r.W - 90); lines.forEach((l, k) => E.font.text(g, l, 46, r.H - 62 + k * 10, '#bfe8ff', { outline: false, shadow: '#000' }));
      E.font.text(g, '← → page ' + (HP.page + 1) + '/' + HOWTO.length + '    ' + glyph('cancel') + ' back', r.W / 2, r.H - 20, DIM, { align: 'center', outline: false, shadow: '#000' });
    });
  },
};

/* ----- high scores ----- */
const scoresScene = {
  enter() { if (!cab) cab = new E.Arcade(game, { id: 'kerfuffle', lives: 1, idle: 10 }); },
  update() { const I = game.input; if (I.pressed('cancel') || I.pressed('confirm') || I.clicked()) game.go('title'); },
  draw(r) { backdrop(r, game.time, false); r.overlay(g => dark(g, 60, 6, r.W - 120, r.H - 30, .6)); cab.drawTable(r, 'super', 20, 'SUPER OVER - BEST SCORES'); r.overlay(g => E.font.text(g, glyph('cancel') + ' BACK', r.W / 2, r.H - 16, DIM, { align: 'center', outline: false, shadow: '#000' })); },
};

/* ----- about & credits (long pages are flowed onto as many screens as they need) ----- */
let AB = { page: 0, key: '', pages: [] };
function aboutPaginate(W, H) {
  const key = W + 'x' + H; if (AB.key === key) return; AB.key = key; AB.pages = [];
  const avail = H - 54;
  for (const P of ABOUT_PAGES) {
    let cur = [], y = 0;
    const flush = () => { if (cur.length) AB.pages.push({ title: P.title, items: cur }); cur = []; y = 0; };
    for (const it of P.items) {
      const lines = E.font.wrap(it[1], it[0] ? W - 120 : W - 40), h = Math.max(1, lines.length) * 9 + 3;
      if (y + h > avail) flush();
      cur.push([it[0], lines]); y += h;
    }
    flush();
  }
  const cnt = {}, seen = {}; AB.pages.forEach(p => { cnt[p.title] = (cnt[p.title] || 0) + 1; });
  AB.pages.forEach(p => { const t = p.title; if (cnt[t] > 1) { seen[t] = (seen[t] || 0) + 1; p.title = t + ' ' + seen[t] + '/' + cnt[t]; } });
}
const aboutScene = {
  enter() { AB.page = 0; AB.key = ''; },
  update(dt) {
    const I = game.input, n = Math.max(1, AB.pages.length);
    if (I.repeat('right') || I.pressed('confirm')) AB.page = (AB.page + 1) % n;
    if (I.repeat('left')) AB.page = (AB.page + n - 1) % n;
    if (I.pressed('cancel')) game.go('title');
    const c = I.clicked(); if (c) { if (c[1] < 30) game.go('title'); else AB.page = (AB.page + 1) % n; }
  },
  draw(r) {
    backdrop(r, game.time, true); aboutPaginate(r.W, r.H);
    const P = AB.pages[AB.page % AB.pages.length];
    r.overlay(g => {
      panel(g, 10, 6, r.W - 20, r.H - 22);
      E.font.text(g, P.title, r.W / 2, 11, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' });
      let y = 32;
      for (const [h, lines] of P.items) {
        if (h) E.font.text(g, h, 18, y, '#ffe27a', { outline: false, shadow: '#000' });
        lines.forEach((ln, k) => E.font.text(g, ln, h ? 96 : 18, y + k * 9, INK, { outline: false, shadow: '#000' }));
        y += Math.max(1, lines.length) * 9 + 3;
      }
      E.font.text(g, '← → page ' + (AB.page + 1) + '/' + AB.pages.length + '    ' + glyph('cancel') + ' back', r.W / 2, r.H - 14, DIM, { align: 'center', outline: false, shadow: '#000' });
    });
  },
};
