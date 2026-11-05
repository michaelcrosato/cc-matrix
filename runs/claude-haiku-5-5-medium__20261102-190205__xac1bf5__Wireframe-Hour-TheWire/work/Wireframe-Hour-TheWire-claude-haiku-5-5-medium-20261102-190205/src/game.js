/* WIREFRAME HOUR: a Baltimore stealth and wiretap demo, three days long, built on my-3D2dge.
 * Day 1, the Corner: steal the notebook off a stash-house roof and slip out the east alley (stealth, takedowns, parry).
 * Day 2, the Wire Room: six intercepted calls, flag the lines that matter (a listening minigame with voices).
 * Plus: a briefing with a choice, attract mode after 10 idle seconds, settings for inverted sticks and button symbols,
 * an About and Credits screen, and AI Hub parallel rounds (the Corner, each player's own copy, scored on time).
 * Keys: WASD move, Shift sprint, Space jump and climb, C crouch, J strike or take down, K block or parry, L roll, V view.
 * Pad: left stick, A jump, B crouch, X strike, Y interact, LB block, RB roll, Start menu. */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const HUB = window.AIHub || null, inSession = !!(HUB && HUB.active);
const EXIT = window.EXIT_INTERVIEW || {};

const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', bg: '#07060d', menu: { quit: false } });
const P = game.particles, L = game.lights, A = game.audio;
const scenes = {};
const best = (k, v) => { const old = E.store.get('best:' + k, 0); if (v > old) E.store.set('best:' + k, v); return Math.max(old, v); };
const go = (name, data, o) => { if (inSession && name !== 'corner' && name !== 'over') return; game.go(name, data, o); };   // a session is one round: the page stays
let scroll = 0, aboutH = 600;
const say2 = (title, text) => ui.toast(title, text, 3);
let roundEnded = false;   // the hub's 'end' has come: the round takes no more input

/* ---- SETTINGS: the stick inversions (a common pad fault, ~10% of pads report an axis backwards) and button symbols ---- */
game.settings.define({ key: 'invertX', label: 'Invert stick, left and right', type: 'toggle', value: false, group: 'Controller',
  help: 'Turn on if the pad moves you the wrong way left and right' });
game.settings.define({ key: 'invertY', label: 'Invert stick, up and down', type: 'toggle', value: false, group: 'Controller',
  help: 'Turn on if the pad moves you the wrong way up and down' });
game.settings.define({ key: 'glyphs', label: 'Button symbols', type: 'select', value: 'playstation', group: 'Controller',
  options: [['playstation', 'PlayStation symbols'], ['xbox', 'Xbox symbols (A B X Y)']],
  help: 'The symbols prompts show when the controller was the last thing used',
  apply: (g, v) => { g.input.glyphs = v === 'xbox' ? 'xbox' : 'playstation'; } });
game.input.glyphs = game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation';
const ui = new E.Shell(game, { theme: { accent: '#e8c070', ink: '#f2ead8', paper: '#14110e' } });
// (the Shell is made before any scene, so every scene can use say2 and ui)

/* the hero's stick, with the player's inversions: only the pad's stick, the keyboard keeps its keys */
function heroInput() {
  const I = game.input, p = Object.create(I);
  p.move = () => {
    const [x, y] = I.move();
    if (I.lastDevice !== 'gamepad') return [x, y];
    return [game.settings.invertX ? -x : x, game.settings.invertY ? -y : y];
  };
  return p;
}

/* ---- MUSIC: code-written songs (layers of one song in the Corner; the chase drums come in when a guard alerts) ---- */
const TITLE_SONG = { bpm: 78, steps: 4, tracks: [
  { name: 'pad', wave: 'triangle', vol: .16, notes: 'D3 - - - F3 - - - A2 - - - C3 - - -' },
  { name: 'bass', wave: 'square', vol: .07, notes: 'D2 . . . . . A1 . . . . . . C2 .' },
  { name: 'bell', wave: 'pulse12', vol: .05, notes: '. . A4 . . . . . D5 . . . . . F4 .' }] };
const WIRE_SONG = { bpm: 96, steps: 4, tracks: [
  { name: 'hum', wave: 'saw', vol: .035, notes: 'E2 - - - E2 - - - G2 - - - B2 - - -' },
  { name: 'tick', wave: 'drums', vol: .07, notes: 'h . h . h . h . h . h . h . h h' },
  { name: 'click', wave: 'pulse12', vol: .035, notes: '. . . E5 . . . . . . . . G5 . . .' }] };
// the Corner's sneaking bass, ticks and lead; the chase and the alarm start silent (on: false)
const CORNER_SONG = { bpm: 108, steps: 4, tracks: [
  { name: 'bass', wave: 'triangle', vol: .28, notes: 'A2 . . A2 . . A2 . | A2 . . A2 . C3 . . | F2 . . F2 . . F2 . | G2 . . G2 . E2 . .' },
  { name: 'tick', wave: 'drums', vol: .06, notes: 'h . . h . . h . h . . h . . h .' },
  { name: 'lead', wave: 'pulse12', vol: .07, notes: 'E5 - . . . . D5 . | C5 - . . B4 . A4 . | . . . . F5 - E5 . | D5 - . . E5 - . . | E5 - . . . . G5 . | F5 - . . E5 . D5 . | C5 - . . D5 - . . | B4 - - - . . . .' },
  { name: 'chase', wave: 'drums', vol: .13, on: false, notes: 'k . h k s . h . k k h . s . h s' },
  { name: 'alarm', wave: 'saw', vol: .06, on: false, notes: 'A3 A3 A4 A3 E4 A3 G4 A3 | A3 A3 A4 A3 C5 A3 B4 A3 | F3 F3 F4 F3 C4 F3 E4 F3 | G3 G3 G4 G3 D4 G3 B3 G3' }] };

/* ---- AUTO-IDLE: a key, a button, a click or a stick moves the game on; a mouse drifting does not ---- */
let inputSeen = false;
addEventListener('keydown', () => { inputSeen = true; });
addEventListener('pointerdown', () => { inputSeen = true; });
function userInput() {
  let pad = false;
  for (const gp of (navigator.getGamepads ? navigator.getGamepads() : [])) {
    if (!gp) continue;
    if (gp.buttons.some(b => b.pressed) || gp.axes.some(a => Math.abs(a) > .5)) pad = true;
  }
  const seen = inputSeen || pad; inputSeen = false;
  return seen;
}
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'KeyV') { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
  else if (e.code === 'Digit0') { game.settings.set('zoom', 1); game.resetCamera(); game.note('CAMERA RESET'); }
  else if (e.code === 'KeyM') A.mute();
});
const touchOnly = !!(window.matchMedia && matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches);

/* ---- TITLE: the stoop, the heroes, the torches. Idle for ten seconds and the attract demo runs ---- */
const MID = 480, stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 },
  types: { 1: { style: 'stone', side: '#5a4a48', moss: '#3a4a2a' } }, edges: 'open' });
