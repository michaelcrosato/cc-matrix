/* Ice Hoc-Kaboom: skate, dangle and rip the puck past the goalie while you hammer rivals through the glass; fill your team's
 * BOOM meter to go KABOOM; win the scrap when the gloves drop; outscore them before the final horn. */
(() => {
// ---- 00-head.js ----
'use strict';
/* ICE HOC-KABOOM. Core loop: skate, dangle and rip the puck past the goalie while you hammer rivals through the glass; fill
 * your team's BOOM meter to go KABOOM; win the scrap when the gloves drop; outscore them before the final horn.
 * Built on my-3D2dge v0.85.2 (patched: see ENGINE-CHANGES.md). Modules are concatenated in file-name order into one IIFE. */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const VERSION = '1.0.0';
const HUB = !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active);
const PI = Math.PI;
const HEADLESS = typeof document === 'undefined' || !document.getElementById || !document.getElementById('screen');

/* the controls: the engine's menu keys, plus hockey's own actions (PLAN 6.1) */
const HOCKEY_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  pass: ['KeyJ', 'Mouse2', 'Pad0'], shoot: ['KeyK', 'Mouse0', 'Pad2'], deke: ['KeyL', 'Space', 'Pad1'], lob: ['KeyI', 'Mouse1', 'Pad3'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], chirp: ['KeyC', 'Pad4'], switch: ['KeyQ', 'Pad6'], camera: ['KeyV', 'Pad11'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'Pad1'],
  tabL: ['KeyQ', 'Pad4', 'PageUp'], tabR: ['KeyE', 'Pad5', 'PageDown'], reset: ['KeyR', 'Pad3']
};
const CONTROL_NAMES = { pass: 'Pass / Switch', shoot: 'Shoot / Check', deke: 'Deke / Poke', lob: 'Saucer / Gloves', turbo: 'Turbo', chirp: 'Chirp',
  switch: 'Switch player', camera: 'Camera', tabL: false, tabR: false, reset: false };

const SETTINGS = [
  { key: 'symbols', label: 'Button symbols', options: ['PlayStation', 'Xbox'], value: 'PlayStation', help: 'Prompts for a controller' },
  { key: 'difficulty', label: 'Difficulty', options: ['Rookie', 'Pro', 'All-Star', 'Legend'], value: 'Pro' },
  { key: 'periodLen', label: 'Period length', options: ['1:00', '1:30', '2:00', '3:00', '4:00'], value: '2:00' },
  { key: 'camera', label: 'Camera', options: ['Broadcast', 'Overhead'], value: 'Broadcast' },
  { key: 'camDist', label: 'Camera distance', options: ['Near', 'Normal', 'Far'], value: 'Normal' },
  { key: 'commentary', label: 'Commentary', value: true },
  { key: 'subtitles', label: 'Subtitles', value: true },
  { key: 'voices', label: 'Voices volume', type: 'slider', min: 0, max: 1, step: .1, value: .8 },
  { key: 'crowd', label: 'Crowd volume', type: 'slider', min: 0, max: 1, step: .1, value: .7 },
  { key: 'intros', label: 'Player intros', value: true },
  { key: 'replays', label: 'Replays', options: ['Auto', 'Off'], value: 'Auto' },
  { key: 'flood', label: 'Flood Wagon', options: ['Ask', 'Always', 'Never'], value: 'Ask' },
  { key: 'trail', label: 'Puck trail', options: ['Off', 'Streak', 'Glow'], value: 'Streak' },
  { key: 'tips', label: 'Tips', value: true }
].map(s => Object.assign({ group: 'Game' }, s));

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#05070c', input: HOCKEY_KEYS, id: 'ice-hoc-kaboom',
  autoPause: !HUB,
  menu: HUB ? { items: [], settings: SETTINGS, controls: CONTROL_NAMES, quit: false } : {
    items: [['Objectives & Info', () => Match.showInfo()], ['Restart Game', () => Match.restart()], ['Dev Mode', () => Dev.openFromMenu()]],
    settings: SETTINGS, controls: CONTROL_NAMES, quit: 'title' }
});
const A = game.audio, P = game.particles, L = game.lights;
const S = () => game.settings;
const R = () => game.r;
const scenes = {};

// ---- 01-util.js ----
/* ---- U: math helpers, the random streams, the name sanitizer ---- */
const U = (() => {
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  const approachAng = (a, b, step) => { const d = angDiff(b, a); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; };
  const segDist = (px0, py0, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, u = clamp(((px0 - ax) * vx + (py0 - ay) * vy) / l, 0, 1); return Math.hypot(ax + vx * u - px0, ay + vy * u - py0); };
  const gauss = rnd => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  const sanitize = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?').slice(0, 16);
  const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const pick = (rnd, list) => list[Math.floor(rnd() * list.length) % list.length];
  const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m);
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  return { angDiff, approachAng, segDist, gauss, sanitize, mmss, pick, fill, hashStr };
})();
/* RNG: the simulation draws only from RNG.sim (seeded per match); effects, crowd and commentary from RNG.fx */
const RNG = { sim: E.rng(1), fx: E.rng(99), seed: 1, reseed(n) { this.seed = n >>> 0; this.sim = E.rng(this.seed || 1); } };

/* ---- Bus: simulation events, heard by stats, objectives, Talk, Fx, Crowd, Net and Replay ---- */
const Bus = (() => {
  const subs = {}, log = [];
  let id = 0;
  return {
    log,
    on(type, fn) { (subs[type] || (subs[type] = [])).push(fn); },
    emit(type, data = {}) {
      const ev = Object.assign({ type, id: ++id, t: game.time }, data);
      log.push(ev); if (log.length > 400) log.shift();
      for (const fn of (subs[type] || [])) { try { fn(ev); } catch (e) { game.fail('event ' + type, e); } }
      for (const fn of (subs['*'] || [])) { try { fn(ev); } catch (e) { game.fail('event *', e); } }
      return ev;
    },
    seen(type) { return log.some(e => e.type === type); },
    clear() { log.length = 0; }
  };
})();

/* ---- T: every tunable number (PLAN Appendix A): defaults, live values, slider metadata; persisted for designers ---- */
const T = (() => {
  const ROWS = [
    ['Skating', 'skateMax', 132, 80, 200, 1, 'Top speed'], ['Skating', 'skateAccel', 300, 120, 600, 10, 'Acceleration'], ['Skating', 'iceGlide', 28, 0, 120, 1, 'Coasting drag'],
    ['Skating', 'turnSlow', 5, 1, 10, .1, 'Turn rate (slow)'], ['Skating', 'turnFast', 2.6, 1, 10, .1, 'Turn rate (fast)'], ['Skating', 'edgeGrip', 6, 1, 20, .5, 'Edge grip'],
    ['Skating', 'stopDecel', 700, 300, 1400, 10, 'Hockey-stop braking'], ['Skating', 'turboMul', 1.45, 1, 2, .05, 'Turbo speed'],
    ['Skating', 'turboDrain', .45, 0, 2, .05, 'Turbo drain /s'], ['Skating', 'turboRegen', .18, 0, 2, .02, 'Turbo regen /s'],
    ['Puck & Passing', 'puckFriction', 26, 0, 80, 1, 'Puck friction'], ['Puck & Passing', 'puckDrag', .12, 0, .5, .01, 'Puck drag'],
    ['Puck & Passing', 'boardBounce', .62, .2, 1, .02, 'Boards bounce'], ['Puck & Passing', 'pickupRadius', 8, 4, 16, .5, 'Pickup radius'],
    ['Puck & Passing', 'passMin', 240, 150, 600, 10, 'Pass speed min'], ['Puck & Passing', 'passMax', 420, 150, 600, 10, 'Pass speed max'], ['Puck & Passing', 'saucerApex', 10, 4, 24, 1, 'Saucer height'],
    ['Shooting', 'wristSpeed', 330, 200, 500, 5, 'Wrist shot speed'], ['Shooting', 'slapBase', 380, 200, 600, 5, 'Slapshot base'], ['Shooting', 'slapGain', 160, 0, 400, 5, 'Slapshot charge gain'],
    ['Shooting', 'slapCharge', .9, .3, 2, .05, 'Slapshot charge time'], ['Shooting', 'oneTimerBonus', 1.15, 1, 1.6, .05, 'One-timer bonus'], ['Shooting', 'shotError', 1, 0, 3, .05, 'Shot error scale'],
    ['Goalies', 'goalieReact', .18, .05, .4, .01, 'Reaction time'], ['Goalies', 'goalieLateral', 150, 60, 300, 5, 'Lateral speed'], ['Goalies', 'goalieReach', 1, .6, 1.6, .02, 'Save reach'],
    ['Goalies', 'goalieRead', 1, 0, 4, .05, 'Read error scale'], ['Goalies', 'gloveCatch', .55, 0, 1, .05, 'Glove freeze chance'], ['Goalies', 'reboundSpeed', .35, 0, .8, .02, 'Rebound factor'], ['Goalies', 'kaboomBlast', .6, 0, 1, .05, 'KABOOM blast-through'],
    ['Hitting', 'checkPower', 1, .3, 3, .05, 'Check power'], ['Hitting', 'knockdown', 150, 60, 300, 5, 'Big-hit threshold'], ['Hitting', 'glassCrack', 170, 80, 400, 5, 'Glass crack speed'],
    ['Hitting', 'glassShatter', 240, 80, 400, 5, 'Glass shatter speed'], ['Hitting', 'accidentalHit', 180, 80, 400, 5, 'Knockdown without a check'],
    ['AI', 'aiSkillHome', -1, -1, 1, .05, 'AI skill home (-1 = by difficulty)'], ['AI', 'aiSkillAway', -1, -1, 1, .05, 'AI skill away (-1 = by difficulty)'],
    ['AI', 'aiAggression', .5, 0, 1, .05, 'AI aggression'], ['AI', 'aiItemGreed', 120, 0, 300, 5, 'AI item detour range'], ['AI', 'aiShootRange', 200, 80, 400, 5, 'AI shooting range'],
    ['BOOM & Items', 'boomGain', .4, 0, 4, .05, 'BOOM gain'], ['BOOM & Items', 'kaboomTime', 15, 5, 40, 1, 'KABOOM seconds'], ['BOOM & Items', 'itemEvery', 35, 8, 120, 1, 'Seconds between fan throws'],
    ['Fights', 'fightBalance', 100, 40, 200, 5, 'Fighter balance'], ['Fights', 'fightGrudge', 40, 0, 100, 1, 'Grudge to drop gloves'], ['Fights', 'fightMax', 3, 0, 10, 1, 'Fights per game'], ['Fights', 'sinBin', 20, 5, 60, 1, 'Sin bin seconds'],
    ['Match', 'periodLen', 120, 30, 300, 5, 'Exhibition period (s)'], ['Match', 'gameSpeed', 1, .25, 2, .05, 'Game speed'], ['Match', 'crowdHype', 1, 0, 2, .05, 'Crowd reaction']
  ];
  const T = {}, META = {}, DEF = {};
  for (const [group, key, def, min, max, step, label] of ROWS) { T[key] = def; DEF[key] = def; META[key] = { group, key, def, min, max, step, label }; }
  const saved = !HUB && E.store.get('dev:tuning', null);
  if (saved) for (const k in saved) if (k in DEF && typeof saved[k] === 'number') T[k] = clamp(saved[k], META[k].min, META[k].max);
  const persist = () => { if (HUB) return; const o = {}; for (const k in DEF) if (T[k] !== DEF[k]) o[k] = T[k]; E.store.set('dev:tuning', o); };
  Object.defineProperties(T, {
    META: { value: META }, DEF: { value: DEF }, ROWS: { value: ROWS },
    set: { value(k, v) { const m = META[k]; if (!m) return; T[k] = clamp(Math.round(v / m.step) * m.step, m.min, m.max); T[k] = +T[k].toFixed(4); persist(); } },
    reset: { value(k) { T[k] = DEF[k]; persist(); } },
    resetAll: { value() { for (const k in DEF) T[k] = DEF[k]; persist(); } },
    changed: { value() { const o = {}; for (const k in DEF) if (T[k] !== DEF[k]) o[k] = T[k]; return o; } }
  });
  return T;
})();

// ---- 04-data-teams.js ----
/* ---- TEAMS: six clubs (PLAN 11.1). Ratings 1-5: spd sht pas hit fgt hnd; goalies rfx size reb. Everything is data ---- */
const TEAMS = (() => {
  // a player: [num, first, nick, last, role, build, [spd, sht, pas, hit, fgt, hnd], hand (1 right, -1 left), look]
  const sk = (num, name, nick, role, build, r, hand, look) => ({ num, name, nick, role, build, spd: r[0], sht: r[1], pas: r[2], hit: r[3], fgt: r[4], hnd: r[5], hand, look });
  const gk = (num, name, nick, r, look) => ({ num, name, nick, goalie: true, rfx: r[0], size: r[1], reb: r[2], look });
  const T = {
    muskrats: { id: 'muskrats', name: 'Mukluk Falls Muskrats', short: 'MUSKRATS', abbr: 'MUK', town: 'MUKLUK FALLS', dark: '#5a3a22', trim: '#e8b43a', light: '#f3e6c8', voice: 'mid',
      song: ['G4', 'B4', 'D5', 'G5'], logo: 'muskrat', arena: 'icebox',
      skaters: [sk(9, 'Duncan MacPhail', 'Dunny', 'C', 'heroic', [4, 3, 5, 3, 2, 4], -1, { hair: 'short', hairC: '#c8742a', skin: '#f0c8a0', voice: 'dunny', celebrate: 'pump' }),
        sk(19, 'Priya Sandhu', 'Snipes', 'W', 'heroic', [5, 5, 3, 2, 2, 5], 1, { hair: 'ponytail', hairC: '#1a1414', skin: '#b8805a', voice: 'snipes', celebrate: 'sniper' }),
        sk(44, 'Lou Beaudoin', 'Big Lou', 'D', 'bulky', [2, 4, 2, 5, 5, 2], 1, { hair: 'bald', hairC: '#3a2a20', skin: '#8a5a3a', voice: 'lou', celebrate: 'guitar' })],
      goalie: gk(31, 'Lemmy Kowalchuk', 'The Sieve', [3, 4, 3], { hair: 'long', hairC: '#d8c890', skin: '#f0d0b0', voice: 'lemmy', mask: '#e8b43a', pads: '#f3e6c8' }),
      trait: 'posts' },
    drillers: { id: 'drillers', name: 'Dryfork Drillers', short: 'DRILLERS', abbr: 'DRY', town: 'DRYFORK', dark: '#1d1d22', trim: '#f07a1a', light: '#f2efe8', voice: 'low', song: ['E4', 'G4', 'A4', 'E5'], logo: 'derrick', arena: 'icebox',
      skaters: [sk(7, 'Rig McCoy', 'Rig', 'C', 'heroic', [3, 3, 4, 3, 3, 3], 1, { hair: 'short', hairC: '#5a3a1a', skin: '#e8b890' }),
        sk(15, 'Gusher Gomez', 'Gusher', 'W', 'heroic', [4, 4, 3, 2, 2, 4], -1, { hair: 'spiky', hairC: '#1a1210', skin: '#c08a60' }),
        sk(2, 'Drill Bit Dobbs', 'Drill Bit', 'D', 'heroic', [3, 2, 2, 4, 3, 2], 1, { hair: 'short', hairC: '#b89060', skin: '#f0c8a8' })],
      goalie: gk(35, 'Derrick Okafor', 'Derrick', [2, 3, 2], { hair: 'short', hairC: '#140c0a', skin: '#6a4028', mask: '#f07a1a', pads: '#1d1d22' }) },
    lumberjacks: { id: 'lumberjacks', name: 'Logjam Lumberjacks', short: 'LUMBERJACKS', abbr: 'LOG', town: 'LOGJAM', dark: '#b3262a', trim: '#141414', light: '#efe4cc', voice: 'low', song: ['D4', 'F#4', 'A4', 'D5'], logo: 'log', arena: 'pond', plaid: true,
      skaters: [sk(10, 'Axel Sundqvist', 'Axel', 'C', 'heroic', [3, 4, 3, 3, 3, 3], -1, { hair: 'long', hairC: '#e0c070', skin: '#f0d0b0', beard: true }),
        sk(27, 'Sally Lindgren', 'Sawdust Sally', 'W', 'heroic', [4, 4, 3, 3, 2, 4], 1, { hair: 'ponytail', hairC: '#c8602a', skin: '#f4d0b8' }),
        sk(88, 'Big Timber Thibodeau', 'Big Timber', 'D', 'bulky', [2, 3, 2, 5, 4, 2], 1, { hair: 'long', hairC: '#4a2a14', skin: '#e0a880', beard: true })],
      goalie: gk(1, "Stumpy O'Rourke", 'Stumpy', [3, 4, 3], { hair: 'short', hairC: '#8a4a1a', skin: '#f0c8a0', mask: '#b3262a', pads: '#efe4cc' }) },
    bruisers: { id: 'bruisers', name: 'Grindhouse Bruise Brothers', short: 'BRUISE BROS', abbr: 'GRD', town: 'THE GRINDHOUSE', dark: '#4b2a6b', trim: '#9be04a', light: '#ecf2e0', voice: 'gruff', song: ['A3', 'C4', 'E4', 'A4'], logo: 'fist', arena: 'grindhouse',
      skaters: [sk(66, 'Rocco Bruiser', 'Rocco', 'W', 'bulky', [3, 3, 2, 5, 5, 2], 1, { hair: 'bald', hairC: '#2a1a10', skin: '#d8a078' }),
        sk(67, 'Rollo Bruiser', 'Rollo', 'D', 'bulky', [3, 3, 2, 5, 5, 2], -1, { hair: 'spiky', hairC: '#2a1a10', skin: '#d8a078' }),
        sk(12, 'Mumbles Malone', 'Mumbles', 'C', 'heroic', [4, 4, 3, 2, 3, 4], 1, { hair: 'short', hairC: '#6a6a6a', skin: '#f0c8a0' })],
      goalie: gk(29, 'Tank Tankersley', 'Tank', [3, 5, 2], { hair: 'short', hairC: '#1a1a1a', skin: '#8a5a3a', mask: '#9be04a', pads: '#4b2a6b' }) },
    marauders: { id: 'marauders', name: 'Megaplex Marauders', short: 'MARAUDERS', abbr: 'MEG', town: 'MEGAMALL', dark: '#18b5b0', trim: '#e0389a', light: '#f4f0f8', voice: 'nasal', song: ['C5', 'E5', 'G5', 'C6'], logo: 'cart', arena: 'mall',
      skaters: [sk(23, 'Chad Glitterman', 'Chad', 'C', 'heroic', [4, 3, 4, 2, 1, 4], 1, { hair: 'spiky', hairC: '#f0d060', skin: '#f4d0b8', voice: 'glitter' }),
        sk(8, 'Zoom Zhang', 'Zoom', 'W', 'heroic', [5, 3, 3, 2, 2, 4], -1, { hair: 'short', hairC: '#141018', skin: '#f0d0a8' }),
        sk(5, 'Promo Perkins', 'Promo', 'D', 'heroic', [3, 3, 3, 4, 3, 3], 1, { hair: 'short', hairC: '#7a4a2a', skin: '#a87050' })],
      goalie: gk(40, 'Kiosk Kingsley', 'Kiosk', [4, 3, 4], { hair: 'short', hairC: '#2a1a10', skin: '#e0b090', mask: '#e0389a', pads: '#18b5b0' }) },
    grizzlies: { id: 'grizzlies', name: 'Gilded Grizzlies', short: 'GRIZZLIES', abbr: 'GLD', town: 'THE KABOOM DOME', dark: '#d9a520', trim: '#141414', light: '#fbf6e6', voice: 'nasal', song: ['F4', 'A4', 'C5', 'F5'], logo: 'grizzly', arena: 'dome', locked: true,
      skaters: [sk(1, 'Sterling Glitterman Jr.', 'Sterling', 'C', 'heroic', [5, 5, 4, 3, 2, 5], 1, { hair: 'spiky', hairC: '#ffe070', skin: '#f4d8c0', voice: 'glitter', twister: true }),
        sk(91, 'Silk Sullivan', 'Silk', 'W', 'heroic', [4, 3, 5, 2, 2, 5], -1, { hair: 'long', hairC: '#2a1a14', skin: '#c89070' }),
        sk(55, 'Brick Brickowski', 'Brick', 'D', 'bulky', [3, 4, 2, 5, 5, 2], 1, { hair: 'bald', hairC: '#3a2a1a', skin: '#e0b090' })],
      goalie: gk(0, 'The Vault', 'The Vault', [5, 5, 5], { hair: 'bald', hairC: '#1a1a1a', skin: '#5a3a28', mask: '#141414', pads: '#d9a520', boss: true }) }
  };
  for (const id in T) { const t = T[id]; t.skaters.forEach((s, i) => { s.team = id; s.slot = i; }); t.goalie.team = id; }
  return T;
})();
const TEAM_IDS = ['muskrats', 'drillers', 'lumberjacks', 'bruisers', 'marauders', 'grizzlies'];

/* ---- LOGOS: each a 24 x 24 pixel image drawn from a few shapes into a palette grid ---- */
const LOGOS = (() => {
  const make = (pal, fn) => { const rows = []; for (let y = 0; y < 24; y++) { let s = ''; for (let x = 0; x < 24; x++) s += fn(x + .5, y + .5) || '.'; rows.push(s); } return { rows, pal }; };
  const d = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);
  const ring = (x, y, k0, k1) => { const r = d(x, y, 12, 12); return r < 11.5 ? (r > 9.6 ? k0 : k1) : null; };
  const L = {
    muskrat: make({ r: '#e8b43a', b: '#5a3a22', l: '#8a5a32', w: '#ffffff', k: '#141010', p: '#e88a8a', c: '#f3e6c8' }, (x, y) => {
      const o = ring(x, y, 'r', 'c'); if (!o) return null; if (o === 'r') return 'r';
      if (d(x, y, 7, 6.5) < 2.4 || d(x, y, 17, 6.5) < 2.4) return d(x, y, 7, 6.5) < 1.2 || d(x, y, 17, 6.5) < 1.2 ? 'p' : 'b';
      if (d(x, y, 12, 12.5) < 7.2) { if (d(x, y, 9.3, 10.5) < 1.2 || d(x, y, 14.7, 10.5) < 1.2) return 'k'; if (d(x, y, 12, 13.5) < 1.3) return 'k';
        if (x > 10 && x < 14 && y > 15 && y < 19.5 && Math.abs(x - 12) > .4) return 'w'; return d(x, y, 12, 15) < 3.6 ? 'l' : 'b'; }
      return 'c'; }),
    derrick: make({ o: '#f07a1a', k: '#1d1d22', g: '#8a8a94', w: '#f2efe8', y: '#ffd040' }, (x, y) => {
      const o = ring(x, y, 'o', 'k'); if (!o) return null; if (o === 'o') return 'o';
      const t = (y - 4) / 15; if (y > 4 && y < 19 && Math.abs(x - 12) < 1 + t * 5 && (Math.abs(Math.abs(x - 12) - (1 + t * 5)) < 1 || Math.abs((y % 4) - 2) < .6)) return 'g';
      if (y > 18.5 && y < 20 && Math.abs(x - 12) < 7) return 'w';
      if (d(x, y, 17, 8) < 2 || (y > 4 && y < 8 && Math.abs(x - 17) < (y - 4) * .5)) return 'y';
      return 'k'; }),
    log: make({ r: '#b3262a', k: '#141414', w: '#efe4cc', b: '#8a5a2a', d: '#5a3414', e: '#141414' }, (x, y) => {
      const o = ring(x, y, 'r', 'k'); if (!o) return null; if (o === 'r') return Math.floor(x / 3 + y / 3) % 2 ? 'r' : 'k';
      if (d(x, y, 12, 10) < 6.5) { const rr = d(x, y, 12, 10); if (Math.abs(rr - 4) < .5 || Math.abs(rr - 2) < .4) return 'd'; if (d(x, y, 9.8, 9.2) < .9 || d(x, y, 14.2, 9.2) < .9) return 'e'; return 'b'; }
      if (y > 13 && y < 20 && Math.abs(x - 12) < 7 - (y - 13) * .7) return Math.floor(y) % 2 ? 'r' : 'd';
      return 'w'; }),
    fist: make({ l: '#9be04a', p: '#4b2a6b', s: '#e0b090', d: '#8a5a3a', k: '#1a1028' }, (x, y) => {
      const r = d(x, y, 12, 12), a = Math.atan2(y - 12, x - 12); if (r > 11.5) return null;
      if (r > 8.4) return Math.cos(a * 8) > .1 || r < 9.6 ? 'l' : null;
      if (x > 7 && x < 17 && y > 8 && y < 16) { if (y < 11 && Math.floor(x - 7) % 2.5 < .5) return 'd'; return x < 8.5 && y > 11 ? 'd' : 's'; }
      if (x > 9 && x < 15 && y >= 16 && y < 19) return 'p';
      return 'k'; }),
    cart: make({ t: '#18b5b0', m: '#e0389a', w: '#f4f0f8', k: '#1a1a24', g: '#c0c8d0' }, (x, y) => {
      const o = ring(x, y, 'm', 't'); if (!o) return null; if (o === 'm') return 'm';
      if (x > 6 && x < 18 && y > 10 && y < 16 && (Math.floor(x) % 3 === 0 || Math.floor(y) % 3 === 0 || x < 7 || x > 17 || y > 15)) return 'g';
      if (d(x, y, 8.5, 17.5) < 1.4 || d(x, y, 15.5, 17.5) < 1.4) return 'k';
      if (Math.abs(x - 11) < .6 && y > 3.5 && y < 10.5) return 'k';
      if (x > 11.5 && x < 17 && y > 3.5 && y < 7.5) return d(x, y, 14, 5.5) < 1.2 ? 'w' : 'k';
      return 't'; }),
    grizzly: make({ g: '#d9a520', k: '#141414', b: '#6a3a1a', l: '#a06a3a', w: '#fbf6e6', y: '#ffe070' }, (x, y) => {
      const o = ring(x, y, 'g', 'k'); if (!o) return null; if (o === 'g') return 'g';
      if (y > 2.8 && y < 7 && x > 7 && x < 17 && (y > 5 || Math.abs(((x - 7) % 3.3) - 1.6) < .9)) return 'y';
      if (d(x, y, 7.5, 9) < 2.2 || d(x, y, 16.5, 9) < 2.2) return 'b';
      if (d(x, y, 12, 13) < 6.5) { if (d(x, y, 9.5, 11.5) < 1 || d(x, y, 14.5, 11.5) < 1) return 'k'; if (d(x, y, 12, 15.5) < 2.8) return d(x, y, 12, 14.8) < 1.1 ? 'k' : 'l'; return 'b'; }
      return 'k'; })
  };
  const sprites = {};
  for (const id in L) sprites[id] = E.sprite(L[id].rows, L[id].pal);
  /** the color of a logo pixel (center ice samples it), or null */
  const at = (id, x, y) => { const l = L[id]; if (!l || x < 0 || y < 0 || x >= 24 || y >= 24) return null; const ch = l.rows[y | 0][x | 0]; return ch === '.' ? null : l.pal[ch]; };
  return { L, sprites, at, sprite: id => sprites[id] };
})();

// ---- 05-data-arenas.js ----
/* ---- ARENAS: five barns (PLAN 11.2). The rink's geometry is shared; the dressing is data ---- */
const ARENAS = {
  icebox: { id: 'icebox', name: "The Ol' Icebox", town: 'Mukluk Falls', ambient: .62, outside: [92, 70, 52], floorOut: 'rubber', stand: ['#6a4a2e', '#7a5636', '#5a3c24'], cap: '#8a5a32',
    ads: ['MUKLUK MUFFLER & TIRE', "KOWALCHUK'S PEROGIES", "BAIT 'N' BAGELS", 'SAVE THE ICEBOX'], lamps: [[300, 330], [560, 300], [820, 330], [300, 480], [560, 500], [820, 480]], lampColor: '#ffd8a0',
    items: ['hotsauce', 'tape', 'poutine', 'boombox'], hazards: [], music: 'play', organ: true, crowd: ['#5a3a22', '#e8b43a', '#c8402a', '#3a6ab0', '#e8e0d0'], toque: true, banners: ['1962', 'CHAMPS'] },
  pond: { id: 'pond', name: 'Lake Kabonk', town: 'Logjam', ambient: .45, outside: [214, 226, 240], floorOut: 'snow', stand: ['#e8eef6', '#dfe8f2', '#d0dcea'], cap: '#f4f8ff', snowbank: true,
    ads: [], lamps: [[260, 260], [560, 250], [860, 260]], lampColor: '#ffc880', weather: { kind: 'snow', amount: .5, wind: .2 },
    items: ['cocoa', 'tape', 'lumber', 'boombox'], hazards: ['thinice'], music: 'pond', crowd: ['#c83a2a', '#2a5a9a', '#e8b43a', '#3a8a4a', '#f0f0f0'], parka: true, dusk: true },
  grindhouse: { id: 'grindhouse', name: 'The Grindhouse', town: 'Rustbelt', ambient: .5, outside: [58, 62, 66], floorOut: 'concrete', stand: ['#3a3e44', '#44484e', '#2e3236'], cap: '#9be04a',
    ads: ['RUSTBELT SCRAP', 'IRON GUT CHILI', 'GRINDHOUSE: NO REFUNDS', 'BRUISE BROS FAN CLUB'], lamps: [[300, 320], [560, 320], [820, 320], [440, 480], [700, 480]], lampColor: '#c8ffd0', flicker: true,
    items: ['poutine', 'lumber', 'boombox'], hazards: ['octopus', 'rat'], music: 'grind', crowd: ['#4b2a6b', '#9be04a', '#6a6a6a', '#2a2a2a', '#c8402a'] },
  mall: { id: 'mall', name: 'MegaMall Ice Palace', town: 'MegaMall', ambient: .7, outside: [210, 200, 220], floorOut: 'tile', stand: ['#d8d0e4', '#e4dcee', '#c8c0d8'], cap: '#e0389a',
    ads: ['GLITTERMAN MEGAPLEX: COMING SOON!', 'FOOD COURT ->', '50% OFF SKATES', 'MALL MONEY ACCEPTED', 'POLAR PETE SAYS HI'], lamps: [[300, 300], [560, 300], [820, 300], [300, 500], [820, 500]], lampColor: '#ffe0ff', neon: true,
    items: ['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox'], hazards: ['mascot', 'drop'], music: 'mall', crowd: ['#18b5b0', '#e0389a', '#f0d060', '#f4f0f8', '#5a5ae0'] },
  dome: { id: 'dome', name: 'The Kaboom Dome', town: 'Glitterman City', ambient: .55, outside: [40, 34, 26], floorOut: 'carpet', stand: ['#2a2420', '#342c26', '#221c18'], cap: '#d9a520',
    ads: ['GLITTERMAN INDUSTRIES', 'GOLD-PLATED PARKING', 'KABOOM CUP FINAL', 'GILDED GRIZZLIES'], lamps: [[260, 300], [560, 280], [860, 300], [260, 500], [560, 520], [860, 500]], lampColor: '#ffffff', flames: true,
    items: ['hotsauce', 'bricks', 'boombox'], hazards: ['octopus'], music: 'final', crowd: ['#d9a520', '#141414', '#5a3a22', '#e8b43a', '#f0f0f0'] }
};
const ARENA_IDS = ['icebox', 'pond', 'grindhouse', 'mall', 'dome'];

/* ---- ITEMS: what fans throw (PLAN 7.12) ---- */
const ITEMS = {
  hotsauce: { name: 'HOT SAUCE', color: '#e0302a', dur: 8, text: 'Infinite turbo!' },
  tape: { name: "GRANDMA'S TAPE", color: '#f0f0f0', dur: 10, text: "Can't lose the puck!" },
  poutine: { name: 'POUTINE', color: '#e8b43a', dur: 10, text: 'Unstoppable!' },
  lumber: { name: 'LUMBER', color: '#c08a4a', dur: 30, text: '3 cannon shots!' },
  bricks: { name: 'BRICK PADS', color: '#b0503a', dur: 12, text: 'Goalie grows!' },
  boombox: { name: 'BOOM BOX', color: '#5ad0ff', dur: 0, text: '+40 BOOM!' },
  cocoa: { name: 'HOT COCOA', color: '#8a5a3a', dur: 8, text: 'Warm and fast!' }
};

// ---- 06-data-story.js ----
/* ---- STORY: THE CUP RUN (PLAN 11.3). Chapters, cutscenes, choices and objectives are data ---- */
const STORY = (() => {
  // objectives: { id, text, on: event type, where(e, m) -> bool, need }; 'win' is checked at the final horn
  const us = (e, m) => m.teamOf(e.by) === 0;
  const CHAPTERS = [
    { n: 1, title: 'Home Opener', arena: 'icebox', rival: 'drillers', periods: 3, len: 90, ot: true, shootout: true, diffStep: -1, mech: 'Skating, passing, shooting, one-timers, checks and the BOOM meter',
      pre: 'ch1-pre', post: 'ch1-post', choice: 'tactic', signature: 'onetimer',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'onetimer', text: 'Score a one-timer', on: 'goal', where: (e, m) => us(e, m) && e.kind === 'onetimer', need: 1 },
        { id: 'hits', text: 'Land 3 big hits', on: 'hit', where: (e, m) => e.big && us(e, m), need: 3 }] },
    { n: 2, title: 'Pond Rules', arena: 'pond', rival: 'lumberjacks', periods: 3, len: 90, ot: true, shootout: true, mech: 'KABOOM mode, power-ups, thin ice and snowbanks',
      pre: 'ch2-pre', post: 'ch2-post', choice: 'tactic', signature: 'thin_ice_break',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'ice', text: 'Break the ice under a Lumberjack', on: 'thin_ice_break', where: (e, m) => e.victimTeam === 1, need: 1 },
        { id: 'kaboom', text: 'Trigger KABOOM', on: 'kaboom_start', where: (e) => e.team === 0, need: 1 }] },
    { n: 3, title: 'Gloves Off', arena: 'grindhouse', rival: 'bruisers', periods: 3, len: 90, ot: true, shootout: true, mech: 'Fights, the sin bin, power plays, octopi, rats and chirps',
      pre: 'ch3-pre', post: 'ch3-post', choice: 'lou', signature: 'fight_end', challengy: true,
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'fights', text: 'Win 2 fights', on: 'fight_end', where: (e, m) => e.winnerTeam === 0, need: 2 },
        { id: 'ppg', text: 'Score a power-play goal', on: 'goal', where: (e, m) => us(e, m) && e.ppg, need: 1 }] },
    { n: 4, title: 'Mall Brawl', arena: 'mall', rival: 'marauders', periods: 3, len: 90, ot: false, shootout: true, showcase: true, mech: 'The mascot, the Discount Drop, the shootout and the manual goalie',
      pre: 'ch4-pre', post: 'ch4-post', choice: 'bear', signature: 'mascot_down',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'kgoal', text: 'Score a KABOOM goal', on: 'goal', where: (e, m) => us(e, m) && e.kind === 'kaboom', need: 1 },
        { id: 'pete', text: 'Knock down Polar Pete', on: 'mascot_down', where: (e, m) => us(e, m), need: 1 }] },
    { n: 5, title: 'The Kaboom Cup', arena: 'dome', rival: 'grizzlies', periods: 3, len: 120, ot: true, shootout: true, boss: true, mech: "The boss: Sterling's Golden Twister, The Vault, Gilded Mode and Doris's organ",
      pre: 'ch5-pre', post: 'ch5-post', choice: 'doris', signature: 'vault_cracked',
      objectives: [{ id: 'win', text: 'Win the Kaboom Cup' }, { id: 'deke', text: 'Beat The Vault with a deke goal', on: 'goal', where: (e, m) => us(e, m) && e.kind === 'deke', need: 1 },
        { id: 'hat', text: 'One player scores a hat trick', on: 'hat_trick', where: (e, m) => us(e, m), need: 1 }] }
  ];
  const CHOICES = {
    tactic: { who: 'marge', text: "Captain. Tell 'em how we play tonight.", options: [['CLEAN AND FAST', { tactic: 'finesse', line: 'pass it like it owes us money.' }], ['MEAN AND LOUD', { tactic: 'grit', line: 'hit everything that moves. Twice.' }]] },
    lou: { who: 'marge', text: 'Lou. Your call.', options: [['LET LOU LOOSE', { lou: 'loose' }], ['KEEP IT ON THE ICE', { lou: 'ice' }]] },
    bear: { who: 'marge', text: 'That bear is gonna be out there all game.', options: [['IGNORE THE BEAR', { bear: 'ignore' }], ['HUNT THE BEAR', { bear: 'hunt' }]] },
    doris: { who: 'marge', text: 'Doris, when do you play the song?', options: [['DORIS PLAYS EARLY', { doris: 'early' }], ['DORIS PLAYS LATE', { doris: 'late' }]] }
  };
  // cutscenes: set, music, cast (who stands where on the set), steps: [who, text, expr] lines, { choice }, { sfx }, { pose: [who, pose] }
  const CUTS = {
    'ch1-pre': { set: 'locker', music: 'locker', cast: ['marge', 'dunny', 'snipes', 'lou', 'lemmy', 'glitterman'], steps: [
      ['marge', 'Sit down, shut up, and listen. I got a letter.', 'angry'],
      ['marge', 'Goldie Glitterman bought the land under the Icebox. Wants to pave it for a {c=#ffd36a}Megaplex Parking Experience{/c}.'],
      ['dunny', 'A parking... experience? Beauty. Wait. No. Not beauty.', 'wince'],
      ['snipes', "This barn's got more character than his whole bank account. And his haircut."],
      ['marge', 'Bylaw 1897-B. Any rink that houses the Kaboom Cup stands forever. So we win the Cup.'],
      { pose: ['lou', 'kneel'] }, ['lou', 'Five games, then. Like the five petals of the wild rose.', 'smile'],
      ['lemmy', "Pipesy says we win. Clang's not so sure. Clang's a pessimist."],
      { enter: 'glitterman' }, ['glitterman', "Enjoy the barn, folks. I've ordered the parking meters. Gold ones.", 'smile'], { exit: 'glitterman' },
      { choice: 'tactic' },
      ['dunny', 'We get pucks deep, we get bodies to the net, and we... uh... {$tacticLine}'],
      ['marge', "Warm-up's on. Then we drill the Drillers.", 'shout']] },
    'ch1-post': { set: 'rink', music: 'victory', cast: ['chuck', 'glitterman', 'marge'], steps: [
      ['chuck', "The Muskrats take the opener! The Icebox is ROCKIN'!", 'shout'],
      ['glitterman', 'Beginner\'s luck. The meters are still on order.'],
      ['marge', 'Pack your long johns. Lake Kabonk. Pond rules.']] },
    'ch2-pre': { set: 'pond', music: 'pond', cast: ['bigtimber', 'snipes', 'lemmy', 'marge', 'lou'], steps: [
      ['bigtimber', "Welcome to the woods, Muskrats. We don't check. We FELL.", 'angry'],
      ['snipes', 'Cute beard. Did you grow it, or did a beaver move in?', 'smile'],
      ['lemmy', "The ice is talking. It says 'crack'."],
      ['marge', "Thin ice is a tool. Hit 'em where it's thin."],
      ['marge', "And listen. When the whole team's hummin', hits, passes, the crowd losin' its mind, the ice starts to shake. That's a {c=#ff8a3a}KABOOM{/c}. Fill the meter and let it rip."],
      ['lou', 'Like thunder in a teacup.'],
      { choice: 'tactic' }, ['dunny', 'Got it, Coach. We {$tacticLine}']] },
    'ch2-post': { set: 'pond', music: 'pond', cast: ['bigtimber', 'dunny', 'marge'], steps: [
      ['bigtimber', 'You hit like a falling spruce. Good on ya.', 'smile'],
      ['dunny', 'Thanks! You smell like one!', 'smile'],
      ['marge', 'Next stop, the Grindhouse. Bring a mouthguard. Bring two.']] },
    'ch3-pre': { set: 'locker-dark', music: 'grind', cast: ['rocco', 'rollo', 'lou', 'marge'], steps: [
      ['rocco', 'Well, well. Lou Beaudoin.'], ['rollo', "Lou 'The Library' Beaudoin."], ['rocco', 'Heard you knit now.'], ['rollo', 'Heard you purl.'],
      ['lou', 'I have retired from fisticuffs, gentlemen.'], ['marge', 'Retire after the game.', 'angry'],
      ['marge', "In this barn they drop the gloves, you drop 'em back. Win the scrap, win the barn. Lose it, you sit in the sin bin and think about your choices."],
      { choice: 'lou' }]},
    'ch3-post': { set: 'locker-dark', music: 'locker', cast: ['rollo', 'rocco', 'lou', 'marge'], steps: [
      ['rollo', 'He knitted me a scarf.'], ['rocco', 'For my neck.'], ['rollo', 'Which he bruised.'], ['lou', 'There is an ice pack in the pocket.', 'smile'],
      ['marge', "Next, the Megaplex. Glitterman's turf. Watch your wallets."]] },
    'ch4-pre': { set: 'mall', music: 'mall', cast: ['chad', 'dunny', 'glitterman', 'lemmy', 'pete', 'marge'], steps: [
      ['chad', "What's up, Mall Rats! Smash that glass, bro!", 'shout'], ['dunny', "We're Muskrats."], ['chad', 'Same content, bro.', 'smile'],
      ['glitterman', 'Name your price, goalie.'], ['lemmy', '...Pipesy says no. Clang says no with a curse word.', 'angry'],
      { pose: ['pete', 'wave'] }, ['pete', 'Mmf mrrf! Hmmf mf mmmf!', 'smile'],
      { choice: 'bear' },
      ['marge', "And win or tie, the mall's got a Shootout Showcase after. Mall money. We want it."]] },
    'ch4-post': { set: 'mall', music: 'mall', cast: ['glitterman', 'snipes', 'marge'], steps: [
      ['glitterman', 'Fine. The Final. My Grizzlies. My Dome. My rules.', 'angry'], ['snipes', "Your Dome's gonna need a new roof.", 'smile']] },
    'ch5-pre': { set: 'tunnel', music: 'final', cast: ['sterling', 'snipes', 'vault', 'lemmy', 'marge'], steps: [
      ['sterling', "I've never lost. Not once. Not even at Go Fish.", 'smile'], ['snipes', "There's a first time for everything, Goldilocks."],
      ['vault', '...'], ['lemmy', "He's very big, Pipesy."],
      ['marge', "Forty-six years behind that bench. I've seen better teams. Prettier teams. Teams that could spell."],
      ['marge', 'Never saw one that wanted it more. Go make it go {c=#ff8a3a}KABOOM{/c}.', 'shout'],
      { choice: 'doris' }]},
    'ch5-post': { set: 'rink', music: 'victory', cast: ['dunny', 'chuck', 'glitterman', 'marge', 'gus'], ending: true, steps: [
      { cup: true }, ['chuck', 'THE KABOOM CUP IS... KA-BOOMING!', 'shout'], ['glitterman', 'My parking meters...', 'wince'],
      ['marge', 'Bylaw 1897-B, Goldie. Look it up.', 'smile'], ['gus', 'Yep.']] }
  };
  const PEP = ["Shake it off. The puck doesn't care about yesterday. Neither do I. Again.", "The pond doesn't owe you anything. Go take it.",
    "You got pushed around. So push back. Gloves are optional.", "That mall's all glitter. Find the ice under it.", "Forty-six years. I've lost bigger. Not with a better team. Again."];
  const UNLOCKS = [[3, 'bigheads', 'Big Heads'], [6, 'octorain', 'Octopus Rain'], [9, 'glowpuck', 'Glow Puck'], [12, 'alwayskaboom', 'Always KABOOM'], [15, 'retro', 'Retro Rigs']];
  return { CHAPTERS, CHOICES, CUTS, PEP, UNLOCKS };
})();

/* ---- SAVE: progress, records, unlocks and seen tips (E.store; a session's storage is the hub's sandbox) ---- */
const Save = (() => {
  const KEY = 'ihk:save';
  const fresh = () => ({ v: 1, story: { chapter: 1, stars: {}, choices: {}, done: false }, drills: {}, records: { shot: 0, hit: 0, goals: 0, fights: 0, kabooms: 0 }, tips: {}, flags: {} });
  let data = fresh();
  try { const d = E.store.get(KEY, null); if (d && d.v === 1) data = Object.assign(fresh(), d); } catch (e) { data = fresh(); }
  const api = {
    get data() { return data; },
    write() { if (!HUB) E.store.set(KEY, data); },
    reset() { data = fresh(); api.write(); },
    stars() { let n = 0; for (const k in data.story.stars) n += (data.story.stars[k] || []).filter(Boolean).length; return n; },
    unlocked(id) { const u = STORY.UNLOCKS.find(x => x[1] === id); return !!u && api.stars() >= u[0]; },
    record(key, v) { if (v > (data.records[key] || 0)) { data.records[key] = v; api.write(); return true; } return false; },
    add(key, n = 1) { data.records[key] = (data.records[key] || 0) + n; api.write(); }
  };
  return api;
})();

// ---- 07-data-text.js ----
/* ---- TEXT: the booth, chirps, tips, three stars and the About pages (PLAN 11.5, Appendix D) ---- */
const TEXT = {
  talk: {
    faceoff: [['c', "Puck's dropped and we're under way at {arena}!"], ['c', 'Here we go. {home} and {away}, and the ice is fresh.'], ['m', 'Grab a seat. Grab a hot dog. Grab two.'], ['c', 'Drop of the puck, and {name} wins it back!'], ['m', 'Now THIS is hockey, Chuck.']],
    rush: [['c', '{name} with speed, through center, over the line...'], ['c', '{name} carries it in, looking for a lane...'], ['m', 'Look at those wheels. Somebody check his oil.'], ['c', '{name} dangles, dances, and DEKES!'], ['c', '{name} turns on the jets!']],
    slap: [['c', 'Big wind-up... {name} with the CLAPPER!'], ['c', '{name} loads up from the point!'], ['m', "He's winding up like grandpa's pocket watch."], ['c', 'Here comes the hammer from {name}!']],
    goal: [['c', '{name} SHOOTS... {name} SCORES!'], ['c', 'TOP SHELF, where Grandma hides the cookie tin!'], ['c', 'Bar down! They heard that one in the parking lot!'], ['c', 'Five-hole! Right between the pads!'], ['m', 'Ding-dong, nobody home.'], ['c', 'He shoots, he SCORES! {home} {hs}, {away} {as}!'], ['m', "That goalie's gonna see that one in his sleep."], ['c', 'GOAL! {name}! The {team} faithful are on their feet!']],
    onetimer: [['c', 'One-timer... BANG! {name} buries it!'], ['c', 'Tape to tape to the back of the net! {name}!'], ['m', "That's a delivery, Chuck, and nobody signed for it."], ['c', 'Cross-crease, one-time, GOAL! What a play by {name}!']],
    kaboomgoal: [['c', 'The puck went in, and the GOALIE went with it!'], ['c', 'KA-BOOM! {name} blows the doors off!'], ['m', 'Somebody call the fire department. And my mother.'], ['c', 'That net is in the next county!']],
    save: [['c', 'Glove save, and a BEAUTY!'], ['m', "He stopped that with his face, Chuck. You can't teach that."], ['c', 'Big save by {goalie}!'], ['c', '{goalie} says NO!'], ['m', 'That goalie is a brick wall with a pension plan.'], ['c', 'Pad save, and the rebound is loose!']],
    post: [['c', 'Off the POST! The iron says no!'], ['m', "PING! That's the sweetest sound in hockey, unless you shot it."], ['c', 'Clang! {name} rings it off the iron!'], ['m', 'The post is the goalie\'s best friend. Sends a card every Christmas.']],
    bighit: [['c', 'OH! {victim} just got a free trip to next Tuesday!'], ['m', 'He hit him so hard his ancestors felt it.'], ['c', 'BOOM! {name} lays out {victim}!'], ['m', "That's a delivery, Chuck, and nobody signed for it."], ['c', '{victim} is looking for his teeth! {name} with the hit!'], ['m', "He's gonna feel that one in the morning. And next week."]],
    glass: [['c', 'THROUGH THE GLASS! Somebody get a broom!'], ['m', "That glass is coming out of somebody's paycheque."], ['c', 'The glass EXPLODES! {name} put {victim} right through it!'], ['m', "In my day the glass was chicken wire. And we liked it."]],
    fight: [['c', 'The gloves are off! {a} and {b} are going at it!'], ['m', 'Now we got a hockey game!'], ['c', 'Here we go! {a} and {b} drop the mitts!'], ['m', "I'd put my money on the one with fewer teeth. That's experience."]],
    fightend: [['c', '{winner} wins the scrap! {loser} heads to the sin bin!'], ['m', '{loser} is gonna sit and think about his choices.'], ['c', "And that's a TKO! {winner} with the takedown!"]],
    turtle: [['c', '{name} turtles! The crowd lets him have it!'], ['m', 'Boo! In my day, you answered the bell.']],
    kaboom: [['c', "The meter's full... it's... KA-BOOOOM!"], ['c', 'KABOOM MODE for the {team}! Hide the women and children!'], ['m', 'The ice is shaking, Chuck. I think that\'s the ice.'], ['c', 'The {team} are ON FIRE! Literally!']],
    hattrick: [['c', 'HAT TRICK! Here come the hats!'], ['m', "Three goals for {name}. Somebody's buying the beer tonight."], ['c', 'Hats on the ice! {name} has a hat trick!']],
    period: [['c', "That's the end of the {period}. {home} {hs}, {away} {as}."], ['m', 'Time to flood the ice and flood my coffee.'], ['c', 'The horn sounds on the {period}. {home} {hs}, {away} {as}.']],
    powerplay: [['c', 'POWER PLAY for the {team}!'], ['m', 'Man advantage. Make it count, boys.'], ['c', 'The {team} go to the power play. Twenty seconds of opportunity!']],
    item: [['c', 'Something on the ice! {name} grabs the {item}!'], ['m', 'Fans throwing {item}. Classy barn.'], ['c', '{name} scoops up the {item}!']],
    octopus: [['m', "Octopus on the ice. It's tradition, Chuck. Don't ask which tradition."], ['c', 'Down goes {victim}! Slipped on the octopus!'], ['m', "That's not calamari, that's a hazard."]],
    mascot: [['c', 'Polar Pete is DOWN! Somebody check on the bear!'], ['m', "That bear owes me twenty bucks. Serves him right."], ['c', 'MASCOT DOWN! {name} flattens Polar Pete!']],
    thinice: [['c', 'THE ICE GIVES WAY! {victim} goes for a swim!'], ['m', 'Thin ice? I never skated on the thick stuff.'], ['c', 'SPLASH! {victim} is in the lake!']],
    deke: [['c', '{name} dangles, dances, and DEKES!'], ['m', 'He undressed him, Chuck. Left him in his socks.'], ['c', 'Oh, the moves by {name}! {victim} is still looking for him!']],
    shootout: [['c', "It's a SHOOTOUT! One on one, mano a goalie!"], ['m', 'Shootouts are like a dentist. Nobody likes it, everybody watches.']],
    overtime: [['c', 'We are going to OVERTIME! Next goal wins!'], ['m', 'Sudden death. My favorite kind of death.']],
    boost: [['c', 'Glitterman on the jumbotron! "Synergy, boys!" The Grizzlies get a GILDED BOOST!'], ['m', "Can they do that? Apparently they can do that."]],
    organ: [['c', 'DORIS! PLAY THE SONG! And she does! The whole barn is clapping!'], ['m', 'Doris has played this organ since 1971. She has never missed a note. Or a grudge.']],
    vault: [['c', 'THE VAULT IS CRACKED! He is human after all!'], ['m', 'Somebody found the combination!']],
    twister: [['c', 'Here comes the GOLDEN TWISTER!'], ['m', 'He spins like a top at a birthday party.']],
    filler: [['m', 'I played eleven seasons. Lost fourteen teeth. Found nine.'], ['m', 'My first coach said I had the hands of a surgeon. Then he saw me skate.'], ['m', 'Thin ice? I never skated on the thick stuff.'],
      ['m', "My mom still has my teeth in a jar. Says they're her retirement fund."], ['m', 'You know what they say, Chuck. Skate where the puck is going. Unless it\'s going into the stands.'],
      ['m', 'I once took a slapshot to the shin and finished the shift. Then I finished the season on crutches.'], ['m', "The best coffee in hockey is at the Ol' Icebox. Doris makes it. It could strip paint."],
      ['m', "My linemate in '84 could eat a whole pizza between periods. Then score a hat trick. Then eat another."], ['m', 'Back in my day the Zamboni was a guy named Earl with a bucket.'],
      ['m', 'The secret to hockey, Chuck, is that the puck is slippery. I learned that in year six.'], ['m', 'I got a stick signed by every player who ever hit me. It weighs forty pounds.'],
      ['m', "A goalie once told me he talks to the posts. I said do they talk back? He said only the left one."], ['m', 'You gotta keep your head up, Chuck. I learned that by not doing it.'],
      ['m', 'My grandma could skate backwards faster than most of these kids. She was a menace.'], ['m', "They say defense wins championships. I say snacks win championships."],
      ['m', "Hockey's the only sport where you lose a tooth and the crowd cheers louder."], ['m', 'I tried figure skating once. The judges are still talking about it. Not nicely.'],
      ['m', 'The Flood Wagon at the Icebox is older than my truck. And my truck is older than me.'], ['m', 'If you can skate, pass, shoot and take a hit, you can play. If you can only take a hit, you can coach.'],
      ['m', 'Every rink smells like popcorn and cold. Best smell in the world.'], ['m', 'My wife says I watch too much hockey. I told her that\'s my JOB. She said that\'s not a job.']]
  },
  chirps: ['Nice flow! Did your mom cut it with a skate blade?', 'You skate like a fridge on a waterbed!', 'Is that a stick or a toothpick?', "Your five-hole's wider than the highway!", "You're a pylon with a pulse!",
    "Hey goalie, want a net? You're not using yours!", "Your slapshot couldn't pop a bubble!", "You've got the hockey sense of a boiled perogy!", 'Nice turnover! Bake it yourself?', 'My grandma checks harder, and she\'s ninety!',
    'Did you learn to skate on a bathroom floor?', 'You call that a deke? I call it a stumble!', 'Your jersey is the only thing working hard!', 'Hey, the puck is the round black thing!', "You're slower than a Zamboni in reverse!",
    'Is your stick on backwards or is that you?', 'I\'ve seen better hands on a clock!', 'You hit like a snowflake!', 'Nice shot! Did the glass deserve it?', "Your mullet's got more moves than you!",
    'Even your helmet looks embarrassed!', 'Skate faster, the rink closes at nine!', 'You shoot like you\'re apologizing!', 'Your coach should\'ve kept you on the bus!', 'Did your skates come with training wheels?',
    "I've met parking meters with better instincts!", 'You pass like you\'re mailing a letter!', 'Bet you dream about the bench!', 'Your best move is the handshake line!', 'Even the octopus is laughing at you!'],
  tips: {
    skate: 'Skate with the stick. Hold {turbo} to turbo. It runs out, so pick your moments.',
    pass: '{pass} passes. Point where you want it to go.',
    shoot: 'Tap {shoot} for a low wrister. Hold it for a top-shelf slapshot. Let go to fire.',
    onetimer: 'Pass coming your way? Hit {shoot} for a ONE-TIMER.',
    defense: 'No puck? {shoot} checks, {deke} pokes, {pass} switches to whoever\'s closest.',
    deke: 'With the puck, {deke} dekes past a check. Fools goalies too.',
    boom: 'Hits, passes, saves, goals: they fill the BOOM meter. Fill it and the whole team goes KABOOM.',
    gloves: "Somebody's got a grudge. Hold {lob} to drop the gloves.",
    fight: 'In a scrap: {pass} jab, {shoot} haymaker, {deke} duck, {lob} yank the sweater.',
    items: "Fans throw goodies on the ice. Skate over 'em.",
    powerplay: "Power play! They're a skater short. Move it and shoot.",
    saucer: '{lob} with the puck flips a saucer over their sticks.',
    chirp: '{chirp} chirps. Gets in their heads.',
    shootout: 'Shootout! In net: {pass} butterfly, {shoot} poke, {deke} dive.'
  },
  stars: ['The third star: {name}, who hit everything but the Flood Wagon.', 'Second star: {name}, with {g} goals and a smile that could melt the ice.', 'And the first star of the game... {name}!',
    'Third star: {name}. Quiet night. Loud results.', 'Second star: {name}, who made the goalie earn his paycheque.', 'First star: {name}! Take a bow, kid!',
    'Third star: {name}, the hardest working jersey in the building.', 'Second star: {name}. Hands like butter.', 'And your first star... it had to be {name}!',
    'Third star: {name}, for showing up and showing off.', 'Second star: {name}, who left it all on the ice.', 'First star: {name}! The barn goes wild!'],
  goalieStar: ['{name} stood on his head tonight. {sv} saves!', "{name} was a wall. A big, sweaty wall. {sv} saves.", '{name} made {sv} saves. Pipesy approves.'],
  menu: { story: 'Five games. Five barns. Save the Ol\' Icebox.', exhibition: 'Any teams, any barn, up to 4 players.', practice: "Coach Marge's drills. Learn every move.",
    records: 'Hardest shots, biggest hits, and your stars.', settings: 'Sound, camera, difficulty, button symbols.', about: 'Credits, and how this game was made.' }
};

// ---- 08-about.js ----
/* ---- ABOUT: the About / Credits pages (PLAN 12.1); the same text as the chat reply and exit-interview.json ---- */
const ABOUT = [
  ['CREDITS', ['- Ice Hoc-Kaboom, an original over-the-top arcade hockey game.', 'Game design and code: Claude (Anthropic, claude-opus-5-5) for Michael Crosato\'s cc-matrix.', 'Engine: my-3D2dge v0.85.2 (MIT), patched (see Engine changes).', 'Online: AI Hub Session Protocol v1, session client 1.4.0.',
    'Every song, sound effect and voice is synthesized in code: no audio files. Voices are gibberish babble.', 'All art is drawn by code: the engine\'s procedural HD Humanoid rigs plus new hockey gear, rinks, crowds and effects. Props from the engine\'s core library.',
    'The Mukluk Falls Muskrats, Coach Marge, Old Gus, Doris, Goldie Glitterman and every team in this game are fictional.']],
  ['SOURCE INFORMATION', ["- Date: 2026-11-03 18:29:10", "- Source: Ice hockey (over-the-top arcade style)", "- Plan: PLAN.md", "- Genre: Arcade sports: 3-on-3 ice hockey with goalies, a fight minigame, a 5-chapter story campaign (the Cup Run), exhibition, practice drills, 1-4 player versus", "- Perspective: 2.5D TV broadcast camera (engine threequarter view, pitch 55) tracking the puck; Overhead option (topdown); ice-level brawler view for fights, replays and player intros", "- Tech: my-3D2dge v0.85.2 (full engine, patched: font symbols, hub controller rule, Humanoid gear hook, organ/brass waves, lowpass, voice bus, dialog voice hook); plain JavaScript, one self-contained HTML file; AI Hub session client 1.4.0; Node 24 and Playwright 1.63 (Chromium) for tests", "- Art direction: The engine's native PS1-era pixel art (ps1 resolution, expand) with HD Humanoid rigs, plus code-drawn hockey sticks, skates, helmets with visors, goalie pads/blocker/catcher/cage, jersey numbers, procedural team logos, five dressed arenas (stands and fans, boards, translucent breakable glass, nets, props, lights) and effects", "- Animation: The engine's procedural Humanoid rigs, with a solvePose overlay for skating strides, crossovers, hockey stops, backward skating, stick handling, passes, wrist and slap shots, checks, pokes, deke spins, goalie stances and saves, celebrations; engine moves (jab, haymaker, hook), guard stance, down/cheer poses for fights and reactions", "- Audio: All in code: chip-synth music in the engine's song format (theme, menu, locker room, pond, Grindhouse, mall, final, play with drive/KABOOM/fight layers, a Flood Wagon waltz, victory, defeat, credits), organ stings, synthesized sfx (post ping, slapshot, glass shatter, goal horn, buzzer, whistle), a crowd bed with reactions, and Animalese-style formant babble voices per character", "- Online: AI Hub Session Protocol v1, shared-world, 1-4 seats: host-run match, client intents at 15 Hz with press counters, 15 Hz snapshots, interpolation and own-skater prediction, own game card, finish with standings, scores, stats and awards; plus local 1-4 players on one machine", "- Testing: One command (node tests/run.mjs): headless Node suites driving the game with game.advance and game.debug (units, systems, 4 local players, determinism, dev mode, attract mode, AI balance, a scripted whole-story playthrough, all 7 drills played through controller input only, each chapter played unforced by a bot to see its events happen on their own, text pools), Playwright browser checks (pages, menus, mouse hover and click, glyphs, touch-only), the AI Hub harness in 5 configurations, a real-input AI Hub session between two game copies, and the AI Hub's own library-admission check (scripts/hub-check.mjs: 2, 3 and 4 players on a poor network, host leaving, a dedicated-server host, and the game on its own; 6 runs, 86 checks, all passed); screenshots reviewed by eye", "- Research: Read the engine handoff docs (README, API.md, AI_GUIDE sections, sports kit, engine source for font, glyphs, Humanoid, audio, Dialog) and the AI Hub protocol README and harness; no web research on hockey", "- Environment: Claude Code CLI (headless); Linux; browser unknown", "- Model: Anthropic, claude-opus-5-5, reasoning effort medium", "- Usage: unknown"]],
  ['TESTING FEEDBACK', ["- Issues caught: About 35. In the game: remote AI Hub players' input being dropped on the host (they could not control their skaters); a name clash that crashed the browser build; arena lamps blowing the ice out to pure white; nobody able to act during the shootout; AI shooters losing their wind-up while stopping; goalies saving nearly everything; one-timers that never scored; no fights at all in natural play, even in the Gloves Off chapter; thin ice that never broke on its own; random shot height making the Top Shelf drill luck; the aim side lost when releasing the stick with the shot; drill 2 teammates ignoring loose passes; Lou's KABOOM check in drill 7 being undodgeable; auto-switch swapping skaters out from under a steering player; too many hockey stops and KABOOMs; a lost tap during hit-stop; a faceoff crash; the chapter 4 showcase shootout not starting. Plus several mistakes in my own test setups.", "- Critical: 5 were game breaking: remote players unable to control anything online, the browser crash, the never-ending shootout, almost no goals in AI games, and the faceoff crash with an empty team.", "- Most helpful test: The real-input AI Hub session (two copies of the game in the harness, key events sent to the client, the host's world checked): it found the dropped remote input that the official harness checklist passes over. Close second: unforced natural play of each chapter, which showed fights, thin ice and one-timers were not happening on their own.", "- Least helpful test: The determinism check (same seed twice, same game): it never failed, so it found nothing, though it guards replays and the attract mode."]],
  ['ENGINE FEEDBACK', ["- Liked most: The procedural Humanoid rigs: dressing and posing skaters, goalies, referees and the cast in code, with live portraits for dialog, gave a lot of character for free, and the fixed-step headless game made testing cheap.", "- Stuck or guessed wrong: Yes: the threequarter view's base scale of 1.5 meant zoom 1 was far too close for a rink; hit-stop from hitFx swallows taps; changing zoom re-bakes the floor, so a continuous zoom was not an option; and px.sprite's scale placement took trial and error.", "- Built myself: The hockey simulation itself: skating physics, the substepped puck against curved boards, posts and nets, the goalie save solver, and the arena drawing (stands, boards, breakable glass panels, nets).", "- Hardest part: Depth ordering custom 3D-ish geometry (boards, glass, nets, stands) with the queue/decal model, and keeping the floor bake cheap.", "- Changed in the engine: Five small patches: PlayStation symbols in the font, Options ignored while Create is held (AI Hub), a Humanoid gear hook for sticks and goalie gear, organ/brass waves plus lowpass and a voice bus in audio, and a per-letter function voice in Dialog.", "- One change: A first-class hook for held items and attachments on the Humanoid (sticks, bats, rackets) with hand placement, instead of only sword, gun and staff."]],
  ['PROMPT FEEDBACK', ["- Liked most: The clear separation of what to build (TASK.md) from how (a detailed plan), and the concrete done criteria: dev mode with sliders, attract mode, hub play, the feedback sections.", "- Confusing: The plan's file names used the max-effort run's suffix while TASK.md gave the medium one; TASK.md won. 'Online' points at the hub library rather than saying shared-world, which the plan settled.", "- Hardest: Fitting the full feature list (story, 5 arenas, 7 drills, fights, shootout, online, dev mode, attract mode) into one coherent, tested build at once.", "- Would change: Say whether the plan's scale (dozens of systems) should be trimmed for a lower effort level, and give a usage or time budget so scope can be matched to it."]],
  ['ENGINE CHANGES', ['- Font: PlayStation face-button symbols added to the 5x7 font (they printed as ?).', '- Gamepad: Options is ignored while Create is held (AI Hub owns Create + Options).',
    '- Humanoid: a gear hook so games draw extra gear (sticks, skates, goalie pads, numbers) depth-sorted with the body.', '- Audio: organ and brass periodic waves, a lowpass on oscillator voices and music tracks, a voice bus and audio.bus(name).',
    '- Dialog: a function voice is called per letter, so each speaker babbles in their own voice.']]
];

// ---- 10-synth.js ----
/* ---- Synth: every sound in code. Babble voices, the goal horn, the organ, the crowd bed, sfx and songs (PLAN 10) ---- */
const Synth = (() => {
  // a phrase as sfx voices with delays: notes 'G4 C5 E5 . G5' (a '.' rests), one per step of `step` seconds
  const phrase = (wave, notes, step, vol = .16, o = {}) => notes.split(/\s+/).filter(Boolean).map((n, i) => n === '.' ? null : Object.assign({ wave, freq: n, dur: step * (o.len || .95), vol, delay: i * step, hold: true, attack: .01, vib: o.vib }, o.lp ? { lp: o.lp } : {})).filter(Boolean);
  const SFX = {
    swish: { wave: 'noise', freq: 2400, to: 1400, dur: .09, vol: .07, filter: 'bandpass', q: 1.5 },
    hstop: [{ wave: 'noise', freq: 5000, to: 1800, dur: .32, vol: .18, filter: 'bandpass', q: 2 }, { wave: 'noise', freq: 9000, to: 4000, dur: .2, vol: .06, filter: 'highpass' }],
    tock: { wave: 'triangle', freq: 900, to: 500, dur: .04, vol: .14 },
    thwap: [{ wave: 'noise', freq: 1800, to: 700, dur: .06, vol: .2, filter: 'bandpass', q: 3 }, { wave: 'triangle', freq: 300, to: 160, dur: .05, vol: .12 }],
    snap: [{ wave: 'noise', freq: 3000, to: 900, dur: .07, vol: .26, filter: 'bandpass', q: 2 }, { wave: 'square', freq: 220, to: 90, dur: .05, vol: .08 }],
    slap: [{ wave: 'noise', freq: 4000, to: 600, dur: .12, vol: .34, filter: 'bandpass', q: 1.2 }, { wave: 'square', freq: 160, to: 50, dur: .09, vol: .14 }, { wave: 'noise', freq: 900, to: 300, dur: .3, vol: .1, filter: 'lowpass', delay: .02 }],
    onetimer: [{ wave: 'noise', freq: 5000, to: 500, dur: .14, vol: .4, filter: 'bandpass', q: 1 }, { wave: 'square', freq: 200, to: 45, dur: .12, vol: .18 }],
    ping: [{ wave: 'triangle', freq: 1850, dur: .9, vol: .3 }, { wave: 'triangle', freq: 1862, dur: .7, vol: .14 }, { wave: 'sine', freq: 3700, dur: .25, vol: .05 }],
    bar: [{ wave: 'triangle', freq: 2100, dur: 1, vol: .3 }, { wave: 'triangle', freq: 2114, dur: .8, vol: .14 }],
    boards: [{ wave: 'sine', freq: 110, to: 55, dur: .14, vol: .3 }, { wave: 'noise', freq: 700, to: 200, dur: .16, vol: .14, filter: 'lowpass' }],
    glassclack: [{ wave: 'noise', freq: 3500, dur: .05, vol: .2, filter: 'bandpass', q: 4 }, { wave: 'triangle', freq: 1300, to: 1200, dur: .25, vol: .07 }],
    net: { wave: 'noise', freq: 1500, to: 600, dur: .25, vol: .14, filter: 'bandpass', q: .8 },
    thump: [{ wave: 'sine', freq: 140, to: 60, dur: .12, vol: .32 }, { wave: 'noise', freq: 500, to: 150, dur: .1, vol: .12, filter: 'lowpass' }],
    bighit: [{ wave: 'sine', freq: 90, to: 35, dur: .3, vol: .5 }, { wave: 'noise', freq: 900, to: 120, dur: .3, vol: .24, filter: 'lowpass' }, { wave: 'noise', freq: 3000, to: 2000, dur: .3, vol: .06, filter: 'bandpass', q: 6, delay: .03 }],
    crack: [{ wave: 'noise', freq: 6000, dur: .04, vol: .3, filter: 'highpass' }, { wave: 'square', freq: 1800, to: 900, dur: .05, vol: .06 }],
    shatter: [{ wave: 'noise', freq: 5000, to: 1500, dur: .6, vol: .32, filter: 'bandpass', q: .7 }].concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => ({ wave: 'sine', freq: 2400 + ((i * 397) % 2400), to: 1200 + ((i * 211) % 900), dur: .2 + (i % 4) * .08, vol: .04, delay: i * .035 }))),
    whistle: [{ wave: 'square', freq: 2350, vib: [28, .05], dur: .26, vol: .1, hold: true }, { wave: 'square', freq: 2100, vib: [28, .05], dur: .3, vol: .1, hold: true, delay: .28 }],
    whistle1: { wave: 'square', freq: 2300, vib: [28, .05], dur: .4, vol: .1, hold: true },
    horn: [{ wave: 'brass', freq: 98, dur: 3, vol: .22, hold: true, attack: .25, lp: 900 }, { wave: 'brass', freq: 147, dur: 3, vol: .2, hold: true, attack: .25, lp: 900 }, { wave: 'brass', freq: 196, dur: 3, vol: .16, hold: true, attack: .25, lp: 900 }, { wave: 'noise', freq: 400, dur: 3, vol: .05, filter: 'lowpass', hold: true }],
    buzzer: [{ wave: 'square', freq: 220, dur: 1.5, vol: .14, hold: true }, { wave: 'square', freq: 223, dur: 1.5, vol: .1, hold: true }],
    punch: [{ wave: 'sine', freq: 160, to: 60, dur: .1, vol: .36 }, { wave: 'noise', freq: 1200, to: 300, dur: .08, vol: .18, filter: 'lowpass' }],
    whoosh: { wave: 'noise', freq: 400, to: 2400, dur: .18, vol: .1, filter: 'bandpass', q: 1 },
    twinkle: phrase('triangle', 'E6 B6 E7', .05, .06),
    pickup: phrase('square', 'C5 E5 G5 C6', .045, .1),
    throw: { wave: 'noise', freq: 600, to: 2000, dur: .3, vol: .08, filter: 'bandpass' },
    splort: [{ wave: 'noise', freq: 400, to: 120, dur: .2, vol: .24, filter: 'lowpass' }, { wave: 'sine', freq: 220, to: 70, dur: .18, vol: .2 }],
    kaboom: [{ wave: 'noise', freq: 1200, to: 60, dur: 1, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 70, to: 25, dur: 1.2, vol: .6 }, { wave: 'saw', freq: 110, to: 40, dur: .6, vol: .12, lp: 600 }],
    engine: { wave: 'saw', freq: 55, to: 60, dur: .16, vol: .08, lp: 400 },
    aooga: [{ wave: 'saw', freq: 220, to: 320, dur: .35, vol: .14, lp: 1400 }, { wave: 'saw', freq: 320, to: 200, dur: .4, vol: .14, lp: 1400, delay: .36 }],
    splash: [{ wave: 'noise', freq: 1500, to: 300, dur: .6, vol: .3, filter: 'bandpass', q: .6 }, { wave: 'sine', freq: 300, to: 80, dur: .3, vol: .2 }],
    move: { wave: 'organ', freq: 'E5', dur: .06, vol: .07 },
    pick: phrase('organ', 'C5 G5', .06, .09),
    back: phrase('organ', 'G4 C4', .06, .08),
    star: phrase('triangle', 'C6 E6 G6 C7', .07, .1),
    deny: { wave: 'square', freq: 180, to: 140, dur: .15, vol: .1 },
    clack: [{ wave: 'noise', freq: 2400, dur: .03, vol: .14, filter: 'bandpass', q: 5 }, { wave: 'triangle', freq: 700, dur: .03, vol: .08, delay: .05 }],
    zip: { wave: 'saw', freq: 300, to: 1600, dur: .25, vol: .08, lp: 2400 }
  };
  const STINGS = {
    charge: phrase('organ', 'G4 C5 E5 G5 . E5 G5 - -', .12, .14, { vib: [6, .004] }),
    walkup: phrase('organ', 'C4 C#4 D4 D#4 E4 F4 F#4 G4', .09, .1, { vib: [6, .004] }),
    clap: phrase('organ', 'G4 G4 G4 . A4 G4', .14, .12, { vib: [6, .004] }),
    sad: phrase('brass', 'G3 F#3 F3 E3 - -', .28, .14, { lp: 1200 }),
    fight: phrase('organ', 'A3 C4 A3 D#4 A3 C4 B3 G#3', .12, .12, { vib: [6, .004] })
  };
  const VOICES = {   // babble voices (PLAN 10.1)
    marge: { base: 150, range: 3, speed: 9, wave: 'saw', fs: .9, gruff: .35 }, dunny: { base: 210, range: 4, speed: 13, wave: 'pulse', fs: 1.05, gruff: .05 },
    snipes: { base: 320, range: 5, speed: 16, wave: 'pulse', fs: 1.15, gruff: 0 }, lou: { base: 95, range: 2, speed: 8, wave: 'saw', fs: .85, gruff: .1 },
    lemmy: { base: 190, range: 6, speed: 11, wave: 'pulse', fs: 1, gruff: .05, vib: 7 }, glitter: { base: 260, range: 5, speed: 15, wave: 'saw', fs: 1.15, gruff: 0 },
    chuck: { base: 230, range: 4, speed: 18, wave: 'pulse', fs: 1.05, gruff: 0 }, moose: { base: 120, range: 3, speed: 11, wave: 'saw', fs: .9, gruff: .3 },
    ref: { base: 170, range: 2, speed: 8, wave: 'square', fs: 1, gruff: .1 }, gus: { base: 110, range: 1, speed: 6, wave: 'saw', fs: .85, gruff: .4 },
    pete: { base: 140, range: 6, speed: 12, wave: 'saw', fs: .6, gruff: .2 }, mid: { base: 180, range: 4, speed: 13, wave: 'pulse', fs: 1, gruff: .1 },
    low: { base: 125, range: 3, speed: 11, wave: 'saw', fs: .9, gruff: .2 }, gruff: { base: 110, range: 3, speed: 10, wave: 'saw', fs: .85, gruff: .45 },
    nasal: { base: 240, range: 5, speed: 15, wave: 'pulse', fs: 1.2, gruff: 0 }, doris: { base: 280, range: 4, speed: 10, wave: 'pulse', fs: 1.1, gruff: .05 },
    vault: { base: 70, range: 1, speed: 4, wave: 'saw', fs: .7, gruff: .4 }
  };
  const FORM = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700], y: [300, 2300] };
  let live = 0, crowd = null;
  function ctxOk() { const c = A.ctx; return c && c.state === 'running' && !A.muted ? c : null; }
  /** a line as gibberish: each sounding letter a 55-85 ms formant blip (vowels; consonants as onsets) */
  function babble(text, vname, o = {}) {
    const c = ctxOk(); if (!c || live > 60) return 0;
    const v = VOICES[vname] || VOICES.mid, bus = A.bus('voice'); if (!bus) return 0;
    const s = String(text).toLowerCase().replace(/\{[^}]*\}/g, '').slice(0, o.max || 60);
    let t = c.currentTime + .01 + (o.delay || 0), n = 0, lastCons = false;
    const sounds = [];
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === ',' ) { t += .12; continue; } if (ch === '.' || ch === '?' || ch === '!') { t += .2; continue; }
      if (!/[a-z]/.test(ch)) { if (ch === ' ') t += .025; continue; }
      const vowel = /[aeiouy]/.test(ch);
      if (!vowel && lastCons) continue; lastCons = !vowel;
      let vv = ch; if (!vowel) { for (let k = i + 1; k < s.length; k++) if (/[aeiouy]/.test(s[k])) { vv = s[k]; break; } if (!FORM[vv]) vv = 'a'; }
      const h = (U.hashStr(vname + s.slice(Math.max(0, i - 2), i + 1)) % 1000) / 1000;
      sounds.push({ t, vv, cons: !vowel && /[stkpcfx]/.test(ch), semi: (h * 2 - 1) * v.range, i });
      t += 1 / v.speed + .015; n++;
      if (n > (o.maxSyl || 26)) break;
    }
    const lastQ = /\?\s*$/.test(s), excl = /!\s*$/.test(s);
    sounds.forEach((sd, k) => {
      const end = k >= sounds.length - 4 && excl ? 4 : 0, f = v.base * Math.pow(2, (sd.semi + end) / 12) * (o.pitch || 1), dur = .055 + (sd.i % 3) * .01;
      const osc = c.createOscillator(), g = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), mix = c.createGain();
      if (v.wave === 'pulse') osc.setPeriodicWave(A._pulse(.25)); else osc.type = v.wave === 'saw' ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(f, sd.t);
      if (lastQ && k === sounds.length - 1) osc.frequency.linearRampToValueAtTime(f * 1.4, sd.t + dur);
      if (v.vib) osc.frequency.setValueAtTime(f * (1 + .03 * Math.sin(sd.t * v.vib * 6)), sd.t + dur * .5);
      const [a, b] = FORM[sd.vv] || FORM.a;
      f1.type = f2.type = 'bandpass'; f1.Q.value = 5; f2.Q.value = 7; f1.frequency.value = a * v.fs; f2.frequency.value = b * v.fs;
      osc.connect(f1); osc.connect(f2); f1.connect(mix); f2.connect(mix); mix.gain.value = 2.2; mix.connect(g);
      g.gain.setValueAtTime(0, sd.t); g.gain.linearRampToValueAtTime(.32 * (o.vol || 1), sd.t + .008); g.gain.exponentialRampToValueAtTime(.001, sd.t + dur);
      g.connect(bus); osc.start(sd.t); osc.stop(sd.t + dur + .02); live++; osc.onended = () => { live--; };
      if (sd.cons || v.gruff > .2) {
        const nz = c.createBufferSource(), ng = c.createGain(), nf = c.createBiquadFilter(); nz.buffer = A._noise; nf.type = 'highpass'; nf.frequency.value = sd.cons ? 3000 : 900;
        ng.gain.setValueAtTime(sd.cons ? .08 : v.gruff * .06, sd.t); ng.gain.exponentialRampToValueAtTime(.001, sd.t + (sd.cons ? .015 : dur));
        nz.connect(nf); nf.connect(ng); ng.connect(bus); nz.start(sd.t, (k * .137) % .5); nz.stop(sd.t + dur);
      }
    });
    return t - c.currentTime;
  }
  /** the Dialog's per-letter voice hook: one blip every second letter in the speaker's voice */
  const dialogVoice = vname => (ch, n) => { if (n % 2 === 0 && /[a-z]/i.test(ch)) babble(ch + 'a', vname, { maxSyl: 1 }); };
  /** the crowd bed: two looped noise bands whose level follows excitement */
  function crowdBed(level) {
    const c = ctxOk(); if (!c) return;
    if (!crowd) {
      const bus = A.bus('sfx'); if (!bus) return;
      const out = c.createGain(); out.gain.value = 0; out.connect(bus);
      for (const [f, q] of [[420, .9], [1250, 1.2]]) { const src = c.createBufferSource(), bf = c.createBiquadFilter(); src.buffer = A._noise; src.loop = true; bf.type = 'bandpass'; bf.frequency.value = f; bf.Q.value = q; src.connect(bf); bf.connect(out); src.start(); }
      crowd = { out };
    }
    const vol = (S().crowd === undefined ? .7 : S().crowd) * level * .5;
    crowd.out.gain.setTargetAtTime(vol, c.currentTime, .3);
  }
  const react = kind => {   // the crowd's one-shot reactions
    const k = (S().crowd === undefined ? .7 : S().crowd) * T.crowdHype; if (k <= 0) return;
    if (kind === 'ohh') A.sfx({ wave: 'noise', freq: 900, to: 300, dur: 1.1, vol: .2 * k, filter: 'bandpass', q: .8 });
    else if (kind === 'ahh') A.sfx({ wave: 'noise', freq: 700, to: 1200, dur: .9, vol: .16 * k, filter: 'bandpass', q: .8 });
    else if (kind === 'cheer') { A.sfx({ wave: 'noise', freq: 1400, to: 900, dur: 2.2, vol: .3 * k, filter: 'bandpass', q: .5 }); for (let i = 0; i < 4; i++) babble('wooo yeah', ['snipes', 'dunny', 'nasal', 'doris'][i], { delay: i * .15, vol: .5 * k, pitch: 1.2 }); }
    else if (kind === 'boo') { A.sfx({ wave: 'noise', freq: 300, to: 220, dur: 1.5, vol: .2 * k, filter: 'lowpass' }); for (let i = 0; i < 3; i++) babble('boooo', ['lou', 'moose', 'gruff'][i], { delay: i * .1, vol: .5 * k, pitch: .8 }); }
    else if (kind === 'chant') { for (let i = 0; i < 6; i++) babble('ka boom ka boom', ['dunny', 'snipes', 'lou', 'moose', 'doris', 'nasal'][i], { delay: i * .02, vol: .35 * k }); }
  };
  /* ---- songs (engine format; the new organ and brass waves) ---- */
  const rep = (s, n) => Array(n).fill(s).join(' | ');
  const SONGS = {
    theme: { bpm: 150, steps: 2, tracks: [
      { wave: 'square', vol: .07, notes: 'A4 . C5 E5 A5 - G5 E5 | F5 - E5 - C5 - A4 . | C5 . E5 G5 C6 - B5 G5 | B5 - A5 - G5 - D5 . | A4 . C5 E5 A5 - G5 E5 | F5 - E5 - C5 - A4 . | C5 . E5 G5 C6 - B5 G5 | A5 - - - - - . .' },
      { wave: 'saw', vol: .05, lp: 1400, notes: 'A3 - - - E4 - - - | F3 - - - C4 - - - | C4 - - - G4 - - - | G3 - - - D4 - - -' },
      { wave: 'triangle', vol: .26, notes: 'A2 A2 A3 A2 A2 A2 A3 A2 | F2 F2 F3 F2 F2 F2 F3 F2 | C3 C3 C4 C3 C3 C3 C4 C3 | G2 G2 G3 G2 G2 G2 G3 G2' },
      { wave: 'drums', vol: .11, notes: 'k . h . s . h . | k k h . s . h h' }] },
    menu: { bpm: 108, steps: 2, tracks: [
      { wave: 'organ', vol: .07, notes: 'A4 - C5 - E5 - . . | F4 - A4 - C5 - . . | C5 - E5 - G5 - . . | B4 - D5 - G4 - . .' },
      { wave: 'triangle', vol: .22, notes: 'A2 . . A2 . . E3 . | F2 . . F2 . . C3 . | C3 . . C3 . . G3 . | G2 . . G2 . . D3 .' },
      { wave: 'drums', vol: .06, notes: 'k . h . s . h . | k . h h s . h .' }] },
    locker: { bpm: 92, steps: 4, tracks: [
      { wave: 'organ', vol: .05, notes: 'E3 - - - - - - - G3 - - - - - - - | A3 - - - - - - - B3 - - - - - - -' },
      { wave: 'saw', vol: .1, lp: 600, notes: 'E2 . . E2 . . G2 . E2 . . E2 . . D2 . | A2 . . A2 . . C3 . B2 . . B2 . . F#2 .' },
      { wave: 'drums', vol: .09, notes: 'k . . h s . h . k . k h s . h h' }] },
    pond: { bpm: 120, steps: 3, tracks: [
      { wave: 'pulse', vol: .07, notes: 'D5 E5 F#5 A5 . F#5 G5 F#5 E5 D5 . . | B4 C#5 D5 E5 . D5 C#5 B4 A4 A4 . . | D5 E5 F#5 A5 . B5 A5 F#5 D5 E5 . . | A4 B4 C#5 D5 . . D5 . . . . .' },
      { wave: 'triangle', vol: .22, notes: 'D3 . . A3 . . D3 . . A3 . . | G2 . . D3 . . A2 . . E3 . .' },
      { wave: 'drums', vol: .05, notes: 'k . . h . . s . . h . .' }] },
    grind: { bpm: 170, steps: 2, tracks: [
      { wave: 'square', vol: .06, notes: 'E5 E5 G5 E5 A5 G5 E5 D5 | E5 E5 G5 E5 B5 A5 G5 . ' },
      { wave: 'saw', vol: .06, lp: 1600, notes: 'E3 E3 E3 E3 G3 G3 A3 A3 | E3 E3 E3 E3 C4 C4 B3 B3' },
      { wave: 'triangle', vol: .24, notes: 'E2 E2 E2 E2 G2 G2 A2 A2 | E2 E2 E2 E2 C3 C3 B2 B2' },
      { wave: 'drums', vol: .12, notes: 'k h s h k k s h' }] },
    mall: { bpm: 118, steps: 2, tracks: [
      { wave: 'pulse12', vol: .07, notes: 'C5 E5 G5 E5 A5 G5 E5 C5 | D5 F5 A5 F5 G5 - - . | C5 E5 G5 E5 A5 G5 E5 C5 | B4 D5 G5 D5 C5 - - .' },
      { wave: 'square', vol: .04, notes: 'C4 . E4 . G4 . E4 . | D4 . F4 . A4 . F4 . | C4 . E4 . G4 . E4 . | G3 . B3 . D4 . B3 .' },
      { wave: 'triangle', vol: .2, notes: 'C3 C3 . C3 C3 . C3 . | F2 F2 . F2 G2 . G2 . | C3 C3 . C3 A2 . A2 . | G2 G2 . G2 C3 . C3 .' },
      { wave: 'drums', vol: .08, notes: 'k . h k s . h . | k . h k s h h .' }] },
    final: { bpm: 132, steps: 2, tracks: [
      { wave: 'brass', vol: .09, lp: 2400, notes: 'D5 - - A4 D5 - F5 - | E5 - - C5 E5 - G5 - | F5 - E5 - D5 - C5 - | A4 - - - - - . . ' },
      { wave: 'organ', vol: .05, notes: 'D4 - - - - - - - | C4 - - - - - - - | Bb3 - - - - - - - | A3 - - - - - - -' },
      { wave: 'triangle', vol: .26, notes: 'D2 D2 D3 D2 D2 D2 D3 D2 | C2 C2 C3 C2 C2 C2 C3 C2 | Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1 | A1 A1 A2 A1 A1 A1 A2 A1' },
      { wave: 'drums', vol: .12, notes: 'k . s . k k s . | k . s . k s s s' }] },
    play: { bpm: 128, steps: 2, tracks: [
      { wave: 'triangle', vol: .16, notes: 'E2 . E2 . . E2 G2 . | A2 . A2 . . A2 B2 .' },
      { wave: 'drums', vol: .05, notes: 'k . h . . . h . | k . h . . h h .' },
      { name: 'drive', on: false, wave: 'saw', vol: .05, lp: 1200, notes: 'E3 E3 G3 E3 A3 A3 B3 A3' },
      { name: 'drive2', on: false, wave: 'drums', vol: .08, notes: 'k h s h k h s h' },
      { name: 'kaboom', on: false, wave: 'saw', vol: .09, lp: 900, notes: 'E2 E2 E3 E2 G2 G2 G3 A2' },
      { name: 'kaboom2', on: false, wave: 'drums', vol: .14, notes: 'k k s k k s s s' },
      { name: 'fight', on: false, wave: 'organ', vol: .07, notes: 'A3 C4 A3 D#4 A3 C4 B3 G#3' }] },
    flood: { bpm: 150, steps: 1, tracks: [
      { wave: 'organ', vol: .09, notes: 'G4 - B4 | D5 - - | C5 - E5 | D5 - - | B4 - G4 | A4 - B4 | C5 - A4 | G4 - - | E5 - G5 | F#5 - - | D5 - F#5 | E5 - - | C5 - E5 | D5 - B4 | A4 - F#4 | G4 - -', vib: [6, .004] },
      { wave: 'triangle', vol: .18, notes: 'G2 D3 D3 | G2 D3 D3 | C3 G3 G3 | G2 D3 D3 | E2 B2 B2 | D2 A2 A2 | D2 A2 A2 | G2 D3 D3' }] },
    victory: { bpm: 140, steps: 2, loop: false, tracks: [
      { wave: 'brass', vol: .12, lp: 2600, notes: 'C5 . C5 . C5 E5 G5 - | E5 - G5 - C6 - - - | - - - - . . . .' },
      { wave: 'organ', vol: .06, notes: 'C4 - - - - - - - | C4 - E4 - G4 - - - | - - - - . . . .' },
      { wave: 'drums', vol: .1, notes: 'k . s . k . s . | k k s . c . . .' }] },
    defeat: { bpm: 80, steps: 2, loop: false, tracks: [{ wave: 'brass', vol: .12, lp: 1200, notes: 'G4 - F#4 - F4 - E4 - - - - - . . . .' }] },
    credits: { bpm: 96, steps: 2, tracks: [
      { wave: 'triangle', vol: .1, notes: 'A4 . C5 E5 A5 - G5 E5 | F5 - E5 - C5 - A4 . | C5 . E5 G5 C6 - B5 G5 | A5 - - - - - . .' },
      { wave: 'organ', vol: .05, notes: 'A3 - - - - - - - | F3 - - - - - - - | C4 - - - - - - - | E4 - - - - - - -' },
      { wave: 'triangle', vol: .18, notes: 'A2 . . . E3 . . . | F2 . . . C3 . . . | C3 . . . G3 . . . | E2 . . . B2 . . .' }] }
  };
  for (const k in SFX) A.define(k, SFX[k]);
  const sting = name => { if (STINGS[name]) A.sfx(STINGS[name]); };
  const goalSting = team => { const t = TEAMS[team]; if (!t) return; A.sfx(phrase('brass', t.song.join(' ') + ' - ' + t.song[3], .16, .12, { lp: 2400, delay: 0 }).map(v => Object.assign(v, { delay: v.delay + .4 }))); };
  let cur = null;
  const music = (name, o) => { if (cur === name && !(o && o.restart)) return; cur = name; A.music(name ? SONGS[name] : null, Object.assign({ fade: .6 }, o || {})); };
  const layer = (name, on) => { if (!A.song) return; try { A.layer(name, on ? 1 : 0, .6); } catch (e) { /* the song playing has no such layer */ } };
  function applyVolumes() { A.voiceVolume = S().voices === undefined ? .8 : S().voices; A.applyVolume(); }
  return { SFX, STINGS, VOICES, SONGS, babble, dialogVoice, crowdBed, react, sting, goalSting, music, layer, applyVolumes, phrase, get current() { return cur; } };
})();

// ---- 11-glyphs.js ----
/* ---- Glyphs: device-aware prompt chips. PlayStation (or Xbox) badges for a pad, keycaps for keys, a mouse icon ---- */
const Glyphs = (() => {
  const PS = { '✕': '#7aa7ff', '○': '#ff6b6b', '□': '#ff8ad8', '△': '#4fe3a1' }, XB = { A: '#5ad05a', B: '#ff5a4a', X: '#4a8aff', Y: '#ffd040' };
  const font = { outline: false };
  /** which device a prompt shows for an input: the one used last (mouse counts as keyboard unless the action has a mouse button) */
  const deviceOf = (inp, action) => {
    const d = inp.lastDevice;
    if (d === 'gamepad') return 'gamepad';
    if (d === 'mouse') { const b = bindingsOf(inp, action).find(c => c.startsWith('Mouse')); return b ? 'mouse' : 'keyboard'; }
    return 'keyboard';
  };
  const bindingsOf = (inp, action) => (inp.map && inp.map[action]) || HOCKEY_KEYS[action] || [];
  /** the chip for one action: { kind: 'badge' | 'shoulder' | 'key' | 'mouse', text, color, w } */
  function spec(action, o = {}) {
    const inp = o.input || game.input, dev = o.device || deviceOf(inp, action);
    if (dev === 'mouse') { const c = bindingsOf(inp, action).find(c => c.startsWith('Mouse')); return { kind: 'mouse', btn: +c.slice(5), w: 9 }; }
    let lab = String(inp.label(action, dev === 'gamepad' ? 'gamepad' : 'keyboard') || action);
    if (dev === 'gamepad') {
      if (PS[lab]) return { kind: 'badge', text: lab, color: PS[lab], w: 11 };
      if (XB[lab]) return { kind: 'badge', text: lab, color: XB[lab], w: 11 };
      lab = lab.replace('D-pad ', ''); return { kind: 'shoulder', text: lab, w: E.font.width(lab, font) + 6 };
    }
    if (lab === 'Left click' || lab === 'Right click' || lab === 'Middle click') return { kind: 'mouse', btn: lab[0] === 'L' ? 0 : lab[0] === 'R' ? 2 : 1, w: 9 };
    lab = lab.length > 6 ? lab.slice(0, 6) : lab;
    return { kind: 'key', text: lab, w: Math.max(11, E.font.width(lab, font) + 6) };
  }
  /** draw a chip; returns its width. y is the chip's top; chips are 11 px tall */
  function chip(g, action, x, y, o = {}) {
    const s = spec(action, o); x = Math.round(x); y = Math.round(y);
    if (s.kind === 'badge') {
      px.disc(g, x + 5, y + 5, 5.5, '#0c0e16'); px.disc(g, x + 5, y + 5, 4.5, '#24283a');
      E.font.text(g, s.text, x + 6, y + 2, s.color, { align: 'center', outline: false });
    } else if (s.kind === 'shoulder') {
      px.rect(g, x + 1, y, s.w - 2, 11, '#0c0e16'); px.rect(g, x, y + 1, s.w, 9, '#0c0e16'); px.rect(g, x + 1, y + 1, s.w - 2, 9, '#2e3348');
      E.font.text(g, s.text, x + s.w / 2, y + 2, '#e8ecf8', { align: 'center', outline: false });
    } else if (s.kind === 'key') {
      px.rect(g, x, y, s.w, 11, '#0c0e16'); px.rect(g, x + 1, y + 1, s.w - 2, 8, '#e8e4d8'); px.rect(g, x + 1, y + 9, s.w - 2, 1, '#9a968c');
      E.font.text(g, s.text, x + s.w / 2, y + 2, '#1a1a22', { align: 'center', outline: false });
    } else {   // a mouse: body, the pressed button lit
      px.rect(g, x + 1, y, 7, 11, '#0c0e16'); px.rect(g, x + 2, y + 1, 5, 9, '#e8e4d8'); px.rect(g, x + 2, y + 4, 5, 1, '#6a6660'); px.rect(g, x + 4, y + 1, 1, 3, '#6a6660');
      const lit = s.btn === 0 ? [x + 2, 2] : s.btn === 2 ? [x + 5, 2] : [x + 4, 1]; px.rect(g, lit[0], y + 1, lit[1], 3, '#ff9a3a');
    }
    return s.w;
  }
  const width = (action, o) => spec(action, o).w;
  /** text with {action} tokens as chips: returns the width; o.align 'center' centers the whole line */
  function text(g, str, x, y, color = '#ffffff', o = {}) {
    const parts = String(str).split(/(\{\w+\})/).filter(Boolean), fo = Object.assign({ outline: false, shadow: '#000' }, o.font || {});
    const isTok = p => /^\{\w+\}$/.test(p) && HOCKEY_KEYS[p.slice(1, -1)];
    let w = 0; for (const p of parts) w += isTok(p) ? width(p.slice(1, -1), o) + 2 : E.font.width(p, fo);
    if (g === null) return w;
    let cx = o.align === 'center' ? Math.round(x - w / 2) : o.align === 'right' ? Math.round(x - w) : x;
    for (const p of parts) {
      if (isTok(p)) { cx += chip(g, p.slice(1, -1), cx, y - 2, o) + 2; }
      else { E.font.text(g, p, cx, y, color, fo); cx += E.font.width(p, fo); }
    }
    return w;
  }
  /** keep the pads' symbol family in step with the Button symbols setting (and the engine's own Controls option) */
  let lastEngine = null, lastPt = null;
  function sync() {
    const st = S(); if (!st) return;
    const pt = game.input.pointer && game.input.pointer();   // a mouse that moves takes the prompts over from the keyboard
    if (pt && lastPt && (pt[0] !== lastPt[0] || pt[1] !== lastPt[1]) && game.input.lastDevice === 'keyboard') game.input.lastDevice = 'mouse';
    lastPt = pt ? pt.slice() : null;
    const eng = st.glyphs;
    if (lastEngine !== null && eng !== lastEngine && (eng === 'xbox' || eng === 'playstation')) st.set('symbols', eng === 'xbox' ? 'Xbox' : 'PlayStation');
    const want = st.symbols === 'Xbox' ? 'xbox' : 'playstation';
    for (const p of game.players) p.glyphs = want;
    lastEngine = eng;
  }
  return { chip, text, width, spec, sync, deviceOf, PS, XB };
})();

// ---- 12-ui.js ----
/* ---- UI: 10-foot widgets. Big tiles with focus by d-pad, stick, keys and mouse hover; a click picks; a bottom legend ---- */
const UI = (() => {
  const GOLD = '#ffd36a', INK = '#eef4ff', MUTED = '#9fb0c8', PANEL = ['#141c30', '#0a0f1c'], EDGE = '#3a4a6a';
  const panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || PANEL, border: o.border || EDGE, alpha: o.alpha === undefined ? .94 : o.alpha });
  const title = (g, str, x, y, scale = 3, colors) => E.font.title(g, str, Math.round(x), Math.round(y), { align: 'center', scale, colors: colors || ['#ffffff', '#ffe9a8', '#ffb347', '#e0662a'], depth: 2 });
  const text = (g, str, x, y, color = INK, o = {}) => E.font.text(g, str, Math.round(x), Math.round(y), color, Object.assign({ outline: false, shadow: '#000' }, o));
  /** any local player's press of an action (menus answer to every controller and keyboard half) */
  const anyPressed = a => game.players.some(p => p.pressed(a));
  const anyRepeat = a => game.players.some(p => p.repeat ? p.repeat(a, .35, .11) : p.pressed(a));
  /**
   * a menu of tiles: items [{ label, sub, disabled, draw(g, x, y, w, h, focused), pick() , left(), right() }], laid out by
   * layout(r) -> [{ x, y, w, h }] per item. Arrow keys / d-pad / stick move by geometry; confirm picks; mouse hover focuses
   */
  class Tiles {
    constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.rects = []; this._hp = null; this.t = 0; this.cancel = o.cancel || null; }
    move(dx, dy) {
      const a = this.rects[this.i]; if (!a) return;
      let best = -1, bd = 1e9;
      this.rects.forEach((b, j) => {
        if (j === this.i || this.items[j].hidden) return;
        const vx = (b.x + b.w / 2) - (a.x + a.w / 2), vy = (b.y + b.h / 2) - (a.y + a.h / 2);
        const along = vx * dx + vy * dy; if (along <= 2) return;
        const across = Math.abs(vx * dy - vy * dx), d = along + across * 2.2;
        if (d < bd) { bd = d; best = j; }
      });
      if (best >= 0) { this.i = best; A.sfx('move'); }
      else if (this.o.wrap !== false && this.rects.length > 1) {   // wrap around along the axis
        const order = this.rects.map((b, j) => [j, (b.x + b.w / 2) * dx + (b.y + b.h / 2) * dy]).filter(([j]) => !this.items[j].hidden).sort((p, q) => p[1] - q[1]);
        if (order.length) { this.i = order[0][0]; A.sfx('move'); }
      }
    }
    update(dt, r) {
      this.t += dt;
      const it = this.items[this.i];
      if (it && it.hidden) this.i = this.items.findIndex(x => !x.hidden);
      if (it && it.adjust && (anyRepeat('left') || anyRepeat('right'))) { it.adjust(anyRepeat('left') ? -1 : 1); A.sfx('move'); }
      else {
        if (anyRepeat('up')) this.move(0, -1); else if (anyRepeat('down')) this.move(0, 1);
        else if (anyRepeat('left')) this.move(-1, 0); else if (anyRepeat('right')) this.move(1, 0);
      }
      // the mouse: hover focuses (only when it moved), a click picks what's under it
      const inp = game.input, p = inp.pointer();
      if (p && (!this._hp || Math.abs(p[0] - this._hp[0]) + Math.abs(p[1] - this._hp[1]) > .5)) {
        const j = this.rects.findIndex((b, k) => !this.items[k].hidden && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h);
        if (j >= 0 && j !== this.i) { this.i = j; A.sfx('move'); }
      }
      this._hp = p ? p.slice() : null;
      const c = inp.clicked();
      if (c) {
        const j = this.rects.findIndex((b, k) => !this.items[k].hidden && c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h);
        if (j >= 0) { this.i = j; const t = this.items[j]; if (t.click) { t.click(c); return true; } return this.pick(); }
      }
      if (anyPressed('confirm') || anyPressed('start')) { if (this.o.noStart && !anyPressed('confirm')) return false; return this.pick(); }
      if (anyPressed('cancel') && this.cancel) { game.players.forEach(p => p.consumeAll()); A.sfx('back'); this.cancel(); return true; }
      return false;
    }
    pick() {
      const it = this.items[this.i]; game.players.forEach(p => p.consumeAll());
      if (!it || it.disabled) { A.sfx('deny'); return false; }
      A.sfx('pick'); if (it.pick) it.pick(); return true;
    }
    draw(g, r) {
      if (this.o.layout) this.rects = this.o.layout(r, this.items);
      this.items.forEach((it, j) => {
        const b = this.rects[j]; if (!b || it.hidden) return;
        const f = j === this.i, pulse = f ? Math.round(1 + Math.sin(this.t * 6)) : 0;
        if (it.draw) { it.draw(g, b.x, b.y, b.w, b.h, f); }
        else {
          panel(g, b.x - pulse, b.y - pulse, b.w + pulse * 2, b.h + pulse * 2, { border: f ? GOLD : EDGE, bg: f ? ['#2a3a5a', '#121a2e'] : PANEL });
          const sc = b.h >= 30 ? 2 : 1;
          text(g, it.label, b.x + b.w / 2, b.y + b.h / 2 - (it.sub ? 7 * sc : 3.5 * sc) , it.disabled ? '#5a6478' : f ? GOLD : INK, { align: 'center', scale: sc });
          if (it.sub) text(g, it.sub, b.x + b.w / 2, b.y + b.h / 2 + 3 * sc, it.disabled ? '#4a5468' : MUTED, { align: 'center' });
        }
        if (f) { const t = this.t * 8, c = Math.floor(t) % 2 ? GOLD : '#fff1c0'; px.rect(g, b.x - 2 - pulse, b.y - 2 - pulse, b.w + 4 + pulse * 2, 1, c); px.rect(g, b.x - 2 - pulse, b.y + b.h + 1 + pulse, b.w + 4 + pulse * 2, 1, c); px.rect(g, b.x - 2 - pulse, b.y - 2 - pulse, 1, b.h + 4 + pulse * 2, c); px.rect(g, b.x + b.w + 1 + pulse, b.y - 2 - pulse, 1, b.h + 4 + pulse * 2, c); }
      });
    }
  }
  /** a grid layout helper: n items in cols columns, centered in a box */
  const grid = (n, cols, cx, top, w, h, gx = 8, gy = 8) => {
    const rows = Math.ceil(n / cols), out = [];
    for (let i = 0; i < n; i++) { const rr = Math.floor(i / cols), cc = i % cols, inRow = Math.min(cols, n - rr * cols), x0 = cx - (inRow * w + (inRow - 1) * gx) / 2; out.push({ x: Math.round(x0 + cc * (w + gx)), y: Math.round(top + rr * (h + gy)), w, h }); }
    return out;
  };
  /** the bottom legend: [['pass', 'SELECT'], ['deke', 'BACK']] as chips, centered */
  function legend(g, r, items, y) {
    const parts = items.map(([a, l]) => '{' + a + '} ' + l).join('    ');
    y = y === undefined ? r.H - 16 : y;
    const w = Glyphs.text(null, parts, 0, 0);
    px.rect(g, Math.round(r.W / 2 - w / 2 - 6), y - 4, Math.round(w + 12), 15, '#05070c');
    Glyphs.text(g, parts, r.W / 2, y, '#d8e0f0', { align: 'center' });
  }
  /* idle: 10 s with no input on the title and menus starts the attract mode (PLAN 15.1) */
  const Idle = { t: 0, last: null, reset() { this.t = 0; },
    update(dt) {
      let active = false;
      for (const p of game.players) {
        if (p.anyPressed()) active = true;
        const m = p.move(); if (Math.hypot(m[0], m[1]) > .3) active = true;
        if (p.padAim) active = true;
        if (p.padAxes && p.padAxes.some(a => Math.abs(a) > .3)) active = true;
      }
      const pt = game.input.pointer();
      if (pt && this.last && Math.hypot(pt[0] - this.last[0], pt[1] - this.last[1]) > 8 * (game.r ? 1 : 1) / 3) active = true;
      if (pt && (!this.last || active)) this.last = pt.slice();
      if (game.input.clicked()) active = true;
      if (wheelT > 0) { active = true; wheelT = 0; }
      if (active) this.t = 0; else this.t += dt;
      return this.t;
    } };
  let wheelT = 0;
  if (typeof addEventListener === 'function') try { addEventListener('wheel', () => { wheelT = 1; }, { passive: true }); addEventListener('keydown', () => { Touch.sawKey(); }); addEventListener('gamepadconnected', () => { Touch.sawKey(); }); } catch (e) { /* no DOM */ }
  /* toasts: short notes that stack top-left of the bottom area */
  const toasts = [];
  const toast = (title, sub, color = GOLD) => { toasts.push({ title, sub, color, t: 0 }); if (toasts.length > 3) toasts.shift(); };
  function drawToasts(g, r, dt) {
    toasts.forEach((t, i) => {
      t.t += dt; const a = t.t < .25 ? t.t / .25 : t.t > 3.2 ? Math.max(0, 1 - (t.t - 3.2) / .4) : 1, w = Math.max(E.font.width(t.title) + 16, E.font.width(t.sub || '') + 16);
      const x = Math.round(r.W - w - 8 + (1 - a) * 40), y = 46 + i * 30;
      panel(g, x, y, w, 26, { border: t.color, alpha: .9 }); text(g, t.title, x + 8, y + 4, t.color); if (t.sub) text(g, t.sub, x + 8, y + 14, MUTED);
    });
    for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].t > 3.6) toasts.splice(i, 1);
  }
  return { GOLD, INK, MUTED, EDGE, PANEL, panel, title, text, Tiles, grid, legend, Idle, toast, drawToasts, anyPressed, anyRepeat };
})();

/* ---- Touch: a touch-only device gets no touch controls, a banner and the settings button (PLAN 15.2) ---- */
const Touch = (() => {
  let keySeen = false;
  const mm = q => { try { return typeof matchMedia === 'function' && matchMedia(q).matches; } catch (e) { return false; } };
  const padSeen = () => { try { return typeof navigator !== 'undefined' && navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(p => p && p.connected); } catch (e) { return false; } };
  return {
    sawKey() { keySeen = true; },
    get only() { return !HUB && !keySeen && mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && !padSeen(); }
  };
})();

// ---- 20-rink.js ----
/* ---- Rink: geometry (analytic rounded rectangle), the 48 glass panels, nets, the floor TileMap, and the arena's drawing ---- */
const Rink = (() => {
  const C = { x: 560, y: 400 }, HL = 432, HW = 192, CR = 96, GL = 376, MOUTH = 16, NETD = 20, BAR = 20, BOARD = 17;
  const X0 = C.x - HL, X1 = C.x + HL, Y0 = C.y - HW, Y1 = C.y + HW;
  /** signed distance to the boards (negative inside) */
  const sdf = (x, y) => { const qx = Math.abs(x - C.x) - (HL - CR), qy = Math.abs(y - C.y) - (HW - CR); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - CR; };
  /** the outward normal of the boards nearest (x, y) */
  const normal = (x, y) => {
    const sx = Math.sign(x - C.x) || 1, sy = Math.sign(y - C.y) || 1, qx = Math.abs(x - C.x) - (HL - CR), qy = Math.abs(y - C.y) - (HW - CR);
    if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; return [sx * qx / l, sy * qy / l]; }
    return qx > qy ? [sx, 0] : [0, sy];
  };
  const inside = (x, y, r = 0) => sdf(x, y) < -r;
  /** keep a body inside: returns { n, speedIn } when it touched the boards, else null (velocity reflected by bounce, keep) */
  function clampBody(b, r, bounce = .3, keep = .85) {
    const d = sdf(b.x, b.y); if (d <= -r) return null;
    const n = normal(b.x, b.y); b.x -= n[0] * (d + r); b.y -= n[1] * (d + r);
    const vn = b.vx * n[0] + b.vy * n[1]; if (vn <= 0) return { n, speedIn: 0 };
    const tx = b.vx - vn * n[0], ty = b.vy - vn * n[1];
    b.vx = tx * keep - vn * bounce * n[0]; b.vy = ty * keep - vn * bounce * n[1];
    return { n, speedIn: vn };
  }
  const goalX = side => C.x + (side ? GL : -GL);
  const outDir = side => side ? 1 : -1;   // from the goal line toward the net's back
  const DOTS = { center: [C.x, C.y], ez: [[C.x - 280, C.y - 112], [C.x - 280, C.y + 112], [C.x + 280, C.y - 112], [C.x + 280, C.y + 112]], nz: [[C.x - 84, C.y - 112], [C.x - 84, C.y + 112], [C.x + 84, C.y - 112], [C.x + 84, C.y + 112]] };
  const nearestDot = (x, y, list) => (list || DOTS.ez).slice().sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y))[0];
  /* ---- glass panels around the boards: 14 per side, 4 per end, 3 per corner (48) ---- */
  const panels = [];
  (function build() {
    const add = (ax, ay, bx, by, h) => { const mx = (ax + bx) / 2, my = (ay + by) / 2, n = normal(mx + (mx - C.x) * .001, my + (my - C.y) * .001); panels.push({ a: [ax, ay], b: [bx, by], m: [mx, my], n, h, state: 'ok', shake: 0, i: panels.length }); };
    const sx0 = C.x - (HL - CR), sx1 = C.x + (HL - CR), ey0 = C.y - (HW - CR), ey1 = C.y + (HW - CR);
    for (let i = 0; i < 14; i++) add(sx0 + (sx1 - sx0) * i / 14, Y0, sx0 + (sx1 - sx0) * (i + 1) / 14, Y0, 28);   // north
    for (let k = 0; k < 3; k++) { const a0 = -PI / 2 + k * PI / 6, a1 = a0 + PI / 6; add(sx1 + Math.cos(a0) * CR, ey0 + Math.sin(a0) * CR, sx1 + Math.cos(a1) * CR, ey0 + Math.sin(a1) * CR, 34); }   // NE
    for (let i = 0; i < 4; i++) add(X1, ey0 + (ey1 - ey0) * i / 4, X1, ey0 + (ey1 - ey0) * (i + 1) / 4, 40);   // east
    for (let k = 0; k < 3; k++) { const a0 = k * PI / 6, a1 = a0 + PI / 6; add(sx1 + Math.cos(a0) * CR, ey1 + Math.sin(a0) * CR, sx1 + Math.cos(a1) * CR, ey1 + Math.sin(a1) * CR, 34); }   // SE
    for (let i = 0; i < 14; i++) add(sx1 - (sx1 - sx0) * i / 14, Y1, sx1 - (sx1 - sx0) * (i + 1) / 14, Y1, 28);   // south
    for (let k = 0; k < 3; k++) { const a0 = PI / 2 + k * PI / 6, a1 = a0 + PI / 6; add(sx0 + Math.cos(a0) * CR, ey1 + Math.sin(a0) * CR, sx0 + Math.cos(a1) * CR, ey1 + Math.sin(a1) * CR, 34); }   // SW
    for (let i = 0; i < 4; i++) add(X0, ey1 - (ey1 - ey0) * i / 4, X0, ey1 - (ey1 - ey0) * (i + 1) / 4, 40);   // west
    for (let k = 0; k < 3; k++) { const a0 = PI + k * PI / 6, a1 = a0 + PI / 6; add(sx0 + Math.cos(a0) * CR, ey0 + Math.sin(a0) * CR, sx0 + Math.cos(a1) * CR, ey0 + Math.sin(a1) * CR, 34); }   // NW
  })();
  const panelAt = (x, y) => { let best = null, bd = 1e9; for (const p of panels) { const d = Math.hypot(p.m[0] - x, p.m[1] - y); if (d < bd) { bd = d; best = p; } } return best; };
  const resetGlass = () => { for (const p of panels) { p.state = 'ok'; p.shake = 0; } };
  /* ---- scuffs: a grid of 16-unit cells over the ice: skate scratches and KABOOM melt (PLAN 7.1) ---- */
  const SW = 54, SH = 24, scuff = new Float32Array(SW * SH), melt = new Float32Array(SW * SH);
  const cellOf = (x, y) => { const cx = Math.floor((x - X0) / 16), cy = Math.floor((y - Y0) / 16); return cx < 0 || cy < 0 || cx >= SW || cy >= SH ? -1 : cy * SW + cx; };
  const scuffAt = (x, y, n, m = 0) => { const i = cellOf(x, y); if (i < 0) return; scuff[i] = Math.min(1, scuff[i] + n); if (m) melt[i] = Math.min(1, melt[i] + m); };
  const clearScuff = (k = 1) => { for (let i = 0; i < scuff.length; i++) { scuff[i] *= 1 - k; melt[i] *= 1 - k; } };
  const scuffTotal = () => { let s = 0; for (let i = 0; i < scuff.length; i++) s += scuff[i] + melt[i]; return s; };
  /* ---- the floor: ice and its markings, painted per arena (baked by a TileMap) ---- */
  const hexRGB = h => { const c = E.hex(h); return Array.isArray(c) ? c : [(c >> 16) & 255, (c >> 8) & 255, c & 255]; };
  function floorTex(arena, homeLogo) {
    const out = arena.outside, red = [200, 40, 48], blue = [40, 80, 190], crease = [159, 211, 255];
    return (x, y) => {
      const n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
      const d = sdf(x, y);
      if (d > 0) {   // off the ice: rubber, concrete, snow, tile, carpet
        const k = arena.floorOut === 'snow' ? 10 : arena.floorOut === 'tile' ? ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 12 : -8) : arena.floorOut === 'rubber' ? (Math.floor(y / 3) % 2 ? 6 : -4) : 8;
        return [out[0] + n * k + k * .3, out[1] + n * k + k * .3, out[2] + n * k + k * .3];
      }
      // ice: white-blue, cool near the boards, a faint sheen, noise
      const edge = clamp(1 + d / 40, 0, 1), sheen = Math.max(0, E.noise2(x * .01, y * .02) - .3) * 18, cloud = E.noise2(x * .035 + 7, y * .05) * 10, scr = E.hash2(Math.floor(x / 3), Math.floor(y)) > .985 ? -14 : 0;
      // skate scratches: long faint arcs carved in every direction; pools of lamp light; a cool tint toward the far boards
      const arc = Math.abs(Math.sin(x * .021 + Math.sin(y * .013) * 3) * Math.cos(y * .017 - x * .004)), sc2 = arc > .985 ? -18 : arc > .96 ? -8 : 0;
      let pool = 0; for (const [lx, ly] of arena.lamps || []) { const dd = Math.hypot(x - lx, (y - ly) * 1.3); if (dd < 150) pool += (1 - dd / 150) * 10; }
      const far = (y - C.y) / HW * 6, g2 = (E.hash2(Math.floor(x / 2), Math.floor(y / 2)) - .5) * 10;
      let c = [190 - edge * 30 + n * 14 + g2 + sheen + cloud + scr + sc2 + pool + far, 206 - edge * 16 + n * 11 + g2 + sheen + cloud + scr + sc2 + pool + far, 226 + n * 7 + g2 * .5 + cloud * .4 + sc2 * .4 + pool * .6];
      const ax = Math.abs(x - C.x);
      const mix = (col, a) => { c = [c[0] + (col[0] - c[0]) * a, c[1] + (col[1] - c[1]) * a, c[2] + (col[2] - c[2]) * a]; };
      if (homeLogo) { const lc = LOGOS.at(homeLogo, (x - C.x) / 2 + 12, (y - C.y) / 2 + 12); if (lc) mix(hexRGB(lc), .7); }
      if (Math.abs(x - C.x) < 2.5) mix(red, .9);
      if (Math.abs(ax - 108) < 2.5) mix(blue, .9);
      if (Math.abs(ax - GL) < 1 && Math.abs(y - C.y) < HW - 8) mix(red, .85);
      for (const g of [goalX(0), goalX(1)]) { const dd = Math.hypot(x - g, y - C.y); if (dd < 28 && (x - g) * (g < C.x ? 1 : -1) > 0) mix(dd > 26.5 ? red : crease, dd > 26.5 ? .9 : .55); }
      const cd = Math.hypot(x - C.x, y - C.y); if (Math.abs(cd - 72) < 1 && !homeLogo) mix(blue, .8); if (Math.abs(cd - 72) < 1 && homeLogo) mix(blue, .8); if (cd < 3) mix(blue, .9);
      for (const [dx, dy] of DOTS.ez) { const dd = Math.hypot(x - dx, y - dy); if (Math.abs(dd - 72) < 1) mix(red, .8); if (dd < 5) mix(red, .9); }
      for (const [dx, dy] of DOTS.nz) if (Math.hypot(x - dx, y - dy) < 4) mix(red, .9);
      return c;
    };
  }
  const maps = {};
  function mapFor(arenaId, homeLogo) {
    const key = arenaId + ':' + (homeLogo || ''); if (maps[key]) return maps[key];
    const arena = ARENAS[arenaId], rows = []; for (let i = 0; i < 44; i++) rows.push('.'.repeat(70));
    const o = arena.outside;
    return (maps[key] = new E.TileMap({ rows, legend: { '.': { floor: 'ice' } }, types: {}, floorTex: floorTex(arena, homeLogo), outside: E.mix ? '#' + o.map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('') : '#333333', ao: 0 }));
  }
  return { C, HL, HW, CR, GL, MOUTH, NETD, BAR, BOARD, X0, X1, Y0, Y1, sdf, normal, inside, clamp: clampBody, goalX, outDir, DOTS, nearestDot, panels, panelAt, resetGlass,
    SW, SH, scuff, melt, cellOf, scuffAt, clearScuff, scuffTotal, mapFor, floorTex };
})();

// ---- 21-rigs.js ----
/* ---- Rigs: skaters, goalies, referees, staff and fans on the engine's Humanoid, with hockey gear (drawn through the
 * patched gear hook) and hockey motion (a solvePose overlay: skating strides, the stick, goalie stances) (PLAN 8, 9) ---- */
const Rigs = (() => {
  const V3 = E.V3, ik3 = E.ik3, tones = E.tones;
  let bigHeads = false, retro = false;
  /** the gear: stick, skates, numbers, goalie pads, blocker, catcher, mask cage */
  function gear(ops, h) {
    const { g, Sp, Q, J, C, u, cap, classic } = h, rig = this, gd = rig.gearOpts || {};
    const line = (A, B, col, w) => { if (cap && w > 1) cap(A, B, w / 2, w / 2, col); else px.line(g, A[0], A[1], B[0], B[1], col, Math.max(1, Math.round(w))); };
    // skates: a boot and a steel blade under each foot
    if (gd.skates) for (const k of ['footL', 'footR']) {
      if (!J[k]) continue;
      const a = Sp(J[k], -1.6, 0, -.5), b = Sp(J[k], 2.6, 0, -.5), b0 = Sp(J[k], -2, 0, -1.1), b1 = Sp(J[k], 3, 0, -1.1);
      ops.push({ d: Q[k][2] + .004, f: () => { line(a, b, gd.boot || '#1a1a22', Math.max(1, u * 1.4)); px.line(g, b0[0], b0[1] + 1, b1[0], b1[1] + 1, '#d8e4f0', 1); } });
    }
    // goalie pads, blocker and catcher
    if (gd.pads) for (const s of ['L', 'R']) {
      const kn = Q['knee' + s], ft = Q['foot' + s]; if (!kn || !ft) continue;
      const t = tones(gd.pads);
      ops.push({ d: Math.max(kn[2], ft[2]) + .006, f: () => { line(kn, ft, t.sh, Math.max(3, u * 3.6)); line([kn[0] - .6, kn[1] - .6], [ft[0] - .6, ft[1] - .6], t.base, Math.max(2, u * 2.6)); px.line(g, kn[0], kn[1] + 1, ft[0], ft[1] - 1, t.lt, 1); } });
    }
    if (gd.blocker && Q.handR) { const hd = Q.handR, t = tones(gd.pads || '#ffffff'); ops.push({ d: hd[2] + .03, f: () => { const w = Math.max(3, Math.round(u * 2.6)), hh = Math.max(4, Math.round(u * 3.4)); px.rect(g, hd[0] - w / 2, hd[1] - hh / 2, w, hh, t.sh); px.rect(g, hd[0] - w / 2 + 1, hd[1] - hh / 2 + 1, w - 2, hh - 2, t.base); } }); }
    if (gd.catcher && Q.handL) { const hd = Q.handL, t = tones(gd.pads || '#ffffff'); ops.push({ d: hd[2] + .03, f: () => { const rr = Math.max(2, u * 1.9); px.disc(g, hd[0], hd[1], rr, t.sh); px.disc(g, hd[0] - .5, hd[1] - .5, rr - 1, t.base); px.line(g, hd[0] - rr + 1, hd[1], hd[0] + rr - 1, hd[1], t.deep, 1); } }); }
    // the stick: shaft from the top hand to the heel, then the taped blade along its direction
    if (gd.stick && J.blade && !rig.noStick) {
      const top = Sp(J.stickTop), heel = Sp(J.blade), bd = J.bladeDir2 || [1, 0, 0], L = gd.goalie ? 5 : 4.5;
      const toe = Sp([J.blade[0] + bd[0] * L, J.blade[1] + bd[1] * L, J.blade[2] + bd[2] * L]);
      const st = tones(gd.stickColor || '#c89a5a'), tape = gd.tape || '#1a1a22';
      ops.push({ d: (top[2] + heel[2]) / 2 + .02, f: () => {
        px.line(g, top[0], top[1], heel[0], heel[1], st.sh, Math.max(1, Math.round(u * .75)));
        px.line(g, top[0] - .5, top[1] - .5, heel[0] - .5, heel[1] - .5, st.lt, 1);
        px.line(g, heel[0], heel[1], toe[0], toe[1], tape, Math.max(gd.goalie ? 2 : 1, Math.round(u * (gd.goalie ? 1.4 : .9))));
        px.dot(g, top[0], top[1], '#f0f0f0');
      } });
    }
    // the number on the jersey's back (or the letter on the chest)
    if (gd.number !== undefined && u > 1.6 && J.shC && !classic) {
      const mid = Sp(V3.lerp(J.hipC, J.shC, .62), -1.2, 0, 0), front = Sp(V3.lerp(J.hipC, J.shC, .62), 1.2, 0, 0);
      const back = mid[2] > front[2];
      if (back) ops.push({ d: Math.max(Q.shC[2], Q.hipC[2]) + .05, f: () => E.font.text(g, String(gd.number), mid[0], mid[1] - 2, gd.numColor || '#ffffff', { font: 'tiny', align: 'center', outline: false }) });
      else if (gd.letter) ops.push({ d: Math.max(Q.shC[2], Q.hipC[2]) + .05, f: () => E.font.text(g, gd.letter, front[0] + 1, front[1] - 3, gd.numColor || '#ffffff', { font: 'tiny', align: 'center', outline: false }) });
    }
    // the goalie's cage over the face
    if (gd.cage && J.head) {
      const R = rig.o.headR, a = Sp(J.head, R * .95, -R * .6, -R * .1), b = Sp(J.head, R * .95, R * .6, -R * .1), c = Sp(J.head, R * .95, -R * .5, -R * .55), d = Sp(J.head, R * .95, R * .5, -R * .55);
      if (a[2] > Q.head[2]) ops.push({ d: Q.head[2] + .2, f: () => { px.line(g, a[0], a[1], b[0], b[1], '#c8ccd4', 1); px.line(g, c[0], c[1], d[0], d[1], '#c8ccd4', 1); } });
    }
    // the visor: a clear shield across the eyes of a skater's helmet
    if (gd.visor && J.head && !classic) {
      const R = rig.o.headR, a = Sp(J.head, R * 1.02, -R * .7, R * .15), b = Sp(J.head, R * 1.02, R * .7, R * .15);
      if (a[2] > Q.head[2] - .1) ops.push({ d: Q.head[2] + .2, f: () => px.blend(g, .45, 'screen', () => px.line(g, a[0], a[1], b[0], b[1], '#bfe8ff', Math.max(1, Math.round(u * .7)))) });
    }
  }
  /* ---- motion: the overlay on solvePose. rig.hk = { mode, phase, speed (0..1), turbo, stop, back, hand, stick, t, ... } ---- */
  function overlay() {
    const hk = this.hk; if (!hk || this.downW > .3) return;
    const J = this.J, o = this.o, hand = hk.hand || 1;
    if (hk.mode === 'goalie') return goaliePose(this, J, o, hk);
    if (hk.mode !== 'skate') return;
    const sp = clamp(hk.speed || 0, 0, 1), ph = hk.phase || 0, stop = hk.stop || 0, turbo = hk.turbo ? 1 : 0;
    // lower the body into a skating crouch, lean the torso forward
    const low = 1.6 + sp * 1.4 + stop * 1.8, lean = .22 + sp * .25 + turbo * .15 + stop * .1, upper = ['hipC', 'hipL', 'hipR', 'shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR'];
    for (const k of upper) J[k] = [J[k][0], J[k][1], J[k][2] - low];
    const pivot = J.hipC, ca = Math.cos(lean), sa = Math.sin(lean), twist = stop * .9 * (hk.stopSide || 1);
    for (const k of ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) {
      const p = J[k], dx = p[0] - pivot[0], dz = p[2] - pivot[2]; let x = pivot[0] + dx * ca + dz * sa, z = pivot[2] - dx * sa + dz * ca, y = p[1];
      if (twist) { const tx = x - pivot[0], ty = y - pivot[1], c2 = Math.cos(twist), s2 = Math.sin(twist); x = pivot[0] + tx * c2 - ty * s2; y = pivot[1] + tx * s2 + ty * c2; }
      J[k] = [x, y, z];
    }
    // the legs: each push goes back and out on a diagonal, then the foot recovers under the hip; a stop skids both sideways
    for (const s of [-1, 1]) {
      const p = ph + (s > 0 ? PI : 0), push = Math.max(0, Math.sin(p)), rec = Math.max(0, -Math.sin(p));
      let foot = [(.6 - push * 5.5 + rec * 2) * sp + (1 - sp) * (s > 0 ? .8 : -.4), s * (o.footSpread + .4 + push * 3.4 * sp), rec * 1.6 * sp];
      if (hk.cross && sp > .4 && s === hk.cross && rec > .4) foot[1] -= s * 4;   // crossover: the outside foot crosses in front
      if (stop > 0) foot = V3.lerp(foot, [s * (hk.stopSide || 1) * 2.6 + .5, s * (o.footSpread + 2.4), 0], stop);
      if (hk.back) foot = [Math.cos(p) * 2.2 * sp - .5, s * (o.footSpread + 1.5 + Math.sin(p) * 2 * sp), Math.max(0, Math.sin(p * 2)) * .8 * sp];
      const hip = s > 0 ? J.hipR : J.hipL, [knee, f2] = ik3(hip, foot, o.legUpper, o.legLower, [1, s * .2, .1]);
      J[s > 0 ? 'kneeR' : 'kneeL'] = knee; J[s > 0 ? 'footR' : 'footL'] = f2;
    }
    stickPose(this, J, o, hk, hand, sp);
  }
  /** the stick and the hands: where the blade is for this action, the top hand by the hip, the bottom hand down the shaft */
  function stickPose(rig, J, o, hk, hand, sp) {
    if (rig.noStick || hk.stick === 'none') return;
    const t = hk.t || 0, k = rig.o.size || 1, w = Math.sin((rig.t || 0) * 9) * (hk.carry ? 2.6 : .6);
    let blade, top;
    const st = hk.stick || 'idle', hz = J.hipC[2];
    if (st === 'wind') { const c = clamp(hk.charge || 0, 0, 1); blade = [-5 - c * 3, hand * (6 + c * 2), 8 + c * 10]; top = [3, -hand * 1, hz + 3]; }
    else if (st === 'follow') { const u = clamp(t / .3, 0, 1); blade = [12 - u * 2, -hand * (1 + u * 2), 2 + u * 9]; top = [5, -hand * 2.5, hz + 4 + u * 2]; }
    else if (st === 'pass') { const u = clamp(t / .2, 0, 1); blade = [6 + u * 6, hand * (6 - u * 7), .5 + (hk.saucer ? u * 5 : 0)]; top = [3, -hand * 1.2, hz + 2]; }
    else if (st === 'poke') { const u = Math.sin(clamp(t / .35, 0, 1) * PI); blade = [9 + u * 10, hand * 1.5, .5]; top = [4 + u * 6, -hand * .8, hz + 1]; }
    else if (st === 'check') { blade = [4, -hand * 6, hz + 8]; top = [4, hand * 5, hz + 7]; }
    else if (st === 'raised') { blade = [2, hand * 2, hz + 20]; top = [1, 0, hz + 9]; }
    else if (st === 'guitar') { blade = [3, hand * 9, hz + 2]; top = [3, -hand * 7, hz + 6]; }
    else if (st === 'rifle') { blade = [14, 0, hz + 8]; top = [1, 0, hz + 7]; }
    else if (st === 'faceoff') { blade = [8, hand * 1, .5]; top = [2, -hand * 1, hz + 1]; }
    else { blade = [9.5 + Math.sin((rig.t || 0) * 4.5) * .6, hand * (3.5 + w), .5]; top = [2.5, -hand * 1.2, hz + 1.5]; }
    const dir = V3.norm(V3.sub(blade, top)), len = V3.len(V3.sub(blade, top));
    const topHand = hand > 0 ? 'handL' : 'handR', botHand = hand > 0 ? 'handR' : 'handL';
    J[topHand] = top; J[botHand] = V3.add(top, V3.mul(dir, len * .42));
    J.stickTop = V3.add(top, V3.mul(dir, -1.5)); J.blade = blade;
    const gnd = V3.norm([dir[0] || .01, dir[1], 0]); J.bladeDir2 = V3.norm([gnd[0] * .4 - gnd[1] * hand * .9 * -1, gnd[1] * .4 + gnd[0] * hand * .9 * -1 * -1, 0]);
    for (const [hk2, sh, el] of [['handL', 'shL', 'elbowL'], ['handR', 'shR', 'elbowR']]) {
      const s = sh === 'shR' ? 1 : -1, [elbow, h2] = ik3(J[sh], J[hk2], o.armUpper, o.armLower, [-1, s * .8, -.3]); J[el] = elbow; J[hk2] = h2;
    }
  }
  function goaliePose(rig, J, o, hk) {
    const st = hk.state || 'ready', dy = hk.dy || 0;
    const low = st === 'butterfly' || st === 'stack' || st === 'cover' ? 5.5 : st === 'blasted' ? 0 : 3.2;
    for (const k of ['hipC', 'hipL', 'hipR', 'shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) J[k] = [J[k][0] + (st === 'blasted' ? -3 : .8), J[k][1], J[k][2] - low];
    for (const s of [-1, 1]) {
      let foot;
      if (st === 'butterfly' || st === 'cover') foot = [-1.5, s * (o.footSpread + 5.5), 0];
      else if (st === 'stack') foot = [0, (dy > 0 ? 1 : -1) * (4 + (s > 0 ? 2 : 5)), s > 0 ? 2.5 : 0];
      else foot = [.3, s * (o.footSpread + 1.6), 0];
      const hip = s > 0 ? J.hipR : J.hipL, [knee, f2] = ik3(hip, foot, o.legUpper, o.legLower, [1, s * .5, .1]);
      J[s > 0 ? 'kneeR' : 'kneeL'] = st === 'butterfly' || st === 'cover' ? [2.2, s * (o.footSpread + 1.2), .8] : knee; J[s > 0 ? 'footR' : 'footL'] = f2;
    }
    const sh = J.shC[2];
    let gl = [4, -3.8, sh - 1.5], bl = [4, 3.8, sh - 4.5], blade = [7, .5, .5];
    if (st === 'glove') gl = [5, -3 - Math.max(0, -dy) * .4, sh + 2];
    if (st === 'blocker') bl = [5, 3 + Math.max(0, dy) * .4, sh + 1];
    if (st === 'poke') blade = [16, 0, .5];
    if (st === 'cover') { gl = [7, -1, 1.5]; bl = [7, 1, 1.5]; }
    if (st === 'blasted') { gl = [-1, -6, sh + 4]; bl = [-1, 6, sh + 4]; blade = [2, 6, 10]; }
    if (st === 'celebrate') { gl = [2, -4, sh + 8]; bl = [2, 4, sh + 8]; blade = [1, 4, sh + 16]; }
    J.handL = gl; J.handR = bl;
    J.blade = blade; J.stickTop = V3.add(bl, [0, 0, 3]); J.bladeDir2 = [0, -1, 0];
    for (const [hk2, sh2, el] of [['handL', 'shL', 'elbowL'], ['handR', 'shR', 'elbowR']]) { const s = sh2 === 'shR' ? 1 : -1, [elbow, h2] = ik3(J[sh2], J[hk2], o.armUpper, o.armLower, [-1, s * .9, -.3]); J[el] = elbow; J[hk2] = h2; }
  }
  const wrap = rig => { const base = rig.solvePose; rig.solvePose = function () { base.call(this); try { overlay.call(this); } catch (e) { /* a pose the overlay can't solve keeps the engine's */ } }; rig.gear = gear; return rig; };
  /** a skater's rig in a team's dark (home) or white (away) sweater */
  function skater(def, team, home) {
    const t = TEAMS[team], look = def.look || {}, jersey = home ? t.dark : t.light, trim = home ? t.trim : t.dark;
    const rig = new E.Humanoid({ size: (def.build === 'bulky' ? 1.3 : 1.2) * (bigHeads ? 1 : 1), build: def.build || 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', armor: true,
      style: retro ? 'classic' : 'hd',
      hair: look.hair || 'short', hat: { style: 'helmet', color: home ? t.dark : t.trim },
      colors: { skin: look.skin || '#e8b890', hair: look.hairC || '#3a2a1a', cloth: jersey, trim, pants: home ? t.trim === '#141414' ? '#1a1a1a' : t.dark : t.dark, boot: '#141418', belt: trim, glove: trim, plate: jersey, metal: jersey, hat: home ? t.trim : t.dark } });
    if (bigHeads) rig.o.headR = 3.4 * 1.8;
    rig.gearOpts = { skates: true, stick: true, number: def.num, letter: def.role === 'C' ? 'C' : '', numColor: home ? t.light : t.dark, stickColor: ['#c89a5a', '#2a2a30', '#e0e0e0', '#c83a2a'][def.num % 4], tape: '#141418', visor: true };
    return wrap(rig);
  }
  function goalie(def, team, home) {
    const t = TEAMS[team], look = def.look || {}, jersey = home ? t.dark : t.light;
    const rig = new E.Humanoid({ size: def.look && def.look.boss ? 1.75 : 1.3, build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'long', armor: true, style: retro ? 'classic' : 'hd',
      hair: look.hair || 'short', hat: { style: 'helmet', color: look.mask || t.trim },
      colors: { skin: look.skin || '#e8b890', hair: look.hairC || '#222', cloth: jersey, trim: t.trim, pants: t.dark, boot: '#141418', glove: look.pads || '#f0f0f0', plate: jersey, hat: look.mask || t.trim } });
    if (bigHeads) rig.o.headR = 3.4 * 1.8;
    rig.gearOpts = { skates: true, stick: true, goalie: true, pads: look.pads || '#f0f0f0', blocker: true, catcher: true, cage: true, number: def.num, numColor: home ? t.light : t.dark, stickColor: '#d8c8a8', tape: '#f0f0f0' };
    return wrap(rig);
  }
  function referee(linesman) {
    const rig = new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', hat: { style: 'helmet', color: '#141414' }, hair: 'short',
      colors: { skin: linesman ? '#c89070' : '#f0c8a0', hair: '#3a2a1a', cloth: '#f4f4f4', trim: '#ff7a1a', pants: '#141414', boot: '#141414', glove: '#141414', hat: '#141414' } });
    rig.gearOpts = { skates: true, stripes: true };
    const base = rig.gear = gear;
    // the stripes: vertical black bars over the sweater
    rig.gear = function (ops, h) {
      base.call(this, ops, h); const { g, Sp, J, Q, u } = h; if (!J.shC || u < 1.2) return;
      for (let i = -1; i <= 1; i++) { const a = Sp(J.shC, 0, i * 1.2, -.6), b = Sp(J.hipC, 0, i * 1.2, .8); ops.push({ d: Q.shC[2] + .04, f: () => px.line(g, a[0], a[1], b[0], b[1], '#141414', Math.max(1, Math.round(u * .45))) }); }
    };
    return wrap(rig);
  }
  /** staff and story characters: Coach Marge, Gus, Doris, Goldie Glitterman, Polar Pete, Chuck and Moose */
  const STAFF = {
    marge: () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'ponytail', colors: { skin: '#f0d0b8', hair: '#c8c8c8', cloth: '#8a3a3a', coat: '#6a4a8a', trim: '#e8b43a', pants: '#3a3a4a', boot: '#2a1a1a' } }),
    gus: () => new E.Humanoid({ size: 1.1, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'bald', hat: { style: 'cap', color: '#2a5a3a' }, hunch: .5, colors: { skin: '#e0b898', hair: '#e0e0e0', cloth: '#5a6a3a', coat: '#3a4a2a', pants: '#3a3a3a', hat: '#2a5a3a' } }),
    doris: () => new E.Humanoid({ size: 1.1, build: 'heroic', weapon: null, outfit: 'robe', sleeves: 'long', hair: 'long', colors: { skin: '#f4d8c0', hair: '#c86ab0', cloth: '#3a8a8a', trim: '#e8e0d0' } }),
    glitterman: () => new E.Humanoid({ size: 1.2, build: 'bulky', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#f0c8a8', hair: '#f0d060', cloth: '#141414', coat: '#d9a520', trim: '#fff0a0', pants: '#141414', boot: '#d9a520', eye: '#141414', iris: '#141414' } }),
    pete: () => { const r = new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'bald', colors: { skin: '#f4f8ff', hair: '#f4f8ff', cloth: '#f4f8ff', pants: '#f4f8ff', boot: '#e0389a', glove: '#f4f8ff', trim: '#18b5b0' } }); r.o.headR = 5; return r; },
    chuck: () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#f0c8a0', hair: '#5a3a1a', cloth: '#f0f0f0', coat: '#2a3a6a', trim: '#c83a2a', pants: '#2a2a3a' } }),
    moose: () => new E.Humanoid({ size: 1.2, build: 'bulky', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#e0a880', hair: '#8a8a8a', cloth: '#f0e8d8', coat: '#6a3a2a', trim: '#e8b43a', pants: '#2a2a2a' } })
  };
  const STAFF_NAMES = { marge: 'COACH MARGE', gus: 'OLD GUS', doris: 'DORIS', glitterman: 'GOLDIE GLITTERMAN', pete: 'POLAR PETE', chuck: 'CHUCK WALLOP', moose: 'MOOSE PLUNKETT' };
  const STAFF_VOICE = { marge: 'marge', gus: 'gus', doris: 'doris', glitterman: 'glitter', pete: 'pete', chuck: 'chuck', moose: 'moose' };
  // story cast ids for team players
  const CAST = { dunny: ['muskrats', 0], snipes: ['muskrats', 1], lou: ['muskrats', 2], lemmy: ['muskrats', 'g'], bigtimber: ['lumberjacks', 2], rocco: ['bruisers', 0], rollo: ['bruisers', 1],
    chad: ['marauders', 0], sterling: ['grizzlies', 0], vault: ['grizzlies', 'g'] };
  const cache = {};
  function cast(id) {
    if (cache[id]) return cache[id];
    let rig, name, voice;
    if (STAFF[id]) { rig = STAFF[id](); name = STAFF_NAMES[id]; voice = STAFF_VOICE[id]; }
    else if (CAST[id]) { const [tm, k] = CAST[id], def = k === 'g' ? TEAMS[tm].goalie : TEAMS[tm].skaters[k]; rig = k === 'g' ? goalie(def, tm, true) : skater(def, tm, true); rig.noStick = true; name = (def.nick || def.name).toUpperCase(); voice = (def.look && def.look.voice) || TEAMS[tm].voice; }
    else { rig = STAFF.chuck(); name = id.toUpperCase(); voice = 'mid'; }
    return (cache[id] = { rig, name, voice, id });
  }
  /* fans: tiny figures (drawn as pixels by the crowd), and the big glass pounders (classic rigs) */
  function pounder(color, skin) { return new E.Humanoid({ size: .9, style: 'classic', weapon: null, colors: { cloth: color, skin, pants: '#2a2a3a' } }); }
  return { skater, goalie, referee, cast, pounder, STAFF_NAMES, wrap, set bigHeads(v) { bigHeads = v; }, get bigHeads() { return bigHeads; }, set retro(v) { retro = v; }, get retro() { return retro; } };
})();

// ---- 22-skater.js ----
/* ---- Skater: the pure skating step, ratings, and the puck actions (pass, saucer, wrist, slap, one-timer, deke, poke, check) ---- */
let M = null;   // the match being played (Match owns it; every simulation module reads it)
const Skater = (() => {
  const spdMul = d => .85 + .05 * d.spd, shotMul = d => .85 + .05 * d.sht, errMul = d => 1.3 - .1 * d.sht, passMul = d => .9 + .033 * d.pas, hitMul = d => .8 + .067 * d.hit, hndMul = d => .85 + .05 * d.hnd;
  const BUSY = { down: 1, getup: 1, stun: 1, bin: 1, fight: 1, frozen: 1, buried: 1, slip: 1, celebrate: 1, faceoff: 0 };
  const free = s => !BUSY[s.state];
  /** the top speed of a skater now */
  function vmax(s, turbo) {
    let v = T.skateMax * spdMul(s.def) * (turbo ? T.turboMul : 1) * (M && M.puck.owner === s ? .94 : 1) * (s.winding ? .6 : 1);
    if (s.items.cocoa > 0) v *= 1.2; if (M && M.boost && M.boost[s.team] > 0) v *= 1.1; if (M && M.tactic && M.tactic[s.team] === 'finesse') v *= 1.04;
    if (s.slowT > 0) v *= .6;
    return v;
  }
  /** one fixed step of skating (pure on s: the network's prediction runs it too) */
  function skateStep(s, mx, my, turbo, dt, noStop) {
    const vm = vmax(s, turbo), sp = Math.hypot(s.vx, s.vy), m = Math.min(1, Math.hypot(mx, my));
    if (s.state === 'stop') {
      const ns = Math.max(0, sp - T.stopDecel * dt); if (sp > 0) { s.vx *= ns / sp; s.vy *= ns / sp; }
      s.stateT += dt; if (s.stateT > .22 && (ns < 30 || m < .1)) s.state = 'skate';
      return null;
    }
    let ev = null;
    if (m > .15) {
      const dir = Math.atan2(my, mx), va = Math.atan2(s.vy, s.vx);
      if (!noStop && sp > (s.ctrl === 'cpu' ? 100 : 60) && Math.abs(U.angDiff(dir, va)) > (s.ctrl === 'cpu' ? 2.6 : 2.09) && s.state === 'skate') { s.state = 'stop'; s.stateT = 0; s.stopSide = U.angDiff(dir, va) > 0 ? 1 : -1; return 'stop'; }
      if (sp > 1) { const rate = lerp(T.turnSlow, T.turnFast, Math.min(1, sp / vm)), nva = U.approachAng(va, dir, rate * dt); s.vx = Math.cos(nva) * sp; s.vy = Math.sin(nva) * sp; s.turning = Math.sign(U.angDiff(dir, va)) * Math.min(1, Math.abs(U.angDiff(dir, va)) * 2); }
      const acc = T.skateAccel * (1 - .6 * Math.min(1, Math.pow(sp / vm, 2))) * m;
      s.vx += Math.cos(dir) * acc * dt; s.vy += Math.sin(dir) * acc * dt;
      const ns = Math.hypot(s.vx, s.vy), cap = vm * Math.max(.4, m);
      if (ns > cap) { const k = Math.max(cap, ns - (ns - cap) * 3 * dt - T.iceGlide * dt) / ns; s.vx *= k; s.vy *= k; }
    } else {
      s.turning = 0;
      if (sp > 0) { const ns = Math.max(0, sp - T.iceGlide * dt); s.vx *= ns / sp; s.vy *= ns / sp; }
    }
    // edge grip: the part of the velocity across the facing decays (carves, not slides)
    const f = s.facing, cf = Math.cos(f), sf = Math.sin(f), along = s.vx * cf + s.vy * sf, across = -s.vx * sf + s.vy * cf, k = Math.exp(-T.edgeGrip * dt);
    if (along > 0) { s.vx = cf * along - sf * across * k; s.vy = sf * along + cf * across * k; }
    const ns = Math.hypot(s.vx, s.vy);
    if (ns > 12) s.facing = U.approachAng(s.facing, Math.atan2(s.vy, s.vx), 11 * dt);
    else if (m > .15) s.facing = U.approachAng(s.facing, Math.atan2(my, mx), 9 * dt);
    return ev;
  }
  /** the blade point (where a carried puck rides) */
  const blade = (s, reach = 11) => { const c = Math.cos(s.facing), n = Math.sin(s.facing), h = s.def.hand || 1; return [s.x + c * reach - n * h * 4, s.y + n * reach + c * h * 4]; };
  /** the goal a team attacks: { x, y, side } */
  const attackGoal = team => { const side = 1 - (team ^ M.flip); return { x: Rink.goalX(side), y: Rink.C.y, side }; };
  const ownGoal = team => { const side = team ^ M.flip; return { x: Rink.goalX(side), y: Rink.C.y, side }; };
  /** where in the net to aim: aim (a world point or null), stickY (-1..1 near/far), the goalie's position */
  function aimPoint(s, o = {}) {
    const g = attackGoal(s.team), gl = M.goalies[1 - s.team], C = Rink.C, mouth = Rink.MOUTH - 5;
    let y;
    if (o.aim) { const ax = o.aim[0], ay = o.aim[1], t = Math.abs(ax - s.x) > 1 ? (g.x - s.x) / (ax - s.x) : 0; y = t > 0 ? s.y + (ay - s.y) * t : ay; }
    else if (o.stickY) y = C.y + o.stickY * mouth;
    else y = gl && gl.y > C.y ? C.y - mouth : C.y + mouth;   // the open side
    y = clamp(y, C.y - mouth, C.y + mouth);
    return [g.x, y];
  }
  /** release the puck from s with a velocity */
  function release(s, vx, vy, vz, kind) {
    const p = M.puck; p.owner = null; p.vx = vx; p.vy = vy; p.vz = vz || 0; p.z = Math.max(p.z, .2); p.prevTouch = p.lastTouch; p.lastTouch = s; p.touchT = M.t;
    p.shotBy = null; p.passTo = null; p.kind = kind; p.onFire = false; p.lumber = false;
    s.cool.pickup = .25; s.shootHold = 0; s.winding = false; s.charge = 0;
  }
  /** a shot: wrist, slap (charge 0..1), onetimer or kaboom */
  function shoot(s, kind, charge = 0, o = {}) {
    const p = M.puck, d = s.def, [bx, by] = blade(s);
    p.x = bx; p.y = by;
    let speed = kind === 'wrist' ? T.wristSpeed * shotMul(d) : (T.slapBase + T.slapGain * charge) * shotMul(d);
    let sigma = (kind === 'wrist' ? 5 : 7 * (1.4 - .4 * charge)) * errMul(d) * T.shotError;
    if (kind === 'onetimer') { speed = (T.slapBase + T.slapGain * .85) * shotMul(d) * T.oneTimerBonus; sigma *= .5; }
    if (o.turbo) speed *= 1.12;
    if (s.items.lumber > 0) { speed *= 1.3; sigma = 0; s.items.lumberShots = (s.items.lumberShots || 3) - 1; if (s.items.lumberShots <= 0) s.items.lumber = 0; }
    const kab = M.kaboomT[s.team] > 0 && (kind === 'slap' && charge >= .95);
    if (kab) { kind = 'kaboom'; speed = 760; sigma = 0; }
    speed = Math.min(760, speed);
    if (s.ai && s.ai.errK) sigma *= s.ai.errK;
    const goalie = M.goalies[1 - s.team], down = goalie && (goalie.state === 'butterfly' || goalie.state === 'stack');
    const [tx, ty] = aimPoint(s, o);
    const dist = Math.hypot(tx - bx, ty - by), t = dist / speed;
    const lift = kind === 'wrist' ? 2 + RNG.sim() * 5 : kind === 'kaboom' ? 6 + RNG.sim() * 6 : kind === 'onetimer' ? 3 + RNG.sim() * 12 : 13 + RNG.sim() * 4;   // wristers low, clappers top shelf
    const err = U.gauss(RNG.sim) * sigma / Math.max(30, dist) * 1.4;
    const a = Math.atan2(ty - by, tx - bx) + err, vz = (lift + .5 * 700 * t * t) / t;
    release(s, Math.cos(a) * speed, Math.sin(a) * speed, Math.min(vz, 260), kind);
    p.shotBy = s; p.onFire = kab; p.shotT = M.t; p.shotKind = kind;
    // on goal: does the line cross the goal line inside the mouth?
    const gx = tx, yAt = by + Math.tan(a) * (gx - bx), onGoal = Math.abs(yAt - Rink.C.y) < Rink.MOUTH && Math.cos(a) * (gx - bx) > 0;
    M.stats[s.id].shots++; M.shots[s.team] += onGoal ? 1 : 0;
    Bus.emit('shot', { by: s.id, team: s.team, kind, speed, onGoal, dist: Math.round(dist), x: bx, y: by });
    if (kab) Bus.emit('kaboom_shot', { by: s.id, team: s.team });
    s.act = { kind: 'follow', t: 0 };
    return p;
  }
  /** the teammate a pass goes to: the one nearest the aim's bearing (within 75 degrees), the reticle, else the nearest ahead */
  function passTarget(s, o = {}) {
    const mates = M.skaters.filter(m => m.team === s.team && m !== s && m.state !== 'bin' && m.state !== 'fight');
    if (!mates.length) return null;
    if (o.aim) { let best = null, bd = 80; for (const m of mates) { const d = Math.hypot(m.x - o.aim[0], m.y - o.aim[1]); if (d < bd) { bd = d; best = m; } } if (best) return best; }
    const dir = o.dir !== undefined ? o.dir : s.facing; let best = null, ba = 1.31;
    for (const m of mates) { const a = Math.abs(U.angDiff(Math.atan2(m.y - s.y, m.x - s.x), dir)); if (a < ba) { ba = a; best = m; } }
    if (best) return best;
    const g = attackGoal(s.team); return mates.slice().sort((a, b) => Math.abs(a.x - g.x) - Math.abs(b.x - g.x))[0];
  }
  function pass(s, o = {}) {
    const p = M.puck, d = s.def, [bx, by] = blade(s); p.x = bx; p.y = by;
    const m = o.to || passTarget(s, o);
    let tx, ty;
    if (m) {
      tx = m.x; ty = m.y; let sp = 300;
      for (let i = 0; i < 2; i++) { const dd = Math.hypot(tx - bx, ty - by); sp = clamp(220 + .9 * dd, T.passMin, T.passMax) * passMul(d); const tf = dd / sp; tx = m.x + m.vx * tf * .9; ty = m.y + m.vy * tf * .9; }
      // keep it on the ice
      const k = Rink.sdf(tx, ty); if (k > -10) { const n = Rink.normal(tx, ty); tx -= n[0] * (k + 10); ty -= n[1] * (k + 10); }
      o.speed = sp;
    } else if (o.aim) { tx = o.aim[0]; ty = o.aim[1]; }
    else { tx = bx + Math.cos(s.facing) * 120; ty = by + Math.sin(s.facing) * 120; }
    const dd = Math.hypot(tx - bx, ty - by), sp = o.speed || clamp(220 + .9 * dd, T.passMin, T.passMax) * passMul(d);
    const sig = .06 * (1.3 - .1 * d.pas) * (s.items.tape > 0 ? .3 : 1), a = Math.atan2(ty - by, tx - bx) + U.gauss(RNG.sim) * sig;
    if (o.saucer) {
      const v = E.arc({ x: bx, y: by, z: 1 }, { x: bx + Math.cos(a) * dd, y: by + Math.sin(a) * dd, z: 0 }, 700, { apex: T.saucerApex });
      release(s, v.vx * .95, v.vy * .95, v.vz, 'saucer');
    } else release(s, Math.cos(a) * sp, Math.sin(a) * sp, 0, 'pass');
    p.passTo = m || null; p.passFrom = s; p.passT = M.t; p.tape = s.items.tape > 0;
    if (m) { m.receiving = .9; }
    Bus.emit('pass', { from: s.id, to: m ? m.id : -1, team: s.team, kind: o.saucer ? 'saucer' : 'pass' });
    s.act = { kind: 'pass', t: 0, saucer: !!o.saucer };
    return m;
  }
  /** a check: a lunge along the facing for 0.3 s; the hit itself is resolved by Hits on contact */
  function check(s) {
    if (s.cool.check > 0) return false;
    s.state = 'check'; s.stateT = 0; s.cool.check = .7; s.hitDone = {};
    const sp = 60 + (s.items.poutine > 0 ? 20 : 0); s.vx += Math.cos(s.facing) * sp; s.vy += Math.sin(s.facing) * sp;
    return true;
  }
  function deke(s, side) {
    if (s.cool.deke > 0) return false;
    s.cool.deke = .8; s.state = 'deke'; s.stateT = 0; s.dekeSide = side || (s.lastDekeSide = -(s.lastDekeSide || 1));
    const a = s.facing + s.dekeSide * PI / 2; s.vx += Math.cos(a) * 90; s.vy += Math.sin(a) * 90;
    s.spin = s.turbo > 0 && s.holdTurbo;
    Bus.emit('deke', { by: s.id, team: s.team });
    // a goalie close by bites
    const gl = M.goalies[1 - s.team]; if (gl && Math.hypot(gl.x - s.x, gl.y - s.y) < 70) gl.dekedT = M.t;
    s.dekeVs = M.skaters.filter(o => o.team !== s.team && Math.hypot(o.x - s.x, o.y - s.y) < 40).map(o => o.id); s.dekeAt = M.t;
    return true;
  }
  function poke(s) {
    if (s.cool.poke > 0) return false;
    s.cool.poke = .6; s.act = { kind: 'poke', t: 0 }; s.pokeHit = false;
    return true;
  }
  return { spdMul, shotMul, passMul, hitMul, hndMul, free, vmax, skateStep, blade, attackGoal, ownGoal, aimPoint, release, shoot, pass, passTarget, check, deke, poke };
})();

// ---- 23-puck.js ----
/* ---- Puck: possession, substepped free motion against boards, glass, posts, nets, goalies, sticks and bodies; goals ---- */
const Puck = (() => {
  const R = 1.6, G = 700;
  const canTake = s => Skater.free(s) && s.state !== 'check' && s.cool.pickup <= 0 && !(M.fight && M.fight.who.includes(s));
  function step(dt) {
    const p = M.puck;
    p.trailT = (p.trailT || 0) + dt;
    if (p.inNet) { const k = Math.exp(-dt * 6); p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z - 40 * dt); return; }
    if (p.held) return;   // in a goalie's glove or a referee's hand
    if (p.owner) return carried(p, dt);
    const n = 4, h = dt / n;
    for (let i = 0; i < n && !p.owner && !p.inNet && !p.dead; i++) sub(p, h);
  }
  function carried(p, dt) {
    const s = p.owner, [bx, by] = Skater.blade(s), weave = Math.hypot(s.vx, s.vy) < 60 ? Math.sin(M.t * 9) * 3 : Math.sin(M.t * 5) * 1.2;
    const tx = bx - Math.sin(s.facing) * weave, ty = by + Math.cos(s.facing) * weave, k = 1 - Math.exp(-30 * dt);
    p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; p.z = 0; p.vx = s.vx; p.vy = s.vy; p.vz = 0;
    // puck battles: an opposing blade within 8 of a carried puck (not one taped down by Grandma's Tape)
    p.battleT = (p.battleT || 0) - dt;
    if (p.battleT <= 0 && !(s.items.tape > 0)) {
      p.battleT = .2;
      for (const o of M.skaters) {
        if (o.team === s.team || !canTake(o)) continue;
        const [ox, oy] = Skater.blade(o); if (Math.hypot(ox - p.x, oy - p.y) > 8) continue;
        const a = s.def.hnd + s.def.hit / 2 + RNG.sim() * 3, b = o.def.hnd + o.def.hit / 2 + RNG.sim() * 3;
        Bus.emit('battle', { a: s.id, b: o.id, x: p.x, y: p.y });
        if (b > a) { take(o, p, 'battle'); M.stats[o.id].takeaways++; }
        break;
      }
    }
  }
  /** s takes the puck */
  function take(s, p, how) {
    const prev = p.owner, last = p.lastTouch;
    p.owner = s; p.vx = s.vx; p.vy = s.vy; p.vz = 0; p.z = 0; p.onFire = false; p.held = false;
    if (p.passTo && p.passTo.team === s.team && p.passFrom && p.passFrom !== s) { Bus.emit('pass_complete', { by: p.passFrom.id, to: s.id, team: s.team }); }
    else if (p.passTo && p.passFrom && p.passFrom.team !== s.team) Bus.emit('intercept', { by: s.id, team: s.team });
    if (last && last !== s) { p.prevTouch = last; }
    p.lastTouch = s; p.touchT = M.t; p.passTo = null; p.shotBy = null;
    for (const o of M.skaters) o.receiving = 0;
    Bus.emit('possession', { by: s.id, team: s.team, how: how || 'pickup' });
    if (s.oneTimer > 0 && M.phase === 'play') { s.oneTimer = 0; Skater.shoot(s, 'onetimer', .85, { aim: s.ai ? null : s.lastAim }); return; }
  }
  function sub(p, h) {
    const sp = Math.hypot(p.vx, p.vy);
    if (p.z <= .05 && sp > 0) { const ns = Math.max(0, sp - (T.puckFriction + T.puckDrag * sp) * h); p.vx *= ns / sp; p.vy *= ns / sp; }
    if (p.z > 0 || p.vz > 0) p.vz -= G * h;
    const px0 = p.x, py0 = p.y, pz0 = p.z;
    p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
    if (p.z < 0) { p.z = 0; if (p.vz < -60) { p.vx *= .9; p.vy *= .9; p.wobble = .6; } p.vz = Math.abs(p.vz) > 25 ? -p.vz * .3 : 0; }
    const cy = Rink.C.y, mouth = Rink.MOUTH;
    for (const side of [0, 1]) {
      const gx = Rink.goalX(side), od = Rink.outDir(side), was = (px0 - gx) * od, now = (p.x - gx) * od;
      // the save solver gets its look first: the goalie of this end
      const gl = M.goalies.find(g => g && Skater.ownGoal(g.team).side === side);
      if (gl && Goalie.test(gl, p, px0, py0, pz0)) return;
      if (was < 0 && now >= 0) {   // crossing the goal line
        const yAt = py0 + (p.y - py0) * (-was / (now - was || 1)), zAt = pz0 + (p.z - pz0) * (-was / (now - was || 1));
        if (Math.abs(yAt - cy) < mouth - R && zAt < Rink.BAR - R) {
          if (gl && gl.def === TEAMS.muskrats.goalie && Math.abs(Math.abs(yAt - cy) - mouth) < 4 && RNG.sim() < .2) { ping(p, side, yAt, false); p.x = gx - od * 2; return; }   // Lemmy talks to his posts
          return M.goal(side);
        }
        if (Math.abs(yAt - cy) < mouth + R && zAt >= Rink.BAR - R && zAt < Rink.BAR + R + 1) { ping(p, side, yAt, true); return; }   // the crossbar
      }
      // the posts: two thin cylinders
      for (const sy of [-1, 1]) {
        const ppx = gx, ppy = cy + sy * mouth, dd = Math.hypot(p.x - ppx, p.y - ppy);
        if (dd < R + 1.5 && p.z < Rink.BAR) { const nx = (p.x - ppx) / (dd || 1), ny = (p.y - ppy) / (dd || 1), vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= 1.82 * vn * nx; p.vy -= 1.82 * vn * ny; p.x = ppx + nx * (R + 1.6); p.y = ppy + ny * (R + 1.6); if (-vn > 60) ping(p, side, ppy, false, true); } }
      }
      // the net: solid from behind and the sides
      const inBox = (x, y) => (x - gx) * od > 0 && (x - gx) * od < Rink.NETD && Math.abs(y - cy) < mouth + 1;
      if (inBox(p.x, p.y) && !inBox(px0, py0) && p.z < Rink.BAR) {
        if (!(was < 0 && now >= 0)) { if (Math.abs(px0 - gx) * 1 >= Rink.NETD - .5 || (px0 - gx) * od >= Rink.NETD) p.vx = -p.vx * .2; else p.vy = -p.vy * .2; p.x = px0; p.y = py0; A.sfx('net', { vol: .5 }); }
      }
    }
    // boards and glass
    const d = Rink.sdf(p.x, p.y);
    if (d > -R) {
      const pan = Rink.panelAt(p.x, p.y), boardTop = M.arena.snowbank ? 9 : Rink.BOARD, glassTop = M.arena.snowbank ? 12 : boardTop + pan.h;
      if (p.z > glassTop || (pan.state === 'shattered' && p.z > 4) || (M.arena.snowbank && p.z > 9)) { p.dead = true; Bus.emit('out', { x: p.x, y: p.y }); M.stoppage('out', Rink.nearestDot(p.x, p.y)); return; }
      const n = Rink.normal(p.x, p.y), vn = p.vx * n[0] + p.vy * n[1];
      p.x -= n[0] * (d + R); p.y -= n[1] * (d + R);
      if (vn > 0) {
        const glass = p.z > boardTop, e = glass ? .5 : M.arena.snowbank ? .3 : T.boardBounce, keep = .92;
        p.vx = (p.vx - vn * n[0]) * keep - vn * e * n[0]; p.vy = (p.vy - vn * n[1]) * keep - vn * e * n[1];
        if (vn > 50) Bus.emit(glass ? 'glass_hit' : 'boards', { x: p.x, y: p.y, speed: vn, panel: pan.i, snow: !!M.arena.snowbank });
        if (p.onFire) { Bus.emit('blast', { x: p.x, y: p.y, panel: pan.i }); Hits.breakPanel(pan, 'shattered', p.lastTouch); p.onFire = false; }
        p.passTo = null;
      }
    }
    // thin-ice holes swallow the puck
    if (Items.holeAt(p.x, p.y) && p.z < 1) { p.dead = true; Bus.emit('puck_lost', { x: p.x, y: p.y }); M.stoppage('hole', Rink.nearestDot(p.x, p.y, Rink.DOTS.nz)); return; }
    // sticks: pickups, interceptions and deflections; bodies block shots
    if (p.z < 6) {
      for (const s of M.skaters) {
        if (!canTake(s)) continue;
        if (p.lastTouch === s && M.t - p.touchT < .2) continue;
        if (p.tape && p.passFrom && p.passFrom.team !== s.team && p.passTo) continue;   // taped passes can't be picked off
        const [bx, by] = Skater.blade(s), db = Math.hypot(bx - p.x, by - p.y), dbody = Math.hypot(s.x - p.x, s.y - p.y);
        const reach = T.pickupRadius * Skater.hndMul(s.def) * (s.ai ? .85 + .3 * s.ai.skill : 1);
        if (db > reach && dbody > 10) continue;
        const rel = Math.hypot(p.vx - s.vx, p.vy - s.vy);
        if (s.oneTimer > 0 || p.passTo === s || rel < 300) { take(s, p); return; }
        const chance = clamp(1.3 - rel / 450 + .08 * (s.def.hnd - 3), .1, 1);
        if (RNG.sim() < chance * (p.shotBy && p.shotBy.team !== s.team ? .55 : 1)) { take(s, p, 'catch'); if (p.shotBy && p.shotBy.team !== s.team) Bus.emit('block', { by: s.id, team: s.team }); return; }
        // it deflects off the blade (or the body: a blocked shot)
        const nx = (p.x - s.x) / (dbody || 1), ny = (p.y - s.y) / (dbody || 1), vn = p.vx * nx + p.vy * ny;
        if (vn < 0) { p.vx = (p.vx - 2 * vn * nx) * .5; p.vy = (p.vy - 2 * vn * ny) * .5; p.prevTouch = p.lastTouch; p.lastTouch = s; p.touchT = M.t; p.kind = 'deflect'; Bus.emit(dbody < 10 ? 'block' : 'deflect', { by: s.id, team: s.team }); }
        return;
      }
    }
    if (p.z < 1 && Math.hypot(p.vx, p.vy) < 4) { p.vx = p.vy = 0; }
  }
  function ping(p, side, y, bar, post) {
    p.vx = -p.vx * .82; p.vz = bar ? Math.abs(p.vz) * .4 + 40 : p.vz;
    Bus.emit('post', { by: p.lastTouch ? p.lastTouch.id : -1, team: p.lastTouch ? p.lastTouch.team : -1, bar: !!bar, x: Rink.goalX(side), y });
  }
  return { step, take, R, canTake };
})();

/* ---- Goalie: positioning, the save solver (reaction, lateral speed, save shapes), freezes and rebounds, the KABOOM blast ---- */
const Goalie = (() => {
  const scale = gl => (.9 + .033 * gl.size) * T.goalieReach * (gl.bricks > 0 ? 1.35 : 1) * (gl.bossScale || 1);
  function reactTime(gl, p) {
    let r = T.goalieReact - .015 * (gl.rfx - 3) + (M.goalieOffset ? M.goalieOffset[gl.team] : 0);
    if (M.kaboomT[gl.team] > 0) r -= .03;
    // screened: a body within 14 of the shot line between the shooter and the net
    const g = Skater.ownGoal(gl.team);
    for (const s of M.skaters) if (s !== p.lastTouch && U.segDist(s.x, s.y, p.x, p.y, g.x, g.y) < 14 && Math.hypot(s.x - g.x, s.y - g.y) < Math.hypot(p.x - g.x, p.y - g.y) - 10) { r += .08; break; }
    if (gl.dekedT && M.t - gl.dekedT < .5) r += .12 * (gl.def.look && gl.def.look.boss ? 1.5 : 1);
    if (gl.slowT > 0) r += .1;
    if (p.shotKind === 'onetimer' && M.t - (p.shotT || 0) < .5) r += .07;   // the one-timer: no time to set
    return Math.max(.03, r);
  }
  function update(gl, dt) {
    if (gl.disabled) return;
    gl.stateT += dt; gl.cool = Math.max(0, (gl.cool || 0) - dt); gl.bricks = Math.max(0, (gl.bricks || 0) - dt);
    if (gl.state === 'blasted') { if (gl.stateT > 1.2) gl.state = 'ready'; return rig(gl, dt); }
    if (['glove', 'blocker', 'stack', 'butterfly', 'poke', 'cover', 'celebrate'].includes(gl.state) && gl.stateT > (gl.state === 'stack' ? 1 : gl.state === 'cover' ? 99 : gl.state === 'celebrate' ? 99 : .45)) gl.state = 'ready';
    const g = Skater.ownGoal(gl.team), into = -Rink.outDir(g.side), p = M.puck, C = Rink.C;
    let tx, ty;
    if (gl.manual) { tx = gl.mx; ty = gl.my; }
    else {
      const behind = (p.x - g.x) * into < 0;
      if (behind) { tx = g.x + into * 4; ty = C.y + (p.y > C.y ? 1 : -1) * (Rink.MOUTH - 3); }
      else {
        const a = Math.atan2(p.y - g.y, (p.x - g.x)), dist = Math.hypot(p.x - g.x, p.y - g.y), dd = clamp(lerp(10, 26, (dist - 40) / 260), 10, 26);
        tx = g.x + Math.cos(a) * dd; ty = clamp(g.y + Math.sin(a) * dd, C.y - 22, C.y + 22);
        if ((tx - g.x) * into < 6) tx = g.x + into * 6;
      }
      const tr = gl.track;
      if (tr && M.t - tr.t0 >= tr.react && M.t - tr.t0 < 1.2) ty = tr.y;
    }
    const lat = T.goalieLateral * (.85 + .05 * gl.rfx) * (gl.vaultCracked ? .9 : 1), dx = tx - gl.x, dy = ty - gl.y, d = Math.hypot(dx, dy), push = d > 10 ? 230 : lat;
    // a pass across the crease: the goalie reads it late (that's what makes one-timers work)
    const passing = !gl.manual && p.passTo && !p.owner && M.t - (p.passT || 0) < T.goalieReact + .16 + .015 * (3 - gl.rfx) && p.passTo.team !== gl.team;
    if (gl.state !== 'stack' && gl.state !== 'cover' && !passing) { const st = Math.min(d, push * dt); if (d > .01) { gl.x += dx / d * st; gl.y += dy / d * st; gl.vy = dy / d * st / dt; } else gl.vy = 0; }
    gl.facing = U.approachAng(gl.facing, Math.atan2(p.y - gl.y, p.x - gl.x), 8 * dt);
    // poke check a carrier in the crease's mouth
    if (!gl.manual && p.owner && p.owner.team !== gl.team && gl.cool <= 0 && Math.hypot(p.owner.x - gl.x, p.owner.y - gl.y) < 22 && (p.owner.x - gl.x) * into > 0) {
      gl.cool = 1.5; gl.state = 'poke'; gl.stateT = 0;
      if (RNG.sim() < .4 * gl.rfx / 3) { const s = p.owner; Skater.release(s, into * 120, (RNG.sim() - .5) * 160, 0, 'poke'); p.lastTouch = null; Bus.emit('poke', { by: 'g' + gl.team, ok: true, goalie: true }); }
    }
    // a slow loose puck in the crease: cover it
    if (!p.owner && !p.inNet && !p.held && Math.hypot(p.x - gl.x, p.y - gl.y) < 9 && Math.hypot(p.vx, p.vy) < 90 && p.z < 4 && Math.hypot(p.x - g.x, p.y - g.y) < 32 && M.phase === 'play') {
      gl.state = 'cover'; gl.stateT = 0; p.held = true; p.vx = p.vy = 0; Bus.emit('save', { goalie: 'g' + gl.team, team: gl.team, kind: 'cover', freeze: true });
      M.stoppage('freeze', Rink.nearestDot(gl.x, gl.y));
    }
    // the save solver's look at a shot coming in
    if (!p.owner && !p.inNet && !p.held) {
      const vin = p.vx * -into; if (vin > 60) {
        const tc = (gl.x - p.x) / (p.vx || 1e-6);
        if (tc > 0 && tc < 1) {
          const yc = p.y + p.vy * tc, key = p.shotT + ':' + (p.lastTouch ? p.lastTouch.id : '') + ':' + Math.round(p.touchT * 10);
          if (Math.abs(yc - C.y) < Rink.MOUTH + 10 && (!gl.track || gl.track.key !== key)) {
            const sp = Math.hypot(p.vx, p.vy), dist = Math.max(20, Math.abs(gl.x - p.x)), sig = T.goalieRead * (1 + sp / 70) * (1.25 - .08 * gl.rfx) * clamp(140 / dist, .5, 2.2) * (p.passTo ? 1.6 : 1) * (p.shotKind === 'onetimer' && M.t - (p.shotT || 0) < .5 ? 2 : 1);
            gl.track = { key, t0: M.t, react: reactTime(gl, p), y: clamp(yc + U.gauss(RNG.sim) * sig, C.y - 24, C.y + 24), zc: p.z + p.vz * tc - 350 * tc * tc };
          }
        }
      }
    }
    rig(gl, dt);
  }
  /** does the goalie stop the puck as it crosses his plane this substep? true when the save ended the substep */
  function test(gl, p, px0, py0, pz0) {
    if (gl.state === 'blasted' || p.owner || gl.disabled) return false;
    const g = Skater.ownGoal(gl.team), into = -Rink.outDir(g.side), plane = gl.x - into * 1;
    const was = (px0 - plane) * into, now = (p.x - plane) * into;
    if (!(was > 0 && now <= 0)) return false;
    const u = was / (was - now || 1), y = py0 + (p.y - py0) * u, z = pz0 + (p.z - pz0) * u, dy = y - gl.y, w = scale(gl);
    const reacted = gl.track && M.t - gl.track.t0 >= gl.track.react;
    let kind = null;
    if (gl.manual) {
      if (gl.state === 'butterfly' && ((Math.abs(dy) < 14 * w && z < 10) || (Math.abs(dy) < 6 * w && z < 20))) kind = 'pad';
      else if (gl.state === 'stack' && Math.abs(dy) < 18 * w && z < 8) kind = 'stack';
      else if (Math.abs(dy) < 8 * w && z < 22) kind = z > 10 ? (dy * into < 0 ? 'glove' : 'blocker') : 'pad';
      else if (Math.abs(dy) < 12 * w && z > 10 && z < 21) kind = dy * into < 0 ? 'glove' : 'blocker';
    } else {
      const low = z < 9;
      if (Math.abs(dy) < 8 * w && z < 22) kind = z > 12 ? (dy * into < 0 ? 'glove' : 'blocker') : 'pad';
      else if (reacted && low && ((Math.abs(dy) < 12 * w && z < 9) || (Math.abs(dy) < 6 * w && z < 20))) kind = 'butterfly';
      else if (reacted && z >= 10 && z < 21 && Math.abs(dy) < 12 * w) kind = dy * into < 0 ? 'glove' : 'blocker';
      else if (reacted && Math.abs(dy) < 15 * w && z < 7 && M.t - gl.track.t0 > gl.track.react + .02) kind = 'stack';
    }
    if (!kind) return false;
    if (Math.abs(p.y - Rink.C.y) > Rink.MOUTH + 12) return false;
    // a KABOOM shot: blast the goalie back; it may carry through
    if (p.onFire) {
      gl.state = 'blasted'; gl.stateT = 0; Bus.emit('blast', { goalie: 'g' + gl.team, team: gl.team, x: gl.x, y: gl.y });
      if (gl.def.look && gl.def.look.boss && !gl.vaultCracked) {
        gl.vaultHits = (gl.vaultHits || 0) + 1;
        if (gl.vaultHits >= 2) { gl.vaultCracked = true; gl.bossScale = 1.4 / 1.75; gl.rfx = Math.max(1, gl.rfx - 1); gl.rig.o.size = 1.4; Bus.emit('vault_cracked', {}); }
        else Bus.emit('vault_locked', {});
      } else if (RNG.sim() < T.kaboomBlast) { gl.x -= into * 6; p.onFire = true; return false; }
      p.onFire = false; p.vx = into * 40; p.vy = (RNG.sim() - .5) * 40; p.vz = 0; p.z = 0; p.x = gl.x + into * 6; p.y = y;
      Bus.emit('save', { goalie: 'g' + gl.team, team: gl.team, kind: 'blast', freeze: false, by: p.lastTouch ? p.lastTouch.id : -1 });
      M.stats['g' + gl.team].saves++; return true;
    }
    gl.state = kind === 'pad' ? (z < 9 ? 'butterfly' : 'ready') : kind; gl.stateT = 0;
    const freeze = (kind === 'glove' && RNG.sim() < T.gloveCatch + .06 * (gl.reb - 3)) || (kind === 'butterfly' && RNG.sim() < .4 + .05 * (gl.reb - 3));
    M.stats['g' + gl.team].saves++;
    Bus.emit('save', { goalie: 'g' + gl.team, team: gl.team, kind, freeze, by: p.lastTouch ? p.lastTouch.id : -1, x: gl.x, y });
    if (freeze) { gl.state = kind === 'glove' ? 'glove' : 'cover'; p.held = true; p.x = gl.x; p.y = gl.y; p.z = kind === 'glove' ? 14 : 0; p.vx = p.vy = p.vz = 0; M.stoppage('freeze', Rink.nearestDot(gl.x, gl.y)); return true; }
    const sp = Math.hypot(p.vx, p.vy) * T.reboundSpeed, a = (into > 0 ? 0 : PI) + (RNG.sim() * 2 - 1) * .87;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.vz = z > 10 ? 60 : 20; p.x = plane + into * 2; p.y = y; p.z = Math.min(z, 10);
    p.lastTouch = null; p.shotBy = null; p.kind = 'rebound'; p.reboundT = M.t;
    return true;
  }
  function rig(gl, dt) {
    const hk = gl.rig.hk || (gl.rig.hk = { mode: 'goalie' });
    hk.state = gl.state; hk.dy = gl.track ? gl.track.y - gl.y : 0;
    gl.rig.update(dt, { x: gl.x, y: gl.y, z: 0, vx: 0, vy: gl.vy || 0, facing: gl.facing, pose: gl.state === 'celebrate' ? 'cheer' : null, expr: gl.state === 'blasted' ? 'wince' : null, down: gl.state === 'blasted' ? Math.min(1, gl.stateT * 3) * (1 - Math.max(0, gl.stateT - .9) * 3) : 0 });
  }
  return { update, test, scale, reactTime };
})();

// ---- 25-ai.js ----
/* ---- AI: team roles (carrier, support, point; pressure, cover, home; chase), decisions on a cadence, steering between ---- */
const AI = (() => {
  const C = Rink.C;
  const opps = s => M.skaters.filter(o => o.team !== s.team && o.state !== 'bin' && o.state !== 'fight');
  const mates = s => M.skaters.filter(o => o.team === s.team && o !== s && o.state !== 'bin' && o.state !== 'fight');
  const laneBlock = (s, x, y, r = 14) => opps(s).filter(o => U.segDist(o.x, o.y, s.x, s.y, x, y) < r).length;
  const into = side => -Rink.outDir(side);
  function skillOf(team) {
    const dev = team === 0 ? T.aiSkillHome : T.aiSkillAway; if (dev >= 0) return dev;
    if (M.aiSkill) return M.aiSkill[team];
    return .55;
  }
  function fresh(s) { return { t: RNG.sim() * .2, target: [s.x, s.y], turbo: false, act: null, holdShoot: 0, skill: skillOf(s.team), errK: 1, role: '', wait: 0 }; }
  /** what a CPU skater wants this step: { mx, my, turbo, shoot (held), lob (held), aim, press: {} } */
  function intent(s, dt) {
    const ai = s.ai || (s.ai = fresh(s));
    ai.skill = skillOf(s.team); ai.errK = lerp(1.6, .8, ai.skill);
    const it = { mx: 0, my: 0, turbo: false, shoot: false, lob: false, aim: null, press: {} };
    if (M.freezeAI && !M.attract) return it;
    ai.t -= dt;
    if (s.scripted) { ai.target = s.scripted; ai.t = 1; }
    else if (ai.t <= 0) { ai.t = lerp(.3, .12, ai.skill) * (.8 + RNG.sim() * .4); decide(s, ai); }
    const [tx, ty] = ai.target, dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    if (d > (ai.arrive || 5)) { const k = Math.min(1, d / 26); it.mx = dx / d * k; it.my = dy / d * k; }
    else if (ai.face !== undefined) { it.mx = Math.cos(ai.face) * .2; it.my = Math.sin(ai.face) * .2; }
    it.turbo = ai.turbo && (s.turbo > .25 || s.items.hotsauce > 0 || M.kaboomT[s.team] > 0);
    if (ai.act && (ai.wait -= dt) <= 0) { it.press[ai.act] = true; if (ai.aimAt) it.aim = ai.aimAt; it.passTo = ai.passTo; ai.act = null; ai.aimAt = null; }
    if (ai.holdShoot > 0) { it.shoot = true; ai.holdShoot -= dt; }
    if (ai.holdLob > 0) { it.lob = true; ai.holdLob -= dt; }
    return it;
  }
  function decide(s, ai) {
    const p = M.puck, own = p.owner, att = Skater.attackGoal(s.team), def = Skater.ownGoal(s.team), iA = into(att.side), iD = into(def.side);
    ai.turbo = false; ai.arrive = 5; ai.face = undefined; ai.role = '';
    if (M.phase !== 'play' && M.phase !== 'shootout') { ai.target = [s.x, s.y]; return; }
    if (own === s) return carrier(s, ai, att, iA);
    // a pass on its way: meet it, and one-time it near the net
    if (p.passTo === s && !own) {
      const lead = .15; ai.target = [p.x + p.vx * lead, p.y + p.vy * lead]; ai.role = 'receive';
      const dg = Math.hypot(att.x - s.x, att.y - s.y), dp = Math.hypot(p.x - s.x, p.y - s.y);
      if (dg < 190 && (s.x - att.x) * iA > 10 && dp < 80 && RNG.sim() < .6 + ai.skill * .35) { ai.act = 'shoot'; ai.wait = 0; }
      return;
    }
    // power-ups: a skater not in the play detours for one
    if (T.aiItemGreed > 0 && M.items.length) {
      const it = M.items.find(i => !i.held && Math.hypot(i.x - s.x, i.y - s.y) < T.aiItemGreed);
      const carrierNear = own && Math.hypot(own.x - s.x, own.y - s.y) < 60;
      if (it && !carrierNear && (!own || own.team === s.team || s.ai.role === 'home')) { ai.target = [it.x, it.y]; ai.turbo = true; ai.role = 'item'; if (RNG.sim() < .7) return; }
    }
    // the bear: chapter 4's "hunt the bear" sends a home skater at Polar Pete
    if (M.huntBear && s.team === 0 && M.mascot && !M.mascot.down && s.slot === 2 && !own) { ai.target = [M.mascot.x, M.mascot.y]; ai.turbo = true; ai.act = Math.hypot(M.mascot.x - s.x, M.mascot.y - s.y) < 30 ? 'shoot' : null; return; }
    // an enforcer with a grudge skates at its target (then Fight.watch drops the gloves)
    if (s.def.fgt >= 4 && M.fights < T.fightMax && (!own || own.team !== s.team)) {
      let tgt = null, best = M.challengy ? 30 : 45;
      for (const id in s.grudge) if (s.grudge[id] >= best) { const o = M.byId[id]; if (o && Skater.free(o) && !o.off) { best = s.grudge[id]; tgt = o; } }
      if (tgt) { ai.role = 'grudge'; ai.target = [tgt.x, tgt.y]; ai.turbo = true; return; }
    }
    if (!own) return loose(s, ai, att, def, iA, iD);
    if (own.team === s.team) return support(s, ai, own, att, iA);
    return defend(s, ai, own, def, iD);
  }
  function carrier(s, ai, att, iA) {
    ai.role = 'carrier';
    const dg = Math.hypot(att.x - s.x, att.y - s.y), front = (s.x - att.x) * iA, blockers = laneBlock(s, att.x, att.y, 12);
    const twister = s.def.look && s.def.look.twister && M.boss && front > 0 && dg < 260;
    if (twister && !s.twisterDone && RNG.sim() < .33 && s.state === 'skate') { s.twisterDone = true; s.twisterT = .6; Bus.emit('twister', { by: s.id, team: s.team }); ai.target = [s.x, s.y]; return; }
    if (M.phase === 'shootout' && dg < 95 && s.cool.deke <= 0 && !s.soDeke && RNG.sim() < .45) { s.soDeke = true; ai.act = 'deke'; ai.wait = 0; return; }
    // the shot
    if (front > 14 && dg < T.aiShootRange && Math.abs(s.y - C.y) < 130 && blockers < 2 && s.cool.shot <= 0) {
      const wrist = dg < 110 || RNG.sim() < .55;
      ai.holdShoot = wrist ? .08 : .2 + T.slapCharge * (M.kaboomT[s.team] > 0 ? .55 : .5 + RNG.sim() * .5); s.cool.shot = 1.2; ai.target = [s.x + Math.cos(s.facing) * 20, s.y + Math.sin(s.facing) * 20];
      if (M.kaboomT[s.team] > 0 && !wrist) ai.holdShoot = .2 + T.slapCharge / 2 + .05;
      return;
    }
    // pressured: pass to an open mate, deke, or carry away
    const press = opps(s).find(o => Math.hypot(o.x - s.x, o.y - s.y) < 30 && Math.abs(U.angDiff(Math.atan2(o.y - s.y, o.x - s.x), s.facing)) < 1.2);
    const open = mates(s).filter(m => laneBlock(s, m.x, m.y, 12) === 0).sort((a, b) => Math.hypot(a.x - att.x, a.y - att.y) - Math.hypot(b.x - att.x, b.y - att.y));
    const callFor = mates(s).find(m => m.callT > 0 && laneBlock(s, m.x, m.y, 12) === 0);
    if (callFor) { ai.act = 'pass'; ai.passTo = callFor; ai.wait = 0; callFor.callT = 0; return; }
    const tactic = M.tactic && M.tactic[s.team];
    if (press) {
      if (open.length && RNG.sim() < .65 + (tactic === 'finesse' ? .25 : 0)) { ai.act = laneBlock(s, open[0].x, open[0].y, 18) ? 'lob' : 'pass'; ai.passTo = open[0]; ai.wait = lerp(.25, .05, ai.skill); return; }
      if (s.cool.deke <= 0 && RNG.sim() < .4 * s.def.hnd / 3) { ai.act = 'deke'; ai.wait = 0; return; }
      const a = s.facing + (RNG.sim() < .5 ? 1.2 : -1.2); ai.target = [s.x + Math.cos(a) * 50, s.y + Math.sin(a) * 50]; return;
    }
    // a cross-crease feed: a mate in the slot or at the far post, the lane open
    const feed = dg < 230 && open.find(m => Math.hypot(m.x - att.x, m.y - att.y) < 120 && (m.x - att.x) * iA > 10 && Math.sign(m.y - C.y) !== Math.sign(s.y - C.y));
    if (feed && s.cool.shot <= 0 && RNG.sim() < .6 + (tactic === 'finesse' ? .2 : 0)) { ai.act = 'pass'; ai.passTo = feed; ai.wait = lerp(.15, .03, ai.skill); s.cool.shot = .6; return; }
    if (open.length && Math.hypot(open[0].x - att.x, open[0].y - att.y) + 60 < dg && (open[0].x - att.x) * iA > 10 && RNG.sim() < .3 + (tactic === 'finesse' ? .2 : 0)) { ai.act = 'pass'; ai.passTo = open[0]; ai.wait = lerp(.2, .04, ai.skill); return; }
    // carry toward the slot, slaloming around the nearest defender ahead
    let tx = att.x + iA * 60, ty = C.y + (s.y > C.y ? 18 : -18);
    const ahead = opps(s).filter(o => (o.x - s.x) * iA < 0 && Math.abs(o.y - s.y) < 40 && Math.hypot(o.x - s.x, o.y - s.y) < 90)[0];
    if (ahead) ty = ahead.y > s.y ? Math.min(ty, ahead.y - 45) : Math.max(ty, ahead.y + 45);
    ty = clamp(ty, C.y - 150, C.y + 150);
    ai.target = [tx, ty]; ai.turbo = dg > 230 && RNG.sim() < .7;
  }
  function support(s, ai, own, att, iA) {
    const ms = [s, ...mates(s).filter(m => m !== own)], closer = ms.slice().sort((a, b) => Math.abs(a.x - att.x) - Math.abs(b.x - att.x))[0];
    const deep = Math.abs(own.x - att.x) < 270, side = own.y > C.y ? -1 : 1;
    if (closer === s) { ai.role = 'support'; ai.target = deep ? [att.x + iA * 34, C.y + side * 22] : [att.x + iA * 130, C.y + side * 75]; ai.turbo = !deep; }
    else { ai.role = 'point'; ai.target = [att.x + iA * (M.tactic && M.tactic[s.team] === 'grit' ? 140 : 250), C.y + side * -40]; }
    ai.target[0] = clamp(ai.target[0], Rink.X0 + 30, Rink.X1 - 30);
  }
  function defend(s, ai, own, def, iD) {
    const ms = [s, ...mates(s)], nearest = ms.slice().sort((a, b) => Math.hypot(a.x - own.x, a.y - own.y) - Math.hypot(b.x - own.x, b.y - own.y));
    if (nearest[0] === s) {
      ai.role = 'pressure';
      const lead = .3 * (1 - .4 * (1 - ai.skill)); ai.target = [own.x + own.vx * lead, own.y + own.vy * lead]; ai.turbo = Math.hypot(own.x - s.x, own.y - s.y) > 60;
      const d = Math.hypot(own.x - s.x, own.y - s.y);
      if (d < 26 && s.cool.check <= 0 && s.def.hit >= 3 && RNG.sim() < T.aiAggression * (M.tactic && M.tactic[s.team] === 'grit' ? 1.3 : 1) * (M.challengy && s.team === 1 ? 1.4 : 1)) { ai.act = 'shoot'; ai.wait = lerp(.3, .05, ai.skill); }
      else if (d < 20 && s.cool.poke <= 0) { ai.act = 'deke'; ai.wait = lerp(.3, .05, ai.skill); }
      return;
    }
    if (nearest[1] === s) {   // cover: the most dangerous rival without the puck
      ai.role = 'cover';
      const foes = opps(s).filter(o => o !== own).sort((a, b) => Math.hypot(a.x - def.x, a.y - def.y) - Math.hypot(b.x - def.x, b.y - def.y)), f = foes[0];
      if (f) { ai.target = [lerp(f.x, def.x, .3), lerp(f.y, def.y, .3)]; return; }
    }
    ai.role = 'home'; ai.target = [def.x + iD * 45, lerp(C.y, own.y, .3)];
  }
  function loose(s, ai, att, def, iA, iD) {
    const p = M.puck, px1 = p.x + p.vx * .35, py1 = p.y + p.vy * .35, eta = o => Math.hypot(o.x - px1, o.y - py1) / (Skater.vmax(o, false) * .9);
    const mine = [s, ...mates(s)].sort((a, b) => eta(a) - eta(b)), theirs = opps(s).sort((a, b) => eta(a) - eta(b));
    if (mine[0] === s) { ai.role = 'chase'; ai.target = [px1, py1]; ai.turbo = Math.hypot(px1 - s.x, py1 - s.y) > 50; ai.arrive = 1; return; }
    const win = !theirs.length || eta(mine[0]) < eta(theirs[0]);
    if (win) return support(s, ai, mine[0], att, iA);
    if (mine[1] === s) { ai.role = 'home'; ai.target = [def.x + iD * 45, lerp(C.y, py1, .3)]; return; }
    ai.role = 'cover'; ai.target = [lerp(px1, def.x, .5), lerp(py1, def.y, .5)];
  }
  /** a CPU goalie in a shootout or a manual-goalie helper: nothing (Goalie.update positions them) */
  return { intent, fresh, skillOf, laneBlock };
})();

// ---- 26-match.js ----
/* ---- Match: the game of hockey. Entities, phases (intro, faceoff, play, stoppage, goal, replay, period end, intermission,
 * overtime, shootout, fight, final), the clock, stats, three stars and objectives. Match.step(dt) runs one fixed step ---- */
const Match = (() => {
  const C = Rink.C;
  const DIFF = { Rookie: [.35, .06, -.03], Pro: [.55, .02, -.01], 'All-Star': [.75, 0, 0], Legend: [.95, -.02, .01] };
  const PERIOD_LEN = { '1:00': 60, '1:30': 90, '2:00': 120, '3:00': 180, '4:00': 240 };
  /** cfg: { home, away, arena, periods, len, ot, shootout, intros, replays, flood, difficulty, cheats, objectives, chapter, humans:
   *  [{ input, team, name, color, remote }], attract, practice, session, seed, showcase, boss } */
  function create(cfg) {
    const m = { cfg, t: 0, phase: 'none', phaseT: 0, period: 1, clock: cfg.len, score: [0, 0], shots: [0, 0], hits: [0, 0], fo: [0, 0], flip: 0,
      boom: [0, 0], kaboomT: [0, 0], kabooms: [0, 0], boost: [0, 0], sinBin: [], fight: null, fights: 0, lastFightClock: 1e9, items: [], hazards: [], stats: {}, goals: [],
      teams: [TEAMS[cfg.home], TEAMS[cfg.away]], arena: ARENAS[cfg.arena], humans: [], skaters: [], goalies: [], refs: [], objectives: [], tactic: [cfg.tactic || null, null],
      aiSkill: [0, 0], goalieOffset: [0, 0], cheats: Object.assign({}, cfg.cheats || {}), clips: [], ot: false, so: null, events: [], highlights: [] };
    M = m; m.attract = !!cfg.attract;
    Rigs.bigHeads = !!(cfg.cheats && cfg.cheats.bigheads) || (cfg.keepRigFlags ? Rigs.bigHeads : false); Rigs.retro = !!(cfg.cheats && cfg.cheats.retro) || (cfg.keepRigFlags ? Rigs.retro : false); if (cfg.cheats && cfg.cheats.glowpuck) Rigs.glow = true; else if (!cfg.keepRigFlags) Rigs.glow = false;
    m.huntBear = !!cfg.huntBear; m.challengy = !!(cfg.chapter === 3); m.boss = !!cfg.boss;
    RNG.reseed(cfg.seed || (Date.now() >>> 0));
    const diff = DIFF[cfg.difficulty || S().difficulty || 'Pro'] || DIFF.Pro, step = cfg.diffStep || 0;
    const keys = Object.keys(DIFF), di = clamp(keys.indexOf(cfg.difficulty || S().difficulty || 'Pro') + step, 0, 3), dr = DIFF[keys[di]];
    const humanTeams = new Set((cfg.humans || []).map(h => h.team));
    for (const t of [0, 1]) {
      const cpuSide = !humanTeams.has(t);
      m.aiSkill[t] = cpuSide ? dr[0] : diff[0];
      m.goalieOffset[t] = cpuSide ? dr[1] : diff[2];
    }
    if (cfg.aiSkill) m.aiSkill = cfg.aiSkill.slice();
    // the skaters and goalies
    [cfg.home, cfg.away].forEach((tid, team) => {
      const td = TEAMS[tid];
      td.skaters.forEach((d, k) => {
        let def = Object.assign({}, d);
        if (cfg.louLoose && tid === 'muskrats' && k === 2) def.fgt = Math.min(5, def.fgt + 1);
        if (cfg.louIce && tid === 'muskrats' && k === 2) def.pas = Math.min(5, def.pas + 1);
        const s = { id: 's' + (team * 3 + k), team, slot: k, def, x: C.x, y: C.y, z: 0, vx: 0, vy: 0, facing: team ? PI : 0, state: 'skate', stateT: 0, turbo: 1, turboIdle: 0,
          ctrl: 'cpu', items: {}, grudge: {}, cool: { pickup: 0, check: 0, deke: 0, poke: 0, chirp: 0, shot: 0, gloves: 0 }, shootHold: 0, charge: 0, winding: false, oneTimer: 0, receiving: 0,
          phaseA: RNG.sim() * 6, rig: Rigs.skater(def, tid, team === 0), name: def.nick || def.name, act: null, callT: 0, holdLob: 0, chirpT: 0, chirpText: '' };
        s.ai = AI.fresh(s); m.skaters.push(s);
        m.stats[s.id] = { goals: 0, assists: 0, shots: 0, hits: 0, bigHits: 0, takeaways: 0, fightsWon: 0, turbo: 0, topShot: 0, points: 0 };
      });
      const gd = td.goalie, gl = { id: 'g' + team, team, def: gd, x: C.x, y: C.y, vy: 0, facing: 0, state: 'ready', stateT: 0, size: gd.size, rfx: gd.rfx, reb: gd.reb, rig: Rigs.goalie(gd, tid, team === 0), name: gd.nick || gd.name, track: null };
      if (gd.look && gd.look.boss) gl.bossScale = 1.35;
      m.goalies.push(gl); m.stats[gl.id] = { saves: 0, against: 0, goals: 0, assists: 0, shots: 0, hits: 0, bigHits: 0, fightsWon: 0 };
    });
    m.refs = [{ x: C.x, y: C.y - 30, rig: Rigs.referee(false), vx: 0, vy: 0, facing: PI / 2 }, { x: C.x - 120, y: C.y - 150, rig: Rigs.referee(true), vx: 0, vy: 0, facing: PI / 2 }];
    m.puck = { x: C.x, y: C.y, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null, prevTouch: null, touchT: 0, held: false, inNet: false, dead: false, onFire: false };
    m.byId = {}; for (const s of m.skaters) m.byId[s.id] = s; for (const g of m.goalies) m.byId[g.id] = g;
    m.teamOf = id => { const e = m.byId[id]; return e ? e.team : -1; };
    m.goal = side => goal(side); m.stoppage = (k, dot) => stoppage(k, dot);
    // the humans
    (cfg.humans || []).forEach((h, i) => {
      const s = m.skaters.find(x => x.team === h.team && x.ctrl === 'cpu' && (h.slot === undefined || x.slot === h.slot)) || m.skaters.find(x => x.team === h.team && x.ctrl === 'cpu');
      const hu = Object.assign({ i, s: null, aimT: -9, lastPt: null, lobT: 0, noAuto: !!cfg.practice }, h); m.humans.push(hu);
      if (s) { s.ctrl = 'human'; s.human = hu; hu.s = s; }
    });
    m.objectives = (cfg.objectives || []).map(o => Object.assign({ n: 0, done: false }, o));
    Rink.resetGlass(); Rink.clearScuff(1);
    Items.reset(m); Boom.reset(m); Replay.reset(); Hits.reset(); Fight.reset();
    m.map = Rink.mapFor(cfg.arena, TEAMS[cfg.home].logo);
    return m;
  }
  /* ---- events into stats, objectives and BOOM ---- */
  function wire() {
    Bus.on('*', e => {
      if (!M) return;
      for (const o of M.objectives) if (o.on === e.type && !o.done && (!o.where || o.where(e, M))) { o.n++; if (o.n >= (o.need || 1)) { o.done = true; Bus.emit('objective', { id: o.id, text: o.text }); } }
    });
    Bus.on('hit', e => { if (!M) return; const st = M.stats[e.by]; if (st) { st.hits++; if (e.big) st.bigHits++; } M.hits[M.teamOf(e.by)]++; });
    Bus.on('shot', e => { if (!M) return; const st = M.stats[e.by]; if (st) st.topShot = Math.max(st.topShot, e.speed); });
    Bus.on('fight_end', e => { if (!M || !e.winner) return; const st = M.stats[e.winner]; if (st) st.fightsWon++; });
  }
  const skaterOf = id => M && M.byId[id];
  /* ---- placing everyone for a faceoff at a dot ---- */
  function setupFaceoff(dot) {
    const p = M.puck; dot = dot || [C.x, C.y];
    Object.assign(p, { x: dot[0], y: dot[1], z: 22, vx: 0, vy: 0, vz: 0, owner: null, held: true, inNet: false, dead: false, onFire: false, passTo: null, shotBy: null, lastTouch: null });
    for (const t of [0, 1]) {
      const own = Skater.ownGoal(t), dir = -Rink.outDir(own.side);   // from own goal toward the center: the team's back is toward its own goal
      const list = M.skaters.filter(s => s.team === t && s.state !== 'bin' && !s.off);
      const center = list.find(s => s.slot === 0) || list[0];
      list.forEach(s => {
        let x, y;
        if (s === center) { x = dot[0] - dir * 9; y = dot[1]; }
        else if (s.slot === 1) { x = dot[0] - dir * 24; y = dot[1] + (t ? -1 : 1) * 40; }
        else { x = dot[0] - dir * 70; y = dot[1] + (t ? 1 : -1) * 30; }
        const k = Rink.sdf(x, y); if (k > -12) { const n = Rink.normal(x, y); x -= n[0] * (k + 12); y -= n[1] * (k + 12); }
        Object.assign(s, { x, y, vx: 0, vy: 0, facing: Math.atan2(dot[1] - y, dot[0] - x), state: s.state === 'bin' ? 'bin' : 'skate', stateT: 0, shootHold: 0, winding: false, charge: 0, oneTimer: 0, act: null });
        if (s === center) s.facing = dir > 0 ? 0 : PI;
      });
    }
    for (const g of M.goalies) { const og = Skater.ownGoal(g.team); g.x = og.x - Rink.outDir(og.side) * 8; g.y = C.y; g.state = 'ready'; g.track = null; }
    M.refs[0].x = dot[0]; M.refs[0].y = dot[1] - 14; M.refs[1].x = dot[0] + 60; M.refs[1].y = C.y - 170;
    M.foDot = dot; M.foDrop = .6 + RNG.sim() * .6; M.foWin = null; M.foPress = [null, null];
    setPhase('faceoff');
    if (M.huntBear !== undefined || true) Items.atStoppage();
  }
  function setPhase(ph, t = 0) { M.phase = ph; M.phaseT = t; Bus.emit('phase', { phase: ph }); }
  /* ---- the human's intent from their controller, keyboard and mouse ---- */
  function humanIntent(h, dt) {
    const I = h.input, s = h.s, it = { mx: 0, my: 0, turbo: false, shoot: false, lob: false, aim: null, press: {} };
    if (h.remote) return s ? Net.intentFor(h) : it;
    if (!I || !s) return it;
    const mv = I.move(), g = game.view && game.view.screenDirToGround ? game.view.screenDirToGround(mv[0], mv[1]) : mv;
    it.mx = g[0]; it.my = g[1]; it.stickY = mv[1];
    it.turbo = I.down('turbo'); it.shoot = I.down('shoot'); it.lob = I.down('lob');
    for (const a of ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch']) if (I.pressed(a)) it.press[a] = true;
    // aim: the mouse reticle (moved in the last 2 s) or the right stick
    const pt = I === game.input ? I.pointer() : null;
    if (pt && (!h.lastPt || Math.hypot(pt[0] - h.lastPt[0], pt[1] - h.lastPt[1]) > 1)) { h.aimT = M.t; h.lastPt = pt.slice(); }
    if (I.lastDevice === 'mouse' && M.t - h.aimT < 2 && game.mouseGround) { const w = game.mouseGround(); if (w) it.aim = [w[0] !== undefined ? w[0] : w.x, w[1] !== undefined ? w[1] : w.y]; }
    else if (I.padAim) { const a = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); it.aim = [s.x + a[0] * 140, s.y + a[1] * 140]; }
    h.reticle = it.aim;
    return it;
  }
  const passIncoming = s => { const p = M.puck; if (p.owner || p.held) return false; if (p.passTo === s) return true; const d = Math.hypot(p.x - s.x, p.y - s.y), sp = Math.hypot(p.vx, p.vy); return d < 60 && sp > 80 && ((s.x - p.x) * p.vx + (s.y - p.y) * p.vy) / (d * sp || 1) > .9; };
  /* ---- turning an intent into actions ---- */
  function applyIntent(s, it, dt) {
    const p = M.puck, has = p.owner === s;
    s.holdTurbo = it.turbo; s.lastAim = it.aim;
    if (it.press.chirp && s.cool.chirp <= 0) chirp(s);
    if (s.human && (it.press.switch || (it.press.pass && !has && !(p.owner && p.owner.team === s.team)))) { if (switchSkater(s.human, it.press.switch)) return; }
    if (!Skater.free(s) || s.state === 'check') { s.shootHold = 0; s.winding = false; return; }
    if (M.phase !== 'play' && M.phase !== 'shootout') return;
    if (has) {
      if (s.twisterT > 0) return;
      if (Math.abs(it.stickY || 0) > .3) { s.stickMem = it.stickY; s.stickMemT = M.t; }   // the aim survives letting go of the stick as the shot fires
      if (it.press.pass) { Skater.pass(s, { aim: it.aim, to: it.passTo, dir: Math.hypot(it.mx, it.my) > .3 ? Math.atan2(it.my, it.mx) : undefined }); return; }
      if (it.press.lob) { Skater.pass(s, { aim: it.aim, to: it.passTo, saucer: true, dir: Math.hypot(it.mx, it.my) > .3 ? Math.atan2(it.my, it.mx) : undefined }); return; }
      if (it.press.deke) { Skater.deke(s, Math.hypot(it.mx, it.my) > .3 ? (U.angDiff(Math.atan2(it.my, it.mx), s.facing) > 0 ? 1 : -1) : 0); return; }
      if (it.shoot) {
        s.shootHold += dt;
        if (s.shootHold > .18) { s.winding = true; s.charge = Math.min(1, s.charge + dt / T.slapCharge * (M.kaboomT[s.team] > 0 ? 2 : 1)); }
      } else if (s.shootHold > 0) {
        const kind = s.winding ? 'slap' : 'wrist', ch = s.charge;
        Skater.shoot(s, kind, ch, { aim: it.aim, stickY: s.human ? (Math.abs(it.stickY || 0) > .3 ? it.stickY : M.t - (s.stickMemT || -9) < .3 ? s.stickMem : 0) : 0, turbo: it.turbo && s.turbo > 0 });
        if (kind === 'slap') Bus.emit('slap', { by: s.id, team: s.team, charge: ch });
      }
      return;
    }
    s.shootHold = 0; s.winding = false; s.charge = 0;
    // without the puck: one-timers, checks, pokes, calls for the pass, gloves
    if ((it.press.shoot || it.shoot) && passIncoming(s)) { s.oneTimer = .35; if (s.human && it.press.shoot) Bus.emit('onetimer_ready', { by: s.id }); }
    else if (it.press.shoot) Skater.check(s) && Bus.emit('check_start', { by: s.id });
    if (it.press.deke) Skater.poke(s);
    if (it.press.pass && p.owner && p.owner.team === s.team && p.owner.ctrl === 'cpu' && s.human) { s.callT = 1.2; Bus.emit('call', { by: s.id }); if (p.owner.ai) { p.owner.ai.t = Math.min(p.owner.ai.t, .05); } }
    // gloves: hold lob for 0.5 s near a rival with a grudge
    if (it.lob && !has) {
      s.holdLob += dt;
      if (s.holdLob > .5) { s.holdLob = -99; Fight.challenge(s); }
    } else if (!it.lob) s.holdLob = 0;
  }
  /** a human takes over another skater of their team: the one nearest the puck (or the next, with the switch button) */
  function switchSkater(h, cycle) {
    const cur = h.s, p = M.puck, free = M.skaters.filter(x => x.team === h.team && x !== cur && x.ctrl === 'cpu' && x.state !== 'bin' && !x.off);
    if (!free.length) return false;
    const pick = cycle ? free.sort((a, b) => a.slot - b.slot).find(x => x.slot > cur.slot) || free[0] : free.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (!pick) return false;
    give(h, pick); A.sfx('tock'); return true;
  }
  function give(h, s) { if (h.s) { h.s.ctrl = 'cpu'; h.s.human = null; h.s.ai = AI.fresh(h.s); } h.s = s; s.ctrl = h.remote ? 'remote' : 'human'; s.human = h; }
  /** a lone human follows the play: a completed pass to a CPU teammate, or the defense when the puck is far away */
  function autoSwitch() {
    const p = M.puck;
    for (const h of M.humans) {
      const s = h.s; if (!s || h.noAuto) continue;
      const teamHumans = M.humans.filter(x => x.team === h.team).length;
      if (p.passTo && p.passTo.team === h.team && p.passTo.ctrl === 'cpu' && teamHumans === 1 && p.passFrom === s) { give(h, p.passTo); continue; }
      if (p.owner && p.owner.team === h.team && p.owner.ctrl === 'cpu' && teamHumans === 1 && p.owner.receivedFrom === s.id) { give(h, p.owner); continue; }
      if (!p.owner || p.owner.team === h.team || teamHumans > 1) continue;
      const li = s.lastIntent; if (li && Math.hypot(li.mx || 0, li.my || 0) > .3) { h.swT = 0; continue; }   // never swap skaters out from under a player who is steering
      if (!Skater.free(s)) { const alt = M.skaters.filter(x => x.team === h.team && x.ctrl === 'cpu' && Skater.free(x)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (alt) give(h, alt); continue; }
      const near = M.skaters.filter(x => x.team === h.team && x.ctrl === 'cpu' && Skater.free(x)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (near && Math.hypot(near.x - p.x, near.y - p.y) + 70 < Math.hypot(s.x - p.x, s.y - p.y) && (h.swT = (h.swT || 0) + 1) > 30) { give(h, near); h.swT = 0; }
    }
  }
  function chirp(s) {
    const foes = M.skaters.filter(o => o.team !== s.team && Math.hypot(o.x - s.x, o.y - s.y) < 120).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y));
    s.cool.chirp = 4; const line = U.pick(RNG.fx, TEXT.chirps); s.chirpT = 2.2; s.chirpText = line;
    const target = foes[0];
    if (target) { target.grudge[s.id] = Math.min(100, (target.grudge[s.id] || 0) + 15); if (target.ai && s.human && target.def.fgt >= 4) target.challengeBias = (target.challengeBias || 0) + .2; }
    Bus.emit('chirp', { by: s.id, team: s.team, target: target ? target.id : null, line });
  }
  /* ---- one skater's step: timers, intent, skating, states, rig ---- */
  function skaterStep(s, dt) {
    for (const k in s.cool) s.cool[k] = Math.max(0, s.cool[k] - dt);
    for (const k of ['hotsauce', 'tape', 'poutine', 'cocoa']) if (s.items[k] > 0) s.items[k] = Math.max(0, s.items[k] - dt);
    s.oneTimer = Math.max(0, s.oneTimer - dt); s.receiving = Math.max(0, s.receiving - dt); s.callT = Math.max(0, s.callT - dt); s.chirpT = Math.max(0, s.chirpT - dt);
    s.slowT = Math.max(0, (s.slowT || 0) - dt); s.stateT += dt;
    if (s.act) { s.act.t += dt; if (s.act.t > .45) s.act = null; }
    if (s.off) return;
    if (s.state === 'bin') { return; }
    if (s.state === 'fight') return;
    // timed states
    const st = s.state;
    if (st === 'check' && s.stateT > .3) s.state = 'skate';
    if (st === 'deke' && s.stateT > .45) { s.state = 'skate'; s.spin = false; }
    if (st === 'stun' && s.stateT > (s.stunT || .3)) s.state = 'skate';
    if (st === 'down' && s.stateT > (s.downT || 1.4)) { s.state = 'getup'; s.stateT = 0; }
    if (st === 'getup' && s.stateT > .5) s.state = 'skate';
    if (st === 'slip' && s.stateT > 1.2) { s.state = 'getup'; s.stateT = 0; }
    if (st === 'frozen' && s.stateT > 3) { s.state = 'skate'; Items.popOut(s); }
    if (st === 'buried' && s.stateT > 1.5) s.state = 'skate';
    if (st === 'celebrate' && s.stateT > 3) s.state = 'skate';
    if (s.twisterT > 0) { s.twisterT -= dt; s.spinA = (s.spinA || 0) + dt * 18; if (s.twisterT <= 0 && M.puck.owner === s) { const p = Skater.shoot(s, 'wrist', 0, {}); p.curl = (s.y > C.y ? -1 : 1) * 1.2; p.twister = true; } }
    // the intent
    let it;
    if (s.ctrl === 'cpu' || (M.attract && s.ctrl !== 'remote')) it = AI.intent(s, dt);
    else if (s.human) it = humanIntent(s.human, dt);
    else it = { mx: 0, my: 0, press: {} };
    if ((M.cheats.freezeAI && s.ctrl === 'cpu' && !M.attract) || s.dummy) it = { mx: 0, my: 0, press: {} };
    if (M.phase === 'play' || M.phase === 'shootout') applyIntent(s, it, dt);
    s.lastIntent = it;
    // turbo
    const inf = s.items.hotsauce > 0 || M.kaboomT[s.team] > 0 || (M.cheats.turbo && s.ctrl !== 'cpu') || (M.attract);
    const moving = Math.hypot(s.vx, s.vy) > 20, useT = it.turbo && moving && (s.turbo > 0 || inf);
    if (useT && !inf) { s.turbo = Math.max(0, s.turbo - T.turboDrain * dt); s.turboIdle = 0; M.stats[s.id].turbo += dt; }
    else { s.turboIdle += dt; if (s.turboIdle > .6) s.turbo = Math.min(1, s.turbo + T.turboRegen * dt); }
    if (s.items.cocoa > 0) s.turbo = 1;
    // skating
    const locked = ['down', 'getup', 'stun', 'slip', 'frozen', 'buried', 'celebrate'].includes(s.state) || M.phase === 'faceoff' || (M.phase !== 'play' && M.phase !== 'shootout' && M.phase !== 'goal' && M.phase !== 'stoppage');
    if (s.state === 'down' || s.state === 'slip') { const k = Math.exp(-dt * 2.2); s.vx *= k; s.vy *= k; }
    else if (locked) { const k = Math.exp(-dt * (M.phase === 'faceoff' ? 12 : 3)); s.vx *= k; s.vy *= k; if (M.phase === 'goal' && s.state === 'celebrate' && s.team === M.lastGoalTeam) { /* glide in celebration */ } }
    else if (s.state !== 'deke') {
      if (M.phase === 'goal' || M.phase === 'stoppage') { const k = Math.exp(-dt * 2); s.vx *= k; s.vy *= k; }
      else { const ev = Skater.skateStep(s, it.mx, it.my, useT, dt); if (ev === 'stop') { Bus.emit('stop', { by: s.id, x: s.x, y: s.y, side: s.stopSide }); Rink.scuffAt(s.x, s.y, .12); } }
    } else { const k = Math.exp(-dt * 1.5); s.vx *= k; s.vy *= k; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    const sp = Math.hypot(s.vx, s.vy);
    if (sp > 20) Rink.scuffAt(s.x, s.y, .0025 * sp / 132 * 2, M.kaboomT[s.team] > 0 ? .05 * dt * 60 : 0);
    // poke reach
    if (s.act && s.act.kind === 'poke' && !s.pokeHit && s.act.t > .1 && s.act.t < .3) {
      const p = M.puck, c = Math.cos(s.facing), n = Math.sin(s.facing), bx = s.x + c * 18, by = s.y + n * 18;
      if (p.owner && p.owner.team !== s.team && Math.hypot(p.x - bx, p.y - by) < 10) {
        s.pokeHit = true;
        const ok = !(p.owner.items.tape > 0) && RNG.sim() < .55 + .08 * (s.def.hnd - p.owner.def.hnd) + (p.owner.state === 'deke' && p.owner.stateT < .3 ? -.4 : 0);
        Bus.emit('poke', { by: s.id, ok, team: s.team, victim: p.owner.id });
        if (ok) { const o = p.owner; Skater.release(o, c * 110 + o.vx * .3, n * 110 + o.vy * .3, 0, 'poke'); p.lastTouch = s; M.stats[s.id].takeaways++; s.cool.pickup = 0; }
        else s.slowT = .3;
      }
    }
    // stride phase and the rig
    rigStep(s, dt);
  }
  function rigStep(s, dt) {
    const sp = Math.hypot(s.vx, s.vy), p = M.puck, has = p.owner === s;
    s.phaseA += dt * (sp / 22) * (s.holdTurbo ? 1.25 : 1);
    const hk = s.rig.hk || (s.rig.hk = { mode: 'skate' });
    hk.mode = s.state === 'fight' ? 'none' : 'skate'; hk.phase = s.phaseA; hk.speed = sp / 150; hk.turbo = s.holdTurbo && sp > 60; hk.stop = s.state === 'stop' ? 1 : 0; hk.stopSide = s.stopSide; hk.hand = s.def.hand || 1;
    hk.cross = Math.abs(s.turning || 0) > .5 && sp > 70 ? Math.sign(s.turning) : 0; hk.carry = has; hk.charge = s.charge; hk.saucer = s.act && s.act.saucer;
    hk.stick = s.winding ? 'wind' : s.act ? s.act.kind : s.state === 'check' ? 'check' : M.phase === 'faceoff' && Math.hypot(s.x - M.foDot[0], s.y - M.foDot[1]) < 14 ? 'faceoff' : s.state === 'celebrate' ? s.celebrate : 'idle';
    hk.t = s.act ? s.act.t : s.stateT;
    let down = 0, pose = null, expr = null, flip = 0;
    if (s.state === 'down') down = Math.min(1, s.stateT * 4);
    else if (s.state === 'getup') down = Math.max(0, 1 - s.stateT * 2);
    else if (s.state === 'slip') { down = Math.min(1, s.stateT * 6); flip = Math.min(.3, s.stateT); }
    if (s.state === 'celebrate') { pose = s.celebrate === 'pump' || s.celebrate === 'raised' ? 'cheer' : s.celebrate === 'slide' ? 'kneel' : null; expr = 'shout'; }
    if (s.state === 'stun') expr = 'wince';
    if (s.chirpT > 0) expr = 'shout';
    if (s.state === 'deke' && s.spin) s.spinA = (s.spinA || 0) + dt * 14;
    s.rig.spin = (s.state === 'deke' && s.spin) || s.twisterT > 0 ? (s.spinA || 0) % TAU : 0;
    if (s.state !== 'fight') s.rig.update(dt, { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, facing: s.facing, down, pose, expr, hurt: s.state === 'stun', flip: flip || undefined, lean: s.state === 'check' ? .3 : undefined });
  }
  /* ---- bodies: pushes, accidental hits, boards ---- */
  function bodies(dt) {
    const L = M.skaters.filter(s => !s.off && s.state !== 'bin' && s.state !== 'fight');
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = 14;
      if (d >= R || d < .01) continue;
      const nx = dx / d, ny = dy / d, ma = a.def.build === 'bulky' ? 1.35 : 1, mb = b.def.build === 'bulky' ? 1.35 : 1, over = R - d;
      a.x -= nx * over * mb / (ma + mb); a.y -= ny * over * mb / (ma + mb); b.x += nx * over * ma / (ma + mb); b.y += ny * over * ma / (ma + mb);
      const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rv > 0) {
        if (a.team !== b.team && (a.state === 'check' || b.state === 'check')) Hits.contact(a.state === 'check' ? a : b, a.state === 'check' ? b : a, rv);
        else if (a.team !== b.team && rv > T.accidentalHit) Hits.contact(a, b, rv, true);
        const j2 = (1 + .3) * rv / (1 / ma + 1 / mb); a.vx -= j2 * nx / ma; a.vy -= j2 * ny / ma; b.vx += j2 * nx / mb; b.vy += j2 * ny / mb;
      }
    }
    for (const s of L) {
      // nets are solid
      for (const side of [0, 1]) { const gx = Rink.goalX(side), od = Rink.outDir(side), lx = (s.x - gx) * od; if (lx > -6 && lx < Rink.NETD + 6 && Math.abs(s.y - C.y) < Rink.MOUTH + 6) { if (lx < Rink.NETD / 2) { s.x = gx - od * 6; s.vx *= -.2; } else { s.x = gx + od * (Rink.NETD + 6); s.vx *= -.2; } } }
      // goalies are solid too
      for (const g of M.goalies) { const dx = s.x - g.x, dy = s.y - g.y, d = Math.hypot(dx, dy); if (d < 14 && d > .01) { s.x = g.x + dx / d * 14; s.y = g.y + dy / d * 14; const vn = s.vx * dx / d + s.vy * dy / d; if (vn < 0) { s.vx -= vn * dx / d; s.vy -= vn * dy / d; } } }
      const vx0 = s.vx, vy0 = s.vy, hit = Rink.clamp(s, 7, M.arena.snowbank ? .2 : .3, .85);
      if (hit && hit.speedIn > 0) Hits.boards(s, hit.speedIn, hit.n, Math.hypot(vx0, vy0));
    }
  }
  /* ---- phases ---- */
  function goal(side) {
    const p = M.puck, team = (1 - side) ^ M.flip;   // the team attacking this side scores
    if (M.phase !== 'play' && M.phase !== 'shootout') return;
    const by = p.lastTouch && p.lastTouch.team === team ? p.lastTouch : p.prevTouch && p.prevTouch.team === team ? p.prevTouch : null;
    p.inNet = true; p.owner = null; p.netSide = side; p.vx *= .3; p.vy *= .3;
    const kindRaw = p.shotKind || 'wrist', kind = p.onFire ? 'kaboom' : by && by.state === 'deke' || (by && by.dekeAt && M.t - by.dekeAt < 1.2) ? 'deke' : p.kind === 'rebound' ? 'rebound' : p.kind === 'deflect' ? 'deflect' : kindRaw;
    if (M.phase === 'shootout') return Shootout.scored(team, by);
    M.score[team]++;
    const assists = []; if (by) { const a = M.events.filter(e => e.type === 'pass_complete' && e.to === by.id && M.t - e.t < 8 && e.team === team).slice(-2); for (const e of a.reverse()) if (!assists.includes(e.by) && e.by !== by.id) assists.push(e.by); }
    const ppg = M.sinBin.some(b => b.s.team !== team);
    if (by) { M.stats[by.id].goals++; for (const a of assists) M.stats[a].assists++; }
    M.stats['g' + (1 - team)].against++;
    const ev = { team, by: by ? by.id : null, name: by ? by.name : TEAMS[team === 0 ? M.cfg.home : M.cfg.away].short, assists, kind, ppg, side, period: M.period, clock: M.clock, onetimer: kind === 'onetimer' };
    M.goals.push(ev); M.lastGoalTeam = team; M.lastGoal = ev;
    Bus.emit('goal', ev);
    if (by && M.stats[by.id].goals === 3) Bus.emit('hat_trick', { by: by.id, team, name: by.name });
    if (by && M.stats[by.id].goals >= 1 && M.stats[by.id].assists >= 1 && M.stats[by.id].fightsWon >= 1 && !by.hoser) { by.hoser = true; Bus.emit('hoser_hat_trick', { by: by.id, team }); }
    if (M.kaboomT[1 - team] > 0) Boom.end(1 - team);
    // the scorer celebrates, mates converge
    for (const s of M.skaters) if (s.team === team && Skater.free(s)) { s.state = 'celebrate'; s.stateT = 0; s.celebrate = s === by ? (s.def.look && s.def.look.celebrate) || ['pump', 'rifle', 'guitar', 'slide', 'raised'][U.hashStr(s.id + M.goals.length) % 5] : 'raised'; }
    M.goalies[1 - team].state = 'ready';
    Replay.markGoal();
    setPhase('goal');
    if (M.ot && !M.cfg.session) M.suddenDeath = true;
  }
  function stoppage(kind, dot) {
    if (M.phase !== 'play') return;
    M.stopKind = kind; M.stopDot = dot || [C.x, C.y]; setPhase('stoppage'); Bus.emit('whistle', { kind });
  }
  function periodName(n) { return n > M.cfg.periods ? (M.so ? 'SHOOTOUT' : 'OVERTIME') : ['1ST', '2ND', '3RD', '4TH', '5TH'][n - 1] + ' PERIOD'; }
  function endPeriod() {
    setPhase('periodEnd'); Bus.emit('period_end', { n: M.period, home: M.score[0], away: M.score[1] });
  }
  function afterPeriod() {
    const last = M.period >= M.cfg.periods;
    if (M.ot || last) {
      const tied = M.score[0] === M.score[1];
      if (M.cfg.showcase && !M.so && !M.cfg.session) return Shootout.start(true);
      if (!tied) return final();
      if (!M.ot && M.cfg.ot) { M.ot = true; M.period++; M.clock = M.cfg.session ? 60 : 120; M.flip ^= 1; Bus.emit('ot_start', {}); for (const s of M.skaters) s.turbo = 1; return setupFaceoff([C.x, C.y]); }
      if (M.cfg.shootout && !M.cfg.session) return Shootout.start(false);
      return final();
    }
    // intermission: the Flood Wagon (offered), then the next period at the other end
    M.period++; M.clock = M.cfg.len; M.flip ^= 1;
    for (const s of M.skaters) s.turbo = 1;
    Bus.emit('intermission', { n: M.period - 1 });
    if (M.cfg.flood === false || M.attract || M.cfg.session || M.cfg.practice) { Rink.clearScuff(.9); Items.refreeze(); return setupFaceoff([C.x, C.y]); }
    setPhase('intermission');
  }
  function final() {
    if (M.phase === 'final') return;
    const w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
    setPhase('final'); M.winner = w;
    for (const s of M.skaters) if (Skater.free(s) || s.state === 'skate') { s.state = 'celebrate'; s.stateT = -99; s.celebrate = s.team === w ? 'raised' : 'slump'; }
    for (const g of M.goalies) g.state = g.team === w ? 'celebrate' : 'ready';
    M.stars = threeStars();
    Bus.emit('final', { winner: w, score: M.score.slice() });
  }
  function threeStars() {
    const list = [];
    for (const s of M.skaters) { const st = M.stats[s.id]; list.push({ id: s.id, team: s.team, name: s.name, rig: s.rig, score: 3 * st.goals + 2 * st.assists + .5 * st.bigHits + 1.5 * st.fightsWon + .3 * st.shots + RNG.fx() * .01, line: st.goals + ' G  ' + st.assists + ' A  ' + st.hits + ' HITS', g: st.goals }); }
    for (const g of M.goalies) { const st = M.stats[g.id], sa = st.saves + st.against, pct = sa ? st.saves / sa : 1; list.push({ id: g.id, team: g.team, name: g.name, rig: g.rig, goalie: true, score: .12 * st.saves + 2 * (pct - .85) * 10, line: st.saves + ' SAVES  ' + (sa ? (pct).toFixed(3).replace(/^0/, '') : '1.000') + ' SV%', sv: st.saves }); }
    return list.sort((a, b) => b.score - a.score).slice(0, 3);
  }
  /* ---- the step ---- */
  function step(dt) {
    if (!M) return;
    M.t += dt; M.phaseT += dt;
    if (M.devPause) return;
    for (const h of M.humans) if (h.s && h.s.state === 'bin') { const alt = M.skaters.find(x => x.team === h.team && x.ctrl === 'cpu' && x.state !== 'bin'); if (alt) give(h, alt); }
    const ph = M.phase;
    if (ph === 'intro') { introStep(dt); return camAndRigs(dt); }
    if (ph === 'fight') { Fight.step(dt); M.skaters.forEach(s => { if (s.state !== 'fight') { s.vx *= .95; s.vy *= .95; s.x += s.vx * dt; s.y += s.vy * dt; rigStep(s, dt); } }); M.goalies.forEach(g => Goalie.update(g, dt)); refsStep(dt); Boom.step(dt); return camAndRigs(dt); }
    if (ph === 'replay') { Replay.step(dt); if (Replay.done()) { Replay.stop(); setupFaceoff([C.x, C.y]); } return; }
    if (ph === 'shootout') { Shootout.step(dt); }
    if (ph === 'faceoff') faceoffStep(dt);
    for (const s of M.skaters) skaterStep(s, dt);
    if (ph === 'play' || ph === 'shootout') { bodies(dt); Puck.step(dt); }
    else if (ph === 'goal' || ph === 'stoppage') { bodies(dt); Puck.step(dt); }
    else if (ph === 'faceoff') Puck.step(dt);
    for (const g of M.goalies) Goalie.update(g, dt);
    if (ph === 'play' || ph === 'shootout') { Hits.step(dt); Items.step(dt); }
    if (ph === 'play') Fight.watch(dt);
    Boom.step(dt);
    if (ph === 'play') {
      autoSwitch();
      if (M.puck.curl) { const p = M.puck, sp = Math.hypot(p.vx, p.vy); if (sp > 30 && !p.owner) { const k = p.curl * dt; const vx = p.vx; p.vx += -p.vy * k; p.vy += vx * k; p.curl *= Math.exp(-dt * 1.4); } else p.curl = 0; }
      if (!M.cfg.noClock) { M.clock -= dt; for (const b of M.sinBin) b.t -= dt; }
      binStep();
      if (M.clock <= 0) { M.clock = 0; endPeriod(); }
      Boss.step(dt);
      if (M.cfg.script) M.cfg.script(dt);
    }
    if (ph === 'goal' && M.cfg.practice) { if (M.phaseT > 1) { M.puck.inNet = false; M.puck.dead = false; for (const s of M.skaters) if (s.state === 'celebrate') s.state = 'skate'; setPhase('play'); } }
    else if (ph === 'stoppage' && M.cfg.practice) { if (M.phaseT > .8) { M.puck.held = false; M.puck.dead = false; for (const g of M.goalies) if (g.state === 'cover' || g.state === 'glove') g.state = 'ready'; setPhase('play'); } }
    else if (ph === 'goal') { if (M.phaseT > (M.cfg.session ? 2 : 2.8)) { if (M.suddenDeath) return final(); if (M.cfg.replays !== false && S().replays !== 'Off' && !M.attractNoReplay) { setPhase('replay'); Replay.playGoal(M.cfg.session ? 3 : 4); } else setupFaceoff([C.x, C.y]); } }
    else if (ph === 'stoppage' && M.phaseT > 1.6) { Items.atStoppage(); if (M.pendingReplay && S().replays !== 'Off' && !M.cfg.session && !M.attract) { M.pendingReplay = false; setPhase('replay'); Replay.playClip(); } else setupFaceoff(M.stopDot); }
    if (ph === 'periodEnd' && M.phaseT > 3) afterPeriod();
    if (ph === 'final' && M.phaseT > 4.5 && !M.finished) { M.finished = true; Bus.emit('match_over', { winner: M.winner }); }
    refsStep(dt);
    camAndRigs(dt);
    Replay.record();
  }
  function camAndRigs(dt) { Cam.update(dt); Crowd.step(dt); }
  function introStep(dt) {
    // lineup on the blue lines, a spotlight sweeping each player as the announcer calls them
    if (M.phaseT < dt * 1.5) {
      for (const t of [0, 1]) { const own = Skater.ownGoal(t), dir = -Rink.outDir(own.side); M.skaters.filter(s => s.team === t).forEach((s, k) => { s.x = C.x - dir * 108 + (RNG.fx() - .5) * 2; s.y = C.y - 60 + k * 60; s.vx = s.vy = 0; s.facing = PI / 2; s.state = 'skate'; }); }
      M.introI = -1; M.introT = 0;
    }
    M.introT -= dt;
    const order = M.skaters;
    if (M.introT <= 0) { M.introI++; M.introT = 1.1; const s = order[M.introI]; if (s) Bus.emit('intro', { by: s.id, team: s.team, name: s.name, num: s.def.num }); }
    for (const s of M.skaters) { s.facing = PI / 2; rigStep(s, dt); }
    for (const g of M.goalies) Goalie.update(g, dt);
    refsStep(dt);
    if (M.introI >= order.length || UI.anyPressed('confirm') || UI.anyPressed('start')) { game.players.forEach(p => p.consumeAll()); setupFaceoff([C.x, C.y]); Bus.emit('puck_drop_ready', {}); }
  }
  function faceoffStep(dt) {
    const p = M.puck, centers = [0, 1].map(t => M.skaters.filter(s => s.team === t && s.state !== 'bin' && !s.off).sort((a, b) => Math.hypot(a.x - M.foDot[0], a.y - M.foDot[1]) - Math.hypot(b.x - M.foDot[0], b.y - M.foDot[1]))[0]);
    if (M.phaseT < M.foDrop) {
      // a press before the drop is a mistimed swipe
      centers.forEach((c, t) => { if (c && c.human && (c.human.input && !c.human.remote ? c.human.input.pressed('pass') || c.human.input.pressed('shoot') : Net.pressedFor(c.human, 'pass'))) M.foPress[t] = -1; });
      return;
    }
    if (!M.dropped) { M.dropped = true; p.held = false; p.z = 14; p.vz = -40; Bus.emit('faceoff_drop', { x: p.x, y: p.y }); }
    const since = M.phaseT - M.foDrop;
    centers.forEach((c, t) => {
      if (!c || M.foPress[t] !== null && M.foPress[t] !== -1) return;
      if (c.ctrl === 'cpu' || M.attract) { const skill = c.ai ? c.ai.skill : .5; const r = lerp(.35, .1, skill) + (c.ai ? (U.hashStr(c.id + M.t.toFixed(1)) % 100) / 100 * .08 : 0); if (since >= r) M.foPress[t] = since; }
      else if (c.human) { const pr = c.human.remote ? Net.pressedFor(c.human, 'pass') || Net.pressedFor(c.human, 'shoot') : c.human.input.pressed('pass') || c.human.input.pressed('shoot'); if (pr) M.foPress[t] = M.foPress[t] === -1 ? since + .12 : since; }
    });
    const a = M.foPress[0], b = M.foPress[1], va = a !== null && a >= 0, vb = b !== null && b >= 0;
    let win = null;
    if (va && (!vb || a <= b)) win = 0; else if (vb) win = 1;
    if (win === null && since > .9) win = RNG.sim() < .5 ? 0 : 1;
    if (win !== null && !centers[win]) { p.held = false; p.z = 0; M.dropped = false; setPhase('play'); return; }
    if (win !== null) {
      const c = centers[win], own = Skater.ownGoal(win), back = -Rink.outDir(own.side) * -1;
      const mate = M.skaters.filter(s => s.team === win && s !== c && s.state !== 'bin' && !s.off).sort((x, y) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y.x - c.x, y.y - c.y))[0];
      const tx = mate ? mate.x : c.x + back * 40, ty = mate ? mate.y : c.y, ang = Math.atan2(ty - M.foDot[1], tx - M.foDot[0]);
      p.held = false; p.z = 0; p.vz = 0; p.x = M.foDot[0]; p.y = M.foDot[1]; p.vx = Math.cos(ang) * 150; p.vy = Math.sin(ang) * 150; p.lastTouch = c; p.touchT = M.t; p.passTo = mate || null; p.passFrom = c;
      if (c) { c.act = { kind: 'pass', t: 0 }; c.cool.pickup = .2; }
      M.fo[win]++; Bus.emit('faceoff_won', { team: win, by: c ? c.id : null });
      M.dropped = false; setPhase('play');
    }
  }
  function binStep() {
    for (let i = M.sinBin.length - 1; i >= 0; i--) {
      const b = M.sinBin[i];
      if (b.t <= 0) { M.sinBin.splice(i, 1); const s = b.s, own = Skater.ownGoal(s.team); s.state = 'skate'; s.x = C.x + (s.team ? 36 : -36); s.y = Rink.Y0 + 14; s.vx = 0; s.vy = 40; s.ai = AI.fresh(s); Bus.emit('sin_bin_end', { who: s.id, team: s.team }); }
    }
  }
  function refsStep(dt) {
    const p = M.puck, [r0, r1] = M.refs;
    if (M.phase === 'play') {
      const tx = clamp(p.x + (p.x > C.x ? -60 : 60), Rink.X0 + 40, Rink.X1 - 40), ty = clamp(p.y > C.y ? p.y - 80 : p.y + 80, Rink.Y0 + 20, Rink.Y1 - 20);
      for (const [r, x, y] of [[r0, tx, ty], [r1, clamp(C.x + (p.x - C.x) * .5, Rink.X0 + 60, Rink.X1 - 60), Rink.Y0 + 16]]) {
        const dx = x - r.x, dy = y - r.y, d = Math.hypot(dx, dy), v = Math.min(110, d * 2); r.vx = d > 2 ? dx / d * v : 0; r.vy = d > 2 ? dy / d * v : 0; r.x += r.vx * dt; r.y += r.vy * dt;
        Rink.clamp(r, 7);
      }
    }
    for (const r of M.refs) {
      r.facing = U.approachAng(r.facing, Math.atan2(p.y - r.y, p.x - r.x), 6 * dt);
      if (r.down > 0) r.down -= dt;
      const arm = M.phase === 'faceoff' && r === r0 && M.phaseT < M.foDrop;
      r.rig.update(dt, { x: r.x, y: r.y, z: 0, vx: r.vx, vy: r.vy, facing: r.facing, pose: arm ? 'wave' : r.twirl > 0 ? 'cheer' : null, down: r.down > 0 ? Math.min(1, (1.6 - r.down) * 4) : 0 });
      if (r.twirl > 0) r.twirl -= dt;
    }
  }
  /* ---- the public API ---- */
  let lastCfg = null;
  function start(cfg) {
    lastCfg = cfg; Bus.clear(); create(cfg);
    for (const s of M.skaters) s.rig.update(0, { x: s.x, y: s.y, z: 0, vx: 0, vy: 0, facing: s.facing });
    if (cfg.intros !== false && S().intros !== false && !cfg.attract && !cfg.session && !cfg.practice) setPhase('intro'); else setupFaceoff([C.x, C.y]);
    if (cfg.practice) { M.puck.held = false; setPhase('play'); if (cfg.init) cfg.init(); }
    if (cfg.warp) M.pendingWarp = cfg.warp;
    Bus.emit('match_start', { home: cfg.home, away: cfg.away, arena: cfg.arena });
    return M;
  }
  function restart() { if (lastCfg && game.sceneName === 'match') { game.resume && game.resume(); game.go('match', Object.assign({}, lastCfg, { seed: (lastCfg.seed || 1) + 1 })); } else game.resume && game.resume(); }
  function showInfo() {
    if (!M) return;
    const lines = M.objectives.length ? M.objectives.map(o => (o.done ? '★ ' : '- ') + o.text + (o.need > 1 ? ' (' + o.n + '/' + o.need + ')' : '')) : [TEAMS[M.cfg.home].name + ' vs ' + TEAMS[M.cfg.away].name, ARENAS[M.cfg.arena].name, M.cfg.periods + ' periods of ' + U.mmss(M.cfg.len), 'Difficulty: ' + (M.cfg.difficulty || S().difficulty)];
    UI.toast(M.objectives.length ? 'OBJECTIVES' : 'THIS GAME', lines[0]); for (let i = 1; i < lines.length; i++) UI.toast('', lines[i]);
  }
  Bus.on('*', e => { if (M) { M.events.push(e); if (M.events.length > 300) M.events.shift(); } });
  wire();
  return { create, start, step, restart, showInfo, setupFaceoff, setPhase, goal, stoppage, final, endPeriod, afterPeriod, threeStars, periodName, skaterStep, rigStep, applyIntent, humanIntent, give, switchSkater, chirp, passIncoming, PERIOD_LEN, DIFF, get cfg() { return lastCfg; } };
})();

// ---- 27-hits.js ----
/* ---- Hits: checks, impulses, knockdowns, the glass, grudges (PLAN 7.7) ---- */
const Hits = (() => {
  const mass = s => s.def.build === 'bulky' ? 1.35 : 1;
  function reset() {}
  /** a contact between a checking skater a and b at closing speed v (accidental: no check) */
  function contact(a, b, v, accidental) {
    if (accidental) { if (b.items.poutine > 0 || (M.cheats.god && b.ctrl !== 'cpu')) return; knock(b, a, v * .8, false); Bus.emit('hit', { by: a.id, victim: b.id, power: Math.round(v), big: true, team: a.team, accidental: true }); return; }
    if (a.hitDone && a.hitDone[b.id]) return; if (a.hitDone) a.hitDone[b.id] = 1;
    if (b.state === 'deke' && b.stateT < .3 && RNG.sim() < .7 + .04 * (b.def.hnd - 3)) { Bus.emit('deke_dodge', { by: b.id, victim: a.id }); return; }
    let imp = T.checkPower * (v + 60) * (mass(a) / mass(b)) * Skater.hitMul(a.def) * (a.holdTurbo && a.turbo > 0 ? 1.45 : 1) * (M.kaboomT[a.team] > 0 ? 2 : 1) * (a.items.poutine > 0 ? 1.6 : 1) * (M.tactic && M.tactic[a.team] === 'grit' ? 1.1 : 1);
    if (b.twisterT > 0) imp = Math.max(imp, T.knockdown + 10);
    if (a.items.poutine > 0) imp = Math.max(imp, T.knockdown + 5);
    const unstoppable = b.items.poutine > 0 || (M.cheats.god && b.ctrl !== 'cpu' && !M.attract);
    const p = M.puck, had = p.owner === b;
    const nx = (b.x - a.x) / (Math.hypot(b.x - a.x, b.y - a.y) || 1), ny = (b.y - a.y) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
    if (imp < 90 || unstoppable) {
      b.state = 'stun'; b.stateT = 0; b.stunT = .25; b.vx += nx * imp * .3; b.vy += ny * imp * .3;
      if (had && !unstoppable && !(b.items.tape > 0) && RNG.sim() < .5) loose(b, a, nx, ny);
      Bus.emit('hit', { by: a.id, victim: b.id, power: Math.round(imp), big: false, bump: true, team: a.team });
      grudge(b, a, 5);
    } else if (imp < T.knockdown) {
      b.state = 'stun'; b.stateT = 0; b.stunT = .5; b.vx += nx * imp * .5; b.vy += ny * imp * .5;
      if (had && !(b.items.tape > 0)) loose(b, a, nx, ny);
      Bus.emit('hit', { by: a.id, victim: b.id, power: Math.round(imp), big: false, team: a.team });
      grudge(b, a, 10);
    } else {
      if (had) loose(b, a, nx, ny);
      knock(b, a, imp, true);
      Bus.emit('hit', { by: a.id, victim: b.id, power: Math.round(imp), big: true, team: a.team, x: b.x, y: b.y });
      grudge(b, a, 35); for (const m of M.skaters) if (m.team === b.team && m !== b) grudge(m, a, 10);
      M.bigHitT = M.t; Replay.markClip('hit', imp);
      Items.hitOnIce(b, imp);
    }
    if (M.mascot && b === M.mascot) return;
  }
  function loose(b, a, nx, ny) { const p = M.puck; Skater.release(b, nx * 60 + b.vx * .5, ny * 60 + b.vy * .5, 0, 'loose'); p.lastTouch = a; p.touchT = M.t; M.stats[a.id].takeaways++; }
  function knock(b, a, imp, big) {
    b.state = 'down'; b.stateT = 0; b.downT = 1.4; b.shootHold = 0; b.winding = false;
    const nx = (b.x - a.x) / (Math.hypot(b.x - a.x, b.y - a.y) || 1), ny = (b.y - a.y) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
    b.vx = nx * imp * .8 + a.vx * .3; b.vy = ny * imp * .8 + a.vy * .3; b.knockV = imp * .8;
    Rink.scuffAt(b.x, b.y, .2);
    if (M.puck.owner === b) Skater.release(b, nx * 60, ny * 60, 0, 'loose');
  }
  function grudge(victim, by, n) { victim.grudge[by.id] = Math.min(100, (victim.grudge[by.id] || 0) + n); victim.grudgeT = M.t; }
  /** a body into the boards: rattle, crack or shatter the glass (snowbanks bury) */
  function boards(s, vin, n, sp) {
    if (vin > 120) Bus.emit('rattle', { x: s.x, y: s.y, by: s.id, speed: vin });
    const pan = Rink.panelAt(s.x, s.y);
    if (s.state !== 'down' && s.state !== 'stun') return;
    if (M.arena.snowbank) { if (s.state === 'down' && vin > T.glassCrack * .8) { s.state = 'buried'; s.stateT = 0; Bus.emit('buried', { victim: s.id, x: s.x, y: s.y }); } return; }
    s.rig.kick(-.4);
    if (vin > T.glassShatter || (pan.state === 'cracked' && vin > T.glassCrack)) breakPanel(pan, 'shattered', s);
    else if (vin > T.glassCrack && pan.state === 'ok') breakPanel(pan, 'cracked', s);
    if (vin > T.glassCrack) Replay.markClip('glass', vin + 60);
  }
  function breakPanel(pan, state, by) {
    if (!pan || pan.state === 'shattered' || M.arena.snowbank) return;
    if (state === 'cracked' && pan.state === 'cracked') state = 'shattered';
    pan.state = state; pan.shake = .5;
    Bus.emit('glass', { panel: pan.i, state, by: by ? by.id : null, team: by ? (M.teamOf(M.lastHitter || '') >= 0 ? M.teamOf(M.lastHitter) : 1 - by.team) : -1, x: pan.m[0], y: pan.m[1] });
  }
  Bus.on('hit', e => { if (M) M.lastHitter = e.by; });
  /** grudges cool off after 3 s of peace */
  function step(dt) { for (const s of M.skaters) if (M.t - (s.grudgeT || 0) > 8) for (const k in s.grudge) s.grudge[k] = Math.max(0, s.grudge[k] - 2 * dt); }
  return { reset, contact, boards, breakPanel, step, knock };
})();

/* ---- Boom: one BOOM meter per team; at 100, KABOOM mode (PLAN 7.10) ---- */
const Boom = (() => {
  const GAIN = { bighit: 18, check: 6, crack: 8, shatter: 15, fightWin: 45, fightLoss: 5, goal: 20, shotOnGoal: 4, save: 5, pass: 2, onetimer: 6, deke: 6, chirp: 3, boombox: 40, mascot: 10, flood: 30, organ: 30, turtleGain: 10, turtleLoss: -10, draw: 10 };
  function reset(m) { m.boom = [0, 0]; m.kaboomT = [0, 0]; }
  function add(team, n, why) {
    if (!M || team < 0 || team > 1) return;
    if (M.kaboomT[team] > 0 && n > 0) return;
    const k = n > 0 ? T.boomGain * (M.tactic && M.tactic[team] === 'grit' ? 1.15 : 1) : 1;
    M.boom[team] = clamp(M.boom[team] + n * k, 0, 100);
    if (M.boom[team] >= 100) start(team);
  }
  function start(team) {
    if (M.kaboomT[team] > 0) return;
    M.boom[team] = 0; M.kaboomT[team] = T.kaboomTime; M.kabooms[team]++;
    for (const s of M.skaters) if (s.team === team) s.turbo = 1;
    Bus.emit('kaboom_start', { team, gilded: TEAMS[team === 0 ? M.cfg.home : M.cfg.away].id === 'grizzlies' });
    Replay.markClip('kaboom', 300);
  }
  function end(team) { if (M.kaboomT[team] <= 0) return; M.kaboomT[team] = 0; Bus.emit('kaboom_end', { team }); }
  function step(dt) {
    for (const t of [0, 1]) if (M.kaboomT[t] > 0 && M.phase === 'play') { M.kaboomT[t] -= dt; if (M.kaboomT[t] <= 0) { M.kaboomT[t] = 1e-9; end(t); } }
    if (M.cheats.alwaysKaboom) for (const h of M.humans) if (M.kaboomT[h.team] <= 0 && M.phase === 'play') start(h.team);
  }
  Bus.on('hit', e => { if (M) add(e.team, e.big ? GAIN.bighit : e.bump ? 0 : GAIN.check); });
  Bus.on('glass', e => { if (M && e.team >= 0) add(e.team, e.state === 'shattered' ? GAIN.shatter : GAIN.crack); });
  Bus.on('goal', e => { if (M) add(e.team, GAIN.goal + (e.kind === 'onetimer' ? GAIN.onetimer : 0)); });
  Bus.on('shot', e => { if (M && e.onGoal) add(e.team, GAIN.shotOnGoal); });
  Bus.on('save', e => { if (M) add(e.team, GAIN.save); });
  Bus.on('pass_complete', e => { if (M) add(e.team, GAIN.pass); });
  Bus.on('deke_beat', e => { if (M) add(e.team, GAIN.deke); });
  Bus.on('chirp', e => { if (M) add(e.team, GAIN.chirp); });
  Bus.on('mascot_down', e => { if (M) add(e.team, GAIN.mascot); });
  Bus.on('fight_end', e => { if (!M) return; if (e.draw) { add(0, GAIN.draw); add(1, GAIN.draw); } else { add(e.winnerTeam, GAIN.fightWin); add(1 - e.winnerTeam, GAIN.fightLoss); } });
  Bus.on('turtle', e => { if (!M) return; add(e.team, GAIN.turtleLoss); add(1 - e.team, GAIN.turtleGain); });
  return { add, start, end, step, reset, GAIN };
})();

// ---- 28-fight.js ----
/* ---- Fight: gloves off. Jab, haymaker, duck, yank; balance and stamina; the sin bin and the power play (PLAN 7.11) ---- */
const Fight = (() => {
  const MOVES = { jab: { dur: .25, active: .4, dmg: 6, sta: 8, move: 'jab' }, hay: { dur: .8, active: .5, dmg: 18, sta: 22, move: 'haymaker' }, yank: { dur: .3, active: .5, dmg: 0, sta: 6, move: 'cross' } };
  let F = null;
  function reset() { F = null; if (M) { M.fight = null; M.challenge = null; M.gear = []; } }
  const canFight = () => M && M.phase === 'play' && !M.cfg.noFights && M.fights < T.fightMax && (M.lastFightClock - M.clock >= 60 || M.lastFightClock === 1e9 || M.ot || M.cfg.practice || M.attract);
  /** s holds lob near a rival with a grudge: challenge them */
  function challenge(s) {
    if (!canFight()) return false;
    const rivals = M.skaters.filter(o => o.team !== s.team && Skater.free(o) && Math.hypot(o.x - s.x, o.y - s.y) < 60 && ((s.grudge[o.id] || 0) >= T.fightGrudge || (o.grudge[s.id] || 0) >= T.fightGrudge || M.cfg.practice || M.attract));
    const o = rivals.sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
    if (!o) return false;
    Bus.emit('gloves', { by: s.id, target: o.id, team: s.team });
    if (o.ctrl === 'cpu' || M.attract) {
      const g = Math.max(o.grudge[s.id] || 0, s.grudge[o.id] || 0), p = clamp(.4 + .12 * (o.def.fgt - 3) + g / 200 + (o.challengeBias || 0), .1, .95);
      const forced = M.challengy && (o.def.name.includes('Bruiser') || s.def.name.includes('Bruiser'));
      if (forced || M.cfg.practice || M.attract || RNG.sim() < p) begin(s, o); else turtle(o);
    } else M.challenge = { from: s, to: o, t: 3 };
    return true;
  }
  function turtle(o) { Bus.emit('turtle', { by: o.id, team: o.team, name: o.name }); o.grudge = {}; }
  /** the CPU's enforcers challenge a human who's earned it; a pending human answer counts down */
  function watch(dt) {
    if (M.challenge) {
      const c = M.challenge, h = c.to.human; c.t -= dt;
      const held = h && (h.remote ? Net.heldFor(h, 'lob') : h.input && h.input.down('lob'));
      if (held) { c.hold = (c.hold || 0) + dt; if (c.hold > .5) { M.challenge = null; begin(c.from, c.to); return; } } else c.hold = 0;
      if (c.t <= 0) { M.challenge = null; turtle(c.to); }
      return;
    }
    if (!canFight() || M.cfg.practice) return;
    M.cpuFightT = (M.cpuFightT || 0) - dt; if (M.cpuFightT > 0) return; M.cpuFightT = 1;
    // the Grindhouse: the Bruise Brothers go looking for a scrap, grudge or not
    if (M.challengy) for (const s of M.skaters) {
      if (s.ctrl !== 'cpu' || !Skater.free(s) || s.def.fgt < 5) continue;
      const o = M.skaters.filter(x => x.team !== s.team && Skater.free(x) && !x.off && Math.hypot(x.x - s.x, x.y - s.y) < 60).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
      if (o && RNG.sim() < .12) { s.grudge[o.id] = Math.max(s.grudge[o.id] || 0, 60); if (o.human) { Bus.emit('gloves', { by: s.id, target: o.id, team: s.team }); M.challenge = { from: s, to: o, t: 3 }; } else begin(s, o); return; }
    }
    for (const s of M.skaters) {
      if (s.ctrl !== 'cpu' || !Skater.free(s) || s.def.fgt < 4) continue;
      for (const o of M.skaters) {
        if (o.team === s.team || !Skater.free(o)) continue;
        const g = s.grudge[o.id] || 0, need = M.challengy ? 30 : o.ctrl === 'cpu' ? 34 : 55;
        if (g < need || Math.hypot(o.x - s.x, o.y - s.y) >= 60) continue;
        if (o.human) { Bus.emit('gloves', { by: s.id, target: o.id, team: s.team }); M.challenge = { from: s, to: o, t: 3 }; return; }
        if (o.ctrl === 'cpu' && RNG.sim() < .5) { challenge(s); return; }
      }
    }
  }
  function fighter(s) { return { s, bal: T.fightBalance, sta: 100, mv: null, u: 0, hold: 0, duck: 0, open: 0, stag: 0, yanks: [], blind: 0, ai: { t: .4 }, x: 0, wins: 0 }; }
  function begin(a, b) {
    const mx = (a.x + b.x) / 2, my = clamp((a.y + b.y) / 2, Rink.Y0 + 40, Rink.Y1 - 40);
    F = { a: fighter(a), b: fighter(b), t: 0, mx, my, saved: M.skaters.map(s => [s, s.x, s.y]), over: 0 };
    M.fight = F; F.who = [a, b]; M.fights++; M.lastFightClock = M.clock;
    for (const [f, side] of [[F.a, -1], [F.b, 1]]) { const s = f.s; s.state = 'fight'; s.stateT = 0; s.x = mx + side * 12; s.y = my; s.vx = s.vy = 0; s.facing = side < 0 ? 0 : PI; s.rig.noStick = true; f.side = side; }
    M.gear = (M.gear || []).concat([{ x: a.x - 6, y: a.y + 3, c: a.rig.C.glove }, { x: a.x - 3, y: a.y - 4, c: a.rig.C.glove }, { x: b.x + 6, y: b.y + 3, c: b.rig.C.glove }, { x: b.x + 4, y: b.y - 3, c: b.rig.C.glove }]);
    if (M.puck.owner) Skater.release(M.puck.owner, 0, 0, 0, 'drop');
    M.puck.held = true; M.puck.vx = M.puck.vy = 0;
    Match.setPhase('fight');
    Bus.emit('fight_start', { a: a.id, b: b.id, an: a.name, bn: b.name, x: mx, y: my });
  }
  function ctrl(f, dt) {
    const s = f.s, h = s.human;
    if (h && !M.attract) {
      if (h.remote) return { jab: Net.pressedFor(h, 'pass'), hay: Net.pressedFor(h, 'shoot'), hayHeld: Net.heldFor(h, 'shoot'), duck: Net.pressedFor(h, 'deke'), yank: Net.pressedFor(h, 'lob'), mx: Net.moveFor(h)[0] };
      const I = h.input; return { jab: I.pressed('pass'), hay: I.pressed('shoot'), hayHeld: I.down('shoot'), duck: I.pressed('deke'), yank: I.pressed('lob'), mx: I.move()[0] };
    }
    // the CPU: duck a telegraphed haymaker by skill, else jab, haymaker or yank by temperament
    const o = f === F.a ? F.b : F.a, c = { jab: false, hay: false, hayHeld: false, duck: false, yank: false, mx: 0 }, skill = s.ai ? s.ai.skill : .5;
    f.ai.t -= dt;
    if (o.mv && o.mv.k === 'hay' && o.u < .45 && !f.ai.read) { f.ai.read = true; if (RNG.sim() < skill * (M.cfg.practice ? .3 : 1)) c.duck = true; }
    if (!o.mv) f.ai.read = false;
    if (f.ai.t <= 0 && !f.mv) {
      f.ai.t = lerp(.7, .3, skill) * (M.cfg.practice ? 1.8 : 1) * (.8 + RNG.sim() * .4);
      const r = RNG.sim(), heavy = s.def.fgt >= 4;
      if (r < (heavy ? .35 : .55)) c.jab = true; else if (r < (heavy ? .75 : .8)) c.hay = true; else c.yank = true;
    }
    c.hayHeld = f.mv && f.mv.k === 'hay' && RNG.sim() < .5;
    return c;
  }
  function step(dt) {
    if (!F) return;
    F.t += dt;
    if (F.over > 0) {
      F.over -= dt; anim(dt);
      if (F.over <= 0) finish();
      return;
    }
    for (const f of [F.a, F.b]) {
      const o = f === F.a ? F.b : F.a, c = ctrl(f, dt), slow = f.sta <= 0 ? .6 : 1;
      f.duck = Math.max(0, f.duck - dt); f.open = Math.max(0, f.open - dt); f.stag = Math.max(0, f.stag - dt); f.blind = Math.max(0, f.blind - dt);
      f.sta = Math.min(100, f.sta + 25 * dt);
      f.x = clamp(f.x + (c.mx || 0) * 20 * dt, -6, 6);
      if (f.blind <= 0 && f.s.rig.o.hood) { f.s.rig.o.hood = false; f.s.rig.C.hair = f.hair0; }
      if (!f.mv && f.stag <= 0) {
        if (c.duck && f.duck <= 0) { f.duck = .35; f.sta -= 10; Bus.emit('fight_move', { by: f.s.id, kind: 'duck' }); }
        else if (c.jab && f.duck <= 0) { f.mv = { k: 'jab', spec: MOVES.jab, hit: false }; f.u = 0; f.sta -= 8; }
        else if (c.hay && f.duck <= 0) { f.mv = { k: 'hay', spec: MOVES.hay, hit: false, alt: (f.alt = !f.alt) }; f.u = 0; f.hold = 0; f.sta -= 22; Bus.emit('fight_move', { by: f.s.id, kind: 'windup' }); }
        else if (c.yank && f.duck <= 0) { f.mv = { k: 'yank', spec: MOVES.yank, hit: false }; f.u = 0; f.sta -= 6; }
      }
      if (f.mv) {
        const sp = f.mv.spec, dur = sp.dur / slow;
        if (f.mv.k === 'hay' && c.hayHeld && f.u < .4 && f.hold < .6) { f.hold += dt; }
        else f.u += dt / dur;
        if (!f.mv.hit && f.u >= sp.active) {
          f.mv.hit = true;
          const k = f.mv.k, dmgMul = .8 + .067 * f.s.def.fgt;
          if (k === 'jab') { const d = sp.dmg * dmgMul * (o.duck > 0 ? .5 : 1) * (o.open > 0 ? 1.5 : 1); o.bal -= d; o.stag = .12; Bus.emit('fight_hit', { by: f.s.id, victim: o.s.id, kind: 'jab', dmg: d, x: o.s.x, y: o.s.y }); }
          else if (k === 'hay') {
            if (o.duck > 0) { f.open = .5; Bus.emit('fight_whiff', { by: f.s.id }); }
            else { const d = (sp.dmg + 6 * Math.min(1, f.hold / .6)) * dmgMul * (o.open > 0 ? 1.4 : 1); o.bal -= d; o.stag = .3; Bus.emit('fight_hit', { by: f.s.id, victim: o.s.id, kind: 'hay', dmg: d, x: o.s.x, y: o.s.y, big: d > 20 }); }
          } else if (k === 'yank') {
            if (o.duck > 0) Bus.emit('fight_whiff', { by: f.s.id });
            else {
              o.open = .6; o.sta -= 15; f.yanks.push(F.t); f.yanks = f.yanks.filter(t => F.t - t < 4);
              Bus.emit('fight_hit', { by: f.s.id, victim: o.s.id, kind: 'yank', dmg: 0, x: o.s.x, y: o.s.y });
              if (f.yanks.length >= 3) { f.yanks = []; o.blind = 1.5; o.hair0 = o.hair0 || o.s.rig.C.hair; o.s.rig.o.hood = true; o.s.rig.C.hair = o.s.rig.C.cloth; Bus.emit('jersey_over', { by: f.s.id, victim: o.s.id }); }
            }
          }
        }
        if (f.u >= 1) f.mv = null;
      }
      if (o.blind > 0 && f.mv && f.mv.k !== 'yank') { /* blind fighters swing at air */ }
    }
    for (const f of [F.a, F.b]) if (f.bal <= 0 && F.over <= 0) { const o = f === F.a ? F.b : F.a; end(o, f); break; }
    if (F.t > 20 && F.over <= 0) end(null, null);
    anim(dt);
    watchOthers(dt);
  }
  function anim(dt) {
    for (const f of [F.a, F.b]) {
      const s = f.s, o = f === F.a ? F.b : F.a;
      s.x = F.mx + f.side * 11 + f.x - (f.stag > 0 ? f.side * -2 : 0); s.y = F.my; s.facing = f.side < 0 ? 0 : PI;
      const mv = f.mv, att = mv && f.u < 1 ? E.move(mv.k === 'hay' ? (mv.alt ? 'hook' : 'haymaker') : mv.spec.move, f.u) : null;
      const lost = F.over > 0 && F.loser === f, won = F.over > 0 && F.winner === f;
      s.rig.update(dt, { x: s.x, y: s.y, z: 0, vx: 0, vy: 0, facing: s.facing, stance: 'guard', attack: att, pose: won ? 'cheer' : f.duck > 0 ? 'crouch' : null, down: lost ? Math.min(1, (1.6 - F.over) * 3) : 0, hurt: f.stag > 0, expr: won ? 'shout' : f.stag > 0 ? 'wince' : 'angry' });
    }
  }
  function watchOthers(dt) {   // the rest circle at 50 and watch
    for (const s of M.skaters) {
      if (s.state === 'fight' || s.state === 'bin' || s.off) continue;
      const a = Math.atan2(s.y - F.my, s.x - F.mx) + dt * .25, tx = F.mx + Math.cos(a) * 55, ty = F.my + Math.sin(a) * 40;
      s.vx = (tx - s.x) * 2; s.vy = (ty - s.y) * 2; s.x += s.vx * dt; s.y += s.vy * dt; Rink.clamp(s, 7); s.facing = Math.atan2(F.my - s.y, F.mx - s.x);
    }
    const [r0, r1] = M.refs; r0.x += (F.mx - 30 - r0.x) * dt * 2; r0.y += (F.my - 20 - r0.y) * dt * 2; r1.x += (F.mx + 30 - r1.x) * dt * 2; r1.y += (F.my + 18 - r1.y) * dt * 2;
  }
  function end(w, l) {
    F.over = 1.6; F.winner = w; F.loser = l;
    if (!w) Bus.emit('fight_end', { draw: true, a: F.a.s.id, b: F.b.s.id });
    else Bus.emit('fight_end', { winner: w.s.id, loser: l.s.id, winnerTeam: w.s.team, winnerName: w.s.name, loserName: l.s.name });
  }
  function finish() {
    const w = F.winner, l = F.loser;
    for (const f of [F.a, F.b]) { f.s.state = 'skate'; f.s.rig.noStick = false; f.s.grudge = {}; if (f.s.rig.o.hood) { f.s.rig.o.hood = false; f.s.rig.C.hair = f.hair0 || f.s.rig.C.hair; } }
    if (l) {
      const s = l.s; s.state = 'bin'; s.x = Rink.C.x + (s.team ? 36 : -36); s.y = Rink.Y0 - 10; s.vx = s.vy = 0; s.facing = PI / 2;
      M.sinBin.push({ s, t: T.sinBin }); Bus.emit('sin_bin', { who: s.id, team: s.team, t: T.sinBin, name: s.name }); Bus.emit('powerplay', { team: 1 - s.team });
    }
    const dot = Rink.nearestDot(F.mx, F.my); F = null; M.fight = null;
    Match.setupFaceoff(dot);
  }
  return { reset, challenge, watch, begin, step, get F() { return F; } };
})();

// ---- 29-boss.js ----
/* ---- Boss: the Kaboom Cup's set pieces (Gilded Boost, Doris's organ); deke_beat detection ---- */
const Boss = (() => {
  function step(dt) {
    // a deke that leaves a defender behind within 1 s
    for (const s of M.skaters) {
      if (!s.dekeAt || M.t - s.dekeAt > 1 || !s.dekeVs || !s.dekeVs.length || M.puck.owner !== s) continue;
      const g = Skater.attackGoal(s.team), dir = -Rink.outDir(g.side);
      for (const id of s.dekeVs) { const o = M.byId[id]; if (o && (o.x - s.x) * dir > 12) { Bus.emit('deke_beat', { by: s.id, victim: o.id, team: s.team, name: s.name, vname: o.name }); s.dekeVs = []; break; } }
    }
    for (const t of [0, 1]) if (M.boost[t] > 0 && M.boost[t] < 99) M.boost[t] = Math.max(0, M.boost[t] - dt);
    if (!M.cfg.boss) return;
    const gTeam = M.cfg.home === 'grizzlies' ? 0 : 1, mTeam = 1 - gTeam;
    if (M.period >= 3 && !M.boostOn) { M.boostOn = true; M.boost[gTeam] = 99; Bus.emit('boost_start', { team: gTeam }); }
    const early = M.cfg.doris !== 'late';
    if (!M.organDone && ((early && M.period === 2 && M.clock < M.cfg.len - 3) || (!early && M.period === 3 && M.clock < 60))) {
      M.organDone = true; M.boost[mTeam] = 20; Boom.add(mTeam, early ? 30 : 45); Bus.emit('organ_boost', { team: mTeam, late: !early });
    }
  }
  return { step };
})();

/* ---- Shootout: three rounds each, then sudden death; a manual goalie for a defending human (PLAN 7.14) ---- */
const Shootout = (() => {
  const C = Rink.C;
  function start(showcase) {
    M.so = { showcase: !!showcase, round: 0, team: 0, results: [[], []], t: 0, state: 'pause', pause: 1.5, shooter: null, n: [0, 0], winner: null };
    M.period = M.cfg.periods + (M.ot ? 2 : 1);
    Match.setPhase('shootout'); Bus.emit('shootout_start', { showcase: !!showcase });
    for (const s of M.skaters) { s.off = true; s.x = C.x + (s.team ? 60 : -60) + s.slot * 16; s.y = Rink.Y0 - 10; }
  }
  function setup() {
    const so = M.so, t = so.team, list = M.skaters.filter(s => s.team === t), shooter = list[so.n[t] % list.length];
    so.n[t]++; so.shooter = shooter; so.t = 0; so.state = 'go'; so.shot = false;
    for (const s of M.skaters) { s.off = s !== shooter; if (s.off) { s.x = C.x + (s.team ? 60 : -60) + s.slot * 16; s.y = Rink.Y0 - 10; s.vx = s.vy = 0; } }
    const g = Skater.attackGoal(t), dir = -Rink.outDir(g.side);
    Object.assign(shooter, { x: C.x + dir * 10, y: C.y, vx: 0, vy: 0, facing: dir > 0 ? PI : 0, state: 'skate', shootHold: 0, winding: false, charge: 0, ai: AI.fresh(shooter) });
    shooter.facing = Math.atan2(0, g.x - shooter.x);
    // a human on the shooting team takes the shooter
    const hs = M.humans.find(h => h.team === t); if (hs) Match.give(hs, shooter); else if (shooter.human) { shooter.ctrl = 'cpu'; }
    const p = M.puck; Object.assign(p, { x: shooter.x, y: shooter.y, z: 0, vx: 0, vy: 0, vz: 0, held: false, inNet: false, dead: false, onFire: false, owner: null, lastTouch: null });
    Puck.take(shooter, p);
    const gl = M.goalies[1 - t]; gl.x = g.x + dir * 8; gl.y = C.y; gl.state = 'ready'; gl.track = null;
    const hd = M.humans.find(h => h.team === 1 - t && !M.attract);
    gl.manual = !!hd; gl.human = hd || null; gl.mx = gl.x; gl.my = gl.y;
    for (const g2 of M.goalies) if (g2 !== gl) { g2.manual = false; }
    so.startX = shooter.x; so.dir = dir;
  }
  function step(dt) {
    const so = M.so; if (!so) return;
    if (so.state === 'pause') { so.pause -= dt; if (so.pause <= 0) { if (so.winner !== null) return finish(); setup(); } return; }
    if (so.state !== 'go') return;
    so.t += dt;
    const gl = M.goalies[1 - so.team];
    if (gl.manual && gl.human) manual(gl, dt);
    const p = M.puck, s = so.shooter, g = Skater.attackGoal(so.team);
    if (!p.owner && p.lastTouch === s) so.shot = true;
    const behind = (p.x - g.x) * -so.dir > 2;
    const stopped = so.shot && !p.owner && Math.hypot(p.vx, p.vy) < 20;
    if (so.t > 8 || (so.shot && (p.held || stopped || behind)) ) result(false);
  }
  function manual(gl, dt) {
    const h = gl.human, g = Skater.ownGoal(gl.team), into = -Rink.outDir(g.side);
    let mx = 0, my = 0, pr = a => false;
    if (h.remote) { const m = Net.moveFor(h); mx = m[0]; my = m[1]; pr = a => Net.pressedFor(h, a); }
    else { const m = h.input.move(); mx = m[0]; my = m[1]; pr = a => h.input.pressed(a); }
    gl.mx = clamp(g.x + into * (8 + (mx * into > 0 ? 14 : 0) * Math.abs(mx)), g.x + into * 4, g.x + into * 30);
    gl.my = clamp(gl.y + my * 150 * dt, C.y - 22, C.y + 22);
    if (pr('pass')) { gl.state = 'butterfly'; gl.stateT = 0; }
    if (pr('shoot')) { gl.state = 'poke'; gl.stateT = 0; const p = M.puck; if (p.owner && Math.hypot(p.owner.x - gl.x, p.owner.y - gl.y) < 26) { Skater.release(p.owner, into * 120, 0, 0, 'poke'); Bus.emit('poke', { by: gl.id, ok: true, goalie: true }); } }
    if (pr('deke')) { gl.state = 'stack'; gl.stateT = 0; gl.y = clamp(gl.y + (my >= 0 ? 10 : -10), C.y - 22, C.y + 22); }
  }
  function scored(team, by) { const so = M.so; if (!so || so.state !== 'go') return; M.puck.inNet = true; result(true); }
  function result(ok) {
    const so = M.so; so.state = 'pause'; so.pause = 1.8;
    so.results[so.team].push(ok);
    Bus.emit('shootout_attempt', { by: so.shooter.id, team: so.team, ok, name: so.shooter.name });
    if (ok) Bus.emit('so_goal', { team: so.team, by: so.shooter.id });
    // decided?
    const [a, b] = so.results, ga = a.filter(Boolean).length, gb = b.filter(Boolean).length, ra = 3 - a.length, rb = 3 - b.length;
    if (a.length <= 3 && b.length <= 3) {
      if (ga > gb + Math.max(0, rb)) so.winner = 0; else if (gb > ga + Math.max(0, ra)) so.winner = 1;
      else if (a.length === 3 && b.length === 3 && ga !== gb) so.winner = ga > gb ? 0 : 1;
    } else if (a.length === b.length && ga !== gb) so.winner = ga > gb ? 0 : 1;
    if (so.winner === null) so.team = a.length > b.length ? 1 : a.length < b.length ? 0 : 0;
    if (so.winner === null && a.length === b.length) so.round++;
    if (so.winner === null && Math.min(a.length, b.length) >= 12) so.winner = ga >= gb ? 0 : 1;
  }
  function finish() {
    const so = M.so; Bus.emit('shootout_end', { team: so.winner, showcase: so.showcase });
    for (const s of M.skaters) s.off = false;
    for (const g of M.goalies) g.manual = false;
    if (!so.showcase || M.score[0] === M.score[1]) { M.score[so.winner]++; M.soWin = so.winner; }
    else M.showcaseWin = so.winner;
    M.phase = 'play'; Match.final();
  }
  return { start, step, scored, setup };
})();

// ---- 30-items.js ----
/* ---- Items: fan throws, power-ups, octopi, rats, hats, thin ice, snowbanks, Polar Pete and the Discount Drop (PLAN 7.12) ---- */
const Items = (() => {
  const C = Rink.C;
  function reset(m) {
    m.items = []; m.hazards = []; m.hats = []; m.throwT = T.itemEvery * (.6 + RNG.sim() * .5); m.dropT = 40; m.crate = null; m.techs = [];
    m.ice = m.arena.hazards.includes('thinice') ? [[C.x - 200, C.y - 70], [C.x + 40, C.y + 90], [C.x + 220, C.y - 60]].map(([x, y], i) => ({ i, x, y, rx: 56, ry: 34, hp: 100, hole: false, t: 0 })) : [];
    m.mascot = m.arena.hazards.includes('mascot') ? { x: C.x, y: C.y - 40, vx: 0, vy: 0, t: 0, down: 0, facing: 0, rig: Rigs.cast('pete').rig, cast: true } : null;
  }
  /** a fan throws something from the stands: an item, or an octopus / rat in barns that do that */
  function throwOne(kind, at) {
    const pool = M.arena.items, k = kind || U.pick(RNG.sim, pool);
    const tx = at ? at[0] : C.x + (RNG.sim() - .5) * 360, ty = at ? at[1] : C.y + (RNG.sim() - .5) * 220;
    const fx = clamp(tx + (RNG.sim() - .5) * 200, Rink.X0 + 60, Rink.X1 - 60), fy = RNG.sim() < .7 ? Rink.Y0 - 90 : Rink.Y1 + 60;
    const v = E.arc({ x: fx, y: fy, z: 40 }, { x: tx, y: ty, z: 0 }, 500, { apex: 90 });
    const it = { kind: k, x: fx, y: fy, z: 40, vx: v.vx, vy: v.vy, vz: v.vz, t: 0, life: 12, flying: true, haz: k === 'octopus' || k === 'rat' };
    if (it.haz) M.hazards.push(it); else M.items.push(it);
    Bus.emit('item_throw', { kind: k, x: tx, y: ty });
    return it;
  }
  function step(dt) {
    if (!M.cfg.noItems) {
      M.throwT -= dt * (M.cheats.octorain ? 4 : 1);
      if (M.throwT <= 0) { M.throwT = T.itemEvery * (.7 + RNG.sim() * .6); const haz = M.arena.hazards.filter(h => h === 'octopus' || h === 'rat'); throwOne(M.cheats.octorain ? 'octopus' : haz.length && RNG.sim() < .3 ? U.pick(RNG.sim, haz) : null); }
    }
    for (const list of [M.items, M.hazards]) for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i]; it.t += dt;
      if (it.flying) { it.vz -= 500 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; if (it.z <= 0) { it.z = 0; it.flying = false; it.vx *= .4; it.vy *= .4; if (it.kind === 'octopus') Bus.emit('octopus_land', { x: it.x, y: it.y }); } continue; }
      it.x += it.vx * dt; it.y += it.vy * dt; it.vx *= Math.exp(-dt * 2); it.vy *= Math.exp(-dt * 2); Rink.clamp(it, 4);
      if (it.kind === 'rat') { it.rt = (it.rt || 0) - dt; if (it.rt <= 0) { it.rt = .5 + RNG.sim(); const a = RNG.sim() * TAU; it.vx = Math.cos(a) * 70; it.vy = Math.sin(a) * 70; } if (it.t > 10) { list.splice(i, 1); continue; } }
      if (!it.haz && it.t > it.life) { list.splice(i, 1); continue; }
      for (const s of M.skaters) {
        if (s.off || !Skater.free(s) && s.state !== 'skate') continue;
        const d = Math.hypot(s.x - it.x, s.y - it.y);
        if (!it.haz && d < 12) { grab(s, it); list.splice(i, 1); break; }
        if (it.haz && d < 10 && Math.hypot(s.vx, s.vy) > 40 && (s.state === 'skate' || s.state === 'check') && !(s.items.poutine > 0)) { s.state = 'slip'; s.stateT = 0; if (M.puck.owner === s) Skater.release(s, s.vx, s.vy, 0, 'slip'); Bus.emit('hazard', { kind: it.kind, victim: s.id, team: s.team, x: s.x, y: s.y }); if (it.kind === 'rat') { list.splice(i, 1); break; } }
      }
    }
    // thin ice: a skater in a hole is frozen; holes refreeze after 30 s
    for (const p of M.ice) {
      if (p.hole) { p.t += dt; if (p.t > 30) { p.hole = false; p.hp = 60; p.refrozen = true; } else for (const s of M.skaters) if (!s.off && s.state !== 'frozen' && s.state !== 'bin' && s.state !== 'fight' && inPatch(p, s.x, s.y, .7)) { s.state = 'frozen'; s.stateT = 0; s.vx = s.vy = 0; s.hole = p; if (M.puck.owner === s) Skater.release(s, 0, 0, 0, 'drop'); Bus.emit('plunge', { victim: s.id, team: s.team, x: s.x, y: s.y }); } }
    }
    mascot(dt); drop(dt);
    for (const s of M.skaters) if (M.cheats.magnet && s.human && !M.puck.owner && !M.puck.held && Math.hypot(M.puck.x - s.x, M.puck.y - s.y) < 160) { const p = M.puck, dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * 600 * dt; p.vy += dy / d * 600 * dt; }
  }
  function grab(s, it) {
    const k = it.kind, d = ITEMS[k] || { dur: 8 };
    if (k === 'boombox') Boom.add(s.team, 40);
    else if (k === 'bricks') { const g = M.goalies[s.team]; g.bricks = d.dur; }
    else if (k === 'lumber') { s.items.lumber = 1; s.items.lumberShots = 3; }
    else s.items[k] = d.dur;
    if (k === 'hotsauce' || k === 'cocoa') s.turbo = 1;
    Bus.emit('item', { by: s.id, team: s.team, kind: k, name: s.name, item: (ITEMS[k] || {}).name || k, x: it.x, y: it.y });
  }
  const inPatch = (p, x, y, k = 1) => Math.pow((x - p.x) / (p.rx * k), 2) + Math.pow((y - p.y) / (p.ry * k), 2) < 1;
  const holeAt = (x, y) => M && M.ice && M.ice.some(p => p.hole && inPatch(p, x, y, .7));
  /** a knockdown (or big hit) on a thin-ice patch costs it integrity; at 0 it breaks */
  function hitOnIce(s, imp) {
    for (const p of M.ice) if (!p.hole && inPatch(p, s.x, s.y)) {
      p.hp -= imp >= T.knockdown + 40 ? 100 : 50;
      Bus.emit('ice_crack', { patch: p.i, hp: p.hp, x: p.x, y: p.y });
      if (p.hp <= 0) { p.hole = true; p.t = 0; Bus.emit('thin_ice_break', { patch: p.i, victim: s.id, victimTeam: s.team, x: p.x, y: p.y, name: s.name }); }
    }
  }
  Bus.on('stop', e => { if (!M || !M.ice) return; const s = M.byId[e.by]; for (const p of M.ice) if (!p.hole && s && inPatch(p, e.x, e.y)) { p.hp -= 12; Bus.emit('ice_crack', { patch: p.i, hp: p.hp, x: p.x, y: p.y }); if (p.hp <= 0) { p.hole = true; p.t = 0; Bus.emit('thin_ice_break', { patch: p.i, victim: s.id, victimTeam: s.team, x: p.x, y: p.y, name: s.name }); } } });
  function breakIce(i) { const p = M.ice[i || 0]; if (!p) return false; p.hp = 0; p.hole = true; p.t = 0; Bus.emit('thin_ice_break', { patch: p.i, victimTeam: 1, x: p.x, y: p.y, name: 'the ice' }); return true; }
  function popOut(s) { const p = s.hole; if (!p) return; const a = Math.atan2(s.y - p.y, s.x - p.x); s.x = p.x + Math.cos(a) * (p.rx + 10); s.y = p.y + Math.sin(a) * (p.ry + 10); s.hole = null; Rink.clamp(s, 8); }
  function refreeze() { if (M && M.ice) for (const p of M.ice) { p.hole = false; p.hp = 100; } }
  /* Polar Pete skates figure eights in the neutral zone; he can be checked */
  function mascot(dt) {
    const m = M.mascot; if (!m) return;
    m.t += dt;
    if (m.down > 0) { m.down -= dt; m.vx *= .95; m.vy *= .95; if (m.down <= 0) Bus.emit('mascot_up', {}); }
    else { const tx = C.x + Math.sin(m.t * .5) * 90, ty = C.y + Math.sin(m.t) * 70, dx = tx - m.x, dy = ty - m.y; m.vx += (dx * 2 - m.vx) * dt * 2; m.vy += (dy * 2 - m.vy) * dt * 2; }
    m.x += m.vx * dt; m.y += m.vy * dt; Rink.clamp(m, 9);
    if (Math.hypot(m.vx, m.vy) > 5) m.facing = Math.atan2(m.vy, m.vx);
    for (const s of M.skaters) {
      if (s.off || s.state === 'bin' || s.state === 'fight') continue;
      const dx = m.x - s.x, dy = m.y - s.y, d = Math.hypot(dx, dy); if (d >= 16 || d < .01) continue;
      const nx = dx / d, ny = dy / d; m.x = s.x + nx * 16; m.y = s.y + ny * 16;
      if (m.down <= 0 && (s.state === 'check' || Math.hypot(s.vx, s.vy) > 160)) { m.down = 3; m.vx = nx * 160; m.vy = ny * 160; Bus.emit('mascot_down', { by: s.id, team: s.team, name: s.name, x: m.x, y: m.y }); }
      else { const vn = s.vx * nx + s.vy * ny; if (vn > 0) { s.vx -= vn * nx * 1.2; s.vy -= vn * ny * 1.2; } }
    }
    const pk = M.puck; if (!pk.owner && !pk.held && Math.hypot(pk.x - m.x, pk.y - m.y) < 9 && pk.z < 14) { const nx = (pk.x - m.x) / 9, ny = (pk.y - m.y) / 9, vn = pk.vx * nx + pk.vy * ny; if (vn < 0) { pk.vx -= 1.6 * vn * nx; pk.vy -= 1.6 * vn * ny; } }
    m.rig.update(dt, { x: m.x, y: m.y, z: 0, vx: m.vx, vy: m.vy, facing: m.facing, down: m.down > 0 ? Math.min(1, (3 - m.down) * 4) : 0, pose: m.down <= 0 && Math.sin(m.t * 2) > .7 ? 'wave' : null });
  }
  /* the Discount Drop: a claw lowers a crate to center ice every 40 s; it breaks into a power-up */
  function drop(dt) {
    if (!M.arena.hazards.includes('drop')) return;
    M.dropT -= dt;
    if (M.dropT <= 0 && !M.crate) { M.dropT = 40; M.crate = { x: C.x + (RNG.sim() - .5) * 60, y: C.y + (RNG.sim() - .5) * 60, z: 120, t: 0 }; Bus.emit('drop_start', {}); }
    const c = M.crate; if (!c) return;
    c.t += dt; c.z = Math.max(0, 120 - c.t * 50);
    if (c.z <= 0) for (const s of M.skaters) if (!s.off && Math.hypot(s.x - c.x, s.y - c.y) < 16) { Bus.emit('crate_break', { x: c.x, y: c.y }); const k = U.pick(RNG.sim, ['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox']); M.items.push({ kind: k, x: c.x, y: c.y, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 12 }); M.crate = null; break; }
  }
  /** at a stoppage the referee collects the octopi, the crew sweeps hats, and techs replace broken glass */
  function atStoppage() {
    if (!M) return;
    if (M.hazards.some(h => h.kind === 'octopus')) { M.refs[0].twirl = 1.5; Bus.emit('octopus_twirl', {}); }
    M.hazards = M.hazards.filter(h => h.kind !== 'octopus' && h.kind !== 'rat');
    if (M.hats && M.hats.length) M.hats = [];
    for (const p of Rink.panels) if (p.state !== 'ok') { M.techs.push({ panel: p.i, t: 1.5 }); p.state = 'ok'; Bus.emit('glass_fixed', { panel: p.i }); }
    M.gear = [];
  }
  /** hats rain after a hat trick */
  Bus.on('hat_trick', () => { if (!M) return; for (let i = 0; i < 30; i++) { const x = Rink.X0 + 40 + RNG.fx() * (Rink.X1 - Rink.X0 - 80), y = Rink.Y0 + 20 + RNG.fx() * (Rink.Y1 - Rink.Y0 - 40); M.hats.push({ x, y, z: 60 + RNG.fx() * 80, vz: -40, c: ['#c83a2a', '#2a5a9a', '#e8b43a', '#3a8a4a', '#f0f0f0', '#141414'][i % 6], t: RNG.fx() }); } });
  Bus.on('goal', e => { if (M && M.arena.hazards.includes('octopus') && RNG.fx() < (M.arena.id === 'grindhouse' ? .6 : .2)) throwOne('octopus'); if (M && RNG.sim() < .25 && !M.cfg.noItems) M.throwT = Math.min(M.throwT, 3); });
  return { reset, step, throwOne, grab, holeAt, hitOnIce, breakIce, popOut, refreeze, atStoppage, inPatch };
})();

// ---- 31-camera.js ----
/* ---- Cam: the broadcast director. Follows the puck with a lead; brawler view for fights, replays and intros (PLAN 7.15) ---- */
const Cam = (() => {
  let zoom = 1, fx = 560, fy = 400, free = null;
  const DIST = { Near: .85, Normal: .7, Far: .58 };
  const playView = () => S().camera === 'Overhead' ? 'topdown' : 'threequarter';
  function apply(view, z) {
    if (!game.view || game.view.id !== view) game.setView(view);
    z = Math.round(z * 20) / 20;   // a few zoom steps: each one bakes the floor once
    if (Math.abs(z - zoom) > .001 || Math.abs(game.zoom - z) > .02) { zoom = z; game.setZoom(z); }
  }
  function update(dt) {
    if (!M) return;
    const ph = M.phase, p = M.puck, base = DIST[S().camDist] || 1;
    let v = playView(), z = base, tx = p.x, ty = p.y, tz = 0;
    if (free) { free.x += free.mx * 300 * dt; free.y += free.my * 300 * dt; return game.focus(free.x, free.y, 0); }
    if (ph === 'fight' && M.fight) { v = 'brawler'; z = 1.15; tx = M.fight.mx; ty = M.fight.my; tz = 14; }
    else if (ph === 'replay') { v = 'brawler'; z = .95; const f = Replay.focus(); tx = f[0]; ty = f[1]; tz = 6; }
    else if (ph === 'intro') { v = 'brawler'; z = 1.05; const s = M.skaters[Math.max(0, M.introI)] || M.skaters[0]; tx = s.x; ty = s.y + 10; tz = 14; }
    else if (ph === 'goal' && M.phaseT > .4 && M.lastGoal) { z = base * 1.3; const s = M.byId[M.lastGoal.by]; if (s) { tx = s.x; ty = s.y; } }
    else if (ph === 'final') { z = base * 1.15; tx = Rink.C.x; ty = Rink.C.y; }
    else if (ph === 'faceoff') { z = base * 1.1; tx = M.foDot[0]; ty = M.foDot[1]; }
    else {
      const c = p.owner || p, lead = .25;
      tx = c.x + (p.owner ? p.owner.vx : p.vx) * lead; ty = c.y + (p.owner ? p.owner.vy : p.vy) * lead;
      const hs = M.humans.filter(h => h.s && !h.remote && !h.local === false);
      const locals = M.humans.filter(h => h.s && !h.remote);
      if (locals.length === 1) { const s = locals[0].s, d = Math.hypot(s.x - tx, s.y - ty); if (d > 220) { tx += (s.x - tx) * .25; ty += (s.y - ty) * .25; } }
      else if (locals.length > 1) {
        let x0 = tx, x1 = tx, y0 = ty, y1 = ty; for (const h of locals) { x0 = Math.min(x0, h.s.x); x1 = Math.max(x1, h.s.x); y0 = Math.min(y0, h.s.y); y1 = Math.max(y1, h.s.y); }
        tx = (x0 + x1) / 2; ty = (y0 + y1) / 2; const span = Math.max((x1 - x0) / 380, (y1 - y0) / 220); z = Math.max(.5, base * clamp(1 / Math.max(1, span), .78, 1));
      }
      if (Math.hypot(p.vx, p.vy) > 400 && !p.owner) z = Math.max(.5, Math.min(z, base * .9));
      void hs;
    }
    fx += (tx - fx) * Math.min(1, dt * 7); fy += (ty - fy) * Math.min(1, dt * 7);
    apply(v, z);
    game.focus(fx, fy, tz);
  }
  return { update, apply, playView, reset() { zoom = 0; }, get free() { return free; }, set free(v) { free = v; }, snap(x, y) { fx = x; fy = y; } };
})();

/* ---- Replay: an 8 s ring buffer recorded at 60 Hz; goal replays at half speed, big-hit and KABOOM clips at the next stoppage,
 * and the run's best clips for the end credits (PLAN 7.16) ---- */
const Replay = (() => {
  const MAX = 480, buf = [];
  let tick = 0, play = null, goalMark = null, pending = [];
  const FX_EVENTS = { goal: 1, hit: 1, glass: 1, post: 1, save: 1, blast: 1, kaboom_shot: 1, shot: 1 };
  let evq = [];
  Bus.on('*', e => { if (FX_EVENTS[e.type] && !play) evq.push(e); });
  function reset() { buf.length = 0; tick = 0; play = null; goalMark = null; pending = []; evq = []; }
  function frame() {
    const f = { t: M.t, ev: evq, p: [M.puck.x, M.puck.y, M.puck.z, M.puck.onFire ? 1 : 0, M.puck.inNet ? 1 : 0], s: [], g: [] }; evq = [];
    for (const s of M.skaters) f.s.push([s.x, s.y, s.vx, s.vy, s.facing, s.state, s.stateT, s.act ? s.act.kind : null, s.act ? s.act.t : 0, s.winding, s.charge, s.phaseA, s.holdTurbo, s.celebrate, s.off, s.spinA || 0]);
    for (const g of M.goalies) f.g.push([g.x, g.y, g.facing, g.state, g.stateT, g.vy || 0]);
    return f;
  }
  function record() {
    if (!M || play) return;
    if ((tick++ & 1) === 0) { buf.push(frame()); if (buf.length > MAX) buf.shift(); }
    for (let i = pending.length - 1; i >= 0; i--) { const c = pending[i]; if (M.t >= c.at + 1) { pending.splice(i, 1); const frames = buf.filter(f => f.t >= c.at - 2 && f.t <= c.at + 1); if (frames.length > 20) { M.clips.push({ kind: c.kind, score: c.score, frames }); M.pendingReplay = true; keepHighlight({ kind: c.kind, score: c.score, frames }); } } }
  }
  function markClip(kind, score) { if (!M || play || M.attract) return; if (pending.some(c => M.t - c.at < 2)) return; pending.push({ kind, at: M.t, score }); }
  function markGoal() { if (!M) return; goalMark = M.t; }
  let highlights = [];
  function keepHighlight(c) { if (!M || !M.cfg.chapter) return; c.cfg = { home: M.cfg.home, away: M.cfg.away, arena: M.cfg.arena }; highlights.push(c); highlights.sort((a, b) => b.score - a.score); highlights = highlights.slice(0, 3); }
  function start(frames, speed) { if (!frames.length) return false; play = { frames, i: 0, u: 0, speed, t: 0 }; return true; }
  function playGoal(sec) {
    const t0 = (goalMark || M.t) - sec, frames = buf.filter(f => f.t >= t0 && f.t <= (goalMark || M.t) + .8);
    if (M.lastGoal && M.cfg.chapter) keepHighlight({ kind: 'goal', score: 400 + (M.lastGoal.kind === 'kaboom' ? 200 : 0), frames: frames.slice() });
    if (!start(frames, .5)) return; play.kind = 'goal';
  }
  function playClip() { const c = M.clips.sort((a, b) => b.score - a.score)[0]; M.clips = []; if (!c || !start(c.frames, .5)) { play = null; return; } play.kind = c.kind; }
  function apply(f, dt) {
    M.puck.x = f.p[0]; M.puck.y = f.p[1]; M.puck.z = f.p[2]; M.puck.onFire = !!f.p[3]; M.puck.inNet = !!f.p[4]; M.puck.owner = null; M.puck.held = false;
    M.skaters.forEach((s, i) => { const a = f.s[i]; if (!a) return; [s.x, s.y, s.vx, s.vy, s.facing, s.state, s.stateT] = a; s.act = a[7] ? { kind: a[7], t: a[8] } : null; s.winding = a[9]; s.charge = a[10]; s.phaseA = a[11]; s.holdTurbo = a[12]; s.celebrate = a[13]; s.off = a[14]; s.spinA = a[15]; Match.rigStep(s, dt); });
    M.goalies.forEach((g, i) => { const a = f.g[i]; if (!a) return; [g.x, g.y, g.facing, g.state, g.stateT, g.vy] = a; g.rig.hk = g.rig.hk || { mode: 'goalie' }; g.rig.hk.state = g.state; g.rig.update(dt, { x: g.x, y: g.y, z: 0, vx: 0, vy: g.vy, facing: g.facing, down: g.state === 'blasted' ? Math.min(1, g.stateT * 3) : 0 }); });
    for (const e of f.ev) Fx.event(e, true);
  }
  function step(dt) {
    if (!play) return;
    play.t += dt;
    if (UI.anyPressed('confirm') || UI.anyPressed('pass') || (M.cfg.session && play.t > 3.2)) { game.players.forEach(p => p.consumeAll()); play.i = play.frames.length; return; }
    play.u += dt * 60 * play.speed;
    while (play.u >= 1 && play.i < play.frames.length) { play.u -= 1; apply(play.frames[play.i], 1 / 60 * play.speed); play.i++; }
    Cam.update(dt);
  }
  const done = () => !play || play.i >= play.frames.length;
  function stop() { play = null; }
  const focus = () => [M.puck.x, M.puck.y];
  /** the end credits: a highlight's frames played back on a match built for them */
  return { reset, record, markClip, markGoal, playGoal, playClip, step, done, stop, focus, start, apply, get playing() { return !!play; }, get kind() { return play && play.kind; }, get highlights() { return highlights; }, clearHighlights() { highlights = []; } };
})();

// ---- 33-talk.js ----
/* ---- Talk: the booth (Chuck Wallop and Moose Plunkett), Coach Marge's tips, chirp bubbles; every line babbles (PLAN 7.17) ---- */
const Talk = (() => {
  const box = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a', nameColor: '#ffd36a' });
  const PRIO = { goal: 3, onetimer: 3, kaboomgoal: 3, fight: 3, kaboom: 3, glass: 3, hattrick: 3, fightend: 2, bighit: 2, vault: 3, organ: 3, boost: 3, mascot: 2, thinice: 2, period: 3, shootout: 3, overtime: 3, powerplay: 2, save: 1, post: 2, octopus: 1, item: 1, deke: 1, slap: 1, rush: 0, faceoff: 1, turtle: 2, twister: 2, filler: 0 };
  let lastT = -9, lastType = {}, lastLine = {}, quiet = 0, tip = null, tipT = 0, cur = 0;
  const vars = e => {
    const nm = id => id && M && M.byId[id] ? M.byId[id].name : '';
    const team = e.team !== undefined && M && e.team >= 0 ? M.teams[e.team].short : '';
    return Object.assign({ name: e.name || nm(e.by), victim: nm(e.victim) || e.vname || '', team, goalie: e.goalie && M ? (M.byId[e.goalie] || {}).name : '', a: e.an || nm(e.a), b: e.bn || nm(e.b),
      winner: e.winnerName || '', loser: e.loserName || '', item: e.item || '', arena: M ? M.arena.name : '', home: M ? M.teams[0].short : '', away: M ? M.teams[1].short : '',
      hs: M ? M.score[0] : 0, as: M ? M.score[1] : 0, period: M ? Match.periodName(e.n || M.period).toLowerCase() : '' }, {});
  };
  function say(type, e = {}) {
    if (!M || M.cfg.noTalk || S().commentary === false) return;
    const pool = TEXT.talk[type]; if (!pool) return;
    const pr = PRIO[type] || 0, now = M.t;
    if (pr < 3 && now - lastT < 1.2) return;
    if (now - (lastType[type] || -99) < (pr >= 3 ? 1 : 6)) return;
    if (box.open && pr < 2 && cur >= pr) return;
    const choices = pool.filter(l => now - (lastLine[l[1]] || -999) > 120), line = U.pick(RNG.fx, choices.length ? choices : pool);
    lastLine[line[1]] = now; lastType[type] = now; lastT = now; quiet = 0; cur = pr;
    const who = line[0] === 'm' ? 'moose' : 'chuck', c = Rigs.cast(who), text = U.fill(line[1], vars(e));
    sayAs(who, text);
    if (Net.isHost()) Net.talk(type, pool.indexOf(line), who, text);
  }
  function sayAs(who, text) {
    const c = Rigs.cast(who);
    box.voice = Synth.dialogVoice(c.voice);
    box.say(text, { name: c.name, portrait: c.rig, portraitSize: 26, portraitOpts: { zoom: 2.2, turn: .5 }, auto: 2.6, modal: false, alpha: .78 });
  }
  /* Coach Marge's tips: once each per save, in a banner under the score bug */
  function showTip(id) {
    if (!M || M.attract || HUB || S().tips === false || Save.data.tips[id] || !TEXT.tips[id]) return;
    if (!M.humans.some(h => !h.remote)) return;
    Save.data.tips[id] = 1; Save.write(); tip = TEXT.tips[id]; tipT = 6;
    Synth.babble(tip.replace(/\{\w+\}/g, ''), 'marge', { maxSyl: 12, vol: .7 });
  }
  const human = id => M && M.byId[id] && M.byId[id].human && !M.byId[id].human.remote;
  const on = (t, fn) => Bus.on(t, e => { if (M && !Replay.playing) fn(e); });
  on('match_start', () => { lastT = -9; lastType = {}; tip = null; setTimeout0(() => showTip('skate')); });
  on('faceoff_won', e => { if (M.phaseT < .1 && (M.fo[0] + M.fo[1]) % 4 === 1) say('faceoff', e); });
  on('possession', e => { if (human(e.by)) { showTip('pass'); if (Save.data.tips.pass) showTip('shoot'); } const s = M.byId[e.by]; if (s && Math.hypot(s.vx, s.vy) > 130 && RNG.fx() < .25) say('rush', e); });
  on('slap', e => say('slap', e));
  on('goal', e => say(e.kind === 'kaboom' ? 'kaboomgoal' : e.kind === 'onetimer' ? 'onetimer' : 'goal', e));
  on('save', e => { if (e.kind !== 'cover' && RNG.fx() < .6) say('save', e); });
  on('post', e => say('post', e));
  on('hit', e => { if (e.big) say('bighit', e); });
  on('glass', e => { if (e.state === 'shattered') say('glass', Object.assign({}, e, { victim: '' })); });
  on('fight_start', e => { say('fight', e); if (human(e.a) || human(e.b)) showTip('fight'); });
  on('fight_end', e => { if (!e.draw) say('fightend', e); });
  on('turtle', e => say('turtle', e));
  on('kaboom_start', e => say('kaboom', e));
  on('hat_trick', e => say('hattrick', e));
  on('period_end', e => say('period', e));
  on('powerplay', e => { say('powerplay', e); if (M.humans.some(h => h.team === e.team)) showTip('powerplay'); });
  on('item', e => { say('item', e); });
  on('item_throw', () => showTip('items'));
  on('hazard', e => { if (e.kind === 'octopus') say('octopus', e); });
  on('mascot_down', e => say('mascot', e));
  on('thin_ice_break', e => say('thinice', Object.assign({}, e, { victim: e.name })));
  on('deke_beat', e => say('deke', e));
  on('shootout_start', e => { say('shootout', e); showTip('shootout'); });
  on('ot_start', e => say('overtime', e));
  on('boost_start', e => say('boost', e));
  on('organ_boost', e => say('organ', e));
  on('vault_cracked', e => say('vault', e));
  on('twister', e => say('twister', e));
  on('pass', e => { if (M.byId[e.to] && human(e.to)) showTip('onetimer'); });
  on('intercept', e => { if (M.humans.some(h => h.team !== e.team)) showTip('defense'); });
  on('gloves_prompt', () => showTip('gloves'));
  on('boom', () => {});
  on('chirp', e => { const s = M.byId[e.by]; if (s) Synth.babble(e.line, (s.def.look && s.def.look.voice) || M.teams[s.team].voice, { maxSyl: 14, vol: .8 }); });
  on('intro', e => { const s = M.byId[e.by]; if (s) Synth.babble('number ' + e.num + ' ' + e.name, 'chuck', { maxSyl: 10 }); });
  let pending0 = [];
  function setTimeout0(fn) { pending0.push(fn); }
  function update(dt) {
    while (pending0.length) pending0.shift()();
    box.update(dt);
    if (!box.open) cur = 0;
    if (!M) return;
    quiet += dt; tipT = Math.max(0, tipT - dt);
    if (M.phase === 'play' && quiet > 8 && RNG.fx() < dt * .5) say('filler', {});
    if (M.phase === 'play') {
      if (M.t > 25) showTip('saucer'); if (M.t > 40) showTip('chirp');
      for (const h of M.humans) if (h.s && !h.remote) { if (M.puck.owner === h.s && M.skaters.some(o => o.team !== h.team && Math.hypot(o.x - h.s.x, o.y - h.s.y) < 30)) showTip('deke'); if (M.boom[h.team] > 50) showTip('boom'); }
    }
  }
  function draw(r) { if (S().subtitles !== false) box.draw(r); }
  return { say, sayAs, update, draw, showTip, box, get tip() { return tipT > 0 ? tip : null; }, get tipT() { return tipT; }, close() { box.close(); tip = null; tipT = 0; } };
})();

// ---- 34-hud.js ----
/* ---- Hud: the score bug, BOOM meters, power play, player markers, radar, prompts, banners, the fight HUD, lower-thirds (PLAN 7.18) ---- */
const Hud = (() => {
  const GOLD = '#ffd36a';
  let lower = null, gloveT = 0;
  Bus.on('whistle', () => { if (!M || M.attract) return; lower = { t: 0, life: 3 }; });
  const safe = r => ({ x0: Math.round(r.W * .04), y0: Math.round(r.H * .04), x1: Math.round(r.W * .96), y1: Math.round(r.H * .96) });
  function logoChip(g, team, x, y, size = 12) { const t = M.teams[team], spr = LOGOS.sprite(t.logo); if (spr) px.sprite(g, spr, x, y, { scale: size / 24 }); }
  /** world-space markers: the ring under each human, chevrons, P-tags, turbo, the shot meter, chirp bubbles, items */
  function world(r) {
    if (!M) return;
    for (const h of M.humans) {
      const s = h.s; if (!s || s.off || s.state === 'bin') continue;
      const col = h.color || E.PLAYER_COLORS[h.i] || GOLD;
      r.decal(g => { r.groundRing && r.groundRing(s.x, s.y, 9, col, .9); });
      r.queue(s.x, s.y, 46, g => {
        const [x, y] = r.w(s.x, s.y, 44 + (s.def.build === 'bulky' ? 4 : 0)), X = Math.round(x), Y = Math.round(y);
        px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], col); px.poly(g, [[X - 2, Y - 4], [X + 2, Y - 4], [X, Y - 1]], '#ffffff');
        E.font.text(g, h.tag || ('P' + (h.i + 1)), X, Y - 14, col, { align: 'center', outline: '#000' });
        px.rect(g, X - 8, Y + 2, 16, 2, '#101418'); px.rect(g, X - 8, Y + 2, Math.round(16 * s.turbo), 2, s.items.hotsauce > 0 || M.kaboomT[s.team] > 0 ? '#ff7a2a' : '#5ad0ff');
        if (s.winding) { const full = s.charge >= .95; E.ui.bar(g, X - 12, Y - 22, 24, 4, s.charge, full ? (M.kaboomT[s.team] > 0 ? '#ff4a1a' : GOLD) : '#e8e8f0'); }
      }, { emissive: true });
      if (h.reticle && !h.remote) r.decal(g => { const [x, y] = r.w(h.reticle[0], h.reticle[1], 0), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 4, Y, 3, 1, col); px.rect(g, X + 2, Y, 3, 1, col); px.rect(g, X, Y - 3, 1, 2, col); px.rect(g, X, Y + 2, 1, 2, col); });
    }
    for (const s of M.skaters) {
      if (s.chirpT > 0 && !s.off) r.queue(s.x, s.y, 60, g => {
        const [x, y] = r.w(s.x, s.y, 52), lines = E.font.wrap(s.chirpText, 96, {}), w = Math.max(...lines.map(l => E.font.width(l))) + 8, h = lines.length * 9 + 6, X = Math.round(x - w / 2), Y = Math.round(y - h - 6);
        px.rect(g, X, Y, w, h, '#ffffff'); px.rect(g, X, Y, w, 1, '#c8c8d0'); px.poly(g, [[x - 3, Y + h], [x + 3, Y + h], [x, Y + h + 5]], '#ffffff');
        lines.forEach((l, i) => E.font.text(g, l, X + 4, Y + 3 + i * 9, '#1a1a22', { outline: false }));
      });
      const icons = Object.keys(s.items).filter(k => s.items[k] > 0 && ITEMS[k]);
      if (icons.length && !s.off) r.queue(s.x, s.y, 50, g => { const [x, y] = r.w(s.x, s.y, 50); icons.forEach((k, i) => { const X = Math.round(x - icons.length * 4 + i * 8), Y = Math.round(y - 4); px.disc(g, X + 3, Y + 3, 3, '#101418'); px.disc(g, X + 3, Y + 3, 2, ITEMS[k].color); }); }, { emissive: true });
    }
  }
  function scoreBug(g, r) {
    const W = 216, x = Math.round(r.W / 2 - W / 2), sf = safe(r), y = sf.y0 - 4;
    UI.panel(g, x, y, W, 30, { alpha: .9 });
    for (const t of [0, 1]) {
      const tm = M.teams[t], bx = t ? x + W - 92 : x + 4;
      px.rect(g, bx, y + 3, 88, 16, t === 0 ? tm.dark : tm.light); px.rect(g, bx, y + 18, 88, 1, tm.trim);
      logoChip(g, t, bx + (t ? 70 : 2), y + 3, 16);
      E.font.text(g, tm.abbr, bx + (t ? 8 : 22), y + 7, t === 0 ? '#ffffff' : '#141418', { outline: false });
      E.font.text(g, String(M.score[t]), bx + (t ? 50 : 50), y + 4, t === 0 ? '#ffffff' : '#141418', { scale: 2, outline: false, align: 'center' });
      // the BOOM meter: flames and a countdown in KABOOM
      const mx = bx + 4, my = y + 22, kb = M.kaboomT[t] > 0;
      px.rect(g, mx, my, 80, 5, '#0a0c12'); px.rect(g, mx, my + 1, Math.round(80 * (kb ? M.kaboomT[t] / T.kaboomTime : M.boom[t] / 100)), 3, kb ? (Math.floor(M.t * 10) % 2 ? '#ff4a1a' : '#ffd040') : M.boom[t] > 80 ? '#ffb347' : '#e8682a');
      if (kb) E.font.text(g, 'KABOOM ' + Math.ceil(M.kaboomT[t]), mx + 40, my - 1, '#ffffff', { font: 'tiny', align: 'center', outline: '#000' });
    }
    const per = M.so ? 'SO' : M.ot ? 'OT' : ['1ST', '2ND', '3RD', '4TH', '5TH'][M.period - 1] || '';
    E.font.text(g, per, r.W / 2, y + 4, GOLD, { align: 'center', outline: false });
    E.font.text(g, M.so ? '' : U.mmss(M.clock), r.W / 2, y + 13, M.clock < 10 && M.phase === 'play' ? '#ff6a5a' : '#ffffff', { align: 'center', outline: false });
    let py = y + 32;
    if (M.sinBin.length) for (const b of M.sinBin) {
      const t = 1 - b.s.team, txt = 'POWER PLAY ' + M.teams[t].abbr + '  ' + U.mmss(b.t) + '  (' + b.s.name + ')';
      const w = E.font.width(txt) + 12; UI.panel(g, r.W / 2 - w / 2, py, w, 12, { border: '#5a8ae8', alpha: .9 }); E.font.text(g, txt, r.W / 2, py + 3, '#c8e0ff', { align: 'center', outline: false }); py += 14;
    }
    return py;
  }
  function radar(g, r) {
    const w = 84, h = 38, sf = safe(r), x0 = sf.x1 - w, y0 = sf.y1 - h - (Talk.box.open ? 46 : 0), k = w / (Rink.X1 - Rink.X0 + 20);
    UI.panel(g, x0 - 2, y0 - 2, w + 4, h + 4, { alpha: .55, bg: ['#0a1828', '#081018'] });
    const mx = x => Math.round(x0 + (x - Rink.X0 + 10) * k), my = y => Math.round(y0 + (y - Rink.Y0 + 10) * k * 1.05);
    px.rect(g, mx(Rink.C.x), my(Rink.Y0), 1, Math.round((Rink.Y1 - Rink.Y0) * k * 1.05), '#a03030');
    for (const d of [-108, 108]) px.rect(g, mx(Rink.C.x + d), my(Rink.Y0), 1, Math.round((Rink.Y1 - Rink.Y0) * k * 1.05), '#3050a0');
    for (const side of [0, 1]) px.rect(g, mx(Rink.goalX(side)) - 1, my(Rink.C.y) - 2, 2, 4, '#e0e0e0');
    for (const s of M.skaters) { if (s.off || s.state === 'bin') continue; const c = s.team === 0 ? M.teams[0].dark : M.teams[1].light; if (s.human) { px.disc(g, mx(s.x), my(s.y), 2.5, s.human.color || GOLD); } px.rect(g, mx(s.x) - 1, my(s.y) - 1, 3, 3, c); }
    px.rect(g, mx(M.puck.x), my(M.puck.y), 1, 1, '#ffffff');
  }
  function prompts(g, r, y) {
    const sf = safe(r);
    let text = null;
    const p = M.puck;
    for (const h of M.humans) {
      const s = h.s; if (!s || h.remote) continue;
      if (M.challenge && M.challenge.to === s) text = 'HOLD {lob} TO ACCEPT  (' + Math.ceil(M.challenge.t) + ')';
      else if (p.passTo === s && !p.owner && M.phase === 'play') text = '{shoot} ONE-TIMER!';
      else if (M.phase === 'play' && p.owner !== s && Skater.free(s)) {
        const riv = M.skaters.find(o => o.team !== s.team && Skater.free(o) && Math.hypot(o.x - s.x, o.y - s.y) < 40 && Math.max(o.grudge[s.id] || 0, s.grudge[o.id] || 0) >= T.fightGrudge);
        if (riv && M.fights < T.fightMax) { text = 'HOLD {lob}  DROP THE GLOVES'; if ((gloveT += 1) === 1) Bus.emit('gloves_prompt', {}); }
      }
    }
    if (M.phase === 'replay') text = '{pass} SKIP';
    if (M.phase === 'intro') text = '{pass} SKIP';
    if (M.phase === 'faceoff' && M.humans.some(h => !h.remote)) text = M.phaseT < M.foDrop ? 'FACEOFF: {pass} AS THE PUCK DROPS' : '{pass} NOW!';
    if (M.phase === 'intermission') text = '{pass} DRIVE THE FLOOD WAGON    {deke} SKIP';
    if (text) { const yy = Talk.box.open ? sf.y1 - 64 : sf.y1 - 22, w = Glyphs.text(null, text, 0, 0) + 16; UI.panel(g, r.W / 2 - w / 2, yy - 5, w, 17, { alpha: .88, border: GOLD }); Glyphs.text(g, text, r.W / 2, yy, '#ffffff', { align: 'center' }); }
    // off-screen arrows for humans
    for (const h of M.humans) {
      const s = h.s; if (!s || h.remote || s.off) continue;
      const [x, y2] = r.w(s.x, s.y, 20); if (x > 6 && x < r.W - 6 && y2 > 6 && y2 < r.H - 6) continue;
      const X = clamp(x, 10, r.W - 10), Y = clamp(y2, 10, r.H - 10), a = Math.atan2(y2 - Y, x - X), col = h.color || GOLD;
      px.poly(g, [[X + Math.cos(a) * 6, Y + Math.sin(a) * 6], [X + Math.cos(a + 2.4) * 5, Y + Math.sin(a + 2.4) * 5], [X + Math.cos(a - 2.4) * 5, Y + Math.sin(a - 2.4) * 5]], col);
    }
  }
  function bannerDraw(g, r) {
    const b = Fx.banner; if (!b) return;
    const rm = S().motion === false || S().reduceMotion, k = Math.min(1, b.t * 6), sh = rm ? 0 : Math.max(0, .3 - b.t) * 10, sc = b.text.length > 7 ? 3 : 4;
    const y = Math.round(r.H * .3 + (rm ? 0 : (1 - k) * -30)), dx = Math.round(Math.sin(b.t * 60) * sh);
    UI.title(g, b.text, r.W / 2 + dx, y, sc, b.colors);
    if (b.sub) UI.text(g, b.sub, r.W / 2, y + sc * 9 + 4, '#ffffff', { align: 'center', scale: 1 });
  }
  function fightHud(g, r) {
    const F = M.fight; if (!F) return;
    const sf = safe(r);
    [F.a, F.b].forEach((f, i) => {
      const x = i ? sf.x1 - 110 : sf.x0, y = sf.y0 + 34, s = f.s;
      UI.panel(g, x, y, 110, 44, { border: s.team === 0 ? M.teams[0].trim : M.teams[1].dark });
      s.rig.drawPortrait(g, i ? x + 72 : x + 4, y + 4, 34, { zoom: 2.6, turn: i ? -.5 : .5, bg: '#101420' });
      const bx = i ? x + 4 : x + 42;
      E.font.text(g, s.name.toUpperCase().slice(0, 11), bx, y + 5, '#ffffff', { outline: false });
      E.font.text(g, 'BAL', bx, y + 16, '#9fb0c8', { font: 'tiny', outline: false }); E.ui.bar(g, bx + 14, y + 16, 50, 5, Math.max(0, f.bal / T.fightBalance), '#ff5a4a');
      E.font.text(g, 'STA', bx, y + 25, '#9fb0c8', { font: 'tiny', outline: false }); E.ui.bar(g, bx + 14, y + 25, 50, 5, Math.max(0, f.sta / 100), '#5ad0ff');
      if (f.blind > 0) E.font.text(g, 'BLIND!', bx, y + 34, '#ffd040', { font: 'tiny', outline: false });
    });
    const human = [F.a, F.b].find(f => f.s.human && !f.s.human.remote);
    if (human) { const t = '{pass} JAB   {shoot} HAYMAKER   {deke} DUCK   {lob} YANK'; Glyphs.text(g, t, r.W / 2, safe(r).y1 - 22, '#ffffff', { align: 'center', input: human.s.human.input }); }
  }
  function shootoutHud(g, r) {
    const so = M.so; if (!so) return; const sf = safe(r), y = sf.y0 + 34;
    [0, 1].forEach(t => {
      const x = Math.round(r.W / 2 + (t ? 20 : -20 - 5 * 12)), res = so.results[t];
      for (let i = 0; i < Math.max(3, res.length); i++) { const v = res[i]; px.rect(g, x + i * 12, y, 10, 10, '#101418'); if (v === true) E.font.text(g, '✓'.replace('✓', 'O'), x + i * 12 + 5, y + 2, '#5ae05a', { align: 'center', outline: false }); else if (v === false) E.font.text(g, 'X', x + i * 12 + 5, y + 2, '#ff5a4a', { align: 'center', outline: false }); }
      E.font.text(g, M.teams[t].abbr, x + (t ? 64 : -22), y + 2, '#ffffff', { outline: false });
    });
    if (so.state === 'go') {
      const gl = M.goalies[1 - so.team];
      if (gl.manual && gl.human && !gl.human.remote) Glyphs.text(g, 'IN NET: {pass} BUTTERFLY  {shoot} POKE  {deke} DIVE', r.W / 2, sf.y1 - 22, '#ffffff', { align: 'center', input: gl.human.input });
      E.font.text(g, String(Math.max(0, Math.ceil(8 - so.t))), r.W / 2, y + 14, '#ffd36a', { align: 'center', scale: 2, outline: false });
    }
  }
  function lowerThird(g, r, dt) {
    if (!lower) return; lower.t += dt; if (lower.t > lower.life) { lower = null; return; }
    const sf = safe(r), w = 210, x = sf.x0, y = sf.y1 - 60 - (Talk.box.open ? 46 : 0), a = Math.min(1, lower.t * 5, (lower.life - lower.t) * 5);
    if (a <= 0) return;
    UI.panel(g, x - (1 - a) * 220, y, w, 40, { border: GOLD });
    const fo = M.fo[0] + M.fo[1], row = (lab, h, aw) => lab.padEnd(10) ;
    const X = x - (1 - a) * 220 + 6;
    E.font.text(g, M.teams[0].abbr, X + 70, y + 4, '#ffffff', { outline: false }); E.font.text(g, M.teams[1].abbr, X + 130, y + 4, '#ffffff', { outline: false });
    [['SHOTS', M.shots], ['HITS', M.hits], ['FACEOFFS', fo ? [Math.round(M.fo[0] / fo * 100) + '%', Math.round(M.fo[1] / fo * 100) + '%'] : ['-', '-']]].forEach(([lab, v], i) => {
      E.font.text(g, lab, X, y + 13 + i * 9, '#9fb0c8', { outline: false }); E.font.text(g, String(v[0]), X + 76, y + 13 + i * 9, '#ffffff', { outline: false, align: 'center' }); E.font.text(g, String(v[1]), X + 136, y + 13 + i * 9, '#ffffff', { outline: false, align: 'center' });
    });
    void row;
  }
  function tipBanner(g, r, y) {
    const tip = Talk.tip; if (!tip) return;
    const w = Math.min(r.W - 40, Glyphs.text(null, tip, 0, 0) + 54), x = Math.round(r.W / 2 - w / 2);
    UI.panel(g, x, y, w, 20, { border: '#c86ab0', alpha: .92 });
    Rigs.cast('marge').rig.drawPortrait(g, x + 3, y + 2, 16, { zoom: 1.8, turn: .4, bg: '#20142a' });
    Glyphs.text(g, tip, x + 24, y + 6, '#ffffff', {});
  }
  function draw(r, dt) {
    if (!M || M.hideHud) return;
    r.overlay(g => {
      if (M.phase === 'replay') {
        px.rect(g, 0, 0, r.W, 22, '#000000'); px.rect(g, 0, r.H - 22, r.W, 22, '#000000');
        const sf = safe(r); UI.panel(g, sf.x0, 26, 66, 16, { border: '#ff4a4a' }); E.font.text(g, 'REPLAY', sf.x0 + 33, 30, Math.floor(M.t * 3) % 2 ? '#ff6a5a' : '#ffffff', { align: 'center', outline: false });
        prompts(g, r); return;
      }
      if (M.attractHud) return;
      const y = scoreBug(g, r);
      tipBanner(g, r, y + 2);
      if (M.phase !== 'fight' && M.phase !== 'intro') radar(g, r);
      fightHud(g, r); shootoutHud(g, r); lowerThird(g, r, dt || 1 / 60);
      prompts(g, r, y);
      bannerDraw(g, r);
      if (M.phase === 'intro' && M.skaters[M.introI]) {
        const s = M.skaters[M.introI], sf = safe(r), w = 200;
        UI.panel(g, r.W / 2 - w / 2, sf.y1 - 70, w, 34, { border: M.teams[s.team].trim });
        UI.text(g, '#' + s.def.num + '  ' + s.def.name.toUpperCase(), r.W / 2, sf.y1 - 64, '#ffffff', { align: 'center' });
        UI.text(g, (s.def.role === 'C' ? 'CENTER' : s.def.role === 'D' ? 'DEFENSE' : 'WING') + '  ·  ' + M.teams[s.team].name.toUpperCase(), r.W / 2, sf.y1 - 52, '#9fb0c8', { align: 'center' });
      }
    });
  }
  return { world, draw, safe, logoChip };
})();

// ---- 35-fx.js ----
/* ---- Fx: the only place simulation events become particles, light, shakes, crowd reactions and sounds (PLAN 8) ---- */
const Fx = (() => {
  const flashes = [];   // timed lights: { x, y, z, r, i, color, t, life }
  const light = (x, y, z, r, i, color, life) => flashes.push({ x, y, z, r, i, color, t: 0, life });
  let banner = null;
  const setBanner = (text, colors, life = 2, sub) => { banner = { text, colors: colors || ['#ffffff', '#ffe08a', '#ffb347', '#e0662a'], t: 0, life, sub }; };
  function event(e, replay) {
    if (!M) return;
    const vol = replay ? .7 : 1;
    switch (e.type) {
      case 'shot': {
        A.sfx(e.kind === 'wrist' ? 'snap' : e.kind === 'onetimer' ? 'onetimer' : e.kind === 'kaboom' ? 'kaboom' : 'slap', { vol });
        if (e.kind === 'slap' || e.kind === 'onetimer' || e.kind === 'kaboom') { P.ring(e.x, e.y, 3, 22, '#e8f6ff', .3); P.dust(e.x, e.y, 0, 6); }
        if (e.kind === 'kaboom') { game.shake(4); game.flash('#ff8a3a', .1, .5); }
        Crowd.hype(.1); break;
      }
      case 'pass': A.sfx('thwap', { vol: .8 * vol }); break;
      case 'possession': A.sfx('tock', { vol: .6 * vol }); break;
      case 'battle': A.sfx('clack', { vol: .5 }); break;
      case 'stop': { A.sfx('hstop', { vol }); const s = M.byId[e.by]; if (s) { P.bits(e.x, e.y, 1, 8, ['#ffffff', '#e8f4ff', '#cfe6ff']); P.dust(e.x, e.y, 1, 6); } break; }
      case 'post': A.sfx(e.bar ? 'bar' : 'ping', { vol }); P.sparks(e.x, e.y, 10, 8); Crowd.react('ahh'); if (!replay) setBanner(e.bar ? 'CROSSBAR!' : 'POST!', ['#ffffff', '#d8e8ff', '#9ab8e8'], 1.2); break;
      case 'save': {
        A.sfx(e.kind === 'glove' ? 'thump' : 'boards', { vol: .7 * vol }); Crowd.hype(.15);
        const g = M.byId[e.goalie]; if (g) P.dust(g.x, g.y, 8, 6);
        if (!replay && e.kind !== 'cover' && RNG.fx() < .35) setBanner('SAVE!', ['#ffffff', '#c8f0ff', '#5ab0e8'], 1);
        break;
      }
      case 'boards': A.sfx(e.snow ? 'thump' : 'boards', { vol: Math.min(1, e.speed / 300) * vol }); if (e.snow) P.dust(e.x, e.y, 6, 8); break;
      case 'glass_hit': A.sfx('glassclack', { vol: Math.min(1, e.speed / 300) * vol }); { const p = Rink.panels[e.panel]; if (p) p.shake = .3; } break;
      case 'rattle': A.sfx('boards', { vol: .6 }); { const p = Rink.panelAt(e.x, e.y); if (p) p.shake = .4; } break;
      case 'hit': {
        const v = M.byId[e.victim];
        if (e.big) { A.sfx('bighit', { vol }); if (!replay) { game.hitFx(v.x, v.y, 14, { power: 1.4 }); game.shake(3); setBanner(e.accidental ? 'OOF!' : 'BIG HIT!', ['#ffffff', '#ffd0a0', '#ff6a3a', '#a01a1a'], 1.4); } P.bits(v.x, v.y, 4, 12, ['#ffffff', '#dff0ff']); Crowd.react('ohh'); Crowd.hype(.4); }
        else { A.sfx('thump', { vol }); P.dust(v.x, v.y, 4, 4); Crowd.hype(.1); }
        Synth.babble('oof', (v.def.look && v.def.look.voice) || 'mid', { maxSyl: 1, vol: .6 });
        break;
      }
      case 'glass': {
        const p = Rink.panels[e.panel];
        if (e.state === 'shattered') { A.sfx('shatter', { vol }); P.bits(p.m[0], p.m[1], 24, 30, ['#e8f8ff', '#bfe6ff', '#ffffff', '#9ad0f0']); game.shake(4); if (!replay) setBanner('THROUGH THE GLASS!', ['#ffffff', '#c8f0ff', '#5ab0e8', '#1a5a9a'], 2); Crowd.react('ohh'); Crowd.hype(.6); Crowd.flinch(p.m[0]); }
        else { A.sfx('crack', { vol }); P.bits(p.m[0], p.m[1], 26, 6, ['#e8f8ff', '#ffffff']); }
        break;
      }
      case 'goal': {
        A.sfx('horn'); Synth.goalSting(e.team === 0 ? M.cfg.home : M.cfg.away); Crowd.react('cheer'); Crowd.hype(1); Crowd.goal(e.team);
        const g = Skater.attackGoal(e.team); light(g.x + Rink.outDir(g.side) * 30, g.y, 40, 140, 1.4, '#ff2a2a', 3);
        if (!replay) { game.flash('#ffffff', .1, .4); setBanner(e.kind === 'kaboom' ? 'KA-BOOM GOAL!' : 'GOAL!', null, 2.6, e.name + (e.assists && e.assists.length ? '  (' + e.assists.map(a => M.byId[a] ? M.byId[a].name : '').join(', ') + ')' : '')); }
        P.sparks(M.puck.x, M.puck.y, 8, 20, null, { color: '#ffe08a' });
        if (e.kind === 'kaboom') { P.explosion(g.x, g.y, 10, 1.6); A.sfx('horn', { pitch: 1.26 }); for (let i = 0; i < 20; i++) P.bits(g.x, g.y, 20, 4, ['#ff3a3a', '#ffd040', '#3aff8a', '#5a8aff']); }
        break;
      }
      case 'blast': { P.explosion(e.x, e.y, 10, 1.2); A.sfx('kaboom', { vol }); game.shake(5); light(e.x, e.y, 10, 120, 1.5, '#ff8a2a', .6); break; }
      case 'kaboom_start': {
        if (replay) break; A.sfx('kaboom'); game.flash(e.gilded ? '#ffd040' : '#ff7a2a', .2, .8); game.shake(6); Crowd.react('chant'); Crowd.hype(1);
        setBanner(e.gilded ? 'GILDED MODE!' : 'KA-BOOM!', e.gilded ? ['#fffbe0', '#ffe070', '#d9a520', '#6a4a10'] : ['#ffffff', '#ffd040', '#ff7a1a', '#c01a1a'], 2.4, M.teams[e.team].short);
        const bx = Rink.C.x + (e.team ? 144 : -144); P.explosion(bx, Rink.Y0 - 10, 30, 1.4); Synth.layer('kaboom', true); Synth.layer('kaboom2', true); break;
      }
      case 'kaboom_end': if (M.kaboomT[0] <= 0 && M.kaboomT[1] <= 0) { Synth.layer('kaboom', false); Synth.layer('kaboom2', false); } break;
      case 'kaboom_shot': game.shake(3); break;
      case 'fight_start': if (!replay) { A.sfx('whistle'); setBanner('FIGHT!', ['#ffffff', '#ffd0d0', '#ff4a4a', '#8a0a0a'], 1.6); Synth.sting('fight'); Synth.layer('fight', true); Crowd.hype(1); Crowd.stand(true); } break;
      case 'fight_hit': { A.sfx('punch'); const v = M.byId[e.victim]; if (v) { P.impact ? P.impact(v.x, v.y, 26, 1, '#ffffff') : P.sparks(v.x, v.y, 26, 6); if (e.kind === 'hay' && e.big && RNG.fx() < .5) P.bits(v.x, v.y, 26, 1, ['#ffffff']); P.add && P.add({ kind: 'bit', x: v.x, y: v.y, z: 30, vx: 0, vy: 0, vz: 40, color: '#9ad0ff', life: .5 }); } game.shake(e.kind === 'hay' ? 3 : 1); break; }
      case 'fight_whiff': A.sfx('whoosh'); break;
      case 'jersey_over': setBanner('JERSEY OVER THE HEAD!', ['#ffffff', '#ffe08a', '#ffb347'], 1.4); break;
      case 'fight_end': Synth.layer('fight', false); Crowd.stand(false); if (!e.draw) { Crowd.react('cheer'); setBanner('K.O.!', ['#ffffff', '#ffd0d0', '#ff4a4a'], 1.4, e.winnerName + ' WINS'); A.sfx('twinkle'); } else setBanner('SEPARATED', null, 1.2); break;
      case 'sin_bin': setBanner('POWER PLAY', ['#ffffff', '#c8e0ff', '#5a8ae8'], 1.8, M.teams[1 - e.team].short); Synth.sting('sad'); break;
      case 'turtle': Crowd.react('boo'); setBanner('TURTLE!', ['#ffffff', '#d0ffd0', '#4ac04a'], 1.2); break;
      case 'item_throw': A.sfx('throw'); break;
      case 'item': A.sfx('pickup'); P.glints(e.x, e.y, 6, 10, (ITEMS[e.kind] || {}).color || '#ffffff'); P.text && P.text(e.x, e.y, 24, (ITEMS[e.kind] || {}).name || e.kind, '#ffe08a', { scale: 1 }); break;
      case 'octopus_land': A.sfx('splort'); break;
      case 'hazard': A.sfx('splort'); P.dust(e.x, e.y, 2, 6); Crowd.react('ohh'); break;
      case 'mascot_down': A.sfx('bighit'); Crowd.react('cheer'); setBanner('MASCOT DOWN!', ['#ffffff', '#c8ffff', '#18b5b0'], 1.6); P.bits(e.x, e.y, 10, 14, ['#ffffff', '#f4f8ff']); break;
      case 'thin_ice_break': A.sfx('splash'); A.sfx('crack'); P.bits(e.x, e.y, 2, 24, ['#e8f8ff', '#9ad0f0', '#3a6a9a']); game.shake(3); setBanner('THE ICE BROKE!', ['#ffffff', '#c8f0ff', '#3a8ad0'], 1.8); break;
      case 'ice_crack': A.sfx('crack'); break;
      case 'plunge': A.sfx('splash'); P.bits(e.x, e.y, 2, 14, ['#9ad0f0', '#ffffff']); Crowd.react('ohh'); break;
      case 'buried': A.sfx('thump'); P.dust(e.x, e.y, 6, 16); break;
      case 'hat_trick': setBanner('HAT TRICK!', ['#ffffff', '#ffe08a', '#ffb347'], 2.4); Crowd.react('cheer'); break;
      case 'hoser_hat_trick': UI.toast('HOSER HAT TRICK!', 'A goal, an assist and a fight'); break;
      case 'whistle': A.sfx(e.kind === 'out' ? 'whistle' : 'whistle1'); Synth.sting('walkup'); break;
      case 'faceoff_drop': A.sfx('tock'); break;
      case 'period_end': A.sfx('buzzer'); setBanner(e.n >= (M.cfg.periods) ? (M.score[0] === M.score[1] ? 'END OF REGULATION' : 'FINAL') : 'END OF ' + Match.periodName(e.n), null, 2.4, M.teams[0].abbr + ' ' + M.score[0] + ' - ' + M.score[1] + ' ' + M.teams[1].abbr); break;
      case 'ot_start': setBanner('OVERTIME', null, 2, 'Next goal wins'); break;
      case 'shootout_start': setBanner(M.so && M.so.showcase ? 'SHOOTOUT SHOWCASE' : 'SHOOTOUT', null, 2); break;
      case 'shootout_attempt': A.sfx(e.ok ? 'horn' : 'deny'); if (e.ok) Crowd.react('cheer'); else Crowd.react('ahh'); break;
      case 'final': A.sfx('horn'); A.sfx('buzzer'); setBanner('FINAL', null, 3, M.teams[0].abbr + ' ' + M.score[0] + ' - ' + M.score[1] + ' ' + M.teams[1].abbr); Crowd.react(e.winner === 0 ? 'cheer' : 'boo'); break;
      case 'deke': A.sfx('whoosh', { vol: .6 }); break;
      case 'deke_beat': Crowd.hype(.2); break;
      case 'chirp': A.sfx('zip', { vol: .5 }); break;
      case 'poke': A.sfx('clack', { vol: .7 }); break;
      case 'block': A.sfx('thump', { vol: .7 }); break;
      case 'boost_start': setBanner('GILDED BOOST!', ['#fffbe0', '#ffe070', '#d9a520'], 2, '"Synergy, boys!"'); A.sfx('zip'); break;
      case 'organ_boost': setBanner('DORIS! PLAY THE SONG!', ['#ffffff', '#ffe0ff', '#c86ab0'], 2.4); Synth.sting('charge'); Crowd.react('cheer'); Crowd.hype(1); break;
      case 'vault_cracked': setBanner('THE VAULT IS CRACKED!', ['#fffbe0', '#ffe070', '#d9a520'], 2.2); A.sfx('shatter'); break;
      case 'vault_locked': setBanner('VAULT LOCKED', ['#ffffff', '#d0d0d0', '#808080'], 1.4); A.sfx('bighit'); break;
      case 'twister': A.sfx('zip'); break;
      case 'objective': A.sfx('star'); UI.toast('★ OBJECTIVE', e.text); break;
      case 'crate_break': A.sfx('crack'); P.bits(e.x, e.y, 4, 14, ['#c8a060', '#8a6030']); break;
      case 'drop_start': A.sfx('zip', { vol: .6 }); break;
      case 'octopus_twirl': Crowd.react('cheer'); break;
      case 'intro': A.sfx('tock'); break;
      case 'goal_mark': break;
    }
  }
  Bus.on('*', e => { if (M && !Replay.playing && !(M.cfg.session && Net.isClient())) event(e, false); });
  function step(dt) {
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t > flashes[i].life) flashes.splice(i, 1); }
    if (banner) { banner.t += dt; if (banner.t > banner.life) banner = null; }
  }
  function lights() { for (const f of flashes) game.lights.add(f.x, f.y, f.z, f.r, f.i * (1 - f.t / f.life) * (.7 + .3 * Math.sin(f.t * 20)), { color: f.color }); }
  return { event, step, lights, setBanner, light, get banner() { return banner; }, clear() { banner = null; flashes.length = 0; } };
})();

// ---- 36-arena.js ----
/* ---- Crowd and Arena: the stands and their fans (excitement, waves, signs, glass pounders), benches and coaches, the
 * boards and glass, the nets, each barn's props and lights (PLAN 7.1, 8, 11.2) ---- */
const Crowd = (() => {
  let ex = .2, quiet = 0, standing = false, goalT = 0, goalTeam = -1, flinchX = null, flinchT = 0;
  const hype = k => { ex = Math.min(1, ex + k * T.crowdHype); quiet = 0; };
  const react = kind => { if (M && M.cfg.session && Net.isClient() && kind) { /* clients hear it from the host's events */ } Synth.react(kind); };
  function step(dt) {
    ex = Math.max(.15, ex - dt * .06); quiet += dt; goalT = Math.max(0, goalT - dt); flinchT = Math.max(0, flinchT - dt);
    if (M && (M.phase === 'play' || M.phase === 'goal')) Synth.crowdBed(.25 + ex * .75); else Synth.crowdBed(.2);
  }
  return { hype, react, step, stand(on) { standing = on; }, goal(team) { goalT = 3; goalTeam = team; }, flinch(x) { flinchX = x; flinchT = 1; },
    get ex() { return ex; }, get quiet() { return quiet; }, get standing() { return standing; }, get goalT() { return goalT; }, get goalTeam() { return goalTeam; }, get flinchX() { return flinchX; }, get flinchT() { return flinchT; } };
})();

const Arena = (() => {
  const C = Rink.C, tones = E.tones;
  const TIERS = 5, TD = 34;
  const fans = {};   // per arena: the fans' fixed looks
  function fansFor(a) {
    if (fans[a.id]) return fans[a.id];
    const list = [];
    for (let k = 0; k < TIERS; k++) for (let x = 8; x < 1120; x += 9) {
      const h = E.hash2(x, k * 31 + 7), y = C.y - Rink.HW - 26 - k * TD - 12 + (h - .5) * 6;
      if (a.snowbank && (k > 2 || h < .45)) continue;
      list.push({ x: x + (h - .5) * 4, y, z: 26 + k * 15, shirt: a.crowd[Math.floor(h * 97) % a.crowd.length], skin: ['#f0c8a0', '#c08a60', '#8a5a3a', '#f4d8c0', '#6a4028'][Math.floor(h * 53) % 5], ph: h * 9, sign: h > .965 ? U.pick(() => E.hash2(x, k), ['BARN BURNER', 'KABOOM!', 'MARGE 4 PM', 'SAVE THE ICEBOX', 'PIPESY ♥', 'GO ' + 'TEAM']) : null, toque: a.toque && h > .5, home: h < .7 });
    }
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) for (let y = C.y - 170; y < C.y + 190; y += 9) {
      const h = E.hash2(y, k * 13 + (side > 0 ? 3 : 9)), x = C.x + side * (Rink.HL + 40 + k * 22);
      if (a.snowbank && h < .5) continue;
      list.push({ x, y, z: 22 + k * 12, shirt: a.crowd[Math.floor(h * 71) % a.crowd.length], skin: ['#f0c8a0', '#c08a60', '#8a5a3a', '#f4d8c0'][Math.floor(h * 37) % 4], ph: h * 9, toque: a.toque && h > .5, home: h < .7, end: side });
    }
    list.sort((p, q) => p.y - q.y);
    return (fans[a.id] = list);
  }
  const pounders = [];
  const benchRigs = {};
  function benchFor(team, tid) {
    const k = tid + team; if (benchRigs[k]) return benchRigs[k];
    const coach = tid === 'muskrats' ? Rigs.cast('marge').rig : new E.Humanoid({ size: 1.1, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#e0e0e0', coat: TEAMS[tid].dark, pants: '#2a2a2a', skin: '#e0b090', hair: '#5a5a5a' } });
    return (benchRigs[k] = { coach });
  }
  /* ---- the background (drawn first, under everything): stands and fans, the far boards and glass, benches, props ---- */
  function poly(g, r, pts, col) { px.poly(g, pts.map(p => { const s = r.w(p[0], p[1], p[2]); return [s[0] - r.ix * 0, s[1]]; }), col); }
  function background(r) {
    const a = M.arena, view = r.view;
    r.decal(g => {
      // the stands: stepped tiers north of the benches
      for (let k = TIERS - 1; k >= 0; k--) {
        const y1 = C.y - Rink.HW - 26 - k * TD, y0 = y1 - TD, z = a.snowbank ? 8 + k * 6 : 24 + k * 15, zb = k ? (a.snowbank ? 8 + (k - 1) * 6 : 24 + (k - 1) * 15) : 0, c = tones(a.stand[k % a.stand.length]);
        poly(g, r, [[0, y0, z], [1120, y0, z], [1120, y1, z], [0, y1, z]], c.base);
        poly(g, r, [[0, y1, z], [1120, y1, z], [1120, y1, zb], [0, y1, zb]], c.sh);
        const [, ly] = r.w(0, y1, z); px.rect(g, 0, Math.round(ly), r.W, 1, c.lt);
      }
      for (const side of [-1, 1]) for (let k = 2; k >= 0; k--) {
        const x0 = C.x + side * (Rink.HL + 26 + k * 22), x1 = x0 + side * 22, z = a.snowbank ? 6 + k * 5 : 20 + k * 12, c = tones(a.stand[(k + 1) % a.stand.length]);
        poly(g, r, [[x0, C.y - 200, z], [x1, C.y - 200, z], [x1, C.y + 230, z], [x0, C.y + 230, z]], c.base);
        poly(g, r, [[x0, C.y + 230, z], [x1, C.y + 230, z], [x1, C.y + 230, 0], [x0, C.y + 230, 0]], c.sh);
      }
      // fans: excitement bobs them, goals make the home side jump, a wave runs when it's quiet, the glass flinch
      const ex = Crowd.ex, t = game.time, wave = Crowd.quiet > 20, F = fansFor(a);
      for (const f of F) {
        let up = Math.sin(t * (2 + ex * 6) + f.ph) * (.4 + ex * 1.6);
        if (Crowd.goalT > 0 && (f.home ? 0 : 1) === Crowd.goalTeam) up += Math.abs(Math.sin(t * 10 + f.ph)) * 5;
        if (Crowd.standing || ex > .7) up += 2;
        if (wave) { const wp = ((t * 160) % 1400) - 140; if (Math.abs(f.x - wp) < 30) up += 5 * (1 - Math.abs(f.x - wp) / 30); }
        if (Crowd.flinchT > 0 && Math.abs(f.x - Crowd.flinchX) < 60 && f.z < 45) up -= 2;
        const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y);
        if (X < -6 || X > r.W + 6 || Y < -10 || Y > r.H + 10) continue;
        const sh = a.parka ? 5 : 4;
        px.rect(g, X - 2, Y - 5, sh, 5, f.shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin);
        if (f.toque) px.rect(g, X - 1, Y - 9, 3, 2, f.shirt === '#e8e0d0' ? '#c83a2a' : '#e8e0d0');
        if (a.parka) px.rect(g, X - 2, Y - 9, 5, 2, f.shirt);
        if (ex > .6 && Math.sin(t * 7 + f.ph) > .3) { px.rect(g, X - 3, Y - 10, 1, 3, f.skin); px.rect(g, X + 2, Y - 10, 1, 3, f.skin); }
        if (f.sign) { const w = E.font.width(f.sign, { font: 'tiny' }) + 4; px.rect(g, X - w / 2, Y - 18, w, 8, '#f4f0e0'); E.font.text(g, f.sign, X, Y - 16, '#c83a2a', { font: 'tiny', align: 'center', outline: false }); }
      }
      // props behind the rink, per barn
      decor(g, r, a);
      // benches, the scorekeeper and sin bins along the far boards
      for (const team of [0, 1]) {
        const x0 = C.x + (team ? 72 : -216), x1 = x0 + 144, y = Rink.Y0 - 14;
        poly(g, r, [[x0, y - 8, 10], [x1, y - 8, 10], [x1, y + 4, 10], [x0, y + 4, 10]], '#4a3424');
        poly(g, r, [[x0, y + 4, 10], [x1, y + 4, 10], [x1, y + 4, 0], [x0, y + 4, 0]], '#2a1c14');
        const tm = M.teams[team], b = benchFor(team, tm.id);
        for (let i = 0; i < 4; i++) { const sx = x0 + 20 + i * 34, [X, Y] = r.w(sx, y - 3, 10); px.rect(g, Math.round(X) - 3, Math.round(Y) - 9, 7, 8, team === 0 ? tm.dark : tm.light); px.rect(g, Math.round(X) - 2, Math.round(Y) - 13, 5, 4, team === 0 ? tm.trim : tm.dark); px.rect(g, Math.round(X) - 1, Math.round(Y) - 11, 3, 2, '#e0b090'); }
        const [cx, cy] = r.w(x0 + 72, y - 14, 0); b.coach.draw(g, Math.round(cx), Math.round(cy), E.charView ? E.charView(view) : view);
      }
      for (const team of [0, 1]) { const x0 = C.x + (team ? 12 : -60); poly(g, r, [[x0, Rink.Y0 - 22, 12], [x0 + 48, Rink.Y0 - 22, 12], [x0 + 48, Rink.Y0 - 2, 12], [x0, Rink.Y0 - 2, 12]], '#22262e'); }
      // the far boards and glass (every panel that doesn't face the camera)
      for (const p of Rink.panels) if (p.n[1] <= .3) panel(g, r, p, false);
      // ice details: scuffs, melt, thin ice, holes
      scuffs(g, r);
      if (M.ice) for (const p of M.ice) iceDecal(g, r, p);
      if (M.gear) for (const gr of M.gear) { const [x, y] = r.w(gr.x, gr.y, 0); px.rect(g, Math.round(x) - 2, Math.round(y) - 1, 5, 3, gr.c); px.rect(g, Math.round(x) - 1, Math.round(y) - 2, 3, 1, E.shade(gr.c, .2)); }
      if (M.hats) for (const h of M.hats) if (h.z <= 0) { const [x, y] = r.w(h.x, h.y, 0); px.rect(g, Math.round(x) - 2, Math.round(y) - 1, 5, 2, h.c); px.rect(g, Math.round(x) - 1, Math.round(y) - 3, 3, 2, h.c); }
    });
    // the near (camera-side) boards, cut low so they never hide play, and corners: queued per panel
    for (const p of Rink.panels) if (p.n[1] > .3) r.queue(p.m[0], p.m[1] + 2, 0, g => panel(g, r, p, true));
    nets(r);
  }
  function panel(g, r, p, cut) {
    const a = M.arena, [ax, ay] = p.a, [bx, by] = p.b;
    if (a.snowbank) {   // pond: a lumpy snowbank instead of boards
      const h = cut ? 5 : 9, steps = 4;
      for (let i = 0; i < steps; i++) { const u0 = i / steps, u1 = (i + 1) / steps, x0 = lerp(ax, bx, u0), y0 = lerp(ay, by, u0), x1 = lerp(ax, bx, u1), y1 = lerp(ay, by, u1), hh = h + E.hash2(Math.round(x0), Math.round(y0)) * 4;
        poly(g, r, [[x0, y0, 0], [x1, y1, 0], [x1, y1, hh], [x0, y0, hh]], '#e8f0fa'); poly(g, r, [[x0 + p.n[0] * 6, y0 + p.n[1] * 6, hh], [x1 + p.n[0] * 6, y1 + p.n[1] * 6, hh], [x1, y1, hh], [x0, y0, hh]], '#ffffff'); }
      return;
    }
    const H = cut ? 6 : Rink.BOARD, sh = p.shake > 0 ? Math.sin(game.time * 60) * p.shake * 2 : 0;
    poly(g, r, [[ax, ay, 0], [bx, by, 0], [bx, by, H], [ax, ay, H]], '#eef2f6');
    poly(g, r, [[ax, ay, 0], [bx, by, 0], [bx, by, 2], [ax, ay, 2]], '#e8c030');
    const capC = M.teams[0].dark, a0 = r.w(ax, ay, H), b0 = r.w(bx, by, H);
    px.line(g, a0[0], a0[1], b0[0], b0[1], a.cap || capC, 2);
    if (!cut && p.i < 14 && a.ads.length) { const ad = a.ads[Math.floor(p.i / 3.5) % a.ads.length]; if (p.i % 3 === 1 || p.i % 7 === 3) { const [x, y] = r.w((ax + bx) / 2, ay, 9); E.font.text(g, ad.slice(0, 14), Math.round(x), Math.round(y) - 3, ['#1a3a8a', '#c83a2a', '#1a1a1a'][p.i % 3], { font: 'tiny', align: 'center', outline: false }); } }
    if (cut) return;
    // the glass: translucent, a highlight streak, stanchions; cracks or an empty frame
    const top = H + p.h, A1 = r.w(ax, ay, top), B1 = r.w(bx, by, top);
    if (p.state !== 'shattered') px.blend(g, .22, 'normal', () => poly(g, r, [[ax, ay, H], [bx, by, H], [bx, by, top], [ax, ay, top]], '#bfe4ff'));
    px.line(g, a0[0], a0[1], A1[0] + sh, A1[1], '#5a6a7a', 1); px.line(g, A1[0] + sh, A1[1], B1[0] + sh, B1[1], '#8aa0b8', 1);
    if (p.state === 'ok') { const m0 = r.w(lerp(ax, bx, .3), lerp(ay, by, .3), H + 4), m1 = r.w(lerp(ax, bx, .45), lerp(ay, by, .45), top - 3); px.blend(g, .5, 'screen', () => px.line(g, m0[0] + sh, m0[1], m1[0] + sh, m1[1], '#ffffff', 1)); }
    if (p.state === 'cracked') { const c0 = r.w(lerp(ax, bx, .5), lerp(ay, by, .5), H + p.h * .5); for (let i = 0; i < 6; i++) { const ang = i * 1.05 + p.i, len = 5 + (i * 7 % 5); px.line(g, c0[0], c0[1], c0[0] + Math.cos(ang) * len, c0[1] + Math.sin(ang) * len, '#ffffff', 1); } }
  }
  function scuffs(g, r) {
    const S2 = Rink.scuff, Mt = Rink.melt;
    for (let cy = 0; cy < Rink.SH; cy++) for (let cx = 0; cx < Rink.SW; cx++) {
      const i = cy * Rink.SW + cx, s = S2[i], m = Mt[i]; if (s < .05 && m < .05) continue;
      const x = Rink.X0 + cx * 16, y = Rink.Y0 + cy * 16;
      if (m > .05) { const [X, Y] = r.w(x + 8, y + 8, 0); px.blend(g, Math.min(.6, m), 'normal', () => px.ell ? px.ell(g, X, Y, 7, 3, '#8aa8c8') : px.disc(g, X, Y, 5, '#8aa8c8')); px.dot(g, X - 2, Y - 1, '#ffffff'); }
      if (s > .05) { const n = 1 + Math.floor(s * 3.5), h = E.hash2(cx, cy); px.blend(g, Math.min(.55, s * .8), 'normal', () => { for (let k = 0; k < n; k++) { const a0 = r.w(x + (h * 13 + k * 5) % 16, y + (h * 7 + k * 9) % 16, 0), a1 = r.w(x + (h * 13 + k * 5) % 16 + 6, y + (h * 7 + k * 9) % 16 + (k % 2 ? 2 : -2), 0); px.line(g, a0[0], a0[1], a1[0], a1[1], '#a8bccc', 1); } }); }
    }
  }
  function iceDecal(g, r, p) {
    const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, w = r.w(p.x + Math.cos(a) * p.rx, p.y + Math.sin(a) * p.ry, 0); pts.push(w); }
    if (p.hole) { px.poly(g, pts, '#0a1a2a'); const k = .7, inner = pts.map(q => { const c = r.w(p.x, p.y, 0); return [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k]; }); px.poly(g, inner, '#14304a'); const c = r.w(p.x, p.y, 0), rr = (game.time * 10) % 12; px.blend(g, .5, 'screen', () => { for (let i = 0; i < 16; i += 2) px.dot(g, c[0] + Math.cos(i) * rr * 1.6, c[1] + Math.sin(i) * rr * .7, '#9ad0f0'); }); }
    else { px.blend(g, p.refrozen ? .4 : .22, 'normal', () => px.poly(g, pts, p.refrozen ? '#5a7a9a' : '#9ab8d8')); if (p.hp < 100) { const c = r.w(p.x, p.y, 0); for (let i = 0; i < 5; i++) { const a = i * 1.3; px.line(g, c[0], c[1], c[0] + Math.cos(a) * (8 + (100 - p.hp) * .2), c[1] + Math.sin(a) * 4, '#ffffff', 1); } } }
  }
  function nets(r) {
    for (const side of [0, 1]) {
      const gx = Rink.goalX(side), od = Rink.outDir(side), cy = C.y, m = Rink.MOUTH, bulge = (M.puck.inNet && M.puck.netSide === side) ? 3 : 0;
      r.queue(gx + od * 4, cy - m - 1, 0, g => {
        const P0 = (x, y, z) => r.w(x, y, z), back = gx + od * (Rink.NETD + bulge);
        const fl = P0(gx, cy - m, 0), fr = P0(gx, cy + m, 0), tl = P0(gx, cy - m, Rink.BAR), tr = P0(gx, cy + m, Rink.BAR), bl = P0(back, cy - m + 2, 0), br = P0(back, cy + m - 2, 0), btl = P0(back - od * 4, cy - m + 2, 10), btr = P0(back - od * 4, cy + m - 2, 10);
        px.blend(g, .35, 'normal', () => { px.poly(g, [tl, tr, btr, btl], '#f4f8ff'); px.poly(g, [tl, btl, bl, fl], '#e8eef8'); px.poly(g, [btl, btr, br, bl], '#dfe6f0'); });
        for (let i = 1; i < 6; i++) { const u = i / 6, a = [lerp(tl[0], tr[0], u), lerp(tl[1], tr[1], u)], b = [lerp(btl[0], btr[0], u), lerp(btl[1], btr[1], u)]; px.line(g, a[0], a[1], b[0], b[1], '#c8d4e4', 1); }
        px.line(g, fl[0], fl[1], tl[0], tl[1], '#d82a2a', 2); px.line(g, fr[0], fr[1], tr[0], tr[1], '#d82a2a', 2); px.line(g, tl[0], tl[1], tr[0], tr[1], '#d82a2a', 2);
        px.line(g, tl[0], tl[1], btl[0], btl[1], '#c8c8d0', 1); px.line(g, tr[0], tr[1], btr[0], btr[1], '#c8c8d0', 1); px.line(g, bl[0], bl[1], br[0], br[1], '#b0b8c8', 1);
      });
    }
  }
  /* ---- per-barn dressing behind the rink ---- */
  function decor(g, r, a) {
    const t = game.time;
    if (a.id === 'icebox') {
      for (let x = 40; x < 1100; x += 22) { const [X, Y] = r.w(x, C.y - Rink.HW - 26 - 5 * TD + 4, 110 + Math.sin(x * .05) * 4); px.dot(g, X, Y, ['#ff6a5a', '#ffe070', '#5ae0ff', '#7aff7a'][Math.floor(x / 22) % 4]); }
      for (const [x, txt] of [[300, '1962 CHAMPS'], [820, 'KABOOM CUP ?']]) { const [X, Y] = r.w(x, C.y - Rink.HW - 26 - 5 * TD + 10, 100); px.rect(g, X - 22, Y - 4, 44, 22, '#5a3a22'); px.rect(g, X - 20, Y - 2, 40, 18, '#8a2a2a'); E.font.text(g, txt.replace(' ?', ''), X, Y + 4, '#ffe08a', { font: 'tiny', align: 'center', outline: false }); }
      // the hand-painted scoreboard
      const [sx, sy] = r.w(C.x, C.y - Rink.HW - 26 - 5 * TD + 6, 118); px.rect(g, sx - 34, sy - 8, 68, 22, '#2a1a10'); px.rect(g, sx - 32, sy - 6, 64, 18, '#14301a');
      E.font.text(g, M.teams[0].abbr + ' ' + M.score[0] + '  ' + M.score[1] + ' ' + M.teams[1].abbr, sx, sy - 3, '#ffe070', { font: 'tiny', align: 'center', outline: false }); E.font.text(g, U.mmss(M.clock), sx, sy + 4, '#ff8a5a', { font: 'tiny', align: 'center', outline: false });
      // Doris's organ booth in the corner of the stands
      const [ox, oy] = r.w(Rink.X0 + 30, C.y - Rink.HW - 40, 30); px.rect(g, ox - 14, oy - 10, 28, 14, '#5a2a1a'); px.rect(g, ox - 12, oy - 8, 24, 3, '#f0f0e0'); for (let i = 0; i < 6; i++) px.rect(g, ox - 11 + i * 4, oy - 8, 1, 2, '#1a1a1a');
      const doris = Rigs.cast('doris').rig, beat = A.pos && A.pos.beat !== undefined ? A.pos.beat : t * 2; doris.update(0, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: -PI / 2, pose: Math.floor(beat) % 2 ? 'cast' : null });
      doris.draw(g, Math.round(ox), Math.round(oy - 4), E.charView ? E.charView(r.view) : r.view);
    } else if (a.id === 'pond') {
      for (const [x, y] of [[180, 140], [940, 120]]) { poly(g, r, [[x - 30, y - 20, 24], [x + 30, y - 20, 24], [x + 30, y + 20, 24], [x - 30, y + 20, 24]], '#6a3a20'); poly(g, r, [[x - 30, y + 20, 24], [x + 30, y + 20, 24], [x + 30, y + 20, 0], [x - 30, y + 20, 0]], '#4a2a14'); const [wx, wy] = r.w(x, y + 20, 12); px.rect(g, wx - 5, wy - 4, 6, 5, '#ffd070'); px.rect(g, wx + 6, wy - 4, 6, 5, '#ffd070'); }
      for (const [x, y] of [[90, 330], [1040, 520], [1030, 260]]) { const [X, Y] = r.w(x, y, 0); px.disc(g, X, Y - 6, 6, '#f4f8ff'); px.disc(g, X, Y - 15, 4, '#ffffff'); px.dot(g, X - 1, Y - 16, '#141414'); px.dot(g, X + 1, Y - 16, '#141414'); px.rect(g, X, Y - 14, 2, 1, '#ff8a2a'); }
    } else if (a.id === 'grindhouse') {
      for (let x = 0; x < 1120; x += 70) { const a0 = r.w(x, C.y - Rink.HW - 26 - 5 * TD, 120), a1 = r.w(x + 70, C.y - Rink.HW - 26 - 5 * TD, 120), b0 = r.w(x + 35, C.y - Rink.HW - 26 - 5 * TD, 100); px.line(g, a0[0], a0[1], a1[0], a1[1], '#5a5e66', 2); px.line(g, a0[0], a0[1], b0[0], b0[1], '#4a4e56', 1); px.line(g, b0[0], b0[1], a1[0], a1[1], '#4a4e56', 1); }
      for (const x of [200, 560, 920]) { if (RNG.fx() < .02) P.smoke(x, C.y - Rink.HW - 40, 40, 1, { size: 1.4, color: '#c8ccd4' }); }
    } else if (a.id === 'mall') {
      const shops = [['FOOD COURT', '#ff5ab0'], ['SKATE SHACK', '#5affe0'], ['GLITTERMAN', '#ffe070'], ['PRETZELS', '#ff9a3a'], ['ARCADE', '#7a7aff']];
      shops.forEach(([nm, c], i) => { const x = 110 + i * 210, [X, Y] = r.w(x, C.y - Rink.HW - 26 - 5 * TD + 6, 96); px.rect(g, X - 34, Y - 6, 68, 34, '#3a3048'); px.rect(g, X - 30, Y + 8, 60, 18, '#ffe0a0'); px.glow && px.glow(g, 1); E.font.text(g, nm, X, Y - 3, Math.sin(t * 3 + i) > -.8 ? c : '#3a3a4a', { font: 'tiny', align: 'center', outline: false }); px.glow && px.glow(g, 0); });
      const [fx, fy] = r.w(C.x + 330, C.y - Rink.HW - 60, 30); px.disc(g, fx, fy, 12, '#c8c0d8'); px.disc(g, fx, fy, 10, '#5ab0e8'); for (let i = 0; i < 5; i++) px.dot(g, fx + Math.cos(t * 3 + i) * 4, fy - 6 - Math.abs(Math.sin(t * 5 + i)) * 6, '#e8f8ff');
      const e0 = r.w(80, C.y - Rink.HW - 40, 10), e1 = r.w(160, C.y - Rink.HW - 150, 90); px.line(g, e0[0], e0[1], e1[0], e1[1], '#8a8aa0', 4); px.line(g, e0[0], e0[1] - 3, e1[0], e1[1] - 3, '#c0c0d0', 1);
    } else if (a.id === 'dome') {
      const [jx, jy] = r.w(C.x, C.y - Rink.HW - 26 - 5 * TD, 150); px.rect(g, jx - 46, jy - 12, 92, 40, '#141414'); px.rect(g, jx - 44, jy - 10, 88, 36, '#0a1428');
      E.font.text(g, M.teams[0].abbr + ' ' + M.score[0] + ' - ' + M.score[1] + ' ' + M.teams[1].abbr, jx, jy - 6, '#ffd040', { align: 'center', outline: false });
      if (M.boostOn && !M.organDone) E.font.text(g, '"SYNERGY, BOYS!"', jx, jy + 8, '#ffffff', { font: 'tiny', align: 'center', outline: false }); else E.font.text(g, 'KABOOM CUP FINAL', jx, jy + 8, '#ffffff', { font: 'tiny', align: 'center', outline: false });
      for (let i = 0; i < 6; i++) { const a0 = r.w(100 + i * 180, C.y - Rink.HW - 26 - 5 * TD, 160), a1 = r.w(C.x + Math.sin(t * .7 + i) * 380, C.y + Math.cos(t * .5 + i) * 150, 0); px.blend(g, .25, 'add', () => px.line(g, a0[0], a0[1], a1[0], a1[1], ['#ff3a3a', '#3aff8a', '#5a8aff'][i % 3], 1)); }
    }
  }
  /* ---- foreground: corner flame cannons, flying hats, glass pounders and the near crowd's silhouettes ---- */
  function foreground(r) {
    const a = M.arena;
    if (a.id === 'pond') { for (let i = 0; i < 18; i++) { const x = 30 + i * 62 + (i % 3) * 10, y = 60 + (i % 4) * 30; r.prop('pine', x, y, 0, { size: 1.4 + (i % 3) * .2 }); } r.prop('brazier', C.x + 40, C.y - Rink.HW - 70, 0, { size: 1.4, light: true }); }
    if (a.flames) for (const [x, y] of [[Rink.X0 + 20, Rink.Y0 + 20], [Rink.X1 - 20, Rink.Y0 + 20]]) { r.prop('brazier', x - Math.sign(x - C.x) * 30, y - 40, 0, { size: 1.2 }); if ((M.phase === 'goal' && M.phaseT < 1.5) || M.kaboomT[0] > 0 || M.kaboomT[1] > 0) P.fire(x - Math.sign(x - C.x) * 30, y - 40, 22, 1, { size: 1.6 }); }
    if (M.hats) for (const h of M.hats) if (h.z > 0) { h.z = Math.max(0, h.z - 40 / 60); r.queue(h.x, h.y, h.z, g => { const [x, y] = r.w(h.x, h.y, h.z); px.rect(g, Math.round(x) - 2, Math.round(y) - 1, 5, 2, h.c); px.rect(g, Math.round(x) - 1, Math.round(y) - 3, 3, 2, h.c); }); }
    // glass pounders behind each net
    if (!pounders.length) for (let i = 0; i < 10; i++) pounders.push({ rig: Rigs.pounder(['#c83a2a', '#2a5a9a', '#e8b43a', '#3a8a4a', '#5a3a22'][i % 5], ['#f0c8a0', '#c08a60', '#8a5a3a'][i % 3]), side: i < 5 ? 0 : 1, k: i % 5 });
    if (!a.snowbank) for (const pd of pounders) {
      const gx = Rink.goalX(pd.side) + Rink.outDir(pd.side) * 62, y = C.y - 50 + pd.k * 25, near = Math.abs(M.puck.x - gx) < 160;
      const bang = near && Math.sin(game.time * 12 + pd.k) > 0;
      pd.rig.update(1 / 60, { x: gx, y, z: 0, vx: 0, vy: 0, facing: pd.side ? PI : 0, pose: bang ? 'cheer' : Crowd.goalT > 0 ? 'cheer' : null });
      r.actor(gx, y, 0, (g, ox, oy) => pd.rig.draw(g, ox, oy, r.view), { every: 2, key: pd });
    }
  }
  function silhouettes(r) {
    if (r.view.id !== 'threequarter' || M.attractHud) return;
    r.overlay(g => { for (let x = -6; x < r.W + 8; x += 11) { const h = E.hash2(x, 3), up = Crowd.ex > .6 ? Math.abs(Math.sin(game.time * 8 + h * 9)) * 3 : 0, y = r.H - 5 - h * 4 - up; px.disc(g, x, y, 5, '#05070c'); px.rect(g, x - 8, y + 3, 16, 12, '#05070c'); } });
  }
  /* ---- lights: the barn's lamps, KABOOM tint, goal lights ---- */
  function lights(r) {
    const a = M.arena; L.enabled = true; L.ambient = a.ambient;
    for (const [x, y] of a.lamps) { const fl = a.flicker && Math.sin(game.time * 23 + x) > .97 ? .3 : 1; L.add(x, y, 130, 280, .32 * fl, { color: a.lampColor }); }
    for (const t of [0, 1]) if (M.kaboomT[t] > 0) { const c = TEAMS[t === 0 ? M.cfg.home : M.cfg.away], pulse = .5 + .3 * Math.sin(game.time * 8); L.add(C.x, C.y, 160, 600, pulse, { color: c.id === 'grizzlies' ? '#ffd040' : '#ff6a2a' }); }
    if (a.id === 'pond') L.add(C.x + 40, C.y - Rink.HW - 70, 20, 180, .9 + .2 * Math.sin(game.time * 13), { color: '#ff9a3a' });
    if (M.puck.onFire) L.add(M.puck.x, M.puck.y, 10, 90, 1.2, { color: '#ff8a2a' });
    Fx.lights();
  }
  return { background, foreground, silhouettes, lights, panel, decor };
})();

// ---- 40-scene-match.js ----
/* ---- the match scene: every game of hockey (exhibition, story, practice, attract, sessions) plays here ---- */
const Draw = (() => {
  const view = r => E.charView ? E.charView(r.view) : r.view;
  const trail = [];
  function puck(r) {
    const p = M.puck; if (p.dead || (p.held && p.z > 13 && M.phase !== 'faceoff')) return;
    const sp = Math.hypot(p.vx, p.vy), mode = Rigs.glow || S().trail === 'Glow' ? 'glow' : S().trail === 'Off' ? 'off' : 'streak';
    trail.push([p.x, p.y, p.z]); if (trail.length > 6) trail.shift();
    r.shadow(p.x, p.y, 2.2, .5);
    r.queue(p.x, p.y, p.z, g => {
      const [x, y] = r.w(p.x, p.y, p.z + 1), X = Math.round(x), Y = Math.round(y);
      if ((sp > 300 || p.onFire) && mode !== 'off' && !p.owner) for (let i = 0; i < trail.length - 1; i++) { const a = r.w(...trail[i]), b = r.w(...trail[i + 1]); px.blend(g, .2 + i * .1, mode === 'glow' || p.onFire ? 'add' : 'normal', () => px.line(g, a[0], a[1] + 1, b[0], b[1] + 1, p.onFire ? '#ff8a2a' : mode === 'glow' ? '#5affff' : '#ffffff', p.onFire ? 3 : 1)); }
      if (p.onFire) { px.disc(g, X, Y, 4, '#ff5a1a'); px.disc(g, X, Y, 2.5, '#ffd040'); px.dot(g, X, Y, '#ffffff'); return; }
      if (mode === 'glow') px.blend(g, .5, 'add', () => px.disc(g, X, Y, 3, '#5affff'));
      px.rect(g, X - 1, Y - 1, 3, 2, '#0a0a0e'); px.dot(g, X - 1, Y - 1, '#5a5a66');
    }, { emissive: p.onFire || mode === 'glow' });
    if (p.onFire && RNG.fx() < .7) P.fire(p.x, p.y, p.z + 2, 1, { size: .8 });
  }
  function skater(r, s) {
    if (s.off) return;
    const z = s.state === 'buried' ? -14 : 0, opts = {};
    if (s.state === 'frozen') { opts.flash = '#9ad0ff'; opts.flashMix = .6; }
    if (s.items.hotsauce > 0 || M.kaboomT[s.team] > 0) { opts.ghost = { color: M.kaboomT[s.team] > 0 ? '#ff7a2a' : '#ff3a2a', life: .12, alpha: .4, owner: s }; }
    if (s.state !== 'bin') r.shadow(s.x, s.y, 7, .3);
    if (s.human || s.state === 'bin') opts.xray = { color: s.human ? s.human.color || '#ffd36a' : '#808080' };
    r.actor(s.x, s.y, z, (g, ox, oy) => s.rig.draw(g, ox, oy, view(r)), opts);
    if (s.state === 'frozen') r.queue(s.x, s.y + 4, 0, g => { const [x, y] = r.w(s.x, s.y, 0), [, y2] = r.w(s.x, s.y, 34); px.blend(g, .35, 'normal', () => px.rect(g, Math.round(x) - 9, Math.round(y2), 18, Math.round(y - y2) + 2, '#bfe8ff')); px.rect(g, Math.round(x) - 9, Math.round(y2), 18, 1, '#ffffff'); });
    if (s.state === 'buried') r.queue(s.x, s.y + 6, 0, g => { const [x, y] = r.w(s.x, s.y + 4, 0); px.disc(g, x, y - 4, 10, '#e8f0fa'); px.disc(g, x - 3, y - 7, 6, '#ffffff'); });
    if (s.state === 'down' && s.stateT > .3 && s.stateT < 1.3) r.queue(s.x, s.y, 18, g => { const [x, y] = r.w(s.x, s.y, 10); for (let i = 0; i < 3; i++) { const a = game.time * 6 + i * 2.1; px.dot(g, x + Math.cos(a) * 6, y - 6 + Math.sin(a) * 2, '#ffe070'); } }, { emissive: true });
  }
  function items(r) {
    for (const it of M.items.concat(M.hazards)) {
      if (!it.haz && it.life - it.t < 3 && Math.floor(it.t * 8) % 2) continue;
      r.shadow(it.x, it.y, 4, .3);
      r.queue(it.x, it.y, it.z, g => {
        const [x, y] = r.w(it.x, it.y, it.z), X = Math.round(x), Y = Math.round(y), k = it.kind;
        if (k === 'hotsauce') { px.rect(g, X - 2, Y - 8, 4, 7, '#e0302a'); px.rect(g, X - 1, Y - 10, 2, 2, '#f0f0f0'); px.dot(g, X - 1, Y - 6, '#ffa090'); }
        else if (k === 'tape') { px.disc(g, X, Y - 3, 3.5, '#f0f0f0'); px.disc(g, X, Y - 3, 1.5, '#8a8a8a'); }
        else if (k === 'poutine') { px.rect(g, X - 4, Y - 4, 8, 4, '#c8c8d0'); px.rect(g, X - 3, Y - 6, 6, 2, '#e8b43a'); px.dot(g, X - 1, Y - 7, '#8a5a2a'); px.dot(g, X + 2, Y - 7, '#f8f0d8'); }
        else if (k === 'lumber') { px.line(g, X - 4, Y - 1, X + 4, Y - 9, '#c08a4a', 2); px.line(g, X + 2, Y - 8, X, Y - 5, '#ffe040', 1); px.line(g, X, Y - 5, X + 2, Y - 3, '#ffe040', 1); }
        else if (k === 'bricks') { px.rect(g, X - 4, Y - 5, 8, 4, '#b0503a'); px.rect(g, X - 4, Y - 3, 8, 1, '#d8c8b0'); }
        else if (k === 'boombox') { px.rect(g, X - 5, Y - 6, 10, 6, '#5a5a6a'); px.disc(g, X - 2, Y - 3, 1.5, '#1a1a22'); px.disc(g, X + 3, Y - 3, 1.5, '#1a1a22'); px.rect(g, X - 3, Y - 8, 6, 1, '#8a8a9a'); }
        else if (k === 'cocoa') { px.rect(g, X - 2, Y - 8, 4, 8, '#8a5a3a'); px.rect(g, X - 2, Y - 9, 4, 1, '#c8c8c8'); if (Math.floor(game.time * 4) % 2) px.dot(g, X, Y - 11, '#ffffff'); }
        else if (k === 'octopus') { px.disc(g, X, Y - 3, 3.5, '#8a3aa0'); for (let i = 0; i < 4; i++) px.line(g, X - 3 + i * 2, Y - 1, X - 4 + i * 2.6 + Math.sin(game.time * 4 + i), Y + 2, '#6a2a80', 1); px.dot(g, X - 1, Y - 4, '#ffffff'); }
        else if (k === 'rat') { px.rect(g, X - 3, Y - 3, 6, 3, '#8a8a8a'); px.dot(g, X + 3, Y - 3, '#ff9a9a'); px.line(g, X - 3, Y - 1, X - 6, Y, '#ff9a9a', 1); }
      }, { emissive: !it.haz });
    }
    if (M.crate) { const c = M.crate; r.shadow(c.x, c.y, 8, .4); r.queue(c.x, c.y, c.z, g => { const [x, y] = r.w(c.x, c.y, c.z), [, ty] = r.w(c.x, c.y, 200); px.line(g, x, ty, x, y - 10, '#5a5a6a', 1); px.rect(g, Math.round(x) - 6, Math.round(y) - 10, 12, 10, '#a07038'); px.rect(g, Math.round(x) - 6, Math.round(y) - 6, 12, 1, '#6a4a20'); E.font.text(g, '?', Math.round(x), Math.round(y) - 9, '#ffe070', { align: 'center', outline: false }); }); }
  }
  function world(r) {
    M.map.drawFloor(r);
    Arena.background(r);
    Arena.lights(r);
    for (const s of M.skaters) skater(r, s);
    for (const g of M.goalies) { r.shadow(g.x, g.y, 9, .32); r.actor(g.x, g.y, 0, (gg, ox, oy) => g.rig.draw(gg, ox, oy, view(r)), g.bricks > 0 ? { flash: '#ffb070', flashMix: .25 } : {}); }
    for (const rf of M.refs) { r.shadow(rf.x, rf.y, 6, .3); r.actor(rf.x, rf.y, 0, (g, ox, oy) => rf.rig.draw(g, ox, oy, view(r))); }
    if (M.mascot) { const m = M.mascot; r.shadow(m.x, m.y, 9, .3); r.actor(m.x, m.y, 0, (g, ox, oy) => { m.rig.draw(g, ox, oy, view(r)); const [hx, hy] = [ox, oy - 52 * (m.down > 0 ? .25 : 1)]; if (m.down <= 0) { px.disc(g, ox - 5, oy - 50, 2.5, '#f4f8ff'); px.disc(g, ox + 5, oy - 50, 2.5, '#f4f8ff'); px.dot(g, ox - 5, oy - 50, '#e0a0b0'); px.dot(g, ox + 5, oy - 50, '#e0a0b0'); } void hx; void hy; }); }
    items(r); puck(r);
    Arena.foreground(r);
    Hud.world(r);
    Arena.silhouettes(r);
  }
  return { world, puck, skater, view };
})();

scenes.match = {
  view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, res: 'ps1', pausable: !HUB, camera: { zoom: false }, touch: [],
  enter(cfg) {
    if (cfg && cfg.resume) { Match.setupFaceoff([Rink.C.x, Rink.C.y]); if (cfg.flood && M) Boom.add(cfg.flood.team, cfg.flood.boom); }
    else Match.start(cfg || { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: T.periodLen, ot: true, shootout: true, humans: [{ input: game.input, team: 0 }] });
    Synth.music(M.arena.music || 'play'); Synth.applyVolumes();
    Cam.reset(); game.cam.smooth = .12; game.weather = M.arena.weather ? Object.assign({}, M.arena.weather) : null; L.enabled = true; L.ambient = M.arena.ambient;
    game.cam.bounds = null; Fx.clear();
  },
  exit() { game.weather = null; game.timeScale = 1; Talk.close(); for (const l of ['kaboom', 'kaboom2', 'fight', 'drive', 'drive2']) Synth.layer(l, false); },
  update(dt) {
    Glyphs.sync();
    if (!M) return;
    game.timeScale = M.attract ? 1 : T.gameSpeed * (Dev.slow || 1);
    if (Dev.isOpen && Dev.update(dt) && !Dev.live) return;
    if (Dev.stepping && !Dev.stepNow) return;
    if (game.input.pressed('camera')) { S().set('camera', S().camera === 'Overhead' ? 'Broadcast' : 'Overhead'); game.note(S().camera.toUpperCase() + ' CAMERA'); }
    if (M.phase === 'intermission') {
      if (UI.anyPressed('pass') || S().flood === 'Always' || M.cfg.floodAlways) { game.players.forEach(p => p.consumeAll()); game.go('flood', { back: true, team: (M.humans[0] || { team: 0 }).team }, { fade: 'wipe' }); return; }
      if (UI.anyPressed('deke') || S().flood === 'Never') { game.players.forEach(p => p.consumeAll()); Rink.clearScuff(.95); Items.refreeze(); Match.setupFaceoff([Rink.C.x, Rink.C.y]); }
      Talk.update(dt); Fx.step(dt); Cam.update(dt); return;
    }
    if (M.pendingWarp && M.t > .3) { const w = M.pendingWarp; M.pendingWarp = null; if (w === 'dev') Dev.openFromMenu(); else Dev.warp(w); }
    Match.step(dt); Talk.update(dt); Fx.step(dt);
    if (M.period >= M.cfg.periods && M.phase === 'play' && !M.driveOn) { M.driveOn = true; Synth.layer('drive', true); Synth.layer('drive2', true); }
    for (const s of M.skaters) if (M.kaboomT[s.team] > 0 && Math.hypot(s.vx, s.vy) > 80 && RNG.fx() < .3) P.sparks(s.x, s.y, 1, 1, Math.atan2(-s.vy, -s.vx), { color: '#ffb040' });
    if (M.finished && !M.cfg.attract && !M.cfg.noResults) { M.finished = 'done'; if (M.cfg.onOver) M.cfg.onOver(M); else game.go('results', { m: M }, { fade: 'iris' }); }
  },
  draw(r) {
    if (!M) return;
    Draw.world(r); Drills.world(r);
    Hud.draw(r, 1 / 60); Drills.hud(r);
    Talk.draw(r);
    r.overlay(g => UI.drawToasts(g, r, 1 / 60));
    Dev.draw(r);
  }
};

/* ---- the Flood Wagon: drive Old Gus's ice resurfacer over the scuffed ice between periods (PLAN 7.14, 11.3) ---- */
scenes.flood = (() => {
  let car = null, t = 0, back = null, start = 0, auto = false, gus = null, done = false, last = 0;
  const C = Rink.C;
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', pausable: !HUB, camera: { zoom: false }, touch: [],
    enter(d) {
      back = d || {}; auto = !!back.auto; t = 0; done = false;
      if (!M) { Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: 90, humans: [] }); for (let i = 0; i < 400; i++) Rink.scuffAt(Rink.X0 + RNG.fx() * 860, Rink.Y0 + RNG.fx() * 380, .4); }
      if (Rink.scuffTotal() < 30) for (let i = 0; i < 300; i++) Rink.scuffAt(Rink.X0 + 20 + RNG.fx() * 820, Rink.Y0 + 20 + RNG.fx() * 340, .35);
      start = Rink.scuffTotal(); last = start;
      car = new E.Car({ x: Rink.X0 + 60, y: Rink.Y1 - 40, angle: 0, top: 90, accel: 60, brake: 120, turn: 1.6, grip: 6 });
      gus = Rigs.cast('gus').rig; Synth.music('flood'); L.enabled = true; L.ambient = .7; Cam.apply('threequarter', 1); game.cam.smooth = .15;
    },
    update(dt) {
      t += dt;
      const I = game.input; let steer = 0, gas = 0;
      if (auto || back.bot) {   // Old Gus drives himself: a lawnmower pattern
        const lane = Math.floor(t / 4.2) % 7, ty = Rink.Y0 + 40 + lane * 50, tx = lane % 2 ? Rink.X0 + 70 : Rink.X1 - 70, a = Math.atan2(ty - car.y, tx - car.x);
        steer = clamp(U.angDiff(a, car.angle) * 2, -1, 1); gas = 1;
      } else {
        const m = I.move(); if (Math.hypot(m[0], m[1]) > .2) { const a = Math.atan2(m[1], m[0]); steer = clamp(U.angDiff(a, car.angle) * 2, -1, 1); gas = .6; }
        if (I.down('turbo') || I.down('shoot')) gas = 1; if (I.down('deke')) gas = -.5;
        if (I.pressed('pass')) A.sfx('aooga');
      }
      car.update(dt, M.map, { steer, gas: Math.max(0, gas), brake: gas < 0 ? 1 : 0 });
      const b = { x: car.x, y: car.y, vx: car.vx || 0, vy: car.vy || 0 }; const hit = Rink.clamp(b, 14, .2, .6); if (hit) { car.x = b.x; car.y = b.y; if (car.speed !== undefined) car.speed *= .6; }
      // the wagon's path: scuffs and melt cleared under its blade
      for (let ox = -14; ox <= 14; ox += 7) for (let oy = -14; oy <= 14; oy += 7) { const i = Rink.cellOf(car.x + ox, car.y + oy); if (i >= 0) { Rink.scuff[i] *= .2; Rink.melt[i] *= .2; } }
      if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) A.sfx('engine', { pitch: 1 + Math.abs(car.speed || 0) / 120 });
      if (RNG.fx() < .4) P.add && P.add({ kind: 'smoke', x: car.x - Math.cos(car.angle) * 18, y: car.y - Math.sin(car.angle) * 18, z: 18, vx: 0, vy: 0, vz: 10, life: .8, size: 1, color: '#e8f0f8' });
      gus.update(dt, { x: car.x, y: car.y, z: 14, vx: 0, vy: 0, facing: car.angle, pose: 'crouch' });
      game.focus(car.x, car.y, 0);
      const left = (auto ? 6 : 30) - t, clean = 1 - Rink.scuffTotal() / Math.max(1, start);
      if ((left <= 0 || (UI.anyPressed('cancel') && !auto)) && !done) {
        done = true; const perfect = clean > .9;
        if (perfect) { A.sfx('star'); UI.toast('PERFECT FLOOD!', 'BOOM +30 for your team'); Bus.emit('flood_perfect', { team: back.team || 0 }); }
        Rink.clearScuff(1); Items.refreeze();
        if (back.done) back.done(clean); else if (back.back && M) game.go('match', { resume: true, flood: perfect ? { team: back.team || 0, boom: 30 } : null }, { fade: 'wipe' });
      }
      this.clean = clean; this.left = left;
    },
    draw(r) {
      if (M) { M.map.drawFloor(r); Arena.background(r); L.enabled = true; L.ambient = .75; }
      const c = car, view = Draw.view(r);
      r.shadow(c.x, c.y, 16, .4);
      r.queue(c.x, c.y, 0, g => {
        const ca = Math.cos(c.angle), sa = Math.sin(c.angle), P0 = (f, s, z) => r.w(c.x + ca * f - sa * s, c.y + sa * f + ca * s, z);
        const body = [P0(-16, -10, 4), P0(16, -10, 4), P0(16, 10, 4), P0(-16, 10, 4)], top = [P0(-16, -10, 16), P0(16, -10, 16), P0(16, 10, 16), P0(-16, 10, 16)];
        px.poly(g, [body[0], body[1], top[1], top[0]], '#2a5a9a'); px.poly(g, [body[1], body[2], top[2], top[1]], '#1a4a8a'); px.poly(g, [body[2], body[3], top[3], top[2]], '#3a6aaa'); px.poly(g, [body[3], body[0], top[0], top[3]], '#2a5090');
        px.poly(g, top, '#e8eef6'); const lg = P0(10, 0, 16); E.font.text(g, 'FLOOD', lg[0], lg[1] - 3, '#c83a2a', { font: 'tiny', align: 'center', outline: false });
        for (const [f, s] of [[-10, -11], [10, -11], [-10, 11], [10, 11]]) { const w = P0(f, s, 3); px.disc(g, w[0], w[1], 3, '#141418'); }
        const bl = P0(-18, 0, 1); px.rect(g, bl[0] - 8, bl[1] - 1, 16, 2, '#9ab8d8');
      });
      r.actor(c.x, c.y, 16, (g, ox, oy) => gus.draw(g, ox, oy, view));
      r.overlay(g => {
        const sf = Hud.safe(r); UI.panel(g, r.W / 2 - 100, sf.y0, 200, 36);
        UI.text(g, 'THE FLOOD WAGON', r.W / 2, sf.y0 + 4, UI.GOLD, { align: 'center' });
        UI.text(g, 'ICE CLEAN ' + Math.round((this.clean || 0) * 100) + '%    TIME ' + Math.max(0, Math.ceil(this.left || 0)), r.W / 2, sf.y0 + 16, '#ffffff', { align: 'center' });
        E.ui.bar(g, r.W / 2 - 80, sf.y0 + 27, 160, 4, this.clean || 0, (this.clean || 0) > .9 ? '#5ae05a' : '#5ad0ff');
        if (!auto) UI.legend(g, r, [['shoot', 'GAS'], ['deke', 'BRAKE'], ['pass', 'HONK'], ['cancel', 'FINISH']]);
        else UI.text(g, "OLD GUS RESURFACES THE ICE...", r.W / 2, sf.y1 - 16, '#ffffff', { align: 'center' });
      });
    }
  };
})();

// ---- 50-story.js ----
/* ---- Story: THE CUP RUN's flow. Map -> pre-game cutscene (a choice) -> [warm-up] -> card -> game -> results -> post-game -> map ---- */
const Story = (() => {
  let cur = null;   // { n, attempt, choice: {...} }
  const chapter = n => STORY.CHAPTERS[n - 1];
  function open(n) { cur = { n, attempt: (cur && cur.n === n ? cur.attempt + 1 : 1), choice: Object.assign({}, Save.data.story.choices[n] || {}) }; game.go('cutscene', { id: chapter(n).pre, next: 'pregame' }, { fade: 'wipe' }); }
  function choose(effect) { if (!cur) return; Object.assign(cur.choice, effect); Save.data.story.choices[cur.n] = cur.choice; Save.write(); }
  function config(n, extra = {}) {
    const ch = chapter(n), c = (cur && cur.choice) || {};
    return Object.assign({ home: 'muskrats', away: ch.rival, arena: ch.arena, periods: ch.periods, len: ch.len, ot: ch.ot, shootout: ch.shootout, showcase: ch.showcase, boss: ch.boss,
      chapter: n, diffStep: ch.diffStep || 0, tactic: c.tactic || null, louLoose: c.lou === 'loose', louIce: c.lou === 'ice', huntBear: c.bear === 'hunt', doris: c.doris || 'early',
      objectives: ch.objectives.filter(o => o.on), seed: n * 1000 + (cur ? cur.attempt : 1), humans: [{ input: game.input, team: 0 }], flood: true,
      onOver: m => game.go('results', { m, story: n }, { fade: 'iris' }) }, extra);
  }
  function play(n) { const cfg = config(n); game.go('match', cfg, { fade: 'iris' }); }
  /** after the game: stars, unlocks, then the post-game cutscene (a win) or Marge's pep talk (a loss) */
  function finish(m, n) {
    const ch = chapter(n), won = m.winner === 0, stars = ch.objectives.map(o => o.id === 'win' ? won : !!(m.objectives.find(x => x.id === o.id) || {}).done);
    const before = Save.stars(), old = Save.data.story.stars[n] || [false, false, false];
    if (won || stars.some(Boolean)) Save.data.story.stars[n] = old.map((v, i) => v || stars[i]);
    if (won) { Save.data.story.chapter = Math.max(Save.data.story.chapter, Math.min(5, n + 1)); if (n === 5) Save.data.story.done = true; }
    Save.write();
    const unlocks = STORY.UNLOCKS.filter(([k]) => before < k && Save.stars() >= k).map(u => u[2]);
    return { won, stars, unlocks };
  }
  return { open, choose, config, play, finish, chapter, get cur() { return cur; }, set cur(v) { cur = v; } };
})();

/* ---- the cutscene runner: sets, staged characters, dialog with live portraits and babble, choices; hold cancel to skip ---- */
scenes.cutscene = (() => {
  let data = null, cut = null, i = 0, talk = null, cast = [], skipT = 0, waiting = false, cupT = -1, t = 0, choiceShown = false;
  const C = Rink.C;
  const SETS = {
    locker: { floor: ['#6a5a48', '#5a4a3a'], wall: '#7a5636', trim: '#4a3020', light: '#ffd8a0', amb: .55 },
    'locker-dark': { floor: ['#3a3a40', '#2e2e34'], wall: '#44484e', trim: '#2a2c30', light: '#c8ffd0', amb: .4 },
    rink: { ice: true, light: '#ffffff', amb: .7 }, pond: { snow: true, light: '#ff9a3a', amb: .45 }, mall: { floor: ['#e0d8ea', '#d0c8dc'], wall: '#3a3048', trim: '#e0389a', light: '#ffe0ff', amb: .7, neon: true },
    tunnel: { floor: ['#2a2420', '#221c18'], wall: '#141414', trim: '#d9a520', light: '#ffffff', amb: .5 }
  };
  function stage() {
    cast = cut.cast.map((id, k) => { const c = Rigs.cast(id), n = cut.cast.length, x = 160 + (k - (n - 1) / 2) * 34, y = 100 + (k % 2) * 10; return { id, c, x, y, facing: PI / 2, pose: null, expr: null, hidden: id === 'glitterman' && cut.steps.some(s => s.enter === 'glitterman') }; });
  }
  function next() {
    while (i < cut.steps.length) {
      const st = cut.steps[i++];
      if (Array.isArray(st)) { const [who, text, expr] = st; return say(who, text, expr); }
      if (st.pose) { const a = cast.find(c => c.id === st.pose[0]); if (a) a.pose = st.pose[1]; }
      if (st.enter) { const a = cast.find(c => c.id === st.enter); if (a) { a.hidden = false; a.x = 300; game.tween(a, { x: 230 }, .8); } }
      if (st.exit) { const a = cast.find(c => c.id === st.exit); if (a) game.tween(a, { x: 360 }, .8); }
      if (st.cup) { cupT = 0; A.sfx('kaboom'); A.sfx('horn'); }
      if (st.choice) return choice(st.choice);
    }
    done();
  }
  function say(who, text, expr) {
    const a = cast.find(c => c.id === who), c = (a && a.c) || Rigs.cast(who);
    for (const x of cast) x.expr = null; if (a) { a.expr = expr || 'smile'; a.c.rig._talk = true; }
    talk.voice = Synth.dialogVoice(c.voice); waiting = true;
    const vars = { tacticLine: (Story.cur && Story.cur.choice.line) || "skate like there's no tomorrow." };
    talk.say(text, { name: c.name, portrait: c.rig, portraitOpts: { zoom: 3.2, turn: .5 }, vars, onDone: () => { waiting = false; if (a) a.c.rig._talk = false; next(); } });
    Synth.babble(text.replace(/\{[^}]*\}/g, ''), c.voice, { maxSyl: 18, vol: .5 });
  }
  function choice(id) {
    const ch = STORY.CHOICES[id], c = Rigs.cast(ch.who); waiting = true; choiceShown = true;
    talk.voice = Synth.dialogVoice(c.voice);
    talk.say(ch.text, { name: c.name, portrait: c.rig, choices: ch.options.map(o => o[0]), onChoice: k => { Story.choose(ch.options[k][1]); A.sfx('pick'); }, onDone: () => { waiting = false; next(); } });
  }
  function done() {
    if (data.onDone) return data.onDone();
    if (data.next === 'pregame') return game.go('pregame', { n: Story.cur.n }, { fade: 'wipe' });
    if (data.next === 'ending') return game.go('credits', { ending: true }, { fade: 'white' });
    if (data.next) return game.go(data.next, data.nextData || null, { fade: 'wipe' });
    game.go('storymap', null, { fade: 'wipe' });
  }
  function skip() {
    // the default choice applies; any choice still ahead is taken as its first option
    for (let k = i; k < cut.steps.length; k++) if (cut.steps[k].choice && !choiceShown) Story.choose(STORY.CHOICES[cut.steps[k].choice].options[0][1]);
    talk.close(); done();
  }
  return {
    view: 'brawler', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [],
    enter(d) {
      data = d || { id: 'ch1-pre' }; cut = STORY.CUTS[data.id]; i = 0; skipT = 0; cupT = -1; t = 0; choiceShown = false;
      talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd36a', nameColor: '#ffd36a' });
      stage(); Synth.music(cut.music || 'locker'); Cam.apply('brawler', 1.25); game.cam.smooth = 0; game.focus(160, 100, 18); L.enabled = true; L.ambient = (SETS[cut.set] || SETS.locker).amb;
      game.weather = cut.set === 'pond' ? { kind: 'snow', amount: .5 } : null;
      next();
    },
    exit() { game.weather = null; },
    update(dt) {
      t += dt; Glyphs.sync();
      if (UI.anyRepeat && game.players.some(p => p.down('cancel'))) { skipT += dt; if (skipT > 1) { skipT = 0; return skip(); } } else skipT = 0;
      talk.update(dt);
      for (const a of cast) a.c.rig.update(dt, { x: a.x, y: a.y, z: 0, vx: 0, vy: 0, facing: a.facing, pose: cupT >= 0 && a.id === 'dunny' ? 'cheer' : a.pose, expr: a.expr });
      if (cupT >= 0) { cupT += dt; if (Math.floor(cupT * 4) !== Math.floor((cupT - dt) * 4) && cupT < 3) { P.explosion(160 + (RNG.fx() - .5) * 80, 90, 40, .8, { shake: 0 }); for (let k = 0; k < 6; k++) P.bits(160, 100, 40, 6, ['#ff3a3a', '#ffd040', '#3aff8a', '#5a8aff']); } }
      game.focus(160, 100, 18);
    },
    draw(r) {
      const set = SETS[cut.set] || SETS.locker, view = Draw.view(r);
      r.sky(['#05070c', '#0a0e18', '#101828']);
      // the set: a floor, a back wall, benches or snow, lights
      r.decal(g => {
        const P0 = (x, y, z) => r.w(x, y, z);
        const fl = [P0(20, 40, 0), P0(300, 40, 0), P0(300, 170, 0), P0(20, 170, 0)];
        px.poly(g, fl, set.ice ? '#dfeaf4' : set.snow ? '#e8f0fa' : set.floor[0]);
        if (!set.ice && !set.snow) for (let x = 20; x < 300; x += 16) { const a = P0(x, 40, 0), b = P0(x, 170, 0); px.line(g, a[0], a[1], b[0], b[1], set.floor[1], 1); }
        if (set.ice) { const a = P0(160, 40, 0), b = P0(160, 170, 0); px.line(g, a[0], a[1], b[0], b[1], '#c83a2a', 2); }
        const wl = [P0(20, 40, 0), P0(300, 40, 0), P0(300, 40, 80), P0(20, 40, 80)];
        px.poly(g, wl, set.ice ? '#6a4a2e' : set.snow ? '#1a2a4a' : set.wall);
        if (set.snow) { for (let k = 0; k < 9; k++) { const p = P0(30 + k * 32, 40, 0); px.poly(g, [[p[0], p[1] - 46 - (k % 3) * 8], [p[0] - 12, p[1]], [p[0] + 12, p[1]]], '#1a3a2a'); } }
        else if (!set.ice) {
          for (let k = 0; k < 8; k++) { const a = P0(34 + k * 34, 40, 30), b = P0(56 + k * 34, 40, 76); px.rect(g, a[0], b[1], b[0] - a[0], a[1] - b[1], E.shade(set.wall, -.15)); px.rect(g, a[0], b[1], b[0] - a[0], 2, set.trim); }
          const bn = [P0(30, 50, 10), P0(290, 50, 10), P0(290, 62, 10), P0(30, 62, 10)]; px.poly(g, bn, set.trim);
          if (cut.set.startsWith('locker')) { const s = P0(160, 40, 60); E.font.text(g, cut.set === 'locker' ? 'MUKLUK FALLS MUSKRATS' : 'VISITORS', s[0], s[1], '#ffe08a', { align: 'center', outline: false }); }
          if (set.neon) for (let k = 0; k < 3; k++) { const s = P0(70 + k * 90, 40, 64); px.rect(g, s[0] - 20, s[1] - 4, 40, 10, '#1a1028'); E.font.text(g, ['MEGAMALL', 'FOOD', 'SALE!'][k], s[0], s[1] - 2, ['#ff5ab0', '#5affe0', '#ffe070'][k], { font: 'tiny', align: 'center', outline: false }); }
        } else { const s = P0(160, 40, 54); E.font.text(g, "THE OL' ICEBOX", s[0], s[1], '#ffe08a', { align: 'center', outline: false }); }
      });
      for (const a of cast) { if (a.hidden) continue; r.shadow(a.x, a.y, 7, .35); r.actor(a.x, a.y, 0, (g, ox, oy) => a.c.rig.draw(g, ox, oy, view)); }
      if (cupT >= 0) r.queue(cast[0].x, cast[0].y, 40, g => { const [x, y] = r.w(cast[0].x, cast[0].y, 38); px.rect(g, x - 3, y - 2, 6, 6, '#e8c040'); px.rect(g, x - 5, y - 6, 10, 4, '#ffe070'); px.rect(g, x - 1, y + 4, 2, 3, '#c8a030'); px.dot(g, x - 3, y - 5, '#ffffff'); }, { emissive: true });
      L.add(160, 90, 90, 220, 1, { color: set.light });
      talk.draw(r);
      r.overlay(g => {
        const sf = Hud.safe(r);
        if (skipT > 0) { const k = Math.min(1, skipT); for (let a = 0; a < k * TAU; a += .2) px.dot(g, sf.x1 - 20 + Math.cos(a - PI / 2) * 8, sf.y0 + 12 + Math.sin(a - PI / 2) * 8, UI.GOLD); }
        Glyphs.text(g, 'HOLD {cancel} SKIP', sf.x1 - 34, sf.y0 + 8, '#9fb0c8', { align: 'right' });
        if (Story.cur && data.id.endsWith('pre')) UI.text(g, 'CHAPTER ' + Story.cur.n + ': ' + Story.chapter(Story.cur.n).title.toUpperCase(), sf.x0, sf.y0 + 4, UI.GOLD);
      });
    }
  };
})();

/* ---- the pre-game card: matchup, barn, objectives with star slots, the tactic; warm-up drills in chapter 1 ---- */
scenes.pregame = (() => {
  let n = 1, menu = null;
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter(d) {
      n = (d && d.n) || 1;
      const items = [{ label: 'FACE OFF!', sub: 'Play the game', pick: () => Story.play(n) }];
      if (n === 1) items.push({ label: 'WARM UP', sub: "Coach Marge's drills 1-3", pick: () => Drills.warmup(n) });
      items.push({ label: 'BACK TO MAP', sub: '', pick: () => game.go('storymap') });
      menu = new UI.Tiles(items, { layout: (r, its) => UI.grid(its.length, its.length, r.W / 2, r.H - 78, 112, 40, 10), cancel: () => game.go('storymap') });
      Synth.music('locker');
    },
    update(dt) { Glyphs.sync(); menu.update(dt); },
    draw(r) {
      const ch = Story.chapter(n), home = TEAMS.muskrats, away = TEAMS[ch.rival], c = Story.cur ? Story.cur.choice : {};
      r.sky(['#0a1020', '#121c34', '#1a2a48']);
      r.overlay(g => {
        UI.title(g, 'CHAPTER ' + n, r.W / 2, 10, 2); UI.title(g, ch.title.toUpperCase(), r.W / 2, 28, 3);
        for (const [t, x] of [[home, r.W / 2 - 100], [away, r.W / 2 + 100]]) { const spr = LOGOS.sprite(t.logo); px.sprite(g, spr, x - 24, 62, { scale: 2 }); UI.text(g, t.short, x, 114, '#ffffff', { align: 'center' }); }
        UI.title(g, 'VS', r.W / 2, 80, 2);
        UI.text(g, ARENAS[ch.arena].name.toUpperCase() + '  ·  '.replace('·', '-') + ch.periods + ' x ' + U.mmss(ch.len), r.W / 2, 128, UI.MUTED, { align: 'center' });
        const stars = Save.data.story.stars[n] || [];
        ch.objectives.forEach((o, k) => UI.text(g, (stars[k] ? '★ ' : '- ') + o.text, r.W / 2 - 90, 142 + k * 11, stars[k] ? UI.GOLD : '#ffffff'));
        const tac = c.tactic ? (c.tactic === 'finesse' ? 'TACTIC: CLEAN AND FAST' : 'TACTIC: MEAN AND LOUD') : c.lou ? (c.lou === 'loose' ? 'LOU IS LOOSE' : 'LOU KEEPS IT ON THE ICE') : c.bear ? (c.bear === 'hunt' ? 'HUNT THE BEAR' : 'IGNORE THE BEAR') : c.doris ? 'DORIS PLAYS ' + c.doris.toUpperCase() : '';
        if (tac) UI.text(g, tac, r.W / 2, 178, '#c8a0ff', { align: 'center' });
        menu.draw(g, r);
        UI.legend(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
      });
    }
  };
})();

/* ---- the story map: a snowy highway, the bus, five town stops with their stars ---- */
scenes.storymap = (() => {
  let menu = null, bus = 0;
  const STOPS = [[.12, .62], [.3, .38], [.5, .6], [.7, .36], [.88, .55]];
  const mapBg = new E.Backdrop({ sky: ['#0e1a34', '#2a4a7a', '#8ab0d8'], moon: { x: .82, y: .16, r: 10, color: '#f0f4ff' }, stars: 70, starsY: .5,
    layers: [{ kind: 'mountains', color: '#5a7aaa', y: .48, height: .26, parallax: 0 }, { kind: 'hills', color: '#7a9ac8', y: .55, height: .12, parallax: 0 }, { kind: 'forest', color: '#24443a', y: .6, height: .1, parallax: 0 }] });
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter() {
      const open = Save.data.story.chapter;
      menu = new UI.Tiles(STORY.CHAPTERS.map((ch, k) => ({ label: String(k + 1), ch, disabled: k + 1 > open, pick: () => Story.open(k + 1), draw: (g, x, y, w, h, f) => stopDraw(g, x, y, w, h, f, k) })),
        { start: Math.min(4, open - 1), layout: r => STOPS.map(([u, v]) => ({ x: Math.round(r.W * u - 22), y: Math.round(r.H * v - 22), w: 44, h: 44 })), cancel: () => game.go('title', { menu: true }) });
      bus = menu.i; Synth.music('menu'); UI.Idle.reset();
    },
    update(dt) { Glyphs.sync(); menu.update(dt); bus += (menu.i - bus) * Math.min(1, dt * 3); if (UI.Idle.update(dt) > 10) game.go('attract', null, { fade: 'dissolve' }); },
    draw(r) {
      mapBg.draw(r);
      r.overlay(g => {
        // snowy hills, the highway between the stops
        for (let i = 0; i < 60; i++) px.dot(g, (i * 97) % r.W, (i * 53) % Math.round(r.H * .45), i % 3 ? '#8aa8d8' : '#ffffff');   // stars over the highway
        for (let k = 0; k < 3; k++) { const y0 = r.H * (.6 + k * .1), cols = [['#c8d8ec', '#b8cce4'], ['#dde8f6', '#ccdcee'], ['#eef4fc', '#e0eaf6']][k], t2 = E.tones(cols[0]); px.poly(g, [[0, r.H], [0, y0], ...Array.from({ length: 9 }, (_, i) => [r.W * i / 8, y0 + Math.sin(i * 1.7 + k) * 10]), [r.W, r.H]], cols[0]);
          for (let x = 0; x < r.W; x += 2) for (let y = Math.round(y0 + 8); y < r.H; y += 2) { const h = E.hash2(x + k * 7, y); if (h > .7) px.dot(g, x + (y % 2), y, h > .95 ? t2.hi : cols[1]); } }
        for (let i = 0; i < STOPS.length - 1; i++) { const [a, b] = [STOPS[i], STOPS[i + 1]]; px.line(g, r.W * a[0], r.H * a[1], r.W * b[0], r.H * b[1], '#5a5a6a', 5); px.line(g, r.W * a[0], r.H * a[1], r.W * b[0], r.H * b[1], '#ffe070', 1); }
        for (let i = 0; i < 14; i++) { const x = (i * 53) % r.W, y = r.H * .5 + (i * 29) % (r.H * .4); px.poly(g, [[x, y - 14], [x - 6, y], [x + 6, y]], '#2a5a3a'); }
        menu.draw(g, r);
        const k = Math.floor(bus), u = bus - k, a = STOPS[k], b = STOPS[Math.min(4, k + 1)], bx = r.W * lerp(a[0], b[0], u), by = r.H * lerp(a[1], b[1], u) - 30;
        px.rect(g, bx - 12, by - 6, 24, 11, '#e8b43a'); px.rect(g, bx - 10, by - 4, 6, 4, '#bfe8ff'); px.rect(g, bx - 2, by - 4, 6, 4, '#bfe8ff'); px.rect(g, bx + 6, by - 4, 4, 4, '#bfe8ff'); px.disc(g, bx - 7, by + 5, 2.5, '#141418'); px.disc(g, bx + 7, by + 5, 2.5, '#141418');
        const ch = STORY.CHAPTERS[menu.i], sf = Hud.safe(r);
        UI.title(g, 'THE CUP RUN', r.W / 2, sf.y0, 3);
        UI.panel(g, r.W / 2 - 150, sf.y0 + 30, 300, 50);
        UI.text(g, 'CHAPTER ' + ch.n + ': ' + ch.title.toUpperCase(), r.W / 2, sf.y0 + 35, UI.GOLD, { align: 'center' });
        UI.text(g, ARENAS[ch.arena].name + ' vs ' + TEAMS[ch.rival].name, r.W / 2, sf.y0 + 47, '#ffffff', { align: 'center' });
        UI.text(g, ch.n > Save.data.story.chapter ? 'LOCKED: win chapter ' + (ch.n - 1) + ' first' : ch.mech, r.W / 2, sf.y0 + 59, UI.MUTED, { align: 'center' });
        UI.text(g, 'STARS ' + Save.stars() + '/15', sf.x1, sf.y0 + 4, UI.GOLD, { align: 'right' });
        UI.legend(g, r, [['confirm', 'PLAY'], ['cancel', 'BACK']]);
      });
    }
  };
  function stopDraw(g, x, y, w, h, f, k) {
    const ch = STORY.CHAPTERS[k], locked = k + 1 > Save.data.story.chapter, t = TEAMS[ch.rival], stars = Save.data.story.stars[k + 1] || [];
    UI.panel(g, x, y, w, h, { border: f ? UI.GOLD : '#5a6a8a', bg: locked ? ['#2a2a34', '#1a1a20'] : ['#1a2a48', '#0e1830'] });
    if (!locked) px.sprite(g, LOGOS.sprite(t.logo), x + w / 2 - 12, y + 3, { scale: 1 }); else UI.text(g, 'LOCKED', x + w / 2, y + 12, '#6a6a7a', { align: 'center', font: { font: 'tiny' } });
    for (let i = 0; i < 3; i++) E.font.text(g, '★', x + w / 2 - 12 + i * 9, y + 31, stars[i] ? UI.GOLD : '#3a4458', { outline: false });
    UI.text(g, String(k + 1), x + 4, y + 2, f ? UI.GOLD : '#ffffff');
  }
})();

// ---- 55-scenes-menus.js ----
/* ---- the title and main menu: the Ol' Icebox at night, two teams skating lazily, the logo slams in ---- */
const Title = (() => {
  let bgMatch = null;
  /** a quiet all-AI match behind the menus (no clock, no booth, no HUD) */
  function backdrop(arena = 'icebox') {
    if (bgMatch && M === bgMatch && M.cfg.arena === arena) return;
    const away = Save.data.story.done ? 'grizzlies' : 'drillers';
    Match.start({ home: 'muskrats', away, arena, periods: 99, len: 9999, attract: true, noTalk: true, noResults: true, noClock: true, intros: false, replays: false, noFights: true, aiSkill: [.4, .4], seed: 7 });
    M.attractHud = true; M.attractNoReplay = true; bgMatch = M;
  }
  function drawBackdrop(r, dim = .45) {
    Draw.world(r);
    for (let i = 0; i < 2; i++) { const a = game.time * .5 + i * PI; L.add(Rink.C.x + Math.cos(a) * 260, Rink.C.y + Math.sin(a * 1.3) * 120, 10, 120, 1.4, { color: '#ffffff' }); }
    L.ambient = .32;
    r.overlay(g => px.blend(g, dim, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05070c')));
  }
  return { backdrop, drawBackdrop, get bg() { return bgMatch; } };
})();

scenes.title = (() => {
  let stage = 'press', t = 0, menu = null, logoT = 0;
  const tiles = () => [
    { id: 'story', label: Save.data.story.chapter > 1 || Save.stars() ? 'CUP RUN' : 'CUP RUN', sub: Save.data.story.chapter > 1 ? 'Continue: chapter ' + Save.data.story.chapter : 'New story', pick: () => game.go('storymap', null, { fade: 'wipe' }) },
    { id: 'exhibition', label: 'EXHIBITION', sub: '1-4 players', pick: () => game.go('sides', null, { fade: 'wipe' }) },
    { id: 'practice', label: 'PRACTICE', sub: "Marge's drills", pick: () => game.go('practice', null, { fade: 'wipe' }) },
    { id: 'records', label: 'RECORDS', sub: 'Stars and bests', pick: () => game.go('records', null, { fade: 'wipe' }) },
    { id: 'settings', label: 'SETTINGS', sub: 'Sound, camera, symbols', pick: () => game.menu('settings') },
    { id: 'about', label: 'ABOUT', sub: 'Credits and notes', pick: () => game.go('about', null, { fade: 'wipe' }) }
  ];
  function build() { menu = new UI.Tiles(tiles(), { layout: (r, its) => UI.grid(its.length, 3, r.W / 2, Math.round(r.H * .5), Math.min(124, Math.floor((r.W - 60) / 3)), 38, 8, 8), cancel: () => { stage = 'press'; } }); }
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [],
    get menuIndex() { return menu ? menu.i : -1; },
    enter(d) {
      t = 0; logoT = d && d.menu ? 9 : 0; stage = d && d.menu ? 'menu' : 'press'; build(); Title.backdrop('icebox'); Synth.music('theme'); UI.Idle.reset();
      Cam.apply('threequarter', .62); game.cam.smooth = .4; game.weather = null; game.input.consumeAll();
    },
    update(dt) {
      t += dt; logoT += dt; Glyphs.sync();
      if (M) { Match.step(dt); }
      game.focus(Rink.C.x + Math.sin(t * .1) * 120, Rink.C.y, 0);
      if (logoT > .55 && logoT - dt <= .55) { A.sfx('kaboom'); A.sfx('horn'); game.shake(4); P.explosion(Rink.C.x, Rink.C.y - 60, 40, 1.2, { shake: 0 }); }
      const idle = UI.Idle.update(dt);
      if (idle > 10 && !game.paused) return game.go('attract', null, { fade: 'dissolve' });
      if (Touch.only) { const c = game.input.clicked(); if (c && this.setBtn && c[0] > this.setBtn[0] && c[0] < this.setBtn[0] + this.setBtn[2] && c[1] > this.setBtn[1] && c[1] < this.setBtn[1] + this.setBtn[3]) game.menu('settings'); return; }
      if (stage === 'press') { if (logoT > .6 && (game.players.some(p => p.anyPressed()) || game.input.clicked())) { game.players.forEach(p => p.consumeAll()); stage = 'menu'; A.sfx('pick'); } return; }
      menu.update(dt);
    },
    draw(r) {
      Title.drawBackdrop(r, stage === 'menu' ? .55 : .35);
      r.overlay(g => {
        const sf = Hud.safe(r), k = Math.min(1, logoT / .55), sc = Math.max(3, Math.round(5 - k * 1.2)), y = Math.round(sf.y0 + (stage === 'menu' ? 2 : r.H * .18) - (1 - k) * 60);
        const sh = logoT > .55 && logoT < .9 ? Math.round(Math.sin(logoT * 80) * 3) : 0;
        UI.title(g, 'ICE HOC-KABOOM', r.W / 2 + sh, y, Math.min(sc, r.W < 360 ? 3 : 4), ['#ffffff', '#cfe8ff', '#ffd36a', '#ff7a2a', '#c01a1a']);
        UI.text(g, 'OVER-THE-TOP 3-ON-3 ARCADE HOCKEY', r.W / 2, y + 40, '#cfe8ff', { align: 'center' });
        if (Save.data.story.done) { px.rect(g, r.W / 2 - 4, y + 52, 8, 7, '#e8c040'); px.rect(g, r.W / 2 - 6, y + 50, 12, 3, '#ffe070'); UI.text(g, 'KABOOM CUP CHAMPIONS', r.W / 2, y + 62, UI.GOLD, { align: 'center' }); }
        if (Touch.only) {
          UI.panel(g, r.W / 2 - 130, r.H * .5, 260, 34, { border: '#ff7a5a' }); UI.text(g, 'Controller or keyboard required', r.W / 2, r.H * .5 + 6, '#ffffff', { align: 'center' }); UI.text(g, 'Connect one to play. The demo runs meanwhile.', r.W / 2, r.H * .5 + 18, UI.MUTED, { align: 'center' });
          this.setBtn = [Math.round(r.W / 2 - 60), Math.round(r.H * .5 + 48), 120, 30]; UI.panel(g, ...this.setBtn, { border: UI.GOLD }); UI.text(g, 'SETTINGS', r.W / 2, this.setBtn[1] + 9, UI.GOLD, { align: 'center', scale: 1 });
        } else if (stage === 'press') { if (Math.floor(t * 2) % 2 === 0) { const dev = game.input.lastDevice; UI.text(g, dev === 'gamepad' ? 'PRESS ANY BUTTON' : 'PRESS ANY KEY', r.W / 2, r.H * .62, '#ffffff', { align: 'center', scale: 2 }); } }
        else {
          menu.draw(g, r);
          const it = menu.items[menu.i]; UI.text(g, TEXT.menu[it.id] || '', r.W / 2, Math.round(r.H * .5) + 96, UI.MUTED, { align: 'center' });
          UI.legend(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
        }
        E.font.text(g, 'v' + VERSION + ' · '.replace('·', '-') + (E.versionLabel ? E.versionLabel().replace(/·/g, '-') : ''), sf.x0, r.H - 10, '#5a6a8a', { font: 'tiny', outline: false });
      });
    }
  };
})();

/* ---- attract mode: a looping AI reel through every feature, kiosk style; any input exits (PLAN 15.1) ---- */
scenes.attract = (() => {
  const SEG = [['PUCK DROP', 8], ['BIG HITS', 8], ['HIGHLIGHT GOAL', 12], ['GLOVES OFF', 10], ['KABOOM!', 10], ['FAN FRENZY', 7], ['THE CUP RUN', 8], ['THE FLOOD WAGON', 6], ['RECORDS', 5]];
  let seg = 0, t = 0, loop = 0, visited = new Set(), talk = null, did = {};
  const pairs = [['muskrats', 'drillers', 'icebox'], ['lumberjacks', 'bruisers', 'pond'], ['bruisers', 'muskrats', 'grindhouse'], ['marauders', 'lumberjacks', 'mall'], ['grizzlies', 'muskrats', 'dome']];
  function newMatch(intros) {
    const [h, a, ar] = pairs[loop % pairs.length];
    Match.start({ home: h, away: a, arena: ar, periods: 99, len: 999, attract: true, noTalk: false, noResults: true, intros: !!intros, replays: true, aiSkill: [.8, .8], seed: 100 + loop, cheats: { turbo: true } });
    M.attract = true; M.attractHud = false; Synth.music(M.arena.music || 'play');
    game.weather = M.arena.weather ? Object.assign({}, M.arena.weather) : null;
  }
  function begin(k) {
    seg = k; t = 0; did = {}; visited.add(k);
    const id = SEG[k][0];
    if (k === 0) newMatch(true);
    if (!M || !M.attract) newMatch(false);
    if (id === 'THE FLOOD WAGON') return game.go('flood', { auto: true, done: () => game.go('attract', { seg: 8, loop }, { fade: 'dissolve' }) }, { fade: 'dissolve' });
    if (id === 'THE CUP RUN') { talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a' }); }
  }
  const lineup = () => M.skaters.filter(s => s.state !== 'bin');
  function script(dt) {
    const id = SEG[seg][0], C = Rink.C;
    if (id === 'BIG HITS' && !did.hit && t > .5) {
      did.hit = true; const [a, b] = [M.skaters[0], M.skaters[3]];
      Object.assign(b, { x: C.x + 100, y: Rink.Y0 + 20, vx: 0, vy: 0, state: 'skate' }); Object.assign(a, { x: C.x + 100, y: Rink.Y0 + 90, vx: 0, vy: -240, facing: -PI / 2, state: 'skate', holdTurbo: true, turbo: 1 });
      if (M.phase !== 'play') Match.setPhase('play');
      Skater.check(a); Puck.take(b, M.puck);
    }
    if (id === 'BIG HITS' && did.hit && !did.glass && t > 1.6) { did.glass = true; Hits.breakPanel(Rink.panelAt(C.x + 100, Rink.Y0), 'shattered', M.skaters[3]); }
    if (id === 'HIGHLIGHT GOAL' && !did.set && t > .3) {
      did.set = true; if (M.phase !== 'play') Match.setPhase('play');
      const t0 = 0, g = Skater.attackGoal(t0), dir = -Rink.outDir(g.side), [c, w] = [M.skaters[0], M.skaters[1]];
      Object.assign(c, { x: g.x + dir * 120, y: C.y - 40, vx: -dir * 80, vy: 0, state: 'skate' }); Object.assign(w, { x: g.x + dir * 40, y: C.y + 34, vx: -dir * 30, vy: 0, state: 'skate' });
      for (const o of M.skaters.filter(s => s.team === 1)) Object.assign(o, { x: C.x - dir * 60, y: C.y + (o.slot - 1) * 60, vx: 0, vy: 0 });
      Puck.take(c, M.puck); M.goalies[1].slowT = 9;
    }
    if (id === 'HIGHLIGHT GOAL' && did.set && !did.pass && t > 1.1 && M.puck.owner === M.skaters[0]) { did.pass = true; const w = M.skaters[1]; Skater.pass(M.skaters[0], { to: w }); w.oneTimer = .9; M.goalies[1].track = null; M.goalies[1].x += 0; T._attractRead = T.goalieRead; T.goalieRead = 3; }
    if (id === 'HIGHLIGHT GOAL' && t > 4 && T._attractRead !== undefined) { T.goalieRead = T._attractRead; delete T._attractRead; }
    if (id === 'GLOVES OFF' && !did.fight && t > .3) { did.fight = true; if (M.phase !== 'play') Match.setPhase('play'); const a = M.skaters[2], b = M.skaters[5]; b.x = a.x + 20; b.y = a.y; M.fights = 0; M.lastFightClock = 1e9; Fight.begin(a, b); }
    if (id === 'KABOOM!' && !did.k && t > .3) {
      did.k = true; if (M.phase === 'fight' || M.phase !== 'play') { Fight.reset(); Match.setupFaceoff([C.x, C.y]); Match.setPhase('play'); M.puck.held = false; }
      Boom.start(0); const s = M.skaters[1], g = Skater.attackGoal(0), dir = -Rink.outDir(g.side);
      Object.assign(s, { x: g.x + dir * 110, y: C.y + 10, vx: 0, vy: 0, state: 'skate', facing: dir > 0 ? PI : 0 }); Puck.take(s, M.puck);
      s.ai.holdShoot = 0; s.shootHold = .19; s.winding = true; s.charge = .96; did.kStart = t;
    }
    if (id === 'KABOOM!' && did.k && !did.kShot && t - did.kStart > .6 && M.puck.owner === M.skaters[1]) { did.kShot = true; const s = M.skaters[1]; s.charge = 1; Skater.shoot(s, 'slap', 1, {}); }
    if (id === 'FAN FRENZY' && !did.items && t > .3) {
      did.items = true; if (M.phase !== 'play') { Match.setupFaceoff([C.x, C.y]); }
      for (let i = 0; i < 4; i++) { const s = M.skaters[i]; Items.throwOne(M.arena.items[i % M.arena.items.length], [s.x + 20, s.y]); }
      const s = M.skaters[4]; Items.throwOne('octopus', [s.x + s.vx * .8 + 10, s.y + s.vy * .8]);
    }
    if (id === 'THE CUP RUN') {
      const lines = [['marge', 'Sit down, shut up, and listen. I got a letter.'], ['glitterman', "Enjoy the barn, folks. I've ordered the parking meters. Gold ones."], ['snipes', "This barn's got more character than his whole bank account."]];
      const k = Math.floor(t / 2.6); if (k < 3 && !did['l' + k]) { did['l' + k] = true; const c = Rigs.cast(lines[k][0]); talk.voice = Synth.dialogVoice(c.voice); talk.say(lines[k][1], { name: c.name, portrait: c.rig, auto: 2.4, modal: false }); }
      if (talk) talk.update(dt);
    }
  }
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [],
    enter(d) { loop = d && d.loop !== undefined ? d.loop : 0; visited = d && d.visited ? d.visited : visited; if (d && d.seg !== undefined) { if (!M || !M.attract) newMatch(false); seg = d.seg; t = 0; visited.add(seg); did = {}; } else { loop = (loop || 0); visited = new Set(); begin(0); } game.input.consumeAll(); UI.Idle.reset(); },
    exit() { game.weather = null; if (T._attractRead !== undefined) { T.goalieRead = T._attractRead; delete T._attractRead; } },
    update(dt) {
      Glyphs.sync();
      // any input ends it (taps on a touch-only device don't: only the settings)
      const any = game.players.some(p => p.anyPressed()) || (!Touch.only && game.input.clicked()) || game.players.some(p => { const m = p.move(); return Math.hypot(m[0], m[1]) > .3; }) || UI.Idle.update(0) === 0 && false;
      if (any && !Touch.only) { game.players.forEach(p => p.consumeAll()); return game.go('title', { menu: false }, { fade: 'dissolve' }); }
      if (Touch.only && game.input.clicked()) { game.go('title'); return; }
      t += dt;
      if (SEG[seg][0] !== 'RECORDS' && M) { Match.step(dt); Talk.update(dt); Fx.step(dt); }
      script(dt);
      if (t > SEG[seg][1]) { if (seg + 1 >= SEG.length) { loop++; begin(0); } else begin(seg + 1); }
    },
    draw(r) {
      const id = SEG[seg][0];
      if (id === 'RECORDS') {
        r.sky(['#05070c', '#0a1020', '#141c34']);
        r.overlay(g => { UI.title(g, 'ICE HOC-KABOOM', r.W / 2, r.H * .18, 4); const R2 = Save.data.records; [['HARDEST SHOT', Math.round(R2.shot / 16 * 3.6) + ' KM/H'], ['BIGGEST HIT', Math.round(R2.hit)], ['MOST GOALS IN A GAME', R2.goals], ['STORY STARS', Save.stars() + '/15']].forEach(([a, b], i) => { UI.text(g, a, r.W / 2 - 10, r.H * .42 + i * 14, UI.MUTED, { align: 'right' }); UI.text(g, String(b), r.W / 2 + 10, r.H * .42 + i * 14, UI.GOLD); }); });
      } else if (M) { Draw.world(r); Hud.draw(r, 1 / 60); Talk.draw(r); if (talk && id === 'THE CUP RUN') talk.draw(r); }
      r.overlay(g => {
        const sf = Hud.safe(r);
        UI.panel(g, sf.x0, sf.y1 - 30, 52, 16, { border: '#ff4a4a' }); UI.text(g, 'DEMO', sf.x0 + 26, sf.y1 - 26, '#ff6a5a', { align: 'center' });
        UI.text(g, id, sf.x0 + 60, sf.y1 - 26, '#ffffff');
        if (Math.floor(game.time * 2) % 2 === 0) UI.text(g, Touch.only ? 'Controller or keyboard required' : game.input.lastDevice === 'gamepad' ? 'PRESS ANY BUTTON' : 'PRESS ANY KEY', r.W / 2, sf.y1 - 46, '#ffffff', { align: 'center', scale: Touch.only ? 1 : 2 });
        E.font.title(g, 'ICE HOC-KABOOM', sf.x1, sf.y1 - 24, { align: 'right', scale: 1, colors: ['#ffffff', '#ffd36a', '#ff7a2a'] });
      });
    },
    get state() { return { segment: seg, visited: [...visited], loop }; }
  };
})();

/* ---- exhibition: sides (every joined player picks HOME or AWAY) ---- */
scenes.sides = (() => {
  let tok = [], t = 0;
  const join = () => { while (tok.length < game.players.length) tok.push({ side: 0, ready: false }); };
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter() { tok = []; t = 0; game.allowJoin({ max: 4 }); join(); tok[0].side = -1; Synth.music('menu'); UI.Idle.reset(); },
    exit() { game.allowJoin(false); },
    update(dt) {
      t += dt; Glyphs.sync(); join();
      if (UI.Idle.update(dt) > 10 && game.players.length === 1) return game.go('attract', null, { fade: 'dissolve' });
      game.players.forEach((p, i) => {
        const k = tok[i]; if (!k) return;
        if (p.repeat('left', .3, .2)) { if (!k.ready) { k.side = Math.max(-1, k.side - 1); A.sfx('move'); } }
        if (p.repeat('right', .3, .2)) { if (!k.ready) { k.side = Math.min(1, k.side + 1); A.sfx('move'); } }
        if (p.pressed('confirm') || p.pressed('pass')) { if (k.side !== 0) { k.ready = !k.ready; A.sfx(k.ready ? 'pick' : 'back'); } else A.sfx('deny'); }
        if (p.pressed('cancel')) { if (k.ready) k.ready = false; else if (i === 0) { game.go('title', { menu: true }); } A.sfx('back'); }
        if (p.pressed('start') && i === 0) { tok.forEach(x => { if (x.side !== 0) x.ready = true; }); }
      });
      // the mouse: a click on HOME or AWAY moves the keyboard player's token
      const c = game.input.clicked(), r = game.r;
      if (c && r) { const W = r.W; tok[0].side = c[0] < W * .38 ? -1 : c[0] > W * .62 ? 1 : 0; tok[0].ready = false; A.sfx('move'); }
      const active = tok.filter(k => k.side !== 0);
      if (active.length && active.every(k => k.ready)) {
        const humans = []; tok.forEach((k, i) => { if (k.side !== 0) humans.push({ input: game.players[i], team: k.side < 0 ? 0 : 1, color: E.PLAYER_COLORS[i], i }); });
        game.go('setup', { humans }, { fade: 'wipe' });
      }
    },
    draw(r) {
      r.sky(['#0a1020', '#121c34', '#1a2a48']);
      r.overlay(g => {
        const sf = Hud.safe(r);
        UI.title(g, 'EXHIBITION', r.W / 2, sf.y0, 3);
        UI.text(g, 'CHOOSE YOUR SIDE', r.W / 2, sf.y0 + 30, UI.MUTED, { align: 'center' });
        const cols = [r.W * .2, r.W * .5, r.W * .8];
        [['HOME', '#5a3a22'], ['CPU', '#2a3448'], ['AWAY', '#d8d8e0']].forEach(([lab, c], k) => { UI.panel(g, cols[k] - 50, sf.y0 + 46, 100, 120, { border: k === 1 ? '#3a4a6a' : UI.GOLD }); UI.text(g, lab, cols[k], sf.y0 + 52, k === 1 ? UI.MUTED : UI.GOLD, { align: 'center', scale: 2 }); });
        tok.forEach((k, i) => {
          const x = cols[k.side + 1], y = sf.y0 + 76 + i * 22, col = E.PLAYER_COLORS[i] || '#ffffff';
          px.rect(g, x - 40, y, 80, 18, k.ready ? col : '#141820'); px.rect(g, x - 39, y + 1, 78, 16, k.ready ? '#141820' : '#1e2638');
          UI.text(g, 'P' + (i + 1) + (k.ready ? ' READY' : ''), x, y + 5, col, { align: 'center' });
          if (!k.ready) { E.font.text(g, '<', x - 36, y + 5, col, { outline: false }); E.font.text(g, '>', x + 32, y + 5, col, { outline: false }); }
        });
        UI.text(g, game.players.length < 4 ? 'More players: press START on a free controller, or 2 on the keyboard' : 'Four players: full house!', r.W / 2, sf.y0 + 172, '#ffffff', { align: 'center' });
        if (game.players.length > 1 && game.players.some(p => p.keys === 'right' || p.device === 'keyboard-right')) UI.text(g, 'Keyboard: P1 WASD + F G H R T Y  ·  P2 arrows + . / , L ; \''.replace('·', '|'), r.W / 2, sf.y0 + 184, UI.MUTED, { align: 'center' });
        UI.legend(g, r, [['left', 'SIDE'], ['confirm', 'READY'], ['start', 'ALL READY'], ['cancel', 'BACK']]);
      });
    }
  };
})();

/* ---- exhibition: setup (home team, barn, away team; periods, length, difficulty, cheats) ---- */
scenes.setup = (() => {
  let humans = [], st = null, menu = null;
  const avail = () => TEAM_IDS.filter(id => !TEAMS[id].locked || Save.data.story.done);
  const CHEATS = [['bigheads', 'BIG HEADS'], ['octorain', 'OCTOPUS RAIN'], ['glowpuck', 'GLOW PUCK'], ['alwayskaboom', 'ALWAYS KABOOM'], ['retro', 'RETRO RIGS']];
  function cycle(key, list, d) { const i = list.indexOf(st[key]); st[key] = list[(i + d + list.length) % list.length]; }
  function card(kind) {
    return { kind, adjust: d => kind === 'arena' ? cycle('arena', ARENA_IDS, d) : cycle(kind, avail(), d), click: c => {}, pick: () => { menu.i = menu.items.findIndex(x => x.id === 'go'); },
      draw: (g, x, y, w, h, f) => {
        UI.panel(g, x, y, w, h, { border: f ? UI.GOLD : UI.EDGE });
        if (kind === 'arena') { const a = ARENAS[st.arena]; UI.text(g, 'BARN', x + w / 2, y + 4, UI.MUTED, { align: 'center' }); UI.text(g, a.name.toUpperCase(), x + w / 2, y + 30, '#ffffff', { align: 'center', wrap: w - 8 }); UI.text(g, a.town, x + w / 2, y + 52, UI.MUTED, { align: 'center' }); }
        else {
          const tm = TEAMS[st[kind]]; UI.text(g, kind === 'home' ? 'HOME (DARK)' : 'AWAY (WHITE)', x + w / 2, y + 4, UI.MUTED, { align: 'center' });
          px.sprite(g, LOGOS.sprite(tm.logo), Math.round(x + w / 2 - 12), y + 27, { scale: 2 }); UI.text(g, tm.short, x + w / 2, y + 66, '#ffffff', { align: 'center' });
          const avg = k => tm.skaters.reduce((s, p) => s + p[k], 0) / 3;
          [['SPEED', avg('spd')], ['SHOOTING', avg('sht')], ['HITTING', avg('hit')], ['GOALIE', tm.goalie.rfx]].forEach(([lab, v], i) => { UI.text(g, lab, x + 6, y + 80 + i * 10, UI.MUTED, { font: 'tiny' }); for (let p = 0; p < 5; p++) px.rect(g, x + w - 46 + p * 8, y + 81 + i * 10, 6, 5, p < Math.round(v) ? UI.GOLD : '#2a3448'); });
        }
        if (f) { E.font.text(g, '<', x + 3, y + h / 2, UI.GOLD, { outline: false }); E.font.text(g, '>', x + w - 7, y + h / 2, UI.GOLD, { outline: false }); }
      } };
  }
  function chip(id, label, opts, key) {
    return { id, adjust: d => { const i = opts.indexOf(st[key]); st[key] = opts[(i + d + opts.length) % opts.length]; }, pick: () => { const i = opts.indexOf(st[key]); st[key] = opts[(i + 1) % opts.length]; },
      draw: (g, x, y, w, h, f) => { UI.panel(g, x, y, w, h, { border: f ? UI.GOLD : UI.EDGE }); UI.text(g, label, x + w / 2, y + 3, UI.MUTED, { align: 'center', font: 'tiny' }); UI.text(g, String(st[key]), x + w / 2, y + 13, f ? UI.GOLD : '#ffffff', { align: 'center' }); } };
  }
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter(d) {
      humans = (d && d.humans) || [{ input: game.input, team: 0, i: 0 }];
      st = { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: S().periodLen || '2:00', difficulty: S().difficulty || 'Pro', cheat: 'NONE' };
      const unlockedCheats = ['NONE', ...CHEATS.filter(c => Save.unlocked(c[0])).map(c => c[1])];
      const items = [Object.assign(card('home'), { id: 'home' }), Object.assign(card('arena'), { id: 'arena' }), Object.assign(card('away'), { id: 'away' }),
        chip('per', 'PERIODS', [1, 2, 3], 'periods'), chip('len', 'LENGTH', ['1:00', '1:30', '2:00', '3:00', '4:00'], 'len'), chip('diff', 'DIFFICULTY', ['Rookie', 'Pro', 'All-Star', 'Legend'], 'difficulty'), chip('cheat', 'CHEATS', unlockedCheats, 'cheat'),
        { id: 'go', label: 'FACE OFF!', pick: () => go() }];
      menu = new UI.Tiles(items, { start: 7, wrap: false, cancel: () => game.go('sides'), layout: r => {
        const w = Math.min(110, Math.floor((r.W - 40) / 3)), cy = 40, out = UI.grid(3, 3, r.W / 2, cy, w, 120, 8), cw = Math.min(70, Math.floor((r.W - 50) / 4)), chips = UI.grid(4, 4, r.W / 2, cy + 128, cw, 26, 6);
        return out.concat(chips, [{ x: Math.round(r.W / 2 - 60), y: cy + 160, w: 120, h: 24 }]); } });
      Synth.music('menu'); UI.Idle.reset();
    },
    update(dt) { Glyphs.sync(); menu.update(dt); if (UI.Idle.update(dt) > 10 && game.players.length === 1) game.go('attract', null, { fade: 'dissolve' }); },
    draw(r) { r.sky(['#0a1020', '#121c34', '#1a2a48']); r.overlay(g => { UI.title(g, 'SETUP', r.W / 2, 8, 2); menu.draw(g, r); UI.legend(g, r, [['left', 'CHANGE'], ['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
  };
  function go() {
    const cheat = CHEATS.find(c => c[1] === st.cheat), cheats = {};
    if (cheat) cheats[cheat[0] === 'alwayskaboom' ? 'alwaysKaboom' : cheat[0]] = true;
    Rigs.bigHeads = !!cheats.bigheads; Rigs.retro = !!cheats.retro; Rigs.glow = !!cheats.glowpuck;
    game.go('match', { home: st.home, away: st.away, arena: st.arena, periods: st.periods, len: Match.PERIOD_LEN[st.len] || 120, ot: true, shootout: true, difficulty: st.difficulty, cheats, humans, flood: true, exhibition: true }, { fade: 'iris' });
  }
})();

/* ---- results: the final score, three stars one by one, objectives, records ---- */
scenes.results = (() => {
  let m = null, t = 0, menu = null, story = 0, out = null, said = -1;
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter(d) {
      m = d.m; story = d.story || 0; t = 0; said = -1;
      out = story ? Story.finish(m, story) : null;
      // records
      for (const s of m.skaters) { const st = m.stats[s.id]; if (s.ctrl !== 'cpu' || m.humans.some(h => h.team === s.team)) { Save.record('shot', st.topShot); Save.record('goals', st.goals); } }
      const hits = m.events.filter(e => e.type === 'hit' && m.humans.some(h => h.team === e.team)).map(e => e.power); if (hits.length) Save.record('hit', Math.max(...hits));
      const fw = m.events.filter(e => e.type === 'fight_end' && m.humans.some(h => h.team === e.winnerTeam)).length; if (fw) Save.add('fights', fw);
      const kb = m.humans.length ? m.kabooms[m.humans[0].team] : 0; if (kb) Save.add('kabooms', kb);
      const humanTeam = m.humans.length ? m.humans[0].team : 0, won = m.winner === humanTeam;
      Synth.music(won ? 'victory' : 'defeat');
      const items = story ? (out.won ? [{ label: 'CONTINUE', pick: () => game.go('cutscene', { id: Story.chapter(story).post, next: story === 5 ? 'ending' : 'storymap' }, { fade: 'wipe' }) }]
        : [{ label: 'RETRY', pick: () => Story.play(story) }, { label: 'BACK TO MAP', pick: () => game.go('storymap') }])
        : [{ label: 'REMATCH', pick: () => game.go('match', Object.assign({}, m.cfg, { seed: (m.cfg.seed || 1) + 7 })) }, { label: 'MAIN MENU', pick: () => game.go('title', { menu: true }) }];
      menu = new UI.Tiles(items, { layout: (r, its) => UI.grid(its.length, its.length, r.W / 2, r.H - 52, 110, 26, 10) });
    },
    update(dt) { t += dt; Glyphs.sync(); if (t > 1) menu.update(dt); const k = Math.floor((t - 1) / 1.6); if (k >= 0 && k < 3 && k !== said) { said = k; const s = m.stars[2 - k]; if (s) { const line = s.goalie ? U.pick(RNG.fx, TEXT.goalieStar) : TEXT.stars[(2 - k) * 0 + [0, 1, 2][k] + 3 * Math.floor(RNG.fx() * 4)]; Talk.sayAs('chuck', U.fill(line, { name: s.name, g: s.g, sv: s.sv })); A.sfx('star'); } } Talk.update(dt); },
    draw(r) {
      r.sky(['#05070c', '#0e1424', '#1a2440']);
      r.overlay(g => {
        const sf = Hud.safe(r), w = m.winner, ht = m.humans.length ? m.humans[0].team : 0;
        UI.title(g, w < 0 ? 'TIE GAME' : story ? (w === 0 ? 'VICTORY!' : 'DEFEAT') : (w === ht ? 'YOU WIN!' : m.teams[w].short + ' WIN'), r.W / 2, sf.y0, 3);
        for (const t2 of [0, 1]) { const x = r.W / 2 + (t2 ? 60 : -60); px.sprite(g, LOGOS.sprite(m.teams[t2].logo), x - 12, sf.y0 + 30, { scale: 1 }); UI.title(g, String(m.score[t2]), x, sf.y0 + 56, 3, ['#ffffff', '#e0e8ff', '#a0b0d0']); UI.text(g, m.teams[t2].abbr, x, sf.y0 + 84, UI.MUTED, { align: 'center' }); }
        UI.text(g, m.soWin !== undefined ? '(SHOOTOUT)' : m.ot ? '(OVERTIME)' : '', r.W / 2, sf.y0 + 64, UI.MUTED, { align: 'center' });
        // three stars, revealed one by one (third, second, first)
        (m.stars || []).forEach((s, i) => {
          const k = 2 - i, show = t > 1 + k * 1.6; if (!show) return;
          const x = Math.round(r.W / 2 + (i - 1) * 100 - 44), y = sf.y0 + 96;
          UI.panel(g, x, y, 88, 52, { border: UI.GOLD }); s.rig.drawPortrait(g, x + 3, y + 3, 30, { zoom: 2.6, bg: '#101420' });
          for (let j = 0; j <= i; j++) E.font.text(g, '★', x + 40 + j * 8, y + 4, UI.GOLD, { outline: false });
          UI.text(g, s.name.toUpperCase().slice(0, 12), x + 36, y + 16, '#ffffff', { font: { font: 'tiny' } }); UI.text(g, s.line, x + 4, y + 40, UI.MUTED, { font: 'tiny' });
        });
        if (out) {
          const ch = Story.chapter(story); ch.objectives.forEach((o, k) => { const on = out.stars[k] && t > 5 + k * .4; UI.text(g, (on ? '★ ' : '- ') + o.text, r.W / 2 - 90, sf.y0 + 156 + k * 10, on ? UI.GOLD : '#9fb0c8'); });
          if (out.unlocks.length && t > 6.5) UI.text(g, 'UNLOCKED: ' + out.unlocks.join(', '), r.W / 2, r.H - 70, '#7aff9a', { align: 'center' });
          if (!out.won && t > 5) UI.text(g, 'MARGE: "' + STORY.PEP[story - 1] + '"', r.W / 2, r.H - 70, '#ffd0ff', { align: 'center', wrap: r.W - 40 });
        }
        if (t > 1) menu.draw(g, r);
      });
      Talk.draw(r);
    }
  };
})();

/* ---- records: a few big numbers ---- */
scenes.records = {
  view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
  enter() { this.page = 0; UI.Idle.reset(); Synth.music('menu'); },
  update(dt) { Glyphs.sync(); if (UI.anyPressed('cancel') || UI.anyPressed('confirm') || game.input.clicked()) { game.players.forEach(p => p.consumeAll()); A.sfx('back'); game.go('title', { menu: true }); } if (UI.anyRepeat('left') || UI.anyRepeat('right') || UI.anyPressed('tabL') || UI.anyPressed('tabR')) this.page ^= 1; if (UI.Idle.update(dt) > 10) game.go('attract', null, { fade: 'dissolve' }); },
  draw(r) {
    r.sky(['#0a1020', '#121c34', '#1a2a48']);
    r.overlay(g => {
      const R2 = Save.data.records, sf = Hud.safe(r);
      UI.title(g, 'RECORDS', r.W / 2, sf.y0, 3);
      const rows = this.page ? [['STORY STARS', Save.stars() + ' / 15'], ['DRILLS', Object.keys(Save.data.drills).length + ' / 7'], ['MARGE APPROVED', Object.keys(Save.data.drills).length >= 7 ? 'YES!' : 'NOT YET']]
        : [['HARDEST SHOT', Math.round(R2.shot / 16 * 3.6) + ' km/h'], ['BIGGEST HIT', Math.round(R2.hit)], ['MOST GOALS IN A GAME', R2.goals], ['FIGHTS WON', R2.fights], ['KABOOMS', R2.kabooms]];
      rows.forEach(([a, b], i) => { const y = sf.y0 + 40 + i * 30; UI.panel(g, r.W / 2 - 130, y, 260, 26); UI.text(g, a, r.W / 2 - 120, y + 9, UI.MUTED); UI.text(g, String(b), r.W / 2 + 120, y + 5, UI.GOLD, { align: 'right', scale: 2 }); });
      UI.text(g, 'PAGE ' + (this.page + 1) + ' / 2', r.W / 2, r.H - 34, UI.MUTED, { align: 'center' });
      UI.legend(g, r, [['left', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- about: credits, Source Information, the feedback pages and the engine changes (PLAN 12.1) ---- */
scenes.about = {
  view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
  enter() { this.page = 0; UI.Idle.reset(); Synth.music('menu'); },
  update(dt) {
    Glyphs.sync(); const n = ABOUT.length;
    const c = game.input.clicked(), r = game.r;
    if (UI.anyRepeat('right') || UI.anyPressed('tabR') || (c && r && c[0] > r.W - 40)) { this.page = (this.page + 1) % n; this.sc = 0; A.sfx('move'); }
    else if (UI.anyRepeat('left') || UI.anyPressed('tabL') || (c && r && c[0] < 40)) { this.page = (this.page + n - 1) % n; this.sc = 0; A.sfx('move'); }
    if (UI.anyRepeat('down')) this.sc = Math.min((this.sc || 0) + 1, Math.max(0, (this.nl || 0) - 4)); if (UI.anyRepeat('up')) this.sc = Math.max(0, (this.sc || 0) - 1);
    if (UI.anyPressed('cancel')) { A.sfx('back'); game.go('title', { menu: true }); }
    if (UI.Idle.update(dt) > 10) game.go('attract', null, { fade: 'dissolve' });
  },
  draw(r) {
    r.sky(['#0a1020', '#121c34', '#1a2a48']);
    r.overlay(g => {
      const [head, lines] = ABOUT[this.page], sf = Hud.safe(r), w = Math.min(r.W - 70, 560);
      UI.title(g, head, r.W / 2, sf.y0, 2);
      UI.panel(g, r.W / 2 - w / 2 - 6, sf.y0 + 24, w + 12, r.H - sf.y0 - 64);
      const all = []; for (const line of lines) { E.font.wrap(line, w - 6, {}).forEach((l, i) => all.push([l, i === 0 && line.startsWith('-')])); all.push(null); }
      this.nl = all.length; let y = sf.y0 + 30;
      for (const it of all.slice(this.sc || 0)) { if (y > r.H - 52) { E.font.text(g, 'MORE: DOWN', r.W / 2 + w / 2 - 50, r.H - 46, UI.GOLD, { outline: false }); break; } if (!it) { y += 3; continue; } UI.text(g, it[0], r.W / 2 - w / 2, y, it[1] ? '#ffffff' : '#d8e0f0'); y += 9; }
      E.font.text(g, '<', 14, r.H / 2, UI.GOLD, { scale: 2, outline: false }); E.font.text(g, '>', r.W - 24, r.H / 2, UI.GOLD, { scale: 2, outline: false });
      UI.text(g, (this.page + 1) + ' / ' + ABOUT.length, r.W / 2, r.H - 34, UI.MUTED, { align: 'center' });
      UI.legend(g, r, [['tabL', 'PREV'], ['tabR', 'NEXT'], ['down', 'SCROLL'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- the end credits: the roll over the run's best clips, then Marge, then the title with the Cup ---- */
scenes.credits = (() => {
  let t = 0, clips = [], ci = 0, ending = false, said = false;
  const ROLL = ['ICE HOC-KABOOM', '', 'A game by Claude (claude-opus-5-5)', 'for the cc-matrix', '', 'ENGINE', 'my-3D2dge v0.85.2 (MIT)', '', 'ONLINE', 'AI Hub session client 1.4.0', '', 'SOUND', 'Every song, sound and voice', 'synthesized in code', '', 'STARRING', 'The Mukluk Falls Muskrats', 'Coach Marge Pelletier', 'Old Gus and Doris', '', 'AND THE VILLAINS', 'Goldie Glitterman', 'The Gilded Grizzlies', '', 'No pucks were harmed', 'in the making of this game.', '', 'Thanks for playing!'];
  function nextClip() {
    const c = clips[ci++ % Math.max(1, clips.length)];
    if (c && c.cfg) { Match.start({ home: c.cfg.home, away: c.cfg.away, arena: c.cfg.arena, periods: 99, len: 999, attract: true, noTalk: true, noResults: true, intros: false }); M.attractHud = true; Match.setPhase('replay'); Replay.start(c.frames.slice(), .5); }
    else { Match.start({ home: 'muskrats', away: 'grizzlies', arena: 'icebox', periods: 99, len: 999, attract: true, noTalk: true, noResults: true, intros: false, aiSkill: [.8, .8] }); M.attractHud = true; }
  }
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [],
    enter(d) { t = 0; ending = !!(d && d.ending); clips = Replay.highlights.slice(); ci = 0; said = false; nextClip(); Synth.music('credits'); },
    update(dt) {
      t += dt; Glyphs.sync();
      if (M) { if (M.phase === 'replay') { Replay.step(dt); if (Replay.done()) { Replay.stop(); nextClip(); } } else { Match.step(dt); } }
      if (t > ROLL.length * 1.1 + 6 && !said) { said = true; Talk.sayAs('marge', 'Same time next year.'); Synth.babble('Same time next year.', 'marge'); }
      Talk.update(dt);
      if (t > ROLL.length * 1.1 + 10 || (t > 2 && (UI.anyPressed('confirm') || UI.anyPressed('cancel')))) { game.players.forEach(p => p.consumeAll()); Replay.clearHighlights(); game.go('title', { menu: true }, { fade: 'white' }); }
    },
    draw(r) {
      if (M) Draw.world(r);
      r.overlay(g => {
        px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05070c'));
        ROLL.forEach((l, i) => { const y = r.H + 10 + i * 14 - t * 13; if (y < -10 || y > r.H + 10) return; if (i === 0) UI.title(g, l, r.W / 2, y, 2); else UI.text(g, l, r.W / 2, y, l === l.toUpperCase() && l.length < 22 ? UI.GOLD : '#ffffff', { align: 'center' }); });
        if (ending) UI.text(g, 'THE KABOOM CUP STAYS IN MUKLUK FALLS', r.W / 2, 10, UI.GOLD, { align: 'center' });
      });
      Talk.draw(r);
    }
  };
})();

// ---- 60-drills.js ----
/* ---- Drills: Coach Marge's seven practice drills at the Ol' Icebox, built from match primitives (PLAN 11.4) ---- */
const Drills = (() => {
  const C = Rink.C;
  const LIST = [
    { n: 1, title: 'Wheels', text: 'Skate through the 6 gates in order. Gate 4 wants a hockey stop.', marge: "Wheels first. Hold {turbo} to turbo, push the stick hard the other way to stop.", time: 25 },
    { n: 2, title: 'Tape to Tape', text: '5 completed passes to moving teammates, plus 1 saucer over the sled.', marge: "{pass} passes, {lob} flips a saucer. Tape to tape, kid.", time: 60 },
    { n: 3, title: 'Top Shelf', text: 'Hit the 4 corner targets on the empty net.', marge: "Tap {shoot}: a wrister, low. Hold it: a clapper, top shelf. Stick up or down picks the side.", time: 90 },
    { n: 4, title: 'One-Timers', text: "3 one-timer goals on Lemmy from Dunny's feeds.", marge: "When Dunny feeds you, hit {shoot} before it lands. Bang.", time: 60 },
    { n: 5, title: 'Finish Your Check', text: 'Big-hit 3 dummies and break a pane of glass.', marge: "No puck? {shoot} checks. Hold {turbo} into it. Put 'em through the glass.", time: 60 },
    { n: 6, title: 'Gloves Off', text: 'Win a spar with Big Lou. He goes easy.', marge: "{pass} jab, {shoot} haymaker, {deke} duck, {lob} yank. Lou won't hurt you. Much.", time: 60 },
    { n: 7, title: 'KABOOM!', text: 'Score a KABOOM goal, then survive Lou\'s KABOOM check.', marge: "Meter's full. Hold {shoot} all the way for a KABOOM shot. Then watch Lou: when he winds up, get out of his line.", time: 60 }
  ];
  let D = null;   // { n, t, count, need, state, gates, ... }
  const human = () => M.humans[0] && M.humans[0].s;
  function cfg(n, extra = {}) {
    return Object.assign({ home: 'muskrats', away: n === 6 || n === 7 ? 'drillers' : 'drillers', arena: 'icebox', periods: 1, len: 999, practice: true, noClock: true, noItems: true, noTalk: true, noFights: n !== 6, replays: false, intros: false,
      humans: [{ input: game.input, team: 0, slot: n === 4 ? 1 : n === 6 ? 0 : 0 }], seed: 50 + n, drill: n, onOver: () => {}, init: () => init(n), script: dt => script(dt) }, extra);
  }
  function start(n, after) { D = { n, t: 0, count: 0, need: [6, 6, 4, 3, 4, 1, 2][n - 1], done: false, after: after || null, msgT: 0 }; game.go('match', cfg(n), { fade: 'wipe' }); }
  function place(s, x, y, f) { Object.assign(s, { x, y, vx: 0, vy: 0, facing: f || 0, state: 'skate', off: false }); }
  function init(n) {
    const s = human(), g1 = Skater.attackGoal(0), dir = -Rink.outDir(g1.side);
    for (const o of M.skaters) if (o !== s) { o.off = true; o.x = -999; }
    M.goalies[1].disabled = n === 3 || n === 1 || n === 2 || n === 5; M.goalies[0].disabled = true;
    for (const g of M.goalies) if (g.disabled) { g.x = -999; }
    M.puck.held = false; M.puck.dead = false;
    if (n === 1) { place(s, C.x - 300, C.y, 0); D.gates = [[C.x - 150, C.y - 80], [C.x, C.y - 120], [C.x + 180, C.y - 60], [C.x + 260, C.y + 60, 'stop'], [C.x + 60, C.y + 120], [C.x - 160, C.y + 60]]; D.gate = 0; M.puck.dead = true; M.puck.x = -999; }
    if (n === 2) { place(s, C.x - 200, C.y, 0); Puck.take(s, M.puck); const mates = M.skaters.filter(o => o.team === 0 && o !== s); mates.forEach((m, k) => { place(m, C.x + 40 + k * 60, C.y - 90 + k * 180, 0); m.drillPath = k; }); D.sled = [C.x - 80, C.y]; D.saucer = false; }
    if (n === 3) { place(s, g1.x + dir * 120, C.y, dir > 0 ? PI : 0); s.facing = Math.atan2(0, g1.x - s.x); Puck.take(s, M.puck); D.targets = [[-1, 4], [1, 4], [-1, 16], [1, 16]].map(([sy, z]) => ({ y: C.y + sy * 11, z, hit: false })); }
    if (n === 4) { const g = M.goalies[1]; g.disabled = false; const dunny = M.skaters[0]; place(dunny, g1.x + dir * 30, C.y - 70, 0); place(s, g1.x + dir * 60, C.y + 40, 0); s.facing = Math.atan2(C.y - s.y, g1.x - s.x); Puck.take(dunny, M.puck); D.feedT = 1.5; }
    if (n === 5) { place(s, C.x, C.y, 0); D.dummies = M.skaters.filter(o => o.team === 1); D.dummies.forEach((d, k) => { place(d, C.x - 160 + k * 160, Rink.Y0 + 22, PI / 2); d.dummy = true; }); M.puck.dead = true; M.puck.x = -999; D.glass = false; }
    if (n === 6) { const lou = M.skaters.find(o => o.team === 1 && o.slot === 2); lou.def = Object.assign({}, TEAMS.muskrats.skaters[2], { fgt: 2 }); lou.rig = Rigs.skater(lou.def, 'drillers', false); lou.name = 'Big Lou'; place(lou, C.x + 20, C.y, PI); place(s, C.x - 10, C.y, 0); lou.ai.skill = .3; M.puck.dead = true; M.puck.x = -999; Fight.begin(s, lou); }
    if (n === 7) { place(s, g1.x + dir * 150, C.y, 0); s.facing = Math.atan2(0, g1.x - s.x); Puck.take(s, M.puck); Boom.start(0); M.goalies[1].disabled = false; D.stage = 0; }
    Talk.close(); M.cfg.noTalk = true;
    const lst = LIST[n - 1]; Talk.sayAs('marge', lst.marge.replace(/\{(\w+)\}/g, (m, a) => (game.input.label(a) || a).toUpperCase()));
  }
  function success() {
    if (D.done) return; D.done = true; D.doneT = 0; Save.data.drills[D.n] = true; Save.write(); A.sfx('star'); Fx.setBanner('DRILL COMPLETE!', null, 2.4, LIST[D.n - 1].title.toUpperCase());
    Bus.emit('drill_done', { n: D.n });
  }
  function script(dt) {
    if (!D || !M) return;
    D.t += dt; const s = human(); if (!s) return;
    if (D.done) { D.doneT += dt; if (D.doneT > 2.6) { const after = D.after; D = Object.assign({}, D, { finished: true }); if (after) after(); else game.go('practice', null, { fade: 'wipe' }); } return; }
    if (D.t > LIST[D.n - 1].time) { Fx.setBanner('TIME!', null, 1.4, 'Try again'); D.t = 0; D.count = 0; init(D.n); return; }
    const g1 = Skater.attackGoal(0), dir = -Rink.outDir(g1.side);
    if (D.n === 1) {
      const gt = D.gates[D.gate]; if (!gt) return success();
      const d = Math.hypot(s.x - gt[0], s.y - gt[1]);
      if (d < 26 && (gt[2] !== 'stop' || s.state === 'stop')) { D.gate++; D.count = D.gate; A.sfx('pick'); }
    }
    if (D.n === 2) {
      for (const m of M.skaters.filter(o => o.team === 0 && o !== s)) { const k = m.drillPath, a = D.t * .45 + k * PI, p = M.puck; m.scripted = !p.owner && (p.passTo === m || (p.lastTouch === s && Math.hypot(p.x - m.x, p.y - m.y) < 90)) ? [p.x + p.vx * .2, p.y + p.vy * .2] : [C.x + 100 + Math.cos(a) * 95, C.y + Math.sin(a) * 90]; if (M.puck.owner === m) { Skater.pass(m, { to: s }); } }
      if (!M.puck.owner && !M.puck.passTo && Math.hypot(M.puck.vx, M.puck.vy) < 5 && Math.hypot(M.puck.x - s.x, M.puck.y - s.y) > 40) { Puck.take(s, M.puck); }
    }
    if (D.n === 3) {
      if (!M.puck.owner && (M.puck.inNet || Math.hypot(M.puck.vx, M.puck.vy) < 10 || M.puck.dead)) { D.resetT = (D.resetT || 0) + dt; if (D.resetT > .8) { D.resetT = 0; M.puck.inNet = false; M.puck.dead = false; place(s, g1.x + dir * 120, C.y + (RNG.sim() - .5) * 60, 0); s.facing = Math.atan2(C.y - s.y, g1.x - s.x); Puck.take(s, M.puck); } }
      D.count = D.targets.filter(t => t.hit).length; if (D.count >= 4) success();
    }
    if (D.n === 4) {
      const dunny = M.skaters[0]; dunny.scripted = [g1.x + dir * 20, C.y - 70];
      if (M.puck.owner === dunny) { D.feedT -= dt; if (D.feedT <= 0) { Skater.pass(dunny, { to: s }); D.feedT = 1.6; } }
      if (!M.puck.owner && !M.puck.inNet && (M.puck.passTo !== s || Math.hypot(M.puck.vx, M.puck.vy) < 8)) { D.resetT = (D.resetT || 0) + dt; if (D.resetT > 1.2) { D.resetT = 0; M.puck.held = false; M.puck.dead = false; Puck.take(dunny, M.puck); } }
      if (M.puck.owner === s && s.ctrl !== 'cpu') { D.ownT = (D.ownT || 0) + dt; if (D.ownT > 2.5) { D.ownT = 0; Puck.take(dunny, M.puck); } } else D.ownT = 0;
      if (D.count >= 3) success();
    }
    if (D.n === 5) { for (const d of D.dummies) { d.vx *= .9; d.vy *= .9; if (d.ai) d.ai.target = [d.x, d.y]; } if (D.count >= 3 && D.glass) success(); }
    if (D.n === 6) { /* the fight resolves it */ }
    if (D.n === 7) {
      if (D.stage === 1) {
        // Lou's KABOOM charge: he winds up facing you (a readable tell), then charges in a straight line; step out of it
        D.survive -= dt; const lou = D.lou; D.louT -= dt; lou.holdTurbo = true;
        if (D.louMode === 'aim') { lou.scripted = [lou.x, lou.y]; lou.vx *= .8; lou.vy *= .8; lou.facing = Math.atan2(s.y - lou.y, s.x - lou.x); D.louDir = lou.facing; if (D.louT <= 0) { D.louMode = 'charge'; D.louT = .8; Skater.check(lou); lou.stateT = -.5; A.sfx('zip'); } }
        else { const a = D.louDir; lou.vx = Math.cos(a) * 270; lou.vy = Math.sin(a) * 270; lou.facing = a; lou.scripted = [lou.x + Math.cos(a) * 200, lou.y + Math.sin(a) * 200]; lou.hitDone = lou.hitDone || {}; if (D.louT <= 0) { D.louMode = 'aim'; D.louT = .6; lou.state = 'skate'; lou.hitDone = {}; } }
        if (s.state === 'down') { Fx.setBanner('FLATTENED!', null, 1.2, 'Again'); D.stage = 0; D.count = 0; D.t = 0; init(7); } else if (D.survive <= 0) { D.count = 2; success(); }
      }
    }
  }
  // what the drills count
  Bus.on('pass_complete', e => { if (D && M && M.cfg.practice && D.n === 2 && M.byId[e.by] && M.byId[e.by].human) { D.count++; A.sfx('pick'); if (D.count >= 5 && D.saucer) success(); } });
  Bus.on('pass', e => { if (D && M && M.cfg.practice && D.n === 2 && e.kind === 'saucer' && M.byId[e.from] && M.byId[e.from].human) { D.saucerPending = true; } });
  Bus.on('possession', e => { if (D && M && M.cfg.practice && D.n === 2 && D.saucerPending) { D.saucerPending = false; const s = M.byId[e.by]; if (s && s.team === 0 && !s.human) { D.saucer = true; UI.toast('SAUCER!', 'Over the sled'); if (D.count >= 5) success(); } } });
  Bus.on('goal', e => {
    if (!D || !M || !M.cfg.practice) return;
    const p = M.puck;
    if (D.n === 3) for (const t of D.targets) if (!t.hit && Math.abs(p.y - t.y) < 6 && Math.abs(p.z - t.z) < 6) { t.hit = true; A.sfx('ping'); }
    if (D.n === 4 && e.kind === 'onetimer') D.count++;
    if (D.n === 7 && e.kind === 'kaboom' && D.stage === 0) { D.stage = 1; D.count = 1; D.survive = 6; const lou = M.skaters.find(o => o.team === 1); lou.def = Object.assign({}, TEAMS.muskrats.skaters[2]); lou.rig = Rigs.skater(lou.def, 'drillers', false); lou.name = 'Big Lou'; place(lou, C.x, C.y, 0); Boom.start(1); M.kaboomT[1] = 30; Fx.setBanner("LOU'S COMING!", null, 1.4, 'Dodge his charges for 6 seconds'); D.lou = lou; D.louMode = 'aim'; D.louT = .9; }
  });
  Bus.on('hit', e => { if (D && M && M.cfg.practice && D.n === 5 && e.big) { D.count++; } });
  Bus.on('glass', e => { if (D && M && M.cfg.practice && D.n === 5) { D.glass = true; if (D.count >= 3) success(); } });
  Bus.on('fight_end', e => { if (D && M && M.cfg.practice && D.n === 6) { if (e.winner && M.byId[e.winner].human) { D.count = 1; success(); } else { Fx.setBanner('AGAIN!', null, 1.2); D.t = 0; } } });
  /** the drill's HUD: its title, the counter and the clock */
  function hud(r) {
    if (!D || !M || !M.cfg.practice) return;
    r.overlay(g => {
      const sf = Hud.safe(r), L2 = LIST[D.n - 1], w = 240;
      UI.panel(g, r.W / 2 - w / 2, sf.y0 + 34, w, 30, { border: '#c86ab0' });
      UI.text(g, 'DRILL ' + D.n + ': ' + L2.title.toUpperCase(), r.W / 2, sf.y0 + 38, UI.GOLD, { align: 'center' });
      const cnt = D.n === 1 ? 'GATE ' + Math.min(6, D.gate + 1) + ' / 6' : D.n === 2 ? 'PASSES ' + D.count + ' / 5   SAUCER ' + (D.saucer ? 'OK' : '-') : D.n === 5 ? 'BIG HITS ' + D.count + ' / 3   GLASS ' + (D.glass ? 'OK' : '-') : D.n === 7 ? (D.stage ? 'SURVIVE ' + Math.ceil(D.survive) : 'KABOOM GOAL ' + D.count + ' / 1') : D.count + ' / ' + D.need;
      UI.text(g, cnt + '    TIME ' + Math.max(0, Math.ceil(L2.time - D.t)), r.W / 2, sf.y0 + 50, '#ffffff', { align: 'center' });
    });
  }
  function world(r) {
    if (!D || !M || !M.cfg.practice) return;
    if (D.n === 1) D.gates.forEach((gt, i) => { if (i < D.gate) return; for (const sd of [-1, 1]) { const x = gt[0], y = gt[1] + sd * 18; r.queue(x, y, 0, g => { const [X, Y] = r.w(x, y, 0); px.poly(g, [[X, Y - 9], [X - 3, Y], [X + 3, Y]], i === D.gate ? '#ff7a1a' : '#a05010'); px.rect(g, X - 2, Y - 5, 4, 1, '#ffffff'); }); } if (gt[2]) r.decal(g => { const [X, Y] = r.w(gt[0], gt[1], 0); E.font.text(g, 'STOP', X, Y - 3, '#ff3a3a', { font: 'tiny', align: 'center', outline: false }); }); });
    if (D.n === 2 && D.sled) r.queue(D.sled[0], D.sled[1], 0, g => { const [X, Y] = r.w(D.sled[0], D.sled[1], 0); px.rect(g, X - 10, Y - 5, 20, 5, '#8a3a2a'); px.rect(g, X - 11, Y, 22, 1, '#c8c8d0'); });
    if (D.n === 7 && D.stage === 1 && D.lou && D.louMode === 'aim') { const l = D.lou; r.queue(l.x, l.y, 60, g => { const [x, y] = r.w(l.x, l.y, 58); if (Math.floor(game.time * 12) % 2) E.font.text(g, '!', x, y - 8, '#ff4a2a', { scale: 2, align: 'center', outline: '#000' }); }, { emissive: true }); }
    if (D.n === 3 && D.targets) { const g1 = Skater.attackGoal(0); for (const t of D.targets) if (!t.hit) r.queue(g1.x, t.y, t.z, g => { const [X, Y] = r.w(g1.x, t.y, t.z); px.disc(g, X, Y, 3.5, '#ff3a3a'); px.disc(g, X, Y, 2, '#ffffff'); px.dot(g, X, Y, '#ff3a3a'); }, { emissive: true }); }
  }
  function cfgFor(n) { D = { n, t: 0, count: 0, need: [6, 6, 4, 3, 4, 1, 2][n - 1], done: false, after: null, msgT: 0 }; return cfg(n); }
  return { LIST, start, cfgFor, warmup(n) { let k = 1; const nextDrill = () => { if (k > 3) return game.go('pregame', { n }); start(k++, nextDrill); }; nextDrill(); }, hud, world, get D() { return D; }, set D(v) { D = v; } };
})();

/* ---- the practice menu: the seven drills, each with its star ---- */
scenes.practice = (() => {
  let menu = null;
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter() {
      menu = new UI.Tiles(Drills.LIST.map(d => ({ label: d.n + '. ' + d.title.toUpperCase(), sub: Save.data.drills[d.n] ? '★ DONE' : d.title === 'KABOOM!' ? 'The big one' : '', pick: () => Drills.start(d.n) })),
        { layout: (r, its) => UI.grid(its.length, 4, r.W / 2, 54, Math.min(100, Math.floor((r.W - 40) / 4)), 34, 6, 6), cancel: () => game.go('title', { menu: true }) });
      Synth.music('menu'); UI.Idle.reset();
    },
    update(dt) { Glyphs.sync(); menu.update(dt); if (UI.Idle.update(dt) > 10) game.go('attract', null, { fade: 'dissolve' }); },
    draw(r) {
      r.sky(['#0a1020', '#121c34', '#1a2a48']);
      r.overlay(g => {
        const sf = Hud.safe(r); UI.title(g, "COACH MARGE'S DRILLS", r.W / 2, sf.y0, 2);
        menu.draw(g, r);
        const d = Drills.LIST[menu.i]; UI.panel(g, r.W / 2 - 160, r.H - 74, 320, 36, { border: '#c86ab0' });
        Rigs.cast('marge').rig.drawPortrait(g, r.W / 2 - 156, r.H - 71, 30, { zoom: 2.4, bg: '#20142a' });
        UI.text(g, d.text, r.W / 2 - 120, r.H - 68, '#ffffff', { wrap: 270 });
        UI.text(g, 'DRILLS DONE ' + Object.keys(Save.data.drills).length + ' / 7' + (Object.keys(Save.data.drills).length >= 7 ? '   MARGE APPROVED!' : ''), r.W / 2, sf.y0 + 26, UI.GOLD, { align: 'center' });
        UI.legend(g, r, [['confirm', 'START'], ['cancel', 'BACK']]);
      });
    }
  };
})();

// ---- 70-dev.js ----
/* ---- Dev: the dev panel (from the pause menu's Dev Mode). TUNING sliders with a reset, CHEATS, WARP, DEBUG with the sound
 * test. While open the match holds (unless Live is on: the panel docks right and play runs behind it) (PLAN 15.3) ---- */
const Dev = (() => {
  const TABS = ['TUNING', 'CHEATS', 'WARP', 'DEBUG'];
  let open = false, tab = 0, row = 0, scroll = 0, live = false, holdT = 0, hp = null, drag = false;
  const st = { overlays: false, fps: false, slow: 1, stepping: false, stepNow: false, freeCam: false, hideHud: false };
  const ch = (k, on) => { if (!M) return; M.cheats[k] = on === undefined ? !M.cheats[k] : on; };
  function rows() {
    if (tab === 0) {
      const out = [{ label: 'RESET ALL TO DEFAULTS', act: () => { T.resetAll(); A.sfx('pick'); } }, { label: 'LIVE (play runs behind the panel)', val: () => live ? 'ON' : 'OFF', act: () => { live = !live; } }, { label: 'LOG TUNING (console JSON)', act: () => { console.log('[Ice Hoc-Kaboom tuning]', JSON.stringify(T.changed())); UI.toast('TUNING LOGGED', Object.keys(T.changed()).length + ' changed'); } }];
      let grp = '';
      for (const [group, key] of T.ROWS) { if (group !== grp) { grp = group; out.push({ head: group.toUpperCase() }); } const m = T.META[key]; out.push({ key, label: m.label, slider: true, val: () => +T[key].toFixed(3), def: m.def }); }
      return out;
    }
    if (tab === 1) {
      const tg = (label, k) => ({ label, val: () => M && M.cheats[k] ? 'ON' : 'OFF', act: () => ch(k) });
      return [tg('Infinite turbo', 'turbo'), tg('God mode (no knockdowns)', 'god'), tg('Always KABOOM', 'alwaysKaboom'), tg('Puck magnet', 'magnet'), tg('Freeze AI', 'freezeAI'),
        { label: 'CPU goalies off', val: () => M && M.goalies.some(g => g.disabled) ? 'ON' : 'OFF', act: () => { if (!M) return; const on = !M.goalies.some(g => g.disabled); for (const g of M.goalies) if (!M.humans.some(h => h.team === g.team) || on === false) { g.disabled = on; if (on) g.x = -999; else { const og = Skater.ownGoal(g.team); g.x = og.x - Rink.outDir(og.side) * 8; g.y = Rink.C.y; } } } },
        { label: 'Big heads (next game)', val: () => Rigs.bigHeads ? 'ON' : 'OFF', act: () => { Rigs.bigHeads = !Rigs.bigHeads; } }, tg('Octopus rain', 'octorain'),
        { label: 'Glow puck', val: () => Rigs.glow ? 'ON' : 'OFF', act: () => { Rigs.glow = !Rigs.glow; } }, { label: 'Retro rigs (next game)', val: () => Rigs.retro ? 'ON' : 'OFF', act: () => { Rigs.retro = !Rigs.retro; } },
        { label: 'Instant BOOM full (your team)', act: () => M && Boom.start((M.humans[0] || { team: 0 }).team) }];
    }
    if (tab === 2) {
      const w = (label, fn) => ({ label, act: () => { fn(); close(); } });
      const out = [];
      for (let n = 1; n <= 5; n++) out.push(w('Story chapter ' + n + ': ' + STORY.CHAPTERS[n - 1].title, () => { Save.data.story.chapter = Math.max(Save.data.story.chapter, n); Story.open(n); }));
      for (const id of Object.keys(STORY.CUTS)) out.push(w('Cutscene ' + id, () => game.go('cutscene', { id, next: 'title' })));
      out.push(w('Period 2', () => warp('period', 2)), w('Period 3', () => warp('period', 3)), w('Overtime', () => warp('ot')), w('Shootout', () => warp('shootout')), w('Clock to 0:10', () => warp('clock')),
        w('Score +1 home', () => warp('score', 0)), w('Score +1 away', () => warp('score', 1)), w('Win this game now', () => warp('win')), w('Lose this game now', () => warp('lose')));
      for (const k of Object.keys(ITEMS).concat(['octopus', 'rat'])) out.push(w('Spawn ' + k + ' at center', () => warp('item', k)));
      out.push(w('Start a fight', () => warp('fight')), w('Start KABOOM', () => warp('kaboom')), w('Break the thin ice', () => warp('breakIce')), w('Shatter a panel', () => warp('glass')), w('Knock down the mascot', () => warp('mascot')),
        w('Flood Wagon', () => game.go('flood', { back: !!M, team: 0 })), w('Results', () => warp('results')), w('Attract mode', () => game.go('attract')), w('About', () => game.go('about')), w('Animation lab', () => game.go('lab')), w('Title', () => game.go('title')));
      return out;
    }
    const sfx = Object.keys(Synth.SFX).map(k => ({ label: 'SFX ' + k, act: () => A.sfx(k) }));
    const songs = Object.keys(Synth.SONGS).map(k => ({ label: 'SONG ' + k, act: () => Synth.music(k, { restart: true }) }));
    const layers = ['drive', 'kaboom', 'fight'].map(k => ({ label: 'LAYER ' + k, act: () => { Synth.layer(k, true); Synth.layer(k + '2', true); } }));
    const stings = Object.keys(Synth.STINGS).map(k => ({ label: 'ORGAN ' + k, act: () => Synth.sting(k) }));
    const voices = ['marge', 'dunny', 'snipes', 'lou', 'lemmy', 'glitter', 'chuck', 'moose', 'gus', 'doris', 'pete', 'ref', 'vault'].map(v => ({ label: 'VOICE ' + v, act: () => Synth.babble('Hello there, this is how I talk on the ice!', v) }));
    return [{ label: 'Debug overlays', val: () => st.overlays ? 'ON' : 'OFF', act: () => { st.overlays = !st.overlays; } }, { label: 'FPS readout', val: () => S().showFps ? 'ON' : 'OFF', act: () => S().set('showFps', !S().showFps) },
      { label: 'Slow motion', val: () => st.slow + 'x', act: () => { st.slow = st.slow === 1 ? .5 : st.slow === .5 ? .25 : 1; } }, { label: 'Frame step (confirm advances)', val: () => st.stepping ? 'ON' : 'OFF', act: () => { st.stepping = !st.stepping; } },
      { label: 'Free camera', val: () => Cam.free ? 'ON' : 'OFF', act: () => { Cam.free = Cam.free ? null : { x: M ? M.puck.x : 560, y: M ? M.puck.y : 400, mx: 0, my: 0 }; } },
      { label: 'Hide HUD (screenshots)', val: () => M && M.hideHud ? 'ON' : 'OFF', act: () => { if (M) M.hideHud = !M.hideHud; } }, { label: 'RNG seed', val: () => RNG.seed }, { head: 'SOUND TEST' }, ...sfx, ...songs, ...layers, ...stings, ...voices];
  }
  /** a warp: jump the match somewhere */
  function warp(what, arg) {
    if (!M) return false;
    const C = Rink.C;
    if (what === 'period') { M.period = arg; M.clock = M.cfg.len; M.flip = (arg - 1) % 2; Match.setupFaceoff([C.x, C.y]); }
    else if (what === 'ot') { M.period = M.cfg.periods; M.score[1] = M.score[0]; M.clock = 0; Match.setPhase('play'); }
    else if (what === 'shootout') { Shootout.start(false); }
    else if (what === 'clock') M.clock = 10;
    else if (what === 'score') M.score[arg]++;
    else if (what === 'win' || what === 'lose') { const t = (M.humans[0] || { team: 0 }).team, w = what === 'win' ? t : 1 - t; M.score[w] = M.score[1 - w] + 1; Match.setPhase('play'); Match.final(); }
    else if (what === 'item') { if (M.phase !== 'play') Match.setPhase('play'); Items.throwOne(arg, [C.x, C.y]); }
    else if (what === 'fight') { if (M.phase !== 'play') { Match.setPhase('play'); M.puck.held = false; } const h = (M.humans[0] && M.humans[0].s) || M.skaters[0], o = M.skaters.filter(s => s.team !== h.team && s.state !== 'bin').sort((a, b) => b.def.fgt - a.def.fgt)[0]; o.x = h.x + 20; o.y = h.y; M.lastFightClock = 1e9; M.fights = Math.min(M.fights, T.fightMax - 1); Fight.begin(h, o); }
    else if (what === 'kaboom') Boom.start((M.humans[0] || { team: 0 }).team);
    else if (what === 'breakIce') { if (!M.ice.length) M.ice = [{ i: 0, x: C.x - 200, y: C.y - 70, rx: 40, ry: 24, hp: 100, hole: false, t: 0 }]; Items.breakIce(0); }
    else if (what === 'glass') Hits.breakPanel(Rink.panels[5], 'shattered', M.skaters[0]);
    else if (what === 'mascot') { if (!M.mascot) { M.arena = Object.assign({}, M.arena, { hazards: M.arena.hazards.concat(['mascot']) }); Items.reset(M); } M.mascot.down = 3; Bus.emit('mascot_down', { by: M.skaters[0].id, team: M.skaters[0].team, name: M.skaters[0].name, x: M.mascot.x, y: M.mascot.y }); }
    else if (what === 'results') { Match.setPhase('play'); Match.final(); M.finished = true; }
    return true;
  }
  function openFromMenu() { if (HUB) return; if (game.resume) game.resume(); open = true; tab = 0; row = 0; scroll = 0; if (M) M.devPause = !live; game.input.consumeAll(); }
  function close() { open = false; if (M) M.devPause = false; game.input.consumeAll(); }
  /** the panel's input; returns true while it holds the match */
  function update(dt) {
    if (!open) return false;
    const I = game.input, R2 = rows(), sel = () => R2[row];
    if (M) M.devPause = !live;
    if (I.pressed('cancel') || I.pressed('pause')) { close(); return true; }
    if (UI.anyPressed('tabR')) { tab = (tab + 1) % 4; row = 0; scroll = 0; A.sfx('move'); }
    if (UI.anyPressed('tabL')) { tab = (tab + 3) % 4; row = 0; scroll = 0; A.sfx('move'); }
    const mv = d => { do { row = (row + d + R2.length) % R2.length; } while (R2[row].head); A.sfx('move'); };
    if (I.repeat('down', .3, .06)) mv(1); if (I.repeat('up', .3, .06)) mv(-1);
    const r = sel();
    if (r && r.slider) {
      const m = T.META[r.key], big = I.down('switch') || I.down('turbo') ? 10 : 1;
      const l = I.down('left'), rr = I.down('right');
      if (l || rr) { holdT += dt; const step = I.pressed('left') || I.pressed('right') || (holdT > .35 && Math.floor(holdT * 20) !== Math.floor((holdT - dt) * 20)); if (step) T.set(r.key, T[r.key] + (rr ? 1 : -1) * m.step * big * (holdT > 1.2 ? 5 : 1)); } else holdT = 0;
      if (I.pressed('reset')) { T.reset(r.key); A.sfx('back'); }
    } else if (r && r.act && (I.pressed('confirm') || I.pressed('pass'))) { r.act(); A.sfx('pick'); }
    // the mouse: hover focuses a row, a drag moves a slider, a click toggles
    const p = I.pointer(), c = I.clicked(), L2 = layout(game.r || { W: 427, H: 240 });
    if (p && (!hp || p[0] !== hp[0] || p[1] !== hp[1])) { const k = Math.floor((p[1] - L2.y0) / L2.rh) + scroll; if (p[0] > L2.x && k >= 0 && k < R2.length && !R2[k].head) row = k; }
    hp = p ? p.slice() : null;
    if (c) { if (c[1] < L2.y0 - 2 && c[1] > L2.y0 - 16) { const t2 = Math.floor((c[0] - L2.x) / (L2.w / 4)); if (t2 >= 0 && t2 < 4) { tab = t2; row = 0; scroll = 0; } } else { const k = Math.floor((c[1] - L2.y0) / L2.rh) + scroll; const rr2 = R2[k]; if (rr2 && rr2.act) rr2.act(); if (rr2 && rr2.slider) setFromX(rr2, c[0], L2); } }
    if (I.down('shoot') && p && sel() && sel().slider && I.lastDevice === 'mouse') setFromX(sel(), p[0], L2);
    const vis = L2.n; if (row < scroll) scroll = row; if (row >= scroll + vis) scroll = row - vis + 1;
    if (st.stepping) st.stepNow = I.pressed('confirm');
    I.consumeAll();
    return true;
  }
  function setFromX(r, x, L2) { const m = T.META[r.key], u = clamp((x - (L2.x + L2.w - 120)) / 80, 0, 1); T.set(r.key, m.min + (m.max - m.min) * u); }
  function layout(r) { const w = live ? Math.round(r.W * .45) : Math.min(r.W - 30, 360), x = live ? r.W - w - 4 : Math.round(r.W / 2 - w / 2), y0 = 40, rh = 11; return { x, w, y0, rh, n: Math.floor((r.H - y0 - 30) / rh) }; }
  function draw(r) {
    if (st.overlays && M) debugDraw(r);
    if (!open) return;
    r.overlay(g => {
      const L2 = layout(r), R2 = rows();
      UI.panel(g, L2.x - 4, 20, L2.w + 8, r.H - 28, { alpha: .95, border: '#5aff9a' });
      UI.text(g, 'DEV MODE', L2.x, 24, '#5aff9a');
      TABS.forEach((t, i) => { const tx = L2.x + i * L2.w / 4; px.rect(g, tx, L2.y0 - 14, L2.w / 4 - 2, 12, i === tab ? '#2a5a3a' : '#141c24'); UI.text(g, t, tx + L2.w / 8, L2.y0 - 12, i === tab ? '#ffffff' : '#7a8a9a', { align: 'center' }); });
      for (let k = 0; k < L2.n && k + scroll < R2.length; k++) {
        const rr = R2[k + scroll], y = L2.y0 + k * L2.rh, f = k + scroll === row;
        if (rr.head) { UI.text(g, rr.head, L2.x, y + 2, UI.GOLD); continue; }
        if (f) px.rect(g, L2.x - 2, y, L2.w + 4, L2.rh, '#24405a');
        UI.text(g, rr.label, L2.x + 2, y + 2, f ? '#ffffff' : '#c8d0e0');
        if (rr.slider) { const m = T.META[rr.key], u = (T[rr.key] - m.min) / (m.max - m.min), sx = L2.x + L2.w - 120; px.rect(g, sx, y + 4, 80, 3, '#2a3440'); px.rect(g, sx, y + 4, Math.round(80 * u), 3, T[rr.key] === m.def ? '#5a9aff' : '#ffb347'); E.font.text(g, String(rr.val()) + (T[rr.key] !== m.def ? ' (' + m.def + ')' : ''), sx + 84, y + 2, '#ffffff', { font: 'tiny', outline: false }); }
        else if (rr.val) UI.text(g, String(rr.val()), L2.x + L2.w - 4, y + 2, '#ffe08a', { align: 'right' });
      }
      Glyphs.text(g, '{tabL}{tabR} TAB  {left}{right} ADJUST  {reset} RESET ROW  {cancel} CLOSE', L2.x + L2.w / 2, r.H - 20, '#9fb0c8', { align: 'center' });
    });
  }
  function debugDraw(r) {
    for (const s of M.skaters) {
      r.decal(g => { r.groundRing && r.groundRing(s.x, s.y, 7, s.team ? '#ff5a5a' : '#5a9aff', .7); const [bx, by] = Skater.blade(s); const [X, Y] = r.w(bx, by, 0); px.rect(g, X - 1, Y - 1, 3, 3, '#ffff00'); });
      if (s.ai) r.queue(s.x, s.y, 60, g => { const [x, y] = r.w(s.x, s.y, 56); E.font.text(g, (s.ai.role || '').toUpperCase(), x, y, '#5aff9a', { font: 'tiny', align: 'center', outline: '#000' }); const gv = Object.values(s.grudge).filter(v => v > 1); if (gv.length) E.font.text(g, 'G' + Math.round(Math.max(...gv)), x, y + 6, '#ff9a5a', { font: 'tiny', align: 'center', outline: '#000' }); }, { emissive: true });
      if (s.ai && s.ctrl === 'cpu') r.decal(g => { const a = r.w(s.x, s.y, 0), b = r.w(s.ai.target[0], s.ai.target[1], 0); px.line(g, a[0], a[1], b[0], b[1], '#5aff9a', 1); });
      r.queue(s.x, s.y, 0, g => s.rig.debug && s.rig.debug(r));
    }
    const p = M.puck; r.decal(g => { let x = p.x, y = p.y, vx = p.vx, vy = p.vy; for (let i = 0; i < 20; i++) { const a = r.w(x, y, 0); x += vx * .05; y += vy * .05; const b = r.w(x, y, 0); px.line(g, a[0], a[1], b[0], b[1], '#ff5aff', 1); } });
    for (const gl of M.goalies) r.decal(g => { const w = Goalie.scale(gl); const a = r.w(gl.x, gl.y - 8 * w, 0), b = r.w(gl.x, gl.y + 8 * w, 0); px.line(g, a[0], a[1], b[0], b[1], '#ffff5a', 2); if (gl.track) { const c = r.w(gl.x, gl.track.y, 0); px.rect(g, c[0] - 1, c[1] - 1, 3, 3, '#ff5a5a'); } });
  }
  return { openFromMenu, update, draw, close, warp, rows, get isOpen() { return open; }, get live() { return live; }, set live(v) { live = v; }, get slow() { return st.slow; }, get stepping() { return st.stepping; }, get stepNow() { return st.stepNow; }, set tab(v) { tab = v; }, get tab() { return tab; }, set row(v) { row = v; }, st };
})();

/* ---- the animation lab: one skater, one goalie, one referee on a small sheet of ice; every motion, three views ---- */
scenes.lab = (() => {
  const MOTIONS = ['stride', 'turbo', 'glide', 'crossover', 'hockey stop', 'backward', 'stick-handle', 'pass', 'saucer', 'wrist shot', 'slapshot', 'check', 'poke', 'deke spin', 'stun', 'big-hit fall', 'getup', 'slip', 'celebrate pump', 'celebrate rifle', 'celebrate guitar', 'fight guard', 'jab', 'haymaker', 'goalie ready', 'goalie butterfly', 'goalie glove', 'goalie blocker', 'goalie stack', 'goalie poke', 'goalie blasted', 'referee wave'];
  let sk = null, gl = null, rf = null, i = 0, t = 0, speed = 1, views = ['threequarter', 'brawler', 'topdown'], vi = 0, phase = 0;
  return {
    view: 'brawler', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [], pausable: true,
    enter() { sk = Rigs.skater(TEAMS.muskrats.skaters[1], 'muskrats', true); gl = Rigs.goalie(TEAMS.muskrats.goalie, 'muskrats', true); rf = Rigs.referee(false); t = 0; Cam.apply('brawler', 2); game.focus(0, 0, 14); L.enabled = false; },
    update(dt) {
      Glyphs.sync(); t += dt * speed;
      if (UI.anyRepeat('down')) i = (i + 1) % MOTIONS.length; if (UI.anyRepeat('up')) i = (i + MOTIONS.length - 1) % MOTIONS.length;
      if (UI.anyRepeat('right')) speed = Math.min(2, speed + .25); if (UI.anyRepeat('left')) speed = Math.max(0, speed - .25);
      if (UI.anyPressed('camera') || UI.anyPressed('confirm')) { vi = (vi + 1) % 3; Cam.apply(views[vi], 2); }
      if (UI.anyPressed('cancel')) return game.go('title', { menu: true });
      const m = MOTIONS[i], u = (t % 1.2) / 1.2, hk = sk.hk || (sk.hk = { mode: 'skate' });
      Object.assign(hk, { mode: 'skate', phase: t * 7, speed: 0, turbo: false, stop: 0, back: false, cross: 0, hand: 1, stick: 'idle', t: u * .45, charge: u, carry: false });
      const st = { x: -16, y: 0, z: 0, vx: 0, vy: 0, facing: 0 };
      if (m === 'stride') hk.speed = .8; if (m === 'turbo') { hk.speed = 1; hk.turbo = true; } if (m === 'glide') hk.speed = .3; if (m === 'crossover') { hk.speed = .8; hk.cross = 1; }
      if (m === 'hockey stop') { hk.stop = 1; hk.stopSide = 1; } if (m === 'backward') { hk.speed = .6; hk.back = true; } if (m === 'stick-handle') { hk.carry = true; hk.speed = .4; }
      if (m === 'pass') hk.stick = 'pass'; if (m === 'saucer') { hk.stick = 'pass'; hk.saucer = true; } if (m === 'wrist shot') hk.stick = 'follow'; if (m === 'slapshot') hk.stick = u < .7 ? 'wind' : 'follow';
      if (m === 'check') { hk.stick = 'check'; st.lean = .3; } if (m === 'poke') hk.stick = 'poke'; if (m === 'deke spin') sk.spin = u * TAU; else sk.spin = 0;
      if (m === 'stun') st.hurt = true; if (m === 'big-hit fall') st.down = Math.min(1, u * 3); if (m === 'getup') st.down = Math.max(0, 1 - u * 2); if (m === 'slip') { st.down = Math.min(1, u * 5); st.flip = Math.min(.3, u); }
      if (m === 'celebrate pump') { st.pose = 'cheer'; hk.stick = 'raised'; } if (m === 'celebrate rifle') hk.stick = 'rifle'; if (m === 'celebrate guitar') hk.stick = 'guitar';
      if (m === 'fight guard' || m === 'jab' || m === 'haymaker') { hk.mode = 'none'; sk.noStick = true; st.stance = 'guard'; if (m !== 'fight guard') st.attack = E.move(m, u); } else sk.noStick = false;
      sk.update(dt, st);
      const gs = m.startsWith('goalie') ? m.slice(7) : 'ready'; gl.hk = { mode: 'goalie', state: gs, dy: 6 }; gl.update(dt, { x: 16, y: 0, z: 0, vx: 0, vy: 0, facing: PI, down: gs === 'blasted' ? Math.min(1, u * 3) : 0 });
      rf.update(dt, { x: 0, y: -24, z: 0, vx: 0, vy: 0, facing: PI / 2, pose: m === 'referee wave' ? 'wave' : null });
      phase = u; game.focus(0, 0, 14);
    },
    draw(r) {
      r.sky(['#1a2a48', '#2a4a78', '#c8d8f0']);
      r.decal(g => { const pts = [r.w(-60, -40, 0), r.w(60, -40, 0), r.w(60, 40, 0), r.w(-60, 40, 0)]; px.poly(g, pts, '#e8f2fa'); const a = r.w(0, -40, 0), b = r.w(0, 40, 0); px.line(g, a[0], a[1], b[0], b[1], '#c83a2a', 2); });
      const view = Draw.view(r);
      for (const [rig, x, y] of [[sk, -16, 0], [gl, 16, 0], [rf, 0, -24]]) { r.shadow(x, y, 7, .3); r.actor(x, y, 0, (g, ox, oy) => rig.draw(g, ox, oy, view)); }
      r.overlay(g => {
        UI.panel(g, 6, 6, 128, r.H - 30);
        UI.text(g, 'ANIMATION LAB', 12, 10, UI.GOLD);
        const top = Math.max(0, i - 8); MOTIONS.slice(top, top + 18).forEach((m, k) => UI.text(g, m.toUpperCase(), 12, 24 + k * 10, top + k === i ? UI.GOLD : '#c8d0e0'));
        UI.text(g, 'SPEED ' + speed.toFixed(2) + 'x   PHASE ' + phase.toFixed(2) + '   VIEW ' + views[vi].toUpperCase(), r.W / 2 + 60, r.H - 30, '#ffffff', { align: 'center' });
        E.ui.bar(g, r.W / 2 + 10, r.H - 20, 100, 3, phase, UI.GOLD);
        UI.legend(g, r, [['up', 'MOTION'], ['left', 'SPEED'], ['confirm', 'VIEW'], ['cancel', 'BACK']]);
      });
    }
  };
})();

// ---- 80-net.js ----
/* ---- Net: AI Hub sessions (Session Protocol v1, shared-world, 1-4 seats). The host runs the match; clients send their
 * intents (press counters, held bits, the stick) at 15 Hz and draw the host's snapshots, interpolated, their own skater
 * predicted (PLAN 14) ---- */
const Net = (() => {
  const ACTS = ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch'];
  const PHASES = ['none', 'intro', 'faceoff', 'play', 'stoppage', 'goal', 'replay', 'periodEnd', 'intermission', 'final', 'fight', 'shootout'];
  const STATES = ['skate', 'stop', 'check', 'deke', 'stun', 'down', 'getup', 'celebrate', 'fight', 'bin', 'frozen', 'buried', 'slip'];
  const ACTK = [null, 'pass', 'follow', 'poke'];
  const ITEMK = ['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox', 'cocoa', 'octopus', 'rat'];
  const GST = ['ready', 'butterfly', 'glove', 'blocker', 'stack', 'poke', 'cover', 'blasted', 'celebrate'];
  const N = {
    active: false, info: null, role: 'none', card: null, started: false, ended: false, finished: false, seats: [], snaps: [], seq: 0, counters: [0, 0, 0, 0, 0, 0],
    sendT: 0, tick: 0, evSeen: new Set(), evOut: [], startHumans: 0, pred: null, endReason: '', overlay: null, latest: null, setup: null
  };
  const isHost = () => N.active && N.role === 'host';
  const isClient = () => N.active && N.role === 'client';
  /** connect, pick the teams and barn from the shared rng, build the match, then ready() with no key press */
  async function connect() {
    if (!HUB) return null;
    let info = null;
    try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) { N.active = false; game.go('title'); return null; }
    N.active = true; N.info = info; N.role = info.isHost ? 'host' : 'client';
    const rng = AIHub.rng('setup'), pairs = [['muskrats', 'drillers'], ['lumberjacks', 'bruisers'], ['marauders', 'muskrats'], ['bruisers', 'lumberjacks'], ['drillers', 'marauders']];
    const pair = pairs[Math.floor(rng() * pairs.length) % pairs.length], arena = ARENA_IDS.slice(0, 4)[Math.floor(rng() * 4) % 4];
    const players = info.players || [];
    N.seats = players.map((p, i) => ({ id: p.id, name: U.sanitize(p.name || 'P' + (i + 1)), color: p.color || E.PLAYER_COLORS[i], team: players.length === 1 ? 0 : i % 2, me: p.id === info.me }));
    const humans = N.seats.map((s, i) => ({ id: s.id, team: s.team, name: s.name, color: s.color, tag: s.name.slice(0, 6), i, slot: Math.floor(i / 2) % 3, remote: !s.me, input: s.me ? game.input : null, net: { mx: 0, my: 0, held: 0, c: [0, 0, 0, 0, 0, 0], last: [0, 0, 0, 0, 0, 0], press: new Set(), seq: 0 } }));
    N.setup = { home: pair[0], away: pair[1], arena };
    Match.start({ home: pair[0], away: pair[1], arena, periods: 1, len: 180, ot: true, shootout: false, session: true, intros: false, replays: true, flood: false, humans, seed: Math.floor(AIHub.rng('sim')() * 1e9), noResults: true, onOver: () => {} });
    M.phase = 'card'; M.held = true;
    // a 2-v-1: the lone human's CPU mates play a little better
    const per = [0, 0]; for (const h of humans) per[h.team]++;
    if (per[0] && per[1] && per[0] !== per[1]) { const lone = per[0] < per[1] ? 0 : 1; M.aiSkill[lone] = Math.min(1, M.aiSkill[lone] + .15); }
    N.startHumans = humans.length;
    AIHub.on('card', c => { N.card = c; });
    AIHub.on('start', () => { N.started = true; });
    AIHub.on('message', (d, from) => receive(d, from));
    AIHub.on('leave', e => leave(e.id));
    AIHub.on('time-up', () => { if (isHost()) finish('time-up'); });
    AIHub.on('end', e => end(e));
    AIHub.ready();
    return info;
  }
  /* ---- the host: remote intents in, snapshots out ---- */
  function receive(d, from) {
    if (!d || N.ended) return;
    if (isHost() && d.t === 'in') {
      const h = M && M.humans.find(x => x.id === from); if (!h || !h.net) return;
      if (d.s <= h.net.seq) return; h.net.seq = d.s;
      h.net.mx = (d.mx || 0) / 100; h.net.my = (d.my || 0) / 100; h.net.held = d.h || 0; h.net.aim = d.ax !== undefined ? [d.ax, d.ay] : null; h.net.sy = (d.sy || 0) / 100;
      d.c.forEach((v, i) => { const diff = (v - h.net.c[i] + 256) % 256; if (diff > 0 && diff < 128) { h.net.c[i] = v; h.net.pend = h.net.pend || new Set(); h.net.pend.add(ACTS[i]); } });
    }
    if (isClient() && d.t === 's') { d.rx = AIHub.time(); N.snaps.push(d); if (N.snaps.length > 30) N.snaps.shift(); N.latest = d; for (const e of d.ev || []) if (!N.evSeen.has(e.id)) { N.evSeen.add(e.id); playEvent(e); } }
  }
  /** the presses that arrived since the last step become this step's presses */
  function hostStep() { if (!M) return; for (const h of M.humans) if (h.remote && h.net) { h.net.press = h.net.pend || new Set(); h.net.pend = null; } }
  function intentFor(h) {
    const n = h.net || {}, it = { mx: n.mx || 0, my: n.my || 0, turbo: !!(n.held & 4), shoot: !!(n.held & 1), lob: !!(n.held & 2), aim: n.aim || null, stickY: n.sy || 0, press: {} };
    if (n.press) for (const a of n.press) it.press[a] = true;
    return it;
  }
  const pressedFor = (h, a) => !!(h && h.net && h.net.press && h.net.press.has(a));
  const heldFor = (h, a) => !!(h && h.net && (h.net.held & ({ shoot: 1, lob: 2, turbo: 4 }[a] || 0)));
  const moveFor = h => h && h.net ? [h.net.mx, h.net.my] : [0, 0];
  function snapshot() {
    const p = M.puck, idx = s => s ? M.skaters.indexOf(s) : -1, r = v => Math.round(v);
    const s = { t: 's', n: ++N.tick, at: r(AIHub.time()), ph: PHASES.indexOf(M.phase), p: M.period, k: r(M.clock * 10), sc: M.score.slice(), b: [r(M.boom[0]), r(M.boom[1]), r(M.kaboomT[0] * 10), r(M.kaboomT[1] * 10)],
      pk: [r(p.x), r(p.y), r(p.z), r(p.vx), r(p.vy), idx(p.owner), (p.onFire ? 1 : 0) | (p.inNet ? 2 : 0) | (p.held ? 4 : 0) | (p.dead ? 8 : 0)],
      e: M.skaters.map(k => [r(k.x), r(k.y), r(k.vx), r(k.vy), r(((k.facing % TAU) + TAU) % TAU / TAU * 255), STATES.indexOf(k.state), r(k.stateT * 10), (k.winding ? 1 : 0) | (k.holdTurbo ? 2 : 0) | (k.off ? 4 : 0) | (ACTK.indexOf(k.act ? k.act.kind : null) << 3), r(k.charge * 100), r(k.turbo * 100)]),
      g: M.goalies.map(g => [r(g.x), r(g.y), r(((g.facing % TAU) + TAU) % TAU / TAU * 255), Math.max(0, GST.indexOf(g.state))]),
      it: M.items.concat(M.hazards).slice(0, 4).map(i => [ITEMK.indexOf(i.kind), r(i.x), r(i.y), r(i.z)]),
      hu: M.humans.map(h => [h.id, idx(h.s)]), sb: M.sinBin.map(b => [idx(b.s), r(b.t)]), gl: Rink.panels.filter(q => q.state !== 'ok').map(q => q.i * 2 + (q.state === 'shattered' ? 1 : 0)),
      ev: N.evOut.slice(-5) };
    if (M.fight) { const F = M.fight; s.f = [idx(F.a.s), idx(F.b.s), r(F.a.bal), r(F.b.bal), r(F.a.sta), r(F.b.sta), r(F.mx), r(F.my)]; }
    return s;
  }
  // the events clients see: sounds, effects and the booth's lines (each repeated in a few snapshots, ids dedupe)
  const SEND = { goal: 1, save: 1, post: 1, hit: 1, glass: 1, shot: 1, pass: 1, stop: 1, whistle: 1, faceoff_drop: 1, kaboom_start: 1, kaboom_end: 1, fight_start: 1, fight_end: 1, fight_hit: 1, sin_bin: 1, item: 1, item_throw: 1, hazard: 1, period_end: 1, final: 1, ot_start: 1, blast: 1, chirp: 1, talk: 1 };
  Bus.on('*', e => {
    if (!isHost() || !SEND[e.type]) return;
    const o = { id: e.id, type: e.type };
    for (const k of ['team', 'by', 'victim', 'kind', 'big', 'state', 'panel', 'x', 'y', 'speed', 'winner', 'winnerTeam', 'winnerName', 'name', 'who', 'text', 'line', 'n', 'bar', 'assists', 'goalie', 'freeze']) if (e[k] !== undefined) o[k] = typeof e[k] === 'number' ? Math.round(e[k]) : e[k];
    N.evOut.push(o); if (N.evOut.length > 5) N.evOut.shift();
  });
  function talk(type, k, who, text) { if (isHost()) Bus.emit('talk', { who, text: String(text).slice(0, 120) }); }
  function playEvent(e) {
    if (!M) return;
    if (e.type === 'talk') { Talk.sayAs(e.who, e.text); return; }
    Fx.event(e, false);
  }
  /* ---- the client: apply snapshots (interpolated ~120 ms behind), predict its own skater ---- */
  function clientApply(dt) {
    const sn = N.snaps; if (!sn.length) return;
    const rt = AIHub.time() - 120;
    let a = sn[0], b = sn[sn.length - 1];
    for (let i = sn.length - 1; i > 0; i--) if (sn[i - 1].at <= rt) { a = sn[i - 1]; b = sn[i]; break; }
    const u = b.at > a.at ? clamp((rt - a.at) / (b.at - a.at), 0, 1) : 1, L = (x, y) => x + (y - x) * u, last = N.latest;
    M.phase = PHASES[last.ph] || 'play'; M.period = last.p; M.clock = last.k / 10; M.score = last.sc.slice(); M.boom = [last.b[0], last.b[1]]; M.kaboomT = [last.b[2] / 10, last.b[3] / 10];
    const p = M.puck; p.x = L(a.pk[0], b.pk[0]); p.y = L(a.pk[1], b.pk[1]); p.z = L(a.pk[2], b.pk[2]); p.vx = b.pk[3]; p.vy = b.pk[4]; p.owner = b.pk[5] >= 0 ? M.skaters[b.pk[5]] : null; p.onFire = !!(b.pk[6] & 1); p.inNet = !!(b.pk[6] & 2); p.held = !!(b.pk[6] & 4); p.dead = !!(b.pk[6] & 8);
    M.skaters.forEach((s, i) => {
      const ea = a.e[i], eb = b.e[i]; if (!ea || !eb) return;
      s.x = L(ea[0], eb[0]); s.y = L(ea[1], eb[1]); s.vx = eb[2]; s.vy = eb[3]; const fa = ea[4] / 255 * TAU, fb = eb[4] / 255 * TAU; s.facing = fa + U.angDiff(fb, fa) * u;
      s.state = STATES[eb[5]] || 'skate'; s.stateT = eb[6] / 10; s.winding = !!(eb[7] & 1); s.holdTurbo = !!(eb[7] & 2); s.off = !!(eb[7] & 4); const ak = ACTK[eb[7] >> 3]; s.act = ak ? { kind: ak, t: .1 } : null; s.charge = eb[8] / 100; s.turbo = eb[9] / 100;
    });
    for (const [id, k] of last.hu) { const h = M.humans.find(x => x.id === id); if (h && M.skaters[k] && h.s !== M.skaters[k]) { if (h.s) { h.s.human = null; h.s.ctrl = 'cpu'; } h.s = M.skaters[k]; h.s.human = h; h.s.ctrl = h.remote ? 'remote' : 'human'; } }
    // my own skater: predicted from my stick, pulled toward the host's word
    const me = M.humans.find(h => !h.remote), s = me && me.s;
    if (s && s.state === 'skate' && M.phase === 'play') {
      const pr = N.pred && N.pred.s === s ? N.pred : (N.pred = { s, x: s.x, y: s.y, vx: s.vx, vy: s.vy, facing: s.facing, state: 'skate', stateT: 0, def: s.def, items: s.items, team: s.team, winding: s.winding });
      const mv = game.input.move(), gd = game.view.screenDirToGround(mv[0], mv[1]);
      Skater.skateStep(pr, gd[0], gd[1], game.input.down('turbo'), dt, true); pr.x += pr.vx * dt; pr.y += pr.vy * dt; Rink.clamp(pr, 7);
      const eb = b.e[M.skaters.indexOf(s)], ax = eb[0] + eb[2] * .12, ay = eb[1] + eb[3] * .12, err = Math.hypot(ax - pr.x, ay - pr.y);
      if (err > 48) { pr.x = ax; pr.y = ay; pr.vx = eb[2]; pr.vy = eb[3]; } else { pr.x += (ax - pr.x) * Math.min(1, dt * 6); pr.y += (ay - pr.y) * Math.min(1, dt * 6); }
      s.x = pr.x; s.y = pr.y; s.vx = pr.vx; s.vy = pr.vy; s.facing = pr.facing; N.err = err;
      if (p.owner === s) { const [bx, by] = Skater.blade(s); p.x = bx; p.y = by; }
    } else N.pred = null;
    M.goalies.forEach((g, i) => { const ga = a.g[i], gb = b.g[i]; if (!ga || !gb) return; g.x = L(ga[0], gb[0]); g.y = L(ga[1], gb[1]); g.facing = gb[2] / 255 * TAU; g.state = GST[gb[3]] || 'ready'; g.rig.hk = g.rig.hk || { mode: 'goalie' }; g.rig.hk.state = g.state; g.rig.update(dt, { x: g.x, y: g.y, z: 0, vx: 0, vy: 0, facing: g.facing }); });
    M.items = (last.it || []).filter(x => x[0] < 7).map(x => ({ kind: ITEMK[x[0]], x: x[1], y: x[2], z: x[3], t: 0, life: 99 })); M.hazards = (last.it || []).filter(x => x[0] >= 7).map(x => ({ kind: ITEMK[x[0]], x: x[1], y: x[2], z: x[3], haz: true, t: 0 }));
    M.sinBin = (last.sb || []).map(([k, t]) => ({ s: M.skaters[k], t }));
    for (const q of Rink.panels) q.state = 'ok'; for (const v of last.gl || []) { const q = Rink.panels[v >> 1]; if (q) q.state = v & 1 ? 'shattered' : 'cracked'; }
    if (last.f) { const [ia, ib, ba, bb, sa, sb, mx, my] = last.f; M.fight = { a: { s: M.skaters[ia], bal: ba, sta: sa, side: -1 }, b: { s: M.skaters[ib], bal: bb, sta: sb, side: 1 }, mx, my, who: [M.skaters[ia], M.skaters[ib]] }; } else M.fight = null;
    for (const s2 of M.skaters) { if (s2.state === 'fight') { s2.rig.update(dt, { x: s2.x, y: s2.y, z: 0, vx: 0, vy: 0, facing: s2.facing, stance: 'guard' }); } else Match.rigStep(s2, dt); }
    for (const r of M.refs) r.rig.update(dt, { x: r.x, y: r.y, z: 0, vx: 0, vy: 0, facing: r.facing });
    Cam.update(dt); Crowd.step(dt);
  }
  function clientSend() {
    const I = game.input, mv = I.move(), g = game.view.screenDirToGround(mv[0], mv[1]);
    ACTS.forEach((a, i) => { if (I.pressed(a)) N.counters[i] = (N.counters[i] + 1) % 256; });
    N.sendT -= 1; if (N.sendT > 0) return; N.sendT = 8;   // every 8 steps of 1/120 s: 15 a second
    const me = M.humans.find(h => !h.remote), aim = me && me.reticle;
    const msg = { t: 'in', s: ++N.seq, at: Math.round(AIHub.time()), mx: Math.round(g[0] * 100), my: Math.round(g[1] * 100), sy: Math.round(mv[1] * 100), h: (I.down('shoot') ? 1 : 0) | (I.down('lob') ? 2 : 0) | (I.down('turbo') ? 4 : 0), c: N.counters.slice() };
    if (aim) { msg.ax = Math.round(aim[0]); msg.ay = Math.round(aim[1]); }
    AIHub.send(msg, { to: N.info.host, reliable: false });
  }
  /* ---- leaving, finishing, the end ---- */
  function leave(id) {
    if (!M) return;
    const h = M.humans.find(x => x.id === id); if (!h) return;
    if (h.s) { h.s.ctrl = 'cpu'; h.s.human = null; h.s.ai = AI.fresh(h.s); }
    M.humans.splice(M.humans.indexOf(h), 1); N.seats = N.seats.filter(s => s.id !== id); N.left = (N.left || []).concat([id]);
    if (isHost() && N.startHumans >= 2 && M.humans.length <= 1 && N.started) finish('leave');
  }
  function finish(why) {
    if (!isHost() || N.finished) return; N.finished = true;
    const ids = M.humans.map(h => h.id), w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1, scores = {}, stats = {}, awards = [];
    for (const h of M.humans) { const sid = h.s ? h.s.id : null; let g = 0, a = 0, hits = 0, f = 0; for (const s of M.skaters) if (s.human === h || s.id === sid) { const st = M.stats[s.id]; g += st.goals; a += st.assists; hits += st.hits; f += st.fightsWon; } scores[h.id] = g + a; stats[h.id] = { Goals: g, Assists: a, Hits: hits, Fights: f }; }
    const stars = Match.threeStars(); stars.forEach((s, i) => { const e = M.byId[s.id], h = e && e.human; if (h && ids.includes(h.id)) awards.push({ id: h.id, title: ['1st Star', '2nd Star', '3rd Star'][i], detail: s.line }); });
    let standings;
    if (ids.length === 1) standings = [[ids[0]]];
    else if (w < 0) standings = [ids];
    else standings = [M.humans.filter(h => h.team === w).map(h => h.id), M.humans.filter(h => h.team !== w).map(h => h.id)].filter(x => x.length);
    const out = { standings, scores, stats, awards };
    if (ids.length === 1) out.won = w === M.humans[0].team;
    else if (M.humans.every(h => h.team === M.humans[0].team)) out.won = w === M.humans[0].team;
    try { AIHub.finish(out); } catch (e) { game.fail('finish', e); }
    N.finishWhy = why;
  }
  function end(e) { N.ended = true; N.endReason = e && e.reason; try { A.music(null); A.mute(true); } catch (x) { /* no sound */ } game.input.consumeAll(); }
  /** each step of the session scene */
  function step(dt) {
    if (!N.active || !M || N.ended) return;
    const t = AIHub.time();
    if (M.phase === 'card' || t < 0 || !N.started) {
      if (M.phase === 'card' && N.started && t >= 0) { M.held = false; Match.setupFaceoff([Rink.C.x, Rink.C.y]); }
      else { if (!N.started) cardInput(); Cam.update(dt); for (const s of M.skaters) Match.rigStep(s, dt); return; }
    }
    if (isHost()) {
      hostStep(); Match.step(dt); Talk.update(dt); Fx.step(dt);
      if ((M.phase === 'final' && M.phaseT > 3) || M.finished) finish('final');
      N.sendT -= 1; if (N.sendT <= 0) { N.sendT = 8; const s = snapshot(); s.ack = {}; for (const h of M.humans) if (h.remote && h.net) s.ack[h.id] = h.net.seq; try { AIHub.send(s, { reliable: false }); } catch (e) { game.fail('send', e); } N.lastSize = JSON.stringify(s).length; }
    } else { clientSend(); clientApply(dt); Talk.update(dt); Fx.step(dt); }
  }
  /** the card's answers: Enter or Cross for Ready, Triangle / T / MORE TIME for more time */
  function cardInput() {
    const I = game.input, c = I.clicked();
    if (I.pressed('confirm') || I.pressed('start') || (c && N.readyBtn && inBox(c, N.readyBtn))) { AIHub.answer('ready'); A.sfx('pick'); }
    if (I.pressed('lob') || keyT() || (c && N.moreBtn && inBox(c, N.moreBtn))) { AIHub.answer('more'); A.sfx('move'); }
  }
  let tKey = false; if (typeof addEventListener === 'function') try { addEventListener('keydown', e => { if (e.code === 'KeyT') tKey = true; }); } catch (e) { /* no DOM */ }
  const keyT = () => { const v = tKey; tKey = false; return v; };
  const inBox = (c, b) => c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3];
  return { connect, step, isHost, isClient, intentFor, pressedFor, heldFor, moveFor, talk, finish, snapshot, N, ACTS };
})();

/* ---- the session scene: our own card, the countdown, the round (no pausing), the end ---- */
scenes.session = {
  view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, res: 'ps1', pausable: false, camera: { zoom: false }, touch: [],
  enter() { this.opt = null; this.oi = 0; Net.connect().then(info => { if (info && M) { Synth.music(M.arena.music || 'play'); L.enabled = true; } }); },
  update(dt) {
    Glyphs.sync();
    const N = Net.N; if (!N.active || !M) return;
    if (N.ended) return;
    // Options or Esc: a small overlay that doesn't pause (the local skater coasts meanwhile)
    if (game.input.pressed('pause') && N.started) { this.opt = this.opt ? null : true; this.oi = 0; game.input.consumeAll(); }
    if (this.opt) {
      const rows = this.rows(); if (UI.anyRepeat('up')) this.oi = (this.oi + rows.length - 1) % rows.length; if (UI.anyRepeat('down')) this.oi = (this.oi + 1) % rows.length;
      if (UI.anyPressed('confirm') || UI.anyRepeat('left') || UI.anyRepeat('right')) rows[this.oi][1](); if (UI.anyPressed('cancel')) this.opt = null;
      game.input.consumeAll();
    }
    if (N.info && N.info.server) { if (Net.isHost()) Net.step(dt); return; }
    Net.step(dt);
  },
  rows() {
    const st = S();
    return [['SOUND: ' + (A.muted ? 'OFF' : 'ON'), () => A.mute()], ['MUSIC: ' + Math.round((st.music === undefined ? 1 : st.music) * 100) + '%', () => st.set('music', ((Math.round((st.music || 0) * 10) + 2) % 12) / 10)],
      ['VOICES: ' + Math.round((st.voices || 0) * 100) + '%', () => { st.set('voices', ((Math.round((st.voices || 0) * 10) + 2) % 12) / 10); Synth.applyVolumes(); }],
      ['BUTTON SYMBOLS: ' + st.symbols.toUpperCase(), () => st.set('symbols', st.symbols === 'Xbox' ? 'PlayStation' : 'Xbox')], ['CAMERA: ' + st.camera.toUpperCase(), () => st.set('camera', st.camera === 'Overhead' ? 'Broadcast' : 'Overhead')], ['BACK', () => { this.opt = null; }]];
  },
  draw(r) {
    const N = Net.N;
    if (N.info && N.info.server) { r.sky(['#05070c', '#05070c', '#0a0e18']); r.text('HOSTING', 6, 6, '#5a6a8a'); return; }
    if (!M || !N.active) { r.sky(['#05070c', '#0a1020', '#141c34']); r.overlay(g => UI.title(g, 'ICE HOC-KABOOM', r.W / 2, r.H * .4, 3)); return; }
    Draw.world(r);
    const t = AIHub.time();
    if (!N.started || M.phase === 'card') { this.card(r); return; }
    Hud.draw(r, 1 / 60); Talk.draw(r);
    r.overlay(g => {
      if (t < 0) UI.title(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H * .35, 6);
      else if (t < 900) UI.title(g, 'GO!', r.W / 2, r.H * .35, 5);
      if (this.opt) { const rows = this.rows(), w = 200, x = r.W / 2 - w / 2, y = r.H / 2 - rows.length * 8 - 10; UI.panel(g, x, y, w, rows.length * 16 + 20, { border: UI.GOLD }); rows.forEach(([l], i) => UI.text(g, l, r.W / 2, y + 10 + i * 16, i === this.oi ? UI.GOLD : '#ffffff', { align: 'center' })); }
      if (N.ended) { UI.panel(g, r.W / 2 - 90, r.H * .2, 180, 30, { border: UI.GOLD }); UI.text(g, 'FINAL  ' + M.teams[0].abbr + ' ' + M.score[0] + ' - ' + M.score[1] + ' ' + M.teams[1].abbr, r.W / 2, r.H * .2 + 11, '#ffffff', { align: 'center' }); }
    });
  },
  card(r) {
    const N = Net.N, c = N.card || {};
    r.overlay(g => {
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05070c'));
      const sf = Hud.safe(r);
      UI.title(g, 'ICE HOC-KABOOM', r.W / 2, sf.y0, 3);
      UI.text(g, ARENAS[M.cfg.arena].name.toUpperCase() + ':  ' + M.teams[0].short + ' vs ' + M.teams[1].short, r.W / 2, sf.y0 + 28, UI.GOLD, { align: 'center' });
      UI.text(g, 'HOW TO WIN: Outscore the other team in one 3-minute period', r.W / 2, sf.y0 + 42, '#ffffff', { align: 'center' });
      N.seats.forEach((s, i) => {
        const x = r.W / 2 + (s.team ? 70 : -70), y = sf.y0 + 60 + Math.floor(i / 2) * 18, ready = (c.ready || []).includes(s.id);
        px.rect(g, x - 60, y, 120, 15, s.color); px.rect(g, x - 59, y + 1, 118, 13, '#101420');
        UI.text(g, (ready ? 'O ' : '  ') + s.name + (s.me ? ' (YOU)' : ''), x - 54, y + 4, s.color);
      });
      UI.text(g, M.teams[0].abbr + ' (HOME)', r.W / 2 - 70, sf.y0 + 52, UI.MUTED, { align: 'center' }); UI.text(g, M.teams[1].abbr + ' (AWAY)', r.W / 2 + 70, sf.y0 + 52, UI.MUTED, { align: 'center' });
      const y2 = sf.y0 + 112;
      UI.text(g, 'YOUR CONTROLS', r.W / 2, y2, UI.GOLD, { align: 'center' });
      Glyphs.text(g, 'MOVE: STICK / WASD   {pass} PASS   {shoot} SHOOT / CHECK', r.W / 2, y2 + 13, '#ffffff', { align: 'center' });
      Glyphs.text(g, '{deke} DEKE / POKE   {lob} SAUCER / GLOVES   {turbo} TURBO', r.W / 2, y2 + 27, '#ffffff', { align: 'center' });
      const left = c.left === null || c.left === undefined ? (c.starting ? 'STARTING...' : c.paused ? 'PAUSED: MORE TIME' : '') : 'STARTS IN ' + Math.ceil(c.left / 1000);
      UI.text(g, left, r.W / 2, y2 + 44, '#ffffff', { align: 'center', scale: 2 });
      N.readyBtn = [Math.round(r.W / 2 - 110), Math.round(y2 + 64), 100, 22]; N.moreBtn = [Math.round(r.W / 2 + 10), Math.round(y2 + 64), 100, 22];
      UI.panel(g, ...N.readyBtn, { border: UI.GOLD }); Glyphs.text(g, '{confirm} READY', N.readyBtn[0] + 50, N.readyBtn[1] + 8, UI.GOLD, { align: 'center' });
      UI.panel(g, ...N.moreBtn, { border: c.asked ? '#ff9a5a' : UI.EDGE }); Glyphs.text(g, '{lob} / T  MORE TIME', N.moreBtn[0] + 50, N.moreBtn[1] + 8, c.asked ? '#ff9a5a' : '#ffffff', { align: 'center' });
    });
  }
};

// ---- 90-start.js ----
/* ---- start: the scene table, deep links, boot, the debug handle ---- */
(function start() {
  // touch-only devices get no touch controls anywhere
  try { game.input.touchButtons([]); } catch (e) { /* no touch layer */ }
  if (!HUB) new E.Shell(game, { theme: { ink: '#eef4ff', paper: 'rgba(10,15,28,.94)', accent: '#ffd36a', muted: '#9fb0c8', danger: '#ff7a5a', line: 'rgba(255,211,106,.35)', font: 'system-ui, sans-serif', titleFont: 'Impact, Haettenschweiler, "Arial Black", sans-serif' } });
  Bus.on('flood_perfect', () => {});
  const hash = typeof location !== 'undefined' ? (location.hash || '').slice(1) : '', parts = hash.split('/');
  let scene = HUB ? 'session' : 'title', data;
  const hum = () => [{ input: game.input, team: 0 }];
  if (!HUB && parts[0]) {
    const d = parts[0];
    if (d === 'attract') scene = 'attract';
    else if (d === 'story' && parts[1]) { scene = 'cutscene'; Story.cur = { n: +parts[1], attempt: 1, choice: {} }; data = { id: STORY.CHAPTERS[+parts[1] - 1].pre, next: 'pregame' }; }
    else if (d === 'cutscene' && parts[1]) { scene = 'cutscene'; data = { id: parts[1], next: 'title' }; }
    else if (d === 'match') { scene = 'match'; data = { home: parts[1] || 'muskrats', away: parts[2] || 'drillers', arena: parts[3] || 'icebox', periods: 3, len: 120, ot: true, shootout: true, humans: hum(), flood: true }; }
    else if (d === 'fight' || d === 'kaboom' || d === 'shootout' || d === 'dev') { scene = 'match'; data = { home: 'muskrats', away: 'bruisers', arena: 'grindhouse', periods: 3, len: 120, ot: true, shootout: true, humans: hum(), intros: false, warp: d }; }
    else if (d === 'flood') scene = 'flood';
    else if (d === 'practice' && parts[1]) { scene = 'match'; data = Drills.cfgFor(+parts[1]); }
    else if (scenes[d]) scene = d;
  }
  Object.assign(scenes, {});
  game.start({
    scenes, scene, data,
    boot: { title: 'ICE HOC-KABOOM', version: VERSION, messages: ['Flooding the ice', 'Taping the sticks', 'Tuning the organ', 'Hiding the octopi', "Waking up Old Gus"],
      steps: [['Baking the Ol\' Icebox', () => { Rink.mapFor('icebox', 'muskrats'); }], ['Synthesizing the goal horn', () => { Synth.applyVolumes(); }],
        ['Checking the rule book', () => { for (const id of TEAM_IDS) if (TEAMS[id].skaters.length !== 3) throw new Error('team ' + id + ' needs 3 skaters'); for (const ch of STORY.CHAPTERS) if (!STORY.CUTS[ch.pre] || !STORY.CUTS[ch.post]) throw new Error('chapter ' + ch.n + ' is missing a cutscene'); }]] }
  });
  game.debug = {
    snapshot() {
      const m = M;
      return { scene: game.sceneName, mode: m ? (m.attract ? 'attract' : m.cfg.session ? 'session' : m.cfg.practice ? 'practice' : m.cfg.chapter ? 'story' : 'exhibition') : null, phase: m && m.phase, period: m && m.period, clock: m && +m.clock.toFixed(2), score: m && m.score.slice(), shots: m && m.shots.slice(),
        puck: m && { x: Math.round(m.puck.x), y: Math.round(m.puck.y), z: Math.round(m.puck.z), owner: m.puck.owner ? m.puck.owner.id : null },
        skaters: m && m.skaters.map(s => ({ id: s.id, team: s.team, x: Math.round(s.x), y: Math.round(s.y), state: s.state, ctrl: s.ctrl })), goalies: m && m.goalies.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), state: g.state })),
        boom: m && m.boom.map(Math.round), kaboom: m && m.kaboomT.map(v => +v.toFixed(1)), fight: !!(m && m.fight), items: m ? m.items.length : 0, sinBin: m ? m.sinBin.map(b => b.s.id) : [],
        story: { chapter: Story.cur ? Story.cur.n : null, stars: Save.stars(), step: Save.data.story.chapter }, attract: scenes.attract.state, dev: { open: Dev.isOpen }, net: { role: Net.N.role, players: Net.N.seats.length }, errors: game.errors.length };
    },
    warp: (w, a) => Dev.warp(w, a), set: (k, v) => T.set(k, v), cheat: (n, on) => { if (M) M.cheats[n] = on; }, event: (t, d) => Bus.emit(t, d), seed: n => RNG.reseed(n)
  };
  if (typeof window !== 'undefined') window.__game = { game, scenes, TEXT, Match, T, Dev, Net, STORY, Story, Save, Drills, Bus, Skater, Puck, Goalie, Fight, Boom, Items, Hits, Replay, Synth, Glyphs, UI, Rink, AI, Shootout, get M() { return M; } };
})();

})();
