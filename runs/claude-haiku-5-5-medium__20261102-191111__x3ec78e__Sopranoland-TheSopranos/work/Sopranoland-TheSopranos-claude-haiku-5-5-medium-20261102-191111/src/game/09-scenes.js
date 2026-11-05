// ---------------------------------------------------------------------------------------------
// 09 · SCENES — the title (its menu and the attract mode's ten-second wait), the play scene, the
// session room with Dr. Vashti, the About and Credits pages, and the end screen. Then the start.
// ---------------------------------------------------------------------------------------------
const ABOUT = __ABOUT_JSON__;   // the exit interview, built in (build.mjs): the About pages read it
const BG_CITY = new E.Backdrop('city-night');

// the play frame, shared by the player and the attract demo: the world, then the HUD and the talk box
function playUpdate(dt, ctl, walk) {
  convTick();
  if (talk.update(dt)) return;          // a box is open: the world waits for it
  if (conv) return;                     // between two lines of a conversation
  if (HUB && (HUB.time() < 0 || NET.ended)) return;   // the countdown: no play before the hub's start
  worldStep(dt, ctl, walk);
}
function drawPlayFrame(r) {
  r.sky(['#241a3a', '#6a3050', '#e89a6a']);
  drawWorld(r);
  drawHUD(r, { hubCountdown: hubCountdown() });
  talk.draw(r);
}

// ---- the title ----------------------------------------------------------------------------------
let titleMenu = null, titleIdle = 0, titlePtr = null;
const titleScene = {
  enter() {
    ATTRACT = false;
    playSong('title');
    titleIdle = 0; titlePtr = null;
    const latest = game.saves.latest();
    titleMenu = new E.Menu(game, ['NEW GAME', { label: 'CONTINUE', disabled: !latest }, 'OPTIONS', 'ABOUT THE GAME'], {
      x: 'center', y: 118,   // (under the logo and its line, above the prompt on a short landscape phone)
      onPick: (i) => {
        if (i === 0) { game.go('play', { new: true }); }
        else if (i === 1) { const sv = game.saves.latest(); if (sv) game.saves.load(sv.slot); }
        else if (i === 2) game.menu('settings');
        else if (i === 3) game.go('credits', { from: 'title' });
      },
    });
  },
  update(dt) {
    const p = game.input.pointer && game.input.pointer();
    const moved = p && titlePtr && (p[0] !== titlePtr[0] || p[1] !== titlePtr[1]);
    titlePtr = p ? p.slice() : null;
    if (game.input.anyPressed() || moved) titleIdle = 0; else titleIdle += dt;
    if (titleIdle > 10) { game.go('attract'); return; }
    if (game.input.pressed('start') && !(titleMenu && titleMenu.selected && titleMenu.selected.disabled)) { game.go('play', { new: true }); return; }
    if (titleMenu) titleMenu.update(dt);
  },
  draw(r) {
    BG_CITY.draw(r);
    const I = game.input;
    r.overlay(g => E.font.title(g, 'SOPRANOLAND', r.W / 2, Math.round(r.H * .2), { scale: 3, align: 'center' }));
    r.text('Sunday gravy is on the table.', r.W / 2, Math.round(r.H * .2) + 34, '#e8dcff', { align: 'center', shadow: '#000' });
    if (titleMenu) titleMenu.draw(r);
    if (TOUCH_ONLY) r.text('Controller or keyboard required', r.W / 2, r.H - 16, '#ffd36a', { align: 'center', shadow: '#000' });
    else r.text(I.label('start') + ' or click to pick', r.W / 2, r.H - 14, '#c8c0d8', { align: 'center', shadow: '#000' });
  },
};

// ---- the play scene ----------------------------------------------------------------------------
const playScene = {
  pausable: true, propSize: 1.3, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'],
  enter(d = {}) {
    ATTRACT = false;
    game.lights.enabled = true; game.lights.ambient = .55;
    if (d.resume && W) { /* back from the session room: the world is as it was */ }
    else if (d.load) { buildWorld(); setChapter(S.chapter, { quiet: true }); }
    else {
      S = newState();
      buildWorld();
      setChapter(1, { quiet: !!HUB });
      if (!HUB) startConv('intro', null);
    }
    W.god = false;
    game.follow(W.hero, { z: 16 });
    game.cam.bounds = v => W.map.bounds(v);
    playSong(songForPlay());
    maybeReady();
  },
  exit() { game.lights.enabled = false; },
  update(dt) {
    if (NET.ended) return;
    playUpdate(dt, game.input, PLAYER_MOVE);
    playSong(songForPlay());
  },
  draw(r) { drawPlayFrame(r); },
};

