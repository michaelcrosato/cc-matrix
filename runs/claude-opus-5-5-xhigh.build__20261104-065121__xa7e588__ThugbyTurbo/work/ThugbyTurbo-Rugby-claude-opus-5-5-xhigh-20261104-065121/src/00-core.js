/* THUGBY TURBO — the core loop, in one sentence:
 * Run at their line, pass it backwards, smash through or step round them, ground it over the line and kick the
 * conversion, while seven lunatics in the other colours try to flatten you, and the referee looks the other way.
 *
 * Layers: devices, AI brains, network intents, test scripts and the attract director all produce INTENTS (one per
 * on-field player, per step); the MATCH SIMULATION reads only intents and writes only its own plain state; the
 * PRESENTATION (rigs, camera, HUD, effects, audio, commentary) reads that state and the event bus. So the same
 * presentation draws a live match, an instant replay, an online client and the attract demo, and the same simulation
 * runs headless for tests and as the host of an online match.
 */
const E = My3D2dge, { px, clamp, lerp, approach } = E;
const TT = { scenes: {} };
const HEADLESS = typeof document === 'undefined' || !document.getElementById;
TT.cfg = { present: !HEADLESS, headless: HEADLESS };
const PI = Math.PI, TAU = Math.PI * 2;

/* ---- pitch geometry (world units; 16 = one tile; display metres = units / 10.24, so the field is "100 m") ---- */
const T = 16;
const G = TT.G = {
  T, COLS: 86, ROWS: 48,
  X0: 176, X1: 1200, CX: 688,          // try lines and halfway
  Y0: 96, Y1: 672, CY: 384,            // touchlines and the centre
  ING: 96,                             // in-goal depth
  DX0: 80, DX1: 1296,                  // dead-ball lines
  L22: 225, L10: 102, L5: 51, L15: 154,
  POSTW: 29, BAR: 34, POSTH: 120,      // the posts: uprights at CY ± POSTW, crossbar height, upright tops
  M: 10.24                             // units per metre
};
G.W = G.X1 - G.X0; G.H = G.Y1 - G.Y0;
const metres = u => u / G.M;
TT.metres = metres;

/* ---- the event bus: the simulation emits; commentary, audio, hype, stats, replays, banners, records listen ---- */
TT.bus = {
  h: {},
  on(name, fn) { (this.h[name] || (this.h[name] = [])).push(fn); return () => { this.h[name] = this.h[name].filter(f => f !== fn); }; },
  emit(name, data) {
    const l = this.h[name]; if (l) for (const f of l.slice()) { try { f(data, name); } catch (e) { if (TT.game) TT.game.fail('bus:' + name, e); else throw e; } }
    const a = this.h['*']; if (a) for (const f of a.slice()) { try { f(data, name); } catch (e) { if (TT.game) TT.game.fail('bus:*', e); else throw e; } }
  },
  clear(name) { if (name) delete this.h[name]; else this.h = {}; }
};

