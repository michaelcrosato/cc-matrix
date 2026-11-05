/* SKILLER7 — core: the namespace, the event bus, the registries, units, math, the named random streams.
 * Everything in the sim is deterministic: it draws numbers only from S7.rng(name) streams, never an unseeded random. */
const E = My3D2dge, { clamp, lerp, approach } = E;
const TAU = Math.PI * 2, M = 16;            // 16 engine units = 1 metre = 1 tile
const S7 = globalThis.S7 = {
  VERSION: '1.0.0', BUILD: typeof __S7_BUILD__ !== 'undefined' ? __S7_BUILD__ : 'dev',
  AREAS: {}, PERSONAS: {}, WEAPONS: {}, ENEMIES: {}, ITEMS: {}, BEATS: {}, SONGS: {}, VOICES: {}, LINES: {}, PEOPLE: {},
  M, started: false, headless: typeof document === 'undefined'
};
S7.area = (id, def) => (S7.AREAS[id] = Object.assign({ id }, def));
S7.persona = (id, def) => (S7.PERSONAS[id] = Object.assign({ id }, def));
S7.weapon = (id, def) => (S7.WEAPONS[id] = Object.assign({ id }, def));
S7.enemy = (id, def) => (S7.ENEMIES[id] = Object.assign({ id }, def));
S7.item = (id, def) => (S7.ITEMS[id] = Object.assign({ id }, def));
S7.beat = (id, fn) => (S7.BEATS[id] = fn);
S7.lines = (id, list) => (S7.LINES[id] = list);

/* ---- the bus: the sim emits, audio, effects, HUD and tutorials listen (they never change sim state) ---- */
const BUS = {};
S7.bus = {
  on(type, fn) { (BUS[type] || (BUS[type] = [])).push(fn); return () => { const l = BUS[type]; l.splice(l.indexOf(fn), 1); }; },
  emit(type, data) { const l = BUS[type]; if (l) for (const f of l.slice()) { try { f(data || {}); } catch (e) { if (S7.game) S7.game.fail('bus ' + type, e); else throw e; } } }
};
const emit = (t, d) => S7.bus.emit(t, d);

/* ---- named random streams, seeded from the run's seed ---- */
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const STREAMS = {};
S7.seed = 7;
S7.rng = name => STREAMS[name] || (STREAMS[name] = E.rng((S7.seed * 7919 + hashStr(name)) >>> 0));
S7.reseed = seed => { S7.seed = seed; for (const k in STREAMS) delete STREAMS[k]; };
const R = name => S7.rng(name)();
const RR = (name, a, b) => a + (b - a) * R(name);

/* ---- small math ---- */
const V = {
  add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  dir: (yaw, pitch) => [Math.cos(yaw) * Math.cos(pitch), Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch)]
};
S7.V = V;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const wrapAng = a => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
/** ray (origin o, unit dir d) against a sphere: distance along the ray, or null */
function raySphere(o, d, c, r) {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2], b = ox * d[0] + oy * d[1] + oz * d[2], q = ox * ox + oy * oy + oz * oz - r * r, h = b * b - q;
  if (h < 0) return null; const s = Math.sqrt(h), t = -b - s; if (t >= 0) return t; const t2 = -b + s; return t2 >= 0 ? 0 : null;
}
/** ray against a vertical capsule (x, y, z0..z1, radius r): distance, or null */
function rayCapsule(o, d, x, y, z0, z1, r) {
  // closest approach of the ray to the segment, by sampling the analytic 2D circle then clamping the height
  const ox = o[0] - x, oy = o[1] - y, a = d[0] * d[0] + d[1] * d[1];
  let best = null;
  if (a > 1e-9) {
    const b = ox * d[0] + oy * d[1], c = ox * ox + oy * oy - r * r, h = b * b - a * c;
    if (h >= 0) { const t = (-b - Math.sqrt(h)) / a; if (t >= 0) { const z = o[2] + d[2] * t; if (z >= z0 && z <= z1) best = t; } }
  }
  for (const zc of [z0, z1]) { const t = raySphere(o, d, [x, y, zc], r); if (t !== null && (best === null || t < best)) best = t; }
  return best;
}
S7.raySphere = raySphere; S7.rayCapsule = rayCapsule;
const fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
const fmtClock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (r < 10 ? '0' : '') + r; };

