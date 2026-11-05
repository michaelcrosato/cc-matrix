// MAD MASTERS: a spiritual successor to Mad Men (2007-2015), built on my-3D2dge.
// An account man at Carrow & Dade in 1960s Manhattan: see Hollis about the Wren, gather three insights from the office,
// take a drink or a light at the bar, then pitch in the conference room. Scenes: title, play (threequarter, with topdown
// and iso as alternatives), pitch (a timing reel), end, credits. Idle attract mode plays the whole day with a cheating AI.
// Standard features (pause, settings, controls, full screen) come from the engine. Extra settings: invert the horizontal
// and vertical axes, and Xbox button symbols. Multiplayer: AI Hub parallel mode (session.js), standalone otherwise.
(() => {
const E = My3D2dge;
const AH = window.AIHub || null;
const TOUCH_ONLY = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
const IDENT = { screenDirToGround: (x, y) => [x, y] };   // an AI's intent is already a ground direction
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = label => (AH && AH.active) ? AH.rng(label) : Math.random();

// ---------- engine setup ----------
const game = new E.Game({
  canvas: 'screen', res: 'snes', expand: true,
  view: 'threequarter', views: ['threequarter', 'topdown', 'iso'],
  menu: {
    settings: [
      { key: 'invertX', label: 'Invert horizontal', value: false },
      { key: 'invertY', label: 'Invert vertical', value: false },
      { key: 'xbox', label: 'Xbox button symbols (A B X Y)', value: false },
      { key: 'idleDemo', label: 'Idle demo after 10 s', value: true }
    ],
    controls: { jump: false, attack: false, block: false, dodge: false, use: false, crouch: false,
      interact: 'Talk, look, take', sprint: 'Hurry', map: 'Change view' },
    quit: 'title'
  }
});
game.input.touchEnabled = false;   // no touch controls: a controller or keyboard is required
const ui = new E.Shell(game);
const talk = new E.Dialog(game, { speed: 46 });
const syncGlyphs = () => { game.input.glyphs = game.settings.xbox ? 'xbox' : 'playstation'; };

// voices: Animalese-style chirps (synth blips per letter, pitched per speaker), no recorded speech
const VOICES = {
  hollis: { wave: 'triangle', freq: 190, to: 150 }, ruth: { wave: 'pulse', freq: 520, to: 430 },
  teddy: { wave: 'square', freq: 300, to: 262 }, maren: { wave: 'pulse12', freq: 600, to: 520 },
  gil: { wave: 'triangle', freq: 232, to: 200 }
};
for (const [k, v] of Object.entries(VOICES)) game.audio.define('voice-' + k, { wave: v.wave, freq: v.freq, to: v.to, dur: .045, vol: .08 });

// ---------- music: code-written lounge and tension loops (16 steps = one bar) ----------
const LOUNGE = { bpm: 96, steps: 4, tracks: [
  { wave: 'triangle', vol: .24, notes: 'C2 . . . G2 . . . A2 . . . E2 . . .' },
  { wave: 'sine', vol: .08, notes: 'E4 - G4 . B4 . C5 - B4 . G4 - E4 . . .' },
  { wave: 'triangle', vol: .05, notes: 'C3 E3 G3 B3 A3 C4 G3 E3 F3 A3 C4 E4 D3 F3 A3 C4' },
  { wave: 'drums', vol: .4, notes: 'k . . h s . h . k . . h s . h .' }
] };
const TENSE = { bpm: 110, steps: 4, tracks: [
  { wave: 'saw', vol: .12, notes: 'A1 . . . A1 . . . F1 . . . G1 . . .' },
  { wave: 'pulse', vol: .06, notes: 'A3 . C4 . E4 . A4 . G4 . F4 . E4 . C4 .' },
  { wave: 'drums', vol: .35, notes: 'k . h . k . h . k . h h k . s .' }
] };

// ---------- the agency floor: a TileMap of rooms, drawn from a grid so the walls can't drift ----------
const COLS = 28, ROWS = 20;
const G = Array.from({ length: ROWS }, () => Array(COLS).fill('#'));
const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y][x] = ch; };
fill(1, 1, 16, 11, ',');    // the bullpen (carpet)
fill(1, 13, 6, 18, '.');    // the lobby (marble)
fill(8, 13, 16, 18, 'b');   // the bar
fill(18, 1, 26, 5, '=');    // Hollis's office (wood)
fill(18, 7, 26, 11, ',');   // the conference room (carpet)
fill(18, 13, 26, 18, 'b');  // the lounge
for (const [x, y, ch] of [[17, 3, '='], [17, 9, ','], [17, 15, 'b'], [22, 6, ','], [22, 12, 'b'], [4, 12, '.'], [12, 12, 'b'], [7, 16, '.']]) G[y][x] = ch;   // doors
G[16][5] = '@'; G[14][3] = 'R'; G[4][7] = 'T'; G[8][11] = 'M'; G[2][22] = 'H'; G[9][22] = 'P'; G[15][12] = 'G';   // spawns
const map = new E.TileMap({
  rows: G.map(r => r.join('')),
  legend: {
    '#': 1, ',': { floor: 'carpet' }, '=': { floor: 'wood' }, '.': { floor: 'lobby' }, 'b': { floor: 'bar' },
    '@': { floor: 'lobby', spawn: 'hero' }, 'R': { floor: 'lobby', spawn: 'ruth' }, 'G': { floor: 'bar', spawn: 'gil' },
    'T': { floor: 'carpet', spawn: 'teddy' }, 'M': { floor: 'carpet', spawn: 'maren' }, 'H': { floor: 'wood', spawn: 'hollis' },
    'P': { floor: 'carpet', spawn: 'pitch' }
  },
  types: { 1: { h: 40, top: '#6a5a4e', side: '#cdbfa6', face: 'plaster', roof: 'slab', cut: true } },
  floorTex(x, y, tag) {
    if (tag === 'lobby') return E.tex.checker(x, y, { a: '#cfc6b4', b: '#3a3530', size: 16 });
    if (tag === 'wood') return E.tex.planks(x, y, { base: '#7a5232', dark: '#5a3a22', line: '#3f2817' });
    if (tag === 'bar') return E.tex.checker(x, y, { a: '#2a2420', b: '#4a2a22', size: 12 });
    return E.tex.plain(x, y, { base: '#5a2a2e', amount: .12 });   // carpet
  },
  outside: '#17110d'
});
const W = (cx, cy) => [cx * 16 + 8, cy * 16 + 8];
// the furniture: shapes from E.SHAPES, solid where they stand
const DRESS = [
  ['table', 3, 2], ['table', 6, 2], ['table', 10, 2], ['table', 14, 2],
  ['table', 3, 6], ['table', 6, 6], ['table', 10, 6], ['table', 14, 6], ['table', 3, 9], ['table', 14, 9],
  ['table', 22, 4], ['bookcase', 25, 2], ['table', 20, 9], ['table', 24, 9],
  ['table', 3, 15], ['table', 12, 16], ['stool', 10, 15], ['stool', 14, 15], ['cart', 14, 18],
  ['bench', 21, 16], ['shelf', 25, 16]
].map(([id, cx, cy]) => [id, ...W(cx, cy)]);
for (const [id, x, y] of DRESS) { map.solid(id, x, y, 0, { facing: 0 }); map.block(Math.floor(x / 16), Math.floor(y / 16), true); }   // blocked cells: the flow fields route round the furniture
// lamps: their glow and a pool of light in each room
const LAMPS = [['lamp', 2, 1], ['lamp', 16, 11], ['lamp', 2, 18], ['lamp', 25, 8], ['lamp', 19, 1], ['lamp', 25, 17], ['lamp', 9, 13], ['candle', 11, 1]];
const LAMP_LIGHTS = [[2, 1], [16, 11], [2, 18], [25, 8], [19, 1], [25, 17], [9, 13]];
const BAR = W(12, 14), PROJECTOR = W(22, 8);

