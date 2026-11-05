// MASH TV — core: the namespace, arena geometry, seeded random streams, the tuning registry, the event bus, helpers.
// Every src/*.js file is a fragment of one IIFE: this file opens it and 90-main.js closes it.
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp } = E;
const GLOBAL = typeof globalThis !== 'undefined' ? globalThis : window;
const HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.createElement;
const MT = GLOBAL.MT = { E };
/*@ABOUT@*/
let game = null;                       // the E.Game (made in 90-main)
const TAU = Math.PI * 2;
MT.VERSION = '1.0.0';
MT.cfg = { skipRigs: false };          // tests set skipRigs to skip rig animation (fast headless runs)

// ---------------------------------------------------------------------------------------------------------------
// Arena geometry: a 23 x 15 TileMap (368 x 240 world units); walls on the border; door gaps of 3 cells on each side.
const AR = { W: 368, H: 240, CX: 184, CY: 120, X0: 16, Y0: 16, X1: 352, Y1: 224, COLS: 23, ROWS: 15, IC: 21, IR: 13 };
const DOORS = {
  N: { id: 'N', x: 184, y: 8, cells: [[10, 0], [11, 0], [12, 0]], nx: 0, ny: 1, opp: 'S', ang: Math.PI / 2 },
  S: { id: 'S', x: 184, y: 232, cells: [[10, 14], [11, 14], [12, 14]], nx: 0, ny: -1, opp: 'N', ang: -Math.PI / 2 },
  W: { id: 'W', x: 8, y: 120, cells: [[0, 6], [0, 7], [0, 8]], nx: 1, ny: 0, opp: 'E', ang: 0 },
  E: { id: 'E', x: 360, y: 120, cells: [[22, 6], [22, 7], [22, 8]], nx: -1, ny: 0, opp: 'W', ang: Math.PI },
};
const DOOR_IDS = ['N', 'E', 'S', 'W'];
/** interior cell [cx, cy] (0..20, 0..12) -> world point */
const cellW = (cx, cy) => [24 + cx * 16, 24 + cy * 16];
const inInterior = (x, y, m = 0) => x >= AR.X0 + m && x <= AR.X1 - m && y >= AR.Y0 + m && y <= AR.Y1 - m;
const clampInterior = (o, m = 6) => { o.x = clamp(o.x, AR.X0 + m, AR.X1 - m); o.y = clamp(o.y, AR.Y0 + m, AR.Y1 - m); return o; };
MT.AR = AR; MT.DOORS = DOORS; MT.cellW = cellW;

