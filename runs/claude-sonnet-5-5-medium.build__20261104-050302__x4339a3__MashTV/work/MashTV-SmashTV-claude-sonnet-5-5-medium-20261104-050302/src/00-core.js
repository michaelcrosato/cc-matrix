// MASH TV: core. Opens the one IIFE that 90-main closes.
(() => {
'use strict';
const E = My3D2dge;
const MT = (typeof window !== 'undefined' ? window : globalThis).MT = { E, VERSION: '1.0.0', cfg: { skipRigs: false }, BUILD: '__BUILD__' };

// ---- arena geometry -------------------------------------------------------------------------------------------
const AW = 368, AH = 240, CX = 184, CY = 120;
const DOORS = { N: { x: 184, y: 8, dx: 0, dy: -1, opp: 'S', cells: [[10, 0], [11, 0], [12, 0]] },
  S: { x: 184, y: 232, dx: 0, dy: 1, opp: 'N', cells: [[10, 14], [11, 14], [12, 14]] },
  W: { x: 8, y: 120, dx: -1, dy: 0, opp: 'E', cells: [[0, 6], [0, 7], [0, 8]] },
  E: { x: 360, y: 120, dx: 1, dy: 0, opp: 'W', cells: [[22, 6], [22, 7], [22, 8]] } };
const cellXY = (cx, cy) => [24 + cx * 16, 24 + cy * 16];
Object.assign(MT, { AW, AH, CX, CY, DOORS, cellXY });

MT.mem = {};
MT.sget = (k, f) => { let v; try { v = E.store.get(k, undefined); } catch (e) { v = undefined; } return v !== undefined && v !== null ? v : (MT.mem[k] !== undefined ? MT.mem[k] : f); };
MT.sset = (k, v) => { MT.mem[k] = v; try { E.store.set(k, v); } catch (e) { /* blocked */ } };
// ---- tuning registry ------------------------------------------------------------------------------------------
// key: [default, min, max, step, label, group]
const TDEF = {
  playerSpeed: [95, 50, 160, 5, 'Player speed', 'PLAYER'], fireRate: [9, 3, 20, 1, 'Blaster shots / s', 'PLAYER'],
  bulletSpeed: [330, 150, 600, 10, 'Player bullet speed', 'PLAYER'], dmgMul: [1, .25, 4, .25, 'Player damage x', 'PLAYER'],
  slideSpeed: [235, 120, 400, 5, 'Slide speed', 'PLAYER'], slideCooldown: [.85, .2, 3, .05, 'Slide cooldown (s)', 'PLAYER'],
  invulnTime: [1.2, .2, 3, .1, 'I-frames after a hit (s)', 'PLAYER'], hpPerLife: [0, 0, 9, 1, 'HP per life (0 = auto)', 'PLAYER'],
  startLives: [0, 0, 9, 1, 'Start lives (0 = auto)', 'PLAYER'], puDuration: [1, .25, 3, .25, 'Power-up time x', 'PLAYER'],
  enemySpeed: [1, .25, 2.5, .05, 'Enemy speed x', 'ENEMIES'], enemyHp: [1, .25, 4, .25, 'Enemy HP x', 'ENEMIES'],
  enemyBulletSpeed: [1, .25, 2.5, .05, 'Enemy bullet speed x', 'ENEMIES'], contactDmg: [1, 0, 3, 1, 'Contact damage', 'ENEMIES'],
  waveSize: [1, .25, 3, .05, 'Wave size x', 'ENEMIES'], spawnGap: [1, .25, 3, .05, 'Spawn gap x', 'ENEMIES'], bossHp: [1, .1, 4, .1, 'Boss HP x', 'ENEMIES'],
  dropMul: [1, 0, 5, .25, 'Drop chance x', 'ECONOMY'], cashMul: [1, .25, 5, .25, 'Cash x', 'ECONOMY'],
  ratingsGain: [1, 0, 5, .25, 'Ratings gain x', 'SHOW'], ratingsDecay: [2.5, 0, 10, .5, 'Ratings decay / s', 'SHOW'], primeTime: [12, 3, 30, 1, 'Prime Time length (s)', 'SHOW'],
  camZoom: [1, .6, 1.6, .05, 'Camera zoom x', 'CAMERA & TIME'], shakeMul: [1, 0, 2, .1, 'Screen shake x', 'CAMERA & TIME'], timeScale: [1, .1, 3, .05, 'Game speed', 'CAMERA & TIME']
};
const T = {}; for (const k in TDEF) T[k] = TDEF[k][0];
const STORE_T = 'mashtv:tuning';
function loadTunes() { const s = MT.sget(STORE_T, null); if (s && typeof s === 'object') for (const k in s) if (k in TDEF && typeof s[k] === 'number') T[k] = Math.min(TDEF[k][2], Math.max(TDEF[k][1], s[k])); }
function saveTunes() { const o = {}; for (const k in TDEF) if (T[k] !== TDEF[k][0]) o[k] = T[k]; MT.sset(STORE_T, o); }
function setTune(k, v) { const d = TDEF[k]; if (!d) return; T[k] = Math.round(Math.min(d[2], Math.max(d[1], v)) / (d[3] / 10)) * (d[3] / 10); T[k] = +T[k].toFixed(3); saveTunes(); if (MT.game && k === 'timeScale') MT.game.timeScale = T[k]; }
function resetTune(k) { setTune(k, TDEF[k][0]); }
function resetTunes() { for (const k in TDEF) T[k] = TDEF[k][0]; saveTunes(); if (MT.game) MT.game.timeScale = 1; }
function tuneTouched() { for (const k in TDEF) if (T[k] !== TDEF[k][0]) return true; return false; }
function tuneDiff() { const o = {}; for (const k in TDEF) if (T[k] !== TDEF[k][0]) o[k] = T[k]; return o; }
Object.assign(MT, { TDEF, T, setTune, resetTune, resetTunes, loadTunes, tuneTouched, tuneDiff });

// ---- seeded streams ---------------------------------------------------------------------------------------------
MT.rng = {};
MT.seedAll = function (seed) {
  seed = (seed | 0) || 1; MT.seed = seed;
  MT.rng.spawn = E.rng(seed * 7 + 1); MT.rng.drops = E.rng(seed * 13 + 5); MT.rng.ai = E.rng(seed * 31 + 9); MT.rng.fx = E.rng(seed * 57 + 3);
};
MT.seedAll(1);
const fxr = () => Math.random();   // cosmetics only
const R = { ai: () => MT.rng.ai(), spawn: () => MT.rng.spawn(), drops: () => MT.rng.drops() };
const rr = (s, a, b) => a + R[s]() * (b - a);
const pickOf = (s, list) => list[Math.floor(R[s]() * list.length) % list.length];
Object.assign(MT, { fxr, R, rr, pickOf });

// ---- event bus --------------------------------------------------------------------------------------------------
const bus = {};
MT.on = (n, f) => { (bus[n] = bus[n] || []).push(f); return () => { bus[n] = bus[n].filter(x => x !== f); }; };
MT.emit = (n, ...a) => { for (const f of (bus[n] || []).slice()) f(...a); };

// ---- small helpers ----------------------------------------------------------------------------------------------
const clamp = E.clamp, hyp = Math.hypot, TAU = Math.PI * 2;
const fmt$ = n => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a, b) => hyp(a.x - b.x, a.y - b.y);
const norm = (x, y) => { const l = hyp(x, y) || 1; return [x / l, y / l]; };
const lerpA = (a, b, t) => a + E.angDiff(a, b) * t;
const plural = (n, s) => n + ' ' + s + (n === 1 ? '' : 'S');
const mix = (c1, c2, t) => E.mix ? E.mix(c1, c2, t) : c1;
Object.assign(MT, { clamp, hyp, TAU, fmt$, angTo, dist, norm, lerpA, plural });
MT.PCOL = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
MT.PNAMES = ['ROCKET', 'VOLT', 'MOXIE', 'GOLDIE'];
MT.hasDOM = typeof document !== 'undefined' && typeof document.createElement === 'function' && !!(typeof window !== 'undefined' && window.document);
