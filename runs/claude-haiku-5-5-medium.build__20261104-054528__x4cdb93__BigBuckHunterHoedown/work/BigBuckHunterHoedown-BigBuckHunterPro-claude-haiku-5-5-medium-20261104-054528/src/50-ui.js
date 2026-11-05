// ---- the screens: title, menu, lodge, about & credits, dev mode, and the touch-only screen -------------------------
const IDLE = { t: 0, limit: 10 };
let TITLE_WORLD = null;
const titleWorld = () => (TITLE_WORLD = TITLE_WORLD || buildWorld(HUNTS[0], 0));

function touchOnlyDevice() {
  try {
    return typeof matchMedia === 'function' && matchMedia('(any-hover: none)').matches && matchMedia('(any-pointer: coarse)').matches;
  } catch (e) { return false; }
}
const TOUCH_ONLY = touchOnlyDevice();

// a button drawn on the screen, clicked with the mouse or a tap: { x, y, w, h } in fractions of the screen
function hitBox(game, b) {
  const c = game.input.clicked();
  if (!c) return false;
  return c[0] >= b.x * game.W && c[0] <= (b.x + b.w) * game.W && c[1] >= b.y * game.H && c[1] <= (b.y + b.h) * game.H;
}
function drawButton(g, W, H, b, label, color = '#ffffff') {
  E.ui.box(g, b.x * W, b.y * H, b.w * W, b.h * H, { bg: ['#2a1c3a', '#1a1028'], border: '#8a7ab0' });
  E.font.text(g, label, (b.x + b.w / 2) * W, (b.y + b.h / 2) * H - 4, color, { align: 'center', outline: '#000' });
}
const SETTINGS_BTN = { x: .04, y: .86, w: .26, h: .09 };

const title = {
  enter() { GAME.input.touchEnabled = !TOUCH_ONLY; IDLE.t = 0; HUNT_RUN.active = false; HUNT_RUN.bot = false; GAME.audio.music(SONGS.title); },
  update(dt) {
    const I = GAME.input;
    GAME.input.glyphs = GAME.settings.buttons === 'Xbox' ? 'xbox' : 'playstation';
    if (I.anyPressed() || (I.pointer && I.pointer() && I.clicked())) IDLE.t = 0;
    else IDLE.t += dt;
    if (TOUCH_ONLY) {
      if (hitBox(GAME, SETTINGS_BTN)) GAME.menu('settings');
      if (IDLE.t > IDLE.limit && GAME.settings.attract !== false) GAME.go('hunt', { mode: 'attract' });
      return;
    }
    if (I.pressed('start') || I.pressed('confirm')) { GAME.go('menu', { from: 'title' }); return; }
    if (IDLE.t > IDLE.limit && GAME.settings.attract !== false) GAME.go('hunt', { mode: 'attract' });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      paintLand(g, W, H, HUNTS[0], titleWorld(), r.game.time);
      paintFrontTrees(g, W, H, HUNTS[0], titleWorld());
      E.ui.box(g, 0, H * .06, W, H * .34, { bg: ['#0a0614', '#0a061488'], gradient: false, alpha: .5 });
      E.font.title(g, 'BIG BUCK HUNTER', W / 2, H * .1, { scale: Math.max(1, Math.round(H / 150)), colors: ['#fff1b8', '#d88a30'], align: 'center' });
      E.font.title(g, 'HOEDOWN', W / 2, H * .24, { scale: Math.max(2, Math.round(H / 90)), colors: ['#ffd060', '#c85a20'], align: 'center' });
      E.font.text(g, 'THE 41ST ANNUAL BIG BUCK HUNT-OFF • WHISKER LAKE LODGE', W / 2, H * .38, '#e8e0f8', { align: 'center', outline: '#000' });
      if (TOUCH_ONLY) {
        E.ui.box(g, W * .2, H * .6, W * .6, H * .16, { bg: ['#1c1408', '#2c1e0c'], alpha: .9 });
        E.font.text(g, 'Controller or keyboard required', W / 2, H * .66, '#ffd080', { align: 'center', outline: '#000' });
        E.font.text(g, 'This game plays with a controller, a keyboard and mouse. Attract mode runs here.', W / 2, H * .71, '#e8e0f8', { align: 'center', outline: '#000' });
        drawButton(g, W, H, SETTINGS_BTN, 'SETTINGS');
      } else {
        const blink = Math.floor(r.game.time * 2) % 2 === 0;
        if (blink) E.font.text(g, 'PRESS ' + GAME.input.label('start') + ' TO START', W / 2, H * .66, '#ffffff', { align: 'center', outline: '#000' });
        E.font.text(g, GAME.input.label('confirm') + ' SELECT • ' + GAME.input.label('cancel') + ' BACK', W / 2, H * .72, '#c8c0e0', { align: 'center', outline: '#000' });
      }
      E.font.text(g, 'SOURCE: ' + FEEDBACK.sourceInformation.source.toUpperCase() + ' • © 2026 • ' + GAME_VERSION, W / 2, H * .95, '#8a80a8', { align: 'center', outline: '#000' });
    });
  },
};

