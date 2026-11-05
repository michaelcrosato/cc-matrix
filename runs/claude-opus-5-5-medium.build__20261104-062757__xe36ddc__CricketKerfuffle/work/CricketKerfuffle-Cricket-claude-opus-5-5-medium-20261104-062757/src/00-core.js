// CRICKET KERFUFFLE: an over-the-top arcade cricket game on my-3D2dge. Every source file in src/ is concatenated in
// name order into one IIFE by tools/build.mjs. This file: shared helpers, units, the TUNING registry (live dev sliders),
// seeded random streams, the event bus and the saved profile.
const E = My3D2dge, { px, clamp, lerp } = E;
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const HUB = (typeof AIHub !== 'undefined' && AIHub.active) ? AIHub : null;
const HEADLESS = typeof document === 'undefined';
const sgn = v => v < 0 ? -1 : 1;
const hyp = Math.hypot;
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const pick = (arr, R) => arr[Math.floor((R ? R() : Math.random()) * arr.length) % arr.length];
const fmt = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v && v[k] !== undefined ? v[k] : m));
const upper = s => String(s).toUpperCase();

// ---- units and geometry (pitch frame: x across, 0 = middle stump line; y along the pitch: striker's stumps y 0,
// bowler's stumps y 320; z up; 16 units = 1 m). OX, OY place the pitch frame in the TileMap's world.
const OX = 1104, OY = 760;
const PITCH = { len: 320, crease: 20, bCrease: 300, halfW: 24, retX: 21 };
const STUMPS = { hw: 3.6, h: 12.5 };
const BALL_R = .6;

// ---- TUNING: the live gameplay variables (dev mode sliders). T(k) reads it with the difficulty multiplier applied;
// systems read T() at each use and never cache it.
const TUNE_DEFS = [
  ['ballSpeed', 'Ball speed scale', .62, .35, 1, .01], ['gravity', 'Gravity (u/s2)', 160, 100, 300, 5],
  ['pitchBounce', 'Pitch bounce', .55, .3, .8, .01], ['swing', 'Swing ×', 1, 0, 3, .05], ['spin', 'Spin turn ×', 1, 0, 3, .05],
  ['seam', 'Seam spread (deg)', 2.5, 0, 8, .1], ['perfectMs', 'Perfect window +/- ms', 40, 10, 120, 1], ['goodMs', 'Good window +/- ms', 85, 30, 200, 1],
  ['okMs', 'Mistime window +/- ms', 150, 60, 300, 1], ['batPower', 'Ground shot power ×', 1, .5, 2, .05], ['loftPower', 'Lofted power ×', 1, .5, 2, .05],
  ['edge', 'Edge zone ×', 1, 0, 3, .05], ['runSpeed', 'Batter run speed', 120, 70, 200, 1], ['fieldSpeed', 'Fielder speed', 105, 60, 180, 1],
  ['throwSpeed', 'Throw speed', 420, 250, 700, 5], ['throwError', 'Throw error', 6, 0, 30, .5], ['catchRing', 'Catch ring time (s)', .9, .3, 2, .05],
  ['catchWindow', 'Catch window +/- ms', 110, 30, 300, 5], ['aiBatSkill', 'CPU timing error (ms)', 55, 5, 200, 1], ['aiAggression', 'CPU aggression', .5, 0, 1, .05],
  ['aiBowlAccuracy', 'CPU bowling scatter', 10, 0, 40, .5], ['meterSpeed', 'Bowling meter speed (Hz)', 1.4, .5, 3, .05], ['meterSweet', 'Meter sweet zone', .18, .05, .5, .01],
  ['hypeGain', 'Hype gain ×', 1, 0, 4, .1], ['fireStreak', 'ON FIRE streak', 3, 2, 6, 1], ['boundaryScale', 'Boundary size ×', 1, .6, 1.3, .01],
  ['chaosRate', 'Chaos rate ×', 1, 0, 3, .1], ['commentaryRate', 'Commentary rate ×', 1, 0, 2, .1], ['camPitch', 'Broadcast pitch (deg)', 14, 8, 30, 1],
  ['camScale', 'Broadcast scale', 1.4, 1, 2.4, .05], ['wideScale', 'Wide cam scale', .62, .4, 1.2, .02], ['timeScale', 'Game speed', 1, .1, 2, .05]
];
const TUNE = {}, TUNE_DEFAULT = {};
for (const [k, , d] of TUNE_DEFS) { TUNE[k] = d; TUNE_DEFAULT[k] = d; }
const DIFF = {
  village: { perfectMs: 1.5, goodMs: 1.4, okMs: 1.2, ballSpeed: .85, aiBatSkill: 1.6, aiBowlAccuracy: 1.5, catchWindow: 1.5, meterSweet: 1.4 },
  county: {},
  test: { perfectMs: .75, goodMs: .8, ballSpeed: 1.1, aiBatSkill: .7, catchWindow: .8 },
  kerfuffle: { perfectMs: .75, goodMs: .8, ballSpeed: 1.1, aiBatSkill: .7, catchWindow: .8, chaosRate: 2 }
};
let difficulty = 'county';
const T = k => TUNE[k] * ((DIFF[difficulty] || {})[k] || 1);
const tuneChanged = () => TUNE_DEFS.filter(([k]) => Math.abs(TUNE[k] - TUNE_DEFAULT[k]) > 1e-9).map(([k]) => k);
function tuneSet(k, v) { const d = TUNE_DEFS.find(x => x[0] === k); if (!d) return; TUNE[k] = clamp(Math.round(v / d[5]) * d[5], d[3], d[4]); TUNE[k] = +TUNE[k].toFixed(4); saveTune(); }
function tuneReset(k) { if (k) TUNE[k] = TUNE_DEFAULT[k]; else for (const [kk] of TUNE_DEFS) TUNE[kk] = TUNE_DEFAULT[kk]; saveTune(); }
function saveTune() { if (!HUB) E.store.set('kerfuffle:dev', Object.assign({}, TUNE)); }
function loadTune() { if (HUB) return; const s = E.store.get('kerfuffle:dev', null); if (s && typeof s === 'object') for (const [k, , , mn, mx] of TUNE_DEFS) if (typeof s[k] === 'number' && isFinite(s[k])) TUNE[k] = clamp(s[k], mn, mx); }
loadTune();

