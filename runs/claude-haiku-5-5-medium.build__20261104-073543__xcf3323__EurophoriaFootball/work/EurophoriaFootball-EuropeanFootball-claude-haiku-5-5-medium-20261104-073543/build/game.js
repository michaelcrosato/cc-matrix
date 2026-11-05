/* EUROPHORIA FOOTBALL. A broke seaside club gets into the continent's biggest cup because of a typo, and the crowd's
 * euphoria carries it to the final. Two-a-side arcade football in a stadium with stands, a crowd that fills a power bar,
 * super strikes in Europhoria, tabloid back pages between the rounds, radio commentary, and a five-round cup run.
 * Built on the engine's sports kit (my-3D2dge v0.85.2, kits/sports.js). All sound and music is made in code.
 * KEYS: the stick runs. J / X / Pad0 passes (or tackles without the ball). L / C / Pad1 lobs (or barges). K / Z / Pad2 holds
 * to charge a shot and lets go to shoot (or switches player without the ball). E / Space / Pad5 is EUROPHORIA once the
 * meter is full. Pause: Esc / P / Options. */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach } = E;
const PI = Math.PI, T = 16, FW = 36, FH = 22, ND = 2, GOAL = 5, BAR = 28, GH = GOAL * T / 2, STAND = 3, MAXP = 4;
const ABOUT = {"lines":["EUROPHORIA FOOTBALL","A PLAYFUL RIFF ON EUROPEAN FOOTBALL. OVER THE TOP ARCADE STYLE.","","SOURCE INFORMATION","Date: 2026-11-04 07:35:43","Source: European football (over the top arcade style)","Plan: PLAN.md, written by claude-opus-5-5 at max effort, in the work folder","Genre: Arcade sports: two-a-side football with a five-round cup run (the plan asks for five-a-side)","Perspective: Elevated three-quarter camera that follows the ball (the engine's threequarter view)","Tech: my-3D2dge v0.85.2 engine (sports kit as the base), plain JavaScript, one HTML file; Node v24.22.1 for the test; Python 3 with Playwright for the browser check (version unknown)","Art direction: The engine's native low-resolution pixel style: sprite rigs in club colours, a stadium built from tiles, procedural crowd sprites, pixel title type","Animation: The engine's Humanoid rig and procedural Attack moves (kick and slide); no mocap clips","Audio: All made in code with the engine's audio: sound effects, a title and match loop, and an anthem loop; no audio files; no voices (commentary is on-screen text)","Online: none","Testing: Headless Node test (tools/test.mjs, 26 checks: a full CPU match, a cup run, Europhoria, the attract demo, the dev panel) and a headless Chromium check (tools/browser-check.py) for page errors and screenshots","Research: none beyond reading the plan, the engine's docs and its sports kit","Environment: Claude Code CLI (headless); Linux (WSL2); browser: headless Chromium","Model: Anthropic, claude-haiku-5-5, reasoning effort medium","Usage: unknown","","CREDITS","Engine: my-3D2dge v0.85.2 (github.com/michaelcrosato/my-3d2dge), sports kit as the base.","Music, sound effects and crowd: written in code, no audio files.","Thanks for playing. Kipperton can only get better."]};   // (the build puts the exit interview's answers here: the About screen and the interview never disagree)

/* ---------- the dev panel's values: defaults, saved in this browser, reset to these ---------- */
const DEV = [
  { k: 'half', label: 'HALF LENGTH (S)', min: 20, max: 180, step: 10, def: 60 },
  { k: 'playerSpeed', label: 'YOUR SPEED', min: 60, max: 140, step: 4, def: 92 },
  { k: 'cpuSpeed', label: 'CPU SPEED', min: 50, max: 140, step: 4, def: 86 },
  { k: 'shotPower', label: 'SHOT POWER', min: .6, max: 1.5, step: .05, def: 1 },
  { k: 'euphoriaGain', label: 'EUPHORIA GAIN', min: 0, max: 3, step: .25, def: 1 },
  { k: 'euphoriaDecay', label: 'EUPHORIA DECAY /S', min: 0, max: 6, step: .5, def: 1.5 },
  { k: 'europhoriaPower', label: 'SUPER STRIKE POWER', min: 1, max: 2, step: .05, def: 1.35 },
  { k: 'europhoriaTime', label: 'EUROPHORIA TIME (S)', min: 3, max: 20, step: 1, def: 8 },
  { k: 'overTheTop', label: 'OVER-THE-TOP EXTRAS', bool: true, def: true },
  { k: 'golden', label: 'GOLDEN GOAL', bool: true, def: true }
];
const CFG = {};
const resetCFG = () => { for (const d of DEV) setCFG(d, d.def); };
const setCFG = (d, v) => { CFG[d.k] = v; E.store.set('dev:' + d.k, v); };
for (const d of DEV) CFG[d.k] = E.store.get('dev:' + d.k, d.def);

/* ---------- the clubs (kit colours from the plan) and the cup's bracket ---------- */
const CLUBS = {
  kip: { name: 'KIPPERTON', full: 'KIPPERTON ATHLETIC', chip: '#f08a24', colors: { cloth: '#f08a24', pants: '#1c2a5a', boot: '#1c1c22', belt: '#1c2a5a', trim: '#1c2a5a' },
    players: [['#8a5a2a', '#f0c8a8'], ['#2a1a10', '#e8c8a0']] },
  hoo: { name: 'HOOFINGTON', full: 'AFC HOOFINGTON', chip: '#6a4a2a', colors: { cloth: '#6a4a2a', pants: '#e8a830', boot: '#1c1c22', belt: '#e8a830', trim: '#e8a830' },
    players: [['#8a7a6a', '#e0b090'], ['#3a2418', '#c89070']] },
  rpp: { name: 'PASAPASA', full: 'REAL PASAPASA', chip: '#9a7ad0', colors: { cloth: '#f4f2ec', pants: '#9a7ad0', boot: '#1c1c22', belt: '#9a7ad0', trim: '#9a7ad0' },
    players: [['#1e1c1a', '#a87050'], ['#3a2418', '#c89070']] },
  stp: { name: 'STAHLPRESSE', full: 'SV STAHLPRESSE 04', chip: '#8a94a8', colors: { cloth: '#8a94a8', pants: '#2a2e38', boot: '#1c1c22', belt: '#2a2e38', trim: '#c8ccd4' },
    players: [['#e8d8a0', '#f0d0b0'], ['#6a4a2a', '#e0b090']] },
  luc: { name: 'LUCCHETTO', full: 'AC LUCCHETTO', chip: '#7a1a2a', colors: { cloth: '#7a1a2a', pants: '#c8ccd4', boot: '#1c1c22', belt: '#c8ccd4', trim: '#c8ccd4' },
    players: [['#1e1c1a', '#c89070'], ['#3a2418', '#c89070']] },
  opu: { name: 'OPULENCE', full: 'OLYMPIQUE OPULENCE', chip: '#e8c040', colors: { cloth: '#e8c040', pants: '#141414', boot: '#141414', belt: '#141414', trim: '#141414' },
    players: [['#e8d8a0', '#f0d0b0'], ['#1e1c1a', '#e0b090']] }
};
const PLAYER_NAMES = {
  kip: ['DAZ PILCHARD', 'AGGIE NOWAK'], hoo: ['NORMAN NEEDHAM', 'KEV LUMP'], rpp: ['PEPITO PASARELA', 'TITO TOQUE'],
  stp: ['KLAUS HAMMERSCHMIDT', 'UWE UMSCHALT'], luc: ['SALVATORE', 'GIACOMO'], opu: ['MAXIMILIEN', 'ARNAUD']
};
const CLUB_KEYS = Object.keys(CLUBS);
const ROUNDS = [
  { club: 'hoo', name: 'QUALIFYING ROUND', venue: 'THE SMOKEHOUSE, RAIN AT DUSK', ref: 'REF HALTWHISTLE',
    pre: 'THE LONG AND THE SHORT OF IT', preBody: "Hoofington's aerial bombardment heads for Kipperton's puddles. NEEDHAM: \"We don't pass, love. We 'oof.\"",
    win: 'KIP KIP HOORAY!', loss: 'BATTERED!', post: 'MAGS: "Not bad. Not good. But not bad."' },
  { club: 'rpp', name: 'ROUND OF 16', venue: 'ESTADIO PASAPASA, SUN', ref: 'REF PATIENCE',
    pre: 'PASS THE PARCEL', preBody: 'Kippers must stop the passing masters... if they can find the ball. PEPITO: "You will chase the ball until you are dizzy, little fishes."',
    win: 'SOLE-DESTROYING FOR SOLERA!', loss: 'PASSED OUT', post: 'AGGIE: "I counted. They made 412 passes."' },
  { club: 'stp', name: 'QUARTER-FINAL', venue: 'STAHLPRESSE ARENA, SNOW', ref: 'REF IRONSIDE',
    pre: 'PRESSED FOR TIME', preBody: 'The Steel Machine never stops running. KLAUS: "We run. You run. We run more."',
    win: 'KIPPERS MELT THE STEEL!', loss: 'CRUSHED', post: 'SANDRA: "Did you see mine? Frozen solid."' },
  { club: 'luc', name: 'SEMI-FINAL', venue: 'STADIO LUCCHETTO, FOG', ref: 'REF SEVERO',
    pre: 'PADLOCK AND KEY', preBody: 'SALVATORE: "Nobody scores against Lucchetto. We lock the door and we eat the key." MAGS: "They will dive. Do not fall for it."',
    win: 'THEY PARKED THE BUS - WE STOLE IT!', loss: 'LOCKED OUT', post: 'MAGS: "Football is a funny old game."' },
  { club: 'opu', name: 'FINAL', venue: 'THE EUPHORIUM, FIREWORKS', ref: 'REF HALTWHISTLE',
    pre: 'DAVID VS GOLDIATH', preBody: 'Fish-oil floodlights meet the richest club on Earth. MAXIMILIEN: "I have three Golden Boots. You have... boots."',
    win: 'THE PLAICE TO BE: KINGS OF EUROPE!', loss: 'SO CLOSE! GOLDEN BOYS BREAK KIPPER HEARTS', post: '' }
];
const DEMO_PAIRS = [['hoo', 'rpp'], ['stp', 'luc'], ['opu', 'kip'], ['rpp', 'stp'], ['kip', 'luc']];