// ---- the menu: one E.Menu per page; pages are stacked for the back key ---------------------------------------------
const MENU = { page: 'main', stack: [], menu: null };
const PAGES = {
  main: () => {
    const items = [['HUNT-OFF CAMPAIGN', () => startFromMenu('campaign')], ['SINGLE HUNT', () => openPage('single')],
      ['BONUS GAMES', () => openPage('bonus')], ['PARTY HUNT (HOT SEAT)', () => openPage('party')], ['PRACTICE RANGE', () => startFromMenu('practice')],
      ['THE LODGE', () => GAME.go('lodge', { from: 'menu' })], ['SETTINGS', () => GAME.menu('settings')],
      ['DEV MODE', () => GAME.go('dev', { from: 'menu' })], ['ABOUT & CREDITS', () => GAME.go('about', { from: 'menu' })],
      ['BACK TO TITLE', () => GAME.go('title', { from: 'menu' })]];
    if (TOUCH_ONLY) return [items[5], items[7], items[8]];
    return items;
  },
  single: () => [['HOLLOW CREEK • AUTUMN MORNING', () => startFromMenu('single', 0)], ['BUGLE RIDGE • ALPINE DUSK', () => startFromMenu('single', 1)],
    ['MUSKEG LAKE • FIRST SNOW', () => startFromMenu('single', 2)], ['BACK', () => back()]],
  party: () => [['2 PLAYERS', () => startFromMenu('party', 2)], ['3 PLAYERS', () => startFromMenu('party', 3)], ['4 PLAYERS', () => startFromMenu('party', 4)], ['BACK', () => back()]],
  bonus: () => [['CROW PATROL', () => startFromMenu('bonus', 'crow')], ['SAUCER SEASON', () => startFromMenu('bonus', 'saucer')],
    ['SNOWBALL STANDOFF', () => startFromMenu('bonus', 'snowman')], ['BACK', () => back()]],
};
function openPage(name) {
  MENU.stack.push(MENU.page);
  MENU.page = name;
  buildMenu();
}
function back() {
  if (MENU.stack.length) { MENU.page = MENU.stack.pop(); buildMenu(); }
  else GAME.go('title', { from: 'menu' });
}
function buildMenu() {
  const items = PAGES[MENU.page]();
  const labels = items.map(i => i[0]);
  MENU.items = items;
  MENU.menu = new E.Menu(GAME, labels, {
    x: 'center', y: '34%',
    onPick(i) { items[i][1](); },
    onCancel() { back(); },
  });
}
function startFromMenu(kind, arg) {
  if (kind === 'campaign') GAME.go('hunt', { mode: 'campaign' });
  else if (kind === 'practice') GAME.go('hunt', { mode: 'practice' });
  else if (kind === 'single') GAME.go('hunt', { mode: 'single', hunt: arg });
  else if (kind === 'bonus') GAME.go('hunt', { mode: 'bonus', game: arg });
  else if (kind === 'party') GAME.go('hunt', { mode: 'party', game: arg });
}