// ---------- characters: Humanoid rigs, dressed for 1962 ----------
const mkRig = o => new E.Humanoid(Object.assign({ size: 1.2, build: 'heroic', weapon: null }, o));
const RIG = {
  hero: () => mkRig({ outfit: 'coat', hair: 'short', colors: { cloth: '#2a2b33', coat: '#2a2b33', pants: '#1d1e24', skin: '#e2b38f', hair: '#2a1f18', trim: '#e8e4da', belt: '#101010' } }),
  hollis: () => mkRig({ outfit: 'coat', hair: 'short', colors: { cloth: '#17181e', coat: '#17181e', pants: '#15161b', skin: '#dcaa84', hair: '#8d8c86', trim: '#eeeae0' } }),
  ruth: () => mkRig({ outfit: 'robe', hair: 'ponytail', colors: { cloth: '#7a2b3a', skin: '#e6bb98', hair: '#5a3a22', trim: '#f4d7c8' } }),
  teddy: () => mkRig({ outfit: 'coat', hair: 'short', colors: { cloth: '#3d4a5a', coat: '#3d4a5a', pants: '#2e3744', skin: '#d6a57f', hair: '#3a2c20' } }),
  maren: () => mkRig({ outfit: 'robe', hair: 'long', colors: { cloth: '#c9b48a', skin: '#f0c7a4', hair: '#a0582c' } }),
  gil: () => mkRig({ outfit: 'shirt', hair: 'short', colors: { cloth: '#f2f0ea', pants: '#1f1d1b', skin: '#b07a52', hair: '#1e1a16', trim: '#2a2420' } })
};
const NAME = { hollis: 'HOLLIS', ruth: 'RUTH', teddy: 'TEDDY', maren: 'MAREN', gil: 'GIL' };
const CAST = {};   // id -> { rig, body, x, y, npc }
for (const id of Object.keys(RIG)) CAST[id] = { rig: RIG[id](), x: 0, y: 0, facing: 0 };
const POS = {};    // spawn tag -> world position
let hero = null, flow = null;