const titleBg = new E.Backdrop('city-night');
const HEROES = [
  { face: 0, rig: new E.Humanoid({ size: 1.25, build: 'heroic', armor: false, hair: 'short', cape: null, colors: { cloth: '#2f3a4a', pants: '#1f2430', hair: '#1a1410', trim: '#8a7a50' } }) },
  { face: 0, rig: new E.Humanoid({ size: 1.25, outfit: 'tunic', hair: 'spiky', hat: { style: 'band', color: '#e0d0a0' }, colors: { cloth: '#7a2a2a', pants: '#2a2a32', hair: '#2a1a10', trim: '#8a5a2a' } }) },
  { face: 0, rig: new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, hat: { style: 'band', color: '#3a6a9a' }, colors: { cloth: '#e8e4dc', pants: '#2a3a52' } }) },
  { face: Math.PI, rig: new E.Humanoid({ size: 1.25, weapon: 'gun', hat: 'cap', sleeves: 'long', colors: { cloth: '#3a3a40', pants: '#1e2630', glove: '#e0e0e0' } }) },
  { face: Math.PI, rig: new E.Humanoid({ size: 1.25, weapon: 'staff', outfit: 'robe', hair: 'ponytail', sleeves: 'long', colors: { cloth: '#4a3a5a', hair: '#7a3a2a', trim: '#c0a060' } }) },
  { face: Math.PI, rig: new E.Humanoid({ size: 1.25, build: 'heroic', hood: true, outfit: 'coat', sleeves: 'long', colors: { cloth: '#d8d2c8', coat: '#c8c0b0', trim: '#4a4a4a', belt: '#3a3a3a', pants: '#3a3a44', boot: '#2a2220' } }) }
];
HEROES.forEach((h, i) => { h.x = MID + (i - 2.5) * 35; });
const corner = () => { const S = game.screen, k = S.dpr / S.S; return [170 * k, 60 * k]; };
const TITLE_ITEMS = touchOnly ? ['SETTINGS', 'ABOUT & CREDITS'] : ['PLAY', 'SETTINGS', 'CONTROLS', 'ABOUT & CREDITS'];
let titleMenu, idle = 0, titleLive = false;
titleMenu = new E.Menu(game, TITLE_ITEMS, { y: 76, onPick: i => {
  const name = TITLE_ITEMS[i];
  if (name === 'PLAY') go('briefing');
  else if (name === 'SETTINGS') game.menu('settings');
  else if (name === 'CONTROLS') game.menu('controls');
  else if (name === 'ABOUT & CREDITS') go('about');
} });
scenes.title = {
  view: 'side', views: ['side', 'brawler'], input: 'DEFAULT', res: 'ps1',
  enter() { A.music(TITLE_SONG); game.resetCamera(); game.follow(null); game.cam.room = null; game.cam.bounds = null; L.enabled = false; idle = 0; ui.hud({}); },
  update(dt) {
    if (userInput()) idle = 0; else idle += dt;
    if (idle > 10) { idle = 0; go('corner', { attract: true }); return; }
    if (!titleMenu.update(dt) && game.input.pressed('start')) { game.input.consumeAll(); titleMenu.onPick(titleMenu.i, TITLE_ITEMS[titleMenu.i]); }
    game.focus(MID, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    HEROES.forEach((h, i) => {
      const u = (game.time * .45 + i * .37) % 3, swing = u < .5 ? { spec: { a0: 1.4, a1: -1.6, z0: 12, z1: 8, reach: 7.5 }, phase: u < .15 ? 'wind' : 'active', u: u < .15 ? u / .15 : (u - .15) / .35 } : null;
      h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: h.face, vx: 0, vy: 0, attack: swing, point: i === 3 && u < .6 });
    });
  },
  draw(r) {
    const [cw, ch] = corner(), top = r.W / 2 + 132 > r.W - cw ? Math.round(ch) : 0;
    titleMenu.y = 76 + top;
    titleBg.draw(r);
    stage.draw(r);
    for (const x of [MID - 100, MID + 100]) r.prop('torch', x, 0, 32, { size: 1.3, light: false });
    for (const x of [MID - 53, MID + 53]) r.prop('banner', x, -8, 64, { size: 1.1, color: '#8a1a2a' });
    for (const h of HEROES) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'WIREFRAME HOUR', r.W / 2, 12 + top, { align: 'center', scale: 3, colors: ['#fffbe8', '#e8d8a0', '#b8a070', '#7a6040'], depth: 3 });
      E.font.text(g, 'Season one. Three days on the Westside.', r.W / 2, 44 + top, '#e8e0d0', { align: 'center', shadow: '#140c1c', outline: false });
      E.font.text(g, 'Stealth on the Corner. Listening in the Wire Room.', r.W / 2, r.H - 14, '#e8d8a0', { align: 'center', shadow: '#000', outline: false });
    });
    titleMenu.draw(r);
    if (touchOnly) r.text('Controller or keyboard required', r.W / 2, r.H - 44, '#ffb0a0', { align: 'center', shadow: '#000', outline: false });
    const dev = game.input.lastDevice, how = dev === 'gamepad' ? 'Stick + ' + game.input.label('confirm') + ' select   ' + game.input.label('start') + ' menu'
      : 'Arrows + Enter or click   V view   - = zoom   M mute';
    if (!touchOnly) r.text(how, r.W / 2, r.H - 26, '#b8b0a0', { align: 'center', shadow: '#000', outline: false });
  }
};

/* ---- ATTRACT: the Corner plays itself (the AI walks the notebook route, unhurt) until any input or a stall; see CORNER ---- */

/* ---- BRIEFING: a sergeant, a desk, a choice. The choice follows you into the Wire Room. ---- */
const talk = new E.Dialog(game, { voice: null, place: 'bottom' });
let envelope = false, voicePitch = 1, blipped = 0, briefDone = false;
const SPEAKER_PITCH = { 'Sgt. Rusk': .8, 'Lt. Cole': 1.1, 'Dre': 1.0, 'Girl': 1.35, 'Ray': .92, 'Pooh': 1.2, '': 1 };
function say(lines, o = {}) { voicePitch = SPEAKER_PITCH[o.name || ''] || 1; blipped = 0; talk.say(lines, o); }
// ANIMALESE: a blip every other letter as a line types, pitched by the speaker; the words stay as subtitles
function animalese() {
  if (!talk.open) return;
  const n = Math.floor(talk.shown || 0);
  if (n < blipped) blipped = 0;
  if (n > blipped) { blipped = n; if (n % 2 === 0) A.sfx({ wave: 'square', freq: 210 * voicePitch * (.85 + Math.random() * .4), to: 170 * voicePitch, dur: .045 }, { vol: .12 }); }
}
scenes.briefing = {
  view: 'side', input: 'DEFAULT', res: 'ps1',
  enter() {
    A.music(TITLE_SONG); game.follow(null); game.focus(0, 0, 0); L.enabled = false; ui.hud({}); briefDone = false;
    say(['Sit down. You know the Corner on Fayette. Same four boys, same bad coffee, four years.',
      'The judge signed the wire on the stash house roof. Up there is a notebook with every number, every price, every girl\'s name.',
      'You go up quiet, you take the book, you go out the alley to the east. Anybody who sees you, you don\'t hit them unless you have to.',
      'Tomorrow you sit in the room with the headphones. Six calls. You flag what\'s real. Flag the wrong thing and you are the one on the stoop.',
      'There\'s an envelope on the desk. The Corner\'s lawyer left it. Nobody saw you pick it up.'],
      { name: 'Sgt. Rusk', choices: ['TAKE THE ENVELOPE', 'LEAVE IT'],
        onChoice: i => { envelope = i === 0; briefDone = true; }, onDone: () => { briefDone = true; } });
  },
  update(dt) {
    animalese();
    if (talk.update(dt)) return;
    if (briefDone) { briefDone = false; go('corner'); }
  },
  draw(r) { titleBg.draw(r); talk.draw(r); r.overlay(g => E.font.text(g, 'DAY ONE', 8, 8, '#e8d8c0', { shadow: '#000', outline: false })); },
  back() { return false; }
};