const menuScene = {
  enter(data) {
    MENU.stack = []; MENU.page = 'main';
    IDLE.t = 0; MENU.ptr = null;
    if (data && data.from === 'title') GAME.audio.music(SONGS.title);
    buildMenu();
  },
  update(dt) {
    const I = GAME.input;
    GAME.input.glyphs = GAME.settings.buttons === 'Xbox' ? 'xbox' : 'playstation';
    // idle on a top-level page for 10 s starts the attract mode too (sub-pages wait for the player)
    const p = I.pointer ? I.pointer() : null;
    const moved = p && MENU.ptr && (Math.abs(p[0] - MENU.ptr[0]) + Math.abs(p[1] - MENU.ptr[1])) > 3;
    MENU.ptr = p ? p.slice() : null;
    if (I.anyPressed() || moved) IDLE.t = 0; else IDLE.t += dt;
    if (MENU.page === 'main' && IDLE.t > IDLE.limit && GAME.settings.attract !== false) { GAME.go('hunt', { mode: 'attract' }); return; }
    MENU.menu.update(dt);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      paintLand(g, W, H, HUNTS[0], titleWorld(), r.game.time);
      paintFrontTrees(g, W, H, HUNTS[0], titleWorld());
      E.ui.box(g, W * .3, H * .08, W * .4, H * .1, { bg: ['#1a1024', '#0e0818'], alpha: .9 });
      E.font.title(g, MENU.page === 'main' ? 'HUNT-OFF' : MENU.page === 'single' ? 'SINGLE HUNT' : MENU.page === 'party' ? 'PARTY HUNT' : 'BONUS GAMES', W / 2, H * .1, { scale: Math.max(1, Math.round(H / 200)), colors: ['#fff1b8', '#d88a30'], align: 'center' });
      E.ui.box(g, W * .3, H * .3, W * .4, H * .58, { bg: ['#1a1024', '#0e0818'], alpha: .9 });
    });
    MENU.menu.draw(r);
    r.overlay(g => {
      E.font.text(g, GAME.input.label('confirm') + ' SELECT    ' + GAME.input.label('cancel') + ' BACK', r.W / 2, r.H * .94, '#c8c0e0', { align: 'center', outline: '#000' });
    });
  },
};

// ---- the lodge: records, trophies, and the standings to beat -------------------------------------------------------
const lodgeScene = {
  update() {
    const I = GAME.input;
    if (I.pressed('confirm') || I.pressed('cancel')) GAME.go('menu', { from: 'lodge' });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, rec = SAVE.records(), tro = SAVE.trophies();
      paintSky(g, W, H, HUNTS[1]);
      E.px.rect(g, 0, H * HORIZON, W, H, '#2a1a10');
      E.ui.box(g, W * .05, H * .08, W * .9, H * .84, { bg: ['#2a1a10', '#150c06'], alpha: .95 });
      E.font.title(g, 'THE LODGE', W / 2, H * .12, { scale: Math.max(1, Math.round(H / 200)), colors: ['#fff1b8', '#d88a30'], align: 'center' });
      E.font.text(g, 'HUNT-OFF RECORDS', W * .12, H * .26, '#f3d98a', { outline: '#000' });
      if (!rec.length) E.font.text(g, 'No records yet. Finish a Hunt-Off to start the board.', W * .12, H * .34, '#ffffff', { outline: '#000' });
      rec.forEach((x, i) => E.font.text(g, (i + 1) + '. ' + x.name + '   ' + fmtPts(x.score) + '   ' + x.hunt + '   ' + x.at, W * .12, H * .3 + i * H * .055, '#ffffff', { outline: '#000' }));
      E.font.text(g, 'TROPHY ROOM', W * .55, H * .26, '#f3d98a', { outline: '#000' });
      if (!tro.length) E.font.text(g, 'Empty. The legends are out there.', W * .55, H * .34, '#ffffff', { outline: '#000' });
      tro.forEach((t, i) => E.font.text(g, '★ ' + t, W * .55, H * .3 + i * H * .055, '#ffe27a', { outline: '#000' }));
      E.font.text(g, 'RIVALS TO BEAT', W * .12, H * .74, '#f3d98a', { outline: '#000' });
      HUNTS.forEach((h, i) => E.font.text(g, h.rival + ' • ' + h.name + ' • ' + fmtPts(h.rivalScores[0]), W * .12, H * .8 + i * H * .045, '#cfc8e8', { outline: '#000' }));
      E.font.text(g, GAME.input.label('confirm') + ' BACK', W / 2, H * .92, '#ffffff', { align: 'center', outline: '#000' });
    });
  },
};

