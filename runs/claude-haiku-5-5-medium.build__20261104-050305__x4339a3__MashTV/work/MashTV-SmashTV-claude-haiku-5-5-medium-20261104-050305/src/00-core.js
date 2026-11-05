/* MASH TV — 00-core: the engine handle, the MT namespace, the tuning registry, the arena's geometry and the run state.
 * Every file in src/ is a fragment of one IIFE (tools/build.mjs concatenates them in name order). */
const E = My3D2dge, { px, clamp, lerp, TAU } = E;
const MT = { NAME: 'MASH TV', MODEL: 'claude-haiku-5-5-medium', STAMP: '20261104-050305', BUILD: '' };
globalThis.MT = MT;
MT.VERSION = 'v1.0 · ' + MT.MODEL;

/* ---------- tuning: every balance number is MT.T[key]; MT.TDEF holds the defaults (EXPORT TUNING pastes into it) ---------- */
MT.TDEF = { playerSpeed: 95, fireRate: 9, bulletSpeed: 330, dmgMul: 1, slideSpeed: 235, slideCooldown: .85, invulnTime: 1.2,
  hpPerLife: 0, startLives: 0, puDuration: 1, enemySpeed: 1, enemyHp: 1, enemyBulletSpeed: 1, contactDmg: 1, waveSize: 1,
  spawnGap: 1, bossHp: 1, dropMul: 1, cashMul: 1, ratingsGain: 1, ratingsDecay: 2.5, primeTime: 12, camZoom: 1, shakeMul: 1,
  timeScale: 1 };
// [key, label, group, min, max, step]
MT.TLIST = [
  ['playerSpeed', 'Player speed', 'PLAYER', 50, 160, 5], ['fireRate', 'Blaster shots a second', 'PLAYER', 3, 20, 1],
  ['bulletSpeed', 'Player bullet speed', 'PLAYER', 150, 600, 10], ['dmgMul', 'Player damage x', 'PLAYER', .25, 4, .25],
  ['slideSpeed', 'Slide speed', 'PLAYER', 120, 400, 5], ['slideCooldown', 'Slide cooldown (s)', 'PLAYER', .2, 3, .05],
  ['invulnTime', 'Invulnerable after a hit (s)', 'PLAYER', .2, 3, .1], ['hpPerLife', 'HP per life (0 = difficulty)', 'PLAYER', 0, 9, 1],
  ['startLives', 'Starting lives (0 = difficulty)', 'PLAYER', 0, 9, 1], ['puDuration', 'Power-up duration x', 'PLAYER', .25, 3, .25],
  ['enemySpeed', 'Enemy speed x', 'ENEMIES', .25, 2.5, .05], ['enemyHp', 'Enemy HP x', 'ENEMIES', .25, 4, .25],
  ['enemyBulletSpeed', 'Enemy bullet speed x', 'ENEMIES', .25, 2.5, .05], ['contactDmg', 'Contact damage', 'ENEMIES', 0, 3, 1],
  ['waveSize', 'Wave size x', 'ENEMIES', .25, 3, .05], ['spawnGap', 'Spawn gap x', 'ENEMIES', .25, 3, .05],
  ['bossHp', 'Boss HP x', 'ENEMIES', .1, 4, .1], ['dropMul', 'Drop chance x', 'ECONOMY', 0, 5, .25],
  ['cashMul', 'Cash x', 'ECONOMY', .25, 5, .25], ['ratingsGain', 'Ratings gain x', 'SHOW', 0, 5, .25],
  ['ratingsDecay', 'Ratings decay per second', 'SHOW', 0, 10, .5], ['primeTime', 'Prime Time length (s)', 'SHOW', 3, 30, 1],
  ['camZoom', 'Camera zoom x', 'CAMERA & TIME', .6, 1.6, .05], ['shakeMul', 'Screen shake x', 'CAMERA & TIME', 0, 2, .1],
  ['timeScale', 'Game speed', 'CAMERA & TIME', .1, 3, .05]];
MT.T = Object.assign({}, MT.TDEF);
const TUNE_KEY = 'mashtv:tuning';
(function loadTunes() { const s = E.store.get(TUNE_KEY, null); if (s && typeof s === 'object') for (const k in MT.TDEF) if (typeof s[k] === 'number') MT.T[k] = s[k]; })();
MT.tune = k => MT.T[k];
MT.tuned = () => Object.keys(MT.TDEF).filter(k => MT.T[k] !== MT.TDEF[k]);
MT.setTune = (k, v) => { MT.T[k] = v; if (MT.run) MT.run.devTouched = true; const o = {}; for (const key of MT.tuned()) o[key] = MT.T[key]; E.store.set(TUNE_KEY, o); return v; };
MT.resetTunes = () => { Object.assign(MT.T, MT.TDEF); E.store.set(TUNE_KEY, {}); };
MT.exportTunes = () => JSON.stringify(Object.fromEntries(MT.tuned().map(k => [k, MT.T[k]])));

