(() => {
'use strict';
const E = My3D2dge, G = {};

// ===== src/00-core.js =====
{
// BRIGANTIME: THE LEGEND OF FORSEASONS
// CORE LOOP: each season, read the tidings, muster your castles (summon, bind, move, quest, equip, promote), declare your
// marches, then fight the battles they cause, growing knights and monsters until you can take Meridian and defeat the
// Gray Knight before the Hour-Candle burns out.
//
// Layers: data registries -> simulations (pure, deterministic, JSON state) -> events -> presentation (scenes, art, audio,
// UI). Commands come from the AI, from input and from the AI Hub. Presentation never writes sim state.
// Every source file attaches what it defines to G (no other globals; tests reach G through globalThis.BRIG).

G.VERSION = '1.0.0';
G.BUILD = '2026-11-04';
globalThis.BRIG = G;
G.SCENES = {};   // every scene file adds its scenes here; 90-main.js starts them

/* ---- registries: G.def(kind, id, spec), G.get(kind, id), G.all(kind) ---- */
const REG = {};
G.KINDS = ['element', 'terrain', 'effect', 'skill', 'class', 'monster', 'knight', 'item', 'castle', 'map', 'site', 'event', 'realm', 'song', 'voice'];
G.def = (kind, id, spec) => {
  const k = REG[kind] || (REG[kind] = { map: new Map(), list: [] });
  if (k.map.has(id)) throw new Error(`G.def: ${kind} "${id}" defined twice`);
  spec.id = id; k.map.set(id, spec); k.list.push(spec); return spec;
};
G.get = (kind, id) => {
  const k = REG[kind], v = k && k.map.get(id);
  if (!v) throw new Error(`G.get: no ${kind} "${id}"`);
  return v;
};
G.has = (kind, id) => !!(REG[kind] && REG[kind].map.has(id));
G.all = kind => (REG[kind] ? REG[kind].list : []);

/* ---- deterministic randomness: mulberry32 whose state lives in the sim's own JSON (o.rs) ---- */
G.Rng = {
  seed(n) { return (n >>> 0) || 0x9e3779b9; },
  next(o) {
    o.rs = (o.rs + 0x6d2b79f5) >>> 0; let t = o.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  int(o, a, b) { return a + Math.floor(G.Rng.next(o) * (b - a + 1)); },
  chance(o, p) { return G.Rng.next(o) < p; },
  pick(o, arr) { return arr[Math.floor(G.Rng.next(o) * arr.length)]; },
  /** weighted pick: list of [weight, value] */
  weighted(o, list) {
    const tot = list.reduce((a, e) => a + Math.max(0, e[0]), 0); if (tot <= 0) return list.length ? list[0][1] : null;
    let x = G.Rng.next(o) * tot;
    for (const [w, v] of list) { if (w <= 0) continue; if ((x -= w) < 0) return v; }
    return list[list.length - 1][1];
  }
};
/** a stand-alone stream for presentation-only randomness (never in sims) */
G.cosmetic = (seed) => { const o = { rs: G.Rng.seed(seed) }; return () => G.Rng.next(o); };
/** a stable 32-bit hash of a string (FNV-1a) */
G.hashStr = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
/** a stable hash of any JSON value (key order sorted) */
G.hashJSON = v => G.hashStr(G.stable(v)).toString(16).padStart(8, '0');
G.stable = v => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(G.stable).join(',') + ']';
  return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + G.stable(v[k])).join(',') + '}';
};
G.clone = v => JSON.parse(JSON.stringify(v));
G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ---- hex helpers: pointy-top hexes in offset rows (odd rows shifted right), the same layout as E.Grid({ hex: 'pointy' }) ---- */
const T = 28;
// axial directions in screen order: E, SE, SW, W, NW, NE (angles 0, 60, ..., 300 degrees, y down)
const AX = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
G.hex = {
  T,
  DIRS: AX,
  /** offset [cx, cy] -> axial [q, r] */
  ax(c) { return [c[0] - (c[1] - (c[1] & 1)) / 2, c[1]]; },
  /** axial -> offset */
  off(q, r) { return [q + (r - (r & 1)) / 2, r]; },
  /** world centre of a hex */
  center(c) { return [(c[0] + .5 + (c[1] & 1) * .5) * T, (c[1] * .866 + .577) * T]; },
  /** the hex under world point (x, y): cube rounding */
  toCell(x, y) {
    const rf = (y / T - .577) / .866, qf = x / T - .5 - rf / 2, sf = -qf - rf;
    let q = Math.round(qf), r = Math.round(rf), s = Math.round(sf);
    const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
    if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
    return G.hex.off(q, r);
  },
  /** the six corners of a hex in world units (pointy top), r = the circumradius scale (1 = full) */
  corners(c, k = 1) {
    const [x, y] = G.hex.center(c), R = T * .5774 * k, out = [];
    for (let i = 0; i < 6; i++) { const a = (-90 + 60 * i) * Math.PI / 180; out.push([x + Math.cos(a) * R, y + Math.sin(a) * R]); }
    return out;
  },
  dist(a, b) {
    const dq = (a[0] - ((a[1] - (a[1] & 1)) >> 1)) - (b[0] - ((b[1] - (b[1] & 1)) >> 1)), dr = a[1] - b[1];
    return ((dq < 0 ? -dq : dq) + (dr < 0 ? -dr : dr) + (dq + dr < 0 ? -dq - dr : dq + dr)) >> 1;
  },
  /** neighbour in direction d (0..5); may be off the field */
  step(c, d, n = 1) { const a = G.hex.ax(c), v = AX[((d % 6) + 6) % 6]; return G.hex.off(a[0] + v[0] * n, a[1] + v[1] * n); },
  neighbours(c) { return AX.map((v, d) => G.hex.step(c, d)); },
  inside(c, w, h) { return c[0] >= 0 && c[1] >= 0 && c[0] < w && c[1] < h; },
  eq(a, b) { return !!a && !!b && a[0] === b[0] && a[1] === b[1]; },
  key(c) { return c[0] + ',' + c[1]; },
  /** the direction (0..5) whose ray from a points most nearly at b */
  dirTo(a, b) {
    const [ax, ay] = G.hex.center(a), [bx, by] = G.hex.center(b);
    let ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI; if (ang < 0) ang += 360;
    return Math.round(ang / 60) % 6;
  },
  /** every hex within n of c (c included), on the field */
  within(c, n, w, h) {
    const out = [], a = G.hex.ax(c);
    for (let dq = -n; dq <= n; dq++) for (let dr = Math.max(-n, -dq - n); dr <= Math.min(n, -dq + n); dr++) {
      const o = G.hex.off(a[0] + dq, a[1] + dr); if (G.hex.inside(o, w, h)) out.push(o);
    }
    return out;
  },
  ring(c, n, w, h) { return G.hex.within(c, n, w, h).filter(o => G.hex.dist(c, o) === n); },
  /** hexes along a straight line from c in direction d, n long (c not included) */
  line(c, d, n, w, h) { const out = []; for (let k = 1; k <= n; k++) { const o = G.hex.step(c, d, k); if (G.hex.inside(o, w, h)) out.push(o); } return out; },
  /** hexes within n of c inside the 120-degree wedge facing direction d (c not included) */
  cone(c, d, n, w, h) {
    const [cx, cy] = G.hex.center(c), dirA = d * 60;
    return G.hex.within(c, n, w, h).filter(o => {
      if (G.hex.eq(o, c)) return false;
      const [ox, oy] = G.hex.center(o); let a = Math.atan2(oy - cy, ox - cx) * 180 / Math.PI - dirA;
      a = ((a % 360) + 540) % 360 - 180; return Math.abs(a) <= 60.5;
    });
  },
  /** hexes on the straight line from a to b (cube lerp), both ends included */
  lineTo(a, b) {
    const n = G.hex.dist(a, b), p = G.hex.ax(a), q = G.hex.ax(b), out = [];
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0, qf = p[0] + (q[0] - p[0]) * t + 1e-6, rf = p[1] + (q[1] - p[1]) * t + 1e-6, sf = -qf - rf;
      let rq = Math.round(qf), rr = Math.round(rf); const rs = Math.round(sf);
      const dq = Math.abs(rq - qf), dr = Math.abs(rr - rf), ds = Math.abs(rs - sf);
      if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
      out.push(G.hex.off(rq, rr));
    }
    return out;
  },
  /** the neighbour of c whose on-screen direction is nearest the pushed screen direction [mx, my] (view: an E.View) */
  screenStep(c, mx, my, view) {
    const g = view.screenDirToGround(mx, my); if (!g[0] && !g[1]) return null;
    const [x, y] = G.hex.center(c); let best = null, bd = -2;
    for (let d = 0; d < 6; d++) {
      const n = G.hex.step(c, d), [nx, ny] = G.hex.center(n), l = Math.hypot(nx - x, ny - y), dot = ((nx - x) * g[0] + (ny - y) * g[1]) / l;
      if (dot > bd + 1e-6) { bd = dot; best = n; }
    }
    return best;
  }
};

/* ---- the event bus (presentation and tools listen; sims return events instead) ---- */
const BUS = {};
G.on = (name, fn) => { (BUS[name] || (BUS[name] = [])).push(fn); return () => { BUS[name] = BUS[name].filter(f => f !== fn); }; };
G.emit = (name, ...args) => { for (const fn of (BUS[name] || []).slice()) fn(...args); };

/* ---- tunables: one live object the sims read every time; dev-mode sliders edit it ---- */
G.TUNE_DEFAULTS = {
  dmgScale: 1.0, defFactor: 0.5, magicScale: 1.0, healScale: 1.0, baseHit: 85, largeVsSmall: -30, critBase: 3,
  wardPenalty: 0.20, surroundBonus: 0.10, elemStrong: 1.30, elemSame: 0.80, tideBonus: 0.15, forestDef: 0.20,
  statusScale: 1.0, captureBase: 0.25, expScale: 1.5, bells: 12, manaIncome: 1.0, summonCost: 1.0, upkeepScale: 1.0,
  seasonYield: 0.25, winterUpkeep: 0.25, questLuck: 1.0, aiAggression: 1.0, aiManaBonus: 0, aiPlayerBoost: 0,
  candleSeasons: 12, animSpeed: 1.0, hubTurnSeconds: 15
};
// [min, max, step, group, label]
G.TUNE_RANGES = {
  dmgScale: [.25, 3, .05, 'Combat', 'Damage scale'], defFactor: [0, 1, .05, 'Combat', 'Defense factor'],
  baseHit: [50, 100, 1, 'Combat', 'Base hit %'], largeVsSmall: [-60, 0, 1, 'Combat', 'Large vs small hit'],
  critBase: [0, 30, 1, 'Combat', 'Crit base %'], wardPenalty: [0, .6, .01, 'Combat', 'Ward penalty'],
  surroundBonus: [0, .3, .01, 'Combat', 'Surround bonus'], elemStrong: [1, 2, .05, 'Combat', 'Strong element'],
  elemSame: [.5, 1, .05, 'Combat', 'Same element'], tideBonus: [0, .5, .01, 'Combat', 'Seasonal Tide'],
  forestDef: [0, .5, .01, 'Combat', 'Forest defense'], captureBase: [0, 1, .01, 'Combat', 'Capture chance'],
  bells: [4, 20, 1, 'Combat', 'Bells per battle'],
  magicScale: [.25, 3, .05, 'Magic', 'Magic scale'], healScale: [.25, 3, .05, 'Magic', 'Heal scale'],
  statusScale: [0, 2, .05, 'Magic', 'Status chance'],
  expScale: [0, 5, .1, 'Economy', 'EXP scale'], manaIncome: [.25, 3, .05, 'Economy', 'Mana income'],
  summonCost: [.25, 3, .05, 'Economy', 'Summon cost'], upkeepScale: [0, 3, .05, 'Economy', 'Upkeep'],
  seasonYield: [0, 1, .05, 'Economy', 'In-season yield'], winterUpkeep: [0, 1, .05, 'Economy', 'Wintering'],
  questLuck: [0, 2, .05, 'Economy', 'Quest luck'],
  aiAggression: [.5, 2, .05, 'AI', 'AI aggression'], aiManaBonus: [-.5, 1, .05, 'AI', 'AI mana bonus'],
  aiPlayerBoost: [0, 1, .05, 'AI', 'Player boost (tests)'],
  candleSeasons: [4, 30, 1, 'Pacing', 'Candle seasons'], animSpeed: [.25, 4, .05, 'Pacing', 'Animation speed'],
  hubTurnSeconds: [5, 60, 1, 'Pacing', 'Hub turn seconds']
};
G.tune = Object.assign({}, G.TUNE_DEFAULTS);
G.resetTune = () => { Object.assign(G.tune, G.TUNE_DEFAULTS); G.emit('tune'); };
G.setTune = (k, v) => { if (!(k in G.TUNE_DEFAULTS)) throw new Error('no tunable ' + k); const r = G.TUNE_RANGES[k]; G.tune[k] = G.clamp(+v, r[0], r[1]); G.emit('tune', k); };

/* ---- small shared helpers ---- */
G.SEASONS = ['spring', 'summer', 'autumn', 'winter'];
G.SEASON_NAME = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter', hour: 'Hour' };
G.cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
G.sum = (arr, f = x => x) => arr.reduce((a, x) => a + f(x), 0);
G.byKey = (arr, f) => arr.slice().sort((a, b) => { const x = f(a), y = f(b); for (let i = 0; i < x.length; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; } return 0; });

}

// ===== src/01-data-rules.js =====
{
// RULES DATA: elements (the seasons themselves, plus Hour), the Seasonal Tide, terrain and its season transforms,
// the size table and effects. Content only: the sims read these tables.

/* ---- elements: Spring opposes Autumn, Summer opposes Winter; Hour stands apart ---- */
const ELEM = [
  ['spring', 'Spring', '#6abf4b', '#f4b8d0', 'autumn'],
  ['summer', 'Summer', '#e0a020', '#c84a2a', 'winter'],
  ['autumn', 'Autumn', '#c86a1e', '#a85a1e', 'spring'],
  ['winter', 'Winter', '#6ab0e8', '#e8f0f8', 'summer'],
  ['hour', 'Hour', '#b0a8c8', '#d8c070', null],
  ['none', 'Neutral', '#e8e4d8', '#ffffff', null]
];
for (const [id, name, color, accent, opp] of ELEM) G.def('element', id, { name, color, accent, opp });
G.opposes = (a, b) => !!a && !!b && G.get('element', a).opp === b;
G.elemColor = e => (G.has('element', e) ? G.get('element', e).color : '#ffffff');

/* ---- terrain (codes from the battle maps). cost: move cost for a plain walker; null = blocked.
 *  def: DEF bonus (a fraction), eva: evade bonus. Per-unit rules live in G.moveCost. ---- */
const TER = {
  '.': { name: 'Plain', cost: 1, def: 0, eva: 0 },
  ',': { name: 'Road', cost: 1, def: 0, eva: 0 },
  f: { name: 'Forest', cost: 2, def: 'forest', eva: 10 },
  h: { name: 'Hill', cost: 2, def: .10, eva: 5 },
  m: { name: 'Mountain', cost: null, def: .20, eva: 10, perch: true },
  '~': { name: 'Shallows', cost: 2, def: -.10, eva: -10, water: true },
  w: { name: 'Deep water', cost: null, def: 0, eva: 0, water: true, deep: true },
  L: { name: 'Lake', cost: null, def: 0, eva: 0, water: true, deep: true },
  s: { name: 'Swamp', cost: 3, def: -.10, eva: -10 },
  F: { name: 'Field', cost: 1, def: 0, eva: 0 },
  r: { name: 'Ruins', cost: 1, def: .10, eva: 5 },
  '#': { name: 'Rampart', cost: null, def: 0, eva: 0, wall: true },
  g: { name: 'Courtyard', cost: 1, def: .10, eva: 0 },
  b: { name: 'Bridge', cost: 1, def: 0, eva: 0 },
  K: { name: 'Keep', cost: 1, def: 0, eva: 0, keep: true },
  D: { name: 'Season Dial', cost: 1, def: 0, eva: 0, dial: true },
  // transformed kinds (made by seasons and fire)
  n: { name: 'Snow', cost: 2, def: 0, eva: 0, snow: true },
  i: { name: 'Ice', cost: 1, def: 0, eva: -10, ice: true },
  B: { name: 'Burning forest', cost: 2, def: 0, eva: 0, burning: true },
  a: { name: 'Ash', cost: 1, def: 0, eva: 0 },
  W: { name: 'Tall wheat', cost: 1, def: 0, eva: 10 },
  t: { name: 'Stubble', cost: 1, def: 0, eva: 0 },
  d: { name: 'Dried swamp', cost: 1, def: 0, eva: 0 }
};
for (const [code, t] of Object.entries(TER)) G.def('terrain', code, t);

/** the terrain a map code becomes in a season ('flood': the map floods in Spring) */
G.seasonTerrain = (code, season, flood) => {
  switch (season) {
    case 'spring': if (code === '~' && flood) return 'w'; return code;
    case 'summer': if (code === 's') return 'd'; if (code === 'F') return 'W'; return code;
    case 'autumn': if (code === 'F') return 't'; return code;
    case 'winter': if (code === '.' || code === 'F') return 'n'; if (code === '~' || code === 'w' || code === 'L') return 'i'; if (code === 's') return 's'; return code;
  }
  return code;
};

/** move cost of a terrain for a unit ({ flier, swimmer, floater, size, elem }), Infinity if it can't enter; a
 *  flier may cross walls but not end on them (G.canEnd) */
G.moveCost = (code, u, season) => {
  const t = G.get('terrain', code);
  if (u.flier) return 1;
  if (code === 'f') return u.size === 'L' ? 3 : 2;
  if (code === 'h') return 2;
  if (code === '~') return u.swimmer ? 1 : season === 'summer' ? 1 : 2;
  if (code === 'w' || code === 'L') return u.swimmer ? 1 : Infinity;
  if (code === 's') return u.floater ? 1 : season === 'winter' ? 2 : 3;
  if (code === 'n') return u.elem === 'winter' ? 1 : 2;
  if (t.cost === null) return Infinity;
  return t.cost;
};
/** may a unit stop on this terrain? */
G.canEnd = (code, u) => {
  if (code === '#') return false;
  if (code === 'm') return !!u.flier;
  if (code === 'w' || code === 'L') return !!(u.flier || u.swimmer);
  return G.moveCost(code, u, null) < Infinity || u.flier;
};
/** DEF bonus of terrain for the unit standing there (the Keep's +25% only for its owner) */
G.terrainDef = (code, u, keepOwner, season) => {
  const t = G.get('terrain', code);
  if (t.keep) return u && u.side === keepOwner ? .25 : 0;
  if (code === 'f') return season === 'autumn' ? .10 : G.tune.forestDef;
  if (code === 'm') return u && u.flier ? .20 : 0;
  return t.def || 0;
};
G.terrainEva = (code, u) => { const t = G.get('terrain', code); return t.eva || 0; };

/* ---- the size table: attacker row, target column (S, M, L) ---- */
G.sizeHit = (a, d) => {
  const T = { S: { S: 0, M: 0, L: 10 }, M: { S: -10, M: 0, L: 10 }, L: { S: G.tune.largeVsSmall, M: -10, L: 0 } };
  return T[a][d];
};

/* ---- effects: statuses, buffs and debuffs. dur in bells (stop: turns) ---- */
const FX = [
  ['poison', 'Poison', 'status', 3, '#7ad04a'], ['burn', 'Burn', 'status', 2, '#ff7a2a'], ['chill', 'Chill', 'status', 2, '#8ad8ff'],
  ['sleep', 'Sleep', 'status', 2, '#c8b0ff'], ['stop', 'Stop', 'status', 1, '#a8a8b8'],
  ['valor', 'Valor', 'buff', 2, '#ff5a4a'], ['haste', 'Haste', 'buff', 2, '#ffe04a'], ['warded', 'Warded', 'buff', 2, '#4aa0ff'],
  ['guarded', 'Guarded', 'buff', 1, '#d8d8ff'], ['frostarmor', 'Frost Armor', 'buff', 2, '#bfefff'],
  ['weakened', 'Weakened', 'debuff', 2, '#b07ad0'], ['exposed', 'Exposed', 'debuff', 2, '#d07a7a'],
  ['stopimmune', 'Unstoppable', 'hidden', 1, '#888888'], ['untimed', 'Timeless broken', 'hidden', 1, '#ffffff']
];
for (const [id, name, kind, dur, color] of FX) G.def('effect', id, { name, kind, dur, color });

/* ---- seasons in battle: the Tide ---- */
/** damage factor for an attacker of element e in season s (Hour ignores the Tide) */
G.tideOut = (e, s, longWinter, amulet) => {
  if (!e || e === 'hour' || e === 'none' || !s) return 1;
  const bonus = G.tune.tideBonus * (s === 'winter' && longWinter ? 2 : 1) * (amulet ? 2 : 1);
  if (e === s) return 1 + bonus;
  if (G.opposes(e, s)) return 1 - G.tune.tideBonus;
  return 1;
};
/** damage factor for a target of element e in season s */
G.tideIn = (e, s, amulet) => (e && e !== 'hour' && e === s ? 1 - .10 * (amulet ? 2 : 1) : 1);
G.TIDE_LINE = {
  spring: 'SPRING TIDE: Spring +15%, Autumn -15%. Rain: ranged -5 hit.',
  summer: 'SUMMER TIDE: Summer +15%, Winter -15%. Clear: Summer storms burn forests.',
  autumn: 'AUTUMN TIDE: Autumn +15%, Spring -15%. Gales: fliers -1 MOV.',
  winter: 'WINTER TIDE: Winter +15%, Summer -15%. Cold: others -5 hit.'
};

}

// ===== src/02-data-skills.js =====
{
// SKILLS AND SPELLS (90). A skill: { name, kind: special | spell | passive, elem ('user' = the user's own, null =
// none, 'none' = ignores elements), p (power: a multiplier for physical, a base for magic and heals), magic (true: the
// magic formula), heal (a base amount, or { pct } of max HP), range [min, max] or 'self', area (single r1 r2 self-r1
// self-r2 adj cone2 cone3 line3 line4 troop ward), who (foes allies all ally ownMonster self), mp, mobile (usable after
// moving), needMove (hexes moved first), status [id, base chance], buff [[id, bells]], fx (art), and rule flags.
// Areas: r1/r2 = the target and every hex within 1/2; self-r1/self-r2 = around the user; adj = the 6 around the user;
// cone2/cone3 = a 120-degree wedge; line3/line4 = a straight hex line from the user.

const S = (id, o) => G.def('skill', id, Object.assign({ kind: 'special', elem: null, p: 0, range: [1, 1], area: 'single', who: 'foes', mp: 0, mobile: false }, o));

// warrior line
S('rally', { name: 'Rally', range: 'self', area: 'self-r1', who: 'allies', mp: 4, mobile: true, buff: [['valor', 2]], fx: 'buff', anim: 'cheer', desc: 'Valor (ATK +20%) to allies around' });
S('charge', { name: 'Charge', elem: 'user', p: 1.3, mp: 5, mobile: true, needMove: 2, fx: 'slash', anim: 'thrust', desc: 'A 1.3x blow; move 2+ hexes first' });
S('shieldwall', { name: 'Shield Wall', range: 'self', area: 'adj', who: 'allies', mp: 6, mobile: true, buff: [['warded', 1]], fx: 'buff', anim: 'block', desc: 'Warded to the allies beside you' });
S('holystrike', { name: 'Holy Strike', elem: 'none', p: 1.5, mp: 8, mobile: true, vsHour: 1.5, fx: 'holy', anim: 'overhead', desc: 'A 1.5x holy blow, x1.5 against Hour' });
S('layonhands', { name: 'Lay on Hands', heal: 60, who: 'ally', mp: 10, mobile: true, fx: 'heal', anim: 'cast', desc: 'Heals an adjacent ally 60' });
// ranger line
S('aimedshot', { name: 'Aimed Shot', elem: 'user', p: 1.2, range: [2, 4], mp: 4, hitBonus: 20, ranged: true, fx: 'arrow', anim: 'throw', desc: '+20 hit, 1.2x' });
S('volley', { name: 'Volley', elem: 'user', p: .8, range: [3, 5], area: 'r1', mp: 8, ranged: true, fx: 'volley', anim: 'throw', desc: 'Arrows rain on an area' });
S('pinning', { name: 'Pinning Shot', elem: 'user', p: .9, range: [2, 4], mp: 6, mobile: true, status: ['chill', 70], ranged: true, fx: 'arrow', anim: 'throw', desc: 'Chills the target' });
S('piercing', { name: 'Piercing Arrow', elem: 'user', p: 1.1, range: 'self', area: 'line4', mp: 10, ranged: true, fx: 'pierce', anim: 'throw', desc: 'Hits every unit on a line' });
S('eagleeye', { name: 'Eagle Eye', kind: 'passive', desc: 'Bows +1 max range' });
// bolts (tier 1 element spells)
const BOLTS = [['bramble', 'Bramble', 'spring'], ['cinder', 'Cinder', 'summer'], ['galeleaves', 'Gale of Leaves', 'autumn'], ['hoarfrost', 'Hoarfrost', 'winter'], ['timeshear', 'Time Shear', 'hour']];
for (const [id, name, el] of BOLTS) S(id, { name, kind: 'spell', elem: el, p: 14, magic: true, range: [1, 4], mp: 5, noTide: el === 'hour', fx: 'bolt', anim: 'cast', desc: 'A ' + G.cap(el) + ' bolt' });
// hexes (status spells)
const HEXES = [['drowse', 'Drowse', 'spring', 'sleep', 60], ['kindle', 'Kindle', 'summer', 'burn', 70], ['rot', 'Rot', 'autumn', 'poison', 70], ['frostbite', 'Frostbite', 'winter', 'chill', 70], ['stophex', 'Stop', 'hour', 'stop', 40]];
for (const [id, name, el, st, ch] of HEXES) S(id, { name, kind: 'spell', elem: el, range: [1, 4], mp: 6, status: [st, ch], fx: 'hex', anim: 'cast', desc: G.get('effect', st).name + ' ' + ch + '%' });
// storms (tier 2)
const STORMS = [['bramblestorm', 'Bramble Storm', 'spring'], ['cinderstorm', 'Cinder Storm', 'summer'], ['leafstorm', 'Leaf Storm', 'autumn'], ['froststorm', 'Frost Storm', 'winter'], ['hourstorm', 'Hour Storm', 'hour']];
for (const [id, name, el] of STORMS) S(id, { name, kind: 'spell', elem: el, p: 22, magic: true, range: [1, 4], area: 'r1', who: 'all', mp: 10, burnsForest: el === 'summer', fx: 'storm', anim: 'cast', desc: 'A ' + G.cap(el) + ' storm; hits friends too' });
// tempests (tier 3)
S('verdanttempest', { name: 'Verdant Tempest', kind: 'spell', elem: 'spring', p: 34, magic: true, range: [1, 5], area: 'r2', who: 'all', mp: 16, status: ['sleep', 20], fx: 'tempest', anim: 'cast', desc: 'A great storm of blossoms; Sleep 20%' });
S('solarflare', { name: 'Solar Flare', kind: 'spell', elem: 'summer', p: 34, magic: true, range: [1, 5], area: 'r2', who: 'all', mp: 16, status: ['burn', 30], burnsForest: true, fx: 'tempest', anim: 'cast', desc: 'A falling sun; Burn 30%' });
S('harvestmoon', { name: 'Harvest Moon', kind: 'spell', elem: 'autumn', p: 34, magic: true, range: [1, 5], area: 'r2', who: 'all', mp: 16, drainPct: .25, fx: 'tempest', anim: 'cast', desc: 'The moon floods them; drains 25%' });
S('blizzard', { name: 'Blizzard', kind: 'spell', elem: 'winter', p: 34, magic: true, range: [1, 5], area: 'r2', who: 'all', mp: 16, status: ['chill', 30], fx: 'tempest', anim: 'cast', desc: 'A white-out; Chill 30%' });
// mage and cleric support
S('manasiphon', { name: 'Mana Siphon', kind: 'spell', range: [1, 4], mp: 2, siphon: 12, fx: 'hex', anim: 'cast', desc: 'Steals 12 MP' });
S('haste', { name: 'Haste', kind: 'spell', range: [0, 3], who: 'ally', mp: 8, buff: [['haste', 2]], fx: 'buff', anim: 'cast', desc: 'MOV +1, AGI +20% for 2 bells' });
S('mend', { name: 'Mend', kind: 'spell', heal: 30, range: [0, 3], who: 'ally', mp: 5, fx: 'heal', anim: 'cast', desc: 'Heals 30' });
S('purify', { name: 'Purify', kind: 'spell', range: [0, 3], who: 'ally', mp: 4, cleanse: true, fx: 'heal', anim: 'cast', desc: 'Clears statuses and debuffs' });
S('renewal', { name: 'Renewal', kind: 'spell', heal: 24, range: [0, 3], area: 'r1', who: 'allies', mp: 10, fx: 'heal', anim: 'cast', desc: 'Heals 24 around a point' });
S('wardofseasons', { name: 'Ward of Seasons', kind: 'spell', range: [0, 3], area: 'r1', who: 'allies', mp: 9, buff: [['warded', 2]], fx: 'buff', anim: 'cast', desc: 'Warded to allies around a point' });
S('greaterrenewal', { name: 'Greater Renewal', kind: 'spell', heal: 36, range: [0, 4], area: 'r2', who: 'allies', mp: 16, fx: 'heal', anim: 'cast', desc: 'Heals 36 over a wide area' });
S('dawnlight', { name: 'Dawnlight', kind: 'spell', elem: 'none', p: 26, magic: true, range: [1, 4], area: 'r1', who: 'foes', mp: 14, vsHour: 1.5, noTide: true, fx: 'holy', anim: 'cast', desc: 'Holy light on foes; x1.5 vs Hour' });
// beast line
S('goad', { name: 'Goad', range: [1, 2], who: 'ownMonster', mp: 3, mobile: true, buff: [['valor', 1], ['haste', 1]], fx: 'buff', anim: 'wave', desc: 'Valor and Haste to one of your monsters' });
S('packtactics', { name: 'Pack Tactics', kind: 'passive', desc: "The knight's monsters +10 hit" });
S('roar', { name: 'Roar', range: 'self', area: 'self-r2', mp: 6, mobile: true, status: ['weakened', 60], fx: 'roar', anim: 'hips', desc: 'Weakens foes around' });
S('callofwild', { name: 'Call of the Wild', range: 'self', area: 'troop', who: 'ownMonsters', heal: { pct: .2 }, mp: 12, mobile: true, fx: 'heal', anim: 'cheer', desc: "Heals the troop's monsters 20%" });
S('bondoffang', { name: 'Bond of Fang', range: 'ward', who: 'ownMonster', mp: 10, mobile: true, buff: [['valor', 2], ['warded', 2], ['haste', 2]], fx: 'buff', anim: 'wave', desc: 'Valor, Warded and Haste to one monster in Ward' });
// rulers
S('verdantoath', { name: 'Verdant Oath', elem: 'spring', range: 'self', area: 'ward', who: 'allies', heal: { pct: .1 }, mp: 10, mobile: true, buff: [['warded', 2]], fx: 'buff', anim: 'cheer', desc: 'Heals 10% and wards allies in Ward' });
S('warcry', { name: 'Warcry', elem: 'summer', range: 'self', area: 'ward', who: 'allies', mp: 8, mobile: true, buff: [['valor', 2]], fx: 'roar', anim: 'cheer', desc: 'Valor to allies in Ward' });
S('quietcounsel', { name: 'Quiet Counsel', elem: 'autumn', range: 'self', area: 'ward', who: 'allies', mp: 10, mobile: true, buff: [['haste', 1]], fx: 'buff', anim: 'cast', desc: 'Haste to allies in Ward' });
S('reaping', { name: 'Reaping', kind: 'spell', elem: 'autumn', p: 20, magic: true, range: [1, 3], mp: 8, drainPct: .5, fx: 'bolt', anim: 'cast', desc: 'Heals the caster half the damage' });
S('madgambit', { name: 'Mad Gambit', elem: 'winter', p: 30, magic: true, range: [1, 3], mp: 6, mobile: true, misfire: .25, fx: 'bolt', anim: 'spin', desc: 'A wild bolt; 25%: it Chills the Duke' });
S('frozenhour', { name: 'Frozen Hour', kind: 'spell', elem: 'winter', range: [1, 4], mp: 12, status: ['stop', 70], fx: 'hex', anim: 'cast', desc: 'Stop 70%' });
S('restore', { name: 'Restore', kind: 'spell', elem: 'hour', heal: { pct: .5 }, range: [0, 3], who: 'ally', mp: 14, fx: 'heal', anim: 'cast', desc: 'Heals 50% of max HP' });
S('turning', { name: 'Turning', elem: 'none', p: 40, magic: true, range: [1, 3], area: 'r1', who: 'foes', mp: 0, oncePerBattle: true, mobile: true, vsHour: 2, breaksTimeless: true, fx: 'holy', anim: 'cast', desc: 'Once a battle: x2 vs Hour; breaks Timeless' });
S('ambush', { name: 'Ambush', kind: 'passive', desc: '+30% damage attacking from a forest' });
// the Gray Knight
S('thirteenthstroke', { name: 'Thirteenth Stroke', elem: 'hour', p: 1.6, area: 'r1', who: 'foes', mp: 0, mobile: true, fx: 'hourslash', anim: 'twohand', desc: 'A blow that strikes the hour' });
S('still', { name: 'Still', elem: 'hour', range: 'self', area: 'self-r2', mp: 0, mobile: true, status: ['stop', 70], every: 3, fx: 'hex', anim: 'spin', desc: 'Stop 70% around; every 3rd bell' });
S('unmaking', { name: 'Unmaking', kind: 'spell', elem: 'hour', range: [1, 3], mp: 20, unmake: .25, fx: 'bolt', anim: 'plunge', desc: '25% of max HP; ignores defense' });
S('timeless', { name: 'Timeless', kind: 'passive', desc: 'Immune to effects and the Tide; half damage until the Wheel turns' });
// monsters
S('pollenpuff', { name: 'Pollen Puff', elem: 'spring', range: 'self', area: 'self-r1', mp: 6, mobile: true, status: ['sleep', 50], fx: 'hex', anim: 'puff', desc: 'Sleep 50% around' });
S('entangle', { name: 'Entangle', elem: 'spring', p: .6, range: [1, 2], mp: 5, status: ['chill', 70], fx: 'vine', anim: 'cast', desc: 'Vines; Chill 70%' });
S('scream', { name: 'Mandrake Scream', elem: 'spring', range: 'self', area: 'self-r2', mp: 10, status: ['sleep', 50], fx: 'roar', anim: 'roar', desc: 'Sleep 50% in a wide ring' });
S('sleepdust', { name: 'Sleep Dust', kind: 'spell', elem: 'spring', range: [1, 3], area: 'r1', mp: 8, status: ['sleep', 60], fx: 'hex', anim: 'cast', desc: 'Sleep 60% on an area' });
S('thorns', { name: 'Thorns', kind: 'passive', desc: 'Melee attackers take 10% of the damage they deal' });
S('rootsweep', { name: 'Root Sweep', elem: 'spring', p: .9, range: 'self', area: 'adj', mp: 6, mobile: true, fx: 'vine', anim: 'stomp', desc: 'Hits every foe beside it' });
S('dive', { name: 'Dive', elem: 'user', p: 1.2, mp: 4, mobile: true, needMove: 2, fliers: true, fx: 'slash', anim: 'dive', desc: 'A diving strike; move 2+ first' });
S('torrent', { name: 'Torrent', elem: 'spring', p: 1.0, range: 'self', area: 'line3', mp: 6, fx: 'water', anim: 'breath', desc: 'A jet of water along a line' });
S('coil', { name: 'Coil', elem: 'user', p: .8, mp: 4, mobile: true, status: ['chill', 60], fx: 'slash', anim: 'coil', desc: 'Constricts; Chill 60%' });
S('emberspit', { name: 'Ember Spit', elem: 'summer', p: .9, range: [1, 2], mp: 3, mobile: true, status: ['burn', 30], fx: 'fire', anim: 'breath', desc: 'Burn 30%' });
S('firebreath', { name: 'Fire Breath', elem: 'summer', p: 1.2, range: 'self', area: 'cone2', mp: 8, status: ['burn', 25], always: true, burnsForest: true, fx: 'breath', anim: 'breath', desc: 'A cone of fire; Burn 25%' });
S('howl', { name: 'Howl', range: 'self', area: 'self-r2', who: 'allies', mp: 5, mobile: true, buff: [['valor', 1]], fx: 'roar', anim: 'roar', desc: 'Valor to the pack' });
S('pounce', { name: 'Pounce', elem: 'user', p: 1.2, mp: 5, mobile: true, fx: 'slash', anim: 'pounce', desc: 'A leaping 1.2x strike' });
S('rebirth', { name: 'Rebirth', kind: 'passive', desc: 'Once a battle, rises from 0 HP with 30%' });
S('sunriddle', { name: 'Sun Riddle', elem: 'summer', range: 'self', area: 'self-r1', mp: 8, status: ['sleep', 50], fx: 'hex', anim: 'roar', desc: 'A riddle that puts foes to sleep' });
S('wispfire', { name: 'Wisp Fire', elem: 'autumn', p: 12, magic: true, range: [1, 3], mp: 4, mobile: true, fx: 'bolt', anim: 'cast', desc: 'A ghost flame' });
S('fear', { name: 'Fear', elem: 'autumn', range: 'self', area: 'self-r1', mp: 5, mobile: true, status: ['weakened', 60], fx: 'hex', anim: 'roar', desc: 'Weakens foes around' });
S('drain', { name: 'Drain', elem: 'user', p: 1.0, mp: 4, mobile: true, drainPct: .5, fx: 'drain', anim: 'bite', desc: 'Heals half the damage' });
S('gravechill', { name: 'Grave Chill', elem: 'winter', range: 'self', area: 'self-r1', mp: 7, status: ['chill', 40], fx: 'hex', anim: 'cast', desc: 'Chill 40% around' });
S('gale', { name: 'Gale', elem: 'autumn', p: .7, mp: 5, mobile: true, push: 1, fx: 'wind', anim: 'claw', desc: 'Pushes the target a hex' });
S('trample', { name: 'Trample', elem: 'user', p: 1.0, range: 'self', area: 'line3', mp: 6, mobile: true, fx: 'slash', anim: 'gore', desc: 'Tramples a line' });
S('thickhide', { name: 'Thick Hide', kind: 'passive', desc: 'DEF +10%' });
S('frostarmor', { name: 'Frost Armor', elem: 'winter', range: 'self', area: 'self', who: 'self', mp: 5, mobile: true, buff: [['frostarmor', 2]], fx: 'buff', anim: 'block', desc: 'DEF +40% for 2 bells' });
S('avalanche', { name: 'Avalanche', elem: 'winter', p: 1.0, range: [1, 2], area: 'r1', mp: 9, fx: 'ice', anim: 'stomp', desc: 'Snow crashes on an area' });
S('hurlice', { name: 'Hurl Ice', elem: 'winter', p: 1.0, range: [2, 3], mp: 5, ranged: true, fx: 'ice', anim: 'throw', desc: 'A thrown block of ice' });
S('frostfang', { name: 'Frost Fang', kind: 'passive', desc: 'Basic attacks Chill 30%' });
S('frostbreath', { name: 'Frost Breath', elem: 'winter', p: 1.2, range: 'self', area: 'cone3', mp: 8, status: ['chill', 40], always: true, fx: 'breath', anim: 'breath', desc: 'A cone of frost; Chill 40%' });
S('tailsweep', { name: 'Tail Sweep', elem: 'user', p: .9, range: 'self', area: 'adj', mp: 6, mobile: true, fx: 'slash', anim: 'tailsweep', desc: 'Sweeps every foe beside it' });
S('windup', { name: 'Wind-up', range: 'self', area: 'self', who: 'self', mp: 3, mobile: true, windup: true, fx: 'buff', anim: 'block', desc: 'Its next basic attack x1.5' });
S('pendulum', { name: 'Pendulum', elem: 'hour', p: 1.1, range: 'self', area: 'adj', mp: 6, mobile: true, fx: 'hourslash', anim: 'tailsweep', desc: 'A swinging blow on all beside it' });
S('stopbite', { name: 'Stopping Bite', kind: 'passive', desc: 'Basic attacks Stop 20%' });
S('engulf', { name: 'Engulf', elem: 'user', p: .9, mp: 4, mobile: true, status: ['poison', 40], fx: 'drain', anim: 'bite', desc: 'Poison 40%' });
S('regenerate', { name: 'Regenerate', kind: 'passive', desc: 'Heals 10% of max HP each turn' });
S('groundpound', { name: 'Ground Pound', elem: 'user', p: 1.0, range: 'self', area: 'adj', mp: 7, mobile: true, fx: 'quake', anim: 'stomp', desc: 'Shakes every foe beside it' });
S('screech', { name: 'Screech', range: 'self', area: 'self-r1', mp: 5, mobile: true, status: ['weakened', 60], fx: 'roar', anim: 'roar', desc: 'Weakens foes around' });

/** the element's spell of a tier: 'bolt' | 'hex' | 'storm' | 'tempest' */
G.elemSpell = (tier, el) => {
  const i = ['spring', 'summer', 'autumn', 'winter', 'hour'].indexOf(el);
  if (i < 0) return null;
  if (tier === 'bolt') return BOLTS[i][0];
  if (tier === 'hex') return HEXES[i][0];
  if (tier === 'storm') return STORMS[i][0];
  if (tier === 'tempest') return ['verdanttempest', 'solarflare', 'harvestmoon', 'blizzard', 'hourstorm'][i];
  return null;
};

}

// ===== src/03-data-classes.js =====
{
// KNIGHT CLASSES (23): 5 lines x 3 tiers, 5 ruler classes, the Hourmaiden, the Gray Knight and the Brigand Captain.
// Stat rule: tier 1 stat(L) = base + growth x (L - 1). At a class change every stat (MP too) x1.10; after it, growth is
// x1.15 (tier 2) or x1.30 (tier 3) of the line's tier-1 growth. Bond = class bond + floor(level / 4).
// skills: [[skill id, level]]; elemSkills: [[tier, level]] are the knight's own element's spells (G.elemSpell).

const STATS = ['hp', 'mp', 'atk', 'def', 'int', 'agi'];
G.STATS = STATS;
const C = (id, o) => G.def('class', id, Object.assign({ tier: 1, skills: [], elemSkills: [], unique: false }, o));
const v = a => Object.fromEntries(STATS.map((k, i) => [k, a[i]]));

// warrior line
C('squire', { name: 'Squire', line: 'warrior', tier: 1, weapons: ['sword', 'spear', 'axe'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, mov: 5, ward: 2, bond: 5, base: v([70, 8, 17, 15, 7, 11]), growth: v([7, .6, 1.6, 1.4, .4, .9]), skills: [['rally', 3]], next: 'knight', look: { armor: true } });
C('knight', { name: 'Knight', line: 'warrior', tier: 2, weapons: ['sword', 'spear', 'axe'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, mov: 5, ward: 3, bond: 7, root: 'squire', skills: [['rally', 3], ['charge', 10], ['shieldwall', 14]], next: 'paladin' });
C('paladin', { name: 'Paladin', line: 'warrior', tier: 3, weapons: ['sword', 'spear'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, mov: 5, ward: 3, bond: 9, root: 'squire', skills: [['rally', 3], ['charge', 10], ['shieldwall', 14], ['holystrike', 20], ['layonhands', 24]] });
// ranger line
C('archer', { name: 'Archer', line: 'ranger', tier: 1, weapons: ['bow'], basic: { name: 'Shoot', p: .9, range: [2, 4], ranged: true, anim: 'throw' }, mov: 5, ward: 2, bond: 4, base: v([58, 10, 16, 10, 9, 15]), growth: v([5.5, .8, 1.5, .9, .6, 1.3]), skills: [['aimedshot', 4]], next: 'ranger' });
C('ranger', { name: 'Ranger', line: 'ranger', tier: 2, weapons: ['bow'], basic: { name: 'Shoot', p: .9, range: [2, 4], ranged: true, anim: 'throw' }, mov: 5, ward: 3, bond: 6, root: 'archer', skills: [['aimedshot', 4], ['volley', 10], ['pinning', 14]], next: 'sentinel' });
C('sentinel', { name: 'Sentinel', line: 'ranger', tier: 3, weapons: ['bow'], basic: { name: 'Shoot', p: .9, range: [2, 5], ranged: true, anim: 'throw' }, mov: 5, ward: 3, bond: 7, root: 'archer', skills: [['aimedshot', 4], ['volley', 10], ['pinning', 14], ['piercing', 20], ['eagleeye', 24]] });
// mage line
C('adept', { name: 'Adept', line: 'mage', tier: 1, weapons: ['staff', 'tome'], basic: { name: 'Strike', p: .6, range: [1, 1], anim: 'overhead' }, mov: 4, ward: 2, bond: 4, base: v([50, 30, 8, 8, 18, 11]), growth: v([4.5, 2.2, .5, .7, 1.8, .9]), elemSkills: [['bolt', 1], ['hex', 6]], next: 'sorcerer' });
C('sorcerer', { name: 'Sorcerer', line: 'mage', tier: 2, weapons: ['staff', 'tome'], basic: { name: 'Strike', p: .6, range: [1, 1], anim: 'overhead' }, mov: 4, ward: 3, bond: 6, root: 'adept', elemSkills: [['bolt', 1], ['hex', 6], ['storm', 10]], skills: [['manasiphon', 14]], next: 'archmage' });
C('archmage', { name: 'Archmage', line: 'mage', tier: 3, weapons: ['staff', 'tome'], basic: { name: 'Strike', p: .6, range: [1, 1], anim: 'overhead' }, mov: 4, ward: 3, bond: 7, root: 'adept', elemSkills: [['bolt', 1], ['hex', 6], ['storm', 10], ['tempest', 20]], skills: [['manasiphon', 14], ['haste', 24]] });
// cleric line
C('acolyte', { name: 'Acolyte', line: 'cleric', tier: 1, weapons: ['mace', 'staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, mov: 4, ward: 3, bond: 5, base: v([55, 26, 10, 10, 15, 10]), growth: v([5, 2, .7, .9, 1.5, .8]), skills: [['mend', 1], ['purify', 5]], next: 'priest' });
C('priest', { name: 'Priest', line: 'cleric', tier: 2, weapons: ['mace', 'staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, mov: 4, ward: 3, bond: 7, root: 'acolyte', skills: [['mend', 1], ['purify', 5], ['renewal', 10], ['wardofseasons', 14]], next: 'hierophant' });
C('hierophant', { name: 'Hierophant', line: 'cleric', tier: 3, weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, mov: 4, ward: 4, bond: 8, root: 'acolyte', skills: [['mend', 1], ['purify', 5], ['renewal', 10], ['wardofseasons', 14], ['greaterrenewal', 20], ['dawnlight', 24]] });
// beast line
C('tamer', { name: 'Tamer', line: 'beast', tier: 1, weapons: ['whip', 'spear'], basic: { name: 'Lash', p: .8, range: [1, 2], anim: 'backslash', whip: true }, mov: 5, ward: 3, bond: 7, base: v([62, 12, 14, 12, 10, 13]), growth: v([6, .9, 1.2, 1.1, .7, 1.1]), skills: [['goad', 3]], next: 'beastlord' });
C('beastlord', { name: 'Beastlord', line: 'beast', tier: 2, weapons: ['whip', 'spear'], basic: { name: 'Lash', p: .8, range: [1, 2], anim: 'backslash', whip: true }, mov: 5, ward: 4, bond: 10, root: 'tamer', skills: [['goad', 3], ['packtactics', 10], ['roar', 14]], next: 'beastsovereign' });
C('beastsovereign', { name: 'Beast Sovereign', line: 'beast', tier: 3, weapons: ['spear', 'whip'], basic: { name: 'Lash', p: .8, range: [1, 2], anim: 'backslash', whip: true }, mov: 5, ward: 4, bond: 13, root: 'tamer', skills: [['goad', 3], ['packtactics', 10], ['roar', 14], ['callofwild', 20], ['bondoffang', 24]] });
// rulers
C('springwarden', { name: 'Springwarden', line: 'ruler', tier: 2, unique: true, weapons: ['sword'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, mov: 5, ward: 4, bond: 10, base: v([75, 22, 17, 15, 15, 14]), growth: v([7, 1.5, 1.5, 1.3, 1.3, 1.1]), skills: [['mend', 1], ['charge', 1], ['verdantoath', 6], ['bramblestorm', 10], ['verdanttempest', 16]], sig: ['rising', 'slash'] });
C('sunsovereign', { name: 'Sun Sovereign', line: 'ruler', tier: 2, unique: true, weapons: ['greatsword', 'sword'], basic: { name: 'Cleave', p: 1.1, range: [1, 1], anim: 'twohand' }, mov: 5, ward: 4, bond: 11, base: v([85, 14, 21, 16, 10, 12]), growth: v([8, 1, 1.9, 1.4, .8, 1]), skills: [['charge', 1], ['warcry', 6], ['cinderstorm', 10], ['solarflare', 16]], sig: ['twohand', 'spin'] });
C('harvestking', { name: 'Harvest King', line: 'ruler', tier: 2, unique: true, weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'overhead' }, mov: 4, ward: 5, bond: 10, base: v([68, 30, 11, 13, 20, 10]), growth: v([6, 2, .8, 1.2, 1.8, .8]), skills: [['mend', 1], ['galeleaves', 1], ['quietcounsel', 6], ['harvestmoon', 12], ['reaping', 16]], sig: ['cast'] });
C('rimeduke', { name: 'Rime Duke', line: 'ruler', tier: 2, unique: true, weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'spin' }, mov: 4, ward: 4, bond: 10, base: v([70, 28, 15, 13, 19, 13]), growth: v([6.5, 1.8, 1.3, 1.1, 1.7, 1]), skills: [['hoarfrost', 1], ['madgambit', 6], ['froststorm', 10], ['frozenhour', 12], ['blizzard', 16]], sig: ['spin'] });
C('chancellor', { name: 'Chancellor of Hours', line: 'ruler', tier: 2, unique: true, weapons: ['rod', 'staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'cast' }, mov: 4, ward: 4, bond: 12, base: v([80, 34, 12, 15, 22, 12]), growth: v([7, 2, 1, 1.4, 1.9, .9]), skills: [['timeshear', 1], ['stophex', 1], ['restore', 6], ['hourstorm', 10]], sig: ['cast'] });
C('hourmaiden', { name: 'Hourmaiden', line: 'unique', tier: 2, unique: true, weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, mov: 5, ward: 3, bond: 6, base: v([58, 34, 9, 11, 19, 15]), growth: v([5, 2.2, .6, 1, 1.8, 1.2]), skills: [['mend', 1], ['haste', 1], ['turning', 8]] });
C('graynight', { name: 'Knight of the Thirteenth Hour', line: 'boss', tier: 3, unique: true, weapons: ['sword'], basic: { name: 'Slash', p: 1.2, range: [1, 1], anim: 'plunge' }, mov: 5, ward: 5, bond: 30, base: v([420, 200, 38, 32, 36, 24]), growth: v([0, 0, 0, 0, 0, 0]), skills: [['thirteenthstroke', 1], ['still', 1], ['unmaking', 1], ['timeless', 1]], fixed: true, sig: ['plunge', 'twohand', 'spin'] });
C('brigand', { name: 'Brigand Captain', line: 'unique', tier: 1, unique: true, weapons: ['axe', 'sword'], basic: { name: 'Hack', p: 1.05, range: [1, 1], anim: 'overhead' }, mov: 5, ward: 3, bond: 8, base: v([72, 6, 18, 13, 6, 12]), growth: v([7, .4, 1.6, 1.2, .3, 1]), skills: [['charge', 1], ['ambush', 1]] });

G.LINES = { warrior: ['squire', 'knight', 'paladin'], ranger: ['archer', 'ranger', 'sentinel'], mage: ['adept', 'sorcerer', 'archmage'], cleric: ['acolyte', 'priest', 'hierophant'], beast: ['tamer', 'beastlord', 'beastsovereign'] };
/** tier-1 class of a class's line (the stat root) */
G.classRoot = cls => { const c = G.get('class', cls); return c.root || cls; };
/** expected stats of a class at a level (knights who start at tier 2 or 3 are built as if they changed at 10 and 20) */
G.classStats = (cls, level) => {
  const c = G.get('class', cls), root = G.get('class', G.classRoot(cls)), out = {};
  for (const k of STATS) {
    const b = root.base[k], g = root.growth[k];
    if (c.fixed || c.tier === 1 || !c.root) { out[k] = b + g * (level - 1); continue; }
    let s = (b + g * (Math.min(level, 10) - 1)) * 1.1;
    if (c.tier === 2) s += g * 1.15 * Math.max(0, level - 10);
    else { s += g * 1.15 * Math.max(0, Math.min(level, 20) - 10); s = s * 1.1 + g * 1.3 * Math.max(0, level - 20); }
    out[k] = s;
  }
  for (const k of STATS) out[k] = Math.round(out[k]);
  return out;
};
/** the growth a class applies per level */
G.classGrowth = cls => {
  const c = G.get('class', cls), root = G.get('class', G.classRoot(cls)), m = !c.root || c.tier === 1 ? 1 : c.tier === 2 ? 1.15 : 1.30, out = {};
  for (const k of STATS) out[k] = root.growth[k] * m;
  return out;
};
/** the skills a knight of this class, element and level knows */
G.classSkills = (cls, elem, level) => {
  const c = G.get('class', cls), out = [];
  for (const [tier, lv] of c.elemSkills) if (level >= lv) { const s = G.elemSpell(tier, elem); if (s && !out.includes(s)) out.push(s); }
  for (const [id, lv] of c.skills) if (level >= lv && !out.includes(id)) out.push(id);
  return out;
};

}

// ===== src/04-data-monsters.js =====
{
// THE BESTIARY: 30 species, 3 forms each. Tier 2 = tier 1 x1.35 (HP, MP, ATK, DEF, INT), AGI +2; tier 3 = x1.75, AGI
// +4, MOV +1 for fliers. At level L every stat (not MOV) is round(formBase x (1 + 0.05 (L - 1))). Rank is the bond cost
// and never changes; upkeep is x1.5 at tier 2 and x2 at tier 3. Each form keeps the skills before it and adds its own.
// rig: how it is drawn (33-art-units.js): { kind: 'blob' | 'humanoid' | 'beast', ...the rig's own spec, per form }.
// flags: fl flier, sw swimmer, fo floater; flags2/flags3 are added at tier 2 / 3.

const M = (id, o) => G.def('monster', id, o);
const st = a => ({ hp: a[0], mp: a[1], atk: a[2], def: a[3], int: a[4], agi: a[5], mov: a[6] });

// Spring
M('sproutling', { names: ['Sproutling', 'Bloomkin', 'Mandragora'], elem: 'spring', size: ['S', 'S', 'S'], rank: 1, flags: '', base: st([38, 12, 12, 9, 12, 13, 4]), basic: { name: 'Headbutt', p: 1, range: [1, 1] }, skills: [['pollenpuff'], ['entangle'], ['scream']], cost: 30, upkeep: 2, voice: 'chirp',
  rig: { kind: 'blob', R: [6, 7, 8], over: 'sprout', colors: [{ dk: '#3a6a2a', base: '#6abf4b', lt: '#9ad86a', spec: '#e8ffd0', eye: '#1a2a10' }, { dk: '#3a6a3a', base: '#7ad070', lt: '#f4b8d0', spec: '#ffffff', eye: '#1a2a10' }, { dk: '#5a3a2a', base: '#8a6a4a', lt: '#c8a070', spec: '#f0e0c0', eye: '#ff4a4a' }] } });
M('pixie', { names: ['Pixie', 'Sylph', 'Faerie Queen'], elem: 'spring', size: ['S', 'S', 'M'], rank: 1, flags: 'fl', base: st([30, 24, 8, 6, 16, 20, 6]), basic: { name: 'Prick', p: .7, range: [1, 1] }, skills: [['mend'], ['haste'], ['sleepdust']], cost: 45, upkeep: 3, voice: 'chirp',
  rig: { kind: 'humanoid', size: [.55, .6, .8], build: 'chibi', wings: 'insect', glow: '#f4f8b0', look: [{ outfit: 'tunic', hair: 'spiky', weapon: null, colors: { cloth: '#8ad870', hair: '#f8e070', skin: '#f8e0d0', pants: '#6ab050' } }, { outfit: 'robe', hair: 'long', weapon: null, colors: { cloth: '#b8f0e0', hair: '#a8f0ff', skin: '#f0e8ff', pants: '#90d8c8' } }, { outfit: 'robe', hair: 'long', hat: 'crown', weapon: 'staff', colors: { cloth: '#f4b8d0', hair: '#fff0a0', skin: '#fff0f0', pants: '#e090b0', trim: '#ffd040' } }] } });
M('treant', { names: ['Thornback Treant', 'Elder Treant', 'Worldroot'], elem: 'spring', size: ['L', 'L', 'L'], rank: 4, flags: '', base: st([120, 10, 22, 22, 8, 5, 3]), basic: { name: 'Slam', p: 1.1, range: [1, 1] }, skills: [['thorns', 'entangle'], ['renewal'], ['rootsweep']], cost: 120, upkeep: 8, voice: 'roar',
  rig: { kind: 'humanoid', size: [1.5, 1.6, 1.75], build: 'bulky', hunch: .3, look: [{ outfit: 'coat', hair: 'spiky', weapon: null, colors: { skin: '#6a4a2a', cloth: '#5a3a1e', coat: '#4a3018', hair: '#5aa040', pants: '#4a3018', boot: '#3a2410', eye: '#ffe060' } }, { outfit: 'coat', hair: 'spiky', weapon: null, colors: { skin: '#5a4a32', cloth: '#4a3a22', coat: '#3a2a16', hair: '#f4b8d0', pants: '#3a2a16', boot: '#2a1a0a', eye: '#ffe060' } }, { outfit: 'coat', hair: 'long', hat: 'crown', weapon: null, colors: { skin: '#4a3a28', cloth: '#3a2a18', coat: '#2a1e10', hair: '#3a8a3a', pants: '#2a1e10', boot: '#1a1208', eye: '#a0ff80', trim: '#6abf4b' } }] } });
M('unicorn', { names: ['Unicorn', 'Alicorn', 'Dawnhorn'], elem: 'spring', size: ['M', 'M', 'L'], rank: 3, flags: '', flags2: 'fl', base: st([80, 20, 19, 14, 14, 16, 6]), basic: { name: 'Gore', p: 1.1, range: [1, 1] }, skills: [['charge', 'mend'], ['dive'], ['dawnlight']], cost: 90, upkeep: 5, voice: 'neigh',
  rig: { kind: 'beast', preset: 'horse', parts: [{ horn: true, mane: true }, { horn: true, mane: true, wings: 'feather' }, { horn: true, mane: true, wings: 'feather' }], colors: [{ body: '#f4f0f8', belly: '#ffffff', dark: '#b8b0c8', accent: '#f4b8d0', eye: '#4a3a8a', horn: '#ffe080', wing: '#ffffff' }, { body: '#f0f0ff', belly: '#ffffff', dark: '#a8b0d0', accent: '#a8d8f0', eye: '#2a3a8a', horn: '#ffe080', wing: '#e8f0ff' }, { body: '#fff4d8', belly: '#ffffff', dark: '#d8b878', accent: '#ffb040', eye: '#8a3a1a', horn: '#ffffff', wing: '#fff0c0' }] } });
M('rillserpent', { names: ['Rillserpent', 'Floodwyrm', 'Thaw Leviathan'], elem: 'spring', size: ['L', 'L', 'L'], rank: 4, flags: 'sw', base: st([110, 18, 21, 16, 14, 9, 4]), basic: { name: 'Bite', p: 1, range: [1, 1] }, skills: [['torrent', 'coil'], ['bramblestorm'], ['verdanttempest']], cost: 130, upkeep: 8, voice: 'hiss',
  rig: { kind: 'beast', preset: 'serpent', parts: [{ fins: true }, { fins: true, crest: true }, { fins: true, crest: true, horn: true }], colors: [{ body: '#3a9a7a', belly: '#c8e8b0', dark: '#1a5a4a', accent: '#6ad0c0', eye: '#ffe040' }, { body: '#2a7aa8', belly: '#b0e0f0', dark: '#1a4a6a', accent: '#6ad8ff', eye: '#ffe040' }, { body: '#2a6a5a', belly: '#e0f8d0', dark: '#123a30', accent: '#f4b8d0', eye: '#ff6a4a' }] } });
// Summer
M('salamander', { names: ['Salamander', 'Firedrake', 'Magma Drake'], elem: 'summer', size: ['S', 'M', 'M'], rank: 2, flags: '', base: st([50, 12, 16, 12, 10, 12, 4]), basic: { name: 'Bite', p: 1, range: [1, 1] }, skills: [['emberspit'], ['firebreath'], ['cinderstorm']], cost: 45, upkeep: 3, voice: 'hiss',
  rig: { kind: 'beast', preset: 'lizard', parts: [{ tail: 'flame' }, { tail: 'flame', crest: true }, { tail: 'flame', crest: true, horn: true }], colors: [{ body: '#e0602a', belly: '#ffc860', dark: '#8a2a10', accent: '#ffe040', eye: '#ffff80', flame: '#ffb020' }, { body: '#c83a1a', belly: '#ffa040', dark: '#6a1a0a', accent: '#ffd040', eye: '#ffff80', flame: '#ff8020' }, { body: '#4a2a2a', belly: '#ff7a20', dark: '#1a0a0a', accent: '#ffb020', eye: '#ffff40', flame: '#ff5010' }] } });
M('cinderhound', { names: ['Cinderhound', 'Blazehound', 'Twinflame Hound'], elem: 'summer', size: ['M', 'M', 'M'], rank: 2, flags: '', base: st([70, 10, 20, 12, 8, 14, 5]), basic: { name: 'Bite', p: 1, range: [1, 1] }, skills: [['firebreath'], ['howl'], ['pounce']], cost: 70, upkeep: 4, voice: 'growl',
  rig: { kind: 'beast', preset: 'hound', parts: [{ mane: 'flame' }, { mane: 'flame', tail: 'flame' }, { mane: 'flame', tail: 'flame', crest: true }], colors: [{ body: '#5a3a30', belly: '#8a5a40', dark: '#2a1a14', accent: '#ff7a20', eye: '#ffe040', flame: '#ffa020' }, { body: '#6a2a1a', belly: '#a04a2a', dark: '#2a0e08', accent: '#ffb020', eye: '#ffff60', flame: '#ff6a10' }, { body: '#2a2a3a', belly: '#4a3a4a', dark: '#100c14', accent: '#4ab0ff', eye: '#ffffff', flame: '#ff4a20' }] } });
M('sunbird', { names: ['Sunbird', 'Phoenix', 'Solar Roc'], elem: 'summer', size: ['M', 'M', 'L'], rank: 3, flags: 'fl', base: st([60, 18, 17, 10, 14, 18, 6]), basic: { name: 'Talon', p: 1, range: [1, 1] }, skills: [['dive'], ['rebirth'], ['solarflare']], cost: 90, upkeep: 5, voice: 'chirp',
  rig: { kind: 'beast', preset: 'avian', parts: [{ tail: 'flame', crest: true }, { tail: 'flame', crest: true }, { tail: 'flame', crest: true }], colors: [{ body: '#ffb020', belly: '#ffe080', dark: '#c85a10', accent: '#ff4a2a', eye: '#2a1a0a', wing: '#ff8a20', flame: '#ffd040' }, { body: '#ff5a1a', belly: '#ffc040', dark: '#a02a0a', accent: '#ffe040', eye: '#1a0a0a', wing: '#ff3a10', flame: '#ffb020' }, { body: '#fff0a0', belly: '#ffffff', dark: '#d8a030', accent: '#ff6a10', eye: '#1a0a0a', wing: '#ffd040', flame: '#ffffff' }] } });
M('wyvern', { names: ['Wyvern', 'Sun Dragon', 'Elder Sun Dragon'], elem: 'summer', size: ['L', 'L', 'L'], rank: 4, flags: 'fl', base: st([120, 16, 25, 18, 12, 10, 5]), basic: { name: 'Bite', p: 1, range: [1, 1] }, skills: [['tailsweep', 'firebreath'], ['dive'], ['solarflare']], breath3: true, cost: 160, upkeep: 10, voice: 'roar',
  rig: { kind: 'beast', preset: 'drake2', parts: [{ wings: 'bat', crest: true }, { wings: 'bat', crest: true, legs4: true, horn: true }, { wings: 'bat', crest: true, legs4: true, horn: true }], colors: [{ body: '#b8782a', belly: '#f0d090', dark: '#5a3a10', accent: '#c83a2a', eye: '#ffe040', wing: '#d89a40', horn: '#f0e0c0' }, { body: '#d04a1a', belly: '#ffd080', dark: '#6a1a0a', accent: '#ffd040', eye: '#ffff60', wing: '#e8702a', horn: '#fff0d0' }, { body: '#e8b020', belly: '#fff0b0', dark: '#8a5a10', accent: '#ff3a1a', eye: '#ff3a1a', wing: '#ffc840', horn: '#ffffff' }] } });
M('sunmane', { names: ['Sunmane Lion', 'Solar Chimera', 'Noon Sphinx'], elem: 'summer', size: ['M', 'L', 'L'], rank: 3, flags: '', base: st([85, 12, 22, 14, 9, 15, 5]), basic: { name: 'Claw', p: 1, range: [1, 1] }, skills: [['roar', 'pounce'], ['firebreath'], ['sunriddle']], cost: 100, upkeep: 6, voice: 'roar',
  rig: { kind: 'beast', preset: 'cat', parts: [{ mane: true }, { mane: 'flame', wings: 'feather', tail: 'snake' }, { mane: true, wings: 'feather', crest: true }], colors: [{ body: '#d8a040', belly: '#f0d090', dark: '#7a5018', accent: '#c84a1a', eye: '#2a1a0a', wing: '#e8c070' }, { body: '#c88030', belly: '#f0c080', dark: '#6a3a10', accent: '#ff6a1a', eye: '#ffe040', wing: '#e8a050' }, { body: '#e8c878', belly: '#fff0c8', dark: '#8a6a30', accent: '#3a6ab0', eye: '#3ab0ff', wing: '#fff0c0' }] } });
// Autumn
M('jacklamp', { names: ["Jack-o'-Lamp", 'Lantern Lord', 'Will of the Wisps'], elem: 'autumn', size: ['S', 'S', 'M'], rank: 1, flags: 'fo', base: st([36, 20, 10, 8, 15, 14, 4]), basic: { name: 'Spook', p: .8, range: [1, 1] }, skills: [['wispfire'], ['fear'], ['leafstorm']], cost: 30, upkeep: 2, voice: 'giggle',
  rig: { kind: 'blob', R: [6, 7, 8], over: 'pumpkin', float: true, colors: [{ dk: '#a04a10', base: '#e07a1e', lt: '#ffb040', spec: '#ffe0a0', eye: '#ffe040' }, { dk: '#7a2a10', base: '#c85a1a', lt: '#f09040', spec: '#ffd080', eye: '#ffd040' }, { dk: '#4a2a5a', base: '#7a4ab0', lt: '#b08ae0', spec: '#ffe0ff', eye: '#a0ffd0' }] } });
M('scarecrow', { names: ['Scarecrow', 'Harvest Reaper', 'Grim Thresher'], elem: 'autumn', size: ['M', 'M', 'M'], rank: 2, flags: '', base: st([65, 10, 18, 12, 10, 12, 4]), basic: { name: 'Scythe', p: 1.1, range: [1, 1] }, skills: [['fear'], ['reaping'], ['trample']], cost: 60, upkeep: 4, voice: 'creak',
  rig: { kind: 'humanoid', size: [1.15, 1.2, 1.3], build: 'heroic', tool: 'scythe', look: [{ outfit: 'coat', hat: 'pointed', hair: 'spiky', weapon: null, colors: { skin: '#e8c870', hair: '#e8d080', cloth: '#7a5a3a', coat: '#6a4a8a', pants: '#5a4a3a', boot: '#3a2a1a', eye: '#1a1a1a' } }, { outfit: 'robe', hat: 'pointed', hair: 'spiky', weapon: null, colors: { skin: '#d8b860', hair: '#c8a050', cloth: '#5a3a2a', pants: '#4a2a1a', boot: '#2a1a0a', eye: '#ff8020', trim: '#c86a1e' } }, { outfit: 'robe', hood: true, hair: 'bald', weapon: null, colors: { skin: '#d0c8b0', hair: '#1a1418', cloth: '#1a1418', pants: '#1a1418', boot: '#0e0a0c', eye: '#ff4020' }, eyeGlow: '#ff6020' }] } });
M('ghoul', { names: ['Barrow Ghoul', 'Wight', 'Barrow King'], elem: 'autumn', size: ['M', 'M', 'M'], rank: 2, flags: '', base: st([70, 12, 19, 13, 9, 10, 4]), basic: { name: 'Claw', p: 1, range: [1, 1], status: ['poison', 25] }, skills: [['drain'], ['gravechill'], ['rot']], cost: 55, upkeep: 3, voice: 'moan',
  rig: { kind: 'humanoid', size: [1.15, 1.2, 1.3], build: 'heroic', hunch: .6, look: [{ outfit: 'shirt', hair: 'long', weapon: null, sleeves: 'none', colors: { skin: '#8a9a7a', hair: '#3a3a30', cloth: '#5a5a48', pants: '#4a4a3a', boot: '#3a3a2a', eye: '#d0ff80' }, eyeGlow: '#c0ff60' }, { outfit: 'robe', hair: 'long', weapon: 'sword', colors: { skin: '#a8b0b8', hair: '#d0d8e0', cloth: '#3a4048', pants: '#2a3038', boot: '#1a1e24', eye: '#80d0ff', metal: '#7a8088' }, eyeGlow: '#80e0ff' }, { outfit: 'robe', hair: 'long', hat: 'crown', weapon: 'sword', armor: true, colors: { skin: '#9aa088', hair: '#e0e0d0', cloth: '#3a2a3a', pants: '#2a1a2a', boot: '#1a0e1a', eye: '#ffe040', metal: '#c8a040', trim: '#c8a040' }, eyeGlow: '#ffe040' }] } });
M('griffin', { names: ['Griffin', 'Gilded Griffin', 'Storm Griffin'], elem: 'autumn', size: ['L', 'L', 'L'], rank: 4, flags: 'fl', base: st([105, 14, 23, 15, 12, 15, 6]), basic: { name: 'Talon', p: 1, range: [1, 1] }, skills: [['dive', 'gale'], ['leafstorm'], ['harvestmoon']], cost: 140, upkeep: 9, voice: 'screech',
  rig: { kind: 'beast', preset: 'griffin', parts: [{ wings: 'feather' }, { wings: 'feather', crest: true }, { wings: 'feather', crest: true }], colors: [{ body: '#b08050', belly: '#f0e0c0', dark: '#5a3a20', accent: '#ffffff', eye: '#ffc020', wing: '#8a5a30', horn: '#e8b020' }, { body: '#d8a840', belly: '#fff0c0', dark: '#7a5a18', accent: '#ffe080', eye: '#ff6020', wing: '#c89030', horn: '#fff080' }, { body: '#5a6a8a', belly: '#d0d8e8', dark: '#2a3048', accent: '#a0e0ff', eye: '#ffff80', wing: '#4a5a7a', horn: '#d0e0ff' }] } });
M('tusker', { names: ['Great Tusker', 'Ironhide Boar', 'Boar King'], elem: 'autumn', size: ['M', 'M', 'L'], rank: 3, flags: '', base: st([85, 6, 21, 16, 4, 10, 5]), basic: { name: 'Gore', p: 1.1, range: [1, 1] }, skills: [['trample'], ['thickhide'], ['roar']], cost: 70, upkeep: 4, voice: 'grunt',
  rig: { kind: 'beast', preset: 'boar', parts: [{ tusks: true, mane: true }, { tusks: true, mane: true, crest: true }, { tusks: true, mane: true, crest: true, horn: true }], colors: [{ body: '#7a5a3a', belly: '#a07a50', dark: '#3a2a1a', accent: '#f0e8d0', eye: '#1a0a0a', horn: '#f0e8d0' }, { body: '#5a5a62', belly: '#7a7a82', dark: '#2a2a30', accent: '#e8e0d0', eye: '#ff3020', horn: '#f0f0f0' }, { body: '#6a3a1a', belly: '#9a6a3a', dark: '#2a160a', accent: '#ffd040', eye: '#ff8020', horn: '#ffe880' }] } });
// Winter
M('snowkit', { names: ['Snowkit', 'Rime Sprite', 'Aurora Wisp'], elem: 'winter', size: ['S', 'S', 'S'], rank: 1, flags: '', flags3: 'fo', base: st([36, 18, 11, 9, 14, 15, 4]), basic: { name: 'Snowball', p: .8, range: [1, 2] }, skills: [['frostbite'], ['frostarmor'], ['froststorm']], cost: 30, upkeep: 2, voice: 'mew',
  rig: { kind: 'blob', R: [6, 6, 7], over: 'snow', ears: 'cat', colors: [{ dk: '#8aa8c8', base: '#e8f0f8', lt: '#ffffff', spec: '#ffffff', eye: '#2a4a8a' }, { dk: '#5a8ab0', base: '#a8e0f0', lt: '#e0f8ff', spec: '#ffffff', eye: '#1a3a6a' }, { dk: '#4a6a9a', base: '#b0f0d8', lt: '#f0d0ff', spec: '#ffffff', eye: '#4a2a8a' }] } });
M('frostwolf', { names: ['Frostwolf', 'Dire Frostwolf', 'Long-Night Wolf'], elem: 'winter', size: ['M', 'M', 'L'], rank: 2, flags: '', base: st([68, 8, 20, 11, 7, 16, 6]), basic: { name: 'Bite', p: 1, range: [1, 1] }, skills: [['howl', 'frostfang'], ['pounce'], ['frostbreath']], cost: 65, upkeep: 4, voice: 'howl',
  rig: { kind: 'beast', preset: 'wolf', parts: [{ mane: true }, { mane: true, crest: true }, { mane: true, crest: true }], colors: [{ body: '#d8e4f0', belly: '#ffffff', dark: '#7a90b0', accent: '#6ab0e8', eye: '#4ab0ff' }, { body: '#a8b8d0', belly: '#e0e8f8', dark: '#4a5a78', accent: '#3a7ab0', eye: '#80e0ff' }, { body: '#2a3048', belly: '#5a6888', dark: '#10141e', accent: '#a0e0ff', eye: '#e0ffff' }] } });
M('icegolem', { names: ['Ice Golem', 'Glacier Colossus', 'Hoarfrost Titan'], elem: 'winter', size: ['L', 'L', 'L'], rank: 4, flags: '', base: st([130, 8, 24, 26, 6, 4, 3]), basic: { name: 'Slam', p: 1.1, range: [1, 1] }, skills: [['frostarmor'], ['avalanche'], ['thorns']], cost: 130, upkeep: 8, voice: 'grind',
  rig: { kind: 'humanoid', size: [1.5, 1.6, 1.75], build: 'bulky', look: [{ outfit: 'shirt', armor: true, hair: 'bald', weapon: null, colors: { skin: '#a8e0f0', cloth: '#80c0e0', pants: '#6aa8d0', boot: '#4a88b0', plate: '#d8f4ff', eye: '#40ffff' }, eyeGlow: '#40ffff' }, { outfit: 'shirt', armor: true, hair: 'spiky', weapon: null, colors: { skin: '#80c8e8', cloth: '#5aa0d0', pants: '#4a88b8', boot: '#2a6890', plate: '#c0ecff', hair: '#e8ffff', eye: '#80ffff' }, eyeGlow: '#80ffff' }, { outfit: 'shirt', armor: true, hair: 'spiky', hat: 'crown', weapon: null, colors: { skin: '#e8f8ff', cloth: '#a8d8f0', pants: '#80b8e0', boot: '#5a90c0', plate: '#ffffff', hair: '#ffffff', eye: '#4060ff', trim: '#80c0ff' }, eyeGlow: '#6080ff' }] } });
M('yeti', { names: ['Yeti', 'Great Yeti', 'Yeti Matriarch'], elem: 'winter', size: ['L', 'L', 'L'], rank: 4, flags: '', base: st([115, 8, 25, 17, 6, 8, 4]), basic: { name: 'Maul', p: 1.15, range: [1, 1] }, skills: [['hurlice'], ['roar'], ['avalanche']], cost: 110, upkeep: 7, voice: 'roar',
  rig: { kind: 'humanoid', size: [1.5, 1.6, 1.7], build: 'bulky', hunch: .3, look: [{ outfit: 'coat', hair: 'spiky', weapon: null, colors: { skin: '#a8b8d0', cloth: '#f0f4f8', coat: '#e8eef4', hair: '#ffffff', pants: '#e0e8f0', boot: '#c8d4e0', eye: '#2a4a8a' } }, { outfit: 'coat', hair: 'spiky', weapon: null, colors: { skin: '#8a9ab8', cloth: '#d8e4f0', coat: '#c8d8e8', hair: '#e8f0f8', pants: '#c0d0e0', boot: '#a0b0c8', eye: '#1a2a6a' } }, { outfit: 'coat', hair: 'long', hat: 'crown', weapon: null, colors: { skin: '#9aa8c8', cloth: '#fff8ff', coat: '#f0f0ff', hair: '#ffffff', pants: '#e8e8f8', boot: '#c8c8e0', eye: '#6a2a8a', trim: '#80c0ff' } }] } });
M('frostwyrm', { names: ['Frost Wyrm', 'Rime Dragon', "Winter's Heart"], elem: 'winter', size: ['L', 'L', 'L'], rank: 5, flags: 'fl', base: st([125, 18, 24, 19, 14, 9, 5]), basic: { name: 'Bite', p: 1, range: [1, 1] }, skills: [['frostbreath', 'tailsweep'], ['dive'], ['blizzard']], cost: 170, upkeep: 11, voice: 'roar',
  rig: { kind: 'beast', preset: 'drake4', parts: [{ wings: 'bat', crest: true, horn: true }, { wings: 'bat', crest: true, horn: true }, { wings: 'bat', crest: true, horn: true }], colors: [{ body: '#a8d0f0', belly: '#e8f8ff', dark: '#4a6a9a', accent: '#ffffff', eye: '#4060ff', wing: '#80b0e0', horn: '#ffffff' }, { body: '#6a90c8', belly: '#d0e8ff', dark: '#2a3a6a', accent: '#c0f0ff', eye: '#80ffff', wing: '#5a7ab8', horn: '#e8f8ff' }, { body: '#e8f4ff', belly: '#ffffff', dark: '#8aa0c8', accent: '#80ffe0', eye: '#ff4060', wing: '#c0d8f8', horn: '#80e0ff' }] } });
// Hour
M('minute', { names: ['Minute', 'Hour-Wisp', 'Second Hand'], elem: 'hour', size: ['S', 'S', 'S'], rank: 1, flags: 'fo', base: st([34, 16, 11, 10, 13, 17, 5]), basic: { name: 'Tick', p: .8, range: [1, 1] }, skills: [['stophex'], ['haste'], ['timeshear']], cost: 40, upkeep: 2, voice: 'tick', hourOnly: true,
  rig: { kind: 'blob', R: [6, 6, 7], over: 'clock', float: true, colors: [{ dk: '#8a6a20', base: '#d8c070', lt: '#f0e0a0', spec: '#ffffff', eye: '#2a2a36' }, { dk: '#5a5a6a', base: '#b0a8c8', lt: '#e0d8f0', spec: '#ffffff', eye: '#d8c070' }, { dk: '#2a2a36', base: '#5a5a6a', lt: '#a0a0b0', spec: '#ffffff', eye: '#ff3a3a' }] } });
M('clockwork', { names: ['Clockwork Sentinel', 'Tick Knight', 'Pendulum Paladin'], elem: 'hour', size: ['M', 'M', 'M'], rank: 3, flags: '', base: st([80, 8, 21, 20, 8, 9, 4]), basic: { name: 'Slash', p: 1, range: [1, 1] }, skills: [['windup'], ['shieldwall'], ['pendulum']], cost: 80, upkeep: 5, voice: 'tick', hourOnly: true,
  rig: { kind: 'humanoid', size: [1.2, 1.25, 1.35], build: 'heroic', halo: 'gear', look: [{ outfit: 'shirt', armor: true, hat: 'helmet', weapon: 'sword', colors: { skin: '#b89a50', cloth: '#8a6a2a', pants: '#6a5020', boot: '#4a3810', plate: '#d8c070', metal: '#e8e0c0', eye: '#ffe040' }, eyeGlow: '#ffe040' }, { outfit: 'shirt', armor: true, hat: 'helmet', weapon: 'sword', cape: { len: 5, width: 5, seg: 2.4 }, colors: { skin: '#a08a50', cloth: '#5a5a6a', pants: '#4a4a5a', boot: '#2a2a36', plate: '#c8b060', metal: '#f0e8d0', cape: '#3a3a46', capeIn: '#d8c070', eye: '#ffe040' }, eyeGlow: '#ffe040' }, { outfit: 'shirt', armor: true, hat: 'helmet', weapon: 'sword', cape: { len: 6, width: 6, seg: 2.6 }, colors: { skin: '#c8b070', cloth: '#2a2a36', pants: '#1a1a24', boot: '#14121c', plate: '#f0d880', metal: '#ffffff', cape: '#14121c', capeIn: '#d8c070', eye: '#ff4040' }, eyeGlow: '#ff4040' }] } });
M('gearhound', { names: ['Gearhound', 'Clockwork Hound', 'Chronohound'], elem: 'hour', size: ['M', 'M', 'M'], rank: 2, flags: '', base: st([65, 6, 19, 15, 6, 15, 6]), basic: { name: 'Bite', p: 1, range: [1, 1] }, skills: [['pounce'], ['howl'], ['stopbite']], cost: 60, upkeep: 4, voice: 'tick', hourOnly: true,
  rig: { kind: 'beast', preset: 'hound', parts: [{ gears: true }, { gears: true, crest: true }, { gears: true, crest: true, tail: 'pendulum' }], colors: [{ body: '#8a8a96', belly: '#b0b0bc', dark: '#3a3a46', accent: '#d8c070', eye: '#ffe040' }, { body: '#b0904a', belly: '#d8c070', dark: '#5a4a20', accent: '#f0e8d0', eye: '#ff6040' }, { body: '#3a3a46', belly: '#5a5a6a', dark: '#14121c', accent: '#d8c070', eye: '#80ffff' }] } });
M('stillwraith', { names: ['Stillwraith', 'Hollow Hour', 'Unhour'], elem: 'hour', size: ['M', 'M', 'M'], rank: 3, flags: 'fo', base: st([60, 30, 10, 10, 20, 13, 5]), basic: { name: 'Spook', p: .8, range: [1, 1] }, skills: [['timeshear', 'stophex'], ['drain'], ['hourstorm']], cost: 85, upkeep: 5, voice: 'moan', hourOnly: true,
  rig: { kind: 'humanoid', size: [1.15, 1.2, 1.3], build: 'heroic', alpha: .75, float: 6, clockHead: true, look: [{ outfit: 'robe', hood: true, hair: 'bald', weapon: null, colors: { skin: '#f0e8d8', hair: '#3a3a46', cloth: '#5a5a6a', pants: '#4a4a5a', boot: '#3a3a46', eye: '#14121c' } }, { outfit: 'robe', hood: true, hair: 'bald', weapon: null, colors: { skin: '#e0d8c8', hair: '#2a2a36', cloth: '#3a3a46', pants: '#2a2a36', boot: '#1a1a24', eye: '#14121c' } }, { outfit: 'robe', hood: true, hair: 'bald', weapon: null, colors: { skin: '#ffffff', hair: '#14121c', cloth: '#14121c', pants: '#0a0a10', boot: '#0a0a10', eye: '#ff3a3a' } }] } });
M('pendulumwyrm', { names: ['Pendulum Wyrm', 'Great Pendulum', 'The Long Hand'], elem: 'hour', size: ['L', 'L', 'L'], rank: 5, flags: '', base: st([150, 20, 26, 22, 18, 8, 4]), basic: { name: 'Bite', p: 1, range: [1, 1] }, skills: [['pendulum', 'timeshear'], ['coil'], ['hourstorm']], cost: 200, upkeep: 12, voice: 'tick', hourOnly: true, meridianOnly: true, elite: true,
  rig: { kind: 'beast', preset: 'serpent', parts: [{ tail: 'pendulum', gears: true }, { tail: 'pendulum', gears: true, crest: true }, { tail: 'pendulum', gears: true, crest: true, horn: true }], colors: [{ body: '#8a7a50', belly: '#d8c070', dark: '#3a3020', accent: '#f0e8d0', eye: '#ff4040' }, { body: '#6a6a7a', belly: '#c8b060', dark: '#2a2a36', accent: '#ffe080', eye: '#ff4040' }, { body: '#2a2a36', belly: '#d8c070', dark: '#0a0a10', accent: '#ffffff', eye: '#ffffff' }] } });
// the cross-quarter wilds
M('skeleton', { names: ['Skeleton', 'Skeleton Knight', 'Bone Lord'], elem: 'autumn', size: ['M', 'M', 'M'], rank: 2, flags: '', base: st([60, 6, 18, 12, 5, 11, 4]), basic: { name: 'Slash', p: 1, range: [1, 1] }, skills: [[], ['shieldwall'], ['charge']], cost: 50, upkeep: 3, voice: 'rattle',
  rig: { kind: 'humanoid', size: [1.15, 1.2, 1.3], build: 'skeleton', look: [{ weapon: 'sword', colors: { bone: '#e8e0c8', metal: '#8a6a4a', eye: '#ff6040' } }, { weapon: 'sword', armor: true, hat: 'helmet', colors: { bone: '#d8d0b8', metal: '#a0a0a8', plate: '#7a7a82', eye: '#80c0ff' } }, { weapon: 'sword', armor: true, hat: 'crown', cape: { len: 6, width: 5, seg: 2.5 }, colors: { bone: '#f0e8d0', metal: '#d8c070', plate: '#5a3a5a', cape: '#3a1a3a', capeIn: '#7a2a5a', eye: '#c060ff' } }] } });
M('bat', { names: ['Giant Bat', 'Vampire Bat', 'Night Bat'], elem: 'winter', size: ['S', 'S', 'M'], rank: 1, flags: 'fl', base: st([32, 8, 12, 7, 8, 19, 6]), basic: { name: 'Bite', p: .9, range: [1, 1], drainPct: .25 }, skills: [['dive'], ['drain'], ['fear']], cost: 30, upkeep: 2, voice: 'squeak',
  rig: { kind: 'blob', R: [5, 6, 7], over: 'bat', wings: true, mouth: 'fangs', float: true, colors: [{ dk: '#2a2030', base: '#4a3a5a', lt: '#6a5a7a', spec: '#a090b0', eye: '#ff4040' }, { dk: '#2a0a14', base: '#5a1a2a', lt: '#8a2a3a', spec: '#d06070', eye: '#ffe040' }, { dk: '#0a0a14', base: '#1a1a2a', lt: '#3a3a5a', spec: '#8080ff', eye: '#80ffff' }] } });
M('slime', { names: ['Slime', 'Royal Slime', 'Slime Sovereign'], elem: 'spring', size: ['S', 'S', 'S'], rank: 1, flags: '', base: st([44, 10, 11, 12, 9, 9, 3]), basic: { name: 'Headbutt', p: .9, range: [1, 1] }, skills: [['engulf'], ['regenerate'], ['bramblestorm']], cost: 25, upkeep: 2, voice: 'blub',
  rig: { kind: 'blob', R: [6, 7, 8], over: 'slime', alpha: .8, colors: [{ dk: '#1a7a7a', base: '#3ac0b0', lt: '#80f0e0', spec: '#ffffff', eye: '#0a2a2a' }, { dk: '#1a5a9a', base: '#3a90e0', lt: '#90d0ff', spec: '#ffffff', eye: '#0a1a3a' }, { dk: '#7a1a7a', base: '#c040c0', lt: '#f0a0f0', spec: '#ffffff', eye: '#2a0a2a' }] } });
M('ogre', { names: ['Ogre', 'Ogre Chieftain', 'Ogre Warlord'], elem: 'summer', size: ['L', 'L', 'L'], rank: 4, flags: '', base: st([125, 6, 27, 16, 4, 7, 4]), basic: { name: 'Maul', p: 1.15, range: [1, 1] }, skills: [['roar'], ['charge'], ['groundpound']], cost: 110, upkeep: 7, voice: 'roar',
  rig: { kind: 'humanoid', size: [1.5, 1.6, 1.7], build: 'bulky', tool: 'club', look: [{ outfit: 'shirt', sleeves: 'none', hair: 'bald', weapon: null, colors: { skin: '#8a9a6a', cloth: '#7a5a3a', pants: '#5a4028', boot: '#3a2818', eye: '#ffe040' } }, { outfit: 'shirt', sleeves: 'none', hair: 'spiky', hat: 'band', weapon: null, colors: { skin: '#7a8a5a', cloth: '#8a3a2a', pants: '#5a2a1a', boot: '#3a1a0a', hair: '#2a2a1a', eye: '#ff8040' } }, { outfit: 'shirt', armor: true, hair: 'spiky', hat: 'helmet', weapon: null, colors: { skin: '#6a7a4a', cloth: '#5a2a1a', pants: '#3a1a0a', boot: '#2a1008', plate: '#8a8a92', eye: '#ff4020' } }] } });
M('harpy', { names: ['Harpy', 'Harpy Matron', 'Storm Harpy'], elem: 'spring', size: ['M', 'M', 'M'], rank: 2, flags: 'fl', base: st([55, 14, 17, 10, 12, 17, 6]), basic: { name: 'Talon', p: 1, range: [1, 1] }, skills: [['dive'], ['gale'], ['screech']], cost: 55, upkeep: 3, voice: 'screech',
  rig: { kind: 'humanoid', size: [1, 1.05, 1.15], build: 'heroic', wings: 'feather', look: [{ outfit: 'shirt', hair: 'long', weapon: null, sleeves: 'none', colors: { skin: '#e8c8a8', hair: '#7a5a3a', cloth: '#9a7a5a', pants: '#8a6a4a', boot: '#d8b040', eye: '#ffe040' } }, { outfit: 'shirt', hair: 'long', hat: 'band', weapon: null, sleeves: 'none', colors: { skin: '#d8b898', hair: '#4a3a2a', cloth: '#6a5a8a', pants: '#5a4a7a', boot: '#d8b040', eye: '#ff6040' } }, { outfit: 'shirt', hair: 'spiky', weapon: null, sleeves: 'none', colors: { skin: '#c8c8e0', hair: '#3a4a8a', cloth: '#4a5a9a', pants: '#3a4a8a', boot: '#f0f080', eye: '#80ffff' } }] } });

/** a species' form stats at a level (MOV is not scaled) */
G.monsterStats = (sp, form, level) => {
  const m = G.get('monster', sp), b = m.base, mul = form === 1 ? 1 : form === 2 ? 1.35 : 1.75, add = form === 1 ? 0 : form === 2 ? 2 : 4, lv = 1 + .05 * (level - 1), out = {};
  for (const k of ['hp', 'mp', 'atk', 'def', 'int']) out[k] = Math.round(b[k] * mul * lv);
  out.agi = Math.round((b.agi + add) * lv);
  out.mov = b.mov + (form === 3 && G.monsterFlags(sp, form).flier ? 1 : 0);
  return out;
};
G.monsterFlags = (sp, form) => {
  const m = G.get('monster', sp), f = m.flags + ' ' + (form >= 2 ? m.flags2 || '' : '') + ' ' + (form >= 3 ? m.flags3 || '' : '');
  return { flier: /\bfl\b/.test(f), swimmer: /\bsw\b/.test(f), floater: /\bfo\b/.test(f) };
};
G.monsterSkills = (sp, form) => { const m = G.get('monster', sp), out = []; for (let i = 0; i < form; i++) for (const s of m.skills[i] || []) if (!out.includes(s)) out.push(s); return out; };
G.monsterName = (sp, form) => G.get('monster', sp).names[form - 1];
G.monsterSize = (sp, form) => G.get('monster', sp).size[form - 1];
G.monsterUpkeep = (sp, form) => Math.round(G.get('monster', sp).upkeep * (form === 1 ? 1 : form === 2 ? 1.5 : 2));

}

// ===== src/05-data-items.js =====
{
// ITEMS (33). No shops: items come from quests, events and castle treasuries. slot: weapon | armor | accessory |
// consumable | promotion | special. who: the class lines (warrior ranger mage cleric beast ruler) or kinds of weapon.
// mods: flat stat changes; flags: rule hooks the sims read.

const I = (id, o) => G.def('item', id, Object.assign({ mods: {}, flags: {} }, o));
I('ashspear', { name: 'Ashwood Spear', slot: 'weapon', kind: 'spear', who: ['warrior', 'beast'], mods: { atk: 3 }, icon: 'spear', desc: 'ATK +3' });
I('rimesteel', { name: 'Rimesteel Sword', slot: 'weapon', kind: 'sword', who: ['warrior'], mods: { atk: 5 }, flags: { winterEdge: .05 }, icon: 'sword', desc: 'ATK +5; a Winter wielder +5% damage' });
I('sunforged', { name: 'Sunforged Blade', slot: 'weapon', kind: 'sword', who: ['warrior', 'sunsovereign'], mods: { atk: 7 }, icon: 'sword', desc: 'ATK +7' });
I('cleaver', { name: "Brigand's Cleaver", slot: 'weapon', kind: 'axe', who: ['warrior', 'brigand'], mods: { atk: 6, def: -2 }, icon: 'axe', desc: 'ATK +6, DEF -2' });
I('hawthornbow', { name: 'Hawthorn Bow', slot: 'weapon', kind: 'bow', who: ['ranger'], mods: { atk: 4 }, icon: 'bow', desc: 'ATK +4' });
I('yewlongbow', { name: 'Yew Longbow', slot: 'weapon', kind: 'bow', who: ['ranger'], mods: { atk: 6 }, flags: { range: 1 }, icon: 'bow', desc: 'ATK +6, max range +1' });
I('willowstaff', { name: 'Willow Staff', slot: 'weapon', kind: 'staff', who: ['mage', 'cleric', 'harvestking', 'rimeduke', 'chancellor', 'hourmaiden'], mods: { int: 4 }, icon: 'staff', desc: 'INT +4' });
I('lanternstaff', { name: 'Lantern Staff', slot: 'weapon', kind: 'staff', who: ['mage', 'cleric', 'harvestking', 'rimeduke', 'chancellor', 'hourmaiden'], mods: { int: 6 }, flags: { spellBoost: ['autumn', .1] }, icon: 'staff', desc: 'INT +6; Autumn spells +10%' });
I('tomeofthaw', { name: 'Tome of Thaw', slot: 'weapon', kind: 'tome', who: ['mage'], mods: { int: 5 }, flags: { spellBoost: ['spring', .1] }, icon: 'tome', desc: 'INT +5; Spring spells +10%' });
I('hourglassrod', { name: 'Hourglass Rod', slot: 'weapon', kind: 'rod', who: ['mage', 'cleric', 'ruler'], mods: { int: 8, mp: 10 }, icon: 'rod', desc: 'INT +8, MP +10' });
I('thornwhip', { name: 'Thorn Whip', slot: 'weapon', kind: 'whip', who: ['beast'], mods: { atk: 4 }, flags: { range: 1 }, icon: 'whip', desc: 'ATK +4; Lash range 1-3' });
I('jerkin', { name: 'Leather Jerkin', slot: 'armor', who: ['all'], mods: { def: 3 }, icon: 'armor', desc: 'DEF +3' });
I('hauberk', { name: 'Mail Hauberk', slot: 'armor', who: ['warrior', 'beast', 'ruler'], mods: { def: 6, agi: -1 }, icon: 'armor', desc: 'DEF +6, AGI -1' });
I('thornmail', { name: 'Thornmail', slot: 'armor', who: ['warrior'], mods: { def: 5 }, flags: { thorns: true }, icon: 'armor', desc: 'DEF +5; Thorns' });
I('frostplate', { name: 'Frostplate', slot: 'armor', who: ['warrior', 'ruler'], mods: { def: 8 }, flags: { immune: ['chill'] }, icon: 'armor', desc: 'DEF +8; immune to Chill' });
I('robeofseasons', { name: 'Robe of Seasons', slot: 'armor', who: ['mage', 'cleric', 'ruler', 'hourmaiden'], mods: { def: 3, int: 4 }, icon: 'robe', desc: 'DEF +3, INT +4' });
I('spurs', { name: 'Swift Spurs', slot: 'accessory', who: ['all'], mods: { mov: 1 }, icon: 'ring', desc: 'MOV +1' });
I('signet', { name: 'Signet of Command', slot: 'accessory', who: ['all'], mods: { bond: 2 }, icon: 'ring', desc: 'Bond +2' });
I('bannerpin', { name: 'Banner Pin', slot: 'accessory', who: ['all'], mods: { ward: 1 }, icon: 'ring', desc: 'Ward +1' });
I('amuletoftides', { name: 'Amulet of Tides', slot: 'accessory', who: ['all'], flags: { amulet: true }, icon: 'amulet', desc: "The wearer's Tide bonus x2" });
I('wardingcharm', { name: 'Warding Charm', slot: 'accessory', who: ['all'], flags: { immune: ['sleep', 'stop'] }, icon: 'amulet', desc: 'Immune to Sleep and Stop' });
I('mendingring', { name: 'Ring of Mending', slot: 'accessory', who: ['all'], flags: { mending: .1 }, icon: 'ring', desc: 'Heals 10% max HP each turn' });
I('horseshoe', { name: 'Lucky Horseshoe', slot: 'accessory', who: ['all'], flags: { luck: 1.15 }, icon: 'ring', desc: 'Good quest outcomes x1.15' });
I('herb', { name: 'Healing Herb', slot: 'consumable', use: { heal: 40 }, icon: 'herb', desc: 'Heals 40 HP' });
I('draught', { name: 'Golden Draught', slot: 'consumable', use: { heal: 9999 }, icon: 'potion', desc: 'Heals to full HP' });
I('ether', { name: 'Ether Vial', slot: 'consumable', use: { mp: 20 }, icon: 'potion', desc: '+20 MP' });
I('remedy', { name: 'Remedy', slot: 'consumable', use: { cleanse: true }, icon: 'herb', desc: 'Clears statuses and debuffs' });
I('manaseed', { name: 'Mana Seed', slot: 'consumable', use: { mana: 60 }, muster: true, icon: 'seed', desc: '+60 realm mana (Muster)' });
I('springseed', { name: 'Spring Seed', slot: 'promotion', elem: 'spring', icon: 'seed', desc: 'Promotes a Spring monster (T2 from Lv 6, T3 from Lv 16)' });
I('summerember', { name: 'Summer Ember', slot: 'promotion', elem: 'summer', icon: 'ember', desc: 'Promotes a Summer monster (T2 from Lv 6, T3 from Lv 16)' });
I('autumnacorn', { name: 'Autumn Acorn', slot: 'promotion', elem: 'autumn', icon: 'acorn', desc: 'Promotes an Autumn monster (T2 from Lv 6, T3 from Lv 16)' });
I('wintershard', { name: 'Winter Shard', slot: 'promotion', elem: 'winter', icon: 'shard', desc: 'Promotes a Winter monster (T2 from Lv 6, T3 from Lv 16)' });
I('writ', { name: 'Writ of Knighthood', slot: 'special', icon: 'scroll', desc: 'Allows a tier-3 class change from Lv 20' });

G.SEASON_SEED = { spring: 'springseed', summer: 'summerember', autumn: 'autumnacorn', winter: 'wintershard' };
/** may a knight of this class equip the item? */
G.canEquip = (item, cls) => {
  const it = G.get('item', item), c = G.get('class', cls);
  if (!['weapon', 'armor', 'accessory'].includes(it.slot)) return false;
  if (it.who.includes('all') || it.who.includes(cls)) return true;
  if (c.line === 'ruler' || c.line === 'unique' || c.line === 'boss') {
    if (it.slot === 'weapon') return c.weapons.includes(it.kind);
    return it.who.includes('ruler');
  }
  return it.who.includes(c.line);
};

}

// ===== src/06-data-knights.js =====
{
// KNIGHTS (36): 4 playable rulers, 16 realm knights, 6 Dominion knights (ruler included), the Gray Knight, 5 free
// knights and 4 brigand captains. troop: [[species, level, form]]. look: an E.Humanoid spec. voice: a babble profile
// (42-audio-voice.js): { base Hz, range semitones, wave, formant, rate, vibrato, double }.

const K = (id, o) => G.def('knight', id, Object.assign({ ruler: false, troop: [], items: {}, form: 'vanguard' }, o));
const cape = (len = 6, width = 5) => ({ len, width, seg: 2.5 });

// Verdance (Spring)
K('gareth', { name: 'Prince Gareth Greenmantle', short: 'Gareth', realm: 'verdance', cls: 'springwarden', level: 6, elem: 'spring', castle: 'avalorn', ruler: true, troop: [['unicorn', 4], ['pixie', 4], ['sproutling', 4]],
  bio: 'Earnest, idealistic, quick to forgive; grieving his mother, the late Queen.', voice: { base: 220, range: 7, wave: 'pulse', formant: 1.1, rate: 1.05 },
  look: { build: 'heroic', size: 1.25, armor: true, hair: 'short', hat: { style: 'band', color: '#ffd040' }, cape: cape(7, 6), weapon: 'sword', colors: { hair: '#f0c850', skin: '#f2d0b0', cloth: '#3a8a3a', pants: '#2a5a2a', plate: '#d8e0c8', metal: '#e8f0e0', cape: '#2e7a32', capeIn: '#f0e6c8', trim: '#f0e6c8', boot: '#5a3a1e' } } });
K('lynette', { name: 'Dame Lynette of Thornwick', short: 'Lynette', realm: 'verdance', cls: 'squire', level: 7, elem: 'spring', castle: 'thornwick', troop: [['treant', 4], ['sproutling', 3]], form: 'shield',
  bio: 'His sworn shield; stern, dry humour, protective.', voice: { base: 175, range: 5, wave: 'square', formant: 1.0, rate: 1 },
  look: { build: 'heroic', size: 1.2, armor: true, hair: 'ponytail', hat: { style: 'band', color: '#f0e6c8' }, weapon: 'sword', colors: { hair: '#8a2a1e', skin: '#f0c8a8', cloth: '#f0e6c8', pants: '#3a7a3a', plate: '#b8c0b0', metal: '#e0e8d8', trim: '#3a8a3a', boot: '#4a3020' } } });
K('pelleas', { name: 'Sir Pelleas the Lovelorn', short: 'Pelleas', realm: 'verdance', cls: 'archer', level: 5, elem: 'spring', castle: 'primrose', troop: [['pixie', 4], ['rillserpent', 3]], form: 'column',
  bio: 'A poet-archer, overdramatic and brave.', voice: { base: 260, range: 9, wave: 'triangle', formant: 1.15, rate: 1.1 },
  look: { build: 'heroic', size: 1.15, outfit: 'tunic', hair: 'long', hat: { style: 'cap', color: '#3a8a3a' }, weapon: null, bow: true, colors: { hair: '#8a5a2a', skin: '#f2d0b0', cloth: '#5aa04a', pants: '#e8dcc0', trim: '#f4b8d0', boot: '#6a4a2a' } } });
K('amris', { name: 'Brother Amris', short: 'Amris', realm: 'verdance', cls: 'acolyte', level: 6, elem: 'winter', castle: 'avalorn', troop: [['snowkit', 3], ['sproutling', 3]], form: 'shield',
  bio: 'An old monk from the north; gentle, wry.', voice: { base: 120, range: 4, wave: 'triangle', formant: .9, rate: .8 },
  look: { build: 'heroic', size: 1.15, hunch: .2, outfit: 'robe', hair: 'bald', weapon: 'staff', sleeves: 'long', colors: { skin: '#e0b898', cloth: '#7a7a82', pants: '#6a6a72', trim: '#c8c0a8', orb: '#a8e0ff', boot: '#4a3a2a' } } });
K('wren', { name: 'Wren Ashfeather', short: 'Wren', realm: 'verdance', cls: 'tamer', level: 5, elem: 'spring', castle: 'rainmere', troop: [['unicorn', 3], ['pixie', 3], ['sproutling', 3]],
  bio: 'Raised among unicorns; few words.', voice: { base: 300, range: 8, wave: 'pulse', formant: 1.3, rate: 1.25 },
  look: { build: 'heroic', size: 1.1, outfit: 'tunic', hair: 'spiky', hood: true, weapon: null, whip: true, colors: { hair: '#e8e8e0', skin: '#f0d0b8', cloth: '#6ab04a', pants: '#4a6a3a', trim: '#e8e0c0', boot: '#5a4a2a' } } });
// Solmark (Summer)
K('morgause', { name: 'Queen Morgause the Brazen', short: 'Morgause', realm: 'solmark', cls: 'sunsovereign', level: 7, elem: 'summer', castle: 'brazenhold', ruler: true, troop: [['wyvern', 4], ['cinderhound', 4]],
  bio: 'Magnificent and war-loving, honourable on the field, ruthless at court.', voice: { base: 180, range: 6, wave: 'square', formant: 1.05, rate: 1 },
  look: { build: 'heroic', size: 1.3, armor: true, hair: 'long', hat: 'crown', cape: cape(8, 6), weapon: 'sword', bladeLen: 11, colors: { hair: '#c8602a', skin: '#e8b890', cloth: '#b02a2a', pants: '#7a1a1a', plate: '#e8c040', metal: '#fff0c0', cape: '#b02a2a', capeIn: '#e0a020', trim: '#e0a020', boot: '#5a2a10' } } });
K('agravain', { name: 'Sir Agravain Cinderjaw', short: 'Agravain', realm: 'solmark', cls: 'squire', level: 7, elem: 'summer', castle: 'cinderwall', troop: [['cinderhound', 4], ['salamander', 3]],
  bio: 'A hothead champion who craves glory.', voice: { base: 120, range: 5, wave: 'saw', formant: .85, rate: 1.1 },
  look: { build: 'bulky', size: 1.25, armor: true, hat: 'helmet', cape: cape(6, 6), weapon: 'sword', colors: { skin: '#d8a078', cloth: '#8a2a1a', pants: '#5a1a10', plate: '#c8a050', metal: '#f0e0c0', cape: '#c83a1a', capeIn: '#7a1a0a', trim: '#e0a020', boot: '#3a1a0a' } } });
K('elidure', { name: 'Captain Elidure of Goldspur', short: 'Elidure', realm: 'solmark', cls: 'archer', level: 6, elem: 'summer', castle: 'goldspur', troop: [['sunbird', 3], ['salamander', 3]], form: 'column',
  bio: 'Disciplined, loyal and secretly kind.', voice: { base: 280, range: 6, wave: 'sine', formant: 1.25, rate: 1.05 },
  look: { build: 'heroic', size: 1.2, outfit: 'coat', hair: 'ponytail', hat: { style: 'band', color: '#b02a2a' }, weapon: null, bow: true, colors: { hair: '#1a1410', skin: '#c89070', cloth: '#d8b880', coat: '#c8a060', pants: '#8a6a3a', trim: '#b02a2a', boot: '#4a2a14' } } });
K('hesper', { name: 'Magus Hesper Vey', short: 'Hesper', realm: 'solmark', cls: 'adept', level: 6, elem: 'hour', castle: 'lionsreach', troop: [['salamander', 3], ['minute', 3]], form: 'column',
  bio: 'An ambitious court sorcerer who dabbles in Hour magic.', voice: { base: 190, range: 5, wave: 'sine', formant: .95, rate: .95, breath: .3 },
  look: { build: 'heroic', size: 1.2, outfit: 'robe', hair: 'long', hat: { style: 'pointed', color: '#5a2a7a' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#d8d8e0', skin: '#e8c8a8', cloth: '#6a2a8a', pants: '#4a1a6a', trim: '#e0b030', orb: '#d8c070', boot: '#2a1a3a' } } });
K('brennoc', { name: 'Old Brennoc', short: 'Brennoc', realm: 'solmark', cls: 'tamer', level: 5, elem: 'summer', castle: 'brazenhold', troop: [['sunmane', 3], ['cinderhound', 3]],
  bio: 'A grizzled, grandfatherly beastkeeper.', voice: { base: 105, range: 4, wave: 'saw', formant: .8, rate: .9 },
  look: { build: 'bulky', size: 1.2, hunch: .3, outfit: 'coat', hair: 'bald', weapon: null, whip: true, colors: { skin: '#c88a60', cloth: '#7a5a3a', coat: '#6a4a2a', pants: '#4a3a2a', trim: '#c8a060', boot: '#3a2414' } } });
// Amberlyn (Autumn)
K('pellam', { name: 'King Pellam the Quiet', short: 'Pellam', realm: 'amberlyn', cls: 'harvestking', level: 8, elem: 'autumn', castle: 'ambergate', ruler: true, troop: [['griffin', 4], ['scarecrow', 4]], form: 'shield',
  bio: 'Silent and wise; speaks rarely and briefly; secretly ill.', voice: { base: 110, range: 3, wave: 'triangle', formant: .9, rate: .7 },
  look: { build: 'heroic', size: 1.2, hunch: .25, outfit: 'robe', hair: 'long', hat: 'crown', weapon: 'staff', sleeves: 'long', cape: cape(7, 6), colors: { hair: '#f0f0e8', skin: '#e0c0a0', cloth: '#c86a1e', pants: '#5a3a2a', trim: '#f0c050', cape: '#5a3a2a', capeIn: '#c86a1e', orb: '#ffb040', boot: '#3a2414' } } });
K('enid', { name: 'Lady Enid Russet', short: 'Enid', realm: 'amberlyn', cls: 'acolyte', level: 6, elem: 'autumn', castle: 'ambergate', troop: [['jacklamp', 3], ['scarecrow', 3]], form: 'shield',
  bio: "The king's daughter; gentle, firm, practical.", voice: { base: 240, range: 6, wave: 'triangle', formant: 1.15, rate: 1 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#c86a1e' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#a0401e', skin: '#f2d4b8', cloth: '#f0e0c0', pants: '#a85a2a', trim: '#a85a2a', orb: '#ffd080', boot: '#5a3a1e' } } });
K('dagonet', { name: 'Sir Dagonet the Motley', short: 'Dagonet', realm: 'amberlyn', cls: 'squire', level: 5, elem: 'autumn', castle: 'russetmoor', troop: [['tusker', 3], ['jacklamp', 3]],
  bio: 'A jester-knight who jokes to hide his fear.', voice: { base: 210, range: 11, wave: 'pulse', formant: 1.1, rate: 1.3 },
  look: { build: 'heroic', size: 1.1, outfit: 'tunic', hair: 'spiky', hat: { style: 'pointed', color: '#c83a8a' }, weapon: 'sword', colors: { hair: '#e0a040', skin: '#f2d0b0', cloth: '#e0a020', pants: '#7a3aa0', trim: '#c83a8a', boot: '#3a2a4a' } } });
K('vesna', { name: 'Vesna of the Lanterns', short: 'Vesna', realm: 'amberlyn', cls: 'adept', level: 6, elem: 'summer', castle: 'lanternfall', troop: [['jacklamp', 4], ['ghoul', 3]], form: 'column',
  bio: 'A lamplighter witch, kind to the dead.', voice: { base: 230, range: 6, wave: 'sine', formant: 1.05, rate: .9, breath: .5 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hair: 'long', hat: { style: 'pointed', color: '#1a1418' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#14101a', skin: '#f0d8c0', cloth: '#1a1418', pants: '#e07a1e', trim: '#e07a1e', orb: '#ff9a20', boot: '#1a1418' } } });
K('lamorak', { name: 'Sir Lamorak Ashbarrow', short: 'Lamorak', realm: 'amberlyn', cls: 'squire', level: 8, elem: 'autumn', castle: 'ashbarrow', troop: [['ghoul', 4], ['scarecrow', 3]], form: 'shield',
  bio: 'A gruff old veteran, loyal to Pellam.', voice: { base: 115, range: 4, wave: 'square', formant: .85, rate: .9 },
  look: { build: 'bulky', size: 1.2, armor: true, hat: 'helmet', cape: cape(6, 5), weapon: 'sword', colors: { skin: '#d8a888', cloth: '#6a4a2a', pants: '#4a3a2a', plate: '#8a6a4a', metal: '#b8a890', cape: '#6a4a2a', capeIn: '#3a2a1a', trim: '#c86a1e', boot: '#2a1a10' } } });
// Hoarfast (Winter)
K('mordrain', { name: 'Duke Mordrain the Frostbitten', short: 'Mordrain', realm: 'hoarfast', cls: 'rimeduke', level: 7, elem: 'winter', castle: 'rimeholt', ruler: true, troop: [['frostwyrm', 3], ['snowkit', 4]],
  bio: 'Theatrical, mad and brilliant; speaks in riddles; grief hidden under ice.', voice: { base: 200, range: 12, wave: 'saw', formant: 1.0, rate: 1.15, vibrato: .03 },
  look: { build: 'heroic', size: 1.25, outfit: 'coat', hair: 'long', hat: { style: 'crown', color: '#c8f0ff' }, weapon: 'staff', sleeves: 'long', cape: cape(8, 6), eyeGlow: '#a8e8ff', colors: { hair: '#f0f8ff', skin: '#e0e8f0', cloth: '#e8f0f8', coat: '#f0f4f8', pants: '#8aa8c8', trim: '#6ab0e8', cape: '#a8d0f0', capeIn: '#4a7ab0', orb: '#a8f0ff', boot: '#4a6a8a' } } });
K('ragnell', { name: 'Dame Ragnell Ice-Eye', short: 'Ragnell', realm: 'hoarfast', cls: 'squire', level: 8, elem: 'winter', castle: 'kestrel', troop: [['frostwolf', 4], ['icegolem', 3]],
  bio: 'His cold, calculating marshal, the sane one.', voice: { base: 165, range: 3, wave: 'square', formant: .95, rate: 1 },
  look: { build: 'heroic', size: 1.25, armor: true, hair: 'ponytail', hat: 'helmet', cape: cape(7, 5), weapon: 'sword', colors: { hair: '#f0f4f8', skin: '#f0dcd0', cloth: '#2a3a6a', pants: '#1a2a4a', plate: '#a8b8c8', metal: '#e0f0ff', cape: '#1a2a5a', capeIn: '#6ab0e8', trim: '#6ab0e8', boot: '#1a2030' } } });
K('safir', { name: 'Sir Safir the Pale', short: 'Safir', realm: 'hoarfast', cls: 'archer', level: 6, elem: 'winter', castle: 'wolfsgate', troop: [['frostwolf', 3], ['snowkit', 3]], form: 'column',
  bio: 'A quiet, melancholic hunter.', voice: { base: 150, range: 4, wave: 'triangle', formant: .95, rate: .9 },
  look: { build: 'heroic', size: 1.2, outfit: 'coat', hood: true, hair: 'short', weapon: null, bow: true, colors: { hair: '#e8ecf0', skin: '#e8dcd4', cloth: '#8a8a92', coat: '#7a7a84', pants: '#5a5a64', trim: '#c8d8e8', boot: '#3a3a44' } } });
K('nimue', { name: 'Nimue of Frostmere', short: 'Nimue', realm: 'hoarfast', cls: 'adept', level: 7, elem: 'winter', castle: 'frostmere', troop: [['snowkit', 4], ['snowkit', 3]], form: 'column',
  bio: 'An enigmatic lake witch who makes bargains.', voice: { base: 250, range: 7, wave: 'sine', formant: 1.2, rate: .85, double: 12 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hair: 'long', weapon: 'staff', sleeves: 'long', colors: { hair: '#a8d8f0', skin: '#e8f0f8', cloth: '#2a8a8a', pants: '#1a6a6a', trim: '#a8f0ff', orb: '#80f0ff', boot: '#1a4a4a' } } });
K('gorm', { name: 'Gorm the Bear', short: 'Gorm', realm: 'hoarfast', cls: 'tamer', level: 5, elem: 'autumn', castle: 'rimeholt', troop: [['yeti', 3], ['tusker', 3]],
  bio: 'Huge and gentle; raised in the western woods.', voice: { base: 80, range: 3, wave: 'saw', formant: .75, rate: .8 },
  look: { build: 'bulky', size: 1.35, outfit: 'coat', hair: 'short', weapon: null, whip: true, colors: { hair: '#5a3a1e', skin: '#d8a880', cloth: '#7a5030', coat: '#6a4428', pants: '#4a3420', trim: '#a07a50', boot: '#3a2414' } } });
// the Hourless Dominion
K('meliant', { name: 'Lord Chancellor Meliant', short: 'Meliant', realm: 'dominion', cls: 'chancellor', level: 14, elem: 'hour', castle: 'meridian', ruler: true, troop: [['pendulumwyrm', 10], ['clockwork', 12, 2], ['stillwraith', 12]], form: 'shield',
  bio: 'Cold, grieving and absolute; believes he is merciful.', voice: { base: 130, range: 4, wave: 'square', formant: .9, rate: .9 },
  look: { build: 'heroic', size: 1.25, outfit: 'robe', hair: 'short', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long', cape: cape(7, 5), colors: { hair: '#8a8a92', skin: '#e0c8b0', cloth: '#1a1a24', pants: '#14121c', trim: '#d8c070', cape: '#14121c', capeIn: '#d8c070', orb: '#d8c070', boot: '#14121c' } } });
K('bertilak', { name: 'Marshal Bertilak the Hourward', short: 'Bertilak', realm: 'dominion', cls: 'knight', level: 12, elem: 'hour', castle: 'midnight', troop: [['clockwork', 12, 2], ['gearhound', 10], ['gearhound', 9]],
  bio: 'Courteous, ruthless; loves a duel.', voice: { base: 110, range: 6, wave: 'square', formant: .85, rate: 1.05 },
  look: { build: 'bulky', size: 1.3, armor: true, hat: 'helmet', cape: cape(7, 6), weapon: 'sword', colors: { skin: '#d8b090', cloth: '#1a3a2a', pants: '#14241a', plate: '#c8a850', metal: '#f0e0b0', cape: '#1a3a2a', capeIn: '#14121c', trim: '#d8c070', boot: '#14121c' } } });
K('aurelie', { name: 'Countess Aurelie of Vespers', short: 'Aurelie', realm: 'dominion', cls: 'sorcerer', level: 12, elem: 'hour', castle: 'vesperhall', troop: [['stillwraith', 10], ['minute', 10], ['minute', 9]], form: 'column',
  bio: 'Elegant, bored and cruel.', voice: { base: 200, range: 5, wave: 'sine', formant: 1.0, rate: .8 },
  look: { build: 'heroic', size: 1.2, outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#14101a', skin: '#f0e0d8', cloth: '#4a2a6a', pants: '#14101a', trim: '#d8c070', orb: '#c8a0ff', boot: '#14101a' } } });
K('morholt', { name: 'Sir Morholt the Unmoving', short: 'Morholt', realm: 'dominion', cls: 'knight', level: 11, elem: 'hour', castle: 'noonspire', troop: [['clockwork', 10], ['clockwork', 9]], form: 'shield',
  bio: 'A silent giant.', voice: { base: 70, range: 2, wave: 'saw', formant: .7, rate: .7, grunt: true },
  look: { build: 'bulky', size: 1.45, armor: true, hat: 'helmet', weapon: 'sword', bladeLen: 12, colors: { skin: '#c8a888', cloth: '#14121c', pants: '#0e0c14', plate: '#2a2a36', metal: '#8a8a96', trim: '#d8c070', boot: '#0e0c14' } } });
K('tic', { name: 'Tic', short: 'Tic', realm: 'dominion', cls: 'ranger', level: 10, elem: 'hour', castle: 'dawnwatch', troop: [['gearhound', 9], ['minute', 9]], form: 'column',
  bio: "A clockwork twin who finishes Tac's sentences.", voice: { base: 420, range: 5, wave: 'pulse', formant: 1.4, rate: 1.4 },
  look: { build: 'chibi', size: 1.0, armor: true, hat: { style: 'cap', color: '#d8c070' }, weapon: null, bow: true, colors: { skin: '#e8d0b0', cloth: '#d8c070', pants: '#3a3a46', plate: '#d8c070', hair: '#3a3a46', boot: '#3a3a46' } } });
K('tac', { name: 'Tac', short: 'Tac', realm: 'dominion', cls: 'ranger', level: 10, elem: 'hour', castle: 'dawnwatch', troop: [['gearhound', 9], ['minute', 9]], form: 'column',
  bio: 'The other twin.', voice: { base: 360, range: 5, wave: 'pulse', formant: 1.3, rate: 1.4 },
  look: { build: 'chibi', size: 1.0, armor: true, hat: { style: 'cap', color: '#3a3a46' }, weapon: null, bow: true, colors: { skin: '#e8d0b0', cloth: '#3a3a46', pants: '#d8c070', plate: '#5a5a6a', hair: '#d8c070', boot: '#d8c070' } } });
K('graynight', { name: 'The Gray Knight, Sir Nonesuch', short: 'Gray Knight', realm: 'dominion', cls: 'graynight', level: 25, elem: 'hour', castle: null, boss: true, troop: [['minute', 15, 3], ['minute', 15, 3], ['minute', 14, 3], ['pendulumwyrm', 16, 2]], form: 'shield',
  bio: 'The month that never was: calm, ancient, faintly amused.', voice: { base: 70, range: 3, wave: 'saw', formant: .7, rate: .75, double: -7 },
  look: { build: 'heroic', size: 1.6, armor: true, hat: 'helmet', cape: { len: 9, width: 7, seg: 2.8 }, weapon: 'sword', bladeLen: 13, eyeGlow: '#ffffff', halo: 'clock', colors: { skin: '#b0b0b8', cloth: '#5a5a62', pants: '#4a4a52', plate: '#8a8a92', metal: '#e0e0e8', cape: '#6a6a72', capeIn: '#3a3a42', trim: '#c8c8d0', boot: '#3a3a42' } } });
// free knights
K('lunete', { name: 'Princess Lunete of Meridian', short: 'Lunete', realm: null, cls: 'hourmaiden', level: 8, elem: 'hour', free: 'story',
  bio: "The Keeper's daughter; steady and kind; carries her father's broken watch.", voice: { base: 300, range: 6, wave: 'sine', formant: 1.3, rate: 1 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#f0d060', skin: '#f6dcc8', cloth: '#f4f0e8', pants: '#d8c070', trim: '#d8c070', orb: '#ffffff', boot: '#a08a50' } } });
K('galeron', { name: 'Sir Galeron the Wanderer', short: 'Galeron', realm: null, cls: 'knight', level: 10, elem: 'spring', free: 'wanderer', regions: ['winter', 'spring'], troop: [['frostwolf', 8]],
  bio: 'An errant knight looking for a cause.', voice: { base: 190, range: 5, wave: 'pulse', formant: 1.0, rate: .9 },
  look: { build: 'heroic', size: 1.25, armor: true, hair: 'short', cape: cape(6, 5), weapon: 'sword', colors: { hair: '#6a4a2a', skin: '#e0b898', cloth: '#5a6a4a', pants: '#3a4a3a', plate: '#8a8a82', metal: '#c8c8c0', cape: '#6a8a5a', capeIn: '#3a4a2a', boot: '#3a2a1a' } } });
K('blanchefleur', { name: 'Blanchefleur the Sellsword', short: 'Blanchefleur', realm: null, cls: 'ranger', level: 10, elem: 'autumn', free: 'wanderer', regions: ['summer', 'autumn'], troop: [['sunmane', 8]],
  bio: 'A mercenary with a code: coin first.', voice: { base: 230, range: 5, wave: 'square', formant: 1.1, rate: 1.2 },
  look: { build: 'heroic', size: 1.2, outfit: 'coat', hair: 'short', weapon: null, bow: true, colors: { hair: '#f0d070', skin: '#e8c0a0', cloth: '#8a4a2a', coat: '#7a3a1e', pants: '#4a2a1a', trim: '#d8a040', boot: '#2a1a0a' } } });
K('owain', { name: 'Owain the Dragonless', short: 'Owain', realm: null, cls: 'beastlord', level: 11, elem: 'summer', free: 'story',
  bio: 'Lost his dragon in the Long Winter; will train yours.', voice: { base: 140, range: 4, wave: 'saw', formant: .9, rate: .95, breath: .4 },
  look: { build: 'bulky', size: 1.25, outfit: 'coat', hair: 'short', weapon: null, whip: true, colors: { hair: '#3a2a1a', skin: '#c89070', cloth: '#6a4a2a', coat: '#5a3a1e', pants: '#3a2a1a', trim: '#c84a2a', boot: '#2a1a0a' } } });
K('ettard', { name: 'Sister Ettard', short: 'Ettard', realm: null, cls: 'priest', level: 10, elem: 'winter', free: 'wanderer', regions: ['hallowmere', 'lanternfall', 'frostmere'], troop: [['snowkit', 7]],
  bio: 'A sharp-tongued healer.', voice: { base: 250, range: 5, wave: 'pulse', formant: 1.2, rate: 1.15 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hood: true, hair: 'short', weapon: 'staff', sleeves: 'long', colors: { hair: '#f0f0f8', skin: '#f0dcd0', cloth: '#f0f4f8', pants: '#4a6aa0', trim: '#4a6aa0', orb: '#a8e0ff', boot: '#2a3a5a' } } });
// brigand captains
K('hob', { name: 'Hob Mudspur', short: 'Hob', realm: 'brigands', cls: 'brigand', level: 5, elem: 'winter', castle: 'thawgate', troop: [['snowkit', 4], ['frostwolf', 4], ['bat', 3], ['slime', 3]],
  bio: 'Swaggering, and a coward at heart.', voice: { base: 170, range: 9, wave: 'pulse', formant: 1.0, rate: 1.25 },
  look: { build: 'heroic', size: 1.15, outfit: 'tunic', hair: 'spiky', hat: { style: 'cap', color: '#5a4a3a' }, weapon: 'sword', colors: { hair: '#7a5a2a', skin: '#e0b090', cloth: '#7a6a5a', pants: '#4a3a2a', trim: '#2a2a2a', boot: '#6a4020' } } });
K('gerrow', { name: 'Mother Gerrow', short: 'Gerrow', realm: 'brigands', cls: 'brigand', level: 5, elem: 'spring', castle: 'beltane', troop: [['slime', 4], ['harpy', 4], ['sproutling', 3], ['bat', 3]], form: 'shield',
  bio: 'Motherly and crafty; hides Lunete at her mill.', voice: { base: 200, range: 6, wave: 'triangle', formant: 1.0, rate: .95 },
  look: { build: 'bulky', size: 1.1, outfit: 'robe', hair: 'ponytail', hat: { style: 'band', color: '#7a6a5a' }, weapon: 'sword', colors: { hair: '#a8a098', skin: '#e8c0a0', cloth: '#7a6a5a', pants: '#5a4a3a', trim: '#2a2a2a', boot: '#3a2a1a' } } });
K('dafydd', { name: 'Red Dafydd', short: 'Dafydd', realm: 'brigands', cls: 'brigand', level: 6, elem: 'summer', castle: 'lammas', troop: [['ogre', 4], ['skeleton', 4], ['salamander', 3]],
  bio: 'Boisterous and proud.', voice: { base: 140, range: 8, wave: 'square', formant: .95, rate: 1.15 },
  look: { build: 'bulky', size: 1.25, outfit: 'tunic', hair: 'long', weapon: 'sword', colors: { hair: '#c8401e', skin: '#e8b090', cloth: '#8a2a1e', pants: '#4a3a2a', trim: '#2a2a2a', boot: '#3a2414' } } });
K('abbot', { name: 'The Hollow Abbot', short: 'Abbot', realm: 'brigands', cls: 'brigand', level: 6, elem: 'autumn', castle: 'hallowmere', troop: [['skeleton', 5], ['ghoul', 4], ['bat', 4]], form: 'shield',
  bio: 'Eerie and sorrowful; keeps the dead company.', voice: { base: 100, range: 3, wave: 'triangle', formant: .8, rate: .7, breath: .5 },
  look: { build: 'heroic', size: 1.2, hunch: .3, outfit: 'robe', hood: true, hair: 'bald', weapon: 'sword', sleeves: 'long', eyeGlow: '#c0ff80', colors: { hair: '#2a2a2a', skin: '#c8c0b0', cloth: '#3a3430', pants: '#2a2420', trim: '#7a6a5a', boot: '#1a1410' } } });

/** the four playable rulers by realm */
G.RULER = { verdance: 'gareth', solmark: 'morgause', amberlyn: 'pellam', hoarfast: 'mordrain', dominion: 'meliant' };

}

// ===== src/07-data-world.js =====
{
// THE WORLD: Forseason, a round continent. Realms, 25 castles, 36 roads, quest sites, regional pools, starting state.
// Positions are world units on the 1024 x 1024 map (north up).

/* ---- realms ---- */
const RE = (id, o) => G.def('realm', id, o);
RE('verdance', { name: 'Kingdom of Verdance', short: 'Verdance', season: 'spring', color: '#4caf50', trim: '#f0e6c8', sigil: 'blossom', banner: 'swallowtail', ruler: 'gareth', capital: 'avalorn', mana: 120, pitch: ['The orchard kingdom of the east.', 'Wake the sleeping Keeper; restore the Concord.'], aggression: 1.0 });
RE('solmark', { name: 'Sun-March of Solmark', short: 'Solmark', season: 'summer', color: '#e0a020', trim: '#b02a2a', sigil: 'sun', banner: 'square', ruler: 'morgause', capital: 'brazenhold', mana: 120, pitch: ['The furnace-throne of the south.', 'Set the Wheel to Summer, on our own terms.'], aggression: 1.15 });
RE('amberlyn', { name: 'Harvest Throne of Amberlyn', short: 'Amberlyn', season: 'autumn', color: '#c86a1e', trim: '#5a3a2a', sigil: 'oak', banner: 'pointed', ruler: 'pellam', capital: 'ambergate', mana: 120, pitch: ['The harvest halls of the west.', 'End the war with the fewest dead.'], aggression: .85 });
RE('hoarfast', { name: 'Duchy of Hoarfast', short: 'Hoarfast', season: 'winter', color: '#6ab0e8', trim: '#e8f4ff', sigil: 'snowflake', banner: 'triangle', ruler: 'mordrain', capital: 'rimeholt', mana: 120, pitch: ['The frozen court of the north.', 'A winter where nothing rots and nothing ends.'], aggression: 1.0 });
RE('dominion', { name: 'Hourless Dominion', short: 'Dominion', season: 'hour', color: '#3a3a46', trim: '#d8c070', sigil: 'hourglass', banner: 'long', ruler: 'meliant', capital: 'meridian', mana: 300, ai: true, aggression: 0 });
RE('brigands', { name: 'Free Companies', short: 'Brigands', season: null, color: '#7a6a5a', trim: '#2a2a2a', sigil: 'axes', banner: 'ragged', ruler: null, capital: null, mana: 0, ai: true, aggression: 0 });
G.PLAYABLE = ['verdance', 'solmark', 'amberlyn', 'hoarfast'];
G.REALMS = ['verdance', 'solmark', 'amberlyn', 'hoarfast', 'dominion', 'brigands'];

/* ---- castles: [id, name, region, tier, owner, mana, map, circle, site, treasury, x, y] ---- */
const CASTLES = [
  ['meridian', 'Meridian, the Calendar City', 'hour', 'capital', 'dominion', 60, 'meridian_clockyard', ['minute', 'clockwork', 'gearhound', 'stillwraith', 'pendulumwyrm'], 'sleepingcourt', 'hourglassrod', 512, 512],
  ['midnight', 'Midnight Keep', 'hour', 'satellite', 'dominion', 30, 'hill_fort', ['minute', 'stillwraith', 'gearhound'], 'bellnoring', 'writ', 512, 392],
  ['dawnwatch', 'Dawnwatch', 'hour', 'satellite', 'dominion', 30, 'hill_fort', ['minute', 'clockwork', 'gearhound'], 'sunrisestair', 'spurs', 632, 512],
  ['noonspire', 'Noonspire', 'hour', 'satellite', 'dominion', 30, 'crossroads', ['clockwork', 'gearhound', 'minute'], 'shadowless', 'signet', 512, 632],
  ['vesperhall', 'Vesper Hall', 'hour', 'satellite', 'dominion', 30, 'ruined_abbey', ['stillwraith', 'minute', 'clockwork'], 'evensong', 'writ', 392, 512],
  ['rimeholt', 'Rimeholt', 'winter', 'capital', 'hoarfast', 40, 'capital_citadel', ['snowkit', 'frostwolf', 'icegolem', 'yeti', 'frostwyrm:winter'], 'silentbells', 'frostplate', 512, 92],
  ['wolfsgate', 'Wolfsgate', 'winter', 'flank', 'hoarfast', 20, 'mountain_pass', ['frostwolf', 'snowkit', 'yeti'], 'howlingscar', 'wintershard', 352, 235],
  ['frostmere', 'Frostmere', 'winter', 'flank', 'hoarfast', 20, 'lakeside', ['snowkit', 'icegolem', 'frostwolf'], 'nimuesmere', 'wardingcharm', 672, 235],
  ['kestrel', 'Kestrel Spire', 'winter', 'inner', 'hoarfast', 25, 'forest_hold', ['frostwolf', 'yeti', 'snowkit'], 'kestreleyrie', 'yewlongbow', 512, 277],
  ['avalorn', 'Avalorn', 'spring', 'capital', 'verdance', 40, 'capital_citadel', ['sproutling', 'pixie', 'unicorn', 'treant', 'rillserpent:spring'], 'queensorchard', 'robeofseasons', 932, 512],
  ['thornwick', 'Thornwick', 'spring', 'flank', 'verdance', 20, 'forest_hold', ['sproutling', 'treant', 'pixie'], 'briarmaze', 'thornmail', 789, 352],
  ['rainmere', 'Rainmere', 'spring', 'flank', 'verdance', 20, 'river_ford', ['rillserpent', 'sproutling', 'pixie'], 'weepingweir', 'springseed', 789, 672],
  ['primrose', 'Primrose Ford', 'spring', 'inner', 'verdance', 25, 'lakeside', ['unicorn', 'pixie', 'sproutling'], 'unicornglade', 'tomeofthaw', 747, 512],
  ['brazenhold', 'Brazenhold', 'summer', 'capital', 'solmark', 40, 'capital_citadel', ['salamander', 'cinderhound', 'sunbird', 'sunmane', 'wyvern:summer'], 'furnacevaults', 'sunforged', 512, 932],
  ['goldspur', 'Goldspur', 'summer', 'flank', 'solmark', 20, 'crossroads', ['salamander', 'cinderhound', 'wyvern:summer'], 'wyvernroost', 'summerember', 672, 789],
  ['cinderwall', 'Cinderwall', 'summer', 'flank', 'solmark', 20, 'mountain_pass', ['cinderhound', 'salamander', 'sunmane'], 'ashdunes', 'hauberk', 352, 789],
  ['lionsreach', 'Lionsreach', 'summer', 'inner', 'solmark', 25, 'hill_fort', ['sunmane', 'sunbird', 'cinderhound'], 'lionsteps', 'bannerpin', 512, 747],
  ['ambergate', 'Ambergate', 'autumn', 'capital', 'amberlyn', 40, 'capital_citadel', ['jacklamp', 'scarecrow', 'ghoul', 'tusker', 'griffin:autumn'], 'harvestvault', 'lanternstaff', 92, 512],
  ['ashbarrow', 'Ashbarrow', 'autumn', 'flank', 'amberlyn', 20, 'ruined_abbey', ['ghoul', 'jacklamp', 'scarecrow'], 'barrowdowns', 'autumnacorn', 235, 352],
  ['russetmoor', 'Russetmoor', 'autumn', 'flank', 'amberlyn', 20, 'marsh_keep', ['tusker', 'jacklamp', 'scarecrow'], 'russetbog', 'horseshoe', 235, 672],
  ['lanternfall', 'Lanternfall', 'autumn', 'inner', 'amberlyn', 25, 'forest_hold', ['jacklamp', 'ghoul', 'scarecrow'], 'lanternroad', 'mendingring', 277, 512],
  ['thawgate', 'Thawgate', 'thaw', 'cross', 'brigands', 30, 'river_ford', ['snowkit', 'sproutling', 'slime', 'bat'], 'breakingice', 'draught', 756, 268],
  ['beltane', 'Beltane Ford', 'beltane', 'cross', 'brigands', 30, 'marsh_keep', ['sproutling', 'salamander', 'slime', 'harpy'], 'oldmill', 'amuletoftides', 756, 756],
  ['lammas', 'Lammas Cross', 'lammas', 'cross', 'brigands', 30, 'crossroads', ['salamander', 'scarecrow', 'skeleton', 'ogre'], 'lammasfair', 'thornwhip', 268, 756],
  ['hallowmere', 'Hallowmere', 'hallow', 'cross', 'brigands', 30, 'ruined_abbey', ['jacklamp', 'snowkit', 'skeleton', 'bat'], 'hollowabbey', 'hawthornbow', 268, 268]
];
G.CROSS = { thaw: ['winter', 'spring'], beltane: ['spring', 'summer'], lammas: ['summer', 'autumn'], hallow: ['autumn', 'winter'] };
for (const [id, name, region, tier, owner, mana, map, circle, site, treasury, x, y] of CASTLES)
  G.def('castle', id, { name, region, tier, owner, mana, map, circle: circle.map(c => { const [sp, season] = c.split(':'); return { sp, season: season || null }; }), site, treasury, pos: [x, y], roads: [] });
/** the seasons a castle's region counts as (cross-quarters count as both neighbours) */
G.regionSeasons = region => (G.CROSS[region] || (G.SEASONS.includes(region) ? [region] : []));
/** the pool region(s) a castle draws quest rewards from */
G.regionPools = region => (G.CROSS[region] || [region]);

/* ---- roads ---- */
const ROADS = 'rimeholt-wolfsgate rimeholt-frostmere wolfsgate-kestrel frostmere-kestrel avalorn-thornwick avalorn-rainmere thornwick-primrose rainmere-primrose brazenhold-goldspur brazenhold-cinderwall goldspur-lionsreach cinderwall-lionsreach ambergate-ashbarrow ambergate-russetmoor ashbarrow-lanternfall russetmoor-lanternfall thawgate-frostmere thawgate-thornwick beltane-rainmere beltane-goldspur lammas-cinderwall lammas-russetmoor hallowmere-ashbarrow hallowmere-wolfsgate kestrel-midnight primrose-dawnwatch lionsreach-noonspire lanternfall-vesperhall midnight-dawnwatch dawnwatch-noonspire noonspire-vesperhall vesperhall-midnight meridian-midnight meridian-dawnwatch meridian-noonspire meridian-vesperhall'.split(' ').map(s => s.split('-'));
G.ROADS = ROADS;
for (const [a, b] of ROADS) { G.get('castle', a).roads.push(b); G.get('castle', b).roads.push(a); }
G.adjacent = (a, b) => G.get('castle', a).roads.includes(b);

/* ---- regional pools ---- */
G.POOLS = {
  winter: { items: ['herb', 'wintershard', 'rimesteel', 'frostplate', 'wardingcharm', 'yewlongbow'], beasts: ['snowkit', 'frostwolf', 'yeti', 'bat'], wanderers: ['galeron', 'ettard'] },
  spring: { items: ['herb', 'springseed', 'tomeofthaw', 'hawthornbow', 'spurs', 'willowstaff'], beasts: ['sproutling', 'pixie', 'unicorn', 'slime'], wanderers: ['galeron'] },
  summer: { items: ['herb', 'summerember', 'sunforged', 'hauberk', 'bannerpin', 'cleaver'], beasts: ['salamander', 'cinderhound', 'sunbird', 'sunmane'], wanderers: ['blanchefleur'] },
  autumn: { items: ['herb', 'autumnacorn', 'lanternstaff', 'horseshoe', 'robeofseasons', 'jerkin'], beasts: ['jacklamp', 'scarecrow', 'ghoul', 'tusker'], wanderers: ['blanchefleur', 'ettard'] },
  hour: { items: ['ether', 'writ', 'hourglassrod', 'signet', 'amuletoftides', 'spurs'], beasts: ['minute', 'gearhound'], wanderers: [] }
};

/* ---- quest sites: [id, name, castle, seasons away, focus, extra] ---- */
const SITES = [
  ['silentbells', 'The Lake of Silent Bells', 'rimeholt', 2, 'training', {}, 'A black lake under the citadel, where drowned bells are said to ring.'],
  ['howlingscar', 'The Howling Scar', 'wolfsgate', 1, 'beast', {}, 'A wind-cut gorge where the frost wolves den.'],
  ['nimuesmere', "Nimue's Mere", 'frostmere', 1, 'treasure', { ettard: true }, 'A mere that never fully freezes; offerings sink there.'],
  ['kestreleyrie', 'The Kestrel Eyrie', 'kestrel', 2, 'wanderer', {}, 'A spire of nests above the pines, a waypoint for travellers.'],
  ['queensorchard', "The Queen's Orchard", 'avalorn', 1, 'treasure', {}, 'The late Queen planted it; its oldest apple has not blossomed.'],
  ['briarmaze', 'The Briar Maze', 'thornwick', 1, 'beast', { beastMul: { unicorn: 2 } }, 'A hedge maze gone wild; unicorns shelter at its heart.'],
  ['weepingweir', 'The Weeping Weir', 'rainmere', 1, 'beast', { addBeasts: ['rillserpent'] }, 'Water falls over the old weir like tears.'],
  ['unicornglade', 'The Unicorn Glade', 'primrose', 2, 'beast', { beastMul: { unicorn: 3 } }, 'A sunlit glade where the herds come to drink.'],
  ['furnacevaults', 'The Furnace Vaults', 'brazenhold', 1, 'treasure', {}, 'Vaults under the furnace-throne, warm as an oven.'],
  ['wyvernroost', 'The Wyvern Roost', 'goldspur', 2, 'beast', { addBeasts: ['wyvern'], beastMul: { wyvern: .5 } }, 'Red cliffs where the wyverns nest.'],
  ['ashdunes', 'The Ash Dunes', 'cinderwall', 1, 'mana', {}, 'Grey dunes where old fires left mana in the sand.'],
  ['lionsteps', 'The Lion Steps', 'lionsreach', 1, 'wanderer', { beastMul: { sunmane: 2 } }, 'Carved steps where the sunmanes bask.'],
  ['harvestvault', 'The Harvest Vault', 'ambergate', 1, 'treasure', {}, 'A granary-vault older than the throne.'],
  ['barrowdowns', 'The Barrow Downs', 'ashbarrow', 1, 'beast', { mishap: 5 }, 'Grave-mounds where the dead do not rest easily.'],
  ['russetbog', 'The Russet Bog', 'russetmoor', 1, 'beast', { beastMul: { tusker: 2 } }, 'A red bog; the tuskers wallow there.'],
  ['lanternroad', 'The Lantern Road', 'lanternfall', 2, 'wanderer', { ettard: true }, 'A road of lanterns lit for the dead.'],
  ['breakingice', 'The Breaking Ice', 'thawgate', 1, 'mana', { addItems: ['draught'] }, 'A river where the ice cracks like thunder each thaw.'],
  ['oldmill', 'The Old Mill of Beltane', 'beltane', 1, 'treasure', { story: 'lunete' }, 'A mill on the ford, whose wheel no longer turns.'],
  ['lammasfair', 'The Lammas Fair', 'lammas', 1, 'wanderer', { story: 'blanchefleur' }, 'A brigand fair where anything is for sale.'],
  ['hollowabbey', 'The Hollow Abbey Crypts', 'hallowmere', 2, 'treasure', { addBeasts: ['skeleton', 'bat'], ettard: true }, 'Crypts beneath an abbey of empty bells.'],
  ['bellnoring', "The Bell That Doesn't Ring", 'midnight', 2, 'treasure', {}, 'A great bell, cracked at the Thirteenth Hour.'],
  ['sunrisestair', 'The Sunrise Stair', 'dawnwatch', 1, 'treasure', {}, 'A stair that climbs toward a sunrise that never quite comes.'],
  ['shadowless', 'The Shadowless Square', 'noonspire', 1, 'mana', {}, 'A square where nothing casts a shadow.'],
  ['evensong', 'The Evensong Crypt', 'vesperhall', 2, 'treasure', {}, 'A crypt where the evening hymn never ends.'],
  ['sleepingcourt', 'The Sleeping Court', 'meridian', 2, 'treasure', { keeper: true }, 'The court where the Keeper sleeps between two seconds.']
];
for (const [id, name, castle, away, focus, extra, desc] of SITES) G.def('site', id, Object.assign({ name, castle, away, focus, desc }, extra));

/* ---- quest outcomes: base weights ---- */
G.QUEST_OUTCOMES = [['treasure', 30], ['beast', 20], ['wanderer', 10], ['mana', 15], ['training', 15], ['mishap', 10]];
G.QUEST_GOOD = ['treasure', 'beast', 'wanderer', 'mana'];

/* ---- starting state ---- */
G.START_RESERVE = { avalorn: [['sproutling', 2], ['sproutling', 2]], brazenhold: [['salamander', 2], ['salamander', 2]], ambergate: [['jacklamp', 2], ['jacklamp', 2]], rimeholt: [['snowkit', 2], ['snowkit', 2]], meridian: [['minute', 10], ['minute', 10]] };
G.START_ITEMS = {
  verdance: ['herb', 'herb', 'remedy', 'springseed'], solmark: ['herb', 'herb', 'remedy', 'summerember'],
  amberlyn: ['herb', 'herb', 'remedy', 'autumnacorn'], hoarfast: ['herb', 'herb', 'remedy', 'wintershard'],
  dominion: ['ether', 'ether', 'ether'], brigands: []
};
G.TIER_MANA = { capital: 40, inner: 25, flank: 20, cross: 30, satellite: 30 };

}

// ===== src/08-data-maps.js =====
{
// BATTLE MAPS (13): rows top first, one character per hex (terrain codes in 01-data-rules.js); anchors 1 2 3 attacker,
// 7 8 9 defender, 1 2 3 4 seats (shrine). Odd rows sit half a hex right. flood: shallows flood in Spring. blockShape:
// how '#' hexes are drawn (hexblock, cottage, gear, cliff). The data suite checks every row, anchor and season.

const MAP = (id, o) => G.def('map', id, Object.assign({ flood: false, blockShape: 'hexblock', mode: 'siege' }, o));
MAP('border_meadow', { name: 'Border Meadow', desc: 'A meadow with a stream, a bridge on the road and a ruined watchtower Keep.', rows: [
  '..f.....h.ff.',
  '.ff.1.....~.f',
  '......f...~h.',
  '..2..f...~...',
  ',,,,,,,,,b,K7',
  '....f....~.8.',
  '.f.......~h..',
  '..h..f...~..f',
  '...f.....~.ff'] });
MAP('river_ford', { name: 'River Ford', flood: true, desc: 'A river splits the field: two fords and one bridge. Spring floods the fords; Winter freezes the river.', rows: [
  'ff..h..w...hfff',
  '.f.1...w....ff.',
  '.....h.~..8..f.',
  'f......w...h...',
  '..2.f..w..h....',
  ',,,,,,,b,,,K7..',
  '..3.f..w..h....',
  'f......w...h...',
  '.....h.~..9..f.',
  '.f.....w....ff.',
  'ff..h..w...hfff'] });
MAP('forest_hold', { name: 'Forest Hold', desc: 'Thick woods, a winding road and a clearing Keep between two hills.', rows: [
  '...ff....ff..ff',
  '..fff...fff.fff',
  '..1ff.ff.f8..ff',
  '.....fff..h.h..',
  '......f,,,.....',
  ',2...,,..,,K7..',
  '..,,,,..ff.....',
  '....ff.fffh.h..',
  '.f3.fff.ff9..ff',
  'fff.ff..fff.fff',
  '.ff......ff..ff'] });
MAP('mountain_pass', { name: 'Mountain Pass', blockShape: 'cliff', desc: 'Peaks squeeze the field into a pass. Fliers cross the peaks.', rows: [
  'mmmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmmm',
  '...mmmmmmmmm...',
  '..f.hmm.mm.8h..',
  '..1...r........',
  ',2,,,,,,,,,K7,.',
  '.f3.....r......',
  '....hmm.mm.9h..',
  '...mmmmmmmmm...',
  'mmmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmmm'] });
MAP('hill_fort', { name: 'Hill Fort', desc: 'The Keep crowns a ring of hills, with woods on both flanks.', rows: [
  '..ff.fff.....ff',
  '.fff.ff.....fff',
  '..ff.........ff',
  '.1..h....8hh...',
  '.........hhhh..',
  ',2,,,,,,,hK7hf.',
  '.........hhhh..',
  '.3..h....9hh...',
  '...ff........ff',
  '..fffff.....fff',
  '...fffff.....ff'] });
MAP('marsh_keep', { name: 'Marsh Keep', flood: true, desc: 'Bogs and pools around a causeway road. Summer dries the swamp; Spring floods the pools.', rows: [
  '...............',
  '..fss.fss......',
  '...sss.sss.8.f.',
  '.1.ss~.ss~..h..',
  '...............',
  ',2,,,,,,,,,K7..',
  '......sss......',
  '.3ss.ss~s...9..',
  '..ssssssss.~ss.',
  '..ss.sss~..sss.',
  '......sss...ss.'] });
MAP('lakeside', { name: 'Lakeside', desc: 'A lake fills the north; in Winter it freezes and opens a straight path to the Keep.', rows: [
  '.fff........ff.',
  '.ff..LLLL..fff.',
  '.....LLLLLh.ff.',
  '.1...LLLLL..8..',
  '......LLLL.....',
  '..2...LLL..K7..',
  '...........,...',
  ',3,.....,,,9...',
  '.ff,,,,,,h...ff',
  'ffffff......fff',
  '.ff.ff.......ff'] });
MAP('ruined_abbey', { name: 'Ruined Abbey', desc: 'Broken walls and ruins around an abbey-tower Keep.', rows: [
  '.ff........ffff',
  'fff........ffff',
  '.ff..#..#....ff',
  '.1...#.r...r8..',
  '........r.r....',
  ',2,,,,,,,,,K7..',
  '..........r....',
  '.3...r.r.#.r9..',
  '..ff..#..#...ff',
  '.fff........fff',
  '..ff.........ff'] });
MAP('crossroads', { name: 'Crossroads', blockShape: 'cottage', desc: 'Two roads cross among fields, with houses making lanes. Summer wheat hides units.', rows: [
  'f......,.....f.',
  '..FF...,FF.....',
  '..FFF..,FFF.#..',
  '.1FF.#.,FF.8...',
  '.......,.#.....',
  ',2,,,,,,,,,K7,,',
  '.......,.#.....',
  '.3FF.#.,FF.9...',
  '..FFF..,FFF.#..',
  '..FF...,FF.....',
  'f......,.....f.'] });
MAP('capital_citadel', { name: 'Capital Citadel', desc: 'Ramparts round a courtyard and Keep, with gates on the road. Fliers cross the walls.', rows: [
  '..fffff.......fff',
  '.fffff........ff.',
  '..ff.............',
  '......h...####...',
  '.1........#8gg#..',
  '.....h...#gggg#ff',
  ',,,,,,,,,,ggK7g#f',
  '.2.......#gggg#ff',
  '..........#g9g#..',
  '......h..,g###...',
  '.ff3....,,.......',
  'fff..,,,......ff.',
  '.ff.,,ff......fff'] });
MAP('meridian_clockyard', { name: 'Meridian Clockyard', blockShape: 'gear', hour: true, desc: 'The clock-city: an outer wall, gear blocks, and the Great Clock tower as the Keep.', rows: [
  '..,,...........rr',
  '...,,,,.......rrr',
  '...rr..,g####..rr',
  '..rrr..#gg8g#....',
  '.1.rr..#g#gg##...',
  '......#gggggg#...',
  ',2,,,,,gggK7g##..',
  '......#gggggg#...',
  '.3.rr..#g#gg##...',
  '..rrr..#gg9g#....',
  '...rr..,g####..rr',
  '...,,,,.......rrr',
  '..,,...........rr'] });
MAP('clockwork_sanctum', { name: 'Clockwork Sanctum', blockShape: 'gear', hour: true, mode: 'sanctum', desc: 'A round dial chamber. Light the four Season Dials and the Wheel will turn.', rows: [
  '###############',
  '####gggggg#####',
  '####gggDggg####',
  '###gggggggg####',
  '###gg#ggg#gg###',
  '##gggg8ggggg###',
  '##gDgggK7ggDg##',
  '##gggg9ggggg###',
  '###gg#ggg#gg###',
  '###gggggggg####',
  '####gggDggg####',
  '####g1g2g3#####',
  '###############'] });
MAP('wheel_shrine', { name: 'Wheel Shrine', mode: 'shrine', desc: 'Four corners around the Hour Shrine. The season turns every bell.', rows: [
  '..........~....',
  'f4.f..f..~...1~',
  '........~......',
  '..f..f.~....~..',
  '...........~...',
  '.f..f.gg..~....',
  'F.....gKg...h..',
  '....F.gg......h',
  '..F......h.....',
  'F.....F....h...',
  '....F..........',
  '.3......h....2.',
  'F.....F...h....'] });

/** a map's rows parsed: { w, h, codes (terrain per cell, anchors as plain), anchors { '1': [cx, cy], ... }, keep } */
G.parseMap = id => {
  const m = G.get('map', id), h = m.rows.length, w = m.rows[0].length, codes = [], anchors = {};
  let keep = null; const dials = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let ch = m.rows[y][x];
    if (/[1-9]/.test(ch)) { anchors[ch] = [x, y]; ch = '?'; }
    if (ch === 'K') keep = [x, y];
    if (ch === 'D') dials.push([x, y]);
    codes.push(ch);
  }
  // an anchor stands on the terrain most common around it (courtyard inside walls, plain in the open)
  for (const [x, y] of Object.values(anchors)) {
    const n = {}; for (const c of G.hex.neighbours([x, y])) { if (!G.hex.inside(c, w, h)) continue; const t = codes[c[1] * w + c[0]]; if ('.,ghfrF'.includes(t)) n[t] = (n[t] || 0) + 1; }
    const best = Object.entries(n).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    codes[y * w + x] = best && best[0] !== 'f' && best[0] !== 'h' ? best[0] : '.';
  }
  return { w, h, codes, anchors, keep, dials };
};
/** the map a battle uses in a season: codes after the season's transforms */
G.seasonCodes = (id, season) => { const p = G.parseMap(id), m = G.get('map', id); return p.codes.map(c => G.seasonTerrain(c, season, m.flood)); };

}

// ===== src/09-data-story.js =====
{
// STORY: events as data. { when: 'tidings' | 'manual', realm: a realm | 'player' | 'world', if(c), priority (opening
// 100, story 50, recruit 30, flavour 10), once, stage, lines: [[speaker, text, { emote, pose, expr }]], choices:
// [{ text, effects, lines }], effects, tip, ending }. Speakers: a knight id, 'narrator', 'ruler' (the realm's ruler),
// 'herald', 'keeper'. Effects run in CampaignSim._effect. Style: brief, earnest, formal; humour from the characters.

const EV = (id, o) => G.def('event', id, Object.assign({ when: 'manual', realm: 'player', priority: 50, once: true, stage: 'road' }, o));
const NARR = t => ['narrator', '{c=#b8b0c8}' + t + '{/c}'];
const SEASONC = { spring: '#9ad86a', summer: '#ffd060', autumn: '#ff9a40', winter: '#a8e0ff' };
const sc = (s, t) => '{c=' + SEASONC[s] + '}' + t + '{/c}';

G.PROLOGUE = [
  'In the Age of the Wheel, four crowns kept one calendar.',
  sc('spring', 'Spring') + ' to Verdance. ' + sc('summer', 'Summer') + ' to Solmark. ' + sc('autumn', 'Autumn') + ' to Amberlyn. ' + sc('winter', 'Winter') + ' to Hoarfast.',
  'And in Meridian, the Calendar City, the Keeper of the Wheel wound the Great Clock, that each season might yield to the next.',
  'Last winter the Keeper fell into a sleep no physician could break, and the Great Clock began to falter.',
  'From the silent city rode Lord Chancellor Meliant, beneath a banner with no season.',
  '"When the Thirteenth Month comes," he swore, "I will stop the Wheel, and no one we love will ever grow old."',
  'Four crowns answered with steel. Every knight became a brigand; every road, a war.',
  'The chroniclers named the age the {c=#ffd36a}Brigantime{/c}.'
];

/* ---- the openings ---- */
EV('open_verdance', { when: 'tidings', realm: 'verdance', priority: 100, stage: 'orchard', if: c => c.turn === 0, cast: ['amris', 'gareth', 'lynette', 'pelleas', 'wren'], tip: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.', lines: [
  NARR('Avalorn, the orchard court of Verdance. ' + sc('spring', 'Spring') + ', Year 1 of the Brigantime.'),
  ['amris', 'Your mother asked to rest beneath the oldest apple, my prince. It has not blossomed since the Clock faltered.'],
  ['gareth', 'Then it will blossom when the Wheel turns again. Not before.', { expr: 'angry' }],
  ['lynette', "Brave words. Solmark is sharpening its swords, and Hoarfast's Duke laughs alone in his ice hall."],
  ['gareth', 'Let them. We do not ride to take a throne, Lynette. We ride to wake a king.'],
  ['pelleas', 'And should a throne fall into our laps along the way? I ask only for the ballads.', { emote: 'note' }],
  ['wren', "The unicorns won't graze. They smell the Clock's sickness on the east wind."],
  ['gareth', 'Then we march before the petals fall. {shake}Sound the horn!{/shake}', { pose: 'cheer', expr: 'shout', emote: '!' }]] });
EV('open_solmark', { when: 'tidings', realm: 'solmark', priority: 100, stage: 'sunhall', if: c => c.turn === 0, cast: ['hesper', 'morgause', 'agravain', 'elidure', 'brennoc'], tip: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.', lines: [
  NARR('Brazenhold, the furnace-throne of Solmark. ' + sc('spring', 'Spring') + ', Year 1 of the Brigantime.'),
  ['hesper', 'Majesty, the Chancellor promises the Wheel will stop. Imagine it: a summer without end.'],
  ['morgause', 'I have imagined it, Hesper. Every harvest burned to dust. Every child born into drought.', { expr: 'angry' }],
  ['agravain', 'Then we take Meridian and set the Wheel ourselves! Our summer, on our terms!', { expr: 'shout', emote: '!' }],
  ['morgause', 'Now you sound like a Solmarker. {w=.4}A long noon, Sir Agravain, is still a noon that ends.'],
  ['elidure', 'The brigands at Beltane and Lammas grow fat on our roads. Shall I clear them, my queen?'],
  ['brennoc', "Take the wyverns. They've not flown proper since the Clock went sick."],
  ['morgause', 'We march. Let every crown in Forseason learn what the sun can do.', { pose: 'cheer', expr: 'smile' }]] });
EV('open_amberlyn', { when: 'tidings', realm: 'amberlyn', priority: 100, stage: 'harvesthall', if: c => c.turn === 0, cast: ['lamorak', 'enid', 'dagonet', 'vesna', 'pellam'], tip: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.', lines: [
  NARR('Ambergate, the harvest hall of Amberlyn. ' + sc('spring', 'Spring') + ', Year 1 of the Brigantime.'),
  ['lamorak', "The granaries stand half full, Majesty. The rest rotted where the Clock's sickness touched the fields."],
  ['enid', 'Father has not slept. He watches the old sundial in the garden, as if it might tell him something.'],
  ['dagonet', "It tells me it's noon, my lady. But it told me that yesterday as well.", { emote: 'note' }],
  ['vesna', 'The lanterns on the Lantern Road burn blue now. The dead grow restless when time limps.'],
  ['pellam', '{w=.8}...', { emote: 'dots' }],
  ['pellam', 'We will end this.'],
  ['lamorak', 'Then we ride, my king. Four words from you are worth a hundred from any other crown.', { pose: 'cheer' }]] });
EV('open_hoarfast', { when: 'tidings', realm: 'hoarfast', priority: 100, stage: 'icehall', if: c => c.turn === 0, cast: ['ragnell', 'mordrain', 'nimue', 'gorm', 'safir'], tip: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.', lines: [
  NARR('Rimeholt, the frozen court of Hoarfast. ' + sc('spring', 'Spring') + ', Year 1 of the Brigantime. The snow has not melted.'),
  ['mordrain', 'Ragnell! What has a face and hands, and never stops running?', { expr: 'smile', emote: '?' }],
  ['ragnell', 'A clock, Your Grace. You asked me yesterday.'],
  ['mordrain', 'Did I? Then the clock has not stopped yet. Pity. {w=.3}In winter nothing rots, Ragnell. Nothing ends.'],
  ['nimue', 'The Chancellor would agree with you, Duke. That is what frightens me.'],
  ['gorm', "My yeti won't eat. They don't like the stopped hour. I don't like it either."],
  ['safir', 'Wolves are out of Thawgate, and brigands ride with them.'],
  ['mordrain', 'Then we go hunting! Safir, the bows. Ragnell, the banners. Gorm, bring the bears.', { pose: 'cheer', expr: 'shout', emote: '!' }],
  ['ragnell', 'And I shall bring the sense. As always.']] });
EV('tutorial', { when: 'tidings', realm: 'player', priority: 99, stage: 'road', if: c => c.turn === 0 && c.sim.s.humans[0] === c.realm, cast: ['ruler', 'herald'], lines: [
  ['herald', 'A brigand patrol blocks the border road, my liege. A sergeant and his beasts.'],
  ['ruler', 'Then we clear it, and learn the lie of the land as we go.']],
  choices: [{ text: 'Fight the patrol (tutorial)', effects: [{ flag: 'tutorial' }] }, { text: 'Ride around them', effects: [] }] });
EV('banner_without_season', { when: 'tidings', realm: 'world', priority: 95, stage: 'clock', if: c => c.turn === 0, cast: ['meliant', 'graynight'], lines: [
  NARR('Meridian. Within the Great Clock, the hands tremble between two seconds.'),
  ['meliant', 'Do you hear it, Sir Nonesuch? Every tick is a funeral bell.'],
  ['graynight', 'I hear nothing, Chancellor. That is the gift I bring.'],
  ['meliant', 'My wife died in the turning of an autumn. My son, in a winter. I will not give the Wheel another year.', { expr: 'angry' }],
  ['graynight', 'Then hold the city until the Thirteenth Month. When it comes, the hands will stop. So will grief.'],
  ['meliant', 'The four crowns will come for it.'],
  ['graynight', 'Let them spend their springs and summers on one another. Time is the only army I need.', { emote: 'dots' }]] });
EV('free_companies', { when: 'march', realm: 'player', priority: 60, stage: 'road', cast: ['herald'], lines: [
  ['herald', 'The Free Companies hold the cross-quarter roads, my liege: Thawgate, Beltane, Lammas and Hallowmere.'],
  ['herald', 'Any castle beside one of ours may be attacked, with up to three troops. Its gates fall open if no knight holds it.'],
  ['herald', 'An attacker has twelve bells. Stand a knight on the Keep at the last bell, or rout every knight, to win.']] });
EV('first_victory', { realm: 'player', priority: 40, stage: 'tent', cast: ['ruler', 'knight'], lines: [
  ['ruler', 'The field is ours. Tend the wounded; count the beasts we kept.', { pose: 'cheer', expr: 'smile' }],
  ['knight', 'Our knights grow stronger with every bell, my liege. At level ten a knight may take a new class.'],
  ['knight', 'And our beasts grow too: at level twelve, or sooner with a Season Seed, they change their form.']] });
EV('first_loss', { realm: 'player', priority: 40, stage: 'tent', cast: ['ruler', 'knight'], lines: [
  ['ruler', 'We were driven back. {w=.3}Those beasts we lost are lost for good.', { expr: 'wince' }],
  ['knight', 'There is no shame in a retreat, my liege. A knight who retreats keeps his troop; a fallen one rests a season.'],
  ['knight', 'And when the odds are poor, Delegate the field to your captains, or choose another road.']] });
EV('long_winter', { when: 'tidings', realm: 'world', priority: 60, stage: 'icehall', if: c => c.season === 'winter' && c.year === 1, cast: ['mordrain', 'ragnell'], lines: [
  NARR(sc('winter', 'Winter') + ', Year 1. The thaw did not come. They are calling it the Long Winter.'),
  ['mordrain', 'Ha! Look at it, Ragnell. Snow on snow on snow. Even the clocks are shivering.', { pose: 'cheer', expr: 'smile' }],
  ['ragnell', 'The Winter Tide runs twice as strong this season, Your Grace. Our foes will feel it.'],
  ['mordrain', 'Let them feel it. Let them learn what waiting is.']] });
EV('candle_lit', { when: 'tidings', realm: 'world', priority: 90, stage: 'clock', if: c => c.season === 'spring' && c.year === 2, cast: ['graynight', 'meliant'], effects: [{ candle: true }], tip: 'The Hour-Candle is lit. When it is ash, the Thirteenth Month begins.', lines: [
  NARR('Meridian. ' + sc('spring', 'Spring') + ', Year 2 of the Brigantime.'),
  ['graynight', 'A candle of hours, Chancellor. Twelve seasons tall. When it is ash, the {c=#ff5a4a}Thirteenth Month{/c} begins.'],
  ['meliant', 'And the Keeper?'],
  ['graynight', 'He will sleep through the end of time. Is that not a mercy?', { emote: 'dots' }]] });
EV('dominion_awakens', { when: 'tidings', realm: 'world', priority: 70, stage: 'tent', if: c => c.season === 'summer' && c.year === 2, cast: ['bertilak', 'tic', 'tac'], effects: [{ dominion: true }], lines: [
  NARR('Midnight Keep. ' + sc('summer', 'Summer') + ', Year 2. The gates of the Hourlands open.'),
  ['bertilak', 'The Hour marches. {w=.3}My compliments to the four crowns: they have bled one another beautifully.', { expr: 'smile' }],
  ['tic', 'Tic says the roads are ready—'],
  ['tac', '—Tac agrees!'],
  ['bertilak', 'Courtesy first, then. I shall kill them slowly, and with every respect.', { pose: 'cheer' }]] });
EV('lunete_letter', { when: 'tidings', realm: 'player', priority: 55, stage: 'road', if: c => (c.season === 'autumn' && c.year === 1 && (c.owns('rainmere') || c.owns('goldspur') || c.owns('beltane'))) || (c.year === 2 && c.season === 'spring') || (c.turn > 4 && !c.flag('site_oldmill')), cast: ['ruler', 'herald'], effects: [{ unlockSite: 'oldmill' }], tip: 'Send a knight from a castle beside Beltane Ford to the Old Mill.', lines: [
  ['herald', 'A letter, my liege, left on our gate under a millstone. It is signed only with an L.'],
  ['ruler', '"The Keeper\'s daughter lives. Seek the Old Mill at Beltane Ford, and come quietly."'],
  ['ruler', "Lunete. If she lives, the Keeper's line lives. Find her before the Hour does.", { emote: '!' }]] });
EV('lunete_joins', { realm: 'player', priority: 80, stage: 'road', cast: ['gerrow', 'lunete'], effects: [{ addKnight: 'lunete' }], lines: [
  NARR('The Old Mill of Beltane. The wheel has not turned since the Clock faltered.'),
  ['gerrow', 'Take her, then. She eats more than my bats.', { expr: 'smile' }],
  ['lunete', 'I am no prize, my lord. I am a promise.'],
  ['lunete', "My father's watch stopped the night he slept. Let me ride with you, and we will wind it again."]] });
EV('lunete_arrives', { when: 'tidings', realm: 'player', priority: 80, stage: 'road', if: c => c.year >= 3 && c.season === 'spring' && !c.sim.s.knights.lunete, cast: ['lunete', 'ruler'], effects: [{ addKnight: 'lunete' }], lines: [
  NARR('Your capital. A girl walks in alone through the rain, soaked from the road.'),
  ['lunete', 'Forgive me. I waited at the mill as long as I dared. The Hour has eyes even there.'],
  ['lunete', "I am Lunete, the Keeper's daughter. My father's clock is breaking. Let me help you mend it."],
  ['ruler', 'Then the Wheel has a friend in this court. Rest, Princess. We ride at dawn.']] });
const captain = (id, cid, a, b, c) => EV('brigands_no_more_' + id, { realm: 'player', priority: 45, stage: 'road', cast: [id, 'ruler'], lines: [[id, a], ['ruler', b], [id, c]],
  choices: [{ text: 'Take the oath', effects: [{ captainJoins: id, at: cid }] }, { text: 'Exile the captain', effects: [{ exileCaptain: id }, { mana: 60 }] }] });
captain('hob', 'thawgate', "All right, all right! I yield! Mind the boots, they're new.", 'You robbed our roads all winter, Hob Mudspur.', "And I'd rob 'em for you all summer, if the pay's honest. Better a brigand who knows the passes.");
captain('gerrow', 'beltane', "Well. You've a firm hand, I'll give you that. Come in out of the wet.", 'Your bats have harried our river barges for a year, Mother Gerrow.', "And fed my mill-folk with it. Feed them better, and my bats are yours.");
captain('dafydd', 'lammas', 'Ha! Beaten fair and loud! Red Dafydd salutes you!', 'You took tolls at Lammas Cross from widows and pilgrims.', "And from lords, mostly. Give me a banner worth shouting under, and I'll shout for you.");
captain('abbot', 'hallowmere', 'The bells of the abbey are quiet now. Thank you for that, at least.', 'Your dead walked our roads, Abbot.', 'They walk because time limps. Mend it, and they will rest. Until then, let me keep them on your side.');
EV('owain', { realm: 'player', priority: 30, stage: 'stable', cast: ['owain', 'ruler'], effects: [{ addKnight: 'owain' }], lines: [
  NARR('The stables. A stranger in a scorched leather coat is watching your new drake.'),
  ['owain', 'I lost my Kerrow in the Long Winter. Let me teach yours to fly.'],
  ['ruler', 'And what do you ask in return?'],
  ['owain', 'Only to hear wings again. Owain, they call me. Owain the Dragonless.', { emote: 'dots' }]] });
EV('galeron', { realm: 'player', priority: 30, stage: 'road', cast: ['galeron', 'ruler'], lines: [
  ['galeron', 'I have ridden every road in Forseason looking for a cause worth a sword.'],
  ['ruler', 'And have you found one?'],
  ['galeron', 'Yours will do. It is the only one I have heard that ends with the Wheel still turning.']] });
EV('ettard', { realm: 'player', priority: 30, stage: 'road', cast: ['ettard', 'ruler'], lines: [
  ['ettard', 'Hold still. That cut has festered, and your physicians tie a knot like a drunk sailor.'],
  ['ruler', 'Who are you?'],
  ['ettard', "Sister Ettard. I go where the wounded are, and they are with you. Don't thank me. Just bleed less."]] });
EV('blanchefleur', { realm: 'player', priority: 30, stage: 'road', cast: ['blanchefleur', 'ruler'], lines: [
  ['blanchefleur', "Your knight was outnumbered on the road. I evened the count. That's a day's pay."],
  ['ruler', 'And tomorrow?'],
  ['blanchefleur', "Tomorrow's another day's pay. Coin first, my liege. Then I'm yours, all the way to Meridian."]] });
EV('blanchefleur_hire', { realm: 'player', priority: 40, stage: 'road', cast: ['blanchefleur', 'ruler'], lines: [
  NARR('The Lammas Fair. Between the jugglers and the cattle pens, a sellsword sits sharpening arrows.'),
  ['blanchefleur', "One hundred and fifty, and I don't fight children."],
  ['ruler', 'A steep price.'],
  ['blanchefleur', 'Cheaper than losing.']],
  choices: [{ text: 'Pay 150 mana', effects: [{ pay: 150 }, { addKnight: 'blanchefleur' }] }, { text: 'Refuse', effects: [] }] });
EV('stillness', { realm: 'world', priority: 70, stage: 'clock', cast: ['graynight', 'meliant'], lines: [
  ['graynight', 'Listen, Chancellor. A castle has stopped breathing.'],
  ['meliant', 'Stopped?'],
  ['graynight', 'For a season, nothing there will grow, or move, or march. A taste of what is coming.', { emote: 'dots' }]] });
EV('thirteenth_warning', { realm: 'world', priority: 80, stage: 'road', cast: ['herald'], lines: [
  ['herald', '{c=#ff5a4a}One season remains.{/c} {w=.3}The Hour-Candle gutters in Meridian.'],
  ['herald', 'If the Gray Knight stands when it is ash, the Thirteenth Month begins, and never ends.']] });
EV('meridian_falls', { realm: 'player', priority: 100, urgent: true, stage: 'clock', cast: ['meliant', 'graynight', 'ruler', 'lunete'], effects: [{ startSanctum: true }], lines: [
  ['meliant', 'So it is done. {w=.5}Forgive me, Keeper. I only wanted the clocks to stop.', { pose: 'kneel' }],
  ['graynight', 'And they shall, Chancellor. You were a key, nothing more. A stopped city is only a seed.'],
  ['ruler', { gareth: 'Who are you?', morgause: 'Name yourself, before I burn the name off your tomb.', pellam: '...Who?', mordrain: 'A riddle for you: who are you?' }],
  ['graynight', 'The month that never was. The hour between hours. Every season you ever lost belongs to me.'],
  ['graynight', 'Come down into the Sanctum, little crown. Let us see whether your Wheel still turns.'],
  ['lunete', { lunete: "My father's clock is not yours to break. Stand on the dials with me, and we will turn it together.", other: 'The dials, my liege. The old tales say the Wheel answers four seasons together.' }]] });
EV('sanctum_retry', { realm: 'player', priority: 90, stage: 'clock', cast: ['graynight', 'ruler'], lines: [
  ['graynight', 'The Wheel trembles, but it holds. {w=.3}Come again, little crown, if your candle allows.'],
  ['ruler', 'We will. March on the Sanctum again from Meridian, and light all four dials.']] });
EV('rival_meridian', { realm: 'world', priority: 85, stage: 'road', cast: ['herald'], lines: [
  ['herald', 'Grave news, my liege. A rival crown has taken Meridian.'],
  ['herald', 'If they defeat the Gray Knight, they will set the Wheel to their own season, forever.']] });
EV('rival_failed', { realm: 'world', priority: 85, stage: 'road', cast: ['herald'], lines: [
  ['herald', 'The rival crown went down into the Sanctum, and the Gray Knight threw them back.'],
  ['herald', 'Meridian belongs to the Hour once more, with a fresh garrison. The road is still open to us.']] });
for (const [r, line] of [['verdance', 'Forgive me, Mother.'], ['solmark', 'Even suns set.'], ['amberlyn', '...Enough.'], ['hoarfast', 'Ice melts. Who knew?']]) {
  EV('realm_falls_' + r, { realm: 'world', priority: 60, stage: 'road', cast: [G.RULER[r], 'herald'], lines: [
    ['herald', G.get('realm', r).name + ' has fallen. Its last castle is taken; its knights are scattered on the roads.'],
    [G.RULER[r], line, { pose: 'kneel', expr: 'wince' }]] });
}

/* ---- Verdance ---- */
EV('v_pelleas_letter', { when: 'tidings', realm: 'verdance', priority: 50, stage: 'orchard', if: c => c.season === 'summer' && c.year === 1 && c.holds('pelleas'), cast: ['pelleas', 'gareth', 'lynette'], lines: [
  ['pelleas', 'My prince, I have written to Captain Elidure of Goldspur. We met at the last Concord. She laughed at my sonnet.'],
  ['lynette', 'Everyone laughed at your sonnet.'],
  ['pelleas', 'She laughed {c=#f4b8d0}kindly{/c}. If she would ride with us, Solmark would lose its best bow.', { emote: 'heart' }],
  ['gareth', 'It is your letter, Sir Pelleas. Shall we send it?']],
  choices: [{ text: 'Let him send it', effects: [{ flag: 'v_letter' }] }, { text: 'Burn the letter', effects: [] }] });
EV('v_elidure_joins', { realm: 'verdance', priority: 45, stage: 'tent', cast: ['elidure', 'pelleas', 'gareth'], effects: [{ moveKnight: ['elidure', 'verdance', null] }], lines: [
  ['elidure', 'Your poetry is dreadful, Sir Pelleas. Your cause is not.'],
  ['pelleas', 'Then you read it! All of it?', { emote: '!' }],
  ['elidure', 'Twice. {w=.3}My prince, my bow is yours, for the Wheel and not for Solmark.'],
  ['gareth', 'Welcome to Verdance, Captain.']] });
EV('v_unicorn_herd', { when: 'tidings', realm: 'verdance', priority: 30, stage: 'stable', if: c => c.season === 'autumn' && c.year === 1 && c.owns('thornwick') && c.holds('wren'), cast: ['wren', 'gareth'], effects: [{ addMonster: ['unicorn', 5, 'capital'] }, { addItem: 'springseed' }], lines: [
  NARR('The Briar Maze at dusk. A herd of unicorns stands in the last light.'),
  ['wren', 'They came back. One of them wants to follow us.'],
  ['gareth', 'Then let it. And take this, Wren: a seed from the orchard. Let it grow strong.']] });
EV('v_green_oath', { realm: 'verdance', priority: 50, stage: 'tent', cast: ['gareth', 'lynette'], effects: [{ bond: ['gareth', 2] }, { learn: ['gareth', 'verdanttempest'] }], lines: [
  ['gareth', 'The first of the Hour castles. I swear it here, on this stolen ground: I will wake the Keeper.', { pose: 'cheer' }],
  ['lynette', 'Then I swear to keep you alive long enough to do it.'],
  NARR("Gareth's Bond grows by 2. He learns {c=#9ad86a}Verdant Tempest{/c}.")] });
EV('v_amris_past', { when: 'tidings', realm: 'verdance', priority: 40, stage: 'orchard', if: c => c.season === 'winter' && c.year === 2 && c.holds('amris'), cast: ['amris', 'gareth'], lines: [
  ['amris', 'My prince, I was not always a monk. Forty winters ago I was a knight of Hoarfast.'],
  ['amris', 'The Duke was a boy then. I taught him his letters. I could write to him.'],
  ['gareth', 'Would he listen?']],
  choices: [{ text: 'Write to the Duke', effects: [{ aiPeace: ['hoarfast', 'verdance', 2] }], lines: [['amris', 'He will remember. Hoarfast will not march on us for a time.']] },
    { text: 'Keep silent', effects: [] }] });

/* ---- Solmark ---- */
EV('s_hesper_offer', { when: 'tidings', realm: 'solmark', priority: 50, stage: 'sunhall', if: c => c.season === 'autumn' && c.year === 1 && c.holds('hesper'), cast: ['hesper', 'morgause'], lines: [
  ['hesper', 'Majesty, I have studied the Hour. Its beasts could be summoned at Lionsreach, if you would allow it.'],
  ['morgause', 'Minutes and stillwraiths, in my own court?'],
  ['hesper', 'A sword is a sword, Majesty. It does not ask whose hand holds it.']],
  choices: [{ text: 'Accept the Hour', effects: [{ flag: 'hesper_circle' }, { flag: 'hesper_accepted' }] }, { text: 'Refuse her', effects: [{ levelUp: ['hesper', 2] }], lines: [['hesper', 'As you wish. I shall study harder, then.']] }] });
EV('s_hesper_betrays', { when: 'tidings', realm: 'solmark', priority: 60, stage: 'sunhall', if: c => c.season === 'summer' && c.year === 3 && c.flag('hesper_accepted') && c.holds('hesper'), cast: ['hesper', 'morgause'], effects: [{ hesperDefects: true }], lines: [
  ['hesper', 'Time was always the better master, Majesty.'],
  ['morgause', 'Hesper. {w=.3}{shake}Seize her!{/shake}', { expr: 'shout' }],
  NARR('Hesper and her troop vanish through a door that was not there a moment before.')] });
EV('s_wyvern_eggs', { when: 'tidings', realm: 'solmark', priority: 30, stage: 'stable', if: c => c.season === 'spring' && c.year === 2 && c.owns('goldspur') && c.holds('brennoc'), cast: ['brennoc', 'morgause'], effects: [{ addMonster: ['wyvern', 5, 'capital'] }, { addItem: 'summerember' }], lines: [
  ['brennoc', 'Eggs, Majesty. From the Roost at Goldspur. One hatched this morning, and bit me.', { expr: 'smile' }],
  ['morgause', 'Then it is a Solmarker already. Raise it well, old man.']] });
EV('s_agravain_duel', { realm: 'solmark', priority: 40, stage: 'tent', cast: ['agravain', 'ragnell'], lines: [
  ['agravain', 'Ice-Eye! I challenge you, here, before your troops and mine!', { expr: 'shout' }],
  ['ragnell', 'Then come and lose in front of them, Cinderjaw.'],
  NARR('Agravain fights the first bell with {c=#ff5a4a}Valor{/c}.')] });

/* ---- Amberlyn ---- */
EV('a_dagonet_jest', { when: 'tidings', realm: 'amberlyn', priority: 30, stage: 'harvesthall', if: c => c.season === 'summer' && c.year === 1 && c.holds('dagonet'), cast: ['dagonet', 'enid'], effects: [{ addItem: 'signet' }], lines: [
  ['dagonet', 'My lady! I put a frog in the new steward\'s boot, and he screamed in Hourspeech!', { emote: '!' }],
  ['enid', 'A spy? In our own hall?'],
  ['dagonet', 'A spy with a frog in his boot. He dropped this: a Signet of Command. Finders keepers.']] });
EV('a_kings_cough', { when: 'tidings', realm: 'amberlyn', priority: 50, stage: 'harvesthall', if: c => c.season === 'winter' && c.year === 1 && c.holds('enid'), cast: ['pellam', 'enid'], lines: [
  NARR('The king\'s bedchamber, late at night.'),
  ['pellam', '{w=.5}...Enid.', { expr: 'wince' }],
  ['enid', 'Father, the physicians say the cough will pass.'],
  ['pellam', 'It will not. {w=.4}Shall I name you heir?']],
  choices: [{ text: 'Name her heir now', effects: [{ levelUp: ['enid', 3] }, { learn: ['enid', 'renewal'] }], lines: [['enid', 'Then I will carry it, Father. Rest.']] }, { text: 'Wait', effects: [] }] });
EV('a_lanterns', { when: 'tidings', realm: 'amberlyn', priority: 30, stage: 'road', if: c => c.season === 'autumn' && c.year === 2 && c.holds('vesna'), cast: ['vesna', 'pellam'], effects: [{ addMonster: ['jacklamp', 6, 'capital'] }, { addMonster: ['jacklamp', 6, 'capital'] }, { addItem: 'autumnacorn' }], lines: [
  NARR('All-Hallows on the Lantern Road. Vesna lights a lantern for every grave.'),
  ['vesna', 'The dead are quieter tonight, Majesty. Two of the lanterns asked to follow us.'],
  ['pellam', '...Let them.']] });
EV('a_lamorak_stand', { realm: 'amberlyn', priority: 40, stage: 'tent', cast: ['lamorak', 'pellam'], lines: [
  ['lamorak', 'Ashbarrow is my home, Majesty. I was born under those walls. They will not pass.', { pose: 'cheer' }],
  NARR('Lamorak is {c=#4aa0ff}Warded{/c} for the first two bells.')] });

/* ---- Hoarfast ---- */
EV('w_nimue_bargain', { when: 'tidings', realm: 'hoarfast', priority: 50, stage: 'icehall', if: c => c.season === 'summer' && c.year === 1 && c.holds('nimue'), cast: ['nimue', 'mordrain'], lines: [
  ['nimue', 'Duke, the mere has given me an egg. A frost wyrm\'s. It wants a price.'],
  ['mordrain', 'Everything does. What price?'],
  ['nimue', 'A memory. One name you love. The mere keeps it, and you forget.']],
  choices: [{ text: 'Accept the bargain', effects: [{ addMonster: ['frostwyrm', 4, 'capital'] }, { flag: 'mordrain_forgot' }], lines: [['mordrain', '...There. Done. Whose name was it? {w=.4}Never mind. Never mind.', { expr: 'wince' }]] },
    { text: 'Refuse', effects: [{ levelUp: ['nimue', 1] }], lines: [['nimue', 'Wise. The mere will ask again.']] }] });
EV('w_gorm_cub', { when: 'tidings', realm: 'hoarfast', priority: 30, stage: 'stable', if: c => c.season === 'autumn' && c.year === 1 && c.holds('gorm'), cast: ['gorm', 'mordrain'], effects: [{ addMonster: ['yeti', 5, 'capital'] }], lines: [
  ['gorm', 'My little one came home. Lost since the Clock went sick. She found me.', { expr: 'smile', emote: 'heart' }],
  ['mordrain', 'A riddle, Gorm: what is white and heavy and follows you everywhere?'],
  ['gorm', 'Her. Now.']] });
EV('w_ragnell_doubt', { when: 'tidings', realm: 'hoarfast', priority: 50, stage: 'icehall', if: c => c.season === 'winter' && c.year === 2 && c.holds('ragnell'), cast: ['ragnell', 'mordrain'], lines: [
  NARR('The battlements of Rimeholt, at night.'),
  ['ragnell', 'Do I follow a madman? {w=.4}Some nights I cannot tell.'],
  ['mordrain', 'Nor can I, Ragnell. That is why I keep you.']],
  choices: [{ text: 'Trust him', effects: [{ levelUp: ['ragnell', 2] }] }, { text: 'Watch him', effects: [{ giveItemTo: ['ragnell', 'wardingcharm'] }] }] });
EV('w_lucid_hour', { realm: 'hoarfast', priority: 50, stage: 'icehall', cast: ['mordrain', 'ragnell'], effects: [{ flag: 'lucid' }], lines: [
  ['mordrain', 'Ragnell. {w=.5}My sister drowned in the lake beneath Rimeholt, the winter I was twelve.'],
  ['mordrain', 'If winter never ends, the lake never thaws. And it never gives her back.'],
  ['ragnell', '...Your Grace.'],
  ['mordrain', 'I know what I am doing now. I think I always did.'],
  NARR('Mad Gambit will never misfire again.')] });

/* ---- endings ---- */
const ending = (realm, title, lines, epi) => EV('ending_' + realm, { realm, priority: 100, stage: 'clock', ending: true, title, cast: [G.RULER[realm], 'graynight', 'keeper', 'lunete'], lines, epilogue: epi });
ending('verdance', 'The Wheel Turns Again', [
  NARR('The thirteenth bell never rang.'),
  ['graynight', 'Then turn, little Wheel. Turn, and lose everything again. I will wait between the seconds.'],
  NARR('The Great Clock shuddered, and its hands moved on.'),
  ['keeper', 'Spring... I dreamed of spring. Thank you, child of the Bough.'],
  ['gareth', 'Rest now, Keeper. The Wheel is in good hands.'],
  NARR('In Avalorn, the oldest apple blossomed that very morning.')], 'verdance');
ending('solmark', 'The Long Noon Ends', [
  NARR('The thirteenth bell never rang.'),
  ['graynight', 'You could have kept the noon forever. Why let it go?'],
  ['morgause', 'Even the sun must set, or it is only a fire.'],
  NARR('The Great Clock shuddered, and its hands moved on.'),
  ['keeper', 'Summer... and then autumn, as it should be. Thank you, Queen of the Furnace.'],
  NARR('Brazenhold held a festival that lasted until the first frost.')], 'solmark');
ending('amberlyn', 'The Last Harvest', [
  NARR('The thirteenth bell never rang.'),
  ['graynight', 'Speak, old king. You have so few words left.'],
  ['pellam', '{w=.6}Turn.'],
  NARR('The Great Clock shuddered, and its hands moved on. King Pellam did not rise again.'),
  ['keeper', 'He gave the Wheel his last word. It will remember him.'],
  NARR('Lady Enid was crowned in Ambergate when the harvest came in.')], 'amberlyn');
ending('hoarfast', 'Spring Thaw', [
  NARR('The thirteenth bell never rang.'),
  ['graynight', 'Eternal winter was yours for the taking, Duke. Nothing would ever rot.'],
  ['mordrain', 'Let the ice go, Ragnell. {w=.4}Let her go.'],
  NARR('The Great Clock shuddered, and its hands moved on. Under Rimeholt, the lake began to thaw.'),
  ['keeper', 'Winter ends. That is its kindness. Thank you, Duke of the Frost.']], 'hoarfast');
EV('ending_candle', { realm: 'world', priority: 100, stage: 'clock', ending: true, bad: true, title: 'THE LEGEND ENDS IN SILENCE', cast: ['graynight'], lines: [
  NARR('The Hour-Candle gutters, and goes out.'),
  ['graynight', 'Hush now. Nothing will ever end again.'],
  NARR('The Thirteenth Month begins. It does not end.')] });
for (const [r, word, line] of [['verdance', 'FLOOD', 'Spring forever. Let it rain, and rain, and rain.'], ['solmark', 'FIRE', 'Summer forever. Let it burn bright and never cool.'], ['amberlyn', 'DUST', '...Autumn. Forever.'], ['hoarfast', 'ICE', 'Winter forever! Nothing rots! Nothing ends!']])
  EV('ending_wheel_' + r, { realm: 'world', priority: 100, stage: 'clock', ending: true, bad: true, title: 'THE LEGEND ENDS IN ' + word, cast: [G.RULER[r]], lines: [
    NARR('A rival crown descends into the Sanctum, and the Gray Knight falls before it.'),
    [G.RULER[r], line, { pose: 'cheer' }],
    NARR('The Wheel is set, and stops. The land drowns in ' + word.toLowerCase() + '.')] });
EV('ending_fallen', { realm: 'world', priority: 100, stage: 'road', ending: true, bad: true, title: 'THE LEGEND FORGETS YOU', cast: ['ruler'], lines: [
  NARR('Your last castle has fallen. Your banner lies in the mud of a cross-quarter road.'),
  ['ruler', 'There were so many seasons left. {w=.4}Were there not?', { pose: 'kneel', expr: 'wince' }],
  NARR('The chroniclers write other names now.')] });

/* ---- epilogue cards: one per surviving named knight (2 lines each) ---- */
G.EPILOGUES = {
  lynette: 'Dame Lynette kept the Concord\'s peace for forty years, and never once admitted she enjoyed it.',
  pelleas: c => c.flags.v_letter && c.holds('elidure') ? 'Sir Pelleas wrote four hundred verses about the Sanctum. Captain Elidure read none of them, and married him anyway.' : 'Sir Pelleas wrote four hundred verses about the Sanctum. Some of them rhymed.',
  amris: 'Brother Amris planted a new orchard in Hoarfast, and the Duke came to see it bloom.',
  wren: 'Wren went back to the unicorns. They say she talks to them more than to people. They answer.',
  morgause: 'Queen Morgause never lost another war. She never started one, either.',
  agravain: 'Sir Agravain challenged Dame Ragnell to a rematch every Midsummer. He never won.',
  elidure: 'Captain Elidure trained a generation of archers who could split a falling leaf.',
  brennoc: "Old Brennoc's wyverns flew again. He wept, and blamed the smoke.",
  hesper: 'Magus Hesper Vey burned her books on the Hour. Most of them.',
  enid: 'Lady Enid ruled Amberlyn with a gentle, firm and practical hand.',
  dagonet: 'Sir Dagonet became the most famous jester in Forseason. He was never afraid again. Mostly.',
  vesna: 'Vesna kept the Lantern Road lit, and the dead slept soundly.',
  lamorak: 'Sir Lamorak retired to Ashbarrow, and guarded its walls from a rocking chair.',
  ragnell: 'Dame Ragnell brought the sense to Hoarfast for another thirty years.',
  safir: 'Sir Safir the Pale smiled, once, at a spring thaw. Witnesses disagree on the details.',
  nimue: 'Nimue returned to her mere. Its bargains grew kinder.',
  gorm: 'Gorm the Bear and his yeti were the gentlest giants in the north.',
  owain: 'Owain the Dragonless was given a new name: Owain of the Wings.',
  galeron: 'Sir Galeron stopped wandering. He had found his cause.',
  blanchefleur: 'Blanchefleur the Sellsword retired rich, and never told anyone how rich.',
  ettard: 'Sister Ettard founded a hospital in Meridian. Its physicians tied excellent knots.',
  hob: 'Hob Mudspur became a respectable toll-keeper. His boots were always new.',
  gerrow: "Mother Gerrow's mill turned again, and fed half the province.",
  dafydd: 'Red Dafydd shouted at every festival in Forseason, invited or not.',
  abbot: 'The Hollow Abbot rang the abbey bells again, and the dead rested at last.',
  lunete: c => 'Lunete was crowned Keeper of the Wheel. ' + ({ verdance: 'Gareth', solmark: 'Morgause', amberlyn: 'Enid', hoarfast: 'Mordrain' }[c.realm]) + ' knelt first.'
};
G.EPILOGUE_NO_LUNETE = { verdance: 'Gareth wound the Great Clock each midwinter until a new Keeper was found.', solmark: 'Morgause wound the Great Clock each midsummer until a new Keeper was found.', amberlyn: 'Enid wound the Great Clock each harvest until a new Keeper was found.', hoarfast: 'Mordrain wound the Great Clock each midwinter, and never once forgot.' };

/* ---- rival lines: 2 lines before a battle when both are on the field (the first match plays) ---- */
G.RIVALS = [
  ['agravain', 'ragnell', "Ice-Eye! I've waited all summer to melt you.", "Then you'll wait all winter to stand back up."],
  ['pelleas', 'elidure', 'Captain! Did you read my letter?', "I'm reading your formation, Sir Pelleas. It's worse."],
  ['gareth', 'morgause', "The Wheel isn't yours to take, Your Majesty.", 'Then come and stop me, princeling. Bring your blossoms.'],
  ['mordrain', 'pellam', 'The Quiet King! Say something, old man!', '...No.'],
  ['lynette', 'agravain', 'Cinderjaw. Still shouting?', 'Still standing in my way?'],
  ['dagonet', 'hob', 'A brigand with a funny name! Finally, a rival.', 'Oi! Mudspur is a proud name!'],
  ['morgause', 'pellam', 'Step aside, old king. Summer has no patience for harvests.', '...Patience.'],
  ['mordrain', 'gareth', 'Little sprout! Do you know why snow is so quiet?', "Because it's waiting for spring."],
  ['meliant', 'lunete', 'Princess... you should be asleep beside your father.', 'Somebody has to stay awake, Chancellor.'],
  ['bertilak', '*', 'Courtesy first: I shall kill you slowly, and with every respect.', null],
  ['tic', '*', 'Tic says—', '—Tac agrees!', 'tac'],
  ['aurelie', '*', 'Must you? I was enjoying the silence.', null],
  ['graynight', '*', 'Twelve bells, little crown. Then nothing, ever again.', null]
];
/** the rival exchange for a battle's knights (refs on each side), or null */
G.rivalLine = (a, b) => {
  for (const [x, y, l1, l2, z] of G.RIVALS) {
    const has = (list, id) => id === '*' ? list.length > 0 : list.includes(id);
    if (has(a, x) && has(b, y) || has(b, x) && has(a, y)) return [[x, l1], l2 ? [z || (y === '*' ? x : y), l2] : null].filter(Boolean);
  }
  return null;
};

/* ---- quest vignettes ({$knight}, {$site}, {$thing}) ---- */
G.VIGNETTES = {
  treasure: ['{$knight} returns from {$site} with dust on the boots and a {$thing} wrapped in a cloak.', '{$knight} comes back from {$site} with thorns in the hair and a {$thing} in hand.', 'Under an old stone at {$site}, {$knight} found a {$thing}. Nobody else had looked there in a century.'],
  beast: ['A {$thing} followed {$knight} home from {$site}. It will not leave.', '{$knight} bargained with a {$thing} at {$site}. The bargain was a long scratch behind the ears.', 'At {$site}, a wild {$thing} challenged {$knight}, lost, and decided to stay.'],
  wanderer: ['On the road from {$site}, {$knight} met {$thing}, who asked to ride with you.', '{$knight} returns from {$site} with company: {$thing}, sword and all.', 'At {$site}, {$knight} shared a fire with {$thing}. By morning they were sworn to the same banner.'],
  mana: ['{$knight} drew a spring of mana from {$site}: {$thing} for the treasury.', 'The old wards of {$site} gave up their power to {$knight}: {$thing}.', '{$knight} returns from {$site} with {$thing}, humming like a struck bell.'],
  training: ['{$knight} trained hard at {$site}, and the troop with them. They return sharper.', 'A season at {$site} taught {$knight} more than a year at court.', '{$knight} and the troop drilled at {$site} until the ground was bare. It shows.'],
  mishap: ["{$knight}'s patrol was ambushed at {$site}. They will mend.", '{$knight} fell from a cliff at {$site}. Nothing broken that will not heal.', 'At {$site}, {$knight} met something old and angry. {$knight} came back. Barely.'],
  mishapLoss: ["{$knight}'s patrol was ambushed at {$site}. {$knight} will mend; the {$thing} will not.", 'The ice gave way at {$site}. {$knight} was pulled out. The {$thing} was not.', 'At {$site}, {$knight} lost the {$thing} to something in the dark.'],
  keeper: 'In the Sleeping Court, the Keeper lies between two seconds, his lips moving on a word no one can hear.'
};

/* ---- before a battle: events that change the field ---- */
G.beforeBattle = (sim, p) => {
  const out = [], s = sim.s; if (!p || p.kind !== 'battle') return out;
  const att = p.march.knights, def = p.defenders || [];
  if (sim.isHuman('solmark') && !s.seen['s_agravain_duel@solmark'] && (att.includes('agravain') && def.includes('ragnell') || def.includes('agravain') && att.includes('ragnell'))) out.push({ id: 's_agravain_duel', realm: 'solmark', fx: { agravain: { valor: 1 } } });
  if (sim.isHuman('amberlyn') && !s.seen['a_lamorak_stand@amberlyn'] && p.castle === 'ashbarrow' && def.includes('lamorak')) out.push({ id: 'a_lamorak_stand', realm: 'amberlyn', fx: { lamorak: { warded: 2 } } });
  for (const o of out) s.seen[o.id + '@' + o.realm] = s.turn;
  return out;
};

}

// ===== src/10-data-about.js =====
{
// ABOUT & CREDITS: the Source Information and the three feedback lists (the same text as exit-interview.json and the
// final reply), and the credits. "unknown" stands for anything that can't be confirmed.

G.ABOUT = {
  title: 'Brigantime: The Legend of Forseasons',
  tagline: 'Four seasons. Four crowns. One stopped clock.',
  source: [
    ['Date', '2026-11-04 05:02:20'],
    ['Source', 'Brigandine: The Legend of Forsena (Hearty Robin / Atlus, PlayStation, 1998)'],
    ['Plan', 'PLAN.md'],
    ['Genre', 'Turn-based grand strategy with a tactical RPG hex-battle layer'],
    ['Perspective', 'Three-quarter overhead continent map; tilted overhead hex board for battles (isometric alternate); side-on stages for story scenes'],
    ['Tech', 'my-3D2dge engine v0.85.2 (full edition, patched), a new BEASTS engine module, AI Hub Session Protocol v1 client 1.4.0; plain JavaScript in one HTML file; Node 24 and Playwright 1.63 for tests'],
    ['Art Direction', "The engine's native PS1-era pixel style: shaded HD Humanoids, procedural beast rigs, textured hex floors baked per season, code-drawn shapes and props, canvas lighting and weather"],
    ['Animation', "The engine's procedural Humanoid rigs and named moves (each class line its own), Blobs, and new procedural beast rigs (quadrupeds, drakes, birds, serpents) with gait, IK legs, tail springs and actions"],
    ['Audio', 'All in code: chip-synth music in the step format built on one Wheel motif changed by season, stings, about 45 synthesized effects, and Animalese-style babble voices per character'],
    ['Online', 'AI Hub shared-world sessions for 2-4 players (Banners of the Wheel); local hot-seat for 1-4'],
    ['Testing', 'Headless Node suites driving game.advance and game.debug (rules, determinism, AI, campaign, saves, story, UI flow, attract, touch, dev, hub protocol, scripted playthroughs), plus Playwright tests (the bundle from file://, a real mouse, a touch-only phone), screenshots and the AI Hub harness'],
    ['Research', 'Read the engine handoff docs (README, API, guide sections, asset card) and the AI Hub README; no web research during the build (the plan cites Wikipedia and an RPGFan review read while planning)'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort xhigh'],
    ['Usage', "API cost and token counts: unknown (not visible from inside the session). Session time: about 2 hours 15 minutes of wall-clock time by the system clock (05:02 to about 07:17)."]
  ],
  testing: [
    "About 33 game issues, plus about 10 bugs in my own tests and tools. Examples: a boot crash (scene registry not defined yet), a story-talk reference read before it existed, menus that took no input before their first draw, unreadable keycaps (the font's dark outline), missing glyphs, campaign AIs that never attacked, attackers that ran out the clock, an unwinnable Sanctum, battle AI turns of up to 750 ms, confirm dialogs that defaulted to No, a mouse that could not hover-focus menu items and clicks that picked the focused item instead of the one clicked, a case-sensitive Xbox setting, heal EXP paid per target, and text that overlapped on the results, realm and event screens.",
    "5 critical: the boot crash, the story-talk crash, the campaign AI that never attacked (no campaign could end), the unwinnable Sanctum (no campaign could be won), and battle AI stalls of up to 750 ms per move.",
    "The scripted playthroughs: a full four-year campaign for each realm, driven through the real scenes by input and autoplay until the ending and credits. They found the stalled campaign AI, the unwinnable Sanctum, the input-order bugs in the tutorial and the confirm defaults. No unit test could have caught those.",
    "The banned-word and comment greps over the build. They mostly found false positives, such as 'xxx' inside pixel-sprite strings, and never caught a real problem."
  ],
  engine: [
    "game.advance and game.debug: the game runs headless in Node with no special mode, so every scene, menu and battle could be tested by input. The Humanoid rigs with their named moves also give each class a distinct fighter for free.",
    "Yes. E.font.text draws a dark outline by default, which made the light keycaps unreadable until I passed outline:false. The pixel font has no middle dot, no PlayStation shapes (cross, circle, square, triangle) and no up or down triangles, so they rendered as ? and I drew the button glyphs myself. Menu lists compute their geometry only when drawn, so headless input before the first draw went nowhere.",
    "The deterministic battle and campaign simulations and their AIs, which also carry the AI Hub sync and the tests. After those, a creature-rig module (BEASTS) for the 30 monster species, since the engine animates only Humanoids and Blobs.",
    "Building a 10-foot, controller-first UI from the engine's pieces. The text, outline, glyph coverage and layout timing all had to be learned by screenshot, and the API is one large file with long docs, so finding the right call took time.",
    "Two small core patches in my-3d2dge.js: Dialog accepts a function voice called once per typed letter (needed for Animalese babble that follows the text), and Audio exposes sfxBus so custom Web Audio voices follow the volume and mute settings. A new engine-ext/beasts.js module adds E.Beast and E.Wings (quadruped, drake, bird and serpent rigs). Game code registers a 'board' camera view and a 'petals' weather. Details are in ENGINE-CHANGES.md.",
    "Ship non-humanoid creature rigs (four-legged, winged, serpentine) in the core, with the same named-move system as Humanoid. A monster-heavy game currently has to build its whole bestiary animation itself."
  ],
  prompt: [
    "How concrete the plan is. It has exact tunables, ASCII battle maps, full rosters, a story script and AI rules, so nearly every design question already had an answer. The done criteria and the one-command test rule were also clear.",
    "Some targets read as hard requirements but are hard to verify or reach, such as the AI-only campaign win rates. How AI Hub seats map onto realms alongside local hot-seat play was left to me. I also wasn't sure whether Usage needs numbers when no estimates are visible.",
    "Balance across the whole content load (36 knights, 30 species, 90 skills, 13 maps, about 50 story events). Getting every realm's four-year campaign to a winnable, fair Sanctum took the most iteration. I tuned away from the plan (EXP scale 1.5, a weaker Gray Knight and minions, more aggressive AI), and AI-only campaigns still rarely win the Sanctum.",
    "Mark which content is core and which is stretch, and give balance targets as ranges with a stated priority. Say up front which plan numbers may be retuned."
  ],
  credits: [
    ['Game', ['Brigantime: The Legend of Forseasons', 'Designed from PLAN.md; built by Claude (claude-opus-5-5)']],
    ['Engine', ['my-3D2dge (MIT) by Michael Crosato', 'BEASTS module written for this game']],
    ['Online', ['AI Hub Session Protocol v1, client 1.4.0']],
    ['Assets', ['Core shape library of my-3D2dge (CC0 sources: Kenney, KayKit, ambientCG catalogs)', 'Every character, beast, castle and sound drawn or composed in code']],
    ['Inspiration', ['Inspired by Brigandine: The Legend of Forsena.', 'The world, characters, music and art are original.']]
  ]
};

}

// ===== src/20-sim-battle.js =====
{
// BATTLESIM: a hex battle of up to three troops a side (or a free-for-all of up to four), fought within twelve bells.
// Pure and deterministic: its state is plain JSON (this.s), its randomness G.Rng on s.rs, and it never touches the
// engine, the DOM, the clock or Math.random. apply(cmd) -> events[]; legal(cmd); forecast(...); serialize(); hash().
// Commands (the active troop's units only):
//   { t: 'move', u, to: [cx, cy] }  { t: 'undo', u }  { t: 'act', u, a: 'attack' | skillId | 'item:<id>', at: [cx, cy] }
//   { t: 'guard', u }  { t: 'wait', u }  { t: 'retreat', u }  { t: 'end' }
// Plus tools: { t: 'win', side }, { t: 'ko', u }, { t: 'bell', n }, { t: 'season', s }, { t: 'dials' }.

const H = G.hex, R = G.Rng;
// neighbour offsets in offset rows (even and odd rows), the same order as G.hex.DIRS
const EVEN = [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], ODD = [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]];

/* ---- building field units from campaign records (shared with skirmish and the hub) ---- */
/** a field unit spec from a knight record { id, cls, level, exp, stats, hp, mp, elem, items, ruler, learned, realm } */
G.unitFromKnight = (k, o = {}) => {
  const def = G.has('knight', k.id) ? G.get('knight', k.id) : null, c = G.get('class', k.cls), boost = 1 + (o.boost || 0);
  const s = Object.assign({}, k.stats), mods = { atk: 0, def: 0, int: 0, agi: 0, mp: 0, mov: 0, ward: 0, bond: 0 }, flags = { immune: [] };
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const id = k.items && k.items[slot]; if (!id) continue; const it = G.get('item', id);
    for (const [m, v] of Object.entries(it.mods)) mods[m] = (mods[m] || 0) + v;
    for (const [f, v] of Object.entries(it.flags)) { if (f === 'immune') flags.immune.push(...v); else if (f === 'range') flags.range = (flags.range || 0) + v; else flags[f] = v; }
  }
  const skills = G.classSkills(k.cls, k.elem, k.level).concat(k.learned || []).filter((v, i, a) => a.indexOf(v) === i);
  const basic = Object.assign({}, c.basic); if (flags.range) basic.range = [basic.range[0], basic.range[1] + flags.range];
  if (skills.includes('eagleeye') && basic.ranged) basic.range = [basic.range[0], basic.range[1] + 1];
  const mhp = Math.round(s.hp * boost), mmp = s.mp + mods.mp;
  return {
    kind: 'knight', ref: k.id, name: (def && def.short) || k.name || k.id, cls: k.cls, level: k.level, exp: k.exp || 0, elem: k.elem, size: 'M',
    mhp, hp: Math.min(mhp, Math.round((k.hp === undefined ? s.hp : k.hp) * boost)), mmp, mp: Math.min(mmp, k.mp === undefined ? mmp : k.mp),
    atk: Math.round((s.atk + mods.atk) * boost), def: Math.round((s.def + mods.def) * boost), int: Math.round((s.int + mods.int) * boost), agi: Math.round((s.agi + mods.agi) * boost),
    mov: c.mov + mods.mov, ward: c.ward + mods.ward, skills, basic, flags, ruler: !!k.ruler, boss: !!(def && def.boss), realm: k.realm,
    growth: G.classGrowth(k.cls), stats: s
  };
};
/** a field unit spec from a monster record { uid, sp, form, level, exp, hp, mp } */
G.unitFromMonster = (m, o = {}) => {
  const sp = G.get('monster', m.sp), st = G.monsterStats(m.sp, m.form, m.level), fl = G.monsterFlags(m.sp, m.form), boost = 1 + (o.boost || 0);
  const skills = G.monsterSkills(m.sp, m.form), mhp = Math.round(st.hp * boost);
  return {
    kind: 'monster', ref: m.uid, sp: m.sp, form: m.form, name: G.monsterName(m.sp, m.form), level: m.level, exp: m.exp || 0, elem: sp.elem, size: G.monsterSize(m.sp, m.form),
    mhp, hp: Math.min(mhp, Math.round((m.hp === undefined ? st.hp : m.hp) * boost)), mmp: st.mp, mp: Math.min(st.mp, m.mp === undefined ? st.mp : m.mp),
    atk: Math.round(st.atk * boost), def: Math.round(st.def * boost), int: Math.round(st.int * boost), agi: Math.round(st.agi * boost), mov: st.mov,
    flier: fl.flier, swimmer: fl.swimmer, floater: fl.floater, skills, basic: Object.assign({ anim: 'bite' }, sp.basic), flags: { immune: [] },
    elite: !!sp.elite, breath3: !!sp.breath3, realm: m.realm
  };
};

const PASSIVES = ['thorns', 'regenerate', 'frostfang', 'stopbite', 'rebirth', 'ambush', 'packtactics', 'thickhide', 'eagleeye', 'timeless'];

/** a binary heap ordered by [priority, tie]: the same pops every time */
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  _lt(i, j) { const p = this.a[i], q = this.a[j]; return p[0] !== q[0] ? p[0] < q[0] : p[1] < q[1]; }
  push(pri, tie, v) { const a = this.a; a.push([pri, tie, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!this._lt(i, p)) break; [a[i], a[p]] = [a[p], a[i]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && this._lt(l, m)) m = l; if (r < a.length && this._lt(r, m)) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } } return top; }
}
G.MinHeap = MinHeap;

class BattleSim {
  constructor(s) { this.s = s; }
  static load(json) { return new BattleSim(typeof json === 'string' ? JSON.parse(json) : G.clone(json)); }
  serialize() { return JSON.stringify(this.s); }
  hash() { return G.hashJSON(this.s); }

  /**
   * spec: { seed, map, season, mode ('siege' | 'sanctum' | 'shrine' | 'free'), wheel, bells, longWinter, castle,
   *   sides: [{ realm, role ('att' | 'def' | 'seat'), name, color, human, items: { id: n },
   *     troops: [{ knight: unitSpec, monsters: [unitSpec], formation, anchor }] }], tutorial, lunete, events }
   */
  static create(spec) {
    const p = G.parseMap(spec.map), m = G.get('map', spec.map), mode = spec.mode || m.mode || 'siege';
    const s = {
      v: 1, rs: R.seed(spec.seed || 1), map: spec.map, w: p.w, h: p.h, base: p.codes, mode, flood: m.flood,
      season: spec.wheel ? 'spring' : spec.season || 'spring', wheel: !!spec.wheel, longWinter: !!spec.longWinter,
      cells: null, burn: {}, keep: p.keep, castle: spec.castle || null, bells: spec.bells || (mode === 'shrine' ? 6 : G.tune.bells),
      bell: 0, order: [], oi: 0, active: null, n: 0, over: null, units: {}, troops: [], sides: [], nextId: 1,
      glory: {}, stats: {}, dials: p.dials.map(c => ({ c, lit: false })), hand: 0, handStopped: false, wheelTurned: false,
      gkCalled: false, tutorial: !!spec.tutorial, captures: [], itemsUsed: {}, log: [], flags: {}
    };
    s.cells = s.base.map(c => G.seasonTerrain(c, s.season, s.flood));
    const sim = new BattleSim(s), ev = [];
    spec.sides.forEach((sd, i) => {
      s.sides.push({ i, realm: sd.realm, role: sd.role || (i === 0 ? 'att' : 'def'), name: sd.name || (G.has('realm', sd.realm) ? G.get('realm', sd.realm).short : sd.realm), color: sd.color || (G.has('realm', sd.realm) ? G.get('realm', sd.realm).color : '#ffffff'), human: !!sd.human, items: Object.assign({}, sd.items || {}), out: false, seat: sd.seat === undefined ? i : sd.seat, expMul: sd.expMul || 1 });
      s.glory[i] = 0; s.stats[i] = { damage: 0, kos: 0, shrine: 0 };
    });
    // deploy: enemy direction from each side's anchors toward the others'
    const anchorOf = (sd, t, ti) => t.anchor || (sd.role === 'def' ? String(7 + ti) : sd.role === 'seat' ? String(sd.seat + 1) : String(1 + ti));
    const allAnchors = spec.sides.map((sd, i) => sd.troops.map((t, ti) => p.anchors[anchorOf(Object.assign({ seat: i }, sd), t, ti)]).filter(Boolean));
    spec.sides.forEach((sd, i) => {
      const foes = allAnchors.filter((_, j) => j !== i).flat(), fc = foes.length ? foes.map(c => H.center(c)).reduce((a, b) => [a[0] + b[0] / foes.length, a[1] + b[1] / foes.length], [0, 0]) : [p.w * 14, p.h * 12];
      sd.troops.forEach((t, ti) => {
        const anc = p.anchors[anchorOf(Object.assign({ seat: i }, sd), t, ti)]; if (!anc) return;
        const tid = s.troops.length, troop = { id: tid, side: i, knight: null, units: [], gone: false, formation: t.formation || 'vanguard', auto: false };
        s.troops.push(troop);
        const k = sim._addUnit(t.knight, i, tid); troop.knight = k.id;
        const kc = sim._freeNear(anc, k) || anc; k.cx = kc[0]; k.cy = kc[1]; k.facing = sim._dirToPoint(kc, fc); sim.dirty();
        for (const ms of t.monsters || []) {
          const u = sim._addUnit(ms, i, tid), c = sim._formationHex(kc, fc, troop.formation, u);
          if (!c) { delete s.units[u.id]; continue; }
          u.cx = c[0]; u.cy = c[1]; u.facing = k.facing; sim.dirty();
        }
      });
    });
    if (mode === 'sanctum') {   // the Gray Knight leads the Dominion side and is its ruler
      for (const u of Object.values(s.units)) if (u.ref === 'graynight') { u.ruler = true; u.boss = true; u.passives.timeless = true; }
    }
    ev.push({ e: 'deploy' });
    sim._startBell(ev);
    s.log.push(...ev.map(e => e.e)); if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
    for (const e of ev) e.n = ++s.n;
    sim.startEvents = ev;
    return sim;
  }
  _addUnit(spec, side, troop) {
    const s = this.s, id = 'u' + s.nextId++;
    const u = Object.assign({ id, side, troop, cx: -1, cy: -1, facing: 0, fx: {}, moved: 0, from: null, acted: false, done: false, alive: true, out: false, dead: false, captured: null, exp0: spec.exp || 0, level0: spec.level, expGain: 0, levelsGained: 0, gains: {}, passives: {}, rebirthUsed: false, turningUsed: false, windup: false, ruler: false, boss: false, elite: false, flier: false, swimmer: false, floater: false, kos: 0, dmgDealt: 0, healed: 0 }, G.clone(spec));
    for (const p of PASSIVES) if (u.skills.includes(p)) u.passives[p] = true;
    if (u.flags && u.flags.thorns) u.passives.thorns = true;
    s.units[id] = u; s.troops[troop].units.push(id); this.dirty();
    return u;
  }
  _dirToPoint(c, pt) { const [x, y] = H.center(c); let a = Math.atan2(pt[1] - y, pt[0] - x) * 180 / Math.PI; if (a < 0) a += 360; return Math.round(a / 60) % 6; }
  _freeNear(c, u) {
    for (let r = 0; r <= 3; r++) for (const h of H.within(c, r, this.s.w, this.s.h).filter(x => H.dist(x, c) === r)) if (this.canStand(h, u) && !this.at(h)) return h;
    return null;
  }
  _formationHex(kc, fc, form, u) {
    const s = this.s, [kx, ky] = H.center(kc), fl = Math.hypot(fc[0] - kx, fc[1] - ky) || 1, fd = [(fc[0] - kx) / fl, (fc[1] - ky) / fl];
    const cands = H.within(kc, 4, s.w, s.h).filter(h => !H.eq(h, kc) && this.canStand(h, u) && !this.at(h));
    const score = h => {
      const d = H.dist(h, kc), [x, y] = H.center(h), dot = ((x - kx) * fd[0] + (y - ky) * fd[1]) / (Math.hypot(x - kx, y - ky) || 1);
      if (form === 'vanguard') return (d <= 2 && dot > .2 ? 0 : 10) + d * 2 - dot * 3;
      if (form === 'column') return (dot < -.6 ? 0 : dot < 0 ? 6 : 12) + d * 2 + Math.abs((x - kx) * fd[1] - (y - ky) * fd[0]) / 14;
      return d * 4 - dot;   // shield: the ring first
    };
    cands.sort((a, b) => score(a) - score(b) || a[1] - b[1] || a[0] - b[0]);
    return cands[0] || null;
  }

  /* ---- queries ---- */
  unit(id) { return this.s.units[id]; }
  get units() { return Object.values(this.s.units); }
  onField(u) { return u.alive && !u.out && !u.captured; }
  field() { return this.units.filter(u => this.onField(u)); }
  at(c) {
    if (!this._occ) { this._occ = new Map(); for (const id in this.s.units) { const u = this.s.units[id]; if (this.onField(u)) this._occ.set(u.cy * 1000 + u.cx, u); } }
    return this._occ.get(c[1] * 1000 + c[0]) || null;
  }
  /** positions changed: the occupancy cache is rebuilt on the next at() */
  dirty() { this._occ = null; this._reachCache = null; }
  code(c) { return this.s.cells[c[1] * this.s.w + c[0]]; }
  inside(c) { return H.inside(c, this.s.w, this.s.h); }
  troop(id) { return this.s.troops[id]; }
  activeTroop() { return this.s.active === null ? null : this.s.troops[this.s.active]; }
  knightOf(u) { const t = this.s.troops[u.troop]; return t ? this.s.units[t.knight] : null; }
  foes(a, b) { return a.side !== b.side; }
  canStand(c, u) { return this.inside(c) && G.canEnd(this.code(c), u); }
  sideOf(i) { return this.s.sides[i]; }
  sideKnights(i) { return this.field().filter(u => u.side === i && u.kind === 'knight'); }
  /** the season's movement penalty and buffs */
  movOf(u) {
    let m = u.mov; if (u.fx.haste) m += 1; if (u.fx.chill) m -= 1;
    if (this.s.season === 'autumn' && u.flier) m -= 1;
    return Math.max(1, m);
  }
  /** effective stats of a unit standing at c (the Ward penalty, buffs and debuffs) */
  eff(u, c = [u.cx, u.cy]) {
    let atk = u.atk, def = u.def, int = u.int, agi = u.agi;
    if (u.kind === 'monster') { const k = this.knightOf(u); if (k && this.onField(k) && H.dist(c, [k.cx, k.cy]) > k.ward) { const p = 1 - G.tune.wardPenalty; atk *= p; def *= p; int *= p; } }
    const f = u.fx;
    if (f.valor) atk *= 1.2; if (f.weakened) atk *= .85;
    if (f.warded) def *= 1.2; if (f.exposed) def *= .8; if (f.burn) def *= .9; if (f.frostarmor) def *= 1.4; if (u.passives.thickhide) def *= 1.1;
    if (f.haste) agi *= 1.2; if (f.chill) agi *= .8;
    if (u.boss && this.s.wheelTurned) def *= .6;
    return { atk, def, int, agi };
  }
  /** move cost of a hex for a unit */
  stepCost(c, u) { return G.moveCost(this.code(c), u, this.s.season); }
  /** reachable hexes { key: { c, cost, path } } for unit u from its hex (enemies block; allies pass; can't end occupied) */
  reach(u, budget = this.movOf(u)) {
    const ck = u.id + ':' + budget + ':' + u.cx + ',' + u.cy;
    if (!this._reachCache) this._reachCache = new Map();
    const hit = this._reachCache.get(ck); if (hit) return hit;
    const out = this._reach(u, budget); this._reachCache.set(ck, out); return out;
  }
  _reach(u, budget) {
    const s = this.s, W = s.w, Hh = s.h, N = W * Hh, cost = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const si = u.cy * W + u.cx; cost[si] = 0;
    const open = new MinHeap(); open.push(0, si, si);
    const stepC = new Float64Array(N).fill(-1);
    while (open.size) {
      const [c0, , i] = open.pop(); if (c0 > cost[i]) continue;
      const x = i % W, y = (i - x) / W, D = y & 1 ? ODD : EVEN;
      for (let d = 0; d < 6; d++) {
        const nx = x + D[d][0], ny = y + D[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= Hh) continue;
        const ni = ny * W + nx;
        const o = this.at([nx, ny]); if (o && o.side !== u.side) continue;
        let sc = stepC[ni]; if (sc < 0) sc = stepC[ni] = G.moveCost(s.cells[ni], u, s.season);
        if (!isFinite(sc)) continue;
        const nc = c0 + sc; if (nc > budget || nc >= cost[ni]) continue;
        cost[ni] = nc; prev[ni] = i; open.push(nc, ni, ni);
      }
    }
    const out = {};
    for (let i = 0; i < N; i++) {
      if (!isFinite(cost[i])) continue;
      const x = i % W, y = (i - x) / W, c = [x, y];
      if (i !== si) { if (!G.canEnd(s.cells[i], u)) continue; if (this.at(c)) continue; }
      const path = []; for (let k = i; k >= 0; k = prev[k]) { const kx = k % W; path.unshift([kx, (k - kx) / W]); if (k === si) break; }
      out[H.key(c)] = { c, cost: cost[i], path };
    }
    return out;
  }
  /** the skill spec for an action id of a unit ('attack' -> its basic attack) */
  skillOf(u, a) {
    if (a === 'attack') return Object.assign({ kind: 'basic', elem: 'user', p: u.basic.p, range: u.basic.range, area: 'single', who: 'foes', mp: 0, mobile: true, ranged: !!u.basic.ranged, status: u.basic.status, drainPct: u.basic.drainPct, name: u.basic.name, anim: u.basic.anim, fx: u.basic.ranged ? 'arrow' : 'slash' }, {});
    if (a && a.startsWith('item:')) { const it = G.get('item', a.slice(5)); return { kind: 'item', item: it.id, name: it.name, range: [0, 1], area: 'single', who: 'ally', mp: 0, mobile: true, use: it.use, fx: 'heal', anim: 'cast' }; }
    const sk = G.get('skill', a); return sk;
  }
  /** the actions a unit could take now (labels for menus), each { a, sk, ok, why } */
  actions(u) {
    const out = [{ a: 'attack', sk: this.skillOf(u, 'attack') }];
    for (const id of u.skills) { const sk = G.get('skill', id); if (sk.kind !== 'passive') out.push({ a: id, sk }); }
    if (u.kind === 'knight') for (const [id, n] of Object.entries(this.s.sides[u.side].items)) if (n > 0 && G.get('item', id).slot === 'consumable' && !G.get('item', id).muster) out.push({ a: 'item:' + id, sk: this.skillOf(u, 'item:' + id), count: n });
    for (const o of out) { const w = this.why(u, o.a); o.ok = !w; o.why = w; }
    return out;
  }
  /** why a unit can't use an action now (null: it can) */
  why(u, a) {
    const s = this.s, sk = this.skillOf(u, a);
    if (!this.onField(u)) return 'Not on the field';
    if (u.acted || u.done) return 'Already acted';
    if (sk.kind === 'spell' && u.moved > 0) return 'Spells need planted feet';
    if (sk.kind === 'special' && u.moved > 0 && !sk.mobile) return 'Not after moving';
    if (sk.needMove && u.moved < sk.needMove) return 'Move ' + sk.needMove + '+ hexes first';
    if (sk.fliers && !u.flier) return 'Fliers only';
    if ((sk.mp || 0) > u.mp) return 'Not enough MP';
    if (sk.oncePerBattle && u.turningUsed) return 'Once a battle';
    if (sk.every) { const ev = u.boss && u.hp < u.mhp / 2 ? 2 : sk.every; if (s.bell % ev !== 0) return 'Only every ' + ev + (ev === 2 ? 'nd' : 'rd') + ' bell'; }
    if (sk.kind === 'item' && !(s.sides[u.side].items[sk.item] > 0)) return 'None left';
    if (!this.targets(u, a).length) return 'No target in range';
    return null;
  }
  /** effective range of an action from c */
  rangeOf(u, sk, c = [u.cx, u.cy]) {
    if (sk.range === 'self' || sk.range === 'ward') return sk.range;
    let [a, b] = sk.range; if (sk.ranged && this.code(c) === 'h') b += 1;
    return [a, b];
  }
  /** target hexes for an action from hex c (default: where it stands) */
  targets(u, a, c = [u.cx, u.cy]) {
    const sk = this.skillOf(u, a), s = this.s, out = [], rng = this.rangeOf(u, sk, c);
    if (rng === 'self') {
      if (sk.area === 'cone2' || sk.area === 'cone3' || sk.area === 'line3' || sk.area === 'line4') {
        for (let d = 0; d < 6; d++) { const n = H.step(c, d); if (this.inside(n) && this.affected(u, a, n, c).length) out.push(n); }
        return out;
      }
      return this.affected(u, a, c, c).length || sk.who === 'self' ? [c] : [];
    }
    if (rng === 'ward') {
      const k = u; for (const o of this.field()) if (o.troop === u.troop && o.kind === 'monster' && H.dist([o.cx, o.cy], c) <= k.ward) out.push([o.cx, o.cy]);
      return out;
    }
    for (const h of H.within(c, rng[1], s.w, s.h)) {
      const d = H.dist(h, c); if (d < rng[0]) continue;
      if (sk.area === 'single') {
        const o = this.at(h) || (H.eq(h, c) ? u : null); if (!o || !this._whoOk(u, o, sk, h, c)) continue;
        out.push(h);
      } else if (this.affected(u, a, h, c).length) out.push(h);
    }
    return out;
  }
  _whoOk(u, o, sk, h, c) {
    const self = o.id === u.id;
    switch (sk.who) {
      case 'foes': return this.foes(u, o);
      case 'ally': return !this.foes(u, o);
      case 'allies': return !this.foes(u, o);
      case 'ownMonster': return o.troop === u.troop && o.kind === 'monster';
      case 'ownMonsters': return o.troop === u.troop && o.kind === 'monster';
      case 'self': return self;
      case 'all': return true;
    }
    return false;
  }
  /** the hexes an action covers when aimed at h from c */
  area(u, a, h, c = [u.cx, u.cy]) {
    const sk = this.skillOf(u, a), s = this.s, w = s.w, hh = s.h;
    switch (sk.area) {
      case 'single': return [h];
      case 'self': return [c];
      case 'r1': return H.within(h, 1, w, hh);
      case 'r2': return H.within(h, 2, w, hh);
      case 'self-r1': return H.within(c, 1, w, hh).filter(x => !H.eq(x, c));
      case 'self-r2': return H.within(c, 2, w, hh).filter(x => !H.eq(x, c));
      case 'adj': return H.within(c, 1, w, hh).filter(x => !H.eq(x, c));
      case 'cone2': case 'cone3': { const n = sk.area === 'cone3' || u.breath3 ? 3 : 2; return H.cone(c, H.dirTo(c, h), n, w, hh); }
      case 'line3': return H.line(c, H.dirTo(c, h), 3, w, hh);
      case 'line4': return H.line(c, H.dirTo(c, h), 4, w, hh);
      case 'ward': return H.within(c, u.ward, w, hh);
      case 'troop': return this.field().filter(o => o.troop === u.troop).map(o => [o.cx, o.cy]);
    }
    return [h];
  }
  /** units an action touches when aimed at h from c */
  affected(u, a, h, c = [u.cx, u.cy]) {
    const sk = this.skillOf(u, a), out = [];
    for (const x of this.area(u, a, h, c)) {
      let o = this.at(x); if (o && o.id === u.id && !H.eq(c, [u.cx, u.cy])) o = null;
      if (!o && H.eq(x, c)) o = u;   // the user, when it would stand there
      if (!o || !this._whoOk(u, o, sk, x, c)) continue;
      if (sk.area !== 'single' && sk.area !== 'self' && sk.who !== 'all' && o.id === u.id && sk.who !== 'allies' && sk.who !== 'self') continue;
      out.push(o);
    }
    return out;
  }

  /* ---- formulas ---- */
  _elemOf(u, sk) { if (sk.elem === 'user' || sk.kind === 'basic') return u.elem; return sk.elem; }
  _elemMul(ae, de) {
    if (!ae || ae === 'none' || ae === 'hour' || !de || de === 'hour' || de === 'none') return 1;
    if (G.opposes(ae, de)) return G.tune.elemStrong; if (ae === de) return G.tune.elemSame; return 1;
  }
  _tide(u, t, ae, sk) {
    if (sk.noTide || ae === 'hour') return 1;
    let f = (u.passives.timeless ? 1 : G.tideOut(ae, this.s.season, this.s.longWinter, u.flags && u.flags.amulet));
    if (!(t.passives.timeless && !this._timelessBroken(t))) f *= G.tideIn(t.elem, this.s.season, t.flags && t.flags.amulet);
    return f;
  }
  _timelessBroken(t) { return this.s.wheelTurned || !!t.fx.untimed; }
  _adjAllies(u, t, c) { let n = 0; for (const x of H.neighbours([t.cx, t.cy])) { const o = this.at(x); if (o && o.side === u.side && o.id !== u.id && !this.foes(o, u)) n++; } return n; }
  /** a full forecast of one action of u from c aimed at h: [{ id, hit, dmg: [min, max], crit, ko, status, elem, tide, heal, ... }] */
  forecast(uid, a, h, c) {
    const u = typeof uid === 'string' ? this.unit(uid) : uid; c = c || [u.cx, u.cy];
    const sk = this.skillOf(u, a), out = [];
    for (const t of this.affected(u, a, h, c)) out.push(this._calc(u, t, sk, c, a));
    return out;
  }
  _calc(u, t, sk, c, a) {
    const tune = G.tune, s = this.s, A = this.eff(u, c), D = this.eff(t), r = { id: t.id, name: t.name, hit: 100, dmg: [0, 0], crit: 0, ko: 0, status: null, elem: null, tide: null, heal: 0, buff: null };
    const isFoe = this.foes(u, t), ae = this._elemOf(u, sk);
    if (sk.kind === 'item') { const use = sk.use; if (use.heal) r.heal = Math.min(use.heal, t.mhp - t.hp); if (use.mp) r.mp = use.mp; if (use.cleanse) r.cleanse = true; return r; }
    if (sk.heal) { const amt = typeof sk.heal === 'object' ? Math.round(t.mhp * sk.heal.pct) : Math.round((sk.heal + A.int * .8) * tune.healScale); r.heal = Math.min(amt, t.mhp - t.hp); }
    if (sk.buff && !isFoe) r.buff = sk.buff.map(b => b[0]);
    if (sk.cleanse) r.cleanse = true;
    if (sk.siphon) r.siphon = Math.min(sk.siphon, t.mp);
    const damaging = sk.p > 0 || sk.unmake;
    if (damaging) {
      const em = sk.elem === 'none' ? 1 : this._elemMul(ae, t.elem), tide = this._tide(u, t, ae, sk);
      r.elem = em > 1 ? 'strong' : em < 1 ? 'weak' : null; r.tide = tide > 1.001 ? 'up' : tide < .999 ? 'down' : null;
      let lo, hi;
      if (sk.unmake) { lo = hi = Math.max(1, Math.round(t.mhp * sk.unmake)); r.hit = 100; }
      else if (sk.magic) {
        let base = (sk.p + A.int - D.int * .5) * tune.magicScale * em * tide;
        if (t.fx.warded) base *= .8; if (sk.vsHour && t.elem === 'hour') base *= sk.vsHour;
        if (u.flags && u.flags.spellBoost && u.flags.spellBoost[0] === ae) base *= 1 + u.flags.spellBoost[1];
        if (t.passives.timeless && !this._timelessBroken(t)) base *= .5;
        lo = Math.max(1, Math.round(base * .9)); hi = Math.max(1, Math.round(base * 1.1)); r.hit = 100;
      } else {
        const dist = H.dist(c, [t.cx, t.cy]), area = sk.area || 'single', always = sk.always || area.startsWith('cone') || area.startsWith('line');
        let hit = tune.baseHit + (A.agi - D.agi) + G.sizeHit(u.size, t.size) + Math.min(15, 5 * this._adjAllies(u, t, c)) - G.terrainEva(this.code([t.cx, t.cy]), t) - 5 * Math.max(0, dist - 2) - (t.fx.guarded ? 10 : 0) + (sk.hitBonus || 0);
        if (s.season === 'spring' && (sk.ranged || dist > 1)) hit -= 5;
        if (s.season === 'winter' && u.elem !== 'winter') hit -= 5;
        if (this.code(c) === 'i' && u.elem !== 'winter') hit -= 10;
        if (u.kind === 'monster') { const k = this.knightOf(u); if (k && k.skills.includes('packtactics')) hit += 10; }
        r.hit = always ? 100 : G.clamp(Math.round(hit), 15, 99);
        let base = (A.atk * sk.p - D.def * tune.defFactor) * tune.dmgScale * em * tide * (1 - G.terrainDef(this.code([t.cx, t.cy]), t, this._keepOwner([t.cx, t.cy]), s.season));
        if (t.fx.guarded) base *= .7;
        base *= 1 + tune.surroundBonus * Math.min(3, this._adjAllies(u, t, c));
        if (sk.vsHour && t.elem === 'hour') base *= sk.vsHour;
        if (u.passives.ambush && this.code(c) === 'f') base *= 1.3;
        if (this.code(c) === 'h' && dist === 1) base *= 1.1;
        if (u.flags && u.flags.winterEdge && u.elem === 'winter') base *= 1 + u.flags.winterEdge;
        if (sk.kind === 'basic' && u.windup) base *= 1.5;
        if (t.passives.timeless && !this._timelessBroken(t)) base *= .5;
        lo = Math.max(1, Math.round(base * .9)); hi = Math.max(1, Math.round(base * 1.1));
        r.crit = always ? 0 : Math.min(30, tune.critBase + A.agi / 4);
      }
      r.dmg = [lo, hi];
      const hitP = r.hit / 100, maxD = r.crit ? Math.round(hi * 1.5) : hi;
      r.ko = hi >= t.hp ? hitP * (lo >= t.hp ? 1 : (hi - t.hp + 1) / (hi - lo + 1)) : maxD >= t.hp ? hitP * r.crit / 100 * .5 : 0;
      r.ko = Math.round(r.ko * 100);
    }
    let st = sk.status; if (sk.kind === 'basic') { if (u.passives.frostfang) st = ['chill', 30]; if (u.passives.stopbite) st = ['stop', 20]; if (u.basic.status) st = u.basic.status; }
    if (st && (isFoe || sk.who === 'all')) r.status = [st[0], this._statusChance(u, t, st)];
    if (t.kind === 'monster' && isFoe && damaging) r.captureRisk = this._captureChance(t);
    return r;
  }
  _statusChance(u, t, st) {
    const [id, base] = st;
    if (t.passives.timeless && !this._timelessBroken(t)) return 0;
    if (t.flags && t.flags.immune && t.flags.immune.includes(id)) return 0;
    if (id === 'stop' && t.fx.stopimmune) return 0;
    const A = this.eff(u), D = this.eff(t);
    let p = G.clamp(base + (G.get('effect', id).kind === 'status' ? A.int - D.int : 0), 10, 90) * G.tune.statusScale;
    if (t.boss) p /= 2;
    return Math.round(G.clamp(p, 0, 100));
  }
  _captureChance(t) {
    if (t.boss || t.elite) return 0;
    const k = this.knightOf(t); let p = G.tune.captureBase;
    if (k && H.dist([t.cx, t.cy], [k.cx, k.cy]) > k.ward) p += .25;
    if (t.hp < t.mhp * .3) p += .15;
    return Math.round(Math.min(.75, p) * 100);
  }
  _keepOwner(c) {
    const s = this.s; if (!s.keep || !H.eq(c, s.keep)) return -1;
    if (s.mode === 'shrine') { const o = this.at(c); return o ? o.side : -1; }
    const d = s.sides.findIndex(x => x.role === 'def'); return d;
  }

  /* ---- legality ---- */
  legal(cmd) { return !this.illegal(cmd); }
  /** why a command is illegal (a string), or null */
  illegal(cmd) {
    const s = this.s;
    if (s.over) return 'The battle is over';
    if (!cmd || !cmd.t) return 'No command';
    if (['win', 'ko', 'bell', 'season', 'dials', 'auto'].includes(cmd.t)) return null;
    const tr = this.activeTroop(); if (!tr) return 'No troop is active';
    if (cmd.t === 'end') return null;
    const u = this.unit(cmd.u); if (!u) return 'No such unit';
    if (u.troop !== tr.id) return 'Not this troop\'s turn';
    if (!this.onField(u)) return 'Not on the field';
    if (cmd.t === 'move') {
      if (u.done || u.acted) return 'Already acted';
      if (u.moved) return 'Already moved';
      if (!Array.isArray(cmd.to)) return 'No destination';
      const r = this.reach(u); return r[H.key(cmd.to)] ? null : 'Out of reach';
    }
    if (cmd.t === 'undo') return u.moved && !u.acted && !u.done && u.from ? null : 'Nothing to undo';
    if (cmd.t === 'guard' || cmd.t === 'wait') return u.done || u.acted ? 'Already acted' : null;
    if (cmd.t === 'retreat') return u.kind !== 'knight' ? 'Knights only' : u.done || u.acted ? 'Already acted' : null;
    if (cmd.t === 'act') {
      if (cmd.a && cmd.a.startsWith('item:') && u.kind !== 'knight') return 'Knights only';
      if (!cmd.a.startsWith('item:') && cmd.a !== 'attack' && !u.skills.includes(cmd.a)) return 'Unknown skill';
      const w = this.why(u, cmd.a); if (w) return w;
      if (!Array.isArray(cmd.at)) return 'No target';
      return this.targets(u, cmd.a).some(h => H.eq(h, cmd.at)) ? null : 'Not a valid target';
    }
    return 'Unknown command';
  }

  /* ---- applying commands ---- */
  apply(cmd) {
    this.dirty();
    const s = this.s, ev = [], bad = this.illegal(cmd);
    if (bad) return [{ e: 'illegal', why: bad, cmd }];
    const u = cmd.u ? this.unit(cmd.u) : null;
    switch (cmd.t) {
      case 'move': {
        const r = this.reach(u)[H.key(cmd.to)];
        u.from = [u.cx, u.cy]; u.cx = cmd.to[0]; u.cy = cmd.to[1]; u.moved = Math.max(1, r.path.length - 1); this.dirty();
        if (r.path.length > 1) u.facing = H.dirTo(r.path[r.path.length - 2], r.path[r.path.length - 1]);
        ev.push({ e: 'move', u: u.id, path: r.path });
        if (s.mode === 'sanctum' && u.ref === 'lunete') this._lightDial(u, ev, true);
        break;
      }
      case 'undo': ev.push({ e: 'undo', u: u.id, from: [u.cx, u.cy], to: u.from }); u.cx = u.from[0]; u.cy = u.from[1]; u.moved = 0; u.from = null; this.dirty(); break;
      case 'guard': u.fx.guarded = 1; u.acted = true; u.done = true; ev.push({ e: 'guard', u: u.id }); break;
      case 'wait': u.done = true; ev.push({ e: 'wait', u: u.id }); break;
      case 'retreat': u.acted = true; u.done = true; ev.push({ e: 'retreatcall', u: u.id }); this._troopLeaves(this.troop(u.troop), 'retreat', ev); break;
      case 'act': this._act(u, cmd, ev); break;
      case 'end': this._endTroop(ev); break;
      case 'win': this._finish(cmd.side, 'dev', ev); break;
      case 'ko': { const t = this.unit(cmd.u); if (t && this.onField(t)) { t.hp = 0; ev.push({ e: 'hit', u: t.id, t: t.id, dmg: 9999, hp: 0 }); this._down(t, null, ev); } break; }
      case 'bell': s.bell = G.clamp(cmd.n, 1, s.bells); ev.push({ e: 'bell', n: s.bell }); break;
      case 'season': this._setSeason(cmd.s, ev); break;
      case 'dials': for (const d of s.dials) d.lit = true; this._checkDials(ev); break;
    }
    if (!s.over && cmd.t !== 'end' && ['move', 'undo'].indexOf(cmd.t) < 0) {
      this._checkWin(ev);
      const tr = this.activeTroop();
      if (!s.over && tr && (tr.gone || this._troopDone(tr))) this._endTroop(ev);
    }
    for (const e of ev) e.n = ++s.n;
    s.log.push(...ev.map(e => e.e)); if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
    return ev;
  }
  _troopDone(tr) { return tr.units.every(id => { const x = this.unit(id); return !this.onField(x) || x.done; }); }

  _act(u, cmd, ev) {
    const s = this.s, sk = this.skillOf(u, cmd.a), at = cmd.at, c = [u.cx, u.cy];
    if (sk.mp && !(G.cheats && G.cheats.mp && s.sides[u.side].human)) u.mp -= sk.mp;
    if (sk.oncePerBattle) u.turningUsed = true;
    if (sk.kind === 'item') { s.sides[u.side].items[sk.item]--; const iu = s.itemsUsed[u.side] || (s.itemsUsed[u.side] = {}); iu[sk.item] = (iu[sk.item] || 0) + 1; }
    const tgt = this.at(at); if (tgt && tgt.id !== u.id) u.facing = H.dirTo(c, at); else if (sk.area && /cone|line/.test(sk.area)) u.facing = H.dirTo(c, at);
    ev.push({ e: 'act', u: u.id, a: cmd.a, name: sk.name, at, fx: sk.fx, anim: sk.anim, elem: this._elemOf(u, sk), kind: sk.kind, area: this.area(u, cmd.a, at) });
    if (sk.windup) { u.windup = true; ev.push({ e: 'buff', t: u.id, fx: 'windup' }); }
    // Mad Gambit's misfire: it Chills the Duke instead
    if (sk.misfire && !(s.flags.lucid) && R.chance(s, sk.misfire)) {
      u.fx.chill = 2; ev.push({ e: 'misfire', u: u.id }); ev.push({ e: 'status', t: u.id, s: 'chill', ok: true });
      u.acted = true; u.done = true; return;
    }
    let totalDmg = 0, helped = false;
    for (const t of this.affected(u, cmd.a, at)) {
      if (!this.onField(t)) continue;
      const f = this._calc(u, t, sk, c, cmd.a), isFoe = this.foes(u, t);
      if (f.heal || (sk.kind === 'item' && sk.use.heal)) { const amt = Math.max(0, Math.min(f.heal, t.mhp - t.hp)); t.hp += amt; u.healed += amt; ev.push({ e: 'heal', u: u.id, t: t.id, amt, hp: t.hp }); if (amt > 0) helped = true; }
      if (f.mp) { t.mp = Math.min(t.mmp, t.mp + f.mp); ev.push({ e: 'mp', t: t.id, amt: f.mp }); }
      if (f.cleanse) { for (const k of Object.keys(t.fx)) { const kind = G.get('effect', k).kind; if (kind === 'status' || kind === 'debuff') delete t.fx[k]; } ev.push({ e: 'cleanse', t: t.id }); }
      if (f.siphon) { t.mp -= f.siphon; u.mp = Math.min(u.mmp, u.mp + f.siphon); ev.push({ e: 'siphon', u: u.id, t: t.id, amt: f.siphon }); }
      if (sk.buff && !isFoe) {
        for (const [b, d] of sk.buff) t.fx[b] = Math.max(t.fx[b] || 0, d);
        ev.push({ e: 'buff', t: t.id, fx: sk.buff.map(b => b[0]).join(',') }); if (t.id !== u.id) helped = true;
      }
      if (f.dmg[1] > 0) {
        const hit = R.next(s) * 100 < f.hit;
        if (!hit) { ev.push({ e: 'miss', u: u.id, t: t.id }); continue; }
        const crit = f.crit > 0 && R.next(s) * 100 < f.crit;
        let dmg = f.dmg[0] + Math.floor(R.next(s) * (f.dmg[1] - f.dmg[0] + 1)); if (crit) dmg = Math.round(dmg * 1.5);
        if (!isFoe && sk.who === 'all') dmg = Math.max(1, dmg);
        this._damage(u, t, dmg, { crit, elem: f.elem, tide: f.tide, sk }, ev);
        totalDmg += dmg;
        if (sk.push && this.onField(t)) this._push(u, t, sk.push, ev);
      }
      if (f.status && this.onField(t) && f.status[1] > 0 && (isFoe || sk.who === 'all')) {
        const ok = R.next(s) * 100 < f.status[1];
        if (ok) { const [id] = f.status; const e = G.get('effect', id); t.fx[id] = id === 'stop' ? 1 : (e.dur || 2); if (id === 'sleep') t.done = true; }
        ev.push({ e: 'status', t: t.id, s: f.status[0], ok });
      }
      if (sk.breaksTimeless && t.passives.timeless && this.onField(t)) { t.fx.untimed = 2; ev.push({ e: 'untimed', t: t.id }); }
    }
    if (helped) this._exp(u, 8, ev);   // a heal or a buff: +8 once per action
    if (sk.drainPct && totalDmg > 0 && this.onField(u)) { const amt = Math.min(u.mhp - u.hp, Math.round(totalDmg * sk.drainPct)); if (amt > 0) { u.hp += amt; ev.push({ e: 'heal', u: u.id, t: u.id, amt, hp: u.hp }); } }
    if (sk.kind === 'basic' && u.windup) u.windup = false;
    if (sk.burnsForest && s.season === 'summer') for (const h of this.area(u, cmd.a, at)) if (this.code(h) === 'f') { s.cells[h[1] * s.w + h[0]] = 'B'; s.burn[H.key(h)] = 2; ev.push({ e: 'burnhex', c: h }); }
    if (this.onField(u)) { u.acted = true; u.done = true; }
  }
  _push(u, t, n, ev) {
    const d = H.dirTo([u.cx, u.cy], [t.cx, t.cy]), to = H.step([t.cx, t.cy], d);
    if (this.inside(to) && !this.at(to) && this.canStand(to, t) && isFinite(this.stepCost(to, t))) { ev.push({ e: 'push', t: t.id, from: [t.cx, t.cy], to }); t.cx = to[0]; t.cy = to[1]; this.dirty(); }
    else this._damage(u, t, 4, { bump: true }, ev);
  }
  /** deal damage (thorns, sleep waking, KO, glory, EXP) */
  _damage(u, t, dmg, o, ev) {
    const s = this.s;
    const ch = G.cheats;   // dev mode's cheats (never on outside dev mode)
    if (ch && ch.god && s.sides[t.side].human) dmg = 0;
    if (ch && ch.ohko && u && s.sides[u.side].human && this.foes(u, t)) dmg = t.hp;
    dmg = Math.min(dmg, t.hp); t.hp -= dmg; t.hitBell = s.bell;
    ev.push({ e: 'hit', u: u ? u.id : null, t: t.id, dmg, crit: !!o.crit, elem: o.elem || null, tide: o.tide || null, hp: t.hp, bump: !!o.bump });
    if (t.fx.sleep) { delete t.fx.sleep; ev.push({ e: 'wake', t: t.id }); }
    if (u && this.foes(u, t)) {
      u.dmgDealt += dmg; s.stats[u.side].damage += dmg;
      if (s.mode === 'shrine') this._glory(u.side, dmg / 5, ev, true);
      this._exp(u, G.clamp(8 + 2 * (t.level - u.level), 2, 30), ev);
      // thorns: melee attackers take 10% of the damage they deal
      if (t.passives.thorns && H.dist([u.cx, u.cy], [t.cx, t.cy]) === 1 && o.sk && this.onField(u)) {
        const back = Math.max(1, Math.round(dmg * .1)); u.hp = Math.max(0, u.hp - back); ev.push({ e: 'hit', u: t.id, t: u.id, dmg: back, thorns: true, hp: u.hp });
        if (u.hp <= 0) this._down(u, t, ev);
      }
    }
    if (t.hp <= 0) this._down(t, u, ev);
  }
  _down(t, by, ev) {
    const s = this.s; this.dirty();
    if (t.passives.rebirth && !t.rebirthUsed && t.kind === 'monster') { t.rebirthUsed = true; t.hp = Math.round(t.mhp * .3); ev.push({ e: 'rebirth', t: t.id, hp: t.hp }); return; }
    t.hp = 0;
    if (by && this.foes(by, t)) {
      const bonus = t.ruler ? 60 : t.kind === 'knight' ? 40 : 20; this._exp(by, bonus, ev); by.kos++; s.stats[by.side].kos++;
      if (s.mode === 'shrine') this._glory(by.side, t.kind === 'knight' ? 25 : 10, ev);
    }
    if (t.kind === 'monster') { t.alive = false; t.dead = true; ev.push({ e: 'ko', t: t.id, dead: true }); }
    else {
      t.alive = false; t.wounded = true; ev.push({ e: 'ko', t: t.id, knight: true });
      this._troopLeaves(this.troop(t.troop), 'fall', ev);
    }
  }
  /** a troop leaves the field: its knight fell or retreated. Capture rolls for its monsters; a ruler routs the side */
  _troopLeaves(tr, why, ev) {
    const s = this.s; if (tr.gone) return; this.dirty();
    tr.gone = true;
    const k = this.unit(tr.knight);
    if (why === 'retreat' && this.onField(k)) { k.out = true; ev.push({ e: 'retreat', t: k.id }); }
    const enemyKnights = this.field().filter(o => o.kind === 'knight' && o.side !== tr.side);
    for (const id of tr.units) {
      const m = this.unit(id); if (m.kind !== 'monster' || !this.onField(m)) continue;
      const near = enemyKnights.filter(ek => H.dist([ek.cx, ek.cy], [m.cx, m.cy]) <= Math.max(1, ek.ward));
      let captured = false;
      if (near.length && !m.boss && !m.elite) {
        let p = G.tune.captureBase; if (H.dist([m.cx, m.cy], [k.cx, k.cy]) > k.ward) p += .25; if (m.hp < m.mhp * .3) p += .15; p = Math.min(.75, p);
        if (R.next(s) < p) {
          const captor = near.slice().sort((a, b) => H.dist([a.cx, a.cy], [m.cx, m.cy]) - H.dist([b.cx, b.cy], [m.cx, m.cy]) || (a.id < b.id ? -1 : 1))[0];
          m.captured = captor.id; captured = true; s.captures.push({ u: m.id, ref: m.ref, by: captor.id, byRef: captor.ref, side: captor.side });
          ev.push({ e: 'capture', t: m.id, by: captor.id });
        }
      }
      if (!captured) { m.out = true; ev.push({ e: 'retreat', t: m.id }); }
    }
    ev.push({ e: 'troopgone', troop: tr.id, why });
    if (k.ruler && s.mode !== 'shrine') {
      ev.push({ e: 'rout', side: tr.side });
      for (const t2 of s.troops) if (t2.side === tr.side && !t2.gone) { const kk = this.unit(t2.knight); this._troopLeaves(t2, 'retreat', ev); kk.out = true; }
    }
  }
  _exp(u, amt, ev) {
    if (!u || !this.onField(u) && !u.alive) return;
    if (u.boss) return;
    amt = Math.round(amt * G.tune.expScale * (this.s.sides[u.side].expMul || 1)); if (amt <= 0) return;
    u.exp += amt; u.expGain += amt;
    while (u.exp >= 100 && u.level < 40) { u.exp -= 100; this._levelUp(u, ev); }
  }
  _levelUp(u, ev) {
    const s = this.s, gains = {};
    u.level++; u.levelsGained++;
    if (u.kind === 'monster') {
      const before = G.monsterStats(u.sp, u.form, u.level - 1), after = G.monsterStats(u.sp, u.form, u.level);
      for (const k of ['hp', 'mp', 'atk', 'def', 'int', 'agi']) gains[k] = after[k] - before[k];
    } else {
      for (const k of G.STATS) { const g = u.growth[k]; gains[k] = Math.floor(g) + (R.next(s) < g - Math.floor(g) ? 1 : 0); u.stats[k] += gains[k]; }
      const learned = G.classSkills(u.cls, u.elem, u.level).filter(x => !u.skills.includes(x));
      for (const x of learned) { u.skills.push(x); if (PASSIVES.includes(x)) u.passives[x] = true; }
      if (learned.length) gains.learned = learned;
    }
    u.mhp += gains.hp; u.hp += gains.hp; u.mmp += gains.mp; u.mp += gains.mp; u.atk += gains.atk; u.def += gains.def; u.int += gains.int; u.agi += gains.agi;
    for (const k in gains) if (k !== 'learned') u.gains[k] = (u.gains[k] || 0) + gains[k];
    ev.push({ e: 'level', t: u.id, level: u.level, gains });
  }
  _glory(side, pts, ev, quiet) { const s = this.s; s.glory[side] = (s.glory[side] || 0) + pts; if (!quiet) ev.push({ e: 'glory', side, pts, total: Math.floor(s.glory[side]) }); }

  /* ---- bells and troop turns ---- */
  _orderTroops() {
    const s = this.s;
    return s.troops.filter(t => !t.gone).slice().sort((a, b) => {
      const ka = this.unit(a.knight), kb = this.unit(b.knight), ea = this.eff(ka).agi, eb = this.eff(kb).agi;
      if (eb !== ea) return eb - ea;
      const da = s.sides[a.side].role === 'def' ? 0 : 1, db = s.sides[b.side].role === 'def' ? 0 : 1;
      return da - db || a.id - b.id;
    }).map(t => t.id);
  }
  _startBell(ev) {
    const s = this.s; s.bell++;
    if (s.wheel && s.bell > 1) this._setSeason(G.SEASONS[(s.bell - 1) % 4], ev);
    s.order = this._orderTroops(); s.oi = -1;
    ev.push({ e: 'bell', n: s.bell, order: s.order.slice(), season: s.season });
    this._nextTroop(ev);
  }
  _setSeason(season, ev) {
    const s = this.s; s.season = season;
    s.cells = s.base.map((c, i) => { const cur = s.cells ? s.cells[i] : null; if (cur === 'B' || cur === 'a') return cur; return G.seasonTerrain(c, season, s.flood); });
    // a unit left on ground it can't stand on (a flood) is moved to the nearest dry hex
    for (const u of this.field()) if (!G.canEnd(this.code([u.cx, u.cy]), u)) { const c = this._freeNear([u.cx, u.cy], u); if (c) { u.cx = c[0]; u.cy = c[1]; this.dirty(); } }
    ev.push({ e: 'season', s: season });
  }
  _nextTroop(ev) {
    const s = this.s;
    for (;;) {
      s.oi++;
      if (s.oi >= s.order.length) { s.active = null; this._endBell(ev); return; }
      const tr = s.troops[s.order[s.oi]];
      if (tr.gone) continue;
      s.active = tr.id; this._startTroop(tr, ev);
      if (s.over) return;
      if (tr.gone || this._troopDone(tr)) { ev.push({ e: 'skip', troop: tr.id }); continue; }
      return;
    }
  }
  _startTroop(tr, ev) {
    const s = this.s; ev.push({ e: 'turn', troop: tr.id, side: tr.side, bell: s.bell });
    for (const id of tr.units) {
      const u = this.unit(id); if (!this.onField(u)) continue;
      u.moved = 0; u.from = null; u.acted = false; u.done = false; delete u.fx.guarded;
      u.mp = Math.min(u.mmp, u.mp + 2);
      const tick = (amt, why) => { if (!this.onField(u)) return; amt = Math.max(1, Math.round(amt)); u.hp = Math.max(0, u.hp - amt); ev.push({ e: 'dot', t: u.id, dmg: amt, why, hp: u.hp }); if (u.hp <= 0) this._down(u, null, ev); };
      if (u.fx.poison) tick(u.mhp * .08, 'poison');
      if (u.fx.burn) tick(u.mhp * .05, 'burn');
      if (this.code([u.cx, u.cy]) === 'B') tick(u.mhp * .10, 'fire');
      if (!this.onField(u)) continue;
      const heal = (pct, why) => { const amt = Math.min(u.mhp - u.hp, Math.round(u.mhp * pct)); if (amt > 0) { u.hp += amt; ev.push({ e: 'heal', t: u.id, amt, hp: u.hp, why }); } };
      if (u.flags && u.flags.mending) heal(u.flags.mending, 'ring');
      if (u.passives.regenerate) heal(.10, 'regen');
      if (u.fx.sleep) { u.done = true; ev.push({ e: 'asleep', t: u.id }); }
      else if (u.fx.stop) { u.done = true; delete u.fx.stop; u.fx.stopimmune = 1; ev.push({ e: 'stopped', t: u.id }); }
    }
    if (s.over) return;
    this._checkWin(ev);
  }
  _endTroop(ev) {
    const s = this.s, tr = this.activeTroop();
    if (tr) { for (const id of tr.units) { const u = this.unit(id); if (this.onField(u)) u.done = true; } ev.push({ e: 'turnend', troop: tr.id }); }
    if (!s.over) this._nextTroop(ev);
  }
  _endBell(ev) {
    const s = this.s;
    ev.push({ e: 'bellend', n: s.bell });
    // effects tick
    for (const u of this.units) for (const k of Object.keys(u.fx)) { if (k === 'guarded' || k === 'stop') continue; u.fx[k]--; if (u.fx[k] <= 0) { delete u.fx[k]; if (this.onField(u)) ev.push({ e: 'fxend', t: u.id, s: k }); } }
    // fires burn out into ash
    for (const k of Object.keys(s.burn)) { if (--s.burn[k] <= 0) { delete s.burn[k]; const [x, y] = k.split(',').map(Number); s.cells[y * s.w + x] = 'a'; ev.push({ e: 'ash', c: [x, y] }); } }
    // the Keep heals its owner's unit standing on it
    if (s.keep) { const o = this.at(s.keep); if (o && (this._keepOwner(s.keep) === o.side)) { const amt = Math.min(o.mhp - o.hp, Math.round(o.mhp * .1)); if (amt > 0) { o.hp += amt; ev.push({ e: 'heal', t: o.id, amt, hp: o.hp, why: 'keep' }); } if (s.mode === 'shrine') { this._glory(o.side, 5, ev); s.stats[o.side].shrine++; } } }
    // map rules
    if (s.mode === 'sanctum') this._sanctumBell(ev);
    this._checkWin(ev);
    if (s.over) return;
    if (s.bell >= s.bells) { this._lastBell(ev); return; }
    this._startBell(ev);
  }
  _lastBell(ev) {
    const s = this.s;
    if (s.mode === 'shrine') {
      for (const sd of s.sides) if (this.sideKnights(sd.i).length) this._glory(sd.i, 10, ev);
      return this._finishShrine('bells', ev);
    }
    if (s.mode === 'sanctum') { const def = s.sides.findIndex(x => x.role === 'def'); return this._finish(def, 'thirteenth', ev); }
    const att = s.sides.findIndex(x => x.role === 'att'), def = s.sides.findIndex(x => x.role === 'def');
    const onKeep = s.keep && this.at(s.keep);
    if (onKeep && onKeep.side === att && onKeep.kind === 'knight') return this._finish(att, 'keep', ev);
    return this._finish(def, 'bells', ev);
  }
  _checkWin(ev) {
    const s = this.s; if (s.over) return;
    if (s.mode === 'shrine') {
      for (const sd of s.sides) if (!sd.out && !this.sideKnights(sd.i).length) { sd.out = true; ev.push({ e: 'sideout', side: sd.i }); }
      const alive = s.sides.filter(sd => !sd.out);
      if (alive.length <= 1) this._finishShrine('last', ev);
      return;
    }
    for (const sd of s.sides) if (!this.sideKnights(sd.i).length) {
      const other = s.sides.find(x => x.i !== sd.i);
      return this._finish(other.i, s.mode === 'sanctum' && sd.role === 'def' ? 'graynight' : 'rout', ev);
    }
  }
  _finish(winner, reason, ev) {
    const s = this.s; if (s.over) return;
    // end-of-battle EXP: +10 for each survivor of the winning side, +4 for the losing side
    for (const u of this.units) if (u.alive && !u.captured) this._exp(u, u.side === winner ? 10 : 4, ev);
    s.over = { winner, reason, bell: s.bell }; s.active = null;
    ev.push({ e: 'over', winner, reason });
  }
  _finishShrine(reason, ev) {
    const s = this.s; if (s.over) return;
    const ranked = s.sides.map(sd => ({ i: sd.i, g: Math.floor(s.glory[sd.i] || 0) })).sort((a, b) => b.g - a.g || a.i - b.i);
    const standings = []; for (const r of ranked) { const last = standings[standings.length - 1]; if (last && last.g === r.g) last.ids.push(r.i); else standings.push({ g: r.g, ids: [r.i] }); }
    for (const u of this.units) if (u.alive && !u.captured) this._exp(u, standings[0].ids.includes(u.side) ? 10 : 4, ev);
    s.over = { winner: standings[0].ids[0], reason, standings: standings.map(x => x.ids), glory: Object.fromEntries(ranked.map(r => [r.i, r.g])) }; s.active = null;
    ev.push({ e: 'over', winner: s.over.winner, reason, standings: s.over.standings });
  }

  /* ---- the Clockwork Sanctum ---- */
  _sanctumBell(ev) {
    const s = this.s, def = s.sides.findIndex(x => x.role === 'def');
    // the Hour Hand sweeps its line: player units there roll Stop 70
    if (!s.handStopped && s.keep) {
      const line = H.line(s.keep, s.hand, 8, s.w, s.h);
      ev.push({ e: 'hand', dir: s.hand, line });
      for (const c of line) { const o = this.at(c); if (o && o.side !== def) { let p = 70 * G.tune.statusScale; if (o.flags && o.flags.immune && o.flags.immune.includes('stop')) p = 0; if (o.fx.stopimmune) p = 0; const ok = R.next(s) * 100 < p; if (ok) o.fx.stop = 1; ev.push({ e: 'status', t: o.id, s: 'stop', ok }); } }
      s.hand = (s.hand + 1) % 6;
    }
    // the Season Dials
    for (const d of s.dials) {
      const o = this.at(d.c); if (!o) continue;
      if (o.side !== def && !d.lit) { d.lit = true; ev.push({ e: 'dial', c: d.c, lit: true }); }
      else if (o.side === def && d.lit && !s.wheelTurned) { d.lit = false; ev.push({ e: 'dial', c: d.c, lit: false }); }
    }
    this._checkDials(ev);
    // at half HP the Gray Knight calls two Second Hands
    const gk = this.units.find(u => u.ref === 'graynight');
    if (gk && this.onField(gk) && !s.gkCalled && gk.hp <= gk.mhp / 2) {
      s.gkCalled = true;
      for (let i = 0; i < 2; i++) {
        const spec = G.unitFromMonster({ uid: 'secondhand' + i, sp: 'minute', form: 3, level: 16, realm: 'dominion' });
        const m = this._addUnit(spec, gk.side, gk.troop), c = this._freeNear([gk.cx, gk.cy], m);
        if (!c) { m.alive = false; m.out = true; continue; }
        m.cx = c[0]; m.cy = c[1]; m.done = true; m.summoned = true; this.dirty(); ev.push({ e: 'summon', t: m.id, c });
      }
    }
  }
  _lightDial(u, ev, now) {
    const s = this.s; const d = s.dials.find(x => H.eq(x.c, [u.cx, u.cy]));
    if (d && !d.lit) { d.lit = true; ev.push({ e: 'dial', c: d.c, lit: true }); this._checkDials(ev); }
  }
  _checkDials(ev) {
    const s = this.s;
    if (!s.wheelTurned && s.dials.length && s.dials.every(d => d.lit)) { s.wheelTurned = true; s.handStopped = true; ev.push({ e: 'wheel' }); }
  }

  /* ---- results for the campaign ---- */
  /** what happened to every unit: { winner, reason, units: [{ ref, kind, side, hp, mp, level, exp, stats (knights), dead, wounded, captured, levels, gains }], captures, itemsUsed } */
  result() {
    const s = this.s;
    return {
      winner: s.over ? s.over.winner : null, reason: s.over ? s.over.reason : null, bell: s.bell, standings: s.over && s.over.standings, glory: s.glory,
      units: this.units.filter(u => !u.summoned).map(u => ({ id: u.id, ref: u.ref, kind: u.kind, side: u.side, troop: u.troop, hp: Math.max(0, u.hp), mp: u.mp, level: u.level, exp: u.exp, stats: u.stats || null, mhp: u.mhp, dead: !!u.dead, wounded: !!u.wounded, captured: u.captured ? this.unit(u.captured).ref : null, out: u.out, levels: u.levelsGained, gains: u.gains, expGain: u.expGain, skills: u.skills })),
      captures: s.captures.slice(), itemsUsed: Object.assign({}, s.itemsUsed), stats: s.stats
    };
  }
}
G.BattleSim = BattleSim;

}

// ===== src/21-ai-battle.js =====
{
// THE BATTLE AI: pure functions from a BattleSim to commands. It serves CPU troops, Delegate (auto-resolve), the
// attract mode, the hub host for players who time out, and the playthrough bot. The same state always gives the same
// plan. Per unit, in troop order (casters and shooters who needn't move first, then monsters nearest the enemy, the
// knight last so its Ward covers the troop), it scores every reachable hex and every action and target from it.
// opts: { level: 'easy' | 'normal' | 'hard', showcase (prefer specials and spells: the attract mode) }

const HX = G.hex;
const AI = {};
G.BattleAI = AI;

/** the AI level of a side (the sim's side.ai, or normal) */
AI.levelOf = (sim, side) => (sim.s.sides[side] && sim.s.sides[side].ai) || 'normal';

/** the enemy threat: for each foe, the hexes it could strike next bell and what it would deal to a unit */
AI.threats = (sim, side) => {
  const s = sim.s, foes = sim.field().filter(e => e.side !== side);
  const key = s.bell + ':' + s.active + ':' + s.season + ':' + foes.map(e => e.id + '@' + e.cx + ',' + e.cy + (e.fx.haste ? 'h' : '') + (e.fx.chill ? 'c' : '')).join(';');
  sim._threatCache = sim._threatCache || {};
  if (sim._threatCache[side] && sim._threatCache[side].key === key) return sim._threatCache[side].list;
  const list = [], W = s.w, Hh = s.h;
  for (const e of foes) {
    const sk = sim.skillOf(e, 'attack'), r = sim.reach(e, sim.movOf(e)), depth = new Int16Array(W * Hh).fill(-1), q = [];
    for (const k in r) { const c = r[k].c, i = c[1] * W + c[0]; if (depth[i] < 0) { depth[i] = 0; q.push(i); } }
    // a multi-source walk out to the attack's reach: every hex within range of a hex it can stand on
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], d = depth[i]; if (d >= sk.range[1]) continue;
      const x = i % W, y = (i - x) / W;
      for (const n of HX.neighbours([x, y])) { if (n[0] < 0 || n[1] < 0 || n[0] >= W || n[1] >= Hh) continue; const ni = n[1] * W + n[0]; if (depth[ni] < 0) { depth[ni] = d + 1; q.push(ni); } }
    }
    const cells = new Set(); for (const i of q) cells.add(Math.floor(i / W) * 1000 + i % W);
    list.push({ e, sk, cells });
  }
  sim._threatCache[side] = { key, list };
  return list;
};
/** expected damage foes could deal to unit u standing at h next bell */
AI.danger = (sim, u, h, threats) => {
  let d = 0; const k = h[1] * 1000 + h[0];
  for (const t of threats) {
    if (!sim.onField(t.e) || !t.cells.has(k)) continue;
    const f = sim._calc(t.e, u, t.sk, [t.e.cx, t.e.cy], 'attack');
    d += f.hit / 100 * (f.dmg[0] + f.dmg[1]) / 2;
  }
  return d;
};
const power = u => (u.mhp + 4 * (u.atk + u.def + u.int) + 2 * u.agi) * (1 + .05 * (u.level - 1)) * (u.kind === 'knight' ? 1.2 : 1) * Math.max(.2, u.hp / u.mhp);
AI.sidePower = (sim, side) => G.sum(sim.field().filter(u => u.side === side), power);

/** candidate target hexes for an action of u from c (fewer than targets(): units and the hexes round them) */
AI.candidates = (sim, u, a, sk, c) => {
  const rng = sim.rangeOf(u, sk, c), out = [], seen = new Set(), add = h => { const k = HX.key(h); if (!seen.has(k)) { seen.add(k); out.push(h); } };
  if (rng === 'self') {
    if (/cone|line/.test(sk.area)) { for (let d = 0; d < 6; d++) { const n = HX.step(c, d); if (sim.inside(n)) add(n); } }
    else add(c);
    return out;
  }
  if (rng === 'ward') { for (const o of sim.field()) if (o.troop === u.troop && o.kind === 'monster' && HX.dist([o.cx, o.cy], c) <= u.ward) add([o.cx, o.cy]); return out; }
  const wantFoe = sk.who === 'foes' || sk.who === 'all', wantAlly = !wantFoe;
  for (const o of sim.field()) {
    const isFoe = sim.foes(u, o); if ((wantFoe && !isFoe) || (wantAlly && isFoe)) continue;
    const oc = o.id === u.id ? c : [o.cx, o.cy];
    if (sk.area === 'single') { const d = HX.dist(oc, c); if (d >= rng[0] && d <= rng[1]) add(oc); continue; }
    for (const h of [oc].concat(sk.area === 'r2' || sk.area === 'r1' ? HX.neighbours(oc) : [])) { if (!sim.inside(h)) continue; const d = HX.dist(h, c); if (d >= rng[0] && d <= rng[1]) add(h); }
  }
  return out;
};

/** score one action of u from c at h: the value of what it does (danger and position are added by the caller) */
AI.actionValue = (sim, u, a, sk, c, h, o) => {
  const fs = sim.affected(u, a, h, c).map(t => [t, sim._calc(u, t, sk, c, a)]);
  if (!fs.length) return null;
  let v = 0, useful = false;
  for (const [t, f] of fs) {
    const foe = sim.foes(u, t);
    if (f.dmg[1] > 0) {
      const exp = f.hit / 100 * Math.min(t.hp, (f.dmg[0] + f.dmg[1]) / 2);
      if (foe) {
        v += exp * (1 + (t.kind === 'knight' ? .5 : 0) + (t.ruler ? 1 : 0)) + f.ko / 100 * (t.ruler ? 110 : t.kind === 'knight' ? 70 : 30);
        if (o.level === 'hard' && t.hitBell === sim.s.bell) v += 15;
        if (t.ref === 'graynight' && sk.breaksTimeless) v += 60;
        useful = true;
      } else v -= 1.5 * exp * (t.ruler ? 3 : 1);
    }
    if (f.heal) { if (!foe) { v += 1.2 * f.heal * (t.kind === 'knight' ? 2 : 1); if (f.heal > 4) useful = true; } else v -= f.heal; }
    if (f.status && f.status[1] > 0) {
      const sv = { sleep: 18, stop: 22, chill: 8, burn: 8, poison: 9, weakened: 8, exposed: 7 }[f.status[0]] || 6;
      if (foe && !t.fx[f.status[0]]) { v += sv * f.status[1] / 100 * (t.kind === 'knight' ? 1.5 : 1); useful = true; }
      else if (!foe) v -= sv * f.status[1] / 100;
    }
    if (f.buff && !foe) { const fresh = f.buff.filter(b => !t.fx[b]).length; if (fresh) { v += 7 * fresh * (t.kind === 'knight' ? 1.3 : 1); useful = true; } }
    if (f.cleanse && !foe) { const bad = Object.keys(t.fx).filter(k => ['status', 'debuff'].includes(G.get('effect', k).kind)).length; v += bad * 10; if (bad) useful = true; }
    if (f.siphon && foe) { v += f.siphon * .8; useful = true; }
    if (f.mp && !foe) { const need = t.mmp - t.mp; v += Math.min(need, f.mp) * .6; if (need > 8) useful = true; }
  }
  if (!useful) return null;
  if (sk.mp) v -= sk.mp * .4;
  if (sk.kind === 'item') v -= 8;
  if (o.showcase && (sk.kind === 'spell' || sk.kind === 'special')) v += 12;
  return v;
};

/** the best plan for one unit: { move: [cx, cy] | null, act: { a, at } | 'guard' | 'wait' | 'retreat', score } */
AI.planUnit = (sim, u, o = {}) => {
  const s = sim.s, threats = AI.threats(sim, u.side), start = [u.cx, u.cy];
  const reach = u.moved ? { [HX.key(start)]: { c: start } } : sim.reach(u);
  const k = sim.knightOf(u), ruler = u.ruler, low = u.hp < u.mhp * .4;
  const keep = s.keep, role = s.sides[u.side].role, foes = sim.field().filter(e => sim.foes(e, u));
  const isRanged = u.basic.ranged || u.skills.some(id => { const sk = G.get('skill', id); return sk.kind === 'spell' && sk.p > 0; });
  const acts = sim.actions(u).map(x => x.a).filter(a => { const sk = sim.skillOf(u, a); return sk && !(sk.oncePerBattle && u.turningUsed) && !(sk.mp > u.mp) && !(sk.kind === 'item' && !(s.sides[u.side].items[sk.item] > 0)); });
  let best = null;
  const consider = (score, plan) => { if (!best || score > best.score + 1e-9) best = Object.assign({ score }, plan); };
  const all = [];
  for (const key of Object.keys(reach).sort()) {
    const c = reach[key].c, moving = !HX.eq(c, start), moveLen = moving ? (reach[key].path ? reach[key].path.length - 1 : 0) : u.moved;
    // where it ends: danger, ward, terrain, the objective
    let pos = 0;
    const dz = AI.danger(sim, u, c, threats), lateAtt = keep && s.mode === 'siege' && role === 'att' && s.bell >= s.bells - 3;
    pos -= dz * (ruler ? 3 : u.kind === 'knight' ? 1.5 : .6) * (low ? 2 : 1) * (lateAtt && !ruler ? .35 : 1);
    if (u.kind === 'monster' && k && sim.onField(k) && HX.dist(c, [k.cx, k.cy]) > k.ward) pos -= 12;
    pos += 10 * G.terrainDef(sim.code(c), u, sim._keepOwner(c), s.season);
    if (keep && s.mode === 'siege') {
      // the objective: attackers press toward the Keep from the first bell, harder as the bells run out; from bell 6 the
      // defenders' knights fall back to hold it
      const press = (.5 + .35 * s.bell) * (s.bell >= s.bells - 2 ? 2 : 1);
      if (role === 'att') pos -= press * HX.dist(c, keep) * (u.kind === 'knight' ? (ruler ? .6 : 1.4) : .7);
      else if (u.kind === 'knight' && s.bell >= 6) pos -= 2.5 * HX.dist(c, keep);
      if (role === 'att' && u.kind === 'knight' && !ruler && HX.eq(c, keep)) pos += 10 + s.bell * 3;
    }
    if (keep && s.mode === 'shrine') pos -= 1.5 * HX.dist(c, keep) * (u.kind === 'knight' ? .7 : 1);
    if (s.mode === 'sanctum') {
      const def = s.sides.findIndex(x => x.role === 'def');
      const dials = s.dials.filter(d => (u.side === def ? d.lit : !d.lit));
      if (dials.length && (u.side !== def || u.summoned)) { const dd = Math.min(...dials.map(d => HX.dist(c, d.c))); pos -= (u.side === def ? 4 : 5) * dd * (u.side !== def && u.kind === 'knight' && !ruler ? .5 : 1); if (dd === 0) pos += 25; }
      // the attackers close on the Gray Knight: the battle is won when he falls (harder once the Wheel has turned)
      const gk = u.side !== def && s.units && Object.values(s.units).find(x => x.ref === 'graynight' && sim.onField(x));
      if (gk) pos -= (s.wheelTurned ? 3 : 1.2) * HX.dist(c, [gk.cx, gk.cy]) * (ruler ? .4 : 1);
    }
    if (foes.length) {
      const nearest = Math.min(...foes.map(e => HX.dist(c, [e.cx, e.cy])));
      if (isRanged && u.kind !== 'knight') pos -= 1.5 * Math.abs(nearest - 3);
      else if (!ruler || o.level === 'hard') pos -= 1.2 * nearest * (ruler ? .5 : 1);
      else pos -= .4 * nearest;
    }
    if (moving && sim.code(c) === 'B') pos -= 15;
    // what it can do from there
    let actBest = null;
    for (const a of acts) {
      const sk = sim.skillOf(u, a);
      if (sk.kind === 'spell' && (moving || u.moved)) continue;
      if (sk.kind === 'special' && (moving || u.moved) && !sk.mobile) continue;
      if (sk.needMove && moveLen < sk.needMove) continue;
      if (sk.fliers && !u.flier) continue;
      if (sk.every) { const ev = u.boss && u.hp < u.mhp / 2 ? 2 : sk.every; if (s.bell % ev) continue; }
      for (const h of AI.candidates(sim, u, a, sk, c)) {
        const v = AI.actionValue(sim, u, a, sk, c, h, o); if (v === null) continue;
        if (!actBest || v > actBest.v + 1e-9) actBest = { v, a, at: h };
      }
    }
    const guardV = dz > 0 ? dz * .25 : 0;
    if (actBest) { consider(pos + actBest.v, { move: moving ? c : null, act: { a: actBest.a, at: actBest.at } }); all.push({ score: pos + actBest.v, move: moving ? c : null, act: { a: actBest.a, at: actBest.at } }); }
    consider(pos + guardV, { move: moving ? c : null, act: 'guard' }); all.push({ score: pos + guardV, move: moving ? c : null, act: 'guard' });
  }
  // a knight near death on a losing side may retreat (rulers never do)
  if (u.kind === 'knight' && !ruler && !u.boss && u.hp < u.mhp * .25 && s.mode !== 'shrine' && s.mode !== 'sanctum') {
    const mine = AI.sidePower(sim, u.side), theirs = G.sum(foes, power);
    if (mine < theirs) return { move: null, act: 'retreat', score: 0 };
  }
  if (o.level === 'easy' && all.length > 1) {
    all.sort((x, y) => y.score - x.score);
    const top = all.slice(0, 3), w = [3, 2, 1].slice(0, top.length), roll = G.hashStr(s.n + ':' + u.id) % G.sum(w);
    let acc = 0; for (let i = 0; i < top.length; i++) { acc += w[i]; if (roll < acc) return top[i]; }
  }
  return best || { move: null, act: 'wait', score: 0 };
};

/** which unit of the active troop acts next */
AI.nextUnit = (sim) => {
  const tr = sim.activeTroop(); if (!tr) return null;
  const left = tr.units.map(id => sim.unit(id)).filter(u => sim.onField(u) && !u.done);
  if (!left.length) return null;
  const moved = left.find(u => u.moved && !u.acted); if (moved) return moved;
  const foes = sim.field().filter(e => e.side !== tr.side);
  const near = u => foes.length ? Math.min(...foes.map(e => HX.dist([u.cx, u.cy], [e.cx, e.cy]))) : 99;
  const standing = u => { if (u.kind === 'knight') return false; for (const a of sim.actions(u)) if (a.ok && a.a !== 'attack' || (a.ok && u.basic.ranged)) { const sk = a.sk; if (sk.kind === 'spell' || sk.ranged) return true; } return false; };
  const order = left.slice().sort((a, b) => {
    const ka = a.kind === 'knight' ? 1 : 0, kb = b.kind === 'knight' ? 1 : 0; if (ka !== kb) return ka - kb;
    const sa = standing(a) ? 0 : 1, sb = standing(b) ? 0 : 1; if (sa !== sb) return sa - sb;
    return near(a) - near(b) || (a.id < b.id ? -1 : 1);
  });
  return order[0];
};

/** the next command for the active troop: a move, then the action; { t: 'end' } when the troop is finished */
AI.next = (sim, o = {}) => {
  const tr = sim.activeTroop(); if (!tr || sim.s.over) return null;
  const lv = o.level || AI.levelOf(sim, tr.side), opts = Object.assign({}, o, { level: lv });
  const u = AI.nextUnit(sim); if (!u) return { t: 'end' };
  let plan = sim._aiPlan && sim._aiPlan.u === u.id && sim._aiPlan.at === HX.key([u.cx, u.cy]) && sim._aiPlan.n === sim.s.n ? sim._aiPlan.plan : null;
  if (!plan) plan = AI.planUnit(sim, u, opts);
  if (plan.move && !u.moved && !HX.eq(plan.move, [u.cx, u.cy])) {
    const cmd = { t: 'move', u: u.id, to: plan.move };
    if (sim.legal(cmd)) { sim._aiPlan = { u: u.id, at: HX.key(plan.move), plan: Object.assign({}, plan, { move: null }), n: sim.s.n + 1 }; return cmd; }
  }
  sim._aiPlan = null;
  if (plan.act === 'guard') return { t: 'guard', u: u.id };
  if (plan.act === 'retreat') return { t: 'retreat', u: u.id };
  if (plan.act && plan.act.a) { const cmd = { t: 'act', u: u.id, a: plan.act.a, at: plan.act.at }; if (sim.legal(cmd)) return cmd; }
  return { t: 'wait', u: u.id };
};
/** apply AI commands until the active troop's turn ends; returns the events */
AI.playTroop = (sim, o = {}) => {
  const ev = [], tr = sim.s.active; let guard = 0;
  while (!sim.s.over && sim.s.active === tr && guard++ < 60) { const c = AI.next(sim, o); if (!c) break; const e = sim.apply(c); ev.push(...e); if (e.length && e[0].e === 'illegal') { ev.push(...sim.apply({ t: 'end' })); } }
  return ev;
};
/** Delegate: run the battle to its end with the AI on every side, synchronously; returns the events */
AI.resolve = (sim, o = {}) => {
  const ev = []; let guard = 0;
  while (!sim.s.over && guard++ < 4000) {
    const c = AI.next(sim, o); if (!c) break;
    const e = sim.apply(c); ev.push(...e);
    if (e.length && e[0].e === 'illegal') ev.push(...sim.apply({ t: 'end' }));
  }
  return ev;
};

}

// ===== src/22-sim-campaign.js =====
{
// CAMPAIGNSIM: the war of the seasons. Pure and deterministic, its state plain JSON (this.s), its randomness G.Rng on
// s.rs. One turn is one season: Tidings (news, recovery, income, quests, events, AI muster), Muster (each human realm
// in seat order), March (declarations), then the battles they cause, one at a time, with their aftermath.
// Commands: apply({ t, ... }) -> events (see the switch). Story events are data (09-data-story.js): their conditions
// and effects run here, so they are saved and replayable.

const CR = G.Rng, HXC = G.hex;
const DIFF = {
  easy: { aiIncome: .8, threshold: 1.6, candle: 16, exp: 1.25, ai: 'easy' },
  normal: { aiIncome: 1, threshold: 1.3, candle: 12, exp: 1, ai: 'normal' },
  hard: { aiIncome: 1.25, threshold: 1.1, candle: 10, exp: 1, ai: 'hard' }
};
G.DIFF = DIFF;

class CampaignSim {
  constructor(s) { this.s = s; }
  static load(json) { return new CampaignSim(typeof json === 'string' ? JSON.parse(json) : G.clone(json)); }
  serialize() { return JSON.stringify(this.s); }
  hash() { return G.hashJSON(this.s); }

  /** a new campaign: { seed, humans: [realm, ...] (seat order), difficulty, tutorial } */
  static create(o = {}) {
    const s = {
      v: 1, seed: o.seed || 1, rs: CR.seed(o.seed || 1), difficulty: o.difficulty || 'normal', turn: 0, phase: 'tidings',
      humans: (o.humans || ['verdance']).slice(), cur: 0, realms: {}, castles: {}, knights: {}, monsters: {}, nextUid: 1,
      marches: [], queue: [], pending: null, candle: null, stilled: null, lastStilled: null, flags: {}, aiFlags: {}, seen: {},
      chronicle: [], result: null, dev: false, sanctumOpen: null, rivalSanctum: null, battles: 0, wanderers: {}, deferred: [],
      stats: { battlesWon: 0, battlesLost: 0, captures: 0, summons: 0 }, firstMarchDone: {}, eventLog: []
    };
    const sim = new CampaignSim(s);
    for (const id of G.REALMS) {
      const r = G.get('realm', id), items = {};
      for (const it of G.START_ITEMS[id]) items[it] = (items[it] || 0) + 1;
      s.realms[id] = { mana: r.mana, alive: true, items, human: s.humans.includes(id), aggression: r.aggression, income: 0, upkeep: 0, flags: {} };
    }
    for (const c of G.all('castle')) s.castles[c.id] = { owner: c.owner, knights: [], reserve: [], stilled: false, summons: 0, treasuryTaken: false };
    for (const k of G.all('knight')) if (k.castle && k.realm) sim._spawnKnight(k.id, k.realm, k.castle);
    for (const [cid, list] of Object.entries(G.START_RESERVE)) for (const [sp, lv] of list) sim._newMonster(sp, lv, 1, s.castles[cid].owner, { castle: cid });
    // free knights: who can be found where
    for (const k of G.all('knight')) if (k.free === 'wanderer') for (const r of k.regions) (s.wanderers[r] = s.wanderers[r] || []).push(k.id);
    sim.log('The Brigantime begins. Spring, Year 1.');
    return sim;
  }

  /* ---- records ---- */
  _spawnKnight(id, realm, castle, o = {}) {
    const s = this.s, d = G.get('knight', id), level = o.level || d.level, stats = G.classStats(d.cls, level);
    const k = { id, realm, cls: d.cls, level, exp: 0, stats, hp: stats.hp, mp: stats.mp, elem: d.elem, items: Object.assign({}, d.items), troop: [], formation: d.form || 'vanguard', castle, wounded: 0, quest: null, moved: false, marched: false, ruler: !!d.ruler, learned: [], bondBonus: 0, free: false };
    s.knights[id] = k; if (castle) s.castles[castle].knights.push(id);
    for (const [sp, lv, form] of d.troop) this._newMonster(sp, lv, form || 1, realm, { knight: id });
    return k;
  }
  _newMonster(sp, level, form, realm, o = {}) {
    const s = this.s, uid = 'm' + s.nextUid++, st = G.monsterStats(sp, form, level);
    const m = { uid, sp, form, level, exp: 0, hp: st.hp, mp: st.mp, realm, castle: null, knight: null };
    s.monsters[uid] = m;
    if (o.knight && this.bondFree(o.knight) >= G.get('monster', sp).rank && s.knights[o.knight].troop.length < 6) { m.knight = o.knight; s.knights[o.knight].troop.push(uid); }
    else { const c = o.castle || (o.knight && s.knights[o.knight].castle) || this.capital(realm); if (c) { m.castle = c; s.castles[c].reserve.push(uid); } }
    return m;
  }
  log(text) { this.s.chronicle.push({ turn: this.s.turn, text }); if (this.s.chronicle.length > 300) this.s.chronicle.shift(); }

  /* ---- queries ---- */
  get season() { return G.SEASONS[this.s.turn % 4]; }
  get year() { return Math.floor(this.s.turn / 4) + 1; }
  realm(id) { return this.s.realms[id]; }
  knight(id) { return this.s.knights[id]; }
  monster(uid) { return this.s.monsters[uid]; }
  castle(id) { return this.s.castles[id]; }
  castlesOf(realm) { return Object.keys(this.s.castles).filter(c => this.s.castles[c].owner === realm); }
  knightsOf(realm) { return Object.values(this.s.knights).filter(k => k.realm === realm && !k.free); }
  capital(realm) { const r = G.has('realm', realm) && G.get('realm', realm); if (r && r.capital && this.s.castles[r.capital].owner === realm) return r.capital; return this.castlesOf(realm)[0] || null; }
  isHuman(realm) { return this.s.humans.includes(realm); }
  currentHuman() { return this.s.humans[this.s.cur] || null; }
  bondOf(kid) { const k = this.knight(kid), c = G.get('class', k.cls); let b = c.bond + Math.floor(k.level / 4) + (k.bondBonus || 0); for (const sl of ['weapon', 'armor', 'accessory']) { const it = k.items[sl]; if (it) b += G.get('item', it).mods.bond || 0; } return b; }
  bondUsed(kid) { return G.sum(this.knight(kid).troop, uid => G.get('monster', this.monster(uid).sp).rank); }
  bondFree(kid) { return this.bondOf(kid) - this.bondUsed(kid); }
  wardOf(kid) { const k = this.knight(kid); let w = G.get('class', k.cls).ward; const acc = k.items.accessory; if (acc) w += G.get('item', acc).mods.ward || 0; return w; }
  monsterStats(uid) { const m = this.monster(uid); return G.monsterStats(m.sp, m.form, m.level); }
  /** can a knight act this Muster (not wounded, not questing, its castle not stilled)? */
  canAct(kid) { const k = this.knight(kid); return !!k && !k.free && !k.wounded && !k.quest && !!k.castle && !this.s.castles[k.castle].stilled; }
  income(realm) {
    const s = this.s, season = this.season; let inc = 0;
    for (const cid of this.castlesOf(realm)) {
      const c = G.get('castle', cid), st = s.castles[cid]; if (st.stilled) continue;
      let y = c.mana * G.tune.manaIncome; if (G.regionSeasons(c.region).includes(season)) y *= 1 + G.tune.seasonYield;
      inc += y;
    }
    if (!this.isHuman(realm) && realm !== 'brigands') inc *= DIFF[s.difficulty].aiIncome + G.tune.aiManaBonus;
    return Math.round(inc);
  }
  upkeep(realm, season = this.season) {
    let u = 0;
    for (const m of Object.values(this.s.monsters)) if (m.realm === realm) { let x = G.monsterUpkeep(m.sp, m.form) * G.tune.upkeepScale; if (season === 'winter' && G.get('monster', m.sp).elem !== 'winter') x *= 1 + G.tune.winterUpkeep; u += x; }
    return Math.round(u);
  }
  summonCost(sp) { return Math.round(G.get('monster', sp).cost * G.tune.summonCost); }
  summonLevel(realm) { const ks = this.knightsOf(realm); return Math.max(1, Math.floor((ks.length ? G.sum(ks, k => k.level) / ks.length : 2) / 2)); }
  /** the species a castle can summon this season */
  circle(cid) { const season = this.season; return G.get('castle', cid).circle.filter(e => !e.season || e.season === season).map(e => e.sp).concat(this.s.flags['hesper_circle'] && cid === 'lionsreach' ? ['minute', 'stillwraith'] : []); }
  questingCount(realm) { return this.knightsOf(realm).filter(k => k.quest).length; }
  /** knights at a castle who could fight (not wounded, not away) */
  defenders(cid) { return this.s.castles[cid].knights.filter(id => { const k = this.knight(id); return k && !k.wounded && !k.quest; }); }
  troopPower(kid) {
    const k = this.knight(kid), u = G.unitFromKnight(k), pw = x => (x.mhp + 4 * (x.atk + x.def + x.int) + 2 * x.agi) * (1 + .05 * (x.level - 1));
    let p = pw(u) * 1.2 * Math.max(.3, k.hp / k.stats.hp);
    for (const uid of k.troop) { const m = this.monster(uid), st = this.monsterStats(uid); p += pw(Object.assign({ level: m.level }, st, { mhp: st.hp })) * Math.max(.3, m.hp / st.hp); }
    return Math.round(p);
  }
  /** castles adjacent to a target that a realm owns */
  launchers(realm, target) { return G.get('castle', target).roads.filter(c => this.s.castles[c].owner === realm && !this.s.castles[c].stilled); }
  /** the targets a realm may march on: foreign castles next to one of its own (plus the Sanctum when open) */
  marchTargets(realm) {
    const s = this.s, out = [];
    for (const cid of Object.keys(s.castles)) {
      if (s.castles[cid].owner === realm) continue;
      if (this.launchers(realm, cid).length) out.push(cid);
    }
    if (s.sanctumOpen === realm && s.castles.meridian.owner === realm) out.push('sanctum');
    return out;
  }
  /** knights that can march on a target */
  marchers(realm, target) {
    const from = target === 'sanctum' ? ['meridian'].concat(G.get('castle', 'meridian').roads.filter(c => this.s.castles[c].owner === realm)) : this.launchers(realm, target);
    const out = [];
    for (const c of from) for (const kid of this.s.castles[c].knights) { const k = this.knight(kid); if (this.canAct(kid) && !k.marched && !this.s.marches.some(m => m.knights.includes(kid))) out.push(kid); }
    return out;
  }
  /** the nearest castle of a realm by roads from a castle (BFS through any castle) */
  nearestOwned(realm, from) {
    const s = this.s, seen = new Set([from]), q = [from];
    while (q.length) { const c = q.shift(); if (c !== from && s.castles[c].owner === realm) return c; for (const n of G.get('castle', c).roads.slice().sort()) if (!seen.has(n)) { seen.add(n); q.push(n); } }
    return null;
  }
  realmAlive(realm) { return this.castlesOf(realm).length > 0; }

  /* ---- commands ---- */
  /** why a command can't run now (null: it can) */
  illegal(c) {
    const s = this.s, r = c.realm;
    if (s.result) return 'The campaign is over';
    const muster = ['summon', 'bind', 'unbind', 'formation', 'dismiss', 'move', 'quest', 'equip', 'unequip', 'use', 'promote', 'classchange'];
    if (muster.includes(c.t)) {
      if (s.phase !== 'muster' && !c.ai) return 'Only during Muster';
      if (!s.realms[r] || !s.realms[r].alive) return 'No such realm';
    }
    switch (c.t) {
      case 'summon': {
        const st = s.castles[c.castle]; if (!st || st.owner !== r) return 'Not your castle';
        if (st.stilled) return 'The castle is Stilled';
        if (st.summons >= 3) return 'Three summons a season';
        if (!this.circle(c.castle).includes(c.sp)) return 'Not in this circle';
        const sp = G.get('monster', c.sp); if (sp.meridianOnly && c.castle !== 'meridian') return 'Meridian only';
        if (!s.flags.devFreeSummon && s.realms[r].mana < this.summonCost(c.sp)) return 'Not enough mana';
        return null;
      }
      case 'bind': {
        const m = this.monster(c.uid), k = this.knight(c.knight); if (!m || !k || k.realm !== r || m.realm !== r) return 'Not yours';
        if (!m.castle || m.castle !== k.castle) return 'Not at the same castle';
        if (k.quest) return 'Away questing';
        if (k.troop.length >= 6) return 'A troop holds six';
        if (this.bondFree(k.id) < G.get('monster', m.sp).rank) return 'Not enough Bond';
        return null;
      }
      case 'unbind': { const m = this.monster(c.uid); if (!m || m.realm !== r || !m.knight) return 'Not bound'; const k = this.knight(m.knight); if (k.quest) return 'Away questing'; if (!k.castle) return 'Not at a castle'; return null; }
      case 'formation': { const k = this.knight(c.knight); return !k || k.realm !== r ? 'Not yours' : ['vanguard', 'shield', 'column'].includes(c.form) ? null : 'No such formation'; }
      case 'dismiss': { const m = this.monster(c.uid); return !m || m.realm !== r || !m.castle ? 'Only reserve monsters' : null; }
      case 'move': {
        const k = this.knight(c.knight); if (!k || k.realm !== r) return 'Not yours';
        if (!this.canAct(k.id)) return k.wounded ? 'Wounded' : k.quest ? 'Away questing' : 'Stilled';
        if (k.moved) return 'Moved already this Muster';
        if (!G.adjacent(k.castle, c.to)) return 'Not adjacent';
        const t = s.castles[c.to]; if (t.owner !== r) return 'Not your castle'; if (t.stilled) return 'The castle is Stilled';
        if (t.knights.length >= 6) return 'Six knights at most';
        return null;
      }
      case 'quest': {
        const k = this.knight(c.knight); if (!k || k.realm !== r) return 'Not yours';
        if (k.ruler) return 'Rulers do not quest';
        if (!this.canAct(k.id)) return k.wounded ? 'Wounded' : 'Not now';
        if (k.moved) return 'Moved this Muster';
        if (this.s.marches.some(m => m.knights.includes(k.id))) return 'Marching';
        const lim = (s.aiFlags[r] && s.aiFlags[r].questers) || 2; if (this.questingCount(r) >= lim) return 'Two away at most';
        const site = G.get('site', c.site);
        if (site.story) { if (!s.flags['site_' + c.site]) return 'Not open yet'; if (!G.adjacent(k.castle, site.castle) && k.castle !== site.castle) return 'Too far'; return null; }
        if (G.get('castle', k.castle).site !== c.site) return 'Quest from the castle itself';
        return null;
      }
      case 'equip': {
        const k = this.knight(c.knight); if (!k || k.realm !== r) return 'Not yours';
        if (!(s.realms[r].items[c.item] > 0)) return 'Not in the inventory';
        if (!G.canEquip(c.item, k.cls)) return 'Cannot use that';
        return null;
      }
      case 'unequip': { const k = this.knight(c.knight); return !k || k.realm !== r || !k.items[c.slot] ? 'Nothing there' : null; }
      case 'use': {
        const it = G.has('item', c.item) && G.get('item', c.item); if (!it || it.slot !== 'consumable') return 'Not usable';
        if (!(s.realms[r].items[c.item] > 0)) return 'None left';
        if (it.use.mana) return null;
        const tgt = c.knight ? this.knight(c.knight) : this.monster(c.uid); if (!tgt || tgt.realm !== r) return 'Not yours';
        return null;
      }
      case 'promote': {
        const m = this.monster(c.uid); if (!m || m.realm !== r) return 'Not yours'; if (m.form >= 3) return 'Fully grown';
        const sp = G.get('monster', m.sp), need = m.form === 1 ? 12 : 22, seedLv = m.form === 1 ? 6 : 16;
        if (m.level >= need || s.flags.devUnlockClass) return null;
        if (sp.elem === 'hour') return 'Hour monsters promote by level (' + need + ')';
        const seed = G.SEASON_SEED[sp.elem]; if (c.seed && m.level >= seedLv && s.realms[r].items[seed] > 0) return null;
        return m.level >= seedLv ? 'Needs a ' + G.get('item', seed).name : 'Level ' + need + ' (or ' + seedLv + ' with a seed)';
      }
      case 'classchange': {
        const k = this.knight(c.knight); if (!k || k.realm !== r) return 'Not yours';
        const cl = G.get('class', k.cls); if (!cl.next) return 'No class change';
        const nx = G.get('class', cl.next);
        if (s.flags.devUnlockClass) return null;
        if (nx.tier === 2 && k.level < 10) return 'Level 10';
        if (nx.tier === 3) { if (k.level < 20) return 'Level 20 and a Writ'; if (!(s.realms[r].items.writ > 0)) return 'Needs a Writ of Knighthood'; }
        return null;
      }
      case 'declare': {
        if (s.phase !== 'march' && !c.ai) return 'Only during March';
        if (!this.marchTargets(r).includes(c.target)) return 'Not a target';
        if (s.marches.some(m => m.realm === r && m.target === c.target)) return 'One attack per target';
        if (!c.knights || !c.knights.length || c.knights.length > 3) return 'One to three knights';
        const ok = this.marchers(r, c.target); for (const kid of c.knights) if (!ok.includes(kid)) return 'Cannot march: ' + G.get('knight', kid).short;
        return null;
      }
      case 'undeclare': return s.marches.some(m => m.realm === r && m.target === c.target) ? null : 'No such march';
    }
    return null;
  }
  legal(c) { return !this.illegal(c); }
  apply(c) {
    const s = this.s, ev = [], bad = this.illegal(c);
    if (bad) return [{ e: 'illegal', why: bad, cmd: c }];
    const r = c.realm;
    switch (c.t) {
      case 'summon': {
        if (!s.flags.devFreeSummon) s.realms[r].mana -= this.summonCost(c.sp);
        s.castles[c.castle].summons++;
        const m = this._newMonster(c.sp, this.summonLevel(r), 1, r, { castle: c.castle });
        s.stats.summons++; ev.push({ e: 'summon', uid: m.uid, sp: c.sp, castle: c.castle, realm: r });
        if (c.bindTo && this.legal({ t: 'bind', realm: r, uid: m.uid, knight: c.bindTo, ai: c.ai })) ev.push(...this.apply({ t: 'bind', realm: r, uid: m.uid, knight: c.bindTo, ai: c.ai }));
        break;
      }
      case 'bind': {
        const m = this.monster(c.uid), k = this.knight(c.knight), st = s.castles[m.castle];
        st.reserve = st.reserve.filter(x => x !== m.uid); m.castle = null; m.knight = k.id; k.troop.push(m.uid);
        ev.push({ e: 'bind', uid: m.uid, knight: k.id });
        if ((m.sp === 'wyvern' || m.sp === 'frostwyrm') && this.isHuman(r)) this._queueStory('owain', r);
        break;
      }
      case 'unbind': {
        const m = this.monster(c.uid), k = this.knight(m.knight); k.troop = k.troop.filter(x => x !== m.uid); m.knight = null; m.castle = k.castle; s.castles[k.castle].reserve.push(m.uid);
        ev.push({ e: 'unbind', uid: m.uid, knight: k.id }); break;
      }
      case 'formation': this.knight(c.knight).formation = c.form; ev.push({ e: 'formation', knight: c.knight, form: c.form }); break;
      case 'dismiss': this._removeMonster(c.uid); ev.push({ e: 'dismiss', uid: c.uid }); break;
      case 'move': {
        const k = this.knight(c.knight), from = k.castle;
        s.castles[from].knights = s.castles[from].knights.filter(x => x !== k.id); s.castles[c.to].knights.push(k.id); k.castle = c.to; k.moved = true;
        ev.push({ e: 'move', knight: k.id, from, to: c.to }); break;
      }
      case 'quest': {
        const k = this.knight(c.knight), site = G.get('site', c.site), outcome = this._rollQuest(k, site);
        s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== k.id);
        k.quest = { site: c.site, from: k.castle, back: s.turn + site.away, outcome }; k.castle = null;
        ev.push({ e: 'quest', knight: k.id, site: c.site, away: site.away }); this.log(G.get('knight', k.id).short + ' rides for ' + site.name + '.'); break;
      }
      case 'equip': {
        const k = this.knight(c.knight), it = G.get('item', c.item), slot = it.slot, old = k.items[slot];
        if (old) s.realms[r].items[old] = (s.realms[r].items[old] || 0) + 1;
        s.realms[r].items[c.item]--; k.items[slot] = c.item; this._clampKnight(k);
        ev.push({ e: 'equip', knight: k.id, item: c.item, slot }); break;
      }
      case 'unequip': { const k = this.knight(c.knight), it = k.items[c.slot]; s.realms[r].items[it] = (s.realms[r].items[it] || 0) + 1; k.items[c.slot] = null; this._clampKnight(k); ev.push({ e: 'unequip', knight: k.id, slot: c.slot }); break; }
      case 'use': {
        const it = G.get('item', c.item); s.realms[r].items[c.item]--;
        if (it.use.mana) { s.realms[r].mana += it.use.mana; ev.push({ e: 'mana', realm: r, amt: it.use.mana }); break; }
        const tgt = c.knight ? this.knight(c.knight) : this.monster(c.uid), mhp = c.knight ? tgt.stats.hp : this.monsterStats(tgt.uid).hp, mmp = c.knight ? tgt.stats.mp : this.monsterStats(tgt.uid).mp;
        if (it.use.heal) tgt.hp = Math.min(mhp, tgt.hp + it.use.heal); if (it.use.mp) tgt.mp = Math.min(mmp, tgt.mp + it.use.mp);
        ev.push({ e: 'use', item: c.item, target: c.knight || c.uid }); break;
      }
      case 'promote': {
        const m = this.monster(c.uid), need = m.form === 1 ? 12 : 22, before = this.monsterStats(m.uid), ratio = m.hp / before.hp;
        if (m.level < need && !s.flags.devUnlockClass) s.realms[r].items[G.SEASON_SEED[G.get('monster', m.sp).elem]]--;
        m.form++; const after = this.monsterStats(m.uid); m.hp = Math.max(1, Math.round(after.hp * ratio)); m.mp = after.mp;
        ev.push({ e: 'promote', uid: m.uid, form: m.form, name: G.monsterName(m.sp, m.form) }); this.log('A ' + G.monsterName(m.sp, m.form - 1) + ' becomes a ' + G.monsterName(m.sp, m.form) + '.'); break;
      }
      case 'classchange': {
        const k = this.knight(c.knight), nx = G.get('class', G.get('class', k.cls).next);
        if (nx.tier === 3 && !s.flags.devUnlockClass) s.realms[r].items.writ--;
        k.cls = nx.id; for (const st of G.STATS) k.stats[st] = Math.round(k.stats[st] * 1.1); k.hp = k.stats.hp; k.mp = k.stats.mp;
        ev.push({ e: 'classchange', knight: k.id, cls: nx.id }); this.log(G.get('knight', k.id).short + ' becomes a ' + nx.name + '.'); break;
      }
      case 'endMuster': ev.push(...this._endMuster(r)); break;
      case 'declare': s.marches.push({ realm: r, target: c.target, knights: c.knights.slice(), from: Object.fromEntries(c.knights.map(k => [k, this.knight(k).castle])) }); ev.push({ e: 'declare', realm: r, target: c.target, knights: c.knights }); break;
      case 'undeclare': s.marches = s.marches.filter(m => !(m.realm === r && m.target === c.target)); ev.push({ e: 'undeclare', realm: r, target: c.target }); break;
      case 'endMarch': ev.push(...this._endMarch(r)); break;
      case 'event': ev.push(...this._applyEvent(c.id, c.choice || 0, c.realm)); break;
      case 'dev': ev.push(...this._dev(c)); break;
    }
    return ev;
  }
  _clampKnight(k) { const u = G.unitFromKnight(k); k.mp = Math.min(k.mp, u.mmp); }
  _removeMonster(uid) {
    const s = this.s, m = s.monsters[uid]; if (!m) return;
    if (m.castle) s.castles[m.castle].reserve = s.castles[m.castle].reserve.filter(x => x !== uid);
    if (m.knight && s.knights[m.knight]) s.knights[m.knight].troop = s.knights[m.knight].troop.filter(x => x !== uid);
    delete s.monsters[uid];
  }
  _addExp(rec, amt, isKnight) {
    rec.exp += amt; const out = [];
    while (rec.exp >= 100 && rec.level < 40) {
      rec.exp -= 100; rec.level++;
      if (isKnight) { const g = G.classGrowth(rec.cls); for (const k of G.STATS) { const v = Math.floor(g[k]) + (CR.next(this.s) < g[k] - Math.floor(g[k]) ? 1 : 0); rec.stats[k] += v; } }
      out.push(rec.level);
    }
    return out;
  }

  /* ---- quests ---- */
  _rollQuest(k, site) {
    const s = this.s, line = G.get('class', k.cls).line, w = Object.fromEntries(G.QUEST_OUTCOMES);
    if (line === 'cleric') w.treasure += 10; if (line === 'beast') w.beast += 15; if (line === 'ranger') w.wanderer += 10;
    if (k.level >= 10) w.mishap -= 5;
    w[site.focus] = (w[site.focus] || 0) + 10;
    if (site.mishap) w.mishap += site.mishap;
    const luck = (k.items.accessory === 'horseshoe' ? 1.15 : 1) * G.tune.questLuck;
    for (const g of G.QUEST_GOOD) w[g] *= luck;
    const regions = G.regionPools(G.get('castle', site.castle).region);
    const wand = regions.flatMap(rg => (s.wanderers[rg] || [])).filter(id => this._wandererFree(id));
    if (site.ettard && this._wandererFree('ettard') && !wand.includes('ettard')) wand.push('ettard');
    if (!wand.length) w.wanderer = 0;
    if (site.story) return { kind: 'story', story: site.story };
    const kind = CR.weighted(s, Object.entries(w).map(([kk, v]) => [v, kk]));
    const out = { kind };
    if (kind === 'treasure') { const items = regions.flatMap(rg => (G.POOLS[rg] || G.POOLS.hour).items).concat(site.addItems || []); out.item = CR.pick(s, items); }
    if (kind === 'beast') {
      const list = regions.flatMap(rg => (G.POOLS[rg] || G.POOLS.hour).beasts).concat(site.addBeasts || []);
      out.sp = CR.weighted(s, list.map(sp => [(site.beastMul && site.beastMul[sp]) || 1, sp]));
    }
    if (kind === 'wanderer') out.knight = CR.pick(s, wand);
    if (kind === 'mana') out.mana = CR.int(s, 40, 80);
    if (kind === 'mishap') out.lose = CR.chance(s, .3);
    out.variant = CR.int(s, 0, 2);
    return out;
  }
  _wandererFree(id) {
    const s = this.s, k = s.knights[id], d = G.get('knight', id);
    if (id === 'galeron' && s.turn < 2) return false;   // found from Autumn of Year 1
    return !k || k.free;
  }
  _questReturn(k, ev) {
    const s = this.s, q = k.quest, site = G.get('site', q.site), o = q.outcome, d = G.get('knight', k.id);
    let home = s.castles[q.from] && s.castles[q.from].owner === k.realm ? q.from : this.nearestOwned(k.realm, q.from) || this.capital(k.realm);
    k.quest = null;
    if (!home) { k.free = true; return; }
    k.castle = home; s.castles[home].knights.push(k.id);
    const card = { e: 'questReturn', knight: k.id, site: q.site, kind: o.kind, variant: o.variant || 0, realm: k.realm };
    switch (o.kind) {
      case 'treasure': s.realms[k.realm].items[o.item] = (s.realms[k.realm].items[o.item] || 0) + 1; card.thing = G.get('item', o.item).name; card.item = o.item; break;
      case 'beast': { const m = this._newMonster(o.sp, Math.max(1, k.level - 2), 1, k.realm, { knight: k.id, castle: home }); card.thing = G.monsterName(o.sp, 1); card.uid = m.uid; break; }
      case 'wanderer': {
        if (this._wandererFree(o.knight)) { this._joinFree(o.knight, k.realm, home); card.thing = G.get('knight', o.knight).short; card.joined = o.knight; if (this.isHuman(k.realm)) this._queueStory(o.knight, k.realm); }
        else { const mana = 40; s.realms[k.realm].mana += mana; card.kind = 'mana'; card.thing = mana + ' mana'; }
        break;
      }
      case 'mana': s.realms[k.realm].mana += o.mana; card.thing = o.mana + ' mana'; break;
      case 'training': { const lv = this._addExp(k, 60, true); for (const uid of k.troop) this._addExp(this.monster(uid), 40, false); card.thing = lv.length ? 'Level ' + k.level : 'experience'; break; }
      case 'mishap': {
        k.wounded = 2; if (o.lose && k.troop.length) { const weakest = k.troop.slice().sort((a, b) => this.monster(a).level - this.monster(b).level || (a < b ? -1 : 1))[0]; card.thing = G.monsterName(this.monster(weakest).sp, this.monster(weakest).form); this._removeMonster(weakest); card.lost = true; }
        break;
      }
      case 'story': card.story = o.story; if (this.isHuman(k.realm)) this._queueStory(o.story === 'lunete' ? 'lunete_joins' : 'blanchefleur_hire', k.realm); else if (o.story === 'lunete') this._joinFree('lunete', k.realm, home); break;
    }
    if (site.keeper) card.keeper = true;
    this.log(d.short + ' returns from ' + site.name + (card.thing ? ' with ' + card.thing : '') + '.');
    ev.push(card);
  }
  _joinFree(id, realm, castle) {
    const s = this.s, k = s.knights[id];
    if (k) { k.free = false; k.realm = realm; k.castle = castle; k.wounded = 0; k.quest = null; s.castles[castle].knights.push(id); for (const uid of k.troop) this.monster(uid).realm = realm; }
    else this._spawnKnight(id, realm, castle);
    for (const r in s.wanderers) s.wanderers[r] = s.wanderers[r].filter(x => x !== id);
  }

  /* ---- the season: Tidings ---- */
  /** run the Tidings: returns the cards to show ({ e: ... }) and the story events to play */
  beginSeason() {
    const s = this.s, ev = [], season = this.season;
    s.phase = 'tidings'; s.marches = []; s.queue = []; s.pending = null;
    ev.push({ e: 'season', season, year: this.year });
    s.longWinter = season === 'winter' && this.year === 1;
    // the Hour-Candle burns
    if (s.candle !== null && s.turn > 0 && !s.candleLitNow) { s.candle--; ev.push({ e: 'candle', left: s.candle }); if (s.candle === 1) this._queueStory('thirteenth_warning', 'world'); }
    s.candleLitNow = false;
    if (s.candle !== null && s.candle <= 0 && !s.result) { this._lose('candle', ev); return { cards: ev, events: this._takeStory(['ending_candle']) }; }
    // a rival's Sanctum battle
    if (s.rivalSanctum) ev.push(...this._rivalSanctum());
    if (s.result) return { cards: ev, events: this._takeStory([s.result.ending]) };
    // recovery
    for (const k of Object.values(s.knights)) { if (k.wounded) k.wounded--; if (k.castle) { k.hp = k.stats.hp; k.mp = G.unitFromKnight(k).mmp; } k.moved = false; k.marched = false; }
    for (const m of Object.values(s.monsters)) { if (m.castle || (m.knight && s.knights[m.knight] && s.knights[m.knight].castle)) { const st = this.monsterStats(m.uid); m.hp = st.hp; m.mp = st.mp; } }
    for (const c of Object.values(s.castles)) { c.summons = 0; c.stilled = false; }
    // Hoarfast's moods
    s.realms.hoarfast.aggression = 0.9 + CR.next(s) * .5;
    // Stillness: from Autumn of Year 3 the Gray Knight stills a castle bordering the Dominion
    s.stilled = null;
    if (s.turn >= 10 && s.castles.meridian.owner === 'dominion') {
      const hourC = this.castlesOf('dominion'), cand = Object.keys(s.castles).filter(c => c !== 'meridian' && s.castles[c].owner !== 'dominion' && G.get('castle', c).roads.some(n => hourC.includes(n))).sort();
      if (cand.length) { const c = CR.pick(s, cand); s.castles[c].stilled = true; s.stilled = c; ev.push({ e: 'stilled', castle: c }); if (!s.flags.stillnessSeen) { s.flags.stillnessSeen = true; this._queueStory('stillness', 'world'); } this.log(G.get('castle', c).name + ' is Stilled.'); }
    }
    // quests return
    for (const k of Object.values(s.knights).sort((a, b) => a.id < b.id ? -1 : 1)) if (k.quest && k.quest.back <= s.turn && !k.free) this._questReturn(k, ev);
    // income and upkeep
    for (const id of G.REALMS) {
      const rr = s.realms[id]; if (!rr.alive || id === 'brigands') continue;
      const inc = this.income(id), up = this.upkeep(id); rr.income = inc; rr.upkeep = up; rr.mana += inc - up;
      const lost = [];
      while (rr.mana < 0) {
        const mine = Object.values(s.monsters).filter(m => m.realm === id); if (!mine.length) { rr.mana = 0; break; }
        const worst = mine.sort((a, b) => { const pa = this.monsterStats(a.uid), pb = this.monsterStats(b.uid); return (pa.hp + pa.atk * 4) / G.monsterUpkeep(a.sp, a.form) - (pb.hp + pb.atk * 4) / G.monsterUpkeep(b.sp, b.form) || (a.uid < b.uid ? -1 : 1); })[0];
        rr.mana += Math.round(G.monsterUpkeep(worst.sp, worst.form) * G.tune.upkeepScale); lost.push(G.monsterName(worst.sp, worst.form)); this._removeMonster(worst.uid);
      }
      if (this.isHuman(id)) ev.push({ e: 'income', realm: id, income: inc, upkeep: up, mana: rr.mana, deserted: lost });
    }
    // brigands heal fully
    // story events this Tidings
    const events = this._collectStory('tidings');
    // the AI realms muster at once
    for (const id of G.REALMS) if (!this.isHuman(id) && s.realms[id].alive && id !== 'brigands') G.CampaignAI.muster(this, id);
    s.phase = 'muster'; s.cur = this._nextHumanIndex(-1);
    for (const id of s.humans) if (s.realms[id].alive) s.firstMuster = s.firstMuster || {};
    ev.push({ e: 'muster', realm: this.currentHuman() });
    return { cards: ev, events };
  }
  _nextHumanIndex(i) { const s = this.s; for (let j = i + 1; j < s.humans.length; j++) if (s.realms[s.humans[j]].alive) return j; return s.humans.length; }
  _endMuster(realm) {
    const s = this.s, ev = [];
    s.cur = this._nextHumanIndex(s.cur);
    if (s.cur < s.humans.length) { ev.push({ e: 'muster', realm: this.currentHuman() }); return ev; }
    s.phase = 'march'; s.cur = this._nextHumanIndex(-1); ev.push({ e: 'march', realm: this.currentHuman() });
    if (!s.flags.firstMarch) { s.flags.firstMarch = true; for (const h of s.humans) this._queueStory('free_companies', h); }
    return ev;
  }
  _endMarch(realm) {
    const s = this.s, ev = [];
    s.cur = this._nextHumanIndex(s.cur);
    if (s.cur < s.humans.length) { ev.push({ e: 'march', realm: this.currentHuman() }); return ev; }
    for (const id of G.REALMS) if (!this.isHuman(id) && s.realms[id].alive && id !== 'brigands') G.CampaignAI.march(this, id);
    // resolution order: the attacker's highest knight level, then power, then a seeded tie-break
    const keyed = s.marches.map(m => ({ m, lv: Math.max(...m.knights.map(k => this.knight(k).level)), pw: G.sum(m.knights, k => this.troopPower(k)), tie: CR.next(s) }));
    keyed.sort((a, b) => b.lv - a.lv || b.pw - a.pw || a.tie - b.tie);
    s.queue = keyed.map(x => x.m); s.phase = 'resolve';
    for (const m of s.marches) for (const k of m.knights) this.knight(k).marched = true;
    ev.push({ e: 'resolve', count: s.queue.length });
    return ev;
  }
  /** the next attack to resolve: { kind: 'battle' | 'open' | 'skip' | 'sanctum', march, ... } or null when the season is done */
  nextBattle() {
    const s = this.s;
    while (s.queue.length) {
      const m = s.queue.shift();
      const live = m.knights.filter(k => { const kk = this.knight(k); return kk && kk.realm === m.realm && !kk.free && (!kk.wounded || m.now) && !kk.quest && kk.castle; });
      if (!live.length) continue;
      if (m.target === 'sanctum') { if (s.castles.meridian.owner !== m.realm) continue; s.pending = { kind: 'sanctum', march: Object.assign({}, m, { knights: live }) }; return s.pending; }
      const t = s.castles[m.target];
      if (t.owner === m.realm) continue;
      const defs = this.defenders(m.target);
      if (!defs.length) { s.pending = { kind: 'open', march: Object.assign({}, m, { knights: live }), def: t.owner, castle: m.target }; return s.pending; }
      const chosen = defs.slice().sort((a, b) => this.troopPower(b) - this.troopPower(a) || (a < b ? -1 : 1)).slice(0, 3);
      const ruler = defs.find(k => this.knight(k).ruler); if (ruler && !chosen.includes(ruler)) chosen[chosen.length - 1] = ruler;
      s.pending = { kind: 'battle', march: Object.assign({}, m, { knights: live }), def: t.owner, castle: m.target, defenders: chosen, id: ++s.battles };
      return s.pending;
    }
    s.pending = null; return null;
  }
  /** take an undefended castle */
  takeOpen() {
    const s = this.s, p = s.pending, ev = []; if (!p || p.kind !== 'open') return ev;
    ev.push({ e: 'open', castle: p.castle, realm: p.march.realm, from: p.def });
    this._capture(p.castle, p.march.realm, p.march.knights, ev);
    s.pending = null; return ev;
  }
  /** the BattleSim spec for the pending battle */
  battleSpec(p = this.s.pending) {
    const s = this.s, att = p.march.realm, castle = p.kind === 'sanctum' ? 'meridian' : p.castle;
    const side = (realm, kids, role, heal) => {
      const human = this.isHuman(realm), boost = human ? G.tune.aiPlayerBoost : 0;
      const troops = kids.map(kid => {
        const k = this.knight(kid), kr = heal ? Object.assign({}, k, { hp: k.stats.hp, mp: undefined }) : k;
        return { knight: G.unitFromKnight(kr, { boost }), monsters: k.troop.map(uid => { const m = this.monster(uid); return G.unitFromMonster(heal ? Object.assign({}, m, { hp: undefined, mp: undefined }) : m, { boost }); }), formation: k.formation };
      });
      const items = {}; for (const [id, n] of Object.entries(s.realms[realm] ? s.realms[realm].items : {})) if (n > 0 && G.get('item', id).slot === 'consumable' && !G.get('item', id).muster) items[id] = n;
      return { realm, role, human, items, troops, expMul: human ? DIFF[s.difficulty].exp : 1, ai: human ? 'normal' : DIFF[s.difficulty].ai };
    };
    if (p.kind === 'sanctum') {
      const gk = this._grayKnightTroop();
      return { seed: s.seed * 31 + s.turn * 7 + 999, map: 'clockwork_sanctum', season: this.season, mode: 'sanctum', castle: 'meridian', sides: [side(att, p.march.knights, 'att', true), { realm: 'dominion', role: 'def', human: false, items: {}, troops: [gk], ai: DIFF[s.difficulty].ai }] };
    }
    const spec = { seed: s.seed * 31 + s.turn * 7 + p.id, map: G.get('castle', castle).map, season: this.season, castle, longWinter: !!s.longWinter, sides: [side(att, p.march.knights, 'att'), side(p.def, p.defenders, 'def')] };
    return spec;
  }
  _grayKnightTroop() {
    const d = G.get('knight', 'graynight'), c = G.get('class', 'graynight');
    const k = { id: 'graynight', cls: 'graynight', level: 25, stats: Object.assign({}, c.base), elem: 'hour', items: {}, ruler: true, realm: 'dominion' };
    return { knight: G.unitFromKnight(k), monsters: d.troop.map(([sp, lv, f], i) => G.unitFromMonster({ uid: 'gk' + i, sp, form: f, level: lv, realm: 'dominion' })), formation: 'shield' };
  }
  /** the battle's end: apply its result (BattleSim.result()) to the campaign. Returns events (aftermath cards) */
  applyBattle(res) {
    const s = this.s, p = s.pending, ev = []; if (!p) return ev;
    const att = p.march.realm, attWon = res.winner === 0;
    // units: levels, stats, HP, deaths, wounds, captures
    const byRef = {}; for (const u of res.units) byRef[u.ref] = u;
    for (const u of res.units) {
      if (u.kind === 'knight') {
        const k = this.knight(u.ref); if (!k) continue;
        k.level = u.level; k.exp = u.exp; if (u.stats) k.stats = Object.assign({}, u.stats); k.hp = Math.max(0, Math.min(k.stats.hp, Math.round(u.hp))); k.mp = u.mp;
        if (u.wounded) { k.wounded = 2; k.hp = 0; }
      } else {
        const m = this.monster(u.ref); if (!m) continue;
        m.level = u.level; m.exp = u.exp; m.hp = Math.max(0, u.hp); m.mp = u.mp;
        if (u.dead) { ev.push({ e: 'dead', uid: m.uid, name: G.monsterName(m.sp, m.form), realm: m.realm }); this._removeMonster(m.uid); }
      }
    }
    // consumables used, per side
    const sides = [att, p.kind === 'sanctum' ? 'dominion' : p.def];
    for (const [si, used] of Object.entries(res.itemsUsed || {})) { const r = sides[si]; if (!s.realms[r]) continue; for (const [it, n] of Object.entries(used)) s.realms[r].items[it] = Math.max(0, (s.realms[r].items[it] || 0) - n); }
    // captures
    const caps = [];
    for (const c of res.captures) {
      const m = this.monster(c.ref), captor = this.knight(c.byRef); if (!m || !captor) continue;
      if (m.knight && s.knights[m.knight]) s.knights[m.knight].troop = s.knights[m.knight].troop.filter(x => x !== m.uid);
      m.knight = null; m.realm = captor.realm; caps.push({ uid: m.uid, realm: captor.realm, side: c.side, captor: captor.id });
      s.stats.captures++;
      ev.push({ e: 'captured', uid: m.uid, name: G.monsterName(m.sp, m.form), by: captor.id, realm: captor.realm });
    }
    if (p.kind === 'sanctum') {
      for (const cc of caps) { const m = this.monster(cc.uid); if (m) this._removeMonster(m.uid); }
      if (attWon) { this._win(att, ev); }
      else {
        ev.push({ e: 'sanctumLost', realm: att });
        for (const kid of p.march.knights) this._sendHome(this.knight(kid), 'meridian');
        if (this.isHuman(att)) this._queueStory('sanctum_retry', att);
      }
      s.pending = null; return ev;
    }
    const castle = p.castle;
    if (attWon) {
      ev.push({ e: 'taken', castle, realm: att, from: p.def });
      this._capture(castle, att, p.march.knights, ev);
      if (this.isHuman(att)) s.stats.battlesWon++;
      if (this.isHuman(p.def)) s.stats.battlesLost++;
    } else {
      ev.push({ e: 'held', castle, realm: p.def, by: att });
      for (const kid of p.march.knights) { const k = this.knight(kid); if (k && !k.free) this._sendHome(k, p.march.from[kid]); }
      if (this.isHuman(att)) s.stats.battlesLost++;
      if (this.isHuman(p.def)) s.stats.battlesWon++;
    }
    // a captured monster joins the winner's reserve at the contested castle if its captor's side won, else the reserve
    // of the captor's home castle
    for (const cc of caps) this._placeCaptured(cc, cc.side === res.winner ? castle : null);
    // story after battles
    const won = attWon ? att : p.def, lost = attWon ? p.def : att;
    for (const r of [won, lost]) if (this.isHuman(r) && !s.flags['firstBattle_' + r]) { s.flags['firstBattle_' + r] = true; this._queueStory(r === won ? 'first_victory' : 'first_loss', r); }
    if (attWon && att === 'verdance' && s.flags.v_letter && castle === 'goldspur') this._queueStory('v_elidure_joins', 'verdance');
    if (won === 'verdance' && s.flags.v_letter && res.units.some(u => u.ref === 'elidure' && (u.wounded || u.out))) this._queueStory('v_elidure_joins', 'verdance');
    s.pending = null;
    return ev;
  }
  _placeCaptured(cc, castle) {
    const s = this.s, m = this.monster(cc.uid); if (!m) return;
    const captor = this.knight(cc.captor);
    const c = castle && s.castles[castle].owner === cc.realm ? castle : (captor && captor.castle) || this.capital(cc.realm);
    if (!c) { this._removeMonster(m.uid); return; }
    m.castle = c; s.castles[c].reserve.push(m.uid);
  }
  _sendHome(k, from) {
    const s = this.s; if (!k || k.free) return;
    const home = from && s.castles[from] && s.castles[from].owner === k.realm ? from : this.nearestOwned(k.realm, from || k.castle);
    if (!home) return;
    if (k.castle && s.castles[k.castle]) s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== k.id);
    k.castle = home; if (!s.castles[home].knights.includes(k.id)) s.castles[home].knights.push(k.id);
  }
  /** a castle changes hands: defenders fall back, attackers occupy, reserve and treasury change owner */
  _capture(cid, realm, attackers, ev) {
    const s = this.s, st = s.castles[cid], old = st.owner;
    st.owner = realm;
    for (const kid of st.knights.slice()) { const k = this.knight(kid); st.knights = st.knights.filter(x => x !== kid); k.castle = null; const to = this.nearestOwned(old, cid); if (to) { k.castle = to; s.castles[to].knights.push(kid); ev.push({ e: 'fallback', knight: kid, to }); } else { k.castle = null; this._freeKnight(k); } }
    for (const kid of attackers) { const k = this.knight(kid); if (!k || k.free || k.realm !== realm) continue; if (k.castle && s.castles[k.castle]) s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== kid); k.castle = cid; st.knights.push(kid); }
    for (const uid of st.reserve) this.monster(uid).realm = realm;
    if (!st.treasuryTaken) { st.treasuryTaken = true; const it = G.get('castle', cid).treasury; if (it) { s.realms[realm].items[it] = (s.realms[realm].items[it] || 0) + 1; ev.push({ e: 'treasury', castle: cid, item: it, realm }); } }
    this.log(G.get('realm', realm).short + ' takes ' + G.get('castle', cid).name + '.');
    if (old === 'brigands' && this.isHuman(realm)) { const cap = { thawgate: 'hob', beltane: 'gerrow', lammas: 'dafydd', hallowmere: 'abbot' }[cid]; if (cap) this._queueStory('brigands_no_more_' + cap, realm); }
    if (old === 'dominion' && G.get('castle', cid).tier === 'satellite' && this.isHuman(realm)) { if (realm === 'verdance') this._queueStory('v_green_oath', realm); if (realm === 'hoarfast') this._queueStory('w_lucid_hour', realm); }
    if (cid === 'meridian') {
      if (this.isHuman(realm)) { s.sanctumOpen = realm; this._queueStory('meridian_falls', realm); }
      else { s.rivalSanctum = realm; this._queueStory('rival_meridian', 'world'); }
    }
    // a realm with no castles is out
    if (old && old !== 'brigands' && !this.realmAlive(old)) this._eliminate(old, ev);
  }
  _freeKnight(k) {
    const s = this.s;
    if (k.ruler) { k.free = true; k.castle = null; k.exiled = true; return; }
    k.free = true; k.castle = null; k.quest = null; k.realm = null;
    for (const uid of k.troop.slice()) this._removeMonster(uid);
    const d = G.get('knight', k.id); const region = d.elem && G.SEASONS.includes(d.elem) ? d.elem : null;
    if (region && !['graynight'].includes(k.id) && d.realm !== 'dominion') { (s.wanderers[region] = s.wanderers[region] || []); if (!s.wanderers[region].includes(k.id)) s.wanderers[region].push(k.id); }
  }
  _eliminate(realm, ev) {
    const s = this.s; if (!s.realms[realm].alive) return;
    s.realms[realm].alive = false;
    for (const k of this.knightsOf(realm).slice()) this._freeKnight(k);
    for (const m of Object.values(s.monsters)) if (m.realm === realm) this._removeMonster(m.uid);
    ev.push({ e: 'eliminated', realm }); this.log(G.get('realm', realm).name + ' has fallen.');
    if (G.PLAYABLE.includes(realm)) this._queueStory('realm_falls_' + realm, 'world');
    if (this.isHuman(realm) && !s.humans.some(h => s.realms[h].alive)) this._lose('fallen', ev, realm);
  }
  _rivalSanctum() {
    const s = this.s, realm = s.rivalSanctum, ev = []; s.rivalSanctum = null;
    if (s.castles.meridian.owner !== realm) return ev;
    const kids = this.defenders('meridian').slice(0, 3); if (!kids.length) return ev;
    s.pending = { kind: 'sanctum', march: { realm, target: 'sanctum', knights: kids, from: {} } };
    const sim = G.BattleSim.create(this.battleSpec()); G.BattleAI.resolve(sim);
    const res = sim.result();
    if (res.winner === 0) {
      s.pending = null; ev.push({ e: 'rivalWheel', realm });
      this._lose('wheel', ev, realm);
    } else {
      this.applyBattle(res);
      ev.push({ e: 'rivalFailed', realm }); this._queueStory('rival_failed', 'world');
      // Meridian returns to the Dominion with a fresh garrison
      const st = s.castles.meridian;
      for (const kid of st.knights.slice()) { const k = this.knight(kid); st.knights = st.knights.filter(x => x !== kid); const to = this.nearestOwned(realm, 'meridian'); if (to) { k.castle = to; s.castles[to].knights.push(kid); } else this._freeKnight(k); }
      st.owner = 'dominion'; s.realms.dominion.alive = true;
      for (const id of ['meliant', 'bertilak']) { const k = s.knights[id]; if (k && !k.free) continue; if (k) delete s.knights[id]; const kk = this._spawnKnight(id, 'dominion', 'meridian', { level: 14 }); for (const uid of kk.troop) { const m = this.monster(uid); m.level = Math.max(m.level, 14); } }
    }
    return ev;
  }
  _win(realm, ev) {
    const s = this.s; s.result = { kind: 'win', realm, ending: 'ending_' + realm, turn: s.turn };
    ev.push({ e: 'victory', realm }); this.log('The thirteenth bell never rang.');
  }
  _lose(why, ev, realm) {
    const s = this.s; if (s.result) return;
    const ending = why === 'candle' ? 'ending_candle' : why === 'wheel' ? 'ending_wheel_' + realm : 'ending_fallen';
    s.result = { kind: 'lose', reason: why, realm: realm || null, ending, turn: s.turn };
    ev.push({ e: 'defeat', why, realm });
  }
  /** the season's battles are done: next Tidings */
  endSeason() {
    const s = this.s; s.turn++; s.phase = 'tidings'; s.marches = []; s.queue = []; s.pending = null;
    return [{ e: 'seasonEnd' }];
  }

  /* ---- story events: conditions, queueing, effects ---- */
  /** a context for event conditions */
  ctx(realm) {
    const sim = this, s = this.s;
    return {
      sim, s, realm, season: this.season, year: this.year, turn: s.turn,
      human: r => sim.isHuman(r), owns: (c, r = realm) => s.castles[c].owner === r, holds: (k, r = realm) => !!s.knights[k] && s.knights[k].realm === r && !s.knights[k].free,
      flag: f => !!s.flags[f], alive: r => s.realms[r].alive, seen: id => !!s.seen[id]
    };
  }
  _queueStory(id, realm) { const s = this.s; if (!G.has('event', id)) return; if (G.get('event', id).once !== false && s.seen[id + '@' + realm]) return; if (!s.deferred.some(d => d.id === id && d.realm === realm)) s.deferred.push({ id, realm, turn: s.turn }); }
  /** collect eligible events for a moment: up to 3 a Tidings, by priority; the rest roll over */
  _collectStory(when) {
    const s = this.s, out = [];
    const cands = [];
    for (const d of s.deferred) cands.push(d);
    for (const ev of G.all('event')) {
      if (ev.when !== when) continue;
      const realms = ev.realm === 'player' ? s.humans.filter(h => s.realms[h].alive) : ev.realm === 'world' ? ['world'] : [ev.realm];
      for (const r of realms) {
        if (ev.realm !== 'world' && ev.realm !== 'player' && !this.isHuman(r)) continue;
        if (r !== 'world' && !s.realms[r].alive) continue;
        if (ev.once !== false && s.seen[ev.id + '@' + r]) continue;
        if (ev.expires !== undefined && s.turn > ev.expires) continue;
        let ok = false; try { ok = !ev.if || ev.if(this.ctx(r === 'world' ? s.humans[0] : r)); } catch (e) { ok = false; }
        if (ok && !cands.some(c => c.id === ev.id && c.realm === r)) cands.push({ id: ev.id, realm: r });
      }
    }
    cands.sort((a, b) => (G.get('event', b.id).priority || 10) - (G.get('event', a.id).priority || 10) || (a.id < b.id ? -1 : 1));
    for (const c of cands) {
      if (out.length >= 3 && !G.get('event', c.id).urgent) continue;
      out.push(c);
    }
    s.deferred = cands.filter(c => !out.includes(c));
    for (const c of out) s.seen[c.id + '@' + c.realm] = s.turn;
    return out;
  }
  /** take pending (deferred) events right now, outside a Tidings (after a battle, a capture, a quest's return) */
  takeStory() {
    const s = this.s, out = s.deferred.filter(d => !s.seen[d.id + '@' + d.realm] || G.get('event', d.id).once === false);
    s.deferred = [];
    for (const c of out) s.seen[c.id + '@' + c.realm] = s.turn;
    return out;
  }
  _takeStory(ids) { const out = ids.filter(id => G.has('event', id)).map(id => ({ id, realm: this.s.humans[0] })); for (const c of out) this.s.seen[c.id + '@' + c.realm] = this.s.turn; return out; }
  /** apply an event's effects (and its choice's) */
  _applyEvent(id, choice, realm) {
    const s = this.s, ev = G.get('event', id), out = [];
    const r = realm && realm !== 'world' ? realm : s.humans[0];
    const effs = [].concat(ev.effects || [], ev.choices && ev.choices[choice] ? ev.choices[choice].effects || [] : []);
    for (const eff of effs) out.push(...this._effect(eff, r, id));
    s.eventLog.push({ id, choice, realm: r, turn: s.turn });
    out.push({ e: 'eventDone', id, choice });
    return out;
  }
  _effect(eff, realm, src) {
    const s = this.s, out = [], cap = this.capital(realm);
    const target = (c) => (c === 'capital' || !c ? cap : c);
    if (eff.addKnight) { const id = eff.addKnight, c = target(eff.at); if (c && (!s.knights[id] || s.knights[id].free)) { this._joinFree(id, realm, c); out.push({ e: 'joined', knight: id, realm }); this.log(G.get('knight', id).short + ' joins ' + G.get('realm', realm).short + '.'); } }
    if (eff.moveKnight) { const [id, r2, c] = eff.moveKnight, k = s.knights[id]; if (k && !k.free) { if (k.castle) s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== id); k.realm = r2; const to = c && s.castles[c] && s.castles[c].owner === r2 ? c : this.capital(r2); k.castle = to; k.quest = null; if (to) s.castles[to].knights.push(id); for (const uid of k.troop) this.monster(uid).realm = r2; out.push({ e: 'defect', knight: id, realm: r2 }); } }
    if (eff.addMonster) { const [sp, lv, where] = eff.addMonster; const c = target(where); if (c) { const m = this._newMonster(sp, lv, 1, realm, { castle: c }); out.push({ e: 'gift', uid: m.uid, sp }); } }
    if (eff.addItem) { s.realms[realm].items[eff.addItem] = (s.realms[realm].items[eff.addItem] || 0) + 1; out.push({ e: 'gotItem', item: eff.addItem }); }
    if (eff.mana) { s.realms[realm].mana += eff.mana; out.push({ e: 'mana', realm, amt: eff.mana }); }
    if (eff.flag) s.flags[eff.flag] = eff.value === undefined ? true : eff.value;
    if (eff.aiFlag) { const [r2, key, val] = eff.aiFlag; (s.aiFlags[r2] = s.aiFlags[r2] || {})[key] = val; }
    if (eff.aiPeace) { const [r2, foe, n] = eff.aiPeace; (s.aiFlags[r2] = s.aiFlags[r2] || {})['peace_' + foe] = s.turn + n; }
    if (eff.unlockSite) s.flags['site_' + eff.unlockSite] = true;
    if (eff.levelUp) { const [id, n] = eff.levelUp, k = s.knights[id]; if (k && !k.free) for (let i = 0; i < n; i++) this._addExp(k, 100 - k.exp, true); }
    if (eff.learn) { const [id, sk] = eff.learn, k = s.knights[id]; if (k && !k.learned.includes(sk)) k.learned.push(sk); }
    if (eff.bond) { const [id, n] = eff.bond, k = s.knights[id]; if (k) k.bondBonus += n; }
    if (eff.giveItemTo) { const [id, it] = eff.giveItemTo, k = s.knights[id]; if (k && !k.free) { const slot = G.get('item', it).slot, old = k.items[slot]; if (old) s.realms[k.realm].items[old] = (s.realms[k.realm].items[old] || 0) + 1; k.items[slot] = it; } }
    if (eff.candle) { s.candle = DIFF[s.difficulty].candle + (G.tune.candleSeasons - G.TUNE_DEFAULTS.candleSeasons); s.candleLitNow = true; out.push({ e: 'candleLit', left: s.candle }); }
    if (eff.dominion) s.flags.dominionAwake = true;
    if (eff.startSanctum) {
      // the Clockwork Sanctum opens at once: the troops in Meridian (healed by the Wheel's light), plus one from a castle beside it
      const inCity = s.castles.meridian.knights.filter(k => !this.knight(k).quest).slice(0, 3);
      const extra = G.get('castle', 'meridian').roads.flatMap(c => s.castles[c].owner === realm ? s.castles[c].knights : []).filter(k => this.canAct(k) && !inCity.includes(k));
      const ks = inCity.concat(extra.slice(0, Math.max(0, Math.min(1, 3 - inCity.length))));
      for (const k of ks) { const kk = this.knight(k); kk.wounded = 0; kk.hp = kk.stats.hp; }
      if (ks.length) s.queue.unshift({ realm, target: 'sanctum', knights: ks, from: Object.fromEntries(ks.map(k => [k, this.knight(k).castle])), now: true });
      out.push({ e: 'sanctumOpens' });
    }
    if (eff.joinFromQuest) { const id = eff.joinFromQuest; const c = target(eff.at); this._joinFree(id, realm, c); out.push({ e: 'joined', knight: id, realm }); }
    if (eff.pay) { if (s.realms[realm].mana >= eff.pay) { s.realms[realm].mana -= eff.pay; } else out.push({ e: 'cannotPay' }); }
    if (eff.captainJoins) {
      const id = eff.captainJoins, k = s.knights[id];
      if (k) { const c = this.capital(realm); if (k.castle) s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== id); k.realm = realm; k.free = false; k.wounded = 0; k.hp = k.stats.hp; k.castle = target(eff.at) || c; s.castles[k.castle].knights.push(id); for (const uid of k.troop) this.monster(uid).realm = realm; out.push({ e: 'joined', knight: id, realm }); }
    }
    if (eff.exileCaptain) { const k = s.knights[eff.exileCaptain]; if (k) this._freeKnight(k); }
    if (eff.hesperDefects) {
      const k = s.knights.hesper;
      if (k && !k.free && k.realm === realm) { const sats = this.castlesOf('dominion').filter(c => c !== 'meridian'); const to = sats.length ? sats[0] : 'meridian'; this._effect({ moveKnight: ['hesper', 'dominion', s.castles[to].owner === 'dominion' ? to : null] }, realm, src).forEach(x => out.push(x)); }
    }
    return out;
  }

  /* ---- dev tools (dev mode marks the campaign DEV) ---- */
  _dev(c) {
    const s = this.s, ev = [], r = c.realm || s.humans[0]; s.dev = true;
    switch (c.op) {
      case 'mana': s.realms[r].mana += c.amt || 1000; break;
      case 'item': s.realms[r].items[c.item] = (s.realms[r].items[c.item] || 0) + 1; break;
      case 'knight': { const id = c.knight; if (!s.knights[id] || s.knights[id].free) this._joinFree(id, r, c.castle || this.capital(r)); break; }
      case 'spawn': this._newMonster(c.sp, c.level || this.summonLevel(r), c.form || 1, r, { castle: c.castle || this.capital(r), knight: c.knight }); break;
      case 'level': { const k = s.knights[c.knight]; if (k) for (let i = 0; i < (c.n || 1); i++) this._addExp(k, 100 - k.exp, true); const m = s.monsters[c.uid]; if (m) for (let i = 0; i < (c.n || 1); i++) this._addExp(m, 100 - m.exp, false); break; }
      case 'heal': for (const k of Object.values(s.knights)) if (k.realm === r) { k.hp = k.stats.hp; k.wounded = 0; } for (const m of Object.values(s.monsters)) if (m.realm === r) m.hp = this.monsterStats(m.uid).hp; break;
      case 'owner': { const old = s.castles[c.castle].owner; s.castles[c.castle].owner = c.owner; for (const kid of s.castles[c.castle].knights.slice()) this._sendHome(this.knight(kid), null); if (old && old !== 'brigands' && !this.realmAlive(old)) this._eliminate(old, ev); break; }
      case 'candle': s.candle = c.value; break;
      case 'jump': s.turn = c.turn; break;
      case 'flag': s.flags[c.flag] = c.value === undefined ? true : c.value; break;
      case 'freeSummon': s.flags.devFreeSummon = !s.flags.devFreeSummon; break;
      case 'unlockClass': s.flags.devUnlockClass = !s.flags.devUnlockClass; break;
      case 'ending': s.result = { kind: c.ending.startsWith('ending_wheel') || c.ending === 'ending_candle' || c.ending === 'ending_fallen' ? 'lose' : 'win', ending: c.ending, realm: r, dev: true }; break;
      case 'trigger': this._queueStory(c.id, c.realm || r); break;
    }
    ev.push({ e: 'dev', op: c.op });
    return ev;
  }
}
G.CampaignSim = CampaignSim;

}

// ===== src/23-ai-campaign.js =====
{
// THE REALM AI: deterministic per seed. It musters (summon, bind, move, quest, equip, promote) and declares marches
// for every realm not played by a human, and for the player's own realm on autoplay (tests, the attract mode).
// power(unit) = (HP + 4 (ATK + DEF + INT) + 2 AGI) x (1 + 0.05 (level - 1)), x1.2 for knights; defense(c) = the power of
// the troops at c x1.25; threat(c) = the marchable power of foreign neighbours x their aggression; need = threat - defense.

const CA = {};
G.CampaignAI = CA;
const PERS = {
  solmark: { inSeason: 1.3, weakest: true }, hoarfast: { inSeason: 1.3 }, amberlyn: { questers: 3, capitalExtra: 1 },
  verdance: { brigandsFirst: true }, dominion: { hourOnly: true, keepAtCapital: 2 }
};

/** a realm's aggression this season */
CA.aggression = (sim, realm) => {
  const s = sim.s, r = s.realms[realm]; let a = sim.isHuman(realm) ? 1.1 : r.aggression;   // autoplay plays a human realm steadily
  if (realm === 'dominion') a = sim.year <= 1 ? 0 : sim.year === 2 ? (s.flags.dominionAwake ? .8 : 0) : 1.1;
  const re = G.get('realm', realm); if (re.season && re.season === sim.season) a *= (!sim.isHuman(realm) && PERS[realm] && PERS[realm].inSeason) || 1.2;
  return a * G.tune.aiAggression;
};
CA.troopPower = (sim, kid) => sim.troopPower(kid);
CA.castlePower = (sim, cid) => G.sum(sim.defenders(cid), k => sim.troopPower(k));
CA.defense = (sim, cid) => CA.castlePower(sim, cid) * 1.25;
CA.threat = (sim, cid, realm) => {
  const s = sim.s; let t = 0;
  for (const n of G.get('castle', cid).roads) {
    const o = s.castles[n].owner; if (o === realm || o === 'brigands') continue;
    if (o === 'dominion' && CA.aggression(sim, 'dominion') <= 0) continue;
    if (!s.realms[o].alive) continue;
    t += CA.castlePower(sim, n) * Math.max(.3, CA.aggression(sim, o));
  }
  return t;
};
CA.need = (sim, cid, realm) => CA.threat(sim, cid, realm) - CA.defense(sim, cid);
/** a border castle: next to a realm that can attack it (brigands never march; the Hour only once it is roused) */
CA.border = (sim, cid, realm) => G.get('castle', cid).roads.some(n => { const o = sim.s.castles[n].owner; return o !== realm && o !== 'brigands' && (o !== 'dominion' || CA.aggression(sim, 'dominion') > 0) && sim.s.realms[o].alive; });
const monPower = (sp, form, level) => { const st = G.monsterStats(sp, form, level); return (st.hp + 4 * (st.atk + st.def + st.int) + 2 * st.agi) * (1 + .05 * (level - 1)); };

/** the Muster of an AI realm (also the player's on autoplay) */
CA.muster = (sim, realm) => {
  const s = sim.s, r = s.realms[realm], pers = sim.isHuman(realm) ? {} : PERS[realm] || {}, cmd = c => sim.apply(Object.assign({ realm, ai: true }, c));
  if (realm === 'brigands' || !r.alive) return;
  if (pers.questers) (s.aiFlags[realm] = s.aiFlags[realm] || {}).questers = pers.questers;
  const mine = () => sim.castlesOf(realm);
  // 1. summon while mana allows, at the castle that needs it most (the Dominion sleeps in Year 1, then summons one a season)
  let guard = 0;
  const maxSummons = realm === 'dominion' ? (sim.year <= 1 ? 0 : 1) : 12;
  while (guard++ < maxSummons) {
    const up = sim.upkeep(realm); if (r.mana <= 1.1 * up + 30) break;
    const cs = mine().filter(c => !s.castles[c].stilled && s.castles[c].summons < 3 && s.castles[c].knights.length).map(c => ({ c, need: CA.need(sim, c, realm) })).sort((a, b) => b.need - a.need || (a.c < b.c ? -1 : 1));
    if (!cs.length) break;
    const c = cs[0].c, foeEl = CA.strongestNeighbourElem(sim, c, realm), next = G.SEASONS[(s.turn + 1) % 4];
    let best = null;
    for (const sp of sim.circle(c)) {
      const m = G.get('monster', sp); if (pers.hourOnly && m.elem !== 'hour') continue; if (m.meridianOnly && c !== 'meridian') continue;
      const cost = sim.summonCost(sp); if (cost > r.mana - up) continue;
      let v = monPower(sp, 1, sim.summonLevel(realm)) / cost; if (foeEl && G.opposes(m.elem, foeEl)) v *= 1.2; if (m.elem === next) v *= 1.1;
      if (!best || v > best.v) best = { sp, v };
    }
    if (!best) break;
    const kid = s.castles[c].knights.find(k => sim.canAct(k) && sim.bondFree(k) >= G.get('monster', best.sp).rank && sim.knight(k).troop.length < 6);
    const ev = cmd({ t: 'summon', castle: c, sp: best.sp, bindTo: kid });
    if (ev[0] && ev[0].e === 'illegal') break;
  }
  // 2. bind reserve monsters to knights with free Bond, strongest first
  for (const c of mine()) {
    const st = s.castles[c];
    const res = st.reserve.slice().sort((a, b) => { const ma = sim.monster(a), mb = sim.monster(b); return monPower(mb.sp, mb.form, mb.level) - monPower(ma.sp, ma.form, ma.level) || (a < b ? -1 : 1); });
    for (const uid of res) {
      const m = sim.monster(uid), rank = G.get('monster', m.sp).rank;
      const k = st.knights.filter(kk => !sim.knight(kk).quest && sim.bondFree(kk) >= rank && sim.knight(kk).troop.length < 6).sort((a, b) => sim.bondFree(b) - sim.bondFree(a) || (a < b ? -1 : 1))[0];
      if (k) cmd({ t: 'bind', uid, knight: k });
    }
  }
  // 3. move up to 3 troops from surplus to need
  for (let i = 0; i < 3; i++) {
    const cs = mine().filter(c => !s.castles[c].stilled);
    if (cs.length < 2) break;
    const scored = cs.map(c => ({ c, need: CA.need(sim, c, realm) }));
    const needy = scored.slice().sort((a, b) => b.need - a.need || (a.c < b.c ? -1 : 1))[0];
    if (!needy || needy.need <= 0) break;
    let moved = false;
    for (const src of scored.slice().sort((a, b) => a.need - b.need || (a.c < b.c ? -1 : 1))) {
      if (src.c === needy.c || !G.adjacent(src.c, needy.c)) continue;
      const movable = s.castles[src.c].knights.filter(k => sim.canAct(k) && !sim.knight(k).moved && !sim.knight(k).ruler);
      const keep = (CA.border(sim, src.c, realm) ? 1 : 0) + (pers.capitalExtra && src.c === G.get('realm', realm).capital ? 1 : 0) + (pers.keepAtCapital && src.c === 'meridian' ? pers.keepAtCapital : 0);
      if (s.castles[src.c].knights.filter(k => sim.canAct(k)).length - 1 < keep) continue;
      const kid = movable.sort((a, b) => sim.troopPower(b) - sim.troopPower(a) || (a < b ? -1 : 1))[0];
      if (kid && sim.legal({ t: 'move', realm, knight: kid, to: needy.c, ai: true })) { cmd({ t: 'move', knight: kid, to: needy.c }); moved = true; break; }
    }
    if (!moved) break;
  }
  // 3b. stage for the march: bring spare troops next to the best target this realm cannot yet take
  if (CA.aggression(sim, realm) > 0) {
    for (let i = 0; i < 3; i++) {
      const best = CA.bestTarget(sim, realm); if (!best || best.ratio >= G.DIFF[s.difficulty].threshold / CA.aggression(sim, realm)) break;
      let moved = false;
      for (const launch of sim.launchers(realm, best.t).sort()) {
        if (s.castles[launch].knights.length >= 6) continue;
        for (const src of G.get('castle', launch).roads.slice().sort()) {
          if (s.castles[src].owner !== realm || s.castles[src].stilled || src === launch) continue;
          const spare = s.castles[src].knights.filter(k => sim.canAct(k) && !sim.knight(k).moved && !sim.knight(k).ruler);
          const keep = (CA.border(sim, src, realm) ? 1 : 0) + (pers.capitalExtra && src === G.get('realm', realm).capital ? 1 : 0) + (src === 'meridian' ? 2 : 0);
          if (s.castles[src].knights.filter(k => sim.canAct(k)).length - 1 < keep || !spare.length) continue;
          const kid = spare.sort((a, b) => sim.troopPower(b) - sim.troopPower(a) || (a < b ? -1 : 1))[0];
          if (sim.legal({ t: 'move', realm, knight: kid, to: launch, ai: true })) { cmd({ t: 'move', knight: kid, to: launch }); moved = true; break; }
        }
        if (moved) break;
      }
      if (!moved) break;
    }
  }
  // 4. quest with a spare knight at an interior castle that has no need (never one the march needs)
  const spare = sim.knightsOf(realm).filter(k => !k.quest).length - sim.castlesOf(realm).filter(c => CA.border(sim, c, realm)).length - 2;
  if (realm !== 'dominion' && spare > 0) {
    const lim = Math.min(pers.questers || 2, spare, sim.year <= 1 ? 1 : 2);
    for (const c of mine()) {
      if (sim.questingCount(realm) >= lim) break;
      // only from a castle deep inside the realm (every neighbour its own): never a launcher or a front
      if (G.get('castle', c).roads.some(n => s.castles[n].owner !== realm) || CA.need(sim, c, realm) > 0) continue;
      const site = G.get('castle', c).site; if (!site || G.get('site', site).story) continue;
      const kid = s.castles[c].knights.filter(k => !sim.knight(k).ruler && sim.canAct(k) && !sim.knight(k).moved).sort((a, b) => sim.knight(a).level - sim.knight(b).level || (a < b ? -1 : 1))[0];
      if (kid && s.castles[c].knights.length > 1) cmd({ t: 'quest', knight: kid, site });
    }
  }
  // 5. equip the best, promote and change class whenever eligible
  CA.equip(sim, realm);
  for (const m of Object.values(s.monsters).filter(m => m.realm === realm).sort((a, b) => a.uid < b.uid ? -1 : 1)) {
    if (sim.legal({ t: 'promote', realm, uid: m.uid, ai: true })) cmd({ t: 'promote', uid: m.uid });
    else if (sim.legal({ t: 'promote', realm, uid: m.uid, seed: true, ai: true })) cmd({ t: 'promote', uid: m.uid, seed: true });
  }
  for (const k of sim.knightsOf(realm)) if (sim.legal({ t: 'classchange', realm, knight: k.id, ai: true })) cmd({ t: 'classchange', knight: k.id });
  // consumables: mana seeds into the treasury
  while (r.items.manaseed > 0) cmd({ t: 'use', item: 'manaseed' });
};
CA.strongestNeighbourElem = (sim, cid, realm) => {
  let best = null, bp = 0;
  for (const n of G.get('castle', cid).roads) { const o = sim.s.castles[n].owner; if (o === realm || o === 'brigands') continue; const p = CA.castlePower(sim, n); if (p > bp) { bp = p; best = G.get('realm', o).season; } }
  return best;
};
CA.equip = (sim, realm) => {
  const s = sim.s, r = s.realms[realm];
  const score = (it, k) => { const m = G.get('item', it).mods, line = G.get('class', k.cls).line, magic = line === 'mage' || line === 'cleric' || ['harvestking', 'rimeduke', 'chancellor', 'hourmaiden'].includes(k.cls);
    const sl = G.get('item', it).slot; if (sl === 'weapon') return magic ? (m.int || 0) * 1.2 + (m.atk || 0) * .3 : (m.atk || 0) * 1.2 + (m.int || 0) * .2 + (m.def || 0) * .3; if (sl === 'armor') return (m.def || 0) + (m.int || 0) * .5 + (m.agi || 0); return (m.bond || 0) * 3 + (m.mov || 0) * 2.5 + (m.ward || 0) * 2 + (G.get('item', it).flags.mending ? 2 : 1); };
  for (const k of sim.knightsOf(realm).sort((a, b) => b.level - a.level || (a.id < b.id ? -1 : 1))) {
    if (k.quest) continue;
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const cur = k.items[slot], curV = cur ? score(cur, k) : -1;
      const opts = Object.keys(r.items).filter(it => r.items[it] > 0 && G.get('item', it).slot === slot && G.canEquip(it, k.cls)).sort();
      let best = null, bv = curV;
      for (const it of opts) { const v = score(it, k); if (v > bv + .01) { bv = v; best = it; } }
      if (best) sim.apply({ t: 'equip', realm, knight: k.id, item: best, ai: true });
    }
  }
};

/** how hard a realm turns on the Hour: 0 before the candle; more as the candle burns and the realm grows */
CA.hourFocus = (sim, realm) => {
  const s = sim.s; if (s.candle === null) return 0;
  const big = sim.castlesOf(realm).length >= 6, low = s.candle <= 8;
  return big || low ? 3 + (low ? 2 : 0) : 1.2;
};
/** the most valuable target and the ratio this realm could bring against it now */
CA.bestTarget = (sim, realm) => {
  const s = sim.s; let best = null;
  for (const t of sim.marchTargets(realm)) {
    if (t === 'sanctum') continue;
    const owner = s.castles[t].owner; if (owner === 'dominion' && sim.year < 2 && t === 'meridian') continue;
    const ks = sim.marchers(realm, t).sort((a, b) => sim.troopPower(b) - sim.troopPower(a)).slice(0, 3);
    const def = CA.defense(sim, t), ratio = def <= 0 ? 9 : G.sum(ks, k => sim.troopPower(k)) / def;
    let v = owner === 'brigands' ? 1.4 : 1; if (G.get('castle', t).tier === 'capital') v *= 1.2; if (owner === 'dominion') v *= 1 + CA.hourFocus(sim, realm); v /= Math.max(.5, def / 3000);
    if (!best || v > best.v) best = { t, ratio, v };
  }
  return best;
};
/** the March of an AI realm: declarations (hidden until resolution) */
CA.march = (sim, realm) => {
  const s = sim.s, pers = sim.isHuman(realm) ? {} : PERS[realm] || {}, agg = CA.aggression(sim, realm);
  if (realm === 'brigands' || !s.realms[realm].alive || agg <= 0) return;
  if (s.sanctumOpen === realm && s.castles.meridian.owner === realm) {
    const ks = sim.marchers(realm, 'sanctum').slice(0, 3); if (ks.length) sim.apply({ t: 'declare', realm, target: 'sanctum', knights: ks, ai: true });
  }
  const threshold = G.DIFF[s.difficulty].threshold, used = new Set();
  const allIn = CA.hourFocus(sim, realm) >= 3;
  const neededAtHome = (kid) => {
    const k = sim.knight(kid), c = k.castle, defs = sim.defenders(c).filter(x => !used.has(x)), thr = CA.threat(sim, c, realm);
    if (k.ruler && realm !== 'dominion') return !allIn && (defs.length <= 1 || CA.border(sim, c, realm));
    if (pers.keepAtCapital && c === 'meridian' && defs.length <= pers.keepAtCapital) return true;
    if (pers.capitalExtra && c === G.get('realm', realm).capital && defs.length <= 2 && !allIn) return true;
    const mine = sim.troopPower(kid) * 1.25, rest = G.sum(defs.filter(x => x !== kid), x => sim.troopPower(x)) * 1.25;
    // the last knight stays only where the threat is real for it; late in the war the realm risks more
    if (defs.length <= 1) return thr > (allIn ? 1.6 : .7) * mine;
    return !allIn && thr > 0 && thr - rest > .4 * thr;
  };
  const targets = [];
  for (const t of sim.marchTargets(realm)) {
    if (t === 'sanctum') continue;
    const owner = s.castles[t].owner;
    if (s.aiFlags[realm] && s.aiFlags[realm]['peace_' + owner] && s.aiFlags[realm]['peace_' + owner] > s.turn) continue;
    if (realm !== 'dominion' && owner === 'dominion' && sim.year < 2 && t !== 'meridian') { /* the Hour is not yet roused, but its castles may still be taken */ }
    const avail = sim.marchers(realm, t).filter(k => !neededAtHome(k)).sort((a, b) => sim.troopPower(b) - sim.troopPower(a) || (a < b ? -1 : 1)).slice(0, 3);
    if (!avail.length) continue;
    const def = CA.defense(sim, t), pw = G.sum(avail, k => sim.troopPower(k)), ratio = def <= 0 ? Infinity : pw / def;
    const urgency = owner === 'dominion' && CA.hourFocus(sim, realm) >= 3 ? .8 : owner === 'dominion' && s.candle !== null ? .9 : 1;
    if (ratio < threshold * urgency / agg) continue;
    let value = Math.min(ratio, 6);
    const ct = G.get('castle', t);
    if (t === 'meridian') value *= sim.castlesOf(realm).some(c => G.get('castle', c).tier === 'satellite') ? 1.5 : .6;
    if (owner === 'dominion') value *= 1 + CA.hourFocus(sim, realm);
    if (ct.tier === 'capital') value *= 1.3;
    if (owner === 'brigands' && sim.year === 1) value *= pers.brigandsFirst ? 2 : 1.2;
    if (pers.weakest && owner !== 'brigands') value *= 1 + 1 / Math.max(1, sim.castlesOf(owner).length);
    targets.push({ t, value, avail });
  }
  targets.sort((a, b) => b.value - a.value || (a.t < b.t ? -1 : 1));
  for (const tg of targets) {
    const ks = tg.avail.filter(k => !used.has(k) && !neededAtHome(k)).slice(0, 3);
    if (!ks.length) continue;
    const def = CA.defense(sim, tg.t), pw = G.sum(ks, k => sim.troopPower(k)), urg = s.castles[tg.t].owner === 'dominion' && CA.hourFocus(sim, realm) >= 3 ? .8 : s.castles[tg.t].owner === 'dominion' && s.candle !== null ? .9 : 1;
    if (def > 0 && pw / def < threshold * urg / agg) continue;
    const ev = sim.apply({ t: 'declare', realm, target: tg.t, knights: ks, ai: true });
    if (ev[0] && ev[0].e !== 'illegal') ks.forEach(k => used.add(k));
  }
};

/** autoplay a whole season for every realm (human realms too): Muster, March, battles delegated. Returns events */
CA.playSeason = (sim, o = {}) => {
  const s = sim.s, out = [];
  if (s.result) return out;
  const t = sim.beginSeason(); out.push(...t.cards);
  for (const e of t.events.concat(sim.takeStory())) out.push(...sim.apply({ t: 'event', id: e.id, realm: e.realm, choice: o.choice ? o.choice(e) : 0 }));
  if (s.result) return out;
  for (const h of s.humans) if (s.realms[h].alive) { CA.muster(sim, h); }
  while (s.phase === 'muster') sim.apply({ t: 'endMuster', realm: sim.currentHuman() });
  for (const h of s.humans) if (s.realms[h].alive) CA.march(sim, h);
  while (s.phase === 'march') sim.apply({ t: 'endMarch', realm: sim.currentHuman() });
  let guard = 0;
  while (guard++ < 40 && !s.result) {
    const p = sim.nextBattle(); if (!p) break;
    if (p.kind === 'open') { out.push(...sim.takeOpen()); }
    else { const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); out.push(...sim.applyBattle(b.result())); }
    for (const e of sim.takeStory()) out.push(...sim.apply({ t: 'event', id: e.id, realm: e.realm, choice: o.choice ? o.choice(e) : 0 }));
    if (s.result) break;
  }
  if (!s.result) out.push(...sim.endSeason());
  return out;
};

}

// ===== src/30-art-palette.js =====
{
// PALETTES AND GROUND TEXTURES: realm and season palettes, and the per-pixel ground of every terrain code by season
// and region (the battlefield and the continent bake their floors from these through a TileMap's floorTex).

const hexc = E.hex, noise = E.noise2;
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
G.mixc = mixc; G.mulc = mul;

G.PAL = {
  spring: { grass: '#6abf4b', grass2: '#9ad86a', dark: '#3e8a3a', blossom: '#f4b8d0', sky: ['#7ac0f0', '#a8d8f0', '#e8f4ff'], water: '#4a9ad8', ambient: .8, light: '#e8ffe8', tree: '#f4b8d0 foliage' },
  summer: { grass: '#c8b060', grass2: '#e8d080', dark: '#9a8040', blossom: '#ffd040', sky: ['#f0b860', '#f0d890', '#fff4d0'], water: '#3a8ac8', ambient: .95, light: '#fff0c8', tree: '#5a9a3a foliage' },
  autumn: { grass: '#b8883a', grass2: '#d8a050', dark: '#7a5020', blossom: '#e05a2a', sky: ['#c8784a', '#e8b878', '#f8e0b8'], water: '#3a7aa8', ambient: .7, light: '#ffd8a0', tree: '#d8782a foliage' },
  winter: { grass: '#a8b8a0', grass2: '#e8f0f8', dark: '#8aa8c8', blossom: '#ffffff', sky: ['#7a90b8', '#b8c8e0', '#e8f0f8'], water: '#3a6a98', ambient: .65, light: '#c8dcff', tree: '#e8f0f8 foliage' },
  hour: { grass: '#5a5a66', grass2: '#7a7a86', dark: '#3a3a46', blossom: '#d8c070', sky: ['#14121c', '#2a2836', '#4a4656'], water: '#2a3a5a', ambient: .45, light: '#ffe0a0', tree: '#4a4a56 foliage' }
};
/** region ground colours (the land's own look, before the season tints it) */
G.REGION = {
  spring: { base: '#5aae46', dark: '#3e8a3a', light: '#8ad06a', road: '#a88a5a', rock: '#8a8a7a', trees: 'tree' },
  summer: { base: '#c8a85a', dark: '#a8803a', light: '#e8c878', road: '#d8b878', rock: '#c84a2a', trees: 'palm' },
  autumn: { base: '#a8883a', dark: '#7a5a28', light: '#c8a050', road: '#8a6a40', rock: '#7a6a5a', trees: 'tree' },
  winter: { base: '#8aa098', dark: '#5a7a70', light: '#b8c8c0', road: '#9a9a90', rock: '#8a90a0', trees: 'pine' },
  hour: { base: '#5a5a66', dark: '#3a3a46', light: '#8a8a96', road: '#7a7a86', rock: '#4a4a56', trees: 'crystal' },
  neutral: { base: '#7a9a5a', dark: '#5a7a40', light: '#9ab878', road: '#a08860', rock: '#8a8478', trees: 'tree' }
};
G.regionKey = region => (G.CROSS[region] ? G.CROSS[region][0] : G.REGION[region] ? region : 'neutral');

/** the ground colour [r, g, b] of a terrain code at world point (x, y), in a season and region; e = the hex's edge
 *  distance (0 at the edge), hc = the hex's own random 0..1 */
G.groundColor = (code, x, y, season, region, e = 10, hc = .5) => {
  const R = G.REGION[G.regionKey(region)], P = G.PAL[season] || G.PAL.spring;
  const n = noise(x * .08, y * .08) * .6 + noise(x * .25, y * .25) * .4, sp = h2(Math.floor(x), Math.floor(y));
  const grassy = () => {
    let base = hexc(R.base), dk = hexc(R.dark), lt = hexc(R.light);
    const tint = hexc(P.grass), k = region === 'hour' ? .15 : .45;
    base = mixc(base, tint, k); dk = mixc(dk, hexc(P.dark), k); lt = mixc(lt, hexc(P.grass2), k);
    let c = n > .64 ? dk : n < .32 ? lt : base;
    if (sp > .985) c = hexc(season === 'spring' ? P.blossom : season === 'autumn' ? '#e07a2a' : season === 'summer' ? '#f0e090' : '#ffffff');
    return c;
  };
  switch (code) {
    case '.': case '?': return grassy();
    case ',': { const c = hexc(R.road); return mul(c, n > .6 ? .88 : n < .3 ? 1.08 : 1); }
    case 'f': { const c = mul(grassy(), .72); return sp > .92 ? hexc(season === 'autumn' ? '#c85a1e' : season === 'spring' ? '#f4b8d0' : '#3a5a2a') : c; }
    case 'h': { const c = grassy(), k = e < 4 ? .8 : 1 + Math.min(.12, e / 120); return mul(c, k); }
    case 'm': { const c = hexc(R.rock), k = n > .6 ? .78 : n < .3 ? 1.15 : .95; return mul(c, k * (e < 3 ? .8 : 1)); }
    case '~': { const c = hexc('#5aa8d8'); return mul(mixc(c, hexc(P.water), .4), n > .55 ? 1.1 : .95); }
    case 'w': case 'L': { const c = hexc(P.water); const w = Math.sin(x * .3 + Math.sin(y * .2) * 2 + y * .05); return w > .92 ? mixc(c, [220, 240, 255], .5) : mul(c, n > .5 ? 1 : .85); }
    case 's': { const c = hexc('#5a6a3a'); return sp > .8 ? hexc('#3a4a3a') : mul(c, n > .55 ? .85 : 1.05); }
    case 'F': case 'W': { const row = Math.floor(y / 3) % 2; const c = hexc(code === 'W' ? '#e0c050' : season === 'spring' ? '#7ac050' : '#c8b050'); return mul(c, row ? .88 : 1.05); }
    case 't': { const c = hexc('#b89050'); return sp > .9 ? hexc('#e8c070') : mul(c, n > .5 ? .9 : 1); }
    case 'r': case '#': { return E.tex.flagstone(x, y, { stones: ['#7a7a72', '#8a8a80', '#6a6a62'].map(hexc), mortar: hexc('#3a3a36'), hi: hexc('#9a9a90'), lo: hexc('#4a4a44'), speck: hexc('#5a5a52') }, 9).map((v, i) => sp > .97 ? [90, 110, 60][i] : v); }
    case 'g': case 'K': { const pal = region === 'hour' ? { stones: ['#5a5a66', '#6a6a76', '#4e4e5a'].map(hexc), mortar: hexc('#2a2a36'), hi: hexc('#8a8a96'), lo: hexc('#3a3a46'), speck: hexc('#d8c070') } : { stones: ['#9a9488', '#a8a294', '#8a8478'].map(hexc), mortar: hexc('#4a4640'), hi: hexc('#c8c2b4'), lo: hexc('#6a6458'), speck: hexc('#7a746a') }; return E.tex.flagstone(x, y, pal, 10); }
    case 'b': { return E.tex.planks(y, x, { base: '#9d6a3f', dark: '#7a4a28', line: '#4a2e1c' }); }
    case 'D': { const lit = false; return mul(hexc('#b89a50'), e < 4 ? .7 : 1); }
    case 'n': { const c = hexc('#e8f0f8'), sh = hexc('#a8c0d8'); return n > .66 ? sh : n < .3 ? [255, 255, 255] : c; }
    case 'i': { const c = hexc('#a8e0f0'); const crack = Math.abs(Math.sin(x * .21 + y * .13) * Math.cos(x * .07 - y * .19)) < .03; return crack ? hexc('#e8fcff') : mul(c, n > .6 ? .9 : 1.05); }
    case 'B': { return sp > .9 ? hexc('#ff8a20') : sp > .8 ? hexc('#c83a10') : mul(hexc('#3a2a20'), n > .5 ? 1 : .8); }
    case 'a': { return mul(hexc('#6a6662'), n > .55 ? .85 : 1.05); }
    case 'd': { const crack = Math.abs(Math.sin(x * .4) + Math.sin(y * .37)) < .08; return crack ? hexc('#5a4030') : mul(hexc('#a08060'), n > .5 ? .92 : 1.04); }
  }
  return grassy();
};
/** the lighting ambient of a battle by season (Hour places are dark: brass lamps and the clock light them) */
G.ambientFor = (season, region) => (region === 'hour' ? G.PAL.hour.ambient : (G.PAL[season] || G.PAL.spring).ambient);
/** the weather of a season (Reduce motion halves it) */
G.weatherFor = (season, reduce) => {
  const k = reduce ? .5 : 1;
  switch (season) {
    case 'spring': return { kind: 'petals', amount: .35 * k, wind: .15 };
    case 'summer': return { kind: 'sand', amount: .1 * k, wind: .2 };
    case 'autumn': return { kind: 'leaves', amount: .5 * k, wind: .4 };
    case 'winter': return { kind: 'snow', amount: .6 * k, wind: .1 };
  }
  return null;
};

}

// ===== src/31-art-hexfield.js =====
{
// THE BATTLEFIELD: a wall-less TileMap whose floorTex bakes the hex field (each pixel finds its hex by cube rounding,
// colours it by terrain, season and region, and darkens the hex edges by the Grid lines setting), terrain props placed
// by a seeded stream per hex, raised blocks as shapes (they sort like props, so units behind them get x-ray), and the
// hex decals each frame. World = hex coordinates + OFF (a margin of two tiles all round).

const HF = G.hex, OFF = 32, HT = HF.T, AP = HT / 2;
const NRM = [[1, 0], [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)], [Math.cos(2 * Math.PI / 3), Math.sin(2 * Math.PI / 3)]];

class Field {
  /** sim: a BattleSim; o: { region, owner (realm id of the Keep's owner), style (map dressing) } */
  constructor(sim, o = {}) {
    this.sim = sim; this.region = o.region || 'neutral'; this.owner = o.owner || null; this.mapDef = G.get('map', sim.s.map);
    const s = sim.s; this.w = s.w; this.h = s.h;
    this.W = (s.w + .5) * HT + OFF * 2; this.H = ((s.h - 1) * .866 + 1.155) * HT + OFF * 2;
    const tw = Math.ceil(this.W / 16), th = Math.ceil(this.H / 16);
    this.map = new E.TileMap({ w: tw, h: th, floorTex: (x, y) => this.tex(x, y), outside: undefined, ao: 0 });
    this.sig = ''; this.grid = 'Subtle'; this.lit = {};
    this.rebuild();
  }
  center(c) { const p = HF.center(c); return [p[0] + OFF, p[1] + OFF]; }
  cellAt(x, y) { return HF.toCell(x - OFF, y - OFF); }
  inside(c) { return HF.inside(c, this.w, this.h); }
  code(c) { return this.sim.s.cells[c[1] * this.w + c[0]]; }
  /** the ground at world point (x, y) */
  tex(x, y) {
    const s = this.sim.s, hx = x - OFF, hy = y - OFF, c = HF.toCell(hx, hy);
    if (!this.inside(c)) { const k = G.groundColor('.', x, y, s.season, this.region, 10, .5); return G.mulc(k, .78); }
    const code = s.cells[c[1] * this.w + c[0]], [cx, cy] = HF.center(c), dx = hx - cx, dy = hy - cy;
    let m = 0; for (const n of NRM) m = Math.max(m, Math.abs(n[0] * dx + n[1] * dy));
    const e = AP - m;
    let col = G.groundColor(code, x, y, s.season, this.region, e, .5);
    if (code === 'K') { const r = Math.hypot(dx, dy); if (r > 8 && r < 10) col = G.mulc(col, .7); }
    if (code === 'D') { const r = Math.hypot(dx, dy); if (r < 9) col = this.lit[c[0] + ',' + c[1]] ? E.hex(r < 3 ? '#fff8d0' : '#ffd060') : E.hex(r < 3 ? '#8a7a50' : r < 6 ? '#b89a50' : '#6a5a3a'); }
    const edge = this.grid === 'Bold' ? .82 : this.grid === 'Off' ? 1 : .92;
    if (e < .9 && edge < 1) col = G.mulc(col, edge);
    return col;
  }
  /** rebuild after the season or terrain changed (fire, ash, the wheel turning) */
  rebuild(force) {
    const s = this.sim.s, grid = (G.game && G.game.settings && G.game.settings.grid) || 'Subtle';
    const lit = s.dials.filter(d => d.lit).map(d => d.c.join(',')).join(';');
    const sig = s.season + '|' + s.cells.join('') + '|' + grid + '|' + lit;
    if (sig === this.sig && !force) return false;
    this.sig = sig; this.grid = grid; this.lit = {}; for (const d of s.dials) if (d.lit) this.lit[d.c.join(',')] = true;
    this.map.floors = {};
    // water: tag the square cells under water hexes so the engine's shimmer plays
    for (let ty = 0; ty < this.map.h; ty++) for (let tx = 0; tx < this.map.w; tx++) {
      const c = this.cellAt(tx * 16 + 8, ty * 16 + 8), code = this.inside(c) ? this.code(c) : null;
      this.map.setFloor(tx, ty, code === 'w' || code === 'L' || code === '~' ? 'water' : null, false);
    }
    this.props = this._props();
    return true;
  }
  _props() {
    const s = this.sim.s, out = [], region = this.region, season = s.season, P = G.PAL[season] || G.PAL.spring, rk = G.regionKey(region);
    const block = this.mapDef.blockShape, hour = region === 'hour';
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = [x, y], code = this.code(c), [wx, wy] = this.center(c), rnd = G.cosmetic(x * 131 + y * 977 + 7);
      const at = (k = 7) => [wx + (rnd() - .5) * k * 2, wy + (rnd() - .5) * k * 1.6];
      switch (code) {
        case 'f': {
          const n = 2 + (rnd() > .5 ? 1 : 0);
          for (let i = 0; i < n; i++) {
            const [px0, py0] = at(8), h = 22 + rnd() * 12;
            if (hour) out.push({ shape: 'tree', x: px0, y: py0, params: { h: h * .8, seed: x * 3 + y + i }, mats: { l: '#4a4a56 foliage', b: '#2a2a36 bark' } });
            else if (rk === 'winter' || (season === 'winter' && rnd() > .5)) out.push({ shape: 'pine', x: px0, y: py0, params: { h: h + 6, tiers: 4 }, mats: season === 'winter' ? { l: '#d8e8f0 foliage' } : undefined });
            else if (rk === 'summer' && rnd() > .45) out.push({ prop: 'palm', x: px0, y: py0, size: 1.2 });
            else out.push({ shape: 'tree', x: px0, y: py0, params: { h, seed: x * 7 + y * 3 + i }, mats: { l: season === 'spring' && rnd() > .3 ? '#f4b8d0 foliage' : season === 'autumn' ? (rnd() > .5 ? '#d8782a foliage' : '#c84a1e foliage') : season === 'winter' ? '#e8f0f8 foliage' : (rk === 'summer' ? '#6a9a3a foliage' : undefined) } });
          }
          break;
        }
        case 'B': out.push({ fire: true, x: wx, y: wy }); out.push({ shape: 'tree', x: wx, y: wy, params: { h: 18, seed: x + y }, mats: { l: '#3a2a20 foliage', b: '#1a1410 bark' } }); break;
        case 'a': out.push({ shape: 'rock', x: wx + 4, y: wy, params: { r: 2.5, seed: x + y }, mats: { s: '#4a4642 rock' } }); break;
        case 'h': { const n = rnd() > .4 ? 2 : 1; for (let i = 0; i < n; i++) { const [a, b] = at(8); out.push({ shape: 'rock', x: a, y: b, params: { r: 2.5 + rnd() * 2.5, seed: x * 5 + y + i } }); } break; }
        case 'm': out.push(block === 'cliff' || rnd() > .5 ? { shape: 'cliff', x: wx, y: wy, mats: { s: rk === 'summer' ? '#b8582a rock' : rk === 'winter' ? '#8a90a0 rock' : undefined }, snow: season === 'winter' } : { shape: 'rock', x: wx, y: wy, params: { r: 11 + rnd() * 4, seed: x * 11 + y } }); if (hour && rnd() > .5) out.push({ shape: 'crystal', x: wx + 5, y: wy + 3, params: { h: 14, seed: x } }); break;
        case 's': for (let i = 0; i < 2; i++) { const [a, b] = at(8); out.push({ shape: 'grass', x: a, y: b, params: { h: 7, n: 7 }, mats: { g: '#5a7a3a grass' } }); } break;
        case 'd': { const [a, b] = at(6); out.push({ shape: 'grass', x: a, y: b, params: { h: 4, n: 4 }, mats: { g: '#a8884a grass' } }); break; }
        case 'r': out.push({ shape: 'brokenpillar', x: wx + (rnd() - .5) * 6, y: wy + (rnd() - .5) * 4 }); break;
        case 'F': case 'W': if (season !== 'winter') for (let i = 0; i < 3; i++) { const [a, b] = at(8); out.push({ shape: 'grass', x: a, y: b, params: { h: code === 'W' ? 10 : 5, n: 6 }, mats: { g: code === 'W' || season === 'summer' ? '#e0c050 grass' : '#7ab050 grass' } }); } break;
        case 't': if (rnd() > .5) out.push({ shape: 'haybale', x: wx, y: wy }); break;
        case 'b': out.push({ shape: 'bridge', x: wx, y: wy, facing: Math.PI / 2, flat: true }); break;
        case 'K': out.push({ shape: hour ? 'keep-hour' : 'keep', x: wx, y: wy - 1, keep: true }); break;
        case 'D': out.push({ shape: 'dial', x: wx, y: wy, dial: c }); break;
        case '#': out.push(block === 'cottage' ? { shape: 'cottage', x: wx, y: wy, facing: rnd() > .5 ? Math.PI / 2 : 0 } : block === 'gear' ? { shape: 'gear', x: wx, y: wy } : block === 'cliff' ? { shape: 'cliff', x: wx, y: wy } : { shape: season === 'winter' || rk === 'winter' ? 'hexblock-ice' : 'hexblock', x: wx, y: wy }); break;
        case '.': if (rnd() > .93) { const [a, b] = at(7); out.push(season === 'winter' ? { shape: 'rock', x: a, y: b, params: { r: 2, seed: x }, mats: { s: '#e8f0f8 rock' } } : rk === 'summer' && rnd() > .5 ? { prop: 'cactus', x: a, y: b, size: .8 } : { shape: 'bush', x: a, y: b, params: { r: 4 }, mats: season === 'autumn' ? { l: '#c8782a foliage' } : undefined }); } break;
        case 'n': if (rnd() > .9) { const [a, b] = at(7); out.push({ shape: 'pine', x: a, y: b, params: { h: 20, tiers: 3 }, mats: { l: '#d8e8f0 foliage' } }); } break;
        case 'g': if (rnd() > .94 && !hour) { const [a, b] = at(6); out.push({ prop: 'barrel', x: a, y: b, size: 1 }); } else if (rnd() > .9 && hour) { const [a, b] = at(6); out.push({ prop: 'lamp', x: a, y: b, size: 1, light: true }); } break;
      }
    }
    return out;
  }
  /** draw the floor, then queue props and lights */
  draw(r, t) {
    this.map.drawFloor(r);
    const s = this.sim.s, L = G.game.lights;
    for (const p of this.props) {
      if (!r.visible(p.x, p.y, 0, 80, 80, 40)) continue;
      if (p.fire) { r.queue(p.x, p.y, 1, g => { const q = r.w(p.x, p.y, 2); for (let i = 0; i < 3; i++) { const ph = t * 9 + i * 2 + p.x; E.px.poly(g, [[q[0] - 4 + i * 3, q[1]], [q[0] - 2 + i * 3 + Math.sin(ph) * 1.5, q[1] - 8 - Math.sin(ph * 1.3) * 3], [q[0] + i * 3, q[1]]], ['#ff5010', '#ff9a20', '#ffe060'][i]); } }, { emissive: true }); L.add(p.x, p.y, 8, 40, .8, { color: '#ff8a30' }); continue; }
      if (p.prop) { r.prop(p.prop, p.x, p.y, 0, { size: p.size || 1, light: p.light }); continue; }
      if (p.keep) {
        r.shape(p.shape, p.x, p.y, 0, {});
        L.add(p.x - 10, p.y + 8, 14, 50, .8, { color: '#ffb050' }); L.add(p.x + 10, p.y + 8, 14, 50, .8, { color: '#ffb050' });
        r.prop('torch', p.x - 11, p.y + 9, 0, { size: .9 }); r.prop('torch', p.x + 11, p.y + 9, 0, { size: .9 });
        continue;
      }
      if (p.dial) { const lit = this.lit[p.dial.join(',')]; if (lit) { L.add(p.x, p.y, 6, 46, 1, { color: '#ffd060' }); r.queue(p.x, p.y, 1, g => { const q = r.w(p.x, p.y, 2); r.glowDisc(g, q[0], q[1], 10, '#ffd060', .6); }, { emissive: true }); } continue; }
      r.shape(p.shape, p.x, p.y, 0, { params: p.params, mats: p.mats, facing: p.facing, shadow: !p.flat });
      if (p.snow) r.queue(p.x, p.y, 0, g => { const q = r.w(p.x, p.y, 18); E.px.ell(g, q[0], q[1], 6, 2, '#f0f8ff'); }, { bias: 1 });
    }
  }
  /** hex outline points on screen (k: inset scale) */
  hexPts(r, c, k = .94, z = 0) { return HF.corners(c, k).map(([x, y]) => r.w(x + OFF, y + OFF, z)); }
  fill(r, cells, color, alpha) {
    if (!cells || !cells.length) return;
    r.decal(g => { for (const c of cells) E.px.polyDither(g, this.hexPts(r, c, .9), color, alpha, r.ix, r.iy); });
  }
  outline(r, c, color, k = .96, z = 0) { const p = this.hexPts(r, c, k, z); r.decal(g => { for (let i = 0; i < 6; i++) { const a = p[i], b = p[(i + 1) % 6]; E.px.line(g, a[0], a[1], b[0], b[1], color, 1); } }); }
  /** a dashed outline round a set of hexes (a Ward) */
  border(r, cells, color, alpha = 1, dash = true) {
    const set = new Set(cells.map(c => c[0] + ',' + c[1]));
    r.decal(g => {
      for (const c of cells) {
        const p = this.hexPts(r, c, 1);
        for (let d = 0; d < 6; d++) {
          const n = HF.step(c, d); if (set.has(n[0] + ',' + n[1])) continue;
          // the edge facing direction d lies between corners d and d+1 (corner i is at -90 + 60 i degrees; direction d at 60 d)
          const a = p[(d + 1) % 6], b = p[(d + 2) % 6], steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
          for (let i = 0; i <= steps; i++) { if (dash && ((i >> 1) & 1)) continue; E.px.dot(g, Math.round(a[0] + (b[0] - a[0]) * i / steps), Math.round(a[1] + (b[1] - a[1]) * i / steps), color); }
        }
      }
    });
  }
  /** white chevrons along a path */
  path(r, path, t) {
    if (!path || path.length < 2) return;
    r.decal(g => {
      for (let i = 1; i < path.length; i++) {
        const a = this.center(path[i - 1]), b = this.center(path[i]), pa = r.w(a[0], a[1], 0), pb = r.w(b[0], b[1], 0);
        const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2, ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), k = ((t * 3 + i * .3) % 1) > .5 ? '#ffffff' : '#e8f0ff';
        const f = [Math.cos(ang), Math.sin(ang)], sd = [-f[1], f[0]];
        E.px.poly(g, [[mx + f[0] * 3, my + f[1] * 3], [mx - f[0] * 2 + sd[0] * 3, my - f[1] * 2 + sd[1] * 3], [mx - f[0] * 1, my - f[1] * 1], [mx - f[0] * 2 - sd[0] * 3, my - f[1] * 2 - sd[1] * 3]], k);
      }
      const e = this.center(path[path.length - 1]), pe = r.w(e[0], e[1], 0); E.px.disc(g, pe[0], pe[1], 2, '#ffffff');
    });
  }
  /** the cursor: a pulsing white-and-gold outline */
  cursor(r, c, t, color) {
    if (!c || !this.inside(c)) return;
    const k = .5 + .5 * Math.sin(t * 7), p = this.hexPts(r, c, 1 - k * .06);
    r.decal(g => { for (let i = 0; i < 6; i++) { const a = p[i], b = p[(i + 1) % 6]; E.px.line(g, a[0], a[1], b[0], b[1], color || (k > .5 ? '#ffffff' : '#ffe070'), 1); } });
  }
  /** a hatch over hexes (the danger overlay) */
  hatch(r, cells, color) {
    r.decal(g => { for (const c of cells) { const p = this.hexPts(r, c, .85), xs = p.map(q => q[0]), ys = p.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); for (let x = x0; x < x1; x += 3) { const cx2 = x + 3; E.px.line(g, x, y1, Math.min(x1, cx2 + (y1 - y0) * .3), y0, color, 1); } } });
  }
  bounds(view) { return this.map.bounds(view); }
}
G.Field = Field;
G.FIELD_OFF = OFF;

}

// ===== src/32-art-worldmap.js =====
{
// THE CONTINENT OF FORSEASON: a 64 x 64-tile TileMap (1024 x 1024 world units) in the threequarter view. Its floorTex
// reads a raster baked once at boot (4 units a cell): land and coast, the season sectors (north Winter, east Spring,
// south Summer, west Autumn, blended on the cross-quarter diagonals), sub-terrain by noise, the Hour plateau, four
// rivers, the 36 roads, and each castle's Voronoi cell for the owner's dithered tint. Re-baked when ownership or the
// season changes. Props: trees per region, mesas and the Rimewall, watermills, cottages, shrines and Meridian's clock.

const WN = E.noise2, WS = 4, WG = 256, CEN = 512;
const SECT = ['spring', 'summer', 'autumn', 'winter'];   // east, south, west, north (angles 0, 90, 180, 270)
class WorldMap {
  constructor() {
    this.map = new E.TileMap({ w: 64, h: 64, floorTex: (x, y) => this.tex(x, y), outside: '#1a3a6a', ao: 0 });
    this.castles = G.all('castle');
    this.raster(); this.season = 'spring'; this.owners = {}; this.sig = '';
    this.props = this._props();
  }
  /** angle in degrees 0..360 (0 east, 90 south) */
  static ang(x, y) { let a = Math.atan2(y - CEN, x - CEN) * 180 / Math.PI; if (a < 0) a += 360; return a; }
  /** the season sector weights at an angle: [primary, secondary, blend] */
  static sector(a) {
    const i = Math.round(a / 90) % 4, base = i * 90; let d = a - base; if (d > 180) d -= 360; if (d < -180) d += 360;
    const prim = SECT[i], other = SECT[(i + (d > 0 ? 1 : 3)) % 4], edge = Math.abs(d), blend = edge > 33 ? (edge - 33) / 24 : 0;
    return [prim, other, Math.min(.5, blend * .5)];
  }
  raster() {
    const N = WG, kind = new Uint8Array(N * N), cell = new Uint8Array(N * N), road = new Uint8Array(N * N), river = new Uint8Array(N * N);
    const coast = a => 470 + (WN(Math.cos(a / 57.3) * 2 + 9, Math.sin(a / 57.3) * 2 + 4) - .5) * 60;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = i * WS + 2, y = j * WS + 2, d = Math.hypot(x - CEN, y - CEN), a = WorldMap.ang(x, y), c = coast(a);
      const k = j * N + i;
      kind[k] = d > c + 6 ? 0 : d > c - 8 ? 1 : d < 170 ? 2 : 3;   // 0 sea, 1 beach, 2 hour plateau, 3 land
      let best = 0, bd = Infinity; this.castles.forEach((cs, ci) => { const dd = Math.hypot(cs.pos[0] - x, cs.pos[1] - y); if (dd < bd) { bd = dd; best = ci; } }); cell[k] = best;
    }
    // rivers: from the Rimewall and the plateau's edge to the sea
    const rivers = [[[470, 180], [430, 120], [380, 70], [330, 40]], [[650, 420], [760, 430], [860, 400], [990, 380]], [[560, 680], [600, 790], [650, 880], [700, 1000]], [[380, 600], [270, 620], [150, 640], [30, 680]]];
    this.riverPaths = rivers.map(pts => new E.Path(pts.map(p => [p[0], p[1], 0]), { smooth: 'catmull' }));
    for (const p of this.riverPaths) for (let s = 0; s <= p.length; s += 2) { const q = p.at(s), w = 4 + s / p.length * 5; this._stamp(river, q.x, q.y, w); }
    // roads: gently wavy, 5 units wide
    this.roadPaths = G.ROADS.map(([a, b]) => {
      const A = G.get('castle', a).pos, B = G.get('castle', b).pos, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, nx = -(B[1] - A[1]), ny = B[0] - A[0], l = Math.hypot(nx, ny) || 1, w = (G.hashStr(a + b) % 21 - 10) * 1.5;
      return new E.Path([[A[0], A[1], 0], [mx + nx / l * w, my + ny / l * w, 0], [B[0], B[1], 0]], { smooth: 'catmull' });
    });
    for (const p of this.roadPaths) for (let s = 0; s <= p.length; s += 2) { const q = p.at(s); this._stamp(road, q.x, q.y, 3); }
    Object.assign(this, { kind, cell, road, river });
  }
  _stamp(arr, x, y, r) { const i0 = Math.floor((x - r) / WS), i1 = Math.floor((x + r) / WS), j0 = Math.floor((y - r) / WS), j1 = Math.floor((y + r) / WS); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (i >= 0 && j >= 0 && i < WG && j < WG && Math.hypot(i * WS + 2 - x, j * WS + 2 - y) <= r) arr[j * WG + i] = 1; }
  at(arr, x, y) { const i = Math.floor(x / WS), j = Math.floor(y / WS); return i < 0 || j < 0 || i >= WG || j >= WG ? 0 : arr[j * WG + i]; }
  /** the ground at a world point */
  tex(x, y) {
    const k = this.at(this.kind, x, y), n = WN(x * .03, y * .03) * .6 + WN(x * .11, y * .11) * .4, sp = WN(x * .9, y * .9);
    const sea = () => { const w = Math.sin(x * .12 + Math.sin(y * .07) * 2); return E.hex(w > .95 ? '#6aa8e0' : n > .5 ? '#1e4a8a' : '#24589a'); };
    if (k === 0) return sea();
    if (k === 1) return E.hex(this.season === 'winter' ? '#e0e8f0' : sp > .7 ? '#c8b080' : '#e0c890');
    if (this.at(this.river, x, y)) return E.hex(this.season === 'winter' ? (sp > .6 ? '#e8fcff' : '#a8e0f0') : sp > .75 ? '#6ab0e8' : '#3a7ac0');
    if (this.at(this.road, x, y)) return E.hex(k === 2 ? (sp > .6 ? '#9a9aa6' : '#7a7a86') : this.season === 'winter' ? '#c8c0b8' : sp > .6 ? '#c8a878' : '#a88a5a');
    let col;
    if (k === 2) col = E.tex.flagstone(x, y, { stones: ['#5a5a66', '#6a6a76', '#4e4e5a'].map(E.hex), mortar: E.hex('#2a2a36'), hi: E.hex('#8a8a96'), lo: E.hex('#3a3a46'), speck: E.hex('#d8c070') }, 12);
    else {
      const a = WorldMap.ang(x, y), [p1, p2, bl] = WorldMap.sector(a);
      const c1 = this._land(p1, x, y, n, sp), c2 = bl > 0 ? this._land(p2, x, y, n, sp) : c1;
      col = bl > 0 ? (WN(x * .2, y * .2) < bl ? c2 : c1) : c1;
    }
    // ownership: a dithered tint of the owner's colour over each castle's cell
    const ci = this.at(this.cell, x, y), owner = this.owners[this.castles[ci].id];
    if (owner && owner !== 'brigands' && ((Math.floor(x / 2) + Math.floor(y / 2)) & 1)) col = G.mixc(col, E.hex(G.get('realm', owner).color), owner === 'dominion' ? .18 : .22);
    // the season's overlay
    const s = this.season;
    if (s === 'winter' && k === 3) { const south = (y - CEN) / 470; if (sp > .35 + south * .45) col = G.mixc(col, [240, 246, 255], .75); }
    if (s === 'spring' && sp > .93) col = E.hex('#f4b8d0');
    if (s === 'autumn' && sp > .9) col = E.hex(sp > .95 ? '#e07a1e' : '#c84a1a');
    if (s === 'summer') col = G.mixc(col, [255, 220, 140], .06);
    return col;
  }
  _land(sector, x, y, n, sp) {
    switch (sector) {
      case 'winter': return E.hex(n > .68 ? '#3a6a5a' : n < .25 ? (sp > .5 ? '#a8d8f0' : '#90c8e8') : n > .55 ? '#8a9a98' : sp > .7 ? '#c8d8e0' : '#a8b8b8');
      case 'spring': return E.hex(n > .66 ? '#3e8a3a' : n < .28 ? '#7ac85a' : sp > .8 ? '#9ad86a' : '#5aae46');
      case 'summer': return E.hex(n > .7 ? '#c84a2a' : n < .3 ? '#e8d090' : sp > .75 ? '#d8b860' : '#c8a85a');
      case 'autumn': { const strip = Math.floor((x * .7 + y * .3) / 14) % 3; return E.hex(n > .68 ? '#6a4a20' : n < .28 ? '#5a6a3a' : strip === 0 ? '#c8902a' : strip === 1 ? '#a8783a' : '#b8883a'); }
    }
    return E.hex('#7a9a5a');
  }
  /** re-bake when owners or the season changed */
  update(sim, season) {
    const own = {}; for (const id of Object.keys(sim.s.castles)) own[id] = sim.s.castles[id].owner;
    const sig = season + JSON.stringify(own);
    if (sig === this.sig) return false;
    const seasonChanged = season !== this.season;
    this.sig = sig; this.owners = own; this.season = season; this.map.floors = {};
    if (seasonChanged) this.props = this._props();
    // water tags for the shimmer
    for (let ty = 0; ty < 64; ty++) for (let tx = 0; tx < 64; tx++) { const k = this.at(this.kind, tx * 16 + 8, ty * 16 + 8); this.map.setFloor(tx, ty, k === 0 ? 'water' : null, false); }
    return true;
  }
  _props() {
    const out = [], rnd = G.cosmetic(77), s = this.season;
    for (let i = 0; i < 900; i++) {
      const x = 40 + rnd() * 944, y = 40 + rnd() * 944, k = this.at(this.kind, x, y); if (k !== 3) continue;
      if (this.at(this.road, x, y) || this.at(this.river, x, y)) continue;
      if (this.castles.some(c => Math.hypot(c.pos[0] - x, c.pos[1] - y) < 34)) continue;
      const n = WN(x * .03, y * .03) * .6 + WN(x * .11, y * .11) * .4, [sec] = WorldMap.sector(WorldMap.ang(x, y));
      if (sec === 'winter') { if (n > .55) out.push({ shape: 'pine', x, y, params: { h: 24 + rnd() * 14, tiers: 4 }, mats: s === 'winter' || rnd() > .6 ? { l: '#d8e8f0 foliage' } : undefined }); else if (n < .2 && rnd() > .5) out.push({ shape: 'rock', x, y, params: { r: 6 + rnd() * 8, seed: i }, mats: { s: '#8a90a0 rock' } }); }
      else if (sec === 'spring') { if (n > .5) out.push({ shape: 'tree', x, y, params: { h: 22 + rnd() * 12, seed: i }, mats: { l: s === 'spring' && rnd() > .3 ? '#f4b8d0 foliage' : s === 'autumn' ? '#d8782a foliage' : s === 'winter' ? '#e8f0f8 foliage' : undefined } }); }
      else if (sec === 'summer') { if (n > .68) out.push({ shape: 'rock', x, y, params: { r: 8 + rnd() * 9, seed: i }, mats: { s: '#c84a2a rock' } }); else if (n > .45 && rnd() > .5) out.push({ prop: rnd() > .5 ? 'palm' : 'cactus', x, y, size: 1.3 }); }
      else if (sec === 'autumn') { if (n > .62) out.push({ shape: 'tree', x, y, params: { h: 24 + rnd() * 10, seed: i }, mats: { l: s === 'winter' ? '#e8f0f8 foliage' : s === 'spring' ? undefined : rnd() > .5 ? '#d8782a foliage' : '#c84a1e foliage' } }); else if (n < .3 && rnd() > .7) out.push({ shape: 'pumpkin', x, y }); }
    }
    // the Rimewall: rocks along the north
    for (let i = 0; i < 30; i++) { const a = (-160 + i * 4.6) * Math.PI / 180, r = 360 + (i % 3) * 18, x = CEN + Math.cos(a) * r, y = CEN + Math.sin(a) * r; if (this.castles.some(c => Math.hypot(c.pos[0] - x, c.pos[1] - y) < 60) || this.at(this.road, x, y)) continue; out.push({ shape: 'rock', x, y, params: { r: 10 + (i % 4) * 3, seed: i }, mats: { s: s === 'winter' ? '#e8f0f8 rock' : '#7a8090 rock' } }); }
    out.push({ shape: 'watermill', x: 860, y: 414, facing: Math.PI / 2 }, { shape: 'watermill', x: 160, y: 634 }, { shape: 'watermill', x: 610, y: 818 });
    for (const [x, y] of [[700, 300], [330, 300], [330, 720], [700, 720]]) out.push({ shape: 'shrine', x, y });
    for (const [x, y] of [[860, 560], [160, 470], [470, 860], [560, 160], [880, 600], [140, 560]]) out.push({ shape: 'cottage', x, y, facing: Math.PI / 2 });
    out.push({ shape: 'clocktower', x: CEN, y: CEN - 34, clock: true });
    return out.sort((a, b) => a.y - b.y);
  }
  draw(r, t) {
    this.map.drawFloor(r);
    for (const p of this.props) {
      if (!r.visible(p.x, p.y, 0, 90, 220, 40)) continue;
      if (p.prop) r.prop(p.prop, p.x, p.y, 0, { size: p.size }); else r.shape(p.shape, p.x, p.y, 0, { params: p.params, mats: p.mats, facing: p.facing });
      if (p.clock) {
        // the working clock face of the Calendar City
        r.queue(p.x, p.y + 13, 58, g => { const q = r.w(p.x, p.y + 13, 58), now = t; E.px.disc(g, q[0], q[1], 7, '#f0e8d8'); E.px.line(g, q[0], q[1], q[0] + Math.cos(now * .6 - 1.57) * 5, q[1] + Math.sin(now * .6 - 1.57) * 5, '#14121c', 1); E.px.line(g, q[0], q[1], q[0] + Math.cos(now * .05) * 3, q[1] + Math.sin(now * .05) * 3, '#c83a2a', 1); }, { bias: 40 });
        G.game.lights.add(p.x, p.y + 10, 60, 90, .8, { color: '#ffe0a0' });
      }
    }
  }
}
G.WorldMap = WorldMap;

}

// ===== src/33-art-units.js =====
{
// THE UNIT VISUAL FACTORY: one Vis per unit, wrapping a Humanoid (knights and humanoid monsters), a Blob (sproutlings,
// lamps, snowkits, minutes, slimes, bats) or an E.Beast, with the species' overlays, carried tools drawn from the rig's
// hands (bows, whips, scythes, clubs), wings, halos and portraits. Each class line has its own moves (no two classes
// share a swing). vis.update(dt, st) with { x, y, z, vx, vy, facing, act: { move, k } | null, pose, expr, hurt, down,
// sleep, tint }; vis.draw(g, ox, oy, view) inside r.actor; vis.portrait(g, x, y, size, o).

const { px: P2, tones: TN, lerp: LRP } = E;
const SIZE_SCALE = { S: .72, M: 1, L: 1.45 };
/** helmets in the look's own plate colour, crowns in gold (a bare 'helmet' or 'crown' takes the engine's default) */
const dressHat = look => {
  const c = look.colors || {};
  if (look.hat === 'helmet') look.hat = { style: 'helmet', color: c.plate || c.metal || '#8a8a96' };
  else if (look.hat === 'crown') look.hat = { style: 'crown', color: c.trim && c.trim !== '#ffffff' ? c.trim : '#e8c040' };
  return look;
};
const FORM_UP = [1, 1.08, 1.18];

/** the move names a unit uses: basic attack and how it reacts */
G.MOVESET = {
  warrior: { basic: 'slash', charge: 'thrust', holystrike: 'overhead', special: 'thrust' },
  ranger: { basic: 'throw', special: 'throw' }, mage: { basic: 'overhead', special: 'cast' }, cleric: { basic: 'rising', special: 'cast' },
  beast: { basic: 'backslash', special: 'backslash' }, springwarden: { basic: 'slash', special: 'rising' }, sunsovereign: { basic: 'twohand', special: 'spin' },
  harvestking: { basic: 'overhead', special: 'cast' }, rimeduke: { basic: 'spin', special: 'spin' }, chancellor: { basic: 'cast', special: 'cast' },
  graynight: { basic: 'plunge', special: 'twohand', alt: 'spin' }, brigand: { basic: 'overhead', special: 'thrust' }, hourmaiden: { basic: 'rising', special: 'cast' },
  monster: { basic: 'claw', special: 'bash' }
};
const BEAST_ANIM = { bite: 'bite', claw: 'claw', gore: 'gore', breath: 'breath', tailsweep: 'tailsweep', roar: 'roar', pounce: 'pounce', dive: 'dive', coil: 'coil', stomp: 'stomp', slash: 'claw', cast: 'roar', throw: 'roar', puff: 'roar', cheer: 'roar', hips: 'roar', wave: 'roar', block: 'roar', thrust: 'gore', overhead: 'claw', spin: 'tailsweep', backslash: 'claw', rising: 'claw', twohand: 'claw', plunge: 'pounce' };

class Vis {
  /** spec: a field unit ({ kind, ref, sp, form, cls, size, elem, ... }) or { knight: id } / { sp, form } */
  constructor(u) {
    this.u = u; this.kind = 'humanoid'; this.t = 0; this.size = u.size || 'M'; this.float = 0; this.alpha = 1;
    if (u.kind === 'knight' || u.knight) this._knight(u.ref || u.knight, u.cls);
    else this._monster(u.sp, u.form || 1);
    this.state = { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 };
  }
  _knight(id, cls) {
    const d = G.has('knight', id) ? G.get('knight', id) : null, look = Object.assign({ size: 1.2, build: 'heroic' }, d ? d.look : { outfit: 'tunic', hair: 'short' });
    const c = G.get('class', cls || (d && d.cls) || 'squire');
    this.line = c.line === 'ruler' || c.line === 'unique' || c.line === 'boss' ? c.id : c.line;
    const rl = dressHat(Object.assign({}, look)); delete rl.bow; delete rl.whip; delete rl.halo;
    if (look.bow) rl.weapon = null;
    this.rig = new E.Humanoid(rl); this.kind = 'humanoid';
    this.tool = look.bow ? 'bow' : look.whip ? 'whip' : null; this.halo = look.halo || null; this.size = 'M';
    this.height = 26 * (look.size || 1.2);
    this.moves = G.MOVESET[this.line] || G.MOVESET.warrior;
    this.voice = 'knight'; this.knightId = id;
  }
  _monster(sp, form) {
    const m = G.get('monster', sp), rig = m.rig, i = form - 1, sc = SIZE_SCALE[m.size[i]] || 1;
    this.sp = sp; this.form = form; this.size = m.size[i]; this.elem = m.elem; this.moves = G.MOVESET.monster;
    if (rig.kind === 'humanoid') {
      const look = dressHat(Object.assign({ size: rig.size[i], build: rig.build, hunch: rig.hunch || 0 }, rig.look[i]));
      this.rig = new E.Humanoid(look); this.kind = 'humanoid'; this.height = 26 * rig.size[i];
      this.tool = rig.tool || null; this.wings = rig.wings ? new E.Wings({ kind: rig.wings, span: rig.wings === 'insect' ? 7 : 12, colors: rig.wings === 'insect' ? { a: '#f0ffff', b: '#c0f0e0' } : { a: '#c8a878', b: rig.look[i].colors.hair || '#7a5a3a' } }) : null;
      this.glow = rig.glow || null; this.alpha = rig.alpha || 1; this.float = rig.float || (rig.wings === 'insect' ? 5 : 0); this.halo = rig.halo || null; this.clockHead = !!rig.clockHead;
      this.moves = { basic: sp === 'scarecrow' ? 'overhead' : sp === 'skeleton' || sp === 'clockwork' ? 'slash' : sp === 'pixie' ? 'cast' : 'haymaker', special: 'cast' };
    } else if (rig.kind === 'blob') {
      const C = rig.colors[i];
      this.rig = new E.Blob({ R: rig.R[i] * (sp === 'bat' ? 1 : 1), colors: C, ears: rig.ears || (sp === 'sproutling' ? null : null), wings: !!rig.wings, mouth: rig.mouth || true, feet: !rig.float && sp !== 'slime', tail: false, face: 'front' });
      this.kind = 'blob'; this.over = rig.over; this.float = rig.float ? 6 : 0; this.alpha = rig.alpha || 1; this.height = rig.R[i] * 2.4 + this.float;
    } else {
      const parts = rig.parts[i], C = rig.colors[i], base = E.Beast.PRESETS[rig.preset];
      const big = (base.kind === 'drake' ? 1.1 : base.kind === 'serpent' ? 1 : 1) * (rig.preset === 'lizard' ? .9 : 1) * FORM_UP[i];
      this.rig = new E.Beast({ preset: rig.preset, size: sc * big * (rig.preset === 'horse' ? .85 : rig.preset === 'avian' ? 1.05 : 1), colors: C, parts: Object.assign({}, parts, { legs4: parts.legs4 }), flier: G.monsterFlags(sp, form).flier });
      this.kind = 'beast'; this.height = (base.h + base.head) * sc * big + (this.rig.flying ? 8 : 0);
    }
    if (this.size === 'L' && this.kind !== 'beast') this.height = Math.max(this.height, 40);
  }
  /** a field attack for the rig: name (a move or a beast action), k 0..1 */
  _attack(name, k) {
    if (this.kind === 'beast') return { kind: BEAST_ANIM[name] || 'bite', u: k };
    if (this.kind === 'blob') return null;
    if (!E.MOVES[name]) return null;
    const ph = k < .35 ? 'wind' : k < .55 ? 'active' : 'recover', u = k < .35 ? k / .35 : k < .55 ? (k - .35) / .2 : (k - .55) / .45;
    return E.move(name, u, ph);
  }
  update(dt, st) {
    this.t += dt; this.state = st;
    const act = st.act, k = act ? act.k : 0;
    const pose = st.sleep ? (this.kind === 'humanoid' ? 'down' : 'sleep') : st.dead ? 'die' : st.pose || null;
    const z = (st.z || 0) + (this.float ? this.float + Math.sin(this.t * 3) * 1.2 : 0);
    if (this.kind === 'humanoid') {
      const isPose = act && ['cast', 'cheer', 'block', 'guard', 'wave', 'hips', 'kneel'].includes(act.move);
      this.rig.update(dt, { x: st.x, y: st.y, z, vx: st.vx, vy: st.vy, facing: st.facing, attack: act && !isPose ? this._attack(act.move, k) : null, pose: isPose ? act.move : pose === 'die' ? 'die' : pose === 'down' ? 'down' : st.guard ? 'guard' : st.kneel ? 'kneel' : pose, expr: st.expr || (st.hurt > .1 ? 'wince' : act && act.move === 'hips' ? 'shout' : null), hurt: st.hurt || 0, down: st.sleep ? .3 : 0 });
      if (this.wings) this.wings.update(dt, { moving: Math.hypot(st.vx, st.vy) > 2 });
    } else if (this.kind === 'blob') {
      const sq = act ? (k < .35 ? -.3 * k / .35 : k < .55 ? .35 : .35 * (1 - (k - .55) / .45)) : st.hurt ? -.3 : Math.sin(this.t * 4) * .06;
      this.rig.update(dt, { squash: st.sleep ? -.35 : sq, look: [Math.cos(st.facing), Math.sin(st.facing)], squint: !!st.sleep || st.hurt > .2, walk: Math.min(1, Math.hypot(st.vx, st.vy) / 30), flap: this.over === 'bat' ? 1 : 1 });
    } else {
      this.rig.update(dt, { x: st.x, y: st.y, z: st.z || 0, vx: st.vx, vy: st.vy, facing: st.facing, attack: act ? this._attack(act.move, k) : null, hurt: st.hurt || 0, pose: pose === 'die' ? 'die' : st.sleep ? 'sleep' : act && act.move === 'roar' ? 'roar' : null });
    }
  }
  /** world offset of the head (for pennants, numbers, status icons) */
  headZ() { return this.height + (this.float || 0) + 2; }
  /** world offset from the feet of the mouth or the weapon tip (projectiles and breath start there) */
  muzzle() {
    if (this.kind === 'beast') return this.rig.mouth();
    if (this.kind === 'humanoid') { const s = this.state, t = this.tool === 'bow' ? this.rig.hand('L') : this.rig.tip ? this.rig.tip() : this.rig.hand('R'); return [t[0] - s.x, t[1] - s.y, t[2] - (s.z || 0)]; }
    return [Math.cos(this.state.facing) * 4, Math.sin(this.state.facing) * 4, this.height * .6];
  }
  draw(g, ox, oy, view) {
    const st = this.state;
    if (this.kind === 'humanoid') {
      if (this.halo) this._halo(g, ox, oy, view, false);
      if (this.wings) this.wings.draw(g, ox, oy - (this.float || 0) * view.scale * .5, view, this.rig, false);
      const draw = () => this.rig.draw(g, ox, oy, view);
      if (this.alpha < 1) P2.blend(g, this.alpha, 'normal', draw); else draw();
      if (this.clockHead) this._clockHead(g, ox, oy, view);
      if (this.tool) this._tool(g, ox, oy, view);
      if (this.wings) this.wings.draw(g, ox, oy - (this.float || 0) * view.scale * .5, view, this.rig, true);
      if (this.halo) this._halo(g, ox, oy, view, true);
      if (this.glow) { const q = view.p(0, 0, this.height * .6 + this.float); P2.blend(g, .35, 'add', () => P2.disc(g, ox + q[0], oy + q[1], 6 * view.scale, this.glow)); }
      return;
    }
    if (this.kind === 'blob') {
      const fz = this.float ? this.float + Math.sin(this.t * 3) * 1.2 : 0, q = view.p(0, 0, fz), bx = ox + q[0], by = oy + q[1];
      const draw = () => this.rig.draw(g, bx, by, view);
      if (this.alpha < 1) P2.blend(g, this.alpha, 'normal', draw); else draw();
      this._overlay(g, bx, by, view);
      return;
    }
    this.rig.draw(g, ox, oy, view);
  }
  _tool(g, ox, oy, view) {
    const s = this.state, r = this.rig, cv = E.charView ? E.charView(view) : view;
    const H = (which) => { const h = r.hand(which), q = cv.p(h[0] - s.x, h[1] - s.y, h[2] - (s.z || 0)); return [Math.round(ox + q[0]), Math.round(oy + q[1])]; };
    if (this.tool === 'bow') { const [x, y] = H('L'); for (let i = -6; i <= 6; i++) P2.dot(g, x + Math.round(2.4 * Math.cos(i / 6 * 1.2)) - 2, y + i, i % 3 ? '#8a5a2a' : '#5a3a1a'); P2.line(g, x - 1, y - 6, x - 1, y + 6, '#e8e0d0'); }
    else if (this.tool === 'whip') { const [x, y] = H('R'), a = s.act ? s.act.k : 0, f = Math.cos(s.facing), l = 6 + a * 14; P2.line(g, x, y, x + Math.round(f * l * .7), y + 4 + Math.round(Math.sin(this.t * 6) * 2), '#6a3a1e', 1); P2.line(g, x + Math.round(f * l * .7), y + 4, x + Math.round(f * l), y + 2, '#8a5a2a', 1); }
    else if (this.tool === 'scythe') { const [x, y] = H('R'); P2.line(g, x, y + 6, x + 2, y - 12, '#6a4a2a', 1); P2.poly(g, [[x + 2, y - 12], [x - 6, y - 10], [x - 9, y - 7], [x + 1, y - 10]], '#c8c8d0'); }
    else if (this.tool === 'club') { const [x, y] = H('R'); P2.line(g, x, y, x + 2, y - 11, '#6a4a2a', 3); P2.disc(g, x + 2, y - 12, 3, '#7a5a3a'); }
  }
  _halo(g, ox, oy, view, front) {
    const cv = E.charView ? E.charView(view) : view, q = cv.p(0, 0, this.height + 3), x = ox + q[0], y = oy + q[1], R = this.halo === 'clock' ? 9 : 6;
    const t = this.t, col = this.halo === 'clock' ? '#e0e0e8' : '#d8c070';
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, py = Math.sin(a) * R * .35; if ((py > 0) !== front) continue; P2.dot(g, x + Math.cos(a) * R, y + py, i % 4 ? col : '#ffffff'); }
    if (front && this.halo === 'clock') { P2.line(g, x, y, x + Math.cos(t) * R * .7, y + Math.sin(t) * R * .25, '#ffffff', 1); }
  }
  _clockHead(g, ox, oy, view) {
    const cv = E.charView ? E.charView(view) : view, j = this.rig.J && this.rig.J.head; if (!j) return;
    const w = this.rig.worldOffset(j), q = cv.p(w[0], w[1], w[2]), x = ox + q[0], y = oy + q[1], R = 4 * (this.rig.o.size || 1);
    P2.disc(g, x, y, R + 1, '#3a3a46'); P2.disc(g, x, y, R, '#f0e8d8'); const t = this.t;
    P2.line(g, x, y, x + Math.cos(t * 2) * R * .8, y + Math.sin(t * 2) * R * .8, '#14121c', 1); P2.line(g, x, y, x + Math.cos(t * .2) * R * .5, y + Math.sin(t * .2) * R * .5, '#14121c', 1);
  }
  _overlay(g, bx, by, view) {
    const R = this.rig.o.R, sc = view.scale, sq = this.rig.sq || 0, top = by - R * 2 * sc * (1 + sq) * .78, t = this.t, f = this.form;
    switch (this.over) {
      case 'sprout': P2.poly(g, [[bx, top + 1], [bx - 4, top - 3], [bx - 1, top - 1]], '#5ab04a'); P2.poly(g, [[bx, top + 1], [bx + 4, top - 4], [bx + 1, top - 1]], '#7ad060'); if (f >= 2) P2.disc(g, bx, top - 3, 1.5, f === 3 ? '#ff4a4a' : '#f4b8d0'); if (f === 3) for (let i = -2; i <= 2; i++) P2.line(g, bx + i * 2, by - 1, bx + i * 3, by + 2, '#6a4a2a', 1); break;
      case 'pumpkin': { for (let i = -1; i <= 1; i++) P2.line(g, bx + i * R * sc * .5, top + 2, bx + i * R * sc * .6, by - 2, TN(this.rig.C.base).sh, 1); const fy = by - R * sc; P2.blend(g, 1, 'normal', () => { P2.poly(g, [[bx - 4, fy - 1], [bx - 2, fy - 3], [bx - 1, fy]], '#ffe040'); P2.poly(g, [[bx + 4, fy - 1], [bx + 2, fy - 3], [bx + 1, fy]], '#ffe040'); P2.rect(g, bx - 3, fy + 2, 6, 1, '#ffd040'); }); const fl = Math.sin(t * 12) * 1; P2.poly(g, [[bx - 2, top], [bx + fl, top - 6 - f], [bx + 2, top]], f === 3 ? '#a0ffd0' : '#ffb020'); break; }
      case 'snow': if ((t * 3 | 0) % 3 === 0) P2.dot(g, bx + Math.sin(t * 2) * R * sc, top + 2, '#ffffff'); P2.dot(g, bx - R * sc * .6, top + 4, '#e8fcff'); if (f === 3) P2.blend(g, .4, 'add', () => P2.disc(g, bx, by - R * sc, R * sc * 1.4, '#a0ffe0')); break;
      case 'clock': { const cy = by - R * sc; P2.disc(g, bx, cy, R * sc * .6, '#f0e8d8'); P2.line(g, bx, cy, bx + Math.cos(t * 3) * R * sc * .5, cy + Math.sin(t * 3) * R * sc * .5, '#14121c', 1); P2.line(g, bx, cy, bx + Math.cos(t * .25) * R * sc * .35, cy + Math.sin(t * .25) * R * sc * .35, '#14121c', 1); for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; P2.disc(g, bx + Math.cos(a) * R * sc * 1.4, cy + Math.sin(a) * R * sc * .5, 1.5, '#d8c070'); } break; }
      case 'slime': P2.ell(g, bx - R * sc * .35, top + 4, 2, 1, '#ffffff'); if (f >= 2) { P2.poly(g, [[bx - 4, top + 1], [bx - 4, top - 3], [bx - 2, top - 1], [bx, top - 4], [bx + 2, top - 1], [bx + 4, top - 3], [bx + 4, top + 1]], '#ffd040'); P2.dot(g, bx, top - 1, '#ff4a4a'); } break;
      case 'bat': if (f >= 2) P2.dot(g, bx, by - R * sc * 1.5, '#ff4040'); break;
    }
    if (f === 3 && this.over !== 'snow' && this.over !== 'sprout') P2.blend(g, .25, 'add', () => P2.disc(g, bx, by - R * sc, R * sc * 1.6, G.elemColor(this.elem)));
  }
  /** a portrait: the rig's own close-up (Humanoid), the beast's, or a framed blob */
  portrait(g, x, y, size = 40, o = {}) {
    const bg = o.bg || '#1a2050';
    if (this.kind === 'humanoid') { this.rig.drawPortrait(g, x, y, size, { zoom: o.zoom || (this.sp ? 2.2 : 3), turn: .6, bg, frame: o.frame !== false, tint: o.tint }); if (this.clockHead) { P2.disc(g, x + size / 2, y + size * .45, size * .2, '#f0e8d8'); P2.line(g, x + size / 2, y + size * .45, x + size / 2 + size * .12, y + size * .38, '#14121c', 1); } return; }
    if (this.kind === 'beast') { this.rig.drawPortrait(g, x, y, size, { bg, frame: o.frame }); return; }
    P2.rect(g, x, y, size, size, bg);
    const v = new E.View('p', 'p', 0, 25, size / (this.rig.o.R * 3.2), 1), q = v.p(0, 0, 0);
    const keep = this.state; this.rig.update(0, { squash: 0, look: [0, 1] });
    this.rig.draw(g, x + size / 2 - q[0], y + size * .82 - q[1], v);
    this.state = keep;
    if (o.frame !== false) { P2.rect(g, x, y, size, 1, '#e8e4ff'); P2.rect(g, x, y + size - 1, size, 1, '#e8e4ff'); P2.rect(g, x, y, 1, size, '#e8e4ff'); P2.rect(g, x + size - 1, y, 1, size, '#e8e4ff'); }
  }
}
G.Vis = Vis;
/** a cached Vis for a knight id or species/form (menus, cards, portraits) */
G.visCache = {};
G.visFor = (key, spec) => G.visCache[key] || (G.visCache[key] = new Vis(spec));
G.knightVis = id => G.visFor('k:' + id, { kind: 'knight', ref: id, cls: G.has('knight', id) ? G.get('knight', id).cls : 'squire' });
G.monsterVis = (sp, form) => G.visFor('m:' + sp + form, { kind: 'monster', sp, form });

}

// ===== src/34-art-fx.js =====
{
// EFFECTS: timed visual effects the battle's event player starts (projectiles, spell bursts by element, breath,
// heals, buffs, statuses, summoning circles, capture chains, level-up columns, promotion ribbons, the Hour Hand), plus
// the bell clock face for the HUD. Each effect: { t, dur, update(dt), draw(r), done }. Particles do the rest.

const { px: FXP } = E;
const ELC = { spring: ['#9ad86a', '#f4b8d0', '#ffffff', '#ffe060'], summer: ['#ffd040', '#ff8a20', '#ff4a1a', '#fff0a0'], autumn: ['#e07a1e', '#c84a1a', '#8a5a2a', '#ffd040'], winter: ['#ffffff', '#a8e8ff', '#6ab0e8', '#e8fcff'], hour: ['#d8c070', '#b0a8c8', '#f0e8d8', '#5a5a6a'], none: ['#ffffff', '#fff0a0', '#ffe8c0', '#ffd060'] };
G.ELC = ELC;
class FXList {
  constructor() { this.list = []; }
  clear() { this.list = []; }
  add(fx) { fx.t = 0; this.list.push(fx); return fx; }
  update(dt) { for (const f of this.list) { f.t += dt; if (f.update) f.update(dt); } this.list = this.list.filter(f => f.t < f.dur); }
  draw(r) { for (const f of this.list) if (f.draw) f.draw(r, Math.min(1, f.t / f.dur)); }
  get busy() { return this.list.some(f => f.blocking); }
}
G.FXList = FXList;
const P = () => G.game.particles;
const RM = () => G.game.settings && G.game.settings.reduceMotion;
const FX = G.FX = {};
/** a projectile from a to b (world points [x, y, z]); kind: arrow (an arc) | bolt (straight, glowing) | ice | rock */
FX.projectile = (list, a, b, kind, elem, dur = .32) => list.add({ dur, blocking: true, draw(r, k) {
  const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, z = a[2] + (b[2] - a[2]) * k + (kind === 'arrow' || kind === 'rock' ? Math.sin(k * Math.PI) * 18 : 0);
  const col = (ELC[elem] || ELC.none);
  r.queue(x, y, z, g => {
    const q = r.w(x, y, z), q2 = r.w(x - (b[0] - a[0]) * .06, y - (b[1] - a[1]) * .06, z - (b[2] - a[2]) * .06 + (kind === 'arrow' ? Math.cos(k * Math.PI) * 4 : 0));
    if (kind === 'arrow') { FXP.line(g, q2[0], q2[1], q[0], q[1], '#e8dcc0', 1); FXP.dot(g, q[0], q[1], '#ffffff'); }
    else if (kind === 'ice') { FXP.poly(g, [[q[0], q[1] - 3], [q[0] + 3, q[1]], [q[0], q[1] + 3], [q[0] - 3, q[1]]], '#c8f0ff'); FXP.dot(g, q[0], q[1], '#ffffff'); }
    else { r.glowDisc(g, q[0], q[1], 7, col[0], .7); FXP.disc(g, q[0], q[1], 2, col[3] || '#ffffff'); FXP.line(g, q2[0], q2[1], q[0], q[1], col[1], 2); }
  }, { emissive: kind !== 'arrow' });
  if (kind !== 'arrow') G.game.lights.add(x, y, z, 30, .7, { color: col[0] });
} });
/** an element burst at a world point (r: radius in world units) */
FX.burst = (list, at, elem, rad = 14, big) => {
  const [x, y, z] = at, col = ELC[elem] || ELC.none, p = P(), n = big ? 26 : 12;
  switch (elem) {
    case 'spring': p.bits(x, y, z + 8, n, col); p.glints(x, y, z + 10, 6, '#ffffff'); break;
    case 'summer': p.fire(x, y, z, big ? 14 : 7, { size: big ? 1.5 : 1 }); p.explosion(x, y, z + 6, big ? 1 : .5, { debris: false, freeze: false, shake: big ? 2 : 0 }); break;
    case 'autumn': p.bits(x, y, z + 10, n, col); p.smoke(x, y, z + 6, 4, { color: '#8a6a5a' }); break;
    case 'winter': p.bits(x, y, z + 8, n, col); p.glints(x, y, z + 10, 8, '#e8fcff'); break;
    case 'hour': p.bits(x, y, z + 8, n, col); p.sparks(x, y, z + 8, 6, 0); break;
    default: p.glints(x, y, z + 10, 12, '#fff8d0'); p.bits(x, y, z + 8, 8, col);
  }
  p.ring(x, y, 2, rad, col[0], .35);
  list.add({ dur: .5, draw(r, k) {
    G.game.lights.add(x, y, z + 6, rad * 2.5, (1 - k) * 1.2, { color: col[0] });
    if (elem === 'winter') r.decal(g => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, q0 = r.w(x, y, 0), q1 = r.w(x + Math.cos(a) * rad * (.4 + k), y + Math.sin(a) * rad * (.4 + k), 0); FXP.line(g, q0[0], q0[1], q1[0], q1[1], k < .5 ? '#ffffff' : '#a8e8ff', 1); } });
    if (elem === 'hour') FX.clockFace(r, x, y, rad * (.6 + k * .5), k * 6, 1 - k);
    if (elem === 'summer' && big) r.queue(x, y, z + 20, g => { const q = r.w(x, y, z + 20 + k * 10); r.glowDisc(g, q[0], q[1], 14 * (1 - k * .5), '#fff0a0', 1 - k); }, { emissive: true });
  } });
};
/** a clock-face ring decal with sweeping hands (Hour magic, Stop) */
FX.clockFace = (r, x, y, rad, ang, a = 1) => {
  if (a <= .05) return;
  r.decal(g => {
    const pts = r.groundPts(x, y, rad, 24, 0);
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; FXP.line(g, p[0], p[1], q[0], q[1], '#d8c070', 1); }
    for (let i = 0; i < 12; i++) { const ag = i / 12 * Math.PI * 2, q = r.w(x + Math.cos(ag) * rad * .85, y + Math.sin(ag) * rad * .85, 0); FXP.dot(g, q[0], q[1], '#f0e8d8'); }
    const c0 = r.w(x, y, 0), h1 = r.w(x + Math.cos(ang) * rad * .8, y + Math.sin(ang) * rad * .8, 0), h2 = r.w(x + Math.cos(ang / 12) * rad * .5, y + Math.sin(ang / 12) * rad * .5, 0);
    FXP.line(g, c0[0], c0[1], h1[0], h1[1], '#f0e8d8', 1); FXP.line(g, c0[0], c0[1], h2[0], h2[1], '#d8c070', 2);
  }, { emissive: .6 });
};
/** a cone or line of breath from a mouth over cells (world centres) */
FX.breath = (list, from, cells, elem, dur = .55) => list.add({ dur, blocking: true, update() {
  const k = Math.min(1, this.t / dur), p = P(), col = ELC[elem] || ELC.none;
  for (const c of cells) { if (Math.random() > .35) continue; const d = Math.hypot(c[0] - from[0], c[1] - from[1]) / 60; if (k < d) continue; if (elem === 'summer') p.fire(c[0] + (Math.random() - .5) * 8, c[1] + (Math.random() - .5) * 6, 2, 1); else p.bits(c[0], c[1], 8, 2, col); }
}, draw(r, k) { const col = (ELC[elem] || ELC.none)[0]; for (const c of cells) G.game.lights.add(c[0], c[1], 6, 24, .5 * (1 - k), { color: col }); } });
/** rising sparkles of healing */
FX.heal = (list, at) => { const [x, y, z] = at; P().glints(x, y, z + 10, 10, '#a8ffa8'); list.add({ dur: .7, draw(r, k) { r.queue(x, y, z, g => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + k * 4, q = r.w(x + Math.cos(a) * 7, y + Math.sin(a) * 5, z + k * 26); FXP.rect(g, q[0], q[1] - 1, 1, 3, '#c8ffc8'); FXP.rect(g, q[0] - 1, q[1], 3, 1, '#c8ffc8'); } }, { emissive: true }); G.game.lights.add(x, y, z + 10, 30, .6 * (1 - k), { color: '#a8ffa8' }); } }); };
/** a buff: chevrons (valor), speed lines (haste), a shield (warded) */
FX.buff = (list, at, kind) => { const [x, y, z] = at, col = { valor: '#ff5a4a', haste: '#ffe04a', warded: '#4aa0ff', frostarmor: '#bfefff', windup: '#d8c070' }[kind] || '#ffffff'; list.add({ dur: .7, draw(r, k) { r.queue(x, y, z, g => { const q = r.w(x, y, z + 14 + k * 14); if (kind === 'warded' || kind === 'frostarmor') { FXP.poly(g, [[q[0] - 5, q[1] - 5], [q[0] + 5, q[1] - 5], [q[0] + 5, q[1] + 1], [q[0], q[1] + 6], [q[0] - 5, q[1] + 1]], col); FXP.poly(g, [[q[0] - 3, q[1] - 3], [q[0] + 3, q[1] - 3], [q[0] + 3, q[1]], [q[0], q[1] + 3], [q[0] - 3, q[1]]], '#ffffff'); } else for (let i = 0; i < 2; i++) FXP.poly(g, [[q[0] - 5, q[1] + i * 4], [q[0], q[1] - 4 + i * 4], [q[0] + 5, q[1] + i * 4], [q[0] + 5, q[1] + 2 + i * 4], [q[0], q[1] - 2 + i * 4], [q[0] - 5, q[1] + 2 + i * 4]], col); }, { emissive: true }); } }); };
/** the summoning: a rotating rune ring, a pillar of light, rising particles */
FX.summon = (list, at, elem, dur = 1.4) => { const [x, y] = at, col = ELC[elem] || ELC.none; list.add({ dur, blocking: true, update() { if (Math.random() < .5) P().glints(x + (Math.random() - .5) * 20, y + (Math.random() - .5) * 14, 4, 1, col[0]); }, draw(r, k) {
  const a = k * 5, rad = 16 + Math.sin(k * Math.PI) * 4;
  r.decal(g => { const pts = r.groundPts(x, y, rad, 28, 0); for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; FXP.line(g, p[0], p[1], q[0], q[1], col[0], 1); } for (let i = 0; i < 6; i++) { const ag = a + i / 6 * Math.PI * 2, q = r.w(x + Math.cos(ag) * rad * .75, y + Math.sin(ag) * rad * .75, 0); FXP.rect(g, q[0] - 1, q[1] - 1, 3, 3, col[1]); } const pts2 = r.groundPts(x, y, rad * .55, 18, 0); for (let i = 0; i < pts2.length; i += 2) { const p = pts2[i]; FXP.dot(g, p[0], p[1], col[3]); } }, { emissive: 1 });
  r.queue(x, y, 0, g => { const b = r.w(x, y, 0), tp = r.w(x, y, 60 * Math.min(1, k * 2)); FXP.blend(g, .5 * Math.sin(k * Math.PI), 'add', () => FXP.rect(g, b[0] - 5, tp[1], 10, b[1] - tp[1], col[0])); }, { emissive: true });
  G.game.lights.add(x, y, 10, 60, Math.sin(k * Math.PI) * 1.4, { color: col[0] });
} }); };
/** a chain of light from a captor to a captured monster */
FX.chain = (list, a, b) => list.add({ dur: .9, blocking: true, draw(r, k) { r.queue((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 10, g => { const n = 10; for (let i = 0; i <= n * Math.min(1, k * 1.6); i++) { const t = i / n, q = r.w(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 12 + Math.sin(t * Math.PI) * 8); FXP.disc(g, q[0], q[1], i % 2 ? 1 : 2, i % 2 ? '#fff8d0' : '#ffd060'); } }, { emissive: true }); } });
/** level up: a gold column and the gains popping up */
FX.levelUp = (list, at, gains) => { const [x, y, z] = at; const lines = Object.entries(gains || {}).filter(([k, v]) => k !== 'learned' && v > 0).slice(0, 4).map(([k, v]) => '+' + v + ' ' + k.toUpperCase()); lines.forEach((l, i) => G.game.after(.15 * i, () => P().text(x, y, z + 30 + i * 2, l, '#ffe080', { scale: 1, bounce: false }))); list.add({ dur: 1, draw(r, k) { r.queue(x, y, 0, g => { const b = r.w(x, y, 0), tp = r.w(x, y, 50); FXP.blend(g, .45 * (1 - k), 'add', () => FXP.rect(g, b[0] - 4, tp[1], 8, b[1] - tp[1], '#ffd040')); }, { emissive: true }); } }); };
/** promotion: a white flash and spiralling ribbons in the element's colours */
FX.promote = (list, at, elem) => { const [x, y, z] = at, col = ELC[elem] || ELC.none; G.game.flash('#ffffff', .2, .6); list.add({ dur: 1.2, blocking: true, draw(r, k) { r.queue(x, y, z, g => { for (let i = 0; i < 3; i++) for (let j = 0; j < 12; j++) { const t = j / 12, a = k * 12 + i * 2.1 + t * 4, q = r.w(x + Math.cos(a) * (14 - t * 8), y + Math.sin(a) * (10 - t * 6), z + t * 40 * k); FXP.disc(g, q[0], q[1], 1.5, col[i % col.length]); } }, { emissive: true }); G.game.lights.add(x, y, 20, 60, 1.2 * (1 - k), { color: col[0] }); } }); };
/** the Hour Hand's line across the Sanctum floor (glowing faintly all bell, bright when it strikes) */
FX.handLine = (r, field, cells, strength) => { r.decal(g => { for (const c of cells) FXP.polyDither(g, field.hexPts(r, c, .7), '#d8c070', strength, r.ix, r.iy); }, { emissive: strength }); };
/** the HUD's bell clock: a 12-hour dial whose hand points at the current bell */
FX.bellClock = (g, cx, cy, R, bell, of, t) => {
  FXP.disc(g, cx, cy, R + 2, '#14121c'); FXP.disc(g, cx, cy, R + 1, '#d8c070'); FXP.disc(g, cx, cy, R, '#f0e8d8');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2, on = i < bell; FXP.dot(g, cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2), on ? '#c83a2a' : '#5a5a6a'); }
  const a = bell / Math.max(1, of) * Math.PI * 2 - Math.PI / 2 + Math.sin(t * 20) * .02;
  FXP.line(g, cx, cy, cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), '#14121c', 1); FXP.dot(g, cx, cy, '#c83a2a');
};

}

// ===== src/35-art-shapes.js =====
{
// SHAPES: new E.SHAPES entries (data drawn by r.shape in every view): castles in six regional styles, the Keep tower,
// rampart hex blocks, cottages, gears, cliffs, the clock tower, the Sanctum's season dials, a bridge, a watermill,
// a shrine and a broken pillar. Units: 16 = one tile; the origin is the footprint's middle; written facing south.

const SH = E.SHAPES;
E.WEATHER.petals = { n: 70, fall: 22, colors: ['#f4b8d0', '#ffffff', '#f8d0e0', '#e890b0'], sway: 18, rest: 1, size: 2, wind: 1 };

const castle = (id, about, mats, extra = []) => {
  SH[id] = { about, tags: 'castle brigantime', mats, foot: [-18, -16, 18, 16], parts: [
    ['box', 'w', [0, 2, 0], [26, 18, 16]],
    ['mirror', 'x', ['cyl', 'w', [13, 9, 0], 5, 24, { seg: 10 }]],
    ['mirror', 'x', ['cyl', 'r', [13, 9, 24], 6, 9, { r2: 0, seg: 10 }]],
    ['cyl', 'w', [0, -6, 0], 7, 34, { seg: 12 }],
    ['cyl', 'r', [0, -6, 34], 8.5, 13, { r2: 0, seg: 12 }],
    ['box', 'd', [0, 11.2, 0], [7, 1, 10]],
    ['row', 4, [6, 0, 0], ['box', 'w', [0, 11, 16], [3, 2, 3]]],
    ...extra] };
};
castle('castle-winter', 'grey stone keep with blue slate roofs and icicles', { w: '#8a90a0 stones size=4', r: '#3a5a8a shingles', d: '#3a2a20 planks', i: '#e8fcff glaze' },
  [['mirror', 'x', ['cyl', 'i', [10, 11, 13], 1, 3, { r2: 0, rot: [180, 0, 0] }]], ['cyl', 'i', [0, -6, 44], 1.4, 6, { r2: 0 }]]);
castle('castle-spring', 'white stone keep with green roofs and blossom', { w: '#e8e4dc stones size=5', r: '#3a8a4a shingles', d: '#6a4a2a planks', b: '#f4b8d0 foliage' },
  [['mirror', 'x', ['ball', 'b', [15, 13, 4], 4]], ['ball', 'b', [-9, 12, 3], 3]]);
castle('castle-summer', 'sandstone keep with red and gold domes', { w: '#d8b878 stones size=5', r: '#c83a2a glaze', d: '#5a3a1a planks', g: '#e8c040 metal' },
  [['ball', 'g', [0, -6, 38], 7, { sz: .9 }], ['mirror', 'x', ['ball', 'r', [13, 9, 26], 5]], ['cyl', 'g', [0, -6, 44], 1, 6]]);
castle('castle-autumn', 'timber and brown stone keep with amber roofs', { w: '#7a5a40 stones size=5', r: '#c86a1e shingles', d: '#4a2a14 planks', t: 'timber' },
  [['box', 't', [0, -6, 26], [15, 15, 2]]]);
castle('castle-hour', 'black and white marble keep with a brass clock', { w: '#3a3a46 tiles size=4', r: '#e8e4dc marble', d: '#14121c planks', c: '#d8c070 metal' },
  [['cyl', 'c', [0, 1.6, 26], 4.5, 1, { rot: [90, 0, 0] }], ['box', '#14121c', [0, 1.4, 26.5], [.8, .6, 3.5]]]);
SH['castle-brigand'] = { about: 'a log palisade round two tents', tags: 'castle brigand', mats: { p: '#6a4a2a bark', t: '#c8b088 cloth', s: '#8a3a2a cloth' }, foot: [-18, -16, 18, 16], parts: [
  ['ring', 14, 16, ['cyl', 'p', [0, 0, 0], 2, 14, { r2: 1.4, seg: 6 }]],
  ['prism', 't', [-5, -2, 0], [[-7, 0], [7, 0], [0, 10]], 14, { axis: 'y' }],
  ['prism', 's', [7, 4, 0], [[-5, 0], [5, 0], [0, 8]], 10, { axis: 'y' }],
  ['cyl', 'p', [0, -10, 0], 1, 22], ['box', 's', [3, -10, 16], [6, .5, 5]]] };
SH.keep = { about: 'round watchtower Keep with crenellations', tags: 'keep brigantime', mats: { w: '#9a9488 stones size=4', c: '#7a746a stones size=3', d: '#3a2a20 planks' }, parts: [
  ['cyl', 'w', [0, 0, 0], 9, 32, { seg: 12 }], ['cyl', 'c', [0, 0, 32], 10.5, 3, { seg: 12 }],
  ['ring', 8, 9.5, ['box', 'c', [0, 0, 35], [3, 3, 3]]], ['box', 'd', [0, 8.8, 0], [5, 1, 9]], ['box', '#140c1c', [0, 9, 20], [2, 1, 4]]] };
SH['keep-hour'] = { about: 'the Great Clock tower: black marble, a brass face', tags: 'keep hour', mats: { w: '#2a2a36 tiles size=4', b: '#d8c070 metal', m: '#e8e4dc marble' }, parts: [
  ['cyl', 'w', [0, 0, 0], 10, 44, { seg: 8 }], ['cyl', 'm', [0, 0, 44], 11.5, 3, { seg: 8 }], ['cyl', 'b', [0, 0, 47], 8, 12, { r2: 0, seg: 8 }],
  ['cyl', 'b', [0, 9.6, 30], 6, 1, { rot: [90, 0, 0] }], ['box', '#14121c', [0, 10.4, 26], [.8, .6, 7]]] };
SH.hexblock = { about: 'a rampart hex block with crenellations', tags: 'wall brigantime', mats: { w: '#8a8478 stones size=5', c: '#6a6458 stones size=3' }, parts: [
  ['cyl', 'w', [0, 0, 0], 16.2, 22, { seg: 6 }], ['ring', 6, 13, ['box', 'c', [0, 0, 22], [4, 4, 4]]]] };
SH['hexblock-ice'] = { about: 'an ice-rimed rampart block', tags: 'wall winter', mats: { w: '#8a98b0 stones size=5', c: '#c8f0ff glaze' }, parts: SH.hexblock.parts };
SH.cottage = { about: 'a timber-and-plaster cottage with a tiled roof', tags: 'house village', mats: { w: 'plaster', t: 'timber', r: '#8a3a2a shingles', d: '#4a2a14 planks' }, parts: [
  ['box', 'w', [0, 0, 0], [24, 20, 16]], ['prism', 'r', [0, 0, 16], [[-13, 0], [13, 0], [0, 10]], 22, { axis: 'y' }],
  ['box', 'd', [0, 10.2, 0], [5, 1, 9]], ['box', 't', [0, 0, 16], [25, 21, 1.5]], ['box', '#e8d890', [-7, 10.2, 8], [3, 1, 3]]] };
SH.gear = { about: 'a great brass gear on its side, half sunk', tags: 'hour clockwork', mats: { b: '#b89a50 metal', d: '#5a4a30 metal' }, parts: [
  ['cyl', 'b', [0, 0, 0], 13, 7, { seg: 16 }], ['ring', 12, 14, ['box', 'b', [0, 0, 0], [3, 3, 7]]], ['cyl', 'd', [0, 0, 7], 5, 2, { seg: 10 }]] };
SH.cliff = { about: 'a jagged rock face', tags: 'mountain', mats: { s: 'rock' }, parts: [
  ['rock', 's', [0, 0, 0], 14, { sz: 1.6, seed: 3, rough: .4 }], ['rock', 's', [5, -4, 8], 8, { sz: 1.4, seed: 5 }]] };
SH.clocktower = { about: "Meridian's great clock tower", tags: 'hour landmark', mats: { w: '#2a2a36 tiles size=4', m: '#e8e4dc marble', b: '#d8c070 metal' }, parts: [
  ['cyl', 'm', [0, 0, 0], 18, 8, { seg: 8 }], ['cyl', 'w', [0, 0, 8], 13, 70, { seg: 8 }], ['cyl', 'm', [0, 0, 78], 15, 4, { seg: 8 }],
  ['cyl', 'w', [0, 0, 82], 10, 16, { seg: 8 }], ['cyl', 'b', [0, 0, 98], 11, 18, { r2: 0, seg: 8 }], ['cyl', 'b', [0, 0, 116], 1, 8],
  ['cyl', 'm', [0, 12.6, 58], 9, 1, { rot: [90, 0, 0] }]] };
SH.dial = { about: 'a season dial set in the floor', tags: 'hour sanctum', mats: { b: '#b89a50 metal', s: '#3a3a46 tiles' }, parts: [
  ['cyl', 's', [0, 0, 0], 11, 1.5, { seg: 12 }], ['cyl', 'b', [0, 0, 1.5], 8, 1, { seg: 12 }], ['box', 'b', [0, 0, 2.5], [1.5, 7, 1]]] };
SH.bridge = { about: 'a plank bridge with rails', tags: 'bridge', mats: { p: 'planks', r: 'oak' }, parts: [
  ['box', 'p', [0, 0, 0], [28, 16, 2]], ['mirror', 'y', ['box', 'r', [0, 7.5, 2], [28, 1, 1.2]]], ['mirror', 'xy', ['box', 'r', [12, 7.5, 0], [1.4, 1.4, 6]]]] };
SH.watermill = { about: 'a watermill with its wheel', tags: 'village', mats: { w: 'plaster', t: 'timber', r: '#6a4a2a shingles', o: 'oak' }, parts: [
  ['box', 'w', [0, 0, 0], [22, 18, 16]], ['prism', 'r', [0, 0, 16], [[-12, 0], [12, 0], [0, 9]], 20, { axis: 'y' }],
  ['cyl', 'o', [13, 0, 9], 9, 3, { rot: [0, 90, 0], seg: 10 }], ['cyl', 't', [13, 0, 9], 2, 4, { rot: [0, 90, 0] }]] };
SH.shrine = { about: 'a small wayside shrine of the Wheel', tags: 'shrine', mats: { s: '#e8e4dc marble', b: '#d8c070 metal' }, parts: [
  ['box', 's', [0, 0, 0], [10, 10, 3]], ['cyl', 's', [0, 0, 3], 3, 14, { seg: 8 }], ['cyl', 'b', [0, 0, 17], 4.5, 1, { rot: [90, 0, 0] }]] };
SH.brokenpillar = { about: 'a broken pillar and rubble', tags: 'ruins', mats: { s: '#9a9488 stones size=3' }, parts: [
  ['cyl', 's', [0, 0, 0], 3.5, 11, { seg: 8 }], ['rock', 's', [5, 3, 0], 3, { seed: 4 }], ['rock', 's', [-4, 4, 0], 2.2, { seed: 7 }]] };
SH.tent = { about: 'a war tent with a pennant', tags: 'camp', mats: { c: '#c8b088 cloth', p: 'oak' }, parts: [
  ['prism', 'c', [0, 0, 0], [[-10, 0], [10, 0], [0, 14]], 18, { axis: 'y' }], ['cyl', 'p', [0, 0, 14], .8, 8]] };
SH.maptable = { about: 'a campaign table with a map', tags: 'camp', mats: { t: 'oak', m: '#e8d8b0 cloth' }, parts: [
  ['box', 't', [0, 0, 10], [22, 14, 2]], ['box', 'm', [0, 0, 12], [18, 10, .4]], ['mirror', 'xy', ['box', 't', [9, 5, 0], [2, 2, 10]]]] };
SH.bier = { about: "the Keeper's bier", tags: 'hour', mats: { s: '#e8e4dc marble', c: '#5a2a6a velvet' }, parts: [
  ['box', 's', [0, 0, 0], [26, 12, 8]], ['box', 'c', [0, 0, 8], [24, 10, 2]], ['box', 's', [-12, 0, 8], [2, 12, 6]]] };
SH.sundial = { about: 'a garden sundial', tags: 'garden', mats: { s: '#c8c0b0 stones size=3', b: '#b89a50 metal' }, parts: [
  ['cyl', 's', [0, 0, 0], 3, 10, { seg: 8 }], ['cyl', 's', [0, 0, 10], 6, 1.5, { seg: 12 }], ['wedge', 'b', [0, 0, 11.5], [.8, 5, 4]]] };
SH.haybale = { about: 'a round hay bale', tags: 'farm', mats: { h: 'straw' }, parts: [['cyl', 'h', [0, 0, 0], 6, 9, { rot: [0, 90, 0], seg: 10 }]] };
SH.pumpkin = { about: 'a ripe pumpkin', tags: 'farm autumn', mats: { o: '#e07a1e glaze', s: '#4a6a2a bark' }, parts: [['ball', 'o', [0, 0, 3.5], 4.5, { sz: .75 }], ['cyl', 's', [0, 0, 6.5], .8, 2]] };

/** the castle shape for a region */
G.castleShape = region => ({ winter: 'castle-winter', spring: 'castle-spring', summer: 'castle-summer', autumn: 'castle-autumn', hour: 'castle-hour' }[region] || 'castle-brigand');

}

// ===== src/36-art-icons.js =====
{
// ICONS AND GLYPHS: string sprites for sigils, elements, statuses and items, and the controller / keyboard / mouse
// prompt glyphs (the 5x7 font has no circle, square or triangle, so they are drawn in pixels). Shapes as well as
// colours tell everything apart (sides carry sigils; statuses have distinct silhouettes).

const { px } = E;
const SPR = (rows, map) => E.sprite(rows, map);
G.ICON = {};

/* ---- realm sigils (7 x 7, drawn in the trim colour on the banner) ---- */
const SIGIL_ROWS = {
  blossom: ['..x.x..', '.xxxxx.', 'xxxoxxx', '.xxoxx.', 'xxxxxxx', '.x.x.x.', '...x...'],
  sun: ['x..x..x', '.x.x.x.', '..xxx..', 'xxxoxxx', '..xxx..', '.x.x.x.', 'x..x..x'],
  oak: ['...x...', '..xxx..', '.xxxxx.', 'xx.x.xx', '.xxxxx.', '..xxx..', '...x...'],
  snowflake: ['x..x..x', '.x.x.x.', '..xxx..', 'xxx.xxx', '..xxx..', '.x.x.x.', 'x..x..x'],
  hourglass: ['xxxxxxx', '.x...x.', '..xox..', '...x...', '..x.x..', '.xooox.', 'xxxxxxx'],
  axes: ['xx...xx', 'xxx.xxx', '.xx.xx.', '..xxx..', '.xx.xx.', 'xx...xx', 'x.....x']
};
G.sigil = (name, color, accent) => {
  const key = name + color + (accent || ''); G.ICON._sig = G.ICON._sig || {};
  return G.ICON._sig[key] || (G.ICON._sig[key] = SPR(SIGIL_ROWS[name] || SIGIL_ROWS.axes, { x: color, o: accent || color }));
};

/* ---- elements ---- */
const ELEM_ROWS = {
  spring: ['..g.g..', '.gpgpg.', 'gpPyPpg', '.gpppg.', '..gpg..', '...g...', '..ggg..'],
  summer: ['y..y..y', '.yyyyy.', '.yOOOy.', 'yyOOOyy', '.yOOOy.', '.yyyyy.', 'y..y..y'],
  autumn: ['....oo.', '..oooO.', '.ooOoo.', 'oOoooo.', 'ooooo..', '.b.....', 'b......'],
  winter: ['c..c..c', '.c.c.c.', '..cwc..', 'cccwccc', '..cwc..', '.c.c.c.', 'c..c..c'],
  hour: ['bbbbbbb', '.b...b.', '..byb..', '...b...', '..b.b..', '.byyyb.', 'bbbbbbb'],
  none: ['...w...', '..www..', '.wwwww.', 'wwwwwww', '.wwwww.', '..www..', '...w...']
};
const ELEM_COL = { g: '#4a9a3a', p: '#f4b8d0', P: '#ffffff', y: '#ffd040', O: '#ff8a20', o: '#e07a1e', b: '#5a3a2a', c: '#8ad8ff', w: '#ffffff' };
G.elemIcon = e => { G.ICON._el = G.ICON._el || {}; return G.ICON._el[e] || (G.ICON._el[e] = SPR(ELEM_ROWS[e] || ELEM_ROWS.none, Object.assign({}, ELEM_COL, e === 'hour' ? { b: '#d8c070', y: '#f0e8d8' } : {}))); };

/* ---- statuses, buffs and debuffs (distinct shapes) ---- */
const FX_ROWS = {
  poison: ['..g..', '.g.g.', 'g.g.g', '.ggg.', '..g..'], burn: ['..o..', '.ooy.', 'ooyyo', 'oyyyo', '.ooo.'],
  chill: ['c.c.c', '.ccc.', 'ccwcc', '.ccc.', 'c.c.c'], sleep: ['zzzz.', '...z.', '..z..', '.z...', 'zzzz.'],
  stop: ['.www.', 'w.k.w', 'w.kkw', 'w...w', '.www.'], valor: ['..r..', '.rrr.', 'rr.rr', '..r..', '.rrr.'],
  haste: ['yy...', '.yyy.', 'yy.yy', '.yyy.', 'yy...'], warded: ['bbbbb', 'bwwwb', 'bwwwb', '.bwb.', '..b..'],
  guarded: ['wwwww', 'w...w', 'w...w', '.w.w.', '..w..'], frostarmor: ['ccccc', 'cwwwc', 'cwcwc', '.cwc.', '..c..'],
  weakened: ['.ppp.', 'pp.pp', '..p..', '.ppp.', '..p..'], exposed: ['rr.rr', 'r...r', '.r.r.', 'r...r', 'rr.rr']
};
const FX_COL = { g: '#7ad04a', o: '#ff7a2a', y: '#ffe04a', c: '#8ad8ff', w: '#e8e8f0', z: '#c8b0ff', k: '#3a3a46', r: '#ff5a4a', b: '#4aa0ff', p: '#b07ad0' };
G.fxIcon = id => { G.ICON._fx = G.ICON._fx || {}; return G.ICON._fx[id] || (G.ICON._fx[id] = SPR(FX_ROWS[id] || FX_ROWS.guarded, FX_COL)); };

/* ---- items (9 x 9) ---- */
const ITEM_ROWS = {
  sword: ['........w', '.......ww', '......ww.', '.....ww..', '....ww...', '.y.ww....', '..yy.....', '.byy.....', 'b..y.....'],
  spear: ['.......ww', '......www', '.....bw..', '....b....', '...b.....', '..b......', '.b.......', 'b........', '.........'],
  axe: ['....www..', '...wwww..', '...wbww..', '....b....', '....b....', '....b....', '....b....', '....b....', '.........'],
  bow: ['..bb.....', '.b..s....', 'b....s...', 'b.....s..', 'b.....s..', 'b....s...', '.b..s....', '..bb.....', '.........'],
  staff: ['......oo.', '.....oOo.', '.....bo..', '....b....', '...b.....', '..b......', '.b.......', 'b........', '.........'],
  rod: ['.....yy..', '....yoy..', '.....yy..', '....b....', '...b.....', '..b......', '.b.......', 'b........', '.........'],
  tome: ['.rrrrrr..', 'rwwwwwr..', 'rwyyywr..', 'rwwwwwr..', 'rwyyywr..', 'rwwwwwr..', '.rrrrrr..', '.........', '.........'],
  whip: ['bb.......', '.b.......', '.b..ggg..', '..bg...g.', '...g...g.', '..g...g..', '.g..gg...', '..gg.....', '.........'],
  armor: ['.ww...ww.', 'wwwwwwwww', 'wsssssssw', '.sswwwss.', '.sswwwss.', '.sssssss.', '.sss.sss.', '.ss...ss.', '.........'],
  robe: ['..ppppp..', '.ppwwwpp.', '.pppwppp.', '.ppppppp.', 'pppppppp.', 'ppppppppp', 'ppppppppp', '.........', '.........'],
  ring: ['...yyy...', '..y.w.y..', '.y.....y.', '.y.....y.', '.y.....y.', '..y...y..', '...yyy...', '.........', '.........'],
  amulet: ['.y.....y.', '..y...y..', '...y.y...', '....y....', '...bbb...', '..bwwwb..', '...bbb...', '.........', '.........'],
  herb: ['....g....', '...ggg...', '..gg.gg..', '.g..g..g.', '....g....', '....g....', '...ggg...', '.........', '.........'],
  potion: ['...ww....', '...ww....', '..wrrw...', '.wrrrrw..', '.wrrrrw..', '.wrrrrw..', '..wwww...', '.........', '.........'],
  seed: ['....g....', '...g.g...', '...bbb...', '..bbbbb..', '..bbbbb..', '...bbb...', '.........', '.........', '.........'],
  ember: ['....o....', '...oyo...', '..oyyyo..', '..oyyyo..', '...ooo...', '.........', '.........', '.........', '.........'],
  acorn: ['...bbb...', '..bbbbb..', '...ooo...', '..ooooo..', '..ooooo..', '...ooo...', '....o....', '.........', '.........'],
  shard: ['....c....', '...cwc...', '...cwc...', '..ccwcc..', '..cwccc..', '...ccc...', '....c....', '.........', '.........'],
  scroll: ['.wwwwww..', 'w.yyyy.w.', '.wyyyyw..', '.wyyyyw..', '.wyyyyw..', 'w.yyyy.w.', '.wwwwww..', '.........', '.........']
};
const ITEM_COL = { w: '#e8e8f0', y: '#ffd040', b: '#8a5a30', s: '#a8b0c0', o: '#ff8a20', O: '#ffe0a0', r: '#c83a3a', g: '#5ab04a', p: '#8a5ac8', c: '#8ad8ff' };
G.itemIcon = id => {
  const it = G.has('item', id) ? G.get('item', id) : null, kind = it ? it.icon : id;
  G.ICON._it = G.ICON._it || {}; return G.ICON._it[kind] || (G.ICON._it[kind] = SPR(ITEM_ROWS[kind] || ITEM_ROWS.ring, ITEM_COL));
};
/** the stopped-clock icon (Stilled castles) and a candle */
G.ICON.clock = SPR(['.wwww.', 'w.k..w', 'w.k..w', 'w.kkkw', 'w....w', '.wwww.'], { w: '#c8c8d0', k: '#3a3a46' });
G.ICON.candle = SPR(['..o..', '.oyo.', '..y..', '.www.', '.www.', '.www.', '.www.', 'wwwww'], { o: '#ff7a2a', y: '#ffe040', w: '#f0e8d8' });
G.ICON.mana = SPR(['..c..', '.cwc.', 'cwcwc', '.cwc.', '..c..'], { c: '#6ad8ff', w: '#e8fcff' });
G.ICON.away = SPR(['.ww.', 'wkkw', 'wkkw', '.ww.', '.w..', 'w.w.'], { w: '#f0e8d8', k: '#4a6aa0' });

/* ---- prompt glyphs ---- */
const PS = { confirm: ['cross', '#7ab0ff'], cancel: ['circle', '#ff6a6a'], command: ['square', '#ff8ad8'], info: ['triangle', '#5ad8a0'] };
const XB = { confirm: ['A', '#5ad86a'], cancel: ['B', '#ff5a5a'], command: ['X', '#5a9aff'], info: ['Y', '#ffd040'] };
const PAD_LABEL = { prev: ['L1', 'LB'], next: ['R1', 'RB'], zoomOut: ['L2', 'LT'], zoomIn: ['R2', 'RT'], danger: ['L3', 'LS'], turn: ['R3', 'RS'], pause: ['OPTIONS', 'MENU'], up: ['↑'], down: ['↓'], left: ['←'], right: ['→'], move: ['STICK'] };
/** draw the glyph for an action on a device ('gamepad' | 'keyboard' | 'mouse'); returns its width */
G.glyph = (g, x, y, action, device, style) => {
  const S = style || G.glyphStyle();
  if (device === 'gamepad') {
    const fam = S === 'xbox' ? XB : PS, f = fam[action];
    if (f) {
      const cx = x + 5, cy = y + 4;
      px.disc(g, cx, cy, 5, '#1a1824'); px.disc(g, cx, cy, 4, '#2e2a3c');
      if (S === 'xbox') { E.font.text(g, f[0], cx, cy - 3, f[1], { align: 'center', outline: false }); }
      else if (f[0] === 'cross') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, f[1], 1); px.line(g, cx - 2, cy + 2, cx + 2, cy - 2, f[1], 1); }
      else if (f[0] === 'circle') { for (let a = 0; a < 16; a++) px.dot(g, cx + Math.round(Math.cos(a / 16 * Math.PI * 2) * 2.4), cy + Math.round(Math.sin(a / 16 * Math.PI * 2) * 2.4), f[1]); }
      else if (f[0] === 'square') { px.rect(g, cx - 2, cy - 2, 5, 1, f[1]); px.rect(g, cx - 2, cy + 2, 5, 1, f[1]); px.rect(g, cx - 2, cy - 2, 1, 5, f[1]); px.rect(g, cx + 2, cy - 2, 1, 5, f[1]); }
      else { px.line(g, cx, cy - 3, cx - 3, cy + 2, f[1], 1); px.line(g, cx, cy - 3, cx + 3, cy + 2, f[1], 1); px.rect(g, cx - 3, cy + 2, 7, 1, f[1]); }
      return 11;
    }
    const lab = PAD_LABEL[action] ? (S === 'xbox' && PAD_LABEL[action][1] ? PAD_LABEL[action][1] : PAD_LABEL[action][0]) : action.toUpperCase();
    return G.keycap(g, x, y, lab, '#3a3650', '#e8e4ff', true);
  }
  const inp = G.game && G.game.input, lab = G.keyLabel(action, device);
  if (device === 'mouse' && lab.mouse) return G.mouseIcon(g, x, y, lab.mouse);
  return G.keycap(g, x, y, lab.key || lab, '#e8e4f0', '#1a1824');
};
/** a keycap with a label; returns its width */
G.keycap = (g, x, y, text, bg, fg, round) => {
  const w = Math.max(9, E.font.width(text) + 5);
  px.rect(g, x, y + 1, w, 8, '#0a0810'); px.rect(g, x + 1, y, w - 2, 9, '#0a0810');
  px.rect(g, x + 1, y + 1, w - 2, 7, bg); if (!round) px.rect(g, x + 1, y + 7, w - 2, 1, E.tones(bg).sh);
  E.font.text(g, text, x + w / 2, y + 1, fg, { align: 'center', outline: false });
  return w + 1;
};
/** a mouse with a button lit: 'L' | 'R' | 'M' | 'W' (wheel); returns its width */
G.mouseIcon = (g, x, y, b) => {
  px.rect(g, x + 1, y, 6, 9, '#0a0810'); px.rect(g, x + 2, y + 1, 4, 7, '#e8e4f0'); px.rect(g, x + 3, y + 1, 1, 3, '#8a86a0');
  if (b === 'L') px.rect(g, x + 2, y + 1, 1, 3, '#ff8a3a'); if (b === 'R') px.rect(g, x + 4, y + 1, 2, 3, '#ff8a3a'); if (b === 'M' || b === 'W') px.rect(g, x + 3, y + 1, 1, 3, '#ff8a3a');
  return 9;
};
/** the keyboard label (and mouse button) of an action, from the player's own bindings */
G.keyLabel = (action, device) => {
  const inp = G.game && G.game.input;
  const fixed = { move: 'WASD', prev: 'Shift+Tab', next: 'Tab', zoomOut: '-', zoomIn: '=', help: 'F1', up: '↑↓', down: '↑↓', left: '←→', right: '←→' };
  if (['up', 'down', 'left', 'right'].includes(action) && device !== 'gamepad') return { key: fixed[action] };
  if (!inp) return { key: fixed[action] || action };
  const codes = (inp.map && inp.map[action]) || [];
  const mouse = codes.find(c => /^Mouse/.test(c)), key = codes.find(c => !/^(Mouse|Pad|Act:)/.test(c));
  const mb = mouse ? { Mouse0: 'L', Mouse1: 'M', Mouse2: 'R' }[mouse] : null;
  if (device === 'mouse' && mb) return { mouse: mb, key: key ? inp.codeLabel(key) : null };
  if (fixed[action] && !key) return { key: fixed[action] };
  return { key: key ? inp.codeLabel(key).toUpperCase().replace('ARROWUP', '↑') : (fixed[action] || action) };
};
/** PlayStation (default) or Xbox, from Settings */
G.glyphStyle = () => (G.game && G.game.settings && String(G.game.settings.glyphs).toLowerCase() === 'xbox' ? 'xbox' : 'playstation');

}

// ===== src/40-audio-music.js =====
{
// MUSIC: every song in the engine's step format ({ bpm, steps, tracks }), composed here. The Wheel motif
// (D4 - A4 - G4 - A4 - | F4 - E4 - D4 - - -) runs through every main theme, changed by season: Dorian for the title,
// Lydian Spring, Mixolydian Summer, an Autumn waltz in E minor, a still Winter in B minor, a ticking Hour, a Phrygian
// boss in 13-step bars, and the motif made major for the endings. Stings play once over the music.

const SONG = (id, o) => G.def('song', id, o);
const rep = (s, n) => Array(n).fill(s).join(' | ');
const tr = (wave, vol, notes, o = {}) => Object.assign({ wave, vol, notes }, o);

SONG('title', { bpm: 92, steps: 2, tracks: [
  tr('pulse', .13, 'D4 - A4 - G4 - A4 - | F4 - E4 - D4 - - - | C4 - D4 - E4 - F4 - | E4 - D4 - C4 - A3 - | D4 - A4 - G4 - A4 - | C5 - B4 - A4 - - - | G4 - F4 - E4 - G4 - | D4 - - - - - . .'),
  tr('triangle', .26, 'D2 - . D3 A2 - . D2 | D2 - . D3 A2 - . D2 | C2 - . C3 G2 - . C2 | A1 - . A2 E2 - . A1 | D2 - . D3 A2 - . D2 | G1 - . G2 D2 - . G1 | C2 - . C3 G2 - . C2 | D2 - - - D2 - . .'),
  tr('saw', .035, 'D3 - - - - - - - | F3 - - - - - - - | E3 - - - - - - - | C3 - - - - - - - | D3 - - - - - - - | B2 - - - - - - - | C3 - - - - - - - | A2 - - - - - - -'),
  tr('drums', .07, 'k . h . s . h . | k . h k s . h . ')] });
SONG('spring', { bpm: 104, steps: 2, tracks: [
  tr('pulse12', .12, 'F4 - C5 - B4 - C5 - | A4 - G4 - F4 - - - | A4 - B4 - C5 - D5 - | C5 - A4 - G4 - - - | F4 - C5 - B4 - C5 - | D5 - E5 - F5 - - - | E5 - D5 - C5 - B4 - | C5 - - - . . . .'),
  tr('triangle', .24, 'F2 . C3 . F2 . C3 . | F2 . C3 . F2 . A2 . | G2 . D3 . G2 . D3 . | C2 . G2 . C2 . G2 . | F2 . C3 . F2 . C3 . | D2 . A2 . D2 . A2 . | C2 . G2 . C2 . G2 . | F2 . C3 . F2 - - -'),
  tr('drums', .05, 'k . h h . h h . | k . h h s h h .')] });
SONG('summer', { bpm: 116, steps: 2, tracks: [
  tr('square', .1, 'A4 - E5 - D5 - E5 - | C#5 - B4 - A4 - - - | G4 - A4 - B4 - D5 - | E5 - - - D5 - - - | A4 - E5 - D5 - E5 - | F#5 - G5 - A5 - - - | G5 - E5 - D5 - B4 - | A4 - - - . . . .'),
  tr('triangle', .26, 'A2 . A2 . E2 . A2 . | A2 . A2 . E2 . A2 . | G2 . G2 . D2 . G2 . | D2 . D2 . A1 . D2 . | A2 . A2 . E2 . A2 . | D2 . D2 . A1 . D2 . | G2 . G2 . D2 . G2 . | A2 . E2 . A2 - - -'),
  tr('drums', .08, 'k . s s k . s . | k k s s k . s s')] });
SONG('autumn', { bpm: 96, steps: 4, tracks: [
  tr('triangle', .16, 'E4 - - - B4 - - - A4 - - - | B4 - - - G4 - - - F#4 - - - | E4 - - - G4 - - - B4 - - - | A4 - - - - - - - . . . . | C5 - - - B4 - - - A4 - - - | G4 - - - F#4 - - - E4 - - - | F#4 - - - G4 - - - A4 - - - | E4 - - - - - - - . . . .'),
  tr('saw', .03, 'E3 - - - G3 - - - B3 - - - | D3 - - - F#3 - - - A3 - - - | C3 - - - E3 - - - G3 - - - | B2 - - - D#3 - - - F#3 - - - | A2 - - - C3 - - - E3 - - - | G2 - - - B2 - - - D3 - - - | F#2 - - - A2 - - - C3 - - - | B2 - - - - - - - . . . .'),
  tr('triangle', .2, 'E2 - - - . . . . . . . . | D2 - - - . . . . . . . . | C2 - - - . . . . . . . . | B1 - - - . . . . . . . . | A1 - - - . . . . . . . . | G1 - - - . . . . . . . . | F#1 - - - . . . . . . . . | B1 - - - . . . . . . . .'),
  tr('drums', .04, 'k . . . h . . . h . . .')] });
SONG('winter', { bpm: 72, steps: 2, tracks: [
  tr('sine', .14, 'B4 - F#5 - E5 - F#5 - | D5 - C#5 - B4 - - - | . . . . . . . . | D5 - E5 - F#5 - - - | B4 - F#5 - E5 - F#5 - | G5 - F#5 - E5 - - - | D5 - - - C#5 - - - | B4 - - - - - - -'),
  tr('pulse12', .05, '. . . B5 . . . . | . . F#6 . . . . . | . . . . . D6 . . | . . . . . . . . | . . . B5 . . . . | . . E6 . . . . . | . . . . . C#6 . . | . . . . . . . .'),
  tr('sine', .12, 'B2 - - - - - - - | G2 - - - - - - - | D3 - - - - - - - | A2 - - - - - - - | B2 - - - - - - - | E2 - - - - - - - | F#2 - - - - - - - | B2 - - - - - - -')] });
SONG('battle_attack', { bpm: 140, steps: 4, tracks: [
  tr('square', .09, 'D5 - - - A4 - - - D5 - E5 - F5 - - - | E5 - D5 - C5 - A4 - - - - - . . . . | D5 - - - A4 - - - D5 - E5 - F5 - G5 - | A5 - - - G5 - F5 - E5 - D5 - - - . .'),
  tr('saw', .07, 'D2 . D2 . D3 . D2 . D2 . D2 . D3 . D2 . | C2 . C2 . C3 . C2 . A1 . A1 . A2 . A1 . | Bb1 . Bb1 . Bb2 . Bb1 . C2 . C2 . C3 . C2 . | D2 . D2 . D3 . D2 . A1 . A1 . A2 . C2 .'),
  tr('drums', .09, 'k . h . s . h . k k h . s . h h'),
  tr('square', .06, 'A5 . A5 . A5 . A5 . G5 . G5 . G5 . G5 . | F5 . F5 . F5 . F5 . E5 . E5 . E5 . E5 .', { name: 'tension', on: false })] });
SONG('battle_defend', { bpm: 128, steps: 4, tracks: [
  tr('pulse', .1, 'G4 - - - D5 - - - C5 - - - D5 - - - | Bb4 - - - A4 - - - G4 - - - - - - - | Eb5 - - - D5 - - - C5 - - - Bb4 - - - | A4 - - - Bb4 - - - C5 - - - D5 - - -'),
  tr('triangle', .25, 'G2 . . G2 . . G2 . G2 . . G2 . . D2 . | Eb2 . . Eb2 . . Eb2 . D2 . . D2 . . D2 . | C2 . . C2 . . C2 . Bb1 . . Bb1 . . Bb1 . | D2 . . D2 . . D2 . D2 . . D2 . A1 . D2 .'),
  tr('drums', .08, 'k . . o . . s . k . o . s . o o'),
  tr('pulse', .05, 'D6 . . D6 . . D6 . D6 . . D6 . . D6 .', { name: 'tension', on: false })] });
SONG('hourless', { bpm: 100, steps: 4, tracks: [
  tr('saw', .06, 'C5 - - - B4 - - - Bb4 - - - A4 - - - | Ab4 - - - G4 - - - F#4 - - - G4 - - - | C5 - - - Eb5 - - - D5 - - - C5 - - - | B4 - - - - - - - G4 - - - - - - -'),
  tr('triangle', .24, 'C2 - . . C2 - . . Ab1 - . . Ab1 - . . | F1 - . . F1 - . . G1 - . . G1 - . .'),
  tr('drums', .07, 'c . t . c . t . c . t . c . t t')] });
SONG('boss', { bpm: 150, steps: 4, tracks: [
  tr('square', .09, 'E5 - F5 - E5 - - - B4 - C5 - D5 | E5 - F5 - G5 - F5 - E5 - - - . | E5 - F5 - E5 - - - B4 - C5 - B4 | A4 - G4 - F4 - E4 - - - - - .'),
  tr('saw', .07, 'E2 . E2 . E3 . E2 . F2 . F2 . E2 | E2 . E2 . E3 . E2 . G2 . F2 . E2 | E2 . E2 . E3 . E2 . F2 . F2 . E2 | D2 . D2 . C2 . C2 . F2 . F2 . E2'),
  tr('drums', .1, 'k . s . k k s . k . s . o')] });
SONG('event', { bpm: 84, steps: 2, tracks: [
  tr('triangle', .13, 'D4 - A4 - G4 - A4 - | F4 - E4 - D4 - - - | . . . . . . . . | C4 - D4 - E4 - - -'),
  tr('pulse12', .05, 'D3 - - - F3 - - - | A2 - - - D3 - - - | C3 - - - E3 - - - | A2 - - - - - - -')] });
SONG('ending', { bpm: 80, steps: 2, tracks: [
  tr('pulse', .12, 'D4 - A4 - G4 - A4 - | F#4 - E4 - D4 - - - | G4 - A4 - B4 - D5 - | C#5 - - - A4 - - - | D5 - C#5 - B4 - A4 - | G4 - F#4 - E4 - - - | F#4 - G4 - A4 - B4 - | D5 - - - - - - -'),
  tr('triangle', .24, 'D2 - - - A2 - - - | D2 - - - F#2 - - - | G2 - - - D2 - - - | A2 - - - E2 - - - | B1 - - - F#2 - - - | G1 - - - D2 - - - | A1 - - - E2 - - - | D2 - - - - - - -'),
  tr('saw', .03, 'F#3 - - - - - - - | A3 - - - - - - - | B3 - - - - - - - | C#4 - - - - - - - | D4 - - - - - - - | B3 - - - - - - - | C#4 - - - - - - - | D4 - - - - - - -'),
  tr('drums', .05, 'k . . . h . . . | k . . . s . h .')] });
// stings: 2 bars or less, once over the music
SONG('season_spring', { bpm: 120, steps: 4, tracks: [tr('pulse12', .14, 'F5 - A5 - C6 - B5 - A5 - - - - - - - . . . .'), tr('triangle', .2, 'F3 - - - C4 - - - F3 - - - - - - - . . . .')] });
SONG('season_summer', { bpm: 120, steps: 4, tracks: [tr('square', .11, 'A4 - C#5 - E5 - A5 - G5 - - - A5 - - - . . . .'), tr('drums', .1, 's s s s k . . . s . k . . . . .')] });
SONG('season_autumn', { bpm: 96, steps: 4, tracks: [tr('triangle', .15, 'E5 - - - B4 - - - G4 - - - E4 - - - - - - -'), tr('saw', .04, 'E3 - - - - - - - - - - - B2 - - - - - - -')] });
SONG('season_winter', { bpm: 80, steps: 4, tracks: [tr('sine', .15, 'B5 - - - F#5 - - - D5 - - - B4 - - - - - - -'), tr('pulse12', .05, '. . B6 . . . F#6 . . . D6 . . . . . . . . .')] });
SONG('victory', { bpm: 132, steps: 4, tracks: [tr('square', .11, 'D5 - D5 - D5 - A5 - - - F#5 - - - A5 - - - - - - - . . . .'), tr('triangle', .24, 'D3 - D3 - D3 - D3 - - - D3 - - - D3 - - - - - - - . . . .'), tr('drums', .08, 's s s s k . . . s . k . . . . . . . . .')] });
SONG('defeat', { bpm: 72, steps: 4, tracks: [tr('triangle', .15, 'D4 - - - C4 - - - Bb3 - - - A3 - - - - - - - - - - -'), tr('saw', .04, 'D3 - - - - - - - G2 - - - - - - - A2 - - - - - - -')] });
SONG('levelup', { bpm: 160, steps: 4, tracks: [tr('pulse', .1, 'C5 E5 G5 C6 - - E6 - G6 - - -')] });
SONG('promote', { bpm: 140, steps: 4, tracks: [tr('square', .1, 'G4 B4 D5 G5 - - B5 - D6 - - - G6 - - -'), tr('triangle', .2, 'G2 - - - D3 - - - G3 - - - - - - -')] });
SONG('summon', { bpm: 120, steps: 4, tracks: [tr('sine', .14, 'C4 G4 C5 E5 G5 C6 - - - -'), tr('saw', .04, 'C3 - - - - - - - - -')] });
SONG('capture', { bpm: 140, steps: 4, tracks: [tr('pulse12', .12, 'E5 . E5 . G5 . B5 - - - -')] });
SONG('candle', { bpm: 60, steps: 4, tracks: [tr('saw', .05, 'C2 - - - - - - - - - - - - - - -'), tr('drums', .06, 'c . . . c . . . c . . . c . . .')] });

/** the campaign song for a season */
G.seasonSong = s => G.get('song', s);
G.music = (id, o = {}) => { const a = G.game && G.game.audio; if (!a) return; if (!id) { a.stopMusic(o.fade || .5); G.curSong = null; return; } if (G.curSong === id && !o.restart) return; G.curSong = id; try { a.music(G.get('song', id), Object.assign({ fade: .8 }, o)); } catch (e) { G.game.fail('music', e); } };
G.sting = (id, o = {}) => { const a = G.game && G.game.audio; if (!a || !G.has('song', id)) return; try { a.sting(G.get('song', id), Object.assign({ at: 'now', duck: .4 }, o)); } catch (e) { G.game.fail('sting', e); } };
G.layer = (name, vol, fade = .8) => { const a = G.game && G.game.audio; if (a && a.layer) try { a.layer(name, vol, fade); } catch (e) { /* the song has no such layer */ } };

}

// ===== src/41-audio-sfx.js =====
{
// SOUND EFFECTS: defined in code (audio.define) as chip voices or layered lists of voices. UI, battle (bells,
// weapons, spells by season, support, statuses, outcomes, creatures), world and timers. G.sfx(name) plays one safely.

G.SFX = {
  ui_move: { wave: 'pulse12', freq: 'E6', dur: .03, vol: .08 },
  ui_confirm: [{ wave: 'pulse', freq: 'C6', dur: .05, vol: .12 }, { wave: 'pulse', freq: 'G6', dur: .08, vol: .1, delay: .045 }],
  ui_cancel: [{ wave: 'pulse', freq: 'G5', dur: .05, vol: .1 }, { wave: 'pulse', freq: 'C5', dur: .08, vol: .09, delay: .045 }],
  ui_error: { wave: 'square', freq: 'C3', to: 'A2', dur: .14, vol: .12 },
  ui_open: { wave: 'triangle', freq: 'C5', to: 'G5', dur: .1, vol: .14 },
  bell_toll: [{ wave: 'sine', freq: 'G3', dur: 1.6, vol: .28, vib: [5, .004] }, { wave: 'sine', freq: 'G4', dur: 1.1, vol: .1 }, { wave: 'triangle', freq: 'D5', dur: .7, vol: .05 }],
  sword_clang: [{ wave: 'noise', freq: 4200, to: 2000, dur: .09, vol: .2, filter: 'bandpass', q: 3 }, { wave: 'square', freq: 1760, to: 1400, dur: .12, vol: .06 }],
  slash_whoosh: { wave: 'noise', freq: 900, to: 2600, dur: .14, vol: .14, filter: 'bandpass', q: 1.4 },
  bow_twang: [{ wave: 'triangle', freq: 'A4', to: 'E4', dur: .12, vol: .16 }, { wave: 'noise', freq: 3000, dur: .05, vol: .06 }],
  arrow_hit: { wave: 'noise', freq: 1600, to: 500, dur: .07, vol: .16 },
  cast_charge: { wave: 'sine', freq: 'C4', to: 'C5', dur: .4, vol: .12, vib: [9, .02] },
  spell_spring: [{ wave: 'sine', freq: 'C6', dur: .12, vol: .1 }, { wave: 'sine', freq: 'E6', dur: .12, vol: .1, delay: .07 }, { wave: 'sine', freq: 'G6', dur: .16, vol: .1, delay: .14 }, { wave: 'sine', freq: 'C7', dur: .2, vol: .08, delay: .21 }],
  spell_summer: [{ wave: 'noise', freq: 300, to: 1800, dur: .4, vol: .22, filter: 'lowpass' }, { wave: 'saw', freq: 'A2', to: 'E3', dur: .35, vol: .06 }],
  spell_autumn: [{ wave: 'noise', freq: 2500, dur: .35, vol: .08, filter: 'highpass' }, { wave: 'triangle', freq: 'E3', to: 'B2', dur: .4, vol: .14 }],
  spell_winter: [{ wave: 'sine', freq: 'B6', to: 'F#6', dur: .35, vol: .08, vib: [14, .03] }, { wave: 'triangle', freq: 'B5', dur: .3, vol: .07, delay: .05 }, { wave: 'noise', freq: 6000, dur: .2, vol: .04, filter: 'highpass' }],
  spell_hour: [{ wave: 'square', freq: 'C5', dur: .03, vol: .08 }, { wave: 'square', freq: 'G4', dur: .03, vol: .08, delay: .12 }, { wave: 'square', freq: 'C5', dur: .03, vol: .08, delay: .24 }, { wave: 'saw', freq: 'C4', to: 'C3', dur: .4, vol: .05 }],
  spell_none: [{ wave: 'sine', freq: 'D5', dur: .5, vol: .12 }, { wave: 'sine', freq: 'A5', dur: .5, vol: .09, delay: .05 }, { wave: 'sine', freq: 'D6', dur: .6, vol: .07, delay: .1 }],
  heal: [{ wave: 'sine', freq: 'C5', to: 'G5', dur: .2, vol: .12 }, { wave: 'sine', freq: 'E5', to: 'C6', dur: .25, vol: .1, delay: .08 }],
  buff: { wave: 'pulse', freq: 'C5', dur: .3, vol: .1, arp: [0, 4, 7, 12], step: .06 },
  debuff: { wave: 'pulse', freq: 'C5', dur: .3, vol: .1, arp: [12, 7, 3, 0], step: .06 },
  poison: { wave: 'square', freq: 'C3', to: 'A2', dur: .2, vol: .1, vib: [20, .1] },
  burn: { wave: 'noise', freq: 800, to: 300, dur: .25, vol: .14, filter: 'lowpass' },
  chill: { wave: 'sine', freq: 'G6', to: 'C6', dur: .2, vol: .08 },
  sleep: [{ wave: 'sine', freq: 'G4', to: 'D4', dur: .3, vol: .1 }, { wave: 'sine', freq: 'D4', to: 'G3', dur: .3, vol: .08, delay: .25 }],
  stop: [{ wave: 'square', freq: 'C5', dur: .03, vol: .1 }, { wave: 'square', freq: 'C5', dur: .03, vol: .1, delay: .25 }],
  crit: [{ wave: 'noise', freq: 2400, to: 600, dur: .18, vol: .22 }, { wave: 'square', freq: 'C6', to: 'C5', dur: .15, vol: .08 }],
  miss: { wave: 'noise', freq: 1200, to: 3000, dur: .12, vol: .06, filter: 'highpass' },
  ko_monster: [{ wave: 'square', freq: 'G4', to: 'C3', dur: .3, vol: .12 }, { wave: 'noise', freq: 800, to: 200, dur: .3, vol: .1 }],
  ko_knight: [{ wave: 'saw', freq: 'D3', dur: .5, vol: .12 }, { wave: 'saw', freq: 'A2', dur: .7, vol: .1, delay: .3 }],
  capture: [{ wave: 'square', freq: 'C6', dur: .04, vol: .08 }, { wave: 'square', freq: 'E6', dur: .04, vol: .08, delay: .06 }, { wave: 'square', freq: 'G6', dur: .04, vol: .08, delay: .12 }, { wave: 'noise', freq: 5000, dur: .2, vol: .05, delay: .1 }],
  summon_rise: { wave: 'sine', freq: 'C3', to: 'C6', dur: .7, vol: .14, vib: [6, .02] },
  roar_small: { wave: 'saw', freq: 'A3', to: 'E3', dur: .25, vol: .1, vib: [30, .05] },
  roar_large: [{ wave: 'saw', freq: 'D2', to: 'A1', dur: .6, vol: .16, vib: [24, .06] }, { wave: 'noise', freq: 400, dur: .5, vol: .1, filter: 'lowpass' }],
  growl: { wave: 'saw', freq: 'F2', to: 'D2', dur: .35, vol: .12, vib: [26, .08] },
  chirp: [{ wave: 'sine', freq: 'C7', to: 'G6', dur: .05, vol: .08 }, { wave: 'sine', freq: 'E7', to: 'A6', dur: .05, vol: .07, delay: .07 }],
  flap: { wave: 'noise', freq: 600, to: 300, dur: .08, vol: .1, filter: 'lowpass' },
  march_drums: [{ wave: 'noise', freq: 200, dur: .12, vol: .2, filter: 'lowpass' }, { wave: 'noise', freq: 200, dur: .12, vol: .16, filter: 'lowpass', delay: .25 }, { wave: 'noise', freq: 220, dur: .2, vol: .22, filter: 'lowpass', delay: .5 }],
  banner_flip: { wave: 'noise', freq: 1500, to: 900, dur: .2, vol: .08 },
  castle_taken: [{ wave: 'square', freq: 'C4', dur: .15, vol: .1 }, { wave: 'square', freq: 'G4', dur: .15, vol: .1, delay: .15 }, { wave: 'square', freq: 'C5', dur: .3, vol: .1, delay: .3 }],
  candle_hiss: { wave: 'noise', freq: 3000, to: 800, dur: .6, vol: .06, filter: 'highpass' },
  tide: { wave: 'sine', freq: 'E4', to: 'B4', dur: .5, vol: .1, vib: [4, .03] },
  timer_tick: { wave: 'square', freq: 'C6', dur: .02, vol: .06 },
  dial: [{ wave: 'sine', freq: 'A5', dur: .6, vol: .12 }, { wave: 'sine', freq: 'E6', dur: .6, vol: .08, delay: .1 }],
  wheel: [{ wave: 'sine', freq: 'D4', dur: 1.5, vol: .12 }, { wave: 'sine', freq: 'A4', dur: 1.5, vol: .1, delay: .15 }, { wave: 'sine', freq: 'D5', dur: 1.5, vol: .08, delay: .3 }, { wave: 'sine', freq: 'F#5', dur: 1.5, vol: .07, delay: .45 }],
  step_soft: { wave: 'noise', freq: 500, dur: .03, vol: .04, filter: 'lowpass' },
  levelup_sfx: { wave: 'pulse', freq: 'C5', dur: .4, vol: .1, arp: [0, 4, 7, 12, 16], step: .05 }
};
/** creature voices by species voice tag */
G.CREATURE = { chirp: 'chirp', neigh: 'roar_small', hiss: 'burn', growl: 'growl', roar: 'roar_large', giggle: 'chirp', creak: 'growl', moan: 'growl', screech: 'chirp', grunt: 'growl', mew: 'chirp', howl: 'roar_small', grind: 'roar_large', tick: 'stop', rattle: 'stop', squeak: 'chirp', blub: 'poison' };
G.defineSfx = () => { const a = G.game.audio; for (const [k, v] of Object.entries(G.SFX)) a.define(k, v); };
G.sfx = (name, o) => { const a = G.game && G.game.audio; if (!a || G.muteAll) return; try { a.sfx(name, o); } catch (e) { /* unknown sound: tests catch it */ } };
G.spellSfx = elem => G.sfx('spell_' + (['spring', 'summer', 'autumn', 'winter', 'hour'].includes(elem) ? elem : 'none'));

}

// ===== src/42-audio-voice.js =====
{
// VOICES: Animalese-style babble. Each typed letter of a line makes a sound: a vowel a short tone burst through a
// band-pass formant (a 800 Hz, e 1200, i 2200, o 600, u 400, x the profile's formant), a consonant a short high-passed
// noise tick, capitals a little louder, '?' bends the last syllables up, '!' is louder and faster; '.' ',' '...' pause.
// G.voice.plan(profile, text) is the pure schedule (tests use it); G.voice.letter(profile, ch, i, text) plays one
// letter as the dialog types it (the engine's per-letter Dialog voice hook). Everything goes through audio.sfxBus, so it
// follows volume and mute; it is silent headless and when Settings > Voices is Off. Monsters don't babble.

const FORMANT = { a: 800, e: 1200, i: 2200, o: 600, u: 400, y: 1800 };
const V = G.voice = {};
V.profileOf = id => {
  if (id === 'narrator') return null;
  if (id === 'herald') return { base: 160, range: 5, wave: 'square', formant: 1, rate: 1.1 };
  if (id === 'keeper') return { base: 120, range: 4, wave: 'triangle', formant: .9, rate: .8, breath: .4 };
  if (G.has('knight', id)) return G.get('knight', id).voice || { base: 180, range: 6, wave: 'pulse', formant: 1, rate: 1 };
  return { base: 180, range: 6, wave: 'pulse', formant: 1, rate: 1 };
};
/** the schedule of syllables for a line: [{ t, dur, kind: 'v' | 'c', freq, formant, gain }] (pure) */
V.plan = (p, text) => {
  if (!p) return [];
  const out = [], clean = String(text).replace(/\{[^}]*\}/g, ''); let t = 0;
  const q = clean.trim().endsWith('?'), ex = clean.includes('!');
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i], lo = ch.toLowerCase();
    if (ch === '.' && clean.slice(i, i + 3) === '...') { t += .25; i += 2; continue; }
    if (ch === '.') { t += .12; continue; } if (ch === ',') { t += .08; continue; }
    if (!/[a-z]/i.test(ch)) { t += .02; continue; }
    const step = .055 / (p.rate || 1) / (ex ? 1.15 : 1);
    if (FORMANT[lo]) {
      const h = G.hashStr(lo + i % 3), semis = (h % (p.range || 6)) - (p.range || 6) / 2 + (q && i > clean.length - 8 ? 3 : 0);
      out.push({ t, dur: .045 + (h % 25) / 1000, kind: 'v', freq: p.base * Math.pow(2, semis / 12), formant: FORMANT[lo] * (p.formant || 1), gain: (ch !== lo ? 1.25 : 1) * (ex ? 1.2 : 1) });
    } else out.push({ t, dur: .015 + (G.hashStr(lo) % 15) / 1000, kind: 'c', freq: 3000 + (G.hashStr(lo) % 2000), gain: .3 });
    t += step;
  }
  return out;
};
/** play one syllable now through the effects bus */
V.play = (p, syl) => {
  const a = G.game && G.game.audio; if (!a || !a.ctx || !a.sfxBus || !p) return;
  if (G.game.settings && G.game.settings.voices === 'Off') return;
  const c = a.ctx, t0 = c.currentTime + .005, g = c.createGain(); g.connect(a.sfxBus);
  const vol = .09 * syl.gain;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .005); g.gain.exponentialRampToValueAtTime(.0005, t0 + syl.dur);
  if (syl.kind === 'v') {
    const voices = [p.double ? [1, Math.pow(2, p.double / 12)] : [1]].flat();
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = syl.formant; bp.Q.value = 2.2; bp.connect(g);
    const dry = c.createGain(); dry.gain.value = .55; dry.connect(g);
    for (const m of voices) {
      const o = c.createOscillator(); o.type = p.wave === 'saw' ? 'sawtooth' : p.wave === 'pulse' ? 'square' : ['sine', 'square', 'triangle'].includes(p.wave) ? p.wave : 'square';
      o.frequency.setValueAtTime(syl.freq * m, t0);
      if (p.vibrato) o.frequency.linearRampToValueAtTime(syl.freq * m * (1 + p.vibrato), t0 + syl.dur);
      o.connect(bp); o.connect(dry); o.start(t0); o.stop(t0 + syl.dur + .02);
    }
  } else {
    const src = c.createBufferSource(); src.buffer = a._noise; if (!src.buffer) return;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = syl.freq; src.connect(hp); hp.connect(g); src.start(t0, Math.random() * .3); src.stop(t0 + syl.dur + .02);
  }
};
/** the Dialog's per-letter hook: plays the syllable for letter i of the page */
V.letter = (p, ch, i) => {
  if (!p || !/[a-z]/i.test(ch)) return;
  const lo = ch.toLowerCase();
  if (FORMANT[lo]) { const h = G.hashStr(lo + i % 3), semis = (h % (p.range || 6)) - (p.range || 6) / 2; V.play(p, { dur: .045 + (h % 25) / 1000, kind: 'v', freq: p.base * Math.pow(2, semis / 12), formant: FORMANT[lo] * (p.formant || 1), gain: ch !== lo ? 1.25 : 1 }); }
  else if (i % 2 === 0) V.play(p, { dur: .02, kind: 'c', freq: 3000 + (G.hashStr(lo) % 2000), gain: .3 });
};

}

// ===== src/50-ui-kit.js =====
{
// THE 10-FOOT UI KIT: windows, text, bars, the focus model (d-pad and stick move it in 2D, hover moves it when the
// pointer really moves, a click picks, a right click goes back, the wheel scrolls), lists of at most 8 rows (5 at
// Large), the prompt bar (glyphs follow the last device), toasts, confirms and one-card tips. Everything draws in
// screen pixels inside r.overlay, anchored to r.W and r.H, clear of the corner buttons.

const { px: UX, font: FONT, ui: EUI } = E;
const UI = G.UI = {};
UI.COL = { bg: '#141a3a', bg2: '#1e2650', border: '#e8e4ff', text: '#ffffff', dim: '#b8b0c8', gold: '#ffd36a', good: '#7ae07a', bad: '#ff6a5a', focus: '#ffe070', panel: '#10142c' };
/** text scale for panels: 1, or 2 with Settings > UI scale: Large */
UI.k = () => (G.game && G.game.settings && G.game.settings.uiScale === 'Large' ? 2 : 1);
UI.lh = () => FONT.lineHeight() * UI.k() + 3 * UI.k();
UI.maxRows = () => (UI.k() > 1 ? 5 : 8);
UI.text = (g, s, x, y, color = UI.COL.text, o = {}) => FONT.text(g, String(s), Math.round(x), Math.round(y), color, Object.assign({ shadow: '#000000', outline: false, scale: o.scale || UI.k() }, o));
UI.width = (s, o = {}) => FONT.width(String(s), Object.assign({ scale: o.scale || UI.k() }, o));
UI.box = (g, x, y, w, h, o = {}) => EUI.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: [UI.COL.bg2, UI.COL.bg], border: UI.COL.border, alpha: .92 }, o));
UI.bar = (g, x, y, w, h, frac, color, back = '#0a0a14') => { UX.rect(g, x, y, w, h, back); UX.rect(g, x + 1, y + 1, Math.max(0, Math.round((w - 2) * G.clamp(frac, 0, 1))), h - 2, color); UX.rect(g, x + 1, y + 1, Math.max(0, Math.round((w - 2) * G.clamp(frac, 0, 1))), 1, E.tones(color).hi); };
/** a labelled bar with its number: 'HP 45/60' */
UI.statBar = (g, x, y, w, label, v, max, color) => { const k = UI.k(); UI.text(g, label, x, y, UI.COL.dim); const lw = 22 * k; UI.bar(g, x + lw, y + 1, w - lw - 30 * k, 5 * k, v / Math.max(1, max), color); UI.text(g, Math.round(v) + (max !== null ? '' : ''), x + w - 28 * k, y, UI.COL.text); };
UI.title = (g, s, x, y, o = {}) => FONT.title(g, s, x, y, Object.assign({ scale: 2, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 2, depthColor: '#5a2a1a', align: 'center' }, o));
/** the focus frame round a rect: a bright frame, an arrow and a small bounce */
UI.focusFrame = (g, x, y, w, h, t) => {
  const b = Math.round(Math.sin(t * 8) * 1);
  UX.rect(g, x - 1, y - 1, w + 2, 1, UI.COL.focus); UX.rect(g, x - 1, y + h, w + 2, 1, UI.COL.focus); UX.rect(g, x - 1, y - 1, 1, h + 2, UI.COL.focus); UX.rect(g, x + w, y - 1, 1, h + 2, UI.COL.focus);
  UX.poly(g, [[x - 6 + b, y + h / 2 - 3], [x - 2 + b, y + h / 2], [x - 6 + b, y + h / 2 + 3]], UI.COL.focus);
};

/**
 * the focus model: st = { f: index, hp: last pointer }; items = [{ x, y, w, h, disabled }]; o: { wrap, cols, back,
 * noKeys }. Moves the focus, and returns 'pick' (confirm or a click on an item), 'back' (cancel or a right click) or null.
 */
/** stand-in geometry for items not yet drawn (headless tests, the first step): a column, or a row */
UI.synth = (n, cols = 1) => Array.from({ length: n }, (_, i) => ({ x: (i % cols) * 20, y: Math.floor(i / cols) * 20, w: 10, h: 10 }));
UI.nav = (st, items, o = {}) => {
  const inp = G.inp(); if (!items.length) { if (inp.pressed('cancel')) return 'back'; return null; }
  if (st.f === undefined || st.f >= items.length) st.f = 0;
  const before = st.f;
  if (!o.noKeys) {
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [a, dx, dy] of dirs) {
      if (!G.repeat(a)) continue;
      if (o.horizontal === false && dx) continue;
      const cur = items[st.f], cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
      let best = -1, bd = Infinity;
      items.forEach((it, i) => {
        if (i === st.f) return;
        const ix = it.x + it.w / 2, iy = it.y + it.h / 2, ddx = ix - cx, ddy = iy - cy, along = ddx * dx + ddy * dy;
        if (along <= 1) return;
        const across = Math.abs(dx ? ddy : ddx), d = along + across * 2.5;
        if (d < bd) { bd = d; best = i; }
      });
      if (best < 0 && o.wrap !== false && (dy && !dx)) best = dy > 0 ? 0 : items.length - 1;
      if (best >= 0) st.f = best;
    }
  }
  // the mouse: hover focuses when it really moved; a click on an item picks it; the wheel scrolls
  const p = inp.pointer ? inp.pointer() : null, moved = p && (!st.hp || p[0] !== st.hp[0] || p[1] !== st.hp[1]);
  const hit = q => q ? items.findIndex(it => q[0] >= it.x && q[0] < it.x + it.w && q[1] >= it.y && q[1] < it.y + it.h) : -1;
  if (moved && inp.lastDevice === 'mouse') { const i = hit(p); if (i >= 0) st.f = i; }
  st.hp = p ? p.slice() : null;
  const z = inp.zoom ? inp.zoom() : 1;
  if (o.wheel && z !== 1) st.f = G.clamp(st.f + (z > 1 ? -1 : 1), 0, items.length - 1);
  if (st.f !== before) G.sfx('ui_move');
  const c = inp.clicked && inp.clicked();
  if (c) { const i = hit(c); if (i >= 0) { st.f = i; return items[i].disabled ? (G.sfx('ui_error'), UI.why = items[i].disabled, null) : 'pick'; } }
  // the left button is also a confirm, but in a list only the click on an item picks (and the click picks that item)
  if (inp.pressed('confirm') && inp.lastDevice !== 'mouse') {
    if (items[st.f].disabled) { G.sfx('ui_error'); UI.why = items[st.f].disabled; return null; }
    return 'pick';
  }
  if (inp.pressed('cancel')) return 'back';
  return null;
};

/** a vertical list with scrolling: rows = [{ label, sub, right, disabled, color, icon(g, x, y) }]; draws and navigates */
class List {
  constructor(o = {}) { this.st = { f: 0 }; this.top = 0; this.o = o; this.items = []; }
  /** lay out at (x, y), w wide, at most `rows` rows */
  layout(rows, x, y, w) {
    const lh = (this.o.lh || UI.lh()) + (this.o.pad || 2), max = this.o.rows || UI.maxRows();
    this.rows = rows; this.x = x; this.y = y; this.w = w; this.lhh = lh;
    if (this.st.f >= rows.length) this.st.f = Math.max(0, rows.length - 1);
    if (this.st.f < this.top) this.top = this.st.f; if (this.st.f >= this.top + max) this.top = this.st.f - max + 1;
    this.top = G.clamp(this.top, 0, Math.max(0, rows.length - max));
    this.vis = rows.slice(this.top, this.top + max);
    this.items = this.vis.map((r, i) => ({ x, y: y + i * lh, w, h: lh - 1, disabled: r.disabled }));
    this.h = this.vis.length * lh;
    return this;
  }
  /** returns 'pick' | 'back' | null; this.sel is the row */
  update(rows) {
    if (rows) this.layout(rows, this.x || 0, this.y || 0, this.w || 100);
    if (!this.rows) return null;
    const st = { f: this.st.f - this.top, hp: this.st.hp }, before = this.st.f;
    // moving past the visible window scrolls
    const inp = G.inp(); let res = null;
    if (this.rows.length > this.vis.length && (G.repeat('down') && st.f === this.vis.length - 1 || G.repeat('up') && st.f === 0)) {
      const d = inp.down('down') ? 1 : -1; this.st.f = G.clamp(this.st.f + d, 0, this.rows.length - 1); if (this.st.f !== before) G.sfx('ui_move');
      if (inp.pressed('cancel')) return 'back';
      return null;
    }
    res = UI.nav(st, this.items, { wheel: true, horizontal: false, wrap: this.rows.length <= this.vis.length });
    this.st.f = this.top + (st.f || 0); this.st.hp = st.hp;
    const z = inp.zoom ? inp.zoom() : 1; if (z !== 1 && this.rows.length > this.vis.length) this.st.f = G.clamp(this.st.f + (z > 1 ? -1 : 1), 0, this.rows.length - 1);
    return res;
  }
  get sel() { return this.rows ? this.rows[this.st.f] : null; }
  get index() { return this.st.f; }
  set index(i) { this.st.f = i; }
  draw(g, t, focused = true) {
    const k = UI.k();
    this.vis.forEach((r, i) => {
      const it = this.items[i], on = this.top + i === this.st.f, y = it.y + 1;
      if (on && focused) UX.rect(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, '#2e3a78');
      let x = it.x + 2;
      if (r.icon) { r.icon(g, x, y); x += 12 * k; }
      UI.text(g, r.label, x, y, r.disabled ? '#6a6680' : r.color || (on ? UI.COL.focus : UI.COL.text));
      if (r.right !== undefined) UI.text(g, r.right, it.x + it.w - 2, y, r.disabled ? '#6a6680' : r.rightColor || UI.COL.dim, { align: 'right' });
      if (on && focused) UI.focusFrame(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, t);
    });
    if (this.top > 0) UX.poly(g, [[this.x + this.w / 2 - 3, this.y - 3], [this.x + this.w / 2 + 3, this.y - 3], [this.x + this.w / 2, this.y - 6]], UI.COL.dim);
    if (this.top + this.vis.length < this.rows.length) { const yb = this.y + this.h + 1; UX.poly(g, [[this.x + this.w / 2 - 3, yb], [this.x + this.w / 2 + 3, yb], [this.x + this.w / 2, yb + 3]], UI.COL.dim); }
  }
}
UI.List = List;

/** the prompt bar: [[action, verb], ...] as glyph + verb, bottom centre */
UI.prompts = (r, list, o = {}) => {
  G.lastPrompts = list.map(p => p[1]);
  r.overlay(g => {
    const dev = G.device(), k = UI.k();
    const parts = list.map(([a, verb]) => ({ a, verb, w: 0 }));
    // measure
    let total = 0; for (const p of parts) { p.w = G.glyphW(p.a, dev) + 3 + UI.width(p.verb) + 9; total += p.w; }
    let x = Math.round((r.W - total) / 2), y = o.y !== undefined ? o.y : r.H - 12 * k - 2;
    UX.rect(g, x - 6, y - 3, total + 8, 10 * k + 5, '#0a0c1c'); UX.rect(g, x - 6, y - 3, total + 8, 1, '#3a4070');
    for (const p of parts) {
      const gw = G.glyph(g, x, y + (k > 1 ? 4 : 0), p.a, dev); UI.text(g, p.verb, x + gw + 2, y, UI.COL.text); x += p.w;
    }
  });
};
/** a glyph's width without drawing it */
G.glyphW = (a, dev) => {
  if (dev === 'gamepad') return ['confirm', 'cancel', 'command', 'info'].includes(a) ? 11 : Math.max(9, E.font.width(a === 'pause' ? 'OPTIONS' : a === 'move' ? 'STICK' : 'L1') + 6);
  const lab = G.keyLabel(a, dev); if (dev === 'mouse' && lab.mouse) return 9;
  return Math.max(9, E.font.width(lab.key || '') + 5) + 1;
};

/* ---- toasts: short messages that come and go ---- */
UI.toasts = [];
UI.toast = (text, color = UI.COL.gold, secs = 2.6) => { UI.toasts.push({ text, color, t: secs, max: secs }); if (UI.toasts.length > 4) UI.toasts.shift(); };
UI.drawToasts = (r, dt) => {
  if (!UI.toasts.length) return;
  r.overlay(g => {
    let y = 34; for (const t of UI.toasts) {
      const w = UI.width(t.text) + 14, x = Math.round((r.W - w) / 2), a = Math.min(1, t.t * 3);
      if (a > .3) { UI.box(g, x, y, w, 10 * UI.k() + 6, { alpha: .9 }); UI.text(g, t.text, x + 7, y + 3, t.color); }
      y += 14 * UI.k() + 4;
    }
  });
};
UI.tickToasts = dt => { for (const t of UI.toasts) t.t -= dt; UI.toasts = UI.toasts.filter(t => t.t > 0); };

/* ---- a modal confirm ---- */
UI.modal = null;
/** ask a yes/no question: onYes() on the first answer */
UI.confirm = (text, onYes, o = {}) => { UI.modal = { text, onYes, onNo: o.onNo, yes: o.yes || 'Yes', no: o.no || 'No', st: { f: o.def === 'yes' ? 0 : 1 } }; };
/** run the modal (returns true while one is open: the scene waits) */
UI.modalUpdate = () => {
  const m = UI.modal; if (!m) return false;
  const res = UI.nav(m.st, m.items || UI.synth(2, 2));
  if (res === 'pick') { UI.modal = null; G.sfx(m.st.f === 0 ? 'ui_confirm' : 'ui_cancel'); G.game.input.consumeAll(); if (m.st.f === 0) m.onYes(); else if (m.onNo) m.onNo(); }
  else if (res === 'back') { UI.modal = null; G.sfx('ui_cancel'); G.game.input.consumeAll(); if (m.onNo) m.onNo(); }
  return true;
};
UI.modalDraw = (r, t) => {
  const m = UI.modal; if (!m) return;
  r.overlay(g => {
    const k = UI.k(), lines = FONT.wrap(m.text, 220 * k, { scale: k }), w = 240 * k, h = lines.length * UI.lh() + 34 * k, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
    UX.rect(g, 0, 0, r.W, r.H, '#00000080'.slice(0, 7)); UI.box(g, x, y, w, h, { alpha: 1 });
    lines.forEach((l, i) => UI.text(g, l, x + w / 2, y + 8 + i * UI.lh(), UI.COL.text, { align: 'center' }));
    const by = y + h - 18 * k, bw = 60 * k;
    m.items = [{ x: x + w / 2 - bw - 6, y: by, w: bw, h: 12 * k }, { x: x + w / 2 + 6, y: by, w: bw, h: 12 * k }];
    [m.yes, m.no].forEach((s, i) => { const it = m.items[i]; UX.rect(g, it.x, it.y, it.w, it.h, i === m.st.f ? '#2e3a78' : '#1a1e40'); UI.text(g, s, it.x + it.w / 2, it.y + 2, i === m.st.f ? UI.COL.focus : UI.COL.text, { align: 'center' }); if (i === m.st.f) UI.focusFrame(g, it.x, it.y, it.w, it.h, t); });
  });
};

/* ---- one-card tips (Settings > Tutorial tips) ---- */
UI.tipSeen = {};
UI.tip = (id, title, text) => {
  if (!G.game.settings || G.game.settings.tips === 'Off' || UI.tipSeen[id]) return;
  UI.tipSeen[id] = true; try { E.store.set('brigantime:tips', UI.tipSeen); } catch (e) { /* storage blocked */ }
  UI.tipCard = { title, text, t: 0 };
};
UI.loadTips = () => { try { UI.tipSeen = E.store.get('brigantime:tips', {}) || {}; } catch (e) { UI.tipSeen = {}; } };
UI.tipDraw = (r, dt) => {
  const c = UI.tipCard; if (!c) return;
  c.t += dt; if (c.t > 9) { UI.tipCard = null; return; }
  r.overlay(g => {
    const k = UI.k(), w = 180 * k, lines = FONT.wrap(c.text, w - 12, { scale: k }), h = lines.length * UI.lh() + 22 * k, x = 8, y = 40 * k;
    UI.box(g, x, y, w, h, { bg: ['#2a2410', '#1a1608'], border: '#ffd36a', alpha: .94 });
    UI.text(g, c.title, x + 6, y + 4, UI.COL.gold); lines.forEach((l, i) => UI.text(g, l, x + 6, y + 6 + 10 * k + i * UI.lh(), UI.COL.text));
  });
};
UI.why = null;
/** the one-line reason a choice is disabled, in a footer */
UI.footer = (r, text, color = UI.COL.dim) => { if (!text) return; r.overlay(g => { const w = UI.width(text) + 12, x = Math.round((r.W - w) / 2), y = r.H - 30 * UI.k(); UI.box(g, x, y, w, 10 * UI.k() + 4, { alpha: .9 }); UI.text(g, text, x + 6, y + 2, color); }); };

}

// ===== src/51-ui-input.js =====
{
// INPUT: the game's own preset (a DualSense in the standard mapping first; keys PC players expect; the mouse aims and
// clicks), held-button timing (hold □ / Space to end a turn), Shift+Tab, idle tracking for the attract mode, touch-only
// detection, and hot-seat routing (the UI reads the active seat's input, or every input when shared).

G.PRESET = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0', 'Mouse0'], cancel: ['Escape', 'Backspace', 'Pad1', 'Mouse2'],
  command: ['Space', 'Pad2'], info: ['KeyI', 'Pad3', 'Mouse1'], prev: ['BracketLeft', 'Pad4'], next: ['Tab', 'BracketRight', 'Pad5'],
  zoomOut: ['Minus', 'NumpadSubtract', 'Pad6'], zoomIn: ['Equal', 'NumpadAdd', 'Pad7'], danger: ['KeyT', 'Pad10'], turnL: ['KeyQ'], turnR: ['KeyE', 'Pad11'],
  view: ['KeyV'], pause: ['KeyP', 'Pad9'], start: ['Enter', 'Pad9'], help: ['F1'], create: ['Pad8']
};
G.CONTROL_NAMES = { command: 'Commands', info: 'Info', prev: 'Previous', next: 'Next', zoomOut: 'Zoom out', zoomIn: 'Zoom in', danger: 'Danger view', turnL: 'Turn left', turnR: 'Turn right', view: 'Battle view', help: 'How to Play', create: false };

const IN = G.In = {
  held: {}, holdFired: {}, idle: 0, lastPointer: null, touchOnly: false, sawKey: false, sawPad: false, seatInput: null
};
/** the input the UI reads now: the active seat's (hot-seat with its own pad), else player 1's */
G.inp = () => IN.seatInput || G.game.input;
/** every step: hold timers, idle time, touch-only state */
G.inputTick = (dt) => {
  const game = G.game, inputs = game.players || [game.input];
  let active = false;
  for (const inp of inputs) {
    if (inp.anyPressed && inp.anyPressed()) active = true;
    const m = inp.move ? inp.move() : [0, 0]; if (Math.hypot(m[0], m[1]) > .5) active = true;
  }
  const inp = game.input, p = inp.pointer ? inp.pointer() : null;
  // a mouse that really moves is the device in use: hover focuses menu items and the prompts show mouse buttons (the
  // engine marks the mouse only on a button press)
  // (measured from where it last counted, so a slow glide adds up)
  if (p) { if (!IN.lastPointer) IN.lastPointer = p.slice(); else if (Math.hypot(p[0] - IN.lastPointer[0], p[1] - IN.lastPointer[1]) > 4) { active = true; inp.lastDevice = 'mouse'; IN.lastPointer = p.slice(); } }
  if (inp.clicked && inp.clicked()) active = true;
  if (inp.zoom && inp.zoom() !== 1) active = true;
  if (active) IN.idle = 0; else IN.idle += dt;
  if (inp.lastDevice === 'keyboard' && active) IN.sawKey = true;
  if (inp.lastDevice === 'gamepad') IN.sawPad = true;
  if (IN.touchOnly && (IN.sawKey || IN.sawPad)) IN.touchOnly = false;
  for (const a of ['command', 'confirm', 'cancel']) {
    const i = G.inp(); IN.was = IN.was || {};
    if (i.down(a)) { IN.held[a] = (IN.held[a] || 0) + dt; IN.was[a] = IN.held[a]; } else { if (!i.released(a)) IN.was[a] = 0; IN.held[a] = 0; IN.holdFired[a] = false; }
  }
};
/** was a hold of `a` completed this step (held .6 s)? fires once per hold */
G.holdDone = (a, secs = .6) => { if (IN.held[a] >= secs && !IN.holdFired[a]) { IN.holdFired[a] = true; return true; } return false; };
/** how far through a hold of `a` (0..1) */
G.holdFrac = (a, secs = .6) => Math.min(1, (IN.held[a] || 0) / secs);
/** a tap of `a`: released before the hold completed */
G.tapped = (a, secs = .6) => { const i = G.inp(); return i.released(a) && ((IN.was && IN.was[a]) || 0) < secs; };
/** pressed, with Shift+Tab meaning prev */
G.pressed = (a) => {
  const i = G.inp(), shift = i.held && (i.held.has ? (i.held.has('ShiftLeft') || i.held.has('ShiftRight')) : false);
  if (a === 'prev') return i.pressed('prev') || (shift && i.pressed('next'));
  if (a === 'next') return i.pressed('next') && !shift;
  return i.pressed(a);
};
G.repeat = (a) => G.inp().repeat(a, .25, .08);
/** a touch-only device: a coarse pointer, no fine one, touch points, and no keys or pads seen */
G.detectTouchOnly = () => {
  if (G.forceTouchOnly) return (IN.touchOnly = true);
  try {
    const mm = q => typeof matchMedia === 'function' && matchMedia(q).matches;
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].some(p => p && p.connected) : false;
    IN.touchOnly = !!(mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && !pads);
  } catch (e) { IN.touchOnly = false; }
  return IN.touchOnly;
};
/** the device prompts follow ('gamepad' | 'keyboard' | 'mouse') */
G.device = () => { const d = G.inp().lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; };

}

// ===== src/60-scene-title.js =====
{
// TITLE, PROLOGUE: the logo over a diorama of the continent around Meridian's clock tower (the seasons sweep round it),
// the menu (Continue, New Campaign, Skirmish, Load, How to Play, Settings, About & Credits), the version, the touch-only
// notice with its large Settings button, and the attract mode after 10 seconds without input. The prologue crawl
// plays before a new campaign (auto-advance every 5 s, or confirm).

const TU = G.UI, TP = E.px;
const TS = { t: 0, st: { f: 0 } };
G.TitleState = TS;   // read by the browser mouse test and the debug tools
G.SCENES.title = {
  view: 'threequarter', input: G.PRESET, camera: { zoom: [.55, .55], start: .55 },
  enter() {
    TS.t = 0; G.In.idle = 0; G.In.seatInput = null;
    if (!G.Camp.wm) G.Camp.wm = new G.WorldMap();
    TS.season = 0; TS.sim = TS.sim || G.CampaignSim.create({ seed: 3, humans: ['verdance'] });
    G.Camp.wm.update(TS.sim, 'spring');
    G.game.lights.enabled = true; G.game.lights.ambient = .85;
    G.game.cam.bounds = null; G.game.resetCamera && G.game.resetCamera();
    G.game.weather = { kind: 'petals', amount: .3, wind: .2 };
    G.music('title');
    G.detectTouchOnly();
    TS.items = null;
  },
  update(dt) {
    G.inputTick(dt); TS.t += dt; TU.tickToasts(dt);
    if (TU.modalUpdate()) return;
    // the diorama: the seasons sweep round every 8 seconds
    const si = Math.floor(TS.t / 8) % 4; if (si !== TS.season) { TS.season = si; const s = G.SEASONS[si]; G.Camp.wm.update(TS.sim, s); G.game.weather = s === 'spring' ? { kind: 'petals', amount: .3, wind: .2 } : G.weatherFor(s); }
    const a = TS.t * .05; G.game.focus(512 + Math.cos(a) * 60, 520 + Math.sin(a) * 40, 30);
    if (G.In.idle > 10) { G.Attract.start(); return; }
    if (G.In.touchOnly) {
      const c = G.inp().clicked && G.inp().clicked();
      if (c && TS.setBtn && c[0] >= TS.setBtn.x && c[0] < TS.setBtn.x + TS.setBtn.w && c[1] >= TS.setBtn.y && c[1] < TS.setBtn.y + TS.setBtn.h) G.game.menu('settings');
      return;
    }
    const rows = menuRows(); TS.rows = rows;
    const res = TU.nav(TS.st, TS.items || TU.synth(rows.length));
    if (res === 'pick') { const row = rows[TS.st.f]; if (row && !row.disabled) { G.sfx('ui_confirm'); row.act(); } }
    if (TU.why) { TU.toast(TU.why, TU.COL.bad); TU.why = null; }
  },
  draw(r) {
    G.Camp.wm.draw(r, TS.t);
    r.overlay(g => {
      const k = TU.k(), W = r.W, H = r.H;
      TP.blend(g, .45, 'multiply', () => TP.rect(g, 0, 0, W, H * .42, '#20184a'));
      const bob = Math.round(Math.sin(TS.t * 1.5) * 1.5);
      E.font.title(g, 'BRIGANTIME', W / 2, 16 + bob, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10', depth: 3, depthColor: '#5a2a1a', align: 'center' });
      TU.text(g, 'THE LEGEND OF FORSEASONS', W / 2, 50, '#f0e8d8', { align: 'center' });
      TU.text(g, G.ABOUT.tagline, W / 2, 61, '#b8b0c8', { align: 'center', scale: 1 });
      if (E.versionLabel) TU.text(g, 'v' + G.VERSION + ' • ' + E.versionLabel().replace(/·/g, '•'), 6, H - 10, '#8a86a0', { scale: 1 });
      if (G.In.touchOnly) {
        const w = 220, h = 70, x = Math.round((W - w) / 2), y = Math.round(H * .55);
        TU.box(g, x, y, w, h, { alpha: .96 }); TU.text(g, 'Controller or keyboard required', W / 2, y + 10, '#ffffff', { align: 'center' });
        TS.setBtn = { x: x + 50, y: y + 32, w: w - 100, h: 26 };
        TP.rect(g, TS.setBtn.x, TS.setBtn.y, TS.setBtn.w, TS.setBtn.h, '#2e3a78'); TU.text(g, 'SETTINGS', W / 2, TS.setBtn.y + 8, TU.COL.focus, { align: 'center', scale: 2 });
        return;
      }
      const rows = TS.rows || menuRows(), lh = 13 * k, mw = 130 * k, mx = Math.round(W / 2 - mw / 2), my = Math.round(Math.max(H * .5, H - rows.length * lh - 30 * k));
      TU.box(g, mx - 8, my - 6, mw + 16, rows.length * lh + 10, { alpha: .82 });
      TS.items = rows.map((row, i) => ({ x: mx, y: my + i * lh, w: mw, h: lh - 1, disabled: row.disabled }));
      rows.forEach((row, i) => { const on = i === TS.st.f, it = TS.items[i]; if (on) TP.rect(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, '#2e3a78'); TU.text(g, row.label, W / 2, it.y + 2, row.disabled ? '#6a6680' : on ? TU.COL.focus : '#ffffff', { align: 'center' }); if (on) TU.focusFrame(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, TS.t); });
    });
    if (!G.In.touchOnly) TU.prompts(r, [['up', 'Choose'], ['confirm', 'Select']]);
    TU.modalDraw(r, TS.t); TU.drawToasts(r);
  }
};
function menuRows() {
  const latest = G.game.saves && G.game.saves.latest ? G.game.saves.latest() : null;
  return [
    latest ? { label: 'Continue', act: () => G.loadLatest() } : null,
    { label: 'New Campaign', act: () => G.game.go('setup', {}) },
    { label: 'Skirmish', act: () => G.game.go('skirmishSetup', {}) },
    { label: 'Load', act: () => { if (!G.game.saves.show('load')) TU.toast('Loading needs the menu', TU.COL.bad); }, disabled: G.game.saves && G.game.saves.list && G.game.saves.list().some(s => !s.empty) ? false : 'No saved campaigns' },
    { label: 'How to Play', act: () => G.game.go('help', { back: 'title' }) },
    { label: 'Settings', act: () => G.game.menu('settings') },
    { label: 'About & Credits', act: () => G.game.go('about', { back: 'title' }) }
  ].filter(Boolean);
}

/* ---- the prologue crawl ---- */
const PR = { t: 0, i: 0 };
G.SCENES.prologue = {
  view: 'threequarter', input: G.PRESET,
  enter(d) { PR.t = 0; PR.i = 0; PR.done = d.done; G.music('title'); G.game.weather = { kind: 'ash', amount: .15, wind: .1 }; },
  update(dt) {
    G.inputTick(dt); PR.t += dt; const inp = G.inp();
    if (G.holdDone('cancel', .8) || G.holdDone('confirm', 1)) { PR.done(); return; }
    if (inp.pressed('confirm') && PR.t > .4 || PR.t > 5) { PR.i++; PR.t = 0; if (PR.i >= G.PROLOGUE.length) PR.done(); }
    G.game.focus(512, 480 - PR.i * 8, 30);
  },
  draw(r) {
    G.Camp.wm.draw(r, PR.t + PR.i * 5);
    r.overlay(g => {
      const k = TU.k(), W = r.W, H = r.H;
      TP.blend(g, .6, 'multiply', () => TP.rect(g, 0, 0, W, H, '#14102a'));
      const line = G.PROLOGUE[PR.i] || '', a = Math.min(1, PR.t * 2);
      const lines = E.font.wrap(line.replace(/\{[^}]*\}/g, ''), Math.min(W - 40, 300) * k, { scale: k });
      lines.forEach((l, i) => TU.text(g, l, W / 2, H / 2 - lines.length * 6 * k + i * 12 * k, a > .5 ? '#f0e8d8' : '#8a86a0', { align: 'center' }));
      TU.text(g, (PR.i + 1) + ' / ' + G.PROLOGUE.length, W / 2, H - 30 * k, TU.COL.dim, { align: 'center' });
    });
    TU.prompts(r, [['confirm', 'Next'], ['cancel', 'Hold: Skip']]);
  }
};

}

// ===== src/61-scene-setup.js =====
{
// SETUP: a new campaign in four steps (players, each claiming a device or sharing; realm cards, one per human, no
// repeats; difficulty; Begin), and Skirmish (a map, a season or the turning Wheel, 2 to 4 sides each Human or CPU, an
// army per side: a realm and a level band; the "Banners of the Wheel" preset). Also the battle builders they use.

const SU = G.UI, SPX = E.px;

/* ---- armies for skirmish, the tutorial and the hub ---- */
/** a field troop for a knight at a level (its data troop, scaled to the band) */
G.troopAt = (id, level, o = {}) => {
  const d = G.get('knight', id), cls = o.cls || d.cls, stats = G.classStats(cls, level);
  const k = G.unitFromKnight({ id, cls, level, stats, elem: d.elem, items: o.items || {}, ruler: o.ruler === undefined ? !!d.ruler : o.ruler, realm: o.realm || d.realm }, { boost: o.boost || 0 });
  const monsters = (o.monsters || d.troop.map(([sp, lv, f]) => [sp, lv, f])).map(([sp, lv, f], i) => {
    const lvl = o.monsters ? lv : Math.max(1, Math.round(level + (lv - d.level))), form = f || (lvl >= 22 ? 3 : lvl >= 12 ? 2 : 1);
    return G.unitFromMonster({ uid: id + ':' + i, sp, form, level: lvl, realm: o.realm || d.realm }, { boost: o.boost || 0 });
  });
  return { knight: k, monsters, formation: d.form };
};
const ROSTER = { verdance: ['gareth', 'lynette', 'wren'], solmark: ['morgause', 'agravain', 'elidure'], amberlyn: ['pellam', 'lamorak', 'vesna'], hoarfast: ['mordrain', 'ragnell', 'nimue'], dominion: ['meliant', 'bertilak', 'aurelie'], brigands: ['dafydd', 'hob', 'abbot'] };
G.ROSTER = ROSTER;
/** the class a knight would have reached at a level */
const clsAt = (id, level) => { let c = G.get('knight', id).cls; const cl = G.get('class', c); if (cl.line === 'ruler' || cl.unique) return c; const line = G.LINES[cl.line]; if (!line) return c; return line[level >= 20 ? 2 : level >= 10 ? 1 : 0]; };
/** a skirmish's BattleSim spec: { map, season ('wheel'), sides: [{ realm, ctl: 'human' | 'easy' | 'normal' | 'hard', level, seat }], seed, shrine } */
G.skirmishSpec = o => {
  const shrine = o.map === 'wheel_shrine';
  const sides = o.sides.map((sd, i) => {
    const ids = ROSTER[sd.realm] || ROSTER.verdance, n = shrine ? 1 : 3;
    return { realm: sd.realm, role: shrine ? 'seat' : i === 0 ? 'att' : 'def', human: sd.ctl === 'human', ai: sd.ctl === 'human' ? 'normal' : sd.ctl, seat: shrine ? (o.sides.length === 2 ? [0, 2][i] : i) : i,
      items: { herb: 2, remedy: 1 }, troops: ids.slice(0, n).map(id => G.troopAt(id, sd.level, { cls: clsAt(id, sd.level), realm: sd.realm, monsters: shrine ? G.HUB_TROOPS[sd.realm] : null })) };
  });
  return { seed: o.seed || 1, map: o.map, season: o.season === 'wheel' ? 'spring' : o.season, wheel: o.season === 'wheel' || shrine, mode: shrine ? 'shrine' : 'siege', bells: shrine ? 6 : undefined, sides };
};
/** the hub / Banners of the Wheel troops: a ruler at 10 with two monsters at 10 */
G.HUB_TROOPS = { verdance: [['unicorn', 10], ['pixie', 10]], solmark: [['cinderhound', 10], ['sunbird', 10]], amberlyn: [['scarecrow', 10], ['griffin', 9]], hoarfast: [['frostwolf', 10], ['icegolem', 9]], dominion: [['clockwork', 10], ['minute', 10]], brigands: [['ogre', 9], ['skeleton', 10]] };
G.SEAT_REALM = ['verdance', 'solmark', 'amberlyn', 'hoarfast'];
/** the tutorial: the ruler and the realm's squire against a brigand patrol on Border Meadow, in Spring */
G.tutorialBattle = (realm, done) => {
  const squire = { verdance: 'lynette', solmark: 'agravain', amberlyn: 'lamorak', hoarfast: 'ragnell' }[realm] || 'lynette', ruler = G.RULER[realm];
  const sarge = { knight: G.unitFromKnight({ id: 'hob', cls: 'brigand', level: 3, stats: G.classStats('brigand', 3), elem: 'summer', items: {}, ruler: false, realm: 'brigands' }), monsters: [['slime', 3], ['bat', 2], ['bat', 2], ['skeleton', 3]].map(([sp, lv], i) => G.unitFromMonster({ uid: 'patrol' + i, sp, form: 1, level: lv, realm: 'brigands' })), formation: 'vanguard' };
  sarge.knight.name = 'Sergeant'; sarge.knight.ref = 'sergeant';
  const spec = { seed: 11, map: 'border_meadow', season: 'spring', mode: 'siege', sides: [
    { realm, role: 'att', human: true, items: { herb: 2 }, troops: [G.troopAt(ruler, G.get('knight', ruler).level, { realm }), G.troopAt(squire, G.get('knight', squire).level, { realm })] },
    { realm: 'brigands', role: 'def', human: false, ai: 'easy', troops: [sarge] }] };
  return { spec, ctx: { kind: 'tutorial', region: G.get('realm', realm).season, sides: ['human', 'ai'], playerSide: 0, intro: [['ruler', 'There: a sergeant and his beasts on our border road.'], ['knight', 'Rout their knight and the patrol breaks. Mind the bridge.']], realm, onEnd: (res) => done(res) } };
};

/* ---- campaign setup ---- */
const ST = { step: 0, t: 0 };
G.SCENES.setup = {
  view: 'threequarter', input: G.PRESET,
  enter() { Object.assign(ST, { step: 0, t: 0, players: 1, realms: [], pick: 0, diff: 1, st: { f: 0 } }); G.In.idle = 0; G.game.allowJoin && G.game.allowJoin({ max: 4, onJoin: (inp, n) => { SU.toast('Player ' + n + ' joins with their own controller', '#7ae07a'); ST.players = Math.max(ST.players, n); } }); },
  exit() { G.game.allowJoin && G.game.allowJoin(false); },
  back() { return stepBack(); },
  update(dt) {
    G.inputTick(dt); ST.t += dt; SU.tickToasts(dt);
    if (G.In.idle > 10) { G.Attract.start(); return; }
    const inp = G.inp();
    if (ST.step === 0) {
      if (G.repeat('left')) { ST.players = Math.max(1, ST.players - 1); G.sfx('ui_move'); }
      if (G.repeat('right')) { ST.players = Math.min(4, ST.players + 1); G.sfx('ui_move'); }
      if (inp.pressed('confirm') || clickedAt('next')) { ST.step = 1; ST.realms = []; ST.pick = 0; G.sfx('ui_confirm'); }
      if (inp.pressed('cancel')) { G.game.go('title'); }
    } else if (ST.step === 1) {
      const free = G.PLAYABLE.filter(r => !ST.realms.includes(r));
      if (G.repeat('left')) { ST.pick = (ST.pick + 3) % 4; G.sfx('ui_move'); }
      if (G.repeat('right')) { ST.pick = (ST.pick + 1) % 4; G.sfx('ui_move'); }
      const hov = hoverCard(); if (hov !== null && hov !== ST.pick) { ST.pick = hov; G.sfx('ui_move'); }
      const r = G.PLAYABLE[ST.pick];
      if (inp.pressed('confirm') || clickedCard() !== null) { if (!free.includes(r)) { G.sfx('ui_error'); SU.toast('Taken by another player', SU.COL.bad); } else { ST.realms.push(r); G.sfx('ui_confirm'); if (ST.realms.length >= ST.players) ST.step = 2; } }
      if (inp.pressed('cancel')) stepBack();
    } else if (ST.step === 2) {
      if (G.repeat('up')) { ST.diff = (ST.diff + 2) % 3; G.sfx('ui_move'); }
      if (G.repeat('down')) { ST.diff = (ST.diff + 1) % 3; G.sfx('ui_move'); }
      if (inp.pressed('confirm')) { ST.step = 3; G.sfx('ui_confirm'); }
      if (inp.pressed('cancel')) stepBack();
    } else {
      if (inp.pressed('confirm')) begin();
      if (inp.pressed('cancel')) stepBack();
    }
  },
  draw(r) {
    r.sky(['#0a0c20', '#1a1e40', '#2a2a50']);
    r.overlay(g => {
      const k = SU.k(), W = r.W, H = r.H;
      SU.title(g, ['PLAYERS', 'CHOOSE A REALM', 'DIFFICULTY', 'BEGIN'][ST.step], W / 2, 10, { scale: 2 });
      if (ST.step === 0) {
        SU.box(g, W / 2 - 110 * k, 50, 220 * k, 90 * k);
        SU.text(g, '←  ' + ST.players + (ST.players === 1 ? ' player' : ' players') + '  →', W / 2, 60, '#ffffff', { align: 'center', scale: 2 });
        SU.text(g, 'Hot-seat: each human commands a realm in turn.', W / 2, 84, SU.COL.dim, { align: 'center' });
        SU.text(g, 'Press Start or Cross on another controller', W / 2, 96, SU.COL.dim, { align: 'center' }); SU.text(g, 'to claim it, or share this one.', W / 2, 106, SU.COL.dim, { align: 'center' });
        (G.game.players || []).forEach((p, i) => SU.text(g, 'P' + (i + 1) + ': ' + (i === 0 ? 'keyboard, mouse and pad' : 'own controller'), W / 2, 120 + i * 10 * k, E.PLAYER_COLORS ? E.PLAYER_COLORS[i] : '#ffffff', { align: 'center' }));
      } else if (ST.step === 1) {
        const cw = Math.min(100 * k, (W - 30) / 4), ch = 172 * k, x0 = Math.round(W / 2 - cw * 2 - 6);
        ST.cards = [];
        G.PLAYABLE.forEach((id, i) => {
          const R = G.get('realm', id), x = x0 + i * (cw + 4), y = 34, taken = ST.realms.indexOf(id), on = i === ST.pick;
          ST.cards.push({ x, y, w: cw, h: ch });
          SU.box(g, x, y, cw, ch, { bg: [E.tones(R.color).sh, E.tones(R.color).deep], border: on ? SU.COL.focus : '#8a86a0', alpha: taken >= 0 ? .5 : .95 });
          SPX.rect(g, x + cw / 2 - 8, y + 5, 16, 18, R.color); SPX.sprite(g, G.sigil(R.sigil, R.trim), x + cw / 2 - 3, y + 8);
          G.knightVis(R.ruler).portrait(g, x + cw / 2 - 22 * k, y + 26, 44 * k, { bg: E.tones(R.color).deep });
          SU.text(g, R.short.toUpperCase(), x + cw / 2, y + 31 + 46 * k, '#ffffff', { align: 'center' });
          SPX.sprite(g, G.elemIcon(R.season), x + cw / 2 - 3, y + 41 + 48 * k);
          SU.text(g, G.get('knight', R.ruler).short, x + cw / 2, y + 51 + 48 * k, E.tones(R.color).lt, { align: 'center' });
          E.font.wrap(R.pitch.join(' '), cw - 8, { scale: k }).slice(0, 6).forEach((l, j) => SU.text(g, l, x + cw / 2, y + 63 + 48 * k + j * 10 * k, SU.COL.dim, { align: 'center' }));
          if (taken >= 0) SU.text(g, 'P' + (taken + 1), x + cw / 2, y + ch - 14, '#ffe080', { align: 'center', scale: 2 });
          if (on) SU.focusFrame(g, x, y, cw, ch, ST.t);
        });
        SU.text(g, 'Player ' + (ST.realms.length + 1) + ', choose your realm', W / 2, 38 + ch, '#ffffff', { align: 'center' });
      } else if (ST.step === 2) {
        const D = [['Easy', 'Rivals are slower; the Hour-Candle burns 16 seasons; more EXP.'], ['Normal', 'The intended war. The candle burns 12 seasons.'], ['Hard', 'Rivals are richer and bolder; the candle burns 10 seasons.']];
        D.forEach(([n, d], i) => { const y = 50 + i * 30 * k, on = i === ST.diff; SU.box(g, W / 2 - 130 * k, y, 260 * k, 26 * k, { alpha: on ? .98 : .7, border: on ? SU.COL.focus : '#8a86a0' }); SU.text(g, n, W / 2 - 122 * k, y + 4, on ? SU.COL.focus : '#ffffff'); SU.text(g, d, W / 2 - 122 * k, y + 14 * k, SU.COL.dim); });
      } else {
        SU.box(g, W / 2 - 130 * k, 50, 260 * k, 80 * k);
        SU.text(g, ST.realms.map((r2, i) => 'P' + (i + 1) + ': ' + G.get('realm', r2).short).join('   '), W / 2, 60, '#ffffff', { align: 'center' });
        SU.text(g, 'Difficulty: ' + ['Easy', 'Normal', 'Hard'][ST.diff], W / 2, 76, SU.COL.dim, { align: 'center' });
        SU.text(g, 'The prologue plays, then Spring of Year 1 begins.', W / 2, 92, SU.COL.dim, { align: 'center' });
        SU.text(g, 'Press ' + G.labelOf('confirm') + ' to begin', W / 2, 110, SU.COL.focus, { align: 'center' });
      }
    });
    SU.prompts(r, ST.step === 1 ? [['left', 'Realm'], ['confirm', 'Choose'], ['cancel', 'Back']] : ST.step === 2 ? [['up', 'Choose'], ['confirm', 'Next'], ['cancel', 'Back']] : [['left', 'Change'], ['confirm', 'Next'], ['cancel', 'Back']]);
    SU.drawToasts(r);
  }
};
function stepBack() { if (ST.step === 0) { G.game.go('title'); return true; } if (ST.step === 1 && ST.realms.length) { ST.realms.pop(); return true; } ST.step--; G.sfx('ui_cancel'); return true; }
function hoverCard() { const inp = G.inp(), p = inp.pointer && inp.pointer(); if (!p || inp.lastDevice !== 'mouse' || !ST.cards) return null; const i = ST.cards.findIndex(c => p[0] >= c.x && p[0] < c.x + c.w && p[1] >= c.y && p[1] < c.y + c.h); return i >= 0 ? i : null; }
function clickedCard() { const inp = G.inp(), c = inp.clicked && inp.clicked(); if (!c || !ST.cards) return null; const i = ST.cards.findIndex(q => c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h); if (i >= 0) ST.pick = i; return i >= 0 ? i : null; }
function clickedAt() { const inp = G.inp(), c = inp.clicked && inp.clicked(); return !!c; }
function begin() {
  const humans = ST.realms.slice(), diff = ['easy', 'normal', 'hard'][ST.diff], seed = (Date.now() % 100000) + 1;
  // seats: player i commands humans[i]; players with their own controller read it
  G.seats = {}; humans.forEach((r, i) => { G.seats[r] = i; });
  G.sfx('ui_confirm');
  const sim = G.CampaignSim.create({ seed, humans, difficulty: diff });
  G.game.go('prologue', { done: () => G.startCampaign(sim) });
}
/** the input of a realm's seat (hot-seat with several controllers), or null (shared) */
G.seatOf = realm => { const i = G.seats && G.seats[realm]; return i !== undefined && G.game.players && G.game.players[i] && G.game.players.length > 1 ? G.game.players[i] : null; };

/* ---- skirmish setup ---- */
const SK = { st: { f: 0 }, t: 0 };
const MAPS = G.all('map').filter(m => !['border_meadow', 'clockwork_sanctum'].includes(m.id)).map(m => m.id);
const SEAS = ['spring', 'summer', 'autumn', 'winter', 'wheel'];
const CTL = ['human', 'easy', 'normal', 'hard'], REALMS6 = ['verdance', 'solmark', 'amberlyn', 'hoarfast', 'dominion', 'brigands'], BANDS = [5, 10, 15, 20];
G.SCENES.skirmishSetup = {
  view: 'threequarter', input: G.PRESET,
  enter(d = {}) { if (!SK.cfg || d.reset) SK.cfg = { preset: 0, map: 0, season: 0, n: 2, sides: [{ ctl: 0, realm: 0, band: 1 }, { ctl: 2, realm: 1, band: 1 }, { ctl: 2, realm: 2, band: 1 }, { ctl: 2, realm: 3, band: 1 }] }; SK.st = { f: 0 }; SK.t = 0; G.In.idle = 0; G.game.allowJoin && G.game.allowJoin({ max: 4 }); },
  exit() { G.game.allowJoin && G.game.allowJoin(false); },
  update(dt) {
    G.inputTick(dt); SK.t += dt; SU.tickToasts(dt);
    if (G.In.idle > 10) { G.Attract.start(); return; }
    const rows = skRows(), inp = G.inp();
    const res = SU.nav(SK.st, SK.items || SU.synth(rows.length), { horizontal: false });
    const row = rows[SK.st.f];
    if (row && row.change) { if (G.repeat('left')) { row.change(-1); G.sfx('ui_move'); } if (G.repeat('right')) { row.change(1); G.sfx('ui_move'); } }
    if (res === 'pick' && row) { if (row.act) row.act(); else if (row.change) { row.change(1); G.sfx('ui_move'); } }
    if (res === 'back') G.game.go('title');
  },
  draw(r) {
    r.sky(['#0a0c20', '#1a1e40', '#2a2a50']);
    r.overlay(g => {
      const k = SU.k(), W = r.W, rows = skRows(), lh = 12 * k, w = 260 * k, x = Math.round(W / 2 - w / 2), y = 32;
      SU.title(g, 'SKIRMISH', W / 2, 8, { scale: 2 });
      SU.box(g, x - 6, y - 4, w + 12, rows.length * lh + 8);
      SK.items = rows.map((rw, i) => ({ x, y: y + i * lh, w, h: lh - 1 }));
      rows.forEach((rw, i) => { const it = SK.items[i], on = i === SK.st.f; if (on) SPX.rect(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, '#2e3a78'); SU.text(g, rw.label, x + 4, it.y + 1, rw.color || (on ? SU.COL.focus : '#ffffff')); if (rw.value !== undefined) SU.text(g, (rw.change ? '← ' : '') + rw.value + (rw.change ? ' →' : ''), x + w - 4, it.y + 1, on ? '#ffffff' : SU.COL.dim, { align: 'right' }); if (on) SU.focusFrame(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, SK.t); });
    });
    SU.prompts(r, [['up', 'Choose'], ['left', 'Change'], ['confirm', 'Select'], ['cancel', 'Back']]);
    SU.drawToasts(r);
  }
};
function skRows() {
  const c = SK.cfg, shrine = c.preset === 1 || MAPS[c.map] === 'wheel_shrine';
  const rows = [
    { label: 'Preset', value: ['Custom battle', 'Banners of the Wheel'][c.preset], change: d => { c.preset = (c.preset + 2 + d) % 2; if (c.preset === 1) { c.map = MAPS.indexOf('wheel_shrine'); c.season = 4; } } },
    { label: 'Map', value: G.get('map', MAPS[c.map]).name, change: d => { c.map = (c.map + MAPS.length + d) % MAPS.length; c.preset = MAPS[c.map] === 'wheel_shrine' ? 1 : 0; if (MAPS[c.map] !== 'wheel_shrine') c.n = 2; } },
    { label: 'Season', value: shrine ? 'The Wheel (turns each bell)' : SEAS[c.season] === 'wheel' ? 'The Wheel (turns each bell)' : G.SEASON_NAME[SEAS[c.season]], change: d => { if (!shrine) c.season = (c.season + 5 + d) % 5; } },
    { label: 'Sides', value: c.n + (shrine ? '' : ' (siege maps take 2)'), change: d => { if (shrine) c.n = G.clamp(c.n + d, 2, 4); } }
  ];
  for (let i = 0; i < c.n; i++) {
    const sd = c.sides[i], hn = c.sides.slice(0, i + 1).filter(x => x.ctl === 0).length;
    rows.push({ label: 'Side ' + (i + 1) + (shrine ? '' : i === 0 ? ' (attacker)' : ' (defender)'), value: CTL[sd.ctl] === 'human' ? 'Human P' + hn : 'CPU ' + G.cap(CTL[sd.ctl]), change: d => { sd.ctl = (sd.ctl + 4 + d) % 4; }, color: G.get('realm', REALMS6[sd.realm]).color });
    rows.push({ label: '   Army', value: G.get('realm', REALMS6[sd.realm]).short + (shrine ? '' : ' • level ' + BANDS[sd.band]), change: d => { sd.realm = (sd.realm + 6 + d) % 6; } });
    if (!shrine) rows.push({ label: '   Level band', value: BANDS[sd.band], change: d => { sd.band = (sd.band + 4 + d) % 4; } });
  }
  rows.push({ label: 'BEGIN THE BATTLE', color: '#ffe080', act: () => startSkirmish() });
  return rows;
}
function startSkirmish() {
  const c = SK.cfg, map = MAPS[c.map], shrine = map === 'wheel_shrine';
  const sides = c.sides.slice(0, shrine ? c.n : 2).map(sd => ({ realm: REALMS6[sd.realm], ctl: CTL[sd.ctl], level: shrine ? 10 : BANDS[sd.band] }));
  const spec = G.skirmishSpec({ map, season: shrine ? 'wheel' : SEAS[c.season], sides, seed: (Date.now() % 9999) + 1 });
  const humanIdx = []; let n = 0; const seats = sides.map(sd => (sd.ctl === 'human' ? n++ : null));
  sides.forEach((sd, i) => { if (sd.ctl === 'human') humanIdx.push(i); });
  const ctx = { kind: 'skirmish', region: shrine ? 'hour' : G.get('realm', sides[1].realm).season || 'neutral', sides: sides.map(sd => (sd.ctl === 'human' ? 'human' : 'ai')), seats, playerSide: humanIdx.length ? humanIdx[0] : undefined,
    onEnd: (res, bsim) => G.game.go('results', { res, sim: bsim, playerSide: humanIdx.length ? humanIdx[0] : 0, ctx: 'skirmish', next: () => G.game.go('skirmishAfter', {}) }) };
  G.sfx('ui_confirm');
  G.game.go('battle', { spec, ctx }, { fade: 'swirl', seconds: .4 });
}
/* ---- after a skirmish: Rematch, Change setup or Title ---- */
const SA = { st: { f: 0 } };
G.SCENES.skirmishAfter = {
  view: 'threequarter', input: G.PRESET,
  enter() { SA.st = { f: 0 }; },
  update(dt) { G.inputTick(dt); const res = SU.nav(SA.st, SA.items || SU.synth(3)); if (res === 'pick') { G.sfx('ui_confirm'); [() => startSkirmish(), () => G.game.go('skirmishSetup', {}), () => G.game.go('title')][SA.st.f](); } if (res === 'back') G.game.go('title'); },
  draw(r) {
    r.sky(['#0a0c20', '#1a1e40', '#2a2a50']);
    r.overlay(g => { const k = SU.k(), W = r.W, opts = ['Rematch', 'Change setup', 'Title']; SU.title(g, 'SKIRMISH', W / 2, 20, { scale: 2 }); SA.items = opts.map((o, i) => ({ x: W / 2 - 60 * k, y: 60 + i * 18 * k, w: 120 * k, h: 14 * k })); opts.forEach((o, i) => { const it = SA.items[i], on = i === SA.st.f; SPX.rect(g, it.x, it.y, it.w, it.h, on ? '#2e3a78' : '#1a1e40'); SU.text(g, o, W / 2, it.y + 3, on ? SU.COL.focus : '#ffffff', { align: 'center' }); if (on) SU.focusFrame(g, it.x, it.y, it.w, it.h, 0); }); });
    SU.prompts(r, [['up', 'Choose'], ['confirm', 'Select']]);
  }
};

}

// ===== src/62-scene-campaign.js =====
{
// THE CAMPAIGN SCENE: the continent in three-quarter view and the season's pipeline. A queue of steps runs in order
// (season card, Tidings cards, story events, a hot-seat privacy card, Muster, March, then each battle: Command or
// Delegate, aftermath, story). The Muster panels: the castle card, Organize (bind and formation), Summon, Move, Quest,
// Equip, Promote; the command menu: Realm (knights, monsters, items, chronicle, objectives) and End Muster.

const CU = G.UI, CP = E.px, CH = G.hex;
const C = G.Camp = { sim: null, todo: [], panel: null, focus: 'avalorn', t: 0 };
const FORM = ['vanguard', 'shield', 'column'];
const FORM_NAME = { vanguard: 'Vanguard', shield: 'Shield', column: 'Column' };

/* ---- helpers ---- */
const realmOf = r => G.get('realm', r);
const kname = id => (G.has('knight', id) ? G.get('knight', id).short : id);
const cname = id => (id === 'sanctum' ? 'The Clockwork Sanctum' : G.get('castle', id).name);
const me = () => C.sim.currentHuman() || C.sim.s.humans[0];
function castleScreen(r, id) { const p = G.get('castle', id).pos; return r.w(p[0], p[1], 0); }
function seasonColor() { return G.elemColor(C.sim.season); }
/** start a campaign (from setup) or come back to it (after a battle or a story scene) */
G.startCampaign = (sim, o = {}) => { C.sim = sim; C.todo = []; C.panel = null; C.marchArrows = []; C.wipe = 0; G.game.go('campaign', Object.assign({ fresh: true }, o)); };

G.SCENES.campaign = {
  pausable: true, view: 'threequarter', input: G.PRESET, camera: { zoom: [.6, 1.6], start: 1 },
  enter(data = {}) {
    if (!C.sim) { const sim = G.CampaignSim.create({ seed: 7, humans: ['verdance'] }); C.sim = sim; }
    if (!C.wm) C.wm = new G.WorldMap();
    C.wm.update(C.sim, C.sim.season);
    G.game.lights.enabled = true; G.game.lights.ambient = .9;
    G.game.cam.bounds = v => C.wm.map.bounds(v);
    G.game.setView('threequarter');
    if (!C.focus || !G.has('castle', C.focus)) C.focus = G.get('realm', me()).capital || 'meridian';
    C.cam = C.cam || G.get('castle', C.focus).pos.slice();
    G.game.weather = G.weatherFor(C.sim.season, G.game.settings && G.game.settings.reduceMotion);
    if (G.game.weather) G.game.weather.amount *= .5;
    G.music(C.sim.season);
    if (data.fresh) { C.todo = []; C.panel = null; if (C.sim.s.phase === 'tidings') C.todo.push({ k: 'tidings' }); else if (C.sim.s.phase === 'muster') C.todo.push({ k: 'privacy', realm: me(), then: 'muster' }); else if (C.sim.s.phase === 'march') C.todo.push({ k: 'privacy', realm: me(), then: 'march' }); else if (C.sim.s.phase === 'resolve') C.todo.push({ k: 'resolve' }); }
    if (data.battle) afterBattle(data.battle);
    G.saveable(C.sim.s.phase === 'muster');
  },
  exit() { G.game.weather = null; G.saveable(false); },
  back() { if (C.panel && C.panel.back) { C.panel.back(); return true; } return false; },
  update(dt) {
    G.inputTick(dt); C.t += dt; CU.tickToasts(dt);
    if (G.Talk.update(dt)) return;
    if (CU.modalUpdate()) return;
    if (C.wipe > 0) C.wipe = Math.max(0, C.wipe - dt / 1.5);
    camera(dt);
    if (C.anim) { C.anim.t += dt; if (C.anim.t >= C.anim.dur) { const f = C.anim.done; C.anim = null; if (f) f(); } return; }
    if (C.panel) { C.panel.update(dt); return; }
    if (C.todo.length) { runStep(C.todo.shift()); return; }
    if (C.sim.s.result) { G.goEnding(C.sim); return; }
    // free map play: Muster or March
    mapUpdate(dt);
  },
  draw(r) { drawCampaign(r); }
};
G.saveable = on => { try { if (G.game.saves) G.game.saves.canSave = !!on && !(G.hub && G.hub.active); } catch (e) { /* no saves */ } };

/* ---- the step queue ---- */
function runStep(st) {
  const sim = C.sim;
  switch (st.k) {
    case 'tidings': {
      const res = sim.beginSeason();
      G.autosave('Tidings');
      C.wm.update(sim, sim.season); C.wipe = 1; G.music(sim.season, { fade: 1.2 }); G.sting('season_' + sim.season);
      G.game.weather = G.weatherFor(sim.season, G.game.settings && G.game.settings.reduceMotion); if (G.game.weather) G.game.weather.amount *= .5;
      C.todo.unshift({ k: 'cards', cards: res.cards }, ...res.events.map(e => ({ k: 'event', id: e.id, realm: e.realm })), { k: 'takeStory' }, { k: 'privacy', realm: me(), then: 'muster' });
      if (sim.s.result) C.todo = [{ k: 'cards', cards: res.cards }, ...res.events.map(e => ({ k: 'event', id: e.id, realm: e.realm }))];
      break;
    }
    case 'cards': C.panel = tidingsPanel(st.cards); break;
    case 'event': playStory(st.id, st.realm); break;
    case 'takeStory': { const evs = sim.takeStory(); C.todo.unshift(...evs.map(e => ({ k: 'event', id: e.id, realm: e.realm }))); break; }
    case 'privacy': {
      const r = st.realm; if (!r) { C.todo.unshift({ k: st.then }); break; }
      if (sim.s.humans.length > 1 && G.game.settings.privacy !== 'Off') C.panel = privacyPanel(r, () => { C.panel = null; C.todo.unshift({ k: st.then }); });
      else C.todo.unshift({ k: st.then });
      G.In.seatInput = G.seatOf ? G.seatOf(r) : null;
      break;
    }
    case 'muster': {
      C.focus = sim.capital(me()) || C.focus; G.saveable(true);
      CU.tip('muster', 'Muster', 'Choose a castle of yours: Organize troops, Summon monsters, Move, Quest, Equip and Promote. Hold ' + G.labelOf('command') + ' to end the Muster.');
      if (G.autoplayOn) { autoplayMuster(); }
      break;
    }
    case 'march': {
      G.saveable(false);
      C.todo.unshift({ k: 'takeStory' });
      CU.tip('march', 'March', 'Choose an enemy or brigand castle beside yours and send up to three troops. Hold ' + G.labelOf('command') + ' when your orders are given.');
      if (G.autoplayOn) { G.CampaignAI.march(sim, me()); sim.apply({ t: 'endMarch', realm: me() }); afterMarchEnd(); }
      break;
    }
    case 'resolve': nextResolution(); break;
    case 'anim': C.anim = st.anim; break;
    case 'fn': st.fn(); break;
  }
}
function playStory(id, realm) {
  const sim = C.sim, ev = G.get('event', id);
  // an ending is not played here: an empty step lets the queue run on to its result check, which plays it (G.goEnding)
  if (ev.ending) { C.todo.unshift({ k: 'fn', fn: () => {} }); return; }
  if (G.fastStory) { sim.apply({ t: 'event', id, realm, choice: 0 }); return; }
  G.game.go('event', { id, realm: realm === 'world' ? me() : realm, sim, onDone: choice => {
    const evs = sim.apply({ t: 'event', id, realm: realm === 'world' ? me() : realm, choice });
    if (ev.tip) CU.toast(ev.tip, CU.COL.gold, 4);
    for (const e of evs) if (e.e === 'joined') CU.toast(kname(e.knight) + ' joins your banner!', '#7ae07a');
    if (evs.some(e => e.e === 'sanctumOpens')) C.todo.unshift({ k: 'resolve' });
    if (id === 'tutorial' && choice === 0) { G.game.go('battle', G.tutorialBattle(realm, () => { G.game.go('campaign', {}); CU.toast('The border road is clear.', '#7ae07a'); })); return; }
    G.game.go('campaign', {});
  } }, { fade: .3 });
}

/* ---- Tidings ---- */
function tidingsPanel(cards) {
  const sim = C.sim, list = cards.filter(c => ['season', 'candle', 'income', 'questReturn', 'stilled', 'rivalFailed', 'rivalWheel', 'victory', 'defeat'].includes(c.e) && (!c.realm || sim.isHuman(c.realm) || c.e === 'stilled'));
  let i = 0, t = 0;
  const p = {
    update(dt) {
      t += dt; const inp = G.inp();
      if (G.holdDone('confirm', .7)) { finish(); return; }
      if ((inp.pressed('confirm') || inp.clicked && inp.clicked()) && t > .35) { i++; t = 0; G.sfx('ui_move'); if (i >= list.length) finish(); else cue(); }
      const c = list[i]; if (c && c.e === 'season' && t > 1.6) { i++; t = 0; if (i >= list.length) finish(); else cue(); }
    },
    draw(r) {
      const c = list[i]; if (!c) return;
      r.overlay(g => {
        const k = CU.k(), W = r.W, H = r.H;
        if (c.e === 'season') {
          const col = G.elemColor(c.season); CP.rect(g, 0, H / 2 - 40 * k, W, 80 * k, '#0a0814'); CP.rect(g, 0, H / 2 - 40 * k, W, 2, col); CP.rect(g, 0, H / 2 + 40 * k - 2, W, 2, col);
          drawWheel(g, W / 2, H / 2 - 4, 26 * k, c.season, t);
          CU.title(g, G.SEASON_NAME[c.season].toUpperCase(), W / 2 - 80 * k, H / 2 - 16 * k, { scale: 3, colors: ['#ffffff', col, E.tones(col).sh] });
          CU.text(g, 'YEAR ' + c.year + ' OF THE BRIGANTIME', W / 2 + 80 * k, H / 2 - 10 * k, '#e8e4f0', { align: 'center' });
          CU.text(g, seasonTagline(c.season), W / 2 + 80 * k, H / 2 + 2 * k, col, { align: 'center' });
          return;
        }
        const w = 230 * k, h = 66 * k, x = Math.round((W - w) / 2), y = Math.round(H / 2 - h / 2);
        CU.box(g, x, y, w, h, { alpha: .95 });
        CU.text(g, 'TIDINGS', x + 8, y + 5, CU.COL.gold); CU.text(g, (i + 1) + '/' + list.length, x + w - 8, y + 5, CU.COL.dim, { align: 'right' });
        const line = (s, yy, col = '#ffffff') => CU.text(g, s, x + 10, y + yy * k, col);
        switch (c.e) {
          case 'candle': CP.sprite(g, G.ICON.candle, x + 10, y + 18 * k); line('The Hour-Candle burns. ' + c.left + ' seasons remain.', 20, c.left <= 2 ? '#ff6a5a' : '#ffffff'); break;
          case 'income': { CP.sprite(g, G.ICON.mana, x + 10, y + 19 * k); line('Mana  +' + c.income + '  upkeep -' + c.upkeep + '  = ' + c.mana, 20); if (c.deserted.length) line('Deserted for want of mana: ' + c.deserted.slice(0, 3).join(', '), 32, '#ff9a8a'); line(G.get('realm', c.realm).short + ' treasury', 44, CU.COL.dim); break; }
          case 'questReturn': {
            const v = G.knightVis(c.knight); v.portrait(g, x + 8, y + 16 * k, 30 * k);
            const site = G.get('site', c.site), pool = c.kind === 'mishap' && c.lost ? G.VIGNETTES.mishapLoss : G.VIGNETTES[c.kind === 'story' ? 'treasure' : c.kind];
            const txt = (Array.isArray(pool) ? pool[c.variant % pool.length] : 'A quest ends.').replace(/\{\$knight\}/g, kname(c.knight)).replace(/\{\$site\}/g, site.name).replace(/\{\$thing\}/g, c.thing || 'nothing');
            const lines = E.font.wrap(c.story ? kname(c.knight) + ' returns from ' + site.name + '. Someone came back with them.' : txt, w - 50 * k, { scale: k });
            lines.forEach((l, j) => CU.text(g, l, x + 44 * k, y + (18 + j * 10) * k, '#ffffff'));
            if (c.keeper) CU.text(g, 'The Keeper sleeps between two seconds.', x + 44 * k, y + 50 * k, '#b8b0c8');
            break;
          }
          case 'stilled': CP.sprite(g, G.ICON.clock, x + 10, y + 19 * k); line(cname(c.castle) + ' is Stilled this season.', 20, '#c8c8d8'); line('No mana; its troops cannot move, march or quest.', 32, CU.COL.dim); break;
          case 'rivalFailed': line(G.get('realm', c.realm).short + ' fell in the Sanctum. Meridian is the Hour\'s again.', 20); break;
          case 'rivalWheel': line(G.get('realm', c.realm).short + ' has set the Wheel.', 20, '#ff6a5a'); break;
          case 'victory': line('The Gray Knight has fallen!', 20, '#ffe080'); break;
          case 'defeat': line('The legend ends here.', 20, '#ff6a5a'); break;
        }
      });
      CU.prompts(r, [['confirm', 'Next'], ['confirm', 'Hold: Skip all']]);
    }
  };
  function finish() { C.panel = null; }
  function cue() { const c = list[i]; if (c && c.e === 'candle') { G.sfx('candle_hiss'); G.sting('candle'); } if (c && c.e === 'stilled') G.sfx('stop'); }
  if (!list.length) return null;
  return p;
}
function seasonTagline(s) { return { spring: "Verdance's knights grow bold.", summer: "Solmark's banners burn bright.", autumn: "Amberlyn's harvest is gathered.", winter: "Hoarfast's knights grow bold." }[s]; }
function drawWheel(g, x, y, R, season, t) {
  const segs = ['winter', 'spring', 'summer', 'autumn'];
  for (let i = 0; i < 4; i++) { const a0 = -Math.PI / 2 + i * Math.PI / 2 - Math.PI / 4 + t * .3; const pts = [[x, y]]; for (let j = 0; j <= 8; j++) { const a = a0 + j / 8 * Math.PI / 2; pts.push([x + Math.cos(a) * R, y + Math.sin(a) * R]); } CP.poly(g, pts, segs[i] === season ? G.elemColor(segs[i]) : E.tones(G.elemColor(segs[i])).sh); }
  CP.disc(g, x, y, R * .3, '#d8c070'); CP.disc(g, x, y, R * .18, '#3a3a46');
}

/* ---- the map: focus, cursor, panels ---- */
function camera(dt) {
  const inp = G.inp(), pa = inp.padAim, pan = inp.pan && inp.pan();
  if (pa) { C.cam[0] += pa[0] * dt * 260; C.cam[1] += pa[1] * dt * 260; C.free = true; }
  else if (pan) { const g = G.game.view.screenDirToGround(-pan[0], -pan[1]), l = Math.hypot(pan[0], pan[1]) / (G.game.view.scale || 1); C.cam[0] += g[0] * l; C.cam[1] += g[1] * l; C.free = true; }
  else if (G.game.settings.edgePan === 'On') { const p = inp.pointer && inp.pointer(); if (p && inp.lastDevice === 'mouse') { const W = G.game.W, H = G.game.H, ex = p[0] < 8 ? -1 : p[0] > W - 8 ? 1 : 0, ey = p[1] < 8 ? -1 : p[1] > H - 8 ? 1 : 0; if (ex || ey) { C.cam[0] += ex * dt * 220; C.cam[1] += ey * dt * 220; C.free = true; } } }
  if (!C.free) { const p = C.camGoal || G.get('castle', C.focus).pos; C.cam[0] += (p[0] - C.cam[0]) * Math.min(1, dt * 6); C.cam[1] += (p[1] + 20 - C.cam[1]) * Math.min(1, dt * 6); }
  C.cam[0] = G.clamp(C.cam[0], 60, 964); C.cam[1] = G.clamp(C.cam[1], 60, 980);
  G.game.focus(C.cam[0], C.cam[1], 0);
}
/** move the focus to the castle in a screen direction */
function stepFocus(dx, dy, allowed) {
  const g = G.game.view.screenDirToGround(dx, dy), p0 = G.get('castle', C.focus).pos;
  let best = null, bs = Infinity;
  for (const c of G.all('castle')) {
    if (c.id === C.focus || (allowed && !allowed.includes(c.id))) continue;
    const vx = c.pos[0] - p0[0], vy = c.pos[1] - p0[1], d = Math.hypot(vx, vy), along = (vx * g[0] + vy * g[1]) / (d || 1);
    if (along < .35) continue;
    const s = d * (2 - along); if (s < bs) { bs = s; best = c.id; }
  }
  if (best) { C.focus = best; C.free = false; G.sfx('ui_move'); }
}
/** the castle under the mouse pointer (screen distance) */
function hoverCastle(allowed) {
  const inp = G.inp(), p = inp.pointer && inp.pointer(); if (!p || inp.lastDevice !== 'mouse') return null;
  if (C.hp && p[0] === C.hp[0] && p[1] === C.hp[1]) return null; C.hp = p.slice();
  const gp = G.game.mouseGround(); if (!gp) return null;
  let best = null, bd = 34; for (const c of G.all('castle')) { if (allowed && !allowed.includes(c.id)) continue; const d = Math.hypot(c.pos[0] - gp[0], c.pos[1] - gp[1]); if (d < bd) { bd = d; best = c.id; } }
  return best;
}
function mapNav(allowed) {
  for (const [a, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) if (G.repeat(a)) { const m = G.inp().move(); stepFocus(Math.abs(m[0]) > .3 ? m[0] : dx, Math.abs(m[1]) > .3 ? m[1] : dy, allowed); }
  const h = hoverCastle(allowed); if (h && h !== C.focus) { C.focus = h; G.sfx('ui_move'); C.free = false; }
  if (G.pressed('next') || G.pressed('prev')) {
    const mine = (allowed || C.sim.castlesOf(me())).slice().sort(), i = mine.indexOf(C.focus);
    C.focus = mine[(i + (G.pressed('prev') ? mine.length - 1 : 1) + mine.length) % mine.length] || C.focus; C.free = false; G.sfx('ui_move');
  }
  const z = G.inp().pressed('zoomIn') ? 1.12 : G.inp().pressed('zoomOut') ? 1 / 1.12 : 1; if (z !== 1 && G.game.zoomBy) G.game.zoomBy(z);
}
function mapUpdate(dt) {
  const sim = C.sim, inp = G.inp(), ph = sim.s.phase;
  mapNav();
  if (G.holdDone('command')) { if (ph === 'muster') askEndMuster(); else if (ph === 'march') askEndMarch(); return; }
  if (G.tapped('command')) { C.panel = commandsPanel(); G.sfx('ui_open'); return; }
  if (inp.pressed('info')) { C.panel = castleInfoPanel(C.focus); return; }
  if (inp.pressed('confirm')) {
    const own = sim.s.castles[C.focus].owner === me();
    if (ph === 'muster') { if (own) { C.panel = castlePanel(C.focus); G.sfx('ui_confirm'); } else { C.panel = castleInfoPanel(C.focus); } }
    else if (ph === 'march') {
      const tg = sim.marchTargets(me());
      if (tg.includes(C.focus)) { C.panel = marchPanel(C.focus); G.sfx('ui_confirm'); }
      else if (C.focus === 'meridian' && tg.includes('sanctum')) { C.panel = marchPanel('sanctum'); }
      else { G.sfx('ui_error'); CU.toast(own ? 'Choose a castle to attack' : 'Not beside one of your castles', CU.COL.bad); }
    }
  }
  if (inp.pressed('cancel')) { G.game.pause(); }
}
function askEndMuster() { const go = () => { G.saveable(false); const ev = C.sim.apply({ t: 'endMuster', realm: me() }); afterPhaseChange(ev); }; if (G.game.settings.confirmEnd === 'Off') go(); else CU.confirm('End the Muster and give your marching orders?', go, { def: 'yes' }); }
function askEndMarch() { const go = () => { C.sim.apply({ t: 'endMarch', realm: me() }); afterMarchEnd(); }; if (G.game.settings.confirmEnd === 'Off') go(); else CU.confirm(C.sim.s.marches.filter(m => m.realm === me()).length ? 'Send the marches?' : 'Send no marches this season?', go, { def: 'yes' }); }
function afterPhaseChange(ev) {
  const s = C.sim.s;
  if (s.phase === 'muster') C.todo.push({ k: 'privacy', realm: me(), then: 'muster' });
  else if (s.phase === 'march') C.todo.push({ k: 'privacy', realm: me(), then: 'march' });
}
function afterMarchEnd() {
  const s = C.sim.s;
  if (s.phase === 'march') { C.todo.push({ k: 'privacy', realm: me(), then: 'march' }); return; }
  // every human has declared: show the marches, then resolve
  C.marchArrows = s.queue.map(m => ({ realm: m.realm, target: m.target, from: Object.values(m.from)[0], n: m.knights.length }));
  G.sfx('march_drums');
  C.todo.push({ k: 'anim', anim: { t: 0, dur: 1.4 } }, { k: 'resolve' });
}

/* ---- resolution ---- */
function nextResolution() {
  const sim = C.sim, p = sim.nextBattle();
  if (!p) {
    C.marchArrows = []; sim.endSeason();
    if (sim.s.result) return;
    C.todo.push({ k: 'tidings' }); return;
  }
  C.marchArrows = (C.marchArrows || []).filter(a => !(a.realm === p.march.realm && a.target === p.march.target));
  if (p.kind === 'open') {
    const ev = sim.takeOpen(); C.focus = p.castle; C.free = false;
    C.wm.update(sim, sim.season); G.sfx('castle_taken');
    const human = sim.isHuman(p.march.realm) || sim.isHuman(p.def);
    if (human) CU.toast(cname(p.castle) + ': the gates stand open. ' + realmOf(p.march.realm).short + ' takes it.', sim.isHuman(p.march.realm) ? '#7ae07a' : '#ff9a8a', 3.2);
    for (const e of ev) if (e.e === 'treasury' && sim.isHuman(e.realm)) CU.toast('Treasury: ' + G.get('item', e.item).name, CU.COL.gold, 3);
    C.todo.unshift({ k: 'takeStory' }, { k: 'resolve' });
    return;
  }
  const att = p.march.realm, def = p.kind === 'sanctum' ? 'dominion' : p.def, human = sim.isHuman(att) || sim.isHuman(def);
  C.focus = p.kind === 'sanctum' ? 'meridian' : p.castle; C.free = false;
  if (!human) {
    // AI against AI: auto-resolve; show the result banner (or skip, by Settings)
    const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); const r = b.result(); sim.applyBattle(r); C.wm.update(sim, sim.season);
    if (G.game.settings.aiBattles !== 'Skip') CU.toast(realmOf(att).short + ' vs ' + realmOf(def).short + ' at ' + cname(p.castle) + ': ' + realmOf(r.winner === 0 ? att : def).short + ' wins', '#d8d0e8', 2.4);
    C.todo.unshift({ k: 'takeStory' }, { k: 'resolve' }); return;
  }
  const before = G.beforeBattle(sim, p);
  C.panel = resolvePanel(p, before);
}
function resolvePanel(p, before) {
  const sim = C.sim, att = p.march.realm, def = p.kind === 'sanctum' ? 'dominion' : p.def, st = { f: 0 };
  const sanctum = p.kind === 'sanctum';
  const opts = sanctum ? [['Command', 'Fight it yourself']] : [['Command', 'Fight it yourself'], ['Delegate', 'Your captains fight it']];
  const panel = {
    update() {
      const res = CU.nav(st, panel.items || CU.synth(opts.length, opts.length));
      if (res === 'pick') { G.sfx('ui_confirm'); C.panel = null; if (st.f === 0) commandBattle(p, before); else delegateBattle(p, before); }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), w = 250 * k, h = 96 * k, x = Math.round((r.W - w) / 2), y = Math.round(r.H / 2 - h / 2);
        CU.box(g, x, y, w, h, { alpha: .96 });
        const ac = realmOf(att).color, dc = realmOf(def).color;
        CU.text(g, sanctum ? 'THE CLOCKWORK SANCTUM' : realmOf(att).short.toUpperCase() + ' MARCHES ON ' + G.get('castle', p.castle).name.toUpperCase(), x + w / 2, y + 5, CU.COL.gold, { align: 'center' });
        const an = p.march.knights.length, dn = sanctum ? 1 : p.defenders.length;
        CU.text(g, an + ' troop' + (an > 1 ? 's' : '') + ' against ' + dn, x + w / 2, y + 16 * k, '#ffffff', { align: 'center' });
        // the commanders' portraits
        p.march.knights.forEach((kid, i) => G.knightVis(kid).portrait(g, x + 8 + i * 26 * k, y + 28 * k, 24 * k, { bg: E.tones(ac).deep }));
        const dk = sanctum ? ['graynight'] : p.defenders; dk.forEach((kid, i) => G.knightVis(kid).portrait(g, x + w - 8 - (i + 1) * 26 * k, y + 28 * k, 24 * k, { bg: E.tones(dc).deep }));
        CU.text(g, 'VS', x + w / 2, y + 36 * k, '#ffffff', { align: 'center' });
        CU.text(g, (sanctum ? 'Clockwork Sanctum' : G.get('map', G.get('castle', p.castle).map).name) + ' • ' + G.SEASON_NAME[sim.season], x + w / 2, y + 46 * k, CU.COL.dim, { align: 'center' });
        panel.items = opts.map((o, i) => ({ x: x + 10 + i * (w / opts.length), y: y + h - 22 * k, w: w / opts.length - 20, h: 14 * k }));
        opts.forEach((o, i) => { const it = panel.items[i]; CP.rect(g, it.x, it.y, it.w, it.h, i === st.f ? '#2e3a78' : '#1a1e40'); CU.text(g, o[0], it.x + it.w / 2, it.y + 3, i === st.f ? CU.COL.focus : '#ffffff', { align: 'center' }); if (i === st.f) CU.focusFrame(g, it.x, it.y, it.w, it.h, C.t); });
        CU.text(g, opts[st.f][1], x + w / 2, y + h - 34 * k, CU.COL.dim, { align: 'center' });
      });
      CU.prompts(r, [['left', 'Choose'], ['confirm', 'Select']]);
    }
  };
  return panel;
}
function battleFx(before) { const fx = {}; for (const b of before || []) Object.assign(fx, b.fx); return fx; }
function commandBattle(p, before) {
  const sim = C.sim, spec = sim.battleSpec(p), att = p.march.realm, def = p.kind === 'sanctum' ? 'dominion' : p.def;
  G.autosave('Before battle');
  const sides = spec.sides.map(sd => sim.isHuman(sd.realm) ? 'human' : 'ai'), seats = spec.sides.map(sd => G.seatOf ? G.seatOf(sd.realm) : null);
  const castle = p.kind === 'sanctum' ? 'meridian' : p.castle, region = G.get('castle', castle).region;
  const kids = [p.march.knights, p.kind === 'sanctum' ? ['graynight'] : p.defenders];
  const intro = [];
  for (const b of before || []) { const ev = G.get('event', b.id); intro.push(...ev.lines); }
  const rv = G.rivalLine(kids[0], kids[1]); if (rv) intro.push(...rv);
  if (p.kind === 'sanctum') intro.push(['graynight', 'Twelve bells, little crown. Then nothing, ever again.']);
  const playerSide = sim.isHuman(att) ? 0 : 1;
  const go = () => G.game.go('battle', { spec, fx: battleFx(before), ctx: { kind: 'campaign', region: region === 'hour' || p.kind === 'sanctum' ? 'hour' : G.regionKey(region), owner: def, sides, seats, playerSide, intro: intro.length ? intro : null, realm: sim.isHuman(att) ? att : def,
    onEnd: (res, bsim) => { G.game.go('results', { res, sim: bsim, playerSide, ctx: 'campaign', next: () => G.game.go('campaign', { battle: { res } }) }); } } }, { fade: 'swirl', seconds: .5 });
  // the marching figures walk the road first
  C.anim = { t: 0, dur: 1.2, march: p, done: go }; G.sfx('march_drums');
}
function delegateBattle(p, before) {
  const sim = C.sim, spec = sim.battleSpec(p), b = G.BattleSim.create(spec);
  for (const [ref, fx] of Object.entries(battleFx(before))) { const u = b.units.find(x => x.ref === ref); if (u) Object.assign(u.fx, fx); }
  G.BattleAI.resolve(b);
  afterBattle({ res: b.result(), delegated: true, p });
}
/** a battle's result: apply it, show the aftermath, play the stories it caused, resolve the next */
function afterBattle(d) {
  const sim = C.sim, p = sim.s.pending; if (!p) { C.todo.push({ k: 'resolve' }); return; }
  const att = p.march.realm, ev = sim.applyBattle(d.res);
  C.wm.update(sim, sim.season);
  const human = sim.isHuman(att) ? att : p.def, won = (d.res.winner === 0) === sim.isHuman(att);
  if (d.delegated) C.panel = summaryPanel(d.res, ev, won, p);
  else { for (const e of ev) if (e.e === 'treasury' && sim.isHuman(e.realm)) CU.toast('Treasury: ' + G.get('item', e.item).name, CU.COL.gold, 3); }
  if (ev.some(e => e.e === 'taken')) G.sfx('castle_taken');
  C.todo.push({ k: 'takeStory' }, { k: 'resolve' });
}
function summaryPanel(res, ev, won, p) {
  const sim = C.sim, lv = res.units.filter(u => u.levels > 0 && sim.isHuman(u.side === 0 ? p.march.realm : p.def)).slice(0, 4);
  const dead = ev.filter(e => e.e === 'dead' && sim.isHuman(e.realm)).map(e => e.name), caps = ev.filter(e => e.e === 'captured').map(e => e.name + (sim.isHuman(e.realm) ? ' (joins you)' : ' (taken)'));
  G.sting(won ? 'victory' : 'defeat');
  return { update() { if (G.inp().pressed('confirm') || G.inp().pressed('cancel') || (G.inp().clicked && G.inp().clicked())) { G.sfx('ui_confirm'); C.panel = null; } },
    draw(r) { r.overlay(g => {
      const k = CU.k(), w = 240 * k, h = 96 * k, x = Math.round((r.W - w) / 2), y = Math.round(r.H / 2 - h / 2);
      CU.box(g, x, y, w, h, { alpha: .96 });
      CU.title(g, won ? 'VICTORY' : 'DEFEAT', x + w / 2, y + 4, { scale: 2, colors: won ? ['#ffffff', '#ffe080', '#c89020'] : ['#ffffff', '#ff8a7a', '#a02a2a'] });
      CU.text(g, 'Delegated: ' + (p.kind === 'sanctum' ? 'the Sanctum' : cname(p.castle)) + ' • bell ' + res.bell, x + w / 2, y + 22 * k, CU.COL.dim, { align: 'center' });
      let yy = y + 34 * k;
      if (lv.length) { CU.text(g, 'Level up: ' + lv.map(u => (u.kind === 'knight' ? kname(u.ref) : G.monsterName(sim.monster(u.ref) ? sim.monster(u.ref).sp : 'slime', 1)) + ' ' + u.level).join(', ').slice(0, 52), x + 8, yy, '#ffe080'); yy += 11 * k; }
      if (caps.length) { CU.text(g, 'Captured: ' + caps.join(', ').slice(0, 50), x + 8, yy, '#ffd060'); yy += 11 * k; }
      if (dead.length) { CU.text(g, 'Lost: ' + dead.join(', ').slice(0, 54), x + 8, yy, '#ff9a8a'); yy += 11 * k; }
      if (!lv.length && !caps.length && !dead.length) CU.text(g, 'No losses.', x + 8, yy, '#ffffff');
    }); CU.prompts(r, [['confirm', 'Continue']]); } };
}

/* ---- the castle card and the Muster actions ---- */
function castleInfoPanel(cid) { const st = { tab: 0 }; return { update() { if (G.inp().pressed('cancel') || G.inp().pressed('confirm') || G.inp().pressed('info')) { C.panel = null; G.sfx('ui_cancel'); } }, draw(r) { r.overlay(g => castleCard(g, r, cid, null)); CU.prompts(r, [['cancel', 'Back']]); } }; }
function castleCard(g, r, cid, actions, st) {
  const sim = C.sim, k = CU.k(), c = G.get('castle', cid), cs = sim.s.castles[cid], owner = cs.owner, R = G.get('realm', owner);
  const w = 168 * k, x = r.W - w - 6, y = 30, rows = cs.knights.length, h = (60 + rows * 13 + (actions ? 42 : 0)) * k;
  CU.box(g, x, y, w, h, { alpha: .93 });
  CP.rect(g, x + 4, y + 4, 12, 12, R.color); CP.sprite(g, G.sigil(R.sigil, R.trim), x + 6, y + 6);
  CU.text(g, c.name, x + 20, y + 4, '#ffffff'); CU.text(g, R.short + (cs.stilled ? ' • STILLED' : ''), x + 20, y + 4 + 9 * k, cs.stilled ? '#c8c8d8' : E.tones(R.color).lt);
  const regS = G.regionSeasons(c.region); regS.forEach((s2, i) => CP.sprite(g, G.elemIcon(s2), x + w - 12 - i * 9, y + 5)); if (c.region === 'hour') CP.sprite(g, G.elemIcon('hour'), x + w - 12, y + 5);
  CP.sprite(g, G.ICON.mana, x + 6, y + 24 * k); CU.text(g, '+' + Math.round(c.mana * G.tune.manaIncome * (G.regionSeasons(c.region).includes(sim.season) ? 1 + G.tune.seasonYield : 1)) + ' mana', x + 14, y + 23 * k, '#a8e8ff');
  CU.text(g, 'Quest: ' + G.get('site', c.site).name, x + 6, y + 33 * k, CU.COL.dim);
  // circle
  const circ = sim.circle(cid); CU.text(g, 'Circle:', x + 6, y + 43 * k, CU.COL.dim); circ.slice(0, 5).forEach((sp, i) => CP.sprite(g, G.elemIcon(G.get('monster', sp).elem), x + 40 * k + i * 10, y + 44 * k));
  // knights
  cs.knights.forEach((kid, i) => {
    const kk = sim.knight(kid), yy = y + (54 + i * 13) * k; G.knightVis(kid).portrait(g, x + 4, yy, 12 * k, { bg: '#1a1e40', frame: false });
    CU.text(g, kname(kid), x + 6 + 12 * k, yy + 1, kk.ruler ? CU.COL.gold : '#ffffff'); CU.text(g, 'Lv' + kk.level + '  ' + kk.troop.length + '/6', x + w - 6, yy + 1, CU.COL.dim, { align: 'right' });
    if (kk.wounded) CU.text(g, 'W', x + w - 58 * k, yy + 1, '#ff6a5a'); if (kk.moved) CU.text(g, 'M', x + w - 50 * k, yy + 1, '#8ab0ff');
  });
  if (cs.reserve.length) CU.text(g, 'Reserve: ' + cs.reserve.length, x + 6, y + (54 + rows * 13) * k, CU.COL.dim);
  if (actions) {
    const ay = y + h - 36 * k, aw = (w - 12) / 3;
    actions.items = actions.rows.map((a, i) => ({ x: x + 6 + (i % 3) * aw, y: ay + Math.floor(i / 3) * 16 * k, w: aw - 4, h: 13 * k, disabled: a.disabled }));
    actions.rows.forEach((a, i) => { const it = actions.items[i], on = i === st.f; CP.rect(g, it.x, it.y, it.w, it.h, on ? '#2e3a78' : '#1a1e40'); CU.text(g, a.label, it.x + it.w / 2, it.y + 3, a.disabled ? '#6a6680' : on ? CU.COL.focus : '#ffffff', { align: 'center' }); if (on) CU.focusFrame(g, it.x, it.y, it.w, it.h, C.t); });
    const sel = actions.rows[st.f]; if (sel && sel.disabled) CU.text(g, sel.disabled, x + 6, y + h + 2, '#ff9a8a');
  }
}
function castlePanel(cid) {
  const sim = C.sim, r0 = me(), cs = sim.s.castles[cid], st = { f: 0 };
  const has = cs.knights.length > 0;
  const actions = { rows: [
    { label: 'Organize', act: () => organizePanel(cid), disabled: has || cs.reserve.length ? false : 'No knights here' },
    { label: 'Summon', act: () => summonPanel(cid), disabled: cs.stilled ? 'The castle is Stilled' : cs.summons >= 3 ? 'Three summons a season' : false },
    { label: 'Move', act: () => movePanel(cid), disabled: cs.knights.some(k => sim.canAct(k) && !sim.knight(k).moved) ? false : 'No knight can move' },
    { label: 'Quest', act: () => questPanel(cid), disabled: cs.knights.some(k => !sim.knight(k).ruler && sim.canAct(k) && !sim.knight(k).moved) ? (sim.questingCount(r0) >= 2 ? 'Two away at most' : false) : 'No knight can quest' },
    { label: 'Equip', act: () => equipPanel(cid), disabled: has ? false : 'No knights here' },
    { label: 'Promote', act: () => promotePanel(cid), disabled: promotable(cid).length ? false : 'No one is ready' }] };
  const p = { update() {
    const res = CU.nav(st, actions.items || CU.synth(actions.rows.length, 3));
    if (res === 'pick') { G.sfx('ui_confirm'); const a = actions.rows[st.f]; C.panel = a.act() || null; if (C.panel) C.panel.parentCastle = cid; firstTip(a.label); }
    else if (res === 'back') { C.panel = null; G.sfx('ui_cancel'); }
  }, draw(r) { r.overlay(g => castleCard(g, r, cid, actions, st)); CU.prompts(r, [['move', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']]); }, back() { C.panel = null; } };
  return p;
}
function firstTip(label) {
  const t = { Organize: 'Bind monsters to a knight. Their ranks may not add up to more than the knight\'s Bond. Square/Space sets the formation.', Summon: 'Pay mana to summon a monster from this castle\'s circle. It joins the reserve; upkeep is paid each Tidings.', Move: 'A knight may move once a Muster to a castle of yours next door.', Quest: 'A knight leaves for a season or two and comes back with treasure, a beast, a wanderer, mana, training, or a wound.', Equip: 'Each knight has a weapon, armor and accessory slot.', Promote: 'Monsters change form at level 12 and 22 (or sooner with a Season Seed). Knights change class at level 10, and at 20 with a Writ.' }[label];
  if (t) CU.tip('p_' + label, label, t);
}
function backToCastle(cid) { C.panel = castlePanel(cid); }

/** a generic list-and-detail panel */
function listPanel(o) {
  const list = new CU.List(); let rows = o.rows();
  const p = {
    list,
    update() {
      rows = o.rows(); if (o.keys && o.keys(list.sel, list)) return;
      const res = list.update(rows);
      if (res === 'pick') { const row = list.sel; if (row && !row.disabled) { G.sfx('ui_confirm'); o.pick(row, list); } }
      else if (res === 'back') { G.sfx('ui_cancel'); o.back(); }
      if (CU.why) { CU.toast(CU.why, CU.COL.bad, 1.6); CU.why = null; }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), lw = o.w || 150 * k, x = 8, y = 30;
        list.layout(rows, x + 6, y + 16 * k, lw - 12);
        CU.box(g, x, y, lw, list.h + 22 * k, { alpha: .94 });
        CU.text(g, o.title, x + 6, y + 4, CU.COL.gold);
        list.draw(g, C.t);
        if (o.detail && list.sel) o.detail(g, r, list.sel, x + lw + 6, y);
        if (!rows.length && o.empty) CU.text(g, o.empty, x + 8, y + 18 * k, CU.COL.dim);
      });
      CU.prompts(r, o.prompts || [['up', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']]);
    },
    back() { o.back(); }
  };
  return p;
}
/* ---- Organize ---- */
function organizePanel(cid) {
  const sim = C.sim, r0 = me(), st = { col: 0, k: 0, t: 0, r: 0 };
  const knights = () => sim.s.castles[cid].knights.filter(k => !sim.knight(k).quest);
  const reserve = () => sim.s.castles[cid].reserve;
  const p = {
    update() {
      const ks = knights(), inp = G.inp(); if (st.k >= ks.length) st.k = Math.max(0, ks.length - 1);
      const kid = ks[st.k], kk = kid && sim.knight(kid), troop = kk ? kk.troop : [], res = reserve();
      if (G.pressed('next') || G.pressed('prev')) { st.k = (st.k + (G.pressed('prev') ? ks.length - 1 : 1)) % Math.max(1, ks.length); G.sfx('ui_move'); }
      if (G.repeat('left')) { st.col = Math.max(0, st.col - 1); G.sfx('ui_move'); }
      if (G.repeat('right')) { st.col = Math.min(2, st.col + 1); G.sfx('ui_move'); }
      const lenOf = [ks.length, 6, res.length][st.col];
      if (G.repeat('up')) { if (st.col === 0) st.k = Math.max(0, st.k - 1); else if (st.col === 1) st.t = st.t >= 2 ? st.t - 2 : st.t; else st.r = Math.max(0, st.r - 1); G.sfx('ui_move'); }
      if (G.repeat('down')) { if (st.col === 0) st.k = Math.min(Math.max(0, ks.length - 1), st.k + 1); else if (st.col === 1) st.t = st.t + 2 < 6 ? st.t + 2 : st.t; else st.r = Math.min(Math.max(0, res.length - 1), st.r + 1); G.sfx('ui_move'); }
      // mouse
      const c = inp.clicked && inp.clicked(), hp = inp.pointer && inp.pointer();
      const hit = q => { if (!q || !p.hits) return null; return p.hits.find(h => q[0] >= h.x && q[0] < h.x + h.w && q[1] >= h.y && q[1] < h.y + h.h); };
      if (hp && inp.lastDevice === 'mouse' && (!st.hp || hp[0] !== st.hp[0] || hp[1] !== st.hp[1])) { const h = hit(hp); if (h) Object.assign(st, h.set); } st.hp = hp ? hp.slice() : null;
      const clickHit = hit(c);
      if (clickHit) Object.assign(st, clickHit.set);
      if (G.tapped('command') && kk) { const i = FORM.indexOf(kk.formation); sim.apply({ t: 'formation', realm: r0, knight: kid, form: FORM[(i + 1) % 3] }); G.sfx('ui_move'); }
      if (inp.pressed('confirm') || clickHit) {
        if (st.col === 1 && troop[st.t]) { const ev = sim.apply({ t: 'unbind', realm: r0, uid: troop[st.t] }); ev[0].e === 'illegal' ? CU.toast(ev[0].why, CU.COL.bad) : G.sfx('ui_confirm'); }
        else if (st.col === 2 && res[st.r] && kid) { const ev = sim.apply({ t: 'bind', realm: r0, uid: res[st.r], knight: kid }); if (ev[0].e === 'illegal') { CU.toast(ev[0].why, CU.COL.bad); G.sfx('ui_error'); } else { G.sfx('ui_confirm'); st.r = Math.min(st.r, Math.max(0, reserve().length - 1)); } }
        else if (st.col === 0) { st.col = 1; }
      }
      if (inp.pressed('info') && st.col === 2 && res[st.r]) { const uid = res[st.r]; CU.confirm('Dismiss this ' + G.monsterName(sim.monster(uid).sp, sim.monster(uid).form) + '? It will be gone.', () => { sim.apply({ t: 'dismiss', realm: r0, uid }); st.r = 0; }); }
      if (inp.pressed('cancel')) { G.sfx('ui_cancel'); backToCastle(cid); }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), W = r.W, x0 = 8, y0 = 26, ks = knights(), kid = ks[st.k], kk = kid && sim.knight(kid), res = reserve();
        p.hits = [];
        const cw = Math.floor((W - 24) * .29), tcw = Math.floor((W - 24) * .42);
        // knights
        CU.box(g, x0, y0, cw, 150 * k, { alpha: .94 }); CU.text(g, 'KNIGHTS', x0 + 6, y0 + 4, CU.COL.gold);
        ks.slice(0, 6).forEach((id, i) => { const yy = y0 + 16 * k + i * 20 * k, on = i === st.k; if (on) CP.rect(g, x0 + 3, yy - 1, cw - 6, 19 * k, '#2e3a78'); G.knightVis(id).portrait(g, x0 + 5, yy, 18 * k, { bg: '#1a1e40', frame: false }); CU.text(g, kname(id), x0 + 8 + 18 * k, yy + 1, on ? CU.COL.focus : '#ffffff'); CU.text(g, 'Lv' + sim.knight(id).level + '  Bond ' + sim.bondUsed(id) + '/' + sim.bondOf(id), x0 + 8 + 18 * k, yy + 10 * k, CU.COL.dim); p.hits.push({ x: x0 + 3, y: yy - 1, w: cw - 6, h: 19 * k, set: { col: 0, k: i } }); if (on && st.col === 0) CU.focusFrame(g, x0 + 3, yy - 1, cw - 6, 19 * k, C.t); });
        // troop
        const x1 = x0 + cw + 4; CU.box(g, x1, y0, tcw, 150 * k, { alpha: .94 });
        if (kk) {
          CU.text(g, kname(kid).toUpperCase() + "'S TROOP", x1 + 6, y0 + 4, CU.COL.gold);
          const bu = sim.bondUsed(kid), bo = sim.bondOf(kid); for (let i = 0; i < bo; i++) CP.rect(g, x1 + 6 + i * 5, y0 + 15 * k, 4, 4, i < bu ? '#ffd060' : '#3a3a5a'); CU.text(g, 'Bond ' + bu + '/' + bo, x1 + tcw - 6, y0 + 13 * k, CU.COL.dim, { align: 'right' });
          const tw = Math.floor((tcw - 16) / 2), th = 34 * k;
          for (let i = 0; i < 6; i++) {
            const tx = x1 + 6 + (i % 2) * (tw + 4), ty = y0 + 24 * k + Math.floor(i / 2) * (th + 3), uid = kk.troop[i], on = st.col === 1 && st.t === i;
            CP.rect(g, tx, ty, tw, th, on ? '#2e3a78' : '#1a1e40');
            if (uid) { const m = sim.monster(uid), vis = G.monsterVis(m.sp, m.form); vis.portrait(g, tx + 2, ty + 2, th - 4, { bg: E.tones(G.elemColor(G.get('monster', m.sp).elem)).deep, frame: false }); CU.text(g, G.monsterName(m.sp, m.form).slice(0, 11), tx + th, ty + 2, '#ffffff'); CU.text(g, 'Lv' + m.level + ' R' + G.get('monster', m.sp).rank, tx + th, ty + 12 * k, CU.COL.dim); CU.bar(g, tx + th, ty + 22 * k, tw - th - 4, 4 * k, m.hp / sim.monsterStats(uid).hp, '#5ad86a'); }
            else CU.text(g, 'empty', tx + tw / 2, ty + th / 2 - 3, '#4a4a6a', { align: 'center' });
            p.hits.push({ x: tx, y: ty, w: tw, h: th, set: { col: 1, t: i } }); if (on) CU.focusFrame(g, tx, ty, tw, th, C.t);
          }
          CU.text(g, 'Formation: ' + FORM_NAME[kk.formation], x1 + 6, y0 + 140 * k, '#c8d8ff');
        }
        // reserve
        const x2 = x1 + tcw + 4; CU.box(g, x2, y0, cw, 150 * k, { alpha: .94 }); CU.text(g, 'RESERVE (' + res.length + ')', x2 + 6, y0 + 4, CU.COL.gold);
        const top = Math.max(0, st.r - 5);
        res.slice(top, top + 6).forEach((uid, j) => { const i = top + j, m = sim.monster(uid), yy = y0 + 16 * k + j * 20 * k, on = st.col === 2 && st.r === i; if (on) CP.rect(g, x2 + 3, yy - 1, cw - 6, 19 * k, '#2e3a78'); G.monsterVis(m.sp, m.form).portrait(g, x2 + 5, yy, 18 * k, { bg: '#1a1e40', frame: false }); CU.text(g, G.monsterName(m.sp, m.form), x2 + 8 + 18 * k, yy + 1, on ? CU.COL.focus : '#ffffff'); CU.text(g, 'Lv' + m.level + '  Rank ' + G.get('monster', m.sp).rank, x2 + 8 + 18 * k, yy + 10 * k, CU.COL.dim); p.hits.push({ x: x2 + 3, y: yy - 1, w: cw - 6, h: 19 * k, set: { col: 2, r: i } }); if (on) CU.focusFrame(g, x2 + 3, yy - 1, cw - 6, 19 * k, C.t); });
        if (!res.length) CU.text(g, 'Summon or capture monsters to fill the reserve.', x2 + 6, y0 + 18 * k, CU.COL.dim, { wrap: cw - 12 });
      });
      CU.prompts(r, [['confirm', st.col === 2 ? 'Bind' : st.col === 1 ? 'Unbind' : 'Select'], ['command', 'Formation'], ['info', st.col === 2 ? 'Dismiss' : 'Details'], ['next', 'Knight'], ['cancel', 'Back']]);
    },
    back() { backToCastle(cid); }
  };
  return p;
}
/* ---- Summon ---- */
function summonPanel(cid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: 'SUMMON • ' + G.get('castle', cid).name, w: 150 * CU.k(),
    rows: () => sim.circle(cid).map(sp => { const why = sim.illegal({ t: 'summon', realm: r0, castle: cid, sp }); return { label: G.monsterName(sp, 1), right: sim.summonCost(sp) + ' mana', sp, disabled: why || false, icon: (g, x, y) => CP.sprite(g, G.elemIcon(G.get('monster', sp).elem), x, y) }; }),
    pick: row => { const ev = sim.apply({ t: 'summon', realm: r0, castle: cid, sp: row.sp }); if (ev[0].e === 'summon') { G.sting('summon'); G.sfx('summon_rise'); CU.toast(G.monsterName(row.sp, 1) + ' joins the reserve', '#a8e8ff'); C.summonFx = { sp: row.sp, t: 0 }; } },
    detail: (g, r, row, x, y) => monsterCard(g, x, y, row.sp, 1, sim.summonLevel(r0), true),
    back: () => backToCastle(cid), prompts: [['up', 'Choose'], ['confirm', 'Summon'], ['cancel', 'Back']] });
}
function monsterCard(g, x, y, sp, form, level, circle) {
  const k = CU.k(), m = G.get('monster', sp), st = G.monsterStats(sp, form, level), w = 150 * k, h = 128 * k;
  CU.box(g, x, y, w, h, { alpha: .94 });
  const vis = G.monsterVis(sp, form);
  if (circle) { const cx = x + 34 * k, cy = y + 40 * k; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + C.t; CP.dot(g, cx + Math.cos(a) * 26 * k, cy + Math.sin(a) * 10 * k + 10 * k, G.elemColor(m.elem)); } }
  vis.portrait(g, x + 6, y + 6, 56 * k, { bg: E.tones(G.elemColor(m.elem)).deep });
  CU.text(g, G.monsterName(sp, form), x + 66 * k, y + 6, '#ffffff'); CP.sprite(g, G.elemIcon(m.elem), x + 66 * k, y + 16 * k); CU.text(g, G.SEASON_NAME[m.elem] + ' • ' + G.monsterSize(sp, form) + ' • Rank ' + m.rank, x + 76 * k, y + 15 * k, CU.COL.dim);
  const fl = G.monsterFlags(sp, form); CU.text(g, [fl.flier && 'Flier', fl.swimmer && 'Swimmer', fl.floater && 'Floater'].filter(Boolean).join(' ') || 'Walker', x + 66 * k, y + 25 * k, '#c8d8ff');
  CU.text(g, 'Upkeep ' + G.monsterUpkeep(sp, form) + ' • Lv ' + level, x + 66 * k, y + 35 * k, CU.COL.dim);
  const bars = [['HP', st.hp, 240, '#5ad86a'], ['ATK', st.atk, 60, '#ff7a5a'], ['DEF', st.def, 60, '#5a9aff'], ['INT', st.int, 60, '#c87aff'], ['AGI', st.agi, 40, '#ffe05a']];
  bars.forEach(([l, v, mx, c], i) => { const yy = y + (66 + i * 10) * k; CU.text(g, l, x + 6, yy, CU.COL.dim); CU.bar(g, x + 30 * k, yy + 1, w - 66 * k, 5 * k, v / mx, c); CU.text(g, v, x + w - 6, yy, '#ffffff', { align: 'right' }); });
  CU.text(g, 'Skills: ' + G.monsterSkills(sp, form).map(s => G.get('skill', s).name).join(', ').slice(0, 34), x + 6, y + 118 * k, '#e8e0c8');
}
/* ---- Move ---- */
function movePanel(cid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: 'MOVE FROM ' + G.get('castle', cid).name.toUpperCase(),
    rows: () => sim.s.castles[cid].knights.map(kid => { const kk = sim.knight(kid); return { label: kname(kid), right: 'Lv' + kk.level, kid, disabled: !sim.canAct(kid) ? (kk.wounded ? 'Wounded' : 'Cannot act') : kk.moved ? 'Moved already' : false }; }),
    pick: row => { C.panel = pickCastlePanel('Move ' + kname(row.kid) + ' to', G.get('castle', cid).roads.filter(c => sim.s.castles[c].owner === r0), to => { const ev = sim.apply({ t: 'move', realm: r0, knight: row.kid, to }); if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); else { G.sfx('ui_confirm'); C.focus = to; CU.toast(kname(row.kid) + ' rides to ' + cname(to), '#c8d8ff'); } backToCastle(to); }, () => { C.panel = movePanel(cid); }); },
    back: () => backToCastle(cid) });
}
/** pick a castle on the map from a set */
function pickCastlePanel(title, allowed, done, back) {
  if (!allowed.length) { CU.toast('No castle of yours is next door', CU.COL.bad); back(); return C.panel; }
  C.focus = allowed[0]; C.free = false;
  return { allowed, update() { mapNav(allowed); const inp = G.inp(); if (inp.pressed('confirm') && allowed.includes(C.focus)) done(C.focus); else if (inp.pressed('cancel')) { G.sfx('ui_cancel'); back(); } },
    draw(r) { r.overlay(g => { const w = CU.width(title) + 16; CU.box(g, Math.round((r.W - w) / 2), 30, w, 14 * CU.k()); CU.text(g, title, r.W / 2, 33, CU.COL.gold, { align: 'center' }); }); CU.prompts(r, [['move', 'Castle'], ['confirm', 'Choose'], ['cancel', 'Back']]); } };
}
/* ---- Quest ---- */
function questPanel(cid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: 'QUEST FROM ' + G.get('castle', cid).name.toUpperCase(),
    rows: () => sim.s.castles[cid].knights.map(kid => { const kk = sim.knight(kid), sites = questSites(cid); return { label: kname(kid), right: 'Lv' + kk.level, kid, disabled: sim.illegal({ t: 'quest', realm: r0, knight: kid, site: sites[0] }) || false }; }),
    pick: row => { C.panel = siteListPanel(cid, row.kid); },
    detail: (g, r, row, x, y) => { const site = G.get('site', questSites(cid)[0]); siteCard(g, x, y, site); },
    back: () => backToCastle(cid) });
}
function questSites(cid) { const sim = C.sim, out = [G.get('castle', cid).site]; for (const s of G.all('site')) if (s.story && sim.s.flags['site_' + s.id] && (G.adjacent(cid, s.castle) || cid === s.castle) && !out.includes(s.id)) out.push(s.id); return out; }
function siteListPanel(cid, kid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: kname(kid).toUpperCase() + ' RIDES FOR',
    rows: () => questSites(cid).map(id => { const s = G.get('site', id); return { label: s.name, right: s.away + (s.away > 1 ? ' seasons' : ' season'), site: id, disabled: sim.illegal({ t: 'quest', realm: r0, knight: kid, site: id }) || false }; }),
    pick: row => { const ev = sim.apply({ t: 'quest', realm: r0, knight: kid, site: row.site }); if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); else { CU.toast(kname(kid) + ' rides for ' + G.get('site', row.site).name, '#c8d8ff'); backToCastle(cid); } },
    detail: (g, r, row, x, y) => siteCard(g, x, y, G.get('site', row.site)),
    back: () => { C.panel = questPanel(cid); }, prompts: [['up', 'Choose'], ['confirm', 'Send'], ['cancel', 'Back']] });
}
function siteCard(g, x, y, site) {
  const k = CU.k(), w = 160 * k, h = 96 * k; CU.box(g, x, y, w, h, { alpha: .94 });
  // a small vignette: the site's region colour and a landmark
  const reg = G.get('castle', site.castle).region, col = G.REGION[G.regionKey(reg)] || G.REGION.neutral;
  CP.rect(g, x + 6, y + 6, w - 12, 24 * k, col.base); CP.rect(g, x + 6, y + 6 + 16 * k, w - 12, 8 * k, col.dark); CP.disc(g, x + w - 30, y + 14, 5, '#fff0c0');
  CU.text(g, site.name, x + 8, y + 34 * k, '#ffffff');
  E.font.wrap(site.desc, w - 16, { scale: k }).slice(0, 2).forEach((l, i) => CU.text(g, l, x + 8, y + (44 + i * 10) * k, CU.COL.dim));
  CU.text(g, 'Away ' + site.away + (site.away > 1 ? ' seasons' : ' season') + (site.story ? ' • a story' : ' • focus: ' + site.focus), x + 8, y + 68 * k, '#c8d8ff');
  const icons = ['treasure', 'beast', 'wanderer', 'mana', 'training', 'mishap'], ic = { treasure: G.itemIcon('ring'), beast: G.elemIcon('spring'), wanderer: G.ICON.away, mana: G.ICON.mana, training: G.fxIcon('valor'), mishap: G.fxIcon('exposed') };
  icons.forEach((o, i) => CP.sprite(g, ic[o], x + 8 + i * 16, y + 80 * k));
  CU.text(g, 'Risk: ' + (site.mishap ? 'high' : 'low'), x + w - 8, y + 80 * k, site.mishap ? '#ff9a8a' : '#9ae09a', { align: 'right' });
}
/* ---- Equip ---- */
function equipPanel(cid) {
  const sim = C.sim, r0 = me(), st = { k: 0, slot: 0 };
  const ks = () => sim.s.castles[cid].knights.filter(k => !sim.knight(k).quest);
  const SL = ['weapon', 'armor', 'accessory'];
  return listPanel({ title: 'EQUIP', w: 150 * CU.k(),
    rows: () => {
      const kid = ks()[st.k]; if (!kid) return [];
      const kk = sim.knight(kid), slot = SL[st.slot], items = sim.s.realms[r0].items, out = [];
      if (kk.items[slot]) out.push({ label: 'Remove ' + G.get('item', kk.items[slot]).name, remove: true });
      for (const [id, n] of Object.entries(items)) { if (n <= 0) continue; const it = G.get('item', id); if (it.slot !== slot) continue; out.push({ label: it.name, right: 'x' + n, item: id, disabled: G.canEquip(id, kk.cls) ? false : 'Not for a ' + G.get('class', kk.cls).name, icon: (g, x, y) => CP.sprite(g, G.itemIcon(id), x, y - 1) }); }
      return out;
    },
    keys: () => { if (G.pressed('next') || G.pressed('prev')) { const n = ks().length; st.k = (st.k + (G.pressed('prev') ? n - 1 : 1)) % Math.max(1, n); G.sfx('ui_move'); return true; } if (G.repeat('left')) { st.slot = (st.slot + 2) % 3; G.sfx('ui_move'); return true; } if (G.repeat('right')) { st.slot = (st.slot + 1) % 3; G.sfx('ui_move'); return true; } return false; },
    pick: row => { const kid = ks()[st.k]; const ev = row.remove ? sim.apply({ t: 'unequip', realm: r0, knight: kid, slot: SL[st.slot] }) : sim.apply({ t: 'equip', realm: r0, knight: kid, item: row.item }); if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); },
    detail: (g, r, row, x, y) => {
      const kid = ks()[st.k]; if (!kid) return; const kk = sim.knight(kid), k = CU.k(), w = 170 * k, h = 128 * k; CU.box(g, x, y, w, h, { alpha: .94 });
      G.knightVis(kid).portrait(g, x + 6, y + 6, 40 * k); CU.text(g, kname(kid), x + 50 * k, y + 6, '#ffffff'); CU.text(g, G.get('class', kk.cls).name + ' Lv' + kk.level, x + 50 * k, y + 16 * k, CU.COL.dim);
      SL.forEach((sl, i) => { const it = kk.items[sl], yy = y + (52 + i * 12) * k, on = i === st.slot; CU.text(g, (on ? '▸ ' : '  ') + G.cap(sl) + ': ' + (it ? G.get('item', it).name : '-'), x + 6, yy, on ? CU.COL.focus : '#ffffff'); });
      // the stat change
      const cur = G.unitFromKnight(kk), test = row && row.item ? G.unitFromKnight(Object.assign({}, kk, { items: Object.assign({}, kk.items, { [SL[st.slot]]: row.item }) })) : row && row.remove ? G.unitFromKnight(Object.assign({}, kk, { items: Object.assign({}, kk.items, { [SL[st.slot]]: null }) })) : cur;
      ['atk', 'def', 'int', 'agi', 'mov', 'ward'].forEach((s2, i) => { const a = cur[s2], b = test[s2], yy = y + (92 + Math.floor(i / 3) * 11) * k, xx = x + 6 + (i % 3) * 54 * k; CU.text(g, s2.toUpperCase() + ' ' + b, xx, yy, b > a ? '#7ae07a' : b < a ? '#ff6a5a' : '#ffffff'); if (b !== a) CU.text(g, b > a ? '↑' : '↓', xx + 40 * k, yy, b > a ? '#7ae07a' : '#ff6a5a'); });
      if (row && row.item) CU.text(g, G.get('item', row.item).desc, x + 6, y + 116 * k, CU.COL.dim);
    },
    back: () => backToCastle(cid), prompts: [['up', 'Item'], ['left', 'Slot'], ['next', 'Knight'], ['confirm', 'Equip'], ['cancel', 'Back']] });
}
/* ---- Promote ---- */
function promotable(cid) {
  const sim = C.sim, r0 = me(), out = [], cs = sim.s.castles[cid];
  for (const kid of cs.knights) { if (sim.legal({ t: 'classchange', realm: r0, knight: kid })) out.push({ kind: 'knight', id: kid }); for (const uid of sim.knight(kid).troop) if (sim.legal({ t: 'promote', realm: r0, uid }) || sim.legal({ t: 'promote', realm: r0, uid, seed: true })) out.push({ kind: 'monster', id: uid }); }
  for (const uid of cs.reserve) if (sim.legal({ t: 'promote', realm: r0, uid }) || sim.legal({ t: 'promote', realm: r0, uid, seed: true })) out.push({ kind: 'monster', id: uid });
  return out;
}
function promotePanel(cid) {
  const sim = C.sim, r0 = me();
  return listPanel({ title: 'PROMOTE', empty: 'No one is ready.',
    rows: () => promotable(cid).map(p => p.kind === 'knight' ? { label: kname(p.id), right: '→ ' + G.get('class', G.get('class', sim.knight(p.id).cls).next).name, p } : { label: G.monsterName(sim.monster(p.id).sp, sim.monster(p.id).form), right: '→ ' + G.monsterName(sim.monster(p.id).sp, sim.monster(p.id).form + 1), p }),
    pick: row => {
      const p = row.p; let ev;
      if (p.kind === 'knight') ev = sim.apply({ t: 'classchange', realm: r0, knight: p.id });
      else { ev = sim.apply({ t: 'promote', realm: r0, uid: p.id }); if (ev[0].e === 'illegal') ev = sim.apply({ t: 'promote', realm: r0, uid: p.id, seed: true }); }
      if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); else { G.sting('promote'); G.game.flash('#ffffff', .2, .5); C.promoFx = { t: 0, p }; CU.toast(p.kind === 'knight' ? kname(p.id) + ' becomes a ' + G.get('class', sim.knight(p.id).cls).name + '!' : 'It becomes a ' + G.monsterName(sim.monster(p.id).sp, sim.monster(p.id).form) + '!', '#ffe080', 3); }
    },
    detail: (g, r, row, x, y) => {
      const k = CU.k(), w = 190 * k, h = 110 * k, p = row.p; CU.box(g, x, y, w, h, { alpha: .94 });
      if (p.kind === 'monster') {
        const m = sim.monster(p.id), a = G.monsterStats(m.sp, m.form, m.level), b = G.monsterStats(m.sp, m.form + 1, m.level);
        G.monsterVis(m.sp, m.form).portrait(g, x + 6, y + 6, 44 * k); G.monsterVis(m.sp, m.form + 1).portrait(g, x + w - 50 * k, y + 6, 44 * k);
        CU.text(g, '→', x + w / 2, y + 24 * k, CU.COL.gold, { align: 'center', scale: 2 });
        ['hp', 'atk', 'def', 'int', 'agi'].forEach((s2, i) => { const yy = y + (56 + i * 10) * k; CU.text(g, s2.toUpperCase(), x + 6, yy, CU.COL.dim); CU.bar(g, x + 34 * k, yy + 1, w - 80 * k, 5 * k, b[s2] / (s2 === 'hp' ? 300 : 80), '#7ae07a'); CU.bar(g, x + 34 * k, yy + 1, (w - 80 * k) * a[s2] / b[s2], 5 * k, a[s2] / (s2 === 'hp' ? 300 : 80) * b[s2] / a[s2] * a[s2] / b[s2], '#5a9aff'); CU.text(g, a[s2] + '→' + b[s2], x + w - 6, yy, '#ffffff', { align: 'right' }); });
      } else {
        const kk = sim.knight(p.id), nx = G.get('class', G.get('class', kk.cls).next);
        G.knightVis(p.id).portrait(g, x + 6, y + 6, 44 * k); CU.text(g, G.get('class', kk.cls).name + ' → ' + nx.name, x + 56 * k, y + 10 * k, '#ffffff');
        CU.text(g, 'Every stat x1.1; growth improves.', x + 56 * k, y + 22 * k, CU.COL.dim); CU.text(g, 'New skills: ' + nx.skills.filter(s => !G.get('class', kk.cls).skills.some(t => t[0] === s[0])).map(s => G.get('skill', s[0]).name + ' (' + s[1] + ')').join(', ').slice(0, 40), x + 6, y + 60 * k, '#e8e0c8');
        if (nx.tier === 3) CU.text(g, 'Uses a Writ of Knighthood', x + 6, y + 74 * k, '#ffd060');
      }
    },
    back: () => backToCastle(cid), prompts: [['up', 'Choose'], ['confirm', 'Promote'], ['cancel', 'Back']] });
}

/* ---- the March ---- */
function marchPanel(target) {
  const sim = C.sim, r0 = me(), chosen = [], st = { f: 0 };
  const already = sim.s.marches.find(m => m.realm === r0 && m.target === target);
  if (already) { CU.confirm('Call off the march on ' + cname(target) + '?', () => sim.apply({ t: 'undeclare', realm: r0, target })); return null; }
  const avail = sim.marchers(r0, target);
  if (!avail.length) { CU.toast('No knight beside it can march', CU.COL.bad); return null; }
  const list = new CU.List();
  const p = {
    update() {
      const rows = rowsOf();
      if (G.holdDone('command') || G.tapped('command')) return declare();
      const res = list.update(rows);
      if (res === 'pick') { const row = list.sel; if (row.declare) return declare(); const i = chosen.indexOf(row.kid); if (i >= 0) chosen.splice(i, 1); else if (chosen.length < 3) chosen.push(row.kid); else { CU.toast('Three troops at most', CU.COL.bad); G.sfx('ui_error'); return; } G.sfx('ui_confirm'); }
      else if (res === 'back') { G.sfx('ui_cancel'); C.panel = null; }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), x = 8, y = 30, w = 170 * k, rows = rowsOf();
        list.layout(rows, x + 6, y + 16 * k, w - 12);
        CU.box(g, x, y, w, list.h + 22 * k, { alpha: .94 }); CU.text(g, 'MARCH ON ' + cname(target).toUpperCase(), x + 6, y + 4, CU.COL.gold);
        list.draw(g, C.t);
        // the target card: defenders' power against ours
        const x2 = r.W - 170 * k - 6, def = target === 'sanctum' ? 6000 : G.CampaignAI.defense(sim, target), ours = G.sum(chosen, k2 => sim.troopPower(k2));
        CU.box(g, x2, y, 170 * k, 70 * k, { alpha: .94 });
        CU.text(g, target === 'sanctum' ? 'The Gray Knight' : cname(target), x2 + 6, y + 4, '#ffffff');
        CU.text(g, target === 'sanctum' ? 'Clockwork Sanctum' : G.get('map', G.get('castle', target).map).name + ' • ' + G.SEASON_NAME[sim.season], x2 + 6, y + 14 * k, CU.COL.dim);
        CU.text(g, 'Ours', x2 + 6, y + 28 * k, '#c8d8ff'); CU.bar(g, x2 + 40 * k, y + 29 * k, 120 * k, 6 * k, ours / Math.max(ours, def, 1), '#5a9aff');
        CU.text(g, 'Theirs', x2 + 6, y + 40 * k, '#ffb0a0'); CU.bar(g, x2 + 40 * k, y + 41 * k, 120 * k, 6 * k, def / Math.max(ours, def, 1), '#ff6a5a');
        CU.text(g, target === 'sanctum' ? 'Light the four Season Dials!' : sim.s.castles[target].knights.length ? sim.defenders(target).length + ' knight(s) defend' : 'Undefended: the gates stand open', x2 + 6, y + 54 * k, CU.COL.dim);
      });
      CU.prompts(r, [['confirm', 'Choose troops'], ['command', 'Declare'], ['cancel', 'Back']]);
    },
    back() { C.panel = null; }
  };
  function rowsOf() { const rows = avail.map(kid => { const kk = sim.knight(kid), on = chosen.includes(kid); return { label: (on ? '* ' : '- ') + kname(kid), right: 'Lv' + kk.level + ' ' + kk.troop.length + '/6', kid, color: on ? '#ffe080' : null }; }); rows.push({ label: 'Declare the march', declare: true, disabled: chosen.length ? false : 'Choose at least one troop' }); return rows; }
  function declare() { if (!chosen.length) { CU.toast('Choose at least one troop', CU.COL.bad); return; } const ev = sim.apply({ t: 'declare', realm: r0, target, knights: chosen.slice() }); if (ev[0].e === 'illegal') CU.toast(ev[0].why, CU.COL.bad); else { G.sfx('march_drums'); CU.toast('March declared on ' + cname(target), realmOf(r0).color); C.panel = null; } }
  return p;
}

/* ---- the command menu: Realm, Chronicle, Objectives, End phase ---- */
function commandsPanel() {
  const sim = C.sim, ph = sim.s.phase, rows = [
    { label: 'Realm', act: () => { C.panel = realmPanel(0); } },
    { label: 'Chronicle', act: () => { C.panel = realmPanel(3); } },
    { label: 'Objectives', act: () => { C.panel = realmPanel(4); } },
    ph === 'muster' ? { label: 'End Muster', act: () => { C.panel = null; askEndMuster(); } } : ph === 'march' ? { label: 'End March', act: () => { C.panel = null; askEndMarch(); } } : null].filter(Boolean);
  return listPanel({ title: 'COMMANDS', rows: () => rows, pick: row => row.act(), back: () => { C.panel = null; } });
}
function realmPanel(tab0) {
  const sim = C.sim, r0 = me(), TABS = ['Knights', 'Monsters', 'Items', 'Chronicle', 'Objectives'], st = { tab: tab0, f: 0, top: 0 };
  const list = new CU.List();
  const rowsFor = () => {
    switch (st.tab) {
      case 0: return sim.knightsOf(r0).map(k => ({ label: kname(k.id), right: G.get('class', k.cls).name + ' Lv' + k.level, k }));
      case 1: return Object.values(sim.s.monsters).filter(m => m.realm === r0).map(m => ({ label: G.monsterName(m.sp, m.form), right: 'Lv' + m.level + (m.knight ? ' • ' + kname(m.knight) : ' • reserve'), m }));
      case 2: return Object.entries(sim.s.realms[r0].items).filter(([, n]) => n > 0).map(([id, n]) => ({ label: G.get('item', id).name, right: 'x' + n, item: id, icon: (g, x, y) => CP.sprite(g, G.itemIcon(id), x, y - 1), disabled: false, use: G.get('item', id).use && G.get('item', id).use.mana }));
      case 3: return sim.s.chronicle.slice().reverse().map(c => ({ label: c.text.slice(0, 60), right: G.SEASON_NAME[G.SEASONS[c.turn % 4]].slice(0, 3) + ' Y' + (Math.floor(c.turn / 4) + 1) }));
      case 4: return objectives().map(o => ({ label: o }));
    }
    return [];
  };
  return {
    update() {
      if (G.pressed('next') || G.repeat('right') && st.tab !== 2) { st.tab = (st.tab + 1) % 5; list.index = 0; G.sfx('ui_move'); return; }
      if (G.pressed('prev') || G.repeat('left') && st.tab !== 2) { st.tab = (st.tab + 4) % 5; list.index = 0; G.sfx('ui_move'); return; }
      const res = list.update(rowsFor());
      if (res === 'pick' && list.sel && list.sel.use && sim.s.phase === 'muster') { sim.apply({ t: 'use', realm: r0, item: list.sel.item }); CU.toast('+60 mana', '#a8e8ff'); }
      if (res === 'back') { G.sfx('ui_cancel'); C.panel = null; }
    },
    draw(r) {
      r.overlay(g => {
        const k = CU.k(), x = 8, y = 26, w = Math.min(r.W - 16, 320 * k);
        list.layout(rowsFor(), x + 6, y + 30 * k, w - 12);
        CU.box(g, x, y, w, Math.max(80 * k, list.h + 36 * k), { alpha: .95 });
        TABS.forEach((t2, i) => { const tw = w / 5, tx = x + i * tw; CP.rect(g, tx + 2, y + 4, tw - 4, 12 * k, i === st.tab ? '#2e3a78' : '#1a1e40'); CU.text(g, t2, tx + tw / 2, y + 6, i === st.tab ? CU.COL.focus : '#c8c8d8', { align: 'center' }); });
        CU.text(g, realmOf(r0).name + ' • ' + G.cap(sim.s.difficulty) + (sim.s.dev ? ' • DEV' : ''), x + 6, y + 19 * k, CU.COL.dim);
        list.draw(g, C.t);
        const sel = list.sel;
        if (sel && st.tab === 0) { const kk = sel.k, u = G.unitFromKnight(kk); CU.text(g, 'HP ' + kk.hp + '/' + kk.stats.hp + ' ATK ' + u.atk + ' DEF ' + u.def + ' INT ' + u.int + ' AGI ' + u.agi + ' MOV ' + u.mov + ' Ward ' + u.ward, x + 6, y + Math.max(80 * k, list.h + 36 * k) + 4, '#ffffff'); }
        if (sel && st.tab === 2) CU.text(g, G.get('item', sel.item).desc + (sel.use ? '  (' + G.labelOf('confirm') + ': use)' : ''), x + 6, y + Math.max(80 * k, list.h + 36 * k) + 4, '#ffffff');
      });
      CU.prompts(r, [['next', 'Tab'], ['up', 'Scroll'], ['cancel', 'Back']]);
    },
    back() { C.panel = null; }
  };
}
function objectives() {
  const sim = C.sim, s = sim.s, r0 = me(), out = [];
  out.push('Take Meridian, then defeat the Gray Knight in the Clockwork Sanctum.');
  if (s.candle !== null) out.push('The Hour-Candle: ' + s.candle + ' seasons left.'); else out.push('The Hour-Candle is not yet lit (Spring, Year 2).');
  const brig = sim.castlesOf('brigands'); if (brig.length) out.push('Brigand castles remain: ' + brig.map(c => G.get('castle', c).name).join(', ') + '.');
  if (s.flags.site_oldmill && !(s.knights.lunete && s.knights.lunete.realm === r0)) out.push('Seek the Old Mill at Beltane Ford for the Keeper\'s daughter.');
  if (s.sanctumOpen === r0) out.push('March on the Sanctum from Meridian. Light all four Season Dials.');
  out.push('Castles: ' + sim.castlesOf(r0).length + '. Knights: ' + sim.knightsOf(r0).length + '. Mana: ' + s.realms[r0].mana + '.');
  return out;
}
function privacyPanel(realm, done) {
  return { update() { if (G.inp().pressed('confirm') || (G.inp().clicked && G.inp().clicked())) { G.sfx('ui_confirm'); done(); } },
    draw(r) { r.overlay(g => { const k = CU.k(); CP.rect(g, 0, 0, r.W, r.H, '#07060d'); const ru = G.RULER[realm]; G.knightVis(ru).portrait(g, r.W / 2 - 40 * k, r.H / 2 - 70 * k, 80 * k, { bg: E.tones(realmOf(realm).color).deep }); CU.title(g, kname(ru).toUpperCase() + "'S " + (C.sim.s.phase === 'march' ? 'MARCH' : 'MUSTER'), r.W / 2, r.H / 2 + 18 * k, { scale: 2 }); CU.text(g, 'Pass the controller.', r.W / 2, r.H / 2 + 40 * k, '#e8e4f0', { align: 'center' }); }); CU.prompts(r, [['confirm', 'Begin']]); } };
}
/** autoplay (tests and the attract mode): the realm AI plays the player's Muster */
function autoplayMuster() { G.CampaignAI.muster(C.sim, me()); const ev = C.sim.apply({ t: 'endMuster', realm: me() }); afterPhaseChange(ev); }
G.Camp.autoplayMuster = autoplayMuster;

/* ---- drawing the continent ---- */
function drawCampaign(r) {
  const sim = C.sim, s = sim.s, t = C.t, wm = C.wm, L = G.game.lights;
  wm.draw(r, t);
  const attackable = s.phase === 'muster' || s.phase === 'march' ? threatened() : {};
  for (const c of G.all('castle')) {
    const cs = s.castles[c.id], [x, y] = c.pos, R = G.get('realm', cs.owner);
    r.shape(G.castleShape(c.region === 'hour' ? 'hour' : G.CROSS[c.region] ? 'brigand' : c.region), x, y, 0, { facing: Math.PI / 2, flash: cs.stilled ? '#a8a8b8' : false });
    // the banner
    r.queue(x + 22, y + 16, 0, g => { const b = r.w(x + 22, y + 16, 0), tp = r.w(x + 22, y + 16, 58); CP.line(g, b[0], b[1], tp[0], tp[1], '#3a2a1a', 1); const wv = Math.sin(t * 3 + x) * 1.5; CP.poly(g, [[tp[0] + 1, tp[1]], [tp[0] + 15, tp[1] + 1 + wv], [tp[0] + 15, tp[1] + 10 + wv], [tp[0] + 1, tp[1] + 10]], cs.stilled ? '#6a6a76' : R.color); CP.sprite(g, G.sigil(R.sigil, R.trim), tp[0] + 4, tp[1] + 2 + Math.round(wv / 2)); }, { bias: 30 });
    // troop figures in front (up to 4, then +N)
    cs.knights.slice(0, 4).forEach((kid, i) => {
      const kk = sim.knight(kid), vis = G.knightVis(kid), fx = x - 18 + i * 12, fy = y + 22;
      vis.rig.update(1 / 60, { x: fx, y: fy, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: kk.wounded ? 'kneel' : null });
      r.actor(fx, fy, 0, (g, ox, oy) => { g.save(); g.translate(ox, oy); g.scale(.6, .6); g.translate(-ox, -oy); vis.rig.draw(g, ox, oy, r.view); g.restore(); }, { outline: true });
    });
    if (cs.knights.length > 4) r.textAt(x + 30, y + 22, 6, '+' + (cs.knights.length - 4), '#ffffff');
    if (cs.stilled) r.queue(x, y, 60, g => { const q = r.w(x, y, 62); CP.sprite(g, G.ICON.clock, q[0] - 3, q[1] - 3); }, { bias: 50 });
    if (attackable[c.id]) r.queue(x, y, 60, g => { const q = r.w(x - 16, y, 56 + Math.sin(t * 5) * 2); CP.rect(g, q[0] - 3, q[1] - 6, 7, 11, '#c83a2a'); CP.rect(g, q[0] - 1, q[1] - 5, 3, 6, '#ffffff'); CP.rect(g, q[0] - 1, q[1] + 2, 3, 2, '#ffffff'); }, { bias: 50 });
    if (c.region === 'hour' || cs.owner === 'dominion') L.add(x, y, 30, 50, .4, { color: '#ffe0a0' });
  }
  // questing knights: an away icon at their castle of origin
  for (const k of Object.values(s.knights)) if (k.quest && sim.isHuman(k.realm)) { const p = G.get('castle', k.quest.from).pos; r.queue(p[0] + 24, p[1], 40, g => { const q = r.w(p[0] + 24, p[1], 40); CP.sprite(g, G.ICON.away, q[0], q[1]); }, { bias: 60 }); }
  // march arrows: chevrons along the road
  const arrows = (C.marchArrows || []).concat(s.phase === 'march' ? s.marches.filter(m => sim.isHuman(m.realm)).map(m => ({ realm: m.realm, target: m.target, from: Object.values(m.from)[0], n: m.knights.length })) : []);
  for (const a of arrows) {
    if (a.target === 'sanctum' || !a.from) continue;
    const A = G.get('castle', a.from).pos, Bp = G.get('castle', a.target).pos, col = realmOf(a.realm).color;
    r.decal(g => { const n = 9; for (let i = 0; i < n; i++) { const k = ((i + t * 2) % n) / n, x = A[0] + (Bp[0] - A[0]) * (.2 + k * .6), y = A[1] + (Bp[1] - A[1]) * (.2 + k * .6), q = r.w(x, y, 0), d = Math.atan2(Bp[1] - A[1], Bp[0] - A[0]), f = [Math.cos(d), Math.sin(d) * .8], sd = [-f[1], f[0]]; CP.poly(g, [[q[0] + f[0] * 5, q[1] + f[1] * 5], [q[0] - f[0] * 3 + sd[0] * 4, q[1] - f[1] * 3 + sd[1] * 4], [q[0] - f[0], q[1] - f[1]], [q[0] - f[0] * 3 - sd[0] * 4, q[1] - f[1] * 3 - sd[1] * 4]], col); } });
    r.textAt((A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2, 14, 'x' + a.n, '#ffffff');
  }
  // the marching figures walk the road into battle
  if (C.anim && C.anim.march) { const p = C.anim.march, A = G.get('castle', Object.values(p.march.from)[0] || 'meridian').pos, Bp = G.get('castle', p.kind === 'sanctum' ? 'meridian' : p.castle).pos, k = Math.min(1, C.anim.t / C.anim.dur); p.march.knights.forEach((kid, i) => { const vis = G.knightVis(kid), x = A[0] + (Bp[0] - A[0]) * k + i * 6, y = A[1] + (Bp[1] - A[1]) * k + i * 4; vis.rig.update(1 / 60, { x, y, z: 0, vx: (Bp[0] - A[0]), vy: (Bp[1] - A[1]), facing: Math.atan2(Bp[1] - A[1], Bp[0] - A[0]) }); r.actor(x, y, 0, (g, ox, oy) => vis.rig.draw(g, ox, oy, r.view)); }); }
  // the focus ring
  if (C.focus) { const [x, y] = G.get('castle', C.focus).pos; r.decal(g => { const pts = r.groundPts(x, y, 30 + Math.sin(t * 4) * 2, 28, 0); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; CP.line(g, a[0], a[1], b[0], b[1], i % 2 ? '#ffe070' : '#ffffff', 1); } }); }
  if (C.panel && C.panel.allowed) for (const id of C.panel.allowed) { const [x, y] = G.get('castle', id).pos; r.decal(g => { const pts = r.groundPts(x, y, 26, 24, 0); for (let i = 0; i < pts.length; i += 2) CP.dot(g, pts[i][0], pts[i][1], '#7ae0ff'); }); }
  // the season wipe from Meridian
  if (C.wipe > 0) { const rad = (1 - C.wipe) * 700, col = G.elemColor(sim.season); r.decal(g => { const pts = r.groundPts(512, 512, rad, 64, 0), pts2 = r.groundPts(512, 512, rad + 30, 64, 0); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts2[i]; CP.line(g, a[0], a[1], b[0], b[1], col, 2); } }, { emissive: 1 }); }
  hudCampaign(r);
  if (C.panel) C.panel.draw(r);
  CU.modalDraw(r, t); CU.tipDraw(r, 1 / 60); CU.drawToasts(r);
  G.Talk.draw(r);
}
/** castles a neighbour could attack this season (a red "!") */
function threatened() {
  const sim = C.sim, out = {}, r0 = me();
  for (const c of sim.castlesOf(r0)) for (const n of G.get('castle', c).roads) { const o = sim.s.castles[n].owner; if (o !== r0 && o !== 'brigands' && (o !== 'dominion' || G.CampaignAI.aggression(sim, 'dominion') > 0) && sim.defenders(n).length) { out[c] = true; break; } }
  return out;
}
function hudCampaign(r) {
  const sim = C.sim, s = sim.s, r0 = me();
  r.overlay(g => {
    const k = CU.k();
    // top left: the season wheel and the phase
    CU.box(g, 6, 6, 150 * k, 22 * k, { alpha: .9 });
    drawWheel(g, 6 + 11 * k, 6 + 11 * k, 8 * k, sim.season, 0);
    CU.text(g, G.SEASON_NAME[sim.season].toUpperCase() + ' • YEAR ' + sim.year + ' • ' + ({ tidings: 'TIDINGS', muster: 'MUSTER', march: 'MARCH', resolve: 'BATTLES' }[s.phase] || ''), 6 + 22 * k, 9, '#ffffff');
    CU.text(g, realmOf(r0).short + (s.humans.length > 1 ? ' (P' + (s.humans.indexOf(r0) + 1) + ')' : '') + (s.dev ? ' • DEV' : ''), 6 + 22 * k, 9 + 9 * k, E.tones(realmOf(r0).color).lt);
    // top right (clear of the corner): mana and the candle
    const corner = G.game.cornerArea && G.game.cornerArea(), rx = (corner ? Math.min(r.W, corner.x0) : r.W) - 6;
    const rr = s.realms[r0], inc = sim.income(r0) - sim.upkeep(r0);
    CU.box(g, rx - 92 * k, 6, 92 * k, 22 * k, { alpha: .9 });
    CP.sprite(g, G.ICON.mana, rx - 88 * k, 10); CU.text(g, rr.mana + ' (' + (inc >= 0 ? '+' : '') + inc + ')', rx - 80 * k, 9, '#a8e8ff');
    if (s.candle !== null) { CP.sprite(g, G.ICON.candle, rx - 88 * k, 8 + 10 * k); CU.text(g, 'Candle ' + s.candle, rx - 80 * k, 9 + 9 * k, s.candle <= 2 ? '#ff6a5a' : '#ffe0a0'); }
    else CU.text(g, 'Candle unlit', rx - 80 * k, 9 + 9 * k, '#8a86a0');
  });
  if (!C.panel && !G.Talk.open && !CU.modal && !C.anim && !C.todo.length) {
    if (s.phase === 'muster') { r.overlay(g => castleCard(g, r, C.focus, null)); CU.prompts(r, [['move', 'Castle'], ['confirm', 'Muster'], ['info', 'Info'], ['command', 'Commands / Hold: End']]); }
    else if (s.phase === 'march') { r.overlay(g => castleCard(g, r, C.focus, null)); CU.prompts(r, [['move', 'Target'], ['confirm', 'March'], ['command', 'Commands / Hold: End'], ['cancel', 'Pause']]); }
  }
}

}

// ===== src/63-scene-battle.js =====
{
// THE BATTLE SCENE: shows a BattleSim. The event player animates what apply() returns (walks, swings, spells,
// numbers, deaths, captures, level-ups, bells); the player's input becomes commands (choose a unit, move, then one
// action, with a forecast before every confirm); AI troops play at a readable pace. The camera eases to the cursor,
// turns in 60-degree steps and zooms. data: { spec, ctx: { kind, region, owner, title, intro, sides: ['human'|'ai'|
// 'remote'], seats, onEnd(result, sim), net, showcase, speed } }.

const BH = G.hex, BUI = G.UI, BP = E.px, FX = G.FX;
const SC = G.SCENES = G.SCENES || {};
const B = G.Battle = { sim: null };
E.VIEWS.board = new E.View('board', 'Board', 0, 50, 1.5, 1.15);
const SPEED = () => ({ Full: 1, Fast: 2, Minimal: 5 }[(G.game.settings && G.game.settings.battleAnim) || 'Full'] || 1) * G.tune.animSpeed * (B.ctx && B.ctx.speed || 1);

/* ---- the unit views ---- */
function makeViews() {
  B.views = {};
  for (const u of B.sim.units) addView(u);
}
function addView(u) {
  const [x, y] = B.field.center([u.cx, u.cy]);
  B.views[u.id] = { id: u.id, vis: new G.Vis(u), x, y, z: 0, vx: 0, vy: 0, facing: (u.facing || 0) * Math.PI / 3, act: null, hurt: 0, flash: 0, alpha: 1, dying: 0, gone: false, path: null, pathT: 0, kneel: false, summonK: u.summoned ? 0 : 1 };
}
const VW = id => B.views[id];
function hexW(c) { return B.field.center(c); }

/* ---- the event player ---- */
function queue(evs) { for (const e of evs) B.q.push(e); }
function playNext(dt) {
  if (B.wait > 0) { B.wait -= dt * SPEED() * (B.fast ? 4 : 1); return true; }
  if (B.fx.busy) return true;
  if (!B.q.length) return false;
  const e = B.q.shift();
  const d = playEvent(e) || 0;
  B.wait = d;
  return true;
}
function unitPos(id) { const v = VW(id); return v ? [v.x, v.y, v.z] : [0, 0, 0]; }
function lookAt(id) { const v = VW(id); if (v) B.focusGoal = [v.x, v.y]; }
function playEvent(e) {
  const sim = B.sim, s = sim.s, fxl = B.fx;
  switch (e.e) {
    case 'deploy': return 0;
    case 'bell': {
      B.banner = { text: 'BELL ' + e.n + ' / ' + s.bells, sub: G.SEASON_NAME[e.season || s.season] + (s.wheel ? ': the Wheel turns' : ''), t: 0, color: '#ffe080' };
      G.sfx('bell_toll', { pitch: 1 + (e.n - 1) * .03 });
      if (e.n >= Math.max(2, s.bells - 3) && s.mode === 'siege') G.layer('tension', 1);
      B.field.rebuild(); setWeather();
      return .9;
    }
    case 'season': B.field.rebuild(); setWeather(); B.banner = { text: G.SEASON_NAME[e.s].toUpperCase(), sub: G.TIDE_LINE[e.s], t: 0, color: G.elemColor(e.s) }; G.sfx('tide'); return .6;
    case 'turn': {
      for (const id of Object.keys(B.delegated)) if (B.delegated[id] === 'turn') delete B.delegated[id];
      const tr = sim.troop(e.troop), k = sim.unit(tr.knight); lookAt(k.id);
      B.turnBanner = { troop: tr.id, t: 0 }; B.cursor = [k.cx, k.cy]; B.sel = null; B.mode = 'idle';
      return .45;
    }
    case 'move': {
      const v = VW(e.u); if (!v) return 0;
      v.path = e.path.map(hexW); v.pathT = 0; lookAt(e.u);
      return Math.max(.15, (e.path.length - 1) * .16);
    }
    case 'undo': { const v = VW(e.u); if (v) { const [x, y] = hexW(e.to); v.x = x; v.y = y; v.path = null; } return 0; }
    case 'act': {
      const v = VW(e.u), u = sim.unit(e.u); if (!v) return 0;
      const sk = e.a === 'attack' ? null : e.a.startsWith('item:') ? null : G.get('skill', e.a);
      const move = animFor(u, v, e, sk);
      v.act = { move, k: 0, dur: .7 }; v.actElem = e.elem;
      const tgt = hexW(e.at); if (!(e.at[0] === u.cx && e.at[1] === u.cy)) v.facing = Math.atan2(tgt[1] - v.y, tgt[0] - v.x);
      B.focusGoal = [(v.x + tgt[0]) / 2, (v.y + tgt[1]) / 2];
      if (e.kind === 'spell' || (sk && sk.kind === 'spell')) { G.sfx('cast_charge'); castCircle(v, e.elem); }
      else if (u.kind === 'monster') G.sfx(G.CREATURE[G.get('monster', u.sp).voice] || 'growl');
      else G.sfx(u.basic && u.basic.ranged && e.a === 'attack' ? 'bow_twang' : 'slash_whoosh');
      B.actName = { text: e.name, t: 0, u: e.u };
      // the strike: projectiles and bursts at the swing's peak
      const mouth = v.vis.muzzle(), from = [v.x + mouth[0], v.y + mouth[1], v.z + mouth[2]];
      B.pending = { e, v, from, tgt, sk };
      return .32;
    }
    case 'hit': case 'miss': case 'heal': case 'status': case 'buff': case 'cleanse': case 'mp': case 'siphon': case 'push': case 'wake':
      strike(); return showResult(e);
    case 'dot': { const v = VW(e.t); if (v) { v.hurt = .3; v.flash = .2; G.game.particles.text(v.x, v.y, v.vis.headZ(), '-' + e.dmg, e.why === 'poison' ? '#9ae06a' : '#ff9a40', { bounce: true }); G.sfx(e.why === 'poison' ? 'poison' : 'burn'); } return .35; }
    case 'asleep': { const v = VW(e.t); if (v) G.game.particles.text(v.x, v.y, v.vis.headZ(), 'Zzz', '#c8b0ff'); return .25; }
    case 'stopped': { const v = VW(e.t); if (v) { G.game.particles.text(v.x, v.y, v.vis.headZ(), 'STOPPED', '#c8c8d0'); FX.clockFaceAt(v); G.sfx('stop'); } return .35; }
    case 'ko': {
      strike();
      const v = VW(e.t); if (!v) return 0;
      if (e.knight) { v.kneel = true; v.dying = .01; G.sfx('ko_knight'); G.game.shake(3); B.banner = { text: (sim.unit(e.t).name || '').toUpperCase() + ' FALLS', sub: '', t: 0, color: '#ff8a7a' }; }
      else { v.dying = .01; G.sfx('ko_monster'); G.game.particles.bits(v.x, v.y, 10, 14, G.ELC[sim.unit(e.t).elem] || G.ELC.none); }
      return .5;
    }
    case 'rebirth': { const v = VW(e.t); if (v) { v.dying = 0; G.FX.burst(fxl, [v.x, v.y, 0], 'summer', 20, true); G.game.particles.text(v.x, v.y, v.vis.headZ(), 'REBIRTH', '#ffd040'); } return .6; }
    case 'capture': { const v = VW(e.t), c = VW(e.by); if (v && c) { G.FX.chain(fxl, [c.x, c.y, 0], [v.x, v.y, 0]); v.captured = .01; G.sfx('capture'); G.sting('capture'); G.game.particles.text(v.x, v.y, v.vis.headZ(), 'CAPTURED', '#ffd060'); } return .7; }
    case 'retreat': case 'retreatcall': { if (e.e === 'retreatcall') { const v = VW(e.u); if (v) G.game.particles.text(v.x, v.y, v.vis.headZ(), 'RETREAT', '#e8e4ff'); return .3; } const v = VW(e.t); if (v) v.leaving = .01; return .12; }
    case 'troopgone': return .2;
    case 'rout': B.banner = { text: (s.sides[e.side].name || '').toUpperCase() + ' ROUTED', sub: 'Their ruler has left the field', t: 0, color: '#ff8a7a' }; return 1;
    case 'level': { const v = VW(e.t); if (v) { G.FX.levelUp(fxl, [v.x, v.y, v.z], e.gains); G.sting('levelup'); G.game.particles.text(v.x, v.y, v.vis.headZ() + 6, 'LEVEL ' + e.level, '#ffe040', { scale: 1 }); } return .6; }
    case 'burnhex': B.field.rebuild(); G.sfx('burn'); return .1;
    case 'ash': B.field.rebuild(); return 0;
    case 'misfire': { const v = VW(e.u); if (v) G.game.particles.text(v.x, v.y, v.vis.headZ(), 'MISFIRE!', '#a8e0ff'); return .4; }
    case 'untimed': { const v = VW(e.t); if (v) { G.game.flash('#fff8d0', .25, .5); G.game.particles.text(v.x, v.y, v.vis.headZ() + 6, 'TIMELESS BROKEN', '#fff8d0'); } return .6; }
    case 'hand': { B.handFlash = { line: e.line, t: 0 }; G.sfx('stop'); return .6; }
    case 'dial': { B.field.rebuild(); if (e.lit) { G.sfx('dial'); const [x, y] = hexW(e.c); G.FX.burst(fxl, [x, y, 0], 'none', 16); } return .5; }
    case 'wheel': { G.game.flash('#fff8d0', .5, .8); G.sfx('wheel'); B.banner = { text: 'THE WHEEL TURNS!', sub: 'Timeless is broken. The Gray Knight\'s guard falls.', t: 0, color: '#fff0a0' }; G.music('boss'); return 1.6; }
    case 'summon': { const u = sim.unit(e.t); addView(u); const v = VW(e.t); v.summonK = 0; G.FX.summon(fxl, [v.x, v.y], 'hour', 1); G.sfx('summon_rise'); B.banner = { text: 'SECOND HANDS', sub: 'The Gray Knight calls his servants', t: 0, color: '#d8c070' }; return .8; }
    case 'glory': { const k = s.troops.find(t => t.side === e.side); if (k) { const v = VW(k.knight); if (v) G.game.particles.text(v.x, v.y, v.vis.headZ() + 8, '+' + Math.round(e.pts) + ' GLORY', '#ffd36a'); } return 0; }
    case 'sideout': B.banner = { text: (s.sides[e.side].name || '').toUpperCase() + ' IS OUT', sub: '', t: 0, color: '#ff8a7a' }; return .8;
    case 'guard': { const v = VW(e.u); if (v) { G.FX.buff(fxl, [v.x, v.y, v.z], 'warded'); G.sfx('buff'); } return .2; }
    case 'wait': case 'turnend': case 'skip': case 'fxend': case 'bellend': return 0;
    case 'over': B.overShown = 0; return .1;
    case 'illegal': return 0;
  }
  return 0;
}
/** the move a unit plays for an action (each class line its own) */
function animFor(u, v, e, sk) {
  const ms = v.vis.moves || G.MOVESET.warrior;
  if (v.vis.kind !== 'humanoid') return (sk && sk.anim) || (u.basic && u.basic.anim) || 'bite';
  if (e.a === 'attack') return u.ref === 'graynight' ? ['plunge', 'twohand', 'spin'][B.sim.s.bell % 3] : ms.basic;
  if (e.a.startsWith('item:')) return 'cast';
  if (sk.kind === 'spell') return 'cast';
  if (sk.anim && (E.MOVES[sk.anim] || ['cast', 'cheer', 'block', 'wave', 'hips'].includes(sk.anim))) return sk.anim;
  return ms.special || 'slash';
}
function castCircle(v, elem) { const col = (G.ELC[elem] || G.ELC.none)[0]; B.fx.add({ dur: .5, draw(r, k) { r.decal(g => { const pts = r.groundPts(v.x, v.y, 10 + k * 4, 20, 0); for (let i = 0; i < pts.length; i += 1) { const p = pts[i], q = pts[(i + 1) % pts.length]; BP.line(g, p[0], p[1], q[0], q[1], col, 1); } }, { emissive: 1 }); } }); }
/** the strike lands: spawn the action's visual once */
function strike() {
  const p = B.pending; if (!p) return; B.pending = null;
  const { e, v, from, tgt, sk } = p, fxl = B.fx, elem = e.elem && e.elem !== 'none' ? e.elem : 'none', kind = e.fx;
  const to = [tgt[0], tgt[1], 10];
  if (kind === 'arrow' || kind === 'pierce' || kind === 'volley') { G.FX.projectile(fxl, from, to, 'arrow', elem, .3); G.game.after(.28 / SPEED(), () => G.sfx('arrow_hit')); }
  else if (kind === 'bolt' || kind === 'hex' || kind === 'drain') { G.FX.projectile(fxl, from, to, 'bolt', elem, .28); G.game.after(.26 / SPEED(), () => { G.FX.burst(fxl, to, elem, 12); G.spellSfx(elem); }); }
  else if (kind === 'storm' || kind === 'tempest' || kind === 'holy' || kind === 'volley') { G.spellSfx(elem); for (const c of (e.area || [e.at])) { const w = hexW(c); G.FX.burst(fxl, [w[0], w[1], 0], elem, 12, kind === 'tempest'); } if (kind === 'tempest' && elem === 'summer') G.game.flash('#fff0c0', .15, .4); if (kind === 'tempest' && elem === 'winter') G.game.weather = { kind: 'snow', amount: .9, wind: .6 }; }
  else if (kind === 'breath' || kind === 'water' || kind === 'fire') { G.FX.breath(fxl, from, (e.area || [e.at]).map(c => hexW(c)), kind === 'water' ? 'spring' : elem); G.spellSfx(elem); }
  else if (kind === 'heal') { for (const c of (e.area || [e.at])) { const w = hexW(c); G.FX.heal(fxl, [w[0], w[1], 0]); } G.sfx('heal'); }
  else if (kind === 'buff' || kind === 'roar') { G.sfx(kind === 'roar' ? 'roar_small' : 'buff'); }
  else if (kind === 'ice') { G.FX.projectile(fxl, from, to, 'ice', 'winter', .3); G.game.after(.28 / SPEED(), () => G.FX.burst(fxl, to, 'winter', 14)); }
  else if (kind === 'quake') { G.game.shake(4); for (const c of (e.area || [])) { const w = hexW(c); G.game.particles.dust(w[0], w[1], 0, 5); } }
  else if (kind === 'vine' || kind === 'wind') G.FX.burst(fxl, to, elem === 'none' ? 'spring' : elem, 10);
  else if (kind === 'hourslash') { G.FX.burst(fxl, to, 'hour', 16); }
}
FX.clockFaceAt = v => B.fx.add({ dur: .6, draw(r, k) { G.FX.clockFace(r, v.x, v.y, 12, k * 8, 1 - k); } });
function showResult(e) {
  const sim = B.sim, P = G.game.particles, v = VW(e.t || e.u);
  switch (e.e) {
    case 'hit': {
      if (!v) return 0;
      v.hurt = .35; v.flash = .18;
      const head = v.vis.headZ();
      if (e.thorns) { P.text(v.x, v.y, head, '-' + e.dmg, '#c8ffa0', { bounce: true }); return .2; }
      G.game.hitFx(v.x, v.y, head * .6, { power: e.crit ? 1.6 : .8, damage: e.dmg, sound: e.crit ? 'crit' : 'sword_clang', textZ: head, rumble: true });
      if (e.crit) P.text(v.x, v.y, head + 10, 'CRIT!', '#ffe040', { scale: 1 });
      if (e.elem === 'strong') P.text(v.x, v.y, head + 16, '↑ STRONG', '#ff9a40'); else if (e.elem === 'weak') P.text(v.x, v.y, head + 16, '↓ WEAK', '#8ab0ff');
      return .32;
    }
    case 'miss': if (v) { P.text(v.x, v.y, v.vis.headZ(), 'MISS', '#a8a8b8'); G.sfx('miss'); v.dodge = .3; } return .3;
    case 'heal': if (v && e.amt > 0) { P.text(v.x, v.y, v.vis.headZ(), '+' + e.amt, '#7ae07a', { bounce: true }); if (e.why) G.sfx('heal'); } return e.why ? .2 : .25;
    case 'status': if (v) { if (e.ok) { P.text(v.x, v.y, v.vis.headZ() + 4, G.get('effect', e.s).name.toUpperCase(), G.get('effect', e.s).color); G.sfx(['poison', 'burn', 'chill', 'sleep', 'stop'].includes(e.s) ? e.s : 'debuff'); if (e.s === 'stop') FX.clockFaceAt(v); } else P.text(v.x, v.y, v.vis.headZ() + 4, 'RESIST', '#c8c8d0'); } return .3;
    case 'buff': if (v) { for (const b of e.fx.split(',')) G.FX.buff(B.fx, [v.x, v.y, v.z], b); G.sfx('buff'); } return .25;
    case 'cleanse': if (v) { G.FX.heal(B.fx, [v.x, v.y, v.z]); P.text(v.x, v.y, v.vis.headZ(), 'CLEANSED', '#c8ffc8'); } return .25;
    case 'mp': if (v) P.text(v.x, v.y, v.vis.headZ(), '+' + e.amt + ' MP', '#8ac8ff'); return .2;
    case 'siphon': if (v) P.text(v.x, v.y, v.vis.headZ(), '-' + e.amt + ' MP', '#8ac8ff'); return .25;
    case 'push': { const pv = VW(e.t); if (pv) { pv.path = [hexW(e.from), hexW(e.to)]; pv.pathT = 0; } return .2; }
    case 'wake': if (v) P.text(v.x, v.y, v.vis.headZ() + 4, 'AWAKE', '#ffffff'); return .1;
  }
  return 0;
}

/* ---- weather, light, music ---- */
function setWeather() {
  const s = B.sim.s, rm = G.game.settings && G.game.settings.reduceMotion;
  const w = s.season === 'spring' ? { kind: 'rain', amount: .35 * (rm ? .5 : 1), wind: .15 } : G.weatherFor(s.season, rm);
  G.game.weather = B.noWeather ? null : w;
  G.game.lights.enabled = true; G.game.lights.ambient = G.ambientFor(s.season, B.region);
}

/* ---- the scene ---- */
SC.battle = {
  pausable: true, view: 'board', views: ['board', 'iso'], input: G.PRESET, camera: { zoom: [.7, 2], start: 1 },
  enter(data) {
    const d = data || G.devBattleSpec('river_ford', 'spring');
    B.ctx = Object.assign({ kind: 'skirmish', sides: d.spec.sides.map(sd => sd.human ? 'human' : 'ai') }, d.ctx || {});
    B.sim = d.sim || G.BattleSim.create(d.spec);
    if (d.fx) for (const [ref, fx] of Object.entries(d.fx)) { const u = B.sim.units.find(x => x.ref === ref); if (u) Object.assign(u.fx, fx); }
    B.region = B.ctx.region || 'neutral';
    B.field = new G.Field(B.sim, { region: B.region, owner: B.ctx.owner });
    B.fx = new G.FXList(); B.q = []; B.wait = 0; B.pending = null; B.mode = 'idle'; B.sel = null; B.menu = null; B.sub = null;
    B.cursor = null; B.focus = null; B.focusGoal = null; B.banner = null; B.turnBanner = null; B.danger = false; B.overShown = null; B.aiTimer = 0; B.fast = false; B.auto = {};
    B.t = 0; B.delegated = {}; B.ended = false; B.tips = {}; B.hover = null; B.lastCursor = null; B.noWeather = false;
    makeViews();
    const k0 = B.sim.units.find(u => u.kind === 'knight'); if (k0) { const [x, y] = hexW([k0.cx, k0.cy]); B.focus = [x, y]; B.focusGoal = [x, y]; B.cursor = [k0.cx, k0.cy]; }
    G.game.cam.bounds = v => B.field.bounds(v);
    G.game.setView(G.game.settings && G.game.settings.battleView === 'Isometric' ? 'iso' : 'board');
    setWeather();
    const mus = B.ctx.music || (B.sim.s.mode === 'sanctum' ? 'boss' : B.region === 'hour' ? 'hourless' : B.ctx.playerSide === 1 ? 'battle_defend' : 'battle_attack');
    G.music(mus, { restart: true });
    queue(B.sim.startEvents || []);
    // the opening lines (rivals, oaths) before the first bell
    if (B.ctx.intro && B.ctx.intro.length) G.Talk.run(B.ctx.intro);
    if (B.ctx.kind === 'tutorial') BUI.tip('t1', 'Choose a unit', 'Your troop acts this bell. Move the cursor to one of your units and press ' + G.labelOf('confirm') + '.');
  },
  exit() { G.game.weather = null; G.layer('tension', 0, .1); },
  back() { return goBack(); },
  update(dt) {
    G.inputTick(dt); B.t += dt; BUI.tickToasts(dt);
    if (G.Talk.update(dt)) return;
    if (BUI.modalUpdate()) return;
    updateViews(dt); B.fx.update(dt);
    if (B.banner) { B.banner.t += dt; if (B.banner.t > 1.6) B.banner = null; }
    if (B.turnBanner) { B.turnBanner.t += dt; if (B.turnBanner.t > 1.2) B.turnBanner = null; }
    if (B.actName) { B.actName.t += dt; if (B.actName.t > 1.2) B.actName = null; }
    if (B.handFlash) { B.handFlash.t += dt; if (B.handFlash.t > .8) B.handFlash = null; }
    B.fast = G.inp().down('confirm') && activeController() !== 'human';
    camera(dt);
    if (B.ctx.kind === 'attract') { if (G.Attract.watch()) return; attractTick(dt); }
    if (B.ctx.net && G.hub.waiting()) return;
    if (B.ctx.net) B.ctx.net.tick(dt);
    if (playNext(dt)) return;
    if (B.pending) strike();
    const s = B.sim.s;
    if (s.over) { return endBattle(dt); }
    const ctl = activeController();
    if (ctl === 'human') humanUpdate(dt);
    else if (ctl === 'ai') aiUpdate(dt);
    if (ctl !== 'human') commonKeys();
  },
  draw(r) { drawBattle(r); }
};
/** who controls the active troop: 'human', 'ai' or 'remote' */
function activeController() {
  const tr = B.sim.activeTroop(); if (!tr) return 'none';
  if (B.delegated.all || B.delegated[tr.id] || tr.auto) return 'ai';
  return B.ctx.sides[tr.side] || 'ai';
}
/** the input of the seat that commands the active troop */
function seatInput() {
  const tr = B.sim.activeTroop(); const seat = tr && B.ctx.seats ? B.ctx.seats[tr.side] : null;
  G.In.seatInput = seat !== null && seat !== undefined && G.game.players && G.game.players[seat] && G.game.players.length > 1 ? G.game.players[seat] : null;
}
/** apply a command from the local player (on a hub client it goes to the host) */
function command(cmd) {
  if (B.ctx.net && !B.ctx.net.isHost) { B.ctx.net.send(cmd); return []; }
  const ev = B.sim.apply(cmd);
  if (ev.length && ev[0].e === 'illegal') { G.sfx('ui_error'); BUI.toast(ev[0].why, BUI.COL.bad); return ev; }
  if (B.ctx.net) B.ctx.net.applied(cmd, ev);
  queue(ev); return ev;
}
G.Battle.apply = cmd => { const ev = B.sim.apply(cmd); queue(ev); return ev; };
G.Battle.queue = queue;

function aiUpdate(dt) {
  B.aiTimer -= dt * SPEED() * (B.fast ? 4 : 1);
  if (B.aiTimer > 0) return;
  if (B.ctx.net && !B.ctx.net.isHost) return;
  const tr = B.sim.activeTroop(), lv = B.sim.s.sides[tr.side].ai || 'normal';
  const c = G.BattleAI.next(B.sim, { level: lv, showcase: B.ctx.showcase }); if (!c) return;
  const ev = B.sim.apply(c); if (ev[0] && ev[0].e === 'illegal') queue(B.sim.apply({ t: 'end' })); else { queue(ev); if (B.ctx.net) B.ctx.net.applied(c, ev); }
  B.aiTimer = c.t === 'move' ? .05 : .25;
}

/* ---- the player's turn ---- */
function myUnits() { const tr = B.sim.activeTroop(); return tr ? tr.units.map(id => B.sim.unit(id)).filter(u => B.sim.onField(u) && !u.done) : []; }
function commonKeys() {
  if (G.pressed('danger')) { B.danger = !B.danger; G.sfx('ui_move'); }
  if (G.pressed('turnR') || G.pressed('turnL')) turnCam(G.pressed('turnL') ? -60 : 60);
  if (G.pressed('view')) { G.game.setView(G.game.view.id === 'iso' ? 'board' : 'iso'); }
  const z = G.inp().pressed('zoomIn') ? 1.15 : G.inp().pressed('zoomOut') ? 1 / 1.15 : 1; if (z !== 1 && G.game.zoomBy) G.game.zoomBy(z);
}
function turnCam(deg) { G.game.rotateView(deg); G.sfx('ui_move'); }
function cursorStep() {
  const inp = G.inp(), view = G.game.view;
  let moved = false;
  for (const [a, mx, my] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
    if (!G.repeat(a)) continue;
    const m = inp.move(), dx = Math.abs(m[0]) > .3 ? Math.sign(m[0]) : mx, dy = Math.abs(m[1]) > .3 ? Math.sign(m[1]) : my;
    const n = BH.screenStep(B.cursor, dx || mx, dy || my, view);
    if (n && B.field.inside(n)) { B.cursor = n; moved = true; }
    break;
  }
  // the mouse: the hex under the pointer
  const p = inp.pointer ? inp.pointer() : null;
  if (p && inp.lastDevice === 'mouse' && (!B.lastPtr || p[0] !== B.lastPtr[0] || p[1] !== B.lastPtr[1])) {
    const gp = G.game.mouseGround(); if (gp) { const c = B.field.cellAt(gp[0], gp[1]); if (B.field.inside(c) && !BH.eq(c, B.cursor)) { B.cursor = c; moved = true; } }
  }
  B.lastPtr = p ? p.slice() : null;
  if (moved) { G.sfx('ui_move'); const [x, y] = hexW(B.cursor); B.focusGoal = [x, y]; }
  return moved;
}
function clickedHex() { const c = G.inp().clicked && G.inp().clicked(); if (!c) return null; const gp = G.game.mouseGround(); if (!gp) return null; const h = B.field.cellAt(gp[0], gp[1]); return B.field.inside(h) ? h : null; }
function humanUpdate(dt) {
  seatInput();
  B.timeLeft = G.LocalMP.tick(dt, B);
  const sim = B.sim, inp = G.inp();
  commonKeys();
  if (B.mode === 'idle') { B.mode = 'select'; const u = myUnits()[0]; if (u) B.cursor = [u.cx, u.cy]; }
  // hold □ (Space) to end the troop's turn; a tap opens the commands
  if (B.mode === 'select' || B.mode === 'move') {
    if (G.holdDone('command')) { askEndTurn(); return; }
    if (G.tapped('command') && !B.menu) { openCommands(); return; }
    if (G.pressed('next') || G.pressed('prev')) { const us = myUnits(); if (us.length) { const i = us.findIndex(u => B.sel === u.id), n = us[(i + (G.pressed('prev') ? us.length - 1 : 1) + us.length) % us.length]; select(n.id); } return; }
  }
  if (B.menu) return menuUpdate();
  switch (B.mode) {
    case 'select': {
      cursorStep();
      if (inp.pressed('info')) { const o = sim.at(B.cursor); if (o) B.infoUnit = o.id; }
      if (inp.pressed('confirm')) {
        const o = sim.at(B.cursor), tr = sim.activeTroop();
        if (o && o.troop === tr.id && !o.done) { select(o.id); G.sfx('ui_confirm'); }
        else if (o) { B.infoUnit = o.id; }
        else G.sfx('ui_error');
      }
      if (inp.pressed('cancel')) { if (B.infoUnit) B.infoUnit = null; else G.game.pause(); }
      break;
    }
    case 'move': {
      cursorStep();
      const u = sim.unit(B.sel), reach = B.reach || {};
      if (inp.pressed('confirm')) {
        const k = BH.key(B.cursor);
        if (BH.eq(B.cursor, [u.cx, u.cy])) { openMenu(); G.sfx('ui_confirm'); }
        else if (reach[k]) { command({ t: 'move', u: u.id, to: B.cursor }); G.sfx('ui_confirm'); B.afterMove = true; B.mode = 'moving'; }
        else { const o = sim.at(B.cursor); if (o && o.troop === u.troop && !o.done) select(o.id); else G.sfx('ui_error'); }
      }
      if (inp.pressed('cancel')) { B.mode = 'select'; B.sel = null; G.sfx('ui_cancel'); }
      if (inp.pressed('info')) { const o = sim.at(B.cursor); if (o) B.infoUnit = o.id; }
      break;
    }
    case 'moving': if (!B.q.length && B.wait <= 0) openMenu(); break;
    case 'target': {
      cursorStep();
      const u = sim.unit(B.sel), valid = B.targets || [];
      if (inp.pressed('confirm')) {
        if (valid.some(h => BH.eq(h, B.cursor))) { const a = B.action; B.mode = 'idle'; B.targets = null; command({ t: 'act', u: u.id, a, at: B.cursor }); B.sel = null; G.sfx('ui_confirm'); tutorialAfterAct(a); }
        else G.sfx('ui_error');
      }
      if (inp.pressed('cancel')) { B.mode = 'menu'; openMenu(); G.sfx('ui_cancel'); }
      break;
    }
  }
}
function select(id) {
  const u = B.sim.unit(id); B.sel = id; B.cursor = [u.cx, u.cy]; B.infoUnit = null;
  if (u.moved || u.acted) { openMenu(); return; }
  B.reach = B.sim.reach(u); B.mode = 'move';
  if (B.ctx.kind === 'tutorial') BUI.tip('t2', 'Move', 'The blue hexes show how far it can walk. Pick one, or press ' + G.labelOf('confirm') + ' on the unit itself to act without moving.');
}
/** the command list for the selected unit */
function openMenu() {
  const sim = B.sim, u = sim.unit(B.sel); if (!u) { B.mode = 'select'; return; }
  B.mode = 'menu';
  const acts = sim.actions(u), rows = [];
  if (!u.moved && !u.acted) rows.push({ label: 'Move', act: () => { B.menu = null; select(u.id); } });
  const atk = acts.find(a => a.a === 'attack');
  rows.push({ label: 'Attack', right: u.basic.name, disabled: atk.ok ? false : atk.why, act: () => startTarget('attack') });
  const sp = acts.filter(a => a.a !== 'attack' && !a.a.startsWith('item:') && a.sk.kind === 'special'), sl = acts.filter(a => a.sk.kind === 'spell'), it = acts.filter(a => a.a.startsWith('item:'));
  if (sp.length) rows.push({ label: 'Special ▸', disabled: sp.some(a => a.ok) ? false : sp[0].why, act: () => openSub('Special', sp) });
  if (sl.length) rows.push({ label: 'Spell ▸', disabled: sl.some(a => a.ok) ? false : (u.moved ? 'Spells need planted feet' : sl[0].why), act: () => openSub('Spell', sl) });
  if (u.kind === 'knight') rows.push({ label: 'Item ▸', disabled: it.some(a => a.ok) ? false : it.length ? it[0].why : 'No items', act: () => openSub('Item', it) });
  rows.push({ label: 'Guard', right: 'DEF +30%', act: () => { B.menu = null; command({ t: 'guard', u: u.id }); B.sel = null; B.mode = 'idle'; } });
  rows.push({ label: 'Wait', act: () => { B.menu = null; command({ t: 'wait', u: u.id }); B.sel = null; B.mode = 'idle'; } });
  if (u.kind === 'knight' && sim.s.mode !== 'shrine') rows.push({ label: 'Retreat', color: '#ff9a8a', act: () => { BUI.confirm(u.ruler ? 'A ruler who retreats loses the battle. Retreat?' : 'Retreat ' + u.name + "'s troop from the field?", () => { B.menu = null; command({ t: 'retreat', u: u.id }); B.mode = 'idle'; B.sel = null; }); } });
  B.menu = { title: u.name, list: new BUI.List(), rows };
  if (B.ctx.kind === 'tutorial' && u.skills.some(s => G.get('skill', s).kind === 'spell')) BUI.tip('t5', 'Planted feet', 'Spells can only be cast before moving. Specials marked mobile work after a move.');
}
function openSub(title, acts) {
  const u = B.sim.unit(B.sel);
  B.menu = { title, list: new BUI.List(), rows: acts.map(a => ({ label: a.sk.name + (a.count ? ' x' + a.count : ''), right: a.sk.mp ? a.sk.mp + ' MP' : '', disabled: a.ok ? false : a.why, desc: a.sk.desc, act: () => startTarget(a.a) })), parent: true };
}
function startTarget(a) {
  const u = B.sim.unit(B.sel); B.action = a; B.menu = null;
  B.targets = B.sim.targets(u, a);
  if (!B.targets.length) { G.sfx('ui_error'); openMenu(); return; }
  B.mode = 'target';
  // the nearest target first
  const best = B.targets.slice().sort((x, y) => BH.dist(x, [u.cx, u.cy]) - BH.dist(y, [u.cx, u.cy]))[0];
  B.cursor = best.slice();
  if (B.ctx.kind === 'tutorial') BUI.tip('t3', 'The forecast', 'Before you confirm, the forecast shows the hit chance, the damage, and STRONG (↑) or WEAK (↓) for the elements.');
}
function menuUpdate() {
  const m = B.menu, k = BUI.k();
  const res = m.list.update(m.rows);
  if (res === 'pick') { const row = m.list.sel; if (row && !row.disabled) { G.sfx('ui_confirm'); row.act(); } }
  else if (res === 'back') {
    G.sfx('ui_cancel');
    if (m.cmds) { B.menu = null; return; }
    if (m.parent) { openMenu(); return; }
    const u = B.sim.unit(B.sel); B.menu = null;
    if (u && u.moved && !u.acted) { command({ t: 'undo', u: u.id }); select(u.id); }
    else { B.mode = 'select'; B.sel = null; }
  }
}
function openCommands() {
  const tr = B.sim.activeTroop(), rows = [
    { label: 'End troop turn', act: () => { B.menu = null; askEndTurn(); } },
    { label: 'Delegate troop', right: 'AI plays it', act: () => { B.menu = null; B.delegated[tr.id] = true; BUI.toast('This troop is delegated for the battle'); } },
    { label: (B.danger ? 'Hide' : 'Show') + ' danger', act: () => { B.danger = !B.danger; B.menu = null; } }];
  if (B.ctx.kind !== 'hub' && B.ctx.kind !== 'tutorial') rows.push({ label: 'Delegate battle', right: 'to the end', act: () => { B.menu = null; BUI.confirm('Let your captains fight the rest of this battle?', () => { B.delegated.all = true; }, { def: 'yes' }); } });
  B.menu = { title: 'Commands', list: new BUI.List(), rows, cmds: true };
}
function askEndTurn() {
  const go = () => { B.menu = null; B.sel = null; B.mode = 'idle'; command({ t: 'end' }); };
  if (G.game.settings && G.game.settings.confirmEnd === 'Off' || !myUnits().length) go(); else BUI.confirm('End this troop\'s turn? The rest will wait.', go, { def: 'yes' });
}
function goBack() { if (B.menu) { B.menu = null; return true; } if (B.mode === 'target') { openMenu(); return true; } if (B.mode === 'move') { B.mode = 'select'; return true; } return false; }
function tutorialAfterAct(a) {
  if (B.ctx.kind !== 'tutorial') return;
  BUI.tip('t4', 'Ward', 'Each knight has a Ward ring. A monster outside its own knight\'s Ward is weaker and easier to capture.');
  if (B.sim.s.bell >= 2) BUI.tip('t6', 'The Season Tide', 'Units of the battle\'s season deal more damage: see the badge at the top left.');
}

/* ---- the attract reel's battle: it ends after 45 s; scripted inserts show a Tide, a level-up and a promotion ---- */
function attractTick(dt) {
  B.attractT = (B.attractT || 0) + dt;
  const t = B.attractT, sim = B.sim;
  if (t > 1 && !B.ins1) { B.ins1 = true; if (sim.s.mode === 'sanctum') { queue(sim.apply({ t: 'dials' })); } B.banner = { text: (B.ctx.caption || 'THE SEASONAL TIDE'), sub: G.TIDE_LINE[sim.s.season], t: 0, color: G.elemColor(sim.s.season) }; }
  if (t > 16 && !B.ins2) { B.ins2 = true; const u = sim.field().filter(x => x.kind === 'monster')[0]; if (u) { const ev = []; sim._levelUp(u, ev); queue(ev); } }
  if (t > 26 && !B.ins3) { B.ins3 = true; const u = sim.field().filter(x => x.kind === 'monster')[1] || sim.field()[0]; const v = u && VW(u.id); if (v) { G.FX.promote(B.fx, [v.x, v.y, 0], u.elem); G.sting('promote'); B.banner = { text: 'PROMOTION', sub: 'Monsters change form as they grow', t: 0, color: '#ffe080' }; } }
  if (t > 34 && !B.ins4) { B.ins4 = true; B.banner = { text: 'CAPTURE', sub: 'Rout a knight and take its monsters', t: 0, color: '#ffd060' }; }
  if (t > 45 && !B.ended) { B.ended = true; B.ctx.onEnd && B.ctx.onEnd(); }
}

/* ---- views follow the sim ---- */
function updateViews(dt) {
  const sim = B.sim, sp = SPEED() * (B.fast ? 4 : 1);
  for (const id in B.views) {
    const v = B.views[id], u = sim.unit(id); if (!u) continue;
    let vx = 0, vy = 0;
    if (v.path) {
      v.pathT += dt * sp / .16; const n = v.path.length - 1, i = Math.min(n - 1, Math.floor(v.pathT)), k = Math.min(1, v.pathT - i);
      if (n < 1 || v.pathT >= n) { const e = v.path[v.path.length - 1]; v.x = e[0]; v.y = e[1]; v.path = null; }
      else { const a = v.path[i], b = v.path[i + 1], nx = a[0] + (b[0] - a[0]) * k, ny = a[1] + (b[1] - a[1]) * k; vx = (nx - v.x) / Math.max(dt, 1e-4); vy = (ny - v.y) / Math.max(dt, 1e-4); v.x = nx; v.y = ny; v.facing = Math.atan2(b[1] - a[1], b[0] - a[0]); if (Math.random() < .08) G.sfx('step_soft'); }
    } else if (!v.dying && !v.captured && !v.leaving) { const [x, y] = hexW([u.cx, u.cy]); v.x += (x - v.x) * Math.min(1, dt * 12); v.y += (y - v.y) * Math.min(1, dt * 12); }
    if (v.act) { v.act.k += dt * sp / v.act.dur; if (v.act.k >= .35 && B.pending && B.pending.v === v) strike(); if (v.act.k >= 1) v.act = null; }
    v.hurt = Math.max(0, v.hurt - dt * 2); v.flash = Math.max(0, v.flash - dt); v.dodge = Math.max(0, (v.dodge || 0) - dt);
    if (v.dying) { v.dying += dt * sp; if (u.kind === 'knight') v.alpha = Math.max(0, 1 - Math.max(0, v.dying - .8) * 1.5); else v.alpha = Math.max(0, 1 - Math.max(0, v.dying - .5) * 2); if (v.alpha <= 0) v.gone = true; }
    if (v.captured) { v.captured += dt * sp; v.alpha = Math.max(0, 1 - v.captured * 1.2); if (v.alpha <= 0) v.gone = true; }
    if (v.leaving) { v.leaving += dt * sp; v.alpha = Math.max(0, 1 - v.leaving * 1.4); vx = Math.cos(v.facing) * -20; if (v.alpha <= 0) v.gone = true; }
    if (v.summonK < 1) v.summonK = Math.min(1, v.summonK + dt * 1.2);
    v.vx = vx; v.vy = vy;
    v.vis.update(dt, { x: v.x, y: v.y, z: 0, vx, vy, facing: v.facing, act: v.act, hurt: v.hurt, sleep: !!u.fx.sleep && !v.dying, dead: !!v.dying && u.kind === 'monster', guard: !!u.fx.guarded && !v.act, kneel: v.kneel || (u.kind === 'knight' && !u.alive) });
  }
}
function camera(dt) {
  if (!B.focusGoal) return;
  if (!B.focus) B.focus = B.focusGoal.slice();
  const k = Math.min(1, dt / .15);
  B.focus[0] += (B.focusGoal[0] - B.focus[0]) * k; B.focus[1] += (B.focusGoal[1] - B.focus[1]) * k;
  G.game.focus(B.focus[0], B.focus[1], 12);
}

/* ---- the end ---- */
function endBattle(dt) {
  if (B.ended) return;
  B.overShown = (B.overShown || 0) + dt;
  const s = B.sim.s, w = s.over.winner;
  if (!B.endSting) {
    B.endSting = true; const ps = B.ctx.playerSide;
    const won = ps === undefined ? true : (s.mode === 'shrine' ? s.over.standings[0].includes(ps) : w === ps);
    G.sting(won ? 'victory' : 'defeat'); G.layer('tension', 0);
    B.banner = { text: s.mode === 'shrine' ? (s.sides[w].name || '').toUpperCase() + ' WINS' : ps === undefined ? (s.sides[w].name || '').toUpperCase() + ' WINS' : won ? 'VICTORY' : 'DEFEAT', sub: reasonText(s.over.reason), t: -1.5, color: won ? '#ffe080' : '#ff8a7a' };
    for (const id in B.views) { const u = B.sim.unit(id); if (u && u.side === w && B.sim.onField(u) && B.views[id].vis.kind === 'humanoid') B.views[id].act = { move: 'cheer', k: 0, dur: 99 }; }
  }
  if (B.overShown > 2.2 && !G.Talk.open) {
    B.ended = true;
    const res = B.sim.result();
    if (B.ctx.onEnd) B.ctx.onEnd(res, B.sim); else G.game.go('title');
  }
}
function reasonText(r) { return { rout: 'Every knight has left the field', keep: 'A knight holds the Keep at the last bell', bells: 'The twelfth bell rings: the Keep holds', graynight: 'The Gray Knight has fallen', thirteenth: 'The thirteenth bell tolls', dev: 'Dev mode', last: 'The last banner standing', retreat: 'They withdrew' }[r] || ''; }

/* ---- drawing ---- */
function drawBattle(r) {
  const sim = B.sim, s = sim.s, t = B.t, field = B.field, L = G.game.lights;
  field.draw(r, t);
  // decals: ward rings, ranges, path, area, danger, the hour hand, cursor
  const tr = sim.activeTroop();
  for (const k of sim.field().filter(u => u.kind === 'knight')) {
    const cells = BH.within([k.cx, k.cy], k.ward, s.w, s.h), col = s.sides[k.side].color;
    if (tr && k.troop === tr.id) field.fill(r, cells, col, .12);
    field.border(r, cells, col, 1, true);
  }
  if (B.danger) { const tr2 = sim.activeTroop(); if (tr2) { const th = G.BattleAI.threats(sim, tr2.side), cells = new Set(); for (const x of th) for (const c of x.cells) cells.add(c); field.fill(r, [...cells].map(k => [k % 1000, Math.floor(k / 1000)]), '#ff3a4a', .22); } }
  if (s.mode === 'sanctum' && !s.handStopped && s.keep) G.FX.handLine(r, field, BH.line(s.keep, s.hand, 8, s.w, s.h), B.handFlash ? .7 : .25);
  if (B.mode === 'move' && B.reach) {
    field.fill(r, Object.values(B.reach).map(x => x.c), '#3a9aff', .45);
    const p = B.reach[BH.key(B.cursor)]; if (p) field.path(r, p.path, t);
    const u = sim.unit(B.sel); if (u) { const atk = new Set(); for (const k of Object.values(B.reach)) for (const h of BH.within(k.c, u.basic.range[1], s.w, s.h)) { const o = sim.at(h); if (o && sim.foes(o, u)) atk.add(h[0] + ',' + h[1]); } field.fill(r, [...atk].map(k => k.split(',').map(Number)), '#ff3a4a', .35); }
  }
  if (B.mode === 'target' && B.targets) {
    field.fill(r, B.targets, '#ff3a4a', .4);
    if (B.targets.some(h => BH.eq(h, B.cursor))) field.fill(r, sim.area(sim.unit(B.sel), B.action, B.cursor), '#ffd040', .6);
  }
  if (B.cursor && (activeController() === 'human' || B.ctx.kind === 'hub')) field.cursor(r, B.cursor, t);
  if (B.ctx.net && B.ctx.net.cursors) for (const [seat, c] of Object.entries(B.ctx.net.cursors)) field.cursor(r, c, t, G.SEAT_COLORS[seat]);
  // units
  for (const id in B.views) {
    const v = B.views[id], u = sim.unit(id); if (!u || v.gone) continue;
    if (!sim.onField(u) && !v.dying && !v.captured && !v.leaving) continue;
    const isActive = tr && u.troop === tr.id, xray = isActive || u.kind === 'knight';
    const sc = v.summonK < 1 ? v.summonK : 1;
    r.shadow(v.x, v.y, (v.vis.size === 'L' ? 12 : v.vis.size === 'S' ? 5 : 7) * sc, .45);
    r.actor(v.x, v.y, 0, (g, ox, oy) => { if (sc < 1) { g.save(); g.translate(ox, oy); g.scale(sc, sc); g.translate(-ox, -oy); } v.vis.draw(g, ox, oy, r.view); if (sc < 1) g.restore(); }, { flash: v.flash > 0 ? '#ffffff' : false, flashMix: .7, alpha: v.alpha * (u.fx.stop ? .85 : 1), xray, pick: id });
    // statuses as tints
    if (u.fx.chill || u.fx.stop || u.fx.burn || u.fx.poison) { const col = u.fx.stop ? '#a8a8b8' : u.fx.chill ? '#8ad8ff' : u.fx.burn ? '#ff7a2a' : '#7ad04a'; r.queue(v.x, v.y, 1, g => { const q = r.w(v.x, v.y, 2); BP.blend(g, .3, 'normal', () => BP.ell(g, q[0], q[1] - 6, 7, 9, col)); }, { bias: 2 }); }
    if (u.fx.burn && Math.random() < .1) G.game.particles.fire(v.x, v.y, 6, 1, { size: .5 });
    if (u.fx.poison && Math.random() < .06) G.game.particles.glints(v.x, v.y, 10, 1, '#7ad04a');
    if (u.elem === 'hour' && u.kind === 'monster' || u.boss) L.add(v.x, v.y, 14, 34, .5, { color: u.boss ? '#e8e8f0' : '#d8c070' });
  }
  B.fx.draw(r);
  hud(r);
}
/** the pennant, HP bar and status icons over a unit (overlay) */
function overUnit(g, r, v, u, showBar) {
  const sd = B.sim.s.sides[u.side], q = r.w(v.x, v.y, v.vis.headZ() + 4), x = Math.round(q[0]), y = Math.round(q[1]);
  if (v.alpha < .3) return;
  if (u.kind === 'knight') {
    const realm = G.has('realm', sd.realm) ? G.get('realm', sd.realm) : null, col = sd.color, trim = realm ? realm.trim : '#ffffff';
    BP.rect(g, x, y - 13, 1, 13, '#3a2a1a');
    const shape = realm ? realm.banner : 'square', pts = shape === 'triangle' ? [[x + 1, y - 13], [x + 11, y - 9], [x + 1, y - 5]] : shape === 'swallowtail' ? [[x + 1, y - 13], [x + 11, y - 13], [x + 8, y - 9], [x + 11, y - 5], [x + 1, y - 5]] : shape === 'pointed' ? [[x + 1, y - 13], [x + 10, y - 13], [x + 12, y - 9], [x + 10, y - 5], [x + 1, y - 5]] : [[x + 1, y - 13], [x + 11, y - 13], [x + 11, y - 5], [x + 1, y - 5]];
    BP.poly(g, pts, col); BP.sprite(g, G.sigil(realm ? realm.sigil : 'axes', trim), x + 3, y - 12);
    if (B.ctx.names && B.ctx.names[u.side]) BUI.text(g, B.ctx.names[u.side], x + 14, y - 13, col, { scale: 1 });
  } else BP.rect(g, x - 2, y - 4, 5, 3, sd.color);
  if (showBar) { BUI.bar(g, x - 6, y + 1, 12, 3, u.hp / u.mhp, u.hp / u.mhp > .5 ? '#5ad86a' : u.hp / u.mhp > .25 ? '#ffd040' : '#ff5a4a'); }
  let ix = x - 9; for (const f of Object.keys(u.fx).filter(k => G.get('effect', k).kind !== 'hidden').slice(0, 3)) { BP.sprite(g, G.fxIcon(f), ix, y - 20); ix += 6; }
}
function unitCard(g, x, y, w, u, title) {
  const k = BUI.k(), h = 50 * k, v = VW(u.id), sd = B.sim.s.sides[u.side];
  BUI.box(g, x, y, w, h, { alpha: .9 });
  if (v) v.vis.portrait(g, x + 4, y + 4, 26 * k, { bg: '#1a1e40' });
  const tx = x + 32 * k;
  BUI.text(g, u.name, tx, y + 4, sd.color);
  BUI.text(g, 'Lv ' + u.level, x + w - 4, y + 4, BUI.COL.dim, { align: 'right' });
  BP.sprite(g, G.elemIcon(u.elem), tx, y + 14 * k); BUI.text(g, u.size + (u.flier ? ' fly' : ''), tx + 10, y + 13 * k, BUI.COL.dim);
  BUI.bar(g, tx, y + 24 * k, w - 40 * k - 30, 5 * k, u.hp / u.mhp, '#5ad86a'); BUI.text(g, u.hp + '/' + u.mhp, x + w - 4, y + 22 * k, BUI.COL.text, { align: 'right' });
  BUI.bar(g, tx, y + 32 * k, w - 40 * k - 30, 4 * k, u.mp / Math.max(1, u.mmp), '#5a9aff'); BUI.text(g, u.mp + ' MP', x + w - 4, y + 30 * k, BUI.COL.dim, { align: 'right' });
  let ix = tx; for (const f of Object.keys(u.fx).filter(f => G.get('effect', f).kind !== 'hidden')) { BP.sprite(g, G.fxIcon(f), ix, y + 41 * k); ix += 7; }
  const tide = G.tideOut(u.elem, B.sim.s.season, B.sim.s.longWinter); if (tide > 1.001) BUI.text(g, '↑ Tide', x + w - 4, y + 40 * k, '#ffd060', { align: 'right' }); else if (tide < .999) BUI.text(g, '↓ Tide', x + w - 4, y + 40 * k, '#8ab0ff', { align: 'right' });
  if (u.kind === 'monster') { const kn = B.sim.knightOf(u); if (kn && B.sim.onField(kn) && BH.dist([u.cx, u.cy], [kn.cx, kn.cy]) > kn.ward) BUI.text(g, 'Outside Ward', tx + 30, y + 13 * k, '#ff9a8a'); }
}
function hud(r) {
  const sim = B.sim, s = sim.s, t = B.t, tr = sim.activeTroop();
  r.overlay(g => {
    const k = BUI.k(), W = r.W, H = r.H;
    // over the units
    for (const id in B.views) { const v = B.views[id], u = sim.unit(id); if (!u || v.gone || !sim.onField(u) && !v.dying) continue; overUnit(g, r, v, u, (B.cursor && u.cx === B.cursor[0] && u.cy === B.cursor[1]) || (tr && u.troop === tr.id) || u.hp < u.mhp); }
    if (B.cursor && activeController() === 'human') { const o = sim.at(B.cursor); if (o) { const v = VW(o.id); if (v) { const q = r.w(v.x, v.y, v.vis.headZ() + 22 + Math.sin(t * 6) * 2); BP.poly(g, [[q[0] - 4, q[1] - 4], [q[0] + 4, q[1] - 4], [q[0], q[1] + 1]], '#ffe070'); } } }
    // top left: the bell clock and the season badge
    BUI.box(g, 6, 6, 118 * k, 30 * k, { alpha: .88 });
    G.FX.bellClock(g, 6 + 13 * k, 6 + 15 * k, 10 * k, s.bell, s.bells, t);
    BUI.text(g, 'BELL ' + s.bell + '/' + s.bells, 6 + 28 * k, 9, '#ffffff');
    BP.sprite(g, G.elemIcon(s.season), 6 + 28 * k, 9 + 10 * k); BUI.text(g, G.SEASON_NAME[s.season].toUpperCase() + (s.longWinter ? ' (LONG)' : '') + ' TIDE', 6 + 38 * k, 9 + 10 * k, G.elemColor(s.season));
    if (s.mode === 'shrine') BUI.text(g, 'GLORY ' + s.sides.map(sd => Math.floor(s.glory[sd.i])).join(' / '), 6 + 28 * k, 9 + 19 * k, '#ffd36a');
    else if (s.mode === 'sanctum') BUI.text(g, 'DIALS ' + s.dials.filter(d => d.lit).length + '/4' + (s.wheelTurned ? ' TURNED' : ''), 6 + 28 * k, 9 + 19 * k, '#ffd36a');
    else if (s.keep) BUI.text(g, 'KEEP: ' + (sim.at(s.keep) ? s.sides[sim.at(s.keep).side].name : 'empty'), 6 + 28 * k, 9 + 19 * k, '#d8d0e8');
    // top centre: this bell's troop order
    const order = s.order.filter(id => !s.troops[id].gone), bw = 38 * k, ox = Math.round(W / 2 - order.length * (bw + 2) / 2);
    order.forEach((id, i) => {
      const trp = s.troops[id], kn = sim.unit(trp.knight), sd = s.sides[trp.side], x = ox + i * (bw + 2), on = tr && tr.id === id, done = s.order.indexOf(id) < s.oi;
      BP.rect(g, x, 6, bw, 12 * k, on ? sd.color : done ? '#2a2a3a' : E.tones(sd.color).sh);
      if (on) { BP.rect(g, x, 6 + 12 * k, bw, 1, '#ffffff'); }
      BUI.text(g, (kn.name || '').slice(0, 6), x + bw / 2, 8, on ? '#ffffff' : '#c8c8d8', { align: 'center' });
    });
    // the active and the hovered unit
    const sel = B.sel ? sim.unit(B.sel) : B.cursor && sim.at(B.cursor) && tr && sim.at(B.cursor).troop === tr.id ? sim.at(B.cursor) : null;
    const cw = 150 * k;
    if (sel) unitCard(g, 6, H - 50 * k - 22 * k, cw, sel);
    const hov = B.infoUnit ? sim.unit(B.infoUnit) : B.cursor ? sim.at(B.cursor) : null;
    if (hov && hov !== sel) unitCard(g, W - cw - 6, H - 50 * k - 22 * k, cw, hov);
    // forecast
    if (B.mode === 'target' && B.targets && B.targets.some(h => BH.eq(h, B.cursor))) {
      const fc = sim.forecast(B.sel, B.action, B.cursor).slice(0, 3), fw = 220 * k, fh = fc.length * 10 * k + 8, fx = Math.round(W / 2 - fw / 2), fy = H - 50 * k - 22 * k - fh - 4;
      if (fc.length) BUI.box(g, fx, fy, fw, fh, { alpha: .92 });
      fc.forEach((f, i) => {
        const y = fy + 4 + i * 10 * k; let x = fx + 4;
        BUI.text(g, (f.name || '').toUpperCase().slice(0, 12), x, y, sim.foes(sim.unit(B.sel), sim.unit(f.id)) ? '#ffb0a0' : '#b0ffb0'); x += 62 * k;
        if (f.dmg[1] > 0) { BUI.text(g, 'HIT ' + f.hit + '%', x, y, '#ffffff'); x += 36 * k; BUI.text(g, f.dmg[0] + '-' + f.dmg[1], x, y, '#ffe080'); x += 30 * k; }
        if (f.heal) { BUI.text(g, '+' + f.heal + ' HP', x, y, '#7ae07a'); x += 36 * k; }
        if (f.elem === 'strong') { BUI.text(g, '↑ STRONG', x, y, '#ff9a40'); x += 40 * k; } else if (f.elem === 'weak') { BUI.text(g, '↓ WEAK', x, y, '#8ab0ff'); x += 34 * k; }
        if (f.crit) { BUI.text(g, 'CRIT ' + Math.round(f.crit) + '%', x, y, '#ffd040'); x += 36 * k; }
        if (f.status) { BUI.text(g, G.get('effect', f.status[0]).name + ' ' + f.status[1] + '%', x, y, '#c8b0ff'); x += 40 * k; }
        if (f.ko > 50) BUI.text(g, 'KO', x, y, '#ff5a4a');
      });
    }
    // the command list
    if (B.menu) {
      const m = B.menu, mw = 130 * k, rows = m.rows, mx = W - mw - 8, my = 44;
      m.list.layout(rows, mx + 4, my + 14 * k, mw - 8);
      BUI.box(g, mx, my, mw, m.list.h + 18 * k, { alpha: .94 });
      BUI.text(g, m.title, mx + 6, my + 4, BUI.COL.gold);
      m.list.draw(g, t);
      const sel2 = m.list.sel; if (sel2 && (sel2.desc || sel2.disabled)) { const tx = sel2.disabled || sel2.desc; BUI.box(g, mx - 8, my + m.list.h + 22 * k, mw + 8, 12 * k, { alpha: .9 }); BUI.text(g, tx.slice(0, 32), mx - 4, my + m.list.h + 24 * k, sel2.disabled ? '#ff9a8a' : BUI.COL.dim); }
    }
    // banners
    if (B.banner && B.banner.t >= 0) { const b = B.banner, a = Math.min(1, b.t * 4, (1.6 - b.t) * 4); if (a > .2) { const by = Math.round(H * .3); BP.rect(g, 0, by - 4, W, 30 * k, '#0a0814'); BP.rect(g, 0, by - 4, W, 1, b.color); BP.rect(g, 0, by + 26 * k - 4, W, 1, b.color); BUI.title(g, b.text, W / 2, by, { scale: 2, colors: ['#ffffff', b.color, E.tones(b.color).sh] }); if (b.sub) BUI.text(g, b.sub, W / 2, by + 16 * k, '#e8e4f0', { align: 'center' }); } }
    if (B.turnBanner && !B.banner) { const trp = s.troops[B.turnBanner.troop]; if (trp) { const kn = sim.unit(trp.knight), sd = s.sides[trp.side], tx = (kn.name || '').toUpperCase() + "'S TROOP"; BUI.box(g, W / 2 - 70 * k, 24 * k, 140 * k, 14 * k, { bg: [sd.color, E.tones(sd.color).sh], alpha: .92 }); BUI.text(g, tx, W / 2, 24 * k + 3, '#ffffff', { align: 'center' }); } }
    if (B.actName) { const v = VW(B.actName.u); if (v && B.actName.t < 1) { const q = r.w(v.x, v.y, v.vis.headZ() + 26); const w2 = BUI.width(B.actName.text) + 8; BP.rect(g, q[0] - w2 / 2, q[1] - 2, w2, 10 * k + 2, '#0a0814'); BUI.text(g, B.actName.text, q[0], q[1], '#ffffff', { align: 'center' }); } }
    // the hub's countdown, the hot-seat timer, AUTO
    if (B.ctx.net && G.hub.waiting()) { const H = window.AIHub, left = H && isFinite(H.time()) ? Math.ceil(-H.time() / 1000) : null; BP.rect(g, 0, H ? r.H / 2 - 30 : 0, W, 60, '#0a0814'); BUI.title(g, left ? String(left) : 'GET READY', W / 2, r.H / 2 - 20, { scale: 4 }); }
    if (B.timeLeft !== null && B.timeLeft !== undefined) BUI.text(g, Math.ceil(B.timeLeft) + 's', W / 2, 22 * k, B.timeLeft < 5 ? '#ff6a5a' : '#ffffff', { align: 'center' });
    if (B.ctx.kind === 'hub' && G.hub.deadline !== null && G.hub.deadline !== undefined && window.AIHub && window.AIHub.time() >= 0) { const left = Math.max(0, Math.ceil((G.hub.deadline - window.AIHub.time()) / 1000)); BUI.text(g, left + 's', W / 2, 22 * k, left < 5 ? '#ff6a5a' : '#ffffff', { align: 'center' }); }
    if (tr && (B.delegated[tr.id] || B.delegated.all) && B.ctx.kind !== 'attract') BUI.text(g, 'AUTO', W / 2, 32 * k, '#ffd060', { align: 'center' });
    if (B.ctx.kind === 'attract') { if (Math.sin(B.t * 4) > 0) BUI.text(g, 'PRESS ANY BUTTON', W / 2, H - 14, '#ffffff', { align: 'center' }); E.font.title(g, 'BRIGANTIME', W - 8, 8, { scale: 1, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10', align: 'right' }); }
    // the hold-to-end ring
    const hf = G.holdFrac('command'); if (hf > .05 && activeController() === 'human') { BUI.box(g, W / 2 - 50, H - 46 * k, 100, 12, { alpha: .9 }); BUI.bar(g, W / 2 - 46, H - 44 * k, 92, 6, hf, '#ff8ad8'); }
  });
  // the prompt bar
  const ctl = activeController();
  if (ctl === 'human' && !G.Talk.open) {
    const p = B.menu ? [['up', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']] : B.mode === 'target' ? [['move', 'Aim'], ['confirm', 'Confirm'], ['cancel', 'Back'], ['info', 'Info']] : B.mode === 'move' ? [['move', 'Cursor'], ['confirm', 'Move here'], ['cancel', 'Back'], ['command', 'Commands']] : [['move', 'Cursor'], ['confirm', 'Select'], ['info', 'Info'], ['command', 'Commands / Hold: End'], ['next', 'Unit']];
    BUI.prompts(r, p);
  } else if (ctl === 'ai' && !s.over && B.ctx.kind !== 'attract') BUI.prompts(r, [['confirm', 'Hold: Fast'], ['danger', 'Danger'], ['turnR', 'Turn']]);
  if (G.Dev) G.Dev.battleOverlay(r);
  BUI.modalDraw(r, t); BUI.tipDraw(r, 1 / 60); BUI.drawToasts(r);
  G.Talk.draw(r);
}
G.labelOf = a => { const d = G.device(); if (d === 'gamepad') { const s = G.glyphStyle(); return s === 'xbox' ? { confirm: 'A', cancel: 'B', command: 'X', info: 'Y' }[a] || a : { confirm: 'Cross', cancel: 'Circle', command: 'Square', info: 'Triangle' }[a] || a; } const l = G.keyLabel(a, d); return d === 'mouse' && l.mouse ? { L: 'left click', R: 'right click', M: 'middle click' }[l.mouse] : (l.key || a); };

}

// ===== src/64-scene-event.js =====
{
// STORY STAGES AND TALK: G.Talk runs lines of dialogue anywhere (battle openings, quest vignettes, story scenes) on
// an E.Dialog with live portraits, names in their realm's colour and Animalese voices; the event scene stands the cast
// on one of eight small sets (brawler view, a backdrop, props), steps the speaker forward, frames them, pops emotes,
// and applies the event's effects and choice through the campaign when it ends. ✕ advances; △ shows the backlog;
// holding ○ skips the scene (its effects still apply).

const TK = G.Talk = { open: false, q: [], log: [] };
const EUP = E.px;
const herald = () => TK._herald || (TK._herald = new G.Vis({ kind: 'knight', ref: 'herald', cls: 'squire' }));
G.EXTRA_LOOKS = {
  herald: { name: 'Herald', look: { build: 'heroic', size: 1.15, outfit: 'tunic', hat: { style: 'cap', color: '#b02a2a' }, hair: 'short', weapon: null, colors: { cloth: '#d8c070', pants: '#3a3a46', hair: '#6a4a2a', trim: '#b02a2a' } } },
  keeper: { name: 'The Keeper', look: { build: 'heroic', size: 1.2, hunch: .3, outfit: 'robe', hat: 'crown', hair: 'long', weapon: 'staff', sleeves: 'long', colors: { cloth: '#f0e8d8', pants: '#d8c070', hair: '#ffffff', trim: '#d8c070', orb: '#ffffff' } } },
  sergeant: { name: 'Patrol Sergeant', look: { build: 'bulky', size: 1.15, outfit: 'tunic', hair: 'spiky', hat: { style: 'band', color: '#2a2a2a' }, weapon: 'sword', colors: { cloth: '#7a6a5a', pants: '#4a3a2a', hair: '#3a2a1a', trim: '#2a2a2a' } } }
};
/** who a speaker is in a realm's story: { id, name, color, vis, voice } */
TK.who = (sp, realm) => {
  if (sp === 'narrator') return { id: 'narrator', name: null, color: '#b8b0c8' };
  let id = sp;
  if (sp === 'ruler') id = G.RULER[realm] || 'gareth';
  if (sp === 'knight') { const sq = { verdance: 'lynette', solmark: 'agravain', amberlyn: 'lamorak', hoarfast: 'ragnell' }[realm]; id = sq || 'lynette'; }
  if (G.EXTRA_LOOKS[id]) { const x = G.EXTRA_LOOKS[id]; TK._ex = TK._ex || {}; const vis = TK._ex[id] || (TK._ex[id] = (() => { const v = new G.Vis({ kind: 'knight', ref: 'gareth', cls: 'squire' }); v.rig = new E.Humanoid(x.look); v.tool = null; return v; })()); return { id, name: x.name, color: '#e8e4f0', vis, voice: G.voice.profileOf(id) }; }
  if (!G.has('knight', id)) return { id, name: id, color: '#ffffff' };
  const d = G.get('knight', id), realmCol = d.realm && G.has('realm', d.realm) ? G.get('realm', d.realm).color : '#e8e4f0';
  return { id, name: d.short, color: E.tones(realmCol).lt, vis: G.knightVis(id), voice: G.voice.profileOf(id) };
};
/** resolve a line's text for a realm (lines may vary by ruler, or by whether Lunete is with you) */
TK.text = (sp, text, realm, ctx) => {
  if (typeof text === 'string') return { sp, text };
  if (sp === 'ruler') return { sp, text: text[G.RULER[realm]] || Object.values(text)[0] };
  if (text.lunete) { const has = ctx && ctx.holds && ctx.holds('lunete'); return has ? { sp: 'lunete', text: text.lunete } : { sp: 'knight', text: text.other }; }
  return { sp, text: Object.values(text)[0] };
};
/** run lines: [[speaker, text, opts]]; o: { realm, choices, onChoice(i), onDone, vars, ctx, auto } */
TK.run = (lines, o = {}) => {
  TK.q = lines.map(l => Object.assign(TK.text(l[0], l[1], o.realm, o.ctx), { opts: l[2] || {} }));
  TK.o = o; TK.open = true; TK.stepped = 0;
  if (!TK.dlg) TK.dlg = new E.Dialog(G.game, { lines: 3, speed: 50, bg: '#141a3a', border: '#e8e4ff' });
  TK.next();
};
TK.next = () => {
  const d = TK.dlg, o = TK.o;
  if (!TK.q.length) { TK.open = false; TK.cur = null; const f = o.onDone; TK.o = {}; if (f) f(); return; }
  const l = TK.q.shift(), w = TK.who(l.sp, o.realm), last = !TK.q.length;
  TK.cur = { who: w, line: l };
  const speed = { Normal: 50, Slow: 30, Fast: 90, Instant: 2000 }[(G.game.settings && G.game.settings.textSpeed) || 'Normal'];
  d.speed = speed;
  d.voice = w.voice ? (ch, i) => G.voice.letter(w.voice, ch, i) : null;
  d.nameColor = w.color;
  TK.log.push((w.name ? w.name + ': ' : '') + l.text.replace(/\{[^}]*\}/g, '')); if (TK.log.length > 60) TK.log.shift();
  if (TK.onLine) TK.onLine(w, l);
  const choices = last && o.choices ? o.choices.map(c => c.text || c) : null;
  d.say(l.text, { name: w.name, portrait: w.vis ? (g, x, y, size) => w.vis.portrait(g, x, y, size, { bg: '#1a1e40', frame: false }) : null, portraitSize: 40, vars: o.vars, choices, auto: o.auto || 0,
    onChoice: i => { TK.choice = i; if (o.onChoice) o.onChoice(i); },
    onDone: () => TK.next() });
};
/** each step: returns true while the talk holds the scene */
TK.update = dt => {
  if (!TK.open) return false;
  const inp = G.inp();
  if (inp.pressed('info')) TK.backlog = !TK.backlog;
  if (TK.backlog) { if (inp.pressed('cancel') || inp.pressed('confirm')) TK.backlog = false; return true; }
  if (TK.o.skippable !== false && G.holdDone('cancel', .8)) { TK.skip(); return true; }
  TK.dlg.update(dt);
  return TK.open;
};
/** skip to the end: the remaining lines are logged; a pending choice takes its first answer */
TK.skip = () => {
  const o = TK.o; TK.q = []; if (TK.dlg) TK.dlg.close();
  if (o.choices && TK.choice === undefined) { TK.choice = 0; if (o.onChoice) o.onChoice(0); }
  TK.open = false; TK.cur = null; TK.o = {}; if (o.onDone) o.onDone();
};
TK.draw = r => {
  if (!TK.open) return;
  TK.dlg.draw(r);
  r.overlay(g => {
    if (TK.backlog) { const k = G.UI.k(), w = Math.min(r.W - 20, 360), h = r.H - 40, x = Math.round((r.W - w) / 2); G.UI.box(g, x, 10, w, h, { alpha: .96 }); G.UI.text(g, 'BACKLOG', x + 8, 14, G.UI.COL.gold); let y = 28; for (const l of TK.log.slice(-Math.floor((h - 24) / (10 * k * 1.6)))) { for (const ln of E.font.wrap(l, w - 16, { scale: k })) { G.UI.text(g, ln, x + 8, y, '#e8e4f0'); y += 10 * k; } y += 2; } }
    const hf = G.holdFrac('cancel', .8); if (hf > .1) { G.UI.box(g, r.W - 74, 6, 68, 12, { alpha: .9 }); G.UI.bar(g, r.W - 70, 9, 60, 6, hf, '#ff6a6a'); }
  });
  G.UI.prompts(r, [['confirm', 'Next'], ['info', 'Backlog'], ['cancel', 'Hold: Skip']], { y: 8 * G.UI.k() });
};

/* ---- the stage sets ---- */
const STAGES = {
  orchard: { sky: ['#7ac0f0', '#a8d8f0', '#f0f8ff'], floor: (x, y) => E.tex.grass(x, y, { base: '#5aae46', dark: '#3e8a3a', light: '#8ad06a', flower: '#f4b8d0' }), layers: [{ kind: 'hills', color: '#6aa85a', y: .55 }, { kind: 'forest', color: '#4a8a4a', y: .62 }], props: [['tree', 30, 18, { l: '#f4b8d0 foliage' }], ['tree', 250, 14, { l: '#f4b8d0 foliage' }], ['sundial', 210, 30], ['shrine', 60, 34]], light: '#fff8e0', weather: { kind: 'petals', amount: .4, wind: .2 }, music: 'spring' },
  sunhall: { sky: ['#c8784a', '#f0b860', '#ffe8c0'], floor: (x, y) => E.tex.checker(x, y, { a: '#d8b878', b: '#c8a060', size: 16 }), layers: [{ kind: 'castle', color: '#b8885a', y: .55 }], props: [['p:brazier', 40, 28], ['p:brazier', 240, 28], ['p:pillar', 20, 10], ['p:pillar', 260, 10], ['p:banner', 140, 4]], light: '#ffd8a0', music: 'summer' },
  harvesthall: { sky: ['#3a2418', '#5a3a24', '#7a5030'], floor: (x, y) => E.tex.planks(x, y, { base: '#9d6a3f', dark: '#7a4a28', line: '#4a2e1c' }), layers: [{ kind: 'castle', color: '#5a3a24', y: .5 }], props: [['haybale', 30, 20], ['pumpkin', 54, 30], ['pumpkin', 230, 32], ['sundial', 250, 18], ['p:lantern', 100, 8], ['p:lantern', 180, 8]], light: '#ffb060', music: 'autumn' },
  icehall: { sky: ['#5a7aa8', '#8aa8d0', '#d8e8f8'], floor: (x, y) => E.tex.checker(x, y, { a: '#c8e0f0', b: '#a8c8e0', size: 16 }), layers: [{ kind: 'mountains', color: '#b8c8e0', y: .45 }, { kind: 'castle', color: '#8a98b0', y: .55 }], props: [['p:crystal', 30, 14], ['p:crystal', 250, 14], ['p:pillar', 80, 6], ['p:pillar', 200, 6]], light: '#c8dcff', weather: { kind: 'snow', amount: .3, wind: .1 }, music: 'winter' },
  clock: { sky: ['#0a0810', '#14121c', '#2a2836'], floor: (x, y) => E.tex.flagstone(x, y, { stones: ['#3a3a46', '#4a4a56', '#2e2e3a'].map(E.hex), mortar: E.hex('#14121c'), hi: E.hex('#6a6a76'), lo: E.hex('#22222e'), speck: E.hex('#d8c070') }, 14), layers: [{ kind: 'city', color: '#1a1824', y: .5 }], props: [['bier', 140, 8], ['gear', 30, 4], ['gear', 250, 6], ['p:lamp', 90, 20], ['p:lamp', 190, 20]], light: '#ffe0a0', clock: true, music: 'hourless' },
  tent: { sky: ['#2a3a5a', '#5a6a8a', '#c8a878'], floor: (x, y) => E.tex.dirt(x, y), layers: [{ kind: 'hills', color: '#4a5a3a', y: .6 }], props: [['tent', 40, 6], ['tent', 240, 8], ['maptable', 140, 26], ['p:torch', 100, 30], ['p:torch', 180, 30]], light: '#ffc080', music: 'event' },
  road: { sky: ['#6a90c0', '#a8c8e0', '#e8f0f8'], floor: (x, y) => (Math.abs(y - 40) < 12 ? E.tex.dirt(x, y, { base: '#a88a5a' }) : E.tex.grass(x, y)), layers: [{ kind: 'hills', color: '#5a8a4a', y: .55 }, { kind: 'forest', color: '#3a6a3a', y: .62 }], props: [['tree', 20, 10], ['p:sign', 200, 20], ['rock', 260, 26], ['watermill', 240, 2]], light: '#fff8e0', music: 'event' },
  stable: { sky: ['#5a7aa0', '#90b0d0', '#e0e8f0'], floor: (x, y) => E.tex.dirt(x, y, { base: '#b09060', dark: '#8a6a40', light: '#c8a878' }), layers: [{ kind: 'hills', color: '#6a8a5a', y: .55 }], props: [['p:fence', 30, 10], ['p:fence', 60, 10], ['haybale', 230, 20], ['haybale', 250, 30], ['p:barrel', 200, 8]], light: '#fff0d0', music: 'event' }
};
G.STAGES = STAGES;
const SEASON_STAGE = { verdance: 'orchard', solmark: 'sunhall', amberlyn: 'harvesthall', hoarfast: 'icehall' };
class Stage {
  constructor(id) {
    const st = STAGES[id] || STAGES.road; this.id = id; this.st = st;
    this.map = new E.TileMap({ w: 18, h: 5, floorTex: (x, y) => st.floor(x, y), outside: undefined, ao: 0 });
    this.bg = new E.Backdrop({ sky: st.sky, layers: st.layers || [] });
  }
  draw(r, t, cast) {
    this.bg.draw(r); this.map.drawFloor(r);
    for (const [p, x, y, mats] of this.st.props) { if (p.startsWith('p:')) r.prop(p.slice(2), x, y, 0, { light: true, size: 1.2 }); else r.shape(p, x, y, 0, { mats }); }
    if (this.st.clock) r.queue(140, 2, 0, g => { const q = r.w(140, 2, 70); EUP.disc(g, q[0], q[1], 26, '#d8c070'); EUP.disc(g, q[0], q[1], 24, '#f0e8d8'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; EUP.dot(g, q[0] + Math.cos(a) * 21, q[1] + Math.sin(a) * 21, '#14121c'); } const a = Math.sin(t * 4) * .03 - 1.57; EUP.line(g, q[0], q[1], q[0] + Math.cos(a) * 18, q[1] + Math.sin(a) * 18, '#14121c', 2); EUP.line(g, q[0], q[1], q[0] + Math.cos(a + .02) * 12, q[1] + Math.sin(a + .02) * 12, '#c83a2a', 2); }, { bias: -50 });
    const L = G.game.lights; L.add(140, 30, 40, 220, .5, { color: this.st.light });
  }
}
G.Stage = Stage;

/* ---- the event scene ---- */
const EVS = { t: 0 };
G.SCENES.event = {
  pausable: true, view: 'brawler', input: G.PRESET, camera: { zoom: [1, 1.6], start: 1.15 },
  /** data: { id, realm, sim (a CampaignSim), onDone(choice) } */
  enter(data) {
    const ev = G.get('event', data.id); Object.assign(EVS, { data, ev, t: 0, done: false, choice: 0 });
    const stageId = ev.stage === 'court' ? SEASON_STAGE[data.realm] || 'road' : ev.stage;
    EVS.stage = new Stage(stageId);
    const ctx = data.sim ? data.sim.ctx(data.realm) : null; EVS.ctx = ctx;
    // the cast: who is on stage (the speakers in order, at most six)
    const ids = []; for (const l of ev.lines) { const t = TK.text(l[0], l[1], data.realm, ctx); if (t.sp !== 'narrator' && !ids.includes(t.sp)) ids.push(t.sp); }
    for (const c of ev.cast || []) if (!ids.includes(c) && c !== 'lunete' && c !== 'keeper' && ids.length < 6) ids.push(c);
    EVS.cast = ids.slice(0, 6).map((sp, i, a) => { const w = TK.who(sp, data.realm); const x = 140 + (i - (a.length - 1) / 2) * 30; return { sp, w, x, y: 44, hx: x, hy: 44, facing: Math.PI / 2 + (i < a.length / 2 ? -.8 : .8), pose: null, expr: null, emote: null, et: 0 }; });
    EVS.focus = [140, 40];
    G.game.lights.enabled = true; G.game.lights.ambient = stageId === 'clock' ? .5 : .78;
    G.game.weather = EVS.stage.st.weather || null;
    G.music(stageId === 'clock' ? 'hourless' : ev.ending ? 'ending' : 'event');
    TK.onLine = (w, l) => {
      const c = EVS.cast.find(c => c.w.id === w.id); for (const o of EVS.cast) { o.y = o.hy; o.pose = null; }
      if (c) { c.y = c.hy - 6; c.pose = l.opts.pose || null; c.expr = l.opts.expr || null; if (l.opts.emote) { c.emote = l.opts.emote; c.et = 0; } const others = EVS.cast.filter(o => o !== c), mx = others.length ? G.sum(others, o => o.x) / others.length : c.x; c.facing = Math.PI / 2 + (mx > c.x ? -.9 : .9); EVS.focus = [c.x * .5 + 70, 40]; }
      else EVS.focus = [140, 40];
    };
    TK.run(ev.lines, { realm: data.realm, ctx, choices: data.attract ? null : ev.choices, auto: data.attract ? 2.4 : 0, onChoice: i => { EVS.choice = i; }, onDone: () => this.after() });
  },
  /** after the lines: a choice's follow-up lines, then done */
  after() {
    const ev = EVS.ev, ch = ev.choices && ev.choices[EVS.choice];
    if (ch && ch.lines && !EVS.followed) { EVS.followed = true; TK.run(ch.lines, { realm: EVS.data.realm, ctx: EVS.ctx, onDone: () => this.after() }); return; }
    EVS.done = true; TK.onLine = null;
    const d = EVS.data; EVS.followed = false;
    if (d.onDone) d.onDone(EVS.choice);
  },
  exit() { TK.onLine = null; G.game.weather = null; },
  update(dt) {
    G.inputTick(dt); EVS.t += dt;
    if (EVS.data.attract && G.Attract.watch()) { TK.open = false; TK.q = []; return; }
    for (const c of EVS.cast) { const v = c.w.vis; if (!v) continue; c.et += dt; v.update(dt, { x: c.x, y: c.y, z: 0, vx: 0, vy: 0, facing: c.facing, act: c.pose ? { move: c.pose, k: .5, dur: 9 } : null, expr: c.expr }); }
    G.game.focus(EVS.focus[0], EVS.focus[1], 20);
    TK.update(dt);
  },
  draw(r) {
    EVS.stage.draw(r, EVS.t, EVS.cast);
    for (const c of EVS.cast) {
      if (!c.w.vis) continue;
      r.shadow(c.x, c.y, 7); r.actor(c.x, c.y, 0, (g, ox, oy) => c.w.vis.draw(g, ox, oy, r.view));
      if (c.emote && c.et < 1.6) r.overlay(g => { const q = r.w(c.x, c.y, c.w.vis.headZ() + 14 + Math.sin(c.et * 8) * 1.5); emote(g, q[0], q[1], c.emote); });
    }
    r.overlay(g => { if (EVS.ev.title) G.UI.title(g, EVS.ev.title.toUpperCase(), r.W / 2, 10, { scale: 2 }); });
    TK.draw(r);
  }
};
/** an emote balloon: '!' '?' dots heart note */
function emote(g, x, y, kind) {
  x = Math.round(x); y = Math.round(y);
  EUP.rect(g, x - 7, y - 9, 14, 11, '#14121c'); EUP.rect(g, x - 6, y - 8, 12, 9, '#ffffff'); EUP.poly(g, [[x - 2, y + 1], [x + 2, y + 1], [x, y + 4]], '#ffffff');
  if (kind === '!') { EUP.rect(g, x - 1, y - 7, 2, 5, '#c83a2a'); EUP.rect(g, x - 1, y - 1, 2, 1, '#c83a2a'); }
  else if (kind === '?') E.font.text(g, '?', x, y - 8, '#2a4a8a', { align: 'center' });
  else if (kind === 'heart') E.font.text(g, '♥', x, y - 8, '#e04a6a', { align: 'center' });
  else if (kind === 'note') E.font.text(g, '♪', x, y - 8, '#2a6a3a', { align: 'center' });
  else for (let i = -1; i <= 1; i++) EUP.rect(g, x + i * 3, y - 4, 2, 2, '#3a3a46');
}
G.emote = emote;

}

// ===== src/65-scene-results.js =====
{
// RESULTS, ENDINGS AND CREDITS: the battle's results (VICTORY or DEFEAT, unit rows with EXP bars filling and level-up
// gains, captures and losses, six rows a page), the endings (the scene on its stage, an epilogue card per surviving
// named knight, then the credits roll; the bad endings drain to grey and offer Retry or Title), and the credits.

const RU = G.UI, RP = E.px;
const RS = { t: 0 };
G.SCENES.results = {
  view: 'threequarter', input: G.PRESET,
  enter(d) {
    Object.assign(RS, d, { t: 0, page: 0 });
    const s = d.sim.s, ps = d.playerSide === undefined ? 0 : d.playerSide;
    RS.won = s.mode === 'shrine' ? s.over.standings[0].includes(ps) : d.res.winner === ps;
    RS.rows = d.res.units.filter(u => u.side === ps && !u.ref.startsWith('gk') && !u.ref.startsWith('secondhand')).map(u => ({ u, unit: d.sim.unit(u.id) }));
    RS.caps = d.res.captures.map(c => ({ name: d.sim.unit(c.u).name, mine: c.side === ps }));
    RS.lost = d.res.units.filter(u => u.side === ps && u.dead).map(u => d.sim.unit(u.id).name);
    G.music(RS.won ? 'victory' : null);
  },
  update(dt) {
    G.inputTick(dt); RS.t += dt;
    const inp = G.inp();
    if ((inp.pressed('confirm') || (inp.clicked && inp.clicked())) && RS.t > .6) {
      G.sfx('ui_confirm');
      if ((RS.page + 1) * 6 < RS.rows.length) { RS.page++; RS.t = .3; }
      else RS.next ? RS.next() : G.game.go('title');
    }
  },
  draw(r) {
    r.sky(RS.won ? ['#1a1430', '#3a2a50', '#7a5a40'] : ['#0a0a14', '#1a1424', '#3a2030']);
    r.overlay(g => {
      const k = RU.k(), W = r.W, H = r.H, s = RS.sim.s;
      RU.title(g, s.mode === 'shrine' ? (RS.won ? 'GLORY' : 'DEFEAT') : RS.won ? 'VICTORY' : 'DEFEAT', W / 2, 10, { scale: 3, colors: RS.won ? ['#ffffff', '#ffe080', '#c89020'] : ['#ffffff', '#ff8a7a', '#a02a2a'] });
      const cs = RS.sim.s.castle; RU.text(g, (cs ? G.get('castle', cs).name : G.get('map', s.map).name) + ' • ' + G.SEASON_NAME[s.season] + ' • bell ' + s.bell, W / 2, 40 * k, RU.COL.dim, { align: 'center' });
      const rows = RS.rows.slice(RS.page * 6, RS.page * 6 + 6), rw = Math.min(W - 20, 300 * k), rx = Math.round((W - rw) / 2);
      rows.forEach(({ u, unit }, i) => {
        const y = 54 * k + i * 22 * k, prog = Math.min(1, Math.max(0, (RS.t - .3 - i * .15) / 1.2));
        RU.box(g, rx, y, rw, 20 * k, { alpha: .88 });
        const v = new G.Vis(unit); v.update(0, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); v.portrait(g, rx + 2, y + 2, 16 * k, { bg: '#1a1e40', frame: false, tint: u.dead ? '#808080' : undefined });
        RU.text(g, unit.name.slice(0, 13), rx + 22 * k, y + 2, u.dead ? '#8a86a0' : '#ffffff'); RU.text(g, 'Lv ' + (unit.level0 + Math.round(u.levels * prog)), rx + 22 * k, y + 11 * k, RU.COL.dim);
        const expShown = Math.round(u.expGain * prog); RU.bar(g, rx + 90 * k, y + 5 * k, 80 * k, 5 * k, ((unit.exp0 + expShown) % 100) / 100, '#ffd060'); RU.text(g, '+' + expShown + ' EXP', rx + 174 * k, y + 3, '#ffe080');
        if (u.levels && prog >= 1) RU.text(g, 'LEVEL UP! ' + Object.entries(u.gains || {}).filter(([, x]) => x > 0).slice(0, 3).map(([s2, x]) => '+' + x + ' ' + s2.toUpperCase()).join(' '), rx + 90 * k, y + 12 * k, '#7ae07a');
        if (u.dead) RU.text(g, 'LOST', rx + rw - 6, y + 6 * k, '#ff6a5a', { align: 'right' }); else if (u.wounded) RU.text(g, 'WOUNDED', rx + rw - 6, y + 6 * k, '#ffb060', { align: 'right' }); else if (u.captured) RU.text(g, 'CAPTURED', rx + rw - 6, y + 6 * k, '#ffd060', { align: 'right' });
      });
      let y = 54 * k + rows.length * 22 * k + 4;
      if (RS.caps.length) { RU.text(g, 'Captured: ' + RS.caps.map(c => c.name + (c.mine ? '' : ' (lost to them)')).join(', ').slice(0, 70), rx, y, '#ffd060'); y += 11 * k; }
      if (RS.lost.length) RU.text(g, 'Fallen for good: ' + RS.lost.join(', ').slice(0, 70), rx, y, '#ff9a8a');
    });
    RU.prompts(r, [['confirm', (RS.page + 1) * 6 < RS.rows.length ? 'Next page' : 'Continue']]);
  }
};

/* ---- endings ---- */
const EN = {};
/** play a campaign's ending: its scene, then epilogue cards (good), or the grey card (bad) */
G.goEnding = sim => {
  const res = sim.s.result, id = res.ending, ev = G.has('event', id) ? G.get('event', id) : null, realm = res.realm || sim.s.humans[0];
  if (!ev) { G.game.go('ending', { sim, bad: res.kind !== 'win' }); return; }
  G.game.go('event', { id, realm: res.kind === 'win' ? res.realm : sim.s.humans[0], sim, onDone: () => G.game.go('ending', { sim, bad: !!ev.bad, title: ev.title }) });
};
G.SCENES.ending = {
  view: 'threequarter', input: G.PRESET,
  enter(d) {
    Object.assign(EN, d, { t: 0, i: 0, st: { f: 0 } });
    const sim = d.sim, realm = sim.s.result && sim.s.result.realm || sim.s.humans[0];
    EN.cards = [];
    if (!d.bad) {
      const ctx = sim.ctx(realm);
      for (const [id, txt] of Object.entries(G.EPILOGUES)) { const k = sim.s.knights[id]; if (!k || k.free || k.realm !== realm) continue; EN.cards.push({ id, text: typeof txt === 'function' ? txt(Object.assign({ flags: sim.s.flags }, ctx)) : txt }); }
      if (!sim.s.knights.lunete || sim.s.knights.lunete.realm !== realm) EN.cards.push({ id: G.RULER[realm], text: G.EPILOGUE_NO_LUNETE[realm] });
      G.music('ending', { restart: true });
    } else { G.music(null); G.sting('defeat'); }
  },
  update(dt) {
    G.inputTick(dt); EN.t += dt; const inp = G.inp();
    if (EN.bad) {
      const res = RU.nav(EN.st, EN.items || RU.synth(2, 2));
      if (res === 'pick' && EN.t > 1.5) { if (EN.st.f === 0 && G.game.saves && G.game.saves.latest && G.game.saves.latest()) { G.loadLatest(); } else G.game.go('title'); }
      return;
    }
    if ((inp.pressed('confirm') || (inp.clicked && inp.clicked())) && EN.t > .5) { EN.i++; EN.t = 0; G.sfx('ui_move'); if (EN.i >= EN.cards.length) G.game.go('credits', { realm: EN.sim.s.result && EN.sim.s.result.realm }); }
    if (G.holdDone('confirm', 1)) G.game.go('credits', {});
  },
  draw(r) {
    const k = RU.k();
    if (EN.bad) {
      r.sky(['#101014', '#1a1a20', '#2a2a30']);
      r.overlay(g => {
        const a = Math.min(1, EN.t / 2);
        RU.title(g, EN.title || 'THE LEGEND ENDS', r.W / 2, r.H / 2 - 30 * k, { scale: 2, colors: ['#e0e0e0', '#a0a0a8', '#606068'] });
        RU.text(g, 'The Wheel has stopped.', r.W / 2, r.H / 2 - 4 * k, '#8a8a92', { align: 'center' });
        const can = G.game.saves && G.game.saves.latest && G.game.saves.latest();
        const opts = ['Retry', 'Title']; EN.items = opts.map((o, i) => ({ x: r.W / 2 - 64 + i * 68, y: r.H / 2 + 20 * k, w: 60, h: 14 * k, disabled: i === 0 && !can ? 'No save to retry from' : false }));
        if (a >= 1) opts.forEach((o, i) => { const it = EN.items[i]; RP.rect(g, it.x, it.y, it.w, it.h, i === EN.st.f ? '#3a3a46' : '#1a1a20'); RU.text(g, o, it.x + it.w / 2, it.y + 3, it.disabled ? '#5a5a62' : i === EN.st.f ? '#ffffff' : '#a0a0a8', { align: 'center' }); if (i === EN.st.f) RU.focusFrame(g, it.x, it.y, it.w, it.h, EN.t); });
      });
      RU.prompts(r, [['left', 'Choose'], ['confirm', 'Select']]);
      return;
    }
    r.sky(['#2a2050', '#7a5a90', '#f0c890']);
    r.overlay(g => {
      const c = EN.cards[EN.i]; if (!c) return;
      const w = Math.min(r.W - 30, 280 * k), h = 70 * k, x = Math.round((r.W - w) / 2), y = Math.round(r.H / 2 - h / 2);
      RU.box(g, x, y, w, h, { alpha: .95 });
      G.knightVis(c.id).portrait(g, x + 6, y + 6, 46 * k, { bg: '#2a2050' });
      E.font.wrap(c.text, w - 64 * k, { scale: k }).forEach((l, i) => RU.text(g, l, x + 58 * k, y + 8 + i * 10 * k, '#ffffff'));
      RU.text(g, (EN.i + 1) + '/' + EN.cards.length, x + w - 6, y + h - 12 * k, RU.COL.dim, { align: 'right' });
      RU.title(g, 'EPILOGUE', r.W / 2, 10, { scale: 2 });
    });
    RU.prompts(r, [['confirm', 'Next'], ['confirm', 'Hold: Credits']]);
  }
};

/* ---- the credits roll ---- */
const CR2 = {};
G.SCENES.credits = {
  view: 'threequarter', input: G.PRESET,
  enter() { CR2.t = 0; G.music('ending'); CR2.lines = G.creditLines(); },
  update(dt) { G.inputTick(dt); CR2.t += dt * (G.inp().down('confirm') ? 4 : 1); if (G.inp().pressed('cancel') || CR2.t > CR2.lines.length * 1.1 + 8) G.game.go('title'); },
  draw(r) {
    r.sky(['#0a0814', '#1a1430', '#2a2050']);
    r.overlay(g => {
      const k = RU.k(), y0 = r.H - CR2.t * 22 * k;
      RU.title(g, 'BRIGANTIME', r.W / 2, y0 - 40 * k, { scale: 3 });
      CR2.lines.forEach((l, i) => { const y = y0 + i * 14 * k; if (y < -10 || y > r.H) return; RU.text(g, l.text, r.W / 2, y, l.head ? RU.COL.gold : '#e8e4f0', { align: 'center' }); });
    });
    RU.prompts(r, [['confirm', 'Hold: Faster'], ['cancel', 'Title']]);
  }
};
G.creditLines = () => {
  const A = G.ABOUT, out = [{ text: 'THE LEGEND OF FORSEASONS' }, { text: '' }];
  for (const [h, lines] of A.credits) { out.push({ text: h, head: true }); for (const l of lines) out.push({ text: l }); out.push({ text: '' }); }
  out.push({ text: 'Thank you for playing.', head: true });
  return out;
};

}

// ===== src/66-scene-about.js =====
{
// ABOUT & CREDITS and HOW TO PLAY: pages flipped with left / right or L1 / R1 (or a click on the arrows), at most eight
// lines each in 10-foot text. How to Play shows a small live diorama of rigs on each page.

const AU = G.UI, AP2 = E.px;
function pagedScene(id, pagesFn, o = {}) {
  const S = { p: 0, t: 0, off: 0, more: 0 };   // off: the first line shown on a page too long for the screen; more: lines still below
  G.SCENES[id] = {
    view: 'threequarter', input: G.PRESET,
    enter(d = {}) { S.p = 0; S.t = 0; S.off = 0; S.more = 0; S.back = d.back || 'title'; S.pages = pagesFn(); if (o.music) G.music(o.music); },
    back() { G.game.go(S.back === 'pause' ? G.lastPlayScene || 'title' : S.back); return true; },
    update(dt) {
      G.inputTick(dt); S.t += dt; const inp = G.inp(), n = S.pages.length;
      // a page longer than the screen flips through its overflow first
      const fwd = () => { if (S.more > 0) S.off += S.maxL || 8; else { S.p = (S.p + 1) % n; S.off = 0; } S.more = 0; G.sfx('ui_move'); };
      const bwd = () => { if (S.off > 0) S.off = Math.max(0, S.off - (S.maxL || 8)); else { S.p = (S.p + n - 1) % n; S.off = 0; } S.more = 0; G.sfx('ui_move'); };
      if (G.repeat('right') || G.pressed('next')) fwd();
      if (G.repeat('left') || G.pressed('prev')) bwd();
      if (G.repeat('down') && S.more > 0) fwd(); else if (G.repeat('up') && S.off > 0) bwd();
      const c = inp.clicked && inp.clicked(); if (c) { if (c[0] < G.game.W / 3) bwd(); else if (c[0] > G.game.W * 2 / 3) fwd(); }
      if (inp.pressed('cancel') || inp.pressed('confirm') && S.p === n - 1 && S.more <= 0) { G.sfx('ui_cancel'); this.back(); }
    },
    draw(r) {
      r.sky(['#0a0c20', '#1a1e40', '#2a2a50']);
      const pg = S.pages[S.p];
      if (pg.scene) pg.scene(r, S.t);
      r.overlay(g => {
        const k = AU.k(), W = r.W, H = r.H, w = Math.min(W - 24, 400), x = Math.round((W - w) / 2), top = pg.scene ? Math.round(H * .4) : 34;
        AU.title(g, pg.title, W / 2, 8, { scale: 2 });
        AU.box(g, x, top, w, H - top - 26 * k, { alpha: .9 });
        let y = top + 6; const lines = [];
        for (const l of pg.lines) { const [lab, val] = Array.isArray(l) ? l : [null, l]; const wrapped = E.font.wrap((lab ? lab + ': ' : '') + val, w - 16, { scale: k }); wrapped.forEach((t2, i) => lines.push({ t: t2, lab: i === 0 ? lab : null })); }
        const maxL = Math.max(1, Math.floor((H - top - 34 * k) / (10 * k))); S.maxL = maxL; S.more = lines.length - S.off - maxL;
        for (const l of lines.slice(S.off, S.off + maxL)) { if (l.lab) { AU.text(g, l.lab + ':', x + 8, y, AU.COL.gold); AU.text(g, l.t.slice(l.lab.length + 1), x + 8 + AU.width(l.lab + ':'), y, '#ffffff'); } else AU.text(g, l.t, x + 8, y, '#e8e4f0'); y += 10 * k; }
        const by = H - 26 * k + 3;   // under the box, clear of the centred prompt bar
        AU.text(g, (S.p + 1) + ' / ' + S.pages.length, x + w - 2, by, AU.COL.dim, { align: 'right' });
        if (S.more > 0 || S.off > 0) AU.text(g, (S.off > 0 ? '↑ ' : '') + (S.more > 0 ? '↓ more' : ''), x + 2, by, AU.COL.gold);
        AP2.poly(g, [[8, H / 2], [14, H / 2 - 6], [14, H / 2 + 6]], AU.COL.dim); AP2.poly(g, [[W - 8, H / 2], [W - 14, H / 2 - 6], [W - 14, H / 2 + 6]], AU.COL.dim);
      });
      AU.prompts(r, [['left', 'Page'], ['next', 'Page'], ['cancel', 'Back']]);
    }
  };
}
/* ---- About & Credits ---- */
pagedScene('about', () => {
  const A = G.ABOUT, split = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
  const pages = [{ title: 'ABOUT', lines: [A.title, A.tagline, 'Version ' + G.VERSION + ' • built ' + G.BUILD, E.versionLabel ? 'Engine ' + E.versionLabel().replace(/·/g, '•') : 'Engine my-3D2dge', 'Inspired by Brigandine: The Legend of Forsena.', 'The world, characters, music and art are original.'] }];
  split(A.source, 5).forEach((part, i) => pages.push({ title: 'SOURCE INFORMATION ' + (i + 1), lines: part }));
  const q = (title, qs, as) => split(qs.map((qq, i) => [qq, as[i]]), 2).forEach((part, i) => pages.push({ title: title + (i ? ' ' + (i + 1) : ''), lines: part }));
  q('TESTING FEEDBACK', ['Issues caught', 'Critical issues', 'Most helpful test', 'Least helpful test'], A.testing);
  q('ENGINE FEEDBACK', ['Liked most', 'Stuck or guessed wrong', 'Built myself', 'Hardest part', 'Changed in the engine', 'One change'], A.engine);
  q('PROMPT FEEDBACK', ['Liked most', 'Confusing', 'Hardest thing', 'Would change'], A.prompt);
  pages.push({ title: 'CREDITS', lines: A.credits.flatMap(([h, ls]) => [[h, ls.join(' • ')]]) });
  return pages;
});
/* ---- How to Play: eight pages, each with a live diorama ---- */
const DIO = {};
function diorama(r, t, cast, opt = {}) {
  DIO.view = DIO.view || new E.View('dio', 'Dio', 0, 30, 2, 1);
  r.overlay(g => {
    const W = r.W, cy = Math.round(r.H * .38);
    AP2.rect(g, 0, cy - 2, W, 4, '#2a3a2a');
    if (opt.ground) opt.ground(g, W, cy, t);
    cast.forEach((c, i) => {
      const x = Math.round(W / 2 + (i - (cast.length - 1) / 2) * 46);
      c.vis.update(1 / 60, { x: 0, y: 0, z: 0, vx: c.walk ? 30 : 0, vy: 0, facing: c.face === undefined ? Math.PI / 2 : c.face, act: c.move ? { move: c.move, k: (t * .8 + i * .3) % 1, dur: 1 } : null });
      c.vis.draw(g, x, cy, DIO.view);
      if (c.label) AU.text(g, c.label, x, cy + 6, c.color || '#ffffff', { align: 'center' });
    });
  });
}
const dv = (spec) => G.visFor('dio:' + JSON.stringify(spec), spec);
pagedScene('help', () => [
  { title: 'THE WHEEL AND THE SEASONS', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('gareth'), label: 'Spring', color: '#9ad86a' }, { vis: G.knightVis('morgause'), label: 'Summer', color: '#ffd060' }, { vis: G.knightVis('pellam'), label: 'Autumn', color: '#ff9a40' }, { vis: G.knightVis('mordrain'), label: 'Winter', color: '#a8e0ff' }]),
    lines: ['Each turn is a season: Tidings (news), Muster (organize), March (attack), then the battles.', 'The season is also an element. Spring opposes Autumn; Summer opposes Winter.', 'In its own season an element hits 15% harder (the Seasonal Tide); its opposite 15% softer.', 'Seasons change the land: Spring floods, Summer dries and burns, Autumn gales, Winter freezes.', 'Take Meridian and defeat the Gray Knight before the Hour-Candle burns out.'] },
  { title: 'MUSTER', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('lynette'), move: 'cheer' }, { vis: G.monsterVis('treant', 1) }, { vis: G.monsterVis('sproutling', 1) }]),
    lines: ['Choose one of your castles to Organize, Summon, Move, Quest, Equip and Promote.', 'A knight may move once a Muster, to a castle of yours next door.', 'Castles yield mana each Tidings, more in their own season. Monsters cost upkeep.', 'Hold Square / Space to end the Muster.'] },
  { title: 'SUMMON AND BOND', scene: (r, t) => diorama(r, t, [{ vis: G.monsterVis('frostwolf', 1) }, { vis: G.monsterVis('frostwyrm', 1) }, { vis: G.monsterVis('snowkit', 1) }]),
    lines: ["Each castle's summoning circle offers its own species; some only in their season.", 'A troop holds up to six monsters. Their ranks may not add up to more than the knight\'s Bond.', 'Monsters grow by level and change form at 12 and 22 (sooner with a Season Seed).', 'Formations: Vanguard ahead, Shield around, Column behind.'] },
  { title: 'QUESTS', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('wren'), walk: true, face: 0 }, { vis: G.monsterVis('unicorn', 1), walk: true, face: 0 }]),
    lines: ['Send a knight (not a ruler) from a castle to its quest site for one or two seasons.', 'They return with treasure, a beast, a wanderer who joins, mana, training, or a wound.', 'Clerics find treasure, tamers find beasts, rangers find wanderers. Two away at most.'] },
  { title: 'MARCH', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('agravain'), walk: true, face: 0 }, { vis: G.monsterVis('cinderhound', 1), walk: true, face: 0 }, { vis: G.monsterVis('salamander', 1), walk: true, face: 0 }]),
    lines: ['March on a foreign castle beside one of yours with up to three troops.', 'A castle left without knights falls without a battle.', 'Battles you take part in: Command them yourself, or Delegate them to your captains.'] },
  { title: 'BELLS AND THE KEEP', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('ragnell'), move: 'slash' }, { vis: G.monsterVis('icegolem', 1), move: 'haymaker' }]),
    lines: ['A battle lasts twelve bells. Each bell, troops act in order of their knight\'s agility.', 'Each unit may move, then take one action: Attack, Special, Spell, Item, Guard or Wait.', 'Spells need planted feet: cast them before moving.', 'At the last bell the attacker wins only with a knight standing on the Keep.'] },
  { title: 'WARD, SIZE AND ELEMENTS', scene: (r, t) => diorama(r, t, [{ vis: G.monsterVis('pixie', 1) }, { vis: G.monsterVis('wyvern', 1), move: 'bite' }]),
    lines: ["A knight's Ward is the ring around it. A monster outside its own knight's Ward is weaker.", 'Big monsters struggle to hit small, quick ones.', 'The forecast shows hit, damage, crits, and STRONG (↑) or WEAK (↓) before every confirm.', 'Allies next to a foe add flanking hit and surround damage.'] },
  { title: 'KNIGHTS, RETREAT AND CAPTURE', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('gareth'), move: 'kneel' }, { vis: G.monsterVis('jacklamp', 1) }]),
    lines: ['When a knight falls or retreats, its whole troop leaves the field.', 'Its monsters near an enemy knight may be captured, and join the captor\'s realm.', 'Monsters at 0 HP die for good. Knights are wounded and miss a season.', 'If a ruler falls or retreats, the whole side loses.'] }
], { music: 'event' });

}

// ===== src/67-scene-attract.js =====
{
// THE ATTRACT MODE: after 10 seconds without input on the title or a setup screen, a reel of about 90 seconds loops:
// the Wheel turns (the continent pans across the four regions while the seasons wipe every 3 s and an AI-only campaign
// flips banners), a Frost Wyrm is summoned at Rimeholt, a battle at speed (a rotation of three per loop, the showcase AI
// preferring specials and spells), the Gray Knight in the clock chamber, then the logo. It cheats freely. Any input
// (the idle timer's set) goes to the title. snapshot().attract.beat says where it is.

const AT = G.Attract = { on: false, beat: null, loop: 0, t: 0 };
const AU2 = G.UI, AXP = E.px;
const BATTLES = [
  () => ({ spec: G.skirmishSpec({ map: 'lakeside', season: 'winter', sides: [{ realm: 'solmark', ctl: 'normal', level: 12 }, { realm: 'hoarfast', ctl: 'normal', level: 12 }], seed: 5 }), region: 'winter', caption: 'WINTER: THE LAKE FREEZES OVER' }),
  () => ({ spec: G.skirmishSpec({ map: 'river_ford', season: 'spring', sides: [{ realm: 'verdance', ctl: 'normal', level: 14 }, { realm: 'amberlyn', ctl: 'normal', level: 14 }], seed: 9 }), region: 'spring', caption: 'SPRING: THE FORDS FLOOD' }),
  () => { const s = { seed: 13, map: 'clockwork_sanctum', season: 'autumn', mode: 'sanctum', sides: [{ realm: 'hoarfast', role: 'att', ai: 'normal', troops: ['mordrain', 'ragnell', 'nimue'].map(id => G.troopAt(id, 22, { realm: 'hoarfast' })) }, { realm: 'dominion', role: 'def', ai: 'normal', troops: [G.CampaignSim.prototype._grayKnightTroop.call(null)] }] }; return { spec: s, region: 'hour', caption: 'THE CLOCKWORK SANCTUM', dials: true }; }
];
const CAPTIONS = { wheel: 'FOUR SEASONS. FOUR CROWNS. ONE STOPPED CLOCK.', summon: 'BIND MONSTERS TO YOUR BANNER.', gray: 'BEFORE THE THIRTEENTH MONTH...', logo: 'PRESS ANY BUTTON' };
AT.start = () => { AT.on = true; AT.loop = (AT.loop || 0); AT.t = 0; G.game.go('attract', {}, { fade: .5 }); };
AT.stop = () => { if (!AT.on) return; AT.on = false; AT.beat = null; G.game.input.consumeAll(); G.In.idle = 0; G.game.go('title', {}, { fade: .3 }); };
/** any input ends the reel (called from every scene the reel uses) */
AT.watch = () => { if (!AT.on) return false; if (G.In.idle === 0 && AT.armed) { AT.stop(); return true; } AT.armed = true; return false; };
G.SCENES.attract = {
  view: 'threequarter', input: G.PRESET, camera: { zoom: false },
  enter(d = {}) {
    AT.armed = false; AT.t = d.from || 0; G.In.idle = 1;
    AT.sim = G.CampaignSim.create({ seed: 100 + AT.loop, humans: [] , difficulty: 'hard' });
    AT.sim.s.humans = []; G.Camp.wm = G.Camp.wm || new G.WorldMap(); AT.season = -1;
    G.game.lights.enabled = true; G.game.lights.ambient = .85; G.game.cam.bounds = null;
    G.music(d.from ? 'title' : 'title');
    AT.rig = null; AT.summonT = 0;
  },
  update(dt) {
    G.inputTick(dt); if (AT.watch()) return;
    AT.t += dt; const t = AT.t;
    if (t < 12) {
      AT.beat = 'wheel';
      const si = Math.floor(t / 3) % 4; if (si !== AT.season) { AT.season = si; const s = G.SEASONS[si]; if (si > 0) G.CampaignAI.playSeason(AT.sim); G.Camp.wm.update(AT.sim, s); G.game.weather = s === 'spring' ? { kind: 'petals', amount: .4 } : G.weatherFor(s); G.sting('season_' + s); AT.wipe = 1; }
      const a = t / 12 * Math.PI * 2; G.game.focus(512 + Math.cos(a) * 280, 512 + Math.sin(a) * 260, 0);
    } else if (t < 20) {
      AT.beat = 'summon';
      if (!AT.rig) { AT.rig = G.monsterVis('frostwyrm', 2); AT.summonT = 0; G.sfx('summon_rise'); G.sting('summon'); G.Camp.wm.update(AT.sim, 'winter'); G.game.weather = { kind: 'snow', amount: .5 }; }
      AT.summonT += dt; G.game.focus(512, 120, 0);
    } else if (t < 65) {
      AT.beat = 'battle';
      const b = BATTLES[AT.loop % 3]();
      G.game.go('battle', { spec: b.spec, ctx: { kind: 'attract', region: b.region, sides: b.spec.sides.map(() => 'ai'), showcase: true, speed: 2, caption: b.caption, onEnd: () => G.game.go('attract', { from: 65 }) } }, { fade: 'swirl', seconds: .4 });
      if (b.dials) AT.dials = true;
      return;
    } else if (t < 80) {
      AT.beat = 'gray';
      if (!AT.grayStarted) { AT.grayStarted = true; G.game.go('event', { id: 'banner_without_season', realm: 'verdance', attract: true, onDone: () => G.game.go('attract', { from: 80 }) }); return; }
    } else if (t < 90) {
      AT.beat = 'logo'; G.game.focus(512, 500, 30);
    } else { AT.loop++; AT.grayStarted = false; AT.t = 0; AT.season = -1; AT.rig = null; AT.sim = G.CampaignSim.create({ seed: 100 + AT.loop, humans: [] }); AT.sim.s.humans = []; }
    if (AT.wipe > 0) AT.wipe = Math.max(0, AT.wipe - dt / 1.2);
  },
  draw(r) {
    G.Camp.wm.draw(r, AT.t);
    if (AT.beat === 'wheel' && AT.wipe > 0) { const rad = (1 - AT.wipe) * 700, col = G.elemColor(G.SEASONS[Math.max(0, AT.season)]); r.decal(g => { const p1 = r.groundPts(512, 512, rad, 64, 0), p2 = r.groundPts(512, 512, rad + 40, 64, 0); for (let i = 0; i < p1.length; i++) AXP.line(g, p1[i][0], p1[i][1], p2[i][0], p2[i][1], col, 2); }, { emissive: 1 }); }
    if (AT.beat === 'summon' && AT.rig) {
      const k = Math.min(1, AT.summonT / 2.5), x = 512, y = 130;
      r.decal(g => { const pts = r.groundPts(x, y, 30, 32, 0); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; AXP.line(g, a[0], a[1], b[0], b[1], '#a8e8ff', 1); } for (let i = 0; i < 8; i++) { const ag = AT.summonT * 2 + i / 8 * Math.PI * 2, q = r.w(x + Math.cos(ag) * 22, y + Math.sin(ag) * 22, 0); AXP.rect(g, q[0] - 1, q[1] - 1, 3, 3, '#ffffff'); } }, { emissive: 1 });
      AT.rig.update(1 / 60, { x, y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, act: k >= 1 ? { move: 'roar', k: (AT.summonT * .7) % 1 } : null });
      r.actor(x, y, 0, (g, ox, oy) => { g.save(); g.translate(ox, oy); g.scale(k, k); g.translate(-ox, -oy); AT.rig.draw(g, ox, oy, r.view); g.restore(); });
      r.queue(x, y, 0, g => { const b = r.w(x, y, 0), tp = r.w(x, y, 90); AXP.blend(g, .4 * (1 - k * .7), 'add', () => AXP.rect(g, b[0] - 10, tp[1], 20, b[1] - tp[1], '#a8e8ff')); }, { emissive: true });
      G.game.lights.add(x, y, 20, 90, 1, { color: '#a8e8ff' });
    }
    r.overlay(g => {
      const W = r.W, H = r.H, cap = CAPTIONS[AT.beat];
      if (AT.beat === 'logo') { E.font.title(g, 'BRIGANTIME', W / 2, H * .3, { scale: 4, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10', depth: 3, depthColor: '#5a2a1a', align: 'center' }); AU2.text(g, 'THE LEGEND OF FORSEASONS', W / 2, H * .3 + 40, '#f0e8d8', { align: 'center' }); }
      else E.font.title(g, 'BRIGANTIME', 8, 8, { scale: 1, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10' });
      if (cap && AT.beat !== 'logo') { AXP.rect(g, 0, H - 52, W, 16, '#0a0814'); AU2.text(g, cap, W / 2, H - 48, '#ffe080', { align: 'center' }); }
      if (Math.sin(AT.t * 4) > 0) AU2.text(g, 'PRESS ANY BUTTON', W / 2, H - 26, '#ffffff', { align: 'center' });
    });
  }
};

}

// ===== src/70-dev.js =====
{
// DEV MODE (pause menu > Dev Mode; absent in hub sessions): a full-screen panel with tabs (L1 / R1 or a click):
// Cheats, Battle, Campaign, Balance (a live slider for every tunable, grouped; left / right adjusts, hold to speed up,
// the mouse drags the bar, Triangle / I resets one, "Reset all to defaults" at the top), View, Info. Anything touched
// marks the campaign DEV. Also the gallery scene (#gallery): every species in all three forms, every class's moves.

const DU = G.UI, DXP = E.px;
const D = G.Dev = { open: false, tab: 0, list: new DU.List({ rows: 12 }), hold: 0, log: [] };
G.cheats = { god: false, ohko: false, mp: false };
const TABS = ['Cheats', 'Battle', 'Campaign', 'Balance', 'View', 'Info'];
D.toggle = on => { D.open = on === undefined ? !D.open : on; if (D.open) { G.game.resume && G.game.resume(); G.game.input.consumeAll(); D.list.index = 0; } };
const inBattle = () => G.game.sceneName === 'battle' && G.Battle.sim;
const camp = () => G.Camp.sim;
const markDev = () => { if (camp()) camp().s.dev = true; };
const campDev = (op, o = {}) => { const sim = camp(); if (!sim) { DU.toast('No campaign running', DU.COL.bad); return; } markDev(); sim.apply(Object.assign({ t: 'dev', op, realm: sim.currentHuman() || sim.s.humans[0] }, o)); DU.toast('Done: ' + op, '#7ae07a', 1.2); };
const battleCmd = cmd => { if (!inBattle()) { DU.toast('No battle running', DU.COL.bad); return; } markDev(); G.Battle.apply(cmd); };
const selUnit = () => { const B = G.Battle; if (!inBattle()) return null; return B.sel ? B.sim.unit(B.sel) : B.cursor ? B.sim.at(B.cursor) : null; };
const pickFrom = (title, opts, fn) => { D.sub = { title, rows: opts.map(o => ({ label: o.label || o, act: () => { fn(o.value === undefined ? o : o.value); D.sub = null; } })), list: new DU.List({ rows: 12 }) }; };
function rows() {
  const sim = camp(), B = G.Battle;
  switch (TABS[D.tab]) {
    case 'Cheats': return [
      { label: 'God mode (your units take no damage)', value: G.cheats.god ? 'ON' : 'off', act: () => { G.cheats.god = !G.cheats.god; markDev(); } },
      { label: 'One-hit KOs', value: G.cheats.ohko ? 'ON' : 'off', act: () => { G.cheats.ohko = !G.cheats.ohko; markDev(); } },
      { label: 'Infinite MP', value: G.cheats.mp ? 'ON' : 'off', act: () => { G.cheats.mp = !G.cheats.mp; markDev(); } },
      { label: 'Free summons', value: sim && sim.s.flags.devFreeSummon ? 'ON' : 'off', act: () => campDev('freeSummon') },
      { label: '+1000 mana', act: () => campDev('mana', { amt: 1000 }) },
      { label: 'Heal all (wounds too)', act: () => { campDev('heal'); if (inBattle()) for (const u of B.sim.field()) if (B.sim.s.sides[u.side].human) u.hp = u.mhp; } },
      { label: 'Level up the selected unit +1', act: () => levelSel(1) },
      { label: 'Level up the selected unit +5', act: () => levelSel(5) },
      { label: 'Give an item...', act: () => pickFrom('Give an item', G.all('item').map(i => ({ label: i.name, value: i.id })), id => campDev('item', { item: id })) },
      { label: 'Add a free knight...', act: () => pickFrom('Add a knight', G.all('knight').filter(k => k.free || k.realm === 'brigands').map(k => ({ label: k.short, value: k.id })), id => campDev('knight', { knight: id })) },
      { label: 'Spawn a monster at the focused castle...', act: () => pickFrom('Spawn a monster', G.all('monster').map(m => ({ label: m.names[0], value: m.id })), sp => campDev('spawn', { sp, castle: G.Camp.focus })) },
      { label: 'Unlock all class changes', value: sim && sim.s.flags.devUnlockClass ? 'ON' : 'off', act: () => campDev('unlockClass') },
      { label: 'Reveal the AI\'s planned marches', act: () => revealMarches() }];
    case 'Battle': return [
      { label: 'Win now', act: () => { if (inBattle()) battleCmd({ t: 'win', side: B.ctx.playerSide || 0 }); } },
      { label: 'Lose now', act: () => { if (inBattle()) battleCmd({ t: 'win', side: (B.ctx.playerSide || 0) === 0 ? 1 : 0 }); } },
      { label: 'KO the selected unit', act: () => { const u = selUnit(); if (u) battleCmd({ t: 'ko', u: u.id }); else DU.toast('Point the cursor at a unit', DU.COL.bad); } },
      { label: 'Set the bell', value: inBattle() ? B.sim.s.bell : '-', change: d => { if (inBattle()) battleCmd({ t: 'bell', n: B.sim.s.bell + d }); } },
      { label: 'Set the season (terrain re-applies)', value: inBattle() ? B.sim.s.season : '-', change: d => { if (inBattle()) { const i = G.SEASONS.indexOf(B.sim.s.season); battleCmd({ t: 'season', s: G.SEASONS[(i + 4 + d) % 4] }); } } },
      { label: 'AI plays your side (autoplay)', value: inBattle() && B.delegated.all ? 'ON' : 'off', act: () => { if (inBattle()) { B.delegated.all = !B.delegated.all; markDev(); } } },
      { label: 'Delegate the rest of the battle (instant)', act: () => { if (inBattle()) { markDev(); G.BattleAI.resolve(B.sim); B.q = []; } } },
      { label: 'Light all Sanctum dials', act: () => battleCmd({ t: 'dials' }) }];
    case 'Campaign': return [
      { label: 'Jump to season', value: sim ? G.SEASON_NAME[sim.season] + ' Y' + sim.year : '-', change: d => { if (sim) { campDev('jump', { turn: Math.max(0, sim.s.turn + d) }); } } },
      { label: 'Skip to Muster', act: () => { if (sim && sim.s.phase === 'tidings') { markDev(); G.Camp.todo = [{ k: 'tidings' }]; } } },
      { label: 'Skip to March (end Muster)', act: () => { if (sim && sim.s.phase === 'muster') { markDev(); sim.apply({ t: 'endMuster', realm: sim.currentHuman() }); G.Camp.todo.push({ k: 'privacy', realm: sim.currentHuman(), then: sim.s.phase }); } } },
      { label: 'Trigger an event...', act: () => pickFrom('Trigger an event', G.all('event').map(e => ({ label: e.id, value: e.id })), id => { campDev('trigger', { id }); if (sim) G.Camp.todo.unshift({ k: 'takeStory' }); }) },
      { label: 'Set the focused castle\'s owner', value: sim && G.Camp.focus ? sim.s.castles[G.Camp.focus].owner : '-', change: d => { if (sim) { const i = G.REALMS.indexOf(sim.s.castles[G.Camp.focus].owner); campDev('owner', { castle: G.Camp.focus, owner: G.REALMS[(i + 6 + d) % 6] }); G.Camp.wm.update(sim, sim.season); } } },
      { label: 'Run 4 AI seasons (your realm on autoplay)', act: () => { if (sim) { markDev(); for (let i = 0; i < 4 && !sim.s.result; i++) G.CampaignAI.playSeason(sim, { choice: () => 0 }); G.Camp.todo = sim.s.result ? [] : [{ k: 'tidings' }]; G.Camp.wm.update(sim, sim.season); } } },
      { label: 'Autoplay your realm', value: G.autoplayOn ? 'ON' : 'off', act: () => { G.autoplayOn = !G.autoplayOn; markDev(); } },
      { label: 'Burn the candle', act: () => { if (sim) campDev('candle', { value: Math.max(0, (sim.s.candle === null ? 12 : sim.s.candle) - 1) }); } },
      { label: 'Refill the candle', act: () => { if (sim) campDev('candle', { value: G.DIFF[sim.s.difficulty].candle }); } },
      { label: 'Go to an ending...', act: () => pickFrom('Go to an ending', G.all('event').filter(e => e.ending).map(e => ({ label: e.id, value: e.id })), id => { if (sim) { campDev('ending', { ending: id }); D.toggle(false); G.goEnding(sim); } }) }];
    case 'Balance': {
      const out = [{ label: 'RESET ALL TO DEFAULTS', color: '#ffe080', act: () => { G.resetTune(); saveTune(); DU.toast('Every tunable is back to its default', '#7ae07a'); } }];
      let grp = null;
      for (const [k, [min, max, step, group, label]] of Object.entries(G.TUNE_RANGES)) {
        if (group !== grp) { grp = group; out.push({ label: '- ' + group + ' -', heading: true, disabled: 'A heading' }); }
        const v = G.tune[k], def = G.TUNE_DEFAULTS[k];
        out.push({ label, key: k, slider: true, min, max, step, value: (Math.abs(v) < 10 && step < 1 ? v.toFixed(2) : v) + (v !== def ? ' *' : ''), change: d => { G.setTune(k, Math.round((G.tune[k] + d * step * (D.hold > .8 ? 5 : 1)) / step) * step); saveTune(); markDev(); }, reset: () => { G.setTune(k, def); saveTune(); } });
      }
      return out;
    }
    case 'View': return [
      { label: 'Hex coordinates', value: D.coords ? 'ON' : 'off', act: () => { D.coords = !D.coords; } },
      { label: "The AI's danger map", value: inBattle() && B.danger ? 'ON' : 'off', act: () => { if (inBattle()) B.danger = !B.danger; } },
      { label: "The AI's top 3 plans for the selected unit", value: D.plans ? 'ON' : 'off', act: () => { D.plans = !D.plans; } },
      { label: 'Free camera (right stick / middle drag)', value: G.Camp.free ? 'ON' : 'off', act: () => { G.Camp.free = !G.Camp.free; } },
      { label: 'HUD', value: D.noHud ? 'off' : 'ON', act: () => { D.noHud = !D.noHud; } },
      { label: 'Weather', value: G.game.weather ? 'ON' : 'off', act: () => { if (G.game.weather) { D.savedWx = G.game.weather; G.game.weather = null; if (inBattle()) B.noWeather = true; } else { G.game.weather = D.savedWx || { kind: 'snow', amount: .5 }; if (inBattle()) B.noWeather = false; } } },
      { label: 'Time scale', value: G.game.timeScale.toFixed(2) + 'x', change: d => { const v = [.25, .5, 1, 2, 4, 8], i = v.indexOf(G.game.timeScale); G.game.timeScale = v[G.clamp((i < 0 ? 2 : i) + d, 0, v.length - 1)]; } },
      { label: 'Gallery of every species and move', act: () => { D.toggle(false); G.game.go('gallery'); } },
      { label: 'Frame-time readout', value: G.game.settings.showFps ? 'ON' : 'off', act: () => G.game.settings.set('showFps', !G.game.settings.showFps) }];
    case 'Info': {
      const s2 = inBattle() ? B.sim : camp();
      return [
        { label: 'Seed', value: s2 ? s2.s.seed || s2.s.rs : '-' }, { label: 'Build', value: G.VERSION + ' • ' + G.BUILD }, { label: 'State hash', value: s2 ? s2.hash() : '-' },
        { label: 'Errors', value: G.game.errors.length },
        { label: 'Last sim events', value: s2 && s2.s.log ? s2.s.log.slice(-6).join(' ') : (s2 ? s2.s.chronicle.slice(-1).map(c => c.text).join('') : '-') },
        { label: 'Copy report (E.diagnose)', act: () => { try { const rep = E.diagnose(); const txt = (rep && rep.text) || String(rep); if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {}); DU.toast('Report copied', '#7ae07a'); } catch (e) { DU.toast('Could not copy', DU.COL.bad); } } }];
    }
  }
  return [];
}
function levelSel(n) {
  const u = selUnit();
  if (u) { markDev(); const ev = []; for (let i = 0; i < n; i++) G.Battle.sim._levelUp(u, ev); G.Battle.queue(ev); return; }
  const sim = camp(); if (!sim) return;
  const c = sim.s.castles[G.Camp.focus], kid = c && c.knights[0]; if (kid) campDev('level', { knight: kid, n }); else DU.toast('Focus a castle with a knight', DU.COL.bad);
}
function revealMarches() {
  const sim = camp(); if (!sim) return;
  const copy = G.CampaignSim.load(sim.serialize()), out = [];
  for (const r of G.REALMS) if (!copy.isHuman(r) && copy.s.realms[r].alive && r !== 'brigands') G.CampaignAI.march(copy, r);
  for (const m of copy.s.marches) out.push(G.get('realm', m.realm).short + ' -> ' + (m.target === 'sanctum' ? 'Sanctum' : G.get('castle', m.target).name) + ' (' + m.knights.length + ')');
  D.sub = { title: 'The AI would march', rows: out.length ? out.map(l => ({ label: l })) : [{ label: 'No marches planned' }], list: new DU.List({ rows: 12 }) };
  markDev();
}
const saveTune = () => { try { E.store.set('brigantime:tune', G.tune); } catch (e) { /* storage blocked */ } };
G.loadTune = () => { try { const t = E.store.get('brigantime:tune', null); if (t) for (const k of Object.keys(G.TUNE_DEFAULTS)) if (typeof t[k] === 'number') G.tune[k] = t[k]; } catch (e) { /* storage blocked */ } };
D.update = dt => {
  const inp = G.inp();
  if (D.sub) { const res = D.sub.list.update(D.sub.rows); if (res === 'pick' && D.sub.list.sel && D.sub.list.sel.act) D.sub.list.sel.act(); else if (res === 'back') D.sub = null; return; }
  if (G.pressed('next')) { D.tab = (D.tab + 1) % TABS.length; D.list.index = 0; G.sfx('ui_move'); }
  if (G.pressed('prev')) { D.tab = (D.tab + TABS.length - 1) % TABS.length; D.list.index = 0; G.sfx('ui_move'); }
  const c = inp.clicked && inp.clicked(); if (c && D.tabs) { const i = D.tabs.findIndex(t => c[0] >= t.x && c[0] < t.x + t.w && c[1] >= t.y && c[1] < t.y + t.h); if (i >= 0) { D.tab = i; D.list.index = 0; return; } }
  const rs = rows(), row = rs[D.list.index];
  if (inp.down('left') || inp.down('right')) D.hold += dt; else D.hold = 0;
  if (row && row.change) { if (G.repeat('left')) row.change(-1); if (G.repeat('right')) row.change(1); }
  // the mouse drags a slider's bar
  if (row && row.slider && inp.down('confirm') && inp.lastDevice === 'mouse' && D.bar) { const p = inp.pointer(); if (p && p[1] >= D.bar.y - 3 && p[1] <= D.bar.y + 8) { const f = G.clamp((p[0] - D.bar.x) / D.bar.w, 0, 1); G.setTune(row.key, Math.round((row.min + f * (row.max - row.min)) / row.step) * row.step); saveTune(); markDev(); return; } }
  if (inp.pressed('info') && row && row.reset) { row.reset(); G.sfx('ui_cancel'); return; }
  const res = D.list.update(rs.map(r2 => ({ label: r2.label, right: r2.value === undefined ? '' : String(r2.value) })));
  if (res === 'pick' && row && row.act) { G.sfx('ui_confirm'); row.act(); }
  if (res === 'back') { D.toggle(false); G.sfx('ui_cancel'); }
};
D.draw = r => {
  r.overlay(g => {
    const k = DU.k(), W = r.W, H = r.H;
    DXP.rect(g, 0, 0, W, H, '#07060d');
    DU.text(g, 'DEV MODE', 8, 6, '#ff8a3a'); if (camp() && camp().s.dev) DU.text(g, 'campaign marked DEV', W - 8, 6, '#ff8a3a', { align: 'right' });
    D.tabs = TABS.map((t, i) => ({ x: 6 + i * Math.floor((W - 12) / TABS.length), y: 18, w: Math.floor((W - 12) / TABS.length) - 2, h: 12 * k }));
    TABS.forEach((t, i) => { const tb = D.tabs[i]; DXP.rect(g, tb.x, tb.y, tb.w, tb.h, i === D.tab ? '#2e3a78' : '#1a1e40'); DU.text(g, t, tb.x + tb.w / 2, tb.y + 2, i === D.tab ? DU.COL.focus : '#c8c8d8', { align: 'center' }); });
    const rs = rows(), y0 = 36 * k;
    D.list.layout(rs.map(r2 => ({ label: r2.label, right: r2.value === undefined ? (r2.act ? '>' : '') : String(r2.value), color: r2.color || (r2.heading ? '#8a86a0' : null), disabled: false })), 12, y0, W - 24);
    D.list.draw(g, G.game.real);
    const row = rs[D.list.index];
    if (row && row.slider) { const bw = 120 * k, bx = W - 24 - bw - 70 * k, it = D.list.items[D.list.index - D.list.top]; if (it) { D.bar = { x: bx, y: it.y + 2, w: bw }; DU.bar(g, bx, it.y + 2, bw, 6, (G.tune[row.key] - row.min) / (row.max - row.min), '#ff8a3a'); } }
    if (D.sub) { const w = 220 * k, x = Math.round((W - w) / 2); D.sub.list.layout(D.sub.rows, x + 6, 50, w - 12); DU.box(g, x, 34, w, D.sub.list.h + 24, { alpha: .98 }); DU.text(g, D.sub.title, x + 6, 38, DU.COL.gold); D.sub.list.draw(g, G.game.real); }
  });
  DU.prompts(r, [['next', 'Tab'], ['up', 'Choose'], ['left', 'Adjust'], ['info', 'Reset one'], ['confirm', 'Select'], ['cancel', 'Close']]);
};
/** dev overlays in the battle: hex coordinates and the AI's top plans */
D.battleOverlay = r => {
  const B = G.Battle; if (!B.sim) return;
  if (D.coords) r.overlay(g => { for (let y = 0; y < B.sim.s.h; y++) for (let x = 0; x < B.sim.s.w; x++) { const [wx, wy] = B.field.center([x, y]), q = r.w(wx, wy, 0); E.font.text(g, x + ',' + y, q[0], q[1] - 3, '#ffffff', { font: 'tiny', align: 'center' }); } });
  if (D.plans) { const u = selUnit(); if (u && B.sim.activeTroop() && u.troop === B.sim.activeTroop().id) { const p = G.BattleAI.planUnit(B.sim, u, { level: 'normal' }); r.overlay(g => DU.text(g, 'AI: ' + (p.move ? 'move ' + p.move.join(',') + ' then ' : '') + (p.act.a ? p.act.a + ' at ' + p.act.at.join(',') : p.act) + ' (' + Math.round(p.score) + ')', 8, 44, '#ff8a3a')); } }
};

/* ---- the gallery: every species x form x action, and every class's moves ---- */
const GL = { t: 0, i: 0 };
G.SCENES.gallery = {
  view: 'board', input: G.PRESET, camera: { zoom: [.6, 2.5], start: .8 },
  enter() {
    GL.t = 0; GL.items = [];
    for (const m of G.all('monster')) for (let f = 1; f <= 3; f++) GL.items.push({ label: G.monsterName(m.id, f), vis: new G.Vis({ kind: 'monster', sp: m.id, form: f }) });
    for (const k of G.all('knight')) GL.items.push({ label: k.short + ' (' + G.get('class', k.cls).name + ')', vis: new G.Vis({ kind: 'knight', ref: k.id, cls: k.cls }) });
    GL.page = 0; G.game.lights.enabled = true; G.game.lights.ambient = .85; G.game.cam.bounds = null;
    GL.map = new E.TileMap({ w: 30, h: 12, floorTex: (x, y) => E.tex.grass(x, y), ao: 0 });
  },
  update(dt) {
    G.inputTick(dt); GL.t += dt;
    if (G.repeat('right') || G.pressed('next')) GL.page = Math.min(Math.ceil(GL.items.length / 6) - 1, GL.page + 1);
    if (G.repeat('left') || G.pressed('prev')) GL.page = Math.max(0, GL.page - 1);
    if (G.inp().pressed('cancel')) G.game.go('title');
    const acts = ['bite', 'claw', 'breath', 'roar', 'pounce', 'tailsweep', 'slash', 'cast', 'overhead', 'thrust'];
    GL.items.slice(GL.page * 6, GL.page * 6 + 6).forEach((it, i) => { const k = (GL.t * .6 + i * .17) % 2, act = k < 1 ? { move: it.vis.kind === 'humanoid' ? it.vis.moves.basic : acts[Math.floor(GL.t / 2 + i) % 6], k } : null; it.vis.update(dt, { x: 60 + (i % 3) * 120, y: 60 + Math.floor(i / 3) * 80, z: 0, vx: k > 1.4 ? 30 : 0, vy: 0, facing: Math.PI / 2 + Math.sin(GL.t * .4) * 1.2, act }); });
    G.game.focus(180, 100, 20);
  },
  draw(r) {
    GL.map.drawFloor(r);
    GL.items.slice(GL.page * 6, GL.page * 6 + 6).forEach((it, i) => { const x = 60 + (i % 3) * 120, y = 60 + Math.floor(i / 3) * 80; r.shadow(x, y, 8); r.actor(x, y, 0, (g, ox, oy) => it.vis.draw(g, ox, oy, r.view)); r.textAt(x, y + 14, 0, it.label, '#ffffff'); });
    r.overlay(g => DU.text(g, 'GALLERY ' + (GL.page + 1) + '/' + Math.ceil(GL.items.length / 6), 8, 6, '#ff8a3a'));
    DU.prompts(r, [['left', 'Page'], ['cancel', 'Title']]);
  }
};

}

// ===== src/80-net-hub.js =====
{
// AI HUB (Session Protocol v1, shared world): "Banners of the Wheel" for 2 to 4 players. The host's BattleSim is the
// authority. Every command it applies (its own player's, a client's, or the AI's at a deadline) goes to every copy as
// { t: 'ev', n, cmd }; the sim is deterministic, so each copy applies the same commands in the same order and animates
// the events it gets. Snapshots ({ t: 'snap', n, state }) go out at each bell's start and on request ('need'). Clients
// send only their own troop's commands ('cmd') and their cursor ('cur', unreliable, at most 4 a second). A troop's turn
// lasts 15 s on AIHub.time(); then the host plays the rest with the battle AI (AUTO). The driver runs on its own
// setInterval(50), outside the engine's pausable update, so a pause menu never stalls the host.

const NH = G.hub = { active: false, info: null };
G.SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const HUB = () => (typeof window !== 'undefined' && window.AIHub) || null;
NH.isSession = () => { const h = HUB(); return !!(h && h.active); };

/** connect at boot (in a session): build the round and wait for its start */
NH.begin = async () => {
  const H = HUB(); if (!H || !H.active) return false;
  NH.active = true;
  if (G.detectTouchOnly() && !G.forceTouchOnly) { try { H.fail('Controller or keyboard required'); } catch (e) { /* the hub is gone */ } }
  let info = null;
  try { info = await H.connect({ mode: 'shared-world', seats: [2, 4] }); } catch (e) { info = null; }
  if (!info) { NH.active = false; G.game.go('title'); return false; }
  NH.info = info; NH.isHost = !!info.isHost; NH.server = !!info.server; NH.me = info.me;
  NH.players = info.players.slice();
  // seats: with two players, the NE and SW corners; else seat i takes realm i
  const n = NH.players.length, seats = n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n);
  NH.seatOf = {}; NH.players.forEach((p, i) => { NH.seatOf[p.id] = seats[i]; });
  const rng = H.rng('battle'), seed = Math.floor(rng() * 1e9) + 1;
  const sides = NH.players.map((p, i) => ({ realm: G.SEAT_REALM[seats[i]], ctl: 'human', level: 10 }));
  const spec = G.skirmishSpec({ map: 'wheel_shrine', season: 'wheel', sides, seed });
  spec.sides.forEach((sd, i) => { sd.seat = seats[i]; sd.color = G.SEAT_COLORS[i] || sd.color; sd.name = String(NH.players[i].name || 'P' + (i + 1)).slice(0, 12); sd.human = true; });
  NH.sideOfPlayer = {}; NH.players.forEach((p, i) => { NH.sideOfPlayer[p.id] = i; });
  NH.mySide = NH.server ? -1 : NH.sideOfPlayer[NH.me];
  NH.n = 0; NH.q = []; NH.cursors = {}; NH.lastCur = 0; NH.deadline = null; NH.auto = {}; NH.over = false; NH.ended = false; NH.started = false; NH.left = {};
  NH.sim = G.BattleSim.create(spec);
  NH.ctx = {
    kind: 'hub', region: 'hour', playerSide: NH.mySide < 0 ? undefined : NH.mySide, speed: 2,
    sides: spec.sides.map((sd, i) => (i === NH.mySide ? 'human' : 'remote')),
    names: spec.sides.map(sd => sd.name),
    net: NH.net, onEnd: () => NH.roundOver()
  };
  // messages, leaving, time-up, the end
  H.on('message', (data, from) => NH.receive(data, from));
  H.on('leave', ({ id }) => NH.leave(id));
  H.on('time-up', () => { if (NH.isHost) NH.finish('time-up'); });
  H.on('end', ({ reason, standings }) => NH.end(reason, standings));
  H.on('start', () => { NH.started = true; });
  G.game.go('battle', { spec, sim: NH.sim, ctx: NH.ctx }, { fade: 0 });
  NH.timer = setInterval(() => { try { NH.tick(); } catch (e) { G.game.fail('hub', e); } }, 50);
  H.ready();
  return true;
};
/** the scene's network hooks */
NH.net = {
  get isHost() { return NH.isHost; },
  get cursors() { return NH.cursors; },
  /** a local player's command: the host applies it; a client sends it */
  send(cmd) { const H = HUB(); if (!H || NH.over) return; H.send({ t: 'cmd', seq: (NH.seq = (NH.seq || 0) + 1), cmd }, { to: NH.info.host }); },
  /** the host applied a command: broadcast it, and the turn's deadline */
  applied(cmd, ev) {
    if (!NH.isHost) return;
    NH.n++; HUB().send({ t: 'ev', n: NH.n, cmd });
    for (const e of ev) {
      if (e.e === 'bell') NH.snap();
      if (e.e === 'turn') { const tr = NH.sim.troop(e.troop); NH.deadline = HUB().time() + (G.TUNE_DEFAULTS.hubTurnSeconds * 1000); HUB().send({ t: 'turn', n: NH.n, seat: tr.side, troop: e.troop, deadline: NH.deadline }); }
    }
    if (NH.sim.s.over && !NH.over) NH.finish('over');
  },
  tick() {}
};
/** the battle may play only once the round has started (AIHub.time() >= 0) */
NH.waiting = () => { const H = HUB(); return NH.active && (!H || !(H.time() >= 0)); };
NH.snap = () => { if (NH.isHost) HUB().send({ t: 'snap', n: NH.n, state: NH.sim.serialize() }); };
NH.receive = (m, from) => {
  if (!m || typeof m !== 'object' || NH.ended) return;
  if (NH.isHost) {
    if (m.t === 'cmd') {
      const side = NH.sideOfPlayer[from], tr = NH.sim.activeTroop();
      if (!tr || tr.side !== side || NH.auto[tr.id] || !NH.sim.legal(m.cmd) || !['move', 'undo', 'act', 'guard', 'wait', 'retreat', 'end'].includes(m.cmd.t)) { HUB().send({ t: 'snap', n: NH.n, state: NH.sim.serialize() }, { to: from }); return; }
      const ev = NH.sim.apply(m.cmd); G.Battle.queue(ev); NH.net.applied(m.cmd, ev);
    } else if (m.t === 'need') HUB().send({ t: 'snap', n: NH.n, state: NH.sim.serialize() }, { to: from });
    else if (m.t === 'cur' && Array.isArray(m.cell)) { NH.cursors[NH.seatOfSide(NH.sideOfPlayer[from])] = m.cell; HUB().send({ t: 'cur', seat: NH.seatOfSide(NH.sideOfPlayer[from]), cell: m.cell }, { reliable: false }); }
    return;
  }
  if (from !== NH.info.host) return;
  if (m.t === 'ev') { NH.q.push(m); NH.q.sort((a, b) => a.n - b.n); NH.drain(); }
  else if (m.t === 'snap') {
    if (m.n >= NH.n) { const cur = NH.sim.serialize(); if (cur !== m.state) { const st = JSON.parse(m.state); Object.keys(NH.sim.s).forEach(k => delete NH.sim.s[k]); Object.assign(NH.sim.s, st); NH.sim.dirty(); G.Battle.q = []; } NH.n = m.n; NH.q = NH.q.filter(x => x.n > NH.n); NH.drain(); }
  }
  else if (m.t === 'turn') NH.deadline = m.deadline;
  else if (m.t === 'cur' && m.seat !== NH.seatOfSide(NH.mySide)) NH.cursors[m.seat] = m.cell;
  else if (m.t === 'over') { NH.over = true; NH.standings = m.standings; NH.glory = m.glory; }
};
NH.seatOfSide = side => (NH.sim && NH.sim.s.sides[side] ? NH.sim.s.sides[side].seat : side);
/** a client applies the host's commands strictly in order; a gap asks for a snapshot */
NH.drain = () => {
  while (NH.q.length && NH.q[0].n === NH.n + 1) { const m = NH.q.shift(); NH.n = m.n; const ev = NH.sim.apply(m.cmd); G.Battle.queue(ev); }
  if (NH.q.length && NH.q[0].n > NH.n + 1 && !NH.asked) { NH.asked = true; HUB().send({ t: 'need', n: NH.n }); setTimeout(() => { NH.asked = false; }, 1500); }
};
/** every 50 ms: deadlines (host), the cursor (clients), heartbeats */
NH.tick = () => {
  const H = HUB(); if (!H || NH.ended) return;
  // Create + Options belong to the hub
  if (G.game.input.down('create')) G.game.input.suppress('pause');
  if (!(H.time() >= 0)) return;
  if (NH.isHost && !NH.over) {
    const tr = NH.sim.activeTroop();
    if (tr && NH.deadline === null) { NH.deadline = H.time() + G.TUNE_DEFAULTS.hubTurnSeconds * 1000; H.send({ t: 'turn', n: NH.n, seat: tr.side, troop: tr.id, deadline: NH.deadline }); NH.snap(); }
    if (tr && !NH.auto[tr.id] && NH.deadline !== null && H.time() > NH.deadline) { NH.auto[tr.id] = true; G.Battle.delegated[tr.id] = true; G.UI.toast((NH.sim.s.sides[tr.side].name || 'A player') + ': AUTO', '#ffd060'); }
    if (tr && G.Battle.delegated[tr.id] && G.game.sceneName === 'battle') { /* the scene's AI plays it, at its own pace */ }
  }
  const now = performance.now();
  if (!NH.isHost && !NH.server && now - NH.lastCur > 260) {
    const c = G.Battle.cursor; const key = c ? c.join(',') : '';
    if (key !== NH.lastKey || now - NH.lastCur > 2000) { NH.lastKey = key; NH.lastCur = now; H.send({ t: 'cur', seat: NH.seatOfSide(NH.mySide), cell: c || [0, 0] }, { reliable: false }); }
  }
  if (NH.isHost && now - (NH.lastSnap || 0) > 3000) { NH.lastSnap = now; NH.snap(); }
};
NH.leave = id => {
  NH.left[id] = true;
  if (!NH.isHost || NH.over) return;
  const side = NH.sideOfPlayer[id]; if (side === undefined) return;
  const tr = NH.sim.s.troops.find(t => t.side === side && !t.gone);
  if (tr) { const k = NH.sim.unit(tr.knight); if (NH.sim.activeTroop() && NH.sim.activeTroop().id === tr.id) { const ev = NH.sim.apply({ t: 'retreat', u: k.id }); G.Battle.queue(ev); NH.net.applied({ t: 'retreat', u: k.id }, ev); } else { NH.auto[tr.id] = true; G.Battle.delegated[tr.id] = true; } }
  const remaining = NH.players.filter(p => !NH.left[p.id]);
  if (remaining.length < 2) NH.finish('leave');
};
/** the host ends the round: standings by glory (ties share a place), scores, stats, awards */
NH.finish = why => {
  if (!NH.isHost || NH.finished) return; NH.finished = true; NH.over = true;
  const s = NH.sim.s, ids = NH.players.filter(p => !NH.left[p.id]).map(p => p.id);
  const glory = {}, stats = {}; for (const p of NH.players) { const sd = NH.sideOfPlayer[p.id]; glory[p.id] = Math.floor(s.glory[sd] || 0); stats[p.id] = { damage: s.stats[sd].damage, kos: s.stats[sd].kos, shrine: s.stats[sd].shrine }; }
  const ranked = ids.slice().sort((a, b) => glory[b] - glory[a] || a - b), standings = [];
  for (const id of ranked) { const last = standings[standings.length - 1]; if (last && glory[last[0]] === glory[id]) last.push(id); else standings.push([id]); }
  const best = (f) => ids.slice().sort((a, b) => stats[b][f] - stats[a][f] || a - b)[0];
  const standing = ids.filter(id => { const sd = NH.sideOfPlayer[id]; return NH.sim.sideKnights(sd).length > 0; });
  const awards = [{ id: best('shrine'), title: 'Shrine Keeper', detail: 'Held the Hour Shrine longest' }, { id: best('kos'), title: 'Giant Slayer', detail: 'The most foes routed' }];
  if (standing.length === 1) awards.push({ id: standing[0], title: 'Last Standing', detail: 'The last banner on the field' });
  NH.standings = standings; NH.glory = glory;
  try { HUB().send({ t: 'over', standings, glory }); HUB().finish({ standings, scores: glory, stats, awards }); } catch (e) { G.game.fail('hub finish', e); }
};
NH.end = (reason, standings) => {
  NH.ended = true; NH.over = true; NH.endReason = reason; if (standings) NH.standings = standings;
  clearInterval(NH.timer);
  try { G.game.audio.stopMusic(.1); G.game.audio.mute(true); } catch (e) { /* no sound */ }
  G.muteAll = true;
  G.game.go('hubOver', {}, { fade: .3 });
};
NH.roundOver = () => { if (NH.isHost) NH.finish('over'); G.game.go('hubOver', {}, { fade: .3 }); };
/** the round is over: the standings until the hub removes the game */
G.SCENES.hubOver = {
  view: 'threequarter', input: G.PRESET,
  update() { G.game.input.consumeAll(); },
  draw(r) {
    r.sky(['#0a0814', '#1a1430', '#2a2050']);
    r.overlay(g => {
      const k = G.UI.k(), W = r.W;
      G.UI.title(g, 'ROUND OVER', W / 2, 20, { scale: 3 });
      const st = NH.standings || [], gl = NH.glory || {};
      let y = 64; st.forEach((ids, place) => ids.forEach(id => { const p = NH.players.find(q => q.id === id); const sd = NH.sideOfPlayer[id]; G.UI.text(g, (place + 1) + '. ' + (p ? String(p.name).slice(0, 14) : 'P' + id) + (id === NH.me ? ' (you)' : '') + '  ' + (gl[id] || 0) + ' glory', W / 2, y, G.SEAT_COLORS[NH.seatOfSide(sd)] || '#ffffff', { align: 'center' }); y += 14 * k; }));
      if (!st.length) G.UI.text(g, NH.endReason === 'host-left' ? 'The host left: the round is void.' : 'Waiting for the results...', W / 2, 70, '#e8e4f0', { align: 'center' });
    });
  }
};

/** while the session connects: the boot screen's look, no prompts */
G.SCENES.hubWait = {
  view: 'threequarter', input: G.PRESET,
  update() {},
  draw(r) { r.sky(['#0a0814', '#1a1430', '#2a2050']); r.overlay(g => { E.font.title(g, 'BRIGANTIME', r.W / 2, r.H / 2 - 30, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10', align: 'center' }); G.UI.text(g, 'Banners of the Wheel: joining the round...', r.W / 2, r.H / 2 + 10, '#e8e4f0', { align: 'center' }); }); }
};

}

// ===== src/81-local-mp.js =====
{
// LOCAL PLAY: hot-seat seats (each human realm or side reads its own controller, or every input when shared), the
// optional hot-seat turn timer (Settings: Off, 60 s, 30 s), which hands a troop to the AI when its time runs out, and
// the privacy cards between humans (in the campaign scene).

const LM = G.LocalMP = { clock: 0, troop: null };
/** seconds a human troop may take, or 0 (Off) */
LM.limit = () => ({ '60 s': 60, '30 s': 30 }[(G.game.settings && G.game.settings.hotseatTimer) || 'Off'] || 0);
/** call each step of a human troop's turn in battle; returns seconds left, or null without a timer */
LM.tick = (dt, B) => {
  const lim = LM.limit(), humans = B.ctx.sides.filter(s => s === 'human').length;
  if (!lim || humans < 2 || B.ctx.kind === 'hub') return null;
  const tr = B.sim.activeTroop(); if (!tr) return null;
  if (LM.troop !== tr.id + ':' + B.sim.s.bell) { LM.troop = tr.id + ':' + B.sim.s.bell; LM.clock = 0; }
  LM.clock += dt; const left = lim - LM.clock;
  if (left <= 0) { B.delegated[tr.id] = 'turn'; G.UI.toast('Time! The AI finishes this troop\'s turn.', '#ffd060'); LM.clock = -1e9; }
  else if (left < 5 && Math.floor(left) !== Math.floor(left + dt)) G.sfx('timer_tick');
  return Math.max(0, left);
};
/** a troop delegated by the timer plays only that turn */
LM.turnEnded = (B, troop) => { if (B.delegated[troop] === 'turn') delete B.delegated[troop]; };

}

// ===== src/90-main.js =====
{
// MAIN: the game, its settings and saves, the pause menu's items, the boot steps, the scenes (each wrapped so dev mode
// can open over it), the deep links (#title #attract #campaign/<realm> #battle/<map>/<season>/<preset> #event/<id>
// #ending/<id> #about #help #gallery #skirmish), game.debug for tests and tools, and the AI Hub session start.

const session = G.hub.isSession();
const SETTINGS = [
  { key: 'battleAnim', label: 'Battle animations', options: ['Full', 'Fast', 'Minimal'], value: 'Full' },
  { key: 'battleCam', label: 'Battle camera', options: ['Dynamic', 'Fixed'], value: 'Dynamic' },
  { key: 'battleView', label: 'Battle view', options: ['Board', 'Isometric'], value: 'Board' },
  { key: 'grid', label: 'Grid lines', options: ['Subtle', 'Bold', 'Off'], value: 'Subtle' },
  { key: 'tips', label: 'Tutorial tips', options: ['On', 'Off'], value: 'On' },
  { key: 'textSpeed', label: 'Text speed', options: ['Normal', 'Slow', 'Fast', 'Instant'], value: 'Normal' },
  { key: 'voices', label: 'Voices', options: ['On', 'Off'], value: 'On' },
  { key: 'uiScale', label: 'UI scale', options: ['Normal', 'Large'], value: 'Normal' },
  { key: 'edgePan', label: 'Edge panning (mouse)', options: ['Off', 'On'], value: 'Off' },
  { key: 'aiBattles', label: 'Battles between AI realms', options: ['Show result', 'Skip'], value: 'Show result' },
  { key: 'confirmEnd', label: 'Confirm before ending a turn', options: ['On', 'Off'], value: 'On' },
  { key: 'hotseatTimer', label: 'Hot-seat turn timer', options: ['Off', '60 s', '30 s'], value: 'Off' },
  { key: 'privacy', label: 'Hot-seat privacy cards', options: ['On', 'Off'], value: 'On' }
];
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['board', 'iso'], input: G.PRESET, bg: '#07060d', id: 'brigantime',
  autoPause: !session,
  menu: {
    items: () => [
      ['How to Play', () => { G.lastPlayScene = game.sceneName; game.resume(); game.go('help', { back: 'pause' }); }],
      !session && ['Dev Mode', () => { G.Dev.toggle(true); }],
      ['About & Credits', () => { G.lastPlayScene = game.sceneName; game.resume(); game.go('about', { back: 'pause' }); }]
    ].filter(Boolean),
    settings: SETTINGS.map(s => Object.assign({ group: 'Game' }, s)),
    controls: G.CONTROL_NAMES,
    quit: session ? false : 'title',
    saves: session ? false : { slots: 3, version: 2, migrate: (data, from) => G.migrateSave(data, from) }
  }
});
G.game = game;
if (game.input) game.input.glyphs = 'playstation';
try { const sg = game.settings && game.settings.glyphs; if (sg && sg !== 'auto') game.input.glyphs = sg; } catch (e) { /* defaults */ }

/* ---- saves: { v, campaign, seats, story } ---- */
G.saveData = () => {
  const sim = G.Camp.sim; if (!sim) return null;
  const r = sim.currentHuman() || sim.s.humans[0];
  return { data: { v: 2, campaign: sim.serialize(), seats: G.seats || {}, meta: { realms: sim.s.humans, season: sim.season, year: sim.year } }, place: G.get('realm', r).short + ' • ' + G.SEASON_NAME[sim.season] + ' Y' + sim.year + (sim.s.dev ? ' (DEV)' : ''), level: sim.year };
};
G.migrateSave = (data, from) => { if (from < 2 && data && data.campaign && !data.meta) data.meta = { realms: [], season: 'spring', year: 1 }; return data; };
G.autosave = () => { if (session || !game.saves || !G.Camp.sim) return; try { const d = G.saveData(); if (d) game.saves.save('auto', d); } catch (e) { game.fail('autosave', e); } };
G.loadLatest = () => { const s = game.saves && game.saves.latest(); if (s) game.saves.load(s.slot); };
if (!session && game.saves) {
  game.saves.write = () => G.saveData();
  game.saves.read = save => { const d = save.data; const sim = G.CampaignSim.load(d.campaign); G.seats = d.seats || {}; if (sim.s.phase === 'resolve' && sim.s.pending) sim.s.queue.unshift(sim.s.pending.march); G.startCampaign(sim, { loaded: true }); };
  game.saves.canSave = false;
}

/* ---- data validation (boot): every reference resolves ---- */
G.validate = () => {
  const bad = [], need = (kind, id, where) => { if (!G.has(kind, id)) bad.push(where + ': no ' + kind + ' "' + id + '"'); };
  for (const c of G.all('castle')) { for (const e of c.circle) need('monster', e.sp, 'castle ' + c.id); need('site', c.site, 'castle ' + c.id); need('item', c.treasury, 'castle ' + c.id); need('map', c.map, 'castle ' + c.id); for (const r of c.roads) need('castle', r, 'road ' + c.id); }
  for (const k of G.all('knight')) { need('class', k.cls, 'knight ' + k.id); for (const [sp] of k.troop) need('monster', sp, 'knight ' + k.id); if (k.castle) need('castle', k.castle, 'knight ' + k.id); }
  for (const c of G.all('class')) { for (const [s] of c.skills) need('skill', s, 'class ' + c.id); if (c.next) need('class', c.next, 'class ' + c.id); }
  for (const m of G.all('monster')) for (const t of m.skills) for (const s of t) need('skill', s, 'monster ' + m.id);
  for (const s of G.all('site')) need('castle', s.castle, 'site ' + s.id);
  for (const r of Object.values(G.POOLS)) { for (const i of r.items) need('item', i, 'pool'); for (const b of r.beasts) need('monster', b, 'pool'); for (const w of r.wanderers) need('knight', w, 'pool'); }
  for (const e of G.all('event')) for (const l of e.lines) { const sp = l[0]; if (!['narrator', 'ruler', 'knight', 'herald', 'keeper'].includes(sp)) need('knight', sp, 'event ' + e.id); }
  if (bad.length) throw new Error('Bad data: ' + bad.slice(0, 5).join('; '));
  return true;
};

/* ---- scenes: each wrapped so dev mode can open over it ---- */
const scenes = {};
for (const [id, sc] of Object.entries(G.SCENES)) {
  scenes[id] = Object.assign({}, sc, {
    touch: [],
    update(dt) { if (G.Dev.open) { G.inputTick(dt); G.Dev.update(dt); return; } if (game.input.down('create')) game.input.suppress('pause'); return sc.update.call(sc, dt); },
    draw(r) { sc.draw.call(sc, r); if (G.Dev.open) G.Dev.draw(r); },
    enter(d) { G.In.seatInput = null; if (sc.enter) sc.enter.call(sc, d); },
    exit() { if (sc.exit) sc.exit.call(sc); },
    back: sc.back ? function () { return sc.back.call(sc); } : undefined
  });
}
/** a battle spec for dev links and tests: map, season, preset ('duel' | 'siege' | 'sanctum' | 'shrine') */
G.devBattleSpec = (map = 'river_ford', season = 'spring', preset = 'siege') => {
  if (preset === 'sanctum' || map === 'clockwork_sanctum') {
    const s = { seed: 3, map: 'clockwork_sanctum', season, mode: 'sanctum', sides: [{ realm: 'verdance', role: 'att', human: true, items: { herb: 2 }, troops: ['gareth', 'lynette', 'wren'].map(id => G.troopAt(id, 20, { realm: 'verdance' })) }, { realm: 'dominion', role: 'def', troops: [G.CampaignSim.prototype._grayKnightTroop.call(null)] }] };
    return { spec: s, ctx: { kind: 'dev', region: 'hour', sides: ['human', 'ai'], playerSide: 0, onEnd: () => game.go('title') } };
  }
  if (preset === 'shrine' || map === 'wheel_shrine') { const spec = G.skirmishSpec({ map: 'wheel_shrine', season: 'wheel', sides: [{ realm: 'verdance', ctl: 'human', level: 10 }, { realm: 'solmark', ctl: 'normal', level: 10 }, { realm: 'amberlyn', ctl: 'normal', level: 10 }, { realm: 'hoarfast', ctl: 'normal', level: 10 }] }); return { spec, ctx: { kind: 'dev', region: 'hour', sides: ['human', 'ai', 'ai', 'ai'], playerSide: 0, onEnd: () => game.go('title') } }; }
  const spec = G.skirmishSpec({ map, season, sides: [{ realm: 'solmark', ctl: preset === 'ai' ? 'normal' : 'human', level: 8 }, { realm: 'hoarfast', ctl: 'normal', level: 8 }], seed: 4 });
  return { spec, ctx: { kind: 'dev', region: G.get('map', map).hour ? 'hour' : season, sides: [preset === 'ai' ? 'ai' : 'human', 'ai'], playerSide: 0, onEnd: () => game.go('title') } };
};
/** the deep link's scene and data */
function deepLink() {
  if (session) return null;
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1); if (!h) return null;
  const [a, b, c, d] = h.split('/');
  switch (a) {
    case 'title': return ['title'];
    case 'attract': G.Attract.on = true; return ['attract', {}];
    case 'campaign': { const sim = G.CampaignSim.create({ seed: 7, humans: [G.PLAYABLE.includes(b) ? b : 'verdance'] }); G.Camp.sim = sim; G.fastStory = c === 'fast'; return ['campaign', { fresh: true }]; }
    case 'battle': return ['battle', G.devBattleSpec(b || 'river_ford', c || 'spring', d || 'siege')];
    case 'event': { const sim = G.CampaignSim.create({ seed: 7, humans: ['verdance'] }); return ['event', { id: G.has('event', b) ? b : 'open_verdance', realm: 'verdance', sim, onDone: () => game.go('title') }]; }
    case 'ending': { const sim = G.CampaignSim.create({ seed: 7, humans: ['verdance'] }); const id = G.has('event', b) ? b : 'ending_verdance'; sim.s.result = { kind: id.startsWith('ending_wheel') || id === 'ending_candle' || id === 'ending_fallen' ? 'lose' : 'win', ending: id, realm: id.replace('ending_', '').replace('wheel_', '') }; if (!G.PLAYABLE.includes(sim.s.result.realm)) sim.s.result.realm = 'verdance'; return ['event', { id, realm: sim.s.result.realm, sim, onDone: () => game.go('ending', { sim, bad: sim.s.result.kind !== 'win', title: G.get('event', id).title }) }]; }
    case 'about': return ['about', { back: 'title' }];
    case 'help': return ['help', { back: 'title' }];
    case 'gallery': return ['gallery'];
    case 'skirmish': return ['skirmishSetup', {}];
  }
  return null;
}

/* ---- game.debug: the handle tests and tools read ---- */
game.debug = {
  snapshot() {
    const B = G.Battle, C2 = G.Camp, sim = C2.sim, bs = game.sceneName === 'battle' && B.sim;
    return {
      scene: game.sceneName, phase: sim ? sim.s.phase : null, season: sim ? sim.season : null, year: sim ? sim.year : null, candle: sim ? sim.s.candle : null,
      realm: sim ? sim.currentHuman() : null, mana: sim && sim.currentHuman() ? sim.s.realms[sim.currentHuman()].mana : null, focus: C2.focus, panel: C2.panel ? true : null,
      prompts: G.lastPrompts || [], result: sim && sim.s.result,
      battle: bs ? { map: bs.s.map, bell: bs.s.bell, troop: bs.s.active, mode: B.mode, cursor: B.cursor, over: bs.s.over, units: bs.units.map(u => [u.id, u.side, u.cx, u.cy, u.hp, u.mp, bs.onField(u) ? 'on' : u.dead ? 'dead' : 'off']) } : null,
      event: G.Talk.open ? (G.Talk.cur && G.Talk.cur.line.text) : null, touchOnly: G.In.touchOnly, attract: { on: G.Attract.on, beat: G.Attract.beat }, dev: G.Dev.open, idle: G.In.idle,
      errors: game.errors.map(e => e.message || String(e))
    };
  },
  newCampaign(o = {}) { const sim = G.CampaignSim.create(Object.assign({ seed: 7, humans: ['verdance'], difficulty: 'normal' }, o)); G.startCampaign(sim); return sim; },
  startBattle(d) { game.go('battle', d || G.devBattleSpec()); },
  sim() { return game.sceneName === 'battle' ? G.Battle.sim : G.Camp.sim; },
  cmd(c) { return game.sceneName === 'battle' ? G.Battle.apply(c) : G.Camp.sim.apply(c); },
  autoplay(on = true) { G.autoplayOn = on; },
  setTune: (k, v) => G.setTune(k, v), resetTune: () => G.resetTune(),
  trigger(id) { G.Camp.sim.apply({ t: 'dev', op: 'trigger', id }); G.Camp.todo.unshift({ k: 'takeStory' }); },
  jump(turn) { G.Camp.sim.apply({ t: 'dev', op: 'jump', turn }); },
  hash() { const s = this.sim(); return s ? s.hash() : null; },
  G
};

/* ---- boot ---- */
const steps = [
  ['Winding the Great Clock', () => { G.validate(); }],
  ['Teaching wyverns to sit', () => { for (const s of ['blossom', 'sun', 'oak', 'snowflake', 'hourglass', 'axes']) G.sigil(s, '#ffffff'); for (const e of ['spring', 'summer', 'autumn', 'winter', 'hour', 'none']) G.elemIcon(e); }],
  ['Counting the bells', () => { G.defineSfx(); G.loadTune(); G.UI.loadTips(); }],
  ['Sweeping the cross-quarter roads', () => { G.Camp.wm = new G.WorldMap(); }],
  ['Waking the beasts', () => { for (const r of G.PLAYABLE) G.knightVis(G.get('realm', r).ruler); }]
];
const link = deepLink();
game.start({ scenes, scene: link ? link[0] : session ? 'hubWait' : 'title', data: link ? link[1] : undefined, boot: { title: 'BRIGANTIME', version: G.VERSION, steps, messages: ['Winding the Great Clock', 'Teaching wyverns to sit', 'Counting the bells', 'Sweeping the cross-quarter roads'] } });
if (link && link[1] && game.sceneName === link[0] && scenes[link[0]].enter) { /* the engine passes data on start */ }
if (session) Promise.resolve(game.booted).then(() => G.hub.begin()).catch(e => game.fail('hub', e));

}

})();
