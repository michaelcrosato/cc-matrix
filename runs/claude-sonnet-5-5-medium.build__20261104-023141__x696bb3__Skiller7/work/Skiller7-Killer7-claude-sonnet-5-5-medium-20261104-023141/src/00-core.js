// Skiller7 core: namespace, event bus, tuning (the live sliders), seeded randomness, small maths.
const S7 = globalThis.S7 = { VERSION: '1.0.0', BUILD: '2026-11-04', started: false, E: globalThis.My3D2dge };
const M = 16;   // engine units per metre: the sim works in metres, the presenter multiplies
S7.M = M;

// ---- events: audio, HUD and effects only listen; they never change sim state ----
S7.bus = {
  _h: {},
  on(type, fn) { (this._h[type] = this._h[type] || []).push(fn); return fn; },
  emit(type, data) { const l = this._h[type]; if (l) for (const f of l.slice()) { try { f(data || {}); } catch (e) { S7.fail('event ' + type, e); } } },
  clear() { this._h = {}; }
};
S7.fail = (what, e) => { try { const g = S7.game; if (g && g.fail) g.fail(what, e); else console.error(what, e); } catch (x) { console.error(what, e); } };

// ---- registries: content is data, adding to one never changes src/ ----
S7.reg = { areas: {}, personas: {}, weapons: {}, enemies: {}, items: {}, songs: {}, voices: {}, story: {}, beats: {} };
S7.def = (kind, id, o) => { o.id = id; S7.reg[kind][id] = o; return o; };

// ---- tuning: every number the balance depends on, live-editable from the dev panel ----
S7.TUNING = {};
S7.tune = (key, def, min, max, step, label, group) => { S7.TUNING[key] = { key, def, min, max, step, label, group, v: def }; };
S7.T = k => S7.TUNING[k].v;
S7.setTune = (k, v) => { const t = S7.TUNING[k]; if (!t) return; t.v = Math.min(t.max, Math.max(t.min, v)); };
S7.resetTune = () => { for (const k in S7.TUNING) S7.TUNING[k].v = S7.TUNING[k].def; };
S7.tuneValues = () => { const o = {}; for (const k in S7.TUNING) o[k] = S7.TUNING[k].v; return o; };
[
  ['walkSpeed', 3.6, 1, 8, .1, 'Rail walk speed (m/s)', 'Movement'],
  ['skiSpeed', 15, 6, 30, .5, 'Ski top speed (m/s)', 'Movement'],
  ['skiAccel', 7, 2, 20, .5, 'Ski acceleration', 'Movement'],
  ['turnTime', .25, .05, 1, .05, 'About-face time (s)', 'Movement'],
  ['aimSensMouse', 1, .2, 3, .05, 'Mouse aim speed', 'Aim'],
  ['aimSensPad', 2.2, .8, 5, .1, 'Stick aim speed (rad/s)', 'Aim'],
  ['aimFov', 62, 35, 90, 1, 'Aim field of view', 'Aim'],
  ['playerDmg', 1, .25, 4, .05, 'Your damage x', 'Combat'],
  ['critMult', 3, 1, 8, .25, 'Warm Spot multiplier', 'Combat'],
  ['warmSize', 1, .5, 2.5, .05, 'Warm Spot size x', 'Combat'],
  ['hpMax', 1, .4, 3, .05, 'Persona health x', 'Combat'],
  ['enemyDmg', 1, 0, 4, .05, 'Whiteout blast x', 'Whiteouts'],
  ['enemySpeed', 1, .3, 2.5, .05, 'Whiteout speed x', 'Whiteouts'],
  ['enemyHp', 1, .3, 4, .05, 'Whiteout health x', 'Whiteouts'],
  ['spawnRate', 1, .2, 3, .05, 'Spawn count x', 'Whiteouts'],
  ['laughLoud', 1, 0, 2, .05, 'Laughter loudness', 'Whiteouts'],
  ['scanRadius', 12, 4, 30, .5, 'Scan radius (m)', 'Scan'],
  ['scanTime', 6, 1, 20, .5, 'Reveal time (s)', 'Scan'],
  ['scanCooldown', 2.5, 0, 10, .25, 'Scan cooldown (s)', 'Scan'],
  ['redDrop', 1, 0, 4, .1, 'Red dropped x', 'Economy'],
  ['rimeDrop', 1, 0, 4, .1, 'Rime dropped x', 'Economy'],
  ['healRate', 1, .2, 4, .1, 'Healing per Red x', 'Economy'],
  ['skillCost', 1, 0, 3, .05, 'Skill cost x', 'Economy'],
  ['bossHp', 1, .3, 3, .05, 'Boss health x', 'Bosses'],
  ['bossDmg', 1, 0, 3, .05, 'Boss damage x', 'Bosses'],
  ['timeScale', 1, .2, 1.5, .05, 'Game speed', 'World']
].forEach(a => S7.tune(...a));

// ---- randomness: named seeded streams so replays and tests agree ----
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
S7.rng = (seed = 1) => { const f = mulberry(seed); f.range = (a, b) => a + (b - a) * f(); f.pick = l => l[Math.floor(f() * l.length) % l.length]; return f; };
S7.streams = {};
S7.resetStreams = (seed = 7) => { S7.streams = { spawn: S7.rng(seed + 1), spread: S7.rng(seed + 2), laugh: S7.rng(seed + 3), fx: S7.rng(seed + 4), loot: S7.rng(seed + 5) }; };
S7.resetStreams();
const R = n => S7.streams[n];

// ---- maths (metres, radians; angle 0 = +x east, PI/2 = +y south) ----
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const dist3 = (ax, ay, az, bx, by, bz) => Math.hypot(ax - bx, ay - by, az - bz);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const smooth = t => t * t * (3 - 2 * t);
/** ray (o, d unit) against a sphere (c, r): distance along the ray or -1 */
const raySphere = (ox, oy, oz, dx, dy, dz, cx, cy, cz, r) => {
  const px = cx - ox, py = cy - oy, pz = cz - oz, b = px * dx + py * dy + pz * dz;
  if (b < 0) return -1;
  const d2 = px * px + py * py + pz * pz - b * b;
  if (d2 > r * r) return -1;
  return b - Math.sqrt(r * r - d2);
};
Object.assign(S7, { clamp, lerp, dist2, dist3, angDiff, approach, smooth, raySphere, R });
S7.fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };
