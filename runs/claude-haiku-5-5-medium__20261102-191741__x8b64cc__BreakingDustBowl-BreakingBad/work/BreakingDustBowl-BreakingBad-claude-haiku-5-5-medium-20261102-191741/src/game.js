// BREAKING DUST BOWL: a playful riff on Breaking Bad (2008-2013). A top-down action adventure with a cook sim in the
// middle: a garage lab (three timed cooks), a desert run (dodge Vail's men by their sight cones, pick up three batches,
// deliver them to the RV), then a showdown in a chapel ruin. Built on my-3D2dge v0.85.1 (the ADVENTURE kit's engine).
// Keys: WASD or arrows move; J, X or click swings; Space or Shift dashes; Enter or Space confirms (talk, cook); V changes
// the view; - and = zoom; M mutes; Escape or Start opens the pause menu (Settings: gamepad axis inversion, button symbols).
// Attract mode: 10 seconds on the title, then an AI plays (it cheats: it can't be hurt). Any button ends it.
// AI Hub: opened from the hub, the page skips the title and plays one round of the desert run, parallel mode.
(() => {
'use strict';
const E = My3D2dge, { clamp } = E;
const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active ? window.AIHub : null;
const EXIT = window.EXIT_INTERVIEW || {};

/* ---- progress: what a save holds, and what a round starts from ---- */
let progress = freshProgress();
function freshProgress() { return { scene: 'lab', batches: 0, purity: [], delivered: 0, cash: 0 }; }

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], bg: '#0b0a10',
  menu: { saves: { write: () => ({ data: JSON.parse(JSON.stringify(progress)), place: progress.scene, level: progress.delivered }),
    read: save => { progress = Object.assign(freshProgress(), save.data || {}); } } }
});
const L = game.lights, A = game.audio;
const scenes = {};
let DEMO = false;          // attract mode (or a demo run): an AI plays, the player's buttons end it
let cur = null;            // the active chapter's state: lab, ds (desert) or sh (showdown)
const label = a => game.input.label(a);
// a touch-only screen (no mouse, no keyboard, no pad): it needs a controller or keyboard
const touchOnly = () => typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
let keyUsed = false;   // a real key press (not a tap) since the page opened
const needsPad = () => touchOnly() && !keyUsed && game.input.lastDevice !== 'gamepad';
const prompt = (a, word) => label(a) + ' ' + word;

game.settings.define({ key: 'invertX', label: 'Invert gamepad left/right', type: 'toggle', value: false, group: 'Controls', help: 'Flips the stick left and right, for a pad that reads inverted' });
game.settings.define({ key: 'invertY', label: 'Invert gamepad up/down', type: 'toggle', value: false, group: 'Controls', help: 'Flips the stick up and down' });
game.settings.define({ key: 'glyphs', label: 'Button symbols', type: 'select', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox (A B X Y)']], value: 'playstation', group: 'Controls',
  help: 'The buttons drawn in prompts while a controller is in use', apply(g, v) { g.input.glyphs = v; } });
// the dialogue's voice: a code-made gibberish blip per letter (the engine's sound, no recorded speech)
game.audio.define('gibber', { wave: 'triangle', freq: 300, to: 340, dur: .045, vol: .12, vib: [9, .02] });
game.input.touchEnabled = false;   // no touch controls: a touch-only screen is told a controller or keyboard is needed

addEventListener('keydown', e => {
  keyUsed = true;
  if (e.repeat) return;
  if (e.code === 'KeyV') { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
  else if (e.code === 'KeyM') A.mute();
  else if (e.code === 'Digit0') { game.settings.set('zoom', 1); game.resetCamera(); }
});

/* ---- helpers ---- */
const sfx = (n, o) => A.sfx(n, o);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const live = list => list.filter(f => !f.dead);
// the stick's direction on the ground: a pad's axes are inverted when the player's settings say so (keys and mouse never are)
function moveDir() {
  const I = game.input; let [mx, my] = I.move();
  if (I.lastDevice === 'gamepad') { if (game.settings.invertX) mx = -mx; if (game.settings.invertY) my = -my; }
  return game.view.screenDirToGround(mx, my);
}
// the world point under the mouse (the blade aims at it), or null
function mousePoint() { const p = game.mouseGround(); return p ? { x: p[0], y: p[1] } : null; }
function angDiff(a, b) { return Math.abs(((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI); }
function textPrompt(r, s) { r.text(s, r.W / 2, r.H - 30, '#fff6dc', { align: 'center', shadow: '#000', outline: false }); }
// a dialog in attract mode closes itself; in play it waits for the player
function say(talk, lines, o) { return talk.say(lines, Object.assign({ auto: DEMO ? 1.8 : 0 }, o || {})); }

/* ---- the rig roster ---- */
const RIG = {
  hollis: () => new E.Humanoid({ size: 1.3, outfit: 'shirt', hair: 'short', sleeves: 'long', face: { eyes: 'big', bangs: .3 },
    colors: { skin: '#e8b890', hair: '#b8b0a0', cloth: '#e8dcc0', trim: '#c8b088', pants: '#4a4a58', boot: '#3a2a1a', belt: '#2a1a10', glove: '#8a7a68', eye: '#3a3a4a' } }),
  tomas: () => new E.Humanoid({ size: 1.2, outfit: 'tunic', hair: 'spiky', hat: { style: 'band', color: '#3aa050' }, sleeves: 'short', weapon: null, face: { eyes: 'big', bangs: .6 },
    colors: { skin: '#d8a880', hair: '#2a2018', cloth: '#3a8a4a', trim: '#f0d070', pants: '#3a3a4a', boot: '#2a1a10', belt: '#4a3018', eye: '#2a3a4a' } }),
  grunt: hat => new E.Humanoid({ size: 1.2, outfit: 'coat', hair: 'short', hat: { style: 'band', color: hat }, sleeves: 'long', weapon: null, face: { eyes: 'big', bangs: .3 },
    colors: { skin: '#c89070', hair: '#2a1a10', cloth: '#2a3a5a', coat: '#2a3a5a', trim: hat, pants: '#3a3a48', boot: '#1a1412', belt: '#1a1412', eye: '#2a2a2a' } }),
  vail: () => new E.Humanoid({ size: 2.0, build: 'bulky', outfit: 'coat', hair: 'bald', sleeves: 'long', weapon: null, face: { eyes: 'big' },
    colors: { skin: '#d8a070', cloth: '#1e1e26', coat: '#26262e', trim: '#c8a040', pants: '#2a2a30', boot: '#0a0a0a', belt: '#0a0a0a', eye: '#2a2a3a' } })
};

/* ========================================================================================= *
 *  TITLE: a ledge of heroes under a desert sky. NEW GAME, CONTINUE (a save), ABOUT, OPTIONS.
 * ========================================================================================= */
const MID = 480, stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 },
  types: { 1: { style: 'stone', side: '#8a6a4a', moss: '#6a7a3a' } }, edges: 'open' });
