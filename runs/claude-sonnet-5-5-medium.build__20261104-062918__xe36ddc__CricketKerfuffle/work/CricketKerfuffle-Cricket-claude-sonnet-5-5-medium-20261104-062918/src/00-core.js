'use strict';
const E = My3D2dge;
const { clamp, lerp } = E;
const TAU = Math.PI * 2;
const sgn = v => (v < 0 ? -1 : 1);
const hyp = Math.hypot;
let game = null;   // the E.Game, made in 99-start.js

/* ---------- geometry (world units, 16 = 1 m). The pitch runs along x = CX; the striker's stumps are the top end ---------- */
const GW = 56, GH = 60, TS = 16;                  // the field grid
const CX = 448, SY = 330, BY = 650, MY = 490;     // pitch centre line, stumps (striker/bowler ends), pitch middle
const CR0 = 352, CR1 = 628;                       // batters' creases
const YHIT = 364;                                 // the plane where the bat meets the ball
const RX = 330, RY = 360;                         // boundary radii (scaled by the boundaryScale tuning)

/* ---------- seeded random streams: play (gameplay), cos (cosmetic) ---------- */
function mkrng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const RNG = { play: mkrng(12345), cos: mkrng(777) };
const rr = (a, b, f = RNG.play) => a + (b - a) * f();
const rnorm = (f = RNG.play) => { let u = 0; for (let i = 0; i < 4; i++) u += f(); return (u - 2) * 1.7; };
const rpick = (arr, f = RNG.play) => arr[Math.floor(f() * arr.length) % arr.length];

/* ---------- TUNING: the live gameplay variables (dev mode sliders). Systems call T('name') each time ---------- */
const TUNING_DEF = {
  ballSpeed:    [1,    .5, 1.6, 'Bowling pace'],
  gravity:      [160,  80, 300, 'Gravity'],
  pitchBounce:  [.55,   .3, 1.1, 'Pitch bounce'],
  swing:        [1,    0, 2.5,  'Swing amount'],
  spin:         [1,    0, 2.5,  'Spin amount'],
  window:       [.115, .04, .3, 'Batting timing window (s)'],
  batPower:     [1,    .5, 2,   'Bat power'],
  loftPower:    [1,    .5, 2,   'Loft power'],
  hypeGain:     [1,    0, 3,    'Hype gain'],
  fireBalls:    [4,    1, 12,   'ON FIRE length (balls)'],
  runSpeed:     [190,  80, 300, 'Running speed'],
  fieldSpeed:   [92,  60, 240, 'Fielder speed'],
  throwSpeed:   [440,  200, 800,'Throw speed'],
  catchSkill:   [.78,  0, 1,    'Catching skill'],
  boundaryScale:[1,    .6, 1.5, 'Boundary size'],
  aiSkill:      [1,    .3, 2,   'CPU skill'],
  meterSpeed:   [1.1,  .6, 3,   'Release meter speed'],
  chaos:        [1,    0, 3,    'Chaos frequency'],
};
const TV = {};
const T = n => TV[n];
function tuningReset() { for (const k in TUNING_DEF) TV[k] = TUNING_DEF[k][0]; }
tuningReset();

/* ---------- event bus ---------- */
const BUS = { h: {}, log: [] };
const on = (t, fn) => { (BUS.h[t] = BUS.h[t] || []).push(fn); return () => { BUS.h[t] = BUS.h[t].filter(f => f !== fn); }; };
const emit = (t, d = {}) => {
  BUS.log.push(t); if (BUS.log.length > 200) BUS.log.shift();
  for (const f of BUS.h[t] || []) f(d);
  for (const f of BUS.h['*'] || []) f(t, d);
};

/* ---------- small helpers ---------- */
const vlen = (x, y) => hyp(x, y);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const bndRX = () => RX * T('boundaryScale');
const bndRY = () => RY * T('boundaryScale');
const rho = (x, y) => hyp((x - CX) / bndRX(), (y - MY) / bndRY());   // < 1 inside the boundary
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10 < 4 ? n % 10 : 0]);
const KEPT = {}, NONE = {};   // saves fall back to memory where storage is blocked (the AI Hub gives a round an empty one)
const store = {
  get(k, d) { const v = E.store.get('kerfuffle:' + k, NONE); return v !== NONE ? v : (k in KEPT ? KEPT[k] : d); },
  set(k, v) { KEPT[k] = v; E.store.set('kerfuffle:' + k, v); },
};