/* ---- ABOUT & CREDITS: Source Information, the three feedback sections, the credits ---- */
const QUESTIONS = {
  testing: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engine: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'If you had to remove or overhaul one thing from engine, what would that be?', 'If you could change one thing about the engine, what would it be?'],
  prompt: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'If there was one test you could have run, what would that test be?']
};
scenes.about = {
  view: 'side', input: 'DEFAULT', res: 'ps1',
  enter() { scroll = 0; ui.hide(); A.music(TITLE_SONG); ui.hud({}); },
  update(dt) {
    const m = game.input.move()[1];
    scroll = clamp(scroll + m * dt * 140, 0, Math.max(0, aboutH - 40));
    if (game.input.pressed('confirm') || game.input.pressed('cancel') || game.input.pressed('start')) { game.input.consumeAll(); go('title'); }
  },
  back() { go('title'); return true; },
  draw(r) {
    titleBg.draw(r);
    const x = 10, w = Math.max(200, r.W - 20);
    r.overlay(g => {
      E.ui.box(g, 4, 4, r.W - 8, r.H - 8, { bg: ['#140f0c', '#0a0808'], border: '#6a5a40' });
      let y = 12 - scroll;
      const head = (s) => { E.font.text(g, s, x, y, '#e8c070', { shadow: '#000', outline: false }); y += 14; };
      const body = (s, c = '#ece4d4') => { const h = E.font.text(g, s, x, y, c, { wrap: w - 4, shadow: '#000', outline: false }); y += (h && h.h ? h.h : 10) + 4; };
      const sec = (t) => { y += 6; head(t); };
      E.font.text(g, 'WIREFRAME HOUR', x, y, '#fff3d0', { shadow: '#000', outline: false, scale: 2 }); y += 22;
      sec('SOURCE INFORMATION');
      const SI = EXIT.sourceInformation || {};
      for (const k of ['date', 'source', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'])
        body(k.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, c => c.toUpperCase()) + ': ' + (SI[k] || 'unknown'));
      const feed = (title, qs, answers) => { sec(title); (answers || []).forEach((a, i) => { body((qs[i] || '') + ' ' + a, '#c8c0b0'); }); };
      feed('TESTING FEEDBACK', QUESTIONS.testing, EXIT.testingFeedback);
      feed('ENGINE FEEDBACK', QUESTIONS.engine, EXIT.engineFeedback);
      feed('PROMPT FEEDBACK', QUESTIONS.prompt, EXIT.promptFeedback);
      sec('CREDITS');
      body('The Wire (2002-2008) was created by David Simon and Ed Burns. This is an original demo in its spirit: no characters, scripts or music from the show.');
      body('Engine: my-3D2dge v0.85.1, the handoff package (github.com/michaelcrosato/my-3d2dge). Multiplayer: AI Hub Session Protocol v1 (github.com/michaelcrosato/ai-hub).');
      body('Written and built by Claude (claude-haiku-5-5, reasoning effort medium) for Michael Crosato. Animalese voices and every sound and song are code.');
      body('Press confirm, cancel or Start to return to the title. Up and down scroll.', '#a09888');
      aboutH = y + scroll;
    });
  }
};

/* ---- THE CORNER (Day 1): the stealth district. The stealth kit's layout, its rules, its art, our story ---- */
const CORNER = (() => {
  const T = 16, HP = 3;
  const PAVE = { stones: ['#6e6258', '#665a52', '#746a5e'].map(E.hex), mortar: E.hex('#3a3234'), hi: E.hex('#867a6e'), lo: E.hex('#52464a'), speck: E.hex('#5e5044') };
  const map = new E.TileMap({ rows: [
    '############################',
    '#.......................,,,#',
    '#.AAAA...BBBBB....CCCC...,,#',
    '#.AAAA...BBBBB....CCCC.....#',
    '#.AAAA...BBBBB....CCCC..TT.#',
    '#.AAAA...BBBBB....CCCC..TT.#',
    '#.........................,#',
    '#..,,,.......p.......,,,..,#',
    '#..,,,...............,,,...#',
    '#.DDDD..EEE....FFFFF.......#',
    '#.DDDD..EEE....FFFFF..GGG..#',
    '#.DDDD..EEE....FFFFF..GGG..#',
    '#.@.......................X#',
    '############################'],
    legend: { '#': 1, A: 2, B: 3, C: 4, D: 5, E: 6, F: 7, G: 8, T: 9, p: 10, ',': { floor: 'grass' }, '@': 'hero', X: 'exit' },
    types: {
      1: { h: 64, top: '#3a3448', side: '#5a5068', face: 'brick', roof: 'plain', cut: true, cutH: 6 },
      2: { h: 40, top: '#7a3a2a', side: '#b8a888', face: 'brick', roof: 'tiles', windows: { lit: .3 }, shutters: '#2a4a2a', door: { chance: .4 } },
      3: { h: 48, top: '#5a4a3a', side: '#8a5a3a', face: 'brick', roof: 'slab', windows: { lit: .2 }, balcony: { z: 30, color: '#3a2a1e' } },
      4: { h: 40, top: '#4a5a3a', side: '#a89878', face: 'timber', roof: 'tiles', arch: { chance: .5 }, windows: true },
      5: { h: 24, top: '#6a4a32', side: '#c0b090', face: 'plaster', roof: 'tiles', door: { chance: .5, color: '#4a2a1a' }, windows: { from: 12, lit: .4 } },
      6: { h: 48, top: '#5a5a5a', side: '#6a6a72', face: 'stone', roof: 'plain', windows: { w: 4, h: 12, lit: .15 } },
      7: { h: 40, top: '#7a5a3a', side: '#b8a080', face: 'plaster', roof: 'tiles', windows: true, shutters: '#5a3a2a', balcony: { z: 24 } },
      8: { h: 24, top: '#3a5a32', side: '#a09070', face: 'timber', roof: 'tiles', arch: { chance: .6 } },
      9: { h: 72, top: '#6a5a4a', side: '#968868', face: 'stone', roof: 'plain', windows: { w: 3, h: 10, step: 22, lit: .5 } },
      10: { h: 10, top: '#3a6a34', side: '#4a3a28', face: 'plank', roof: 'leaves' } },
    floorTex: (x, y, tag) => tag === 'grass' ? E.tex.grass(x, y, { base: '#3a5a2a', dark: '#26421e', light: '#4e7a3a' }) : E.tex.flagstone(x, y, PAVE)
  });
  const LEDGER = { x: 11.5 * T, y: 3.5 * T, z: 48 }, EXIT_ = map.find('exit'), GRASS = [];
  const DRESS = [['barrel', 1.5 * T, 1.4 * T, { facing: .4 }], ['barrel', 2.5 * T, 1.3 * T, { facing: 2 }], ['crate', 7.4 * T, 1.4 * T, { scale: .8, facing: .2 }],
    ['cart', 15.5 * T, 1.5 * T, { facing: 0 }], ['sack', 16.9 * T, 1.3 * T, { facing: 1 }], ['barrel', 22.6 * T, 1.4 * T, { facing: 3 }]];
  for (let cy = 0; cy < map.h; cy++) for (let cx = 0; cx < map.w; cx++) if (map.floorAt((cx + .5) * T, (cy + .5) * T) === 'grass') GRASS.push([(cx + .5) * T, (cy + .5) * T]);
  const BOOK = E.sprite(['.bbbb.', 'bBBBBb', 'bBwwBb', 'bBBBBb', '.bbbb.'], { b: '#2a1a10', B: '#6a4a2a', w: '#e8d8b0' });
  const ROUTES = [
    [[19.5, 3.5, 40], [21.5, 3.5, 40], [21.5, 5.5, 40], [18.5, 5.5, 40]],
    [[6.5, 6.5, 0], [20.5, 6.5, 0], [20.5, 8.5, 0], [6.5, 8.5, 0]],
    [[11.5, 12.2, 0], [20.5, 12.2, 0], [20.5, 8.2, 0], [11.5, 8.2, 0]]
  ];
  let hero, rig, guards, attack, checkpoint, ledger, won, over, hp, hurtT, alertT, attract, round, flow, aiT, sinceReport, ledgerAt, guardDowns, ended;
  const inGrass = b => b.z < 2 && map.floorAt(b.x, b.y) === 'grass';

  function makeGuard(route, i) {
    const [x, y, z] = route[0];
    const g = new E.Mover({ x: x * T, y: y * T, z, r: 5, run: 70, walk: 30, climbMax: 56, hopMax: 56 });
    Object.assign(g, { i, route: route.map(p => [p[0] * T, p[1] * T]), at: 1, mind: new E.Suspicion({ rise: 1.6, decay: .25, forget: 7 }), hp: 2, stun: 0, dead: false,
      flow: new E.FlowField(map, { climb: 56, drop: 56, jump: 60 }), wait: 0, hit: null, swing: new E.Attack('overhead', { wind: .38, recover: .3, reach: 9 }), bark: 0,
      rig: new E.Humanoid({ size: 1.2, build: 'heroic', hat: 'cap', armor: false, weapon: 'sword', colors: { cloth: ['#7a2a2a', '#3a4a6a', '#5a4a2a'][i], metal: '#b8b8c0' } }) });
    return g;
  }
  function guardUpdate(g, dt) {
    if (g.dead) return;
    if (g.stun > 0) { g.stun -= dt; g.update(dt, map, { move: [0, 0] }); return; }
    const seen = hero && !over ? E.sees(g, hero, { map, range: 110, fov: 1.5 }) : { seen: false, exposure: 0 }, st = g.mind.update(dt, seen, hero);
    if (g.mind.changed && st === 'alert') { A.sfx('select'); g.bark = 1.2; }
    let goal = null, speed = 'walk';
    if (st === 'alert') { goal = hero; speed = 'run'; }
    else if (st === 'search' && g.mind.last) goal = g.mind.last;
    else if (st === 'notice') { g.facing = E.approachAng(g.facing, Math.atan2(g.mind.last.y - g.y, g.mind.last.x - g.x), dt * 3); g.update(dt, map, { move: [0, 0] }); return; }
    else { const p = g.route[g.at]; goal = { x: p[0], y: p[1], z: 0 }; if (Math.hypot(p[0] - g.x, p[1] - g.y) < 8) { g.at = (g.at + 1) % g.route.length; g.wait = .8; } }
    if (g.wait > 0 && st === 'calm') { g.wait -= dt; g.update(dt, map, { move: [0, 0] }); return; }
    const d = Math.hypot(hero.x - g.x, hero.y - g.y), near = st === 'alert' && d < 20 && E.sameLevel(g, hero, 10);
    if (near && !g.swing.busy && !hero.action) { g.facing = Math.atan2(hero.y - g.y, hero.x - g.x); g.swing.start(); A.sfx('swing', { vol: .5 }); }
    const began = g.swing.update(dt);
    if (g.swing.busy) { g.update(dt, map, { move: [0, 0] }); if (g.swing.active && began === 'active') strikeHero(g); return; }
    let move = [0, 0], jump = false;
    if (goal) {
      g.flow.update(goal.x, goal.y);
      const nx = g.flow.next(g.x, g.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - g.x, ty - g.y) || 1;
      if (Math.hypot(goal.x - g.x, goal.y - g.y) > 6) move = [(tx - g.x) / l, (ty - g.y) / l];
      if (nx && g.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < g.r + 4) { jump = true; g.facing = Math.atan2(ty - g.y, tx - g.x); }
    }
    if (speed === 'walk') move = move.map(v => v * .5);
    g.update(dt, map, { move, sprint: false, jumpPressed: jump });
  }
  function strikeHero(g) {
    if (attract) return;   // the attract run cannot be hurt
    if (!E.inArc(g, g.facing, hero, 20, 1.2, 10) || (hero.action && hero.action.invulnerable)) return;
    if (game.input.down('block') && !hero.action) { A.sfx('hit', { vol: .4 }); P.sparks(hero.x, hero.y, hero.z + 16, 6, g.facing + Math.PI); return; }
    hp--; hurtT = .4; game.hitFx(hero.x, hero.y, hero.z + 16, { power: 1, angle: g.facing, sound: 'hurt' }); E.knockback(g, hero, 140);
    if (hp <= 0) lose();
  }

  function enter(data) {
    attract = !!(data && data.attract); round = inSession;
    const s = map.find('hero');
    hero = new E.Mover({ x: s.x, y: s.y, r: 5, climbAny: true, climbMax: 30 }); hero.facing = 0;
    rig = rig || new E.Humanoid({ size: 1.2, build: 'heroic', hood: true, weapon: 'sword', bladeLen: 7, outfit: 'coat', sleeves: 'long', cape: { len: 6, width: 5, seg: 2.4 }, colors: { cloth: '#8a8270', coat: '#6a6258', cape: '#4a2a2a', capeIn: '#2a1414', pants: '#2a2a32', metal: '#c0c0c8' } });
    attack = new E.Attack('slash', { reach: 9 }); guards = ROUTES.map(makeGuard);
    flow = new E.FlowField(map, { climb: 30, drop: 56, jump: 60 });
    checkpoint = null; ledger = false; won = false; over = false; hp = HP; hurtT = 0; alertT = 0; aiT = 0; sinceReport = 0; ledgerAt = null; guardDowns = 0; ended = false;
    game.follow(hero, { z: 18 }); game.cam.bounds = v => map.bounds(v); game.cam.offset = [0, -10];
    L.enabled = !!(window.matchMedia && matchMedia('(pointer: fine)').matches); L.ambient = .6;
    A.music(CORNER_SONG); A.layer('chase', 0, .02); A.layer('alarm', 0, .02);
    if (attract) say2('DEMO', 'Any button takes over');
    else if (round) say2('Day one, the Corner', 'Go on the start of the round');
    else say2('Steal the notebook', 'It lies on the brick roof');
  }
  function respawnAt(cp) {
    Object.assign(hero, { x: cp.x, y: cp.y, z: cp.z, vx: 0, vy: 0, vz: 0, onGround: true, action: null }); hp = HP;
    guards.forEach((g, i) => { if (!g.dead) { const [x, y, z] = ROUTES[i][0]; Object.assign(g, { x: x * T, y: y * T, z, vx: 0, vy: 0, vz: 0, at: 1, stun: 0, action: null }); g.mind.reset(); g.swing.cancel(); } });
    game.cam.snap = true; say2('Back at the checkpoint');
  }
  function lose() {
    if (attract) return;
    if (checkpoint) { A.sfx('die'); respawnAt(checkpoint); return; }
    over = true; report(false);
    game.after(.8, () => go('over', { from: 'corner' }));
  }
  function takedown() {
    for (const g of guards) {
      if (g.dead || g.action) continue;
      const dz = hero.z - g.z, d = Math.hypot(g.x - hero.x, g.y - hero.y);
      if (dz > 14 && d < 44 && hero.onGround) return [g, true];
      const behind = Math.abs(E.angDiff(g.facing, Math.atan2(g.y - hero.y, g.x - hero.x))) < 1.1;
      if (E.sameLevel(hero, g) && d < 18 && behind && g.mind.state !== 'alert') return [g, false];
    }
    return null;
  }
  function tryTakedown() { const t = takedown(); if (!t) return false; hero.play('takedown', { other: t[0], aerial: t[1], map }); t[0].dead = true; t[0].action = hero.action; A.sfx('punch'); game.freeze(.06); guardDowns++; return true; }
  const parrying = () => guards.some(g => !g.dead && g.swing.phase === 'wind' && g.swing.u > .35 && Math.hypot(g.x - hero.x, g.y - hero.y) < 26);

  // the attract run's AI: the notebook, then the alley; it jumps up what it reaches and leaves the guards alone
  function aiInput(dt) {
    const goal = ledger ? EXIT_ : LEDGER;
    flow.update(goal.x, goal.y);
    const nx = flow.next(hero.x, hero.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - hero.x, ty - hero.y) || 1;
    const move = Math.hypot(goal.x - hero.x, goal.y - hero.y) > 6 ? [(tx - hero.x) / l, (ty - hero.y) / l] : [0, 0];
    const jump = !!(nx && hero.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < hero.r + 4);
    return { move, sprint: true, jumpPressed: jump };
  }

  function heroUpdate(dt) {
    const I = inSession && AIHubTime() < 0 ? null : (attract ? null : game.input);
    const pin = attract ? aiInput(dt) : (I ? heroInput() : null);
    hero.exposure = inGrass(hero) && hero.crouch ? 0 : 1;
    if (!attract && I) {
      if (I.pressed('dodge') && hero.dodge(undefined, 34)) A.sfx('whoosh');
      else if (I.pressed('attack') && !tryTakedown() && attack.start()) { I.consume('attack'); A.sfx('swing'); }
    }
    attack.update(dt);
    attack.hits(guards.filter(g => !g.dead), g => E.inArc(hero, hero.facing, g, 20, 1.3, 10), g => {
      game.hitFx(g.x, g.y, g.z + 16, { power: g.stun > 0 ? 2 : 1, angle: hero.facing }); E.knockback(hero, g, 90);
      if (g.stun > 0 || --g.hp <= 0) { g.dead = true; g.action = null; guardDowns++; A.sfx('die', { vol: .5 }); } else g.mind.level = 1.2;
    });
    if (!attract && I) {
      I.touchSet('attack', !hero.action && takedown() ? 'TAKE DOWN' : null); I.touchSet('block', parrying() ? 'PARRY' : null);
      if (I.pressed('block')) for (const g of guards) if (!g.dead && g.swing.phase === 'wind' && g.swing.u > .35 && Math.hypot(g.x - hero.x, g.y - hero.y) < 26) {
        g.swing.cancel(); g.stun = 1.3; A.sfx('kick'); game.flash('#ffffff', .08); P.sparks(g.x, g.y, g.z + 18, 10, hero.facing); say2('Parried');
      }
    }
    const input = attack.busy ? { move: [0, 0] } : (attract ? pin : (pin || I));
    hero.update(dt, map, input);
    if (hero.hurt && !attract) { hp--; hurtT = .4; game.shake(3); if (hp <= 0) lose(); }
    if (hero.inHazard) hero.respawn();
    if (!ledger && E.dist(hero, LEDGER) < 12) { ledger = true; ledgerAt = AIHubTime(); checkpoint = { x: hero.x, y: hero.y, z: hero.z }; A.sfx('powerup'); say2('Checkpoint', 'Notebook in hand. Now the east alley'); }
    if (ledger && !won && Math.hypot(hero.x - EXIT_.x, hero.y - EXIT_.y) < 14 && hero.z < 2) { won = true; win(); }
  }

  function win() {
    A.music('victory'); report(true);
    if (attract) { game.after(3, () => go('corner', { attract: true })); return; }
    if (round) return;   // the round's result went to the hub; the hub shows the scores
    const alive = guards.filter(g => !g.dead).length, top = best('corner', alive);
    ui.show('results', { kicker: 'Day one', title: 'The notebook is out', stats: [[String(alive), 'corner boys who never went down'], [String(top), 'the best yet'], [String(HP - hp), 'wounds taken']],
      actions: [{ label: 'Day two: the Wire Room', primary: true, fn: () => { ui.hide(); go('wire'); } }, { label: 'Back to the title', fn: () => { ui.hide(); go('title'); } }] });
  }
  // session reporting: a time for a win, a score (progress) for a loss: lower time ranks first, then higher score
  function report(won_) {
    if (!inSession || ended) return;
    ended = true;
    if (won_) HUB.result({ time: HUB.time(), stats: { 'Guards down': guardDowns }, awards: [] });
    else HUB.result({ score: ledger ? 100 : 0 });
  }
  function AIHubTime() { return inSession ? HUB.time() : 0; }

  function hud() {
    const k = a => game.input.label(a).toUpperCase(), pad = game.input.lastDevice === 'gamepad', td = !hero.action && takedown();
    const started = inSession ? AIHubTime() >= 0 : true;
    if (attract) { ui.hud({ status: { text: 'DEMO', color: '#ffd36a' }, objective: { step: 'DEMO', title: ledger ? 'Out the alley' : 'Get the notebook', text: 'Any button takes over', at: ledger ? EXIT_ : LEDGER, from: hero } }); return; }
    ui.hud(won || over ? {} : {
      objective: ledger ? { step: '02 / 03', title: 'Out the east alley', text: 'Down in the street, the far end', at: { x: EXIT_.x, y: EXIT_.y, z: 0 }, from: hero }
        : { step: '01 / 03', title: 'Get the notebook', text: 'On the brick roof of the stash house', at: LEDGER, from: hero },
      status: !started ? { text: 'Waiting for the round', color: '#ffd36a' } : hero.exposure === 0 ? { text: 'Hidden', color: '#9ae89a' } : alertT > 0 ? { text: 'Hunted', color: '#ff4a3a' } : hero.crouch ? 'Crouched' : null,
      bars: [{ label: 'Health', value: hp, max: HP, kind: 'pips', color: '#e8505a' }], counts: [['Corner boys down', guards.filter(g => g.dead).length]],
      prompt: touch() ? null : td ? { act: 'attack', label: 'Take down', hint: td[1] ? 'From above' : 'From behind' } : parrying() ? { act: 'block', label: 'Parry' } : null,
      keys: [[pad ? 'STICK' : ['up', 'left', 'down', 'right'].map(k).join(''), 'Move'], [k('sprint'), 'Sprint'], [k('jump'), 'Jump, climb'], [k('crouch'), 'Crouch'], [k('attack'), 'Strike'], [k('block'), 'Block'], [k('dodge'), 'Roll']]
    });
  }
  const touch = () => game.input.lastDevice === 'touch';

  function update(dt) {
    if (roundEnded) return;
    if (round && AIHubTime() < 0) { // the countdown: the street is set, nobody moves
      rig.update(dt, hero.rigState({})); hud(); return;
    }
    if (hurtT > 0) hurtT -= dt;
    if (attract && userInput()) { go('title'); return; }
    if (attract && (aiT += dt) > 100) { go('corner', { attract: true }); return; }
    if (won || over) { hud(); rig.update(dt, hero.rigState({ pose: won ? 'cheer' : null })); return; }
    heroUpdate(dt);
    for (const g of guards) guardUpdate(g, dt);
    const alert = guards.some(g => !g.dead && g.mind.state === 'alert');
    if (alert !== alertT > 0) { alertT = alert ? 1 : 0; A.layer('chase', alert ? 1 : 0, alert ? .4 : 2.5); A.layer('alarm', alert ? 1 : 0, alert ? .8 : 2.5); }
    rig.update(dt, hero.rigState({ attack: attack.state, pose: !attract && game.input.down('block') && !hero.action ? 'block' : null, hurt: hurtT > 0 }));
    for (const g of guards) {
      if (g.dead) { g.rig.update(dt, g.action && g.action.other === g ? g.action.otherState() : { x: g.x, y: g.y, z: g.z, facing: g.facing, down: 1 }); continue; }
      g.rig.update(dt, g.rigState({ attack: g.swing.state, stance: g.mind.state === 'alert' ? 'ready' : null, hurt: g.stun > 0 }));
      if (g.bark > 0) g.bark -= dt;
    }
    sinceReport += dt;
    if (round && sinceReport > 1) { sinceReport = 0; HUB.progress({ score: (ledger ? 100 : 0) + guardDowns * 10, label: ledger ? 'Notebook in hand' : 'Looking for the notebook' }); }
    hud();
  }

  const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
  const LAMPS = [[8.5, 6.2], [16, 8.8], [23.5, 6.2], [12.5, 10.5], [19.5, 1.3]].map(([x, y]) => [x * T, y * T]);
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    for (const [x, y] of GRASS) r.prop('grass', x, y, 0, { size: 1.3 });
    for (const [id, x, y, o] of DRESS) r.shape(id, x, y, 0, o);
    for (const [x, y] of LAMPS) r.prop('lamp', x, y, 0, { light: true });
    if (!ledger) L.add(LEDGER.x, LEDGER.y, LEDGER.z + 6, 40, .8, { color: '#ffd060' }); else L.add(EXIT_.x, EXIT_.y, 12, 56, .9, { color: '#80e0ff' });
    const bx = 25 * T, by = 5 * T, w = 21, H = 20, z = 72;
    r.queue(bx, by, z, g => { const P2 = (x, y, zz) => r.w(x, y, zz), c = [P2(bx - w, by - w, z), P2(bx + w, by - w, z), P2(bx + w, by + w, z), P2(bx - w, by + w, z)], tip = P2(bx, by, z + H);
      for (let i = 0; i < 4; i++) px.poly(g, [c[i], c[(i + 1) % 4], tip], ['#5a3a2a', '#7a4a32', '#4a2a22', '#6a3a2a'][i]);
      px.line(g, tip[0], tip[1], tip[0], tip[1] - 6, '#c8b060'); }, { footprint: [bx - w, by - w, bx + w, by + w] });
    for (const g of guards) if (!g.dead) r.sightCone(g, { map, range: 110, fov: 1.5, color: MOOD[g.mind.state], alpha: g.mind.state === 'calm' ? .22 : .38 });
    if (!ledger) r.sprite(LEDGER.x, LEDGER.y, LEDGER.z + 4 + Math.sin(game.time * 3) * 1.5, BOOK, { glow: .6 });
    const shadow = b => r.shadow(b.x, b.y, 6, .35, undefined, map.groundAt(b.x, b.y, b.r, b.z));
    shadow(hero); r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: { actors: true }, flash: hurtT > 0, alpha: hero.exposure === 0 ? .55 : 1 });
    for (const g of guards) { shadow(g); r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { flash: g.stun > 0 && Math.floor(game.time * 10) % 2 === 0 }); }
    r.marker(ledger ? EXIT_.x : LEDGER.x, ledger ? EXIT_.y : LEDGER.y, ledger ? 0 : LEDGER.z, { label: ledger ? 'EAST ALLEY' : 'NOTEBOOK', color: ledger ? '#80e0ff' : '#ffd040' });
    r.overlay(g => {
      for (const gd of guards) if (!gd.dead && gd.mind.state !== 'calm') {
        const [sx, sy] = r.w(gd.x, gd.y, gd.z + 46), a = gd.mind.state === 'alert';
        E.font.text(g, a ? '!' : '?', Math.round(sx), Math.round(sy) - 8, MOOD[gd.mind.state], { align: 'center', shadow: '#000' });
        E.ui.bar(g, Math.round(sx) - 6, Math.round(sy) + 2, 12, 2, Math.min(1, gd.mind.level), MOOD[gd.mind.state]);
      }
    });
  }
  return { view: 'iso', views: ['iso', 'threequarter'], input: 'THIRDPERSON', res: 'ps1', pausable: true, touch: ['jump', 'attack', 'block', 'crouch'],
    camera: { zoom: [.75, 2], rotate: true }, enter, update, draw,
    timeUp: () => { if (round && !won) report(false); },
    exit() { game.cam.offset = null; L.enabled = false; if (ui) ui.hud({}); } };
})();
scenes.corner = CORNER;