const titleBg = new E.Backdrop('desert');
const TITLE_HEROES = [   // the lineup stands wide of the menu, which sits in the middle
  { face: 0, rig: RIG.hollis(), x: MID - 95 },
  { face: 0, rig: RIG.tomas(), x: MID - 50 },
  { face: Math.PI, rig: RIG.vail(), x: MID + 52 },
  { face: Math.PI, rig: RIG.grunt('#b02a2a'), x: MID + 100 }
];
const corner = () => { const S = game.screen, k = S.dpr / S.S; return [170 * k, 60 * k]; };
let titleMenu = null, idle = 0;
const TITLE_ITEMS = ['NEW GAME', 'CONTINUE', 'ABOUT', 'OPTIONS'];
scenes.title = {
  view: 'side', views: ['side', 'brawler'], input: 'DEFAULT', res: 'ps1',
  enter() {
    A.music('title'); DEMO = false; cur = null; idle = 0; game.weather = null; L.enabled = false;
    game.resetCamera(); game.follow(null); game.cam.room = null; game.cam.bounds = null;
    titleMenu = new E.Menu(game, TITLE_ITEMS.map((t, i) => ({ label: t, disabled: i === 1 && !game.saves.latest() })), {
      box: false, color: '#fff6dc', pick: '#ffd36a', dim: '#7a6e5a',
      onPick: i => titleAction(i)
    });
  },
  update(dt) {
    const I = game.input;
    if (I.anyPressed()) idle = 0; else idle += dt;
    if (idle > 10) { idle = 0; return startDemo(); }
    titleMenu.update(dt);
    game.focus(MID, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    TITLE_HEROES.forEach((h, i) => {
      const u = (game.time * .45 + i * .37) % 3;
      const swing = u < .5 ? { spec: { a0: 1.4, a1: -1.6, z0: 12, z1: 8, reach: 7.5 }, phase: u < .15 ? 'wind' : 'active', u: u < .15 ? u / .15 : (u - .15) / .35 } : null;
      h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: h.face, vx: 0, vy: 0, attack: swing, point: i === 3 && u < .6 });
    });
  },
  draw(r) {
    const [cw, ch] = corner(), top = r.W / 2 + 132 > r.W - cw ? Math.round(ch) : 0;
    titleMenu.y = (r.H * .52 | 0) + top;
    titleBg.draw(r);
    stage.draw(r);
    for (const h of TITLE_HEROES) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'BREAKING', r.W / 2, 14 + top, { align: 'center', scale: 3, colors: ['#fff6d8', '#ffd36a', '#e08a2a'], depth: 3 });
      E.font.title(g, 'DUST BOWL', r.W / 2, 56 + top, { align: 'center', scale: 3, colors: ['#fff6d8', '#ffd36a', '#e08a2a'], depth: 3 });
      E.font.text(g, 'A bad batch in a dry town', r.W / 2, 100 + top, '#f4e6c8', { align: 'center', shadow: '#000', outline: false });
      if (needsPad()) E.font.text(g, 'Controller or keyboard required', r.W / 2, 116 + top, '#ff9a7a', { align: 'center', shadow: '#000', outline: false });
    });
    titleMenu.draw(r);
    const dev = game.input.lastDevice;
    const how = dev === 'gamepad' ? label('confirm') + ' pick   ' + label('start') + ' options' : needsPad() ? 'Settings: the corner button' : 'Arrows + Enter, or click   V view   - = zoom   M mute';
    r.text(how, r.W / 2, r.H - 26, '#c8b8a0', { align: 'center', shadow: '#000', outline: false });
  }
};
function titleAction(i) {
  if ((i === 0 || i === 1) && needsPad()) return;
  if (i === 0) { progress = freshProgress(); sfx('confirm'); game.go('lab', {}, { fade: 'iris', seconds: .5 }); }
  else if (i === 1) { const s = game.saves.latest(); if (s) { game.saves.load(s.slot); sfx('confirm'); game.go(progress.scene, {}, { fade: 'dissolve' }); } }
  else if (i === 2) { sfx('select'); game.go('about', { page: 0 }, { fade: 'dissolve' }); }
  else if (i === 3) { sfx('select'); game.menu('settings'); }
}
function startDemo() { DEMO = true; progress = freshProgress(); game.go('lab', { demo: true }, { fade: 'dissolve' }); }

/* ========================================================================================= *
 *  LAB: a garage, a cook station, Tomas. Cook three batches; the door opens when they are done.
 *  Cook: three presses on a sliding bar. Each press in the green band is a clean stage.
 * ========================================================================================= */