/** the game's own storage: E.store, with a memory copy so unlocks, records and ticks last the visit where storage is blocked */
TT.store = { kept: {}, get(k, fb) { if (k in this.kept) return this.kept[k]; const v = E.store.get(k, undefined); return v === undefined ? fb : v; }, set(k, v) { this.kept[k] = v; return E.store.set(k, v); } };
/* ---- the balance registry: every important gameplay number, live (dev sliders), with a reset to defaults ---- */
const TUNE_SPECS = [
  ['runSpeed', 'Run speed', 'Movement', 100, 60, 160, 5],
  ['turboMult', 'Turbo multiplier', 'Movement', 1.45, 1, 2.2, .05],
  ['turboTank', 'Turbo tank (s)', 'Movement', 3, 1, 8, .25],
  ['turboRegen', 'Turbo refill (/s)', 'Movement', .3, .05, 1, .05],
  ['accel', 'Acceleration', 'Movement', 850, 300, 2000, 50],
  ['passSpeed', 'Pass speed', 'Ball', 230, 120, 400, 10],
  ['catchBase', 'Catch chance', 'Ball', .95, .5, 1, .01],
  ['pressurePenalty', 'Catch pressure penalty', 'Ball', .12, 0, .4, .01],
  ['tackleRange', 'Tackle reach', 'Contact', 14, 8, 30, 1],
  ['tackleBase', 'Tackle success', 'Contact', .78, .3, 1, .01],
  ['bigHitCharge', 'Big hit charge time (s)', 'Contact', .7, .2, 2, .05],
  ['bigHitLaunch', 'Big hit launch', 'Contact', 1, .2, 3, .1],
  ['spillChance', 'Monster hit spill chance', 'Contact', .5, 0, 1, .05],
  ['fendWindow', 'Fend window (s)', 'Contact', .3, .05, .8, .05],
  ['fendBeat', 'Fend strength', 'Contact', .7, 0, 1, .05],
  ['sidestepPower', 'Sidestep power', 'Contact', 140, 40, 300, 10],
  ['sidestepEvade', 'Sidestep evade (s)', 'Contact', .25, .05, .6, .05],
  ['diveRange', 'Dive tackle reach', 'Contact', 30, 10, 60, 2],
  ['kickMax', 'Kick distance', 'Ball', 520, 200, 900, 20],
  ['windMult', 'Wind strength', 'Ball', 1, 0, 3, .1],
  ['bounceChaos', 'Oval bounce chaos', 'Ball', .6, 0, 1, .05],
  ['ruckTime', 'Ruck length (s)', 'Set pieces', 1.6, .5, 4, .1],
  ['mashWeight', 'Ruck mash weight', 'Set pieces', .05, .01, .12, .005],
  ['scrumPushWeight', 'Scrum push weight', 'Set pieces', .05, .01, .15, .005],
  ['hypeMult', 'Hype gain', 'Arcade', 1, 0, 3, .1],
  ['superTime', 'Super length (s)', 'Arcade', 4, 1, 10, .5],
  ['powerupEvery', 'Power-up every (s)', 'Arcade', 30, 5, 120, 5],
  ['hazardEvery', 'Hazard frequency', 'Arcade', 1, 0, 3, .1],
  ['aiReaction', 'CPU reaction (s)', 'CPU', .25, 0, 1, .05],
  ['aiAggression', 'CPU aggression', 'CPU', .5, 0, 1, .05],
  ['cpuMash', 'CPU mash rate (/s)', 'CPU', 9, 2, 20, 1],
  ['refRange', 'Ref sight range', 'Referee', 260, 60, 600, 10],
  ['refFov', 'Ref sight angle (rad)', 'Referee', 1.4, .4, 3.14, .05],
  ['sinBin', 'Sin bin (s)', 'Referee', 30, 5, 120, 5],
  ['halfLength', 'Half length (s)', 'Match', 120, 20, 600, 10],
  ['gameSpeed', 'Game speed', 'Match', 1, .25, 2, .05]
];
const TUNE = TT.TUNE = {
  specs: TUNE_SPECS.map(([key, label, group, value, min, max, step]) => ({ key, label, group, value, min, max, step })),
  v: {},
  set(key, v) {
    const s = this.specs.find(q => q.key === key); if (!s || typeof v !== 'number' || !isFinite(v)) return undefined;
    const n = Math.round(clamp(v, s.min, s.max) / s.step) * s.step;
    this.v[key] = +n.toFixed(4); this.save(); return this.v[key];
  },
  reset(key) { for (const s of this.specs) if (!key || s.key === key) this.v[s.key] = s.value; this.save(); },
  defaults() { const o = {}; for (const s of this.specs) o[s.key] = s.value; return o; },
  changed() { return this.specs.filter(s => Math.abs(this.v[s.key] - s.value) > 1e-9).map(s => s.key); },
  save() { if (TT.cfg.headless || TT.noStore) return; const ch = {}; for (const k of this.changed()) ch[k] = this.v[k]; TT.store.set('thugby:tune', ch); },
  load() {
    this.reset(); if (TT.cfg.headless || TT.noStore) return;
    const s = TT.store.get('thugby:tune', null);
    if (s && typeof s === 'object') for (const k in s) { const sp = this.specs.find(q => q.key === k); if (sp && typeof s[k] === 'number') this.v[k] = clamp(s[k], sp.min, sp.max); }
  }
};
TUNE.reset();

/* ---- difficulty: a layer over TUNE (Rookie, Pro, Legend), so "reset to defaults" keeps the chosen difficulty ---- */
TT.DIFF = {
  Rookie: { name: 'Rookie', react: .15, tackle: -.12, mash: -3, noise: .35, intercept: .5, sigma: .25, early: .08, read: .25, kick: 1.5 },
  Pro: { name: 'Pro', react: 0, tackle: 0, mash: 0, noise: .2, intercept: 1, sigma: .12, early: .03, read: .35, kick: 1 },
  Legend: { name: 'Legend', react: -.07, tackle: .03, mash: 2, noise: .1, intercept: 1.3, sigma: .07, early: 0, read: .42, kick: .7 }
};
TT.DIFF_ORDER = ['Rookie', 'Pro', 'Legend'];
TT.diffStep = (name, k) => TT.DIFF_ORDER[clamp(TT.DIFF_ORDER.indexOf(name) + k, 0, 2)];

/* ---- cheats (dev panel): toggles read by the simulation ---- */
TT.cheats = { god: false, infTurbo: false, hypeFull: false, onFire: false, refBlind: false, refStrict: false, cpuFrozen: false, noClock: false, bigHeads: false };

/* ---- small helpers ---- */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
const segDist = (px0, py0, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, u = clamp(((px0 - ax) * vx + (py0 - ay) * vy) / l, 0, 1); return Math.hypot(ax + vx * u - px0, ay + vy * u - py0); };
const sgn = v => v < 0 ? -1 : 1;
const r1 = v => Math.round(v * 10) / 10;
TT.util = { dist, dist2, angTo, angDiff, segDist, sgn, r1 };
/** a seeded generator with the helpers the simulation uses (never Math.random in the simulation) */
TT.makeRng = seed => {
  const f = E.rng(seed >>> 0 || 1);
  const R = () => f();
  R.range = (a, b) => a + (b - a) * f();
  R.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  R.chance = p => f() < p;
  R.pick = l => l[Math.floor(f() * l.length)];
  R.gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += f(); return (s - 2) / .577; };
  return R;
};
/** cosmetic randomness (particles, crowd, line choice): never affects play */
TT.fx = TT.makeRng(Date.now ? (Date.now() & 0xffffff) : 99);
/** strip what the pixel font cannot draw (hub names): accents removed, anything else a dot */
TT.clean = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '.').slice(0, 14);
