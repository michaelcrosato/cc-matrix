/* BRIGANTIME: THE LEGEND OF FORSEASONS
 * Core loop: each season, read the tidings, muster your castles (summon, bind, move, quest, equip, promote), declare
 * your marches, then fight the battles they cause, growing knights and monsters until you can take Meridian and defeat
 * the Gray Knight before the Hour-Candle burns out. */
const VERSION = '1.0.0';
G.VERSION = VERSION;
G.TITLE = 'Brigantime: The Legend of Forseasons';
G.SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
G.SEASON_COL = ['#5ec26a', '#f0643a', '#e0a030', '#6ab8f0', '#a89ad8', '#8a8470'];
G.CORNER = 44;   // the engine's menu and full-screen buttons sit at the top right
G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- deterministic random: mulberry32 with the state kept in a plain object ---- */
G.Rng = {
  make(seed) { return { s: (seed >>> 0) || 1 }; },
  next(r) { r.s = (r.s + 0x6D2B79F5) >>> 0; let t = r.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
  int(r, n) { return Math.floor(G.Rng.next(r) * n); },
  pick(r, a) { return a[G.Rng.int(r, a.length)]; },
  chance(r, p) { return G.Rng.next(r) < p; },
  range(r, a, b) { return a + G.Rng.next(r) * (b - a); }
};

/* ---- live tunables (dev-mode sliders). The sims read G.tune every time ---- */
G.TUNE_DEFAULTS = {
  manaIncome: 1, summonCost: 1, upkeep: 1, dmgMul: 1, enemyDmg: 1, hpMul: 1, bells: 12, wardPenalty: .2, tide: .15,
  opposed: .25, capture: .5, expMul: 1, candleSeasons: 12, aiAggro: 1, seasonYield: .25, winterUpkeep: .25, moveBonus: 0, startMana: 120, dialShield: .2
};
G.TUNE_META = [   // key, label, min, max, step
  ['manaIncome', 'Mana income x', .25, 3, .05], ['summonCost', 'Summon cost x', .25, 3, .05], ['upkeep', 'Upkeep x', 0, 3, .05],
  ['startMana', 'Starting mana', 20, 400, 10],
  ['dmgMul', 'Damage dealt x', .25, 3, .05], ['enemyDmg', 'Foe damage x', .25, 3, .05], ['hpMul', 'Unit HP x', .4, 3, .05],
  ['bells', 'Bells in a battle', 6, 20, 1], ['wardPenalty', 'Outside-ward penalty', 0, .6, .01], ['tide', 'Seasonal Tide', 0, .6, .01],
  ['opposed', 'Opposed-season bonus', 0, .8, .01], ['capture', 'Capture chance x', 0, 2, .05], ['expMul', 'Experience x', .25, 4, .05],
  ['candleSeasons', 'Hour-Candle seasons', 6, 24, 1], ['aiAggro', 'AI aggression x', 0, 3, .05], ['seasonYield', 'Home-season yield', 0, 1, .01],
  ['winterUpkeep', 'Winter upkeep', 0, 1, .01], ['moveBonus', 'Move bonus', -1, 3, 1], ['dialShield', 'Gray Knight dial shield', 0, .3, .01]
];
G.cheat = { god: false, oneHit: false };
G.tune = Object.assign({}, G.TUNE_DEFAULTS);
G.resetTune = () => { Object.assign(G.tune, G.TUNE_DEFAULTS); G.saveTune(); };
G.saveTune = () => { try { E.store.set('brigantime:tune', Object.assign({}, G.tune)); } catch (e) { } };
G.loadTune = () => { try { const t = E.store.get('brigantime:tune', null); if (t) for (const k in t) if (k in G.TUNE_DEFAULTS) G.tune[k] = t[k]; } catch (e) { } };

/* ---- hex helpers: pointy-top, odd-rows shifted right ---- */
G.hex = {
  dirsEven: [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]],
  dirsOdd: [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]],
  nb(c, r) { const d = (r & 1) ? G.hex.dirsOdd : G.hex.dirsEven; return d.map(v => [c + v[0], r + v[1]]); },
  cube(c, r) { const x = c - ((r - (r & 1)) >> 1); return [x, -x - r, r]; },
  dist(a, b) { const p = G.hex.cube(a[0], a[1]), q = G.hex.cube(b[0], b[1]); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); },
  px(c, r, s) { return [s * Math.sqrt(3) * (c + .5 * (r & 1)), s * 1.5 * r]; },
  corners(cx, cy, s, sq) { const o = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); o.push([cx + s * Math.cos(a), cy + s * Math.sin(a) * sq]); } return o; }
};

/* ---- the tiny event bus and registry ---- */
const _on = {};
G.on = (k, f) => { (_on[k] = _on[k] || []).push(f); };
G.emit = (k, ...a) => { for (const f of _on[k] || []) { try { f(...a); } catch (e) { if (G.game) G.game.fail('event ' + k, e); } } };
const REG = {};
G.def = (kind, id, spec) => { (REG[kind] = REG[kind] || {})[id] = spec; return spec; };
G.get = (kind, id) => (REG[kind] || {})[id];
G.all = kind => Object.values(REG[kind] || {});
G.hash = obj => { const s = typeof obj === 'string' ? obj : JSON.stringify(obj); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
G.clone = o => JSON.parse(JSON.stringify(o));
E.__brig = G;