// ---- about & credits: the source information and the three feedback sections, in pages -----------------------------
const ABOUT = { page: 0 };
const ABOUT_PAGES = () => [
  { title: 'ABOUT & CREDITS', lines: [
    TITLE + '  •  a playful riff on ' + FEEDBACK.sourceInformation.source,
    'Made with the my-3D2dge engine (handoff v0.85.2) and AI Hub Session Protocol v1.',
    'Every picture, song and voice here is written in code. No image or sound files.',
    'Your rifle: pump between shots. Bucks only. Never a doe. Read the Shot Chart.',
    'Thanks to the lodge regulars: Dub, Granny Mae, Dwayne, Loretta, Earl, Hank and Bessie.',
  ] },
  { title: 'SOURCE INFORMATION', lines: Object.entries(FEEDBACK.sourceInformation).map(([k, v]) => k.replace(/([A-Z])/g, ' $1').toUpperCase() + ': ' + v) },
  { title: 'TESTING FEEDBACK', lines: FEEDBACK.testingFeedback },
  { title: 'ENGINE FEEDBACK', lines: FEEDBACK.engineFeedback },
  { title: 'PROMPT FEEDBACK', lines: FEEDBACK.promptFeedback },
];
const aboutScene = {
  enter() { ABOUT.page = 0; },
  update() {
    const I = GAME.input;
    if (I.pressed('right') || I.pressed('confirm')) ABOUT.page = (ABOUT.page + 1) % ABOUT_PAGES().length;
    if (I.pressed('left')) ABOUT.page = (ABOUT.page + ABOUT_PAGES().length - 1) % ABOUT_PAGES().length;
    if (I.pressed('cancel')) GAME.go('menu', { from: 'about' });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, P = ABOUT_PAGES()[ABOUT.page];
      paintSky(g, W, H, HUNTS[0]);
      E.px.rect(g, 0, H * HORIZON, W, H, '#2a2010');
      E.ui.box(g, W * .04, H * .06, W * .92, H * .88, { bg: ['#1a1024', '#0e0818'], alpha: .95 });
      E.font.title(g, P.title, W / 2, H * .09, { scale: Math.max(1, Math.round(H / 200)), colors: ['#fff1b8', '#d88a30'], align: 'center' });
      const lh = Math.max(12, Math.round(H * .045));
      let y = H * .2;
      for (const line of P.lines) {
        for (const ln of E.font.wrap(line, W * .86, {})) { E.font.text(g, ln, W * .07, y, '#e8e0f8', { outline: '#000' }); y += lh; }
        y += lh * .3;
      }
      E.font.text(g, 'PAGE ' + (ABOUT.page + 1) + '/' + ABOUT_PAGES().length + '    ' + GAME.input.label('left') + '/' + GAME.input.label('right') + ' TURN PAGE    ' + GAME.input.label('cancel') + ' BACK', W / 2, H * .9, '#c8c0e0', { align: 'center', outline: '#000' });
    });
  },
};