/* ---------- the input, the sounds and the music ---------- */
const KEYS = Object.assign({}, E.Input.DEFAULT, { pass: ['KeyJ', 'KeyX', 'Pad0'], shoot: ['KeyK', 'KeyZ', 'Pad2'], lob: ['KeyL', 'KeyC', 'Pad1'],
  euphoria: ['KeyE', 'Space', 'Pad5'] });
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#07060d',
  menu: { items: [['Resume match', () => game.resume()], ['Restart match', () => { game.resume(); restartMatch(); }], ['Dev mode', () => { game.resume(); openDev(); }], ['Quit to menu', () => { game.resume(); toMenu(); }]],
    quit: false, saves: false, controls: { pass: 'Pass / Tackle', shoot: 'Shoot / Switch', lob: 'Lob / Barge', euphoria: 'Euphoria' } } });
const P = game.particles, A = game.audio;
const SOUNDS = {
  kick: { wave: 'noise', freq: 900, to: 200, dur: .07, vol: .3, filter: 'lowpass' }, thump: { wave: 'sine', freq: 120, to: 70, dur: .08, vol: .3 },
  whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .14 },
  crowd: { wave: 'noise', freq: 600, to: 900, dur: 1.4, vol: .18, filter: 'lowpass' }, slide: { wave: 'noise', freq: 400, to: 200, dur: .25, vol: .18 },
  horn: { wave: 'sawtooth', freq: 180, to: 160, dur: .9, vol: .16 }, select: { wave: 'square', freq: 660, to: 990, dur: .06, vol: .1 },
  blip: { wave: 'square', freq: 500, dur: .03, vol: .05 }
};
for (const [k, v] of Object.entries(SOUNDS)) A.define(k, v);
const SONG = { bpm: 140, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: 'E5 . E5 G5 . E5 D5 . | C5 . C5 E5 . C5 B4 . | A4 . C5 . E5 . A5 . | G5 - - . . . . .' },
  { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' },
  { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] };
const ANTHEM = { bpm: 116, steps: 4, tracks: [
  { wave: 'triangle', vol: .12, notes: 'D4 F4 A4 . G4 . F4 E4 | D4 F4 A4 . C5 . B4 A4 | D4 F4 A4 . G4 . F4 E4 | D4 - - . . . . .' },
  { wave: 'square', vol: .05, notes: 'D2 . A2 . D2 . A2 . | C2 . G2 . C2 . G2 . | D2 . A2 . D2 . A2 . | D2 . A2 . D2 . A2 .' }] };

/* ---------- the pitch: a stadium of FW x FH tiles, boards, goals and stands ---------- */
const CX = (ND + 1 + FW / 2) * T, CY = (STAND + 1 + FH / 2) * T;
const X0 = (ND + 1) * T, X1 = (ND + 1 + FW) * T, Y0 = (STAND + 1) * T, Y1 = (STAND + FH + 1) * T;
const goalX = s => s ? X0 : X1;   // where side s shoots (side 0 attacks the right end)
const goalRow = r => r > FH / 2 - GOAL / 2 && r <= FH / 2 + GOAL / 2;
const rows = [];
for (let R = 0; R < STAND + FH + 2; R++) {
  let s = ''; const r = R - STAND;
  for (let c = 0; c < ND + FW + 2 + ND; c++) {
    const field = c > ND && c <= ND + FW && r > 0 && r <= FH, endCol = c === ND || c === ND + FW + 1, net = (c < ND || c > ND + FW + 1);
    if (r < 0) s += c >= ND && c <= ND + FW + 1 ? String(R + 1) : ',';
    else if (field) s += '.';
    else if (endCol && r > 0 && r <= FH) s += goalRow(r) ? '.' : '#';
    else if ((r === 0 || r === FH + 1) && c >= ND && c <= ND + FW + 1) s += '#';
    else if (net && goalRow(r)) s += c === 0 || c === ND + FW + 3 ? 'N' : ':';
    else if (net && (goalRow(r + 1) || goalRow(r - 1))) s += 'N';
    else s += ',';
  }
  rows.push(s);
}
const lineAt = (x, y) => {
  const d = Math.hypot(x - CX, y - CY), ex = Math.min(Math.abs(x - X0), Math.abs(x - X1)), ey = Math.min(Math.abs(y - Y0), Math.abs(y - Y1));
  if (ex < 1.5 || ey < 1.5 || Math.abs(x - CX) < 1 || Math.abs(d - 48) < 1) return true;
  for (const gx of [X0, X1]) if (Math.abs(Math.hypot(x - gx, y - CY) - 72) < 1 && Math.abs(x - gx) < 72) return true;
  return false;
};
const floorTex = (x, y, tag) => {
  const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .06, y * .06) * .5;
  if (tag === 'net') { const mesh = Math.floor(x) % 4 === 0 || Math.floor(y) % 4 === 0; return mesh ? [30, 66, 36] : [44 + n * 10, 92 + n * 14, 50 + n * 10]; }
  if (tag === 'out') return [44 + n * 18, 42 + n * 18, 50 + n * 18];
  if (lineAt(x, y)) { const w = 228 + n * 24 + m * 10; return [w, w + 4, w - 8]; }
  const k = Math.floor((x - X0) / 32) % 2 ? 1 : 0, g = (k ? 140 : 106) + n * 34 + m * 24;
  return [g * .42, g, g * .46];
};
const map = new E.TileMap({ rows, legend: { '#': 1, N: 2, 1: 5, 2: 4, 3: 3, '.': { floor: 'grass' }, ':': { floor: 'net' }, ',': { floor: 'out' } },
  floorTex, outside: '#1e1c24', ao: 4,
  types: { 1: { h: 26, cut: true, cutH: 6, face: 'plank', side: '#3a4a6a', top: '#d8dce8', line: '#2a3450' }, 2: { h: BAR + 4, face: 'none', side: '#b8bcc8', top: '#e0e4ec' },
    3: { h: 34, face: 'stone', side: '#5a5468', top: '#6a6478' }, 4: { h: 44, face: 'stone', side: '#4e4a5e', top: '#5e586e' }, 5: { h: 54, face: 'stone', side: '#44405a', top: '#544e66' } } });
