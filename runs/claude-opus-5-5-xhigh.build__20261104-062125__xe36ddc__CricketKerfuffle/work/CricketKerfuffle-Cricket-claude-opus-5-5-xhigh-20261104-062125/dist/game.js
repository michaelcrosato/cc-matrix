(() => {
'use strict';
/* ---- 00-head.js ---- */
/* CRICKET KERFUFFLE: an over-the-top arcade cricket game on my-3D2dge v0.85.2 (modified: engine/CHANGES-KERFUFFLE.md).
 * The source files in src/ are concatenated in name order into one IIFE by tools/build.mjs:
 *   00-09 foundations (helpers, constants, tuning, randomness, the event bus, the profile)
 *   10-19 content as data (teams, grounds, deliveries, shots, specials, arcade items, story, lines, music)
 *   20-29 the match simulation (pure: fixed steps, seeded randomness, no drawing, no audio)
 *   30-45 presentation (ground, cast, animation, effects, camera, replays, audio, voice, commentary, glyphs, HUD, UI)
 *   50-60 scenes (title, attract, front end, story, match, results, nets, showdown, about, AI Hub)
 *   70-99 dev mode, the debug handle and the start */
const E = My3D2dge, { px, clamp, lerp } = E;
const K = {};                         // the game's namespace (tests reach it as window.__kerfuffle)
window.__kerfuffle = K;
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const sign = v => (v < 0 ? -1 : 1);
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const wrapAng = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const hyp = Math.hypot;
const fmt1 = v => (Math.round(v * 10) / 10).toFixed(1);
const pickW = (rnd, items, w) => { let s = 0; for (const it of items) s += w(it); let r = rnd() * s; for (const it of items) { r -= w(it); if (r <= 0) return it; } return items[items.length - 1]; };
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
K.util = { sign, approach, wrapAng, fill, pickW };
const scenes = {};   // the game's scenes, filled by the scene files (50-99)
K.scenes = scenes;

/* ---- 01-const.js ---- */
/* ---- UNITS AND GEOMETRY (16 world units = 1 m; x east = screen right, y south = down the screen, z up) ----
 * The pitch runs along x = 0. The striker's stumps are at y = 0 (the far end, top of the broadcast screen), the
 * bowler's at y = 320 (the near end). The camera is always behind the current bowler; at a change of ends the batters
 * swap logical places, so the striker always faces the +y end. Batter's frame: angles from "straight" (toward the
 * bowler, +y), positive toward the off side. A right-hander (hand = +1) has the off side at -x. */
const G = {
  STUMPS_Y: 0, BOWL_Y: 320, CREASE_S: 20, CREASE_B: 300, RETURN_X: 21, PITCH_HALF: 24, MID_Y: 160,
  STUMP_HALF: 3, STUMP_H: 12, BALL_R: .6, PAD_FRONT: 24, CONTACT_FRONT: 36, CONTACT_BACK: 14,
  RELEASE_Z: 34, RELEASE_X: 8, KEEPER_BACK: 160, KEEPER_UP: 24, STEP: 1 / 120
};
const TYPES = { pace: 'pace', swing: 'swing', medium: 'medium', spin: 'spin', machine: 'machine' };
/** world direction of a batter-frame angle (degrees) for hand (+1 RHB, -1 LHB) */
const dirOf = (thetaDeg, hand) => { const t = thetaDeg * DEG; return [-hand * Math.sin(t), Math.cos(t)]; };
/** batter-frame angle (degrees) of a world direction */
const thetaOf = (dx, dy, hand) => Math.atan2(-hand * dx, dy) / DEG;
const kmhToUps = (kmh, scale) => kmh / 3.6 * 16 * scale;
const upsToKmh = (ups, scale) => ups / (16 * scale) * 3.6;
/** where a ball pitched, as a length from the striker's popping crease: yorker <= 24, full 24-70, good 70-130, short */
const lengthOf = py => { const L = py - G.CREASE_S; return L <= 24 ? 'yorker' : L <= 70 ? 'full' : L <= 130 ? 'good' : 'short'; };
K.G = G; K.dirOf = dirOf; K.thetaOf = thetaOf; K.lengthOf = lengthOf;

/* ---- 02-tuning.js ---- */
/* ---- TUNING: the live gameplay variables. Systems read T('key') at each use and never cache it, so dev-mode sliders
 * take effect at once. Difficulty multiplies some of them (applied in T, never shown on the sliders). Persisted in
 * E.store('kerfuffle:dev') (memory-only in AI Hub sessions, whose storage is empty). ---- */
const TUNING_DEFS = [
  ['ballSpeed', 'Ball speed scale', .62, .35, 1, .01], ['gravity', 'Gravity (u/s/s)', 160, 100, 300, 5],
  ['pitchBounce', 'Pitch bounce', .55, .3, .8, .01], ['swing', 'Swing ×', 1, 0, 3, .05], ['spin', 'Spin turn ×', 1, 0, 3, .05],
  ['seam', 'Seam spread (deg)', 2.5, 0, 8, .1], ['perfectMs', 'Perfect window +/-ms', 40, 10, 120, 1], ['goodMs', 'Good window +/-ms', 85, 30, 200, 1],
  ['okMs', 'Mistime window +/-ms', 150, 60, 300, 1], ['batPower', 'Ground shot power ×', 1, .5, 2, .05], ['loftPower', 'Lofted power ×', 1, .5, 2, .05],
  ['edge', 'Edge zone ×', 1, 0, 3, .05], ['runSpeed', 'Batter run speed', 140, 70, 200, 1], ['fieldSpeed', 'Fielder speed', 105, 60, 180, 1],
  ['throwSpeed', 'Throw speed', 420, 250, 700, 5], ['throwError', 'Throw error', 6, 0, 30, .5], ['catchRing', 'Catch ring time (s)', .9, .3, 2, .05],
  ['catchWindow', 'Catch window +/-ms', 110, 30, 300, 5], ['aiBatSkill', 'CPU timing error (ms)', 90, 5, 200, 1], ['aiAggression', 'CPU aggression', .5, 0, 1, .05],
  ['aiBowlAccuracy', 'CPU bowling scatter', 10, 0, 40, .5], ['meterSpeed', 'Bowling meter speed (Hz)', 1.4, .5, 3, .05], ['meterSweet', 'Meter sweet zone', .18, .05, .5, .01],
  ['hypeGain', 'Hype gain ×', 1, 0, 4, .1], ['fireStreak', 'ON FIRE streak', 3, 2, 6, 1], ['boundaryScale', 'Boundary size ×', 1, .6, 1.3, .01],
  ['chaosRate', 'Chaos rate ×', 1, 0, 3, .1], ['commentaryRate', 'Commentary rate ×', 1, 0, 2, .1], ['camPitch', 'Broadcast pitch (deg)', 15, 8, 30, 1],
  ['camScale', 'Broadcast scale', 1.4, 1, 2.4, .05], ['wideScale', 'Wide cam scale', .8, .5, 1.2, .05], ['timeScale', 'Game speed', 1, .1, 2, .05]
];
const DIFF = {
  village: { perfectMs: 1.5, goodMs: 1.4, okMs: 1.2, ballSpeed: .85, aiBatSkill: 1.6, aiBowlAccuracy: 1.5, catchWindow: 1.5, meterSweet: 1.4 },
  county: {},
  test: { perfectMs: .75, goodMs: .8, ballSpeed: 1.1, aiBatSkill: .7, catchWindow: .8 },
  kerfuffle: { perfectMs: .75, goodMs: .8, ballSpeed: 1.1, aiBatSkill: .7, catchWindow: .8, chaosRate: 2 }
};
const Tuning = {
  defs: TUNING_DEFS.map(([key, label, def, min, max, step]) => ({ key, label, def, min, max, step })),
  v: {}, difficulty: 'county', persist: true,
  init() { for (const d of this.defs) this.v[d.key] = d.def; const saved = E.store.get('kerfuffle:dev', null); if (saved && typeof saved === 'object') for (const d of this.defs) if (typeof saved[d.key] === 'number' && isFinite(saved[d.key])) this.v[d.key] = clamp(saved[d.key], d.min, d.max); },
  def(key) { return this.defs.find(d => d.key === key); },
  raw(key) { return this.v[key]; },
  get(key) { const m = DIFF[this.difficulty] || {}; return this.v[key] * (m[key] || 1); },
  set(key, val) { const d = this.def(key); if (!d) return; this.v[key] = clamp(Math.round(val / d.step) * d.step, d.min, d.max); this.save(); K.bus && K.bus.emit('tuning', { key, value: this.v[key] }); },
  reset(key) { const d = this.def(key); if (d) { this.v[key] = d.def; this.save(); } },
  resetAll() { for (const d of this.defs) this.v[d.key] = d.def; this.save(); },
  changed() { return this.defs.filter(d => Math.abs(this.v[d.key] - d.def) > 1e-9).map(d => d.key); },
  save() { if (this.persist) E.store.set('kerfuffle:dev', Object.assign({}, this.v)); }
};
const T = key => Tuning.get(key);
K.Tuning = Tuning; K.T = T; K.DIFF = DIFF;

/* ---- 03-rng.js ---- */
/* ---- RANDOMNESS: seeded streams. play: gameplay (seam, AI errors, fielding), seeded per match; cosmetic: crowd,
 * particles, commentary choice, so gameplay never depends on them. In AI Hub sessions the over's deliveries come from
 * AIHub.rng. Simulation code never calls Math.random. ---- */
const RNG = {
  play: E.rng(1), cosmetic: E.rng(99),
  seed(n) { this.play = E.rng(n >>> 0 || 1); this.cosmetic = E.rng((n * 7 + 13) >>> 0 || 99); },
  /** a normal sample (Box-Muller) from stream r */
  normal(r = RNG.play) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); },
  range(a, b, r = RNG.play) { return a + (b - a) * r(); },
  pick(list, r = RNG.play) { return list[Math.floor(r() * list.length) % list.length]; }
};
K.RNG = RNG;

/* ---- 04-bus.js ---- */
/* ---- THE EVENT BUS: the rules emit events (ball:released, bat:contact, boundary, wicket, ...); commentary, crowd, HUD,
 * camera, hype, achievements and the coverage tracker subscribe. A 200-entry log feeds dev mode's INFO tab. ---- */
const bus = {
  subs: {}, log: [],
  on(type, fn) { (this.subs[type] = this.subs[type] || []).push(fn); return () => { this.subs[type] = this.subs[type].filter(f => f !== fn); }; },
  emit(type, data = {}) {
    this.log.push({ type, data, t: K.game ? Math.round(K.game.time * 100) / 100 : 0 }); if (this.log.length > 200) this.log.shift();
    for (const f of (this.subs[type] || []).slice()) { try { f(data, type); } catch (e) { if (K.game) K.game.fail('event ' + type, e); else throw e; } }
    for (const f of (this.subs['*'] || []).slice()) { try { f(data, type); } catch (e) { if (K.game) K.game.fail('event *', e); else throw e; } }
  }
};
/* the coverage tracker: marks features as they happen (each delivery family, shot family, dismissal, special, item,
 * target, chaos event, camera shot, review, rain, fog, night, super over, mix-up, dive, overthrow); bot and attract
 * suites assert on it */
const coverage = { seen: {}, mark(k) { this.seen[k] = (this.seen[k] || 0) + 1; }, reset() { this.seen = {}; } };
K.bus = bus; K.coverage = coverage;

/* ---- 05-store.js ---- */
/* ---- THE PROFILE: unlocks, stats and seen lessons (E.store 'kerfuffle:profile'); story progress goes through
 * game.saves' autosave slot (see 53-story.js). A version field with a migrate step; a bad save becomes a new profile. ---- */
const PROFILE_VERSION = 2;
const newProfile = () => ({ v: PROFILE_VERSION, unlocked: ['ker', 'mud'], stats: { sixes: 0, fours: 0, wickets: 0, matches: 0, wins: 0, fastest: 0 }, lessons: {}, story: null, stars: {} });
const Profile = {
  data: null,
  load() {
    let d = E.store.get('kerfuffle:profile', null);
    if (!d || typeof d !== 'object' || !Array.isArray(d.unlocked)) d = newProfile();
    if (d.v === 1) { d.stars = d.stars || {}; d.v = 2; }
    if (d.v !== PROFILE_VERSION) d = newProfile();
    this.data = Object.assign(newProfile(), d); return this.data;
  },
  save() { E.store.set('kerfuffle:profile', this.data); },
  unlock(id) { if (!this.data.unlocked.includes(id)) { this.data.unlocked.push(id); this.save(); return true; } return false; },
  stat(k, n = 1, max = false) { const s = this.data.stats; s[k] = max ? Math.max(s[k] || 0, n) : (s[k] || 0) + n; this.save(); },
  reset() { this.data = newProfile(); this.save(); }
};
K.Profile = Profile;

/* ---- 07-assets-kerfuffle.js ---- */
/* ---- THE KERFUFFLE ASSET SET: new shapes and materials in the store's format, drawn by the engine in every view and
 * facing with the house shading (docs/ASSETS.md). Standalone (no dependency on the game's code), loaded once with
 * E.addAssets(window.ASSETS.KERFUFFLE) and drawn as 'KERFUFFLE:<id>'. Units: 16 = 1 m; written facing south (+y). ---- */
(window.ASSETS = window.ASSETS || {}).KERFUFFLE = { set: 'KERFUFFLE', format: 1,
  materials: {
    ash: { color: '#e8dcc0', pattern: 'none' }, bail: { color: '#d8c8a0', pattern: 'none' }, whitepaint: { color: '#eeeae0', pattern: 'planks', bw: 4, len: 30 },
    greenpaint: { color: '#2f6b3a', pattern: 'planks', bw: 3, len: 20 }, creampaint: { color: '#efe4c8', pattern: 'planks', bw: 4, len: 24 }, redpaint: { color: '#8a2a2a', pattern: 'planks', bw: 3 },
    glass: { color: '#9fd8f0', pattern: 'glaze' }, glassdark: { color: '#3a5a7a', pattern: 'glaze' }, brass: { color: '#d8a83a', pattern: 'metal' }, blacklacquer: { color: '#22222a', pattern: 'glaze' },
    navy: { color: '#22305a', pattern: 'none' }, tarp: { color: '#2a5ad0', pattern: 'cloth', fold: .6 }, stripeRed: { color: '#d83a3a', pattern: 'planks', bw: 4, dir: 'v' }, stripeBlue: { color: '#3a7ad8', pattern: 'planks', bw: 4, dir: 'v' },
    stripeTeal: { color: '#1fb5a8', pattern: 'planks', bw: 4, dir: 'v' }, stripeYellow: { color: '#ffd23a', pattern: 'planks', bw: 4, dir: 'v' }, canvasRed: { color: '#d8483a', pattern: 'cloth' }, canvasGreen: { color: '#3a9a5a', pattern: 'cloth' }, canvasBlue: { color: '#3a6ad8', pattern: 'cloth' },
    hide: { color: '#f4f2ea', pattern: 'none' }, hideBlack: { color: '#2a2a2e', pattern: 'none' }, pink: { color: '#e8a0a0', pattern: 'none' }, sharkGrey: { color: '#7a8a9a', pattern: 'glaze' }, sharkWhite: { color: '#e8eef4', pattern: 'glaze' },
    purpleSilk: { color: '#5a2a7a', pattern: 'cloth' }, silver: { color: '#c8ccd8', pattern: 'metal' }, violet: { color: '#7a3aff', pattern: 'metal' }, screen: { color: '#1a1040', pattern: 'none', glow: 1 }, neon: { color: '#ffcf3a', pattern: 'none', glow: 1 },
    ghostly: { color: '#a8e0ff', pattern: 'glaze', glow: 1 }, lamp: { color: '#fff4dc', pattern: 'none', glow: 1 }, water: { color: '#4aa8e0', pattern: 'glaze' }, cone: { color: '#e8b870', pattern: 'tiles', size: 2 }, icecream: { color: '#ffe0f0', pattern: 'none' },
    balloonA: { color: '#e8483a', pattern: 'planks', bw: 6, dir: 'v' }, wicker: { color: '#a8783a', pattern: 'thatch' }, peacockBlue: { color: '#2a6ad0', pattern: 'glaze' }, peacockGreen: { color: '#2a9a6a', pattern: 'foliage', size: 2 },
    sponge: { color: '#f0d8a0', pattern: 'none' }, jam: { color: '#c8203a', pattern: 'none' }, cream: { color: '#fff8e8', pattern: 'none' }, porcelainB: { color: '#e8eef8', pattern: 'glaze' }
  },
  shapes: {
    stumps: { about: 'three ash stumps with two bails', tags: 'cricket', mats: { s: 'ash', b: 'bail' }, parts: [['row', 3, [2.6, 0, 0], ['cyl', 's', [0, 0, 0], .65, 12.4, { seg: 6 }]], ['row', 2, [2.6, 0, 0], ['box', 'b', [0, 0, 12.4], [2.4, .7, .7]]]] },
    stumpsDown: { about: 'stumps knocked askew, bails gone', tags: 'cricket', mats: { s: 'ash' }, parts: [['cyl', 's', [-2.8, 0, 0], .65, 12, { seg: 6, rot: [0, -25, 0] }], ['cyl', 's', [0, 0, 0], .65, 12, { seg: 6, rot: [12, 0, 0] }], ['cyl', 's', [2.8, 0, 0], .65, 12, { seg: 6, rot: [0, 30, 0] }]] },
    sightscreen: { about: 'a white boarded sight screen on a scaffold', tags: 'cricket', mats: { w: 'whitepaint', l: 'iron' }, parts: [['box', 'w', [0, 0, 6], [64, 3, 34]], ['row', 4, [20, 0, 0], ['box', 'l', [0, 3, 0], [1.5, 1.5, 40]]], ['box', 'l', [0, 4, 3], [64, 1, 1.5]]] },
    scoreboardHut: { about: 'a village scoreboard hut with hanging number plates', tags: 'cricket village', mats: { w: 'greenpaint', r: 'slate', b: 'blacklacquer', p: 'whitepaint' }, parts: [['box', 'w', [0, 0, 0], [44, 20, 26]], ['prism', 'r', [0, 0, 26], [[-12, 0], [12, 0], [0, 9]], 48, { axis: 'x' }], ['box', 'b', [0, 10.5, 9], [36, 1, 14]], ['row', 4, [8, 0, 0], ['box', 'p', [0, 11.2, 12], [5, .8, 7]]]] },
    pavilion: { about: 'the village pavilion: timber walls, a veranda, a tiled roof and a clock', tags: 'cricket village', mats: { w: 'creampaint', t: 'tiles', g: 'greenpaint', c: 'whitepaint', b: 'brass', f: 'planks' },
      parts: [['box', 'w', [0, 0, 0], [150, 56, 40]], ['prism', 't', [0, 0, 40], [[-32, 0], [32, 0], [0, 22]], 156, { axis: 'x' }], ['box', 'f', [0, 34, 0], [150, 16, 3]], ['row', 6, [28, 0, 0], ['box', 'g', [0, 41, 3], [2, 2, 26]]], ['box', 'g', [0, 36, 29], [154, 20, 2]],
        ['box', 'g', [0, 28.5, 8], [24, 1, 22]], ['row', 4, [36, 0, 0], ['box', 'glass', [0, 28.5, 16], [14, 1, 12]]], ['box', 'c', [0, 0, 62], [14, 14, 14]], ['cyl', 'c', [0, 7.5, 64], 5, 1, { rot: [90, 0, 0] }], ['box', 'b', [0, 0, 76], [3, 3, 7]], ['prism', 't', [0, 0, 76], [[-8, 0], [8, 0], [0, 8]], 16, { axis: 'x' }]] },
    pubFront: { about: "the Leaning Wicket pub's frontage, with a breakable window", tags: 'village', mats: { w: 'plaster', b: 'timber', t: 'tiles', g: 'glass', s: 'redpaint' }, parts: [['box', 'w', [0, 0, 0], [96, 30, 44]], ['prism', 't', [0, 0, 44], [[-17, 0], [17, 0], [0, 18]], 100, { axis: 'x' }], ['row', 3, [30, 0, 0], ['box', 'g', [0, 15.5, 14], [18, 1, 16]]], ['box', 'b', [0, 15.5, 0], [12, 1, 26]], ['box', 's', [34, 18, 30], [16, 2, 12]], ['cyl', 'iron', [34, 17, 42], .6, 10]] },
    greenhouse: { about: 'the vicarage greenhouse: a glass-pane house on a brick base', tags: 'village', mats: { g: 'glass', f: 'whitepaint', b: 'brick' }, parts: [['box', 'b', [0, 0, 0], [70, 40, 6]], ['box', 'g', [0, 0, 6], [68, 38, 20]], ['prism', 'g', [0, 0, 26], [[-19, 0], [19, 0], [0, 12]], 68, { axis: 'x' }], ['row', 6, [13.6, 0, 0], ['box', 'f', [0, 19.5, 6], [1, 1, 20]]], ['box', 'f', [0, 0, 37.5], [70, 1.5, 1.5]]] },
    church: { about: 'a church tower with a spire and a weathervane', tags: 'village', mats: { s: 'stone', r: 'slate', b: 'brass' }, parts: [['box', 's', [0, 0, 0], [36, 36, 70]], ['box', 's', [0, 0, 70], [30, 30, 8]], ['cyl', 'r', [0, 0, 78], 18, 34, { r2: 0, seg: 4 }], ['cyl', 'b', [0, 0, 112], .8, 10], ['box', 'b', [0, 0, 118], [10, 1, 3]], ['box', 'glassdark', [0, 18.5, 40], [8, 1, 16]]] },
    oakTree: { about: 'the big oak inside the boundary, with a beehive in a fork', tags: 'village', mats: { h: 'straw' }, parts: [['use', 'tree', [0, 0, 0], { h: 84, seed: 3, scale: 1.4 }], ['lathe', 'h', [8, 6, 38], [[0, 0], [5, 0], [6, 3], [5, 7], [3, 9], [0, 10]]]] },
    phantomCar: { about: "Thrumpton's vintage motor car: long bonnet, running boards", tags: 'vehicle', mats: { b: 'blacklacquer', c: 'brass', g: 'glass', t: 'hideBlack', s: 'leather' }, parts: [['box', 'b', [0, 0, 4], [64, 22, 10]], ['box', 'b', [10, 0, 14], [22, 20, 10]], ['box', 'g', [-1, 0, 16], [1, 18, 8]], ['box', 'c', [-31, 0, 6], [3, 14, 8]], ['mirror', 'xy', ['cyl', 't', [20, 11, 4], 4.5, 3, { rot: [90, 0, 0] }]], ['mirror', 'y', ['box', 'b', [0, 12, 2], [56, 3, 1]]], ['box', 's', [12, 0, 14], [14, 16, 3]]] },
    fountain: { about: 'a tiered stone fountain', tags: 'garden', mats: { s: 'marble', w: 'water' }, parts: [['lathe', 's', [0, 0, 0], [[0, 0], [30, 0], [30, 6], [27, 6], [27, 3], [0, 3]]], ['cyl', 'w', [0, 0, 3], 27, 2.5], ['cyl', 's', [0, 0, 3], 4, 18], ['lathe', 's', [0, 0, 18], [[0, 0], [14, 0], [14, 3], [0, 3]]], ['cyl', 'w', [0, 0, 20], 12, 1.5], ['cyl', 's', [0, 0, 21], 2.5, 10], ['ball', 'w', [0, 0, 33], 3]] },
    hallFacade: { about: 'the facade of Thrumpton Hall: stone, columns and tall windows', tags: 'manor', mats: { s: 'sandstone', r: 'slate', g: 'glassdark', c: 'marble' }, parts: [['box', 's', [0, 0, 0], [320, 40, 80]], ['box', 'r', [0, 0, 80], [324, 44, 6]], ['row', 8, [38, 0, 0], ['box', 'g', [0, 20.5, 30], [14, 1, 30]]], ['row', 6, [20, 0, 0], ['cyl', 'c', [0, 26, 0], 3, 70]], ['prism', 's', [0, 26, 80], [[-64, 0], [64, 0], [0, 24]], 10, { axis: 'y' }]] },
    peacock: { about: 'a peacock with its fan up', tags: 'animal', mats: { b: 'peacockBlue', f: 'peacockGreen' }, parts: [['ball', 'b', [0, 0, 6], 3.5, { sz: 1.2 }], ['cyl', 'b', [0, 2, 9], 1, 6], ['ball', 'b', [0, 3, 15], 1.6], ['prism', 'f', [0, -4, 4], [[-12, 0], [12, 0], [8, 14], [0, 18], [-8, 14]], 1.5, { axis: 'y' }]] },
    beachHut: { about: 'a striped beach hut', tags: 'seaside', mats: { a: 'stripeRed', b: 'whitepaint', r: 'redpaint' }, parts: [['box', 'a', [0, 0, 0], [26, 22, 28]], ['prism', 'r', [0, 0, 28], [[-12, 0], [12, 0], [0, 9]], 28, { axis: 'x' }], ['box', 'b', [0, 11.5, 0], [10, 1, 20]]] },
    pier: { about: 'a timber pier on legs', tags: 'seaside', mats: { d: 'planks', l: 'oak' }, parts: [['box', 'd', [0, 0, 10], [60, 160, 3]], ['row', 5, [0, 36, 0], ['mirror', 'x', ['box', 'l', [28, 0, 0], [3, 3, 10]]]]] },
    ferrisWheel: { about: 'a Ferris wheel with cabins (params angle 0..15)', tags: 'seaside fair', mats: { m: 'steel', c: 'canvasRed', d: 'canvasBlue', h: 'brass' }, params: { angle: 0 },
      make: p => { const parts = [['mirror', 'x', ['box', 'm', [18, 0, 0], [3, 4, 70], { rot: [0, -14, 0] }]], ['cyl', 'h', [0, 0, 66], 4, 6, { rot: [90, 0, 0] }]]; for (let i = 0; i < 8; i++) { const a = (i / 8 + p.angle / 128) * Math.PI * 2; parts.push(['box', 'm', [Math.cos(a) * 21, -3, 66 + Math.sin(a) * 21], [42, 1.5, 1.5], { rot: [0, -a * 180 / Math.PI, 0] }]); parts.push(['box', i % 2 ? 'c' : 'd', [Math.cos(a) * 42, -5, 60 + Math.sin(a) * 42], [8, 6, 8]]); } return parts; } },
    iceCreamVan: { about: 'an ice-cream van with a giant cone on the roof', tags: 'seaside vehicle', mats: { b: 'whitepaint', s: 'canvasBlue', g: 'glass', t: 'hideBlack', c: 'cone', i: 'icecream' }, parts: [['box', 'b', [0, 0, 4], [56, 26, 26]], ['box', 's', [0, 0, 18], [56.5, 26.5, 4]], ['box', 'g', [-27, 0, 16], [2, 22, 8]], ['box', 'g', [6, 13.2, 14], [20, 1, 10]], ['mirror', 'xy', ['cyl', 't', [18, 13, 4], 4.5, 3, { rot: [90, 0, 0] }]], ['cyl', 'c', [6, 0, 30], 1, 16, { r2: 7 }], ['ball', 'i', [6, 0, 48], 7]] },
    inflatableShark: { about: 'an inflatable shark bobbing in the sea', tags: 'seaside', mats: { g: 'sharkGrey', w: 'sharkWhite' }, parts: [['ball', 'g', [0, 0, 6], 9, { sz: .6 }], ['ball', 'g', [14, 0, 6], 7, { sz: .6 }], ['ball', 'w', [8, 0, 3], 9, { sz: .35 }], ['prism', 'g', [4, 0, 10], [[-6, 0], [6, 0], [-3, 14]], 1.5, { axis: 'y' }], ['prism', 'g', [-12, 0, 6], [[0, 0], [-9, 9], [-9, -7]], 1.5, { axis: 'y' }]] },
    topHat: { about: "a giant magician's top hat on the boundary", tags: 'magic', mats: { b: 'blacklacquer', r: 'redpaint' }, parts: [['cyl', 'b', [0, 0, 0], 40, 3], ['cyl', 'b', [0, 0, 3], 26, 52], ['cyl', 'r', [0, 0, 8], 26.6, 8]] },
    waterTower: { about: 'a timber water tower: a round tank on four braced stilts, with a ladder', tags: 'farm', mats: { t: 'planks', l: 'oak', r: 'slate', i: 'iron' }, parts: [['mirror', 'xy', ['box', 'l', [14, 14, 0], [3, 3, 48]]], ['mirror', 'x', ['box', 'l', [0, 14, 20], [28, 1.5, 1.5], { rot: [0, 25, 0] }]], ['cyl', 't', [0, 0, 48], 22, 26], ['cyl', 'i', [0, 0, 52], 22.5, 1.5], ['cyl', 'i', [0, 0, 66], 22.5, 1.5], ['cyl', 'r', [0, 0, 74], 24, 10, { r2: 2 }], ['box', 'i', [0, 23, 0], [5, 1, 74]]] },
    hotAirBalloon: { about: 'a hot-air balloon with a wicker basket', tags: 'sky', mats: { a: 'balloonA', w: 'wicker', r: 'leather' }, parts: [['ball', 'a', [0, 0, 44], 28, { sz: 1.15 }], ['cyl', 'a', [0, 0, 14], 8, 16, { r2: 16 }], ['mirror', 'xy', ['cyl', 'r', [5, 5, 6], .5, 10]], ['box', 'w', [0, 0, 0], [12, 12, 8]]] },
    caravan: { about: "a magician's caravan", tags: 'magic', mats: { b: 'purpleSilk', w: 'oak', g: 'brass', r: 'redpaint' }, parts: [['box', 'b', [0, 0, 8], [54, 26, 30]], ['cyl', 'r', [0, 0, 38], 14, 54, { rot: [0, 90, 0], sq: .5 }], ['mirror', 'xy', ['cyl', 'w', [17, 13, 6], 6, 2, { rot: [90, 0, 0] }]], ['box', 'g', [0, 13.5, 14], [10, 1, 18]]] },
    jumbotron: { about: 'a giant screen on a steel frame (the picture drawn live)', tags: 'stadium', mats: { m: 'steel', s: 'screen', v: 'violet' }, parts: [['mirror', 'x', ['box', 'm', [90, 0, 0], [8, 8, 70]]], ['box', 'v', [0, 0, 70], [228, 12, 120]], ['box', 's', [0, 6.5, 78], [210, 1, 104]]] },
    vipBox: { about: 'a VIP box: a glass room on a pillar', tags: 'stadium', mats: { m: 'steel', g: 'glass', v: 'violet', n: 'neon' }, parts: [['cyl', 'm', [0, 0, 0], 8, 46], ['box', 'v', [0, 0, 46], [80, 56, 8]], ['box', 'g', [0, 0, 54], [76, 52, 26]], ['box', 'v', [0, 0, 80], [82, 58, 4]], ['box', 'n', [0, 28.5, 50], [70, 1, 2]]] },
    ghostBell: { about: 'an old bell in a frame, glowing faintly', tags: 'stadium spooky', mats: { w: 'oak', b: 'bronze', g: 'ghostly' }, parts: [['mirror', 'x', ['box', 'w', [22, 0, 0], [4, 4, 110]]], ['box', 'w', [0, 0, 110], [50, 5, 5]], ['lathe', 'b', [0, 0, 78], [[0, 0], [14, 0], [12, 4], [8, 16], [6, 28], [0, 30]]], ['ball', 'g', [0, 0, 74], 3]] },
    laserRig: { about: 'a truss with laser lamps', tags: 'stadium', mats: { m: 'steel', n: 'neon', v: 'violet' }, parts: [['box', 'm', [0, 0, 0], [6, 6, 100]], ['box', 'm', [0, 0, 100], [60, 6, 6]], ['row', 4, [16, 0, 0], ['box', 'n', [0, 4, 96], [6, 4, 6]]], ['box', 'v', [0, 0, 0], [16, 16, 4]]] },
    floodlight: { about: 'a lattice floodlight pylon with a lamp bank', tags: 'stadium', mats: { m: 'steel', l: 'lamp' }, lights: [[0, 0, 210, '#fff4dc', 260]], parts: [['cyl', 'm', [0, 0, 0], 7, 200, { r2: 3, seg: 4 }], ['box', 'm', [0, 0, 196], [48, 6, 30]], ['row', 3, [14, 0, 0], ['row', 2, [0, 0, 12], ['box', 'l', [0, 3.5, 200], [10, 1, 8]]]]] },
    thrumptonator: { about: 'the Thrumptonator 3000: a brass steam bowling machine with a throwing wheel (params angle 0..15)', tags: 'machine', mats: { b: 'brass', i: 'iron', c: 'copper', r: 'redpaint', g: 'glass' }, params: { angle: 0 },
      make: p => { const a = p.angle / 16 * Math.PI * 2, parts = [['box', 'i', [0, 0, 0], [26, 34, 4]], ['cyl', 'b', [0, 4, 4], 9, 22, { rot: [90, 0, 0] }], ['cyl', 'c', [0, -10, 20], 2, 16], ['cyl', 'i', [0, -10, 36], 3.5, 3], ['cyl', 'g', [8, 10, 18], 3, 1, { rot: [90, 0, 0] }], ['cyl', 'r', [0, 16, 22], 10, 2, { rot: [90, 0, 0] }]];
        for (let k = 0; k < 4; k++) { const q = a + k * Math.PI / 2; parts.push(['box', 'i', [Math.cos(q) * 5, 17, 22 + Math.sin(q) * 5], [10, 1, 1.5], { rot: [0, -q * 180 / Math.PI, 0] }]); } return parts; } },
    minibus: { about: 'the Kerfuffle Express: a green and cream minibus', tags: 'vehicle', mats: { g: 'greenpaint', c: 'creampaint', w: 'glass', t: 'hideBlack' }, parts: [['box', 'g', [0, 0, 4], [60, 26, 14]], ['box', 'c', [0, 0, 18], [60, 26, 12]], ['row', 4, [13, 0, 0], ['box', 'w', [0, 13.2, 21], [10, 1, 7]]], ['box', 'w', [-30.2, 0, 20], [1, 22, 9]], ['mirror', 'xy', ['cyl', 't', [20, 13, 4], 4.5, 3, { rot: [90, 0, 0] }]]] },
    cow: { about: 'Doris: a Friesian cow (params step 0..15 swings the legs)', tags: 'animal farm', mats: { w: 'hide', k: 'hideBlack', p: 'pink' }, params: { step: 0 },
      make: p => { const s = Math.sin(p.step / 16 * Math.PI * 2) * 14; return [['ball', 'w', [0, 0, 18], 10, { sz: .75 }], ['ball', 'w', [-8, 0, 18], 9, { sz: .7 }], ['ball', 'k', [-3, 6.5, 20], 3.2], ['ball', 'k', [-10, -6, 21], 3], ['ball', 'k', [3, -6.5, 17], 2.6], ['ball', 'k', [-6, 0, 26], 2.6], ['ball', 'w', [14, 0, 22], 5, { sz: .9 }], ['ball', 'p', [18, 0, 20], 2.6], ['mirror', 'y', ['box', 'k', [12, 3, 26], [1.5, 3, 1.5]]],
        ['box', 'w', [7, 4, 0], [2.5, 2.5, 12], { rot: [0, s, 0] }], ['box', 'w', [7, -4, 0], [2.5, 2.5, 12], { rot: [0, -s, 0] }], ['box', 'w', [-12, 4, 0], [2.5, 2.5, 12], { rot: [0, -s, 0] }], ['box', 'w', [-12, -4, 0], [2.5, 2.5, 12], { rot: [0, s, 0] }], ['box', 'k', [-18, 0, 12], [1, 1, 8], { rot: [0, 20, 0] }]]; } },
    covers: { about: 'the blue covers over the pitch (params spread 0..1)', tags: 'cricket', mats: { t: 'tarp' }, params: { spread: 1 }, make: p => [['box', 't', [0, 0, 0], [52, 4 + 330 * p.spread, 2]], ['cyl', 't', [0, -2 - 165 * p.spread, 3], 3, 52, { rot: [0, 90, 0] }]] },
    roller: { about: "a heavy groundsman's roller", tags: 'cricket', mats: { i: 'iron', r: 'redpaint' }, parts: [['cyl', 'i', [0, 0, 7], 7, 30, { rot: [0, 90, 0] }], ['box', 'r', [0, 16, 8], [24, 2, 2]], ['mirror', 'x', ['box', 'r', [10, 8, 7], [2, 16, 2], { rot: [20, 0, 0] }]]] },
    deckchair: { about: 'a striped canvas deck chair', tags: 'seaside village', mats: { s: 'stripeRed', w: 'oak' }, parts: [['mirror', 'x', ['box', 'w', [6, 0, 0], [1.5, 16, 1.5], { rot: [30, 0, 0] }]], ['box', 's', [0, 2, 3], [11, 12, .8], { rot: [55, 0, 0] }], ['mirror', 'x', ['box', 'w', [6, -4, 0], [1.5, 1.5, 12]]]] },
    adBoard: { about: 'a boundary advertising board', tags: 'cricket', mats: { b: 'whitepaint', f: 'iron' }, parts: [['box', 'b', [0, 0, 0], [64, 2, 8]], ['mirror', 'x', ['box', 'f', [28, -3, 0], [1, 6, 1], { rot: [40, 0, 0] }]]] },
    teaUrn: { about: 'a tall brass tea urn with a tap', tags: 'tea', mats: { b: 'brass', k: 'blacklacquer' }, parts: [['cyl', 'b', [0, 0, 0], 5, 16], ['cyl', 'b', [0, 0, 16], 5, 3, { r2: 2 }], ['ball', 'k', [0, 0, 20], 1.4], ['box', 'k', [0, 5.5, 3], [1.5, 2, 1.5]], ['mirror', 'x', ['box', 'k', [5.5, 0, 12], [1, 1, 3]]]] },
    teapot: { about: 'a round china teapot', tags: 'tea', mats: { p: 'porcelainB' }, parts: [['ball', 'p', [0, 0, 4], 4, { sz: .85 }], ['cyl', 'p', [4, 0, 4], .8, 4, { rot: [0, 50, 0] }], ['box', 'p', [-4.5, 0, 3], [1, 1, 4]], ['ball', 'p', [0, 0, 7.8], 1]] },
    cakeStand: { about: 'a two-tier cake stand with a Victoria sponge', tags: 'tea', mats: { p: 'porcelainB', s: 'sponge', j: 'jam', c: 'cream' }, parts: [['cyl', 'p', [0, 0, 0], 1, 14], ['cyl', 'p', [0, 0, 4], 8, .6], ['cyl', 'p', [0, 0, 11], 6, .6], ['cyl', 's', [0, 0, 4.6], 5, 2], ['cyl', 'j', [0, 0, 6.6], 5, .6], ['cyl', 's', [0, 0, 7.2], 5, 2], ['cyl', 'c', [0, 0, 11.6], 4, 1.2]] },
    umbrellaOpen: { about: "a spectator's open umbrella", tags: 'crowd', mats: { c: 'canvasBlue', i: 'iron' }, parts: [['cyl', 'i', [0, 0, 0], .4, 18], ['cyl', 'c', [0, 0, 15], 9, 4, { r2: 0, seg: 8 }]] },
    netPost: { about: 'a practice-net post with a top rail', tags: 'cricket', mats: { i: 'iron' }, parts: [['cyl', 'i', [0, 0, 0], 1, 52], ['ball', 'i', [0, 0, 52], 1.4]] },
    tent: { about: 'a striped marquee tent', tags: 'fete', mats: { a: 'stripeBlue', w: 'whitepaint' }, parts: [['box', 'w', [0, 0, 0], [50, 40, 18]], ['cyl', 'a', [0, 0, 18], 30, 20, { r2: 0, seg: 4 }]] }
  }
};

/* ---- 10-data-teams.js ---- */
/* ---- TEAMS AND PLAYERS (6 teams of 11). Stars are hand-made; the rest of each squad is generated from the team's name
 * pool and palette with a seeded stream (the same squad every time). Stats 1-10: bat (timing), power, tech, field
 * (speed, catch, ground, throw); bowl: { type, skill, d: [3 delivery ids] }; style: slogger | accumulator | blocker.
 * To add a team: a new entry in TEAM_DEFS (kit colours, ground, stars, pool), then it shows in Quick Match. ---- */
const SKINS = ['#f2d0b0', '#e0b090', '#c89070', '#a87050', '#7a4a30', '#5a3420'];
const HAIRS = ['#2a1a12', '#5a3a22', '#8a5a2a', '#c8902a', '#e8c060', '#9a9a9a', '#d8d8d0', '#a83a1a'];
const TEAM_DEFS = [
  { id: 'ker', code: 'KER', name: 'Kerfuffle CC', nick: 'The Teapots', ground: 'green', chip: '#2f6b3a',
    kit: { cloth: '#f2ead8', pants: '#f2ead8', trim: '#2f6b3a', cap: '#2f6b3a', boot: '#f4f4f0', belt: '#2f6b3a', glove: '#f4f4f0' },
    pool: ['Hodge', 'Pemberton', 'Allsop', 'Twigg', 'Moss', 'Fairweather', 'Hobbs', 'Nettles'],
    stars: [
      { id: 'edie', name: 'Edie Pluckrose', short: 'PLUCKROSE', role: 'all', bat: 8, power: 8, tech: 7, style: 'slogger', hand: 1, bowl: { type: 'pace', skill: 8, d: ['express', 'bouncer', 'yorker'] }, specBat: 'kettle', specBowl: 'vicar', field: [8, 8, 7, 8], voice: 240,
        look: { build: 'heroic', size: 1.2, hair: 'ponytail', hairC: '#b04a1e', skin: '#f2d0b0', freckles: true } },
      { id: 'dev', name: 'Dev Mistry', short: 'MISTRY', role: 'bat', bat: 8, power: 5, tech: 9, style: 'accumulator', hand: 1, bowl: { type: 'medium', skill: 4, d: ['dobber', 'cutter', 'knuckle'] }, specBat: 'certainty', field: [6, 7, 7, 6], voice: 170,
        look: { build: 'heroic', size: 1.15, hair: 'short', hairC: '#1a1410', skin: '#a87050', glasses: true } },
      { id: 'pip', name: 'Pip Larkin', short: 'LARKIN', role: 'keep', bat: 6, power: 4, tech: 6, style: 'accumulator', hand: -1, bowl: null, specField: 'chirp', field: [8, 9, 8, 7], voice: 290,
        look: { build: 'chibi', size: 1.15, hair: 'spiky', hairC: '#ecd070', skin: '#f2d0b0' } },
      { id: 'basil', name: 'Basil Thwaite', short: 'THWAITE', role: 'bowl', bat: 3, power: 3, tech: 5, style: 'blocker', hand: 1, bowl: { type: 'spin', skill: 9, d: ['legbreak', 'googly', 'topspin'] }, specBowl: 'grandad', field: [3, 6, 5, 4], voice: 120,
        look: { build: 'chibi', size: 1.15, hair: 'bald', hairC: '#d8d8d0', skin: '#f2d0b0', moustache: 'walrus', cardigan: '#c8b890', cap: true } }
    ] },
  { id: 'mud', code: 'MUD', name: 'Lower Muddleford Mutineers', nick: 'The Mutineers', ground: 'green', chip: '#e07a2a',
    kit: { cloth: '#6a4a2a', pants: '#e8dcc0', trim: '#e07a2a', cap: '#e07a2a', boot: '#3a2a1a', belt: '#3a2a1a', glove: '#f0e8d8' },
    pool: ['Clod', 'Furrow', 'Bagshaw', 'Wurzel', 'Pratt', 'Muckle', 'Turnip', 'Haybale'],
    stars: [
      { id: 'gaz', name: 'Gaz Gristle', short: 'GRISTLE', role: 'bat', bat: 6, power: 9, tech: 4, style: 'slogger', hand: 1, bowl: { type: 'medium', skill: 4, d: ['dobber', 'cutter', 'knuckle'] }, specBat: 'longhandle', field: [5, 5, 5, 6], voice: 150,
        look: { build: 'bulky', size: 1.2, hair: 'short', hairC: '#5a3a22', skin: '#e0b090', beard: 'full' } },
      { id: 'terry', name: 'Big Terry Dunstable', short: 'DUNSTABLE', role: 'bowl', bat: 4, power: 7, tech: 3, style: 'slogger', hand: 1, bowl: { type: 'medium', skill: 6, d: ['dobber', 'knuckle', 'cutter'] }, specBowl: 'dibbly', field: [3, 5, 4, 5], voice: 130,
        look: { build: 'bulky', size: 1.25, hair: 'bald', hairC: '#8a5a2a', skin: '#f2d0b0' } },
      { id: 'nan', name: 'Nan Gristle', short: 'NAN GRISTLE', role: 'bowl', bat: 4, power: 2, tech: 6, style: 'blocker', hand: 1, bowl: { type: 'spin', skill: 7, d: ['offbreak', 'armball', 'topspin'] }, field: [3, 7, 6, 3], voice: 230,
        look: { build: 'chibi', size: 1.1, hair: 'long', hairC: '#d8d8d0', skin: '#f2d0b0', glasses: true } }
    ] },
  { id: 'gen', code: 'GEN', name: 'Gentlemen of Thrumpton', nick: 'The Gentlemen', ground: 'hall', chip: '#d8b04a',
    kit: { cloth: '#f4f4f0', pants: '#f4f4f0', trim: '#22305a', cap: '#22305a', boot: '#f4f4f0', belt: '#22305a', glove: '#f4f4f0' },
    pool: ['Ffoulkes', 'Carstairs', 'Montague', 'St John-Smythe', 'Pargeter', 'Wetherby', 'Ponsonby'],
    stars: [
      { id: 'peregrine', name: 'Hon. Peregrine Twistleton-Smythe', short: 'TWISTLETON', role: 'bowl', bat: 6, power: 5, tech: 7, style: 'accumulator', hand: 1, bowl: { type: 'swing', skill: 9, d: ['outswing', 'inswing', 'wobble'] }, specBowl: 'swoop', field: [6, 7, 7, 7], voice: 180,
        look: { build: 'heroic', size: 1.22, hair: 'short', hairC: '#e8c060', skin: '#f2d0b0', moustache: 'handlebar' } },
      { id: 'fortescue', name: 'Fortescue', short: 'FORTESCUE', role: 'all', bat: 5, power: 4, tech: 7, style: 'blocker', hand: 1, bowl: { type: 'medium', skill: 6, d: ['dobber', 'cutter', 'knuckle'] }, specField: 'tray', field: [6, 10, 9, 7], voice: 110,
        look: { build: 'heroic', size: 1.18, hair: 'short', hairC: '#9a9a9a', skin: '#f2d0b0', moustache: 'walrus' } },
      { id: 'araminta', name: 'Lady Araminta Fitch', short: 'FITCH', role: 'bat', bat: 9, power: 6, tech: 9, style: 'accumulator', hand: -1, bowl: null, specBat: 'croquet', field: [7, 8, 7, 6], voice: 250,
        look: { build: 'heroic', size: 1.18, hair: 'long', hairC: '#2a1a12', skin: '#f2d0b0' } }
    ] },
  { id: 'lar', code: 'LAR', name: 'Sunburnt Bay Larrikins', nick: 'The Larrikins', ground: 'bay', chip: '#1fb5a8',
    kit: { cloth: '#1fb5a8', pants: '#ffd23a', trim: '#ffd23a', cap: '#ffd23a', boot: '#f4f4f0', belt: '#0e6a62', glove: '#ffd23a' },
    pool: ['Dunno', 'Bluey', 'Sandy', 'Robbo', 'Gazza', 'Davo', 'Muzza', 'Stevo'],
    stars: [
      { id: 'shazza', name: 'Shazza Brannigan', short: 'BRANNIGAN', role: 'bowl', bat: 5, power: 6, tech: 5, style: 'slogger', hand: 1, bowl: { type: 'pace', skill: 9, d: ['express', 'bouncer', 'yorker'] }, specBowl: 'sunburn', field: [8, 7, 6, 9], voice: 230,
        look: { build: 'heroic', size: 1.22, hair: 'ponytail', hairC: '#e8c060', skin: '#e0b090', zinc: true } },
      { id: 'kev', name: 'Kev "Thongs" Malone', short: 'MALONE', role: 'bat', bat: 6, power: 10, tech: 4, style: 'slogger', hand: 1, bowl: { type: 'medium', skill: 3, d: ['dobber', 'knuckle', 'cutter'] }, specBat: 'bludgeon', field: [5, 5, 5, 6], voice: 140,
        look: { build: 'bulky', size: 1.25, hair: 'spiky', hairC: '#c8902a', skin: '#c89070', zinc: true } },
      { id: 'wal', name: 'Big Wal', short: 'BIG WAL', role: 'keep', bat: 5, power: 7, tech: 5, style: 'slogger', hand: 1, bowl: null, field: [5, 8, 7, 6], voice: 120,
        look: { build: 'bulky', size: 1.2, hair: 'short', hairC: '#2a1a12', skin: '#7a4a30', beard: 'goatee' } }
    ] },
  { id: 'mag', code: 'MAG', name: 'Magic Circle XI', nick: 'The Conjurers', ground: 'downs', chip: '#c8ccd8',
    kit: { cloth: '#5a2a7a', pants: '#2a1a3a', trim: '#c8ccd8', cap: '#2a1a3a', boot: '#1a1020', belt: '#c8ccd8', glove: '#f4f4f0', cape: '#2a1a3a', capeIn: '#a8202a' },
    pool: ['Presto', 'Abra', 'Mystique', 'Prestidigitate', 'Sleight', 'Hocus', 'Pocus'],
    stars: [
      { id: 'spinaldo', name: 'The Great Spinaldo', short: 'SPINALDO', role: 'bowl', bat: 5, power: 5, tech: 6, style: 'accumulator', hand: 1, bowl: { type: 'spin', skill: 10, d: ['legbreak', 'googly', 'doosra'] }, specBowl: 'vanish', field: [5, 7, 6, 5], voice: 160,
        look: { build: 'heroic', size: 1.22, hair: 'short', hairC: '#1a1410', skin: '#e0b090', moustache: 'handlebar', cape: true } },
      { id: 'zsazsa', name: 'Madame Zsa-Zsa Flick', short: 'FLICK', role: 'bowl', bat: 5, power: 4, tech: 6, style: 'accumulator', hand: 1, bowl: { type: 'spin', skill: 8, d: ['googly', 'legbreak', 'topspin'] }, specBowl: 'sawn', field: [6, 6, 6, 5], voice: 260,
        look: { build: 'heroic', size: 1.15, hair: 'long', hairC: '#a83a1a', skin: '#f2d0b0' } },
      { id: 'houdini', name: 'Houdini Jnr', short: 'HOUDINI', role: 'keep', bat: 6, power: 5, tech: 6, style: 'accumulator', hand: 1, bowl: null, specField: 'lightning', field: [8, 8, 8, 7], voice: 200,
        look: { build: 'chibi', size: 1.15, hair: 'short', hairC: '#2a1a12', skin: '#c89070' } }
    ] },
  { id: 'thr', code: 'THR', name: "Thrumpton's Thunderbolts", nick: 'The Thunderbolts', ground: 'dome', chip: '#7a3aff',
    kit: { cloth: '#1a1a22', pants: '#1a1a22', trim: '#7a3aff', cap: '#7a3aff', boot: '#0e0e12', belt: '#ffcf3a', glove: '#ffcf3a' },
    pool: ['Bartholomew', 'Silas', 'Ignatius', 'Obadiah', 'Cornelius', 'Jeremiah', 'Ezekiel'], ghosts: true,
    stars: [
      { id: 'thrumpton', name: 'Lord Rufus Thrumpton-Vane', short: 'THRUMPTON', role: 'all', bat: 7, power: 7, tech: 6, style: 'accumulator', hand: 1, bowl: { type: 'medium', skill: 6, d: ['cutter', 'dobber', 'yorker'] }, specBat: 'grudgeDrive', specBowl: 'grudge', field: [4, 5, 5, 5], voice: 160,
        look: { build: 'bulky', size: 1.22, hair: 'short', hairC: '#9a9a9a', skin: '#f2d0b0', moustache: 'handlebar', tweed: true } },
      { id: 'grimble', name: 'Dr Ebenezer Grimble', short: 'GRIMBLE', role: 'bat', bat: 8, power: 6, tech: 8, style: 'accumulator', hand: 1, bowl: { type: 'spin', skill: 6, d: ['offbreak', 'armball', 'topspin'] }, specBat: 'ecto', field: [6, 7, 7, 6], voice: 140, ghost: true,
        look: { build: 'heroic', size: 1.2, hair: 'long', hairC: '#d8d8d0', skin: '#c8e0f0', beard: 'full' } },
      { id: 'machine', name: 'The Thrumptonator 3000', short: 'THRUMPTONATOR', role: 'bowl', bat: 1, power: 1, tech: 1, style: 'blocker', hand: 1, bowl: { type: 'machine', skill: 10, d: ['piston', 'steamBouncer', 'spinCycle'] }, specBowl: 'triple', field: [1, 1, 1, 1], voice: 90, machine: true,
        look: { build: 'bulky', size: 1.2, hair: 'bald', hairC: '#888', skin: '#c8a040' } }
    ] }
];
/** the generated part of a squad: names from the pool, looks from the palette, a mix of roles */
function buildTeam(def) {
  const r = E.rng(def.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const players = def.stars.map(s => Object.assign({ team: def.id, star: true }, s));
  const roles = ['bat', 'bat', 'all', 'bowl', 'bowl', 'all', 'bat', 'bowl'], used = new Set();
  const families = ['pace', 'swing', 'medium', 'spin'], DEL = { pace: ['express', 'bouncer', 'yorker'], swing: ['outswing', 'inswing', 'wobble'], medium: ['dobber', 'cutter', 'knuckle'], spin: ['offbreak', 'armball', 'topspin'] };
  let k = 0;
  while (players.length < 11) {
    let nm; do { nm = def.pool[Math.floor(r() * def.pool.length)]; } while (used.has(nm) && used.size < def.pool.length); used.add(nm);
    const role = roles[k++ % roles.length], bowls = role !== 'bat', fam = families[Math.floor(r() * families.length)];
    const lvl = role === 'bat' ? 6 : role === 'all' ? 5 : 3, ghost = !!def.ghosts;
    players.push({ team: def.id, id: def.id + '_' + nm.toLowerCase().replace(/[^a-z]/g, ''), name: (ghost ? 'Sir ' : '') + nm, short: nm.toUpperCase(), role,
      bat: clamp(lvl + Math.floor(r() * 3) - 1, 1, 10), power: clamp(4 + Math.floor(r() * 5), 1, 10), tech: clamp(lvl + Math.floor(r() * 3) - 1, 1, 10),
      style: r() < .35 ? 'slogger' : r() < .7 ? 'accumulator' : 'blocker', hand: r() < .3 ? -1 : 1, ghost,
      bowl: bowls ? { type: fam, skill: clamp(4 + Math.floor(r() * 4) + (role === 'bowl' ? 2 : 0), 1, 10), d: DEL[fam] } : null,
      field: [4 + Math.floor(r() * 5), 4 + Math.floor(r() * 5), 4 + Math.floor(r() * 5), 4 + Math.floor(r() * 5)], voice: 140 + Math.floor(r() * 120),
      look: { build: r() < .3 ? 'bulky' : r() < .6 ? 'chibi' : 'heroic', size: 1.12 + r() * .1, hair: ['short', 'spiky', 'long', 'bald', 'ponytail'][Math.floor(r() * 5)], hairC: ghost ? '#d8e8f0' : HAIRS[Math.floor(r() * HAIRS.length)], skin: ghost ? '#c8e0f0' : SKINS[Math.floor(r() * SKINS.length)], moustache: r() < .2 ? 'walrus' : null } });
  }
  // a keeper if none; batting order: stars and batters first, bowlers last
  if (!players.some(p => p.role === 'keep')) { const k = players.slice().reverse().find(p => !p.star && p.role === 'bat') || players[players.length - 1]; k.role = 'keep'; }
  for (const p of players) if (p.role === 'keep') p.bowl = null;   // a keeper keeps; he never bowls
  const rank = p => (p.role === 'bat' ? 0 : p.role === 'keep' ? 1 : p.role === 'all' ? 2 : 3) - (p.star ? .5 : 0) + (p.machine ? 10 : 0);
  const order = players.slice().sort((a, b) => rank(a) - rank(b) || b.bat - a.bat);
  const bowlers = players.filter(p => p.bowl).sort((a, b) => b.bowl.skill - a.bowl.skill).slice(0, 5);
  const fam = new Set(bowlers.map(b => b.bowl.type));
  if (fam.size < 2) { const extra = players.find(p => !p.bowl && p.role !== 'keep'); if (extra) { extra.bowl = { type: [...fam][0] === 'spin' ? 'medium' : 'spin', skill: 5, d: [...fam][0] === 'spin' ? DEL.medium : DEL.spin }; bowlers.push(extra); } }
  for (const p of players) { p.field = { speed: p.field[0], catch: p.field[1], ground: p.field[2], throw: p.field[3] }; }
  return Object.assign({}, def, { players, order, bowlers, keeper: players.find(p => p.role === 'keep') });
}
const TEAMS = {};
for (const d of TEAM_DEFS) TEAMS[d.id] = buildTeam(d);
const TEAM_IDS = TEAM_DEFS.map(d => d.id);
const playerById = id => { for (const t of TEAM_IDS) { const p = TEAMS[t].players.find(q => q.id === id); if (p) return p; } return null; };
K.TEAMS = TEAMS; K.TEAM_IDS = TEAM_IDS; K.playerById = playerById;

/* ---- 11-data-grounds.js ---- */
/* ---- GROUNDS (5) and the Nets. Each is a recipe: the boundary ellipse (rx x ry, centred on the pitch's middle,
 * (0, 160)), the pitch (bounce, turn, seam, pace), the outfield's rolling decay, the default time of day and weather,
 * the palette the floor is painted from, stadium targets (beyond the rope: a ball that flies through one scores a
 * KERFUFFLE BONUS), props (KERFUFFLE: shapes and engine shapes), stands, ends and the chaos pool. To add a ground:
 * a new entry here (and any new shapes in 07-assets-kerfuffle.js); Quick Match lists it. ---- */
const GROUNDS = {
  green: { id: 'green', name: 'Kerfuffle Village Green', short: 'THE VILLAGE GREEN', ends: ['Pavilion End', 'Leaning Wicket End'], rx: 560, ry: 600,
    pitch: { bounce: 1, turn: 1, seam: 1.2, pace: .95 }, k: .55 * 1.25, slope: .08, time: 'day', weather: 'clear', music: 'green', crowd: .6,
    pal: { g1: '#6fae4a', g2: '#5e9c3e', pitch: '#c9b98a', worn: '#b39f6c', out: '#4f8a3a', outTag: 'lane', sky: ['#8fc4ff', '#cfe6ff', '#ffe6b0'], accent: '#2f6b3a', accent2: '#8a2a2a', rope: '#f4f4f0' },
    targets: [
      { id: 'pub', label: 'THE PUB WINDOW', at: [-120, 850, 26], size: [90, 30, 40], bonus: 6, line: 'pub', fx: 'glass', shape: 'KERFUFFLE:pubFront', face: Math.PI * 1.5 },
      { id: 'greenhouse', label: 'THE VICARAGE GREENHOUSE', at: [560, 560, 16], size: [80, 50, 36], bonus: 10, line: 'greenhouse', fx: 'glass', shape: 'KERFUFFLE:greenhouse', face: Math.PI },
      { id: 'weathervane', label: 'THE CHURCH WEATHERVANE', at: [-620, 330, 96], size: [40, 40, 50], bonus: 12, line: 'weathervane', fx: 'spin', shape: 'KERFUFFLE:church', face: 0 },
      { id: 'hive', label: 'THE BEEHIVE', at: [-330, 560, 44], size: [36, 36, 30], bonus: 4, line: 'hive', fx: 'bees', inside: true }
    ],
    props: [['KERFUFFLE:pavilion', 0, -620, Math.PI / 2], ['KERFUFFLE:scoreboardHut', 330, -540, Math.PI / 2], ['KERFUFFLE:oakTree', -330, 560, 0], ['KERFUFFLE:phantomCar', 470, 760, Math.PI],
      ['KERFUFFLE:deckchair', -200, -470, Math.PI / 2], ['KERFUFFLE:deckchair', -170, -478, Math.PI / 2], ['KERFUFFLE:deckchair', 210, 795, -Math.PI / 2], ['KERFUFFLE:roller', 560, -260, 0],
      ['tree', -700, -300, 0], ['tree', 720, 120, 0], ['tree', 680, -380, 0], ['tree', -760, 700, 0], ['bench', 400, -470, Math.PI / 2], ['bench', -420, 760, -Math.PI / 2], ['KERFUFFLE:tent', -560, -360, Math.PI / 2]],
    stands: 'village', chaos: ['cow', 'bees', 'bells', 'mascot'], umpire: 'hollis' },
  hall: { id: 'hall', name: 'Thrumpton Hall', short: 'THRUMPTON HALL', ends: ['Orangery End', 'Hall End'], rx: 620, ry: 620,
    pitch: { bounce: 1, turn: .9, seam: 1.1, pace: 1 }, k: .55 * .8, slope: 0, time: 'day', weather: 'overcast', music: 'hall', crowd: .5,
    pal: { g1: '#5f9f55', g2: '#4f8c48', pitch: '#c4b892', worn: '#ae9f78', out: '#8a8a7a', outTag: 'gravel', sky: ['#9aa6b4', '#b8c2cc', '#cfd6dc'], accent: '#22305a', accent2: '#d8b04a', rope: '#d8b04a', diagonal: true },
    targets: [
      { id: 'fountain', label: 'THE FOUNTAIN', at: [-560, 640, 14], size: [70, 70, 30], bonus: 6, line: 'fountain', fx: 'splash', shape: 'KERFUFFLE:fountain', face: 0 },
      { id: 'carwindscreen', label: "THRUMPTON'S WINDSCREEN", at: [590, 540, 16], size: [70, 40, 26], bonus: 10, line: 'car', fx: 'glass', shape: 'KERFUFFLE:phantomCar', face: Math.PI },
      { id: 'hallwindow', label: 'THE HALL WINDOW', at: [0, 900, 56], size: [160, 30, 50], bonus: 8, line: 'hallwindow', fx: 'glass' }
    ],
    props: [['KERFUFFLE:hallFacade', 0, 960, -Math.PI / 2], ['KERFUFFLE:scoreboardHut', -380, -620, Math.PI / 2], ['KERFUFFLE:peacock', 480, -380, 0], ['pine', -760, -200, 0], ['pine', 760, -100, 0], ['pine', -760, 120, 0], ['KERFUFFLE:deckchair', 300, -640, Math.PI / 2], ['bench', -200, -640, Math.PI / 2]],
    stands: 'terrace', chaos: ['peacocks', 'tray', 'mascot'], umpire: 'neutral' },
  bay: { id: 'bay', name: 'Sunburnt Bay', short: 'SUNBURNT BAY', ends: ['Dunes End', 'Pier End'], rx: 640, ry: 520, seaSide: -1,
    pitch: { bounce: 1.25, turn: .9, seam: 1, pace: 1.15 }, k: .55 * 1.6, slope: 0, runSlow: .85, time: 'day', weather: 'clear', music: 'bay', crowd: .7,
    pal: { g1: '#e8d39a', g2: '#dcc287', pitch: '#d8c49a', worn: '#c4ae80', out: '#e0c88a', outTag: 'sand', sky: ['#3fb8ff', '#7fd4ff', '#bff0ff'], accent: '#1fb5a8', accent2: '#ffd23a', rope: '#ff5a3a', sand: true },
    targets: [
      { id: 'ferris', label: 'THE FERRIS WHEEL', at: [-330, 760, 70], size: [70, 30, 90], bonus: 12, line: 'ferris', fx: 'spin', shape: 'KERFUFFLE:ferrisWheel', face: 0 },
      { id: 'icecream', label: 'THE ICE-CREAM VAN', at: [520, 560, 18], size: [70, 40, 36], bonus: 6, line: 'icecream', fx: 'icecream', shape: 'KERFUFFLE:iceCreamVan', face: Math.PI },
      { id: 'shark', label: 'THE INFLATABLE SHARK', at: [-800, 220, 10], size: [60, 50, 26], bonus: 8, line: 'shark', fx: 'splash', shape: 'KERFUFFLE:inflatableShark', face: 0 }
    ],
    props: [['KERFUFFLE:beachHut', 300, -520, Math.PI / 2], ['KERFUFFLE:beachHut', 360, -520, Math.PI / 2], ['KERFUFFLE:beachHut', 420, -510, Math.PI / 2], ['KERFUFFLE:beachHut', 480, -490, Math.PI / 2], ['KERFUFFLE:pier', -480, 760, 0],
      ['palm', 700, 0, 0], ['palm', 680, 300, 0], ['palm', 640, -300, 0], ['KERFUFFLE:deckchair', 600, 420, Math.PI], ['KERFUFFLE:deckchair', 610, 380, Math.PI], ['KERFUFFLE:scoreboardHut', 60, -560, Math.PI / 2]],
    stands: 'beach', chaos: ['gulls', 'tide', 'mascot'], umpire: 'neutral' },
  downs: { id: 'downs', name: 'Dustbowl Downs', short: 'DUSTBOWL DOWNS', ends: ['Water Tower End', 'Top Hat End'], rx: 600, ry: 600,
    pitch: { bounce: 1.05, turn: 1.3, seam: .9, pace: .9, rough: 1.3 }, k: .55 * .85, slope: 0, bumpy: true, time: 'day', weather: 'clear', storm: true, music: 'downs', crowd: .55,
    pal: { g1: '#a8a85a', g2: '#97974e', pitch: '#d4b37a', worn: '#b8915a', out: '#c8a868', outTag: 'dirt', sky: ['#ffcf8a', '#ffe0b0', '#fff0d0'], accent: '#5a2a7a', accent2: '#c8ccd8', rope: '#c8ccd8' },
    targets: [
      { id: 'tophat', label: 'THE GIANT TOP HAT', at: [-440, 720, 30], size: [70, 70, 60], bonus: 8, line: 'tophat', fx: 'doves', shape: 'KERFUFFLE:topHat', face: 0 },
      { id: 'watertower', label: 'THE WATER TOWER', at: [580, 520, 70], size: [60, 60, 60], bonus: 10, line: 'watertower', fx: 'splash', shape: 'KERFUFFLE:waterTower', face: 0 },
      { id: 'balloon', label: 'THE HOT-AIR BALLOON', at: [0, 900, 130], size: [80, 80, 90], bonus: 15, line: 'balloon', fx: 'pop', moving: true, shape: 'KERFUFFLE:hotAirBalloon', face: 0 }
    ],
    props: [['KERFUFFLE:caravan', 420, -580, Math.PI / 2], ['KERFUFFLE:scoreboardHut', -320, -580, Math.PI / 2], ['KERFUFFLE:umbrellaOpen', 200, -640, 0], ['KERFUFFLE:umbrellaOpen', 240, -650, 0], ['KERFUFFLE:umbrellaOpen', -620, 420, 0], ['cactus', 700, 100, 0], ['cactus', -720, -100, 0], ['rock', 690, -300, 0], ['rock', -700, 300, 0]],
    stands: 'bleachers', chaos: ['rain', 'dustdevil', 'rabbits', 'mascot'], umpire: 'neutral' },
  dome: { id: 'dome', name: 'The Thrumpton Megadome', short: 'THE MEGADOME', ends: ['Old Pavilion End', 'Jumbotron End'], rx: 760, ry: 760,
    pitch: { bounce: 1.1, turn: 1, seam: 1, pace: 1.2 }, k: .55 * .7, slope: 0, time: 'night', weather: 'fog', music: 'dome', crowd: 1,
    pal: { g1: '#2f7a3a', g2: '#286a32', pitch: '#b8a888', worn: '#a09070', out: '#2a2a3a', outTag: 'track', sky: ['#05050f', '#0a0a1e', '#1a1040'], accent: '#7a3aff', accent2: '#ffcf3a', rope: '#7a3aff' },
    targets: [
      { id: 'jumbotron', label: 'THE JUMBOTRON', at: [0, 1060, 110], size: [220, 30, 110], bonus: 15, line: 'jumbotron', fx: 'glitch', shape: 'KERFUFFLE:jumbotron', face: -Math.PI / 2 },
      { id: 'vip', label: 'THE VIP BOX', at: [800, 520, 70], size: [80, 60, 50], bonus: 12, line: 'vip', fx: 'glass', shape: 'KERFUFFLE:vipBox', face: Math.PI },
      { id: 'bell', label: 'THE GHOST BELL', at: [-780, 420, 100], size: [50, 50, 50], bonus: 12, line: 'bell', fx: 'bell', shape: 'KERFUFFLE:ghostBell', face: 0 },
      { id: 'laser', label: 'THE LASER RIG', at: [-560, 980, 110], size: [60, 60, 50], bonus: 8, line: 'laser', fx: 'spark', shape: 'KERFUFFLE:laserRig', face: 0 }
    ],
    props: [['KERFUFFLE:floodlight', -820, -380, 0], ['KERFUFFLE:floodlight', 820, -380, 0], ['KERFUFFLE:floodlight', -820, 720, 0], ['KERFUFFLE:floodlight', 820, 720, 0]],
    stands: 'dome', chaos: ['fog', 'ghosts', 'fireworks', 'advert'], umpire: 'neutral', lights: true },
  nets: { id: 'nets', name: 'The Nets', short: 'THE NETS', ends: ['Net End', 'Machine End'], rx: 520, ry: 560, nets: true,
    pitch: { bounce: 1, turn: 1, seam: 1, pace: 1 }, k: .55, slope: 0, time: 'day', weather: 'clear', music: 'tea', crowd: .15,
    pal: { g1: '#6fae4a', g2: '#62a042', pitch: '#c9b98a', worn: '#b39f6c', out: '#4f8a3a', outTag: 'lane', sky: ['#8fc4ff', '#cfe6ff', '#ffe6b0'], accent: '#2f6b3a', accent2: '#8a2a2a', rope: '#f4f4f0' },
    targets: [], props: [['KERFUFFLE:pavilion', 0, -660, Math.PI / 2], ['tree', -620, -200, 0], ['tree', 640, -100, 0], ['KERFUFFLE:stumps', -110, 0, Math.PI / 2], ['KERFUFFLE:thrumptonator', -110, 330, -Math.PI / 2]], stands: 'village', chaos: [], umpire: 'none',
    // two netted lanes: the one you play in (back and side nets round the batter, open in front so shots run free) and a
    // full practice lane beside it with its own stumps and bowling machine: [x0, y0, x1, y1] panels, 50 units high
    netPanels: [[-26, -40, 26, -40], [-26, -40, -26, 40], [26, -40, 26, 40], [-136, -40, -84, -40], [-136, -40, -136, 300], [-84, -40, -84, 300]] }
};
const GROUND_IDS = ['green', 'hall', 'bay', 'downs', 'dome'];
const UMPIRES = {
  hollis: { name: 'Rev. Hollis', accuracy: .86, slowFinger: 1.2, voice: 150, look: { build: 'heroic', size: 1.18, hair: 'short', hairC: '#d8d8d0', skin: '#f2d0b0', glasses: true, collar: true } },
  neutral: { name: 'Mr Prendergast', accuracy: .92, slowFinger: .5, voice: 140, look: { build: 'heroic', size: 1.18, hair: 'short', hairC: '#5a3a22', skin: '#e0b090' } },
  none: null
};
K.GROUNDS = GROUNDS; K.GROUND_IDS = GROUND_IDS; K.UMPIRES = UMPIRES;

/* ---- 12-data-deliveries.js ---- */
/* ---- DELIVERIES (speeds nominal km/h; swing + = away from a right-hander; turn degrees, + = away from a
 * right-hander). Swing base acceleration: 60 u/s² x swing x T('swing') x ground factor. A bowler lists 3 deliveries
 * of a family plus a special. Field presets in the batter's frame (theta degrees from straight, + off side; distance
 * in units, 'b' = the boundary minus 30). ---- */
const DELIVERIES = {
  express: { name: 'Express', fam: 'pace', kmh: [138, 148], swing: .1, seam: 1, turn: 0, bounce: 1, len: [60, 110] },
  bouncer: { name: 'Bouncer', fam: 'pace', kmh: [135, 145], swing: 0, seam: 1, turn: 0, bounce: 1.25, len: [140, 200] },
  yorker: { name: 'Yorker', fam: 'pace', kmh: [136, 146], swing: .15, seam: .5, turn: 0, bounce: .9, len: [2, 18] },
  slower: { name: 'Slower ball', fam: 'pace', kmh: [105, 115], swing: 0, seam: 1.2, turn: 0, bounce: .95, len: [50, 90], hideSpeed: true },
  outswing: { name: 'Outswinger', fam: 'swing', kmh: [125, 135], swing: 1, seam: 1, turn: 0, bounce: 1, len: [40, 90] },
  inswing: { name: 'Inswinger', fam: 'swing', kmh: [125, 135], swing: -1, seam: 1, turn: 0, bounce: 1, len: [40, 90] },
  wobble: { name: 'Wobble seam', fam: 'swing', kmh: [120, 130], swing: 0, wobble: .3, seam: 3, turn: 0, bounce: 1, len: [60, 110] },
  dobber: { name: 'Dobber', fam: 'medium', kmh: [100, 110], swing: .1, seam: 1.5, turn: 0, bounce: .95, len: [60, 110] },
  cutter: { name: 'Cutter', fam: 'medium', kmh: [105, 115], swing: 0, seam: 1, turn: 3, bounce: .95, len: [60, 110] },
  knuckle: { name: 'Knuckle ball', fam: 'medium', kmh: [95, 105], swing: 0, wobble: .4, seam: .5, turn: 0, bounce: .9, len: [40, 90] },
  legbreak: { name: 'Leg break', fam: 'spin', kmh: [78, 88], swing: -.3, seam: .3, turn: 9, bounce: 1.05, len: [50, 100] },
  googly: { name: 'Googly', fam: 'spin', kmh: [76, 86], swing: .2, seam: .3, turn: -8, bounce: 1.05, len: [50, 100] },
  topspin: { name: 'Top-spinner', fam: 'spin', kmh: [80, 90], swing: 0, seam: .3, turn: 0, bounce: 1.2, len: [50, 100] },
  offbreak: { name: 'Off break', fam: 'spin', kmh: [80, 90], swing: .3, seam: .3, turn: -8, bounce: 1, len: [50, 100] },
  armball: { name: 'Arm ball', fam: 'spin', kmh: [88, 96], swing: .3, seam: .3, turn: 0, bounce: .95, len: [50, 100] },
  doosra: { name: 'Doosra', fam: 'spin', kmh: [78, 88], swing: 0, seam: .3, turn: 8, bounce: 1.05, len: [50, 100] },
  piston: { name: 'Piston Express', fam: 'machine', kmh: [160, 170], swing: 0, seam: .8, turn: 0, bounce: 1.05, len: [60, 110] },
  steamBouncer: { name: 'Steam Bouncer', fam: 'machine', kmh: [150, 150], swing: 0, seam: 1, turn: 0, bounce: 1.35, len: [140, 190], fx: 'steam' },
  spinCycle: { name: 'Spin Cycle', fam: 'machine', kmh: [95, 95], swing: 0, seam: 0, turn: 14, randTurn: true, bounce: 1.1, len: [50, 100] }
};
const FAMILY = { pace: { runup: 2.0, runLen: 150, label: 'PACE' }, swing: { runup: 1.7, runLen: 120, label: 'SWING' }, medium: { runup: 1.5, runLen: 95, label: 'MEDIUM' }, spin: { runup: .9, runLen: 40, label: 'SPIN' }, machine: { runup: 1.4, runLen: 0, label: 'MACHINE' } };
const B = 'b';
const FIELDS = {
  attacking: { name: 'Attacking', spots: [['slip1', 165, 150], ['slip2', 158, 150], ['slip3', 151, 152], ['gully', 132, 150], ['point', 95, 230], ['cover', 58, 260], ['midoff', 14, 300], ['midon', -14, 300], ['fineleg', -162, B]] },
  balanced: { name: 'Balanced', spots: [['slip1', 165, 150], ['point', 95, 240], ['cover', 55, 270], ['midoff', 12, 320], ['midon', -12, 320], ['midwicket', -60, 270], ['squareleg', -95, 250], ['fineleg', -160, B], ['thirdman', 155, B]] },
  defensive: { name: 'Defensive', spots: [['point', 95, 250], ['deepcover', 55, B], ['longoff', 12, B], ['longon', -12, B], ['deepmid', -60, B], ['deepsquare', -95, B], ['fineleg', -160, B], ['thirdman', 155, B], ['cover', 40, 260]] },
  spin: { name: 'Spin attack', spots: [['slip1', 160, 40], ['shortleg', -100, 50], ['sillypoint', 100, 50], ['cover', 55, 240], ['midoff', 12, 280], ['midon', -12, 280], ['midwicket', -60, 240], ['deepsquare', -95, B], ['longon', -15, B]] }
};
const FIELD_ORDER = ['attacking', 'balanced', 'defensive', 'spin'];
const POS_NAMES = { slip1: 'first slip', slip2: 'second slip', slip3: 'third slip', gully: 'gully', point: 'point', cover: 'cover', midoff: 'mid-off', midon: 'mid-on', fineleg: 'fine leg', midwicket: 'midwicket', squareleg: 'square leg', thirdman: 'third man', deepcover: 'deep cover', longoff: 'long-off', longon: 'long-on', deepmid: 'deep midwicket', deepsquare: 'deep square leg', shortleg: 'short leg', sillypoint: 'silly point', keeper: 'wicketkeeper', bowler: 'the bowler' };
K.DELIVERIES = DELIVERIES; K.FAMILY = FAMILY; K.FIELDS = FIELDS; K.FIELD_ORDER = FIELD_ORDER; K.POS_NAMES = POS_NAMES;

/* ---- 13-data-shots.js ---- */
/* ---- SHOTS: the resolver table. Button (shot | loft | block), the ball's length (yorker | full | good | short), the
 * stick's sector in the batter's frame (degrees: + off side, 0 straight, +-180 behind) -> a shot: contactAt (seconds
 * from the press to the bat meeting the ball), launch angle, speed (u/s), the contact zone (line: units off the middle
 * stump, + off side; z: height) and the natural direction (theta) used when the stick is neutral. ---- */
const SHOTS = {
  straightDrive: { name: 'Straight drive', btn: 'shot', len: ['full', 'yorker'], sec: [-25, 25], at: .13, launch: 3, speed: 440, line: [-6, 8], z: [0, 14], nat: 0, fam: 'drive' },
  coverDrive: { name: 'Cover drive', btn: 'shot', len: ['full', 'yorker'], sec: [25, 75], at: .13, launch: 4, speed: 450, line: [-4, 14], z: [0, 14], nat: 50, fam: 'drive' },
  onDrive: { name: 'On drive', btn: 'shot', len: ['full', 'yorker'], sec: [-75, -25], at: .13, launch: 4, speed: 430, line: [-8, 6], z: [0, 14], nat: -40, fam: 'drive' },
  flick: { name: 'Flick off the pads', btn: 'shot', len: ['full', 'good', 'yorker'], sec: [-130, -75], at: .12, launch: 6, speed: 400, line: [-12, 3], z: [0, 18], nat: -100, fam: 'flick' },
  glance: { name: 'Leg glance', btn: 'shot', len: ['full', 'good', 'yorker'], sec: [-180, -130], at: .11, launch: 3, speed: 330, line: [-12, 1], z: [0, 20], nat: -155, fam: 'flick' },
  punch: { name: 'Back-foot punch', btn: 'shot', len: ['good'], sec: [25, 75], at: .12, launch: 5, speed: 410, line: [-4, 14], z: [4, 24], nat: 45, fam: 'drive', back: true },
  pull: { name: 'Pull', btn: 'shot', len: ['short'], sec: [-130, -60], at: .12, launch: 8, speed: 460, line: [-8, 12], z: [12, 34], nat: -95, fam: 'pull', back: true },
  cut: { name: 'Square cut', btn: 'shot', len: ['short', 'good'], sec: [75, 125], at: .11, launch: 5, speed: 460, line: [4, 22], z: [4, 28], nat: 100, fam: 'cut', back: true },
  lateCut: { name: 'Late cut', btn: 'shot', len: ['yorker', 'full', 'good', 'short'], sec: [125, 180], at: .1, launch: 2, speed: 300, line: [3, 20], z: [2, 24], nat: 150, fam: 'cut', back: true },
  push: { name: 'Push', btn: 'shot', len: ['yorker', 'full', 'good', 'short'], sec: [-180, 180], at: .12, launch: 3, speed: 320, line: [-9, 13], z: [0, 26], nat: 20, fam: 'drive' },
  loftStraight: { name: 'Lofted straight hit', btn: 'loft', len: ['full', 'yorker', 'good'], sec: [-30, 30], at: .14, launch: 38, speed: 330, line: [-7, 9], z: [0, 18], nat: 0, fam: 'loft' },
  loftCover: { name: 'Inside-out over cover', btn: 'loft', len: ['full', 'good'], sec: [30, 80], at: .14, launch: 34, speed: 320, line: [-3, 16], z: [0, 18], nat: 50, fam: 'loft' },
  slog: { name: 'Slog sweep', btn: 'loft', len: ['full', 'good'], sec: [-110, -30], at: .15, launch: 36, speed: 335, line: [-11, 9], z: [0, 22], nat: -65, fam: 'loft' },
  hook: { name: 'Hook', btn: 'loft', len: ['short'], sec: [-140, -60], at: .12, launch: 30, speed: 340, line: [-8, 11], z: [16, 40], nat: -95, fam: 'pull', back: true },
  upperCut: { name: 'Upper cut', btn: 'loft', len: ['short'], sec: [60, 120], at: .11, launch: 34, speed: 310, line: [4, 22], z: [16, 38], nat: 110, fam: 'cut', back: true },
  scoop: { name: 'Scoop over the keeper', btn: 'loft', len: ['yorker', 'full', 'good', 'short'], sec: [150, 180], at: .12, launch: 42, speed: 260, line: [-5, 7], z: [0, 22], nat: 178, fam: 'scoop', both: true },
  helicopter: { name: 'Helicopter', btn: 'loft', len: ['yorker'], sec: [-30, 30], at: .12, launch: 40, speed: 350, line: [-5, 7], z: [0, 8], nat: -5, fam: 'loft' },
  loftAny: { name: 'Slog', btn: 'loft', len: ['yorker', 'full', 'good', 'short'], sec: [-180, 180], at: .14, launch: 32, speed: 320, line: [-8, 12], z: [0, 28], nat: -30, fam: 'loft' },
  forwardDefence: { name: 'Forward defence', btn: 'block', len: ['yorker', 'full', 'good'], sec: [-180, 180], at: .08, launch: 0, speed: 60, line: [-9, 13], z: [0, 22], nat: 5, fam: 'block' },
  backDefence: { name: 'Back defence', btn: 'block', len: ['short'], sec: [-180, 180], at: .08, launch: 0, speed: 50, line: [-9, 13], z: [6, 30], nat: 5, fam: 'block', back: true }
};
const SHOT_ORDER = { shot: ['straightDrive', 'coverDrive', 'onDrive', 'flick', 'glance', 'punch', 'pull', 'cut', 'lateCut', 'push'], loft: ['helicopter', 'loftStraight', 'loftCover', 'slog', 'hook', 'upperCut', 'scoop', 'loftAny'], block: ['forwardDefence', 'backDefence'] };
/** the natural shot for a ball (no stick): by the button, the length and the line (off-positive units at the crease) */
function naturalShot(btn, len, line) {
  if (btn === 'block') return len === 'short' ? 'backDefence' : 'forwardDefence';
  if (btn === 'loft') return len === 'short' ? (line > 8 ? 'upperCut' : 'hook') : len === 'yorker' ? 'helicopter' : line > 6 ? 'loftCover' : line < -3 ? 'slog' : 'loftStraight';
  if (len === 'short') return line > 6 ? 'cut' : 'pull';
  if (len === 'good') return line > 6 ? 'punch' : line < -4 ? 'flick' : 'push';
  return line > 5 ? 'coverDrive' : line < -5 ? 'flick' : line < -2 ? 'onDrive' : 'straightDrive';
}
/** the resolver: the shot for a button, a sector (or null: neutral) and the ball's length and line */
function resolveShot(btn, sector, len, line) {
  if (sector === null || sector === undefined) return naturalShot(btn, len, line);
  for (const id of SHOT_ORDER[btn]) {
    const s = SHOTS[id]; if (!s.len.includes(len)) continue;
    if (sector >= s.sec[0] && sector <= s.sec[1]) return id;
    if (s.both && (sector >= s.sec[0] || sector <= -s.sec[0])) return id;
  }
  return btn === 'loft' ? 'loftAny' : btn === 'block' ? naturalShot(btn, len, line) : 'push';
}
K.SHOTS = SHOTS; K.resolveShot = resolveShot; K.naturalShot = naturalShot;

/* ---- 14-data-specials.js ---- */
/* ---- SPECIALS: each belongs to a character (the striker's for batting, the bowler's for bowling, the fielding side's
 * star for a field special). A player without one uses the generic Kerfuffle Shot / Kerfuffle Ball. Used with the
 * special button when the side's Hype meter is full (The Chirp costs 50). ---- */
const SPECIALS = {
  kettle: { name: 'Tea-Kettle Slog', kind: 'bat', text: 'A guaranteed perfect lofted hit, +25% distance', fx: 'steam' },
  certainty: { name: 'Statistical Certainty', kind: 'bat', text: 'Shows the perfect timing ring: GOOD guaranteed', fx: 'ring' },
  longhandle: { name: 'The Long Handle', kind: 'bat', text: 'A lofted hit with power x1.4', fx: 'fire' },
  croquet: { name: 'The Croquet Drive', kind: 'bat', text: "A ground shot that can't be stopped: FOUR", fx: 'croquet' },
  bludgeon: { name: 'Boardwalk Bludgeon', kind: 'bat', text: 'A huge hit, +40% distance', fx: 'fire' },
  grudgeDrive: { name: 'Grudge Drive', kind: 'bat', text: 'A power drive straight at the bowler', fx: 'grudge' },
  ecto: { name: 'Ectoplasmic Edge', kind: 'bat', text: 'The ball passes through the first fielder', fx: 'ghost' },
  kerfuffleShot: { name: 'Kerfuffle Shot', kind: 'bat', text: 'A guaranteed perfect lofted hit with a fire trail', fx: 'fire' },
  vicar: { name: "Vicar's Revenge", kind: 'bowl', text: 'A 155 km/h inswinging yorker', fx: 'holy', delivery: { base: 'yorker', kmh: 155, swing: -1.2, target: [2, 10] } },
  grandad: { name: 'The Grandad', kind: 'bowl', text: 'Bounces three times and still reaches the stumps', fx: 'dust', delivery: { base: 'legbreak', kmh: 62, target: [0, 150], bounces: 3 } },
  dibbly: { name: 'Dibbly-Dobbly Doom', kind: 'bowl', text: 'An 80 km/h ball that wobbles in the air', fx: 'wobble', delivery: { base: 'knuckle', kmh: 80, wobble: 1.2, target: [0, 70] } },
  swoop: { name: 'The Peregrine Swoop', kind: 'bowl', text: 'Banana swing x3, late', fx: 'feather', delivery: { base: 'outswing', kmh: 130, swing: 3, target: [8, 60] } },
  sunburn: { name: 'Sunburn Bouncer', kind: 'bowl', text: 'A 152 km/h bouncer in a heat haze', fx: 'haze', delivery: { base: 'bouncer', kmh: 152, target: [-2, 160] } },
  vanish: { name: 'Vanishing Ball', kind: 'bowl', text: 'Invisible for a quarter of its flight', fx: 'vanish', delivery: { base: 'legbreak', kmh: 84, target: [-4, 70] } },
  sawn: { name: 'Sawn in Half', kind: 'bowl', text: 'A googly; a bowled wicket splits the stumps', fx: 'saw', delivery: { base: 'googly', kmh: 82, target: [-6, 65] } },
  grudge: { name: 'Grudge Ball', kind: 'bowl', text: 'An LBW-seeking yorker', fx: 'grudge', delivery: { base: 'yorker', kmh: 132, swing: -.6, target: [-2, 8] } },
  triple: { name: 'Triple Threat', kind: 'bowl', text: 'Three balls: two holograms, one real', fx: 'triple', delivery: { base: 'piston', kmh: 150, target: [0, 80] } },
  kerfuffleBall: { name: 'Kerfuffle Ball', kind: 'bowl', text: '+15% pace and double swing', fx: 'fire', delivery: { base: null } },
  chirp: { name: 'The Chirp', kind: 'field', text: "Flusters the batter for one ball (50 Hype)", fx: 'chirp', cost: 50 },
  tray: { name: 'Silver Tray Save', kind: 'field', text: 'The next catch is guaranteed', fx: 'tray' },
  lightning: { name: 'Lightning Stumping', kind: 'field', text: 'Stumping window x3 for the over', fx: 'spark' }
};
K.SPECIALS = SPECIALS;

/* ---- 15-data-arcade.js ---- */
/* ---- ITEMS, TEA TREATS AND CHAOS EVENTS (Kerfuffle rules). Items auto-apply on their next relevant event: the HUD
 * shows a held item as ARMED. Chaos events fire between balls with a per-ground pool and end by themselves. ---- */
const ITEMS = {
  teapot: { name: 'Golden Teapot', side: 'bat', text: 'Next scoring shot: runs x2', color: '#ffd23a' },
  horseshoe: { name: 'Lucky Horseshoe', side: 'bat', text: 'Next dismissal overturned', color: '#c8ccd8' },
  giantbat: { name: 'Giant Bat', side: 'bat', text: 'Bigger bat for 2 balls', color: '#e2c890' },
  cake: { name: 'Cake Slice', side: 'any', text: 'Hype +40', color: '#ff8ad8' },
  sticky: { name: 'Sticky Gloves', side: 'bowl', text: 'Next catch guaranteed', color: '#ffb347' },
  banana: { name: 'Banana Peel', side: 'bowl', text: 'Next run: the batters slip', color: '#ffe060' },
  fog: { name: 'Fog Machine', side: 'bowl', text: 'Next ball: marker hidden', color: '#a8b8c8' }
};
const BAT_ITEMS = ['teapot', 'horseshoe', 'giantbat', 'cake'], BOWL_ITEMS = ['sticky', 'banana', 'fog', 'cake'];
const TEA_TREATS = [
  { id: 'sponge', name: 'Victoria Sponge', text: 'Hype +40' },
  { id: 'tea', name: "Builder's Tea", text: 'Timing windows +10% for 2 overs' },
  { id: 'sandwich', name: 'Cucumber Sandwiches', text: 'Run speed +10% for the innings' }
];
const CHAOS = {
  cow: { name: 'Doris the cow', overs: 2, chance: .3, line: 'cow' },
  bees: { name: 'Bees!', overs: 1, chance: .2, line: 'bees' },
  bells: { name: 'Church bells', overs: 0, chance: .2, line: 'bells' },
  peacocks: { name: 'Peacocks', overs: 2, chance: .3, line: 'peacocks' },
  tray: { name: "Fortescue's tea tray", overs: 0, chance: .25, line: 'tray' },
  gulls: { name: 'Seagulls', overs: 1, chance: .3, line: 'gulls' },
  tide: { name: 'The tide', overs: 99, chance: .5, line: 'tide' },
  rain: { name: 'Rain delay', overs: 0, chance: .25, line: 'rain' },
  dustdevil: { name: 'Dust devil', overs: 1, chance: .25, line: 'dustdevil' },
  rabbits: { name: 'Rabbits', overs: 0, chance: .25, line: 'rabbits' },
  fog: { name: 'Fog bank', overs: 2, chance: .35, line: 'fog' },
  ghosts: { name: 'Ghost fielders', overs: 99, chance: .5, line: 'ghosts' },
  fireworks: { name: 'Fireworks', overs: 0, chance: .3, line: 'fireworks' },
  advert: { name: 'Advert break', overs: 0, chance: .4, line: 'advert' },
  mascot: { name: 'Pitch invader', overs: 1, chance: .12, line: 'mascot' }
};
K.ITEMS = ITEMS; K.TEA_TREATS = TEA_TREATS; K.CHAOS = CHAOS; K.BAT_ITEMS = BAT_ITEMS; K.BOWL_ITEMS = BOWL_ITEMS;

/* ---- 16-data-story.js ---- */
/* ---- THE STORY: The Grand Kerfuffle, 5 chapters. Lord Thrumpton-Vane, given out LBW first ball on this green on
 * 4 June 1975, has bought the deeds to the village green to make a car park; Kerfuffle CC must beat his teams at his
 * grounds. Each chapter is a MatchConfig scenario plus scripted beats (scenes played on bus events) and three
 * Kerfuffle Goals (stars). Scenes are lines [speaker, text] with markup ({w=.4}, {shake}); speakers map to portraits
 * and voices. Dry, affectionate, digressive; no line over 2 x 42 characters. ---- */
const SPEAKERS = {
  aubrey: { name: 'THE ALMANACK', rig: 'aubrey', voice: 'aubrey' }, thrumpton: { name: 'LORD THRUMPTON', rig: 'thrumpton', voice: 'thrumpton' }, edie: { name: 'EDIE', rig: 'edie', voice: 'edie' },
  crumb: { name: 'MRS CRUMB', rig: 'crumb', voice: 'crumb' }, gaz: { name: 'GAZ', rig: 'gaz', voice: 'gaz' }, peregrine: { name: 'PEREGRINE', rig: 'peregrine', voice: 'peregrine' }, fortescue: { name: 'FORTESCUE', rig: 'fortescue', voice: 'fortescue' },
  shazza: { name: 'SHAZZA', rig: 'shazza', voice: 'shazza' }, dev: { name: 'DEV', rig: 'dev', voice: 'dev' }, spinaldo: { name: 'THE GREAT SPINALDO', rig: 'spinaldo', voice: 'spinaldo' }, basil: { name: 'BASIL', rig: 'basil', voice: 'basil' },
  ghost: { name: 'DR GRIMBLE', rig: 'grimble', voice: 'ghost' }, pip: { name: 'PIP', rig: 'pip', voice: 'pip' }, hollis: { name: 'REV. HOLLIS', rig: 'hollis', voice: 'hollis' }, kev: { name: 'KEV', rig: 'kev', voice: 'gaz' }
};
const SCENES = {
  prologue: { place: 'green', time: 'dawn', cast: ['edie', 'crumb', 'thrumpton', 'basil', 'dev', 'pip'], props: ['phantomCar'], lines: [
    ['aubrey', 'Kerfuffle-on-the-Wold. Population: two hundred and twelve, and a cow called Doris.'],
    ['aubrey', 'Nothing of note has happened here since the hailstorm of 1953,{w=.4} which was rained off.'],
    ['thrumpton', 'Fourth of June, 1975. First ball. Given out leg before by a vicar{w=.3} looking at a butterfly.'],
    ['edie', 'That was my grandfather. He still talks about that butterfly.'],
    ['thrumpton', 'I have bought the deeds to this green. On Monday: the Thrumpton Parking Plaza.'],
    ['thrumpton', 'Four hundred spaces.{w=.3} No cricket.'],
    ['crumb', '{shake}Over my dead sponge.{/shake}'],
    ['thrumpton', 'Unless... you beat my teams in the Grand Kerfuffle. Five matches. My grounds. My rules.'],
    ['thrumpton', 'Your umpires.{w=.3} I am not a monster.'],
    ['edie', 'Done. We will play you anywhere.{w=.3} Bring cake.']] },
  c1pre: { place: 'green', cast: ['edie', 'gaz', 'crumb'], lines: [
    ['gaz', 'Oi, Kerfuffle! Fancy a warm-up? By warm-up I mean a thrashing.'],
    ['edie', 'Lower Muddleford. Lovely. Did you bring a cow of your own this year?'],
    ['crumb', 'Nets first, dear. Watch the ball, not the cake.']] },
  c1mid: { place: 'green', cast: ['thrumpton'], lines: [['aubrey', 'Lord Thrumpton watches from his motor car. With the heater on.'], ['thrumpton', 'Hmph. Village cricket. All elbows and optimism.']] },
  c1win: { place: 'green', cast: ['thrumpton', 'edie'], lines: [['thrumpton', 'Beginner\'s luck. Thrumpton Hall next.{w=.3} Dress code: impeccable.'], ['edie', 'We have a blazer. Somewhere. Basil is sitting on it.']] },
  c2pre: { place: 'hall', cast: ['peregrine', 'fortescue', 'edie'], lines: [
    ['aubrey', 'Kerfuffle posted 24 after a top-order collapse, chiefly due to peacocks.'],
    ['peregrine', 'Do mind the peacocks. They bite. Twenty-five to win, I believe? How quaint.'],
    ['fortescue', 'Tea will be served at the fall of the third wicket, or at four,{w=.3} whichever is more dignified.'],
    ['edie', 'Right. We bowl, we field, we keep it under twenty-five. Pip, stop chirping.']] },
  c2mid: { place: 'hall', cast: ['pip', 'crumb'], lines: [['pip', 'Is that... marmalade on the ball? It\'s sticky!'], ['crumb', 'If the umpire gets it wrong, dear, press REVIEW. That is what it is for.']] },
  c2win: { place: 'hall', cast: ['peregrine', 'fortescue'], lines: [['peregrine', 'Well. I shall have Fortescue polish your trophy.{w=.3} With marmalade.'], ['fortescue', 'Sir.']] },
  c3pre: { place: 'bay', cast: ['dev', 'edie', 'shazza', 'basil'], props: ['minibus'], lines: [
    ['aubrey', 'The minibus breaks down three miles from Sunburnt Bay. The team push it.'],
    ['dev', 'Statistically, sunscreen doesn\'t melt at-'],
    ['shazza', 'Mate.'],
    ['shazza', 'Twenty-six to win off two overs. Against me. Good luck, sunshine.']] },
  c3mid: { place: 'bay', cast: ['shazza'], lines: [['aubrey', 'The tide is coming in. The sea-side boundary creeps closer by the over.'], ['shazza', 'Duck the bouncers or hook \'em. Your funeral either way.']] },
  c3win: { place: 'bay', cast: ['shazza', 'edie'], lines: [['shazza', 'Fair dinkum. One thing: Thrumpton\'s been buying ringers.'], ['shazza', 'Weird ones.{w=.4} See-through ones.']] },
  c4pre: { place: 'downs', cast: ['spinaldo', 'basil', 'edie'], lines: [
    ['spinaldo', 'Pick a card. Any card. It will be the card of your downfall.'],
    ['basil', 'I bowled leg-spin to a magician once. He sawed my stumps in half.'],
    ['edie', 'Charge the spinners, everyone. And mind the keeper. He\'s quick.']] },
  c4rain: { place: 'downs', cast: ['crumb', 'dev'], lines: [['aubrey', 'Rain. The covers come on. The tea room fills with steam and gossip.'], ['crumb', 'Now then. Overs lost, wickets down, carry the scone...'], ['dev', 'That is not how arithmetic works.'], ['crumb', 'It is today, dear.']] },
  c4win: { place: 'downs', cast: ['spinaldo', 'edie'], lines: [['spinaldo', 'You see through my tricks. Then see this: the Megadome. Midnight.'], ['spinaldo', 'His Lordship has booked the Eternal XI of 1882.{w=.3} They are dead.{w=.3} Mostly.']] },
  c5pre: { place: 'dome', time: 'night', cast: ['thrumpton', 'ghost', 'edie'], lines: [
    ['thrumpton', 'Welcome to the Megadome. No tea. No cake. No interval. Just ADVERTS.'],
    ['ghost', 'We have waited one hundred and forty-four years for a match that wasn\'t rained off.'],
    ['edie', 'Then let\'s give you one.']] },
  c5mid: { place: 'dome', time: 'night', cast: ['thrumpton'], lines: [['thrumpton', 'Behold the Thrumptonator 3000. Steam-powered. Never misses.'], ['thrumpton', 'Never gives anyone out leg before on a butterfly.']] },
  c5win: { place: 'green', time: 'dusk', cast: ['thrumpton', 'hollis', 'edie', 'ghost', 'crumb'], lines: [
    ['thrumpton', 'One more ball. An exhibition. Me, against the vicar\'s son.{w=.3} No butterflies.'],
    ['aubrey', 'Rev. Hollis bowls a gentle half-volley. It hits the pad. He raises the finger.'],
    ['hollis', 'That\'s out, I\'m afraid. Plumb.'],
    ['thrumpton', '...{w=.6} Ha.{w=.4} HA!{w=.3} Plumb. Absolutely plumb.'],
    ['aubrey', 'Lord Thrumpton laughs for the first time in fifty-one years. He tears up the deeds.'],
    ['ghost', 'Worth the wait. Thank you for the game.'],
    ['crumb', 'Tea, everyone. And you, your Lordship. Sit down before I change my mind.'],
    ['aubrey', 'Lord Thrumpton-Vane now polishes the tea urn on Saturdays,{w=.3} and is adequate at fine leg.']] },
  loss: { place: 'green', cast: ['crumb'], lines: [['crumb', 'Never mind, dear. Even the best of us get a golden duck.'], ['crumb', 'Have a scone and go again.']] }
};
const CHAPTERS = [
  { n: 1, title: 'A Gentle Knock', opp: 'mud', ground: 'green', overs: 2, wickets: 5, kerfuffle: false, battingFirst: 0, pre: 'c1pre', mid: 'c1mid', win: 'c1win', lessons: [1, 2, 3, 4, 6], tutorial: true,
    goals: [['Win the match', (m, r) => r.won], ['Smash the pub window', m => !!m.targetsHit.pub], ['Hit a six', m => m.innings.some(i => i.bat === 'ker' && i.sixes > 0)]] },
  { n: 2, title: 'Tea on the Lawn', opp: 'gen', ground: 'hall', overs: 2, wickets: 5, kerfuffle: true, scenario: { innings: 1, battingFirst: 0, firstRuns: 24, firstWkts: 6 }, pre: 'c2pre', mid: 'c2mid', win: 'c2win', lessons: [7, 8, 9, 10, 11], weather: 'overcast',
    goals: [['Win the match', (m, r) => r.won], ['Take a PERFECT-ring catch', m => !!m.flags.perfectCatch], ['Win a review', m => !!m.flags.wonReview]] },
  { n: 3, title: 'Sand in the Sandwiches', opp: 'lar', ground: 'bay', overs: 2, wickets: 5, kerfuffle: true, scenario: { innings: 1, battingFirst: 1, firstRuns: 25, firstWkts: 3 }, pre: 'c3pre', mid: 'c3mid', win: 'c3win', chaos: ['tide'],
    goals: [['Win the match', (m, r) => r.won], ['Hook a six', m => !!m.flags.hookSix], ['Win with a dive making the crease', m => !!m.flags.diveWin]] },
  { n: 4, title: 'Now You See It', opp: 'mag', ground: 'downs', overs: 2, wickets: 5, kerfuffle: true, battingFirst: 1, pre: 'c4pre', mid: 'c4rain', win: 'c4win', lessons: [5], rain: true,
    goals: [['Win the match', (m, r) => r.won], ['Stump a batter', m => !!m.flags.stumpedOne], ['Hit the hot-air balloon', m => !!m.targetsHit.balloon]] },
  { n: 5, title: 'The Midnight Final', opp: 'thr', ground: 'dome', overs: 3, wickets: 5, kerfuffle: true, battingFirst: 1, pre: 'c5pre', mid: 'c5mid', win: 'c5win', boss: true, time: 'night', weather: 'fog',
    goals: [['Win the match', (m, r) => r.won], ["Survive the Thrumptonator's over without losing a wicket", m => !!m.flags.bossClean], ['Hit the jumbotron', m => !!m.targetsHit.jumbotron]] }
];
const LESSONS = [
  null,
  { n: 1, title: 'Aim and ground shot', text: 'Aim with the stick, WASD or the mouse, then play a ground shot as the ball arrives. Hit 2 good shots.', goal: 'good', count: 2, btn: 'shot' },
  { n: 2, title: 'The lofted shot', text: 'Loft goes in the air: big runs, but a fielder under it can catch it. Loft 2 balls clean.', goal: 'loft', count: 2, btn: 'loft' },
  { n: 3, title: 'Defend and leave', text: 'Defend the straight ones; let the wide ones go by with no button. Survive 3 balls.', goal: 'survive', count: 3, btn: 'block' },
  { n: 4, title: 'Running', text: 'After a shot, RUN calls a run; press it again at the crease for another; BACK sends you home. Score 2 runs.', goal: 'runs', count: 2, btn: 'run' },
  { n: 5, title: 'Charge the spinner', text: 'Against spin, CHARGE down the pitch before the ball lands to make it a half-volley. Miss, and the keeper may stump you. Charge and hit 1.', goal: 'charge', count: 1, btn: 'charge' },
  { n: 6, title: 'Bowling: marker and meter', text: 'Move the marker where the ball should land, pick a delivery, then release in the green of the meter. 2 green releases.', goal: 'green', count: 2, bowl: true },
  { n: 7, title: 'Aftertouch', text: 'Just after release, push the stick sideways to bend the ball in the air. Swing 2 balls.', goal: 'aftertouch', count: 2, bowl: true },
  { n: 8, title: 'Hype and specials', text: 'Good play fills your KERFUFFLE meter. Full, press SPECIAL for a signature delivery or shot. Use one.', goal: 'special', count: 1, bowl: true },
  { n: 9, title: 'The catch ring', text: 'When a catch comes, an outer ring shrinks onto the ball: press CATCH as they meet. Take 1 catch.', goal: 'catch', count: 1, field: true },
  { n: 10, title: 'Throws', text: "With the ball, throw to the keeper's end, the bowler's end, or lob it in. A quick throw is a rocket. Make 2 throws.", goal: 'throw', count: 2, field: true },
  { n: 11, title: 'Reviews', text: 'Think the umpire erred? Press SPECIAL within 4 seconds to REVIEW. Owl-Eye decides. Review 1 decision.', goal: 'review', count: 1, bowl: true }
];
K.SCENES = SCENES; K.CHAPTERS = CHAPTERS; K.LESSONS = LESSONS; K.SPEAKERS = SPEAKERS;

/* ---- 17-data-lines.js ---- */
/* ---- LINES: the commentary box (Sir Aubrey Fennimore-Wolde: plummy, unhurried, given to tangents about cake,
 * pigeons, buses and his late Aunt Hermione; Dazza Keegan: a retired coastal quick, blunt; Prof. Priya Statsworth in
 * reviews), Wisden-style match reports, loading lines and UI copy. Template variables: {batter} {bowler} {fielder}
 * {team} {opp} {ground} {runs} {need} {balls} {target} {kmh} {item} {score} {winner}. No line runs past 2 x 42
 * characters after filling with the longest names. ---- */
const COMMENTATORS = { A: { name: 'SIR AUBREY', color: '#ffd36a', voice: 'aubrey', rig: 'aubrey' }, D: { name: 'DAZZA', color: '#6ae8d8', voice: 'dazza', rig: 'dazza' }, P: { name: 'PROF. PRIYA', color: '#c8a0ff', voice: 'priya', rig: 'priya' } };
const LINES = {
  start: [['A', 'Good afternoon from {ground}, where the tea is stewed.'], ['D', 'Should be a cracker. Or a shambles. Probably both.'], ['A', '{team} to bat, after a fashion. Do settle in. There is cake.'], ['D', "Pitch looks flat, mate. Flat as a pancake someone's sat on."], ['A', 'The players are out, the umpire has found his glasses, and we begin.']],
  dot: [['A', 'Defended. A stroke of great dignity and no ambition whatsoever.'], ['D', 'Nothing doing.'], ['A', 'Left alone. It goes by like a gossip past a closed door.'], ['D', 'Dead bat. Boring, but it works.'], ['A', 'Patted back to the bowler, who receives it like a christening gift.'], ['D', 'Dot ball. Pressure building.']],
  beaten: [['A', "Beaten all ends up! He could not have missed it more with a map."], ['D', 'Played and missed. Dreadful. Lovely ball, mind.'], ['A', 'Past the outside edge. The edge, I gather, was elsewhere.'], ['D', 'Whoosh. Swung at fresh air there.'], ['A', 'Oh, that one talked to the bat and the bat ignored it entirely.']],
  single: [['D', 'Tip and run.'], ['A', 'A quick single, taken with the urgency of a vicar late for a fete.'], ['D', 'Nudged into the gap. One.'], ['A', 'They scamper through for one. Scamper is the word. Not a pretty word.'], ['D', 'Rotating the strike. Smart cricket.']],
  two: [['D', 'Back for two! Good running.'], ['A', 'Two, and the fielder arrives with the air of a man who missed a bus.'], ['D', "They're pushing hard there. Two more."], ['A', 'Comfortably two. Aunt Hermione would have walked them, but still.']],
  three: [['A', 'Three! They run like they have heard the urn has boiled.'], ['D', 'Hard running. Three to the total.'], ['D', 'They turned that into three. Legs like pistons, those two.']],
  four: [['A', 'FOUR! Struck with the elegance of a swan. An angry swan.'], ['D', 'Too short, too wide, too bad. Four.'], ['A', 'That has raced away like a spaniel that has seen a duck.'], ['D', 'Cracking shot. Boundary.'], ['A', 'Four! The fielder gives chase in a spirit of pure optimism.'], ['D', "Bang. Into the fence. Fielder didn't move."]],
  six: [['A', 'That is MAXIMUM! Somebody alert the air-traffic people.'], ['D', "That's gone into the next postcode, mate."], ['A', 'SIX! Up, up, and over the rope with a fond farewell.'], ['D', 'Out of the screws. Huge. HUGE.'], ['A', 'A six of such loft that a passing pigeon filed a complaint.'], ['D', 'Get that one back, someone. Bring a ladder.']],
  target_pub: [['A', 'Through the window of the Leaning Wicket! Last orders, by the ball.']],
  target_greenhouse: [['A', 'Into the vicarage greenhouse. There goes the marrow competition.']],
  target_weathervane: [['A', 'The weathervane! It now points firmly at the boundary. Accurate.']],
  target_hive: [['A', 'Into the beehive! Oh dear. Oh, bees. Oh, a great many bees.']],
  target_fountain: [['A', 'Plop. Into the fountain. A lost ball, a wet cherub, and applause.']],
  target_carwindscreen: [['D', "Straight through Thrumpton's windscreen! He won't like that."]],
  target_hallwindow: [['A', 'Through a window of the Hall itself! Fortescue will fetch the putty.']],
  target_ferris: [['D', 'Hits the Ferris wheel! Kids at the top just caught a cricket ball!']],
  target_icecream: [['D', 'Smashes the ice-cream van! It is raining hundreds and thousands!']],
  target_shark: [['A', 'The inflatable shark is struck amidships. It deflates with dignity.']],
  target_tophat: [['A', 'Into the giant top hat! And out come... doves. Of course they do.']],
  target_watertower: [['D', 'Rings the water tower! Bit of a shower for the cheap seats.']],
  target_balloon: [['A', 'The balloon! Its pilot raises his hat. It was a very good hat.']],
  target_jumbotron: [['D', 'SMASHES THE JUMBOTRON! The advert for car parks just went dark!']],
  target_vip: [['A', 'Into the VIP box. Champagne everywhere. Nobody seems to mind.']],
  target_bell: [['A', 'The ghost bell rings! Somewhere a very old spirit says "jolly good".']],
  target_laser: [['D', 'Knocked out a laser rig. The light show is now a dark show.']],
  bowled: [['A', 'Bowled him! The stumps cartwheel, more than the batsman managed.'], ['D', 'Timber!'], ['A', 'Clean bowled. The off stump is now in the next parish.'], ['D', 'Through the gate. Gone.'], ['A', 'The bails have left, like guests who saw the washing-up.']],
  caught: [['D', 'Up, up... and taken. Safe as houses.'], ['A', 'A catch of quiet magnificence. Someone get that fielder a scone.'], ['D', "Straight down his throat. Thanks for coming."], ['A', 'Held! The fielder clutches it like the last slice of sponge.']],
  screamer: [['A', 'Oh, what a CATCH! Full length! I have dropped my biscuit!'], ['D', 'SCREAMER! Catch of the season, that!']],
  dropped: [['A', 'Dropped! Butter would have had a firmer grip.'], ['D', "Oh, he'll be buying the drinks tonight."], ['A', 'Spilled. The ball went in, considered its options, and left.']],
  lbw: [['A', 'A huge appeal! The Reverend raises... raises... eventually, the finger.'], ['D', 'Plumb. Plumber than a plumber.'], ['A', 'Leg before. The pad was in front and, sadly, so was the batsman.']],
  notout: [['D', 'Not out, says the umpire. Brave call.'], ['A', 'The finger stays down. The bowler looks at the sky for answers.'], ['D', 'Turned down. Bowler not happy.']],
  runout: [['A', 'Yes! No! Wait! Sorry! The four stages of grief, at a sprint.'], ['D', 'Run out by a country mile.'], ['A', 'Direct hit! The stumps explode and the batsman is a yard short of hope.']],
  stumped: [['A', 'Down the pitch, through the gate, bails off before you say Kerfuffle.'], ['D', 'Stumped! Keeper was quicker than a seagull on a chip.']],
  hitwicket: [['A', 'Hit wicket! He has trodden on his own stumps. One does sympathise.'], ['D', 'Knocked his own bails off. Mate.']],
  edge: [['D', 'Edged! Flies away.'], ['A', 'A thick edge. Not elegant. Not a crime, either.']],
  wide: [['D', 'Wide. Wide enough to land a plane.'], ['A', 'A wide. The umpire spreads his arms like a man greeting a cousin.'], ['D', 'Way down the leg side. Wide.'], ['A', 'Wide. It went to visit third man, uninvited.']],
  noball: [['A', "No-ball! He's overstepped, practically a felony here. Free hit to come."], ['D', 'No ball. Free hit coming.'], ['A', 'Over the line! The umpire extends an arm, sorrowfully.'], ['D', 'Front foot no-ball. Sloppy.']],
  beamer: [['A', 'A beamer! Over the top in every sense. The commentators gasp. I gasp.']],
  freehit: [['D', 'Free hit. Only a run out can get him. Swing away, mate.']],
  fire: [['D', 'The bat is literally smoking. Someone fetch a bucket.'], ['A', 'Willow ablaze! Health and Safety will want a word.'], ['D', "He's ON FIRE! Can't stop him!"]],
  fireBowl: [['D', "Bowler's on fire! Ball's burning a groove in the pitch."], ['A', 'The ball is aflame. I am told this is legal. I am not convinced.']],
  special: [['A', "Oh, he's going for something special. I can't look. I'm looking."], ['D', 'Here it comes. The signature move.'], ['A', 'A special! The crowd rises. So does my blood pressure.']],
  review: [['P', 'Owl-Eye has it... pitching in line... and it is hitting.'], ['P', 'Clipping the bails by a whisker of a whisker.'], ['P', 'Let me just... yes. The numbers do not lie. Unlike umpires.']],
  reviewOver: [['P', 'OVERTURNED. The technology giveth. The umpire taketh off his hat.'], ['A', 'Overturned! The Reverend nods graciously. He will pray on it.']],
  reviewStand: [['P', "Decision stands. Umpire's call. Statistically, a coin toss with a hat."], ['D', 'Review wasted. Should have kept it in the pocket.']],
  third: [['A', 'It goes upstairs to the third umpire. He is, I believe, in the attic.'], ['D', 'Tight. Let the TV man sort it out.']],
  rain: [['A', 'And down it comes. Covers on, umbrellas up, the crowd discussing weather.'], ['D', "Rain. Of course it's rain. Tea, anyone?"]],
  method: [['A', "Mrs Crumb's Kerfuffle Method: a revised target, by way of a scone."], ['D', "Don't ask me how she got that. Don't ask her either."]],
  cow: [['A', 'A cow on the outfield. A Friesian. Better placed than their fine leg.'], ['D', 'Doris is back. Someone give her a cap.']],
  cowhit: [['A', "She's taken it on the flank and seems pleased. Doris departs, content."]],
  bees: [['A', 'Bees! A fielder is pursued at speed. Well, at a brisk walk.'], ['D', 'Bees on the field! Run, mate!']],
  bells: [['A', 'The church bells ring. Evensong, or a dot ball. In this village, both.']],
  peacocks: [['A', 'Peacocks crossing. They bite, you know. Peregrine warned us.'], ['D', 'Peacock just deflected that! Fair play, bird.']],
  tray: [['A', 'Fortescue arrives with a tray. Play halts. One does not refuse tea.']],
  gulls: [['D', 'Seagull has nicked the ball! Two byes, and a very smug gull.'], ['A', 'A gull departs with the ball. It will be framed in a nest.']],
  tide: [['D', "Tide's coming in. Boundary's getting shorter on the sea side."], ['A', 'The sea advances. King Canute would have had a word.']],
  dustdevil: [['A', 'A dust devil! It catches the ball and gives it a little twirl.']],
  rabbits: [['A', 'Rabbits from the hat. Three. No, four. The magician bows.']],
  fog: [['A', 'Fog rolls in. I can no longer see the batsman. Or my sandwich.'], ['D', "Can't see a thing out there. Pea soup."]],
  ghosts: [['A', 'The ghost fielders flicker. One just walked through the scorer.'], ['D', 'Ghost just let it through! Not solid, are they?']],
  fireworks: [['D', 'Fireworks! For a six! This place is mental.']],
  advert: [['D', "And now, a word from Thrumpton Parking. Park like a lord. Ugh."]],
  mascot: [['A', 'A pitch invader dressed as a chicken. Pursued by stewards. Marvellous.']],
  item: [['D', 'Picked up a {item}! That could be handy.'], ['A', 'The {item}! Arcade rules, you see. I do not see. But there it is.']],
  maiden: [['A', 'A maiden over. Six balls of nothing, beautifully done.'], ['D', 'Maiden. Bowler on top.']],
  overEnd: [['A', 'End of the over. Time, perhaps, for a biscuit.'], ['D', "That's the over."], ['A', 'Over. The fielders shuffle about like guests at a wedding buffet.']],
  needs: [['D', '{need} needed off {balls}. Game on.'], ['A', 'They require {need} from {balls}. Arithmetic, at its most dramatic.']],
  filler: [['A', 'A Mrs Hepplewhite has sent in a lemon drizzle. You are a saint.'], ['A', 'There is a pigeon at short leg who has been there since Tuesday.'], ['D', 'Lovely day for it.'], ['A', 'Is it? I hadn\'t noticed. I have been looking at this cake.'], ['A', 'A number 37 bus has just gone by. My Aunt Hermione rode it once.'], ['D', 'Got a text from me mum. She says the bowler needs a haircut.'], ['A', 'The scorer has asked me to stop counting the clouds aloud.']],
  win: [['A', 'And that is the match! Victory for {winner}, and for the scone.'], ['D', '{winner} win it! Get in!']],
  loss: [['D', "That's that, then. Shake hands, have a sandwich, try again."]],
  tie: [['A', 'A TIE! Scores level! Nobody knows what to do with their hands!'], ['D', 'Tied! Super Over, baby!']],
  superover: [['A', 'A Super Over. One over each. I may need to lie down.']],
  inningsEnd: [['A', 'That is the innings. Tea, I think. And a target of {target}.'], ['D', '{target} to win. Gettable. Probably.']],
  hype: [['D', 'Crowd are chanting! KER-FUF-FLE!']],
  crowdcatch: [['A', 'Caught in the crowd! A gentleman in a panama, one-handed. Sign him up.'], ['D', 'Crowd catch! Better hands than their fielders, mate.'], ['A', 'Taken by a spectator, who now holds it aloft like the Ashes urn.']],
  net: [['D', 'Into the back net. Nobody hurt.'], ['A', 'The net catches it, as nets do. Quietly, without fuss.'], ['D', 'Thwack into the netting.']],
  overthrow: [['A', 'Overthrows! The ball runs on, chased by a fielder and his embarrassment.']],
  mixup: [['A', 'A mix-up! Both batsmen at one end, like two men after one taxi.']],
  dive: [['D', 'Dives for the crease! Full stretch!']],
  directhit: [['D', 'Direct hit! What an arm!']],
  machine: [['A', 'The Thrumptonator hisses. It is either about to bowl or about to explode.']],
  pick: [['A', 'Pick a card, says the magician. I picked a scone. He was cross.']]
};
/** the Wisden-style match report (results screen): pick by the shape of the result, fill from the ball records */
const REPORTS = {
  win: ['{winner}, set {target}, were indebted to {topBat} ({topRuns}{notOut}, {sixes}{targetLine}). Play was held up while {chaosThing} was persuaded off the square.',
    '{loser} never recovered from {collapse}. {topBowl} took {wkts} for {bruns} with a mixture of guile, swing and, in one instance, marmalade.',
    '{winner} won by {margin}. {topBat} made {topRuns}{notOut}; the tea was described by the scorer as "adequate, with notes of urn".'],
  tie: ['A tie, decided by a Super Over of almost unbearable tension, at the end of which {hero} was carried from the field on the shoulders of the scorer.'],
  rain: ['Rain intervened, Mrs Crumb produced the Kerfuffle Method on a chalkboard, and {winner} prevailed by {margin}, which nobody disputed, out of fear.']
};
const LOADING = ['Rolling the pitch', 'Whitening the creases', 'Brewing the tea', 'Polishing the ball on a trouser leg', "Counting the crowd's umbrellas", 'Persuading Doris off the square', 'Winding the pavilion clock', 'Finding the umpire\'s glasses'];
K.LINES = LINES; K.REPORTS = REPORTS; K.COMMENTATORS = COMMENTATORS; K.LOADING = LOADING;

/* ---- 18-data-music.js ---- */
/* ---- MUSIC: original songs in the engine's step notation ({ bpm, steps, tracks: [{ wave, vol, notes, name, on }] };
 * a note, '-' holds, '.' rests, '|' is ignored; drums k s h o c t). Each match song has named layers for dynamic
 * intensity: base, drums (in when the Hype meter passes 50) and fire (in when ON FIRE). Stings play over the music. ---- */
const SONGS = {
  // "The Kerfuffle March": a jaunty brass-band march in B flat, a cheeky chromatic run every fourth bar
  title: { bpm: 120, steps: 4, tracks: [
    { name: 'base', wave: 'square', vol: .1, notes: 'F4 . Bb4 . D5 . Bb4 . F5 - - . D5 . Bb4 . | C5 . Eb5 . G5 . Eb5 . F5 - - . . . . . | D5 . F5 . Bb5 . F5 . G5 . F5 . Eb5 . D5 . | C5 . D5 . Eb5 . E5 . F5 - - - . . . . | Bb5 . A5 . G5 . F5 . Eb5 . D5 . C5 . Bb4 . | A4 . C5 . F5 . A5 . G5 - F5 . Eb5 - D5 . | Eb5 . D5 . C5 . Bb4 . A4 . Bb4 . C5 . D5 . | Bb4 - - - F4 . Bb4 . Bb4 - - - . . . .' },
    { name: 'tuba', wave: 'triangle', vol: .32, notes: 'Bb2 . . . F2 . . . Bb2 . . . F2 . . . | Eb2 . . . Bb2 . . . F2 . . . C3 . . . | Bb2 . . . F2 . . . G2 . . . D2 . . . | F2 . . . C3 . . . F2 . . . A2 . . . | G2 . . . D3 . . . Eb2 . . . Bb2 . . . | F2 . . . C3 . . . F2 . . . A2 . . . | Eb2 . . . G2 . . . F2 . . . F2 . . . | Bb2 . . . F2 . . . Bb2 . . . . . . .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h . k . h . s . s s | k . h . s . h . k . k . s . h h' }] },
  attract: { bpm: 138, steps: 4, tracks: [
    { name: 'base', wave: 'pulse', vol: .09, notes: 'F5 . D5 . Bb4 . D5 . F5 . Bb5 . A5 . G5 . | Eb5 . G5 . C5 . Eb5 . F5 - - . . . . . | D5 . F5 . Bb5 . D6 . C6 . Bb5 . A5 . G5 . | F5 . G5 . A5 . Bb5 . C6 - - - . . . .' },
    { name: 'tuba', wave: 'triangle', vol: .3, notes: 'Bb2 . F2 . Bb2 . F2 . Bb2 . F2 . Bb2 . F2 . | Eb2 . Bb2 . Eb2 . Bb2 . F2 . C3 . F2 . C3 . | Bb2 . F2 . Bb2 . F2 . G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . F2 . A2 . F2 . E2 .' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h k s . h . k k h . s . h h' },
    { name: 'fire', wave: 'saw', vol: .035, on: false, notes: 'Bb5 D6 F6 D6 Bb5 D6 F6 Bb6 Bb5 D6 F6 D6 Bb5 D6 F6 Bb6 | Eb6 G6 Bb6 G6 Eb6 G6 Bb6 G6 F6 A6 C7 A6 F6 A6 C7 A6 | Bb5 D6 F6 D6 Bb5 D6 F6 D6 G5 Bb5 D6 Bb5 G5 Bb5 D6 Bb5 | F5 A5 C6 A5 F5 A5 C6 F6 A5 C6 F6 C6 A5 C6 F6 A6' }] },
  // the minibus travels: a bouncy 6/8
  map: { bpm: 112, steps: 3, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'G4 . B4 D5 . B4 | C5 . E5 G5 - . | D5 . C5 B4 . A4 | G4 - - . . . | E5 . D5 C5 . B4 | A4 . C5 E5 - . | D5 . F#5 A5 . F#5 | G5 - - . . .' },
    { name: 'tuba', wave: 'triangle', vol: .3, notes: 'G2 . . D3 . . | C3 . . G2 . . | D3 . . D2 . . | G2 . . D3 . . | C3 . . G2 . . | A2 . . E2 . . | D3 . . A2 . . | G2 . . D2 . .' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h s . h | k . h s h h' }] },
  // pastoral summer afternoon, a cuckoo-like two-note motif
  green: { bpm: 96, steps: 4, tracks: [
    { name: 'base', wave: 'pulse12', vol: .07, notes: 'G5 - E5 - . . . . G5 - E5 - . . D5 . | C5 . D5 . E5 - - . G4 . A4 . C5 - - . | F5 - D5 - . . . . F5 - D5 - . . C5 . | B4 . C5 . D5 - - . G4 - - - . . . .' },
    { name: 'tuba', wave: 'triangle', vol: .26, notes: 'C3 . . . G2 . . . C3 . . . G2 . . . | A2 . . . E2 . . . F2 . . . C3 . . . | D3 . . . A2 . . . G2 . . . D3 . . . | G2 . . . D2 . . . G2 . . . B2 . . .' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . . . h . . . s . . . h . . . | k . . . h . h . s . . . h . h .' },
    { name: 'fire', wave: 'saw', vol: .05, on: false, notes: 'C6 . G5 . E5 . G5 . C6 . G5 . E5 . G5 . | F6 . C6 . A5 . C6 . G6 . D6 . B5 . D6 .' }] },
  // a stately minuet: a harpsichord-like square arpeggio in 3/4
  hall: { bpm: 108, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .07, notes: 'D5 . F#5 . A5 . | G5 . B5 . D6 . | F#5 . E5 . D5 . | E5 - - - . . | B4 . D5 . G5 . | A4 . C#5 . E5 . | D5 . A4 . F#4 . | D4 - - - . .' },
    { name: 'tuba', wave: 'triangle', vol: .24, notes: 'D3 . . . A2 . | G2 . . . D3 . | A2 . . . A2 . | A2 . . . E2 . | G2 . . . D3 . | A2 . . . E2 . | D3 . . . A2 . | D2 . . . . .' },
    { name: 'drums', wave: 'drums', vol: .06, on: false, notes: 'k . h . h . | k . h . s .' },
    { name: 'fire', wave: 'pulse', vol: .05, on: false, notes: 'A5 D6 F#6 A6 F#6 D6 | B5 D6 G6 B6 G6 D6' }] },
  // surf rock: a twangy saw with vibrato and driving drums
  bay: { bpm: 150, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .06, notes: 'E4 . E4 G4 . E4 A4 . G4 . E4 . D4 . E4 . | E4 . E4 G4 . E4 B4 . A4 . G4 . A4 - - . | C5 . C5 B4 . A4 G4 . A4 . G4 . E4 . D4 . | E4 - - . . . . . E4 . G4 . B4 . E5 .' },
    { name: 'tuba', wave: 'triangle', vol: .3, notes: 'E2 . E2 . E2 . E2 . E2 . E2 . D2 . D2 . | E2 . E2 . E2 . E2 . A2 . A2 . G2 . G2 . | C3 . C3 . C3 . C3 . D3 . D3 . B2 . B2 . | E2 . E2 . E2 . E2 . E2 . B2 . E2 . B2 .' },
    { name: 'drums', wave: 'drums', vol: .1, on: false, notes: 'k . h . s . h k k . h . s . h h' },
    { name: 'fire', wave: 'square', vol: .05, on: false, notes: 'B5 . E6 . B5 . G5 . A5 . E6 . B5 . G5 .' }] },
  // the conjurer's mystery waltz: minor key, tremolo
  downs: { bpm: 126, steps: 2, tracks: [
    { name: 'base', wave: 'pulse', vol: .07, notes: 'A4 . C5 . E5 . | F5 - - E5 . . | D5 . F5 . A5 . | G#5 - - - . . | A5 . E5 . C5 . | D5 . B4 . G#4 . | A4 . E4 . C5 . | B4 - - - . .' },
    { name: 'tuba', wave: 'triangle', vol: .26, notes: 'A2 . . E3 . . | F2 . . C3 . . | D3 . . A2 . . | E2 . . B2 . . | A2 . . E3 . . | D3 . . E2 . . | A2 . . C3 . . | E2 . . E3 . .' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . h . h . | k . h . s .' },
    { name: 'fire', wave: 'saw', vol: .04, on: false, notes: 'A5 C6 E6 A6 E6 C6 | G#5 B5 E6 G#6 E6 B5' }] },
  // a stadium rock anthem with a chant-able hook (and a spooky organ layer for the ghosts)
  dome: { bpm: 128, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .06, notes: 'E5 . E5 . G5 . E5 . D5 - - . B4 . . . | C5 . C5 . E5 . C5 . B4 - - . . . . . | A4 . C5 . E5 . A5 . G5 . E5 . D5 . C5 . | B4 . . . E5 - - - . . . . . . . .' },
    { name: 'tuba', wave: 'square', vol: .1, notes: 'E2 E2 . E2 E2 . E2 . G2 G2 . G2 D2 . D2 . | C2 C2 . C2 C2 . C2 . B1 B1 . B1 B1 . B1 . | A1 A1 . A1 C2 . C2 . D2 D2 . D2 D2 . D2 . | E2 E2 . E2 E2 . E2 . E2 . E2 . B1 . B1 .' },
    { name: 'drums', wave: 'drums', vol: .12, on: false, notes: 'k . h . s . h . k k h . s . h . | k . h . s . h . k . h k s s s s' },
    { name: 'fire', wave: 'triangle', vol: .12, on: false, notes: 'E4 - - - G4 - - - B4 - - - D5 - - - | C4 - - - E4 - - - G4 - - - B4 - - -' }] },
  // a gentle waltz for tea intervals, story scenes and the nets (where its brushed drums and a music-box
  // countermelody are the Hype and ON FIRE layers)
  tea: { bpm: 96, steps: 2, tracks: [
    { name: 'base', wave: 'pulse12', vol: .06, notes: 'C5 - - E5 G5 . | F5 - - E5 D5 . | E5 - - G5 C6 . | B5 - - - . . | A5 - - G5 F5 . | E5 - - D5 C5 . | D5 - - E5 F5 . | E5 - - - . .' },
    { name: 'tuba', wave: 'triangle', vol: .22, notes: 'C3 . . G3 . . | D3 . . G3 . . | C3 . . G3 . . | G2 . . D3 . . | F2 . . C3 . . | C3 . . G2 . . | G2 . . D3 . . | C3 . . G2 . .' },
    { name: 'drums', wave: 'drums', vol: .06, on: false, notes: 'k . h . h . | k . h . s .' },
    { name: 'fire', wave: 'pulse', vol: .035, on: false, notes: 'C6 E6 G6 E6 C6 G5 | B5 D6 F6 D6 B5 G5 | C6 E6 G6 E6 C6 G5 | B5 D6 G6 D6 B5 G5 | A5 C6 F6 C6 A5 F5 | G5 C6 E6 C6 G5 E5 | B5 D6 F6 D6 B5 G5 | C6 E6 G6 C7 G6 E6' }] },
  // a tense countdown loop
  showdown: { bpm: 140, steps: 4, tracks: [
    { name: 'base', wave: 'square', vol: .07, notes: 'D4 . . D4 . . F4 . D4 . . D4 . . G4 . | D4 . . D4 . . F4 . E4 . . C4 . . A3 .' },
    { name: 'tuba', wave: 'triangle', vol: .3, notes: 'D2 . D2 . D2 . D2 . D2 . D2 . C2 . C2 . | Bb1 . Bb1 . Bb1 . Bb1 . A1 . A1 . A1 . A1 .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . . h k . s . k . . h k . s s' },
    { name: 'fire', wave: 'saw', vol: .04, on: false, notes: 'A5 . A5 . A5 . A5 . Bb5 . Bb5 . A5 . A5 .' }] }
};
const STINGS = {
  four: { bpm: 180, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: 'C5 E5 G5 C6 - - - .' }, { wave: 'drums', vol: .12, notes: 'k . s . c . . .' }] },
  six: { bpm: 170, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .11, notes: 'G4 C5 E5 G5 C6 E6 G6 - - - - .' }, { wave: 'triangle', vol: .3, notes: 'C3 . . . G2 . . . C3 - - .' }, { wave: 'drums', vol: .14, notes: 'k k s s k k s s c . . .' }] },
  wicket: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .08, notes: 'E5 D5 C5 B4 A4 - - - E4 - - .' }, { wave: 'drums', vol: .14, notes: 'k . . . s . . . c . . .' }] },
  over: { bpm: 160, steps: 4, loop: false, tracks: [{ wave: 'pulse', vol: .08, notes: 'G5 . E5 . C5 - - .' }] },
  hype: { bpm: 170, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: 'C5 D5 E5 F5 G5 A5 B5 C6 - - - .' }] },
  fire: { bpm: 180, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .09, notes: 'A4 C5 E5 A5 C6 E6 A6 - - - . .' }, { wave: 'drums', vol: .12, notes: 'k s k s k s c . . . . .' }] },
  special: { bpm: 160, steps: 4, loop: false, tracks: [{ wave: 'pulse', vol: .1, notes: 'C5 G5 C6 G5 E6 - - - . . . .' }] },
  win: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: 'Bb4 . Bb4 . Bb4 . D5 - F5 - - . D5 . F5 . Bb5 - - - - - - .' }, { wave: 'triangle', vol: .3, notes: 'Bb2 . . . F2 . . . Bb2 . . . F2 . . . Bb2 - - - - - - .' }, { wave: 'drums', vol: .12, notes: 'k . s . k . s . k . s . k k s s c . . . . . . .' }] },
  lose: { bpm: 90, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .08, notes: 'G4 - - . F#4 - - . F4 - - . E4 - - - - - - - . . . .' }] },
  toss: { bpm: 200, steps: 4, loop: false, tracks: [{ wave: 'pulse12', vol: .08, notes: 'C6 E6 G6 C7 . . . .' }] },
  chapter: { bpm: 130, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .09, notes: 'F4 Bb4 D5 F5 - - Eb5 D5 C5 - Bb4 - - - . .' }, { wave: 'triangle', vol: .28, notes: 'Bb2 - - - Eb2 - - - F2 - - - Bb2 - - .' }] }
};
K.SONGS = SONGS; K.STINGS = STINGS;

/* ---- 20-ball.js ---- */
/* ---- BALL PHYSICS AND THE PREDICTOR. One step function (1/120 s) serves the simulation and the predictor, and draws
 * no random numbers (the seam deviation is drawn once at release and kept on the ball), so a prediction equals what
 * then happens exactly. The AI, LBW, catches, fielder interception and the Owl-Eye tube all read it. ----
 * Ball: { x, y, z, vx, vy, vz, phase: 'held' | 'delivery' | 'hit' | 'dead', pitched, pitchAt, bounces, carried (hit and
 * not yet bounced), rolling, age, swingA (u/s², + toward +x), wobble, turn (radians at the pitch, + toward +x),
 * extraTurn (each later bounce), seamDev, bounceK, grip, maxBounces } */
const Ball = {
  make() { return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, phase: 'held', pitched: false, pitchAt: null, bounces: 0, carried: false, rolling: false, age: 0, swingA: 0, wobble: 0, wobblePh: 0, turn: 0, extraTurn: 0, seamDev: 0, bounceK: 1, grip: .08, fx: null, hitAt: null, groundAt: null }; },
  copy(b) { const c = Object.assign({}, b); c.pitchAt = b.pitchAt && b.pitchAt.slice(); return c; },
  /** env: { g, pitchBounce, gb (the ground's pitch bounce), k (rolling decay), slope } */
  step(b, dt, env) {
    if (b.phase === 'held' || b.phase === 'dead') return;
    b.age += dt;
    b.vz -= env.g * dt;
    if (b.phase === 'delivery' && !b.pitched) {
      b.vx += b.swingA * Math.min(1, b.age / .35) * dt;
      if (b.wobble) b.vx += Math.sin(b.age * 21 + b.wobblePh) * b.wobble * 95 * dt;
    }
    const drag = 1 - .02 * dt; b.vx *= drag; b.vy *= drag;
    const px0 = b.x, py0 = b.y, pz0 = b.z;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.z <= 0) {
      const fz = pz0 > 0 ? pz0 / (pz0 - b.z) : 1;   // where it really met the ground, between the steps
      b.z = 0;
      const onPitch = Math.abs(b.x) <= G.PITCH_HALF + 6 && b.y > -30 && b.y < 345;
      if (b.phase === 'delivery') {
        if (!b.pitched) {
          b.vz = -b.vz * env.pitchBounce * env.gb * b.bounceK;
          const k = .86 - b.grip, a = b.turn + b.seamDev, c = Math.cos(a), s = Math.sin(a), vx = b.vx * k, vy = b.vy * k;
          b.vx = vx * c - vy * s; b.vy = vx * s + vy * c;
          b.pitched = true; b.pitchAt = [px0 + (b.x - px0) * fz, py0 + (b.y - py0) * fz]; b.bounces = 1;
          if (!onPitch) b.offPitch = true;
        } else {
          b.bounces++;
          if (b.extraTurn) { const c = Math.cos(b.extraTurn), s = Math.sin(b.extraTurn), vx = b.vx, vy = b.vy; b.vx = vx * c - vy * s; b.vy = vx * s + vy * c; }
          if (b.vz < -22) { b.vz = -b.vz * (b.multiBounce ? .62 : .45); b.vx *= .9; b.vy *= .9; } else { b.vz = 0; b.rolling = true; }
        }
      } else {
        if (b.vz < -25) { b.vz = -b.vz * .42; b.vx *= .85; b.vy *= .85; if (b.carried) b.groundAt = b.age; b.carried = false; b.bounces++; }
        else { b.vz = 0; if (b.carried) b.groundAt = b.age; b.rolling = true; b.carried = false; }
      }
    }
    if (b.rolling && b.z <= 0) {
      let k = env.k; if (env.slope && b.vx > 0) k *= 1 - env.slope;
      const f = Math.exp(-k * dt); b.vx *= f; b.vy *= f;
      if (hyp(b.vx, b.vy) < 4) { b.vx = 0; b.vy = 0; }
    }
  },
  /** run the same step on a copy for `seconds`; every `every` steps a sample { t, x, y, z, carried, rolling, pitched } */
  predict(b, seconds, env, every = 1, stop) {
    const c = Ball.copy(b), out = [], n = Math.ceil(seconds / G.STEP);
    for (let i = 1; i <= n; i++) {
      Ball.step(c, G.STEP, env);
      if (i % every === 0) out.push({ t: i * G.STEP, x: c.x, y: c.y, z: c.z, carried: c.carried, rolling: c.rolling, pitched: c.pitched, vx: c.vx, vy: c.vy, vz: c.vz });
      if (stop && stop(c, i * G.STEP)) break;
      if (c.rolling && c.vx === 0 && c.vy === 0) break;
    }
    return out;
  },
  /** time until the ball's y first goes at or below yPlane (a delivery reaching the batter), with the ball there, or null */
  arrive(b, yPlane, env, max = 3) {
    if (b.y <= yPlane) return null;
    const c = Ball.copy(b), n = Math.ceil(max / G.STEP);
    for (let i = 1; i <= n; i++) {
      const py = c.y, px0 = c.x, pz = c.z; Ball.step(c, G.STEP, env);
      if (c.y <= yPlane) { const f = (py - yPlane) / Math.max(1e-6, py - c.y); return { t: (i - 1 + f) * G.STEP, x: lerp(px0, c.x, f), z: lerp(pz, c.z, f), pitched: c.pitched, pitchAt: c.pitchAt }; }
    }
    return null;
  },
  /** a delivery's initial velocity from the release point to land on the pitch target (tx, ty) at ground speed v,
   *  without swing; iterated on the real step so it lands within a unit */
  solve(rel, tx, ty, v, env, bounceK = 1) {
    let ax = tx, ay = ty, sol = null;
    for (let it = 0; it < 4; it++) {
      const dx = ax - rel.x, dy = ay - rel.y, D = hyp(dx, dy) || 1, t = D / v, vz = (.5 * env.g * t * t - rel.z) / t;
      sol = { vx: dx / D * v, vy: dy / D * v, vz };
      const b = Object.assign(Ball.make(), rel, sol, { phase: 'delivery', bounceK });
      let land = null;
      for (let i = 0; i < 600 && !land; i++) { Ball.step(b, G.STEP, env); if (b.pitched) land = b.pitchAt; }
      if (!land) break;
      ax += tx - land[0]; ay += ty - land[1];
      if (hyp(tx - land[0], ty - land[1]) < .2) break;
    }
    return sol;
  }
};
K.Ball = Ball;

/* ---- 21-rules.js ---- */
/* ---- MATCH RULES AND SCORING (the arcade cut of the laws). applyBall(inn, rec) is a pure update of an innings from one
 * ball's record; every record is kept for the scorecard, the highlights and the Wisden-style report. ----
 * An over is 6 legal balls; wides and no-balls add 1 run and are re-bowled; a FREE HIT follows a no-ball (only run out
 * dismisses); the strike changes on odd runs run and at each over's end; an innings ends at its overs, its wickets or
 * (second innings) when the target is passed. A tie goes to a Super Over (1 over, 2 wickets each; boundaries break a
 * second tie). The Kerfuffle Method revises a rain-cut target from resources R(o, w) = (o / O)(1 - .07 w): the chasing
 * side's share is 1 - R(before) + R(after) of the first innings' runs. */
const Rules = {
  newInnings(batTeam, bowlTeam, o) {
    return { bat: batTeam, bowl: bowlTeam, runs: 0, wkts: 0, balls: 0, overs: o.overs, wicketsMax: o.wickets, target: o.target || null, extras: { wd: 0, nb: 0, b: 0, lb: 0 }, bonus: 0,
      cards: {}, bowlCards: {}, recs: [], striker: null, nonStriker: null, order: o.order.slice(), next: 2, freeHit: false, over: [], fours: 0, sixes: 0, partnership: 0, done: false, end: null, superOver: !!o.superOver };
  },
  card(inn, id) { return inn.cards[id] || (inn.cards[id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: null }); },
  bcard(inn, id) { return inn.bowlCards[id] || (inn.bowlCards[id] = { balls: 0, runs: 0, wkts: 0, maidens: 0, overRuns: 0 }); },
  /** rec: { bowler, striker, nonStriker, runs (by the bat, a boundary's 4 or 6 included), ran (runs run), boundary,
   *  extras { wd, nb, b, lb }, wicket: null | { how, batter, fielder }, bonus, double (Golden Teapot) } */
  applyBall(inn, rec) {
    const ex = Object.assign({ wd: 0, nb: 0, b: 0, lb: 0 }, rec.extras || {});
    const legal = !ex.wd && !ex.nb;
    let batRuns = rec.runs || 0;
    if (rec.double && batRuns > 0) { rec.doubled = batRuns; batRuns *= 2; }
    const extraRuns = ex.wd + ex.nb + ex.b + ex.lb, bonus = rec.bonus || 0, total = batRuns + extraRuns + bonus;
    inn.runs += total; inn.bonus += bonus; inn.partnership += total;
    for (const k in ex) inn.extras[k] += ex[k];
    const sc = Rules.card(inn, rec.striker), bc = Rules.bcard(inn, rec.bowler);
    if (!ex.wd) sc.balls++;
    sc.runs += batRuns;
    if (rec.boundary === 4) { sc.fours++; inn.fours++; } if (rec.boundary === 6) { sc.sixes++; inn.sixes++; }
    bc.runs += batRuns + ex.wd + ex.nb; bc.overRuns += batRuns + ex.wd + ex.nb;
    if (legal) { bc.balls++; inn.balls++; }
    rec.legal = legal; rec.total = total; rec.freeHit = inn.freeHit;
    let wicket = rec.wicket;
    if (wicket && inn.freeHit && wicket.how !== 'run out') { rec.freeHitSaved = wicket.how; wicket = rec.wicket = null; }
    if (wicket) {
      inn.wkts++; inn.partnership = 0;
      Rules.card(inn, wicket.batter).out = wicket.how + (wicket.fielder ? ' (' + wicket.fielder + ')' : '');
      if (wicket.how !== 'run out' && wicket.how !== 'retired') bc.wkts++;
    }
    inn.freeHit = !!ex.nb;
    inn.over.push(rec.wicket ? 'W' : ex.wd ? 'wd' : ex.nb ? 'nb' : rec.boundary ? String(rec.boundary) : String(batRuns + ex.b + ex.lb || '•'));
    inn.recs.push(rec);
    // the ends: odd runs run swap them; a wicket's new batter takes the end the dismissed batter was at (or making for)
    let s = inn.striker, n = inn.nonStriker;
    if ((rec.ran || 0) % 2 === 1) { const t = s; s = n; n = t; }
    if (rec.wicket) {
      const out = rec.wicket.batter, survivor = out === rec.striker ? rec.nonStriker : rec.striker;
      const outEnd = rec.wicket.end || (s === out ? 'striker' : 'bowler');
      const nb = inn.wkts < inn.wicketsMax && inn.next < inn.order.length ? inn.order[inn.next++] : null;
      if (outEnd === 'striker') { s = nb; n = survivor; } else { n = nb; s = survivor; }
      rec.newBatter = nb;
    }
    inn.striker = s; inn.nonStriker = n;
    if (s) Rules.card(inn, s); if (n) Rules.card(inn, n);
    // over end: a maiden, the strike swaps
    rec.overEnd = false;
    if (legal && inn.balls % 6 === 0 && inn.balls > 0) {
      if (bc.overRuns === 0) { bc.maidens++; rec.maiden = true; }
      bc.overRuns = 0; rec.overEnd = true; inn.lastOver = inn.over; inn.over = [];
      const t = inn.striker; inn.striker = inn.nonStriker; inn.nonStriker = t;
    }
    // innings end
    if (inn.target !== null && inn.runs >= inn.target) { inn.done = true; inn.end = 'target'; }
    else if (inn.wkts >= inn.wicketsMax || !inn.striker || !inn.nonStriker) { inn.done = true; inn.end = 'allout'; }
    else if (inn.balls >= inn.overs * 6) { inn.done = true; inn.end = 'overs'; }
    return rec;
  },
  oversText(balls) { return Math.floor(balls / 6) + '.' + (balls % 6); },
  /** the result of a two-innings match: { winner (team id) | null, text, tie } */
  result(i1, i2, names) {
    // a revised target (the Kerfuffle Method) decides the match: the par score is the target less one
    const par = i2.target !== null && i2.target !== undefined ? i2.target - 1 : i1.runs;
    if (i2.runs > par) { const w = i2.wicketsMax - i2.wkts, left = i2.overs * 6 - i2.balls; return { winner: i2.bat, loser: i1.bat, text: names[i2.bat] + ' won by ' + w + ' wicket' + (w === 1 ? '' : 's') + (left > 0 ? ' (' + left + ' ball' + (left === 1 ? '' : 's') + ' to spare)' : ''), margin: { wkts: w, balls: left } }; }
    if (par > i2.runs) { const r = par - i2.runs; return { winner: i1.bat, loser: i2.bat, text: names[i1.bat] + ' won by ' + r + ' run' + (r === 1 ? '' : 's') + (i2.revised ? ' (Kerfuffle Method)' : ''), margin: { runs: r } }; }
    return { winner: null, tie: true, text: 'Match tied' };
  },
  /** a Super Over's result after two one-over innings: more runs, then more boundaries */
  superResult(s1, s2, names) {
    if (s1.runs !== s2.runs) { const w = s1.runs > s2.runs ? s1 : s2, l = w === s1 ? s2 : s1; return { winner: w.bat, loser: l.bat, text: names[w.bat] + ' won the Super Over', superOver: true }; }
    const b1 = s1.fours + s1.sixes, b2 = s2.fours + s2.sixes;
    if (b1 !== b2) { const w = b1 > b2 ? s1 : s2, l = w === s1 ? s2 : s1; return { winner: w.bat, loser: l.bat, text: names[w.bat] + ' won the Super Over on boundaries', superOver: true }; }
    return { winner: s2.bat, loser: s1.bat, text: names[s2.bat] + ' won the Super Over (chasing side, by the Kerfuffle convention)', superOver: true };
  },
  /** the Kerfuffle Method: a revised target when rain cuts the second innings from O to O2 overs at w wickets with o overs left before */
  kerfuffleMethod(firstRuns, O, oLeftBefore, oLeftAfter, w, current) {
    const R = o => (o / O) * (1 - .07 * w), res = 1 - R(oLeftBefore) + R(oLeftAfter);
    return { target: Math.max(current + 1, Math.floor(firstRuns * res) + 1), res, rb: R(oLeftBefore), ra: R(oLeftAfter) };
  }
};
K.Rules = Rules;

/* ---- 22-match.js ---- */
/* ---- THE MATCH: one object holds a whole match's simulation (pure: fixed steps, seeded randomness, no drawing or
 * sound; presentation reads its state and listens on the bus). The delivery director runs each ball as a state
 * machine with explicit exits and a timeout on every state, so play can never stall:
 *   intro -> setup -> runup -> flight -> inPlay -> dead -> between -> (pickBowler | inningsBreak | done) -> setup
 * MatchConfig: { mode: 'story'|'quick'|'showdown'|'nets'|'attract'|'hub'|'versus', teams: [a, b], ground, overs, wickets,
 *   difficulty, kerfuffleRules, timeOfDay, weather, battingFirst (0|1), scenario, humans: { 0: [inputs], 1: [inputs] },
 *   seed, superOver, reviewsPerInnings, fielding: 'assisted'|'manual'|'auto', running: 'manual'|'auto', cheat: {} } */
const PHASE_CAP = { intro: 6, setup: 40, runup: 4, flight: 4, inPlay: 15, dead: 14, between: 6, pickBowler: 15, inningsBreak: 30, rainDelay: 30 };
class Match {
  constructor(cfg) {
    this.cfg = cfg = Object.assign({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', overs: 2, wickets: 5, difficulty: 'county', kerfuffleRules: true, timeOfDay: null, weather: null,
      battingFirst: 0, scenario: null, humans: {}, seed: 1, superOver: true, reviewsPerInnings: 1, fielding: 'assisted', running: 'manual', cheat: {}, maxOversPerBowler: 'auto', commentary: true }, cfg);
    this.ground = GROUNDS[cfg.ground] || GROUNDS.green;
    this.timeOfDay = cfg.timeOfDay || this.ground.time; this.weather = cfg.weather || this.ground.weather;
    this.teams = cfg.teams.map(id => TEAMS[id]);
    this.names = {}; for (const t of this.teams) this.names[t.id] = t.name;
    RNG.seed(cfg.seed);
    this.time = 0; this.phase = 'intro'; this.pt = 0; this.innings = []; this.innNo = -1; this.result = null; this.events = [];
    this.ball = Ball.make(); this.hype = [0, 0]; this.fire = { bat: 0, bowl: 0, batStreak: 0, bowlStreak: 0, batBalls: 0, bowlBalls: 0 };
    this.items = [[], []]; this.tokens = []; this.targetsHit = {}; this.chaos = []; this.reviews = [cfg.reviewsPerInnings, cfg.reviewsPerInnings];
    this.flags = {}; this.force = { delivery: null, outcome: null }; this.boundaryShrink = 0; this.fog = this.weather === 'fog' ? .6 : 0; this.rain = 0;
    this.hold = 0; this.oversBowled = {}; this.lastBowler = null; this.fieldPreset = 'balanced'; this.over = 0; this.treats = [[], []];
    this.highlights = []; this.stats = { delays: 0, chaosThings: [], targets: [] };
    this.fielders = []; this.batters = []; this.umpires = []; this.batterActors = {};   // (filled at the first innings: the toss shows an empty square)
    this.env = { g: T('gravity'), pitchBounce: T('pitchBounce'), gb: this.ground.pitch.bounce, k: this.ground.k, slope: this.ground.slope };
  }
  /* ---- who plays what ---- */
  get bat() { return this.inn ? this.teams.findIndex(t => t.id === this.inn.bat) : 0; }
  get bowlSide() { return 1 - this.bat; }
  humansOf(side) { return this.cfg.humans[side] || []; }
  isHuman(side) { return this.humansOf(side).length > 0; }
  /** the input playing the striker's shots (or null: the CPU) */
  strikerInput() { const H = this.humansOf(this.bat); if (!H.length) return null; const s = this.striker; return H.length > 1 && s ? H[s.slot % H.length] : H[0]; }
  batterInput(b) { const H = this.humansOf(this.bat); if (!H.length || !b) return null; return H.length > 1 ? H[b.slot % H.length] : H[0]; }
  bowlerInput() { const H = this.humansOf(this.bowlSide); if (!H.length) return null; return H[this.over % H.length]; }
  fielderInput() { const H = this.humansOf(this.bowlSide); if (!H.length || this.cfg.fielding === 'auto') return null; return H.length > 1 ? H[(this.over + 1) % H.length] : H[0]; }
  get inn() { return this.innings[this.innNo] || null; }
  get kerfuffle() { return this.cfg.kerfuffleRules && this.cfg.mode !== 'nets'; }
  emit(type, data = {}) { data.match = this; this.events.push({ type, t: this.time, data }); if (this.events.length > 300) this.events.shift(); bus.emit(type, data); }
  /* ---- starting ---- */
  start() {
    const sc = this.cfg.scenario;
    if (sc && sc.innings === 1) {
      // a story scenario: the first innings already played (a posted total), the chase begins
      const bf = sc.battingFirst, i1 = Rules.newInnings(this.teams[bf].id, this.teams[1 - bf].id, { overs: this.cfg.overs, wickets: this.cfg.wickets, order: this.teams[bf].order.map(p => p.id) });
      i1.runs = sc.firstRuns; i1.wkts = sc.firstWkts || 4; i1.balls = this.cfg.overs * 6; i1.done = true; i1.end = 'overs'; i1.posted = true;
      this.innings.push(i1); this.innNo = 0;
      this.startInnings(1);
    } else this.startInnings(0);
    this.emit('match:start', { ground: this.ground.id });
  }
  startInnings(n) {
    const prev = this.innings[n - 1], sup = n >= 2;
    let batIdx;
    if (n === 0) batIdx = this.cfg.battingFirst;
    else if (n === 1) batIdx = this.teams.findIndex(t => t.id === prev.bowl);
    else if (n === 2) batIdx = this.teams.findIndex(t => t.id === this.innings[1].bat);
    else batIdx = this.teams.findIndex(t => t.id === prev.bowl);
    const team = this.teams[batIdx], opp = this.teams[1 - batIdx];
    const target = n === 1 || n === 3 ? prev.runs + 1 : null;
    const order = sup ? team.order.slice(0, 3).map(p => p.id) : team.order.map(p => p.id);
    const inn = Rules.newInnings(team.id, opp.id, { overs: sup ? 1 : this.cfg.overs, wickets: sup ? 2 : Math.min(this.cfg.wickets, order.length - 1), target, order, superOver: sup });
    if (this.cfg.mode === 'showdown' || this.cfg.mode === 'hub') { inn.wicketsMax = 2; inn.overs = 1; }
    inn.striker = order[0]; inn.nonStriker = order[1]; Rules.card(inn, order[0]); Rules.card(inn, order[1]);
    this.innings[n] = inn; this.innNo = n; this.over = 0; this.oversBowled = {}; this.lastBowler = null;
    this.reviews = [this.cfg.reviewsPerInnings, this.cfg.reviewsPerInnings];
    this.fire = { bat: 0, bowl: 0, batStreak: 0, bowlStreak: 0, batBalls: 0, bowlBalls: 0 };
    this.batSlots = {}; this.batSlots[order[0]] = 0; this.batSlots[order[1]] = 1;
    this.buildActors();
    this.chooseBowler(true);
    this.emit('innings:start', { n, bat: team.id, target, superOver: sup });
    this.setPhase(n === 0 || (this.cfg.scenario && n === 1 && this.innings[0].posted) ? 'intro' : 'setup');
  }
  /* ---- actors: the fielding side's eleven (bowler, keeper, nine fielders), the two batters and the umpires ---- */
  buildActors() {
    const fieldTeam = this.teams[this.bowlSide];
    this.fielders = []; this.batters = []; this.umpires = [];
    const mk = (p, role) => ({ p, role, x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, home: [0, 0], speed: 0, task: 'idle', anim: { kind: 'idle', t: 0 }, id: p ? p.id : role, slot: 0, ghost: !!(p && p.ghost), state: {} });
    this.keeper = mk(fieldTeam.keeper, 'keeper');
    this.fielders = fieldTeam.players.filter(p => p !== fieldTeam.keeper).map(p => mk(p, 'fielder'));
    this.fielders.push(this.keeper);
    const ump = UMPIRES[this.ground.umpire];
    if (ump) { this.umpires.push(Object.assign(mk(null, 'umpire'), { u: ump, x: -14, y: 352, facing: -Math.PI / 2, id: 'umpire1' })); this.umpires.push(Object.assign(mk(null, 'umpire'), { u: UMPIRES.neutral, x: 200, y: 26, facing: Math.PI, id: 'umpire2', leg: true })); }
    this.batterActors = {};
    this.syncBatters();
  }
  batterActor(id) {
    if (!this.batterActors[id]) { const p = playerById(id); this.batterActors[id] = { p, role: 'batter', id, x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, anim: { kind: 'stance', t: 0 }, run: null, slot: this.batSlots[id] || 0, hand: p.hand || 1, ghost: !!p.ghost, state: {} }; }
    return this.batterActors[id];
  }
  syncBatters() {
    const inn = this.inn; if (!inn) return;
    this.striker = inn.striker ? this.batterActor(inn.striker) : null; this.nonStriker = inn.nonStriker ? this.batterActor(inn.nonStriker) : null;
    this.batters = [this.striker, this.nonStriker].filter(Boolean);
  }
  get hand() { return this.striker ? this.striker.hand : 1; }
  /** the boundary's distance from the pitch's middle along a direction (the ellipse, shrunk by the tide on the sea side) */
  boundaryAt(dx, dy) {
    const g = this.ground, sc = T('boundaryScale');
    let rx = g.rx * sc; const ry = g.ry * sc;
    if (g.seaSide && sign(dx) === g.seaSide) rx *= 1 - this.boundaryShrink;
    const l = hyp(dx, dy) || 1, ux = dx / l, uy = dy / l;
    return 1 / Math.sqrt((ux * ux) / (rx * rx) + (uy * uy) / (ry * ry));
  }
  /** is (x, y) beyond the rope? */
  outside(x, y) { const dx = x, dy = y - G.MID_Y, l = hyp(dx, dy); return l > this.boundaryAt(dx, dy); }
  /** the distance from the striker's stumps to the rope along batter-frame angle theta (degrees) */
  ropeFrom(theta, hand = this.hand) {
    const [ux, uy] = dirOf(theta, hand); let lo = 0, hi = 2000;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (this.outside(ux * m, uy * m)) hi = m; else lo = m; }
    return lo;
  }
  /** fielders' spots for a preset, in the striker's frame */
  fieldSpots(preset = this.fieldPreset) {
    const F = FIELDS[preset] || FIELDS.balanced, hand = this.hand;
    return F.spots.map(([pos, th, d]) => { const dist = d === 'b' ? this.ropeFrom(th) - 30 : d >= 200 ? Math.min(d * 1.3, this.ropeFrom(th) - 60) : d; const [ux, uy] = dirOf(th, hand); return { pos, x: ux * dist, y: uy * dist }; });
  }
  bowlerFamily() { return this.bowler && this.bowler.p.bowl ? this.bowler.p.bowl.type : 'medium'; }
  keeperSpot() { const f = this.bowlerFamily(); if (this.ground.nets) return [0, -30]; return f === 'spin' || f === 'medium' ? [0, -G.KEEPER_UP] : [0, -G.KEEPER_BACK]; }   // (in the Nets the keeper stands inside the net)
  placeField(snap) {
    const spots = this.fieldSpots(), outfield = this.fielders.filter(a => a !== this.keeper && a !== this.bowler);
    spots.forEach((s, i) => { const a = outfield[i]; if (!a) return; a.pos = s.pos; a.home = [s.x, s.y]; });
    const ks = this.keeperSpot(); this.keeper.home = ks; this.keeper.pos = 'keeper';
    if (this.bowler) { this.bowler.pos = 'bowler'; this.bowler.home = this.bowlerMark(); }
    for (const a of this.fielders) { if (snap || hyp(a.x - a.home[0], a.y - a.home[1]) > T('fieldSpeed') * 3) { a.x = a.home[0]; a.y = a.home[1]; } a.task = 'home'; a.ball = false; a.z = 0; a.down = 0; }
  }
  bowlerMark() { const fam = FAMILY[this.bowlerFamily()] || FAMILY.medium, x = this.overRound === 'round' ? G.RELEASE_X + 6 : -G.RELEASE_X - 6; return [x, G.BOWL_Y + 8 + fam.runLen]; }
  /* ---- the bowler for the next over: a human picks (pickBowler), the CPU captain chooses ---- */
  bowlerOptions() {
    const team = this.teams[this.bowlSide], max = this.cfg.maxOversPerBowler === 'auto' ? Math.max(1, Math.ceil(this.inn.overs / 5)) : this.cfg.maxOversPerBowler;
    let list = team.bowlers.filter(p => (this.oversBowled[p.id] || 0) < max && p.id !== this.lastBowler);
    if (!list.length) list = team.bowlers.filter(p => p.id !== this.lastBowler);
    if (!list.length) list = team.bowlers.slice();
    if (this.cfg.mode === 'showdown' || this.cfg.mode === 'hub') { const m = team.players.find(p => p.machine); if (m && !this.cfg.showdownBowl) list = [m]; }
    if (this.cfg.forceBowler) { const f = team.players.find(p => p.id === this.cfg.forceBowler); if (f) list = [f]; }
    if (this.cfg.forceBowlerFamily) { const fam = team.players.filter(p => p.bowl && p.bowl.type === this.cfg.forceBowlerFamily && p.id !== this.lastBowler); if (fam.length) list = fam; }
    return list.slice(0, 5);
  }
  chooseBowler(first) {
    const opts = this.bowlerOptions();
    if (this.isHuman(this.bowlSide) && opts.length > 1 && !first && this.cfg.mode !== 'attract') { this.pickOptions = opts; this.setPhase('pickBowler'); return; }
    if (this.isHuman(this.bowlSide) && opts.length > 1 && first && this.cfg.mode !== 'attract') { this.pickOptions = opts; this.pendingPick = true; }
    this.setBowler(AI.pickBowler(this, opts).id);
  }
  setBowler(id) {
    const team = this.teams[this.bowlSide], p = team.players.find(q => q.id === id) || team.bowlers[0];
    this.bowlerP = p;
    // the bowler is one of the fielders: swap roles
    let a = this.fielders.find(f => f.p === p && f !== this.keeper);
    if (!a) { a = this.fielders.find(f => f !== this.keeper); }
    this.bowler = a; this.overRound = 'over';
    const deliveries = p.bowl ? p.bowl.d : ['dobber', 'cutter', 'knuckle'];
    this.deliveryChoices = deliveries.slice(0, 3);
    if (this.cfg.mode !== 'nets') this.fieldPreset = AI.pickField(this);
    this.placeField(true);
    this.emit('bowler', { id: p.id });
  }
  setPhase(ph) { this.phase = ph; this.pt = 0; this['enter_' + ph] && this['enter_' + ph](); }
  /* ---- the step ---- */
  step(dt) {
    if (this.phase === 'done') return;
    this.time += dt; this.pt += dt;
    this.env.g = T('gravity'); this.env.pitchBounce = T('pitchBounce');
    if (this.hold > 0) { this.hold = Math.max(0, this.hold - dt); if (this.phase === 'dead' || this.phase === 'between' || this.phase === 'intro' || this.phase === 'setup') { this.animate(dt); return; } }
    const f = this['phase_' + this.phase]; if (f) f.call(this, dt);
    this.animate(dt);
    if (this.pt > (PHASE_CAP[this.phase] || 20)) this.timeout();
  }
  /** a state that ran past its cap: never stall. inPlay: a fielder fetches it and the umpire calls dead */
  timeout() {
    this.emit('timeout', { phase: this.phase });
    if (this.phase === 'inPlay' || this.phase === 'flight') this.deadBall('cap');
    else if (this.phase === 'setup' || this.phase === 'runup') { if (this.phase === 'setup') this.startRunup(this.cpuDelivery()); else this.release(); }
    else if (this.phase === 'dead') this.finishBall();
    else if (this.phase === 'between') this.nextBall();
    else if (this.phase === 'pickBowler') { this.setBowler(this.pickOptions[0].id); this.setPhase('setup'); }
    else if (this.phase === 'inningsBreak') this.afterBreak();
    else if (this.phase === 'rainDelay') this.endRain();
    else this.setPhase('setup');
  }
  phase_intro() { if (this.pt > 2.2) this.setPhase('setup'); }
  /* ---- SETUP: everyone to their places; the human bowler picks a delivery and the pitch marker (or the CPU thinks) ---- */
  enter_setup() {
    this.syncBatters();
    // AI Hub rounds: each ball's gameplay stream comes from the shared seed, so every copy faces identical balls whatever its player did
    if (this.cfg.mode === 'hub') { const n = this.inn ? this.inn.recs.length : 0; RNG.play = window.AIHub && window.AIHub.rng ? window.AIHub.rng('field' + n) : E.rng((this.cfg.seed * 31 + n) >>> 0 || 1); }
    const b = this.ball; Object.assign(b, Ball.make()); b.phase = 'held';
    this.cur = { over: this.over, ballInOver: this.inn.balls % 6, bowler: this.bowlerP.id, striker: this.striker.id, nonStriker: this.nonStriker.id, ran: 0, runs: 0, boundary: 0, extras: {}, wicket: null, bonus: 0, contact: null, shot: null, grade: null, events: [], appeals: [] };
    this.contact = null; this.shotPress = null; this.charge = 0; this.flags.forceRunOut = false; this.padHit = null; this.running = null; this.decision = null; this.thrown = null; this.holder = null; this.catchRing = null; this.settleT = 0; this.throwPick = null; this.overthrowArmed = false;
    this.marker = this.marker || [0, 90]; this.meter = null; this.aftertouch = 0; this.special = null; this.cpuPlan = null; this.batPlan = null; this.deliveryId = null; this.triple = null; this.vanish = null;
    this.reviewWindow = 0; this.appealT = 0; this.signal = null; this.ballSettled = false; this.stumpT = null; this.returnToCrease = false; this.ballFlying = 0; this.batSpecialArmed = this.batSpecialArmed === 'certainty' ? null : this.batSpecialArmed; this.autoSpecialPress = null; this.chaser = null; this.samples = [];
    if (this.cfg.cheat.catchesOnce) this.cfg.cheat.catchesOnce = false; if (this.cfg.cheat.directHitOnce) this.cfg.cheat.directHitOnce = false;
    for (const a of this.fielders) { a.stun = 0; a.passed = false; a.phased = false; a.ball = false; }
    for (const a of this.batters) { a.run = null; a.anim = { kind: 'stance', t: 0 }; a.down = 0; a.slip = 0; }
    const h = this.hand;
    this.striker.x = 6 * h; this.striker.y = G.CREASE_S + 2; this.striker.facing = h > 0 ? Math.PI : 0;
    this.nonStriker.x = -12 * h; this.nonStriker.y = G.CREASE_B + 4; this.nonStriker.facing = -Math.PI / 2;
    this.placeField(false);
    this.bowler.x = this.bowler.home[0]; this.bowler.y = this.bowler.home[1]; this.bowler.facing = -Math.PI / 2; this.bowler.anim = { kind: 'mark', t: 0 };
    this.thinkT = .6 + RNG.cosmetic() * .6;
    if (this.pendingPick) { this.pendingPick = false; this.setPhase('pickBowler'); return; }
    this.emit('ball:setup', {});
    AI.planBowling(this);
  }
  phase_setup(dt) {
    const I = this.bowlerInput();
    for (const a of this.fielders) if (a !== this.bowler) this.moveActor(a, a.home[0], a.home[1], T('fieldSpeed') * .9, dt, true);
    if (this.hold > 0) return;
    if (this.cfg.mode === 'hub' && K.hub && !K.hub.canBowl()) return;
    if (this.force.delivery) return this.startRunup(this.force.delivery.id, this.force.delivery);
    if (I && !(this.cfg.cheat.autoBowl)) {
      Bowling.humanSetup(this, I, dt);
    } else if (this.pt > this.thinkT) this.startRunup(this.cpuDelivery());
  }
  cpuDelivery() { const p = this.cpuPlan || AI.planBowling(this); return p.special ? 'special' : p.id; }
  enter_pickBowler() { this.pickI = 0; }
  phase_pickBowler() { const I = this.bowlerInput(); if (!I || this.cfg.cheat.autoBowl) { this.setBowler(AI.pickBowler(this, this.pickOptions).id); this.setPhase('setup'); } }
  pickBowler(i) { if (this.phase !== 'pickBowler') return; this.setBowler(this.pickOptions[clamp(i, 0, this.pickOptions.length - 1)].id); this.setPhase('setup'); }
  /* ---- moving an actor toward a point at up to `speed`, turning to face its way ---- */
  moveActor(a, tx, ty, speed, dt, faceBall) {
    const dx = tx - a.x, dy = ty - a.y, d = hyp(dx, dy);
    if (d < 1) { a.vx = 0; a.vy = 0; if (faceBall) a.facing = E.approachAng(a.facing, Math.atan2(this.striker.y - a.y, this.striker.x - a.x), dt * 6); return true; }
    const v = Math.min(speed, d / dt), ux = dx / d, uy = dy / d;
    a.vx = approach(a.vx, ux * v, 900 * dt); a.vy = approach(a.vy, uy * v, 900 * dt);
    a.x += a.vx * dt; a.y += a.vy * dt;
    a.facing = E.approachAng(a.facing, Math.atan2(uy, ux), dt * 10);
    this.avoidChaos(a);
    return false;
  }
  /** walking round Doris the cow (fielders path round her) */
  avoidChaos(a) {
    if (a === this.chaser && this.phase === 'inPlay') return;   // the chaser goes round her to the ball, whatever it takes
    for (const c of this.chaos) if (c.id === 'cow' && c.pos) { const dx = a.x - c.pos[0], dy = a.y - c.pos[1], d = hyp(dx, dy); if (d < 30 && d > .01) { a.x = c.pos[0] + dx / d * 30; a.y = c.pos[1] + dy / d * 30; } }
  }
  /* ---- the animation state the presentation reads (timers only: the rigs live in presentation) ---- */
  animate(dt) {
    for (const a of this.fielders) { if (a.anim) a.anim.t += dt; if (a.down > 0) a.down = Math.max(0, a.down - dt); }
    for (const a of this.batters) { if (a.anim) a.anim.t += dt; if (a.down > 0) a.down = Math.max(0, a.down - dt); }
    for (const u of this.umpires) if (u.anim) u.anim.t += dt;
    this.stepTokens(dt);
    this.stepChaos(dt);
  }
  /* ---- DEAD BALL and the end of a ball ---- */
  deadBall(why) {
    if (this.phase === 'dead' || this.phase === 'between') return;
    this.cur.dead = why; if (!(this.ballFlying > 0)) this.ball.phase = this.ball.phase === 'held' ? 'held' : 'dead';
    if (this.running) this.endRunning(true);
    this.setPhase('dead');
  }
  enter_dead() {
    const c = this.cur;
    this.deadT = c.wicket ? 2.4 : c.boundary ? 2.2 : 1.1;
    if (this.decision && this.decision.pending) this.deadT = Math.max(this.deadT, this.decision.umpT + .4);
    this.emit('ball:dead', { why: c.dead, rec: c });
    Umpire.signalFor(this);
  }
  phase_dead(dt) {
    // after a boundary the ball keeps flying for the show: a stadium target, the stands, the sea or the pub
    if (this.ballFlying > 0) {
      this.ballFlying -= dt; const b = this.ball, x0 = b.x, y0 = b.y, z0 = b.z;
      Ball.step(b, dt, this.env); this.checkTargets(x0, y0, z0);
      const S = { terrace: [.2, 16], bleachers: [.35, 30], dome: [.4, 96] }[this.ground.stands], dx = b.x, dy = b.y - G.MID_Y, past = hyp(dx, dy) - this.boundaryAt(dx, dy), stand = S ? clamp(past * S[0], 0, S[1]) : 0;
      if ((stand > 0 && b.z < stand) || this.ballFlying <= 0 || (b.z <= 0 && past > 0 && this.cur.boundary === 6)) {
        if (this.cur.boundary === 6 && !this.cur.landed) {
          this.cur.landed = true; this.emit('six:land', { x: b.x, y: b.y, z: b.z, stand: !!stand });
          // among the spectators (the stands, or the deck chairs and blankets just past a village or beach rope): a crowd catch, often
          const amongCrowd = stand > 0 || (past > 8 && past < 130), catchIt = this.flags.crowdCatchNext || (amongCrowd && RNG.cosmetic() < .55);
          if (catchIt && (amongCrowd || this.flags.crowdCatchNext)) { this.flags.crowdCatchNext = false; this.cur.crowdCatch = true; this.emit('crowd:catch', { x: b.x, y: b.y, z: b.z }); coverage.mark('crowdcatch'); }
        }
        this.ballFlying = 0; b.phase = 'dead';
      }
    }
    for (const a of this.fielders) if (a !== this.holder) this.moveActor(a, a.x + (a.home[0] - a.x) * .02, a.y + (a.home[1] - a.y) * .02, 40, dt, true);
    Umpire.stepDecision(this, dt);
    if (this.decision && (this.decision.pending || this.reviewWindow > 0 || this.decision.reviewing)) return;
    if (this.pt >= this.deadT) this.finishBall();
  }
  /** turn the ball's events into its record and apply it to the innings */
  finishBall() {
    if (this.phase === 'between') return;
    const c = this.cur, inn = this.inn;
    if (this.decision && this.decision.out === false && c.wicket && c.wicket.how === this.decision.kind) c.wicket = null;
    if (c.wicket && this.useItem(this.bat, 'horseshoe', 'wicket')) { c.horseshoe = c.wicket.how; c.wicket = null; this.emit('item:used', { id: 'horseshoe' }); }
    // runs: bat runs, or byes / leg byes when the bat never touched it
    const ex = c.extras = Object.assign({ wd: 0, nb: 0, b: 0, lb: 0 }, c.extras);
    if (c.gullByes && !c.boundary) c.ran = Math.max(c.ran, c.gullByes);
    let batRuns = c.boundary || c.ran;
    if (!c.contact && !ex.wd) { if (batRuns) { if (c.padded) ex.lb += batRuns; else ex.b += batRuns; } batRuns = 0; }
    if (ex.wd) { ex.wd = 1 + (c.boundary || c.ran); batRuns = 0; }
    c.runs = batRuns;
    c.double = batRuns > 0 && this.useItem(this.bat, 'teapot', 'runs');
    const before = inn.runs, wasStriker = c.striker;
    Rules.applyBall(inn, c);
    this.afterBallArcade(c, before);
    if (c.overEnd) { this.oversBowled[c.bowler] = (this.oversBowled[c.bowler] || 0) + 1; this.lastBowler = c.bowler; this.over++; }
    if (c.newBatter) this.batSlots[c.newBatter] = this.batSlots[c.wicket ? c.wicket.batter : wasStriker] || 0;
    this.emit('ball:done', { rec: c });
    if (c.wicket) this.emit('wicket:done', { rec: c });
    this.setPhase('between');
  }
  enter_between() { this.betweenT = this.cur.overEnd ? 1.6 : .9; }
  phase_between() {
    for (const a of this.batters) if (a.down) a.down = 0;
    if (this.pt >= this.betweenT) this.nextBall();
  }
  nextBall() {
    const inn = this.inn;
    if (inn.done) return this.endInnings();
    this.syncBatters();
    if (this.cur.overEnd) {
      this.emit('over:end', { over: this.over, inn: this.innNo });
      if (this.chaosOverStart()) return;
      this.chooseBowler(false);
      if (this.phase === 'pickBowler') return;
    } else this.chaosBetween();
    if (this.phase === 'rainDelay') return;
    this.setPhase('setup');
  }
  endInnings() {
    const n = this.innNo, inn = this.inn;
    this.emit('innings:end', { n, runs: inn.runs, wkts: inn.wkts, end: inn.end });
    const scen = this.cfg.scenario, chaseOnly = scen && scen.innings === 1;
    if (n === 0) { this.setPhase('inningsBreak'); return; }
    if (n === 1) {
      const res = Rules.result(this.innings[0], this.innings[1], this.names);
      if (res.tie && this.cfg.superOver && this.cfg.mode !== 'nets' && this.cfg.mode !== 'showdown' && this.cfg.mode !== 'hub') { this.emit('superover', {}); this.superPending = true; this.setPhase('inningsBreak'); return; }
      return this.finish(res);
    }
    if (n === 2) { this.setPhase('inningsBreak'); return; }
    return this.finish(Rules.superResult(this.innings[2], this.innings[3], this.names));
    void chaseOnly;
  }
  enter_inningsBreak() { this.breakT = this.cfg.mode === 'attract' ? 2 : 3.5; this.treatPick = this.cfg.mode === 'story' && this.isHuman(1 - this.bat) && this.innNo === 0; }
  phase_inningsBreak() { if (this.pt >= this.breakT && !this.treatPick && this.hold <= 0) this.afterBreak(); }
  afterBreak() { const n = this.innNo + 1; this.superPending = false; this.startInnings(n); }
  finish(res) {
    this.result = res; this.setPhase('done');
    this.emit('match:end', { result: res });
  }
  /* ---- helpers the rest use ---- */
  oversText() { return Rules.oversText(this.inn ? this.inn.balls : 0); }
  need() { const i = this.inn; if (!i || i.target === null) return null; return { runs: Math.max(0, i.target - i.runs), balls: i.overs * 6 - i.balls }; }
  sideOf(teamId) { return this.teams.findIndex(t => t.id === teamId); }
}
K.Match = Match;

/* ---- 23-bowling.js ---- */
/* ---- BOWLING. Between balls the human moves the pitch marker (stick, WASD or the mouse), cycles the field preset
 * (run: R1 / Space), switches over or round the wicket (back: L1 / Shift) and picks a delivery (shot / loft / block:
 * Cross Square Circle, J K L, clicks) or the special (special: Triangle / I / F, when Hype is full). The run-up
 * follows; in its last 0.7 s a needle sweeps the release meter: green is accurate and quick, amber and red scatter,
 * the far-right tip oversteps (a no-ball and a FREE HIT); no press auto-releases amber. For 0.25 s after release the
 * stick's sideways push adds swing or drift (aftertouch). CPU bowlers go through the same pipeline. ---- */
const METER_LEN = .7;
const Bowling = {
  humanSetup(m, I, dt) {
    const mv = I.move(), mouse = K.mouseAim && K.mouseAim(I);
    if (mouse && mouse.fresh) { m.marker[0] = clamp(mouse.x, -30, 30); m.marker[1] = clamp(mouse.y, 20, 230); }
    else { m.marker[0] = clamp(m.marker[0] + mv[0] * 70 * dt, -30, 30); m.marker[1] = clamp(m.marker[1] + mv[1] * 140 * dt, 20, 230); }
    if (I.pressed('run')) { const i = FIELD_ORDER.indexOf(m.fieldPreset); let n = FIELD_ORDER[(i + 1) % FIELD_ORDER.length]; if (n === 'spin' && m.bowlerFamily() !== 'spin') n = FIELD_ORDER[(i + 2) % FIELD_ORDER.length]; m.fieldPreset = n; m.placeField(false); m.emit('field', { preset: n }); }
    if (I.pressed('back')) { m.overRound = m.overRound === 'over' ? 'round' : 'over'; m.bowler.home = m.bowlerMark(); m.bowler.x = m.bowler.home[0]; m.emit('overround', { v: m.overRound }); }
    const pick = ['shot', 'loft', 'block'].findIndex(a => I.pressed(a));
    if (pick >= 0) { I.consume(['shot', 'loft', 'block'][pick]); m.startRunup(m.deliveryChoices[pick]); }
    else if (I.pressed('special') && m.specialReady(m.bowlSide, 'bowl')) { I.consume('special'); m.startRunup('special'); }
  },
  meterU(t) { const ph = (t * T('meterSpeed')) % 1; return ph < .5 ? ph * 2 : 2 - ph * 2; },
  /** a meter press at u: 'green' | 'amber' | 'red' | 'over' (the far-right tip) */
  grade(u, skill) {
    if (u >= .94) return 'over';
    const sweet = T('meterSweet') * (.7 + (skill || 5) * .05), d = Math.abs(u - .5);
    return d <= sweet / 2 ? 'green' : d <= sweet / 2 + .17 ? 'amber' : 'red';
  }
};
Object.assign(Match.prototype, {
  /** begin the run-up with a delivery id (or 'special') and, for forced ones, a spec { target, kmh, grade } */
  startRunup(id, spec) {
    if (this.phase !== 'setup') return;
    const fam = FAMILY[this.bowlerFamily()] || FAMILY.medium;
    let special = null;
    if (id === 'special') { special = this.bowlerSpecial(); this.useSpecial(this.bowlSide, special); id = SPECIALS[special].delivery.base || this.deliveryChoices[0]; }
    if (spec && spec.special) { special = spec.special; id = SPECIALS[special].delivery.base || id; this.emit('special', { id: special, side: this.bowlSide, kind: 'bowl' }); }
    this.deliveryId = id; this.special = special; this.forcedSpec = spec || null; if (spec) this.force.delivery = null;
    this.runupTime = fam.runup * (this.cfg.mode === 'attract' ? .8 : 1); this.runFrom = [this.bowler.x, this.bowler.y];
    this.meter = { t: 0, on: false, u: 0, grade: null, start: this.runupTime - METER_LEN };
    this.cur.delivery = id; this.cur.special = special;
    this.setPhase('runup');
    this.emit('ball:runup', { id, special });
    for (const a of this.fielders) if (a !== this.bowler && a !== this.keeper) a.walkIn = 0;
  },
  bowlerSpecial() { const p = this.bowlerP; return p.specBowl || (p.specField === 'chirp' ? null : null) || 'kerfuffleBall'; },
  phase_runup(dt) {
    const k = clamp(this.pt / this.runupTime, 0, 1), rel = this.releasePoint();
    // the bowler runs in (accelerating), the fielders walk in a few steps, the marker can still move at half speed
    const e = this.bowlerFamily() === 'machine' ? 0 : k * k;
    this.bowler.x = lerp(this.runFrom[0], rel.x, e); this.bowler.y = lerp(this.runFrom[1], rel.y + 4, e);
    this.bowler.vy = -(this.runFrom[1] - rel.y) / this.runupTime * 2 * k; this.bowler.vx = 0; this.bowler.facing = -Math.PI / 2;
    this.bowler.anim = this.pt >= this.runupTime - .16 ? { kind: 'deliver', t: this.pt - (this.runupTime - .16) } : { kind: 'runup', t: this.pt, k };
    for (const a of this.fielders) if (a !== this.bowler && a !== this.keeper) { const dx = this.striker.x - a.home[0], dy = this.striker.y - a.home[1], d = hyp(dx, dy) || 1, w = Math.min(14, d * .08) * k; a.x = a.home[0] + dx / d * w; a.y = a.home[1] + dy / d * w; a.anim = { kind: 'walkin', t: this.pt }; a.facing = Math.atan2(dy, dx); }
    const I = this.bowlerInput(), human = I && !this.cfg.cheat.autoBowl && !this.forcedSpec;
    if (human) { const mv = I.move(), mouse = K.mouseAim && K.mouseAim(I); if (mouse && mouse.fresh) { this.marker[0] = clamp(lerp(this.marker[0], mouse.x, .1), -30, 30); this.marker[1] = clamp(lerp(this.marker[1], mouse.y, .1), 20, 230); } else { this.marker[0] = clamp(this.marker[0] + mv[0] * 35 * dt, -30, 30); this.marker[1] = clamp(this.marker[1] + mv[1] * 70 * dt, 20, 230); } }
    // the meter: a press locks the grade (the needle stops); the ball leaves the hand when the bowler reaches the crease
    const M = this.meter;
    if (this.pt >= M.start && !M.locked) {
      M.on = true; M.t = this.pt - M.start; M.u = Bowling.meterU(M.t);
      if (this.special && !SPECIALS[this.special].noMeter) { M.grade = 'green'; M.locked = true; }
      else if (human) { const p = ['shot', 'loft', 'block', 'special'].find(a => I.pressed(a)); if (p) { I.consume(p); M.grade = Bowling.grade(M.u, this.bowlerP.bowl && this.bowlerP.bowl.skill); M.locked = true; this.emit('meter:lock', { grade: M.grade }); } }
      else if (this.cpuPlan && M.t >= this.cpuPlan.meterT) { M.grade = this.forcedSpec ? (this.forcedSpec.grade || 'green') : this.cpuPlan.grade; M.locked = true; }
    }
    if (this.pt >= this.runupTime) { M.grade = M.grade || (human ? 'amber' : (this.cpuPlan && this.cpuPlan.grade) || 'amber'); this.release(); }
  },
  releasePoint() {
    if (this.bowlerFamily() === 'machine') return { x: 0, y: G.BOWL_Y + 8, z: 28 };
    return { x: this.overRound === 'round' ? G.RELEASE_X : -G.RELEASE_X, y: G.CREASE_B, z: G.RELEASE_Z };
  },
  /** the ball leaves the hand: target, speed, swing, turn and seam from the delivery, the meter, the ground and the specials */
  release() {
    if (this.phase !== 'runup') return;
    const D = DELIVERIES[this.deliveryId] || DELIVERIES.dobber, spec = this.forcedSpec, sp = this.special ? SPECIALS[this.special].delivery : null;
    const M = this.meter, grade = (spec && spec.grade) || M.grade || 'amber', skill = (this.bowlerP.bowl && this.bowlerP.bowl.skill) || 5;
    const human = !!this.bowlerInput() && !this.cfg.cheat.autoBowl && !spec;
    const plan = this.cpuPlan || {};
    let tx, ty;
    if (spec && spec.target) { tx = spec.target[0]; ty = spec.target[1]; }
    else if (sp && sp.target) { tx = sp.target[0] * this.hand; ty = sp.target[1] + G.CREASE_S; }
    else if (human) { tx = this.marker[0]; ty = this.marker[1]; }
    else { tx = plan.tx; ty = plan.ty; }
    const scatter = { green: 2, amber: 10, red: 18, over: 10 }[grade] * (human || spec ? 1 : (this.isHuman(this.bowlSide) ? Tuning.raw('aiBowlAccuracy') : T('aiBowlAccuracy')) / 10);
    if (!spec && !(plan.straight && !human)) { tx += RNG.normal() * scatter * .6; ty += RNG.normal() * scatter; }
    ty = clamp(ty, D.len && D.len[0] < 6 ? G.CREASE_S - 4 : G.CREASE_S, 290);
    const pace = { green: 1.025, amber: .9, red: .8, over: .95 }[grade];
    let kmh = (spec && spec.kmh) || (sp && sp.kmh) || RNG.range(D.kmh[0], D.kmh[1]) * pace * (D.fam === 'spin' || D.fam === 'machine' ? 1 : this.ground.pitch.pace);
    if (this.special === 'kerfuffleBall') kmh *= 1.15;
    if (this.fire.bowl > 0) kmh *= 1.1;
    const rel = this.releasePoint(), v = kmhToUps(kmh, T('ballSpeed')) * (D.fam === 'spin' ? 1.1 : 1);
    const b = this.ball, overcast = this.weather === 'overcast' ? 1.5 : 1;
    const sol = Ball.solve(rel, tx, ty, v, this.env, D.bounce);
    Object.assign(b, Ball.make(), rel, sol, { phase: 'delivery', bounceK: D.bounce * (sp && sp.bounces ? .9 : 1), grip: D.fam === 'spin' ? .16 : .08 });
    let swing = (sp && sp.swing !== undefined ? sp.swing : D.swing) * (this.special === 'kerfuffleBall' ? 2 : 1);
    b.swingA = -swing * 60 * T('swing') * overcast;
    let turn = D.turn * this.ground.pitch.turn * T('spin');
    if (D.randTurn) turn *= RNG.play() < .5 ? -1 : 1;
    if (this.ground.pitch.rough && Math.abs(tx) > 10) turn *= this.ground.pitch.rough;
    b.turn = -turn * DEG;
    b.seamDev = RNG.normal() * T('seam') * this.ground.pitch.seam * D.seam * DEG * .5;
    if (D.wobble || (sp && sp.wobble)) { b.wobble = (sp && sp.wobble) || D.wobble; b.wobblePh = RNG.play() * TAU; }
    if (sp && sp.bounces) { b.multiBounce = true; b.extraTurn = -6 * DEG; this.flags.grandad = true; }
    if ((spec && spec.swing !== undefined)) b.swingA = -spec.swing * 60 * T('swing') * overcast;
    if ((spec && spec.straight) || (!spec && !human && plan.straight)) { b.swingA = 0; b.turn = 0; b.seamDev = 0; b.wobble = 0; }
    b.fx = this.special ? SPECIALS[this.special].fx : (this.fire.bowl > 0 ? 'fire' : D.fx || null);
    this.cur.kmh = Math.round(kmh); this.cur.target = [tx, ty]; this.cur.grade = null; this.cur.meter = grade; this.cur.fam = D.fam;
    if (grade === 'over') { this.cur.extras.nb = 1; this.cur.noBall = 'overstep'; }
    this.cur.hideSpeed = !!D.hideSpeed;
    this.aftertouch = .25; this.flightT = 0;
    if (this.special === 'triple') this.triple = [-1, 1].map(s => { const h = Object.assign(Ball.make(), rel, Ball.solve(rel, tx + s * 18, ty + s * 30, v * (1 + s * .05), this.env), { phase: 'delivery' }); return h; });
    if (this.special === 'vanish') this.vanish = { from: .4, to: .65, total: (G.CREASE_B - G.CREASE_S) / v };
    this.bowler.anim = { kind: 'deliver', t: .16 };
    Profile.data && kmh > (Profile.data.stats.fastest || 0) && this.isHuman(this.bowlSide) && Profile.stat('fastest', Math.round(kmh), true);
    this.setPhase('flight');
    this.emit('ball:released', { id: this.deliveryId, kmh: Math.round(kmh), special: this.special, grade, fam: D.fam });
    coverage.mark('del:' + D.fam);
    AI.planBatting(this);
  }
});
K.Bowling = Bowling;

/* ---- 24-batting.js ---- */
/* ---- BATTING. Aim with the stick, WASD or the mouse (in screen space: push toward where the ball should go as you
 * see it); shot (Cross / J / left click) plays a ground shot, loft (Square / K / right click) a lofted one, block
 * (Circle / L / Q) defends; no button is a leave. charge (R2 / E) steps down the pitch before the ball pitches.
 * Timing: each shot has contactAt (press to contact); the predictor says when the ball reaches the shot's contact
 * plane; delta = contactAt - arrival grades PERFECT / GOOD / EARLY / LATE / MISS. At the plane the ball's real line
 * and height are checked against the shot's zone: inside is clean, just outside is an edge, further is a miss. ---- */
const Batting = {
  windows(m) {
    let k = 1;
    if (m.fire.bat > 0) k *= 1.5;
    if (m.flags.giantBat > 0) k *= 1.4;
    if (m.flags.teaTime > 0 && m.flags.teaSide === m.bat) k *= 1.1;
    if (m.flags.chirp) k *= m.strikerInput() ? .7 : 1;
    if (m.special === 'grandad') k *= .5;
    return { perfect: T('perfectMs') / 1000 * k, good: T('goodMs') / 1000 * k, ok: T('okMs') / 1000 * k };
  },
  gradeOf(delta, w) { const d = Math.abs(delta); return d <= w.perfect ? 'perfect' : d <= w.good ? 'good' : d <= w.ok ? (delta < 0 ? 'early' : 'late') : 'miss'; },
  /** where the batter's pad stands (the leading leg's box) for the foot the batter is on */
  padBox(m) {
    const h = m.hand, c = m.charge > 0 ? 24 * Math.min(1, m.charge) : 0, sp = m.shotPress, back = sp && SHOTS[sp.shotId].back;
    const y0 = (back ? 8 : sp ? 20 : 14) + c, x0 = sp && sp.grade === 'miss' ? -2 : .5;
    return { y0, y1: y0 + 10, xa: h > 0 ? x0 : -9, xb: h > 0 ? 9 : -x0, z1: 20 };
  }
};
Object.assign(Match.prototype, {
  /** the ball's length class as the batter sees it (a charge shortens it by 24 units) */
  lengthNow() {
    const b = this.ball; let py = b.pitched ? b.pitchAt[1] : null;
    if (py === null) { const s = Ball.predict(b, 2, this.env, 1, c => c.pitched); const last = s[s.length - 1]; py = last && last.pitched ? last.y : 0; }
    return lengthOf(py - (this.charge > 0 ? 24 : 0));
  },
  contactPlane(shotId) { return (SHOTS[shotId].back ? 22 : 36) + (this.charge > 0 ? 24 : 0); },
  /** the batter presses a shot: btn 'shot' | 'loft' | 'block', aim: a world direction [dx, dy] or null (neutral) */
  batPress(btn, aim, cheat) {
    if (this.shotPress || this.phase !== 'flight' || this.contact) return false;
    const b = this.ball, hand = this.hand, len = this.lengthNow();
    const arr0 = Ball.arrive(b, 36 + (this.charge > 0 ? 24 : 0), this.env), line0 = arr0 ? -hand * arr0.x : 0;
    const sector = aim && hyp(aim[0], aim[1]) > .3 ? thetaOf(aim[0], aim[1], hand) : null;
    const shotId = resolveShot(btn, sector, len, line0), shot = SHOTS[shotId];
    const plane = this.contactPlane(shotId), arr = Ball.arrive(b, plane, this.env);
    if (!arr) return false;
    const w = Batting.windows(this), delta = shot.at - arr.t;
    let grade = Batting.gradeOf(delta, w);
    if (cheat && cheat.grade) grade = cheat.grade;
    if (this.batSpecialArmed === 'certainty' && grade !== 'perfect') grade = 'good';
    this.shotPress = { t: this.time, btn, shotId, sector, aim, grade, delta, plane, len, cheat: cheat || null };
    this.cur.shot = shotId; this.cur.grade = grade; this.cur.press = { delta: Math.round(delta * 1000) };
    this.striker.anim = { kind: 'shot', shot: shotId, t: 0, at: shot.at, grade };
    this.emit('bat:press', { shot: shotId, grade, delta });
    return true;
  },
  /** the step to press for a PERFECT with a button (neutral stick) on the current ball: seconds from now, or null */
  idealPress(btn = 'shot', aim = null) {
    const b = this.ball; if (this.phase !== 'flight' && this.phase !== 'runup') return null;
    if (b.phase !== 'delivery') return null;
    const hand = this.hand, len = this.lengthNow(), arr0 = Ball.arrive(b, 36, this.env), line0 = arr0 ? -hand * arr0.x : 0;
    const sector = aim ? thetaOf(aim[0], aim[1], hand) : null, id = resolveShot(btn, sector, len, line0), arr = Ball.arrive(b, this.contactPlane(id), this.env);
    return arr ? Math.max(0, arr.t - SHOTS[id].at) : null;
  },
  phase_flight(dt) {
    const b = this.ball, hand = this.hand;
    this.flightT += dt;
    // aftertouch: the stick's sideways push adds swing (seamers) or drift (spinners) for 0.25 s
    if (this.aftertouch > 0) {
      this.aftertouch -= dt;
      const I = this.bowlerInput();
      if (I && !this.cfg.cheat.autoBowl && !this.forcedSpec) { let x = I.move()[0]; const ms = K.mouseAim && K.mouseAim(I); if (ms && ms.dx) x = clamp(x + ms.dx * .08, -1, 1); if (Math.abs(x) > .15) { b.swingA += x * .6 * 60 * T('swing') * dt / .25 * 1.6; this.cur.aftertouch = (this.cur.aftertouch || 0) + x * dt; } }
    }
    // the human batter: special, charge, shot / loft / block (aim from the stick or the mouse)
    const I = this.strikerInput();
    if (I && !this.cfg.cheat.autoBat) this.humanBatInput(I);
    if (this.batPlan) AI.stepBatting(this, dt);
    if (this.autoSpecialPress && this.time >= this.autoSpecialPress.t) { const a = this.autoSpecialPress; this.autoSpecialPress = null; this.batPress(a.btn, a.aim, { grade: 'perfect' }); }
    if (this.charge > 0 && this.charge < 1) { this.charge = Math.min(1, this.charge + dt / .25); }
    if (this.charge > 0) { this.striker.y = G.CREASE_S + 2 + 24 * this.charge; if (this.charge < 1) this.striker.anim = { kind: 'charge', t: this.charge }; }
    if (this.triple) for (const h of this.triple) Ball.step(h, dt, this.env);
    // the bowler's follow-through: on down the pitch a few strides, veering off it
    if (this.bowler && this.bowlerFamily() !== 'machine') { const bw = this.bowler, side = bw.x < 0 ? -1 : 1; this.moveActor(bw, side * 26, Math.max(250, bw.y - 1), 60 * Math.max(0, 1 - this.flightT), dt); bw.anim = { kind: 'deliver', t: this.flightT + .16 }; }
    if (this.vanish) { const u = this.flightT / this.vanish.total; b.hidden = u > this.vanish.from && u < this.vanish.to; if (b.hidden && !this.vanish.seen) { this.vanish.seen = true; this.emit('fx:vanish', {}); } }
    // keeper reads the line
    const ks = this.keeperSpot(), pr = Ball.arrive(b, ks[1] + 4, this.env, 3);
    this.moveActor(this.keeper, pr ? clamp(pr.x, -60, 60) : 0, ks[1], 170, dt);
    this.keeper.anim = { kind: 'crouch', t: 0 };
    const y0 = b.y, x0 = b.x, z0 = b.z;
    Ball.step(b, dt, this.env);
    if (this.ground.nets && b.y < -38 && this.netCollide(x0, y0, z0)) { b.phase = 'hit'; return this.goInPlay(false); }
    if (b.pitched && !this.cur.pitch) { this.cur.pitch = b.pitchAt.slice(); this.cur.length = lengthOf(b.pitchAt[1]); this.emit('ball:pitched', { at: b.pitchAt, length: this.cur.length }); }
    const crossed = yy => y0 > yy && b.y <= yy, at = yy => { const f = (y0 - yy) / Math.max(1e-6, y0 - b.y); return { x: lerp(x0, b.x, f), z: lerp(z0, b.z, f) }; };
    // the bat
    const sp = this.shotPress;
    if (sp && !this.contact && crossed(sp.plane)) {
      const p = at(sp.plane);
      if (sp.grade !== 'miss') { if (this.resolveContact(p.x, sp.plane, p.z)) return; }
      else { this.cur.beaten = true; this.emit('ball:beaten', {}); }
    }
    // a beamer and a wide, judged at the popping crease
    if (!this.contact && crossed(G.CREASE_S)) {
      const p = at(G.CREASE_S), line = -hand * p.x;
      if (!b.pitched && p.z > 26 && !this.cur.extras.nb) { this.cur.extras.nb = 1; this.cur.noBall = 'beamer'; this.emit('extra', { kind: 'nb', why: 'beamer' }); }
      else if (!this.cur.extras.nb && (line > 26 || line < -18 || p.z > 40)) { this.cur.extras.wd = 1; this.emit('extra', { kind: 'wd' }); }
      if (!sp && p.z > 28) this.striker.anim = { kind: 'duck', t: 0 };
      else if (!sp) this.striker.anim = { kind: 'leave', t: 0 };
    }
    // the pad (leg before wicket)
    const pb = Batting.padBox(this);
    if (!this.contact && !this.padHit && y0 > pb.y0 && b.y <= pb.y1 && b.y >= pb.y0 - 2 && b.x >= pb.xa && b.x <= pb.xb && b.z <= pb.z1) {
      this.padHit = { x: b.x, y: b.y, z: b.z }; this.cur.padded = true;
      if (Umpire.lbwCandidate(this)) return;
      // not a candidate: it rebounds off the pad (leg byes possible)
      b.vx = -b.vx * .2 + (b.x > 0 ? 30 : -30); b.vy = -b.vy * .15; b.vz = Math.abs(b.vz) * .3; b.phase = 'hit'; b.carried = false; b.rolling = false;
      this.emit('ball:padded', {});
      return this.goInPlay(false);
    }
    // the stumps
    if (!this.contact && crossed(G.STUMPS_Y)) {
      const p = at(G.STUMPS_Y);
      if (Math.abs(p.x) <= G.STUMP_HALF + G.BALL_R && p.z <= G.STUMP_H + G.BALL_R) return this.bowled(this.special === 'sawn' ? 'sawn' : 'bowled');
    }
    // the keeper takes it, or it beats him (byes)
    const kp = this.keeper;
    if (!this.contact && b.y <= kp.y + 6 && y0 > kp.y + 6) {
      const reach = 16 + ((kp.p.field && kp.p.field.catch) || 6);
      if (Math.abs(b.x - kp.x) <= reach && b.z <= 34) return this.keeperTakes();
      this.emit('ball:pastKeeper', {}); b.phase = 'hit'; b.carried = false;
      return this.goInPlay(false);
    }
    if (b.y < -260 || this.flightT > 3.5) { b.phase = 'hit'; this.goInPlay(false); }
  },
  humanBatInput(I) {
    if (I.pressed('special') && !this.batSpecialArmed && this.specialReady(this.bat, 'bat')) { I.consume('special'); this.armBatSpecial(); }
    if (I.pressed('charge') && !this.ball.pitched && !this.charge && this.ball.phase === 'delivery') { I.consume('charge'); this.charge = .01; this.cur.charged = true; this.emit('bat:charge', {}); }
    if (I.pressed('back') && this.charge >= 1 && this.cur.beaten) { I.consume('back'); this.returnToCrease = true; }
    const btn = ['shot', 'loft', 'block'].find(a => I.pressed(a));
    if (btn) { I.consume(btn); this.batPress(btn, K.batAim ? K.batAim(I, this) : null); }
  },
  /** the striker's special: kettle / longhandle / bludgeon / kerfuffleShot / croquet / grudgeDrive / ecto play themselves
   *  at the perfect moment; certainty shows the timing ring and guarantees GOOD */
  armBatSpecial() {
    const id = this.striker.p.specBat || 'kerfuffleShot';
    this.useSpecial(this.bat, id); this.batSpecialArmed = id; this.cur.batSpecial = id;
    if (id !== 'certainty') {
      const btn = id === 'croquet' || id === 'grudgeDrive' || id === 'ecto' ? 'shot' : 'loft';
      const aim = id === 'grudgeDrive' ? [0, 1] : (K.batAim && this.strikerInput() ? K.batAim(this.strikerInput(), this) : null) || (id === 'croquet' ? dirOf(55, this.hand) : null);
      const t = this.idealPress(btn, aim); this.autoSpecialPress = { t: this.time + (t === null ? .1 : t), btn, aim };
    }
  },
  /** the bat meets the ball at (x, plane, z): clean inside the shot's zone, an edge just outside, else a miss */
  resolveContact(x, plane, z) {
    const sp = this.shotPress, shot = SHOTS[sp.shotId], hand = this.hand, line = -hand * x;
    const zk = this.flags.giantBat > 0 ? 1.4 : 1, l0 = shot.line[0] * zk, l1 = shot.line[1] * zk, z0 = shot.z[0], z1 = shot.z[1] * zk;
    const out = Math.max(l0 - line, line - l1, z0 - z, z - z1, 0);
    const fireBowl = this.fire.bowl > 0 ? 1.4 : 1, vic = this.special === 'vicar' ? 1.5 : 1;
    const edgeZone = T('edge') * 4 * fireBowl * vic;
    if (sp.cheat && sp.cheat.grade) { return this.applyContact('clean', x, plane, z); }
    if (out <= 0) return this.applyContact('clean', x, plane, z);
    if (out <= edgeZone) {
      const kind = z > z1 ? 'top' : z < z0 ? 'bottom' : line > l1 ? 'outside' : 'inside';
      return this.applyContact('edge', x, plane, z, kind, out / Math.max(.01, edgeZone));
    }
    this.cur.beaten = true; this.emit('ball:beaten', { out });
    return false;
  },
  applyContact(kind, x, plane, z, edge, depth) {
    const b = this.ball, sp = this.shotPress, shot = SHOTS[sp.shotId], hand = this.hand, P = this.striker.p;
    const incoming = hyp(b.vx, b.vy, b.vz), grade = sp.grade, special = this.batSpecialArmed;
    const timingF = { perfect: 1, good: .85, early: .6, late: .6 }[grade] || .6;
    const powerF = .7 + (P.power || 5) * .04;
    let theta = sp.sector !== null && sp.sector !== undefined ? sp.sector : shot.nat, speed, launch;
    // hit wicket: a back-foot shot mistimed, rarely (comically)
    if (shot.back && (grade === 'early' || grade === 'late') && RNG.play() < .015 && !special) { this.cur.contact = true; this.contact = { kind: 'hitwicket' }; return this.wicketNow('hit wicket', this.striker.id, null), true; }
    if (kind === 'clean') {
      if (grade === 'good') theta += RNG.normal() * 6;
      if (grade === 'early') theta -= 18;
      if (grade === 'late') theta += theta >= 0 ? 22 : -22;
      theta += RNG.normal() * 2;
      const loft = shot.btn === 'loft';
      speed = shot.speed * powerF * timingF * (1 + .1 * incoming / 386) * T(loft ? 'loftPower' : 'batPower');
      if (this.fire.bat > 0) speed *= 1.2;
      launch = shot.launch + ((grade === 'early' || grade === 'late') ? (loft ? 8 : 4) : 0) + RNG.normal() * (loft ? 2 : .8);
      if (special === 'kettle') speed *= 1.25; if (special === 'longhandle') speed *= 1.4; if (special === 'bludgeon') speed *= 1.4; if (special === 'kerfuffleShot') speed *= 1.2;
      if (special === 'croquet') { speed = Math.max(speed, 470); launch = 1; }
      if (special === 'grudgeDrive') { theta = 0; speed *= 1.3; }
      if (this.flags.giantBat > 0) speed *= 1.08;
    } else {
      // edges: thin to the keeper or slips, thick to third man or gully, inside onto the pad or stumps, top edge skied
      const off = line => line;
      void off;
      if (edge === 'outside') { const thin = depth > .45; theta = thin ? RNG.range(158, 174) : RNG.range(115, 150); speed = incoming * (thin ? RNG.range(.6, .75) : RNG.range(.5, .7)); launch = thin ? RNG.range(6, 13) : RNG.range(1, 5); }
      else if (edge === 'inside') {
        if (Math.abs(x) <= G.STUMP_HALF + 1.2 && RNG.play() < .5) { this.cur.contact = true; this.contact = { kind: 'edge', edge }; this.emit('ball:edge', { edge: 'inside', dragged: true }); return this.bowled('played on'), true; }
        theta = -RNG.range(150, 172); speed = incoming * RNG.range(.35, .5); launch = RNG.range(0, 4);
      } else if (edge === 'top') { theta = (sp.sector !== null ? sp.sector : shot.nat) + RNG.range(-40, 40); if (Math.abs(theta) < 100) theta = sign(theta) * RNG.range(120, 175); speed = RNG.range(150, 230); launch = RNG.range(58, 74); }
      else { theta = RNG.range(-30, 30); speed = RNG.range(30, 80); launch = 0; if (Math.abs(x) <= G.STUMP_HALF + 1 && RNG.play() < .3) { this.cur.contact = true; this.contact = { kind: 'edge', edge }; return this.bowled('played on'), true; } }
      this.cur.edge = edge; this.emit('ball:edge', { edge, thin: edge === 'outside' && depth > .45 });
    }
    let forcedV = null, forcedPass = false;
    if (this.flags.forceShot) { const f = this.flags.forceShot; this.flags.forceShot = null; forcedPass = !!f.pass; if (f.target) { const t = this.ground.targets.find(q => q.id === f.target); if (t) { const tp = this.targetPos(t), D = hyp(tp[0] - x, tp[1] - plane); forcedV = E.arc({ x, y: plane, z }, { x: tp[0], y: tp[1], z: tp[2] }, this.env.g, { time: D / 380 }); theta = thetaOf(tp[0] - x, tp[1] - plane, hand); } } else { theta = f.theta; speed = f.speed; launch = f.launch; } }
    // a well-aimed lofted hit at a stadium target is drawn onto it (the arcade's kindness)
    let assist = null;
    if (kind === 'clean' && shot.btn === 'loft' && (grade === 'perfect' || grade === 'good') && this.kerfuffle) assist = this.targetAssist(theta, speed, launch, x, plane, z);
    const [ux, uy] = dirOf(theta, hand), h = speed * Math.cos(launch * DEG);
    Object.assign(b, { x, y: plane, z: Math.max(z, .5), vx: ux * h, vy: uy * h, vz: speed * Math.sin(launch * DEG), phase: 'hit', carried: true, rolling: false, age: 0, swingA: 0, wobble: 0, groundAt: null, hidden: false, fx: special ? SPECIALS[special].fx : this.fire.bat > 0 ? 'fire' : null, passThrough: special === 'ecto' ? 1 : special === 'croquet' ? 99 : 0 });
    if (assist) Object.assign(b, assist);
    if (forcedV) { b.vx = forcedV.vx; b.vy = forcedV.vy; b.vz = forcedV.vz; }
    if (forcedPass) b.passThrough = 99;
    this.contact = { kind, edge, grade, theta, speed, launch, shot: sp.shotId, special };
    this.cur.contact = true; this.cur.theta = Math.round(theta); this.cur.launch = launch;
    this.striker.anim.contact = true;
    this.triple = null;
    this.emit('bat:contact', { grade, kind, edge, shot: sp.shotId, family: shot.fam, special, speed });
    coverage.mark('shot:' + shot.fam); if (special) coverage.mark('special:' + special);
    this.batSpecialArmed = null; this.flags.chirp = false;
    this.goInPlay(true);
    return true;
  },
  /** snap a lofted hit onto a stadium target within 7 degrees whose distance it can carry */
  targetAssist(theta, speed, launch, x, plane, z) {
    const hand = this.hand;
    for (const t of this.ground.targets) {
      if (this.targetsHit[t.id]) continue;
      const tp = this.targetPos(t), dx = tp[0] - x, dy = tp[1] - plane, th = thetaOf(dx, dy, hand);
      if (Math.abs(wrapAng((th - theta) * DEG)) > 7 * DEG) continue;
      const D = hyp(dx, dy), h = speed * Math.cos(launch * DEG), range = h * 2 * speed * Math.sin(launch * DEG) / this.env.g;
      if (range < D * .82) continue;
      const tt = D / h, vz = (tp[2] - z + .5 * this.env.g * tt * tt) / tt;
      if (vz < h * .2 || vz > h * 1.6) continue;
      return { vx: dx / D * h, vy: dy / D * h, vz, aimed: t.id };
    }
    return null;
  },
  targetPos(t) {
    if (t.moving) { const a = this.time * .12; return [t.at[0] + Math.sin(a) * 220, t.at[1] + Math.cos(a * .7) * 40, t.at[2] + Math.sin(a * 1.3) * 12]; }
    return t.at;
  },
  keeperTakes() {
    const b = this.ball, kp = this.keeper; b.phase = 'dead'; b.vx = b.vy = b.vz = 0; b.x = kp.x; b.y = kp.y; b.z = 10;
    kp.anim = { kind: 'gather', t: 0 }; this.holder = kp; kp.ball = true;
    this.emit('keeper:take', {});
    // a stumping: the striker out of his ground after a miss with the keeper standing up
    const up = this.keeperSpot()[1] > -60, out = this.striker.y > G.CREASE_S + 6;
    if (up && out && this.cur.beaten !== undefined) { this.stumpT = (this.flags.lightning > 0 ? .75 : .25); this.cur.stumpChance = true; return this.goInPlay(false, true); }
    // a caught-behind appeal on a ball that beat the bat close to it
    if (this.cur.beaten && this.shotPress) Umpire.appealCaughtBehind(this, false);
    this.deadBall('keeper');
  },
  bowled(how) {
    const b = this.ball; b.phase = 'dead'; b.vx *= .2; b.vy = Math.abs(b.vy) * .1; b.vz = 30;
    this.cur.stumpsBroken = true;
    this.emit('stumps:broken', { end: 'striker', how, sawn: how === 'sawn' });
    this.wicketNow(how === 'sawn' ? 'bowled' : how === 'played on' ? 'bowled' : 'bowled', this.striker.id, null, { sawn: how === 'sawn', playedOn: how === 'played on' });
    return true;
  },
  /** a wicket falls: recorded on the ball; the ball is dead (unless a free hit saves it) */
  wicketNow(how, batterId, fielderName, extra = {}) {
    if (this.cur.wicket) return;
    this.cur.wicket = Object.assign({ how, batter: batterId, fielder: fielderName, bowler: this.bowlerP.id }, extra);
    this.emit('wicket', { how, batter: batterId, fielder: fielderName, freeHit: this.inn.freeHit });
    coverage.mark('out:' + how);
    this.deadBall('wicket');
  },
  /** into play: the fielders plan their chase, the batters decide on running */
  goInPlay(hit, stumping) {
    this.setPhase('inPlay');
    this.planField();
    if (!stumping) this.planRunning(hit);
  }
});
K.Batting = Batting;

/* ---- 25-play.js ---- */
/* ---- RUNNING AND FIELDING (the ball in play).
 * Running: each batter moves on his own: a goal end (S = the striker's, B = the bowler's), a lane (x +-10), runs
 * counted as both complete a crossing. The human presses run (R1 / Space) to go, again at the crease to turn for
 * another, back (L1 / Shift) to send both back; run near the crease while a throw is coming dives (the bat slides the
 * last 20 units). The AI partner follows the human's call; in co-op both must call within 0.4 s or it's a mix-up.
 * Fielding: on contact the predictor samples the ball every 0.05 s; each fielder's earliest interception picks the
 * chaser (the best) and the backup (the next); the keeper and bowler go to their stumps; the rest hold. Catches:
 * the CPU by a probability, the human by the catch ring (an outer ring shrinking onto an inner one). Throws go by
 * E.arc with an error; a direct hit breaks the stumps; a missed shy with nobody backing up gives overthrows. ---- */
const END_Y = { S: G.CREASE_S, B: G.CREASE_B };
const LANE = { S: 10, B: -10 };
Object.assign(Match.prototype, {
  /* ---- running ---- */
  planRunning(hit) {
    this.running = { calls: [], again: false, runs: 0, started: false, mix: null, t: 0, hit };
    for (const b of this.batters) { b.home = b === this.striker ? 'S' : 'B'; b.goal = null; b.left = null; b.crossings = 0; b.dive = 0; b.slip = 0; b.lane = b.home === 'S' ? LANE.S * (this.hand > 0 ? 1 : -1) : LANE.B * (this.hand > 0 ? 1 : -1); }
    this.callT = 0;
  },
  otherEnd(e) { return e === 'S' ? 'B' : 'S'; },
  grounded(b, end) {
    const reach = b.dive > 0 ? 20 : 6;
    return end === 'S' ? b.y <= END_Y.S + reach : b.y >= END_Y.B - reach;
  },
  /** the end a batter is at (grounded) or null */
  batterEnd(b) { return this.grounded(b, 'S') ? 'S' : this.grounded(b, 'B') ? 'B' : null; },
  startRun(b) {
    if (!this.running || b.goal || this.cur.wicket) return;
    const from = this.batterEnd(b) || b.home;
    b.goal = this.otherEnd(from); b.left = from; b.home = from; b.from = from; b.turning = b.goal ? (b.crossings > 0 ? .25 : 0) : 0;
    if (this.flags.banana > 0 && !this.flags.bananaUsed) { this.flags.bananaUsed = true; this.flags.banana = 0; b.slip = 1; this.emit('item:used', { id: 'banana' }); }
    if (this.flags.forceRunOut) b.slip = 1.4;   // (a scripted run-out: a hesitant start, a yard short)
    this.running.started = true;
    b.anim = { kind: 'run', t: 0 };
  },
  sendBack(b) { if (!b.goal) return; const back = b.left; if (!back) return; b.goal = back; b.turning = .25; },
  /** the human's calls (run / again / dive / back), the AI's, then each batter's legs */
  stepRunning(dt) {
    const R = this.running; if (!R) return;
    R.t += dt;
    const H = this.humansOf(this.bat), autoRun = this.cfg.running === 'auto' || this.cfg.cheat.autoBat;
    if (H.length && !autoRun) {
      for (const b of this.batters) {
        const I = this.batterInput(b), partner = b === this.striker ? this.nonStriker : this.striker, coop = H.length > 1;
        if (!I) continue;
        if (!coop && b !== this.striker) continue;   // one human: the striker's input calls for both
        if (I.pressed('run')) {
          I.consume('run');
          const near = b.goal && Math.abs(b.y - END_Y[b.goal]) < 50, threat = this.thrown || (this.holder && this.holder !== this.keeper);
          if (b.goal && near && threat && b.dive <= 0) { b.dive = .6; this.emit('run:dive', {}); coverage.mark('dive'); }
          else if (!b.goal) { this.startRun(b); this.emit('run:call', { call: 'YES', who: b.id }); if (!coop) this.startRun(partner); else if (!partner.goal) R.mix = { t: .4, caller: b }; }
          else { R.again = true; b.again = true; if (!coop) partner.again = true; }
        }
        if (I.pressed('back')) { I.consume('back'); this.sendBack(b); this.emit('run:call', { call: 'NO', who: b.id }); if (!coop) this.sendBack(partner); }
      }
      if (R.mix) { R.mix.t -= dt; const p = R.mix.caller === this.striker ? this.nonStriker : this.striker; if (p.goal) R.mix = null; else if (R.mix.t <= 0) { this.emit('run:mixup', {}); coverage.mark('mixup'); R.mix = null; } }
    } else AI.stepRunning(this, dt);
    const sp = T('runSpeed') * (this.ground.runSlow || 1) * (this.flags.sandwich === this.bat ? 1.1 : 1) * (this.weather === 'rain' ? .85 : 1);
    for (const b of this.batters) {
      // a batter out of his ground with no run on (a charge that missed) walks back and grounds the bat
      if (!b.goal && !(b.turning > 0) && !this.batterEnd(b) && this.stumpT === null) { const e = Math.abs(b.y - END_Y.S) < Math.abs(b.y - END_Y.B) ? 'S' : 'B'; b.y = approach(b.y, END_Y[e] + (e === 'S' ? -2 : 2), T('runSpeed') * .6 * dt); }
      if (b.dive > 0) b.dive = Math.max(0, b.dive - dt);
      if (b.slip > 0) b.slip = Math.max(0, b.slip - dt);
      if (b.turning > 0) { b.turning -= dt; b.vy = approach(b.vy, 0, 1200 * dt); b.y += b.vy * dt; continue; }
      if (!b.goal) { b.vy = approach(b.vy, 0, 900 * dt); b.y += b.vy * dt; b.oneHand = false; continue; }
      const ty = END_Y[b.goal] + (b.goal === 'S' ? -6 : 6), dir = sign(ty - b.y), v = sp * (b.slip > 0 ? .6 : 1);
      b.vy = approach(b.vy, dir * v, 600 * dt); b.y += b.vy * dt; b.x = approach(b.x, b.lane, 40 * dt);
      b.facing = dir > 0 ? Math.PI / 2 : -Math.PI / 2; b.anim = { kind: b.dive > 0 ? 'dive' : b.slip > 0 ? 'slip' : 'run', t: (b.anim && b.anim.t) || 0 }; b.oneHand = true;
      if ((dir > 0 && b.y >= END_Y.B) || (dir < 0 && b.y <= END_Y.S)) {
        if (b.goal !== b.from) b.crossings++;   // arriving back where the run began (sent back) is no run
        b.home = b.goal; b.left = this.otherEnd(b.goal); b.from = b.goal;
        if (b.dive > 0) b.down = .6;
        b.goal = null;
        const done = Math.min(this.striker.crossings, this.nonStriker.crossings);
        if (done > R.runs && this.striker.home !== this.nonStriker.home) { R.runs = done; this.cur.ran = done; this.emit('runs', { n: done }); }
        if (b.again) { b.again = false; this.startRun(b); }
      }
    }
    R.again = false;
  },
  endRunning(dead) {
    if (!this.running) return;
    for (const b of this.batters) { b.goal = null; b.vy = 0; b.oneHand = false; }
    if (dead) this.running = null;
  },
  anyRunning() { return this.batters.some(b => b.goal || (b.turning > 0)); },
  /* ---- fielding: the plan ---- */
  planField() {
    const b = this.ball;
    if (b.phase === 'dead' || this.holder) { this.samples = []; this.assign(null); return; }
    this.samples = Ball.predict(b, 7, this.env, 6, c => this.outside(c.x, c.y));
    const fs = T('fieldSpeed'), best = [];
    for (const a of this.fielders) {
      if (a.stun > 0) continue;
      const v = fs * (.85 + ((a.p.field && a.p.field.speed) || 5) * .03) * (a.bees ? .7 : 1);
      let found = null;
      for (const s of this.samples) {
        if (this.outside(s.x, s.y)) break;
        const reach = s.z <= 6 ? 6 : s.z <= 40 && s.carried ? 9 : -1; if (reach < 0) continue;
        const d = hyp(a.x - s.x, a.y - s.y);
        if (d <= v * Math.max(0, s.t - .18) + reach) { found = s; break; }
      }
      if (found) best.push({ a, s: found });
    }
    best.sort((p, q) => p.s.t - q.s.t);
    this.assign(best);
  },
  assign(best) {
    for (const a of this.fielders) { a.task = 'hold'; a.chase = null; }
    if (this.bowler) this.bowler.task = 'stumpsB';
    this.keeper.task = 'stumpsS';
    if (!best) return;
    const last = this.samples[this.samples.length - 1];
    let chaser = best[0] ? best[0].a : null, point = best[0] ? best[0].s : null;
    if (!chaser && last) {   // nobody gets there before the rope: the nearest deep fielder chases anyway (it reads well)
      chaser = this.fielders.filter(f => f !== this.keeper).sort((p, q) => hyp(p.x - last.x, p.y - last.y) - hyp(q.x - last.x, q.y - last.y))[0]; point = last;
    }
    if (chaser) { chaser.task = 'chase'; chaser.chase = point; this.chaser = chaser; }
    const second = best.find(e => e.a !== chaser);
    if (second && second.a !== this.keeper) { second.a.task = 'backup'; second.a.chase = second.s; }
    if (chaser === this.keeper) { const k2 = this.fielders.find(f => f.pos === 'slip1' || f.pos === 'shortleg'); if (k2) k2.task = 'stumpsS'; }
    if (chaser === this.bowler) { const mo = this.fielders.find(f => f.pos === 'midoff' || f.pos === 'midon'); if (mo) mo.task = 'stumpsB'; }
    // the human catch ring: an aerial interception (a catch chance) for a human fielding side
    const F = this.fielderInput();
    if (chaser && point && point.carried && point.z >= 2 && point.z <= 40 && F && !this.catchRing) {
      const p = this.catchP(chaser, point);
      if (!(this.cfg.fielding === 'assisted' && p > .85)) { this.catchRing = { tc: this.time + point.t, t0: this.time + Math.max(0, point.t - T('catchRing')), fielder: chaser, press: null, juggle: 0, p }; this.emit('catch:ring', { fielder: chaser.id }); }
    }
  },
  catchP(a, s) {
    const c = (a.p.field && a.p.field.catch) || 5, sp = hyp(s.vx || 0, s.vy || 0, s.vz || 0), dive = hyp(a.x - s.x, a.y - s.y) > T('fieldSpeed') * Math.max(0, s.t - .18) ? 1 : 0;
    const dm = { village: .92, county: 1, test: 1.03, kerfuffle: 1.03 }[this.cfg.difficulty] || 1;
    return clamp((.55 + c * .045) * dm - .2 * (sp / 400) - .25 * dive, .05, .97);
  },
  /* ---- the ball in play ---- */
  phase_inPlay(dt) {
    const b = this.ball;
    this.stepRunning(dt);
    // the ball: held, thrown or loose
    if (this.holder) { const h = this.holder; b.x = h.x + Math.cos(h.facing) * 3; b.y = h.y + Math.sin(h.facing) * 3; b.z = 14; b.vx = b.vy = b.vz = 0; }
    else {
      const y0 = b.y, x0 = b.x, z0 = b.z;
      Ball.step(b, dt, this.env);
      this.netCollide(x0, y0, z0);
      this.checkTargets(x0, y0, z0);
      this.checkTokens();
      this.chaosBall(dt);
      if (this.thrown) this.stepThrow(x0, y0, z0);
      if (this.phase !== 'inPlay') return;
      if (this.outside(b.x, b.y) && !this.thrown) return this.boundary();
      if (this.thrown && this.outside(b.x, b.y)) return this.boundary(true);
    }
    // the stumping: the keeper whips the bails off unless the striker is back in his ground
    if (this.stumpT !== undefined && this.stumpT !== null) {
      this.stumpT -= dt;
      const s = this.striker;
      if (this.returnToCrease || (!this.strikerInput() || this.cfg.cheat.autoBat) && this.pt > .15) { s.y = approach(s.y, G.CREASE_S, T('runSpeed') * dt); s.anim = { kind: 'run', t: this.pt }; }
      if (this.stumpT <= 0) {
        this.stumpT = null; this.keeper.anim = { kind: 'stump', t: 0 };
        this.emit('stumps:broken', { end: 'S', how: 'stumped' });
        if (s.y > G.CREASE_S + 6) { const margin = (s.y - G.CREASE_S - 6) / T('runSpeed'); if (margin < .15) this.cur.third = { kind: 'stumped', margin }; return this.wicketNow('stumped', s.id, this.keeper.p.short.toLowerCase()); }
        return this.deadBall('settled');
      }
      return;
    }
    // the catch ring (a human fielding side)
    const CR = this.catchRing, F = this.fielderInput();
    if (CR && F && this.time >= CR.t0 && CR.press === null && (F.pressed('shot') || F.pressed('confirm'))) { F.consume('shot'); CR.press = this.time; }
    // fielders
    const fs = T('fieldSpeed');
    for (const a of this.fielders) {
      if (a.stun > 0) { a.stun -= dt; continue; }
      if (a === this.holder) continue;
      const v = fs * (.85 + ((a.p.field && a.p.field.speed) || 5) * .03) * (a.bees ? .7 : 1);
      if (a.task === 'chase' && !this.holder && !this.thrown) {
        const man = this.cfg.fielding === 'manual' && F && a === this.chaser;
        if (man) { const mv = F.move(), d = K.view ? K.view.screenDirToGround(mv[0], mv[1]) : mv; if (hyp(d[0], d[1]) > .1) { a.vx = d[0] * v; a.vy = d[1] * v; a.x += a.vx * dt; a.y += a.vy * dt; a.facing = Math.atan2(d[1], d[0]); a.anim = { kind: 'chase', t: this.pt }; } else this.moveActor(a, b.x, b.y, v * .5, dt); }
        else { const near = hyp(a.x - b.x, a.y - b.y) < 40 || !a.chase; this.moveActor(a, near ? b.x : a.chase.x, near ? b.y : a.chase.y, v, dt); a.anim = { kind: 'chase', t: this.pt }; }
      } else if (a.task === 'backup' && a.chase && !this.holder) { this.moveActor(a, a.chase.x + (a.chase.x - this.striker.x) * .12, a.chase.y + (a.chase.y - this.striker.y) * .12, v * .9, dt); a.anim = { kind: 'chase', t: this.pt }; }
      else if (a.task === 'stumpsS') { this.moveActor(a, a === this.keeper ? 0 : -8, -8, v * 1.1, dt); a.anim = { kind: 'ready', t: 0 }; }
      else if (a.task === 'stumpsB') { this.moveActor(a, a === this.bowler ? 4 : 10, G.BOWL_Y + 8, v, dt); a.anim = { kind: 'ready', t: 0 }; }
      else { a.anim = { kind: 'ready', t: 0 }; }
      // reaching the ball
      if (!this.holder && !this.thrown && a.task !== 'hold' && this.phase === 'inPlay') this.tryField(a, dt);
      if (this.phase !== 'inPlay') return;
    }
    // a thrown ball reaching a fielder (a relay or the keeper's take is handled by stepThrow)
    if (this.holder) this.holderStep(dt);
    // settled: dead ball
    const h = this.holder, still = !this.anyRunning() && this.batters.every(bt => this.batterEnd(bt));
    if (h && still) {
      this.settleT += dt;
      const nearStumps = h === this.keeper || h === this.bowler || hyp(h.x, h.y) < 32 || hyp(h.x, h.y - G.BOWL_Y) < 32;
      if (this.settleT > (nearStumps ? .8 : 1.6)) return this.deadBall('settled');
    } else this.settleT = 0;
    if (!this.holder && !this.thrown && b.rolling && b.vx === 0 && b.vy === 0 && this.pt > 4) { const near = this.fielders.slice().sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0]; if (near && near.task !== 'chase') { near.task = 'chase'; near.chase = { x: b.x, y: b.y, t: 1 }; } }
    if ((this.pt > 1 && Math.floor(this.pt * 2) !== Math.floor((this.pt - dt) * 2)) && !this.holder && !this.thrown) this.planField();
  },
  /** a fielder near the ball: a catch (carried, in the air), a stop on the ground, a misfield, or it passes through */
  tryField(a, dt) {
    const b = this.ball, d = hyp(a.x - b.x, a.y - b.y), aerial = b.carried && b.z >= 2 && b.z <= 40, ground = b.z <= 8;
    const CR = this.catchRing, ringMine = CR && CR.fielder === a;
    if (ringMine && (aerial || CR.holding)) {
      const w = T('catchWindow') / 1000;
      if (CR.press !== null && (d <= 9 || CR.holding)) return this.resolveRing(a);
      if (this.time < CR.tc - .02) return;
      if (this.time < CR.tc + w) { CR.holding = true; b.x = a.x + Math.cos(a.facing) * 4; b.y = a.y + Math.sin(a.facing) * 4; b.z = Math.max(b.z, 12); b.vx = b.vy = b.vz = 0; b.carried = true; a.anim = { kind: 'catch', t: 0 }; return; }
      return this.resolveRing(a);
    }
    if (!(d <= (aerial ? 9 : 6) && (aerial || ground))) return;
    if (a.ghost && this.flags.ghostPhase && this.flags.ghostPhase.id === a.id) { if (!a.phased) { a.phased = true; this.emit('chaos:phase', { who: a.p.name }); coverage.mark('ghostphase'); } return; }
    if (a.passed) return;   // the ball went through this one: it can't touch it again
    if (b.passThrough > 0) { a.passed = true; b.passThrough--; this.emit('fx:passThrough', { who: a.p.name }); return; }
    if (aerial) {
      const guaranteed = this.useItem(this.bowlSide, 'sticky', 'catch') || this.flags.tray > 0 || this.cfg.cheat.catches || this.cfg.cheat.catchesOnce;
      this.cfg.cheat.catchesOnce = false;
      if (this.flags.tray > 0) this.flags.tray = 0;
      const p = this.catchP(a, Object.assign({ t: .3, vx: b.vx, vy: b.vy, vz: b.vz }, b));
      if (guaranteed || RNG.play() < p) return this.caught(a, d > 6);
      return this.dropped(a);
    }
    // a ground stop (a misfield lets it through)
    const mis = (1 - ((a.p.field && a.p.field.ground) || 5) / 10) * .1;
    if (!this.cfg.cheat.catches && RNG.play() < mis && hyp(b.vx, b.vy) > 80) { a.stun = .4; b.vx *= .55; b.vy *= .55; a.anim = { kind: 'fumble', t: 0 }; this.emit('field:misfield', { who: a.p.short }); this.planField(); return; }
    if (d > 4 && hyp(b.vx, b.vy) > 120) { a.anim = { kind: 'divestop', t: 0 }; a.down = .5; this.emit('field:dive', {}); }
    this.gather(a);
  },
  gather(a) {
    const b = this.ball; this.holder = a; a.ball = true; a.gatherT = this.time; b.vx = b.vy = b.vz = 0; b.rolling = false; b.carried = false;
    if (a.anim.kind !== 'divestop') a.anim = { kind: 'gather', t: 0 };
    this.catchRing = null;
    this.emit('field:gather', { who: a.p.short });
    this.throwDecided = false;
  },
  resolveRing(a) {
    const CR = this.catchRing, w = T('catchWindow') / 1000, d = CR.press === null ? Infinity : Math.abs(CR.press - CR.tc);
    const guaranteed = this.useItem(this.bowlSide, 'sticky', 'catch') || this.flags.tray > 0;
    if (this.flags.tray > 0) this.flags.tray = 0;
    this.catchRing = null;
    if (guaranteed || d <= w) { const screamer = d <= w * .35 && hyp(a.x - this.ball.x, a.y - this.ball.y) > 5; return this.caught(a, screamer, d <= w * .35 ? 'perfect' : 'good'); }
    if (d <= w * 2.2 && !CR.juggle) { this.emit('catch:juggle', {}); if (RNG.play() < .5) return this.caught(a, false, 'juggle'); }
    return this.dropped(a);
  },
  caught(a, dive, grade) {
    const b = this.ball; this.holder = a; a.ball = true; b.vx = b.vy = b.vz = 0; b.phase = 'dead';
    a.anim = { kind: dive ? 'divecatch' : 'catch', t: 0 }; if (dive) a.down = .8;
    this.cur.catchGrade = grade || null; this.cur.screamer = !!dive && grade === 'perfect';
    if (this.cur.screamer) this.emit('catch:screamer', { who: a.p.short });
    const behind = (a === this.keeper || (a.pos && a.pos.startsWith('slip'))) && this.contact && this.contact.edge === 'outside';
    if (behind) { Umpire.appealCaughtBehind(this, true, a); return; }
    // a catch where the ball touched the ground within 0.05 s goes upstairs
    if (b.groundAt !== null && b.groundAt !== undefined && Math.abs(b.age - b.groundAt) < .05) this.cur.third = { kind: 'caught', margin: Math.abs(b.age - b.groundAt) };
    this.wicketNow('caught', this.striker.id, a === this.keeper ? 'wk ' + a.p.short.toLowerCase() : a.p.short.toLowerCase(), { catcher: a.id, dive: !!dive });
  },
  dropped(a) {
    const b = this.ball; a.anim = { kind: 'drop', t: 0 }; a.stun = .5;
    const ang = RNG.play() * TAU; b.vx = Math.cos(ang) * 40 + b.vx * .15; b.vy = Math.sin(ang) * 40 + b.vy * .15; b.vz = 30; b.carried = false;
    this.cur.dropped = (this.cur.dropped || 0) + 1;
    this.emit('catch:dropped', { who: a.p.short }); coverage.mark('dropped');
    this.planField();
  },
  /* ---- throws ---- */
  holderStep(dt) {
    const h = this.holder, F = this.fielderInput(), human = F && this.cfg.fielding !== 'auto';
    if (this.stumpT !== null && this.stumpT !== undefined) return;
    const since = this.time - (h.gatherT || 0);
    if (since < .22) return;
    const running = this.anyRunning();
    if (h === this.keeper || h === this.bowler) {
      // at the stumps: break them if a batter is short of his ground at this end
      const end = h === this.keeper ? 'S' : 'B', ey = end === 'S' ? 0 : G.BOWL_Y;
      if (hyp(h.x, h.y - ey) < 16 && this.runOutCandidate(end)) { this.breakStumps(end, h, false); return; }
      if (running && !this.throwDecided && hyp(h.x, h.y - ey) >= 16) { const o = this.bestThrow(h); if (o) this.throwTo(o, h); }
      return;
    }
    if (human) {
      const ends = { shot: 'S', loft: 'B', block: 'K' }, pick = Object.keys(ends).find(k => F.pressed(k));
      let to = pick ? ends[pick] : null;
      const clk = K.clickEnd && K.clickEnd(F); if (clk) to = clk;
      if (to) { F.consume(pick || 'shot'); this.throwTo(to, h, since < .52); return; }
      if (since > 1.6) this.throwTo('K', h);
      return;
    }
    if (this.throwDecided) return;
    const o = this.bestThrow(h);
    if (o) this.throwTo(o, h, false);
    else if (!running && since > .6) { this.throwDecided = true; if (hyp(h.x, h.y) > 80 && hyp(h.x, h.y - G.BOWL_Y) > 80) this.throwTo('K', h); }
  },
  /** the end with the best run-out chance (CPU), or null when there's no point throwing yet */
  bestThrow(h) {
    let best = null, bm = -Infinity;
    for (const end of ['S', 'B']) {
      const sy = end === 'S' ? 0 : G.BOWL_Y, d = hyp(h.x, h.y - sy), tt = .25 + d / T('throwSpeed');
      const runner = this.batters.find(b => b.goal === end);
      if (!runner) continue;
      const tb = Math.abs(runner.y - END_Y[end]) / T('runSpeed');
      if (tb - tt > bm) { bm = tb - tt; best = end; }
    }
    if (best && bm > -.4) return best;
    if (this.anyRunning()) return hyp(h.x, h.y) < hyp(h.x, h.y - G.BOWL_Y) ? 'S' : 'B';
    return null;
  },
  /** throw to the striker's end (S), the bowler's (B) or a lob to the keeper (K); rocket: a quick release is 20% faster */
  throwTo(to, h, rocket) {
    const b = this.ball; this.throwDecided = true;
    const end = to === 'K' ? 'S' : to, sy = end === 'S' ? 0 : G.BOWL_Y, d = hyp(h.x, h.y - sy);
    const err = to === 'K' ? 0 : RNG.normal() * T('throwError') * d / 480 * (1.3 - ((h.p.field && h.p.field.throw) || 5) * .06) * (this.cfg.cheat.directHit || this.cfg.cheat.directHitOnce ? 0 : 1);
    const tgt = to === 'K' ? { x: this.keeper.x, y: this.keeper.y, z: 12 } : { x: err, y: sy + (end === 'S' ? 1 : -1) * Math.abs(err) * .2, z: 6 };
    const speed = T('throwSpeed') * (rocket ? 1.2 : 1) * (.8 + ((h.p.field && h.p.field.throw) || 5) * .04);
    const v = E.arc({ x: b.x, y: b.y, z: 14 }, tgt, this.env.g, { speed });
    Object.assign(b, { z: 14, vx: v.vx, vy: v.vy, vz: v.vz, phase: 'hit', carried: false, rolling: false });
    // a throw flies past the stumps by design: aim beyond them so a miss runs on
    this.holder = null; h.ball = false; h.anim = { kind: 'throw', t: 0 };
    this.thrown = { to, end, from: h, t: 0, lob: to === 'K', rocket, side: sign(b.y - sy) || 1 };
    this.emit('field:throw', { to, rocket });
  },
  stepThrow(x0, y0, z0) {
    const b = this.ball, th = this.thrown, end = th.end, sy = end === 'S' ? 0 : G.BOWL_Y;
    th.t += 1 / 120;
    // a direct hit: the ball's path crosses the stumps
    const crossed = (y0 - sy) * (b.y - sy) <= 0;
    if (crossed && !th.lob) {
      const f = (y0 - sy) / ((y0 - b.y) || 1e-6), x = lerp(x0, b.x, f), z = lerp(z0, b.z, f);
      if (Math.abs(x) <= G.STUMP_HALF + G.BALL_R && z <= G.STUMP_H + 1) { b.vx *= .3; b.vy *= -.2; this.thrown = null; this.emit('field:directHit', {}); coverage.mark('directhit'); return this.breakStumps(end, th.from, true); }
    }
    // the keeper or bowler (or whoever minds the stumps) takes it
    const minders = this.fielders.filter(a => a !== th.from && (a.task === (end === 'S' ? 'stumpsS' : 'stumpsB') || (th.lob && a === this.keeper)));
    for (const m of minders) if (hyp(m.x - b.x, m.y - b.y) < 12 && b.z < 30) { this.thrown = null; this.gather(m); m.gatherT = this.time - .2; return; }
    // a missed shy with nobody backing up: overthrows
    const past = (b.y - sy) * th.side < -20;   // gone beyond the stumps, whichever side it came from
    if (past && th.t > .1) { this.thrown = null; this.cur.overthrows = true; this.emit('field:overthrow', {}); coverage.mark('overthrow'); b.vx *= .7; b.vy *= .7; this.planField(); }
    if (th.t > 3) { this.thrown = null; this.planField(); }
  },
  /** the batter short of his ground at an end, if any (making for it, or having left it) */
  runOutCandidate(end) {
    const heading = this.batters.filter(b => b.goal === end && !this.grounded(b, end));
    if (heading.length) return heading.sort((p, q) => Math.abs(p.y - END_Y[end]) - Math.abs(q.y - END_Y[end]))[0];
    if (this.batters.some(b => this.grounded(b, end))) return null;
    const left = this.batters.filter(b => b.left === end && !this.grounded(b, end));
    return left[0] || null;
  },
  breakStumps(end, by, direct) {
    this.emit('stumps:broken', { end, how: direct ? 'direct' : 'gathered' });
    const out = this.runOutCandidate(end);
    if (!out) { if (this.holder !== by && !this.holder) { /* it runs on, or the minder picks it up */ } this.settleT = 0; return; }
    const reach = out.dive > 0 ? 20 : 6, short = Math.abs(out.y - END_Y[end]) - reach, margin = Math.max(0, short) / T('runSpeed');
    if (margin < .15 || this.cfg.cheat.thirdUp) { this.cur.third = { kind: 'run out', margin: Math.min(margin, .12) }; this.cfg.cheat.thirdUp = false; }
    this.wicketNow('run out', out.id, by && by.p ? by.p.short.toLowerCase() : null, { end: end === 'S' ? 'striker' : 'bowler', direct: !!direct });
  },
  /* ---- the Nets: the practice lane's back net (y -40, x within 26) and its side nets (x +-26, y -40 to 40) stop a ball
   * behind or beside the batter; it drops at the net's foot ---- */
  netCollide(x0, y0, z0) {
    if (!this.ground.nets) return false;
    const b = this.ball, H = 50, Y0 = -40, Y1 = 40, X = 26;
    if (b.z > H) return false;
    if (y0 > Y0 && b.y <= Y0 && Math.abs(b.x) <= X) { b.y = Y0 + .5; b.vy = Math.abs(b.vy) * .15; b.vx *= .3; b.vz = Math.min(b.vz, 0); b.carried = false; this.emit('net:hit', { side: 'back' }); coverage.mark('net'); return true; }
    for (const s of [-1, 1]) if ((x0 - s * X) * (b.x - s * X) <= 0 && b.y >= Y0 && b.y <= Y1 && Math.abs(x0) < X + 1) { b.x = s * (X - .5); b.vx = -b.vx * .15; b.vy *= .3; b.carried = false; this.emit('net:hit', { side: s < 0 ? 'left' : 'right' }); coverage.mark('net'); return true; }
    return false;
  },
  /* ---- the rope ---- */
  boundary(viaThrow) {
    const b = this.ball, six = b.carried && !viaThrow, n = six ? 6 : 4;
    this.cur.boundary = n; this.cur.ran = 0;
    this.emit('boundary', { n, contact: !!this.cur.contact, x: b.x, y: b.y });
    coverage.mark(six ? 'six' : 'four');
    if (!this.cur.contact) coverage.mark('byes4');
    // the ball keeps flying for the show (into the stands, a target, the sea or the pub)
    this.ballFlying = six ? 2.5 : 1;
    this.deadBall('boundary');
  }
});

/* ---- 26-umpire.js ---- */
/* ---- UMPIRING AND DISMISSALS. LBW truth: (1) pitched outside leg -> not out; (2) impact outside off with a shot
 * offered -> not out (and impact outside leg -> not out); (3) the predictor continues from the impact with the pad
 * removed: does it hit the stumps (inflated by the ball's radius)? Within a unit of the edge it's UMPIRE'S CALL (the
 * on-field decision stands). The on-field umpire is right with probability umpire.accuracy (Rev. Hollis .86). The
 * Kerfuffle Review System: one review per side per innings, 4 s to press special (REVIEW); Owl-Eye replays it.
 * The third umpire takes run-outs and stumpings decided by under 0.15 s, and catches that touched the ground. ---- */
const Umpire = {
  /** the ball has struck the pad: decide whether it is an LBW appeal (true: the ball is dead, a decision pending) */
  lbwCandidate(m) {
    const b = m.ball, hand = m.hand, ph = m.padHit, inn = m.inn;
    const pitchLine = b.pitchAt ? -hand * b.pitchAt[0] : 0, impactLine = -hand * ph.x, R = G.STUMP_HALF + G.BALL_R;
    // the path with the pad removed
    const c = Ball.copy(b); let hit = null; const path = [];
    for (let i = 0; i < 240; i++) { const y0 = c.y, x0 = c.x, z0 = c.z; Ball.step(c, G.STEP, m.env); if (i % 2 === 0) path.push([c.x, c.y, c.z]); if (c.y <= 0) { const f = y0 / Math.max(1e-6, y0 - c.y); hit = { x: lerp(x0, c.x, f), z: lerp(z0, c.z, f) }; break; } }
    const wx = hit ? Math.abs(hit.x) : 99, wz = hit ? hit.z : 99, edgeD = Math.min(R - wx, G.STUMP_H + G.BALL_R - wz);
    const wickets = hit ? (edgeD >= 0 ? (edgeD < 1 ? 'umpire' : 'hitting') : (edgeD > -1 ? 'umpire' : 'missing')) : 'missing';
    const pitching = b.pitchAt ? (pitchLine < -R ? 'outside leg' : 'in line') : 'full toss';
    const shot = !!m.shotPress;
    const impact = impactLine > R ? (shot ? 'outside off' : 'outside off (no shot)') : impactLine < -R ? 'outside leg' : 'in line';
    let truth = wickets !== 'missing' && pitching !== 'outside leg' && impact !== 'outside leg' && impact !== 'outside off';
    const umpCall = truth ? wickets === 'umpire' : wickets === 'umpire' && pitching !== 'outside leg' && impact !== 'outside leg' && impact !== 'outside off';
    const close = hit && wx < R + 8 && wz < G.STUMP_H + 8;
    if (!truth && !close) return false;
    // the appeal: HOWZAT!
    const U = m.umpireData(), acc = clamp(U.accuracy + (m.special === 'grudge' ? .1 : 0), 0, 1);
    let given = RNG.play() < acc ? truth : !truth;
    if (m.cfg.cheat.lbwGiven !== undefined) { given = m.cfg.cheat.lbwGiven; m.cfg.cheat.lbwGiven = undefined; }
    if (umpCall && m.cfg.mode !== 'attract') given = RNG.play() < .5;
    b.phase = 'dead'; b.vx *= -.1; b.vy *= -.1; b.vz = 20;
    m.decision = { kind: 'lbw', truth: umpCall ? given : truth, given, umpCall, pending: true, umpT: .9 + (U.slowFinger || .5), t: 0, reviewable: true, owl: { path, pitch: b.pitchAt && b.pitchAt.slice(), impact: [ph.x, ph.y, ph.z], pitching, impact2: impact, wickets, hit }, side: m.bowlSide };
    m.cur.appeals.push('lbw'); m.emit('appeal', { kind: 'lbw' });
    if (given) m.cur.wicket = { how: 'lbw', batter: m.striker.id, fielder: null, bowler: m.bowlerP.id, pending: true };
    void inn;
    m.deadBall('appeal');
    return true;
  },
  /** a caught-behind appeal: edged (a real catch off a thin edge) or not (beaten close to the bat, taken by the keeper) */
  appealCaughtBehind(m, edged, catcher) {
    const U = m.umpireData(), acc = U.accuracy;
    let given = edged ? RNG.play() < acc + (1 - acc) * .4 : RNG.play() < (1 - acc) * .6;
    if (m.cfg.cheat.cbGiven !== undefined) { given = m.cfg.cheat.cbGiven; m.cfg.cheat.cbGiven = undefined; }
    if (!edged && !given && RNG.play() > .3) { m.deadBall('keeper'); return; }
    m.decision = { kind: 'caught', truth: edged, given, umpCall: false, pending: true, umpT: .7 + (U.slowFinger || .5) * .6, t: 0, reviewable: true, side: m.bowlSide };
    m.cur.appeals.push('caught'); m.emit('appeal', { kind: 'caught' });
    if (given) m.cur.wicket = { how: 'caught', batter: m.striker.id, fielder: catcher ? (catcher === m.keeper ? 'wk ' : '') + catcher.p.short.toLowerCase() : 'wk ' + m.keeper.p.short.toLowerCase(), bowler: m.bowlerP.id, pending: true, catcher: catcher ? catcher.id : m.keeper.id };
    m.deadBall('appeal');
  },
  /** each step of a dead ball: the finger (or not), the review window, the review, the third umpire */
  stepDecision(m, dt) {
    const d = m.decision, inn = m.inn;
    if (!d && m.cur.third && !m.cur.thirdDone) { m.cur.thirdDone = true; m.decision = { kind: 'third', third: m.cur.third.kind, truth: !!m.cur.wicket, given: !!m.cur.wicket, pending: true, umpT: 3.4, t: 0, reviewable: false }; m.emit('review:start', { kind: 'third', what: m.cur.third.kind }); coverage.mark('third'); return; }
    if (!d) return;
    d.t += dt;
    if (d.pending && d.t >= d.umpT) {
      d.pending = false;
      if (d.kind === 'third') { m.emit('review:result', { kind: 'third', out: d.truth }); m.emit('decision', { out: d.truth, kind: 'third' }); return; }
      m.emit('decision', { out: d.given, kind: d.kind });
      Umpire.signal(m, d.given ? 'out' : 'notout');
      const side = d.given ? m.bat : m.bowlSide;
      if (d.reviewable && m.reviews[side] > 0 && m.cfg.mode !== 'hub') { m.reviewWindow = 4; d.reviewSide = side; }
    }
    if (m.reviewWindow > 0) {
      m.reviewWindow -= dt;
      const side = d.reviewSide, H = m.humansOf(side), I = H.length ? (side === m.bat ? m.strikerInput() : m.bowlerInput()) : null;
      let ask = false;
      if (I && !(side === m.bat ? m.cfg.cheat.autoBat : m.cfg.cheat.autoBowl)) { if (I.pressed('special')) { I.consume('special'); ask = true; } }
      else if (m.reviewWindow < 3.2 && !d.cpuThought) { d.cpuThought = true; const wrong = d.truth !== d.given && !d.umpCall; ask = m.cfg.cheat.review !== undefined ? m.cfg.cheat.review : wrong ? RNG.play() < .8 : RNG.play() < .06; m.cfg.cheat.review = undefined; }
      if (ask) Umpire.review(m);
      else if (m.reviewWindow <= 0) { m.reviewWindow = 0; }
    }
    if (d.reviewing) {
      d.rt += dt;
      if (d.rt >= d.rlen) {
        d.reviewing = false;
        const final = d.umpCall ? d.given : d.truth, overturned = final !== d.given;
        if (!overturned) m.reviews[d.reviewSide] = Math.max(0, m.reviews[d.reviewSide] - 1);
        d.final = final; d.overturned = overturned;
        if (final && !m.cur.wicket) m.cur.wicket = { how: d.kind, batter: m.striker.id, fielder: d.kind === 'caught' ? 'wk ' + m.keeper.p.short.toLowerCase() : null, bowler: m.bowlerP.id };
        if (!final && m.cur.wicket && m.cur.wicket.how === d.kind) m.cur.wicket = null;
        if (final !== d.given) d.out = final;
        m.emit('review:result', { kind: d.kind, out: final, overturned, umpCall: d.umpCall, side: d.reviewSide });
        if (overturned) coverage.mark('review:overturned');
        Umpire.signal(m, final ? 'out' : 'notout');
        m.pt = Math.max(0, m.deadT - 1.6);
      }
    }
    if (m.cur.wicket && m.cur.wicket.pending && !d.pending && m.reviewWindow <= 0 && !d.reviewing) { m.cur.wicket.pending = false; m.emit('wicket', { how: m.cur.wicket.how, batter: m.cur.wicket.batter, fielder: m.cur.wicket.fielder }); coverage.mark('out:' + m.cur.wicket.how); }
    void inn;
  },
  review(m) {
    const d = m.decision; m.reviewWindow = 0; d.reviewing = true; d.rt = 0; d.rlen = d.kind === 'lbw' ? 6.5 : 4.5;
    m.emit('review:start', { kind: d.kind, side: d.reviewSide }); coverage.mark('review');
    Umpire.signal(m, 'review');
  },
  signal(m, sig) { const u = m.umpires[0]; if (u) u.anim = { kind: 'signal', sig, t: 0 }; m.signal = sig; m.emit('signal', { sig }); },
  /** the umpire's signal for the ball just dead (OUT comes with the decision) */
  signalFor(m) {
    const c = m.cur;
    if (m.decision) return;
    if (c.wicket && !c.third) return Umpire.signal(m, 'out');
    if (c.boundary === 6) return Umpire.signal(m, 'six');
    if (c.boundary === 4) return Umpire.signal(m, c.contact ? 'four' : 'bye');
    if (c.extras.wd) return Umpire.signal(m, 'wide');
    if (c.extras.nb) return Umpire.signal(m, 'noball');
    if (!c.contact && c.ran) return Umpire.signal(m, c.padded ? 'legbye' : 'bye');
    if (m.inn.freeHit) return;
    if (c.dead === 'cap') return Umpire.signal(m, 'dead');
  }
};
Match.prototype.umpireData = function () { return UMPIRES[this.ground.umpire] || UMPIRES.neutral; };
K.Umpire = Umpire;

/* ---- 27-ai.js ---- */
/* ---- THE CPU: captain (bowler and field), bowler (a plan per batter), batter (reads the ball through the predictor
 * plus a perception error, chooses an intent from the match situation, finds a gap) and runner (compares the batters'
 * time to the next crease with the fielding side's quickest way to break the stumps). Forced outcomes (dev mode's
 * "force next outcome", the attract mode's scripted showreel) steer the same code: a chosen delivery, a chosen shot and
 * grade, a guaranteed catch or direct hit. Everything goes through the same entry points a human's input reaches. ---- */
const AI = {
  pickBowler(m, opts) {
    const last = m.lastBowler ? playerById(m.lastBowler) : null, lastFam = last && last.bowl ? last.bowl.type : null;
    let best = opts[0], bs = -1e9;
    for (const p of opts) {
      if (!p.bowl) continue;
      let s = p.bowl.skill + (p.bowl.type !== lastFam ? 2 : 0) + (p.bowl.type === 'spin' && m.ground.pitch.turn > 1.2 ? 2 : 0) + (p.bowl.type === 'swing' && m.weather === 'overcast' ? 2 : 0) + (p.bowl.type === 'pace' && m.ground.pitch.bounce > 1.1 ? 1.5 : 0);
      s += RNG.play() * 1.5;
      if (s > bs) { bs = s; best = p; }
    }
    return best;
  },
  pickField(m) {
    const fam = m.bowlerP && m.bowlerP.bowl ? m.bowlerP.bowl.type : 'medium', inn = m.inn, need = m.need();
    if (fam === 'spin' && RNG.play() < .6) return 'spin';
    if (need && need.balls <= 6 && need.runs > need.balls) return 'defensive';
    if (!need && inn && inn.balls >= inn.overs * 6 - 6) return 'defensive';
    const s = m.striker && inn ? Rules.card(inn, m.striker.id) : null;
    if (s && s.balls < 3) return 'attacking';
    return 'balanced';
  },
  /** the CPU bowler's next ball: { id, tx, ty, special, grade, meterT } (also written to m.cpuPlan) */
  planBowling(m) {
    const p = m.bowlerP, fam = p.bowl ? p.bowl.type : 'medium', ds = m.deliveryChoices, hand = m.hand, inn = m.inn, skill = (p.bowl && p.bowl.skill) || 5;
    const f = m.force.outcome;
    let id = ds[0], len = 90, line = -hand * 4;
    const balls = inn.balls, last = inn.overs * 6 - balls <= 6;
    const r = RNG.play();
    if (fam === 'pace' || fam === 'machine') { if (last && r < .4) id = ds.find(d => DELIVERIES[d].len[1] < 30) || ds[0]; else if (r < .2) id = ds.find(d => DELIVERIES[d].len[0] >= 140) || ds[0]; else id = ds[0]; }
    else id = ds[Math.floor(RNG.play() * ds.length)];
    const D = DELIVERIES[id];
    len = RNG.range(D.len[0], D.len[1]);
    line = -hand * (fam === 'spin' ? RNG.range(2, 10) : RNG.range(0, 7));
    if (D.turn) line += hand * D.turn * .5 * (D.turn > 0 ? 1 : -1) * .4;
    const kerf = m.cfg.difficulty === 'kerfuffle', ready = m.specialReady(m.bowlSide, 'bowl', kerf ? 70 : 100);
    let special = ready && (last || RNG.play() < .35) && m.kerfuffle && !m.isHuman(m.bowlSide);
    const gr = RNG.play(), pg = .42 + skill * .045, grade = gr < pg ? 'green' : gr < pg + .42 ? 'amber' : gr < .985 ? 'red' : 'over';
    const plan = { id, tx: line, ty: G.CREASE_S + len, special, grade: special ? 'green' : grade, meterT: .25 / T('meterSpeed') };
    if (f) AI.forcedBowling(m, plan, f);
    m.cpuPlan = plan;
    return plan;
  },
  /** a forced outcome's delivery */
  forcedBowling(m, plan, f) {
    const hand = m.hand, ds = m.deliveryChoices;
    plan.special = !!f.special; plan.grade = f.kind === 'noball' ? 'over' : 'green'; plan.straight = ['bowled', 'lbw', 'review', 'stumped', 'edge', 'caughtbehind', 'leave'].includes(f.kind);
    const set = (id, x, y) => { plan.id = ds.includes(id) ? id : (id && DELIVERIES[id] ? id : ds[0]); plan.tx = x; plan.ty = G.CREASE_S + y; };
    switch (f.kind) {
      case 'bowled': set(f.delivery || ds[0], hand > 0 ? -2.5 : 0, 55); break;   // (lines that miss the pad and hit the stumps, from over the wicket)
      case 'lbw': case 'review': set(f.delivery || ds[0], hand > 0 ? .5 : -3, 8); break;
      case 'stumped': set(ds.find(d => DELIVERIES[d].fam === 'spin') || ds[0], -hand * 9, 70); break;
      case 'edge': case 'caughtbehind': set(f.delivery || ds[0], -hand * 9, 80); break;
      case 'wide': set(ds[0], -hand * 40, 70); break;
      case 'bouncer': set(ds.find(d => DELIVERIES[d].len[0] >= 140) || ds[0], -hand * 2, 165); break;
      case 'yorker': set(ds.find(d => DELIVERIES[d].len[1] < 30) || ds[0], 0, 8); break;
      default: set(f.delivery || ds[0], f.line !== undefined ? f.line * -hand : -hand * 3, f.len || 45);
    }
    if (f.special) plan.special = true;
  },
  planBatting(m) {
    m.batPlan = null;
    if (m.strikerInput() && !m.cfg.cheat.autoBat && !m.force.outcome) return;
    m.batPlan = { decideAt: m.time + .27 + RNG.play() * .03, decided: false };
  },
  /** the CPU batter's read (once, after aftertouch), then the press at the planned moment */
  stepBatting(m, dt) {
    const P = m.batPlan; if (!P || m.shotPress) return;
    if (!P.decided && m.time >= P.decideAt) { P.decided = true; Object.assign(P, AI.decideShot(m)); }
    if (P.decided && P.btn && m.time >= P.pressAt) { const ok = m.batPress(P.btn, P.aim, P.cheat); P.btn = null; if (!ok) m.batPlan = null; }
    if (P.decided && P.charge && !m.charge && !m.ball.pitched) { m.charge = .01; m.cur.charged = true; m.emit('bat:charge', {}); }
  },
  decideShot(m) {
    const b = m.ball, s = m.striker.p, hand = m.hand, inn = m.inn, f = m.force.outcome;
    const arr = Ball.arrive(b, 36, m.env); if (!arr) return { btn: null };
    const len = m.lengthNow(), line = -hand * arr.x, z = arr.z;
    const toStumps = Ball.arrive(b, 0, m.env), hitting = toStumps && Math.abs(toStumps.x) < 4.2 && toStumps.z < 13;
    if (f) return AI.forcedShot(m, f, len, line);
    // the situation: aggression from the required rate, balls left, wickets in hand and the batter's style
    let a = T('aiAggression');
    const need = m.need(), left = inn.overs * 6 - inn.balls, wk = inn.wicketsMax - inn.wkts;
    if (need) { const rr = need.runs / Math.max(1, need.balls); a += clamp((rr - 1.3) * .35, -.4, .5); if (need.runs <= 0) a = 0; }
    else if (left <= 6) a += .25;
    a += s.style === 'slogger' ? .22 : s.style === 'blocker' ? -.25 : 0;
    if (wk <= 1) a -= .2;
    if (m.special) a -= .1;
    a = clamp(a, 0, 1);
    // the ball: leave the wide ones, play the straight ones
    let btn = null, sector = null;
    if (z > 36 && !hitting) return { btn: null };
    if (line > 13 && !hitting && RNG.play() > a * .6) return { btn: null };
    if (line < -16 && !hitting) return { btn: RNG.play() < a ? 'shot' : null, aim: null, pressAt: m.time + .05 };
    if (len === 'good' && hitting && RNG.play() > a + .25) btn = 'block';
    else btn = RNG.play() < a * (len === 'good' ? .35 : .6) ? 'loft' : 'shot';
    if (need && need.runs <= 0) btn = 'block';
    if (m.cfg.cheat.dummy && RNG.play() < .7) btn = 'block';   // the Nets' dummy batter mostly defends
    // a direction: the widest gap for a ground shot; the fewest deep fielders for a loft
    const id0 = resolveShot(btn, null, len, line), shot = SHOTS[id0];
    if (btn !== 'block') sector = AI.bestDirection(m, btn, shot, len, line);
    const charge = s.style === 'slogger' && m.bowlerFamily() === 'spin' && RNG.play() < a * .35 && !m.ball.pitched && b.y > 170;
    // when to press: the ideal moment plus the perception error
    const aim = sector === null ? null : dirOf(sector, hand);
    const id = resolveShot(btn, sector, charge ? lengthOf((b.pitched ? b.pitchAt[1] : G.CREASE_S + 60) - 24) : len, line);
    const plane = SHOTS[id].back ? 22 : 36, arr2 = Ball.arrive(b, plane + (charge ? 24 : 0), m.env);
    if (!arr2) return { btn: null };
    // the CPU's skill: the difficulty weakens or sharpens CPU opponents, never the autopilot playing for a human side
    const own = m.isHuman(m.bat), skill = own ? Tuning.raw('aiBatSkill') : T('aiBatSkill');
    let sigma = skill / 1000 * (1.2 - (s.tech || 5) * .04);
    if (m.special) sigma *= 1.3; if (!b.pitched && len === 'yorker') sigma *= .8;
    if (m.flags.chirp) sigma *= 2; if (m.special === 'dibbly') sigma *= 2; if (m.flags.fogBall) sigma *= 1.5;
    if (m.cfg.cheat.perfectBat) sigma = 0;
    const err = RNG.normal() * sigma;
    return { btn, aim, sector, charge, pressAt: m.time + Math.max(0, arr2.t - SHOTS[id].at + err - (charge ? .05 : 0)) };
  },
  /** the angle (batter frame) inside a shot's sector farthest from any fielder (ground) or deep fielder (lofted) */
  bestDirection(m, btn, shot, len, line) {
    const hand = m.hand, angs = m.fielders.filter(f => f !== m.keeper).map(f => ({ th: thetaOf(f.x - m.striker.x, f.y - m.striker.y, hand), d: hyp(f.x, f.y) }));
    let lo = line > 4 ? -30 : line < -2 ? -150 : -110, hi = line > 4 ? 140 : line < -2 ? 30 : 110;
    if (shot.fam === 'cut') { lo = 60; hi = 140; } else if (shot.fam === 'pull') { lo = -140; hi = -50; } else if (len === 'full' || len === 'yorker') { lo = line > 4 ? -20 : -90; hi = line > 4 ? 80 : 30; }
    let best = shot.nat, bs = -1;
    for (let th = lo; th <= hi; th += 5) {
      let score = 999;
      for (const f of angs) { if (btn === 'loft' && f.d < 380) continue; if (btn === 'shot' && f.d > 520) continue; score = Math.min(score, Math.abs(wrapAng((th - f.th) * DEG)) / DEG); }
      if (btn === 'loft') score += (800 - m.ropeFrom(th)) * .02;
      score += RNG.play() * 6;
      if (score > bs) { bs = score; best = th; }
    }
    return best;
  },
  /** the direction (batter frame) where a ground shot at `speed` leaves the fielding side slowest to the stumps, for
   *  a forced single or two: each fielder's time to where the ball stops (or crosses its path), plus the throw */
  safeRun(m, speed, runs) {
    const hand = m.hand, fs = T('fieldSpeed'), ts = T('throwSpeed');
    let best = 30, bs = -1e9;
    for (let th = -150; th <= 150; th += 5) {
      const [ux, uy] = dirOf(th, hand), b = Object.assign(Ball.make(), { x: 0, y: 36, z: 1, vx: ux * speed, vy: uy * speed, vz: 0, phase: 'hit', rolling: true }), path = Ball.predict(b, 5, m.env, 6);
      if (path.some(p => m.outside(p.x, p.y))) continue;
      let t = Infinity;
      const last = path[path.length - 1];
      for (const f of m.fielders) {
        for (const p of path) { const arr = hyp(f.x - p.x, f.y - p.y) / fs + .18; if (arr <= p.t) { t = Math.min(t, p.t + .22 + Math.min(hyp(p.x, p.y), hyp(p.x, p.y - G.BOWL_Y)) / ts); break; } }
        const arr = hyp(f.x - last.x, f.y - last.y) / fs + .18; t = Math.min(t, Math.max(last.t, arr) + .22 + Math.min(hyp(last.x, last.y), hyp(last.x, last.y - G.BOWL_Y)) / ts);
      }
      const need = runs * (280 / T('runSpeed') + .3), sc = t - need;
      if (sc > bs) { bs = sc; best = th; }
    }
    return best;
  },
  /** a forced outcome's shot: { btn, aim, cheat, pressAt } */
  forcedShot(m, f, len, line) {
    const hand = m.hand, b = m.ball, at = (btn, aim, grade, flags) => {
      const id = resolveShot(btn, aim ? thetaOf(aim[0], aim[1], hand) : null, len, line), arr = Ball.arrive(b, SHOTS[id].back ? 22 : 36, m.env);
      if (flags) m.flags.forceShot = flags;
      return { btn, aim, cheat: grade ? { grade } : null, pressAt: m.time + (arr ? Math.max(0, arr.t - SHOTS[id].at) : 0) };
    };
    const tgt = f.target ? m.ground.targets.find(t => t.id === f.target) : null;
    const gapTheta = () => AI.bestDirection(m, 'shot', SHOTS.coverDrive, 'full', 6);
    switch (f.kind) {
      case 'dot': return at('block', null, 'perfect');
      case 'leave': case 'bowled': case 'lbw': case 'review': case 'wide': return { btn: null };
      case 'bouncer': return f.duck ? { btn: null } : at('loft', dirOf(-95, hand), 'perfect', { theta: -95 + (RNG.play() - .5) * 10, speed: 470, launch: 34 });
      case 'stumped': m.batPlan.charge = true; m.cur.charged = true; m.charge = .01; return { btn: 'shot', aim: null, cheat: { grade: 'miss' }, pressAt: m.time + .05 };
      case 'edge': case 'caughtbehind': return at('shot', dirOf(40, hand), 'perfect', { theta: 165, speed: 240, launch: 9 });
      case 'six': {
        let th = f.theta !== undefined ? f.theta : RNG.range(-40, 30);
        if (tgt) { const tp = m.targetPos(tgt); th = thetaOf(tp[0], tp[1] - 36, hand); }
        const carry = m.ropeFrom(th) + 70, sp6 = Math.sqrt(m.env.g * carry / Math.sin(72 * DEG));   // (it clears the rope and comes down among the spectators)
        return at('loft', dirOf(th, hand), 'perfect', tgt ? { target: tgt.id, pass: true } : { theta: th, speed: sp6, launch: 36, pass: true });
      }
      case 'four': { const th = f.theta !== undefined ? f.theta : gapTheta(); return at('shot', dirOf(th, hand), 'perfect', { theta: th, speed: 560, launch: 2, pass: true }); }
      case 'caught': {
        const fl = m.fielders.filter(x => x !== m.keeper && x !== m.bowler && hyp(x.x, x.y) > 120).sort((p, q) => hyp(p.x, p.y) - hyp(q.x, q.y))[0];
        const th = fl ? thetaOf(fl.x - m.striker.x, fl.y - G.CONTACT_FRONT, hand) : 20, D = fl ? hyp(fl.x - m.striker.x, fl.y - G.CONTACT_FRONT) : 200;
        const launch = 40, v = Math.sqrt(D * m.env.g / Math.sin(2 * launch * DEG)) * .97;
        m.cfg.cheat.catchesOnce = true;
        return at('loft', dirOf(th, hand), 'perfect', { theta: th, speed: v, launch });
      }
      case 'runout': {
        const fl = m.fielders.filter(x => x !== m.keeper && x !== m.bowler).sort((p, q) => Math.abs(hyp(p.x, p.y) - 150) - Math.abs(hyp(q.x, q.y) - 150))[0];
        const th = fl ? thetaOf(fl.x, fl.y - 36, hand) : 40;
        m.flags.forceRun = 1; m.cfg.cheat.directHitOnce = true; m.flags.forceRunOut = true;
        return at('shot', dirOf(th, hand), 'perfect', { theta: th, speed: 190, launch: 2 });
      }
      case '1': case '2': case '3': { const sp = f.kind === '1' ? 120 : 300, th = AI.safeRun(m, sp, f.kind === '1' ? 1 : 2); m.flags.forceRun = +f.kind; return at('shot', dirOf(th, hand), 'perfect', { theta: th, speed: sp, launch: 3 }); }
      default: return at('shot', null, 'good');
    }
  },
  /* ---- running: calls for the CPU batting side (and Running: Auto) ---- */
  fieldTime(m, end) {
    const sy = end === 'S' ? 0 : G.BOWL_Y, ts = T('throwSpeed');
    if (m.holder) return .25 + hyp(m.holder.x, m.holder.y - sy) / ts;
    if (m.thrown) return m.thrown.end === end ? .3 : 1.2;
    const c = m.chaser; if (!c || !c.chase) return 9;
    const s = c.chase; if (m.outside(s.x, s.y)) return 99;
    const left = Math.max(0, s.t - m.pt);
    return left + .3 + hyp(s.x, s.y - sy) / ts;
  },
  batTime(m, b, end) { return Math.abs(b.y - END_Y[end]) / T('runSpeed') + (b.goal ? 0 : .25); },
  stepRunning(m, dt) {
    const R = m.running; if (!R) return;
    const s = m.striker, n = m.nonStriker, forced = m.flags.forceRun;
    if (!R.started && R.t < .25) return;
    // the boundary is coming: no need to run
    const last = m.samples && m.samples[m.samples.length - 1], toRope = last && m.outside(last.x, last.y) && !m.holder;
    if (forced) {
      if (!R.started) { m.startRun(s); m.startRun(n); m.emit('run:call', { call: 'YES', who: s.id }); }
      if (!s.goal && !n.goal && R.runs < forced && R.runs > 0) { m.startRun(s); m.startRun(n); }
      if (R.runs >= forced) m.flags.forceRun = 0;
      return;
    }
    const margin = end => AI.fieldTime(m, end) - Math.max(AI.batTime(m, s, s.goal || m.otherEnd(m.batterEnd(s) || s.home)), AI.batTime(m, n, n.goal || m.otherEnd(m.batterEnd(n) || n.home)));
    const agg = clamp(T('aiAggression') + (m.need() && m.need().runs / Math.max(1, m.need().balls) > 1.5 ? .25 : 0), 0, 1);
    if (!s.goal && !n.goal && !toRope) {
      if (m.decision || m.cur.wicket) return;
      const endS = m.otherEnd(m.batterEnd(s) || s.home), mg = Math.min(margin(endS), margin(m.otherEnd(endS)));
      const go = mg > .35 || (mg > -.15 && RNG.play() < agg * dt * 3);
      if (go && (R.runs === 0 ? R.t < 2.5 : true) && R.runs < 4) { m.startRun(s); m.startRun(n); m.emit('run:call', { call: R.runs ? 'TWO!' : 'YES', who: s.id }); }
      R.hint = mg > .35 ? 'YES' : mg < -.15 ? 'NO' : 'WAIT';
    } else if (s.goal || n.goal) {
      for (const b of [s, n]) {
        if (!b.goal) continue;
        const d = Math.abs(b.y - END_Y[b.goal]), mg = AI.fieldTime(m, b.goal) - d / T('runSpeed');
        if (mg < .3 && d < 50 && d > 8 && b.dive <= 0 && (m.thrown || m.holder)) { b.dive = .6; m.emit('run:dive', {}); coverage.mark('dive'); }
        const frac = 1 - d / (G.CREASE_B - G.CREASE_S);
        if (mg < -.5 && frac < .35 && b.crossings === R.runs && !forced) { m.sendBack(s); m.sendBack(n); m.emit('run:call', { call: 'NO!', who: s.id }); break; }
      }
    }
  },
  /* ---- the attract mode's and tests' autopilot: drive a human side's inputs from the AI (cheats allowed) ---- */
  autopilot(m, side, role, cheat) { m.cfg.cheat = Object.assign(m.cfg.cheat || {}, cheat || {}, role === 'bat' ? { autoBat: true } : { autoBowl: true }); }
};
K.AI = AI;

/* ---- 28-arcade.js ---- */
/* ---- THE ARCADE LAYER (Kerfuffle rules; off is "purist arcade": no items, specials or chaos).
 * Hype (the Kerfuffle meter, 0-100 per team): six +25, target +30, four +15, three runs +10, PERFECT +8; wicket +30,
 * maiden +20, screamer +15, direct hit +15, beaten +8, dot +6; chaos moments +5; x hypeGain. Full: the special.
 * ON FIRE: a batter's fireStreak boundaries in a row (timing x1.5, power x1.2) until a dot, a wicket or 6 balls; a
 * bowler's 3 dots or wickets in a row (pace +10%, edges x1.4) until a boundary or 6 balls.
 * Items float over the outfield (the ball passing through takes one) or come from 2 dots in an over; they apply
 * themselves on their next event. Stadium targets give bonus runs. Chaos events fire between balls and end by
 * themselves. ---- */
Object.assign(Match.prototype, {
  addHype(side, n, why) {
    if (!this.kerfuffle) return;
    const was = this.hype[side];
    this.hype[side] = clamp(was + n * T('hypeGain'), 0, 100);
    if (was < 100 && this.hype[side] >= 100) this.emit('hype:full', { side });
    if (why) this.emit('hype', { side, n, why });
  },
  specialReady(side, kind, at = 100) {
    if (!this.kerfuffle) return false;
    if (this.cfg.cheat.infiniteHype && this.isHuman(side)) return true;
    return this.hype[side] >= at;
  },
  useSpecial(side, id) {
    const sp = SPECIALS[id] || {};
    this.hype[side] = sp.cost ? Math.max(0, this.hype[side] - sp.cost) : 0;
    this.emit('special', { id, side, kind: sp.kind });
    coverage.mark('special');
  },
  /** a fielding special (Pip's Chirp, Fortescue's Silver Tray, Houdini's Lightning Stumping), used in setup */
  fieldSpecial() {
    const team = this.teams[this.bowlSide], star = team.players.find(p => p.specField);
    if (!star || !this.specialReady(this.bowlSide, 'field', SPECIALS[star.specField].cost || 100)) return false;
    const id = star.specField; this.useSpecial(this.bowlSide, id);
    if (id === 'chirp') this.flags.chirp = true; else if (id === 'tray') this.flags.tray = 1; else if (id === 'lightning') this.flags.lightning = 6;
    return true;
  },
  /** after each ball: hype, ON FIRE, item timers, maidens and dots */
  afterBallArcade(c, before) {
    const bat = this.sideOf(this.inn.bat), bowl = 1 - bat, runs = this.inn.runs - before;
    if (c.boundary === 6) this.addHype(bat, 25, 'six'); else if (c.boundary === 4) this.addHype(bat, 15, 'four'); else if (c.runs === 3) this.addHype(bat, 10, 'three');
    if (c.grade === 'perfect' && c.contact) this.addHype(bat, 8, 'perfect');
    if (c.bonus) this.addHype(bat, 30, 'target');
    if (c.wicket) this.addHype(bowl, 30, 'wicket');
    if (c.maiden) this.addHype(bowl, 20, 'maiden');
    if (c.screamer) this.addHype(bowl, 15, 'screamer');
    if (c.wicket && c.wicket.direct) this.addHype(bowl, 15, 'direct');
    if (c.beaten && !c.contact) this.addHype(bowl, 8, 'beaten');
    const dot = runs === 0 && !c.wicket;
    if (dot) this.addHype(bowl, 6, 'dot');
    // ON FIRE: the batter
    const F = this.fire;
    if (c.boundary) { F.batStreak++; } else F.batStreak = 0;
    if (F.bat > 0) { F.bat--; if (dot || c.wicket || F.bat === 0) { F.bat = 0; this.emit('fire:off', { who: 'bat' }); } }
    else if (F.batStreak >= T('fireStreak') && this.kerfuffle) { F.bat = 6; this.emit('fire:on', { who: 'bat' }); coverage.mark('fire'); }
    // the bowler
    if (dot || c.wicket) F.bowlStreak++; else F.bowlStreak = 0;
    if (F.bowl > 0) { F.bowl--; if (c.boundary || F.bowl === 0) { F.bowl = 0; this.emit('fire:off', { who: 'bowl' }); } }
    else if (F.bowlStreak >= 3 && this.kerfuffle) { F.bowl = 6; F.bowlStreak = 0; this.emit('fire:on', { who: 'bowl' }); coverage.mark('fire'); }
    if (this.cfg.cheat.alwaysFire && this.isHuman(bat)) F.bat = Math.max(F.bat, 2);
    // items and flags that last a few balls
    if (this.flags.giantBat > 0) this.flags.giantBat--;
    if (this.flags.lightning > 0) this.flags.lightning--;
    if (this.flags.teaTime > 0 && c.overEnd) this.flags.teaTime--;
    this.flags.fogBall = false; this.flags.grandad = false;
    // bowling items: 2 dot balls in an over
    this.overDots = c.ballInOver === 0 ? (dot ? 1 : 0) : (this.overDots || 0) + (dot ? 1 : 0);
    if (this.kerfuffle && this.overDots === 2 && dot && !this.overItemGiven) { this.overItemGiven = true; this.giveItem(bowl, RNG.pick(BOWL_ITEMS)); }
    if (c.overEnd) { this.overDots = 0; this.overItemGiven = false; }
    if (c.wicket && this.kerfuffle) this.addHype(bat, 0);
    this.force.outcome = null;
    // highlights: the moments the results screen replays
    const w = (c.boundary === 6 ? 3 : c.boundary === 4 ? 1.5 : 0) + (c.wicket ? 3 : 0) + (c.bonus ? 3 : 0) + (c.screamer ? 2 : 0) + (c.special ? 1 : 0);
    if (w > 0) this.highlights.push({ w, rec: c, inn: this.innNo });
    // the profile's stats for a human batting side
    if (this.isHuman(bat) && this.cfg.mode !== 'attract') { if (c.boundary === 6) Profile.stat('sixes'); if (c.boundary === 4) Profile.stat('fours'); }
    if (this.isHuman(bowl) && this.cfg.mode !== 'attract' && c.wicket) Profile.stat('wickets');
  },
  giveItem(side, id) {
    if (id === 'cake') { this.addHype(side, 40, 'cake'); this.emit('item', { id, side }); coverage.mark('item:' + id); return; }
    if (this.items[side].length >= 2) this.items[side].shift();
    this.items[side].push(id);
    if (id === 'giantbat') { this.flags.giantBat = 2; this.items[side] = this.items[side].filter(i => i !== 'giantbat'); }
    if (id === 'fog') { this.flags.fogBall = true; this.flags.fogMarker = true; this.items[side] = this.items[side].filter(i => i !== 'fog'); }
    if (id === 'banana') { this.flags.banana = 1; this.flags.bananaUsed = false; this.items[side] = this.items[side].filter(i => i !== 'banana'); }
    this.emit('item', { id, side }); coverage.mark('item:' + id);
  },
  /** consume a held item if it applies to this event; true when it did */
  useItem(side, id, event) {
    const i = this.items[side].indexOf(id); if (i < 0) return false;
    this.items[side].splice(i, 1); this.emit('item:used', { id, side, event }); return true;
  },
  /* ---- item tokens on the outfield ---- */
  spawnToken(id, at) {
    const r = RNG.play, a = r() * TAU, d = 200 + r() * 220;
    const p = at || [Math.cos(a) * d, G.MID_Y + Math.sin(a) * d * .8];
    if (this.outside(p[0], p[1])) { p[0] *= .6; p[1] = G.MID_Y + (p[1] - G.MID_Y) * .6; }
    this.tokens.push({ id: id || RNG.pick(BAT_ITEMS), x: p[0], y: p[1], z: 14, t: 0, life: 6 * 25 });
    this.emit('token:spawn', { id: this.tokens[this.tokens.length - 1].id });
  },
  stepTokens(dt) { for (const t of this.tokens) t.t += dt; this.tokens = this.tokens.filter(t => t.t < t.life); },
  checkTokens() {
    if (!this.contact) return;
    const b = this.ball;
    for (const t of this.tokens) if (hyp(b.x - t.x, b.y - t.y, b.z - t.z) < 14) { t.t = 1e9; this.giveItem(this.bat, t.id); this.emit('token:take', { id: t.id }); }
  },
  /* ---- stadium targets ---- */
  checkTargets(x0, y0, z0) {
    if (!this.contact || !this.kerfuffle) return;
    const b = this.ball;
    for (const t of this.ground.targets) {
      if (this.targetsHit[t.id]) continue;
      const p = this.targetPos(t), h = [t.size[0] / 2, t.size[1] / 2, t.size[2] / 2];
      // the segment from the last step against the box (sampled)
      for (let k = 0; k <= 4; k++) {
        const x = lerp(x0, b.x, k / 4), y = lerp(y0, b.y, k / 4), z = lerp(z0, b.z, k / 4);
        if (Math.abs(x - p[0]) <= h[0] && Math.abs(y - p[1]) <= h[1] && Math.abs(z - p[2]) <= h[2]) { this.hitTarget(t); break; }
      }
    }
  },
  hitTarget(t) {
    this.targetsHit[t.id] = true; this.cur.bonus += t.bonus; this.cur.target = t.id; this.stats.targets.push(t.id);
    const b = this.ball; b.vx *= -.25; b.vy *= -.25; b.vz = Math.abs(b.vz) * .3;
    this.emit('target:hit', { id: t.id, bonus: t.bonus, label: t.label, fx: t.fx });
    coverage.mark('target'); coverage.mark('target:' + t.id);
    if (t.fx === 'bees') this.startChaos('bees');
  },
  /* ---- chaos events ---- */
  chaosRoll(when) {
    if (!this.kerfuffle || this.cfg.cheat.noChaos || this.cfg.mode === 'hub' || this.cfg.mode === 'showdown' || this.cfg.mode === 'attract') return null;
    const pool = this.ground.chaos.filter(id => !this.chaos.some(c => c.id === id) && !(this.usedChaos || {})[id]);
    const quickMascot = this.cfg.mode === 'quick' && !pool.includes('mascot') && !(this.usedChaos || {}).mascot ? ['mascot'] : [];
    const all = pool.concat(quickMascot).filter(id => (when === 'over') === (id === 'rain' || id === 'advert' || id === 'tide' || id === 'fog' || id === 'ghosts'));
    for (const id of all) if (RNG.play() < CHAOS[id].chance * T('chaosRate') * (when === 'over' ? 1 : .25)) return id;
    return null;
  },
  chaosOverStart() {
    // an item token for the batting side
    if (this.kerfuffle && this.cfg.mode !== 'hub' && this.cfg.mode !== 'attract' && RNG.play() < .35 * T('chaosRate')) this.spawnToken();
    const id = this.chaosRoll('over');
    if (id === 'rain' && !(this.innNo === 1 && this.inn.balls < this.inn.overs * 6 - 1)) return false;
    if (id) { this.startChaos(id); if (id === 'rain') return true; }
    return false;
  },
  chaosBetween() { const id = this.chaosRoll('between'); if (id) this.startChaos(id); },
  startChaos(id) {
    const c = { id, t: 0, overs: CHAOS[id].overs, startOver: this.over, data: {} };
    (this.usedChaos = this.usedChaos || {})[id] = true;
    if (id === 'cow') { c.pos = [-420, 380]; c.path = [[-420, 380], [-250, 470], [-120, 520], [60, 560], [-200, 300], [-420, 380]]; }
    if (id === 'bees') { const f = this.fielders.filter(a => a !== this.keeper && a !== this.bowler)[Math.floor(RNG.play() * 8)]; if (f) { f.bees = true; c.data.who = f; } }
    if (id === 'peacocks') c.pos = [300, 420];
    if (id === 'mascot') { c.pos = [-500, 200]; }
    if (id === 'tide') c.data.step = .05;
    if (id === 'fog') c.data.from = this.fog;
    if (id === 'ghosts') c.data.next = 2;
    if (id === 'rain') { this.stats.delays += 1; this.stats.chaosThings.push('the rain'); return this.startRain(c); }
    if (id === 'advert') this.hold = Math.max(this.hold, 3);
    if (id === 'tray') this.hold = Math.max(this.hold, 3);
    if (id === 'bells' || id === 'rabbits' || id === 'fireworks' || id === 'advert' || id === 'tray') c.overs = 0;
    this.chaos.push(c);
    this.stats.chaosThings.push(CHAOS[id].name.toLowerCase());
    this.addHype(this.bat, 5, 'chaos'); this.addHype(this.bowlSide, 5, 'chaos');
    this.emit('chaos', { id, name: CHAOS[id].name }); coverage.mark('chaos:' + id);
  },
  stepChaos(dt) {
    for (const c of this.chaos) {
      c.t += dt;
      if (c.id === 'cow' && c.path) { const P = c.path, k = (c.t * .04) % (P.length - 1), i = Math.floor(k), f = k - i; c.pos = [lerp(P[i][0], P[i + 1][0], f), lerp(P[i][1], P[i + 1][1], f)]; c.facing = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); }
      if (c.id === 'peacocks') { c.pos = [300 + Math.sin(c.t * .3) * 140, 420 + Math.cos(c.t * .21) * 80]; }
      if (c.id === 'gulls' && c.data.swoop) c.data.swoop.t += dt;
      if (c.id === 'mascot') { c.pos = [-500 + (c.t * 60) % 1000, 200 + Math.sin(c.t * 2) * 30]; }
      if (c.id === 'fog') this.fog = clamp(c.data.from + Math.min(1, c.t / 20) * .4, 0, 1);
      if (c.id === 'ghosts') { c.data.next -= dt; if (c.data.next <= 0) { c.data.next = 2 + RNG.cosmetic() * 3; const gs = this.fielders.filter(a => a.ghost); this.flags.ghostPhase = gs.length ? { id: gs[Math.floor(RNG.cosmetic() * gs.length)].id, t: .5 } : null; if (this.flags.ghostPhase) for (const a of this.fielders) a.phased = false; } if (this.flags.ghostPhase) { this.flags.ghostPhase.t -= dt; if (this.flags.ghostPhase.t <= 0) this.flags.ghostPhase = null; } }
    }
    // events end by themselves: after their overs (or at once for the instant ones)
    const before = this.chaos.length;
    this.chaos = this.chaos.filter(c => {
      const over = c.overs > 0 && this.over - c.startOver >= c.overs, inst = c.overs === 0 && c.t > 4;
      if (over || inst) { if (c.id === 'bees' && c.data.who) c.data.who.bees = false; if (c.id === 'fog') this.fog = this.weather === 'fog' ? .6 : 0; return false; }
      return true;
    });
    if (before !== this.chaos.length) this.emit('chaos:end', {});
    if (this.chaos.some(c => c.id === 'tide') && this.cur && this.cur.overEnd && !this.tideStepped) { this.tideStepped = true; this.boundaryShrink = Math.min(.15, this.boundaryShrink + .05); }
    if (this.phase === 'setup') this.tideStepped = false;
  },
  /** the ball meets the chaos: Doris, a dust devil, a peacock, a gull */
  chaosBall(dt) {
    const b = this.ball;
    for (const c of this.chaos) {
      if (c.id === 'cow' && c.pos && b.z < 20 && hyp(b.x - c.pos[0], b.y - c.pos[1]) < 18 && !c.data.hit) { c.data.hit = true; b.vx *= -.3; b.vy *= -.3; b.vz = 10; this.emit('chaos:cowhit', {}); c.overs = 0; c.t = 3; this.planField(); }
      if (c.id === 'peacocks' && c.pos && b.z < 4 && hyp(b.x - c.pos[0], b.y - c.pos[1]) < 16 && !c.data.hit) { c.data.hit = true; const a = (RNG.play() - .5) * 50 * DEG, cs = Math.cos(a), sn = Math.sin(a), vx = b.vx; b.vx = vx * cs - b.vy * sn; b.vy = vx * sn + b.vy * cs; this.emit('chaos:peacock', {}); this.planField(); }
      if (c.id === 'dustdevil' && b.z > 6 && !c.data.hit && RNG.play() < dt * 1.5) { c.data.hit = true; const a = (RNG.play() - .5) * 20 * DEG, cs = Math.cos(a), sn = Math.sin(a), vx = b.vx; b.vx = vx * cs - b.vy * sn; b.vy = vx * sn + b.vy * cs; this.emit('chaos:dustdevil', {}); this.planField(); }
      if (c.id === 'gulls' && b.rolling && b.vx === 0 && b.vy === 0 && !this.holder && !c.data.took && hyp(b.x, b.y - G.MID_Y) > 200) { c.data.took = true; c.data.swoop = { x0: b.x, y0: b.y, x1: b.x + 30, y1: b.y + 10, t: 0 }; b.x += 30; b.y += 10; this.cur.ran = Math.max(this.cur.ran, 0); this.cur.gullByes = 2; this.emit('chaos:gull', {}); coverage.mark('gullsteal'); this.planField(); }
    }
  },
  /* ---- rain: covers, a delay, and in a chase the Kerfuffle Method ---- */
  startRain(c) {
    this.rainInfo = { c, t: 0 }; this.rain = 1; this.chaos.push(c);
    this.emit('rain:start', {}); this.emit('chaos', { id: 'rain', name: 'Rain delay' }); coverage.mark('chaos:rain'); coverage.mark('rain');
    this.setPhase('rainDelay');
  },
  phase_rainDelay() { if (this.pt > (this.cfg.mode === 'attract' ? 5 : 7) && this.hold <= 0) this.endRain(); },
  endRain() {
    const inn = this.inn; this.rain = 0;
    this.chaos = this.chaos.filter(c => c.id !== 'rain');
    if (this.innNo === 1 && inn.target !== null) {
      const O = inn.overs, oBefore = (O * 6 - inn.balls) / 6, cutBalls = Math.max(1, Math.ceil((O * 6 - inn.balls) / 2)), oAfter = (O * 6 - inn.balls - cutBalls) / 6;
      const r = Rules.kerfuffleMethod(this.innings[0].runs, O, oBefore, oAfter, inn.wkts, inn.runs);
      inn.overs = (inn.balls + O * 6 - inn.balls - cutBalls) / 6; inn.revised = { from: inn.target, to: r.target, res: r.res, cut: cutBalls };
      inn.target = r.target;
      this.emit('rain:method', { from: inn.revised.from, to: r.target, res: r.res, cut: cutBalls });
      if (inn.runs >= inn.target || inn.balls >= inn.overs * 6) { inn.done = true; inn.end = inn.runs >= inn.target ? 'target' : 'overs'; }
    }
    this.emit('rain:end', {});
    this.hold = Math.max(this.hold, this.cfg.mode === 'attract' ? 2.5 : 3.5);
    if (inn.done) return this.endInnings();
    this.chooseBowler(false); if (this.phase !== 'pickBowler') this.setPhase('setup');
  }
});

/* ---- 30-ground.js ---- */
/* ---- THE GROUND, built from a recipe: a TileMap (16-unit cells) covering the boundary ellipse, the stands and the
 * surroundings; the floor painted by floorTex (mown stripes with grain, the square, the pitch with its creases and
 * footmarks, the rope, the surroundings), the stands as TileMap walls, the crowd as small figures queued in groups,
 * props as KERFUFFLE and engine shapes, and two painted far-end panoramas for the broadcast camera (whose low
 * orthographic view can't show the far stands the way a telephoto lens does). Sim coordinates (stumps at 0, 0) map to
 * the TileMap's world by + (OX, OY). ---- */
const hexRGB = h => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const OUT_TEX = { lane: '#7a6a4a', gravel: '#a8a090', sand: '#e8d4a0', dirt: '#b89868', track: '#3a3a4a' };
const Ground = {
  cache: {},
  get(id) { return this.cache[id] || (this.cache[id] = this.build(id)); },
  build(id) {
    const g = GROUNDS[id], M = 330, T16 = 16;
    const W = Math.ceil((2 * g.rx + 2 * M) / T16), H = Math.ceil((2 * g.ry + 2 * M) / T16), OX = W * 8, OY = H * 8 - G.MID_Y;
    const q = (x, y) => Math.sqrt((x / g.rx) ** 2 + ((y - G.MID_Y) / g.ry) ** 2);
    const rows = [], tiers = { village: [[1.2, 1.24, 'h']], terrace: [[1.16, 1.24, '1'], [1.24, 1.32, '2']], beach: [], bleachers: [[1.15, 1.22, '1'], [1.22, 1.29, '2'], [1.29, 1.36, '3']], dome: [[1.12, 1.2, '1'], [1.2, 1.28, '2'], [1.28, 1.36, '3'], [1.36, 1.6, '4']] }[g.stands] || [];
    for (let cy = 0; cy < H; cy++) {
      let s = '';
      for (let cx = 0; cx < W; cx++) {
        const x = cx * T16 + 8 - OX, y = cy * T16 + 8 - OY, qq = q(x, y);
        let ch = '.';
        if (g.seaSide && x * g.seaSide > g.rx * 1.1) ch = '~';
        for (const [a, b, c] of tiers) if (qq >= a && qq < b) {
          if (g.stands === 'village' && (Math.abs(x) < 70 || (y > 700 && Math.abs(x + 120) < 90) || Math.abs(x - 470) < 60)) continue;
          if (g.stands === 'terrace' && y > 600) continue;
          if (g.stands === 'bleachers' && Math.abs(x) < g.rx * .45) continue;
          if (g.stands === 'dome' && y > 900 && Math.abs(x) < 160) continue;
          ch = c;
        }
        s += ch;
      }
      rows.push(s);
    }
    const pal = g.pal, G1 = hexRGB(pal.g1), G2 = hexRGB(pal.g2), PI = hexRGB(pal.pitch), WO = hexRGB(pal.worn), OUTC = hexRGB(OUT_TEX[pal.outTag] || pal.out), ROPE = hexRGB(pal.rope), WHITE = [244, 242, 232];
    const floorTex = (mx, my, tag) => {
      const x = mx - OX, y = my - OY, n = E.hash2(Math.floor(mx), Math.floor(my)) - .5, m = E.noise2(mx * .05, my * .05) * .5;
      if (tag === 'water') { const w = E.noise2(mx * .03, my * .08 + 3) * .5 + .5, base = [42, 138, 208]; return [base[0] + w * 30 + n * 10, base[1] + w * 30 + n * 10, base[2] + w * 20]; }
      const qq = q(x, y), sc = T('boundaryScale');
      const rope = Math.abs(qq - sc) * Math.min(g.rx, g.ry);
      if (rope < 1.6) return ROPE.map(v => v + n * 14);
      if (rope < 2.6 && qq > sc) return [ROPE[0] * .35, ROPE[1] * .35, ROPE[2] * .35];
      if (qq > sc + .08) {
        if (g.pal.sand || pal.outTag === 'sand') { const s = hexRGB('#e8d4a0'); return [s[0] + n * 18 + m * 10, s[1] + n * 18 + m * 10, s[2] + n * 14]; }
        const k = clamp((qq - sc - .08) * 6, 0, 1), base = mixRGB(mixRGB(G1, G2, .5), OUTC, k);
        return [base[0] + n * 16 + m * 12, base[1] + n * 16 + m * 12, base[2] + n * 12];
      }
      // the pitch and its creases
      if (Math.abs(x) <= G.PITCH_HALF && y >= -20 && y <= 340) {
        const crease = (Math.abs(y - G.CREASE_S) < .8 && Math.abs(x) < 24) || (Math.abs(y - G.CREASE_B) < .8 && Math.abs(x) < 24) || (Math.abs(y - G.STUMPS_Y) < .8 && Math.abs(x) <= G.RETURN_X) || (Math.abs(y - G.BOWL_Y) < .8 && Math.abs(x) <= G.RETURN_X) || (Math.abs(Math.abs(x) - G.RETURN_X) < .8 && ((y > -8 && y < G.CREASE_S) || (y > G.CREASE_B && y < 328)));
        if (crease) return WHITE.map(v => v + n * 10);
        const endWear = Math.max(0, 1 - Math.min(Math.abs(y - G.CREASE_S), Math.abs(y - G.CREASE_B)) / 60), foot = (Math.abs(y - 296) < 14 && Math.abs(Math.abs(x) - 8) < 6) || (Math.abs(y - 28) < 10 && Math.abs(x - 6) < 5);
        const c = mixRGB(PI, WO, endWear * .7 + (foot ? .5 : 0)), crack = g.id === 'downs' && E.hash2(Math.floor(mx / 3), Math.floor(my / 5)) > .93 ? -26 : 0;
        return [c[0] + n * 14 + m * 8 + crack, c[1] + n * 14 + m * 8 + crack, c[2] + n * 10 + crack];
      }
      // the square: a lighter rectangle of old pitches
      const sq = Math.abs(x) < 70 && y > -40 && y < 360;
      // mown stripes (diagonal at the Hall)
      const sv = pal.diagonal ? (x + y) * .7 : x, k = Math.floor((sv + 2000) / 32) % 2;
      let c = k ? G1 : G2;
      if (sq) c = mixRGB(c, PI, .18);
      if (g.id === 'downs') c = mixRGB(c, [200, 170, 110], (E.noise2(mx * .01, my * .01) * .5 + .5) * .35);
      return [c[0] + n * 18 + m * 16, c[1] + n * 18 + m * 16, c[2] + n * 12 + m * 8];
    };
    const st = g.stands;
    const types = st === 'village' ? { h: { h: 12, top: '#3f7a32', side: '#2f5a26', face: 'hedge', roof: 'leaves' } }
      : st === 'terrace' ? { 1: { h: 8, top: '#c8bfa8', side: '#a89f88', face: 'stone', roof: 'slab', cut: true, cutH: 4 }, 2: { h: 16, top: '#c0b8a0', side: '#9a9280', face: 'stone', roof: 'slab', cut: true, cutH: 6 } }
      : st === 'bleachers' ? { 1: { h: 10, top: '#c8ccd8', side: '#8a8ea0', face: 'plank', roof: 'plain', cut: true, cutH: 4 }, 2: { h: 20, top: '#b8bcc8', side: '#7a7e90', face: 'plank', roof: 'plain', cut: true, cutH: 6 }, 3: { h: 30, top: '#a8acb8', side: '#6a6e80', face: 'plank', roof: 'plain', cut: true, cutH: 8 } }
      : st === 'dome' ? { 1: { h: 24, top: '#3a3450', side: '#2a2440', face: 'none', roof: 'plain', cut: true, cutH: 6 }, 2: { h: 48, top: '#342e4a', side: '#262038', face: 'none', roof: 'plain', cut: true, cutH: 8 }, 3: { h: 72, top: '#2e2844', side: '#221c34', face: 'none', roof: 'plain', cut: true, cutH: 10 }, 4: { h: 96, top: '#28223e', side: '#1c1830', face: 'none', roof: 'plain', cut: true, cutH: 12 } } : {};
    const leg2 = { '.': { floor: 'grass' }, '~': { floor: 'water', block: true } }; for (const k in types) leg2[k] = { tile: k === 'h' ? 9 : +k, floor: 'grass' };
    const types2 = {}; for (const k in types) types2[k === 'h' ? 9 : +k] = types[k];
    const map = new E.TileMap({ rows, legend: leg2, types: types2, floorTex, outside: OUT_TEX[pal.outTag] || pal.out, ao: 3, chunks: true });
    // the crowd: figures on the tiers (or on blankets and deck chairs round a village rope), in groups for drawing
    const crowd = [], rnd = E.rng(id.length * 977 + 3), shirts = [pal.accent, pal.accent2, '#e8e0d0', '#d84a3a', '#3a6ad8', '#e8c040', '#5aa04a', '#f0a0c0', '#8a5ad0'];
    const tierZ = { 1: (types[1] || {}).h, 2: (types[2] || {}).h, 3: (types[3] || {}).h, 4: (types[4] || {}).h };
    if (st === 'village' || st === 'beach') {
      for (let i = 0; i < (st === 'beach' ? 160 : 140); i++) {
        const a = rnd() * TAU, qq = 1.06 + rnd() * .1, x = Math.cos(a) * g.rx * qq, y = G.MID_Y + Math.sin(a) * g.ry * qq;
        if (Math.abs(x) < 60 && y < 0) continue; if (g.seaSide && x * g.seaSide > g.rx * .9) continue;
        crowd.push({ x, y, z: 0, shirt: shirts[Math.floor(rnd() * shirts.length)], skin: SKINS[Math.floor(rnd() * 5)], hat: rnd() < .3 ? (rnd() < .5 ? '#f4f0e0' : '#d8b04a') : null, ph: rnd() * 9, sit: rnd() < .55 });
      }
    } else {
      for (let cy = 0; cy < H; cy += 1) for (let cx = 0; cx < W; cx += 1) {
        const ch = rows[cy][cx]; if (!/[1-4]/.test(ch)) continue;
        if (rnd() > (st === 'dome' ? .55 : .65)) continue;
        const x = cx * T16 + 4 + rnd() * 8 - OX, y = cy * T16 + 4 + rnd() * 8 - OY;
        crowd.push({ x, y, z: tierZ[ch] || 0, shirt: shirts[Math.floor(rnd() * shirts.length)], skin: SKINS[Math.floor(rnd() * 6)], hat: rnd() < .2 ? '#f4f0e0' : null, ph: rnd() * 9, sit: false });
      }
    }
    crowd.sort((a, b) => a.y - b.y);
    const groups = []; for (let i = 0; i < crowd.length; i += 10) { const gp = crowd.slice(i, i + 10); groups.push({ list: gp, x: gp.reduce((s, c) => s + c.x, 0) / gp.length, y: gp.reduce((s, c) => s + c.y, 0) / gp.length, z: 0, scatter: 0 }); }
    const B = { id, recipe: g, map, OX, OY, W, H, crowd, groups, panos: {} };
    return B;
  },
  /** the far-end panorama for the broadcast camera: sky, far scenery, stands and crowd, the sight screen behind the batter
   *  and the scoreboard (numbers drawn live on top). Painted once per ground and end */
  pano(B, end, night) {
    const key = end + (night ? 'n' : 'd'); if (B.panos[key]) return B.panos[key];
    const g = B.recipe, pal = g.pal, Wd = 960, Ht = 170, c = E.mkCanvas(Wd, Ht);
    const x = E.ctx2d(c); if (!x) return null; x.imageSmoothingEnabled = false;
    const sky = night ? ['#05050f', '#0e0c26', '#1a1440'] : pal.sky, base = Ht - 1, rnd = E.rng(end.length * 31 + g.id.length);
    for (let y = 0; y < Ht; y++) { const t = y / Ht, col = t < .5 ? E.mix(sky[0], sky[1], t * 2) : E.mix(sky[1], sky[2], (t - .5) * 2); px.rect(x, 0, y, Wd, 1, col); }
    if (night) { for (let i = 0; i < 90; i++) px.dot(x, Math.floor(rnd() * Wd), Math.floor(rnd() * 90), rnd() < .3 ? '#ffffff' : '#a8a8d0'); px.disc(x, 780, 30, 9, '#f0ecd8'); px.disc(x, 784, 27, 8, sky[0]); }
    else { for (let i = 0; i < 7; i++) { const cx0 = rnd() * Wd, cy0 = 12 + rnd() * 40; for (let k = 0; k < 5; k++) px.disc(x, cx0 + k * 9 - 18, cy0 + Math.sin(k) * 3, 7 + rnd() * 5, k % 2 ? '#ffffff' : '#f4f6ff'); } }
    // far scenery
    const far = base - 70;
    if (g.id === 'bay') { px.rect(x, 0, far + 8, Wd, 26, '#2a8ad0'); for (let i = 0; i < 60; i++) px.rect(x, Math.floor(rnd() * Wd), far + 10 + Math.floor(rnd() * 20), 6, 1, '#7fd0ff'); }
    else if (g.id === 'dome') { for (let i = 0; i < 40; i++) { const bx = i * 26 + rnd() * 8, bh = 20 + rnd() * 40; px.rect(x, bx, far + 34 - bh, 20, bh, '#141030'); for (let k = 0; k < 6; k++) if (rnd() < .5) px.dot(x, bx + 3 + Math.floor(rnd() * 14), far + 36 - Math.floor(rnd() * bh), '#ffcf3a'); } }
    else { const hc = g.id === 'downs' ? ['#c8a070', '#b08858'] : g.id === 'hall' ? ['#7a9a7a', '#6a8a6a'] : ['#7aaa6a', '#6a9a5a']; for (let xx = 0; xx < Wd; xx++) { const h1 = 22 + Math.sin(xx * .012 + end.length) * 10 + Math.sin(xx * .041) * 4, h2 = 12 + Math.sin(xx * .02 + 2) * 8; px.rect(x, xx, far + 30 - h1, 1, h1, night ? '#1a2030' : hc[0]); px.rect(x, xx, far + 34 - h2, 1, h2, night ? '#141a28' : hc[1]); } }
    // the near stands / boundary scenery band
    const band = base - 40;
    const stand = (x0, w, h, col) => { px.rect(x, x0, band - h, w, h + 40, col); for (let yy = band - h + 2; yy < band + 14; yy += 4) for (let xx = x0 + 1; xx < x0 + w - 1; xx += 3) if (rnd() < .8) { const sc = ['#d84a3a', '#3a6ad8', '#e8c040', '#f0f0e8', '#5aa04a', pal.accent][Math.floor(rnd() * 6)]; px.rect(x, xx, yy, 2, 2, sc); px.dot(x, xx, yy - 1, '#e0b090'); } };
    if (g.stands === 'dome') { stand(0, Wd, 46, '#2a2440'); px.rect(x, 0, band - 50, Wd, 4, pal.accent); }
    else if (g.stands === 'bleachers') { stand(40, 340, 26, '#8a8ea0'); stand(580, 340, 26, '#8a8ea0'); }
    else if (g.stands === 'terrace') { stand(60, 320, 16, '#b8b0a0'); stand(580, 320, 16, '#b8b0a0'); }
    // a building behind the sight screen
    const mid = Wd / 2;
    if (g.id === 'green') { const b = end === 'S' ? { w: 150, h: 40, c: '#efe4c8', r: '#8a3a2a' } : { w: 110, h: 36, c: '#e8e0d0', r: '#6a3a2a' }; px.rect(x, mid + 90, band - b.h, b.w, b.h + 30, b.c); px.poly(x, [[mid + 84, band - b.h], [mid + 96 + b.w, band - b.h], [mid + 90 + b.w / 2, band - b.h - 20]], b.r); for (let i = 0; i < 4; i++) px.rect(x, mid + 100 + i * 32, band - b.h + 10, 14, 12, '#9fd8f0'); for (let i = 0; i < 5; i++) { const tx = 40 + i * 120 + rnd() * 30; px.disc(x, tx, band - 26, 18, '#3f8a3a'); px.disc(x, tx + 8, band - 34, 14, '#5aa04a'); px.rect(x, tx - 2, band - 12, 5, 14, '#5a3a22'); } px.rect(x, mid - 260, band - 10, 220, 10, '#3f7a32'); }
    if (g.id === 'hall') { px.rect(x, mid - 200, band - 70, 400, 74, '#c8b890'); for (let i = 0; i < 9; i++) px.rect(x, mid - 186 + i * 44, band - 56, 14, 26, '#3a5a7a'); px.rect(x, mid - 204, band - 76, 408, 6, '#6a6a7a'); }
    if (g.id === 'bay') { for (let i = 0; i < 6; i++) { const hx = 60 + i * 34; px.rect(x, hx, band - 22, 26, 26, ['#d83a3a', '#3a7ad8', '#1fb5a8', '#ffd23a'][i % 4]); px.poly(x, [[hx - 2, band - 22], [hx + 28, band - 22], [hx + 13, band - 32]], '#8a2a2a'); } for (let i = 0; i < 4; i++) { const tx = 700 + i * 60; px.rect(x, tx, band - 40, 3, 40, '#8a6a3a'); px.disc(x, tx + 1, band - 42, 12, '#3a9a4a'); } }
    if (g.id === 'downs') { px.rect(x, 120, band - 50, 90, 50, '#5a2a7a'); px.poly(x, [[110, band - 50], [220, band - 50], [165, band - 76]], '#c8ccd8'); px.rect(x, 760, band - 60, 8, 60, '#6a4a2a'); px.rect(x, 790, band - 60, 8, 60, '#6a4a2a'); px.rect(x, 750, band - 88, 56, 30, '#8a6a3a'); }
    // the sight screen behind the batter, the scoreboard to one side, and the boundary boards
    px.rect(x, mid - 46, band - 30, 92, 44, '#f4f2ea'); px.rect(x, mid - 46, band - 30, 92, 2, '#ffffff'); px.rect(x, mid - 46, band + 14, 92, 2, '#8a8a80');
    for (let i = 0; i < 4; i++) px.rect(x, mid - 42 + i * 28, band + 14, 2, 10, '#5a5a60');
    px.rect(x, mid - 240, band - 46, 110, 40, night ? '#141020' : '#1a2a1a'); px.rect(x, mid - 242, band - 48, 114, 3, pal.accent);
    const ads = ["CRUMB'S CAKES", 'LEANING WICKET ALES', 'THRUMPTON HOLDINGS', 'KERFUFFLE TEAS'];
    for (let i = 0; i < 8; i++) { const ax = i * 120 + (end === 'S' ? 0 : 60) - 30, col = [pal.accent, '#f4f0e0', pal.accent2, '#2a2a3a'][i % 4]; px.rect(x, ax, base - 12, 118, 12, col); E.font.text(x, ads[i % 4], ax + 59, base - 10, col === '#f4f0e0' ? '#2a2a3a' : '#ffffff', { align: 'center', font: 'tiny' }); }
    // the grass from the boards down to the bottom edge
    px.rect(x, 0, base - 1, Wd, 2, mixRGB(hexRGB(pal.g1), hexRGB(pal.g2), .5).map(v => Math.round(v)).reduce((s, v) => s + v.toString(16).padStart(2, '0'), '#'));
    const P = { cv: c, w: Wd, h: Ht, board: [mid - 240, band - 46, 110, 40] };
    B.panos[key] = P; return P;
  }
};
K.Ground = Ground;
/** a recipe's prop: engine props (palm, cactus) by r.prop, everything else a shape */
K.drawProp = (r, id, x, y, f) => { if (id === 'palm' || id === 'cactus') r.prop(id, x, y, 0, { size: 1.6 }); else r.shape(id, x, y, 0, { facing: f }); };

/* ---- 31-cast.js ---- */
/* ---- THE CAST: a Humanoid for each player in a role, from the team kit, the player's own look and the role's gear.
 * Batters carry a bat (engine change 1), pads and a helmet with a grille (or a cap: Basil and Edie, for character);
 * fielders a cap or sun hat; the keeper big gloves and pads; umpires a white coat and a brim hat (Rev. Hollis a dog
 * collar and glasses). Ghosts are pale, translucent and bearded. Rigs are cached per player and role. ---- */
const Cast = {
  rigs: {},
  colorsFor(p, kit) {
    const L = p.look || {};
    return { skin: L.skin || '#e0b090', hair: L.hairC || '#3a2418', cloth: L.tweed ? '#7a6a4a' : L.cardigan || kit.cloth, coat: L.cardigan || kit.cloth, pants: kit.pants, boot: kit.boot || '#f4f4f0', belt: kit.belt || kit.trim, trim: kit.trim,
      glove: kit.glove || '#f4f4f0', cape: kit.cape || kit.trim, capeIn: kit.capeIn || kit.cloth, willow: '#e2c890', grip: kit.trim, sticker: kit.chip || '#c8202a', eye: '#1a1418' };
  },
  /** role: 'bat' | 'field' | 'keep' | 'bowl' */
  rig(p, role) {
    const key = p.id + ':' + role; if (this.rigs[key]) return this.rigs[key];
    const team = TEAMS[p.team], kit = team ? team.kit : { cloth: '#f4f4f0', pants: '#f4f4f0', trim: '#2a2a2a', cap: '#2a2a2a' }, L = p.look || {};
    const C = this.colorsFor(p, kit);
    const bat = role === 'bat', keep = role === 'keep';
    const capHat = L.cap || L.zinc || p.id === 'edie' ? { style: 'cap', color: kit.cap } : null;
    let hat = bat ? (capHat || { style: 'helmet', color: kit.cap, grille: true }) : keep ? { style: 'cap', color: kit.cap } : (L.hair === 'bald' || RNG.cosmetic() < .5 ? { style: 'cap', color: kit.cap } : null);
    if (p.ghost && !bat) hat = null;
    if (L.tweed && !bat) hat = { style: 'cap', color: '#6a5a3a' };
    if (p.machine) hat = { style: 'helmet', color: '#c8a040' };
    const o = { size: L.size || 1.18, build: L.build || 'heroic', weapon: bat ? 'bat' : null, outfit: L.cardigan || L.tweed ? 'coat' : 'shirt', sleeves: bat || keep || L.cardigan ? 'long' : 'short',
      hair: { style: L.hair || 'short', color: L.hairC }, hat, pads: bat || keep, bigHands: keep ? 1.5 : bat ? 1.15 : 1, colors: C,
      face: { moustache: L.moustache || null, beard: L.beard || null, glasses: !!L.glasses }, speedRef: 90 };
    if (L.cape) o.cape = { len: 6, width: 5, seg: 2.5 };
    if (p.ghost) { o.eyeGlow = '#a8e0ff'; C.skin = '#c8e0f0'; C.cloth = '#d8e8f4'; C.pants = '#d8e8f4'; }
    if (p.machine) { o.build = 'bulky'; C.skin = '#c8a040'; C.cloth = '#8a6a2a'; C.pants = '#5a4a2a'; o.eyeGlow = '#ff6a3a'; }
    const r = new E.Humanoid(o); r.player = p; r.role = role;
    return (this.rigs[key] = r);
  },
  umpire(u) {
    const key = 'ump:' + u.name; if (this.rigs[key]) return this.rigs[key];
    const L = u.look;
    const r = new E.Humanoid({ size: L.size, build: L.build, weapon: null, outfit: 'coat', sleeves: 'long', hair: { style: L.hair, color: L.hairC }, hat: { style: 'brim', color: '#f4f2ea', band: '#2a2a3a' },
      colors: { skin: L.skin, hair: L.hairC, cloth: L.collar ? '#2a2a34' : '#f4f2ea', coat: '#f4f2ea', pants: '#2a2a34', boot: '#1a1a20', belt: '#f4f2ea', trim: L.collar ? '#ffffff' : '#d8d4c8' }, face: { glasses: !!L.glasses } });
    r.umpire = u; Anim.patch(r);
    return (this.rigs[key] = r);
  },
  /** story and commentary characters who aren't players */
  extras: {},
  extra(id) {
    if (this.extras[id]) return this.extras[id];
    const D = {
      crumb: { build: 'chibi', size: 1.15, weapon: null, outfit: 'robe', sleeves: 'long', hair: { style: 'long', color: '#c8c8c0' }, colors: { skin: '#f2d0b0', cloth: '#e88ab0', trim: '#ffffff', pants: '#e88ab0', boot: '#5a3a2a', belt: '#ffffff', hair: '#c8c8c0' }, face: { glasses: true } },
      hollis: { build: 'heroic', size: 1.18, weapon: null, outfit: 'coat', sleeves: 'long', hair: { style: 'short', color: '#d8d8d0' }, hat: { style: 'brim', color: '#f4f2ea' }, colors: { skin: '#f2d0b0', cloth: '#2a2a34', coat: '#f4f2ea', trim: '#ffffff', pants: '#2a2a34' }, face: { glasses: true } },
      aubrey: { build: 'heroic', size: 1.2, weapon: null, outfit: 'coat', sleeves: 'long', hair: { style: 'short', color: '#c8c8c8' }, hat: { style: 'brim', color: '#e8dcb0', band: '#2a2a5a' }, colors: { skin: '#f2c8a8', cloth: '#f4f4f0', coat: '#c8b890', trim: '#a8202a', pants: '#8a7a5a' }, face: { moustache: 'walrus' } },
      dazza: { build: 'bulky', size: 1.2, weapon: null, outfit: 'shirt', sleeves: 'short', hair: { style: 'spiky', color: '#e8c060' }, hat: { style: 'cap', color: '#1fb5a8' }, colors: { skin: '#e8906a', cloth: '#ffd23a', trim: '#1fb5a8', pants: '#3a5a8a' } },
      priya: { build: 'heroic', size: 1.15, weapon: null, outfit: 'coat', sleeves: 'long', hair: { style: 'short', color: '#1a1410' }, colors: { skin: '#a87050', cloth: '#3a3a5a', coat: '#5a3a8a', trim: '#ffcf3a', pants: '#2a2a3a', hair: '#1a1410' }, face: { glasses: true } },
      thrumpton: null, mascot: { build: 'chibi', size: 1.2, weapon: null, outfit: 'robe', hood: true, hair: { style: 'short', color: '#ffe060' }, colors: { skin: '#f2d0b0', cloth: '#ffe060', hair: '#ffe060', pants: '#ff8a2a', boot: '#ff8a2a', trim: '#ff3a2a' } },
      steward: { build: 'bulky', size: 1.15, weapon: null, outfit: 'shirt', sleeves: 'long', hat: { style: 'cap', color: '#2a2a3a' }, colors: { skin: '#e0b090', cloth: '#ff8a2a', trim: '#ffff60', pants: '#2a2a3a' } }
    }[id];
    const r = D ? new E.Humanoid(D) : this.rig(playerById(id === 'thrumpton' ? 'thrumpton' : id) || TEAMS.ker.players[0], 'field');
    return (this.extras[id] = r);
  },
  portraitOf(id) { const p = playerById(id); if (p) return this.rig(p, 'field'); return this.extra(id); }
};
K.Cast = Cast;

/* ---- 32-anim.js ---- */
/* ---- ANIMATION: the engine's procedural Humanoid, driven from the simulation's actor states. Four tools:
 * (a) attack specs (strokes in the vertical 'side' plane for straight bats, the ground plane for horizontal ones; the
 *     bowling arm's windmill over the top) timed so the bat meets the ball at the shot's contactAt;
 * (b) poses (stance crouch, cheer, cast, kneel, down) and expressions;
 * (c) a solvePose wrapper (Anim.patch) that places hands by E.ik3 for the umpire's signals and appeals;
 * (d) the facing and velocity the walk and run cycles read.
 * Every stroke winds up, strikes and settles back, so nothing snaps. ---- */
const STROKES = {
  // straight-bat strokes: a vertical arc from the back-lift, down through the line, into the follow-through
  drive: { plane: 'side', a0: 2.25, a1: 7.4, reach: 8.2, hand: 'both', lunge: 2.5, lean: .25, crouch: .4, twist: .3 },
  flick: { plane: 'side', a0: 2.2, a1: 6.9, reach: 8, hand: 'both', lunge: 1.5, twist: -.5 },
  loft: { plane: 'side', a0: 2.0, a1: 8.0, reach: 8.6, hand: 'both', lunge: 2.2, lean: .1, twist: .4 },
  scoop: { plane: 'side', a0: 4.6, a1: 2.0, reach: 7.6, hand: 'both', crouch: .8, lean: .3 },
  block: { plane: 'side', a0: 2.4, a1: 4.95, reach: 7.4, hand: 'both', lunge: 2, lean: .3, crouch: .3, hold: .8 },
  // horizontal-bat strokes: the ground plane at chest height
  pull: { a0: 1.9, a1: -2.1, z0: 24, z1: 18, reach: 8.6, hand: 'both', lunge: -1, twist: .8 },
  cut: { a0: 1.4, a1: -1.6, z0: 22, z1: 14, reach: 8.6, hand: 'both', lunge: 1, lean: .2 },
  helicopter: { plane: 'side', a0: 4.4, a1: 10.6, reach: 8.4, hand: 'both', crouch: .5, spin: false },
  // the bowler's arm: over the top in the vertical plane, released at the top front
  windmill: { plane: 'side', a0: 3.9, a1: .25, reach: 9.4, hand: 'R', hop: 2.5, lean: .45, lunge: 3, crouch: .2 },
  spinArm: { plane: 'side', a0: 3.4, a1: .5, reach: 8.8, hand: 'R', hop: 1, lean: .25, lunge: 2, twist: .6 },
  stump: { a0: 1.2, a1: -1.2, z0: 10, z1: 6, reach: 7, hand: 'both' },
  throwArm: 'throw'
};
const FAM_STROKE = { drive: 'drive', flick: 'flick', loft: 'loft', pull: 'pull', cut: 'cut', scoop: 'scoop', block: 'block' };
const Anim = {
  /** the attack state for a stroke at time t since the press (wind ends at the shot's contactAt) */
  stroke(name, t, at, recover = .35) {
    const spec = STROKES[name]; if (!spec) return null;
    const wind = Math.max(.05, at - .035), act = .07;
    if (t < wind) return { spec, phase: 'wind', u: t / wind };
    if (t < wind + act) return { spec, phase: 'active', u: (t - wind) / act };
    if (t < wind + act + recover) return { spec, phase: 'recover', u: (t - wind - act) / recover };
    return null;
  },
  /** a fielder's, batter's or bowler's rig state from its actor (sim units in, map units out) */
  state(a, B, m, role) {
    const an = a.anim || { kind: 'idle', t: 0 }, s = { x: a.x + B.OX, y: a.y + B.OY, z: a.z || 0, vx: a.vx || 0, vy: a.vy || 0, facing: a.facing || 0 };
    const k = an.kind, t = an.t || 0;
    if (role === 'bat') {
      const hand = a.hand || 1, stanceF = hand > 0 ? Math.PI : 0;
      if (k === 'stance') { s.facing = stanceF; s.vx = s.vy = 0; s.crouch = .35; s.attack = null; s.expr = null; }
      else if (k === 'shot') {
        const sh = SHOTS[an.shot] || SHOTS.push, name = an.shot === 'helicopter' ? 'helicopter' : FAM_STROKE[sh.fam] || 'drive';
        const th = (m && m.contact && m.contact.theta !== undefined && an.contact) ? m.contact.theta : (m && m.shotPress && m.shotPress.sector !== null && m.shotPress.sector !== undefined ? m.shotPress.sector : sh.nat);
        const [dx, dy] = dirOf(th, hand), shotF = Math.atan2(dy, dx), turn = name === 'block' ? .55 : name === 'pull' || name === 'cut' ? .5 : .75;
        s.facing = stanceF + wrapAng(shotF - stanceF) * turn * Math.min(1, t / Math.max(.05, sh.at));
        s.attack = Anim.stroke(name, t, sh.at, name === 'block' ? .9 : .45); s.vx = s.vy = 0; s.crouch = .2;
        if (!s.attack) { s.facing = stanceF + wrapAng(shotF - stanceF) * turn; s.crouch = .15; }
        if (an.grade === 'perfect' && an.contact) s.expr = 'smile';
        if (an.grade === 'miss' || (m && m.cur && m.cur.beaten)) s.expr = 'wince';
      }
      else if (k === 'leave') { s.facing = stanceF; s.attack = { spec: { plane: 'side', a0: 1.9, a1: 1.9, reach: 8, hand: 'both' }, phase: 'active', u: 1 }; s.vx = s.vy = 0; }
      else if (k === 'duck') { s.facing = stanceF; s.crouch = 1; s.pose = 'crouch'; s.vx = s.vy = 0; }
      else if (k === 'charge') { s.facing = Math.PI / 2; s.run = .8; s.vy = 90; }
      else if (k === 'run' || k === 'slip') { s.run = 1; if (k === 'slip') s.hurt = true; }
      else if (k === 'dive') { s.down = .55; s.vx = s.vy = 0; }
      else if (k === 'celebrate') { s.pose = 'cheer'; s.expr = 'smile'; s.vx = s.vy = 0; }
      else if (k === 'out') { s.expr = 'wince'; s.pose = 'kneel'; s.vx = s.vy = 0; }
      if (a.down > 0) s.down = .6;
      return s;
    }
    if (role === 'bowl') {
      if (k === 'runup') { s.run = 0; }
      else if (k === 'deliver') {
        const spin = m && m.bowlerFamily() === 'spin', mach = m && m.bowlerFamily() === 'machine';
        if (!mach) { s.attack = Anim.stroke(spin ? 'spinArm' : 'windmill', t, .16, .35); s.facing = -Math.PI / 2; }
        if (t > .5 && !mach) { s.vx = 0; s.vy = -40 * Math.max(0, 1 - t); }
      } else if (k === 'appeal' || k === 'celebrate') { s.pose = 'cheer'; s.expr = 'shout'; s.vx = s.vy = 0; }
      else if (k === 'mark') { s.vx = s.vy = 0; }
      if (an.kind === 'appeal' || an.kind === 'celebrate') return s;
    }
    switch (k) {
      case 'walkin': s.crouch = .45; break;
      case 'ready': case 'crouch': s.crouch = role === 'keep' ? .9 : .5; if (role === 'keep') s.pose = 'crouch'; break;
      case 'gather': s.crouch = .7; s.pose = t < .3 ? 'cast' : null; break;
      case 'catch': s.pose = t < .6 ? 'cast' : 'cheer'; s.expr = t > .4 ? 'shout' : null; s.vx = s.vy = 0; break;
      case 'divecatch': s.down = t < .9 ? .8 : 0; s.pose = t > .9 ? 'cheer' : 'cast'; s.expr = 'shout'; break;
      case 'divestop': s.down = t < .5 ? .7 : 0; break;
      case 'drop': s.hurt = t < .4; s.expr = 'wince'; s.pose = t < 1 ? 'kneel' : null; break;
      case 'fumble': s.hurt = t < .3; s.expr = 'wince'; break;
      case 'throw': s.attack = t < .45 ? E.move('throw', Math.min(1, t / .45)) : null; break;
      case 'stump': s.attack = Anim.stroke('stump', t, .08, .3); s.crouch = .6; break;
      case 'appeal': case 'celebrate': s.pose = 'cheer'; s.expr = 'shout'; s.vx = s.vy = 0; break;
      case 'sad': s.pose = 'kneel'; s.expr = 'wince'; break;
    }
    if (a.down > 0 && !s.down) s.down = .7;
    return s;
  },
  /** the umpire's hands by E.ik3, on top of the solved pose: OUT, FOUR, SIX, WIDE, NO BALL, BYE, LEG BYE, FREE HIT,
   *  REVIEW (a TV rectangle drawn in the air) and DEAD BALL */
  patch(rig) {
    const base = rig.solvePose;
    rig.solvePose = function () {
      base.call(this);
      const sig = this.sig, t = this.sigT || 0; if (!sig || sig === 'notout') return;
      const o = this.o, J = this.J, L = o.armUpper + o.armLower, slow = (this.umpire && this.umpire.slowFinger) || .5;
      const set = (side, target) => { const sh = side > 0 ? J.shR : J.shL, [el, h] = E.ik3(sh, target, o.armUpper, o.armLower, [-1, side * .7, -.2]); J[side > 0 ? 'elbowR' : 'elbowL'] = el; J[side > 0 ? 'handR' : 'handL'] = h; };
      const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], k = Math.min(1, t / .25);
      if (sig === 'out') { const u = Math.min(1, t / slow); set(1, add(J.shR, [.6 + (1 - u) * 3, .3, -L * .6 + u * L * 1.55])); }
      else if (sig === 'four') { const w = Math.sin(t * 7); set(1, add(J.shC, [3.5, w * 6, -1 + k])); }
      else if (sig === 'six') { set(1, add(J.shR, [.5, .8, L * .95 * k])); set(-1, add(J.shL, [.5, -.8, L * .95 * k])); }
      else if (sig === 'wide') { set(1, add(J.shR, [.2, L * .95 * k, 0])); set(-1, add(J.shL, [.2, -L * .95 * k, 0])); }
      else if (sig === 'noball') set(1, add(J.shR, [.2, L * .95 * k, 0]));
      else if (sig === 'bye') set(1, add(J.shR, [2.5, .5, L * .75 * k]));
      else if (sig === 'legbye') { set(1, add(J.kneeR || J.hipR, [2.5, .5, 2])); }
      else if (sig === 'freehit') set(1, add(J.shR, [Math.cos(t * 9) * 2.5, .5 + Math.sin(t * 9) * 2.5, L * .9]));
      else if (sig === 'review') { const p = (t * .9) % 1, rx = p < .25 ? p * 4 : p < .5 ? 1 : p < .75 ? 1 - (p - .5) * 4 : 0, ry = p < .25 ? 0 : p < .5 ? (p - .25) * 4 : p < .75 ? 1 : 1 - (p - .75) * 4; set(1, add(J.shC, [5, 1 + rx * 5, 2 + ry * 5])); set(-1, add(J.shC, [5, -1 - rx * 5, 2 + ry * 5])); }
      else if (sig === 'dead') { set(1, add(J.shC, [4, -1.5, -5])); set(-1, add(J.shC, [4, 1.5, -5])); }
    };
  }
};
K.Anim = Anim; K.STROKES = STROKES;

/* ---- 34-view.js ---- */
/* ---- THE MATCH VIEW: four fixed orthographic cameras, cut like TV (never a zoom tween: each zoom would re-bake the
 * floor). broadcast (behind the bowler, telephoto: every delivery), wide (follows the ball round the ground), review
 * (side-on, for the third umpire and run-out replays) and close (wickets, celebrations, signals). The director picks a
 * named shot from the ball's state; every in-match change is a hard cut. This file also draws the match: the ground,
 * the far-end panorama, props, the crowd, the players' rigs, the ball and its trail, the stumps and the effects. ---- */
const Views = {
  v: {},
  make() {
    this.v.broadcast = new E.View('broadcast', 'Broadcast', 0, T('camPitch'), T('camScale'), 1);
    this.v.wide = new E.View('wide', 'Wide', 0, 55, T('wideScale'), 1);
    this.v.review = new E.View('review', 'Side-on', 90, 10, 2.2, 1);
    this.v.close = new E.View('close', 'Close-up', 0, 24, 2.4, 1);
    this.v.story = new E.View('story', 'Three-quarter', 0, 50, 1.6, 1.25);
    return this.v;
  },
  rebuild(which) { const v = this.v[which]; if (!v) return; if (which === 'broadcast') v.set(0, T('camPitch'), T('camScale'), 1); if (which === 'wide') v.set(0, 55, T('wideScale'), 1); }
};
/* the recorder: the last 10 s at 30 Hz (each actor's pose inputs, the ball, the stumps), for instant replays and the
 * results screen's highlights */
const Recorder = {
  frames: [], max: 300, acc: 0,
  reset() { this.frames = []; this.acc = 0; },
  push(m, dt) {
    this.acc += dt; if (this.acc < 1 / 30) return; this.acc = 0;
    const A = []; for (const a of m.fielders.concat(m.batters)) A.push({ id: a.id, x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, anim: Object.assign({}, a.anim), down: a.down, hand: a.hand });
    this.frames.push({ t: m.time, A, ball: { x: m.ball.x, y: m.ball.y, z: m.ball.z, phase: m.ball.phase, hidden: m.ball.hidden }, stumps: MatchView.stumpsState ? MatchView.stumpsState.slice() : null });
    if (this.frames.length > this.max) this.frames.shift();
  },
  /** the frames of the last `seconds` before now (a replay's window) */
  window(seconds) { const n = Math.round(seconds * 30); return this.frames.slice(Math.max(0, this.frames.length - n)); }
};
/* a seagull, wings up and wings down (white, grey wingtips, an orange beak) */
const GULL_UP = E.sprite(['k.....k', 'kw...wk', '.wwbww.', '..www..'], { k: '#5a5a62', w: '#f4f4f0', b: '#ffb030' }, 2);
const GULL_DOWN = E.sprite(['..www..', '.wwbww.', 'kw...wk', 'k.....k'], { k: '#5a5a62', w: '#f4f4f0', b: '#ffb030' }, 2);
const MatchView = {
  B: null, m: null, shot: 'broadcastSetup', cam: 'broadcast', shotT: 0, trail: [], bails: [], fxList: [], replay: null, stumpsState: [0, 0], flashT: 0, lastBallPhase: null, cutAt: 0,
  attach(m) {
    this.m = m; this.B = Ground.get(m.ground.id); this.trail = []; this.bails = []; this.fxList = []; this.replay = null; this.stumpsState = [0, 0]; this.cam = 'broadcast'; this.shot = 'broadcastSetup'; this.shotT = 0;
    Recorder.reset();
    K.view = Views.v.broadcast;
    this.setCam('broadcast');
  },
  setCam(id) { this.cam = id; K.game.setView(Views.v[id]); K.view = Views.v[id]; },
  night() { return this.m && this.m.timeOfDay === 'night'; },
  /** the director: choose a shot from what the ball is doing */
  direct(dt) {
    const m = this.m, g = K.game, B = this.B; if (!m) return;
    this.shotT += dt;
    const b = m.ball, want = (() => {
      if (this.replay) return this.replay.cam;
      if (m.decision && m.decision.reviewing && m.decision.kind === 'lbw') return 'broadcast';
      if (m.decision && m.decision.kind === 'third' && m.decision.pending) return 'review';
      if (m.phase === 'inPlay' || (m.phase === 'dead' && (m.cur.boundary || m.ballFlying > 0))) {
        if (m.cur.stumpChance) return 'broadcast';
        const c = m.contact, lofted = c && c.launch > 18, outOfFrame = this.leavesFrame();
        if ((lofted || outOfFrame || !c) && m.pt > .12) return 'wide';
        if (this.cam === 'wide') return 'wide';
        return 'broadcast';
      }
      if (m.phase === 'dead' && m.cur.wicket && !m.decision && m.pt < 1.6) return m.pt < .9 ? (this.cam === 'wide' ? 'wide' : 'close') : 'close';
      if (m.phase === 'dead' && this.cam === 'wide' && m.pt < 1.2) return 'wide';
      if (m.phase === 'dead' && m.decision && m.decision.pending) return 'close';
      return 'broadcast';
    })();
    if (want !== this.cam) { this.setCam(want); this.shotT = 0; coverage.mark('cam:' + want); }
    // the camera's point
    const cam = g.cam; cam.smooth = 0;
    if (this.cam === 'broadcast') {
      const by = Views.v.broadcast.by || .3, H = g.H || 240, yf = 20 + .1 * H / by;   // the striker's feet at 40% of the screen's height
      g.focus(B.OX, B.OY + yf, 0);
    } else if (this.cam === 'wide') {
      cam.smooth = .22;
      const lead = m.chaser && m.chaser.chase && !m.holder ? m.chaser.chase : null, fx = lead ? (b.x + lead.x) / 2 : b.x, fy = lead ? (b.y + lead.y) / 2 : b.y;
      const src = this.replay ? this.replay.ball : b;
      g.focus(B.OX + (this.replay ? src.x : fx), B.OY + (this.replay ? src.y : fy), 0);
    } else if (this.cam === 'close') {
      const w = m.cur.wicket, catcher = w && w.catcher ? m.fielders.find(f => f.id === w.catcher) : null;
      const t = m.decision && m.decision.pending ? m.umpires[0] : catcher || (m.cur.stumpsBroken ? { x: 0, y: 0 } : m.striker) || m.striker;
      g.focus(B.OX + (t ? t.x : 0), B.OY + (t ? t.y : 0), 14);
    } else if (this.cam === 'review') { g.focus(B.OX + 0, B.OY + (m.cur.wicket && m.cur.wicket.end === 'bowler' ? G.BOWL_Y : 0), 10); }
  },
  /** will the ball leave the broadcast frame within 0.8 s (past the panorama, or the screen's edges)? */
  leavesFrame() {
    const m = this.m, s = m.samples; if (!s || !s.length) return false;
    const v = Views.v.broadcast, W = K.game.W || 427;
    for (const p of s) { if (p.t > .8) break; if (p.y < -185 || Math.abs(p.x * v.ax) > W / 2 - 10 || p.y > 520) return true; }
    return false;
  },
  /* ---- the rigs: posed each step from the simulation (or from a replay's frame) ---- */
  rigFor(a, m) {
    if (a.role === 'umpire') return Cast.umpire(a.u);
    const role = a.role === 'batter' ? 'bat' : a === m.keeper ? 'keep' : 'field';
    return Cast.rig(a.p, role);
  },
  updateRigs(dt) {
    const m = this.m, B = this.B; if (!m) return;
    const frame = this.replay ? this.replayFrame() : null;
    const list = m.fielders.concat(m.batters);
    for (const a of list) {
      const src = frame ? (frame.A.find(f => f.id === a.id) || a) : a, rig = this.rigFor(a, m);
      if (a.p && a.p.machine) continue;
      const role = a.role === 'batter' ? 'bat' : a === m.bowler ? 'bowl' : a === m.keeper ? 'keep' : 'field';
      const st = Anim.state(Object.assign({}, a, src, { anim: src.anim || a.anim }), B, frame ? null : m, role);
      rig.oneHand = !!a.oneHand && role === 'bat';
      rig.o.batScale = role === 'bat' && m.flags.giantBat > 0 ? 1.6 : 1;
      rig.update(dt, st);
    }
    for (const u of m.umpires) {
      const rig = Cast.umpire(u.u), an = u.anim || {};
      if (an.kind === 'signal') { rig.sig = an.sig; rig.sigT = an.t; if (an.t > 3.2) { u.anim = { kind: 'idle', t: 0 }; rig.sig = null; } } else rig.sig = null;
      rig.update(dt, { x: u.x + B.OX, y: u.y + B.OY, z: 0, vx: 0, vy: 0, facing: u.facing, crouch: m.phase === 'runup' || m.phase === 'flight' ? .3 : 0, expr: an.sig === 'out' ? 'angry' : null });
    }
    // the trail and effects
    const b = frame ? frame.ball : m.ball;
    if (b.phase !== 'held' && !(b.phase === 'dead' && !m.ballFlying)) { this.trail.push([b.x, b.y, b.z]); if (this.trail.length > 12) this.trail.shift(); } else if (this.trail.length) this.trail.shift();
    for (const p of this.bails) { p.vz -= 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt; if (p.z < 0) { p.z = 0; p.vz *= -.3; p.vx *= .6; p.vy *= .6; p.vr *= .5; } p.t += dt; }
    this.bails = this.bails.filter(p => p.t < 4);
    for (const f of this.fxList) f.t += dt; this.fxList = this.fxList.filter(f => f.t < f.life);
    if (!frame) Recorder.push(m, dt);
    if (this.replay) { this.replay.t += dt * this.replay.speed; if (this.replay.t >= this.replay.len) this.replay = null; }
  },
  /* ---- replays: re-pose the rigs from the recorded frames at half speed with a REPLAY bug ---- */
  startReplay(seconds, cam) {
    const fr = Recorder.window(seconds); if (fr.length < 10) return false;
    this.replay = { frames: fr, t: 0, len: fr.length / 30, speed: .5, cam: cam || 'broadcast', ball: fr[0].ball };
    this.trail = []; coverage.mark('replay');
    return true;
  },
  replayFrame() { const R = this.replay, i = clamp(Math.floor(R.t * 30), 0, R.frames.length - 1), f = R.frames[i]; R.ball = f.ball; return f; },
  skipReplay() { this.replay = null; },
  /* ---- events that make effects ---- */
  onEvent(type, d) {
    const m = this.m, P = K.game.particles, B = this.B; if (!m || d.match !== m) return;
    const W = (x, y) => [x + B.OX, y + B.OY];
    if (type === 'bat:contact') {
      const [x, y] = W(m.ball.x, m.ball.y);
      P.bits(x, y, m.ball.z, d.grade === 'perfect' ? 10 : 5, ['#e2c890', '#c8a868', '#fff4d8']);
      if (d.grade === 'perfect' && d.kind === 'clean') { P.impact && P.impact(x, y, m.ball.z, 1.2, '#fff6c0'); K.game.shake(1); }
      if (d.special) P.glints(x, y, m.ball.z, 12, '#ffe060');
    }
    if (type === 'stumps:broken') {
      const sy = d.end === 'B' ? G.BOWL_Y : 0, [x, y] = W(0, sy), big = d.how === 'bowled' || d.how === 'sawn' || m.special;
      this.stumpsState[d.end === 'B' ? 1 : 0] = d.sawn ? 2 : 1;
      for (const s of [-1, 1]) this.bails.push({ x: s * 1.3, y: sy, z: 12.5, vx: s * 40 + (RNG.cosmetic() - .5) * 30, vy: (d.end === 'B' ? 1 : -1) * (40 + RNG.cosmetic() * 60), vz: 90 + RNG.cosmetic() * 80 + (big ? 80 : 0), rot: 0, vr: (RNG.cosmetic() - .5) * 30, t: 0 });
      P.dust(x, y, 2, 10); K.game.shake(big ? 2 : 1);
    }
    if (type === 'boundary' && d.n === 6 && this.night()) { for (let i = 0; i < 3; i++) K.game.after(.2 + i * .25, () => { const [x, y] = W(d.x + (RNG.cosmetic() - .5) * 200, d.y + 100); P.explosion(x, y, 90 + RNG.cosmetic() * 60, .6, { shake: 0, freeze: false, debris: false }); }); coverage.mark('fireworks'); }
    if (type === 'target:hit') { const t = m.ground.targets.find(q => q.id === d.id), p = m.targetPos(t), [x, y] = W(p[0], p[1]); P.explosion(x, y, p[2], .7, { shake: 2, freeze: false }); P.glints(x, y, p[2], 20, '#ffffff'); this.fxList.push({ kind: 'target', id: d.id, t: 0, life: 99 }); K.game.timeScale = .4 * T('timeScale'); K.game.after(.4 * .4, () => { K.game.timeScale = T('timeScale'); }); }
    if (type === 'wicket' && !d.freeHit) { K.game.timeScale = .35 * T('timeScale'); K.game.after(.8 * .35, () => { K.game.timeScale = T('timeScale'); }); }
    if (type === 'catch:screamer') { K.game.timeScale = .3 * T('timeScale'); K.game.after(.6 * .3, () => { K.game.timeScale = T('timeScale'); }); }
    if (type === 'fx:vanish') { const [x, y] = W(m.ball.x, m.ball.y); P.smoke(x, y, m.ball.z, 8, { color: '#8a4ab0' }); }
    if (type === 'ball:dead' && d.why === 'boundary') { const g = this.nearestGroup(m.ball.x, m.ball.y); if (g) g.scatter = 1.5; }
    if (type === 'crowd:catch') { const g = this.nearestGroup(d.x, d.y); if (g) { g.scatter = 0; g.catchT = 2.6; let bi = 0, bd = 1e9; g.list.forEach((c, i) => { const dd = hyp(c.x - d.x, c.y - d.y); if (dd < bd) { bd = dd; bi = i; } }); g.catcher = bi; } }
    if (type === 'six:land') { const g = this.nearestGroup(d.x, d.y); if (g) g.scatter = 2; const [x, y] = W(d.x, d.y); if (this.m.ground.id === 'bay' && d.x < -this.m.ground.rx) { P.smoke(x, y, 2, 10, { color: '#bfe8ff' }); } else P.dust(x, y, d.z, 6); }
    if (type === 'ball:setup') { this.stumpsState = [0, 0]; this.trail = []; this.fxList = this.fxList.filter(f => f.kind === 'target'); }
    if (type === 'match:start') this.fxList = [];
    if (type === 'fire:on') K.game.flash('#ff8a2a', .15, .4);
  },
  nearestGroup(x, y) { let best = null, bd = 1e9; for (const g of this.B.groups) { const d = hyp(g.x - x, g.y - y); if (d < bd) { bd = d; best = g; } } return bd < 400 ? best : null; },
  /** the fog: a ball more than 260 units from the batter can't be seen unless it is lit (aflame, holy light, steam) */
  ballVisible(m, b) { if (!(m.fog > .3) || !m.striker) return 1; const lit = b.fx === 'fire' || b.fx === 'holy' || b.fx === 'steam' || m.fire.bowl > 0 || m.fire.bat > 0; if (lit) return 1; const d = hyp(b.x - m.striker.x, b.y - m.striker.y); return d <= 220 ? 1 : d >= 260 ? 0 : (260 - d) / 40; },
  /** a seagull's place: circling over the outfield, or (during a swoop) diving onto the ball, then carrying it off */
  gullPose(c, i, t) {
    const S = c.data.swoop, a = t * .5 + i * 2.1, cx = Math.cos(a) * (240 + i * 40), cy = G.MID_Y + Math.sin(a) * (180 + i * 30);
    if (S && i === 0 && S.t < 2.2) { const k = S.t; if (k < .7) { const u = k / .7; return { x: lerp(cx, S.x0, u), y: lerp(cy, S.y0, u), z: lerp(70, 6, u), flap: false, carry: false }; } if (k < 1.6) { const u = (k - .7) / .9; return { x: lerp(S.x0, S.x1, u), y: lerp(S.y0, S.y1, u), z: 6 + Math.sin(u * Math.PI) * 26, flap: true, carry: true }; } const u = (k - 1.6) / .6; return { x: lerp(S.x1, cx, u), y: lerp(S.y1, cy, u), z: lerp(10, 70, u), flap: true, carry: false }; }
    return { x: cx, y: cy, z: 64 + Math.sin(t * 2 + i) * 6, flap: Math.floor(t * 6 + i) % 4 < 2, carry: false };
  },
  /* ---- drawing the match ---- */
  draw(r) {
    const m = this.m, B = this.B, g = K.game; if (!m) return;
    const W = (x, y) => [x + B.OX, y + B.OY], vid = r.view.id, night = this.night(), frame = this.replay ? this.replayFrame() : null, ready = !!m.inn;
    // light
    const L = g.lights; L.enabled = true;
    L.ambient = night ? .42 : m.timeOfDay === 'dusk' ? .7 : m.weather === 'overcast' || m.weather === 'rain' ? .78 : .95;
    if (m.rain || m.weather === 'rain') L.ambient = Math.min(L.ambient, .68);
    if (night) for (const [fx, fy] of [[-820, -380], [820, -380], [-820, 720], [820, 720]]) { const [x, y] = W(fx, fy); L.add(x, y, 220, 1100, .75, { color: '#fff4dc' }); }
    else if (m.timeOfDay === 'dusk') { const [x, y] = W(-600, -300); L.add(x, y, 300, 1600, .3, { color: '#ffb070' }); }
    // the ground
    r.sky(night ? ['#05050f', '#0a0a1e', '#141030'] : m.ground.pal.sky);
    B.map.drawFloor(r);
    // floor marks: the tide's water edge, the covers, the length bands, the marker, the aim arrow, shadows
    if (m.boundaryShrink > 0 && m.ground.seaSide) r.decal(gg => { for (let yy = -300; yy <= 620; yy += 6) { const ex = -m.boundaryAt(-1, yy - G.MID_Y) * 0 - Math.sqrt(Math.max(0, 1 - ((yy - G.MID_Y) / m.ground.ry) ** 2)) * m.ground.rx * (1 - m.boundaryShrink); const [ax, ay] = r.w(...W(ex - 12, yy)), [bx] = r.w(...W(-m.ground.rx * 1.1, yy)); px.rect(gg, Math.min(ax, bx), ay, Math.abs(ax - bx), 2, '#3a9ad8'); px.rect(gg, ax - 1, ay, 3, 2, '#e8f4ff'); } });
    if (ready) this.drawMarks(r, W, frame);
    B.map.queueWalls(r);
    // props, targets, sight screens, scoreboard and stumps
    // the broadcast camera stands behind the bowler: whatever is south of it (y > 520) is behind the lens, not drawn
    const behindLens = (y, h) => vid === 'broadcast' && y > 520 && h > 6;
    for (const [id, x, y, f] of m.ground.props) { if (behindLens(y, 20)) continue; const [mx, my] = W(x, y); K.drawProp(r, id, mx, my, f); }
    for (const t of m.ground.targets) {
      const p = m.targetPos(t), [mx, my] = W(p[0], p[1]), broken = m.targetsHit[t.id];
      if (behindLens(p[1], t.size[2])) continue;
      if (t.shape) { const params = t.shape.endsWith('ferrisWheel') ? { angle: Math.floor(g.time * 2) % 16 } : undefined; r.shape(t.shape, mx, my, t.id === 'balloon' || t.id === 'shark' ? p[2] - 20 : 0, { facing: t.face || 0, params }); }
      if (broken) r.queue(mx, my, p[2], gg => { const [sx, sy] = r.w(mx, my, p[2]); for (let i = 0; i < 6; i++) px.dot(gg, sx + Math.sin(i * 2.3) * 6, sy + Math.cos(i * 1.7) * 5, '#ffffff'); }, { bias: 1 });
      if (m.kerfuffle && !broken && vid === 'wide') r.queue(mx, my, p[2] + t.size[2] / 2 + 8, gg => { const [sx, sy] = r.w(mx, my, p[2] + t.size[2] / 2 + 8); if (Math.floor(g.time * 2) % 2) E.font.text(gg, '+' + t.bonus, sx, sy, '#ffe060', { align: 'center', outline: '#000' }); }, { emissive: true, bias: 2 });
    }
    for (const sy of [-m.boundaryAt(0, -1) + G.MID_Y - 50, G.MID_Y + m.boundaryAt(0, 1) + 50]) { if (behindLens(sy, 40)) continue; const [mx, my] = W(0, sy); r.shape('KERFUFFLE:sightscreen', mx, my, 0, { facing: sy < 0 ? Math.PI / 2 : -Math.PI / 2 }); }
    const stS = W(0, 0), stB = W(0, G.BOWL_Y);
    r.shape(this.stumpsState[0] ? 'KERFUFFLE:stumpsDown' : 'KERFUFFLE:stumps', stS[0], stS[1], 0, { facing: Math.PI / 2 });
    if (m.bowlerFamily() !== 'machine' || true) r.shape(this.stumpsState[1] ? 'KERFUFFLE:stumpsDown' : 'KERFUFFLE:stumps', stB[0], stB[1], 0, { facing: Math.PI / 2 });
    for (const p of this.bails) { const [mx, my] = W(p.x, p.y); r.queue(mx, my, p.z, gg => { const [sx, sy] = r.w(mx, my, p.z), c = Math.cos(p.rot), s = Math.sin(p.rot); px.line(gg, sx - c * 2, sy - s * 2, sx + c * 2, sy + s * 2, '#d8c8a0', 1); }); }
    if (m.rain || m.phase === 'rainDelay') { const [mx, my] = W(0, G.MID_Y); r.shape('KERFUFFLE:covers', mx, my, 0, { params: { spread: Math.min(1, m.pt / 2) } }); }
    if (ready && m.bowlerFamily() === 'machine' && m.bowler) { const [mx, my] = W(m.bowler.x, Math.max(m.bowler.y, G.BOWL_Y + 12)); r.shape('KERFUFFLE:thrumptonator', mx, my, 0, { facing: -Math.PI / 2, params: { angle: Math.floor(g.time * (m.phase === 'runup' ? 24 : 4)) % 16 } }); if (Math.floor(g.time * 6) % 3 === 0) g.particles.smoke(mx, my - 10, 38, 1, { color: '#e8e8f0' }); }
    // the crowd
    this.drawCrowd(r, W);
    // the Nets' net walls: posts at the corners, a dithered mesh between them
    if (m.ground.netPanels) for (const [x0, y0, x1, y1] of m.ground.netPanels) {
      for (const [px0, py0] of [[x0, y0], [x1, y1]]) { const [mx, my] = W(px0, py0); r.shape('KERFUFFLE:netPost', mx, my, 0); }
      const [ax, ay] = W(x0, y0), [bx2, by2] = W(x1, y1);
      r.queue((ax + bx2) / 2, (ay + by2) / 2, 0, gg => {
        const p0 = r.w(ax, ay, 0), p1 = r.w(bx2, by2, 0), p2 = r.w(bx2, by2, 50), p3 = r.w(ax, ay, 50);
        px.polyDither(gg, [p0, p1, p2, p3], '#1e3a24', .35, r.ix, r.iy);
        for (let k = 0; k <= 10; k++) { const u = k / 10, q0 = [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u)], q1 = [lerp(p3[0], p2[0], u), lerp(p3[1], p2[1], u)]; px.line(gg, q0[0], q0[1], q1[0], q1[1], '#2a4a30'); }
        for (let k = 0; k <= 6; k++) { const u = k / 6; px.line(gg, lerp(p0[0], p3[0], u), lerp(p0[1], p3[1], u), lerp(p1[0], p2[0], u), lerp(p1[1], p2[1], u), '#2a4a30'); }
        px.line(gg, p3[0], p3[1], p2[0], p2[1], '#5a6a5a');
      }, { bias: .1 });
    }
    // the players
    const list = m.fielders.concat(m.batters);
    for (const a of list) {
      if (a.p && a.p.machine) continue;
      const src = frame ? (frame.A.find(f => f.id === a.id) || a) : a, rig = this.rigFor(a, m), [mx, my] = W(src.x, src.y);
      const ghost = a.ghost, phased = m.flags.ghostPhase && m.flags.ghostPhase.id === a.id;
      r.shadow(mx, my, 5, .35);
      const fogged = m.fog > .3 && m.striker && hyp(src.x - m.striker.x, src.y - m.striker.y) > 400;   // fog: fielders far from the batter fade
      r.actor(mx, my, src.z || 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view), ghost ? { alpha: phased ? .25 : fogged ? .4 : .6, ghost: { color: '#a8e0ff', life: .3, alpha: .3, owner: src } } : fogged ? { alpha: .5 } : { xray: true });
      if (a.role === 'batter' && a === m.striker && (m.fire.bat > 0 || m.cfg.cheat.alwaysFire) && Math.floor(g.time * 30) % 2 === 0) { const h = rig.tip(); g.particles.fire(h[0], h[1], h[2], 1, { size: .6 }); }
      if (rig.trail && rig.trail.length > 1 && a.role === 'batter') rig.drawSmear(r, ['#fff8e0', '#ffe8a0', '#e8c870', '#c8a050']);
    }
    for (const u of m.umpires) { const rig = Cast.umpire(u.u), [mx, my] = W(u.x, u.y); r.shadow(mx, my, 5, .3); r.actor(mx, my, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view)); }
    // chaos actors
    for (const c of m.chaos) {
      if (c.id === 'cow' && c.pos) { const [mx, my] = W(c.pos[0], c.pos[1]); r.shape('KERFUFFLE:cow', mx, my, 0, { facing: c.facing || 0, params: { step: Math.floor(g.time * 8) % 16 } }); }
      if (c.id === 'peacocks' && c.pos) { const [mx, my] = W(c.pos[0], c.pos[1]); r.shape('KERFUFFLE:peacock', mx, my, 0, { facing: g.time * .3 }); }
      if (c.id === 'mascot' && c.pos) { const mr = Cast.extra('mascot'), sr = Cast.extra('steward'), [mx, my] = W(c.pos[0], c.pos[1]); mr.update(1 / 60, { x: mx, y: my, z: 0, vx: 60, vy: 0, facing: 0, run: 1 }); r.actor(mx, my, 0, (gg, ox, oy) => mr.draw(gg, ox, oy, r.view)); sr.update(1 / 60, { x: mx - 40, y: my, z: 0, vx: 60, vy: 0, facing: 0, run: 1 }); r.actor(mx - 40, my, 0, (gg, ox, oy) => sr.draw(gg, ox, oy, r.view)); }
      if (c.id === 'bees' && c.data.who) { const a = c.data.who, [mx, my] = W(a.x, a.y); r.queue(mx, my, 24, gg => { const [sx, sy] = r.w(mx, my, 26); for (let i = 0; i < 8; i++) px.dot(gg, sx + Math.sin(g.time * 9 + i * 2) * 7, sy + Math.cos(g.time * 11 + i) * 4, i % 2 ? '#ffe040' : '#2a2a2a'); }, { bias: 2 }); }
      if (c.id === 'gulls') for (let i = 0; i < 3; i++) { const p = this.gullPose(c, i, c.t), [gx, gy] = W(p.x, p.y); r.shadow(gx, gy, 3, .2); r.sprite(gx, gy, p.z, p.flap ? GULL_UP : GULL_DOWN, { anchor: 'center', flip: Math.cos(c.t * .5 + i * 2.1) > 0 }); if (p.carry) r.queue(gx, gy, p.z - 3, gg => { const [sx, sy] = r.w(gx, gy, p.z - 3); px.disc(gg, sx, sy, 1.6, '#b8202a'); }, { bias: .3 }); }
      if (c.id === 'dustdevil') { const [mx, my] = W(Math.sin(c.t * .4) * 300, G.MID_Y + Math.cos(c.t * .3) * 200); if (Math.floor(g.time * 20) % 2 === 0) g.particles.dust(mx, my, 4 + RNG.cosmetic() * 30, 1); }
      if (c.id === 'rabbits') { for (let i = 0; i < 3; i++) { const [mx, my] = W(-440 + c.t * 90 + i * 20, 650 - c.t * 40 + i * 9); r.queue(mx, my, 0, gg => { const [sx, sy] = r.w(mx, my, Math.abs(Math.sin(c.t * 9 + i)) * 4); px.rect(gg, sx - 2, sy - 3, 4, 3, '#f4f0e8'); px.rect(gg, sx - 1, sy - 6, 1, 3, '#f4f0e8'); px.rect(gg, sx + 1, sy - 6, 1, 3, '#f4f0e8'); }); } }
    }
    // item tokens
    for (const t of m.tokens) { const [mx, my] = W(t.x, t.y), bob = Math.sin(t.t * 3) * 3; r.queue(mx, my, t.z + bob, gg => this.drawToken(gg, r, mx, my, t.z + bob, t.id), { emissive: true }); r.shadow(mx, my, 4, .25); }
    // the ball, its shadow and its trail (and the Triple Threat's holograms)
    if (ready) this.drawBall(r, W, frame);
    // the far-end panorama (broadcast only): drawn in front of everything north of y -190
    if (vid === 'broadcast') {
      const P = Ground.pano(B, m.over % 2 ? 'B' : 'S', night);
      if (P) { const [mx, my] = W(0, -190); r.queue(mx, my, 0, gg => { const [sx, sy] = r.w(mx, my, 0), par = (K.game.cam.x || 0) * -.3 % 1; const top = Math.round(sy - P.h + 2); if (top > 0) px.rect(gg, 0, 0, r.W, top, night ? '#05050f' : m.ground.pal.sky[0]); gg.drawImage(P.cv, Math.round(sx - P.w / 2 + par), top); this.drawScoreboard(gg, Math.round(sx - P.w / 2 + par), Math.round(sy - P.h + 2), P); }, { bias: -1, emissive: night }); }
    }
    // weather: fog (our own overlay, thicker with distance from the camera's focus)
    if (m.fog > 0) r.overlay(gg => { const k = m.fog, c1 = night ? '#3a4a66' : '#b8c8d8', c2 = night ? '#2a3a52' : '#a8b8c8'; px.blend(gg, (night ? .1 : .18) + k * (night ? .3 : .35), 'normal', () => px.rect(gg, 0, 0, r.W, r.H * .5, c1)); px.blend(gg, k * (night ? .14 : .25), 'normal', () => px.rect(gg, 0, r.H * .5, r.W, r.H * .5, c2)); if (vid === 'wide') px.blend(gg, k * .2, 'normal', () => px.rect(gg, 0, 0, r.W, r.H, c1)); });
  },
  drawMarks(r, W, frame) {
    const m = this.m, g = K.game, b = frame ? frame.ball : m.ball;
    const humanBowl = m.bowlerInput() && !m.cfg.cheat.autoBowl, humanBat = m.strikerInput() && !m.cfg.cheat.autoBat;
    // the length bands, faintly, in the first overs for a human bowler
    if (humanBowl && (m.phase === 'setup' || m.phase === 'runup') && m.inn.balls < 12 && r.view.id === 'broadcast') r.decal(gg => {
      for (const [y0, y1, c, label] of [[20, 44, '#ff6a6a', 'YORKER'], [44, 90, '#ffd36a', 'FULL'], [90, 150, '#6aff8a', 'GOOD'], [150, 200, '#6ac8ff', 'SHORT'], [200, 230, '#c86aff', 'BOUNCER']]) {
        const [ax, ay] = r.w(...W(-24, y0)), [bx, by2] = r.w(...W(24, y1));
        px.blend(gg, .14, 'normal', () => px.rect(gg, ax, Math.min(ay, by2), bx - ax, Math.abs(by2 - ay), c));
        E.font.text(gg, label, bx + 3, Math.min(ay, by2), c, { font: 'tiny', shadow: '#000' });
      }
    });
    // the bowler's pitch marker
    if (humanBowl && (m.phase === 'setup' || m.phase === 'runup') && !(m.flags.fogMarker && false)) { const [mx, my] = W(m.marker[0], m.marker[1]); r.decal(() => { r.groundRing(mx, my, 6, '#ffe060'); r.groundRing(mx, my, 3, '#ffffff'); }); }
    // the batter's pitch marker (where the ball will land), unless a Fog Machine hides it
    if (humanBat && m.phase === 'flight' && K.settings('pitchMarker') && !m.flags.fogMarker && b.phase === 'delivery' && !b.pitched) {
      const s = Ball.predict(b, 2, m.env, 2, c => c.pitched), l = s[s.length - 1];
      if (l && l.pitched) { const [mx, my] = W(l.x, l.y); r.decal(() => r.groundRing(mx, my, 4, '#ff5a3a')); }
    }
    // the aim arrow at the batter's feet
    if (humanBat && (m.phase === 'flight' || m.phase === 'runup' || m.phase === 'setup') && K.batAim) {
      const aim = K.batAim(m.strikerInput(), m);
      if (aim) { const s = m.striker, [mx, my] = W(s.x - m.hand * 4, s.y + 6); r.decal(gg => { const [sx, sy] = r.w(mx, my), [ex, ey] = r.w(mx + aim[0] * 26, my + aim[1] * 26); px.line(gg, sx, sy, ex, ey, '#fff6c0', 2); px.disc(gg, ex, ey, 2, '#ffe060'); }); }
    }
    // Statistical Certainty: the exact timing ring closing on the bat
    if (m.batSpecialArmed === 'certainty' && m.phase === 'flight') { const t = m.idealPress('shot'); if (t !== null) { const s = m.striker, [mx, my] = W(s.x, s.y); r.decal(() => { r.groundRing(mx, my, 4 + t * 40, '#6ae8ff'); r.groundRing(mx, my, 4, '#ffffff'); }); } }
    // Owl-Eye (a review, or dev mode's live trajectory)
    if ((m.decision && m.decision.reviewing && m.decision.owl) || K.dev && K.dev.toggles.trajectory) this.drawOwl(r, W);
  },
  drawOwl(r, W) {
    const m = this.m, d = m.decision, owl = d && d.owl;
    const path = owl ? owl.path : Ball.predict(m.ball, 1.5, m.env, 3).map(p => [p.x, p.y, p.z]);
    const prog = d && d.reviewing ? clamp(d.rt / 3, 0, 1) : 1, n = Math.floor(path.length * prog);
    r.queue(W(0, 0)[0], W(0, 0)[1], 0, gg => {
      for (let i = 1; i < n; i++) { const [ax, ay] = r.w(...W(path[i - 1][0], path[i - 1][1]), path[i - 1][2]), [bx, by] = r.w(...W(path[i][0], path[i][1]), path[i][2]); px.blend(gg, .6, 'normal', () => px.line(gg, ax, ay, bx, by, i < path.length * .5 ? '#ff6a3a' : '#6ae8ff', 3)); }
      if (owl && owl.pitch) { const [sx, sy] = r.w(...W(owl.pitch[0], owl.pitch[1]), 0); px.disc(gg, sx, sy, 3, '#ffe060'); }
      if (owl) { const [sx, sy] = r.w(...W(owl.impact[0], owl.impact[1]), owl.impact[2]); px.disc(gg, sx, sy, 3, '#ff3a3a'); }
    }, { bias: 3, emissive: true });
  },
  drawBall(r, W, frame) {
    const m = this.m, g = K.game, b = frame ? frame.ball : m.ball;
    if (b.phase === 'held' && m.phase !== 'runup') { if (m.phase === 'setup' || m.phase === 'dead' || m.phase === 'between') return; }
    let bx = b.x, by = b.y, bz = b.z;
    if (m.phase === 'runup' && b.phase === 'held') { const h = m.bowler; if (!h || (h.p && h.p.machine)) return; const rig = Cast.rig(h.p, 'field'), w = rig.hand(); const [mx, my] = W(0, 0); bx = w[0] - mx; by = w[1] - my; bz = w[2]; }
    if (m.holder && m.phase === 'inPlay') { const rig = this.rigFor(m.holder, m), w = rig.hand(); const [mx, my] = W(0, 0); bx = w[0] - mx; by = w[1] - my; bz = w[2]; }
    const [mx, my] = W(bx, by), night = this.night(), seen = frame ? 1 : this.ballVisible(m, Object.assign({}, b, { x: bx, y: by })), swoop = m.chaos.find(c => c.id === 'gulls' && c.data.swoop && c.data.swoop.t < 1.6), hidden = b.hidden || seen <= 0 || !!swoop;
    r.shadow(mx, my, 1.6, seen > 0 ? .5 : .15);
    if (hidden) return;
    const fx = b.fx || (m.fire.bowl > 0 && b.phase === 'delivery' ? 'fire' : null);
    const col = m.ground.id === 'dome' ? '#ff8ad8' : night ? '#f4f4f4' : '#b8202a';
    const T2 = this.trail;
    r.queue(mx, my, bz, gg => {
      for (let i = 1; i < T2.length; i++) { const p0 = T2[i - 1], p1 = T2[i], [ax, ay] = r.w(...W(p0[0], p0[1]), p0[2]), [ex, ey] = r.w(...W(p1[0], p1[1]), p1[2]); px.blend(gg, i / T2.length * .55, 'add', () => px.line(gg, ax, ay, ex, ey, fx === 'fire' ? '#ff8a2a' : fx === 'holy' ? '#fff6a0' : fx === 'ghost' ? '#a8e0ff' : fx === 'steam' ? '#e8e8f0' : '#ffffff', i > T2.length - 3 ? 2 : 1)); }
      const [sx, sy] = r.w(mx, my, bz);
      if (seen < 1) { px.blend(gg, seen, 'normal', () => { px.disc(gg, sx, sy, 2, '#2a0a0a'); px.disc(gg, sx, sy, 1.6, col); }); return; }
      px.disc(gg, sx, sy, 2, '#2a0a0a'); px.disc(gg, sx, sy, 1.6, col); px.dot(gg, sx - 1, sy - 1, '#ffffff');
      if (fx === 'fire' && Math.floor(g.time * 30) % 2 === 0) g.particles.fire(mx, my, bz, 1, { size: .5 });
      if (fx === 'grudge') px.blend(gg, .6, 'add', () => px.ddisc ? px.ddisc(gg, sx, sy, 4, '#ff2a2a', .5, r.ix, r.iy) : px.disc(gg, sx, sy, 4, '#ff2a2a'));
    }, { emissive: night || !!fx, bias: .5 });
    if (night) g.lights.add(mx, my, bz, 30, .5, { color: '#ffffff' });
    if (m.triple && !m.contact) for (const h of m.triple) { const [hx, hy] = W(h.x, h.y); if (Math.floor(g.time * 20) % 3) r.queue(hx, hy, h.z, gg => { const [sx, sy] = r.w(hx, hy, h.z); px.blend(gg, .6, 'add', () => px.disc(gg, sx, sy, 2, '#6ae8ff')); }, { emissive: true }); }
  },
  drawToken(gg, r, mx, my, z, id) {
    const [sx, sy] = r.w(mx, my, z), it = ITEMS[id], c = it ? it.color : '#ffffff', t = K.game.time;
    px.disc(gg, sx, sy, 6, '#1a1a2a'); px.disc(gg, sx, sy, 5, c); px.disc(gg, sx - 1, sy - 1, 2, '#ffffff');
    if (Math.floor(t * 4) % 2) px.ring ? px.ring(gg, sx, sy, 8, '#ffffff') : null;
  },
  drawScoreboard(gg, x0, y0, P) {
    const m = this.m, inn = m.inn; if (!inn) return;
    const [bx, by] = P.board, x = x0 + bx, y = y0 + by;
    E.font.text(gg, m.teams[m.bat].code + ' ' + inn.runs + '-' + inn.wkts, x + 55, y + 6, '#ffe060', { align: 'center', font: 'tiny' });
    E.font.text(gg, 'OVERS ' + Rules.oversText(inn.balls), x + 55, y + 16, '#ffffff', { align: 'center', font: 'tiny' });
    if (inn.target) E.font.text(gg, 'TARGET ' + inn.target, x + 55, y + 26, '#ff8a6a', { align: 'center', font: 'tiny' });
  },
  drawCrowd(r, W) {
    const m = this.m, g = K.game, B = this.B, rain = m.rain || m.weather === 'rain', mood = K.crowdMood || 0;
    for (const gp of B.groups) {
      if (gp.scatter > 0) gp.scatter = Math.max(0, gp.scatter - 1 / 60);
      if (gp.catchT > 0) gp.catchT = Math.max(0, gp.catchT - 1 / 60);
      const [mx, my] = W(gp.x, gp.y);
      r.queue(mx, my, 0, gg => {
        for (const c of gp.list) {
          const [cmx, cmy] = W(c.x, c.y), jump = mood > .3 ? Math.max(0, Math.sin(g.time * 12 + c.ph)) * 3 * mood : Math.sin(g.time * 2 + c.ph) * .4;
          const wave = K.crowdWave ? Math.max(0, Math.sin(g.time * 4 - Math.atan2(c.y - G.MID_Y, c.x) * 3)) * 4 : 0, sc = gp.scatter > 0 ? gp.scatter * 6 * Math.sin(c.ph) : 0;
          const [sx, sy] = r.w(cmx + sc, cmy, c.z + jump + wave), h = c.sit ? 4 : 6;
          px.rect(gg, sx - 1, sy - h, 3, h - 1, c.shirt); px.rect(gg, sx - 1, sy - h - 2, 2, 2, c.skin);
          if (c.hat) px.rect(gg, sx - 2, sy - h - 3, 4, 1, c.hat);
          if (rain && c.ph % 3 < 1.4) { px.rect(gg, sx - 3, sy - h - 5, 7, 2, ['#3a6ad8', '#d83a3a', '#2a2a2a'][Math.floor(c.ph) % 3]); px.dot(gg, sx, sy - h - 3, '#2a2a2a'); }
          if (mood > .6 && c.ph % 2 < .5) px.dot(gg, sx + 2, sy - h - 2 - jump, c.skin);
          if (gp.catchT > 0 && gp.list[gp.catcher] === c) { px.rect(gg, sx - 2, sy - h - 6, 1, 4, c.skin); px.rect(gg, sx + 2, sy - h - 6, 1, 4, c.skin); px.disc(gg, sx, sy - h - 8, 1.6, '#b8202a'); px.dot(gg, sx - 1, sy - h - 9, '#ffffff'); }
        }
      }, { bias: -.2 });
    }
  }
};
K.Views = Views; K.MatchView = MatchView; K.Recorder = Recorder;

/* ---- 40-audio.js ---- */
/* ---- AUDIO (all synthesized; no audio files). SFX through the engine's chip synth (audio.define), a crowd engine of
 * our own on the engine's audio context (ambient murmur, applause grains, a formant "AAAH" roar and "OOOH", the
 * KER-FUF-FLE chant on the beat) routed to audio.bus('sfx'), and the music director (each ground's song, layers for
 * Hype and ON FIRE, stings). Headless, the structure runs and nothing sounds. ---- */
const SFX = {
  bat: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35, filter: 'bandpass' }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .4 }, { wave: 'triangle', freq: 1240, dur: .05, vol: .15 }],
  batSweet: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35, filter: 'bandpass' }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .4 }, { wave: 'triangle', freq: 1240, dur: .05, vol: .15 }, { wave: 'sine', freq: 880, to: 1320, dur: .12, vol: .2 }],
  edge: [{ wave: 'noise', freq: 5200, dur: .02, vol: .25, filter: 'highpass' }, { wave: 'triangle', freq: 2400, dur: .02, vol: .12 }],
  pitchThud: [{ wave: 'sine', freq: 140, to: 80, dur: .06, vol: .3 }, { wave: 'noise', freq: 400, dur: .04, vol: .1, filter: 'lowpass' }],
  stumps: [{ wave: 'triangle', freq: 700, dur: .05, vol: .3 }, { wave: 'triangle', freq: 540, dur: .06, vol: .25, delay: .025 }, { wave: 'triangle', freq: 860, dur: .05, vol: .22, delay: .05 }, { wave: 'noise', freq: 1800, dur: .08, vol: .2, filter: 'bandpass' }],
  bails: [{ wave: 'triangle', freq: 2200, dur: .02, vol: .15 }, { wave: 'triangle', freq: 2600, dur: .02, vol: .12, delay: .05 }],
  gloves: { wave: 'noise', freq: 300, dur: .06, vol: .3, filter: 'lowpass' },
  throwWhoosh: { wave: 'noise', freq: 600, to: 2200, dur: .18, vol: .14, filter: 'bandpass' },
  dive: { wave: 'noise', freq: 900, to: 200, dur: .35, vol: .16, filter: 'lowpass' },
  board: [{ wave: 'triangle', freq: 300, to: 180, dur: .08, vol: .3 }, { wave: 'noise', freq: 800, dur: .05, vol: .12, filter: 'lowpass' }],
  glass: [{ wave: 'noise', freq: 6000, dur: .25, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 2600, dur: .12, vol: .1 }, { wave: 'sine', freq: 3400, dur: .1, vol: .08, delay: .06 }, { wave: 'sine', freq: 4100, dur: .1, vol: .07, delay: .12 }],
  splash: [{ wave: 'noise', freq: 3000, to: 400, dur: .35, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 60, dur: .15, vol: .3 }, { wave: 'sine', freq: 1800, dur: .03, vol: .06, delay: .25 }],
  gull: { wave: 'square', freq: 1400, to: 900, dur: .3, vol: .08, vib: [14, .08] },
  moo: { wave: 'saw', freq: 110, to: 95, dur: .9, vol: .14, vib: [5, .03], filter: 'lowpass' },
  bees: { wave: 'saw', freq: 220, dur: .6, vol: .06, vib: [40, .05] },
  steam: [{ wave: 'noise', freq: 4000, to: 2000, dur: .5, vol: .18, filter: 'highpass' }, { wave: 'sine', freq: 70, dur: .1, vol: .3 }],
  firework: [{ wave: 'sine', freq: 600, to: 2400, dur: .4, vol: .08 }, { wave: 'noise', freq: 400, to: 100, dur: .5, vol: .3, filter: 'lowpass', delay: .4 }],
  hypeFull: { wave: 'square', freq: 'C5', dur: .4, vol: .12, arp: [0, 4, 7, 12], step: .06 },
  fireOn: { wave: 'saw', freq: 'A4', dur: .5, vol: .12, arp: [0, 3, 7, 12, 15], step: .05 },
  special: { wave: 'pulse', freq: 'E5', dur: .5, vol: .12, arp: [0, 7, 12, 19], step: .06 },
  whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .1 },
  bell: [{ wave: 'sine', freq: 520, dur: 1.2, vol: .2 }, { wave: 'sine', freq: 1040, dur: .9, vol: .08 }],
  coin: { wave: 'triangle', freq: 1800, to: 2600, dur: .15, vol: .12, vib: [24, .1] },
  meterTick: { wave: 'square', freq: 1600, dur: .02, vol: .05 },
  ringTick: { wave: 'triangle', freq: 1200, dur: .03, vol: .08 },
  catchPop: [{ wave: 'noise', freq: 500, dur: .07, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 200, dur: .06, vol: .2 }],
  drop: { wave: 'triangle', freq: 400, to: 150, dur: .3, vol: .2 },
  item: { wave: 'square', freq: 'G5', dur: .3, vol: .1, arp: [0, 5, 12], step: .05 },
  target: [{ wave: 'square', freq: 'C6', dur: .5, vol: .1, arp: [0, 4, 7, 12, 16], step: .05 }, { wave: 'noise', freq: 3000, dur: .3, vol: .2, filter: 'highpass' }],
  thunder: { wave: 'noise', freq: 120, to: 40, dur: 1.4, vol: .35, filter: 'lowpass' },
  pageTurn: { wave: 'noise', freq: 2000, to: 800, dur: .08, vol: .08, filter: 'bandpass' }
};
const Audio = {
  ready: false, crowd: null, level: 0, target: .2, roar: 0, ooh: 0, applause: 0, chant: 0, rainMute: 1, song: null,
  init() { const A = K.game.audio; for (const [k, v] of Object.entries(SFX)) A.define(k, v); this.ready = true; },
  sfx(name, o) { if (!K.game || !K.game.audio) return; try { K.game.audio.sfx(name, o); } catch (e) { /* sound off */ } },
  /** the crowd's graph, made lazily after the first gesture */
  ensure() {
    if (this.crowd !== null) return this.crowd;
    const A = K.game.audio, bus = A.bus && A.bus('sfx'), c = A.ctx;
    if (!bus || !c) return null;
    try {
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
      const rnd = E.rng(77); for (let i = 0; i < len; i++) { const w = rnd() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const bed = c.createGain(); bed.gain.value = 0;
      for (const f of [200, 800, 2000]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = .8; src.connect(bp); bp.connect(bed); }
      bed.connect(bus); src.start();
      // the roar: detuned saws through vowel formants
      const roar = c.createGain(); roar.gain.value = 0; const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = f2.Q.value = 5; f1.frequency.value = 750; f2.frequency.value = 1250;
      const mixr = c.createGain(); mixr.gain.value = .25; mixr.connect(f1); mixr.connect(f2); f1.connect(roar); f2.connect(roar); roar.connect(bus);
      const oscs = []; for (let i = 0; i < 6; i++) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 160 + i * 23 + rnd() * 10; o.connect(mixr); o.start(); oscs.push(o); }
      this.crowd = { c, bed, roar, f1, f2, oscs, src, bus };
    } catch (e) { this.crowd = false; }
    return this.crowd;
  },
  /** each frame: levels follow the moment */
  tick(dt, crowdSize) {
    const C = this.ensure(); this.roar = Math.max(0, this.roar - dt * .45); this.ooh = Math.max(0, this.ooh - dt * .8); this.chant = Math.max(0, this.chant - dt * .3);
    this.applause = Math.max(0, this.applause - dt * .5); this.level = lerp(this.level, this.target, Math.min(1, dt * 2)); this.target = lerp(this.target, .2, dt * .03);
    K.crowdMood = clamp(this.roar + this.applause * .6, 0, 1);
    if (!C) return;
    const t = C.c.currentTime, size = crowdSize === undefined ? .6 : crowdSize;
    C.bed.gain.setTargetAtTime((.15 + this.level * .15 + this.applause * .25) * size * this.rainMute, t, .2);
    const vowel = this.ooh > this.roar ? [400, 800] : [750, 1250];
    C.f1.frequency.setTargetAtTime(vowel[0], t, .1); C.f2.frequency.setTargetAtTime(vowel[1], t, .1);
    C.roar.gain.setTargetAtTime(Math.max(this.roar, this.ooh * .7, this.chant * .5 * (Math.floor(K.game.time * 4) % 4 < 3 ? 1 : 0)) * .35 * size * this.rainMute, t, .08);
    if (this.applause > .1 && RNG.cosmetic() < this.applause * .6) Audio.sfx({ wave: 'noise', freq: 1500 + RNG.cosmetic() * 2000, dur: .02, vol: .05 * this.applause * size, filter: 'bandpass' });
  },
  cheer(n = 1) { this.roar = Math.min(1, this.roar + .6 * n); this.applause = Math.min(1, this.applause + .7 * n); this.target = Math.min(1, this.target + .3 * n); },
  oooh() { this.ooh = 1; },
  groan() { this.ooh = .6; this.roar = 0; },
  stopAll() { try { K.game.audio.stopMusic(); K.game.audio.mute(true); } catch (e) { /* off */ } if (this.crowd) { try { this.crowd.bed.gain.value = 0; this.crowd.roar.gain.value = 0; } catch (e) { /* off */ } } },
  /** the music director */
  music(id, o = {}) { if (!K.game) return; const s = SONGS[id] || id; if (this.song === s && !o.restart) return; this.song = s; try { K.game.audio.music(s, Object.assign({ fade: .6 }, o)); } catch (e) { /* off */ } },
  /** a layer of the song playing in or out; a song without that layer is left alone (ON FIRE can end after the match
   *  has moved on to the title's or tea interval's music). Every song a match plays has both layers (unit-ui checks) */
  layer(name, v) { const s = this.song; if (!s || !s.tracks || !s.tracks.some(t => t.name === name)) return; try { K.game.audio.layer(name, v, .6); } catch (e) { /* off */ } },
  sting(id) { const s = STINGS[id]; if (!s) return; try { K.game.audio.sting(s, { at: 'now' }); } catch (e) { /* off */ } }
};
K.Audio = Audio; K.sfx = (n, o) => Audio.sfx(n, o); K.SFX = SFX;

/* ---- 41-voice.js ---- */
/* ---- GIBBERISH VOICES (Animalese / Simlish style). voice.say(text, profile) turns text into syllables (vowel groups
 * with consonant onsets); each syllable is one source (a saw for the voiced part, a noise burst for plosive and
 * fricative onsets) through two bandpass formant filters set to its vowel (a 800/1200, e 500/1900, i 300/2300, o
 * 500/900, u 350/700 Hz), with a short gain envelope. Pitch: the speaker's base, a little jitter, falling across the
 * phrase, rising at '?', louder and higher for '!' and CAPS. Routed through audio.bus('voice') (engine change 3), at
 * most two voices at once, behind a compressor. ---- */
const VOICES = {
  aubrey: { base: 105, speed: 1.25, vib: 5 }, dazza: { base: 135, speed: .85 }, priya: { base: 210, speed: .9 }, edie: { base: 240, speed: .9 }, basil: { base: 120, trem: 7 },
  dev: { base: 170 }, pip: { base: 290, speed: .75 }, crumb: { base: 220, q: 3 }, hollis: { base: 150 }, thrumpton: { base: 160, fmul: 1.2 }, ghost: { base: 180, whisper: true },
  machine: { base: 90, ring: 30 }, spinaldo: { base: 160, vib: 4 }, shazza: { base: 230, speed: .85 }, gaz: { base: 140 }, peregrine: { base: 180 }, fortescue: { base: 110, speed: 1.2 }, araminta: { base: 250 }, zsazsa: { base: 260 }, crowd: { base: 200 }
};
const FORMANT = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700], y: [300, 2300] };
const Voice = {
  active: 0, comp: null,
  /** text -> syllables: { v (vowel), plosive, caps, end ('?' | '!' | '.' | null), gap } (tests read this) */
  syllables(text) {
    const out = [], words = String(text).replace(/\{[^}]*\}/g, '').split(/(\s+)/);
    for (const w of words) {
      if (!w.trim()) continue;
      const caps = w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w), end = /[?]$/.test(w) ? '?' : /!$/.test(w) ? '!' : /[.,;:]$/.test(w) ? '.' : null;
      const groups = w.toLowerCase().match(/[^aeiouy]*[aeiouy]+/g) || [w.toLowerCase()];
      groups.forEach((gp, i) => { const v = (gp.match(/[aeiouy]/) || ['a'])[0], c = gp[0]; out.push({ v, plosive: /[pbtdkgcq]/.test(c), fric: /[sfzxh]/.test(c), caps, end: i === groups.length - 1 ? end : null, gap: i === groups.length - 1 }); });
    }
    return out;
  },
  /** pitches for a phrase (tests check the rise at '?' and the fall across it) */
  pitches(syl, prof) {
    const base = (prof && prof.base) || 160, n = syl.length;
    return syl.map((s, i) => { let p = base * (1 - .12 * i / Math.max(1, n - 1)); if (s.caps || s.end === '!') p *= 1.3; if (s.end === '?') p *= 1.25; return p; });
  },
  say(text, who, o = {}) {
    if (!K.game || !K.settings('voices')) return 0;
    const A = K.game.audio, bus = A.bus && A.bus('voice'), c = A.ctx; if (!bus || !c || this.active >= 2) return 0;
    const prof = VOICES[who] || VOICES.crowd, syl = this.syllables(text).slice(0, 40), P = this.pitches(syl, prof), sp = (prof.speed || 1);
    try {
      if (!this.comp) { this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -18; this.comp.ratio.value = 6; this.comp.connect(bus); }
      let t = c.currentTime + .02; this.active++;
      syl.forEach((s, i) => {
        const len = (.055 + RNG.cosmetic() * .055) * sp, jit = 1 + (RNG.cosmetic() - .5) * .08, f = P[i] * jit, fm = prof.fmul || 1, vol = (s.caps || s.end === '!' ? .5 : .32) * (o.vol || 1);
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.setValueAtTime(vol, t + len); g.gain.linearRampToValueAtTime(0, t + len + .03);
        const F = FORMANT[s.v] || FORMANT.a, b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(); b1.type = b2.type = 'bandpass'; b1.frequency.value = F[0] * fm; b2.frequency.value = F[1] * fm; b1.Q.value = b2.Q.value = prof.q || 6;
        const src = prof.whisper ? (() => { const n = c.createBufferSource(); n.buffer = K.game.audio._noise; return n; })() : c.createOscillator();
        if (!prof.whisper) { src.type = 'sawtooth'; src.frequency.setValueAtTime(f, t); src.frequency.linearRampToValueAtTime(f * (s.end === '?' ? 1.2 : .96), t + len); if (prof.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = prof.vib; lg.gain.value = f * .03; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + len + .05); } }
        src.connect(b1); src.connect(b2); b1.connect(g); b2.connect(g);
        if (prof.ring) { const rm = c.createGain(), ro = c.createOscillator(); ro.frequency.value = prof.ring; ro.connect(rm.gain); g.connect(rm); rm.connect(this.comp); ro.start(t); ro.stop(t + len + .05); } else g.connect(this.comp);
        src.start(t); src.stop(t + len + .05);
        if (s.plosive || s.fric) { const n = c.createBufferSource(), ng = c.createGain(), nf = c.createBiquadFilter(); n.buffer = K.game.audio._noise; nf.type = s.fric ? 'highpass' : 'bandpass'; nf.frequency.value = s.fric ? 3000 : 1500; ng.gain.setValueAtTime(vol * .4, t); ng.gain.linearRampToValueAtTime(0, t + .02); n.connect(nf); nf.connect(ng); ng.connect(this.comp); n.start(t); n.stop(t + .03); }
        if (o.onSyllable) o.onSyllable(i, t);
        t += len + (s.gap ? .04 : .01) + (s.end ? .15 : 0);
      });
      const dur = t - c.currentTime; setTimeout(() => { this.active = Math.max(0, this.active - 1); }, dur * 1000);
      return dur;
    } catch (e) { this.active = Math.max(0, this.active - 1); return 0; }
  },
  /** a short shout (YES! NO! HOWZAT!) with an exaggerated pitch */
  shout(text, who) { return this.say(text.toUpperCase() + '!', who, { vol: 1.2 }); }
};
K.Voice = Voice; K.VOICES = VOICES;

/* ---- 42-commentary.js ---- */
/* ---- THE COMMENTARY DIRECTOR: subscribes to the bus, scores candidate lines by the event's priority, plays at most
 * one exchange per ball (a line and, often, the other commentator's reply), stays quiet during the run-up and release
 * and talks from contact to the next ball. Lines are picked by tag with a cooldown (no repeat within 20 balls) from the
 * cosmetic stream. Shown on a non-modal E.Dialog with the speaker's live portrait, typed in the gibberish voice.
 * Settings: Commentary captions on/off, Commentary voices on/off (and the Voices volume). ---- */
const PRIORITY = { start: 5, six: 9, four: 7, bowled: 10, caught: 10, screamer: 11, lbw: 10, notout: 6, runout: 10, stumped: 10, hitwicket: 10, dropped: 8, review: 9, reviewOver: 9, reviewStand: 8, third: 8, fire: 8, fireBowl: 8, special: 8, wide: 3, noball: 5, beamer: 6, freehit: 4, beaten: 3, dot: 1, single: 1, two: 2, three: 3, edge: 4,
  rain: 9, method: 9, cow: 6, cowhit: 7, bees: 6, bells: 4, peacocks: 5, tray: 5, gulls: 6, tide: 5, dustdevil: 5, rabbits: 4, fog: 5, ghosts: 6, fireworks: 5, advert: 6, mascot: 5, item: 5, maiden: 5, overEnd: 2, needs: 3, filler: 1, win: 12, loss: 12, tie: 12, superover: 11, inningsEnd: 9, hype: 4, crowdcatch: 8, net: 1, overthrow: 6, mixup: 7, dive: 4, directhit: 6, machine: 4 };
const Commentary = {
  talk: null, recent: [], ballNo: 0, queue: [], lastFiller: -9, log: [], spokeThisBall: false, muted: false, m: null,
  init() { this.talk = new E.Dialog(K.game, { lines: 2, place: 'bottom', voice: null, bg: '#0e1a12', border: '#e8c060', nameColor: '#ffd36a' }); },
  attach(m) { this.m = m; this.recent = []; this.queue = []; this.ballNo = 0; this.log = []; this.lastFiller = -9; if (this.talk) this.talk.close(); },
  /** a line for a tag: { who, text } (skipping lines said within 20 balls) */
  pick(tag, vars) {
    const pool = LINES[tag]; if (!pool || !pool.length) return null;
    const fresh = pool.filter((l, i) => !this.recent.some(r => r.tag === tag && r.i === i && this.ballNo - r.ball < 20));
    const list = fresh.length ? fresh : pool, l = list[Math.floor(RNG.cosmetic() * list.length) % list.length], i = pool.indexOf(l);
    this.recent.push({ tag, i, ball: this.ballNo }); if (this.recent.length > 200) this.recent.shift();
    return { who: l[0], text: fill(l[1], vars || {}), tag };
  },
  vars(m) {
    const inn = m && m.inn, need = m && m.need(), s = m && m.striker, bw = m && m.bowlerP;
    return { batter: s ? s.p.short : '', bowler: bw ? bw.short : '', team: m ? m.teams[m.bat].name : '', opp: m ? m.teams[m.bowlSide].name : '', ground: m ? m.ground.name : '', need: need ? need.runs : '', balls: need ? need.balls : '', target: inn && inn.target ? inn.target : (m && m.innings[0] ? m.innings[0].runs + 1 : ''), kmh: m && m.cur ? m.cur.kmh : '', winner: m && m.result && m.result.winner ? TEAMS[m.result.winner].name : '' };
  },
  /** an event happened: queue its best line (the director plays them when it may talk) */
  hear(tag, extra = {}, force) {
    const m = this.m; if (!m || m.cfg.commentary === false) return;
    const pr = PRIORITY[tag] || 1, rate = T('commentaryRate');
    if (!force && pr < 4 && RNG.cosmetic() > rate * (pr <= 1 ? .35 : .6)) return;
    if (!force && rate <= 0) return;
    const l = this.pick(tag, Object.assign(this.vars(m), extra)); if (!l) return;
    this.queue.push({ pr, l, t: K.game.time });
    this.queue.sort((a, b) => b.pr - a.pr); if (this.queue.length > 4) this.queue.length = 4;
  },
  step(dt) {
    const m = this.m; if (!m || !this.talk) return;
    this.talk.update(dt);
    const quiet = m.phase === 'runup' || m.phase === 'flight' || (m.phase === 'setup' && m.pt < .3);
    if (quiet || this.talk.open) return;
    const q = this.queue.shift(); if (!q) return;
    if (K.game.time - q.t > 6) return;
    this.show(q.l);
    // the other commentator's reply, sometimes
    if (q.pr >= 6 && RNG.cosmetic() < .45) { const other = q.l.who === 'A' ? 'D' : 'A', pool = (LINES[q.l.tag] || []).filter(x => x[0] === other); if (pool.length) { const l2 = pool[Math.floor(RNG.cosmetic() * pool.length)]; this.queue.unshift({ pr: 99, l: { who: other, text: fill(l2[1], this.vars(m)), tag: q.l.tag }, t: K.game.time }); } }
  },
  show(l) {
    this.log.push(l); if (this.log.length > 10) this.log.shift();
    const C = COMMENTATORS[l.who] || COMMENTATORS.A;
    if (K.settings('captions') && !this.muted) this.talk.say(l.text, { name: C.name, nameColor: C.color, portrait: Cast.extra(C.rig), portraitOpts: { zoom: 3, turn: .4 }, auto: 2.6, modal: false, alpha: .85, y: Math.max(40, (K.game.H || 240) - 92) });
    if (!this.muted && !(K.dev && K.dev.toggles.muteCommentary)) Voice.say(l.text, C.voice);
    bus.emit('commentary', { who: l.who, text: l.text });
  },
  draw(r) { if (this.talk && this.talk.open) this.talk.draw(r); }
};
/* the bus -> commentary tags (and the crowd, the stings and the shouts) */
function wireMatchEvents() {
  const on = (t, f) => bus.on(t, d => { if (Commentary.m && d.match && d.match !== Commentary.m) return; f(d); });
  on('match:start', () => { Commentary.hear('start', {}, true); Audio.cheer(.5); Audio.sfx('whistle'); });
  on('ball:setup', () => { Commentary.ballNo++; Commentary.spokeThisBall = false; Audio.layer('base', 1); });
  on('ball:released', d => { if (d.fam === 'machine') Audio.sfx('steam'); if (d.special) { Commentary.hear('special'); Audio.sting('special'); } if (d.fam === 'machine' && RNG.cosmetic() < .3) Commentary.hear('machine'); });
  on('bat:contact', d => { Audio.sfx(d.grade === 'perfect' && d.kind === 'clean' ? 'batSweet' : d.kind === 'edge' ? 'edge' : 'bat'); if (d.kind === 'edge') { Commentary.hear('edge'); Audio.oooh(); } });
  on('ball:pitched', () => Audio.sfx('pitchThud'));
  on('ball:beaten', () => { Commentary.hear('beaten'); Audio.oooh(); });
  on('keeper:take', () => Audio.sfx('gloves'));
  on('boundary', d => { Commentary.hear(d.n === 6 ? 'six' : 'four'); Audio.cheer(d.n === 6 ? 1.3 : .8); Audio.sting(d.n === 6 ? 'six' : 'four'); if (d.n === 4) Audio.sfx('board'); });
  on('runs', d => { const mm = d.match, last = mm && mm.samples && mm.samples[mm.samples.length - 1]; if (last && !mm.holder && mm.outside(last.x, last.y)) return; if (d.n === 1) Commentary.hear('single'); else if (d.n === 2) Commentary.hear('two'); else if (d.n === 3) Commentary.hear('three'); Audio.applause = Math.min(1, Audio.applause + .2); });
  on('wicket', d => { if (d.freeHit) { Commentary.hear('freehit', {}, true); return; } const tag = { bowled: 'bowled', caught: 'caught', lbw: 'lbw', 'run out': 'runout', stumped: 'stumped', 'hit wicket': 'hitwicket' }[d.how] || 'bowled'; Commentary.hear(tag, { fielder: d.fielder || '' }, true); Audio.cheer(1.2); Audio.sting('wicket'); });
  on('stumps:broken', () => { Audio.sfx('stumps'); Audio.sfx('bails'); });
  on('catch:screamer', () => Commentary.hear('screamer', {}, true));
  on('catch:dropped', () => { Commentary.hear('dropped'); Audio.groan(); Audio.sfx('drop'); });
  on('field:gather', () => Audio.sfx('catchPop', { vol: .5 }));
  on('field:throw', () => Audio.sfx('throwWhoosh'));
  on('field:directHit', () => Commentary.hear('directhit'));
  on('field:overthrow', () => Commentary.hear('overthrow'));
  on('field:dive', () => Audio.sfx('dive'));
  on('run:dive', () => { Commentary.hear('dive'); Audio.sfx('dive'); });
  on('run:mixup', () => Commentary.hear('mixup', {}, true));
  on('run:call', d => { const a = d.match && d.match.batterActors[d.who]; Voice.shout(d.call.replace(/!/g, ''), a && a.p && VOICES[a.p.id] ? a.p.id : 'crowd'); });
  on('appeal', () => { Voice.shout('Howzat', 'crowd'); Audio.oooh(); });
  on('decision', d => { if (d.kind === 'third') return; if (!d.out) Commentary.hear('notout'); });
  on('review:start', d => { Commentary.hear(d.kind === 'third' ? 'third' : 'review', {}, true); });
  on('review:result', d => { if (d.kind === 'third') return; Commentary.hear(d.overturned ? 'reviewOver' : 'reviewStand', {}, true); });
  on('extra', d => { Commentary.hear(d.kind === 'wd' ? 'wide' : d.why === 'beamer' ? 'beamer' : 'noball'); });
  on('fire:on', d => { Commentary.hear(d.who === 'bat' ? 'fire' : 'fireBowl', {}, true); Audio.sfx('fireOn'); Audio.sting('fire'); Audio.layer('fire', 1); Audio.cheer(1); });
  on('fire:off', () => Audio.layer('fire', 0));
  on('hype:full', () => { Audio.sfx('hypeFull'); Audio.sting('hype'); Audio.chant = 1; Commentary.hear('hype'); });
  on('hype', d => { const m = d.match; if (m && Math.max(...m.hype) > 50) Audio.layer('drums', 1); });
  on('special', d => { Audio.sfx('special'); });
  on('target:hit', d => { Commentary.hear('target_' + d.id, {}, true); Audio.sfx(d.fx === 'glass' ? 'glass' : d.fx === 'splash' ? 'splash' : d.fx === 'bell' ? 'bell' : 'target'); Audio.cheer(1.5); });
  on('chaos', d => { Commentary.hear(d.id, {}, true); if (d.id === 'cow') Audio.sfx('moo'); if (d.id === 'bees') Audio.sfx('bees'); if (d.id === 'gulls') Audio.sfx('gull'); if (d.id === 'bells') Audio.sfx('bell'); if (d.id === 'fireworks') Audio.sfx('firework'); });
  on('chaos:cowhit', () => { Commentary.hear('cowhit', {}, true); Audio.sfx('moo'); });
  on('chaos:peacock', () => Commentary.hear('peacocks', {}, true));
  on('crowd:catch', () => { Commentary.hear('crowdcatch', {}, true); Audio.cheer(1.3); });
  on('net:hit', () => { Commentary.hear('net'); Audio.sfx('board', { vol: .5 }); });
  on('chaos:gull', () => { Commentary.hear('gulls', {}, true); Audio.sfx('gull'); });
  on('chaos:dustdevil', () => Commentary.hear('dustdevil', {}, true));
  on('chaos:phase', () => Commentary.hear('ghosts', {}, true));
  on('rain:start', () => { Audio.rainMute = .3; Audio.sfx('thunder'); });
  on('rain:end', () => { Audio.rainMute = 1; });
  on('rain:method', () => Commentary.hear('method', {}, true));
  on('item', d => { Commentary.hear('item', { item: ITEMS[d.id] ? ITEMS[d.id].name : d.id }); Audio.sfx('item'); });
  on('ball:done', d => { const r = d.rec; if (!r.contact && !r.ran && !r.boundary && !r.wicket && !r.extras.wd && !r.extras.nb && !r.beaten) Commentary.hear('dot'); if (r.maiden) Commentary.hear('maiden'); if (r.overEnd) { Audio.sting('over'); } });
  on('over:end', d => { const m = d.match, need = m && m.need(); if (need && need.balls <= 12 && need.runs > 0) Commentary.hear('needs', {}, true); else if (Commentary.ballNo - Commentary.lastFiller > 6) { Commentary.lastFiller = Commentary.ballNo; Commentary.hear('filler', {}, true); } else Commentary.hear('overEnd'); });
  on('innings:end', d => { if (d.n === 0) Commentary.hear('inningsEnd', { target: d.runs + 1 }, true); Audio.cheer(.6); });
  on('superover', () => Commentary.hear('superover', {}, true));
  on('meter:lock', () => Audio.sfx('meterTick'));
  on('catch:ring', () => Audio.sfx('ringTick'));
  on('match:end', d => { Audio.sfx('whistle'); const m = d.match, hw = m && Object.keys(m.cfg.humans || {}).some(k => (m.cfg.humans[k] || []).length && m.teams[k].id === (d.result && d.result.winner)); Commentary.hear(d.result.tie ? 'tie' : 'win', {}, true); Audio.sting(hw || !Object.keys(m.cfg.humans || {}).some(k => (m.cfg.humans[k] || []).length) ? 'win' : 'lose'); Audio.cheer(1.5); });
}
K.Commentary = Commentary;

/* ---- 43-glyphs.js ---- */
/* ---- GLYPHS AND PROMPTS: an icon for an action's binding on the device the player used last. Gamepad: PlayStation
 * shapes by default (Cross blue, Circle red, Square pink, Triangle green on dark discs; L1 R1 L2 R2 pills), or Xbox
 * letters (A green, B red, X blue, Y yellow; LB RB LT RT) with the Button symbols setting. Keyboard: a keycap with the
 * key's label. Mouse: a mouse with the button lit (actions with no mouse button show their keycap). Prompts change on
 * the very next frame after the device changes, and follow the player's rebinding. ---- */
const PS_COL = { 0: '#7aa7ff', 1: '#ff6b6b', 2: '#ff8ad8', 3: '#5fd38a' }, XB_COL = { 0: '#5fd38a', 1: '#ff6b6b', 2: '#7aa7ff', 3: '#ffd23a' };
const Glyphs = {
  device(I) { const d = I.lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : d === 'touch' ? 'touch' : 'keyboard'; },
  style(I) { const s = K.game && K.game.settings ? K.game.settings.glyphs : null; return s === 'xbox' ? 'xbox' : 'playstation'; },   // (the Button symbols setting, for every player)
  /** the code to show for an action on a device */
  code(I, action, device = Glyphs.device(I)) {
    const m = I.map[action]; if (!m) return null;
    const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (device === 'gamepad') return real.find(c => /^Pad\d+$/.test(c)) || null;
    if (device === 'mouse') return real.find(c => /^Mouse\d$/.test(c)) || real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || null;
    return real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real.find(c => /^Mouse\d$/.test(c)) || null;
  },
  /** what a prompt shows, as data (tests read it): { kind: 'ps' | 'xbox' | 'key' | 'mouse', label } */
  info(I, action, device) {
    const dev = device || Glyphs.device(I), code = Glyphs.code(I, action, dev === 'touch' ? 'keyboard' : dev); if (!code) return { kind: 'none', label: '' };
    if (/^Pad\d+$/.test(code)) { const n = +code.slice(3), st = Glyphs.style(I); return { kind: st === 'xbox' ? 'xbox' : 'ps', n, label: I.codeLabel(code) }; }
    if (/^Mouse\d$/.test(code)) return { kind: 'mouse', n: +code.slice(5), label: code === 'Mouse0' ? 'LMB' : code === 'Mouse2' ? 'RMB' : 'MMB' };
    return { kind: 'key', label: I.codeLabel(code) };
  },
  /** draw an action's icon at (x, y) (top left, 9 px tall); returns its width */
  draw(g, x, y, I, action, o = {}) {
    const inf = Glyphs.info(I, action, o.device);
    return Glyphs.drawInfo(g, x, y, inf, o);
  },
  drawInfo(g, x, y, inf, o = {}) {
    const S = o.scale || 1, s = n => Math.round(n * S);
    if (inf.kind === 'ps' && inf.n <= 3) {
      const cx = x + s(5), cy = y + s(5), c = PS_COL[inf.n];
      px.disc(g, cx, cy, s(5), '#0e0e18'); px.disc(g, cx, cy, s(4.5), '#22223a');
      if (inf.n === 0) { px.line(g, cx - s(2), cy - s(2), cx + s(2), cy + s(2), c, S); px.line(g, cx - s(2), cy + s(2), cx + s(2), cy - s(2), c, S); }
      else if (inf.n === 1) { px.disc(g, cx, cy, s(2.6), c); px.disc(g, cx, cy, Math.max(1, s(1.5)), '#22223a'); }
      else if (inf.n === 2) { px.rect(g, cx - s(2), cy - s(2), s(5), s(5), c); px.rect(g, cx - s(1), cy - s(1), s(3), s(3), '#22223a'); }
      else { px.poly(g, [[cx, cy - s(3)], [cx + s(3), cy + s(2)], [cx - s(3), cy + s(2)]], c); px.poly(g, [[cx, cy - s(1)], [cx + s(1.4), cy + s(1.2)], [cx - s(1.4), cy + s(1.2)]], '#22223a'); }
      return s(11);
    }
    if (inf.kind === 'xbox' && inf.n <= 3) {
      const cx = x + s(5), cy = y + s(5), c = XB_COL[inf.n];
      px.disc(g, cx, cy, s(5), '#0e0e18'); px.disc(g, cx, cy, s(4.5), c);
      E.font.text(g, 'ABXY'[inf.n], cx + 1, cy - s(3), '#0e0e18', { align: 'center', scale: S, outline: false });
      return s(11);
    }
    if (inf.kind === 'ps' || inf.kind === 'xbox') {
      const lab = inf.kind === 'xbox' ? ({ 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU' }[inf.n] || inf.label) : ({ 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS' }[inf.n] || inf.label);
      const w = E.font.width(lab, { scale: S }) + s(6);
      px.rect(g, x, y + s(1), w, s(9), '#0e0e18'); px.rect(g, x + 1, y + s(1) + 1, w - 2, s(9) - 2, '#3a3a52'); E.font.text(g, lab, x + w / 2, y + s(2), '#ffffff', { align: 'center', scale: S, outline: false });
      return w + s(1);
    }
    if (inf.kind === 'mouse') {
      const w = s(8), h = s(10);
      px.rect(g, x + 1, y, w - 2, h, '#0e0e18'); px.rect(g, x, y + 1, w, h - 2, '#0e0e18'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#d8d8e0');
      const lit = inf.n === 0 ? [x + 1, y + 1] : [x + w / 2, y + 1]; px.rect(g, lit[0], lit[1], w / 2 - 1, s(4), '#ffb030'); px.rect(g, x + w / 2 - .5, y + 1, 1, s(4), '#0e0e18');
      return w + s(2);
    }
    if (inf.kind === 'key') {
      const lab = inf.label.toUpperCase(), w = Math.max(s(10), E.font.width(lab, { scale: S }) + s(6));
      px.rect(g, x, y, w, s(10), '#0e0e18'); px.rect(g, x + 1, y + 1, w - 2, s(10) - 2, '#e8e4d8'); px.rect(g, x + 1, y + s(10) - 3, w - 2, 2, '#a8a498');
      E.font.text(g, lab, x + w / 2, y + s(1.5), '#1a1a22', { align: 'center', scale: S, outline: false });
      return w + s(1);
    }
    return 0;
  },
  /** a stick / WASD / mouse "aim" icon */
  aim(g, x, y, I) {
    const d = Glyphs.device(I);
    if (d === 'gamepad') { px.disc(g, x + 5, y + 5, 5, '#0e0e18'); px.disc(g, x + 5, y + 5, 4, '#3a3a52'); px.disc(g, x + 5, y + 4, 2, '#8a8aa0'); return 11; }
    if (d === 'mouse') return Glyphs.drawInfo(g, x, y, { kind: 'mouse', n: 0 });
    let w = 0; for (const k of ['W', 'A', 'S', 'D']) w += Glyphs.drawInfo(g, x + w, y, { kind: 'key', label: k }) - 1; return w + 1;
  },
  /** a row of prompts: [[action, label], ...]; returns the width */
  row(g, x, y, I, list, o = {}) {
    let w = 0; const items = [];
    for (const [a, label] of list) { const iw = a === 'aim' ? 34 : 12, lw = E.font.width(label); items.push({ a, label, iw, lw }); w += iw + lw + 10; }
    let cx = o.align === 'center' ? Math.round(x - w / 2) : o.align === 'right' ? x - w : x;
    for (const it of items) {
      const gw = it.a === 'aim' ? Glyphs.aim(g, cx, y, I) : Glyphs.draw(g, cx, y, I, it.a);
      E.font.text(g, it.label, cx + gw + 2, y + 1, o.color || '#ffffff', { shadow: '#000', outline: false });
      cx += gw + 2 + E.font.width(it.label) + 8;
    }
    return w;
  }
};
K.Glyphs = Glyphs;

/* ---- 44-hud.js ---- */
/* ---- THE MATCH HUD (a pixel overlay, anchored to r.W and r.H, clear of the engine's corner area). Score bug (top
 * left), this over (top right), striker and bowler cards (bottom corners), the Kerfuffle meters (bottom centre), big
 * callouts, contextual prompts by the action (RUN / STAY by the striker, the catch ring at the ball, throw targets at
 * the stumps, REVIEW), the bowling panel and release meter, the speed readout, the radar in the wide camera, and the
 * cards that interrupt play (bowler select, innings break, rain, the third umpire, Owl-Eye). HUD.layout(W, H) gives the
 * persistent rectangles; a test checks none overlap on 4 screen sizes. ---- */
const HUD = {
  callouts: [], t: 0,
  layout(W, H, corner) {
    const cw = corner ? Math.max(0, W - corner.x0) + 4 : 0, top = 4;
    const L = { score: [4, top, 112, 32], over: [W - cw - 100, top, 96, 14], striker: [4, H - 30, 118, 26], bowler: [W - 122, H - 30, 118, 26], meter: [Math.round(W / 2 - 62), H - 22, 124, 18] };
    if (W < 380) { L.meter = [Math.round(W / 2 - 50), H - 52, 100, 18]; }
    L.radar = [W - cw - 74, top + 18, 70, 52];
    return L;
  },
  overlaps(L, corner) {
    const keys = ['score', 'over', 'striker', 'bowler', 'meter'], bad = [];
    const ov = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) if (ov(L[keys[i]], L[keys[j]])) bad.push(keys[i] + '/' + keys[j]);
    if (corner) for (const k of keys) if (ov(L[k], [corner.x0, corner.y0, corner.x1 - corner.x0, corner.y1 - corner.y0])) bad.push(k + '/corner');
    return bad;
  },
  callout(text, color = '#ffffff', dur = .9, big = 3, sub) { this.callouts.push({ text, color, t: 0, dur, big, sub }); if (this.callouts.length > 3) this.callouts.shift(); },
  wire() {
    const on = (t, f) => bus.on(t, d => { if (MatchView.m && d.match && d.match !== MatchView.m) return; f(d); });
    on('boundary', d => this.callout(d.n === 6 ? 'SIX! MAXIMUM!' : 'FOUR!', d.n === 6 ? '#ffd36a' : '#7aa7ff', 1.3, d.n === 6 ? 3 : 3));
    on('wicket', d => this.callout(d.freeHit ? 'FREE HIT! NOT OUT' : 'WICKET!', d.freeHit ? '#6aff8a' : '#ff5a4a', 1.4, 3, d.freeHit ? null : (d.how || '').toUpperCase()));
    on('bat:press', d => { if (K.settings('timing') && MatchView.m && MatchView.m.strikerInput() && !MatchView.m.cfg.cheat.autoBat) this.callout(d.grade === 'miss' ? 'MISS' : d.grade.toUpperCase(), { perfect: '#ffd36a', good: '#6aff8a', early: '#ffb06a', late: '#ffb06a', miss: '#ff6a6a' }[d.grade], .6, 2); });
    on('extra', d => this.callout(d.kind === 'wd' ? 'WIDE' : 'NO BALL', '#e8e8e8', .9, 2, d.kind === 'nb' ? 'FREE HIT NEXT' : null));
    on('fire:on', d => this.callout('ON FIRE!', '#ff8a2a', 1.4, 3, d.who === 'bat' ? 'TIMING x1.5' : 'PACE +10%'));
    on('target:hit', d => this.callout('KERFUFFLE BONUS +' + d.bonus, '#ffd36a', 1.8, 2, d.label));
    on('special', d => { const s = SPECIALS[d.id]; this.callout(s ? s.name.toUpperCase() : 'SPECIAL!', '#ff8ad8', 1.4, 2); });
    on('item', d => this.callout(ITEMS[d.id].name.toUpperCase(), ITEMS[d.id].color, 1.2, 2, ITEMS[d.id].text));
    on('decision', d => { if (d.kind !== 'third') this.callout(d.out ? 'OUT!' : 'NOT OUT', d.out ? '#ff5a4a' : '#6aff8a', 1.2, 3); });
    on('catch:dropped', () => this.callout('DROPPED!', '#ffb06a', 1, 2));
    on('crowd:catch', () => this.callout('CROWD CATCH!', '#ffd36a', 1.4, 2));
    on('catch:screamer', () => this.callout('SCREAMER!', '#ffd36a', 1.2, 3));
    on('run:mixup', () => this.callout('MIX-UP!', '#ff8a6a', 1, 2));
    on('chaos', d => this.callout(CHAOS[d.id] ? CHAOS[d.id].name.toUpperCase() : '', '#c8e8ff', 1.6, 2));
    on('rain:method', d => this.callout('NEW TARGET ' + d.to, '#ffd36a', 2.4, 2, 'THE KERFUFFLE METHOD'));
    on('item:used', d => { if (d.id === 'horseshoe') this.callout('LUCKY HORSESHOE! NOT OUT', '#c8ccd8', 1.8, 2); if (d.id === 'teapot') this.callout('GOLDEN TEAPOT: RUNS x2', '#ffd23a', 1.6, 2); });
    on('superover', () => this.callout('SUPER OVER!', '#ffd36a', 2.4, 3));
    on('innings:start', d => { if (d.target) this.callout('TARGET ' + d.target, '#ffd36a', 2, 3); });
  },
  step(dt) { this.t += dt; for (const c of this.callouts) c.t += dt; this.callouts = this.callouts.filter(c => c.t < c.dur); },
  draw(r) {
    const m = MatchView.m, g = K.game; if (!m || !m.inn) return;
    const corner = g.cornerArea && g.cornerArea(), L = this.layout(r.W, r.H, corner), inn = m.inn;
    r.overlay(gg => {
      if (MatchView.replay) { px.rect(gg, 0, 0, r.W, 3, '#c8202a'); UI.text(gg, 'REPLAY', r.W / 2, 8, '#ffffff', { align: 'center' }); }
      this.scoreBug(gg, L.score, m, inn);
      this.overStrip(gg, L.over, inn);
      this.cards(gg, L, m, inn);
      this.meters(gg, L.meter, m);
      if (MatchView.cam === 'wide' && !MatchView.replay) this.radar(gg, L.radar, m);
      if (K.Tuning.changed().length) { px.rect(gg, L.score[0], L.score[1] + L.score[3] + 2, 22, 9, '#c8202a'); UI.text(gg, 'DEV', L.score[0] + 11, L.score[1] + L.score[3] + 3, '#ffffff', { align: 'center', font: 'tiny' }); }
      this.prompts(gg, r, m);
      this.cardsOver(gg, r, m);
      let stack = 0;
      for (const c of this.callouts) { const k = Math.min(1, c.t / .08), y = Math.round(r.H * .26 + stack - (1 - k) * 10); stack += c.big * 9 + (c.sub ? 22 : 12); E.font.title(gg, c.text, r.W / 2, y, { align: 'center', scale: c.big, colors: ['#ffffff', c.color, c.color, '#000000'], depth: 2 }); if (c.sub) UI.text(gg, c.sub, r.W / 2, y + c.big * 9 + 4, '#ffffff', { align: 'center' }); }
    });
  },
  scoreBug(g, [x, y, w, h], m, inn) {
    const team = TEAMS[inn.bat];
    px.blend(g, .82, 'normal', () => px.rect(g, x, y, w, h, '#0c1410')); px.rect(g, x, y, 4, h, team.chip); px.rect(g, x, y + h - 1, w, 1, '#e8c060');
    UI.text(g, team.code, x + 8, y + 3, '#ffffff');
    E.font.text(g, inn.runs + '/' + inn.wkts, x + 32, y + 2, '#ffffff', { scale: 2, shadow: '#000', outline: false });
    UI.text(g, Rules.oversText(inn.balls) + (inn.overs ? '/' + fmtOvers(inn.overs) : ''), x + w - 4, y + 3, '#c8c0a8', { align: 'right' });
    const need = m.need();
    if (need) { const hard = need.runs > need.balls * 1.6; UI.text(g, need.runs > 0 ? 'NEED ' + need.runs + ' FROM ' + need.balls : 'WON', x + 8, y + 20, hard ? '#ff7a6a' : '#ffd36a'); }
    else UI.text(g, m.innNo === 0 && m.cfg.mode !== 'showdown' && m.cfg.mode !== 'hub' ? 'RUN RATE ' + (inn.balls ? (inn.runs / inn.balls * 6).toFixed(1) : '0.0') : 'MOST RUNS WINS', x + 8, y + 20, '#a8b8a8');
    if (inn.freeHit) { px.rect(g, x + w + 3, y, 44, 12, '#ffd36a'); UI.text(g, 'FREE HIT', x + w + 25, y + 3, '#1a1a1a', { align: 'center', shadow: false }); }
    if (inn.revised) UI.text(g, 'KM ' + inn.revised.from + '→' + inn.revised.to, x + w + 3, y + 16, '#ffd36a');
  },
  overStrip(g, [x, y, w, h], inn) {
    px.blend(g, .7, 'normal', () => px.rect(g, x, y, w, h, '#0c1410'));
    const balls = inn.over.length ? inn.over : [];
    for (let i = 0; i < Math.max(6, balls.length); i++) {
      const b = balls[i], cx = x + 8 + i * 14, cy = y + 7;
      if (cx > x + w - 4) break;
      const col = !b ? '#2a3a2e' : b === 'W' ? '#e83a3a' : b === '6' ? '#ffd36a' : b === '4' ? '#5a8aff' : b === 'wd' || b === 'nb' ? '#8a8a8a' : '#e8e4d8';
      px.disc(g, cx, cy, 5, col);
      if (b) E.font.text(g, b === '•' ? '' : b.length > 1 ? b[0] : b, cx + 1, cy - 3, '#0c0c0c', { align: 'center', font: 'tiny' });
    }
  },
  cards(g, L, m, inn) {
    const s = m.striker, bw = m.bowlerP;
    if (s) { const [x, y, w, h] = L.striker, c = Rules.card(inn, s.id); px.blend(g, .8, 'normal', () => px.rect(g, x, y, w, h, '#0c1410')); const rig = Cast.rig(s.p, 'field'); rig.drawPortrait(g, x + 1, y + 1, h - 2, { zoom: 3, turn: .4, bg: '#1e3020' }); UI.text(g, s.p.short.slice(0, 12), x + h + 3, y + 3, '#ffffff'); UI.text(g, c.runs + '* (' + c.balls + ')', x + h + 3, y + 14, m.fire.bat > 0 ? '#ff8a2a' : '#ffd36a'); const items = m.items[m.bat]; if (items.length) { px.rect(g, x, y - 11, 60, 10, '#3a2a10'); UI.text(g, ITEMS[items[0]].name.split(' ')[0].toUpperCase() + ' ARMED', x + 2, y - 10, ITEMS[items[0]].color, { font: 'tiny' }); } }
    if (bw) { const [x, y, w, h] = L.bowler, c = Rules.bcard(inn, bw.id); px.blend(g, .8, 'normal', () => px.rect(g, x, y, w, h, '#0c1410')); const rig = bw.machine ? null : Cast.rig(bw, 'field'); if (rig) rig.drawPortrait(g, x + w - h + 1, y + 1, h - 2, { zoom: 3, turn: -.4, bg: '#1e3020' }); else { px.rect(g, x + w - h + 1, y + 1, h - 2, h - 2, '#5a4a2a'); px.disc(g, x + w - h / 2, y + h / 2, 6, '#d8a83a'); } UI.text(g, bw.short.slice(0, 13), x + 3, y + 3, '#ffffff'); UI.text(g, c.wkts + '-' + c.runs + '  ' + Rules.oversText(c.balls), x + 3, y + 14, m.fire.bowl > 0 ? '#ff8a2a' : '#c8e8ff'); const items = m.items[m.bowlSide]; if (items.length) { px.rect(g, x + w - 60, y - 11, 60, 10, '#3a2a10'); UI.text(g, ITEMS[items[0]].name.split(' ')[0].toUpperCase() + ' ARMED', x + w - 58, y - 10, ITEMS[items[0]].color, { font: 'tiny' }); } }
  },
  meters(g, [x, y, w, h], m) {
    if (!m.kerfuffle) return;
    const sides = [m.bat, m.bowlSide];
    sides.forEach((s, k) => {
      const yy = y + k * 9, v = m.hype[s] / 100, full = v >= 1, team = m.teams[s];
      px.rect(g, x, yy, w, 7, '#0c1410'); px.rect(g, x + 22, yy + 1, w - 24, 5, '#1e2a22');
      px.rect(g, x + 22, yy + 1, Math.round((w - 24) * v), 5, full ? (Math.floor(this.t * 8) % 2 ? '#ffd36a' : '#ff8ad8') : team.chip);
      E.font.text(g, team.code, x + 2, yy, '#ffffff', { font: 'tiny' });
      const fire = k === 0 ? m.fire.bat : m.fire.bowl;
      if (fire > 0) for (let i = 0; i < 6; i++) px.dot(g, x + 24 + ((i * 17 + Math.floor(this.t * 30)) % (w - 26)), yy - 1 - (i % 2), '#ff8a2a');
      if (full && m.isHuman(s)) { const I = s === m.bat ? m.strikerInput() : m.bowlerInput(); if (I) { Glyphs.draw(g, x + w + 3, yy - 2, I, 'special'); UI.text(g, 'SPECIAL', x + w + 15, yy - 1, '#ff8ad8'); } }
    });
  },
  radar(g, [x, y, w, h], m) {
    px.blend(g, .7, 'normal', () => px.rect(g, x, y, w, h, '#0c1410'));
    const cx = x + w / 2, cy = y + h / 2, sx = (w - 6) / (2 * m.ground.rx), sy = (h - 6) / (2 * m.ground.ry);
    for (let a = 0; a < TAU; a += .2) px.dot(g, cx + Math.cos(a) * (w / 2 - 3), cy + Math.sin(a) * (h / 2 - 3), '#4a6a4a');
    px.rect(g, cx - 1, cy + (0 - G.MID_Y) * sy, 2, 320 * sy, '#c9b98a');
    for (const f of m.fielders) px.rect(g, cx + f.x * sx - 1, cy + (f.y - G.MID_Y) * sy - 1, 2, 2, m.teams[m.bowlSide].chip);
    for (const b of m.batters) px.rect(g, cx + b.x * sx - 1, cy + (b.y - G.MID_Y) * sy - 1, 2, 2, m.teams[m.bat].chip);
    px.rect(g, cx + m.ball.x * sx - 1, cy + (m.ball.y - G.MID_Y) * sy - 1, 3, 3, '#ffffff');
  },
  /** prompts by the action, in the glyphs of each player's last device */
  prompts(g, r, m) {
    const B = MatchView.B, W = (x, y, z = 0) => r.w(x + B.OX, y + B.OY, z), ph = m.phase;
    const bI = m.strikerInput(), wI = m.bowlerInput(), fI = m.fielderInput(), autoB = m.cfg.cheat.autoBat, autoW = m.cfg.cheat.autoBowl;
    // bowling: the delivery panel, the field and over/round, the meter, the marker hint
    if (wI && !autoW && (ph === 'setup' || ph === 'runup')) {
      const y = r.H - 58, ds = m.deliveryChoices, acts = ['shot', 'loft', 'block'], w = Math.min(r.W - 20, 330), x0 = Math.round(r.W / 2 - w / 2);
      if (ph === 'setup') {
        px.blend(g, .8, 'normal', () => px.rect(g, x0, y - 3, w, 26, '#0c1410')); px.rect(g, x0, y - 3, w, 1, '#e8c060');
        const cw = w / 4;
        ds.forEach((d, i) => { const cx = x0 + 4 + i * cw; Glyphs.draw(g, cx, y, wI, acts[i]); UI.text(g, DELIVERIES[d].name.toUpperCase().slice(0, 12), cx + 13, y + 1, '#ffffff'); UI.text(g, Math.round(DELIVERIES[d].kmh[1] * T('ballSpeed') / .62) + ' KM/H', cx + 13, y + 11, '#a8b8a8', { font: 'tiny' }); });
        const ready = m.specialReady(m.bowlSide, 'bowl'), cx = x0 + 4 + 3 * cw; Glyphs.draw(g, cx, y, wI, 'special'); UI.text(g, ready ? SPECIALS[m.bowlerSpecial()].name.toUpperCase().slice(0, 12) : 'SPECIAL', cx + 13, y + 1, ready ? '#ff8ad8' : '#5a5a5a'); UI.text(g, ready ? 'READY!' : 'NEEDS HYPE', cx + 13, y + 11, ready ? '#ffd36a' : '#5a5a5a', { font: 'tiny' });
        Glyphs.row(g, r.W / 2, y - 16, wI, [['aim', 'MARKER'], ['run', FIELDS[m.fieldPreset].name.toUpperCase()], ['back', m.overRound === 'over' ? 'OVER THE WICKET' : 'ROUND THE WICKET']], { align: 'center', color: '#e8e0c8' });
      }
      if (ph === 'runup' && m.meter && m.meter.on && !m.special) {
        const mw = 140, mx = Math.round(r.W / 2 - mw / 2), my = r.H - 46, sk = (m.bowlerP.bowl && m.bowlerP.bowl.skill) || 5, sweet = T('meterSweet') * (.7 + sk * .05);
        px.rect(g, mx - 2, my - 2, mw + 4, 14, '#0c0c0c');
        for (let i = 0; i < mw; i++) { const u = i / mw, gr = Bowling.grade(u, sk); px.rect(g, mx + i, my, 1, 10, gr === 'green' ? '#3ad86a' : gr === 'amber' ? '#e8b03a' : gr === 'over' ? '#ff2a6a' : '#c83a2a'); }
        const nx = mx + Math.round(m.meter.u * mw); px.rect(g, nx - 1, my - 4, 3, 18, '#ffffff'); px.rect(g, nx, my - 4, 1, 18, '#0c0c0c');
        UI.text(g, 'RELEASE', r.W / 2, my - 13, '#ffffff', { align: 'center' }); Glyphs.draw(g, mx + mw + 6, my, wI, 'shot');
        void sweet;
      }
    }
    // speed readout after release
    if ((ph === 'flight' || (ph === 'inPlay' && m.pt < 1.5)) && MatchView.cam !== 'wide' && m.cur.kmh && !(m.cur.hideSpeed && !m.ball.pitched)) { UI.text(g, m.cur.kmh + ' KM/H', r.W - 8, 22, '#ffffff', { align: 'right', scale: 1 }); UI.text(g, (DELIVERIES[m.deliveryId] || {}).name || '', r.W - 8, 32, '#a8b8a8', { align: 'right', font: 'tiny' }); }
    // batting prompts (in the setup: what the buttons do; chapter 1 and the Nets show the full row)
    if (bI && !autoB && (ph === 'setup' || ph === 'runup' || ph === 'flight')) {
      const full = m.cfg.tutorial || m.inn.balls < 2;
      const py = r.W < 380 ? r.H - 72 : r.H - 46;
      if (full) Glyphs.row(g, r.W / 2, py, bI, [['aim', 'AIM'], ['shot', 'GROUND'], ['loft', 'LOFT'], ['block', 'DEFEND']], { align: 'center' });
      if (full && m.bowlerFamily() === 'spin') Glyphs.row(g, r.W / 2, py - 14, bI, [['charge', 'CHARGE']], { align: 'center' });
      if (m.specialReady(m.bat, 'bat') && !m.batSpecialArmed) Glyphs.row(g, r.W / 2, 44, bI, [['special', (SPECIALS[m.striker.p.specBat || 'kerfuffleShot'] || {}).name.toUpperCase()]], { align: 'center', color: '#ff8ad8' });
    }
    // running: RUN / STAY by the striker, the call hint
    if (bI && !autoB && ph === 'inPlay' && m.running && m.cfg.running !== 'auto' && !m.cur.wicket) {
      const s = m.striker, [sx, sy] = W(s.x, s.y, 40), anyGoal = m.batters.some(b => b.goal);
      const hint = m.running.hint || AI.runHint(m);
      if (hint) { const col = hint === 'YES' ? '#6aff8a' : hint === 'NO' ? '#ff6a6a' : '#ffd36a'; px.rect(g, sx - 14, sy - 22, 28, 10, '#0c0c0c'); UI.text(g, hint, sx, sy - 21, col, { align: 'center' }); }
      Glyphs.row(g, sx, sy - 10, bI, anyGoal ? [['run', 'AGAIN'], ['back', 'BACK']] : [['run', 'RUN'], ['back', 'STAY']], { align: 'center' });
    }
    // the catch ring at the ball
    const CR = m.catchRing;
    if (CR && fI && m.time >= CR.t0) {
      const b = m.ball, [sx, sy] = W(b.x, b.y, b.z), k = clamp((CR.tc - m.time) / T('catchRing'), 0, 1), R = 4 + k * 26;
      for (let a = 0; a < TAU; a += .12) { px.dot(g, sx + Math.cos(a) * 6, sy + Math.sin(a) * 6, '#ffffff'); px.dot(g, sx + Math.cos(a) * R, sy + Math.sin(a) * R, k < .15 ? '#6aff8a' : '#ffd36a'); }
      Glyphs.row(g, sx, sy + 12, fI, [['shot', 'CATCH!']], { align: 'center' });
    }
    // the throw: targets at both sets of stumps
    if (fI && m.cfg.fielding !== 'auto' && m.holder && m.holder !== m.keeper && m.holder !== m.bowler && ph === 'inPlay' && !m.thrown) {
      const [ax, ay] = W(0, 0, 18), [bx, by] = W(0, G.BOWL_Y, 18);
      Glyphs.draw(g, ax - 5, ay - 10, fI, 'shot'); Glyphs.draw(g, bx - 5, by - 10, fI, 'loft');
      Glyphs.row(g, r.W / 2, 52, fI, [['shot', "KEEPER'S END"], ['loft', "BOWLER'S END"], ['block', 'LOB IN']], { align: 'center' });
    }
    // the review window
    if (m.reviewWindow > 0 && m.decision) {
      const side = m.decision.reviewSide, I = m.isHuman(side) ? (side === m.bat ? bI : wI) : null;
      if (I && !(side === m.bat ? autoB : autoW)) { px.rect(g, r.W / 2 - 70, 60, 140, 16, '#2a1a3a'); Glyphs.row(g, r.W / 2, 63, I, [['special', 'REVIEW? ' + Math.ceil(m.reviewWindow) + 's (' + m.reviews[side] + ' LEFT)']], { align: 'center', color: '#e8c8ff' }); }
    }
    // the field special and the "nudge" after a long idle in setup
    if (wI && !autoW && ph === 'setup') { const team = m.teams[m.bowlSide], star = team.players.find(p => p.specField); if (star && m.specialReady(m.bowlSide, 'field', SPECIALS[star.specField].cost || 100) && !m.specialReady(m.bowlSide, 'bowl')) UI.text(g, SPECIALS[star.specField].name.toUpperCase() + ': HOLD SPECIAL IN THE FIELD', r.W / 2, 34, '#ff8ad8', { align: 'center' }); if (m.pt > 20 && m.cfg.mode === 'quick') UI.text(g, 'CHOOSE A DELIVERY TO BOWL', r.W / 2, r.H / 2, '#ffffff', { align: 'center' }); }
  },
  /** the cards that interrupt play */
  cardsOver(g, r, m) {
    const ph = m.phase, I = m.bowlerInput() || K.game.input;
    if (ph === 'pickBowler' && m.pickOptions) {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
      UI.text(g, 'CHOOSE YOUR BOWLER', r.W / 2, 34, UI.gold, { align: 'center', scale: 2 });
      const C = HUD.pickCards || (HUD.pickCards = new UICards({ w: 84, h: 112 })); C.cards = m.pickOptions;
      C.draw(g, r, 64, (gg, p, x, y, w, h, on) => { Cast.rig(p, 'field').drawPortrait(gg, x + w / 2 - 20, y + 6, 40, { zoom: 3, turn: .3, bg: '#22382a' }); UI.text(gg, p.short.slice(0, 11), x + w / 2, y + 50, on ? '#ffffff' : '#c8c0a8', { align: 'center' }); UI.text(gg, FAMILY[p.bowl.type].label, x + w / 2, y + 62, '#ffd36a', { align: 'center' }); UI.text(gg, (p.bowl.d.map(d => DELIVERIES[d].name.split(' ')[0]).join(' ')).slice(0, 16), x + w / 2, y + 74, '#a8b8a8', { align: 'center', font: 'tiny' }); const sp = p.specBowl && SPECIALS[p.specBowl]; if (sp) UI.text(gg, sp.name.slice(0, 16), x + w / 2, y + 86, '#ff8ad8', { align: 'center', font: 'tiny' }); UI.text(gg, 'SKILL ' + '★'.repeat(Math.round(p.bowl.skill / 2)), x + w / 2, y + 98, '#e8e0c8', { align: 'center', font: 'tiny' }); });
      UI.footer(g, r, I, [['confirm', 'BOWL'], ['left', 'CHOOSE']]);
    }
    if (ph === 'inningsBreak') {
      const i0 = m.inn; px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
      UI.panel(g, r.W / 2 - 120, 40, 240, 120);
      UI.text(g, m.superPending ? 'SUPER OVER' : m.innNo >= 2 ? 'SUPER OVER: HALF TIME' : 'TEA', r.W / 2, 50, UI.gold, { align: 'center', scale: 2 });
      const top = Object.entries(i0.cards).sort((a, b) => b[1].runs - a[1].runs)[0];
      UI.text(g, i0.runs + '', r.W / 2 - 70, 80, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, 'RUNS', r.W / 2 - 70, 98, '#a8b8a8', { align: 'center' });
      UI.text(g, i0.wkts + '', r.W / 2, 80, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, 'WICKETS', r.W / 2, 98, '#a8b8a8', { align: 'center' });
      UI.text(g, top ? top[1].runs + '' : '0', r.W / 2 + 70, 80, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, top ? playerById(top[0]).short.slice(0, 10) : '', r.W / 2 + 70, 98, '#a8b8a8', { align: 'center' });
      UI.text(g, m.superPending ? 'SCORES LEVEL! ONE OVER EACH, TWO WICKETS' : 'TARGET ' + (i0.runs + 1), r.W / 2, 120, UI.gold, { align: 'center' });
      if (m.treatPick) {
        UI.text(g, 'PICK A TEA TREAT', r.W / 2, 172, '#ffffff', { align: 'center' });
        const C = HUD.teaCards || (HUD.teaCards = new UICards({ w: 96, h: 56 })); C.cards = TEA_TREATS;
        C.draw(g, r, 186, (gg, t, x, y, w, h, on) => { UI.text(gg, t.name, x + w / 2, y + 8, on ? '#ffffff' : '#c8c0a8', { align: 'center' }); UI.para(gg, t.text, x + 4, y + 22, w - 8, '#ffd36a', { font: 'tiny' }); });
      }
    }
    if (ph === 'rainDelay') {
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0a1a'));
      UI.panel(g, r.W / 2 - 130, 36, 260, 110, { bg: ['#1a2a1a', '#0a140a'] });
      UI.text(g, 'RAIN STOPS PLAY', r.W / 2, 46, '#c8e8ff', { align: 'center', scale: 2 });
      const crumb = Cast.extra('crumb'); crumb.drawPortrait(g, r.W / 2 - 122, 70, 40, { zoom: 3, turn: .3, bg: '#2a3a2a' });
      px.rect(g, r.W / 2 - 74, 70, 196, 66, '#1e2a22'); px.rect(g, r.W / 2 - 74, 70, 196, 2, '#8a6a3a');
      const inn = m.inn, O = inn.overs, left = O * 6 - inn.balls, cut = Math.max(1, Math.ceil(left / 2));
      const lines = m.innNo === 1 ? ['MRS CRUMB\'S KERFUFFLE METHOD', 'RESOURCES LEFT: ' + left + ' BALLS', 'LESS ' + cut + ' FOR THE RAIN', 'x WICKETS, CARRY THE SCONE...'] : ['THE COVERS ARE ON.', 'TEA IS SERVED.', 'NOBODY IS COMPLAINING.'];
      lines.forEach((l, i) => UI.text(g, l, r.W / 2 - 68, 76 + i * 14, '#f4f0e0', { font: 'default' }));
    }
    if (m.chaos.some(c => c.id === 'advert' && c.t < 3)) {
      px.rect(g, 0, 0, r.W, r.H, '#1a0a3a'); E.font.title(g, 'THRUMPTON PARKING', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 3, colors: ['#ffffff', '#ffcf3a', '#ff8a2a', '#7a3aff'] }); UI.text(g, 'PARK LIKE A LORD', r.W / 2, r.H / 2 + 6, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, 'FOUR HUNDRED SPACES. NO CRICKET.', r.W / 2, r.H / 2 + 30, '#c8a0ff', { align: 'center' });
    }
    if (m.chaos.some(c => c.id === 'tray' && c.t < 3)) { UI.panel(g, r.W / 2 - 100, r.H / 2 - 20, 200, 30); UI.text(g, 'TEA IS SERVED, SAYS FORTESCUE', r.W / 2, r.H / 2 - 10, UI.gold, { align: 'center' }); }
    // the third umpire's screen: a slot reel between OUT and NOT OUT
    const d = m.decision;
    if (d && d.kind === 'third') {
      const k = d.t / d.umpT;
      px.rect(g, r.W / 2 - 90, 30, 180, 44, '#0c0c18'); px.rect(g, r.W / 2 - 90, 30, 180, 2, '#7a3aff'); px.rect(g, r.W / 2 - 90, 72, 180, 2, '#7a3aff');
      UI.text(g, 'THIRD UMPIRE: ' + (d.third || '').toUpperCase(), r.W / 2, 34, '#c8a0ff', { align: 'center' });
      const word = d.pending ? (k < .6 ? (Math.floor(d.t * 10) % 2 ? 'OUT' : 'NOT OUT') : (Math.floor(d.t * 4) % 2 ? 'OUT' : 'NOT OUT')) : (d.truth ? 'OUT' : 'NOT OUT');
      E.font.title(g, word, r.W / 2, 46, { align: 'center', scale: 2, colors: word === 'OUT' ? ['#ffffff', '#ff5a4a', '#c8202a'] : ['#ffffff', '#6aff8a', '#2a8a3a'] });
    }
    // Owl-Eye's three lights during an LBW review
    if (d && d.reviewing && d.owl) {
      const x = r.W - 112, y = 40;
      UI.panel(g, x, y, 104, 62, { bg: ['#1a1030', '#0a0818'], border: '#c8a0ff' });
      UI.text(g, 'OWL-EYE', x + 52, y + 4, '#c8a0ff', { align: 'center' });
      const rows = [['PITCHING', d.owl.pitching, d.owl.pitching === 'outside leg' ? 'r' : 'g'], ['IMPACT', d.owl.impact2, d.owl.impact2 === 'in line' || d.owl.impact2 === 'outside off (no shot)' ? 'g' : 'r'], ['WICKETS', d.owl.wickets, d.owl.wickets === 'hitting' ? 'g' : d.owl.wickets === 'umpire' ? 'a' : 'r']];
      rows.forEach(([lab, val, c], i) => { if (d.rt < 1 + i * 1.2) return; px.disc(g, x + 10, y + 21 + i * 13, 4, c === 'g' ? '#3ad86a' : c === 'a' ? '#e8b03a' : '#e83a3a'); UI.text(g, lab, x + 18, y + 17 + i * 13, '#ffffff', { font: 'tiny' }); UI.text(g, String(val).toUpperCase().slice(0, 14), x + 18, y + 23 + i * 13, '#a8a0c8', { font: 'tiny' }); });
    }
  }
};
const fmtOvers = o => (Math.abs(o - Math.round(o)) < 1e-6 ? String(Math.round(o)) : Rules.oversText(Math.round(o * 6)));
/** the YES / NO / WAIT hint for a human batting side (the AI's own call) */
AI.runHint = m => { const s = m.striker, n = m.nonStriker; if (!m.running || !s || !n) return null; const e = m.otherEnd(m.batterEnd(s) || s.home); const mg = AI.fieldTime(m, e) - Math.max(AI.batTime(m, s, e), AI.batTime(m, n, m.otherEnd(e))); return mg > .35 ? 'YES' : mg < -.15 ? 'NO' : 'WAIT'; };
K.HUD = HUD;

/* ---- 45-ui.js ---- */
/* ---- 10-FOOT UI: big lists, option rows (left / right change the value), cards and panels, readable from a sofa.
 * One decision per screen, at most 6 items, a big animated cricket-ball cursor and a gold bar on the focus. The mouse's
 * hover moves the focus and a click picks; keys, d-pad and sticks move it; confirm picks, cancel goes back. Footer
 * prompts use the live glyphs. ---- */
const UI = {
  gold: '#ffd36a', ink: '#fff8e8', dim: '#a8a090', panel: '#14241a', panel2: '#1e3626', edge: '#e8c060',
  /** a framed panel */
  panel(g, x, y, w, h, o = {}) {
    px.rect(g, x + 2, y + 2, w, h, '#00000060');
    E.ui.box(g, x, y, w, h, { bg: o.bg || ['#1e3a28', '#10201a'], border: o.border || UI.edge, alpha: o.alpha || .94 });
  },
  /** the cricket-ball cursor */
  ball(g, x, y, t) { const b = Math.sin(t * 6) * 1.5; px.disc(g, x, y + b, 4, '#4a0a0a'); px.disc(g, x, y + b, 3.4, '#c8202a'); px.line(g, x - 2, y + b - 2, x + 2, y + b + 2, '#f4e8c0'); px.dot(g, x - 1, y + b - 2, '#ffffff'); },
  title(g, text, x, y, scale = 2, colors) { E.font.title(g, text, x, y, { align: 'center', scale, colors: colors || ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 }); },
  text(g, s, x, y, c = UI.ink, o = {}) { E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o)); },
  /** wrapped text in at most `lines` lines; returns the height */
  para(g, s, x, y, w, c = UI.ink, o = {}) { const L = E.font.wrap(s, w, o); let yy = y; for (const l of L) { UI.text(g, l, x, yy, c, o); yy += E.font.lineHeight(o) + 2; } return yy - y; },
  footer(g, r, I, list) { const y = r.H - 14; px.blend(g, .6, 'normal', () => px.rect(g, 0, y - 4, r.W, 18, '#000000')); Glyphs.row(g, r.W / 2, y, I, list, { align: 'center' }); },
  /** a hit test for the mouse: the pointer inside a rectangle */
  hover(I, x, y, w, h) { const p = I.pointer && I.pointer(); return p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h; },
  clickIn(I, x, y, w, h) { const c = I.clicked && I.clicked(); return c && c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h; }
};
/** a list of big rows. items: [{ label, value: () => text, left(), right(), act(), help, disabled, hidden }] */
class UIList {
  constructor(o) { Object.assign(this, { items: [], i: 0, rowH: 18, w: 220, x: 'center', y: 80, title: null, t: 0, onBack: null, lastPointer: null }, o); }
  visible() { return this.items.filter(it => !(typeof it.hidden === 'function' ? it.hidden() : it.hidden)); }
  update(dt, I) {
    this.t += dt; const items = this.visible(); if (!items.length) return null;
    if (!this.layout && K.game) { const W = K.game.W || 427, w = Math.min(this.w, W - 20); this.layout = { x: this.x === 'center' ? Math.round(W / 2 - w / 2) : this.x, y: this.y, w }; }
    if (this.i >= items.length) this.i = items.length - 1;
    const rep = a => I.repeat ? I.repeat(a, .32, .09) : I.pressed(a);
    if (rep('up')) { this.i = (this.i + items.length - 1) % items.length; K.sfx('select'); }
    if (rep('down')) { this.i = (this.i + 1) % items.length; K.sfx('select'); }
    const it = items[this.i];
    if (it && rep('left') && it.left) { it.left(); K.sfx('select'); }
    if (it && rep('right') && it.right) { it.right(); K.sfx('select'); }
    // the mouse: hover moves the focus, a click picks (or turns a value row on its arrows)
    const p = I.pointer && I.pointer(), moved = p && (!this.lastPointer || p[0] !== this.lastPointer[0] || p[1] !== this.lastPointer[1]); this.lastPointer = p;
    const L = this.layout;
    if (L && moved) items.forEach((q, k) => { const y = L.y + k * this.rowH; if (UI.hover(I, L.x, y - 2, L.w, this.rowH)) this.i = k; });
    const c = I.clicked && I.clicked();
    if (L && c) items.forEach((q, k) => { const y = L.y + k * this.rowH; if (c[0] >= L.x && c[0] < L.x + L.w && c[1] >= y - 2 && c[1] < y - 2 + this.rowH) { this.i = k; if (q.left && c[0] < L.x + 26) { q.left(); K.sfx('select'); } else if (q.right && c[0] > L.x + L.w - 26) { q.right(); K.sfx('select'); } else if (q.act && !q.disabled) { K.sfx('confirm'); q.act(); } else if (q.right) { q.right(); K.sfx('select'); } } });
    if (I.pressed('confirm') && it && !(c && L)) { I.consume('confirm'); if (it.act && !it.disabled) { K.sfx('confirm'); it.act(); return 'act'; } if (it.right) { it.right(); K.sfx('select'); } }
    if (I.pressed('cancel') && this.onBack) { I.consume('cancel'); K.sfx('cancel'); this.onBack(); return 'back'; }
    return null;
  }
  draw(g, r) {
    const items = this.visible(), w = Math.min(this.w, r.W - 20), x = this.x === 'center' ? Math.round(r.W / 2 - w / 2) : this.x, y = this.y;
    this.layout = { x, y, w };
    if (this.title) UI.text(g, this.title, r.W / 2, y - 16, UI.gold, { align: 'center' });
    items.forEach((it, k) => {
      const yy = y + k * this.rowH, on = k === this.i, dis = it.disabled;
      if (on) { px.blend(g, .85, 'normal', () => px.rect(g, x, yy - 3, w, this.rowH - 2, '#5a4410')); px.rect(g, x, yy - 3, w, 1, UI.gold); px.rect(g, x, yy + this.rowH - 6, w, 1, '#a07a20'); UI.ball(g, x - 8, yy + 4, this.t); }
      const val = it.value ? it.value() : null, col = dis ? '#6a6a60' : on ? '#ffffff' : UI.ink;
      if (val !== null && val !== undefined) {
        UI.text(g, it.label, x + 6, yy, col);
        const vs = String(val); UI.text(g, vs, x + w - 18, yy, on ? UI.gold : '#d8c8a0', { align: 'right' });
        if (on && it.left) UI.text(g, '←', x + w - 30 - E.font.width(vs), yy, UI.gold); if (on && it.right) UI.text(g, '→', x + w - 12, yy, UI.gold);
      } else UI.text(g, it.label, x + w / 2, yy, col, { align: 'center' });
    });
    const it = items[this.i];
    if (it && it.help) { const h = typeof it.help === 'function' ? it.help() : it.help; const hy = this.helpTop ? Math.max(4, y - 30) : y + items.length * this.rowH + 4; if (hy + 10 < r.H - 18 || this.helpTop) UI.para(g, h, Math.round(r.W / 2 - 150), this.helpTop ? hy : Math.min(hy, r.H - 30), 300, '#d8d0b8', { align: 'left', font: 'tiny' }); }
  }
}
/** a row of big cards to pick one from (bowler select, tea treats, team cards): left / right, confirm, hover, click */
class UICards {
  constructor(o) { Object.assign(this, { cards: [], i: 0, w: 92, h: 110, t: 0, lastPointer: null }, o); }
  update(dt, I) {
    this.t += dt; const n = this.cards.length; if (!n) return null;
    const rep = a => I.repeat ? I.repeat(a, .32, .12) : I.pressed(a);
    if (rep('left')) { this.i = (this.i + n - 1) % n; K.sfx('select'); }
    if (rep('right')) { this.i = (this.i + 1) % n; K.sfx('select'); }
    const p = I.pointer && I.pointer(), moved = p && (!this.lastPointer || p[0] !== this.lastPointer[0] || p[1] !== this.lastPointer[1]); this.lastPointer = p;
    const L = this.layout;
    if (L && moved) L.forEach((b, k) => { if (UI.hover(I, b[0], b[1], b[2], b[3])) this.i = k; });
    const c = I.clicked && I.clicked();
    if (L && c) for (let k = 0; k < L.length; k++) { const b = L[k]; if (c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]) { this.i = k; K.sfx('confirm'); return { pick: k }; } }
    if (I.pressed('confirm')) { I.consume('confirm'); K.sfx('confirm'); return { pick: this.i }; }
    if (I.pressed('cancel')) { I.consume('cancel'); return { back: true }; }
    return null;
  }
  draw(g, r, y, drawCard) {
    const n = this.cards.length, gap = 8, w = Math.min(this.w, Math.floor((r.W - 20 - gap * (n - 1)) / n)), total = n * w + (n - 1) * gap, x0 = Math.round(r.W / 2 - total / 2);
    this.layout = [];
    this.cards.forEach((c, k) => { const x = x0 + k * (w + gap), on = k === this.i, yy = y - (on ? 4 : 0); this.layout.push([x, yy, w, this.h]); UI.panel(g, x, yy, w, this.h, { border: on ? UI.gold : '#5a6a5a', bg: on ? ['#2e4a34', '#18301e'] : ['#1a2e20', '#0e1a12'] }); drawCard(g, c, x, yy, w, this.h, on); if (on) UI.ball(g, x + w / 2, yy - 6, this.t); });
  }
}
K.UI = UI; K.UIList = UIList; K.UICards = UICards;

/* ---- 47-game.js ---- */
/* ---- THE GAME: its key map, its settings and pause items, and the helpers that read them (made before the scenes,
 * which hang off it). Controls (rebindable on the Controls screen): aim = stick / d-pad / WASD / arrows / the mouse;
 * shot = Cross / J / left click; loft = Square / K / right click; block = Circle / L / Q; special = Triangle / I / F;
 * run = R1 / Space; back = L1 / Shift; charge = R2 / E; pause = Options / Esc / P. Menus: confirm = Cross / Enter /
 * Space / J; cancel = Circle / Esc / Backspace / L. Create (Pad8) is never bound (in AI Hub sessions it is the hub's). ---- */
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  shot: ['KeyJ', 'Mouse0', 'Pad0'], loft: ['KeyK', 'Mouse2', 'Pad2'], block: ['KeyL', 'KeyQ', 'Pad1'], special: ['KeyI', 'KeyF', 'KeyT', 'Pad3'],
  run: ['Space', 'Pad5'], back: ['ShiftLeft', 'ShiftRight', 'Pad4'], charge: ['KeyE', 'Pad7'], tab: ['Tab'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyL', 'Pad1']
};
const HUB = !!(window.AIHub && window.AIHub.active);
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['County', 'Village', 'Test', 'Kerfuffle!'], value: 'County', help: 'Timing windows, ball speed, the CPU\'s skill and catching' },
  { key: 'defOvers', label: 'Default overs', options: ['2', '1', '3', '5'], value: '2', help: 'Overs an innings in a Quick Match' },
  { key: 'defWickets', label: 'Default wickets', options: ['5', '3', '10', '2'], value: '5', help: 'Wickets an innings in a Quick Match' },
  { key: 'kerfuffleRules', label: 'Kerfuffle rules', value: true, help: 'Items, specials, stadium targets and chaos. Off: purist arcade' },
  { key: 'pitchMarker', label: 'Pitch marker (batting)', value: true, help: 'Shows where the ball will land' },
  { key: 'timing', label: 'Timing feedback', value: true, help: 'PERFECT / GOOD / EARLY / LATE after each shot' },
  { key: 'fielding', label: 'Fielding', options: ['Assisted', 'Manual', 'Auto'], value: 'Assisted', help: 'Assisted: easy catches are taken for you. Manual: steer the chaser. Auto: the CPU fields' },
  { key: 'running', label: 'Running', options: ['Manual', 'Auto'], value: 'Manual', help: 'Auto: the batters call their own runs' },
  { key: 'replays', label: 'Replays', options: ['Big moments', 'Always', 'Never'], value: 'Big moments' },
  { key: 'captions', label: 'Commentary captions', value: true },
  { key: 'voices', label: 'Commentary voices', value: true, help: 'Gibberish voices for the commentators and players' }
];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: KEYS, bg: '#0c1a10', id: 'cricket-kerfuffle', autoPause: !HUB,
  menu: { items: HUB ? [] : [['Restart Match', () => K.restart()], ['Match Info', () => K.matchInfo()], ['Dev Mode', () => K.dev.open()]], settings: SETTINGS,
    controls: { shot: 'Ground shot / Bowl / Catch', loft: 'Lofted shot / Alt delivery', block: 'Defend / Alt delivery', special: 'Special / Review', run: 'Run / Field', back: 'Stay / Over-Round', charge: 'Charge', tab: false }, quit: HUB ? false : 'title' } });
K.game = game; game.hubActive = HUB;
const SETTING_MAP = { difficulty: v => ({ County: 'county', Village: 'village', Test: 'test', 'Kerfuffle!': 'kerfuffle' }[v] || 'county'), fielding: v => String(v || 'Assisted').toLowerCase(), running: v => String(v || 'Manual').toLowerCase(), defOvers: v => +v || 2, defWickets: v => +v || 5 };
K.settings = key => { const v = game.settings ? game.settings[key] : undefined, def = SETTINGS.find(s => s.key === key); const val = v === undefined ? (def ? def.value : undefined) : v; return SETTING_MAP[key] ? SETTING_MAP[key](val) : val; };
/* the mouse, for player 1: the ground point under the pointer (sim units), fresh while it moved in the last second */
K.mouseAim = I => {
  if (I !== game.input || !game.input.mouse || !game.input.mouse.active || !MatchView.B) return null;
  const p = game.mouseGround(); if (!p) return null;
  const fresh = game.input.clock - game.input.mouse.t < 1, last = K._lastMouse || p, dx = (p[0] - last[0]); K._lastMouse = p;
  return { x: p[0] - MatchView.B.OX, y: p[1] - MatchView.B.OY, fresh, dx: fresh ? dx : 0 };
};
/** the batter's aim: the mouse's ground point relative to the batter while it moved lately, else the stick (screen space) */
K.batAim = (I, m) => {
  if (!I) return null;
  const ms = K.mouseAim(I);
  if (ms && ms.fresh && I.lastDevice === 'mouse') { const dx = ms.x - m.striker.x, dy = ms.y - m.striker.y, d = hyp(dx, dy); if (d > 30) return [dx / d, dy / d]; }
  const mv = I.move(); if (hyp(mv[0], mv[1]) < .3) return null;
  const d = (K.view || game.view).screenDirToGround(mv[0], mv[1]), l = hyp(d[0], d[1]) || 1; return [d[0] / l, d[1] / l];
};
/** a click on (or near) a set of stumps throws there */
K.clickEnd = I => {
  if (I !== game.input) return null; const c = I.clicked && I.clicked(); if (!c || !MatchView.B || !game.r) return null;
  const B = MatchView.B, r = game.r, a = r.w(B.OX, B.OY, 8), b = r.w(B.OX, B.OY + G.BOWL_Y, 8);
  const da = hyp(c[0] - a[0], c[1] - a[1]), db = hyp(c[0] - b[0], c[1] - b[1]);
  return Math.min(da, db) < 40 ? (da < db ? 'S' : 'B') : null;
};

/* ---- 50-front.js ---- */
/* ---- THE FRONT END: the title (the village green at golden hour, a batter knocking up, Doris, the logo, PRESS),
 * the main menu (STORY, QUICK MATCH, VERSUS, SUPER OVER SHOWDOWN, NETS, EXTRAS), match setup, the versus lobby (1-4
 * players on one screen), Extras (Settings, Controls, About/Credits) and the results. After 10 s without input on any
 * of these screens the attract mode starts. Touch-only devices: no touch controls; "Controller or keyboard required"
 * and a Settings button; the attract mode still runs. ---- */
const Idle = {
  t: 0, last: null,
  /** any input at all: an action, a key, a click, the mouse moving, a stick past the dead zone, a touch */
  any(I) {
    const p = I.pointer && I.pointer(), mt = (I.mouse ? I.mouse.t : -99) + ':' + (p ? p[0] + ',' + p[1] : ''), moved = this.last !== null && mt !== this.last; this.last = mt;
    return I.anyPressed() || moved || !!(I.clicked && I.clicked()) || hyp(...I.move()) > .3;
  },
  step(dt) { const P = K.game.players || [K.game.input]; if (P.some(I => this.any(I))) this.t = 0; else this.t += dt; if (P.some(I => I.anyPressed() && (I.lastDevice === 'gamepad' || I.lastDevice === 'keyboard'))) K.sawKeys = true; return this.t; },
  reset() { this.t = 0; }
};
K.idle = Idle;
// touch only: no fine pointer (mouse, trackpad, pen) and some sign of touch. Touch points alone aren't enough: iOS WebKit
// can report 0 of them, so a coarse pointer or touch events count too. A TV with a remote (no pointer, no touch) isn't
// gated, and a key press or a controller connecting lifts the gate
const touchOnly = () => { try { return !matchMedia('(any-pointer: fine)').matches && ((navigator.maxTouchPoints || 0) > 0 || matchMedia('(any-pointer: coarse)').matches || 'ontouchstart' in window) && !K.sawKeys; } catch (e) { return false; } };
K.touchOnly = touchOnly;
addEventListener('keydown', () => { K.sawKeys = true; });
addEventListener('gamepadconnected', () => { K.sawKeys = true; });
addEventListener('keydown', e => { if (e.code === 'Backquote' && !HUB && K.dev) { e.preventDefault && e.preventDefault(); K.dev.toggle(); } });
/* the title's little world: the green in the three-quarter view, a batter knocking up, a bowler, Doris */
const TitleWorld = {
  rigs: null, t: 0,
  init() {
    if (this.rigs) return;
    const ker = TEAMS.ker;
    this.rigs = { bat: Cast.rig(ker.players.find(p => p.id === 'edie'), 'bat'), bowl: Cast.rig(ker.players.find(p => p.id === 'basil'), 'field'), keep: Cast.rig(ker.players.find(p => p.id === 'pip'), 'keep'), crumb: Cast.extra('crumb') };
  },
  step(dt) {
    this.init(); this.t += dt; const B = Ground.get('green'), t = this.t, cyc = t % 3.2;
    const sw = cyc > 2.2 && cyc < 2.9 ? Anim.stroke('drive', cyc - 2.2, .13, .5) : null;
    this.rigs.bat.update(dt, { x: B.OX + 66, y: B.OY - 470, z: 0, vx: 0, vy: 0, facing: Math.PI, attack: sw, crouch: sw ? .2 : .35 });
    const bx = B.OX + 56, by = B.OY - 470 + 120 - Math.max(0, Math.min(1, (cyc - .8) / 1.4)) * 60;
    this.rigs.bowl.update(dt, { x: bx, y: by, z: 0, vx: 0, vy: cyc > .8 && cyc < 2.2 ? -45 : 0, facing: -Math.PI / 2, attack: cyc > 2.05 && cyc < 2.6 ? Anim.stroke('spinArm', cyc - 2.05, .16, .3) : null });
    this.rigs.keep.update(dt, { x: B.OX + 62, y: B.OY - 500, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, crouch: .9, pose: 'crouch' });
    this.rigs.crumb.update(dt, { x: B.OX - 50, y: B.OY - 575, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: Math.floor(t / 4) % 2 ? 'wave' : null });
  },
  draw(r) {
    const B = Ground.get('green'), g = K.game, t = this.t, cyc = t % 3.2;
    g.lights.enabled = true; g.lights.ambient = .78;
    r.sky(['#ffb870', '#ffd8a0', '#fff0c8']);
    B.map.drawFloor(r); B.map.queueWalls(r);
    for (const [id, x, y, f] of GROUNDS.green.props) K.drawProp(r, id, B.OX + x, B.OY + y, f);
    for (const tg of GROUNDS.green.targets) if (tg.shape) r.shape(tg.shape, B.OX + tg.at[0], B.OY + tg.at[1], 0, { facing: tg.face || 0 });
    r.shape('KERFUFFLE:stumps', B.OX + 60, B.OY - 490, 0, { facing: Math.PI / 2 }); r.shape('KERFUFFLE:teaUrn', B.OX - 70, B.OY - 580, 0); r.shape('KERFUFFLE:cakeStand', B.OX - 84, B.OY - 580, 0); r.shape('table', B.OX - 76, B.OY - 584, 0);
    const cowX = B.OX - 130 + Math.sin(t * .05) * 110, cowY = B.OY - 470 + Math.cos(t * .04) * 30;
    r.shape('KERFUFFLE:cow', cowX, cowY, 0, { facing: Math.cos(t * .05) > 0 ? 0 : Math.PI, params: { step: Math.floor(t * 6) % 16 } });
    for (const [k, rig] of Object.entries(this.rigs)) { r.shadow(rig.x, rig.y, 5, .35); r.actor(rig.x, rig.y, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view)); void k; }
    if (cyc > 2.05 && cyc < 3.1) { const k = clamp((cyc - 2.25) / .3, 0, 1), bx = B.OX + 56, by = B.OY - 470 + 60 - k * 40, bz = 30 - k * 22 + (cyc > 2.55 ? (cyc - 2.55) * 160 : 0); r.queue(bx, by, bz, gg => { const [sx, sy] = r.w(bx + (cyc > 2.55 ? (cyc - 2.55) * -300 : 0), by + (cyc > 2.55 ? (cyc - 2.55) * 200 : 0), bz); px.disc(gg, sx, sy, 2, '#b8202a'); }); }
    g.lights.add(B.OX - 600, B.OY - 800, 300, 1400, .35, { color: '#ffb060' });
    g.focus(B.OX, B.OY - 545, 0);
  }
};
function titleLogo(g, r, y) {
  E.font.title(g, 'CRICKET', r.W / 2, y, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#c8402a'], depth: 3, depthColor: '#3a1a10' });
  E.font.title(g, 'KERFUFFLE', r.W / 2, y + 26, { align: 'center', scale: 4, colors: ['#ffffff', '#c8f0a8', '#5ab04a', '#1e5a2a'], depth: 3, depthColor: '#0e2a14' });
  UI.text(g, 'Over-the-top arcade cricket, with tea', r.W / 2, y + 62, '#fff4d8', { align: 'center' });
}
scenes.title = {
  view: 'threequarter', camera: { zoom: false },
  enter() { if (K.deepLink) { const d = K.deepLink; K.deepLink = null; game.after(.02, () => K.runDeep(d)); } Audio.music('title'); Idle.reset(); this.state = 'press'; this.t = 0; K.game.setView(Views.v.story); game.input.consumeAll(); this.menu = mainMenu(); this.sub = null; game.allowJoin(false); Play.m = null; MatchView.m = null; },
  update(dt) {
    this.t += dt; TitleWorld.step(dt);
    const I = game.input, idle = Idle.step(dt);
    if (idle > 10) { game.go('attract', { segment: K.attractNext || 0 }); return; }
    if (touchOnly()) { const c = I.clicked && I.clicked(); if (c && this.gateBtn && c[0] >= this.gateBtn[0] && c[0] < this.gateBtn[0] + this.gateBtn[2] && c[1] >= this.gateBtn[1] && c[1] < this.gateBtn[1] + this.gateBtn[3]) game.menu('settings'); return; }
    if (this.state === 'press') { if (I.pressed('confirm') || I.pressed('start') || I.pressed('shot') || (I.clicked && I.clicked())) { I.consumeAll(); this.state = 'menu'; K.sfx('confirm'); } return; }
    const L = this.sub || this.menu; L.update(dt, I);
  },
  back() { if (this.sub) { this.sub = null; return true; } if (this.state === 'menu') { this.state = 'press'; return true; } return false; },
  draw(r) {
    TitleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, r.W, 92, '#1a0a00'));
      titleLogo(g, r, 10);
      if (touchOnly()) {
        const w = 220, x = r.W / 2 - w / 2, y = 112; UI.panel(g, x, y, w, 96);
        UI.text(g, 'Controller or keyboard required', r.W / 2, y + 10, UI.gold, { align: 'center' });
        px.rect(g, r.W / 2 - 60, y + 28, 40, 22, '#3a3a52'); px.disc(g, r.W / 2 - 52, y + 39, 4, '#8a8aa0'); px.disc(g, r.W / 2 - 28, y + 37, 2, '#5fd38a'); px.disc(g, r.W / 2 - 24, y + 41, 2, '#ff6b6b');
        px.rect(g, r.W / 2 + 10, y + 28, 50, 22, '#e8e4d8'); for (let i = 0; i < 4; i++) px.rect(g, r.W / 2 + 13 + i * 12, y + 31, 9, 7, '#a8a498');
        this.gateBtn = [r.W / 2 - 50, y + 62, 100, 24]; px.rect(g, ...this.gateBtn, '#5a4410'); UI.text(g, 'SETTINGS', r.W / 2, y + 70, '#ffffff', { align: 'center' });
        return;
      }
      if (this.state === 'press') { if (Math.floor(this.t * 2) % 2 === 0) Glyphs.row(g, r.W / 2, r.H - 60, game.input, [['confirm', 'PRESS TO PLAY']], { align: 'center' }); UI.text(g, 'v1.0 - my-3D2dge ' + E.versionLabel().replace(/[^\x20-\x7e]/g, '-'), r.W / 2, r.H - 12, '#5a4a30', { align: 'center', font: 'tiny' }); return; }
      const L = this.sub || this.menu, n = L.visible().length; L.y = Math.max(92, Math.round(r.H - 64 - n * L.rowH)); UI.panel(g, Math.round(r.W / 2 - 122), L.y - 8, 244, n * L.rowH + 6, { alpha: .8 }); L.draw(g, r);
      UI.footer(g, r, game.input, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
function mainMenu() {
  return new UIList({ w: 210, rowH: 17, items: [
    { label: 'STORY: THE GRAND KERFUFFLE', act: () => { scenes.title.sub = storyMenu(); }, help: 'Five matches to save the village green from Lord Thrumpton.' },
    { label: 'QUICK MATCH', act: () => game.go('setup', { mode: 'quick' }), help: 'Any two teams, any ground. Up to four players can join.' },
    { label: 'VERSUS (2-4 PLAYERS)', act: () => game.go('setup', { mode: 'versus' }), help: 'Friends on one screen: versus, co-op or two against two.' },
    { label: 'SUPER OVER SHOWDOWN', act: () => game.go('showdown'), help: 'One over against the Thrumptonator 3000, or defend 14. High scores.' },
    { label: 'NETS', act: () => game.go('nets'), help: "Mrs Crumb's lessons, free practice and the Six Machine." },
    { label: 'EXTRAS', act: () => { scenes.title.sub = extrasMenu(); }, help: 'Settings, controls, about and credits.' }
  ] });
}
function storyMenu() {
  const save = Story.latest();
  return new UIList({ w: 200, rowH: 17, onBack: () => { scenes.title.sub = null; }, items: [
    { label: 'CONTINUE', hidden: () => !save, act: () => { Story.load(); game.go('storymap'); }, help: save ? 'Chapter ' + Math.min(5, (save.data && save.data.chapter) || 1) + ' - ' + (save.place || '') : '' },
    { label: 'NEW GAME', act: () => { if (save && !scenes.title.confirmNew) { scenes.title.confirmNew = true; K.sfx('cancel'); return; } scenes.title.confirmNew = false; Story.newGame(); game.go('cutscene', { scene: 'prologue', next: { scene: 'storymap' } }); }, help: () => scenes.title.confirmNew ? 'Press again to start over (your story save will be replaced).' : 'Start the Grand Kerfuffle from the beginning.' },
    { label: 'BACK', act: () => { scenes.title.sub = null; } }
  ] });
}
function extrasMenu() {
  return new UIList({ w: 200, rowH: 17, onBack: () => { scenes.title.sub = null; }, items: [
    { label: 'SETTINGS', act: () => game.menu('settings') },
    { label: 'CONTROLS', act: () => game.menu('controls') },
    { label: 'ABOUT & CREDITS', act: () => game.go('about') },
    { label: 'BACK', act: () => { scenes.title.sub = null; } }
  ] });
}
/* ---- match setup (Quick Match and Versus): one row at a time, values change with left / right or a click on the arrows ---- */
const TIMES = ['Ground default', 'Day', 'Dusk', 'Night'], WEATHERS = ['Ground default', 'Clear', 'Overcast', 'Rain', 'Fog'];
scenes.setup = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    this.mode = d.mode || 'quick'; Idle.reset(); K.game.setView(Views.v.story);
    const un = Profile.data.unlocked, teams = TEAM_IDS.filter(t => un.includes(t) || this.mode === 'versus');
    this.o = this.o || { a: 0, b: 1, ground: 0, overs: [1, 2, 3, 5].indexOf(K.settings('defOvers')), wickets: [2, 3, 5, 10].indexOf(K.settings('defWickets')), diff: 0, time: 0, weather: 0, kerf: K.settings('kerfuffleRules') };
    if (this.o.overs < 0) this.o.overs = 1; if (this.o.wickets < 0) this.o.wickets = 2;
    this.teams = teams; this.o.a = Math.min(this.o.a, teams.length - 1); this.o.b = Math.min(this.o.b, teams.length - 1); if (this.o.a === this.o.b) this.o.b = (this.o.a + 1) % teams.length;
    this.sides = { 1: 0 };
    if (this.mode === 'versus') { game.allowJoin({ max: 4, onJoin: (input, n) => { this.sides[n] = n % 2 ? 1 : 0; K.sfx('confirm'); } }); }
    const o = this.o, cyc = (k, n, d) => { o[k] = (o[k] + d + n) % n; }, D = ['County', 'Village', 'Test', 'Kerfuffle!'];
    const tname = k => TEAMS[this.teams[o[k]]].name;
    // the next team for one side; landing on the other side's team swaps the two (so with two teams the row still works)
    const pickTeam = (k, d) => { const other = k === 'a' ? 'b' : 'a', prev = o[k]; cyc(k, this.teams.length, d); if (o[k] === o[other]) o[other] = prev; };
    const teamHelp = () => this.mode === 'versus' ? "Every team. Picking the other side's team swaps the two." : this.teams.length + ' of ' + TEAM_IDS.length + ' teams unlocked. Beat a team to unlock it.';
    this.list = new UIList({ w: 260, rowH: 14, y: 56, onBack: () => game.go('title'), items: [
      { label: this.mode === 'versus' ? 'HOME TEAM' : 'YOUR TEAM', value: () => tname('a'), left: () => pickTeam('a', -1), right: () => pickTeam('a', 1), help: teamHelp },
      { label: this.mode === 'versus' ? 'AWAY TEAM' : 'OPPONENTS', value: () => tname('b'), left: () => pickTeam('b', -1), right: () => pickTeam('b', 1), help: teamHelp },
      { label: 'GROUND', value: () => GROUNDS[GROUND_IDS[o.ground]].name, left: () => cyc('ground', GROUND_IDS.length, -1), right: () => cyc('ground', GROUND_IDS.length, 1) },
      { label: 'OVERS', value: () => [1, 2, 3, 5][o.overs], left: () => cyc('overs', 4, -1), right: () => cyc('overs', 4, 1) },
      { label: 'WICKETS', value: () => [2, 3, 5, 10][o.wickets], left: () => cyc('wickets', 4, -1), right: () => cyc('wickets', 4, 1) },
      { label: 'DIFFICULTY', value: () => D[o.diff === 0 ? D.indexOf(game.settings.difficulty || 'County') : o.diff - 1] || 'County', left: () => { o.diff = ((o.diff === 0 ? D.indexOf(game.settings.difficulty || 'County') + 1 : o.diff) + 2) % 4 + 1; }, right: () => { o.diff = (o.diff === 0 ? D.indexOf(game.settings.difficulty || 'County') + 1 : o.diff) % 4 + 1; } },
      { label: 'TIME OF DAY', value: () => TIMES[o.time], left: () => cyc('time', TIMES.length, -1), right: () => cyc('time', TIMES.length, 1) },
      { label: 'WEATHER', value: () => WEATHERS[o.weather], left: () => cyc('weather', WEATHERS.length, -1), right: () => cyc('weather', WEATHERS.length, 1) },
      { label: 'KERFUFFLE RULES', value: () => (o.kerf ? 'ON' : 'OFF'), left: () => { o.kerf = !o.kerf; }, right: () => { o.kerf = !o.kerf; }, help: 'Items, specials, stadium targets and chaos events. Off: purist arcade.' },
      { label: 'PLAY', act: () => this.start(), help: () => this.mode === 'versus' ? 'Players: press START on a pad, or 2 on the keyboard, to join. Left / right picks a side.' : 'You bat or bowl after the toss. Beat a team to unlock it.' }
    ] });
  },
  exit() { game.allowJoin(false); },
  start() {
    const o = this.o, P = game.players, humans = { 0: [], 1: [] };
    if (this.mode === 'versus') P.forEach((I, i) => humans[this.sides[i + 1] || 0].push(I)); else humans[0] = [game.input];
    if (!humans[0].length && !humans[1].length) humans[0] = [game.input];
    const D = ['county', 'village', 'test', 'kerfuffle'];
    const cfg = { mode: this.mode, teams: [this.teams[o.a], this.teams[o.b]], ground: GROUND_IDS[o.ground], overs: [1, 2, 3, 5][o.overs], wickets: [2, 3, 5, 10][o.wickets], difficulty: o.diff ? D[o.diff - 1] : K.settings('difficulty'),
      timeOfDay: o.time ? ['day', 'dusk', 'night'][o.time - 1] : null, weather: o.weather ? ['clear', 'overcast', 'rain', 'fog'][o.weather - 1] : null, kerfuffleRules: o.kerf, humans, toss: true };
    game.go('match', { cfg, hooks: { onEnd: (m, r) => { if (r.won && this.mode === 'quick') { const opp = m.teams[1].id; if (Profile.unlock(opp)) r.unlocked = opp; const next = TEAM_IDS.find(t => !Profile.data.unlocked.includes(t)); if (next && r.won) Profile.unlock(next); } Profile.stat('matches'); if (r.won) Profile.stat('wins'); game.go('results', { m, r }); } } });
  },
  update(dt) {
    const I = game.input; if (Idle.step(dt) > 10) { game.go('attract', { segment: K.attractNext || 0 }); return; }
    if (this.mode === 'versus') for (let i = 1; i < game.players.length; i++) { const q = game.players[i]; if (q.pressed('left')) this.sides[i + 1] = 0; if (q.pressed('right')) this.sides[i + 1] = 1; }
    this.list.update(dt, I);
  },
  back() { game.go('title'); return true; },
  draw(r) {
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06100a'));
      UI.text(g, this.mode === 'versus' ? 'VERSUS' : 'QUICK MATCH', r.W / 2, 12, UI.gold, { align: 'center', scale: 2 });
      const o = this.o, ta = TEAMS[this.teams[o.a]], tb = TEAMS[this.teams[o.b]];
      for (const [t, x] of [[ta, 16], [tb, r.W - 16 - 54]]) { if (r.W < 400) break; UI.panel(g, x, 40, 54, 70, { border: t.chip }); Cast.rig(t.players[0], 'field').drawPortrait(g, x + 7, 46, 40, { zoom: 3, turn: .3, bg: '#22382a' }); UI.text(g, t.code, x + 27, 90, '#ffffff', { align: 'center' }); UI.text(g, t.nick.replace('The ', '').toUpperCase().slice(0, 10), x + 27, 100, t.chip, { align: 'center', font: 'tiny' }); }
      this.list.draw(g, r);
      if (this.mode === 'versus') {
        const P = game.players, y = r.H - 54; UI.text(g, 'PLAYERS', r.W / 2, y - 12, UI.gold, { align: 'center' });
        for (let i = 0; i < 4; i++) { const q = P[i], side = this.sides[i + 1] || 0, x = r.W / 2 - 150 + i * 76; px.rect(g, x, y, 70, 22, q ? E.PLAYER_COLORS[i] : '#2a2a2a'); UI.text(g, 'P' + (i + 1), x + 4, y + 3, '#ffffff'); UI.text(g, q ? (side ? tb.code : ta.code) : 'JOIN', x + 66, y + 3, '#ffffff', { align: 'right' }); if (q) UI.text(g, q.device === 'gamepad' || q.lastDevice === 'gamepad' ? 'PAD' : q.half === 'right' ? 'KEYS R' : 'KEYS', x + 4, y + 13, '#e8e8e8', { font: 'tiny' }); }
      }
      UI.footer(g, r, game.input, [['up', 'ROW'], ['left', 'CHANGE'], ['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
/* ---- the results: banner, margin, Player of the Match, 3 key stats, the Wisden-style report, stars (story),
 * highlights, then Rematch / Continue / Menu ---- */
scenes.results = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    this.m = d.m; this.r = d.r || {}; this.t = 0; this.hl = null; Idle.reset();
    const m = this.m, r = this.r;
    Audio.music('tea');
    if (r.won !== null && r.won !== undefined) Audio.sting(r.won ? 'win' : 'lose');
    this.list = new UIList({ w: 200, rowH: 16, items: [
      { label: d.continueLabel || 'CONTINUE', hidden: () => !d.onContinue, act: () => d.onContinue() },
      { label: 'HIGHLIGHTS', hidden: () => !(m && m.highlights.some(h => h.frames)), act: () => this.playHighlights() },
      { label: 'REMATCH', hidden: () => !!d.onContinue || !Play.cfg, act: () => game.go('match', { cfg: Object.assign({}, Play.cfg, { seed: (Play.cfg.seed || 1) + 7 }), hooks: K.lastHooks }) },
      { label: 'MENU', act: () => game.go('title') }
    ] });
  },
  playHighlights() {
    const m = this.m, top = m.highlights.filter(h => h.frames).sort((a, b) => b.w - a.w).slice(0, 3);   // (only moments with a recording)
    if (!top.length) return; this.hl = { list: top, i: 0 }; MatchView.attach(m); MatchView.replay = { frames: top[0].frames, t: 0, len: top[0].frames.length / 30, speed: .6, cam: 'wide', ball: top[0].frames[0].ball };
  },
  update(dt) {
    this.t += dt; const I = game.input;
    if (this.hl) {
      MatchView.updateRigs(dt); MatchView.direct(dt);
      if (!MatchView.replay || I.pressed('confirm') || I.pressed('cancel')) { I.consumeAll(); this.hl.i++; const h = this.hl.list[this.hl.i]; if (h) MatchView.replay = { frames: h.frames, t: 0, len: h.frames.length / 30, speed: .6, cam: 'wide', ball: h.frames[0].ball }; else { this.hl = null; MatchView.replay = null; } }
      return;
    }
    if (this.t > .6) this.list.update(dt, I);
  },
  draw(r) {
    const m = this.m, res = (m && m.result) || {}, R = this.r;
    if (this.hl) { MatchView.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, 3, '#c8202a'); UI.text(g, 'HIGHLIGHTS ' + (this.hl.i + 1) + '/' + this.hl.list.length, r.W / 2, 8, '#ffffff', { align: 'center' }); UI.footer(g, r, game.input, [['confirm', 'NEXT'], ['cancel', 'DONE']]); }); return; }
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06100a'));
      const win = res.winner ? TEAMS[res.winner] : null;
      E.font.title(g, res.tie ? 'TIED!' : win ? win.code + ' WIN!' : 'RESULT', r.W / 2, 8, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a', win ? win.chip : '#ffb347', '#3a1a10'], depth: 2 });
      UI.text(g, res.text || '', r.W / 2, 38, '#ffffff', { align: 'center' });
      if (R.pom) { const p = playerById(R.pom); if (p) { UI.panel(g, 16, 54, 74, 86); Cast.rig(p, 'field').drawPortrait(g, 33, 60, 40, { zoom: 3, turn: .3, bg: '#22382a' }); UI.text(g, 'PLAYER OF', 53, 104, UI.gold, { align: 'center', font: 'tiny' }); UI.text(g, 'THE MATCH', 53, 111, UI.gold, { align: 'center', font: 'tiny' }); UI.text(g, p.short.slice(0, 11), 53, 122, '#ffffff', { align: 'center' }); } }
      if (m) { const stats = keyStats(m); stats.forEach((s, i) => { const x = r.W / 2 - 60 + i * 60; UI.text(g, s[0], x, 56, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, s[1], x, 74, '#a8b8a8', { align: 'center', font: 'tiny' }); }); }
      UI.panel(g, Math.max(96, r.W / 2 - 110), 88, Math.min(260, r.W - 110), 58, { bg: ['#f0e8d0', '#e0d4b0'], border: '#8a6a3a' });
      UI.text(g, 'THE KERFUFFLE ALMANACK', Math.max(96, r.W / 2 - 110) + Math.min(260, r.W - 110) / 2, 92, '#5a3a1a', { align: 'center', font: 'tiny', shadow: false });
      UI.para(g, R.report || '', Math.max(96, r.W / 2 - 110) + 6, 100, Math.min(260, r.W - 110) - 12, '#2a1a0a', { font: 'tiny', shadow: false });
      if (R.stars) { R.stars.forEach((s, i) => { UI.text(g, s[1] ? '★' : '-', r.W / 2 - 140, 152 + i * 11, s[1] ? '#ffd36a' : '#5a5a5a'); UI.text(g, s[0], r.W / 2 - 130, 152 + i * 11, s[1] ? '#ffffff' : '#8a8a8a'); }); }
      if (R.unlocked) UI.text(g, 'UNLOCKED: ' + TEAMS[R.unlocked].name.toUpperCase(), r.W / 2, R.stars ? 188 : 156, '#6aff8a', { align: 'center' });
      this.list.y = Math.max(R.stars ? 190 : 166, r.H - 80); this.list.draw(g, r);
      UI.footer(g, r, game.input, [['confirm', 'SELECT']]);
    });
  }
};
function keyStats(m) {
  const all = m.innings.filter(i => !i.posted);
  const sixes = all.reduce((s, i) => s + i.sixes, 0), fours = all.reduce((s, i) => s + i.fours, 0), wk = all.reduce((s, i) => s + i.wkts, 0);
  return [[String(sixes), 'SIXES'], [String(fours), 'FOURS'], [String(wk), 'WICKETS']];
}
/* ---- About / Credits: paged, one topic per page ---- */
scenes.about = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) { this.page = 0; this.t = 0; this.ending = !!(d && d.ending); Idle.reset(); Audio.music(this.ending ? 'title' : 'tea'); this.screens = null; },
  /** the pages laid out for this screen: a long topic continues on a second screen ("2/2") */
  layout(W, H) {
    const w = Math.min(W - 30, 420), maxH = H - 58, out = [], lh = E.font.lineHeight({}) + 2;
    for (const P of ABOUT) {
      let cur = { title: P.title, rows: [] }, h = 0; const parts = [];
      for (const line of P.lines) { const label = Array.isArray(line) ? line[0] : null, text = Array.isArray(line) ? line[1] : line, wr = E.font.wrap(String(text), w - 8, {}); parts.push({ label, wr }); }
      const turn = () => { out.push(cur); cur = { title: P.title, rows: [], cont: true }; h = 0; };
      for (const p of parts) {
        const need = (p.label ? lh : 0) + p.wr.length * lh + 4;
        if (need <= maxH) { if (h + need > maxH && cur.rows.length) turn(); cur.rows.push(p); h += need; continue; }
        // an answer taller than a whole screen: its lines run on over as many screens as it needs
        let wr = p.wr, label = p.label;
        while (wr.length) {
          const head = label ? lh : 0, room = Math.floor((maxH - h - head - 4) / lh);
          if (room < Math.min(3, wr.length) && cur.rows.length) { turn(); continue; }
          const take = Math.max(1, Math.min(wr.length, room));
          cur.rows.push({ label, wr: wr.slice(0, take) }); h += head + take * lh + 4; wr = wr.slice(take); label = null;
        }
      }
      out.push(cur);
    }
    return out;
  },
  update(dt) {
    this.t += dt; const I = game.input; if (!this.screens) this.screens = this.layout(game.W || 427, game.H || 240); const n = this.screens.length;
    if (I.pressed('right') || I.pressed('confirm') || I.pressed('shot')) { I.consumeAll(); if (this.page < n - 1) { this.page++; K.sfx('pageTurn'); } else if (this.t > .5) game.go('title'); }
    if (I.pressed('left')) { this.page = Math.max(0, this.page - 1); K.sfx('pageTurn'); }
    if (I.pressed('cancel')) { I.consumeAll(); game.go('title'); }
    const c = I.clicked && I.clicked(); if (c) { if (c[0] > K.game.W / 2) { if (this.page < n - 1) this.page++; else game.go('title'); } else this.page = Math.max(0, this.page - 1); }
  },
  back() { game.go('title'); return true; },
  draw(r) {
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    if (!this.screens || this.screensW !== r.W || this.screensH !== r.H) { this.screens = this.layout(r.W, r.H); this.screensW = r.W; this.screensH = r.H; this.page = Math.min(this.page, this.screens.length - 1); }
    const P = this.screens[this.page];
    r.overlay(g => {
      px.blend(g, .82, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06100a'));
      UI.text(g, (this.page + 1) + ' / ' + this.screens.length, 8, 10, '#a8a090');
      UI.text(g, P.title + (P.cont ? ' (CONT.)' : ''), r.W / 2, 8, UI.gold, { align: 'center', scale: 2 });
      let y = 30; const w = Math.min(r.W - 30, 420), x = Math.round(r.W / 2 - w / 2), lh = E.font.lineHeight({}) + 2;
      for (const p of P.rows) { if (p.label) { UI.text(g, p.label, x, y, '#ffd36a'); y += lh; } for (const l of p.wr) { UI.text(g, l, x + 8, y, '#ffffff'); y += lh; } y += 4; }
      UI.footer(g, r, game.input, [['left', 'PAGE'], ['confirm', 'NEXT'], ['cancel', 'BACK']]);
    });
  }
};
K.titleLogo = titleLogo; K.TitleWorld = TitleWorld;

/* ---- 51-attract.js ---- */
/* ---- THE ATTRACT MODE: after 10 s without input on the title and front-end screens, a looping showreel of real
 * gameplay on the real match machinery, with cheating autopilots on both sides (chosen deliveries, chosen shots at
 * perfect timing, guaranteed catches and direct hits). Ten segments of about 25 s, each a small data script; then it
 * loops. DEMO blinks, PRESS ANY BUTTON shows the last device's glyph, a TV caption names the ground. Any input returns
 * to the title and is consumed (it never also picks a menu item); nothing is saved; settings are untouched. ---- */
const ATTRACT = [
  { caption: 'THE VILLAGE GREEN', ground: 'green', teams: ['ker', 'mud'], bowler: 'terry', chaos: ['cow'], balls: [{ kind: 'four', theta: 52, token: 'teapot' }, { kind: 'dot' }, { kind: 'four', theta: -60 }] },
  { caption: 'THE LEANING WICKET', ground: 'green', teams: ['ker', 'mud'], bowler: 'terry', replay: true, balls: [{ kind: 'six', target: 'pub' }, { kind: '1' }] },
  { caption: 'THE REVEREND DECIDES', ground: 'green', teams: ['mud', 'ker'], bowler: 'basil', balls: [{ kind: 'review', delivery: 'legbreak' }, { kind: 'bowled', delivery: 'googly' }] },
  { caption: 'THRUMPTON HALL', ground: 'hall', weather: 'overcast', teams: ['ker', 'gen'], bowler: 'peregrine', balls: [{ kind: 'edge', delivery: 'outswing', catches: true }, { kind: 'caught', catches: true }] },
  { caption: 'SUNBURNT BAY', ground: 'bay', teams: ['ker', 'lar'], bowler: 'shazza', chaos: ['tide'], balls: [{ kind: 'bouncer', duck: true }, { kind: 'bouncer' }, { kind: 'dot' }] },
  { caption: 'YES! NO! SORRY!', ground: 'green', teams: ['ker', 'mud'], bowler: 'terry', balls: [{ kind: '1' }, { kind: 'runout', third: true }] },
  { caption: 'DUSTBOWL DOWNS', ground: 'downs', teams: ['ker', 'mag'], bowler: 'spinaldo', chase: 26, balls: [{ kind: 'dot', special: true }, { kind: 'stumped' }, { kind: 'rain' }] },
  { caption: 'WILLOW ABLAZE', ground: 'dome', time: 'night', weather: 'clear', teams: ['ker', 'thr'], bowler: 'thrumpton', balls: [{ kind: 'four', theta: 40 }, { kind: 'six', theta: -50, crowdCatch: true }, { kind: 'four', theta: -80 }, { kind: 'six', target: 'jumbotron', batSpecial: true }] },
  { caption: 'THE MIDNIGHT FINAL', ground: 'dome', time: 'night', weather: 'fog', teams: ['ker', 'thr'], bowler: 'machine', chaos: ['ghosts', 'fog'], balls: [{ kind: 'dot', special: true }, { kind: 'six', theta: -30 }, { kind: 'win' }] },
  { caption: 'HIGH SCORES', table: true }
];
const Attract = {
  seg: 0, i: 0, t: 0,
  extraFor(S) {
    const self = this;
    return {
      pre(dt, m) {
        self.t += dt;
        if (m.phase === 'setup' && m.pt < .02 && !m.force.outcome) {
          const b = S.balls[self.i]; if (!b) return;
          if (b.kind === 'rain') { if (!m.chaos.some(c => c.id === 'rain')) { m.startChaos('rain'); self.i++; } return; }
          if (b.kind === 'win') { m.inn.target = m.inn.runs + 1; m.force.outcome = { kind: 'four', theta: 30 }; self.i++; return; }
          m.force.outcome = Object.assign({}, b);
          m.cfg.cheat.catches = !!b.catches; m.cfg.cheat.lbwGiven = b.kind === 'review' ? false : undefined; m.cfg.cheat.review = b.kind === 'review' ? true : undefined;
          if (b.special) { m.hype[m.bowlSide] = 100; m.force.delivery = null; m.cpuPlan = null; }
          if (b.batSpecial) m.hype[m.bat] = 100;
          if (b.token) { const [ux, uy] = dirOf(b.theta, m.hand); m.tokens.push({ id: b.token, x: ux * 180, y: G.CREASE_S + 16 + uy * 180, z: 6, t: 0, life: 99 }); }
          if (b.third) m.cfg.cheat.thirdUp = true;
          if (b.crowdCatch) m.flags.crowdCatchNext = true;
          m.cpuPlan = null; AI.planBowling(m);   // the scripted ball, planned now that its outcome is set
          self.i++;
        }
        if (m.force.outcome && m.force.outcome.special && m.phase === 'setup' && m.pt > .3) { m.startRunup('special'); }
        if (m.force.outcome && m.force.outcome.batSpecial && m.phase === 'flight' && !m.batSpecialArmed && m.specialReady(m.bat, 'bat')) { m.armBatSpecial(); }
      },
      step(dt, m) {
        const out = self.i >= S.balls.length && (m.phase === 'between' || m.phase === 'done' || m.phase === 'inningsBreak');
        if ((out && m.pt > .6) || self.t > 42) Attract.next();
      },
      draw(r) { Attract.overlay(r, S); }
    };
  },
  next() { this.seg = (this.seg + 1) % ATTRACT.length; K.attractNext = this.seg; game.go('attract', { segment: this.seg }, { fade: 'wipe', seconds: .3 }); },
  overlay(r, S) {
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, r.H - 30, r.W, 30, '#000000'));
      if (Math.floor(K.game.time * 2) % 2 === 0) UI.text(g, 'DEMO', r.W / 2, r.H - 26, '#ff5a4a', { align: 'center', scale: 2 });
      Glyphs.row(g, r.W / 2, r.H - 12, game.input, [[Glyphs.device(game.input) === 'mouse' ? 'shot' : 'confirm', 'PRESS ANY BUTTON']], { align: 'center' });
      if (S && S.caption) { px.rect(g, 4, 40, E.font.width(S.caption) + 16, 14, '#c8202a'); UI.text(g, S.caption, 12, 43, '#ffffff'); }
      if (S && this.t < 3) E.font.title(g, 'CRICKET KERFUFFLE', r.W / 2, 50, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#5ab04a'], depth: 1 });
    });
  }
};
scenes.attract = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    const seg = (d && d.segment !== undefined ? d.segment : 0) % ATTRACT.length, S = ATTRACT[seg];
    Attract.seg = seg; Attract.i = 0; Attract.t = 0; this.S = S; this.t = 0; Idle.reset(); Idle.last = null; this.armed = false;
    Tuning.persist = false;
    coverage.mark('attract:' + seg);
    if (S.table) { Audio.music('attract'); this.table = true; return; }
    this.table = false;
    const cfg = { mode: 'attract', replays: !!S.replay, teams: S.teams, ground: S.ground, overs: 1, wickets: 10, difficulty: 'county', kerfuffleRules: true, humans: {}, toss: false, battingFirst: 0, timeOfDay: S.time || null, weather: S.weather || null, superOver: false, seed: 11 + seg, cheat: { autoBat: true, autoBowl: true }, forceBowler: S.bowler, commentary: true };
    if (S.chase) cfg.scenario = { innings: 1, battingFirst: 1, firstRuns: S.chase - 1, firstWkts: 4 };
    Play.begin(cfg, { extra: Attract.extraFor(S) });
    Audio.music('attract');
    const m = Play.m;
    if (S.chaos) game.after(.1, () => { for (const c of S.chaos) if (Play.m === m && !m.chaos.some(x => x.id === c)) m.startChaos(c); });
  },
  exit() { Tuning.persist = true; },
  update(dt) {
    this.t += dt;
    const I = game.input, P = game.players || [I];
    // any input returns to the title (and is consumed); give the scene a moment so the input that started it can't end it
    if (this.t > .4) { const any = P.some(q => Idle.any(q)); if (any) { P.forEach(q => q.consumeAll()); game.go('title', {}, { fade: .2 }); return; } } else P.forEach(q => Idle.any(q));
    if (this.table) { if (this.t > 7) Attract.next(); return; }
    Play.update(dt);
  },
  draw(r) {
    if (this.table) {
      r.sky(['#0a1a10', '#1a3a20', '#2a5a30']);
      r.overlay(g => K.titleLogo(g, r, 8));
      cab.drawTable(r, 'bat', 84, 'SHOWDOWN: TOP TEN');
      Attract.overlay(r, null);
      return;
    }
    Play.draw(r);
  }
};
K.Attract = Attract; K.ATTRACT = ATTRACT;

/* ---- 53-story.js ---- */
/* ---- STORY MODE: The Grand Kerfuffle. Progress (chapter reached, stars per chapter, tea treats, best results) goes
 * through game.saves' autosave slot, written after each chapter's result and on the story map; Continue loads
 * saves.latest(). The county map: five grounds on a road (an E.Path) with the minibus driving between them and three
 * stars a chapter. Cutscenes: a three-quarter vignette with posed rigs and a Dialog with portraits and markup,
 * skippable with a held confirm (a ring fills over 1 s). A loss offers Retry, Retry on Village difficulty, or the Map. ---- */
const Story = {
  data: null,
  fresh() { return { chapter: 1, stars: {}, best: {}, treats: [], done: false, lessons: {} }; },
  newGame() { this.data = this.fresh(); this.save(); },
  latest() { try { const s = game.saves.latest(); return s && s.data ? s : null; } catch (e) { return null; } },
  load() { const s = this.latest(); this.data = s && s.data ? Object.assign(this.fresh(), s.data) : this.fresh(); return this.data; },
  save() { try { game.saves.autosave(); } catch (e) { /* storage blocked: kept for the visit */ } },
  ch(n) { return CHAPTERS[n - 1]; },
  /** the MatchConfig for chapter n */
  config(n, village) {
    const c = this.ch(n), cfg = { mode: 'story', chapter: n, teams: ['ker', c.opp], ground: c.ground, overs: c.overs, wickets: c.wickets, difficulty: village ? 'village' : K.settings('difficulty'), kerfuffleRules: c.kerfuffle,
      humans: { 0: [game.input] }, toss: false, battingFirst: c.battingFirst || 0, scenario: c.scenario ? Object.assign({}, c.scenario) : null, timeOfDay: c.time || null, weather: c.weather || null, tutorial: !!c.tutorial };
    return cfg;
  },
  /** play chapter n: the pre scene, the Nets lessons it teaches (first time), the match with its beats, the result */
  play(n, village) {
    const c = this.ch(n), lessons = (c.lessons || []).filter(l => !this.data.lessons[l]);
    const toMatch = () => this.match(n, village);
    const afterPre = () => lessons.length ? game.go('nets', { lessons, then: toMatch, story: true }) : toMatch();
    game.go('cutscene', { scene: c.pre, then: afterPre });
  },
  match(n, village) {
    const c = this.ch(n), cfg = this.config(n, village), beats = [];
    beats.push({ scene: c.mid, when: m => n === 4 ? m.phase === 'rainDelay' && m.pt > .5 : m.innNo === 1 && m.phase === 'setup' && m.inn.balls === 0 && m.pt > .3 });
    if (n === 4) cfg.forceRain = true;
    game.go('match', { cfg, hooks: { beats, onEnd: (m, r) => this.result(n, m, r, village), extra: this.extraFor(n) } });
  },
  /** chapter-specific match rules: the rain delay at Dustbowl Downs, the Thrumptonator's boss over, goal flags */
  extraFor(n) {
    const flags = {};
    return {
      pre(dt, m) {
        if (n === 4 && m.innNo === 1 && m.phase === 'between' && m.inn.balls === 3 && !flags.rain) { flags.rain = true; m.cur.overEnd = false; m.startChaos('rain'); }
        if (n === 5 && m.innNo === 1 && m.phase === 'setup' && m.inn.balls === (m.inn.overs - 1) * 6 && !flags.boss) { flags.boss = true; flags.bossWk = m.inn.wkts; m.cfg.forceBowler = 'machine'; m.setBowler('machine'); }
        if (n === 5 && flags.boss && m.innNo === 1) m.flags.bossClean = m.inn.wkts === flags.bossWk && (m.inn.done || m.inn.balls >= m.inn.overs * 6);
      },
      step(dt, m) { if (n === 3 && m.innNo === 1 && !m.chaos.some(c => c.id === 'tide') && m.phase === 'setup' && !flags.tide) { flags.tide = true; m.startChaos('tide'); } }
    };
  },
  result(n, m, r, village) {
    const c = this.ch(n), won = !!r.won;
    const stars = c.goals.map(([label, f]) => [label, !!f(m, r)]);
    r.stars = stars;
    const prev = this.data.stars[n] || [false, false, false]; this.data.stars[n] = prev.map((s, i) => s || stars[i][1]);
    if (won) { this.data.chapter = Math.max(this.data.chapter, n + 1); if (n === 5) this.data.done = true; Profile.unlock(c.opp); }
    this.data.best[n] = Math.max(this.data.best[n] || 0, stars.filter(s => s[1]).length);
    this.save();
    const next = won ? () => game.go('cutscene', { scene: c.win, then: () => n === 5 ? game.go('about', { ending: true }) : game.go('storymap') }) : () => game.go('cutscene', { scene: 'loss', then: () => game.go('storymap', { retry: n }) });
    game.go('results', { m, r, onContinue: next, continueLabel: 'CONTINUE' });
    void village;
  }
};
game.saves.write = () => ({ data: Story.data || Story.fresh(), place: Story.data ? (CHAPTERS[Math.min(5, Story.data.chapter) - 1] || CHAPTERS[4]).title : 'The Grand Kerfuffle', level: Story.data ? Math.min(5, Story.data.chapter) : 1 });
game.saves.read = s => { Story.data = Object.assign(Story.fresh(), s && s.data); };
/* ---- the county map ---- */
const MAP_PINS = [[70, 150], [150, 92], [240, 138], [320, 80], [400, 120]];
scenes.storymap = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    if (!Story.data) Story.load();
    Story.save(); Audio.music('map'); Idle.reset(); this.t = 0;
    this.sel = Math.min(5, Story.data.chapter) - 1; this.bus = this.sel; this.retry = d && d.retry ? d.retry : null;
    this.path = new E.Path(MAP_PINS.map(p => [p[0], p[1], 0]), { smooth: 'catmull' });
    this.menu = null;
  },
  update(dt) {
    this.t += dt; const I = game.input, open = Math.min(5, Story.data.chapter);
    if (Idle.step(dt) > 10 && !this.menu) { game.go('attract', { segment: K.attractNext || 0 }); return; }
    this.bus = approach(this.bus, this.sel, dt * 1.5);
    if (this.menu) { this.menu.update(dt, I); return; }
    if (I.repeat('right', .3, .15) || I.repeat('down', .3, .15)) { this.sel = Math.min(open - 1, this.sel + 1); K.sfx('select'); }
    if (I.repeat('left', .3, .15) || I.repeat('up', .3, .15)) { this.sel = Math.max(0, this.sel - 1); K.sfx('select'); }
    const L = this.layout, p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
    if (L) for (let i = 0; i < open; i++) { const [x, y] = L.pin(i); if (p && hyp(p[0] - x, p[1] - y) < 12 && I.mouse && I.clock - I.mouse.t < .05) this.sel = i; if (c && hyp(c[0] - x, c[1] - y) < 14) { this.sel = i; this.openMenu(); } }
    if (I.pressed('confirm')) { I.consume('confirm'); this.openMenu(); }
    if (I.pressed('cancel')) { I.consume('cancel'); game.go('title'); }
  },
  openMenu() {
    const n = this.sel + 1, played = Story.data.stars[n];
    this.menu = new UIList({ w: 180, rowH: 16, y: 160, onBack: () => { this.menu = null; }, items: [
      { label: played ? 'REPLAY' : 'PLAY', act: () => Story.play(n, false) },
      { label: 'RETRY ON VILLAGE', hidden: () => this.retry !== n, act: () => Story.play(n, true), help: 'The same match at Village difficulty.' },
      { label: 'BACK', act: () => { this.menu = null; } }
    ] });
    K.sfx('confirm');
  },
  back() { if (this.menu) { this.menu = null; return true; } game.go('title'); return true; },
  draw(r) {
    const W = r.W, H = r.H, sx = W / 470, sy = H / 240, k = Math.min(sx, sy), ox = (W - 470 * k) / 2, oy = (H - 240 * k) / 2;
    const pin = i => [ox + MAP_PINS[i][0] * k, oy + MAP_PINS[i][1] * k]; this.layout = { pin };
    r.sky(['#7ab0d8', '#a8d0e8', '#c8e0d0']);
    r.overlay(g => {
      // the painted county: fields, hedgerows, a river, the sea at Sunburnt Bay
      px.rect(g, 0, 0, W, H, '#8ab86a');
      const rnd = E.rng(5); for (let i = 0; i < 70; i++) { const x = rnd() * W, y = rnd() * H, w = 30 + rnd() * 60, h = 20 + rnd() * 40; px.rect(g, x, y, w, h, ['#7aa85a', '#9ac87a', '#a8b86a', '#c8c070'][i % 4]); px.rect(g, x, y, w, 1, '#4a7a3a'); px.rect(g, x, y, 1, h, '#4a7a3a'); }
      for (let x = 0; x < W; x += 2) { const y = H * .7 + Math.sin(x * .03) * 12; px.rect(g, x, y, 2, 3, '#5a9ad0'); }
      px.rect(g, ox + 438 * k, 0, 14 * k, H, '#e8d8a0'); px.rect(g, ox + 448 * k, 0, W, H, '#5aa8e0'); px.ell(g, ox + 240 * k, oy + 196 * k, 46 * k, 22 * k, '#e8d8a0'); px.ell(g, ox + 240 * k, oy + 200 * k, 40 * k, 18 * k, '#5aa8e0');
      for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H; px.disc(g, x, y, 4, '#3a7a32'); px.disc(g, x - 1, y - 1, 3, '#5a9a4a'); }
      // the road and the minibus
      for (let d = 0; d < this.path.length; d += 3) { const p = this.path.at(d); px.rect(g, ox + p.x * k - 1, oy + p.y * k - 1, 3, 3, '#c8b088'); }
      const open = Math.min(5, Story.data.chapter);
      for (let i = 0; i < 5; i++) {
        const [x, y] = pin(i), c = CHAPTERS[i], on = i === this.sel, locked = i >= open, st = Story.data.stars[i + 1] || [];
        px.disc(g, x, y, on ? 9 : 7, '#1a1a1a'); px.disc(g, x, y, on ? 8 : 6, locked ? '#6a6a6a' : TEAMS[c.opp].chip);
        if (on) UI.ball(g, x, y - 16, this.t);
        UI.text(g, String(i + 1), x + 1, y - 3, '#ffffff', { align: 'center' });
        for (let s = 0; s < 3; s++) UI.text(g, '★', x - 9 + s * 7, y + 9, st[s] ? '#ffd36a' : '#3a3a3a', { font: 'default' });
      }
      const bi = Math.floor(this.bus), bf = this.bus - bi, a = pin(bi), b = pin(Math.min(4, bi + 1)), bx = lerp(a[0], b[0], bf), by = lerp(a[1], b[1], bf) - 10 + Math.abs(Math.sin(this.t * 8)) * -1;
      px.rect(g, bx - 9, by - 4, 18, 8, '#2f6b3a'); px.rect(g, bx - 9, by - 4, 18, 3, '#efe4c8'); px.rect(g, bx - 6, by - 3, 4, 2, '#9fd8f0'); px.rect(g, bx, by - 3, 4, 2, '#9fd8f0'); px.disc(g, bx - 5, by + 4, 2, '#1a1a1a'); px.disc(g, bx + 5, by + 4, 2, '#1a1a1a');
      // the chapter card
      const c = CHAPTERS[this.sel], G2 = GROUNDS[c.ground];
      UI.panel(g, 8, 8, Math.min(220, W - 16), 54);
      UI.text(g, 'CHAPTER ' + c.n + ': ' + c.title.toUpperCase(), 14, 14, UI.gold);
      UI.text(g, TEAMS[c.opp].name + ' at ' + G2.name, 14, 26, '#ffffff', { font: 'tiny' });
      c.goals.forEach(([label], i) => { const s = (Story.data.stars[c.n] || [])[i]; UI.text(g, (s ? '★ ' : '- ') + label, 14, 36 + i * 8, s ? '#ffd36a' : '#c8c0a8', { font: 'tiny' }); });
      E.font.title(g, 'THE GRAND KERFUFFLE', W / 2, H - 34, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#c8a040'], depth: 1 });
      if (this.menu) { this.menu.y = Math.round(H / 2); this.menu.draw(g, r); }
      UI.footer(g, r, game.input, this.menu ? [['confirm', 'SELECT'], ['cancel', 'BACK']] : [['left', 'CHAPTER'], ['confirm', 'PLAY'], ['cancel', 'TITLE']]);
    });
  }
};
/* ---- cutscenes ---- */
const PLACES = { green: { ground: 'green', at: [0, -560], sky: ['#ffb870', '#ffd8a0', '#fff0c8'], amb: .82 }, hall: { ground: 'hall', at: [-60, -530], peacock: [40, -510], sky: ['#9aa6b4', '#b8c2cc', '#cfd6dc'], amb: .8 }, bay: { ground: 'bay', at: [300, -420], sky: ['#3fb8ff', '#7fd4ff', '#bff0ff'], amb: .95 }, downs: { ground: 'downs', at: [300, -480], sky: ['#ffcf8a', '#ffe0b0', '#fff0d0'], amb: .85 }, dome: { ground: 'dome', at: [0, 820], sky: ['#05050f', '#0a0a1e', '#141030'], amb: .5 } };
scenes.cutscene = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    d = Object.assign({}, d);
    if (!SCENES[d.scene]) { d.scene = 'prologue'; if (!d.then && !d.next) d.next = { scene: 'title' }; }   // opened by a bare link: the prologue, then the title
    this.d = d; const S = SCENES[d.scene]; this.S = S; this.t = 0; this.hold = 0; this.done = false;
    K.game.setView(Views.v.story); Audio.music(S.place === 'dome' ? 'dome' : 'tea');
    const P = PLACES[S.place] || PLACES.green; this.P = P;
    this.cast = S.cast.map((id, i) => ({ id, rig: Cast.portraitOf((SPEAKERS[id] || {}).rig || id), x: P.at[0] + (i - (S.cast.length - 1) / 2) * 30, y: P.at[1] + (i % 2) * 10 }));
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', voice: null, bg: '#10201a', border: '#e8c060' });
    const lines = S.lines.slice(), next = () => {
      const l = lines.shift(); if (!l) { this.finish(); return; }
      const sp = SPEAKERS[l[0]] || SPEAKERS.aubrey; this.speaker = l[0];
      this.talk.say(l[1], { name: sp.name, portrait: Cast.portraitOf(sp.rig), portraitOpts: { zoom: 3, turn: .4 }, onDone: next }); Voice.say(l[1], sp.voice);
    };
    next();
    if (d.scene === 'prologue' || d.scene.endsWith('pre')) Audio.sting('chapter');
  },
  finish() { if (this.done) return; this.done = true; const d = this.d; if (d.then) d.then(); else if (d.next) game.go(d.next.scene, d.next.data || {}); else game.go('storymap'); },
  update(dt) {
    this.t += dt; const I = game.input, B = Ground.get(this.P.ground);
    if (I.down('confirm') || I.down('shot')) { this.hold += dt; if (this.hold >= 1) { this.talk.close(); this.finish(); return; } } else this.hold = 0;
    this.talk.update(dt);
    for (const c of this.cast) { const talking = this.speaker === c.id; c.rig._talk = talking && this.talk.open; c.rig.update(dt, { x: B.OX + c.x, y: B.OY + c.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t * .3 + c.x) * .2, expr: talking ? (c.id === 'thrumpton' ? 'angry' : 'smile') : null, pose: c.id === 'crumb' && talking ? 'hips' : null }); }
  },
  draw(r) {
    const B = Ground.get(this.P.ground), P = this.P, g = game;
    g.lights.enabled = true; g.lights.ambient = P.amb;
    r.sky(P.sky); B.map.drawFloor(r); B.map.queueWalls(r);
    for (const [id, x, y, f] of GROUNDS[P.ground].props) K.drawProp(r, id, B.OX + x, B.OY + y, f);
    for (const t of GROUNDS[P.ground].targets) if (t.shape) r.shape(t.shape, B.OX + t.at[0], B.OY + t.at[1], 0, { facing: t.face || 0 });
    if (this.S.props && this.S.props.includes('minibus')) r.shape('KERFUFFLE:minibus', B.OX + P.at[0] - 90, B.OY + P.at[1] + 20, 0, { facing: 0 });
    if (P.peacock) r.shape('KERFUFFLE:peacock', B.OX + P.peacock[0], B.OY + P.peacock[1], 0, { facing: Math.PI / 2 + Math.sin(game.time * .4) * .6 });
    if (this.S.props && this.S.props.includes('phantomCar')) r.shape('KERFUFFLE:phantomCar', B.OX + P.at[0] + 80, B.OY + P.at[1] + 30, 0, { facing: Math.PI });
    r.shape('KERFUFFLE:teaUrn', B.OX + P.at[0] - 60, B.OY + P.at[1] - 16, 0); r.shape('KERFUFFLE:cakeStand', B.OX + P.at[0] - 72, B.OY + P.at[1] - 16, 0); r.shape('KERFUFFLE:teapot', B.OX + P.at[0] - 48, B.OY + P.at[1] - 16, 0);
    if (P.ground === 'dome') { for (const [fx, fy] of [[-820, -380], [820, -380], [-820, 720], [820, 720]]) g.lights.add(B.OX + fx, B.OY + fy, 220, 1100, .75, { color: '#fff4dc' }); }
    for (const c of this.cast) { r.shadow(B.OX + c.x, B.OY + c.y, 5, .35); r.actor(B.OX + c.x, B.OY + c.y, 0, (gg, ox, oy) => c.rig.draw(gg, ox, oy, r.view), c.id === 'ghost' ? { alpha: .6 } : {}); }
    g.focus(B.OX + P.at[0], B.OY + P.at[1], 10);
    this.talk.draw(r);
    r.overlay(gg => { if (this.hold > 0) { const k = this.hold; for (let a = 0; a < TAU * k; a += .15) px.dot(gg, r.W - 20 + Math.cos(a - Math.PI / 2) * 8, 20 + Math.sin(a - Math.PI / 2) * 8, '#ffd36a'); } Glyphs.row(gg, r.W - 34, 32, game.input, [['confirm', 'HOLD TO SKIP']], { align: 'right', color: '#c8c0a8' }); if (this.d.scene === 'prologue' && this.t < 3) E.font.title(gg, 'THE GRAND KERFUFFLE', r.W / 2, 30, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#c8a040'], depth: 1 }); });
  }
};
K.Story = Story;

/* ---- 54-match.js ---- */
/* ---- THE MATCH SCENE: the toss, then the Match simulation stepped each update, the view and director, the HUD,
 * commentary and crowd; replays after big moments (Settings: Replays); the bowler picker and tea treats (cards);
 * story beats (a scene's lines on a modal dialog while play holds); and the hand-off to the results. Quick Match,
 * Versus, Story, Showdown, Nets, the attract mode and AI Hub rounds all run here, from a MatchConfig. ---- */
const Play = {
  m: null, cfg: null, toss: null, endT: 0, beats: [], talk: null, replayDone: {}, onEnd: null, lesson: null, extra: null, idleNudge: 0,
  /** start a match from a config (and hooks: onEnd(match), extra: a mode controller with step / draw / event) */
  begin(cfg, o = {}) {
    Tuning.difficulty = cfg.difficulty || K.settings('difficulty');
    cfg.fielding = cfg.fielding || K.settings('fielding'); cfg.running = cfg.running || K.settings('running');
    if (cfg.seed === undefined) cfg.seed = Math.floor(Math.random() * 1e9) || 1;   // (Math.random: random on a page, seeded under tests and in AI Hub sessions)
    const m = new Match(cfg); this.m = m; this.cfg = cfg; this.onEnd = o.onEnd || null; this.extra = o.extra || null; this.endT = 0; this.replayDone = {}; this.beats = (o.beats || []).slice(); this.idleNudge = 0;
    MatchView.attach(m); Commentary.attach(m); HUD.callouts = [];
    this.toss = cfg.toss && !cfg.scenario ? { phase: 'flip', t: 0, call: null, side: null, winner: null, choice: null, coin: 0 } : null;
    if (!this.toss) m.start();
    Audio.music(m.ground.music || 'green');
    Audio.layer('drums', 0); Audio.layer('fire', 0);
    if (m.weather === 'rain') K.game.weather = { kind: 'rain', amount: .6, wind: .2 };
    else if (m.ground.id === 'downs' && m.weather === 'clear') K.game.weather = { kind: 'sand', amount: .12, wind: .5 };
    else if (m.ground.id === 'green' || m.ground.id === 'hall') K.game.weather = { kind: 'leaves', amount: .08, wind: .3 };
    else K.game.weather = null;
    coverage.mark('ground:' + m.ground.id); if (m.timeOfDay === 'night') coverage.mark('night'); if (m.fog > 0) coverage.mark('fog');
    return m;
  },
  humans(m) { return [0, 1].flatMap(s => m.humansOf(s)); },
  /** the toss: captains on the square, a coin, "Call: HEADS / TAILS", then "BAT / BOWL" */
  stepToss(dt) {
    const T0 = this.toss, m = this.m, hs = [0, 1].filter(s => m.isHuman(s)), caller = hs.length ? hs[0] : 0, I = hs.length ? m.humansOf(caller)[0] : null;
    T0.t += dt;
    if (T0.phase === 'flip') {
      if (!I) { T0.call = RNG.play() < .5 ? 'heads' : 'tails'; T0.phase = 'spin'; T0.t = 0; }
      else if (I.pressed('shot') || I.pressed('confirm')) { I.consumeAll(); T0.call = 'heads'; T0.phase = 'spin'; T0.t = 0; K.sfx('coin'); Audio.sting('toss'); }
      else if (I.pressed('block') || I.pressed('cancel')) { I.consumeAll(); T0.call = 'tails'; T0.phase = 'spin'; T0.t = 0; K.sfx('coin'); Audio.sting('toss'); }
      else { const c = I.clicked && I.clicked(); if (c) { T0.call = c[0] < K.game.W / 2 ? 'heads' : 'tails'; T0.phase = 'spin'; T0.t = 0; K.sfx('coin'); } }
      if (T0.t > 12) { T0.call = 'heads'; T0.phase = 'spin'; T0.t = 0; }
    } else if (T0.phase === 'spin') {
      T0.coin += dt * 18;
      if (T0.t > 1.6) { const land = RNG.play() < .5 ? 'heads' : 'tails'; T0.land = land; T0.winner = land === T0.call ? caller : 1 - caller; T0.phase = 'choose'; T0.t = 0; K.sfx('coin'); }
    } else if (T0.phase === 'choose') {
      const WI = m.isHuman(T0.winner) ? m.humansOf(T0.winner)[0] : null;
      if (!WI) { if (T0.t > 1.4) { T0.choice = (m.weather === 'overcast' || m.ground.pitch.seam > 1.1) ? 'bowl' : 'bat'; T0.phase = 'done'; T0.t = 0; } }
      else if (WI.pressed('shot') || WI.pressed('confirm')) { WI.consumeAll(); T0.choice = 'bat'; T0.phase = 'done'; T0.t = 0; }
      else if (WI.pressed('block') || WI.pressed('cancel')) { WI.consumeAll(); T0.choice = 'bowl'; T0.phase = 'done'; T0.t = 0; }
      else { const c = WI.clicked && WI.clicked(); if (c) { T0.choice = c[0] < K.game.W / 2 ? 'bat' : 'bowl'; T0.phase = 'done'; T0.t = 0; } }
      if (T0.t > 14) { T0.choice = 'bat'; T0.phase = 'done'; T0.t = 0; }
    } else if (T0.phase === 'done' && T0.t > 1.2) {
      m.cfg.battingFirst = T0.choice === 'bat' ? T0.winner : 1 - T0.winner; this.toss = null; m.start(); coverage.mark('toss');
    }
  },
  drawToss(r) {
    const T0 = this.toss, m = this.m, hs = [0, 1].filter(s => m.isHuman(s)), I = hs.length ? m.humansOf(hs[0])[0] : K.game.input;
    r.overlay(g => {
      px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
      UI.text(g, 'THE TOSS', r.W / 2, 30, UI.gold, { align: 'center', scale: 2 });
      UI.text(g, m.teams[0].name + '  v  ' + m.teams[1].name, r.W / 2, 52, '#ffffff', { align: 'center' });
      const cx = r.W / 2, cy = r.H / 2 - 6, sq = T0.phase === 'spin' ? Math.abs(Math.cos(T0.coin)) : 1, up = T0.phase === 'spin' ? Math.sin(Math.min(1, T0.t / 1.6) * Math.PI) * 30 : 0, face = T0.phase === 'spin' ? (Math.cos(T0.coin) > 0 ? 'H' : 'T') : (T0.land || 'heads')[0].toUpperCase();
      px.ell(g, cx, cy - up, 14, Math.max(1, 14 * sq), '#8a6a1a'); px.ell(g, cx, cy - up, 12, Math.max(1, 12 * sq), '#e8c060');
      if (sq > .4) UI.text(g, face, cx + 1, cy - up - 3, '#6a4a10', { align: 'center' });
      if (T0.phase === 'flip') { UI.text(g, 'CALL IT', r.W / 2, cy + 30, '#ffffff', { align: 'center' }); Glyphs.row(g, r.W / 2, cy + 44, I, [['shot', 'HEADS'], ['block', 'TAILS']], { align: 'center' }); }
      if (T0.phase === 'choose' || T0.phase === 'done') {
        UI.text(g, (T0.land || '').toUpperCase() + '! ' + m.teams[T0.winner].name.toUpperCase() + ' WIN THE TOSS', r.W / 2, cy + 30, UI.gold, { align: 'center' });
        if (T0.phase === 'choose' && m.isHuman(T0.winner)) Glyphs.row(g, r.W / 2, cy + 46, m.humansOf(T0.winner)[0], [['shot', 'BAT'], ['block', 'BOWL']], { align: 'center' });
        if (T0.phase === 'done') UI.text(g, 'AND CHOOSE TO ' + T0.choice.toUpperCase(), r.W / 2, cy + 46, '#ffffff', { align: 'center' });
      }
    });
  },
  /** a story beat or tutorial card: lines on a modal dialog while the simulation holds */
  playLines(lines, done) {
    const talk = this.talk || (this.talk = new E.Dialog(K.game, { lines: 2, place: 'bottom', voice: null, bg: '#10201a', border: '#e8c060' }));
    const list = lines.slice(), next = () => { const l = list.shift(); if (!l) { if (done) done(); return; } const S = SPEAKERS[l[0]] || SPEAKERS.aubrey; talk.say(l[1], { name: S.name, portrait: Cast.portraitOf(S.rig), portraitOpts: { zoom: 3, turn: .4 }, onDone: next }); Voice.say(l[1], S.voice); };
    next();
  },
  update(dt) {
    const m = this.m; if (!m) return;
    if (this.talk && this.talk.update(dt)) { MatchView.updateRigs(dt * 0); return; }
    if (this.toss) { this.stepToss(dt); MatchView.updateRigs(dt); MatchView.direct(dt); Audio.tick(dt, m.ground.crowd); return; }
    // cards that take input: the bowler picker, tea treats
    if (m.phase === 'pickBowler') { const I = m.bowlerInput(); if (I && !m.cfg.cheat.autoBowl) { const C = HUD.pickCards || (HUD.pickCards = new UICards({ w: 84, h: 112 })); C.cards = m.pickOptions; const res = C.update(dt, I); if (res && res.pick !== undefined) m.pickBowler(res.pick); } }
    if (m.phase === 'inningsBreak' && m.treatPick) { const I = m.humansOf(m.sideOf(m.innings[0].bowl))[0]; if (I) { const C = HUD.teaCards || (HUD.teaCards = new UICards({ w: 96, h: 56 })); C.cards = TEA_TREATS; const res = C.update(dt, I); if (res && res.pick !== undefined) { this.applyTreat(TEA_TREATS[res.pick].id, m.sideOf(m.innings[0].bowl)); m.treatPick = false; } } else m.treatPick = false; }
    // the field special (held in the field: the special button in setup with a full meter and no bowling special ready)
    const wI = m.bowlerInput(); if (wI && m.phase === 'setup' && !m.cfg.cheat.autoBowl && wI.pressed('special') && !m.specialReady(m.bowlSide, 'bowl')) { if (m.fieldSpecial()) wI.consume('special'); }
    // a replay plays over a held simulation; any button skips it
    if (MatchView.replay) { const any = this.humans(m).some(I => I.pressed('shot') || I.pressed('confirm')); if (any || !this.humans(m).length && false) { MatchView.skipReplay(); m.hold = Math.min(m.hold, .2); } }
    const before = m.phase;
    if (this.extra && this.extra.pre) this.extra.pre(dt, m);
    m.step(dt);
    if (this.extra && this.extra.step) this.extra.step(dt, m);
    this.maybeReplay(m, before);
    MatchView.updateRigs(dt); MatchView.direct(dt);
    Commentary.step(dt); HUD.step(dt); Audio.tick(dt, m.ground.crowd);
    this.stepBeats(m);
    if (m.phase === 'done') {
      this.endT += dt;
      if (this.endT > 3.2 && !this.ended) { this.ended = true; const r = this.summary(m); if (this.onEnd) this.onEnd(m, r); else K.game.go('results', { m, r }); }
    } else this.ended = false;
  },
  /** replays after big moments: a six, a wicket, a screamer, a target, a special (Settings: Replays) */
  maybeReplay(m, before) {
    const set = K.settings('replays'); if (set === 'Never' || m.cfg.mode === 'hub' || m.cfg.mode === 'showdown' || (m.cfg.mode === 'attract' && !m.cfg.replays)) return;
    if (m.phase !== 'dead' || m.pt < (m.cur.wicket ? 1.9 : 1.6) || this.replayDone[m.time > 0 ? m.cur.over + ':' + m.cur.ballInOver + ':' + m.innNo : 0]) return;
    const big = m.cur.boundary === 6 || (m.cur.wicket && !m.decision) || m.cur.screamer || m.cur.bonus || m.cur.special || m.cur.batSpecial, any = set === 'Always' && (m.cur.contact || m.cur.wicket);
    if (!big && !any) return;
    this.replayDone[m.cur.over + ':' + m.cur.ballInOver + ':' + m.innNo] = true;
    if (MatchView.startReplay(m.cur.boundary === 6 ? 4.5 : 3.5, m.cur.boundary === 6 || m.cur.bonus ? 'wide' : 'broadcast')) m.hold = MatchView.replay.len / MatchView.replay.speed + .2;
    void before;
  },
  /** story beats: { on: 'innings:end' | 'over:end' | ..., when(m), lines, done } fired once */
  stepBeats(m) {
    for (const b of this.beats) {
      if (b.fired) continue;
      if (b.when(m)) { b.fired = true; m.hold = Math.max(m.hold, .1); this.playLines(SCENES[b.scene].lines, b.done); if (b.after) b.after(m); break; }
    }
  },
  applyTreat(id, side) {
    const m = this.m;
    if (id === 'sponge') m.addHype(side, 40, 'treat'); else if (id === 'tea') { m.flags.teaTime = 2; m.flags.teaSide = side; } else if (id === 'sandwich') m.flags.sandwich = side;
    m.treats[side].push(id); coverage.mark('treat:' + id);
  },
  /** the match's numbers for the results screen and the report */
  summary(m) {
    const res = m.result || {}, H = [0, 1].filter(s => m.isHuman(s)), humanTeam = H.length === 1 ? m.teams[H[0]].id : null;
    const won = humanTeam ? res.winner === humanTeam : null;
    let pom = null, pomScore = -1;
    for (const inn of m.innings) { if (inn.posted) continue; for (const [id, c] of Object.entries(inn.cards)) { const s = c.runs + c.sixes * 2 + (res.winner === inn.bat ? 5 : 0); if (s > pomScore) { pomScore = s; pom = id; } } for (const [id, c] of Object.entries(inn.bowlCards)) { const s = c.wkts * 18 - c.runs * .5 + (res.winner === inn.bowl ? 5 : 0); if (s > pomScore) { pomScore = s; pom = id; } } }
    return { won, humanTeam, pom, report: Report.write(m) };
  },
  draw(r) {
    const m = this.m; if (!m) return;
    MatchView.draw(r);
    if (this.toss) { this.drawToss(r); return; }
    HUD.draw(r);
    const card = this.extra && this.extra.lesson && this.extra.lesson.card && !this.extra.lesson.done;
    if (m.phase === 'intro' && m.cfg.mode !== 'nets') r.overlay(g => { UI.panel(g, r.W / 2 - 140, 40, 280, 40); UI.text(g, m.ground.name.toUpperCase(), r.W / 2, 48, UI.gold, { align: 'center' }); UI.text(g, m.teams[m.bat].name + ' to bat', r.W / 2, 62, '#ffffff', { align: 'center' }); });
    if (!(this.talk && this.talk.open) && !(K.dev && K.dev.isOpen) && !card) Commentary.draw(r);
    if (this.extra && this.extra.draw) this.extra.draw(r, m);
    if (this.talk && this.talk.open) this.talk.draw(r);
    if (m.phase === 'done') r.overlay(g => { UI.panel(g, r.W / 2 - 150, r.H / 2 - 30, 300, 44); UI.text(g, (m.result && m.result.text || '').toUpperCase(), r.W / 2, r.H / 2 - 18, UI.gold, { align: 'center' }); });
  }
};
/* ---- the Wisden-style report: 2-3 sentences picked by the shape of the result ---- */
const Report = {
  write(m) {
    const res = m.result || {}; if (!res.text) return '';
    const all = m.innings.filter(i => !i.posted), bats = [], bowls = [];
    for (const i of all) { for (const [id, c] of Object.entries(i.cards)) bats.push({ id, c, inn: i }); for (const [id, c] of Object.entries(i.bowlCards)) bowls.push({ id, c }); }
    bats.sort((a, b) => b.c.runs - a.c.runs); bowls.sort((a, b) => b.c.wkts - a.c.wkts || a.c.runs - b.c.runs);
    const tb = bats[0], tw = bowls[0], target = m.innings[1] ? m.innings[1].target : '';
    const vars = { winner: res.winner ? TEAMS[res.winner].name : 'Nobody', loser: res.loser ? TEAMS[res.loser].name : 'Everybody', target, topBat: tb ? playerById(tb.id).name : 'nobody', topRuns: tb ? tb.c.runs : 0, notOut: tb && !tb.c.out ? '*' : '',
      sixes: tb ? (tb.c.sixes === 0 ? 'not a six among them' : tb.c.sixes === 1 ? 'one six' : tb.c.sixes + ' sixes') : 'no sixes', targetLine: m.stats.targets.length ? ', one of them through ' + m.ground.targets.find(t => t.id === m.stats.targets[0]).label.toLowerCase() : '', chaosThing: m.stats.chaosThings[0] || 'a stray pigeon', collapse: 'a collapse of ' + (all.find(i => i.bat === res.loser) || {}).wkts + ' wickets',
      topBowl: tw ? playerById(tw.id).name : 'nobody', wkts: tw ? tw.c.wkts : 0, bruns: tw ? tw.c.runs : 0, margin: (res.text || '').replace(/^.* won by /, ''), hero: tb ? playerById(tb.id).name : 'the scorer' };
    const pool = res.tie || res.superOver ? REPORTS.tie : m.innings.some(i => i.revised) ? REPORTS.rain : REPORTS.win;
    const lost = (all.find(i => i.bat === res.loser) || {}).wkts || 0, second = pool === REPORTS.win ? (lost >= 3 ? pool[1] : pool[2]) : pool[1];
    const a = fill(pool[0], vars), b = second ? fill(second, vars) : '';
    return (a + ' ' + b).trim();
  }
};
K.Play = Play; K.Report = Report;

/* ---- 56-modes.js ---- */
/* ---- THE NETS AND THE SHOWDOWN.
 * Nets: Mrs Crumb's lessons (each checks its goal before moving on; 12 balls at most), free practice (the bowling
 * machine with a chosen delivery, or bowling at a dummy batter) and the Six Machine (12 balls; runs plus target
 * bonuses; a high-score table). Showdown: BAT (6 balls from the Thrumptonator 3000, a seeded mixed set ending with the
 * Triple Threat, 2 wickets; score = runs) or BOWL (defend 14 against Kev Malone; score = (14 - conceded) x 10 + 25 a
 * wicket), with E.Arcade tables and initials. The Showdown's BAT is the AI Hub round too. ---- */
const cab = new E.Arcade(game, { id: 'kerfuffle', lives: 1, hud: false });
K.cab = cab;
/** a lesson's controller: counts its goal from the bus, shows Mrs Crumb's card, ends after the goal or 12 balls */
function lessonExtra(list, then) {
  const st = { i: 0, count: 0, balls: 0, card: true, done: false, offs: [] };
  const L = () => LESSONS[list[st.i]];
  const listen = () => {
    st.offs.forEach(f => f()); st.offs = [];
    const on = (t, f) => st.offs.push(bus.on(t, d => { if (d.match !== Play.m) return; f(d); }));
    const goal = L().goal;
    on('bat:press', d => { if (goal === 'good' && (d.grade === 'perfect' || d.grade === 'good') && L().btn === 'shot') st.count++; });
    on('bat:contact', d => { if (goal === 'loft' && d.kind === 'clean' && d.family === 'loft') st.count++; if (goal === 'charge' && Play.m.cur.charged && d.kind === 'clean') st.count++; });
    on('ball:done', d => { st.balls++; if (goal === 'survive' && !d.rec.wicket) st.count++; if (goal === 'runs') st.count += d.rec.ran || 0; if (goal === 'aftertouch' && Math.abs(d.rec.aftertouch || 0) > .03) st.count++; if (goal === 'green' && d.rec.meter === 'green') st.count++; });
    on('special', () => { if (goal === 'special') st.count++; });
    on('wicket', d => { if (goal === 'catch' && d.how === 'caught') st.count++; });
    on('field:throw', () => { if (goal === 'throw') st.count++; });
    on('review:start', d => { if (goal === 'review' && d.kind !== 'third') st.count++; });
  };
  const setup = m => {
    const l = L(); st.count = 0; st.balls = 0; st.card = true;
    m.cfg.humans = { 0: [game.input] };   // Kerfuffle CC, batting or bowling as the lesson needs
    m.cfg.cheat = {};
    if (l.goal === 'special') m.hype[m.bowlSide] = 100;
    if (l.goal === 'review') m.cfg.cheat.lbwGiven = false;
    listen();
  };
  return {
    lesson: st,
    pre(dt, m) {
      if (st.done) return;
      if (!st.started) { st.started = true; setup(m); }
      const l = L();
      if (st.card) { m.hold = Math.max(m.hold, .05); const I = game.input; if (I.pressed('confirm') || I.pressed('shot') || (I.clicked && I.clicked())) { I.consumeAll(); st.card = false; K.sfx('confirm'); } return; }
      // keep the lesson's situation: the right side human, forced outcomes for the fielding lessons
      if (m.phase === 'setup' && m.pt < .02) {
        if (l.field) m.force.outcome = { kind: l.goal === 'catch' ? 'caughtHuman' : 'pushToField' };
        if (l.goal === 'review') { m.force.outcome = { kind: 'review' }; m.cfg.cheat.lbwGiven = false; }
        if (l.goal === 'special' && st.count === 0) m.hype[m.bowlSide] = 100;
      }
      if (st.count >= l.count || st.balls >= 12) {
        Story.data && (Story.data.lessons[list[st.i]] = true); Profile.data.lessons[list[st.i]] = true; Profile.save();
        st.i++; K.sfx('item');
        if (st.i >= list.length) { st.done = true; st.offs.forEach(f => f()); if (then) game.after(.1, then); else game.go('nets'); return; }
        const sameSide = !!(L().bowl || L().field) === !!(l.bowl || l.field);
        if (!sameSide) { m.innings[m.innNo].done = true; m.innings[m.innNo].end = 'lesson'; m.cfg.battingFirst = L().bowl || L().field ? 1 : 0; m.startInnings(0); }
        setup(m);
      }
    },
    draw(r, m) {
      if (st.done) return;
      const l = L();
      r.overlay(g => {
        if (st.card) {
          px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
          UI.panel(g, r.W / 2 - 160, 36, 320, 126);
          Cast.extra('crumb').drawPortrait(g, r.W / 2 - 152, 46, 40, { zoom: 3, turn: .3, bg: '#2a3a2a' });
          UI.text(g, 'LESSON ' + l.n + ': ' + l.title.toUpperCase(), r.W / 2 - 104, 46, UI.gold);
          UI.para(g, l.text, r.W / 2 - 104, 60, 258, '#ffffff');
          UI.text(g, '"Watch the ball, dear, not the cake."', r.W / 2, 146, '#c8c0a8', { align: 'center' });
          Glyphs.row(g, r.W / 2, 170, game.input, [['confirm', 'START']], { align: 'center' });
        } else {
          px.blend(g, .7, 'normal', () => px.rect(g, r.W / 2 - 90, 2, 180, 22, '#0c1410'));
          UI.text(g, 'LESSON ' + l.n + ': ' + l.title.toUpperCase(), r.W / 2, 4, UI.gold, { align: 'center', font: 'tiny' });
          UI.text(g, Math.min(st.count, l.count) + ' / ' + l.count + '   (BALL ' + (st.balls + 1) + ' OF 12)', r.W / 2, 13, '#ffffff', { align: 'center', font: 'tiny' });
        }
      });
    }
  };
}
/* forced outcomes the lessons use: a catch coming to a fielder for the human ring, a push into the field to throw */
const _forcedShot = AI.forcedShot;
AI.forcedShot = function (m, f, len, line) {
  if (f.kind === 'caughtHuman') { const r = _forcedShot.call(this, m, { kind: 'caught' }, len, line); m.cfg.cheat.catchesOnce = false; return r; }
  if (f.kind === 'pushToField') { m.flags.forceRun = 1; return _forcedShot.call(this, m, { kind: '1' }, len, line); }
  return _forcedShot.call(this, m, f, len, line);
};
scenes.nets = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    d = d || {}; Idle.reset();
    if (d.lessons) { this.run(d.lessons, d.then); return; }
    this.state = 'menu'; Audio.music('tea'); K.game.setView(Views.v.story);
    this.menu = new UIList({ w: 230, rowH: 17, y: 80, onBack: () => game.go('title'), items: [
      { label: 'LESSONS 1-6: BATTING AND BOWLING', act: () => this.run([1, 2, 3, 4, 5, 6]), help: 'Aim, ground shots, lofts, defending, running, charging, the meter.' },
      { label: 'LESSONS 7-11: THE ARCADE BITS', act: () => this.run([7, 8, 9, 10, 11]), help: 'Aftertouch, specials, the catch ring, throws and reviews.' },
      { label: 'FREE PRACTICE: BATTING', act: () => { this.state = 'pick'; }, help: 'The bowling machine bowls what you choose.' },
      { label: 'FREE PRACTICE: BOWLING', act: () => this.practice('bowl'), help: 'Bowl at a dummy batter who mostly defends.' },
      { label: 'THE SIX MACHINE', act: () => this.sixMachine(), help: '12 balls. Runs plus target bonuses. High scores.' },
      { label: 'BACK', act: () => game.go('title') }
    ] });
    this.del = 0; this.delList = Object.keys(DELIVERIES).filter(k => DELIVERIES[k].fam !== 'machine');
  },
  netsCfg(o) { return Object.assign({ mode: 'nets', teams: ['ker', 'mud'], ground: 'nets', overs: 50, wickets: 10, difficulty: K.settings('difficulty'), kerfuffleRules: true, humans: { 0: [game.input] }, toss: false, superOver: false, battingFirst: 0, commentary: true, tutorial: true }, o); },
  run(list, then) { const first = LESSONS[list[0]]; game.go('match', { cfg: this.netsCfg({ cheat: {}, battingFirst: first.bowl || first.field ? 1 : 0 }), hooks: { extra: lessonExtra(list, then), onEnd: () => game.go('nets') } }); },
  practice(role, del) {
    const cfg = this.netsCfg(role === 'bowl' ? { battingFirst: 1 } : {});
    const extra = { pre(dt, m) { if (del && m.phase === 'setup' && m.pt < .02) { m.force.delivery = null; m.cpuPlan = null; const D = DELIVERIES[del]; m.deliveryChoices = [del, del, del]; } if (role === 'bowl' && m.phase === 'setup' && m.pt < .02) m.cfg.cheat.dummy = true; }, draw(r) { r.overlay(g => { UI.text(g, role === 'bowl' ? 'FREE PRACTICE: BOWLING' : 'FREE PRACTICE: ' + (del ? DELIVERIES[del].name.toUpperCase() : 'MIXED'), r.W / 2, 4, UI.gold, { align: 'center', font: 'tiny' }); UI.text(g, 'PAUSE MENU TO QUIT', r.W / 2, 13, '#a8a090', { align: 'center', font: 'tiny' }); }); } };
    if (role !== 'bowl' && del) cfg.forceBowlerFamily = DELIVERIES[del].fam;
    game.go('match', { cfg, hooks: { extra, onEnd: () => game.go('nets') } });
  },
  sixMachine() {
    const cfg = this.netsCfg({ overs: 2, wickets: 10, kerfuffleRules: true, sixMachine: true });
    let balls = 0, score = 0;
    const extra = {
      pre(dt, m) { if (!m.sixInit) { m.sixInit = true; m.ground = Object.assign({}, m.ground, { targets: SIX_BOARDS }); } },
      step(dt, m) {},
      draw(r, m) { r.overlay(g => { px.blend(g, .75, 'normal', () => px.rect(g, r.W / 2 - 70, 2, 140, 22, '#0c1410')); UI.text(g, 'THE SIX MACHINE', r.W / 2, 4, UI.gold, { align: 'center', font: 'tiny' }); UI.text(g, 'BALL ' + Math.min(12, m.inn.balls + 1) + '/12   SCORE ' + m.inn.runs, r.W / 2, 13, '#ffffff', { align: 'center', font: 'tiny' }); }); }
    };
    void balls; void score;
    game.go('match', { cfg, hooks: { extra, onEnd: m => game.go('scores', { mode: 'sixmachine', score: m.innings[0].runs, back: 'nets' }) } });
  },
  update(dt) {
    const I = game.input; if (this.state === 'run') return;
    if (Idle.step(dt) > 10) { game.go('attract', { segment: K.attractNext || 0 }); return; }
    if (this.state === 'pick') {
      if (I.repeat('left', .3, .1)) this.del = (this.del + this.delList.length) % (this.delList.length + 1) - 0 || 0, this.del = (this.del - 1 + this.delList.length + 1) % (this.delList.length + 1);
      if (I.repeat('right', .3, .1)) this.del = (this.del + 1) % (this.delList.length + 1);
      if (I.pressed('confirm')) { I.consume('confirm'); this.practice('bat', this.del === 0 ? null : this.delList[this.del - 1]); }
      if (I.pressed('cancel')) { I.consume('cancel'); this.state = 'menu'; }
      return;
    }
    this.menu.update(dt, I);
  },
  back() { if (this.state === 'pick') { this.state = 'menu'; return true; } game.go('title'); return true; },
  draw(r) {
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06100a'));
      UI.text(g, 'THE NETS', r.W / 2, 14, UI.gold, { align: 'center', scale: 2 });
      Cast.extra('crumb').drawPortrait(g, 14, 14, 40, { zoom: 3, turn: .3, bg: '#2a3a2a' });
      if (this.state === 'pick') {
        const name = this.del === 0 ? 'MIXED (THE MACHINE CHOOSES)' : DELIVERIES[this.delList[this.del - 1]].name.toUpperCase() + ' - ' + FAMILY[DELIVERIES[this.delList[this.del - 1]].fam].label;
        UI.panel(g, r.W / 2 - 130, 80, 260, 50); UI.text(g, 'THE BOWLING MACHINE BOWLS:', r.W / 2, 88, '#c8c0a8', { align: 'center' }); UI.text(g, '← ' + name + ' →', r.W / 2, 106, '#ffffff', { align: 'center' });
        UI.footer(g, r, game.input, [['left', 'DELIVERY'], ['confirm', 'START'], ['cancel', 'BACK']]);
        return;
      }
      this.menu.draw(g, r); UI.footer(g, r, game.input, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
const SIX_BOARDS = [[-260, 460, 40], [0, 560, 60], [260, 460, 40], [-420, 200, 30], [420, 200, 30], [0, 380, 90]].map(([x, y, z], i) => ({ id: 'board' + i, label: 'BOARD ' + (i + 1), at: [x, y, z], size: [44, 10, 30], bonus: [4, 6, 4, 3, 3, 8][i], line: 'six', fx: 'spark', shape: 'KERFUFFLE:adBoard', face: Math.PI / 2 }));
/* ---- the showdown ---- */
const SHOWDOWN_BALLS = [{ id: 'piston', target: [-3, 90] }, { id: 'steamBouncer', target: [-2, 175] }, { id: 'piston', target: [0, 22], kmh: 158 }, { id: 'piston', target: [-4, 70], kmh: 112, slower: true }, { id: 'piston', target: [10, 60], kmh: 128, swing: 3 }, { id: 'piston', special: 'triple', target: [0, 80] }];
function showdownBat(o = {}) {
  const cfg = { mode: o.hub ? 'hub' : 'showdown', teams: ['ker', 'thr'], ground: 'dome', overs: 1, wickets: 2, difficulty: o.hub ? 'county' : K.settings('difficulty'), kerfuffleRules: true, humans: { 0: o.inputs || [game.input] }, toss: false, battingFirst: 0, superOver: false, timeOfDay: 'night', weather: 'clear', seed: o.seed || 7 };
  const balls = o.balls || SHOWDOWN_BALLS;
  const extra = { pre(dt, m) { if (m.phase === 'setup' && m.pt < .02 && m.inn) { const b = balls[Math.min(balls.length - 1, m.inn.balls)]; m.force.delivery = Object.assign({ grade: 'green' }, b); } }, draw: o.draw };
  return { cfg, extra };
}
scenes.showdown = {
  view: 'threequarter', camera: { zoom: false },
  enter() {
    Idle.reset(); Audio.music('showdown'); K.game.setView(Views.v.story);
    this.menu = new UIList({ w: 230, rowH: 18, y: 96, onBack: () => game.go('title'), items: [
      { label: 'BAT: FACE THE THRUMPTONATOR', act: () => { const s = showdownBat(); game.go('match', { cfg: s.cfg, hooks: { extra: s.extra, onEnd: m => game.go('scores', { mode: 'bat', score: m.innings[0].runs, back: 'showdown' }) } }); }, help: 'Six balls of steam and spite, two wickets. Score: runs.' },
      { label: 'BOWL: DEFEND 14 AGAINST KEV', act: () => this.bowl(), help: 'Kev "Thongs" Malone needs 15. Score: (14 - runs) x 10 + 25 a wicket.' },
      { label: 'HIGH SCORES', act: () => game.go('scores', { mode: 'bat', back: 'showdown', view: true }) },
      { label: 'BACK', act: () => game.go('title') }
    ] });
  },
  bowl() {
    const cfg = { mode: 'showdown', showdownBowl: true, teams: ['lar', 'ker'], ground: 'dome', overs: 1, wickets: 2, difficulty: K.settings('difficulty'), kerfuffleRules: true, humans: { 1: [game.input] }, toss: false, battingFirst: 0, superOver: false, timeOfDay: 'night', weather: 'clear', scenario: { innings: 1, battingFirst: 1, firstRuns: 14, firstWkts: 0 } };
    const lar = TEAMS.lar; lar.order = [lar.players.find(p => p.id === 'kev')].concat(lar.order.filter(p => p.id !== 'kev'));
    cfg.scenario.battingFirst = 1;
    game.go('match', { cfg, hooks: { onEnd: m => { const i = m.innings[1]; game.go('scores', { mode: 'bowl', score: Math.max(0, (14 - i.runs) * 10 + i.wkts * 25), back: 'showdown' }); } } });
  },
  update(dt) { if (Idle.step(dt) > 10) { game.go('attract', { segment: K.attractNext || 0 }); return; } this.menu.update(dt, game.input); },
  back() { game.go('title'); return true; },
  draw(r) {
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    r.overlay(g => { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0618')); E.font.title(g, 'SUPER OVER SHOWDOWN', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#ffffff', '#c8a0ff', '#7a3aff'], depth: 2 }); UI.text(g, 'THE THRUMPTON MEGADOME - MIDNIGHT', r.W / 2, 40, '#ffcf3a', { align: 'center' }); this.menu.draw(g, r); UI.footer(g, r, game.input, [['confirm', 'SELECT'], ['cancel', 'BACK']]); });
  }
};
/* ---- high scores: initials on a letter wheel, then the table ---- */
scenes.scores = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; Idle.reset(); this.entering = false; if (!d.view && d.score !== undefined && cab.qualifies(d.score, d.mode)) { this.entering = true; cab.enter(d.score, d.mode, () => { this.entering = false; }); } },
  update(dt) {
    this.t += dt; cab.update(dt); if (this.entering) return;
    const I = game.input; if (this.t > .8 && (I.pressed('confirm') || I.pressed('cancel') || (I.clicked && I.clicked()))) { I.consumeAll(); game.go(this.d.back || 'title'); }
  },
  draw(r) {
    r.sky(['#0a0618', '#1a1040', '#2a1a5a']);
    r.overlay(g => { E.font.title(g, { bat: 'SHOWDOWN: BAT', bowl: 'SHOWDOWN: BOWL', sixmachine: 'THE SIX MACHINE' }[this.d.mode] || 'HIGH SCORES', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#ffffff', '#ffd36a', '#c8a040'] }); if (this.d.score !== undefined && !this.d.view) UI.text(g, 'YOUR SCORE: ' + this.d.score, r.W / 2, 34, '#ffffff', { align: 'center' }); });
    if (!this.entering) cab.drawTable(r, this.d.mode, 50, 'TOP TEN');
    cab.draw(r);
    r.overlay(g => { if (!this.entering) UI.footer(g, r, game.input, [['confirm', 'CONTINUE']]); });
  }
};
K.showdownBat = showdownBat; K.SHOWDOWN_BALLS = SHOWDOWN_BALLS;

/* ---- 58-about.js ---- */
/* ---- ABOUT / CREDITS: Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, exactly as the
 * builder reports them in the chat reply and exit-interview.json, plus the credits. Paged (left / right), one topic
 * per page. ---- */
const ABOUT_INFO = {
  date: '2026-11-04 06:21:25',
  source: 'Cricket (over-the-top arcade style)',
  plan: 'PLAN.md',
  genre: 'Arcade sports (cricket) with a comedy story campaign',
  perspective: '2.5D projected 3D: a telephoto TV broadcast camera behind the bowler for every delivery, a high wide camera following the ball, a side-on review camera and a close-up camera; three-quarter view for the story scenes',
  tech: 'my-3D2dge v0.85.2 (full engine, modified: see engine/CHANGES-KERFUFFLE.md), AI Hub Session Protocol v1 client 1.4.0, plain JavaScript, Web Audio; tests on Node 24 and Playwright 1.63.0',
  artDirection: "The engine's HD Humanoid pixel style at 320x240 expanded, canvas lighting, with new cricket assets (a KERFUFFLE shape set of 40 objects and 42 materials: stumps, pavilion, pub, greenhouse, church, Ferris wheel, jumbotron, the Thrumptonator, Doris the cow and more), five grounds painted from recipes and far-end panoramas",
  animation: "The engine's procedural Humanoid rigs driven by cricket attack specs (vertical-plane strokes, a windmill bowling arm), poses, a solvePose wrapper for umpire signals, and a two-handed bat grip added to the engine",
  audio: 'All code: chip-synth music (10 original songs with Hype and ON FIRE layers, 11 stings), synthesized SFX, a crowd engine (murmur, applause, formant roars and a KER-FUF-FLE chant) and Animalese-style gibberish formant voices',
  online: 'AI Hub Session Protocol v1, parallel mode: a Super Over Showdown for 1-4 players with the game\'s own card; local multiplayer for 1-4 on one screen',
  testing: 'Headless engine (game.advance, game.debug) in Node vm contexts, scripted playthroughs and bot matches, Playwright checks and screenshots in Chromium, WebKit and Firefox (a controller on the Gamepad API, an emulated iPhone), the AI Hub harness',
  research: 'None beyond the provided materials: the plan, the engine handoff docs and kits, and the AI Hub README and harness',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
  usage: 'Session time about 4 h 25 min by the system clock (06:21 to about 10:45); tokens and cost unknown'
};
const FEEDBACK = {
  "testing": [
    "About 47 issues across 24 suites (600 checks), the screenshot reviews and the engine's check tool: a delivery solver off by up to 3 units, a catch ring judged 20 ms before the catch, a run counted when both batters were sent back, a keeper also picked to bowl, a held advert or tea-tray pause that never counted down, Doris the cow shooing fielders off a ball resting by her, a result that ignored the Kerfuffle Method's revised target, throws from behind the stumps scored as missed shies, the toss screen crashing, a jumbotron covering tall screens, forced sixes hit twice the rope's distance, callouts drawn over each other, dev mode's Space switching tab and then running the new tab's first row, Escape opening the pause menu over dev mode, a dev-panel row that did nothing, the nets and attract songs missing their Hype and ON FIRE music layers (the engine warned, but the test contexts had silenced warnings; now any warning fails a suite), the hub-round and story-scene links crashing when opened without their data, an About answer taller than its screen, Quick Match's team rows doing nothing with two teams unlocked, a Highlights button with nothing to replay, the touch-only gate missing on iPhones whose WebKit reports no touch points, and more.",
    "About 8 were game-breaking: the two stalls (the pause that never ended and the cow), the keeper bowling to himself, runs counted for a batter sent back, the rain-rule result, the uncatchable catch ring, the toss crash, and the ball leaving the bowler's hand mid run-up.",
    "The bot-campaign suite: the whole story played by the autopilot, chapter by chapter with retries. It found the Kerfuffle Method result bug, the difficulty multipliers handicapping the player's own autopilot, non-deterministic match seeds, and a chapter too steep to win.",
    "The resolver-table rows in unit-shots: they restate the data table back to itself and never failed. Close behind, my first deep-link sweep: headless, the game boots its first scene before it reads the link, so every link stayed on the title and the sweep passed while testing nothing; it now goes through the router and fails when a guard is removed."
  ],
  "engine": [
    "The Humanoid rig and its attack specs: vertical-plane swings gave straight-bat strokes and the bowling windmill without hand-made animation. Close behind: shapes as data with asset-sheet's contact sheets, and exact headless runs with game.advance.",
    "Yes, a few times: game.go clears timers, so a deep link scheduled before the first scene never fired; palm and cactus are props, not shapes; the pixel font lacks the middle dot and ellipsis; and since draw doesn't run headless, mouse layouts computed only while drawing were missing in tests.",
    "The cricket simulation itself: ball physics with an exact predictor, the shot resolver and timing model, fielders' interception, catches and throws, running between wickets, LBW truth with Owl-Eye and the review system, plus the TV camera director and the painted far-end panorama.",
    "Reading depth in the low orthographic broadcast camera: a ball coming at the viewer has no perspective, so the shadow, pitch marker and trail have to carry it. A telephoto lens's far stands had to be faked with a painted panorama, and objects behind the camera culled by hand.",
    "Six changes, logged in engine/CHANGES-KERFUFFLE.md: (1) a cricket bat weapon with a two-handed grip, because the rig only had swords, guns and staffs; (2) pads, brim hats, helmet grilles, keeper gloves, moustaches and spectacles, for cricket kit and characters; (3) a voice bus and Voices volume, so the gibberish voices and crowd follow the player's volumes; (4) PlayStation button symbols by default, Xbox the option, as TASK.md asks; (5) Create + Options left to the AI Hub; (6) ten floor bakes kept instead of six, so the match cameras never re-bake.",
    "A perspective (telephoto) ground camera, or near-plane culling for the orthographic views: every sports or racing game wants the camera behind the action looking down a long axis."
  ],
  "prompt": [
    "The definition of done: a feature-complete vertical slice, a scripted full playthrough, an attract mode and dev mode. Those requirements forced the game to be robust, not just a demo of one match.",
    "How far the plan binds: its folder names carried another model's suffix, and some of its numbers (a 30-run chase, fielders at 15 m) needed retuning once played. TASK.md winning settled the names, not the numbers. And Online links only the hub, while multiplayer must also work for the game on its own.",
    "Scope: five grounds, six teams, a five-chapter story, eleven lessons, AI Hub sessions, local multiplayer, an attract showreel and dev mode, all complete with no stubs, plus making cricket's depth readable in an orthographic camera.",
    "Give a priority order for when the plan's content outruns the time, say the plan's numbers are starting values to tune, and supply token and cost figures so the Usage field can be filled."
  ]
};
const ABOUT = [];
function buildAbout() {
  const A = ABOUT_INFO; ABOUT.length = 0;
  ABOUT.push({ title: 'SOURCE INFORMATION', lines: [['Date', A.date], ['Source', A.source], ['Plan', A.plan], ['Genre and Perspective', A.genre + '. ' + A.perspective], ['Model', A.model], ['Environment', A.environment], ['Usage', A.usage]] });
  ABOUT.push({ title: 'TECH AND ENGINE', lines: [['Tech', A.tech], ['Engine changes', 'A cricket bat weapon with a two-handed grip; pads, brim hats, helmet grilles, keeper gloves, moustaches and spectacles; a voice bus and Voices volume; PlayStation button symbols by default with Xbox as the option; Create + Options left to the AI Hub; ten floor bakes kept instead of six.'], ['Research', A.research]] });
  ABOUT.push({ title: 'ART, ANIMATION, AUDIO', lines: [['Art Direction', A.artDirection], ['Animation', A.animation], ['Audio', A.audio]] });
  ABOUT.push({ title: 'ONLINE AND TESTING', lines: [['Online', A.online], ['Testing', A.testing]] });
  const q = (title, qs, ans) => ABOUT.push({ title, lines: qs.map((qq, i) => [qq, ans[i] || 'unknown']) });
  q('TESTING FEEDBACK', ['How many issues did testing catch?', 'How many were critical / game breaking?', 'The most helpful test', 'The least helpful test'], FEEDBACK.testing);
  q('ENGINE FEEDBACK', ['What I liked most', 'Did I get stuck or guess wrong?', 'The most important thing I built myself', 'The hardest part', 'What I changed in the engine, and why', 'One thing I would change'], FEEDBACK.engine);
  q('PROMPT FEEDBACK', ['What I liked most', 'What was confusing', 'The hardest thing to do', 'What I would change'], FEEDBACK.prompt);
  ABOUT.push({ title: 'CREDITS', lines: [['CRICKET KERFUFFLE', 'Design, code, art, music, sound and words: Claude (Anthropic claude-opus-5-5), from PLAN.md.'], ['Engine', 'my-3D2dge v0.85.2 by Michael Crosato (MIT), with the changes listed on page 2.'], ['Online', 'AI Hub session client 1.4.0 by Michael Crosato.'], ['Assets', 'Everything original and drawn or synthesized in code. Engine core shapes (tree, pine, palm, bench, cactus, rock) from the engine\'s own library; no store sets were needed.'], ['Thanks', 'To Doris, who has seen it all, and to the Reverend Hollis, who has seen very little of it.']] });
}
buildAbout();
K.ABOUT_INFO = ABOUT_INFO; K.FEEDBACK = FEEDBACK; K.buildAbout = buildAbout; K.ABOUT = ABOUT;

/* ---- 60-hub.js ---- */
/* ---- AI HUB SESSIONS (Session Protocol v1, client 1.4.0, parallel mode): every player bats the same over from the
 * Thrumptonator 3000 at the Megadome (deliveries from AIHub.rng('over')), most runs wins. No title, menus or prompts
 * before the round: our own card (the Megadome at night, the players in their seat colours with READY ticks, the goal,
 * this player's controls in their device's glyphs, the time left; Ready = Cross / Enter / a click, More time =
 * Triangle / T / a click). ready() is called as soon as the round is built. Progress after every ball, one result,
 * an immediate result on time-up, and on end: no input, no sound, the scene frozen. Never send(); no storage; no
 * alert, confirm, prompt or window.open. Outside a session nothing here runs. ---- */
const Hub = {
  info: null, card: null, phase: 'connect', started: false, sent: { progress: 0, result: 0 }, ended: false, endReason: null, balls: null, readyAnswered: false, more: false,
  async connect() {
    const A = window.AIHub;
    let info = null;
    try { info = await A.connect({ mode: 'parallel', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) { game.hubActive = false; game.go('title'); return; }
    this.info = info; this.phase = 'card';
    // the round, from the shared seed: six deliveries for every copy
    const R = A.rng('over'), pick = list => list[Math.floor(R() * list.length) % list.length];
    this.balls = [0, 1, 2, 3, 4, 5].map(i => i === 5 ? { id: 'piston', special: 'triple', target: [0, 80] } : pick([{ id: 'piston', target: [Math.round((R() - .5) * 10), 70 + Math.round(R() * 40)] }, { id: 'steamBouncer', target: [Math.round((R() - .5) * 6), 160 + Math.round(R() * 20)] }, { id: 'piston', target: [0, 20 + Math.round(R() * 6)], kmh: 156 }, { id: 'piston', target: [-4, 70], kmh: 112 }, { id: 'piston', target: [10, 60], kmh: 128 }]));
    A.on('card', c => { this.card = c; });
    A.on('start', () => { this.phase = 'countdown'; this.startRound(); });
    A.on('time-up', () => { if (!this.sent.result) this.sendResult(); });
    A.on('end', e => { this.ended = true; this.endReason = e && e.reason; this.phase = 'ended'; try { game.input.clear(); } catch (er) { /* off */ } Audio.stopAll(); });
    A.ready();
  },
  startRound() {
    const s = showdownBat({ hub: true, balls: this.balls, inputs: [game.input], seed: (this.info && this.info.seed) || 7 });
    Hub.round = s; game.go('hubround', {}, { fade: 0 });
  },
  canBowl() { const A = window.AIHub; return !A || !A.active || A.time() >= 0; },
  progress(m) { const i = m.innings[0]; if (!i || this.ended) return; this.sent.progress++; try { window.AIHub.progress({ score: i.runs, label: i.runs + '/' + i.wkts + ' (' + i.balls + ' balls)' }); } catch (e) { /* hub */ } },
  sendResult() {
    if (this.sent.result || this.ended) return; this.sent.result = 1;
    const m = Play.m, i = m && m.innings[0], runs = i ? i.runs : 0;
    const best = i ? i.recs.filter(r => r.contact && r.shot).sort((a, b) => (b.runs || 0) - (a.runs || 0))[0] : null;
    try { window.AIHub.result({ score: runs, stats: { boundaries: i ? i.fours + i.sixes : 0, sixes: i ? i.sixes : 0, 'best shot': best && SHOTS[best.shot] ? SHOTS[best.shot].name : 'none' } }); } catch (e) { /* hub */ }
  }
};
K.Hub = Hub; K.hub = Hub;
scenes.hubcard = {
  view: 'threequarter', camera: { zoom: false },
  enter() { this.t = 0; K.game.setView(Views.v.wide); if (!Hub.info && Hub.phase === 'connect') Hub.connect(); this.crowdR = window.AIHub && window.AIHub.rng ? window.AIHub.rng('card') : () => .5; },
  update(dt) {
    this.t += dt; if (Hub.ended) return;
    const I = game.input, A = window.AIHub; if (!A || Hub.phase !== 'card') return;
    const c = I.clicked && I.clicked(), L = this.btns || {};
    const inB = b => b && c && c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3];
    if (I.pressed('confirm') || I.pressed('shot') || inB(L.ready)) { I.consumeAll(); A.answer('ready'); Hub.readyAnswered = true; K.sfx('confirm'); }
    if (I.pressed('special') || inB(L.more)) { I.consumeAll(); A.answer('more'); Hub.more = !Hub.more; K.sfx('select'); }
  },
  draw(r) {
    const B = Ground.get('dome'), g = game;
    g.lights.enabled = true; g.lights.ambient = .45;
    for (const [fx, fy] of [[-820, -380], [820, -380], [-820, 720], [820, 720]]) g.lights.add(B.OX + fx, B.OY + fy, 220, 1100, .75, { color: '#fff4dc' });
    r.sky(['#05050f', '#0a0a1e', '#141030']); B.map.drawFloor(r); B.map.queueWalls(r);
    r.shape('KERFUFFLE:thrumptonator', B.OX, B.OY + 330, 0, { facing: -Math.PI / 2, params: { angle: Math.floor(this.t * 4) % 16 } });
    r.shape('KERFUFFLE:stumps', B.OX, B.OY, 0, { facing: Math.PI / 2 });
    for (const t of GROUNDS.dome.targets) if (t.shape) r.shape(t.shape, B.OX + t.at[0], B.OY + t.at[1], 0, { facing: t.face || 0 });
    g.focus(B.OX, B.OY + 200, 0);
    const info = Hub.info, card = Hub.card || {}, I = g.input;
    r.overlay(gg => {
      px.blend(gg, .55, 'normal', () => px.rect(gg, 0, 0, r.W, r.H, '#05040c'));
      E.font.title(gg, 'CRICKET KERFUFFLE', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#5ab04a'], depth: 1 });
      UI.text(gg, 'SUPER OVER SHOWDOWN AT THE MEGADOME', r.W / 2, 30, '#c8a0ff', { align: 'center' });
      UI.text(gg, 'MOST RUNS FROM ONE OVER WINS', r.W / 2, 44, UI.gold, { align: 'center', scale: 1 });
      UI.text(gg, '6 balls from the Thrumptonator 3000 - 2 wickets', r.W / 2, 56, '#ffffff', { align: 'center' });
      const players = info ? info.players : [];
      players.forEach((p, i) => { const x = r.W / 2 - players.length * 40 + i * 80, y = 72, ready = (card.ready || []).includes(p.id); px.rect(gg, x, y, 76, 26, p.color); px.rect(gg, x + 1, y + 1, 74, 24, '#10101a'); UI.text(gg, String(p.name || 'Player').slice(0, 11), x + 38, y + 4, p.color, { align: 'center' }); UI.text(gg, ready ? 'READY!' : '...', x + 38, y + 15, ready ? '#6aff8a' : '#a8a8a8', { align: 'center' }); if (info && p.id === info.me) px.rect(gg, x, y + 26, 76, 2, '#ffffff'); });
      Glyphs.row(gg, r.W / 2, 112, I, [['aim', 'AIM'], ['shot', 'HIT'], ['loft', 'LOFT'], ['block', 'DEFEND'], ['run', 'RUN']], { align: 'center' });
      const left = card.left, status = card.starting ? 'STARTING...' : card.paused ? 'PAUSED: MOST PLAYERS WANT MORE TIME' : left !== null && left !== undefined ? 'STARTS IN ' + Math.ceil(left / 1000) + 's' : 'GET READY';
      UI.text(gg, status, r.W / 2, 132, '#ffffff', { align: 'center' });
      const bw = 90, by = 150; this.btns = { ready: [r.W / 2 - bw - 6, by, bw, 22], more: [r.W / 2 + 6, by, bw, 22] };
      px.rect(gg, ...this.btns.ready, Hub.readyAnswered ? '#2a6a3a' : '#3a8a4a'); Glyphs.draw(gg, this.btns.ready[0] + 4, by + 6, I, 'confirm'); UI.text(gg, 'READY', this.btns.ready[0] + 56, by + 7, '#ffffff', { align: 'center' });
      px.rect(gg, ...this.btns.more, card.asked ? '#6a4a8a' : '#4a3a6a'); Glyphs.draw(gg, this.btns.more[0] + 4, by + 6, I, 'special'); UI.text(gg, card.asked ? 'ASKED' : 'MORE TIME', this.btns.more[0] + 56, by + 7, '#ffffff', { align: 'center' });
      if (Hub.ended) { px.rect(gg, 0, r.H / 2 - 14, r.W, 28, '#000000'); UI.text(gg, Hub.endReason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER', r.W / 2, r.H / 2 - 6, '#ffffff', { align: 'center', scale: 2 }); }
    });
  }
};
scenes.hubround = {
  pausable: true, view: 'threequarter', camera: { zoom: false },
  enter() {
    const s = Hub.round; this.t = 0; this.done = false; this.off = null; this.none = !s;
    // no round to play (opened by a link, not by the session): back to the session's card, or the title outside one
    if (!s) { game.after(0, () => game.go(window.AIHub && Hub.phase !== 'connect' ? 'hubcard' : 'title', {}, { fade: 0 })); return; }
    Play.begin(s.cfg, { extra: Object.assign({}, s.extra, { draw: r => this.countdown(r) }), onEnd: () => { this.done = true; Hub.sendResult(); } });
    Hub.progress(Play.m);
    this.off = bus.on('ball:done', d => { if (d.match === Play.m) Hub.progress(Play.m); });
  },
  exit() { if (this.off) this.off(); },
  update(dt) {
    if (Hub.ended || this.none) return;
    const m = Play.m;
    if (!this.done) Play.update(dt);
    if (m && m.innings[0] && m.innings[0].done && !Hub.sent.result) Hub.sendResult();
    if (m && m.phase === 'done' && !Hub.sent.result) Hub.sendResult();
  },
  countdown(r) {
    const A = window.AIHub, t = A && A.time ? A.time() : 0;
    r.overlay(g => {
      if (t < 0) { const n = Math.ceil(-t / 1000); E.font.title(g, n > 0 ? String(n) : 'PLAY!', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 4, colors: ['#ffffff', '#ffd36a', '#c8402a'] }); }
      else if (t < 900) E.font.title(g, 'PLAY!', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 4, colors: ['#ffffff', '#6aff8a', '#2a8a3a'] });
      if (Hub.sent.result && !Hub.ended) { px.rect(g, 0, r.H / 2 + 20, r.W, 20, '#000000'); UI.text(g, 'WAITING FOR THE OTHERS...', r.W / 2, r.H / 2 + 26, '#ffffff', { align: 'center' }); }
      if (Hub.ended) { px.rect(g, 0, r.H / 2 - 14, r.W, 28, '#000000'); UI.text(g, Hub.endReason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER', r.W / 2, r.H / 2 - 6, '#ffffff', { align: 'center', scale: 2 }); }
    });
  },
  draw(r) { if (this.none) { r.sky(['#05050f', '#0a0a1e', '#141030']); return; } Play.draw(r); }
};

/* ---- 70-dev.js ---- */
/* ---- DEV MODE: a full-screen 10-foot panel over the frozen game, reached from the pause menu's Dev Mode (every
 * pausable scene) or the Backquote key; hidden in AI Hub sessions. Tabs (L1 / R1, Tab, or a click): TUNING (live
 * sliders against their defaults, "Reset all to defaults" first), TOGGLES (overlays, play cheats, overrides), JUMP
 * (story chapters, match flow, set the score, force the next delivery / outcome / review / rain / chaos / item, a
 * Super Over, attract segments, the jukebox, unlock all, reset save) and INFO (the snapshot, seeds, versions, the
 * last bus events and commentary lines, the floor bakes). Up / down (or hover) picks a row, left / right adjusts
 * (held: faster; the mouse drags a slider's knob, the wheel scrolls), Cross toggles or runs, Triangle resets the row,
 * Circle closes. Values apply at once; a DEV badge shows on the HUD while any tuning differs from its default. ---- */
const DEV_TABS = ['TUNING', 'TOGGLES', 'JUMP', 'INFO'];
const Dev = {
  isOpen: false, tab: 0, row: 0, scroll: 0, held: 0, t: 0, confirmReset: 0, toggles: {}, score: { runs: 0, wkts: 0 }, sel: { ch: 1, beat: 0, del: 0, out: 0, chaos: 0, item: 0, seg: 0, song: 0 },
  // while the panel is open its scene can't pause (Escape is the panel's back key, not the pause menu's); the lock waits a
  // moment so the engine's pause screen, opened to reach the Dev Mode item, has closed first
  open() { if (HUB) return; this.isOpen = true; this.t = 0; try { game.resume(); } catch (e) { game.paused = false; } game.paused = false; this.scene = game.scene; this.restorePause = false; game.input.consumeAll(); K.sfx('pause'); coverage.mark('dev'); },
  close() { this.isOpen = false; if (this.restorePause && this.scene) this.scene.pausable = true; this.restorePause = false; game.input.consumeAll(); K.sfx('cancel'); },
  toggle() { if (this.isOpen) this.close(); else this.open(); },
  m() { return Play.m; },
  /** the rows of the current tab: { label, value(), left(), right(), act(), reset() } */
  rows() {
    const m = this.m(), self = this;
    if (this.tab === 0) return [{ label: 'RESET ALL TO DEFAULTS', act: () => { Tuning.resetAll(); Views.rebuild('broadcast'); Views.rebuild('wide'); K.sfx('confirm'); } }].concat(Tuning.defs.map(d => ({ label: d.label, slider: d, value: () => fmtNum(Tuning.raw(d.key), d.step) + '  (' + fmtNum(d.def, d.step) + ')', left: k => this.nudge(d, -k), right: k => this.nudge(d, k), reset: () => { Tuning.reset(d.key); this.after(d.key); } })));
    if (this.tab === 1) {
      const tg = (key, label, fn) => ({ label, value: () => (this.toggles[key] ? 'ON' : 'OFF'), act: () => { this.toggles[key] = !this.toggles[key]; this.applyToggles(); if (fn) fn(this.toggles[key]); } });
      const cyc = (label, list, get, set) => ({ label, value: () => get() || 'default', left: () => { const i = list.indexOf(get()); set(list[(i - 1 + list.length) % list.length]); }, right: () => { const i = list.indexOf(get()); set(list[(i + 1) % list.length]); } });
      return [tg('hitboxes', 'Show hitboxes and zones'), tg('trajectory', 'Show the trajectory (Owl-Eye)'), tg('intent', 'Show AI intent'), tg('assign', 'Show fielder assignments'), tg('skeleton', 'Skeleton overlay'), tg('stats', 'Frame stats', v => game.settings.set('showFps', !!v)),
        tg('slowmo', 'Slow motion (x0.25)'), tg('invincible', 'Invincible batter'), tg('infiniteHype', 'Infinite Hype'), tg('alwaysFire', 'Always ON FIRE'), tg('autoBat', 'Auto-bat (autopilot)'), tg('autoBowl', 'Auto-bowl (autopilot)'), tg('noChaos', 'No chaos events'), tg('muteCommentary', 'Mute commentary'),
        cyc('Weather override', ['clear', 'overcast', 'rain', 'fog'], () => m && m.weather, v => { if (!m) return; m.weather = v; m.fog = v === 'fog' ? .6 : 0; game.weather = v === 'rain' ? { kind: 'rain', amount: .6, wind: .2 } : null; if (v === 'fog') coverage.mark('fog'); }),
        cyc('Time of day override', ['day', 'dusk', 'night'], () => m && m.timeOfDay, v => { if (m) { m.timeOfDay = v; if (v === 'night') coverage.mark('night'); } })];
    }
    if (this.tab === 2) {
      const S = this.sel, OUTS = ['dot', '1', '4', '6', 'bowled', 'caught', 'lbw', 'runout', 'stumped', 'wide'], DEL = Object.keys(DELIVERIES), CH = Object.keys(CHAOS), IT = Object.keys(ITEMS), SG = Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s));
      const pick = (label, key, list, act, fmt) => ({ label, value: () => (fmt ? fmt(list[S[key] % list.length]) : String(list[S[key] % list.length])), left: () => { S[key] = (S[key] - 1 + list.length) % list.length; }, right: () => { S[key] = (S[key] + 1) % list.length; }, act: () => act(list[S[key] % list.length]) });
      return [
        pick('Story: start chapter', 'ch', [1, 2, 3, 4, 5], n => this.startChapter(n), n => 'CHAPTER ' + n + ' at ' + ['pre-match scene', 'the match', 'the win scene'][S.beat % 3].toUpperCase()),
        pick('  ...at beat', 'beat', ['pre-match scene', 'the match', 'the win scene'], () => this.startChapter([1, 2, 3, 4, 5][S.ch % 5])),
        { label: 'Start a Quick Match preset', act: () => { this.close(); game.go('match', { cfg: quickConfig({ toss: false }) }); } },
        { label: 'Skip to the last over', act: () => { if (!m || !m.inn) return; m.inn.balls = Math.max(m.inn.balls, (Math.ceil(m.inn.overs) - 1) * 6); m.over = Math.floor(m.inn.balls / 6); K.sfx('confirm'); } },
        { label: 'Win the innings', act: () => { if (!m || !m.inn) return; if (m.inn.target) { m.inn.runs = m.inn.target - 1; m.force.outcome = { kind: 'four' }; } else { m.inn.balls = m.inn.overs * 6 - 1; m.force.outcome = { kind: '6' === '6' ? 'six' : 'six' }; } this.close(); } },
        { label: 'Lose the innings', act: () => { if (!m || !m.inn) return; m.inn.wkts = m.inn.wicketsMax - 1; m.force.outcome = { kind: 'bowled' }; this.close(); } },
        { label: 'Set score: runs', value: () => String(this.score.runs), left: () => { this.score.runs = Math.max(0, this.score.runs - 1); }, right: () => { this.score.runs++; } },
        { label: 'Set score: wickets', value: () => String(this.score.wkts), left: () => { this.score.wkts = Math.max(0, this.score.wkts - 1); }, right: () => { this.score.wkts = Math.min(9, this.score.wkts + 1); } },
        { label: '  Apply the score', act: () => { if (!m || !m.inn) return; m.inn.runs = this.score.runs; m.inn.wkts = Math.min(this.score.wkts, m.inn.wicketsMax - 1); K.sfx('confirm'); } },
        pick('Force next delivery', 'del', DEL, id => { if (!m) return; m.force.delivery = { id, target: [0, 80], grade: 'green' }; K.sfx('confirm'); }, id => DELIVERIES[id].name),
        pick('Force next outcome', 'out', OUTS, k => { if (!m) return; m.force.outcome = { kind: { 4: 'four', 6: 'six' }[k] || k }; m.cpuPlan = null; if (m.phase === 'setup') AI.planBowling(m); if (k !== 'wide') { m.cfg.cheat.catchesOnce = k === 'caught'; } this.close(); }),
        { label: 'Force a review (LBW, wrongly not out)', act: () => { if (!m) return; m.force.outcome = { kind: 'review' }; m.cfg.cheat.lbwGiven = false; m.cpuPlan = null; this.close(); } },
        { label: 'Force the rain delay', act: () => { if (!m) return; if (m.phase === 'setup' || m.phase === 'between') { m.startChaos('rain'); } else m.flags.rainNext = true; this.close(); } },
        pick('Force a chaos event', 'chaos', CH, id => { if (!m) return; if (id === 'rain') m.startChaos('rain'); else m.startChaos(id); this.close(); }, id => CHAOS[id].name),
        pick('Spawn an item token', 'item', IT, id => { if (!m) return; m.spawnToken(id); K.sfx('item'); }, id => ITEMS[id].name),
        { label: 'Trigger a Super Over', act: () => { if (!m || !m.innings[0]) return; if (m.innNo === 0) { m.inn.done = true; m.inn.end = 'overs'; m.endInnings(); } const i1 = m.innings[0], i2 = m.innings[1]; if (i2) { i2.runs = i1.runs; i2.done = true; i2.end = 'overs'; m.innNo = 1; m.endInnings(); } this.close(); } },
        pick('Play attract segment', 'seg', ATTRACT.map((s, i) => i), n => { this.close(); game.go('attract', { segment: n }); }, n => (n + 1) + ': ' + ATTRACT[n].caption),
        pick('Jukebox', 'song', SG, id => { if (id.startsWith('sting:')) Audio.sting(id.slice(6)); else Audio.music(id, { restart: true }); }),
        { label: 'Unlock all teams', act: () => { for (const t of TEAM_IDS) Profile.unlock(t); K.sfx('item'); } },
        { label: 'Reset save', value: () => (this.confirmReset ? 'PRESS AGAIN' : ''), act: () => { if (++this.confirmReset >= 2) { this.confirmReset = 0; Profile.reset(); try { game.saves.erase('auto'); } catch (e) { /* none */ } Story.data = null; K.sfx('cancel'); } } }
      ];
    }
    return [];
  },
  /** jump into story chapter n at the beat chosen on the JUMP tab: its pre-match scene, the match, or the win scene */
  startChapter(n) { const beat = ['pre', 'match', 'win'][this.sel.beat % 3], c = CHAPTERS[n - 1]; this.close(); if (!Story.data) Story.newGame(); if (beat === 'pre') game.go('cutscene', { scene: c.pre, then: () => Story.match(n) }); else if (beat === 'match') Story.match(n); else game.go('cutscene', { scene: c.win, then: () => game.go('storymap') }); },
  nudge(d, k) { Tuning.set(d.key, Tuning.raw(d.key) + d.step * k); this.after(d.key); },
  after(key) { if (key === 'camPitch' || key === 'camScale') { Views.rebuild('broadcast'); if (MatchView.cam === 'broadcast') MatchView.setCam('broadcast'); } if (key === 'wideScale') Views.rebuild('wide'); },
  applyToggles() {
    const m = this.m(), t = this.toggles; if (!m) return;
    Object.assign(m.cfg.cheat, { invincible: !!t.invincible, infiniteHype: !!t.infiniteHype, alwaysFire: !!t.alwaysFire, autoBat: !!t.autoBat || m.cfg.mode === 'attract', autoBowl: !!t.autoBowl || m.cfg.mode === 'attract', noChaos: !!t.noChaos });
  },
  update(dt) {
    this.t += dt; const I = game.input;
    if (!this.restorePause && this.t > .15 && this.scene && this.scene.pausable && this.scene === game.scene) { this.scene.pausable = false; this.restorePause = true; }
    if (I.pressed('cancel') || I.pressed('pause')) { I.consumeAll(); this.close(); return; }
    // R1 / Space / Tab: the next tab; L1 / Shift: the previous one. A tab switch is the whole of that press (Space is also
    // confirm: it must not run the new tab's first row)
    if (I.pressed('run') || I.pressed('tab')) { I.consumeAll(); this.tab = (this.tab + 1) % DEV_TABS.length; this.row = 0; this.scroll = 0; K.sfx('select'); return; }
    if (I.pressed('back')) { I.consumeAll(); this.tab = (this.tab + DEV_TABS.length - 1) % DEV_TABS.length; this.row = 0; this.scroll = 0; K.sfx('select'); return; }
    const rows = this.rows(); if (!rows.length) return;
    if (I.repeat('up', .3, .07)) this.row = (this.row - 1 + rows.length) % rows.length;
    if (I.repeat('down', .3, .07)) this.row = (this.row + 1) % rows.length;
    const R = rows[this.row];
    const lr = I.down('left') ? -1 : I.down('right') ? 1 : 0;
    if (lr) { this.held += dt; } else this.held = 0;
    const accel = this.held > 1.2 ? 5 : this.held > .5 ? 2 : 1;
    if (R && I.repeat('left', .3, .05)) { R.left && R.left(R.slider ? accel : 1); }
    if (R && I.repeat('right', .3, .05)) { R.right && R.right(R.slider ? accel : 1); }
    if (R && (I.pressed('confirm') || I.pressed('shot'))) { I.consumeAll(); if (R.act) R.act(); }
    if (R && I.pressed('special') && R.reset) { R.reset(); K.sfx('cancel'); }
    // the mouse: tabs, hover, a click, dragging a slider's knob
    const L = this.layout; if (!L) return;
    const p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
    if (c) { DEV_TABS.forEach((t, i) => { const x = L.tabX + i * L.tabW; if (c[0] >= x && c[0] < x + L.tabW && c[1] >= L.tabY && c[1] < L.tabY + 14) { this.tab = i; this.row = 0; this.scroll = 0; } }); }
    if (p && I.mouse && I.clock - I.mouse.t < .05) { const k = Math.floor((p[1] - L.y0) / L.rowH) + this.scroll; if (k >= 0 && k < rows.length && p[1] >= L.y0 && p[0] > L.x0 && p[0] < L.x0 + L.w) this.row = k; }
    if (c) { const k = Math.floor((c[1] - L.y0) / L.rowH) + this.scroll; if (k >= 0 && k < rows.length && c[0] > L.x0 && c[0] < L.x0 + L.w && c[1] >= L.y0) { this.row = k; const Q = rows[k]; if (Q.slider) this.dragTo(Q.slider, c[0]); else if (Q.act) Q.act(); } }
    if (I.down('shot') && p && R && R.slider && I.lastDevice === 'mouse') this.dragTo(R.slider, p[0]);
    const wh = I.wheel ? I.wheel() : 0; if (wh) this.scroll = clamp(this.scroll + Math.sign(wh), 0, Math.max(0, rows.length - L.visible));
  },
  dragTo(d, x) { const L = this.layout, u = clamp((x - L.sx) / L.sw, 0, 1); if (x < L.sx - 6 || x > L.sx + L.sw + 6) return; Tuning.set(d.key, d.min + (d.max - d.min) * u); this.after(d.key); },
  draw(r) {
    if (!this.isOpen) return;
    r.overlay(g => {
      px.blend(g, .9, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06080c'));
      UI.text(g, 'DEV MODE', 10, 6, '#ff5a4a', { scale: 2 });
      const ca = game.cornerArea && game.cornerArea(), right = ca && ca.y0 < 30 ? Math.floor(ca.x0) - 4 : r.W - 8, tabW = Math.min(80, Math.floor((right - 112) / 4)), tabX = right - tabW * 4, tabY = 6;   // (clear of the engine's corner buttons)
      DEV_TABS.forEach((t, i) => { const x = tabX + i * tabW; px.rect(g, x, tabY, tabW - 2, 14, i === this.tab ? '#5a4410' : '#1a1a22'); UI.text(g, t, x + tabW / 2 - 1, tabY + 3, i === this.tab ? '#ffd36a' : '#a8a8b8', { align: 'center' }); });
      const rows = this.rows(), rowH = 13, y0 = 30, x0 = 8, w = r.W - 16, visible = Math.floor((r.H - y0 - 22) / rowH);
      if (this.row < this.scroll) this.scroll = this.row; if (this.row >= this.scroll + visible) this.scroll = this.row - visible + 1;
      const sx = x0 + Math.round(w * .52), sw = Math.round(w * .3);
      this.layout = { x0, y0, w, rowH, visible, tabX, tabW, tabY, sx, sw };
      if (this.tab === 3) return this.drawInfo(g, r, y0);
      for (let k = this.scroll; k < Math.min(rows.length, this.scroll + visible); k++) {
        const R = rows[k], y = y0 + (k - this.scroll) * rowH, on = k === this.row;
        if (on) { px.rect(g, x0, y - 2, w, rowH - 1, '#3a2c0c'); px.rect(g, x0, y - 2, 2, rowH - 1, '#ffd36a'); }
        UI.text(g, R.label, x0 + 6, y, on ? '#ffffff' : '#c8c8d0');
        if (R.slider) { const d = R.slider, u = (Tuning.raw(d.key) - d.min) / (d.max - d.min), du = (d.def - d.min) / (d.max - d.min); px.rect(g, sx, y + 3, sw, 3, '#2a2a3a'); px.rect(g, sx, y + 3, Math.round(sw * u), 3, Math.abs(Tuning.raw(d.key) - d.def) > 1e-9 ? '#ff8a4a' : '#5aa04a'); px.rect(g, sx + Math.round(sw * du), y + 1, 1, 7, '#ffffff'); px.rect(g, sx + Math.round(sw * u) - 2, y, 5, 9, on ? '#ffd36a' : '#c8c8c8'); }
        if (R.value) UI.text(g, R.value(), x0 + w - 6, y, on ? '#ffd36a' : '#a8a8b8', { align: 'right' });
      }
      Glyphs.row(g, r.W / 2, r.H - 13, game.input, [['run', 'TAB'], ['left', 'ADJUST'], ['confirm', 'RUN'], ['special', 'RESET'], ['cancel', 'CLOSE']], { align: 'center', color: '#c8c8d0' });
    });
  },
  drawInfo(g, r, y0) {
    const m = this.m(), snap = game.debug && game.debug.snapshot ? game.debug.snapshot() : {};
    let y = y0; const line = (s, c = '#c8c8d0') => { if (y > r.H - 24) return; UI.text(g, String(s).slice(0, 90), 10, y, c, { font: 'tiny' }); y += 8; };
    line('SCENE ' + snap.scene + '   ' + E.versionLabel() + '   game 1.0', '#ffd36a');
    if (m && m.inn) { line('MATCH ' + m.cfg.mode + ' ' + m.teams.map(t => t.code).join(' v ') + ' at ' + m.ground.id + ' - seed ' + m.cfg.seed + ' - phase ' + m.phase + ' ' + m.pt.toFixed(1) + 's'); line('INNINGS ' + (m.innNo + 1) + ': ' + m.inn.runs + '/' + m.inn.wkts + ' (' + m.oversText() + ') target ' + (m.inn.target || '-') + ' - hype ' + m.hype.map(Math.round).join('/') + ' - fire ' + m.fire.bat + '/' + m.fire.bowl); const last = m.inn.recs[m.inn.recs.length - 1]; if (last) line('LAST BALL ' + JSON.stringify({ d: last.delivery, kmh: last.kmh, shot: last.shot, g: last.grade, r: last.runs, w: last.wicket && last.wicket.how })); }
    line('FLOOR BAKES ' + (MatchView.B ? Object.keys(MatchView.B.map.floors).length : 0) + ' - tuning changed: ' + (Tuning.changed().join(', ') || 'none'));
    y += 2; line('LAST 20 EVENTS', '#ffd36a');
    for (const e of bus.log.slice(-20).reverse()) line(e.t.toFixed(2) + '  ' + e.type);
    y += 2; line('LAST 10 COMMENTARY LINES', '#ffd36a');
    for (const l of Commentary.log.slice(-10).reverse()) line(l.who + ': ' + l.text);
  }
};
const fmtNum = (v, step) => (step >= 1 ? String(Math.round(v)) : step >= .1 ? v.toFixed(1) : v.toFixed(2));
K.dev = Dev;

/* ---- 80-debug.js ---- */
/* ---- THE DEBUG HANDLE (game.debug): tests and tools/check.mjs read it. snapshot() gives the scene, the UI's device
 * and prompts, the match (score, players, hype, fire, items, result), the ball, the last ball's record, the director,
 * story, attract, hub and dev state, the coverage flags and the errors; idealPress(), forceDelivery(spec),
 * forceOutcome(kind), startMatch(cfg), startChapter(n, beat), setTuning(k, v), spawnItem(id, at), triggerChaos(id),
 * skipTo(state). Also: dev mode over every scene, the dev overlays, and the story goals' flags. ---- */
game.debug = {
  snapshot() {
    const m = Play.m, I = game.input, inn = m && m.inn, b = m && m.ball, last = inn && inn.recs[inn.recs.length - 1];
    return {
      scene: game.sceneName, mode: m ? m.cfg.mode : null,
      ui: { device: Glyphs.device(I), glyphs: Glyphs.style(I), touchGate: touchOnly() && game.sceneName === 'title', prompts: ['shot', 'loft', 'block', 'special', 'run', 'back', 'charge', 'confirm'].map(a => ({ a, info: Glyphs.info(I, a) })), menuFocus: scenes.title && scenes.title.menu ? scenes.title.menu.i : null, titleState: scenes.title ? scenes.title.state : null },
      match: m && inn ? { innings: m.innNo, runs: inn.runs, wkts: inn.wkts, balls: inn.balls, over: m.over, target: inn.target, need: m.need(), freeHit: inn.freeHit, striker: m.striker && m.striker.id, nonStriker: m.nonStriker && m.nonStriker.id, bowler: m.bowlerP && m.bowlerP.id, hype: m.hype.slice(), fire: Object.assign({}, m.fire), items: m.items.map(x => x.slice()), result: m.result, phase: m.phase, pt: m.pt, field: m.fieldPreset, overRound: m.overRound, reviews: m.reviews.slice(), chaos: m.chaos.map(c => c.id), targetsHit: Object.keys(m.targetsHit), weather: m.weather, time: m.timeOfDay, fog: m.fog, lights: game.lights.enabled, tokens: m.tokens.length, decision: m.decision ? { kind: m.decision.kind, given: m.decision.given, truth: m.decision.truth, reviewing: !!m.decision.reviewing, final: m.decision.final } : null, catchRing: !!m.catchRing, holder: m.holder ? m.holder.id : null, kmh: m.cur && m.cur.kmh, marker: m.marker && m.marker.slice() } : null,
      ball: b ? { phase: b.phase, x: b.x, y: b.y, z: b.z, v: hyp(b.vx, b.vy, b.vz), pitched: b.pitched, fx: b.fx, hidden: !!b.hidden } : null,
      last: last ? { delivery: last.delivery, kmh: last.kmh, shot: last.shot, grade: last.grade, runs: last.runs, ran: last.ran, boundary: last.boundary, extras: last.extras, wicket: last.wicket, bonus: last.bonus, meter: last.meter, aftertouch: last.aftertouch, pitch: last.pitch, target: last.target, charged: !!last.charged, noBall: last.noBall } : null,
      director: { cam: MatchView.cam, replay: !!MatchView.replay },
      story: Story.data ? { chapter: Story.data.chapter, stars: Story.data.stars, done: Story.data.done, flags: m ? Object.keys(m.flags).filter(k => m.flags[k]) : [] } : null,
      attract: { active: game.sceneName === 'attract', segment: Attract.seg },
      hub: { active: !!game.hubActive, phase: Hub.phase, sent: Object.assign({}, Hub.sent), ended: Hub.ended },
      dev: { open: Dev.isOpen, tab: Dev.tab, row: Dev.row, changed: Tuning.changed() },
      coverage: Object.assign({}, coverage.seen), errors: game.errors.map(e => e.message || String(e))
    };
  },
  idealPress(btn = 'shot', aim) { return Play.m ? Play.m.idealPress(btn, aim) : null; },
  forceDelivery(spec) { if (Play.m) Play.m.force.delivery = Object.assign({ grade: 'green' }, spec); },
  forceOutcome(kind, o = {}) { const m = Play.m; if (!m) return; m.force.outcome = Object.assign({ kind }, o); m.cpuPlan = null; if (m.phase === 'setup') AI.planBowling(m); },
  startMatch(cfg = {}, hooks) { game.go('match', { cfg: quickConfig(Object.assign({ toss: false }, cfg)), hooks }, { fade: 0 }); },
  startChapter(n, beat = 'match') { if (!Story.data) Story.newGame(); const c = CHAPTERS[n - 1]; if (beat === 'pre') game.go('cutscene', { scene: c.pre, then: () => Story.match(n) }, { fade: 0 }); else Story.match(n); },
  setTuning(k, v) { Tuning.set(k, v); Dev.after(k); },
  spawnItem(id, at) { if (Play.m) Play.m.spawnToken(id, at); },
  triggerChaos(id) { if (Play.m) Play.m.startChaos(id); },
  skipTo(state) { const m = Play.m; if (!m) return; if (state === 'lastOver') { m.inn.balls = (Math.ceil(m.inn.overs) - 1) * 6; m.over = Math.floor(m.inn.balls / 6); } if (state === 'secondInnings' && m.innNo === 0) { m.inn.done = true; m.inn.end = 'overs'; m.endInnings(); m.afterBreak(); } },
  match: () => Play.m, K
};
/* dev mode over every scene: while it's open the scene below is frozen and gets no input (called once, at the start) */
function wrapScenes() { for (const [name, S] of Object.entries(scenes)) {
  const up = S.update, dr = S.draw;
  S.update = function (dt) { if (Dev.isOpen) { Dev.update(dt); return; } if (Dev.toggles.slowmo && Play.m && game.sceneName === name && S.pausable) { if (game.timeScale > .26) game.timeScale = .25; } return up.call(this, dt); };
  S.draw = function (r) { dr.call(this, r); if (Dev.isOpen) Dev.draw(r); else if (S.pausable) DevOverlays.draw(r); };
} }
/* the dev overlays: hitboxes and zones, AI intent, fielder assignments, skeletons */
const DevOverlays = {
  draw(r) {
    const m = Play.m, t = Dev.toggles, B = MatchView.B; if (!m || !B || !m.inn) return;
    const W = (x, y, z = 0) => r.w(x + B.OX, y + B.OY, z);
    if (t.hitboxes) r.overlay(g => {
      const box = (x0, y0, z0, x1, y1, z1, c) => { for (const [a, b] of [[[x0, y0, z0], [x1, y0, z0]], [[x0, y0, z1], [x1, y0, z1]], [[x0, y0, z0], [x0, y0, z1]], [[x1, y0, z0], [x1, y0, z1]], [[x0, y1, z0], [x1, y1, z0]], [[x0, y1, z1], [x1, y1, z1]]]) { const p = W(...a), q = W(...b); px.line(g, p[0], p[1], q[0], q[1], c); } };
      box(-3.6, -.5, 0, 3.6, .5, 12.6, '#ff4a4a'); box(-3.6, 319.5, 0, 3.6, 320.5, 12.6, '#ff4a4a');
      const pb = Batting.padBox(m); box(pb.xa, pb.y0, 0, pb.xb, pb.y1, pb.z1, '#4aa8ff');
      if (m.shotPress) { const s = SHOTS[m.shotPress.shotId], h = m.hand, pl = m.shotPress.plane, xa = -h * s.line[0], xb = -h * s.line[1]; box(Math.min(xa, xb), pl - .5, s.z[0], Math.max(xa, xb), pl + .5, s.z[1], '#6aff8a'); }
      for (const f of m.fielders) { const p = W(f.x, f.y, 10); for (let a = 0; a < TAU; a += .5) px.dot(g, p[0] + Math.cos(a) * 9 * r.view.scale, p[1] + Math.sin(a) * 4 * r.view.scale, '#ffd36a'); }
    });
    if (t.intent) r.overlay(g => { if (m.cpuPlan && (m.phase === 'setup' || m.phase === 'runup')) { const p = W(m.cpuPlan.tx, m.cpuPlan.ty); px.disc(g, p[0], p[1], 3, '#ff8ad8'); UI.text(g, 'CPU: ' + m.cpuPlan.id + (m.cpuPlan.special ? ' +SPECIAL' : '') + ' ' + m.cpuPlan.grade, p[0] + 5, p[1] - 4, '#ff8ad8', { font: 'tiny' }); } if (m.batPlan && m.batPlan.decided) { const s = m.striker, p = W(s.x, s.y, 30); UI.text(g, 'CPU BAT: ' + (m.batPlan.btn || 'leave') + (m.batPlan.sector !== null && m.batPlan.sector !== undefined ? ' ' + Math.round(m.batPlan.sector) + ' deg' : ''), p[0], p[1], '#ff8ad8', { font: 'tiny', align: 'center' }); } });
    if (t.assign && m.phase === 'inPlay') r.overlay(g => { for (const f of m.fielders) if ((f.task === 'chase' || f.task === 'backup') && f.chase) { const a = W(f.x, f.y), b = W(f.chase.x, f.chase.y); px.line(g, a[0], a[1], b[0], b[1], f.task === 'chase' ? '#ffd36a' : '#6ae8ff'); UI.text(g, f.task.toUpperCase(), a[0], a[1] - 8, '#ffffff', { font: 'tiny', align: 'center' }); } });
    if (t.skeleton) for (const a of m.fielders.concat(m.batters)) { const rig = MatchView.rigFor(a, m); if (rig.debug) rig.debug(r); }
  }
};
/* the story goals' flags, from the bus */
bus.on('*', (d, type) => {
  const m = d && d.match; if (!m || m !== Play.m) return;
  const H = s => m.isHuman(s);
  if (type === 'wicket' && d.how === 'caught' && m.cur.catchGrade === 'perfect' && H(m.bowlSide)) m.flags.perfectCatch = true;
  if (type === 'wicket' && d.how === 'stumped' && H(m.bowlSide)) m.flags.stumpedOne = true;
  if (type === 'review:result' && d.overturned && H(d.side)) m.flags.wonReview = true;
  if (type === 'boundary' && d.n === 6 && m.contact && m.contact.shot === 'hook' && H(m.bat)) m.flags.hookSix = true;
  if (type === 'run:dive') m.cur.dived = true;
  if (type === 'match:end' && m.innings.length) { const i = m.inn, last = i && i.recs[i.recs.length - 1]; if (last && last.dived && H(m.sideOf(i.bat))) m.flags.diveWin = true; }
  if (type === 'wicket' && m.cfg.cheat.invincible && H(m.bat) && m.cur.wicket) { m.cur.wicket = null; m.cur.devSaved = true; }
  if (type === 'ball:done') { const r = d.rec; if (r.wicket || r.boundary === 6 || r.bonus || r.screamer) { const h = m.highlights[m.highlights.length - 1]; if (h && h.rec === r && !h.frames) h.frames = Recorder.window(6).map(f => JSON.parse(JSON.stringify(f))); } }
  if (type === 'match:start' || type === 'innings:start') Dev.applyToggles();
});

/* ---- 99-start.js ---- */
/* ---- THE START: the match scene, the boot steps (assets, views, the bus wiring), dev mode over every scene, and the
 * deep links the tools use. ---- */
K.restart = () => { const m = Play.m; if (!m) return; game.resume && game.resume(); game.paused = false; const cfg = Object.assign({}, Play.cfg, { seed: (Play.cfg.seed || 1) + 1 }); game.go(game.sceneName === 'match' ? 'match' : game.sceneName, { cfg, hooks: K.lastHooks }); };
K.matchInfo = () => { K.infoOpen = !K.infoOpen; game.paused = false; };
/* ---- the match scene ---- */
scenes.match = {
  pausable: true, camera: { zoom: false }, view: 'threequarter',
  enter(d) { d = d || {}; K.lastHooks = d.hooks || null; Play.begin(d.cfg || quickConfig(), d.hooks || {}); K.infoOpen = false; game.input.consumeAll(); if (K.openDevOnEnter) { K.openDevOnEnter = false; game.after(.4, () => K.dev.open()); } },
  exit() { game.weather = null; game.timeScale = 1; Audio.layer('fire', 0); },
  update(dt) { if (game.timeScale !== T('timeScale') && !game._slowFx) {} Play.update(dt); K.idle && K.idle.reset(); },
  draw(r) { Play.draw(r); if (K.infoOpen) drawMatchInfo(r); }
};
function quickConfig(o = {}) {
  return Object.assign({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', overs: K.settings('defOvers'), wickets: K.settings('defWickets'), difficulty: K.settings('difficulty'), kerfuffleRules: K.settings('kerfuffleRules'),
    humans: { 0: [game.input] }, toss: true, battingFirst: 0 }, o);
}
K.quickConfig = quickConfig;
function drawMatchInfo(r) {
  const m = Play.m; if (!m) return;
  r.overlay(g => {
    UI.panel(g, r.W / 2 - 150, 30, 300, 150);
    UI.text(g, 'MATCH INFO', r.W / 2, 38, UI.gold, { align: 'center' });
    const rows = [m.teams[0].name + ' v ' + m.teams[1].name, m.ground.name + ' - ' + m.timeOfDay + ' - ' + m.weather, 'Innings ' + (m.innNo + 1) + ': ' + m.inn.runs + '/' + m.inn.wkts + ' (' + m.oversText() + ' of ' + fmtOvers(m.inn.overs) + ')', m.inn.target ? 'Target ' + m.inn.target : 'First innings', 'Kerfuffle rules: ' + (m.kerfuffle ? 'on' : 'off') + ' - Reviews left: ' + m.reviews.join(' / '), 'Field: ' + FIELDS[m.fieldPreset].name + ' - ' + (m.overRound === 'over' ? 'over' : 'round') + ' the wicket', 'Difficulty: ' + Tuning.difficulty];
    rows.forEach((s, i) => UI.text(g, s, r.W / 2 - 140, 54 + i * 14, '#ffffff'));
    UI.text(g, 'PAUSE MENU: MATCH INFO TO CLOSE', r.W / 2, 160, '#a8a090', { align: 'center' });
  });
}
/* ---- boot ---- */
Tuning.init(); Profile.load();
E.addAssets(window.ASSETS.KERFUFFLE);
Views.make();
wireMatchEvents(); HUD.wire();
bus.on('*', (d, t) => MatchView.onEvent(t, d));
wrapScenes();
game.start({ scenes, scene: HUB ? 'hubcard' : 'title',
  boot: { title: 'CRICKET KERFUFFLE', version: '1.0', messages: LOADING, steps: [
    ['Rolling the pitch', () => { Audio.init(); Commentary.init(); }],
    ['Whitening the creases', () => { for (const id of GROUND_IDS) Ground.get(id); }],
    ['Brewing the tea', () => { K.afterBoot && K.afterBoot(); }]
  ] } });
// deep links for the tools: #match #nets #about #dev #story #attract #showdown #results
const deep = (location.hash || '').slice(1);
K.deepLink = !HUB && deep ? deep : null;
K.runDeep = d => {
  if (d === 'match') game.go('match', { cfg: quickConfig({ toss: false }) }, { fade: 0 });
  else if (d.startsWith('match:')) { const [, g2, t2, side] = d.split(':'); game.go('match', { cfg: quickConfig({ toss: false, ground: g2 || 'green', teams: ['ker', t2 || 'mud'], battingFirst: side === 'bowl' ? 1 : 0 }) }, { fade: 0 }); }
  else if (d === 'bowl') game.go('match', { cfg: quickConfig({ toss: false, battingFirst: 1 }) }, { fade: 0 });
  else if (d === 'dev') { K.openDevOnEnter = true; game.go('match', { cfg: quickConfig({ toss: false }) }, { fade: 0 }); }
  else if (d.startsWith('attract')) game.go('attract', { segment: +(d.split(':')[1] || 0) }, { fade: 0 });
  else if (d.startsWith('chapter:')) game.debug.startChapter(+d.split(':')[1], d.split(':')[2] || 'match');
  else if (scenes[d]) game.go(d, {}, { fade: 0 });
};
window.__game = game;

})();