// ---------- state for a day at the agency ----------
let state = null;
function newDay() {
  state = { brief: false, trust: 50, insights: { ruth: null, teddy: null, maren: null }, drinks: 0, nerve: 50, composure: 100, grade: null, score: null };
  hubReported = false; progT = 0;
}
// the table's view of this copy: insights while the day runs, the pitch's score once it is made
function hubReport() {
  if (!AH || !AH.active || !state || attract) return;
  AH.progress({ score: insightCount() * 100, label: insightCount() + ' of 3 insights' });
}
function hubFinish() {
  if (!AH || !AH.active || !state || hubReported) return;
  hubReported = true;
  AH.result({ score: state.score != null ? state.score : insightCount() * 100, stats: { nerve: Math.round(state.nerve), composure: Math.round(state.composure), insights: insightCount() } });
}
const insightsDone = () => !!(state.insights.ruth && state.insights.teddy && state.insights.maren);
const insightCount = () => ['ruth', 'teddy', 'maren'].filter(k => state.insights[k]).length;

function insight(id, text) {
  state.insights[id] = text;
  ui.toast('Insight', text);
  game.audio.sfx('pickup');
}

// what each person says: a list of pages, optional choices and what they lead to
function scriptFor(id) {
  const s = state;
  if (id === 'hollis') {
    if (!s.brief) return {
      lines: ['Calloway. Sit down before you hurt yourself.',
        'Halden Motors is building a small car called the Wren. Four cylinders, a little chrome, and a price a schoolteacher can say out loud.',
        'Their people want a love story about a car. I want them to stop asking what it does.'],
      choices: ['Ask what they are afraid of.', 'Ask what they are selling.'],
      onChoice: i => { s.brief = true; s.trust += i === 0 ? 12 : -4; ui.toast('The Wren', 'Brief received. Get the insights.'); }
    };
    return { lines: ['You have the Halden file. Get me the heart of it. Ruth has the calls, Teddy has the nerve, Maren has the words.'] };
  }
  if (id === 'ruth') {
    if (s.insights.ruth) return { lines: ['Mr. Hollis has asked for you twice. He never asks twice.'] };
    return { lines: ['Mr. Halden called before nine. He said the word "new" six times.', 'A man who says "new" that often is frightened it will not be.'],
      onDone: () => insight('ruth', 'A new car is a promise to be somebody else on Sunday.') };
  }
  if (id === 'teddy') {
    if (s.insights.teddy) return { lines: ['Sell the drive home. The showroom is for people who have already decided.'] };
    return { lines: ['Everybody wants to be young. Nobody wants to look like they are trying.', 'Nobody buys youth. They buy the look of being seen leaving.'],
      onDone: () => insight('teddy', 'Nobody buys youth. They buy the look of being seen leaving.') };
  }
  if (id === 'maren') {
    if (s.insights.maren) return { lines: ['Open on the windows coming down at the first stop sign. Trust me.'] };
    return { lines: ['I wrote four pages and they all say the same thing: the windows go down.', 'Put that in the first frame and the rest is furniture.'],
      onDone: () => insight('maren', 'Open on the windows coming down at the first stop sign.') };
  }
  // gil, at the bar
  return { lines: ['Afternoon, Mr. Calloway. The usual?'],
    choices: ['Scotch, neat.', 'A light, Gil.', 'Nothing, thanks.'],
    onChoice: i => {
      if (i === 0) {
        if (s.drinks >= 3) return ui.toast('GIL', 'I think that is your limit for today, Mr. Calloway.');
        s.drinks++; s.nerve = clamp(s.nerve + 15, 0, 100); s.composure = clamp(s.composure - 12, 0, 100);
        game.audio.sfx('powerup'); ui.toast('Scotch', 'Steadier hands, looser head.');
      } else if (i === 1) {
        s.composure = clamp(s.composure + 8, 0, 100);
        game.particles.smoke(hero.x, hero.y, 26, 6, { size: 1.6, color: '#d8d0c8' });
        ui.toast('A light', 'The room goes quiet for a second.');
      }
    }
  };
}

// ---------- scenes ----------
let attract = false, aiT = 0, aiTapped = false, aiGoal = 0, aiWait = false, idle = 0, footT = 0, cooldown = 0, aiSaw = null;
let endInfo = {}, hubEnd = null, hubInfo = null, hubReported = false, progT = 0;