// ---- dev mode: sliders for the key numbers, the standard tools, and Reset ----------------------------------------------
const DEVROW = { sel: 0, from: 'menu' };
function devRows() {
  const rows = TUNING_SPEC.map(s => ({ kind: 'slider', s }));
  rows.push({ kind: 'toggle', label: 'Infinite shells (cheat)', get: () => DEV.infiniteShells, set: v => { DEV.infiniteShells = v; } });
  rows.push({ kind: 'button', label: 'Skip this segment', run: () => devSkip() });
  rows.push({ kind: 'button', label: 'Spawn a buck in front of you', run: () => devSpawn() });
  rows.push({ kind: 'button', label: 'Reset every slider to its default', run: () => { resetTuning(); } });
  rows.push({ kind: 'button', label: 'Open the Animal Lab', run: () => GAME.go('animallab', { from: 'dev' }) });
  rows.push({ kind: 'button', label: 'Open the Sound Lab', run: () => GAME.go('soundlab', { from: 'dev' }) });
  rows.push({ kind: 'button', label: 'Back', run: () => devBack() });
  return rows;
}
function devSkip() {
  if (HUNT_RUN.phase === 'play') { endSegPlay(); HUNT_RUN.clock = HUNT_RUN.plan[HUNT_RUN.seg].seconds === Infinity ? 0 : HUNT_RUN.clock; }
}
function devSpawn() {
  if (HUNT_RUN.phase !== 'play') return;
  const hunt = HUNT_RUN.hunt, k = pickFrom(Object.keys(hunt.species).filter(k => SPECIES[k].sex === 'buck' || SPECIES[k].sex === 'doe'), RNG.fx);
  spawnAnimal(k, { d: .6, x: .5, dir: 1, speed: 1 });
}
function devBack() { GAME.go(DEVROW.from === 'hunt' ? 'hunt' : 'menu', { resume: true, from: 'dev' }); }
const devScene = {
  enter(data) { DEVROW.from = data && data.from === 'hunt' ? 'hunt' : 'menu'; DEVROW.sel = 0; },
  update() {
    const I = GAME.input, rows = devRows();
    DEVROW.sel = clampN(DEVROW.sel, 0, rows.length - 1);
    if (I.pressed('down') || I.repeat && I.repeat('down', .4, .1)) DEVROW.sel = Math.min(rows.length - 1, DEVROW.sel + 1);
    if (I.pressed('up') || I.repeat && I.repeat('up', .4, .1)) DEVROW.sel = Math.max(0, DEVROW.sel - 1);
    const row = rows[DEVROW.sel];
    if (row.kind === 'slider') {
      const dir = I.pressed('right') || (I.repeat && I.repeat('right', .4, .08)) ? 1 : I.pressed('left') || (I.repeat && I.repeat('left', .4, .08)) ? -1 : 0;
      if (dir) {
        const s = row.s, v = clampN(TUNING[s.key] + dir * s.step, s.min, s.max);
        TUNING[s.key] = Math.round(v / s.step) * s.step;
        if (s.choices) TUNING[s.key] = clampN(TUNING[s.key], 0, 1);
      }
    } else if (row.kind === 'toggle') {
      if (I.pressed('confirm') || I.pressed('left') || I.pressed('right')) row.set(!row.get());
    } else if (I.pressed('confirm')) row.run();
    if (I.pressed('cancel')) devBack();
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, rows = devRows();
      paintLand(g, W, H, HUNTS[0], titleWorld(), r.game.time);
      E.ui.box(g, W * .08, H * .05, W * .84, H * .9, { bg: ['#120c20', '#080510'], alpha: .96 });
      E.font.title(g, 'DEV MODE', W / 2, H * .08, { scale: Math.max(1, Math.round(H / 220)), colors: ['#ffe27a', '#d88a30'], align: 'center' });
      const top = H * .17, rh = Math.max(12, Math.round(H * .045));
      rows.forEach((row, i) => {
        const y = top + i * rh, sel = i === DEVROW.sel, col = sel ? '#ffe27a' : '#cfc8e8';
        if (sel) E.ui.box(g, W * .1, y - 4, W * .8, rh, { bg: '#3a2a10', gradient: false, alpha: .8 });
        if (row.kind === 'slider') {
          const s = row.s, v = TUNING[s.key];
          E.font.text(g, s.label, W * .12, y, col, { outline: '#000' });
          const frac = (v - s.min) / (s.max - s.min);
          if (!s.choices) E.ui.bar(g, W * .5, y + 2, W * .3, Math.max(4, rh * .4), clampN(frac, 0, 1), '#d88a30');
          const shown = s.choices ? s.choices[v] : (s.unit === 'x' ? v.toFixed(1) + 'x' : s.unit === 's' ? v + 's' : String(Math.round(v * 100) / 100));
          E.font.text(g, shown, W * .83, y, '#ffffff', { align: 'right', outline: '#000' });
        } else if (row.kind === 'toggle') {
          E.font.text(g, row.label, W * .12, y, col, { outline: '#000' });
          E.font.text(g, row.get() ? 'ON' : 'OFF', W * .83, y, row.get() ? '#7af07a' : '#ff8a6a', { align: 'right', outline: '#000' });
        } else {
          E.font.text(g, row.label, W * .12, y, col, { outline: '#000' });
        }
      });
      E.font.text(g, 'LEFT/RIGHT CHANGE   ' + GAME.input.label('confirm') + ' PRESS   ' + GAME.input.label('cancel') + ' BACK', W / 2, H * .9, '#c8c0e0', { align: 'center', outline: '#000' });
    });
  },
};
