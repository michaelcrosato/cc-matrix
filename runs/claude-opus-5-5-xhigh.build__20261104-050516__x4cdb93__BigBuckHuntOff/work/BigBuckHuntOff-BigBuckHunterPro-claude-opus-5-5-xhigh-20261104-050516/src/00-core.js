// BIG BUCK HUNT-OFF
// The core loop: spot the bucks, shoot clean, pump, never shoot a doe; bag them before they're gone, then read your
// shots in x-ray and climb the standings.
//
// The game's files share this one scope (build/build.mjs joins them inside one function). 00-core holds what every
// other file reads: units, the content registries, the event bus, the random streams, the dev tuning and the records.
const E = My3D2dge, { px, clamp, lerp } = E;
const M = 16, DEG = Math.PI / 180, TAU = Math.PI * 2;
const HAS_DOM = typeof document !== 'undefined';
const VERSION = '1.0.0';
const TITLE = 'BIG BUCK HUNT-OFF';
const G = {};   // the running game's shared state (scenes, the hunt in progress, the players)
const SEG = {};  // a hunt's segment factories by kind: (H, o) -> { kind, enter, update(dt) -> done, draw(g, W, H), exit }

/* ---------- registries: content is data, referred to by id ---------- */
const REG = {};
/** def(kind, id, spec): register content (species, critter, hunt, site, trophy, bonus, pattern, prop, bark, voice, song, beat) */
function def(kind, id, spec) { (REG[kind] = REG[kind] || {})[id] = Object.assign({ id }, spec); return REG[kind][id]; }
function reg(kind, id) { const r = REG[kind] && REG[kind][id]; if (!r) throw new Error('no ' + kind + ' "' + id + '"'); return r; }
function regAll(kind) { return Object.values(REG[kind] || {}); }
function has(kind, id) { return !!(REG[kind] && REG[kind][id]); }

/* ---------- the event bus: gameplay emits, the HUD, barks, audio, stats, the bot and the hub link listen ---------- */
const bus = {
  _h: {},
  on(n, f) { (this._h[n] = this._h[n] || []).push(f); return () => this.off(n, f); },
  off(n, f) { const l = this._h[n]; if (l) { const i = l.indexOf(f); if (i >= 0) l.splice(i, 1); } },
  emit(n, d) { const l = this._h[n]; if (!l) return; for (const f of l.slice()) { try { f(d); } catch (e) { if (G.game) G.game.fail('bus:' + n, e); else throw e; } } }
};

/* ---------- random streams: never Math.random in gameplay ---------- */
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const RNG = {
  run: 1,
  /** the run's seed (a hub session takes it from AIHub.rng('hunt')) */
  seed(n) { this.run = (n >>> 0) || 1; this._s = {}; return this.run; },
  _s: {},
  /** a named stream for the run: world, spawn, ai, bot, fx (fx is cosmetic: draw from it freely) */
  stream(name) { return this._s[name] || (this._s[name] = E.rng(strHash(name) ^ Math.imul(this.run, 2654435761))); },
  /** a fresh stream for a name (a site's spawns start the same each time it is played with the same seed) */
  fresh(name) { return (this._s[name] = E.rng(strHash(name) ^ Math.imul(this.run, 2654435761))); },
  wrap(r) { return { r, f: () => r(), int: (a, b) => a + Math.floor(r() * (b - a + 1)), range: (a, b) => a + r() * (b - a), pick: l => l[Math.floor(r() * l.length)], chance: p => r() < p }; }
};
const FX = () => RNG.stream('fx');
const fxr = (a = 1, b) => { const r = FX()(); return b === undefined ? r * a : a + r * (b - a); };