function talkTo(id) {
  const sc = scriptFor(id);
  talk.voice = 'voice-' + id;
  talk.say(sc.lines, {
    name: NAME[id], portrait: CAST[id].rig,
    choices: sc.choices,
    onChoice: sc.onChoice, onDone: sc.onDone
  });
}

function objective() {
  if (!state.brief) return { title: 'See Hollis', text: 'Hollis wants a word about the Wren.', at: { x: POS.hollis.x, y: POS.hollis.y, z: 0 } };
  if (!insightsDone()) {
    const k = ['ruth', 'teddy', 'maren'].find(key => !state.insights[key]);
    return { title: 'Get the insights', text: `${insightCount()} of 3. Next: ${NAME[k].toLowerCase()}.`, at: { x: POS[k].x, y: POS[k].y, z: 0 } };
  }
  if (!state.grade) return { title: 'Pitch the Wren', text: 'Conference room. Hollis is waiting.', at: { x: POS.pitch.x, y: POS.pitch.y, z: 0 } };
  return { title: 'Done', text: 'See what the room made of it.' };
}

function nearest() {
  let best = null, bd = 34;
  for (const id of Object.keys(CAST)) {
    if (id === 'hero' || !CAST[id].rig) continue;
    const d = E.dist(hero, CAST[id]);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

function placeCast() {
  for (const id of Object.keys(CAST)) if (POS[id]) { CAST[id].x = POS[id].x; CAST[id].y = POS[id].y; }
}

const play = {
  pausable: true,
  input: 'THIRDPERSON',
  camera: { zoom: [.75, 2], start: 1 },
  enter(data) {
    attract = !!(data && data.attract);
    newDay(); aiGoal = 0; aiWait = false; aiTapped = false; aiSaw = null; idle = 0; footT = 0; cooldown = 0;
    hero = new E.Mover({ x: POS.hero.x, y: POS.hero.y, r: 5, staminaMax: 100 }); hero.facing = 0;
    flow = new E.FlowField(map);
    game.follow(hero, { z: 16 }); game.cam.bounds = v => map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .5;
    game.audio.music(LOUNGE);
    if (!attract) ui.toast('Monday, 9:12', 'Carrow & Dade. Hollis has been asking.');
  },
  exit() { game.lights.enabled = false; ui.hud({}); },
  update(dt) {
    const I = game.input;
    syncGlyphs();
    if (attract) {
      if (I.anyPressed() && !aiTapped) return game.go('title');
      aiTapped = false;
      aiStep(dt);
    }
    if (talk.update(dt)) return;   // a modal box is open: play waits
    if (!attract) walk(dt);
    if (AH && AH.active && !attract) { progT -= dt; if (progT <= 0) { progT = 1; hubReport(); } }
    cooldown = Math.max(0, cooldown - dt);
    if (!attract && I.pressed('map')) game.nextView();
    if (!attract) {
      state.composure = clamp(state.composure + dt * .4, 0, 100);   // calm returns slowly
      if (I.pressed('interact')) {
        const who = nearest();
        if (who) { talkTo(who); game.audio.sfx('select'); }
      }
    }
    // the bar: smoke from the lounge
    if (Math.random() < dt * 2) game.particles.smoke(BAR[0] + 6, BAR[1] - 4, 30, 1, { size: 1.2, color: '#cfc8c0' });
    // the conference room: step onto the projector and pitch
    if (cooldown <= 0 && E.dist(hero, POS.pitch) < 14) {
      cooldown = 3;
      if (insightsDone() && state.brief) startPitch(attract);
      else if (!attract) ui.toast('Not yet', 'Get the brief and the three insights first.');
    }
    // the rigs: poses from this step's motion; the nearest person turns to face the hero
    CAST.hero.rig.update(dt, hero.rigState());
    for (const id of Object.keys(CAST)) {
      if (id === 'hero') continue;
      const c = CAST[id];
      c.facing = Math.atan2(hero.y - c.y, hero.x - c.x);
      c.rig.update(dt, { x: c.x, y: c.y, z: 0, vx: 0, vy: 0, facing: c.facing, stance: 'ready' });
    }
    if (!attract) {
      const near = nearest();
      ui.hud({
        objective: objective(),
        bars: [{ label: 'Nerve', value: state.nerve, max: 100, color: '#e0b060' }, { label: 'Composure', value: state.composure, max: 100, color: '#7ab8d0' }],
        keys: [[['up', 'left', 'down', 'right'].map(a => I.label(a)).join(''), 'Walk'],
          [I.label('interact'), near ? 'Talk to ' + NAME[near].toLowerCase() : 'Talk, look, take'],
          [I.label('map'), 'Change view']]
      });
    }
  },
  draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    for (const [id, x, y] of DRESS) r.shape(id, x, y, 0, { facing: 0 });
    for (const [tag, x, y] of LAMPS) r.prop(tag, POS_LAMP(x), POS_LAMP(y), 0, { light: true });
    // a projector in the conference room
    game.lights.add(PROJECTOR[0], PROJECTOR[1], 24, 60, .6, { color: '#bcd8ff' });
    game.lights.add(BAR[0], BAR[1], 26, 70, .8, { color: '#ffa050' });
    for (const [cx, cy] of LAMP_LIGHTS) game.lights.add(cx * 16 + 8, cy * 16 + 8, 30, 56, .7, { color: '#ffd9a0' });
    for (const id of Object.keys(CAST)) {
      if (id === 'hero') continue;
      const c = CAST[id];
      r.shadow(c.x, c.y, 6, .35);
      r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { every: 1, key: id });
      if (nearest() === id) r.textAt(c.x, c.y, 46, NAME[id], '#ffe9b0');
    }
    r.shadow(hero.x, hero.y, 6, .35, undefined, hero.groundZ || 0);
    r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => CAST.hero.rig.draw(g, ox, oy, r.view));
    talk.draw(r);
    if (attract) r.text('ATTRACT / PRESS ANY KEY', r.W / 2, 4, '#e6d8b8', { align: 'center', shadow: '#000' });
  }
};
// lamp cells are cell coords; the props want world points
function POS_LAMP(v) { return v * 16 + 8; }