// ---------------------------------------------------------------------------------------------------------------
// Seeded random streams: gameplay draws only from these (Math.random only for cosmetics). fx is cosmetic.
const RNG = { spawn: E.rng(1), drops: E.rng(2), ai: E.rng(3), fx: E.rng(4), prize: E.rng(5) };
MT.rng = RNG;
MT.seedAll = seed => { seed = seed >>> 0; RNG.seed = seed; RNG.spawn = E.rng(seed * 31 + 1); RNG.drops = E.rng(seed * 37 + 2); RNG.ai = E.rng(seed * 41 + 3); RNG.fx = E.rng(seed * 43 + 4); RNG.prize = E.rng(seed * 47 + 5); };
const rr = (R, a, b) => a + R() * (b - a);
const ri = (R, a, b) => Math.floor(a + R() * (b - a + 1));
const rpick = (R, list) => list[Math.floor(R() * list.length) % list.length];
const rshuffle = (R, list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------------------------------------------------------
// Tuning: every balance number logic reads lives here. MT.T.<key> is live; dev mode has a slider for each.
const TDEF = [
  // key, label, default, min, max, step, group
  ['playerSpeed', 'Player speed', 95, 50, 160, 5, 'PLAYER'],
  ['fireRate', 'Blaster shots per second', 9, 3, 20, 1, 'PLAYER'],
  ['bulletSpeed', 'Player bullet speed', 330, 150, 600, 10, 'PLAYER'],
  ['dmgMul', 'Player damage ×', 1, .25, 4, .25, 'PLAYER'],
  ['slideSpeed', 'Slide speed', 235, 120, 400, 5, 'PLAYER'],
  ['slideCooldown', 'Slide cooldown (s)', .85, .2, 3, .05, 'PLAYER'],
  ['invulnTime', 'Invulnerability after a hit (s)', 1.2, .2, 3, .1, 'PLAYER'],
  ['hpPerLife', 'HP per life (0 = difficulty)', 0, 0, 9, 1, 'PLAYER'],
  ['startLives', 'Starting lives (0 = difficulty)', 0, 0, 9, 1, 'PLAYER'],
  ['puDuration', 'Power-up duration ×', 1, .25, 3, .25, 'PLAYER'],
  ['enemySpeed', 'Enemy speed ×', 1, .25, 2.5, .05, 'ENEMIES'],
  ['enemyHp', 'Enemy HP ×', 1, .25, 4, .25, 'ENEMIES'],
  ['enemyBulletSpeed', 'Enemy bullet speed ×', 1, .25, 2.5, .05, 'ENEMIES'],
  ['contactDmg', 'Contact damage', 1, 0, 3, 1, 'ENEMIES'],
  ['waveSize', 'Wave size ×', 1.7, .25, 3, .05, 'ENEMIES'],
  ['spawnGap', 'Spawn gap ×', 2.2, .25, 3, .05, 'ENEMIES'],
  ['waveGap', 'Least seconds between waves', 6, 0, 10, .5, 'ENEMIES'],
  ['bossHp', 'Boss HP ×', 1, .1, 4, .1, 'ENEMIES'],
  ['dropMul', 'Drop chance ×', 1, 0, 5, .25, 'ECONOMY'],
  ['cashMul', 'Cash ×', 1, .25, 5, .25, 'ECONOMY'],
  ['ratingsGain', 'Ratings gain ×', .6, 0, 5, .05, 'SHOW'],
  ['ratingsDecay', 'Ratings decay per second', 3, 0, 10, .5, 'SHOW'],
  ['primeTime', 'Prime Time length (s)', 12, 3, 30, 1, 'SHOW'],
  ['camZoom', 'Camera zoom ×', 1, .6, 1.6, .05, 'CAMERA & TIME'],
  ['shakeMul', 'Screen shake ×', 1, 0, 2, .1, 'CAMERA & TIME'],
  ['timeScale', 'Game speed', 1, .1, 3, .05, 'CAMERA & TIME'],
].map(([key, label, def, min, max, step, group]) => ({ key, label, def, min, max, step, group }));
MT.TDEF = TDEF;
MT.T = {};
const TUNE_KEY = 'mashtv:tuning';
MT.tuneSpec = key => TDEF.find(d => d.key === key);
MT.setTune = (key, v, save = true) => {
  const d = MT.tuneSpec(key); if (!d) return undefined;
  v = Math.round(clamp(+v, d.min, d.max) / d.step) * d.step; v = +v.toFixed(4);
  MT.T[key] = v;
  if (key === 'timeScale' && game && !MT.sessionActive()) game.timeScale = v;
  if (save) MT.saveTunes();
  return v;
};
MT.resetTunes = (key) => { for (const d of TDEF) if (!key || d.key === key) MT.T[d.key] = d.def; if (game && (!key || key === 'timeScale')) game.timeScale = 1; MT.saveTunes(); };
MT.saveTunes = () => { if (MT.sessionActive && MT.sessionActive()) return; const out = {}; for (const d of TDEF) if (MT.T[d.key] !== d.def) out[d.key] = MT.T[d.key]; E.store.set(TUNE_KEY, out); };
MT.loadTunes = () => { for (const d of TDEF) MT.T[d.key] = d.def; const s = E.store.get(TUNE_KEY, null); if (s && typeof s === 'object') for (const k in s) if (MT.tuneSpec(k)) MT.setTune(k, s[k], false); };
MT.tunesChanged = () => TDEF.filter(d => MT.T[d.key] !== d.def);
MT.exportTuning = () => { const out = {}; for (const d of MT.tunesChanged()) out[d.key] = MT.T[d.key]; return JSON.stringify(out); };
for (const d of TDEF) MT.T[d.key] = d.def;

// Cheats (dev mode); they mark the run as dev-touched (no high score)
MT.cheats = { god: false, infBombs: false, oneHit: false, freeze: false, noclip: false, autopilot: false, botPartner: false, muteHost: false };
MT.devActive = () => MT.tunesChanged().length > 0 || Object.keys(MT.cheats).some(k => MT.cheats[k]);

// ---------------------------------------------------------------------------------------------------------------
// The event bus: gameplay emits, reactions (lines, crowd, stings, banners) listen.
const BUS = {};
MT.on = (ev, fn) => { (BUS[ev] = BUS[ev] || []).push(fn); return () => { const l = BUS[ev]; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }; };
MT.emit = (ev, data) => { const l = BUS[ev]; if (!l) return; for (const fn of l.slice()) { try { fn(data); } catch (e) { if (game) game.fail('event ' + ev, e); else throw e; } } };

// ---------------------------------------------------------------------------------------------------------------
// Helpers
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const fmtMoney = money;
MT.money = money;
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const dist = (a, b) => Math.sqrt(dist2(a, b));
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const approachAng = (a, t, d) => { const k = angDiff(a, t); return Math.abs(k) <= d ? t : a + Math.sign(k) * d; };
const easeOut = t => 1 - (1 - t) * (1 - t);
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m);
/** the session flag, filled in by 50-net.js */
MT.sessionActive = () => !!(MT.net && MT.net.active);
MT.overlay = { open: false, who: null };
MT.log = [];   // a short trail of notable events (tests read it)
const note = (s) => { MT.log.push(s); if (MT.log.length > 400) MT.log.shift(); };
