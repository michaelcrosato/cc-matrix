(() => {
/* ---- 00-head.js ---- */
/* ICE HOC-KABOOM - skate, dangle and rip the puck past the goalie while you hammer rivals through the glass;
   fill your team's BOOM meter to go KABOOM; win the scrap when the gloves drop; outscore them before the final horn. */
'use strict';
const E = My3D2dge, { px, clamp, lerp } = E;
const HUB = !!(window.AIHub && window.AIHub.active);
const PI = Math.PI, TAU = PI * 2, VERSION = '1.0.0';
const HOCKEY_KEYS = Object.assign({}, E.Input.DEFAULT, {
  pass: ['KeyJ', 'Mouse2', 'Pad0'], shoot: ['KeyK', 'Mouse0', 'Pad2'], deke: ['KeyL', 'Space', 'Pad1'], lob: ['KeyI', 'Mouse1', 'Pad3'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], chirp: ['KeyC', 'Pad4'], switch: ['KeyQ', 'Pad6'], camera: ['KeyV', 'Pad11']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete HOCKEY_KEYS[k];
const SETTINGS = [
  { key: 'glyphs', label: 'Button symbols', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
  { key: 'difficulty', label: 'Difficulty', options: ['Rookie', 'Pro', 'All-Star', 'Legend'], value: 'Pro' },
  { key: 'periodLen', label: 'Period length', options: ['1:00', '1:30', '2:00', '3:00'], value: '1:30' },
  { key: 'camMode', label: 'Camera', options: ['Broadcast', 'Overhead'], value: 'Broadcast' },
  { key: 'camDist', label: 'Camera distance', options: ['Near', 'Normal', 'Far'], value: 'Normal' },
  { key: 'commentary', label: 'Commentary', options: ['On', 'Off'], value: 'On' },
  { key: 'subtitles', label: 'Subtitles', options: ['On', 'Off'], value: 'On' },
  { key: 'voiceVol', label: 'Voices volume', options: ['Off', 'Low', 'Normal', 'Loud'], value: 'Normal' },
  { key: 'crowdVol', label: 'Crowd volume', options: ['Off', 'Low', 'Normal', 'Loud'], value: 'Normal' },
  { key: 'intros', label: 'Player intros', options: ['On', 'Off'], value: 'On' },
  { key: 'replays', label: 'Replays', options: ['Auto', 'Off'], value: 'Auto' },
  { key: 'flood', label: 'Flood Wagon', options: ['Ask', 'Always', 'Never'], value: 'Ask' },
  { key: 'puckTrail', label: 'Puck trail', options: ['Off', 'Streak', 'Glow'], value: 'Streak' },
  { key: 'tips', label: 'Tips', options: ['On', 'Off'], value: 'On' }
];
const CONTROL_NAMES = { pass: 'Pass / Switch', shoot: 'Shoot / Check', deke: 'Deke / Poke', lob: 'Saucer / Gloves', turbo: 'Turbo', chirp: 'Chirp', switch: 'Switch player', camera: 'Camera', attack: false, dash: false, skill: false, jump: false };
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: HOCKEY_KEYS, id: 'ice-hoc-kaboom',
  autoPause: !HUB,
  menu: HUB ? { items: [], settings: SETTINGS.filter(s => ['glyphs', 'camMode', 'voiceVol', 'crowdVol'].includes(s.key)), controls: CONTROL_NAMES, quit: false }
    : { items: [['Objectives & Info', () => Flow.showInfo()], ['Restart Game', () => Flow.restart()], ['Dev Mode', () => Dev.open()]], settings: SETTINGS, controls: CONTROL_NAMES, quit: 'title' } });
const A = game.audio;
const S = k => game.settings[k];

/* ---- 01-core.js ---- */
/* ---- util, RNG streams, event bus, tuning ---- */
const U = (() => {
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  const segDist = (px_, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, u = clamp(((px_ - ax) * vx + (py - ay) * vy) / l, 0, 1); return Math.hypot(ax + vx * u - px_, ay + vy * u - py); };
  const sanitize = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?').slice(0, 14);
  const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const hash = (a, b) => E.hash2(a | 0, b | 0);
  return { angDiff, segDist, sanitize, mmss, hash, dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y) };
})();
const RNG = { sim: E.rng(1), fx: E.rng(7), seed: 1,
  setSeed(n) { this.seed = n >>> 0; this.sim = E.rng(this.seed); } };
const Bus = (() => {
  const L = {}; let log = [];
  return { on(t, f) { (L[t] = L[t] || []).push(f); return () => { L[t] = L[t].filter(x => x !== f); }; },
    emit(type, d = {}) { d.type = type; log.push(d); if (log.length > 400) log.shift(); for (const f of (L[type] || [])) f(d); for (const f of (L['*'] || [])) f(d); },
    clear() { for (const k in L) delete L[k]; }, log: () => log, reset() { log = []; } };
})();
// every tunable number: [key, default, min, max, step, group, label]
const TUNE = [
  ['skateMax', 132, 80, 200, 2, 'Skating', 'Top speed'], ['skateAccel', 300, 120, 600, 10, 'Skating', 'Acceleration'], ['iceGlide', 28, 0, 120, 2, 'Skating', 'Glide drag'],
  ['turnSlow', 5, 1, 10, .2, 'Skating', 'Turn rate slow'], ['turnFast', 2.6, 1, 10, .2, 'Skating', 'Turn rate fast'], ['stopDecel', 700, 300, 1400, 20, 'Skating', 'Hockey stop'],
  ['turboMul', 1.45, 1, 2, .05, 'Skating', 'Turbo factor'], ['turboDrain', .45, 0, 2, .05, 'Skating', 'Turbo drain'], ['turboRegen', .18, 0, 2, .02, 'Skating', 'Turbo regen'],
  ['puckFriction', 26, 0, 80, 1, 'Puck & Passing', 'Puck friction'], ['puckDrag', .12, 0, .5, .01, 'Puck & Passing', 'Puck drag'], ['boardBounce', .62, .2, 1, .02, 'Puck & Passing', 'Boards bounce'],
  ['pickupRadius', 8, 4, 16, .5, 'Puck & Passing', 'Pickup radius'], ['passMin', 240, 150, 600, 10, 'Puck & Passing', 'Pass speed min'], ['passMax', 420, 150, 600, 10, 'Puck & Passing', 'Pass speed max'],
  ['saucerApex', 10, 4, 24, 1, 'Puck & Passing', 'Saucer height'],
  ['wristSpeed', 350, 200, 500, 10, 'Shooting', 'Wrist shot'], ['slapBase', 380, 250, 560, 10, 'Shooting', 'Slapshot base'], ['slapGain', 160, 0, 300, 10, 'Shooting', 'Slapshot gain'],
  ['slapCharge', .9, .3, 2, .05, 'Shooting', 'Slap charge time'], ['oneTimerBonus', 1.15, 1, 1.5, .05, 'Shooting', 'One-timer bonus'],
  ['goalieLateral', 140, 80, 300, 5, 'Goalies', 'Goalie lateral speed'], ['goalieReact', .25, .02, .4, .01, 'Goalies', 'Goalie reaction'], ['gloveCatch', .55, 0, 1, .05, 'Goalies', 'Glove catch'], ['kaboomBlast', .6, 0, 1, .05, 'Goalies', 'Kaboom blast carry'],
  ['checkPower', 1, .3, 2.5, .05, 'Hitting', 'Check power'], ['knockdown', 210, 80, 300, 5, 'Hitting', 'Big-hit threshold'], ['glassCrack', 170, 80, 300, 5, 'Hitting', 'Glass crack speed'], ['glassShatter', 240, 120, 400, 5, 'Hitting', 'Glass shatter speed'], ['accidentalHit', 180, 100, 300, 5, 'Hitting', 'Accidental hit speed'],
  ['aiSkillMul', 1, .3, 1.4, .05, 'AI', 'CPU skill ×'], ['aiItemGreed', 120, 0, 240, 10, 'AI', 'Item greed range'], ['aiAggro', .5, 0, 1, .05, 'AI', 'Aggression'],
  ['boomGain', 1, .2, 3, .1, 'BOOM & Items', 'BOOM gain'], ['kaboomTime', 15, 5, 40, 1, 'BOOM & Items', 'KABOOM seconds'], ['itemEvery', 35, 8, 90, 1, 'BOOM & Items', 'Fan throw every (s)'],
  ['fightBalance', 100, 40, 200, 5, 'Fights', 'Fight balance'], ['sinBin', 20, 5, 60, 1, 'Fights', 'Sin bin seconds'], ['fightMax', 3, 0, 8, 1, 'Fights', 'Fights per game'],
  ['periodLen', 90, 20, 300, 5, 'Match', 'Period seconds (dev)'], ['gameSpeed', 1, .25, 1.5, .05, 'Match', 'Game speed']
];
const T = (() => {
  const T = {}, defs = {}, store = E.store;
  for (const [k, d, mn, mx, st, g, l] of TUNE) { T[k] = d; defs[k] = { k, d, min: mn, max: mx, step: st, group: g, label: l }; }
  let saved = {}; try { saved = HUB ? {} : (store.get('ihk:tuning', {}) || {}); } catch (e) { saved = {}; }
  for (const k in saved) if (defs[k] && k !== 'periodLen') T[k] = saved[k];
  Object.defineProperty(T, '_defs', { value: defs, enumerable: false });
  Object.defineProperty(T, 'save', { enumerable: false, value() { const o = {}; for (const k in defs) if (T[k] !== defs[k].d) o[k] = T[k]; if (!HUB) try { store.set('ihk:tuning', o); } catch (e) {} } });
  Object.defineProperty(T, 'reset', { enumerable: false, value(k) { T[k] = defs[k].d; T.save(); } });
  Object.defineProperty(T, 'resetAll', { enumerable: false, value() { for (const k in defs) T[k] = defs[k].d; T.save(); } });
  Object.defineProperty(T, 'nonDefault', { enumerable: false, value() { const o = {}; for (const k in defs) if (T[k] !== defs[k].d) o[k] = T[k]; return o; } });
  return T;
})();

/* ---- 02-data.js ---- */
/* ---- DATA: teams, arenas, story, text ---- */
const VOICES = {
  marge: { base: 130, range: 3, speed: 7, wave: 'saw', fs: 1, gruff: .5 }, dunny: { base: 220, range: 4, speed: 10, wave: 'pulse', fs: 1, gruff: .1 },
  snipes: { base: 300, range: 4, speed: 13, wave: 'pulse', fs: 1.1, gruff: .05 }, lou: { base: 90, range: 2, speed: 6, wave: 'saw', fs: .9, gruff: .2 },
  lemmy: { base: 200, range: 5, speed: 9, wave: 'pulse', fs: 1, gruff: 0, vib: 6 }, glitter: { base: 250, range: 4, speed: 13, wave: 'saw', fs: 1.15, gruff: .1 },
  chuck: { base: 240, range: 4, speed: 15, wave: 'pulse', fs: 1.05, gruff: .1 }, moose: { base: 105, range: 3, speed: 9, wave: 'saw', fs: .95, gruff: .45 },
  ref: { base: 180, range: 2, speed: 6, wave: 'square', fs: 1, gruff: .3 }, gus: { base: 110, range: 2, speed: 5, wave: 'saw', fs: .9, gruff: .6 },
  big: { base: 120, range: 3, speed: 8, wave: 'saw', fs: .92, gruff: .3 }, gen: { base: 200, range: 4, speed: 10, wave: 'pulse', fs: 1, gruff: .15 }
};
// player: [name, nick, num, role, [spd,sht,pas,hit,fgt,hnd], hand, bulky, hair, hairColor, skin, voice]
const TEAMS = [
  { id: 'muskrats', name: 'Mukluk Falls Muskrats', abbr: 'MUK', home: { cloth: '#5a3a22', trim: '#e8b43a', pants: '#2a1a10', sock: '#5a3a22' }, away: { cloth: '#f3e6c8', trim: '#5a3a22', pants: '#5a3a22', sock: '#e8b43a' }, accent: '#e8b43a',
    skaters: [['Duncan MacPhail', 'DUNNY', 9, 'C', [4, 3, 5, 3, 2, 4], 1, 0, 'short', '#4a2a14', '#e8b890', 'dunny'], ['Priya Sandhu', 'SNIPES', 19, 'W', [5, 5, 3, 2, 2, 5], 1, 0, 'ponytail', '#141010', '#b88050', 'snipes'], ['Lou Beaudoin', 'BIG LOU', 44, 'D', [2, 4, 2, 5, 5, 2], 1, 1, 'bald', '#222', '#d8a880', 'lou']],
    goalie: ['Lemmy Kowalchuk', 'THE SIEVE', 31, [3, 4, 3], 'lemmy', 'Talks to Posts'], mask: '#e8b43a', pads: '#f3e6c8', rating: [3, 3, 3, 4] },
  { id: 'drillers', name: 'Dryfork Drillers', abbr: 'DRY', home: { cloth: '#1d1d22', trim: '#f07a1a', pants: '#101014', sock: '#f07a1a' }, away: { cloth: '#f2f2ee', trim: '#f07a1a', pants: '#1d1d22', sock: '#f07a1a' }, accent: '#f07a1a',
    skaters: [['Rig McCoy', 'RIG', 7, 'C', [3, 3, 4, 3, 3, 3], 1, 0, 'short', '#6a4a22', '#e0b090', 'gen'], ['Gusher Gomez', 'GUSHER', 15, 'W', [4, 4, 3, 2, 2, 4], 0, 0, 'spiky', '#141010', '#b88050', 'gen'], ['Drill Bit Dobbs', 'DRILL BIT', 2, 'D', [3, 2, 2, 4, 3, 2], 1, 0, 'short', '#8a5a2a', '#e8c0a0', 'big']],
    goalie: ['Derrick Okafor', 'OKAFOR', 35, [2, 3, 2], 'gen', ''], mask: '#f07a1a', pads: '#d8d8d8', rating: [3, 3, 3, 2] },
  { id: 'lumberjacks', name: 'Logjam Lumberjacks', abbr: 'LOG', home: { cloth: '#b3262a', trim: '#141414', pants: '#141414', sock: '#b3262a' }, away: { cloth: '#f3e6c8', trim: '#b3262a', pants: '#b3262a', sock: '#141414' }, accent: '#b3262a',
    skaters: [['Axel Sundqvist', 'AXEL', 10, 'C', [3, 4, 3, 3, 3, 3], 1, 0, 'long', '#c89a3a', '#e8c0a0', 'gen'], ['Sally Lindgren', 'SAWDUST', 27, 'W', [4, 4, 3, 3, 2, 4], 0, 0, 'ponytail', '#a0481c', '#e8b890', 'snipes'], ['Big Timber Thibodeau', 'BIG TIMBER', 88, 'D', [2, 3, 2, 5, 4, 2], 1, 1, 'long', '#4a2a14', '#d8a880', 'big']],
    goalie: ['Stumpy O\'Rourke', 'STUMPY', 1, [3, 4, 3], 'gen', ''], mask: '#b3262a', pads: '#f3e6c8', rating: [3, 3, 3, 3] },
  { id: 'bruisers', name: 'Grindhouse Bruise Brothers', abbr: 'GRD', home: { cloth: '#4b2a6b', trim: '#9be04a', pants: '#2a1a3a', sock: '#9be04a' }, away: { cloth: '#ecebf2', trim: '#4b2a6b', pants: '#4b2a6b', sock: '#9be04a' }, accent: '#9be04a',
    skaters: [['Rocco Bruiser', 'ROCCO', 66, 'C', [3, 3, 2, 5, 5, 2], 1, 1, 'bald', '#222', '#c89070', 'big'], ['Rollo Bruiser', 'ROLLO', 67, 'D', [3, 3, 2, 5, 5, 2], 0, 1, 'bald', '#222', '#c89070', 'big'], ['Mumbles Malone', 'MUMBLES', 12, 'W', [4, 4, 3, 2, 3, 4], 1, 0, 'spiky', '#222', '#e0b090', 'gen']],
    goalie: ['Tank Tankersley', 'TANK', 29, [3, 5, 2], 'big', ''], mask: '#9be04a', pads: '#d6d0e0', rating: [3, 3, 2, 5] },
  { id: 'marauders', name: 'Megaplex Marauders', abbr: 'MEG', home: { cloth: '#18b5b0', trim: '#e0389a', pants: '#0e5a58', sock: '#e0389a' }, away: { cloth: '#f4f4f4', trim: '#18b5b0', pants: '#e0389a', sock: '#18b5b0' }, accent: '#e0389a',
    skaters: [['Chad Glitterman', 'CHAD', 23, 'C', [4, 3, 4, 2, 1, 4], 1, 0, 'spiky', '#e8d080', '#f0c8a0', 'glitter'], ['Zoom Zhang', 'ZOOM', 8, 'W', [5, 3, 3, 2, 2, 4], 1, 0, 'short', '#141010', '#e8c090', 'snipes'], ['Promo Perkins', 'PROMO', 5, 'D', [3, 3, 3, 4, 3, 3], 0, 0, 'short', '#5a3a22', '#c89070', 'gen']],
    goalie: ['Kiosk Kingsley', 'KIOSK', 40, [4, 3, 4], 'glitter', ''], mask: '#e0389a', pads: '#f4f4f4', rating: [4, 3, 3, 4] },
  { id: 'grizzlies', name: 'Gilded Grizzlies', abbr: 'GLD', home: { cloth: '#d9a520', trim: '#141414', pants: '#141414', sock: '#141414' }, away: { cloth: '#f6f2e6', trim: '#d9a520', pants: '#141414', sock: '#d9a520' }, accent: '#ffd36a',
    skaters: [['Sterling Glitterman Jr.', 'STERLING', 1, 'C', [5, 5, 4, 3, 2, 5], 1, 0, 'long', '#e8d080', '#f0c8a0', 'glitter'], ['Silk Sullivan', 'SILK', 91, 'W', [4, 3, 5, 2, 2, 5], 1, 0, 'ponytail', '#222', '#e0b090', 'gen'], ['Brick Brickowski', 'BRICK', 55, 'D', [3, 4, 2, 5, 5, 2], 0, 1, 'bald', '#222', '#c89070', 'big']],
    goalie: ['The Vault', 'THE VAULT', 0, [5, 5, 5], 'lou', 'Boss'], mask: '#ffd36a', pads: '#d9a520', rating: [5, 4, 4, 5] }
];
const TEAM = Object.fromEntries(TEAMS.map(t => [t.id, t]));
const ARENAS = {
  icebox: { id: 'icebox', name: "The Ol' Icebox", town: 'Mukluk Falls', ambient: .62, amb: [255, 220, 170], floor: [233, 243, 251], mat: [88, 70, 56], stand: { face: 'plank', side: '#6a4a2e', top: '#8a6a44' }, boards: '#f4efe2', kick: '#e0b83a', ads: ['MUKLUK MUFFLER & TIRE', "KOWALCHUK'S PEROGIES", "BAIT 'N' BAGELS"], music: 'play', items: ['hotsauce', 'tape', 'poutine', 'boombox'], hazard: null, crowd: ['#8a3a2a', '#e8c070', '#5a7aa0'], sky: ['#1a1410', '#2a2018'], lamps: 6, weather: null },
  pond: { id: 'pond', name: 'Lake Kabonk', town: 'Kabonk Point', ambient: .5, amb: [120, 150, 230], floor: [214, 233, 244], mat: [236, 242, 250], stand: { face: 'rock', side: '#c8d4e4', top: '#f0f6ff' }, boards: '#e8f0f8', kick: '#c8d8ea', ads: [], music: 'pond', items: ['cocoa', 'tape', 'lumber', 'boombox'], hazard: 'thin', crowd: ['#c0402a', '#2a6a4a', '#4a5aa0'], sky: ['#10183a', '#3a3a6a'], lamps: 4, weather: 'snow' },
  grind: { id: 'grind', name: 'The Grindhouse', town: 'Rustbelt', ambient: .5, amb: [150, 220, 170], floor: [220, 232, 232], mat: [60, 64, 68], stand: { face: 'stone', side: '#4a4e54', top: '#62666e' }, boards: '#c8ccd0', kick: '#e0a020', ads: ['RUSTBELT SCRAP', 'IRON GUT CHILI'], music: 'grind', items: ['poutine', 'lumber', 'boombox'], hazard: 'octopus', crowd: ['#5a5a66', '#a05030', '#3a6a5a'], sky: ['#0c1210', '#1c2824'], lamps: 5, weather: null },
  mall: { id: 'mall', name: 'MegaMall Ice Palace', town: 'Megaplex', ambient: .7, amb: [255, 190, 240], floor: [236, 240, 252], mat: [200, 190, 210], stand: { face: 'plaster', side: '#e8d8f0', top: '#f4ecf8' }, boards: '#f8f0fa', kick: '#18b5b0', ads: ['GLITTERMAN MEGAPLEX - COMING SOON!', 'SALE! SALE! SALE!', 'FOOD COURT'], music: 'mall', items: ['hotsauce', 'tape', 'poutine', 'lumber', 'brick', 'boombox'], hazard: 'mascot', crowd: ['#e0389a', '#18b5b0', '#f0e060'], sky: ['#2a1a3a', '#4a2a5a'], lamps: 6, weather: null },
  dome: { id: 'dome', name: 'The Kaboom Dome', town: 'Capital City', ambient: .55, amb: [200, 210, 255], floor: [238, 246, 255], mat: [30, 28, 40], stand: { face: 'stone', side: '#2a2a3a', top: '#ffd36a' }, boards: '#f6f2e6', kick: '#ffd36a', ads: ['KABOOM CUP', 'GILDED', 'SYNERGY!'], music: 'final', items: ['hotsauce', 'brick', 'boombox'], hazard: 'octopus-rare', crowd: ['#d9a520', '#f6f2e6', '#8a3030'], sky: ['#080810', '#1a1030'], lamps: 8, weather: null }
};
const ARENA_LIST = ['icebox', 'pond', 'grind', 'mall', 'dome'];
const ITEMS = {
  hotsauce: { name: 'HOT SAUCE', color: '#ff4a2a', dur: 8, desc: 'Infinite turbo' }, tape: { name: "GRANDMA'S TAPE", color: '#f4f4f0', dur: 10, desc: 'Sticky puck' },
  poutine: { name: 'POUTINE', color: '#e8b860', dur: 10, desc: 'Unstoppable checks' }, lumber: { name: 'LUMBER', color: '#ffd020', dur: 30, desc: 'Next 3 shots +30%' },
  brick: { name: 'BRICK PADS', color: '#c0502a', dur: 12, desc: 'Goalie grows' }, boombox: { name: 'BOOM BOX', color: '#e060ff', dur: 0, desc: '+40 BOOM' }, cocoa: { name: 'HOT COCOA', color: '#a0643a', dur: 8, desc: 'Turbo + speed' }
};
// ----- story -----
const STORY = {
  chapters: [
    { id: 1, title: 'Home Opener', arena: 'icebox', rival: 'drillers', set: 'locker', periods: 3, len: 90, ot: true, tactic: ['Clean and fast', 'Mean and loud'], tacticKey: ['finesse', 'grit'],
      blurb: 'Skating, passing, shooting, one-timers and checks. Save the Icebox.',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'onetimer', text: 'Score a one-timer' }, { id: 'bighits', text: 'Land 3 big hits', need: 3 }],
      pre: [['MARGE', 'Sit down, shut up, and listen. I got a letter.'], ['MARGE', 'Goldie Glitterman bought the land under the Icebox. Wants to pave it for a {c=#ffd36a}Megaplex Parking Experience{/c}.'], ['DUNNY', 'A parking... experience? Beauty. Wait. No. Not beauty.'], ['SNIPES', "This barn's got more character than his whole bank account. And his haircut."], ['MARGE', 'Bylaw 1897-B. Any rink that houses the Kaboom Cup stands forever. So we win the Cup.'], ['LOU', 'Five games, then. Like the five petals of the wild rose.'], ['LEMMY', "Pipesy says we win. Clang's not so sure. Clang's a pessimist."], ['GLITTERMAN', "Enjoy the barn, folks. I've ordered the parking meters. Gold ones."], ['MARGE', "Captain. Tell 'em how we play tonight."]],
      tacticLine: ['keep it clean and fast. Tape to tape!', 'hit everything that moves. And some stuff that does not!'],
      post: [['CHUCK', "The Muskrats take the opener! The Icebox is ROCKIN'!"], ['GLITTERMAN', 'Beginner\'s luck. The meters are still on order.'], ['MARGE', 'Pack your long johns. Lake Kabonk. Pond rules.']] },
    { id: 2, title: 'Pond Rules', arena: 'pond', rival: 'lumberjacks', set: 'bonfire', periods: 3, len: 90, ot: true, tactic: ['Clean and fast', 'Mean and loud'], tacticKey: ['finesse', 'grit'],
      blurb: 'KABOOM mode, power-ups, thin ice and snowbanks.',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'ice', text: 'Break the ice under a Lumberjack' }, { id: 'kaboom', text: 'Trigger KABOOM' }],
      pre: [['BIG TIMBER', "Welcome to the woods, Muskrats. We don't check. We FELL."], ['SNIPES', 'Cute beard. Did you grow it, or did a beaver move in?'], ['LEMMY', "The ice is talking. It says 'crack'."], ['MARGE', 'Thin ice is a tool. Hit \'em where it\'s thin.'], ['MARGE', "And listen. When the whole team's hummin' - hits, passes, the crowd losin' its mind - the ice starts to shake. That's a KABOOM. Fill the meter and let it rip."], ['LOU', 'Like thunder in a teacup.'], ['MARGE', 'Captain. Same question.']],
      tacticLine: ['keep it clean and fast. Tape to tape!', 'hit everything that moves. And some stuff that does not!'],
      post: [['BIG TIMBER', 'You hit like a falling spruce. Good on ya.'], ['DUNNY', 'Thanks! You smell like one!'], ['MARGE', 'Next stop, the Grindhouse. Bring a mouthguard. Bring two.']] },
    { id: 3, title: 'Gloves Off', arena: 'grind', rival: 'bruisers', set: 'dim', periods: 3, len: 90, ot: true, tactic: ['Let Lou loose', 'Keep it on the ice'], tacticKey: ['lou', 'lou2'],
      blurb: 'Fights, the sin bin, power plays, octopi and chirps.',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'fights', text: 'Win 2 fights', need: 2 }, { id: 'ppgoal', text: 'Score a power-play goal' }],
      pre: [['ROCCO', 'Well, well. Lou Beaudoin.'], ['ROLLO', "Lou 'The Library' Beaudoin."], ['ROCCO', 'Heard you knit now.'], ['ROLLO', 'Heard you purl.'], ['LOU', 'I have retired from fisticuffs, gentlemen.'], ['MARGE', 'Retire after the game.'], ['MARGE', "In this barn they drop the gloves, you drop 'em back. Win the scrap, win the barn. Lose it, you sit in the sin bin and think about your choices."], ['MARGE', 'Captain. What about Lou?']],
      tacticLine: ['let Lou loose. Fists are a language!', 'keep it on the ice. Lou can knit later!'],
      post: [['ROLLO', 'He knitted me a scarf.'], ['ROCCO', 'For my neck.'], ['ROLLO', 'Which he bruised.'], ['LOU', 'There is an ice pack in the pocket.'], ['MARGE', 'Next, the Megaplex. Glitterman\'s turf. Watch your wallets.']] },
    { id: 4, title: 'Mall Brawl', arena: 'mall', rival: 'marauders', set: 'neon', periods: 3, len: 90, ot: false, tactic: ['Ignore the bear', 'Hunt the bear'], tacticKey: ['ignore', 'hunt'],
      blurb: 'Polar Pete, the Discount Drop, and the Shootout Showcase.',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'kaboomgoal', text: 'Score a KABOOM goal' }, { id: 'pete', text: 'Knock down Polar Pete' }],
      pre: [["CHAD", "What's up, Mall Rats! Smash that glass, bro!"], ['DUNNY', "We're Muskrats."], ['CHAD', 'Same content, bro.'], ['GLITTERMAN', 'Name your price, goalie.'], ['LEMMY', "...Pipesy says no. Clang says no with a curse word."], ['POLAR PETE', '(a dance, and a muffled babble)'], ['MARGE', "That bear's on the ice all game. Treat him like furniture."], ['MARGE', "And win or tie, the mall's got a Shootout Showcase after. Mall money. We want it."]],
      tacticLine: ['ignore the bear. Furniture!', 'hunt the bear. For science!'],
      post: [['GLITTERMAN', 'Fine. The Final. My Grizzlies. My Dome. My rules.'], ['SNIPES', "Your Dome's gonna need a new roof."]] },
    { id: 5, title: 'The Kaboom Cup', arena: 'dome', rival: 'grizzlies', set: 'tunnel', periods: 3, len: 120, ot: true, tactic: ['Doris plays early', 'Doris plays late'], tacticKey: ['doris1', 'doris2'],
      blurb: 'The boss: Sterling, The Vault, Gilded Mode and the organ.',
      objectives: [{ id: 'win', text: 'Win the Cup' }, { id: 'vaultdeke', text: 'Beat The Vault with a deke goal' }, { id: 'hat', text: 'One player scores a hat trick' }],
      pre: [['STERLING', "I've never lost. Not once. Not even at Go Fish."], ['SNIPES', "There's a first time for everything, Goldilocks."], ['THE VAULT', '...'], ['LEMMY', "He's very big, Pipesy."], ['MARGE', "Forty-six years behind that bench. I've seen better teams. Prettier teams. Teams that could spell."], ['MARGE', 'Never saw one that wanted it more. Go make it go KABOOM.'], ['MARGE', 'And Doris? When should she play?']],
      tacticLine: ['let Doris play early!', 'let Doris play late. Bigger finish!'],
      post: [['CHUCK', 'THE KABOOM CUP IS... KA-BOOMING!'], ['GLITTERMAN', 'My parking meters...'], ['MARGE', 'Bylaw 1897-B, Goldie. Look it up.'], ['GUS', 'Yep.'], ['MARGE', 'Same time next year.']] }
  ],
  pep: ['Chin up. We lost a hockey game, not a leg. Back out there!', 'Pond ice is cruel. So is the lumber. Go again!', 'You got dropped? Good. Learn to fall. Then learn to get up!', "The mall wins on points, we win on heart. Try again, Muskrat.", "Forty-six years, kid. I've lost harder. Skate it off!"],
  unlocks: [[3, 'Big Heads'], [6, 'Octopus Rain'], [9, 'Glow Puck'], [12, 'Always KABOOM'], [15, 'Retro Rigs']]
};
const DRILLS = [
  { id: 1, name: 'Wheels', teach: 'Skate through the gates in order. Use turbo, then hockey-stop at the last one.', need: 6, goal: 'gates' },
  { id: 2, name: 'Tape to Tape', teach: 'Complete 5 passes to moving teammates, then a saucer over the sled.', need: 6, goal: 'passes' },
  { id: 3, name: 'Top Shelf', teach: 'Hit the 4 corner targets on the empty net. Hold shoot for a slapshot.', need: 4, goal: 'targets' },
  { id: 4, name: 'One-Timers', teach: "Score 3 one-timers on Lemmy off Dunny's cross-crease feeds. Press shoot as the pass arrives.", need: 3, goal: 'onetimers' },
  { id: 5, name: 'Finish Your Check', teach: 'Big-hit 3 dummies into the glass. Turbo helps.', need: 3, goal: 'dummies' },
  { id: 6, name: 'Gloves Off', teach: 'Win a spar with Big Lou. He goes easy. Jab, haymaker, duck, yank.', need: 1, goal: 'spar' },
  { id: 7, name: 'KABOOM!', teach: 'With a full meter, score with a KABOOM shot.', need: 1, goal: 'kaboom' }
];
const TEXT = {
  talk: {
    goal: ['{name} puts it home! GOAL for {team}!', 'HE SCORES! {name} with the {shot}!', 'Top shelf, where mama hides the cookies! {name}!', 'It is in! {team} lead {score}!', '{name} finds twine! The horn is deafening!', 'Oh baby! {name}, from the slot!'],
    save: ['Big stop by {goalie}!', '{goalie} says NOT TODAY!', 'Robbed! {goalie} with the glove!', 'The pad save, and a rebound!', '{goalie} stands on his head!'],
    post: ['PING! Off the iron!', 'That one rang the post like a church bell!', 'So close! The post says no!', 'Off the pipe! Oh my!'],
    hit: ['{name} lays him out! BIG HIT!', 'He did not see that coming! {name}!', 'Boom! {name} with the clean check!', 'Somebody call the Zamboni, there is a skater to pick up!', 'That one registered on the Richter scale!'],
    glass: ['THROUGH THE GLASS! Somebody call a handyman!', 'The glass is gone! Shattered!', 'And that panel is retired for the season!', 'Glass everywhere, folks!'],
    kaboom: ['KA-BOOM! {team} go nuclear!', 'The meter is full! It is KABOOM time!', 'Everybody off the ice, {team} are on FIRE!'],
    kaboomshot: ['The fireball slapshot! Look out!', 'That puck is on fire! Literally!', 'Somebody get the goalie a fire extinguisher!'],
    blast: ['{goalie} goes into his own net! Puck AND goalie!', 'Blasted! Goalie and all!'],
    fight: ['The gloves are off! {name} and {victim} drop them!', 'Here we go! {name} wants a word with {victim}!', 'We have a scrap, folks!'],
    fightend: ['{name} wins that one by a mile!', 'And that is a decision! {name} takes it!', 'Down goes {victim}! To the sin bin!'],
    powerplay: ['Power play for {team}!', 'A man advantage and a full head of steam!'],
    hat: ['HAT TRICK! The hats are coming down!', '{name} with the hat trick! Pick up the hats!'],
    period: ['End of the {period} period. {score}.', 'That is the horn! {score} after {period}.'],
    final: ['That is the game! {team} win it, {score}!', 'FINAL! {team} take it {score}!'],
    item: ['A fan throws something onto the ice!', 'Look out, a gift from the crowd!', 'The crowd is feeling generous!'],
    octopus: ['An octopus! You love to see it!', 'Somebody threw a squid on the ice. Tradition!'],
    deke: ['What a move by {name}! He leaves him in the dust!', 'Dangle city! {name} makes him look silly!'],
    onetimer: ['One-timer! Cannon from {name}!', 'Tape to tape and BANG, a one-timer!'],
    faceoff: ['Puck drop at {arena}.', 'We are set to go. Here is the faceoff.'],
    flood: ['Time for the Flood Wagon! Old Gus at the wheel!', 'The ice gets a bath. Here comes the wagon!'],
    mascot: ['MASCOT DOWN! Polar Pete is out cold!', 'Somebody check on the bear!'],
    ice: ['The ice cracks! Down goes the skater in the water!', 'Thin ice! Frozen solid, that one!'],
    shootout: ['Shootout time! Ice in the veins!', 'One on one. Nowhere to hide.'],
    filler: ['Moose: I once ate a puck on a bet. Do not recommend.', 'Moose: My uncle played goal with no mask. We do not speak of his face.', 'Moose: Best hockey advice I ever got? Keep your stick on the ice.', 'Moose: Cold? This is nothing. In my day the ice was uphill both ways.', 'Moose: Never trust a goalie who talks to the posts. Unless it works.', 'Moose: They call this the Biscuit. I call it Thursday.']
  },
  chirps: ['Nice hands. For a lobster!', 'You skate like my grandma. She is faster!', 'Is that a stick or a baguette?', 'Your mother called. She wants her puck back!', 'Careful, you might trip on that blue line!', 'Nice save. Wait, that was a goal!', 'I have seen faster glaciers!', 'You hit like a wet noodle!', 'Hey ref, he is breathing on me!', 'Skate harder, I am getting bored!', 'My stick has more goals than you!', 'Pretty good for a beginner!', 'Do you need a map to the net?', 'That helmet looks heavy!', 'Eat my snow!'],
  tips: { skate: 'Hold {turbo} for turbo. Pull the stick the other way to hockey-stop.', pass: 'Press {pass} to pass. Aim with the stick or the mouse.', shoot: 'Tap {shoot} for a wrist shot. Hold it for a slapshot, release to fire.', check: 'Without the puck, {shoot} is a body check. Hit fast, hit hard.', onetimer: 'Press {shoot} just as a pass arrives for a ONE-TIMER.', deke: '{deke} with the puck is a deke. Without it, a poke check.', saucer: '{lob} throws a saucer pass over sticks.', gloves: 'Hold {lob} near a rival you have a grudge with to drop the gloves.', kaboom: 'The BOOM meter is full! Hold a slapshot for a KABOOM shot!', glass: 'Hit them fast into the glass to crack, then shatter it.', switch: '{switch} or {pass} switches your skater. {pass} calls for a pass.', chirp: '{chirp} chirps the nearest rival. Chirps build BOOM and grudges.', item: 'Walk over items thrown by fans to grab them.', flood: 'Steer the Flood Wagon over the scuffed ice. Hold {turbo} for gas.' },
  stars: ['The first star of the game!', 'Second star, and a heck of a night!', 'Third star, still a good night!', 'Absolute clinic!', 'What a performance!'],
  loser: ['Hang your heads, but only for a second.', 'There is always next game.']
};
const SETDEF = ['locker', 'bonfire', 'dim', 'neon', 'tunnel'];

/* ---- 03-synth.js ---- */
/* ---- SYNTH: every sound, song and voice is written in code ---- */
const Synth = (() => {
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midiOf = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return m ? NOTE[m[1]] + 12 * (+m[2] + 1) : 60; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const nameOf = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const ctx = () => A.ctx;
  // ---- sfx (engine chip voices) ----
  const SFX = {
    tock: { wave: 'noise', freq: 1800, to: 900, dur: .035, vol: .22, filter: 'bandpass', q: 3 }, thwap: { wave: 'noise', freq: 1400, to: 500, dur: .08, vol: .3, filter: 'bandpass', q: 2 },
    snap: [{ wave: 'noise', freq: 2400, to: 700, dur: .06, vol: .34, filter: 'bandpass', q: 1.5 }, { wave: 'triangle', freq: 220, to: 90, dur: .08, vol: .25 }],
    slap: [{ wave: 'noise', freq: 3000, to: 400, dur: .11, vol: .4, filter: 'bandpass', q: 1 }, { wave: 'sine', freq: 300, to: 60, dur: .16, vol: .35 }, { wave: 'noise', freq: 900, to: 200, dur: .3, vol: .12, filter: 'lowpass' }],
    onetimer: [{ wave: 'noise', freq: 3400, to: 300, dur: .13, vol: .45, filter: 'bandpass', q: 1 }, { wave: 'sine', freq: 340, to: 50, dur: .2, vol: .4 }],
    ping: [{ wave: 'triangle', freq: 1850, dur: .9, vol: .32 }, { wave: 'triangle', freq: 1862, dur: .7, vol: .2 }, { wave: 'sine', freq: 3700, dur: .35, vol: .08 }], ping2: [{ wave: 'triangle', freq: 2100, dur: .8, vol: .3 }, { wave: 'triangle', freq: 2115, dur: .6, vol: .16 }],
    boards: [{ wave: 'sine', freq: 140, to: 60, dur: .15, vol: .4 }, { wave: 'noise', freq: 1200, to: 300, dur: .2, vol: .2, filter: 'lowpass' }], glass: [{ wave: 'noise', freq: 4000, to: 2500, dur: .05, vol: .25, filter: 'bandpass', q: 4 }, { wave: 'sine', freq: 1700, to: 1500, dur: .35, vol: .08 }],
    net: { wave: 'noise', freq: 2500, to: 600, dur: .35, vol: .2, filter: 'highpass' }, thump: [{ wave: 'sine', freq: 110, to: 45, dur: .16, vol: .45 }, { wave: 'noise', freq: 700, to: 200, dur: .1, vol: .2, filter: 'lowpass' }],
    bighit: [{ wave: 'sine', freq: 90, to: 28, dur: .34, vol: .6 }, { wave: 'noise', freq: 900, to: 100, dur: .3, vol: .35, filter: 'lowpass' }, { wave: 'noise', freq: 4200, to: 3000, dur: .18, vol: .15, filter: 'bandpass', q: 3 }],
    crack: { wave: 'noise', freq: 5000, to: 3000, dur: .06, vol: .35, filter: 'bandpass', q: 5 },
    shatter: [{ wave: 'noise', freq: 4500, to: 800, dur: .5, vol: .4, filter: 'highpass' }].concat([0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ wave: 'sine', freq: 3200 - i * 260, to: 1200, dur: .35 + i * .04, vol: .05 }))),
    whistle: [{ wave: 'square', freq: 3000, vib: [26, .05], dur: .28, vol: .1 }, { wave: 'square', freq: 3500, vib: [24, .05], dur: .28, vol: .08 }],
    buzzer: { wave: 'square', freq: 220, dur: 1.4, vol: .18 }, punch: [{ wave: 'sine', freq: 130, to: 45, dur: .12, vol: .5 }, { wave: 'noise', freq: 1800, to: 300, dur: .08, vol: .25, filter: 'bandpass', q: 1 }], whiff: { wave: 'noise', freq: 800, to: 2200, dur: .12, vol: .14, filter: 'bandpass', q: 1 },
    twinkle: { wave: 'sine', freq: 1900, to: 2600, dur: .2, vol: .1 }, pickup: { wave: 'square', freq: 'C5', arp: [0, 4, 7, 12], step: .05, dur: .22, vol: .16 }, throw: { wave: 'noise', freq: 400, to: 1800, dur: .35, vol: .18, filter: 'bandpass', q: 1 },
    splort: [{ wave: 'noise', freq: 600, to: 120, dur: .3, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 200, to: 60, dur: .2, vol: .3 }], boomsub: { wave: 'sine', freq: 70, to: 25, dur: .9, vol: .6 },
    ooga: [{ wave: 'square', freq: 330, to: 440, dur: .28, vol: .14 }, { wave: 'square', freq: 250, to: 150, dur: .3, vol: .14 }], mrk: { wave: 'sine', freq: 880, dur: .1, vol: .08 },
    skid: { wave: 'noise', freq: 4200, to: 900, dur: .22, vol: .2, filter: 'bandpass', q: 1.4 }, swish: { wave: 'noise', freq: 2600, to: 1800, dur: .08, vol: .05, filter: 'highpass' },
    mv: { wave: 'triangle', freq: 'A4', dur: .05, vol: .1 }, ok: { wave: 'triangle', freq: 'E5', arp: [0, 7], step: .04, dur: .12, vol: .14 }, back: { wave: 'triangle', freq: 'E4', to: 'A3', dur: .12, vol: .12 },
    fanfare: { wave: 'square', freq: 'G4', arp: [0, 5, 9, 12, 9, 12], step: .09, dur: .6, vol: .12 }, star: { wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12, 16], step: .06, dur: .5, vol: .14 }, drop: { wave: 'sine', freq: 600, to: 80, dur: .4, vol: .2 },
    bonk: { wave: 'square', freq: 200, to: 80, dur: .15, vol: .14 }, slip: { wave: 'saw', freq: 600, to: 120, dur: .35, vol: .1 }, splash: { wave: 'noise', freq: 1500, to: 300, dur: .4, vol: .25, filter: 'lowpass' }
  };
  function init() { for (const k in SFX) A.define(k, SFX[k]); }
  const sfx = (name, o) => { try { A.sfx(name, o); } catch (e) {} };
  // ---- organ ----
  let organWave = null, brassWave = null;
  const getBrass = (c) => { if (brassWave) return brassWave; const re = new Float32Array(10), im = new Float32Array(10); [1, .35, .9, .25, .7, .15, .5, .1, .3].forEach((v, i) => { im[i + 1] = v; }); return (brassWave = c.createPeriodicWave(re, im)); };
  const getOrgan = (c) => { if (organWave) return organWave; const re = new Float32Array(9), im = new Float32Array(9); [1, 2, 3, 4, 6, 8].forEach((h, i) => { im[h] = [1, .8, .55, .4, .2, .15][i]; }); return (organWave = c.createPeriodicWave(re, im)); };
  function tone(c, bus, f, t0, dur, vol, o = {}) {
    const osc = c.createOscillator(), g = c.createGain(); if (o.wave === 'organ') osc.setPeriodicWave(getOrgan(c)); else if (o.wave === 'brass') osc.setPeriodicWave(getBrass(c)); else osc.type = o.wave || 'sawtooth'; osc.frequency.setValueAtTime(f, t0); if (o.to) osc.frequency.linearRampToValueAtTime(o.to, t0 + dur);
    let node = osc; if (o.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = o.q || .7; osc.connect(lp); node = lp; }
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = f * o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + .1); }
    node.connect(g); g.connect(bus); const a = o.attack || .01; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + a); g.gain.setValueAtTime(vol, t0 + Math.max(a, dur - (o.rel || .06))); g.gain.linearRampToValueAtTime(0, t0 + dur);
    osc.start(t0); osc.stop(t0 + dur + .02); return osc;
  }
  /** seq: "G4:1 C5:1 E5:2" (note:beats, '-' rest), tempo bpm */
  function organ(seq, bpm = 140, vol = .16) { const c = ctx(); if (!c || A.muted) return 0; const bus = A.bus('sfx'), spb = 60 / bpm; let t = c.currentTime + .02; for (const tok of seq.split(/\s+/)) { if (!tok) continue; const [n, b] = tok.split(':'), beats = +b || 1; if (n !== '-') tone(c, bus, hz(midiOf(n)), t, beats * spb * .95, vol, { wave: 'organ', vib: [6, .004], attack: .015 }); t += beats * spb; } return t - c.currentTime; }
  const ORGAN = { charge: 'G4:.5 C5:.5 E5:.5 G5:1 E5:.5 G5:2', vamp: 'C4:.5 C#4:.5 D4:.5 D#4:.5 E4:.5 F4:.5 F#4:.5 G4:1.5', clap: 'C5:.5 -:.5 C5:.5 -:.5 C5:.5 G4:.5 -:.5 G4:.5 C5:1', sad: 'G4:1 F#4:1 F4:1 E4:3', fight: 'A3:.5 A3:.5 C4:.5 A3:.5 E4:.5 D#4:.5 D4:1.5', welcome: 'E4:.5 G4:.5 B4:.5 E5:1 B4:.5 E5:1.5' };
  const GOALSONG = { muskrats: 'C5:.5 C5:.5 E5:.5 G5:1 E5:.5 C5:.5 G4:1.5', drillers: 'D4:.5 D4:.5 F4:.5 A4:1 G4:.5 F4:.5 D4:1.5', lumberjacks: 'E4:.5 G4:.5 E4:.5 B4:1 A4:.5 G4:.5 E4:1.5', bruisers: 'A3:.5 A3:.5 C4:.5 E4:.5 A4:1 G4:.5 E4:1.5', marauders: 'C5:.5 E5:.5 G5:.5 C6:1 G5:.5 E5:.5 C5:1.5', grizzlies: 'G4:.5 B4:.5 D5:.5 G5:1.5 D5:.5 G5:1.5' };
  // ---- goal horn ----
  function horn(double) {
    const c = ctx(); if (!c || A.muted) return; const bus = A.bus('sfx'), t0 = c.currentTime + .02;
    for (let k = 0; k < (double ? 2 : 1); k++) { const t = t0 + k * 1.6; [98, 147, 196].forEach((f, i) => { for (const dt of [-3, 3]) { const o = tone(c, bus, f * Math.pow(2, dt / 1200), t, 2.8, .13, { wave: 'brass', lp: 900, attack: .25, rel: .5 }); } });
      const nb = noise(c, 2.6); const g = c.createGain(), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; nb.connect(f); f.connect(g); g.connect(bus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .3); g.gain.linearRampToValueAtTime(0, t + 2.6); nb.start(t); nb.stop(t + 2.7); }
  }
  let nbuf = null;
  function noise(c, dur) { if (!nbuf) { nbuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = c.createBufferSource(); s.buffer = nbuf; s.loop = true; return s; }
  // ---- babble voices ----
  const FORM = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700] };
  const vowelOf = (ch, next) => { const l = ch.toLowerCase(); if ('aeiou'.includes(l)) return l; const n = (next || 'a').toLowerCase(); return 'aeiou'.includes(n) ? n : 'aeiou'[(l.charCodeAt(0) * 7) % 5]; };
  let lastBlip = 0;
  function blip(vk, ch, next, when, o = {}) {
    const c = ctx(); if (!c) return; const v = VOICES[vk] || VOICES.gen, bus = A.bus('voice'), t = when == null ? c.currentTime + .005 : when;
    const vow = vowelOf(ch, next), semis = ((ch.toLowerCase().charCodeAt(0) * 5) % 7) - 3 + (o.lift || 0), f0 = v.base * Math.pow(2, semis / 12), dur = clamp(.9 / v.speed, .055, .085) * (o.long ? 1.6 : 1);
    const osc = c.createOscillator(); osc.type = v.wave === 'saw' ? 'sawtooth' : 'square'; osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (o.glide || 1), t + dur);
    if (v.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = v.vib; lg.gain.value = f0 * .04; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + .02); }
    const g = c.createGain(), mix = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .008); g.gain.linearRampToValueAtTime(0, t + dur);
    for (const fm of FORM[vow]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm * v.fs; bp.Q.value = 6; osc.connect(bp); bp.connect(mix); }
    mix.connect(g); g.connect(bus); osc.start(t); osc.stop(t + dur + .02);
    if (v.gruff > .05 || 'stkp'.includes(ch.toLowerCase())) { const n = noise(c, .1), ng = c.createGain(), nf = c.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 2500; n.connect(nf); nf.connect(ng); ng.connect(bus); const lvl = 'stkp'.includes(ch.toLowerCase()) ? .25 : v.gruff * .12; ng.gain.setValueAtTime(lvl, t); ng.gain.linearRampToValueAtTime(0, t + (('stkp'.includes(ch.toLowerCase())) ? .012 : dur)); n.start(t); n.stop(t + dur + .02); }
  }
  /** a whole line, scheduled ahead; returns its length in seconds */
  function babble(text, vk, o = {}) {
    const c = ctx(); if (!c || A.muted) return 0; const v = VOICES[vk] || VOICES.gen, step = 1 / v.speed; let t = c.currentTime + .02; const letters = String(text).replace(/\{[^}]*\}/g, '').split(''); const n = letters.length; let k = 0, syl = 0;
    const endSyl = letters.filter(ch => /[a-z]/i.test(ch)).length;
    for (let i = 0; i < n; i++) { const ch = letters[i]; if (/[a-z]/i.test(ch)) { if (k++ % 2 === 0 || 'aeiou'.includes(ch.toLowerCase())) { const last = endSyl - syl <= 4; blip(vk, ch, letters[i + 1], t, { lift: (o.excl && last ? 4 : 0), glide: o.ask && endSyl - syl <= 1 ? 1.4 : 1 }); t += step; } syl++; } else if (ch === ',') t += .12; else if (ch === '.' || ch === '?' || ch === '!') t += .22; }
    return t - c.currentTime;
  }
  /** E.Dialog's voice hook for a speaker */
  const dialogVoice = (vk) => (i, page) => { const ch = page && page[i]; if (!ch || !/[a-z]/i.test(ch)) return; const now = performance.now(); const v = VOICES[vk] || VOICES.gen; if (now - lastBlip < 700 / v.speed) return; lastBlip = now; blip(vk, ch, page[i + 1]); };
  // ---- crowd ----
  let crowd = null, exc = 0;
  function crowdStart() {
    const c = ctx(); if (!c || crowd) return; const bus = A.bus('crowd'); crowd = [];
    for (const [fq, q] of [[400, .8], [1200, .7]]) { const n = noise(c), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q; n.connect(f); f.connect(g); g.connect(bus); g.gain.value = 0; n.start(); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = .3 + Math.random() * .2; lg.gain.value = .02; l.connect(lg); lg.connect(g.gain); l.start(); crowd.push(g); }
  }
  function crowdSet(e) { exc = e; if (!crowd) return; const c = ctx(); crowd[0].gain.setTargetAtTime(.03 + e * .22, c.currentTime, .3); crowd[1].gain.setTargetAtTime(.01 + e * .16, c.currentTime, .3); }
  function react(kind) {
    const c = ctx(); if (!c || A.muted) return; const bus = A.bus('crowd'), t = c.currentTime + .01;
    const sweep = (f0, f1, dur, vol, q = 1.2) => { const n = noise(c), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur); n.connect(f); f.connect(g); g.connect(bus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .25); g.gain.linearRampToValueAtTime(0, t + dur); n.start(t); n.stop(t + dur + .05); };
    if (kind === 'ohh') sweep(1100, 380, .9, .4); else if (kind === 'ahh') sweep(500, 900, .8, .3); else if (kind === 'cheer') { sweep(800, 1400, 1.6, .5); for (let i = 0; i < 5; i++) blip('snipes', 'aeiou'[i % 5], 'a', t + i * .09); } else if (kind === 'boo') sweep(300, 180, 1.2, .45, 2); else if (kind === 'roar') sweep(600, 1300, 2.6, .6, .8);
    else if (kind === 'chant') for (let i = 0; i < 8; i++) { const vk = ['marge', 'dunny', 'lou', 'snipes', 'moose', 'chuck'][i % 6]; blip(vk, 'ka'[i % 2], 'o', t + (i >> 1) * .38 + (i % 2) * .02, { long: 1 }); }
  }
  // ---- songs ----
  const bars = (arr) => arr.join(' | ');
  function chord(root, minor) { const r = midiOf(root + '3'); return [r, r + (minor ? 3 : 4), r + 7]; }
  function mkSong(o) {
    const { bpm, prog, minor = true, lead = 'sq', drums = 'rock', leadVol = .09, wave = 'square', bassWave = 'triangle', pad = 'saw', feel = 0 } = o;
    const L = [], B = [], P = [], D = [], ARP = [];
    prog.forEach((root, bi) => { const ch = chord(root, Array.isArray(minor) ? minor[bi] : minor), tn = i => nameOf(ch[i] + 12), tn2 = i => nameOf(ch[i] + 24);
      B.push(bars([0]).length && [nameOf(ch[0] - 12), '.', nameOf(ch[0] - 12), '.', nameOf(ch[0] - 12), '.', nameOf(ch[0]), '.'].join(' '));
      P.push([nameOf(ch[0]), '-', '-', '-', nameOf(ch[2]), '-', '-', '-'].join(' '));
      const pat = [[0, 1, 2, 1, 2, 1, 0, 1], [2, '.', 1, 2, 0, '.', 1, 2], [0, '.', 2, '.', 1, '.', 2, 1], [1, 2, '.', 2, 1, 0, '.', 2]][(bi + feel) % 4];
      L.push(pat.map(x => x === '.' ? '.' : tn2(x)).join(' '));
      ARP.push([0, 2, 1, 2, 0, 2, 1, 2].map(x => tn(x)).join(' '));
      D.push({ rock: 'k . h . s . h h', slow: 'k . . h s . . h', waltz: 'k . h . h . s . h', punk: 'k h s h k h s h', pop: 'k . h . s . h .', march: 'k . s . k . s s', none: '. . . . . . . .' }[drums]);
    });
    const tracks = [{ wave, vol: leadVol, notes: L.join(' | ') }, { wave: bassWave, vol: .3, notes: B.join(' | ') }, { wave: pad === 'saw' ? 'saw' : pad, vol: .03, notes: P.join(' | ') }];
    if (drums !== 'none') tracks.push({ wave: 'drums', vol: .09, notes: D.join(' | ') });
    return { bpm, steps: 4, tracks, _meta: o };
  }
  const SONGS = {
    theme: mkSong({ bpm: 148, prog: ['E', 'E', 'A', 'B'], minor: [true, true, false, false], drums: 'rock', leadVol: .1, feel: 0 }),
    menu: mkSong({ bpm: 100, prog: ['E', 'C', 'A', 'B'], minor: [true, false, true, false], drums: 'slow', leadVol: .06, feel: 1, wave: 'triangle' }),
    locker: mkSong({ bpm: 92, prog: ['A', 'A', 'F', 'G'], minor: [true, true, false, false], drums: 'slow', leadVol: .05, feel: 2, wave: 'triangle', bassWave: 'saw' }),
    pond: mkSong({ bpm: 120, prog: ['D', 'G', 'A', 'D'], minor: false, drums: 'waltz', leadVol: .08, feel: 3, wave: 'pulse' }),
    grind: mkSong({ bpm: 168, prog: ['E', 'G', 'D', 'A'], minor: [true, false, false, true], drums: 'punk', leadVol: .09, feel: 1, wave: 'saw' }),
    mall: mkSong({ bpm: 112, prog: ['C', 'A', 'F', 'G'], minor: [false, true, false, false], drums: 'pop', leadVol: .08, feel: 2, wave: 'square' }),
    final: mkSong({ bpm: 132, prog: ['D', 'B', 'G', 'A'], minor: [true, true, false, false], drums: 'march', leadVol: .1, feel: 3, wave: 'saw' }),
    play: mkSong({ bpm: 126, prog: ['A', 'F', 'C', 'G'], minor: [true, false, false, false], drums: 'rock', leadVol: .035, feel: 0, wave: 'pulse' }),
    flood: mkSong({ bpm: 108, prog: ['G', 'D', 'E', 'D'], minor: [false, false, true, false], drums: 'waltz', leadVol: .08, feel: 2, wave: 'triangle' }),
    victory: mkSong({ bpm: 140, prog: ['C', 'F', 'G', 'C'], minor: false, drums: 'march', leadVol: .11, feel: 1, wave: 'square' }),
    defeat: mkSong({ bpm: 70, prog: ['A', 'F', 'D', 'E'], minor: true, drums: 'none', leadVol: .08, feel: 0, wave: 'triangle' }),
    credits: mkSong({ bpm: 96, prog: ['E', 'C', 'G', 'D'], minor: [true, false, false, false], drums: 'slow', leadVol: .09, feel: 3, wave: 'square' })
  };
  // layers on the play song: drive (3rd period/OT), kaboom, fight
  SONGS.play.tracks.push({ wave: 'saw', name: 'drive', on: false, vol: .05, notes: 'A2 A2 . A2 A2 . A2 A2 | F2 F2 . F2 F2 . F2 F2 | C3 C3 . C3 C3 . C3 C3 | G2 G2 . G2 G2 . G2 G2' });
  SONGS.play.tracks.push({ wave: 'saw', name: 'kaboom', on: false, vol: .12, notes: 'A1 A1 A2 A1 A1 A2 A1 A2 | F1 F1 F2 F1 F1 F2 F1 F2 | C2 C2 C3 C2 C2 C3 C2 C3 | G1 G1 G2 G1 G1 G2 G1 G2' });
  SONGS.play.tracks.push({ wave: 'drums', name: 'kaboomdrums', on: false, vol: .12, notes: 'k k h k s k h k | k k h k s k h s | k k h k s k h k | k s h s k s k s' });
  SONGS.play.tracks.push({ wave: 'saw', name: 'fight', on: false, vol: .08, notes: 'A2 . . A2 C3 . . A2 | A2 . . A2 D#3 . . D3 | A2 . . A2 C3 . . A2 | E3 . . D#3 D3 . . A2' });
  let current = null;
  const music = (name, o) => { try { if (name === current && !(o && o.force)) return; current = name; A.music(name ? SONGS[name] : null, Object.assign({ fade: .6 }, o || {})); } catch (e) { game.fail('music', e); } };
  return { init, sfx, organ, ORGAN, GOALSONG, horn, babble, blip, dialogVoice, crowdStart, crowdSet, react, music, SONGS, hz, midiOf, current: () => current, reset() { current = null; } };
})();

/* ---- 05-feedback.js ---- */
/* generated from tools/feedback.json by tools/build.mjs */
const FEEDBACK = {"sourceInformation":{"date":"2026-11-04 05:50:58","source":"Ice hockey (over the top arcade style)","plan":"PLAN.md","genre":"Arcade sports: 3-on-3 ice hockey with goalies, a fight minigame, a story campaign (the Cup Run), exhibition, practice drills and online versus","perspective":"2.5D TV broadcast camera (engine threequarter view, pitch 55) that tracks the puck; Overhead (topdown) option; brawler view for fights and replays","tech":"my-3D2dge v0.85.2 (handoff package, patched: font glyphs, Create+Options rule, voice/crowd audio buses, Dialog voice hook), plain JavaScript in one IIFE, AI Hub session client 1.4.0; tests with Node vm and Playwright 1.63.0 (Chromium)","artDirection":"Engine native PS1-era pixel art (res ps1, expanded), HD Humanoid rigs dressed as skaters, goalies, refs and set-piece people; hockey gear (sticks, skate blades, goalie pads, numbers) drawn by the game over the rigs; drawn-in-code team logos, rink, boards, glass, stands, crowds and lights","animation":"The engine's procedural Humanoid rig (run gait, E.MOVES jab/haymaker/bash/thrust, poses, flip, down) driven by the simulation state; new hockey motions are state mappings, no skeletal solvePose overrides","audio":"All music, effects and voices are synthesized in code: engine chip synth for effects and songs, Web Audio for the goal horn, organ stings, crowd bed and Animalese-style formant babble voices for every character; no audio files","online":"AI Hub Session Protocol v1, shared-world mode, 1-4 players: host-authoritative simulation, 15 Hz input and snapshot messages, client prediction for the own skater, game card; passes the harness in all 4 configurations","testing":"Headless scripts with game.advance and game.debug (unit, systems, input, attract, dev, drills, a scripted playthrough of the whole story), a balance simulation, the AI Hub harness in 4 configurations, and a few screenshots; no subagents","research":"Read the engine handoff (README, API card, sports kit, headers), the AI Hub protocol and the supplied PLAN.md; no web research on hockey (general knowledge)","environment":"Claude Code CLI (headless); Linux; browser unknown (Chromium headless was used for checks)","model":"Anthropic, claude-sonnet-5-5, reasoning effort medium","usage":"Session time about 1 h 10 min (05:50 to about 07:00); API cost and token counts: unknown"},"testingFeedback":["About 10 real issues: AI checks could never fire (the AI set the cooldown the action code then read), goal records lost their shot type because Bus.emit overwrote a field named type, drill setup was undone by the faceoff reset, hub traffic stopped before the countdown ended, goalie and shot-height balance problems, missing glyphs in the pixel font, a stop-state flag the drill could not observe, a camera zoom far too close, and a tip box wider than its text.","3 were game breaking: no hits at all in AI play, drills starting in a faceoff, and the shared-world host sending nothing during the card (the harness failed host-leave).","The scripted playthrough of the whole story (all 5 chapters through cutscenes, matches, results and the credits) plus the AI Hub harness: they exercise every system end to end and caught the integration bugs.","Screenshots from the slow software-rendered headless browser: they show the look but game time barely advances, so they were weak for judging play. The 10-game balance averages were noisy too."],"engineFeedback":["The fixed-step headless mode (game.advance, game.input.tap/hold, game.debug) that lets a whole game be tested with no browser, and the Humanoid rigs, TileMap floors, lights, particles, scenes, Dialog and standard pause/settings/controls that come for free.","Yes: the Dialog voice option only accepts an sfx name, Bus-style fields collide with my own event naming (my bug), r.w returns floats, the pixel font lacks arrows and check marks beyond a short list, and zoom 1 shows far less of a 70x44-tile rink than I first assumed.","The match simulation: the hockey rink geometry and collisions, skating, puck, goalie save solver, checks and glass, fights, BOOM/KABOOM, items, AI, replay and the AI Hub netcode, since the engine ships a 2v2 cage kit but no hockey.","Drawing hockey gear on a rig that has no stick, skates or pads (without wrapping solvePose) and keeping depth order of big custom board and glass panels in a ground view.","Four small changes: added the PlayStation symbols to the 5x7 font, ignored Options while Create is held (AI Hub rule), added audio.bus() with voice and crowd buses and volume fields, and let a Dialog voice be a function so each speaker can babble.","A documented way to add weapons, gear and extra joints to a Humanoid (a stick or pads) and a public audio graph API with filters on oscillator voices."],"promptFeedback":["The detailed plan: every system, number, screen and test was specified, so it was possible to build to it without design dithering, and the TASK.md checklist was clear.","The plan and TASK.md differ in file names (the plan names another model and time), and the plan asks for far more than one session can finish at normal fidelity (a solvePose animation lab, organ waves, 6 teams of art, web harness) with no priority order beyond milestones.","Making every plan item real and playable: five story chapters with cutscenes, seven drills, online netcode, attract mode, dev mode and tests, in one sitting.","Mark which plan items are must-have for a demo and which are stretch, give a target size for the code, and say how to resolve conflicts between the plan and TASK.md before the build starts."],"aiHub":{"name":"Ice Hoc-Kaboom","tagline":"Over-the-top 3-on-3 arcade hockey","description":"Glass-shattering hits, dropped gloves and explosive KABOOM slapshots as the Mukluk Falls Muskrats fight to save their rink. Story, exhibition and up to four players.","type":"Game","genre":"Sports","source":"Ice hockey","series":"","players":"1–4","controls":"Stick/WASD skate · ✕/J pass · □/K shoot · ○/L deke · △/I saucer & gloves · R2/Shift turbo","tags":["arcade","sports","versus","comedy","pixel art","story"]}};

/* ---- 10-rink.js ---- */
/* ---- RINK: geometry, floor, boards, glass, nets, scuffs ---- */
const Rink = (() => {
  const TS = 16, COLS = 70, ROWS = 44, CX = 560, CY = 400, HX = 432, HY = 192, RR = 96, GOALX = 376, GHALF = 16, NETD = 20, BOARD = 17;
  const X0 = CX - HX, X1 = CX + HX, Y0 = CY - HY, Y1 = CY + HY;
  const sd = (x, y) => { const qx = Math.abs(x - CX) - (HX - RR), qy = Math.abs(y - CY) - (HY - RR); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - RR; };
  const normalAt = (x, y) => { // outward normal
    const sx = x < CX ? -1 : 1, sy = y < CY ? -1 : 1, qx = Math.abs(x - CX) - (HX - RR), qy = Math.abs(y - CY) - (HY - RR);
    if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; return [sx * qx / l, sy * qy / l]; }
    return qx > qy ? [sx, 0] : [0, sy];
  };
  const inside = (x, y, r = 0) => sd(x, y) <= -r;
  const clampBody = (b, r) => { const d = sd(b.x, b.y); if (d > -r) { const n = normalAt(b.x, b.y); b.x -= n[0] * (d + r); b.y -= n[1] * (d + r); return { n, d: d + r }; } return null; };
  // panels: 48 around the boards
  const panels = [];
  (() => {
    const secs = [['s', CX - (HX - RR), CY - HY, 1, 0, 2 * (HX - RR), 14], ['c', CX + HX - RR, CY - HY + RR, -PI / 2, 3], ['s', CX + HX, CY - (HY - RR), 0, 1, 2 * (HY - RR), 4], ['c', CX + HX - RR, CY + HY - RR, 0, 3],
      ['s', CX + (HX - RR), CY + HY, -1, 0, 2 * (HX - RR), 14], ['c', CX - HX + RR, CY + HY - RR, PI / 2, 3], ['s', CX - HX, CY + (HY - RR), 0, -1, 2 * (HY - RR), 4], ['c', CX - HX + RR, CY - HY + RR, PI, 3]];
    for (const s of secs) {
      if (s[0] === 's') { const [, sx, sy, dx, dy, len, n] = s; for (let i = 0; i < n; i++) { const a = [sx + dx * len * i / n, sy + dy * len * i / n], b = [sx + dx * len * (i + 1) / n, sy + dy * len * (i + 1) / n]; panels.push(mk(a, b)); } }
      else { const [, ccx, ccy, a0, n] = s; for (let i = 0; i < n; i++) { const t0 = a0 + (PI / 2) * i / n, t1 = a0 + (PI / 2) * (i + 1) / n; panels.push(mk([ccx + Math.cos(t0) * RR, ccy + Math.sin(t0) * RR], [ccx + Math.cos(t1) * RR, ccy + Math.sin(t1) * RR])); } }
    }
    function mk(a, b) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, n = normalAt(mx, my); return { a, b, mx, my, n, st: 0, shake: 0, id: panels.length, near: n[1] > .45 }; }
  })();
  const panelAt = (x, y) => { let best = 0, bd = 1e9; for (const p of panels) { const d = (p.mx - x) ** 2 + (p.my - y) ** 2; if (d < bd) { bd = d; best = p.id; } } return panels[best]; };
  const inGoalMouth = y => Math.abs(y - CY) < GHALF;
  // faceoff dots
  const dots = [[CX, CY], [CX - 280, CY - 112], [CX - 280, CY + 112], [CX + 280, CY - 112], [CX + 280, CY + 112], [CX - 84, CY - 112], [CX - 84, CY + 112], [CX + 84, CY - 112], [CX + 84, CY + 112]];
  const nearestDot = (x, y, endOnly) => { let best = dots[0], bd = 1e9; for (let i = endOnly ? 1 : 0; i < dots.length; i++) { const d = (dots[i][0] - x) ** 2 + (dots[i][1] - y) ** 2; if (d < bd) { bd = d; best = dots[i]; } } return best; };
  // scuff grid
  const SW = 54, SH = 24; let scuff = new Float32Array(SW * SH), melt = new Float32Array(SW * SH);
  const cellOf = (x, y) => { const cx = ((x - X0) / 16) | 0, cy = ((y - Y0) / 16) | 0; return cx >= 0 && cy >= 0 && cx < SW && cy < SH ? cy * SW + cx : -1; };
  const addScuff = (x, y, a, m = 0) => { const i = cellOf(x, y); if (i >= 0) { scuff[i] = Math.min(1, scuff[i] + a); melt[i] = Math.min(1, melt[i] + m); } };
  const clean = (x, y, r) => { for (let cy = 0; cy < SH; cy++) for (let cx = 0; cx < SW; cx++) { const wx = X0 + cx * 16 + 8, wy = Y0 + cy * 16 + 8; if (Math.hypot(wx - x, wy - y) < r) { const i = cy * SW + cx; scuff[i] = 0; melt[i] = 0; } } };
  const scuffTotal = () => { let s = 0; for (let i = 0; i < scuff.length; i++) s += scuff[i]; return s; };
  const resetScuff = () => { scuff.fill(0); melt.fill(0); };
  // maps (one TileMap per arena)
  const maps = {};
  const buildMap = (arena) => {
    if (maps[arena.id]) return maps[arena.id];
    const rows = [];
    const tier = n => 'abcdefgh'[clamp(n, 0, 7)];
    for (let r = 0; r < ROWS; r++) { let s = ''; for (let c = 0; c < COLS; c++) {
      if (r <= 10 && c >= 4 && c <= 65) s += tier((10 - r) / 1.7 | 0);
      else if (c <= 6 && r >= 11 && r <= 41 && c >= 1) s += tier((6 - c) / 1.2 | 0);
      else if (c >= 63 && r >= 11 && r <= 41 && c <= 68) s += tier((c - 63) / 1.2 | 0);
      else s += '.'; } rows.push(s); }
    const st = arena.stand, hs = [20, 28, 36, 44, 52, 60, 68, 76], legend = { '.': { floor: 'x' } }, types = {};
    'abcdefgh'.split('').forEach((ch, i) => { legend[ch] = i + 1; types[i + 1] = { h: hs[i], face: st.face, side: st.side, top: st.top, cut: false }; });
    const m = new E.TileMap({ rows, legend, types, outside: '#0a0a10', ao: 0, floorTex: (x, y) => arenaFloor(arena, x, y) });
    return (maps[arena.id] = m);
  };
  const LINE = [200, 40, 50], BLUE = [40, 90, 200];
  const arenaFloor = (arena, x, y) => {
    const d = sd(x, y), n = E.hash2(x | 0, y | 0) - .5, m = E.noise2(x * .05, y * .05) - .5;
    if (d > 0) { const mt = arena.mat, v = n * 14; if (arena.id === 'pond') { return [mt[0] + v, mt[1] + v, mt[2] + v * .5]; } return [mt[0] + v + (((x >> 4) + (y >> 4)) & 1 ? 6 : 0), mt[1] + v, mt[2] + v]; }
    const f = arena.floor; let c = [f[0] + n * 6 - Math.max(0, d + 30) * 0 , f[1] + n * 6, f[2] + n * 4]; const sh = clamp((d + 28) / 28, 0, 1); c = [c[0] - sh * 18, c[1] - sh * 12, c[2] - sh * 4]; c[0] += m * 8; c[1] += m * 8;
    const ax = Math.abs(x - CX), ay = Math.abs(y - CY);
    if (ax < 2.5) return LINE; if (Math.abs(ax - 108) < 2.5) return BLUE; if (Math.abs(ax - GOALX) < 1) return LINE;
    const dc = Math.hypot(x - CX, y - CY); if (Math.abs(dc - 72) < 1.2 || dc < 3) return arena.id === 'dome' ? [220, 170, 40] : [60, 110, 200];
    if (dc < 30 && dc > 26) return [90, 130, 210];
    for (const dd of dots) { const e = Math.hypot(x - dd[0], y - dd[1]); if (dd !== dots[0] && (Math.abs(e - 72) < 1 && Math.abs(dd[0] - CX) > 200 || e < 3)) return LINE; }
    for (const gx of [CX - GOALX, CX + GOALX]) { const e = Math.hypot(x - gx, y - CY); if (e < 28 && (gx < CX ? x > gx : x < gx)) return e > 26 ? LINE : [160, 205, 255]; }
    return c;
  };
  const dir = (side) => side === 0 ? -1 : 1;
  // draws
  function drawGround(r, map) { map.drawFloor(r); r.decal(g => {
    for (let cy = 0; cy < SH; cy++) for (let cx = 0; cx < SW; cx++) { const i = cy * SW + cx, s = scuff[i], m = melt[i]; if (s < .06 && m < .05) continue; const wx = X0 + cx * 16, wy = Y0 + cy * 16; if (!r.visible(wx + 8, wy + 8, 0)) continue;
      if (m > .05) { const [px0, py0] = r.w(wx + 8, wy + 8, 0); px.ell(g, Math.round(px0), Math.round(py0), 5, 3, `rgba(110,160,210,${(0.35 * m).toFixed(2)})`); }
      const h = U.hash(cx, cy), k = 1 + (h * 4 | 0); for (let q = 0; q < k; q++) { const a = U.hash(cx + q * 7, cy) * PI, ox = wx + U.hash(q, cx * 3 + cy) * 12, oy = wy + U.hash(cy, q + cx) * 12; const [x0, y0] = r.w(ox, oy, 0), [x1, y1] = r.w(ox + Math.cos(a) * 7, oy + Math.sin(a) * 7, 0); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), `rgba(150,165,185,${(0.15 + s * .4).toFixed(2)})`, 1); } } }); }
  function quad(g, r, a, b, z0, z1, col) { const [ax, ay] = r.w(a[0], a[1], z0), [bx, by] = r.w(b[0], b[1], z0), [cx, cy] = r.w(b[0], b[1], z1), [dx, dy] = r.w(a[0], a[1], z1); px.poly(g, [[ax, ay], [bx, by], [cx, cy], [dx, dy]], col); return [[ax, ay], [bx, by], [cx, cy], [dx, dy]]; }
  function drawBoards(r, arena, homeColor, t) {
    for (const p of panels) {
      const low = p.near; const bh = low ? 6 : BOARD, gh = p.n[0] ? 40 : 28; // ends taller
      r.queue(p.mx, p.my, 0, g => {
        const wob = Math.sin(p.shake * 40) * (p.shake > 0 ? 1 : 0);
        quad(g, r, p.a, p.b, 0, bh, arena.boards);
        quad(g, r, p.a, p.b, 0, 2.5, arena.kick);
        quad(g, r, p.a, p.b, bh - 1, bh + .6, homeColor);
        if (!low && p.id % 4 === 1 && arena.ads.length) { const ad = arena.ads[(p.id >> 2) % arena.ads.length]; const [x, y] = r.w(p.mx, p.my, bh * .6); if (Math.abs(p.n[1]) > .5 && !low) E.font.text(g, ad.slice(0, 14), Math.round(x), Math.round(y) - 3, '#2a3a5a', { align: 'center', font: 'tiny', outline: false }); }
        if (!low) {
          if (p.st < 2) px.blend(g, .28, 'normal', () => { quad(g, r, p.a, p.b, bh, bh + gh + wob, '#cfe8ff'); });
          if (p.st === 0) { const [x0, y0] = r.w(p.a[0] * .7 + p.b[0] * .3, p.a[1] * .7 + p.b[1] * .3, bh + 4), [x1, y1] = r.w(p.a[0] * .4 + p.b[0] * .6, p.a[1] * .4 + p.b[1] * .6, bh + gh - 6); px.line(g, x0, y0, x1, y1, 'rgba(255,255,255,.55)', 1); }
          if (p.st === 1) { const [x0, y0] = r.w(p.a[0], p.a[1], bh + 6), [x1, y1] = r.w(p.b[0], p.b[1], bh + gh - 4), [x2, y2] = r.w(p.mx, p.my, bh + 3), [x3, y3] = r.w(p.mx, p.my, bh + gh); px.line(g, x0, y0, x1, y1, '#ffffff', 1); px.line(g, x2, y2, x3, y3, '#ffffff', 1); px.line(g, x2, y2, x1, y1, '#dfefff', 1); }
          for (const q of [p.a, p.b]) { const [x0, y0] = r.w(q[0], q[1], bh), [x1, y1] = r.w(q[0], q[1], bh + gh); px.line(g, x0, y0, x1, y1, '#9aa8b8', 1); }
          const [x0, y0] = r.w(p.a[0], p.a[1], bh + gh), [x1, y1] = r.w(p.b[0], p.b[1], bh + gh); px.line(g, x0, y0, x1, y1, '#b8c8d8', 1);
        }
      }, { bias: low ? -2 : 0 });
    }
  }
  function drawNet(r, side, bulge, lit, light) { // side 0 = home end west
    const gx = side === 0 ? CX - GOALX : CX + GOALX, d = side === 0 ? -1 : 1, bx = gx + d * NETD;
    r.queue(bx, CY, 0, g => {
      const ptsTop = [[gx, CY - GHALF], [bx, CY - GHALF], [bx, CY + GHALF], [gx, CY + GHALF]];
      px.blend(g, .32, 'normal', () => { quad(g, r, [bx, CY - GHALF], [bx, CY + GHALF], 0, 20, '#ffffff'); quad(g, r, [gx, CY - GHALF], [bx, CY - GHALF], 0, 20, '#ffffff'); quad(g, r, [gx, CY + GHALF], [bx, CY + GHALF], 0, 20, '#ffffff'); });
      for (let i = 0; i <= 8; i++) { const yy = CY - GHALF + 32 * i / 8, [x0, y0] = r.w(bx + d * (bulge || 0) * Math.sin(i / 8 * PI), yy, 0), [x1, y1] = r.w(bx, yy, 20); px.line(g, x0, y0, x1, y1, 'rgba(255,255,255,.55)', 1); }
      for (let z = 4; z < 20; z += 4) { const [x0, y0] = r.w(bx, CY - GHALF, z), [x1, y1] = r.w(bx, CY + GHALF, z); px.line(g, x0, y0, x1, y1, 'rgba(255,255,255,.4)', 1); }
      for (const yy of [CY - GHALF, CY + GHALF]) { const [x0, y0] = r.w(gx, yy, 0), [x1, y1] = r.w(gx, yy, 20); px.line(g, x0, y0, x1, y1, '#d02a2a', 2); }
      const [x0, y0] = r.w(gx, CY - GHALF, 20), [x1, y1] = r.w(gx, CY + GHALF, 20); px.line(g, x0, y0, x1, y1, '#d02a2a', 2);
      if (light) { const [lx, ly] = r.w(bx, CY, 24); px.disc(g, Math.round(lx), Math.round(ly), 3, lit ? '#ff2a2a' : '#401010'); }
    }, { emissive: !!light && lit });
  }
  return { TS, COLS, ROWS, CX, CY, HX, HY, RR, GOALX, GHALF, NETD, BOARD, X0, X1, Y0, Y1, panels, panelAt, sd, normalAt, inside, clampBody, inGoalMouth, dots, nearestDot, addScuff, clean, scuffTotal, resetScuff, scuff, melt, buildMap, drawGround, drawBoards, drawNet, quad, dir, goalLineX: side => side === 0 ? CX - GOALX : CX + GOALX, SW, SH };
})();

/* ---- 11-ui.js ---- */
/* ---- GLYPHS + 10-FOOT UI ---- */
const Glyphs = (() => {
  const PS = { '✕': '#7aa7ff', '○': '#ff6b6b', '□': '#ff8ad8', '△': '#4fe3a1' }, XB = { A: '#5fd35f', B: '#ff6b6b', X: '#6aa8ff', Y: '#ffd24a' };
  const XMAP = { '✕': 'A', '○': 'B', '□': 'X', '△': 'Y', L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT' };
  const dev = (I) => { const d = (I || game.input).lastDevice || 'keyboard'; return d === 'touch' ? 'keyboard' : d; };
  function label(I, action, d) { let l = ''; try { l = (I || game.input).label(action, d); } catch (e) { l = '?'; } return String(l || '?'); }
  /** draw a chip; returns its width */
  function chip(g, action, x, y, o = {}) {
    const I = o.input || game.input, d = o.device || dev(I); let l = label(I, action, d); const xbox = S('glyphs') === 'Xbox';
    if (d === 'gamepad') {
      if (xbox && XMAP[l]) l = XMAP[l];
      const sh = /^(L1|R1|L2|R2|LB|RB|LT|RT)$/.test(l), col = PS[l] || XB[l] || '#e8f0ff';
      if (sh) { const w = l.length * 6 + 6; px.rect(g, x, y - 5, w, 10, '#26304a'); px.rect(g, x, y - 5, w, 1, '#8a9ac8'); E.font.text(g, l, x + 3, y - 3, '#ffffff', { outline: false }); return w + 2; }
      px.disc(g, x + 6, y, 6, '#1a2038'); px.disc(g, x + 6, y, 5, '#2c3658'); E.font.text(g, l, x + 6, y - 3, col, { align: 'center', outline: false, shadow: '#000' }); return 14;
    }
    if (d === 'mouse' || /^(Mouse|Click|LMB|RMB|MMB)/i.test(l)) {
      const lit = /0|Left|LMB/.test(l) ? 0 : /2|Right|RMB/.test(l) ? 2 : 1; px.rect(g, x, y - 6, 8, 12, '#d8dce8'); px.rect(g, x, y - 6, 8, 12, '#d8dce8'); px.rect(g, x + 3, y - 6, 1, 5, '#556'); px.rect(g, x + (lit === 0 ? 0 : lit === 2 ? 4 : 3), y - 6, lit === 1 ? 2 : 4, 5, '#ffd36a'); px.rect(g, x, y, 8, 1, '#556'); return 11;
    }
    const w = Math.max(11, E.font.width(l) + 6); px.rect(g, x, y - 6, w, 12, '#aab4d0'); px.rect(g, x + 1, y - 5, w - 2, 9, '#e8edf8'); px.rect(g, x + 1, y + 4, w - 2, 1, '#8a96b8'); E.font.text(g, l, x + w / 2, y - 4, '#1a2038', { align: 'center', outline: false }); return w + 2;
  }
  let _dummy = null; const dummy = () => { if (_dummy === null) { try { _dummy = E.mkCanvas(8, 8).getContext('2d'); } catch (e) { _dummy = false; } } return _dummy; };
  const chipW = (I, action, o) => { const d = dummy(); if (!d) return 16; try { return chip(d, action, 0, 0, Object.assign({}, o, { input: I })); } catch (e) { return 16; } };
  const width = (str, o = {}) => String(str).split(/(\{[a-z]+\})/).reduce((a, p) => a + (!p ? 0 : /^\{[a-z]+\}$/.test(p) ? chipW(o.input, p.slice(1, -1), o) : E.font.width(p, { scale: o.scale || 1 })), 0);
  /** text with {action} tokens; returns width. o.align 'center'|'left' */
  function text(g, str, x, y, o = {}) {
    const parts = String(str).split(/(\{[a-z]+\})/), col = o.color || '#e8f0ff', total = width(str, o);
    let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    for (const p of parts) { if (!p) continue; if (/^\{[a-z]+\}$/.test(p)) cx += chip(g, p.slice(1, -1), cx, y + 3, o); else { E.font.text(g, p, Math.round(cx), y - 3, col, { outline: false, shadow: '#000', scale: o.scale || 1 }); cx += E.font.width(p, { scale: o.scale || 1 }); } }
    return total;
  }
  return { chip, text, dev, width };
})();

const UI = (() => {
  const GOLD = '#ffd36a', ICE = '#e8f4ff', PANEL = ['#141a30', '#0a0e1e'];
  let pt = [0, 0], lastPt = [-9, -9], moved = false;
  function pointer() { try { const p = game.input.pointer(); return p && p.length ? p : null; } catch (e) { return null; } }
  function box(g, x, y, w, h, o = {}) { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: PANEL, border: '#4a5a8a', alpha: .92 }, o)); }
  const txt = (g, s, x, y, c = ICE, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
  const title = (g, s, x, y, scale = 2, cols) => E.font.title(g, s, Math.round(x), Math.round(y), { scale, align: 'center', colors: cols || ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
  /** a grid of big tiles. items: [{label, sub, color, disabled, logo}] */
  class Tiles {
    constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.cols = o.cols || items.length; this.w = o.w || 92; this.h = o.h || 56; this.gap = o.gap || 8; this.y = o.y; this.onPick = o.onPick; this.onCancel = o.onCancel; this.rects = []; this.t = 0; this.input = o.input; }
    update(dt) {
      const I = this.input || game.input; this.t += dt; const n = this.items.length, c = this.cols; let i = this.i;
      if (I.repeat('left', .3, .12) || I.pressed('left')) i = (i % c === 0) ? Math.min(n - 1, i + c - 1) : i - 1; if (I.repeat('right', .3, .12) || I.pressed('right')) i = (i % c === c - 1 || i === n - 1) ? i - (i % c) : i + 1;
      if (I.repeat('up', .3, .12) || I.pressed('up')) i = i - c >= 0 ? i - c : Math.min(n - 1, i + c * Math.floor((n - 1 - (i % c)) / c)); if (I.repeat('down', .3, .12) || I.pressed('down')) i = i + c < n ? i + c : i % c;
      if (i !== this.i) { this.i = i; Synth.sfx('mv'); }
      const p = pointer(), ck = I.clicked && I.clicked();
      if (p && this.rects.length && (Math.abs(p[0] - lastPt[0]) + Math.abs(p[1] - lastPt[1]) > 1)) { lastPt = [p[0], p[1]]; this.rects.forEach((rc, k) => { if (p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3] && !this.items[k].disabled) { if (this.i !== k) { this.i = k; Synth.sfx('mv'); } } }); }
      if (ck) this.rects.forEach((rc, k) => { if (ck[0] >= rc[0] && ck[0] < rc[0] + rc[2] && ck[1] >= rc[1] && ck[1] < rc[1] + rc[3] && !this.items[k].disabled) { this.i = k; this.pick(); } });
      else if (I.pressed('confirm')) this.pick(); else if (I.pressed('cancel') && this.onCancel) { Synth.sfx('back'); this.onCancel(); }
    }
    pick() { const it = this.items[this.i]; if (it.disabled) { Synth.sfx('bonk'); return; } Synth.sfx('ok'); if (it.onPick) it.onPick(it, this.i); else if (this.onPick) this.onPick(it, this.i); }
    draw(g, r) {
      const n = this.items.length, c = this.cols, rows = Math.ceil(n / c), tw = c * this.w + (c - 1) * this.gap, th = rows * this.h + (rows - 1) * this.gap, x0 = (r.W - tw) / 2, y0 = this.y != null ? this.y : (r.H - th) / 2; this.rects = [];
      this.items.forEach((it, k) => {
        const cx = k % c, cy = (k / c) | 0, x = x0 + cx * (this.w + this.gap), y = y0 + cy * (this.h + this.gap), foc = k === this.i, sc = foc ? 1 + Math.sin(this.t * 6) * .01 : 1;
        this.rects.push([x, y, this.w, this.h]); const pad = foc ? 3 : 0;
        box(g, x - pad, y - pad, this.w + pad * 2, this.h + pad * 2, { bg: it.disabled ? ['#1a1a24', '#10101a'] : foc ? ['#2a3a6a', '#141c3c'] : PANEL, border: foc ? GOLD : '#4a5a8a', alpha: .95 });
        if (foc) { const q = (Math.sin(this.t * 8) + 1) / 2; px.rect(g, x - pad - 1, y - pad - 1, this.w + pad * 2 + 2, 1, `rgba(255,211,106,${.4 + q * .5})`); }
        if (it.draw) it.draw(g, x, y, this.w, this.h, foc); else { const sc2 = E.font.width(it.label, { scale: 2 }) <= this.w - 6 ? 2 : 1; txt(g, it.label, x + this.w / 2, y + this.h / 2 - (it.sub ? 10 : 5) + (sc2 === 1 ? 3 : 0), it.disabled ? '#667' : foc ? GOLD : ICE, { align: 'center', scale: sc2 }); if (it.sub) txt(g, it.sub, x + this.w / 2, y + this.h / 2 + 8, '#9ab', { align: 'center' }); }
      });
    }
  }
  /** vertical list with optional sliders: rows [{label, value(), set(d), toggle, action, disabled, reset}] */
  class List {
    constructor(rows, o = {}) { this.rows = rows; this.i = 0; this.o = o; this.rects = []; this.scroll = 0; this.t = 0; this.input = o.input; this.vis = o.vis || 9; }
    update(dt) {
      const I = this.input || game.input, n = this.rows.length; this.t += dt; let i = this.i;
      if (I.repeat('up', .3, .1)) i = (i + n - 1) % n; if (I.repeat('down', .3, .1)) i = (i + 1) % n; if (i !== this.i) { this.i = i; Synth.sfx('mv'); }
      const r = this.rows[this.i]; let d = 0; if (I.repeat('left', .3, .06)) d = -1; if (I.repeat('right', .3, .06)) d = 1;
      if (d) { const big = I.down('turbo') || I.down('Pad6') ? 10 : 1; if (r.adjust) r.adjust(d * (this.hold = Math.min(10, (this.hold || 1) + .1)) * big); else if (r.toggle) { r.toggle(); Synth.sfx('mv'); } } else this.hold = 1;
      if ((I.pressed('lob') || I.pressed('skill')) && r.reset) r.reset();
      if (I.pressed('confirm')) { if (r.action) { Synth.sfx('ok'); r.action(); } else if (r.toggle) { r.toggle(); Synth.sfx('mv'); } }
      const p = pointer(), ck = I.clicked && I.clicked();
      if (p && (Math.abs(p[0] - lastPt[0]) + Math.abs(p[1] - lastPt[1]) > 1)) { lastPt = [p[0], p[1]]; this.rects.forEach(([rc, k]) => { if (p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) this.i = k; }); }
      if (ck) this.rects.forEach(([rc, k]) => { if (ck[0] >= rc[0] && ck[0] < rc[0] + rc[2] && ck[1] >= rc[1] && ck[1] < rc[1] + rc[3]) { this.i = k; const rr = this.rows[k]; if (rr.slider) { const f = clamp((ck[0] - (rc[0] + rc[2] * .5)) / (rc[2] * .45), 0, 1); rr.slider(f); } else if (rr.action) { Synth.sfx('ok'); rr.action(); } else if (rr.toggle) rr.toggle(); } });
      if (this.o.onCancel && I.pressed('cancel')) { Synth.sfx('back'); this.o.onCancel(); }
      if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + this.vis) this.scroll = this.i - this.vis + 1;
      const pd = I.down('Mouse0') && p; if (pd) this.rects.forEach(([rc, k]) => { const rr = this.rows[k]; if (rr.slider && this.i === k && p[0] >= rc[0] + rc[2] * .5 && p[0] <= rc[0] + rc[2] * .95 && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) rr.slider(clamp((p[0] - (rc[0] + rc[2] * .5)) / (rc[2] * .45), 0, 1)); });
    }
    draw(g, x, y, w, rh = 15) {
      this.rects = []; const end = Math.min(this.rows.length, this.scroll + this.vis);
      for (let k = this.scroll; k < end; k++) {
        const r = this.rows[k], yy = y + (k - this.scroll) * (rh + 2), foc = k === this.i; this.rects.push([[x, yy, w, rh], k]);
        box(g, x, yy, w, rh, { bg: foc ? ['#2a3a6a', '#16204a'] : ['#10162a', '#0a0e1c'], border: foc ? GOLD : '#2a3558', alpha: .9, gradient: true });
        txt(g, r.label, x + 6, yy + rh / 2 - 3, r.disabled ? '#667' : foc ? GOLD : ICE);
        if (r.value) { const v = r.value(); if (r.frac) { const f = r.frac(), bx = x + w * .5, bw = w * .32; px.rect(g, bx, yy + rh / 2 - 2, bw, 4, '#0a0e1c'); px.rect(g, bx, yy + rh / 2 - 2, bw * clamp(f, 0, 1), 4, foc ? GOLD : '#6a7aaa'); txt(g, v, x + w - 6, yy + rh / 2 - 3, foc ? '#fff' : '#9ab', { align: 'right' }); } else txt(g, (foc && r.adjust || foc && r.toggle ? '← ' : '') + v + (foc && (r.adjust || r.toggle) ? ' ▸' : ''), x + w - 6, yy + rh / 2 - 3, foc ? '#fff' : '#9ab', { align: 'right' }); }
      }
      if (this.scroll > 0) txt(g, '↑', x + w - 8, y - 8, '#9ab'); if (end < this.rows.length) txt(g, '↓', x + w - 8, y + this.vis * (rh + 2), '#9ab');
    }
  }
  function legend(g, r, parts) { // parts: ['{pass} SELECT', '{deke} BACK']
    let total = 0; const items = parts.map(p => p); const y = r.H - 12; box(g, 0, y - 8, r.W, 20, { bg: ['#0a0e1e', '#05070f'], border: '#1a2038', alpha: .85 });
    let x = 10; for (const p of items) { x += Glyphs.text(g, p, x, y, { color: '#c8d4f0' }) + 14; }
  }
  const banners = []; // {text, t, dur, color, size}
  function banner(text, o = {}) { banners.push(Object.assign({ text, t: 0, dur: 1.6, color: ['#fffbe8', '#ffe08a', '#ffb347'], size: 3, y: .28 }, o)); if (banners.length > 4) banners.shift(); }
  function drawBanners(g, r, dt) { let yo = 0; for (let k = banners.length - 1; k >= 0; k--) { const b = banners[k]; b.t += dt; if (b.t > b.dur) { banners.splice(k, 1); continue; } const u = b.t / b.dur, sc = b.size * (u < .12 ? .5 + u / .12 * .6 : 1.1 - Math.min(.1, (u - .12) * .3)), sh = game.settings.reduceMotion ? 0 : Math.sin(b.t * 50) * (1 - u) * 1.5; const cols = b.color; E.font.title(g, b.text, Math.round(r.W / 2 + sh), Math.round(r.H * b.y + yo), { scale: Math.max(1, Math.round(sc)), align: 'center', colors: cols, depth: 2 }); yo += Math.round(b.size * 10 + 6); } }
  const toasts = [];
  function toast(text, color = GOLD, dur = 3) { toasts.push({ text, t: 0, dur, color }); if (toasts.length > 3) toasts.shift(); }
  function drawToasts(g, r, dt) { let y = 52; for (let k = toasts.length - 1; k >= 0; k--) { const b = toasts[k]; b.t += dt; if (b.t > b.dur) { toasts.splice(k, 1); continue; } const w = E.font.width(b.text) + 16, a = Math.min(1, (b.dur - b.t) * 2, b.t * 4); box(g, r.W / 2 - w / 2, y, w, 14, { border: b.color, alpha: .9 * a }); txt(g, b.text, r.W / 2, y + 4, b.color, { align: 'center' }); y += 17; } }
  return { Tiles, List, box, txt, title, legend, banner, drawBanners, toast, drawToasts, GOLD, ICE, pointer, clearBanners() { banners.length = 0; toasts.length = 0; } };
})();

/* ---- 21-rigs.js ---- */
/* ---- RIGS: skaters, goalies, refs and set-piece people on the engine's Humanoid, with hockey gear drawn over them ---- */
const Rigs = (() => {
  const lum = c => { const h = E.hex(c); return (h[0] * .3 + h[1] * .59 + h[2] * .11); };
  const contrast = c => lum(c) > 130 ? '#141414' : '#ffffff';
  /** hockey skating posture: wraps solvePose to pitch the torso, head and arms forward by rig._lean and drop the hips */
  function leanOverlay(rig) {
    const base = rig.solvePose; if (typeof base !== 'function') return;
    rig.solvePose = function () { base.call(this); const k = this._lean || 0, J = this.J, sk = this._skid || 0; if (J && sk) { for (const n of ['shC', 'shL', 'shR', 'head', 'handL', 'handR', 'elbowL', 'elbowR']) { const q = J[n]; if (q) { const h = clamp(q[2] / 30, 0, 1.4); q[1] += sk * h * 6; } } for (const n of ['footL', 'footR']) { const q = J[n]; if (q) q[1] -= sk * 3; } } if (!k || !J) return; for (const n of ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) { const q = J[n]; if (q) { const h = clamp(q[2] / 30, 0, 1.4); q[0] += k * h * 7; q[2] -= k * h * 1.6; } } };
  }
  function skater(def, side, team, away, retro) {
    const [name, nick, num, role, rt, hand, bulky, hair, hairC, skin] = def, k = away ? team.away : team.home;
    const rig = new E.Humanoid({ size: bulky ? 1.28 : 1.18, build: bulky ? 'bulky' : 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', hair, armor: true, style: retro ? 'classic' : 'hd',
      hat: { style: 'helmet', color: k.trim === '#141414' ? '#2a2a2a' : k.trim },
      colors: { skin, hair: hairC, cloth: k.cloth, pants: k.pants, boot: '#1c1c20', belt: k.trim, trim: k.trim, glove: k.trim, plate: k.cloth, metal: k.trim } });
    leanOverlay(rig);
    return rig;
  }
  function goalie(def, team, away) {
    const k = away ? team.away : team.home;
    const rg = new E.Humanoid({ size: 1.34, build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'short', armor: true, hat: { style: 'helmet', color: team.mask },
      colors: { skin: '#e0b090', hair: '#3a2a1a', cloth: k.cloth, pants: k.pants, boot: team.pads, belt: k.trim, trim: k.trim, glove: team.pads, plate: team.pads, metal: team.mask } });
    const base = rg.solvePose; if (typeof base === 'function') rg.solvePose = function () { base.call(this); const f = this._flare || 0, J = this.J; if (!f || !J) return; for (const [n, sd] of [['footL', -1], ['footR', 1], ['kneeL', -1], ['kneeR', 1]]) { const q = J[n]; if (q) q[1] += sd * f * (n.startsWith('foot') ? 7 : 4); } };
    return rg;
  }
  const ref = () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'short', hat: { style: 'helmet', color: '#141414' }, colors: { skin: '#e0b090', hair: '#222', cloth: '#f2f2f2', pants: '#141414', boot: '#141414', trim: '#f08a1a', belt: '#141414', glove: '#141414' } });
  const person = (o) => new E.Humanoid(Object.assign({ size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short' }, o));
  const PEOPLE = {
    marge: () => person({ outfit: 'coat', hair: 'long', sleeves: 'long', colors: { skin: '#e8c4a0', hair: '#b8b8c0', cloth: '#7a5a8a', coat: '#7a5a8a', pants: '#3a3a4a', boot: '#2a2a2a' }, face: { eyes: 'big' } }),
    dunny: () => skater(TEAM.muskrats.skaters[0], 0, TEAM.muskrats, false), snipes: () => skater(TEAM.muskrats.skaters[1], 0, TEAM.muskrats, false), lou: () => skater(TEAM.muskrats.skaters[2], 0, TEAM.muskrats, false), lemmy: () => goalie(TEAM.muskrats.goalie, TEAM.muskrats, false),
    glitterman: () => person({ outfit: 'coat', hair: 'spiky', hat: null, colors: { skin: '#f0c8a0', hair: '#e8d080', cloth: '#ffd36a', coat: '#ffd36a', pants: '#2a2a2a', boot: '#1a1a1a' } }),
    chuck: () => person({ outfit: 'coat', hair: 'short', colors: { skin: '#e8c0a0', hair: '#3a2a1a', cloth: '#2a3a6a', coat: '#2a3a6a', pants: '#2a3a6a', boot: '#1a1a1a' } }),
    moose: () => person({ outfit: 'coat', hair: 'bald', build: 'bulky', colors: { skin: '#d8a880', hair: '#222', cloth: '#6a2a2a', coat: '#6a2a2a', pants: '#2a2a2a', boot: '#1a1a1a' } }),
    gus: () => person({ outfit: 'tunic', hair: 'bald', hat: 'cap', hunch: .3, colors: { skin: '#d8b090', hair: '#ddd', cloth: '#4a6a3a', pants: '#3a3a2a', boot: '#2a2a2a' } }),
    doris: () => person({ outfit: 'robe', hair: 'long', colors: { skin: '#e8c4a0', hair: '#7a9ac8', cloth: '#a04a8a', pants: '#a04a8a', boot: '#2a2a2a' } }),
    pete: () => person({ build: 'bulky', size: 1.5, outfit: 'shirt', hair: 'bald', hat: { style: 'cap', color: '#ffffff' }, colors: { skin: '#f4f4f4', cloth: '#f4f4f4', pants: '#f4f4f4', boot: '#c8d8f0', hair: '#fff' } }),
    sterling: () => skater(TEAM.grizzlies.skaters[0], 1, TEAM.grizzlies, false), vault: () => goalie(TEAM.grizzlies.goalie, TEAM.grizzlies, false)
  };
  const VOICE_OF = { MARGE: 'marge', DUNNY: 'dunny', SNIPES: 'snipes', LOU: 'lou', LEMMY: 'lemmy', GLITTERMAN: 'glitter', CHUCK: 'chuck', MOOSE: 'moose', GUS: 'gus', STERLING: 'glitter', CHAD: 'glitter', ROCCO: 'big', ROLLO: 'big', 'BIG TIMBER': 'big', 'THE VAULT': 'lou', 'POLAR PETE': 'gen', DORIS: 'gen' };
  const PORTRAIT_OF = { MARGE: 'marge', DUNNY: 'dunny', SNIPES: 'snipes', LOU: 'lou', LEMMY: 'lemmy', GLITTERMAN: 'glitterman', CHUCK: 'chuck', MOOSE: 'moose', GUS: 'gus', STERLING: 'sterling', 'THE VAULT': 'vault', 'POLAR PETE': 'pete', DORIS: 'doris' };
  const cache = {};
  const portrait = (name) => { const k = PORTRAIT_OF[name]; if (!k) { const t = ['drillers', 'lumberjacks', 'bruisers', 'marauders'][name === 'BIG TIMBER' ? 1 : name === 'ROCCO' || name === 'ROLLO' ? 2 : name === 'CHAD' ? 3 : 0]; return cache[name] || (cache[name] = skater(TEAM[t].skaters[0], 1, TEAM[t], false)); } return cache[k] || (cache[k] = PEOPLE[k]()); };
  // --- drawing ---
  function stickPoint(s) { const c = Math.cos(s.heading), sn = Math.sin(s.heading), h = s.def ? s.def[5] : 1; return [s.x + c * 11 - sn * h * 4, s.y + sn * 11 + c * h * 4]; }
  function drawSkater(r, s, view, opts = {}) {
    const rig = s.rig, show = !opts.hide;
    r.shadow(s.x, s.y, s.big ? 8 : 6.5, .38);
    r.actor(s.x, s.y, s.z, (g, ox, oy) => {
      if (s.glow) r.glowDisc(g, Math.round(ox), Math.round(oy - 12), 16, s.glow, .5);
      rig.draw(g, ox, oy, view);
      const [bx, by] = r.w(s.x, s.y, s.z), rel = (dx, dy, dz) => { const [qx, qy] = r.w(s.x + dx, s.y + dy, s.z + dz); return [Math.round(ox + qx - bx), Math.round(oy + qy - by)]; };
      const J = rig.J; if (!J) return;
      // stick: shaft from the hand to the blade heel, blade along the heading
      if (!s.noStick) {
        const hp = rig.worldOffset(J.handR || J.handL), sp = stickPoint(s), c = Math.cos(s.heading), sn = Math.sin(s.heading);
        const a = rel(hp[0], hp[1], hp[2]), b = rel(sp[0] - s.x, sp[1] - s.y, 0.6), t = rel(sp[0] - s.x + c * 6, sp[1] - s.y + sn * 6, 0.6);
        const shaft = s.items && s.items.lumber ? '#ffd020' : '#caa468';
        px.line(g, a[0], a[1], b[0], b[1], shaft, 1); px.line(g, b[0], b[1], t[0], t[1], '#2a2a2a', 1); px.dot(g, t[0], t[1], '#ffffff');
        if (s.swing > 0) px.line(g, b[0], b[1], b[0] + Math.round(c * 4), b[1] - 3, '#ffffff', 1);
      }
      // skate blades
      for (const f of [J.footL, J.footR]) { if (!f) continue; const fp = rig.worldOffset(f), p = rel(fp[0], fp[1], fp[2] - 1); px.rect(g, p[0] - 2, p[1] + 1, 5, 1, '#c8d8e8'); }
      // number on the back (facing away) or chest
      if (s.num != null && J.shC) { const sp = rig.worldOffset(J.hipC), hp = rig.worldOffset(J.shC), p = rel((sp[0] + hp[0]) / 2, (sp[1] + hp[1]) / 2, (sp[2] + hp[2]) / 2 - 1); const col = contrast(s.jersey || '#888'); E.font.text(g, String(s.num), p[0], p[1] - 3, col, { align: 'center', font: 'tiny', outline: false }); }
      if (s.hood) { const hp = rig.worldOffset(J.head), p = rel(hp[0], hp[1], hp[2]); px.disc(g, p[0], p[1], 4, s.jersey || '#888'); }
      if (s.state === 'frozen') { const p = rel(0, 0, 14); px.blend(g, .45, 'normal', () => px.rect(g, p[0] - 7, p[1] - 17, 14, 34, '#9fd8ff')); }
      if (s.state === 'buried') { const p = rel(0, 0, 8); px.rect(g, p[0] - 9, p[1] - 4, 18, 8, '#f4f8ff'); }
    }, opts.fx);
  }
  function drawGoalie(r, g_, view, k = 1) {
    const rig = g_.rig;
    r.shadow(g_.x, g_.y, 8, .4);
    r.actor(g_.x, g_.y, g_.z || 0, (g, ox, oy) => {
      rig.draw(g, ox, oy, view);
      const [bx, by] = r.w(g_.x, g_.y, g_.z || 0), rel = (dx, dy, dz) => { const [qx, qy] = r.w(g_.x + dx, g_.y + dy, (g_.z || 0) + dz); return [Math.round(ox + qx - bx), Math.round(oy + qy - by)]; };
      const J = rig.J; if (!J) return;
      const pads = g_.def.padCol;
      for (const [kn, ft] of [[J.kneeL, J.footL], [J.kneeR, J.footR]]) { if (!kn || !ft) continue; const a = rig.worldOffset(kn), b = rig.worldOffset(ft), pa = rel(a[0], a[1], a[2] + 2), pb = rel(b[0], b[1], b[2]); px.poly(g, [[pa[0] - 4, pa[1]], [pa[0] + 4, pa[1]], [pb[0] + 4, pb[1] + 1], [pb[0] - 4, pb[1] + 1]], pads); px.line(g, pa[0], pa[1], pb[0], pb[1], '#00000055', 1); }
      const hl = rig.worldOffset(J.handL), hr = rig.worldOffset(J.handR), pl = rel(hl[0], hl[1], hl[2]), pr = rel(hr[0], hr[1], hr[2]);
      px.disc(g, pl[0], pl[1], 3, pads); px.rect(g, pr[0] - 2, pr[1] - 3, 5, 6, '#2a2a2a'); px.rect(g, pr[0] - 2, pr[1] - 3, 5, 1, pads);
      const sp = rel(Math.cos(g_.heading) * 8, Math.sin(g_.heading) * 8, 1); px.line(g, pr[0], pr[1], sp[0], sp[1], '#caa468', 1); px.rect(g, sp[0] - 3, sp[1], 7, 1, '#caa468');
      const hp = rig.worldOffset(J.head), ph = rel(hp[0], hp[1], hp[2]); for (let i = -2; i <= 2; i++) px.line(g, ph[0] + i * 2, ph[1] - 3, ph[0] + i * 2, ph[1] + 4, '#2a2a2acc', 1);
      if (g_.num != null && J.shC) { const p = rel(0, 0, 18); E.font.text(g, String(g_.num), p[0], p[1] - 3, contrast(g_.jersey || '#888'), { align: 'center', font: 'tiny', outline: false }); }
    });
  }
  const prc = {};
  const pr = (s) => { const k = (s.kind || 's') + s.side + (s.nick || ''); if (!prc[k]) { prc[k] = s.kind === 'g' ? goalie(TEAM[s.team.id].goalie, s.team, s.side === 1) : skater(s.def, s.side, s.team, s.side === 1, false); prc[k].update(1 / 60, { x: 0, y: 0, z: 0, facing: PI / 2 }); } return prc[k]; };
  const face = (g, rig, x, y, size, o) => { const f = rig.facing, sp = rig.spin; rig.facing = PI / 2; rig.spin = 0; try { rig.drawPortrait(g, x, y, size, o || {}); } finally { rig.facing = f; rig.spin = sp; } };
  return { pr, face, skater, goalie, ref, person, PEOPLE, VOICE_OF, portrait, stickPoint, drawSkater, drawGoalie, contrast };
})();

/* ---- 22-skater.js ---- */
/* ---- SKATING: the pure step (the network prediction runs it too) ---- */
const Skating = (() => {
  const mult = (s) => ({ spd: .85 + .05 * s.rt.spd, hit: .8 + .067 * s.rt.hit });
  /** st: { x,y,vx,vy,heading,state,st,turbo,rt,hasPuck,winding,tactic } intent: { mx,my,turbo } returns events array of strings */
  function skateStep(s, it, dt, extra = {}) {
    const ev = [];
    let vmax = T.skateMax * (.85 + .05 * s.rt.spd);
    const wantTurbo = it.turbo && s.turbo > 0 && (Math.hypot(it.mx, it.my) > .2 || Math.hypot(s.vx, s.vy) > 40);
    const free = extra.infiniteTurbo;
    if (wantTurbo) { vmax *= T.turboMul; if (!free) s.turbo = Math.max(0, s.turbo - T.turboDrain * dt); s.turboIdle = 0; s.turboOn = true; }
    else { s.turboOn = false; s.turboIdle = (s.turboIdle || 0) + dt; if (s.turboIdle > .6) s.turbo = Math.min(1, s.turbo + T.turboRegen * dt); }
    if (free) s.turbo = 1;
    if (s.hasPuck) vmax *= .94; if (s.winding) vmax *= .6; if (extra.speedMul) vmax *= extra.speedMul;
    let sp = Math.hypot(s.vx, s.vy), hd = sp > 8 ? Math.atan2(s.vy, s.vx) : s.heading;
    const mlen = Math.min(1, Math.hypot(it.mx, it.my));
    if (s.state === 'stop') {
      const dec = T.stopDecel * dt; sp = Math.max(0, sp - dec); s.vx = Math.cos(hd) * sp; s.vy = Math.sin(hd) * sp;
      s.stopT -= dt; if (s.stopT <= 0 || sp < 20) { s.state = 'skate'; s.st = 0; }
      return ev;
    }
    if (mlen > .15) {
      const ta = Math.atan2(it.my, it.mx), diff = U.angDiff(hd, ta);
      if (sp > 60 && Math.abs(diff) > 2.1 && !extra.noStop) { s.state = 'stop'; s.stopT = .22; s.stopDir = ta; ev.push('stop'); return ev; }
      if (sp < 22) { s.vx += it.mx * T.skateAccel * dt * 1.2; s.vy += it.my * T.skateAccel * dt * 1.2; }
      else {
        const rate = lerp(T.turnSlow, T.turnFast, clamp(sp / vmax, 0, 1)) * (extra.turnMul || 1);
        hd += clamp(diff, -rate * dt, rate * dt);
        const acc = T.skateAccel * (1 - .6 * (sp / vmax) ** 2) * mlen * dt;
        sp = sp > vmax ? Math.max(vmax, sp - 200 * dt) : Math.min(vmax, sp + acc);
        s.vx = Math.cos(hd) * sp; s.vy = Math.sin(hd) * sp;
      }
    } else { sp = Math.max(0, sp - T.iceGlide * dt); if (sp > 0) { s.vx = Math.cos(hd) * sp; s.vy = Math.sin(hd) * sp; } else { s.vx = 0; s.vy = 0; } }
    const sp2 = Math.hypot(s.vx, s.vy); if (sp2 > vmax * 1.02 && sp2 > 8 && mlen > .15) { const k = Math.max(vmax, sp2 - 400 * dt) / sp2; s.vx *= k; s.vy *= k; }
    if (sp2 > 10) { const th = Math.atan2(s.vy, s.vx); s.heading += clamp(U.angDiff(s.heading, th), -9 * dt, 9 * dt); }
    else if (mlen > .15) { const th = Math.atan2(it.my, it.mx); s.heading += clamp(U.angDiff(s.heading, th), -9 * dt, 9 * dt); }
    return ev;
  }
  return { skateStep, mult };
})();

/* ---- 23-sim.js ---- */
/* ---- SIM: match state, entity factories and shared helpers ---- */
const Sim = (() => {
  const S_ = { m: null };
  const blank = () => ({ mx: 0, my: 0, aim: null, turbo: false, shootHeld: false, lobHeld: false, press: { pass: 0, shoot: 0, deke: 0, lob: 0, chirp: 0, switch: 0 }, shootUp: false });
  function mkSkater(m, side, slot, team, away) {
    const def = team.skaters[slot], [name, nick, num, role, rt, hand, bulky] = def;
    const jersey = (away ? team.away : team.home).cloth;
    const s = { id: side * 10 + slot, kind: 's', side, slot, def, team, name, nick, num, role, hand: hand ? 1 : -1, bulky: !!bulky, big: !!bulky,
      rt: { spd: rt[0], sht: rt[1], pas: rt[2], hit: rt[3], fgt: rt[4], hnd: rt[5] }, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, heading: side ? PI : 0, state: 'skate', st: 0, turbo: 1, turboIdle: 0, hasPuck: false,
      ctrl: { kind: 'cpu', input: null, seat: null }, intent: blank(), items: {}, grudge: {}, stats: { goals: 0, assists: 0, shots: 0, hits: 0, bigHits: 0, takeaways: 0, fights: 0, fightsWon: 0, topShot: 0, hat: 0 },
      rig: Rigs.skater(def, side, team, away, game.settings && S('retro') === 'On'), jersey, mass: bulky ? 1.35 : 1, pickCool: 0, cd: { deke: 0, chirp: 0, check: 0, poke: 0 }, holdShoot: 0, holdLob: 0, winding: false, charge: 0, lastTouchT: 0,
      aiT: 0, aiGoal: null, aiRole: '', recvT: 0, oneTimerT: 0, callT: 0, swing: 0, flipT: 0, bin: 0, rigState: null, spin: 0, slide: 0, hitBy: null, hitT: 0, skill: .55 };
    return s;
  }
  function mkGoalie(m, side, team, away) {
    const d = team.goalie, [name, nick, num, rt, voice, trait] = d, k = away ? team.away : team.home;
    return { id: 'g' + side, kind: 'g', side, team, name, nick, num, trait, rfx: rt[0], size: rt[1], reb: rt[2], def: { padCol: team.pads }, x: 0, y: 0, z: 0, heading: side ? PI : 0, state: 'ready', st: 0, save: null, react: 0, target: 0, jersey: k.cloth,
      rig: Rigs.goalie(d, team, away), saves: 0, shots: 0, blastT: 0, itemBig: 0, boss: team.id === 'grizzlies', bossCracked: false, kaboomHits: 0, vy: 0, pending: null, hand: 1, bulge: 0 };
  }
  const attackDir = (m, s) => m.end[s] === 0 ? 1 : -1;
  const ownGoalX = (m, s) => Rink.goalLineX(m.end[s]);
  const oppGoalX = (m, s) => Rink.goalLineX(m.end[1 - s]);
  const teamOf = (m, side) => m.sk.filter(s => s.side === side);
  const emit = (type, d) => Bus.emit(type, d || {});
  function addBoom(m, side, amt, why) {
    if (m.cfg.noBoom || m.kaboom[side] > 0 || m.phaseNoPlay) return;
    let a = amt * T.boomGain * (m.tactic[side] === 'grit' ? 1.15 : 1);
    m.boom[side] = Math.min(100, m.boom[side] + a);
    if (m.boom[side] >= 100) startKaboom(m, side);
  }
  function startKaboom(m, side) {
    m.boom[side] = 0; m.kaboom[side] = T.kaboomTime; m.stats.kabooms[side]++;
    emit('kaboom_start', { side, gilded: m.cfg.story && m.cfg.story.id === 5 && side === 1 });
  }
  const mkRef = () => ({ kind: 'r', x: Rink.CX, y: Rink.CY - 14, z: 0, vx: 0, vy: 0, heading: 0, rig: Rigs.ref(), down: 0 });
  return { S_, blank, mkSkater, mkGoalie, attackDir, ownGoalX, oppGoalX, teamOf, emit, addBoom, startKaboom, mkRef, get m() { return S_.m; } };
})();

/* ---- 24-puck.js ---- */
/* ---- PUCK + GOALIES ---- */
const Puck = (() => {
  const R = 1.6;
  const mk = () => ({ x: Rink.CX, y: Rink.CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, prev: null, inNet: -1, out: false, fire: false, shotBy: null, shotType: '', shotSpeed: 0, onGoal: false, passTo: null, passT: 0, age: 0, touches: [], bulge: [0, 0], frozen: false });
  const blade = s => Rigs.stickPoint(s);
  function release(m, s) { if (!s) return; s.hasPuck = false; s.pickCool = .25; if (m.puck.owner === s) m.puck.owner = null; }
  function take(m, s) {
    const p = m.puck; if (p.owner) { p.owner.hasPuck = false; }
    const wasPass = p.passTo === s; p.owner = s; s.hasPuck = true; p.vx = s.vx; p.vy = s.vy; p.vz = 0; p.z = 0;
    if (p.last && p.last !== s) { p.prev = p.last; }
    if (p.last && p.last.side !== s.side) { s.stats.takeaways++; Sim.emit('takeaway', { s }); }
    else if (wasPass && p.last && p.last.side === s.side) { Sim.addBoom(m, s.side, 2); Sim.emit('pass_complete', { s, from: p.last }); m.stats.passes[s.side]++; }
    p.last = s; p.passTo = null; p.onGoal = false; p.fire = false;
    const t = p.touches; if (!t.length || t[t.length - 1] !== s) { t.push(s); if (t.length > 4) t.shift(); }
    s.touchT = m.t; s.recvT = 0; p.passT = 0;
    if (s.oneTimerT > 0) { s.oneTimerT = 0; shoot(m, s, 'onetimer', .85, null); }
  }
  function pass(m, s, tx, ty, mate, saucer) {
    const p = m.puck; if (p.owner !== s) return false;
    const d0 = Math.hypot(tx - s.x, ty - s.y); let spd = clamp(220 + .9 * d0, T.passMin, T.passMax) * (.9 + .033 * s.rt.pas) * (saucer ? .8 : 1);
    let ax = tx, ay = ty;
    if (mate) { for (let i = 0; i < 2; i++) { const tf = Math.hypot(ax - s.x, ay - s.y) / spd; ax = mate.x + mate.vx * tf * .9; ay = mate.y + mate.vy * tf * .9; } ax = clamp(ax, Rink.X0 + 20, Rink.X1 - 20); ay = clamp(ay, Rink.Y0 + 14, Rink.Y1 - 14); }
    let a = Math.atan2(ay - s.y, ax - s.x) + (RNG.sim() - .5) * 2 * .06 * (1.3 - .1 * s.rt.pas);
    release(m, s); const bp = blade(s); p.x = bp[0]; p.y = bp[1]; p.z = 0;
    if (saucer) { const d = Math.hypot(ax - s.x, ay - s.y), tf = d / (spd * .85); p.vx = Math.cos(a) * d / tf; p.vy = Math.sin(a) * d / tf; p.vz = 700 * tf / 2 + 0; p.vz = (T.saucerApex > 0 ? Math.sqrt(2 * 700 * T.saucerApex) : 120); p.vx = Math.cos(a) * d / (2 * p.vz / 700); p.vy = Math.sin(a) * d / (2 * p.vz / 700); }
    else { p.vx = Math.cos(a) * spd; p.vy = Math.sin(a) * spd; p.vz = 0; }
    p.last = s; p.passTo = mate || null; p.passT = 2; p.saucer = !!saucer; s.state = 'pass'; s.st = .25; s.swing = .2; s.heading = a;
    if (mate) { mate.recvT = 1.2; }
    Sim.emit('pass', { s, mate, saucer }); return true;
  }
  function shoot(m, s, type, charge, aim) {
    const p = m.puck; if (p.owner !== s) return false;
    const sht = s.rt.sht, mulS = .85 + .05 * sht, kab = m.kaboom[s.side] > 0 && charge >= .95 && type === 'slap';
    let spd, sig, lift;
    const lum = s.items.lumber > 0;
    if (type === 'wrist') { spd = T.wristSpeed * mulS; sig = 5 * (1.3 - .1 * sht); lift = 2 + RNG.sim() * 8; }
    else if (type === 'onetimer') { spd = (T.slapBase + T.slapGain * .85) * mulS * T.oneTimerBonus; sig = 7 * (1.3 - .1 * sht) * .5; lift = 3 + RNG.sim() * 8; }
    else { spd = (T.slapBase + T.slapGain * charge) * mulS; sig = 7 * (1.3 - .1 * sht) * (1.4 - .4 * charge); lift = 4 + RNG.sim() * 14; }
    if (s.turboOn) spd *= 1.12; if (lum) { spd *= 1.3; sig = 0; s.lumberShots--; if (s.lumberShots <= 0) s.items.lumber = 0; }
    if (m.cfg.drill === 3) sig *= .25;
    if (kab) { spd = 760; sig = 0; type = 'kaboom'; }
    spd = Math.min(spd, 760);
    // aim point
    const gx = Sim.oppGoalX(m, s.side), gdir = Sim.attackDir(m, s.side), gy = Rink.CY, gk = m.gl[1 - s.side];
    let tx = gx + gdir * 6, ty;
    if (aim && aim.x != null) { // line through the aim hits the goal plane
      const dx = aim.x - s.x, dy = aim.y - s.y; if (dx * gdir > 8) { const t = (gx - s.x) / dx; ty = clamp(s.y + dy * t, gy - 13, gy + 13); } else ty = null;
      if (ty == null && aim.far != null) ty = gy + aim.far * 12;
    } else if (aim && aim.far != null) ty = gy + aim.far * 12;
    if (ty == null) { const open = gk.y > gy ? -1 : 1; ty = gy + open * 9 + (RNG.sim() - .5) * 4; if (Math.abs(s.y - gy) > 70) ty = gy + (s.y > gy ? -1 : 1) * 8; }
    const a0 = Math.atan2(ty - s.y, tx - s.x), a = a0 + (RNG.sim() - .5) * 2 * sig * PI / 180;
    release(m, s); const bp = blade(s); p.x = bp[0]; p.y = bp[1]; p.z = 0;
    p.vx = Math.cos(a) * spd; p.vy = Math.sin(a) * spd;
    const top = type === 'slap' && gk.state !== 'ready' && gk.state !== 'shuffle' && charge > .6;
    const dist = Math.max(8, Math.hypot(tx - s.x, ty - s.y)), tt = dist / spd, zt = kab ? 8 : top ? 14 + RNG.sim() * 3 : lift;
    p.vz = kab ? 0 : clamp((zt + 350 * tt * tt) / tt, 0, 230) * (dist < 30 ? .4 : 1);
    p.twister = !!(s.def[1] === 'STERLING' && s.plan && s.plan.twister);
    p.last = s; p.passTo = null; p.shotBy = s; p.shotType = type; p.shotSpeed = spd; p.fire = kab; p.onGoal = Math.abs(ty - gy) < Rink.GHALF + 1; p.shotT = m.t;
    s.state = 'shoot'; s.st = .3; s.swing = .3; s.heading = a0; s.stats.shots++; m.stats.shots[s.side]++; s.stats.topShot = Math.max(s.stats.topShot, spd);
    if (p.onGoal) { m.stats.sog[s.side]++; Sim.addBoom(m, s.side, 4); Bus.emit('shot_on_goal', { s, kind: type }); }
    Sim.emit('shot', { s, kind: type, spd, kab, aim0: a0 }); return true;
  }
  function netConfine(m, p, e) { // keep a scored puck in the net box
    const gx = Rink.goalLineX(e), d = e === 0 ? -1 : 1, bx = gx + d * Rink.NETD;
    const lo = Math.min(gx, bx) + R, hi = Math.max(gx, bx) - R;
    if (p.x < lo) { p.x = lo; p.vx = Math.abs(p.vx) * .2; } if (p.x > hi) { p.x = hi; p.vx = -Math.abs(p.vx) * .2; }
    p.y = clamp(p.y, Rink.CY - Rink.GHALF + R, Rink.CY + Rink.GHALF - R); p.vy *= .5;
  }
  function step(m, dt) {
    const p = m.puck; p.age += dt; p.passT = Math.max(0, p.passT - dt);
    p.bulge[0] = Math.max(0, p.bulge[0] - dt * 14); p.bulge[1] = Math.max(0, p.bulge[1] - dt * 14);
    if (p.frozen) return;
    if (p.owner) {
      const o = p.owner, bp = blade(o), k = Math.min(1, 30 * dt), sp = Math.hypot(o.vx, o.vy), weave = sp < 80 ? Math.sin(m.t * 9) * 3 * (1 - sp / 80) : 0;
      const side = [-Math.sin(o.heading) * weave, Math.cos(o.heading) * weave];
      p.x += (bp[0] + side[0] - p.x) * k; p.y += (bp[1] + side[1] - p.y) * k; p.z = 0; p.vx = o.vx; p.vy = o.vy; p.vz = 0;
      if (p.inNet >= 0) p.inNet = -1;
      return;
    }
    const N = 4, h = dt / N;
    for (let i = 0; i < N; i++) {
      const px_ = p.x, py_ = p.y; let sp = Math.hypot(p.vx, p.vy);
      if (p.z <= .01 && p.vz <= 0) { const f = (T.puckFriction + T.puckDrag * sp) * h; sp = Math.max(0, sp - f); const k = sp / (Math.hypot(p.vx, p.vy) || 1); p.vx *= k; p.vy *= k; }
      if (p.z > 0 || p.vz > 0) { p.vz -= 700 * h; p.z += p.vz * h; if (p.z <= 0) { p.z = 0; if (p.vz < -60) { p.vx *= .9; p.vy *= .9; Sim.emit('puck_land', {}); } p.vz = Math.abs(p.vz) > 40 ? -p.vz * .3 : 0; } }
      sp = Math.hypot(p.vx, p.vy); if (sp > 760) { p.vx *= 760 / sp; p.vy *= 760 / sp; }
      p.x += p.vx * h; p.y += p.vy * h;
      if (p.inNet >= 0) { netConfine(m, p, p.inNet); continue; }
      // goal / posts / net walls
      for (const e of [0, 1]) {
        const gx = Rink.goalLineX(e), d = e === 0 ? -1 : 1, bx = gx + d * Rink.NETD;
        const crossed = (px_ - gx) * d <= 0 && (p.x - gx) * d > 0;
        if (crossed) {
          const t = (gx - px_) / ((p.x - px_) || 1), yy = py_ + (p.y - py_) * t, zz = p.z;
          if (Math.abs(yy - Rink.CY) < Rink.GHALF - R * .6 && zz < 20 - R) { p.inNet = e; p.bulge[e] = 6; Sim.emit('goal_line', { end: e }); const defSide = m.end[0] === e ? 0 : 1; m.goalPending = { side: 1 - defSide, shooter: p.shotBy, fire: p.fire, type: p.shotType, spd: p.shotSpeed }; p.x = gx + d * 1; p.vx *= .3; p.vy *= .3; continue; }
          if (Math.abs(yy - Rink.CY) < Rink.GHALF + 2 && zz >= 18 && zz < 23) { p.vz = -Math.abs(p.vz) * .8; p.z = 18; p.vx = -p.vx * .8; p.x = gx - d * 1; Sim.emit('post', { bar: true, spd: sp }); }
        }
        for (const sy of [-1, 1]) { const pxx = gx, pyy = Rink.CY + sy * Rink.GHALF, dd = Math.hypot(p.x - pxx, p.y - pyy); if (dd < 1.5 + R && p.z < 21) { const nx = (p.x - pxx) / (dd || 1), ny = (p.y - pyy) / (dd || 1), vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= 1.82 * vn * nx; p.vy -= 1.82 * vn * ny; p.x = pxx + nx * (1.5 + R + .1); p.y = pyy + ny * (1.5 + R + .1); if (Math.hypot(p.vx, p.vy) > 70) Sim.emit('post', { spd: sp, shot: p.shotBy && p.last === p.shotBy }); } } }
        // net side/back walls (from outside)
        if (Math.min(gx, bx) - R < p.x && p.x < Math.max(gx, bx) + R && Math.abs(p.y - Rink.CY) < Rink.GHALF + R) {
          const inside = Math.abs(p.y - Rink.CY) < Rink.GHALF - R && (p.x - gx) * d > 0;
          if (!inside && p.z < 20) { // hit net side
            if (Math.abs(py_ - Rink.CY) >= Rink.GHALF) { p.y = Rink.CY + Math.sign(py_ - Rink.CY) * (Rink.GHALF + R); p.vy = -p.vy * .2; p.vx *= .8; Sim.emit('net_touch', {}); }
            else if ((px_ - bx) * d >= 0) { p.x = bx + d * R; p.vx = -p.vx * .2; Sim.emit('net_touch', {}); }
          }
        }
      }
      // boards and glass
      const dB = Rink.sd(p.x, p.y);
      if (dB > -R) {
        const n = Rink.normalAt(p.x, p.y), vn = p.vx * n[0] + p.vy * n[1];
        if (p.z < Rink.BOARD) { if (vn > 0) { const vt = [p.vx - vn * n[0], p.vy - vn * n[1]]; p.vx = vt[0] * .92 - vn * T.boardBounce * n[0]; p.vy = vt[1] * .92 - vn * T.boardBounce * n[1]; if (vn > 100) Sim.emit('boards', { vn, x: p.x, y: p.y }); } p.x -= n[0] * (dB + R); p.y -= n[1] * (dB + R); }
        else {
          const pn = Rink.panelAt(p.x, p.y), gh = Rink.BOARD + (Math.abs(n[0]) > .5 ? 40 : 28);
          if (pn.st === 2 || p.z >= gh) { p.out = true; Sim.emit('puck_out', { glass: pn.st === 2 }); }
          else { if (vn > 0) { const vt = [p.vx - vn * n[0], p.vy - vn * n[1]]; p.vx = vt[0] * .9 - vn * .5 * n[0]; p.vy = vt[1] * .9 - vn * .5 * n[1]; if (vn > 80) Sim.emit('glass_ping', { vn }); } p.x -= n[0] * (dB + R); p.y -= n[1] * (dB + R); }
        }
      }
      // goalies and bodies
      for (const g of m.gl) Goalie.puckCheck(m, g, px_, py_);
      if (p.z < 12) for (const s of m.sk) {
        if (s.state === 'bin' || s.state === 'frozen' || s.state === 'buried' || s.hasPuck) continue;
        const dd = Math.hypot(p.x - s.x, p.y - s.y), sp2 = Math.hypot(p.vx, p.vy);
        if (dd < 7 + R && sp2 > 120 && !(p.last === s && p.age < .3) && (p.shotBy ? p.shotBy.side !== s.side : true) && !(p.passTo === s)) {
          const nx = (p.x - s.x) / (dd || 1), ny = (p.y - s.y) / (dd || 1), vn = p.vx * nx + p.vy * ny;
          if (vn < 0) { p.vx -= 1.35 * vn * nx; p.vy -= 1.35 * vn * ny; p.x = s.x + nx * (7 + R + .1); p.y = s.y + ny * (7 + R + .1);
            if (p.shotBy && p.shotBy.side !== s.side && sp2 > 150) { Sim.emit('block', { s, shooter: p.shotBy }); p.shotBy = null; p.onGoal = false; } else Sim.emit('body_hit', {}); }
        }
      }
      if (p.out) break;
    }
    pickups(m, dt);
  }
  function eligible(s) { return s.pickCool <= 0 && !['down', 'getup', 'stun', 'bin', 'frozen', 'buried', 'slip', 'celebrate', 'fight', 'wind'].includes(s.state); }
  function pickups(m, dt) {
    const p = m.puck; if (p.z > 6 || p.inNet >= 0 || m.noPickup) return;
    const cands = [];
    for (const s of m.sk) {
      if (!eligible(s)) continue;
      const bp = blade(s), db = Math.hypot(p.x - bp[0], p.y - bp[1]), dc = Math.hypot(p.x - s.x, p.y - s.y);
      const rad = T.pickupRadius * (.85 + .05 * s.rt.hnd) * (s.items.tape > 0 ? 1.3 : 1);
      if (db < rad || dc < 10) cands.push([Math.min(db, dc), s]);
    }
    if (!cands.length) return;
    cands.sort((a, b) => a[0] - b[0]);
    let pick = cands[0][1];
    if (cands.length > 1 && cands[1][1].side !== pick.side) { // puck battle
      if ((m.battleT = (m.battleT || 0) + dt) > .2) { m.battleT = 0; const sc = x => x.rt.hnd + x.rt.hit / 2 + RNG.sim() * 3; pick = sc(cands[0][1]) >= sc(cands[1][1]) ? cands[0][1] : cands[1][1]; Sim.emit('battle', {}); }
      else if (!p.owner) return;
    }
    if (p.owner) { // stealing from a carrier by poke or check is handled in Hits; contact alone doesn't take it
      return;
    }
    const rel = Math.hypot(p.vx - pick.vx, p.vy - pick.vy);
    if (rel < 300 || p.passTo === pick) { take(m, pick); }
    else { const chance = clamp(1.3 - rel / 450 + .08 * (pick.rt.hnd - 3), .1, 1); if (RNG.sim() < chance) take(m, pick); else { p.vx *= .5; p.vy *= .5; pick.pickCool = .2; Sim.emit('deflect', {}); } }
  }
  return { mk, step, pass, shoot, take, release, blade, R };
})();

const Goalie = (() => {
  const diffOff = m => [.06, .02, 0, -.02][m.diff] || 0;
  const scale = g => (.9 + .033 * g.size) * (g.itemBig > 0 ? 1.35 : 1) * (g.boss ? (g.bossCracked ? 1.4 : 1.75) / 1.3 : 1);
  function home(m, g) { return { x: Sim.ownGoalX(m, g.side), dir: Sim.attackDir(m, g.side) }; }
  function predict(m, g) { // where the puck will cross the goal line within 1 s
    const p = m.puck, gx = Sim.ownGoalX(m, g.side), d = m.end[g.side] === 0 ? -1 : 1; if (p.owner || p.inNet >= 0 || p.vx * d <= 20) return null;
    const t = (gx - p.x) / p.vx; if (t < 0 || t > 1) return null;
    const yc = p.y + p.vy * t, zc = Math.max(0, p.z + p.vz * t - 350 * t * t); if (Math.abs(yc - Rink.CY) > 30) return null; return { yc, zc, t };
  }
  function step(m, g, dt) {
    const p = m.puck, hm = home(m, g), skill = m.diffGoalie[g.side];
    g.st += dt; g.blastT = Math.max(0, g.blastT - dt); g.itemBig = Math.max(0, g.itemBig - dt); g.bulge = Math.max(0, g.bulge - dt * 8);
    const lat = T.goalieLateral * (.85 + .05 * g.rfx) * (m.kaboom[g.side] > 0 ? 1.1 : 1) * (g.boss && !g.bossCracked ? .9 : 1);
    if (g.state === 'blasted') { g.x += g.blastV * dt; g.blastV *= .94; g.rig.pose = 'down'; if (g.blastT <= 0) { g.state = 'ready'; g.st = 0; } return; }
    if (g.state === 'cover') { if (g.st > 1.6 && !m.holdCover) { g.state = 'ready'; } return; }
    if (g.state === 'stack' && g.st > 1) { g.state = 'ready'; }
    // positioning
    let ty, depth = 10, px_ = p.x, py_ = p.y;
    if (g.manual) { const mi = g.manual; ty = clamp(g.y + mi.mx * 160 * dt * 0, Rink.CY - 30, Rink.CY + 30); g.y = clamp(g.y + mi.my * lat * dt, Rink.CY - 26, Rink.CY + 26); g.x = hm.x + hm.dir * clamp(g.depthM = clamp((g.depthM || 10) + mi.mx * hm.dir * 80 * dt, 6, 28), 6, 28); }
    else {
      const dpuck = Math.hypot(px_ - hm.x, py_ - Rink.CY);
      const behind = (px_ - hm.x) * hm.dir < 0;
      depth = behind ? 6 : clamp(26 - dpuck / 14, 10, 26);
      const a = Math.atan2(py_ - Rink.CY, (px_ - hm.x) * hm.dir);
      ty = behind ? Rink.CY + Math.sign(py_ - Rink.CY) * 14 : Rink.CY + clamp(Math.sin(a) * depth * 1.15, -18, 18);
      // save solver
      const pr = predict(m, g);
      if (pr && !g.save) {
        let react = T.goalieReact - .015 * (g.rfx - 3) + diffOff(m) + skill;
        const scr = m.sk.some(s => s.side !== g.side && Math.hypot(s.x - px_, s.y - py_) < 40 && U.segDist(s.x, s.y, p.x, p.y, hm.x, pr.yc) < 14); if (scr) react += .08;
        if (m.dekeBite[g.side] > 0) react += .12 * (g.boss && !g.bossCracked ? 1.5 : 1);
        if (m.kaboom[g.side] > 0) react -= .03;
        g.save = { yc: pr.yc, zc: pr.zc, tc: pr.t, at: m.t + react, type: pr.zc < 9 ? 'butterfly' : pr.zc > 10 ? ((pr.yc - Rink.CY) * g.hand * hm.dir >= 0 ? 'glove' : 'blocker') : 'stand', t0: m.t };
        if (Math.abs(pr.yc - g.y) > 14 * scale(g) && pr.t < .2) g.save.type = 'stack';
      }
      if (g.save) {
        if (m.t >= g.save.at) { ty = g.save.yc; g.state = g.save.type === 'butterfly' ? 'butterfly' : g.save.type === 'glove' ? 'glove' : g.save.type === 'blocker' ? 'blocker' : g.save.type === 'stack' ? 'stack' : 'ready'; if (g.state === 'stack' && g.st === 0) g.st = 0; }
        if (m.t > g.save.t0 + 1.4) g.save = null;
      } else if (g.state !== 'ready' && g.state !== 'stack' && g.st > .5) g.state = 'ready';
      // poke
      if (p.owner && p.owner.side !== g.side && !g.pokeCd && Math.hypot(p.owner.x - g.x, p.owner.y - g.y) < 22 && (p.owner.x - g.x) * hm.dir > 0 && RNG.sim() < .4 * (.85 + .05 * g.rfx) * dt * 3) { g.pokeCd = 1.2; g.state = 'poke'; g.st = 0; Puck.release(m, p.owner); p.vx = hm.dir * 80; p.vy = (RNG.sim() - .5) * 120; Sim.emit('goalie_poke', { g }); }
      g.pokeCd = Math.max(0, (g.pokeCd || 0) - dt);
      if (g.state === 'poke' && g.st > .4) g.state = 'ready';
      const burst = g.save && m.t >= g.save.at ? 230 : lat;
      g.y += clamp(ty - g.y, -burst * dt, burst * dt); g.y = clamp(g.y, Rink.CY - 24, Rink.CY + 24);
      g.x += clamp(hm.x + hm.dir * depth - g.x, -60 * dt, 60 * dt);
    }
    g.heading = Math.atan2(py_ - g.y, px_ - g.x);
  }
  /** called each puck substep: the puck crossed the goalie's plane? */
  function puckCheck(m, g, ox, oy) {
    const p = m.puck; if (p.owner || g.state === 'blasted' || g.state === 'cover' || p.inNet >= 0) return;
    const d = m.end[g.side] === 0 ? -1 : 1; // direction toward the goal line = the shot direction
    if (p.vx * d <= 0) return;
    const crossed = (ox - g.x) * d < 0 && (p.x - g.x) * d >= 0; if (!crossed) return;
    const k = scale(g), dy = p.y - g.y, z = p.z, sp = Math.hypot(p.vx, p.vy);
    if (!p.shotBy && !p.passTo && sp < 100) return;
    let saved = false, glove = false, kind = 'pad';
    const st = g.state;
    if (Math.abs(dy) < 6.5 * k && z < 22 * k) saved = true;
    if (!saved && st === 'butterfly' && ((Math.abs(dy) < 11 * k && z < 10 * k) || (Math.abs(dy) < 5 * k && z < 20 * k))) saved = true;
    if (!saved && (st === 'glove' || st === 'blocker') && z > 9 && z < 22 * k && Math.abs(dy) < 12 * k) { saved = true; glove = st === 'glove'; kind = glove ? 'glove' : 'blocker'; }
    if (!saved && st === 'stack' && Math.abs(dy) < 18 * k && z < 8) saved = true;
    if (!saved) return;
    if (p.twister && RNG.sim() < .25) return;
    // Talks to Posts: Lemmy's quirk
    if (g.trait === 'Talks to Posts' && Math.abs(Math.abs(p.y - Rink.CY) - Rink.GHALF) < 4 && RNG.sim() < .2) { return; }
    // kaboom blast
    if (p.fire && p.shotBy) {
      if (g.boss && !g.bossCracked) { g.kaboomHits++; Sim.emit('vault_locked', { n: g.kaboomHits }); if (g.kaboomHits >= 2) { g.bossCracked = true; Sim.emit('vault_cracked', {}); } p.vx = -p.vx * .3; p.vy = (RNG.sim() - .5) * 200; p.fire = false; g.state = 'ready'; g.stun = .6; return; }
      g.state = 'blasted'; g.blastT = 1.2; g.st = 0; g.blastV = -d * -1 * 0; g.blastV = d * 160; Sim.emit('blast', { g, shooter: p.shotBy });
      if (RNG.sim() < T.kaboomBlast) { p.vx *= .8; p.fire = true; return; } p.vx = 0; p.vy = 0; p.fire = false; return;
    }
    g.saves++; g.shots++; p.shotBy && (p.onGoal = false); g.state = glove ? 'glove' : g.state; g.st = 0; g.bulge = 1;
    const sh = p.shotBy; Sim.addBoom(m, g.side, 5);
    const frz = glove ? T.gloveCatch + .06 * (g.reb - 3) : st === 'butterfly' ? .4 + .06 * (g.reb - 3) : 0;
    if (RNG.sim() < frz) { p.x = g.x; p.y = g.y; p.vx = p.vy = p.vz = 0; p.frozen = true; g.state = 'cover'; g.st = 0; m.frozenBy = g; Sim.emit('save', { g, shooter: sh, kind, froze: true }); return; }
    const away = d * -1, ang = (RNG.sim() - .5) * 2 * (50 * PI / 180); p.vx = Math.cos(ang) * sp * .35 * away; p.vy = Math.sin(ang) * sp * .35 + (dy > 0 ? 40 : -40); p.vz = 30; p.x = g.x - d * 3; p.last = null; p.shotBy = null; p.passTo = null;
    Sim.emit('save', { g, shooter: sh, kind, froze: false });
  }
  return { step, puckCheck, scale, predict };
})();

/* ---- 25-ai.js ---- */
/* ---- TEAM AI ---- */
const AI = (() => {
  const SK = [.35, .55, .75, .95];
  const unit = (dx, dy) => { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  function arrive(s, tx, ty, it, slow = 14) {
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    if (d < 3) { it.mx = 0; it.my = 0; return d; }
    let [ux, uy] = unit(dx, dy), k = clamp(d / slow, 0, 1);
    // stay off the boards unless chasing
    const sdv = Rink.sd(s.x, s.y); if (sdv > -14) { const n = Rink.normalAt(s.x, s.y); ux -= n[0] * .8; uy -= n[1] * .8; [ux, uy] = unit(ux, uy); }
    it.mx = ux * k; it.my = uy * k; return d;
  }
  function avoid(m, s, it, strength) {
    for (const o of m.sk) { if (o === s || o.state === 'bin') continue; const dx = s.x - o.x, dy = s.y - o.y, d = Math.hypot(dx, dy); const r = o.side === s.side ? 34 : (s.hasPuck ? 34 : 0); if (d < r && d > .1) { it.mx += dx / d * (1 - d / r) * strength; it.my += dy / d * (1 - d / r) * strength; } }
    const l = Math.hypot(it.mx, it.my); if (l > 1) { it.mx /= l; it.my /= l; }
  }
  const laneBlockers = (m, s, tx, ty) => m.sk.filter(o => o.side !== s.side && o.state !== 'bin' && U.segDist(o.x, o.y, s.x, s.y, tx, ty) < 12).length;
  function think(m, s, dt) {
    const it = s.intent, p = m.puck, side = s.side, dir = Sim.attackDir(m, side), gx = Sim.oppGoalX(m, side), ownX = Sim.ownGoalX(m, side);
    const skill = clamp((m.skill[side] + (s.rt.hnd - 3) * .02) * T.aiSkillMul, .2, 1);
    s.skill = skill; it.turbo = false; it.aim = null;
    s.aiT -= dt; const rethink = s.aiT <= 0; if (rethink) s.aiT = lerp(.3, .12, skill) * (.8 + RNG.sim() * .4);
    const mates = m.sk.filter(o => o.side === side && o !== s && o.state !== 'bin'), foes = m.sk.filter(o => o.side !== side && o.state !== 'bin');
    const carrier = p.owner, mine = carrier && carrier.side === side;
    if (s.hasPuck) {
      // carrier
      const d = Math.hypot(gx - s.x, Rink.CY - s.y), ang = Math.abs(Math.atan2(s.y - Rink.CY, Math.abs(gx - s.x)));
      if (rethink) {
        const pressured = foes.some(o => Math.hypot(o.x - s.x, o.y - s.y) < 26 && ((o.x - s.x) * dir > -4));
        s.plan = null;
        const inZone = d < 240 && ang < PI / 2.6 && (gx - s.x) * dir > 0;
        const bestMate = mates.map(o => ({ o, gain: Math.hypot(gx - s.x, Rink.CY - s.y) - Math.hypot(gx - o.x, Rink.CY - o.y), blk: laneBlockers(m, s, o.x, o.y), d: Math.hypot(o.x - s.x, o.y - s.y) })).filter(c => c.blk === 0 && c.d > 40 && c.d < 280).sort((a, b) => b.gain - a.gain)[0];
        const oneTimerPass = bestMate && bestMate.o.role !== 'D' && Math.hypot(gx - bestMate.o.x, Rink.CY - bestMate.o.y) < 130 && d < 200 && RNG.sim() < .22;
        const far = d < 330 && (gx - s.x) * dir > 0 && ang < PI / 2.2 && laneBlockers(m, s, gx, Rink.CY) === 0 && RNG.sim() < .35;
        if ((inZone && laneBlockers(m, s, gx, Rink.CY) <= 1 && !oneTimerPass) || far) s.plan = { t: 'shoot', hold: d > 130 ? .3 + RNG.sim() * .45 : 0, at: m.t + (0.1 + (1 - skill) * .25) };
        else if (bestMate && (pressured || (bestMate.gain > 80 && RNG.sim() < .3) || oneTimerPass)) s.plan = { t: 'pass', to: bestMate.o, at: m.t + .1 + (1 - skill) * .25 };
        else if (foes.some(o => Math.hypot(o.x - s.x, o.y - s.y) < 30 && (o.x - s.x) * dir > 0) && s.cd.deke <= 0 && RNG.sim() < .4 * s.rt.hnd / 3 * skill) s.plan = { t: 'deke', at: m.t + .05 };
        else if (pressured && !bestMate && d < 300 && (gx - s.x) * dir > 0) s.plan = { t: 'shoot', hold: 0, at: m.t + .15 };
        s.aiGoal = [gx - dir * 40, Rink.CY + (Math.abs(s.y - Rink.CY) < 60 ? (s.y < Rink.CY ? -1 : 1) * 36 : 0) * 0];
        // slalom around nearest defender
        const nd = foes.filter(o => (o.x - s.x) * dir > 0).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
        if (nd && Math.hypot(nd.x - s.x, nd.y - s.y) < 60) s.aiGoal = [gx - dir * 60, nd.y > s.y ? Math.min(s.y, Rink.CY) - 40 : Math.max(s.y, Rink.CY) + 40].map((v, i) => i ? clamp(v, Rink.Y0 + 30, Rink.Y1 - 30) : v);
      }
      if (s.aiGoal) arrive(s, s.aiGoal[0], s.aiGoal[1], it, 10);
      avoid(m, s, it, 1.4);
      it.turbo = foes.every(o => Math.hypot(o.x - s.x, o.y - s.y) > 60) && s.turbo > .2;
      if (s.def[1] === 'STERLING' && !s.twist && d < 260 && (gx - s.x) * dir > 0 && (s.twistCd || 0) <= 0 && RNG.sim() < dt * .8) { s.twist = .6; s.twistCd = 5; s.glow = '#ffd36a'; s.spin = .45; Sim.emit('twister', { s }); }
      s.twistCd = Math.max(0, (s.twistCd || 0) - dt); if (s.twist > 0) { s.twist -= dt; it.mx *= .3; it.my *= .3; if (s.twist <= 0) { s.twist = 0; s.glow = null; s.plan = { t: 'shoot', hold: 0, at: m.t, twister: true }; } }
      const pl = s.plan;
      if (pl && m.t >= pl.at) {
        if (pl.t === 'shoot') { if (!pl.started) { pl.started = m.t; it.shootHeld = true; } const heldT = m.t - pl.started; if (heldT >= pl.hold) { it.shootHeld = false; it.shootUp = true; s.plan = null; } else it.shootHeld = true; }
        else if (pl.t === 'pass') { it.aim = { x: pl.to.x, y: pl.to.y, mate: pl.to }; it.press.pass++; s.plan = null; }
        else if (pl.t === 'deke') { it.press.deke++; s.plan = null; }
      } else if (!pl) { it.shootHeld = false; }
      if (it.shootHeld && s.plan) { it.mx *= .6; it.my *= .6; }
    } else {
      it.shootHeld = false;
      const dist = o => Math.hypot(o.x - p.x, o.y - p.y);
      const px_ = p.x + p.vx * .25, py_ = p.y + p.vy * .25;
      let tx = ownX + dir * 90, ty = Rink.CY, chase = false;
      if (!carrier) { // loose puck: closest per team chases
        const ranks = m.sk.filter(o => o.side === side && o.state !== 'bin').sort((a, b) => Math.hypot(a.x - px_, a.y - py_) - Math.hypot(b.x - px_, b.y - py_));
        if (ranks[0] === s || (ranks[1] === s && Math.hypot(s.x - px_, s.y - py_) < 40)) { chase = true; tx = px_; ty = py_; it.turbo = s.turbo > .3; }
        else if (p.x * 0 + (px_ - Rink.CX) * dir > 0) { tx = px_ - dir * 90; ty = Rink.CY + (s.slot === 1 ? -60 : s.slot === 0 ? 50 : 0); }
        else { tx = ownX + dir * 100; ty = Rink.CY + (s.slot - 1) * 40; }
      } else if (mine) {
        const c = carrier; const front = c.x + dir * 70;
        if (s.role === 'D') { tx = clamp(Rink.CX + dir * 108 - dir * 10, Rink.X0 + 60, Rink.X1 - 60); if ((c.x - Rink.CX) * dir > 108) tx = c.x - dir * 90; ty = Rink.CY + (c.y > Rink.CY ? -1 : 1) * 70; }
        else { const slot = Math.abs(gx - c.x) < 220; tx = slot ? gx - dir * (50 + s.slot * 30) : c.x + dir * 70; ty = slot ? Rink.CY + (s.slot === 1 ? -1 : 1) * (c.y > Rink.CY ? -1 : 1) * 40 + (c.y > Rink.CY ? -30 : 30) : clamp(c.y + (c.y > Rink.CY ? -1 : 1) * 80, Rink.Y0 + 40, Rink.Y1 - 40); }
        if (s.callT > 0) { s.callT -= dt; }
      } else { // defend
        const ranks = m.sk.filter(o => o.side === side && o.state !== 'bin').sort((a, b) => Math.hypot(a.x - carrier.x, a.y - carrier.y) - Math.hypot(b.x - carrier.x, b.y - carrier.y));
        if (ranks[0] === s) { chase = true; tx = carrier.x + carrier.vx * .3; ty = carrier.y + carrier.vy * .3; it.turbo = s.turbo > .3 && Math.hypot(s.x - tx, s.y - ty) > 40;
          const dd = Math.hypot(carrier.x - s.x, carrier.y - s.y);
          s.aiCd = Math.max(0, (s.aiCd || 0) - dt); if (dd < 44 && s.cd.check <= 0 && s.cd.poke <= 0 && s.aiCd <= 0 && RNG.sim() < dt * 3) { if (s.rt.hit >= 3 && RNG.sim() < T.aiAggro * (.6 + skill * .5) + .2) { it.press.shoot++; s.aiCd = 1.2; } else if (dd < 30) { it.press.deke++; s.aiCd = .8; } } }
        else { const tgt = foes.filter(o => o !== carrier).sort((a, b) => Math.hypot(a.x - gx * 0 - ownX, a.y - Rink.CY) - Math.hypot(b.x - ownX, b.y - Rink.CY))[0];
          tx = lerp(ownX + dir * 70, carrier.x, .35); ty = lerp(Rink.CY, carrier.y, .4); if (tgt && s.slot !== 2) { tx = lerp(tx, tgt.x - dir * 20, .5); ty = lerp(ty, tgt.y, .5); } }
      }
      if (m.mascot && m.tactic[0] === 'hunt' && s.side === 0 && s.slot === 1 && !chase && m.mascot.down <= 0) { tx = m.mascot.x; ty = m.mascot.y; if (Math.hypot(s.x - tx, s.y - ty) < 36 && s.cd.check <= 0 && RNG.sim() < dt * 4) it.press.shoot++; }
      // item greed
      if (!chase && T.aiItemGreed > 0 && m.items.length) { const it2 = m.items.filter(i => Math.hypot(i.x - s.x, i.y - s.y) < T.aiItemGreed).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0]; if (it2 && !(mine && s.role === 'C')) { tx = it2.x; ty = it2.y; } }
      tx = clamp(tx, Rink.X0 + 16, Rink.X1 - 16); ty = clamp(ty, Rink.Y0 + 16, Rink.Y1 - 16);
      arrive(s, tx, ty, it, chase ? 6 : 16); avoid(m, s, it, chase ? .3 : 1);
      // one-timer: a pass is on its way to me near the net
      if (s.recvT > 0 && p.passTo === s && Math.hypot(gx - s.x, Rink.CY - s.y) < 150 && Math.hypot(p.x - s.x, p.y - s.y) < 40 && RNG.sim() < .1 + skill * .1) { it.press.shoot++; s.oneTimerT = .35; }
    }
  }
  function park(m, s, tx, ty) { const it = s.intent; it.turbo = false; it.shootHeld = false; arrive(s, tx, ty, it, 18); }
  return { think, park, arrive, SK };
})();

/* ---- 26-match.js ---- */
/* ---- MATCH: configuration, phases, intents, actions, movement, flow ---- */
const Match = (() => {
  let M = null;
  const SKILLS = AI.SK;
  const cur = () => M;
  function create(cfg) {
    cfg = Object.assign({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, periodLen: T.periodLen, ot: true, shootout: true, intros: false, humans: [], noBoom: false, seed: (Date.now() & 0xffffff), practice: null, tactic: [null, null] }, cfg);
    RNG.setSeed(cfg.seed); RNG.fx = E.rng(cfg.seed ^ 0x9e37);
    Bus.reset(); Rink.resetScuff(); for (const p of Rink.panels) { p.st = 0; p.shake = 0; }
    const hT = TEAM[cfg.home], aT = TEAM[cfg.away], diff = clamp(cfg.diff != null ? cfg.diff : ['Rookie', 'Pro', 'All-Star', 'Legend'].indexOf(S('difficulty')), 0, 3);
    const m = M = Sim.S_.m = { cfg, t: 0, teams: [hT, aT], arena: ARENAS[cfg.arena], diff, end: [0, 1], period: 1, periods: cfg.periods, clock: cfg.periodLen, phase: cfg.intros ? 'intro' : 'faceoff', pt: 0, score: [0, 0], boom: [0, 0], kaboom: [0, 0], tactic: cfg.tactic.slice(), skill: [SKILLS[diff], SKILLS[diff]], diffGoalie: [0, 0],
      sk: [], gl: [], ref: Sim.mkRef(), puck: Puck.mk(), items: [], holes: [], octos: [], stats: { shots: [0, 0], sog: [0, 0], hits: [0, 0], passes: [0, 0], faceoffs: [0, 0], kabooms: [0, 0], fights: 0, goals: [] }, goalPending: null, dekeBite: [0, 0], sinBin: [], fightCount: 0, fight: null, lastFight: -99, frozenBy: null,
      holdCover: false, ot: false, so: null, over: false, itemT: T.itemEvery * .6, replayReq: null, flip: false, hat: {}, feed: [], shatterCnt: 0, phaseNoPlay: false, humans: [], noPickup: false, intensity: 0, fo: null, scorer: null, mascot: null, shotClockT: 0 };
    if (cfg.story) m.skill[1] = SKILLS[Math.max(0, diff - (cfg.story.id === 1 ? 1 : 0))];
    if (diff === 3) m.diffGoalie = [-.02, .01]; else m.diffGoalie = [[ .06, -.03][0], -.03]; // CPU goalie offsets by difficulty
    m.diffGoalie = [[.06, .02, 0, -.02][diff], [.06, .02, 0, -.02][diff]]; // (applies to the CPU's goalies; humans' team gets the opposite)
    for (const side of [0, 1]) { const team = m.teams[side]; for (let i = 0; i < 3; i++) m.sk.push(Sim.mkSkater(m, side, i, team, side === 1)); m.gl.push(Sim.mkGoalie(m, side, team, side === 1)); }
    for (const g of m.gl) g.num = TEAM[g.team.id].goalie[2];
    for (const s of m.sk) { s.jersey = s.team[s.side ? 'away' : 'home'].cloth; if (cfg.retro) s.rig = Rigs.skater(s.def, s.side, s.team, s.side === 1, true); }
    m.hasHuman = [false, false];
    for (const h of cfg.humans) { m.hasHuman[h.side] = true; }
    if (m.hasHuman[0] && !m.hasHuman[1]) m.diffGoalie[0] = [-.03, -.01, 0, .01][diff]; else if (m.hasHuman[1] && !m.hasHuman[0]) m.diffGoalie[1] = [-.03, -.01, 0, .01][diff];
    if (cfg.story) { const tk = cfg.story.tacticKey && cfg.story.tacticKey[cfg.storyChoice || 0]; if (tk === 'finesse' || tk === 'grit' || tk === 'hunt') m.tactic[0] = tk; m.doris = null; m.dorisPick = tk; if (tk === 'lou') m.sk[2].rt.fgt = Math.min(6, m.sk[2].rt.fgt + 1); if (tk === 'lou2') m.sk[2].rt.pas++; }
    // assign humans
    m.humans = cfg.humans.map(h => ({ side: h.side, input: h.input, seat: h.seat != null ? h.seat : 0, remote: !!h.remote, sk: null, intent: Sim.blank(), lastPress: {}, cnt: [0, 0, 0, 0, 0, 0] }));
    for (const h of m.humans) { const mates = Sim.teamOf(m, h.side); const free = mates.find(s => s.ctrl.kind === 'cpu' && !s.chosen); if (!free) continue; h.sk = free; free.ctrl = { kind: h.remote ? 'remote' : 'human', input: h.input, seat: h.seat }; free.chosen = true; if (m.humans.length === 1 || true) free.human = h; }
    setupFaceoff(Rink.CX, Rink.CY, { center: true }); if (cfg.practice !== 'hold') m.pt = 0;
    m.ref.x = Rink.CX; m.ref.y = Rink.CY - 20;
    // thin ice patches
    m.thin = m.arena.hazard === 'thin' ? [[Rink.CX - 150, Rink.CY - 90, 40, 24], [Rink.CX + 40, Rink.CY + 70, 40, 24], [Rink.CX + 200, Rink.CY - 40, 40, 24]].map(a => ({ x: a[0], y: a[1], rx: a[2] / 2, ry: a[3] / 2, hp: 100, hole: false, re: 0 })) : [];
    if (m.arena.hazard === 'mascot') m.mascot = { x: Rink.CX, y: Rink.CY, a: 0, state: 'dance', down: 0, vx: 0, vy: 0, rig: Rigs.PEOPLE.pete(), heading: 0, hit: 0 };
    m.dropT = 0; Bus.emit('match_start', { m });
    return m;
  }
  const spot = (side, slot, dx, dy, dirw) => { // faceoff spots relative to the dot
    const own = Sim.attackDir(M, side) * -1; // toward own end
    if (slot === 0) return [dx + own * 11, dy];
    if (slot === 1) return [dx + own * 36, dy + (dy > Rink.CY ? -1 : 1) * 56 * (dy === Rink.CY ? -1 : 1) * (side ? -1 : 1)];
    return [dx + own * 70, dy + (side ? 1 : -1) * 26];
  };
  function setupFaceoff(dx, dy, o = {}) {
    const m = M, p = m.puck; Puck.release(m, p.owner); p.owner = null; p.x = dx; p.y = dy; p.z = 0; p.vx = p.vy = p.vz = 0; p.inNet = -1; p.out = false; p.frozen = false; p.shotBy = null; p.passTo = null; p.fire = false; m.noPickup = true; m.fo = { x: dx, y: dy, t: 0, drop: 1 + RNG.sim() * .6, dropped: false, winner: -1, press: [-1, -1], pressT: [99, 99] };
    m.frozenBy = null; for (const g of m.gl) { if (g.state === 'cover') g.state = 'ready'; if (g.state !== 'blasted') g.save = null; }
    for (const s of m.sk) { if (s.state === 'bin') continue; if (s.hasPuck) s.hasPuck = false; if (!['frozen', 'buried'].includes(s.state)) { s.state = 'skate'; s.st = 0; } s.vx = s.vy = 0; s.winding = false; s.plan = null; }
    for (const s of m.sk) { const sp = spot(s.side, s.slot, dx, dy); s.tx = clamp(sp[0], Rink.X0 + 20, Rink.X1 - 20); s.ty = clamp(sp[1], Rink.Y0 + 20, Rink.Y1 - 20); if (o.center || o.snap) { s.x = s.tx + Sim.attackDir(m, s.side) * -1 * 30; s.y = s.ty; s.heading = Sim.attackDir(m, s.side) > 0 ? 0 : PI; } }
    for (const g of m.gl) { g.x = Sim.ownGoalX(m, g.side) + Sim.attackDir(m, g.side) * 10; g.y = Rink.CY; g.heading = Sim.attackDir(m, g.side) > 0 ? 0 : PI; }
    m.ref.x = dx; m.ref.y = dy - 14;
  }
  const faceoffNow = (dx, dy, snap) => { M.phase = 'faceoff'; M.pt = 0; setupFaceoff(dx, dy, { snap }); Bus.emit('faceoff_set', { x: dx, y: dy }); };
  // ---------------- intents ----------------
  function humanIntent(m, h, dt) {
    const I = h.input, it = h.intent; if (!I) return;
    const mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
    it.mx = d[0]; it.my = d[1]; it.turbo = I.down('turbo');
    const pu = k => { if (I.pressed(k)) { it.press[k]++; } };
    for (const k of ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch']) pu(k);
    it.shootHeld = I.down('shoot'); it.lobHeld = I.down('lob');
    // aim: mouse (moved recently) or right stick
    it.aim = null;
    if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .4) { const ga = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); h.aimDir = ga; it.aim = { dx: ga[0], dy: ga[1], stick: true }; }
    else if (I.lastDevice === 'mouse' || I.aimSource === 'mouse') { const mg = game.mouseGround && game.mouseGround(); if (mg) { it.aim = { x: mg[0] !== undefined ? mg[0] : mg.x, y: mg[1] !== undefined ? mg[1] : mg.y, mouse: true }; h.mouse = it.aim; } }
    if (!it.aim && Math.hypot(it.mx, it.my) > .3) it.aim = { dx: it.mx, dy: it.my, stick: true, move: true };
    if (!it.aim) { const ang = h.sk ? h.sk.heading : 0; it.aim = { dx: Math.cos(ang), dy: Math.sin(ang), move: true }; }
  }
  function applyHuman(m, h) { const s = h.sk; if (!s) return; const it = s.intent, hi = h.intent; it.mx = hi.mx; it.my = hi.my; it.turbo = hi.turbo; it.aim = hi.aim; it.shootHeld = hi.shootHeld; it.lobHeld = hi.lobHeld; for (const k in hi.press) it.press[k] = hi.press[k]; }
  function switchTo(m, h, s2) { if (!s2 || s2 === h.sk || s2.ctrl.kind !== 'cpu' || ['bin'].includes(s2.state)) return; const old = h.sk; if (old) { old.ctrl = { kind: 'cpu', input: null, seat: null }; old.chosen = false; old.human = null; old.intent.shootHeld = false; } s2.ctrl = { kind: h.remote ? 'remote' : 'human', input: h.input, seat: h.seat }; s2.chosen = true; s2.human = h; h.sk = s2; Bus.emit('switch', { h, s: s2 }); }
  function autoSwitch(m) {
    for (const h of m.humans) {
      if (m.fight || m.cfg.noSwitch) continue; const s = h.sk; if (!s || s.state === 'bin') { const mates = Sim.teamOf(m, h.side).filter(x => x.ctrl.kind === 'cpu' && x.state !== 'bin'); if (mates.length) switchTo(m, h, mates[0]); continue; }
      if (h.input && h.intent.press.switch !== (h.lastPress.switch || 0)) { h.lastPress.switch = h.intent.press.switch; const mates = Sim.teamOf(m, h.side).filter(x => x.ctrl.kind === 'cpu' && x.state !== 'bin'); const p = m.puck; mates.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)); switchTo(m, h, mates[0]); continue; }
      const o = m.puck.owner; if (o && o.side === h.side && o !== s && o.ctrl.kind === 'cpu' && m.puck.passTo === s) {}
      // auto-switch: a pass was received by a mate / a lone human to the one nearest the puck when not carrying
      const p = m.puck; if (m.humans.filter(x => x.side === h.side).length === 1 && !s.hasPuck && m.phase === 'play') {
        const mates = Sim.teamOf(m, h.side).filter(x => x.state !== 'bin'); const rec = mates.find(x => x.recvT > 0 && p.passTo === x); if (rec && rec !== s) { switchTo(m, h, rec); continue; }
        if (p.owner && p.owner.side === h.side && p.owner !== s && p.owner.ctrl.kind === 'cpu' && h.autoT !== true) { /* carrier is a CPU mate: stay (call for pass) */ }
        else if (!p.owner || p.owner.side !== h.side) { const best = mates.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (best !== s && best.ctrl.kind === 'cpu' && Math.hypot(best.x - p.x, best.y - p.y) + 40 < Math.hypot(s.x - p.x, s.y - p.y)) switchTo(m, h, best); }
        if (p.owner && p.owner.side === h.side && p.owner !== s && p.owner.ctrl.kind === 'cpu' && h.takeT === undefined) { }
      }
    }
  }
  // ---------------- targeting ----------------
  function passTarget(m, s) {
    const it = s.intent, mates = m.sk.filter(o => o.side === s.side && o !== s && o.state !== 'bin' && o.state !== 'down');
    if (it.aim && it.aim.mate) return { mate: it.aim.mate };
    if (it.aim && it.aim.mouse) { let best = null, bd = 80; for (const o of mates) { const d = Math.hypot(o.x - it.aim.x, o.y - it.aim.y); if (d < bd) { bd = d; best = o; } } return best ? { mate: best } : { x: it.aim.x, y: it.aim.y }; }
    const dx = it.aim && it.aim.dx != null ? it.aim.dx : Math.cos(s.heading), dy = it.aim && it.aim.dy != null ? it.aim.dy : Math.sin(s.heading), ang = Math.atan2(dy, dx);
    let best = null, bs = 1e9;
    for (const o of mates) { const a = Math.atan2(o.y - s.y, o.x - s.x), da = Math.abs(U.angDiff(ang, a)); if (da < 75 * PI / 180) { const sc = da * 100 + Math.hypot(o.x - s.x, o.y - s.y) * .1; if (sc < bs) { bs = sc; best = o; } } }
    if (!best) { for (const o of mates) { const ahead = (o.x - s.x) * Sim.attackDir(m, s.side); const sc = Math.hypot(o.x - s.x, o.y - s.y) - ahead * .5; if (sc < bs) { bs = sc; best = o; } } }
    return { mate: best };
  }
  // ---------------- actions ----------------
  const LOCK = ['down', 'getup', 'stun', 'bin', 'frozen', 'buried', 'slip', 'fight', 'celebrate'];
  function actions(m, s, dt) {
    const it = s.intent, P = it.press, lp = s.lastPress || (s.lastPress = { pass: 0, shoot: 0, deke: 0, lob: 0, chirp: 0, switch: 0 });
    const pr = k => { if (P[k] !== lp[k]) { lp[k] = P[k]; return true; } return false; };
    for (const k in s.cd) s.cd[k] = Math.max(0, s.cd[k] - dt);
    const locked = LOCK.includes(s.state) || m.phase === 'goal' || m.phaseNoPlay;
    const was = { pass: pr('pass'), shoot: pr('shoot'), deke: pr('deke'), lob: pr('lob'), chirp: pr('chirp'), sw: pr('switch') };
    s.recvT = Math.max(0, s.recvT - dt); s.oneTimerT = Math.max(0, s.oneTimerT - dt); s.swing = Math.max(0, s.swing - dt);
    if (locked) { s.winding = false; s.holdShoot = 0; s.charge = 0; s.shootWas = false; return; }
    if (m.fo && m.phase === 'faceoff') { if (was.pass || was.shoot) faceoffPress(m, s); return; }
    const free = s.state === 'skate' || s.state === 'stop' || s.state === 'wind' || s.state === 'pass' || s.state === 'shoot';
    if (was.chirp && s.cd.chirp <= 0) Hits.chirp(m, s);
    if (s.hasPuck) {
      if (was.pass && free) { const t = passTarget(m, s); Puck.pass(m, s, t.mate ? t.mate.x : t.x, t.mate ? t.mate.y : t.y, t.mate, false); }
      else if (was.lob && free) { const t = passTarget(m, s); Puck.pass(m, s, t.mate ? t.mate.x : t.x, t.mate ? t.mate.y : t.y, t.mate, true); }
      else if (was.deke && s.cd.deke <= 0 && free) Hits.deke(m, s);
      // shoot: hold to charge, release to fire
      if (it.shootHeld && free) { s.holdShoot += dt; s.shootWas = true; if (s.holdShoot > .18) { s.winding = true; s.state = 'wind'; const ct = T.slapCharge * (m.kaboom[s.side] > 0 ? .5 : 1); s.charge = clamp((s.holdShoot - .18) / ct, 0, 1); } }
      else if (s.shootWas) { s.shootWas = false; const type = s.holdShoot < .18 ? 'wrist' : 'slap'; const aim = shotAim(m, s); s.winding = false; if (s.state === 'wind') s.state = 'skate'; Puck.shoot(m, s, type, type === 'slap' ? s.charge : 0, aim); s.holdShoot = 0; s.charge = 0; }
      else { s.holdShoot = 0; s.winding = false; if (s.state === 'wind') s.state = 'skate'; }
    } else {
      if (s.shootWas) { s.shootWas = false; s.winding = false; if (s.state === 'wind') s.state = 'skate'; }
      s.winding = false; s.holdShoot = 0;
      const p = m.puck;
      if (was.shoot) {
        if (p.passTo === s && p.passT > 0 && Math.hypot(p.x - s.x, p.y - s.y) < 150) { s.oneTimerT = .35; Bus.emit('onetimer_arm', { s }); }
        else if (s.cd.check <= 0 && free) Hits.startCheck(m, s);
      }
      if (was.deke && s.cd.poke <= 0 && free) Hits.startPoke(m, s);
      if (was.pass && s.ctrl.kind === 'human') { const o = p.owner; if (o && o.side === s.side && o.ctrl.kind === 'cpu') { o.plan = { t: 'pass', to: s, at: m.t + .25 }; o.callFrom = s; s.callT = 1.2; Bus.emit('call_pass', { s }); } }
      if (s.recvT > 0 && it.shootHeld && p.passTo === s && Math.hypot(p.x - s.x, p.y - s.y) < 22) s.oneTimerT = .35;
    }
  }
  function shotAim(m, s) { const it = s.intent, a = it.aim; if (!a) return null; if (a.mouse) return { x: a.x, y: a.y }; if (a.stick && !a.move) { return { x: s.x + a.dx * 100, y: s.y + a.dy * 100, far: null }; } if (a.move) { const dir = Sim.attackDir(m, s.side); const up = a.dy * (dir > 0 ? 1 : 1); if (Math.abs(a.dy) > .5) return { far: Math.sign(a.dy) * 1 }; } return null; }
  function faceoffPress(m, s) { const fo = m.fo; if (!fo || s.slot !== 0) return; if (fo.press[s.side] < 0) { fo.press[s.side] = fo.dropped ? m.t - fo.dropAt : -1; if (!fo.dropped) { fo.early = fo.early || [false, false]; fo.early[s.side] = true; } } }
  return { create, cur, setupFaceoff, faceoffNow, humanIntent, applyHuman, switchTo, autoSwitch, actions, passTarget, shotAim, LOCK, get m() { return M; }, _set(v) { M = v; } };
})();

/* ---- 27-hits.js ---- */
/* ---- HITS, BOOM, ITEMS, FIGHTS ---- */
const Hits = (() => {
  const M = () => Sim.m;
  function startCheck(m, s) { s.state = 'check'; s.st = .3; s.cd.check = .9; const sp = Math.hypot(s.vx, s.vy); s.vx += Math.cos(s.heading) * 60; s.vy += Math.sin(s.heading) * 60; s.hitFrom = sp; Sim.emit('check_start', { s }); }
  function startPoke(m, s) { s.state = 'poke'; s.st = .35; s.cd.poke = .6; s.swing = .3; Sim.emit('poke_start', { s }); }
  function deke(m, s) {
    s.state = 'deke'; s.st = .45; s.cd.deke = .8; s.dekeSide = s.dekeAlt = -(s.dekeAlt || 1);
    const it = s.intent; if (Math.abs(it.mx) + Math.abs(it.my) > .3) { const px_ = -Math.sin(s.heading), py_ = Math.cos(s.heading); s.dekeSide = Math.sign(it.mx * px_ + it.my * py_) || s.dekeSide; }
    const nx = -Math.sin(s.heading) * s.dekeSide, ny = Math.cos(s.heading) * s.dekeSide; s.vx += nx * 90; s.vy += ny * 90; s.spin = .45;
    s.dekeBeat = { t: 1, from: m.sk.filter(o => o.side !== s.side && Math.hypot(o.x - s.x, o.y - s.y) < 40).map(o => o.id) };
    const g = m.gl[1 - s.side]; if (Math.hypot(g.x - s.x, g.y - s.y) < 70) m.dekeBite[1 - s.side] = .5;
    Sim.emit('deke', { s });
  }
  function chirp(m, s) {
    s.cd.chirp = 4; let best = null, bd = 120; for (const o of m.sk) if (o.side !== s.side && o.state !== 'bin') { const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < bd) { bd = d; best = o; } }
    const line = TEXT.chirps[(RNG.fx() * TEXT.chirps.length) | 0]; Sim.addBoom(m, s.side, 3);
    if (best) { best.grudge[s.id] = clamp((best.grudge[s.id] || 0) + 15, 0, 100); }
    Sim.emit('chirp', { s, target: best, line });
  }
  function bigHit(m, a, b, imp, nrm) {
    if ((m.cfg.god || m.cfg.cheats === 'god') && b.ctrl.kind === 'human') { b.state = 'stun'; b.st = .3; return; }
    b.state = 'down'; b.st = 1.4; b.hitBy = a; b.hitT = 1.4; b.flipT = .8; b.winding = false; b.plan = null;
    const sp = .8 * imp * (m.kaboom[a.side] > 0 ? 1.2 : 1); b.vx = nrm[0] * sp * .8; b.vy = nrm[1] * sp * .8;
    if (b.hasPuck) { Puck.release(m, b); m.puck.vx = nrm[0] * 140; m.puck.vy = nrm[1] * 140; m.puck.last = a; }
    a.stats.hits++; a.stats.bigHits++; m.stats.hits[a.side]++;
    b.grudge[a.id] = clamp((b.grudge[a.id] || 0) + 35, 0, 100);
    for (const o of m.sk) if (o.side === b.side && o !== b) o.grudge[a.id] = clamp((o.grudge[a.id] || 0) + 10, 0, 100);
    Sim.addBoom(m, a.side, 18); if (b.twist > 0) { b.twist = 0; b.glow = null; Sim.addBoom(m, a.side, 10); } Sim.emit('big_hit', { a, b, imp });
    Rink.addScuff(b.x, b.y, .2);
  }
  /** called every step: contacts in the check state */
  function stepChecks(m) {
    for (const a of m.sk) {
      if (a.state !== 'check') continue;
      for (const b of m.sk) {
        if (b.side === a.side || ['bin', 'down', 'getup', 'frozen', 'buried'].includes(b.state)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d > 15 || (a.hitCool && a.hitCool[b.id] > m.t)) continue;
        // deke dodge
        if (b.state === 'deke' && b.st > .15 && RNG.sim() < .7 + .04 * (b.rt.hnd - 3)) { Sim.emit('deke_beat', { s: b, from: a }); Sim.addBoom(m, b.side, 6); (a.hitCool = a.hitCool || {})[b.id] = m.t + .6; continue; }
        const nrm = [dx / (d || 1), dy / (d || 1)], closing = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        const imp = (b.twist > 0 ? 999 : 1) * T.checkPower * (closing + 60) * (a.mass / b.mass) * (.8 + .067 * a.rt.hit) * (a.turboOn ? 1.45 : 1) * (m.kaboom[a.side] > 0 ? 2 : 1) * (a.items.poutine > 0 ? 1.6 : 1) * (m.tactic[a.side] === 'grit' ? 1.05 : 1);
        (a.hitCool = a.hitCool || {})[b.id] = m.t + .6;
        if (b.items.poutine > 0 && imp < 400) { Sim.emit('bump', { a, b }); continue; }
        if (imp >= T.knockdown && !(b.items.poutine > 0)) bigHit(m, a, b, imp, nrm);
        else if (imp >= 90) { b.state = 'stun'; b.st = .5; if (b.hasPuck) { Puck.release(m, b); m.puck.vx = nrm[0] * 90; m.puck.vy = nrm[1] * 90; m.puck.last = a; } a.stats.hits++; m.stats.hits[a.side]++; b.grudge[a.id] = clamp((b.grudge[a.id] || 0) + 10, 0, 100); Sim.addBoom(m, a.side, 6); Sim.emit('check', { a, b, imp }); }
        else { b.state = 'stun'; b.st = .25; if (b.hasPuck && RNG.sim() < .5) { Puck.release(m, b); m.puck.vx = nrm[0] * 60; m.puck.vy = nrm[1] * 60; } Sim.emit('bump', { a, b }); }
        b.vx += nrm[0] * imp * .15; b.vy += nrm[1] * imp * .15;
        a.state = 'skate'; a.st = 0;
      }
    }
    // poke: strip a carried puck
    for (const a of m.sk) {
      if (a.state !== 'poke' || a.pokeDone) continue; const c = m.puck.owner;
      if (!c || c.side === a.side) continue; const bp = Rigs.stickPoint(a), tip = [bp[0] + Math.cos(a.heading) * 18, bp[1] + Math.sin(a.heading) * 18];
      if (Math.hypot(m.puck.x - tip[0], m.puck.y - tip[1]) < 14 || U.segDist(m.puck.x, m.puck.y, bp[0], bp[1], tip[0], tip[1]) < 8) {
        a.pokeDone = true; if (c.items.tape > 0) { Sim.emit('poke_fail', { a }); continue; }
        if (RNG.sim() < .55 + .08 * (a.rt.hnd - c.rt.hnd)) { Puck.release(m, c); m.puck.vx = Math.cos(a.heading) * 80; m.puck.vy = Math.sin(a.heading) * 80; m.puck.last = a; a.stats.takeaways++; Sim.emit('poke_steal', { a, c }); }
        else { Sim.emit('poke_fail', { a }); }
      }
    }
  }
  /** skater collides with a board: glass damage */
  function boardHit(m, s, vn, n) {
    if (vn > 120) Sim.emit('rattle', { s, vn });
    const hard = (s.state === 'down' || s.hitT > 0 || s.state === 'check') && vn > T.glassCrack;
    if (!hard) return;
    const pn = Rink.panelAt(s.x, s.y); if (pn.near) { if (pn.st < 2 && vn > T.glassShatter) { /* low boards on the near side */ } return; }
    if (pn.st === 0 && vn <= T.glassShatter) { pn.st = 1; pn.shake = .5; Sim.addBoom(m, s.hitBy ? s.hitBy.side : 1 - s.side, 8); Sim.emit('glass_crack', { pn, s }); }
    else if (pn.st < 2) { pn.st = 2; pn.shake = .6; m.shatterCnt++; Sim.addBoom(m, s.hitBy ? s.hitBy.side : 1 - s.side, 15); Sim.emit('glass_shatter', { pn, s, by: s.hitBy }); }
  }
  return { startCheck, startPoke, deke, chirp, bigHit, stepChecks, boardHit };
})();

/* ---- ITEMS & HAZARDS ---- */
const Items = (() => {
  function throwItem(m, forced) {
    const pool = m.arena.items; const kind = forced || pool[(RNG.sim() * pool.length) | 0];
    const tx = Rink.CX + (RNG.sim() - .5) * 400, ty = Rink.CY + (RNG.sim() - .5) * 240;
    const fx = RNG.sim() < .5 ? Rink.X0 - 20 : Rink.X1 + 20, fy = Rink.Y0 - 40;
    const o = { kind, x: tx, y: ty, t: 12, z: 0, ly: fy, fly: .7, fx, vx: 0, vy: 0 };
    m.items.push(o); Sim.emit('item_throw', { o, kind }); return o;
  }
  function applyItem(m, s, kind) {
    const d = ITEMS[kind]; Sim.emit('item_pick', { s, kind });
    if (kind === 'boombox') { Sim.addBoom(m, s.side, 40); return; }
    if (kind === 'lumber') { s.items.lumber = 30; s.lumberShots = 3; return; }
    if (kind === 'brick') { m.gl[s.side].itemBig = 12; return; }
    if (kind === 'cocoa') { s.turbo = 1; s.items.cocoa = d.dur; return; }
    s.items[kind] = d.dur;
  }
  function step(m, dt) {
    for (const s of m.sk) { for (const k in s.items) if (s.items[k] > 0) s.items[k] = Math.max(0, s.items[k] - dt); }
    // fan throws
    if (m.phase === 'play' && !m.cfg.noItems) { m.itemT -= dt; if (m.itemT <= 0) { m.itemT = T.itemEvery * (.7 + RNG.sim() * .6); if (m.items.length < 3) throwItem(m); } }
    for (const o of m.items) {
      if (o.fly > 0) { o.fly -= dt; o.z = Math.sin(clamp(1 - o.fly / .7, 0, 1) * PI) * 40; continue; }
      o.t -= dt;
      for (const s of m.sk) if (s.state !== 'bin' && s.state !== 'down' && Math.hypot(s.x - o.x, s.y - o.y) < 12) { applyItem(m, s, o.kind); o.t = 0; break; }
    }
    m.items = m.items.filter(o => o.t > 0);
    // octopi / rats slip
    for (const o of m.octos) { o.t -= dt; if (o.rat) { o.x += o.vx * dt; o.y += o.vy * dt; if (RNG.sim() < .02) { const a = RNG.sim() * TAU; o.vx = Math.cos(a) * 60; o.vy = Math.sin(a) * 60; } const n = Rink.sd(o.x, o.y); if (n > -8) { const nn = Rink.normalAt(o.x, o.y); o.vx = -nn[0] * 60; o.vy = -nn[1] * 60; } }
      for (const s of m.sk) if (!['slip', 'down', 'bin', 'frozen', 'buried'].includes(s.state) && Math.hypot(s.x - o.x, s.y - o.y) < 10 && Math.hypot(s.vx, s.vy) > 30) { s.state = 'slip'; s.st = 1.2; s.flipT = 1; o.t = Math.min(o.t, 3); Sim.emit('slip', { s, o }); } }
    m.octos = m.octos.filter(o => o.t > 0);
    // thin ice
    for (const t of m.thin) { if (t.hole) { t.re -= dt; if (t.re <= 0) { t.hole = false; t.hp = 100; } for (const s of m.sk) if (!['frozen', 'bin'].includes(s.state) && ((s.x - t.x) / t.rx) ** 2 + ((s.y - t.y) / t.ry) ** 2 < 1) { s.state = 'frozen'; s.st = 3; s.vx = s.vy = 0; s.frozeAt = [t.x, t.y]; Sim.emit('frozen', { s, t }); } if (m.puck.owner == null && ((m.puck.x - t.x) / t.rx) ** 2 + ((m.puck.y - t.y) / t.ry) ** 2 < 1 && m.puck.z < 1) { Sim.emit('puck_lost', {}); m.puck.out = true; } } }
    // mascot
    const pe = m.mascot;
    if (pe) {
      if (pe.down > 0) { pe.down -= dt; if (pe.down <= 0) pe.state = 'dance'; }
      else { pe.a += dt * .6; const hunt = m.tactic[0] === 'hunt'; pe.x = Rink.CX + Math.cos(pe.a) * 110; pe.y = Rink.CY + Math.sin(pe.a * 2) * 55; pe.heading = pe.a + 1; }
      for (const s of m.sk) { if (s.state === 'check' && pe.down <= 0 && Math.hypot(s.x - pe.x, s.y - pe.y) < 16) { pe.down = 3; pe.state = 'down'; Sim.addBoom(m, s.side, 10); Sim.emit('mascot_down', { s }); } else if (Math.hypot(s.x - pe.x, s.y - pe.y) < 12 && pe.down <= 0) { const d = Math.hypot(s.x - pe.x, s.y - pe.y) || 1; s.vx += (s.x - pe.x) / d * 60; s.vy += (s.y - pe.y) / d * 60; } }
      m.dropT -= dt; if (m.phase === 'play' && m.arena.id === 'mall' && m.dropT <= 0) { m.dropT = 40; const it = throwItem(m, m.arena.items[(RNG.sim() * 6) | 0]); it.x = Rink.CX; it.y = Rink.CY; it.drop = true; Sim.emit('discount_drop', {}); }
    }
    if (m.cfg.octoRain && m.phase === 'play' && RNG.sim() < dt * .25) m.octos.push({ x: Rink.CX + (RNG.sim() - .5) * 600, y: Rink.CY + (RNG.sim() - .5) * 300, t: 14 });
  }
  function breakIceAt(m, x, y, dmg) { for (const t of m.thin) if (!t.hole && ((x - t.x) / (t.rx + 6)) ** 2 + ((y - t.y) / (t.ry + 6)) ** 2 < 1) { t.hp -= dmg; if (t.hp <= 0) { t.hole = true; t.re = 30; Sim.emit('thin_ice_break', { t, x, y }); } } }
  return { step, throwItem, applyItem, breakIceAt };
})();

/* ---- BOOM / KABOOM ---- */
const Boom = (() => {
  function step(m, dt) {
    for (const s of [0, 1]) { if (m.kaboom[s] > 0 && m.phase === 'play') { m.kaboom[s] -= dt; if (m.kaboom[s] <= 0) { m.kaboom[s] = 0; Sim.emit('kaboom_end', { side: s }); } } }
    if (m.cfg.alwaysKaboom) for (const h of m.humans) if (m.kaboom[h.side] < 1) m.kaboom[h.side] = 2;
  }
  return { step };
})();

/* ---- FIGHTS ---- */
const Fight = (() => {
  const dmgMul = s => .8 + .067 * s.rt.fgt;
  function canChallenge(m, a, b) { return m.phase === 'play' && !m.fight && m.fightCount < T.fightMax && m.t - m.lastFight > 60 / 4 && a.state !== 'bin' && b.state !== 'bin'; }
  function begin(m, a, b) {
    m.fight = { a, b, ba: T.fightBalance, bb: T.fightBalance, sa: 100, sb: 100, t: 0, winner: null, end: 0, cpuT: 0, ha: {}, hb: {}, yanksA: [], yanksB: [], hoodA: 0, hoodB: 0, winT: 0, stale: 0 };
    m.fightCount++; m.stats.fights++; m.lastFight = m.t; m.phase = 'fight'; m.phaseNoPlay = true; Puck.release(m, m.puck.owner); m.puck.vx = m.puck.vy = 0; m.puck.owner = null;
    for (const s of [a, b]) { s.state = 'fight'; s.st = 99; s.vx = s.vy = 0; s.hasPuck = false; s.fightAct = null; s.fightT = 0; s.fightU = 0; s.duck = 0; s.stagger = 0; s.guardBroken = 0; }
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; a.x = mx - 10; b.x = mx + 10; a.y = b.y = my; a.heading = 0; b.heading = PI;
    m.fight.cx = mx; m.fight.cy = my;
    Sim.emit('fight_start', { a, b });
  }
  function act(m, f, who, kind) {
    const s = who === 'a' ? f.a : f.b, o = who === 'a' ? f.b : f.a, st = who === 'a' ? 'sa' : 'sb';
    if (s.fightAct || s.stagger > 0) return false; const slow = f[st] <= 0 ? 1.4 : 1;
    const def = { jab: [.25 * slow, 8, 'jab'], hay: [.35 * slow + .1 + .35, 22, 'haymaker'], duck: [.35, 10, 'duck'], yank: [.3 * slow, 0, 'yank'] }[kind];
    if (!def || f[st] < def[1] * .3 && kind !== 'yank') return false; if (s.fightCool > 0) return false;
    f[st] = Math.max(0, f[st] - def[1]); s.fightAct = { kind, t: 0, dur: def[0], hit: false, wind: kind === 'hay' ? .35 * slow : 0 }; s.fightCool = .1;
    return true;
  }
  function stepSide(m, f, who, dt) {
    const s = who === 'a' ? f.a : f.b, o = who === 'a' ? f.b : f.a, tb = who === 'a' ? 'bb' : 'ba', st = who === 'a' ? 'sa' : 'sb', ys = who === 'a' ? f.yanksA : f.yanksB;
    s.fightCool = Math.max(0, (s.fightCool || 0) - dt); s.stagger = Math.max(0, s.stagger - dt); s.guardBroken = Math.max(0, s.guardBroken - dt); f[st] = Math.min(100, f[st] + 25 * dt);
    const a = s.fightAct; s.duck = a && a.kind === 'duck' ? 1 : 0;
    if (!a) return; a.t += dt; const u = a.t / a.dur; s.fightU = clamp(u, 0, 1);
    const hitAt = a.kind === 'hay' ? a.wind / a.dur + .1 : a.kind === 'jab' ? .4 : .5;
    if (!a.hit && u >= hitAt && (a.kind === 'jab' || a.kind === 'hay' || a.kind === 'yank')) {
      a.hit = true; const oa = o.fightAct; let dmg = 0;
      if (a.kind === 'jab') { dmg = oa && oa.kind === 'duck' ? 3 : 6; }
      if (a.kind === 'hay') { dmg = oa && oa.kind === 'duck' ? 0 : 18 + clamp(a.t * 10, 0, 6); if (!dmg) { s.stagger = .5; s.fightAct = null; s.fightWhiff = true; Sim.emit('fight_whiff', { s }); return; } }
      if (a.kind === 'yank') { if (!(oa && oa.kind === 'duck')) { f[who === 'a' ? 'sb' : 'sa'] = Math.max(0, f[who === 'a' ? 'sb' : 'sa'] - 15); o.guardBroken = .6; ys.push(m.t); while (ys.length && m.t - ys[0] > 4) ys.shift(); if (ys.length >= 3) { ys.length = 0; o.hood = true; f[who === 'a' ? 'hoodB' : 'hoodA'] = 1.5; Sim.emit('fight_hood', { s: o }); } Sim.emit('fight_yank', { s, o }); } return; }
      dmg *= dmgMul(s) * (o.guardBroken > 0 ? 1.2 : 1) * (f[who === 'a' ? 'hoodB' : 'hoodA'] > 0 ? 0 : 1); if (a.kind === 'hay' && o.guardBroken > 0) dmg *= 1.2;
      f[tb] -= dmg; o.stagger = a.kind === 'jab' ? .12 : .3; Sim.emit('fight_hit', { s, o, kind: a.kind, dmg });
    }
    if (u >= 1) { s.fightAct = null; s.fightU = 0; }
  }
  function cpuThink(m, f, who, dt) {
    const s = who === 'a' ? f.a : f.b, o = who === 'a' ? f.b : f.a; if (s.ctrl.kind !== 'cpu' && !s.fightAuto) return;
    s.cpuT = (s.cpuT || 0) - dt; const oa = o.fightAct; const skill = clamp(s.skill || .5, .2, 1) * (m.cfg.practice === 'spar' && s.side === 1 ? .3 : 1);
    if (oa && oa.kind === 'hay' && oa.t < oa.dur * .6 && !s.fightAct && !s.cpuDucked) { s.cpuDucked = true; if (RNG.sim() < skill) act(m, f, who, 'duck'); }
    if (!oa || oa.kind !== 'hay') s.cpuDucked = false;
    if (s.cpuT > 0) return; s.cpuT = lerp(.7, .3, skill) * (m.cfg.practice === 'spar' && s.side === 1 ? 2.4 : 1) * (.7 + RNG.sim() * .6);
    const r = RNG.sim(); act(m, f, who, r < .55 ? 'jab' : r < .8 ? 'hay' : 'yank');
  }
  function step(m, dt) {
    const f = m.fight; if (!f) return; f.t += dt; const { a, b } = f;
    f.hoodA = Math.max(0, f.hoodA - dt); f.hoodB = Math.max(0, f.hoodB - dt); if (f.hoodA <= 0) a.hood = false; if (f.hoodB <= 0) b.hood = false;
    if (f.winner) { f.end -= dt; if (f.end <= 0) finish(m); return; }
    for (const who of ['a', 'b']) {
      const s = who === 'a' ? a : b;
      if (s.ctrl.kind === 'human' && s.ctrl.input) { const I = s.ctrl.input; if (I.pressed('pass')) act(m, f, who, 'jab'); if (I.pressed('shoot')) act(m, f, who, 'hay'); if (I.pressed('deke')) act(m, f, who, 'duck'); if (I.pressed('lob')) act(m, f, who, 'yank'); }
      else if (s.ctrl.kind === 'remote') { const it = s.intent; const lp = s.lastPress || (s.lastPress = {}); for (const [k, ac] of [['pass', 'jab'], ['shoot', 'hay'], ['deke', 'duck'], ['lob', 'yank']]) if (it.press[k] !== lp[k]) { lp[k] = it.press[k]; act(m, f, who, ac); } }
      else cpuThink(m, f, who, dt);
    }
    stepSide(m, f, 'a', dt); stepSide(m, f, 'b', dt);
    if (f.t > 40) { f.ba = f.bb = 1; }
    if (f.ba <= 0 || f.bb <= 0 || f.t > 40) {
      const w = f.ba <= 0 && f.bb > 0 ? b : f.bb <= 0 && f.ba > 0 ? a : (f.t > 40 ? null : null);
      f.winner = w || 'draw'; f.end = 2.6; const l = w === a ? b : w === b ? a : null;
      if (w) { w.state = 'fight'; l.state = 'fight'; w.stats.fightsWon++; w.stats.fights++; l.stats.fights++; Sim.addBoom(m, w.side, 45); Sim.addBoom(m, l.side, 5); }
      else { Sim.addBoom(m, 0, 10); Sim.addBoom(m, 1, 10); }
      Sim.emit('fight_end', { w, l, draw: !w, a, b });
    }
  }
  function finish(m) {
    const f = m.fight; const { a, b } = f; const w = f.winner === 'draw' ? null : f.winner, l = w ? (w === a ? b : a) : null;
    for (const s of [a, b]) { s.state = 'skate'; s.st = 0; s.fightAct = null; s.hood = false; s.grudge = {}; }
    if (l && !m.cfg.noSinBin) { l.state = 'bin'; l.bin = T.sinBin; l.vx = l.vy = 0; m.sinBin.push(l); Sim.emit('sin_bin', { s: l }); }
    m.fight = null; m.phaseNoPlay = false; const mx = f.cx, my = f.cy; m.phase = 'stoppage'; m.pt = 0; m.after = () => { const d = Rink.nearestDot(mx, my); Match.faceoffNow(d[0], d[1], false); };
    for (const s of m.sk) if (s.state === 'bin') {} Sim.emit('fight_over', { w, l });
  }
  /** challenge detection: a human holding lob near a rival with a grudge */
  function stepChallenges(m, dt) {
    if (m.phase !== 'play' || m.fight || m.cfg.noFight) return;
    for (const s of m.sk) {
      s.fightPrompt = false;
      const human = s.ctrl.kind === 'human' || s.ctrl.kind === 'remote'; 
      for (const o of m.sk) {
        if (o.side === s.side || o.state === 'bin') continue; const d = Math.hypot(o.x - s.x, o.y - s.y); if (d > 40) continue;
        const g = Math.max(s.grudge[o.id] || 0, o.grudge[s.id] || 0);
        if (g < 40) continue;
        if (human) { s.fightPrompt = true; if (s.intent.lobHeld && !s.hasPuck) { s.holdLob = (s.holdLob || 0) + dt; if (s.holdLob >= .5 && canChallenge(m, s, o)) { s.holdLob = 0; challenge(m, s, o); } } else s.holdLob = 0; }
        else if (s.rt.fgt >= 4 && g >= 60 && canChallenge(m, s, o) && RNG.sim() < dt * .6) challenge(m, s, o);
      }
    }
  }
  function challenge(m, a, b) {
    Sim.emit('challenge', { a, b });
    const bh = b.ctrl.kind === 'human' || b.ctrl.kind === 'remote';
    if (bh) { m.pendingChallenge = { a, b, t: 3 }; return; }
    const g = Math.max(a.grudge[b.id] || 0, b.grudge[a.id] || 0), accept = clamp(.4 + .12 * (b.rt.fgt - 3) + g / 200, .1, .95) + (m.cfg.forceFight ? 1 : 0) + (m.cfg.story && m.cfg.story.id === 3 && ['bruisers'].includes(b.team.id) ? 1 : 0);
    if (RNG.sim() < accept) begin(m, a, b); else turtle(m, b, a);
  }
  function turtle(m, loser, ch) { Sim.addBoom(m, loser.side, -10); m.boom[loser.side] = Math.max(0, m.boom[loser.side]); Sim.addBoom(m, ch.side, 10); Sim.emit('turtle', { s: loser }); a_clear(m); }
  const a_clear = m => { m.pendingChallenge = null; };
  function stepPending(m, dt) {
    const pc = m.pendingChallenge; if (!pc) return; pc.t -= dt; const b = pc.b; if (b.intent.lobHeld) { b.holdAcc = (b.holdAcc || 0) + dt; if (b.holdAcc > .4) { b.holdAcc = 0; m.pendingChallenge = null; begin(m, pc.a, b); } } else b.holdAcc = 0;
    if (pc.t <= 0) { m.pendingChallenge = null; turtle(m, b, pc.a); }
  }
  return { begin, step, stepChallenges, stepPending, challenge, canChallenge };
})();

/* ---- 28-flow.js ---- */
/* ---- FLOW: the fixed step of a match, phases, goals, periods ---- */
const Flow = (() => {
  const CELEB = ['fist', 'snipe', 'knee', 'guitar', 'glass'];
  function cpuAndHumans(m, dt) {
    for (const h of m.humans) if (!h.remote) Match.humanIntent(m, h, dt);
    Match.autoSwitch(m);
    for (const h of m.humans) { if (h.sk) { Match.applyHuman(m, h); if (m.cfg.autoHuman && (m.phase === 'play' || (m.phase === 'faceoff' && m.fo && m.fo.dropped))) AI.think(m, h.sk, dt); } }
    for (const s of m.sk) if (s.ctrl.kind === 'cpu' && !m.cfg.freezeAI) {
      if (m.phase === 'play' || (m.phase === 'faceoff' && m.fo && m.fo.dropped)) AI.think(m, s, dt);
      else if (m.phase === 'faceoff') AI.park(m, s, s.tx, s.ty);
      else if (m.phase === 'goal') parkGoal(m, s);
      else if (m.phase === 'fight') parkFight(m, s);
      else if (m.phase === 'stoppage' || m.phase === 'periodEnd' || m.phase === 'final') parkIdle(m, s);
    }
  }
  function parkGoal(m, s) { const sc = m.scorer; if (s === sc) { s.intent.mx = s.intent.my = 0; return; } if (sc && s.side === sc.side) AI.park(m, s, sc.x - Math.cos(sc.heading) * 14 + (s.slot - 1) * 16, sc.y + (s.slot - 1) * 14); else { const it = s.intent; it.mx = it.my = 0; } }
  function parkFight(m, s) { const f = m.fight; if (!f || s === f.a || s === f.b) return; const a = Math.atan2(s.y - f.cy, s.x - f.cx), tx = f.cx + Math.cos(a) * 52, ty = f.cy + Math.sin(a) * 40; AI.park(m, s, tx, ty); }
  function parkIdle(m, s) { const it = s.intent; it.mx *= .9; it.my *= .9; if (Math.hypot(s.vx, s.vy) < 6) { it.mx = it.my = 0; } }
  // ----------- movement -----------
  function move(m, dt) {
    const sk = m.sk;
    for (const s of sk) {
      s.pickCool = Math.max(0, s.pickCool - dt); s.hitT = Math.max(0, s.hitT - dt); s.flipT = Math.max(0, s.flipT - dt); s.spin = Math.max(0, (s.spin || 0) - dt);
      if (s.dekeBeat) { s.dekeBeat.t -= dt; if (s.dekeBeat.t <= 0) s.dekeBeat = null; }
      if (s.state === 'bin') { s.bin -= dt; s.x = (s.side ? Rink.CX + 36 : Rink.CX - 36); s.y = Rink.Y0 - 20; s.vx = s.vy = 0; if (s.bin <= 0) { s.state = 'skate'; s.st = 0; s.x = s.side ? Rink.CX + 40 : Rink.CX - 40; s.y = Rink.Y0 + 10; m.sinBin = m.sinBin.filter(x => x !== s); Sim.emit('bin_out', { s }); } continue; }
      if (s.state !== 'fight' && s.state !== 'celebrate') s.st -= dt;
      let it = s.intent, extra = { infiniteTurbo: s.items.hotsauce > 0 || m.kaboom[s.side] > 0 || m.cfg.infTurbo && s.ctrl.kind === 'human', speedMul: (m.tactic[s.side] === 'finesse' ? 1.04 : 1) * (s.items.cocoa > 0 ? 1.2 : 1) * (m.cfg.story && m.cfg.story.id === 5 && s.side === 1 && m.period >= 3 && m.boostOn ? 1.1 : 1) * (m.doris && m.doris.t > 0 && s.side === 0 ? m.doris.mul : 1) };
      if (s.hasPuck) {} s.turboOn = false;
      switch (s.state) {
        case 'pass': case 'shoot': if (s.st <= 0) s.state = 'skate'; break;
        case 'check': if (s.st <= 0) s.state = 'skate'; else { extra.turnMul = .35; } break;
        case 'deke': if (s.st <= 0) s.state = 'skate'; else extra.noStop = true; break;
        case 'poke': if (s.st <= 0) { s.state = 'skate'; s.pokeDone = false; } else { extra.speedMul *= .85; } break;
        case 'stun': if (s.st <= 0) s.state = 'skate'; else extra.speedMul *= .4; break;
        case 'down': it = { mx: 0, my: 0, turbo: false }; { const sp = Math.hypot(s.vx, s.vy); const k = Math.max(0, sp - 220 * dt) / (sp || 1); s.vx *= k; s.vy *= k; } if (s.st <= 0) { s.state = 'getup'; s.st = .5; } break;
        case 'getup': it = { mx: 0, my: 0, turbo: false }; s.vx *= .9; s.vy *= .9; if (s.st <= 0) s.state = 'skate'; break;
        case 'slip': it = { mx: 0, my: 0, turbo: false }; if (s.st <= 0) { s.state = 'getup'; s.st = .5; } break;
        case 'frozen': s.vx = s.vy = 0; if (s.st <= 0) { s.state = 'skate'; s.y -= 30; } break;
        case 'buried': s.vx = s.vy = 0; if (s.st <= 0) s.state = 'skate'; break;
        case 'fight': case 'celebrate': it = { mx: 0, my: 0, turbo: false }; { const sp = Math.hypot(s.vx, s.vy), k = Math.max(0, sp - 160 * dt) / (sp || 1); s.vx *= k; s.vy *= k; } break;
        case 'wind': break;
      }
      if (s.state === 'down' || s.state === 'getup' || s.state === 'slip' || s.state === 'frozen' || s.state === 'buried' || s.state === 'fight' || s.state === 'celebrate') { s.x += s.vx * dt; s.y += s.vy * dt; if (s.state !== 'frozen' && s.state !== 'buried') s.turbo = Math.min(1, s.turbo + dt * .1); }
      else {
        const ev = Skating.skateStep(s, it, dt, extra);
        if (ev.includes('stop')) Sim.emit('stop', { s });
        if (s.state === 'check') { /* hold heading toward lunge */ }
        s.x += s.vx * dt; s.y += s.vy * dt;
      }
      const sp = Math.hypot(s.vx, s.vy); Rink.addScuff(s.x, s.y, .0025 * sp / 132 * 60 * dt, m.kaboom[s.side] > 0 ? .05 * dt * 60 : 0);
      if (s.state === 'stop') Rink.addScuff(s.x, s.y, .12 * dt * 12);
      if (m.kaboom[s.side] > 0 && sp > 60 && RNG.fx() < .3) Sim.emit('kaboom_skate', { s });
    }
    // skater-skater pushes
    for (let i = 0; i < sk.length; i++) for (let j = i + 1; j < sk.length; j++) {
      const a = sk[i], b = sk[j]; if (a.state === 'bin' || b.state === 'bin' || a.state === 'fight' && b.state === 'fight') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = 14; if (d >= md || d < .01) continue;
      const nx = dx / d, ny = dy / d, ov = md - d, ma = a.mass, mb = b.mass, tot = ma + mb;
      a.x -= nx * ov * mb / tot; a.y -= ny * ov * mb / tot; b.x += nx * ov * ma / tot; b.y += ny * ov * ma / tot;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) { const j2 = -(1.3) * vn / (1 / ma + 1 / mb); a.vx -= j2 / ma * nx; a.vy -= j2 / ma * ny; b.vx += j2 / mb * nx; b.vy += j2 / mb * ny;
        if (-vn > T.accidentalHit && a.side !== b.side && a.state !== 'check' && b.state !== 'check') { for (const [x, y] of [[a, b], [b, a]]) if (['skate', 'stop'].includes(x.state) && Math.hypot(x.vx, x.vy) < 120 && RNG.sim() < .7) { x.state = 'stun'; x.st = .5; } Sim.emit('accident', { a, b }); } }
    }
    for (const s of sk) {
      if (s.state === 'bin') continue;
      const cb = Rink.clampBody(s, 7);
      if (cb) { const vn = s.vx * cb.n[0] + s.vy * cb.n[1]; if (vn > 0) { const snow = m.arena.id === 'pond'; Hits.boardHit(m, s, vn, cb.n); s.vx -= (1 + (snow ? .3 : .3)) * vn * cb.n[0]; s.vy -= (1 + .3) * vn * cb.n[1]; const tx = -cb.n[1], ty = cb.n[0], vt = s.vx * tx + s.vy * ty; s.vx -= vt * .15 * tx; s.vy -= vt * .15 * ty;
          if (snow && s.hitT > 0 && vn > T.glassCrack * .6 && s.state === 'down') { s.state = 'buried'; s.st = 1.5; Sim.emit('buried', { s }); }
          if (s.rig && vn > 100) s.rig.kick && s.rig.kick(-.4); } }
      // nets and posts
      for (const e of [0, 1]) { const gx = Rink.goalLineX(e), d = e === 0 ? -1 : 1, lo = Math.min(gx, gx + d * (Rink.NETD + 4)) - 6, hi = Math.max(gx, gx + d * (Rink.NETD + 4)) + 6; if (s.x > lo && s.x < hi && Math.abs(s.y - Rink.CY) < Rink.GHALF + 7) { const toFront = (s.x - gx) * -d; if (toFront > -2 || (s.x - gx) * d < 4) { s.x = gx - d * 8; s.vx *= .3; } else { s.x = gx + d * (Rink.NETD + 11); s.vx *= .3; } } }
      for (const g of m.gl) { const dx = s.x - g.x, dy = s.y - g.y, d = Math.hypot(dx, dy), md = 7 + 8; if (d < md && d > .01) { s.x += dx / d * (md - d); s.y += dy / d * (md - d); } }
      if (s.state === 'down' && s.hitT > 0 && m.thin.length) Items.breakIceAt(m, s.x, s.y, s.hitBig ? 100 : 50);
    }
    // referee drifts away from play
    const r = m.ref, p = m.puck, tx = p.x - Math.sign(p.x - Rink.CX) * 40 + 0, ty = Rink.CY - 50 * Math.sign(p.y - Rink.CY || 1);
    if (m.phase === 'faceoff' && m.fo) { r.x += (m.fo.x - r.x) * .1; r.y += (m.fo.y - 14 - r.y) * .1; }
    else { r.x += clamp(tx - r.x, -60 * dt, 60 * dt); r.y += clamp(ty - r.y, -60 * dt, 60 * dt); }
    for (const s of sk) { const d = Math.hypot(s.x - r.x, s.y - r.y); if (d < 12 && Math.hypot(s.vx, s.vy) > 120 && r.down <= 0) { r.down = 2; Sim.emit('ref_down', { s }); } } r.down = Math.max(0, r.down - dt);
    const rsp = Math.hypot(r.x - (r.px || r.x), r.y - (r.py || r.y)) / dt; r.vx = (r.x - (r.px || r.x)) / dt; r.vy = (r.y - (r.py || r.y)) / dt; r.px = r.x; r.py = r.y; if (rsp > 5) r.heading = Math.atan2(r.vy, r.vx);
  }
  function animate(m, dt) {
    for (const s of m.sk) {
      const rg = s.rig, st = { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, facing: s.heading + (s.spin > 0 ? (1 - s.spin / .45) * TAU : 0) };
      switch (s.state) {
        case 'down': st.down = .9; st.flip = s.flipT > 0 ? 1 - s.flipT / .8 : undefined; break;
        case 'getup': st.pose = 'kneel'; break;
        case 'slip': st.down = .9; st.flip = .5; break;
        case 'check': st.attack = E.move('bash', clamp(1 - s.st / .3, 0, 1)); st.sprint = true; break;
        case 'poke': st.attack = E.move('thrust', clamp(1 - s.st / .35, 0, 1)); break;
        case 'shoot': case 'pass': st.attack = E.move('backslash', clamp(1 - s.st / .3, 0, 1)); break;
        case 'wind': st.crouch = .3; st.attack = E.move('overhead', .3); break;
        case 'stun': st.pose = 'wave'; st.hurt = true; break;
        case 'stop': st.crouch = .5; break;
        case 'celebrate': st.pose = 'cheer'; st.expr = 'shout'; break;
        case 'fight': { const a = s.fightAct; st.stance = 'guard'; st.expr = 'angry'; if (s.duck) st.crouch = .6; if (a && a.kind === 'jab') st.attack = E.move('jab', s.fightU); else if (a && a.kind === 'hay') st.attack = E.move('haymaker', s.fightU); else if (a && a.kind === 'yank') st.attack = E.move('cross', s.fightU); if (s.stagger > 0) st.hurt = true; const f = m.fight; if (f && f.winner) { const w = f.winner === s; if (w) st.pose = 'cheer'; else if (f.winner !== 'draw') st.down = .9; } break; }
        case 'frozen': st.vx = st.vy = 0; break;
        default: st.sprint = s.turboOn;
      }
      if (s.state === 'skate' && s.hasPuck && Math.hypot(s.vx, s.vy) < 20) st.stance = 'ready';
      if (m.phase === 'final' && !s.hideFinal) { const w = m.score[0] === m.score[1] ? -1 : m.score[0] > m.score[1] ? 0 : 1; if (s.side === w) { st.pose = 'cheer'; } else if (w >= 0) st.pose = 'kneel'; }
      rg._lean = ['skate', 'stop', 'wind', 'shoot', 'pass'].includes(s.state) ? clamp(Math.hypot(s.vx, s.vy) / 132, 0, 1.4) * (s.turboOn ? 1.3 : 1) * .6 : 0;
      rg._skid = s.state === 'stop' ? 1 : 0;
      s.rigState = st; rg.update(dt, st);
    }
    for (const g of m.gl) {
      const st = { x: g.x, y: g.y, z: 0, vx: 0, vy: 0, facing: g.heading };
      if (g.state === 'butterfly' || g.state === 'stack') { st.crouch = 1; } else if (g.state === 'glove') { st.pose = 'wave'; } else if (g.state === 'blasted') st.down = .9; else if (g.state === 'cover') st.crouch = .8; else st.crouch = .35 + (Math.sin(m.t * 2) * .05);
      const winner = m.phase === 'final' && ((m.score[0] > m.score[1] ? 0 : 1) === g.side); if (winner) st.pose = 'cheer';
      g.rig._flare = g.state === 'butterfly' || g.state === 'stack' ? 1 : 0;
      g.rig.update(dt, st);
    }
    const r = m.ref; r.rig.update(dt, { x: r.x, y: r.y, z: 0, vx: r.vx || 0, vy: r.vy || 0, facing: r.heading, down: r.down > 0 ? .9 : 0, pose: m.phase === 'goal' ? 'wave' : undefined });
    if (m.mascot) { const pe = m.mascot; pe.rig.update(dt, { x: pe.x, y: pe.y, z: 0, vx: Math.cos(pe.heading) * 40, vy: Math.sin(pe.heading) * 40, facing: pe.heading, down: pe.down > 0 ? .9 : 0, pose: pe.state === 'dance' ? undefined : undefined }); }
  }
  // ----------- the step -----------
  function step(m, dt) {
    dt *= T.gameSpeed; m.t += dt; m.pt += dt;
    if (m.cfg.remoteClient) return;
    if (m.holdSim) { animate(m, dt); return; }
    const ph = m.phase;
    if (m.phase === 'replay') { Replay.step(m, dt); return; }
    if (m.phase === 'flood') { Flood.step(m, dt); Flow.floodAnimate && 0; animate(m, dt); return; }
    if (m.phase === 'shootout') { shootoutStep(m, dt); return; }
    if (m.pendingChallenge) Fight.stepPending(m, dt);
    cpuAndHumans(m, dt);
    // actions
    for (const s of m.sk) if (s.state !== 'bin') Match.actions(m, s, dt);
    if (m.phase === 'fight') Fight.step(m, dt);
    // faceoff
    if (m.phase === 'faceoff') stepFaceoff(m, dt);
    const live = m.phase === 'play' || m.phase === 'faceoff' || m.phase === 'goal' || m.phase === 'stoppage' || m.phase === 'periodEnd' || m.phase === 'fight' || m.phase === 'final' || m.phase === 'intro';
    if (live) move(m, dt);
    if (m.phase === 'play' || m.phase === 'goal' || m.phase === 'fight' || m.phase === 'faceoff') { Puck.step(m, dt); for (const g of m.gl) { if (m.cfg.noGoalie) { g.x = Rink.X0 - 100; g.y = Rink.Y0 - 100; g.state = 'ready'; } else Goalie.step(m, g, dt); } }
    if (m.phase === 'play' || m.phase === 'fight') { if (m.phase === 'play') Hits.stepChecks(m); Items.step(m, dt); }
    if (m.phase === 'play') Fight.stepChallenges(m, dt);
    for (const side of [0, 1]) m.dekeBite[side] = Math.max(0, m.dekeBite[side] - dt);
    // deke beat detection
    for (const s of m.sk) if (s.dekeBeat && s.dekeBeat.from) { for (const id of s.dekeBeat.from) { const o = m.sk.find(x => x.id === id); if (o && Math.hypot(o.x - s.x, o.y - s.y) > 55 && !s.dekeBeat.done) { s.dekeBeat.done = true; Sim.addBoom(m, s.side, 6); Sim.emit('deke_beat', { s, from: o }); } } }
    Boom.step(m, dt);
    // clock + flow
    if (m.phase === 'play') {
      m.clock -= dt; Ch5.tick(m, dt);
      if (m.puck.out) { m.puck.out = false; stoppage(m, 'out'); }
      else if (m.puck.frozen) { stoppage(m, 'frozen'); }
      else if (m.goalPending) onGoal(m);
      else if (m.clock <= 0) periodEnd(m);
    } else if (m.phase === 'goal' || m.phase === 'faceoff') { if (m.goalPending && m.phase !== 'goal') { m.goalPending = null; } }
    switch (m.phase) {
      case 'intro': if (m.pt > (m.cfg.introLen || 4.2)) { faceoffStart(m); } break;
      case 'goal': stepGoal(m, dt); break;
      case 'stoppage': if (m.pt > 1.6) { if (m.after) { const f = m.after; m.after = null; f(); } else { const d = Rink.nearestDot(m.puck.x, m.puck.y, true); Match.faceoffNow(d[0], d[1]); } } break;
      case 'periodEnd': if (m.pt > 3) afterPeriod(m); break;
      case 'final': if (m.pt > 4.5 && !m.over) { m.over = true; Bus.emit('match_over', { m }); } break;
    }
    // sin bin power-play bookkeeping
    for (const s of m.sk) if (s.state === 'bin' && m.phase !== 'play' && m.phase !== 'faceoff') { /* timer only runs in play */ }
    animate(m, dt);
    Replay.record(m, dt);
    Bus.emit('step', { m, dt });
  }
  function shootoutStep(m, dt) {
    for (const h of m.humans) if (!h.remote) Match.humanIntent(m, h, dt);
    Match.autoSwitch(m); for (const h of m.humans) { if (h.sk && !h.goalieMode) Match.applyHuman(m, h); }
    const so = m.so; if (so && so.shooter && so.shooter.ctrl.kind === 'cpu' && so.state === 'live') AI.think(m, so.shooter, dt);
    else if (so && so.shooter && so.state === 'setup') { so.shooter.intent.mx = so.shooter.intent.my = 0; }
    for (const s of m.sk) { if (s.parked) { s.intent.mx = s.intent.my = 0; s.vx = s.vy = 0; } else if (so && so.state !== 'live' && so.state !== 'setup') { s.intent.mx *= .9; s.intent.my *= .9; } }
    if (so && so.state === 'setup') { for (const s of m.sk) if (!s.parked) { s.intent.mx = s.intent.my = 0; s.vx *= .8; s.vy *= .8; } }
    for (const s of m.sk) if (!s.parked && s.state !== 'bin') { if (!(so && so.state === 'setup')) Match.actions(m, s, dt); }
    const parkedPos = m.sk.filter(s => s.parked).map(s => [s, s.x, s.y]);
    move(m, dt); for (const [s, x, y] of parkedPos) { s.x = x; s.y = y; s.vx = s.vy = 0; }
    Puck.step(m, dt); for (const g of m.gl) Goalie.step(m, g, dt); if (so && so.state === 'live') Hits.stepChecks(m);
    Shootout.step(m, dt); Boom.step(m, dt); animate(m, dt); Replay.record(m, dt); Bus.emit('step', { m, dt });
  }
  function stepFaceoff(m, dt) {
    const fo = m.fo; if (!fo) return; fo.t += dt;
    if (!fo.dropped && fo.t >= fo.drop) { fo.dropped = true; fo.dropAt = m.t; m.puck.vz = 60; m.puck.z = 1; Sim.emit('faceoff_drop', {}); }
    if (fo.dropped && !fo.resolved && m.t - fo.dropAt > .22) {
      fo.resolved = true; const cs = [m.sk.find(s => s.side === 0 && s.slot === 0), m.sk.find(s => s.side === 1 && s.slot === 0)];
      const score = [0, 0]; for (const i of [0, 1]) { const c = cs[i]; let tt = fo.press[i]; if (fo.early && fo.early[i]) tt = 9; if (c.ctrl.kind === 'cpu') tt = lerp(.3, .1, c.skill) + RNG.sim() * .12; else if (tt < 0) tt = 9; score[i] = -tt + (c.rt.hnd - 3) * .015 + RNG.sim() * .02; }
      const w = score[0] >= score[1] ? 0 : 1; fo.winner = w; m.stats.faceoffs[w]++; const wc = cs[w], dir = Sim.attackDir(m, w);
      m.noPickup = false; m.puck.vz = 0; m.puck.z = 0; m.puck.vx = -dir * 110 + (RNG.sim() - .5) * 20; m.puck.vy = (RNG.sim() - .5) * 60;
      const mate = m.sk.find(s => s.side === w && s.slot === 2); if (mate && RNG.sim() < .6) { m.puck.vx = -dir * 130; m.puck.vy = (mate.y - m.puck.y) * .8; }
      m.phase = 'play'; m.pt = 0; Sim.emit('faceoff_win', { s: wc, side: w });
    }
  }
  function faceoffStart(m) { Match.faceoffNow(Rink.CX, Rink.CY, true); m.phase = 'faceoff'; }
  function stoppage(m, why) { m.phase = 'stoppage'; m.pt = 0; Sim.emit('whistle', { why }); if (m.cfg.drill) { m.after = () => Drills.respawn(m); return; } if (why === 'frozen') { const g = m.frozenBy; if (g) m.after = () => { const d = Rink.nearestDot(g.x, g.y, true); Match.faceoffNow(d[0], d[1]); }; } }
  // ----------- goals -----------
  function onGoal(m) {
    const gp = m.goalPending; m.goalPending = null; const side = gp.side, p = m.puck;
    m.score[side]++;
    let sc = gp.shooter && gp.shooter.side === side ? gp.shooter : null;
    const mine = p.touches.filter(t => t.side === side); if (!sc) sc = mine[mine.length - 1] || m.sk.find(s => s.side === side);
    const asst = []; for (let i = mine.length - 1; i >= 0 && asst.length < 2; i--) if (mine[i] !== sc && !asst.includes(mine[i]) && (i < mine.length - 1 || mine[i] !== sc)) { if (mine[i] !== sc) asst.push(mine[i]); }
    const pp = m.sinBin.some(s => s.side !== side) && !m.sinBin.some(s => s.side === side);
    sc.stats.goals++; asst.forEach(a => a.stats.assists++);
    const rec = { side, scorer: sc, assists: asst, period: m.period, clock: m.clock, shot: gp.type, fire: gp.fire, pp, deke: sc.dekeBeat != null || gp.type === 'deke', vault: m.gl[1 - side].boss };
    m.stats.goals.push(rec); m.scorer = sc; Sim.addBoom(m, side, 20); m.kaboom[1 - side] = 0;
    for (const h of m.humans) { /* nothing */ }
    m.phase = 'goal'; m.pt = 0; m.noPickup = true; p.owner = null; m.phaseNoPlay = true;
    sc.state = 'celebrate'; sc.st = 99; sc.celeb = CELEB[(RNG.fx() * CELEB.length) | 0]; sc.celebT = 0;
    if (sc.stats.goals === 3) { sc.stats.hat++; Sim.emit('hat_trick', { s: sc }); }
    Sim.emit('goal', rec);
    if (m.arena.hazard && m.arena.hazard.startsWith('octopus') && (m.arena.hazard === 'octopus' || RNG.sim() < .15)) m.octos.push({ x: Rink.CX + (RNG.sim() - .5) * 200, y: Rink.CY + (RNG.sim() - .5) * 120, t: 20, rat: false });
    if (m.arena.hazard === 'octopus' && RNG.sim() < .5) m.octos.push({ x: Rink.CX + (RNG.sim() - .5) * 300, y: Rink.CY + (RNG.sim() - .5) * 140, t: 10, rat: true, vx: 40, vy: 30 });
    m.replayReq = { goal: rec };
  }
  function stepGoal(m, dt) {
    const sc = m.scorer; if (sc) sc.celebT += dt;
    if (!m.replayDone && m.pt > 2.6 && m.cfg.replays !== false && S('replays') !== 'Off' && !m.cfg.noReplay && Replay.canPlay(m)) { m.replayDone = true; Replay.start(m, 'goal'); return; }
    if (m.pt > (m.cfg.goalLen || 3.8)) { m.replayDone = false; m.phaseNoPlay = false; if (sc && sc.state === 'celebrate') { sc.state = 'skate'; sc.st = 0; } afterGoal(m); }
  }
  function afterGoal(m) {
    if (m.cfg.drill) return Drills.respawn(m);
    for (const s of m.sk) if (s.state === 'celebrate') { s.state = 'skate'; }
    Rink.panels.forEach(p => { if (p.st === 2 && RNG.sim() < 1) p.st = 0; });
    if (m.ot && !m.so) { return finalize(m); }
    if (m.cfg.maxGoals && Math.max(...m.score) >= m.cfg.maxGoals) return finalize(m);
    Match.faceoffNow(Rink.CX, Rink.CY, false);
  }
  // ----------- periods -----------
  function periodEnd(m) {
    Sim.emit('horn_period', { period: m.period });
    if (m.ot) { m.phase = 'periodEnd'; m.pt = 0; m.noPickup = true; return; }
    m.phase = 'periodEnd'; m.pt = 0; m.phaseNoPlay = true;
  }
  function afterPeriod(m) {
    m.phaseNoPlay = false; Rink.panels.forEach(p => { if (p.st === 2) p.st = 0; });
    if (m.ot) { if (m.cfg.shootout && !m.cfg.session) return Shootout.begin(m); return finalize(m); }
    if (m.period < m.periods) { const next = () => { m.period++; m.clock = m.cfg.periodLen; m.end = [m.end[1], m.end[0]]; for (const g of m.gl) { /* positions reset in faceoff */ } m.boom = m.boom.map(x => x); Match.faceoffNow(Rink.CX, Rink.CY, true); if (m.cfg.story && m.cfg.story.id === 5) Bus.emit('period_start', { m, period: m.period }); }; if (Flood.wanted(m)) { m.phase = 'flood'; m.pt = 0; Flood.begin(m, next); } else next(); return; }
    if (m.cfg.showcase && m.score[0] !== m.score[1] && !m.showcaseDone) { m.showcaseDone = true; m.bonusSO = true; return Shootout.begin(m); }
    if (m.score[0] === m.score[1]) {
      if (m.cfg.ot) { m.ot = true; m.period = m.periods + 1; m.clock = m.cfg.session ? 60 : 120; m.end = [m.end[1], m.end[0]]; Bus.emit('overtime', {}); Match.faceoffNow(Rink.CX, Rink.CY, true); return; }
      if (m.cfg.shootout) return Shootout.begin(m);
    }
    finalize(m);
  }
  function finalize(m) { m.phase = 'final'; m.pt = 0; m.phaseNoPlay = true; m.puck.owner = null; Sim.emit('final', { score: m.score.slice() }); }
  // ----------- pause menu helpers -----------
  function showInfo() { const m = Match.cur(); if (!m) return; const lines = m.cfg.story ? m.cfg.story.objectives.map(o => (Objectives.done(o.id) ? '★ ' : '- ') + o.text).join('\n') : m.teams[0].name + ' vs ' + m.teams[1].name + '\n' + m.arena.name; try { game.note(lines.split('\n').join('  |  ')); } catch (e) {} }
  function restart() { const cfg = Match.cur() && Match.cur().cfg; if (cfg && Scenes.restartMatch) Scenes.restartMatch(); }
  return { step, move, animate, onGoal, showInfo, restart, finalize, stoppage, parkGoal };
})();

/* ---- 29-modes.js ---- */
/* ---- REPLAY ---- */
const Replay = (() => {
  const BUF = 8 * 60; let frames = [], tick = 0, clips = [];
  function record(m, dt) {
    if (m.phase === 'replay' || m.cfg.remoteClient) return; if ((tick++ & 1)) return;
    const f = { p: [m.puck.x, m.puck.y, m.puck.z], e: m.sk.map(s => [s.x, s.y, s.heading, s.vx, s.vy, s.state, s.fightU || 0, s.hood ? 1 : 0, s.swing > 0 ? 1 : 0, s.st]), g: m.gl.map(g => [g.x, g.y, g.state, g.heading]), fire: m.puck.fire ? 1 : 0 };
    frames.push(f); if (frames.length > BUF) frames.shift();
  }
  const canPlay = m => frames.length > 60;
  function start(m, kind) {
    const n = Math.min(frames.length, 240), clip = frames.slice(-n);
    const saved = { sk: m.sk.map(s => [s.x, s.y, s.heading, s.vx, s.vy, s.state, s.st]), gl: m.gl.map(g => [g.x, g.y, g.state, g.heading]), p: [m.puck.x, m.puck.y, m.puck.z] };
    m.rp = { clip, i: 0, saved, kind }; m.phase = 'replay'; m.pt = 0; Bus.emit('replay_start', { kind });
    const rec = m.stats.goals[m.stats.goals.length - 1]; clips.push({ clip, score: (rec && rec.fire ? 5 : 3) + (rec && rec.shot === 'onetimer' ? 2 : 0) + RNG.fx() }); clips.sort((a, b) => b.score - a.score); clips.length = Math.min(clips.length, 3);
  }
  function apply(m, f) {
    f.e.forEach((e, i) => { const s = m.sk[i]; s.x = e[0]; s.y = e[1]; s.heading = e[2]; s.vx = e[3]; s.vy = e[4]; s.state = e[5]; s.fightU = e[6]; s.hood = !!e[7]; s.st = e[9]; });
    f.g.forEach((e, i) => { const g = m.gl[i]; g.x = e[0]; g.y = e[1]; g.state = e[2]; g.heading = e[3]; });
    m.puck.x = f.p[0]; m.puck.y = f.p[1]; m.puck.z = f.p[2]; m.puck.fire = !!f.fire; m.puck.owner = null;
  }
  function restore(m) { const sv = m.rp.saved; m.sk.forEach((s, i) => { const e = sv.sk[i]; s.x = e[0]; s.y = e[1]; s.heading = e[2]; s.vx = e[3]; s.vy = e[4]; s.state = e[5]; s.st = e[6]; }); m.gl.forEach((g, i) => { const e = sv.gl[i]; g.x = e[0]; g.y = e[1]; g.state = e[2]; g.heading = e[3]; }); m.puck.x = sv.p[0]; m.puck.y = sv.p[1]; m.puck.z = sv.p[2]; m.puck.fire = false; }
  function step(m, dt) {
    const rp = m.rp; if (!rp) { m.phase = 'goal'; return; }
    rp.i += dt * 60 * .5; const f = rp.clip[Math.min(rp.clip.length - 1, rp.i | 0)]; apply(m, f); Flow.animate(m, dt);
    const skip = m.humans.some(h => h.input && (h.input.pressed('pass') || h.input.pressed('confirm')));
    if (rp.i >= rp.clip.length - 1 || skip) { restore(m); m.rp = null; m.phase = 'goal'; m.pt = 99; m.replayDone = true; Bus.emit('replay_end', {}); }
  }
  return { record, canPlay, start, step, reset() { frames = []; tick = 0; }, clips: () => clips, clearClips() { clips = []; } };
})();

/* ---- OBJECTIVES (story) ---- */
const Objectives = (() => {
  let st = {}, cnt = {}, ch = null, off = [];
  function reset(chapter) { st = {}; cnt = {}; ch = chapter; off.forEach(f => f()); off = [];
    if (!chapter) return;
    const done = (id) => { if (!st[id]) { st[id] = true; Bus.emit('objective', { id, text: (chapter.objectives.find(o => o.id === id) || {}).text }); } };
    const on = (t, f) => off.push(Bus.on(t, f)); const m = () => Match.cur();
    on('goal', g => { if (g.side !== 0) return; if (g.shot === 'onetimer') done('onetimer'); if (g.pp) done('ppgoal'); if (g.fire) done('kaboomgoal'); if (g.vault && g.deke) done('vaultdeke'); if (g.scorer.stats.goals >= 3) done('hat'); });
    on('big_hit', e => { if (e.a.side === 0) { cnt.bighits = (cnt.bighits || 0) + 1; if (cnt.bighits >= 3) done('bighits'); } });
    on('frozen', e => { if (e.s.side === 1) done('ice'); }); on('thin_ice_break', e => { /* counted when a rival freezes */ });
    on('kaboom_start', e => { if (e.side === 0) done('kaboom'); });
    on('fight_end', e => { if (e.w && e.w.side === 0) { cnt.fights = (cnt.fights || 0) + 1; if (cnt.fights >= 2) done('fights'); } });
    on('mascot_down', e => { if (e.s.side === 0) done('pete'); });
    on('final', e => { if (e.score[0] > e.score[1]) done('win'); }); on('shootout_end', e => { if (e.win === 0) done('win'); });
  }
  const done = id => !!st[id];
  const stars = () => ch ? ch.objectives.filter(o => st[o.id]).length : 0;
  const progress = (o) => o.need ? (cnt[o.id] || 0) + '/' + o.need : '';
  return { reset, done, stars, progress, state: () => Object.assign({}, st) };
})();

/* ---- CHAPTER 5: Gilded Boost, Doris' organ ---- */
const Ch5 = (() => {
  Bus.on('period_start', e => { const m = e.m || Match.cur(); if (!m || !m.cfg.story || m.cfg.story.id !== 5) return; if (e.period === 3) { m.boostOn = true; UI.toast('GLITTERMAN: Synergy, boys!', '#ffd36a', 3); Synth.babble('Synergy, boys!', 'glitter', { excl: true }); }
    if (e.period === 2 && m.dorisPick === 'doris1') doris(m, false); });
  function doris(m, late) { if (m.doris && m.doris.t > 0) return; m.doris = { t: 20, mul: late ? 1.15 : 1.1 }; Sim.addBoom(m, 0, late ? 45 : 30); UI.banner('DORIS! PLAY THE SONG!', { size: 3, dur: 2.2, y: .3 }); Synth.organ(Synth.ORGAN.charge, 150, .18); Synth.react('chant'); Synth.babble('DORIS! PLAY THE SONG!', 'marge', { excl: true }); Bus.emit('doris', { late }); }
  function tick(m, dt) { if (!m.cfg.story || m.cfg.story.id !== 5) return; if (m.doris && m.doris.t > 0) m.doris.t -= dt; if (m.dorisPick === 'doris2' && m.period === 3 && m.clock <= 60 && !m.dorisLate) { m.dorisLate = true; doris(m, true); } }
  return { tick, doris };
})();

/* ---- SHOOTOUT ---- */
const Shootout = (() => {
  function begin(m) {
    m.phase = 'shootout'; m.pt = 0; m.so = { round: 0, turn: 0, shots: [[], []], clock: 8, state: 'setup', t: 0, order: [[0, 1, 2], [0, 1, 2]], done: false, win: -1 }; m.noPickup = false; m.phaseNoPlay = false;
    for (const s of m.sk) { if (s.state === 'bin') { m.sinBin = m.sinBin.filter(x => x !== s); } s.state = 'skate'; s.st = 0; s.parked = true; s.x = (s.side ? Rink.CX + 90 : Rink.CX - 90) + s.slot * 20; s.y = Rink.Y0 - 6; s.vx = s.vy = 0; s.hasPuck = false; }
    m.end = [0, 1]; Sim.emit('shootout_begin', {}); nextAttempt(m);
  }
  function nextAttempt(m) {
    const so = m.so, side = so.turn, defSide = 1 - side, rd = Math.floor(so.round / 2);
    const sk = Sim.teamOf(m, side)[so.order[side][rd % 3]]; so.shooter = sk; so.goalie = m.gl[defSide]; so.clock = 8; so.t = 0; so.state = 'setup'; so.res = null;
    // shooter at center attacks the defender's goal; set the ends so side's attack goes toward goalie's end
    m.end[defSide] = side === 0 ? 1 : 0; m.end[side] = 1 - m.end[defSide];
    for (const s of m.sk) { s.parked = s !== sk; if (s.parked) { s.x = (s.side ? Rink.X1 - 160 : Rink.X0 + 160) + s.slot * 20; s.y = Rink.Y0 - 10; s.vx = s.vy = 0; s.state = 'skate'; s.intent.mx = s.intent.my = 0; } }
    const dir = Sim.attackDir(m, side); sk.x = Rink.CX - dir * 40; sk.y = Rink.CY; sk.vx = sk.vy = 0; sk.heading = dir > 0 ? 0 : PI; sk.state = 'skate'; sk.turbo = 1;
    const p = m.puck; p.owner = null; p.frozen = false; p.inNet = -1; p.out = false; p.fire = false; p.shotBy = null; p.passTo = null; p.x = sk.x + dir * 11; p.y = sk.y; p.vx = p.vy = p.vz = 0; Puck.take(m, sk);
    for (const g of m.gl) { g.manual = null; g.state = 'ready'; g.save = null; g.x = Sim.ownGoalX(m, g.side) + Sim.attackDir(m, g.side) * 12; g.y = Rink.CY; }
    const hum = m.humans.find(h => h.side === side), hdef = m.humans.find(h => h.side === defSide);
    for (const h of m.humans) { if (h.side === side) Match.switchTo(m, h, sk); }
    if (hdef && hdef.input) { so.goalie.manual = hdef.intent; hdef.goalieMode = true; } for (const h of m.humans) if (h.side === side) h.goalieMode = false;
    Sim.emit('so_attempt', { sk, side });
    m.goalPending = null;
  }
  function result(m, goal) {
    const so = m.so; if (so.res) return; so.res = goal ? 'goal' : 'miss'; so.shots[so.turn].push(goal ? 1 : 0); so.t = 0; so.state = 'result';
    if (goal) { m.puck.owner = null; Sim.emit('so_goal', { side: so.turn, s: so.shooter }); } else Sim.emit('so_miss', { side: so.turn });
  }
  function decided(m) {
    const so = m.so, a = so.shots[0].filter(x => x).length, b = so.shots[1].filter(x => x).length, na = so.shots[0].length, nb = so.shots[1].length;
    if (na <= 3 && nb <= 3 && (na < 3 || nb < 3)) { // can one side no longer catch up?
      if (a + (3 - na) < b) return 1; if (b + (3 - nb) < a) return 0; return -1; }
    if (na === nb && na >= 3 && a !== b) return a > b ? 0 : 1; return -1;
  }
  function step(m, dt) {
    const so = m.so; if (!so || so.done) return; so.t += dt; const p = m.puck;
    if (so.state === 'setup') { if (so.t > 1.4) { so.state = 'live'; so.t = 0; } return; }
    if (so.state === 'live') {
      so.clock -= dt;
      if (m.goalPending) { m.goalPending = null; result(m, true); }
      else if (p.out || p.frozen || (!p.owner && p.shotBy == null && so.t > 1 && Math.hypot(p.vx, p.vy) < 5) || so.clock <= 0 || (so.shooter && Math.abs(p.x - Rink.CX) < 6 && (p.x - so.shooter.x) * Sim.attackDir(m, so.turn) < -20)) { if (!p.owner || so.clock <= 0 || p.frozen || p.out) result(m, false); }
      else if (p.shotBy && !p.owner && Math.hypot(p.vx, p.vy) < 12 && p.inNet < 0) result(m, false);
      else if (p.shotBy && so.t > 4 + 0 && Math.hypot(p.vx, p.vy) < 40) result(m, false);
      return;
    }
    if (so.state === 'result' && so.t > 2.2) {
      const d = decided(m);
      if (d >= 0) { so.done = true; so.win = d; if (!m.bonusSO) { m.score[d]++; m.so.final = true; } else UI.toast('SHOWCASE: ' + (d === 0 ? 'MALL MONEY WON!' : 'MARAUDERS TAKE IT'), '#ffd36a', 3.5); Bus.emit('shootout_end', { win: d }); for (const s of m.sk) s.parked = false; m.phase = 'final'; m.pt = 0; m.phaseNoPlay = true; Sim.emit('final', { score: m.score.slice() }); return; }
      so.round++; so.turn = so.round % 2; nextAttempt(m);
    }
  }
  return { begin, step, nextAttempt };
})();

/* ---- FLOOD WAGON (intermission minigame) ---- */
const Flood = (() => {
  function wanted(m) { if (m.cfg.session || m.cfg.noFlood || m.cfg.flood === false) return false; const s = S('flood'); if (s === 'Never') return false; return m.humans.length > 0; }
  function begin(m, next) {
    m.fl = { x: Rink.X0 + 60, y: Rink.Y1 - 40, a: -PI / 2 * 0 + 0, v: 0, t: 0, dur: 24, state: m.humans.length && S('flood') !== 'Always' ? 'ask' : 'drive', ask: 6, total: Rink.scuffTotal(), next, cleaned: 0, auto: !m.humans.length, honk: 0, score: 0 };
    m.phase = 'flood'; m.pt = 0; if (m.fl.state === 'drive') Sim.emit('flood_start', {}); else Sim.emit('flood_ask', {});
  }
  function step(m, dt) {
    const f = m.fl; if (!f) { m.phase = 'play'; return; }
    f.t += dt; const hum = m.humans.find(h => h.input);
    if (f.state === 'ask') { f.ask -= dt; const I = hum && hum.input; if (I && I.pressed('pass')) { f.state = 'drive'; f.t = 0; Sim.emit('flood_start', {}); } else if ((I && I.pressed('deke')) || f.ask <= 0) { f.state = 'skip'; f.t = 0; } return; }
    if (f.state === 'skip') { Rink.resetScuff(); if (f.t > .6) end(m, 0); return; }
    if (f.state === 'done') { if (f.t > 2.2) end(m, f.score); return; }
    let sx = 0, sy = 0, gas = false;
    if (f.auto) { const tt = f.t * .8; f.targetA = Math.atan2(Math.sin(tt * 2) * 120 + 400 - f.y, Math.cos(tt) * 360 + 560 - f.x); sx = Math.cos(f.targetA); sy = Math.sin(f.targetA); gas = true; }
    else { const I = hum.input, mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]); sx = d[0]; sy = d[1]; gas = I.down('turbo'); if (I.pressed('pass')) { f.honk = .5; Sim.emit('honk', {}); } }
    if (Math.hypot(sx, sy) > .25) { const ta = Math.atan2(sy, sx); f.a += clamp(U.angDiff(f.a, ta), -2.2 * dt, 2.2 * dt); }
    const top = gas ? 90 : 56; f.v += (top - f.v) * Math.min(1, 1.2 * dt);
    f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt; const cb = Rink.clampBody(f, 14); if (cb) { f.a += PI * .6 * dt; f.v *= .9; }
    Rink.clean(f.x, f.y, 26); f.honk = Math.max(0, f.honk - dt);
    if (f.t > f.dur) { const left = Rink.scuffTotal(); f.cleaned = f.total > 0 ? 1 - left / f.total : 1; f.score = f.cleaned > .85 ? 30 : Math.round(f.cleaned * 20); Rink.resetScuff(); f.state = 'done'; f.t = 0; Sim.emit('flood_done', { cleaned: f.cleaned, perfect: f.cleaned > .85 }); }
  }
  function end(m, boomBonus) { const f = m.fl; m.fl = null; if (boomBonus > 25) Sim.addBoom(m, 0, boomBonus); m.phase = 'faceoff'; f.next(); }
  return { wanted, begin, step };
})();

/* ---- 30-present.js ---- */
/* ---- PRESENTATION: camera director, crowd, effects, commentary, HUD, match drawing ---- */
const Cam = (() => {
  let zoom = 1, punch = 0, fx = 0, fy = 0, viewSet = '';
  const want = () => S('camMode') === 'Overhead' ? 'topdown' : 'threequarter';
  function setView(id) { if (viewSet !== id || game.view.id !== id) { viewSet = id; try { game.setView(id); } catch (e) {} } }
  function reset() { viewSet = ''; zoom = 1; punch = 0; }
  function update(m, dt) {
    const p = m.puck; let tx = p.x + p.vx * .25, ty = p.y + p.vy * .25, z = { Near: .95, Normal: .78, Far: .62 }[S('camDist')] || .78, view = want();
    const hs = m.humans.filter(h => h.sk && !h.remote || (h.sk && m.cfg.session && h.seat === AIHubSeat()));
    const mine = HUB ? m.humans.find(h => h.seat === (window.AIHub && AIHub.me)) : null;
    if (mine && mine.sk) { tx = lerp(tx, mine.sk.x, .3); ty = lerp(ty, mine.sk.y, .3); }
    else if (hs.length === 1 && hs[0].sk && Math.hypot(hs[0].sk.x - tx, hs[0].sk.y - ty) > 220) { tx = lerp(tx, hs[0].sk.x, .25); ty = lerp(ty, hs[0].sk.y, .25); }
    else if (hs.length > 1) { let sx = tx, sy = ty, n = 1; for (const h of hs) { sx += h.sk.x; sy += h.sk.y; n++; } const cx = sx / n, cy = sy / n; let sp = 0; for (const h of hs) sp = Math.max(sp, Math.hypot(h.sk.x - cx, h.sk.y - cy)); tx = cx; ty = cy; z *= clamp(1.1 - sp / 700, .78, 1); }
    if (m.phase === 'faceoff') z *= 1.12;
    if (Math.hypot(p.vx, p.vy) > 400) z *= .93;
    if (m.phase === 'fight' && m.fight) { view = 'brawler'; tx = m.fight.cx; ty = m.fight.cy; z = 1.25; }
    else if (m.phase === 'goal' && m.scorer) { tx = lerp(p.x, m.scorer.x, .7); ty = m.scorer.y; z *= 1.25; }
    else if (m.phase === 'replay') { view = 'brawler'; z = 1.0; }
    else if (m.phase === 'intro') { const u = clamp(m.pt / (m.cfg.introLen || 4.2), 0, 1); tx = lerp(Rink.CX - 300, Rink.CX + 300, u); ty = Rink.CY; z = .95; }
    else if (m.phase === 'flood' && m.fl) { tx = m.fl.x; ty = m.fl.y; z = .7; }
    else if (m.phase === 'shootout') { tx = lerp(Rink.CX, Sim.oppGoalX(m, m.so ? m.so.turn : 0), .5); ty = Rink.CY; z *= 1.1; }
    else if (m.phase === 'final' || m.phase === 'periodEnd') { z *= 1.1; }
    punch = Math.max(0, punch - dt * 3);
    zoom += (z * (1 + punch * .1) - zoom) * Math.min(1, dt * 4);
    fx += (tx - fx) * Math.min(1, dt / (m.phase === 'play' ? .15 : .25)); fy += (ty - fy) * Math.min(1, dt / .15);
    if (!isFinite(fx) || Math.abs(fx - tx) > 800) { fx = tx; fy = ty; }
    setView(view); game.setZoom(zoom); game.focus(fx, fy, 6);
  }
  const bump = (v = 1) => { punch = Math.max(punch, v); };
  return { update, bump, reset, snap(x, y) { fx = x; fy = y; }, setView };
})();
const AIHubSeat = () => (window.AIHub && AIHub.me);

const Crowd = (() => {
  let fans = [], exc = 0, wave = -9, arenaId = '';
  const SKIN = ['#e8c4a0', '#c89070', '#8a5a3a', '#f0d0b0', '#a87050'];
  function build(arena) {
    if (arenaId === arena.id) return; arenaId = arena.id; fans = [];
    const add = (x, y, z, k) => { const h = U.hash(x, y), home = h < .7; fans.push({ x, y, z, c: arena.crowd[(h * 13 | 0) % arena.crowd.length], home: h, sk: SKIN[(h * 29 | 0) % 5], ph: h * 40, sign: h > .985 ? ['BARN BURNER', 'KABOOM!', 'MARGE 4 PM', 'SAVE THE ICEBOX', 'PIPESY <3'][(h * 977 | 0) % 5] : null, k }); };
    const hs = [20, 28, 36, 44, 52, 60, 68, 76];
    for (let r = 0; r <= 10; r++) for (let c = 4; c <= 65; c++) for (const dx of [4, 12]) add(c * 16 + dx, r * 16 + 9, hs[clamp(((10 - r) / 1.7 | 0), 0, 7)], 'n');
    for (let c = 1; c <= 6; c++) for (let r = 11; r <= 41; r++) { const z = hs[clamp(((6 - c) / 1.2 | 0), 0, 7)]; add(c * 16 + 5, r * 16 + 4, z, 'w'); add(c * 16 + 11, r * 16 + 12, z, 'w'); }
    for (let c = 63; c <= 68; c++) for (let r = 11; r <= 41; r++) { const z = hs[clamp(((c - 63) / 1.2 | 0), 0, 7)]; add(c * 16 + 5, r * 16 + 4, z, 'e'); add(c * 16 + 11, r * 16 + 12, z, 'e'); }
  }
  function draw(r, m, t) {
    const goalSide = m.phase === 'goal' && m.scorer ? m.scorer.side : -1; const e = exc;
    for (const f of fans) {
      if (!r.visible(f.x, f.y, f.z, 20, 20, 30)) continue;
      let up = Math.sin(t * 2 + f.ph) * .5; if (e > .5) up += Math.abs(Math.sin(t * (4 + e * 4) + f.ph)) * e * 2.2; if (goalSide >= 0) up += Math.abs(Math.sin(t * 9 + f.ph)) * 4; if (m.phase !== 'goal' && t - wave < 3 && Math.abs((f.x / 1120) * 3 - (t - wave)) < .3) up += 5;
      r.queue(f.x, f.y, f.z + up, g => { const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, f.c); px.rect(g, X - 1, Y - 8, 3, 3, f.sk); if (up > 3) { px.rect(g, X - 3, Y - 9, 1, 4, f.sk); px.rect(g, X + 3, Y - 9, 1, 4, f.sk); } if (f.sign && m.phase !== 'intro') { px.rect(g, X - 8, Y - 17, 16, 7, '#f4f0e0'); E.font.text(g, f.sign.slice(0, 7), X, Y - 16, '#222', { align: 'center', font: 'tiny', outline: false }); } });
    }
  }
  const setExc = v => { exc = clamp(v, 0, 1); };
  return { build, draw, add(v) { exc = clamp(exc + v, 0, 1); }, step(dt) { exc = Math.max(0, exc - dt * .08); }, get exc() { return exc; }, wave() { wave = game.time; }, reset() { exc = 0; } };
})();

const Talk = (() => {
  let dlg = null, bubbles = [], lastSay = -99, lastType = {}, lastLine = {}, quiet = 0, tipsShown = {}, tip = null;
  const booth = () => ({ chuck: Rigs.portrait && Rigs.PEOPLE.chuck, moose: Rigs.PEOPLE.moose });
  let portraits = null;
  function init() { dlg = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a', alpha: .85, speed: 40 }); }
  function fill(s, v) { return s.replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : ''); }
  function say(type, vars = {}, o = {}) {
    if (S('commentary') === 'Off') return; const m = Match.cur(); const now = game.time; const pool = TEXT.talk[type]; if (!pool) return;
    if (now - lastSay < (o.force ? 0 : 1.2) || now - (lastType[type] || -99) < (o.cool != null ? o.cool : 6)) return;
    let line = pool[(RNG.fx() * pool.length) | 0]; for (let i = 0; i < 4 && lastLine[line] && now - lastLine[line] < 120; i++) line = pool[(RNG.fx() * pool.length) | 0];
    lastLine[line] = now; lastType[type] = now; lastSay = now; quiet = 0;
    let who = 'CHUCK'; if (/^Moose:/.test(line)) { who = 'MOOSE'; line = line.replace(/^Moose:\s*/, ''); }
    const text = fill(line, vars); speak(who, text);
  }
  function speak(who, text, o = {}) {
    const vk = who === 'MOOSE' ? 'moose' : 'chuck';
    if (S('subtitles') === 'Off' || !dlg) { Synth.babble(text, vk, { excl: /!/.test(text) }); return; }
    if (!portraits) portraits = { CHUCK: Rigs.PEOPLE.chuck(), MOOSE: Rigs.PEOPLE.moose() };
    dlg.voice = Synth.dialogVoice(vk);
    dlg.say(text, { name: who, portrait: portraits[who], auto: o.auto || 2.5, modal: false, alpha: .85 });
  }
  function bubble(s, text) { bubbles.push({ s, text, t: 2 }); if (bubbles.length > 4) bubbles.shift(); Synth.babble(text, s.def[10], { excl: true }); }
  function update(dt) {
    if (dlg) dlg.update(dt); for (const b of bubbles) b.t -= dt; bubbles = bubbles.filter(b => b.t > 0);
    const m = Match.cur(); if (m && m.phase === 'play') { quiet += dt; if (quiet > 14 && game.time - lastSay > 8) { quiet = 0; say('filler', {}, { cool: 30 }); } }
  }
  function draw(r) {
    for (const b of bubbles) { const s = b.s; r.queue(s.x, s.y, 60, g => { const [x, y] = r.w(s.x, s.y, 58), lines = E.font.wrap(b.text, 90, { font: 'tiny' }), h = lines.length * 7 + 4, w = 94; const X = Math.round(x - w / 2), Y = Math.round(y - h - 4); px.rect(g, X, Y, w, h, '#fffbe8'); px.rect(g, X, Y, w, 1, '#222'); px.rect(g, X, Y + h - 1, w, 1, '#222'); px.rect(g, X, Y, 1, h, '#222'); px.rect(g, X + w - 1, Y, 1, h, '#222'); lines.forEach((l, i) => E.font.text(g, l, X + 3, Y + 2 + i * 7, '#222', { font: 'tiny', outline: false })); }, { emissive: true }); }
    if (dlg) dlg.draw(r);
  }
  function showTip(key, chipsOnly) {
    if (S('tips') === 'Off' || tipsShown[key] || !TEXT.tips[key]) return; tipsShown[key] = true; try { E.store.set('ihk:tips', tipsShown); } catch (e) {} tip = { text: TEXT.tips[key], t: 5 };
  }
  function drawTip(g, r, dt) { if (!tip) return; tip.t -= dt; if (tip.t <= 0) { tip = null; return; } const tw = Glyphs.width(tip.text), w = Math.min(r.W - 8, tw + 16); UI.box(g, r.W / 2 - w / 2, 38, w, 16, { border: '#4fe3a1', alpha: .92 }); Glyphs.text(g, tip.text, r.W / 2, 46, { align: 'center', color: '#e8fff0' }); }
  return { init, say, speak, bubble, update, draw, showTip, drawTip, reset() { bubbles = []; tip = null; lastType = {}; lastSay = -99; quiet = 0; if (dlg) dlg.close && dlg.close(); }, loadTips() { try { tipsShown = E.store.get('ihk:tips', {}) || {}; } catch (e) { tipsShown = {}; } }, resetTips() { tipsShown = {}; try { E.store.set('ihk:tips', {}); } catch (e) {} } };
})();

/* ---- 31-fx.js ---- */
/* ---- FX: simulation events become sights and sounds (never feeds back into the sim) ---- */
const Fx = (() => {
  const P = () => game.particles, M = () => Match.cur();
  let on = false, flash = { t: 0, c: '#fff' };
  const nm = s => s ? s.nick : '', tm = s => s ? s.team.name.split(' ').pop() : '';
  function hook() {
    if (on) return; on = true;
    const b = (t, f) => Bus.on(t, e => { const m = M(); if (!m || m.silent) return; try { f(e, m); } catch (er) { game.fail('fx ' + t, er); } });
    b('stop', (e) => { P().dust(e.s.x, e.s.y, 1, 10, { color: '#ffffff', speed: 60 }); P().bits(e.s.x, e.s.y, 2, 4, ['#ffffff', '#dcecff']); Synth.sfx('skid'); });
    b('pass', (e) => { Synth.sfx('thwap'); });
    b('shot', (e, m) => { Synth.sfx(e.kind === 'slap' ? 'slap' : e.kind === 'onetimer' ? 'onetimer' : e.kind === 'kaboom' ? 'slap' : 'snap'); if (e.kind !== 'wrist') { P().ring(e.s.x, e.s.y, 4, 18, '#ffffff', .3); } if (e.kab) { Synth.sfx('boomsub'); game.shake(4); Talk.say('kaboomshot', {}, { force: true }); } if (e.kind === 'onetimer') { Talk.say('onetimer', { name: nm(e.s) }); Crowd.add(.15); } Crowd.add(.04); if (m.humans.some(h => h.sk === e.s)) Talk.showTip('shoot'); });
    b('post', (e) => { Synth.sfx(e.bar ? 'ping2' : 'ping'); P().glints(Match.cur().puck.x, Match.cur().puck.y, 8, 6, '#ffffff'); UI.banner('POST!', { size: 2, dur: .9, y: .34, color: ['#ffffff', '#cfe6ff'] }); Talk.say('post'); Crowd.add(.2); Synth.react('ahh'); });
    b('boards', (e) => { Synth.sfx('boards'); });
    b('glass_ping', () => Synth.sfx('glass')); b('net_touch', () => Synth.sfx('net'));
    b('goal_line', (e, m) => { Synth.sfx('net'); });
    b('goal', (e, m) => {
      const s = e.scorer; Synth.horn(e.fire); Crowd.add(.8); Synth.react('cheer'); UI.banner('GOAL!', { size: 5, dur: 2.2, y: .22, color: e.fire ? ['#fff', '#ffcc33', '#ff4a1a'] : ['#fffbe8', '#ffe08a', '#ffb347'] }); game.flash(e.fire ? '#ff9a3a' : '#ffffff', .25, .5); game.shake(e.fire ? 8 : 4);
      setTimeout(() => Synth.organ(Synth.GOALSONG[s.team.id] || Synth.GOALSONG.muskrats, 150, .14), 500);
      P().bits(m.puck.x, m.puck.y, 12, 30, [m.teams[e.side].home.trim, '#ffffff', '#ffd36a', m.teams[e.side].home.cloth]);
      if (e.fire) { P().explosion(m.puck.x, m.puck.y, 8, 3); Synth.sfx('boomsub'); }
      Talk.say('goal', { name: nm(s), team: tm(s), score: m.score.join('-'), shot: e.shot === 'slap' ? 'slapshot' : e.shot === 'onetimer' ? 'one-timer' : e.shot }, { force: true, cool: 0 });
      m.hatsT = 0;
    });
    b('hat_trick', (e, m) => { UI.banner('HAT TRICK!', { size: 4, dur: 2.6, y: .34 }); Talk.say('hat', { name: nm(e.s) }, { force: true }); m.hatsT = 4; Synth.sfx('fanfare'); Crowd.add(1); });
    b('save', (e, m) => { Synth.sfx('thump'); UI.banner('SAVE!', { size: 3, dur: .9, y: .3, color: ['#ffffff', '#9fd3ff'] }); Talk.say('save', { goalie: nm(e.g) }); Crowd.add(.25); Synth.react('ahh'); if (e.froze) { P().glints(e.g.x, e.g.y, 10, 8, '#ffffff'); } });
    b('block', () => { Synth.sfx('thump'); });
    b('big_hit', (e, m) => { Synth.sfx('bighit'); game.hitFx && game.hitFx(e.b.x, e.b.y, 12, { power: 1.2, damage: undefined, text: false }); game.freeze(.07); game.shake(4); Cam.bump(1); P().bits(e.b.x, e.b.y, 8, 12, ['#ffffff', '#cfe8ff']); Synth.react('ohh'); UI.banner('BIG HIT!', { size: 3, dur: 1, y: .3, color: ['#fff', '#ffd36a', '#ff7a3a'] }); Talk.say('hit', { name: nm(e.a), victim: nm(e.b) }); Crowd.add(.4); Talk.showTip('glass'); });
    b('check', (e) => { Synth.sfx('thump'); P().sparks && P().sparks(e.b.x, e.b.y, 10, 5, 0); });
    b('bump', () => Synth.sfx('tock'));
    b('glass_crack', (e) => { Synth.sfx('crack'); P().bits(e.s.x, e.s.y, 20, 8, ['#ffffff', '#cfe8ff']); });
    b('glass_shatter', (e, m) => { Synth.sfx('shatter'); P().bits(e.s.x, e.s.y, 24, 40, ['#ffffff', '#cfe8ff', '#9fd3ff']); game.shake(6); UI.banner('THROUGH THE GLASS!', { size: 3, dur: 1.4, y: .3 }); Talk.say('glass', {}, { force: true }); Crowd.add(.6); });
    b('rattle', (e) => { Synth.sfx('boards', { vol: .5 }); });
    b('kaboom_start', (e, m) => { game.flash('#ff8a2a', .4, .8); game.shake(8); P().explosion(e.side ? Rink.X1 - 100 : Rink.X0 + 100, Rink.Y0 - 14, 10, 3); Synth.sfx('boomsub'); Synth.sfx('fanfare'); UI.banner('KA-BOOM!', { size: 6, dur: 2.4, y: .24, color: ['#fff', '#ffe040', '#ff5a1a'] }); Talk.say('kaboom', { team: tm(m.sk.find(s => s.side === e.side)) }, { force: true }); Synth.react('chant'); Talk.showTip('kaboom'); Crowd.add(1); });
    b('kaboom_skate', (e, m) => { if (RNG.fx() < .35) { P().sparks && P().sparks(e.s.x, e.s.y, 2, 2, e.s.heading + PI); P().fire && P().fire(e.s.x, e.s.y, 1, 1, { size: 1 }); } });
    b('blast', (e, m) => { P().explosion(e.g.x, e.g.y, 10, 3); game.shake(8); game.flash('#ffffff', .15); Synth.sfx('boomsub'); Talk.say('blast', { goalie: nm(e.g) }, { force: true }); });
    b('vault_locked', () => UI.banner('VAULT LOCKED', { size: 3, dur: 1.4, y: .3, color: ['#fff', '#ffd36a'] })); b('vault_cracked', () => { UI.banner('THE VAULT IS CRACKED!', { size: 3, dur: 2, y: .3 }); Synth.sfx('shatter'); });
    b('fight_start', (e, m) => { Synth.sfx('whistle'); UI.banner('FIGHT!', { size: 5, dur: 1.6, y: .22, color: ['#fff', '#ff8a6a', '#e03020'] }); Talk.say('fight', { name: nm(e.a), victim: nm(e.b) }, { force: true }); Synth.organ(Synth.ORGAN.fight, 130); Synth.react('roar'); for (const s of [e.a, e.b]) { P().bits(s.x, s.y, 6, 4, [s.jersey, '#222']); } Crowd.add(1); });
    b('fight_hit', (e) => { Synth.sfx('punch'); P().sparks && P().sparks(e.o.x, e.o.y, 14, 6, 0); if (e.kind === 'hay' || RNG.fx() < .2) P().bits(e.o.x, e.o.y, 14, 2, ['#ffffff']); game.shake(e.kind === 'hay' ? 4 : 1.5); game.freeze(e.kind === 'hay' ? .06 : .03); if (e.kind === 'hay') P().text && P().text(e.o.x, e.o.y, 26, 'WHAM', '#ffd36a', { scale: 1 }); });
    b('fight_whiff', () => Synth.sfx('whiff')); b('fight_yank', () => Synth.sfx('whiff')); b('fight_hood', (e) => { UI.banner('JERSEY OVER THE HEAD!', { size: 2, dur: 1.2, y: .34 }); });
    b('fight_end', (e, m) => { Synth.react('roar'); Talk.say('fightend', { name: e.w ? nm(e.w) : '', victim: e.l ? nm(e.l) : '' }, { force: true }); if (e.w) { UI.banner(nm(e.w) + ' WINS!', { size: 3, dur: 2, y: .24 }); } else UI.banner('DRAW!', { size: 3, dur: 1.6 }); });
    b('sin_bin', (e, m) => { UI.banner('POWER PLAY!', { size: 4, dur: 1.8, y: .34, color: ['#fff', '#7aa7ff'] }); Talk.say('powerplay', { team: tm(m.sk.find(s => s.side !== e.s.side)) }); Synth.organ(Synth.ORGAN.sad, 100); });
    b('turtle', () => { Synth.react('boo'); UI.banner('TURTLED!', { size: 2, dur: 1.2, y: .34 }); }); b('challenge', () => Synth.sfx('mrk'));
    b('whistle', () => Synth.sfx('whistle')); b('horn_period', (e, m) => { Synth.sfx('buzzer'); UI.banner(m.ot ? 'END OF OVERTIME' : 'END OF PERIOD ' + e.period, { size: 3, dur: 2.4, y: .3 }); Talk.say('period', { period: ['1st', '2nd', '3rd'][e.period - 1] || 'period', score: m.score.join('-') }, { force: true }); });
    b('final', (e, m) => { UI.banner('FINAL', { size: 6, dur: 3, y: .26 }); Synth.horn(true); Synth.react('roar'); const w = m.score[0] > m.score[1] ? 0 : 1; Talk.say('final', { team: tm(m.sk.find(s => s.side === w)), score: Math.max(...m.score) + '-' + Math.min(...m.score) }, { force: true }); });
    b('overtime', () => UI.banner('SUDDEN DEATH OVERTIME', { size: 3, dur: 2.4 })); b('shootout_begin', () => { UI.banner('SHOOTOUT!', { size: 5, dur: 2, y: .26 }); Talk.say('shootout', {}, { force: true }); });
    b('so_goal', () => { Synth.horn(false); UI.banner('GOAL!', { size: 4, dur: 1.4 }); Synth.react('cheer'); }); b('so_miss', () => { UI.banner('NO GOAL', { size: 3, dur: 1.2, color: ['#fff', '#9ab'] }); Synth.react('ahh'); });
    b('faceoff_drop', (e, m) => { Synth.sfx('tock'); }); b('faceoff_set', (e, m) => { if (m.phase !== 'intro') Talk.say('faceoff', { arena: m.arena.name }, { cool: 40 }); Synth.organ(Synth.ORGAN.vamp, 150, .1); });
    b('item_throw', (e, m) => { Synth.sfx('throw'); Talk.say('item', {}); Talk.showTip('item'); }); b('item_pick', (e) => { Synth.sfx('pickup'); UI.toast(ITEMS[e.kind].name + '!', ITEMS[e.kind].color, 2); P().glints(e.s.x, e.s.y, 12, 8, ITEMS[e.kind].color); });
    b('slip', (e) => { Synth.sfx('slip'); }); b('mascot_down', (e, m) => { UI.banner('MASCOT DOWN!', { size: 3, dur: 1.6 }); Talk.say('mascot', {}, { force: true }); Synth.sfx('bonk'); }); b('thin_ice_break', (e) => { Synth.sfx('splash'); P().bits(e.x, e.y, 4, 14, ['#1a2a4a', '#9fd3ff']); P().ring(e.x, e.y, 4, 30, '#9fd3ff', .6); }); b('frozen', (e) => { Talk.say('ice', {}, { force: true }); Synth.sfx('splash'); });
    b('chirp', (e) => { Talk.bubble(e.s, e.line); Crowd.add(.05); }); b('deke_beat', (e) => { Talk.say('deke', { name: nm(e.s) }); }); b('deke', (e) => { P().dust(e.s.x, e.s.y, 1, 4, { color: '#ffffff' }); });
    b('takeaway', () => {}); b('pass_complete', (e) => { Synth.sfx('tock'); Crowd.add(.01); });
    b('faceoff_win', () => Synth.sfx('tock')); b('replay_start', () => { UI.banner('REPLAY', { size: 2, dur: 1.5, y: .12, color: ['#fff', '#ff6a6a'] }); }); b('objective', (e) => { UI.toast('★ ' + (e.text || 'OBJECTIVE'), '#ffd36a', 3.5); Synth.sfx('star'); });
    b('flood_start', () => { Talk.say('flood', {}, { force: true }); Talk.showTip('flood'); }); b('honk', () => Synth.sfx('ooga')); b('flood_done', (e) => { UI.banner(e.perfect ? 'PERFECT SHEEN!' : 'NICE ICE', { size: 3, dur: 1.8 }); Synth.sfx('fanfare'); });
    b('step', (e, m) => {
      const pk = m.puck; if (pk.fire && m.phase === 'play') { P().fire(pk.x, pk.y, pk.z + 2, 2, { size: 2 }); game.lights.add(pk.x, pk.y, 12, 90, 1.2, { color: '#ff8a2a' }); }
      Crowd.step(e.dt); Synth.crowdSet(Crowd.exc); Rink.panels.forEach(p => { p.shake = Math.max(0, p.shake - e.dt); });
      if (m.hatsT > 0) { m.hatsT -= e.dt; if (RNG.fx() < .5) P().bits(Rink.X0 + RNG.fx() * (Rink.X1 - Rink.X0), Rink.Y0 + RNG.fx() * 380, 90, 1, ['#222', '#e8e8e8', '#b3262a']); }
      if (m.phase === 'goal' && RNG.fx() < .3) P().bits(Rink.CX + (RNG.fx() - .5) * 700, Rink.CY + (RNG.fx() - .5) * 300, 70, 2, ['#ffd36a', '#ff6a6a', '#6ab0ff', '#ffffff']);
      if (m.phase === 'play' && m.clock < 20 && m.period === m.periods && Math.abs(m.score[0] - m.score[1]) <= 1) Crowd.add(.003);
      for (const s of m.sk) if (s.state === 'frozen' && RNG.fx() < .05) P().glints(s.x, s.y, 12, 2, '#cfefff');
    });
  }
  return { hook };
})();

/* ---- 32-hud.js ---- */
/* ---- LOGOS, HUD and match drawing ---- */
const Logo = (() => {
  // drawn with primitives so any size works: team emblems
  function draw(g, id, cx, cy, s) {
    const t = TEAM[id], a = t.accent, c = t.home.cloth, k = s / 12;
    const d = (x, y, r, col) => px.disc(g, Math.round(cx + x * k), Math.round(cy + y * k), Math.max(1, Math.round(r * k)), col), R = (x, y, w, h, col) => px.rect(g, Math.round(cx + x * k), Math.round(cy + y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), col);
    d(0, 0, 6, '#10131f'); d(0, 0, 5.2, a === c ? '#ffffff' : c);
    if (id === 'muskrats') { d(0, 1, 3.4, '#8a6038'); R(-1.2, 2, 1, 2.5, '#fff'); R(.2, 2, 1, 2.5, '#fff'); d(-1.6, -.4, .6, '#111'); d(1.6, -.4, .6, '#111'); d(-3, -3, 1.2, '#8a6038'); d(3, -3, 1.2, '#8a6038'); }
    else if (id === 'drillers') { px.poly(g, [[cx - 3 * k, cy + 4 * k], [cx, cy - 4.5 * k], [cx + 3 * k, cy + 4 * k]], '#222'); R(-.5, -3, 1, 8, a); d(0, 5, 1, a); }
    else if (id === 'lumberjacks') { d(0, 0, 3.6, '#a0602a'); d(0, 0, 2, '#c88040'); d(0, 0, .8, '#6a3a18'); R(-4, -1, 8, 2, '#111'); }
    else if (id === 'bruisers') { d(0, 0, 3.8, '#222'); d(0, 0, 2.4, a); R(-1.6, -1, 3.2, 2.6, '#222'); }
    else if (id === 'marauders') { R(-4, -1, 8, 4, a); R(-3.6, 3.2, 1, 1, '#fff'); R(2.6, 3.2, 1, 1, '#fff'); R(-4, -4, 1, 4, '#fff'); R(-3, -4, 3, 2, '#111'); }
    else { d(0, 1, 3.2, '#2a2a2a'); d(-2.6, -2, 1.2, '#2a2a2a'); d(2.6, -2, 1.2, '#2a2a2a'); R(-3, -5, 6, 1.4, a); R(-3, -6, 1, 1.4, a); R(2, -6, 1, 1.4, a); R(-3, -6, 6, 0.01, a); }
  }
  return { draw };
})();

const Hud = (() => {
  const mmss = U.mmss;
  function scoreBug(g, r, m) {
    const w = 236, x = r.W / 2 - w / 2, y = 4; UI.box(g, x, y, w, 28, { bg: ['#11172e', '#080b18'], border: '#6a7aaa', alpha: .93 });
    [0, 1].forEach(side => { const t = m.teams[side], bx = side ? x + w - 82 : x + 4; px.rect(g, side ? x + w - 4 : x + 3, y + 3, 1, 22, t.home.trim); Logo.draw(g, t.id, side ? x + w - 18 : x + 18, y + 12, 13); UI.txt(g, t.abbr, side ? x + w - 34 : x + 34, y + 6, '#e8f0ff', { align: side ? 'right' : 'left' }); UI.txt(g, String(m.score[side]), side ? x + w - 78 : x + 70, y + 4, '#fff', { scale: 2, align: side ? 'right' : 'left' });
      const bx0 = side ? x + w - 4 - 78 : x + 4, mx = bx0, bw = 78, f = m.boom[side] / 100, ka = m.kaboom[side] > 0;
      px.rect(g, mx, y + 22, bw, 4, '#05070f'); const col = ka ? (Math.floor(game.time * 10) % 2 ? '#ffe040' : '#ff5a1a') : m.tactic[side] === 'grit' ? '#ff8a3a' : '#ffb347'; px.rect(g, mx, y + 22, Math.round(bw * (ka ? m.kaboom[side] / T.kaboomTime : f)), 4, col); if (ka) UI.txt(g, 'KABOOM ' + Math.ceil(m.kaboom[side]), mx + bw / 2, y + 17, '#ffe040', { align: 'center', font: 'tiny' }); });
    const per = m.ot ? 'OT' : m.so ? 'SO' : ['1ST', '2ND', '3RD', '4TH'][m.period - 1], low = m.phase === 'play' && m.clock < 10;
    UI.txt(g, per, r.W / 2, y + 3, '#9ab', { align: 'center' }); UI.txt(g, m.so ? 'SHOOTOUT' : mmss(Math.max(0, m.clock)), r.W / 2, y + 12, low ? '#ff6a6a' : '#ffffff', { align: 'center', scale: m.so ? 1 : 2 });
    // power play strip
    const bins = m.sinBin; if (bins.length) { const s = bins[0], w2 = 150; UI.box(g, r.W / 2 - w2 / 2, y + 30, w2, 11, { border: '#7aa7ff', alpha: .9 }); UI.txt(g, 'POWER PLAY ' + m.teams[1 - s.side].abbr + ' ' + mmss(s.bin) + ' ' + s.nick, r.W / 2, y + 33, '#bcd4ff', { align: 'center', font: 'tiny' }); }
  }
  function radar(g, r, m) {
    const w = 84, h = 38, x = r.W - w - 8, y = 18;
    UI.box(g, x - 2, y - 2, w + 4, h + 4, { bg: ['#0e1a2e', '#080f1e'], border: '#4a5a8a', alpha: .92 }); const sx = w / (Rink.X1 - Rink.X0), sy = h / (Rink.Y1 - Rink.Y0);
    px.rect(g, x + w / 2, y, 1, h, '#a02a2a'); px.rect(g, x + Math.round(w * .375), y, 1, h, '#2a4aa0'); px.rect(g, x + Math.round(w * .625), y, 1, h, '#2a4aa0');
    for (const s of m.sk) { if (s.state === 'bin' || s.parked) continue; const hum = s.ctrl.kind === 'human' || s.ctrl.kind === 'remote', c = m.teams[s.side].home.trim === '#141414' ? '#888' : s.side ? '#ffffff' : m.teams[s.side].home.trim; const X = Math.round(x + (s.x - Rink.X0) * sx), Y = Math.round(y + (s.y - Rink.Y0) * sy); px.rect(g, X - 1, Y - 1, hum ? 4 : 3, hum ? 4 : 3, s.side ? '#f4f4f4' : m.teams[0].accent); if (hum) px.rect(g, X - 2, Y - 2, 6, 1, E.PLAYER_COLORS[(s.ctrl.input && s.ctrl.input.player || 1) - 1] || '#fff'); }
    px.rect(g, Math.round(x + (m.puck.x - Rink.X0) * sx), Math.round(y + (m.puck.y - Rink.Y0) * sy), 2, 2, '#ffff88');
  }
  function fightHud(g, r, m) {
    const f = m.fight; if (!f) return;
    const draw = (s, bal, sta, side) => { const x = side ? r.W - 8 - 120 : 8, y = 46; UI.box(g, x, y, 120, 34, { border: side ? '#ff8a6a' : '#7aa7ff', alpha: .92 }); const px0 = side ? x + 88 : x + 3; Rigs.face(g, Rigs.pr(s), px0, y + 3, 28, { turn: side ? -.6 : .6, bg: ['#223', '#112'] }); const bx = side ? x + 4 : x + 34; UI.txt(g, s.nick, bx, y + 3, '#fff'); px.rect(g, bx, y + 14, 82, 6, '#05070f'); px.rect(g, bx, y + 14, Math.round(82 * clamp(bal / T.fightBalance, 0, 1)), 6, bal / T.fightBalance > .3 ? '#6ae06a' : '#e05a3a'); px.rect(g, bx, y + 23, 82, 3, '#05070f'); px.rect(g, bx, y + 23, Math.round(82 * sta / 100), 3, '#6ab0ff'); };
    draw(f.a, f.ba, f.sa, 0); draw(f.b, f.bb, f.sb, 1); Glyphs.text(g, '{pass} JAB  {shoot} HAYMAKER  {deke} DUCK  {lob} YANK', r.W / 2, r.H - 20, { align: 'center', color: '#ffe8c8' });
    if (f.winner && f.winner !== 'draw') UI.txt(g, f.winner.nick + ' WINS', r.W / 2, r.H * .45, '#ffd36a', { align: 'center', scale: 3 });
  }
  function prompts(g, r, m) {
    let p = null;
    for (const h of m.humans) { const s = h.sk; if (!s || h.remote) continue; const I = h.input;
      if (m.phase === 'fight') continue;
      if (m.pendingChallenge && m.pendingChallenge.b === s) { p = 'HOLD {lob} TO ACCEPT'; }
      else if (s.fightPrompt) p = 'HOLD {lob} - DROP THE GLOVES';
      else if (s.oneTimerT > 0 || (m.puck.passTo === s && m.puck.passT > 0)) p = '{shoot} ONE-TIMER!';
      else if (m.puck.owner && m.puck.owner.side === s.side && m.puck.owner !== s && m.puck.owner.ctrl.kind === 'cpu') p = '{pass} CALL FOR PASS';
      else if (m.phase === 'faceoff' && s.slot === 0 && m.fo && m.fo.dropped === false) p = '{pass} WIN THE DRAW';
      if (p) { Glyphs.text(g, p, r.W / 2, r.H - 34, { align: 'center', color: '#fff', input: I }); break; } }
  }
  function markers(r, m, dt) {
    for (const h of m.humans) { const s = h.sk; if (!s || s.state === 'bin') continue; const col = E.PLAYER_COLORS[(h.input && h.input.player || h.seat + 1 || 1) - 1] || '#fff', hcol = HUB && window.AIHub && AIHub.players && AIHub.players[h.seat] ? AIHub.players[h.seat].color : col;
      r.decal(g => { const pts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; pts.push(r.w(s.x + Math.cos(a) * 11, s.y + Math.sin(a) * 11, 0)); } for (let i = 0; i < 20; i++) { const a = pts[i], b = pts[(i + 1) % 20]; px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), hcol, 1); } });
      r.queue(s.x, s.y, 50, g => { const [x, y] = r.w(s.x, s.y, 52), X = Math.round(x), Y = Math.round(y); px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], hcol); E.font.text(g, h.input && h.input.name || ('P' + (h.seat + 1)), X, Y - 13, hcol, { align: 'center', font: 'tiny', outline: '#000' });
        px.rect(g, X - 8, Y + 3, 16, 2, '#05070f'); px.rect(g, X - 8, Y + 3, Math.round(16 * s.turbo), 2, s.turbo > .25 ? '#6ab0ff' : '#ff6a6a');
        if (s.winding || s.charge > 0) { px.rect(g, X - 10, Y + 7, 20, 4, '#05070f'); px.rect(g, X - 10, Y + 7, Math.round(20 * s.charge), 4, s.charge >= .95 ? '#ffd36a' : '#ff8a3a'); }
        if (s.items) { let ix = X - 8; for (const k in s.items) if (s.items[k] > 0 && ITEMS[k]) { px.rect(g, ix, Y - 21, 5, 5, ITEMS[k].color); ix += 6; } } }, { emissive: true }); }
  }
  function edgeArrows(g, r, m) { for (const h of m.humans) { const s = h.sk; if (!s || h.remote && false) continue; const [x, y] = r.w(s.x, s.y, 8); if (x < 8 || x > r.W - 8 || y < 40 || y > r.H - 20) { const col = E.PLAYER_COLORS[(h.input && h.input.player || 1) - 1] || '#fff', ax = clamp(x, 12, r.W - 12), ay = clamp(y, 44, r.H - 26); px.disc(g, Math.round(ax), Math.round(ay), 5, col); UI.txt(g, 'P' + (h.input && h.input.player || h.seat + 1), ax, ay - 3, '#000', { align: 'center', font: 'tiny' }); } } }
  function shootoutHud(g, r, m) { const so = m.so; if (!so) return; ['H', 'A'].forEach((n, side) => { const x = r.W / 2 - 60 + side * 70; for (let i = 0; i < Math.max(3, so.shots[side].length); i++) { const v = so.shots[side][i]; px.rect(g, x + i * 10, 46, 9, 9, '#0a0e1e'); UI.txt(g, v === 1 ? '+' : v === 0 ? 'x' : '-', x + i * 10 + 4, 48, v === 1 ? '#6ae06a' : v === 0 ? '#ff6a6a' : '#667', { align: 'center' }); } }); if (so.state === 'live') { UI.txt(g, '' + Math.ceil(so.clock), r.W / 2, 60, '#ffd36a', { align: 'center', scale: 2 }); const hd = m.humans.find(h => h.goalieMode); if (hd) Glyphs.text(g, 'STICK: MOVE   {pass} BUTTERFLY   {shoot} POKE   {deke} DIVE', r.W / 2, r.H - 34, { align: 'center', color: '#fff' }); } }
  function draw(g, r, m, dt) {
    if (m.hideHud) return; const ca = game.cornerArea && game.cornerArea();
    scoreBug(g, r, m); radar(g, r, m); fightHud(g, r, m); prompts(g, r, m); edgeArrows(g, r, m); if (m.so) shootoutHud(g, r, m);
    if (m.phase === 'intro') introCard(g, r, m);
    if (m.phase === 'periodEnd') periodCard(g, r, m);
    if (m.phase === 'replay') { px.rect(g, 0, 0, r.W, 26, '#000'); px.rect(g, 0, r.H - 26, r.W, 26, '#000'); UI.txt(g, 'REPLAY', 12, 8, '#ff6a6a', { scale: 2 }); Glyphs.text(g, '{pass} SKIP', r.W / 2, 12, { align: 'center', color: '#ccc' }); }
    if (m.phase === 'stoppage' && m.pt > .5 && m.pt < 1.7 && !m.over) lowerThird(g, r, m);
    if (m.phase === 'flood' && m.fl) floodHud(g, r, m);
    if (m.phase === 'final') finalCard(g, r, m);
    UI.drawBanners(g, r, dt); UI.drawToasts(g, r, dt); if (['play', 'faceoff'].includes(m.phase)) Talk.drawTip(g, r, dt);
    if (m.phase === 'play' && m.cfg.story) { const o = m.cfg.story.objectives; }
  }
  function lowerThird(g, r, m) { const w = 190, x = 8, y = r.H - 54; UI.box(g, x, y, w, 30, { border: '#6a7aaa', alpha: .9 }); UI.txt(g, 'SHOTS  ' + m.stats.shots[0] + ' - ' + m.stats.shots[1] + '   HITS  ' + m.stats.hits[0] + ' - ' + m.stats.hits[1], x + 6, y + 6, '#cfe0ff'); UI.txt(g, 'FACEOFFS  ' + m.stats.faceoffs[0] + ' - ' + m.stats.faceoffs[1], x + 6, y + 18, '#9ab'); }
  function introCard(g, r, m) { const u = clamp(m.pt / (m.cfg.introLen || 4.2), 0, .999), idx = Math.floor(u * 6), side = idx < 3 ? 0 : 1, s = Sim.teamOf(m, side)[idx % 3]; if (!s) return; const hw = 110; UI.box(g, r.W / 2 - hw, r.H - 80, hw * 2, 48, { border: m.teams[side].home.trim, alpha: .92 }); Rigs.face(g, Rigs.pr(s), r.W / 2 - hw + 6, r.H - 76, 38, { turn: .5, bg: [m.teams[side].home.cloth, '#10131f'] }); UI.txt(g, '#' + s.num + '  ' + s.nick, r.W / 2 - hw + 52, r.H - 72, '#fff', { scale: 2 }); UI.txt(g, s.name + ' - ' + m.teams[side].abbr, r.W / 2 - hw + 52, r.H - 54, '#9ab'); if (Math.floor(u * 60) % 10 === 0 && !s.said) { s.said = true; Synth.babble('Number ' + s.num + '! ' + s.name + '!', 'ref', { excl: true }); } if (u > .95) for (const q of m.sk) q.said = false; }
  function periodCard(g, r, m) { const w = 200, h = 70, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2 + 20; UI.box(g, x, y, w, h, { border: '#ffd36a' }); UI.txt(g, m.ot ? 'END OF OVERTIME' : 'END OF PERIOD ' + m.period, r.W / 2, y + 6, '#ffd36a', { align: 'center', scale: 2 }); UI.txt(g, m.teams[0].abbr + ' ' + m.score[0] + '    ' + m.teams[1].abbr + ' ' + m.score[1], r.W / 2, y + 26, '#fff', { align: 'center', scale: 2 }); UI.txt(g, 'SHOTS ' + m.stats.shots[0] + '-' + m.stats.shots[1] + '   HITS ' + m.stats.hits[0] + '-' + m.stats.hits[1], r.W / 2, y + 48, '#9ab', { align: 'center' }); }
  function floodHud(g, r, m) { const f = m.fl; if (f.state === 'ask') { UI.box(g, r.W / 2 - 130, r.H / 2 - 20, 260, 40, { border: '#ffd36a' }); Glyphs.text(g, '{pass} DRIVE THE FLOOD WAGON    {deke} SKIP', r.W / 2, r.H / 2 - 4, { align: 'center' }); UI.txt(g, 'INTERMISSION', r.W / 2, r.H / 2 - 16, '#9ab', { align: 'center' }); } else if (f.state === 'drive') { UI.txt(g, 'FLOOD WAGON  ' + Math.ceil(f.dur - f.t), r.W / 2, 40, '#ffd36a', { align: 'center', scale: 2 }); const left = Rink.scuffTotal(); UI.txt(g, 'CLEAN ' + Math.round((1 - left / Math.max(1, f.total)) * 100) + '%', r.W / 2, 58, '#cfe', { align: 'center' }); Glyphs.text(g, '{turbo} GAS   {pass} HONK', r.W / 2, r.H - 20, { align: 'center' }); } else if (f.state === 'done') { UI.txt(g, Math.round(f.cleaned * 100) + '% CLEAN', r.W / 2, r.H / 2, '#fff', { align: 'center', scale: 3 }); } }
  function finalCard(g, r, m) { if (m.pt < 1.2) return; const w = 220, x = r.W / 2 - w / 2, y = r.H / 2 - 20; UI.box(g, x, y, w, 50, { border: '#ffd36a' }); UI.txt(g, m.teams[0].abbr + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].abbr + (m.so && m.so.final ? ' (SO)' : m.ot ? ' (OT)' : ''), r.W / 2, y + 8, '#fff', { align: 'center', scale: 2 }); UI.txt(g, m.score[0] === m.score[1] ? 'A TIE!' : (m.score[0] > m.score[1] ? m.teams[0].name : m.teams[1].name).toUpperCase() + ' WIN', r.W / 2, y + 30, '#ffd36a', { align: 'center' }); }
  return { draw, markers };
})();

const DrawMatch = (() => {
  const TRAIL = [];
  function benches(r, m) {
    const a = m.arena; for (const side of [0, 1]) { const bx = side ? Rink.CX + 72 : Rink.CX - 216, w = 144, y0 = Rink.Y0 - 24, col = m.teams[side].home.trim;
      r.queue(bx + w / 2, y0 + 10, 0, g => { r.box(g, bx, y0, 0, bx + w, y0 + 14, 8, a.id === 'icebox' ? '#8a6a44' : '#3a4256', '#2a3040'); r.box(g, bx, y0 + 10, 8, bx + w, y0 + 14, 22, '#1a2030', '#12182a'); const [x, y] = r.w(bx + w / 2, y0 + 12, 24); E.font.text(g, m.teams[side].abbr, Math.round(x), Math.round(y) - 6, col, { align: 'center', outline: false }); });
      const bin = side ? Rink.CX + 12 : Rink.CX - 60; r.queue(bin + 24, y0 + 10, 0, g => { r.box(g, bin, y0, 0, bin + 48, y0 + 14, 8, '#3a3a48', '#26262e'); });
    }
    // bench spares sit: two per team, plus coach standing
    for (const side of [0, 1]) { const rg = (m._bench = m._bench || [])[side] || ((m._bench[side] = [Rigs.skater(m.teams[side].skaters[0], side, m.teams[side], side === 1), Rigs.skater(m.teams[side].skaters[1], side, m.teams[side], side === 1)])); rg.forEach((rig, i) => { const x = (side ? Rink.CX + 100 : Rink.CX - 190) + i * 30, y = Rink.Y0 - 14; rig.update(1 / 60, { x, y, z: 8, vx: 0, vy: 0, facing: PI / 2, crouch: .7 }); r.actor(x, y, 8, (g, ox, oy) => rig.draw(g, ox, oy, E.charView(r.view))); }); }
  }
  function lights(r, m) {
    const a = m.arena; game.lights.enabled = true; game.lights.ambient = Math.min(.85, a.ambient + .14); const kb = m.kaboom[0] > 0 ? m.teams[0].accent : m.kaboom[1] > 0 ? m.teams[1].accent : null;
    for (let i = 0; i < a.lamps; i++) { const x = Rink.X0 + 120 + i * (Rink.X1 - Rink.X0 - 240) / Math.max(1, a.lamps - 1); game.lights.add(x, Rink.CY + (i % 2 ? 60 : -60), 90, 260, a.id === 'icebox' ? .85 : .75, { color: kb || (a.id === 'mall' ? '#ffd0f0' : a.id === 'pond' ? '#9ac0ff' : a.id === 'grind' ? '#c0ffd0' : '#fff0d0') }); }
    if (m.phase === 'goal') for (const e of [0, 1]) game.lights.add(Rink.goalLineX(e), Rink.CY, 20, 90, .8 + Math.sin(game.time * 12) * .3, { color: '#ff3030' });
    if (m.kaboom[0] > 0 || m.kaboom[1] > 0) game.lights.add(Rink.CX, Rink.CY, 60, 500, .5 + Math.sin(game.time * 6) * .15, { color: kb });
    if (a.id === 'mall') { game.lights.add(Rink.CX - 300, Rink.Y0 - 60, 30, 160, .8, { color: '#e0389a' }); game.lights.add(Rink.CX + 300, Rink.Y0 - 60, 30, 160, .8, { color: '#18b5b0' }); }
    if (a.id === 'pond') game.lights.add(Rink.X1 + 30, Rink.CY - 100, 20, 200, .9 + Math.sin(game.time * 9) * .1, { color: '#ff9a3a' });
  }
  function draw(r, m, t) {
    const view = E.charView(r.view), map = Rink.buildMap(m.arena); game.cam.bounds = v => map.bounds(v);
    lights(r, m); Rink.drawGround(r, map); map.queueWalls(r);
    // thin ice, holes, items on the ice
    r.decal(g => { for (const t of m.thin) { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; pts.push(r.w(t.x + Math.cos(a) * t.rx, t.y + Math.sin(a) * t.ry, 0)); } px.poly(g, pts, t.hole ? '#0a1626' : `rgba(150,200,240,${t.hp < 100 ? .7 : .45})`); if (!t.hole && t.hp < 100) { const [cx, cy] = r.w(t.x, t.y, 0); px.line(g, cx - 8, cy - 2, cx + 6, cy + 3, '#fff', 1); } } for (const o of m.octos) { const [x, y] = r.w(o.x, o.y, 0); px.ell(g, Math.round(x), Math.round(y), 8, 4, 'rgba(255,255,255,.25)'); } });
    Crowd.build(m.arena); Crowd.draw(r, m, t); benches(r, m); Rink.drawBoards(r, m.arena, m.teams[0].home.trim, t);
    Rink.drawNet(r, 0, m.puck.bulge[0], m.phase === 'goal', true); Rink.drawNet(r, 1, m.puck.bulge[1], m.phase === 'goal', true);
    for (const o of m.octos) { r.queue(o.x, o.y, 2, g => { const [x, y] = r.w(o.x, o.y, 3), X = Math.round(x), Y = Math.round(y); if (o.rat) { px.ell(g, X, Y, 3, 2, '#5a4a40'); px.dot(g, X + 3, Y - 1, '#f88'); } else { px.disc(g, X, Y - 2, 4, '#c04a8a'); for (let i = 0; i < 4; i++) px.line(g, X - 4 + i * 3, Y, X - 5 + i * 3, Y + 3, '#c04a8a', 1); px.dot(g, X - 1, Y - 3, '#fff'); px.dot(g, X + 2, Y - 3, '#fff'); } }); }
    for (const o of m.items) { if (o.fly > 0) { const u = 1 - o.fly / .7, fx = lerp(o.fx, o.x, u), fy = lerp(o.ly, o.y, u); r.queue(fx, fy, o.z + 6, g => { const [x, y] = r.w(fx, fy, o.z + 8); px.disc(g, Math.round(x), Math.round(y), 3, ITEMS[o.kind].color); }, { emissive: true }); continue; }
      const blink = o.t < 3 && Math.floor(t * 8) % 2; if (blink) continue; r.shadow(o.x, o.y, 5, .3); r.queue(o.x, o.y, 6, g => { const [x, y] = r.w(o.x, o.y, 8 + Math.sin(t * 4) * 1.5), X = Math.round(x), Y = Math.round(y), c = ITEMS[o.kind].color; px.rect(g, X - 4, Y - 5, 8, 9, '#10131f'); px.rect(g, X - 3, Y - 4, 6, 7, c); px.rect(g, X - 2, Y - 3, 2, 2, '#fff'); E.font.text(g, ITEMS[o.kind].name.split(' ')[0].slice(0, 6), X, Y - 13, c, { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true }); r.shadow(o.x, o.y, 8, .15, '#ffffff'); }
    if (m.mascot) { const pe = m.mascot; r.shadow(pe.x, pe.y, 9, .35); r.actor(pe.x, pe.y, 0, (g, ox, oy) => { pe.rig.draw(g, ox, oy, view); px.disc(g, ox, oy - 40, 9, '#ffffff'); px.disc(g, ox - 5, oy - 48, 3, '#ffffff'); px.disc(g, ox + 5, oy - 48, 3, '#ffffff'); px.dot(g, ox - 2, oy - 41, '#111'); px.dot(g, ox + 2, oy - 41, '#111'); px.dot(g, ox, oy - 38, '#111'); }); }
    const ref = m.ref; r.shadow(ref.x, ref.y, 6, .3); r.actor(ref.x, ref.y, 0, (g, ox, oy) => ref.rig.draw(g, ox, oy, view));
    for (const g_ of m.gl) { if (m.phase === 'replay' || true) Rigs.drawGoalie(r, g_, view); }
    for (const s of m.sk) { if (s.state === 'bin' && false) continue; s.glow = m.kaboom[s.side] > 0 ? m.teams[s.side].accent : s.items.hotsauce > 0 ? '#ff4a2a' : null; Rigs.drawSkater(r, s, view, { hide: s.parked && m.phase === 'shootout' }); }
    // puck
    const p = m.puck, trail = S('puckTrail');
    r.shadow(p.x, p.y, 3 - Math.min(1.5, p.z * .04), .4);
    if (trail !== 'Off') { TRAIL.push([p.x, p.y, p.z, Math.hypot(p.vx, p.vy)]); if (TRAIL.length > 10) TRAIL.shift(); }
    r.queue(p.x, p.y, p.z + 1, g => { if (trail !== 'Off' && Math.hypot(p.vx, p.vy) > 300) for (let i = 0; i < TRAIL.length - 1; i++) { const a = r.w(TRAIL[i][0], TRAIL[i][1], TRAIL[i][2] + 1), b = r.w(TRAIL[i + 1][0], TRAIL[i + 1][1], TRAIL[i + 1][2] + 1); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), trail === 'Glow' ? (p.fire ? '#ff8a2a' : '#4ae0ff') : 'rgba(255,255,255,.5)', 1); }
      const [x, y] = r.w(p.x, p.y, p.z + 1), X = Math.round(x), Y = Math.round(y); if (p.fire) { px.disc(g, X, Y, 4, '#ff8a2a'); px.disc(g, X, Y, 2, '#ffe040'); } else { px.ell(g, X, Y, 2, 1.5, '#0a0a0e'); px.dot(g, X - 1, Y - 1, '#6a6a7a'); } }, { emissive: !!p.fire });
    Hud.markers(r, m, 0); Talk.draw(r); Drills.world(r, m); Dev.world(r, m);
    if (m.phase === 'flood' && m.fl) { const f = m.fl; r.shadow(f.x, f.y, 14, .4); r.queue(f.x, f.y, 0, g => { const [x, y] = r.w(f.x, f.y, 0); const X = Math.round(x), Y = Math.round(y); px.rect(g, X - 11, Y - 12, 22, 12, '#e8e0c0'); px.rect(g, X - 11, Y - 12, 22, 3, '#c8402a'); px.rect(g, X - 6, Y - 20, 10, 8, '#6a8aa8'); px.rect(g, X - 10, Y - 3, 20, 3, '#555'); px.disc(g, X - 8, Y, 3, '#222'); px.disc(g, X + 8, Y, 3, '#222'); px.dot(g, X - 12 + (Math.cos(f.a) > 0 ? 22 : 0), Y - 6, '#ffee88'); if (f.honk > 0) E.font.text(g, 'A-OOGA', X, Y - 30, '#ffd36a', { align: 'center', outline: '#000' }); }); const gus = Rigs.PEOPLE.gus(); }
    r.overlay(g => Hud.draw(g, r, m, game.dt || 1 / 60));
  }
  return { draw };
})();

/* ---- 40-scenes.js ---- */
/* ---- SAVE, RECORDS, SHARED MENU BACKDROP, IDLE ---- */
const Save = (() => {
  const KEY = 'ihk:save'; let d = null;
  const def = () => ({ chapter: 1, unlocked: 1, stars: {}, choices: {}, drills: {}, records: { hardest: 0, biggestHit: 0, mostGoals: 0, fights: 0, kabooms: 0 }, cups: false, cheats: {}, seen: false });
  const load = () => { try { d = Object.assign(def(), HUB ? {} : E.store.get(KEY, {})); } catch (e) { d = def(); } return d; };
  const get = () => d || load();
  const write = () => { if (HUB) return; try { E.store.set(KEY, d); } catch (e) {} };
  const totalStars = () => Object.values(get().stars).reduce((a, b) => a + b, 0);
  const cheats = () => { const t = totalStars(), c = get().cheats; return { bigHeads: t >= 3, octopus: t >= 6, glow: t >= 9, always: t >= 12, retro: t >= 15 }; };
  return { get, write, load, totalStars, cheats, reset() { d = def(); write(); } };
})();

const Backdrop = (() => {
  let m = null, t = 0, last = 0;
  function ensure(arena = 'icebox', home = 'muskrats', away = 'drillers') {
    if (m && m.cfg.arena === arena && !m.over) return m;
    m = Match.create({ home, away, arena, humans: [], noItems: true, noFight: true, noBoom: true, periods: 9, periodLen: 999, noReplay: true, replays: false, ot: false, shootout: false, seed: 11, bg: true }); m.phase = 'faceoff'; m.hideHud = true; m.silent = true; return m;
  }
  function step(dt) { if (!m) ensure(); Flow.step(m, dt); if (m.phase !== 'play' && m.phase !== 'faceoff') { m.phase = 'play'; m.phaseNoPlay = false; } if (m.clock < 100) m.clock = 900; t += dt; }
  function draw(r, o = {}) {
    if (!m) ensure(); const mm = m; game.setZoom(o.zoom || .62); Cam.setView('threequarter'); const a = t * .12, cx = Rink.CX + Math.sin(a) * 260, cy = Rink.CY + Math.cos(a * 1.3) * 60; game.focus(cx, cy, 6);
    DrawMatch.draw(r, mm, t); const sp = Math.sin(t * .7); r.overlay(g => { px.blend(g, .25, 'add', () => { px.poly(g, [[r.W * (.3 + sp * .2), 0], [r.W * (.34 + sp * .2), 0], [r.W * (.6 + sp * .3), r.H], [r.W * (.45 + sp * .3), r.H]], '#9ab8ff'); px.poly(g, [[r.W * (.7 - sp * .2), 0], [r.W * (.74 - sp * .2), 0], [r.W * (.4 - sp * .3), r.H], [r.W * (.25 - sp * .3), r.H]], '#ffd890'); }); });
  }
  return { ensure, step, draw, get m() { return m; }, kill() { m = null; } };
})();

const Idle = (() => {
  let t = 0, lastP = [0, 0];
  const touchOnly = () => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !seenKey && !padSeen; } catch (e) { return false; } };
  let seenKey = false, padSeen = false;
  try { addEventListener('keydown', () => { seenKey = true; }); addEventListener('gamepadconnected', () => { padSeen = true; }); } catch (e) {}
  function tick(dt) {
    if (HUB) return false; const I = game.input; let act = false; try { act = I.anyPressed(); } catch (e) {}
    const p = UI.pointer(); if (p && (Math.abs(p[0] - lastP[0]) + Math.abs(p[1] - lastP[1]) > 8)) { act = true; lastP = [p[0], p[1]]; }
    if (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3) act = true; if (game.paused) act = true;
    if (act) t = 0; else t += dt; if (t >= 10) { t = 0; return true; } return false;
  }
  return { tick, reset() { t = 0; }, touchOnly };
})();

/* ---- SCENES ---- */
const Scenes = (() => {
  const sc = {}; let ctxMatch = null; // { kind, ... } what the match scene is for
  const TITLE_ITEMS = () => { const sv = Save.get(), has = sv.chapter > 1 || Object.keys(sv.stars).length; return [{ label: 'CUP RUN', sub: has ? 'CONTINUE' : 'NEW GAME', onPick: () => { Synth.sfx('fanfare'); game.go('storymap'); } }, { label: 'EXHIBITION', sub: '1-4 PLAYERS', onPick: () => game.go('sides') }, { label: 'PRACTICE', sub: "MARGE'S DRILLS", onPick: () => game.go('practice') }, { label: 'RECORDS', sub: 'BRAG SHEET', onPick: () => game.go('records') }, { label: 'SETTINGS', sub: 'OPTIONS', onPick: () => game.menu('settings') }, { label: 'ABOUT', sub: 'CREDITS & INFO', onPick: () => game.go('about') }]; };
  // ---- title ----
  sc.title = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], res: 'ps1', expand: true,
    enter(d) { this.t = 0; this.state = Idle.touchOnly() ? 'touch' : 'press'; Backdrop.ensure('icebox'); Synth.music('theme'); Synth.reset && 0; Idle.reset(); this.tiles = new UI.Tiles(TITLE_ITEMS(), { cols: 3, w: 104, h: 36, gap: 6, y: 112 }); this.slam = 0; game.weather = null; Talk.reset(); Cam.reset(); game.cam.smooth = 0; },
    update(dt) {
      this.t += dt; Backdrop.step(dt); if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' });
      const I = game.input;
      if (this.state === 'touch') { const c = I.clicked && I.clicked(); if (c && this.btn && c[0] > this.btn[0] && c[0] < this.btn[0] + this.btn[2] && c[1] > this.btn[1] && c[1] < this.btn[1] + this.btn[3]) game.menu('settings'); if (I.anyPressed()) this.state = 'press'; return; }
      if (this.state === 'press') { if (this.t > .6 && (I.anyPressed() || (I.clicked && I.clicked()))) { this.state = 'main'; this.tiles.items = TITLE_ITEMS(); Synth.sfx('ok'); I.consumeAll(); } return; }
      this.tiles.update(dt);
    },
    draw(r) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.35)'); const u = clamp(this.t / .5, 0, 1), sc_ = 4 - (1 - u) * 1.5; UI.title(g, 'ICE HOC-KABOOM', r.W / 2, 28 + (1 - u) * -20, 4, ['#ffffff', '#ffe08a', '#ff9a2a', '#e0402a']); UI.txt(g, 'OVER-THE-TOP 3-ON-3 ARCADE HOCKEY', r.W / 2, 72, '#cfe0ff', { align: 'center' });
      if (this.state === 'press') { if (Math.floor(game.time * 2) % 2) Glyphs.text(g, 'PRESS ANY BUTTON', r.W / 2, 150, { align: 'center', color: '#ffe08a', scale: 2 }); }
      else if (this.state === 'touch') { UI.box(g, r.W / 2 - 100, 112, 200, 40, { border: '#ff6a6a' }); UI.txt(g, 'Controller or keyboard required', r.W / 2, 124, '#fff', { align: 'center' }); this.btn = [r.W / 2 - 40, 160, 80, 24]; UI.box(g, this.btn[0], this.btn[1], this.btn[2], this.btn[3], { border: UI.GOLD }); UI.txt(g, 'SETTINGS', r.W / 2, 168, UI.GOLD, { align: 'center' }); }
      else { this.tiles.draw(g, r); UI.legend(g, r, ['{pass} SELECT', '{deke} BACK']); }
      UI.txt(g, E.versionLabel ? E.versionLabel() + ' - game ' + VERSION : VERSION, 4, r.H - 8, '#667', { font: 'tiny' }); }); }
  };
  // ---- match scene ----
  function matchEnter(d) {
    ctxMatch = d; Fx.hook(); Talk.reset(); UI.clearBanners(); Replay.reset(); Cam.reset(); Synth.reset();
    const m = Match.create(d.cfg); m.ctx = d; Objectives.reset(d.cfg.story || null);
    game.cam.smooth = 0; Backdrop.kill(); Dev.attach(m); if (m.cfg.session) m.hideHud = false;
    Cam.snap(Rink.CX, Rink.CY); const s0 = Save.get(); if (!HUB) Talk.loadTips();
    if (S('intros') === 'Off' || m.cfg.noIntro) { m.phase = 'faceoff'; }
    Synth.music(m.arena.music === 'play' ? 'play' : m.arena.music);
    if (Save.cheats().bigHeads && Save.get().cheats.bigHeads) for (const s of m.sk) s.rig.o.headR = (s.rig.o.headR || 1) * 1.8;
    game.weather = m.arena.weather ? { kind: m.arena.weather, amount: .5 } : null;
    game.lights.enabled = true; Crowd.reset(); Synth.crowdStart();
    if (m.phase === 'faceoff') Match.faceoffNow(Rink.CX, Rink.CY, true);
    Talk.showTip('skate'); if (d.cfg.drill) Drills.begin(m, d.cfg.drill);
    if (d.cfg.startShootout) { m.ot = true; Shootout.begin(m); } if (d.cfg.startFlood) Flood.begin(m, () => Match.faceoffNow(Rink.CX, Rink.CY, true));
  }
  function musicLayers(m) { try { A.layer('drive', m.period >= 3 || m.ot ? 1 : 0, .5); A.layer('kaboom', m.kaboom[0] > 0 || m.kaboom[1] > 0 ? 1 : 0, .3); A.layer('kaboomdrums', m.kaboom[0] > 0 || m.kaboom[1] > 0 ? 1 : 0, .3); A.layer('fight', m.phase === 'fight' ? 1 : 0, .3); } catch (e) {} }
  sc.match = { pausable: true, view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], res: 'ps1', expand: true,
    enter: matchEnter, exit() { game.weather = null; game.setZoom(1); },
    update(dt) {
      const m = Match.cur(); if (!m) return; if (Dev.holds(m)) { Dev.update(dt); Cam.update(m, dt); Talk.update(dt); return; }
      Flow.step(m, dt); Drills.step(m, dt); Talk.update(dt); Cam.update(m, dt); Dev.update(dt); musicLayers(m);
      if (m.phase === 'play' && !(m.t % 7 < 0.01)) { /* tips */ }
      if (m.over && !m.handled) { m.handled = true; Scenes.matchDone(m); }
      if (game.input.pressed('camera')) { game.settings.set('camMode', S('camMode') === 'Broadcast' ? 'Overhead' : 'Broadcast'); }
    },
    draw(r) { const m = Match.cur(); if (!m) return; DrawMatch.draw(r, m, game.time); r.overlay(g => { Drills.draw(g, r, m); Dev.draw(g, r); }); }
  };
  function matchDone(m) {
    const d = m.ctx || {}; Results.compute(m); Results.record(m);
    if (m.cfg.drill) return Drills.finish(m);
    if (m.cfg.session) return;
    game.go('results', { m, ctx: d }, { fade: 'iris' });
  }
  function restartMatch() { const d = ctxMatch; if (d) game.go('match', { cfg: Object.assign({}, d.cfg, { seed: (Date.now() & 0xffffff) }), ret: d.ret, story: d.story }, { fade: 'wipe' }); }
  // ---- exhibition: sides ----
  const ex = { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: 90, diff: -1, humans: [] };
  sc.sides = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
    enter() { Backdrop.ensure(); this.tok = [{ pad: null, side: -1, ready: false, name: 'P1', input: game.players[0] }]; this.t = 0; game.allowJoin({ max: 4, onJoin: (inp) => { this.tok.push({ input: inp, side: -1, ready: false, name: 'P' + inp.player }); Synth.sfx('pickup'); } }); Idle.reset(); },
    exit() { game.allowJoin(false); },
    update(dt) {
      this.t += dt; Backdrop.step(dt); if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' });
      const players = game.players; for (const p of players) if (!this.tok.find(k => k.input === p)) this.tok.push({ input: p, side: -1, ready: false, name: 'P' + p.player });
      for (const k of this.tok) { const I = k.input; if (!k.ready) { if (I.pressed('left')) { k.side = k.side === 1 ? -1 : 0; Synth.sfx('mv'); } if (I.pressed('right')) { k.side = k.side === 0 ? -1 : 1; Synth.sfx('mv'); } } if (I.pressed('confirm') && !k.ready) { k.ready = true; Synth.sfx('ok'); } else if (I.pressed('cancel')) { if (k.ready) k.ready = false; else if (k === this.tok[0]) { game.go('title'); return; } } }
      const c = game.input.clicked && game.input.clicked(); if (c) { const k = this.tok.find(q => q.input.lastDevice === 'keyboard' || q.input.lastDevice === 'mouse') || this.tok[0]; k.side = c[0] < game.W / 2 - 30 ? 0 : c[0] > game.W / 2 + 30 ? 1 : -1; }
      if (this.tok.every(k => k.ready) && this.t > .4) { ex.humans = this.tok.filter(k => k.side >= 0).map(k => ({ side: k.side, input: k.input, seat: k.input.player - 1 })); if (!this.tok.some(k => k.side >= 0)) ex.humans = [{ side: 0, input: this.tok[0].input, seat: 0 }]; game.go('setup'); }
    },
    draw(r) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.6)'); UI.title(g, 'CHOOSE YOUR SIDES', r.W / 2, 14, 3); const cx = r.W / 2; UI.box(g, cx - 130, 52, 80, 110, { border: '#7aa7ff', alpha: .9 }); UI.box(g, cx + 50, 52, 80, 110, { border: '#ff8a6a', alpha: .9 }); UI.txt(g, 'HOME', cx - 90, 58, '#7aa7ff', { align: 'center', scale: 2 }); UI.txt(g, 'AWAY', cx + 90, 58, '#ff8a6a', { align: 'center', scale: 2 }); UI.txt(g, 'CPU', cx, 58, '#9ab', { align: 'center', scale: 2 });
      this.tok.forEach((k, i) => { const x = k.side === 0 ? cx - 90 : k.side === 1 ? cx + 90 : cx, y = 82 + i * 20, col = E.PLAYER_COLORS[(k.input.player || 1) - 1]; px.disc(g, x - 20, y + 5, 8, col); UI.txt(g, 'P' + k.input.player, x - 20, y + 2, '#000', { align: 'center' }); UI.txt(g, k.ready ? 'READY' : (k.input.device === 'keyboard' || !k.input.device ? 'KEYS' : 'PAD'), x + 6, y + 2, k.ready ? '#6ae06a' : '#cfe', {}); });
      UI.txt(g, 'Press START on a free controller, or 2 on the keyboard, to join', r.W / 2, 176, '#9ab', { align: 'center' }); Glyphs.text(g, '← ▸ MOVE   {pass} READY   {deke} BACK', r.W / 2, r.H - 12, { align: 'center', color: '#c8d4f0' });
      const ks = game.players.filter(p => p.half || game.players.length > 1); if (game.players.length > 1) UI.txt(g, 'P1: WASD + F G H R T Y     P2: ARROWS + . / , L ; \'', r.W / 2, 188, '#7a8ab0', { align: 'center', font: 'tiny' }); }); }
  };
  // ---- exhibition: setup ----
  const PL = [[1, 'Period 1'], [2, '2'], [3, '3']];
  sc.setup = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
    enter() { Backdrop.ensure(); this.cols = [{ k: 'home' }, { k: 'arena' }, { k: 'away' }]; this.f = 3; this.i = 0; this.opts = [{ k: 'periods', l: 'PERIODS', v: [1, 2, 3] }, { k: 'len', l: 'LENGTH', v: [60, 90, 120, 180, 240] }, { k: 'diff', l: 'DIFFICULTY', v: [-1, 0, 1, 2, 3] }, { k: 'cheat', l: 'CHEATS', v: ['None'].concat(Object.entries(Save.cheats()).filter(([k, v]) => v).map(([k]) => k)) }]; this.o = 0; this.t = 0; ex.cheat = ex.cheat || 'None'; Idle.reset(); },
    ids() { return Save.get().cups ? TEAMS.map(t => t.id) : TEAMS.filter(t => t.id !== 'grizzlies').map(t => t.id); },
    update(dt) {
      this.t += dt; Backdrop.step(dt); if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' }); const I = game.input;
      const rows = 5; if (I.pressed('up')) { this.i = (this.i + rows - 1) % rows; Synth.sfx('mv'); } if (I.pressed('down')) { this.i = (this.i + 1) % rows; Synth.sfx('mv'); }
      let h = 0; if (I.repeat('left', .35, .15)) h = -1; if (I.repeat('right', .35, .15)) h = 1;
      if (this.i === 0 && (h || I.pressed('confirm'))) this.cycleCard(h || 1); if (this.i === 1) { if (this.col === undefined) this.col = 1; }
      if (this.i === 0) { /* cards row: left/right changes the focused card; up/down moves */ }
      if (I.pressed('lob')) this.card = ((this.card || 0) + 1) % 3;
      if (this.i === 0 && I.pressed('switch')) this.card = ((this.card || 0) + 1) % 3;
      if (this.i >= 1 && this.i <= 4 && h) { const o = this.opts[this.i - 1]; const idx = o.v.indexOf(ex[o.k] != null && o.k !== 'cheat' ? ex[o.k] : ex.cheat); const ni = (idx + h + o.v.length) % o.v.length; if (o.k === 'cheat') ex.cheat = o.v[ni]; else ex[o.k] = o.v[ni]; Synth.sfx('mv'); }
      if (I.pressed('confirm') && this.i === 4 || (I.pressed('start') && true)) this.go(); else if (I.pressed('confirm') && this.i === 0) { }
      if (I.pressed('cancel')) game.go('sides');
      const c = I.clicked && I.clicked(); if (c) { if (c[1] > 168 && c[1] < 190) this.go(); }
    },
    cycleCard(d) { const ids = this.ids(), k = ['home', 'arena', 'away'][this.card || 0]; if (k === 'arena') { const idx = ARENA_LIST.indexOf(ex.arena); ex.arena = ARENA_LIST[(idx + d + 5) % 5]; Backdrop.kill(); Backdrop.ensure(ex.arena, ex[ 'home' ], ex.away); } else { const idx = ids.indexOf(ex[k]); let n = ids[(idx + d + ids.length) % ids.length]; if (n === ex[k === 'home' ? 'away' : 'home']) n = ids[(ids.indexOf(n) + d + ids.length) % ids.length]; ex[k] = n; } Synth.sfx('mv'); },
    go() { const ch = ex.cheat; const cfg = { home: ex.home, away: ex.away, arena: ex.arena, periods: ex.periods, periodLen: ex.len, diff: ex.diff < 0 ? undefined : ex.diff, humans: ex.humans, intros: true, cheats: ch, alwaysKaboom: ch === 'always', bigHeads: ch === 'bigHeads', retro: ch === 'retro', octoRain: ch === 'octopus' }; if (ch === 'glow') game.settings.set('puckTrail', 'Glow'); Save.get().cheats = { bigHeads: ch === 'bigHeads', retro: ch === 'retro' }; game.go('match', { cfg, ret: 'setup', kind: 'exh' }, { fade: 'wipe' }); },
    draw(r) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.62)'); UI.title(g, 'EXHIBITION', r.W / 2, 8, 3);
      const cw = 96, ch = 96, gap = 8, x0 = r.W / 2 - (cw * 3 + gap * 2) / 2; ['home', 'arena', 'away'].forEach((k, ci) => { const x = x0 + ci * (cw + gap), foc = this.i === 0 && (this.card || 0) === ci; UI.box(g, x - (foc ? 3 : 0), 34 - (foc ? 3 : 0), cw + (foc ? 6 : 0), ch + (foc ? 6 : 0), { border: foc ? UI.GOLD : '#4a5a8a', bg: foc ? ['#24346a', '#141c3c'] : UI.PANEL });
        if (k === 'arena') { const a = ARENAS[ex.arena]; px.rect(g, x + 6, 42, cw - 12, 38, a.sky[1]); px.rect(g, x + 6, 62, cw - 12, 18, `rgb(${a.floor.join(',')})`); UI.txt(g, a.name, x + cw / 2, 86, '#fff', { align: 'center' }); UI.txt(g, a.town, x + cw / 2, 98, '#9ab', { align: 'center', font: 'tiny' }); UI.txt(g, 'ARENA', x + cw / 2, 108, UI.GOLD, { align: 'center', font: 'tiny' }); }
        else { const t = TEAM[ex[k]]; Logo.draw(g, t.id, x + cw / 2, 58, 30); UI.txt(g, t.name.split(' ').slice(-1)[0].toUpperCase(), x + cw / 2, 80, '#fff', { align: 'center', scale: 1 }); const bars = [['SPD', t.skaters.reduce((a, s) => a + s[4][0], 0) / 3], ['SHT', t.skaters.reduce((a, s) => a + s[4][1], 0) / 3], ['HIT', t.skaters.reduce((a, s) => a + s[4][3], 0) / 3], ['GOL', t.rating[0] ]]; bars.forEach(([n, v], bi) => { UI.txt(g, n, x + 8, 92 + bi * 8, '#9ab', { font: 'tiny' }); px.rect(g, x + 28, 93 + bi * 8, 56, 4, '#05070f'); px.rect(g, x + 28, 93 + bi * 8, Math.round(56 * v / 5), 4, t.accent); }); UI.txt(g, k === 'home' ? 'HOME' : 'AWAY', x + cw / 2, 40, UI.GOLD, { align: 'center', font: 'tiny' }); } });
      this.opts.forEach((o, oi) => { const y = 138 + oi * 0, x = x0 + oi * 74, foc = this.i === oi + 1; UI.box(g, x, 134, 70, 28, { border: foc ? UI.GOLD : '#4a5a8a', bg: foc ? ['#24346a', '#141c3c'] : UI.PANEL }); UI.txt(g, o.l, x + 35, 138, '#9ab', { align: 'center', font: 'tiny' }); const v = o.k === 'cheat' ? ex.cheat : ex[o.k]; UI.txt(g, o.k === 'len' ? U.mmss(v) : o.k === 'diff' ? (v < 0 ? 'AUTO' : ['ROOKIE', 'PRO', 'ALL-STAR', 'LEGEND'][v]) : String(v).toUpperCase(), x + 35, 148, foc ? '#fff' : '#cfe', { align: 'center' }); });
      UI.box(g, r.W / 2 - 60, 168, 120, 22, { border: this.i === 4 ? UI.GOLD : '#4a5a8a', bg: this.i === 4 ? ['#6a3a1a', '#2a1408'] : UI.PANEL }); UI.txt(g, 'FACE OFF!', r.W / 2, 174, this.i === 4 ? '#ffe08a' : '#cfe', { align: 'center', scale: 2 });
      Glyphs.text(g, '↑↓ ROW   ←▸ CHANGE   {lob} NEXT CARD   {pass} FACE OFF   {deke} BACK', r.W / 2, r.H - 12, { align: 'center', color: '#c8d4f0' }); }); }
  };
  return { sc, matchDone, restartMatch, get ctx() { return ctxMatch; }, set ctx(v) { ctxMatch = v; }, ex };
})();

/* ---- 41-story.js ---- */
/* ---- RESULTS, STORY, CUTSCENES ---- */
const Results = (() => {
  function compute(m) {
    const gk = m.gl.map(g => { const ga = m.stats.goals.filter(x => x.side !== g.side).length, sa = g.saves + ga; return { s: g, sc: .12 * g.saves + 2 * ((sa ? g.saves / sa : 1) - .85) * 10, line: g.saves + ' SAVES  ' + (sa ? Math.round(g.saves / sa * 100) : 100) + '%', goalie: true, side: g.side }; });
    const sk = m.sk.map(s => ({ s, sc: 3 * s.stats.goals + 2 * s.stats.assists + .5 * s.stats.bigHits + 1.5 * s.stats.fightsWon + .3 * s.stats.shots, line: s.stats.goals + 'G ' + s.stats.assists + 'A  ' + s.stats.bigHits + ' HITS', side: s.side }));
    const all = sk.concat(gk).sort((a, b) => b.sc - a.sc); const win = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
    if (win >= 0) all.sort((a, b) => (b.sc + (b.side === win ? 1.2 : 0)) - (a.sc + (a.side === win ? 1.2 : 0)));
    m.res = { stars: all.slice(0, 3), win };
  }
  function record(m) {
    if (HUB) return; const r = Save.get().records; for (const s of m.sk) { if (s.ctrl.kind !== 'human') continue; r.hardest = Math.max(r.hardest, s.stats.topShot); r.mostGoals = Math.max(r.mostGoals, s.stats.goals); r.fights += s.stats.fightsWon; }
    r.biggestHit = Math.max(r.biggestHit, m.maxImp || 0); r.kabooms += m.stats.kabooms[0]; Save.write();
  }
  return { compute, record };
})();
Bus.on('big_hit', e => { const m = Match.cur(); if (m && e.a.ctrl.kind === 'human') m.maxImp = Math.max(m.maxImp || 0, e.imp); });

const Story = (() => {
  const chap = id => STORY.chapters[id - 1];
  const SETS = {
    locker: { floor: [120, 100, 80], wall: ['#4a5a6a', '#2a3a4a'], props: [['bench', 3, 6], ['bench', 8, 6]], bg: '#1a2230', amb: .7 },
    bonfire: { floor: [220, 232, 245], wall: ['#2a3a4a', '#1a2a3a'], props: [['campfire', 8, 6], ['pine', 1, 3], ['pine', 14, 3]], bg: '#0e1430', amb: .5, snow: true },
    dim: { floor: [70, 72, 78], wall: ['#3a3e44', '#26292e'], props: [['barrel', 2, 4], ['crate', 14, 4]], bg: '#0c1210', amb: .45 },
    neon: { floor: [210, 200, 220], wall: ['#e0389a', '#18b5b0'], props: [['sign', 4, 3], ['sign', 12, 3]], bg: '#2a1a3a', amb: .75 },
    tunnel: { floor: [50, 48, 60], wall: ['#2a2a3a', '#ffd36a'], props: [['torch', 3, 3], ['torch', 13, 3]], bg: '#080810', amb: .5 }
  };
  const maps = {};
  function setMap(id) {
    if (maps[id]) return maps[id]; const S_ = SETS[id], rows = []; for (let r = 0; r < 12; r++) { let s = ''; for (let c = 0; c < 18; c++) s += r < 3 || c === 0 || c === 17 ? '#' : '.'; rows.push(s); }
    return (maps[id] = new E.TileMap({ rows, legend: { '#': 1, '.': { floor: 'x' } }, types: { 1: { h: 40, face: 'plaster', side: S_.wall[0], top: S_.wall[1] } }, floorTex: (x, y) => { const n = E.hash2(x | 0, y | 0) * 8; const f = S_.floor; return [f[0] + n, f[1] + n, f[2] + n]; }, outside: S_.bg }));
  }
  const rigs = {};
  const rigFor = (name) => rigs[name] || (rigs[name] = Rigs.portrait(name));
  sc_cut();
  function sc_cut() {
    Scenes.sc.cutscene = { view: 'brawler', input: HOCKEY_KEYS, touch: [], expand: true, res: 'ps1',
      enter(d) {
        this.d = d; const ch = chap(d.id), lines = (d.kind === 'pre' ? ch.pre : ch.post).slice(); this.ch = ch; this.set = SETS[d.kind === 'pre' ? ch.set : 'locker'];
        if (d.kind === 'post' && ch.id === 5) this.set = SETS.tunnel; this.map = setMap(d.kind === 'pre' ? ch.set : (ch.id === 5 ? 'tunnel' : (ch.set)));
        this.set = SETS[d.kind === 'pre' ? ch.set : ch.set]; this.lines = lines; this.i = 0; this.speaker = null; this.skip = 0; this.cast = []; this.tl = 0; this.done = false; Synth.music(ch.set === 'bonfire' ? 'pond' : ch.set === 'tunnel' ? 'final' : ch.set === 'neon' ? 'mall' : ch.set === 'dim' ? 'grind' : 'locker'); game.weather = this.set.snow ? { kind: 'snow', amount: .4 } : null;
        for (const [n] of lines) if (!this.cast.includes(n)) this.cast.push(n); this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd36a', speed: 38 }); game.cam.bounds = null; game.setZoom(1.5); game.focus(144, 150, 20); game.lights.enabled = true; game.lights.ambient = this.set.amb;
        this.next(); },
      exit() { game.weather = null; game.setZoom(1); },
      next() {
        if (this.i >= this.lines.length) { if (this.d.kind === 'pre' && !this.chosen) return this.choose(); return this.finish(); }
        const [who, text] = this.lines[this.i++]; this.speaker = who; const vk = Rigs.VOICE_OF[who] || 'gen'; this.talk.voice = Synth.dialogVoice(vk); const isLast = this.d.kind === 'pre' && this.i === this.lines.length;
        this.talk.say(text.replace(/\{\$tacticLine\}/, '').replace(/\s+$/, ''), { name: who, portrait: rigFor(who), onDone: () => this.next(), color: '#fff' });
      },
      choose() {
        this.chosen = true; const ch = this.ch; this.speaker = 'DUNNY'; this.talk.voice = Synth.dialogVoice('marge');
        this.talk.say(['Pick the plan, Captain.'], { name: 'MARGE', portrait: rigFor('MARGE'), choices: ch.tactic.map(s => s.toUpperCase()), onChoice: (i) => { Save.get().choices[ch.id] = i; Save.write(); this.pick = i; this.talk.voice = Synth.dialogVoice('dunny'); this.speaker = 'DUNNY'; this.talk.say(['We keep it simple, Coach. We ' + ch.tacticLine[i]], { name: 'DUNNY', portrait: rigFor('DUNNY'), onDone: () => { this.talk.voice = Synth.dialogVoice('marge'); this.speaker = 'MARGE'; this.talk.say([ch.id === 1 ? "Warm-up's on. Then we drill the Drillers." : 'Good. Now go win it.'], { name: 'MARGE', portrait: rigFor('MARGE'), onDone: () => this.finish() }); } }); } });
      },
      finish() { if (this.done) return; this.done = true; const d = this.d, ch = this.ch; if (d.kind === 'pre') game.go('pregame', { id: ch.id, choice: Save.get().choices[ch.id] || 0 }, { fade: 'wipe' }); else Story.afterPost(ch.id); },
      update(dt) {
        this.tl += dt; this.talk.update(dt); const I = game.input; if (I.down('cancel')) { this.skip += dt; if (this.skip >= 1) { this.talk.close(); this.i = this.lines.length; this.chosen = true; if (this.d.kind === 'pre' && Save.get().choices[this.ch.id] == null) Save.get().choices[this.ch.id] = 0; this.finish(); } } else this.skip = Math.max(0, this.skip - dt * 2);
        if (this.set.snow) {} },
      draw(r) {
        const map = this.map; r.sky([this.set.bg, this.set.bg]); map.drawFloor(r); map.queueWalls(r); this.cast.forEach((n, i) => { const x = 40 + (i + .5) * (208 / Math.max(1, this.cast.length)) , y = 130 + (i % 2) * 10, rig = rigFor(n); const hot = n === this.speaker; rig.update(1 / 60, { x, y, z: 0, vx: 0, vy: 0, facing: PI / 2 + (x < 144 ? -.3 : .3), pose: hot ? 'hips' : undefined, expr: hot ? 'shout' : undefined }); r.shadow(x, y, 7, .35); r.actor(x, y, 0, (g, ox, oy) => rig.draw(g, ox, oy - (hot ? Math.abs(Math.sin(this.tl * 8)) * 1.5 : 0), E.charView(r.view))); });
        for (const [name, cx, cy] of this.set.props) { try { r.prop(name, cx * 16, cy * 16, 0, { light: true, size: 1.4 }); } catch (e) {} }
        game.lights.add(144, 100, 60, 240, .8, { color: this.set.snow ? '#ff9a3a' : '#ffe8c0' });
        this.talk.draw(r); r.overlay(g => { UI.txt(g, this.ch.title.toUpperCase() + (this.d.kind === 'post' ? ' - AFTER' : ''), 8, 8, UI.GOLD, { scale: 1 }); if (this.skip > 0) { UI.txt(g, 'SKIPPING', r.W - 8, 8, '#ccc', { align: 'right' }); px.rect(g, r.W - 60, 18, 52, 4, '#05070f'); px.rect(g, r.W - 60, 18, Math.round(52 * this.skip), 4, UI.GOLD); } else Glyphs.text(g, 'HOLD {deke} SKIP', r.W - 8, 12, { align: 'right', color: '#9ab' }); if (this.d.kind === 'pre' && this.chosen === undefined) {} }); }
    };
  }
  function afterPost(id) { const ch = chap(id); if (id === 5) { game.go('credits', null, { fade: 'white' }); } else game.go('storymap', null, { fade: 'wipe' }); }
  function begin(id) { game.go('cutscene', { id, kind: 'pre' }, { fade: 'wipe' }); }
  function startMatch(id, choice) {
    const ch = chap(id), diff = ['Rookie', 'Pro', 'All-Star', 'Legend'].indexOf(S('difficulty'));
    const cfg = { home: 'muskrats', away: ch.rival, arena: ch.arena, periods: ch.id === 5 ? 3 : 3, periodLen: ch.len, ot: ch.ot, shootout: true, intros: true, humans: [{ side: 0, input: game.input, seat: 0 }], story: ch, storyChoice: choice, seed: id * 1000 + (Save.get().attempts && Save.get().attempts[id] || 0), showcase: id === 4, tactic: [null, null] };
    Save.get().attempts = Save.get().attempts || {}; Save.get().attempts[id] = (Save.get().attempts[id] || 0) + 1; Save.write();
    game.go('match', { cfg, ret: 'storymap', kind: 'story', story: ch }, { fade: 'iris' });
  }
  function complete(m, ch) {
    const sv = Save.get(); const st = Objectives.stars(); sv.stars[ch.id] = Math.max(sv.stars[ch.id] || 0, st); sv.unlocked = Math.max(sv.unlocked, Math.min(5, ch.id + 1)); sv.chapter = Math.max(sv.chapter, Math.min(5, ch.id + 1)); if (ch.id === 5) sv.cups = true; Save.write(); return st;
  }
  // ---- scenes: storymap, pregame ----
  Scenes.sc.storymap = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
    enter() { Backdrop.kill(); this.t = 0; this.i = clamp(Save.get().unlocked - 1, 0, 4); Synth.music('menu'); Idle.reset(); this.bus = 0; this.targetBus = this.i; },
    update(dt) {
      this.t += dt; const I = game.input; if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' });
      const sv = Save.get(), n = 5; if (I.pressed('left')) { this.i = (this.i + n - 1) % n; Synth.sfx('mv'); } if (I.pressed('right')) { this.i = (this.i + 1) % n; Synth.sfx('mv'); }
      this.bus += (this.i - this.bus) * Math.min(1, dt * 4); const c = I.clicked && I.clicked(); if (c) this.stops.forEach((s, k) => { if (Math.abs(c[0] - s[0]) < 20 && Math.abs(c[1] - s[1]) < 26) { this.i = k; this.pick(); } });
      const p = UI.pointer(); if (p && this.stops && (Math.abs(p[0] - (this.lp || [0, 0])[0]) > 1)) { this.lp = [p[0], p[1]]; this.stops.forEach((s, k) => { if (Math.abs(p[0] - s[0]) < 20 && Math.abs(p[1] - s[1]) < 26 && this.i !== k) { this.i = k; Synth.sfx('mv'); } }); }
      if (I.pressed('confirm')) this.pick(); if (I.pressed('cancel')) game.go('title');
    },
    pick() { if (this.i + 1 > Save.get().unlocked) { Synth.sfx('bonk'); return; } Synth.sfx('fanfare'); Story.begin(this.i + 1); },
    draw(r) {
      r.sky(['#0e1838', '#3a5a8a', '#c8d8f0']); r.overlay(g => {
        px.rect(g, 0, 140, r.W, r.H - 140, '#e8f0f8'); for (let i = 0; i < 40; i++) px.dot(g, (i * 53) % r.W, 142 + (i * 17) % (r.H - 142), '#c8d8e8'); px.rect(g, 0, 168, r.W, 22, '#4a4e58'); for (let x = 0; x < r.W; x += 20) px.rect(g, x + ((game.time * 20) | 0) % 20, 178, 10, 2, '#f0d860');
        UI.title(g, 'THE CUP RUN', r.W / 2, 8, 3); const sv = Save.get(); this.stops = [];
        for (let k = 0; k < 5; k++) { const ch = STORY.chapters[k], x = 40 + k * ((r.W - 80) / 4), y = 120, locked = k + 1 > sv.unlocked, foc = k === this.i;
          px.rect(g, x - 1, y, 2, 30, '#5a4a3a'); UI.box(g, x - 22, y - 28, 44, 28, { border: foc ? UI.GOLD : '#6a7aaa', bg: locked ? ['#222', '#111'] : ['#2a3a6a', '#141c3c'] }); if (!locked) Logo.draw(g, ch.rival, x, y - 14, 18); else UI.txt(g, '?', x, y - 18, '#667', { align: 'center', scale: 2 });
          for (let s = 0; s < 3; s++) UI.txt(g, '★', x - 10 + s * 10, y + 2, (sv.stars[ch.id] || 0) > s ? '#ffd36a' : '#334', { align: 'center' }); UI.txt(g, ch.id + '', x, y - 38, foc ? UI.GOLD : '#9ab', { align: 'center' }); this.stops.push([x, y - 12]); }
        const bx = 40 + this.bus * ((r.W - 80) / 4); px.rect(g, bx - 14, 160, 28, 12, '#e8b43a'); px.rect(g, bx - 12, 156, 20, 6, '#8ac8f0'); px.disc(g, bx - 8, 173, 3, '#222'); px.disc(g, bx + 8, 173, 3, '#222'); UI.txt(g, 'MUK', bx, 162, '#5a3a22', { align: 'center', font: 'tiny' });
        const ch = STORY.chapters[this.i]; UI.box(g, 20, 190, r.W - 40, 36, { border: UI.GOLD, alpha: .95 }); UI.txt(g, ch.id + '. ' + ch.title.toUpperCase() + '  -  ' + ARENAS[ch.arena].name + ' vs ' + TEAM[ch.rival].name, r.W / 2, 194, UI.GOLD, { align: 'center' }); UI.txt(g, ch.blurb, r.W / 2, 205, '#cfe', { align: 'center' }); UI.txt(g, ch.objectives.map(o => (sv.stars[ch.id] || 0) > 0 ? '★ ' + o.text : '- ' + o.text).join('   '), r.W / 2, 215, '#9ab', { align: 'center', font: 'tiny' });
        UI.legend(g, r, ['← ▸ CHOOSE', '{pass} PLAY', '{deke} BACK']); });
    }
  };
  Scenes.sc.pregame = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
    enter(d) { this.d = d; this.ch = chap(d.id); this.i = 0; this.t = 0; const opts = [{ label: 'FACE OFF', sub: 'PLAY BALL', onPick: () => Story.startMatch(d.id, d.choice) }]; if (d.id === 1 && !d.warm) opts.unshift({ label: 'WARM-UP', sub: 'DRILLS 1-3', onPick: () => game.go('practice', { warm: true, ret: 'pregame', id: d.id, choice: d.choice }) }); this.tiles = new UI.Tiles(opts, { cols: opts.length, w: 100, h: 40, y: 168, onCancel: () => game.go('storymap') }); this.tiles.i = opts.length - 1; Backdrop.ensure(this.ch.arena, 'muskrats', this.ch.rival); },
    update(dt) { this.t += dt; Backdrop.step(dt); this.tiles.update(dt); },
    draw(r) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.7)'); const ch = this.ch; UI.title(g, 'CHAPTER ' + ch.id, r.W / 2, 10, 2); UI.txt(g, ch.title.toUpperCase(), r.W / 2, 32, UI.GOLD, { align: 'center', scale: 2 }); Logo.draw(g, 'muskrats', r.W / 2 - 60, 80, 36); UI.txt(g, 'VS', r.W / 2, 74, '#fff', { align: 'center', scale: 2 }); Logo.draw(g, ch.rival, r.W / 2 + 60, 80, 36); UI.txt(g, ARENAS[ch.arena].name, r.W / 2, 108, '#cfe', { align: 'center' });
      ch.objectives.forEach((o, i) => UI.txt(g, '- ' + o.text, r.W / 2, 124 + i * 11, '#ffe8a0', { align: 'center' })); UI.txt(g, 'PLAN: ' + ch.tactic[Save.get().choices[ch.id] || 0].toUpperCase(), r.W / 2, 160, '#9ab', { align: 'center', font: 'tiny' }); this.tiles.draw(g, r); UI.legend(g, r, ['{pass} SELECT', '{deke} BACK']); }); }
  };
  return { begin, startMatch, complete, afterPost, chap, SETS };
})();

/* ---- 42-scenes3.js ---- */
/* ---- RESULTS, PRACTICE LIST, RECORDS, ABOUT, CREDITS ---- */
Scenes.sc.results = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
  enter(d) {
    this.d = d; const m = d.m, ctx = d.ctx || {}; this.m = m; this.t = 0; this.shown = 0; this.story = ctx.story; this.win = m.res.win === 0; this.stars = 0; Backdrop.ensure(m.cfg.arena, m.cfg.home, m.cfg.away); Synth.music(this.win || m.res.win < 0 ? 'victory' : 'defeat'); Talk.reset();
    if (this.story) { this.stars = this.win || m.res.win < 0 ? Story.complete(m, this.story) : Objectives.stars(); this.pep = !this.win ? STORY.pep[(this.story.id - 1) % 5] : null; }
    const opts = [];
    if (this.story) { if (this.win) opts.push({ label: 'CONTINUE', sub: 'AFTER THE GAME', onPick: () => game.go('cutscene', { id: this.story.id, kind: 'post' }, { fade: 'wipe' }) }); else { opts.push({ label: 'RETRY', sub: 'GO AGAIN', onPick: () => Story.startMatch(this.story.id, Save.get().choices[this.story.id] || 0) }); opts.push({ label: 'BACK TO MAP', sub: 'REGROUP', onPick: () => game.go('storymap') }); } }
    else { opts.push({ label: 'REMATCH', sub: 'RUN IT BACK', onPick: () => game.go('match', { cfg: Object.assign({}, m.cfg, { seed: (Date.now() & 0xffffff), intros: false }), ret: ctx.ret, kind: ctx.kind }, { fade: 'wipe' }) }); opts.push({ label: 'MAIN MENU', sub: 'LEAVE', onPick: () => game.go('title') }); }
    this.tiles = new UI.Tiles(opts, { cols: opts.length, w: 100, h: 40, y: 172, gap: 10 }); this.tl = 0; this.revealed = 0;
  },
  update(dt) {
    this.t += dt; Backdrop.step(dt); const rv = [1.6, 3.4, 5.2], need = Math.floor((this.t - 1.2) / 1.8) + 1; const n = clamp(need, 0, 3); if (n > this.revealed) { this.revealed = n; Synth.sfx('star'); const st = this.m.res.stars[3 - n]; if (st) { const gk = st.goalie; Synth.babble(['Third star of the game!', 'Second star!', 'And the first star of the game!'][n - 1], 'chuck', { excl: true }); } }
    if (this.revealed >= 3 && this.t > 7) this.tiles.update(dt); else if (game.input.pressed('confirm')) this.t += 1.8;
  },
  draw(r) { Backdrop.draw(r); const m = this.m; r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.72)'); UI.title(g, m.res.win < 0 ? 'A TIE!' : this.win ? (this.story ? 'VICTORY!' : m.teams[0].name.split(' ').pop() + ' WIN') : (this.story ? 'DEFEAT' : m.teams[1].name.split(' ').pop() + ' WIN'), r.W / 2, 6, 3);
    UI.txt(g, m.teams[0].abbr + '  ' + m.score[0] + '  -  ' + m.score[1] + '  ' + m.teams[1].abbr + (m.so && m.so.final ? '  (SO)' : m.ot ? '  (OT)' : ''), r.W / 2, 34, '#fff', { align: 'center', scale: 3 });
    const names = ['3RD STAR', '2ND STAR', '1ST STAR']; for (let i = 0; i < this.revealed; i++) { const st = m.res.stars[2 - i]; if (!st) continue; const k = 2 - i, x = 20 + k * 98, y = 64, big = k === 0; const rig = st.goalie ? st.s.rig : st.s.rig; UI.box(g, x, y, 92, 80, { border: big ? '#ffd36a' : '#6a7aaa', alpha: .95 }); UI.txt(g, ['1ST STAR', '2ND STAR', '3RD STAR'][k], x + 46, y + 4, big ? '#ffd36a' : '#cfe', { align: 'center' }); Rigs.face(g, Rigs.pr(st.s), x + 26, y + 14, 40, { turn: .5, bg: [m.teams[st.side].home.cloth, '#10131f'] }); UI.txt(g, st.s.nick, x + 46, y + 58, '#fff', { align: 'center' }); UI.txt(g, st.line, x + 46, y + 68, '#9ab', { align: 'center', font: 'tiny' }); }
    if (this.story && this.t > 3) { this.story.objectives.forEach((o, i) => { const ok = Objectives.done(o.id); UI.txt(g, (ok ? '★ ' : '- ') + o.text, r.W / 2, 150 + i * 0, ok ? '#ffd36a' : '#667', { align: 'center' }); }); const ob = this.story.objectives; ob.forEach((o, i) => UI.txt(g, (Objectives.done(o.id) && this.t > 3 + i * .6 ? '★ ' : '- ') + o.text, r.W / 2, 148 + i * 9, Objectives.done(o.id) && this.t > 3 + i * .6 ? '#ffd36a' : '#667', { align: 'center' })); if (this.pep && this.t > 4) UI.txt(g, 'MARGE: ' + this.pep, r.W / 2, 166, '#fff', { align: 'center', font: 'tiny' }); }
    if (this.revealed >= 3 && this.t > 7) { this.tiles.draw(g, r); UI.legend(g, r, ['{pass} SELECT']); } else Glyphs.text(g, '{pass} SKIP', r.W - 10, r.H - 12, { align: 'right', color: '#9ab' }); }); }
};
// ---- practice: drills list ----
Scenes.sc.practice = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
  enter(d) { this.d = d || {}; Backdrop.ensure('icebox'); const done = Save.get().drills; this.tiles = new UI.Tiles(DRILLS.map(dr => ({ label: dr.id + '. ' + dr.name.toUpperCase(), sub: done[dr.id] ? 'DONE +' : 'TRY IT', draw: null, onPick: () => Drills.start(dr.id, this.d) })), { cols: 4, w: 90, h: 44, gap: 8, y: 64, onCancel: () => game.go(this.d.ret || 'title', this.d.ret ? { id: this.d.id, choice: this.d.choice, warm: true } : null) }); Idle.reset(); Synth.music('menu'); },
  update(dt) { Backdrop.step(dt); if (Idle.tick(dt) && !this.d.warm) return game.go('attract', null, { fade: 'dissolve' }); this.tiles.update(dt); },
  draw(r) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.65)'); UI.title(g, "COACH MARGE'S DRILLS", r.W / 2, 8, 2); this.tiles.draw(g, r); const dr = DRILLS[this.tiles.i]; UI.box(g, 12, 160, r.W - 24, 36, { border: UI.GOLD }); UI.txt(g, dr.name.toUpperCase(), r.W / 2, 164, UI.GOLD, { align: 'center' }); UI.txt(g, dr.teach, r.W / 2, 176, '#cfe', { align: 'center', font: 'tiny' }); const n = Object.keys(Save.get().drills).length; UI.txt(g, n >= 7 ? 'MARGE APPROVED ★' : n + '/7 DRILLS DONE', r.W / 2, 204, n >= 7 ? UI.GOLD : '#9ab', { align: 'center' }); UI.legend(g, r, ['{pass} START', '{deke} BACK']); }); }
};
// ---- records ----
Scenes.sc.records = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
  enter() { Backdrop.ensure(); Idle.reset(); this.page = 0; },
  update(dt) { Backdrop.step(dt); if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' }); const I = game.input; if (I.pressed('left') || I.pressed('right') || I.pressed('confirm')) { this.page = 1 - this.page; Synth.sfx('mv'); } if (I.pressed('cancel')) game.go('title'); },
  draw(r) { Backdrop.draw(r); const rc = Save.get().records, sv = Save.get(); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.7)'); UI.title(g, 'RECORDS', r.W / 2, 8, 3);
    const big = (n, l, x, y) => { UI.box(g, x, y, 96, 52, { border: '#6a7aaa' }); UI.txt(g, String(n), x + 48, y + 8, UI.GOLD, { align: 'center', scale: 3 }); UI.txt(g, l, x + 48, y + 38, '#9ab', { align: 'center' }); };
    const rows = this.page === 0 ? [[Math.round(rc.hardest / 16 * 3.6) + ' km/h', 'HARDEST SHOT'], [Math.round(rc.biggestHit), 'BIGGEST HIT'], [rc.mostGoals, 'MOST GOALS IN A GAME']] : [[rc.fights, 'FIGHTS WON'], [rc.kabooms, 'KABOOMS'], [Save.totalStars() + '/15', 'STORY STARS'], [Object.keys(sv.drills).length + '/7', 'DRILLS DONE']];
    rows.forEach((rw, i) => big(rw[0], rw[1], 24 + (i % 3) * 102, 56 + ((i / 3) | 0) * 62)); UI.txt(g, 'PAGE ' + (this.page + 1) + '/2', r.W / 2, 190, '#9ab', { align: 'center' }); UI.legend(g, r, ['← ▸ PAGE', '{deke} BACK']); }); }
};
// ---- about / credits ----
const ABOUT = () => ABOUT_PAGES;
Scenes.sc.about = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
  enter() { Backdrop.ensure(); this.p = 0; Idle.reset(); },
  update(dt) { Backdrop.step(dt); if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' }); const I = game.input, n = this.n || ABOUT().length; if (I.pressed('right') || I.pressed('Pad5') || I.pressed('confirm')) { this.p = (this.p + 1) % n; Synth.sfx('mv'); } if (I.pressed('left')) { this.p = (this.p + n - 1) % n; Synth.sfx('mv'); } if (I.pressed('cancel')) game.go('title'); const c = I.clicked && I.clicked(); if (c) { if (c[0] < 40) this.p = (this.p + n - 1) % n; else if (c[0] > game.W - 40) this.p = (this.p + 1) % n; } },
  rows(r) { const out = []; ABOUT().forEach((pg, pi) => { const rows = []; pg.lines.forEach(l => E.font.wrap(l, r.W - 44, { font: 'tiny' }).forEach(x => rows.push(x))); for (let i = 0; i < rows.length; i += 15) out.push({ title: pg.title, rows: rows.slice(i, i + 15), more: i > 0 }); }); return out; },
  draw(r) { Backdrop.draw(r); const pgs = this.rows(r), pg = pgs[this.p % pgs.length]; this.n = pgs.length; r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.82)'); UI.title(g, pg.title.toUpperCase() + (pg.more ? ' (CONT.)' : ''), r.W / 2, 6, 2); pg.rows.forEach((l, i) => UI.txt(g, l, 22, 28 + i * 10, '#dfe8ff', { font: 'tiny' })); UI.txt(g, '←', 8, r.H / 2, UI.GOLD, { scale: 2 }); UI.txt(g, '→', r.W - 16, r.H / 2, UI.GOLD, { scale: 2 }); UI.txt(g, (this.p % pgs.length + 1) + '/' + pgs.length, r.W / 2, r.H - 24, '#9ab', { align: 'center' }); UI.legend(g, r, ['← → PAGE', '{deke} BACK']); }); }
};
Scenes.sc.credits = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
  enter() { Backdrop.kill(); Backdrop.ensure('dome', 'muskrats', 'grizzlies'); this.t = 0; Synth.music('credits'); this.clips = Replay.clips().slice(); this.ci = 0; this.fi = 0; },
  update(dt) { this.t += dt; const m = Backdrop.m; if (this.clips.length && m) { const clip = this.clips[this.ci].clip; this.fi += dt * 60; const f = clip[Math.min(clip.length - 1, this.fi | 0)]; Replay.apply && 0; if (this.fi >= clip.length) { this.fi = 0; this.ci = (this.ci + 1) % this.clips.length; } this.frame = f; Flow.animate(m, dt); } else Backdrop.step(dt); if (this.t > 5 && game.input.pressed('cancel') || this.t > 60 + CREDITS.length * 10 / 1) { game.go('title'); } },
  draw(r) { const m = Backdrop.m; if (this.frame && m) { const f = this.frame; f.e.forEach((e, i) => { const s = m.sk[i]; s.x = e[0]; s.y = e[1]; s.heading = e[2]; s.vx = e[3]; s.vy = e[4]; s.state = e[5]; }); f.g.forEach((e, i) => { m.gl[i].x = e[0]; m.gl[i].y = e[1]; }); m.puck.x = f.p[0]; m.puck.y = f.p[1]; m.puck.z = f.p[2]; } Backdrop.draw(r, { zoom: 1 }); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.45)'); let y = r.H - this.t * 14; UI.title(g, 'ICE HOC-KABOOM', r.W / 2, y, 4); y += 40; for (const l of CREDITS) { UI.txt(g, l, r.W / 2, y, l.startsWith('#') ? UI.GOLD : '#fff', { align: 'center', scale: l.startsWith('#') ? 2 : 1 }); y += l.startsWith('#') ? 20 : 12; if (y > r.H + 20) break; } UI.txt(g, 'SAME TIME NEXT YEAR.', r.W / 2, Math.max(r.H / 2, r.H - this.t * 14 + 40 + CREDITS.length * 12 + 24), UI.GOLD, { align: 'center', scale: 2 }); }); }
};
const CREDITS = ['# GAME DESIGN AND CODE', 'Claude Sonnet 5.5 (claude-sonnet-5-5)', "for Michael Crosato's cc-matrix", '', '# ENGINE', 'my-3D2dge v0.85.2 (MIT)', 'AI Hub session client 1.4.0', '', '# SOUND', 'Every sound, voice and song', 'is synthesized in code', '', '# PLAN', 'PLAN.md written by claude-opus-5-5', '', '# STARRING', 'Coach Marge Pelletier', 'Dunny, Snipes, Big Lou and Lemmy', 'Old Gus and Doris', 'Chuck Wallop and Moose Plunkett', '', '# THANKS', 'To every barn that ever', 'smelled like fries and old pucks'];

/* ---- 50-attract.js ---- */
/* ---- ATTRACT MODE: a looping AI-played reel on the real simulation; any input ends it ---- */
Scenes.sc.attract = (() => {
  const SEG = ['Puck Drop', 'Big Hits', 'Highlight Goal', 'Gloves Off', 'KABOOM!', 'Fan Frenzy', 'Story Teaser', 'Flood Wagon', 'Records Card'];
  const DUR = [8, 8, 12, 10, 10, 7, 8, 6, 5];
  const cfgFor = (n, loop) => { const a = ARENA_LIST[(loop + n) % 5], ids = TEAMS.filter(t => t.id !== 'grizzlies' || loop % 2).map(t => t.id), h = ids[(loop * 2 + n) % ids.length], aw = ids[(loop * 2 + n + 1 + (loop % 3)) % ids.length]; return { home: h, away: aw === h ? 'drillers' : aw, arena: a, humans: [], periods: 3, periodLen: 60, ot: false, shootout: false, noReplay: false, cheats: true, infTurbo: true, intros: n === 0, introLen: 3, noSinBin: false, seed: 77 + loop * 13 + n }; };
  let S_ = null;
  const sc = { view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], expand: true, res: 'ps1',
    enter() { Fx.hook(); S_ = { seg: -1, t: 0, loop: 0, visited: new Set(), segT: 0 }; this.next(); Synth.crowdStart(); },
    exit() { game.weather = null; },
    next() {
      S_.seg = (S_.seg + 1) % SEG.length; if (S_.seg === 0 && S_.t > 1) S_.loop++; S_.segT = 0; S_.visited.add(S_.seg); Talk.reset(); UI.clearBanners(); Replay.reset(); Cam.reset(); const n = S_.seg;
      if (n === 6) { this.cut = { lines: STORY.chapters[(S_.loop) % 5].pre.slice(0, 3), i: 0, t: 0 }; Synth.music('locker'); return; }
      if (n === 8) { Synth.music('theme'); this.cut = null; return; }
      this.cut = null; const m = Match.create(cfgFor(n, S_.loop)); m.silent = false; m.attract = true; Dev.attach(m); Cam.snap(Rink.CX, Rink.CY); game.weather = m.arena.weather ? { kind: m.arena.weather, amount: .5 } : null; Synth.music(n === 4 ? 'final' : m.arena.music === 'play' ? 'play' : m.arena.music);
      if (n !== 0) { m.phase = 'play'; m.fo = null; m.noPickup = false; }
      if (n === 0) { Match.faceoffNow(Rink.CX, Rink.CY, true); }
      if (n === 1) this.setupHits(m); if (n === 2) this.setupGoal(m); if (n === 3) this.setupFight(m); if (n === 4) this.setupKaboom(m); if (n === 5) this.setupFan(m); if (n === 7) { Rink.resetScuff(); for (let i = 0; i < 400; i++) Rink.addScuff(Rink.X0 + RNG.sim() * 860, Rink.Y0 + RNG.sim() * 380, .7); Flood.begin(m, () => {}); m.fl.state = 'drive'; m.fl.auto = true; m.fl.dur = 5.5; m.phase = 'flood'; Sim.emit('flood_start', {}); }
    },
    setupHits(m) { const a = m.sk[0], b = m.sk[3]; this.script = { t: 0, f: () => { }, done: false }; b.x = Rink.CX; b.y = Rink.Y0 + 70; b.vx = b.vy = 0; b.state = 'skate'; a.x = Rink.CX - 6; a.y = Rink.Y0 + 140; a.heading = -PI / 2; a.vx = 0; a.vy = -150; a.state = 'check'; a.st = .3; a.turbo = 1; a.items.hotsauce = 99; this.hitDo = 0; },
    setupGoal(m) { m.noPickup = false; const a = m.sk[0], b = m.sk[1], dir = Sim.attackDir(m, 0), gx = Sim.oppGoalX(m, 0); a.x = gx - dir * 150; a.y = Rink.CY - 70; b.x = gx - dir * 110; b.y = Rink.CY + 50; m.puck.x = a.x; m.puck.y = a.y; Puck.take(m, a); a.heading = Math.atan2(Rink.CY + 20 - a.y, dir * 60); for (const o of m.sk) if (o.side === 1) { o.x = gx - dir * 250; o.y = Rink.CY + (o.slot - 1) * 80; } this.stage = 0; this.stT = 0; m.gl[1].rfx = 1; },
    setupFight(m) { const a = m.sk[1], b = m.sk[4]; a.x = Rink.CX - 12; b.x = Rink.CX + 12; a.y = b.y = Rink.CY; a.state = 'skate'; b.state = 'skate'; a.grudge[b.id] = 90; b.grudge[a.id] = 90; this.fT = 1.6; a.skill = b.skill = .6; },
    setupKaboom(m) { const a = m.sk[0], dir = Sim.attackDir(m, 0), gx = Sim.oppGoalX(m, 0); a.x = gx - dir * 160; a.y = Rink.CY + 30; m.puck.x = a.x; m.puck.y = a.y; Puck.take(m, a); Sim.addBoom(m, 0, 100); a.heading = Math.atan2(Rink.CY - a.y, dir * 50); for (const o of m.sk) if (o.side === 1) { o.x = gx - dir * 300; o.y = Rink.CY + (o.slot - 1) * 90; } this.kT = 1.3; this.kDone = false; },
    setupFan(m) { Items.throwItem(m, 'hotsauce'); Items.throwItem(m, 'poutine'); Items.throwItem(m, 'boombox'); m.itemT = 2; this.fanT = 0; m.octos.push({ x: Rink.CX + 40, y: Rink.CY, t: 20 }); },
    update(dt) {
      const I = game.input; if (!S_) return; let act = false; try { act = I.anyPressed(); } catch (e) {} const c = I.clicked && I.clicked(); if (c && Idle.touchOnly()) { act = false; } const p = UI.pointer(); if (p && this.lp && Math.abs(p[0] - this.lp[0]) + Math.abs(p[1] - this.lp[1]) > 8) act = true; this.lp = p ? [p[0], p[1]] : this.lp;
      if (act && !(Idle.touchOnly() && !I.anyPressed())) { I.consumeAll(); return game.go('title', null, { fade: 'dissolve' }); }
      S_.t += dt; S_.segT += dt; const n = S_.seg, m = Match.cur();
      if (S_.segT > DUR[n]) { this.next(); return; }
      if (this.cut) { this.cut.t += dt; if (this.cut.t > 2.6) { this.cut.t = 0; this.cut.i = (this.cut.i + 1) % this.cut.lines.length; const [w, tx] = this.cut.lines[this.cut.i]; Synth.babble(tx, Rigs.VOICE_OF[w] || 'gen', { excl: true }); } if (this.cut.t < dt + .001 && this.cut.i === 0) { const [w, tx] = this.cut.lines[0]; Synth.babble(tx, Rigs.VOICE_OF[w] || 'gen'); } return; }
      if (!m) return; m.clock = Math.max(m.clock, 30); Flow.step(m, dt); Cam.update(m, dt); Talk.update(dt); Fx_step(m);
      if (n === 1 && this.hitDo === 0 && this.stT !== undefined) { const a = m.sk[0], b = m.sk[3]; if (Math.hypot(a.x - b.x, a.y - b.y) < 14 || S_.segT > 1.2) { this.hitDo = 1; if (b.state !== 'down') { Hits.bigHit(m, a, b, 340, [0, -1]); b.vy = -300; b.vx = 0; } } }
      if (n === 2) { this.stT += dt; const a = m.sk[0], b = m.sk[1]; if (this.stage === 0 && this.stT > 1) { this.stage = 1; if (a.hasPuck) { b.oneTimerT = .5; Puck.pass(m, a, b.x, b.y, b, false); } } else if (this.stage === 1 && this.stT > 1.6 && !a.hasPuck) { this.stage = 2; if (!b.hasPuck) { b.oneTimerT = .5; } } else if (this.stage === 1 && b.hasPuck) { this.stage = 2; Puck.shoot(m, b, 'onetimer', .9, { far: -1 }); } }
      if (n === 3) { this.fT -= dt; if (this.fT <= 0 && !m.fight && m.phase === 'play') { Fight.begin(m, m.sk[1], m.sk[4]); this.fT = 99; } }
      if (n === 4 && !this.kDone) { this.kT -= dt; if (this.kT <= 0) { const a = m.sk[0]; if (a.hasPuck) { this.kDone = true; a.holdShoot = 2; Puck.shoot(m, a, 'slap', 1, { far: .2 }); } else this.kT = .3; } }
      if (n === 5) { this.fanT += dt; if (this.fanT > 2) { this.fanT = 0; Items.throwItem(m, 'lumber'); } }
    },
    draw(r) {
      const n = S_.seg, m = Match.cur();
      if (this.cut) { r.sky(['#101828', '#18243a']); r.overlay(g => { const ch = this.cut; const [who, tx] = ch.lines[ch.i]; UI.title(g, 'STORY', r.W / 2, 18, 3); const rig = Rigs.portrait(who); rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: PI / 2, expr: 'shout' }); UI.box(g, 30, 80, r.W - 60, 70, { border: UI.GOLD }); Rigs.face(g, rig, 38, 88, 52, { turn: .4 }); UI.txt(g, who, 100, 92, UI.GOLD, { scale: 2 }); const ws = E.font.wrap(tx.replace(/\{[^}]*\}/g, ''), r.W - 140, {}); ws.slice(0, 3).forEach((l, i) => UI.txt(g, l, 100, 110 + i * 11, '#fff')); this.overlayTags(g, r); }); return; }
      if (n === 8 || !m) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.6)'); UI.title(g, 'ICE HOC-KABOOM', r.W / 2, 20, 4); const rc = Save.get().records; UI.txt(g, 'HARDEST SHOT  ' + Math.round(rc.hardest / 16 * 3.6) + ' km/h', r.W / 2, 90, UI.GOLD, { align: 'center' }); UI.txt(g, 'STORY STARS  ' + Save.totalStars() + '/15', r.W / 2, 104, '#cfe', { align: 'center' }); this.overlayTags(g, r); }); return; }
      DrawMatch.draw(r, m, game.time); r.overlay(g => this.overlayTags(g, r));
    },
    overlayTags(g, r) { const n = S_.seg; UI.box(g, 6, r.H - 22, 76, 14, { border: '#ff6a6a', alpha: .9 }); UI.txt(g, 'DEMO - ' + SEG[n].toUpperCase(), 10, r.H - 19, '#ff9a8a', { font: 'tiny' }); UI.txt(g, 'ICE HOC-KABOOM', r.W - 8, r.H - 20, '#ffd36a', { align: 'right', font: 'tiny' }); const msg = Idle.touchOnly() ? 'Controller or keyboard required' : 'PRESS ANY BUTTON'; if (Math.floor(game.time * 2) % 2 || Idle.touchOnly()) { if (Idle.touchOnly()) UI.txt(g, msg, r.W / 2, r.H - 14, '#fff', { align: 'center', scale: 1 }); else Glyphs.text(g, msg, r.W / 2, r.H - 12, { align: 'center', color: '#fff' }); } }
  };
  const Fx_step = m => {};
  sc.state = () => S_ ? { segment: S_.seg, visited: Array.from(S_.visited), loop: S_.loop } : null;
  return sc;
})();
// ---- animation lab (dev) ----
Scenes.sc.lab = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
  enter() { this.i = 0; this.t = 0; this.rig = Rigs.skater(TEAM.muskrats.skaters[0], 0, TEAM.muskrats, false); this.g = Rigs.goalie(TEAM.muskrats.goalie, TEAM.muskrats, false); this.map = Rink.buildMap(ARENAS.icebox); game.cam.bounds = null; Synth.music(null); this.list = ['skate', 'glide', 'hockey stop', 'wrist shot', 'slapshot', 'pass', 'check', 'deke spin', 'poke', 'big hit fall', 'celebrate', 'fight jab', 'fight haymaker', 'goalie ready', 'goalie butterfly', 'goalie glove']; },
  update(dt) { this.t += dt; const I = game.input; if (I.pressed('up')) this.i = (this.i + this.list.length - 1) % this.list.length; if (I.pressed('down')) this.i = (this.i + 1) % this.list.length; if (I.pressed('cancel')) game.go('title'); if (I.pressed('camera')) game.nextView && game.nextView(); },
  draw(r) { const n = this.list[this.i], u = (this.t % 1.2) / 1.2, x = Rink.CX, y = Rink.CY, st = { x, y, z: 0, facing: 0, vx: 0, vy: 0 }; const mv = () => { if (n === 'skate') { st.vx = 120; } if (n === 'hockey stop') st.crouch = .5; if (n.includes('shot') || n === 'pass') st.attack = E.move(n === 'slapshot' ? 'overhead' : 'backslash', u); if (n === 'check') st.attack = E.move('bash', u); if (n === 'poke') st.attack = E.move('thrust', u); if (n === 'deke spin') st.facing = u * TAU; if (n === 'big hit fall') { st.down = .9; st.flip = u; } if (n === 'celebrate') st.pose = 'cheer'; if (n === 'fight jab') { st.stance = 'guard'; st.attack = E.move('jab', u); } if (n === 'fight haymaker') { st.stance = 'guard'; st.attack = E.move('haymaker', u); } }; mv(); this.rig.update(1 / 60, st); this.g.update(1 / 60, { x: x + 60, y, z: 0, facing: PI, crouch: n === 'goalie butterfly' ? 1 : .35, pose: n === 'goalie glove' ? 'wave' : undefined }); game.focus(x + 20, y, 10); game.setZoom(3); this.map.drawFloor(r); const s = { x, y, z: 0, rig: this.rig, heading: st.facing, num: 9, jersey: '#5a3a22', state: 'skate', items: {}, swing: u < .5 ? 1 : 0 }; Rigs.drawSkater(r, s, E.charView(r.view)); Rigs.drawGoalie(r, { x: x + 60, y, z: 0, rig: this.g, heading: PI, def: { padCol: '#f3e6c8' }, num: 31, jersey: '#5a3a22' }, E.charView(r.view)); r.overlay(g => { this.list.forEach((l, i) => UI.txt(g, (i === this.i ? '▸ ' : '  ') + l, 8, 10 + i * 11, i === this.i ? UI.GOLD : '#9ab')); UI.txt(g, 'ANIMATION LAB  ↑↓ pick  ○ back', 8, r.H - 10, '#789', { font: 'tiny' }); }); }
};

/* ---- 60-dev.js ---- */
/* ---- PRACTICE DRILLS ---- */
const Drills = (() => {
  let st = null;
  const cfgOf = (id) => ({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, periodLen: 600, ot: false, shootout: false, humans: [{ side: 0, input: game.input, seat: 0 }], noBoom: id !== 7, noItems: true, noFight: id !== 6, noReplay: true, noIntro: true, noSwitch: true, drill: id, noSinBin: true, freezeAI: id === 1 || id === 3 || id === 5 || id === 6 || id === 7, flood: false, intros: false, replays: false, practice: id === 6 ? 'spar' : null, noGoalie: id === 3, seed: 100 + id });
  function start(id, ret) { Scenes.drillRet = ret; game.go('match', { cfg: cfgOf(id), ret: 'practice', kind: 'drill' }, { fade: 'wipe' }); }
  const park = (m, sides) => { for (const s of m.sk) if (sides.includes(s.side) && s !== m.humans[0].sk) { s.state = 'bin'; s.bin = 1e9; } };
  function begin(m, id) {
    const dr = DRILLS[id - 1], me = m.humans[0].sk; st = { id, dr, n: 0, need: dr.need, t: 0, done: false, intro: 7, gate: 0, flags: {}, fin: 0, saucer: 0, corners: {}, tleft: 25 };
    m.phase = 'play'; m.fo = null; m.noPickup = id === 1 || id === 5 || id === 6; m.hideHud = false; m.clock = 600;
    me.x = Rink.CX - 200; me.y = Rink.CY; me.heading = 0; me.vx = me.vy = 0;
    if (id === 1) { park(m, [1]); for (const s of m.sk) if (s.side === 0 && s !== me) { s.state = 'bin'; s.bin = 1e9; } m.puck.frozen = true; m.puck.x = Rink.CX; m.puck.y = Rink.CY; st.gates = [[Rink.CX - 200, Rink.CY - 120], [Rink.CX - 40, Rink.CY + 130], [Rink.CX + 120, Rink.CY - 120], [Rink.CX + 280, Rink.CY + 20], [Rink.CX + 60, Rink.CY + 20], [Rink.CX - 260, Rink.CY + 80]]; }
    if (id === 2) { park(m, [1]); respawn(m); }
    if (id === 3) { park(m, [1]); st.targets = [[1, -1], [1, 1], [0, -1], [0, 1]]; respawn(m); }
    if (id === 4) { for (const s of m.sk) if (s.side === 1 && s.slot !== 99) { s.state = 'bin'; s.bin = 1e9; } respawn(m); }
    if (id === 5) { for (const s of m.sk) if (s.side === 0 && s !== me) { s.state = 'bin'; s.bin = 1e9; } m.puck.x = Rink.CX; m.puck.frozen = true; st.dummies = m.sk.filter(s => s.side === 1); st.dummies.forEach((s, i) => { s.state = 'skate'; s.x = Rink.X0 + 110 + i * 40; s.y = Rink.Y0 + 36 + (i % 2) * 6; s.vx = s.vy = 0; s.freeze = true; s.rt.hit = 1; }); me.x = Rink.CX - 120; me.y = Rink.CY + 90; }
    if (id === 6) { for (const s of m.sk) if (s !== me && s !== m.sk.find(q => q.side === 1 && q.slot === 2)) { s.state = 'bin'; s.bin = 1e9; } const lou = m.sk.find(q => q.side === 1 && q.slot === 2); me.x = Rink.CX - 12; me.y = Rink.CY; lou.x = Rink.CX + 12; lou.y = Rink.CY; lou.state = 'skate'; lou.nick = 'BIG LOU'; me.grudge[lou.id] = 50; lou.grudge[me.id] = 50; m.puck.frozen = true; st.fightT = 1.2; }
    if (id === 7) { park(m, [1]); for (const s of m.sk) if (s.side === 0 && s !== me) { s.state = 'bin'; s.bin = 1e9; } respawn(m); Sim.addBoom(m, 0, 100); }
    Synth.babble(dr.teach, 'marge'); st.begun = true;
  }
  function respawn(m) {
    if (!st) return; const me = m.humans[0].sk, p = m.puck; m.phase = 'play'; m.phaseNoPlay = false; p.frozen = false; p.inNet = -1; p.out = false; p.fire = false; for (const g of m.gl) { g.state = 'ready'; g.save = null; if (st.id === 3) { g.x = Rink.X0 - 80; g.y = Rink.CY - 200; } else { g.x = Sim.ownGoalX(m, g.side) + Sim.attackDir(m, g.side) * 12; g.y = Rink.CY; } } m.noPickup = false;
    if (me.state === 'celebrate') me.state = 'skate'; for (const s of m.sk) if (s.state === 'celebrate') { s.state = 'skate'; }
    me.state = 'skate'; me.hasPuck = false; me.vx = me.vy = 0;
    if (st.id === 4) { const mate = m.sk.find(s => s.side === 0 && s !== me); me.x = Rink.CX + 280; me.y = Rink.CY - 20; me.heading = 0; mate.x = Rink.CX + 250; mate.y = Rink.CY + 80; mate.state = 'skate'; mate.vx = mate.vy = 0; p.owner = null; Puck.take(m, mate); st.feed = 1.2; }
    else { me.x = Rink.CX + (st.id === 7 ? 120 : st.id === 3 ? 220 : 0); me.y = Rink.CY + (RNG.sim() - .5) * 60; me.heading = 0; p.owner = null; p.x = me.x + 10; p.y = me.y; p.vx = p.vy = 0; Puck.take(m, me); }
  }
  function step(m, dt) {
    if (!st || !m.cfg.drill) return; const me = m.humans[0].sk; st.t += dt; if (st.intro > 0) st.intro -= dt;
    if (st.done) { st.fin -= dt; if (st.fin <= 0 && !m.over) { m.over = true; } return; }
    for (const s of m.sk) { if (s.freeze && s.state === 'skate') { s.vx *= .9; s.vy *= .9; } }
    const id = st.id;
    if (id === 1) { st.tleft -= dt; const g = st.gates[st.gate]; if (g && Math.hypot(me.x - g[0], me.y - g[1]) < 16 && (st.gate < 5 || st.stopped)) { st.gate++; st.n++; Synth.sfx('pickup'); } if (st.n >= 6) complete(m); else if (st.tleft <= 0) { st.tleft = 25; st.gate = 0; st.n = 0; st.stopped = false; UI.toast('TOO SLOW - AGAIN!', '#ff8a6a', 2); } }
    if (id === 4 && st.feed != null) { st.feed -= dt; const mate = m.sk.find(s => s.side === 0 && s !== me); if (st.feed <= 0 && mate.hasPuck) { st.feed = null; Puck.pass(m, mate, me.x, me.y + 10, me, false); } }
    if (id === 5 && st.glass && st.n >= 3) complete(m);
    if (id === 6) { if (st.fightT > 0) { st.fightT -= dt; if (st.fightT <= 0 && !m.fight) { const lou = m.sk.find(q => q.side === 1 && q.slot === 2); Fight.begin(m, me, lou); } } }
    if (id === 7 && me.state !== 'wind' && !me.hasPuck && !m.puck.owner && m.puck.age > 4 && Math.hypot(m.puck.vx, m.puck.vy) < 10) respawn(m); if (id === 7 && m.kaboom[0] <= 0 && !st.done) Sim.addBoom(m, 0, 100);
    if ((id === 2 || id === 3 || id === 4) && !me.hasPuck && !m.puck.owner && Math.hypot(m.puck.vx, m.puck.vy) < 6 && m.puck.age > 3 && m.phase === 'play' && !m.puck.frozen && m.humans[0].sk) { st.idle = (st.idle || 0) + dt; if (st.idle > 3) { st.idle = 0; respawn(m); } } else st.idle = 0;
    if (id === 2 && !m.puck.owner && false) {}
  }
  function complete(m) { if (st.done) return; st.done = true; st.fin = 3; Save.get().drills[st.id] = true; Save.write(); UI.banner('DRILL COMPLETE!', { size: 4, dur: 2.5 }); Synth.sfx('star'); Synth.babble('Not bad, kid. Not bad at all.', 'marge', { excl: true }); }
  Bus.on('pass_complete', e => { const m = Match.cur(); if (!st || !m || !m.cfg.drill || st.id !== 2 || st.done) return; if (e.from === m.humans[0].sk) { if (m.puck.saucer) { st.saucer++; m.puck.saucer = false; } else if (st.n < 5) st.n++; if (st.n >= 5 && st.saucer >= 1) complete(m); if (st.n >= 5) st.need = 6; } });
  Bus.on('goal', e => { const m = Match.cur(); if (!st || !m || !m.cfg.drill || st.done) return; const me = m.humans[0].sk; if (st.id === 3 && e.scorer === me) { const key = (st.shotHigh ? 1 : 0) + ':' + (st.lastY > Rink.CY ? 1 : -1); if (!st.corners[key]) { st.corners[key] = 1; st.n++; } if (st.n >= 4) complete(m); } if (st.id === 4 && e.shot === 'onetimer' && e.scorer === me) { st.n++; if (st.n >= 3) complete(m); } if (st.id === 7 && e.fire) complete(m); });
  Bus.on('stop', e => { const m = Match.cur(); if (st && m && m.cfg.drill && st.id === 1 && e.s === m.humans[0].sk && st.gate === 5 && Math.hypot(e.s.x - st.gates[5][0], e.s.y - st.gates[5][1]) < 60) st.stopped = true; });
  Bus.on('shot', e => { if (st) { st.shotHigh = e.kind === 'slap' || e.kind === 'kaboom'; } });
  Bus.on('goal_line', () => { const m = Match.cur(); if (st && m && m.cfg.drill) { st.lastZ = m.puck.z; st.lastY = m.puck.y; } });
  Bus.on('big_hit', e => { const m = Match.cur(); if (st && m && m.cfg.drill && st.id === 5 && e.b.freeze && e.a.side === 0) { st.n++; e.b.x = Rink.X0 + 110 + (st.n % 3) * 40; } }); Bus.on('glass_shatter', () => { if (st && st.id === 5) st.glass = true; });
  Bus.on('fight_end', e => { const m = Match.cur(); if (st && m && m.cfg.drill && st.id === 6) { if (e.w && e.w.side === 0) complete(m); else st.fightT = 1.5; } });
  Bus.on('fight_over', e => { const m = Match.cur(); if (st && m && m.cfg.drill && st.id === 6 && !st.done) { const me = m.humans[0].sk; me.state = 'skate'; const lou = m.sk.find(q => q.side === 1 && q.slot === 2); lou.state = 'skate'; if (lou.bin > 0) { lou.bin = 0; } me.grudge[lou.id] = 50; lou.grudge[me.id] = 50; m.phase = 'play'; m.after = null; m.phaseNoPlay = false; me.x = Rink.CX - 12; lou.x = Rink.CX + 12; me.y = lou.y = Rink.CY; m.sinBin = []; } });
  function finish(m) { const r = Scenes.drillRet; if (r && r.warm) game.go('pregame', { id: r.id, choice: r.choice, warm: true }, { fade: 'wipe' }); else game.go('practice', null, { fade: 'wipe' }); }
  function draw(g, r, m) {
    if (!st || !m.cfg.drill) return; const dr = st.dr; UI.box(g, 6, 6, 118, 36, { border: UI.GOLD, alpha: .9 }); UI.txt(g, 'DRILL ' + dr.id + ': ' + dr.name.toUpperCase(), 12, 10, UI.GOLD); UI.txt(g, st.id === 2 ? 'PASSES ' + st.n + '/5   SAUCER ' + Math.min(1, st.saucer) + '/1' : st.id === 1 ? 'GATES ' + st.n + '/6   TIME ' + Math.ceil(st.tleft) : st.id === 3 ? 'TARGETS ' + st.n + '/4  (WRIST = LOW, SLAP = HIGH)' : st.id === 4 ? 'ONE-TIMERS ' + st.n + '/3' : st.id === 5 ? 'DUMMIES ' + st.n + '/3  GLASS ' + (st.glass ? '+' : '-') : st.id === 6 ? 'WIN THE SPAR' : 'KABOOM GOAL', 12, 22, '#fff');
    if (st.id === 1 && st.gates) st.gates.forEach((gt, i) => { }); if (st.intro > 0) { UI.box(g, r.W / 2 - 150, r.H - 62, 300, 34, { border: '#ffd36a', alpha: .95 }); UI.txt(g, 'COACH MARGE', r.W / 2 - 140, r.H - 58, '#ffd36a'); UI.txt(g, dr.teach, r.W / 2 - 140, r.H - 46, '#fff', { font: 'tiny' }); } UI.drawBanners(g, r, game.dt || 1 / 60);
  }
  function world(r, m) { if (!st || !m.cfg.drill) return; if (st.id === 1 && st.gates) st.gates.forEach((gt, i) => { const ok = i < st.gate, nx = i === st.gate; r.queue(gt[0], gt[1], 0, g => { const [x, y] = r.w(gt[0], gt[1], 0), [x2, y2] = r.w(gt[0], gt[1], 22); px.line(g, Math.round(x), Math.round(y), Math.round(x2), Math.round(y2), ok ? '#4a6a4a' : nx ? '#ffd36a' : '#ff6a3a', 2); px.disc(g, Math.round(x2), Math.round(y2), 3, ok ? '#4a6a4a' : nx ? '#ffd36a' : '#ff6a3a'); E.font.text(g, String(i + 1), Math.round(x), Math.round(y2) - 10, '#fff', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: nx }); });
    if (st.id === 3) for (const [hi, sd] of st.targets) { const gx = Rink.CX + 376 + 0, gy = Rink.CY + sd * 11, key = hi + ':' + sd; r.queue(Rink.goalLineX(1), gy, 0, g => { const [x, y] = r.w(Rink.goalLineX(1), gy, hi ? 17 : 4); px.disc(g, Math.round(x), Math.round(y), 3, st.corners[key] ? '#4ae04a' : '#ff4a4a'); }, { emissive: true }); } }
  return { start, begin, step, draw, world, respawn, finish, get st() { return st; } };
})();

/* ---- DEV MODE ---- */
const Dev = (() => {
  let visible = false, live = false, tab = 0, lists = [], m = null, flags = { bodies: false, targets: false, fps: false, hud: false }, slow = 1, seedShown = 0;
  const TABS = ['TUNING', 'CHEATS', 'WARP', 'DEBUG']; const cheats = { infTurbo: false, god: false, always: false, magnet: false, freeze: false, noGoalie: false, bigHeads: false, octo: false, glow: false, retro: false };
  const SOUNDS = ['tock', 'thwap', 'snap', 'slap', 'onetimer', 'ping', 'ping2', 'boards', 'glass', 'net', 'thump', 'bighit', 'crack', 'shatter', 'whistle', 'buzzer', 'punch', 'twinkle', 'pickup', 'throw', 'splort', 'boomsub', 'ooga', 'fanfare', 'star'];
  function rows(t) {
    const M = () => Match.cur();
    if (t === 0) { const out = [{ label: 'RESET ALL TO DEFAULTS', action: () => { T.resetAll(); UI.toast('TUNING RESET', UI.GOLD, 2); } }, { label: 'LOG TUNING TO CONSOLE', action: () => { try { console.log('[TUNING]', JSON.stringify(T.nonDefault())); } catch (e) {} UI.toast('LOGGED', UI.GOLD, 1.5); } }]; let grp = ''; for (const [k, d, mn, mx, st_, g, l] of TUNE) { if (g !== grp) { grp = g; out.push({ label: '- ' + g.toUpperCase() + ' -', disabled: true }); } const fix = v => Math.abs(st_) < 1 ? v.toFixed(2) : String(Math.round(v)); out.push({ label: l, value: () => fix(T[k]) + (T[k] !== d ? '  (' + fix(d) + ')' : ''), frac: () => (T[k] - mn) / (mx - mn), adjust: dd => { T[k] = clamp(+(T[k] + st_ * dd).toFixed(4), mn, mx); T.save(); }, reset: () => { T.reset(k); }, slider: f => { T[k] = clamp(+(Math.round((mn + (mx - mn) * f) / st_) * st_).toFixed(4), mn, mx); T.save(); } }); } return out; }
    if (t === 1) { const tg = (k, l) => ({ label: l, value: () => cheats[k] ? 'ON' : 'OFF', toggle: () => { cheats[k] = !cheats[k]; applyCheats(); } }); return [tg('infTurbo', 'Infinite turbo'), tg('god', 'God mode (no knockdowns)'), tg('always', 'Always KABOOM'), tg('magnet', 'Puck magnet'), tg('freeze', 'Freeze AI'), tg('noGoalie', 'CPU goalies off'), tg('bigHeads', 'Big heads'), tg('octo', 'Octopus rain'), tg('glow', 'Glow puck'), tg('retro', 'Retro rigs'), { label: 'Instant BOOM full', action: () => { const mm = M(); if (mm) Sim.addBoom(mm, 0, 100); } }]; }
    if (t === 2) { const w = (l, f) => ({ label: l, action: () => { const mm = M(); if (mm) { try { f(mm); } catch (e) { game.fail('warp', e); } } } }); const out = [];
      STORY.chapters.forEach(ch => out.push({ label: 'Start chapter ' + ch.id + ': ' + ch.title, action: () => { visible = false; Save.get().unlocked = Math.max(Save.get().unlocked, ch.id); Story.startMatch(ch.id, 0); } }));
      out.push(w('Jump to period 2', mm => warpPeriod(mm, 2)), w('Jump to period 3', mm => warpPeriod(mm, 3)), w('Overtime', mm => { warpPeriod(mm, mm.periods); mm.clock = 0; }), w('Shootout', mm => { mm.ot = true; Shootout.begin(mm); }), w('Clock to 0:10', mm => { mm.clock = 10; }), w('Score +1 home', mm => { mm.score[0]++; }), w('Score +1 away', mm => { mm.score[1]++; }), w('Win this game now', mm => { mm.score[0] = Math.max(mm.score[0], mm.score[1] + 1); Flow.finalize(mm); }), w('Lose this game now', mm => { mm.score[1] = Math.max(mm.score[1], mm.score[0] + 1); Flow.finalize(mm); }));
      for (const k of Object.keys(ITEMS)) out.push(w('Spawn ' + ITEMS[k].name, mm => { const o = Items.throwItem(mm, k); o.fly = 0; o.x = Rink.CX; o.y = Rink.CY; }));
      out.push(w('Spawn octopus', mm => mm.octos.push({ x: Rink.CX, y: Rink.CY, t: 20 })), w('Start a fight', mm => { const a = mm.humans[0] ? mm.humans[0].sk : mm.sk[0], b = mm.sk.find(s => s.side !== a.side); if (a && b && !mm.fight) Fight.begin(mm, a, b); }), w('Start KABOOM', mm => Sim.startKaboom(mm, 0)), w('Break the thin ice', mm => { for (const t of mm.thin) { t.hp = 0; t.hole = true; t.re = 30; Sim.emit('thin_ice_break', { t, x: t.x, y: t.y }); } }), w('Shatter a panel', mm => { const p = Rink.panels[10]; p.st = 2; Sim.emit('glass_shatter', { pn: p, s: mm.sk[0], by: null }); }), w('Trigger the Flood Wagon', mm => { Flood.begin(mm, () => { Match.faceoffNow(Rink.CX, Rink.CY, true); }); }));
      out.push({ label: 'Go to results', action: () => { visible = false; const mm = M(); if (mm) { Results.compute(mm); game.go('results', { m: mm, ctx: mm.ctx }); } } }, { label: 'Go to attract', action: () => { visible = false; game.go('attract'); } }, { label: 'Go to about', action: () => { visible = false; game.go('about'); } }, { label: 'Go to animation lab', action: () => { visible = false; game.go('lab'); } }); return out; }
    const tg = (k, l) => ({ label: l, value: () => flags[k] ? 'ON' : 'OFF', toggle: () => { flags[k] = !flags[k]; if (k === 'hud') { const mm = M(); if (mm) mm.hideHud = flags.hud; } } });
    const out = [tg('bodies', 'Show bodies + blade points'), tg('targets', 'Show AI targets + roles'), tg('fps', 'FPS readout'), tg('hud', 'Hide HUD (screenshot mode)'), { label: 'Slow motion', value: () => slow + 'x', adjust: d => { slow = [1, .5, .25][(([1, .5, .25].indexOf(slow)) + (d > 0 ? 1 : 2)) % 3]; game.timeScale = slow; } }, { label: 'RNG seed', value: () => String(M() ? M().cfg.seed : '-'), action: () => {} }];
    out.push({ label: '- SOUND TEST -', disabled: true }); for (const s of SOUNDS) out.push({ label: 'sfx: ' + s, action: () => Synth.sfx(s) }); out.push({ label: 'horn', action: () => Synth.horn(false) }, { label: 'double horn', action: () => Synth.horn(true) });
    for (const k of Object.keys(Synth.ORGAN)) out.push({ label: 'organ: ' + k, action: () => Synth.organ(Synth.ORGAN[k], 140) }); for (const k of Object.keys(Synth.GOALSONG)) out.push({ label: 'goal song: ' + k, action: () => Synth.organ(Synth.GOALSONG[k], 150) });
    for (const k of Object.keys(Synth.SONGS)) out.push({ label: 'song: ' + k, action: () => Synth.music(k, { force: true }) }); for (const k of Object.keys(VOICES)) out.push({ label: 'voice: ' + k, action: () => Synth.babble('Hello there, this is a test of my voice!', k, { excl: true }) });
    for (const k of ['ohh', 'ahh', 'cheer', 'boo', 'roar', 'chant']) out.push({ label: 'crowd: ' + k, action: () => Synth.react(k) }); return out;
  }
  function warpPeriod(mm, p) { mm.period = Math.min(p, mm.periods); mm.clock = mm.cfg.periodLen; mm.phase = 'faceoff'; Match.faceoffNow(Rink.CX, Rink.CY, true); mm.end = (mm.period % 2) ? [0, 1] : [1, 0]; }
  function applyCheats() { const mm = Match.cur(); if (!mm) return; mm.cfg.infTurbo = cheats.infTurbo; mm.cfg.god = cheats.god; mm.cfg.alwaysKaboom = cheats.always; mm.cfg.freezeAI = cheats.freeze; mm.cfg.magnet = cheats.magnet; mm.cfg.noGoalieCpu = cheats.noGoalie; for (const s of mm.sk) s.rig.o.headR = cheats.bigHeads ? 1.8 : undefined; if (cheats.octo) for (let i = 0; i < 6; i++) mm.octos.push({ x: Rink.CX + (RNG.fx() - .5) * 500, y: Rink.CY + (RNG.fx() - .5) * 250, t: 25 }); if (cheats.glow) S_trail('Glow'); }
  const S_trail = v => { try { game.settings.set('puckTrail', v); } catch (e) {} };
  function build() { lists = TABS.map((_, i) => new UI.List(rows(i), { vis: 10 })); }
  function open() { if (HUB) return; visible = true; tab = 0; build(); try { game.resume(); } catch (e) {} Synth.sfx('ok'); }
  function update(dt) {
    if (!visible || HUB) return; const I = game.input; if (!lists.length) build();
    if (I.pressed('cancel') || I.pressed('pause')) { visible = false; game.input.consumeAll(); Synth.sfx('back'); return; }
    if (I.pressed('chirp')) { tab = (tab + 3) % 4; Synth.sfx('mv'); } if (I.pressed('turbo')) { tab = (tab + 1) % 4; Synth.sfx('mv'); }
    if (I.pressed('switch')) { live = !live; UI.toast('LIVE ' + (live ? 'ON' : 'OFF'), UI.GOLD, 1.2); }
    const L = lists[tab]; while (L.rows[L.i] && L.rows[L.i].disabled) L.i = (L.i + 1) % L.rows.length; L.update(dt); while (L.rows[L.i] && L.rows[L.i].disabled) { L.i = (L.i + 1) % L.rows.length; }
    const mm = Match.cur(); if (mm && cheats.magnet && !mm.puck.owner && mm.humans[0] && mm.humans[0].sk) { const s = mm.humans[0].sk, p = mm.puck; p.vx += (s.x - p.x) * .8; p.vy += (s.y - p.y) * .8; }
    if (mm && cheats.noGoalie) for (const g of mm.gl) if (g.side === 1) g.y = Rink.CY + 200;
  }
  function draw(g, r) {
    if (flags.fps) UI.txt(g, 'FPS ' + Math.round(game.fps || 60), r.W - 50, r.H - 10, '#6f6');
    if (!visible || HUB) return; const w = live ? r.W * .45 : r.W - 24, x = live ? r.W - w - 4 : 12, y = 8;
    UI.box(g, x, y, w, r.H - 16, { bg: ['#0a1020', '#05080f'], border: UI.GOLD, alpha: .96 }); TABS.forEach((t, i) => { UI.txt(g, t, x + 12 + i * 62, y + 6, i === tab ? UI.GOLD : '#789'); }); UI.txt(g, 'DEV MODE' + (live ? ' (LIVE)' : ''), x + w - 8, y + 6, '#f66', { align: 'right' });
    const L = lists[tab]; if (L) L.draw(g, x + 8, y + 20, w - 16, 14); UI.txt(g, 'L1/R1 tabs  ←▸ adjust  △ reset row  L2 live  ○ close', x + 10, r.H - 20, '#789', { font: 'tiny' });
  }
  function world(r, m_) {
    if (!flags.bodies && !flags.targets) return; const mm = m_; for (const s of mm.sk) { if (flags.bodies) { const bp = Rigs.stickPoint(s); r.queue(s.x, s.y, 1, g => { const [x, y] = r.w(s.x, s.y, 0), [bx, by] = r.w(bp[0], bp[1], 0); px.ell(g, Math.round(x), Math.round(y), 6, 4, 'rgba(255,60,60,.4)'); px.dot(g, Math.round(bx), Math.round(by), '#ff0'); }, { emissive: true }); } if (flags.targets && s.aiGoal) r.queue(s.x, s.y, 1, g => { const [x, y] = r.w(s.x, s.y, 4), [tx, ty] = r.w(s.aiGoal[0], s.aiGoal[1], 0); px.line(g, Math.round(x), Math.round(y), Math.round(tx), Math.round(ty), s.side ? '#fff' : '#fc4', 1); E.font.text(g, s.state, Math.round(x), Math.round(y) - 30, '#0f0', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true }); }
  }
  return { open, update, draw, world, attach(mm) { m = mm; applyCheats(); }, holds: (mm) => visible && !live && !HUB, get visible() { return visible; }, set visible(v) { visible = v; }, cheats, flags, rows };
})();

/* ---- 70-net.js ---- */
/* ---- AI HUB SESSION: shared-world, host-authoritative ---- */
const Net = (() => {
  const H = () => window.AIHub; let info = null, role = 'none', m = null, seq = 0, sendT = 0, snapT = 0, snaps = [], ended = false, finished = false, started = false, cardState = null, myAnswer = null, counters = [0, 0, 0, 0, 0, 0], overlay = false, ovList = null, pred = null, evId = 0, evOut = [], seenEv = new Set(), left = new Set(), roundStartedWith = 0, timeUp = false;
  const PH = ['intro', 'faceoff', 'play', 'goal', 'replay', 'stoppage', 'periodEnd', 'flood', 'final', 'fight', 'shootout']; const ST = ['skate', 'stop', 'wind', 'shoot', 'pass', 'check', 'deke', 'poke', 'stun', 'down', 'getup', 'celebrate', 'faceoff', 'fight', 'bin', 'frozen', 'buried', 'slip'];
  const GS = ['ready', 'shuffle', 'butterfly', 'glove', 'blocker', 'stack', 'poke', 'cover', 'blasted', 'celebrate', 'manual'];
  const seatSide = seat => seat % 2;
  async function boot() {
    if (!HUB) return null; try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; } if (!info) return null;
    role = info.server ? 'server' : info.isHost ? 'host' : 'client'; return info;
  }
  function cfgFor() {
    const rng = AIHub.rng('setup'), ids = TEAMS.filter(t => t.id !== 'grizzlies').map(t => t.id), h = ids[(rng() * ids.length) | 0]; let a = ids[(rng() * ids.length) | 0]; if (a === h) a = ids[(ids.indexOf(h) + 1) % ids.length];
    const humans = info.players.map(p => ({ side: seatSide(p.id), seat: p.id, input: p.id === info.me ? game.input : null, remote: p.id !== info.me, name: U.sanitize(p.name), color: p.color }));
    return { home: h, away: a, arena: ARENA_LIST[(rng() * 4) | 0], periods: 1, periodLen: 180, ot: true, shootout: false, intros: false, noFlood: true, noItems: false, session: true, humans, seed: info.seed >>> 0, diff: 1, noReplay: false, replays: true, goalLen: 3, noIntro: true, remoteClient: role === 'client', holdStart: true };
  }
  function setup() {
    const cfg = cfgFor(); Fx.hook(); m = Match.create(cfg); m.hideHud = true; m.silent = false; roundStartedWith = info.players.length; Dev.attach(m);
    for (const h of m.humans) { h.name = h.name; if (h.sk) { h.sk.nick = U.sanitize(info.players[h.seat] && info.players[h.seat].name || 'P' + (h.seat + 1)).toUpperCase(); } }
    if (role === 'client') { for (const h of m.humans) if (!h.remote) { h.remote = false; } m.cfg.remoteClient = true; }
    if (role === 'server') m.humans.forEach(h => { h.remote = true; });
    m.phase = 'faceoff'; Match.faceoffNow(Rink.CX, Rink.CY, true); m.holdCount = true; Cam.snap(Rink.CX, Rink.CY); Synth.music(null);
    AIHub.on('card', c => { cardState = c; }); AIHub.on('start', () => { started = true; });
    AIHub.on('message', onMessage); AIHub.on('leave', onLeave); AIHub.on('time-up', () => { timeUp = true; if (role !== 'client') doFinish(true); }); AIHub.on('end', () => { ended = true; try { A.music(null); A.mute(true); } catch (e) {} });
    AIHub.ready();
  }
  function onMessage(d, from) {
    if (!m || !d) return;
    if (d.t === 'in' && role !== 'client') { const h = m.humans.find(x => x.seat === from); if (!h) return; const it = h.intent; it.mx = (d.mx || 0) / 100; it.my = (d.my || 0) / 100; it.turbo = !!(d.h & 4); it.shootHeld = !!(d.h & 1); it.lobHeld = !!(d.h & 2); it.aim = d.ax != null ? { x: d.ax, y: d.ay, mouse: true } : Math.hypot(it.mx, it.my) > .3 ? { dx: it.mx, dy: it.my, move: true, stick: true } : null; const K = ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch']; K.forEach((k, i) => { if (d.c && d.c[i] != null && d.c[i] !== h.cnt[i]) { it.press[k]++; h.cnt[i] = d.c[i]; } }); }
    else if (d.t === 's' && role === 'client') { snaps.push(d); if (snaps.length > 12) snaps.shift(); applySnap(d); }
  }
  function onLeave(e) { left.add(e.id); const h = m && m.humans.find(x => x.seat === e.id); if (h && h.sk && role !== 'client') { h.sk.ctrl = { kind: 'cpu', input: null, seat: null }; h.sk.chosen = false; h.sk.human = null; m.humans = m.humans.filter(x => x !== h); } if (role !== 'client' && roundStartedWith >= 2 && m && m.humans.filter(x => !x.remote || true).length <= 1 && !finished) doFinish(false); }
  const q = v => Math.round(v);
  function snapshot() {
    return { t: 's', n: ++seq, at: q(AIHub.time()), ph: PH.indexOf(m.phase), p: m.period, k: q(m.clock * 10), sc: m.score.slice(), b: [q(m.boom[0]), q(m.boom[1]), (m.kaboom[0] > 0 ? 1 : 0) | (m.kaboom[1] > 0 ? 2 : 0) | (m.ot ? 4 : 0)], pk: [q(m.puck.x), q(m.puck.y), q(m.puck.z), q(m.puck.vx), q(m.puck.vy), m.puck.owner ? m.sk.indexOf(m.puck.owner) : -1, m.puck.fire ? 1 : 0],
      e: m.sk.map(s => [q(s.x), q(s.y), q(s.vx), q(s.vy), q(((s.heading % TAU) + TAU) % TAU / TAU * 255), ST.indexOf(s.state), q(s.turbo * 100), (s.hood ? 1 : 0) | (s.items.hotsauce > 0 ? 2 : 0) | (s.state === 'bin' ? 4 : 0), s.fightU ? q(s.fightU * 100) : 0]).concat(m.gl.map(g => [q(g.x), q(g.y), GS.indexOf(g.state), q(((g.heading % TAU) + TAU) % TAU / TAU * 255)])), ev: evOut.slice(-5), f: m.fight ? [q(m.fight.ba), q(m.fight.bb), m.sk.indexOf(m.fight.a), m.sk.indexOf(m.fight.b)] : 0 };
  }
  function applySnap(d) {
    m.phase = PH[d.ph] || 'play'; m.period = d.p; m.clock = d.k / 10; if (d.sc[0] !== m.score[0] || d.sc[1] !== m.score[1]) { m.score = d.sc.slice(); } m.boom = [d.b[0], d.b[1]]; m.kaboom = [d.b[2] & 1 ? 5 : 0, d.b[2] & 2 ? 5 : 0]; m.ot = !!(d.b[2] & 4);
    const pk = d.pk; m.puck.x = pk[0]; m.puck.y = pk[1]; m.puck.z = pk[2]; m.puck.vx = pk[3]; m.puck.vy = pk[4]; m.puck.owner = pk[5] >= 0 ? m.sk[pk[5]] : null; m.puck.fire = !!pk[6];
    d.e.slice(0, 6).forEach((e, i) => { const s = m.sk[i]; s.tx_ = e; s.state = ST[e[5]] || 'skate'; s.turbo = e[6] / 100; s.hood = !!(e[7] & 1); s.fightU = e[8] / 100; s.hasPuck = m.puck.owner === s; if (e[7] & 4) s.state = 'bin'; });
    d.e.slice(6).forEach((e, i) => { const g = m.gl[i]; g.tx_ = e; g.state = GS[e[2]] || 'ready'; });
    if (d.f) { m.fight = m.fight || { a: m.sk[d.f[2]], b: m.sk[d.f[3]], ba: 100, bb: 100, sa: 100, sb: 100, cx: 0, cy: 0 }; m.fight.ba = d.f[0]; m.fight.bb = d.f[1]; m.fight.cx = (m.fight.a.x + m.fight.b.x) / 2; m.fight.cy = m.fight.a.y; } else m.fight = null;
    for (const ev of d.ev || []) { if (seenEv.has(ev[0])) continue; seenEv.add(ev[0]); fireEv(ev); }
    snapT = 0; m.lastSnap = d;
  }
  function fireEv(ev) { const [id, type, a, b, c] = ev, sk = i => m.sk[i]; try {
    if (type === 'goal') { const sc = sk(a); m.scorer = sc; Sim.emit('goal', { side: sc.side, scorer: sc, assists: [], shot: c === 1 ? 'slap' : 'wrist', fire: c === 2, pp: false }); sc.stats.goals++; }
    else if (type === 'big_hit') Sim.emit('big_hit', { a: sk(a), b: sk(b), imp: 300 }); else if (type === 'save') Sim.emit('save', { g: m.gl[a], shooter: null, kind: 'pad', froze: false });
    else if (type === 'post') Sim.emit('post', {}); else if (type === 'shatter') Sim.emit('glass_shatter', { pn: Rink.panels[a], s: sk(0), by: null }); else if (type === 'kaboom') Sim.emit('kaboom_start', { side: a });
    else if (type === 'fight') Sim.emit('fight_start', { a: sk(a), b: sk(b) }); else if (type === 'whistle') Sim.emit('whistle', {}); else if (type === 'horn') Sim.emit('horn_period', { period: a }); else if (type === 'final') Sim.emit('final', { score: m.score.slice() }); else if (type === 'shot') Sim.emit('shot', { s: sk(a), kind: b === 1 ? 'slap' : 'wrist', spd: 400, kab: c === 1 }); else if (type === 'stop') Sim.emit('stop', { s: sk(a) });
  } catch (e) {} }
  function hookEvents() {
    const push = (type, a, b, c) => { evOut.push([++evId, type, a, b, c]); if (evOut.length > 12) evOut.shift(); }; const idx = s => m.sk.indexOf(s);
    Bus.on('goal', e => { if (role !== 'client') push('goal', idx(e.scorer), 0, e.fire ? 2 : e.shot === 'slap' ? 1 : 0); }); Bus.on('big_hit', e => { if (role !== 'client') push('big_hit', idx(e.a), idx(e.b)); }); Bus.on('save', e => { if (role !== 'client') push('save', e.g.side); }); Bus.on('post', e => { if (role !== 'client') push('post'); });
    Bus.on('glass_shatter', e => { if (role !== 'client') push('shatter', e.pn.id); }); Bus.on('kaboom_start', e => { if (role !== 'client') push('kaboom', e.side); }); Bus.on('fight_start', e => { if (role !== 'client') push('fight', idx(e.a), idx(e.b)); }); Bus.on('whistle', e => { if (role !== 'client') push('whistle'); });
    Bus.on('horn_period', e => { if (role !== 'client') push('horn', e.period); }); Bus.on('final', e => { if (role !== 'client') push('final'); }); Bus.on('shot', e => { if (role !== 'client') push('shot', idx(e.s), e.kind === 'slap' ? 1 : 0, e.kab ? 1 : 0); }); Bus.on('stop', e => { if (role !== 'client') push('stop', idx(e.s)); });
  }
  function sendInput(dt) {
    sendT += dt; if (sendT < 1 / 15) return; sendT = 0; const mine = m.humans.find(h => h.seat === info.me); if (!mine) return; Match.humanIntent(m, mine, dt); const it = mine.intent, P = it.press;
    const cn = ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch'].map(k => P[k] & 255); const msg = { t: 'in', s: ++seq, at: q(AIHub.time()), mx: q(it.mx * 100), my: q(it.my * 100), h: (it.shootHeld ? 1 : 0) | (it.lobHeld ? 2 : 0) | (it.turbo ? 4 : 0), c: cn }; if (it.aim && it.aim.mouse) { msg.ax = q(it.aim.x); msg.ay = q(it.aim.y); }
    try { AIHub.send(msg, { to: info.host, reliable: false }); } catch (e) {}
  }
  function clientStep(dt) {
    // interpolate others ~120 ms behind; own skater predicted
    const mine = m.humans.find(h => h.seat === info.me), me = mine && mine.sk; snapT += dt;
    const blend = Math.min(1, dt * 12);
    for (const s of m.sk) { const e = s.tx_; if (!e) continue; const tx = e[0] + e[2] * snapT, ty = e[1] + e[3] * snapT, ha = e[4] / 255 * TAU; if (s === me && s.state !== 'bin') continue; if (Math.hypot(tx - s.x, ty - s.y) > 80) { s.x = tx; s.y = ty; } else { s.x += (tx - s.x) * blend; s.y += (ty - s.y) * blend; } s.vx = e[2]; s.vy = e[3]; s.heading += U.angDiff(s.heading, ha) * blend; }
    for (const g of m.gl) { const e = g.tx_; if (!e) continue; g.x += (e[0] - g.x) * blend; g.y += (e[1] - g.y) * blend; g.heading += U.angDiff(g.heading, e[3] / 255 * TAU) * blend; }
    if (me && me.tx_) { // predict
      const e = me.tx_; if (!pred) pred = { x: e[0], y: e[1], vx: e[2], vy: e[3], heading: me.heading, state: 'skate', stopT: 0, turbo: e[6] / 100, rt: me.rt, hasPuck: me.hasPuck, winding: false, turboIdle: 0 };
      Match.humanIntent(m, mine, dt); const it = mine.intent; if (['skate', 'stop', 'wind', 'shoot', 'pass'].includes(me.state)) { pred.state = pred.state === 'stop' ? 'stop' : 'skate'; pred.hasPuck = me.hasPuck; pred.rt = me.rt; Skating.skateStep(pred, it, dt, { infiniteTurbo: false }); pred.x += pred.vx * dt; pred.y += pred.vy * dt; Rink.clampBody(pred, 7); }
      else { pred.x = e[0]; pred.y = e[1]; pred.vx = e[2]; pred.vy = e[3]; }
      const err = Math.hypot(e[0] + e[2] * snapT - pred.x, e[1] + e[3] * snapT - pred.y); if (err > 48) { pred.x = e[0]; pred.y = e[1]; pred.vx = e[2]; pred.vy = e[3]; } else { pred.x += (e[0] + e[2] * snapT - pred.x) * Math.min(1, dt * 3); pred.y += (e[1] + e[3] * snapT - pred.y) * Math.min(1, dt * 3); pred.vx += (e[2] - pred.vx) * Math.min(1, dt * 3); pred.vy += (e[3] - pred.vy) * Math.min(1, dt * 3); }
      me.x = pred.x; me.y = pred.y; me.vx = pred.vx; me.vy = pred.vy; me.heading = pred.heading; if (me.hasPuck) { const bp = Rigs.stickPoint(me); m.puck.x = bp[0]; m.puck.y = bp[1]; }
    }
    for (const s of m.sk) { s.pickCool = 0; s.swing = Math.max(0, s.swing - dt); }
    m.t += dt; m.pt += dt; Flow.animate(m, dt); Crowd.step(dt);
  }
  function doFinish(timeup) {
    if (finished || role === 'client') return; finished = true; const sc = m.score, win = sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1; const hs = m.humans.map(h => h.seat).concat(info.players.map(p => p.id).filter(id => !left.has(id) && !m.humans.find(h => h.seat === id))); const alive = info.players.map(p => p.id).filter(id => !left.has(id));
    const win_ids = alive.filter(id => seatSide(id) === win), lose_ids = alive.filter(id => seatSide(id) !== win); const standings = win < 0 ? [alive] : [win_ids, lose_ids].filter(a => a.length);
    const scores = {}, stats = {}; for (const p of info.players) { const h = m.humans.find(x => x.seat === p.id), s = h && h.sk || m.sk.find(x => x.side === seatSide(p.id)); const g = s ? s.stats.goals : 0, a = s ? s.stats.assists : 0; scores[p.id] = g + a; stats[p.id] = { Goals: g, Assists: a, Hits: s ? s.stats.hits : 0, Fights: s ? s.stats.fightsWon : 0 }; }
    Results.compute(m); const awards = []; m.res.stars.forEach((st, i) => { const h = m.humans.find(x => x.sk === st.s); if (h && !st.goalie) awards.push({ id: h.seat, title: ['1st Star', '2nd Star', '3rd Star'][i], detail: st.line }); });
    const args = { standings: standings.length ? standings : [alive], scores, stats, awards }; if (info.players.length === 1) { args.standings = [[info.players[0].id]]; args.won = win === 0; } else if (win >= 0) args.won = undefined;
    try { AIHub.finish(args); } catch (e) { game.fail('finish', e); }
  }
  // ---- scene ----
  const sc = { view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], expand: true, res: 'ps1', pausable: false,
    enter() { hookEvents(); setup(); Backdrop.kill(); m.cfg.holdStart = true; this.t = 0; Synth.crowdStart(); this.phase = 'card'; game.weather = m.arena.weather ? { kind: m.arena.weather, amount: .5 } : null; ovList = new UI.List([{ label: 'Sound', value: () => Math.round(game.settings.volume * 100) + '%', adjust: d => game.settings.set('volume', clamp(game.settings.volume + d * .1, 0, 1)) }, { label: 'Music', value: () => Math.round(game.settings.music * 100) + '%', adjust: d => game.settings.set('music', clamp(game.settings.music + d * .1, 0, 1)) }, { label: 'Voices', value: () => S('voiceVol'), adjust: d => cyc('voiceVol', d) }, { label: 'Button symbols', value: () => S('glyphs'), adjust: d => cyc('glyphs', d), toggle: () => cyc('glyphs', 1) }, { label: 'Camera', value: () => S('camMode'), adjust: d => cyc('camMode', d), toggle: () => cyc('camMode', 1) }, { label: 'Back', action: () => { overlay = false; } }], { vis: 6 }); },
    update(dt) {
      if (!m || ended) { return; } const I = game.input;
      if (role !== 'client') { snapAcc += dt; if (snapAcc >= 1 / 15) { snapAcc = 0; try { AIHub.send(snapshot(), { reliable: false }); } catch (e) { } } } else if (m) { try { sendInput(dt); } catch (e) { } }
      if (!started) { // the card
        this.t += dt; if (I.pressed('confirm') || I.pressed('start')) { myAnswer = 'ready'; AIHub.answer('ready'); } if (I.pressed('lob') || I.pressed('Pad3')) { AIHub.answer('more'); } const c = I.clicked && I.clicked(); if (c) { if (c[0] > game.W / 2 + 10) AIHub.answer('more'); else { AIHub.answer('ready'); } }
        Flow.animate(m, dt); Cam.update(m, dt); return; }
      this.phase = 'play'; m.hideHud = false; const tm = AIHub.time();
      if (tm < 0) { m.holdSim = true; Flow.animate(m, dt); Cam.update(m, dt); return; }
      if (m.holdSim) { m.holdSim = false; Synth.music('play'); }
      if (I.pressed('pause') && !overlay) { overlay = true; } else if (overlay && I.pressed('pause')) overlay = false;
      if (overlay) { ovList.update(dt); for (const h of m.humans) if (!h.remote) { h.input = { move: () => [0, 0], down: () => false, pressed: () => false, released: () => false, clicked: () => null, padAim: null, lastDevice: 'keyboard' }; } } else for (const h of m.humans) if (h.seat === info.me) h.input = game.input;
      if (role === 'client') { clientStep(dt); }
      else { Flow.step(m, dt); if (m.over || m.phase === 'final' && m.pt > 1) doFinish(false); }
      Talk.update(dt); Cam.update(m, dt); if (m.ot && m.clock <= 0 && m.phase === 'play') { m.clock = 0; }
      if (role !== 'client' && m.ot && m.phase === 'play' && m.clock <= 0 && !finished) { Flow.finalize(m); }
    },
    draw(r) {
      if (!m) return; if (role === 'server') { r.sky(['#000', '#112']); r.overlay(g => UI.txt(g, 'HOSTING', 8, 8, '#9ab')); return; }
      DrawMatch.draw(r, m, game.time);
      r.overlay(g => {
        if (!started || AIHub.time() < 0) card(g, r); if (overlay) { UI.box(g, r.W / 2 - 100, 40, 200, 130, { border: UI.GOLD }); UI.txt(g, 'OPTIONS', r.W / 2, 46, UI.GOLD, { align: 'center' }); ovList.draw(g, r.W / 2 - 92, 60, 184, 15); }
        if (ended) { px.rect(g, 0, 0, r.W, r.H, 'rgba(0,0,0,.4)'); UI.txt(g, 'FINAL', r.W / 2, r.H / 2, '#fff', { align: 'center', scale: 3 }); } });
    }
  };
  let snapAcc = 0;
  const cyc = (k, d) => { const o = SETTINGS.find(s => s.key === k).options, i = o.indexOf(S(k)); game.settings.set(k, o[(i + d + o.length) % o.length]); };
  function card(g, r) {
    const tm = started ? AIHub.time() : -Infinity; px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.55)'); UI.title(g, 'ICE HOC-KABOOM', r.W / 2, 8, 3); UI.txt(g, m.teams[0].name + '  vs  ' + m.teams[1].name, r.W / 2, 34, '#fff', { align: 'center' }); UI.txt(g, 'HOW TO WIN: Outscore the other team in one 3-minute period', r.W / 2, 48, UI.GOLD, { align: 'center' });
    info.players.forEach((p, i) => { const x = 30 + i * 70, ready = cardState && cardState.ready && cardState.ready.includes(p.id); UI.box(g, x, 62, 64, 24, { border: p.color }); UI.txt(g, U.sanitize(p.name).toUpperCase(), x + 32, 66, p.color, { align: 'center' }); UI.txt(g, ready ? '+ READY' : '...', x + 32, 76, ready ? '#6ae06a' : '#789', { align: 'center' }); });
    Glyphs.text(g, 'YOUR CONTROLS:  STICK SKATE   {pass} PASS   {shoot} SHOOT   {deke} DEKE   {turbo} TURBO', r.W / 2, 104, { align: 'center', color: '#fff' }); Glyphs.text(g, '{pass} READY      {lob} MORE TIME', r.W / 2, 120, { align: 'center', color: UI.GOLD }); const left = cardState && cardState.left != null ? Math.ceil(cardState.left / 1000) : null;
    if (left != null) UI.txt(g, 'STARTS IN ' + left, r.W / 2, 138, '#cfe', { align: 'center', scale: 2 }); if (started && tm < 0) UI.txt(g, String(Math.ceil(-tm / 1000)), r.W / 2, r.H / 2, '#fff', { align: 'center', scale: 6 });
  }
  return { boot, sc, get info() { return info; }, get role() { return role; }, snapshot: () => m && snapshot(), get active() { return !!info; } };
})();

/* ---- 90-start.js ---- */
/* ---- START: scene table, deep links, debug handle ---- */
const ABOUT_PAGES = (() => {
  const si = FEEDBACK.sourceInformation, lab = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
  const keys = Object.keys(lab), half = Math.ceil(keys.length / 2);
  const qa = (arr, qs) => arr.map((a, i) => qs[i] + ' ' + a);
  return [
    { title: 'Credits', lines: ['Ice Hoc-Kaboom: over-the-top 3-on-3 arcade hockey. Skate, dangle and rip it past the goalie while you hammer rivals through the glass; fill BOOM, go KABOOM, win the scrap when the gloves drop.', 'Game design and code: Claude Sonnet 5.5 (claude-sonnet-5-5) for Michael Crosato\'s cc-matrix. Plan: PLAN.md by claude-opus-5-5.', 'Engine: my-3D2dge v0.85.2 (MIT). AI Hub session client 1.4.0.', 'Every sound, voice and song is synthesized in code. Every logo, rink and fan is drawn in code. No asset files.', 'Starring Coach Marge, Dunny, Snipes, Big Lou, Lemmy, Old Gus, Doris, Chuck Wallop and Moose Plunkett.'] },
    { title: 'Source Information 1/3', lines: keys.slice(0, 5).map(k => lab[k] + ': ' + si[k]) },
    { title: 'Source Information 2/3', lines: keys.slice(5, 10).map(k => lab[k] + ': ' + si[k]) },
    { title: 'Source Information 3/3', lines: keys.slice(10).map(k => lab[k] + ': ' + si[k]) },
    { title: 'Testing Feedback', lines: qa(FEEDBACK.testingFeedback, ['How many issues did testing catch?', 'How many were critical?', 'Most helpful test:', 'Least helpful test:']) },
    { title: 'Engine Feedback', lines: qa(FEEDBACK.engineFeedback, ['Liked most:', 'Stuck or guessed wrong:', 'Had to build myself:', 'Hardest part:', 'Changed in the engine:', 'One thing to change:']) },
    { title: 'Prompt Feedback', lines: qa(FEEDBACK.promptFeedback, ['Liked most:', 'Confusing:', 'Hardest thing:', 'What I would change:']) },
    { title: 'Engine changes', lines: ['1. Font: added the PlayStation symbols (cross, circle, square, triangle) to the 5x7 pixel font.', '2. Gamepad: Options is ignored while Create is held (AI Hub reserves the pair).', '3. Audio: audio.bus(name) plus voice and crowd buses with their own volume fields.', '4. Dialog: a voice option that is a function babbles each new letter, for per-speaker voices.', 'Hockey gear, sticks, pads, numbers, logos and all synthesized voices live in the game, not the engine.'] },
    { title: 'Controls', lines: ['Move: left stick / WASD / arrows. Pass or switch: cross / J / right click. Shoot or check: square / K / left click. Hold shoot to wind a slapshot.', 'Deke or poke: circle / L / Space. Saucer pass or hold for gloves: triangle / I / middle click. Turbo: R2 or R1 / Shift. Chirp: L1 / C. Switch skater: L2 / Q. Camera: R3 / V.', 'Press shoot as a pass arrives for a one-timer. Hold deke or triangle near a rival with a grudge to drop the gloves.', 'Two on one keyboard: the second player joins with 2 and takes the arrows. Settings holds the Xbox symbols option.'] }
  ];
})();
Scenes.sc.session = Net.sc;
const debug = {
  snapshot() {
    const m = Match.cur(); const base = { scene: game.sceneName, errors: game.errors.length, dev: { open: Dev.visible } };
    const at = Scenes.sc.attract.state && Scenes.sc.attract.state(); if (at) base.attract = at;
    if (!m) return base;
    return Object.assign(base, { mode: m.cfg.story ? 'story' : m.cfg.drill ? 'drill' : m.cfg.session ? 'session' : 'exhibition', phase: m.phase, period: m.period, clock: +m.clock.toFixed(1), score: m.score.slice(), shots: m.stats.shots.slice(), puck: { x: Math.round(m.puck.x), y: Math.round(m.puck.y), z: Math.round(m.puck.z), owner: m.puck.owner ? m.puck.owner.id : null },
      skaters: m.sk.map(s => ({ id: s.id, team: s.side, x: Math.round(s.x), y: Math.round(s.y), state: s.state, ctrl: s.ctrl.kind })), goalies: m.gl.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), state: g.state })), boom: m.boom.map(Math.round), kaboom: m.kaboom.map(x => +x.toFixed(1)), fight: !!m.fight, items: m.items.length, sinBin: m.sinBin.length,
      story: { chapter: m.cfg.story ? m.cfg.story.id : 0, stars: Objectives.stars() }, net: { role: Net.role, players: Net.info ? Net.info.players.length : 0 }, drill: Drills.st ? { id: Drills.st.id, n: Drills.st.n, done: Drills.st.done } : null });
  },
  warp(target, o = {}) { const m = Match.cur(); const rows = Dev.rows(2); const row = rows.find(r => r.label && r.label.toLowerCase().includes(String(target).toLowerCase())); if (row && row.action) { row.action(); return true; } return false; },
  set(k, v) { if (k in T) { T[k] = v; T.save(); } else game.settings.set(k, v); },
  cheat(name, on) { Dev.cheats[name] = on; Dev.rows(1); },
  event(type, data) { Bus.emit(type, data); }, seed(n) { RNG.setSeed(n); }
};
function startMatchDirect(home, away, arena, extra) { const cfg = Object.assign({ home, away, arena, humans: [{ side: 0, input: game.input, seat: 0 }], intros: false, periodLen: 90 }, extra || {}); return { scene: 'match', data: { cfg, ret: 'title', kind: 'exh' } }; }
function bootTarget() {
  const h = (location.hash || '').slice(1).split('/'), k = h[0];
  if (k === 'attract') return { scene: 'attract' }; if (k === 'about') return { scene: 'about' }; if (k === 'records') return { scene: 'records' }; if (k === 'lab') return { scene: 'lab' };
  if (k === 'story') return { scene: 'cutscene', data: { id: +h[1] || 1, kind: 'pre' } }; if (k === 'cutscene') return { scene: 'cutscene', data: { id: +h[1] || 1, kind: 'pre' } };
  if (k === 'match') return startMatchDirect(h[1] || 'muskrats', h[2] || 'drillers', h[3] || 'icebox'); if (k === 'fight') return startMatchDirect('muskrats', 'bruisers', 'grind', { forceFight: true }); if (k === 'kaboom') return startMatchDirect('muskrats', 'drillers', 'dome', { alwaysKaboom: true });
  if (k === 'shootout') return startMatchDirect('muskrats', 'drillers', 'icebox', { startShootout: true }); if (k === 'flood') return startMatchDirect('muskrats', 'drillers', 'icebox', { startFlood: true }); if (k === 'practice') return { scene: 'match', data: { cfg: Drills.cfg ? null : null } };
  if (k === 'dev') return startMatchDirect('muskrats', 'drillers', 'icebox', { openDev: true }); return null;
}
(function start() {
  const scenes = Object.assign({}, Scenes.sc);
  const steps = [['Baking the ice', () => { Rink.buildMap(ARENAS.icebox); }], ['Tuning the organ', () => { Synth.init(); Talk.init(); Save.load(); Talk.loadTips(); Fx.hook(); }], ['Checking the books', () => { for (const t of TEAMS) if (t.skaters.length !== 3) throw new Error('team ' + t.id); }]];
  const go = (info) => {
    let t = bootTarget(); let scene = 'title', data; if (info) scene = 'session'; else if (t) { scene = t.scene; data = t.data; }
    if (scene === 'match' && data && data.cfg === null) { scene = 'practice'; data = null; }
    game.debug = debug; window.__game = { game, scenes, Match, Flow, T, Rink, Sim, Bus, TEAM, STORY, Dev, Net, Skating, U, TEXT, DRILLS, TEAMS, Crowd, Cam, Hud, DrawMatch, Drills, Objectives, Save, Scenes, Backdrop, Synth, Idle, Results, Replay, Fight, Hits, Items, Boom, Puck, Goalie, AI, UI, Glyphs, Rigs, Story, Shootout, Flood, Talk, Fx };
    game.start({ scenes, scene, data, boot: { title: 'ICE HOC-KABOOM', steps } });
    if (data && data.cfg && data.cfg.openDev) setTimeout(() => Dev.open(), 400);
  };
  if (HUB) Net.boot().then(go); else go(null);
})();

})();
