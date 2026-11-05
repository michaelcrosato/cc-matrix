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