const LAB_ROWS = [
  '############',
  '#..........#',
  '#.B........#',
  '#..H.......#',
  '#..........#',
  '#.C.....T..#',
  '#..........#',
  '#.........B#',
  '#####D######'
];
const COOK_STAGES = ['DISSOLVE', 'HEAT', 'PULL'];
scenes.lab = {
  view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: 'DEFAULT', res: 'ps1', expand: true, pausable: true,
  enter(data) {
    DEMO = !!(data && data.demo); progress.scene = 'lab';
    A.music('adventure'); L.enabled = true; L.ambient = .55; game.weather = null;
    const map = new E.TileMap({
      rows: LAB_ROWS,
      legend: { '#': 2, '.': { floor: 'concrete' }, 'B': { floor: 'concrete', spawn: 'bench' }, 'H': { floor: 'concrete', spawn: 'hero' },
        'C': { floor: 'concrete', spawn: 'cook' }, 'T': { floor: 'concrete', spawn: 'tomas' }, 'D': { floor: 'door', spawn: 'exit' } },
      types: { 2: { h: 30, face: 'brick', roof: 'slab', top: '#8a8078', side: '#5a4c44' } },
      floorTex: (x, y, tag) => tag === 'door' ? E.tex.planks(x, y, { base: '#7a5a3a' }) : E.tex.plain(x, y, { base: '#9a9690', amount: .12 }),
      outside: '#1e1a18'
    });
    game.cam.bounds = v => map.bounds(v); game.follow(null);
    const h = map.find('hero'), t = map.find('tomas'), c = map.find('cook'), x = map.find('exit');
    cur = { kind: 'lab', map, talk: new E.Dialog(game, { voice: 'gibber' }), hero: makeHero(h.x, h.y), cook: null, cookDone: progress.batches || 0, phase: 'intro',
      tomas: { rig: RIG.tomas(), x: t.x, y: t.y }, station: { x: c.x, y: c.y }, exit: { x: x.x, y: x.y }, benches: map.findAll('bench') };
    game.focus(cur.hero.body.x, cur.hero.body.y, 10);
    if (DEMO) cur.phase = 'free';
    else say(cur.talk, ['Cold in here, Mr. Rook. The cook station is warm, though.',
      'Three batches. Clean ones. Nobody gets hurt and nobody gets curious.', 'Those are two different promises, Tomas.',
      () => 'Press ' + label('confirm') + ' at the station to cook. Each batch is three presses, timed to the green band.'],
      { name: 'TOMAS', portrait: cur.tomas.rig, onDone: () => { cur.phase = 'free'; } });
  },
  update(dt) {
    const s = cur, I = game.input;
    if (DEMO && I.anyPressed()) { I.consumeAll(); return game.go('title', {}, { fade: 0 }); }
    if (s.talk.update(dt)) return;
    if (s.phase === 'cook') return cookStep(dt, s);
    if (s.phase !== 'free') return;
    const near = (p, r) => dist(s.hero.body, p) < r;
    const dir = DEMO ? aiLabDir(s) : moveDir();
    stepHero(dt, dir, { speed: 78 }, s);
    const press = !DEMO && (I.pressed('confirm') || I.clicked());
    if (near(s.station, 22) && s.cookDone < 3 && (press || DEMO)) { I.consumeAll(); startCook(s); return; }
    if (near(s.tomas, 26) && press) { I.consumeAll(); tomasLines(s); }
    if (s.cookDone >= 3 && near(s.exit, 14) && (press || DEMO)) { I.consumeAll(); sfx('door'); game.go('desert', { demo: DEMO }, { fade: 'iris', seconds: .5 }); }
  },
  draw(r) {
    const s = cur;
    s.map.drawFloor(r);
    for (const b of s.benches) benchDraw(r, b.x, b.y);
    cookDraw(r, s.station.x, s.station.y);
    r.shadow(s.hero.body.x, s.hero.body.y, 5);
    s.map.queueWalls(r);
    r.actor(s.tomas.x, s.tomas.y, 0, (g, ox, oy) => s.tomas.rig.draw(g, ox, oy, r.view));
    drawHero(r, s.hero);
    L.add(s.station.x, s.station.y, 40, 60, .9, { color: '#e8ffa8' });
    L.add(s.exit.x, s.exit.y, 30, 40, .6, { color: '#ffd090' });
    if (s.phase === 'cook') cookOverlay(r, s.cook);
    s.talk.draw(r);
    hud(r, s.hero, s.cookDone < 3 ? 'COOK ' + s.cookDone + '/3 BATCHES' : 'DOOR OPEN: THE DESERT');
    if (s.phase === 'free' && !DEMO && !s.talk.open) {
      if (dist(s.hero.body, s.station) < 22 && s.cookDone < 3) textPrompt(r, prompt('confirm', 'Cook batch ' + (s.cookDone + 1)));
      else if (dist(s.hero.body, s.tomas) < 26) textPrompt(r, prompt('confirm', 'Talk to Tomas'));
      else if (s.cookDone >= 3 && dist(s.hero.body, s.exit) < 14) textPrompt(r, prompt('confirm', 'Leave for the desert'));
    }
  }
};
function tomasLines(s) {
  const lines = s.cookDone >= 3 ? ['Three batches. Mr. Rook, the van is ready.', 'We walk out of here, Tomas. The van can wait.']
    : s.cookDone ? ['Batch ' + s.cookDone + ' is in the bag. The next one is when you want the money.']
    : ['The station is hot. Press ' + label('confirm') + ' at it when the band lines up.'];
  say(s.talk, lines, { name: 'TOMAS', portrait: s.tomas.rig });
}
function startCook(s) {
  s.phase = 'cook';
  s.cook = { stage: 0, pos: 0, dir: 1, zone: 0, half: .11, t: 0, results: [], flash: 0 };
  newZone(s.cook); sfx('select');
}
function newZone(c) { c.zone = .22 + E.rand() * .56; c.half = .11 - c.stage * .015; }
function cookStep(dt, s) {
  const c = s.cook, I = game.input;
  c.t += dt; c.pos += c.dir * (1.1 + c.stage * .28) * dt;
  if (c.pos > 1) { c.pos = 2 - c.pos; c.dir = -1; } if (c.pos < 0) { c.pos = -c.pos; c.dir = 1; }
  if (c.flash > 0) c.flash -= dt;
  let press = !DEMO && (I.pressed('confirm') || I.clicked());
  if (DEMO && Math.abs(c.pos - c.zone) < c.half * .5) press = true;
  if (!press) return;
  I.consumeAll();
  const miss = Math.abs(c.pos - c.zone) > c.half, acc = miss ? 0 : 1 - Math.abs(c.pos - c.zone) / c.half;
  c.results.push(miss ? .45 : .6 + .4 * acc);
  c.flash = .35; sfx(miss ? 'hurt' : 'blip');
  if (++c.stage < 3) { newZone(c); return; }
  const pur = c.results.reduce((a, b) => a + b, 0) / c.results.length;
  progress.purity.push(+pur.toFixed(3)); s.cookDone++; progress.batches = s.cookDone;
  s.phase = 'free'; s.cook = null; sfx('coin');
  const line = pur > .9 ? 'That color. That is the actual color.' : pur > .75 ? 'Clean enough. Clean enough is what we sell.' : 'Cloudy. Cloudy is a problem for a man with a lab coat.';
  say(s.talk, [line].concat(s.cookDone >= 3 ? ['That is three. Head for the door.'] : []), { name: 'HOLLIS', portrait: s.hero.rig });
}
function aiLabDir(s) {
  const b = s.hero.body, tx = s.cookDone < 3 ? s.station.x : s.exit.x, ty = s.cookDone < 3 ? s.station.y : s.exit.y;
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
  return d < 14 ? [0, 0] : [dx / d, dy / d];
}
function cookOverlay(r, c) {
  r.overlay(g => {
    const W = Math.min(r.W - 40, 260), x0 = Math.round((r.W - W) / 2), y0 = Math.round(r.H * .3);
    E.ui.box(g, x0 - 10, y0 - 22, W + 20, 72, { bg: ['#1e1a2a', '#0c0a14'], border: '#c8b088' });
    E.font.text(g, 'STAGE ' + (c.stage + 1) + '/3   ' + COOK_STAGES[c.stage], r.W / 2, y0 - 12, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
    E.ui.box(g, x0, y0, W, 14, { bg: '#2a2432', border: '#5a5068', gradient: false });
    E.px.rect(g, Math.round(x0 + (c.zone - c.half) * W), y0 + 1, Math.round(c.half * 2 * W), 12, '#3aa050');
    E.px.rect(g, Math.round(x0 + c.pos * W) - 1, y0 - 3, 3, 20, c.flash > 0 ? '#ff7a6a' : '#ffffff');
    E.font.text(g, 'press ' + label('confirm') + ' in the green', r.W / 2, y0 + 26, '#f4e6c8', { align: 'center', shadow: '#000', outline: false });
  });
}
function benchDraw(r, x, y) { r.queue(x, y, 0, g => r.box(g, x - 7, y - 4, 0, x + 7, y + 4, 9, '#8a6a4a', '#5a4030'), { bias: 0 }); }
function cookDraw(r, x, y) {
  r.queue(x, y, 0, g => r.box(g, x - 9, y - 6, 0, x + 9, y + 6, 18, '#b8c0c8', '#6a7078'), { bias: 0 });
  r.prop('brazier', x + 11, y - 8, 0, { size: .8, light: true });
}

/* ========================================================================================= *
 *  DESERT: the run. Three batches to pick up, the RV to deliver them to, then the chapel path.
 * ========================================================================================= */
const DW = 40, DH = 26;
const GRUNT_PATROLS = [[[12, 12], [18, 12]], [[22, 18], [22, 22]], [[35, 20], [35, 15]], [[21, 7], [21, 11]]];
const BATCH_CELLS = [[9, 20], [15, 6], [36, 17]];
function buildDesert() {
  const g = Array.from({ length: DH }, (_, y) => Array.from({ length: DW }, (_, x) => (x === 0 || y === 0 || x === DW - 1 || y === DH - 1) ? '#' : '.'));
  const put = (x, y, c) => { if (x > 0 && y > 0 && x < DW - 1 && y < DH - 1) g[y][x] = c; };
  // scrub and rock scattered by hash, kept off the road, the start, and the compound
  for (let y = 1; y < DH - 1; y++) for (let x = 1; x < DW - 1; x++) {
    if (x < 6 || (x >= 24 && x <= 36 && y <= 12) || y === 12 || y === 13) continue;
    const h = E.hash2(x * 3 + 1, y * 7 + 2);
    if (h < .05) g[y][x] = '#'; else if (h < .08) g[y][x] = 'c';
  }
  for (let x = 1; x < DW - 1; x++) { put(x, 12, ','); put(x, 13, ','); }   // the road
  for (let y = 1; y < 12; y++) put(20, y, ',');                             // the chapel path, north
  for (let x = 26; x <= 34; x++) { put(x, 3, '2'); put(x, 10, '2'); }        // the RV's compound: adobe walls
  for (let y = 3; y <= 10; y++) { put(26, y, '2'); put(34, y, '2'); }
  put(30, 10, ',');                                                         // the gate
  for (let y = 4; y <= 9; y++) for (let x = 27; x <= 33; x++) put(x, y, ',');
  put(30, 6, 'd');                                                          // the drop, where the RV waits
  put(20, 1, 'E');                                                          // the chapel's arena
  put(3, 12, 'h');                                                          // the start
  for (const [x, y] of BATCH_CELLS) put(x, y, 'b');
  for (const [[x, y]] of GRUNT_PATROLS) { put(x, y, 'g'); }
  for (const p of GRUNT_PATROLS) for (const [x, y] of p) if (g[y][x] === '#' || g[y][x] === 'c') put(x, y, '.');
  return g.map(row => row.join(''));
}
const DESERT_ROWS = buildDesert();
scenes.desert = {
  view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: 'DEFAULT', res: 'ps1', expand: true, pausable: true,
  camera: { zoom: [.75, 2], start: 1 },
  enter(data) {
    const round = !!(data && data.round);
    DEMO = !!(data && data.demo) || DEMO; progress.scene = 'desert';
    if (round) progress = Object.assign(freshProgress(), { scene: 'desert', purity: [.8, .8, .8], batches: 3 });
    A.music('adventure'); L.enabled = false; game.weather = { kind: 'sand', amount: .32, wind: .5 };
    const map = new E.TileMap({
      rows: DESERT_ROWS,
      legend: {
        '#': 1, '2': 2, 'c': 3, '.': { floor: 'sand' }, ',': { floor: 'road' }, 'b': { floor: 'sand', spawn: 'batch' },
        'g': { floor: 'sand', spawn: 'grunt' }, 'h': { floor: 'sand', spawn: 'hero' }, 'd': { floor: 'road', spawn: 'drop' }, 'E': { floor: 'road', spawn: 'arena' }
      },
      types: {
        1: { h: 22, face: 'rock', roof: 'speckle', top: '#b08a64', side: '#7a5a40' },
        2: { h: 26, face: 'plaster', roof: 'plain', top: '#d8b080', side: '#e8c898' },
        3: { h: 14, face: 'hedge', roof: 'leaves', top: '#5a8a3a', side: '#3a5a2a' }
      },
      floorTex: (x, y, tag) => tag === 'road' ? E.tex.plain(x, y, { base: '#9a7a58', amount: .14 }) : E.tex.plain(x, y, { base: '#d8b880', amount: .1 }),
      outside: '#c8a878'
    });
    game.cam.bounds = v => map.bounds(v); game.follow(null);
    const hs = map.find('hero'), drop = map.find('drop'), arena = map.find('arena');
    const remaining = map.findAll('batch').slice(progress.delivered || 0);
    const grunts = map.findAll('grunt').map(c => {
      const p = GRUNT_PATROLS.find(q => q[0][0] === c.cx && q[0][1] === c.cy) || [[c.cx, c.cy]];
      return makeGrunt(c.x, c.y, p);
    });
    cur = { kind: 'desert', map, round, talk: new E.Dialog(game, { voice: 'gibber' }), hero: makeHero(hs.x, hs.y), grunts, carry: 0,
      batches: remaining.map(b => ({ x: b.x, y: b.y, taken: false })),
      drop: { x: drop.x, y: drop.y }, arena: { x: arena.x, y: arena.y }, phase: round ? 'wait' : 'run', t: 0, hubT: 0, hubDone: false,
      objective: '', roundOver: null, flow: new E.FlowField(map) };
    game.focus(cur.hero.body.x, cur.hero.body.y, 10);
    if (!DEMO && !round && !progress.delivered) {
      say(cur.talk, ['Forty miles of nothing, Mr. Rook. Vail\'s men own the nothing.',
        'Three batches. The RV is in the compound at the top of the road. Walk them in and nobody sees the van.',
        () => 'Stick or WASD to move. ' + prompt('attack', 'swing') + '. ' + prompt('dash', 'dash') + '. Their sight is a cone: stay out of it, or be ready.'],
        { name: 'HOLLIS', portrait: cur.hero.rig });
    }
  },
  update(dt) {
    const s = cur, I = game.input;
    if (DEMO && I.anyPressed()) { I.consumeAll(); return game.go('title', {}, { fade: 0 }); }
    if (s.hero.dead) return heroDown(s, dt);
    if (s.phase === 'wait') return roundWait(s, dt);
    if (s.talk.update(dt)) return;
    s.t += dt;
    updateHero(dt, s, null);
    for (const f of s.grunts) stepFoe(dt, f, s);
    for (const b of s.batches) if (!b.taken && dist(s.hero.body, b) < 12) { b.taken = true; s.carry++; sfx('pickup'); game.note('BATCH PICKED UP'); }
    if (s.carry > 0 && dist(s.hero.body, s.drop) < 18) deliver(s);
    if (progress.delivered >= 3 && dist(s.hero.body, s.arena) < 12 && s.phase === 'run') {
      s.phase = 'won';
      game.go('showdown', { demo: DEMO }, { fade: 'iris', seconds: .6 });
    }
    s.objective = progress.delivered < 3 ? (s.carry ? 'TAKE THEM TO THE RV' : 'BATCHES LEFT: ' + (3 - progress.delivered - s.carry)) : 'THE CHAPEL, NORTH';
    if (HUB && s.round) hubTick(s, dt);
  },
  draw(r) {
    const s = cur;
    s.map.drawFloor(r);
    for (const b of s.batches) if (!b.taken) r.prop('crate', b.x, b.y, 0, { size: .9 });
    drawDrop(r, s.drop.x, s.drop.y);
    drawArena(r, s.arena.x, s.arena.y);
    r.shadow(s.hero.body.x, s.hero.body.y, 5);
    for (const f of s.grunts) if (!f.dead || f.downT < 4) r.shadow(f.body.x, f.body.y, 5, .4);
    s.map.queueWalls(r);
    drawHero(r, s.hero);
    for (const f of s.grunts) drawFoe(r, f);
    s.talk.draw(r);
    hud(r, s.hero, s.objective);
    if (s.phase === 'wait') r.overlay(g => E.font.text(g, s.roundOver || 'GET READY', r.W / 2, r.H / 2 - 20, '#ffe08a', { align: 'center', scale: 2, shadow: '#000', outline: false }));
    if (s.roundOver && s.phase !== 'wait') r.overlay(g => E.font.text(g, s.roundOver, r.W / 2, r.H / 2, '#ffe08a', { align: 'center', shadow: '#000', outline: false }));
    if (s.hero.dead) deathCard(r, 'Vail\'s men found the van.');
    if (!s.talk.open && !s.hero.dead && s.carry > 0 && dist(s.hero.body, s.drop) < 40) textPrompt(r, 'DELIVER: walk onto the RV');
  }
};
function drawDrop(r, x, y) {
  r.queue(x, y, 0, g => r.box(g, x - 10, y - 7, 0, x + 10, y + 7, 14, '#f0ece4', '#2a6ab0'), { bias: 0 });
  r.groundRing(x, y, 14, '#2a6ab0', .6);
}
function drawArena(r, x, y) { r.queue(x, y, 0, g => r.box(g, x - 9, y - 9, 0, x + 9, y + 9, 2, '#4a3a30', '#2a201a'), { bias: 0 }); }
function deliver(s) {
  const k = s.carry; s.carry = 0; let cash = 0;
  for (let n = 0; n < k; n++) {
    const pur = progress.purity[progress.delivered] || .8;
    progress.delivered++; cash += Math.round(pur * 100);
  }
  progress.cash += cash;
  sfx('coin'); game.note('DELIVERED ' + k + '  +$' + cash);
  if (s.round) { roundCheck(s); return; }
  say(s.talk, progress.delivered >= 3 ? ['All three. Vail\'s chapel is up the road. Walk it like a man who knows the way.'] : ['Batch in. Clean. Vail doesn\'t ask about the color.'], { name: 'HOLLIS', portrait: s.hero.rig });
}
// the hub round: the round is over when the batches are delivered (or the player is down, or time is called)
function roundCheck(s) {
  if (progress.delivered < 3 || s.hubDone) return;
  s.hubDone = true; s.roundOver = 'ROUND OVER  $' + progress.cash + '  WAITING FOR THE OTHERS';
  if (HUB) HUB.result({ score: progress.cash, stats: { 'Batches delivered': progress.delivered, 'Cash': progress.cash } });
}
function hubTick(s, dt) {
  s.hubT += dt;
  if (s.hubT > 1) { s.hubT = 0; HUB.progress({ score: progress.cash, label: progress.delivered + '/3 batches, $' + progress.cash }); }
}
// the round waits for the hub's clock: a countdown while time is negative, then play
function roundWait(s, dt) {
  const t = HUB && HUB.time ? HUB.time() : 0;
  if (t < 0 && t > -1e9) s.roundOver = 'GET READY  ' + Math.ceil(-t);
  else if (t >= 0) { s.phase = 'run'; s.roundOver = null; }
  if (!HUB) s.phase = 'run';
  if (s.phase === 'run') s.objective = '';
}

/* ========================================================================================= *
 *  SHOWDOWN: Vail in the chapel ruin. Telegraphed haymakers, sweeps and uppercuts; he rushes when hurt.
 * ========================================================================================= */
const ARENA_ROWS = [
  '################',
  '#..............#',
  '#..p........p..#',
  '#..............#',
  '#..............#',
  '#......v.......#',
  '#..............#',
  '#..............#',
  '#..p........p..#',
  '#..............#',
  '#.......h......#',
  '################'
];
scenes.showdown = {
  view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: 'DEFAULT', res: 'ps1', expand: true, pausable: true,
  enter(data) {
    DEMO = !!(data && data.demo) || DEMO; progress.scene = 'showdown';
    A.music('boss'); L.enabled = true; L.ambient = .42; game.weather = null;
    const map = new E.TileMap({
      rows: ARENA_ROWS,
      legend: { '#': 1, '.': { floor: 'arena' }, 'p': 3, 'v': { floor: 'arena', spawn: 'vail' }, 'h': { floor: 'arena', spawn: 'hero' } },
      types: {
        1: { h: 24, face: 'stone', roof: 'slab', top: '#6a5a4a', side: '#4a3a30' },
        3: { h: 30, face: 'stone', roof: 'slab', top: '#8a7a6a', side: '#5a4a3a' }
      },
      floorTex: (x, y) => E.tex.checker(x, y, { a: '#4a3a30', b: '#2e241e', size: 16 }),
      outside: '#1a1410'
    });
    game.cam.bounds = v => map.bounds(v); game.follow(null);
    const h = map.find('hero'), v = map.find('vail');
    cur = { kind: 'showdown', map, talk: new E.Dialog(game, { voice: 'gibber' }), hero: makeHero(h.x, h.y), boss: makeBoss(v.x, v.y), phase: 'intro', t: 0, flow: new E.FlowField(map) };
    game.focus(cur.hero.body.x, cur.hero.body.y, 10);
    const lines = ['You brought the product, Mr. Rook. Good. Now we talk about the part where you are standing on my ground.',
      'I brought the batches. You brought the ground.', 'Clever. You always did think you were the smart one in the room.'];
    if (DEMO) cur.phase = 'fight';
    else say(cur.talk, lines, { name: 'VAIL', portrait: cur.boss.rig, onDone: () => { cur.phase = 'fight'; } });
  },
  update(dt) {
    const s = cur, I = game.input;
    if (DEMO && I.anyPressed()) { I.consumeAll(); return game.go('title', {}, { fade: 0 }); }
    if (s.hero.dead) return heroDown(s, dt);
    if (s.talk.update(dt)) return;
    s.t += dt;
    if (s.phase === 'fight') {
      updateHero(dt, s, s.boss);
      stepBoss(dt, s);
      if (s.boss.dead && s.phase === 'fight') { s.phase = 'won'; s.t = 0; A.music('victory'); }
    }
    if (s.phase === 'won' && s.t > 3.5) game.go('ending', {}, { fade: 'dissolve' });
  },
  draw(r) {
    const s = cur;
    s.map.drawFloor(r);
    r.shadow(s.hero.body.x, s.hero.body.y, 5);
    r.shadow(s.boss.body.x, s.boss.body.y, 10, .5);
    s.map.queueWalls(r);
    r.prop('torch', s.map.find('hero').x - 60, 20, 0, { size: 1.1, light: true });
    r.prop('torch', s.map.find('hero').x + 60, 20, 0, { size: 1.1, light: true });
    L.add(s.boss.body.x, s.boss.body.y, 40, 90, .5, { color: '#ffb070' });
    drawFoe(r, s.boss);
    drawHero(r, s.hero);
    s.talk.draw(r);
    hud(r, s.hero, s.phase === 'won' ? 'VAIL IS DOWN' : 'VAIL');
    if (s.phase === 'fight') r.overlay(g => E.ui.bar(g, r.W / 2 - 80, 14, 160, 6, Math.max(0, s.boss.hp / s.boss.maxHp), '#c83a2a'));
    if (s.hero.dead) deathCard(r, 'The chapel ruin keeps the rest.');
    if (s.phase === 'won') r.overlay(g => E.font.text(g, 'THE CHAPEL IS QUIET', r.W / 2, r.H / 2 - 12, '#ffe08a', { align: 'center', scale: 2, shadow: '#000', outline: false }));
  }
};

/* ========================================================================================= *
 *  THE SHARED GAME: the hero, foes, the boss, the HUD, the death card
 * ========================================================================================= */
function makeHero(x, y) {
  const body = new E.Body({ x, y, r: 5 });
  return { body, rig: RIG.hollis(), slash: new E.Attack('slash', { reach: 11 }), facing: 0, hp: 6, inv: 0, dash: 0, dashCool: 0, dead: false, deadT: 0 };
}
function makeGrunt(x, y, patrol) {
  const body = new E.Body({ x, y, r: 5 });
  const hats = ['#b02a2a', '#2a6ab0', '#c8a040', '#2a8a4a'];
  const f = { body, rig: RIG.grunt(hats[(patrol[0][0] + patrol[0][1]) % 4]), atk: new E.Attack(patrol[0][0] % 2 ? 'cross' : 'jab', { reach: 9 }),
    hp: 30, maxHp: 30, dead: false, downT: 0, flash: 0, patrol, idx: 0, state: 'patrol', alert: 0, cool: 0, seenT: 0, facing: 0, dmg: 1, name: 'grunt', tele: 0 };
  body.foe = f;
  return f;
}
function makeBoss(x, y) {
  const body = new E.Body({ x, y, r: 8 });
  const f = { body, rig: RIG.vail(), atk: new E.Attack('haymaker', { reach: 15 }), hp: 150, maxHp: 150, dead: false, downT: 0, flash: 0,
    state: 'fight', cool: 1.5, facing: Math.PI, dmg: 2, name: 'boss', tele: 0, moves: ['haymaker', 'sweep', 'uppercut'], mi: 0 };
  body.foe = f;
  return f;
}
// the hero's own turn: the stick or keys walk, the dash, the mouse aims, the swing hits in an arc
function updateHero(dt, s, boss) {
  const H = s.hero, I = game.input;
  H.inv = Math.max(0, H.inv - dt); H.dashCool = Math.max(0, H.dashCool - dt); H.dash = Math.max(0, H.dash - dt);
  const dir = DEMO ? aiDir(s, boss) : moveDir();
  if (!DEMO && I.pressed('dash') && H.dashCool <= 0) { H.dash = .2; H.dashCool = .8; H.inv = Math.max(H.inv, .25); sfx('whoosh'); }
  if (!DEMO && I.lastDevice === 'mouse') { const m = mousePoint(); if (m) H.facing = E.angleTo(H.body, m); }
  stepHero(dt, dir, { speed: H.dash > 0 ? 190 : 78 }, s);
  if (!DEMO && I.buffered('attack') && H.slash.start()) { I.consume('attack'); sfx('swing'); }
  if (DEMO && aiWantsSwing(s, boss) && H.slash.start()) sfx('swing');
  H.slash.update(dt);
  const foes = boss ? [boss] : s.grunts;
  H.slash.hits(live(foes).map(f => f.body), b => E.inArc(H.body, H.facing, b, 24, 1.3, 16), b => hurtFoe(b.foe, 14, b, H));
}
function stepHero(dt, dir, o, s) {
  const H = s.hero, d = dir || [0, 0], sp = o && o.speed ? o.speed : 78;
  if (H.dead) return;
  H.body.vx = d[0] * sp; H.body.vy = d[1] * sp;
  H.body.update(dt, s.map);
  if (Math.hypot(d[0], d[1]) > .1 && !(game.input.lastDevice === 'mouse' && !DEMO)) H.facing = Math.atan2(d[1], d[0]);
  H.rig.update(dt, { x: H.body.x, y: H.body.y, z: H.body.z, vx: H.body.vx, vy: H.body.vy, facing: H.facing,
    attack: H.slash ? H.slash.state : null, hurt: H.inv > .5, dash: H.dash > 0 });
  game.focus(H.body.x, H.body.y, 10);
}
// attract mode's AI: walk to the nearest thing that matters (the next batch, the RV, the arena, the boss), wiggle when stuck
function aiDir(s, boss) {
  let tx, ty;
  if (boss) { tx = boss.body.x; ty = boss.body.y; }
  else if (s.carry > 0) { tx = s.drop.x; ty = s.drop.y; }
  else { const b = s.batches.find(q => !q.taken); if (b) { tx = b.x; ty = b.y; } else { tx = s.arena.x; ty = s.arena.y; } }
  // the flow field walks round the walls and rocks to the target
  s.flow.update(tx, ty);
  return s.flow.dir(s.hero.body.x, s.hero.body.y, tx, ty);
}
function aiWantsSwing(s, boss) {
  const H = s.hero;
  if (boss) return dist(boss.body, H.body) < 26 && !H.slash.busy;
  return s.grunts.some(f => !f.dead && dist(f.body, H.body) < 22) && !H.slash.busy;
}
function hurtFoe(f, dmg, body, H) {
  if (f.dead) return;
  f.hp -= dmg; f.flash = .18; f.state = 'chase'; f.cool = Math.max(f.cool, .4);
  sfx('hit');
  game.hitFx(body.x, body.y, body.z + 18, { power: 1, angle: E.angleTo(H.body, body), damage: dmg, textScale: 2, textZ: 26 });
  E.knockback(H.body, body, 140, 0);
  if (f.hp <= 0) { f.dead = true; f.downT = 0; sfx('die'); }
}
function hurtHero(s, dmg, from) {
  const H = s.hero;
  if (H.inv > 0 || H.dash > 0 || DEMO || H.dead) return;
  H.hp -= dmg; H.inv = 1;
  sfx('hurt'); game.shake(4); game.flash('#ff3a3a', .12, .4);
  E.knockback(from, H.body, 120, 0);
  if (H.hp <= 0) { H.dead = true; H.deadT = 0; sfx('die'); }
}
// a downed hero: a short beat, then the round ends (hub) or the game over card
function heroDown(s, dt) {
  s.hero.deadT += dt;
  if (s.hero.deadT < 2) return;
  if (HUB && s.round) { if (!s.hubDone) { s.hubDone = true; s.roundOver = 'ROUND OVER  $' + progress.cash; HUB.result({ score: progress.cash, stats: { 'Batches delivered': progress.delivered, 'Cash': progress.cash } }); } return; }
  game.go('over', {}, { fade: 'dissolve' });
}
function stepFoe(dt, f, s) {
  const H = s.hero;
  if (f.dead) { f.downT += dt; f.rig.update(dt, { x: f.body.x, y: f.body.y, z: 0, facing: f.facing, pose: f.downT < 1 ? 'die' : undefined, down: f.downT >= 1 ? 1 : 0 }); return; }
  f.flash = Math.max(0, f.flash - dt); f.cool = Math.max(0, f.cool - dt); f.alert = Math.max(0, f.alert - dt);
  const d = dist(H.body, f.body);
  const seen = !DEMO && !H.dead && d < 110 && s.map.los(f.body.x, f.body.y, H.body.x, H.body.y) && angDiff(f.facing, E.angleTo(f.body, H.body)) < 1.0;
  if (f.state === 'patrol' && seen) { f.state = 'alert'; f.alert = .7; sfx('select'); }
  if (f.state === 'alert' && f.alert <= 0) f.state = 'chase';
  if (f.state === 'chase') { f.seenT = seen ? 0 : (f.seenT || 0) + dt; if (!seen && f.seenT > 3) f.state = 'patrol'; }
  let vx = 0, vy = 0;
  if (f.state === 'patrol') {
    const p = f.patrol[f.idx % f.patrol.length], tx = p[0] * 16 + 8, ty = p[1] * 16 + 8;
    const ex = tx - f.body.x, ey = ty - f.body.y, ed = Math.hypot(ex, ey);
    if (ed < 3) f.idx = (f.idx + 1) % f.patrol.length; else { vx = ex / ed * 26; vy = ey / ed * 26; f.facing = Math.atan2(vy, vx); }
  } else if (f.state === 'alert') f.facing = E.angleTo(f.body, H.body);
  else if (f.state === 'chase') {
    f.facing = E.angleTo(f.body, H.body);
    if (d > 22) { vx = (H.body.x - f.body.x) / d * 58; vy = (H.body.y - f.body.y) / d * 58; }
    if (d <= 20 && f.cool <= 0 && !f.atk.busy && !H.dead && f.atk.start()) f.cool = 1.4;
  }
  f.body.vx = vx; f.body.vy = vy; f.body.update(dt, s.map);
  f.atk.update(dt);
  if (f.atk.state && f.atk.state.phase === 'active') f.atk.hits([H.body], b => E.inArc(f.body, f.facing, b, 22, 1.2, 16), () => hurtHero(s, f.dmg, f.body));
  f.rig.update(dt, { x: f.body.x, y: f.body.y, z: 0, vx, vy, facing: f.facing, attack: f.atk.state, hurt: f.flash > 0, run: vx || vy ? .6 : 0 });
}
function stepBoss(dt, s) {
  const b = s.boss, H = s.hero;
  if (b.dead) { b.downT += dt; b.rig.update(dt, { x: b.body.x, y: b.body.y, z: 0, facing: b.facing, pose: b.downT < 1 ? 'die' : undefined, down: b.downT >= 1 ? 1 : 0 }); return; }
  b.flash = Math.max(0, b.flash - dt); b.cool = Math.max(0, b.cool - dt);
  const d = dist(H.body, b.body), rush = b.hp < b.maxHp * .5 ? 1.35 : 1;
  b.facing = E.angleTo(b.body, H.body);
  let vx = 0, vy = 0;
  if (d > 22 && !b.atk.busy && !H.dead) { vx = (H.body.x - b.body.x) / d * 36 * rush; vy = (H.body.y - b.body.y) / d * 36 * rush; }
  b.body.vx = vx; b.body.vy = vy; b.body.update(dt, s.map);
  if (b.cool <= 0 && !b.atk.busy && d < 46 && !H.dead) {
    b.atk = new E.Attack(b.moves[b.mi % b.moves.length], { reach: 15 }); b.mi++;
    if (b.atk.start()) b.cool = rush > 1 ? .9 : 1.4;
  }
  b.atk.update(dt);
  b.tele = b.atk.state && b.atk.state.phase === 'wind' ? 1 : 0;
  if (b.atk.state && b.atk.state.phase === 'active') b.atk.hits([H.body], t => E.inArc(b.body, b.facing, t, 24, 1.4, 16), () => hurtHero(s, b.dmg, b.body));
  b.rig.update(dt, { x: b.body.x, y: b.body.y, z: 0, vx, vy, facing: b.facing, attack: b.atk.state, hurt: b.flash > 0, run: vx || vy ? .6 : 0 });
  if (b.hp <= 0 && !b.dead) { b.dead = true; b.downT = 0; sfx('explode'); }
}
function drawHero(r, H) {
  r.actor(H.body.x, H.body.y, H.body.z, (g, ox, oy) => H.rig.draw(g, ox, oy, r.view), { flash: H.inv > .5 && Math.floor(game.time * 12) % 2 ? '#ffffff' : undefined, flashMix: .6 });
}
function drawFoe(r, f) {
  if (f.dead && f.downT > 5) return;
  if (f.tele) r.groundRing(f.body.x, f.body.y, 26, '#ff7a4a', .8);
  r.actor(f.body.x, f.body.y, 0, (g, ox, oy) => f.rig.draw(g, ox, oy, r.view), { flash: f.flash > 0 ? '#ffffff' : undefined, flashMix: .75 });
  if (f.state === 'alert' && !f.dead) r.textAt(f.body.x, f.body.y, 46, '!', '#ff5a4a');
}
function hud(r, H, objective) {
  r.overlay(g => {
    if (H && !H.dead) E.ui.hearts(g, 8, r.H - 16, Math.max(0, H.hp), 6);
    E.font.text(g, '$' + progress.cash, r.W - 8, 8, '#f4e27a', { align: 'right', shadow: '#000', outline: false });
    if (objective) E.font.text(g, objective, 8, 8, '#fff6dc', { shadow: '#000', outline: false });
    if (DEMO) E.font.text(g, 'ATTRACT MODE: PRESS ANY BUTTON', r.W / 2, 22, '#ff9a7a', { align: 'center', shadow: '#000', outline: false });
  });
}
function deathCard(r, msg) {
  r.overlay(g => {
    E.px.rect(g, 0, 0, r.W, r.H, '#000000');
    E.font.text(g, 'HOLLIS IS DOWN', r.W / 2, r.H / 2 - 16, '#ff7a6a', { align: 'center', scale: 2, shadow: '#000', outline: false });
    E.font.text(g, msg, r.W / 2, r.H / 2 + 8, '#f4e6c8', { align: 'center', shadow: '#000', outline: false });
  });
}

/* ========================================================================================= *
 *  OVER (game over, retry or title), ENDING (the chapel is quiet), ABOUT (how to play, the source information and the
 *  feedback), WAIT (an AI Hub round before its start)
 * ========================================================================================= */
let overMenu = null;
scenes.over = {
  view: 'side', input: 'DEFAULT', res: 'ps1', pausable: false,
  enter() {
    A.music(null); DEMO = false; cur = null;
    overMenu = new E.Menu(game, ['TRY AGAIN', 'TITLE'], { box: false, y: 0, color: '#fff6dc', pick: '#ffd36a', onPick: i => {
      if (i === 0) game.go(progress.scene, {}, { fade: 'dissolve' }); else game.go('title', {}, { fade: 'dissolve' });
    } });
  },
  update(dt) { overMenu.update(dt); },
  draw(r) {
    r.sky(['#2a0c08', '#0c0606']);
    overMenu.y = (r.H / 2 | 0) + 20;
    r.overlay(g => E.font.title(g, 'DOWN', r.W / 2, 40, { align: 'center', scale: 3, colors: ['#ffd0c0', '#ff7a6a'] }));
    overMenu.draw(r);
  }
};
let endT = 0;
scenes.ending = {
  view: 'side', input: 'DEFAULT', res: 'ps1', pausable: false,
  enter() { A.music('victory'); endT = 0; DEMO = false; cur = null; },
  update(dt) {
    endT += dt;
    const I = game.input;
    if (endT > 2 && I.anyPressed()) { I.consumeAll(); game.go('about', { page: 1 }, { fade: 'dissolve' }); }
  },
  draw(r) {
    r.sky(['#2a1a18', '#0c0a0c']);
    r.overlay(g => {
      E.font.title(g, 'NOT THE END', r.W / 2, r.H * .3 | 0, { align: 'center', scale: 2, colors: ['#fff6d8', '#ffd36a'] });
      E.font.text(g, 'Cash in the wall: $' + progress.cash, r.W / 2, r.H * .5 | 0, '#f4e27a', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, 'Vail is down. The chapel is quiet. The rest of the year is a different story.', r.W / 2, r.H * .58 | 0, '#f4e6c8', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, 'Press any button for the credits', r.W / 2, r.H - 26, '#c8b8a0', { align: 'center', shadow: '#000', outline: false });
    });
  }
};
const PAGES = ['HOW TO PLAY', 'SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'];
let about = { page: 0, scroll: 0 };
scenes.about = {
  view: 'side', input: 'DEFAULT', res: 'ps1', pausable: false,
  enter(data) { A.music('title'); DEMO = false; cur = null; about = { page: (data && data.page) || 0, scroll: 0 }; },
  update(dt) {
    const I = game.input, mv = I.move();
    if (I.pressed('cancel') || (I.pressed('confirm') && about.page === PAGES.length - 1)) { I.consumeAll(); return game.go('title', {}, { fade: 'dissolve' }); }
    if (I.pressed('left') && about.page > 0) { about.page--; about.scroll = 0; }
    if (I.pressed('right') && about.page < PAGES.length - 1) { about.page++; about.scroll = 0; }
    about.scroll = clamp(about.scroll - mv[1] * 140 * dt, -4000, 0);
  },
  draw(r) {
    r.sky(['#2a1a18', '#0c0a0c']);
    const body = aboutBody(about.page, r.W - 24);
    r.overlay(g => {
      E.font.title(g, PAGES[about.page], r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6d8', '#ffd36a'] });
      E.font.text(g, (about.page + 1) + ' / ' + PAGES.length + '   ' + label('left') + ' ' + label('right') + ' page   ' + label('cancel') + ' back', r.W / 2, r.H - 14, '#c8b8a0', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
      let y = 40 + about.scroll;
      for (const ln of body) { if (y > 24 && y < r.H - 24) E.font.text(g, ln, 12, y, '#f4e6c8', { shadow: '#000', outline: false, font: 'tiny' }); y += 9; }
    });
  }
};
// the about screen's text, wrapped to the screen's width
function aboutBody(page, w) {
  const out = [], add = s => { for (const ln of E.font.wrap(String(s), w, { font: 'tiny' })) out.push(ln); };
  if (page === 0) {
    add('Hollis Rook teaches chemistry at a high school in a dry town. He has a diagnosis, a garage, and a plan that gets worse by the day.');
    add('');
    add('Move: WASD, the arrows, or the stick. Swing: J, X or click. Dash: Space or Shift. Talk and cook: Enter, Space, or confirm.');
    add('Cook: a green band slides across a bar. Press in the band. Three presses make a batch.');
    add('Desert: walk the three batches to the RV at the compound. Vail\'s men have sight cones. Stay out of them, or fight.');
    add('Showdown: Vail telegraphs his haymakers with a ring on the ground. Step out of the ring, then strike.');
    add('');
    add('V changes the camera view. - and = zoom. Escape or Start opens the pause menu: Save, Load, Settings, Controls.');
    add('Settings: invert the gamepad\'s left-right or up-down, and choose PlayStation or Xbox button symbols.');
    add('A touch-only screen needs a controller or keyboard. The title\'s attract mode runs without one.');
  } else if (page === 1) {
    const s = EXIT.sourceInformation || {};
    const rows = [['Date', s.date], ['Source', s.source], ['Genre and perspective', [s.genre, s.perspective].filter(Boolean).join('; ')], ['Tech', s.tech],
      ['Art direction', s.artDirection], ['Animation', s.animation], ['Audio', s.audio], ['Online', s.online], ['Testing', s.testing],
      ['Research', s.research], ['Environment', s.environment], ['Model', s.model], ['Usage', s.usage]];
    for (const [k, v] of rows) add(k + ': ' + (v || 'unknown'));
  } else if (page === 2) for (const t of EXIT.testingFeedback || ['unknown']) add('- ' + t);
  else if (page === 3) for (const t of EXIT.engineFeedback || ['unknown']) add('- ' + t);
  else for (const t of EXIT.promptFeedback || ['unknown']) add('- ' + t);
  return out;
}
let roundStarted = false;
scenes.wait = {
  view: 'side', input: 'DEFAULT', res: 'ps1', pausable: false,
  enter() { roundStarted = false; DEMO = false; cur = null; },
  update() { if (roundStarted) game.go('desert', { round: true }, { fade: 0 }); },
  draw(r) { r.sky(['#2a1a18', '#0c0a0c']); r.overlay(g => E.font.text(g, 'AI HUB  ·  GET READY', r.W / 2, r.H / 2, '#ffe08a', { align: 'center', shadow: '#000', outline: false })); }
};

/* ========================================================================================= *
 *  START
 * ========================================================================================= */
if (HUB) {
  HUB.on('start', () => { roundStarted = true; });
  HUB.on('time-up', () => { if (cur && cur.round && !cur.hubDone) { cur.hubDone = true; HUB.result({ score: progress.cash, stats: { 'Batches delivered': progress.delivered, 'Cash': progress.cash } }); } });
  HUB.on('end', () => { if (cur) cur.phase = 'over'; });
  HUB.connect({ mode: 'parallel', seats: [1, 4] }).then(() => HUB.ready());
}
game.debug = { snapshot: () => ({ scene: game.sceneName, demo: DEMO, progress: JSON.parse(JSON.stringify(progress)), hp: cur && cur.hero ? cur.hero.hp : null }) };
game.start({ scene: HUB ? 'wait' : 'title', scenes });
window.__breakingDustBowl = { game, scenes, progress: () => progress, cur: () => cur, setDemo: v => { DEMO = v; } };
})();