const CROWD = [];
for (let R = 0; R < STAND; R++) for (let c = ND; c <= ND + FW + 1; c++) for (const dx of [4, 12]) {
  const h = E.hash2(c * 3 + dx, R * 7 + 1), side = c < ND + (FW + 2) / 2 ? 0 : 1;
  CROWD.push({ x: c * T + dx, y: R * T + 9, z: [54, 44, 34][R], side, v: h, skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][(h * 50 | 0) % 4], ph: h * 9 });
}
const BALL = E.sprite(['.www.', 'wwkww', 'wkkkw', 'wwkww', '.www.'], { w: '#f4f4f0', k: '#2a2a30' });
const BALL2 = E.sprite(['.www.', 'wkwkw', 'wwwww', 'wkwkw', '.www.'], { w: '#f4f4f0', k: '#2a2a30' });

/* ---------- the state ---------- */
let mode = 'menu', home = 'kip', away = 'hoo', TEAMS = [CLUBS.kip, CLUBS.hoo], devReturn = 'menu';
let all = [], team = [[], []], ball = null, owner = null, last = null, clock = 0, half = 1, score = [0, 0], kickT = 0, t = 0;
let stats = null, curlT = 0, golden = false, restartBy = 0, over = false, kickHold = 0, demo = false, vs = false, demoN = 0;
let eu = [0, 0], europhoria = [0, 0], superT = 0, idle = 0, cup = null, card = null, toast = '', toastT = 0, devSel = 0;
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

/* commentary: a radio box with the commentator's line */
const talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#e8c070' });
const VOICE = new E.Humanoid({ weapon: null, hat: 'band', colors: { cloth: '#3a3a4a', hair: '#5a3a2a', skin: '#e0b090', hat: '#2a2a30' } });
const say = text => { if (!demo) talk.say(text, { name: 'CAGE RADIO', auto: 2.4, modal: false, alpha: .85, portrait: VOICE, portraitOpts: { zoom: 3, turn: .4 } }); };
const notice = (s, secs = 2.2) => { toast = s; toastT = secs; };

/* ---------- the menus ---------- */
const menuMain = new E.Menu(game, ['CUP RUN', 'KICK-ABOUT', 'VERSUS (2-4 PLAYERS)', 'ABOUT AND CREDITS', 'DEV MODE'], { y: 118,
  onPick: i => [startCup, pickClub, versusStart, () => { mode = 'about'; }, () => openDev()][i]() });
const menuPick = new E.Menu(game, CLUB_KEYS.map(k => CLUBS[k].full), { y: 92, onPick: i => { home = CLUB_KEYS[i]; away = CLUB_KEYS[(i + 1) % CLUB_KEYS.length]; kickAbout(); } });
const menuAfter = new E.Menu(game, ['REMATCH', 'MENU'], { y: 150, onPick: i => i === 0 ? kickAbout() : toMenu() });

/* ---------- modes: the menu, the cup's back pages, the match ---------- */
function toMenu() { mode = 'menu'; demo = false; vs = false; cup = null; game.splitScreen(0); game.allowJoin(false); A.music('title'); idle = 0; menuMain.i = 0; }
function pickClub() { mode = 'pick'; menuPick.i = 0; }
function kickAbout() { cup = null; TEAMS = [CLUBS[home], CLUBS[away]]; startMatch(false); }
function versusStart() { cup = null; mode = 'join'; game.allowJoin({ max: MAXP }); A.sfx('select'); }
function restartMatch() { if (cup) return roundCard(); kickAbout(); }
function startCup() { cup = { round: 0, lost: 0, won: false }; roundCard(); }
/** the cup's back page for the round: the headline, the set-up, the commentator's line */
function roundCard() {
  const R = ROUNDS[cup.round], c = CLUBS[R.club];
  card = { kind: 'pre', head: R.pre, body: [R.name + ': ' + R.venue + '. ' + R.ref + '.', R.preBody, 'Kipperton v ' + c.full + '.'], cue: 'PRESS ' + game.input.label('confirm') + ' FOR THE TEAM TALK' };
  mode = 'card'; A.music(ANTHEM);
}
function startRound() { home = 'kip'; away = ROUNDS[cup.round].club; TEAMS = [CLUBS.kip, CLUBS[away]]; startMatch(false); }
function startDemo() {
  demo = true; const pr = DEMO_PAIRS[demoN++ % DEMO_PAIRS.length];
  home = pr[0]; away = pr[1]; TEAMS = [CLUBS[home], CLUBS[away]]; cup = null; startMatch(false);
}
function openDev() { devReturn = mode === 'menu' || mode === 'pick' ? 'menu' : mode; devSel = 0; mode = 'dev'; }

/** a match: the players on the pitch, the ball at the centre, the clock at 0; the inputs say who plays which */
function startMatch(versus) {
  vs = !!versus; score = [0, 0]; clock = 0; half = 1; golden = false; over = false; owner = null; last = null; eu = [0, 0]; europhoria = [0, 0]; superT = 0;
  stats = { passes: 0, done: 0, shots: 0, lobs: 0, tackles: 0, goals: [], walls: 0, curled: 0, supers: 0 };
  all = []; team = [[], []];
  TEAMS.forEach((tm, s) => tm.players.forEach((_, k) => {
    const name = PLAYER_NAMES[s === 0 ? home : away][k], [hair, skin] = tm.players[k];
    const b = new E.Body({ x: CX, y: CY, r: 5, friction: 0, gravity: 700 });
    const p = { side: s, k, name, body: b, rig: new E.Humanoid({ weapon: null, build: 'heroic', size: 1.05, hair: k ? 'spiky' : 'short', colors: Object.assign({ hair, skin }, tm.colors), speedRef: 80 }),
      input: null, facing: s ? PI : 0, kick: null, slide: 0, stun: 0, cool: 0, meter: 0, charging: false, cheer: 0 };
    team[s].push(p); all.push(p);
  }));
  if (!demo) {
    const Pl = game.players;
    team[0][0].input = Pl[0];
    if (vs) { if (Pl[1]) team[1][0].input = Pl[1]; if (Pl[2]) team[0][1].input = Pl[2]; if (Pl[3]) team[1][1].input = Pl[3]; }
  }
  ball = new E.Body({ x: CX, y: CY, r: 3, friction: 0, bounce: .55, gravity: 600 }); ball.spin = 0; ball.roll = 0;
  kickoff(0); game.allowJoin(false); A.music(demo ? ANTHEM : SONG); game.input.consumeAll();
  game.follow(ball, { z: 8, lead: 10 }); game.cam.smooth = .18; game.cam.bounds = v => map.bounds(v);
  say((cup ? ROUNDS[cup.round].name + ': ' : '') + TEAMS[0].full + ' AGAINST ' + TEAMS[1].full + '. HERE WE GO!');
}
/** kickoff: side s kicks off; the other side stays out of the centre circle until the ball is played */
function kickoff(s) {
  owner = null; ball.x = CX; ball.y = CY; ball.z = 0; ball.onGround = true; ball.vx = ball.vy = ball.vz = 0; ball.spin = 0;
  for (const p of all) {
    const dir = p.side ? 1 : -1, b = p.body;
    b.x = p.side === s && p.k === 0 ? CX + dir * 8 : CX + dir * (p.k ? 150 : 60); b.y = p.side === s && p.k === 0 ? CY : CY + (p.k ? 40 : -40) * (p.side ? -1 : 1);
    b.vx = b.vy = 0; b.z = 0; p.facing = p.side ? PI : 0; p.kick = null; p.slide = 0; p.stun = 0; p.meter = 0; p.charging = false;
  }
  mode = 'kickoff'; kickT = 1; restartBy = s; kickHold = 0;
}
/** a player's spot in the formation now */
function spot(p) {
  const s = p.side, mate = team[s][1 - p.k], dir = s ? -1 : 1, has = owner && owner.side === s;
  if (has) return [clamp(ball.x + dir * 90, X0 + 30, X1 - 30), CY + (ball.y < CY ? 60 : -60)];
  const own = goalX(1 - s), near = Math.hypot(p.body.x - ball.x, p.body.y - ball.y) <= Math.hypot(mate.body.x - ball.x, mate.body.y - ball.y);
  if (near) return [ball.x, ball.y];
  return [lerp(ball.x, own, .55), lerp(ball.y, CY, .5)];
}

