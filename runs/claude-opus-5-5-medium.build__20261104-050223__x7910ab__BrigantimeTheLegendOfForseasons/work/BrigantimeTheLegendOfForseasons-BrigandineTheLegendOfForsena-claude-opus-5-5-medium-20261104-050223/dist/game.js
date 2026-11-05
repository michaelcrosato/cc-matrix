(() => {
'use strict';
const E = My3D2dge, G = {};
// ---- 00-core.js ----
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

// ---- 01-data-rules.js ----
/* ---- RULES DATA: elements, terrain and its season transforms, sizes, effects ---- */
for (const s of ['spring', 'summer', 'autumn', 'winter', 'hour']) G.def('element', s, { name: G.SEASON_NAME[s], color: G.SEASON_COLOR[s], opp: G.OPPOSE[s] || null });

// terrain: code -> { name, cost, def, evade, block, fly (fliers may end there), water, note }
const TER = (code, name, o) => G.def('terrain', code, Object.assign({ name, cost: 1, def: 0, evade: 0 }, o));
TER('.', 'Plain', { winter: 'snow' }); TER(',', 'Road');
TER('f', 'Forest', { cost: 2, costL: 3, def: .2, evade: 10, forest: true });
TER('h', 'Hill', { cost: 2, def: .1, evade: 5, hill: true });
TER('m', 'Mountain', { block: true, flyEnd: true, def: .2, evade: 10 });
TER('~', 'Shallows', { cost: 2, swimCost: 1, def: -.1, evade: -10, water: true, winter: 'ice', springFlood: 'w', summerCost: 1 });
TER('w', 'Deep water', { block: true, swim: true, water: true, deep: true, winter: 'ice' });
TER('L', 'Lake', { block: true, swim: true, water: true, deep: true, winter: 'ice' });
TER('s', 'Swamp', { cost: 3, floatCost: 1, def: -.1, evade: -10, summer: '.', winterCost: 2, swamp: true });
TER('F', 'Field', { field: true, winter: 'snow' });
TER('r', 'Ruins', { def: .1, evade: 5 });
TER('#', 'Rampart', { block: true, flyPass: true, wall: true });
TER('g', 'Courtyard', { def: .1 });
TER('b', 'Bridge', {});
TER('K', 'Keep', { keep: true });
TER('D', 'Season Dial', { dial: true });
TER('snow', 'Snow', { cost: 2, winterCost1: true });
TER('ice', 'Ice', { evade: -10, ice: true });
TER('fire', 'Burning forest', { cost: 2, burning: true });
TER('ash', 'Ash', {});
G.terrainOf = code => G.get('terrain', code);
// the terrain a map's code becomes in a season (§5.11)
G.seasonTerrain = (code, season, flood) => {
  const t = G.get('terrain', code);
  if (season === 'winter' && t.winter) return t.winter;
  if (season === 'summer' && t.summer) return t.summer;
  if (season === 'spring' && flood && t.springFlood) return t.springFlood;
  return code;
};

G.SIZE_HIT = { S: { S: 0, M: 0, L: 10 }, M: { S: -10, M: 0, L: 10 }, L: { S: -30, M: -10, L: 0 } };

// effects: kind status | buff | debuff; bells it lasts by default; icon colour
const EF = (id, name, kind, o) => G.def('effect', id, Object.assign({ name, kind }, o));
EF('poison', 'Poison', 'status', { bells: 3, color: '#80e050' });
EF('burn', 'Burn', 'status', { bells: 2, color: '#ff7030' });
EF('chill', 'Chill', 'status', { bells: 2, color: '#90d8ff' });
EF('sleep', 'Sleep', 'status', { bells: 2, color: '#c0a0ff' });
EF('stop', 'Stop', 'status', { bells: 1, color: '#c8c8c8' });
EF('valor', 'Valor', 'buff', { bells: 2, color: '#ff5050' });
EF('haste', 'Haste', 'buff', { bells: 2, color: '#ffe050' });
EF('warded', 'Warded', 'buff', { bells: 2, color: '#5aa0ff' });
EF('guarded', 'Guarded', 'buff', { bells: 1, color: '#e0e0ff' });
EF('weakened', 'Weakened', 'debuff', { bells: 2, color: '#b08060' });
EF('exposed', 'Exposed', 'debuff', { bells: 2, color: '#e070a0' });
EF('frostarmor', 'Frost Armor', 'buff', { bells: 2, color: '#a0f0ff' });
EF('windup', 'Wound up', 'buff', { bells: 2, color: '#d8c070' });

// ---- 02-data-skills.js ----
/* ---- SKILLS AND SPELLS (§6.7) ----
 * kind: special | spell | passive. elem: 'user' (the user's element), 'none', a season or 'hour', or absent (support).
 * p: physical power (×ATK) or, with magic, flat spell power. range [min, max]; area: single r1 r2 self-r1 self-r2 adj cone2
 * cone3 line3 line4 troop ward. who: foes allies all ownMon. mobile: usable after moving. needMove: hexes moved first. */
const SK = (id, name, kind, o) => G.def('skill', id, Object.assign({ name, kind, range: [1, 1], area: 'single', who: 'foes', mp: 0 }, o));
const SELF = [0, 0];
SK('rally', 'Rally', 'special', { range: SELF, area: 'self-r1', who: 'allies', mp: 4, mobile: true, buff: ['valor', 2], anim: 'cheer', desc: 'Allies around you gain Valor.' });
SK('charge', 'Charge', 'special', { elem: 'user', p: 1.3, mp: 5, mobile: true, needMove: 2, anim: 'thrust', desc: 'Move 2+ hexes, then strike hard.' });
SK('shieldwall', 'Shield Wall', 'special', { range: SELF, area: 'adj', who: 'allies', mp: 6, mobile: true, buff: ['warded', 1], anim: 'block', desc: 'Adjacent allies are Warded.' });
SK('holystrike', 'Holy Strike', 'special', { elem: 'none', p: 1.5, mp: 8, mobile: true, antiHour: 1.5, anim: 'overhead', desc: 'Ignores element; ×1.5 vs Hour.' });
SK('layonhands', 'Lay on Hands', 'special', { heal: 60, who: 'allies', mp: 10, mobile: true, anim: 'cast', desc: 'Heal one adjacent ally.' });
SK('aimedshot', 'Aimed Shot', 'special', { elem: 'user', p: 1.2, range: [2, 4], mp: 4, hitBonus: 20, bow: true, desc: 'A careful shot: +20 hit.' });
SK('volley', 'Volley', 'special', { elem: 'user', p: .8, range: [3, 5], area: 'r1', mp: 8, bow: true, desc: 'Arrows rain on an area.' });
SK('pinning', 'Pinning Shot', 'special', { elem: 'user', p: .9, range: [2, 4], mp: 6, mobile: true, status: ['chill', 70], bow: true, desc: 'A shot that Chills.' });
SK('piercing', 'Piercing Arrow', 'special', { elem: 'user', p: 1.1, range: SELF, area: 'line4', mp: 10, always: true, bow: true, desc: 'Every unit on a line.' });
SK('eagleeye', 'Eagle Eye', 'passive', { desc: 'Bows reach 1 hex further.' });
// the five element families: Bolt, Hex, Storm, Tempest
const BOLT = { spring: 'bramble', summer: 'cinder', autumn: 'galeleaves', winter: 'hoarfrost', hour: 'timeshear' };
const HEX = { spring: 'drowse', summer: 'kindle', autumn: 'rot', winter: 'frostbite', hour: 'stophex' };
const STORM = { spring: 'bramblestorm', summer: 'cinderstorm', autumn: 'leafstorm', winter: 'froststorm', hour: 'hourstorm' };
const TEMPEST = { spring: 'verdanttempest', summer: 'solarflare', autumn: 'harvestmoon', winter: 'blizzard', hour: 'hourstorm' };
G.SPELL_FAMILY = { Bolt: BOLT, Hex: HEX, Storm: STORM, Tempest: TEMPEST };
[['bramble', 'Bramble', 'spring'], ['cinder', 'Cinder', 'summer'], ['galeleaves', 'Gale of Leaves', 'autumn'], ['hoarfrost', 'Hoarfrost', 'winter'], ['timeshear', 'Time Shear', 'hour']].forEach(([id, n, el]) =>
  SK(id, n, 'spell', { elem: el, magic: true, p: 14, range: [1, 4], mp: 5, ignoreTide: el === 'hour', desc: 'A bolt of ' + G.SEASON_NAME[el] + '.' }));
[['drowse', 'Drowse', 'spring', 'sleep', 60], ['kindle', 'Kindle', 'summer', 'burn', 70], ['rot', 'Rot', 'autumn', 'poison', 70], ['frostbite', 'Frostbite', 'winter', 'chill', 70], ['stophex', 'Stop', 'hour', 'stop', 40]].forEach(([id, n, el, st, ch]) =>
  SK(id, n, 'spell', { elem: el, magic: true, range: [1, 4], mp: 6, status: [st, ch], desc: G.get('effect', st).name + ' ' + ch + '%.' }));
[['bramblestorm', 'Bramble Storm', 'spring'], ['cinderstorm', 'Cinder Storm', 'summer'], ['leafstorm', 'Leaf Storm', 'autumn'], ['froststorm', 'Frost Storm', 'winter'], ['hourstorm', 'Hour Storm', 'hour']].forEach(([id, n, el]) =>
  SK(id, n, 'spell', { elem: el, magic: true, p: 22, range: [1, 4], area: 'r1', who: 'all', mp: 10, burns: el === 'summer', desc: 'A storm over 7 hexes. Hits friends too.' }));
SK('verdanttempest', 'Verdant Tempest', 'spell', { elem: 'spring', magic: true, p: 34, range: [1, 5], area: 'r2', who: 'all', mp: 16, status: ['sleep', 20], desc: 'A great spring storm.' });
SK('solarflare', 'Solar Flare', 'spell', { elem: 'summer', magic: true, p: 34, range: [1, 5], area: 'r2', who: 'all', mp: 16, status: ['burn', 30], burns: true, desc: 'The sun falls on 19 hexes.' });
SK('harvestmoon', 'Harvest Moon', 'spell', { elem: 'autumn', magic: true, p: 34, range: [1, 5], area: 'r2', who: 'all', mp: 16, drain: .25, desc: 'Drains a quarter of the harm.' });
SK('blizzard', 'Blizzard', 'spell', { elem: 'winter', magic: true, p: 34, range: [1, 5], area: 'r2', who: 'all', mp: 16, status: ['chill', 30], desc: 'A howling winter storm.' });
SK('manasiphon', 'Mana Siphon', 'spell', { range: [1, 4], mp: 2, steal: 12, desc: 'Steal 12 MP.' });
SK('haste', 'Haste', 'spell', { range: [0, 3], who: 'allies', mp: 8, buff: ['haste', 2], desc: 'An ally moves faster.' });
SK('mend', 'Mend', 'spell', { heal: 30, range: [0, 3], who: 'allies', mp: 5, desc: 'Heal an ally.' });
SK('purify', 'Purify', 'spell', { range: [0, 3], who: 'allies', mp: 4, cleanse: true, desc: 'Clear statuses and debuffs.' });
SK('renewal', 'Renewal', 'spell', { heal: 24, range: [0, 3], area: 'r1', who: 'allies', mp: 10, desc: 'Heal allies in an area.' });
SK('wardofseasons', 'Ward of Seasons', 'spell', { range: [0, 3], area: 'r1', who: 'allies', mp: 9, buff: ['warded', 2], desc: 'Allies in an area are Warded.' });
SK('greaterrenewal', 'Greater Renewal', 'spell', { heal: 36, range: [0, 4], area: 'r2', who: 'allies', mp: 16, desc: 'Heal allies in a wide area.' });
SK('dawnlight', 'Dawnlight', 'spell', { elem: 'none', magic: true, p: 26, range: [1, 4], area: 'r1', mp: 14, antiHour: 1.5, ignoreTide: true, desc: 'Holy light; ×1.5 vs Hour.' });
SK('goad', 'Goad', 'special', { range: [1, 2], who: 'ownMon', mp: 3, mobile: true, buff: ['valor', 1], buff2: ['haste', 1], anim: 'wave', desc: 'A monster gains Valor and Haste.' });
SK('packtactics', 'Pack Tactics', 'passive', { desc: 'Your monsters +10 hit.' });
SK('roar', 'Roar', 'special', { range: SELF, area: 'self-r2', mp: 6, mobile: true, status: ['weakened', 60], anim: 'roar', desc: 'Foes nearby may be Weakened.' });
SK('callofwild', 'Call of the Wild', 'special', { range: SELF, area: 'troop', who: 'ownMon', healPct: .2, mp: 12, mobile: true, desc: 'Heal your monsters 20%.' });
SK('bondoffang', 'Bond of Fang', 'special', { range: [1, 4], area: 'single', who: 'ownMon', mp: 10, mobile: true, buff: ['valor', 2], buff2: ['warded', 2], buff3: ['haste', 2], inWard: true, desc: 'One monster: Valor, Warded, Haste.' });
SK('verdantoath', 'Verdant Oath', 'special', { elem: 'spring', range: SELF, area: 'ward', who: 'allies', healPct: .1, buff: ['warded', 2], mp: 10, mobile: true, desc: 'Allies in your Ward heal and are Warded.' });
SK('warcry', 'Warcry', 'special', { elem: 'summer', range: SELF, area: 'ward', who: 'allies', buff: ['valor', 2], mp: 8, mobile: true, desc: 'Allies in your Ward gain Valor.' });
SK('quietcounsel', 'Quiet Counsel', 'special', { elem: 'autumn', range: SELF, area: 'ward', who: 'allies', buff: ['haste', 1], mp: 10, mobile: true, desc: 'Allies in your Ward gain Haste.' });
SK('reaping', 'Reaping', 'spell', { elem: 'autumn', magic: true, p: 20, range: [1, 3], mp: 8, drain: .5, desc: 'Heals you half the harm.' });
SK('madgambit', 'Mad Gambit', 'special', { elem: 'winter', magic: true, p: 30, range: [1, 3], mp: 6, mobile: true, misfire: .25, desc: '25%: it misfires and Chills you.' });
SK('frozenhour', 'Frozen Hour', 'spell', { elem: 'winter', range: [1, 4], mp: 12, status: ['stop', 70], desc: 'Stop 70%.' });
SK('restore', 'Restore', 'spell', { elem: 'hour', healPct: .5, range: [0, 3], who: 'allies', mp: 14, desc: 'Heal half of max HP.' });
SK('turning', 'Turning', 'special', { elem: 'none', magic: true, p: 40, range: [1, 3], area: 'r1', mp: 0, mobile: true, once: true, antiHour: 2, breaksTimeless: true, ignoreTide: true, desc: 'Once a battle; ×2 vs Hour; breaks Timeless.' });
SK('ambush', 'Ambush', 'passive', { desc: '+30% damage from a forest hex.' });
SK('thirteenthstroke', 'Thirteenth Stroke', 'special', { elem: 'hour', p: 1.6, range: SELF, area: 'adj', mp: 0, mobile: true, ignoreTide: true, anim: 'spin', desc: 'Strikes every foe around him.' });
SK('still', 'Still', 'special', { elem: 'hour', range: SELF, area: 'self-r2', mp: 0, mobile: true, status: ['stop', 70], every: 3, anim: 'cast', desc: 'Stop every foe within 2.' });
SK('unmaking', 'Unmaking', 'spell', { elem: 'hour', range: [1, 3], mp: 20, pctMax: .25, desc: 'Takes a quarter of max HP.' });
SK('timeless', 'Timeless', 'passive', { desc: 'Immune to effects; half damage until the Wheel turns.' });
SK('pollenpuff', 'Pollen Puff', 'special', { elem: 'spring', range: SELF, area: 'self-r1', mp: 6, mobile: true, status: ['sleep', 50], desc: 'Sleep 50% around.' });
SK('entangle', 'Entangle', 'special', { elem: 'spring', p: .6, range: [1, 2], mp: 5, status: ['chill', 70], desc: 'Roots that Chill.' });
SK('scream', 'Mandrake Scream', 'special', { elem: 'spring', range: SELF, area: 'self-r2', mp: 10, status: ['sleep', 50], desc: 'Sleep 50% within 2.' });
SK('sleepdust', 'Sleep Dust', 'spell', { elem: 'spring', range: [1, 3], area: 'r1', mp: 8, status: ['sleep', 60], desc: 'Sleep 60% in an area.' });
SK('thorns', 'Thorns', 'passive', { desc: 'Melee attackers take 10% back.' });
SK('rootsweep', 'Root Sweep', 'special', { elem: 'spring', p: .9, range: SELF, area: 'adj', mp: 6, mobile: true, desc: 'Strikes every foe around.' });
SK('dive', 'Dive', 'special', { elem: 'user', p: 1.2, mp: 4, mobile: true, needMove: 2, anim: 'dive', desc: 'Fliers: move 2+, then swoop.' });
SK('torrent', 'Torrent', 'special', { elem: 'spring', p: 1, range: SELF, area: 'line3', mp: 6, always: true, anim: 'breath', desc: 'Water along a line.' });
SK('coil', 'Coil', 'special', { elem: 'user', p: .8, mp: 4, mobile: true, status: ['chill', 60], anim: 'coil', desc: 'Squeeze: Chill 60%.' });
SK('emberspit', 'Ember Spit', 'special', { elem: 'summer', p: .9, range: [1, 2], mp: 3, mobile: true, status: ['burn', 30], anim: 'breath', desc: 'Burn 30%.' });
SK('firebreath', 'Fire Breath', 'special', { elem: 'summer', p: 1.2, range: SELF, area: 'cone2', mp: 8, always: true, status: ['burn', 25], anim: 'breath', desc: 'Fire in a cone.' });
SK('howl', 'Howl', 'special', { range: SELF, area: 'self-r2', who: 'allies', mp: 5, mobile: true, buff: ['valor', 1], anim: 'roar', desc: 'Allies nearby gain Valor.' });
SK('pounce', 'Pounce', 'special', { elem: 'user', p: 1.2, mp: 5, mobile: true, anim: 'pounce', desc: 'A leaping strike.' });
SK('rebirth', 'Rebirth', 'passive', { desc: 'Once a battle, rises at 30% HP.' });
SK('sunriddle', 'Sun Riddle', 'special', { elem: 'summer', range: SELF, area: 'self-r1', mp: 8, status: ['sleep', 50], desc: 'Sleep 50% around.' });
SK('wispfire', 'Wisp Fire', 'special', { elem: 'autumn', magic: true, p: 9, range: [1, 3], mp: 4, mobile: true, desc: 'A wisp of autumn flame.' });
SK('fear', 'Fear', 'special', { elem: 'autumn', range: SELF, area: 'self-r1', mp: 5, mobile: true, status: ['weakened', 60], desc: 'Weakened 60% around.' });
SK('drain', 'Drain', 'special', { elem: 'user', p: 1, mp: 4, mobile: true, drain: .5, desc: 'Heals half the harm.' });
SK('gravechill', 'Grave Chill', 'special', { elem: 'winter', range: SELF, area: 'self-r1', mp: 7, status: ['chill', 40], desc: 'Chill 40% around.' });
SK('gale', 'Gale', 'special', { elem: 'autumn', p: .7, mp: 5, mobile: true, push: true, desc: 'Pushes the foe a hex.' });
SK('trample', 'Trample', 'special', { elem: 'user', p: 1, range: SELF, area: 'line3', mp: 6, mobile: true, always: true, anim: 'gore', desc: 'Tramples a line.' });
SK('thickhide', 'Thick Hide', 'passive', { desc: 'DEF +10%.' });
SK('frostarmor', 'Frost Armor', 'special', { elem: 'winter', range: SELF, area: 'single', who: 'allies', mp: 5, mobile: true, buff: ['frostarmor', 2], desc: 'DEF +40% for 2 bells.' });
SK('avalanche', 'Avalanche', 'special', { elem: 'winter', p: 1, range: [1, 2], area: 'r1', who: 'all', mp: 9, always: true, desc: 'Snow crashes on an area.' });
SK('hurlice', 'Hurl Ice', 'special', { elem: 'winter', p: 1, range: [2, 3], mp: 5, anim: 'throw', desc: 'A thrown block of ice.' });
SK('frostfang', 'Frost Fang', 'passive', { desc: 'Bites Chill 30%.' });
SK('frostbreath', 'Frost Breath', 'special', { elem: 'winter', p: 1.2, range: SELF, area: 'cone3', mp: 8, always: true, status: ['chill', 40], anim: 'breath', desc: 'Ice in a wide cone.' });
SK('tailsweep', 'Tail Sweep', 'special', { elem: 'user', p: .9, range: SELF, area: 'adj', mp: 6, mobile: true, anim: 'tailsweep', desc: 'Sweeps every foe around.' });
SK('windup', 'Wind-up', 'special', { range: SELF, area: 'single', who: 'allies', mp: 3, mobile: true, buff: ['windup', 2], desc: 'Next attack ×1.5.' });
SK('pendulum', 'Pendulum', 'special', { elem: 'hour', p: 1.1, range: SELF, area: 'adj', mp: 6, mobile: true, desc: 'Swings at every foe around.' });
SK('stopbite', 'Stopping Bite', 'passive', { desc: 'Bites Stop 20%.' });
SK('engulf', 'Engulf', 'special', { elem: 'user', p: .9, mp: 4, mobile: true, status: ['poison', 40], desc: 'Poison 40%.' });
SK('regenerate', 'Regenerate', 'passive', { desc: 'Heals 10% each turn.' });
SK('groundpound', 'Ground Pound', 'special', { elem: 'user', p: 1, range: SELF, area: 'adj', mp: 7, mobile: true, anim: 'stomp', desc: 'Pounds every foe around.' });
SK('screech', 'Screech', 'special', { range: SELF, area: 'self-r1', mp: 5, mobile: true, status: ['weakened', 60], desc: 'Weakened 60% around.' });

// ---- 03-data-classes.js ----
/* ---- KNIGHT CLASSES (§6.6). stats: HP MP ATK DEF INT AGI. A tier-2/3 class keeps its line's tier-1 base and growth;
 * at a class change every stat ×1.10 and growth becomes ×1.15 (tier 2) or ×1.30 (tier 3). Skills: [id or family, level] */
G.STATS = ['hp', 'mp', 'atk', 'def', 'int', 'agi'];
const CL = (id, name, o) => G.def('class', id, Object.assign({ name, tier: 1, mov: 5, ward: 2, bond: 5, skills: [] }, o));
const LINE = {
  warrior: { base: [70, 8, 17, 15, 7, 11], growth: [7, .6, 1.6, 1.4, .4, .9], weapons: ['sword', 'spear', 'axe'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, anims: { charge: 'thrust', holystrike: 'overhead', shieldwall: 'block', rally: 'cheer' } },
  ranger: { base: [58, 10, 16, 10, 9, 15], growth: [5.5, .8, 1.5, .9, .6, 1.3], weapons: ['bow'], basic: { name: 'Shoot', p: .9, range: [2, 4], anim: 'throw', bow: true } },
  mage: { base: [50, 30, 8, 8, 18, 11], growth: [4.5, 2.2, .5, .7, 1.8, .9], weapons: ['staff', 'tome'], basic: { name: 'Strike', p: .6, range: [1, 1], anim: 'overhead' } },
  cleric: { base: [55, 26, 10, 10, 15, 10], growth: [5, 2, .7, .9, 1.5, .8], weapons: ['mace', 'staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' } },
  beast: { base: [62, 12, 14, 12, 10, 13], growth: [6, .9, 1.2, 1.1, .7, 1.1], weapons: ['whip', 'spear'], basic: { name: 'Lash', p: .8, range: [1, 2], anim: 'backslash', whip: true } }
};
G.LINE = LINE;
const lineCls = (id, name, line, tier, o) => CL(id, name, Object.assign({ line, tier, base: LINE[line].base, growth: LINE[line].growth, weapons: LINE[line].weapons, basic: LINE[line].basic }, o));
lineCls('squire', 'Squire', 'warrior', 1, { ward: 2, bond: 5, skills: [['rally', 3]], next: 'knight', nextLv: 10 });
lineCls('knight', 'Knight', 'warrior', 2, { ward: 3, bond: 7, skills: [['rally', 3], ['charge', 10], ['shieldwall', 14]], next: 'paladin', nextLv: 20, writ: true });
lineCls('paladin', 'Paladin', 'warrior', 3, { ward: 3, bond: 9, skills: [['rally', 3], ['charge', 10], ['shieldwall', 14], ['holystrike', 20], ['layonhands', 24]] });
lineCls('archer', 'Archer', 'ranger', 1, { bond: 4, skills: [['aimedshot', 4]], next: 'ranger', nextLv: 10 });
lineCls('ranger', 'Ranger', 'ranger', 2, { ward: 3, bond: 6, skills: [['aimedshot', 4], ['volley', 10], ['pinning', 14]], next: 'sentinel', nextLv: 20, writ: true });
lineCls('sentinel', 'Sentinel', 'ranger', 3, { ward: 3, bond: 7, basic: { name: 'Shoot', p: .9, range: [2, 5], anim: 'throw', bow: true }, skills: [['aimedshot', 4], ['volley', 10], ['pinning', 14], ['piercing', 20], ['eagleeye', 24]] });
lineCls('adept', 'Adept', 'mage', 1, { mov: 4, bond: 4, skills: [['Bolt', 1], ['Hex', 6]], next: 'sorcerer', nextLv: 10 });
lineCls('sorcerer', 'Sorcerer', 'mage', 2, { mov: 4, ward: 3, bond: 6, skills: [['Bolt', 1], ['Hex', 6], ['Storm', 10], ['manasiphon', 14]], next: 'archmage', nextLv: 20, writ: true });
lineCls('archmage', 'Archmage', 'mage', 3, { mov: 4, ward: 3, bond: 7, skills: [['Bolt', 1], ['Hex', 6], ['Storm', 10], ['manasiphon', 14], ['Tempest', 20], ['haste', 24]] });
lineCls('acolyte', 'Acolyte', 'cleric', 1, { mov: 4, ward: 3, bond: 5, skills: [['mend', 1], ['purify', 5]], next: 'priest', nextLv: 10 });
lineCls('priest', 'Priest', 'cleric', 2, { mov: 4, ward: 3, bond: 7, skills: [['mend', 1], ['purify', 5], ['renewal', 10], ['wardofseasons', 14]], next: 'hierophant', nextLv: 20, writ: true });
lineCls('hierophant', 'Hierophant', 'cleric', 3, { mov: 4, ward: 4, bond: 8, skills: [['mend', 1], ['purify', 5], ['renewal', 10], ['wardofseasons', 14], ['greaterrenewal', 20], ['dawnlight', 24]] });
lineCls('tamer', 'Tamer', 'beast', 1, { ward: 3, bond: 7, skills: [['goad', 3]], next: 'beastlord', nextLv: 10 });
lineCls('beastlord', 'Beastlord', 'beast', 2, { ward: 4, bond: 10, skills: [['goad', 3], ['packtactics', 10], ['roar', 14]], next: 'beastsovereign', nextLv: 20, writ: true });
lineCls('beastsovereign', 'Beast Sovereign', 'beast', 3, { ward: 4, bond: 13, skills: [['goad', 3], ['packtactics', 10], ['roar', 14], ['callofwild', 20], ['bondoffang', 24]] });
CL('springwarden', 'Springwarden', { ruler: true, line: 'warrior', weapons: ['sword'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'rising' }, ward: 4, bond: 10, base: [75, 22, 17, 15, 15, 14], growth: [7, 1.5, 1.5, 1.3, 1.3, 1.1], skills: [['mend', 1], ['charge', 1], ['verdantoath', 6], ['bramblestorm', 10], ['verdanttempest', 16]] });
CL('sunsovereign', 'Sun Sovereign', { ruler: true, line: 'warrior', weapons: ['sword', 'greatsword'], basic: { name: 'Cleave', p: 1.1, range: [1, 1], anim: 'twohand' }, ward: 4, bond: 11, base: [85, 14, 21, 16, 10, 12], growth: [8, 1, 1.9, 1.4, .8, 1], skills: [['charge', 1], ['warcry', 6], ['cinderstorm', 10], ['solarflare', 16]] });
CL('harvestking', 'Harvest King', { ruler: true, line: 'cleric', weapons: ['staff'], mov: 4, basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'overhead' }, ward: 5, bond: 10, base: [68, 30, 11, 13, 20, 10], growth: [6, 2, .8, 1.2, 1.8, .8], skills: [['mend', 1], ['galeleaves', 1], ['quietcounsel', 6], ['harvestmoon', 12], ['reaping', 16]] });
CL('rimeduke', 'Rime Duke', { ruler: true, line: 'mage', weapons: ['staff'], mov: 4, basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'spin' }, ward: 4, bond: 10, base: [70, 28, 15, 13, 19, 13], growth: [6.5, 1.8, 1.3, 1.1, 1.7, 1], skills: [['hoarfrost', 1], ['madgambit', 6], ['froststorm', 10], ['frozenhour', 12], ['blizzard', 16]] });
CL('chancellor', 'Chancellor of Hours', { ruler: true, line: 'mage', weapons: ['staff', 'rod'], mov: 4, basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'cast' }, ward: 4, bond: 12, base: [80, 34, 12, 15, 22, 12], growth: [7, 2, 1, 1.4, 1.9, .9], skills: [['timeshear', 1], ['stophex', 1], ['restore', 6], ['hourstorm', 10]] });
CL('hourmaiden', 'Hourmaiden', { unique: true, line: 'cleric', weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, ward: 3, bond: 6, base: [58, 34, 9, 11, 19, 15], growth: [5, 2.2, .6, 1, 1.8, 1.2], skills: [['mend', 1], ['haste', 1], ['turning', 8]] });
CL('graynight', 'Knight of the Thirteenth Hour', { boss: true, line: 'warrior', weapons: ['sword'], basic: { name: 'Slash', p: 1.2, range: [1, 1], anim: 'plunge' }, ward: 5, bond: 20, base: [900, 200, 52, 48, 50, 30], growth: [0, 0, 0, 0, 0, 0], skills: [['thirteenthstroke', 1], ['still', 1], ['unmaking', 1], ['timeless', 1]] });
CL('brigand', 'Brigand Captain', { unique: true, line: 'warrior', weapons: ['axe', 'sword'], basic: { name: 'Hack', p: 1.05, range: [1, 1], anim: 'overhead' }, ward: 3, bond: 8, base: [72, 6, 18, 13, 6, 12], growth: [7, .4, 1.6, 1.2, .3, 1], skills: [['charge', 1], ['ambush', 1]] });
// a knight's skills at a level: the class's list, with element families resolved
G.knightSkills = (clsId, elem, lvl) => {
  const c = G.get('class', clsId), out = [];
  for (const [s, l] of c.skills) { if (lvl < l) continue; const id = G.SPELL_FAMILY[s] ? G.SPELL_FAMILY[s][elem] : s; if (id && !out.includes(id)) out.push(id); }
  return out;
};

// ---- 04-data-monsters.js ----
/* ---- THE BESTIARY (§6.8): 30 species, 3 forms each. Tier 2 = ×1.35 (HP MP ATK DEF INT), AGI +2; tier 3 = ×1.75, AGI +4,
 * MOV +1 for fliers. At level L a stat is round(formBase × (1 + .05 × (L - 1))). Rank = bond cost. rig: how it is drawn. */
const MO = (id, names, elem, size, rank, flags, base, basic, skills, cost, upkeep, rig) => G.def('monster', id, {
  names, elem, sizes: Array.isArray(size) ? size : [size, size, size], rank, flags, base, basic, skills, cost, upkeep, rig });
const B = (name, p, range = [1, 1], o = {}) => Object.assign({ name, p, range }, o);
// rigs: blob (E.Blob + overlay), hum (E.Humanoid), beast (E.Beast)
MO('sproutling', ['Sproutling', 'Bloomkin', 'Mandragora'], 'spring', 'S', 1, '', [38, 12, 12, 9, 12, 13, 4], B('Headbutt', 1), [['pollenpuff'], ['entangle'], ['scream']], 30, 2,
  { kind: 'blob', R: 6, colors: { dk: '#3a7a2a', base: '#6ac04a', lt: '#a8e070', spec: '#e8ffd0', eye: '#1a2a10' }, ears: 'cat', feet: true, over: 'leaf' });
MO('pixie', ['Pixie', 'Sylph', 'Faerie Queen'], 'spring', ['S', 'S', 'M'], 1, 'fl', [30, 24, 8, 6, 16, 20, 6], B('Prick', .7), [['mend'], ['haste'], ['sleepdust']], 45, 3,
  { kind: 'hum', look: { size: .6, build: 'chibi', weapon: null, outfit: 'tunic', hair: 'long', colors: { cloth: '#f0a0d0', hair: '#f8e070', skin: '#ffe0d0', pants: '#c070b0', trim: '#ffffff' } }, wings: 'insect', glow: '#ffb0e8' });
MO('treant', ['Thornback Treant', 'Elder Treant', 'Worldroot'], 'spring', 'L', 4, '', [120, 10, 22, 22, 8, 5, 3], B('Slam', 1.1), [['thorns', 'entangle'], ['renewal'], ['rootsweep']], 120, 8,
  { kind: 'hum', look: { size: 1.55, build: 'bulky', weapon: null, outfit: 'coat', hair: 'spiky', hunch: .3, colors: { skin: '#6a4a2a', cloth: '#5a3a1e', coat: '#4a3018', pants: '#3a2812', hair: '#4aa040', boot: '#3a2812' } } });
MO('unicorn', ['Unicorn', 'Alicorn', 'Dawnhorn'], 'spring', ['M', 'M', 'L'], 3, 't2fl', [80, 20, 19, 14, 14, 16, 6], B('Gore', 1.1), [['charge', 'mend'], ['dive'], ['dawnlight']], 90, 5,
  { kind: 'beast', body: 'quad', preset: 'horse', colors: { body: '#f4f0f8', belly: '#ffffff', dark: '#b8b0d0', accent: '#f8b0d8', eye: '#4060a0', horn: '#ffe080', wing: '#ffffff' }, parts: { horn: true, mane: '#f8b0d8', tail: 'long', wingsFrom: 2, wings: 'feather' } });
MO('rillserpent', ['Rillserpent', 'Floodwyrm', 'Thaw Leviathan'], 'spring', 'L', 4, 'sw', [110, 18, 21, 16, 14, 9, 4], B('Bite', 1), [['torrent', 'coil'], ['bramblestorm'], ['verdanttempest']], 130, 8,
  { kind: 'beast', body: 'serpent', colors: { body: '#3a9a8a', belly: '#c0e8c0', dark: '#1a5a5a', accent: '#70d0e0', eye: '#ffe060' }, parts: { fins: true } });
MO('salamander', ['Salamander', 'Firedrake', 'Magma Drake'], 'summer', ['S', 'M', 'M'], 2, '', [50, 12, 16, 12, 10, 12, 4], B('Bite', 1), [['emberspit'], ['firebreath'], ['cinderstorm']], 45, 3,
  { kind: 'beast', body: 'quad', preset: 'lizard', colors: { body: '#e05a2a', belly: '#f8c060', dark: '#8a2a1a', accent: '#ffd040', eye: '#ffff80', flame: '#ffa020' }, parts: { tail: 'flame' } });
MO('cinderhound', ['Cinderhound', 'Blazehound', 'Twinflame Hound'], 'summer', 'M', 2, '', [70, 10, 20, 12, 8, 14, 5], B('Bite', 1), [['firebreath'], ['howl'], ['pounce']], 70, 4,
  { kind: 'beast', body: 'quad', preset: 'hound', colors: { body: '#3a2a2a', belly: '#6a4a3a', dark: '#1a1010', accent: '#ff6a20', eye: '#ffd040', flame: '#ff8a20' }, parts: { mane: 'flame', tail: 'flame' } });
MO('sunbird', ['Sunbird', 'Phoenix', 'Solar Roc'], 'summer', ['M', 'M', 'L'], 3, 'fl', [60, 18, 17, 10, 14, 18, 6], B('Talon', 1), [['dive'], ['rebirth'], ['solarflare']], 90, 5,
  { kind: 'beast', body: 'avian', colors: { body: '#ff9a20', belly: '#ffe060', dark: '#c04a10', accent: '#ff3a1a', eye: '#2a1a10', wing: '#ffb030', flame: '#ffd040' }, parts: { tail: 'flame', crest: true } });
MO('wyvern', ['Wyvern', 'Sun Dragon', 'Elder Sun Dragon'], 'summer', 'L', 4, 'fl', [120, 16, 25, 18, 12, 10, 5], B('Bite', 1), [['tailsweep', 'firebreath'], ['dive'], ['solarflare']], 160, 10,
  { kind: 'beast', body: 'drake', legs2: true, colors: { body: '#c8702a', belly: '#f0c070', dark: '#6a3a1a', accent: '#ffd040', eye: '#ffff60', wing: '#a04a2a', horn: '#f0e0c0' }, parts: { horn: true, wings: 'bat', tail: 'long', crest: true } });
MO('sunmane', ['Sunmane Lion', 'Solar Chimera', 'Noon Sphinx'], 'summer', ['M', 'L', 'L'], 3, '', [85, 12, 22, 14, 9, 15, 5], B('Claw', 1), [['roar', 'pounce'], ['firebreath'], ['sunriddle']], 100, 6,
  { kind: 'beast', body: 'quad', preset: 'cat', colors: { body: '#e0b050', belly: '#f8e0a0', dark: '#8a6020', accent: '#ff7020', eye: '#40a020', wing: '#f0c060' }, parts: { mane: '#e06a20', tail: 'long', wingsFrom: 2, wings: 'feather' } });
MO('jacklamp', ["Jack-o'-Lamp", 'Lantern Lord', 'Will of the Wisps'], 'autumn', ['S', 'S', 'M'], 1, 'fo', [36, 20, 10, 8, 15, 14, 4], B('Spook', .8), [['wispfire'], ['fear'], ['leafstorm']], 30, 2,
  { kind: 'blob', R: 6, colors: { dk: '#a04a10', base: '#f0801a', lt: '#ffb050', spec: '#fff0c0', eye: '#ffe040' }, over: 'pumpkin', float: true });
MO('scarecrow', ['Scarecrow', 'Harvest Reaper', 'Grim Thresher'], 'autumn', 'M', 2, '', [65, 10, 18, 12, 10, 12, 4], B('Scythe', 1.1), [['fear'], ['reaping'], ['trample']], 60, 4,
  { kind: 'hum', look: { size: 1.1, build: 'heroic', weapon: 'staff', outfit: 'coat', hat: { style: 'pointed', color: '#5a4020' }, hair: 'spiky', colors: { skin: '#e8c870', hair: '#e8d080', cloth: '#7a5a3a', coat: '#6a4a2a', pants: '#5a6a3a', trim: '#c09040', metal: '#c8c8c8' } }, tool: 'scythe' });
MO('ghoul', ['Barrow Ghoul', 'Wight', 'Barrow King'], 'autumn', 'M', 2, '', [70, 12, 19, 13, 9, 10, 4], B('Claw', 1, [1, 1], { status: ['poison', 25] }), [['drain'], ['gravechill'], ['rot']], 55, 3,
  { kind: 'hum', look: { size: 1.05, build: 'heroic', weapon: null, outfit: 'tunic', hair: 'long', hunch: .6, eyeGlow: '#a0ff80', colors: { skin: '#7a9a7a', hair: '#3a4a3a', cloth: '#4a4a3a', pants: '#3a3a2a', boot: '#2a2a20' } } });
MO('griffin', ['Griffin', 'Gilded Griffin', 'Storm Griffin'], 'autumn', 'L', 4, 'fl', [105, 14, 23, 15, 12, 15, 6], B('Talon', 1), [['dive', 'gale'], ['leafstorm'], ['harvestmoon']], 140, 9,
  { kind: 'beast', body: 'quad', preset: 'griffin', colors: { body: '#c89a50', belly: '#f0e0b0', dark: '#7a5a2a', accent: '#f0f0f0', eye: '#ffc020', wing: '#a07a40', horn: '#f0c040' }, parts: { wings: 'feather', tail: 'long', beak: true } });
MO('tusker', ['Great Tusker', 'Ironhide Boar', 'Boar King'], 'autumn', ['M', 'M', 'L'], 3, '', [85, 6, 21, 16, 4, 10, 5], B('Gore', 1.1), [['trample'], ['thickhide'], ['roar']], 70, 4,
  { kind: 'beast', body: 'quad', preset: 'boar', colors: { body: '#6a4a3a', belly: '#8a6a5a', dark: '#3a2a20', accent: '#f0e8d0', eye: '#ff4020', horn: '#f0e8d0' }, parts: { tusks: true, mane: '#3a2a20', tail: 'short' } });
MO('snowkit', ['Snowkit', 'Rime Sprite', 'Aurora Wisp'], 'winter', 'S', 1, 't3fo', [36, 18, 11, 9, 14, 15, 4], B('Snowball', .8, [1, 2]), [['frostbite'], ['frostarmor'], ['froststorm']], 30, 2,
  { kind: 'blob', R: 6, colors: { dk: '#8aa8c8', base: '#e8f0f8', lt: '#ffffff', spec: '#ffffff', eye: '#2a4a8a' }, ears: 'cat', tail: true, over: 'frost' });
MO('frostwolf', ['Frostwolf', 'Dire Frostwolf', 'Long-Night Wolf'], 'winter', ['M', 'M', 'L'], 2, '', [68, 8, 20, 11, 7, 16, 6], B('Bite', 1), [['howl', 'frostfang'], ['pounce'], ['frostbreath']], 65, 4,
  { kind: 'beast', body: 'quad', preset: 'wolf', colors: { body: '#d8e8f8', belly: '#ffffff', dark: '#7a98b8', accent: '#80d0ff', eye: '#60c0ff' }, parts: { mane: '#b0c8e0', tail: 'long' } });
MO('icegolem', ['Ice Golem', 'Glacier Colossus', 'Hoarfrost Titan'], 'winter', 'L', 4, '', [130, 8, 24, 26, 6, 4, 3], B('Slam', 1.1), [['frostarmor'], ['avalanche'], ['thorns']], 130, 8,
  { kind: 'hum', look: { size: 1.5, build: 'bulky', weapon: null, armor: true, hair: 'bald', eyeGlow: '#60f0ff', colors: { skin: '#a8d8f0', cloth: '#80c0e8', pants: '#6aa8d8', plate: '#c8f0ff', metal: '#e0f8ff', boot: '#5a90c0' } } });
MO('yeti', ['Yeti', 'Great Yeti', 'Yeti Matriarch'], 'winter', 'L', 4, '', [115, 8, 25, 17, 6, 8, 4], B('Maul', 1.15), [['hurlice'], ['roar'], ['avalanche']], 110, 7,
  { kind: 'hum', look: { size: 1.5, build: 'bulky', weapon: null, outfit: 'coat', hair: 'spiky', hunch: .3, colors: { skin: '#c8d0e0', hair: '#f0f4f8', cloth: '#e8eef4', coat: '#dce4ee', pants: '#c8d4e0', boot: '#8a9ab0' } } });
MO('frostwyrm', ['Frost Wyrm', 'Rime Dragon', "Winter's Heart"], 'winter', 'L', 5, 'fl', [125, 18, 24, 19, 14, 9, 5], B('Bite', 1), [['frostbreath', 'tailsweep'], ['dive'], ['blizzard']], 170, 11,
  { kind: 'beast', body: 'drake', colors: { body: '#a8d0f0', belly: '#e8f8ff', dark: '#4a7aa8', accent: '#ffffff', eye: '#40e0ff', wing: '#7ab0e0', horn: '#e0f8ff' }, parts: { horn: true, wings: 'bat', tail: 'long', crest: true } });
MO('minute', ['Minute', 'Hour-Wisp', 'Second Hand'], 'hour', 'S', 1, 'fo', [34, 16, 11, 10, 13, 17, 5], B('Tick', .8), [['stophex'], ['haste'], ['timeshear']], 40, 2,
  { kind: 'blob', R: 6, colors: { dk: '#8a6a20', base: '#d8b050', lt: '#f8e090', spec: '#ffffff', eye: '#2a2010' }, over: 'clock', float: true });
MO('clockwork', ['Clockwork Sentinel', 'Tick Knight', 'Pendulum Paladin'], 'hour', 'M', 3, '', [80, 8, 21, 20, 8, 9, 4], B('Slash', 1), [['windup'], ['shieldwall'], ['pendulum']], 80, 5,
  { kind: 'hum', look: { size: 1.2, build: 'heroic', weapon: 'sword', armor: true, hat: 'helmet', colors: { cloth: '#6a5a3a', pants: '#5a4a2a', plate: '#d8b050', metal: '#e8d8a0', skin: '#3a3020', boot: '#4a3a20', trim: '#f0d880' } }, halo: 'gear' });
MO('gearhound', ['Gearhound', 'Clockwork Hound', 'Chronohound'], 'hour', 'M', 2, '', [65, 6, 19, 15, 6, 15, 6], B('Bite', 1), [['pounce'], ['howl'], ['stopbite']], 60, 4,
  { kind: 'beast', body: 'quad', preset: 'hound', colors: { body: '#8a8a90', belly: '#b0b0b8', dark: '#4a4a50', accent: '#d8b050', eye: '#ff4020' }, parts: { gears: true, tail: 'short' } });
MO('stillwraith', ['Stillwraith', 'Hollow Hour', 'Unhour'], 'hour', 'M', 3, 'fo', [60, 30, 10, 10, 20, 13, 5], B('Spook', .8), [['timeshear', 'stophex'], ['drain'], ['hourstorm']], 85, 5,
  { kind: 'hum', look: { size: 1.1, build: 'heroic', weapon: null, outfit: 'robe', hood: true, sleeves: 'long', colors: { cloth: '#3a3a50', hair: '#2a2a3a', pants: '#2a2a3a', skin: '#e8e0c8', trim: '#d8c070' } }, alpha: .78, clockFace: true, float: 6 });
MO('pendulumwyrm', ['Pendulum Wyrm', 'Great Pendulum', 'The Long Hand'], 'hour', 'L', 5, 'boss', [150, 20, 26, 22, 18, 8, 4], B('Bite', 1), [['pendulum', 'timeshear'], ['coil'], ['hourstorm']], 200, 12,
  { kind: 'beast', body: 'serpent', colors: { body: '#a08a50', belly: '#d8c890', dark: '#5a4a2a', accent: '#d8c070', eye: '#ff3020' }, parts: { pendulum: true, gears: true } });
MO('skeleton', ['Skeleton', 'Skeleton Knight', 'Bone Lord'], 'autumn', 'M', 2, '', [60, 6, 18, 12, 5, 11, 4], B('Slash', 1), [[], ['shieldwall'], ['charge']], 50, 3,
  { kind: 'hum', look: { size: 1.05, build: 'skeleton', weapon: 'sword', colors: { bone: '#e8e0c8', metal: '#a08060' } } });
MO('bat', ['Giant Bat', 'Vampire Bat', 'Night Bat'], 'winter', ['S', 'S', 'M'], 1, 'fl', [32, 8, 12, 7, 8, 19, 6], B('Bite', .9, [1, 1], { drain: .25 }), [['dive'], ['drain'], ['fear']], 30, 2,
  { kind: 'blob', R: 5, colors: { dk: '#2a1a3a', base: '#4a3a5a', lt: '#7a6a8a', spec: '#c0a0e0', eye: '#ff3040' }, wings: true, mouth: 'fangs', ears: 'cat', fly: true });
MO('slime', ['Slime', 'Royal Slime', 'Slime Sovereign'], 'spring', 'S', 1, '', [44, 10, 11, 12, 9, 9, 3], B('Headbutt', .9), [['engulf'], ['regenerate'], ['bramblestorm']], 25, 2,
  { kind: 'blob', R: 7, colors: { dk: '#1a7a7a', base: '#3ac0b0', lt: '#80f0e0', spec: '#ffffff', eye: '#103030' }, over: 'slime' });
MO('ogre', ['Ogre', 'Ogre Chieftain', 'Ogre Warlord'], 'summer', 'L', 4, '', [125, 6, 27, 16, 4, 7, 4], B('Maul', 1.15), [['roar'], ['charge'], ['groundpound']], 110, 7,
  { kind: 'hum', look: { size: 1.5, build: 'bulky', weapon: 'staff', outfit: 'tunic', hair: 'bald', colors: { skin: '#7a9a6a', cloth: '#6a4a2a', pants: '#4a3a2a', boot: '#3a2a1a', metal: '#6a4a2a' } }, tool: 'club' });
MO('harpy', ['Harpy', 'Harpy Matron', 'Storm Harpy'], 'spring', 'M', 2, 'fl', [55, 14, 17, 10, 12, 17, 6], B('Talon', 1), [['dive'], ['gale'], ['screech']], 55, 3,
  { kind: 'hum', look: { size: 1, build: 'heroic', weapon: null, outfit: 'tunic', hair: 'long', sleeves: 'none', colors: { skin: '#e8c8a8', hair: '#6a4a8a', cloth: '#8a6aa8', pants: '#6a4a8a', boot: '#d8b040' } }, wings: 'feather', wingColor: '#9a7ab8' });
// a monster form's stats at a level (×aiPlayerBoost applied in the battle for the player's side)
G.TIER_MUL = [1, 1.35, 1.75];
G.monsterStats = (sp, tier, lvl) => {
  const m = G.get('monster', sp), b = m.base, k = G.TIER_MUL[tier - 1], f = 1 + .05 * (lvl - 1);
  const st = { hp: b[0] * k, mp: b[1] * k, atk: b[2] * k, def: b[3] * k, int: b[4] * k, agi: b[5] + (tier - 1) * 2 };
  for (const s of G.STATS) st[s] = Math.round(st[s] * f);
  st.mov = b[6] + (tier === 3 && m.flags.includes('fl') ? 1 : 0);
  return st;
};
G.monsterSkills = (sp, tier) => { const m = G.get('monster', sp), out = []; for (let t = 0; t < tier; t++) for (const s of m.skills[t]) if (!out.includes(s)) out.push(s); return out; };
G.monsterFlags = (sp, tier) => { const f = G.get('monster', sp).flags; return { fl: f.includes('fl') && !f.includes('t2fl') || (f.includes('t2fl') && tier >= 2), sw: f.includes('sw'), fo: f.includes('fo') && !f.includes('t3fo') || (f.includes('t3fo') && tier >= 3), boss: f.includes('boss') }; };
G.upkeepOf = (sp, tier) => G.get('monster', sp).upkeep * [1, 1.5, 2][tier - 1];

// ---- 05-data-items.js ----
/* ---- ITEMS (§6.9): no shops; items come from quests, events and castle treasuries. who: class lines that may equip it */
const IT = (id, name, slot, o) => G.def('item', id, Object.assign({ name, slot, who: ['all'], mods: {} }, o));
IT('ashspear', 'Ashwood Spear', 'weapon', { kind: 'spear', who: ['warrior', 'beast'], mods: { atk: 3 }, desc: 'ATK +3' });
IT('rimesteel', 'Rimesteel Sword', 'weapon', { kind: 'sword', who: ['warrior'], mods: { atk: 5 }, winterDmg: .05, desc: 'ATK +5; Winter wielder +5%' });
IT('sunforged', 'Sunforged Blade', 'weapon', { kind: 'sword', who: ['warrior'], mods: { atk: 7 }, desc: 'ATK +7' });
IT('cleaver', "Brigand's Cleaver", 'weapon', { kind: 'axe', who: ['warrior'], mods: { atk: 6, def: -2 }, desc: 'ATK +6, DEF -2' });
IT('hawthornbow', 'Hawthorn Bow', 'weapon', { kind: 'bow', who: ['ranger'], mods: { atk: 4 }, desc: 'ATK +4' });
IT('yewlongbow', 'Yew Longbow', 'weapon', { kind: 'bow', who: ['ranger'], mods: { atk: 6 }, range: 1, desc: 'ATK +6, range +1' });
IT('willowstaff', 'Willow Staff', 'weapon', { kind: 'staff', who: ['mage', 'cleric'], mods: { int: 4 }, desc: 'INT +4' });
IT('lanternstaff', 'Lantern Staff', 'weapon', { kind: 'staff', who: ['mage', 'cleric'], mods: { int: 6 }, elemBoost: ['autumn', .1], desc: 'INT +6; Autumn spells +10%' });
IT('tomeofthaw', 'Tome of Thaw', 'weapon', { kind: 'tome', who: ['mage'], mods: { int: 5 }, elemBoost: ['spring', .1], desc: 'INT +5; Spring spells +10%' });
IT('hourglassrod', 'Hourglass Rod', 'weapon', { kind: 'rod', who: ['mage', 'cleric'], mods: { int: 8, mp: 10 }, desc: 'INT +8, MP +10' });
IT('thornwhip', 'Thorn Whip', 'weapon', { kind: 'whip', who: ['beast'], mods: { atk: 4 }, range: 1, desc: 'ATK +4; Lash reaches 3' });
IT('jerkin', 'Leather Jerkin', 'armor', { mods: { def: 3 }, desc: 'DEF +3' });
IT('hauberk', 'Mail Hauberk', 'armor', { who: ['warrior', 'beast', 'ruler'], mods: { def: 6, agi: -1 }, desc: 'DEF +6, AGI -1' });
IT('thornmail', 'Thornmail', 'armor', { who: ['warrior'], mods: { def: 5 }, thorns: true, desc: 'DEF +5; Thorns' });
IT('frostplate', 'Frostplate', 'armor', { who: ['warrior', 'ruler'], mods: { def: 8 }, immune: ['chill'], desc: 'DEF +8; immune to Chill' });
IT('robeofseasons', 'Robe of Seasons', 'armor', { who: ['mage', 'cleric', 'ruler'], mods: { def: 3, int: 4 }, desc: 'DEF +3, INT +4' });
IT('spurs', 'Swift Spurs', 'accessory', { mods: { mov: 1 }, desc: 'MOV +1' });
IT('signet', 'Signet of Command', 'accessory', { mods: { bond: 2 }, desc: 'Bond +2' });
IT('bannerpin', 'Banner Pin', 'accessory', { mods: { ward: 1 }, desc: 'Ward +1' });
IT('amuletoftides', 'Amulet of Tides', 'accessory', { tide2: true, desc: 'Your Tide bonus ×2' });
IT('wardingcharm', 'Warding Charm', 'accessory', { immune: ['sleep', 'stop'], desc: 'Immune to Sleep and Stop' });
IT('mendingring', 'Ring of Mending', 'accessory', { regen: .1, desc: 'Heal 10% each turn' });
IT('horseshoe', 'Lucky Horseshoe', 'accessory', { luck: 1.15, desc: 'Good quest outcomes ×1.15' });
IT('herb', 'Healing Herb', 'consumable', { heal: 40, desc: 'Heals 40 HP' });
IT('draught', 'Golden Draught', 'consumable', { heal: 9999, desc: 'Heals to full HP' });
IT('ether', 'Ether Vial', 'consumable', { mpHeal: 20, desc: '+20 MP' });
IT('remedy', 'Remedy', 'consumable', { cleanse: true, desc: 'Clears statuses and debuffs' });
IT('manaseed', 'Mana Seed', 'consumable', { mana: 60, musterOnly: true, desc: '+60 realm mana (Muster)' });
IT('springseed', 'Spring Seed', 'promotion', { elem: 'spring', desc: 'Promotes a Spring monster' });
IT('summerember', 'Summer Ember', 'promotion', { elem: 'summer', desc: 'Promotes a Summer monster' });
IT('autumnacorn', 'Autumn Acorn', 'promotion', { elem: 'autumn', desc: 'Promotes an Autumn monster' });
IT('wintershard', 'Winter Shard', 'promotion', { elem: 'winter', desc: 'Promotes a Winter monster' });
IT('writ', 'Writ of Knighthood', 'special', { desc: 'Allows a tier-3 class change from Lv 20' });
G.SEED_OF = { spring: 'springseed', summer: 'summerember', autumn: 'autumnacorn', winter: 'wintershard' };
G.canEquip = (item, cls) => { const it = G.get('item', item), c = G.get('class', cls); if (!['weapon', 'armor', 'accessory'].includes(it.slot)) return false; if (it.slot === 'weapon' && it.kind && !c.weapons.includes(it.kind)) return false; return it.who.includes('all') || it.who.includes(c.line) || ((c.ruler || c.unique) && it.who.includes('ruler')); };

// ---- 06-data-knights.js ----
/* ---- KNIGHTS (§6.5): class, level, element, realm, castle, troop [species, level, tier], look (E.Humanoid), voice ---- */
const KDEF = (id, name, short, cls, lvl, elem, realm, castle, troop, look, voice, o = {}) => G.def('knight', id, Object.assign({ name, short, cls, lvl, elem, realm, castle, troop, look, voice }, o));
const V = (base, range, wave, o = {}) => Object.assign({ base, range, wave, formant: 1, rate: 1, vib: 0 }, o);
const cape = (c, i) => ({ len: 6, width: 5, seg: 2.5, c, i });
const L = (o, cl) => { if (o.cape && o.cape.c) { cl.cape = o.cape.c; cl.capeIn = o.cape.i; o.cape = { len: o.cape.len, width: o.cape.width, seg: o.cape.seg }; } o.colors = cl; return o; };
// Verdance (Spring)
KDEF('gareth', 'Prince Gareth Greenmantle', 'Gareth', 'springwarden', 6, 'spring', 'verdance', 'avalorn', [['unicorn', 4], ['pixie', 4], ['sproutling', 4]],
  L({ size: 1.25, build: 'heroic', armor: true, hair: 'short', hat: { style: 'crown', color: '#f0d060' }, cape: cape('#3a9a40', '#1a5a20'), weapon: 'sword' }, { cloth: '#3a8a3a', hair: '#f0c860', trim: '#f0e6c8', plate: '#d8e0e8', pants: '#2a5a2a' }), V(220, 7, 'pulse', { formant: 1.1, rate: 1.15 }), { ruler: true, title: 'Prince of Verdance' });
KDEF('lynette', 'Dame Lynette of Thornwick', 'Lynette', 'squire', 7, 'spring', 'verdance', 'thornwick', [['treant', 4], ['sproutling', 3]],
  L({ size: 1.2, build: 'heroic', armor: true, hair: 'ponytail', hat: { style: 'band', color: '#f0e6c8' }, weapon: 'sword' }, { cloth: '#f0e6c8', hair: '#a02a20', trim: '#3a9a40', pants: '#3a6a3a' }), V(190, 4, 'square', { formant: 1.05 }));
KDEF('pelleas', 'Sir Pelleas the Lovelorn', 'Pelleas', 'archer', 5, 'spring', 'verdance', 'primrose', [['pixie', 4], ['rillserpent', 3]],
  L({ size: 1.15, build: 'heroic', outfit: 'tunic', hair: 'long', hat: { style: 'cap', color: '#5ab04a' }, weapon: null }, { cloth: '#5ab04a', hair: '#8a4a20', pants: '#d8c8a0', trim: '#f4b8d0' }), V(260, 9, 'sine', { formant: 1.2, vib: .02 }), { bow: true });
KDEF('amris', 'Brother Amris', 'Amris', 'acolyte', 6, 'winter', 'verdance', 'avalorn', [['snowkit', 3], ['sproutling', 3]],
  L({ size: 1.15, build: 'heroic', hunch: .2, outfit: 'robe', hair: 'bald', weapon: 'staff', sleeves: 'long' }, { cloth: '#8a8a90', pants: '#6a6a70', skin: '#e0b898', trim: '#5a5a60', orb: '#a8d8ff' }), V(120, 4, 'triangle', { rate: .8 }));
KDEF('wren', 'Wren Ashfeather', 'Wren', 'tamer', 5, 'spring', 'verdance', 'rainmere', [['unicorn', 3], ['pixie', 3], ['sproutling', 3]],
  L({ size: 1.1, build: 'heroic', outfit: 'tunic', hair: 'spiky', hood: true, weapon: null }, { cloth: '#6ac04a', hair: '#e8e8e0', pants: '#4a6a3a' }), V(320, 8, 'pulse', { rate: 1.3 }), { whip: true });
// Solmark (Summer)
KDEF('morgause', 'Queen Morgause the Brazen', 'Morgause', 'sunsovereign', 7, 'summer', 'solmark', 'brazenhold', [['wyvern', 4], ['cinderhound', 4]],
  L({ size: 1.3, build: 'heroic', armor: true, hair: 'long', hat: { style: 'crown', color: '#ffd040' }, cape: cape('#b02a2a', '#6a1010'), weapon: 'sword', bladeLen: 9 }, { cloth: '#b02a2a', hair: '#c8602a', plate: '#e8c060', metal: '#f0e0b0', trim: '#e0a020', pants: '#6a1a1a' }), V(180, 6, 'square'), { ruler: true, title: 'Queen of Solmark' });
KDEF('agravain', 'Sir Agravain Cinderjaw', 'Agravain', 'squire', 7, 'summer', 'solmark', 'cinderwall', [['cinderhound', 4], ['salamander', 3]],
  L({ size: 1.25, build: 'bulky', armor: true, hat: 'helmet', cape: cape('#c83a2a', '#7a1a10'), weapon: 'sword' }, { cloth: '#8a2a1a', plate: '#a8a8b0', pants: '#4a2a1a' }), V(130, 5, 'saw'));
KDEF('elidure', 'Captain Elidure of Goldspur', 'Elidure', 'archer', 6, 'summer', 'solmark', 'goldspur', [['sunbird', 3], ['salamander', 3]],
  L({ size: 1.2, build: 'heroic', outfit: 'coat', hair: 'ponytail', hat: { style: 'band', color: '#e0a020' }, weapon: null }, { cloth: '#d8b880', coat: '#c8a060', hair: '#1a1a1a', pants: '#8a5a2a', trim: '#b02a2a' }), V(300, 6, 'sine', { formant: 1.25 }), { bow: true });
KDEF('hesper', 'Magus Hesper Vey', 'Hesper', 'adept', 6, 'hour', 'solmark', 'lionsreach', [['salamander', 3], ['minute', 3]],
  L({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'pointed', color: '#5a2a8a' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#6a3aa0', hair: '#d8d8e0', pants: '#4a2a7a', trim: '#e0c040', orb: '#d8c070' }), V(200, 5, 'sine', { formant: .95, vib: .01 }));
KDEF('brennoc', 'Old Brennoc', 'Brennoc', 'tamer', 5, 'summer', 'solmark', 'brazenhold', [['sunmane', 3], ['cinderhound', 3]],
  L({ size: 1.2, build: 'bulky', hunch: .3, outfit: 'coat', hair: 'bald', weapon: null }, { cloth: '#8a6a4a', coat: '#6a4a2a', pants: '#4a3a2a', skin: '#c89070' }), V(110, 4, 'saw', { rate: .85 }), { whip: true });
// Amberlyn (Autumn)
KDEF('pellam', 'King Pellam the Quiet', 'Pellam', 'harvestking', 8, 'autumn', 'amberlyn', 'ambergate', [['griffin', 4], ['scarecrow', 4]],
  L({ size: 1.2, build: 'heroic', hunch: .25, outfit: 'robe', hair: 'long', hat: { style: 'crown', color: '#e0b040' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#c87a2a', hair: '#f0f0f0', pants: '#5a3a2a', trim: '#5a3a2a', orb: '#ffb040' }), V(110, 3, 'triangle', { rate: .7 }), { ruler: true, title: 'King of Amberlyn' });
KDEF('enid', 'Lady Enid Russet', 'Enid', 'acolyte', 6, 'autumn', 'amberlyn', 'ambergate', [['jacklamp', 3], ['scarecrow', 3]],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#a85a1e' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#f0e0c0', hair: '#a8481a', pants: '#a85a1e', trim: '#a85a1e', orb: '#ffd080' }), V(250, 6, 'sine', { formant: 1.1 }));
KDEF('dagonet', 'Sir Dagonet the Motley', 'Dagonet', 'squire', 5, 'autumn', 'amberlyn', 'russetmoor', [['tusker', 3], ['jacklamp', 3]],
  L({ size: 1.1, build: 'heroic', outfit: 'tunic', hat: { style: 'pointed', color: '#e0a020' }, hair: 'short', weapon: 'sword' }, { cloth: '#c83a2a', pants: '#e0a020', hair: '#8a5a2a', trim: '#3a2a20' }), V(240, 10, 'pulse', { rate: 1.3 }));
KDEF('vesna', 'Vesna of the Lanterns', 'Vesna', 'adept', 6, 'summer', 'amberlyn', 'lanternfall', [['jacklamp', 4], ['ghoul', 3]],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'pointed', color: '#1a1a1a' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#2a2020', hair: '#101010', pants: '#e07020', trim: '#f08030', orb: '#ff9030' }), V(230, 5, 'sine', { formant: .9 }));
KDEF('lamorak', 'Sir Lamorak Ashbarrow', 'Lamorak', 'squire', 8, 'autumn', 'amberlyn', 'ashbarrow', [['ghoul', 4], ['scarecrow', 3]],
  L({ size: 1.2, build: 'bulky', armor: true, hat: 'helmet', cape: cape('#6a4a2a', '#3a2a1a'), weapon: 'sword' }, { cloth: '#5a3a2a', plate: '#8a6a50', pants: '#3a2a1a' }), V(120, 4, 'saw', { rate: .9 }));
// Hoarfast (Winter)
KDEF('mordrain', 'Duke Mordrain the Frostbitten', 'Mordrain', 'rimeduke', 7, 'winter', 'hoarfast', 'rimeholt', [['frostwyrm', 3], ['snowkit', 4]],
  L({ size: 1.25, build: 'heroic', outfit: 'coat', hair: 'long', hat: { style: 'crown', color: '#c8f0ff' }, weapon: 'staff', cape: cape('#8ac0e8', '#4a7aa8'), eyeGlow: '#a0e8ff' }, { cloth: '#e8f0f8', coat: '#d8e4f0', hair: '#ffffff', pants: '#8aa8c8', trim: '#6ab0e8', orb: '#a0f0ff' }), V(200, 12, 'saw', { vib: .03 }), { ruler: true, title: 'Duke of Hoarfast' });
KDEF('ragnell', 'Dame Ragnell Ice-Eye', 'Ragnell', 'squire', 8, 'winter', 'hoarfast', 'kestrel', [['frostwolf', 4], ['icegolem', 3]],
  L({ size: 1.25, build: 'heroic', armor: true, hat: 'helmet', hair: 'ponytail', cape: cape('#2a3a6a', '#1a2040'), weapon: 'sword' }, { cloth: '#4a5a7a', plate: '#c8d0dc', hair: '#f0f0f0', pants: '#2a3a5a' }), V(170, 2, 'square', { rate: .9 }));
KDEF('safir', 'Sir Safir the Pale', 'Safir', 'archer', 6, 'winter', 'hoarfast', 'wolfsgate', [['frostwolf', 3], ['snowkit', 3]],
  L({ size: 1.2, build: 'heroic', outfit: 'coat', hood: true, weapon: null }, { cloth: '#8a8a90', coat: '#9a9aa0', hair: '#f0f0f0', pants: '#5a5a60' }), V(170, 4, 'sine', { rate: .85 }), { bow: true });
KDEF('nimue', 'Nimue of Frostmere', 'Nimue', 'adept', 7, 'winter', 'hoarfast', 'frostmere', [['snowkit', 4], ['snowkit', 3]],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hair: 'long', weapon: 'staff', sleeves: 'long' }, { cloth: '#2a8a8a', hair: '#a8d8f0', pants: '#1a5a6a', trim: '#e0f8ff', orb: '#80f0ff' }), V(240, 7, 'sine', { vib: .02, double: 12 }));
KDEF('gorm', 'Gorm the Bear', 'Gorm', 'tamer', 5, 'autumn', 'hoarfast', 'rimeholt', [['yeti', 3], ['tusker', 3]],
  L({ size: 1.35, build: 'bulky', outfit: 'coat', hair: 'short', weapon: null }, { cloth: '#6a4a2a', coat: '#7a5a3a', hair: '#3a2a1a', pants: '#4a3a2a' }), V(80, 3, 'triangle', { rate: .8 }), { whip: true });
// The Hourless Dominion (Hour)
KDEF('meliant', 'Lord Chancellor Meliant', 'Meliant', 'chancellor', 14, 'hour', 'dominion', 'meridian', [['pendulumwyrm', 10], ['clockwork', 12, 2], ['stillwraith', 12]],
  L({ size: 1.25, build: 'heroic', outfit: 'robe', hair: 'short', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#1e1e26', hair: '#8a8a90', pants: '#2a2a32', trim: '#d8c070', orb: '#f0e0a0' }), V(130, 4, 'square', { formant: .9, rate: .9 }), { ruler: true, title: 'Lord Chancellor of the Hourless Dominion' });
KDEF('bertilak', 'Marshal Bertilak the Hourward', 'Bertilak', 'knight', 11, 'hour', 'dominion', 'midnight', [['clockwork', 10, 1], ['gearhound', 9], ['gearhound', 8]],
  L({ size: 1.3, build: 'bulky', armor: true, hat: 'helmet', cape: cape('#1a3a2a', '#0a1a10'), weapon: 'sword' }, { cloth: '#3a3020', plate: '#c8a850', pants: '#2a2418' }), V(100, 6, 'saw'));
KDEF('aurelie', 'Countess Aurelie of Vespers', 'Aurelie', 'sorcerer', 11, 'hour', 'dominion', 'vesperhall', [['stillwraith', 9], ['minute', 9], ['minute', 8]],
  L({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#6a3a8a' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#4a2a5a', hair: '#101018', pants: '#1a1a20', trim: '#c8a0e0', orb: '#c080ff' }), V(210, 5, 'sine', { rate: .75 }));
KDEF('morholt', 'Sir Morholt the Unmoving', 'Morholt', 'knight', 11, 'hour', 'dominion', 'noonspire', [['clockwork', 9], ['clockwork', 8]],
  L({ size: 1.45, build: 'bulky', armor: true, hat: 'helmet', weapon: 'sword' }, { cloth: '#1a1a1e', plate: '#3a3a42', pants: '#121216' }), V(70, 2, 'saw', { rate: .6 }));
KDEF('tic', 'Tic', 'Tic', 'ranger', 10, 'hour', 'dominion', 'dawnwatch', [['gearhound', 8], ['minute', 8]],
  L({ size: 1, build: 'chibi', armor: true, hat: 'cap', weapon: null }, { cloth: '#c8a040', plate: '#d8b050', pants: '#6a5a3a', hair: '#3a3020' }), V(420, 5, 'pulse', { rate: 1.4 }), { bow: true });
KDEF('tac', 'Tac', 'Tac', 'ranger', 10, 'hour', 'dominion', 'dawnwatch', [['gearhound', 8], ['minute', 8]],
  L({ size: 1, build: 'chibi', armor: true, hat: 'cap', weapon: null }, { cloth: '#6a5a3a', plate: '#a08040', pants: '#c8a040', hair: '#3a3020' }), V(360, 5, 'pulse', { rate: 1.4 }), { bow: true });
KDEF('graynight', 'The Gray Knight, Sir Nonesuch', 'Gray Knight', 'graynight', 25, 'hour', 'dominion', null, [['minute', 14, 2], ['minute', 14, 2], ['minute', 14, 2], ['pendulumwyrm', 14, 1]],
  L({ size: 1.6, build: 'heroic', armor: true, hat: 'helmet', cape: { len: 8, width: 6, seg: 3, c: '#6a6a70', i: '#3a3a40' }, weapon: 'sword', bladeLen: 11, eyeGlow: '#ffffff', hair: 'bald' }, { cloth: '#5a5a62', plate: '#8a8a92', metal: '#d0d0d8', pants: '#3a3a42', skin: '#4a4a52', hair: '#3a3a42', eye: '#ffffff', iris: '#ffffff' }), V(70, 3, 'saw', { rate: .7, double: -7 }), { boss: true, halo: true });
// Free knights
KDEF('lunete', 'Princess Lunete of Meridian', 'Lunete', 'hourmaiden', 8, 'hour', null, null, [],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#f4f0e8', hair: '#f0d070', pants: '#d8c070', trim: '#d8c070', orb: '#fff0b0' }), V(300, 6, 'sine', { formant: 1.3 }), { free: true });
KDEF('galeron', 'Sir Galeron the Wanderer', 'Galeron', 'knight', 10, 'spring', null, null, [['frostwolf', 8]],
  L({ size: 1.25, build: 'heroic', armor: true, hair: 'short', cape: cape('#5a7a4a', '#3a4a2a'), weapon: 'sword' }, { cloth: '#6a7a5a', plate: '#9a9aa0', hair: '#6a4a2a', pants: '#3a4a3a' }), V(180, 5, 'pulse', { rate: .9 }), { free: true, wander: ['winter', 'spring'] });
KDEF('blanchefleur', 'Blanchefleur the Sellsword', 'Blanchefleur', 'ranger', 10, 'autumn', null, null, [['sunmane', 8]],
  L({ size: 1.2, build: 'heroic', outfit: 'coat', hair: 'short', weapon: null }, { cloth: '#8a4a2a', coat: '#7a3a1a', hair: '#f0d080', pants: '#4a2a1a' }), V(260, 5, 'square', { rate: 1.2 }), { free: true, bow: true, wander: ['summer', 'autumn'] });
KDEF('owain', 'Owain the Dragonless', 'Owain', 'beastlord', 11, 'summer', null, null, [],
  L({ size: 1.25, build: 'bulky', outfit: 'coat', hair: 'short', weapon: null }, { cloth: '#6a4a3a', coat: '#5a3a2a', hair: '#2a1a10', pants: '#3a2a20' }), V(140, 4, 'saw', { rate: .9 }), { free: true, whip: true });
KDEF('ettard', 'Sister Ettard', 'Ettard', 'priest', 10, 'winter', null, null, [['snowkit', 7]],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hood: true, weapon: 'staff', sleeves: 'long' }, { cloth: '#e8f0f8', hair: '#4a6aa8', pants: '#4a6aa8', trim: '#4a6aa8', orb: '#c0e0ff' }), V(260, 5, 'square', { rate: 1.1 }), { free: true, wander: ['winter', 'autumn'] });
// Brigand captains
const BRIG = (id, name, short, lvl, elem, castle, troop, cl, voice) => KDEF(id, name, short, 'brigand', lvl, elem, 'brigands', castle, troop,
  L({ size: 1.2, build: 'bulky', outfit: 'coat', hair: 'spiky', hat: { style: 'band', color: cl.band }, weapon: 'sword' }, cl), voice, { captain: true });
BRIG('hob', 'Hob Mudspur', 'Hob', 5, 'winter', 'thawgate', [['snowkit', 4], ['frostwolf', 4], ['bat', 3], ['slime', 3]], { cloth: '#6a5a4a', coat: '#5a4a3a', hair: '#8a6a3a', pants: '#3a3a3a', band: '#6ab0e8' }, V(200, 8, 'pulse', { rate: 1.2 }));
BRIG('gerrow', 'Mother Gerrow', 'Gerrow', 5, 'spring', 'beltane', [['slime', 4], ['harpy', 4], ['sproutling', 3], ['bat', 3]], { cloth: '#7a6a5a', coat: '#6a5a4a', hair: '#c8c8c8', pants: '#4a4a3a', band: '#4caf50' }, V(230, 6, 'triangle', { rate: .9 }));
BRIG('dafydd', 'Red Dafydd', 'Dafydd', 6, 'summer', 'lammas', [['ogre', 4], ['skeleton', 4], ['salamander', 3]], { cloth: '#8a3a2a', coat: '#7a2a1a', hair: '#c83a1a', pants: '#3a2a2a', band: '#e0a020' }, V(150, 7, 'square', { rate: 1.1 }));
BRIG('abbot', 'The Hollow Abbot', 'Abbot', 6, 'autumn', 'hallowmere', [['skeleton', 5], ['ghoul', 4], ['bat', 4]], { cloth: '#4a4a4a', coat: '#3a3a3a', hair: '#e0e0e0', pants: '#2a2a2a', band: '#c86a1e' }, V(100, 5, 'triangle', { rate: .7, vib: .02 }));
KDEF('sergeant', 'The Patrol Sergeant', 'Sergeant', 'brigand', 3, 'summer', 'brigands', null, [['slime', 2], ['bat', 3], ['bat', 2], ['skeleton', 3]],
  L({ size: 1.15, build: 'bulky', outfit: 'coat', hair: 'short', hat: 'cap', weapon: 'sword' }, { cloth: '#5a4a3a', coat: '#4a3a2a', hair: '#3a2a1a', pants: '#2a2a2a' }), V(160, 5, 'square'), { captain: true });
// narrators and the sleeping Keeper (speakers, not soldiers)
G.def('speaker', 'narrator', { name: '', color: '#b8b0c8', voice: null });
G.def('speaker', 'keeper', { name: 'The Keeper', color: '#f0e8d8', voice: V(150, 3, 'triangle', { rate: .7 }), look: L({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'crown', color: '#d8c070' }, weapon: null, sleeves: 'long' }, { cloth: '#f0e8d8', hair: '#f0f0f0', pants: '#d8c070', trim: '#d8c070' }) });
G.def('speaker', 'herald', { name: 'Herald', color: '#f0d880', voice: V(200, 5, 'pulse'), look: L({ size: 1.1, build: 'heroic', outfit: 'tunic', hat: 'cap', hair: 'short', weapon: null }, { cloth: '#a08040', pants: '#5a4a3a', hair: '#5a3a2a' }) });

// ---- 07-data-world.js ----
/* ---- THE WORLD: Forseason (§6.1-6.4, §6.11). Positions in world units on a 1024 × 1024 map ---- */
const RE = (id, name, short, season, main, trim, sigil, banner, ruler, capital, o = {}) => G.def('realm', id, Object.assign({ name, short, season, main, trim, sigil, banner, ruler, capital }, o));
RE('verdance', 'Kingdom of Verdance', 'Verdance', 'spring', '#4caf50', '#f0e6c8', 'blossom', 'swallowtail', 'gareth', 'avalorn', { aggression: 1, pitch: ['The orchard prince would wake the Keeper', 'and restore the Concord of the Wheel.'] });
RE('solmark', 'Sun-March of Solmark', 'Solmark', 'summer', '#e0a020', '#b02a2a', 'sun', 'square', 'morgause', 'brazenhold', { aggression: 1.15, pitch: ['A war-loving queen would take the Wheel', 'and set it to a summer of her own.'] });
RE('amberlyn', 'Harvest Throne of Amberlyn', 'Amberlyn', 'autumn', '#c86a1e', '#5a3a2a', 'leaf', 'pointed', 'pellam', 'ambergate', { aggression: .85, pitch: ['An old, quiet king would end the war', 'with the fewest dead.'] });
RE('hoarfast', 'Duchy of Hoarfast', 'Hoarfast', 'winter', '#6ab0e8', '#e8f4ff', 'snowflake', 'triangle', 'mordrain', 'rimeholt', { aggression: 1.1, pitch: ['A mad duke would welcome a winter', 'where nothing rots and nothing ends.'] });
RE('dominion', 'Hourless Dominion', 'Dominion', 'hour', '#4a4a58', '#d8c070', 'hourglass', 'long', 'meliant', 'meridian', { ai: true });
RE('brigands', 'Free Companies', 'Brigands', null, '#7a6a5a', '#2a2a2a', 'axes', 'ragged', null, null, { ai: true });
G.PLAYABLE = ['verdance', 'solmark', 'amberlyn', 'hoarfast'];

const CA = (id, name, region, tier, owner, mana, map, circle, site, treasury, pos) => G.def('castle', id, { name, region, tier, owner, mana, map, circle, site, treasury, pos });
CA('meridian', 'Meridian', 'hour', 'capital', 'dominion', 60, 'meridian_clockyard', ['minute', 'clockwork', 'gearhound', 'stillwraith', 'pendulumwyrm'], 'sleepingcourt', 'hourglassrod', [512, 512]);
CA('midnight', 'Midnight Keep', 'hour', 'satellite', 'dominion', 30, 'hill_fort', ['minute', 'stillwraith', 'gearhound'], 'bellnoring', 'writ', [512, 392]);
CA('dawnwatch', 'Dawnwatch', 'hour', 'satellite', 'dominion', 30, 'hill_fort', ['minute', 'clockwork', 'gearhound'], 'sunrisestair', 'spurs', [632, 512]);
CA('noonspire', 'Noonspire', 'hour', 'satellite', 'dominion', 30, 'crossroads', ['clockwork', 'gearhound', 'minute'], 'shadowless', 'signet', [512, 632]);
CA('vesperhall', 'Vesper Hall', 'hour', 'satellite', 'dominion', 30, 'ruined_abbey', ['stillwraith', 'minute', 'clockwork'], 'evensong', 'writ', [392, 512]);
CA('rimeholt', 'Rimeholt', 'winter', 'capital', 'hoarfast', 40, 'capital_citadel', ['snowkit', 'frostwolf', 'icegolem', 'yeti', 'frostwyrm:winter'], 'silentbells', 'frostplate', [512, 92]);
CA('wolfsgate', 'Wolfsgate', 'winter', 'flank', 'hoarfast', 20, 'mountain_pass', ['frostwolf', 'snowkit', 'yeti'], 'howlingscar', 'wintershard', [352, 235]);
CA('frostmere', 'Frostmere', 'winter', 'flank', 'hoarfast', 20, 'lakeside', ['snowkit', 'icegolem', 'frostwolf'], 'nimuesmere', 'wardingcharm', [672, 235]);
CA('kestrel', 'Kestrel Spire', 'winter', 'inner', 'hoarfast', 25, 'forest_hold', ['frostwolf', 'yeti', 'snowkit'], 'kestreleyrie', 'yewlongbow', [512, 277]);
CA('avalorn', 'Avalorn', 'spring', 'capital', 'verdance', 40, 'capital_citadel', ['sproutling', 'pixie', 'unicorn', 'treant', 'rillserpent:spring'], 'queensorchard', 'robeofseasons', [932, 512]);
CA('thornwick', 'Thornwick', 'spring', 'flank', 'verdance', 20, 'forest_hold', ['sproutling', 'treant', 'pixie'], 'briarmaze', 'thornmail', [789, 352]);
CA('rainmere', 'Rainmere', 'spring', 'flank', 'verdance', 20, 'river_ford', ['rillserpent', 'sproutling', 'pixie'], 'weepingweir', 'springseed', [789, 672]);
CA('primrose', 'Primrose Ford', 'spring', 'inner', 'verdance', 25, 'lakeside', ['unicorn', 'pixie', 'sproutling'], 'unicornglade', 'tomeofthaw', [747, 512]);
CA('brazenhold', 'Brazenhold', 'summer', 'capital', 'solmark', 40, 'capital_citadel', ['salamander', 'cinderhound', 'sunbird', 'sunmane', 'wyvern:summer'], 'furnacevaults', 'sunforged', [512, 932]);
CA('goldspur', 'Goldspur', 'summer', 'flank', 'solmark', 20, 'crossroads', ['salamander', 'cinderhound', 'wyvern:summer'], 'wyvernroost', 'summerember', [672, 789]);
CA('cinderwall', 'Cinderwall', 'summer', 'flank', 'solmark', 20, 'mountain_pass', ['cinderhound', 'salamander', 'sunmane'], 'ashdunes', 'hauberk', [352, 789]);
CA('lionsreach', 'Lionsreach', 'summer', 'inner', 'solmark', 25, 'hill_fort', ['sunmane', 'sunbird', 'cinderhound'], 'lionsteps', 'bannerpin', [512, 747]);
CA('ambergate', 'Ambergate', 'autumn', 'capital', 'amberlyn', 40, 'capital_citadel', ['jacklamp', 'scarecrow', 'ghoul', 'tusker', 'griffin:autumn'], 'harvestvault', 'lanternstaff', [92, 512]);
CA('ashbarrow', 'Ashbarrow', 'autumn', 'flank', 'amberlyn', 20, 'ruined_abbey', ['ghoul', 'jacklamp', 'scarecrow'], 'barrowdowns', 'autumnacorn', [235, 352]);
CA('russetmoor', 'Russetmoor', 'autumn', 'flank', 'amberlyn', 20, 'marsh_keep', ['tusker', 'jacklamp', 'scarecrow'], 'russetbog', 'horseshoe', [235, 672]);
CA('lanternfall', 'Lanternfall', 'autumn', 'inner', 'amberlyn', 25, 'forest_hold', ['jacklamp', 'ghoul', 'scarecrow'], 'lanternroad', 'mendingring', [277, 512]);
CA('thawgate', 'Thawgate', 'thaw', 'cross', 'brigands', 30, 'river_ford', ['snowkit', 'sproutling', 'slime', 'bat'], 'breakingice', 'draught', [756, 268]);
CA('beltane', 'Beltane Ford', 'beltane', 'cross', 'brigands', 30, 'marsh_keep', ['sproutling', 'salamander', 'slime', 'harpy'], 'oldmill', 'amuletoftides', [756, 756]);
CA('lammas', 'Lammas Cross', 'lammas', 'cross', 'brigands', 30, 'crossroads', ['salamander', 'scarecrow', 'skeleton', 'ogre'], 'lammasfair', 'thornwhip', [268, 756]);
CA('hallowmere', 'Hallowmere', 'hallow', 'cross', 'brigands', 30, 'ruined_abbey', ['jacklamp', 'snowkit', 'skeleton', 'bat'], 'hollowcrypts', 'hawthornbow', [268, 268]);
// the seasons of a region: a cross-quarter castle's bonus applies in both of its seasons
G.REGION_SEASONS = { winter: ['winter'], spring: ['spring'], summer: ['summer'], autumn: ['autumn'], hour: [], thaw: ['winter', 'spring'], beltane: ['spring', 'summer'], lammas: ['summer', 'autumn'], hallow: ['autumn', 'winter'] };
G.REGION_DRESS = { winter: 'winter', spring: 'spring', summer: 'summer', autumn: 'autumn', hour: 'hour', thaw: 'winter', beltane: 'spring', lammas: 'summer', hallow: 'autumn' };
G.ROADS = [
  ['rimeholt', 'wolfsgate'], ['rimeholt', 'frostmere'], ['wolfsgate', 'kestrel'], ['frostmere', 'kestrel'],
  ['avalorn', 'thornwick'], ['avalorn', 'rainmere'], ['thornwick', 'primrose'], ['rainmere', 'primrose'],
  ['brazenhold', 'goldspur'], ['brazenhold', 'cinderwall'], ['goldspur', 'lionsreach'], ['cinderwall', 'lionsreach'],
  ['ambergate', 'ashbarrow'], ['ambergate', 'russetmoor'], ['ashbarrow', 'lanternfall'], ['russetmoor', 'lanternfall'],
  ['thawgate', 'frostmere'], ['thawgate', 'thornwick'], ['beltane', 'rainmere'], ['beltane', 'goldspur'],
  ['lammas', 'cinderwall'], ['lammas', 'russetmoor'], ['hallowmere', 'ashbarrow'], ['hallowmere', 'wolfsgate'],
  ['kestrel', 'midnight'], ['primrose', 'dawnwatch'], ['lionsreach', 'noonspire'], ['lanternfall', 'vesperhall'],
  ['midnight', 'dawnwatch'], ['dawnwatch', 'noonspire'], ['noonspire', 'vesperhall'], ['vesperhall', 'midnight'],
  ['meridian', 'midnight'], ['meridian', 'dawnwatch'], ['meridian', 'noonspire'], ['meridian', 'vesperhall']];
G.adj = {};
for (const [a, b] of G.ROADS) { (G.adj[a] = G.adj[a] || []).push(b); (G.adj[b] = G.adj[b] || []).push(a); }
G.YIELD = { capital: 40, inner: 25, flank: 20, cross: 30, satellite: 30 };

// quest sites: castle, seasons away, focus (+10 to that outcome), extras
const SI = (id, name, castle, away, focus, o = {}) => G.def('site', id, Object.assign({ name, castle, away, focus }, o));
SI('silentbells', 'The Lake of Silent Bells', 'rimeholt', 2, 'training'); SI('howlingscar', 'The Howling Scar', 'wolfsgate', 1, 'beast');
SI('nimuesmere', "Nimue's Mere", 'frostmere', 1, 'treasure', { ettard: true }); SI('kestreleyrie', 'The Kestrel Eyrie', 'kestrel', 2, 'wanderer');
SI('queensorchard', "The Queen's Orchard", 'avalorn', 1, 'treasure'); SI('briarmaze', 'The Briar Maze', 'thornwick', 1, 'beast', { beasts: { unicorn: 2 } });
SI('weepingweir', 'The Weeping Weir', 'rainmere', 1, 'beast', { addBeast: ['rillserpent'] }); SI('unicornglade', 'The Unicorn Glade', 'primrose', 2, 'beast', { beasts: { unicorn: 3 } });
SI('furnacevaults', 'The Furnace Vaults', 'brazenhold', 1, 'treasure'); SI('wyvernroost', 'The Wyvern Roost', 'goldspur', 2, 'beast', { addBeast: ['wyvern'] });
SI('ashdunes', 'The Ash Dunes', 'cinderwall', 1, 'mana'); SI('lionsteps', 'The Lion Steps', 'lionsreach', 1, 'wanderer', { beasts: { sunmane: 2 } });
SI('harvestvault', 'The Harvest Vault', 'ambergate', 1, 'treasure'); SI('barrowdowns', 'The Barrow Downs', 'ashbarrow', 1, 'beast', { mishap: 5 });
SI('russetbog', 'The Russet Bog', 'russetmoor', 1, 'beast', { beasts: { tusker: 2 } }); SI('lanternroad', 'The Lantern Road', 'lanternfall', 2, 'wanderer', { ettard: true });
SI('breakingice', 'The Breaking Ice', 'thawgate', 1, 'mana', { addItem: ['draught'] }); SI('oldmill', 'The Old Mill of Beltane', 'beltane', 1, 'treasure', { story: 'lunete_joins', storyFlag: 'mill_open' });
SI('lammasfair', 'The Lammas Fair', 'lammas', 1, 'wanderer', { story: 'blanchefleur_hire' }); SI('hollowcrypts', 'The Hollow Abbey Crypts', 'hallowmere', 2, 'treasure', { addBeast: ['skeleton', 'bat'], ettard: true });
SI('bellnoring', "The Bell That Doesn't Ring", 'midnight', 2, 'treasure'); SI('sunrisestair', 'The Sunrise Stair', 'dawnwatch', 1, 'treasure');
SI('shadowless', 'The Shadowless Square', 'noonspire', 1, 'mana'); SI('evensong', 'The Evensong Crypt', 'vesperhall', 2, 'treasure');
SI('sleepingcourt', 'The Sleeping Court', 'meridian', 2, 'treasure', { keeperVignette: true });
G.POOLS = {
  winter: { items: ['herb', 'wintershard', 'rimesteel', 'frostplate', 'wardingcharm', 'yewlongbow'], beasts: ['snowkit', 'frostwolf', 'yeti', 'bat'], wanderers: ['galeron', 'ettard'] },
  spring: { items: ['herb', 'springseed', 'tomeofthaw', 'hawthornbow', 'spurs', 'willowstaff'], beasts: ['sproutling', 'pixie', 'unicorn', 'slime'], wanderers: ['galeron'] },
  summer: { items: ['herb', 'summerember', 'sunforged', 'hauberk', 'bannerpin', 'cleaver'], beasts: ['salamander', 'cinderhound', 'sunbird', 'sunmane'], wanderers: ['blanchefleur'] },
  autumn: { items: ['herb', 'autumnacorn', 'lanternstaff', 'horseshoe', 'robeofseasons', 'jerkin'], beasts: ['jacklamp', 'scarecrow', 'ghoul', 'tusker'], wanderers: ['blanchefleur', 'ettard'] },
  hour: { items: ['ether', 'writ', 'hourglassrod', 'signet', 'amuletoftides', 'spurs'], beasts: ['minute', 'gearhound'], wanderers: [] }
};
G.QUEST_OUTCOMES = [['treasure', 30], ['beast', 20], ['wanderer', 10], ['mana', 15], ['training', 15], ['mishap', 10]];
G.START_ITEMS = { verdance: ['herb', 'herb', 'remedy', 'springseed'], solmark: ['herb', 'herb', 'remedy', 'summerember'], amberlyn: ['herb', 'herb', 'remedy', 'autumnacorn'], hoarfast: ['herb', 'herb', 'remedy', 'wintershard'], dominion: ['ether', 'ether', 'ether'], brigands: [] };
G.START_RESERVE = { avalorn: [['sproutling', 2], ['sproutling', 2]], brazenhold: [['salamander', 2], ['salamander', 2]], ambergate: [['jacklamp', 2], ['jacklamp', 2]], rimeholt: [['snowkit', 2], ['snowkit', 2]], meridian: [['minute', 10], ['minute', 10]] };

// ---- 08-data-maps.js ----
/* ---- BATTLE MAPS (§6.10): rows top first, one character per hex (terrain codes in 01); anchors 1 2 3 attacker, 7 8 9
 * defender (or seats 1-4). Odd rows sit half a hex right. flood: shallows become deep water in Spring ---- */
const MAP = (id, name, rows, o = {}) => G.def('map', id, Object.assign({ name, rows, blockShape: 'hexblock' }, o));
MAP('border_meadow', 'Border Meadow', [
  '..f.....h.ff.',
  '.ff.1.....~.f',
  '......f...~h.',
  '..2..f...~...',
  ',,,,,,,,,b,K7',
  '....f....~.8.',
  '.f.......~h..',
  '..h..f...~..f',
  '...f.....~.ff']);
MAP('river_ford', 'River Ford', [
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
  'ff..h..w...hfff'], { flood: true });
MAP('forest_hold', 'Forest Hold', [
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
  '.ff......ff..ff']);
MAP('mountain_pass', 'Mountain Pass', [
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
  'mmmmmmmmmmmmmmm'], { blockShape: 'cliff' });
MAP('hill_fort', 'Hill Fort', [
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
  '...fffff.....ff']);
MAP('marsh_keep', 'Marsh Keep', [
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
  '......sss...ss.'], { flood: true });
MAP('lakeside', 'Lakeside', [
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
  '.ff.ff.......ff']);
MAP('ruined_abbey', 'Ruined Abbey', [
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
  '..ff.........ff']);
MAP('crossroads', 'Crossroads', [
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
  'f......,.....f.'], { blockShape: 'cottage' });
MAP('capital_citadel', 'Capital Citadel', [
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
  '.ff.,,ff......fff']);
MAP('meridian_clockyard', 'Meridian Clockyard', [
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
  '..,,...........rr'], { blockShape: 'gear', hour: true });
MAP('clockwork_sanctum', 'Clockwork Sanctum', [
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
  '###############'], { blockShape: 'gear', hour: true, sanctum: true });
MAP('wheel_shrine', 'Wheel Shrine', [
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
  'F.....F...h....'], { seats: true });
// a map's parsed form: terrain codes per hex and anchors
G.parseMap = id => {
  const m = G.get('map', id), h = m.rows.length, w = m.rows[0].length, cells = [], anchors = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = m.rows[y][x];
    if (/[1-9]/.test(ch)) { anchors[ch] = [x, y]; const nb = G.hex.neighbors([x, y]).filter(([a, b]) => b >= 0 && b < h && a >= 0 && a < w).map(([a, b]) => m.rows[b][a]); cells.push(nb.includes('g') ? 'g' : nb.includes(',') ? ',' : '.'); }
    else cells.push(ch);
  }
  return { id, w, h, cells, anchors, keep: (() => { const out = []; cells.forEach((c, i) => { if (c === 'K') out.push([i % w, Math.floor(i / w)]); }); return out; })() };
};

// ---- 09-data-story.js ----
/* ---- STORY (§6.12). An event: { when, realm ('world' | 'player' | a realm id), if(sim, realm), priority, stage, lines,
 * choices: [{ text, effects }], effects }. A line: [speaker, text, { emote, expr, pose }]. Speakers: knight ids, 'narrator',
 * 'keeper', 'herald', 'RULER' (the realm's ruler) and 'KNIGHT' (a knight of the realm). Effects are data the campaign
 * applies (saved, replayable). Lines may be a function (sim, realm) -> lines. */
const EV = (id, o) => G.def('event', id, Object.assign({ priority: 50, realm: 'player', stage: 'road', once: true, effects: [] }, o));
const N = t => ['narrator', '{c=#b8b0c8}' + t + '{/c}'];
const RULERS = { verdance: 'gareth', solmark: 'morgause', amberlyn: 'pellam', hoarfast: 'mordrain' };
const SQUIRE = { verdance: 'lynette', solmark: 'agravain', amberlyn: 'lamorak', hoarfast: 'ragnell' };
G.RULERS = RULERS; G.SQUIRE = SQUIRE;
const is = (s, season, year) => s.season() === season && s.state.year === year;
G.PROLOGUE = [
  'In the Age of the Wheel, four crowns kept one calendar.',
  '{c=#7ad860}Spring{/c} to Verdance. {c=#f0c040}Summer{/c} to Solmark. {c=#e08030}Autumn{/c} to Amberlyn. {c=#a8d8ff}Winter{/c} to Hoarfast.',
  'And in Meridian, the Calendar City, the Keeper of the Wheel wound the Great Clock, that each season might yield to the next.',
  'Last winter the Keeper fell into a sleep no physician could break, and the Great Clock began to falter.',
  'From the silent city rode Lord Chancellor Meliant, beneath a banner with no season.',
  '"When the Thirteenth Month comes," he swore, "I will stop the Wheel, and no one we love will ever grow old."',
  'Four crowns answered with steel. Every knight became a brigand; every road, a war.',
  'The chroniclers named the age the {c=#d8c070}Brigantime{/c}.'];

EV('open_verdance', { when: 'tidings', realm: 'verdance', priority: 100, stage: 'orchard', title: 'The Last Blossom', if: s => is(s, 'spring', 1), lines: [
  N('Avalorn, the orchard court of Verdance. Spring, Year 1 of the Brigantime.'),
  ['amris', 'Your mother asked to rest beneath the oldest apple, my prince. It has not blossomed since the Clock faltered.'],
  ['gareth', 'Then it will blossom when the Wheel turns again. Not before.'],
  ['lynette', "Brave words. Solmark is sharpening its swords, and Hoarfast's Duke laughs alone in his ice hall."],
  ['gareth', 'Let them. We do not ride to take a throne, Lynette. We ride to wake a king.'],
  ['pelleas', 'And should a throne fall into our laps along the way? I ask only for the ballads.', { emote: 'note' }],
  ['wren', "The unicorns won't graze. They smell the Clock's sickness on the east wind."],
  ['gareth', 'Then we march before the petals fall. {shake}Sound the horn!{/shake}', { pose: 'cheer' }]],
  effects: [{ toast: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.' }] });
EV('open_solmark', { when: 'tidings', realm: 'solmark', priority: 100, stage: 'sunhall', title: 'Noon Without End', if: s => is(s, 'spring', 1), lines: [
  N('Brazenhold, the furnace-throne of Solmark. Spring, Year 1 of the Brigantime.'),
  ['hesper', 'Majesty, the Chancellor promises the Wheel will stop. Imagine it: a summer without end.'],
  ['morgause', 'I have imagined it, Hesper. Every harvest burned to dust. Every child born into drought.'],
  ['agravain', 'Then we take Meridian and set the Wheel ourselves! Our summer, on our terms!', { emote: '!' }],
  ['morgause', 'Now you sound like a Solmarker. {w=.4}A long noon, Sir Agravain, is still a noon that ends.'],
  ['elidure', 'The brigands at Beltane and Lammas grow fat on our roads. Shall I clear them, my queen?'],
  ['brennoc', "Take the wyverns. They've not flown proper since the Clock went sick."],
  ['morgause', 'We march. Let every crown in Forseason learn what the sun can do.', { pose: 'cheer' }]],
  effects: [{ toast: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.' }] });
EV('open_amberlyn', { when: 'tidings', realm: 'amberlyn', priority: 100, stage: 'harvesthall', title: 'The Quiet King', if: s => is(s, 'spring', 1), lines: [
  N('Ambergate, the harvest hall of Amberlyn. Spring, Year 1 of the Brigantime.'),
  ['lamorak', "The granaries stand half full, Majesty. The rest rotted where the Clock's sickness touched the fields."],
  ['enid', 'Father has not slept. He watches the old sundial in the garden, as if it might tell him something.'],
  ['dagonet', "It tells me it's noon, my lady. But it told me that yesterday as well.", { emote: 'note' }],
  ['vesna', 'The lanterns on the Lantern Road burn blue now. The dead grow restless when time limps.'],
  ['pellam', '{w=.8}...', { emote: 'dots' }],
  ['pellam', 'We will end this.'],
  ['lamorak', 'Then we ride, my king. Four words from you are worth a hundred from any other crown.']],
  effects: [{ toast: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.' }] });
EV('open_hoarfast', { when: 'tidings', realm: 'hoarfast', priority: 100, stage: 'icehall', title: 'A Crown of Icicles', if: s => is(s, 'spring', 1), lines: [
  N('Rimeholt, the frozen court of Hoarfast. Spring, Year 1 of the Brigantime. The snow has not melted.'),
  ['mordrain', 'Ragnell! What has a face and hands, and never stops running?', { emote: '?' }],
  ['ragnell', 'A clock, Your Grace. You asked me yesterday.'],
  ['mordrain', 'Did I? Then the clock has not stopped yet. Pity. {w=.3}In winter nothing rots, Ragnell. Nothing ends.'],
  ['nimue', 'The Chancellor would agree with you, Duke. That is what frightens me.'],
  ['gorm', "My yeti won't eat. They don't like the stopped hour. I don't like it either."],
  ['safir', 'Wolves are out of Thawgate, and brigands ride with them.'],
  ['mordrain', 'Then we go hunting! Safir, the bows. Ragnell, the banners. Gorm, bring the bears.', { pose: 'cheer' }],
  ['ragnell', 'And I shall bring the sense. As always.']],
  effects: [{ toast: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.' }] });
EV('tutorial', { when: 'tidings', priority: 90, stage: 'road', title: 'The Border Road', if: (s, r) => is(s, 'spring', 1) && G.PLAYABLE.includes(r) && !s.state.flags.tutorialDone, lines: (s, r) => [
  N('The border road, at first light.'),
  ['herald', 'My liege! A brigand patrol blocks the border road. Their sergeant demands a toll.'],
  [RULERS[r], { verdance: 'Then we shall pay it in steel. Lynette, with me.', solmark: 'A toll? Agravain, show him the coin of Solmark.', amberlyn: '...Lamorak.', hoarfast: 'A toll! How quaint. Ragnell, collect it from his hide.' }[r]]],
  choices: [{ text: 'Ride out (tutorial battle)', effects: [{ tutorial: true }] }, { text: 'Let the guards handle it', effects: [{ flag: 'tutorialDone' }] }] });
EV('banner_without_season', { when: 'tidings', realm: 'world', priority: 80, stage: 'clock', if: s => is(s, 'spring', 1), lines: [
  N('Meridian. Within the Great Clock, the hands tremble between two seconds.'),
  ['meliant', 'Do you hear it, Sir Nonesuch? Every tick is a funeral bell.'],
  ['graynight', 'I hear nothing, Chancellor. That is the gift I bring.'],
  ['meliant', 'My wife died in the turning of an autumn. My son, in a winter. I will not give the Wheel another year.'],
  ['graynight', 'Then hold the city until the Thirteenth Month. When it comes, the hands will stop. So will grief.'],
  ['meliant', 'The four crowns will come for it.'],
  ['graynight', 'Let them spend their springs and summers on one another. {s=12}Time is the only army I need.{/s}']] });
EV('free_companies', { when: 'march', priority: 30, stage: 'tent', if: s => true, lines: (s, r) => [
  ['herald', 'My liege, the Free Companies hold the cross-quarter roads: Thawgate, Beltane, Lammas and Hallowmere.'],
  ['herald', 'Choose a castle next to one of ours, then up to three knights to march on it.'],
  ['herald', 'In battle, the attacker has {c=#ffd040}twelve bells{/c}. Fell their knights, or stand on the {c=#ffd040}Keep{/c} at the last bell.']] });
EV('first_victory', { when: 'afterBattle', priority: 30, stage: 'tent', if: (s, r, b) => b && b.won, lines: (s, r) => [
  ['RULER', 'The field is ours. Remember this day.', { pose: 'cheer' }],
  ['KNIGHT', 'Our beasts grow with every fight, my liege. At level 12 a monster takes its second form, sooner with a Season Seed.'],
  ['KNIGHT', 'And a knight of level 10 may take a new class at Muster.']] });
EV('first_loss', { when: 'afterBattle', priority: 30, stage: 'tent', if: (s, r, b) => b && !b.won, lines: (s, r) => [
  ['RULER', 'We are beaten. {w=.4}Count the fallen.', { expr: 'wince' }],
  ['KNIGHT', 'A wounded knight mends in a season, my liege. A monster that falls is gone for good.'],
  ['KNIGHT', 'When a fight goes ill, a knight may Retreat, and you may Delegate a battle you need not watch.']] });
EV('long_winter', { when: 'tidings', realm: 'world', priority: 60, stage: 'icehall', if: s => is(s, 'winter', 1), lines: [
  N('Winter, Year 1. The thaw did not come.'),
  ['mordrain', 'Snow on snow on snow! Do you hear it, Ragnell? The world is holding its breath!', { pose: 'cheer' }],
  ['ragnell', 'I hear the granaries emptying, Your Grace.'],
  ['herald', 'The Long Winter: the {c=#a8d8ff}Winter Tide{/c} is doubled this season.']], effects: [{ flag: 'longWinter' }] });
EV('candle_lit', { when: 'tidings', realm: 'world', priority: 95, stage: 'clock', if: s => is(s, 'spring', 2), lines: s => [
  N('Meridian. Spring, Year 2 of the Brigantime.'),
  ['graynight', 'A candle of hours, Chancellor. ' + s.state.candleMax + ' seasons tall. When it is ash, the Thirteenth Month begins.'],
  ['meliant', 'And the Keeper?'],
  ['graynight', 'He will sleep through the end of time. Is that not a mercy?', { emote: 'dots' }]], effects: [{ lightCandle: true }] });
EV('dominion_awakens', { when: 'tidings', realm: 'world', priority: 70, stage: 'tent', if: s => is(s, 'summer', 2), lines: [
  N('Midnight Keep. Summer, Year 2.'),
  ['bertilak', 'Sound the brass. The Hour marches.'],
  ['bertilak', 'To the four crowns, my compliments. I shall kill you slowly, and with every respect.', { pose: 'cheer' }]], effects: [{ aiFlag: ['dominion', 'awake', true] }] });
EV('lunete_letter', { when: 'tidings', priority: 50, stage: 'road', if: (s, r) => G.PLAYABLE.includes(r) && !s.state.knights.lunete && ((is(s, 'autumn', 1) && ['rainmere', 'goldspur', 'beltane'].some(c => s.owner(c) === r)) || (s.state.year === 2 && s.season() === 'spring')), lines: (s, r) => [
  N('A letter, sealed with brass wax and no crest.'),
  ['KNIGHT', '"The Keeper\'s daughter lives. Seek the Old Mill at Beltane Ford. Come quietly. -L."'],
  ['RULER', 'The princess... alive. Then the Wheel has an heir.', { emote: '!' }]], effects: [{ flag: 'mill_open' }, { toast: 'Quest at the Old Mill of Beltane: send a knight from Beltane Ford or a castle beside it.' }] });
EV('lunete_joins', { when: 'questReturn', priority: 60, stage: 'stable', if: s => !s.state.knights.lunete, lines: [
  N('The Old Mill of Beltane. The wheel turns on, though the river barely moves.'),
  ['gerrow', 'Take her, then. She eats more than my bats.'],
  ['lunete', 'Mother Gerrow kept me hidden all winter. She will not say so, but she was kind.'],
  ['lunete', 'I am no prize, my lord. I am a promise.']], effects: [{ addKnight: 'lunete' }] });
EV('lunete_arrives', { when: 'tidings', priority: 55, stage: 'road', if: (s, r) => is(s, 'spring', 3) && !s.state.knights.lunete && G.PLAYABLE.includes(r), lines: [
  N('Your capital, at dusk. A girl walks in alone, soaked from the road.'),
  ['lunete', 'Forgive me, I could not wait for a letter to be answered. The Clock is failing faster.'],
  ['lunete', 'I am Lunete of Meridian. Let me ride with you.']], effects: [{ addKnight: 'lunete' }] });
const brigYield = (id, cap, castle, lines) => EV('brigands_no_more_' + id, { when: 'capture', priority: 60, stage: 'road', if: (s, r, b) => b && b.castle === castle, lines,
  choices: [{ text: 'Take the oath', effects: [{ addKnight: cap }] }, { text: 'Exile them', effects: [{ mana: 60 }, { toast: '+60 mana from the brigand hoard.' }] }] });
brigYield('hob', 'hob', 'thawgate', [['hob', "All right, all right! I yield! Mind the boots, they're new.", { emote: '!' }], ['RULER', 'You robbed our roads all winter, Hob Mudspur.'], ['hob', "And I'd rob 'em for you all summer, if the pay's honest. Better a brigand who knows the passes."]]);
brigYield('gerrow', 'gerrow', 'beltane', [['gerrow', "Well. You've knocked down my gate and frightened my bats. I suppose you want tea."], ['RULER', 'I want your oath, Mother Gerrow.'], ['gerrow', "An oath costs more than tea. But I've grown fond of winning sides."]]);
brigYield('dafydd', 'dafydd', 'lammas', [['dafydd', 'Ha! Beaten fair, and by a crown! My grandmother will never believe it.', { pose: 'cheer' }], ['RULER', 'Your company has a choice, Red Dafydd.'], ['dafydd', "Then let Lammas Cross ride under a proper banner, and I'll ride at the front of it!"]]);
brigYield('abbot', 'abbot', 'hallowmere', [['abbot', '{s=10}The dead do not mind who holds the abbey. The living, perhaps.{/s}'], ['RULER', 'Will you swear to us, Abbot?'], ['abbot', 'I will swear to keep the lanterns lit. If that serves your crown, so be it.']]);
EV('owain', { when: 'muster', priority: 40, stage: 'stable', if: (s, r) => !s.state.knights.owain && s.state.realms[r] && s.state.realms[r].boundDragon, lines: [
  N('The stables. A broad man watches your drake with wet eyes.'),
  ['owain', 'I lost my Kerrow in the Long Winter. Fell out of the sky like a stone.'],
  ['owain', 'Let me teach yours to fly. Properly. I ask nothing else.']], effects: [{ addKnight: 'owain' }] });
EV('galeron', { when: 'wanderer', priority: 40, stage: 'road', if: () => true, lines: [['galeron', 'A cause at last. I have wandered from spring to winter looking for one worth the walk.'], ['galeron', 'Sir Galeron, at your service, and my wolf with me.']], effects: [] });
EV('ettard', { when: 'wanderer', priority: 40, stage: 'road', if: () => true, lines: [['ettard', 'You are bleeding on my shrine. Sit down before you fall down.'], ['ettard', 'Sister Ettard. I will mend your knights, and I will scold them while I do it.']], effects: [] });
EV('blanchefleur', { when: 'wanderer', priority: 40, stage: 'road', if: () => true, lines: [['blanchefleur', 'Coin first, then loyalty. The other way round has never paid.'], ['blanchefleur', "Blanchefleur. My bow is yours while the mana flows."]], effects: [] });
EV('blanchefleur_hire', { when: 'questReturn', priority: 60, stage: 'road', if: s => !s.state.knights.blanchefleur, lines: [N('The Lammas Fair: ribbons, ale, and a sellsword counting arrows.'), ['blanchefleur', "One hundred and fifty, and I don't fight children."]],
  choices: [{ text: 'Pay 150 mana', effects: [{ pay: 150, addKnight: 'blanchefleur' }] }, { text: 'Refuse', effects: [] }] });
EV('stillness', { when: 'tidings', realm: 'world', priority: 75, stage: 'clock', if: s => s.state.flags.stilledOnce && !s.state.flags.stillSeen, lines: [
  ['graynight', 'Listen. A castle has stopped breathing.'],
  ['meliant', 'Its people?'],
  ['graynight', 'Between one second and the next. Perfectly safe. Perfectly still.']], effects: [{ flag: 'stillSeen' }] });
EV('thirteenth_warning', { when: 'tidings', realm: 'world', priority: 85, stage: 'clock', if: s => s.state.candle === 1, lines: [['herald', '{c=#ff5050}One season remains.{/c} The candle gutters in Meridian.', { emote: '!' }], ['graynight', '{s=10}Hush now. Almost.{/s}']] });
EV('meridian_falls', { when: 'capture', priority: 100, stage: 'clock', if: (s, r, b) => b && b.castle === 'meridian' && G.PLAYABLE.includes(r), lines: (s, r) => {
  const lun = s.state.knights.lunete && s.state.knights.lunete.realm === r;
  return [['meliant', 'So it is done. {w=.5}Forgive me, Keeper. I only wanted the clocks to stop.', { pose: 'kneel' }],
    ['graynight', 'And they shall, Chancellor. You were a key, nothing more. A stopped city is only a seed.'],
    [RULERS[r], { verdance: 'Who are you?', solmark: 'Name yourself, before I burn the name off your tomb.', amberlyn: '...Who?', hoarfast: 'A riddle for you: who are you?' }[r]],
    ['graynight', 'The month that never was. The hour between hours. Every season you ever lost belongs to me.'],
    ['graynight', 'Come down into the Sanctum, little crown. Let us see whether your Wheel still turns.'],
    lun ? ['lunete', "My father's clock is not yours to break. Stand on the dials with me, and we will turn it together."] : ['KNIGHT', 'The dials, my liege. The old tales say the Wheel answers four seasons together.']];
}, effects: [{ flag: 'sanctumOpen' }, { sanctum: true }] });
EV('sanctum_retry', { when: 'afterBattle', priority: 90, stage: 'clock', once: false, if: (s, r, b) => b && b.sanctum && !b.won, lines: [['graynight', 'The Wheel trembles, but it holds. Come again, little crown. I have all the time there is.'], ['KNIGHT', 'We fall back into Meridian, my liege. The Sanctum waits for our next March.']] });
EV('rival_meridian', { when: 'tidings', realm: 'player', priority: 88, once: false, stage: 'road', if: s => s.state.flags.rivalMeridian && !s.state.flags.rivalWarned, lines: s => [['herald', '{c=#ff8060}' + (G.has('realm', s.state.flags.rivalMeridian) ? G.get('realm', s.state.flags.rivalMeridian).short : 'A rival crown') + ' holds Meridian!{/c} They march into the Sanctum.', { emote: '!' }]], effects: [{ flag: 'rivalWarned' }] });
EV('rival_failed', { when: 'tidings', realm: 'player', priority: 87, once: false, stage: 'road', if: s => s.state.flags.rivalFailed, lines: [['herald', 'The rival crown is broken in the Sanctum. The Dominion holds Meridian once more.'], ['KNIGHT', 'Then the Wheel still waits for us.']], effects: [{ flag: 'rivalFailed', value: false }, { flag: 'rivalWarned', value: false }] });
for (const [r, line] of [['verdance', 'Forgive me, Mother.'], ['solmark', 'Even suns set.'], ['amberlyn', '...Enough.'], ['hoarfast', 'Ice melts. Who knew?']])
  EV('realm_falls_' + r, { when: 'tidings', realm: 'world', priority: 65, stage: 'road', if: s => s.state.realms[r] && !s.state.realms[r].alive && !s.state.realms[r].human, lines: [N(G.get('realm', r).name + ' has fallen.'), [RULERS[r], line, { expr: 'wince' }]], effects: [] });
// Verdance's chain
EV('v_pelleas_letter', { when: 'tidings', realm: 'verdance', stage: 'orchard', if: s => is(s, 'summer', 1), lines: [['pelleas', 'My prince, I have written to Captain Elidure of Goldspur. We met at the last Concord. She laughed at my sonnet.'], ['lynette', 'Sending verse to an enemy captain. In wartime.'], ['pelleas', 'Especially in wartime!', { emote: 'heart' }]],
  choices: [{ text: 'Let him send it', effects: [{ flag: 'v_letter' }] }, { text: 'Burn the letter', effects: [] }] });
EV('v_elidure_joins', { when: 'capture', realm: 'verdance', stage: 'tent', if: (s, r, b) => s.state.flags.v_letter && b && b.castle === 'goldspur' && s.state.knights.elidure && s.state.knights.elidure.realm === 'solmark', lines: [['elidure', 'Your poetry is dreadful, Sir Pelleas.'], ['elidure', 'Your cause is not. Goldspur rides with Verdance.'], ['pelleas', 'She read it!', { emote: 'heart' }]], effects: [{ addKnight: 'elidure' }] });
EV('v_unicorn_herd', { when: 'tidings', realm: 'verdance', stage: 'stable', if: (s, r) => is(s, 'autumn', 1) && s.owner('thornwick') === r && s.knightAlive('wren', r), lines: [['wren', 'A herd. In the Briar Maze. They followed me home.', { emote: 'heart' }], ['gareth', 'Then Verdance has new friends. Welcome them.']], effects: [{ addMonster: ['unicorn', 'wren', 'capital'] }, { addItem: 'springseed' }] });
EV('v_green_oath', { when: 'capture', realm: 'verdance', stage: 'tent', if: (s, r, b) => b && G.get('castle', b.castle).tier === 'satellite', lines: [['gareth', 'I swear it on the oldest apple: I will wake the Keeper, or sleep beside him.'], ['lynette', 'You will do neither of those alone.']], effects: [{ bond: ['gareth', 2] }, { learn: ['gareth', 'verdanttempest'] }] });
EV('v_amris_past', { when: 'tidings', realm: 'verdance', stage: 'orchard', if: s => is(s, 'winter', 2), lines: [['amris', 'I was a knight of Hoarfast once, my prince. Before the robe. The Duke and I were boys together.'], ['amris', 'He may still listen to me.']],
  choices: [{ text: 'Write to the Duke', effects: [{ aiFlag: ['hoarfast', 'peaceWith', 'verdance'] }, { aiFlag: ['hoarfast', 'peaceUntil', 'plus2'] }, { toast: 'Hoarfast will not march on Verdance for two seasons.' }] }, { text: 'Keep silent', effects: [] }] });
// Solmark's chain
EV('s_hesper_offer', { when: 'tidings', realm: 'solmark', stage: 'sunhall', if: s => is(s, 'autumn', 1), lines: [['hesper', 'Majesty, the Hour has a magic of its own. Let me teach Lionsreach to call it.'], ['morgause', 'And what does the Hour ask in return?'], ['hesper', 'Nothing, Majesty. {w=.4}Nothing at all.', { emote: 'dots' }]],
  choices: [{ text: 'Accept the Hour', effects: [{ flag: 's_hesper' }, { circle: ['lionsreach', ['minute', 'stillwraith']] }] }, { text: 'Refuse', effects: [{ levels: ['hesper', 2] }] }] });
EV('s_hesper_betrays', { when: 'tidings', realm: 'solmark', stage: 'sunhall', if: (s, r) => s.state.flags.s_hesper && is(s, 'summer', 3) && s.knightAlive('hesper', r), lines: [['hesper', 'Time was always the better master, Majesty.'], ['morgause', '{shake}Hesper!{/shake}', { emote: '!' }]], effects: [{ defect: ['hesper', 'dominion'] }] });
EV('s_wyvern_eggs', { when: 'tidings', realm: 'solmark', stage: 'stable', if: (s, r) => is(s, 'spring', 2) && s.owner('goldspur') === r, lines: [['brennoc', 'Eggs, Majesty! Warm as bread. The roost has given us a wyvern.', { emote: '!' }], ['morgause', 'Then Solmark flies higher.']], effects: [{ addMonster: ['wyvern', 5, 'capital'] }, { addItem: 'summerember' }] });
EV('s_agravain_duel', { when: 'beforeBattle', realm: 'solmark', stage: 'road', if: (s, r, b) => b && b.knights.includes('agravain') && b.knights.includes('ragnell'), lines: [['agravain', "Ice-Eye! I've waited all summer to melt you."], ['ragnell', "Then you'll wait all winter to stand back up."]], effects: [{ battleBuff: ['agravain', 'valor'] }] });
// Amberlyn's chain
EV('a_dagonet_jest', { when: 'tidings', realm: 'amberlyn', stage: 'harvesthall', if: s => is(s, 'summer', 1), lines: [['dagonet', 'My lady, I put a frog in the new steward\'s soup. He did not scream. He ticked.', { emote: '?' }], ['enid', 'An Hourless spy, in our kitchens. Well jested, Sir Dagonet.'], ['dagonet', 'He left this behind. A signet. I suppose it is ours now.']], effects: [{ addItem: 'signet' }] });
EV('a_kings_cough', { when: 'tidings', realm: 'amberlyn', stage: 'harvesthall', if: s => is(s, 'winter', 1), lines: [['pellam', '{w=.5}...', { emote: 'dots' }], ['enid', 'Father, you are coughing blood.'], ['pellam', 'Enid. {w=.6}Heir.']],
  choices: [{ text: 'Name Enid heir now', effects: [{ levels: ['enid', 3] }, { learn: ['enid', 'renewal'] }] }, { text: 'Wait', effects: [] }] });
EV('a_lanterns', { when: 'tidings', realm: 'amberlyn', stage: 'road', if: s => is(s, 'autumn', 2), lines: [N('All-Hallows on the Lantern Road.'), ['vesna', 'One lantern for every name. The dead like to be counted.'], ['vesna', 'Two of the lamps followed me back. I think they want to fight for us.']], effects: [{ addMonster: ['jacklamp', 6, 'capital'] }, { addMonster: ['jacklamp', 6, 'capital'] }, { addItem: 'autumnacorn' }] });
EV('a_lamorak_stand', { when: 'beforeBattle', realm: 'amberlyn', stage: 'road', if: (s, r, b) => b && b.castle === 'ashbarrow' && b.defender === r && b.knights.includes('lamorak'), lines: [['lamorak', 'I have held Ashbarrow for thirty winters. I will hold it for one more.']], effects: [{ battleBuff: ['lamorak', 'warded'] }] });
// Hoarfast's chain
EV('w_nimue_bargain', { when: 'tidings', realm: 'hoarfast', stage: 'icehall', if: s => is(s, 'summer', 1), lines: [['nimue', 'Duke, the mere offers an egg. A frost wyrm. It asks only a memory in return.'], ['mordrain', 'A memory! I have so many. Which one does it want?'], ['nimue', 'It will choose.', { emote: 'dots' }]],
  choices: [{ text: 'Accept the bargain', effects: [{ addMonster: ['frostwyrm', 4, 'capital'] }, { flag: 'w_forgot' }] }, { text: 'Refuse', effects: [{ levels: ['nimue', 1] }] }] });
EV('w_gorm_cub', { when: 'tidings', realm: 'hoarfast', stage: 'stable', if: s => is(s, 'autumn', 1), lines: [['gorm', 'She came back. My little one. Walked out of the snow like nothing happened.', { emote: 'heart' }], ['ragnell', 'That "little one" is taller than the gate, Gorm.']], effects: [{ addMonster: ['yeti', 5, 'capital'] }] });
EV('w_ragnell_doubt', { when: 'tidings', realm: 'hoarfast', stage: 'icehall', if: s => is(s, 'winter', 2), lines: [['ragnell', 'Do I follow a madman? I ask it every night, and every morning I put on my armour.'], ['mordrain', 'Ragnell. You are the only clock in this castle that keeps good time.']],
  choices: [{ text: 'Trust him', effects: [{ levels: ['ragnell', 2] }] }, { text: 'Watch him', effects: [{ addItem: 'wardingcharm' }] }] });
EV('w_lucid_hour', { when: 'capture', realm: 'hoarfast', stage: 'icehall', if: (s, r, b) => b && G.get('castle', b.castle).tier === 'satellite', lines: [['mordrain', 'Ragnell. {w=.5}I had a sister. She drowned in the lake beneath Rimeholt.'], ['mordrain', 'If winter never ends, the lake never thaws, and it never gives her back.'], ['ragnell', 'Then let us end the winter, Your Grace. Together.']], effects: [{ flag: 'w_lucid' }] });
// endings
const epi = { gareth: 'Gareth wound the Great Clock each midwinter until a new Keeper was found.', lynette: 'Dame Lynette kept the Concord\'s peace for forty years, and never once admitted she enjoyed it.', pelleas: 'Sir Pelleas wrote four hundred verses about the Sanctum. Few were read; all were loved.', amris: 'Brother Amris went north at last, and the Duke met him at the gate.', wren: 'Wren took the unicorns home to the Glade, and the orchards bloomed early.',
  morgause: 'Queen Morgause let the sun set on her war, and found she liked the evening.', agravain: 'Sir Agravain challenged every champion in Forseason, and lost graciously twice.', elidure: 'Captain Elidure kept Goldspur\'s roads safe, and Sir Pelleas\'s letters in a box.', hesper: 'Magus Hesper burned her Hour books in the furnace, one by one.', brennoc: 'Old Brennoc raised a hundred wyverns and named every one.',
  pellam: 'King Pellam\'s last word was "Turn." The Wheel did.', enid: 'Queen Enid opened the granaries to every realm that first hungry spring.', dagonet: 'Sir Dagonet became court jester and court champion, both at once.', vesna: 'Vesna lit the Lantern Road every All-Hallows, and the dead were content.', lamorak: 'Sir Lamorak held Ashbarrow for thirty more winters.',
  mordrain: 'Duke Mordrain let the ice go, and the lake gave back its silence.', ragnell: 'Dame Ragnell ruled Hoarfast in all but name, and kept excellent time.', safir: 'Sir Safir hunted no more, and learned to sing.', nimue: 'Nimue of Frostmere kept her bargains, and her secrets.', gorm: 'Gorm and his yeti built a bridge over the Rimewall.',
  lunete: 'Lunete was crowned Keeper of the Wheel. The four crowns knelt first.', galeron: 'Sir Galeron found his cause, and kept it.', blanchefleur: 'Blanchefleur retired rich, and kept her code.', owain: 'Owain flew again, on a drake that loved him.', ettard: 'Sister Ettard scolded every wounded knight back to health.' };
G.EPILOGUE = epi;
const endLines = { verdance: [['RULER', 'Rest now, Keeper. The Wheel is in good hands.'], N('In Avalorn, the oldest apple blossomed that very morning.')],
  solmark: [['RULER', 'Even the sun must set, or it is only a fire.'], N('In Brazenhold, the furnaces were banked, and summer came gently.')],
  amberlyn: [['RULER', '{w=.6}Turn.'], N('King Pellam closed his eyes. Lady Enid was crowned before the leaves fell.')],
  hoarfast: [['RULER', 'Let the ice go, Ragnell. Let her go.'], N('Beneath Rimeholt, the lake thawed for the first time in a hundred years.')] };
const endTitles = { verdance: 'The Wheel Turns Again', solmark: 'The Long Noon Ends', amberlyn: 'The Last Harvest', hoarfast: 'Spring Thaw' };
for (const r of G.PLAYABLE) EV('ending_' + r, { when: 'ending', realm: r, stage: 'clock', title: endTitles[r], lines: [N('The thirteenth bell never rang.'), ['graynight', 'Then turn, little Wheel. Turn, and lose everything again. I will wait between the seconds.'], N('The Great Clock shuddered, and its hands moved on.'), ['keeper', 'Spring... I dreamed of spring. Thank you, child of the seasons.'], ...endLines[r]] });
EV('ending_candle', { when: 'ending', realm: 'player', stage: 'clock', title: 'THE LEGEND ENDS IN SILENCE', bad: true, lines: [['graynight', '{s=8}Hush now. Nothing will ever end again.{/s}'], N('The candle went out. The hands stopped. The Wheel turned no more.')] });
const wheelEnd = { verdance: ['FLOOD', 'Let it be spring forever. Let it rain.'], solmark: ['FIRE', 'Summer, now and always. Burn.'], amberlyn: ['DUST', '...Harvest.'], hoarfast: ['ICE', 'Winter! Nothing rots. Nothing ends!'] };
for (const r of G.PLAYABLE) EV('ending_wheel_' + r, { when: 'ending', realm: 'player', stage: 'clock', title: 'THE LEGEND ENDS IN ' + wheelEnd[r][0], bad: true, lines: [[RULERS[r], wheelEnd[r][1]], N(G.get('realm', r).short + ' set the Wheel to its own season. The land did not forgive it.')] });
EV('ending_fallen', { when: 'ending', realm: 'player', stage: 'road', title: 'THE LEGEND FORGETS YOU', bad: true, lines: [['RULER', 'Our last banner is down. {w=.5}Ride on. Somewhere the Wheel still turns.', { expr: 'wince' }], N('The ruler went into exile, and the chroniclers did not write the name.')] });
// rival lines before battle (both on the field: the first match plays)
G.RIVALS = [['agravain', 'ragnell', "Ice-Eye! I've waited all summer to melt you.", "Then you'll wait all winter to stand back up."],
  ['pelleas', 'elidure', 'Captain! Did you read my letter?', "I'm reading your formation, Sir Pelleas. It's worse."],
  ['gareth', 'morgause', "The Wheel isn't yours to take, Your Majesty.", 'Then come and stop me, princeling. Bring your blossoms.'],
  ['mordrain', 'pellam', 'The Quiet King! Say something, old man!', '...No.'],
  ['lynette', 'agravain', 'Cinderjaw. Still shouting?', 'Still standing in my way?'],
  ['dagonet', 'hob', 'A brigand with a funny name! Finally, a rival.', 'Oi! Mudspur is a proud name!'],
  ['morgause', 'pellam', 'Step aside, old king. Summer has no patience for harvests.', '...Patience.'],
  ['mordrain', 'gareth', 'Little sprout! Do you know why snow is so quiet?', "Because it's waiting for spring."],
  ['meliant', 'lunete', 'Princess... you should be asleep beside your father.', 'Somebody has to stay awake, Chancellor.'],
  ['bertilak', '*', 'Courtesy first: I shall kill you slowly, and with every respect.', null],
  ['tic', '*', 'Tic says-', '-Tac agrees!'],
  ['aurelie', '*', 'Must you? I was enjoying the silence.', null],
  ['graynight', '*', 'Twelve bells, little crown. Then nothing, ever again.', null]];
// quest vignettes: 3 per outcome; {$knight} {$site} {$thing}
G.VIGNETTES = {
  treasure: ['{$knight} returns from {$site} with dust on the boots and a {$thing} in hand.', 'At {$site}, {$knight} found a {$thing} beneath a stone no one had lifted in a century.', '{$knight} comes home from {$site} smiling, and sets a {$thing} on the table.'],
  beast: ['A {$thing} followed {$knight} home from {$site}. It will not leave.', '{$knight} tamed a {$thing} at {$site}, with patience and a good deal of cheese.', 'From {$site}, {$knight} leads back a {$thing} on a long rope.'],
  wanderer: ['At {$site}, {$knight} met a wandering knight: {$thing}.', '{$knight} returns from {$site} with company: {$thing}.', 'A stranger walked beside {$knight} all the way from {$site}: {$thing}.'],
  mana: ['{$knight} found a mana spring at {$site}: {$thing} mana for the realm.', 'The stones at {$site} hummed with power. {$knight} brings back {$thing} mana.', 'At {$site}, {$knight} gathered {$thing} mana from the old wells.'],
  training: ['{$knight} trained hard at {$site}. Knight and troop return stronger.', 'At {$site}, {$knight} drilled the troop until even the beasts saluted.', '{$knight} spent the season at {$site} sparring with the wind.'],
  mishap: ["{$knight}'s patrol was ambushed at {$site}. {$knight} will mend.", '{$knight} returns from {$site} limping, and will not speak of it.', 'A rockfall at {$site} caught {$knight}. The wounds will take a season.']
};

// ---- 10-data-about.js ----
/* ---- ABOUT & CREDITS: Source Information and the three feedback lists (the same text as exit-interview.json) ---- */
G.ABOUT = {
  sourceInformation: {
    date: '2026-11-04 05:02:23',
    source: 'Brigandine: The Legend of Forsena (Hearty Robin / Atlus, PlayStation, 1998)',
    plan: 'PLAN.md',
    genre: 'Turn-based grand strategy with a tactical RPG battle layer (monster-binding knights, castle conquest, hex battles)',
    perspective: 'Campaign: three-quarter overhead world map; battles: tilted overhead hex board (custom 50-degree view, rotatable, isometric alternate); story: side-on stage scenes',
    tech: 'my-3D2dge engine v0.85.2 (2D canvas engine, full build with every module), plain JavaScript in one IIFE, AI Hub Session Protocol v1 client 1.4.0, Node 24 for build and headless tests; no other libraries',
    artDirection: "The engine's native PS1-style pixel look: HD Humanoid rigs, E.Blob monsters and a new procedural E.Beast rig for quadrupeds, drakes, birds and serpents; baked hex terrain textured per season; custom castle, keep, rampart, gear and clock-tower shapes; season palettes",
    animation: "The engine's skeletal Humanoid moves and poses (E.MOVES, E.Attack), E.Blob squash and stretch, and new procedural beast animation (gaits, bites, breath, tail sweeps, dives, roars), plus particles, lights and weather",
    audio: 'All code: step-sequencer songs around a Wheel motif (title, four season themes, attack and defence battle themes with a tension layer, the Hour theme, the boss, story and ending themes), stings, custom synthesized sound effects, and Animalese-style babble voices (formant-filtered tone bursts per vowel, noise per consonant) per character',
    online: 'AI Hub Session Protocol v1, shared-world mode for 2-4 players: "Banners of the Wheel", a host-authoritative free-for-all hex battle with snapshots, ordered events, troop deadlines and host-run AI for timed-out players; plus local hot-seat campaign and skirmish for 1-4 players',
    testing: 'Thirteen headless Node suites driven by game.advance and game.debug (data, rules, campaign and AI, story, UI flow, front end, settings behaviour, screen density, per-requirement TASK checks, battles commanded through input taps, hub protocol against a fake hub, autoplay playthroughs per realm, about), seven browser checks, behind one command (node tests/run.mjs); a few headless-Chromium screenshots and the hub harness for what scripts cannot check',
    research: 'None during the build beyond the plan; the plan (PLAN.md) records its own research: the Wikipedia article on Brigandine and the RPGFan review, plus the my-3D2dge handoff docs and the AI Hub README',
    environment: 'Claude Code CLI (headless); Linux; browser unknown',
    model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
    usage: 'Session time from the system clock: 1 h 45 min (2026-11-04 05:02:23 to 06:48:01 at final verification); API cost and token counts unknown (not visible to the model)'
  },
  testingFeedback: [
    '25 issues, each fixed: the campaign AI never marched, the Dominion snowballed, autoplay never pushed for Meridian, the Sanctum was unwinnable at realistic levels, EXP was far too slow, beaten brigand captains lingered, a duplicate top-level name broke the bundle, a story event crashed without its flag, the tutorial battle was queued after the Muster, dev tools read the scene definition instead of the live scene, Owain joined at once for realms that start with a drake, dev mode could not open during a battle dialog, the hub client sent no traffic, deep links were dropped, unsupported font glyphs showed as ?, the Sanctum deep link fielded the wrong sides, the Summon prompt mangled its cost, the Gray Knight looked like a red-haired man, the battle and map cameras chased the mouse, and two test-script mistakes of my own.',
    '8 were critical or game breaking: the duplicate name (the game would not load), the AI that never marched (a static, unwinnable war), the unwinnable Sanctum, the war being unwinnable without a stat boost, the Dominion fighting its own Gray Knight (which could end the game with a false loss), the tutorial queued after the Muster, the silent hub client (the hub check failed) and the camera chasing the mouse (mouse play unusable).',
    'The scripted autoplay campaign (every realm on autoplay through the real scenes to an ending): it exposed the AI, balance and flow problems that no unit test would have found, and it is now the playthrough suite.',
    "An isolated E.Dialog test run outside the game loop: it could not see presses and only showed my harness was wrong; the in-game event run answered the question at once."
  ],
  engineFeedback: [
    'Headless determinism: game.advance with exact fixed steps plus game.debug made whole playthroughs, the attract reel and the hub protocol testable in Node in seconds, and the HD Humanoid rigs, standard pause menu, settings and save slots came for free.',
    "Yes: scenes are wrapped, so the object in game.scenes is not the live scene (my dev tools read stale state); game.after timers set before the first scene are cleared, so deep links built that way vanished; the 5x7 font lacks common glyphs such as the middle dot, diamond and triangles, which render as question marks; and following the cursor with the camera while the mouse hovers makes the board slide under the pointer.",
    'The hex battlefield (a TileMap whose floorTex bakes hexes per terrain and season, hex picking through mouseGround, cursor steps by screen direction, hex decals) and the new E.Beast rig for quadrupeds, drakes, birds and serpents.',
    'Fitting a hex tactics game onto a square-tile renderer: picking, screen-direction stepping, decals in hex shapes and baked hex edges all had to be built on top, and getting the camera, picking and hover to agree took several tries.',
    "One change: E.Dialog accepts a per-letter voice function, so Animalese babble can follow the typed text (logged in ENGINE-CHANGES.md); the new engine-ext/beasts.js module adds E.Beast and E.Wings without touching the core.",
    'First-class hex maps: a hex TileMap floor with built-in picking, hex decals and screen-direction stepping (and a documented glyph list for the font, with a visible fallback instead of a question mark).'
  ],
  promptFeedback: [
    'The precise deliverables (file names, the exit-interview shape, the four feedback sections) and the freedom to change the engine, together with clear testing rules: one command, failures only, headless first.',
    'The plan was written for another run (max effort, a different date and folder names) and its scope assumed far more time; it was not clear how much of its content counts toward "every feature in TASK.md". "Follow ai-hub for multiplayer integration into ai-hub as well as for the game on its own" was also ambiguous about what the standalone multiplayer should be.',
    'Scope and balance: a grand-strategy campaign with a tactical hex battle layer, 30 species, about 50 story events, attract mode, dev mode, hot-seat and an online mode in one session, then tuning the campaign AI so the war actually moves and stays winnable.',
    'Say which plan items are required and which are stretch, give a time or scope budget, and make the plan template take the run-specific names as variables (effort, date, folder) so they never disagree with TASK.md.'
  ]
};
G.ABOUT_PAGES = () => {
  const S = G.ABOUT.sourceInformation, L = (t, list) => ({ title: t, rows: list.map((v, i) => [String(i + 1) + '.', v]) });
  return [
    { title: 'BRIGANTIME', rows: [['', 'The Legend of Forseasons'], ['', 'Four seasons. Four crowns. One stopped clock.'], ['Version', G.VERSION + ' • build ' + G.BUILD + (E.versionLabel ? ' • engine ' + E.versionLabel() : '')], ['', 'Inspired by Brigandine: The Legend of Forsena. The world, characters, music and art are original.']] },
    { title: 'SOURCE INFORMATION', rows: [['Date', S.date], ['Source', S.source], ['Plan', S.plan], ['Genre and Perspective', S.genre + '. ' + S.perspective], ['Tech', S.tech], ['Art Direction', S.artDirection], ['Animation', S.animation], ['Audio', S.audio], ['Online', S.online], ['Testing', S.testing], ['Research', S.research], ['Environment', S.environment], ['Model', S.model], ['Usage', S.usage]] },
    L('TESTING FEEDBACK', G.ABOUT.testingFeedback), L('ENGINE FEEDBACK', G.ABOUT.engineFeedback), L('PROMPT FEEDBACK', G.ABOUT.promptFeedback),
    { title: 'CREDITS', rows: [['Engine', 'my-3D2dge (MIT) by Michael Crosato'], ['Online', 'AI Hub Session Protocol v1, client 1.4.0'], ['Assets', 'Everything is drawn and synthesized in code; the engine core library supplies generic props (CC0 lineage as catalogued)'], ['Game', 'Designed from PLAN.md and built by Claude (claude-opus-5-5)'], ['Thanks', 'To the chroniclers of the Brigantime']] }];
};
G.CREDITS = () => ['BRIGANTIME', 'The Legend of Forseasons', '', 'A game built by Claude', 'from a plan written by Claude', '', 'ENGINE', 'my-3D2dge by Michael Crosato', '', 'ONLINE', 'AI Hub Session Protocol v1', '', 'MUSIC, SOUND AND VOICES', 'Synthesized in code', '', 'INSPIRED BY', 'Brigandine: The Legend of Forsena', 'The world, characters, music and art are original.', '', 'The Wheel turns.', '', 'Thank you for playing.'];

// ---- 20-sim-battle.js ----
/* ---- BATTLESIM (§5): a hex battle as plain JSON state. Commands in (apply), events out. Never touches the engine, the
 * DOM, the clock or Math.random: randomness is G.Rng with its state inside the sim's state. ----
 * spec: { map, season, seed, mode: 'siege' | 'sanctum' | 'shrine', castle, bells, longWinter, sides: [{ id, realm, name,
 *   human, ai, expMul, boost, items: [ids], troops: [{ knight: rec, monsters: [rec], formation }] }], attacker, defender }
 * knight rec: { id, cls, lvl, exp, elem, stats: { hp, mp, atk, def, int, agi }, hp, mp, equip: { weapon, armor, accessory },
 *   ruler, extraSkills, bondBonus } ; monster rec: { uid, sp, tier, lvl, exp, hp, mp } */
const R = G.Rng;
G.levelUpKnight = (rec, rng) => {   // growth: floor(g) + 1 more if a seeded roll falls under the fraction
  const c = G.get('class', rec.cls), mul = [1, 1.15, 1.3][(c.tier || 1) - 1], gains = {};
  G.STATS.forEach((s, i) => { const g = c.growth[i] * mul; let n = Math.floor(g); if (R.next(rng) < g - n) n++; rec.stats[s] += n; gains[s] = n; });
  rec.lvl++; return gains;
};
G.levelUpMonster = rec => { const a = G.monsterStats(rec.sp, rec.tier, rec.lvl), b = G.monsterStats(rec.sp, rec.tier, rec.lvl + 1); rec.lvl++; const gains = {}; for (const s of G.STATS) gains[s] = b[s] - a[s]; return gains; };
// a knight's battle-ready numbers from its record and equipment
G.knightView = rec => {
  const c = G.get('class', rec.cls), st = Object.assign({}, rec.stats), mods = { mov: c.mov, ward: c.ward, bond: c.bond + Math.floor(rec.lvl / 4) + (rec.bondBonus || 0) }, flags = { immune: [] };
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const id = rec.equip && rec.equip[slot]; if (!id) continue; const it = G.get('item', id);
    for (const k in it.mods) { if (k in st) st[k] += it.mods[k]; else mods[k] = (mods[k] || 0) + it.mods[k]; }
    if (it.immune) flags.immune.push(...it.immune); if (it.thorns) flags.thorns = true; if (it.regen) flags.regen = it.regen; if (it.tide2) flags.tide2 = true;
    if (it.winterDmg) flags.winterDmg = it.winterDmg; if (it.elemBoost) flags.elemBoost = it.elemBoost; if (it.range) flags.rangeBonus = it.range; if (it.luck) flags.luck = it.luck;
  }
  const skills = G.knightSkills(rec.cls, rec.elem, rec.lvl).concat(rec.extraSkills || []);
  return { st, mods, flags, skills, cls: c };
};
G.troopBond = (krec, monsters) => monsters.reduce((a, m) => a + G.get('monster', m.sp).rank, 0);

class BattleSim {
  constructor(state) { this.state = state; this._occ = null; }
  static create(spec) {
    const pm = G.parseMap(spec.map), S = { v: 1, spec: { map: spec.map, mode: spec.mode || 'siege', wheel: !!spec.wheel, castle: spec.castle || null, attacker: spec.attacker || 0, defender: spec.defender === undefined ? 1 : spec.defender, longWinter: !!spec.longWinter, region: spec.region || null },
      w: pm.w, h: pm.h, base: pm.cells.slice(), cells: [], anchors: pm.anchors, keeps: pm.keep, season: spec.season, bell: 0, bells: spec.mode === 'shrine' ? 6 : (spec.bells || G.tune.bells),
      rng: R.make(spec.seed || 1), units: [], troops: [], sides: [], order: [], oi: 0, over: null, n: 0, log: [], dials: {}, wheelTurned: false, timelessBreak: -1, gkCalled: false, fire: {}, captures: [], dev: {} };
    const sim = new BattleSim(S);
    sim.applySeason(spec.season, true);
    spec.sides.forEach((sd, si) => {
      const side = { id: si, realm: sd.realm, name: sd.name || (G.has('realm', sd.realm) ? G.get('realm', sd.realm).short : sd.realm), human: !!sd.human, ai: sd.ai || 'normal', expMul: sd.expMul || 1, boost: sd.boost || 0, items: (sd.items || []).slice(), used: [], troops: [], glory: 0, out: false, seat: sd.seat, color: sd.color };
      S.sides.push(side);
      sd.troops.forEach((tp, ti) => {
        const anchor = sim.anchorFor(si, ti, spec); if (!anchor) return;
        const tr = { id: S.troops.length, side: si, knight: -1, units: [], formation: tp.formation || 'vanguard', gone: false };
        S.troops.push(tr); side.troops.push(tr.id);
        const k = sim.addKnight(tp.knight, si, tr.id, anchor); tr.knight = k.id;
        for (const m of tp.monsters) { const c = sim.formationCell(anchor, tr.formation, si); if (c) sim.addMonster(m, si, tr.id, c); }
      });
    });
    for (const u of S.units) u.facing = sim.faceEnemy(u);
    sim.startBell([]);
    return sim;
  }
  static load(json) { return new BattleSim(typeof json === 'string' ? JSON.parse(json) : G.clone(json)); }
  serialize() { return G.clone(this.state); }
  hash() { return G.hashStr(JSON.stringify(this.state)); }

  /* ---- setup ---- */
  anchorFor(si, ti, spec) {
    const S = this.state, A = S.anchors;
    if (S.spec.mode === 'shrine') { const seat = spec.sides[si].anchor || String(si + 1); return A[seat] ? A[seat].slice() : null; }
    const keys = si === S.spec.attacker ? ['1', '2', '3'] : ['8', '7', '9'];
    const a = A[keys[ti]]; return a ? a.slice() : null;
  }
  enemyDir(si) {   // which way the enemy is, as a screen direction (for formations): toward the centre of the other side's anchors
    const S = this.state, mine = S.spec.mode === 'shrine' ? [S.anchors[String(si + 1)]] : si === S.spec.attacker ? ['1', '2', '3'].map(k => S.anchors[k]) : ['7', '8', '9'].map(k => S.anchors[k]);
    const theirs = S.spec.mode === 'shrine' ? S.keeps : si === S.spec.attacker ? ['7', '8', '9'].map(k => S.anchors[k]) : ['1', '2', '3'].map(k => S.anchors[k]);
    const avg = l => { l = l.filter(Boolean); const p = l.map(c => G.hex.center(c)); return [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length]; };
    const [ax, ay] = avg(mine), [bx, by] = avg(theirs.length ? theirs : [[Math.floor(S.w / 2), Math.floor(S.h / 2)]]);
    return [bx - ax, by - ay];
  }
  formationCell(anchor, form, si) {
    const S = this.state, [dx, dy] = this.enemyDir(si), [ax, ay] = G.hex.center(anchor), l = Math.hypot(dx, dy) || 1;
    const cands = G.hex.within(anchor, 3).filter(c => this.inside(c) && !this.unitAt(c) && this.standable(c, null));
    const score = c => { const [x, y] = G.hex.center(c), d = G.hex.dist(anchor, c), fwd = ((x - ax) * dx + (y - ay) * dy) / l / G.T;
      if (form === 'shield') return d * 10 - fwd * .1; if (form === 'column') return d * 2 + fwd * 4 + Math.abs(((x - ax) * -dy + (y - ay) * dx) / l / G.T) * 3; return d * 3 - fwd * 4; };
    cands.sort((a, b) => score(a) - score(b) || a[1] - b[1] || a[0] - b[0]);
    return cands[0] || null;
  }
  addKnight(rec, si, ti, at) {
    const S = this.state, kv = G.knightView(rec), side = S.sides[si], boost = 1 + (side.boost || 0), st = kv.st, c = kv.cls;
    const u = { id: S.units.length, side: si, troop: ti, kind: 'knight', ref: rec.id, name: G.has('knight', rec.id) ? G.get('knight', rec.id).short : rec.id, cls: rec.cls, elem: rec.elem, size: 'M',
      fl: false, sw: false, fo: false, boss: !!c.boss, ruler: !!rec.ruler, lvl: rec.lvl, exp: rec.exp || 0, rec: G.clone(rec),
      mhp: Math.round(st.hp * boost), mmp: st.mp, hp: Math.min(Math.round((rec.hp === undefined ? st.hp : rec.hp) * boost), Math.round(st.hp * boost)), mp: Math.min(rec.mp === undefined ? st.mp : rec.mp, st.mp),
      atk: Math.round(st.atk * boost), def: Math.round(st.def * boost), int: Math.round(st.int * boost), agi: st.agi, mov: kv.mods.mov, ward: kv.mods.ward, bond: kv.mods.bond,
      skills: kv.skills, basic: Object.assign({}, c.basic), flags: kv.flags, cx: at[0], cy: at[1], out: null, moved: false, acted: false, movedDist: 0, from: null, eff: {}, stopImm: -1, once: {}, last: {}, expGain: 0, kos: 0, dealt: 0, lvls: 0 };
    if (c.basic.range && kv.flags.rangeBonus) u.basic.range = [c.basic.range[0], c.basic.range[1] + kv.flags.rangeBonus];
    if (u.skills.includes('eagleeye') && u.basic.bow) u.basic.range = [u.basic.range[0], u.basic.range[1] + 1];
    if (rec.id === 'graynight') { u.boss = true; u.size = 'L'; }
    S.units.push(u); return u;
  }
  addMonster(rec, si, ti, at) {
    const S = this.state, m = G.get('monster', rec.sp), st = G.monsterStats(rec.sp, rec.tier, rec.lvl), f = G.monsterFlags(rec.sp, rec.tier), boost = 1 + (S.sides[si].boost || 0);
    const u = { id: S.units.length, side: si, troop: ti, kind: 'monster', ref: rec.uid, sp: rec.sp, tier: rec.tier, name: m.names[rec.tier - 1], elem: m.elem, size: m.sizes[rec.tier - 1],
      fl: f.fl, sw: f.sw, fo: f.fo, boss: f.boss, lvl: rec.lvl, exp: rec.exp || 0, rec: G.clone(rec),
      mhp: Math.round(st.hp * boost), mmp: st.mp, hp: Math.min(Math.round((rec.hp === undefined ? st.hp : rec.hp) * boost), Math.round(st.hp * boost)), mp: Math.min(rec.mp === undefined ? st.mp : rec.mp, st.mp),
      atk: Math.round(st.atk * boost), def: Math.round(st.def * boost), int: Math.round(st.int * boost), agi: st.agi, mov: st.mov, skills: G.monsterSkills(rec.sp, rec.tier), basic: Object.assign({}, m.basic),
      flags: { immune: [] }, cx: at[0], cy: at[1], out: null, moved: false, acted: false, movedDist: 0, from: null, eff: {}, stopImm: -1, once: {}, last: {}, expGain: 0, kos: 0, dealt: 0, lvls: 0 };
    if (u.skills.includes('thorns')) u.flags.thorns = true;
    if (u.skills.includes('regenerate')) u.flags.regen = .1;
    if (u.skills.includes('thickhide')) u.flags.thick = true;
    S.troops[ti].units.push(u.id); S.units.push(u); return u;
  }
  faceEnemy(u) { const [dx, dy] = this.enemyDir(u.side); return Math.atan2(dy, dx); }

  /* ---- the field ---- */
  inside([x, y]) { return x >= 0 && y >= 0 && x < this.state.w && y < this.state.h; }
  code([x, y]) { return this.state.cells[y * this.state.w + x]; }
  ter(c) { return G.get('terrain', this.code(c)); }
  unitAt(c) { const S = this.state; for (const u of S.units) if (!u.out && u.cx === c[0] && u.cy === c[1]) return u; return null; }
  live(side) { return this.state.units.filter(u => !u.out && (side === undefined || u.side === side)); }
  knightOf(u) { return this.state.units[this.state.troops[u.troop].knight]; }
  foes(u) { return this.state.units.filter(o => !o.out && o.side !== u.side); }
  applySeason(season, first) {
    const S = this.state, flood = G.get('map', S.spec.map).flood;
    S.season = season;
    S.cells = S.base.map((c, i) => { if (S.fire[i]) return S.fire[i].ash ? 'ash' : 'fire'; return G.seasonTerrain(c, season, flood); });
  }
  // terrain cost for a unit (Infinity: can't enter); stop: may it end there
  costOf(u, c) {
    const t = this.ter(c), S = this.state;
    if (u.fl) return { cost: 1, stop: !t.wall };
    if (t.block) { if (u.sw && t.swim) return { cost: 1, stop: true }; return { cost: Infinity, stop: false }; }
    let cost = t.cost;
    if (t.forest && u.size === 'L') cost = t.costL || 3;
    if (t.water && u.sw) cost = 1;
    if ((t.swamp || this.code(c) === '~') && u.fo) cost = 1;
    if (this.code(c) === '~' && S.season === 'summer') cost = 1;
    if (t.swamp && S.season === 'winter') cost = Math.min(cost, 2);
    if (this.code(c) === 'snow') cost = u.elem === 'winter' ? 1 : 2;
    return { cost, stop: true };
  }
  standable(c, u) { if (!this.inside(c)) return false; const t = this.ter(c); if (u && u.fl) return !t.wall; if (t.block) return !!(u && u.sw && t.swim); return true; }
  effMov(u) { let m = u.mov; if (u.eff.chill) m -= 1; if (u.eff.haste) m += 1; if (u.fl && this.state.season === 'autumn') m -= 1; return Math.max(1, m); }
  // every hex u can reach: Map key -> { c, cost, prev }
  reach(u, budget = this.effMov(u)) {
    const out = new Map(), start = [u.cx, u.cy], k0 = G.hex.key(start), q = [[0, start]];
    out.set(k0, { c: start, cost: 0, prev: null });
    while (q.length) {
      q.sort((a, b) => a[0] - b[0] || a[1][1] - b[1][1] || a[1][0] - b[1][0]);
      const [cost, c] = q.shift(); const cur = out.get(G.hex.key(c)); if (cur.cost < cost) continue;
      for (const n of G.hex.neighbors(c)) {
        if (!this.inside(n)) continue;
        const o = this.unitAt(n); if (o && o.side !== u.side) continue;
        const { cost: mc } = this.costOf(u, n); if (mc === Infinity) continue;
        const nc = cost + mc; if (nc > budget) continue;
        const k = G.hex.key(n), old = out.get(k); if (old && old.cost <= nc) continue;
        out.set(k, { c: n, cost: nc, prev: c }); q.push([nc, n]);
      }
    }
    const res = new Map();
    for (const [k, v] of out) { const o = this.unitAt(v.c); if ((o && o !== u) || !this.costOf(u, v.c).stop) continue; res.set(k, v); }
    res.all = out; return res;
  }
  pathTo(u, to, reach = this.reach(u)) { const all = reach.all, p = []; let k = G.hex.key(to); if (!all.has(k)) return []; let c = to; while (c) { p.unshift(c); const v = all.get(G.hex.key(c)); c = v.prev; } return p; }

  /* ---- turn order ---- */
  startBell(ev) {
    const S = this.state;
    S.bell++;
    if (S.spec.mode === 'shrine' || S.spec.wheel) { this.applySeason(G.SEASONS[(S.bell - 1 + (S.spec.wheelStart || 0)) % 4]); ev.push({ type: 'season', season: S.season }); }
    const tr = S.troops.filter(t => !t.gone).map(t => ({ t, agi: S.units[t.knight].agi }));
    tr.sort((a, b) => b.agi - a.agi || (a.t.side === S.spec.defender ? -1 : 0) - (b.t.side === S.spec.defender ? -1 : 0) || a.t.id - b.t.id);
    S.order = tr.map(x => x.t.id); S.oi = 0;
    ev.push({ type: 'bell', bell: S.bell, order: S.order.slice() });
    this.startTroop(ev);
  }
  get active() { const S = this.state; return S.over ? null : S.troops[S.order[S.oi]] || null; }
  startTroop(ev) {
    const S = this.state;
    while (S.oi < S.order.length && S.troops[S.order[S.oi]].gone) S.oi++;
    if (S.oi >= S.order.length) { this.endBell(ev); return; }
    const tr = S.troops[S.order[S.oi]];
    ev.push({ type: 'troop', troop: tr.id, side: tr.side });
    for (const id of [tr.knight, ...tr.units]) {
      const u = S.units[id]; if (u.out) continue;
      u.moved = u.acted = false; u.movedDist = 0; u.from = null;
      u.mp = Math.min(u.mmp, u.mp + (S.dev.infMP && S.sides[u.side].human ? 99 : 2));
      if (u.eff.guarded) delete u.eff.guarded;
      const tick = (pct, why, col) => { const d = Math.max(1, Math.round(u.mhp * pct)); this.damage(u, d, null, ev, { why, color: col }); };
      if (u.eff.poison) tick(.08, 'poison', '#80e050');
      if (!u.out && u.eff.burn) tick(.05, 'burn', '#ff7030');
      if (!u.out && this.code([u.cx, u.cy]) === 'fire') tick(.1, 'fire', '#ff7030');
      if (!u.out && u.flags.regen && u.hp < u.mhp) { const h = Math.round(u.mhp * u.flags.regen); u.hp = Math.min(u.mhp, u.hp + h); ev.push({ type: 'heal', u: u.id, amount: h }); }
      if (u.out) continue;
      if (u.eff.sleep || u.eff.stop) { u.acted = true; u.moved = true; ev.push({ type: 'skip', u: u.id, why: u.eff.sleep ? 'sleep' : 'stop' }); if (u.eff.stop) { delete u.eff.stop; u.stopImm = S.bell + 1; } }
    }
    if (this.troopDone(tr)) { this.nextTroop(ev); }
  }
  troopDone(tr) { const S = this.state; if (tr.gone) return true; return [tr.knight, ...tr.units].every(id => S.units[id].out || S.units[id].acted); }
  nextTroop(ev) { const S = this.state; if (S.over) return; S.oi++; this.startTroop(ev); }
  endBell(ev) {
    const S = this.state;
    for (const u of S.units) { if (u.out) continue; for (const k in u.eff) { if (k === 'guarded' || k === 'stop') continue; u.eff[k]--; if (u.eff[k] <= 0) { delete u.eff[k]; ev.push({ type: 'fade', u: u.id, eff: k }); } } }
    for (const kc of S.keeps) { const u = this.unitAt(kc); if (u && (S.spec.mode !== 'siege' || u.side === S.spec.defender || S.spec.mode === 'shrine') && u.hp < u.mhp) { const h = Math.round(u.mhp * .1); u.hp = Math.min(u.mhp, u.hp + h); ev.push({ type: 'heal', u: u.id, amount: h, why: 'keep' }); } }
    for (const i in S.fire) { const f = S.fire[i]; if (!f.ash && --f.t <= 0) { f.ash = true; S.cells[i] = 'ash'; ev.push({ type: 'terrain', i: +i, code: 'ash' }); } }
    if (S.spec.mode === 'sanctum') this.sanctumRules(ev);
    if (S.spec.mode === 'shrine') { for (const kc of S.keeps) { const u = this.unitAt(kc); if (u) { S.sides[u.side].glory += 5; ev.push({ type: 'glory', side: u.side, amount: 5, why: 'shrine' }); } } }
    this.checkWin(ev, true);
    if (!S.over) this.startBell(ev);
  }
  sanctumRules(ev) {
    const S = this.state, gk = S.units.find(u => u.ref === 'graynight'), center = S.keeps[0], player = S.spec.attacker;
    if (!S.wheelTurned) {   // the Hour Hand: points one way per bell; units on its line roll Stop 70
      const d = S.bell % 6, line = []; let p = center;
      for (let i = 0; i < 12; i++) { p = G.hex.neighbor(p, d); if (!this.inside(p) || this.code(p) === '#') break; line.push(p); }
      ev.push({ type: 'hand', dir: d, line });
      for (const c of line) { const u = this.unitAt(c); if (u && u.side === player) this.tryStatus(null, u, 'stop', 70, ev); }
    }
    for (let i = 0; i < S.cells.length; i++) if (S.base[i] === 'D') {
      const c = [i % S.w, Math.floor(i / S.w)], u = this.unitAt(c);
      if (u && u.side === player && !S.dials[i]) { S.dials[i] = true; ev.push({ type: 'dial', i, lit: true }); }
      else if (u && u.side !== player && S.dials[i]) { S.dials[i] = false; ev.push({ type: 'dial', i, lit: false }); }
    }
    if (!S.wheelTurned && Object.values(S.dials).filter(Boolean).length >= 4) { S.wheelTurned = true; ev.push({ type: 'wheel' }); if (gk && !gk.out) gk.def = Math.round(gk.def * .6); }
  }
  timeless(u) { const S = this.state; return u.ref === 'graynight' && !S.wheelTurned && S.timelessBreak < S.bell; }

  /* ---- stats in play ---- */
  outsideWard(u) { if (u.kind !== 'monster') return false; const k = this.knightOf(u); return !k || k.out || G.hex.dist([u.cx, u.cy], [k.cx, k.cy]) > k.ward; }
  stat(u, s) {
    let v = u[s]; const S = this.state;
    if ((s === 'atk' || s === 'def' || s === 'int') && this.outsideWard(u)) v *= 1 - G.tune.wardPenalty;
    if (s === 'atk') { if (u.eff.valor) v *= 1.2; if (u.eff.weakened) v *= .85; }
    if (s === 'def') { if (u.eff.burn) v *= .9; if (u.eff.warded) v *= 1.2; if (u.eff.exposed) v *= .8; if (u.eff.guarded) v *= 1.3; if (u.eff.frostarmor) v *= 1.4; if (u.flags.thick) v *= 1.1; }
    if (s === 'agi') { if (u.eff.chill) v *= .8; if (u.eff.haste) v *= 1.2; }
    return v;
  }
  tideOf(u, attacking) {
    const S = this.state, s = S.season; if (u.elem === 'hour' || this.timeless(u)) return 1;
    let tb = G.tune.tideBonus * (S.spec.longWinter && s === 'winter' ? 2 : 1) * (u.flags.tide2 ? 2 : 1);
    if (attacking) return u.elem === s ? 1 + tb : u.elem === G.OPPOSE[s] ? 1 - tb : 1;
    return u.elem === s ? .9 : 1;
  }
  elemMul(aEl, d, sk) {
    if (sk && sk.antiHour && d.elem === 'hour') return sk.antiHour;
    if (!aEl || aEl === 'none' || aEl === 'hour' || d.elem === 'hour') return 1;
    if (G.OPPOSE[aEl] === d.elem) return G.tune.elemStrong;
    if (aEl === d.elem) return G.tune.elemSame;
    return 1;
  }
  attackElem(u, sk) { if (!sk || sk.elem === 'user' || !sk.elem) return sk && !sk.elem && !sk.p ? null : u.elem; return sk.elem; }
  adjAllies(a, d) { return G.hex.neighbors([d.cx, d.cy]).filter(c => { const o = this.unitAt(c); return o && o !== a && o.side === a.side; }).length; }
  hitChance(a, d, from, sk) {
    const S = this.state, dist = G.hex.dist(from, [d.cx, d.cy]), t = this.ter([d.cx, d.cy]);
    let h = G.tune.baseHit + (this.stat(a, 'agi') - this.stat(d, 'agi')) + (a.size === 'L' && d.size === 'S' ? G.tune.largeVsSmall : G.SIZE_HIT[a.size][d.size]);
    h += Math.min(15, 5 * this.adjAllies(a, d));
    h -= t.evade || 0; if (t.field && S.season === 'summer') h -= 10;
    h -= 5 * Math.max(0, dist - 2);
    if (dist > 1 && S.season === 'spring') h -= 5;
    if (S.season === 'winter' && a.elem !== 'winter') h -= 5;
    if (t.ice && a.elem !== 'winter') h -= 10;
    if (d.eff.guarded) h -= 10;
    if (sk && sk.hitBonus) h += sk.hitBonus;
    if (a.kind === 'monster') { const k = this.knightOf(a); if (k && !k.out && k.skills.includes('packtactics')) h += 10; }
    if (d.eff.sleep || d.eff.stop) h += 30;
    return clamp(Math.round(h), 15, 99);
  }
  terrainDef(d) { const t = this.ter([d.cx, d.cy]); let v = t.def || 0; if (t.forest) v = this.state.season === 'autumn' ? .1 : G.tune.forestDef; if (t.keep) v = (this.state.spec.mode === 'siege' && d.side === this.state.spec.defender) || this.state.spec.mode === 'shrine' ? .25 : 0; return v; }
  // physical damage range [min, max] before crit
  physDmg(a, d, from, sk, P) {
    const S = this.state, el = this.attackElem(a, sk || { elem: 'user' });
    let base = this.stat(a, 'atk') * P - this.stat(d, 'def') * G.tune.defFactor;
    let m = G.tune.dmgScale * this.elemMul(el, d, sk) * this.tideOf(a, true) * this.tideOf(d, false) * (1 - this.terrainDef(d)) * (d.eff.guarded ? .7 : 1) * (1 + G.tune.surroundBonus * Math.min(3, this.adjAllies(a, d)));
    const ft = this.ter(from); if (ft.hill && G.hex.dist(from, [d.cx, d.cy]) === 1) m *= 1.1;
    if (a.skills.includes('ambush') && ft.forest) m *= 1.3;
    if (a.flags.winterDmg && a.elem === 'winter') m *= 1 + a.flags.winterDmg;
    if (a.eff.windup && !sk) m *= 1.5;
    if (this.timeless(d)) m *= .5;
    const v = Math.max(1, base * m);
    return [Math.max(1, Math.round(v * .9)), Math.max(1, Math.round(v * 1.1))];
  }
  magDmg(a, d, sk) {
    const el = sk.elem;
    let v = (sk.p + this.stat(a, 'int') - this.stat(d, 'int') * .5) * G.tune.magicScale * this.elemMul(el, d, sk) * (sk.ignoreTide ? 1 : this.tideOf(a, true) * this.tideOf(d, false));
    if (d.eff.warded) v *= .8; if (this.timeless(d)) v *= .5;
    if (a.flags.elemBoost && a.flags.elemBoost[0] === el) v *= 1 + a.flags.elemBoost[1];
    v = Math.max(1, v); return [Math.max(1, Math.round(v * .9)), Math.max(1, Math.round(v * 1.1))];
  }
  critChance(a) { return Math.min(30, G.tune.critBase + this.stat(a, 'agi') / 4); }
  statusChance(a, d, base) { let c = clamp(base + (a ? this.stat(a, 'int') - this.stat(d, 'int') : 0), 10, 90) * G.tune.statusScale; if (d.boss) c /= 2; return Math.round(c); }

  /* ---- what a unit may do ---- */
  rangeOf(u, sk) {
    let r = sk ? sk.range.slice() : u.basic.range.slice();
    if ((sk ? sk.bow : u.basic.bow) && this.ter([u.cx, u.cy]).hill) r[1] += 1;
    if (!sk && u.basic.whip && u.rec.equip && u.rec.equip.weapon === 'thornwhip') r[1] = Math.max(r[1], 3);
    return r;
  }
  skillUsable(u, id) {
    const sk = G.get('skill', id), S = this.state;
    if (sk.kind === 'passive') return { ok: false, why: 'Passive' };
    if (u.acted) return { ok: false, why: 'Already acted' };
    if (sk.mp > u.mp && !(S.dev.infMP && S.sides[u.side].human)) return { ok: false, why: 'Not enough MP' };
    if (sk.kind === 'spell' && u.moved) return { ok: false, why: 'Spells need planted feet' };
    if (sk.kind === 'special' && !sk.mobile && u.moved) return { ok: false, why: 'Cannot use after moving' };
    if (sk.needMove && u.movedDist < sk.needMove) return { ok: false, why: 'Move ' + sk.needMove + ' hexes first' };
    if ((id === 'dive') && !u.fl) return { ok: false, why: 'Fliers only' };
    if (sk.once && u.once[id]) return { ok: false, why: 'Once a battle' };
    if (sk.every) { const gap = u.hp < u.mhp / 2 ? 2 : sk.every; if (u.last[id] !== undefined && S.bell - u.last[id] < gap) return { ok: false, why: 'Recharging' }; }
    return { ok: true };
  }
  // target hexes for an action from the unit's current hex
  targets(u, kind, id) {
    const S = this.state, at = [u.cx, u.cy], out = [];
    if (kind === 'attack') { const [lo, hi] = this.rangeOf(u, null); for (const o of this.foes(u)) { const d = G.hex.dist(at, [o.cx, o.cy]); if (d >= lo && d <= hi) out.push([o.cx, o.cy]); } return out; }
    if (kind === 'item') { out.push(at); for (const c of G.hex.neighbors(at)) { const o = this.unitAt(c); if (o && o.side === u.side) out.push(c); } return out; }
    const sk = G.get('skill', id);
    if (['cone2', 'cone3', 'line3', 'line4'].includes(sk.area)) return G.hex.neighbors(at).filter(c => this.inside(c));
    if (sk.range[1] === 0 && sk.range[0] === 0) return [at];
    const [lo, hi] = this.rangeOf(u, sk);
    for (const c of G.hex.within(at, hi)) {
      if (!this.inside(c) || G.hex.dist(at, c) < lo) continue;
      if (sk.area === 'single' || !sk.area) { const o = this.unitAt(c); if (!o || !this.affects(u, sk, o)) continue; if (sk.inWard && G.hex.dist(at, c) > u.ward) continue; }
      out.push(c);
    }
    return out;
  }
  affects(u, sk, o) {
    if (sk.who === 'foes') return o.side !== u.side;
    if (sk.who === 'allies') return o.side === u.side;
    if (sk.who === 'ownMon') return o.troop === u.troop && o.kind === 'monster';
    return true;
  }
  // the hexes an action touches if aimed at target hex t
  area(u, sk, t) {
    const at = [u.cx, u.cy];
    if (!sk) return [t];
    switch (sk.area) {
      case 'r1': return G.hex.within(t, 1).filter(c => this.inside(c));
      case 'r2': return G.hex.within(t, 2).filter(c => this.inside(c));
      case 'self-r1': return G.hex.within(at, 1).filter(c => this.inside(c));
      case 'self-r2': return G.hex.within(at, 2).filter(c => this.inside(c));
      case 'adj': return G.hex.neighbors(at).filter(c => this.inside(c));
      case 'cone2': case 'cone3': return G.hex.cone(at, G.hex.dirTo(at, t), u.sp === 'wyvern' || u.sp === 'frostwyrm' ? 3 : +sk.area[4]).filter(c => this.inside(c));
      case 'line3': case 'line4': return G.hex.line(at, G.hex.dirTo(at, t), +sk.area[4]).filter(c => this.inside(c));
      case 'troop': return this.state.troops[u.troop].units.map(i => this.state.units[i]).filter(o => !o.out).map(o => [o.cx, o.cy]);
      case 'ward': return G.hex.within(at, u.ward).filter(c => this.inside(c));
      default: return [t];
    }
  }
  unitsIn(u, sk, cells) { const out = []; for (const c of cells) { const o = this.unitAt(c); if (o && this.affects(u, sk || { who: 'foes' }, o)) out.push(o); } return out; }
  // { ok, why } for a command
  legal(cmd) {
    const S = this.state; if (S.over) return { ok: false, why: 'The battle is over' };
    const tr = this.active; if (!tr) return { ok: false, why: 'No troop' };
    if (cmd.t === 'end') return { ok: true };
    const u = S.units[cmd.u]; if (!u || u.out || u.troop !== tr.id) return { ok: false, why: 'Not this troop' };
    if (cmd.t === 'move') { if (u.moved || u.acted) return { ok: false, why: 'Already moved' }; const r = this.reach(u); return r.has(G.hex.key(cmd.to)) ? { ok: true } : { ok: false, why: 'Out of reach' }; }
    if (cmd.t === 'undo') return u.moved && !u.acted && u.from ? { ok: true } : { ok: false, why: 'Nothing to undo' };
    if (u.acted) return { ok: false, why: 'Already acted' };
    if (cmd.a === 'wait' || cmd.a === 'guard') return { ok: true };
    if (cmd.a === 'retreat') return u.kind === 'knight' && S.spec.mode !== 'shrine' ? { ok: true } : { ok: false, why: 'Knights only' };
    if (cmd.a === 'item') { if (u.kind !== 'knight') return { ok: false, why: 'Knights only' }; const it = G.get('item', cmd.item); if (it.slot !== 'consumable' || it.musterOnly) return { ok: false, why: 'Not usable here' }; const side = S.sides[u.side]; if (!side.items.includes(cmd.item)) return { ok: false, why: 'None left' }; }
    if (cmd.a === 'skill') { const ok = this.skillUsable(u, cmd.skill); if (!ok.ok) return ok; }
    const ts = this.targets(u, cmd.a, cmd.skill);
    return ts.some(c => G.hex.same(c, cmd.target)) ? { ok: true } : { ok: false, why: 'No target there' };
  }

  /* ---- applying commands ---- */
  apply(cmd) {
    const S = this.state, ev = [], lg = this.legal(cmd);
    if (!lg.ok) return [{ type: 'illegal', why: lg.why }];
    S.n++;
    const tr = this.active;
    if (cmd.t === 'end') { for (const id of [tr.knight, ...tr.units]) S.units[id].acted = true; ev.push({ type: 'endTroop', troop: tr.id }); this.nextTroop(ev); return ev; }
    const u = S.units[cmd.u];
    if (cmd.t === 'move') {
      const r = this.reach(u), path = this.pathTo(u, cmd.to, r);
      u.from = [u.cx, u.cy]; u.cx = cmd.to[0]; u.cy = cmd.to[1]; u.moved = true; u.movedDist = path.length - 1;
      if (path.length > 1) u.facing = Math.atan2(G.hex.center(path[path.length - 1])[1] - G.hex.center(path[path.length - 2])[1], G.hex.center(path[path.length - 1])[0] - G.hex.center(path[path.length - 2])[0]);
      ev.push({ type: 'move', u: u.id, path });
      if (S.spec.mode === 'sanctum' && u.ref === 'lunete') { const i = u.cy * S.w + u.cx; if (S.base[i] === 'D' && !S.dials[i]) { S.dials[i] = true; ev.push({ type: 'dial', i, lit: true }); } }
      return ev;
    }
    if (cmd.t === 'undo') { ev.push({ type: 'move', u: u.id, path: [[u.cx, u.cy], u.from], undo: true }); u.cx = u.from[0]; u.cy = u.from[1]; u.moved = false; u.movedDist = 0; u.from = null; return ev; }
    u.acted = true; if (!u.moved) u.moved = true;
    if (cmd.a === 'wait') ev.push({ type: 'wait', u: u.id });
    else if (cmd.a === 'guard') { u.eff.guarded = 1; ev.push({ type: 'buff', u: u.id, eff: 'guarded', src: u.id }); }
    else if (cmd.a === 'retreat') { ev.push({ type: 'retreatCmd', u: u.id }); this.knightOut(u, 'retreat', ev); }
    else if (cmd.a === 'item') this.useItem(u, cmd, ev);
    else this.strike(u, cmd.a === 'skill' ? cmd.skill : null, cmd.target, ev);
    this.checkWin(ev, false);
    if (!S.over && this.troopDone(tr)) this.nextTroop(ev);
    return ev;
  }
  useItem(u, cmd, ev) {
    const S = this.state, side = S.sides[u.side], it = G.get('item', cmd.item), t = this.unitAt(cmd.target);
    side.items.splice(side.items.indexOf(cmd.item), 1); side.used.push(cmd.item);
    ev.push({ type: 'item', u: u.id, item: cmd.item, target: t.id });
    if (it.heal) { const h = Math.min(t.mhp - t.hp, it.heal); t.hp += h; ev.push({ type: 'heal', u: t.id, amount: h }); }
    if (it.mpHeal) { t.mp = Math.min(t.mmp, t.mp + it.mpHeal); ev.push({ type: 'mp', u: t.id, amount: it.mpHeal }); }
    if (it.cleanse) this.cleanse(t, ev);
    this.gainExp(u, 8, ev);
  }
  cleanse(t, ev) { for (const k of Object.keys(t.eff)) { const e = G.get('effect', k); if (e.kind !== 'buff') { delete t.eff[k]; ev.push({ type: 'fade', u: t.id, eff: k }); } } }
  strike(u, skId, t, ev) {
    const S = this.state, sk = skId ? G.get('skill', skId) : null, at = [u.cx, u.cy];
    if (sk) { u.mp -= (S.dev.infMP && S.sides[u.side].human) ? 0 : sk.mp; if (sk.once) u.once[skId] = true; if (sk.every) u.last[skId] = S.bell; }
    if (!G.hex.same(t, at)) u.facing = Math.atan2(G.hex.center(t)[1] - G.hex.center(at)[1], G.hex.center(t)[0] - G.hex.center(at)[0]);
    if (u.eff.sleep) delete u.eff.sleep;
    const cells = this.area(u, sk, t);
    ev.push({ type: 'act', u: u.id, skill: skId, target: t, cells, elem: sk ? this.attackElem(u, sk) : u.elem, kind: sk ? sk.kind : 'attack' });
    // Mad Gambit misfires (unless the Duke is lucid)
    if (skId === 'madgambit' && !(S.dev.lucid) && R.next(S.rng) < sk.misfire) { ev.push({ type: 'misfire', u: u.id }); this.tryStatus(null, u, 'chill', 100, ev); return; }
    if (sk && sk.burns && S.season === 'summer') for (const c of cells) { const i = c[1] * S.w + c[0]; if (this.ter(c).forest && !S.fire[i]) { S.fire[i] = { t: 2 }; S.cells[i] = 'fire'; ev.push({ type: 'terrain', i, code: 'fire' }); } }
    const hits = sk ? this.unitsIn(u, sk, cells) : [this.unitAt(t)].filter(Boolean);
    for (const d of hits) {
      if (d.out) continue;
      if (sk && (sk.heal || sk.healPct)) { const amt = sk.heal ? Math.round((sk.heal + this.stat(u, 'int') * .8) * G.tune.healScale) : Math.round(d.mhp * sk.healPct); const h = Math.min(d.mhp - d.hp, amt); d.hp += h; ev.push({ type: 'heal', u: d.id, amount: h }); this.gainExp(u, 8, ev); continue; }
      if (sk && sk.cleanse) { this.cleanse(d, ev); this.gainExp(u, 8, ev); continue; }
      if (sk && sk.steal) { const m = Math.min(d.mp, sk.steal); d.mp -= m; u.mp = Math.min(u.mmp, u.mp + m); ev.push({ type: 'mp', u: d.id, amount: -m }); continue; }
      const harmful = !sk || sk.p || sk.pctMax || (sk.status && d.side !== u.side);
      if (harmful && (sk ? (sk.p || sk.pctMax) : true)) this.hit(u, d, sk, at, ev);
      if (d.out) continue;
      if (sk && sk.status && (d.side !== u.side || sk.who === 'all')) this.tryStatus(u, d, sk.status[0], sk.status[1], ev);
      if (sk && sk.buff && (d.side === u.side)) { for (const b of [sk.buff, sk.buff2, sk.buff3].filter(Boolean)) { d.eff[b[0]] = b[1]; ev.push({ type: 'buff', u: d.id, eff: b[0], src: u.id }); } this.gainExp(u, 8, ev); }
    }
    if (sk && sk.breaksTimeless) for (const d of hits) if (d.ref === 'graynight') { S.timelessBreak = S.bell + 1; ev.push({ type: 'timelessBreak' }); }
    if (sk && sk.push) for (const d of hits) if (!d.out) this.push(u, d, ev);
    if (u.eff.windup && !sk) delete u.eff.windup;
  }
  hit(a, d, sk, from, ev) {
    const S = this.state, magic = sk && sk.magic, always = magic || (sk && (sk.always || sk.pctMax)), hitP = always ? 100 : this.hitChance(a, d, from, sk);
    if (!always && R.next(S.rng) * 100 >= hitP) { ev.push({ type: 'miss', u: d.id, src: a.id }); return; }
    let dmg, crit = false;
    if (sk && sk.pctMax) dmg = Math.round(d.mhp * sk.pctMax * (this.timeless(d) ? .5 : 1));
    else {
      const [lo, hi] = magic ? this.magDmg(a, d, sk) : this.physDmg(a, d, from, sk, sk ? sk.p : a.basic.p);
      dmg = lo + Math.floor(R.next(S.rng) * (hi - lo + 1));
      if (!magic && R.next(S.rng) * 100 < this.critChance(a)) { crit = true; dmg = Math.round(dmg * 1.5); }
    }
    if (S.dev.oneHit && S.sides[a.side].human) dmg = d.hp;
    const el = this.attackElem(a, sk || { elem: 'user' }), em = this.elemMul(el, d, sk);
    this.damage(d, dmg, a, ev, { crit, strong: em > 1.01, weak: em < .99, tide: this.tideOf(a, true) });
    if (!d.out && !sk && a.basic.status) this.tryStatus(a, d, a.basic.status[0], a.basic.status[1], ev);
    if (!d.out && !sk && a.skills.includes('frostfang')) this.tryStatus(a, d, 'chill', 30, ev);
    if (!d.out && !sk && a.skills.includes('stopbite')) this.tryStatus(a, d, 'stop', 20, ev);
    const drain = (sk && sk.drain) || (!sk && a.basic.drain); if (drain && !a.out) { const h = Math.min(a.mhp - a.hp, Math.round(dmg * drain)); if (h > 0) { a.hp += h; ev.push({ type: 'heal', u: a.id, amount: h }); } }
    if (d.flags.thorns && G.hex.dist(from, [d.cx, d.cy]) === 1 && !magic && !a.out) this.damage(a, Math.max(1, Math.round(dmg * .1)), null, ev, { why: 'thorns' });
  }
  damage(d, dmg, a, ev, o = {}) {
    const S = this.state;
    if (S.dev.god && S.sides[d.side].human) dmg = 0;
    dmg = Math.min(dmg, d.hp); d.hp -= dmg; if (d.eff.sleep && dmg > 0) delete d.eff.sleep;
    ev.push(Object.assign({ type: 'hit', u: d.id, src: a ? a.id : null, dmg }, o));
    if (a) { a.dealt += dmg; if (S.spec.mode === 'shrine') { const g = Math.floor((a.dealt) / 5) - Math.floor((a.dealt - dmg) / 5); if (g > 0) { S.sides[a.side].glory += g; } } this.gainExp(a, clamp(8 + 2 * (d.lvl - a.lvl), 2, 30), ev); }
    if (d.hp <= 0) {
      if (d.skills.includes('rebirth') && !d.once.rebirth) { d.once.rebirth = true; d.hp = Math.round(d.mhp * .3); ev.push({ type: 'rebirth', u: d.id }); return; }
      if (a) { a.kos++; this.gainExp(a, d.kind === 'knight' ? (d.ruler ? 60 : 40) : 20, ev); if (S.spec.mode === 'shrine') { const g = d.kind === 'knight' ? 25 : 10; S.sides[a.side].glory += g; ev.push({ type: 'glory', side: a.side, amount: g, why: 'ko' }); } }
      if (d.kind === 'knight') this.knightOut(d, 'ko', ev); else { d.out = 'dead'; ev.push({ type: 'ko', u: d.id }); }
    } else if (d.ref === 'graynight' && !S.gkCalled && d.hp < d.mhp / 2) this.callSecondHands(d, ev);
  }
  callSecondHands(gk, ev) {
    const S = this.state; S.gkCalled = true;
    const near = G.hex.within([gk.cx, gk.cy], 3).filter(c => this.inside(c) && this.standable(c, null) && !this.unitAt(c));
    for (let i = 0; i < 2 && near.length; i++) { const c = near.shift(); const m = this.addMonster({ uid: 'second' + i, sp: 'minute', tier: 3, lvl: 14 }, gk.side, gk.troop, c); m.facing = Math.PI / 2; m.acted = true; ev.push({ type: 'summon', u: m.id }); }
  }
  tryStatus(a, d, st, base, ev) {
    const S = this.state; if (d.out) return;
    if (this.timeless(d) || d.flags.immune.includes(st)) { ev.push({ type: 'resist', u: d.id, eff: st }); return; }
    if (st === 'stop' && d.stopImm >= S.bell) { ev.push({ type: 'resist', u: d.id, eff: st }); return; }
    const ch = this.statusChance(a, d, base);
    if (R.next(S.rng) * 100 < ch) { d.eff[st] = G.get('effect', st).bells + (st === 'stop' ? 0 : 0); ev.push({ type: 'status', u: d.id, eff: st }); if (a) this.gainExp(a, 4, ev); }
    else ev.push({ type: 'resist', u: d.id, eff: st });
  }
  push(a, d, ev) {
    const dir = G.hex.dirTo([a.cx, a.cy], [d.cx, d.cy]), to = G.hex.neighbor([d.cx, d.cy], dir);
    if (this.inside(to) && !this.unitAt(to) && this.standable(to, d)) { ev.push({ type: 'move', u: d.id, path: [[d.cx, d.cy], to], push: true }); d.cx = to[0]; d.cy = to[1]; }
    else this.damage(d, 4, null, ev, { why: 'slam' });
  }
  knightOut(k, why, ev) {
    const S = this.state, tr = S.troops[k.troop];
    k.out = why === 'ko' ? 'down' : 'retreat';
    ev.push({ type: why === 'ko' ? 'knightDown' : 'retreat', u: k.id });
    tr.gone = true;
    for (const id of tr.units) {
      const m = S.units[id]; if (m.out) continue;
      const foesK = S.units.filter(o => !o.out && o.kind === 'knight' && o.side !== m.side);
      const near = foesK.filter(o => G.hex.dist([o.cx, o.cy], [m.cx, m.cy]) <= Math.max(1, o.ward));
      if (near.length && !m.boss && S.spec.mode !== 'shrine') {
        let ch = G.tune.captureBase + (this.outsideWard(m) ? .25 : 0) + (m.hp < m.mhp * .3 ? .15 : 0); ch = Math.min(.75, ch);
        if (R.next(S.rng) < ch) {
          near.sort((p, q) => G.hex.dist([p.cx, p.cy], [m.cx, m.cy]) - G.hex.dist([q.cx, q.cy], [m.cx, m.cy]) || p.id - q.id);
          m.out = 'captured'; S.captures.push({ u: m.id, side: near[0].side, by: near[0].id });
          ev.push({ type: 'capture', u: m.id, by: near[0].id }); continue;
        }
      }
      m.out = 'retreat'; ev.push({ type: 'retreat', u: m.id });
    }
    if (k.ruler && S.spec.mode !== 'shrine') {   // a fallen ruler routs the side
      for (const t of S.troops) if (t.side === k.side && !t.gone) { const kk = S.units[t.knight]; this.knightOut(kk, 'retreat', ev); }
      S.sides[k.side].routed = true;
    }
  }
  checkWin(ev, bellEnd) {
    const S = this.state; if (S.over) return;
    const mode = S.spec.mode, hasK = si => S.units.some(u => !u.out && u.kind === 'knight' && u.side === si);
    const end = (winner, why) => { S.over = { winner, why, bell: S.bell }; this.finishExp(); ev.push({ type: 'over', winner, why }); };
    if (mode === 'shrine') {
      const alive = S.sides.filter(s => hasK(s.id));
      if (alive.length <= 1 || (bellEnd && S.bell >= S.bells)) {
        for (const s of S.sides) if (hasK(s.id)) { s.glory += 10; ev.push({ type: 'glory', side: s.id, amount: 10, why: 'standing' }); }
        const best = Math.max(...S.sides.map(s => s.glory)); end(S.sides.findIndex(s => s.glory === best), 'glory');
      }
      return;
    }
    const A = S.spec.attacker, D = S.spec.defender;
    if (mode === 'sanctum') { const gk = S.units.find(u => u.ref === 'graynight'); if (gk && gk.out) return end(A, 'graynight'); if (!hasK(A)) return end(D, 'rout'); if (bellEnd && S.bell >= S.bells) return end(D, 'thirteenth'); return; }
    if (!hasK(A)) return end(D, 'rout');
    if (!hasK(D)) return end(A, 'rout');
    if (bellEnd && S.bell >= S.bells) { const onKeep = S.keeps.some(c => { const u = this.unitAt(c); return u && u.kind === 'knight' && u.side === A; }); end(onKeep ? A : D, onKeep ? 'keep' : 'time'); }
  }
  finishExp() { const S = this.state; for (const u of S.units) { if (u.out === 'dead' || u.out === 'captured') continue; const won = S.over && S.over.winner === u.side; this.gainExp(u, won ? 10 : 4, null); } }
  gainExp(u, n, ev) {
    const S = this.state; if (u.boss || u.ref === 'graynight') return;
    n = Math.round(n * G.tune.expScale * (S.sides[u.side].expMul || 1)); u.exp += n; u.expGain += n;
    while (u.exp >= 100 && u.lvl < 40) {
      u.exp -= 100; let gains;
      if (u.kind === 'knight') { gains = G.levelUpKnight(u.rec, S.rng); for (const s of ['atk', 'def', 'int', 'agi']) u[s] += gains[s]; u.mhp += gains.hp; u.hp += gains.hp; u.mmp += gains.mp; u.mp += gains.mp; const ns = G.knightSkills(u.cls, u.elem, u.rec.lvl); for (const s of ns) if (!u.skills.includes(s)) u.skills.push(s); }
      else { gains = G.levelUpMonster(u.rec); for (const s of ['atk', 'def', 'int', 'agi']) u[s] += gains[s]; u.mhp += gains.hp; u.hp += gains.hp; u.mmp += gains.mp; u.mp += gains.mp; }
      u.lvl++; u.lvls++; u.rec.exp = u.exp;
      if (ev) ev.push({ type: 'levelup', u: u.id, lvl: u.lvl, gains });
    }
    u.rec.exp = u.exp;
  }
  /* ---- forecast (§5.12): for each unit an action touches ---- */
  forecast(u, kind, skId, t) {
    const sk = kind === 'skill' ? G.get('skill', skId) : null, cells = kind === 'item' ? [t] : this.area(u, sk, t), out = [], from = [u.cx, u.cy];
    const hits = kind === 'attack' ? [this.unitAt(t)].filter(Boolean) : kind === 'item' ? [this.unitAt(t)].filter(Boolean) : this.unitsIn(u, sk, cells);
    for (const d of hits) {
      const f = { u: d.id, name: d.name, side: d.side };
      if (kind === 'item') { const it = G.get('item', skId); f.heal = it.heal ? Math.min(d.mhp - d.hp, it.heal) : 0; f.note = it.name; out.push(f); continue; }
      if (sk && (sk.heal || sk.healPct)) { f.heal = Math.min(d.mhp - d.hp, sk.heal ? Math.round((sk.heal + this.stat(u, 'int') * .8) * G.tune.healScale) : Math.round(d.mhp * sk.healPct)); out.push(f); continue; }
      if (sk && (sk.buff || sk.cleanse || sk.steal) && !sk.p) { f.note = sk.buff ? G.get('effect', sk.buff[0]).name : sk.cleanse ? 'Cleanse' : 'MP -' + sk.steal; out.push(f); continue; }
      if (!sk || sk.p || sk.pctMax) {
        const magic = sk && sk.magic, always = magic || (sk && (sk.always || sk.pctMax));
        f.hit = always ? 100 : this.hitChance(u, d, from, sk);
        f.dmg = sk && sk.pctMax ? [Math.round(d.mhp * sk.pctMax), Math.round(d.mhp * sk.pctMax)] : magic ? this.magDmg(u, d, sk) : this.physDmg(u, d, from, sk, sk ? sk.p : u.basic.p);
        f.crit = magic ? 0 : Math.round(this.critChance(u));
        f.ko = f.dmg[0] >= d.hp;
        const em = this.elemMul(this.attackElem(u, sk || { elem: 'user' }), d, sk); f.elem = em > 1.01 ? 'strong' : em < .99 ? 'weak' : null;
        f.tide = this.tideOf(u, true);
      }
      if (sk && sk.status && d.side !== u.side) f.status = [G.get('effect', sk.status[0]).name, this.timeless(d) || d.flags.immune.includes(sk.status[0]) ? 0 : this.statusChance(u, d, sk.status[1])];
      if (d.kind === 'knight' && f.ko) f.captureRisk = true;
      out.push(f);
    }
    return out;
  }
  // expected damage of an action on d (AI and danger maps)
  expected(u, sk, d, from) {
    const save = [u.cx, u.cy]; u.cx = from[0]; u.cy = from[1];
    let e = 0;
    try {
      if (sk && sk.pctMax) e = d.mhp * sk.pctMax;
      else if (!sk || sk.p) { const magic = sk && sk.magic, [lo, hi] = magic ? this.magDmg(u, d, sk) : this.physDmg(u, d, from, sk, sk ? sk.p : u.basic.p), hit = magic || (sk && sk.always) ? 1 : this.hitChance(u, d, from, sk) / 100; e = (lo + hi) / 2 * hit * (magic ? 1 : 1 + this.critChance(u) / 200); }
    } finally { u.cx = save[0]; u.cy = save[1]; }
    return e;
  }
  // results for the campaign: each unit's record back, captures, who fell
  results() {
    const S = this.state;
    return { winner: S.over ? S.over.winner : null, why: S.over && S.over.why, bell: S.bell, captures: S.captures.map(c => ({ rec: S.units[c.u].rec, side: c.side, by: S.units[c.by].ref, hp: S.units[c.u].hp })),
      units: S.units.map(u => ({ side: u.side, kind: u.kind, ref: u.ref, out: u.out, hp: u.hp, mp: u.mp, rec: Object.assign(u.rec, { exp: u.exp }), lvls: u.lvls, expGain: u.expGain, name: u.name })),
      used: S.sides.map(s => s.used), glory: S.sides.map(s => s.glory) };
  }
}
G.BattleSim = BattleSim;

// ---- 21-ai-battle.js ----
/* ---- BATTLE AI (§5.13): scores every reachable hex and every legal action from it; the same state always gives the
 * same plan. Serves CPU sides, Delegate (auto-resolve), the attract mode, the hub host for timed-out players and the bots ---- */
G.BattleAI = {
  // the next unit's commands in the active troop: [move?, act] or [{ t: 'end' }]
  next(sim, o = {}) {
    const S = sim.state, tr = sim.active; if (!tr) return [];
    const ids = [tr.knight, ...tr.units].map(i => S.units[i]).filter(u => !u.out && !u.acted);
    if (!ids.length) return [{ t: 'end' }];
    const foes = sim.foes(ids[0]); if (!foes.length) return [{ t: 'end' }];
    const near = u => Math.min(...foes.map(f => G.hex.dist([u.cx, u.cy], [f.cx, f.cy])));
    const castNow = u => u.skills.some(s => { const k = G.get('skill', s); return k.kind === 'spell' && k.p && sim.skillUsable(u, s).ok; }) || (u.basic.range[1] > 1 && near(u) <= u.basic.range[1]);
    ids.sort((a, b) => (b.kind === 'monster') - (a.kind === 'monster') || castNow(b) - castNow(a) || near(a) - near(b) || a.id - b.id);
    const u = ids[0];
    return this.plan(sim, u, o);
  },
  danger(sim, u) {   // expected damage foes could deal at each hex next bell
    const S = sim.state, map = new Map(), foes = sim.foes(u);
    for (const f of foes) {
      const e = sim.expected(f, null, u, [f.cx, f.cy]) * (f.basic.range[1] > 1 ? 1 : 1), reach = sim.effMov(f) + f.basic.range[1];
      for (const c of G.hex.within([f.cx, f.cy], reach)) { if (!sim.inside(c)) continue; const k = G.hex.key(c); map.set(k, (map.get(k) || 0) + e); }
    }
    return map;
  },
  plan(sim, u, o = {}) {
    const S = sim.state, side = S.sides[u.side], diff = o.diff || side.ai || 'normal', start = [u.cx, u.cy], reach = sim.reach(u), danger = this.danger(sim, u);
    const foes = sim.foes(u), isK = u.kind === 'knight', lowHP = u.hp < u.mhp * .4;
    const keepD = c => S.keeps.length ? Math.min(...S.keeps.map(k => G.hex.dist(c, k))) : 0;
    const myK = sim.knightOf(u), late = S.bell >= Math.max(1, S.bells - 4), attacker = u.side === S.spec.attacker;
    const unlit = S.spec.mode === 'sanctum' ? S.base.map((c, i) => c === 'D' && !S.dials[i] ? [i % S.w, Math.floor(i / S.w)] : null).filter(Boolean) : [];
    const lit = S.spec.mode === 'sanctum' ? S.base.map((c, i) => c === 'D' && S.dials[i] ? [i % S.w, Math.floor(i / S.w)] : null).filter(Boolean) : [];
    // retreat: a non-ruler knight low on HP when its side is losing on power
    if (isK && !u.ruler && u.hp < u.mhp * .25 && S.spec.mode === 'siege' && side.ai !== 'showcase') {
      const pow = si => sim.live(si).reduce((a, x) => a + x.hp + 4 * (x.atk + x.def), 0);
      if (pow(u.side) < pow(1 - u.side) * .7) return [{ t: 'act', u: u.id, a: 'retreat', target: start }];
    }
    const cands = [];
    const posScore = c => {
      const k = G.hex.key(c); let s = -(danger.get(k) || 0) * (isK ? (u.ruler ? 3 : 1.5) : .6) * (lowHP ? 2 : 1) / Math.max(10, u.hp) * 10;
      if (u.kind === 'monster' && myK && !myK.out && G.hex.dist(c, [myK.cx, myK.cy]) > myK.ward) s -= 12;
      s += 10 * Math.max(0, sim.terrainDef({ cx: c[0], cy: c[1], side: u.side }));
      if (S.spec.mode === 'siege' && late) s -= (attacker ? 2 : isK ? 3 : 0) * keepD(c);
      if (S.spec.mode === 'shrine') s -= 1.2 * keepD(c) * (S.bell > 1 ? 1 : .5);
      if (S.spec.mode === 'sanctum') {
        if (u.side === S.spec.attacker) { if (unlit.some(d => G.hex.same(d, c))) s += 30; else if (u.kind === 'monster' && unlit.length) s -= 1.5 * Math.min(...unlit.map(d => G.hex.dist(c, d))); }
        else if (u.sp === 'minute' && lit.length) { if (lit.some(d => G.hex.same(d, c))) s += 25; else s -= 1.5 * Math.min(...lit.map(d => G.hex.dist(c, d))); }
      }
      return s;
    };
    const ranged = u.basic.range[1] > 1 || u.skills.some(s => G.get('skill', s).magic);
    for (const [k, r] of reach) {
      const c = r.c, moved = !G.hex.same(c, start), base = posScore(c);
      const saveX = u.cx, saveY = u.cy, sm = u.moved, sd = u.movedDist;
      u.cx = c[0]; u.cy = c[1]; u.moved = moved || sm; u.movedDist = moved ? r.cost : sd;
      try {
        let acted = false;
        const tryAct = (a, skId, t, val) => { if (val > 1) { cands.push({ c, a, skill: skId, t, score: base + val }); acted = true; } };
        // basic attack
        for (const t of sim.targets(u, 'attack')) { const d = sim.unitAt(t); tryAct('attack', null, t, this.value(sim, u, null, [d], c, diff)); }
        for (const id of u.skills) {
          const sk = G.get('skill', id); if (!sim.skillUsable(u, id).ok) continue;
          let ts = sim.targets(u, 'skill', id);
          if (sk.area === 'r1' || sk.area === 'r2') ts = ts.filter(t => sim.unitAt(t) || G.hex.neighbors(t).some(n => sim.inside(n) && sim.unitAt(n)));
          for (const t of ts) { const hit = sim.unitsIn(u, sk, sim.area(u, sk, t)); if (!hit.length) continue; tryAct('skill', id, t, this.value(sim, u, sk, hit, c, diff)); }
        }
        // no target from here: close the distance (melee) or keep at range
        let idle = base;
        if (foes.length) { const nd = Math.min(...foes.map(f => G.hex.dist(c, [f.cx, f.cy]))); idle -= ranged ? 1.5 * Math.abs(nd - 3) : 1.2 * nd; }
        if (u.ruler && S.spec.mode === 'siege' && !attacker) idle -= .5 * keepD(c);
        cands.push({ c, a: isK && danger.get(k) > u.hp * .3 ? 'guard' : 'wait', t: c, score: idle - (acted ? 1 : 0) });
      } finally { u.cx = saveX; u.cy = saveY; u.moved = sm; u.movedDist = sd; }
    }
    cands.sort((a, b) => b.score - a.score || a.c[1] - b.c[1] || a.c[0] - b.c[0]);
    let pick = cands[0];
    if (diff === 'easy' && cands.length > 2) { const h = (S.n * 7 + u.id * 13 + S.bell) % 6; pick = cands[h < 3 ? 0 : h < 5 ? 1 : 2]; }
    if (!pick) return [{ t: 'act', u: u.id, a: 'wait', target: start }];
    const out = [];
    if (!G.hex.same(pick.c, start)) out.push({ t: 'move', u: u.id, to: pick.c });
    out.push({ t: 'act', u: u.id, a: pick.a === 'attack' ? 'attack' : pick.a, skill: pick.skill, target: pick.t });
    return out;
  },
  value(sim, u, sk, hit, from, diff) {
    let v = 0;
    for (const d of hit) {
      const ally = d.side === u.side, w = 1 + (d.kind === 'knight' ? .5 : 0) + (d.ruler ? 1 : 0);
      if (sk && (sk.heal || sk.healPct)) { const h = Math.min(d.mhp - d.hp, sk.heal ? sk.heal + u.int * .8 : d.mhp * sk.healPct); v += ally ? 1.2 * h * (d.kind === 'knight' ? 2 : 1) : -h; continue; }
      if (sk && sk.buff && !sk.p) { if (ally && !d.eff[sk.buff[0]]) v += 8 + (d.kind === 'knight' ? 4 : 0); continue; }
      if (sk && sk.cleanse) { if (ally && Object.keys(d.eff).some(k => G.get('effect', k).kind !== 'buff')) v += 12; continue; }
      if (sk && sk.steal) { if (!ally) v += Math.min(d.mp, sk.steal) * .8; continue; }
      let e = sim.expected(u, sk, d, from);
      if (ally) { v -= 1.5 * e; continue; }
      v += e * w;
      if (e >= d.hp) v += d.ruler ? 110 : d.kind === 'knight' ? 70 : 30;
      if (diff === 'hard' && d.hp < d.mhp) v += 15;
      if (sk && sk.status && !d.eff[sk.status[0]]) v += sim.statusChance(u, d, sk.status[1]) / 100 * 14;
    }
    if (sk && sk.mp) v -= sk.mp * .3;
    return v;
  },
  // run the active troop's units until its turn ends
  troop(sim, o) { const S = sim.state, tr = sim.active; if (!tr) return []; const ev = []; let guard = 0; while (sim.active === tr && !S.over && guard++ < 40) ev.push(...this.step(sim, o)); return ev; },
  // one unit's commands, applied; an illegal plan falls back to waiting (and, failing that, ends the troop)
  step(sim, o) { const ev = []; for (const c of this.next(sim, o)) { const r = sim.apply(c); if (r.length && r[0].type === 'illegal') { const w = c.u !== undefined ? sim.apply({ t: 'act', u: c.u, a: 'wait', target: [sim.state.units[c.u].cx, sim.state.units[c.u].cy] }) : []; ev.push(...(w.length && w[0].type !== 'illegal' ? w : sim.apply({ t: 'end' }))); break; } ev.push(...r); } return ev; },
  // Delegate: the AI on every side to the end, no drawing
  resolve(sim, o) { const S = sim.state; let guard = 0; while (!S.over && guard++ < 2000) this.troop(sim, o); return sim.results(); }
};

// ---- 22-sim-campaign.js ----
/* ---- CAMPAIGNSIM (§4): the war of the seasons as plain JSON state. Commands in, reports out; seeded G.Rng only ---- */
const CR = G.Rng;
G.DIFF = { easy: { aiMana: .8, threshold: 1.35, candle: 18, battleAI: 'easy', exp: 1.25 }, normal: { aiMana: 1, threshold: 1.1, candle: 15, battleAI: 'normal', exp: 1 }, hard: { aiMana: 1.25, threshold: .95, candle: 12, battleAI: 'hard', exp: 1 } };
G.unitPower = (st, lvl, knight) => (st.hp + 4 * (st.atk + st.def + st.int) + 2 * st.agi) * (1 + .05 * (lvl - 1)) * (knight ? 1.2 : 1);
G.makeKnightRec = (id, lvlOverride) => {   // a knight's starting record: tier-1 line growth, then ×1.10 and the tier's growth at each class change
  const d = G.get('knight', id), c = G.get('class', d.cls), lvl = lvlOverride || d.lvl, st = {};
  G.STATS.forEach((s, i) => {
    const b = c.base[i], g = c.growth[i];
    if ((c.tier || 1) === 1) st[s] = b + g * (lvl - 1);
    else if (c.tier === 2) st[s] = (b + g * 9) * 1.1 + g * 1.15 * (lvl - 10);
    else st[s] = ((b + g * 9) * 1.1 + g * 1.15 * 10) * 1.1 + g * 1.3 * (lvl - 20);
    st[s] = Math.round(st[s]);
  });
  return { id, realm: d.realm, castle: d.castle, cls: d.cls, lvl, exp: 0, elem: d.elem, stats: st, hp: st.hp, mp: st.mp, equip: {}, troop: [], formation: 'vanguard', wounded: 0, quest: null, moved: false, marched: false, ruler: !!d.ruler, bondBonus: 0, extraSkills: [] };
};
class CampaignSim {
  constructor(state) { this.state = state; }
  static create(o = {}) {
    const diff = o.difficulty || 'normal', S = { v: 1, seed: o.seed || 1, rng: CR.make(o.seed || 1), si: 0, year: 1, phase: 'tidings', difficulty: diff, humans: (o.humans || []).slice(), turn: 0,
      candle: null, candleMax: Math.round(G.tune.candleSeasons * (G.DIFF[diff].candle / 12)), realms: {}, castles: {}, knights: {}, monsters: {}, nextUid: 1, marches: [], queue: [], flags: {}, seen: {}, chronicle: [], stilled: null, over: null, done: {}, lastBattles: [], season0: true };
    const sim = new CampaignSim(S);
    for (const r of G.all('realm')) S.realms[r.id] = { mana: r.id === 'dominion' ? 300 : r.id === 'brigands' ? 0 : 120, items: (G.START_ITEMS[r.id] || []).slice(), alive: true, human: S.humans.includes(r.id), seat: S.humans.indexOf(r.id), aggression: r.aggression || 1, ai: {}, firstBattle: false };
    for (const c of G.all('castle')) S.castles[c.id] = { owner: c.owner, knights: [], reserve: [], stilled: false, treasuryTaken: false, summons: 0, extra: [] };
    for (const k of G.all('knight')) {
      if (!k.realm || !k.castle || k.id === 'graynight' || k.id === 'sergeant') continue;
      const rec = G.makeKnightRec(k.id); S.knights[k.id] = rec; S.castles[k.castle].knights.push(k.id);
      for (const [sp, lvl, tier] of k.troop) rec.troop.push(sim.newMonster(sp, lvl, tier || 1, k.realm));
    }
    for (const cid in G.START_RESERVE) for (const [sp, lvl] of G.START_RESERVE[cid]) S.castles[cid].reserve.push(sim.newMonster(sp, lvl, 1, S.castles[cid].owner));
    sim.chron('The Brigantime begins.');
    return sim;
  }
  static load(json) { return new CampaignSim(typeof json === 'string' ? JSON.parse(json) : G.clone(json)); }
  serialize() { return G.clone(this.state); }
  hash() { return G.hashStr(JSON.stringify(this.state)); }
  /* ---- helpers ---- */
  season() { return G.SEASONS[this.state.si]; }
  nextSeason() { return G.SEASONS[(this.state.si + 1) % 4]; }
  owner(c) { return this.state.castles[c].owner; }
  chron(text) { this.state.chronicle.push({ season: this.season(), year: this.state.year, text }); if (this.state.chronicle.length > 200) this.state.chronicle.shift(); }
  newMonster(sp, lvl, tier, realm) { const S = this.state, uid = 'm' + (S.nextUid++), st = G.monsterStats(sp, tier, lvl); S.monsters[uid] = { uid, sp, tier, lvl, exp: 0, hp: st.hp, mp: st.mp, realm }; return uid; }
  mon(uid) { return this.state.monsters[uid]; }
  kn(id) { return this.state.knights[id]; }
  castlesOf(r) { return Object.keys(this.state.castles).filter(c => this.state.castles[c].owner === r); }
  knightsOf(r) { return Object.values(this.state.knights).filter(k => k.realm === r); }
  knightAlive(id, r) { const k = this.kn(id); return !!k && k.realm === r; }
  realmMonsters(r) { const S = this.state, out = []; for (const k of this.knightsOf(r)) for (const u of k.troop) out.push(S.monsters[u]); for (const c of this.castlesOf(r)) for (const u of S.castles[c].reserve) out.push(S.monsters[u]); return out.filter(Boolean); }
  capital(r) { const cap = G.get('realm', r).capital; return cap && this.owner(cap) === r ? cap : this.castlesOf(r)[0]; }
  regionOn(c) { return (G.REGION_SEASONS[G.get('castle', c).region] || []).includes(this.season()); }
  income(r) {
    const S = this.state, diff = G.DIFF[S.difficulty]; let inc = 0;
    for (const c of this.castlesOf(r)) { if (S.castles[c].stilled) continue; let y = G.get('castle', c).mana * G.tune.manaIncome; if (this.regionOn(c)) y *= 1 + G.tune.seasonYield; inc += y; }
    if (!S.realms[r].human && r !== 'brigands') inc *= diff.aiMana * (1 + G.tune.aiManaBonus) * (r === 'dominion' ? .75 : 1);
    return Math.round(inc);
  }
  upkeep(r) { let u = 0; for (const m of this.realmMonsters(r)) { let x = G.upkeepOf(m.sp, m.tier) * G.tune.upkeepScale; if (this.season() === 'winter' && G.get('monster', m.sp).elem !== 'winter') x *= 1 + G.tune.winterUpkeep; u += x; } return Math.round(u); }
  knightStats(id) { const k = this.kn(id); return G.knightView(k); }
  bondUsed(id) { return this.kn(id).troop.reduce((a, u) => a + G.get('monster', this.mon(u).sp).rank, 0); }
  bondMax(id) { return this.knightStats(id).mods.bond; }
  troopPower(id) { const k = this.kn(id), kv = G.knightView(k); let p = G.unitPower(Object.assign({}, kv.st, { hp: k.hp }), k.lvl, true); for (const u of k.troop) { const m = this.mon(u), st = G.monsterStats(m.sp, m.tier, m.lvl); p += G.unitPower(Object.assign({}, st, { hp: m.hp }), m.lvl, false); } return p * (this.state.realms[k.realm] && this.state.realms[k.realm].human ? 1 + G.tune.aiPlayerBoost : 1); }
  canAct(id) { const k = this.kn(id); return k && !k.wounded && !k.quest && !this.state.castles[k.castle].stilled; }
  adjacentFoes(c, r) { return (G.adj[c] || []).filter(n => this.owner(n) !== r); }
  /* ---- the season's start: Tidings (§4.3) ---- */
  beginSeason() {
    const S = this.state, rep = [];
    S.phase = 'tidings'; S.done = {}; S.marches = []; S.queue = []; S.lastBattles = [];
    rep.push({ kind: 'season', season: this.season(), year: S.year });
    if (S.candle !== null && !S.season0) { S.candle = Math.max(0, S.candle - 1); rep.push({ kind: 'candle', n: S.candle }); }
    const firstSeason = S.season0; S.season0 = false;
    if (S.candle === 0 && !S.flags.grayKnightDown) { this.end({ kind: 'candle' }); rep.push({ kind: 'over' }); return rep; }
    // recovery
    for (const k of Object.values(S.knights)) {
      if (k.wounded > 0) k.wounded--; k.moved = false; k.marched = false;
      if (k.castle && !k.quest && !firstSeason && G.tune.drillExp > 0 && !k.wounded && S.realms[k.realm] && S.realms[k.realm].human) { this.giveExp(k, G.tune.drillExp); for (const u of k.troop) this.giveMonExp(this.mon(u), G.tune.drillExp); }   // the seasonal drill
      if (k.castle && !k.quest) { const kv = G.knightView(k); k.hp = kv.st.hp; k.mp = kv.st.mp; for (const u of k.troop) this.healMon(u); }
    }
    for (const c in S.castles) { S.castles[c].summons = 0; for (const u of S.castles[c].reserve) this.healMon(u); }
    if (S.stilled) { S.castles[S.stilled].stilled = false; S.stilled = null; }
    // stillness from Autumn of Year 3
    if (S.year > 3 || (S.year === 3 && S.si >= 2)) {
      const cands = Object.keys(S.castles).filter(c => c !== 'meridian' && this.owner(c) !== 'dominion' && (G.adj[c] || []).some(n => this.owner(n) === 'dominion'));
      if (cands.length && !S.flags.grayKnightDown) { const c = CR.pick(S.rng, cands.sort()); S.castles[c].stilled = true; S.stilled = c; S.flags.stilledOnce = true; rep.push({ kind: 'stilled', castle: c }); this.chron(G.get('castle', c).name + ' is Stilled.'); }
    }
    // quests return
    for (const k of Object.values(S.knights)) if (k.quest) { k.quest.back--; if (k.quest.back <= 0) rep.push(this.questReturn(k)); }
    // income and upkeep
    for (const r in S.realms) {
      const R = S.realms[r]; if (!R.alive || r === 'brigands') continue;
      const inc = this.income(r), up = this.upkeep(r); R.mana += inc - up; const lost = [];
      while (R.mana < 0) { const ms = this.realmMonsters(r); if (!ms.length) { R.mana = 0; break; } ms.sort((a, b) => this.monPower(a) / G.upkeepOf(a.sp, a.tier) - this.monPower(b) / G.upkeepOf(b.sp, b.tier) || (a.uid < b.uid ? -1 : 1)); const m = ms[0]; lost.push(G.get('monster', m.sp).names[m.tier - 1]); R.mana += Math.round(G.upkeepOf(m.sp, m.tier)); this.removeMonster(m.uid); }
      rep.push({ kind: 'income', realm: r, income: inc, upkeep: up, mana: R.mana, lost });
    }
    // brigands heal fully; the Dominion's moods
    if (S.realms.hoarfast) S.realms.hoarfast.mood = .9 + CR.next(S.rng) * .5;
    // a rival in Meridian fights the Sanctum
    if (S.flags.rivalMeridian && !S.over) rep.push(this.rivalSanctum());
    // world events: applied now (no choices), shown by the scene
    const evs = this.eventsFor('tidings', 'world');
    for (const id of evs) { this.applyEvent(id, 'world', null); rep.push({ kind: 'event', id, realm: 'world' }); }
    // the AI realms muster at once
    for (const r in S.realms) if (S.realms[r].alive && !S.realms[r].human && r !== 'brigands') G.CampaignAI.muster(this, r);
    this.checkElimination(rep);
    S.phase = 'muster'; S.turn = 0;
    if (!S.humans.some(h => S.realms[h].alive)) S.phase = 'march';
    return rep;
  }
  healMon(uid) { const m = this.mon(uid); if (!m) return; const st = G.monsterStats(m.sp, m.tier, m.lvl); m.hp = st.hp; m.mp = st.mp; }
  monPower(m) { const st = G.monsterStats(m.sp, m.tier, m.lvl); return G.unitPower(st, m.lvl, false); }
  removeMonster(uid) { const S = this.state; for (const k of Object.values(S.knights)) { const i = k.troop.indexOf(uid); if (i >= 0) k.troop.splice(i, 1); } for (const c in S.castles) { const i = S.castles[c].reserve.indexOf(uid); if (i >= 0) S.castles[c].reserve.splice(i, 1); } delete S.monsters[uid]; }
  /* ---- quests (§4.9) ---- */
  questOdds(kid, site) {
    const k = this.kn(kid), c = G.get('class', k.cls), s = G.get('site', site), S = this.state, w = {};
    for (const [o, v] of G.QUEST_OUTCOMES) w[o] = v;
    if (c.line === 'cleric') w.treasure += 10; if (c.line === 'beast') w.beast += 15; if (c.line === 'ranger') w.wanderer += 10; if (k.lvl >= 10) w.mishap -= 5;
    if (s.focus) w[s.focus] += 10; if (s.mishap) w.mishap += s.mishap;
    if (!this.wanderers(site).length) w.wanderer = 0;
    const luck = (k.equip.accessory === 'horseshoe' ? 1.15 : 1) * G.tune.questLuck;
    for (const o of ['treasure', 'beast', 'wanderer', 'mana']) w[o] *= luck;
    return w;
  }
  regionsOf(site) { const reg = G.get('castle', G.get('site', site).castle).region; return { thaw: ['winter', 'spring'], beltane: ['spring', 'summer'], lammas: ['summer', 'autumn'], hallow: ['autumn', 'winter'] }[reg] || [reg]; }
  wanderers(site) { const S = this.state, s = G.get('site', site), out = []; for (const r of this.regionsOf(site)) for (const id of G.POOLS[r].wanderers) { if (S.knights[id]) continue; if (id === 'galeron' && S.year === 1 && S.si < 2) continue; if (id === 'ettard' && !s.ettard && !['winter', 'autumn'].includes(r)) continue; if (!out.includes(id)) out.push(id); } return out; }
  questReturn(k) {
    const S = this.state, q = k.quest, site = G.get('site', q.site), rep = { kind: 'quest', knight: k.id, realm: k.realm, site: q.site, outcome: q.outcome };
    k.quest = null; k.castle = q.from && this.owner(q.from) === k.realm ? q.from : this.capital(k.realm);
    if (!k.castle) { rep.lost = true; return rep; }
    S.castles[k.castle].knights.push(k.id);
    if (site.story && (!site.storyFlag || S.flags[site.storyFlag]) && !S.seen[site.story]) { rep.story = site.story; return rep; }
    const pools = this.regionsOf(q.site).map(r => G.POOLS[r]), pick = l => l[Math.floor(q.roll * l.length) % l.length];
    switch (q.outcome) {
      case 'treasure': { const items = [].concat(...pools.map(p => p.items), site.addItem || []); const it = pick(items); S.realms[k.realm].items.push(it); rep.thing = G.get('item', it).name; break; }
      case 'beast': { let bs = [].concat(...pools.map(p => p.beasts), site.addBeast || []); if (site.beasts) for (const b in site.beasts) for (let i = 1; i < site.beasts[b]; i++) bs.push(b); const sp = pick(bs); const uid = this.newMonster(sp, Math.max(1, k.lvl - 2), 1, k.realm); if (k.troop.length < 6 && this.bondUsed(k.id) + G.get('monster', sp).rank <= this.bondMax(k.id)) k.troop.push(uid); else S.castles[k.castle].reserve.push(uid); rep.thing = G.get('monster', sp).names[0]; break; }
      case 'wanderer': { const ws = this.wanderers(q.site); if (ws.length) { const id = pick(ws); this.addKnight(id, k.realm, k.castle); rep.thing = G.get('knight', id).name; rep.joined = id; } else { S.realms[k.realm].mana += 50; rep.outcome = 'mana'; rep.thing = 50; } break; }
      case 'mana': { const n = 40 + Math.floor(q.roll * 41); S.realms[k.realm].mana += n; rep.thing = n; break; }
      case 'training': { this.giveExp(k, 60); for (const u of k.troop) this.giveMonExp(this.mon(u), 40); rep.thing = 'EXP'; break; }
      case 'mishap': { k.wounded = 1; if (q.roll < .3 && k.troop.length) { const weakest = k.troop.slice().sort((a, b) => this.monPower(this.mon(a)) - this.monPower(this.mon(b)))[0]; rep.thing = G.get('monster', this.mon(weakest).sp).names[this.mon(weakest).tier - 1]; this.removeMonster(weakest); rep.lostBeast = true; } break; }
    }
    rep.text = G.VIGNETTES[rep.outcome][Math.floor(q.roll * 3) % 3].replace(/\{\$knight\}/g, G.get('knight', k.id).short).replace(/\{\$site\}/g, site.name).replace(/\{\$thing\}/g, rep.thing);
    this.chron(rep.text);
    return rep;
  }
  giveExp(k, n) { k.exp += Math.round(n * G.tune.expScale); while (k.exp >= 100 && k.lvl < 40) { k.exp -= 100; G.levelUpKnight(k, this.state.rng); } }
  giveMonExp(m, n) { if (!m) return; m.exp += Math.round(n * G.tune.expScale); while (m.exp >= 100 && m.lvl < 40) { m.exp -= 100; G.levelUpMonster(m); } }
  addKnight(id, realm, castle, o = {}) {
    const S = this.state; if (S.knights[id]) return false;
    const d = G.get('knight', id), rec = G.makeKnightRec(id); rec.realm = realm; rec.castle = castle || this.capital(realm);
    S.knights[id] = rec; S.castles[rec.castle].knights.push(id);
    for (const [sp, lvl, tier] of d.troop) rec.troop.push(this.newMonster(sp, lvl, tier || 1, realm));
    this.chron(d.name + ' joins ' + G.get('realm', realm).short + '.');
    return true;
  }
  /* ---- story events (§6.12.3) ---- */
  eventsFor(when, realm, ctx) {
    const S = this.state, out = [];
    for (const e of G.all('event')) {
      if (e.when !== when) continue;
      if (realm === 'world' ? e.realm !== 'world' : (e.realm === 'world' || (e.realm !== 'player' && e.realm !== realm))) continue;
      const key = e.realm === 'player' ? e.id + ':' + realm : e.id;
      if (e.once !== false && S.seen[key]) continue;
      try { if (e.if && !e.if(this, realm, ctx)) continue; } catch (err) { continue; }
      out.push(e.id);
    }
    out.sort((a, b) => G.get('event', b).priority - G.get('event', a).priority);
    return when === 'tidings' ? out.slice(0, 3) : out;
  }
  applyEvent(id, realm, choice) {
    const S = this.state, e = G.get('event', id), key = e.realm === 'player' ? id + ':' + realm : id;
    S.seen[key] = true;
    const fx = [].concat(e.effects || [], choice !== null && choice !== undefined && e.choices ? e.choices[choice].effects : []);
    const out = [];
    for (const f of fx) out.push(...this.effect(f, realm));
    return out;
  }
  effect(f, realm) {
    const S = this.state, R = S.realms[realm], out = [];
    if (f.toast) out.push({ toast: f.toast });
    if (f.flag) S.flags[f.flag] = f.value === undefined ? true : f.value;
    if (f.mana && R) R.mana += f.mana;
    if (f.pay && R) { if (R.mana < f.pay) { out.push({ toast: 'Not enough mana.' }); return out; } R.mana -= f.pay; }
    if (f.addKnight && R) { if (this.addKnight(f.addKnight, realm)) out.push({ joined: f.addKnight }); }
    if (f.addItem && R) R.items.push(f.addItem);
    if (f.addMonster && R) { const [sp, lv, where] = f.addMonster, lvl = typeof lv === 'string' ? (S.knights[lv] ? S.knights[lv].lvl : 5) : lv, c = where === 'capital' ? this.capital(realm) : where; if (c) S.castles[c].reserve.push(this.newMonster(sp, lvl, 1, realm)); }
    if (f.aiFlag) { const [r, k, v] = f.aiFlag; S.realms[r].ai[k] = v === 'plus2' ? S.year * 4 + S.si + 2 : v; }
    if (f.levels) { const k = S.knights[f.levels[0]]; if (k) for (let i = 0; i < f.levels[1]; i++) { G.levelUpKnight(k, S.rng); } }
    if (f.learn) { const k = S.knights[f.learn[0]]; if (k && !k.extraSkills.includes(f.learn[1])) k.extraSkills.push(f.learn[1]); }
    if (f.bond) { const k = S.knights[f.bond[0]]; if (k) k.bondBonus += f.bond[1]; }
    if (f.circle) S.castles[f.circle[0]].extra.push(...f.circle[1]);
    if (f.lightCandle) { S.candle = S.candleMax; this.chron('The Hour-Candle is lit: ' + S.candle + ' seasons.'); }
    if (f.defect) { const [kid, to] = f.defect, k = S.knights[kid]; if (k) { const sats = ['midnight', 'dawnwatch', 'noonspire', 'vesperhall'].filter(c => this.owner(c) === to), dest = sats.length ? sats[0] : this.capital(to); if (dest) this.relocate(kid, dest, to); } }
    if (f.tutorial) out.push({ tutorial: true });
    if (f.sanctum) out.push({ sanctum: true });
    if (f.battleBuff) out.push({ battleBuff: f.battleBuff });
    return out;
  }
  relocate(kid, castle, realm) {
    const S = this.state, k = S.knights[kid]; if (k.castle) { const l = S.castles[k.castle].knights; l.splice(l.indexOf(kid), 1); }
    k.castle = castle; if (realm) { k.realm = realm; for (const u of k.troop) S.monsters[u].realm = realm; } S.castles[castle].knights.push(kid);
  }
  /* ---- Muster commands (§4.5-4.11) ---- */
  apply(cmd) {
    const S = this.state, ok = (x = {}) => Object.assign({ ok: true }, x), no = why => ({ ok: false, why });
    const R = S.realms[cmd.realm];
    switch (cmd.t) {
      case 'summon': {
        const c = S.castles[cmd.castle]; if (!c || c.owner !== cmd.realm) return no('Not your castle');
        if (c.stilled) return no('The castle is Stilled'); if (c.summons >= 3) return no('3 summons a season');
        const opts = this.summonable(cmd.castle); const o = opts.find(x => x.sp === cmd.sp); if (!o) return no('Not in this circle'); if (!o.ok) return no(o.why);
        if (!G.dev.freeSummon || !R.human) R.mana -= o.cost; c.summons++;
        const lv = Math.max(1, Math.floor(this.knightsOf(cmd.realm).reduce((a, k) => a + k.lvl, 0) / Math.max(1, this.knightsOf(cmd.realm).length) / 2));
        const uid = this.newMonster(cmd.sp, lv, 1, cmd.realm); c.reserve.push(uid);
        if (!R.firstSummon) R.firstSummon = true;
        return ok({ uid });
      }
      case 'bind': {
        const k = S.knights[cmd.knight], c = S.castles[k.castle]; if (k.realm !== cmd.realm) return no('Not yours'); if (k.quest) return no('Away on a quest');
        const i = c.reserve.indexOf(cmd.uid); if (i < 0) return no('Not in reserve'); if (k.troop.length >= 6) return no('A troop holds 6');
        const rk = G.get('monster', S.monsters[cmd.uid].sp).rank; if (this.bondUsed(k.id) + rk > this.bondMax(k.id)) return no('Not enough Bond');
        c.reserve.splice(i, 1); k.troop.push(cmd.uid); if (['wyvern', 'frostwyrm'].includes(S.monsters[cmd.uid].sp)) R.boundDragon = true; return ok();
      }
      case 'unbind': { const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm || k.quest) return no('Not here'); const i = k.troop.indexOf(cmd.uid); if (i < 0) return no('Not in troop'); k.troop.splice(i, 1); S.castles[k.castle].reserve.push(cmd.uid); return ok(); }
      case 'formation': { const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); k.formation = cmd.formation; return ok(); }
      case 'dismiss': { const c = S.castles[cmd.castle]; if (c.owner !== cmd.realm || !c.reserve.includes(cmd.uid)) return no('Not in reserve'); this.removeMonster(cmd.uid); return ok(); }
      case 'move': {
        const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); if (!this.canAct(k.id)) return no(k.wounded ? 'Wounded' : k.quest ? 'Away' : 'Stilled'); if (k.moved) return no('Already moved');
        if (!(G.adj[k.castle] || []).includes(cmd.to) || this.owner(cmd.to) !== cmd.realm) return no('Not an adjacent castle of yours'); if (S.castles[cmd.to].stilled) return no('Stilled');
        if (S.castles[cmd.to].knights.length >= 6) return no('That castle holds 6 knights');
        this.relocate(k.id, cmd.to); k.moved = true; return ok();
      }
      case 'quest': {
        const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); if (k.ruler) return no('Rulers stay home'); if (!this.canAct(k.id)) return no(k.wounded ? 'Wounded' : 'Not able'); if (k.moved) return no('Moved this Muster');
        if (this.knightsOf(cmd.realm).filter(x => x.quest).length >= 2) return no('Two knights are away already');
        const sites = this.questSites(k.id); if (!sites.includes(cmd.site)) return no('Too far');
        const site = G.get('site', cmd.site), w = this.questOdds(k.id, cmd.site), outcome = CR.weighted(S.rng, Object.entries(w)), roll = CR.next(S.rng);
        const l = S.castles[k.castle].knights; l.splice(l.indexOf(k.id), 1);
        k.quest = { site: cmd.site, back: site.away, outcome: site.story && (!site.storyFlag || S.flags[site.storyFlag]) && !S.seen[site.story] ? 'story' : outcome, roll, from: k.castle }; k.castle = null;
        return ok();
      }
      case 'equip': {
        const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); const it = G.get('item', cmd.item); if (!R.items.includes(cmd.item)) return no('Not in the stores');
        if (!G.canEquip(cmd.item, k.cls)) return no(G.get('class', k.cls).name + ' cannot use it');
        const old = k.equip[it.slot]; R.items.splice(R.items.indexOf(cmd.item), 1); if (old) R.items.push(old); k.equip[it.slot] = cmd.item; return ok();
      }
      case 'unequip': { const k = S.knights[cmd.knight]; const old = k.equip[cmd.slot]; if (!old) return no('Empty'); delete k.equip[cmd.slot]; R.items.push(old); return ok(); }
      case 'use': {
        const it = G.get('item', cmd.item); if (!R.items.includes(cmd.item)) return no('None left');
        if (it.mana) { R.mana += it.mana; }
        else if (it.slot === 'consumable') { const tgt = cmd.knight ? S.knights[cmd.knight] : S.monsters[cmd.uid]; if (!tgt) return no('No target'); const max = cmd.knight ? G.knightView(tgt).st : G.monsterStats(tgt.sp, tgt.tier, tgt.lvl); if (it.heal) tgt.hp = Math.min(max.hp, tgt.hp + it.heal); if (it.mpHeal) tgt.mp = Math.min(max.mp, tgt.mp + it.mpHeal); }
        else return no('Not usable');
        R.items.splice(R.items.indexOf(cmd.item), 1); return ok();
      }
      case 'promote': {
        const m = S.monsters[cmd.uid]; if (!m || m.realm !== cmd.realm) return no('Not yours'); const p = this.canPromote(m); if (!p.ok) return no(p.why);
        if (p.seed) R.items.splice(R.items.indexOf(p.seed), 1);
        const before = G.monsterStats(m.sp, m.tier, m.lvl); m.tier++; const after = G.monsterStats(m.sp, m.tier, m.lvl); m.hp = Math.min(after.hp, m.hp + after.hp - before.hp); m.mp = after.mp;
        this.chron(G.get('monster', m.sp).names[m.tier - 2] + ' becomes ' + G.get('monster', m.sp).names[m.tier - 1] + '.'); return ok();
      }
      case 'classChange': {
        const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); const p = this.canClassChange(k); if (!p.ok) return no(p.why);
        if (p.writ) R.items.splice(R.items.indexOf('writ'), 1);
        k.cls = p.to; for (const s of G.STATS) k.stats[s] = Math.round(k.stats[s] * 1.1); k.hp = k.stats.hp; k.mp = k.stats.mp;
        this.chron(G.get('knight', k.id).short + ' becomes a ' + G.get('class', p.to).name + '.'); return ok();
      }
      case 'endMuster': { S.done[cmd.realm] = true; if (S.humans.filter(h => S.realms[h].alive).every(h => S.done[h])) { S.phase = 'march'; S.done = {}; } return ok(); }
      case 'declare': {
        if (S.phase !== 'march') return no('Not the March');
        const tg = cmd.target, list = cmd.knights || []; if (!list.length || list.length > 3) return no('1 to 3 knights');
        if (tg === 'sanctum') { if (this.owner('meridian') !== cmd.realm || !S.flags.sanctumOpen) return no('Take Meridian first'); }
        else if (this.owner(tg) === cmd.realm) return no('Already yours');
        if (S.marches.some(m => m.realm === cmd.realm && m.target === tg)) return no('Already marching there');
        for (const kid of list) { const k = S.knights[kid]; if (!k || k.realm !== cmd.realm) return no('Not yours'); if (!this.canAct(kid)) return no(G.get('knight', kid).short + ' cannot march'); if (k.marched) return no(G.get('knight', kid).short + ' marches already'); if (tg === 'sanctum' ? k.castle !== 'meridian' && !(G.adj.meridian || []).includes(k.castle) : !(G.adj[tg] || []).includes(k.castle)) return no(G.get('knight', kid).short + ' is not beside it'); }
        for (const kid of list) S.knights[kid].marched = true;
        S.marches.push({ realm: cmd.realm, target: tg, knights: list.slice(), from: Object.fromEntries(list.map(k => [k, S.knights[k].castle])) });
        return ok();
      }
      case 'cancel': { const i = S.marches.findIndex(m => m.realm === cmd.realm && m.target === cmd.target); if (i < 0) return no('No march'); for (const k of S.marches[i].knights) S.knights[k].marched = false; S.marches.splice(i, 1); return ok(); }
      case 'endMarch': {
        S.done[cmd.realm] = true;
        if (S.humans.filter(h => S.realms[h].alive).every(h => S.done[h])) this.beginResolution();
        return ok();
      }
      case 'event': return ok({ out: this.applyEvent(cmd.id, cmd.realm, cmd.choice) });
    }
    return no('Unknown command');
  }
  summonable(castle) {
    const S = this.state, c = S.castles[castle], r = c.owner, R = S.realms[r], out = [];
    for (const e of G.get('castle', castle).circle.concat(c.extra)) {
      const [sp, se] = e.split(':'); if (r === 'dominion' && G.get('monster', sp).elem !== 'hour') continue;
      const m = G.get('monster', sp), cost = Math.round(m.cost * G.tune.summonCost), o = { sp, cost, season: se || null, ok: true };
      if (se && se !== this.season()) { o.ok = false; o.why = 'Only in ' + G.SEASON_NAME[se]; }
      else if (sp === 'pendulumwyrm' && castle !== 'meridian') { o.ok = false; o.why = 'Meridian only'; }
      else if (R.mana < cost && !(G.dev.freeSummon && R.human)) { o.ok = false; o.why = 'Needs ' + cost + ' mana'; }
      else if (c.summons >= 3) { o.ok = false; o.why = '3 summons a season'; }
      else if (c.stilled) { o.ok = false; o.why = 'Stilled'; }
      if (!out.some(x => x.sp === sp)) out.push(o);
    }
    return out;
  }
  questSites(kid) { const k = this.kn(kid); if (!k.castle) return []; const out = [G.get('castle', k.castle).site]; for (const n of G.adj[k.castle] || []) { const s = G.get('castle', n).site, si = G.get('site', s); if (si.story && this.state.flags[si.storyFlag] !== false && (si.storyFlag ? this.state.flags[si.storyFlag] : true)) out.push(s); } return out; }
  canPromote(m) {
    const S = this.state, sp = G.get('monster', m.sp); if (m.tier >= 3) return { ok: false, why: 'Final form' };
    const need = m.tier === 1 ? 12 : 22, seedLv = m.tier === 1 ? 6 : 16, seed = G.SEED_OF[sp.elem];
    if (m.lvl >= need) return { ok: true };
    if (seed && m.lvl >= seedLv && S.realms[m.realm] && S.realms[m.realm].items.includes(seed)) return { ok: true, seed };
    return { ok: false, why: 'Level ' + need + (seed ? ' (or ' + seedLv + ' with a ' + G.get('item', seed).name + ')' : '') };
  }
  canClassChange(k) {
    const c = G.get('class', k.cls); if (!c.next) return { ok: false, why: 'No further class' };
    if (k.lvl < c.nextLv && !G.dev.allClasses) return { ok: false, why: 'Level ' + c.nextLv };
    if (c.writ && !this.state.realms[k.realm].items.includes('writ') && !G.dev.allClasses) return { ok: false, why: 'Needs a Writ of Knighthood' };
    return { ok: true, to: c.next, writ: c.writ && this.state.realms[k.realm].items.includes('writ') };
  }
  /* ---- March and resolution (§4.12-4.14) ---- */
  beginResolution() {
    const S = this.state;
    for (const r in S.realms) if (S.realms[r].alive && !S.realms[r].human && r !== 'brigands') G.CampaignAI.march(this, r);
    const lv = m => Math.max(...m.knights.map(k => S.knights[k].lvl)), pw = m => m.knights.reduce((a, k) => a + this.troopPower(k), 0);
    const tb = S.marches.map(m => CR.next(S.rng));
    S.queue = S.marches.map((m, i) => Object.assign({}, m, { tb: tb[i] })).sort((a, b) => lv(b) - lv(a) || pw(b) - pw(a) || a.tb - b.tb);
    S.phase = 'resolve';
  }
  // the next attack to resolve: { march, kind: 'skip' | 'open' | 'battle' | 'sanctum' } (and removes it from the queue)
  nextAttack() {
    const S = this.state;
    while (S.queue.length) {
      const m = S.queue.shift();
      const alive = m.knights.filter(k => S.knights[k] && S.knights[k].realm === m.realm && S.knights[k].castle && !S.knights[k].quest && S.knights[k].hp > 0);
      if (!alive.length) continue;
      m.knights = alive;
      if (m.target === 'sanctum') return { march: m, kind: 'sanctum' };
      if (this.owner(m.target) === m.realm) continue;
      const def = S.castles[m.target].knights.filter(k => S.knights[k] && !S.knights[k].quest);
      if (!def.length) { this.capture(m, null); return { march: m, kind: 'open' }; }
      return { march: m, kind: 'battle', defender: this.owner(m.target) };
    }
    return null;
  }
  // the Sanctum's attackers: the troops in Meridian, plus one more from a castle of the realm beside it (§6.10)
  sanctumTroops(r) { const S = this.state, inM = S.castles.meridian.knights.filter(k => this.kn(k).realm === r && !this.kn(k).quest).sort((a, b) => this.troopPower(b) - this.troopPower(a)).slice(0, 3); if (inM.length < 3) { const near = (G.adj.meridian || []).filter(c => this.owner(c) === r).flatMap(c => S.castles[c].knights).filter(k => this.kn(k).realm === r && this.canAct(k)).sort((a, b) => this.troopPower(b) - this.troopPower(a)); if (near.length) inM.push(near[0]); } return inM; }
  defenders(castle) { const S = this.state; return S.castles[castle].knights.filter(k => S.knights[k] && !S.knights[k].quest && S.knights[k].hp > 0).sort((a, b) => (S.knights[b].ruler - S.knights[a].ruler) || this.troopPower(b) - this.troopPower(a)).slice(0, 3); }
  knightBattleRec(kid) { const k = this.kn(kid); return { id: kid, cls: k.cls, lvl: k.lvl, exp: k.exp, elem: k.elem, stats: Object.assign({}, k.stats), hp: Math.max(1, k.hp), mp: k.mp, equip: Object.assign({}, k.equip), ruler: k.ruler, extraSkills: k.extraSkills.slice(), bondBonus: k.bondBonus }; }
  troopSpec(kid) { const k = this.kn(kid); return { knight: this.knightBattleRec(kid), monsters: k.troop.map(u => Object.assign({}, this.mon(u))).filter(m => m.hp > 0), formation: k.formation }; }
  battleSpec(att, seed) {
    const S = this.state, m = att.march, diff = G.DIFF[S.difficulty];
    const side = (realm, kids) => { const R = S.realms[realm]; return { realm, human: R.human, ai: R.human ? 'normal' : realm === 'brigands' ? 'easy' : diff.battleAI, expMul: R.human ? diff.exp : 1, boost: R.human ? G.tune.aiPlayerBoost : 0, items: R.items.filter(i => G.get('item', i).slot === 'consumable' && !G.get('item', i).musterOnly), troops: kids.map(k => this.troopSpec(k)) }; };
    if (att.kind === 'sanctum') {
      const gk = G.get('knight', 'graynight'), dk = { easy: .75, normal: 1, hard: 1.1 }[S.difficulty] || 1, gkRec = { id: 'graynight', cls: 'graynight', lvl: 25, exp: 0, elem: 'hour', stats: { hp: Math.round(680 * dk), mp: 200, atk: Math.round(42 * dk), def: Math.round(40 * dk), int: Math.round(42 * dk), agi: 24 }, equip: {}, ruler: true };
      const mons = gk.troop.map(([sp, lvl, tier], i) => ({ uid: 'gk' + i, sp, tier, lvl: Math.max(1, Math.round(lvl * dk)), exp: 0 }));
      const a = side(m.realm, m.knights); for (const t of a.troops) { const kv = G.knightView(S.knights[t.knight.id]); t.knight.hp = kv.st.hp; t.knight.mp = kv.st.mp; for (const mo of t.monsters) { const st = G.monsterStats(mo.sp, mo.tier, mo.lvl); mo.hp = st.hp; mo.mp = st.mp; } }
      return { map: 'clockwork_sanctum', season: this.season(), seed, mode: 'sanctum', castle: 'meridian', region: 'hour', attacker: 0, defender: 1, bells: 12, sides: [a, { realm: 'dominion', ai: diff.battleAI, troops: [{ knight: gkRec, monsters: mons, formation: 'shield' }] }] };
    }
    const c = G.get('castle', m.target);
    return { map: c.map, season: this.season(), seed, mode: 'siege', castle: m.target, region: c.region, attacker: 0, defender: 1, longWinter: S.flags.longWinter && this.season() === 'winter' && S.year === 1,
      sides: [side(m.realm, m.knights), side(this.owner(m.target), this.defenders(m.target))] };
  }
  // after a battle: write the battle's results back (§4.14)
  applyBattle(att, res) {
    const S = this.state, m = att.march, sanctum = att.kind === 'sanctum', defRealm = sanctum ? 'dominion' : this.owner(m.target), out = { castle: sanctum ? 'meridian' : m.target, attacker: m.realm, defender: defRealm, won: res.winner === 0, losses: [], captures: [], wounded: [], levels: [] };
    const realmOf = si => si === 0 ? m.realm : defRealm;
    for (const u of res.units) {
      if (u.ref === 'graynight' || (typeof u.ref === 'string' && (u.ref.startsWith('gk') || u.ref.startsWith('second')))) continue;
      if (u.kind === 'knight') {
        const k = S.knights[u.ref]; if (!k) continue;
        Object.assign(k, { lvl: u.rec.lvl, exp: u.rec.exp, stats: u.rec.stats }); k.hp = Math.max(0, u.hp); k.mp = u.mp;
        if (u.out === 'down') { k.wounded = 2; k.hp = 0; out.wounded.push(k.id); }
        if (u.lvls) out.levels.push([G.get('knight', k.id).short, u.rec.lvl]);
      } else {
        const mm = S.monsters[u.ref]; if (!mm) continue;
        if (u.out === 'dead') { out.losses.push([realmOf(u.side), G.get('monster', mm.sp).names[mm.tier - 1]]); this.removeMonster(u.ref); continue; }
        if (u.out === 'captured') continue;
        Object.assign(mm, { lvl: u.rec.lvl, exp: u.rec.exp, hp: Math.max(1, u.hp), mp: u.mp });
        if (u.lvls) out.levels.push([G.get('monster', mm.sp).names[mm.tier - 1], mm.lvl]);
      }
    }
    // items used in battle leave the realm's stores
    res.used.forEach((list, si) => { const R = S.realms[realmOf(si)]; for (const it of list) { const i = R.items.indexOf(it); if (i >= 0) R.items.splice(i, 1); } });
    // captures: into the captor's reserve (the contested castle if its side won, else its home castle)
    for (const c of res.captures) {
      const mm = S.monsters[c.rec.uid]; if (!mm) continue; const toRealm = realmOf(c.side), capK = S.knights[c.by];
      this.removeMonster(mm.uid); S.monsters[mm.uid] = Object.assign(mm, { realm: toRealm, hp: Math.max(1, c.hp) });
      const won = (res.winner === c.side); const dest = !sanctum && won && c.side === 0 ? m.target : (capK && capK.castle) || this.capital(toRealm);
      if (dest) S.castles[dest].reserve.push(mm.uid); else delete S.monsters[mm.uid];
      out.captures.push([toRealm, G.get('monster', mm.sp).names[mm.tier - 1]]);
    }
    if (sanctum) {
      if (out.won) { S.flags.grayKnightDown = true; this.chron('The Gray Knight falls. The Wheel turns.'); this.end({ kind: 'win', realm: m.realm }); }
      else this.chron('The Sanctum holds. The Wheel trembles.');
      for (const kid of m.knights) { const k = S.knights[kid]; if (k && k.castle !== 'meridian' && this.owner('meridian') === m.realm && S.castles.meridian.knights.length < 6) this.relocate(kid, 'meridian'); }
    } else if (out.won) this.capture(m, res);
    else this.chron(G.get('realm', m.realm).short + ' is thrown back from ' + G.get('castle', m.target).name + '.');
    S.realms[m.realm].firstBattle = true; if (S.realms[defRealm]) S.realms[defRealm].firstBattle = true;
    S.lastBattles.push(out);
    this.checkElimination([]);
    return out;
  }
  capture(m, res) {
    const S = this.state, c = m.target, old = this.owner(c), cs = S.castles[c];
    // defenders fall back to the nearest castle of their realm
    for (const kid of cs.knights.slice()) {
      const k = S.knights[kid], dest = old === 'brigands' ? null : this.nearestOwn(c, old);
      if (dest) this.relocate(kid, dest);
      else { const l = cs.knights; l.splice(l.indexOf(kid), 1); for (const u of k.troop) delete S.monsters[u]; delete S.knights[kid]; }   // a beaten brigand captain leaves the war (the oath may bring them back)
    }
    cs.owner = m.realm;
    for (const u of cs.reserve) if (S.monsters[u]) S.monsters[u].realm = m.realm;
    if (!cs.treasuryTaken) { cs.treasuryTaken = true; S.realms[m.realm].items.push(G.get('castle', c).treasury); }
    for (const kid of m.knights) { const k = S.knights[kid]; if (k && k.realm === m.realm && k.castle && cs.knights.length < 6) this.relocate(kid, c); }
    if (cs.stilled) { cs.stilled = false; if (S.stilled === c) S.stilled = null; }
    this.chron(G.get('realm', m.realm).short + ' takes ' + G.get('castle', c).name + '.');
    if (c === 'meridian' && !S.realms[m.realm].human && m.realm !== 'dominion') { S.flags.rivalMeridian = m.realm; }
    S.lastCapture = { castle: c, realm: m.realm, from: old };
  }
  nearestOwn(from, realm) {
    const seen = new Set([from]), q = [from];
    while (q.length) { const c = q.shift(); for (const n of G.adj[c] || []) { if (seen.has(n)) continue; seen.add(n); if (this.owner(n) === realm && this.state.castles[n].knights.length < 6) return n; q.push(n); } }
    return this.castlesOf(realm)[0] || null;
  }
  rivalSanctum() {
    const S = this.state, r = S.flags.rivalMeridian; S.flags.rivalMeridian = null;
    if (this.owner('meridian') !== r) return { kind: 'note', text: 'Meridian changed hands again.' };
    const kids = S.castles.meridian.knights.filter(k => S.knights[k].realm === r).slice(0, 3);
    if (!kids.length) return { kind: 'note', text: '' };
    const att = { march: { realm: r, target: 'sanctum', knights: kids, from: {} }, kind: 'sanctum' };
    const sim = G.BattleSim.create(this.battleSpec(att, CR.int(S.rng, 1, 1e9))); const res = G.BattleAI.resolve(sim);
    if (res.winner === 0) { this.end({ kind: 'wheel', realm: r }); return { kind: 'rivalWin', realm: r }; }
    this.applyBattle(att, res);
    // Meridian returns to the Dominion with a fresh garrison
    const cs = S.castles.meridian; for (const kid of cs.knights.slice()) { const dest = this.nearestOwn('meridian', r); if (dest) this.relocate(kid, dest); }
    cs.owner = 'dominion'; S.flags.rivalFailed = true;
    let n = 0; for (const id of ['meliant', 'bertilak', 'aurelie', 'morholt']) { if (n >= 2) break; if (!S.knights[id] || S.knights[id].realm !== 'dominion') { delete S.knights[id]; this.addKnight(id, 'dominion', 'meridian'); const k = S.knights[id]; while (k.lvl < 14) G.levelUpKnight(k, S.rng); n++; } }
    this.chron(G.get('realm', r).short + ' is broken in the Sanctum. The Dominion retakes Meridian.');
    return { kind: 'rivalFail', realm: r };
  }
  checkElimination(rep) {
    const S = this.state;
    for (const r in S.realms) {
      const R = S.realms[r]; if (!R.alive || r === 'brigands') continue;
      if (this.castlesOf(r).length) continue;
      R.alive = false; this.chron(G.get('realm', r).name + ' has fallen.');
      for (const k of this.knightsOf(r)) { for (const u of k.troop) delete S.monsters[u]; if (k.castle) { const l = S.castles[k.castle].knights; l.splice(l.indexOf(k.id), 1); } delete S.knights[k.id]; }
      rep.push({ kind: 'fallen', realm: r });
    }
    const alive = S.humans.filter(h => S.realms[h].alive);
    if (S.humans.length && !alive.length && !S.over) this.end({ kind: 'fallen', realm: S.humans[0] });
  }
  endSeason() { const S = this.state; S.si = (S.si + 1) % 4; if (S.si === 0) S.year++; S.phase = 'tidings'; }
  end(o) { const S = this.state; if (S.over) return; S.over = o; S.phase = 'over'; }
  /* a whole season with every realm on the AI (tests, attract, dev "run N seasons", the playthrough bot): human realms use
   * the autoplay planner; every battle is auto-resolved; player events are applied with their first choice */
  autoSeason(o = {}) {
    const S = this.state; if (S.over) return [];
    const log = [], rep = this.beginSeason(); log.push(...rep);
    const evAll = (when, r, ctx) => { for (const id of this.eventsFor(when, r, ctx)) { const e = G.get('event', id); if (id === 'tutorial') { this.applyEvent(id, r, 1); continue; } const out = this.applyEvent(id, r, e.choices ? 0 : null); log.push({ kind: 'event', id, realm: r }); for (const x of out) if (x.sanctum) this.state.flags.sanctumPending = r; } };
    for (const h of S.humans) if (S.realms[h].alive) { evAll('tidings', h); for (const q of rep) if (q.kind === 'quest' && q.realm === h && q.story) { this.applyEvent(q.story, h, 0); } }
    if (S.over) return log;
    for (const h of S.humans) if (S.realms[h].alive && S.phase === 'muster') { G.CampaignAI.autoplayMuster(this, h); this.apply({ t: 'endMuster', realm: h }); }
    if (S.phase === 'march') { for (const h of S.humans) if (S.realms[h].alive) G.CampaignAI.autoplayMarch(this, h); if (S.humans.filter(h => S.realms[h].alive).length) for (const h of S.humans) { if (S.realms[h].alive) this.apply({ t: 'endMarch', realm: h }); } else this.beginResolution(); }
    let a, guard = 0;
    while (!S.over && guard++ < 60 && (a = this.nextAttack())) {
      if (a.kind === 'open') { log.push({ kind: 'open', castle: a.march.target, realm: a.march.realm }); if (S.realms[a.march.realm].human) evAll('capture', a.march.realm, { castle: a.march.target }); }
      else {
        const sim = G.BattleSim.create(this.battleSpec(a, G.Rng.int(S.rng, 1, 1e9))), res = G.BattleAI.resolve(sim, o), out = this.applyBattle(a, res); log.push({ kind: 'battle', out });
        const h = S.realms[out.attacker].human ? out.attacker : S.realms[out.defender] && S.realms[out.defender].human ? out.defender : null;
        if (h) { evAll('afterBattle', h, { won: (h === out.attacker) === out.won, sanctum: a.kind === 'sanctum' }); if (out.won && h === out.attacker && a.kind !== 'sanctum') evAll('capture', h, { castle: out.castle }); }
      }
      if (S.flags.sanctumPending && !S.over) { const r = S.flags.sanctumPending; S.flags.sanctumPending = null; const ks = this.sanctumTroops(r); if (ks.length) S.queue.unshift({ realm: r, target: 'sanctum', knights: ks, from: {} }); }
    }
    if (!S.over) this.endSeason();
    return log;
  }
  // the season label: "SPRING • YEAR 1"
  label() { return G.SEASON_NAME[this.season()].toUpperCase() + ' • YEAR ' + this.state.year; }
}
G.CampaignSim = CampaignSim;

// ---- 23-ai-campaign.js ----
/* ---- CAMPAIGN AI (§4.15): deterministic per seed. Muster (summon, bind, move, quest, equip, promote), then March ---- */
G.CampaignAI = {
  aggression(sim, r) {
    const S = sim.state, R = S.realms[r], season = sim.season();
    if (r === 'brigands') return 0;
    let a = r === 'hoarfast' ? (R.mood || 1.1) : (R.aggression || 1);
    if (r === 'dominion') a = S.year === 1 && !R.ai.awake ? 0 : S.year <= 2 ? (R.ai.awake ? .7 : 0) : .9;
    else a *= 1 + .12 * (S.year - 1);
    const own = G.get('realm', r).season; if (own && own === season) a *= r === 'solmark' || r === 'hoarfast' ? 1.3 : 1.2;
    return a * G.tune.aiAggression;
  },
  defense(sim, c) { return sim.state.castles[c].knights.filter(k => !sim.kn(k).quest).reduce((a, k) => a + sim.troopPower(k), 0) * 1.25; },
  threat(sim, c, r) {
    const S = sim.state; let t = 0;
    for (const n of G.adj[c] || []) { const o = sim.owner(n); if (o === r || o === 'brigands') continue; if (o === 'dominion' && this.aggression(sim, 'dominion') === 0) continue; t += S.castles[n].knights.filter(k => sim.canAct(k)).reduce((a, k) => a + sim.troopPower(k), 0) * this.aggression(sim, o); }
    return t;
  },
  need(sim, c, r) { return this.threat(sim, c, r) - this.defense(sim, c); },
  border(sim, c, r) { return (G.adj[c] || []).some(n => sim.owner(n) !== r); },
  muster(sim, r, bold) {
    const S = sim.state, R = S.realms[r], cs = sim.castlesOf(r).sort();
    if (r === 'brigands') return;
    // 1. summon while mana > 1.5 × upkeep + 40, at the castle in most need
    let guard = 0;
    while (guard++ < 12 && R.mana > 1.5 * sim.upkeep(r) + 40) {
      const opts = [];
      for (const c of cs) { if (S.castles[c].stilled) continue; const nd = this.need(sim, c, r); for (const o of sim.summonable(c)) if (o.ok) { const st = G.monsterStats(o.sp, 1, 3); let sc = G.unitPower(st, 3, false) / o.cost; if (G.get('monster', o.sp).elem === sim.nextSeason()) sc *= 1.1; opts.push({ c, sp: o.sp, score: sc * (1 + Math.max(0, nd) / 400) }); } }
      if (!opts.length) break;
      opts.sort((a, b) => b.score - a.score || (a.c < b.c ? -1 : 1) || (a.sp < b.sp ? -1 : 1));
      if (!sim.apply({ t: 'summon', realm: r, castle: opts[0].c, sp: opts[0].sp }).ok) break;
    }
    // 2. bind reserves to knights with free Bond, strongest first
    for (const c of cs) {
      const res = S.castles[c].reserve.slice().sort((a, b) => sim.monPower(sim.mon(b)) - sim.monPower(sim.mon(a)) || (a < b ? -1 : 1));
      for (const u of res) { const ks = S.castles[c].knights.filter(k => !sim.kn(k).quest).sort((a, b) => (sim.bondMax(b) - sim.bondUsed(b)) - (sim.bondMax(a) - sim.bondUsed(a)) || (a < b ? -1 : 1)); for (const k of ks) if (sim.apply({ t: 'bind', realm: r, knight: k, uid: u }).ok) break; }
    }
    // 3. move up to 3 troops toward the front: castles beside a castle worth taking (brigands, rivals, the Hour once awake)
    const hourFront = bold && S.year >= 2 && cs.some(c => (G.adj[c] || []).some(n => sim.owner(n) === 'dominion'));
    const front = c => (G.adj[c] || []).some(n => { if (hourFront) return sim.owner(n) === 'dominion'; const o = sim.owner(n); return o !== r && (o !== 'dominion' || this.aggression(sim, r) > 0) && o !== (R.ai.peaceUntil > S.year * 4 + S.si ? R.ai.peaceWith : null); });
    const sanctumGoal = bold && S.flags.sanctumOpen && sim.owner('meridian') === r;
    const meridianGoal = bold && !sanctumGoal && S.year >= 2 && sim.owner('meridian') !== r ? cs.filter(c => (G.adj[c] || []).includes('meridian')) : [];
    const dist = {}; { const q = sanctumGoal ? ['meridian'] : meridianGoal.length ? meridianGoal.slice() : cs.filter(front); q.forEach(c => dist[c] = 0); while (q.length) { const c = q.shift(); for (const n of G.adj[c] || []) if (sim.owner(n) === r && dist[n] === undefined) { dist[n] = dist[c] + 1; q.push(n); } } }
    let moves = 0; const maxMoves = sanctumGoal || meridianGoal.length ? 6 : 3;
    for (const c of cs.slice().sort((a, b) => (dist[b] || 0) - (dist[a] || 0) || (a < b ? -1 : 1))) {
      if (moves >= maxMoves || !dist[c]) continue;
      if ((r === 'dominion' || sanctumGoal) && c === 'meridian') continue;
      const keep = this.threat(sim, c, r) > 0 ? 1 : 0, here = S.castles[c].knights.filter(k => sim.canAct(k) && !sim.kn(k).moved && (!sim.kn(k).ruler || sanctumGoal)).sort((a, b) => sim.troopPower(b) - sim.troopPower(a));
      const go = here.slice(0, Math.max(0, S.castles[c].knights.length - Math.max(keep, 1) + (here.length === S.castles[c].knights.length && !keep ? 1 : 0)));
      const dest = (G.adj[c] || []).filter(n => sim.owner(n) === r && !S.castles[n].stilled && dist[n] !== undefined && dist[n] < dist[c] && S.castles[n].knights.length < 6).sort((a, b) => dist[a] - dist[b] || (a < b ? -1 : 1))[0];
      if (!dest) continue;
      for (const k of go) { if (moves >= maxMoves) break; if (sim.apply({ t: 'move', realm: r, knight: k, to: dest }).ok) moves++; }
    }
    // 4. quest with knights at interior castles (Amberlyn sends up to 3)
    for (const c of cs) {
      if (this.border(sim, c, r)) continue;
      for (const k of S.castles[c].knights.slice()) { const sites = sim.questSites(k).filter(s => !G.get('site', s).story); if (sites.length) sim.apply({ t: 'quest', realm: r, knight: k, site: sites[0] }); }
    }
    // 5. equip the best item per slot, then promote and change class
    for (const k of sim.knightsOf(r)) {
      const line = G.get('class', k.cls).line, key = ['mage', 'cleric'].includes(line) ? 'int' : 'atk';
      for (const slot of ['weapon', 'armor', 'accessory']) {
        const val = id => { const it = G.get('item', id); return slot === 'weapon' ? (it.mods[key] || 0) : slot === 'armor' ? (it.mods.def || 0) + (it.mods.int || 0) * .5 : (it.mods.bond || 0) * 3 + (it.mods.mov || 0) * 2 + (it.mods.ward || 0) + 1; };
        const best = R.items.filter(id => G.get('item', id).slot === slot && G.canEquip(id, k.cls)).sort((a, b) => val(b) - val(a) || (a < b ? -1 : 1))[0];
        if (best && (!k.equip[slot] || val(best) > val(k.equip[slot]))) sim.apply({ t: 'equip', realm: r, knight: k.id, item: best });
      }
      if (sim.canClassChange(k).ok) sim.apply({ t: 'classChange', realm: r, knight: k.id });
    }
    for (const m of sim.realmMonsters(r)) if (sim.canPromote(m).ok) sim.apply({ t: 'promote', realm: r, uid: m.uid });
  },
  march(sim, r, bold) {
    const S = sim.state, R = S.realms[r], ag = this.aggression(sim, r); if (ag <= 0) return;
    const stall = bold ? (R.ai.stall || 0) : 0, thr = G.DIFF[S.difficulty].threshold * (bold ? Math.max(.35, .7 - .1 * stall) : 1), peace = R.ai.peaceWith && (R.ai.peaceUntil || 0) > S.year * 4 + S.si ? R.ai.peaceWith : null;
    const targets = [];
    for (const c of Object.keys(S.castles).sort()) {
      const o = sim.owner(c); if (o === r || o === peace) continue;
      const from = (G.adj[c] || []).filter(n => sim.owner(n) === r);
      if (!from.length) continue;
      const avail = [];
      for (const f of from) {
        const ks = S.castles[f].knights.filter(k => sim.canAct(k) && !sim.kn(k).marched).sort((a, b) => sim.troopPower(b) - sim.troopPower(a));
        const thr0 = this.threat(sim, f, r), keep = r === 'dominion' && f === 'meridian' ? 2 : (thr0 > 0 && !(bold && (R.ai.stall || 0) >= 2) ? 1 : 0) + (r === 'amberlyn' && f === G.get('realm', r).capital ? 1 : 0);
        avail.push(...ks.slice(keep).filter(k => !(sim.kn(k).ruler && thr0 > 0 && ks.length < 3)));
      }
      if (!avail.length) continue;
      const top = avail.sort((a, b) => sim.troopPower(b) - sim.troopPower(a) || (a < b ? -1 : 1)).slice(0, 3), pow = top.reduce((a, k) => a + sim.troopPower(k), 0), def = this.defense(sim, c) / 1.25;
      const ratio = def <= 0 ? 99 : pow / def;
      let value = ratio * (c === 'meridian' ? 1.5 : G.get('castle', c).tier === 'capital' ? 1.3 : 1) * (o === 'brigands' && S.year === 1 ? 1.2 : 1);
      if (r === 'verdance' && o === 'brigands') value *= 1.3;
      if (bold && o === 'dominion' && S.year >= 2) value *= 1.6;
      if (r === 'solmark') value *= 1 + 200 / (def + 200) * .3;
      if (ratio >= thr / ag) targets.push({ c, top, value });
    }
    targets.sort((a, b) => b.value - a.value || (a.c < b.c ? -1 : 1));
    let declared = 0; for (const t of targets) { const ks = t.top.filter(k => !sim.kn(k).marched); if (ks.length && sim.apply({ t: 'declare', realm: r, target: t.c, knights: ks }).ok) declared++; }
    if (bold) R.ai.stall = declared ? 0 : stall + 1;
  },
  // the player's realm on autoplay (attract mode, playthrough bot): the same planner, plus the Sanctum when open
  autoplayMuster(sim, r) { this.muster(sim, r, true); },
  autoplayMarch(sim, r) {
    const S = sim.state; this.march(sim, r, true);
    if (S.flags.sanctumOpen && sim.owner('meridian') === r && !S.marches.some(m => m.target === 'sanctum')) {
      const ks = S.castles.meridian.knights.filter(k => sim.canAct(k) && !sim.kn(k).marched).sort((a, b) => sim.troopPower(b) - sim.troopPower(a)).slice(0, 3);
      if (ks.length >= 3 || (ks.length && S.flags.sanctumWaited)) sim.apply({ t: 'declare', realm: r, target: 'sanctum', knights: ks }); else S.flags.sanctumWaited = true;
    }
  }
};

// ---- 30-art.js ----
/* ---- ART: palettes, sigils, custom shapes, the unit visual factory, the hex battlefield and the world map ---- */
G.art = {};
const H = c => E.hex(c), MIXC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
G.PAL = {
  spring: { grass: H('#6abf4b'), grass2: H('#9ad86a'), dark: H('#3f8a35'), blossom: H('#f4b8d0'), sky: ['#7ab8e8', '#a8d8f0', '#e0f0e8'], water: H('#4a9ad8'), dirt: H('#a08050'), ambient: .8, light: '#e0ffd0' },
  summer: { grass: H('#c8b060'), grass2: H('#e8d080'), dark: H('#9a8040'), blossom: H('#f0c040'), sky: ['#e0b860', '#f0d890', '#fff0c8'], water: H('#3a8ac8'), dirt: H('#c89a58'), ambient: .95, light: '#fff0c0' },
  autumn: { grass: H('#b8883a'), grass2: H('#d8a050'), dark: H('#7a5a2a'), blossom: H('#c84a1a'), sky: ['#a86a48', '#e8b878', '#f8e0b0'], water: H('#3a7aa0'), dirt: H('#8a6040'), ambient: .72, light: '#ffc890' },
  winter: { grass: H('#e8f0f8'), grass2: H('#ffffff'), dark: H('#8aa8c8'), blossom: H('#c8e8ff'), sky: ['#7a90b8', '#b8c8e0', '#e8f0f8'], water: H('#3a6a98'), dirt: H('#9aa8b8'), ambient: .66, light: '#c8e0ff' },
  hour: { grass: H('#5a5a68'), grass2: H('#6a6a78'), dark: H('#3a3a46'), blossom: H('#d8c070'), sky: ['#14121c', '#2a2838', '#4a4658'], water: H('#2a3a58'), dirt: H('#4a4650'), ambient: .5, light: '#f0e0a0' }
};
G.realmColor = r => G.has('realm', r) ? G.get('realm', r).main : '#a0a0a0';
G.SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

/* ---- sigils and icons drawn with px (the 5×7 font lacks them) ---- */
G.art.sigil = (g, kind, x, y, s, c, c2) => {
  x = Math.round(x); y = Math.round(y);
  switch (kind) {
    case 'blossom': for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; px.disc(g, x + Math.cos(a) * s * .45, y + Math.sin(a) * s * .45, s * .3, c); } px.disc(g, x, y, s * .2, c2); break;
    case 'sun': for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; px.line(g, x, y, x + Math.cos(a) * s * .8, y + Math.sin(a) * s * .8, c, 1); } px.disc(g, x, y, s * .42, c); px.disc(g, x, y, s * .22, c2); break;
    case 'leaf': px.poly(g, [[x, y - s * .8], [x + s * .5, y - s * .1], [x + s * .2, y + s * .6], [x, y + s * .4], [x - s * .2, y + s * .6], [x - s * .5, y - s * .1]], c); px.line(g, x, y - s * .5, x, y + s * .7, c2, 1); break;
    case 'snowflake': for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; px.line(g, x - Math.cos(a) * s * .8, y - Math.sin(a) * s * .8, x + Math.cos(a) * s * .8, y + Math.sin(a) * s * .8, c, 1); } px.disc(g, x, y, s * .2, c2); break;
    case 'hourglass': px.poly(g, [[x - s * .5, y - s * .7], [x + s * .5, y - s * .7], [x, y], [x + s * .5, y + s * .7], [x - s * .5, y + s * .7], [x, y]], c); px.line(g, x - s * .6, y - s * .75, x + s * .6, y - s * .75, c2, 1); px.line(g, x - s * .6, y + s * .75, x + s * .6, y + s * .75, c2, 1); break;
    case 'axes': px.line(g, x - s * .6, y + s * .6, x + s * .6, y - s * .6, c2, 1); px.line(g, x + s * .6, y + s * .6, x - s * .6, y - s * .6, c2, 1); px.disc(g, x + s * .5, y - s * .5, s * .28, c); px.disc(g, x - s * .5, y - s * .5, s * .28, c); break;
    default: px.disc(g, x, y, s * .5, c);
  }
};
G.art.banner = (g, realm, x, y, s = 1, seatColor) => {   // a little banner with the realm's shape and sigil (side tags: never colour alone)
  const R = G.has('realm', realm) ? G.get('realm', realm) : { main: '#888', trim: '#222', sigil: 'disc', banner: 'square' };
  const w = Math.round(9 * s), h = Math.round(11 * s), main = seatColor || R.main;
  px.line(g, x, y - 2, x, y + h + 3, '#3a2a1a', 1);
  let pts;
  switch (R.banner) { case 'swallowtail': pts = [[x, y], [x + w, y], [x + w * .65, y + h * .5], [x + w, y + h], [x, y + h]]; break; case 'pointed': pts = [[x, y], [x + w, y], [x + w, y + h * .7], [x + w / 2, y + h], [x, y + h * .7]]; break;
    case 'triangle': pts = [[x, y], [x + w, y + h * .45], [x, y + h]]; break; case 'long': pts = [[x, y], [x + w * .8, y], [x + w * .8, y + h * 1.3], [x + w * .4, y + h * 1.1], [x, y + h * 1.3]]; break;
    case 'ragged': pts = [[x, y], [x + w, y], [x + w, y + h * .8], [x + w * .75, y + h], [x + w * .5, y + h * .75], [x + w * .25, y + h], [x, y + h * .85]]; break; default: pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
  px.poly(g, pts.map(p => [p[0] + 1, p[1] + 1]), '#140c14'); px.poly(g, pts, main); px.line(g, x + 1, y + 1, x + w - 1, y + 1, E.shade(main, .3), 1);
  G.art.sigil(g, R.sigil, x + w * .45, y + h * .45, s * 4, R.trim, main);
};
G.art.seasonIcon = (g, season, x, y, s = 4) => {
  const c = G.SEASON_COLOR[season] || '#ccc';
  if (season === 'spring') G.art.sigil(g, 'blossom', x, y, s * 1.8, c, '#fff0a0');
  else if (season === 'summer') G.art.sigil(g, 'sun', x, y, s * 1.8, c, '#fff8d0');
  else if (season === 'autumn') G.art.sigil(g, 'leaf', x, y, s * 1.8, c, '#5a3a1a');
  else if (season === 'winter') G.art.sigil(g, 'snowflake', x, y, s * 1.8, c, '#ffffff');
  else G.art.sigil(g, 'hourglass', x, y, s * 1.6, c, '#f0e8d8');
};
G.art.manaIcon = (g, x, y) => { px.poly(g, [[x, y - 4], [x + 3, y], [x, y + 4], [x - 3, y]], '#7ac8ff'); px.dot(g, x - 1, y - 1, '#ffffff'); };
G.art.candle = (g, x, y, n, max) => {
  const h = Math.max(2, Math.round(18 * (max ? n / max : 1)));
  px.rect(g, x - 3, y + 20 - h, 6, h, '#e8e0d0'); px.rect(g, x - 3, y + 20 - h, 2, h, '#fff8e8'); px.rect(g, x - 4, y + 20, 8, 2, '#8a7050');
  if (n > 0) { const f = Math.sin(Date.now() / 90) > 0 ? 1 : 0; px.disc(g, x, y + 17 - h, 2 + f, '#ffb030'); px.dot(g, x, y + 16 - h, '#fff0a0'); }
};
G.art.effectIcon = (g, eff, x, y) => {   // distinct shapes, not colour alone
  const c = G.get('effect', eff).color;
  px.rect(g, x - 3, y - 3, 7, 7, '#140c14');
  switch (eff) {
    case 'poison': px.disc(g, x, y + 1, 2, c); px.dot(g, x, y - 2, c); break;
    case 'burn': px.poly(g, [[x, y - 3], [x + 2, y + 2], [x - 2, y + 2]], c); break;
    case 'chill': px.line(g, x - 2, y, x + 2, y, c); px.line(g, x, y - 2, x, y + 2, c); px.dot(g, x - 2, y - 2, c); px.dot(g, x + 2, y + 2, c); break;
    case 'sleep': px.line(g, x - 2, y - 2, x + 2, y - 2, c); px.line(g, x + 2, y - 2, x - 2, y + 2, c); px.line(g, x - 2, y + 2, x + 2, y + 2, c); break;
    case 'stop': px.disc(g, x, y, 3, c); px.line(g, x, y, x, y - 2, '#140c14'); px.line(g, x, y, x + 2, y, '#140c14'); break;
    case 'valor': px.poly(g, [[x - 2, y + 1], [x, y - 2], [x + 2, y + 1]], c); px.poly(g, [[x - 2, y + 3], [x, y], [x + 2, y + 3]], c); break;
    case 'haste': for (let i = -2; i <= 2; i += 2) px.line(g, x - 2, y + i, x + 2, y + i, c); break;
    case 'warded': case 'guarded': case 'frostarmor': px.poly(g, [[x - 2, y - 2], [x + 2, y - 2], [x + 2, y], [x, y + 3], [x - 2, y]], c); break;
    case 'weakened': px.poly(g, [[x - 2, y - 1], [x, y + 2], [x + 2, y - 1]], c); break;
    case 'exposed': px.rect(g, x - 2, y - 2, 5, 5, c); px.rect(g, x - 1, y - 1, 3, 3, '#140c14'); break;
    default: px.disc(g, x, y, 2, c);
  }
};

/* ---- custom shapes: castles in six styles, the keep, raised hex blocks, gears, cottages, the clock tower ---- */
const castleShape = (wall, roof, accent, o = {}) => ({ about: 'castle', tags: 'castle', mats: { w: wall + ' stones', r: roof + ' shingles', a: accent + ' glaze', d: '#3a2a20 planks' },
  parts: [['box', 'w', [0, 0, 0], [30, 22, 14]], ['mirror', 'x', ['cyl', 'w', [14, 9, 0], 5, 22]], ['mirror', 'x', ['cyl', 'r', [14, 9, 22], 6, 8, { r2: 0 }]], ['cyl', 'w', [0, -4, 0], 7, 30], ['cyl', 'r', [0, -4, 30], 8, 11, { r2: 0, seg: o.seg || 8 }], ['box', 'd', [0, 11, 0], [6, 1, 8]], ['row', 4, [7, 0, 0], ['box', 'w', [0, 11, 14], [3, 1, 3]]]].concat(o.extra || []) });
E.SHAPES['bt-castle-winter'] = castleShape('#8a90a0', '#3a5a8a', '#c8f0ff', { extra: [['mirror', 'x', ['cyl', 'a', [14, 9, 18], 1, 4, { r2: 0 }]]] });
E.SHAPES['bt-castle-spring'] = castleShape('#e8e4d8', '#4a9a4a', '#f4b8d0', { extra: [['mirror', 'x', ['ball', 'a', [10, 12, 4], 3]]] });
E.SHAPES['bt-castle-summer'] = castleShape('#d8b880', '#b03a2a', '#f0c040', { seg: 12, extra: [['ball', 'a', [0, -4, 41], 3]] });
E.SHAPES['bt-castle-autumn'] = castleShape('#8a6a4a', '#c87a2a', '#e0a040', { extra: [['mirror', 'x', ['cyl', 'a', [8, 13, 0], 2, 3]]] });
E.SHAPES['bt-castle-hour'] = castleShape('#3a3a46', '#d8c070', '#f0e8d8', { extra: [['cyl', 'a', [0, 3.5, 22], 4, 1, { sq: .2 }]] });
E.SHAPES['bt-castle-brigand'] = { about: 'brigand palisade camp', tags: 'castle', mats: { p: '#6a4a2a planks', t: '#a89070 cloth', f: '#5a4030 bark' },
  parts: [['ring', 14, 15, ['cyl', 'f', [0, 0, 0], 1.6, 12, { r2: .4 }]], ['cyl', 't', [-4, -2, 0], 7, 12, { r2: 0, seg: 6 }], ['cyl', 't', [6, 3, 0], 5, 9, { r2: 0, seg: 6 }], ['box', 'p', [0, 12, 0], [6, 2, 6]]] };
E.SHAPES['bt-keep'] = { about: 'a round keep tower', tags: 'castle', mats: { w: '#8a8478 stones', r: '#5a3a3a shingles' },
  parts: [['cyl', 'w', [0, 0, 0], 8, 26], ['ring', 6, 8, ['box', 'w', [0, 0, 26], [3, 3, 4]]], ['cyl', 'r', [0, 0, 26], 6, 10, { r2: 0 }]] };
E.SHAPES['bt-hexblock'] = { about: 'raised rampart hex', tags: 'wall', mats: { w: '#8a8478 stones' }, parts: [['cyl', 'w', [0, 0, 0], 16.2, 22, { seg: 6 }], ['ring', 6, 13, ['box', 'w', [0, 0, 22], [5, 4, 4]]]] };
E.SHAPES['bt-gear'] = { about: 'a brass gear block', tags: 'wall', mats: { b: '#b89848 metal', d: '#5a4a2a metal' }, parts: [['cyl', 'd', [0, 0, 0], 15, 16, { seg: 6 }], ['cyl', 'b', [0, 0, 16], 13, 4], ['ring', 10, 13, ['box', 'b', [0, 0, 16], [4, 4, 4]]], ['cyl', 'd', [0, 0, 20], 4, 2]] };
E.SHAPES['bt-cliff'] = { about: 'rock face', tags: 'rock', mats: { r: '#7a7070 stones' }, parts: [['rock', 'r', [0, 0, 0], 15, { sz: 1.4, seed: 3, rough: .4 }]] };
E.SHAPES['bt-cottage'] = { about: 'a cottage', tags: 'house', mats: { w: '#d8c8a8 noise', r: '#8a4a2a shingles', d: '#4a3020 planks' }, parts: [['box', 'w', [0, 0, 0], [20, 16, 12]], ['prism', 'r', [0, 0, 12], [[-11, 0], [11, 0], [0, 9]], 18, { axis: 'y' }], ['box', 'd', [0, 8, 0], [5, 1, 8]]] };
E.SHAPES['bt-clocktower'] = { about: "Meridian's great clock tower", tags: 'tower', mats: { w: '#4a4658 stones', b: '#d8c070 metal', f: '#f0e8d8 glaze' },
  parts: [['box', 'w', [0, 0, 0], [26, 26, 20]], ['box', 'w', [0, 0, 20], [18, 18, 50]], ['box', 'f', [0, 9.5, 52], [14, 1, 14]], ['cyl', 'b', [0, 0, 70], 12, 18, { r2: 0, seg: 4 }], ['mirror', 'x', ['cyl', 'w', [11, 11, 0], 4, 40]]] };
E.SHAPES['bt-dial'] = { about: 'a season dial', tags: 'floor', mats: { b: '#b89848 metal' }, parts: [['cyl', 'b', [0, 0, 0], 9, 2]] };
E.SHAPES['bt-mill'] = { about: 'a watermill', tags: 'house', mats: { w: '#c8b898 noise', r: '#6a4a2a shingles', k: '#5a4030 planks' }, parts: [['box', 'w', [0, 0, 0], [16, 14, 12]], ['prism', 'r', [0, 0, 12], [[-9, 0], [9, 0], [0, 7]], 16, { axis: 'y' }], ['cyl', 'k', [9, 0, 6], 6, 2, { rot: [0, 90, 0] }]] };

/* ---- the unit visual factory: one object per unit with the Humanoid's interface ---- */
G.art.visual = spec => new UnitVisual(spec);
class UnitVisual {
  // spec: { kind: 'knight' | 'monster', id (knight id) | sp + tier, side colour }
  constructor(spec) {
    this.spec = spec; this.t = 0; this.attack = null; this.anim = null; this.flash = 0; this.pose = null; this.down = 0; this.alpha = 1; this.tint = null;
    if (spec.kind === 'knight') { const d = G.get('knight', spec.id); this.mode = 'hum'; this.rig = new E.Humanoid(Object.assign({}, d.look, { size: d.look.size * (spec.scale || .8) })); this.bow = d.bow || G.get('class', spec.cls || d.cls).basic.bow; this.whip = d.whip; this.height = 34 * d.look.size * (spec.scale || .8); this.halo = d.halo; }
    else {
      const m = G.get('monster', spec.sp), tier = spec.tier || 1, rg = m.rig, tk = [1, 1.15, 1.3][tier - 1], sz = { S: .75, M: 1, L: 1.45 }[m.sizes[tier - 1]];
      this.rg = rg; this.tier = tier; this.sp = spec.sp;
      if (rg.kind === 'blob') { this.mode = 'blob'; this.rig = new E.Blob(Object.assign({ R: rg.R * tk * sz / .85 }, { colors: rg.colors, ears: rg.ears, wings: rg.wings, feet: rg.feet, tail: rg.tail, mouth: rg.mouth, horns: tier >= 3 && rg.over === 'slime' })); this.height = rg.R * 2.2 * tk * sz + (rg.float || rg.fly ? 6 : 0); }
      else if (rg.kind === 'hum') { this.mode = 'hum'; this.rig = new E.Humanoid(Object.assign({}, rg.look, { size: rg.look.size * tk * .85, colors: Object.assign({}, rg.look.colors) })); this.height = 34 * rg.look.size * tk * .85; if (rg.wings) this.wings = new E.Wings(this.rig, { kind: rg.wings, color: rg.wingColor || '#f0d8ff' }); }
      else { this.mode = 'beast'; this.rig = new E.Beast({ body: rg.body, preset: rg.preset, legs2: rg.legs2 || (rg.body === 'drake' && tier === 1 && spec.sp === 'wyvern'), scale: sz * tk * .9, tier, colors: rg.colors, parts: Object.assign({}, rg.parts, { wings: rg.parts.wings && (!rg.parts.wingsFrom || tier >= rg.parts.wingsFrom) ? rg.parts.wings : 'none' }) }); this.height = this.rig.height; }
    }
  }
  get facing() { return this._f || 0; }
  // play an action: 'attack' (with move name), 'cast', 'hurt', 'cheer', 'die', 'kneel', 'down'
  act(kind, o = {}) {
    this.anim = { kind, t: 0, dur: o.dur || (kind === 'die' ? 1 : .6), move: o.move };
    if (kind === 'attack' && this.mode === 'hum') { try { this.swing = new E.Attack(o.move || 'slash'); this.swing.start(); } catch (e) { this.swing = new E.Attack('slash'); this.swing.start(); } }
    if (kind === 'hurt') this.flash = .25;
    if (kind === 'attack' && this.mode === 'blob') this.rig.kick(.5);
  }
  update(dt, st) {
    this.t += dt; this._f = st.facing; this.flash = Math.max(0, this.flash - dt);
    const a = this.anim; if (a) { a.t += dt; if (a.t > a.dur && a.kind !== 'die' && a.kind !== 'down' && a.kind !== 'kneel') this.anim = null; }
    const k = a ? Math.min(1, a.t / a.dur) : 0;
    if (this.mode === 'hum') {
      if (this.swing) { this.swing.update(dt); if (!this.swing.phase) this.swing = null; }
      const pose = st.pose || (a && a.kind === 'cast' ? 'cast' : a && a.kind === 'cheer' ? 'cheer' : a && a.kind === 'die' ? 'die' : a && a.kind === 'kneel' ? 'kneel' : a && a.kind === 'down' ? 'down' : a && a.kind === 'guard' ? 'block' : null);
      this.rig.update(dt, { x: st.x, y: st.y, z: st.z + (this.rg && this.rg.float ? 6 + Math.sin(this.t * 2) : 0), vx: st.vx || 0, vy: st.vy || 0, facing: st.facing, attack: this.swing ? this.swing.state : null, pose, expr: st.expr || (a && a.kind === 'hurt' ? 'wince' : null), hurt: a && a.kind === 'hurt' ? (1 - k) : 0, down: st.sleep ? .3 : 0 });
      if (this.wings) this.wings.update(dt);
    } else if (this.mode === 'blob') {
      this.rig.update(dt, { squash: a && a.kind === 'attack' ? Math.sin(k * Math.PI) * .35 : a && a.kind === 'hurt' ? -.3 * (1 - k) : Math.sin(this.t * 3) * .06, look: [Math.cos(st.facing), Math.sin(st.facing)], walk: Math.min(1, Math.hypot(st.vx || 0, st.vy || 0) / 30), flap: this.rg.wings ? 1 : 0, squint: !!st.sleep });
    } else {
      const kindMap = { attack: o => o || 'bite', cast: () => 'roar', hurt: null, cheer: () => 'roar' };
      const att = a && (a.kind === 'attack' || a.kind === 'cast' || a.kind === 'cheer') ? { kind: a.kind === 'attack' ? (a.move || 'bite') : 'roar', u: k } : null;
      this.rig.update(dt, { x: st.x, y: st.y, z: st.z, vx: st.vx || 0, vy: st.vy || 0, facing: st.facing, attack: att, hurt: this.flash, sleep: !!st.sleep, down: a && a.kind === 'die' ? k : 0 });
    }
    this.x = st.x; this.y = st.y; this.z = st.z;
  }
  draw(g, ox, oy, view) {
    if (this.mode === 'hum') {
      if (this.wings) this.wings.draw(g, ox, oy, view, false);
      if (this.halo) { const t = this.t; for (let i = 0; i < 12; i++) { const a = t * .5 + i * Math.PI / 6, [hx, hy] = view.p(Math.cos(a) * 9, Math.sin(a) * 9, this.height + 2); px.dot(g, ox + hx, oy + hy, i % 3 ? '#8a8a92' : '#f0f0f0'); } }
      this.rig.draw(g, ox, oy, view);
      if (this.wings) this.wings.draw(g, ox, oy, view, true);
      if (this.bow) this.drawBow(g, ox, oy, view);
      if (this.rg && this.rg.tool) this.drawTool(g, ox, oy, view);
      if (this.rg && this.rg.clockFace) { const [hx, hy] = view.p(0, 0, this.height * .9); px.disc(g, ox + hx, oy + hy, 4, '#f0e8d0'); px.line(g, ox + hx, oy + hy, ox + hx + Math.cos(this.t * 2) * 3, oy + hy + Math.sin(this.t * 2) * 3, '#2a2010'); px.line(g, ox + hx, oy + hy, ox + hx, oy + hy - 2, '#2a2010'); }
      if (this.rg && this.rg.halo === 'gear') for (let i = 0; i < 8; i++) { const a = this.t + i * Math.PI / 4, [hx, hy] = view.p(Math.cos(a) * 6, Math.sin(a) * 6, this.height + 3); px.dot(g, ox + hx, oy + hy, '#e8c860'); }
    } else if (this.mode === 'blob') {
      const fl = this.rg.float || this.rg.fly ? 5 + Math.sin(this.t * 2.5) * 1.5 : 0, [fx, fy] = view.p(0, 0, fl);
      this.rig.draw(g, ox + fx, oy + fy, view);
      this.drawBlobOverlay(g, ox + fx, oy + fy, view);
    } else this.rig.draw(g, ox, oy, view);
  }
  drawBow(g, ox, oy, view) { try { const [hx, hy, hz] = this.rig.hand('L'), [p, q] = view.p(hx - this.x, hy - this.y, hz - this.z), x = Math.round(ox + p), y = Math.round(oy + q); for (let i = -6; i <= 6; i++) px.dot(g, x + Math.round(2.4 * Math.cos(i / 6 * 1.2)) - 2, y + i, i % 3 ? '#8a5a2a' : '#5a3a1a'); px.line(g, x - 1, y - 6, x - 1, y + 6, '#e8e0d0'); } catch (e) { /* the rig's hands are not posed yet */ } }
  drawTool(g, ox, oy, view) {
    try { const [hx, hy, hz] = this.rig.hand('R'), [p, q] = view.p(hx - this.x, hy - this.y, hz - this.z), x = Math.round(ox + p), y = Math.round(oy + q);
      if (this.rg.tool === 'scythe') { px.line(g, x, y + 6, x, y - 12, '#6a4a2a', 1); px.poly(g, [[x, y - 12], [x + 8, y - 9], [x + 1, y - 10]], '#d8d8e0'); }
      else { px.line(g, x, y, x + 2, y - 9, '#6a4a2a', 2); px.disc(g, x + 2, y - 10, 2.5, '#5a3a1a'); } } catch (e) { /* the rig's hands are not posed yet */ }
  }
  drawBlobOverlay(g, ox, oy, view) {
    const R = this.rig.o.R * view.scale, [cx0, cy0] = view.p(0, 0, this.rig.o.R), cx = ox + cx0, cy = oy + cy0, t = this.t, ov = this.rg.over;
    if (ov === 'leaf') { px.poly(g, [[cx, cy - R], [cx - R * .6, cy - R * 1.5], [cx - R * .1, cy - R * 1.1]], '#4aa040'); px.poly(g, [[cx, cy - R], [cx + R * .6, cy - R * 1.5], [cx + R * .1, cy - R * 1.1]], '#6ac050'); if (this.tier >= 3) px.disc(g, cx, cy - R * 1.4, 2, '#f4b8d0'); }
    if (ov === 'pumpkin') { for (const k of [-.45, .45]) px.line(g, cx + R * k, cy - R * .8, cx + R * k, cy + R * .7, '#a04a10'); px.poly(g, [[cx - 3, cy - 1], [cx - 1, cy - 1], [cx - 2, cy - 3]], '#ffe040'); px.poly(g, [[cx + 1, cy - 1], [cx + 3, cy - 1], [cx + 2, cy - 3]], '#ffe040'); px.line(g, cx - 3, cy + 2, cx + 3, cy + 2, '#ffe040'); const f = Math.sin(t * 12) > 0; px.disc(g, cx, cy - R - 2, f ? 2 : 1.5, '#ffb020'); px.dot(g, cx, cy - R - 3, '#fff0a0'); }
    if (ov === 'frost') { for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; px.dot(g, cx + Math.cos(a) * R * 1.2, cy + Math.sin(a) * R * .6 - R * .3, '#ffffff'); } if (this.tier >= 3) px.blend(g, .5, 'add', () => px.disc(g, cx, cy, R * 1.3, '#60ffd0')); }
    if (ov === 'clock') { px.disc(g, cx, cy, R * .6, '#f0e8d0'); px.line(g, cx, cy, cx + Math.cos(t * 3) * R * .5, cy + Math.sin(t * 3) * R * .5, '#2a2010'); px.line(g, cx, cy, cx + Math.cos(t * .3) * R * .35, cy + Math.sin(t * .3) * R * .35, '#2a2010'); for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.09; px.disc(g, cx + Math.cos(a) * R * 1.3, cy + Math.sin(a) * R * .5, 1.5, '#d8b050'); } }
    if (ov === 'slime') px.dot(g, cx - R * .4, cy - R * .5, '#ffffff');
    if (this.tier >= 2 && (ov === 'slime' || ov === 'leaf' || ov === 'pumpkin' || this.rg.wings)) { px.poly(g, [[cx - 3, cy - R - 1], [cx - 3, cy - R - 4], [cx - 1, cy - R - 2], [cx, cy - R - 5], [cx + 1, cy - R - 2], [cx + 3, cy - R - 4], [cx + 3, cy - R - 1]], '#f0c040'); }
  }
  portrait(g, x, y, size, o = {}) {
    if (this.mode === 'hum') this.rig.drawPortrait(g, x, y, size, Object.assign({ bg: '#1a1624' }, o));
    else if (this.mode === 'beast') this.rig.drawPortrait(g, x, y, size, { bg: o.bg || '#1a1624' });
    else { px.rect(g, x, y, size, size, o.bg || '#1a1624'); const v = E.VIEWS.brawler; this.rig.draw(g, x + size / 2, y + size * .78, v); this.drawBlobOverlay(g, x + size / 2, y + size * .78, v); }
  }
}
G.UnitVisual = UnitVisual;

// ---- 31-art-field.js ----
/* ---- THE HEX BATTLEFIELD: a wall-less TileMap whose floorTex bakes each hex's terrain for the season and region,
 * hex edges darkened, props per terrain (trees, rocks, reeds, ruins), raised blocks as shapes, the Keep tower ---- */
const OFF = 40;   // world offset of hex (0,0)'s origin: room for the margin
G.OFF = OFF;
G.hexWorld = c => { const [x, y] = G.hex.center(c); return [x + OFF, y + OFF]; };
G.worldHex = (x, y) => G.hex.toCell(x - OFF, y - OFF);
const n2 = (x, y) => E.noise2(x, y), h2 = (x, y) => E.hash2(x | 0, y | 0);
class HexField {
  constructor(sim, o = {}) { this.sim = sim; this.region = G.REGION_DRESS[o.region] || o.region || 'spring'; this.o = o; this.build(); }
  build() {
    const S = this.sim.state, W = Math.ceil(((S.w + 1) * G.T + OFF * 2) / 16), Hh = Math.ceil((S.h * G.T * .866 + G.T + OFF * 2) / 16);
    const rows = []; for (let y = 0; y < Hh; y++) rows.push('.'.repeat(W));
    this.map = new E.TileMap({ rows, legend: { '.': 0 }, ao: 0, outside: '#1a1a20', floorTex: (x, y) => this.tex(x, y) });
    this.bw = W * 16; this.bh = Hh * 16;
    this.cells = S.cells.slice(); this.season = S.season; this.grid = G.settings ? G.settings.grid : 'Subtle';
    this.tagWater();
  }
  tagWater() { const S = this.sim.state; for (let i = 0; i < S.cells.length; i++) { const t = G.get('terrain', S.cells[i]); if (t.water && !t.ice) { const [x, y] = G.hexWorld([i % S.w, Math.floor(i / S.w)]); try { this.map.setFloor(Math.floor(x / 16), Math.floor(y / 16), 'water', false); } catch (e) { /* off the map */ } } } }
  refresh() { const S = this.sim.state; if (S.season !== this.season || S.cells.join() !== this.cells.join() || this.grid !== (G.settings && G.settings.grid)) { this.cells = S.cells.slice(); this.season = S.season; this.grid = G.settings && G.settings.grid; this.map.floors = {}; } }
  pal() { return G.PAL[this.sim.state.season] || G.PAL.spring; }
  tex(x, y) {
    const S = this.sim.state, c = G.worldHex(x, y), P = this.pal(), dress = G.PAL[this.region] || P;
    const inside = c[0] >= 0 && c[1] >= 0 && c[0] < S.w && c[1] < S.h;
    const nz = n2(x / 9, y / 9), sp = h2(x, y);
    let col;
    if (!inside) { const b = MIXC(dress.grass, P.grass, .5); col = MIXC(b, [20, 20, 26], .45 + nz * .1); return col; }
    const code = S.cells[c[1] * S.w + c[0]], season = S.season, hour = G.get('map', S.spec.map).hour;
    const grass = () => { let b = MIXC(MIXC(dress.grass, P.grass, .6), P.grass2, nz * .5); if (sp > .93) b = MIXC(b, P.dark, .5); if (sp < .02 && season === 'spring') b = P.blossom; if (season === 'autumn' && sp > .985) b = H('#c84a1a'); return b; };
    switch (code) {
      case '.': col = hour ? MIXC(H('#5a5866'), H('#6a6878'), nz) : grass(); break;
      case ',': col = MIXC(P.dirt, H('#c8a878'), nz * .4); if (sp > .9) col = MIXC(col, [60, 40, 30], .3); if (season === 'winter') col = MIXC(col, [235, 240, 248], .45); break;
      case 'f': col = MIXC(grass(), P.dark, .45 + nz * .2); break;
      case 'h': { const [cx, cy] = G.hexWorld(c), d = Math.hypot(x - cx, y - cy) / 14; col = MIXC(grass(), d < .6 ? [255, 250, 220] : P.dark, d < .6 ? .15 : .25); break; }
      case 'm': col = MIXC(H('#7a7074'), H('#9a9094'), nz); if (season === 'winter' && nz > .5) col = H('#e8f0f8'); break;
      case '~': col = MIXC(P.water, [160, 210, 230], .35 + Math.sin((x + y) / 3) * .05); break;
      case 'w': case 'L': col = MIXC(P.water, [20, 40, 80], .3 + nz * .15); if (Math.sin(x / 2.5 + nz * 6) > .92) col = MIXC(col, [255, 255, 255], .35); break;
      case 's': col = MIXC(H('#5a6a3a'), H('#3a4a2a'), nz); if (sp > .9) col = H('#4a7a8a'); break;
      case 'F': { const st = Math.sin((x + y * .3) / 1.6) > 0; col = season === 'summer' ? (st ? H('#e8c860') : H('#c8a040')) : season === 'autumn' ? (st ? H('#b89050') : H('#8a6a3a')) : season === 'winter' ? H('#e8eef4') : (st ? H('#8ad060') : H('#6ab048')); break; }
      case 'r': col = MIXC(H('#9a948a'), H('#7a746a'), nz); if ((Math.floor(x / 5) + Math.floor(y / 4)) % 2 && sp > .3) col = MIXC(col, [60, 56, 50], .3); break;
      case '#': col = H('#6a645a'); break;
      case 'g': col = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 ? MIXC(H('#9a948c'), H('#8a847c'), nz) : MIXC(H('#a8a298'), H('#968e84'), nz); if (hour) col = MIXC(col, H('#4a4658'), .5); break;
      case 'b': col = Math.floor(y / 3) % 2 ? H('#8a6a4a') : H('#7a5a3a'); break;
      case 'K': { const [cx, cy] = G.hexWorld(c), d = Math.hypot(x - cx, y - cy); col = d > 9 && d < 11 ? H('#d8c070') : MIXC(H('#a8a098'), H('#8a8478'), nz); break; }
      case 'D': { const [cx, cy] = G.hexWorld(c), d = Math.hypot(x - cx, y - cy), lit = S.dials[c[1] * S.w + c[0]]; col = d < 9 ? (lit ? H(G.SEASON_COLOR[['winter', 'spring', 'summer', 'autumn'][(c[0] + c[1]) % 4]]) : H('#8a7a4a')) : H('#5a5468'); if (d > 4 && d < 5) col = H('#f0e0a0'); break; }
      case 'snow': col = MIXC(H('#e8f0f8'), H('#ffffff'), nz); if (sp > .95) col = H('#b8c8e0'); break;
      case 'ice': col = MIXC(H('#a8e0f0'), H('#d8f4ff'), nz); if (Math.abs(Math.sin(x / 4 + y / 7)) < .04) col = H('#6ab0d0'); break;
      case 'fire': col = MIXC(H('#c83a1a'), H('#ffa020'), nz); break;
      case 'ash': col = MIXC(H('#4a4446'), H('#6a6466'), nz); break;
      default: col = grass();
    }
    // the hex edges
    const gl = G.settings ? G.settings.grid : 'Subtle';
    if (gl !== 'Off') { const ed = G.hex.edgeDist(x - OFF, y - OFF); if (ed < .9) col = MIXC(col, [10, 8, 16], gl === 'Bold' ? .3 : .14); }
    return col;
  }
  // props per hex: seeded by position, recoloured by season
  drawProps(r) {
    const S = this.sim.state, season = S.season, m = G.get('map', S.spec.map);
    for (let i = 0; i < S.cells.length; i++) {
      const c = [i % S.w, Math.floor(i / S.w)], code = S.cells[i], [x, y] = G.hexWorld(c), hh = (k) => E.hash2(c[0] * 7 + k, c[1] * 13 + k);
      if (code === 'f') {
        const n = 2 + (hh(1) > .5 ? 1 : 0);
        for (let k = 0; k < n; k++) { const ox = (hh(k + 2) - .5) * 14, oy = (hh(k + 5) - .5) * 12, pine = season === 'winter' || this.region === 'winter' || hh(k + 9) > .7;
          r.prop(pine ? 'pine' : 'tree', x + ox, y + oy, 0, { size: .8 + hh(k + 3) * .25, color: season === 'autumn' && !pine ? (hh(k) > .5 ? '#d86a20' : '#e0a030') : season === 'spring' && !pine && hh(k) > .6 ? '#f4b8d0' : season === 'winter' ? '#e8f0f8' : undefined }); }
      } else if (code === 'm') { r.shape('bt-cliff', x, y, 0, { scale: .7 + hh(1) * .2, facing: hh(2) * 6 }); }
      else if (code === 'r') { if (hh(1) > .4) r.prop('pillar', x + (hh(2) - .5) * 10, y + (hh(3) - .5) * 8, 0, { broken: true, size: .7 }); else r.prop('rock', x, y, 0, { size: .7 }); }
      else if (code === 's') { for (let k = 0; k < 2; k++) r.prop('grass', x + (hh(k) - .5) * 14, y + (hh(k + 4) - .5) * 10, 0, { size: .8, color: '#6a7a3a' }); }
      else if (code === 'F' && season !== 'winter') { for (let k = 0; k < 2; k++) r.prop('grass', x + (hh(k) - .5) * 14, y + (hh(k + 4) - .5) * 10, 0, { size: .9, color: season === 'summer' ? '#e8c860' : season === 'autumn' ? '#a08040' : '#7ac050' }); }
      else if (code === 'h' && hh(1) > .6) r.prop('rock', x + (hh(2) - .5) * 12, y + (hh(3) - .5) * 10, 0, { size: .5 });
      else if (code === '#') r.shape(m.blockShape === 'gear' ? 'bt-gear' : m.blockShape === 'cottage' ? 'bt-cottage' : m.blockShape === 'cliff' ? 'bt-cliff' : 'bt-hexblock', x, y, 0, { scale: m.blockShape === 'cottage' ? .9 : 1, facing: m.blockShape === 'cottage' ? Math.PI / 2 : 0 });
      else if (code === 'K') { r.shape('bt-keep', x, y - 8, 0, { scale: .7 }); r.prop('torch', x - 10, y + 2, 0, { light: true, size: .8 }); }
      else if (code === 'fire') { if (Math.floor(r.t * 10 + i) % 3 === 0) G.game.particles.fire(x + (Math.random() - .5) * 12, y + (Math.random() - .5) * 10, 2, 1, { size: .6 }); G.game.lights.add(x, y, 6, 30, .6, { color: '#ff8030' }); }
      else if (code === 'D') { const lit = S.dials[i]; if (lit) G.game.lights.add(x, y, 4, 34, .9, { color: G.SEASON_COLOR[['winter', 'spring', 'summer', 'autumn'][(c[0] + c[1]) % 4]] }); }
    }
  }
}
G.HexField = HexField;

/* ---- THE WORLD MAP: Forseason as a 64 × 64-tile TileMap (1024 × 1024 units) in the three-quarter view ---- */
class WorldMap {
  constructor(sim) { this.sim = sim; this.season = null; this.owners = ''; const rows = []; for (let y = 0; y < 64; y++) rows.push('.'.repeat(64)); this.map = new E.TileMap({ rows, legend: { '.': 0 }, ao: 0, outside: '#1a3a68', floorTex: (x, y) => this.tex(x, y) }); this.roadPts = G.ROADS.map(([a, b]) => this.roadPath(a, b)); this.precompute(); this.tagSea(); }
  precompute() {
    const M = this.road = new Uint8Array(1024 * 1024);
    for (const p of this.roadPts) for (let i = 0; i < p.length - 1; i++) { const [ax, ay] = p[i], [bx, by] = p[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.hypot(dx, dy); if (d > 3.3) continue; const X = Math.round(x + dx), Y = Math.round(y + dy); if (X < 0 || Y < 0 || X > 1023 || Y > 1023) continue; const v = d > 2.4 ? 1 : 2; if (M[Y * 1024 + X] < v) M[Y * 1024 + X] = v; } } }
    const cs = G.all('castle'); this.castleList = cs; this.near = new Uint8Array(128 * 128); this.nearD = new Float32Array(128 * 128);
    for (let gy = 0; gy < 128; gy++) for (let gx = 0; gx < 128; gx++) { let bi = 0, bd = 1e9; cs.forEach((c, i) => { const d = Math.hypot(gx * 8 + 4 - c.pos[0], gy * 8 + 4 - c.pos[1]); if (d < bd) { bd = d; bi = i; } }); this.near[gy * 128 + gx] = bi; this.nearD[gy * 128 + gx] = bd; }
  }
  tagSea() { for (let cy = 0; cy < 64; cy++) for (let cx = 0; cx < 64; cx++) { const x = cx * 16 + 8, y = cy * 16 + 8; if (this.coast(x, y) > 0) this.map.setFloor(cx, cy, 'water', false); } }
  coast(x, y) { const dx = x - 512, dy = y - 512, a = Math.atan2(dy, dx), R = 470 + Math.sin(a * 5) * 14 + Math.sin(a * 11 + 1) * 9 + (n2(Math.cos(a) * 3 + 9, Math.sin(a) * 3) - .5) * 30; return Math.hypot(dx, dy) - R; }
  roadPath(a, b) { const A = G.get('castle', a).pos, B = G.get('castle', b).pos, pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, w = Math.sin(t * Math.PI) * 10 * (n2(A[0] / 50 + B[1] / 70, t) - .5); pts.push([A[0] + (B[0] - A[0]) * t - (B[1] - A[1]) / Math.hypot(B[0] - A[0], B[1] - A[1]) * w, A[1] + (B[1] - A[1]) * t + (B[0] - A[0]) / Math.hypot(B[0] - A[0], B[1] - A[1]) * w]); } return pts; }
  sector(x, y) { const a = Math.atan2(y - 512, x - 512) * 180 / Math.PI; return a; }   // -180..180, 0 east
  regionAt(x, y) {
    const d = Math.hypot(x - 512, y - 512); if (d < 175) return ['hour', null, 0];
    const a = this.sector(x, y), base = a >= -135 && a < -45 ? 'winter' : a >= -45 && a < 45 ? 'spring' : a >= 45 && a < 135 ? 'summer' : 'autumn';
    for (const [ang, s1, s2] of [[-45, 'winter', 'spring'], [45, 'spring', 'summer'], [135, 'summer', 'autumn'], [-135, 'autumn', 'winter']]) { let dd = a - ang; if (dd > 180) dd -= 360; if (dd < -180) dd += 360; if (Math.abs(dd) < 12) return [s1, s2, (dd + 12) / 24]; }
    return [base, null, 0];
  }
  landCol(reg, x, y) {
    const P = G.PAL[reg], nz = n2(x / 40, y / 40), fine = n2(x / 7, y / 7), sp = h2(x, y), season = this.sim.season();
    let c;
    if (reg === 'winter') { c = nz > .62 ? MIXC(H('#2a5a4a'), H('#3a6a5a'), fine) : nz < .25 ? MIXC(H('#a8d8ec'), H('#c8e8f8'), fine) : MIXC(H('#e8f0f8'), H('#c8d8e8'), fine * .6); if (this.coast(x, y) > -60 && Math.hypot(x - 512, y - 512) > 380 && nz > .5) c = MIXC(H('#8a8a96'), H('#b8b8c8'), fine); }
    else if (reg === 'spring') { c = nz > .65 ? MIXC(H('#3f8a35'), H('#5aa048'), fine) : nz < .22 ? MIXC(H('#4a9ad8'), H('#6ab0e0'), fine) : MIXC(P.grass, P.grass2, fine); if (nz > .55 && nz < .65 && sp > .8) c = P.blossom; }
    else if (reg === 'summer') { c = nz > .66 ? MIXC(H('#c84a2a'), H('#a83a20'), fine) : nz < .25 ? MIXC(H('#e8d8a0'), H('#f0e0b0'), fine) : MIXC(H('#c8b060'), H('#d8c070'), fine); if (sp > .985) c = H('#4a8a3a'); }
    else if (reg === 'autumn') { c = nz > .64 ? MIXC(H('#8a4a1a'), H('#a86a2a'), fine) : nz < .25 ? MIXC(H('#5a6a3a'), H('#4a5a3a'), fine) : (Math.floor((x + y * .4) / 10) % 2 ? H('#c89040') : H('#b07a30')); if (sp > .99) c = H('#f08020'); }
    else { c = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 ? MIXC(H('#5a5868'), H('#4a4858'), fine) : MIXC(H('#6a6878'), H('#5a5868'), fine); }
    // the season tints everything
    if (season === 'winter' && reg !== 'winter' && h2(x * 3, y) > (reg === 'summer' ? .85 : .55)) c = MIXC(c, [240, 245, 250], .7);
    if (season === 'spring' && reg !== 'hour' && h2(x, y * 3) > .985) c = H('#f4b8d0');
    if (season === 'autumn' && reg !== 'hour' && h2(x * 5, y) > .98) c = H('#d86a20');
    if (season === 'summer') c = MIXC(c, [255, 230, 160], .08);
    return c;
  }
  tex(x, y) {
    const co = this.coast(x, y);
    if (co > 8) { const d = Math.min(1, co / 80), wv = Math.sin(x / 9 + n2(x / 30, y / 30) * 6) > .9 ? .2 : 0; return MIXC(MIXC(H('#3a7ab8'), H('#1a3a68'), d), [255, 255, 255], wv); }
    if (co > 0) return MIXC(H('#e8d8a8'), H('#d8c890'), n2(x / 5, y / 5));
    const [r1, r2, t] = this.regionAt(x, y); let c = this.landCol(r1, x, y); if (r2) c = MIXC(c, this.landCol(r2, x, y), t);
    // roads
    const X = Math.max(0, Math.min(1023, x | 0)), Y = Math.max(0, Math.min(1023, y | 0)), rv = this.road[Y * 1024 + X];
    if (rv) return MIXC(H(r1 === 'hour' ? '#8a8478' : '#a08058'), [60, 40, 30], rv === 1 ? .35 : n2(x / 3, y / 3) * .2);
    // ownership: a dithered tint of the owner's colour over each castle's cell
    const gi = (Math.min(127, Y >> 3)) * 128 + Math.min(127, X >> 3), best = this.castleList[this.near[gi]];
    if (this.nearD[gi] < 120 && ((x >> 1) + (y >> 1)) % 3 === 0) { const ow = this.sim.owner(best.id); c = MIXC(c, H(G.realmColor(ow)), .35); }
    return c;
  }
  refresh() { const own = Object.values(this.sim.state.castles).map(c => c.owner).join(), s = this.sim.season(); if (own !== this.owners || s !== this.season) { this.owners = own; this.season = s; this.map.floors = {}; } }
  shapeFor(c) { const reg = G.get('castle', c).region, own = this.sim.owner(c); if (own === 'brigands') return 'bt-castle-brigand'; if (c === 'meridian') return 'bt-clocktower'; return 'bt-castle-' + (G.REGION_DRESS[reg] || 'spring'); }
  drawProps(r) {
    // trees and mesas by region, scattered on a seeded grid
    for (let gy = 0; gy < 1024; gy += 44) for (let gx = 0; gx < 1024; gx += 44) {
      const x = gx + h2(gx, gy * 3) * 30, y = gy + h2(gx * 5, gy) * 30; if (this.coast(x, y) > -10 || Math.hypot(x - 512, y - 512) < 190) continue;
      if (G.all('castle').some(c => Math.hypot(c.pos[0] - x, c.pos[1] - y) < 40)) continue;
      const reg = this.regionAt(x, y)[0], k = h2(gx * 7, gy * 11), season = this.sim.season();
      if (k < .35) continue;
      if (reg === 'winter') r.prop('pine', x, y, 0, { size: 1, color: season === 'winter' || k > .8 ? '#e8f0f8' : undefined });
      else if (reg === 'spring') r.prop(k > .75 ? 'flowers' : 'tree', x, y, 0, { size: 1, color: k > .6 && k < .75 ? '#f4b8d0' : undefined });
      else if (reg === 'summer') r.prop(k > .8 ? 'cactus' : k > .6 ? 'palm' : 'rock', x, y, 0, { size: .9, color: k <= .6 ? '#c84a2a' : undefined });
      else r.prop(k > .8 ? 'mushroom' : 'tree', x, y, 0, { size: 1, color: k > .55 ? '#d86a20' : '#c8a030' });
    }
    r.shape('bt-mill', 300, 610, 0, { scale: 1.2 }); r.shape('bt-mill', 760, 720, 0, { scale: 1.1 }); r.shape('bt-cottage', 840, 420, 0, { scale: 1 }); r.shape('bt-cottage', 600, 860, 0);
  }
}
G.WorldMap = WorldMap;

// ---- 40-audio.js ----
/* ---- AUDIO: all code, no files. Songs in the engine's { bpm, steps, tracks } format around the Wheel motif
 * (D A G A | F E D), stings, custom sound effects through audio.define, and the Animalese babble voice ---- */
const rep = (s, n) => Array(n).fill(s).join(' | ');
G.SONGS = {
  title: { bpm: 92, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .1, notes: 'D5 - - - A5 - - - G5 - - - A5 - - - | F5 - - - E5 - - - D5 - - - - - - - | D5 - - - A5 - - - G5 - A5 - C6 - - - | A5 - - - G5 - F5 - E5 - - - - - . . | F5 - - - G5 - - - A5 - - - D6 - - - | C6 - - - A5 - - - G5 - - - - - - - | F5 - E5 - D5 - - - E5 - F5 - G5 - - - | A5 - - - - - - - . . . . . . . .' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: rep('D3 - . D3 A2 - . A2 C3 - . C3 G2 - . G2', 4) },
    { name: 'pad', wave: 'saw', vol: .035, notes: rep('D4 - - - - - - - - - - - - - - - | C4 - - - - - - - - - - - - - - -', 2) + ' | ' + rep('Bb3 - - - - - - - - - - - - - - - | A3 - - - - - - - - - - - - - - -', 2) },
    { name: 'drums', wave: 'drums', vol: .07, notes: 'k . . . h . . . s . . . h . . k' }] },
  spring: { bpm: 104, steps: 4, tracks: [
    { wave: 'pulse12', vol: .09, notes: 'F5 - A5 - C6 - A5 - B5 - - - G5 - - - | E5 - G5 - C6 - B5 - A5 - - - - - . . | F5 - C6 - A5 - G5 - A5 - B5 - C6 - - - | G5 - F5 - E5 - G5 - F5 - - - - - . .' },
    { wave: 'triangle', vol: .22, notes: rep('F3 - . F3 C3 - . C3 G3 - . G3 C3 - . E3', 4) },
    { wave: 'drums', vol: .05, notes: 'k . h . h . h . k . h . h . h h' }] },
  summer: { bpm: 116, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'A4 - - E5 - - A5 - G5 - E5 - D5 - - - | E5 - - A5 - - B5 - C#6 - B5 - A5 - - - | G5 - - D5 - - G5 - F#5 - E5 - D5 - - - | E5 - C#5 - A4 - B4 - A4 - - - - - . .' },
    { wave: 'triangle', vol: .24, notes: rep('A2 . A2 . E3 . A2 . G2 . G2 . D3 . G2 .', 4) },
    { wave: 'drums', vol: .07, notes: 's . s s k . s . s . s s k . s s' }] },
  autumn: { bpm: 96, steps: 3, tracks: [
    { wave: 'triangle', vol: .15, notes: 'E5 - - G5 - - B5 - - A5 - - | G5 - - F#5 - - E5 - - - - - | D5 - - F#5 - - A5 - - G5 - - | F#5 - - E5 - - D#5 - - - - -' },
    { wave: 'saw', vol: .035, notes: 'E4 - - G4 - - B4 - - C5 - - | B4 - - A4 - - G4 - - - - - | D4 - - F#4 - - A4 - - B4 - - | A4 - - G4 - - F#4 - - - - -' },
    { wave: 'triangle', vol: .2, notes: 'E2 . . B2 . . E3 . . A2 . . | C3 . . G2 . . E2 . . B2 . . | D2 . . A2 . . D3 . . G2 . . | B2 . . F#2 . . B1 . . . . .' },
    { wave: 'drums', vol: .04, notes: 'k . . h . . h . .' }] },
  winter: { bpm: 72, steps: 4, tracks: [
    { wave: 'sine', vol: .11, notes: 'B5 - - - - - F#5 - - - - - D5 - - - | E5 - - - - - - - C#5 - - - - - - - | B4 - - - D5 - - - F#5 - - - A5 - - - | G5 - - - F#5 - - - - - - - - - - -' },
    { wave: 'pulse12', vol: .04, notes: 'B6 . . . . . . . F#6 . . . . . . . | . . . . E6 . . . . . . . . . . .' },
    { wave: 'sine', vol: .08, notes: rep('B2 - - - - - - - - - - - - - - - | G2 - - - - - - - - - - - - - - -', 2) }] },
  battle_attack: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .08, notes: 'D5 - D5 - A5 - - - G5 - A5 - F5 - - - | E5 - D5 - C5 - D5 - A4 - - - - - . . | D5 - F5 - A5 - D6 - C6 - A5 - G5 - - - | F5 - E5 - D5 - E5 - D5 - - - - - . .' },
    { name: 'bass', wave: 'saw', vol: .07, notes: rep('D2 D2 D3 D2 D2 D3 D2 D3 C2 C2 C3 C2 Bb1 Bb2 A1 A2', 4) },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . s . k k s . k . s . k k s s' },
    { name: 'tension', wave: 'pulse', vol: .05, on: false, notes: rep('D6 . D6 . C#6 . C#6 . D6 . D6 . Eb6 . D6 .', 4) }] },
  battle_defend: { bpm: 128, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .09, notes: 'G4 - Bb4 - D5 - - - C5 - Bb4 - A4 - - - | Bb4 - A4 - G4 - D4 - G4 - - - - - . . | Eb5 - D5 - C5 - Bb4 - A4 - Bb4 - C5 - - - | D5 - C5 - Bb4 - A4 - G4 - - - - - . .' },
    { name: 'bass', wave: 'triangle', vol: .25, notes: rep('G2 . G2 . D3 . G2 . Eb2 . Eb2 . D2 . D2 .', 4) },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . o . s . o o k . o . s . t t' },
    { name: 'tension', wave: 'saw', vol: .04, on: false, notes: rep('G5 . F#5 . G5 . F#5 . G5 . A5 . Bb5 . A5 .', 4) }] },
  hourless: { bpm: 100, steps: 4, tracks: [
    { wave: 'saw', vol: .05, notes: 'C5 - - - B4 - - - Bb4 - - - A4 - - - | Ab4 - - - G4 - - - F#4 - - - G4 - - - | C5 - - - Eb5 - - - D5 - - - C5 - - - | B4 - - - - - - - G4 - - - - - - -' },
    { wave: 'triangle', vol: .2, notes: rep('C2 - . . G1 - . . C2 - . . G1 - . .', 4) },
    { wave: 'drums', vol: .06, notes: 'c . c . c . c . c . c . c . c .' }] },
  boss: { bpm: 150, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .08, notes: 'E5 - F5 - E5 - D5 - E5 - - B4 - C5 - | E5 - F5 - G5 - F5 - E5 - - - . . | B5 - A5 - G5 - F5 - E5 - F5 - - E5 - | D5 - C5 - B4 - C5 - E5 - - - . .' },
    { name: 'saw', wave: 'saw', vol: .05, notes: rep('E3 E3 F3 E3 E3 B2 C3 B2 E3 E3 F3 G3 F3', 4) },
    { name: 'bass', wave: 'triangle', vol: .25, notes: rep('E2 . E2 E2 . F2 E2 . E2 . D2 . E2', 4) },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . s k k . s . k k s . s' }] },
  event: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'D5 - - - A4 - - - G4 - - - A4 - - - | F4 - - - E4 - - - D4 - - - - - - - | F4 - - - A4 - - - C5 - - - Bb4 - - - | A4 - - - - - - - - - - - - - - -' },
    { wave: 'pulse12', vol: .04, notes: rep('D4 - F4 - A4 - F4 - C4 - E4 - G4 - E4 -', 2) + ' | ' + rep('Bb3 - D4 - F4 - D4 - A3 - C#4 - E4 - C#4 -', 2) },
    { wave: 'triangle', vol: .16, notes: rep('D2 - - - - - - - C2 - - - - - - -', 1) + ' | ' + rep('Bb1 - - - - - - - A1 - - - - - - -', 1) }] },
  ending: { bpm: 80, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'D5 - - - A5 - - - G5 - - - A5 - - - | F#5 - - - E5 - - - D5 - - - - - - - | B4 - - - D5 - - - G5 - - - F#5 - - - | E5 - - - D5 - C#5 - D5 - - - - - - -' },
    { wave: 'triangle', vol: .2, notes: rep('D3 - - - A2 - - - B2 - - - F#2 - - -', 1) + ' | ' + rep('G2 - - - D3 - - - G2 - - - A2 - - -', 1) },
    { wave: 'saw', vol: .03, notes: 'D4 - - - - - - - - - - - - - - - | B3 - - - - - - - - - - - - - - - | G3 - - - - - - - - - - - - - - - | A3 - - - - - - - - - - - - - - -' },
    { wave: 'drums', vol: .04, notes: 'k . . . . . . . s . . . . . . .' }] }
};
const STING = (bpm, notes, wave = 'pulse', bass) => ({ bpm, steps: 4, tracks: [{ wave, vol: .12, notes }].concat(bass ? [{ wave: 'triangle', vol: .2, notes: bass }] : []) });
G.STINGS = {
  season_spring: STING(140, 'F5 A5 C6 F6 - - - - A5 C6 F6 A6 - - - -', 'pulse12', 'F3 - - - - - - - C3 - - - - - - -'),
  season_summer: STING(140, 'A4 C#5 E5 A5 - - E5 - A5 - - - - - - -', 'square', 'A2 - - - E2 - - - A2 - - - - - - -'),
  season_autumn: STING(120, 'E5 - G5 - B5 - - - A5 - G5 - E5 - - -', 'triangle', 'E2 - - - - - - - B1 - - - - - - -'),
  season_winter: STING(90, 'B5 - - F#5 - - D5 - - B4 - - - - - -', 'sine', 'B1 - - - - - - - - - - - - - - -'),
  victory: STING(150, 'D5 D5 D5 - A5 - - - G5 - A5 - D6 - - - - - - -', 'square', 'D3 - - - A2 - - - G2 - A2 - D3 - - -'),
  defeat: STING(90, 'D5 - - - C5 - - - Bb4 - - - A4 - - - - - - -', 'triangle', 'D2 - - - - - - - A1 - - - - - - -'),
  levelup: STING(180, 'C5 E5 G5 C6 E6 - - -', 'pulse'),
  promote: STING(160, 'G4 B4 D5 G5 - B5 - D6 - - G6 - - - - -', 'pulse', 'G2 - - - D3 - - - G3 - - - - - - -'),
  summon: STING(130, 'C5 - G5 - C6 - - - E6 - - -', 'saw'),
  capture: STING(150, 'A5 E5 A5 - - -', 'square'),
  candle: STING(60, 'C3 - - - - - - - B2 - - - - - - -', 'triangle', 'C2 - - - - - - - - - - - - - - -')
};
G.SFX = {
  ui_move: { wave: 'pulse', freq: 'E6', dur: .03, vol: .12 }, ui_confirm: { wave: 'pulse', freq: 'A5', to: 'E6', dur: .08, vol: .18 }, ui_cancel: { wave: 'pulse', freq: 'E5', to: 'A4', dur: .08, vol: .15 },
  ui_error: { wave: 'square', freq: 'C3', dur: .12, vol: .14 }, ui_open: { wave: 'triangle', freq: 'C5', to: 'G5', dur: .1, vol: .2 },
  bell_toll: [{ wave: 'sine', freq: 'C4', dur: 1.2, vol: .3 }, { wave: 'sine', freq: 'G5', dur: .8, vol: .1 }, { wave: 'triangle', freq: 'C5', dur: 1, vol: .08 }],
  sword_clang: [{ wave: 'square', freq: 2200, to: 1600, dur: .06, vol: .12 }, { wave: 'noise', freq: 4000, dur: .05, vol: .12 }], slash_whoosh: { wave: 'noise', freq: 800, to: 2400, dur: .14, vol: .12 },
  bow_twang: { wave: 'triangle', freq: 'G3', to: 'D3', dur: .15, vol: .2 }, arrow_hit: { wave: 'noise', freq: 1500, to: 400, dur: .06, vol: .15 },
  cast_charge: { wave: 'sine', freq: 'C4', to: 'C6', dur: .45, vol: .14, vib: [10, .02] },
  spell_spring: { wave: 'triangle', freq: 'C6', dur: .5, vol: .16, arp: [0, 4, 7, 12, 16], step: .05 }, spell_summer: [{ wave: 'noise', freq: 600, to: 200, dur: .5, vol: .2 }, { wave: 'saw', freq: 'A2', to: 'E2', dur: .4, vol: .1 }],
  spell_autumn: [{ wave: 'noise', freq: 3000, to: 1500, dur: .4, vol: .1 }, { wave: 'triangle', freq: 'E3', dur: .5, vol: .15 }], spell_winter: { wave: 'sine', freq: 'B6', dur: .5, vol: .12, arp: [0, 7, 12, 7, 0], step: .06 },
  spell_hour: [{ wave: 'square', freq: 'C5', dur: .05, vol: .1 }, { wave: 'square', freq: 'G4', dur: .05, vol: .1 }], heal: { wave: 'sine', freq: 'C5', dur: .4, vol: .16, arp: [0, 4, 7, 12], step: .07 },
  buff: { wave: 'pulse', freq: 'G4', to: 'G5', dur: .2, vol: .12 }, debuff: { wave: 'pulse', freq: 'G4', to: 'C4', dur: .2, vol: .12 },
  poison: { wave: 'saw', freq: 'C3', dur: .2, vol: .1, vib: [12, .05] }, burn: { wave: 'noise', freq: 900, dur: .25, vol: .12 }, chill: { wave: 'sine', freq: 'A6', to: 'E6', dur: .25, vol: .1 },
  sleep: { wave: 'sine', freq: 'E5', to: 'C5', dur: .4, vol: .1 }, stop: [{ wave: 'square', freq: 'C6', dur: .04, vol: .1 }, { wave: 'square', freq: 'C5', dur: .3, vol: .06 }],
  crit: [{ wave: 'noise', freq: 5000, to: 800, dur: .15, vol: .2 }, { wave: 'square', freq: 'C6', to: 'C4', dur: .15, vol: .1 }], miss: { wave: 'noise', freq: 2000, to: 3000, dur: .1, vol: .08 },
  ko_monster: { wave: 'square', freq: 'C4', to: 'C2', dur: .35, vol: .14 }, ko_knight: [{ wave: 'saw', freq: 'D3', dur: .6, vol: .14 }, { wave: 'saw', freq: 'A2', dur: .6, vol: .1 }],
  capture: { wave: 'square', freq: 'E6', dur: .3, vol: .08, arp: [0, 5, 0, 5, 0], step: .05 }, summon_rise: { wave: 'saw', freq: 'C3', to: 'C5', dur: .6, vol: .1 },
  roar_small: { wave: 'saw', freq: 'G3', to: 'D3', dur: .25, vol: .14, vib: [30, .1] }, roar_large: [{ wave: 'saw', freq: 'C3', to: 'G2', dur: .5, vol: .16, vib: [25, .12] }, { wave: 'noise', freq: 300, dur: .4, vol: .1 }],
  growl: { wave: 'saw', freq: 'E2', dur: .3, vol: .12, vib: [20, .15] }, chirp: { wave: 'sine', freq: 'C7', to: 'G6', dur: .08, vol: .1 }, flap: { wave: 'noise', freq: 400, dur: .08, vol: .1 },
  march_drums: [{ wave: 'noise', freq: 150, dur: .1, vol: .2 }], banner_flip: { wave: 'noise', freq: 1200, to: 600, dur: .15, vol: .1 }, castle_taken: { wave: 'square', freq: 'C5', dur: .4, vol: .12, arp: [0, 4, 7, 12], step: .08 },
  candle_hiss: { wave: 'noise', freq: 5000, to: 2000, dur: .4, vol: .08 }, tide: { wave: 'sine', freq: 'C4', to: 'G4', dur: .3, vol: .1 }, timer_tick: { wave: 'square', freq: 'C6', dur: .02, vol: .06 }
};
G.audioInit = game => { for (const k in G.SFX) game.audio.define(k, G.SFX[k]); };
G.sfx = (name, o) => { try { G.game.audio.sfx(name, o); } catch (e) { /* no sound headless */ } };
G.music = (id, o) => { try { const A = G.game.audio, s = G.SONGS[id]; if (!s) return; if (A.song === s) return; A.music(s, Object.assign({ fade: .6 }, o)); } catch (e) { /* no sound headless */ } };
G.sting = id => { try { G.game.audio.sting(G.STINGS[id], { duck: .35 }); } catch (e) { /* no sound headless */ } };

/* ---- the babble voice: vowels are formant-filtered tone bursts, consonants noise ticks ---- */
G.voice = {
  profile(id) {
    if (!id || id === 'narrator') return null;
    if (G.has('knight', id)) return G.get('knight', id).voice;
    if (G.has('speaker', id)) return G.get('speaker', id).voice;
    return { base: 200, range: 5, wave: 'triangle', formant: 1, rate: 1 };
  },
  // the pure schedule of one line (tests use it): [{ t, kind: 'v' | 'c', freq, dur, vol }]
  plan(p, text) {
    const out = []; if (!p) return out; let t = 0; const s = text.replace(/\{[^}]*\}/g, ''), F = { a: 800, e: 1200, i: 2200, o: 600, u: 400, y: 1800 };
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], lc = ch.toLowerCase(), rate = p.rate || 1;
      if (ch === '.') { t += (s.slice(i, i + 3) === '...' ? .25 : .12) / rate; continue; }
      if (ch === ',') { t += .08 / rate; continue; }
      if (F[lc]) { const h = (lc.charCodeAt(0) * 7 + i * 3) % p.range, up = /\?/.test(s.slice(i, i + 6)) ? 2 : 0; out.push({ t, kind: 'v', freq: p.base * Math.pow(2, (h - p.range / 2 + up) / 12), dur: .045 + (h % 3) * .01, vol: ch !== lc ? .2 : .14, formant: F[lc] * (p.formant || 1), wave: p.wave, vib: p.vib, double: p.double }); t += .055 / rate; }
      else if (/[a-z]/i.test(ch)) { out.push({ t, kind: 'c', dur: .018, vol: .05 }); t += .03 / rate; }
      else if (ch === ' ') t += .02 / rate;
    }
    return out;
  },
  _noise: null,
  // one typed letter (E.Dialog's per-letter voice hook)
  letter(p, ch) {
    const A = G.game && G.game.audio; if (!p || !A || !A.ctx || !A._sfxBus || (G.settings && G.settings.voices === 'Off')) return;
    const c = A.ctx, t = c.currentTime, lc = (ch || '').toLowerCase(), F = { a: 800, e: 1200, i: 2200, o: 600, u: 400, y: 1800 };
    try {
      if (F[lc]) {
        const h = (lc.charCodeAt(0) * 7 + (this._k = (this._k || 0) + 1) * 3) % p.range, f = p.base * Math.pow(2, (h - p.range / 2) / 12);
        const voices = p.double ? [f, f * Math.pow(2, p.double / 12)] : [f];
        for (const fr of voices) {
          const o = c.createOscillator(), bp = c.createBiquadFilter(), gn = c.createGain();
          o.type = { pulse: 'square', saw: 'sawtooth', square: 'square', triangle: 'triangle', sine: 'sine' }[p.wave] || 'triangle'; o.frequency.setValueAtTime(fr, t);
          if (p.vib) o.frequency.linearRampToValueAtTime(fr * (1 + p.vib * (h % 2 ? 1 : -1)), t + .05);
          bp.type = 'bandpass'; bp.frequency.value = F[lc] * (p.formant || 1); bp.Q.value = 2.5;
          gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(ch !== lc ? .32 : .24, t + .005); gn.gain.exponentialRampToValueAtTime(.001, t + .06);
          o.connect(bp); bp.connect(gn); gn.connect(A._sfxBus); o.start(t); o.stop(t + .07);
        }
      } else if (/[a-z]/i.test(ch)) {
        if (!this._noise) { const b = c.createBuffer(1, 2048, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this._noise = b; }
        const s = c.createBufferSource(), hp = c.createBiquadFilter(), gn = c.createGain(); s.buffer = this._noise; hp.type = 'highpass'; hp.frequency.value = 3000;
        gn.gain.setValueAtTime(.06, t); gn.gain.exponentialRampToValueAtTime(.001, t + .025); s.connect(hp); hp.connect(gn); gn.connect(A._sfxBus); s.start(t); s.stop(t + .03);
      }
    } catch (e) { /* the audio context refused */ }
  }
};
// monsters don't babble: a cry by species
G.cry = sp => { const m = G.get('monster', sp), size = m.sizes[0]; G.sfx(m.rig.kind === 'beast' ? (size === 'L' ? 'roar_large' : 'roar_small') : m.rig.kind === 'blob' ? 'chirp' : 'growl'); };

// ---- 50-ui.js ----
/* ---- UI KIT: 10-foot widgets and the focus model (d-pad, stick, hover, click), glyphs that follow the last device,
 * the input preset, idle tracking (attract) and touch-only detection ---- */
G.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1', 'Mouse2'], command: ['Space', 'Pad2'], info: ['KeyI', 'Pad3'],
  prev: ['PageUp', 'Comma', 'Pad4'], next: ['Tab', 'PageDown', 'Period', 'Pad5'], zoomOut: ['Pad6'], zoomIn: ['Pad7'], danger: ['KeyT', 'Pad10'],
  turnL: ['KeyQ'], turnR: ['KeyE', 'Pad11'], pause: ['KeyP', 'Pad9'], start: ['Pad9'], help: ['F1'], view: ['KeyV'], create: ['Pad8']
};
G.ui = {};
const I = () => G.game.input;
const PS = { 0: ['✕', '#5a8aff'], 1: ['○', '#ff5a5a'], 2: ['□', '#ff7ad0'], 3: ['△', '#5ad89a'], 4: ['L1'], 5: ['R1'], 6: ['L2'], 7: ['R2'], 8: ['Create'], 9: ['Options'], 10: ['L3'], 11: ['R3'], 12: ['↑'], 13: ['↓'], 14: ['←'], 15: ['→'] };
const XB = { 0: ['A', '#5ac85a'], 1: ['B', '#ff5a5a'], 2: ['X', '#5a8aff'], 3: ['Y', '#f0d040'], 4: ['LB'], 5: ['RB'], 6: ['LT'], 7: ['RT'], 8: ['View'], 9: ['Menu'], 10: ['LS'], 11: ['RS'], 12: ['↑'], 13: ['↓'], 14: ['←'], 15: ['→'] };
G.ui.device = () => { const d = I().lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; };
G.ui.padIndex = a => { const codes = (I().map && I().map[a]) || G.INPUT[a] || []; const c = codes.find(k => /^Pad\d+$/.test(k)); return c ? +c.slice(3) : null; };
// a glyph's width (to lay prompts out)
G.ui.glyphW = a => { const dev = G.ui.device(); if (dev === 'gamepad') { const n = G.ui.padIndex(a); if (n === null) return 0; const tab = G.xbox() ? XB : PS, l = tab[n][0]; return tab[n][1] ? 10 : E.font.width(l) + 6; } const l = G.ui.keyLabel(a); return E.font.width(l) + 6; };
G.ui.keyLabel = a => {
  const dev = G.ui.device(), codes = (I().map && I().map[a]) || G.INPUT[a] || [];
  if (dev === 'mouse') { const m = codes.find(k => /^Mouse/.test(k)); if (m) return m === 'Mouse0' ? 'L-Click' : m === 'Mouse2' ? 'R-Click' : 'M-Click'; if (a === 'confirm') return 'Click'; }
  try { const l = I().label(a, 'keyboard'); if (l) return l; } catch (e) { /* no binding */ }
  const k = codes.find(c => /^(Key|Arrow|Enter|Escape|Space|Tab|Page|F\d|Comma|Period|Minus|Equal)/.test(c)); return k ? k.replace('Key', '') : a;
};
// draw a prompt glyph for an action at x, y (top-left); returns its width
G.ui.glyph = (g, a, x, y) => {
  const dev = G.ui.device();
  if (dev === 'gamepad') {
    const n = G.ui.padIndex(a); if (n === null) return 0; const tab = G.xbox() ? XB : PS, [l, col] = tab[n];
    if (col) {
      px.disc(g, x + 4, y + 4, 5, '#140c14'); px.disc(g, x + 4, y + 4, 4, '#2a2838');
      if (tab === PS) { const c = col; if (n === 0) { px.line(g, x + 2, y + 2, x + 6, y + 6, c); px.line(g, x + 6, y + 2, x + 2, y + 6, c); } else if (n === 1) { px.disc(g, x + 4, y + 4, 2.5, c); px.disc(g, x + 4, y + 4, 1.5, '#2a2838'); } else if (n === 2) { px.rect(g, x + 2, y + 2, 5, 5, c); px.rect(g, x + 3, y + 3, 3, 3, '#2a2838'); } else { px.line(g, x + 4, y + 1, x + 1, y + 6, c); px.line(g, x + 4, y + 1, x + 7, y + 6, c); px.line(g, x + 1, y + 6, x + 7, y + 6, c); } }
      else { px.disc(g, x + 4, y + 4, 4, col); E.font.text(g, l, x + 4, y + 1, '#140c14', { align: 'center', outline: false, font: 'tiny' }); }
      return 10;
    }
    const w = E.font.width(l) + 6; E.ui.box(g, x, y - 1, w, 10, { bg: '#2a2838', border: '#8a86a0', gradient: false }); E.font.text(g, l, x + 3, y + 1, '#ffffff', { outline: false }); return w;
  }
  const l = G.ui.keyLabel(a), w = E.font.width(l) + 6;
  px.rect(g, x, y - 1, w, 10, '#140c14'); px.rect(g, x + 1, y - 1, w - 2, 9, '#e8e4f0'); px.rect(g, x + 1, y + 7, w - 2, 1, '#8a86a0');
  E.font.text(g, l, x + 3, y, '#1a1624', { outline: false }); return w;
};
// the prompt bar: [[action, verb], ...] at the bottom centre
G.ui.prompts = (r, list, o = {}) => {
  if (G.touchOnly()) return; const items = list.filter(Boolean).filter(([a]) => G.ui.glyphW(a) > 0);
  const lab = l => typeof l === 'function' ? l() : l, W = items.reduce((s, [a, l]) => s + G.ui.glyphW(a) + 3 + E.font.width(lab(l)) + 10, 0), y = o.y || r.H - 13;
  r.overlay(g => {
    let x = Math.round(r.W / 2 - W / 2); px.blend(g, .7, 'normal', () => px.rect(g, x - 6, y - 4, W + 12, 15, '#0a0812'));
    for (const [a, l] of items) { x += G.ui.glyph(g, a, x, y) + 3; E.font.text(g, lab(l), x, y, '#e8e4f0', { outline: false, shadow: '#000' }); x += E.font.width(lab(l)) + 10; }
  });
  G.ui.shownPrompts = items.map(([a, l]) => lab(l));
};
G.ui.big = () => G.settings && G.settings.uiScale === 'Large';
/* a focusable list: rows a thumb high; d-pad / stick moves it (with repeat), hover focuses, click picks */
class List {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.rects = []; this.scroll = 0; this.lastPtr = null; this.hold = 0; this.max = Math.min(8, o.max || 8); G.ui.lists = (G.ui.lists || 0) + 1; G.ui.maxRows = Math.max(G.ui.maxRows || 0, this.max); }   // 10-foot rule: never more than 8 rows on screen (5 at Large)
  set(items) { this.items = items; if (this.i >= items.length) this.i = Math.max(0, items.length - 1); }
  get cur() { return this.items[this.i]; }
  move(d) { if (!this.items.length) return; let n = this.i; for (let k = 0; k < this.items.length; k++) { n = (n + d + this.items.length) % this.items.length; if (!this.items[n].skip) break; } if (n !== this.i) { this.i = n; G.sfx('ui_move'); } }
  // returns 'pick' | 'back' | 'left' | 'right' | null
  update(dt, o = {}) {
    const inp = o.input || I(), cols = this.o.cols || 1;
    if (inp.repeat('up', .25, .08)) this.move(-cols); if (inp.repeat('down', .25, .08)) this.move(cols);
    if (cols > 1) { if (inp.repeat('left', .25, .08)) this.move(-1); if (inp.repeat('right', .25, .08)) this.move(1); }
    else { if (inp.pressed('left')) return 'left'; if (inp.pressed('right')) return 'right'; }
    const p = inp.pointer();
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) { const k = this.rects.findIndex(b => b && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h); if (k >= 0 && k !== this.i && !this.items[k].skip) { this.i = k; G.sfx('ui_move'); } }
    this.lastPtr = p;
    const c = inp.clicked(); if (c) { const k = this.rects.findIndex(b => b && c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h); if (k >= 0 && !this.items[k].skip) { this.i = k; return this.pick(); } }
    if (inp.pressed('confirm')) return this.pick();
    if (inp.pressed('cancel')) { G.sfx('ui_cancel'); return 'back'; }
    return null;
  }
  pick() { const it = this.items[this.i]; if (!it) return null; if (it.disabled) { G.sfx('ui_error'); G.ui.toast(it.why || 'Not now', 1.4); return null; } G.sfx('ui_confirm'); return 'pick'; }
  // draw rows at x, y, w wide; returns the height used
  draw(g, x, y, w, o = {}) {
    const big = G.ui.big(), rh = o.rh || (big ? 18 : 13), max = big ? Math.min(5, this.max) : this.max, sc = big ? 2 : 1, cols = this.o.cols || 1, cw = Math.floor(w / cols);
    if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + max * cols) this.scroll = this.i - max * cols + 1;
    this.scroll = Math.max(0, Math.floor(this.scroll / cols) * cols);
    this.rects = [];
    const end = Math.min(this.items.length, this.scroll + max * cols);
    for (let k = this.scroll; k < end; k++) {
      const it = this.items[k], col = (k - this.scroll) % cols, row = Math.floor((k - this.scroll) / cols), rx = x + col * cw, ry = y + row * rh, foc = k === this.i && !o.noFocus;
      this.rects[k] = { x: rx, y: ry, w: cw - 2, h: rh - 1 };
      if (it.skip) { E.font.text(g, it.label, rx + 4, ry + 3, '#b8a878', { outline: false, scale: sc > 1 ? 1 : 1 }); continue; }
      if (foc) { const b = Math.sin(G.game.real * 8) > 0 ? 1 : 0; px.rect(g, rx, ry, cw - 2, rh - 1, '#3a3a7a'); px.rect(g, rx, ry, cw - 2, 1, '#ffe070'); px.rect(g, rx, ry + rh - 2, cw - 2, 1, '#ffe070'); px.poly(g, [[rx + 2 + b, ry + rh / 2 - 3], [rx + 6 + b, ry + rh / 2], [rx + 2 + b, ry + rh / 2 + 3]], '#ffe070'); }
      let tx = rx + 9; if (it.icon) { it.icon(g, tx + 4, ry + rh / 2); tx += 12; }
      E.font.text(g, it.label, tx, ry + Math.round(rh / 2) - 3 * sc, it.disabled ? '#6a6680' : it.color || (foc ? '#ffffff' : '#d8d4e8'), { outline: false, scale: sc });
      if (it.right) E.font.text(g, it.right, rx + cw - 6, ry + Math.round(rh / 2) - 3 * sc, it.disabled ? '#6a6680' : it.rightColor || '#a8c8ff', { align: 'right', outline: false, scale: sc });
    }
    if (this.scroll > 0) px.poly(g, [[x + w / 2 - 4, y - 2], [x + w / 2 + 4, y - 2], [x + w / 2, y - 6]], '#ffe070');
    if (end < this.items.length) { const by = y + Math.ceil((end - this.scroll) / cols) * rh + 1; px.poly(g, [[x + w / 2 - 4, by], [x + w / 2 + 4, by], [x + w / 2, by + 4]], '#ffe070'); }
    const why = this.items[this.i] && this.items[this.i].disabled && this.items[this.i].why; this.whyLine = why || null;
    return Math.ceil((end - this.scroll) / cols) * rh;
  }
  hit(p) { return p && this.rects.some(b => b && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h); }
}
G.ui.List = List;
G.ui.panel = (g, x, y, w, h, title, o = {}) => {
  E.ui.box(g, x, y, w, h, { alpha: o.alpha || .9, bg: o.bg || ['#22203a', '#14121f'], border: o.border || '#8a7a50' });
  if (title) { E.font.text(g, title, x + 7, y + 5, o.titleColor || '#ffe8a8', { outline: false, shadow: '#000' }); px.rect(g, x + 5, y + 15, w - 10, 1, '#5a5070'); }
};
G.ui.bar = (g, x, y, w, v, max, col, label) => { px.rect(g, x - 1, y - 1, w + 2, 5, '#140c14'); px.rect(g, x, y, w, 3, '#3a3448'); px.rect(g, x, y, Math.max(0, Math.round(w * Math.min(1, v / Math.max(1, max)))), 3, col); if (label) E.font.text(g, label, x + w + 4, y - 2, '#d8d4e8', { outline: false, font: 'tiny' }); };
G.ui.statBar = (g, x, y, name, v, max, col) => { E.font.text(g, name, x, y, '#b8b0c8', { outline: false }); G.ui.bar(g, x + 24, y + 2, 60, v, max, col); E.font.text(g, String(Math.round(v)), x + 90, y, '#ffffff', { outline: false }); };
/* toasts: short notes stacked at the top centre */
G.ui._toasts = [];
G.ui.toast = (text, s = 3) => { G.ui._toasts.push({ text, t: 0, s }); if (G.ui._toasts.length > 3) G.ui._toasts.shift(); };
G.ui.drawToasts = (r, dt) => {
  const T = G.ui._toasts; for (const t of T) t.t += dt; for (let i = T.length - 1; i >= 0; i--) if (T[i].t > T[i].s) T.splice(i, 1);
  r.overlay(g => T.forEach((t, i) => { const lines = E.font.wrap(t.text, Math.min(300, r.W - 40)), w = Math.max(...lines.map(l => E.font.width(l))) + 16, x = Math.round(r.W / 2 - w / 2), y = 26 + i * 22; E.ui.box(g, x, y, w, 6 + lines.length * 9, { alpha: .92, border: '#d8c070' }); lines.forEach((l, k) => E.font.text(g, l, r.W / 2, y + 4 + k * 9, '#fff4d0', { align: 'center', outline: false })); }));
};
/* a confirm box: { text, yes, no, onYes, onNo } - modal over a scene; update returns true while open */
class Confirm {
  constructor() { this.open = false; this.list = new List([{ label: 'Yes' }, { label: 'No' }]); }
  ask(text, onYes, o = {}) { this.text = text; this.onYes = onYes; this.onNo = o.onNo; this.list.set([{ label: o.yes || 'Yes' }, { label: o.no || 'No' }]); this.list.i = o.focusNo ? 1 : 0; this.open = true; G.sfx('ui_open'); }
  update(dt) { if (!this.open) return false; const r = this.list.update(dt); if (r === 'pick') { this.open = false; I().consumeAll(); if (this.list.i === 0) this.onYes && this.onYes(); else this.onNo && this.onNo(); } else if (r === 'back') { this.open = false; I().consumeAll(); this.onNo && this.onNo(); } return true; }
  draw(r) { if (!this.open) return; r.overlay(g => { const lines = E.font.wrap(this.text, 220), w = 240, h = 30 + lines.length * 10 + 30, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2); px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000')); G.ui.panel(g, x, y, w, h, null); lines.forEach((l, i) => E.font.text(g, l, r.W / 2, y + 10 + i * 10, '#ffffff', { align: 'center', outline: false })); this.list.draw(g, x + 70, y + 16 + lines.length * 10, 100); }); }
}
G.ui.Confirm = Confirm;
/* idle time for the attract mode: any key, button, click, pointer move over 4 px or stick push resets it */
G.idle = 0; G._lastPtr = null; G._seenInput = false;
G.trackIdle = dt => {
  const inp = I(); let active = inp.anyPressed() || (inp.held && inp.held.size > 0);
  const p = inp.pointer(); if (p && G._lastPtr && Math.hypot(p[0] - G._lastPtr[0], p[1] - G._lastPtr[1]) > 4) active = true; if (p) G._lastPtr = p.slice();
  const m = inp.move(); if (Math.hypot(m[0], m[1]) > .5) active = true;
  if (inp.clicked()) active = true;
  if (active) { G.idle = 0; if (inp.lastDevice === 'keyboard' || inp.lastDevice === 'gamepad') G._seenInput = true; } else G.idle += dt;
  return active;
};
/* touch-only devices: coarse pointer, no fine pointer, touch points, no key or pad seen */
G.forceTouchOnly = false;
G.touchOnly = () => {
  if (G.forceTouchOnly) return true; if (G._seenInput) return false;
  try { if (typeof matchMedia !== 'function' || typeof navigator === 'undefined') return false; return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0 && !(navigator.getGamepads && [...navigator.getGamepads()].some(p => p)); } catch (e) { return false; }
};
// text helpers
G.ui.text = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
G.ui.wrapText = (g, s, x, y, w, c = '#e8e4f0', lh = 10, o = {}) => { const lines = E.font.wrap(s, w); lines.forEach((l, i) => G.ui.text(g, l, x, y + i * lh, c, o)); return lines.length * lh; };
G.xbox = () => !!(G.game && G.game.settings && G.game.settings.glyphs === 'xbox');
// the glyph's text for an action on the current device (prompts, tests): '✕' / 'A' / 'Enter' / 'L-Click'
G.ui.glyphLabel = a => { if (G.ui.device() === 'gamepad') { const n = G.ui.padIndex(a); return n === null ? '' : (G.xbox() ? XB : PS)[n][0]; } return G.ui.keyLabel(a); };

// ---- 60-scene-front.js ----
/* ---- FRONT END: the title (a four-season diorama round Meridian's clock tower), campaign setup, skirmish setup,
 * About & Credits, How to Play, the endings and the credits roll ---- */
G.scenes = G.scenes || {};
const SEASON_BG = {
  spring: { sky: ['#6aa8e0', '#a8d8f0', '#f0f4e0'], sun: { x: .78, y: .22, r: 12, color: '#fff8d0' }, layers: [{ kind: 'mountains', color: '#8ab0c8', y: .55, height: .25, parallax: .1 }, { kind: 'hills', color: '#6ab050', y: .66, height: .2, parallax: .25 }, { kind: 'forest', color: '#3f8a35', y: .76, height: .15, parallax: .4 }] },
  summer: { sky: ['#e09040', '#f0c870', '#fff0c0'], sun: { x: .3, y: .25, r: 16, color: '#fff0a0' }, layers: [{ kind: 'mountains', color: '#c86a3a', y: .58, height: .22, parallax: .1 }, { kind: 'hills', color: '#d8b060', y: .7, height: .16, parallax: .25 }] },
  autumn: { sky: ['#6a3a40', '#c87a50', '#f0c890'], sun: { x: .7, y: .4, r: 14, color: '#ffc080' }, layers: [{ kind: 'hills', color: '#a85a2a', y: .62, height: .22, parallax: .15 }, { kind: 'forest', color: '#c86a1e', y: .74, height: .16, parallax: .35 }] },
  winter: { sky: ['#1a2a50', '#5a7ab0', '#c8d8f0'], moon: { x: .25, y: .2, r: 10, color: '#f0f8ff' }, stars: 40, layers: [{ kind: 'mountains', color: '#d8e4f4', y: .55, height: .3, parallax: .1 }, { kind: 'forest', color: '#2a4a5a', y: .74, height: .16, parallax: .35 }] }
};
const WX = { spring: { kind: 'rain', amount: .2 }, summer: null, autumn: { kind: 'leaves', amount: .4, wind: .3 }, winter: { kind: 'snow', amount: .5 } };
const ledge = (top, side) => new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'stone', side, top, moss: '#4a6a3a' } }, edges: 'open' });
G.scenes.title = {
  view: 'side', views: ['side'], res: 'ps1', input: G.INPUT, touch: [],
  enter() {
    this.bgs = {}; for (const s of G.SEASONS) this.bgs[s] = new E.Backdrop(SEASON_BG[s]);
    this.stage = ledge('#8a8478', '#5a5468'); this.t = 0; this.si = 0; G.idle = 0; G.attract = null;
    this.lineup = ['gareth', 'morgause', 'meliant', 'pellam', 'mordrain'].map((id, i) => ({ id, rig: new E.Humanoid(Object.assign({}, G.get('knight', id).look)), x: 400 + [-150, -105, 0, 105, 150][i], f: i < 2 ? 0 : i > 2 ? Math.PI : Math.PI / 2 }));
    const items = () => { const latest = G.game.saves && G.game.saves.latest && G.game.saves.latest(); return [latest ? { label: 'Continue', id: 'continue' } : null, { label: 'New Campaign', id: 'new' }, { label: 'Skirmish', id: 'skirmish' }, { label: 'Load', id: 'load', disabled: !(G.game.saves && G.game.saves.any), why: 'No saves yet' }, { label: 'How to Play', id: 'help' }, { label: 'Settings', id: 'settings' }, { label: 'About & Credits', id: 'about' }].filter(Boolean); };
    this.items = items; this.menu = new G.ui.List(items()); G.music('title'); G.game.weather = null; G.game.lights.enabled = false;
    G.game.input.touchEnabled = false;
  },
  update(dt) {
    this.t += dt; G.trackIdle(dt);
    if (G.dev.open) { G.devUpdate(dt); return; }
    const s = Math.floor(this.t / 6) % 4; if (s !== this.si) { this.si = s; G.game.weather = WX[G.SEASONS[s]] ? Object.assign({}, WX[G.SEASONS[s]]) : null; }
    for (const h of this.lineup) { const u = (this.t * .4 + h.x * .01) % 4; h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: h.f, vx: 0, vy: 0, pose: u > 3.4 ? 'cheer' : null }); }
    G.game.focus(400, 0, 32 + (G.game.H / 2 - 44) / -G.game.view.bz);
    if (G.idle > 10) { G.game.go('attract', {}, { fade: 'dissolve' }); return; }
    if (G.touchOnly()) { const c = G.game.input.clicked(); if (c && this.touchBtn && c[0] >= this.touchBtn.x && c[0] <= this.touchBtn.x + this.touchBtn.w && c[1] >= this.touchBtn.y && c[1] <= this.touchBtn.y + this.touchBtn.h) G.game.menu('settings'); return; }
    this.menu.set(this.items());
    const r = this.menu.update(dt);
    if (G.game.input.pressed('help')) { G.game.go('help', { back: 'title' }); return; }
    if (r === 'pick') {
      const id = this.menu.cur.id;
      if (id === 'continue') { const l = G.game.saves.latest(); if (l) G.game.saves.load(l.slot); }
      else if (id === 'new') G.game.go('setup');
      else if (id === 'skirmish') G.game.go('skirmish');
      else if (id === 'load') G.game.saves.show('load');
      else if (id === 'help') G.game.go('help', { back: 'title' });
      else if (id === 'settings') G.game.menu('settings');
      else if (id === 'about') G.game.go('about', { back: 'title' });
    }
  },
  draw(r) {
    const s = G.SEASONS[this.si], k = (this.t % 6) / 6;
    this.bgs[s].draw(r);
    this.stage.draw(r);
    r.shape('bt-clocktower', 400, -70, 32, { scale: .9 });
    for (const x of [300, 500]) r.prop('torch', x, -6, 32, { size: 1.2 });
    for (const h of this.lineup) { r.shadow(h.x, 0, 7, .4, '#000', 32); r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view)); }
    r.overlay(g => {
      if (k > .9) px.blend(g, (k - .9) * 6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#ffffff'));
      E.font.title(g, 'BRIGANTIME', r.W / 2, 12, { align: 'center', scale: 3, colors: ['#fff8e0', '#f0d070', '#c08a30', '#7a4a1a'], depth: 3 });
      G.ui.text(g, 'THE LEGEND OF FORSEASONS', r.W / 2, 42, '#f0e8d8', { align: 'center' });
      G.SEASONS.forEach((se, i) => G.art.seasonIcon(g, se, r.W / 2 - 30 + i * 20, 58, i === this.si ? 4 : 3));
      G.ui.text(g, 'Brigantime ' + G.VERSION + (E.version ? ' - engine ' + E.version : ''), 4, r.H - 9, '#8a86a0', { font: 'tiny' });
      if (G.touchOnly()) { const w = 220, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - 20); G.ui.panel(g, x, y, w, 64, null); G.ui.text(g, 'Controller or keyboard required', r.W / 2, y + 10, '#ffe8a8', { align: 'center' }); this.touchBtn = { x: x + 60, y: y + 30, w: 100, h: 24 }; E.ui.box(g, x + 60, y + 30, 100, 24, { border: '#ffe070' }); G.ui.text(g, 'SETTINGS', r.W / 2, y + 38, '#ffffff', { align: 'center' }); return; }
      const w = 150, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .52); G.ui.panel(g, x - 6, y - 6, w + 12, this.menu.items.length * 13 + 10, null, { alpha: .8 });
      this.menu.draw(g, x, y, w);
    });
    if (!G.touchOnly()) G.ui.prompts(r, [['confirm', 'Select'], ['up', 'Move']]);
    G.ui.drawToasts(r, 1 / 60);
  }
};
// campaign setup: players, realms (one per human, no repeats), difficulty, then Begin
G.scenes.setup = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter() { this.step = 0; this.players = 1; this.picks = []; this.diff = 1; this.bg = new E.Backdrop(SEASON_BG.autumn); this.list = this.mkList(); this.ri = 0; G.idle = 0; this.vis = {}; for (const r of G.PLAYABLE) this.vis[r] = G.art.visual({ kind: 'knight', id: G.get('realm', r).ruler }); },
  mkList() { if (this.step === 0) return new G.ui.List([1, 2, 3, 4].map(n => ({ label: n === 1 ? '1 player' : n + ' players (hot-seat)', id: n }))); if (this.step === 2) return new G.ui.List(['Easy', 'Normal', 'Hard'].map(d => ({ label: d, id: d.toLowerCase() })), { i: 1 }); return null; },
  update(dt) {
    G.trackIdle(dt); if (G.idle > 10) { G.game.go('attract'); return; }
    const I = G.game.input; for (const r in this.vis) this.vis[r].update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
    if (this.step === 1) {
      const avail = G.PLAYABLE.filter(r => !this.picks.includes(r));
      if (I.repeat('left', .25, .1)) { this.ri = (this.ri + avail.length - 1) % avail.length; G.sfx('ui_move'); } if (I.repeat('right', .25, .1)) { this.ri = (this.ri + 1) % avail.length; G.sfx('ui_move'); }
      const p = I.pointer(), c = I.clicked(); if (this.cards) { this.cards.forEach((b, i) => { if (p && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h && this.ptrMoved) this.ri = i; if (c && c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h) { this.ri = i; this.pickRealm(avail); } }); } this.ptrMoved = p && (!this.lp || p[0] !== this.lp[0] || p[1] !== this.lp[1]); this.lp = p;
      if (I.pressed('confirm')) this.pickRealm(avail);
      if (I.pressed('cancel')) { G.sfx('ui_cancel'); if (this.picks.length) this.picks.pop(); else { this.step = 0; this.list = this.mkList(); } }
      return;
    }
    if (this.step === 3) { if (I.pressed('confirm') || I.clicked()) { G.sfx('ui_confirm'); G.newCampaign({ realms: this.picks, difficulty: this.diff }); } if (I.pressed('cancel')) { this.step = 2; this.list = this.mkList(); } return; }
    const r = this.list.update(dt);
    if (r === 'back') { if (this.step === 0) G.game.go('title'); else { this.step--; if (this.step === 1) this.picks = []; this.list = this.mkList(); } }
    if (r === 'pick') { if (this.step === 0) { this.players = this.list.cur.id; this.step = 1; this.ri = 0; } else if (this.step === 2) { this.diff = this.list.cur.id; this.step = 3; } this.list = this.mkList(); }
  },
  pickRealm(avail) { const r = avail[this.ri]; if (!r) return; this.picks.push(r); G.sfx('ui_confirm'); this.ri = 0; if (this.picks.length >= this.players) { this.step = 2; this.list = this.mkList(); } },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => {
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a'));
      E.font.title(g, ['PLAYERS', 'CHOOSE A REALM', 'DIFFICULTY', 'BEGIN'][this.step], r.W / 2, 12, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] });
      if (this.step === 0 || this.step === 2) {
        const w = 200, x = Math.round(r.W / 2 - w / 2); G.ui.panel(g, x - 6, 50, w + 12, 70, null); this.list.draw(g, x, 56, w);
        if (this.step === 2) { const d = this.list.cur.id; G.ui.wrapText(g, { easy: 'Rivals earn less and attack later. The candle burns 18 seasons. Your knights learn faster.', normal: 'The war as the chroniclers tell it. The candle burns 15 seasons.', hard: 'Rivals are rich and bold, and their battle AI focuses fire. The candle burns 12 seasons.' }[d], x, 128, w, '#e8e0d0'); }
        if (this.step === 0) G.ui.wrapText(g, 'Hot-seat: each player musters and marches in turn on this device. Battles between two humans are fought here too.', x, 128, w, '#c8c0d8');
      }
      if (this.step === 1) {
        const avail = G.PLAYABLE.filter(x => !this.picks.includes(x)), cw = Math.min(100, Math.floor((r.W - 20) / avail.length) - 6), x0 = Math.round(r.W / 2 - (avail.length * (cw + 6)) / 2); this.cards = [];
        G.ui.text(g, 'Player ' + (this.picks.length + 1) + ', choose your realm', r.W / 2, 34, '#e8e0d0', { align: 'center' });
        avail.forEach((rid, i) => { const R = G.get('realm', rid), x = x0 + i * (cw + 6), y = 48, h = 150, foc = i === this.ri; this.cards.push({ x, y, w: cw, h }); G.ui.panel(g, x, y, cw, h, null, { border: foc ? '#ffe070' : R.main });
          G.art.banner(g, rid, x + 6, y + 6, 1.2); G.art.seasonIcon(g, R.season, x + cw - 12, y + 12, 4); try { this.vis[rid].portrait(g, x + cw / 2 - 20, y + 24, 40); } catch (e) { /* no portrait */ }
          G.ui.text(g, R.short, x + cw / 2, y + 70, R.main, { align: 'center' }); G.ui.text(g, G.get('knight', R.ruler).short, x + cw / 2, y + 80, '#ffffff', { align: 'center', font: 'tiny' });
          G.ui.wrapText(g, R.pitch.join(' '), x + 5, y + 92, cw - 10, '#d8d0e0', 9, { font: 'tiny' }); if (foc) px.rect(g, x + 2, y + h - 4, cw - 4, 2, '#ffe070'); });
      }
      if (this.step === 3) { G.ui.text(g, this.picks.map(p => G.get('realm', p).short).join(' • ') + ' • ' + G.cap(this.diff), r.W / 2, 70, '#ffffff', { align: 'center' }); G.ui.text(g, 'The Brigantime begins in Spring, Year 1.', r.W / 2, 90, '#e8d8a8', { align: 'center' }); }
    });
    G.ui.prompts(r, this.step === 1 ? [['left', 'Realm'], ['confirm', 'Choose'], ['cancel', 'Back']] : [['confirm', this.step === 3 ? 'Begin' : 'Choose'], ['cancel', 'Back']]);
  }
};
// skirmish: a map, a season (or the Wheel), 2-4 sides of humans or CPUs, an army per side; Banners of the Wheel preset
G.SKIRMISH_MAPS = G.all('map').filter(m => !['border_meadow', 'clockwork_sanctum'].includes(m.id)).map(m => m.id);
G.armyFor = (realm, level, n, seatAnchor) => {
  const ks = G.all('knight').filter(k => k.realm === realm && k.id !== 'graynight').sort((a, b) => (b.ruler ? 1 : 0) - (a.ruler ? 1 : 0)).slice(0, n);
  const tier = l => l >= 22 ? 3 : l >= 12 ? 2 : 1;
  return ks.map(k => ({ knight: Object.assign(G.makeKnightRec(k.id, Math.max(k.cls === 'knight' || k.cls === 'ranger' || k.cls === 'sorcerer' || k.cls === 'priest' || k.cls === 'beastlord' ? 10 : 1, level)), { equip: {} }), monsters: k.troop.slice(0, n === 1 ? 2 : 4).map(([sp], i) => ({ uid: realm + k.id + i, sp, tier: sp === 'pendulumwyrm' ? 1 : tier(level), lvl: Math.max(1, level - (i > 1 ? 1 : 0)), exp: 0 })), formation: 'vanguard' }));
};
G.skirmishSpec = cfg => {
  const n = cfg.sides.length, shrine = cfg.banners || n > 2, map = shrine ? 'wheel_shrine' : cfg.map, season = cfg.season === 'wheel' ? 'spring' : cfg.season;
  const seats = n === 2 ? ['1', '3'] : n === 3 ? ['1', '2', '3'] : ['1', '2', '3', '4'];
  return { map, season, seed: cfg.seed || 4242, mode: shrine ? 'shrine' : 'siege', wheel: cfg.season === 'wheel', region: season, sides: cfg.sides.map((s, i) => ({ realm: s.realm, name: (s.human ? 'P' + (cfg.sides.slice(0, i + 1).filter(x => x.human).length) + ' ' : 'CPU ') + G.get('realm', s.realm).short, human: s.human, ai: s.ai || 'normal', anchor: shrine ? seats[i] : undefined, troops: G.armyFor(s.realm, s.level, shrine ? 1 : 3), items: s.human ? ['herb', 'herb', 'remedy'] : [] })) };
};
G.scenes.skirmish = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter(d) {
    this.cfg = this.cfg || { map: 'river_ford', season: 'spring', banners: false, sides: [{ human: true, realm: 'verdance', level: 10 }, { human: false, ai: 'normal', realm: 'hoarfast', level: 10 }] };
    this.bg = new E.Backdrop(SEASON_BG.spring); this.list = new G.ui.List(this.rows()); G.idle = 0; this.post = d && d.post;
  },
  rows() {
    const c = this.cfg, out = [{ label: 'Preset: ' + (c.banners ? 'Banners of the Wheel' : 'Custom'), id: 'banners' }];
    if (!c.banners) { out.push({ label: 'Map: ' + G.get('map', c.map).name, id: 'map', disabled: c.sides.length > 2, why: '3-4 sides fight on the Wheel Shrine' }, { label: 'Season: ' + (c.season === 'wheel' ? 'The Wheel (turns each bell)' : G.SEASON_NAME[c.season]), id: 'season' }); }
    out.push({ label: 'Sides: ' + c.sides.length, id: 'sides' });
    c.sides.forEach((s, i) => { out.push({ label: 'Side ' + (i + 1) + ': ' + (s.human ? 'Human' : 'CPU ' + G.cap(s.ai)), id: 'who' + i, color: G.SEAT_COLORS[i] }); out.push({ label: '   Army: ' + G.get('realm', s.realm).short + ' • Level ' + s.level, id: 'army' + i }); });
    out.push({ label: 'FIGHT!', id: 'go', color: '#ffe070' });
    return out;
  },
  update(dt) {
    G.trackIdle(dt); if (G.idle > 10 && !this.post) { G.game.go('attract'); return; }
    const c = this.cfg, r = this.list.update(dt), cycle = (arr, v, d = 1) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
    const dir = r === 'left' ? -1 : r === 'right' || r === 'pick' ? 1 : 0;
    if (r === 'back') { G.game.go('title'); return; }
    if (dir && this.list.cur) {
      const id = this.list.cur.id;
      if (id === 'banners') { c.banners = !c.banners; if (c.banners) { c.season = 'wheel'; } }
      else if (id === 'map') c.map = cycle(G.SKIRMISH_MAPS.filter(m => m !== 'wheel_shrine'), c.map, dir);
      else if (id === 'season') c.season = cycle(['spring', 'summer', 'autumn', 'winter', 'wheel'], c.season, dir);
      else if (id === 'sides') { const n = Math.max(2, Math.min(4, c.sides.length + dir)); while (c.sides.length < n) c.sides.push({ human: false, ai: 'normal', realm: G.PLAYABLE[c.sides.length % 4], level: 10 }); c.sides.length = n; }
      else if (id.startsWith('who')) { const s = c.sides[+id.slice(3)], opts = ['human', 'easy', 'normal', 'hard'], cur = s.human ? 'human' : s.ai, nx = cycle(opts, cur, dir); s.human = nx === 'human'; s.ai = s.human ? 'normal' : nx; }
      else if (id.startsWith('army')) { const s = c.sides[+id.slice(4)]; if (r === 'pick' || r === 'right') { const realms = ['verdance', 'solmark', 'amberlyn', 'hoarfast', 'dominion', 'brigands']; const k = realms.indexOf(s.realm) * 4 + [5, 10, 15, 20].indexOf(s.level) + 1, kk = k % 24; s.realm = realms[Math.floor(kk / 4)]; s.level = [5, 10, 15, 20][kk % 4]; } else s.level = cycle([5, 10, 15, 20], s.level, -1); }
      else if (id === 'go' && r === 'pick') { this.fight(); return; }
      this.list.set(this.rows()); if (r !== 'pick') G.sfx('ui_move');
    }
  },
  fight() {
    const spec = G.skirmishSpec(this.cfg); spec.seed = (Date.now() >>> 0) % 1e9;
    G.startBattle(spec, { back: 'skirmish', shrine: spec.mode === 'shrine', onDone: () => G.game.go('skirmish', { post: true }) });
  },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => { px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); E.font.title(g, 'SKIRMISH', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] }); const w = 260, x = Math.round(r.W / 2 - w / 2); G.ui.panel(g, x - 6, 34, w + 12, Math.min(8, this.list.items.length) * 13 + 12, null); this.list.draw(g, x, 40, w);
      G.ui.wrapText(g, this.cfg.banners || this.cfg.sides.length > 2 ? 'Banners of the Wheel: a free-for-all on the Wheel Shrine. One troop each, six bells, the season turns every bell. Glory for damage, knockouts and holding the Shrine.' : 'Side 1 attacks, side 2 defends the Keep. Humans take turns on this device.', x, r.H - 46, w, '#c8c0d8', 9); });
    G.ui.prompts(r, [['left', 'Change'], ['confirm', 'Select'], ['cancel', 'Title']]);
  }
};
// About & Credits: pages of 10-foot text
G.scenes.about = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter(d) { this.d = d || {}; this.page = 0; this.bg = new E.Backdrop(SEASON_BG.winter); this.scroll = 0; },
  pages() { return G.ABOUT_PAGES(); },
  update(dt) { const I = G.game.input, P = this.pages(); if (I.pressed('right') || I.pressed('next') || I.pressed('confirm')) { this.page = (this.page + 1) % P.length; this.scroll = 0; G.sfx('ui_move'); } if (I.pressed('left') || I.pressed('prev')) { this.page = (this.page + P.length - 1) % P.length; this.scroll = 0; G.sfx('ui_move'); } if (I.repeat('down', .2, .06)) this.scroll++; if (I.repeat('up', .2, .06)) this.scroll = Math.max(0, this.scroll - 1); const c = I.clicked(); if (c) { this.page = (this.page + (c[0] < G.game.W / 2 ? P.length - 1 : 1)) % P.length; this.scroll = 0; } if (I.pressed('cancel')) G.game.go(this.d.back && this.d.back !== 'about' ? this.d.back : 'title'); },
  draw(r) {
    this.bg.draw(r); const P = this.pages(), pg = P[this.page];
    r.overlay(g => { px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); E.font.title(g, pg.title, r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] });
      let y = 34 - this.scroll * 10; const w = Math.min(r.W - 30, 400), x = Math.round(r.W / 2 - w / 2);
      for (const [k, v] of pg.rows) { if (k) { G.ui.text(g, k, x, y, '#ffe8a8'); y += 10; } const lines = E.font.wrap(String(v), w - 10); for (const l of lines) { if (y > 26 && y < r.H - 24) G.ui.text(g, l, x + 8, y, '#e8e4f0'); y += 10; } y += 3; }
      G.ui.text(g, (this.page + 1) + ' / ' + P.length, 8, 8, '#a8a0c0'); });
    G.ui.prompts(r, [['left', 'Page'], ['down', 'Scroll'], ['cancel', 'Back']]);
  }
};
// How to Play: eight pages, each with a small live diorama
const HELP = [
  ['THE WHEEL AND THE SEASONS', 'Each turn is a season: Spring, Summer, Autumn, Winter. A season has three phases: the Tidings (news), the Muster (organize) and the March (attack). Each season favours its realm: its castles yield more mana and its units hit harder. Reach Meridian and defeat the Gray Knight before the Hour-Candle burns out.', ['gareth', 'morgause', 'pellam', 'mordrain']],
  ['MUSTER', 'Choose a castle of yours and press {confirm}: Organize troops, Summon monsters, Move knights to a neighbouring castle, send knights on Quests, Equip items and Promote. Press {command} for the Realm book, Save and End Muster (or hold {command}).', ['lynette']],
  ['SUMMON AND BOND', 'Castles yield mana each season. Summoning a monster costs mana, and each monster costs upkeep. A knight leads up to 6 monsters; their ranks may not exceed the knight\'s Bond. Winter costs more upkeep for non-Winter beasts.', ['wren']],
  ['QUESTS', 'A knight who is not a ruler may leave for a season or two to a quest site. They may return with treasure, a beast, a wandering knight, mana or training, or come back wounded. Some sites hold a story.', ['pelleas']],
  ['MARCH', 'In the March, choose an enemy or brigand castle beside one of yours, then up to 3 troops beside it. Battles are fought in order; you may Command a battle or Delegate it. A castle left without knights falls without a fight.', ['agravain']],
  ['BELLS AND THE KEEP', 'A battle lasts twelve bells. Each bell, troops act by their knight\'s agility: each unit moves and then acts once. The attacker wins by routing the defenders, or by ending the last bell with a knight on the Keep.', ['ragnell']],
  ['WARD, SIZE AND ELEMENTS', 'A monster outside its knight\'s Ward (the dashed ring) is weaker and easier to capture. Large monsters struggle to hit small ones. Spring opposes Autumn and Summer opposes Winter: ↑ strong, ↓ weak. Spells need planted feet.', ['nimue']],
  ['KNIGHTS, RETREAT AND CAPTURE', 'When a knight falls or retreats, its troop leaves the field. Monsters near your knights may be captured. Monsters that fall are gone for good; knights are only wounded. If a ruler falls, the whole side is routed.', ['bertilak']]];
G.scenes.help = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter(d) { this.d = d || {}; this.page = 0; this.bg = new E.Backdrop(SEASON_BG.spring); this.stage = ledge('#7a9a4a', '#5a4a3a'); this.rigs = {}; },
  update(dt) { const I = G.game.input; if (I.pressed('right') || I.pressed('next') || I.pressed('confirm')) { this.page = (this.page + 1) % HELP.length; G.sfx('ui_move'); } if (I.pressed('left') || I.pressed('prev')) { this.page = (this.page + HELP.length - 1) % HELP.length; G.sfx('ui_move'); } const c = I.clicked(); if (c) this.page = (this.page + (c[0] < G.game.W / 2 ? HELP.length - 1 : 1)) % HELP.length; if (I.pressed('cancel')) G.game.go(this.d.back && this.d.back !== 'help' ? this.d.back : 'title');
    const ids = HELP[this.page][2]; ids.forEach((id, i) => { const rg = this.rigs[id] || (this.rigs[id] = new E.Humanoid(Object.assign({}, G.get('knight', id).look))); rg.update(dt, { x: 400 + (i - (ids.length - 1) / 2) * 40, y: 0, z: 32, facing: Math.PI / 2, vx: 0, vy: 0, attack: null }); }); G.game.focus(400, 0, 32 + (G.game.H / 2 - 40) / -G.game.view.bz); },
  draw(r) {
    this.bg.draw(r); this.stage.draw(r); const [title, text, ids] = HELP[this.page];
    ids.forEach((id, i) => { const x = 400 + (i - (ids.length - 1) / 2) * 40; r.actor(x, 0, 32, (g, ox, oy) => this.rigs[id] && this.rigs[id].draw(g, ox, oy, r.view)); });
    r.overlay(g => { const w = Math.min(r.W - 20, 380), x = Math.round(r.W / 2 - w / 2); G.ui.panel(g, x, 8, w, 104, (this.page + 1) + '/8  ' + title); G.ui.wrapText(g, text.replace(/\{(\w+)\}/g, (m, a) => G.ui.keyLabel(a)), x + 8, 28, w - 16, '#e8e4f0', 10); });
    G.ui.prompts(r, [['left', 'Page'], ['cancel', 'Back']]);
  }
};
// endings: the ending scene (lines), epilogue cards, then the credits roll (or Retry / Title for a bad ending)
G.scenes.ending = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter(d) {
    this.d = d = d || { kind: 'win', realm: 'verdance' }; this.t = 0; this.phase = 'scene';
    const sim = G.run && G.run.sim, realm = d.realm || (sim && sim.state.humans[0]) || 'verdance', human = (sim && sim.state.humans[0]) || realm;
    this.id = d.kind === 'win' ? 'ending_' + realm : d.kind === 'candle' ? 'ending_candle' : d.kind === 'wheel' ? 'ending_wheel_' + realm : 'ending_fallen';
    this.bad = d.kind !== 'win'; this.realm = realm;
    const ev = G.get('event', this.id); this.title = ev.title;
    const ks = sim ? sim.knightsOf(realm).map(k => k.id) : G.all('knight').filter(k => k.realm === realm).map(k => k.id);
    this.epi = this.bad ? [] : ks.filter(k => G.EPILOGUE[k]).slice(0, 8).map(k => [k, G.EPILOGUE[k]]);
    this.bg = new E.Backdrop(this.bad ? { sky: ['#101014', '#2a2a30', '#4a4a50'], layers: [{ kind: 'castle', color: '#1a1a20', y: .6, height: .4, parallax: 0 }] } : SEASON_BG.spring);
    this.started = !!d.after; this.list = new G.ui.List([{ label: 'Retry (latest save)', id: 'retry', disabled: !(G.game.saves && G.game.saves.any), why: 'No save' }, { label: 'Title', id: 'title' }]);
    G.music(this.bad ? 'hourless' : 'ending');
  },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (this.phase === 'scene' && !this.started) { this.started = true; G.game.go('event', { id: this.id, realm: this.realm, applied: true, onDone: () => G.game.go('ending', Object.assign({}, this.d, { after: true })) }); return; }
    if (this.d.after && this.phase === 'scene') this.phase = this.bad ? 'bad' : this.epi.length ? 'epi' : 'credits';
    if (this.phase === 'epi') { if ((I.pressed('confirm') || I.clicked() || (G.autoplay && this.t > .4)) && this.t > .4) { this.t = 0; this.epi.shift(); G.sfx('ui_confirm'); if (!this.epi.length) { this.phase = 'credits'; this.t = 0; } } return; }
    if (this.phase === 'credits') { if (this.t > 26 || I.pressed('confirm') && this.t > 2 || I.pressed('cancel') || (G.autoplay && this.t > 2)) G.game.go('title'); return; }
    if (this.phase === 'bad') { const r = this.list.update(dt); if (r === 'pick') { if (this.list.cur.id === 'retry') { const l = G.game.saves.latest(); if (l) G.game.saves.load(l.slot); } else G.game.go('title'); } if (G.autoplay && this.t > 1) G.game.go('title'); }
  },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => {
      if (this.bad) { px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#808080')); }
      if (this.phase === 'epi' && this.epi.length) { const [k, text] = this.epi[0], v = G.art.visual({ kind: 'knight', id: k }), w = 300, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - 40); G.ui.panel(g, x, y, w, 70, G.get('knight', k).name); try { v.rig.drawPortrait(g, x + 8, y + 20, 40); } catch (e) { /* no portrait */ } G.ui.wrapText(g, text, x + 56, y + 22, w - 64, '#ffffff', 10); }
      if (this.phase === 'credits') { const lines = G.CREDITS(), y0 = r.H - this.t * 18; E.font.title(g, this.title.toUpperCase(), r.W / 2, y0 - 40, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] }); lines.forEach((l, i) => G.ui.text(g, l, r.W / 2, y0 + i * 12, i % 3 === 0 ? '#ffe8a8' : '#e8e4f0', { align: 'center' })); }
      if (this.phase === 'bad') { E.font.title(g, this.title, r.W / 2, r.H / 2 - 50, { align: 'center', scale: 2, colors: ['#e0e0e0', '#a0a0a8', '#606068'] }); const w = 180, x = Math.round(r.W / 2 - w / 2); G.ui.panel(g, x - 6, r.H / 2 - 6, w + 12, 40, null); this.list.draw(g, x, r.H / 2, w); }
    });
    if (this.phase !== 'scene') G.ui.prompts(r, [['confirm', 'Next']]);
  }
};

// ---- 61-battle-view.js ----
/* ---- BATTLE VIEW: draws a BattleSim and plays its events (the EventPlayer): walks, swings, spells, numbers, falls,
 * captures, level-ups, bells. Used by the battle scene, the attract reel and the hub. Presentation never writes the sim ---- */
G.scenes = G.scenes || {};
const MOVE_OF = { warrior: 'slash', ranger: 'throw', mage: 'overhead', cleric: 'rising', beast: 'backslash' };
const ELEM_FX = {
  spring: (P, x, y, z) => { P.bits(x, y, z + 10, 14, ['#6ac04a', '#f4b8d0', '#a8e070', '#ffe060']); P.glints(x, y, z + 14, 8, '#ffe8a0'); },
  summer: (P, x, y, z) => { P.fire(x, y, z + 4, 10, { size: 1 }); P.explosion(x, y, z + 6, .6, { shake: 0, freeze: false, debris: false }); },
  autumn: (P, x, y, z) => { P.bits(x, y, z + 14, 16, ['#d86a20', '#c84a1a', '#8a5a2a', '#e0a030']); P.smoke(x, y, z + 8, 3, { color: '#c89a60' }); },
  winter: (P, x, y, z) => { P.bits(x, y, z + 12, 14, ['#ffffff', '#c8f0ff', '#80d0ff']); P.ring(x, y, 3, 16, '#a8f0ff', .4, z + 2); P.glints(x, y, z + 14, 8, '#ffffff'); },
  hour: (P, x, y, z) => { P.ring(x, y, 4, 18, '#d8c070', .5, z + 2); P.bits(x, y, z + 12, 10, ['#d8c070', '#8a8a92', '#f0e8d8']); },
  none: (P, x, y, z) => { P.glints(x, y, z + 14, 16, '#fff8d0'); P.ring(x, y, 4, 20, '#fff0b0', .5, z + 2); }
};
class BattleView {
  constructor(sim, o = {}) {
    this.sim = sim; this.o = o; const S = sim.state;
    this.field = new G.HexField(sim, { region: S.spec.region || (S.spec.castle ? G.get('castle', S.spec.castle).region : (o.region || 'spring')) });
    this.u = S.units.map(u => this.makeUnit(u));
    this.q = []; this.cur = null; this.wait = 0; this.texts = []; this.banner = null; this.proj = []; this.chains = []; this.speed = 1; this.hand = null; this.flashT = 0;
    const mid = G.hexWorld([Math.floor(S.w / 2), Math.floor(S.h / 2)]); this.look = [mid[0], mid[1]]; this.lookT = this.look.slice();
  }
  makeUnit(u) { const v = G.art.visual(u.kind === 'knight' ? { kind: 'knight', id: G.has('knight', u.ref) ? u.ref : 'sergeant', cls: u.cls } : { kind: 'monster', sp: u.sp, tier: u.tier }); const [x, y] = G.hexWorld([u.cx, u.cy]); return { id: u.id, vis: v, x, y, z: 0, f: u.facing || 0, path: null, gone: u.out ? 1 : 0, alpha: u.out ? 0 : 1, hurt: 0, chain: null }; }
  ensureUnits() { const S = this.sim.state; while (this.u.length < S.units.length) this.u.push(this.makeUnit(S.units[this.u.length])); }
  get busy() { return !!this.cur || this.q.length > 0 || this.u.some(p => p.path); }
  play(evs) { for (const e of evs) this.q.push(e); }
  animMul() { const s = G.settings && G.settings.battleAnim; return (s === 'Fast' ? 2 : s === 'Minimal' ? 4 : 1) * G.tune.animSpeed * this.speed; }
  focusOn(x, y) { this.lookT = [x, y]; }
  update(dt) {
    this.ensureUnits(); const S = this.sim.state, k = this.animMul(), D = dt * k;
    this.field.refresh();
    for (const p of this.u) {
      const su = S.units[p.id];
      if (p.path) { p.st += D / .13; while (p.path && p.st >= 1) { p.st -= 1; p.seg++; if (p.seg >= p.path.length - 1) { const [x, y] = G.hexWorld(p.path[p.path.length - 1]); p.x = x; p.y = y; p.path = null; } }
        if (p.path) { const a = G.hexWorld(p.path[p.seg]), b = G.hexWorld(p.path[p.seg + 1]); p.x = lerp(a[0], b[0], p.st); p.y = lerp(a[1], b[1], p.st); p.f = Math.atan2(b[1] - a[1], b[0] - a[0]); p.vx = (b[0] - a[0]) / .13 * k; p.vy = (b[1] - a[1]) / .13 * k; } }
      if (!p.path) { p.vx = 0; p.vy = 0; if (!p.gone && !p.leaving) { const [x, y] = G.hexWorld([su.cx, su.cy]); p.x = x; p.y = y; } if (su.facing !== undefined && !p.turnHold) p.f = E.approachAng ? E.approachAng(p.f, su.facing, dt * 8) : su.facing; }
      if (p.leaving) { p.x += Math.cos(p.leaving) * 40 * D; p.y += Math.sin(p.leaving) * 40 * D; p.alpha = Math.max(0, p.alpha - D * .8); p.vx = Math.cos(p.leaving) * 40; p.vy = Math.sin(p.leaving) * 40; }
      if (p.fading) p.alpha = Math.max(0, p.alpha - D * 1.2);
      p.hurt = Math.max(0, p.hurt - dt);
      p.vis.update(D, { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.f, sleep: !!su.eff.sleep && !su.out, pose: su.out === 'down' && !p.leaving ? 'kneel' : null });
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.t += dt; if (t.t > t.life) this.texts.splice(i, 1); }
    for (let i = this.proj.length - 1; i >= 0; i--) { const p = this.proj[i]; p.t += D / p.dur; if (p.t >= 1) this.proj.splice(i, 1); }
    for (let i = this.chains.length - 1; i >= 0; i--) { const c = this.chains[i]; c.t += dt; if (c.t > 1.2) this.chains.splice(i, 1); }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    // the event queue
    if (this.wait > 0) { this.wait -= D; }
    else if (!this.u.some(p => p.path)) { this.cur = null; if (this.q.length) this.playOne(this.q.shift()); }
    // camera
    this.look[0] = lerp(this.look[0], this.lookT[0], Math.min(1, dt * 7)); this.look[1] = lerp(this.look[1], this.lookT[1], Math.min(1, dt * 7));
  }
  pos(id) { const p = this.u[id]; return [p.x, p.y, p.z]; }
  say(id, s, c = '#ffffff', o = {}) { const [x, y] = this.pos(id); this.texts.push({ x, y, z: (this.u[id].vis.height || 24) + 8 + (o.dz || 0), s, c, t: 0, life: o.life || 1, scale: o.scale || 1 }); }
  playOne(e) {
    const S = this.sim.state, P = G.game.particles, u = e.u !== undefined ? S.units[e.u] : null, pv = e.u !== undefined ? this.u[e.u] : null; this.cur = e;
    const W = s => { this.wait = s; };
    switch (e.type) {
      case 'bell': this.banner = { s: 'BELL ' + e.bell + ' / ' + S.bells, t: 0, life: 1.1, c: '#ffe070' }; G.sfx('bell_toll', { pitch: 1 + (e.bell - 1) * .03 }); W(.5);
        if (S.spec.mode !== 'shrine' && e.bell >= S.bells - 3 && this.o.onTension) this.o.onTension(); break;
      case 'season': this.banner = { s: G.SEASON_NAME[e.season].toUpperCase() + ' TIDE', t: 0, life: 1.2, c: G.SEASON_COLOR[e.season] }; G.sfx('tide'); W(.4); break;
      case 'troop': { const tr = S.troops[e.troop], k = S.units[tr.knight]; this.focusOn(...this.pos(k.id)); this.activeTroop = e.troop; W(.15); break; }
      case 'move': { if (!pv) break; const path = e.path; if (e.undo || path.length < 2) { const [x, y] = G.hexWorld(path[path.length - 1]); pv.x = x; pv.y = y; break; } pv.path = path; pv.seg = 0; pv.st = 0; this.focusOn(...G.hexWorld(path[path.length - 1])); G.sfx('ui_move', { vol: .3 }); break; }
      case 'act': {
        const sk = e.skill ? G.get('skill', e.skill) : null, cls = u.kind === 'knight' ? G.get('class', u.cls) : null, [tx, ty] = G.hexWorld(e.target);
        if (!G.hex.same(e.target, [u.cx, u.cy])) pv.f = Math.atan2(ty - pv.y, tx - pv.x);
        const magic = sk && (sk.kind === 'spell' || sk.magic || sk.heal || sk.healPct || (sk.buff && !sk.p));
        const mv = sk && sk.anim ? sk.anim : u.kind === 'knight' ? (cls.basic.anim || MOVE_OF[cls.line] || 'slash') : (u.basic.range[1] > 1 ? 'throw' : 'bite');
        if (pv.vis.mode === 'beast') pv.vis.act(magic ? 'cast' : 'attack', { move: ['bite', 'claw', 'gore', 'breath', 'tailsweep', 'roar', 'pounce', 'dive', 'coil', 'stomp'].includes(mv) ? mv : sk && /breath/.test(e.skill) ? 'breath' : 'bite', dur: .7 });
        else pv.vis.act(magic ? 'cast' : 'attack', { move: ['slash', 'backslash', 'overhead', 'rising', 'thrust', 'spin', 'plunge', 'twohand', 'throw', 'bash', 'claw', 'cast'].includes(mv) ? mv : 'slash', dur: .6 });
        if (sk) { this.texts.push({ x: pv.x, y: pv.y, z: (pv.vis.height || 24) + 18, s: sk.name, c: '#ffe8a0', t: 0, life: 1.1, scale: 1 }); }
        if (magic) { G.sfx('cast_charge'); G.game.particles.ring(pv.x, pv.y, 2, 14, G.SEASON_COLOR[e.elem] || '#ffffff', .5, 1); }
        else G.sfx(u.basic.bow || (sk && sk.bow) ? 'bow_twang' : 'slash_whoosh');
        if ((u.basic.bow && !sk) || (sk && sk.bow) || (sk && sk.anim === 'throw')) this.proj.push({ a: [pv.x, pv.y, 18], b: [tx, ty, 12], t: 0, dur: .35, kind: 'arrow' });
        else if (sk && (sk.kind === 'spell' || sk.magic) && sk.p) this.proj.push({ a: [pv.x, pv.y, 20], b: [tx, ty, 10], t: 0, dur: .3, kind: 'orb', c: G.SEASON_COLOR[e.elem] || '#fff' });
        if (sk && (sk.area === 'cone2' || sk.area === 'cone3' || sk.area === 'line3' || sk.area === 'line4')) for (const c of e.cells) { const [x, y] = G.hexWorld(c); (ELEM_FX[e.elem] || ELEM_FX.none)(P, x, y, 0); }
        this.hl = { cells: e.cells, t: 0 };
        this.focusOn((pv.x + tx) / 2, (pv.y + ty) / 2);
        if (G.settings && G.settings.battleCam === 'Dynamic' && magic && sk && sk.p && G.game.zoom < 1.6) this.zoomKick = .5;
        W(magic ? .55 : .35); break;
      }
      case 'hit': {
        const [x, y] = this.pos(e.u); pv.hurt = .3; pv.vis.act('hurt');
        if (e.dmg > 0 || !e.why) G.game.hitFx(x, y, 14, { damage: e.dmg, power: e.crit ? 1.5 : 1, sound: e.crit ? 'crit' : (e.why ? false : 'hit'), textColor: e.why ? (e.color || '#ffb070') : e.crit ? '#ffe040' : '#ffffff' });
        if (e.crit) this.say(e.u, 'CRIT!', '#ffe040', { dz: 10 });
        if (e.strong) this.say(e.u, '↑ STRONG', '#ff8a5a', { dz: 18, life: .8 }); if (e.weak) this.say(e.u, '↓ WEAK', '#8ab0ff', { dz: 18, life: .8 });
        if (e.why && e.why !== 'fire') this.say(e.u, e.why.toUpperCase(), e.color || '#ffb070', { dz: 16, life: .8 });
        if (this.hl) { const src = e.src !== null ? S.units[e.src] : null; if (src) { const el = (this.cur && this.cur.elem) || src.elem; if (!['spring', 'summer', 'autumn', 'winter', 'hour'].includes(el)) G.game.particles.sparks(x, y, 14, 6); else (ELEM_FX[el] || ELEM_FX.none)(P, x, y, 0); } }
        W(.18); break;
      }
      case 'miss': this.say(e.u, 'MISS', '#a8a8b8'); G.sfx('miss'); W(.15); break;
      case 'heal': if (e.amount > 0) { this.say(e.u, '+' + e.amount, '#8affa0'); const [x, y] = this.pos(e.u); P.glints(x, y, 16, 10, '#8affc0'); P.ring(x, y, 3, 12, '#8affc0', .4, 1); G.sfx('heal'); } W(.15); break;
      case 'mp': this.say(e.u, (e.amount > 0 ? '+' : '') + e.amount + ' MP', '#8ab0ff'); W(.12); break;
      case 'status': this.say(e.u, G.get('effect', e.eff).name.toUpperCase(), G.get('effect', e.eff).color, { dz: 6 }); G.sfx(['poison', 'burn', 'chill', 'sleep', 'stop'].includes(e.eff) ? e.eff : 'debuff'); W(.2); break;
      case 'buff': this.say(e.u, G.get('effect', e.eff).name, G.get('effect', e.eff).color, { dz: 6 }); G.sfx('buff'); W(.12); break;
      case 'resist': this.say(e.u, 'RESIST', '#c8c8d8', { dz: 6, life: .7 }); W(.1); break;
      case 'fade': W(0); break;
      case 'skip': this.say(e.u, e.why === 'sleep' ? 'Zzz' : 'STOPPED', '#c0a0ff'); W(.25); break;
      case 'ko': { pv.vis.act('die', { dur: .9 }); pv.fading = true; const [x, y] = this.pos(e.u); P.bits(x, y, 12, 14, [G.SEASON_COLOR[u.elem] || '#fff', '#ffffff']); G.sfx('ko_monster'); W(.5); break; }
      case 'knightDown': pv.vis.act('kneel', { dur: .6 }); this.say(e.u, u.name + ' FALLS', '#ff8a8a', { scale: 1, life: 1.6 }); G.sfx('ko_knight'); this.banner = { s: u.name.toUpperCase() + ' FALLS', t: 0, life: 1.3, c: '#ff8a7a' }; game.after(.9 / this.animMul(), () => { pv.leaving = pv.f + Math.PI; }); W(.9); break;
      case 'retreat': case 'retreatCmd': if (e.type === 'retreatCmd') { this.say(e.u, 'RETREAT', '#ffd080'); W(.3); break; } pv.leaving = this.sim.faceEnemy(u) + Math.PI; W(.12); break;
      case 'capture': { const by = this.u[e.by]; this.chains.push({ a: by, b: pv, t: 0 }); this.say(e.u, 'CAPTURED', '#ffe070'); G.sfx('capture'); G.sting('capture'); game.after(.8 / this.animMul(), () => { pv.fading = true; }); W(.8); break; }
      case 'levelup': { const [x, y] = this.pos(e.u); this.say(e.u, 'LEVEL ' + e.lvl + '!', '#ffe070', { dz: 14, life: 1.5, scale: 1 }); const g = e.gains, parts = ['atk', 'def', 'int'].filter(s => g[s] > 0).map(s => '+' + g[s] + ' ' + s.toUpperCase()); if (parts.length) this.say(e.u, parts.join(' '), '#fff0b0', { dz: 2, life: 1.5 }); P.glints(x, y, 20, 16, '#ffe070'); P.ring(x, y, 2, 14, '#ffe070', .6, 1); G.sting('levelup'); W(.5); break; }
      case 'terrain': W(0); break;
      case 'hand': this.hand = { line: e.line, t: 0 }; G.sfx('stop'); W(.4); break;
      case 'dial': G.sfx(e.lit ? 'heal' : 'debuff'); this.banner = { s: e.lit ? 'A SEASON DIAL LIGHTS' : 'A DIAL GOES DARK', t: 0, life: 1, c: e.lit ? '#ffe070' : '#a0a0b0' }; W(.35); break;
      case 'wheel': this.banner = { s: 'THE WHEEL TURNS!', t: 0, life: 2, c: '#fff0a0' }; G.game.flash('#fff8e0', .25, .6); G.sting('promote'); W(1); break;
      case 'timelessBreak': this.banner = { s: 'TIMELESS IS BROKEN', t: 0, life: 1.4, c: '#fff0a0' }; W(.6); break;
      case 'summon': { const [x, y] = this.pos(e.u); P.ring(x, y, 2, 20, '#d8c070', .6, 1); G.sfx('summon_rise'); this.banner = { s: 'SECOND HANDS ANSWER', t: 0, life: 1.3, c: '#d8c070' }; W(.6); break; }
      case 'rebirth': { const [x, y] = this.pos(e.u); P.fire(x, y, 4, 16, { size: 1.2 }); this.say(e.u, 'REBIRTH', '#ffa040'); W(.5); break; }
      case 'misfire': this.say(e.u, 'MISFIRE!', '#a8e0ff'); W(.4); break;
      case 'glory': if (e.amount >= 10) this.texts.push({ x: this.look[0], y: this.look[1], z: 50, s: '+' + e.amount + ' GLORY', c: G.SEAT_COLORS[e.side] || '#ffe070', t: 0, life: 1, scale: 1 }); W(0); break;
      case 'item': this.say(e.u, G.get('item', e.item).name, '#c8ffc8'); W(.3); break;
      case 'wait': W(.05); break;
      case 'endTroop': W(.1); break;
      case 'over': W(.3); break;
      default: W(0);
    }
  }
  // draw the field, decals, units and floating texts; deco: { reach, targets, area, cursor, wards, danger, path }
  draw(r, deco = {}) {
    const S = this.sim.state, P = G.PAL[S.season] || G.PAL.spring, hour = G.get('map', S.spec.map).hour;
    r.sky(hour ? G.PAL.hour.sky : P.sky);
    const L = G.game.lights; L.enabled = true; L.ambient = hour ? .5 : P.ambient;
    this.field.map.drawFloor(r);
    const poly = (c, col, a, inset = 1) => r.decal(g => { const pts = G.hex.corners(c, G.T, inset).map(([x, y]) => r.w(x + G.OFF, y + G.OFF, 0)); px.blend(g, a, 'normal', () => px.poly(g, pts, col)); });
    const outline = (c, col, inset = 1, wdt = 1) => r.decal(g => { const pts = G.hex.corners(c, G.T, inset).map(([x, y]) => r.w(x + G.OFF, y + G.OFF, 0)); for (let i = 0; i < 6; i++) px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % 6][0], pts[(i + 1) % 6][1], col, wdt); });
    if (deco.danger) for (const c of deco.danger) poly(c, '#ff2030', .22);
    if (deco.reach) for (const c of deco.reach) poly(c, '#3a9aff', .42);
    if (deco.targets) for (const c of deco.targets) poly(c, '#ff3a4a', .38);
    if (deco.area) for (const c of deco.area) poly(c, '#ffd040', .55);
    if (deco.path) for (let i = 1; i < deco.path.length; i++) { const a = G.hexWorld(deco.path[i - 1]), b = G.hexWorld(deco.path[i]); r.decal(g => { const p = r.w(a[0], a[1], 0), q = r.w(b[0], b[1], 0); px.line(g, p[0], p[1], q[0], q[1], '#ffffff', 2); }); }
    if (this.hl) { this.hl.t += 1 / 60; if (this.hl.t < .6) for (const c of this.hl.cells) poly(c, '#ffe0a0', .35 * (1 - this.hl.t / .6)); else this.hl = null; }
    // ward rings: each knight's Ward, the active troop's filled
    for (const k of S.units) if (k.kind === 'knight' && !k.out && (deco.wards || (this.activeTroop === k.troop && deco.activeWard !== false))) {
      const col = S.spec.mode === 'shrine' ? G.SEAT_COLORS[k.side] : k.side === 0 ? '#5ab0ff' : '#ff6a5a';
      if (this.activeTroop === k.troop) r.decal(g => { const [x, y] = G.hexWorld([k.cx, k.cy]), n = 40, pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push(r.w(x + Math.cos(a) * (k.ward + .5) * G.T, y + Math.sin(a) * (k.ward + .5) * G.T * .95, 0)); } for (let i = 0; i < n; i += 2) px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % n][0], pts[(i + 1) % n][1], col, 1); });
    }
    if (this.hand) { this.hand.t += 1 / 60; if (this.hand.t < 1.2) for (const c of this.hand.line) poly(c, '#d8c070', .5 * (1 - this.hand.t / 1.2)); }
    if (S.spec.mode === 'sanctum' && !S.wheelTurned) { const d = (S.bell + 1) % 6, line = []; let p = S.keeps[0]; for (let i = 0; i < 12; i++) { p = G.hex.neighbor(p, d); if (!this.sim.inside(p) || this.sim.code(p) === '#') break; line.push(p); } for (const c of line) poly(c, '#d8c070', .14 + Math.sin(G.game.real * 4) * .05); }
    if (G.dev.showCoords) r.overlay(g => { for (let i = 0; i < S.cells.length; i++) { const c = [i % S.w, Math.floor(i / S.w)], [x, y] = G.hexWorld(c), [sx, sy] = r.w(x, y, 0); E.font.text(g, c[0] + ',' + c[1], Math.round(sx), Math.round(sy) - 2, '#ffffff', { align: 'center', font: 'tiny', outline: '#000' }); } });
    if (deco.cursor) { const k = .5 + .5 * Math.sin(G.game.real * 7); outline(deco.cursor, k > .5 ? '#ffffff' : '#ffe070', 1, 2); }
    if (deco.others) for (const [c, col] of deco.others) outline(c, col, 2, 1);
    this.field.drawProps(r);
    // units
    for (const p of this.u) {
      const su = S.units[p.id]; if (p.alpha <= 0.01) continue;
      r.shadow(p.x, p.y, su.size === 'L' ? 9 : su.size === 'S' ? 4 : 6, .4 * p.alpha);
      r.actor(p.x, p.y, p.z, (g, ox, oy) => p.vis.draw(g, ox, oy, r.view), { alpha: p.alpha, flash: p.hurt > .15 ? '#ffffff' : null, xray: !su.out, pick: su });
    }
    // projectiles
    for (const pr of this.proj) {
      const k = pr.t, z = lerp(pr.a[2], pr.b[2], k) + Math.sin(k * Math.PI) * (pr.kind === 'arrow' ? 16 : 6), x = lerp(pr.a[0], pr.b[0], k), y = lerp(pr.a[1], pr.b[1], k);
      if (pr.kind === 'arrow') { const dx = pr.b[0] - pr.a[0], dy = pr.b[1] - pr.a[1]; r.actor(x, y, z, (g, ox, oy) => { const [p2, q2] = r.view.p(dx, dy, 0), l = Math.hypot(p2, q2) || 1; px.line(g, ox - p2 / l * 4, oy - q2 / l * 4, ox + p2 / l * 3, oy + q2 / l * 3, '#e8dcc0'); px.dot(g, ox + p2 / l * 3, oy + q2 / l * 3, '#ffffff'); }); }
      else r.queue(x, y, z, g => { const [sx, sy] = r.w(x, y, z); px.disc(g, sx, sy, 3, pr.c); px.disc(g, sx, sy, 1.5, '#ffffff'); }, { emissive: true });
    }
    for (const c of this.chains) { const a = c.a, b = c.b; r.queue((a.x + b.x) / 2, (a.y + b.y) / 2, 10, g => { const p = r.w(a.x, a.y, 14), q = r.w(b.x, b.y, 10), n = 10; for (let i = 0; i < n; i++) { const t = i / n; if ((i + Math.floor(c.t * 20)) % 2) px.disc(g, lerp(p[0], q[0], t), lerp(p[1], q[1], t), 1.5, '#ffe8a0'); } }, { emissive: true }); }
    // pennants, HP bars and status icons
    r.overlay(g => {
      for (const p of this.u) {
        const su = S.units[p.id]; if (su.out || p.alpha < .5) continue;
        const [sx, sy] = r.w(p.x, p.y, (p.vis.height || 24) + 6);
        if (su.kind === 'knight') { const realm = S.sides[su.side].realm; G.art.banner(g, realm, Math.round(sx) + 3, Math.round(sy) - 16, .8, S.spec.mode === 'shrine' ? G.SEAT_COLORS[su.side] : null); }
        else { px.rect(g, Math.round(sx) - 1, Math.round(sy) - 3, 3, 3, '#140c14'); px.dot(g, Math.round(sx), Math.round(sy) - 2, S.spec.mode === 'shrine' ? G.SEAT_COLORS[su.side] : su.side === 0 ? '#5ab0ff' : '#ff6a5a'); }
        const show = su.hp < su.mhp || (deco.cursor && G.hex.same(deco.cursor, [su.cx, su.cy])) || this.activeTroop === su.troop;
        if (show) { const w = 12, x = Math.round(sx) - 6, y = Math.round(sy) + 1; px.rect(g, x - 1, y - 1, w + 2, 4, '#140c14'); px.rect(g, x, y, Math.max(1, Math.round(w * su.hp / su.mhp)), 2, su.hp > su.mhp * .3 ? (su.side === 0 ? '#5ad86a' : '#ff8a4a') : '#ff3a3a'); }
        let ix = Math.round(sx) - 8; for (const ef of Object.keys(su.eff).slice(0, 3)) { G.art.effectIcon(g, ef, ix, Math.round(sy) - 8); ix += 8; }
      }
      for (const t of this.texts) { const [sx, sy] = r.w(t.x, t.y, t.z + t.t * 14); E.font.text(g, t.s, Math.round(sx), Math.round(sy), t.c, { align: 'center', outline: '#140c14', scale: t.scale }); }
      if (this.banner) { const b = this.banner, a = b.t < .15 ? b.t / .15 : b.t > b.life - .25 ? Math.max(0, (b.life - b.t) / .25) : 1; px.blend(g, a * .7, 'normal', () => px.rect(g, 0, r.H / 2 - 30, r.W, 22, '#0a0816')); if (a > .3) E.font.title(g, b.s, r.W / 2, r.H / 2 - 27, { align: 'center', scale: 2, colors: ['#ffffff', b.c, E.mix(b.c, '#000000', .4)] }); }
    });
  }
  // the hex under a screen point (mouse), or null
  hexAt(sx, sy) { const p = G.game.mouseGround && G.game.mouseGround(); if (!p) return null; const c = G.worldHex(p[0], p[1]); return this.sim.inside(c) ? c : null; }
  // the neighbour whose on-screen direction is nearest the input's
  step(c, mx, my) {
    const v = G.game.view, d = v.screenDirToGround(mx, my), from = G.hexWorld(c); let best = null, bd = -2;
    G.hex.neighbors(c).forEach((n, i) => { if (!this.sim.inside(n)) return; const to = G.hexWorld(n), dx = to[0] - from[0], dy = to[1] - from[1], l = Math.hypot(dx, dy), dot = (dx * d[0] + dy * d[1]) / l + i * 1e-4; if (dot > bd) { bd = dot; best = n; } });
    return bd > .3 ? best : c;
  }
}
G.BattleView = BattleView;

// ---- 62-scene-battle.js ----
/* ---- THE BATTLE SCENE: the player's commands (cursor, command list, submenus, targets with a forecast), AI turns,
 * Delegate, the HUD (bell clock, season badge, order, unit cards), tutorial tips, rival lines, results ---- */
G.quickBattleSpec = (map, season) => {   // deep links, dev and the gallery: a stock battle on any map and season
  if (map === 'clockwork_sanctum') { const c = G.CampaignSim.create({ humans: ['hoarfast'], seed: 9 }), k = ['mordrain', 'ragnell', 'nimue']; for (const id of k) { const r = c.kn(id); while (r.lvl < 12) G.levelUpKnight(r, c.state.rng); } const sp = c.battleSpec({ march: { realm: 'hoarfast', target: 'sanctum', knights: k, from: {} }, kind: 'sanctum' }, 1234); sp.season = season; return sp; }
  const kn = (id, lvl) => Object.assign(G.makeKnightRec(id, lvl), { equip: {} }), mo = (sp, lvl, tier = 1) => ({ uid: sp + lvl + Math.random().toString(36).slice(2, 6), sp, tier, lvl, exp: 0 });
  return { map, season, seed: 1234, mode: map === 'clockwork_sanctum' ? 'sanctum' : map === 'wheel_shrine' ? 'shrine' : 'siege', region: { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' }[season], sides: [
    { realm: 'verdance', human: true, troops: [{ knight: kn('gareth', 8), monsters: [mo('unicorn', 6), mo('pixie', 6), mo('sproutling', 6)] }, { knight: kn('lynette', 8), monsters: [mo('treant', 6), mo('sproutling', 5)] }, { knight: kn('wren', 7), monsters: [mo('unicorn', 5), mo('pixie', 5)] }], items: ['herb', 'herb', 'remedy'] },
    { realm: 'hoarfast', ai: 'normal', troops: [{ knight: kn('mordrain', 8), monsters: [mo('frostwyrm', 5), mo('snowkit', 6)] }, { knight: kn('ragnell', 8), monsters: [mo('frostwolf', 6), mo('icegolem', 5)] }, { knight: kn('safir', 7), monsters: [mo('frostwolf', 5), mo('snowkit', 5)] }] }] };
};
G.tutorialSpec = realm => {
  const kn = id => Object.assign(G.makeKnightRec(id), { equip: {} }), r = G.run && G.run.sim;
  const troop = id => { if (r && r.kn(id)) return r.troopSpec(id); const d = G.get('knight', id); return { knight: kn(id), monsters: d.troop.map(([sp, lvl], i) => ({ uid: 't' + i + id, sp, tier: 1, lvl })) }; };
  return { map: 'border_meadow', season: 'spring', seed: 99, mode: 'siege', region: G.get('realm', realm).season, tutorial: true, sides: [
    { realm, human: true, troops: [troop(G.RULERS[realm]), troop(G.SQUIRE[realm])] },
    { realm: 'brigands', ai: 'easy', troops: [{ knight: Object.assign(G.makeKnightRec('sergeant', 3), { equip: {} }), monsters: [{ uid: 'ts1', sp: 'slime', tier: 1, lvl: 2 }, { uid: 'ts2', sp: 'bat', tier: 1, lvl: 3 }, { uid: 'ts3', sp: 'bat', tier: 1, lvl: 2 }, { uid: 'ts4', sp: 'skeleton', tier: 1, lvl: 3 }] }] }] };
};
const TIPS = [
  ['choose', 'Choose a unit of the lit troop: move the cursor onto it and press {confirm}.'],
  ['move', 'Blue hexes show where it can walk. Pick one and press {confirm}. {cancel} takes the move back before acting.'],
  ['attack', 'Red hexes are targets. The forecast shows hit chance and damage; ↑ means a strong element, ↓ a weak one.'],
  ['ward', "The dashed ring is your knight's Ward. A monster outside it fights weaker and is easier to capture."],
  ['spell', 'Spells need planted feet: cast them before moving that unit.'],
  ['season', 'The badge at the top left shows the season. Spring units hit harder in Spring: the Seasonal Tide.'],
  ['surround', 'Every ally standing beside a foe adds damage and accuracy. Surround them!'],
  ['captain', 'Fell the enemy knight: its whole troop leaves the field, and monsters near your knights may be captured.'],
  ['bells', 'A battle lasts twelve bells. An attacker must rout the foe, or end the last bell with a knight on the Keep.']];
G.scenes.battle = {
  view: 'board', views: ['board', 'iso'], res: 'ps1', pausable: true, touch: [], camera: { zoom: [.7, 2], start: 1.15, tall: 1.4, rotate: true }, input: G.INPUT,
  enter(req) {
    req = req || G.battleReq || { spec: G.quickBattleSpec('river_ford', 'spring'), back: 'title' };
    this.req = req; const sim = req.sim || G.BattleSim.create(req.spec);
    this.sim = sim; this.net = req.hub ? G.net : null; this.waitNet = 0; sim.state.dev = { god: G.dev.god, oneHit: G.dev.oneHit, infMP: G.dev.infMP, lucid: G.run && G.run.sim && G.run.sim.state.flags.w_lucid };
    this.view = new G.BattleView(sim, { onTension: () => { try { G.game.audio.layer('tension', 1, 1); } catch (e) { /* no music */ } } });
    G.battle = this; this.mode = 'busy'; this.cursor = this.firstCursor(); this.sel = null; this.menu = null; this.sub = null; this.pending = null; this.over = null; this.results = null; this.troopMenu = null;
    this.confirm = new G.ui.Confirm(); this.tips = {}; this.tip = null; this.delegated = new Set(); this.allAuto = !!req.auto; this.holdEnd = 0; this.ptr = null; this.danger = false; this.tutorial = !!(req.spec && req.spec.tutorial);
    const S = sim.state, humanSides = S.sides.filter(s => s.human).map(s => s.id);
    this.playerSide = this.net ? (this.net.mySide >= 0 ? this.net.mySide : null) : humanSides.length ? humanSides[0] : null;
    G.game.setView(G.settings.battleView === 'Isometric' ? 'iso' : 'board');
    const sanctum = S.spec.mode === 'sanctum', hour = G.get('map', S.spec.map).hour;
    G.music(sanctum ? 'boss' : hour ? 'hourless' : S.spec.mode === 'siege' && this.playerSide === S.spec.defender ? 'battle_defend' : 'battle_attack', { fade: .4 });
    const wx = { spring: { kind: 'rain', amount: .35 }, summer: { kind: 'sand', amount: .1 }, autumn: { kind: 'leaves', amount: .5, wind: .4 }, winter: { kind: 'snow', amount: .6 } }[S.season];
    G.game.weather = hour || !G.dev.weather ? null : wx && Object.assign({}, wx, { amount: wx.amount * (G.game.settings.reduceMotion ? .5 : 1) });
    this.view.play(this.introEvents()); this.rival = this.net ? [] : this.rivalLines(); this.turnT = 0; this.turnOf = null; this.z0 = null; this.talk = new E.Dialog(G.game, { voice: (ch) => G.voice.letter(this.talkVoice, ch) });
    if (this.rival.length) this.nextRival();
    if (req.buffs) for (const [kid, eff] of req.buffs) { const u = S.units.find(x => x.ref === kid); if (u) u.eff[eff] = eff === 'valor' ? 1 : 2; }
    G.game.input.consumeAll();
  },
  // a command: applied here, or sent to the hub's host (whose events come back to animate)
  exec(cmd) { if (this.net) { this.waitNet = this.net.isHost ? 0 : 3; const ev = this.net.send(cmd) || []; if (ev.length && ev[0].type === 'illegal') { this.waitNet = 0; G.ui.toast(ev[0].why, 1.2); } return ev; } const ev = this.sim.apply(cmd); this.view.play(ev); return ev; },
  introEvents() { const S = this.sim.state; return [{ type: 'season', season: S.season }]; },
  rivalLines() {
    const S = this.sim.state, on = si => S.units.filter(u => u.kind === 'knight' && u.side === si).map(u => u.ref), a = on(0), b = on(1), out = [];
    if (S.spec.mode === 'sanctum') return [['graynight', G.RIVALS[G.RIVALS.length - 1][2]]];
    for (const [p, q, l1, l2] of G.RIVALS) {
      const pa = a.includes(p) ? 0 : b.includes(p) ? 1 : -1; if (pa < 0) continue;
      const other = pa === 0 ? b : a;
      if (q === '*' ? other.length : other.includes(q)) { out.push([p, l1]); if (l2) out.push([q === '*' ? (p === 'tic' ? 'tac' : p) : q, l2]); break; }
    }
    return out;
  },
  nextRival() { const [who, line] = this.rival.shift(); const d = G.get('knight', who); this.talkVoice = G.voice.profile(who); const pv = this.view.u.find(p => this.sim.state.units[p.id].ref === who); this.talk.say([line], { name: d.short.toUpperCase(), portrait: pv && pv.vis.mode === 'hum' ? pv.vis.rig : undefined, onDone: () => { if (this.rival.length) this.nextRival(); } }); },
  firstCursor() { const S = this.sim.state, u = S.units.find(x => !x.out && (this.playerSide === null || x.side === this.playerSide)) || S.units[0]; return [u.cx, u.cy]; },
  exit() { G.game.weather = null; G.battle = null; try { G.game.audio.layer('tension', 0, .1); } catch (e) { /* no music */ } },
  humanTurn() { if (this.net) return this.net.myTurn(); const tr = this.sim.active; if (!tr || this.allAuto || G.autoplay || this.delegated.has(tr.id)) return false; return this.sim.state.sides[tr.side].human; },
  showTip(id) { if (!this.tutorial || this.tips[id] || G.settings.tips === 'Off') return; this.tips[id] = true; const t = TIPS.find(x => x[0] === id); if (t) this.tip = { id, text: t[1], t: 0 }; },
  back() { if (['move', 'target', 'sub', 'troop', 'menu'].includes(this.mode)) { this.cancel(); return true; } return false; },
  update(dt) {
    const I = G.game.input, S = this.sim.state, V = this.view;
    G.ui.drawDt = dt;
    if (G.dev.open) { G.devUpdate(dt); V.update(dt); return; }
    if (this.talk.open) { this.talk.update(dt); V.update(dt); this.cam(dt); return; }
    if (this.confirm.update(dt)) { V.update(dt); return; }
    if (I.down('create')) { I.suppress('pause'); }
    if (this.waitNet > 0) { this.waitNet -= dt; if (this.waitNet <= 0 && this.mode === 'anim') this.mode = 'busy'; }
    if (this.net && this.cursor) this.net.cursorCell = this.cursor;
    V.speed = (I.down('confirm') && !this.humanTurn()) ? 4 : 1;
    V.update(dt); this.cam(dt);
    if (this.tip) this.tip.t += dt;
    // the hot-seat turn timer: two or more human sides on this device; out of time, the troop is delegated
    const hs = S.sides.filter(x => x.human).length >= 2 && !this.net, lim = { '60 s': 60, '30 s': 30 }[G.settings.hotseatTimer];
    if (hs && lim && this.humanTurn()) { const id = this.sim.active.id; if (this.turnOf !== id) { this.turnOf = id; this.turnT = lim; } this.turnT -= dt; if (this.turnT <= 0) { this.delegated.add(id); G.ui.toast('Out of time: the troop is delegated.', 2); this.mode = 'busy'; } } else if (!hs || !lim) this.turnT = 0;
    // the dynamic camera leans in for spells and strong blows
    if (V.zoomKick > 0) { if (this.z0 === null) { this.z0 = G.game.zoom; G.game.setZoom(Math.min(2, this.z0 * 1.2)); } V.zoomKick -= dt; if (V.zoomKick <= 0) { G.game.setZoom(this.z0); this.z0 = null; } }
    if (I.pressed('view')) { G.game.nextView(); G.game.note(G.game.view.label.toUpperCase() + ' VIEW'); }
    if (I.pressed('turnL') || I.pressed('turnR')) { G.game.rotateView(I.pressed('turnL') ? -60 : 60); G.sfx('ui_move'); }
    if (I.pressed('zoomIn')) G.game.zoomBy && G.game.zoomBy(1.15); if (I.pressed('zoomOut')) G.game.zoomBy && G.game.zoomBy(1 / 1.15);
    if (I.pressed('danger')) { this.danger = !this.danger; G.sfx('ui_move'); }
    if (I.pressed('help')) { G.game.go('help', { back: 'battle', keep: true }); return; }
    if (this.results) { this.updateResults(dt); return; }
    if (S.over && !V.busy) { this.finish(); return; }
    if (V.busy) { this.mode = this.humanTurn() ? this.mode : 'busy'; if (this.mode !== 'anim') return; return; }
    if (S.over) return;
    if (this.net && !this.net.started()) return;
    if (!this.humanTurn()) { if (this.net) { this.mode = 'busy'; return; } this.mode = 'ai'; V.play(G.BattleAI.step(this.sim, { diff: S.sides[this.sim.active.side].ai })); return; }
    if (this.mode === 'anim') return;
    if (this.mode === 'busy' || this.mode === 'ai') this.startHuman();
    this.playerInput(dt);
  },
  cam(dt) { const V = this.view; if (this.humanTurn() && this.cursor && !V.busy && !this.mouseCur) V.focusOn(...G.hexWorld(this.cursor)); G.game.focus(V.look[0], V.look[1], 0); },
  startHuman() {
    const tr = this.sim.active, S = this.sim.state, units = [tr.knight, ...tr.units].map(i => S.units[i]).filter(u => !u.out && !u.acted);
    this.mode = 'select'; this.sel = null; this.menu = null;
    const first = units.find(u => u.kind === 'monster') || units[0]; if (first) this.cursor = [first.cx, first.cy];
    this.showTip('choose'); if (S.bell === 1) this.showTip('season'); if (S.bell === 3) this.showTip('bells');
  },
  unitsLeft() { const tr = this.sim.active, S = this.sim.state; return tr ? [tr.knight, ...tr.units].map(i => S.units[i]).filter(u => !u.out && !u.acted) : []; },
  playerInput(dt) {
    const I = G.game.input, S = this.sim.state, V = this.view;
    // the cursor: d-pad / stick by screen direction, the mouse hovers, clicks confirm
    if (['select', 'move', 'target'].includes(this.mode)) {
      const t = (I.repeat('right', .22, .09) ? 1 : 0) - (I.repeat('left', .22, .09) ? 1 : 0), u = (I.repeat('down', .22, .09) ? 1 : 0) - (I.repeat('up', .22, .09) ? 1 : 0);
      if (t || u) { this.mouseCur = false; const n = V.step(this.cursor, t, u); if (!G.hex.same(n, this.cursor)) { this.cursor = n; G.sfx('ui_move', { vol: .5 }); this.onCursor(); } }
      const p = I.pointer(); if (p && (!this.ptr || p[0] !== this.ptr[0] || p[1] !== this.ptr[1]) && !(this.menuList && this.menuList.hit(p))) { const h = V.hexAt(p[0], p[1]); if (h && !G.hex.same(h, this.cursor)) { this.cursor = h; this.mouseCur = true; this.onCursor(); } } this.ptr = p;
      const c = I.clicked(); if (c && !(this.menuList && this.menuList.hit(c))) { const h = V.hexAt(c[0], c[1]); if (h) { this.cursor = h; this.mouseCur = true; this.confirmAt(h); return; } }
      if (I.pressed('confirm')) { this.confirmAt(this.cursor); return; }
      if (I.pressed('cancel')) { this.cancel(); return; }
      if (I.pressed('prev') || I.pressed('next')) { const left = this.unitsLeft(); if (left.length) { const k = left.findIndex(x => G.hex.same([x.cx, x.cy], this.cursor)); const n = left[(k + (I.pressed('next') ? 1 : -1) + left.length) % left.length]; this.cursor = [n.cx, n.cy]; G.sfx('ui_move'); } }
      if (I.pressed('info')) { this.info = this.sim.unitAt(this.cursor); }
      if (this.mode === 'select') {
        if (I.down('command')) { this.holdEnd += dt; if (this.holdEnd > .6) { this.holdEnd = -99; this.endTroop(); return; } } else { if (this.holdEnd > 0 && this.holdEnd < .6) this.openTroopMenu(); this.holdEnd = 0; }
      }
      return;
    }
    if (this.mode === 'menu' || this.mode === 'sub' || this.mode === 'troop') {
      const r = this.menuList.update(dt);
      if (r === 'pick') this.pickMenu(this.menuList.cur); else if (r === 'back') this.cancel();
      else { const p = I.pointer(); this.ptr = p; }
      if (I.pressed('command') && this.mode !== 'troop') this.openTroopMenu();
    }
  },
  onCursor() { if (this.mode === 'target' && this.pending) { /* the forecast follows the cursor */ } },
  confirmAt(c) {
    if (this.sel) this.sel = this.sim.state.units[this.sel.id];
    const S = this.sim.state, tr = this.sim.active, u = this.sim.unitAt(c);
    if (this.mode === 'select') {
      if (u && u.troop === tr.id && !u.acted) { this.sel = u; this.openMenu(); G.sfx('ui_confirm'); }
      else { this.info = u; G.sfx(u ? 'ui_move' : 'ui_error'); }
      return;
    }
    if (this.mode === 'move') {
      if (!this.reach.has(G.hex.key(c))) { G.sfx('ui_error'); return; }
      if (G.hex.same(c, [this.sel.cx, this.sel.cy])) { this.openMenu(); return; }
      this.exec({ t: 'move', u: this.sel.id, to: c }); this.mode = 'anim'; this.afterAnim = () => this.openMenu(); this.showTip('attack'); this.showTip('ward'); return;
    }
    if (this.mode === 'target') {
      const p = this.pending, cmd = { t: 'act', u: this.sel.id, a: p.a, skill: p.skill, item: p.item, target: c };
      const lg = this.sim.legal(cmd); if (!lg.ok) { G.sfx('ui_error'); G.ui.toast(lg.why, 1.2); return; }
      const ev = this.exec(cmd); this.mode = 'anim'; this.afterAnim = () => this.afterAct(); this.showTip('surround');
      if (ev.some(e => e.type === 'knightDown')) this.showTip('captain');
    }
  },
  afterAct() { if (this.sim.state.over) return; const tr = this.sim.active; if (tr && this.humanTurn()) this.startHuman(); },
  cancel() {
    G.sfx('ui_cancel');
    if (this.mode === 'move' || this.mode === 'target') { this.openMenu(); return; }
    if (this.mode === 'sub') { this.openMenu(); return; }
    if (this.mode === 'troop') { this.mode = 'select'; this.menuList = null; return; }
    if (this.mode === 'menu') { if (this.sel && this.sel.moved && !this.sel.acted && this.sel.from) { this.exec({ t: 'undo', u: this.sel.id }); this.cursor = [this.sel.cx, this.sel.cy]; } this.mode = 'select'; this.menuList = null; return; }
    if (this.mode === 'select') { if (this.info) { this.info = null; return; } G.game.pause(); }
  },
  openMenu() {
    if (this.sel) this.sel = this.sim.state.units[this.sel.id];
    const u = this.sel, sim = this.sim, items = [];
    const sk = u.skills.map(id => G.get('skill', id)).filter(s => s.kind !== 'passive');
    items.push({ label: 'Move', id: 'move', disabled: u.moved, why: 'Already moved' });
    const at = sim.targets(u, 'attack'); items.push({ label: 'Attack', id: 'attack', disabled: !at.length, why: 'No foe in range' });
    const sp = sk.filter(s => s.kind === 'special'), sl = sk.filter(s => s.kind === 'spell');
    if (sp.length) items.push({ label: 'Special ▸', id: 'special', right: sp.length + '' });
    if (sl.length) items.push({ label: 'Spell ▸', id: 'spell', right: sl.length + '', disabled: u.moved, why: 'Spells need planted feet' });
    if (u.kind === 'knight') { const its = this.sim.state.sides[u.side].items; items.push({ label: 'Item ▸', id: 'item', disabled: !its.some(i => !G.get('item', i).musterOnly), why: 'No items' }); }
    items.push({ label: 'Guard', id: 'guard' }, { label: 'Wait', id: 'wait' });
    if (u.kind === 'knight' && this.sim.state.spec.mode !== 'shrine') items.push({ label: 'Retreat', id: 'retreat', color: '#ffb0a0' });
    this.menuList = new G.ui.List(items); this.menuList.i = items.findIndex(x => !x.disabled); this.mode = 'menu'; this.cursor = [u.cx, u.cy];
    if (sl.length && !u.moved) this.showTip('spell');
  },
  pickMenu(it) {
    const u = this.sel;
    if (this.mode === 'troop') {
      if (it.id === 'end') { this.mode = 'select'; this.endTroop(); }
      else if (it.id === 'delegate') { this.delegated.add(this.sim.active.id); this.mode = 'busy'; }
      else if (it.id === 'all') { this.allAuto = true; this.mode = 'busy'; }
      else if (it.id === 'danger') { this.danger = !this.danger; this.mode = 'select'; }
      return;
    }
    if (this.mode === 'sub') { if (it.item) this.beginTarget({ a: 'item', item: it.item }); else this.beginTarget({ a: 'skill', skill: it.id }); return; }
    switch (it.id) {
      case 'move': this.reach = this.sim.reach(u); this.mode = 'move'; G.game.input.consumeAll(); this.showTip('move'); break;
      case 'attack': this.beginTarget({ a: 'attack' }); break;
      case 'special': case 'spell': { const list = u.skills.map(id => G.get('skill', id)).filter(s => s.kind === it.id).map(s => { const ok = this.sim.skillUsable(u, s.id); return { label: s.name, id: s.id, right: s.mp + ' MP', disabled: !ok.ok, why: ok.why, desc: s.desc }; }); this.menuList = new G.ui.List(list); this.mode = 'sub'; break; }
      case 'item': { const its = this.sim.state.sides[u.side].items.filter(i => !G.get('item', i).musterOnly), seen = {}, list = []; for (const i of its) { if (seen[i]) { seen[i].n++; seen[i].right = '×' + seen[i].n; continue; } seen[i] = { label: G.get('item', i).name, item: i, n: 1, right: '×1', desc: G.get('item', i).desc }; list.push(seen[i]); } this.menuList = new G.ui.List(list); this.mode = 'sub'; break; }
      case 'guard': case 'wait': this.exec({ t: 'act', u: u.id, a: it.id, target: [u.cx, u.cy] }); this.mode = 'anim'; this.afterAnim = () => this.afterAct(); break;
      case 'retreat': this.confirm.ask((u.ruler ? 'A ruler\'s retreat loses the battle. ' : '') + 'Retreat ' + u.name + "'s troop?", () => { this.exec({ t: 'act', u: u.id, a: 'retreat', target: [u.cx, u.cy] }); this.mode = 'anim'; this.afterAnim = () => this.afterAct(); }, { focusNo: true }); break;
    }
  },
  beginTarget(p) {
    const u = this.sel, ts = this.sim.targets(u, p.a, p.a === 'item' ? null : p.skill);
    if (!ts.length) { G.sfx('ui_error'); G.ui.toast('No target in range', 1.2); return; }
    this.pending = p; this.targetCells = ts; this.mode = 'target';
    const sk = p.skill ? G.get('skill', p.skill) : null, pref = ts.find(c => { const o = this.sim.unitAt(c); return o && (sk && (sk.who === 'allies' || sk.who === 'ownMon') ? o.side === u.side : o.side !== u.side); });
    this.cursor = pref || ts[0]; G.game.input.consumeAll();
  },
  openTroopMenu() { const list = [{ label: 'End troop turn', id: 'end' }, { label: 'Delegate this troop', id: 'delegate' }, { label: 'Delegate the battle', id: 'all' }, { label: this.danger ? 'Hide danger view' : 'Danger view', id: 'danger' }]; this.menuList = new G.ui.List(list); this.mode = 'troop'; G.sfx('ui_open'); },
  endTroop() { const go = () => { this.exec({ t: 'end' }); this.mode = 'anim'; this.afterAnim = null; }; if (G.settings.confirmEnd === 'On' && this.unitsLeft().length) this.confirm.ask('End this troop\'s turn? Units that have not acted will wait.', go); else go(); },
  // the battle is over: results, then back to whoever asked
  finish() {
    if (this.results) return;
    const S = this.sim.state, res = this.sim.results(), ps = this.playerSide === null ? 0 : this.playerSide, won = res.winner === ps;
    G.sting(won ? 'victory' : 'defeat'); G.music(null);
    try { G.game.audio.stopMusic(.5); } catch (e) { /* no music */ }
    const units = S.units.filter(u => u.side === ps && u.ref && !String(u.ref).startsWith('second'));
    this.results = { won, res, page: 0, t: 0, units, caps: S.captures.filter(c => c.side === ps).map(c => S.units[c.u].name), lost: S.units.filter(u => u.side === ps && (u.out === 'dead' || u.out === 'captured')).map(u => u.name), why: S.over.why };
    if (this.req.shrine) this.results.glory = S.sides.map(s => s.glory);
  },
  updateResults(dt) {
    const R = this.results, I = G.game.input; R.t += dt; if (R.t < .8) return;
    if (I.pressed('confirm') || I.clicked() || (G.autoplay && R.t > 1.2) || (this.req.auto && R.t > 1.2)) {
      const pages = Math.ceil(R.units.length / 6); if (R.page < pages - 1) { R.page++; R.t = .5; G.sfx('ui_confirm'); return; }
      if (this.net) return;
      G.sfx('ui_confirm'); const done = this.req.onDone, back = this.req.back || 'title';
      if (done) done(R.res, this.sim); else G.game.go(back);
    }
  },
  draw(r) {
    const V = this.view, S = this.sim.state, deco = { cursor: this.humanTurn() && !V.busy ? this.cursor : null };
    if (this.mode === 'move' && this.reach) { deco.reach = [...this.reach.values()].map(v => v.c); if (this.reach.has(G.hex.key(this.cursor))) deco.path = this.sim.pathTo(this.sel, this.cursor, this.reach); }
    if (this.mode === 'target' && this.targetCells) { deco.targets = this.targetCells; if (this.targetCells.some(c => G.hex.same(c, this.cursor))) deco.area = this.pending.a === 'skill' ? this.sim.area(this.sel, G.get('skill', this.pending.skill), this.cursor) : [this.cursor]; }
    if (this.danger || G.dev.showDanger) { const tr = this.sim.active; if (tr) { const foes = S.units.filter(u => !u.out && u.side !== tr.side), cells = new Set(); for (const f of foes) for (const c of G.hex.within([f.cx, f.cy], this.sim.effMov(f) + f.basic.range[1])) if (this.sim.inside(c)) cells.add(G.hex.key(c)); deco.danger = [...cells].map(k => k.split(',').map(Number)); } }
    deco.wards = G.dev.showWards;
    if (G.hubView) deco.others = G.hubView.cursors();
    V.draw(r, deco);
    if (G.dev.hud !== false) this.hud(r);
    if (this.talk.open) this.talk.draw(r);
    this.confirm.draw(r);
    if (this.results) this.drawResults(r);
    G.ui.drawToasts(r, G.ui.drawDt || 1 / 60);
    if (G.dev.open) G.devDraw(r);
  },
  hud(r) {
    const S = this.sim.state, tr = this.sim.active, W = r.W, H = r.H;
    r.overlay(g => {
      // the bell clock and the season badge (top left)
      G.ui.panel(g, 4, 4, 110, 34, null);
      const cx = 20, cy = 21; px.disc(g, cx, cy, 12, '#140c14'); px.disc(g, cx, cy, 11, '#e8e0c8'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; px.dot(g, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, i < S.bell ? '#c83a2a' : '#5a5040'); }
      const ha = (S.bell / S.bells) * Math.PI * 2 - Math.PI / 2; px.line(g, cx, cy, cx + Math.cos(ha) * 8, cy + Math.sin(ha) * 8, '#2a2010', 1);
      G.ui.text(g, 'BELL ' + S.bell + '/' + S.bells, 36, 8, S.bell >= S.bells - 2 ? '#ff8a6a' : '#ffe8a8');
      G.art.seasonIcon(g, S.season, 40, 26, 3); G.ui.text(g, G.SEASON_NAME[S.season] + ' Tide', 48, 22, G.SEASON_COLOR[S.season]);
      // the order (top centre)
      const ord = S.order.filter(id => !S.troops[id].gone); let ox = Math.round(W / 2 - ord.length * 13);
      for (const id of ord) { const t = S.troops[id], k = S.units[t.knight], act = tr && tr.id === id; if (act) px.rect(g, ox - 2, 2, 24, 22, '#ffe070'); G.art.banner(g, S.sides[t.side].realm, ox + 4, 5, 1.1, S.spec.mode === 'shrine' ? G.SEAT_COLORS[t.side] : null); G.ui.text(g, k.name.slice(0, 4), ox + 1, 17, act ? '#ffffff' : '#a8a0c0', { font: 'tiny' }); ox += 26; }
      if (S.spec.mode === 'sanctum') G.ui.text(g, 'DIALS ' + Object.values(S.dials).filter(Boolean).length + '/4' + (S.wheelTurned ? '  THE WHEEL TURNED' : ''), W / 2, 28, '#d8c070', { align: 'center' });
      if (S.spec.mode === 'shrine') S.sides.forEach((s, i) => G.ui.text(g, (s.name || '').slice(0, 10) + ' ' + s.glory, W - 90, 44 + i * 10, G.SEAT_COLORS[i]));
      // unit cards
      const act = this.sel && !this.sel.out && ['menu', 'sub', 'move', 'target'].includes(this.mode) ? this.sel : (tr ? S.units[tr.knight] : null);
      if (act) this.card(g, act, 4, H - 62, 'ACTIVE');
      const hov = this.info || (this.cursor && this.sim.unitAt(this.cursor));
      if (hov && hov !== act) this.card(g, hov, W - 134, H - 62, hov.side === this.playerSide ? 'ALLY' : 'FOE');
      // the command list (right) and the forecast (bottom centre)
      if (this.menuList && ['menu', 'sub', 'troop'].includes(this.mode)) {
        const n = Math.min(8, this.menuList.items.length), h = n * 13 + 22, x = W - 112, y = Math.max(44, Math.round(H / 2 - h / 2) - 10);
        G.ui.panel(g, x, y, 106, h, this.mode === 'troop' ? 'TROOP' : this.sel ? this.sel.name : '');
        this.menuList.draw(g, x + 3, y + 19, 100);
        const cur = this.menuList.cur; if (cur && cur.desc) { G.ui.panel(g, x - 120, y, 116, 34, null); G.ui.wrapText(g, cur.desc, x - 114, y + 5, 106, '#e8e4f0', 9); }
        if (this.menuList.whyLine) G.ui.text(g, this.menuList.whyLine, x + 53, y + h + 3, '#ffb0a0', { align: 'center', font: 'tiny' });
      }
      if (this.mode === 'target' && this.targetCells.some(c => G.hex.same(c, this.cursor))) {
        const fc = this.sim.forecast(this.sel, this.pending.a, this.pending.a === 'item' ? this.pending.item : this.pending.skill, this.cursor).slice(0, 3);
        if (fc.length) { const w = 250, x = Math.round(W / 2 - w / 2), y = H - 40 - fc.length * 11; G.ui.panel(g, x, y, w, 8 + fc.length * 11, null);
          fc.forEach((f, i) => { let s = f.name.toUpperCase().slice(0, 12); if (f.heal !== undefined) s += '  +' + f.heal + ' HP'; else if (f.dmg) s += '  HIT ' + f.hit + '%  ' + f.dmg[0] + '-' + f.dmg[1] + (f.elem === 'strong' ? '  ↑ STRONG' : f.elem === 'weak' ? '  ↓ WEAK' : '') + (f.crit ? '  CRIT ' + f.crit + '%' : '') + (f.ko ? '  KO' : ''); else if (f.note) s += '  ' + f.note; if (f.status) s += '  ' + f.status[0] + ' ' + f.status[1] + '%';
            G.ui.text(g, s, x + 6, y + 5 + i * 11, f.side === this.sel.side ? '#a8ffc0' : '#ffe0b0'); }); }
      }
      if (this.tip && G.settings.tips !== 'Off' && this.tip.t < 14) { const t = this.tip.text.replace('{confirm}', G.ui.keyLabel('confirm')).replace('{cancel}', G.ui.keyLabel('cancel')), w = 200, lines = E.font.wrap(t, w - 12); G.ui.panel(g, 4, 44, w, 14 + lines.length * 9, 'TIP', { border: '#5ad89a' }); lines.forEach((l, i) => G.ui.text(g, l, 10, 61 + i * 9, '#e8ffe8')); }
      if (!this.humanTurn() && tr && !S.over) G.ui.text(g, (S.sides[tr.side].name || '') + (this.delegated.has(tr.id) || this.allAuto ? ' (DELEGATED)' : '') + ' ...', W / 2, 44, '#c8c0e0', { align: 'center' });
      if (G.run && G.run.dev) G.ui.text(g, 'DEV', W - 20, 4, '#ff6a6a');
      if (this.turnT > 0) G.ui.text(g, 'TURN ' + Math.ceil(this.turnT) + 's', W / 2, 40, this.turnT < 10 ? '#ff8a6a' : '#ffe8a8', { align: 'center' });
      if (this.net) { const t = this.net.now(); if (t < 0 && t > -10000) E.font.title(g, String(Math.ceil(-t / 1000)), W / 2, H / 2 - 30, { align: 'center', scale: 4, colors: ['#ffffff', '#ffe070', '#c08030'] }); else if (t === -Infinity) G.ui.text(g, 'Waiting for the round to start...', W / 2, H / 2, '#ffe8a8', { align: 'center' });
        const tr2 = this.sim.active; if (tr2 && this.net.deadline && !S.over && t >= 0) G.ui.text(g, Math.max(0, Math.ceil((this.net.deadline - t) / 1000)) + 's' + (this.net.auto.has(tr2.side) ? ' AUTO' : ''), W / 2, 40, '#ffd8a0', { align: 'center' });
        if (this.net.ended || S.over) { G.ui.panel(g, W / 2 - 90, H / 2 - 40, 180, 30 + S.sides.length * 10, 'ROUND OVER'); [...S.sides].sort((a, b) => b.glory - a.glory).forEach((sd, i) => G.ui.text(g, (i + 1) + '. ' + sd.name + '  ' + sd.glory, W / 2 - 80, H / 2 - 20 + i * 10, G.SEAT_COLORS[sd.id])); } }
    });
    if (this.humanTurn() && !this.results) {
      const m = this.mode;
      G.ui.prompts(r, m === 'select' ? [['confirm', 'Select'], ['info', 'Info'], ['command', 'Commands (hold: end)'], ['next', 'Unit'], ['turnR', 'Turn']] : m === 'move' ? [['confirm', 'Move here'], ['cancel', 'Back']] : m === 'target' ? [['confirm', 'Confirm'], ['cancel', 'Back']] : [['confirm', 'Choose'], ['cancel', 'Back'], ['command', 'Troop']]);
    } else if (!this.results) G.ui.prompts(r, [['confirm', 'Hold: fast forward']]);
  },
  card(g, u, x, y, tag) {
    const S = this.sim.state; G.ui.panel(g, x, y, 130, 56, null, { border: u.side === 0 ? '#5a8aff' : '#ff6a5a' });
    const pv = this.view.u[u.id]; try { pv.vis.portrait(g, x + 4, y + 4, 26); } catch (e) { px.rect(g, x + 4, y + 4, 26, 26, '#1a1624'); }
    G.ui.text(g, u.name.slice(0, 12), x + 34, y + 4, '#ffffff'); G.ui.text(g, 'Lv' + u.lvl + ' ' + tag, x + 126, y + 4, '#a8a0c0', { align: 'right', font: 'tiny' });
    G.art.seasonIcon(g, u.elem, x + 38, y + 18, 2.5); G.ui.text(g, u.size + (u.kind === 'knight' ? ' KNIGHT' : '') + (this.sim.outsideWard(u) ? ' OUT OF WARD' : ''), x + 46, y + 15, this.sim.outsideWard(u) ? '#ffb070' : '#c8c0d8', { font: 'tiny' });
    const tide = this.sim.tideOf(u, true); if (tide > 1) G.ui.text(g, '↑', x + 120, y + 15, '#7ad860'); else if (tide < 1) G.ui.text(g, '↓', x + 120, y + 15, '#ff7a5a');
    G.ui.bar(g, x + 34, y + 27, 60, u.hp, u.mhp, u.hp > u.mhp * .3 ? '#5ad86a' : '#ff4a4a'); G.ui.text(g, u.hp + '/' + u.mhp, x + 98, y + 24, '#e8e0f0', { font: 'tiny' });
    if (u.mmp) { G.ui.bar(g, x + 34, y + 35, 60, u.mp, u.mmp, '#5a8aff'); G.ui.text(g, u.mp + ' MP', x + 98, y + 32, '#b0c8ff', { font: 'tiny' }); }
    G.ui.text(g, 'ATK ' + u.atk + ' DEF ' + u.def + ' INT ' + u.int + ' AGI ' + u.agi, x + 6, y + 44, '#c8c0d8', { font: 'tiny' });
    let ix = x + 8; for (const ef of Object.keys(u.eff)) { G.art.effectIcon(g, ef, ix, y + 36); ix += 9; }
  },
  drawResults(r) {
    const R = this.results, W = r.W, H = r.H, k = Math.min(1, R.t / .6);
    r.overlay(g => {
      px.blend(g, .7 * k, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      if (k < .5) return;
      E.font.title(g, R.won ? 'VICTORY' : 'DEFEAT', W / 2, 20, { align: 'center', scale: 3, colors: R.won ? ['#fff8d0', '#ffd060', '#e07a2a'] : ['#ffd0d0', '#ff5a5a', '#8a1a2a'] });
      const S = this.sim.state, place = S.spec.castle ? G.get('castle', S.spec.castle).name : G.get('map', S.spec.map).name;
      const why = { rout: 'The enemy is routed', keep: 'A knight holds the Keep', time: 'The bells ran out', graynight: 'The Gray Knight falls', thirteenth: 'The thirteenth bell tolls', glory: 'Glory decides it' }[R.why] || '';
      G.ui.text(g, place + ' • ' + why, W / 2, 50, '#ffe8a8', { align: 'center' });
      const x0 = Math.round(W / 2 - 160), rows = R.units.slice(R.page * 6, R.page * 6 + 6);
      rows.forEach((u, i) => { const y = 66 + i * 20, pv = this.view.u[u.id]; try { pv.vis.portrait(g, x0, y, 16); } catch (e) { /* no portrait */ } G.ui.text(g, u.name.slice(0, 18), x0 + 22, y + 1, u.out === 'dead' ? '#ff7a7a' : u.out === 'captured' ? '#ffb070' : '#ffffff'); G.ui.text(g, 'Lv ' + u.lvl + (u.lvls ? '  LEVEL UP!' : ''), x0 + 140, y + 1, u.lvls ? '#ffe070' : '#c8c0d8'); const f = Math.min(1, (R.t - .6) / 1.2); G.ui.bar(g, x0 + 22, y + 11, 110, u.exp * f, 100, '#ffd060'); G.ui.text(g, '+' + Math.round(u.expGain * f) + ' EXP', x0 + 140, y + 9, '#ffd060', { font: 'tiny' }); if (u.out) G.ui.text(g, u.out === 'dead' ? 'FELL' : u.out === 'captured' ? 'CAPTURED' : u.out === 'down' ? 'WOUNDED' : 'RETREATED', x0 + 230, y + 1, '#ff9a8a'); });
      let y = 66 + rows.length * 20 + 6;
      if (R.caps.length) { G.ui.text(g, 'Captured: ' + R.caps.join(', '), W / 2, y, '#ffe070', { align: 'center' }); y += 11; }
      if (R.lost.length) { G.ui.text(g, 'Lost: ' + R.lost.join(', '), W / 2, y, '#ff9a8a', { align: 'center' }); y += 11; }
      if (R.glory) R.glory.forEach((gl, i) => G.ui.text(g, S.sides[i].name + ': ' + gl + ' glory', W / 2, y + i * 10, G.SEAT_COLORS[i], { align: 'center' }));
    });
    if (R.t > .8) G.ui.prompts(r, [['confirm', R.page < Math.ceil(R.units.length / 6) - 1 ? 'Next' : 'Continue']]);
  }
};
// the animation finished: hand control back (the scene's afterAnim)
const _bu = G.scenes.battle.update;
G.scenes.battle.update = function (dt) { _bu.call(this, dt); if (this.mode === 'anim' && !this.view.busy && !(this.waitNet > 0)) { const f = this.afterAnim; this.afterAnim = null; if (this.sim.state.over) return; if (f) f(); else if (this.humanTurn()) this.startHuman(); else this.mode = 'ai'; } };

// ---- 63-scene-campaign.js ----
/* ---- THE CAMPAIGN SCENE: the world map, its HUD, the season's flow (Tidings, Muster, March, Resolution) as a queue of
 * steps that survives trips to the battle and story scenes, and every Muster panel ---- */
const CP = {};   // panel builders
const curRealm = () => { const R = G.run, S = R.sim.state, st = R.flow[0]; return st && st.realm ? st.realm : S.humans.find(h => S.realms[h].alive) || S.humans[0]; };
const KN = id => G.get('knight', id), MN = m => G.get('monster', m.sp).names[m.tier - 1];
G.flowPush = (...steps) => G.run.flow.splice(1, 0, ...steps);   // after the current step
G.flowDone = () => { G.run.flow.shift(); };
G.scenes.campaign = {
  view: 'threequarter', views: ['threequarter'], res: 'ps1', pausable: true, touch: [], input: G.INPUT, camera: { zoom: [.6, 1.6], start: .9, tall: 1.2 },
  enter(d) {
    const R = G.run; if (!R) { G.game.go('title'); return; }
    G.campaignScene = this;
    if (!R.wm || R.wm.sim !== R.sim) R.wm = new G.WorldMap(R.sim);
    this.wm = R.wm; this.kv = {}; this.panel = null; this.card = null; this.confirm = new G.ui.Confirm(); this.wipe = null; this.hold = 0;
    const cap = R.sim.capital(curRealm()) || 'meridian'; this.focus = cap; const p = G.get('castle', cap).pos; this.look = [p[0], p[1]];
    this.lastSeason = R.sim.season(); this.ptr = null; this.idleAI = 0;
    this.setAmbience();
  },
  exit() { G.game.weather = null; },
  setAmbience() { const s = G.run.sim.season(); G.music(s); const wx = { spring: { kind: 'rain', amount: .25 }, summer: null, autumn: { kind: 'leaves', amount: .4, wind: .3 }, winter: { kind: 'snow', amount: .5 } }[s]; G.game.weather = wx && G.dev.weather ? Object.assign({}, wx, { amount: wx.amount * (G.game.settings.reduceMotion ? .5 : 1) }) : null; },
  focusName() { return this.focus; }, panelName() { return this.panel ? this.panel.id : this.card ? 'card' : null; },
  back() { if (this.panel) { this.panel = null; return true; } return false; },
  update(dt) {
    const R = G.run, sim = R.sim, I = G.game.input; G.ui.drawDt = dt;
    if (G.dev.open) { G.devUpdate(dt); return; }
    if (this.confirm.update(dt)) return;
    this.wm.refresh();
    if (sim.season() !== this.lastSeason) { this.lastSeason = sim.season(); this.wipe = { t: 0 }; this.setAmbience(); }
    if (this.wipe) { this.wipe.t += dt; if (this.wipe.t > 1.5) this.wipe = null; }
    for (const id in this.kv) this.kv[id].update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
    // the camera eases toward the focused castle
    // the camera: eases to the focused castle (keys, pad), or pans by a mouse drag or the screen's edge (setting)
    const pn = I.pan && I.pan(), v = G.game.view, ptr = I.pointer();
    if (pn && (pn[0] || pn[1])) { const d = v.screenDirToGround(-pn[0], -pn[1]), l = Math.hypot(pn[0], pn[1]) / (v.scale || 1); this.look[0] += d[0] * l; this.look[1] += d[1] * l; this.mouseFocus = true; }
    if (G.settings.edgePan === 'On' && ptr && I.lastDevice === 'mouse') { const ex = ptr[0] < 10 ? -1 : ptr[0] > G.game.W - 10 ? 1 : 0, ey = ptr[1] < 10 ? -1 : ptr[1] > G.game.H - 10 ? 1 : 0; if (ex || ey) { const d = v.screenDirToGround(ex, ey); this.look[0] += d[0] * 240 * dt; this.look[1] += d[1] * 240 * dt; this.mouseFocus = true; } }
    if (!this.mouseFocus) { const fp = G.get('castle', this.focus).pos; this.look[0] = lerp(this.look[0], fp[0], Math.min(1, dt * 5)); this.look[1] = lerp(this.look[1], fp[1] + 20, Math.min(1, dt * 5)); }
    this.look[0] = clamp(this.look[0], 0, 1024); this.look[1] = clamp(this.look[1], 0, 1024); G.game.focus(this.look[0], this.look[1], 0);
    if (sim.state.over && !(R.flow[0] && R.flow[0].k === 'event')) { G.game.go('ending', { kind: sim.state.over.kind, realm: sim.state.over.realm }); return; }
    this.step(dt);
  },
  // run the head of the flow
  step(dt) {
    const R = G.run, sim = R.sim, S = sim.state, st = R.flow[0], I = G.game.input;
    if (!st) { R.flow.push({ k: 'tidings' }); return; }
    switch (st.k) {
      case 'prologue': G.flowDone(); G.game.go('event', { prologue: true, back: 'campaign' }); return;
      case 'tidings': {
        G.flowDone(); const rep = sim.beginSeason(), steps = [];
        steps.push({ k: 'card', kind: 'season', season: sim.season(), year: S.year });
        for (const q of rep) {
          if (q.kind === 'candle') steps.push({ k: 'card', kind: 'candle', n: q.n });
          if (q.kind === 'stilled') steps.push({ k: 'card', kind: 'text', title: 'STILLNESS', text: G.get('castle', q.castle).name + ' has stopped breathing. It yields no mana and its troops cannot move this season.' });
          if (q.kind === 'fallen') steps.push({ k: 'card', kind: 'text', title: 'A REALM FALLS', text: G.get('realm', q.realm).name + ' is no more.' });
          if (q.kind === 'event') steps.push({ k: 'event', id: q.id, realm: S.humans[0] || 'world', applied: true });
          if (q.kind === 'rivalWin' || q.kind === 'note' && q.text) steps.push({ k: 'card', kind: 'text', title: 'MERIDIAN', text: q.text || '' });
        }
        for (const h of S.humans) {
          if (!S.realms[h].alive) continue;
          if (S.humans.length > 1 && G.settings.privacy === 'On') steps.push({ k: 'privacy', realm: h });
          for (const q of rep) if (q.kind === 'income' && q.realm === h) steps.push({ k: 'card', kind: 'income', realm: h, q });
          for (const q of rep) if (q.kind === 'quest' && q.realm === h) { if (q.story) steps.push({ k: 'event', id: q.story, realm: h }); else steps.push({ k: 'card', kind: 'quest', q }); if (q.joined) steps.push({ k: 'event', id: q.joined, realm: h, wanderer: true }); }
          for (const id of sim.eventsFor('tidings', h)) steps.push({ k: 'event', id, realm: h });
          steps.push({ k: 'muster', realm: h });
        }
        steps.push({ k: 'marchPhase' });
        R.flow.unshift(...steps);
        if (!S.over && S.phase === 'muster' && G.game.saves && !G.hubActive) { try { G.game.saves.autosave(); } catch (e) { /* storage blocked */ } }
        return;
      }
      case 'card': case 'privacy': if (!this.card || this.card.st !== st) this.card = CP.card(st); this.card.update(dt); return;
      case 'event': {
        if (st.applied || st.wanderer) { G.flowDone(); G.game.go('event', { id: st.wanderer ? st.id : st.id, realm: st.realm, back: 'campaign', applied: true, wanderer: st.wanderer }); return; }
        G.flowDone(); G.game.go('event', { id: st.id, realm: st.realm, back: 'campaign', onChoice: (choice) => { const r = sim.apply({ t: 'event', id: st.id, realm: st.realm, choice }); this.afterEffects(r.out || [], st.realm); } }); return;
      }
      case 'tutorialBattle': G.flowDone(); G.startBattle(G.tutorialSpec(st.realm), { back: 'campaign', onDone: (res) => { S.flags.tutorialDone = true; G.game.go('campaign'); } }); return;
      case 'resumeMuster': { G.flowDone(); const steps = []; if (S.phase === 'muster') for (const h of S.humans) if (S.realms[h].alive && !S.done[h]) steps.push({ k: 'muster', realm: h }); if (S.phase === 'muster' || S.phase === 'march') steps.push({ k: 'marchPhase' }); if (S.phase === 'resolve') steps.push({ k: 'resolve' }); if (S.phase === 'tidings') steps.push({ k: 'tidings' }); R.flow.unshift(...steps); return; }
      case 'muster': if (S.phase !== 'muster' || S.done[st.realm]) { G.flowDone(); return; } this.musterInput(dt, st.realm, 'muster'); if (st.first !== false) { st.first = false; this.focus = sim.capital(st.realm) || this.focus; const evs = sim.eventsFor('muster', st.realm).map(id => ({ k: 'event', id, realm: st.realm })); if (evs.length) { G.run.flow.unshift(...evs); return; } } return;
      case 'marchPhase': { G.flowDone(); const steps = []; for (const h of S.humans) if (S.realms[h].alive) { if (S.humans.length > 1 && G.settings.privacy === 'On') steps.push({ k: 'privacy', realm: h }); for (const id of sim.eventsFor('march', h)) steps.push({ k: 'event', id, realm: h }); steps.push({ k: 'march', realm: h }); } steps.push({ k: 'resolve' }); R.flow.unshift(...steps); return; }
      case 'march': if (S.phase !== 'march' || S.done[st.realm]) { G.flowDone(); return; } this.musterInput(dt, st.realm, 'march'); return;
      case 'resolve': {
        if (S.phase === 'march' && !S.humans.some(h => S.realms[h].alive && !S.done[h])) sim.beginResolution();
        if (S.flags.sanctumPending) { const r = S.flags.sanctumPending; S.flags.sanctumPending = null; const ks = sim.sanctumTroops(r); if (ks.length) S.queue.unshift({ realm: r, target: 'sanctum', knights: ks, from: {} }); }
        const a = sim.nextAttack(); if (!a) { G.flowDone(); G.run.flow.unshift({ k: 'endSeason' }); return; }
        const human = S.realms[a.march.realm].human ? a.march.realm : (a.defender && S.realms[a.defender] && S.realms[a.defender].human ? a.defender : null);
        if (a.kind === 'open') { const steps = [{ k: 'card', kind: 'text', title: 'THE GATES STAND OPEN', text: G.get('realm', a.march.realm).short + ' takes ' + G.get('castle', a.march.target).name + ' without a battle.', castle: a.march.target }]; if (S.realms[a.march.realm].human) for (const id of sim.eventsFor('capture', a.march.realm, { castle: a.march.target })) steps.push({ k: 'event', id, realm: a.march.realm }); G.run.flow.unshift(...steps); G.sfx('castle_taken'); return; }
        if (!human) { const b = G.BattleSim.create(sim.battleSpec(a, G.Rng.int(S.rng, 1, 1e9))), res = G.BattleAI.resolve(b), out = sim.applyBattle(a, res); if (G.settings.aiBattles !== 'Skip') G.run.flow.unshift({ k: 'card', kind: 'battle', out, auto: true }); return; }
        G.run.flow.unshift({ k: 'battleChoice', a, realm: human }); return;
      }
      case 'battleChoice': if (!this.card || this.card.st !== st) this.card = CP.battleChoice(st); this.card.update(dt); return;
      case 'endSeason': G.flowDone(); sim.endSeason(); if (!S.over) G.run.flow.unshift({ k: 'tidings' }); return;
    }
  },
  afterEffects(out, realm) {
    for (const o of out) {
      if (o.toast) G.ui.toast(o.toast, 4);
      if (o.joined) G.ui.toast(KN(o.joined).name + ' joins your cause!', 4);
      if (o.tutorial) G.run.flow.unshift({ k: 'tutorialBattle', realm });
      if (o.sanctum) G.run.sim.state.flags.sanctumPending = realm;
      if (o.battleBuff) (G.run.pendingBuffs = G.run.pendingBuffs || []).push(o.battleBuff);
    }
  },
  // the battle for an attack, commanded or delegated; then the aftermath and its events
  fight(a, command) {
    const R = G.run, sim = R.sim, S = sim.state, spec = sim.battleSpec(a, G.Rng.int(S.rng, 1, 1e9)), human = S.realms[a.march.realm].human ? a.march.realm : a.defender;
    const after = res => {
      const out = sim.applyBattle(a, res), steps = [{ k: 'card', kind: 'battle', out }], won = (human === out.attacker) === out.won;
      if (!S.realms[human].firstSeen) { S.realms[human].firstSeen = true; for (const id of sim.eventsFor('afterBattle', human, { won })) steps.push({ k: 'event', id, realm: human }); }
      for (const id of sim.eventsFor('afterBattle', human, { won, sanctum: a.kind === 'sanctum' })) if (!steps.some(s => s.id === id)) steps.push({ k: 'event', id, realm: human });
      if (out.won && human === out.attacker && a.kind !== 'sanctum') for (const id of sim.eventsFor('capture', human, { castle: out.castle })) steps.push({ k: 'event', id, realm: human });
      G.run.flow.unshift(...steps);
    };
    const before = []; for (const id of sim.eventsFor('beforeBattle', human, { castle: a.march.target, knights: spec.sides.flatMap(s => s.troops.map(t => t.knight.id)), defender: a.defender })) before.push(id);
    for (const id of before) sim.apply({ t: 'event', id, realm: human, choice: null });
    const buffs = []; for (const id of before) for (const f of G.get('event', id).effects) if (f.battleBuff) buffs.push(f.battleBuff);
    if (!command) { const b = G.BattleSim.create(spec); for (const [kid, eff] of buffs) { const u = b.state.units.find(x => x.ref === kid); if (u) u.eff[eff] = 2; } after(G.BattleAI.resolve(b)); return; }
    if (G.game.saves && !G.hubActive) { try { G.game.saves.autosave(); } catch (e) { /* storage blocked */ } }
    G.startBattle(spec, { back: 'campaign', buffs, onDone: res => { after(res); G.game.go('campaign'); } });
  },
  // muster and march: the focus moves between castles; confirm opens the castle's card; □ opens the commands
  musterInput(dt, realm, phase) {
    const R = G.run, sim = R.sim, S = sim.state, I = G.game.input;
    if (this.panel) { const r = this.panel.update(dt); if (r === 'close') { this.panel = null; I.consumeAll(); } return; }
    if (G.autoplay) { this.idleAI += dt; if (this.idleAI > .5) { this.idleAI = 0; if (phase === 'muster') { G.CampaignAI.autoplayMuster(sim, realm); sim.apply({ t: 'endMuster', realm }); } else { G.CampaignAI.autoplayMarch(sim, realm); sim.apply({ t: 'endMarch', realm }); } G.flowDone(); } return; }
    const t = (I.repeat('right', .25, .12) ? 1 : 0) - (I.repeat('left', .25, .12) ? 1 : 0), u = (I.repeat('down', .25, .12) ? 1 : 0) - (I.repeat('up', .25, .12) ? 1 : 0);
    if (t || u) { const from = G.get('castle', this.focus).pos; let best = null, bd = 1e9; for (const c of G.all('castle')) { if (c.id === this.focus) continue; const dx = c.pos[0] - from[0], dy = c.pos[1] - from[1], l = Math.hypot(dx, dy), dot = (dx * t + dy * u) / (l * Math.hypot(t, u)); if (dot < .5) continue; const sc = l * (2 - dot); if (sc < bd) { bd = sc; best = c.id; } } if (best) { this.focus = best; this.mouseFocus = false; G.sfx('ui_move'); } }
    if (I.pressed('prev') || I.pressed('next')) { const own = sim.castlesOf(realm).sort(); if (own.length) { const k = own.indexOf(this.focus); this.focus = own[(k + (I.pressed('next') ? 1 : -1) + own.length) % own.length]; this.mouseFocus = false; G.sfx('ui_move'); } }
    const p = I.pointer(); if (p && (!this.ptr || Math.hypot(p[0] - this.ptr[0], p[1] - this.ptr[1]) > 2)) { const c = this.castleAtScreen(p); if (c && c !== this.focus) { this.focus = c; this.mouseFocus = true; G.sfx('ui_move'); } } this.ptr = p;
    const ck = I.clicked(); if (ck) { const c = this.castleAtScreen(ck); if (c) { this.focus = c; this.openCastle(realm, phase); return; } }
    if (I.pressed('confirm')) { this.openCastle(realm, phase); return; }
    if (I.pressed('info')) { this.panel = CP.realm(realm); return; }
    if (I.pressed('cancel')) { G.game.pause(); return; }
    if (I.down('command')) { this.hold += dt; if (this.hold > .6) { this.hold = -99; this.endPhase(realm, phase); } } else { if (this.hold > 0 && this.hold < .6) this.panel = CP.commands(realm, phase, this); this.hold = 0; }
    G.game.saves && (G.game.saves.canSave = phase === 'muster' && !G.hubActive);
  },
  endPhase(realm, phase) {
    const R = G.run, sim = R.sim, go = () => { sim.apply({ t: phase === 'muster' ? 'endMuster' : 'endMarch', realm }); G.flowDone(); G.sfx('ui_confirm'); };
    if (G.settings.confirmEnd === 'On') this.confirm.ask(phase === 'muster' ? 'End the Muster and go to the March?' : (sim.state.marches.filter(m => m.realm === realm).length ? 'Send your declared marches?' : 'End the March without attacking?'), go); else go();
  },
  castleAtScreen(p) { const r = G.game.r || {}; let best = null, bd = 22; for (const c of G.all('castle')) { const q = this.screenOf(c.pos); if (!q) continue; const d = Math.hypot(q[0] - p[0], q[1] - p[1] + 10); if (d < bd) { bd = d; best = c.id; } } return best; },
  screenOf(pos) { try { const v = G.game.view, sc = G.game.screen; const q = v.p(pos[0], pos[1], 0); return [q[0] - sc.ix, q[1] - sc.iy]; } catch (e) { return null; } },
  openCastle(realm, phase) {
    const sim = G.run.sim, c = this.focus, own = sim.owner(c) === realm;
    G.sfx('ui_open');
    if (phase === 'march') { if (!own || (c === 'meridian' && sim.state.flags.sanctumOpen)) this.panel = CP.march(realm, own ? 'sanctum' : c, this); else this.panel = CP.castleInfo(c); return; }
    this.panel = own ? CP.castle(realm, c, this) : CP.castleInfo(c);
  },
  draw(r) {
    const R = G.run, sim = R.sim, S = sim.state, season = sim.season(), P = G.PAL[season];
    r.sky(['#0a1830', '#1a3a68']);
    const L = G.game.lights; L.enabled = true; L.ambient = Math.min(1, P.ambient + .1);
    this.wm.map.drawFloor(r); this.wm.drawProps(r);
    const realm = curRealm();
    // march arrows: chevrons along the roads
    for (const m of S.marches) { if (!S.realms[m.realm].human && S.phase !== 'resolve') continue; const col = G.realmColor(m.realm), tg = m.target === 'sanctum' ? 'meridian' : m.target, B = G.get('castle', tg).pos; for (const kid of m.knights) { const from = m.from[kid]; if (!from) continue; const A = G.get('castle', from).pos; r.decal(g => { const a = r.w(A[0], A[1], 0), b = r.w(B[0], B[1], 0), n = 8, ph = (G.game.real * 2) % 1; for (let i = 0; i < n; i++) { const t = (i + ph) / n, x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), ang = Math.atan2(b[1] - a[1], b[0] - a[0]); px.poly(g, [[x + Math.cos(ang) * 4, y + Math.sin(ang) * 4], [x + Math.cos(ang + 2.4) * 4, y + Math.sin(ang + 2.4) * 4], [x + Math.cos(ang - 2.4) * 4, y + Math.sin(ang - 2.4) * 4]], col); } }); } }
    // dev: the AI's planned marches, from a copy of the campaign
    if (G.dev.revealAI && S.phase === 'march') { const key = S.year * 4 + S.si; if (this.aiPlanKey !== key) { this.aiPlanKey = key; const c = G.CampaignSim.load(sim.serialize()); for (const r of Object.keys(c.state.realms)) if (c.state.realms[r].alive && !c.state.realms[r].human && r !== 'brigands') G.CampaignAI.march(c, r); this.aiPlan = c.state.marches.filter(m => !S.realms[m.realm].human); }
      for (const m of this.aiPlan || []) { const B = G.get('castle', m.target === 'sanctum' ? 'meridian' : m.target).pos; for (const kid of m.knights) { const from = m.from[kid]; if (!from) continue; const A = G.get('castle', from).pos; r.decal(g => { const a = r.w(A[0], A[1], 0), b = r.w(B[0], B[1], 0); for (let i = 0; i < 12; i += 2) px.line(g, lerp(a[0], b[0], i / 12), lerp(a[1], b[1], i / 12), lerp(a[0], b[0], (i + 1) / 12), lerp(a[1], b[1], (i + 1) / 12), '#ff4040', 2); }); } } }
    // castles, banners, troop figures, markers
    for (const c of G.all('castle')) {
      const [x, y] = c.pos, cs = S.castles[c.id], own = cs.owner;
      r.shape(this.wm.shapeFor(c.id), x, y, 0, { scale: c.id === 'meridian' ? .9 : c.tier === 'capital' ? 1.1 : .85, facing: Math.PI / 2 });
      if (c.id === this.focus) r.groundRing(x, y, 26, '#ffe070', .9);
      if (cs.stilled) r.groundRing(x, y, 22, '#a0a0b0', .8);
      const ks = cs.knights.slice(0, 4);
      ks.forEach((kid, i) => { const v = this.kv[kid] || (this.kv[kid] = G.art.visual({ kind: 'knight', id: kid, scale: .55 })); const fx = x - 18 + i * 12, fy = y + 22; r.shadow(fx, fy, 3, .4); r.actor(fx, fy, 0, (g, ox, oy) => v.draw(g, ox, oy, r.view)); });
      G.game.lights.add(x, y, 20, 60, .5, { color: G.realmColor(own) });
    }
    r.overlay(g => {
      for (const c of G.all('castle')) {
        const cs = S.castles[c.id], [sx, sy] = r.w(c.pos[0], c.pos[1], 46);
        G.art.banner(g, cs.owner, Math.round(sx) + 8, Math.round(sy) - 6, 1);
        const foc = c.id === this.focus;
        if (foc || G.game.zoom > 1.05 || c.tier === 'capital' || c.id === 'meridian') { const [lx, ly] = r.w(c.pos[0], c.pos[1], 0); G.ui.text(g, c.name, Math.round(lx), Math.round(ly) + 30, foc ? '#ffe070' : '#f0e8d8', { align: 'center', outline: '#140c14', shadow: false }); }
        if (cs.knights.length > 4) { const [lx, ly] = r.w(c.pos[0] + 30, c.pos[1] + 22, 0); G.ui.text(g, '+' + (cs.knights.length - 4), lx, ly, '#ffffff'); }
        if (cs.stilled) { const [lx, ly] = r.w(c.pos[0], c.pos[1], 60); G.art.effectIcon(g, 'stop', Math.round(lx), Math.round(ly)); }
        if (cs.owner === realm && S.phase === 'muster' && (G.adj[c.id] || []).some(n => S.castles[n].owner !== realm && S.castles[n].owner !== 'brigands' && S.castles[n].knights.length)) { const [lx, ly] = r.w(c.pos[0] - 14, c.pos[1], 50); px.rect(g, Math.round(lx) - 3, Math.round(ly) - 4, 7, 9, '#c82a2a'); G.ui.text(g, '!', Math.round(lx) - 1, Math.round(ly) - 3, '#ffffff'); }
        const away = Object.values(S.knights).filter(k => k.quest && k.quest.from === c.id).length; if (away) { const [lx, ly] = r.w(c.pos[0] + 20, c.pos[1] + 30, 0); G.ui.text(g, away + ' away', lx, ly, '#a8c8ff', { font: 'tiny' }); }
      }
      if (this.wipe) { const k = this.wipe.t / 1.5, [mx, my] = r.w(512, 512, 0), rad = k * Math.max(r.W, r.H) * 1.2; px.blend(g, .35 * (1 - k), 'add', () => { for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; px.disc(g, mx + Math.cos(t) * rad, my + Math.sin(t) * rad * .8, 10, G.SEASON_COLOR[season]); } }); }
    });
    this.hud(r, realm);
    if (this.panel) this.panel.draw(r); else if (this.card) { if (G.run.flow[0] && G.run.flow[0] === this.card.st) this.card.draw(r); }
    this.confirm.draw(r);
    G.ui.drawToasts(r, G.ui.drawDt || 1 / 60);
    if (G.dev.open) G.devDraw(r);
  },
  hud(r, realm) {
    const R = G.run, sim = R.sim, S = sim.state, st = R.flow[0] || {}, W = r.W;
    r.overlay(g => {
      G.ui.panel(g, 4, 4, 150, 26, null);
      // the season wheel
      const cx = 17, cy = 17; G.SEASONS.forEach((s, i) => { const a0 = i * Math.PI / 2 - Math.PI * .75; for (let k = 0; k < 6; k++) { const a = a0 + k / 6 * Math.PI / 2; px.line(g, cx, cy, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, i === S.si ? G.SEASON_COLOR[s] : E.mix(G.SEASON_COLOR[s], '#000000', .55)); } });
      px.disc(g, cx, cy, 3, '#d8c070');
      G.ui.text(g, sim.label(), 32, 7, G.SEASON_COLOR[sim.season()]); G.ui.text(g, { muster: 'MUSTER', march: 'MARCH', resolve: 'RESOLUTION', tidings: 'TIDINGS', over: '' }[S.phase] + (S.humans.length > 1 && realm ? ' • ' + G.get('realm', realm).short : ''), 32, 17, '#e8e0f0', { font: 'tiny' });
      if (realm && S.realms[realm]) { const Rm = S.realms[realm]; G.ui.panel(g, W - 132, 4, 128, 26, null); G.art.manaIcon(g, W - 122, 17); G.ui.text(g, Rm.mana + ' (' + (sim.income(realm) - sim.upkeep(realm) >= 0 ? '+' : '') + (sim.income(realm) - sim.upkeep(realm)) + ')', W - 114, 12, '#a8d8ff');
        if (S.candle !== null) { G.art.candle(g, W - 22, 6, S.candle, S.candleMax); G.ui.text(g, S.candle + '', W - 34, 12, S.candle <= 2 ? '#ff6a5a' : '#ffd8a0', { align: 'right' }); } }
      if (R.dev) G.ui.text(g, 'DEV', W / 2, 4, '#ff6a6a', { align: 'center' });
      // the focused castle's card
      if (!this.panel && (st.k === 'muster' || st.k === 'march')) this.castleCard(g, r, this.focus, realm);
    });
    if (!this.panel && !this.card || (this.card && G.run.flow[0] !== this.card.st && !this.panel)) {
      if (st.k === 'muster') G.ui.prompts(r, [['confirm', 'Castle'], ['info', 'Realm'], ['command', 'Commands • hold: End Muster'], ['next', 'Next castle']]);
      else if (st.k === 'march') G.ui.prompts(r, [['confirm', 'Target'], ['info', 'Realm'], ['command', 'Commands • hold: End March']]);
    }
  },
  castleCard(g, r, cid, realm) {
    const sim = G.run.sim, S = sim.state, c = G.get('castle', cid), cs = S.castles[cid], x = r.W - 150, y = 36, ks = cs.knights.slice(0, 6), h = 70 + ks.length * 12;
    G.ui.panel(g, x, y, 146, h, c.name, { border: G.realmColor(cs.owner) });
    G.art.banner(g, cs.owner, x + 130, y + 4, .8);
    G.ui.text(g, G.get('realm', cs.owner).short + (cs.stilled ? ' • STILLED' : ''), x + 7, y + 19, G.realmColor(cs.owner));
    G.art.seasonIcon(g, G.REGION_DRESS[c.region] || 'hour', x + 104, y + 23, 2.5); G.art.manaIcon(g, x + 116, y + 23); G.ui.text(g, '' + c.mana, x + 122, y + 19, '#a8d8ff');
    ks.forEach((kid, i) => { const k = sim.kn(kid); G.ui.text(g, KN(kid).short + ' Lv' + k.lvl, x + 7, y + 31 + i * 12, k.realm === realm ? '#ffffff' : '#ffc8b8'); G.ui.text(g, k.troop.length + '/6' + (k.wounded ? ' W' : '') + (k.ruler ? ' ★' : ''), x + 140, y + 31 + i * 12, '#c8c0d8', { align: 'right' }); });
    const yy = y + 33 + ks.length * 12; G.ui.text(g, 'Circle: ' + c.circle.map(e => G.get('monster', e.split(':')[0]).names[0]).slice(0, 3).join(', '), x + 7, yy, '#c8c0d8', { font: 'tiny' });
    G.ui.text(g, 'Quest: ' + G.get('site', c.site).name, x + 7, yy + 9, '#c8c0d8', { font: 'tiny' }); G.ui.text(g, 'Defense ' + Math.round(G.CampaignAI.defense(sim, cid)), x + 7, yy + 18, '#e8c8a0', { font: 'tiny' });
  }
};

/* ---- cards (Tidings reports, privacy, battle results, resolution choices) ---- */
CP.card = st => {
  const sim = G.run.sim, o = { st, t: 0 };
  const done = () => { G.flowDone(); G.game.input.consumeAll(); };
  if (st.kind === 'season') { G.sting('season_' + st.season); }
  if (st.kind === 'candle') G.sting('candle');
  o.update = dt => { o.t += dt; const I = G.game.input; if (o.t > .4 && (I.pressed('confirm') || I.clicked() || (st.auto && o.t > 1.6) || (G.autoplay && o.t > .5))) { G.sfx('ui_confirm'); done(); } if (I.down('confirm') && o.t > 1.2) while (G.run.flow[0] && G.run.flow[0].k === 'card' && ['season', 'candle', 'income', 'quest', 'battle'].includes(G.run.flow[0].kind)) G.flowDone(); };
  o.draw = r => {
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (st.kind === 'season') { const c = G.SEASON_COLOR[st.season]; px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); G.art.seasonIcon(g, st.season, W / 2, H / 2 - 50, 8); E.font.title(g, G.SEASON_NAME[st.season].toUpperCase(), W / 2, H / 2 - 24, { align: 'center', scale: 3, colors: ['#ffffff', c, E.mix(c, '#000000', .4)] }); G.ui.text(g, 'YEAR ' + st.year + ' OF THE BRIGANTIME', W / 2, H / 2 + 10, '#e8e0d0', { align: 'center' }); const tag = { spring: 'The thaw runs in the rivers. Verdance stirs.', summer: "The sun stands high. Solmark's knights grow bold.", autumn: 'The leaves turn. Amberlyn gathers its strength.', winter: "Snow on every road. Hoarfast's knights grow bold." }[st.season]; G.ui.text(g, tag, W / 2, H / 2 + 24, c, { align: 'center' }); return; }
      const w = 260, x = Math.round(W / 2 - w / 2); let y = Math.round(H / 2 - 50), title = '', lines = [];
      if (st.kind === 'candle') { title = 'THE HOUR-CANDLE'; lines = [st.n + ' season' + (st.n === 1 ? '' : 's') + ' remain' + (st.n === 1 ? 's' : '') + ' before the Thirteenth Month.']; }
      if (st.kind === 'text') { title = st.title; lines = E.font.wrap(st.text, w - 20); }
      if (st.kind === 'income') { const q = st.q; title = 'THE TREASURY OF ' + G.get('realm', st.realm).short.toUpperCase(); lines = ['Income  +' + q.income, 'Upkeep  -' + q.upkeep, 'Mana    ' + q.mana].concat(q.lost.length ? ['Deserted: ' + q.lost.join(', ')] : []); }
      if (st.kind === 'quest') { const q = st.q; title = 'A QUEST RETURNS'; lines = E.font.wrap(q.text || (KN(q.knight).short + ' returns.'), w - 50); }
      if (st.kind === 'battle') { const b = st.out; title = (G.get('realm', b.attacker).short + ' AT ' + G.get('castle', b.castle).name).toUpperCase(); lines = [(b.won ? G.get('realm', b.attacker).short + ' wins' : G.get('realm', b.defender).short + ' holds'), b.losses.length ? 'Fallen: ' + b.losses.map(l => l[1]).join(', ').slice(0, 60) : '', b.captures.length ? 'Captured: ' + b.captures.map(l => l[1]).join(', ').slice(0, 60) : '', b.wounded.length ? 'Wounded: ' + b.wounded.map(k => KN(k).short).join(', ') : '', b.levels.length ? 'Level up: ' + b.levels.map(l => l[0] + ' ' + l[1]).join(', ').slice(0, 60) : ''].filter(Boolean); }
      if (st.k === 'privacy') { const R = G.get('realm', st.realm), k = G.art.visual({ kind: 'knight', id: R.ruler }); px.rect(g, 0, 0, W, H, '#0a0812'); try { k.rig.drawPortrait(g, W / 2 - 32, H / 2 - 80, 64); } catch (e) { /* no portrait */ } E.font.title(g, (KN(R.ruler).short + "'s turn").toUpperCase(), W / 2, H / 2 - 6, { align: 'center', scale: 2, colors: ['#ffffff', R.main, E.mix(R.main, '#000', .4)] }); G.ui.text(g, 'Pass the controller.', W / 2, H / 2 + 20, '#e8e0d0', { align: 'center' }); return; }
      const h = 30 + lines.length * 11; y = Math.round(H / 2 - h / 2);
      G.ui.panel(g, x, y, w, h, title);
      if (st.kind === 'quest') { const v = G.art.visual({ kind: 'knight', id: st.q.knight }); try { v.rig.drawPortrait(g, x + 8, y + 20, 28); } catch (e) { /* no portrait */ } lines.forEach((l, i) => G.ui.text(g, l, x + 42, y + 21 + i * 11, '#ffffff')); }
      else lines.forEach((l, i) => G.ui.text(g, l, x + 10, y + 21 + i * 11, '#ffffff'));
    });
    G.ui.prompts(r, [['confirm', 'Next'], st.kind !== 'text' ? ['confirm', 'Hold: skip'] : null].filter(Boolean).slice(0, 1));
  };
  return o;
};
CP.battleChoice = st => {
  const sim = G.run.sim, a = st.a, m = a.march, S = sim.state, tgt = a.kind === 'sanctum' ? 'The Clockwork Sanctum' : G.get('castle', m.target).name;
  const defN = a.kind === 'sanctum' ? 1 : sim.defenders(m.target).length;
  const list = new G.ui.List([{ label: 'Command the battle' }, { label: 'Delegate (auto-resolve)' }]);
  const o = { st, t: 0 };
  o.update = dt => { o.t += dt; if (G.autoplay && o.t > .3) { G.flowDone(); G.scenes.campaign.fight(a, false); return; } const r = list.update(dt); if (r === 'pick') { G.flowDone(); G.game.input.consumeAll(); G.scenes.campaign.fight(a, list.i === 0); } };
  o.draw = r => { r.overlay(g => { const w = 260, h = 84, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2); G.ui.panel(g, x, y, w, h, 'TO BATTLE'); G.ui.text(g, G.get('realm', m.realm).short + ' marches on ' + tgt + ':', x + 10, y + 21, '#ffffff'); G.ui.text(g, m.knights.length + ' troop' + (m.knights.length > 1 ? 's' : '') + ' against ' + defN + '. ' + G.SEASON_NAME[sim.season()] + '.', x + 10, y + 32, '#e8c8a0'); list.draw(g, x + 10, y + 46, w - 20); }); G.ui.prompts(r, [['confirm', 'Choose']]); };
  return o;
};

// ---- 64-campaign-panels.js ----
/* ---- MUSTER AND MARCH PANELS: castle actions, Organize, Summon, Move, Quest, Equip, Promote, the Realm book, the
 * command menu and March declarations. Each: { id, update(dt) -> 'close' | null, draw(r) } ---- */
const PANEL_W = 300;
const apply = cmd => { const r = G.run.sim.apply(cmd); if (!r.ok) { G.sfx('ui_error'); G.ui.toast(r.why, 1.6); } return r; };
const frame = (r, title, w = PANEL_W, h = 170, o = {}) => { const x = Math.round(r.W / 2 - w / 2), y = Math.round(Math.max(36, r.H / 2 - h / 2 - 6)); r.overlay(g => G.ui.panel(g, x, y, w, h, title, o)); return [x, y]; };
const kvCache = {};
const knightVis = id => kvCache[id] || (kvCache[id] = G.art.visual({ kind: 'knight', id }));
const monVis = (sp, tier) => kvCache[sp + tier] || (kvCache[sp + tier] = G.art.visual({ kind: 'monster', sp, tier }));
G.warmPortraits = () => { for (const r of G.PLAYABLE) knightVis(G.get('realm', r).ruler); };
const bars = (g, x, y, st, max = 120) => { [['HP', st.hp, '#5ad86a', 300], ['ATK', st.atk, '#ff8a5a', max], ['DEF', st.def, '#8ab0ff', max], ['INT', st.int, '#c08aff', max], ['AGI', st.agi, '#ffe070', max]].forEach(([n, v, c, m], i) => G.ui.statBar(g, x, y + i * 10, n, v, m, c)); };
// the castle's actions (own castle, Muster)
CP.castle = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, cs = S.castles[cid], c = G.get('castle', cid);
  const items = () => { const ks = cs.knights.filter(k => sim.kn(k).realm === realm), hasRes = cs.reserve.length > 0;
    return [{ label: 'Organize', id: 'organize', disabled: !ks.length, why: 'No knights here' }, { label: 'Summon', id: 'summon', disabled: cs.stilled, why: 'Stilled', right: (3 - cs.summons) + ' left' }, { label: 'Move', id: 'move', disabled: !ks.some(k => sim.canAct(k) && !sim.kn(k).moved), why: 'No knight can move' },
      { label: 'Quest', id: 'quest', disabled: !ks.some(k => sim.canAct(k) && !sim.kn(k).ruler && !sim.kn(k).moved), why: 'No knight can quest' }, { label: 'Equip & items', id: 'equip', disabled: !ks.length, why: 'No knights here' }, { label: 'Promote', id: 'promote', disabled: !(ks.length || hasRes), why: 'Nobody here' }]; };
  const list = new G.ui.List(items());
  const o = { id: 'castle' };
  o.update = dt => { list.set(items()); const r = list.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { const id = list.cur.id; scene.panel = CP[id](realm, cid, scene); if (!G.run.sim.state.tipsSeen) G.run.sim.state.tipsSeen = {}; } return null; };
  o.draw = r => { const [x, y] = frame(r, c.name.toUpperCase(), 180, 120); r.overlay(g => { list.draw(g, x + 6, y + 20, 168); if (list.whyLine) G.ui.text(g, list.whyLine, x + 90, y + 108, '#ffb0a0', { align: 'center', font: 'tiny' }); }); G.ui.prompts(r, [['confirm', 'Open'], ['cancel', 'Back']]); };
  return o;
};
CP.castleInfo = cid => {
  const sim = G.run.sim, S = sim.state, cs = S.castles[cid], c = G.get('castle', cid), o = { id: 'castleInfo' };
  o.update = dt => { const I = G.game.input; if (I.pressed('cancel') || I.pressed('confirm') || I.clicked()) { G.sfx('ui_cancel'); return 'close'; } return null; };
  o.draw = r => { const [x, y] = frame(r, c.name.toUpperCase() + ' • ' + G.get('realm', cs.owner).short, 280, 40 + Math.min(6, cs.knights.length) * 12); r.overlay(g => { cs.knights.slice(0, 6).forEach((kid, i) => { const k = sim.kn(kid); G.ui.text(g, KN(kid).name.slice(0, 26), x + 10, y + 21 + i * 12, '#ffffff'); G.ui.text(g, 'Lv' + k.lvl + '  ' + k.troop.length + ' beasts  power ' + Math.round(sim.troopPower(kid)), x + 270, y + 21 + i * 12, '#c8c0d8', { align: 'right', font: 'tiny' }); }); if (!cs.knights.length) G.ui.text(g, 'No knights. The gates stand open.', x + 10, y + 22, '#e8c8a0'); }); G.ui.prompts(r, [['cancel', 'Back']]); };
  return o;
};
// Organize: knights | the selected troop | the reserve; ✕ binds or unbinds, □ the formation, L1/R1 the knight
CP.organize = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, cs = S.castles[cid], o = { id: 'organize' };
  const ks = () => cs.knights.filter(k => sim.kn(k).realm === realm && !sim.kn(k).quest);
  let col = 0; const kl = new G.ui.List([], { max: 6 }), tl = new G.ui.List([], { max: 6 }), rl = new G.ui.List([], { max: 6 });
  const refresh = () => { kl.set(ks().map(k => ({ label: KN(k).short, id: k, right: sim.bondUsed(k) + '/' + sim.bondMax(k) }))); const k = kl.cur && kl.cur.id; tl.set(k ? sim.kn(k).troop.map(u => ({ label: MN(sim.mon(u)), id: u, right: 'Lv' + sim.mon(u).lvl })) : []); rl.set(cs.reserve.map(u => ({ label: MN(sim.mon(u)), id: u, right: 'Lv' + sim.mon(u).lvl + ' mana ' + G.get('monster', sim.mon(u).sp).rank }))); if (!tl.items.length && col === 1) col = 0; if (!rl.items.length && col === 2) col = kl.items.length ? 0 : 0; };
  refresh();
  o.update = dt => {
    const I = G.game.input; refresh();
    if (I.pressed('prev') || I.pressed('next')) { kl.move(I.pressed('next') ? 1 : -1); refresh(); }
    if (I.pressed('command') && kl.cur) { const k = sim.kn(kl.cur.id), f = ['vanguard', 'shield', 'column']; apply({ t: 'formation', realm, knight: k.id, formation: f[(f.indexOf(k.formation) + 1) % 3] }); G.sfx('ui_move'); }
    const L = [kl, tl, rl][col], r = L.update(dt);
    if (r === 'left') { col = Math.max(0, col - 1); G.sfx('ui_move'); } else if (r === 'right') { col = Math.min(2, col + 1); if (col === 1 && !tl.items.length) col = 2; G.sfx('ui_move'); }
    else if (r === 'back') { if (col > 0) col = 0; else return 'close'; }
    else if (r === 'pick') {
      if (col === 0) col = rl.items.length ? 2 : 1;
      else if (col === 1 && tl.cur) { apply({ t: 'unbind', realm, knight: kl.cur.id, uid: tl.cur.id }); }
      else if (col === 2 && rl.cur && kl.cur) { const ok = apply({ t: 'bind', realm, knight: kl.cur.id, uid: rl.cur.id }); if (ok.ok) G.sfx('buff'); }
    }
    for (const [i, Lx] of [kl, tl, rl].entries()) if (Lx !== L && Lx.hit(I.clicked())) col = i;
    return null;
  };
  o.draw = r => {
    const [x, y] = frame(r, 'ORGANIZE • ' + G.get('castle', cid).name.toUpperCase(), 360, 170);
    r.overlay(g => {
      const heads = ['KNIGHTS', 'TROOP', 'RESERVE'];
      heads.forEach((h, i) => G.ui.text(g, h, x + 10 + i * 118, y + 20, i === col ? '#ffe070' : '#a8a0c0'));
      kl.draw(g, x + 6, y + 31, 112, { noFocus: col !== 0 }); tl.draw(g, x + 122, y + 31, 112, { noFocus: col !== 1 }); rl.draw(g, x + 238, y + 31, 116, { noFocus: col !== 2 });
      if (kl.cur) { const k = sim.kn(kl.cur.id); G.ui.text(g, 'Bond ' + sim.bondUsed(k.id) + '/' + sim.bondMax(k.id) + '  •  Formation: ' + G.cap(k.formation) + '  •  ' + k.troop.length + '/6', x + 10, y + 154, '#e8c8a0'); try { knightVis(k.id).portrait(g, x + 326, y + 130, 28); } catch (e) { /* no portrait */ } }
      const cur = [kl, tl, rl][col].cur; if (col > 0 && cur) { const m = sim.mon(cur.id), st = G.monsterStats(m.sp, m.tier, m.lvl); G.ui.text(g, G.get('monster', m.sp).sizes[m.tier - 1] + ' ' + G.SEASON_NAME[G.get('monster', m.sp).elem] + '  HP ' + m.hp + '/' + st.hp + '  ATK ' + st.atk, x + 10, y + 142, '#c8c0d8', { font: 'tiny' }); }
    });
    G.ui.prompts(r, [['confirm', col === 1 ? 'Unbind' : col === 2 ? 'Bind' : 'Choose'], ['command', 'Formation'], ['next', 'Knight'], ['cancel', 'Back']]);
  };
  return o;
};
// Summon: the circle's species with costs, a live rig on the circle, a card of bars
CP.summon = (realm, cid, scene) => {
  const sim = G.run.sim, o = { id: 'summon' }, list = new G.ui.List([], { max: 6 }); let fx = 0, lastSp = null, vis = null;
  const refresh = () => list.set(sim.summonable(cid).map(s => ({ label: G.get('monster', s.sp).names[0], id: s.sp, cost: s.cost, right: 'mana ' + s.cost, disabled: !s.ok, why: s.why })));
  refresh();
  o.update = dt => { refresh(); fx = Math.max(0, fx - dt); if (vis) vis.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI * .6 + Math.sin(G.game.real) * .3 }); const r = list.update(dt); if (r === 'back') return 'close';
    if (r === 'pick') { const res = apply({ t: 'summon', realm, castle: cid, sp: list.cur.id }); if (res.ok) { fx = 1.2; G.sting('summon'); G.sfx('summon_rise'); G.cry(list.cur.id); G.ui.toast(G.get('monster', list.cur.id).names[0] + ' answers the circle. It waits in the reserve.', 2.5); } }
    return null; };
  o.draw = r => {
    const [x, y] = frame(r, 'SUMMON • ' + G.get('castle', cid).name.toUpperCase(), 340, 170), sp = list.cur && list.cur.id;
    if (sp !== lastSp) { lastSp = sp; vis = sp ? G.art.visual({ kind: 'monster', sp, tier: 1 }) : null; }
    r.overlay(g => {
      list.draw(g, x + 6, y + 20, 120);
      const cx = x + 180, cy = y + 120, t = G.game.real;
      for (let i = 0; i < 24; i++) { const a = t * .8 + i / 24 * Math.PI * 2; px.dot(g, cx + Math.cos(a) * 30, cy + Math.sin(a) * 10, i % 2 ? '#d8c070' : '#7ac8ff'); }
      if (fx > 0) px.blend(g, fx * .6, 'add', () => px.rect(g, cx - 10, cy - 70, 20, 70, '#fff0b0'));
      if (vis) vis.draw(g, cx, cy, E.charView(E.VIEWS.brawler));
      if (sp) { const m = G.get('monster', sp), st = G.monsterStats(sp, 1, 5); G.ui.text(g, m.names.join(' > '), x + 220, y + 22, '#ffe8a8', { font: 'tiny' }); G.art.seasonIcon(g, m.elem, x + 226, y + 38, 3); G.ui.text(g, G.SEASON_NAME[m.elem] + ' • size ' + m.sizes[0] + ' • rank ' + m.rank, x + 234, y + 34, '#c8c0d8', { font: 'tiny' }); bars(g, x + 222, y + 48, st, 40); G.ui.text(g, 'Upkeep ' + m.upkeep + ' a season', x + 222, y + 102, '#a8d8ff', { font: 'tiny' }); G.ui.text(g, 'Skills: ' + m.skills.flat().map(s => G.get('skill', s).name).slice(0, 3).join(', '), x + 222, y + 112, '#c8c0d8', { font: 'tiny' }); }
      G.ui.text(g, 'Mana ' + G.run.sim.state.realms[realm].mana, x + 10, y + 154, '#a8d8ff');
      if (list.whyLine) G.ui.text(g, list.whyLine, x + 170, y + 154, '#ffb0a0', { align: 'center' });
    });
    G.ui.prompts(r, [['confirm', list.cur && !list.cur.disabled ? 'Summon (-' + list.cur.cost + ' mana)' : 'Summon'], ['cancel', 'Back']]);
  };
  return o;
};
// Move: pick a knight, then an adjacent castle of yours
CP.move = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'move' }; let step = 0, kid = null;
  const kl = new G.ui.List(S.castles[cid].knights.filter(k => sim.kn(k).realm === realm).map(k => ({ label: KN(k).short, id: k, right: 'Lv' + sim.kn(k).lvl, disabled: !sim.canAct(k) || sim.kn(k).moved, why: sim.kn(k).wounded ? 'Wounded' : sim.kn(k).moved ? 'Moved already' : 'Cannot move' })));
  const dl = new G.ui.List((G.adj[cid] || []).filter(n => sim.owner(n) === realm).map(n => ({ label: G.get('castle', n).name, id: n, disabled: S.castles[n].stilled || S.castles[n].knights.length >= 6, why: S.castles[n].stilled ? 'Stilled' : 'Full' })));
  o.update = dt => { if (step === 0) { const r = kl.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { if (!dl.items.length) { G.ui.toast('No castle of yours beside this one.', 2); return null; } kid = kl.cur.id; step = 1; } }
    else { const r = dl.update(dt); if (dl.cur) scene.focus = dl.cur.id; if (r === 'back') { step = 0; scene.focus = cid; } if (r === 'pick') { const res = apply({ t: 'move', realm, knight: kid, to: dl.cur.id }); if (res.ok) { G.sfx('march_drums'); G.ui.toast(KN(kid).short + ' rides to ' + dl.cur.label + '.', 2); scene.focus = dl.cur.id; return 'close'; } } }
    return null; };
  o.draw = r => { const [x, y] = frame(r, step === 0 ? 'MOVE • WHO RIDES?' : 'MOVE ' + KN(kid).short.toUpperCase() + ' TO', 200, 120); r.overlay(g => { (step === 0 ? kl : dl).draw(g, x + 6, y + 20, 188); }); G.ui.prompts(r, [['confirm', 'Choose'], ['cancel', 'Back']]); };
  return o;
};
// Quest: pick a knight, then a site card with the odds
CP.quest = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'quest' }; let step = 0, kid = null, sl = null;
  const away = sim.knightsOf(realm).filter(k => k.quest).length;
  const kl = new G.ui.List(S.castles[cid].knights.filter(k => sim.kn(k).realm === realm).map(k => { const K = sim.kn(k); return { label: KN(k).short, id: k, right: G.get('class', K.cls).name, disabled: K.ruler || !sim.canAct(k) || K.moved || away >= 2, why: K.ruler ? 'Rulers stay home' : away >= 2 ? 'Two knights are away already' : K.moved ? 'Moved this Muster' : 'Cannot quest' }; }));
  o.update = dt => { if (step === 0) { const r = kl.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { kid = kl.cur.id; sl = new G.ui.List(sim.questSites(kid).map(s => ({ label: G.get('site', s).name, id: s, right: G.get('site', s).away + ' season' + (G.get('site', s).away > 1 ? 's' : '') }))); step = 1; } }
    else { const r = sl.update(dt); if (r === 'back') step = 0; if (r === 'pick') { const res = apply({ t: 'quest', realm, knight: kid, site: sl.cur.id }); if (res.ok) { G.sfx('ui_confirm'); G.ui.toast(KN(kid).short + ' sets out for ' + sl.cur.label + '.', 2.5); return 'close'; } } }
    return null; };
  o.draw = r => { const [x, y] = frame(r, step === 0 ? 'QUEST • WHO GOES?' : 'QUEST • WHERE?', 320, 150);
    r.overlay(g => { if (step === 0) { kl.draw(g, x + 6, y + 20, 200); G.ui.wrapText(g, 'A questing knight leaves with the troop for a season or two. What they find is told on return.', x + 210, y + 22, 100, '#c8c0d8', 9); return; }
      sl.draw(g, x + 6, y + 20, 170); const s = sl.cur && sl.cur.id; if (!s) return; const w = sim.questOdds(kid, s), tot = Object.values(w).reduce((a, b) => a + b, 0);
      Object.entries(w).forEach(([k2, v], i) => { G.ui.text(g, G.cap(k2), x + 186, y + 22 + i * 11, '#e8e0f0', { font: 'tiny' }); G.ui.bar(g, x + 230, y + 24 + i * 11, 70, v, tot, k2 === 'mishap' ? '#ff6a5a' : '#ffd060'); });
      G.ui.text(g, 'Focus: ' + G.cap(G.get('site', s).focus), x + 186, y + 92, '#a8d8ff', { font: 'tiny' }); G.ui.text(g, 'Risk: ' + (w.mishap / tot > .12 ? 'high' : w.mishap / tot > .07 ? 'some' : 'low'), x + 186, y + 102, '#ffb0a0', { font: 'tiny' }); });
    G.ui.prompts(r, [['confirm', step ? 'Send' : 'Choose'], ['cancel', 'Back']]); };
  return o;
};
// Equip: a knight, its 3 slots, the realm's stores (with stat changes ▲ ▼), consumables usable here
CP.equip = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, R = S.realms[realm], o = { id: 'equip' }; let step = 0, kid = null, slot = null;
  const kl = new G.ui.List(S.castles[cid].knights.filter(k => sim.kn(k).realm === realm).map(k => ({ label: KN(k).short, id: k, right: G.get('class', sim.kn(k).cls).name })));
  let sl = null, il = null;
  const slots = () => ['weapon', 'armor', 'accessory'].map(s => ({ label: G.cap(s) + ': ' + (sim.kn(kid).equip[s] ? G.get('item', sim.kn(kid).equip[s]).name : '-'), id: s })).concat([{ label: 'Use an item', id: 'use' }]);
  const items = () => { const seen = {}, out = []; for (const id of R.items) { const it = G.get('item', id); if (slot === 'use' ? it.slot !== 'consumable' : (it.slot !== slot || !G.canEquip(id, sim.kn(kid).cls))) continue; if (seen[id]) { seen[id].n++; seen[id].right = '×' + seen[id].n; continue; } seen[id] = { label: it.name, id, n: 1, right: '×1', desc: it.desc }; out.push(seen[id]); } if (slot !== 'use' && sim.kn(kid).equip[slot]) out.unshift({ label: 'Remove', id: '_remove' }); return out; };
  o.update = dt => {
    if (step === 0) { const r = kl.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { kid = kl.cur.id; sl = new G.ui.List(slots()); step = 1; } }
    else if (step === 1) { sl.set(slots()); const r = sl.update(dt); if (r === 'back') step = 0; if (r === 'pick') { slot = sl.cur.id; il = new G.ui.List(items(), { max: 6 }); if (!il.items.length) G.ui.toast(slot === 'use' ? 'No items to use.' : 'Nothing in the stores fits.', 1.6); else step = 2; } }
    else { il.set(items()); const r = il.update(dt); if (r === 'back' || !il.items.length) step = 1;
      if (r === 'pick') { const id = il.cur.id; if (id === '_remove') apply({ t: 'unequip', realm, knight: kid, slot }); else if (slot === 'use') { if (apply({ t: 'use', realm, item: id, knight: kid }).ok) G.sfx('heal'); } else if (apply({ t: 'equip', realm, knight: kid, item: id }).ok) G.sfx('buff'); step = 1; } }
    return null; };
  o.draw = r => {
    const [x, y] = frame(r, 'EQUIP' + (kid ? ' • ' + KN(kid).short.toUpperCase() : ''), 330, 170);
    r.overlay(g => {
      if (step === 0) { kl.draw(g, x + 6, y + 20, 200); if (kl.cur) try { knightVis(kl.cur.id).portrait(g, x + 240, y + 30, 64); } catch (e) { /* no portrait */ } return; }
      const k = sim.kn(kid), kv = G.knightView(k); try { knightVis(kid).portrait(g, x + 250, y + 20, 64); } catch (e) { /* no portrait */ }
      bars(g, x + 214, y + 92, Object.assign({}, kv.st), 80);
      if (step === 1) sl.draw(g, x + 6, y + 20, 200);
      else { il.draw(g, x + 6, y + 20, 200); const cur = il.cur; if (cur && cur.id !== '_remove') { const it = G.get('item', cur.id); G.ui.wrapText(g, it.desc, x + 10, y + 132, 190, '#e8e0f0', 9); if (slot !== 'use') { const old = k.equip[slot] ? G.get('item', k.equip[slot]).mods : {}; let tx = x + 10; for (const s of ['atk', 'def', 'int', 'agi', 'mov', 'bond', 'ward', 'mp']) { const d = (it.mods[s] || 0) - (old[s] || 0); if (!d) continue; const t = s.toUpperCase() + (d > 0 ? ' +' + d : ' -' + (-d)); G.ui.text(g, t, tx, y + 152, d > 0 ? '#7ad860' : '#ff7a5a'); tx += E.font.width(t) + 8; } } } }
    });
    G.ui.prompts(r, [['confirm', 'Choose'], ['cancel', 'Back']]);
  };
  return o;
};
// Promote: monsters that may take their next form, knights that may change class; before -> after
CP.promote = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'promote' }; let flash = 0;
  const entries = () => { const out = []; for (const k of S.castles[cid].knights) { const K = sim.kn(k); if (K.realm !== realm) continue; const p = sim.canClassChange(K); out.push({ label: KN(k).short + ': ' + G.get('class', K.cls).name + (p.to ? ' > ' + G.get('class', p.to).name : ''), id: 'k:' + k, disabled: !p.ok, why: p.why }); for (const u of K.troop) { const m = sim.mon(u), q = sim.canPromote(m); out.push({ label: MN(m) + (m.tier < 3 ? ' > ' + G.get('monster', m.sp).names[m.tier] : ''), id: 'm:' + u, right: 'Lv' + m.lvl, disabled: !q.ok, why: q.why }); } } for (const u of S.castles[cid].reserve) { const m = sim.mon(u), q = sim.canPromote(m); out.push({ label: MN(m) + (m.tier < 3 ? ' > ' + G.get('monster', m.sp).names[m.tier] : ''), id: 'm:' + u, right: 'Lv' + m.lvl, disabled: !q.ok, why: q.why }); } return out; };
  const list = new G.ui.List(entries(), { max: 7 }); let a = null, b = null, last = null;
  o.update = dt => { list.set(entries()); flash = Math.max(0, flash - dt); if (a) a.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI * .7 }); if (b) b.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI * .7 }); const r = list.update(dt); if (r === 'back') return 'close';
    if (r === 'pick') { const [t, id] = list.cur.id.split(':'); const res = t === 'k' ? apply({ t: 'classChange', realm, knight: id }) : apply({ t: 'promote', realm, uid: id }); if (res.ok) { flash = 1; last = null; G.sting('promote'); G.game.flash('#ffffff', .2, .5); G.ui.toast(t === 'k' ? KN(id).short + ' takes a new class!' : 'A new form!', 2); } }
    return null; };
  o.draw = r => {
    const [x, y] = frame(r, 'PROMOTE', 340, 170), cur = list.cur;
    if (cur && cur.id !== last) { last = cur.id; const [t, id] = cur.id.split(':'); if (t === 'm') { const m = sim.mon(id); a = G.art.visual({ kind: 'monster', sp: m.sp, tier: m.tier }); b = m.tier < 3 ? G.art.visual({ kind: 'monster', sp: m.sp, tier: m.tier + 1 }) : null; } else { a = knightVis(id); b = null; } }
    r.overlay(g => {
      list.draw(g, x + 6, y + 20, 200);
      const v = E.charView(E.VIEWS.brawler); if (a) a.draw(g, x + 240, y + 100, v); if (b) { G.ui.text(g, '>', x + 270, y + 80, '#ffe070'); b.draw(g, x + 305, y + 100, v); }
      if (cur && cur.id.startsWith('m:')) { const m = sim.mon(cur.id.slice(2)), s1 = G.monsterStats(m.sp, m.tier, m.lvl), s2 = m.tier < 3 ? G.monsterStats(m.sp, m.tier + 1, m.lvl) : s1; G.ui.text(g, 'HP ' + s1.hp + (s2 !== s1 ? ' > ' + s2.hp : '') + '  ATK ' + s1.atk + (s2 !== s1 ? ' > ' + s2.atk : ''), x + 214, y + 112, '#e8e0f0', { font: 'tiny' }); }
      if (flash > 0) px.blend(g, flash * .5, 'add', () => px.rect(g, x, y, 340, 170, '#ffffff'));
      if (list.whyLine) G.ui.text(g, list.whyLine, x + 110, y + 156, '#ffb0a0', { align: 'center', font: 'tiny' });
    });
    G.ui.prompts(r, [['confirm', 'Promote'], ['cancel', 'Back']]);
  };
  return o;
};
// the command menu (□): the Realm book, saving, ending the phase
CP.commands = (realm, phase, scene) => {
  const list = new G.ui.List([{ label: 'Realm', id: 'realm' }, { label: 'Chronicle', id: 'chron' }, { label: 'Objectives', id: 'obj' }, { label: phase === 'muster' ? 'End Muster' : 'End March', id: 'end' }].concat(phase === 'muster' && !G.hubActive ? [{ label: 'Save', id: 'save' }] : []));
  const o = { id: 'commands' };
  o.update = dt => { const r = list.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { const id = list.cur.id; if (id === 'end') { scene.panel = null; scene.endPhase(realm, phase); } else if (id === 'save') { G.game.saves.canSave = true; G.game.saves.show('save'); scene.panel = null; } else scene.panel = CP.realm(realm, { realm: 0, chron: 3, obj: 4 }[id]); } return null; };
  o.draw = r => { const [x, y] = frame(r, 'COMMANDS', 160, 96); r.overlay(g => list.draw(g, x + 6, y + 20, 148)); G.ui.prompts(r, [['confirm', 'Choose'], ['cancel', 'Back']]); };
  return o;
};
// the Realm book: tabs Knights, Monsters, Items, Chronicle, Objectives
CP.realm = (realm, tab = 0) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'realm' }, tabs = ['Knights', 'Monsters', 'Items', 'Chronicle', 'Objectives'];
  const build = () => {
    if (tab === 0) return sim.knightsOf(realm).map(k => ({ label: KN(k.id).short + ' • ' + G.get('class', k.cls).name, right: 'Lv' + k.lvl + (k.quest ? ' away' : k.wounded ? ' hurt' : ' ' + (k.castle ? G.get('castle', k.castle).name.slice(0, 10) : '')), id: k.id }));
    if (tab === 1) return sim.realmMonsters(realm).map(m => ({ label: MN(m), right: 'Lv' + m.lvl + ' HP' + m.hp }));
    if (tab === 2) { const c = {}; for (const i of S.realms[realm].items) c[i] = (c[i] || 0) + 1; return Object.entries(c).map(([i, n]) => ({ label: G.get('item', i).name, right: '×' + n, desc: G.get('item', i).desc })); }
    if (tab === 3) return S.chronicle.slice(-40).reverse().map(c => ({ label: G.SEASON_NAME[c.season].slice(0, 3) + ' Y' + c.year + ': ' + c.text.slice(0, 52) }));
    return [{ label: 'Defeat the Gray Knight in the Clockwork Sanctum.' }, { label: 'Take Meridian first: its Sanctum opens to its holder.' }, { label: S.candle === null ? 'The Hour-Candle is not yet lit.' : 'The Hour-Candle: ' + S.candle + ' season(s) left.' }, { label: 'Hold at least one castle.' }, { label: 'Difficulty: ' + G.cap(S.difficulty) }, { label: 'Castles held: ' + sim.castlesOf(realm).length + ' / 25' }];
  };
  const list = new G.ui.List(build(), { max: 9 });
  o.update = dt => { const I = G.game.input; if (I.pressed('prev') || I.pressed('next')) { tab = (tab + (I.pressed('next') ? 1 : -1) + tabs.length) % tabs.length; list.set(build()); list.i = 0; list.scroll = 0; G.sfx('ui_move'); } const r = list.update(dt); if (r === 'left') { tab = (tab + 4) % 5; list.set(build()); list.i = 0; } if (r === 'right') { tab = (tab + 1) % 5; list.set(build()); list.i = 0; } if (r === 'back') return 'close'; return null; };
  o.draw = r => { const [x, y] = frame(r, G.get('realm', realm).name.toUpperCase(), 380, 160); r.overlay(g => { tabs.forEach((t, i) => { const tx = x + 8 + i * 74; if (i === tab) px.rect(g, tx - 2, y + 17, 70, 11, '#3a3a7a'); G.ui.text(g, t, tx + 33, y + 19, i === tab ? '#ffe070' : '#a8a0c0', { align: 'center' }); }); list.draw(g, x + 6, y + 32, 368); const c = list.cur; if (c && c.desc) G.ui.text(g, c.desc, x + 190, y + 148, '#c8c0d8', { align: 'center', font: 'tiny' }); }); G.ui.prompts(r, [['next', 'Tab'], ['cancel', 'Back']]); };
  return o;
};
// March: choose up to 3 troops from castles beside the target, then Declare (or call a march off)
CP.march = (realm, target, scene) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'march' }, picked = new Set();
  const sanctum = target === 'sanctum', tname = sanctum ? 'the Clockwork Sanctum' : G.get('castle', target).name;
  const existing = S.marches.find(m => m.realm === realm && m.target === target);
  if (!sanctum && !(G.adj[target] || []).some(n => sim.owner(n) === realm)) { const p = CP.castleInfo(target); G.ui.toast('None of your castles stands beside ' + tname + '.', 2); return p; }
  if (sanctum && !S.flags.sanctumOpen) { G.ui.toast('The Sanctum is sealed.', 2); return CP.castleInfo('meridian'); }
  const cands = () => { const out = []; for (const c of sanctum ? ['meridian', ...G.adj.meridian] : G.adj[target]) { if (sim.owner(c) !== realm) continue; for (const k of S.castles[c].knights) { const K = sim.kn(k); if (K.realm !== realm) continue; out.push({ label: (picked.has(k) ? '[X] ' : '[ ] ') + KN(k).short, id: k, right: Math.round(sim.troopPower(k)) + ' • ' + G.get('castle', c).name.slice(0, 9), disabled: !sim.canAct(k) || (K.marched && !picked.has(k)), why: K.wounded ? 'Wounded' : K.marched ? 'Marching elsewhere' : 'Cannot march' }); } } return out; };
  const list = new G.ui.List([]);
  const refresh = () => list.set(existing ? [{ label: 'Call off this march', id: '_cancel', color: '#ffb0a0' }] : cands().concat([{ label: 'Declare the march', id: '_go', disabled: !picked.size, why: 'Choose 1 to 3 troops' }]));
  refresh();
  o.update = dt => { refresh(); const r = list.update(dt); if (r === 'back') return 'close';
    if (r === 'pick') { const id = list.cur.id;
      if (id === '_cancel') { apply({ t: 'cancel', realm, target }); return 'close'; }
      if (id === '_go') { const res = apply({ t: 'declare', realm, target, knights: [...picked] }); if (res.ok) { G.sfx('march_drums'); G.ui.toast(G.get('realm', realm).short + ' will march on ' + tname + '.', 2); return 'close'; } return null; }
      if (picked.has(id)) picked.delete(id); else if (picked.size < 3) picked.add(id); else G.ui.toast('Three troops at most.', 1.4); }
    return null; };
  o.draw = r => {
    const [x, y] = frame(r, (existing ? 'MARCHING ON ' : 'MARCH ON ') + tname.toUpperCase(), 330, 160);
    r.overlay(g => {
      list.draw(g, x + 6, y + 20, 200);
      if (!sanctum) { const def = G.CampaignAI.defense(sim, target), pow = [...picked].reduce((a, k) => a + sim.troopPower(k), 0), c = G.get('castle', target); G.ui.text(g, G.get('realm', sim.owner(target)).short, x + 214, y + 22, G.realmColor(sim.owner(target))); G.ui.text(g, 'Defense ' + Math.round(def), x + 214, y + 34, '#ffc8a0'); G.ui.text(g, 'Yours ' + Math.round(pow), x + 214, y + 46, '#a8ffc0'); G.ui.bar(g, x + 214, y + 60, 100, pow, Math.max(pow, def) || 1, '#5ad86a'); G.ui.bar(g, x + 214, y + 68, 100, def, Math.max(pow, def) || 1, '#ff6a5a'); G.ui.text(g, G.get('map', c.map).name, x + 214, y + 80, '#c8c0d8', { font: 'tiny' }); G.ui.text(g, G.SEASON_NAME[sim.season()] + ' field', x + 214, y + 90, G.SEASON_COLOR[sim.season()], { font: 'tiny' }); }
      else G.ui.wrapText(g, 'The Gray Knight waits below the Great Clock. Light the four Season Dials to break his Timeless guard.', x + 214, y + 22, 106, '#e8d8a8', 9);
      if (list.whyLine) G.ui.text(g, list.whyLine, x + 110, y + 148, '#ffb0a0', { align: 'center', font: 'tiny' });
    });
    G.ui.prompts(r, [['confirm', 'Choose'], ['cancel', 'Back']]);
  };
  return o;
};

// ---- 65-scene-event.js ----
/* ---- STORY STAGES: side-on sets with the cast standing in a row; the speaker steps forward; E.Dialog with live
 * portraits, the realm's colour on the name and a babble voice per speaker; choices; △ backlog; hold ○ to skip ---- */
const STAGES = {
  orchard: { bg: { sky: ['#7ab8e8', '#b8e0f0', '#e8f4e0'], sun: { x: .8, y: .2, r: 12, color: '#fff8d0' }, layers: [{ kind: 'hills', color: '#7ac060', y: .62, height: .2, parallax: .2 }, { kind: 'forest', color: '#4a9a40', y: .75, height: .18, parallax: .4 }] }, ground: '#5aa048', props: [['tree', -70, { color: '#f4b8d0', size: 1.6 }], ['flowers', -30], ['statue', 80, { size: .8 }], ['tree', 120, { color: '#f4b8d0', size: 1.3 }]], weather: { kind: 'leaves', amount: .2 }, music: 'event' },
  sunhall: { bg: 'desert', ground: '#c8a060', props: [['pillar', -110, { size: 1.5 }], ['brazier', -60, { light: true }], ['banner', 0, { color: '#e0a020' }], ['brazier', 60, { light: true }], ['pillar', 110, { size: 1.5 }]], music: 'event' },
  harvesthall: { bg: { sky: ['#5a3020', '#a86a40', '#e8b878'], layers: [{ kind: 'hills', color: '#8a5a2a', y: .65, height: .2, parallax: .2 }, { kind: 'forest', color: '#a85a1e', y: .78, height: .15, parallax: .4 }] }, ground: '#8a6040', props: [['lantern', -90, { light: true }], ['barrel', -50], ['crate', -30], ['statue', 60, { size: .7 }], ['lantern', 100, { light: true }]], weather: { kind: 'leaves', amount: .3 }, music: 'event' },
  icehall: { bg: { sky: ['#1a2a48', '#4a6a98', '#a8c8e8'], moon: { x: .25, y: .2, r: 10, color: '#e8f4ff' }, stars: 30, layers: [{ kind: 'mountains', color: '#c8d8f0', y: .6, height: .3, parallax: .2 }, { kind: 'castle', color: '#5a6a8a', y: .72, height: .25, parallax: .3 }] }, ground: '#d8e8f8', props: [['crystal', -100, { color: '#a8e8ff' }], ['pillar', -60, { size: 1.4 }], ['crystal', 70, { color: '#a8e8ff' }], ['pillar', 110, { size: 1.4 }]], weather: { kind: 'snow', amount: .4 }, music: 'winter' },
  clock: { bg: { sky: ['#0a0812', '#1a1828', '#2a2838'], stars: 10, layers: [{ kind: 'castle', color: '#2a2838', y: .55, height: .45, parallax: .1 }] }, ground: '#3a3846', props: [['candelabra', -100, { light: true }], ['pillar', -60, { size: 1.6 }], ['pillar', 60, { size: 1.6 }], ['candelabra', 100, { light: true }]], clock: true, music: 'hourless' },
  tent: { bg: 'dusk', ground: '#6a5a3a', props: [['banner', -90, {}], ['torch', -50, { light: true }], ['crate', 40], ['torch', 80, { light: true }], ['banner', 110, {}]], music: 'event' },
  road: { bg: 'day', ground: '#7a9a4a', props: [['tree', -110], ['fence', -60], ['sign', 40], ['tree', 110, { size: 1.3 }]], music: 'event' },
  stable: { bg: 'day', ground: '#a08050', props: [['fence', -100], ['crate', -60], ['barrel', -40], ['fence', 90]], music: 'event' }
};
const speakerOf = (id, realm, sim) => {
  if (id === 'RULER') return G.RULERS[realm] || 'gareth';
  if (id === 'KNIGHT') { const ks = sim ? sim.knightsOf(realm).filter(k => !k.ruler && G.has('knight', k.id)) : []; return ks.length ? ks[0].id : (G.SQUIRE[realm] || 'lynette'); }
  return id;
};
G.scenes.event = {
  view: 'side', views: ['side'], res: 'ps1', pausable: true, touch: [], input: G.INPUT,
  enter(d) {
    d = d || {}; this.d = d; this.t = 0; this.skipT = 0; this.log = false; this.done = false;
    const sim = G.run && G.run.sim, realm = d.realm || (sim && sim.state.humans[0]) || 'verdance';
    let lines, stage, ev = null;
    if (d.prologue) { lines = G.PROLOGUE.map(t => ['narrator', t]); stage = 'clock'; this.auto = 5; }
    else if (d.lines) { lines = d.lines; stage = d.stage || 'road'; }
    else { ev = G.get('event', d.id); lines = typeof ev.lines === 'function' ? ev.lines(sim || G.CampaignSim.create({ humans: [realm], seed: 1 }), realm) : ev.lines; stage = ev.stage; }
    this.ev = ev; this.realm = realm; this.id = d.id || (d.prologue ? 'prologue' : 'lines'); G.eventScene = this;
    this.lines = lines.map(([who, text, o]) => [speakerOf(who, realm, sim), text, o || {}]);
    this.set = STAGES[stage] || STAGES.road; this.stageId = stage;
    this.bg = new E.Backdrop(this.set.bg);
    this.ledge = new E.PlatformMap({ rows: ['S'.repeat(50), 'S'.repeat(50)], legend: { S: 1 }, types: { 1: { style: 'ground', side: E.shade(this.set.ground, -.3), top: this.set.ground } }, edges: 'open' });
    // the cast: everyone who speaks, in order of first line
    const ids = []; for (const [w] of this.lines) if (w !== 'narrator' && !ids.includes(w)) ids.push(w);
    this.cast = ids.slice(0, 6).map((id, i) => { const look = G.has('knight', id) ? G.get('knight', id).look : G.has('speaker', id) ? G.get('speaker', id).look : null; return { id, rig: look ? new E.Humanoid(Object.assign({}, look)) : null, x: 400 + (i - (ids.length - 1) / 2) * 44, home: 400 + (i - (ids.length - 1) / 2) * 44, f: i < ids.length / 2 ? 0 : Math.PI, pose: null }; });
    this.i = -1; this.talk = new E.Dialog(G.game, { voice: ch => G.voice.letter(this.voiceP, ch) });
    const sp = { Normal: 40, Slow: 24, Fast: 80, Instant: 9999 }[G.settings.textSpeed] || 40; this.talk.speed = sp;
    G.music(this.set.music); G.game.weather = this.set.weather || null;
    const L = G.game.lights; L.enabled = true; L.ambient = stage === 'clock' ? .45 : stage === 'icehall' ? .7 : .85;
    this.story = new E.Story(G.game, { people: {}, nodes: { x: [] } });
    this.next();
  },
  exit() { G.game.weather = null; G.eventScene = null; },
  next() {
    this.i++;
    if (this.i >= this.lines.length) { this.finish(null); return; }
    const [who, text, o] = this.lines[this.i], last = this.i === this.lines.length - 1, ev = this.ev;
    const c = this.cast.find(c => c.id === who);
    for (const m of this.cast) { m.pose = null; m.speaking = m === c; }
    if (c) { c.pose = o.pose || null; c.expr = o.expr || null; if (o.emote) this.story.emote({ x: c.x, y: 0, z: 40, h: 40 }, o.emote === 'dots' ? 'dots' : o.emote, 2); }
    this.voiceP = G.voice.profile(who);
    const name = who === 'narrator' ? '' : G.has('knight', who) ? G.get('knight', who).short.toUpperCase() : G.has('speaker', who) ? G.get('speaker', who).name.toUpperCase() : who;
    const realm = G.has('knight', who) ? G.get('knight', who).realm : null, nameColor = realm && G.has('realm', realm) ? E.shade(G.get('realm', realm).main, .3) : '#f0e8d8';
    const choices = last && ev && ev.choices && !this.d.applied ? ev.choices.map(ch => ch.text) : null;
    const opts = { name, portrait: c && c.rig ? c.rig : undefined, nameColor, onDone: () => this.next() };
    if (choices) { opts.choices = choices; opts.onChoice = k => { this.finish(k); }; opts.onDone = undefined; }
    if (this.auto) opts.auto = this.auto;
    this.talk.say([text], opts);
    (this.backlog = this.backlog || []).push((name ? name + ': ' : '') + text.replace(/\{[^}]*\}/g, ''));
  },
  finish(choice) {
    if (this.done) return; this.done = true; this.talk.close && this.talk.open && this.talk.close();
    const d = this.d;
    if (this.ev && !d.applied) {
      if (d.onChoice) d.onChoice(choice === null && this.ev.choices ? 0 : choice);
      else if (G.run && G.run.sim) { const r = G.run.sim.apply({ t: 'event', id: this.ev.id, realm: this.realm, choice: choice === null && this.ev.choices ? 0 : choice }); G.scenes.campaign.afterEffects && G.scenes.campaign.afterEffects(r.out || [], this.realm); }
    }
    if (d.onDone) d.onDone(choice); else G.game.go(d.back || 'title');
  },
  back() { if (this.log) { this.log = false; return true; } return false; },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (G.dev.open) { G.devUpdate(dt); return; }
    if (this.log) { if (I.pressed('info') || I.pressed('cancel') || I.pressed('confirm')) { this.log = false; I.consumeAll(); } return; }
    if (I.pressed('info')) { this.log = true; G.sfx('ui_open'); return; }
    if (I.down('cancel')) { this.skipT += dt; if (this.skipT > .8) { this.skipT = -99; const ev = this.ev; if (ev && ev.choices && !this.d.applied) { this.i = this.lines.length - 2; this.talk.close(); this.next(); } else { this.talk.close(); this.finish(null); } return; } } else this.skipT = Math.max(0, this.skipT);
    if (G.autoplay && this.t > .3) { this.t = 0; if (this.talk.choices) { this.finish(0); return; } this.talk.close(); this.next(); return; }
    this.talk.update(dt); this.story.update(dt);
    for (const m of this.cast) { const target = m.speaking ? m.home + (m.f === 0 ? 10 : -10) : m.home; m.x = lerp(m.x, target, Math.min(1, dt * 6)); if (m.rig) m.rig.update(dt, { x: m.x, y: 0, z: 32, facing: m.speaking ? m.f : m.f, vx: Math.abs(target - m.x) > 1 ? (target - m.x) * 3 : 0, vy: 0, pose: m.pose, expr: m.speaking ? (m.expr || null) : null }); }
    const sp = this.cast.find(m => m.speaking); G.game.focus(sp ? lerp(400, sp.x, .3) : 400, 0, 32 + (G.game.H / 2 - 50) / -G.game.view.bz);
  },
  draw(r) {
    this.bg.draw(r); this.ledge.draw(r);
    for (const [name, dx, o] of this.set.props) r.prop(name, 400 + dx, -10, 32, Object.assign({ size: 1.2 }, o || {}));
    if (this.set.clock) r.overlay(g => { const cx = r.W / 2, cy = r.H * .32, t = G.game.real; px.disc(g, cx, cy, 44, '#140c14'); px.disc(g, cx, cy, 42, '#d8c070'); px.disc(g, cx, cy, 38, '#f0e8d8'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; px.line(g, cx + Math.cos(a) * 32, cy + Math.sin(a) * 32, cx + Math.cos(a) * 36, cy + Math.sin(a) * 36, '#3a3020', 2); } const jit = Math.sin(t * 20) * .02; px.line(g, cx, cy, cx + Math.cos(-1.2 + jit) * 30, cy + Math.sin(-1.2 + jit) * 30, '#2a2010', 2); px.line(g, cx, cy, cx + Math.cos(2 - jit) * 20, cy + Math.sin(2 - jit) * 20, '#2a2010', 3); });
    if (this.stageId === 'clock' && this.ev && /meridian|banner|candle|stillness|ending/.test(this.ev.id)) r.shape('bench', 400, -18, 32, { scale: 1.2 });
    for (const m of this.cast) if (m.rig) { r.shadow(m.x, 0, 7, .4, '#000', 32); r.actor(m.x, 0, 32, (g, ox, oy) => m.rig.draw(g, ox, oy, r.view)); }
    this.story.draw(r);
    this.talk.draw(r);
    if (this.ev && this.ev.title && this.t < 2.5) r.overlay(g => E.font.title(g, this.ev.title.toUpperCase(), r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fff8e0', '#e8c870', '#a07a30'] }));
    if (this.log) r.overlay(g => { px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); G.ui.text(g, 'BACKLOG', 12, 8, '#ffe070'); const l = this.backlog.slice(-14); let y = 22; for (const s of l) { y += G.ui.wrapText(g, s, 12, y, r.W - 24, '#e8e4f0', 10) + 2; } });
    if (this.skipT > 0) r.overlay(g => G.ui.bar(g, r.W - 70, 8, 60, this.skipT, .8, '#ff8a5a', 'SKIP'));
    G.ui.prompts(r, [['confirm', 'Next'], ['info', 'Backlog'], ['cancel', 'Hold: skip']], { y: 4 });
  }
};

// ---- 66-scene-attract.js ----
/* ---- ATTRACT MODE: a ~90 s reel that loops and cheats freely: the Wheel turning on the world map (an AI-only
 * campaign), a summoning, a showcase battle at 2× (three canned battles in rotation), the Gray Knight, the logo.
 * Any input returns to the title ---- */
const REEL = [['wheel', 12], ['summon', 8], ['battle', 45], ['graynight', 15], ['logo', 10]];
const CANNED = [
  { map: 'lakeside', season: 'winter', a: 'solmark', b: 'hoarfast', caption: 'WINTER FREEZES THE LAKE' },
  { map: 'river_ford', season: 'spring', a: 'verdance', b: 'amberlyn', caption: 'SPRING FLOODS THE FORDS' },
  { map: 'clockwork_sanctum', season: 'autumn', a: 'hoarfast', b: 'dominion', caption: 'LIGHT THE SEASON DIALS' }];
G.attractLoop = 0;
G.scenes.attract = {
  view: 'threequarter', views: ['threequarter', 'board', 'side'], res: 'ps1', input: G.INPUT, touch: [],
  enter() { this.t = 0; this.bt = 0; this.beatI = -1; this.loop = G.attractLoop++; G.attract = { beat: null }; G.idle = 0; this.grace = .4; this.startBeat(0); },
  exit() { G.attract = null; G.game.weather = null; G.game.cam.free = null; },
  startBeat(i) {
    this.beatI = i; this.bt = 0; const [beat] = REEL[i]; G.attract.beat = beat;
    if (beat === 'wheel' || beat === 'summon') {
      if (!this.camp) { this.camp = G.CampaignSim.create({ humans: [], seed: 31 + this.loop }); this.wm = new G.WorldMap(this.camp); }
      G.game.setView('threequarter'); G.music('title'); this.look = beat === 'summon' ? G.get('castle', 'rimeholt').pos.slice() : [512, 512]; this.cardT = 0;
      if (beat === 'summon') { this.wyrm = G.art.visual({ kind: 'monster', sp: 'frostwyrm', tier: 1 }); G.sting('summon'); }
    }
    if (beat === 'battle') {
      const c = CANNED[this.loop % CANNED.length], army = (realm, side) => G.armyFor(realm, realm === 'dominion' ? 14 : 12, 3);
      let spec;
      if (c.map === 'clockwork_sanctum') { const s = G.CampaignSim.create({ humans: ['hoarfast'], seed: 9 }); spec = s.battleSpec({ march: { realm: 'hoarfast', target: 'sanctum', knights: ['mordrain', 'ragnell', 'nimue'], from: {} }, kind: 'sanctum' }, 77 + this.loop); spec.sides[0].human = false; spec.sides[0].boost = .8; }
      else spec = { map: c.map, season: c.season, seed: 900 + this.loop, mode: 'siege', region: c.season, sides: [{ realm: c.a, ai: 'normal', boost: .3, troops: army(c.a) }, { realm: c.b, ai: 'normal', troops: army(c.b) }] };
      for (const s of spec.sides) s.ai = 'showcase';
      this.bsim = G.BattleSim.create(spec); if (c.map === 'clockwork_sanctum') { const S = this.bsim.state; S.base.forEach((code, i) => { if (code === 'D') S.dials[i] = i % 3 !== 0; }); }
      this.bview = new G.BattleView(this.bsim); this.bview.play([{ type: 'season', season: spec.season }]); this.caption = c.caption; this.inserts = { level: false, promo: false };
      G.game.setView('board'); G.game.weather = { winter: { kind: 'snow', amount: .5 }, spring: { kind: 'rain', amount: .3 }, autumn: { kind: 'leaves', amount: .4 } }[spec.season] || null;
      G.music(spec.mode === 'sanctum' ? 'boss' : 'battle_attack');
    }
    if (beat === 'graynight') {
      G.game.setView('side'); G.game.weather = null; G.music('hourless');
      this.bg = new E.Backdrop({ sky: ['#0a0812', '#1a1828', '#2a2838'], stars: 10, layers: [{ kind: 'castle', color: '#2a2838', y: .55, height: .45, parallax: .1 }] });
      this.stage = new E.PlatformMap({ rows: ['S'.repeat(50), 'S'.repeat(50)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#2a2838', top: '#3a3846' } }, edges: 'open' });
      this.gk = new E.Humanoid(Object.assign({}, G.get('knight', 'graynight').look)); this.me = new E.Humanoid(Object.assign({}, G.get('knight', 'meliant').look));
      this.lines = [['graynight', 'Twelve bells, little crown. Then nothing, ever again.'], ['meliant', 'Every tick is a funeral bell.'], ['graynight', 'Time is the only army I need.']];
      this.talk = new E.Dialog(G.game, { voice: ch => G.voice.letter(G.voice.profile(this.cur), ch) }); this.li = 0; this.say();
    }
    if (beat === 'logo') { G.game.setView('side'); G.game.weather = { kind: 'snow', amount: .2 }; this.bg = new E.Backdrop('castle-night'); }
  },
  say() { const [who, l] = this.lines[this.li]; this.cur = who; this.talk.say([l], { name: G.get('knight', who).short.toUpperCase(), portrait: who === 'graynight' ? this.gk : this.me, auto: 3.2, modal: false, onDone: () => { this.li++; if (this.li < this.lines.length) this.say(); } }); },
  update(dt) {
    this.grace -= dt;
    if (this.grace <= 0 && G.trackIdle(dt)) { G.game.input.consumeAll(); G.game.go('title', {}, { fade: 0 }); return; }
    if (this.grace > 0) G.trackIdle(dt);
    this.t += dt; this.bt += dt; const [beat, len] = REEL[this.beatI];
    if (this.bt >= len) { if (this.beatI + 1 >= REEL.length) { this.camp = null; this.loop = G.attractLoop++; this.startBeat(0); } else this.startBeat(this.beatI + 1); return; }
    if (beat === 'wheel') { this.cardT += dt; if (this.cardT > 3) { this.cardT = 0; this.camp.autoSeason(); if (this.camp.state.over) { this.camp = G.CampaignSim.create({ humans: [], seed: 31 + this.t | 0 }); this.wm = new G.WorldMap(this.camp); } } this.wm.refresh(); const a = this.bt * .5; this.look = [512 + Math.cos(a) * 260, 512 + Math.sin(a) * 260]; G.game.focus(this.look[0], this.look[1], 0); }
    if (beat === 'summon') { this.wyrm.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI * .6 }); G.game.focus(this.look[0], this.look[1] + 30, 0); }
    if (beat === 'battle') {
      const V = this.bview, S = this.bsim.state; V.speed = 2; V.update(dt);
      if (!V.busy && !S.over) V.play(G.BattleAI.step(this.bsim, { diff: 'normal' }));
      if (S.over && !V.busy && this.bt < len - 2) this.bt = len - 2;
      if (!this.inserts.level && this.bt > 14) { this.inserts.level = true; const u = S.units.find(x => !x.out && x.side === 0); if (u) V.play([{ type: 'levelup', u: u.id, lvl: u.lvl + 1, gains: { atk: 2, def: 1, int: 1 } }]); }
      if (!this.inserts.promo && this.bt > 28) { this.inserts.promo = true; V.banner = { s: 'A NEW FORM!', t: 0, life: 1.4, c: '#fff0a0' }; G.game.flash('#ffffff', .15, .4); }
      G.game.focus(V.look[0], V.look[1], 0);
    }
    if (beat === 'graynight') { this.talk.update(dt); this.gk.update(dt, { x: 420, y: 0, z: 32, facing: Math.PI, vx: 0, vy: 0, pose: this.bt > 10 ? 'cheer' : null }); this.me.update(dt, { x: 380, y: 0, z: 32, facing: 0, vx: 0, vy: 0, pose: 'kneel' }); G.game.focus(400, 0, 32 + (G.game.H / 2 - 50) / -G.game.view.bz); }
    if (beat === 'logo') G.game.focus(400, 0, 60);
  },
  draw(r) {
    const [beat] = REEL[this.beatI];
    if (beat === 'wheel' || beat === 'summon') {
      r.sky(['#0a1830', '#1a3a68']); const L = G.game.lights; L.enabled = true; L.ambient = .9;
      this.wm.map.drawFloor(r); this.wm.drawProps(r);
      for (const c of G.all('castle')) { r.shape(this.wm.shapeFor(c.id), c.pos[0], c.pos[1], 0, { scale: .9, facing: Math.PI / 2 }); }
      r.overlay(g => { for (const c of G.all('castle')) { const [sx, sy] = r.w(c.pos[0], c.pos[1], 46); G.art.banner(g, this.camp.owner(c.id), Math.round(sx) + 8, Math.round(sy) - 6, 1); } });
      if (beat === 'summon') { const p = G.get('castle', 'rimeholt').pos, k = Math.min(1, this.bt / 3); r.decal(g => { const [cx, cy] = r.w(p[0], p[1] + 34, 0); for (let i = 0; i < 30; i++) { const a = this.bt + i / 30 * Math.PI * 2; px.dot(g, cx + Math.cos(a) * 30, cy + Math.sin(a) * 12, i % 2 ? '#a8e8ff' : '#ffffff'); } }); r.actor(p[0], p[1] + 34, -20 + k * 20, (g, ox, oy) => this.wyrm.draw(g, ox, oy, r.view)); if (this.bt < 3) r.queue(p[0], p[1] + 34, 10, g => { const [cx, cy] = r.w(p[0], p[1] + 34, 0); px.blend(g, .5, 'add', () => px.rect(g, cx - 8, cy - 80, 16, 80, '#c8f0ff')); }, { emissive: true }); }
      this.caption2(r, beat === 'wheel' ? 'FOUR SEASONS. FOUR CROWNS. ONE STOPPED CLOCK.' : 'BIND MONSTERS TO YOUR BANNER.');
    }
    if (beat === 'battle') { this.bview.draw(r, {}); const S = this.bsim.state; this.caption2(r, this.bt < 8 ? this.caption : this.bt < 18 ? 'TWELVE BELLS TO TAKE THE KEEP' : this.bt < 30 ? 'THE SEASON SHAPES THE FIELD' : 'FELL THE KNIGHT, CAPTURE ITS BEASTS'); r.overlay(g => G.ui.text(g, 'BELL ' + S.bell + '/' + S.bells, 6, 6, '#ffe8a8')); }
    if (beat === 'graynight') { this.bg.draw(r); this.stage.draw(r); r.overlay(g => { const cx = r.W / 2, cy = r.H * .3; px.disc(g, cx, cy, 40, '#d8c070'); px.disc(g, cx, cy, 36, '#f0e8d8'); px.line(g, cx, cy, cx, cy - 30, '#2a2010', 2); px.line(g, cx, cy, cx + 14, cy + 14, '#2a2010', 3); }); for (const [x, rg] of [[420, this.gk], [380, this.me]]) r.actor(x, 0, 32, (g, ox, oy) => rg.draw(g, ox, oy, r.view)); this.talk.draw(r); }
    if (beat === 'logo') { this.bg.draw(r); r.overlay(g => { E.font.title(g, 'BRIGANTIME', r.W / 2, r.H / 2 - 40, { align: 'center', scale: 3, colors: ['#fff8e0', '#f0d070', '#c08a30', '#7a4a1a'], depth: 3 }); G.ui.text(g, 'THE LEGEND OF FORSEASONS', r.W / 2, r.H / 2 - 8, '#f0e8d8', { align: 'center' }); }); }
    r.overlay(g => { if (Math.floor(this.t * 2) % 2 === 0) G.ui.text(g, G.touchOnly() ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON', r.W / 2, r.H - 16, '#ffffff', { align: 'center' }); if (beat !== 'logo') G.ui.text(g, 'BRIGANTIME', r.W - 6, 6, '#f0d070', { align: 'right' }); });
  },
  caption2(r, s) { r.overlay(g => { px.blend(g, .6, 'normal', () => px.rect(g, 0, r.H - 40, r.W, 16, '#05040a')); G.ui.text(g, s, r.W / 2, r.H - 36, '#ffe8a8', { align: 'center' }); }); }
};

// ---- 70-dev.js ----
/* ---- DEV MODE (pause menu → Dev Mode; absent in hub sessions): tabs of tools and the live balance sliders ---- */
const DEV_TABS = ['Cheats', 'Battle', 'Campaign', 'Balance', 'View', 'Info'];
G.devState = { tab: 3, list: null, sub: null };
const humanRealm = () => G.run && G.run.sim && (G.run.sim.state.humans[0] || 'verdance');
const toast = s => G.ui.toast(s, 1.6);
G.devTrigger = (id, realm) => { const sim = G.run && G.run.sim; realm = realm || humanRealm() || 'verdance'; if (sim) { const r = sim.apply({ t: 'event', id, realm, choice: G.get('event', id).choices ? 0 : null }); if (G.scenes.campaign.afterEffects) G.scenes.campaign.afterEffects(r.out || [], realm); } G.game.go('event', { id, realm, applied: true, back: G.game.sceneName === 'event' ? 'title' : G.game.sceneName }); };
G.devJump = (season, year) => { const sim = G.run && G.run.sim; if (!sim) return; sim.state.si = Math.max(0, G.SEASONS.indexOf(season)); sim.state.year = year; G.run.flow = [{ k: 'tidings' }]; G.game.go('campaign'); };
const devRows = () => {
  const t = DEV_TABS[G.devState.tab], B = G.battle, sim = G.run && G.run.sim, R = humanRealm(), on = v => v ? 'ON' : 'OFF', mark = () => { G.dev.touched = true; if (G.run) G.run.dev = true; };
  const act = (label, fn, right) => ({ label, right, fn: () => { mark(); fn(); } });
  if (t === 'Cheats') return [
    act('God mode', () => { G.dev.god = !G.dev.god; if (B) B.sim.state.dev.god = G.dev.god; }, on(G.dev.god)), act('One-hit KOs', () => { G.dev.oneHit = !G.dev.oneHit; if (B) B.sim.state.dev.oneHit = G.dev.oneHit; }, on(G.dev.oneHit)),
    act('Infinite MP', () => { G.dev.infMP = !G.dev.infMP; if (B) B.sim.state.dev.infMP = G.dev.infMP; }, on(G.dev.infMP)), act('Free summons', () => { G.dev.freeSummon = !G.dev.freeSummon; }, on(G.dev.freeSummon)),
    act('+1000 mana', () => { if (sim) sim.state.realms[R].mana += 1000; toast('+1000 mana'); }), act('Heal all', () => { if (B) for (const u of B.sim.state.units) if (!u.out) u.hp = u.mhp; if (sim) for (const k of sim.knightsOf(R)) { k.hp = G.knightView(k).st.hp; for (const m of k.troop) sim.healMon(m); } toast('Healed'); }),
    act('Level up the selected unit +1', () => { const u = B && (B.sel || (B.cursor && B.sim.unitAt(B.cursor))); if (u) { B.sim.gainExp(u, 100, []); toast(u.name + ' Lv' + u.lvl); } else if (sim) { for (const k of sim.knightsOf(R)) G.levelUpKnight(k, sim.state.rng); toast('Every knight +1'); } }),
    act('Level up +5', () => { const u = B && (B.sel || (B.cursor && B.sim.unitAt(B.cursor))); if (u) B.sim.gainExp(u, 500, []); else if (sim) for (const k of sim.knightsOf(R)) for (let i = 0; i < 5; i++) G.levelUpKnight(k, sim.state.rng); toast('+5 levels'); }),
    { label: 'Give an item ▸', sub: () => G.all('item').map(it => act(it.name, () => { if (sim) { sim.state.realms[R].items.push(it.id); toast(it.name + ' added'); } if (B) for (const s of B.sim.state.sides) if (s.human) s.items.push(it.id); })) },
    { label: 'Add a free knight ▸', sub: () => ['lunete', 'galeron', 'blanchefleur', 'owain', 'ettard', 'hob', 'gerrow', 'dafydd', 'abbot'].map(id => act(G.get('knight', id).name, () => { if (sim && sim.addKnight(id, R)) toast(G.get('knight', id).short + ' joins'); else toast('Already in play'); })) },
    { label: 'Spawn a monster ▸', sub: () => G.all('monster').map(m => act(m.names[0], () => { if (sim) { const c = (G.campaignScene && G.campaignScene.focus) && sim.owner((G.campaignScene && G.campaignScene.focus)) === R ? (G.campaignScene && G.campaignScene.focus) : sim.capital(R); sim.state.castles[c].reserve.push(sim.newMonster(m.id, 5, 1, R)); toast(m.names[0] + ' at ' + G.get('castle', c).name); } })) },
    act('Unlock all class changes', () => { G.dev.allClasses = !G.dev.allClasses; }, on(G.dev.allClasses)), act("Reveal the AI's marches", () => { G.dev.revealAI = !G.dev.revealAI; }, on(G.dev.revealAI))];
  if (t === 'Battle') return B ? [
    act('Win now', () => { const S = B.sim.state, ps = B.playerSide === null ? 0 : B.playerSide; for (const u of S.units) if (u.side !== ps && !u.out && u.kind === 'knight') B.sim.knightOut(u, 'retreat', []); B.sim.checkWin([], false); }),
    act('Lose now', () => { const S = B.sim.state, ps = B.playerSide === null ? 0 : B.playerSide; for (const u of S.units) if (u.side === ps && !u.out && u.kind === 'knight') B.sim.knightOut(u, 'retreat', []); B.sim.checkWin([], false); }),
    act('KO the unit under the cursor', () => { const u = B.cursor && B.sim.unitAt(B.cursor); if (u) B.view.play((() => { const ev = []; B.sim.damage(u, 9999, null, ev); B.sim.checkWin(ev, false); return ev; })()); }),
    act('Next bell', () => { B.view.play((() => { const ev = []; B.sim.endBell(ev); return ev; })()); }),
    { label: 'Set the season ▸', sub: () => G.SEASONS.map(s => act(G.SEASON_NAME[s], () => { B.sim.applySeason(s); })) },
    act('AI plays my side', () => { B.allAuto = !B.allAuto; }, on(B.allAuto)), act('Delegate the rest', () => { B.allAuto = true; }),
    act('Light every Sanctum dial', () => { const S = B.sim.state; S.base.forEach((c, i) => { if (c === 'D') S.dials[i] = true; }); })] : [{ label: 'Open during a battle', disabled: true, why: 'No battle' }];
  if (t === 'Campaign') return sim ? [
    { label: 'Jump to a season ▸', sub: () => [1, 2, 3, 4].flatMap(y => G.SEASONS.map(s => act(G.SEASON_NAME[s] + ', Year ' + y, () => G.devJump(s, y)))) },
    act('Skip to the March', () => { if (sim.state.phase === 'muster') { for (const h of sim.state.humans) sim.apply({ t: 'endMuster', realm: h }); G.run.flow = [{ k: 'marchPhase' }]; } }),
    { label: 'Trigger an event ▸', sub: () => G.all('event').filter(e => e.when !== 'ending').map(e => act(e.id, () => G.devTrigger(e.id))) },
    { label: "Set the focused castle's owner ▸", sub: () => G.all('realm').map(rr => act(rr.short, () => { const c = (G.campaignScene && G.campaignScene.focus); if (c) sim.state.castles[c].owner = rr.id; })) },
    act('Run 4 AI seasons', () => { for (let i = 0; i < 4 && !sim.state.over; i++) sim.autoSeason(); G.run.flow = [{ k: 'tidings' }]; G.game.go('campaign'); }),
    act('Autoplay my realm', () => { G.autoplay = !G.autoplay; }, on(G.autoplay)),
    act('Burn the candle (-1)', () => { sim.state.candle = Math.max(0, (sim.state.candle === null ? sim.state.candleMax : sim.state.candle) - 1); }), act('Refill the candle', () => { sim.state.candle = sim.state.candleMax; }),
    { label: 'Go to an ending ▸', sub: () => [['win', 'A good ending'], ['candle', 'The candle burns out'], ['wheel', 'A rival sets the Wheel'], ['fallen', 'The last castle falls']].map(([k, l]) => act(l, () => G.game.go('ending', { kind: k, realm: k === 'wheel' ? 'solmark' : R }))) }] : [{ label: 'Open during a campaign', disabled: true, why: 'No campaign' }];
  if (t === 'Balance') return [{ label: 'Reset all to defaults', fn: () => { G.resetTune(); toast('Defaults restored'); } }].concat(G.TUNE_SPEC.map(([k, d, lo, hi, grp, label]) => ({ label: G.cap(grp).slice(0, 4) + ' • ' + label, right: (Math.round(G.tune[k] * 100) / 100) + (G.tune[k] !== d ? ' *' : ''), slider: k })));
  if (t === 'View') return [act('Hex coordinates', () => { G.dev.showCoords = !G.dev.showCoords; }, on(G.dev.showCoords)), act('Danger map', () => { G.dev.showDanger = !G.dev.showDanger; }, on(G.dev.showDanger)), act('Every Ward', () => { G.dev.showWards = !G.dev.showWards; }, on(G.dev.showWards)), act('HUD', () => { G.dev.hud = G.dev.hud === false; }, on(G.dev.hud !== false)), act('Weather', () => { G.dev.weather = !G.dev.weather; if (!G.dev.weather) G.game.weather = null; }, on(G.dev.weather)),
    { label: 'Time scale ▸', sub: () => [.25, .5, 1, 2, 4, 8].map(s => act(s + '×', () => { G.game.timeScale = s; })) }, act('The gallery', () => { G.dev.open = false; G.game.go('gallery'); }), act('Frame time readout', () => { G.game.settings.set('fps', !G.game.settings.fps); })];
  return [{ label: 'Seed: ' + (sim ? sim.state.seed : '-') }, { label: 'Build: ' + G.VERSION + ' ' + G.BUILD }, { label: 'State hash: ' + (sim ? sim.hash() : B ? B.sim.hash() : '-') }, { label: 'Errors: ' + G.game.errors.length }, act('Copy report', () => { try { const s = E.diagnose ? E.diagnose() : JSON.stringify(G.game.debug.snapshot()); if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(typeof s === 'string' ? s : JSON.stringify(s)); toast('Report copied'); } catch (e) { toast('Copy failed'); } })].concat((sim ? sim.state.chronicle.slice(-8).reverse() : []).map(c => ({ label: c.text.slice(0, 60) })));
};
G.devUpdate = dt => {
  const D = G.devState, I = G.game.input;
  if (!D.list || D.listTab !== D.tab) { D.list = new G.ui.List(devRows(), { max: 8 }); D.listTab = D.tab; D.sub = null; }
  if (I.pressed('prev') || I.pressed('next')) { D.tab = (D.tab + (I.pressed('next') ? 1 : -1) + DEV_TABS.length) % DEV_TABS.length; G.sfx('ui_move'); return; }
  const c = I.clicked(); if (c && D.tabRects) { const k = D.tabRects.findIndex(b => c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h); if (k >= 0) { D.tab = k; return; } }
  const L = D.sub || D.list, cur = L.cur;
  if (cur && cur.slider) { const k = cur.slider, sp = G.TUNE_SPEC.find(s => s[0] === k), step = (sp[3] - sp[2]) / 40, held = I.down('left') || I.down('right'); D.acc = held ? (D.acc || 0) + dt : 0; const mul = D.acc > 1 ? 5 : 1;
    if (I.repeat('left', .25, .05)) { G.tune[k] = Math.max(sp[2], Math.round((G.tune[k] - step * mul) * 1000) / 1000); G.saveTune(); G.dev.touched = true; if (G.run) G.run.dev = true; L.set(devRows()); }
    if (I.repeat('right', .25, .05)) { G.tune[k] = Math.min(sp[3], Math.round((G.tune[k] + step * mul) * 1000) / 1000); G.saveTune(); G.dev.touched = true; if (G.run) G.run.dev = true; L.set(devRows()); }
    if (I.pressed('info')) { G.tune[k] = G.TUNE_DEFAULTS[k]; G.saveTune(); L.set(devRows()); }
    const p = I.pointer(); if (I.down('confirm') === false && p && G.devState.sliderRect && I.held && I.held.has('Mouse0')) { const b = G.devState.sliderRect; if (p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y - 4 && p[1] <= b.y + 8) { G.tune[k] = Math.round((sp[2] + (sp[3] - sp[2]) * (p[0] - b.x) / b.w) * 1000) / 1000; G.saveTune(); L.set(devRows()); } }
  }
  const r = L.update(dt);
  if (r === 'back' || I.pressed('pause')) { if (D.sub) D.sub = null; else { G.dev.open = false; I.consumeAll(); } return; }
  if (r === 'pick' && cur) { if (cur.sub) { D.sub = new G.ui.List(cur.sub(), { max: 8 }); } else if (cur.fn) { cur.fn(); if (!D.sub) L.set(devRows()); else { D.sub = null; D.list.set(devRows()); } } }
};
G.devDraw = r => {
  const D = G.devState; if (!D.list) return;
  r.overlay(g => {
    const w = Math.min(r.W - 20, 380), h = Math.min(r.H - 30, 190), x = Math.round(r.W / 2 - w / 2), y = 14;
    G.ui.panel(g, x, y, w, h, 'DEV MODE', { border: '#ff6a6a', alpha: .95 });
    D.tabRects = []; DEV_TABS.forEach((t, i) => { const tx = x + 60 + i * 52; D.tabRects.push({ x: tx - 2, y: y + 3, w: 50, h: 11 }); if (i === D.tab) px.rect(g, tx - 2, y + 3, 50, 11, '#5a2a3a'); G.ui.text(g, t, tx + 23, y + 5, i === D.tab ? '#ffe070' : '#a8a0c0', { align: 'center' }); });
    const L = D.sub || D.list; L.draw(g, x + 6, y + 20, w - 12);
    const cur = L.cur; if (cur && cur.slider) { const sp = G.TUNE_SPEC.find(s => s[0] === cur.slider), bx = x + 20, by = y + h - 16, bw = w - 40; D.sliderRect = { x: bx, y: by, w: bw }; px.rect(g, bx, by, bw, 3, '#3a3448'); const f = (G.tune[cur.slider] - sp[2]) / (sp[3] - sp[2]); px.rect(g, bx, by, Math.round(bw * f), 3, '#ffd060'); px.rect(g, bx + Math.round(bw * f) - 2, by - 3, 4, 9, '#ffffff'); G.ui.text(g, sp[2] + '', bx, by + 5, '#a8a0c0', { font: 'tiny' }); G.ui.text(g, sp[3] + '', bx + bw, by + 5, '#a8a0c0', { align: 'right', font: 'tiny' }); G.ui.text(g, 'default ' + sp[1], bx + bw / 2, by + 5, '#a8a0c0', { align: 'center', font: 'tiny' }); }
    if (L.whyLine) G.ui.text(g, L.whyLine, x + w / 2, y + h - 10, '#ffb0a0', { align: 'center', font: 'tiny' });
  });
  const cur = (D.sub || D.list).cur;
  G.ui.prompts(r, cur && cur.slider ? [['left', 'Adjust (hold: faster)'], ['info', 'Reset'], ['next', 'Tab'], ['cancel', 'Close']] : [['confirm', 'Use'], ['next', 'Tab'], ['cancel', 'Close']]);
};
// the gallery: every species in all three forms, cycling actions (dev, #gallery)
G.scenes.gallery = {
  view: 'board', views: ['board', 'iso', 'threequarter', 'side'], res: 'ps1', input: G.INPUT, touch: [], camera: { zoom: [.7, 2.5], start: 1.6 },
  enter() { this.i = 0; this.t = 0; this.make(); },
  make() { const m = G.all('monster')[this.i]; this.vis = [1, 2, 3].map(t => G.art.visual({ kind: 'monster', sp: m.id, tier: t })); this.knights = G.all('knight').slice((this.i * 2) % 36, (this.i * 2) % 36 + 2).map(k => G.art.visual({ kind: 'knight', id: k.id })); },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (I.pressed('right') || I.pressed('next')) { this.i = (this.i + 1) % G.all('monster').length; this.make(); } if (I.pressed('left') || I.pressed('prev')) { this.i = (this.i + G.all('monster').length - 1) % G.all('monster').length; this.make(); }
    if (I.pressed('view')) G.game.nextView(); if (I.pressed('cancel')) { G.game.go('title'); return; }
    const acts = ['attack', 'cast', 'hurt', 'attack', 'cheer'], k = Math.floor(this.t / 1.4) % (acts.length + 1);
    if (this.lastK !== k) { this.lastK = k; for (const v of this.vis.concat(this.knights)) if (k < acts.length) v.act(acts[k], { move: v.mode === 'beast' ? ['bite', 'breath', 'claw', 'tailsweep', 'roar'][this.i % 5] : 'slash' }); }
    const walk = k === acts.length;
    this.vis.forEach((v, j) => v.update(dt, { x: 60 + j * 50 + (walk ? Math.sin(this.t * 2) * 10 : 0), y: 80, z: 0, vx: walk ? Math.cos(this.t * 2) * 20 : 0, vy: 0, facing: walk ? (Math.cos(this.t * 2) > 0 ? 0 : Math.PI) : Math.PI / 2 }));
    this.knights.forEach((v, j) => v.update(dt, { x: 90 + j * 60, y: 140, z: 0, facing: Math.PI / 2 }));
    G.game.focus(110, 100, 0);
  },
  draw(r) {
    r.sky(['#1a2030', '#2a3a50']); r.decal(g => { for (let y = 40; y < 180; y += 20) for (let x = 20; x < 220; x += 20) { const p = r.w(x, y, 0); px.dot(g, p[0], p[1], '#3a4a60'); } });
    this.vis.forEach((v, j) => { const x = 60 + j * 50; r.shadow(x, 80, 8, .4); r.actor(v.x || x, 80, 0, (g, ox, oy) => v.draw(g, ox, oy, r.view)); });
    this.knights.forEach((v, j) => r.actor(90 + j * 60, 140, 0, (g, ox, oy) => v.draw(g, ox, oy, r.view)));
    const m = G.all('monster')[this.i]; r.overlay(g => { G.ui.text(g, 'GALLERY ' + (this.i + 1) + '/30: ' + m.names.join(' > '), 6, 6, '#ffe8a8'); G.ui.text(g, 'View: ' + G.game.view.label, 6, 16, '#c8c0d8'); });
    G.ui.prompts(r, [['left', 'Species'], ['view', 'View'], ['cancel', 'Title']]);
  }
};

// ---- 80-net-hub.js ----
/* ---- AI HUB (Session Protocol v1, shared-world): "Banners of the Wheel" for 2-4 players. The host's copy runs the
 * BattleSim and is the authority; the others draw its state, animate its events and send commands for their own troop.
 * G.NetDriver ticks on setInterval(50), outside the engine's pausable update, so a pause menu never stalls the host.
 * Messages: snap (host->all), ev (host->all, ordered by n, with the state), turn, cmd (client->host), need, cur, over ---- */
G.HUB_SEATS = [{ realm: 'verdance', ruler: 'gareth', mons: [['unicorn', 10], ['pixie', 10]] }, { realm: 'solmark', ruler: 'morgause', mons: [['cinderhound', 10], ['sunbird', 10]] }, { realm: 'amberlyn', ruler: 'pellam', mons: [['scarecrow', 10], ['griffin', 9]] }, { realm: 'hoarfast', ruler: 'mordrain', mons: [['frostwolf', 10], ['icegolem', 9]] }];
G.hubSpec = (players, seed) => {
  const n = players.length, seats = n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  return { map: 'wheel_shrine', season: 'spring', seed, mode: 'shrine', region: 'spring', sides: players.map((p, i) => { const S = G.HUB_SEATS[seats[i]]; return { realm: S.realm, name: String(p.name || 'P' + (i + 1)).slice(0, 14), human: true, color: G.SEAT_COLORS[i], seat: i, anchor: String(seats[i] + 1), troops: [{ knight: Object.assign(G.makeKnightRec(S.ruler, 10), { equip: {} }), monsters: S.mons.map(([sp, l], k) => ({ uid: 'h' + i + k, sp, tier: 1, lvl: l, exp: 0 })), formation: 'vanguard' }], items: [] }; }) };
};
// the protocol driver, also testable against a fake AIHub in Node
class NetDriver {
  constructor(hub, info, o = {}) {
    this.hub = hub; this.info = info; this.isHost = !!info.isHost; this.me = info.me; this.q = []; this.n = 0; this.applied = 0; this.left = new Set(); this.auto = new Set(); this.ended = false; this.finished = false; this.deadline = null; this.turnTroop = null; this.lastAI = 0; this.curSent = 0; this.cursors = {}; this.o = o;
    this.mySide = info.players.findIndex(p => p.id === this.me);
    const seed = Math.floor(hub.rng('battle')() * 1e9);
    this.sim = G.BattleSim.create(G.hubSpec(info.players, seed));
    this.offs = [hub.on('message', (d, from) => this.q.push([d, from])), hub.on('leave', e => this.onLeave(e)), hub.on('time-up', () => { if (this.isHost) this.finish(); }), hub.on('end', e => this.onEnd(e))];
  }
  sideOf(id) { return this.info.players.findIndex(p => p.id === id); }
  now() { return this.hub.time(); }
  started() { return this.now() >= 0; }
  // host: apply a command and tell everyone
  exec(cmd) { const ev = this.sim.apply(cmd); if (ev.length && ev[0].type === 'illegal') return ev; this.n++; this.hub.send({ t: 'ev', n: this.n, events: ev, state: this.compact() }); if (this.o.onEvents) this.o.onEvents(ev); this.checkOver(); return ev; }
  compact() { const s = Object.assign({}, this.sim.state); delete s.base; return s; }
  // a client's own command goes to the host
  send(cmd) { if (this.ended) return; if (this.isHost) return this.exec(cmd); this.hub.send({ t: 'cmd', seq: ++this.seq || (this.seq = 1), cmd }); return []; }
  myTurn() { const tr = this.sim.active; return !!tr && !this.ended && this.started() && tr.side === this.mySide && !this.auto.has(tr.side) && !this.sim.state.over; }
  tick(dt) {
    if (this.ended) return;
    while (this.q.length) { const [d, from] = this.q.shift(); this.onMessage(d, from); }
    if (this.started() && this.mySide >= 0 && !this.sim.state.over) this.sendCursor(this.cursorCell || [Math.floor(this.sim.state.w / 2), Math.floor(this.sim.state.h / 2)]);   // every copy shares its look cursor
    if (!this.isHost || this.finished || !this.started()) return;
    const S = this.sim.state, tr = this.sim.active; if (S.over) { this.finish(); return; }
    if (!tr) return;
    if (this.turnTroop !== tr.id) { this.turnTroop = tr.id; this.deadline = this.now() + G.TUNE_DEFAULTS.hubTurnSeconds * 1000; this.hub.send({ t: 'turn', n: this.n, seat: tr.side, troop: tr.id, deadline: this.deadline }); }
    const owner = this.info.players[tr.side], human = owner && !this.left.has(owner.id);
    const aiTurn = !human || this.auto.has(tr.side) || this.left.has(owner.id);
    if (!aiTurn && this.now() > this.deadline) { this.auto.add(tr.side); this.hub.send({ t: 'auto', side: tr.side }); }
    if ((aiTurn || this.auto.has(tr.side)) && this.now() - this.lastAI > 300) { this.lastAI = this.now(); for (const c of G.BattleAI.next(this.sim, { diff: 'normal' })) { const ev = this.exec(c); if (ev.length && ev[0].type === 'illegal') { this.exec({ t: 'end' }); break; } } if (this.sim.active && this.sim.active.id !== tr.id) this.auto.delete(tr.side); }
  }
  onMessage(d, from) {
    if (!d || typeof d !== 'object') return;
    if (this.isHost) {
      if (d.t === 'cmd') { const side = this.sideOf(from), tr = this.sim.active; if (!tr || tr.side !== side || this.auto.has(side)) { this.hub.send({ t: 'snap', n: this.n, state: this.compact() }, { to: from }); return; } const ev = this.exec(d.cmd); if (ev.length && ev[0].type === 'illegal') this.hub.send({ t: 'snap', n: this.n, state: this.compact() }, { to: from }); }
      else if (d.t === 'need') this.hub.send({ t: 'snap', n: this.n, state: this.compact() }, { to: from });
      else if (d.t === 'cur') this.cursors[from] = d.cell;
      return;
    }
    if (from !== this.info.host) { if (d.t === 'cur') this.cursors[from] = d.cell; return; }
    if (d.t === 'ev') { if (d.n <= this.applied) return; if (d.n > this.applied + 1) this.hub.send({ t: 'need', n: this.applied }); this.load(d.state); this.applied = d.n; if (this.o.onEvents) this.o.onEvents(d.events); }
    else if (d.t === 'snap') { if (d.n >= this.applied) { this.load(d.state); this.applied = d.n; if (this.o.onSnap) this.o.onSnap(); } }
    else if (d.t === 'turn') this.deadline = d.deadline;
    else if (d.t === 'auto') this.auto.add(d.side);
    else if (d.t === 'over') { this.standings = d.standings; this.glory = d.glory; }
  }
  load(state) { const base = this.sim.state.base; this.sim.state = Object.assign({}, state, { base }); }
  sendCursor(cell) { const t = this.now(); if (t - this.curSent < 250) return; this.curSent = t; this.hub.send({ t: 'cur', seat: this.mySide, cell }, { reliable: false }); }
  onLeave(e) { this.left.add(e.id); const side = this.sideOf(e.id); if (this.isHost && side >= 0) { const S = this.sim.state, k = S.units.find(u => u.side === side && u.kind === 'knight' && !u.out); if (k) { const ev = []; this.sim.knightOut(k, 'retreat', ev); this.sim.checkWin(ev, false); if (this.sim.active && this.sim.active.gone) this.sim.nextTroop(ev); this.n++; this.hub.send({ t: 'ev', n: this.n, events: ev, state: this.compact() }); if (this.o.onEvents) this.o.onEvents(ev); } if (this.info.players.filter(p => !this.left.has(p.id)).length < 2) this.finish(); } }
  checkOver() { if (this.sim.state.over) this.finish(); }
  standingsNow() { const S = this.sim.state, live = this.info.players.map((p, i) => ({ id: p.id, g: S.sides[i].glory })).filter(x => !this.left.has(x.id)).sort((a, b) => b.g - a.g), out = []; for (const x of live) { const last = out[out.length - 1]; if (last && last.g === x.g) last.ids.push(x.id); else out.push({ g: x.g, ids: [x.id] }); } return out.map(o => o.ids); }
  finish() {
    if (!this.isHost || this.finished) return; this.finished = true;
    const S = this.sim.state, standings = this.standingsNow(), scores = {}, stats = {}, awards = [];
    this.info.players.forEach((p, i) => { scores[p.id] = S.sides[i].glory; const us = S.units.filter(u => u.side === i); stats[p.id] = { damage: us.reduce((a, u) => a + u.dealt, 0), kos: us.reduce((a, u) => a + u.kos, 0) }; });
    const best = (f, title, detail) => { let bi = -1, bv = 0; this.info.players.forEach((p, i) => { const v = f(i); if (v > bv) { bv = v; bi = i; } }); if (bi >= 0) awards.push({ id: this.info.players[bi].id, title, detail: detail(bv) }); };
    best(i => stats[this.info.players[i].id].damage, 'Giant Slayer', v => v + ' damage dealt'); best(i => stats[this.info.players[i].id].kos, 'Last Standing', v => v + ' knockouts');
    this.hub.send({ t: 'over', standings, glory: S.sides.map(s => s.glory) }); this.standings = standings;
    try { this.hub.finish({ standings, scores, stats, awards }); } catch (e) { /* the hub refused */ }
  }
  onEnd(e) { this.ended = true; this.endReason = e && e.reason; if (e && e.standings) this.standings = e.standings; for (const off of this.offs) try { off(); } catch (x) { /* gone */ } if (this.o.onEnd) this.o.onEnd(e); }
}
G.NetDriver = NetDriver;
// the hub scene: connect, build, ready, then the battle scene in hub mode
G.scenes.hub = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter() {
    this.t = 0; this.msg = 'Connecting...';
    if (G.touchOnly()) { try { AIHub.fail('Controller or keyboard required'); } catch (e) { /* no hub */ } this.msg = 'Controller or keyboard required'; return; }
    AIHub.connect({ mode: 'shared-world', seats: [2, 4] }).then(info => {
      if (!info) { G.hubActive = false; G.game.go('title'); return; }
      const net = new NetDriver(AIHub, info, { onEvents: ev => { if (G.battle && G.battle.view) { G.battle.waitNet = 0; G.battle.view.ensureUnits(); G.battle.view.play(ev); } }, onEnd: () => { try { G.game.audio.stopMusic(.1); G.game.audio.mute(true); } catch (e) { /* no sound */ } } });
      G.net = net; G.hubView = { cursors: () => Object.entries(net.cursors).map(([id, c]) => [c, G.SEAT_COLORS[net.sideOf(+id)] || '#fff']).filter(x => x[0]) };
      setInterval(() => { try { net.tick(.05); } catch (e) { if (G.game.fail) G.game.fail('hub tick', e); } }, 50);
      G.startBattle(null, { sim: net.sim, hub: true, shrine: true, back: 'hub', fade: 0, onDone: () => {} });
      AIHub.ready();
    });
  },
  update(dt) { this.t += dt; }, draw(r) { r.sky(['#0a0812', '#2a2838']); r.overlay(g => { E.font.title(g, 'BANNERS OF THE WHEEL', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] }); G.ui.text(g, this.msg, r.W / 2, r.H / 2 + 4, '#e8e0d0', { align: 'center' }); }); }
};

// ---- 90-main.js ----
/* ---- MAIN: the game, its settings, the pause menu's items, saves, game.debug, deep links, the hub hookup ---- */
E.VIEWS.board = new E.View('board', 'Board', 0, 50, 1);
const HUB = typeof AIHub !== 'undefined' && AIHub.active;
G.hubActive = HUB;
G.GAME_SETTINGS = [
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
G.run = null;   // the campaign or skirmish being played: { sim, mode, flow, ... }
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: G.INPUT, bg: '#07060d', autoPause: !HUB,
  menu: HUB ? { items: [], settings: G.GAME_SETTINGS, quit: false } : { items: () => G.pauseItems(), settings: G.GAME_SETTINGS, quit: 'title', saves: { slots: 3, version: 1, migrate: (d, from) => G.migrateSave(d, from) } } });
G.game = game;
G.settings = game.settings;
G.pauseItems = () => {
  const out = [];
  if (game.sceneName === 'campaign') out.push(['Load', () => game.saves.show('load')]);
  out.push(['How to Play', () => { game.resume(); game.go('help', { back: game.sceneName }); }]);
  if (!HUB) out.push(['Dev Mode', () => { game.resume(); G.dev.open = true; G.dev.touched = true; if (G.run) G.run.dev = true; }]);
  out.push(['About & Credits', () => { game.resume(); game.go('about', { back: game.sceneName }); }]);
  return out;
};
// saves: a campaign's sim state, the flow position and the story state
G.migrateSave = (d, from) => { if (from < 1 && d && d.campaign) d.campaign.v = 1; return d; };
game.saves.write = () => {
  const R = G.run; if (!R || !R.sim) return null;
  return { data: { v: 1, campaign: R.sim.serialize(), dev: !!R.dev, flowAt: 'muster' }, place: G.get('realm', R.sim.state.humans[0] || 'verdance').short + ' • ' + R.sim.label(), level: Math.max(...R.sim.knightsOf(R.sim.state.humans[0] || 'verdance').map(k => k.lvl).concat([1])) };
};
game.saves.read = save => { const d = save.data; G.loadCampaign(d.campaign, d.dev); };
G.loadCampaign = (state, dev) => { G.run = { sim: G.CampaignSim.load(state), mode: 'campaign', flow: [], dev: !!dev }; G.run.flow.push({ k: 'resumeMuster' }); game.go('campaign', { load: true }); };
// the debug handle tests and tools read
game.debug = {
  snapshot() {
    const R = G.run, sim = R && R.sim, sc = game.scene || {}, B = G.battle;
    return { scene: game.sceneName, phase: sim ? sim.state.phase : null, season: sim ? sim.season() : null, year: sim ? sim.state.year : null, candle: sim ? sim.state.candle : null,
      realm: sim ? sim.state.humans[0] : null, mana: sim && sim.state.humans[0] ? sim.state.realms[sim.state.humans[0]].mana : null, focus: sc.focusName ? sc.focusName() : null, panel: sc.panelName ? sc.panelName() : null,
      prompts: G.ui.shownPrompts || [], flow: R ? (R.flow[0] || {}).k : null,
      battle: B && B.sim ? { map: B.sim.state.spec.map, bell: B.sim.state.bell, troop: B.sim.active ? B.sim.active.id : null, mode: B.mode, cursor: B.cursor, over: B.sim.state.over, units: B.sim.state.units.map(u => [u.id, u.side, u.cx, u.cy, u.hp, u.mp, u.out]) } : null,
      event: G.eventScene ? G.eventScene.id : null, touchOnly: G.touchOnly(), attract: { beat: G.attract ? G.attract.beat : null }, errors: game.errors.length, over: sim ? sim.state.over : null, dev: !!(R && R.dev) };
  },
  newCampaign(o = {}) { G.newCampaign(o); },
  startBattle(spec, o = {}) { G.startBattle(spec, o); },
  sim: () => G.run && G.run.sim, bsim: () => G.battle && G.battle.sim,
  cmd: c => G.battle && G.battle.sim ? G.battle.sim.apply(c) : G.run.sim.apply(c),
  autoplay: on => { G.autoplay = on; }, setTune: (k, v) => { G.tune[k] = v; }, resetTune: () => G.resetTune(),
  trigger: (id, realm) => G.devTrigger(id, realm), jump: (season, year) => G.devJump(season, year), hash: () => G.run && G.run.sim ? G.run.sim.hash() : null, G
};
// a new campaign from setup: { realms: [humans in seat order], difficulty, seed }
G.makeCampaign = (o = {}) => {
  const seed = o.seed || ((Date.now() ^ 0x5bd1e995) >>> 0) % 1e9;
  const sim = G.CampaignSim.create({ humans: o.realms || ['verdance'], difficulty: o.difficulty || 'normal', seed });
  G.run = { sim, mode: 'campaign', flow: o.skipPrologue ? [{ k: 'tidings' }] : [{ k: 'prologue' }, { k: 'tidings' }], dev: false, seats: o.seats || null };
};
G.newCampaign = (o = {}) => { G.makeCampaign(o); game.go('campaign', {}, { fade: 'iris' }); };
G.startBattle = (spec, o = {}) => { G.battleReq = Object.assign({ spec }, o); game.go('battle', G.battleReq, { fade: o.fade || 'swirl' }); };
// boot
const steps = [
  ['Winding the Great Clock', () => { G.validate(); G.loadTune(); }],
  ['Teaching wyverns to sit', () => { G.audioInit(game); }],
  ['Counting the bells', () => { if (!E.store.get('brigantime:glyphs', false)) { if (game.settings.glyphs === 'auto') game.settings.set('glyphs', 'playstation'); E.store.set('brigantime:glyphs', true); } }],
  ['Sweeping the cross-quarter roads', () => { G.warmPortraits && G.warmPortraits(); }]
];
G.validate = () => {   // every id a spec refers to exists (fails loudly)
  const bad = [];
  for (const k of G.all('knight')) { if (!G.has('class', k.cls)) bad.push('knight ' + k.id + ' class'); for (const [sp] of k.troop) if (!G.has('monster', sp)) bad.push('knight ' + k.id + ' troop ' + sp); }
  for (const c of G.all('class')) for (const [s] of c.skills) if (!G.SPELL_FAMILY[s] && !G.has('skill', s)) bad.push('class ' + c.id + ' skill ' + s);
  for (const m of G.all('monster')) for (const t of m.skills) for (const s of t) if (!G.has('skill', s)) bad.push('monster ' + m.id + ' skill ' + s);
  for (const c of G.all('castle')) { if (!G.has('map', c.map)) bad.push('castle map ' + c.map); if (!G.has('site', c.site)) bad.push('castle site ' + c.site); if (!G.has('item', c.treasury)) bad.push('castle treasury ' + c.treasury); for (const e of c.circle) if (!G.has('monster', e.split(':')[0])) bad.push('circle ' + e); }
  for (const r in G.POOLS) for (const i of G.POOLS[r].items) if (!G.has('item', i)) bad.push('pool item ' + i);
  for (const e of G.all('event')) for (const f of [].concat(e.effects || [], ...(e.choices || []).map(c => c.effects))) { if (f.addKnight && !G.has('knight', f.addKnight)) bad.push('event ' + e.id + ' knight'); if (f.addItem && !G.has('item', f.addItem)) bad.push('event ' + e.id + ' item'); }
  if (bad.length) throw new Error('Data errors: ' + bad.join('; '));
  return true;
};
// deep links (tools, tests): #title #attract #campaign/<realm> #battle/<map>/<season> #event/<id> #ending/<id> #about #help #gallery #skirmish
const hash = (typeof location !== 'undefined' && location.hash || '').slice(1).split('/');
let first = 'title', data;
if (!HUB) {
  if (hash[0] === 'campaign') { G.makeCampaign({ realms: [G.has('realm', hash[1]) ? hash[1] : 'verdance'], seed: 7, skipPrologue: true }); G.run.sim.state.flags.tutorialDone = true; first = 'campaign'; }
  else if (hash[0] === 'muster') { const r = G.has('realm', hash[1]) ? hash[1] : 'verdance'; G.makeCampaign({ realms: [r], seed: 7, skipPrologue: true }); const sim = G.run.sim; sim.state.flags.tutorialDone = true; sim.beginSeason(); for (const id of sim.eventsFor('tidings', r)) sim.state.seen[G.get('event', id).realm === 'player' ? id + ':' + r : id] = true; G.run.flow = [{ k: 'muster', realm: r }, { k: 'marchPhase' }]; first = 'campaign'; }
  else if (hash[0] === 'battle') { first = 'battle'; data = G.battleReq = { spec: G.quickBattleSpec(G.has('map', hash[1]) ? hash[1] : 'river_ford', G.SEASONS.includes(hash[2]) ? hash[2] : 'spring'), back: 'title' }; }
  else if (hash[0] === 'event' && G.has('event', hash[1])) { first = 'event'; data = { id: hash[1], realm: hash[2] || 'verdance', back: 'title' }; }
  else if (hash[0] === 'ending') { first = 'ending'; data = { kind: hash[1] || 'win', realm: hash[2] || 'verdance' }; }
  else if (['attract', 'about', 'help', 'gallery', 'skirmish', 'title', 'setup'].includes(hash[0])) first = hash[0];
} else first = 'hub';
game.start({ scenes: G.scenes, scene: first, data, boot: { title: 'BRIGANTIME', steps } });
if (typeof window !== 'undefined') window.__game = { game, G };

})();
