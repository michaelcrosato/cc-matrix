/* Front-end screens: title, main menu, class select, how to play, high scores, about, game over, ending, touch notice, attract. */
const GD_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7', 'Pad0'], magic: ['Mouse2', 'KeyQ', 'KeyK', 'Pad3', 'Pad5'], plant: ['ShiftLeft', 'ShiftRight', 'Pad6'],
  view: ['KeyV'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1']
};
const EXIT = typeof __EXIT__ !== 'undefined' ? __EXIT__ : null;

// ---------- shared helpers ----------
let idle = 0, lastPtr = null;
function activity() {
  const I = game.input; let act = I.anyPressed();
  const m = I.move(); if (Math.hypot(m[0], m[1]) > .3) act = true;
  const pa = I.padAim; if (pa && Math.hypot(pa[0], pa[1]) > .3) act = true;
  const p = I.pointer && I.pointer(); if (p) { if (lastPtr && Math.hypot(p[0] - lastPtr[0], p[1] - lastPtr[1]) > 4) act = true; lastPtr = p.slice(); }
  for (const q of game.players) if (q !== I && q.anyPressed()) act = true;
  return act;
}
function frontIdle(dt, from) { if (activity()) idle = 0; else idle += dt; if (idle >= 10 && !game.paused) { idle = 0; game.go('attract', { from }); return true; } return false; }
const isTouchOnly = () => { try { return ('ontouchstart' in window || navigator.maxTouchPoints > 0) && !matchMedia('(pointer: fine)').matches && !(navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(Boolean)); } catch (e) { return false; } };
const hit = (p, x, y, w, h) => p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h;
const blink = (spd = 2) => Math.floor(game.real * spd) % 2 === 0;

function titleBack(r, t) {
  r.sky(['#06040c', '#140c20', '#2a1228']);
  r.overlay(g => {
    const Wd = r.W, Hd = r.H, cx = Wd / 2;
    // the endless shaft: brick walls with torches, stairs spiralling down
    for (let i = 0; i < 12; i++) { const y = ((i * 22 + t * 30) % (Hd + 22)) - 10, wd = 70 + i * 3; px.rect(g, cx - wd - 60, y, 40, 14, i % 2 ? '#1c1424' : '#241830'); px.rect(g, cx + wd + 20, y, 40, 14, i % 2 ? '#241830' : '#1c1424'); }
    for (let k = 0; k < 4; k++) { const y = ((k * 70 + t * 40) % (Hd + 70)) - 20, x = k % 2 ? cx - 118 : cx + 110; r.glowDisc(g, x, y, 22, '#ff8030', .5); px.rect(g, x - 1, y, 3, 8, '#6a3a18'); px.disc(g, x, y - 2, 3, '#ffb040'); }
    // a gauntlet tumbling down
    const gy = ((t * 28) % (Hd + 60)) - 30, gx = cx + Math.sin(t * .8) * 40, rot = t * 1.1;
    const R = (x, y) => [Math.round(gx + x * Math.cos(rot) - y * Math.sin(rot)), Math.round(gy + x * Math.sin(rot) + y * Math.cos(rot))];
    px.poly(g, [R(-9, -4), R(9, -4), R(11, 8), R(-11, 8)].map(a => a), '#8a8a9a'); px.poly(g, [R(-9, -4), R(9, -4), R(8, 0), R(-8, 0)], '#c8c8d8');
    for (let i = -2; i <= 2; i++) px.poly(g, [R(i * 4 - 1.5, -4), R(i * 4 + 1.5, -4), R(i * 4 + 1, -13), R(i * 4 - 1, -13)], '#a0a0b0');
    px.poly(g, [R(-6, 8), R(6, 8), R(5, 15), R(-5, 15)], '#6a6a7a');
  });
}