/* the ball: owned (at its owner's feet), or loose; a goal, over the bar, out of play */
function ballStep(dt) {
  if (owner) {
    const b = owner.body, f = owner.facing; ball.x = b.x + Math.cos(f) * 7; ball.y = b.y + Math.sin(f) * 7; ball.z = 0; ball.onGround = true;
    ball.vx = b.vx; ball.vy = b.vy; ball.vz = 0; ball.roll += Math.hypot(b.vx, b.vy) * dt; return;
  }
  const vx0 = ball.vx, vy0 = ball.vy, sp = Math.hypot(ball.vx, ball.vy);
  if (ball.spin && sp > 20) { const k = ball.spin * dt; ball.vx += -vy0 / sp * k * sp; ball.vy += vx0 / sp * k * sp; ball.spin *= Math.exp(-dt * 1.4); }
  if (ball.z <= .5) { const f = Math.exp(-dt * 1.1); ball.vx *= f; ball.vy *= f; }
  ball.update(dt, map);
  if (ball.hitWall) { ball.spin = 0; stats.walls++; if (Math.hypot(vx0, vy0) > 60) A.sfx('thump'); }
  if (ball.bounced) A.sfx('thump');
  ball.roll += Math.hypot(ball.vx, ball.vy) * dt;
  for (const s of [0, 1]) {
    const gx = goalX(s), past = s ? ball.x < gx - 2 : ball.x > gx + 2;
    if (past && Math.abs(ball.y - CY) < GH && ball.z < BAR) return goal(s);
    if (past && (ball.z >= BAR || Math.abs(ball.y - CY) >= GH)) return restart(1 - s, s ? X0 + 24 : X1 - 24, CY, 'OVER THE BAR. A GOAL KICK');
  }
  if (ball.x < X0 - 40 || ball.x > X1 + 40 || ball.y < Y0 - 4 || ball.y > Y1 + 4) restart(last ? 1 - last.side : 0, clamp(ball.x, X0 + 12, X1 - 12), clamp(ball.y, Y0 + 12, Y1 - 12), 'OUT OF PLAY. THROW-IN');
}
/** play goes on from (x, y) with the ball at the feet of side s's nearer player */
function restart(s, x, y, line) {
  const p = team[s].slice().sort((a, b) => Math.hypot(a.body.x - x, a.body.y - y) - Math.hypot(b.body.x - x, b.body.y - y))[0];
  p.body.x = x - (s ? -8 : 8); p.body.y = y; p.facing = s ? PI : 0; owner = p; ball.spin = 0; A.sfx('whistle'); if (line) say(line);
}
function goal(s) {
  score[s]++; stats.goals.push([s, last ? last.name : '?', Math.round(clock)]); owner = null; mode = 'goal'; kickT = 2.4; restartBy = 1 - s;
  for (const p of team[s]) p.cheer = 2.4;
  game.shake(3); A.sfx('crowd'); A.sfx('whistle');
  P.sparks(ball.x, ball.y, 16, 16, null, { color: '#ffe08a' }); P.ring(ball.x, ball.y, 4, 34, '#fff6c0', .5);
  if (!demo) { gain(s, 30); gain(1 - s, -10); }
  say(golden ? 'GOLDEN GOAL! ' + (last ? last.name : '') + ' WINS IT FOR ' + TEAMS[s].name + '!' : 'GOAL! ' + (last ? last.name + ' SCORES FOR ' : '') + TEAMS[s].name + '! ' + score[0] + ' - ' + score[1]);
  if (golden) over = true;
}
/* EUPHORIA: the crowd's meter per side; full, a press of E releases a Europhoria, and the next shot is a super strike */
function gain(s, n) { if (!CFG.overTheTop) return; eu[s] = clamp(eu[s] + n * CFG.euphoriaGain, 0, 100); }
function triggerEuphoria(s) {
  if (!CFG.overTheTop || eu[s] < 100 || europhoria[s] > 0) return false;
  eu[s] = 0; europhoria[s] = CFG.europhoriaTime; A.sfx('horn'); game.shake(2);
  notice(TEAMS[s].name + ' EUROPHORIA!', 2.4); say(TEAMS[s].name + ': EUROPHORIA! THE TERRACES ARE GOING MAD!');
  P.ring(CX, CY, 10, 120, TEAMS[s].chip, .6);
  return true;
}

/* KICKS: a pass to the teammate the stick points at, a lob by E.arc, a shot from the meter; a super strike in Europhoria */
const mateOf = p => team[p.side][1 - p.k];
function pass(p) {
  const m = mateOf(p), b = p.body, d = Math.hypot(m.body.x - b.x, m.body.y - b.y), sp = clamp(d * 1.5 + 90, 150, 270), lead = d / sp;
  const tx = m.body.x + m.body.vx * lead * .8, ty = m.body.y + m.body.vy * lead * .8, a = Math.atan2(ty - b.y, tx - b.x);
  release(p, Math.cos(a) * sp, Math.sin(a) * sp, 0); stats.passes++; ball.to = m;
}
function lob(p) {
  const m = mateOf(p), lead = .55, tx = m.body.x + m.body.vx * lead, ty = m.body.y + m.body.vy * lead;
  const v = E.arc({ x: ball.x, y: ball.y, z: 0 }, { x: tx, y: ty, z: 0 }, ball.gravity, { apex: 30 });
  release(p, v.vx, v.vy, v.vz); stats.lobs++; stats.passes++; ball.to = m;
}
function shoot(p, power, aimY) {
  const gx = goalX(p.side), gy = CY + clamp(aimY, -1, 1) * (GH - 6), b = p.body, a = Math.atan2(gy - b.y, gx - b.x);
  const sup = europhoria[p.side] > 0 && CFG.overTheTop;
  const sp = (170 + power * 230) * CFG.shotPower * (sup ? CFG.europhoriaPower : 1);
  release(p, Math.cos(a) * sp, Math.sin(a) * sp, 30 + power * 95); stats.shots++; curlT = .4; ball.to = null; A.sfx('kick');
  if (sup) {
    stats.supers++; superT = 1.2; europhoria[p.side] = 0; ball.spin = (aimY >= 0 ? 1 : -1) * .9;
    say('SUPER STRIKE! ' + p.name + '!'); game.shake(4); P.ring(ball.x, ball.y, 6, 60, TEAMS[p.side].chip, .5); A.sfx('horn');
  }
}
function release(p, vx, vy, vz) {
  owner = null; kickHold = 0; ball.vx = vx; ball.vy = vy; ball.vz = vz; ball.onGround = vz <= 0; ball.spin = 0; last = p; p.cool = .3;
  p.kick = new E.Attack('kick'); p.kick.start(); A.sfx('kick');
}
function tackle(p) { p.slide = .35; p.kick = new E.Attack('sweep'); p.kick.start(); stats.tackles++; A.sfx('slide'); const b = p.body; b.vx = Math.cos(p.facing) * 170; b.vy = Math.sin(p.facing) * 170; gain(p.side, 2); }

