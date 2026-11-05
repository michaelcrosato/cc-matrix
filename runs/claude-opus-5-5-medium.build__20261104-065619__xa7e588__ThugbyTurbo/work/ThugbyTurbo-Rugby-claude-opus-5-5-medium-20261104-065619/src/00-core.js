/* THUGBY TURBO: over-the-top arcade rugby sevens.
 * THE CORE LOOP: run at their line, pass it backwards, smash through or step round them, ground it over the line and kick
 * the conversion, while seven lunatics in the other colours try to flatten you, and the referee looks the other way.
 *
 * Layers: devices, AI brains, network intents, test scripts and the attract director all produce INTENTS (one per
 * on-field player per step); the MATCH SIMULATION reads only intents and writes only the match state; the PRESENTATION
 * (rigs, camera, HUD, effects, audio, commentary) reads only the state and the events it emits. */
const { px, clamp, lerp } = E;
const TT = {};
const TAU = Math.PI * 2, PI = Math.PI;

/* ---- config flags ---- */
TT.scenes = {};
TT.cfg = {
  present: typeof document !== 'undefined',   // rigs, particles, camera: off headless (tests turn them on)
  session: false,                              // inside an AI Hub session
  touchOnly: false
};

/* ---- geometry (world units; 16 a tile; display metres = units / 10.24, so the field is "100 m") ---- */
const T16 = 16;
const G = TT.G = {
  COLS: 86, ROWS: 48,
  X0: 176, X1: 1200, Y0: 96, Y1: 672, IN: 96, APRON: 48,
  CX: 688, CY: 384,
  POST: 29, BAR: 34, UPRIGHT: 120,
  M: 10.24
};
G.L22 = [G.X0 + 225, G.X1 - 225];
G.L10 = [G.CX - 102, G.CX + 102];
G.L5 = [G.X0 + 51, G.X1 - 51];
G.DEAD = [G.X0 - G.IN, G.X1 + G.IN];
G.BIN = { x: G.CX + 60, y: G.Y1 + 30 };
TT.metres = u => Math.round(u / G.M);

/* ---- the balance registry: every gameplay number the simulation reads (live, from the dev panel) ---- */
const TUNE_DEFS = [
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
  defs: TUNE_DEFS.map(([key, label, group, value, min, max, step]) => ({ key, label, group, value, min, max, step })),
  base: {}, layers: {}, v: {},
  def(key) { return this.defs.find(d => d.key === key); },
  /** recompute the live values: base, then each layer (difficulty, match options) on top */
  _mix() { const v = Object.assign({}, this.base); for (const k in this.layers) Object.assign(v, this.layers[k]); for (const d of this.defs) this.v[d.key] = v[d.key]; },
  set(key, value) { const d = this.def(key); if (!d) return; this.base[key] = clamp(+value, d.min, d.max); if (this.layers.dev) delete this.layers.dev[key]; this._mix(); this.save(); },
  reset(key) { if (key) { const d = this.def(key); this.base[key] = d.value; } else for (const d of this.defs) this.base[d.key] = d.value; this._mix(); this.save(); },
  layer(name, values) { if (values) this.layers[name] = Object.assign({}, values); else delete this.layers[name]; this._mix(); },
  defaults() { const o = {}; for (const d of this.defs) o[d.key] = d.value; return o; },
  changed() { return this.defs.filter(d => Math.abs(this.base[d.key] - d.value) > 1e-9).map(d => d.key); },
  save() { if (TT.cfg.session) return; try { E.store.set('thugby:tune', this.changed().reduce((o, k) => (o[k] = this.base[k], o), {})); } catch (e) { /* storage blocked */ } },
  load() { let s = null; try { s = E.store.get('thugby:tune', null); } catch (e) { s = null; } for (const d of this.defs) this.base[d.key] = s && typeof s[d.key] === 'number' ? clamp(s[d.key], d.min, d.max) : d.value; this._mix(); }
};
for (const d of TUNE.defs) TUNE.base[d.key] = d.value;
TUNE._mix();

/* ---- the event bus: the simulation emits, everyone else listens ---- */
TT.bus = {
  h: {},
  on(name, fn) { (this.h[name] = this.h[name] || []).push(fn); return () => { this.h[name] = this.h[name].filter(f => f !== fn); }; },
  emit(name, data) {
    const l = this.h[name]; if (l) for (const f of l.slice()) try { f(data || {}, name); } catch (e) { if (TT.game) TT.game.fail('event ' + name, e); else throw e; }
    const a = this.h['*']; if (a) for (const f of a.slice()) try { f(data || {}, name); } catch (e) { if (TT.game) TT.game.fail('event *', e); else throw e; }
  }
};

/* ---- helpers ---- */
TT.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
TT.d2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
TT.angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
TT.segDist = (o, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * u - o.x, a.y + vy * u - o.y); };
TT.approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
TT.fmtClock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
TT.ascii = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '.');
/** a shuffle bag: draws each item once before repeating */
TT.bag = (items, rng) => { let left = []; return () => { if (!left.length) { left = items.slice(); for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; } } return left.pop(); }; };
TT.fxRng = E.rng(12345);
TT.hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
