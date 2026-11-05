// MASH TV — core: the namespace, constants, seeded random streams, the tuning registry and the event bus.
// Every file in src/ is a fragment of one IIFE: this one opens it, 90-main.js closes it.
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp } = E;
const MT = {};
(typeof window !== 'undefined' ? window : globalThis).MT = MT;
MT.E = E;
MT.VERSION = '1.0.0';
MT.cfg = { skipRigs: false };

// ---------------------------------------------------------------- arena geometry (world units; a tile is 16)
const T16 = 16;
const AR = MT.AR = {
  cols: 23, rows: 15, W: 368, H: 240, cx: 184, cy: 120,
  x0: 16, y0: 16, x1: 352, y1: 224,                                   // the interior
  doors: { N: { x: 184, y: 8, nx: 0, ny: 1 }, S: { x: 184, y: 232, nx: 0, ny: -1 }, W: { x: 8, y: 120, nx: 1, ny: 0 }, E: { x: 360, y: 120, nx: -1, ny: 0 } },
  doorCells: { N: [[10, 0], [11, 0], [12, 0]], S: [[10, 14], [11, 14], [12, 14]], W: [[0, 6], [0, 7], [0, 8]], E: [[22, 6], [22, 7], [22, 8]] },
  opposite: { N: 'S', S: 'N', E: 'W', W: 'E' }
};
MT.cell = (cx, cy) => [24 + cx * T16, 24 + cy * T16];                  // interior cell -> world point
MT.toCell = (x, y) => [Math.round((x - 24) / T16), Math.round((y - 24) / T16)];
MT.inInterior = (x, y, m = 0) => x >= AR.x0 + m && x <= AR.x1 - m && y >= AR.y0 + m && y <= AR.y1 - m;
MT.clampInterior = (o, m = 6) => { o.x = clamp(o.x, AR.x0 + m, AR.x1 - m); o.y = clamp(o.y, AR.y0 + m, AR.y1 - m); };