// ---- seeded random streams: play (gameplay), cosmetic (crowd, particles, line choice)
const RNG = { play: E.rng(1), cosmetic: E.rng(2), seed: 1 };
function reseed(seed) { RNG.seed = seed >>> 0; RNG.play = E.rng(RNG.seed); RNG.cosmetic = E.rng((RNG.seed * 7919 + 13) >>> 0); }
const rp = () => RNG.play(), rc = () => RNG.cosmetic();
const gauss = R => { let u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

// ---- the event bus: the rules emit; commentary, crowd, HUD, camera, hype, coverage listen
const BUS = { subs: {}, log: [] };
function on(type, fn) { (BUS.subs[type] = BUS.subs[type] || []).push(fn); }
function emit(type, data = {}) {
  BUS.log.push({ type, t: +(game ? game.time : 0).toFixed(2), data: Object.keys(data).slice(0, 3).map(k => k + ':' + (typeof data[k] === 'object' ? '...' : data[k])).join(' ') });
  if (BUS.log.length > 200) BUS.log.shift();
  COVER[type] = (COVER[type] || 0) + 1;
  for (const fn of (BUS.subs[type] || [])) { try { fn(data); } catch (e) { if (game) game.fail('bus:' + type, e); } }
  for (const fn of (BUS.subs['*'] || [])) { try { fn(type, data); } catch (e) { if (game) game.fail('bus:*', e); } }
}
// coverage: every feature marks itself here as it happens (tests and the attract mode assert on it)
const COVER = {};
const cover = k => { COVER[k] = (COVER[k] || 0) + 1; };

// ---- the saved profile: story progress (game.saves' autosave), unlocks, stats, lessons seen
const PROFILE_VER = 2;
const newProfile = () => ({ v: PROFILE_VER, unlocked: ['ker', 'mud'], stats: { sixes: 0, fours: 0, wickets: 0, fastest: 0, matches: 0 }, lessons: [], story: { chapter: 1, stars: {}, best: {}, done: false } });
let profile = newProfile();
function loadProfile() {
  if (HUB) { profile = newProfile(); return; }
  const p = E.store.get('kerfuffle:profile', null);
  if (p && typeof p === 'object' && p.v === PROFILE_VER && p.story && p.stats) profile = Object.assign(newProfile(), p);
  else if (p && typeof p === 'object' && p.story) { profile = Object.assign(newProfile(), { story: p.story }); }   // migrate an older save
  else profile = newProfile();
}
function saveProfile() { if (!HUB) E.store.set('kerfuffle:profile', profile); }
loadProfile();
let game = null;   // set in 99-start.js