// ---------- the title ----------
const SCENE_TITLE = {
  enter() { idle = 0; lastPtr = null; game.allowJoin(false); music('title'); RUN.active = false; },
  update(dt) {
    if (frontIdle(dt, 'title')) return;
    if (isTouchOnly()) return;
    if (game.input.pressed('start') || game.input.pressed('confirm') || game.input.clicked()) { game.audio.sfx('menu'); game.go('menu'); }
  },
  draw(r) {
    const t = game.real; titleBack(r, t);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.title(g, 'GAUNTLET', cx, 22, { scale: 3, colors: ['#fff6d0', '#e8b030', '#a05010', '#5a2808'], outline: '#000', depth: 3, depthColor: '#2a1004', align: 'center' });
      E.font.title(g, 'DOWN', cx, 56, { scale: 3, colors: ['#d8e4ff', '#7a90d0', '#3a4a90', '#1a2050'], outline: '#000', depth: 3, depthColor: '#0a1030', align: 'center' });
      E.font.text(g, 'a co-op dungeon crawl for 1-4 hungry fools', cx, 92, '#c8b8e0', { align: 'center', shadow: '#000' });
      CLASSES.forEach((c, i) => { const x = cx - 150 + i * 80; if (!c._r) c._r = c.rig(); c._r.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); c._r.drawPortrait(g, x, r.H - 78, 56, { zoom: 3, turn: .5 + Math.sin(t + i) * .1, bg: '#1a1228', frame: true }); E.font.text(g, c.name, x + 28, r.H - 18, c.color, { align: 'center', font: 'tiny' }); });
      if (isTouchOnly()) { E.font.text(g, 'Controller or keyboard required', cx, 108, '#ffd860', { align: 'center', scale: 2, shadow: '#000' }); }
      else E.font.text(g, 'PRESS ' + glyph('confirm').toUpperCase(), cx, 108, blink() ? '#ffe9b8' : '#8a7860', { align: 'center', scale: 2, shadow: '#000' });
      E.font.text(g, E.versionLabel ? E.versionLabel() : 'my-3D2dge', 6, r.H - 8, '#605878', { font: 'tiny' });
    });
  }
};