/* ---- the live tuning table: every important number, exposed as a dev slider with a reset to defaults ---- */
const TUNING = {
  walkSpeed:   { def: 85, min: 40, max: 200, step: 5, label: 'Walk speed', group: 'Move' },
  skiTop:      { def: 190, min: 100, max: 400, step: 10, label: 'Ski top speed', group: 'Move' },
  padSens:     { def: 1, min: .5, max: 2, step: .05, label: 'Aim sensitivity (pad)', group: 'Aim' },
  assist:      { def: 1, min: 0, max: 1, step: .05, label: 'Aim assist strength', group: 'Aim' },
  enemySpeed:  { def: 1, min: .3, max: 2, step: .05, label: 'Enemy speed x', group: 'Enemies' },
  enemyHP:     { def: 1, min: .2, max: 3, step: .05, label: 'Enemy HP x', group: 'Enemies' },
  playerDmg:   { def: 1, min: .2, max: 3, step: .05, label: 'Damage dealt x', group: 'Combat' },
  warmRadius:  { def: 1, min: .5, max: 2.5, step: .05, label: 'Warm spot radius x', group: 'Combat' },
  scanRadius:  { def: 40, min: 10, max: 80, step: 1, label: 'Scan radius (m)', group: 'Combat' },
  revealTime:  { def: 6, min: 1, max: 15, step: .5, label: 'Reveal time (s)', group: 'Combat' },
  spawnRate:   { def: 1, min: .3, max: 2, step: .05, label: 'Spawn rate x', group: 'Enemies' },
  explosionDmg:{ def: 1, min: 0, max: 3, step: .05, label: 'Explosion damage x', group: 'Enemies' },
  redDrop:     { def: 1, min: 0, max: 3, step: .05, label: 'Red drop x', group: 'Economy' },
  rimeDrop:    { def: 1, min: 0, max: 3, step: .05, label: 'Rime drop x', group: 'Economy' },
  healRate:    { def: 40, min: 10, max: 200, step: 5, label: 'Heal rate (HP/s)', group: 'Economy' },
  timeScale:   { def: 1, min: .1, max: 2, step: .05, label: 'Time scale', group: 'World' },
  celBands:    { def: 3, min: 2, max: 8, step: 1, label: 'Cel bands', group: 'Look' },
  ink:         { def: 1, min: 0, max: 1.5, step: .05, label: 'Ink strength', group: 'Look' },
  fogFar:      { def: 1, min: .3, max: 3, step: .05, label: 'Fog far x', group: 'Look' }
};
const T = {};
S7.TUNING = TUNING; S7.T = T;
S7.tuneReset = key => { for (const k in TUNING) if (!key || k === key) T[k] = TUNING[k].def; };
S7.tune = (k, v) => { const t = TUNING[k]; if (!t) return; T[k] = clamp(Math.round(v / t.step) * t.step, t.min, t.max); S7.saveDev && S7.saveDev(); };
S7.tuneReset();

/* ---- difficulty (§7.25) ---- */
const DIFF = {
  'Bunny Hill': { dmg: .5, speed: .85, reveal: 1.5, red: 1.3, assist: 'High', aval: .85 },
  Piste: { dmg: 1, speed: 1, reveal: 1, red: 1, assist: 'Low', aval: 1 },
  'Off-Piste': { dmg: 1.5, speed: 1.15, reveal: .7, red: .8, assist: 'Off', aval: 1.1 }
};
S7.DIFF = DIFF;
const diff = () => DIFF[(S7.G && S7.G.difficulty) || 'Piste'] || DIFF.Piste;

/* ---- cheats (dev mode and attract mode) ---- */
const CHEATS = { god: false, infRed: false, oneHit: false, revealAll: false, ghost: false, allPersonas: false, showRails: false, showVolumes: false, showShots: false, freeCam: false, hideHud: false, slowCrit: false, showFps: false };
S7.CHEATS = CHEATS;
