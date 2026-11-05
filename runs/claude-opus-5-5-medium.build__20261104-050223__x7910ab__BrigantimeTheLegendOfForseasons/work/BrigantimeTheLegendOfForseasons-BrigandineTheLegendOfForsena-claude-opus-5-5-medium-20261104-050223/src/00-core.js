/* BRIGANTIME: THE LEGEND OF FORSEASONS
 * Core loop: each season, read the tidings, muster your castles (summon, bind, move, quest, equip, promote), declare your
 * marches, then fight the battles they cause, growing knights and monsters until you can take Meridian and defeat the
 * Gray Knight before the Hour-Candle burns out.
 * Layers: data registries (G.def) -> pure simulations (G.BattleSim, G.CampaignSim: JSON state, seeded G.Rng, commands in,
 * events out) -> presentation (engine scenes play the events). AI turns sim state into commands. */
const { px, clamp, lerp } = E;
G.VERSION = '1.0.0';
G.BUILD = '2026-11-04';

/* ---- registries: every content item is registered once and read by id ---- */
G.reg = {};
G.def = (kind, id, spec) => { (G.reg[kind] = G.reg[kind] || {})[id] = Object.assign({ id }, spec); return G.reg[kind][id]; };
G.get = (kind, id) => { const r = G.reg[kind] && G.reg[kind][id]; if (!r) throw new Error('unknown ' + kind + ': ' + id); return r; };
G.has = (kind, id) => !!(G.reg[kind] && G.reg[kind][id]);
G.all = kind => Object.values(G.reg[kind] || {});

/* ---- a seeded generator whose state lives in plain JSON (mulberry32) ---- */
G.Rng = {
  next(st) { st.s = (st.s + 0x6d2b79f5) >>> 0; let t = st.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
  int(st, a, b) { return a + Math.floor(G.Rng.next(st) * (b - a + 1)); },
  pick(st, list) { return list[Math.floor(G.Rng.next(st) * list.length)]; },
  weighted(st, pairs) { const tot = pairs.reduce((a, p) => a + Math.max(0, p[1]), 0); let r = G.Rng.next(st) * tot; for (const p of pairs) { r -= Math.max(0, p[1]); if (r < 0) return p[0]; } return pairs[pairs.length - 1][0]; },
  make(seed) { return { s: (seed >>> 0) || 1 }; }
};
G.hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
G.clone = o => JSON.parse(JSON.stringify(o));

/* ---- hexes: pointy-top, odd rows shifted right (E.Grid's convention); T = 28 world units across the flats ---- */
G.T = 28;
G.hex = {
  cube([x, y]) { const q = x - (y - (y & 1)) / 2; return [q, y, -q - y]; },
  off([q, r]) { return [q + (r - (r & 1)) / 2, r]; },
  dist(a, b) { const A = G.hex.cube(a), B = G.hex.cube(b); return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2])); },
  center([x, y], T = G.T) { return [(x + .5 + (y & 1) * .5) * T, (y * .866 + .577) * T]; },
  toCell(x, y, T = G.T) {   // cube rounding
    const py = y / T - .577, r = py / .866, q = x / T - .5 - r * .5;
    let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
    const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dy = Math.abs(ry + q + r);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dz > dy) rz = -rx - ry;
    return G.hex.off([rx, rz]);
  },
  DIRS: [[1, 0, -1], [1, -1, 0], [0, -1, 1], [-1, 0, 1], [-1, 1, 0], [0, 1, -1]],   // cube: E, NE, NW, W, SW, SE (screen order, counter-clockwise from east)
  neighbor(c, d) { const k = G.hex.cube(c), D = G.hex.DIRS[d]; return G.hex.off([k[0] + D[0], k[1] + D[1]]); },
  neighbors(c) { return [0, 1, 2, 3, 4, 5].map(d => G.hex.neighbor(c, d)); },
  ring(c, n) { if (n === 0) return [c]; const out = []; let k = G.hex.cube(c); k = [k[0] + G.hex.DIRS[4][0] * n, k[1] + G.hex.DIRS[4][1] * n]; for (let d = 0; d < 6; d++) for (let i = 0; i < n; i++) { out.push(G.hex.off(k)); const D = G.hex.DIRS[d]; k = [k[0] + D[0], k[1] + D[1]]; } return out; },
  within(c, n) { const out = []; for (let i = 0; i <= n; i++) out.push(...G.hex.ring(c, i)); return out; },
  // the direction (0..5) from a to b: the nearest of the six by angle
  dirTo(a, b) { const [ax, ay] = G.hex.center(a), [bx, by] = G.hex.center(b); const ang = Math.atan2(-(by - ay), bx - ax); return ((Math.round(ang / (Math.PI / 3)) % 6) + 6) % 6; },
  angleOf(d) { return d * Math.PI / 3; },   // screen angle (y up)
  line(c, d, n) { const out = []; let p = c; for (let i = 0; i < n; i++) { p = G.hex.neighbor(p, d); out.push(p); } return out; },
  cone(c, d, n) {   // within n, inside a 120-degree wedge facing d
    const out = [], [cx, cy] = G.hex.center(c), a0 = G.hex.angleOf(d);
    for (const h of G.hex.within(c, n)) { if (h[0] === c[0] && h[1] === c[1]) continue; const [x, y] = G.hex.center(h), a = Math.atan2(-(y - cy), x - cx); if (Math.abs(E.angDiff(a, a0)) <= Math.PI / 3 + .01) out.push(h); }
    return out;
  },
  key: c => c[0] + ',' + c[1],
  same: (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1],
  corners([x, y], T = G.T, inset = 0) { const [cx, cy] = G.hex.center([x, y], T), R = T / Math.sqrt(3) - inset; const out = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; out.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); } return out; },
  // distance from a world point to the nearest hex edge (for baked grid lines)
  edgeDist(x, y, T = G.T) { const c = G.hex.toCell(x, y, T), [cx, cy] = G.hex.center(c, T), dx = x - cx, dy = y - cy; let m = 0; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; m = Math.max(m, Math.abs(dx * Math.cos(a) + dy * Math.sin(a))); } return T / 2 - m; }
};