/* ---- THE WIRE ROOM (Day 2): six calls, flag the lines that matter. Keywords are the Corner's words. ---- */
const WIRE = (() => {
  const KEYWORDS = ['corner', 'thursday', 'package', 're-up'];
  // [speaker index, text]; the line '@ENV' is the envelope's line: real if taken on the desk, a decoy if left
  const CALLS = [
    { ppl: ['Dre', 'Girl'], lines: [[0, 'Yo, you still at the store?'], [0, 'Naw, I\'m on the corner, come get the sneakers.'], [1, 'Tell your mother the car\'s fixed.'], [0, 'Thursday, after church, I\'m bringing your cousin.']] },
    { ppl: ['Girl', 'Pooh'], lines: [[1, 'He said the package come in late.'], [0, 'Tell him I don\'t want to wait on no bus.'], [1, 'Bus ain\'t running till Friday, the corn in the freezer is fine.'], [0, 'Okay. Bye.']] },
    { ppl: ['Lt. Cole', 'Ray'], lines: [[0, 'Overtime\'s approved for the detail. Same as last month.'], [1, 'Pay it out in the envelope, not the check.'], [0, '@ENV'], [1, 'Don\'t put it on the book, I\'ll handle the book.']] },
    { ppl: ['Pooh', 'Dre'], lines: [[0, 'Re-up come Monday, not Thursday, the old man said.'], [1, 'Cool. You want the usual at the dog shop?'], [0, 'Naw, I\'m good. Tell Ray the boat\'s on the wharf.'], [1, 'Boat on the wharf. Got it.']] },
    { ppl: ['Ray', 'Lt. Cole'], lines: [[0, 'Who is that on the stoop with the cap?'], [1, 'Pooh\'s cousin, he don\'t matter. Log the plate.'], [0, 'Logged. He\'s got the package under his arm.'], [1, 'Then he matters. Put it in the book.']] },
    { ppl: ['Girl', 'Ray'], lines: [[1, 'You ain\'t been to the funeral, you ain\'t been nowhere.'], [0, 'Thursday. I\'ll be there Thursday.'], [1, 'Don\'t bring the corner boys in the chapel.'], [0, 'I\'m bringing my mother. That\'s it.']] }
  ];
  const TOTAL_HOT = () => KEYWORDS.length;
  const hot = t => KEYWORDS.some(k => t.toLowerCase().includes(k)) || (t.toLowerCase().includes('envelope') && envelope);
  const bg = new E.Backdrop({ sky: ['#0a0808', '#1a1410', '#2a1e16'], moon: { x: .8, y: .2, r: 10, color: '#e8d0a0' }, stars: 14,
    layers: [{ kind: 'city', color: '#17110e', y: .78, height: .25, parallax: .2, seed: 4 }] });
  let S;   // the state: call index, lines revealed, typing, the flags of this call, the cursor, the totals
  const fresh = () => ({ call: 0, shown: 0, typed: 0, wait: 0, cur: 0, flags: [], phase: 'talk', hits: 0, misses: 0, falses: 0, done: false, pause: 0 });
  const callLines = c => c.lines.map(([p, t]) => [p, t === '@ENV' ? (envelope ? 'Pay it out in the envelope, the lawyer said, not on the book.' : 'Leave the boat on the wharf, don\'t say nothing about the desk.') : t]);
  let calls = [];
  // the mouse: hover moves the cursor to the line under it, a click flags that line (rows are the last frame's layout)
  let rows = [], ptr = null, ptrMoved = false, clickNow = false;
  // page pixels to the picture's pixels: the canvas rectangle, its pixels per page pixel, the letterbox (OX, OY) and the scale
  const toScreen = e => { const S = game.screen, c = S.canvas, r = c.getBoundingClientRect(), k = c.width / r.width;
    return [((e.clientX - r.left) * k - S.OX) / S.S, ((e.clientY - r.top) * k - S.OY) / S.S]; };
  addEventListener('pointermove', e => { ptr = toScreen(e); ptrMoved = true; });
  addEventListener('pointerdown', e => { ptr = toScreen(e); clickNow = true; });
  function enter() {
    S = fresh(); calls = CALLS.map(c => ({ ...c, lines: callLines(c) }));
    A.music(WIRE_SONG); L.enabled = false; game.follow(null); game.focus(0, 0, 0); ui.hud({});
    say2('Day two', 'Headphones on. Flag what is real.');
  }
  const pitchOf = (i) => [1, 1.35, .8, 1.1, .92, 1.2][i % 6];
  function blip(p) { A.sfx({ wave: 'square', freq: 230 * p * (.85 + Math.random() * .4), to: 180 * p, dur: .04 }, { vol: .09 }); }
  function score() {
    const c = calls[S.call];
    c.lines.forEach(([, t], i) => {
      const h = hot(t), f = !!S.flags[i];
      if (h && f) S.hits++; else if (!h && f) S.falses++; else if (h && !f) S.misses++;
    });
  }
  function finish() {
    S.done = true;
    const kw = S.hits + S.misses, acc = kw ? S.hits / kw : 0;
    const grade = acc >= .85 && S.falses <= 1 ? 'Detail\'s ear' : acc >= .6 ? 'Pile of tapes' : 'Back on the stoop';
    const line = acc >= .85 && S.falses <= 1 ? 'The lieutenant reads your sheet twice. Good.' : acc >= .6 ? 'Half of it was the wrong half. Learn the difference.' : 'You flagged the weather. Go back on the corner.';
    const pct = Math.round(acc * 100);
    best('wire', pct);
    ui.show('results', { kicker: 'Day two', title: grade, text: line, stats: [[String(S.hits), 'real lines flagged'], [String(S.misses), 'real lines missed'], [String(S.falses), 'innocent lines flagged']],
      actions: [{ label: 'Back to the title', primary: true, fn: () => { ui.hide(); go('title'); } }] });
  }
  function update(dt) {
    if (S.done) return;
    const c = calls[S.call], I = game.input;
    if (S.phase === 'talk') {
      const L2 = c.lines[S.shown];
      if (!L2) { S.phase = 'wait'; S.wait = 0; return; }
      const text = L2[1];
      if (S.typed < text.length) {
        const before = Math.floor(S.typed); S.typed = Math.min(text.length, S.typed + dt * 26);
        const after = Math.floor(S.typed);
        if (after > before && /[a-z]/i.test(text[after - 1] || '') && after % 2 === 0) blip(pitchOf(L2[0]));
      } else {
        S.pause += dt;
        if (S.pause > 1.1) { S.pause = 0; S.typed = 0; S.shown++; }
      }
    } else if (S.phase === 'wait') {
      S.wait += dt;
      if (S.wait > 4) { score(); S.call++; S.flags = []; S.shown = 0; S.typed = 0; S.cur = 0; S.phase = 'talk'; S.pause = 0;
        if (S.call >= calls.length) { finish(); return; } say2('Next call', 'Call ' + (S.call + 1) + ' of ' + calls.length); }
    }
    if (S.phase !== 'wait' || S.wait < 4) {
      const top = Math.min(S.shown, c.lines.length - 1);   // the line on the tape now, and every line before it, can be flagged
      if (I.pressed('up')) S.cur = Math.max(0, S.cur - 1);
      if (I.pressed('down')) S.cur = Math.min(top, S.cur + 1);
      S.cur = Math.min(S.cur, top);
      if (I.pressed('confirm') && S.cur <= top) { S.flags[S.cur] = !S.flags[S.cur]; A.sfx('select', { vol: .5 }); }
      if (ptr) {
        const hit = rows.find(q => ptr[0] >= q.x && ptr[0] <= q.x + q.w && ptr[1] >= q.y && ptr[1] <= q.y + q.h);
        if (hit && hit.i <= top) {
          if (ptrMoved) S.cur = hit.i;
          if (clickNow) { S.flags[hit.i] = !S.flags[hit.i]; A.sfx('select', { vol: .5 }); }
        }
      }
      if (I.pressed('confirm') || I.pressed('cancel')) I.consumeAll();
    }
    ptrMoved = false; clickNow = false;
  }
  function draw(r) {
    bg.draw(r);
    const c = calls[S.call] || { lines: [], ppl: [] };
    const w = Math.min(r.W - 24, 360), x0 = Math.round(r.W / 2 - w / 2), y0 = Math.max(10, Math.round(r.H / 2 - 92));
    r.overlay(g => {
      E.ui.box(g, x0, y0, w, 184, { bg: ['#1c1510', '#0c0a08'], border: '#6a5a40' });
      E.font.text(g, 'WIRE ROOM - CALL ' + Math.min(S.call + 1, calls.length) + ' OF ' + calls.length, x0 + 10, y0 + 8, '#e8c070', { shadow: '#000', outline: false });
      E.font.text(g, 'FLAGS ' + S.hits + ' hit  ' + S.falses + ' false', x0 + w - 10, y0 + 8, '#c8c0b0', { align: 'right', shadow: '#000', outline: false });
      let y = y0 + 26;
      rows = [];
      const shownN = Math.min(S.shown, c.lines.length);
      for (let i = 0; i < c.lines.length; i++) {
        const [p, t] = c.lines[i];
        if (i > shownN) break;
        const cur = i === S.cur && i <= Math.min(S.shown, c.lines.length - 1);
        if (cur) E.ui.box(g, x0 + 6, y - 3, w - 12, 30, { bg: '#3a2a18', border: '#c8a060', gradient: false });
        const sh = i === S.shown ? t.slice(0, Math.floor(S.typed)) : t;
        const tag = (c.ppl[p] || '') + ': ';
        const h = E.font.text(g, tag + sh, x0 + 12, y, cur ? '#fff3d0' : '#d8d0c0', { wrap: w - 60, shadow: '#000', outline: false });
        if (S.flags[i]) E.font.text(g, 'FLAG', x0 + w - 12, y, '#ff5a4a', { align: 'right', shadow: '#000', outline: false });
        const rh = Math.max(12, (h && h.h) || 12) + 8;
        rows.push({ i, x: x0 + 6, y: y - 3, w: w - 12, h: rh - 2 });
        y += rh;
      }
      const hint = I_LABEL('up') + I_LABEL('down') + 'line    ' + I_LABEL('confirm') + 'flag, or click a line. Look for: the corner, Thursday, the package, the re-up.';
      E.font.text(g, S.phase === 'wait' ? 'Call done. Next in a moment.' : hint, x0 + 10, y0 + 164, '#a09888', { wrap: w - 20, shadow: '#000', outline: false });
    });
  }
  const I_LABEL = a => game.input.label(a).toUpperCase() + ' ';
  return { state: () => ({ S, calls, hot, rows }), view: 'side', views: ['side'], input: 'DEFAULT', res: 'ps1', enter, update, draw,
    exit() { ui.hud({}); } };
})();
scenes.wire = WIRE;