// the walker: the stick (through the view, inverted on request) moves the hero; hurry walks faster
function walk(dt) {
  const I = game.input, m = I.move();
  const mx = game.settings.invertX ? -m[0] : m[0], my = game.settings.invertY ? -m[1] : m[1];
  const sprint = I.down('sprint');
  hero.update(dt, map, { move: [mx, my], sprint, crouch: false, jumpPressed: false });
  if (Math.hypot(mx, my) > .2) {
    footT -= dt;
    if (footT <= 0) { footT = sprint ? .22 : .32; game.audio.sfx('step', { vol: .3 }); }
  }
}

// ---------- the attract demo: a cheating AI walks the day, ignores the bottom of the stack ----------
const AI_GOALS = [{ talk: 'hollis' }, { talk: 'ruth' }, { talk: 'teddy' }, { talk: 'maren' }, { talk: 'gil' }, { pitch: true }];
function aiStep(dt) {
  if (!hero) return;
  hero.stamina = hero.staminaMax; state.nerve = 100; state.composure = 100;   // infinite stamina, nerve and calm
  if (talk.open) {
    aiT += dt;
    if (aiT > .9) { aiT = 0; aiTapped = true; game.input.tap('confirm'); }   // page on through the dialogue
    return;
  }
  if (aiWait) { aiWait = false; aiGoal++; }
  if (aiGoal >= AI_GOALS.length) aiGoal = 0;
  const g = AI_GOALS[aiGoal], target = g.pitch ? POS.pitch : POS[g.talk];
  const d = E.dist(hero, target);
  if (g.talk && d < 30) { talkTo(g.talk); aiWait = true; return; }
  if (g.pitch && d < 14) { startPitch(true); return; }
  // walk the flow field toward the target
  if (aiSaw !== aiGoal) { flow.update(target.x, target.y); aiSaw = aiGoal; }
  const dir = flow.dir(hero.x, hero.y, target.x, target.y);
  hero.update(dt, map, { move: dir, sprint: true, crouch: false, jumpPressed: false }, IDENT);
}

function startPitch(demo = false) {
  game.go('pitch', { attract: demo });
}