/** a player's step: from its input (a human's) or its brain (the formation's), then its body and its rig */
function playerStep(p, dt) {
  const b = p.body; p.cool = Math.max(0, p.cool - dt); p.stun = Math.max(0, p.stun - dt); p.cheer = Math.max(0, p.cheer - dt);
  if (p.slide > 0) { p.slide -= dt; const f = Math.exp(-dt * 3); b.vx *= f; b.vy *= f; }
  else if (p.stun > 0 || mode !== 'play') { b.vx = approach(b.vx, 0, 600 * dt); b.vy = approach(b.vy, 0, 600 * dt); }
  else {
    const c = p.input ? human(p, dt) : brain(p, dt), mv = c.move, sp = p.input ? CFG.playerSpeed : CFG.cpuSpeed, m = Math.hypot(mv[0], mv[1]);
    b.vx = approach(b.vx, mv[0] * sp, 900 * dt); b.vy = approach(b.vy, mv[1] * sp, 900 * dt);
    if (m > .2) p.facing = E.approachAng(p.facing, Math.atan2(mv[1], mv[0]), dt * (owner === p ? 9 : 14));
    act(p, c, dt);
  }
  b.update(dt, map);
  if (!owner && mode === 'play' && p.cool <= 0 && p.stun <= 0 && ball.z < 9 && Math.hypot(ball.x - b.x, ball.y - b.y) < (Math.hypot(ball.vx, ball.vy) > 210 ? 4.5 : 9)) {
    owner = p; ball.spin = 0; if (ball.to === p && last && last.side === p.side) { stats.done++; gain(p.side, 1.5); } ball.to = null;
    if (p.slide > 0) p.slide = 0;
  }
  if (p.slide > 0 && owner && owner.side !== p.side && Math.hypot(owner.body.x - b.x, owner.body.y - b.y) < 12) {
    const o = owner; owner = null; o.stun = .5; last = p; ball.vx = Math.cos(p.facing) * 120; ball.vy = Math.sin(p.facing) * 120; ball.vz = 40; ball.onGround = false; p.cool = .2; A.sfx('thump');
    gain(p.side, 3);
  }
  if (p.kick) { p.kick.update(dt); if (!p.kick.busy) p.kick = null; }
  p.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: p.facing, attack: p.kick && p.kick.state, hurt: p.stun > 0, pose: p.cheer > 0 ? 'cheer' : null, expr: p.cheer > 0 ? 'shout' : null });
}
/** what a human's input asks: the stick; pass, lob, the shot's meter (held), a tackle or a switch, and Europhoria */
function human(p, dt) {
  const I = p.input, mv = I.move(), c = { move: mv, pass: I.pressed('pass'), lob: I.pressed('lob'), shootHeld: I.down('shoot'), shootUp: I.released('shoot'), aim: mv[1] * (p.side ? -1 : 1) };
  if (c.pass) I.consume('pass'); if (c.lob) I.consume('lob');
  if (I.pressed('euphoria')) { I.consume('euphoria'); triggerEuphoria(p.side); }
  if (curlT > 0 && last === p && !owner) { const sp = Math.hypot(ball.vx, ball.vy) || 1, across = (mv[0] * -ball.vy + mv[1] * ball.vx) / sp; if (Math.abs(across) > .3) { ball.spin = clamp(ball.spin + across * 3.2 * dt, -1.6, 1.6); stats.curled++; } }
  return c;
}
/** the CPU's footballer: to its spot in the formation; with the ball, run at goal, pass when pressed, shoot in range */
function brain(p, dt) {
  const b = p.body, c = { move: [0, 0], pass: false, lob: false, shootHeld: false, shootUp: false, aim: 0 }, s = p.side;
  if (owner === p) {
    if (demo || eu[s] >= 100) triggerEuphoria(s);
    const gx = goalX(s), dg = Math.hypot(gx - b.x, CY - b.y), foe = team[1 - s].find(o => Math.hypot(o.body.x - b.x, o.body.y - b.y) < 30 && Math.abs(E.angDiff(Math.atan2(o.body.y - b.y, o.body.x - b.x), p.facing)) < 1.2);
    const a = Math.atan2(CY - b.y, gx - b.x); c.move = [Math.cos(a), Math.sin(a)];
    const shot = (meter, aim) => { c.shootHeld = p.meter < meter; c.shootUp = !c.shootHeld; c.aim = b.y < CY ? aim : -aim; };
    if (dg < 95 && p.cool <= 0) shot(.4, .45);
    else if (foe) { const m = mateOf(p), lane = team[1 - s].some(o => segDist(o.body, b, m.body) < 14); if (p.cool <= 0) { if (lane) c.lob = true; else c.pass = true; } else c.move = [Math.cos(a + 1.1), Math.sin(a + 1.1)]; }
    else if (dg < 160 && p.cool <= 0) shot(.55 + p.k * .2, .55);
    return c;
  }
  let [tx, ty] = spot(p);
  if (kickHold > 0 && s !== restartBy) { const cd = Math.hypot(tx - CX, ty - CY) || 1; if (cd < 56) { tx = CX + (tx - CX) / cd * 56; ty = CY + (ty - CY) / cd * 56; } }
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
  if (d > 6) c.move = [dx / d, dy / d];
  if (owner && owner.side !== s && d < 18 && p.cool <= 0 && Math.hypot(owner.body.x - b.x, owner.body.y - b.y) < 16) c.pass = true;
  return c;
}
const segDist = (o, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * u - o.x, a.y + vy * u - o.y); };
/** the buttons: with the ball, pass, lob or the shot's meter; without it, a tackle (pass) or a switch (shoot) */
function act(p, c, dt) {
  if (owner === p) {
    if (c.pass && p.cool <= 0) return pass(p);
    if (c.lob && p.cool <= 0) return lob(p);
    if (c.shootHeld) { p.charging = true; p.meter = Math.min(1, p.meter + dt * 1.25); }
    else if (p.charging && (c.shootUp || !c.shootHeld)) { p.charging = false; shoot(p, p.meter, c.aim); p.meter = 0; }
    return;
  }
  p.charging = false; p.meter = 0;
  if (c.pass && p.cool <= 0 && p.slide <= 0 && !(kickHold > 0 && p.side !== restartBy)) tackle(p);
  else if (c.shootUp && p.input && !vs) swap(p);
}
/** the switch: the one who holds the stick gives it to their teammate */
function swap(p) { const m = mateOf(p); if (m.input) return; m.input = p.input; p.input = null; }
function autoSwitch() {
  if (vs || demo) return;
  const cur = team[0].find(p => p.input), m = cur && mateOf(cur);
  if (!cur || !m || m.input) return;
  if (owner === m || (ball.to === m) || ((!owner || owner.side !== 0) && Math.hypot(m.body.x - ball.x, m.body.y - ball.y) + 24 < Math.hypot(cur.body.x - ball.x, cur.body.y - ball.y))) swap(cur);
}