/* ---- GAME OVER: the Corner lost. In a session the round is over: the page waits for the hub. ---- */
const overBg = new E.Backdrop({ sky: ['#120a08', '#2a1410', '#4a2418'], moon: { x: .5, y: .3, r: 16, color: '#d8b090' }, stars: 24,
  layers: [{ kind: 'mountains', color: '#1e1010', y: .72, height: .3, parallax: 0 }, { kind: 'fog', color: '#6a4a3a', y: .9, height: .12, parallax: 0, drift: 4 }] });
const overMenu = inSession ? null : new E.Menu(game, ['Retry', 'Title'], { y: 118, onPick: i => go(i === 0 ? 'corner' : 'title') });
scenes.over = {
  view: 'side', input: 'DEFAULT', res: 'ps1',
  enter(d) { if (overMenu) { overMenu.from = d.from; overMenu.i = 0; } A.music(null); A.sfx('die'); game.follow(null); game.focus(0, 0, 0); L.enabled = false; ui.hud({}); },
  update(dt) {
    if (overMenu) { if (!overMenu.update(dt) && game.input.pressed('start')) { game.input.consumeAll(); overMenu.onPick(overMenu.i, overMenu.items[overMenu.i]); } }
    else if (game.input.pressed('confirm') || game.input.pressed('cancel')) game.input.consumeAll();
  },
  back() { go('title'); return true; },
  draw(r) {
    const y = Math.round(r.H / 2) - 60;
    overBg.draw(r); r.overlay(g => E.font.title(g, 'GAME OVER', r.W / 2, y, { align: 'center', scale: 4, colors: ['#ffe0d0', '#ff8a6a', '#a02a20'], depthColor: '#3a0810' }));
    if (overMenu) { overMenu.y = y + 58; overMenu.draw(r); }
    else r.text('Your round is over. Waiting on the other players.', r.W / 2, y + 70, '#e8d8c0', { align: 'center', shadow: '#000', outline: false });
  }
};

/* ---- START: the title, or straight into a session's round (the page stays; the hub starts and ends it) ---- */
if (inSession) {
  HUB.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) return;   // no hub after all: the game runs on its own
    HUB.on('time-up', () => { const c = scenes.corner; if (c && c.timeUp) c.timeUp(); });
    HUB.on('end', () => { roundEnded = true; game.audio.stopMusic(.1); });
    HUB.ready();         // the Corner is loaded: the hub's card starts the round
  });
}
game.start({ scenes, scene: inSession ? 'corner' : 'title' });
window.__game = { game, scenes, titleMenu, WIRE, ui, talk, heroMove: () => heroInput().move(), get envelope() { return envelope; } };
})();
/* =============================== GAME END =============================== */
