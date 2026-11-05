// Brigantime: The Legend of Forseasons. Core: the G namespace, the data registry, the random number generator, hex maths,
// the live tunables. The core loop, written at the top as the plan asks:
// each season, read the tidings, muster your castles (summon, bind, move, quest, equip), declare your marches, then fight
// the battles they cause, until you can take Meridian before the Hour-Candle burns out.
// Every file in src/ is concatenated inside one IIFE in name order, with `E` (the engine) and `G` (this game) in scope.

E.Brigantime = G;   // the game's data and simulations, for the tests and the tools
G.TITLE = 'Brigantime: The Legend of Forseasons';
G.CORE_LOOP = 'Each season: read the tidings, muster your castles, declare your marches, fight what they cause.';

// ---- data registry: G.def(kind, id, spec), G.get, G.all, G.ids, G.has (the data suite checks every reference) ----
const REG = Object.create(null);
G.def = (kind, id, spec) => { (REG[kind] ||= new Map()).set(id, Object.assign({ id }, spec)); return REG[kind].get(id); };
// a skill may be named by an older id (G.SKILL_ALIAS, filled by 11-data-skills.js): the lookup follows the alias
G.resolve = (kind, id) => (kind === 'skill' && G.SKILL_ALIAS && !(REG.skill && REG.skill.has(id)) && G.SKILL_ALIAS[id] ? G.SKILL_ALIAS[id] : id);
G.has = (kind, id) => !!(REG[kind] && REG[kind].has(G.resolve(kind, id)));
G.get = (kind, id) => {
  id = G.resolve(kind, id);
  const v = REG[kind] && REG[kind].get(id);
  if (!v) throw new Error('no ' + kind + ' "' + id + '"');
  return v;
};
G.all = kind => (REG[kind] ? [...REG[kind].values()] : []);
G.ids = kind => (REG[kind] ? [...REG[kind].keys()] : []);

// ---- seeded random numbers (mulberry32). The state is plain JSON, so a saved battle replays exactly. ----
G.Rng = class Rng {
  constructor(seed = 1) { this.s = seed >>> 0; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }       // inclusive
  pick(list) { return list[Math.floor(this.next() * list.length)]; }
  chance(p) { return this.next() < p; }
  state() { return { s: this.s }; }
  static from(st) { const r = new G.Rng(1); r.s = st.s >>> 0; return r; }
};

// ---- hex maths: pointy-top hexes in axial coordinates (q, r), screen y down. ----
G.DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];          // E, NE, NW, W, SW, SE
G.DIR_ANGLE = [0, -60, -120, 180, 120, 60];                             // screen degrees for the six directions
G.key = (q, r) => q + ',' + r;
G.parseKey = k => { const [q, r] = k.split(',').map(Number); return { q, r }; };
G.hexDist = (a, b) => { const dq = a.q - b.q, dr = a.r - b.r; return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2; };
G.neighbours = (q, r) => G.DIRS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
G.offsetToAxial = (col, row) => ({ q: col - (row - (row & 1)) / 2, r: row });   // "odd-r": odd rows sit half a hex right
G.hexWorld = (q, r, size) => ({ x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r });
G.hexRound = (fq, fr) => {
  const fs = -fq - fr;
  let q = Math.round(fq), r = Math.round(fr); const s = Math.round(fs);
  const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
  return { q, r };
};
G.hexAtWorld = (x, y, size) => { const fr = y / (size * 1.5); return G.hexRound(x / (size * Math.sqrt(3)) - fr / 2, fr); };
G.hexCorners = (x, y, size) => [0, 1, 2, 3, 4, 5].map(i => {
  const a = (60 * i - 30) * Math.PI / 180;
  return [x + size * Math.cos(a), y + size * Math.sin(a)];
});
// the direction (0..5) a screen vector points in, for keyboard and stick steering across a hex board
G.dirFromVector = (mx, my) => {
  const deg = Math.atan2(my, mx) * 180 / Math.PI;
  let best = 0, bd = 999;
  for (let i = 0; i < 6; i++) {
    let d = Math.abs(((deg - G.DIR_ANGLE[i]) % 360 + 540) % 360 - 180);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
};

// ---- live tunables: dev mode writes G.tune, the sims read it every time. Hub sessions always use the defaults. ----
G.TUNE_DEFAULTS = {
  battleDamage: 1.6,    // a multiplier on every hit (the first tuning shortened battles to about ten bells)
  hitChance: 90,        // percent, before size, terrain and season
  counterDamage: .6,    // a counter-attack's share of a normal hit
  manaYield: 1.87,      // a multiplier on each castle's mana each season
  summonCost: 3.23,     // a multiplier on what a monster costs to summon
  questSeasons: 2,      // how many seasons a quest takes
  candleSeasons: 12,    // how many seasons the Hour-Candle gives the player
  bellLimit: 12,        // the bells a battle lasts before the defender holds
  rivalAggression: 1.14, // how eagerly the rival realms march (0 = never)
  knightXp: 3,          // a multiplier on the experience a knight earns
  defenderGuard: 2.72,     // the defending side's extra defence, against the attackers' strikes
  humanYield: 1,        // a multiplier on the mana the player's realms make (the Normal setting is 1)
  upkeep: 1.02,         // a multiplier on each monster's upkeep, paid each season (§4.5)
  meridianGarrison: 3   // the monsters that keep the Calendar City at the start
};
G.TUNE_RANGES = {
  battleDamage: [.5, 2, .1], hitChance: [50, 100, 5], counterDamage: [0, 1, .1], manaYield: [.5, 2, .1],
  summonCost: [.5, 2, .1], questSeasons: [1, 4, 1], candleSeasons: [6, 16, 1], bellLimit: [6, 16, 1],
  rivalAggression: [0, 2, .1], knightXp: [0, 3, .5], defenderGuard: [0, 3, .5], humanYield: [.5, 2, .1], upkeep: [0, 3, .25], meridianGarrison: [0, 9, 1]
};
G.TUNE_LABELS = {
  battleDamage: 'Battle damage', hitChance: 'Base hit chance', counterDamage: 'Counter-attack strength',
  manaYield: 'Mana per castle', summonCost: 'Summon cost', questSeasons: 'Quest length (seasons)',
  candleSeasons: 'Hour-Candle (seasons)', bellLimit: 'Bells per battle', rivalAggression: 'Rival aggression',
  knightXp: 'Knight experience', defenderGuard: 'Defenders\' guard', humanYield: 'Player mana', upkeep: 'Monster upkeep', meridianGarrison: 'Meridian garrison'
};
G.tune = Object.assign({}, G.TUNE_DEFAULTS);
G.resetTune = () => Object.assign(G.tune, G.TUNE_DEFAULTS);

// hash of a state object: a small FNV-1a over its JSON, for replays and tests
G.hash = obj => {
  const s = JSON.stringify(obj);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
};
G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