/* a step of the match: the clock, the halves, golden goal, the whistle */
function matchStep(dt) {
  clock += dt; kickHold = Math.max(0, kickHold - dt); superT = Math.max(0, superT - dt);
  for (const p of all) playerStep(p, dt);
  ballStep(dt); curlT = Math.max(0, curlT - dt); autoSwitch();
  for (const s of [0, 1]) { if (europhoria[s] > 0) europhoria[s] = Math.max(0, europhoria[s] - dt); else eu[s] = Math.max(0, eu[s] - CFG.euphoriaDecay * dt); }
  if (demo) eu = [100, 100];   // the demo cheats: its crowds are always ready
  if (!CFG.overTheTop) eu = [0, 0];
  if (mode !== 'play') return;   // (a goal inside this step ended the play)
  const HALF = CFG.half;
  if (!golden && half === 1 && clock >= HALF) { half = 2; mode = 'half'; kickT = 2.4; restartBy = 1; owner = null; A.sfx('whistle'); say('HALF TIME: ' + TEAMS[0].name + ' ' + score[0] + ', ' + TEAMS[1].name + ' ' + score[1] + '.'); }
  else if (!golden && clock >= HALF * 2) {
    if (score[0] === score[1] && (CFG.golden || cup)) { golden = true; clock = HALF * 2; A.sfx('whistle'); say('LEVEL AT FULL TIME: GOLDEN GOAL! THE NEXT ONE WINS IT.'); kickoff(0); }
    else fullTime();
  } else if (golden && !cup && clock >= HALF * 2 + 45) fullTime();
}
function fullTime() {
  mode = 'full'; over = true; owner = null; A.sfx('whistle'); menuAfter.i = 0; kickT = 3.2;
  const w = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1; for (const p of all) p.cheer = p.side === w ? 99 : 0;
  say(w < 0 ? 'FULL TIME: A DRAW.' : 'FULL TIME! ' + TEAMS[w].name + ' WIN IT, ' + Math.max(...score) + ' - ' + Math.min(...score) + '.');
  if (!demo) A.music(w === 0 ? ANTHEM : null);
}
/** the match is over: the cup's back page for the result, or the rematch menu */
function cupResult() {
  const w = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1, R = ROUNDS[cup.round];
  if (w === 0) {
    if (cup.round === ROUNDS.length - 1) { cup.won = true; card = { kind: 'end', head: R.win, body: ["THE CUP IS KIPPERTON'S.", 'Kingsbridge Albion have demanded a recount.'], cue: 'PRESS ' + game.input.label('confirm') + ' TO CONTINUE' }; }
    else { cup.round++; card = { kind: 'win', head: R.win, body: [R.post, 'NEXT: ' + ROUNDS[cup.round].name + ' AGAINST ' + CLUBS[ROUNDS[cup.round].club].full + '.'], cue: 'PRESS ' + game.input.label('confirm') + ' FOR THE NEXT ROUND' }; }
  } else {
    cup.lost++; card = { kind: 'lose', head: R.loss, body: [score[0] + ' - ' + score[1] + ' AGAINST ' + CLUBS[R.club].full + '.', 'MAGS: "Right. We go again."'], cue: 'PRESS ' + game.input.label('confirm') + ' TO TRY AGAIN, ' + game.input.label('cancel') + ' FOR THE MENU' };
  }
  mode = 'card';
}
/** the cup's back pages: confirm moves on, cancel leaves for the menu */
function cardStep() {
  const I = game.input;
  if (I.pressed('cancel')) { toMenu(); return; }
  if (!I.pressed('confirm')) return;
  if (card.kind === 'pre') startRound();
  else if (card.kind === 'win') roundCard();
  else if (card.kind === 'lose') roundCard();
  else if (card.kind === 'end') toMenu();
}

/* ---------- update ---------- */
function update(dt) {
  t += dt; toastT = Math.max(0, toastT - dt);
  const I = game.input;
  if (demo && I.anyPressed()) { toMenu(); return; }   // any input leaves the demo
  if (mode === 'menu') {
    if (I.anyPressed()) idle = 0; else idle += dt;
    if (!menuMain.update(dt)) pickOnStart(menuMain);
    if (idle > 10) { idle = 0; startDemo(); }
    return;
  }
  if (mode === 'pick') { if (!menuPick.update(dt) && I.pressed('cancel')) toMenu(); return; }
  if (mode === 'join') {
    if (I.pressed('start') || I.pressed('confirm')) { I.consumeAll(); startMatch(true); }
    else if (I.pressed('cancel')) toMenu();
    return;
  }
  if (mode === 'about') { if (I.pressed('confirm') || I.pressed('cancel')) toMenu(); return; }
  if (mode === 'card') { cardStep(); return; }
  if (mode === 'dev') { devStep(); return; }
  talk.update(dt);
  if (mode === 'full') {
    for (const p of all) playerStep(p, dt);
    if (demo) { if ((kickT -= dt) <= 0) startDemo(); return; }
    if (cup) { if ((kickT -= dt) <= 0) cupResult(); return; }
    if (!menuAfter.update(dt) && I.pressed('cancel')) toMenu();
    return;
  }
  if (mode === 'kickoff' || mode === 'goal' || mode === 'half') {
    for (const p of all) playerStep(p, dt);
    if ((kickT -= dt) <= 0) {
      if (mode === 'goal' && over) return fullTime();
      if (mode === 'goal' || mode === 'half') kickoff(restartBy);
      else { mode = 'play'; owner = team[restartBy][0]; kickHold = 2.5; A.sfx('whistle'); }
    }
    return;
  }
  if (mode === 'play') matchStep(dt);
}
/** a start press on a menu (the pads' way of choosing) */
function pickOnStart(m) { const Pl = game.players; if (Pl.some(Ic => Ic.pressed('start'))) { Pl.forEach(Ic => Ic.consumeAll()); m.onPick(m.i); } }
/** the dev panel: up and down pick a row, left and right change it, confirm on the reset and back rows */
function devStep() {
  const I = game.input, n = DEV.length + 2;
  if (I.pressed('cancel') || I.pressed('start')) { if (devReturn === 'menu') toMenu(); else mode = devReturn; return; }
  if (I.repeat('up', .35, .12)) devSel = (devSel + n - 1) % n;
  if (I.repeat('down', .35, .12)) devSel = (devSel + 1) % n;
  const row = DEV[devSel];
  if (row) {
    const L = I.repeat('left', .35, .12), R = I.repeat('right', .35, .12), C = I.pressed('confirm');
    if (row.bool && (L || R || C)) { setCFG(row, !CFG[row.k]); A.sfx('blip'); }
    else if (!row.bool && (L || R || C)) {
      const dir = R || C ? 1 : -1;
      setCFG(row, Math.round(clamp(CFG[row.k] + dir * row.step, row.min, row.max) * 1000) / 1000);
      A.sfx('blip');
    }
  }
  if (devSel === DEV.length && I.pressed('confirm')) { resetCFG(); A.sfx('select'); notice('DEFAULTS RESTORED', 1.6); }
  if (devSel === DEV.length + 1 && I.pressed('confirm')) { if (devReturn === 'menu') toMenu(); else mode = devReturn; }
}