// ---- the session room: Dr. Vashti (the chapter's talk, with the stress and the cannoli) ---------
const sessionScene = {
  enter() {
    playSong('sit');
    AI.talk = 0;
    startConv('vashti', () => { S.vashti = true; setChapter(4); game.go(ATTRACT ? 'attract' : 'play', { resume: true }); });
  },
  update(dt) {
    convTick();
    if (ATTRACT && talk.open) aiTalk(dt, AI);
    talk.update(dt);
  },
  draw(r) {
    r.sky(['#1a1220', '#4a2a3a', '#a06a50']);
    r.overlay(g => {
      E.font.title(g, 'DR. VASHTI', r.W / 2, Math.round(r.H * .12), { scale: 2, align: 'center' });
      E.ui.box(g, 10, Math.round(r.H * .28), r.W - 20, Math.round(r.H * .4), { bg: ['#2a1a2e', '#140c18'], border: '#8a6a4a', alpha: .6 });
      E.font.text(g, 'Session 14. The chair by the window is the good one.', r.W / 2, Math.round(r.H * .32), '#b8a0a0', { align: 'center' });
    });
    talk.draw(r);
  },
};

// ---- the About and Credits pages: the exit interview, read in pages ---------------------------
const SI_LABELS = { date: 'Date', source: 'Source', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
const TF_Q = ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'];
const EF_Q = ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'If you had to remove or overhaul one thing from the engine, what would that be?', 'If you could change one thing about the engine, what would it be?'];
const PF_Q = ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'If there was one test you could have run, what would that test be?'];
function aboutPages() {
  const si = ABOUT.sourceInformation || {};
  const pages = [
    { title: 'SOURCE INFORMATION', items: Object.keys(SI_LABELS).map(k => SI_LABELS[k] + ': ' + (si[k] || 'unknown')) },
    { title: 'TESTING FEEDBACK', items: TF_Q.map((q, i) => q + '  ' + ((ABOUT.testingFeedback || [])[i] || 'unknown')) },
    { title: 'ENGINE FEEDBACK', items: EF_Q.map((q, i) => q + '  ' + ((ABOUT.engineFeedback || [])[i] || 'unknown')) },
    { title: 'PROMPT FEEDBACK', items: PF_Q.map((q, i) => q + '  ' + ((ABOUT.promptFeedback || [])[i] || 'unknown')) },
    { title: 'CREDITS', items: [
      'SOPRANOLAND, a playful riff on The Sopranos (1999-2007).',
      'Built on the my-3D2dge engine (handoff v0.85.1) with AI Hub Session Protocol v1, ghost mode.',
      'Written, drawn and scored in code: no image, sound or voice files. The voices are gibberish blips.',
      'Every name and place here is made up for the game. Sunday gravy is on the table.',
    ] },
  ];
  return pages;
}
const about = { from: 'title', page: 0, scroll: 0 };
const aboutScene = {
  enter(d = {}) { about.from = d.from || 'title'; about.page = 0; about.scroll = 0; playSong('final'); },
  update(dt) {
    const I = game.input, n = aboutPages().length;
    if (I.pressed('cancel') || (I.pressed('confirm') && about.page === n - 1)) { game.go(about.from === 'end' ? 'end' : 'title'); return; }
    if (I.pressed('right') || I.pressed('confirm')) { about.page = (about.page + 1) % n; about.scroll = 0; }
    if (I.pressed('left')) { about.page = (about.page + n - 1) % n; about.scroll = 0; }
    if (I.down('down')) about.scroll += 60 * dt;
    if (I.down('up')) about.scroll = Math.max(0, about.scroll - 60 * dt);
  },
  draw(r) {
    r.sky(['#101020', '#202040']);
    const pages = aboutPages(), p = pages[about.page];
    r.overlay(g => {
      E.font.title(g, p.title, r.W / 2, 8, { scale: 2, align: 'center' });
      E.ui.box(g, 8, 30, r.W - 16, r.H - 52, { bg: ['#1c1a34', '#100e20'], border: '#8a80b0', alpha: .85 });
      let y = 36 - about.scroll;
      const maxW = r.W - 32;
      for (const item of p.items) {
        const lines = E.font.wrap(item, maxW, {});
        for (const ln of lines) { if (y > 26 && y < r.H - 26) E.font.text(g, ln, 16, y, '#e8e0f8', {}); y += 9; }
        y += 4;
      }
      E.font.text(g, (about.page + 1) + ' / ' + pages.length + '   ' + game.input.label('right') + ' next   ' + game.input.label('cancel') + ' back', r.W / 2, r.H - 16, '#b8b0d8', { align: 'center' });
    });
  },
};