// ---------------------------------------------------------------- random streams (gameplay only from these)
MT.rng = {};
MT.seed = function (s) {
  s = (s >>> 0) || 1; MT.rng.seed = s;
  for (const [k, o] of [['spawn', 11], ['drops', 23], ['ai', 37], ['fx', 51], ['prize', 71]]) MT.rng[k] = E.rng((s * 2654435761 + o) >>> 0);
};
MT.seed(1);
MT.R = (k = 'ai') => MT.rng[k]();
MT.Rr = (a, b, k = 'ai') => a + (b - a) * MT.rng[k]();
MT.Ri = (a, b, k = 'ai') => Math.floor(a + (b - a + 1) * MT.rng[k]());
MT.Rpick = (list, k = 'ai') => list[Math.floor(MT.rng[k]() * list.length) % list.length];
MT.chance = (p, k = 'drops') => MT.rng[k]() < p;
MT.shuffle = (list, k = 'prize') => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(MT.rng[k]() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
MT.fxr = () => Math.random();                                           // cosmetics only

// ---------------------------------------------------------------- the tuning registry: every balance number lives here
// [key, label, default, min, max, step, group]
MT.TDEF = [
  ['playerSpeed', 'Player speed', 95, 50, 160, 5, 'PLAYER'],
  ['fireRate', 'Blaster shots per second', 9, 3, 20, 1, 'PLAYER'],
  ['bulletSpeed', 'Player bullet speed', 330, 150, 600, 10, 'PLAYER'],
  ['dmgMul', 'Player damage x', 1, .25, 4, .25, 'PLAYER'],
  ['slideSpeed', 'Slide speed', 235, 120, 400, 5, 'PLAYER'],
  ['slideCooldown', 'Slide cooldown (s)', .85, .2, 3, .05, 'PLAYER'],
  ['invulnTime', 'Invulnerable after a hit (s)', 1.2, .2, 3, .1, 'PLAYER'],
  ['hpPerLife', 'HP per life (0 = difficulty)', 0, 0, 9, 1, 'PLAYER'],
  ['startLives', 'Starting lives (0 = difficulty)', 0, 0, 9, 1, 'PLAYER'],
  ['puDuration', 'Power-up duration x', 1, .25, 3, .25, 'PLAYER'],
  ['enemySpeed', 'Enemy speed x', 1, .25, 2.5, .05, 'ENEMIES'],
  ['enemyHp', 'Enemy HP x', 1, .25, 4, .25, 'ENEMIES'],
  ['enemyBulletSpeed', 'Enemy bullet speed x', 1, .25, 2.5, .05, 'ENEMIES'],
  ['contactDmg', 'Contact damage', 1, 0, 3, 1, 'ENEMIES'],
  ['waveSize', 'Wave size x', 1, .25, 3, .05, 'ENEMIES'],
  ['spawnGap', 'Spawn gap x', 1, .25, 3, .05, 'ENEMIES'],
  ['bossHp', 'Boss HP x', 1, .1, 4, .1, 'ENEMIES'],
  ['dropMul', 'Drop chance x', 1, 0, 5, .25, 'ECONOMY'],
  ['cashMul', 'Cash x', 1, .25, 5, .25, 'ECONOMY'],
  ['ratingsGain', 'Ratings gain x', 1, 0, 5, .25, 'SHOW'],
  ['ratingsDecay', 'Ratings decay per second', 2.5, 0, 10, .5, 'SHOW'],
  ['primeTime', 'Prime Time length (s)', 12, 3, 30, 1, 'SHOW'],
  ['camZoom', 'Camera zoom x', 1, .6, 1.6, .05, 'CAMERA & TIME'],
  ['shakeMul', 'Screen shake x', 1, 0, 2, .1, 'CAMERA & TIME'],
  ['timeScale', 'Game speed', 1, .1, 3, .05, 'CAMERA & TIME']
];
MT.T = {};
MT.TDEFAULT = {};
for (const d of MT.TDEF) { MT.T[d[0]] = d[2]; MT.TDEFAULT[d[0]] = d[2]; }
MT.tdef = k => MT.TDEF.find(d => d[0] === k);
MT.setTune = (k, v, save = true) => {
  const d = MT.tdef(k); if (!d) return;
  v = clamp(Math.round(v / d[5]) * d[5], d[3], d[4]); v = Math.round(v * 1000) / 1000;
  MT.T[k] = v; if (save) MT.saveTunes();
  if (k === 'timeScale' && MT.game && MT.run && MT.run.mode !== 'session') MT.game.timeScale = v;
};
MT.resetTunes = (k) => { for (const d of MT.TDEF) if (!k || d[0] === k) MT.T[d[0]] = d[2]; MT.saveTunes(); if (MT.game) MT.game.timeScale = MT.T.timeScale; };
MT.tunesChanged = () => MT.TDEF.filter(d => MT.T[d[0]] !== d[2]);
MT._mem = {};
MT.store = { get(k, d) { try { const v = E.store.get(k, undefined); if (v !== undefined && v !== null) return v; } catch (e) { /* blocked */ } return k in MT._mem ? MT._mem[k] : d; }, set(k, v) { MT._mem[k] = JSON.parse(JSON.stringify(v)); try { E.store.set(k, v); } catch (e) { /* kept for the visit */ } } };
MT.saveTunes = () => MT.store.set('mashtv:tuning', MT.T);
MT.loadTunes = () => { try { const s = MT.store.get('mashtv:tuning', null); if (s) for (const d of MT.TDEF) if (typeof s[d[0]] === 'number') MT.T[d[0]] = clamp(s[d[0]], d[3], d[4]); } catch (e) { /* ignore */ } };

// ---------------------------------------------------------------- cheats (dev mode)
MT.CHEATS = { god: false, infBombs: false, oneHit: false, freeze: false, noclip: false, autopilot: false, botPartner: false, muteHost: false };
MT.devActive = () => MT.tunesChanged().length > 0 || Object.values(MT.CHEATS).some(Boolean);

// ---------------------------------------------------------------- the event bus
const BUS = {};
MT.on = (ev, fn) => { (BUS[ev] = BUS[ev] || []).push(fn); return () => { BUS[ev] = BUS[ev].filter(f => f !== fn); }; };
MT.emit = (ev, data) => { const L = BUS[ev]; if (L) for (const f of L.slice()) { try { f(data); } catch (e) { if (MT.game) MT.game.fail('event ' + ev, e); else throw e; } } };

// ---------------------------------------------------------------- small helpers
MT.money = n => '$' + Math.max(0, Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
MT.d2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
MT.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
MT.ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
MT.angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
MT.approachAng = (a, b, step) => { const d = MT.angDiff(a, b); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; };
MT.ease = E.ease;
MT.fmtTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
MT.safeName = s => String(s || '').toUpperCase().replace(/[^A-Z0-9 .!?\-']/g, '?').slice(0, 12);
let _ids = 1;
MT.nid = () => _ids++;
MT.resetIds = () => { _ids = 1; };
MT.COLORS = { p: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'], magenta: '#ff2e88', cyan: '#2ee6ff', gold: '#ffcc33', chrome: '#c8d0e0', tally: '#ff3344', shadow: '#140a24', shadow2: '#2a1446', ink: '#fff7e8', foe: '#ff9a3c', foeCore: '#fff2a0' };