/* ---------- draw ---------- */
function draw(r) {
  if (mode === 'menu' || mode === 'pick' || mode === 'join' || mode === 'about' || mode === 'dev' || mode === 'card') return drawFront(r);
  const view = E.charView(r.view);
  map.drawFloor(r); map.queueWalls(r);
  for (const f of CROWD) {
    const side = f.side, jumpAmp = europhoria[side] > 0 ? 9 : 5;
    const up = mode === 'goal' && stats.goals.length && stats.goals[stats.goals.length - 1][0] === side ? Math.abs(Math.sin(t * 9 + f.ph)) * jumpAmp
      : europhoria[side] > 0 ? Math.abs(Math.sin(t * 11 + f.ph)) * 6 : Math.sin(t * 2 + f.ph) * .6;
    const shirt = f.v > .5 ? TEAMS[side].chip : '#eef0f6';
    r.queue(f.x, f.y, f.z + up, g => { const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); });
  }
  for (const gx of [X0, X1]) for (const py of [CY - GH, CY + GH]) r.queue(gx, py, 0, g => { const [x, y] = r.w(gx, py, 0), [, y1] = r.w(gx, py, BAR); px.rect(g, Math.round(x) - 1, Math.round(y1), 2, Math.round(y - y1), '#f4f4f0'); });
  for (const gx of [X0, X1]) r.queue(gx, CY + GH, BAR, g => { const [x0, y0] = r.w(gx, CY - GH, BAR), [x1, y1] = r.w(gx, CY + GH, BAR); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f4f4f0', 2); }, { bias: 1 });
  for (const p of all) {
    const b = p.body; r.shadow(b.x, b.y, 6, .35);
    r.actor(b.x, b.y, b.z, (g, ox, oy) => p.rig.draw(g, ox, oy, view));
    if (p.input) r.queue(b.x, b.y, 40, g => { const [x, y] = r.w(b.x, b.y, 40); px.poly(g, [[x - 3, y - 4], [x + 3, y - 4], [x, y]], '#ffe08a'); }, { emissive: true });
    if (p.charging) r.queue(b.x, b.y, 44, g => { const [x, y] = r.w(b.x, b.y, 44); E.ui.bar(g, Math.round(x) - 10, Math.round(y) - 6, 20, 4, p.meter, p.meter > .8 ? '#ff6a3a' : '#ffd36a'); });
  }
  r.shadow(ball.x, ball.y, 3 - Math.min(1.5, ball.z * .05), .4);
  r.sprite(ball.x, ball.y, ball.z + 2.5, Math.floor(ball.roll / 8) % 2 ? BALL2 : BALL, { anchor: 'center' });
  r.overlay(g => hud(g, r));
  talk.draw(r);
  if (mode === 'full') { r.overlay(g => results(g, r)); if (!cup && !demo) menuAfter.draw(r); }
}
function hud(g, r) {
  const left = golden ? 'GOLDEN GOAL' : (half === 1 ? '1ST ' : '2ND ') + mmss(Math.max(0, CFG.half * half - clock));
  E.ui.box(g, 4, 4, 150, 16, { bg: '#141826', border: '#6a7090', alpha: .85 });
  px.rect(g, 8, 9, 6, 6, TEAMS[0].chip); px.rect(g, 84, 9, 6, 6, TEAMS[1].chip);
  E.font.text(g, TEAMS[0].name + ' ' + score[0], 17, 8, '#f0ecdc', { font: 'tiny', outline: false });
  E.font.text(g, score[1] + ' ' + TEAMS[1].name, 93, 8, '#f0ecdc', { font: 'tiny', outline: false });
  E.font.text(g, left, 4, 24, golden ? '#ffd36a' : '#c8d0e8', { font: 'tiny', outline: '#000' });
  // the crowd's euphoria meter for the player's side: fills with goals and good play; full, E (or Space, Pad5) releases a Europhoria
  if (CFG.overTheTop && !demo) {
    const w = 96, x = 4, y = r.H - 12;
    E.ui.box(g, x - 2, y - 2, w + 4, 8, { bg: '#141826', border: '#6a7090', alpha: .85 });
    E.ui.bar(g, x, y, w, 4, eu[0] / 100, europhoria[0] > 0 ? '#ffd36a' : eu[0] >= 100 ? '#ff6a3a' : '#f08a24');
    E.font.text(g, europhoria[0] > 0 ? 'EUROPHORIA ' + Math.ceil(europhoria[0]) : eu[0] >= 100 ? 'EUROPHORIA READY: PRESS ' + game.input.label('euphoria') : 'EUPHORIA', x, y - 8, '#f0ecdc', { font: 'tiny', outline: '#000' });
  }
  // the radar: the pitch small, the players as their colors, the ball white
  const s = 2.4 / T, w = Math.round((X1 - X0) * s), h = Math.round((Y1 - Y0) * s), x0 = r.W - w - 6, ca = game.cornerArea(), y0 = ca && ca.x0 < x0 + w ? Math.ceil(ca.y1) + 4 : 26;
  E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#183a1e', border: '#6a9070', alpha: .75 });
  for (const p of all) px.rect(g, Math.round(x0 + (p.body.x - X0) * s) - 1, Math.round(y0 + (p.body.y - Y0) * s) - 1, 2, 2, TEAMS[p.side].chip);
  px.rect(g, Math.round(x0 + (ball.x - X0) * s), Math.round(y0 + (ball.y - Y0) * s), 1, 1, '#ffffff');
  if (cup) E.font.text(g, ROUNDS[cup.round].name, 4, 36, '#e8c070', { font: 'tiny', outline: '#000' });
  if (superT > 0) E.font.title(g, 'SUPER STRIKE!', r.W / 2, r.H * .3, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffd36a', '#ff6a3a'] });
  if (mode === 'kickoff') E.font.text(g, 'KICK OFF', r.W / 2, r.H * .3, '#ffe7a8', { align: 'center', scale: 2, shadow: '#000', outline: false });
  if (mode === 'goal') E.font.title(g, 'GOAL!', r.W / 2, r.H * .28, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
  if (mode === 'half') E.font.text(g, 'HALF TIME', r.W / 2, r.H * .3, '#ffe7a8', { align: 'center', scale: 2, shadow: '#000', outline: false });
  if (demo) E.font.text(g, 'DEMO: PRESS ANY KEY TO PLAY', r.W / 2, 36, '#e8c070', { align: 'center', font: 'tiny', shadow: '#000', outline: false });
  if (toastT > 0) E.font.text(g, toast, r.W / 2, r.H * .42, '#ffe7a8', { align: 'center', font: 'tiny', shadow: '#000', outline: false });
}
function results(g, r) {
  const w = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
  E.ui.box(g, r.W / 2 - 110, 52, 220, 128, { bg: '#141826', border: '#e8c070', alpha: .92 });
  E.font.title(g, w < 0 ? 'A DRAW' : TEAMS[w].name + ' WIN', r.W / 2, 60, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
  E.font.text(g, TEAMS[0].name + ' ' + score[0] + ' - ' + score[1] + ' ' + TEAMS[1].name, r.W / 2, 86, '#f0ecdc', { align: 'center', outline: false });
  stats.goals.slice(-5).forEach(([s, name, at], i) => E.font.text(g, mmss(at) + '  ' + name + ' (' + TEAMS[s].name + ')', r.W / 2, 100 + i * 9, '#c8d0e8', { align: 'center', font: 'tiny', outline: false }));
}

/** the front end: the menu, the club pick, the versus join, the cup's back pages, the About screen and the dev panel */
const touchOnly = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-hover: hover)').matches;
const prompt = (a, word) => game.input.label(a) + ' ' + word;
function drawFront(r) {
  r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
  if (touchOnly()) { r.overlay(g => { E.font.title(g, 'CONTROLLER OR KEYBOARD', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'] }); E.font.title(g, 'REQUIRED', r.W / 2, r.H / 2 + 0, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'] }); }); return; }
  if (mode === 'card') return drawCard(r);
  if (mode === 'about') return drawAbout(r);
  if (mode === 'dev') return drawDev(r);
  r.overlay(g => {
    E.font.title(g, 'EUROPHORIA', r.W / 2, 14, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
    E.font.title(g, 'FOOTBALL', r.W / 2, 44, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
    if (mode === 'menu') E.font.text(g, 'THE BROKE SEASIDE CLUB, THE CONTINENT, THE CUP', r.W / 2, 74, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
    if (mode === 'pick') E.font.text(g, 'PICK YOUR CLUB. THE NEXT ONE ALONG IS THE OPPONENT.', r.W / 2, 74, '#ffe7a8', { align: 'center', font: 'tiny', outline: false });
    if (mode === 'join') {
      const Pl = game.players;
      E.font.text(g, 'VERSUS: PRESS 2 ON THE KEYBOARD, OR START ON A PAD, TO JOIN', r.W / 2, 96, '#ffe7a8', { align: 'center', font: 'tiny', outline: false });
      ['P1 KIPPERTON', 'P2 OPPONENT', 'P3 KIPPERTON', 'P4 OPPONENT'].forEach((s, i) => E.font.text(g, s + (Pl[i] ? '  READY' : '  ...'), r.W / 2 - 40, 112 + i * 12, Pl[i] ? E.PLAYER_COLORS[i] : '#6a7090', { outline: false }));
      E.font.text(g, prompt('confirm', 'PLAY') + '   ' + prompt('cancel', 'BACK'), r.W / 2, 172, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
    }
    if (mode === 'menu') E.font.text(g, 'KIPPERTON CAN ONLY GET BETTER', r.W / 2, r.H - 26, '#ffe7a8', { align: 'center', font: 'tiny', shadow: '#000', outline: false });
  });
  if (mode === 'menu') menuMain.draw(r);
  if (mode === 'pick') menuPick.draw(r);
}
/** a wrap at about n characters, so a line fits the screen's width in the small font */
function wrap(s, n) { const out = []; let line = ''; for (const w of String(s).split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; }
function drawCard(r) {
  const k = card.kind === 'pre' ? '#e8c070' : card.kind === 'lose' ? '#ff5a4a' : '#8ad46a';
  const head = wrap(card.head, 22), body = card.body.flatMap(l => wrap(l, 58));
  r.overlay(g => {
    E.ui.box(g, 12, 22, r.W - 24, r.H - 44, { bg: '#f0e6c8', border: k, alpha: .97 });
    E.ui.box(g, 12, 22, r.W - 24, 22, { bg: k, border: k, alpha: 1 });
    E.font.title(g, card.kind === 'pre' ? 'THE DAILY ROAR' : card.kind === 'end' ? 'THE CUP' : card.kind === 'lose' ? 'FULL TIME' : 'BACK PAGE', r.W / 2, 27, { align: 'center', scale: 1, colors: ['#1a1408', '#1a1408'] });
    head.forEach((line, i) => E.font.title(g, line, r.W / 2, 54 + i * 18, { align: 'center', scale: 2, colors: ['#2a1a08', '#4a2a10'] }));
    const y0 = 54 + head.length * 18 + 8;
    body.slice(0, 7).forEach((line, i) => E.font.text(g, line, 22, y0 + i * 11, '#2a2010', { font: 'tiny', outline: false }));
    E.font.text(g, card.cue, r.W / 2, r.H - 40, '#2a2010', { align: 'center', font: 'tiny', outline: false });
  });
}
function drawAbout(r) {
  r.overlay(g => {
    E.font.title(g, 'ABOUT AND CREDITS', r.W / 2, 6, { align: 'center', scale: 1, colors: ['#fffbe8', '#ffe08a'] });
    const L = (ABOUT.lines || []).flatMap(l => wrap(l, 60));
    L.slice(0, 18).forEach((l, i) => E.font.text(g, l, 8, 24 + i * 9, '#dfe6ff', { font: 'tiny', outline: false }));
    E.font.text(g, prompt('confirm', 'BACK'), r.W / 2, r.H - 14, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
  });
}
function drawDev(r) {
  r.overlay(g => {
    E.font.title(g, 'DEV MODE', r.W / 2, 6, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'] });
    E.font.text(g, 'UP DOWN PICK. LEFT RIGHT CHANGES. SAVED IN THIS BROWSER.', r.W / 2, 30, '#9aa6c8', { align: 'center', font: 'tiny', outline: false });
    DEV.forEach((d, i) => {
      const v = d.bool ? (CFG[d.k] ? 'ON' : 'OFF') : String(CFG[d.k]);
      E.font.text(g, (i === devSel ? '> ' : '  ') + d.label + ':  ' + v, r.W / 2 - 110, 48 + i * 12, i === devSel ? '#ffe08a' : '#dfe6ff', { font: 'tiny', outline: false });
    });
    const rows2 = ['RESET TO DEFAULTS', 'BACK'];
    rows2.forEach((label, j) => E.font.text(g, (devSel === DEV.length + j ? '> ' : '  ') + label, r.W / 2 - 110, 48 + (DEV.length + j) * 12 + 6, devSel === DEV.length + j ? '#ffe08a' : '#dfe6ff', { font: 'tiny', outline: false }));
  });
}

/* ---------- the scene: one scene, the mode says what it is doing ---------- */
const scene = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  get pausable() { return !demo && (mode === 'play' || mode === 'half' || mode === 'goal' || mode === 'kickoff'); },
  enter() { game.cam.bounds = null; mode = 'menu'; A.music('title'); },
  update, draw,
  back() { if (mode === 'menu') return false; toMenu(); return true; }
};

/* the debug hooks for the tests (tools/test.mjs): read the state, play a step, set the match up */
game.debug = {
  snapshot: () => ({ mode, clock: +clock.toFixed(2), score: score.slice(), half, golden, eu: eu.map(v => Math.round(v)), europhoria: europhoria.map(v => +v.toFixed(2)),
    owner: owner && owner.name, ball: ball && [Math.round(ball.x), Math.round(ball.y), Math.round(ball.z)], cup: cup && { round: cup.round, lost: cup.lost, won: cup.won },
    demo, card: card && card.kind, stats: stats && { passes: stats.passes, shots: stats.shots, supers: stats.supers, goals: stats.goals.length, tackles: stats.tackles, done: stats.done } }),
  mode: () => mode,
  setMode: m => { mode = m; },
  startCup,
  kickAbout: (h, a) => { home = h; away = a; kickAbout(); },
  startDemo,
  toMenu,
  openDev,
  devSel: () => devSel,
  setDevSel: i => { devSel = i; },
  cfg: () => Object.assign({}, CFG),
  resetDev: resetCFG,
  setCFG: (k, v) => setCFG(DEV.find(d => d.k === k), v),
  setEu: (s, v) => { eu[s] = v; },
  setScore: (a, b) => { score = [a, b]; },
  setOwner: (side, k = 0) => { owner = team[side][k]; },
  clockSet: c => { clock = c; },
  matchStep: dt => matchStep(dt),
  brain: (side, k) => brain(team[side][k], 1 / 120),
  players: () => all,
  setInput: (side, k, input) => { team[side][k].input = input; },
  forceEnd: () => { clock = CFG.half * 2 + 1; if (['kickoff', 'play', 'half', 'goal'].includes(mode)) fullTime(); },
  resultCard: () => cupResult(),
  cardStep: () => cardStep(),
  update: dt => update(dt),
  shot: (side, k, power, aimY) => shoot(team[side][k], power, aimY),
  triggerEuphoria: s => triggerEuphoria(s)
};
game.start({ scenes: { main: scene }, scene: 'main' });
window.__game = { game, mode: () => mode, ROUNDS, CLUBS, CFG, DEV };
})();
