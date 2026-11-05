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