// ---- the end --------------------------------------------------------------------------------
const endScene = {
  enter(d = {}) { playSong('final'); },
  update() {
    if (game.input.pressed('confirm') || game.input.pressed('start')) game.go('credits', { from: 'end' });
  },
  draw(r) {
    r.sky(['#2a1a10', '#6a3a20']);
    r.overlay(g => E.font.title(g, 'GRAVY SERVED', r.W / 2, Math.round(r.H * .2), { scale: 3, align: 'center' }));
    const lines = ['Ma\'s gravy, on the table at last.', 'Deaths ' + S.deaths + '   Kills ' + S.kills + '   Cash $' + S.cash.toLocaleString('en-US'),
      'Ducks ' + S.ducks + '/' + DUCKS.length + '   Time ' + fmtTime(S.playTime * 1000)];
    lines.forEach((ln, i) => r.text(ln, r.W / 2, Math.round(r.H * .5) + i * 14, '#f4eee0', { align: 'center', shadow: '#000' }));
    r.text(game.input.label('confirm') + ' for the about pages', r.W / 2, r.H - 20, '#ffd36a', { align: 'center', shadow: '#000' });
  },
};

// ---- start ------------------------------------------------------------------------------------
hubConnect();
game.start({
  scenes: { title: titleScene, attract: attractScene, play: playScene, session: sessionScene, credits: aboutScene, end: endScene },
  scene: HUB ? 'play' : 'title',
});

// a handle for the tests and the tools: the run read and set, the talk box, and the data tables
game.debug = {
  snapshot: () => ({
    scene: game.sceneName, chapter: S.chapter, hp: Math.round(S.hp), stress: Math.round(S.stress), heat: Math.round(S.heat),
    cash: S.cash, respect: S.respect, ammo: S.ammo, kills: S.kills, deaths: S.deaths, ducks: S.ducks, cannoli: S.cannoli, done: S.done,
    got: Object.assign({}, S.got), bossDown: S.bossDown, talk: talk.open, conv: conv ? conv.id : null, attract: ATTRACT,
    hero: W ? [Math.round(W.hero.x), Math.round(W.hero.y), Math.round(W.hero.z * 10) / 10] : null,
    zone: W ? zoneAt(W.hero.x, W.hero.y) : null,
    foes: W ? W.foes.filter(f => !f.dead && f.kind !== "civ").length : 0,
    boss: W && W.boss ? [Math.round(W.boss.hp), W.boss.dead] : null,
    toast: W ? W.toast : null, flags: Object.assign({}, S.flags), frozen: W ? W.frozen : null,
  }),
  // put the hero on a world point, still
  teleport(x, y, facing) { if (!W) return; Object.assign(W.hero, { x, y, vx: 0, vy: 0, z: 0, onGround: true, wall: null, action: null }); if (facing !== undefined) W.hero.facing = facing; },
  // set the run up to a chapter (a test starts where it wants to be)
  chapter(n) { S.chapter = n; setChapter(n, { quiet: true }); },
  give(key, v) { S[key] = v; },
  state: () => S,
  world: () => W,
  talkBox: talk,
  startConv,
  stick: () => stickMove(game.input),
  data: { CONVS, VOICES, ZONES, CHAPTERS, SONGS, DUCKS, CANNOLI, AMMO, CHECKPOINT, zoneAt, buildTownRows, TOWN_LEGEND, TOWN_TYPES, FOE_KINDS, LOOKS, SPEAKER_NAMES, Foe, centerOf: c => centerOf(c) },
};