/* ---- the event bus ---- */
G._ons = {};
G.on = (k, fn) => { (G._ons[k] = G._ons[k] || []).push(fn); };
G.emit = (k, ...a) => { for (const fn of G._ons[k] || []) fn(...a); };

/* ---- tunables: one live object the sims read every time; dev-mode sliders edit it (Appendix A) ---- */
G.TUNE_SPEC = [
  // key, default, min, max, group, label
  ['dmgScale', 1, .25, 3, 'combat', 'Damage scale'], ['defFactor', .5, 0, 1, 'combat', 'Defense factor'],
  ['baseHit', 85, 50, 100, 'combat', 'Base hit %'], ['largeVsSmall', -30, -60, 0, 'combat', 'Large vs small hit'],
  ['critBase', 3, 0, 30, 'combat', 'Crit base %'], ['wardPenalty', .2, 0, .6, 'combat', 'Ward penalty'],
  ['surroundBonus', .1, 0, .3, 'combat', 'Surround bonus'], ['elemStrong', 1.3, 1, 2, 'combat', 'Strong element'],
  ['elemSame', .8, .5, 1, 'combat', 'Same element'], ['tideBonus', .15, 0, .5, 'combat', 'Seasonal Tide'],
  ['forestDef', .2, 0, .5, 'combat', 'Forest DEF'], ['captureBase', .25, 0, 1, 'combat', 'Capture chance'],
  ['magicScale', 1, .25, 3, 'magic', 'Magic scale'], ['healScale', 1, .25, 3, 'magic', 'Heal scale'],
  ['statusScale', 1, 0, 2, 'magic', 'Status chance'], ['expScale', 2, 0, 5, 'pacing', 'EXP scale'],
  ['bells', 12, 4, 20, 'pacing', 'Bells per battle'], ['candleSeasons', 12, 4, 30, 'pacing', 'Candle seasons'],
  ['animSpeed', 1, .25, 4, 'pacing', 'Animation speed'], ['hubTurnSeconds', 15, 5, 60, 'pacing', 'Hub troop timer'],
  ['manaIncome', 1, .25, 3, 'economy', 'Mana income'], ['summonCost', 1, .25, 3, 'economy', 'Summon cost'],
  ['upkeepScale', 1, 0, 3, 'economy', 'Upkeep'], ['seasonYield', .25, 0, 1, 'economy', 'In-season yield'],
  ['winterUpkeep', .25, 0, 1, 'economy', 'Winter upkeep'], ['questLuck', 1, 0, 2, 'economy', 'Quest luck'], ['drillExp', 30, 0, 100, 'pacing', 'Player drill EXP per season'],
  ['aiAggression', 1, .5, 2, 'ai', 'AI aggression'], ['aiManaBonus', 0, -.5, 1, 'ai', 'AI mana bonus'],
  ['aiPlayerBoost', 0, 0, 1, 'ai', 'Player stat boost']
];
G.TUNE_DEFAULTS = Object.fromEntries(G.TUNE_SPEC.map(s => [s[0], s[1]]));
G.tune = Object.assign({}, G.TUNE_DEFAULTS);
G.dev = { god: false, oneHit: false, infMP: false, freeSummon: false, touched: false, revealAI: false, showCoords: false, showDanger: false, showWards: false, hud: true, weather: true };
G.loadTune = () => { try { const t = E.store.get('brigantime:tune', null); if (t) for (const k in t) if (k in G.TUNE_DEFAULTS) G.tune[k] = t[k]; } catch (e) { /* storage blocked: defaults */ } };
G.saveTune = () => { try { const t = {}; for (const k in G.tune) if (G.tune[k] !== G.TUNE_DEFAULTS[k]) t[k] = G.tune[k]; E.store.set('brigantime:tune', t); } catch (e) { /* storage blocked */ } };
G.resetTune = () => { Object.assign(G.tune, G.TUNE_DEFAULTS); G.saveTune(); };

/* ---- seasons ---- */
G.SEASONS = ['spring', 'summer', 'autumn', 'winter'];
G.SEASON_NAME = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter', hour: 'Hour' };
G.SEASON_COLOR = { spring: '#7ad860', summer: '#f0c040', autumn: '#e08030', winter: '#a8d8ff', hour: '#d8c070', none: '#d0d0d0' };
G.OPPOSE = { spring: 'autumn', autumn: 'spring', summer: 'winter', winter: 'summer' };
G.cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
if (typeof window !== 'undefined') window.__G = G;   // the handle tests and tools read
