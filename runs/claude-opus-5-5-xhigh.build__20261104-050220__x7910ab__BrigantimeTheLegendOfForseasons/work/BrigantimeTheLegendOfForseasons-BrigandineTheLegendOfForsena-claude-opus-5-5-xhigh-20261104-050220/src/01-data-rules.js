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