/* ---------- difficulty: HP and lives, enemy scaling (§5.1, §5.7) ---------- */
MT.DIFF = {
  rookie: { id: 'rookie', name: 'ROOKIE', hp: 5, lives: 5, enemySpeed: .85, bullet: .8, mul: .8, line: 'EASY MONEY, KID. A BIT TOO EASY.' },
  contestant: { id: 'contestant', name: 'CONTESTANT', hp: 3, lives: 3, enemySpeed: 1, bullet: 1, mul: 1, line: 'THE STANDARD SHOW. THE STANDARD DEATH.' },
  champion: { id: 'champion', name: 'CHAMPION', hp: 1, lives: 3, enemySpeed: 1.15, bullet: 1, mul: 1.2, line: 'ONE HIT AND YOU\'RE A COMMERCIAL BREAK.' }
};

/* ---------- the arena: one TileMap of 23 x 15 cells, 16 units each; interior cells 1..21 x 1..13 ---------- */
MT.ARENA = { W: 368, H: 240, X0: 16, X1: 352, Y0: 16, Y1: 224, cx: 184, cy: 120, CELL: 16 };
MT.DOORS = {   // door centre and the direction a walker leaves by
  N: { x: 184, y: 8, out: [0, -1], map: [[10, 0], [11, 0], [12, 0]] },
  S: { x: 184, y: 232, out: [0, 1], map: [[10, 14], [11, 14], [12, 14]] },
  W: { x: 8, y: 120, out: [-1, 0], map: [[0, 6], [0, 7], [0, 8]] },
  E: { x: 360, y: 120, out: [1, 0], map: [[22, 6], [22, 7], [22, 8]] }
};
MT.OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
MT.cellXY = (cx, cy) => [24 + cx * 16, 24 + cy * 16];   // room cell [cx, cy] (0..20, 0..12) to world units
MT.inArena = (x, y, pad = 0) => x >= MT.ARENA.X0 + pad && x <= MT.ARENA.X1 - pad && y >= MT.ARENA.Y0 + pad && y <= MT.ARENA.Y1 - pad;
MT.clampArena = (b, pad = 4) => { b.x = clamp(b.x, MT.ARENA.X0 + pad, MT.ARENA.X1 - pad); b.y = clamp(b.y, MT.ARENA.Y0 + pad, MT.ARENA.Y1 - pad); };
MT.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* ---------- seeded streams: gameplay draws only from these; Math.random is for cosmetics ---------- */
MT.seedAll = (seed) => {
  MT.rng = { spawn: E.rng(seed * 7 + 1), drops: E.rng(seed * 13 + 2), ai: E.rng(seed * 17 + 3), fx: Math.random };
  MT.rngFn = s => { const r = E.rng(s); return r; };
};
MT.seedAll(7);
MT.pick = (arr, r = MT.rng.spawn) => arr[Math.floor(r() * arr.length) % arr.length];
MT.chance = (p, r = MT.rng.drops) => r() < p;
MT.rand = (a, b, r = MT.rng.spawn) => a + (b - a) * r();

/* ---------- the event bus: gameplay emits, the reaction table turns events into lines, crowd, sting and banners ---------- */
MT.listeners = [];
MT.on = fn => MT.listeners.push(fn);
MT.emit = (type, data = {}) => { for (const fn of MT.listeners) fn(type, data); };

/* ---------- run state (MT.run) ---------- */
MT.newRun = (o = {}) => ({
  mode: o.mode || 'arcade', diff: MT.DIFF[o.diff || 'contestant'], seed: o.seed || (Math.random() * 1e9 | 0) || 1,
  ep: o.ep || 1, roomId: null, path: [], keys: 0, keyList: new Set(), prizesTaken: new Set(), prizeDeck: {},
  players: [], ratings: { R: 30, primeCD: 0, primeT: 0, stuntUsed: {}, lowT: 0, decayT: 0, lastGain: 0 },
  devTouched: false, cheats: {}, startedAt: 0, won: false, log: [], roomsCleared: 0, rounds: 0, time: 0
});
MT.run = null;
MT.eidSeq = 0;   // enemy ids (the host's ids go on the wire)
MT.slots = [
  { n: 1, name: 'ROCKET', color: '#e8443a', look: 0 }, { n: 2, name: 'VOLT', color: '#3b82f6', look: 1 },
  { n: 3, name: 'MOXIE', color: '#22c55e', look: 2 }, { n: 4, name: 'GOLDIE', color: '#f5b700', look: 3 }];
MT.GLOW = { red: '#ff3344', gold: '#ffcc33', magenta: '#ff2e88', cyan: '#2ee6ff', chrome: '#c8d0e0', shadow: '#140a24' };