/* ---------- dev tuning: Appendix A's sliders, kept as hidden settings in the Dev group ---------- */
const TUNE_DEFS = [
  ['animalSpeed', 'Animal speed', 1, .25, 2, .05], ['spook', 'Spook from shots', 1, 0, 2, .05], ['doeShare', 'Does and fawns share', 1, 0, 2, .05],
  ['spawnRate', 'Spawn pace', 1, .5, 2, .05], ['siteTime', 'Site time limits', 1, .3, 3, .05], ['reticleSpeed', 'Pad reticle speed (px/s)', 400, 150, 900, 10],
  ['assist', 'Aim-assist friction (1 = none)', .65, 0, 1, .01], ['rounds', 'Rounds in a full tube', 5, 1, 10, 1], ['rackTime', 'Pump time (s)', .22, 0, .6, .01],
  ['reloadTime', 'Empty-tube reload (s)', 1.25, .2, 3, .05], ['scopeMag', 'Scope magnification', 3.5, 1.5, 6, .1], ['sway', 'Scope sway (px)', 2.6, 0, 6, .1],
  ['breath', 'Hold-breath seconds', 3, 1, 6, .1], ['calls', 'Calls per site', 2, 0, 5, 1], ['callFreeze', 'Call freeze (s)', 1.4, 0, 4, .05],
  ['distanceSlope', 'Metres per +1 distance bonus', 75, 25, 200, 5], ['heartMult', 'Heart multiplier', 2, .5, 4, .05], ['headMult', 'Head multiplier', 1.8, .5, 4, .05],
  ['lungMult', 'Lung multiplier', 1.6, .5, 4, .05], ['runningMult', 'Running-shot multiplier', 1.25, 1, 2, .05], ['antlerBoost', 'Antler drawing scale', 1.15, 1, 2, .05],
  ['animalScale', 'Animal size boost', 1.1, .8, 1.5, .05], ['fog', 'Fog density', 1, 0, 2, .05], ['timeOfDay', 'Time of day shift', 0, -1, 1, .05], ['timeScale', 'Game speed', 1, .1, 2, .05]
];
const TUNE_DEFAULT = Object.fromEntries(TUNE_DEFS.map(d => [d[0], d[2]]));
/** a tuning value (the dev sliders) */
function T(k) { const s = G.game && G.game.settings, v = s && s['dev.' + k]; return v === undefined ? TUNE_DEFAULT[k] : v; }
const TUNE_SETTINGS = TUNE_DEFS.map(([k, label, value, min, max, step]) => ({ key: 'dev.' + k, label, type: 'slider', value, min, max, step, group: 'Dev', hidden: true,
  apply: (g, v) => { if (k === 'timeScale' && G.dev) G.dev.applyTime(); if (k === 'fog' || k === 'timeOfDay') bus.emit('look', k); } }));

/* ---------- records: best scores, stars, trophies, stats, the Range badge (E.store) ---------- */
const REC_KEY = 'bbho:records:1';
const Records = {
  d: null,
  load() { const d = E.store.get(REC_KEY, null); this.d = Object.assign({ best: {}, stars: {}, trophies: {}, bestBuck: {}, stats: { hunts: 0, shots: 0, hits: 0, bucks: 0, does: 0, longest: 0, critters: 0, sites: 0, playTime: 0 }, badge: false, champion: false, seen: {} }, d || {}); this.d.stats = Object.assign({ hunts: 0, shots: 0, hits: 0, bucks: 0, does: 0, longest: 0, critters: 0, sites: 0, playTime: 0 }, this.d.stats); return this; },
  save() { if (this.d) E.store.set(REC_KEY, this.d); },
  get best() { return this.d.best; },
  setBest(key, score) { if (!this.d.best[key] || score > this.d.best[key]) { this.d.best[key] = score; this.save(); return true; } return false; },
  setStars(site, n) { if ((this.d.stars[site] || 0) < n) { this.d.stars[site] = n; this.save(); } },
  trophy(id, info) { const t = this.d.trophies[id] = Object.assign(this.d.trophies[id] || { seen: 0, bagged: false, best: 0 }, info); this.save(); return t; },
  stat(k, v, max) { const s = this.d.stats; s[k] = max ? Math.max(s[k] || 0, v) : (s[k] || 0) + v; },
  reset() { E.store.remove(REC_KEY); this.d = null; this.load(); }
};

/* ---------- small helpers ---------- */
const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const fmt = n => { const s = String(Math.round(Math.abs(n))), r = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (n < 0 ? '-' : '') + r; };
const metres = u => u / M;
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
const pickNoRepeat = (list, last, r) => { if (list.length <= 2) return list[Math.floor(r() * list.length)]; let x; for (let i = 0; i < 8; i++) { x = list[Math.floor(r() * list.length)]; if (!last.includes(x)) break; } return x; };
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const SEAT_NAMES = ['P1', 'P2', 'P3', 'P4'];
const SHAPES = ['circle', 'diamond', 'brackets', 'triangle'];