// ---------- the main menu ----------
let mainMenu = null;
const SCENE_MENU = {
  enter() {
    idle = 0; game.allowJoin(false);
    const d2 = !!E.store.get('gauntletdown-d2', false), items = [];
    if (d2) items.push({ label: 'CONTINUE TO DESCENT II', id: 'd2' });
    items.push({ label: 'START DESCENT', id: 'start' }, { label: 'HOW TO PLAY', id: 'how' }, { label: 'HIGH SCORES', id: 'scores' }, { label: 'SETTINGS', id: 'set' }, { label: 'ABOUT & CREDITS', id: 'about' });
    mainMenu = new E.Menu(game, items, { x: 'center', y: 118, box: true, onPick: (i, it) => this.pick(it.id), onCancel: () => game.go('title') });
  },
  pick(id) {
    game.audio.sfx('menu');
    if (id === 'start' || id === 'd2') { RUN.descent2 = id === 'd2'; game.go('select'); }
    else if (id === 'how') game.go('howto', { back: 'menu' });
    else if (id === 'scores') game.go('scores', { back: 'menu' });
    else if (id === 'set') game.menu('settings');
    else if (id === 'about') game.go('about');
  },
  update(dt) { if (frontIdle(dt, 'menu')) return; mainMenu.update(dt); },
  draw(r) { titleBack(r, game.real); r.overlay(g => { E.font.title(g, TITLE, r.W / 2, 22, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' }); }); mainMenu.draw(r); r.overlay(g => E.font.text(g, glyph('cancel') + ': back', 6, r.H - 10, '#7a7090', { font: 'tiny' })); }
};

// ---------- class select ----------
let sel = null;
const SCENE_SELECT = {
  enter() {
    idle = 0;
    sel = { slots: [], t: 0, starting: 0 };
    game.allowJoin({ max: 4, onJoin: (inp, n) => { addSlot(inp); } });
    for (const p of game.players) addSlot(p);
  },
  update(dt) {
    sel.t += dt;
    if (frontIdle(dt, 'select')) return;
    const P = game.input.pointer();
    for (const s of sel.slots) {
      const I = s.input;
      if (!s.locked) {
        if (I.repeat('left', .25, .12)) { s.idx = (s.idx + 3) % 4; skipTaken(s, -1); game.audio.sfx('menu'); }
        if (I.repeat('right', .25, .12)) { s.idx = (s.idx + 1) % 4; skipTaken(s, 1); game.audio.sfx('menu'); }
        if (I.pressed('confirm') || I.pressed('fire')) lockSlot(s);
        if (I === game.input && P && game.input.mouse.active) { const i = cardAt(P); if (i >= 0 && i !== s.idx && !takenBy(i, s)) s.idx = i; }
        if (I === game.input) { const c = game.input.clicked(); if (c) { const i = cardAt(c); if (i >= 0 && !takenBy(i, s)) { s.idx = i; lockSlot(s); } } }
      } else if (I.pressed('cancel')) { s.locked = false; game.audio.sfx('back'); }
    }
    if (game.input.pressed('cancel') && sel.slots.every(s => !s.locked)) { if (sel.slots.length > 1) { removeLastSlot(); } else { game.go('menu'); } return; }
    const ready = sel.slots.length && sel.slots.every(s => s.locked);
    if (ready && (sel.slots.some(s => s.input.pressed('start')) || sel.slots.some(s => s.input.pressed('confirm') && s.lockedFor > .4))) startRun();
    for (const s of sel.slots) if (s.locked) s.lockedFor = (s.lockedFor || 0) + dt;
    for (const c of CLASSES) if (c._r) c._r.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 });
  },
  draw(r) {
    titleBack(r, game.real * .5);
    r.overlay(g => {
      const cx = r.W / 2; E.font.title(g, 'CHOOSE YOUR FOOL', cx, 8, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      const L = cardLayout(r);
      CLASSES.forEach((c, i) => {
        const [x, y, w, h] = L[i], owners = sel.slots.filter(s => s.idx === i), taken = sel.slots.find(s => s.locked && s.idx === i);
        const focus = owners.length > 0;
        E.ui.box(g, x, y, w, h, { bg: focus ? ['#2a2040', '#14101e'] : ['#1a1428', '#0c0a14'], border: taken ? taken.color : focus ? owners[0].color : '#3a3050' });
        if (!c._r) c._r = c.rig();
        c._r.drawPortrait(g, x + w / 2 - 24, y + 4, 48, { zoom: 3.2, turn: .5 + Math.sin(game.real * (focus ? 1.5 : .4) + i) * .35, bg: '#0e0a18', frame: false, cape: true });
        E.font.text(g, c.name, x + w / 2, y + 54, c.color, { align: 'center', outline: '#000' });
        E.font.text(g, c.who, x + w / 2, y + 63, '#a098b8', { align: 'center', font: 'tiny' });
        STAT_NAMES.forEach((sn, k) => { const yy = y + 72 + k * 9; E.font.text(g, sn, x + 4, yy, '#8a82a0', { font: 'tiny' }); for (let p = 0; p < 5; p++) px.rect(g, x + w - 5 * 7 - 3 + p * 7, yy, 5, 4, p < c.pips[k] ? c.color : '#2a2438'); });
        E.font.text(g, E.font.wrap(c.quip, w - 6, { font: 'tiny' }).join('\n'), x + w / 2, y + h - 28, '#c8b8e0', { align: 'center', font: 'tiny' });
        if (taken) E.font.text(g, taken.name + ' READY', x + w / 2, y + h - 6, taken.color, { align: 'center', font: 'tiny' });
        owners.forEach((s, k) => { if (!s.locked) { px.poly(g, [[x + 4 + k * 12, y + 2], [x + 14 + k * 12, y + 2], [x + 9 + k * 12, y + 9]], s.color); E.font.text(g, s.name, x + 4 + k * 12, y + 11, s.color, { font: 'tiny' }); } });
      });
      const ready = sel.slots.length && sel.slots.every(s => s.locked);
      const pad = game.input.lastDevice === 'gamepad';
      E.font.text(g, ready ? 'PRESS ' + glyph('start') + ' TO START THE DESCENT' : sel.slots.map(s => s.name + ': ' + (s.locked ? 'LOCKED' : glyph('confirm') + ' to lock')).join('   '), cx, r.H - 26, ready && blink() ? '#ffd860' : '#e8d8b0', { align: 'center', shadow: '#000' });
      if (sel.slots.length < 4) E.font.text(g, (pad ? glyph('start') : '2') + ' on another controller or keyboard half to JOIN', cx, r.H - 14, '#a098b8', { align: 'center', font: 'tiny' });
    });
  }
};
function cardLayout(r) { const n = 4, gap = 4, w = Math.floor((r.W - 20 - gap * 3) / 4), x0 = Math.floor((r.W - (w * 4 + gap * 3)) / 2); return CLASSES.map((c, i) => [x0 + i * (w + gap), 28, w, r.H - 28 - 38]); }
function cardAt(p) { const L = cardLayout(game.r); for (let i = 0; i < 4; i++) if (hit(p, ...L[i])) return i; return -1; }
function takenBy(i, me) { return sel.slots.some(s => s !== me && s.locked && s.idx === i); }
function skipTaken(s, dir) { for (let k = 0; k < 4 && takenBy(s.idx, s); k++) s.idx = (s.idx + dir + 4) % 4; }
function addSlot(inp) {
  if (sel.slots.some(s => s.input === inp)) return;
  const s = { input: inp, idx: 0, locked: false, color: E.PLAYER_COLORS[inp.player - 1], name: 'P' + inp.player };
  s.idx = [0, 1, 2, 3].find(i => !takenBy(i, s) && !sel.slots.some(o => o.idx === i)) || 0; sel.slots.push(s);
}
function removeLastSlot() { const s = sel.slots.pop(); if (s && s.input !== game.input) game.removePlayer(s.input); }
function lockSlot(s) { if (takenBy(s.idx, s)) return; s.locked = true; s.lockedFor = 0; game.audio.sfx('pickup'); Voice.hero({ cls: s.idx }, 'ready'); }
function startRun() {
  RUN.heroes = sel.slots.map((s, i) => { const h = makeHero(i, s.idx, s.input); h.name2 = null; return h; });
  RUN.step = 0; RUN.seed = Math.floor(Math.random() * 1e9); RUN.continues = 0; RUN.time = 0; RUN.mode = 'solo'; RUN.active = true; RUN.attract = false; RUN.tipsSeen = {}; RUN.diff = OPT.difficulty;
  game.go('play', { step: 0, fresh: true });
}

// ---------- how to play ----------
const HOWTO = [
  ['SHOOT AND SWING', 'Hold {fire} to shoot where you aim. Up close, you swing instead. {magic} breaks a Blast Flask: everything on screen takes it. Hold {plant} to stand still and turn.', ['axe', 'flask']],
  ['FOOD IS LIFE', 'Your life force drains every second. Roasts, loaves and cider put it back. Do not shoot the food: the Gaunt will say your name.', ['roast', 'loaf', 'cider']],
  ['GENERATORS', 'Urns, dens and hutches breed monsters forever. Destroy the generator and the horde stops. Hungerghosts cannot be struck, only shot.', ['skull']],
  ['KEYS AND DOORS', 'A key opens a whole run of doors. Walk into the bars. Snatchers steal keys and flasks: kill them to get it back.', ['key']],
  ['TREASURE AND SCORE', 'Gold, gems, chests and crowns are score. Each fool has their own tally. Whoever takes the stairs gets the bonus.', ['gold', 'gem', 'crown']],
  ['TRAPS AND TRICKS', 'Plates drop walls. Runes stun. Force fields hurt monsters too. Cracked walls break. Some walls are lies. Pads whisk you away.', ['amulet']],
  ['THE TITHE AND THE BELL', 'The Tithe drains 200 life and only magic ends it. Ring the Dinner Bell and every monster wants you for dinner.', ['bell']],
  ['TOGETHER', 'Up to four play on one screen. Fallen fools rise again with Fire. From floor six, shots stun friends. Stand on the stairs to descend together.', ['heart']]
];
let howPage = 0, howBack = 'menu';
const SCENE_HOWTO = {
  enter(d) { howPage = 0; howBack = d && d.back || 'menu'; idle = 0; },
  update(dt) {
    if (howBack === 'menu' && frontIdle(dt, 'howto')) return;
    const I = game.input;
    if (I.repeat('right', .3, .15) || I.pressed('confirm')) { howPage = Math.min(HOWTO.length - 1, howPage + 1); game.audio.sfx('menu'); if (I.pressed('confirm') && howPage === HOWTO.length - 1 && false) game.go(howBack); }
    if (I.repeat('left', .3, .15)) { howPage = Math.max(0, howPage - 1); game.audio.sfx('menu'); }
    const c = I.clicked(); if (c) { if (c[0] > game.r.W / 2) howPage = Math.min(HOWTO.length - 1, howPage + 1); else howPage = Math.max(0, howPage - 1); }
    if (I.pressed('cancel')) game.go(howBack);
  },
  draw(r) { titleBack(r, game.real * .4); r.overlay(g => drawHowPage(g, r, howPage)); }
};
function drawHowPage(g, r, howPage) {
    {
      const p = HOWTO[howPage], cx = r.W / 2;
      E.ui.box(g, 20, 14, r.W - 40, r.H - 28, { bg: ['#1c1630', '#0e0a1a'], border: '#6a5a90' });
      E.font.title(g, p[0], cx, 24, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      const txt = p[1].replace(/\{(\w+)\}/g, (m, a) => '[' + glyph(a) + ']');
      E.font.wrap(txt, r.W - 90, { scale: 1 }).forEach((ln, i) => E.font.text(g, ln, cx, 58 + i * 11, '#e8e0f8', { align: 'center', shadow: '#000' }));
      p[2].forEach((n, i) => { const x = cx - (p[2].length - 1) * 22 + i * 44; if (SPR[n]) px.sprite(g, SPR[n], x - 8, 130 + Math.sin(game.real * 3 + i) * 2); else if (n === 'axe') { px.line(g, x - 6, 140, x + 6, 132, '#8a6a3a', 2); px.rect(g, x + 2, 128, 8, 6, '#d8dce8'); } });
      if (howPage === 0) { const c = CLASSES[0]; if (!c._r) c._r = c.rig(); c._r.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); c._r.drawPortrait(g, 40, 120, 48, { zoom: 3, turn: .5, bg: '#14101e', frame: true }); }
      for (let i = 0; i < HOWTO.length; i++) px.rect(g, cx - HOWTO.length * 6 + i * 12, r.H - 44, 8, 4, i === howPage ? '#ffd860' : '#3a3050');
      E.font.text(g, '< >  page   ' + glyph('cancel') + ': back', cx, r.H - 32, '#a098b8', { align: 'center', font: 'tiny' });
    }
}

// ---------- high scores ----------
let MEM_SCORES = null;
const getScores = () => { const v = E.store.get('gauntletdown-scores', null); return v || MEM_SCORES || []; };
const qualifies = sc => sc > 0 && (getScores().length < 10 || sc > getScores()[getScores().length - 1].score);
function addScore(e) { const t = getScores().concat([e]).sort((a, b) => b.score - a.score).slice(0, 10); MEM_SCORES = t; E.store.set('gauntletdown-scores', t); return t.indexOf(e); }
let scoreBack = 'menu', scoreHi = -1;
function drawScores(g, r, hi) {
  const cx = r.W / 2, t = getScores();
  E.ui.box(g, 30, 12, r.W - 60, r.H - 24, { bg: ['#1c1630', '#0e0a1a'], border: '#6a5a90' });
  E.font.title(g, 'HIGH SCORES', cx, 20, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
  if (!t.length) E.font.text(g, 'NO SCORES YET. THE GAUNT IS PATIENT.', cx, 90, '#a098b8', { align: 'center' });
  t.forEach((s, i) => { const y = 46 + i * 15, col = i === hi ? (blink(4) ? '#ffffff' : '#ffd860') : i < 3 ? '#ffd860' : '#d8d0f0'; E.font.text(g, String(i + 1).padStart(2, ' ') + '.', 50, y, col); E.font.text(g, s.initials, 76, y, CLASSES[s.cls] ? CLASSES[s.cls].color : col); E.font.text(g, String(s.score), 150, y, col); E.font.text(g, 'FLOOR ' + s.floor, 230, y, '#a098b8', { font: 'tiny' }); if (s.conts) E.font.text(g, s.conts + ' cont', 280, y, '#a098b8', { font: 'tiny' }); });
}
const SCENE_SCORES = {
  enter(d) { scoreBack = d && d.back || 'menu'; scoreHi = d && d.hi !== undefined ? d.hi : -1; idle = 0; },
  update(dt) { if (scoreBack === 'menu' && frontIdle(dt, 'scores')) return; if (game.input.pressed('cancel') || game.input.pressed('confirm') || game.input.clicked()) game.go(scoreBack); },
  draw(r) { titleBack(r, game.real * .4); r.overlay(g => { drawScores(g, r, scoreHi); E.font.text(g, glyph('cancel') + ': back', r.W / 2, r.H - 22, '#a098b8', { align: 'center', font: 'tiny' }); }); }
};

// ---------- about and credits ----------
function aboutPages() {
  const X = EXIT || {}, S = X.sourceInformation || {}, pages = [];
  pages.push(['ABOUT GAUNTLETDOWN', ['An original co-op dungeon crawler for 1-4 players, inspired by the arcade classic Gauntlet.', 'Built on the my-3D2dge engine (' + (E.version || '?') + '): characters are 3D skeletons drawn as pixel art. All art, music, sound and voices are made in code.', 'Four original fools, six generators, eleven floors and a king who is very, very hungry.', 'Online: AI Hub sessions (shared world, 1-4 players). Offline: solo or couch co-op.']]);
  pages.push(['SOURCE INFORMATION', Object.keys(S).map(k => k.toUpperCase() + ': ' + S[k])]);
  const sec = (title, arr, qs) => pages.push([title, (arr || []).map((a, i) => (qs && qs[i] ? qs[i] + ' ' : '') + a)]);
  sec('TESTING FEEDBACK', X.testingFeedback, ['Issues caught?', 'Game breaking?', 'Most helpful test?', 'Least helpful test?']);
  sec('ENGINE FEEDBACK', X.engineFeedback, ['Liked most?', 'Stuck or guessed wrong?', 'Had to build?', 'Hardest part?', 'Changed?', 'Change one thing?']);
  sec('PROMPT FEEDBACK', X.promptFeedback, ['Liked most?', 'Confusing?', 'Hardest thing?', 'Would change?']);
  pages.push(['CREDITS', ['Design, code, art, music and voices: Claude (claude-sonnet-5-5), following a plan by claude-opus-5-5.', 'Engine: my-3D2dge. Online: AI Hub Session Protocol v1.', 'Not affiliated with any Gauntlet game: every hero, monster, floor, tune and line here is original.', 'Thank you for playing. Remember: eat something.']]);
  return pages;
}
let aboutP = 0, aboutPages_ = null, aboutScroll = 0;
const SCENE_ABOUT = {
  enter() { aboutP = 0; aboutPages_ = aboutPages(); aboutScroll = 0; idle = 0; },
  update(dt) {
    if (frontIdle(dt, 'about')) return;
    const I = game.input;
    if (I.repeat('right', .3, .15)) { aboutP = Math.min(aboutPages_.length - 1, aboutP + 1); aboutScroll = 0; game.audio.sfx('menu'); }
    if (I.repeat('left', .3, .15)) { aboutP = Math.max(0, aboutP - 1); aboutScroll = 0; game.audio.sfx('menu'); }
    if (I.repeat('down', .2, .05)) aboutScroll += 6; if (I.repeat('up', .2, .05)) aboutScroll = Math.max(0, aboutScroll - 6);
    const c = I.clicked(); if (c) aboutP = c[0] > game.r.W / 2 ? Math.min(aboutPages_.length - 1, aboutP + 1) : Math.max(0, aboutP - 1);
    if (I.pressed('cancel')) game.go('menu');
  },
  draw(r) {
    titleBack(r, game.real * .4);
    r.overlay(g => {
      const p = aboutPages_[aboutP], cx = r.W / 2;
      E.ui.box(g, 14, 10, r.W - 28, r.H - 20, { bg: ['#1c1630', '#0e0a1a'], border: '#6a5a90' });
      E.font.title(g, p[0], cx, 16, { scale: 1, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      let y = 36 - aboutScroll;
      for (const para of p[1]) for (const [i, ln] of E.font.wrap(String(para), r.W - 56, { scale: 1 }).entries()) { if (y > 28 && y < r.H - 36) E.font.text(g, ln, 24, y, i ? '#d0c8e8' : '#f0e8ff'); y += 9; if (i === E.font.wrap(String(para), r.W - 56, { scale: 1 }).length - 1) y += 4; }
      aboutMax = Math.max(0, y + aboutScroll - (r.H - 40));
      aboutScroll = Math.min(aboutScroll, Math.max(0, aboutMax));
      E.font.text(g, '< >  page ' + (aboutP + 1) + '/' + aboutPages_.length + '    up/down: scroll    ' + glyph('cancel') + ': back', cx, r.H - 22, '#a098b8', { align: 'center', font: 'tiny' });
    });
  }
};
let aboutMax = 0;

// ---------- game over (and initials) ----------
let ov = null;
const SCENE_OVER = {
  enter(d) {
    music('title'); idle = 0; game.allowJoin(false);
    ov = { queue: RUN.heroes.filter(h => qualifies(h.score)).map(h => ({ h, letters: [0, 0, 0], pos: 0, done: false })), t: 0, hi: -1, win: !!(d && d.win) };
    ov.cur = ov.queue.shift() || null;
    if (ov.cur) say_over('score');
  },
  update(dt) {
    ov.t += dt;
    if (ov.cur) {
      const c = ov.cur, I = c.h.input || game.input;
      if (I.repeat('up', .3, .1)) { c.letters[c.pos] = (c.letters[c.pos] + 1) % 27; game.audio.sfx('tick'); }
      if (I.repeat('down', .3, .1)) { c.letters[c.pos] = (c.letters[c.pos] + 26) % 27; game.audio.sfx('tick'); }
      if (I.pressed('right') && c.pos < 2) { c.pos++; game.audio.sfx('menu'); }
      if (I.pressed('left') && c.pos > 0) { c.pos--; game.audio.sfx('back'); }
      if (I.pressed('confirm') || I.pressed('fire')) { if (c.pos < 2) { c.pos++; game.audio.sfx('menu'); } else { const ini = c.letters.map(l => l === 26 ? ' ' : String.fromCharCode(65 + l)).join(''); ov.hi = addScore({ initials: ini, score: c.h.score, cls: c.h.cls, floor: Math.max(1, (PLAN[RUN.step] && PLAN[RUN.step].no) || RUN.maxFloor || 1), conts: c.h.contUsed || 0 }); game.audio.sfx('power'); ov.cur = ov.queue.shift() || null; } }
    } else if (ov.t > 1.5 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked() || ov.t > 25)) game.go('scores', { back: 'title', hi: ov.hi });
  },
  draw(r) {
    titleBack(r, game.real * .3);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.title(g, ov.win ? 'THE KING IS DINED UPON' : 'GAME OVER', cx, 20, { scale: 2, colors: ov.win ? ['#fff6d0', '#e8b030', '#a05010'] : ['#ffb0a0', '#e04030', '#601010'], outline: '#000', align: 'center' });
      E.font.text(g, ov.win ? 'THE DUNGEON IS QUIET. YOU ARE FULL.' : 'THE GAUNT IS FED.', cx, 52, '#e8d8b0', { align: 'center', shadow: '#000' });
      RUN.heroes.forEach((h, i) => { const x = cx - (RUN.heroes.length - 1) * 50 + i * 100; E.font.text(g, h.C.name, x, 70, h.C.color, { align: 'center', font: 'tiny' }); E.font.text(g, String(h.score), x, 80, '#fff', { align: 'center', scale: 2 }); E.font.text(g, h.kills + ' kills', x, 98, '#b0a8c8', { align: 'center', font: 'tiny' }); });
      if (ov.cur) {
        const c = ov.cur; E.font.text(g, c.h.C.name + ': NEW HIGH SCORE', cx, 122, c.h.C.color, { align: 'center' });
        for (let i = 0; i < 3; i++) { const ch = c.letters[i] === 26 ? '_' : String.fromCharCode(65 + c.letters[i]); E.font.text(g, ch, cx - 30 + i * 30, 138, i === c.pos ? (blink(6) ? '#fff' : '#ffd860') : '#c0b8d8', { scale: 3, outline: '#000' }); if (i === c.pos) { px.poly(g, [[cx - 26 + i * 30, 134], [cx - 18 + i * 30, 134], [cx - 22 + i * 30, 129]], '#ffd860'); px.poly(g, [[cx - 26 + i * 30, 164], [cx - 18 + i * 30, 164], [cx - 22 + i * 30, 169]], '#ffd860'); } }
        E.font.text(g, 'up/down: letter   ' + glyph('confirm') + ': next', cx, 180, '#a098b8', { align: 'center', font: 'tiny' });
      } else E.font.text(g, 'PRESS ' + glyph('confirm').toUpperCase(), cx, r.H - 40, blink() ? '#ffe9b8' : '#8a7860', { align: 'center', scale: 2 });
    });
  }
};
function say_over(k) { if (LINES[k]) Voice.gaunt(LINES[k]); }

// ---------- the ending ----------
let endT = 0;
const END_LINES = ['KING FAMISH IS NO MORE.', 'THE TABLE IS CLEARED. THE DUNGEON, EMPTY.', 'THE GAUNT SIGHS. IT WAS ONLY EVER LONELY.', 'BUT DESCENT II IS ALREADY SERVING.'];
const SCENE_ENDING = {
  enter() { music('victory'); endT = 0; RUN.won = true; E.store.set('gauntletdown-d2', true); Voice.gaunt('KING FAMISH IS NO MORE'); },
  update(dt) { endT += dt; if (endT > 3 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked())) { if (endT < 22) endT = Math.max(endT, 22); else game.go('over', { win: true }); } if (endT > 40) game.go('over', { win: true }); },
  draw(r) {
    r.sky(['#0a0614', '#201030', '#402050']);
    r.overlay(g => {
      const cx = r.W / 2;
      for (let i = 0; i < 60; i++) { const x = (E.hash2(i, 1) * r.W), y = ((E.hash2(i, 2) * r.H + endT * (4 + E.hash2(i, 3) * 10)) % r.H); px.dot(g, Math.floor(x), Math.floor(y), i % 3 ? '#a090c8' : '#ffe9b8'); }
      E.font.title(g, 'THE DESCENT IS DONE', cx, 16, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      END_LINES.forEach((l, i) => { if (endT > 1.2 + i * 2.2) E.font.text(g, l, cx, 56 + i * 16, '#ffe9b8', { align: 'center', shadow: '#000' }); });
      if (endT > 11) {
        const y0 = r.H - (endT - 11) * 16;
        const rows = ['CREDITS', '', 'DESIGN AND CODE', 'Claude (claude-sonnet-5-5)', '', 'PLAN', 'claude-opus-5-5', '', 'ENGINE', 'my-3D2dge', '', 'ONLINE', 'AI Hub Session Protocol v1', '', 'HEROES'].concat(CLASSES.map(c => c.who + ' (' + c.name + ')'), ['', 'YOUR SCORES'], RUN.heroes.map(h => h.C.name + '  ' + h.score), ['', 'THANK YOU FOR PLAYING.', 'EAT SOMETHING.']);
        rows.forEach((t, i) => { const y = y0 + i * 12; if (y > 100 && y < r.H) E.font.text(g, t, cx, y, i === 0 || t === t.toUpperCase() && t ? '#ffd860' : '#e8e0f8', { align: 'center' }); });
      }
      E.font.text(g, 'DESCENT II UNLOCKED', cx, r.H - 12, blink(3) ? '#ffd860' : '#a08850', { align: 'center', font: 'tiny' });
    });
  }
};

// ---------- touch-only notice ----------
// (the title shows it; attract still runs because frontIdle is skipped there; see SCENE_TITLE)