// ---------- the pitch: pick an angle, then time three beats on the reel ----------
const ANGLES = [
  { name: 'NOSTALGIA', line: 'A Sunday you never had, in a car you can finally afford.', speed: .9, zone: 1.15 },
  { name: 'FREEDOM', line: 'Nobody owns the open road. Not even the bank.', speed: 1.15, zone: .9 },
  { name: 'FEAR', line: 'Every family is one bad winter from the wrong car.', speed: 1, zone: 1 }
];
const BEATS = ['THE PROBLEM', 'THE FEELING', 'THE NAME'];
let P = null;
const pitch = {
  pausable: false,
  enter(data) {
    attract = !!(data && data.attract);
    P = { phase: 'angle', sel: 0, angle: null, beat: 0, t: 0, targets: [rnd('beat0'), rnd('beat1'), rnd('beat2')].map(v => .3 + v * .4), accs: [], flash: 0, res: '' };
    game.audio.music(TENSE);
    ui.hud({});
  },
  exit() { game.audio.music(null); },
  update(dt) {
    const I = game.input;
    syncGlyphs();
    if (attract && I.anyPressed() && !aiTapped) return game.go('title');
    aiTapped = false;
    P.t += dt; P.flash = Math.max(0, P.flash - dt);
    if (P.phase === 'angle') {
      if (I.pressed('up')) P.sel = (P.sel + 2) % 3;
      if (I.pressed('down')) P.sel = (P.sel + 1) % 3;
      if (attract) P.sel = 0;
      if (I.pressed('confirm') || (attract && P.t > .6)) {
        P.angle = ANGLES[P.sel]; P.phase = 'reel'; P.t = 0; game.audio.sfx('confirm');
      }
      return;
    }
    if (P.phase === 'reel') {
      const v = reelValue();
      const halfW = zoneHalf();
      const press = I.pressed('confirm') || (attract && Math.abs(v - P.targets[P.beat]) < halfW * .25 && P.t > .4);
      if (press) {
        const acc = clamp(1 - Math.abs(v - P.targets[P.beat]) / halfW, 0, 1);
        P.accs.push(acc); P.flash = .3;
        game.audio.sfx(acc > .8 ? 'coin' : acc > .4 ? 'select' : 'hit', { vol: .6 });
        if (acc > .8) game.flash('#ffe9b0', .1);
        P.beat++; P.t = 0;
        game.input.consumeAll();
        if (!attract && AH && AH.active) AH.progress({ score: Math.round(avg() * 1000), label: 'beat ' + P.beat });
        if (P.beat >= BEATS.length) {
          const a = avg();
          P.grade = a >= .8 ? 'WOW' : a >= .55 ? 'GOOD' : a >= .3 ? 'FINE' : 'FLOP';
          state.grade = P.grade; state.score = Math.round(a * 1000);
          hubFinish();
          P.phase = 'result'; P.t = 0; game.audio.sfx(P.grade === 'FLOP' ? 'hurt' : 'powerup');
        }
      }
      return;
    }
    if (P.phase === 'result') {
      if (I.pressed('confirm') || (attract && P.t > 3.5)) game.go('end', { grade: P.grade, score: state.score, attract });
    }
  },
  draw(r) {
    r.sky(['#16110e', '#3a2418']);
    const cx = Math.round(r.W / 2);
    r.overlay(g => {
      E.ui.box(g, cx - 190, 18, 380, 210, { bg: ['#1c1a24', '#0e0d14'], border: '#c9a24a' });
    });
    r.text('CARROW & DADE / HALDEN MOTORS', cx, 30, '#e6d8b8', { align: 'center', shadow: '#000' });
    r.text('THE WREN', cx, 46, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
    if (P.phase === 'angle') {
      r.text('CHOOSE THE ANGLE', cx, 84, '#cfc6b4', { align: 'center' });
      ANGLES.forEach((a, i) => {
        const y = 104 + i * 26;
        const on = i === P.sel;
        r.text((on ? '> ' : '  ') + a.name, cx - 128, y, on ? '#ffd36a' : '#cfc6b4', { shadow: '#000' });
        E.font.wrap(a.line, 330).forEach((ln, k) => r.text(ln, cx - 128, y + 11 + k * 9, on ? '#f0e8d8' : '#8a8478'));
      });
      r.text(`${game.input.label('up')}/${game.input.label('down')} CHOOSE  ${game.input.label('confirm')} PITCH`, cx, 196, '#8a8478', { align: 'center' });
      return;
    }
    if (P.phase === 'reel') {
      const b = P.beat;
      r.text(`${b + 1} OF 3: ${BEATS[b]}`, cx, 84, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      r.text(P.angle.line, cx, 110, '#cfc6b4', { align: 'center' });
      const bx = cx - 120, by = 150, bw = 240, bh = 12;
      const halfW = zoneHalf(), tgt = P.targets[b], v = reelValue();
      r.overlay(g => {
        E.px.rect(g, bx, by, bw, bh, '#2a2420');
        E.px.rect(g, bx + (tgt - halfW) * bw, by, halfW * 2 * bw, bh, '#c9a24a');
        E.px.rect(g, bx + v * bw - 2, by - 5, 4, bh + 10, P.flash > 0 ? '#ffffff' : '#ff6040');
      });
      r.text('STOP THE REEL ON THE GOLD', cx, 176, '#8a8478', { align: 'center' });
      if (P.accs.length) r.text(P.accs.map(a => Math.round(a * 100) + '%').join('   '), cx, 194, '#cfc6b4', { align: 'center' });
      return;
    }
    r.text('THE ROOM', cx, 84, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
    r.text(`${P.grade}   ${Math.round(avg() * 100)}%`, cx, 124, '#ffd36a', { align: 'center', scale: 3, shadow: '#000' });
    r.text('PRESS ' + game.input.label('confirm'), cx, 196, '#8a8478', { align: 'center' });
  }
};
function avg() { return P && P.accs.length ? P.accs.reduce((a, b) => a + b, 0) / P.accs.length : 0; }
function reelValue() {
  const speed = clamp(.6 + (1 - state.composure / 100) * .8, .6, 1.5) * (P.angle ? P.angle.speed : 1) * .9;
  const p = (P.t * speed) % 1;
  return p < .5 ? p * 2 : 2 - p * 2;
}
function zoneHalf() {
  return (.06 + state.nerve / 100 * .08) * (P.angle ? P.angle.zone : 1);
}

// ---------- title, end, credits ----------
let tmenu = null, touchNote = 0;
const title = {
  enter() {
    attract = false; idle = 0; syncGlyphs();
    game.audio.music(LOUNGE);
    if (!tmenu) tmenu = new E.Menu(game, ['PLAY', 'SETTINGS', 'CREDITS'], {
      x: 'center', y: 118,
      onPick: (i) => {
        if (i === 0) {
          if (TOUCH_ONLY) { touchNote = 3; return; }
          game.audio.sfx('confirm'); newDay(); game.go('play');
        } else if (i === 1) game.menu('settings');
        else { game.audio.sfx('select'); game.go('credits'); }
      }
    });
  },
  update(dt) {
    const I = game.input;
    syncGlyphs();
    if (I.anyPressed() || I.move()[0] || I.move()[1]) idle = 0; else idle += dt;
    touchNote = Math.max(0, touchNote - dt);
    if (game.settings.idleDemo && idle > 10) { idle = 0; return game.go('play', { attract: true }); }
    tmenu.update(dt);
  },
  draw(r) {
    r.sky(['#1a1210', '#4a2a1a', '#120c0a']);
    const m = Math.round(r.H / 2);
    tmenu.y = m + 4;   // the menu sits under the title art on any screen height
    r.overlay(g => E.font.title(g, 'MAD MASTERS', r.W / 2, m - 86, { scale: 3, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a' }));
    r.text('EVERY PITCH IS A CONFESSION', r.W / 2, m - 40, '#e6d8b8', { align: 'center', shadow: '#000' });
    tmenu.draw(r);
    if (TOUCH_ONLY || touchNote > 0) r.text('CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H - 26, '#ff9a7a', { align: 'center', shadow: '#000' });
    else r.text(('PRESS ' + game.input.label('confirm') + '   /   ENGINE v' + E.version).toUpperCase(), r.W / 2, r.H - 16, '#8a8478', { align: 'center', shadow: '#000' });
  }
};

const end = {
  enter(data) { endInfo = data || {}; endInfo.t = 0; game.audio.music(LOUNGE); ui.hud({}); },
  update(dt) {
    const I = game.input;
    endInfo.t += dt;
    if (endInfo.attract && (I.anyPressed() || endInfo.t > 7)) return game.go('title');
    if (I.pressed('confirm') || I.pressed('cancel')) game.go('title');
  },
  draw(r) {
    const g = endInfo.grade || 'FLOP';
    r.sky(g === 'WOW' ? ['#103020', '#2a6a48'] : g === 'FLOP' ? ['#301010', '#6a2a2a'] : ['#2a2010', '#5a4a2a']);
    const m = Math.round(r.H / 2);
    r.overlay(g2 => E.font.title(g2, g, r.W / 2, m - 74, { scale: 3, align: 'center' }));
    const lines = HOLLIS_VERDICT[g] || HOLLIS_VERDICT.FINE;
    r.text(lines, r.W / 2, m - 26, '#f0e8d8', { align: 'center', shadow: '#000' });
    r.text(`NERVE ${Math.round(state.nerve)}   COMPOSURE ${Math.round(state.composure)}   INSIGHTS ${insightCount()} OF 3`, r.W / 2, m + 16, '#cfc6b4', { align: 'center', shadow: '#000' });
    if (AH && AH.active && hubEnd) r.text('TABLE CLOSED | ' + (hubEnd.standings || []).map(s => (s.name || 'P') + ' ' + (s.score || 0)).join('  |  '), r.W / 2, m + 36, '#ffd36a', { align: 'center', shadow: '#000' });
    r.text(endInfo.attract ? 'DEMO' : 'PRESS ' + game.input.label('confirm') + ' TO GO HOME', r.W / 2, m + 56, '#8a8478', { align: 'center', shadow: '#000' });
  }
};
const HOLLIS_VERDICT = {
  WOW: "Hollis: 'You made a room cry over a car. Next time sell them the truth, it's cheaper.'",
  GOOD: "Hollis: 'Good. Not a miracle, a Tuesday. We can work with a Tuesday.'",
  FINE: "Hollis: 'Fine is a word for the parking lot. Go back and find me the feeling.'",
  FLOP: "Hollis: 'Calloway. Go home. Come back when you can say what you're selling.'"
};

const credits = {
  pausable: false,
  enter() { credits.y = 0; game.audio.music(LOUNGE); ui.hud({}); },
  update(dt) {
    const I = game.input;
    if (I.pressed('confirm') || I.pressed('cancel')) return game.go('title');
    const d = (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0);
    credits.y = clamp(credits.y + d * dt * 90, 0, Math.max(0, (credits.n || 0) * 11 - 150));
  },
  draw(r) {
    r.sky(['#1a1210', '#3a2418']);
    r.text('ABOUT / CREDITS', r.W / 2, 8, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
    const lines = [];
    for (const line of ABOUT) {
      if (line.startsWith('#') || line === '') lines.push(line);
      else for (const ln of E.font.wrap(line, r.W - 24)) lines.push(ln);
    }
    credits.n = lines.length;
    lines.forEach((line, i) => {
      const y = 34 + i * 11 - credits.y;
      if (y < 26 || y > r.H - 12) return;
      r.text(line, 10, y, line.startsWith('#') ? '#ffd36a' : '#e6d8b8', { shadow: '#000' });
    });
    r.text(game.input.label('cancel') + ' BACK', r.W / 2, r.H - 12, '#8a8478', { align: 'center', shadow: '#000' });
  }
};
credits.y = 0;

// the About/Credits screen: the four required reports, the engine, and what this build is
const ABOUT = [
  '# MAD MASTERS',
  'A spiritual successor to Mad Men (2007-2015). Original names and office.',
  '',
  '# SOURCE INFORMATION',
  'Date: 2026-11-02 19:20',
  'Source: Mad Men (2007-2015), the TV drama',
  'Genre and Perspective: Life Sim with dialogue and a timing pitch; threequarter, topdown and iso',
  'Tech: my-3D2dge v0.85.1 engine (inlined), AI Hub session.js client, vanilla JS, WebAudio',
  'Art Direction: engine native pixel-art, 3D rigs, 1960s palette',
  'Animation: engine rig poses, moves and the Mover controller',
  'Audio: code-written lounge and tension music, synth sounds; Animalese-style chirps for voices',
  'Online: AI Hub parallel mode (up to 4 players, same day, scored)',
  'Testing: headless and browser checks by the agent (see Testing Feedback)',
  'Research: none',
  'Environment: Claude Code CLI (headless); Linux; browser unknown',
  'Model: Anthropic, claude-haiku-5-5, reasoning effort medium',
  'Usage: cost unknown, tokens unknown, session time about 16 min',
  '',
  '# TESTING FEEDBACK',
  'Issues caught: 10 (2 critical: attract stalled at the desks and the pitch, hub progress missing).',
  'Most helpful: the state-reading browser run and the hub harness. Least helpful: random reel presses.',
  '',
  '# ENGINE FEEDBACK',
  'Liked: standard pause, settings, controls and labels; live portraits in dialogue; Shell HUD.',
  'Guessed wrong: prop args order; scene input presets; FlowField ignores map.solid; no middle dot in the font.',
  'Build yourself: the pitch reel, dialogue state, attract AI, hub progress and result.',
  '',
  '# PROMPT FEEDBACK',
  'Liked: exact exit-interview shape and the hub tags. Confusing: folder name vs template. Hardest: attract under a 1.2 MB engine.',
  '',
  '# CONTROLS',
  'Stick or arrows: walk. Hurry: Shift. Talk: E. Change view: M or Tab.',
  'Settings: invert horizontal, invert vertical, Xbox symbols.',
  'Pause: Escape or Start. Full screen: the corner button.',
  '',
  '# THANKS',
  'The engine by michaelcrosato (MIT). The hub by the AI Hub team.',
  'Press the cancel button to go back.'
];

// ---------- AI Hub: parallel mode, the table's clock starts the day ----------
function joinTable() {
  if (!AH || !AH.connect) return;
  AH.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) return;
    hubInfo = info;
    AH.ready();
    AH.on('start', () => { newDay(); game.go('play'); });
    AH.on('time-up', () => hubFinish());
    AH.on('end', e => { hubEnd = e; });
  });
}

// ---------- boot ----------
function setup() {
  for (const tag of ['hero', 'ruth', 'teddy', 'maren', 'gil', 'hollis', 'pitch']) POS[tag] = map.find(tag);
  placeCast();
}
setup();
// a handle for tests and tools (headless: node test)
game.debug = {
  snapshot: () => ({ scene: game.sceneName, attract, hero: hero ? [Math.round(hero.x), Math.round(hero.y)] : null,
    state: state ? { brief: state.brief, insights: insightCount(), drinks: state.drinks, nerve: Math.round(state.nerve), composure: Math.round(state.composure), grade: state.grade, score: state.score } : null,
    talking: talk.open, hub: !!hubInfo }),
  teleport(x, y) { hero.x = x; hero.y = y; hero.vx = 0; hero.vy = 0; },
  talkTo(id) { talkTo(id); },
  choose(i) { if (talk.choices && talk.onChoice) talk.onChoice(i); },
  pitchStart() { startPitch(false); },
  setInsight(id) { state.insights[id] = 'test'; },
  setBrief() { state.brief = true; }
};
game.start({ scenes: { title, play, pitch, end, credits }, scene: 'title' });
joinTable();
})();
