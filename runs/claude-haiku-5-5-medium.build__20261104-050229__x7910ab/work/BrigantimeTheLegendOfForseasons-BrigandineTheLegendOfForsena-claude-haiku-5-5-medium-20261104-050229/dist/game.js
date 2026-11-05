(() => {
'use strict';
const E = My3D2dge, G = {};

// ---- src/00-core.js ----
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

// ---- src/10-data-world.js ----
// The world as data: seasons and elements, realms, castles, roads, knights, classes, items. Edit these tables to change
// the game; the sims read them, and the data suite (tests/t-data.mjs) checks that every id they name exists.

// ---- elements and seasons ----
// A hit is stronger when the attacker's element opposes the defender's (verdant and ambered, solar and rime). The
// season's own element is in Tide: it adds to the attacks of that element and takes from the opposite one.
G.OPPOSED = { verdant: 'ambered', ambered: 'verdant', solar: 'rime', rime: 'solar' };
G.def('element', 'verdant', { name: 'Verdant', color: '#7ad06a' });
G.def('element', 'solar', { name: 'Solar', color: '#ff7a4a' });
G.def('element', 'ambered', { name: 'Ambered', color: '#e8b050' });
G.def('element', 'rime', { name: 'Rime', color: '#7ac8ff' });
G.def('element', 'hour', { name: 'Hour', color: '#a090d0' });
G.def('element', 'neutral', { name: 'Neutral', color: '#c8c0b0' });

G.def('season', 'spring', { name: 'Spring', element: 'verdant', color: '#8ad870', next: 'summer',
  tidings: 'The river rises over the fords. Verdance sends word that the thaw has come early.' });
G.def('season', 'summer', { name: 'Summer', element: 'solar', color: '#ffb060', next: 'autumn',
  tidings: 'Dry wind over Solmark. The grass is pale, and the forests are waiting for a spark.' });
G.def('season', 'autumn', { name: 'Autumn', element: 'ambered', color: '#e8a040', next: 'winter',
  tidings: 'Gales off the Amberlyn coast. Crops are in, and the roads are hard to hold.' });
G.def('season', 'winter', { name: 'Winter', element: 'rime', color: '#9ad8ff', next: 'spring',
  tidings: 'Hoarfast reports ice on every river. Nothing moves far until the thaw.' });
G.SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

// ---- realms: the four playable season-realms, the Hourless Dominion (AI), and the free companies ----
G.def('realm', 'verdance', { name: 'Verdance', season: 'spring', element: 'verdant', playable: true, color: '#4ea85a', accent: '#c8f08a',
  capital: 'mossgate', motto: 'Green roots, slow oaths', ruler: 'oren' });
G.def('realm', 'solmark', { name: 'Solmark', season: 'summer', element: 'solar', playable: true, color: '#c8502a', accent: '#ffd36a',
  capital: 'brightwall', motto: 'Hard sun, hard hands', ruler: 'tamsin' });
G.def('realm', 'amberlyn', { name: 'Amberlyn', season: 'autumn', element: 'ambered', playable: true, color: '#b07a2a', accent: '#ffe0a0',
  capital: 'gildmere', motto: 'Keep the harvest, keep the road', ruler: 'wren' });
G.def('realm', 'hoarfast', { name: 'Hoarfast', season: 'winter', element: 'rime', playable: true, color: '#4a7ab8', accent: '#dff4ff',
  capital: 'frostwatch', motto: 'Hold the ice, hold the line', ruler: 'hale' });
G.def('realm', 'dominion', { name: 'The Hourless Dominion', season: null, element: 'hour', playable: false, color: '#3a3050', accent: '#b8a8e8',
  capital: 'stillhold', motto: 'No hour, no end', ruler: 'vesper' });
G.def('realm', 'free', { name: 'Free Companies', season: null, element: 'neutral', playable: false, color: '#5a4a3a', accent: '#d8c090',
  capital: null, motto: 'No banner but our own', ruler: null });
G.PLAYABLE_REALMS = ['verdance', 'solmark', 'amberlyn', 'hoarfast'];

// ---- castles on the continent (positions in a 1000 x 1000 world, y down). Meridian, the Calendar City, is the goal. ----
const CASTLE = (id, name, realm, x, y, o = {}) => G.def('castle', id, Object.assign({ name, realm, x, y, yield: 3, capital: false }, o));
CASTLE('mossgate', 'Mossgate', 'verdance', 220, 200, { capital: true, yield: 4 });
CASTLE('ferncrest', 'Ferncrest', 'verdance', 330, 300);
CASTLE('larkhold', 'Larkhold', 'verdance', 150, 340);
CASTLE('brightwall', 'Brightwall', 'solmark', 780, 200, { capital: true, yield: 4 });
CASTLE('emberfall', 'Emberfall', 'solmark', 640, 300);
CASTLE('sunspire', 'Sunspire', 'solmark', 860, 330);
CASTLE('gildmere', 'Gildmere', 'amberlyn', 780, 800, { capital: true, yield: 4 });
CASTLE('harrowvale', 'Harrowvale', 'amberlyn', 640, 700);
CASTLE('quillon', 'Quillon', 'amberlyn', 860, 660);
CASTLE('frostwatch', 'Frostwatch', 'hoarfast', 220, 800, { capital: true, yield: 4 });
CASTLE('rimecrag', 'Rimecrag', 'hoarfast', 340, 700);
CASTLE('icehollow', 'Icehollow', 'hoarfast', 140, 640);
CASTLE('stillhold', 'Stillhold', 'dominion', 500, 330, { capital: true, yield: 5 });
CASTLE('meridian', 'Meridian', 'dominion', 500, 520, { yield: 5, goal: true });
CASTLE('thornpass', 'Thornpass', 'free', 400, 170, { yield: 1 });
CASTLE('blackhollow', 'Blackhollow', 'free', 500, 830, { yield: 1 });

// ---- roads: an undirected graph. The campaign's marches follow them. ----
G.ROADS = [
  ['mossgate', 'ferncrest'], ['mossgate', 'larkhold'], ['ferncrest', 'larkhold'], ['larkhold', 'icehollow'],
  ['brightwall', 'emberfall'], ['brightwall', 'sunspire'], ['emberfall', 'sunspire'],
  ['gildmere', 'harrowvale'], ['gildmere', 'quillon'], ['harrowvale', 'quillon'], ['sunspire', 'quillon'],
  ['frostwatch', 'rimecrag'], ['frostwatch', 'icehollow'], ['rimecrag', 'icehollow'],
  ['mossgate', 'thornpass'], ['thornpass', 'brightwall'], ['thornpass', 'stillhold'],
  ['ferncrest', 'stillhold'], ['emberfall', 'stillhold'], ['stillhold', 'meridian'],
  ['meridian', 'harrowvale'], ['meridian', 'rimecrag'], ['meridian', 'emberfall'], ['meridian', 'ferncrest'],
  ['blackhollow', 'harrowvale'], ['blackhollow', 'rimecrag']
];
G.neighbourCastles = id => G.ROADS.filter(r => r[0] === id || r[1] === id).map(r => (r[0] === id ? r[1] : r[0]));

// the castle's yield in mana per season (its own realm's season doubles it)
G.castleYield = castleId => {
  const c = G.get('castle', castleId);
  return c.yield;
};

// ---- knight classes: how a knight is dressed and how its troop fights. A class names the skill a knight starts with. ----
// ---- knights: 19 named knights (4 playable rulers, realm knights, the Dominion's, the Gray Knight, the free companies) ----
// look: a Humanoid spec. voice: the pitch and lilt of the babble that speaks for them (Animalese).
const KNIGHT = (id, o) => G.def('knight', id, Object.assign({ mov: 3, bond: 3, skill: null, leader: false, level: 1, items: [], start: null, look: {}, voice: {}, quote: '' }, o));
KNIGHT('oren', { name: 'Oren', title: 'Lord of Mossgate', realm: 'verdance', element: 'verdant', cls: 'springwarden', level: 4, hp: 26, atk: 7, def: 4, mov: 3, rng: 1, bond: 4, leader: true, start: 'mossgate',
  look: { hat: 'helmet', hair: 'short', outfit: 'coat', sleeves: 'long', cape: { len: 6, width: 5, seg: 2.5 }, colors: { cloth: '#3e7a3a', coat: '#2a5a2a', trim: '#e0c060', cape: '#2a5a2a', metal: '#c8d0c0' } },
  voice: { pitch: 180, lilt: 1.1 }, quote: 'The gate is open because I opened it. Mind the mud.' });
KNIGHT('bryony', { name: 'Bryony', title: 'Warden of Ferncrest', realm: 'verdance', element: 'verdant', cls: 'archer', level: 2, hp: 17, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'ferncrest',
  look: { hat: 'band', hair: 'ponytail', outfit: 'tunic', colors: { cloth: '#5a8a3a', hair: '#7a4a2a', trim: '#f0e0a0' } }, voice: { pitch: 260, lilt: 1.3 }, quote: 'Arrows are patient. So am I.' });
KNIGHT('dunstan', { name: 'Dunstan', title: 'of the Larkhold Ford', realm: 'verdance', element: 'verdant', cls: 'squire', level: 2, hp: 21, atk: 7, def: 3, mov: 4, rng: 1, bond: 3, start: 'larkhold',
  look: { hat: null, hair: 'spiky', outfit: 'shirt', colors: { cloth: '#4a6a3a', hair: '#3a2a1a' } }, voice: { pitch: 150, lilt: .9 }, quote: 'Horses drown, knights wade. I prefer wading.' });
KNIGHT('tamsin', { name: 'Tamsin', title: 'Sun-Queen of Brightwall', realm: 'solmark', element: 'solar', cls: 'sunsovereign', level: 4, hp: 25, atk: 8, def: 3, mov: 3, rng: 1, bond: 4, leader: true, start: 'brightwall',
  look: { hat: 'crown', hair: 'long', outfit: 'coat', sleeves: 'long', cape: { len: 7, width: 5, seg: 2.5 }, colors: { cloth: '#a03a22', coat: '#7a2a1a', trim: '#ffd36a', cape: '#c8502a', hair: '#e8b860', metal: '#e8c880' } },
  voice: { pitch: 240, lilt: 1.2 }, quote: 'Brightwall does not bow to weather. Neither do I.' });
KNIGHT('ysolde', { name: 'Ysolde', title: 'of the Emberfall Wells', realm: 'solmark', element: 'solar', cls: 'adept', level: 2, hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'emberfall',
  look: { hat: 'pointed', hair: 'long', outfit: 'robe', colors: { cloth: '#7a2a40', hair: '#2a1a1a', trim: '#ffb060' } }, voice: { pitch: 300, lilt: 1.4 }, quote: 'The wells remember every fire we set. So will I.' });
KNIGHT('ferrin', { name: 'Ferrin', title: 'Sunspire Captain', realm: 'solmark', element: 'solar', cls: 'squire', level: 2, hp: 22, atk: 7, def: 3, mov: 4, rng: 1, bond: 3, start: 'sunspire',
  look: { hat: 'helmet', hair: 'short', outfit: 'shirt', colors: { cloth: '#8a3a22', hair: '#4a2a1a' } }, voice: { pitch: 170, lilt: 1 }, quote: 'Lances are for leaving things behind.' });
KNIGHT('wren', { name: 'Wren', title: 'Harvest-Lord of Gildmere', realm: 'amberlyn', element: 'ambered', cls: 'harvestking', level: 4, hp: 25, atk: 7, def: 5, mov: 3, rng: 1, bond: 4, leader: true, start: 'gildmere',
  look: { hat: 'cap', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { cloth: '#8a6a2a', coat: '#6a4a1a', trim: '#ffe0a0', hair: '#b08040' } }, voice: { pitch: 210, lilt: 1.0 }, quote: 'A harvest is a promise kept in the right order.' });
KNIGHT('marrow', { name: 'Marrow', title: 'of the Harrowvale Mill', realm: 'amberlyn', element: 'ambered', cls: 'brigand', level: 2, hp: 22, atk: 6, def: 4, mov: 3, rng: 1, bond: 3, start: 'harrowvale',
  look: { hat: 'band', hair: 'bald', outfit: 'shirt', colors: { cloth: '#6a5a3a', hair: '#2a2a2a' } }, voice: { pitch: 130, lilt: .8 }, quote: 'Grain first. Swords after.' });
KNIGHT('lark', { name: 'Lark', title: 'Quillon Runner', realm: 'amberlyn', element: 'ambered', cls: 'archer', level: 2, hp: 15, atk: 6, def: 2, mov: 5, rng: 2, bond: 3, start: 'quillon',
  look: { hat: 'cap', hair: 'ponytail', outfit: 'tunic', colors: { cloth: '#a06a2a', hair: '#d0a050', trim: '#ffd080' } }, voice: { pitch: 290, lilt: 1.5 }, quote: 'I can be at the ford before the rumour arrives.' });
KNIGHT('hale', { name: 'Hale', title: 'Ice-Lord of Frostwatch', realm: 'hoarfast', element: 'rime', cls: 'rimeduke', level: 4, hp: 27, atk: 7, def: 6, mov: 3, rng: 1, bond: 4, leader: true, start: 'frostwatch',
  look: { hat: 'helmet', hair: 'short', outfit: 'coat', sleeves: 'long', cape: { len: 6, width: 5, seg: 2.5 }, colors: { cloth: '#3a5a8a', coat: '#2a3a6a', trim: '#dff4ff', cape: '#3a5a8a', metal: '#d8e8ff' } },
  voice: { pitch: 160, lilt: .9 }, quote: 'Frost keeps what the sun can only spoil.' });
KNIGHT('brannoc', { name: 'Brannoc', title: 'of the Rimecrag Pass', realm: 'hoarfast', element: 'rime', cls: 'squire', level: 2, hp: 22, atk: 7, def: 4, mov: 4, rng: 1, bond: 3, start: 'rimecrag',
  look: { hat: 'helmet', hair: 'short', outfit: 'shirt', colors: { cloth: '#2a4a7a', hair: '#e8f0ff' } }, voice: { pitch: 140, lilt: .85 }, quote: 'The pass is ours until the thaw says otherwise.' });
KNIGHT('ilse', { name: 'Ilse', title: 'Icehollow Seer', realm: 'hoarfast', element: 'rime', cls: 'adept', level: 2, hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'icehollow',
  look: { hat: 'pointed', hair: 'long', outfit: 'robe', colors: { cloth: '#4a6a9a', hair: '#dff0ff', trim: '#9ad8ff' } }, voice: { pitch: 310, lilt: 1.3 }, quote: 'The ice remembers the shape of everything it has held.' });
KNIGHT('vesper', { name: 'Vesper', title: 'Regent of the Hourless Dominion', realm: 'dominion', element: 'hour', cls: 'chancellor', level: 5, hp: 24, atk: 8, def: 3, mov: 3, rng: 2, bond: 4, leader: true, start: 'stillhold', skill: 'frost',
  look: { hat: 'pointed', hair: 'long', outfit: 'robe', sleeves: 'long', colors: { cloth: '#2a2040', hair: '#c8c0e0', trim: '#8a78c8', skin: '#d8d0e8' } }, voice: { pitch: 330, lilt: 1.1 }, quote: 'Time is a debt. I have come to collect.' });
KNIGHT('shade', { name: 'Shade', title: 'Stillhold Watch', realm: 'dominion', element: 'hour', cls: 'squire', level: 3, hp: 24, atk: 7, def: 5, mov: 3, rng: 1, bond: 3, start: 'stillhold',
  look: { hat: 'helmet', hair: 'bald', outfit: 'coat', colors: { cloth: '#2a2a3a', coat: '#1a1a2a', trim: '#8a78c8', metal: '#6a6080' } }, voice: { pitch: 120, lilt: .75 }, quote: 'Stand still. It will not hurt for long.' });
KNIGHT('ashen', { name: 'Ashen', title: 'Meridian Warden', realm: 'dominion', element: 'hour', cls: 'squire', level: 3, hp: 24, atk: 8, def: 4, mov: 4, rng: 1, bond: 3, start: 'meridian',
  look: { hat: null, hair: 'bald', outfit: 'shirt', colors: { cloth: '#3a3048', skin: '#c8c0d8' } }, voice: { pitch: 200, lilt: .95 }, quote: 'Every bell here is mine to count.' });
KNIGHT('gray', { name: 'The Gray Knight', title: 'Keeper of the Stopped Hour', realm: 'dominion', element: 'hour', cls: 'graynight', level: 7, hp: 34, atk: 10, def: 8, mov: 3, rng: 1, bond: 5, leader: true, start: 'meridian',
  look: { hat: 'helmet', hair: null, outfit: 'coat', sleeves: 'long', cape: { len: 8, width: 6, seg: 3 }, colors: { cloth: '#6a6a72', coat: '#4a4a52', trim: '#c8c8d0', cape: '#5a5a62', metal: '#b0b4c0', skin: '#a0a0a8' } },
  voice: { pitch: 100, lilt: .7 }, quote: 'The clock stops when I say so. Not before.', size: 'L' });
KNIGHT('nessa', { name: 'Nessa', title: 'Thornpass Free Blade', realm: 'free', element: 'neutral', cls: 'squire', level: 2, hp: 20, atk: 7, def: 3, mov: 4, rng: 1, bond: 2, start: 'thornpass',
  look: { hat: 'band', hair: 'ponytail', outfit: 'tunic', colors: { cloth: '#5a4a3a', hair: '#8a5a2a' } }, voice: { pitch: 270, lilt: 1.25 }, quote: 'Nobody owns the pass. Nobody owns me.' });
KNIGHT('tobin', { name: 'Tobin', title: 'Blackhollow Bandit', realm: 'free', element: 'neutral', cls: 'brigand', level: 2, hp: 21, atk: 6, def: 4, mov: 3, rng: 1, bond: 2, start: 'blackhollow',
  look: { hat: 'cap', hair: 'spiky', outfit: 'coat', colors: { cloth: '#4a3a2a', coat: '#3a2a1a', hair: '#5a3a1a' } }, voice: { pitch: 140, lilt: .9 }, quote: 'Toll paid, road open. Simple.' });
KNIGHT('kestrel', { name: 'Kestrel', title: 'Captain of the Thorn Road', realm: 'free', element: 'neutral', cls: 'ranger', level: 3, hp: 18, atk: 7, def: 2, mov: 4, rng: 2, bond: 3, start: 'thornpass',
  look: { hat: 'band', hair: 'long', outfit: 'tunic', colors: { cloth: '#5a6a3a', hair: '#e0c080' } }, voice: { pitch: 250, lilt: 1.2 }, quote: 'Watch the high ground. Always.' });
KNIGHT('magpie', { name: 'Magpie', title: 'Taker of Shiny Things', realm: 'free', element: 'neutral', cls: 'brigand', level: 2, hp: 19, atk: 6, def: 3, mov: 4, rng: 1, bond: 2, start: 'blackhollow',
  look: { hat: 'cap', hair: 'short', outfit: 'shirt', colors: { cloth: '#2a2a2a', hair: '#1a1a1a' } }, voice: { pitch: 320, lilt: 1.45 }, quote: 'Everything is worth something to somebody.' });

// ---- items: found on quests, in events and in castle treasuries. Each knight holds one. ----
G.def('item', 'sun-rune', { name: 'Sun Rune', desc: 'Attack +2. Warm to the touch.', atk: 2, def: 0, mov: 0, icon: 'sun' });
G.def('item', 'iron-shield', { name: 'Iron Shield', desc: 'Defence +2. Heavy on the arm.', atk: 0, def: 2, mov: 0, icon: 'shield' });
G.def('item', 'swift-boots', { name: 'Swift Boots', desc: 'Move +1. Good for hills, bad for sleeping.', atk: 0, def: 0, mov: 1, icon: 'boot' });
G.def('item', 'frost-charm', { name: 'Frost Charm', desc: 'Defence +1 against Rime. Cold to hold.', atk: 0, def: 1, mov: 0, icon: 'snow' });
G.def('item', 'green-phial', { name: 'Green Phial', desc: 'Mends a knight for 8 HP when a battle begins.', atk: 0, def: 0, mov: 0, heal: 8, icon: 'phial' });

// ---- src/10b-data-classes.js ----
// The 23 knight classes of the plan (§6.6): five lines of three tiers, and eight unique classes (the five rulers, the
// Hourmaiden, the Brigand Captain and the Knight of the Thirteenth Hour). Each class gives a move, a ward radius (how far
// its monsters are guarded), a bond (how many monsters it can hold), a basic attack range, a rig, and the skills it learns
// at which level. An entry "$bolt" or "$hex" (and so on) means the knight's element's own spell of that kind (§6.7).
// Tiers two and three add the class's own bonuses to health, attack and defence when a knight changes class.
(() => {
  const H = G;
  const C = (id, o) => H.def('class', id, Object.assign({ tier: 1, unique: false, next: null, hp: 0, atk: 0, def: 0, mov: 5, ward: 2, bond: 4, rng: 1,
    weapon: 'sword', build: 'heroic', moves: ['overhead', 'slash', 'backslash'], skills: [] }, o));
  // Warrior: squire, knight, paladin
  C('squire', { name: 'Squire', line: 'warrior', tier: 1, ward: 2, bond: 5, skills: [['rally', 3]], next: 'knight' });
  C('knight', { name: 'Knight', line: 'warrior', tier: 2, ward: 3, bond: 7, hp: 6, atk: 2, def: 1, skills: [['charge', 10], ['shieldwall', 14]], next: 'paladin' });
  C('paladin', { name: 'Paladin', line: 'warrior', tier: 3, ward: 3, bond: 9, hp: 12, atk: 4, def: 2, skills: [['holystrike', 20], ['layonhands', 24]] });
  // Ranger: archer, ranger, sentinel
  C('archer', { name: 'Archer', line: 'ranger', tier: 1, rng: 2, weapon: 'gun', build: 'chibi', moves: ['cast', 'throw', 'jab'], ward: 2, bond: 4, skills: [['aimedshot', 4]], next: 'ranger' });
  C('ranger', { name: 'Ranger', line: 'ranger', tier: 2, rng: 2, weapon: 'gun', build: 'chibi', moves: ['cast', 'throw', 'jab'], ward: 3, bond: 6, hp: 6, atk: 2, def: 1, skills: [['volley', 10], ['pinning', 14]], next: 'sentinel' });
  C('sentinel', { name: 'Sentinel', line: 'ranger', tier: 3, rng: 3, weapon: 'gun', build: 'chibi', moves: ['cast', 'throw', 'jab'], ward: 3, bond: 7, hp: 12, atk: 4, def: 2, skills: [['piercing', 20], ['eagleeye', 24]] });
  // Mage: adept, sorcerer, archmage
  C('adept', { name: 'Adept', line: 'mage', tier: 1, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 2, bond: 4, skills: [['$bolt', 1], ['$hex', 6]], next: 'sorcerer' });
  C('sorcerer', { name: 'Sorcerer', line: 'mage', tier: 2, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 3, bond: 6, hp: 6, atk: 2, def: 1, skills: [['$storm', 10], ['manasiphon', 14]], next: 'archmage' });
  C('archmage', { name: 'Archmage', line: 'mage', tier: 3, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 3, bond: 7, hp: 12, atk: 4, def: 2, skills: [['$tempest', 20], ['haste', 24]] });
  // Cleric: acolyte, priest, hierophant
  C('acolyte', { name: 'Acolyte', line: 'cleric', tier: 1, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 3, bond: 5, skills: [['mend', 1], ['purify', 5]], next: 'priest' });
  C('priest', { name: 'Priest', line: 'cleric', tier: 2, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 3, bond: 7, hp: 6, atk: 2, def: 1, skills: [['renewal', 10], ['wardofseasons', 14]], next: 'hierophant' });
  C('hierophant', { name: 'Hierophant', line: 'cleric', tier: 3, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 4, bond: 8, hp: 12, atk: 4, def: 2, skills: [['greaterrenewal', 20], ['dawnlight', 24]] });
  // Beast: tamer, beastlord, beast sovereign
  C('tamer', { name: 'Tamer', line: 'beast', tier: 1, weapon: 'sword', rng: 2, bond: 7, ward: 3, skills: [['goad', 3]], next: 'beastlord' });
  C('beastlord', { name: 'Beastlord', line: 'beast', tier: 2, weapon: 'sword', rng: 2, bond: 10, ward: 4, hp: 6, atk: 2, def: 1, skills: [['packtactics', 10], ['roar', 14]], next: 'beastsovereign' });
  C('beastsovereign', { name: 'Beast Sovereign', line: 'beast', tier: 3, weapon: 'sword', rng: 2, bond: 13, ward: 4, hp: 12, atk: 4, def: 2, skills: [['callofwild', 20], ['bondoffang', 24]] });
  // The unique classes: the five rulers, the Hourmaiden, the Brigand Captain and the Gray Knight
  C('springwarden', { name: 'Springwarden', unique: true, ward: 4, bond: 10, hp: 10, skills: [['mend', 1], ['charge', 1], ['verdantoath', 6], ['bramblestorm', 10], ['verdanttempest', 16]] });
  C('sunsovereign', { name: 'Sun Sovereign', unique: true, ward: 4, bond: 11, hp: 8, atk: 2, skills: [['charge', 1], ['warcry', 6], ['cinderstorm', 10], ['solarflare', 16]] });
  C('harvestking', { name: 'Harvest King', unique: true, mov: 4, ward: 5, bond: 10, hp: 6, def: 2, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], skills: [['mend', 1], ['galeleaves', 1], ['quietcounsel', 6], ['harvestmoon', 12], ['reaping', 16]] });
  C('rimeduke', { name: 'Rime Duke', unique: true, mov: 4, ward: 4, bond: 10, hp: 8, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], skills: [['hoarfrost', 1], ['madgambit', 6], ['froststorm', 10], ['frozenhour', 12], ['blizzard', 16]] });
  C('chancellor', { name: 'Chancellor of Hours', unique: true, mov: 4, ward: 4, bond: 12, hp: 10, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], skills: [['timeshear', 1], ['stophex', 1], ['restore', 6], ['hourstorm', 10]] });
  C('hourmaiden', { name: 'Hourmaiden', unique: true, ward: 3, bond: 6, hp: 4, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], skills: [['mend', 1], ['haste', 1], ['turning', 8]] });
  C('brigand', { name: 'Brigand Captain', unique: true, ward: 3, bond: 8, hp: 8, atk: 2, weapon: 'sword', build: 'bulky', moves: ['overhead', 'hook', 'cross'], skills: [['charge', 1], ['ambush', 1]] });
  C('graynight', { name: 'Knight of the Thirteenth Hour', unique: true, ward: 5, bond: 0, hp: 10, atk: 3, def: 2, weapon: 'sword', moves: ['overhead', 'slash', 'backslash'], skills: [['thirteenthstroke', 1], ['still', 1], ['unmaking', 1], ['timeless', 1]] });
  H.CLASS_LINES = { warrior: ['squire', 'knight', 'paladin'], ranger: ['archer', 'ranger', 'sentinel'], mage: ['adept', 'sorcerer', 'archmage'], cleric: ['acolyte', 'priest', 'hierophant'], beast: ['tamer', 'beastlord', 'beastsovereign'] };
  H.PROMOTE_LEVEL = { 2: 10, 3: 20 };
  H.PROMOTE_COST = { 2: 6, 3: 12 };
  // the knight's element picks its spells at $bolt, $hex, $storm and $tempest
  H.ELEMENT_SPELL = { verdant: { bolt: 'bramble', hex: 'drowse', storm: 'bramblestorm', tempest: 'verdanttempest' }, solar: { bolt: 'cinder', hex: 'kindle', storm: 'cinderstorm', tempest: 'solarflare' },
    ambered: { bolt: 'galeleaves', hex: 'rot', storm: 'leafstorm', tempest: 'harvestmoon' }, rime: { bolt: 'hoarfrost', hex: 'frostbite', storm: 'froststorm', tempest: 'blizzard' },
    hour: { bolt: 'timeshear', hex: 'stophex', storm: 'hourstorm', tempest: 'hourstorm' }, neutral: { bolt: 'hoarfrost', hex: 'drowse', storm: 'froststorm', tempest: 'blizzard' } };
  // the skills a class has at a knight's level, its element's spells filled in
  H.classSkills = (classId, element, level) => {
    const c = H.get('class', classId), out = [];
    for (const [id, lvl] of c.skills) {
      if (level < lvl) continue;
      const sp = H.ELEMENT_SPELL[element] || H.ELEMENT_SPELL.neutral;
      const real = id === '$bolt' ? sp.bolt : id === '$hex' ? sp.hex : id === '$storm' ? sp.storm : id === '$tempest' ? sp.tempest : id;
      out.push(real);
    }
    return out;
  };
})();

// ---- src/11-data-battle.js ----
// Battle data: terrain, the monster species (two forms each), skills and the battle maps (ASCII, odd-r hexes).

// ---- terrain: cost to enter, defence it gives the unit standing on it, and what it blocks ----
G.def('terrain', 'plain', { name: 'Meadow', cost: 1, def: 0, hit: 0, glyph: '.' });
G.def('terrain', 'forest', { name: 'Forest', cost: 2, def: 2, hit: 0, glyph: 'f' });
G.def('terrain', 'hill', { name: 'Hill', cost: 2, def: 3, hit: -10, glyph: 'h' });
G.def('terrain', 'swamp', { name: 'Swamp', cost: 2, def: -1, hit: 0, glyph: 'm' });
G.def('terrain', 'ruin', { name: 'Ruin', cost: 1, def: 1, hit: 0, glyph: 'r' });
G.def('terrain', 'keep', { name: 'Keep', cost: 1, def: 2, hit: 0, glyph: 'K' });
G.def('terrain', 'bridge', { name: 'Bridge', cost: 1, def: 0, hit: 0, glyph: '=' });
G.def('terrain', 'river', { name: 'River', cost: Infinity, def: 0, hit: 0, glyph: '~' });
G.def('terrain', 'ice', { name: 'Ice', cost: 1, def: 0, hit: 0, glyph: '~' });
G.def('terrain', 'wall', { name: 'Wall', cost: Infinity, def: 0, hit: 0, glyph: '#' });
G.def('terrain', 'ash', { name: 'Ash', cost: 1, def: 0, hit: 0, glyph: ',' });
G.TERRAIN_OF_GLYPH = {};
for (const t of G.all('terrain')) G.TERRAIN_OF_GLYPH[t.glyph] = t.id;
G.TERRAIN_OF_GLYPH['a'] = 'plain';    // side 0's start cells (plain ground)
G.TERRAIN_OF_GLYPH['b'] = 'plain';    // side 1's start cells

// ---- monster species: 8 species, each with two forms (tier 1 is summoned; tier 2 is evolved at a castle) ----
// look: 'blob' (a Blob with these parts) or 'human' (a bulky or skeleton Humanoid). size: S, M or L (hit chance).
const SPECIES = (id, o) => G.def('species', id, o);
SPECIES('gleam-slime', { name: 'Gleam Slime', element: 'verdant', look: { kind: 'blob', R: 6, colors: { dk: '#2a6a3a', base: '#7ad06a', lt: '#c8f8b0', spec: '#ffffff', eye: '#ffffff', pupil: '#102010' } }, forms: [
  { name: 'Gleam Slime', hp: 14, atk: 5, def: 1, mov: 3, rng: 1, size: 'S', skill: null, cost: 2 },
  { name: 'Ooze Brute', hp: 24, atk: 8, def: 3, mov: 3, rng: 1, size: 'M', skill: 'mend', cost: 4 }] });
SPECIES('dusk-bat', { name: 'Dusk Bat', element: 'ambered', look: { kind: 'blob', R: 5, wings: true, mouth: 'fangs', colors: { dk: '#3a2a5a', base: '#6a5a8a', lt: '#9a8ac0', spec: '#e0d8ff', eye: '#ffd36a', pupil: '#201020' } }, forms: [
  { name: 'Dusk Bat', hp: 12, atk: 5, def: 1, mov: 5, rng: 1, size: 'S', skill: null, cost: 2 },
  { name: 'Vesper Bat', hp: 18, atk: 7, def: 2, mov: 5, rng: 1, size: 'S', skill: 'rally', cost: 4 }] });
SPECIES('thorn-hare', { name: 'Thorn Hare', element: 'verdant', look: { kind: 'blob', R: 6, ears: 'rabbit', feet: true, colors: { dk: '#5a4a2a', base: '#b09060', lt: '#e0c890', spec: '#fff8e0', eye: '#ffffff', pupil: '#201810' } }, forms: [
  { name: 'Thorn Hare', hp: 13, atk: 5, def: 1, mov: 4, rng: 1, size: 'S', skill: null, cost: 2 },
  { name: 'Briar Hare', hp: 20, atk: 7, def: 3, mov: 4, rng: 1, size: 'M', skill: 'guard', cost: 4 }] });
SPECIES('cinder-imp', { name: 'Cinder Imp', element: 'solar', look: { kind: 'blob', R: 6, horns: true, tail: true, feet: true, mouth: 'fangs', colors: { dk: '#7a2a10', base: '#e0602a', lt: '#ffb060', spec: '#fff0c0', eye: '#ffe060', pupil: '#300808' } }, forms: [
  { name: 'Cinder Imp', hp: 12, atk: 6, def: 1, mov: 3, rng: 2, size: 'S', skill: 'breath', cost: 3 },
  { name: 'Forge Imp', hp: 18, atk: 9, def: 2, mov: 3, rng: 2, size: 'M', skill: 'breath', cost: 5 }] });
SPECIES('frost-wisp', { name: 'Frost Wisp', element: 'rime', look: { kind: 'blob', R: 6, colors: { dk: '#2a5a8a', base: '#9ad8ff', lt: '#e8f8ff', spec: '#ffffff', eye: '#ffffff', pupil: '#102030' } }, forms: [
  { name: 'Frost Wisp', hp: 11, atk: 4, def: 1, mov: 4, rng: 2, size: 'S', skill: 'frost', cost: 3 },
  { name: 'Glacier Wisp', hp: 17, atk: 6, def: 3, mov: 4, rng: 2, size: 'M', skill: 'frost', cost: 5 }] });
SPECIES('storm-pixie', { name: 'Storm Pixie', element: 'rime', look: { kind: 'blob', R: 5, wings: true, colors: { dk: '#2a3a7a', base: '#7ab0ff', lt: '#d0e8ff', spec: '#ffffff', eye: '#fff080', pupil: '#101830' } }, forms: [
  { name: 'Storm Pixie', hp: 10, atk: 5, def: 1, mov: 5, rng: 2, size: 'S', skill: 'thunder', cost: 3 },
  { name: 'Thunder Pixie', hp: 15, atk: 8, def: 2, mov: 5, rng: 2, size: 'M', skill: 'thunder', cost: 5 }] });
SPECIES('stone-golem', { name: 'Stone Golem', element: 'hour', look: { kind: 'human', build: 'bulky', size: 1.5, colors: { cloth: '#6a6670', skin: '#8a8690', metal: '#aaa6b0' } }, forms: [
  { name: 'Stone Golem', hp: 30, atk: 8, def: 6, mov: 2, rng: 1, size: 'L', skill: 'guard', cost: 5 },
  { name: 'Basalt Colossus', hp: 44, atk: 11, def: 9, mov: 2, rng: 1, size: 'L', skill: 'rally', cost: 8 }] });
SPECIES('bonewalker', { name: 'Bonewalker', element: 'hour', look: { kind: 'human', build: 'skeleton', size: 1.25, colors: { bone: '#d8d0c0', cloth: '#3a3048' } }, forms: [
  { name: 'Bonewalker', hp: 16, atk: 6, def: 2, mov: 3, rng: 1, size: 'M', skill: null, cost: 4 },
  { name: 'Dread Warden', hp: 24, atk: 9, def: 4, mov: 3, rng: 1, size: 'M', skill: 'charge', cost: 7 }] });
G.SIZE_HIT = { S: { S: 0, M: 0, L: -5 }, M: { S: 5, M: 0, L: 0 }, L: { S: 10, M: 5, L: 0 } };   // hit bonus by attacker, then defender size
G.speciesForm = (id, form) => { const s = G.get('species', id); return Object.assign({ species: id, element: s.element, look: s.look }, s.forms[form]); };
G.MONSTER_FORMS = id => G.get('species', id).forms.length;

// ---- battle maps: ASCII rows (odd-r hexes). a: side 0's start, b: side 1's start, K: the Keep (side 0 wins by standing on it).
// glyphs: . meadow  f forest  h hill  m swamp  r ruin  ~ river  = bridge  # wall  K keep  a b start cells
G.def('map', 'meadow', { name: 'Border Meadow', season: 'spring', keep: true, tutorial: true, rows: [
  'aa..f....bb', 'a.f..h...b.', 'a..f.~~~..b', '..h..~=~...', '..f..~=~.K.', '....~=~.f..', 'a..f...h..b', 'a.a....f.bb', 'aa.h.....bb'] });
G.def('map', 'ford', { name: 'The Ford', season: 'summer', keep: true, rows: [
  'aa.f...ff.b', 'a..~~~....b', 'a.f~=~..h.b', '..h~=~.....', 'a..f.~.~..K', 'a.h....ff.b', 'a..~~~.f..b', 'aa...h...bb', 'a.f.....bbb'] });
G.def('map', 'keep', { name: 'The Sunken Keep', season: 'autumn', keep: true, rows: [
  'a..#####..b', 'a..#...#..b', 'aa.#.h.#.bb', 'a.f#...#.b.', 'a..f.K..b..', 'a.f#...#.bb', 'aa.#.h.#.bb', 'a..#...#..b', 'a..#####..b'] });
G.MAP_ROWS_WIDTH = 11;

// ---- src/11-data-skills.js ----
// The 90 skills and spells of the plan's table (§6.7). Each names its kind (special, spell or passive), its element, its
// power (P: a damage multiplier, or a heal), its range, its area, who it touches, its cost, whether it may be used after
// a move, and its status effects. Statuses: [name, chance %, bells]. A special or spell costs a cooldown (its MP cost
// divided by four, at least one bell); a passive works all the time. Areas: single, r1, r2 (around the target), self-r1,
// self-r2, self, adj, cone2, cone3, line3, line4. Filters: foes, allies, own, any, self.
// Statuses the battle knows: valor (+2 attack), warded (+3 defence), haste (+2 move), chill (-2 move), sleep and stop
// (lose the turn), poison and burn (2 harm a bell), weakened (-2 attack), frostarmor (+40% defence), windup (next strike x1.5).
(() => {
  const H = G;
  const ELEM = { Sp: 'verdant', Su: 'solar', Au: 'ambered', Wi: 'rime', Hour: 'hour', none: 'neutral', user: 'user' };
  // S(id, name, kind, elem, power, range, area, filter, cost, mobile, effects, extra, desc)
  const S = (id, name, kind, elem, power, range, area, filter, cost, mobile, effects, extra, desc) => {
    const cd = kind === 'passive' ? 0 : extra && extra.cd ? extra.cd : Math.max(1, Math.ceil(cost / 4));
    return H.def('skill', id, Object.assign({ name, kind, elem: ELEM[elem] || elem, power, range, area, filter, cost, mobile: !!mobile,
      effects: effects || [], cd, desc: desc || '' }, extra || {}));
  };
  const P = (heal) => ({ heal });
  // the eleven knightly and common skills
  S('rally', 'Rally', 'special', 'none', null, [0, 0], 'self-r1', 'allies', 4, true, [['valor', 100, 2]], null, 'Adjacent allies gain valor: +2 attack for two bells.');
  S('charge', 'Charge', 'special', 'user', 1.3, [1, 1], 'single', 'foes', 5, true, [], { needMove: 2 }, 'Must move two hexes first, then strikes at 1.3 power.');
  S('shieldwall', 'Shield Wall', 'special', 'none', null, [0, 0], 'adj', 'allies', 6, true, [['warded', 100, 1]], null, 'Adjacent allies are warded for a bell.');
  S('holystrike', 'Holy Strike', 'special', 'none', 1.5, [1, 1], 'single', 'foes', 8, true, [], { vsHour: 1.5, ignoreElem: true }, 'Ignores element; 1.5 times the damage against the Hour.');
  S('layonhands', 'Lay on Hands', 'special', 'none', P(60), [1, 1], 'single', 'allies', 10, true, [], null, 'Heals an adjacent ally for 60.');
  S('aimedshot', 'Aimed Shot', 'special', 'user', 1.2, [2, 4], 'single', 'foes', 4, false, [], { hit: 20 }, 'A careful shot at two to four hexes: +20 to hit.');
  S('volley', 'Volley', 'special', 'user', 0.8, [3, 5], 'r1', 'foes', 8, false, [], null, 'Arrows across a patch of ground, three to five hexes away.');
  S('pinning', 'Pinning Shot', 'special', 'user', 0.9, [2, 4], 'single', 'foes', 6, true, [['chill', 70, 2]], null, 'Chills the target, slowing it.');
  S('piercing', 'Piercing Arrow', 'special', 'user', 1.1, [1, 4], 'line4', 'foes', 10, false, [], null, 'Every unit along a line of four hexes.');
  S('eagleeye', 'Eagle Eye', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { bowRange: 1 }, 'Bows reach one hex further.');
  // the bolts, the hexes, the storms and the tempests
  S('bramble', 'Bramble Bolt', 'spell', 'verdant', 14, [1, 4], 'single', 'foes', 5, false, [], null, 'A bolt of thorns.');
  S('cinder', 'Cinder Bolt', 'spell', 'solar', 14, [1, 4], 'single', 'foes', 5, false, [], null, 'A bolt of ember.');
  S('galeleaves', 'Gale of Leaves', 'spell', 'ambered', 14, [1, 4], 'single', 'foes', 5, false, [], null, 'A bolt of whirling leaves.');
  S('hoarfrost', 'Hoarfrost', 'spell', 'rime', 14, [1, 4], 'single', 'foes', 5, false, [], null, 'A bolt of rime.');
  S('timeshear', 'Time Shear', 'spell', 'hour', 14, [1, 4], 'single', 'foes', 5, false, [], { ignoreTide: true }, 'A bolt that ignores the season\'s tide.');
  S('drowse', 'Drowse', 'spell', 'verdant', null, [1, 4], 'single', 'foes', 6, false, [['sleep', 60, 1]], null, 'Puts the target to sleep for a bell.');
  S('kindle', 'Kindle', 'spell', 'solar', null, [1, 4], 'single', 'foes', 6, false, [['burn', 70, 2]], null, 'Sets the target burning.');
  S('rot', 'Rot', 'spell', 'ambered', null, [1, 4], 'single', 'foes', 6, false, [['poison', 70, 2]], null, 'Poisons the target.');
  S('frostbite', 'Frostbite', 'spell', 'rime', null, [1, 4], 'single', 'foes', 6, false, [['chill', 70, 2]], null, 'Chills the target.');
  S('stophex', 'Stop Hex', 'spell', 'hour', null, [1, 4], 'single', 'foes', 6, false, [['stop', 40, 1]], null, 'Stops the target for a bell, 40% of the time.');
  S('bramblestorm', 'Bramble Storm', 'spell', 'verdant', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'Thorns across a patch of ground.');
  S('cinderstorm', 'Cinder Storm', 'spell', 'solar', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'Fire across a patch of ground; sets a forest burning.');
  S('leafstorm', 'Leaf Storm', 'spell', 'ambered', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'Leaves across a patch of ground.');
  S('froststorm', 'Frost Storm', 'spell', 'rime', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'Rime across a patch of ground.');
  S('hourstorm', 'Hour Storm', 'spell', 'hour', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'The hour falls across a patch of ground.');
  S('verdanttempest', 'Verdant Tempest', 'spell', 'verdant', 34, [1, 5], 'r2', 'foes', 16, false, [['sleep', 20, 1]], null, 'A storm of green over two hexes around the target.');
  S('solarflare', 'Solar Flare', 'spell', 'solar', 34, [1, 5], 'r2', 'foes', 16, false, [['burn', 30, 2]], { burnsForest: true }, 'A flare that burns and sets forests alight.');
  S('harvestmoon', 'Harvest Moon', 'spell', 'ambered', 34, [1, 5], 'r2', 'foes', 16, false, [], { drainPct: 25 }, 'A moon that takes a quarter of its damage back.');
  S('blizzard', 'Blizzard', 'spell', 'rime', 34, [1, 5], 'r2', 'foes', 16, false, [['chill', 30, 2]], null, 'Snow across two hexes around the target.');
  S('manasiphon', 'Mana Siphon', 'spell', 'neutral', null, [1, 4], 'single', 'foes', 2, false, [['weakened', 60, 2]], null, 'Drains the target\'s strength (the plan\'s MP theft, as a weakening).');
  S('haste', 'Haste', 'spell', 'neutral', null, [0, 3], 'single', 'allies', 8, false, [['haste', 100, 2]], null, 'An ally moves two hexes further for two bells.');
  S('mend', 'Mend', 'spell', 'neutral', P(30), [0, 3], 'single', 'allies', 5, false, [], null, 'Heals an ally for 30.');
  S('purify', 'Purify', 'spell', 'neutral', null, [0, 3], 'single', 'allies', 4, false, [], { cleanse: true }, 'Clears an ally\'s statuses and debuffs.');
  S('renewal', 'Renewal', 'spell', 'neutral', P(24), [0, 3], 'r1', 'allies', 10, false, [], null, 'Heals every ally around the target for 24.');
  S('wardofseasons', 'Ward of Seasons', 'spell', 'neutral', null, [0, 3], 'r1', 'allies', 9, false, [['warded', 100, 2]], null, 'Allies around the target are warded for two bells.');
  S('greaterrenewal', 'Greater Renewal', 'spell', 'neutral', P(36), [0, 4], 'r2', 'allies', 16, false, [], null, 'Heals every ally within two of the target for 36.');
  S('dawnlight', 'Dawnlight', 'spell', 'none', 26, [1, 4], 'r1', 'foes', 14, false, [], { vsHour: 1.5, ignoreTide: true }, 'Light across a patch of ground: 1.5 times against the Hour.');
  S('goad', 'Goad', 'special', 'none', null, [1, 2], 'single', 'own', 3, true, [['valor', 100, 1], ['haste', 100, 1]], null, 'Spurs one of the knight\'s monsters on: valor and haste for a bell.');
  S('packtactics', 'Pack Tactics', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { packHit: 10 }, 'The knight\'s monsters hit 10 more often.');
  S('roar', 'Roar', 'special', 'none', null, [0, 0], 'self-r2', 'foes', 6, true, [['weakened', 60, 2]], null, 'Foes within two hexes are weakened.');
  S('callofwild', 'Call of the Wild', 'special', 'none', { pctMax: 20 }, [0, 0], 'self', 'own', 12, true, [], null, 'Heals the troop\'s monsters for a fifth of their maximum.');
  S('bondoffang', 'Bond of Fang', 'special', 'none', null, [0, 0], 'self', 'own', 10, true, [['valor', 100, 2], ['warded', 100, 2], ['haste', 100, 2]], { ward: true }, 'One monster in the knight\'s ward gains valor, ward and haste.');
  S('verdantoath', 'Verdant Oath', 'special', 'verdant', { pctMax: 10 }, [0, 0], 'self', 'allies', 10, true, [['warded', 100, 2]], { ward: true }, 'Allies in the ward heal a tenth and are warded.');
  S('warcry', 'Warcry', 'special', 'solar', null, [0, 0], 'self', 'allies', 8, true, [['valor', 100, 2]], { ward: true }, 'Allies in the ward gain valor.');
  S('quietcounsel', 'Quiet Counsel', 'special', 'ambered', null, [0, 0], 'self', 'allies', 10, true, [['haste', 100, 1]], { ward: true }, 'Allies in the ward gain haste.');
  S('reaping', 'Reaping', 'spell', 'ambered', 20, [1, 3], 'single', 'foes', 8, false, [], { drainPct: 50 }, 'Strikes and takes back half the harm as health.');
  S('madgambit', 'Mad Gambit', 'special', 'rime', 30, [1, 3], 'single', 'foes', 6, true, [], { magic: true }, 'A magic strike at 30 power.');
  S('frozenhour', 'Frozen Hour', 'spell', 'rime', null, [1, 4], 'single', 'foes', 12, false, [['stop', 70, 1]], null, 'Stops the target for a bell, 70% of the time.');
  S('restore', 'Restore', 'spell', 'hour', { pctMax: 50 }, [0, 3], 'single', 'allies', 14, false, [], null, 'Restores half an ally\'s maximum health.');
  S('turning', 'Turning', 'special', 'none', 40, [1, 1], 'r1', 'foes', 0, true, [], { magic: true, vsHour: 2, once: true }, 'Once a battle: 40 magic power against all around, twice against the Hour.');
  S('ambush', 'Ambush', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { forestBonus: 1.3 }, 'Attacks from a forest hex deal 30% more.');
  S('thirteenthstroke', 'Thirteenth Stroke', 'special', 'hour', 1.6, [1, 1], 'r1', 'foes', 0, true, [], { cd: 4 }, 'The Gray Knight\'s blow, at 1.6 power.');
  S('still', 'Still', 'special', 'hour', null, [0, 0], 'self-r2', 'foes', 0, true, [['stop', 70, 1]], { cd: 3 }, 'Every third bell: foes within two hexes stop.');
  S('unmaking', 'Unmaking', 'spell', 'hour', { pctTarget: 25 }, [1, 3], 'single', 'foes', 20, false, [], { ignoreDef: true }, 'Takes a quarter of the target\'s maximum health, ignoring defence.');
  S('timeless', 'Timeless', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { timeless: true }, 'Takes half damage from every strike.');
  S('pollenpuff', 'Pollen Puff', 'special', 'verdant', null, [0, 0], 'self-r1', 'foes', 6, true, [['sleep', 50, 1]], null, 'Foes beside it fall asleep half the time.');
  S('entangle', 'Entangle', 'special', 'verdant', 0.6, [1, 2], 'single', 'foes', 5, false, [['chill', 70, 2]], null, 'Vines strike and chill.');
  S('scream', 'Mandrake Scream', 'special', 'verdant', null, [0, 0], 'self-r2', 'foes', 10, false, [['sleep', 50, 1]], null, 'Foes within two hexes fall asleep half the time.');
  S('sleepdust', 'Sleep Dust', 'spell', 'verdant', null, [1, 3], 'r1', 'foes', 8, false, [['sleep', 60, 1]], null, 'Sleep across a patch of ground.');
  S('thorns', 'Thorns', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { thorns: 10 }, 'Melee attackers take a tenth of the harm they deal.');
  S('rootsweep', 'Root Sweep', 'special', 'verdant', 0.9, [0, 0], 'adj', 'foes', 6, true, [], null, 'Roots sweep every foe beside it.');
  S('dive', 'Dive', 'special', 'user', 1.2, [1, 1], 'single', 'foes', 4, true, [], { needMove: 2, fliers: true }, 'Fliers: must move two hexes, then dive.');
  S('torrent', 'Torrent', 'special', 'verdant', 1.0, [0, 0], 'line3', 'foes', 6, false, [], null, 'A rush of water along three hexes.');
  S('coil', 'Coil', 'special', 'user', 0.8, [1, 1], 'single', 'foes', 4, true, [['chill', 60, 2]], null, 'Coils round the target and chills it.');
  S('emberspit', 'Ember Spit', 'special', 'solar', 0.9, [1, 2], 'single', 'foes', 3, true, [['burn', 30, 2]], null, 'Spits fire at one or two hexes.');
  S('firebreath', 'Fire Breath', 'special', 'solar', 1.2, [0, 0], 'cone2', 'foes', 8, false, [['burn', 25, 2]], { cone3ForDragons: true }, 'A cone of fire two hexes deep.');
  S('howl', 'Howl', 'special', 'neutral', null, [0, 0], 'self-r2', 'allies', 5, true, [['valor', 100, 1]], null, 'Allies within two hexes gain valor for a bell.');
  S('pounce', 'Pounce', 'special', 'user', 1.2, [1, 1], 'single', 'foes', 5, true, [], null, 'Leaps on an adjacent foe.');
  S('rebirth', 'Rebirth', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { rebirth: 30 }, 'Once a battle, at zero health it rises again with 30%.');
  S('sunriddle', 'Sun Riddle', 'special', 'solar', null, [0, 0], 'self-r1', 'foes', 8, false, [['sleep', 50, 1]], null, 'Foes beside it fall asleep half the time.');
  S('wispfire', 'Wisp Fire', 'special', 'ambered', 0.9, [1, 3], 'single', 'foes', 4, true, [], { magic: true }, 'A magic flame that flickers at range.');
  S('fear', 'Fear', 'special', 'ambered', null, [0, 0], 'self-r1', 'foes', 5, true, [['weakened', 60, 2]], null, 'Foes beside it are weakened.');
  S('drain', 'Drain', 'special', 'user', 1.0, [1, 1], 'single', 'foes', 4, true, [], { drainPct: 50 }, 'Strikes and takes back half the harm as health.');
  S('gravechill', 'Grave Chill', 'special', 'rime', null, [0, 0], 'self-r1', 'foes', 7, false, [['chill', 40, 2]], null, 'Foes beside it are chilled.');
  S('gale', 'Gale', 'special', 'ambered', 0.7, [1, 1], 'single', 'foes', 5, true, [], { push: 1 }, 'Pushes the target one hex away; if blocked, four more harm.');
  S('trample', 'Trample', 'special', 'user', 1.0, [0, 0], 'line3', 'foes', 6, true, [], null, 'Tramples along three hexes.');
  S('thickhide', 'Thick Hide', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { defPct: 10 }, 'Defence +10%.');
  S('frostarmor', 'Frost Armor', 'special', 'rime', null, [0, 0], 'self', 'self', 5, true, [['frostarmor', 100, 2]], null, 'Defence +40% for two bells.');
  S('avalanche', 'Avalanche', 'special', 'rime', 1.0, [1, 2], 'r1', 'foes', 9, false, [], null, 'Ice falls over a patch of ground.');
  S('hurlice', 'Hurl Ice', 'special', 'rime', 1.0, [2, 3], 'single', 'foes', 5, false, [], null, 'A lump of ice at range.');
  S('frostfang', 'Frost Fang', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { onHitChill: 30 }, 'Basic attacks chill the target 30% of the time.');
  S('frostbreath', 'Frost Breath', 'special', 'rime', 1.2, [0, 0], 'cone3', 'foes', 8, false, [['chill', 40, 2]], null, 'A cone of frost three hexes deep.');
  S('tailsweep', 'Tail Sweep', 'special', 'user', 0.9, [0, 0], 'adj', 'foes', 6, true, [], null, 'Sweeps every foe beside it with the tail.');
  S('windup', 'Wind-up', 'special', 'none', null, [0, 0], 'self', 'self', 3, true, [['windup', 100, 1]], null, 'Its next basic attack deals 1.5 times the damage.');
  S('pendulum', 'Pendulum', 'special', 'hour', 1.1, [0, 0], 'adj', 'foes', 6, true, [], null, 'Swings through every foe beside it.');
  S('stopbite', 'Stopping Bite', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { onHitStop: 20 }, 'Basic attacks stop the target 20% of the time.');
  S('engulf', 'Engulf', 'special', 'user', 0.9, [1, 1], 'single', 'foes', 4, true, [['poison', 40, 2]], null, 'Engulfs the target and poisons it.');
  S('regenerate', 'Regenerate', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { regen: 10 }, 'Heals a tenth of its maximum at the start of its turn.');
  S('groundpound', 'Ground Pound', 'special', 'user', 1.0, [0, 0], 'adj', 'foes', 7, true, [], null, 'Pounds every foe beside it.');
  S('screech', 'Screech', 'special', 'none', null, [0, 0], 'self-r1', 'foes', 5, true, [['weakened', 60, 2]], null, 'Foes beside it are weakened.');
  // the alias the species and classes of the first bestiary used, now the plan's own ids
  G.SKILL_ALIAS = { breath: 'firebreath', frost: 'frostbreath', thunder: 'hurlice', guard: 'shieldwall', 'stun-strike': 'coil', venom: 'engulf',
    pierce: 'aimedshot', sweep: 'groundpound', shield: 'wardofseasons', 'mend-greater': 'greaterrenewal', 'cinder-bolt': 'cinder',
    warhowl: 'warcry', crush: 'trample', 'dusk-hex': 'stophex', 'bone-ward': 'shieldwall', 'chain-lightning': 'wispfire' };
  for (const k of Object.keys(G.SKILL_ALIAS)) { if (!H.has('skill', G.SKILL_ALIAS[k])) throw new Error('alias ' + k); }
  G.skillId = id => (G.SKILL_ALIAS[id] && !H.has('skill', id) ? G.SKILL_ALIAS[id] : id);
})();

// ---- src/12-data-story.js ----
// The story's text and the About screen's text. The story is earnest and brief, like the source's vignettes: short
// sentences, a little formal, the lines spoken by knights who each have a voice of their own.

// the tutorial: the Border Meadow, spring, a Verdance troop holding the west edge against a Dominion raid
G.TUTORIAL_LINES = [
  { who: 'oren', text: 'Mossgate has seen flood and fire this year. Now the Dominion\'s raiders have reached the meadow. Hold it with me.' },
  { who: 'bryony', text: 'Arrows first. Move the cursor with the stick, press A to choose a hex, then A on a foe to strike.' },
  { who: 'dunstan', text: 'Mind the river. Only the bridge crosses it, and the spring floods the low ground beside it.' },
  { who: 'oren', text: 'Win by standing a knight on the keep, or by beating every foe. My gray friend in the keep will be waiting.' }
];
G.tutorialBattle = game => ({
  sim: G.BattleSim.create({ map: 'meadow', season: 'spring', seed: 3, tutorial: true, title: 'Border Meadow',
    sides: [{ troops: G.SKIRMISH.player }, { troops: G.SKIRMISH.foe }] }),
  playerSide: 0, askDelegate: false,
  onDone: () => game.go('title')
});

// the four endings: the campaign's outcome (CampaignSim.outcome) and the words the ending screen shows
G.ENDINGS = {
  'won-verdance': { title: 'MERIDIAN IS GREEN', body: 'Verdance comes up the road with its banners in the wind. The Calendar City opens to the spring, and the bells take up the count again.' },
  'won-solmark': { title: 'MERIDIAN IS BRIGHT', body: 'Solmark\'s sun falls on the Calendar City at last. The Gray Knight is carried out under it, and the hour is set going again by hard hands.' },
  'won-amberlyn': { title: 'MERIDIAN IS GATHERED', body: 'Amberlyn brings in the last harvest of the war at Meridian. The bells ring the autumn hour, and the roads are held once more.' },
  'won-hoarfast': { title: 'MERIDIAN IS HELD', body: 'Hoarfast holds the Calendar City through the long winter. The frost lies on the bells, and the hour turns as it should, slowly and certainly.' },
  candle: { title: 'THE CANDLE IS OUT', body: 'The Hour-Candle gutters and goes dark. The Gray Knight stops the bells, and no realm can say which season it is.' },
  ruler: { title: 'THE RULER HAS FALLEN', body: 'Your ruler is carried from the field. The banners come down one by one, and the other realms divide what is left.' },
  'lost-meridian': { title: 'MERIDIAN IS TAKEN', body: 'Another realm holds the Calendar City, and its bells keep a different hour. The war is not over. Yours is.' }
};

// the About and credits screen. It carries the Source Information, the feedback lists the brief asks for, and what is not built.
G.ABOUT = [
  { heading: 'Brigantime: The Legend of Forseasons', lines: [
    'A tactical strategy game in the spirit of Brigandine: The Legend of Forsena. Four seasons, four realms, one clock running out. Built on my-3D2dge (v0.85.2) and AI Hub Session Protocol v1.',
    'Made by Claude Haiku 5.5 (Anthropic). Every sound, voice, picture and song is drawn or synthesised in code.'] },
  { heading: 'Source Information', lines: [
    'Date: 2026-11-04 05:02:29',
    'Source: Brigandine: The Legend of Forsena (Hearty Robin, 1998). Used for its tactics, its seasons of war and its tone.',
    'Plan: PLAN.md, written by claude-opus-5-5 at max effort. Followed in its architecture and most of its content counts.',
    'Genre: turn-based strategy with a tactical hex battle layer. Perspective: an overhead map of the continent, a tilted hex board for battles, and dialogue scenes.',
    'Tech: JavaScript on the my-3D2dge engine (v0.85.2, unchanged), canvas 2D, Web Audio, and the AI Hub client session.js v1.4.0.',
    'Art direction: the engine\'s pixel style. Humanoid and Blob rigs for knights and monsters, a painted continent, castles and banners drawn in code.',
    'Animation: the engine\'s rigs and move set (E.move strikes, poses and walks), and a bell-by-bell event queue for battles.',
    'Audio: five songs, sound effects and Animalese babble voices, all synthesised in code. No audio files.',
    'Online: AI Hub, shared-world mode, 2 to 4 players. One battle; each player commands their own troop; the host copy runs the world.',
    'Testing: 546 headless checks (node tests/run.mjs), five browser playthroughs (node tests/run.mjs --browser), balance runs, Playwright screenshots of the screens, and the AI Hub harness in shared-world mode: 2 and 4 players, under latency and loss, with a host leaving, and with a host that has no player.',
    'Research: the engine\'s API card, guide and kits, and the AI Hub README. No web search.',
    'Environment: Claude Code CLI (headless); Linux (WSL2); browser unknown.',
    'Model: Anthropic, claude-haiku-5-5, reasoning effort medium.',
    'Usage: unknown. Cost is not estimated here.'] },
  { heading: 'Content', lines: [
    '25 castles and 36 knights on the continent. 30 monster species with three forms each, 23 classes in five lines plus eight unique ones, and 90 skills and spells from the plan\'s table.',
    '33 items, 13 battle maps (the Clockwork Sanctum among them), 46 story events with choices, rival lines between rulers, and 7 endings.',
    'Battle rules: wards, forecast, capture of monsters, the commander\'s retreat, Stillness on the campaign map, and the Season Dials of the Sanctum.',
    'Modes: campaign for 1 to 4 players on one device (hot-seat), skirmish against the CPU or hot-seat, a shared-world AI Hub battle for 2 to 4 players, attract mode, dev mode with a gallery of every monster in its three forms.',
    'Music: a theme for each season, the attacking and defending battle themes with a tension layer, the hourless and Sanctum themes, event and ending themes, and a sting when the season turns.'] },
  { heading: 'Not built', lines: [
    'The plan\'s balance targets (section 14.5) are not met. Measured with the current defaults, 12 campaigns each: AI-only campaigns last 12.0 seasons on average (target 12 to 16), and no realm takes Meridian, so no realm wins more than 40% (met, but only because the contest never resolves). The player on autoplay reaches Meridian in 0 of 12 (target: 60%, between seasons 10 and 14). Battles average 11.7 bells (target 8 or fewer in early battles). Hub seat win rates were not measured.',
    'The cause is the knights: they grow only through battle, so an autoplay army of level-two knights cannot beat Meridian\'s garrison. The dev sliders (player mana, summon cost, upkeep, rival aggression, battle damage, defenders\' guard, knight experience) are the place to tune it; I did not find a setting that meets the targets without changing how knights grow.'] },
  { heading: 'Testing feedback', lines: [
    'Issues caught by testing and review: fourteen across all rounds. Nine in the first (seven broke play, two were cosmetic); two in the hub harness; and in the playthroughs, a campaign that never advanced its season (a second muster press during a fade ended the wrong phase), and a battle that could not restart after its rival lines.',
    'Critical or game-breaking: five in the first round. A crash on any battle with the Gray Knight; a scene that could not reach the game; a resumed campaign with no castle selected; a campaign screen that could not draw; a battle card that could not draw.',
    'Most helpful: the play suite, which drives real scenes with taps and time, and the screenshots, which showed draw errors that headless runs skip.',
    'Least helpful: the state-hash check, which only tests the hash function against itself.'] },
  { heading: 'Engine feedback', lines: [
    'Liked most: E.Humanoid and E.Blob with the E.move attack states, and rigs that pose from plain state every step. E.Dialog choices worked as documented.',
    'Stuck or guessed wrong: scenes do not receive their game object, so I set it on each scene. A scene change takes a fade, so tests must wait for it. E.Dialog takes one voice sound rather than a function, so I swap the voice each update.',
    'Most important thing built myself: the battle and campaign simulations, the story triggers, the hex board and its event queue, the list widget with pad and mouse focus, the hub host protocol, and the pixel glyphs for PlayStation symbols.',
    'Hardest part: fitting a tilted hex board to the screen with readable units, and making shared-world copies agree without a server.',
    'Changed in the engine: nothing. The engine is used as shipped.',
    'One thing to change: a per-letter voice callback on E.Dialog, so Animalese can be pitched per character.'] },
  { heading: 'Prompt feedback', lines: [
    'Liked most: the clear list of what to build and the exact file names, which left no doubt about the deliverables.',
    'Confusing: the plan and the brief disagree on file names and scope, and the plan asks for far more content than one session can build well. The title also came from the plan\'s earlier draw, not one I made.',
    'Hardest: keeping the scope honest. Every feature the brief names is built, and the plan\'s mechanics are built too; what is under Not built is presentation detail and tuning.',
    'Would change: a single scope line that says which parts of the plan are required and which are optional.'] }
];

// ---- src/13-data-content.js ----
// The rest of the content: dials and the gate, more skills, promotions, 22 more monster species (every species now has
// three forms), 10 more battle maps (the Clockwork Sanctum among them), 16 more knights, 9 more castles and their roads,
// and 20 more items. Each table is data: the sims and the scenes read it, and the data suite checks its references.

// ---- terrain for the Clockwork Sanctum: dials turn when a unit ends a move on them; the gate opens when they agree ----
G.def('terrain', 'dial', { name: 'Dial', cost: 1, def: 0, hit: 0, glyph: 'D' });
G.def('terrain', 'gate', { name: 'Gate', cost: Infinity, def: 0, hit: 0, glyph: 'G' });
G.TERRAIN_OF_GLYPH['D'] = 'dial';
G.TERRAIN_OF_GLYPH['G'] = 'gate';

G.PROMOTE_LEVEL = { 2: 10, 3: 20 };
G.PROMOTE_COST = { 2: 6, 3: 12 };

// ---- monster species: 22 more; each family has three forms. Tier 2 and 3 grow from tier 1 by the same rule ----
const grow = (f, tier, name, skill) => {
  if (tier === 2) return Object.assign({}, f, { name, hp: Math.round(f.hp * 1.45), atk: f.atk + 2, def: f.def + 1, size: f.size === 'S' ? 'M' : f.size, cost: f.cost + 2, skill });
  return Object.assign({}, f, { name, hp: Math.round(f.hp * 1.9), atk: f.atk + 4, def: f.def + 2, size: f.size === 'L' ? 'L' : 'L', cost: f.cost + 4, skill });
};
const FAMILY = (id, name, element, look, base, skills, names) => {
  const f1 = Object.assign({}, base, { name: names[0], skill: skills[0] }), f2 = grow(f1, 2, names[1], skills[1]), f3 = grow(f2, 3, names[2], skills[2]);
  G.def('species', id, { name, element, look, forms: [f1, f2, f3] });
};
// the eight species of the first bestiary gain a third form
for (const [id, name, skill, lbl] of [['gleam-slime', 'Gleam Slime', 'drain', 'Ooze Tyrant'], ['dusk-bat', 'Dusk Bat', 'drain', 'Vesper Lord'],
  ['thorn-hare', 'Thorn Hare', 'guard', 'Briar Thane'], ['cinder-imp', 'Cinder Imp', 'breath', 'Forge Tyrant'],
  ['frost-wisp', 'Frost Wisp', 'frost', 'Glacier Spirit'], ['storm-pixie', 'Storm Pixie', 'thunder', 'Storm Sovereign'],
  ['stone-golem', 'Stone Golem', 'rally', 'Basalt Titan'], ['bonewalker', 'Bonewalker', 'charge', 'Dread Sovereign']]) {
  const sp = G.get('species', id);
  sp.forms.push(grow(sp.forms[1], 3, lbl, skill));
}
const B = (hp, atk, def, mov, rng, size, skill, cost) => ({ hp, atk, def, mov, rng, size, skill, cost });
const BL = (kind, extra) => Object.assign({ kind }, extra);
FAMILY('moss-toad', 'Moss Toad', 'verdant', BL('blob', { R: 7, feet: true, mouth: true, colors: { dk: '#2e5a2a', base: '#6aa04a', lt: '#b8d890', spec: '#f0ffe0', eye: '#ffe870', pupil: '#101a08' } }), B(15, 4, 2, 2, 1, 'S', null, 2), ['drain', 'venom', 'guard'], ['Moss Toad', 'Bog Toad', 'Marsh Behemoth']);
FAMILY('lantern-moth', 'Lantern Moth', 'ambered', BL('beast', { body: 'avian', R: 5, wings: true, colors: { dk: '#6a4a10', base: '#e8c060', lt: '#fff0b0', spec: '#ffffff', eye: '#ff8040', pupil: '#201004' } }), B(10, 5, 1, 5, 2, 'S', 'frost', 3), ['frost', 'pierce', 'haste'], ['Lantern Moth', 'Glow Moth', 'Lantern Queen']);
FAMILY('cave-crawler', 'Cave Crawler', 'hour', BL('blob', { R: 5, feet: true, mouth: 'fangs', colors: { dk: '#1a1426', base: '#4a3e66', lt: '#7a6ea0', spec: '#c8c0e8', eye: '#ff5a8a', pupil: '#100010' } }), B(12, 5, 2, 3, 1, 'S', 'venom', 2), ['venom', 'drain', 'venom'], ['Cave Crawler', 'Hollow Crawler', 'Deep Crawler']);
FAMILY('ember-fox', 'Ember Fox', 'solar', BL('beast', { body: 'quadruped', R: 6, ears: 'cat', tail: true, feet: true, colors: { dk: '#7a2a10', base: '#ff8a40', lt: '#ffd0a0', spec: '#fff4e0', eye: '#fff080', pupil: '#301008' } }), B(12, 6, 1, 4, 1, 'S', 'cinder-bolt', 3), ['cinder-bolt', 'stun-strike', 'crush'], ['Ember Fox', 'Blaze Fox', 'Pyre Fox']);
FAMILY('glass-serpent', 'Glass Serpent', 'rime', BL('beast', { body: 'serpent', R: 6, tail: true, mouth: 'fangs', colors: { dk: '#2a4a7a', base: '#8ac0f0', lt: '#e0f4ff', spec: '#ffffff', eye: '#ffffff', pupil: '#0a1828' } }), B(14, 6, 2, 3, 1, 'M', 'venom', 3), ['venom', 'pierce', 'frost'], ['Glass Serpent', 'Crystal Wyrm', 'Glass Leviathan']);
FAMILY('thorn-wight', 'Thorn Wight', 'verdant', BL('blob', { R: 6, horns: true, colors: { dk: '#2a4a20', base: '#5a8a3a', lt: '#9ac870', spec: '#e8ffd0', eye: '#ffe060', pupil: '#101808' } }), B(14, 5, 2, 3, 2, 'M', 'thunder', 3), ['thunder', 'pierce', 'shield'], ['Thorn Wight', 'Briar Wight', 'Thorn King']);
FAMILY('sun-hound', 'Sun Hound', 'solar', BL('beast', { body: 'quadruped', R: 6, ears: 'cat', feet: true, tail: true, mouth: true, colors: { dk: '#8a4a10', base: '#e8a030', lt: '#ffe080', spec: '#fff8d0', eye: '#fff4a0', pupil: '#2a1400' } }), B(13, 6, 2, 4, 1, 'M', 'crush', 3), ['crush', 'sweep', 'warhowl'], ['Sun Hound', 'Dawn Hound', 'Noon Hound']);
FAMILY('tide-eel', 'Tide Eel', 'rime', BL('beast', { body: 'serpent', R: 5, tail: true, colors: { dk: '#1a3a5a', base: '#4aa0c8', lt: '#a0e0f0', spec: '#e0ffff', eye: '#ffffff', pupil: '#041020' } }), B(11, 5, 1, 3, 1, 'S', 'drain', 2), ['drain', 'stun-strike', 'shield'], ['Tide Eel', 'Surge Eel', 'Tide Leviathan']);
FAMILY('iron-sentinel', 'Iron Sentinel', 'hour', BL('human', { build: 'bulky', size: 1.45, colors: { cloth: '#5a5a66', skin: '#7a7a88', metal: '#c8c8d8' } }), B(28, 7, 7, 2, 1, 'L', 'bone-ward', 5), ['bone-ward', 'crush', 'shield'], ['Iron Sentinel', 'Iron Bastion', 'Iron Colossus']);
FAMILY('gloom-owl', 'Gloom Owl', 'ambered', BL('beast', { body: 'avian', R: 6, wings: true, horns: true, colors: { dk: '#3a2a10', base: '#8a6a30', lt: '#c8a060', spec: '#fff0c0', eye: '#ffe060', pupil: '#100800' } }), B(11, 5, 1, 5, 2, 'S', 'dusk-hex', 3), ['dusk-hex', 'pierce', 'haste'], ['Gloom Owl', 'Dusk Owl', 'Night Owl']);
FAMILY('orchard-sprite', 'Orchard Sprite', 'verdant', BL('blob', { R: 5, wings: true, colors: { dk: '#4a7a20', base: '#b8e860', lt: '#f0ffa0', spec: '#ffffff', eye: '#ffffff', pupil: '#102000' } }), B(9, 3, 1, 4, 2, 'S', 'mend', 2), ['mend', 'mend-greater', 'mend-greater'], ['Orchard Sprite', 'Orchard Fairy', 'Orchard Queen']);
FAMILY('bell-spider', 'Bell Spider', 'hour', BL('blob', { R: 6, feet: true, colors: { dk: '#2a2030', base: '#7a6a8a', lt: '#c0b0d8', spec: '#f4f0ff', eye: '#ffd070', pupil: '#100810' } }), B(12, 5, 3, 3, 1, 'M', 'venom', 3), ['venom', 'sweep', 'chain-lightning'], ['Bell Spider', 'Chime Spider', 'Carillon Spider']);
FAMILY('drake-whelp', 'Drake Whelp', 'solar', BL('beast', { body: 'drake', R: 7, horns: true, wings: true, tail: true, mouth: 'fangs', colors: { dk: '#6a1a0a', base: '#d85030', lt: '#ffa070', spec: '#ffe0c0', eye: '#fff060', pupil: '#2a0800' } }), B(16, 7, 3, 3, 2, 'M', 'breath', 5), ['breath', 'cinder-bolt', 'breath'], ['Drake Whelp', 'Young Drake', 'Elder Drake']);
FAMILY('hoar-yeti', 'Hoar Yeti', 'rime', BL('human', { build: 'bulky', size: 1.4, colors: { cloth: '#c0d8e8', skin: '#e8f4ff', metal: '#9ac0d8' } }), B(24, 7, 4, 2, 1, 'L', 'crush', 4), ['crush', 'frost', 'guard'], ['Hoar Yeti', 'Rime Yeti', 'Hoarfrost Yeti']);
FAMILY('salt-gull', 'Salt Gull', 'ambered', BL('beast', { body: 'avian', R: 5, wings: true, mouth: true, colors: { dk: '#5a6a7a', base: '#e8ecf0', lt: '#ffffff', spec: '#ffffff', eye: '#ffb040', pupil: '#101010' } }), B(9, 4, 1, 5, 2, 'S', 'pierce', 2), ['pierce', 'venom', 'haste'], ['Salt Gull', 'Storm Gull', 'Gale Gull']);
FAMILY('amber-beetle', 'Amber Beetle', 'ambered', BL('blob', { R: 6, horns: true, feet: true, colors: { dk: '#5a3a08', base: '#c88a20', lt: '#f0c060', spec: '#fff0c0', eye: '#ffffff', pupil: '#100800' } }), B(15, 5, 4, 2, 1, 'M', 'guard', 3), ['guard', 'shield', 'bone-ward'], ['Amber Beetle', 'Amber Stag', 'Amber Behemoth']);
FAMILY('reed-wraith', 'Reed Wraith', 'verdant', BL('human', { build: 'skeleton', size: 1.3, colors: { bone: '#b8d8a0', cloth: '#2a4a2a' } }), B(13, 6, 1, 4, 1, 'M', 'drain', 3), ['drain', 'venom', 'drain'], ['Reed Wraith', 'Mire Wraith', 'Reed Lich']);
FAMILY('frost-mite', 'Frost Mite', 'rime', BL('blob', { R: 4, feet: true, colors: { dk: '#4a6a8a', base: '#c0e8ff', lt: '#ffffff', spec: '#ffffff', eye: '#ff6080', pupil: '#101820' } }), B(7, 3, 1, 4, 1, 'S', 'frost', 2), ['frost', 'stun-strike', 'shield'], ['Frost Mite', 'Hoar Mite', 'Rime Mite']);
FAMILY('sunflower-ogre', 'Sunflower Ogre', 'solar', BL('human', { build: 'bulky', size: 1.5, colors: { cloth: '#c89a30', skin: '#a8703a', metal: '#e8c060' } }), B(26, 7, 4, 2, 1, 'L', 'sweep', 5), ['sweep', 'crush', 'warhowl'], ['Sunflower Ogre', 'Sun Ogre', 'Sunforge Ogre']);
FAMILY('wyrm-slug', 'Wyrm Slug', 'hour', BL('blob', { R: 8, mouth: true, colors: { dk: '#2a1a30', base: '#6a4a7a', lt: '#9a80b0', spec: '#d8c8f0', eye: '#ffe0ff', pupil: '#100010' } }), B(20, 4, 3, 1, 1, 'M', 'venom', 4), ['venom', 'drain', 'venom'], ['Wyrm Slug', 'Mire Wyrm', 'Hour Wyrm']);
FAMILY('mirror-imp', 'Mirror Imp', 'hour', BL('blob', { R: 5, horns: true, tail: true, colors: { dk: '#4a4a6a', base: '#c8c8e8', lt: '#ffffff', spec: '#ffffff', eye: '#ff80e0', pupil: '#100010' } }), B(10, 6, 1, 4, 2, 'S', 'chain-lightning', 4), ['chain-lightning', 'dusk-hex', 'haste'], ['Mirror Imp', 'Glass Imp', 'Mirror King']);
FAMILY('clock-hound', 'Clock Hound', 'hour', BL('blob', { R: 6, ears: 'cat', feet: true, tail: true, colors: { dk: '#3a3a48', base: '#8a8aa0', lt: '#c8c8e0', spec: '#ffffff', eye: '#ffd060', pupil: '#101010' } }), B(14, 6, 3, 4, 1, 'M', 'charge', 4), ['charge', 'stun-strike', 'charge'], ['Clock Hound', 'Gear Hound', 'Hour Hound']);

// ---- 10 more battle maps (13 in all). The Clockwork Sanctum is the final battle at Meridian: three dials, a gate, the keep ----
const MAP = (id, name, season, rows, o = {}) => G.def('map', id, Object.assign({ name, season, keep: true, rows }, o));
MAP('river-crossing', 'River Crossing', 'spring', ['aa.f.~~~..b', 'a..h.~=~.b.', 'a.f..~=~..b', '..h..~=~...', 'a..f..=..K.', 'a..m.~=~.bb', 'aa.f..~..b.', 'a.h...~...b', 'aa.f.~~~.bb']);
MAP('marsh-road', 'Marsh Road', 'spring', ['aa.mm.....b', 'a..mmh....b', 'a.f.mm..h.b', '..f.hmm..bb', 'a..r..f..K.', 'a.h..mmf.b.', 'aa..m.hh.bb', 'a..f..m..b.', 'aa..h...bbb']);
MAP('hilltop-fort', 'Hilltop Fort', 'autumn', ['a..hhh...b.', 'a.h...h..bb', 'aa..#.#..b.', 'a.f.#K#.f.b', 'a..f.#..f..', 'a.h..#...b.', 'aa.hhh..bb.', 'a..f...hbb.', 'aa.hhh.bbb.']);
MAP('clockwork-sanctum', 'The Clockwork Sanctum', 'winter', ['a..###..bb.', 'a.D.#.#.D.b', 'aa...#...b.', 'a..#.G.#..b', 'a..D.K...b.', 'a.#..#...b.', 'aa.#...#.bb', 'a..#####..b', 'a...###...b'], { keep: true, sanctum: true, dials: true });
MAP('orchard-lane', 'Orchard Lane', 'summer', ['a.f...f...b', 'a..h.f..h.b', 'aa..f..r.bb', 'a.r..~~~..b', '..f.~~=~.f.', 'a..f..=.hh.', 'a.h..~=~..b', 'aa..~~~.f.b', 'a.f..K...bb']);
MAP('bog-village', 'Bog Village', 'summer', ['aa.m.m.r..b', 'a.mhm..r.bb', 'a..m.r.mm.b', 'a.f..h..m.b', '..r.K..f..b', 'a..f.h.m..b', 'a.m.mr...bb', 'aa.h..f..bb', 'a..m..m.bbb']);
MAP('frozen-lake', 'Frozen Lake', 'winter', ['aa.~~~~...b', 'a..~..~..bb', 'a.h~..~.h.b', '..f~.K~.f.b', 'a..~...~..b', 'a.h~.~~.f.b', 'aa..~~..h.b', 'a..f.~..h.b', 'aa.h.~~..bb']);
MAP('ruined-bridge', 'Ruined Bridge', 'autumn', ['a..rr.rr..b', 'a.r.~~~.r.b', 'a..~=~=~..b', 'a.f~=~=~.fb', 'a..f~=~..Kb', 'a.r..~~~..b', 'aa..r.r...b', 'a.f....h.bb', 'aa.h..r..bb']);
MAP('thorn-hollow', 'Thorn Hollow', 'spring', ['a.f.h.f..bb', 'aa..fff..b.', 'a.f.h..h.bb', 'a..m..K..b.', 'a.h.m.m.f.b', 'aa.mm.hh..b', 'a..f.m..hbb', 'a.h..ff..bb', 'aa..f...bbb']);
MAP('open-field', 'Open Field', 'summer', ['aa........b', 'a.........b', 'a....h....b', 'a..h.....fb', 'a...K.....b', 'a.f.....h.b', 'a.........b', 'a.h.....f.b', 'aa........b']);
// the map a campaign battle uses for each castle: the Sanctum for Meridian, otherwise a map of the castle's season
G.MAP_FOR_CASTLE = { meridian: 'clockwork-sanctum', stillhold: 'hilltop-fort', bellgate: 'frozen-lake', thornpass: 'thorn-hollow', blackhollow: 'bog-village' };
G.MAP_POOL = ['meadow', 'ford', 'keep', 'river-crossing', 'marsh-road', 'hilltop-fort', 'orchard-lane', 'bog-village', 'frozen-lake', 'ruined-bridge', 'thorn-hollow', 'open-field'];

// ---- 16 more knights: four per realm, six Dominion knights (the Gray Knight is separate), five free knights, four captains ----
const KN = (id, o) => G.def('knight', id, Object.assign({ mov: 3, bond: 3, skill: null, leader: false, level: 2, items: [], start: null, look: {}, voice: {}, quote: '' }, o));
const look = (hat, hair, outfit, colors, extra = {}) => Object.assign({ hat, hair, outfit, colors }, extra);
KN('liss', { name: 'Liss', title: 'Warden of Briarwatch', realm: 'verdance', element: 'verdant', cls: 'archer', hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'briarwatch', look: look('band', 'long', 'tunic', { cloth: '#4a7a3a', hair: '#c8a040', trim: '#e8f0a0' }), voice: { pitch: 280, lilt: 1.3 }, quote: 'Briars grow where I want them to.' });
KN('corwen', { name: 'Corwen', title: 'Mistmere Lancer', realm: 'verdance', element: 'verdant', cls: 'squire', hp: 21, atk: 7, def: 3, mov: 4, rng: 1, bond: 3, start: 'mistmere', look: look('helmet', 'short', 'shirt', { cloth: '#3a6a4a', hair: '#2a2a2a' }), voice: { pitch: 150, lilt: .9 }, quote: 'Mist hides the ford. It does not hide the horse.' });
KN('aster', { name: 'Aster', title: 'Goldenvale Scholar', realm: 'solmark', element: 'solar', cls: 'adept', hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'goldenvale', look: look('pointed', 'long', 'robe', { cloth: '#8a4a20', hair: '#f0c060', trim: '#ffe080' }), voice: { pitch: 320, lilt: 1.35 }, quote: 'Gold is only sunlight that has agreed to stay.' });
KN('bram', { name: 'Bram', title: 'of the Redmarch', realm: 'solmark', element: 'solar', cls: 'squire', hp: 22, atk: 7, def: 4, mov: 3, rng: 1, bond: 3, start: 'redmarch', look: look('helmet', 'spiky', 'coat', { cloth: '#b04a2a', coat: '#7a2a18', trim: '#ffb060', hair: '#4a2a10' }), voice: { pitch: 130, lilt: .8 }, quote: 'Mark the march, then march.' });
KN('tavin', { name: 'Tavin', title: 'Saltmere Reeve', realm: 'amberlyn', element: 'ambered', cls: 'squire', hp: 22, atk: 6, def: 4, mov: 3, rng: 1, bond: 3, start: 'saltmere', look: look('cap', 'short', 'coat', { cloth: '#7a6a3a', coat: '#5a4a2a', trim: '#e8d890', hair: '#5a4020' }), voice: { pitch: 190, lilt: 1 }, quote: 'Salt keeps the grain and the gate alike.' });
KN('pell', { name: 'Pell', title: 'Orchard Bowman', realm: 'amberlyn', element: 'ambered', cls: 'archer', hp: 15, atk: 6, def: 2, mov: 4, rng: 2, bond: 3, start: 'orchard', look: look('cap', 'bald', 'tunic', { cloth: '#8a7a3a', hair: '#3a2a1a' }), voice: { pitch: 240, lilt: 1.1 }, quote: 'Every apple I drop, I catch again.' });
KN('sorrel', { name: 'Sorrel', title: 'Coldharbour Spear', realm: 'hoarfast', element: 'rime', cls: 'squire', hp: 21, atk: 7, def: 4, mov: 4, rng: 1, bond: 3, start: 'coldharbour', look: look('helmet', 'ponytail', 'shirt', { cloth: '#3a5a7a', hair: '#b8e0f0' }), voice: { pitch: 200, lilt: 1.05 }, quote: 'Cold steel, warm heart, sharp view.' });
KN('undine', { name: 'Undine', title: 'Glassrise Seer', realm: 'hoarfast', element: 'rime', cls: 'adept', hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'glassrise', look: look('pointed', 'long', 'robe', { cloth: '#2a4a7a', hair: '#e8f8ff', trim: '#a0e0ff' }), voice: { pitch: 300, lilt: 1.2 }, quote: 'Glass shows what the ice means to keep.' });
KN('mire', { name: 'Mire', title: 'Bellgate Thrall', realm: 'dominion', element: 'hour', cls: 'squire', hp: 22, atk: 7, def: 5, mov: 3, rng: 1, bond: 3, start: 'bellgate', look: look('helmet', 'bald', 'coat', { cloth: '#2a2438', coat: '#1a1628', trim: '#7a68b0', metal: '#585070' }), voice: { pitch: 110, lilt: .75 }, quote: 'The bell rings once, and everything waits.' });
KN('hollis', { name: 'Hollis', title: 'Stillhold Lancer', realm: 'dominion', element: 'hour', cls: 'squire', hp: 22, atk: 8, def: 4, mov: 4, rng: 1, bond: 3, start: 'stillhold', look: look('helmet', 'short', 'shirt', { cloth: '#3a3050', hair: '#c8c0d8' }), voice: { pitch: 175, lilt: .9 }, quote: 'Nothing moves in Stillhold. Nothing.' });
KN('nocturne', { name: 'Nocturne', title: 'Bellgate Mage', realm: 'dominion', element: 'hour', cls: 'hourmaiden', hp: 17, atk: 7, def: 2, mov: 3, rng: 2, bond: 3, start: 'bellgate', look: look('pointed', 'long', 'robe', { cloth: '#1a1630', hair: '#7a68b0', trim: '#c0a8ff' }), voice: { pitch: 290, lilt: 1.15 }, quote: 'Dusk is only the hour I keep for you.' });
KN('drift', { name: 'Drift', title: 'Thornpass Hunter', realm: 'free', element: 'neutral', cls: 'archer', hp: 16, atk: 6, def: 2, mov: 4, rng: 2, bond: 2, start: 'thornpass', look: look('band', 'short', 'tunic', { cloth: '#4a5a3a', hair: '#8a7a50' }), voice: { pitch: 260, lilt: 1.25 }, quote: 'I do not need to be seen to be sure.' });
KN('gorse', { name: 'Gorse', title: 'Blackhollow Brawler', realm: 'free', element: 'neutral', cls: 'tamer', hp: 22, atk: 6, def: 4, mov: 3, rng: 1, bond: 2, start: 'blackhollow', look: look('cap', 'bald', 'shirt', { cloth: '#5a4a2a', hair: '#2a1a0a' }), voice: { pitch: 120, lilt: .85 }, quote: 'Hit first, ask later.' });
KN('quill', { name: 'Quill', title: 'Traveling Scribe-Blade', realm: 'free', element: 'neutral', cls: 'adept', hp: 15, atk: 6, def: 1, mov: 3, rng: 2, bond: 2, start: 'blackhollow', look: look('pointed', 'long', 'robe', { cloth: '#4a3a5a', hair: '#e0d0a0' }), voice: { pitch: 310, lilt: 1.4 }, quote: 'Every road I have walked is written down.' });
KN('raven', { name: 'Raven', title: 'Thorn Road Captain', realm: 'free', element: 'neutral', cls: 'brigand', hp: 20, atk: 7, def: 3, mov: 4, rng: 1, bond: 2, start: 'thornpass', look: look('cap', 'spiky', 'coat', { cloth: '#1a1a1a', coat: '#0e0e0e', hair: '#101010' }), voice: { pitch: 145, lilt: .95 }, quote: 'The road is ours on alternate Tuesdays.' });
KN('skint', { name: 'Skint', title: 'Blackhollow Pawnbroker', realm: 'free', element: 'neutral', cls: 'brigand', hp: 18, atk: 6, def: 3, mov: 3, rng: 1, bond: 2, start: 'blackhollow', look: look('band', 'bald', 'shirt', { cloth: '#6a5a3a', hair: '#a09070' }), voice: { pitch: 230, lilt: 1.1 }, quote: 'Everything has a price. I write the receipts.' });

// ---- nine more castles (25 in all) and their roads ----
const CASTLE2 = (id, name, realm, x, y, o = {}) => G.def('castle', id, Object.assign({ name, realm, x, y, yield: 3, capital: false }, o));
CASTLE2('briarwatch', 'Briarwatch', 'verdance', 300, 140);
CASTLE2('mistmere', 'Mistmere', 'verdance', 110, 130);
CASTLE2('goldenvale', 'Goldenvale', 'solmark', 700, 140);
CASTLE2('redmarch', 'Redmarch', 'solmark', 900, 200);
CASTLE2('saltmere', 'Saltmere', 'amberlyn', 650, 870);
CASTLE2('orchard', 'Orchard', 'amberlyn', 900, 820);
CASTLE2('coldharbour', 'Coldharbour', 'hoarfast', 120, 880);
CASTLE2('glassrise', 'Glassrise', 'hoarfast', 320, 860);
CASTLE2('bellgate', 'Bellgate', 'dominion', 500, 640, { yield: 4 });
G.ROADS.push(['briarwatch', 'mossgate'], ['briarwatch', 'ferncrest'], ['briarwatch', 'thornpass'],
  ['mistmere', 'mossgate'], ['mistmere', 'larkhold'], ['goldenvale', 'brightwall'], ['goldenvale', 'emberfall'],
  ['redmarch', 'brightwall'], ['redmarch', 'sunspire'], ['saltmere', 'harrowvale'], ['saltmere', 'gildmere'],
  ['orchard', 'quillon'], ['orchard', 'gildmere'], ['coldharbour', 'frostwatch'], ['coldharbour', 'icehollow'],
  ['glassrise', 'rimecrag'], ['glassrise', 'frostwatch'], ['bellgate', 'meridian'], ['bellgate', 'harrowvale'], ['bellgate', 'rimecrag']);

// ---- 20 more items (33 in all) ----
const ITEM = (id, name, desc, atk, def, mov, extra = {}) => G.def('item', id, Object.assign({ name, desc, atk, def, mov, icon: id }, extra));
ITEM('ash-cloak', 'Ash Cloak', 'Defence +1. Smells of old fires.', 0, 1, 0);
ITEM('thorn-mail', 'Thorn Mail', 'Defence +3. Scratches the wearer too.', 0, 3, 0);
ITEM('quick-sash', 'Quick Sash', 'Move +1. Tied in a hurry.', 0, 0, 1);
ITEM('sun-torque', 'Sun Torque', 'Attack +1. Holds a little daylight.', 1, 0, 0);
ITEM('rime-blade', 'Rime Blade', 'Attack +3. Frosts the hand that holds it.', 3, 0, 0);
ITEM('oak-bow', 'Oak Bow', 'Attack +2. For those who can wait.', 2, 0, 0);
ITEM('lodestone', 'Lodestone', 'Defence +2. Pulls at the wrong blades.', 0, 2, 0);
ITEM('wayfarer-cape', 'Wayfarer Cape', 'Move +1, defence +1. Very well travelled.', 0, 1, 1);
ITEM('hourglass-charm', 'Hourglass Charm', 'Move +2. Counts the seconds for you.', 0, 0, 2);
ITEM('emberstone', 'Emberstone', 'Attack +2, defence +1. Warm in the hand.', 2, 1, 0);
ITEM('verdant-seed', 'Verdant Seed', 'Mends a knight for 4 HP when a battle begins.', 0, 0, 0, { heal: 4 });
ITEM('saltbread', 'Saltbread', 'Mends a knight for 6 HP when a battle begins.', 0, 0, 0, { heal: 6 });
ITEM('tide-pearl', 'Tide Pearl', 'Defence +2. Cool to the touch.', 0, 2, 0);
ITEM('glass-buckler', 'Glass Buckler', 'Defence +2. It shows you the blow coming.', 0, 2, 0);
ITEM('banner-of-amber', 'Banner of Amber', 'Attack +2. Carried high on the march.', 2, 0, 0);
ITEM('bellrope', 'Bellrope', 'Move +1, attack +1. Rings when you move.', 1, 0, 1);
ITEM('mirror-shard', 'Mirror Shard', 'Attack +1, defence +1. Shows a second you.', 1, 1, 0);
ITEM('gilded-spur', 'Gilded Spur', 'Move +2. Expensive and very noisy.', 0, 0, 2);
ITEM('frostcoat', 'Frostcoat', 'Defence +3, move -1. Heavy with rime.', 0, 3, -1);
ITEM('clockwork-key', 'Clockwork Key', 'Attack +1, move +1. Opens something, somewhere.', 1, 0, 1);
ITEM('iron-gauntlet', 'Iron Gauntlet', 'Attack +1, defence +1.', 1, 1, 0);
ITEM('sunstone-ring', 'Sunstone Ring', 'Attack +1. Glows in the dark.', 1, 0, 0);
ITEM('shadow-shawl', 'Shadow Shawl', 'Defence +2. Hides the wearer from the sun.', 0, 2, 0);
ITEM('reed-flute', 'Reed Flute', 'Mends a knight for 3 HP when a battle begins.', 0, 0, 0, { heal: 3 });
ITEM('healer-kit', 'Healer\'s Kit', 'Mends a knight for 10 HP when a battle begins.', 0, 0, 0, { heal: 10 });
ITEM('winged-boots', 'Winged Boots', 'Move +2, defence +0. Do not run in them.', 0, 0, 2);
ITEM('torch', 'Torch', 'Attack +1. Lights the way and the enemy.', 1, 0, 0);
ITEM('bronze-bell', 'Bronze Bell', 'Defence +1. Rings the alarm before a blow.', 0, 1, 0);

// ---- src/14-data-events.js ----
// The story as data: 34 events. Each has a trigger (when), lines of dialogue (who speaks, and the babble of their voice),
// and optional choices. A choice carries effects: a flag, mana, an item, or a knight who joins the player's realm.
// Triggers: start (a realm's first season), season (the index of the season), candle (seasons left on the Hour-Candle),
// capture (a castle taken by the player), castle-lost (a castle taken from a realm), march-by (a realm marches),
// wounded (a knight hurt in battle), promoted (a knight changes class), sanctum (a march on Meridian).
const EV = (id, when, lines, o = {}) => G.def('event', id, Object.assign({ when, lines, once: true }, o));
const CH = (text, effects = []) => ({ text, effects });

// the four openings: each realm's ruler on the first morning
EV('open-verdance', { start: 'verdance' }, [
  { who: 'oren', text: 'Mossgate has seen flood and fire. The thaw came early and the fords are up. Hold the green land for me.' },
  { who: 'bryony', text: 'Briarwatch and Mistmere are ours, and so are their roads. Send your riders where the mist is thin.' }]);
EV('open-solmark', { start: 'solmark' }, [
  { who: 'tamsin', text: 'The sun is high over Brightwall and there is no rain in the forecast. That is a gift, and gifts are spent quickly.' },
  { who: 'ysolde', text: 'Emberfall\'s wells are low. We will need the Goldenvale mines before the dry wind takes the grain.' }]);
EV('open-amberlyn', { start: 'amberlyn' }, [
  { who: 'wren', text: 'Gildmere is full of grain and empty of soldiers. A harvest is a promise kept in the right order.' },
  { who: 'lark', text: 'The roads to Quillon are hard, and the Saltmere men say the Dominion is watching the coast.' }]);
EV('open-hoarfast', { start: 'hoarfast' }, [
  { who: 'hale', text: 'Frostwatch has held through forty winters. The ice does not forgive, and neither do I.' },
  { who: 'ilse', text: 'The glass at Glassrise shows a bell that is not ringing. Something in the Dominion has stopped the clock.' }]);

// the seasons: the realm's troubles and the choices it makes about them
EV('season-1', { season: 1 }, [
  { name: 'A rider', text: 'A rider from the south: Dominion scouts are on the Thornpass road, counting horses and bells.' },
  { who: 'oren', text: 'Count them back. Riders on the road can be followed.', choices: [CH('Send riders to follow them', [{ t: 'mana', n: -2 }, { t: 'flag', f: 'followed-scouts' }]), CH('Hold the walls and wait', [{ t: 'flag', f: 'held-walls' }])] }]);
EV('season-2', { season: 2 }, [
  { name: 'The harvest', text: 'The autumn gales have come early to the coast, and the grain at Saltmere is in the wrong place.' },
  { who: 'wren', text: 'Send the grain inland, or hold it for the coast?', choices: [CH('Send the grain inland', [{ t: 'mana', n: 4 }]), CH('Hold it for the coast', [{ t: 'flag', f: 'coast-grain' }, { t: 'mana', n: 1 }])] }]);
EV('season-3', { season: 3 }, [
  { name: 'The frozen fords', text: 'Every river north of the Rimecrag is ice. The Hoarfast horses cannot cross, and the Dominion knows it.' },
  { who: 'brannoc', text: 'Then we walk on the ice and they will not expect it.', choices: [CH('Walk the ice', [{ t: 'flag', f: 'walked-ice' }]), CH('Wait for the thaw', [{ t: 'mana', n: 2 }])] }]);
EV('season-4', { season: 4 }, [
  { name: 'A blade for hire', text: 'Nessa of the Thornpass band has sent word. She offers her blade for four mana, and says she is nobody\'s.' },
  { who: 'oren', text: 'A free blade is worth a little mana. Shall I pay her?', choices: [CH('Pay Nessa four mana', [{ t: 'mana', n: -4 }, { t: 'join', knight: 'nessa' }]), CH('Thank her and decline', [])] }]);
EV('season-5', { season: 5 }, [
  { name: 'Dry wind', text: 'A dry wind has come off the Solmark plains. Ferns crack in the hand, and the forests are waiting for a spark.' },
  { who: 'tamsin', text: 'Wet your banners and keep the torches low. We do not burn our own forests.', choices: [CH('Wet the banners', [{ t: 'flag', f: 'wet-banners' }]), CH('Trust the wind', [{ t: 'mana', n: 3 }])] }]);
EV('season-6', { season: 6 }, [
  { name: 'A letter', text: 'A letter in a Dominion hand arrives under the gate of Mossgate. It says only: "The hour is paid in full."' },
  { who: 'oren', text: 'Burn it, or read it aloud to the men?', choices: [CH('Read it aloud', [{ t: 'flag', f: 'read-letter' }]), CH('Burn it', [{ t: 'flag', f: 'burned-letter' }])] }]);
EV('season-7', { season: 7 }, [
  { name: 'The Dominion marches', text: 'The Dominion\'s banners are moving between Stillhold and Bellgate. Their knights walk as if they had all day.' },
  { who: 'hale', text: 'Let them march. Every mile they walk is a mile they cannot spend on the ice.' }]);
EV('season-8', { season: 8 }, [
  { name: 'The Gray Knight', text: 'Word from Meridian: the Gray Knight has been seen on the wall of the Calendar City, watching every road at once.' },
  { who: 'vesper', text: 'The hour is his. You can take it from him, but you cannot make him give it back.' }]);
EV('season-9', { season: 9 }, [
  { name: 'Autumn fires', text: 'The forests of the Ford have caught, and the smoke goes east over the Orchard. The villages ask who started it.' },
  { who: 'pell', text: 'Nobody started it. The wind did, and the wind does not answer questions.' }]);
EV('season-10', { season: 10 }, [
  { name: 'The clock', text: 'The Calendar City\'s clock has stopped on the thirteenth month. The bell that should have rung is silent.' },
  { who: 'nocturne', text: 'Silence is only the sound of an hour being kept. Go and break it.' }]);
EV('season-11', { season: 11 }, [
  { name: 'The last winter', text: 'The last winter comes early over every realm. Whatever is not taken before the thaw will stay taken.' },
  { who: 'hale', text: 'Then we take what we came for, and we take it before the frost sets.' }]);

EV('stillness', { stillness: true }, [{ name: 'Stillness', text: 'A castle has stopped. Its clock reads the thirteenth hour, its banners hang still, and nothing there can march until the Gray Knight lifts his hand.' }]);

// the candle and the Gray Knight
EV('candle-3', { candle: 3 }, [{ name: 'The candle', text: 'The Hour-Candle is down to three seasons. Its flame leans toward Meridian, and the wax runs thin.' }]);
EV('candle-1', { candle: 1 }, [{ who: 'oren', text: 'One season left on the candle. Whatever we mean to do at Meridian, we do it this season.' }]);
EV('gray-hurt', { wounded: 'gray' }, [{ who: 'vesper', text: 'The Gray Knight has been struck. For the first time in a hundred years, the hour stumbles.' }]);
EV('dominion-march', { 'march-by': 'dominion' }, [{ name: 'The Dominion marches', text: 'The first Dominion march of the war. Their knights come down the road without a single horn.' }]);

// the captures: the free companies, the Dominion's halls, and the first castle of the war
EV('capture-thornpass', { capture: 'thornpass' }, [
  { name: 'Thornpass', text: 'The gate of Thornpass stands open. Its people say the free companies have moved on, and left a letter for whoever came.' },
  { who: 'drift', text: 'I was going to leave anyway. Count me in, if you can pay the grain.', choices: [CH('Take Drift into your service', [{ t: 'join', knight: 'drift' }]), CH('Thank her and let her go', [])] }]);
EV('capture-blackhollow', { capture: 'blackhollow' }, [
  { name: 'Blackhollow', text: 'Blackhollow was a robbers\' den and has a good cellar. The bandits left the wine and took the money.' },
  { who: 'gorse', text: 'Good cellar. Bad company. I will take the company if you will take the cellar.', choices: [CH('Take Gorse into your service', [{ t: 'join', knight: 'gorse' }]), CH('Keep the wine and let him go', [{ t: 'mana', n: 2 }])] }]);
EV('capture-stillhold', { capture: 'stillhold' }, [
  { name: 'Stillhold', text: 'The Regent\'s hall is empty. A clock in the middle of the room has stopped at the thirteenth hour.' },
  { who: 'hollis', text: 'Vesper\'s people took their horses and left the clock. I would sooner have the horses.', choices: [CH('Take Hollis into your service', [{ t: 'join', knight: 'hollis' }]), CH('Leave the clock as it is', [{ t: 'flag', f: 'left-clock' }])] }]);
EV('capture-first', { capture: 'briarwatch' }, [{ name: 'The first castle', text: 'The banner goes up over the first castle of the war. Nobody cheers. They are too tired, and the hour is still running.' }]);
EV('capture-bellgate', { capture: 'bellgate' }, [
  { name: 'Bellgate', text: 'Bellgate\'s bell has been hung upside down, to keep its ring from the Dominion. Someone has turned it back.' },
  { who: 'nocturne', text: 'The Dominion hung it that way to stop the hour. Turned back, it keeps the hour for everyone.' }]);

// the castles lost: the capitals, and the loss of a ruler's own
EV('lost-mossgate', { 'castle-lost': 'mossgate' }, [{ who: 'bryony', text: 'Mossgate has fallen to the Dominion. The green roots are cut, and the oaks will remember.' }]);
EV('lost-brightwall', { 'castle-lost': 'brightwall' }, [{ who: 'ysolde', text: 'Brightwall\'s banner is down. The sun still rises over it, but the gate is not ours.' }]);
EV('lost-gildmere', { 'castle-lost': 'gildmere' }, [{ who: 'lark', text: 'Gildmere has been taken. The granaries will feed someone else this winter.' }]);
EV('lost-frostwatch', { 'castle-lost': 'frostwatch' }, [{ who: 'brannoc', text: 'Frostwatch has fallen. The ice is ours still, but the walls are not.' }]);

// the rulers, the battles and the new classes
EV('ruler-hurt', { 'ruler-hurt': true }, [{ name: 'A ruler down', text: 'A rival ruler has been carried from the field. Their mana will be thin next season, and their banners lower.' }]);
EV('sanctum', { sanctum: true }, [
  { name: 'The Clockwork Sanctum', text: 'The gate of the Sanctum is shut, and the dials on its wall show three different seasons. Only when they agree does the gate open.' },
  { who: 'oren', text: 'Then we turn them, one by one, and we do not stop until they match.' }]);
EV('promoted', { promoted: true }, [{ name: 'A new road', text: 'A knight has earned a new name on the road, and a new class to go with it. The men cheer that one.' }]);
EV('quest-return', { 'quest-return': true }, [{ name: 'The quest', text: 'A knight has come back from the road with a story, a sack of coin and an odd kind of quiet about the eyes.' }]);
EV('start-wren-nessa', { season: 12 }, [{ name: 'The last season', text: 'Twelve seasons of the candle, and the Calendar City still stands. Whatever happens at Meridian, it happens now.' }]);
EV('recruit-gray-gossip', { season: 6, requires: { flag: 'read-letter' } }, [{ who: 'shade', text: 'I read that letter too, on the Stillhold wall. Vesper\'s hand writes like a clock. Shall I desert?', choices: [CH('Welcome Shade', [{ t: 'join', knight: 'shade' }]), CH('Keep him where he is', [])] }]);
EV('dunstan-fords', { season: 3, requires: { flag: 'walked-ice' } }, [{ who: 'dunstan', text: 'We walked the ice and the Dominion broke their line on the river. Men still talk about it at the fire.' }]);
EV('bryony-watch', { season: 9, requires: { flag: 'followed-scouts' } }, [{ who: 'bryony', text: 'The scouts we followed went straight to the Stillhold gate. Now we know where the Dominion sleeps.' }]);
EV('pell-coast', { season: 2, requires: { flag: 'coast-grain' } }, [{ who: 'pell', text: 'The coast grain kept the Saltmere men alive. Remember that when they ask for bread next winter.' }]);
EV('tobin-cellar', { season: 7, requires: { flag: 'burned-letter' } }, [{ who: 'tobin', text: 'Someone burned a letter in Mossgate and the smoke came down the Thornpass. I think I know who you are.', choices: [CH('Take Tobin into your service', [{ t: 'join', knight: 'tobin' }]), CH('Tell him to keep walking', [])] }]);
EV('magpie-shiny', { season: 10, requires: { flag: 'left-clock' } }, [{ who: 'magpie', text: 'You left the clock. Nobody leaves a clock. I shall take it myself, if it is still there.', choices: [CH('Take Magpie into your service', [{ t: 'join', knight: 'magpie' }]), CH('Let Magpie have the clock', [])] }]);
EV('kestrel-road', { season: 5, requires: { flag: 'wet-banners' } }, [{ who: 'kestrel', text: 'Wet banners on the road, and nobody saw the fire coming. I am impressed. Shall I ride with you?', choices: [CH('Take Kestrel into your service', [{ t: 'join', knight: 'kestrel' }]), CH('Thank her for the watch', [])] }]);
EV('nocturne-dusk', { season: 8, requires: { flag: 'held-walls' } }, [{ who: 'nocturne', text: 'The walls held and the Dominion learned to count. That is a lesson I shall remember to teach them.' }]);
EV('ashen-meridian', { 'march-to': 'meridian' }, [{ who: 'ashen', text: 'You march on Meridian. I am the one who counts its bells. Count them well, because I will.' }]);
EV('quill-road', { season: 4, requires: { flag: 'walked-ice' } }, [{ who: 'quill', text: 'I have written every road through the ice. Your walk is in the book now, and it reads well.', choices: [CH('Take Quill into your service', [{ t: 'join', knight: 'quill' }]), CH('Thank her for the record', [{ t: 'item', item: 'bronze-bell' }])] }]);
EV('raven-toll', { season: 11, requires: { flag: 'coast-grain' } }, [{ who: 'raven', text: 'The road is paid for, the grain is counted, and I want my toll. Pay it, or I take it from the cart.', choices: [CH('Pay Raven\'s toll (two mana)', [{ t: 'mana', n: -2 }]), CH('Refuse and let him try', [{ t: 'flag', f: 'refused-toll' }])] }]);
EV('mire-bell', { season: 12, requires: { flag: 'left-clock' } }, [{ who: 'mire', text: 'The bell rings once more and you will be too late. Or the bell will be yours.' }]);

// the rival lines: two lines before a battle when both rulers are on the field. Each pair plays once, keyed by the
// two rulers' ids in alphabetical order.
G.RIVAL_LINES = {
  'oren-tamsin': [{ who: 'oren', text: 'Tamsin, your sun has come to my green fields. Take your heat back to Solmark.' }, { who: 'tamsin', text: 'Your roots are deep, Oren. Mine are in the rock, and rock does not drown.' }],
  'oren-wren': [{ who: 'wren', text: 'Oren, the harvest is in and your fields are still green. I call that a kind of theft.' }, { who: 'oren', text: 'Then come and take the green. It is easy to carry off a gate.' }],
  'hale-oren': [{ who: 'hale', text: 'Oren, your spring has come early and cracked the ice on my fords. I will not forgive it.' }, { who: 'oren', text: 'Forgive the thaw, Hale. It was never mine to hold.' }],
  'tamsin-wren': [{ who: 'tamsin', text: 'Wren, you have your barns and I have my sun. Shall we see which one feeds the other?' }, { who: 'wren', text: 'Bring your sun to my granaries and we will see what it does to the grain.' }],
  'hale-tamsin': [{ who: 'tamsin', text: 'Hale, your frost has bitten our wells. A winter king in summer is a poor guest.' }, { who: 'hale', text: 'Then send your heat to the ice. We will see whether it melts before the thaw.' }],
  'hale-wren': [{ who: 'wren', text: 'Hale, the harvest waits for no ice. Let us settle the land before the frost takes both.' }, { who: 'hale', text: 'Settle it, then. The frost is patient, and I am not.' }],
  'vesper-oren': [{ who: 'vesper', text: 'Oren, you keep your clock broken. I have come to mend it, under my own hand.' }, { who: 'oren', text: 'You have never mended anything in your life, Regent. You only stop it.' }],
  'tamsin-vesper': [{ who: 'vesper', text: 'Sun-Queen, you burn the hour in every dawn. Let me stop it for you.' }, { who: 'tamsin', text: 'You will not stop a sunrise, Regent. You can only be burned by one.' }],
  'vesper-wren': [{ who: 'wren', text: 'Vesper, the harvest bells have stopped ringing. What did you do to my fields?' }, { who: 'vesper', text: 'I did nothing to them. They simply stopped waiting for you.' }],
  'hale-vesper': [{ who: 'hale', text: 'Vesper, the frost takes what it likes, and it does not like you.' }, { who: 'vesper', text: 'Frost is only time that has forgotten how to move. I shall remind it.' }]
};

// ---- src/20-sim-battle.js ----
// BattleSim: a hex battle as plain JSON state. It never touches the engine, the DOM, the clock or Math.random: the same
// setup and the same commands always give the same events (the tests check it). Two sides fight across a board of hexes
// for up to a set number of bells. In each bell every living unit acts once, fastest first. A unit may move, then strike,
// use one of its skills, or wait. Side 0 attacks: it wins by a knight on the Keep, or by routing side 1. Side 1 holds: it
// wins when the bells run out, or by routing side 0. Either side loses when its commander falls.
// A knight's skills come from its class at its level; a monster's from its form. Skills follow the plan's table (§6.7):
// areas, filters, powers, heals and statuses. Passive skills work all the time. A ward (a knight's class ward radius)
// guards the monsters of its side: a monster outside every ward hits and guards a fifth less.
// The Clockwork Sanctum's dials turn when a unit ends a move on them; the gate opens when all dials show the season.
(() => {
  const H = G;
  const SHIELD = 3;

  // ---- building a unit from a knight or a monster ----
  H.makeUnit = (spec, side, uid) => {
    const base = { uid, side, kind: spec.kind, ref: spec.ref, leader: !!spec.leader, campaignId: spec._id || null, owner: spec.owner ?? null,
      q: 0, r: 0, dead: false, moved: false, acted: false, movedCost: 0, cd: {}, used: {}, xp: 0, downed: false,
      status: { valor: 0, warded: 0, haste: 0, chill: 0, sleep: 0, stop: 0, poison: 0, burn: 0, weakened: 0, frostarmor: 0, windup: 0 },
      items: (spec.items || []).slice() };
    if (spec.kind === 'knight') {
      const k = H.get('knight', spec.ref), clsId = spec.cls || k.cls, cls = H.get('class', clsId);
      const level = spec.level || k.level, grow = level - k.level;
      const items = base.items.map(id => H.get('item', id));
      const bonus = key => items.reduce((n, it) => n + (it[key] || 0), 0);
      const skills = H.classSkills(clsId, k.element, level);
      const maxHp = k.hp + grow * 3 + (cls.hp || 0);
      return Object.assign(base, { name: k.name, knight: true, element: k.element, size: k.size || 'M', level, cls: clsId, skills,
        passives: skills.filter(id => H.get('skill', id).kind === 'passive'),
        maxHp, hp: spec.hp === undefined ? maxHp : Math.min(spec.hp, maxHp), atk: k.atk + grow + (cls.atk || 0) + bonus('atk'),
        def: k.def + grow + (cls.def || 0) + bonus('def'), mov: cls.mov + bonus('mov'), rng: cls.rng || 1, ward: cls.ward || 2,
        look: k.look, realm: k.realm, bondCap: cls.bond || k.bond || 3, title: k.title, weapon: cls.weapon, build: cls.build, moves: cls.moves });
    }
    const f = H.speciesForm(spec.ref, spec.form || 0);
    // a monster has its form's own skill, its element's strike, and from the third form a passive of its size
    const elemSkill = { verdant: 'entangle', solar: 'emberspit', ambered: 'gale', rime: 'hurlice', hour: 'pendulum', neutral: 'tailsweep' }[f.element] || 'tailsweep';
    const tierPassive = (spec.form || 0) >= 2 ? (f.size === 'L' ? 'regenerate' : 'thickhide') : null;
    const ids = [...new Set([f.skill, elemSkill, tierPassive].filter(Boolean).map(id => H.get('skill', id).id))];
    if (ids.length < 2) ids.push(ids.includes('screech') ? 'roar' : 'screech');
    const skills = ids;
    return Object.assign(base, { name: f.name, knight: false, element: f.element, size: f.size, level: (spec.form || 0) + 1, skills,
      passives: skills.filter(id => H.get('skill', id).kind === 'passive'),
      maxHp: f.hp, hp: spec.hp === undefined ? f.hp : spec.hp, atk: f.atk, def: f.def, mov: f.mov, rng: f.rng, ward: 0,
      look: f.look, form: spec.form || 0, species: spec.ref, bondTo: spec.bondTo || null });
  };

  // ---- the map: glyph rows to a tiles table (key "q,r" to a terrain id), the start cells, and the dials ----
  H.mapTiles = mapId => {
    const m = H.get('map', mapId), tiles = {}, starts = { 0: [], 1: [] }, dials = [];
    m.rows.forEach((row, rr) => {
      if (row.length !== H.MAP_ROWS_WIDTH) throw new Error(m.id + ' row ' + rr + ' is ' + row.length + ' wide');
      [...row].forEach((ch, c) => {
        const { q, r } = H.offsetToAxial(c, rr), key = H.key(q, r);
        const t = H.TERRAIN_OF_GLYPH[ch];
        if (!t) throw new Error(m.id + ': unknown glyph ' + ch);
        tiles[key] = t;
        if (ch === 'a') starts[0].push(key);
        if (ch === 'b') starts[1].push(key);
        if (ch === 'D') dials.push(key);
      });
    });
    const order = (a, b) => { const [qa, ra] = a.split(',').map(Number), [qb, rb] = b.split(',').map(Number); return ra - rb || qa - qb; };
    starts[0].sort(order); starts[1].sort(order); dials.sort(order);
    return { tiles, starts, dials, keep: Object.keys(tiles).find(k => tiles[k] === 'keep') || null, rows: m.rows.length, cols: H.MAP_ROWS_WIDTH };
  };

  const elemMult = (a, d) => (a === 'hour' ? 1.1 : H.OPPOSED[a] === d ? 1.3 : 1);
  const tideMult = (element, season) => {
    const s = H.get('season', season).element;
    if (element === s) return 1.2;
    if (element === H.OPPOSED[s]) return .85;
    return 1;
  };
  const NEG = ['chill', 'poison', 'burn', 'weakened', 'sleep', 'stop'];

  class BattleSim {
    constructor(state) { this.s = state; }

    // o: { map, season, seed, sides: [{ troops: [unitSpec, ...] }, ...], bellLimit, keepRule, tutorial, title }.
    static create(o) {
      const map = H.mapTiles(o.map), units = [];
      let uid = 0;
      for (const side of [0, 1]) {
        const cells = map.starts[side].slice();
        for (const spec of (o.sides[side].troops || [])) {
          if (!cells.length) break;
          const u = H.makeUnit(spec, side, 'u' + (uid++));
          Object.assign(u, H.parseKey(cells.shift()));
          units.push(u);
        }
      }
      const dials = {};
      map.dials.forEach((k, i) => { dials[k] = (i + 1) % 4; });   // the dials start at 1, 2, 3 in reading order
      const state = { map: o.map, season: o.season, seed: o.seed || 1, rng: new H.Rng(o.seed || 1).state(),
        bell: 0, bellLimit: o.bellLimit || H.tune.bellLimit, keep: o.keepRule === false ? null : map.keep,
        tiles: map.tiles, units, order: [], cursor: 0, over: false, winner: null, reason: '', tutorial: !!o.tutorial, captures: [],
        title: o.title || H.get('map', o.map).name, events: 0, dials, dialTarget: H.SEASON_ORDER.indexOf(o.season) };
      const sim = new BattleSim(state);
      sim.beginBell([]);
      return sim;
    }
    static load(json) { return new BattleSim(JSON.parse(JSON.stringify(json))); }
    serialize() { return JSON.parse(JSON.stringify(this.s)); }
    hash() { return H.hash(this.s); }
    rng() { const r = H.Rng.from(this.s.rng); const v = r.next(); this.s.rng = r.state(); return v; }
    roll(pct) { return this.rng() * 100 < pct; }

    // ---- queries ----
    get season() { return this.s.season; }
    tile(key) { const t = this.s.tiles[key]; return t ? H.get('terrain', t) : null; }
    alive(side) { return this.s.units.filter(u => u.side === side && !u.dead); }
    unitAt(q, r) { return this.s.units.find(u => !u.dead && u.q === q && u.r === r) || null; }
    byId(uid) { return this.s.units.find(u => u.uid === uid) || null; }
    current() { return this.s.over ? null : this.s.order[this.s.cursor] ? this.byId(this.s.order[this.s.cursor]) : null; }
    has(u, id) { return (u.passives || []).includes(id); }
    budget(u) { return u.mov + (u.status.haste > 0 ? 2 : 0) - (u.status.chill > 0 ? 2 : 0); }
    // a unit is warded when it is a knight, or a monster within the ward of a living knight on its side
    warded(u) {
      if (u.knight) return true;
      return this.s.units.some(k => !k.dead && k.knight && k.side === u.side && H.hexDist(k, u) <= (k.ward || 2));
    }
    // the cell a unit's skill or strike would touch: the terrain at a cell
    terrainAt(u) { return this.tile(H.key(u.q, u.r)); }

    // reach: Map of key to movement cost for a unit this turn (Dijkstra over the board; allies may be passed)
    reach(uid) {
      const u = this.byId(uid), out = new Map();
      if (!u || u.dead || u.moved || u.acted) return out;
      const budget = this.budget(u), start = H.key(u.q, u.r), cost = new Map([[start, 0]]), open = [start];
      while (open.length) {
        open.sort((a, b) => cost.get(a) - cost.get(b));
        const k = open.shift(), { q, r } = H.parseKey(k), c = cost.get(k);
        for (const n of H.neighbours(q, r)) {
          const nk = H.key(n.q, n.r), t = this.tile(nk);
          if (!t || !Number.isFinite(t.cost)) continue;
          const foe = this.unitAt(n.q, n.r);
          if (foe && foe.side !== u.side) continue;
          const nc = c + t.cost;
          if (nc > budget || (cost.has(nk) && cost.get(nk) <= nc)) continue;
          cost.set(nk, nc); open.push(nk);
        }
      }
      for (const [k, c] of cost) {
        const { q, r } = H.parseKey(k), occupant = this.unitAt(q, r);
        if (k !== start && (!occupant || occupant.uid === u.uid)) out.set(k, c);
      }
      if (!out.has(start)) out.set(start, 0);
      return out;
    }

    // ---- areas: the cells a skill touches when used on a cell from a unit ----
    // the direction (0..5) from the unit to a cell, for cones and lines
    dirTo(u, key) {
      const c = H.parseKey(key), a = H.hexWorld(u.q, u.r, 1), b = H.hexWorld(c.q, c.r, 1);
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      let best = 0, bd = 999;
      for (let i = 0; i < 6; i++) { const d = Math.abs(((ang - H.DIR_ANGLE[i]) % 360 + 540) % 360 - 180); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    areaCells(u, key, sk) {
      const out = [], c = key ? H.parseKey(key) : u, n = sk.range[1] || 0;
      const within = (centre, rad) => {
        for (let dq = -rad; dq <= rad; dq++) for (let dr = -rad; dr <= rad; dr++) {
          const q = centre.q + dq, r = centre.r + dr;
          if (Math.abs(dq + dr) > rad || H.hexDist({ q, r }, centre) > rad) continue;
          if (this.tile(H.key(q, r))) out.push({ q, r });
        }
      };
      switch (sk.area) {
        case 'single': if (key) out.push(c); break;
        case 'r1': within(c, 1); break;
        case 'r2': within(c, 2); break;
        case 'self-r1': within(u, 1); break;
        case 'self-r2': within(u, 2); break;
        case 'self': out.push(u); break;
        case 'adj': for (const d of H.neighbours(u.q, u.r)) if (this.tile(H.key(d.q, d.r))) out.push(d); break;
        case 'cone2': case 'cone3': {
          const d = this.dirTo(u, key), rad = sk.area === 'cone2' ? 2 : 3;
          for (let dq = -rad; dq <= rad; dq++) for (let dr = -rad; dr <= rad; dr++) {
            const q = u.q + dq, r = u.r + dr, dist = H.hexDist(u, { q, r });
            if (dist < 1 || dist > rad || !this.tile(H.key(q, r))) continue;
            const a = H.hexWorld(u.q, u.r, 1), b = H.hexWorld(q, r, 1), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
            if (Math.abs(((ang - H.DIR_ANGLE[d]) % 360 + 540) % 360 - 180) <= 62) out.push({ q, r });
          }
          break;
        }
        case 'line3': case 'line4': {
          const d = this.dirTo(u, key), len = sk.area === 'line3' ? 3 : 4;
          for (let k = 1; k <= len; k++) { const q = u.q + H.DIRS[d][0] * k, r = u.r + H.DIRS[d][1] * k; if (this.tile(H.key(q, r))) out.push({ q, r }); }
          break;
        }
        default: break;
      }
      return out;
    }
    // the units a skill of a unit touches on a cell
    affected(u, key, sk) {
      const cells = this.areaCells(u, key, sk), seen = new Set(), out = [];
      for (const c of cells) {
        const t = this.unitAt(c.q, c.r);
        if (!t || seen.has(t.uid)) continue;
        if (sk.filter === 'foes' && t.side === u.side) continue;
        if (sk.filter === 'allies' && (t.side !== u.side || (t.uid === u.uid && sk.area !== 'self' && !(sk.range[0] === 0)))) continue;
        if (sk.filter === 'own' && (t.side !== u.side || t.kind !== 'monster')) continue;
        if (sk.filter === 'self' && t.uid !== u.uid) continue;
        if (sk.filter === 'any' && false) continue;
        seen.add(t.uid); out.push(t);
      }
      return out;
    }
    // is the skill usable by a unit now (cooldown, once-a-battle, moving rules)
    usable(u, id) {
      const sk = H.get('skill', id);
      if (sk.kind === 'passive') return false;
      if ((u.cd[sk.id] || 0) > 0) return false;
      if (sk.once && u.used[sk.id]) return false;
      if (!sk.mobile && u.moved) return false;
      if (sk.needMove && (u.movedCost || 0) < sk.needMove) return false;
      if (u.status.sleep > 0 || u.status.stop > 0) return false;
      return true;
    }
    // the keys a skill may be aimed at from where the unit stands: each in range that has something to touch
    skillCandidates(uid, id) {
      const u = this.byId(uid);
      if (!u || u.dead || u.acted || !id) return [];
      const sk = H.get('skill', id);
      if (!this.usable(u, sk.id)) return [];
      const keys = [];
      const dmin = sk.range[0], dmax = sk.range[1];
      if (sk.area === 'self' || sk.area === 'self-r1' || sk.area === 'self-r2' || sk.area === 'adj') {
        if (this.affected(u, null, sk).length || sk.area === 'self' || sk.filter === 'self') keys.push(H.key(u.q, u.r));
        return keys;
      }
      if (sk.area === 'cone2' || sk.area === 'cone3' || sk.area === 'line3' || sk.area === 'line4') {
        const foes = this.s.units.filter(t => !t.dead && t.side !== u.side && H.hexDist(u, t) <= (sk.area === 'cone3' || sk.area === 'line4' ? 4 : 3));
        if (foes.length) { let best = foes[0]; for (const f of foes) if (H.hexDist(u, f) < H.hexDist(u, best)) best = f; keys.push(H.key(best.q, best.r)); }
        return keys;
      }
      // single, r1, r2: every cell in range with something of the filter's kind on it, or the unit itself for self-healing
      for (const k of Object.keys(this.s.tiles)) {
        const c = H.parseKey(k), d = H.hexDist(u, c);
        if (d < dmin || d > dmax) continue;
        if (!this.affected(u, k, sk).length) continue;
        keys.push(k);
      }
      return keys;
    }

    // the strikes a unit could make from a cell (the basic attack's reach)
    strikeable(uid, from) {
      const u = this.byId(uid);
      if (!u || u.dead || u.acted) return [];
      const at = from || { q: u.q, r: u.r };
      const range = u.rng + (this.has(u, 'eagleeye') && u.rng >= 2 ? 1 : 0);
      return this.s.units.filter(t => !t.dead && t.side !== u.side && H.hexDist(at, t) <= range);
    }
    // the skills a unit may use now (its own list, the usable ones)
    usableSkills(uid) {
      const u = this.byId(uid);
      if (!u) return [];
      return (u.skills || []).filter(id => this.usable(u, id) && this.skillCandidates(uid, id).length);
    }

    // ---- damage ----
    damage(att, def, mult = 1, opts = {}) {
      let a = att.atk + (att.status.valor > 0 ? 2 : 0) - (att.status.weakened > 0 ? 2 : 0);
      if (!this.warded(att)) a *= .8;
      const elem = opts.ignoreElem ? 1 : elemMult(att.element, def.element);
      const tide = opts.ignoreTide ? 1 : tideMult(att.element, this.s.season);
      let m = mult;
      if (opts.vsHour && def.element === 'hour') m *= opts.vsHour;
      if (opts.magic) m *= 1;
      if (this.has(att, 'ambush') && this.tile(H.key(att.q, att.r)) && this.tile(H.key(att.q, att.r)).id === 'forest') m *= 1.3;
      a *= elem * tide * H.tune.battleDamage * m;
      if (this.has(def, 'timeless')) a *= .5;
      let defence = (this.warded(def) ? def.def : def.def * .8) + this.terrainDef(def);
      if (def.status.warded > 0) defence += SHIELD;
      if (def.status.frostarmor > 0) defence += def.def * .4;
      if (this.has(def, 'thickhide')) defence += def.def * .1;
      if (def.side === 1 && att.side === 0) defence += H.tune.defenderGuard;
      if (opts.pierce) defence *= .5;
      if (opts.ignoreDef) defence = 0;
      return Math.max(1, Math.round(a - defence * .6));
    }
    terrainDef(u) { const t = this.tile(H.key(u.q, u.r)); return t ? t.def : 0; }
    hitChance(att, def, ranged, opts = {}) {
      const t = this.tile(H.key(def.q, def.r));
      let h = H.tune.hitChance + ((H.SIZE_HIT[att.size] || H.SIZE_HIT.M)[def.size] || 0) + (t ? t.hit : 0) + (opts.hit || 0);
      if (att.kind === 'monster' && this.s.units.some(k => !k.dead && k.knight && k.side === att.side && this.has(k, 'packtactics'))) h += 10;
      if (this.s.season === 'autumn' && ranged) h -= 15;
      return H.clamp(h, 30, 100);
    }
    forecast(att, def) {
      const ranged = H.hexDist(att, def) > 1 || att.rng > 1;
      return { hit: this.hitChance(att, def, ranged), dmg: this.damage(att, def) };
    }

    // a unit dies unless it has rebirth to spend; the death is an event
    settle(u, ev) {
      if (u.hp > 0 || u.dead) return;
      if (this.has(u, 'rebirth') && !u.used.rebirth) { u.used.rebirth = true; u.hp = Math.max(1, Math.ceil(u.maxHp * .3)); ev.push({ type: 'rebirth', uid: u.uid }); return; }
      u.dead = true; u.downed = true; ev.push({ type: 'down', uid: u.uid });
    }

    // a strike: a hit roll, the damage, the effects it carries, the counter a melee defender makes
    strike(att, def, opts = {}) {
      const ev = [], d = H.hexDist(att, def), ranged = d > 1 || att.rng > 1;
      const hit = this.roll(this.hitChance(att, def, ranged, opts));
      const e1 = { type: 'attack', from: att.uid, to: def.uid, hit, dmg: 0, counter: null, killed: false, skill: opts.skill || null };
      if (hit) {
        let dmg = this.damage(att, def, opts.mult || 1, opts);
        if (opts.basic && att.status.windup > 0) { dmg = Math.round(dmg * 1.5); att.status.windup = 0; }
        if (opts.pctTarget) dmg = Math.max(1, Math.round(def.maxHp * opts.pctTarget / 100));
        def.hp = Math.max(0, def.hp - dmg);
        e1.dmg = dmg;
        att.xp += 2;
        if (opts.drainPct) { const healed = Math.min(Math.floor(dmg * opts.drainPct / 100), att.maxHp - att.hp); att.hp += healed; e1.drained = healed; }
        if (opts.basic && this.has(att, 'frostfang') && this.roll(30)) def.status.chill = Math.max(def.status.chill, 2);
        if (opts.basic && this.has(att, 'stopbite') && this.roll(20)) def.status.stop = Math.max(def.status.stop, 1);
        if (this.has(def, 'thorns') && d === 1 && att.rng === 1 && !opts.noCounter) { const back = Math.max(1, Math.round(dmg * .1)); att.hp = Math.max(0, att.hp - back); e1.thorns = back; }
        if (def.hp <= 0) { e1.killed = true; att.xp += def.knight ? 10 : 6; }
        if (opts.burnsForest) { const t = this.tile(H.key(def.q, def.r)); if (t && t.id === 'forest') { this.s.tiles[H.key(def.q, def.r)] = 'ash'; ev.push({ type: 'terrain', key: H.key(def.q, def.r), from: 'forest', to: 'ash' }); } }
      }
      ev.push(e1);
      // a melee defender that survives strikes back when the attacker is next to it
      if (!opts.noCounter && hit && def.hp > 0 && def.rng === 1 && d === 1 && !def.dead) {
        const cHit = this.roll(this.hitChance(def, att, false));
        const cDmg = cHit ? this.damage(def, att, H.tune.counterDamage) : 0;
        att.hp = Math.max(0, att.hp - cDmg);
        e1.counter = { hit: cHit, dmg: cDmg, killed: cHit && att.hp <= 0 };
        if (e1.counter.killed) def.xp += att.knight ? 10 : 6;
      }
      this.settle(def, ev);
      this.settle(att, ev);
      return ev;
    }

    // a skill: its area, its filter, its power or heal, its statuses. Every skill ends the unit's turn.
    useSkill(u, id, key) {
      const sk = H.get('skill', id), ev = [];
      u.cd[sk.id] = sk.cd;
      if (sk.once) u.used[sk.id] = true;
      const targets = this.affected(u, key, sk);
      ev.push({ type: 'skill', uid: u.uid, skill: sk.id, name: sk.name, target: targets[0] ? targets[0].uid : u.uid, key: key || H.key(u.q, u.r) });
      if (sk.area === 'self' && !targets.length) targets.push(u);
      for (const t of targets) {
        if (t.dead) continue;
        if (sk.filter === 'foes' || sk.filter === 'own' && sk.power && typeof sk.power === 'number') {
          if (typeof sk.power === 'number' || sk.pctTarget) {
            ev.push(...this.strike(u, t, { mult: typeof sk.power === 'number' ? sk.power : 1, skill: sk.id, noCounter: true, magic: sk.magic,
              vsHour: sk.vsHour, ignoreElem: sk.ignoreElem, ignoreTide: sk.ignoreTide, ignoreDef: sk.ignoreDef, pierce: sk.pierce, drainPct: sk.drainPct, burnsForest: sk.burnsForest, pctTarget: sk.pctTarget, hit: sk.hit }));
          }
        }
        if (sk.power && typeof sk.power === 'object' && sk.power.heal !== undefined && t.hp < t.maxHp) {
          const amt = Math.min(sk.power.heal, t.maxHp - t.hp); t.hp += amt; ev.push({ type: 'heal', uid: t.uid, amount: amt });
        }
        if (sk.power && typeof sk.power === 'object' && sk.power.pctMax !== undefined && t.hp < t.maxHp) {
          const amt = Math.min(Math.round(t.maxHp * sk.power.pctMax / 100), t.maxHp - t.hp); t.hp += amt; ev.push({ type: 'heal', uid: t.uid, amount: amt });
        }
        if (sk.cleanse) for (const s of NEG) t.status[s] = 0;
        if (sk.push && t.side !== u.side) {
          const dir = this.dirTo(u, H.key(t.q, t.r)), nq = t.q + H.DIRS[dir][0], nr = t.r + H.DIRS[dir][1];
          if (this.tile(H.key(nq, nr)) && Number.isFinite(this.tile(H.key(nq, nr)).cost) && !this.unitAt(nq, nr)) { t.q = nq; t.r = nr; ev.push({ type: 'push', uid: t.uid }); }
          else ev.push(...this.strike(u, t, { mult: 0.4, noCounter: true, skill: sk.id, ignoreDef: true }));
        }
        for (const [s, p, b] of sk.effects || []) {
          if (t.dead) break;
          if (this.roll(p)) { t.status[s] = Math.max(t.status[s] || 0, b); ev.push({ type: 'status', uid: t.uid, status: s, bells: b }); }
        }
      }
      if (sk.area === 'self' && sk.id === 'frostarmor') for (const [s, , b] of sk.effects) u.status[s] = Math.max(u.status[s] || 0, b);
      return ev;
    }

    // a dial: a unit that ends a move on it turns it; the gate opens when every dial shows the battle's season
    dialTurn(key, ev) {
      if (this.s.dials[key] === undefined) return;
      this.s.dials[key] = (this.s.dials[key] + 1) % 4;
      ev.push({ type: 'dial', key, value: this.s.dials[key] });
      if (Object.values(this.s.dials).every(v => v === this.s.dialTarget)) {
        const gates = Object.keys(this.s.tiles).filter(k => this.s.tiles[k] === 'gate');
        for (const g of gates) { this.s.tiles[g] = 'plain'; ev.push({ type: 'terrain', key: g, from: 'gate', to: 'plain' }); }
        if (gates.length) ev.push({ type: 'gate', open: true });
      }
    }

    // ---- legality: null when the command is fine, else the reason it is not ----
    check(cmd) {
      if (this.s.over) return 'the battle is over';
      const actor = this.current();
      if (!actor) return 'no unit is acting';
      if (!cmd || cmd.uid !== actor.uid) return 'not this unit\'s turn';
      if (cmd.t === 'move') {
        if (actor.moved) return 'already moved this turn';
        const to = H.parseKey(cmd.to);
        if (!this.reach(actor.uid).has(cmd.to)) return 'out of reach';
        if (this.unitAt(to.q, to.r) && cmd.to !== H.key(actor.q, actor.r)) return 'occupied';
        return null;
      }
      if (cmd.t === 'attack') {
        const t = this.byId(cmd.target);
        if (!t || t.dead || t.side === actor.side) return 'no such target';
        if (H.hexDist(actor, t) > actor.rng + (this.has(actor, 'eagleeye') && actor.rng >= 2 ? 1 : 0)) return 'too far';
        return null;
      }
      if (cmd.t === 'skill') {
        if (!cmd.skill || !actor.skills.includes(H.get('skill', cmd.skill).id)) return 'not one of its skills';
        const sk = H.get('skill', cmd.skill);
        if (sk.kind === 'passive') return 'a passive skill is not used';
        if ((actor.cd[sk.id] || 0) > 0) return 'skill recharging';
        if (sk.once && actor.used[sk.id]) return 'used once already';
        if (!sk.mobile && actor.moved) return 'the skill comes before the move';
        if (sk.needMove && (actor.movedCost || 0) < sk.needMove) return 'it must move ' + sk.needMove + ' hexes first';
        if (actor.status.sleep > 0 || actor.status.stop > 0) return 'it cannot act';
        if (!this.skillCandidates(actor.uid, sk.id).includes(cmd.key || H.key(actor.q, actor.r))) return 'no target there';
        return null;
      }
      if (cmd.t === 'wait') return null;
      if (cmd.t === 'retreat') return actor.leader && actor.knight ? null : 'only a commander can retreat';
      return 'unknown command ' + cmd.t;
    }

    // apply: runs a command, returns the events it caused. An illegal command returns [{ type: 'refused', reason }].
    apply(cmd) {
      const why = this.check(cmd);
      if (why) return [{ type: 'refused', reason: why }];
      const ev = [], actor = this.current();
      if (cmd.t === 'move') {
        const to = H.parseKey(cmd.to), path = this.pathTo(actor, cmd.to);
        actor.movedCost = Math.max(0, this.reach(actor.uid).get(cmd.to) || 0);
        Object.assign(actor, { q: to.q, r: to.r, moved: true });
        ev.push({ type: 'move', uid: actor.uid, path });
        this.s.events++;
        this.dialTurn(cmd.to, ev);
        return ev.concat(this.afterAction(actor, ev));
      }
      if (cmd.t === 'attack') {
        ev.push(...this.strike(actor, this.byId(cmd.target), { basic: true }));
        return ev.concat(this.endTurn(actor, ev));
      }
      if (cmd.t === 'skill') {
        ev.push(...this.useSkill(actor, cmd.skill, cmd.key || H.key(actor.q, actor.r)));
        return ev.concat(this.endTurn(actor, ev));
      }
      if (cmd.t === 'wait') {
        ev.push({ type: 'wait', uid: actor.uid });
        return ev.concat(this.endTurn(actor, ev));
      }
      if (cmd.t === 'retreat') {
        // a commander retreats: its troop leaves the field and its side loses
        ev.push({ type: 'retreat', uid: actor.uid });
        return ev.concat(this.finish(1 - actor.side, 'retreat', ev));
      }
      return ev;
    }

    // the cheapest path (for the move animation): the keys from the unit's cell to the target
    pathTo(u, toKey) {
      const start = H.key(u.q, u.r), dist = new Map([[start, 0]]), prev = new Map(), open = [start];
      while (open.length) {
        open.sort((a, b) => dist.get(a) - dist.get(b));
        const k = open.shift(); if (k === toKey) break;
        const { q, r } = H.parseKey(k);
        for (const n of H.neighbours(q, r)) {
          const nk = H.key(n.q, n.r), t = this.tile(nk);
          if (!t || !Number.isFinite(t.cost)) continue;
          const foe = this.unitAt(n.q, n.r); if (foe && foe.side !== u.side) continue;
          const nd = dist.get(k) + t.cost;
          if (!dist.has(nk) || nd < dist.get(nk)) { dist.set(nk, nd); prev.set(nk, k); open.push(nk); }
        }
      }
      const path = [toKey]; let k = toKey;
      while (prev.has(k)) { k = prev.get(k); path.unshift(k); }
      return path;
    }

    // ends the unit's turn: the keep and victory checks, then the next unit (or the next bell)
    endTurn(u, ev) {
      u.acted = true;
      this.s.cursor++;
      const out = this.afterAction(u, ev);
      if (this.s.over) return out;
      while (this.s.cursor < this.s.order.length && this.byId(this.s.order[this.s.cursor]).hp <= 0) this.s.cursor++;
      if (this.s.cursor >= this.s.order.length) this.beginBell(out);
      else this.startTurn(out);
      return out;
    }

    // after any action: keep and victory checks (returns the events it adds)
    // (§5.10) the attacker wins by a knight on the Keep at the end of the last bell; see beginBell
    afterAction(u, ev) {
      const out = [];
      void ev; void u;
      for (const side of [0, 1]) {
        if (this.s.units.find(x => x.side === side && x.leader && x.hp <= 0)) return this.finish(1 - side, 'leader', out);
        if (!this.alive(side).length) return this.finish(1 - side, 'routed', out);
      }
      return out;
    }
    finish(winner, reason, out) {
      if (this.s.over) return out;
      this.s.over = true; this.s.winner = winner; this.s.reason = reason;
      out.push({ type: 'over', winner, reason });
      // the losers' monsters still standing may be captured (§5.9): by an adjacent knight of the winners, or one whose ward holds them
      const loser = 1 - winner;
      for (const u of this.s.units) {
        if (u.side !== loser || u.kind !== 'monster' || u.dead || u.hp <= 0) continue;
        const captors = this.s.units.filter(k => !k.dead && k.side === winner && k.knight && (H.hexDist(k, u) <= 1 || H.hexDist(k, u) <= (k.ward || 2)));
        if (!captors.length) continue;
        const own = this.s.units.find(k => !k.dead && k.knight && k.side === loser && H.hexDist(k, u) <= (k.ward || 2));
        let chance = 25 + (own ? 0 : 25) + (u.hp < u.maxHp * .3 ? 15 : 0);
        chance = Math.min(75, chance);
        if (this.roll(chance)) {
          const captor = captors.sort((a, b) => H.hexDist(a, u) - H.hexDist(b, u) || (a.uid < b.uid ? -1 : 1))[0];
          this.s.captures.push({ uid: u.uid, side: winner, by: captor.uid });
          out.push({ type: 'captured', uid: u.uid, by: captor.uid });
        }
      }
      return out;
    }

    // the start of a bell: the season's changes, the statuses wear off or bite, the order of play
    beginBell(out) {
      this.s.bell++;
      if (this.s.bell > this.s.bellLimit) {
        // the last bell has ended: the attacker holds the field if one of its knights stands on the Keep
        const k = this.s.keep ? H.parseKey(this.s.keep) : null;
        const onKeep = k && this.s.units.some(u => !u.dead && u.side === 0 && u.knight && u.q === k.q && u.r === k.r);
        return onKeep ? this.finish(0, 'keep', out) : this.finish(1, 'time', out);
      }
      out.push({ type: 'bell', n: this.s.bell, season: this.s.season });
      const b = this.s.bell, season = this.s.season;
      const change = (key, from, to) => { this.s.tiles[key] = to; out.push({ type: 'terrain', key, from, to }); };
      if (season === 'winter' && b === 1) for (const k of Object.keys(this.s.tiles)) if (this.s.tiles[k] === 'river') change(k, 'river', 'ice');
      if (season === 'spring' && (b === 4 || b === 8)) {
        const flood = [];
        for (const k of Object.keys(this.s.tiles)) {
          if (this.s.tiles[k] !== 'plain') continue;
          const { q, r } = H.parseKey(k);
          if (H.neighbours(q, r).some(n => this.s.tiles[H.key(n.q, n.r)] === 'river')) flood.push(k);
        }
        for (const k of flood) change(k, 'plain', 'swamp');
      }
      if (season === 'summer' && (b === 5 || b === 9)) {
        const burnt = Object.keys(this.s.tiles).filter(k => this.s.tiles[k] === 'forest');
        for (const k of burnt) change(k, 'forest', 'ash');
        for (const u of this.s.units) {
          if (u.dead || !burnt.includes(H.key(u.q, u.r)) || u.burnt === b) continue;
          u.burnt = b; u.hp = Math.max(0, u.hp - 3);
          out.push({ type: 'burn', uid: u.uid, dmg: 3 });
          this.settle(u, out);
        }
        out.push(...this.afterAction(null, out));
        if (this.s.over) return out;
      }
      for (const u of this.s.units) {
        if (u.dead) continue;
        for (const id of Object.keys(u.cd)) if (u.cd[id] > 0) u.cd[id]--;
        for (const s of ['valor', 'haste', 'chill', 'weakened', 'warded', 'frostarmor']) if (u.status[s] > 0) u.status[s]--;
        if (u.status.poison > 0) { u.status.poison--; u.hp = Math.max(0, u.hp - 2); out.push({ type: 'poison', uid: u.uid, dmg: 2 }); this.settle(u, out); }
        if (u.status.burn > 0) { u.status.burn--; u.hp = Math.max(0, u.hp - 2); out.push({ type: 'burn', uid: u.uid, dmg: 2 }); this.settle(u, out); }
        if (u.dead) continue;
        if (this.has(u, 'regenerate') && u.hp < u.maxHp) { const amt = Math.min(Math.ceil(u.maxHp * .1), u.maxHp - u.hp); u.hp += amt; out.push({ type: 'heal', uid: u.uid, amount: amt }); }
      }
      out.push(...this.afterAction(null, out));
      if (this.s.over) return out;
      const order = this.s.units.filter(u => u.hp > 0).sort((a, b) => {
        const sa = a.mov + (a.knight ? .5 : 0), sb = b.mov + (b.knight ? .5 : 0);
        return sb - sa || a.side - b.side || (a.uid < b.uid ? -1 : 1);
      });
      this.s.order = order.map(u => u.uid);
      this.s.cursor = 0;
      for (const u of this.s.units) { u.moved = false; u.acted = false; u.movedCost = 0; }
      this.startTurn(out);
      return out;
    }

    // a unit whose turn it is: asleep or stopped, it loses the turn; the rest take theirs
    startTurn(out) {
      for (let guard = 0; guard < 200; guard++) {
        const u = this.current();
        if (!u) return out;
        if (u.status.sleep > 0 || u.status.stop > 0) {
          if (u.status.sleep > 0) u.status.sleep--;
          if (u.status.stop > 0) u.status.stop--;
          u.acted = true;
          out.push({ type: 'stunned', uid: u.uid });
          this.s.cursor++;
          while (this.s.cursor < this.s.order.length && this.byId(this.s.order[this.s.cursor]).hp <= 0) this.s.cursor++;
          if (this.s.cursor >= this.s.order.length) { this.beginBell(out); return out; }
          continue;
        }
        out.push({ type: 'turn', uid: u.uid });
        return out;
      }
      return out;
    }

    // a plain summary for the debug handle and the tests
    snapshot() {
      return { bell: this.s.bell, season: this.s.season, over: this.s.over, winner: this.s.winner, reason: this.s.reason,
        current: this.s.over ? null : this.s.order[this.s.cursor] || null,
        units: this.s.units.map(u => [u.uid, u.side, u.name, u.q, u.r, u.hp, u.maxHp, u.dead ? 1 : 0]) };
    }
  }
  H.BattleSim = BattleSim;
})();

// ---- src/21-ai-battle.js ----
// The battle planner. It looks at a BattleSim and returns the next legal command for the unit whose turn it is. It is
// deterministic: ties break by unit id and cell key, so the same battle always plays the same way. It serves the CPU
// sides, Delegate (auto-resolve), the attract mode and the AI Hub copies. Each call either changes the state or ends the
// unit's turn, so a battle always reaches its end (tests/t-mechanics.mjs plays whole battles to check that).
(() => {
  const H = G;

  // what a strike from u on t is worth: its expected damage, the chance it kills, and the counter it draws
  const strikeValue = (sim, u, t, from) => {
    const d = H.hexDist(from, t);
    const ranged = d > 1 || u.rng > 1;
    const dmg = sim.damage(u, t);
    const hit = sim.hitChance(u, t, ranged) / 100;
    let v = dmg * hit;
    if (t.hp <= dmg) v += t.knight ? 8 : 5;
    if (t.rng === 1 && d === 1) v -= sim.damage(t, u, H.tune.counterDamage) * (sim.hitChance(t, u, false) / 100) * .7;
    return v;
  };
  // the best basic strike a unit could make from a cell: { value, target }
  const bestStrike = (sim, u, from) => {
    let best = null;
    for (const t of sim.strikeable(u.uid, from)) {
      const v = strikeValue(sim, u, t, from);
      if (!best || v > best.value || (v === best.value && t.uid < best.target.uid)) best = { value: v, target: t };
    }
    return best;
  };
  const nearestEnemy = (sim, u, from) => {
    let best = Infinity;
    for (const t of sim.alive(1 - u.side)) best = Math.min(best, H.hexDist(from, t));
    return best;
  };
  // the value of a skill aimed at a key: the foes it strikes, the allies it mends, the statuses it lays
  const skillValue = (sim, u, id, key) => {
    const sk = H.get('skill', id);
    let v = 0;
    for (const t of sim.affected(u, key, sk)) {
      if (t.side !== u.side) {
        const mult = typeof sk.power === 'number' ? sk.power : 1;
        const dmg = sim.damage(u, t, mult, { magic: sk.magic, vsHour: sk.vsHour, ignoreElem: sk.ignoreElem, ignoreTide: sk.ignoreTide, pierce: sk.pierce });
        if (typeof sk.power === 'number' || sk.pctTarget) v += Math.max(0, dmg * .8) + (t.hp <= dmg ? 6 : 0);
        v += (sk.effects || []).length * 2;
      } else if (sk.power && typeof sk.power === 'object') {
        const heal = sk.power.heal !== undefined ? sk.power.heal : Math.round(t.maxHp * (sk.power.pctMax || 0) / 100);
        v += Math.min(heal, t.maxHp - t.hp) * .6;
      } else if (sk.effects && sk.effects.length) v += 2;
    }
    if (sk.area === 'self' && sk.effects && sk.effects.length) v += 1;
    return v;
  };

  H.aiBattle = {
    // the next command for the unit whose turn it is
    next(sim) {
      const u = sim.current();
      if (!u) return null;
      const enemies = sim.alive(1 - u.side);
      if (!enemies.length) return { t: 'wait', uid: u.uid };

      // 1. a skill worth more than the basic strike from where the unit stands (or after its move)
      const here = bestStrike(sim, u, { q: u.q, r: u.r });
      let bestSkill = null;
      for (const id of u.skills || []) {
        for (const key of sim.skillCandidates(u.uid, id)) {
          const v = skillValue(sim, u, id, key);
          if (v > 0 && (!bestSkill || v > bestSkill.v + 1e-9)) bestSkill = { v, id, key };
        }
      }
      if (bestSkill && (!here || bestSkill.v > here.value)) return { t: 'skill', uid: u.uid, skill: bestSkill.id, key: bestSkill.key };

      // 2. a commander holds its place while the enemy is far away
      const hold = u.leader && u.side === 1 && nearestEnemy(sim, u, u) > 4;

      // 3. move: the best cell in reach, by what it lets the unit strike, the ground it stands on and the enemy's distance
      if (!u.moved && !hold) {
        let best = null;
        for (const k of sim.reach(u.uid).keys()) {
          const c = H.parseKey(k);
          const strike = bestStrike(sim, u, c);
          const near = nearestEnemy(sim, u, c);
          const t = sim.tile(k);
          let score = (strike ? 10 + strike.value * 1.5 : 0) - near * (strike ? .2 : 1.5) + (t ? t.def * 1.5 : 0);
          if (u.leader && u.side === 0 && sim.s.keep) score -= H.hexDist(c, H.parseKey(sim.s.keep)) * .3;
          if (u.hp < u.maxHp * .4) score -= Math.max(0, 3 - near) * 3;
          if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && k < best.key)) best = { key: k, score };
        }
        if (best && best.key !== H.key(u.q, u.r)) return { t: 'move', uid: u.uid, to: best.key };
      }

      // 4. strike from here (after any move), or wait
      const now = bestStrike(sim, u, { q: u.q, r: u.r });
      if (now) return { t: 'attack', uid: u.uid, target: now.target.uid };
      if (!u.acted && !u.moved && !hold && nearestEnemy(sim, u, u) <= u.mov + u.rng + 3) {
        // a unit that could not get close this turn still steps toward the nearest enemy
        let best = null;
        for (const k of sim.reach(u.uid).keys()) {
          const d = nearestEnemy(sim, u, H.parseKey(k));
          if (!best || d < best.d) best = { key: k, d };
        }
        if (best && best.key !== H.key(u.q, u.r)) return { t: 'move', uid: u.uid, to: best.key };
      }
      return { t: 'wait', uid: u.uid };
    }
  };

  // play a whole battle with the planner (Delegate, the attract mode, the tests); returns the events
  H.autoplayBattle = (sim, limit = 4000) => {
    const events = [];
    for (let i = 0; i < limit && !sim.s.over; i++) {
      const cmd = H.aiBattle.next(sim);
      if (!cmd) break;
      const ev = sim.apply(cmd);
      events.push(...ev);
      if (ev.some(e => e.type === 'refused')) throw new Error('planner refused: ' + ev[0].reason + ' ' + JSON.stringify(cmd));
    }
    return events;
  };
})();

// ---- src/22-sim-campaign.js ----
// CampaignSim: the season loop as plain JSON state. A season is Tidings, then Muster (every realm acts: summon, bind,
// evolve, unbind, move, quest, equip, march), then March (each declared march becomes a battle, fought in the order it was
// declared), then Aftermath (wounds heal, quests return, mana comes in, the Hour-Candle burns down). A battle a human is in
// pauses the sim until the battle scene hands its result back (finishPending). The sim never touches the engine, the clock
// or Math.random.
(() => {
  const H = G;
  const STOCK_START = ['sun-rune', 'green-phial', 'iron-shield'];
  const REALM_MONSTER = { verdance: 'gleam-slime', solmark: 'cinder-imp', amberlyn: 'dusk-bat', hoarfast: 'frost-wisp', dominion: 'bonewalker', free: 'thorn-hare' };
  const WILD = ['gleam-slime', 'dusk-bat', 'thorn-hare', 'cinder-imp', 'frost-wisp', 'storm-pixie'];
  const CASTLE_CAP = 6;      // monsters a castle can hold (bound ones included)
  const SIDE_CAP = 8;        // units a side brings into a battle
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  class CampaignSim {
    constructor(state) { this.s = state; }

    // o: { humans: [realm ids], seed }. Every castle starts with its realm; every knight at its start castle; each realm's
    // capital holds one monster; the humans start with some mana.
    static create(o = {}) {
      const humans = o.humans || ['verdance'];
      const castles = {}, knights = {}, monsters = {}, realms = {};
      for (const c of H.all('castle')) castles[c.id] = { owner: c.realm, summoned: 0 };
      // the plan's starting mana (§4.5): 120 for each season-realm, 300 for the Dominion; the brigands have no economy
      for (const r of H.all('realm')) realms[r.id] = { mana: r.id === 'dominion' ? 300 : r.id === 'free' ? 0 : 120, rulerWounded: false };
      for (const k of H.all('knight')) {
        if (!k.start) continue;
        knights[k.id] = { id: k.id, realm: k.realm, castle: k.start, state: 'ready', woundedFor: 0, questFor: 0, questFrom: null,
          level: k.level, xp: 0, hp: k.hp, items: [] };
      }
      let uid = 0;
      for (const c of H.all('castle')) {
        const sp = REALM_MONSTER[c.realm];
        if (sp && c.capital) {
          const id = 'm' + (uid++), f = H.speciesForm(sp, 0);
          monsters[id] = { uid: id, species: sp, form: 0, hp: f.hp, maxHp: f.hp, castle: c.id, bondTo: null };
        }
        // the Calendar City is garrisoned: three of the Dominion's own creatures keep its walls
        if (c.id === 'meridian') for (let i = 0; i < H.tune.meridianGarrison; i++) { const id = 'm' + (uid++), f = H.speciesForm('bonewalker', 0); monsters[id] = { uid: id, species: 'bonewalker', form: 0, hp: f.hp, maxHp: f.hp, castle: c.id, bondTo: null }; }
      }
      const state = { season: 0, year: 1, phase: 'muster', humans, rng: new H.Rng(o.seed || 1).state(), castles, knights, monsters,
        realms, stock: STOCK_START.slice(), marches: [], marchAt: 0, pending: null, log: [], report: [], ended: null, stilled: null,
        nextUid: uid, candle: H.tune.candleSeasons, seasonsPlayed: 0, flags: {}, queue: [], seen: {} };
      const sim = new CampaignSim(state);
      sim.fire('start', humans[0]);
      sim.beginMuster();
      return sim;
    }
    static load(json) { return new CampaignSim(JSON.parse(JSON.stringify(json))); }
    serialize() { return JSON.parse(JSON.stringify(this.s)); }
    hash() { return H.hash(this.s); }
    rng() { const r = H.Rng.from(this.s.rng); const v = r.next(); this.s.rng = r.state(); return v; }
    rand(a, b) { return a + Math.floor(this.rng() * (b - a + 1)); }
    get season() { return H.SEASON_ORDER[this.s.season]; }
    isHuman(realm) { return this.s.humans.includes(realm); }
    ownerOf(castle) { return this.s.castles[castle].owner; }
    knightsAt(castle) { return Object.values(this.s.knights).filter(k => k.castle === castle && k.state !== 'quest'); }
    bondedTo(knightId) { return Object.values(this.s.monsters).filter(m => m.bondTo === knightId); }
    unboundAt(castle) { return Object.values(this.s.monsters).filter(m => m.castle === castle && !m.bondTo); }
    monstersAt(castle) { return Object.values(this.s.monsters).filter(m => m.castle === castle); }
    realmRuler(realm) { return H.get('realm', realm).ruler || null; }
    bondCap(knightId) { return H.get('knight', knightId).bond; }
    // the species' costs are the plan's scale (about six times the first table's): a summon costs cost x 6 x tune
    summonCost(species) { return Math.max(1, Math.round(H.get('species', species).forms[0].cost * 6 * H.tune.summonCost)); }
    evolveCost(species, form = 1) { return Math.max(1, Math.round(H.get('species', species).forms[form].cost * 6 * H.tune.summonCost)); }
    adjacentCastles(castle) { return H.neighbourCastles(castle); }
    log1(text) { this.s.log.push(text); return text; }
    // ---- story triggers: an event whose trigger matches plays once, in the order it fired ----
    fire(kind, value) {
      for (const ev of H.all('event')) {
        if (ev.when[kind] === undefined || ev.when[kind] !== value || this.s.seen[ev.id]) continue;
        if (ev.requires && !this.s.flags[ev.requires.flag]) continue;
        this.s.seen[ev.id] = true;
        this.s.queue.push(ev.id);
      }
    }
    nextEvent() { return this.s.queue.length ? H.get('event', this.s.queue.shift()) : null; }
    // a choice's effects: a flag, mana, an item, or a knight who joins the player's realm
    applyEffects(list, realm) {
      for (const e of list || []) {
        if (e.t === 'flag') this.s.flags[e.f] = true;
        if (e.t === 'mana') this.s.realms[realm].mana = Math.max(0, this.s.realms[realm].mana + e.n);
        if (e.t === 'item') this.s.stock.push(e.item);
        if (e.t === 'join') {
          const K = this.s.knights[e.knight];
          if (K) { K.realm = realm; K.castle = H.get('realm', realm).capital; for (const m of this.bondedTo(K.id)) m.castle = K.castle; }
        }
      }
    }
    report1(text, kind = 'info') { this.s.report.push({ text, kind }); return text; }
    moveKnight(K, to) { K.castle = to; for (const m of this.bondedTo(K.id)) m.castle = to; }
    levelUp(k) {
      // experience: 4 x the level to the next (knights grow through battle, §14.5's targets need them to)
      while (k.xp >= 4 * k.level) {
        k.xp -= 4 * k.level; k.level++; k.hp += 3;
        this.report1(H.get('knight', k.id).name + ' reached level ' + k.level + '.', 'level');
      }
    }

    // ---- muster: one action for a realm. Returns null when it is done, else the reason it was refused. ----
    do(a, realm) {
      const s = this.s;
      if (s.phase !== 'muster') return 'not the muster';
      if (s.ended) return 'the game is over';
      const K = s.knights[a.knight], M = s.monsters[a.monster];
      const holds = castle => castle && this.ownerOf(castle) === realm;
      if (a.t === 'summon') {
        if (!holds(a.castle)) return 'not your castle';
        if (s.castles[a.castle].summoned >= 3) return 'three summons a castle is the most in one season';
        if (this.monstersAt(a.castle).length >= CASTLE_CAP) return 'the castle is full';
        const cost = this.summonCost(a.species);
        if (s.realms[realm].mana < cost) return 'not enough mana (' + cost + ')';
        s.realms[realm].mana -= cost; s.castles[a.castle].summoned++;
        const id = 'm' + s.nextUid++, f = H.speciesForm(a.species, 0);
        s.monsters[id] = { uid: id, species: a.species, form: 0, hp: f.hp, maxHp: f.hp, castle: a.castle, bondTo: null };
        this.log1(H.get('realm', realm).name + ' summoned a ' + f.name + ' at ' + H.get('castle', a.castle).name + '.');
        return null;
      }
      if (a.t === 'bind') {
        if (!M || !K) return 'no such monster or knight';
        if (M.castle !== K.castle || M.bondTo) return 'the monster is not free at this castle';
        if (K.state !== 'ready' || !holds(K.castle)) return 'the knight is not ready here';
        if (this.bondedTo(K.id).length >= this.bondCap(K.id)) return 'the knight\'s bond is full';
        M.bondTo = K.id;
        return null;
      }
      if (a.t === 'unbind') {
        if (!M || !M.bondTo) return 'not bound';
        if (!holds(s.knights[M.bondTo].castle)) return 'not your knight';
        M.bondTo = null;
        return null;
      }
      if (a.t === 'evolve') {
        if (!M || M.form >= 2) return 'cannot evolve that';
        const bound = M.bondTo && s.knights[M.bondTo];
        const need = M.form === 0 ? 3 : 6;
        if (!bound || bound.level < need || !holds(bound.castle)) return 'its knight must be level ' + need + ' at a castle you hold';
        const cost = this.evolveCost(M.species, M.form + 1);
        if (s.realms[realm].mana < cost) return 'not enough mana (' + cost + ')';
        const f = H.speciesForm(M.species, M.form + 1);
        s.realms[realm].mana -= cost; M.form = M.form + 1; M.maxHp = f.hp; M.hp = f.hp;
        this.log1(f.name + ' rises from its ' + H.get('species', M.species).name + ' shape.');
        this.report1(f.name + ' rises from its ' + H.get('species', M.species).name + ' shape.', 'promote');
        return null;
      }
      if (a.t === 'promote') {
        if (!K || K.state !== 'ready' || !holds(K.castle)) return 'not a knight you can promote';
        const cur = H.get('class', K.cls || H.get('knight', K.id).cls);
        if (!cur.next) return cur.name + ' has no higher class';
        const next = H.get('class', cur.next), need = H.PROMOTE_LEVEL[next.tier], cost = H.PROMOTE_COST[next.tier];
        if (K.level < need) return 'needs level ' + need;
        if (s.realms[realm].mana < cost) return 'not enough mana (' + cost + ')';
        s.realms[realm].mana -= cost; K.cls = next.id; K.hp += next.hp || 0;
        this.fire('promoted', true);
        this.log1(H.get('knight', K.id).name + ' is now a ' + next.name + '.');
        this.report1(H.get('knight', K.id).name + ' is now a ' + next.name + '.', 'promote');
        return null;
      }
      if (a.t === 'move') {
        if (!K || K.state !== 'ready' || !holds(K.castle)) return 'not a knight you can move';
        if (this.isStill(K.castle)) return 'the Gray Knight has stilled this castle';
        if (!this.adjacentCastles(K.castle).includes(a.to)) return 'not on a road from here';
        if (s.marches.some(m => m.knight === K.id)) return 'the knight has a march';
        this.moveKnight(K, a.to);
        return null;
      }
      if (a.t === 'quest') {
        if (!K || K.state !== 'ready' || !holds(K.castle)) return 'not a knight you can send';
        if (this.isStill(K.castle)) return 'the Gray Knight has stilled this castle';
        if (s.marches.some(m => m.knight === K.id)) return 'the knight has a march';
        K.state = 'quest'; K.questFor = H.tune.questSeasons; K.questFrom = K.castle;
        this.log1(H.get('knight', K.id).name + ' rides out on a quest from ' + H.get('castle', K.castle).name + '.');
        return null;
      }
      if (a.t === 'equip') {
        if (!K || !holds(K.castle)) return 'not your knight';
        if (!s.stock.includes(a.item)) return 'not in the treasury';
        if (K.items.length) s.stock.push(K.items.shift());
        s.stock.splice(s.stock.indexOf(a.item), 1);
        K.items = [a.item];
        return null;
      }
      if (a.t === 'march') {
        if (!K || K.state !== 'ready' || !holds(K.castle)) return 'not a knight you can march';
        if (this.isStill(K.castle)) return 'the Gray Knight has stilled this castle';
        if (!this.adjacentCastles(K.castle).includes(a.to)) return 'not on a road from here';
        if (this.ownerOf(a.to) === realm) return 'that castle is yours';
        if (s.marches.some(m => m.knight === K.id)) return 'the knight has a march';
        s.marches.push({ knight: K.id, from: K.castle, to: a.to, by: realm });
        if (a.to === 'meridian') { this.fire('march-to', 'meridian'); this.fire('sanctum', true); }
        return null;
      }
      return 'unknown action ' + a.t;
    }

    // ---- the season ----
    // Tidings and the start of muster: the knights heal, the castles' summons reset, and the CPU realms muster
    beginMuster() {
      const s = this.s;
      s.phase = 'muster';
      for (const c of Object.values(s.castles)) c.summoned = 0;
      const season = H.get('season', this.season);
      this.log1(season.name + ' ' + s.year + ': ' + season.tidings);
      this.report1(season.tidings, 'tidings');
      for (const k of Object.values(s.knights)) {
        if (k.state === 'ready' && this.ownerOf(k.castle) === k.realm) k.hp = Math.min(H.get('knight', k.id).hp + (k.level - H.get('knight', k.id).level) * 3, k.hp + 3);
        // the Gray Knight keeps the Calendar City: he is back on his wall at the start of every season
        if (k.id === 'gray' && k.state === 'wounded') { k.state = 'ready'; k.woundedFor = 0; k.hp = H.get('knight', 'gray').hp; }
      }
      this.fire('season', s.seasonsPlayed);
      this.fire('candle', s.candle);
      this.chooseStill();
      for (const r of H.all('realm')) if (!s.humans.includes(r.id) && r.id !== 'free') H.aiCampaign.muster(this, r.id);
    }
    // the human's muster is over: the marches resolve. Returns { battle: pending } when a human battle waits for the scene.
    endMuster() {
      if (this.s.phase !== 'muster' || this.s.ended) return { battle: null };
      this.s.phase = 'march';
      this.s.marchAt = 0;
      return this.resolveMarches();
    }
    resolveMarches() {
      const s = this.s;
      const validMarch = (x) => { const K = s.knights[x.knight]; return !!K && K.state === 'ready' && K.castle === x.from && this.ownerOf(x.from) === x.by && this.ownerOf(x.to) !== x.by; };
      while (s.marchAt < s.marches.length) {
        const m = s.marches[s.marchAt];
        if (m.done || !validMarch(m)) { m.done = true; s.marchAt++; continue; }
        // an army: every march on the same castle by the same realm, from the castles beside it, fights as one battle
        const group = [m];
        for (const x of s.marches.slice(s.marchAt + 1)) if (!x.done && x.to === m.to && x.by === m.by && validMarch(x)) group.push(x);
        for (const g of group) g.done = true;
        this.fire('march-by', m.by);
        const setup = this.battleSetup(m, group);
        if (this.isHuman(m.by) || this.isHuman(this.ownerOf(m.to))) {
          s.pending = { march: m, group, setup, sim: H.BattleSim.create(setup).serialize() };
          this.report1('The march on ' + H.get('castle', m.to).name + ' begins.', 'battle');
          return { battle: s.pending };
        }
        const sim = H.BattleSim.create(setup);
        H.autoplayBattle(sim, 5000);
        this.finishBattle(sim, m, group);
        s.marchAt++;
        if (s.ended) return { battle: null };
      }
      this.endSeason();
      return { battle: null };
    }
    // the battle the scene fought for the pending march: hand its result back, and the marches carry on
    finishPending(sim) {
      const p = this.s.pending;
      if (!p) return { battle: null };
      this.finishBattle(sim, p.march, p.group || [p.march]);
      this.s.pending = null;
      this.s.marchAt++;
      if (this.s.ended) return { battle: null };
      return this.resolveMarches();
    }
    // a march's battle: the attacker's knight with its bound monsters; the castle's knights (up to two) and their monsters,
    // then the monsters that stand free there
    battleSetup(m, group = [m]) {
      const s = this.s, castle = m.to;
      const att = [];
      group.forEach((g, i) => {
        const K = s.knights[g.knight];
        att.push(this.knightSpec(K, i === 0));
        for (const mo of this.bondedTo(K.id)) att.push({ kind: 'monster', ref: mo.species, form: mo.form, hp: mo.hp, _id: mo.uid });
      });
      // the castle's commander is its strongest knight; a ruler defends from home only when it is the strongest
      // a ruler stays out of the defence while another knight can hold the castle: a fallen ruler ends the game
      const ready = this.knightsAt(castle).filter(k => k.state === 'ready');
      const others = ready.filter(k => k.id !== this.realmRuler(k.realm));
      const garrison = (others.length ? others : ready).sort((a, b) => b.level - a.level || (a.id < b.id ? -1 : 1));
      const def = [];
      garrison.slice(0, 2).forEach((k, i) => {
        def.push(this.knightSpec(k, i === 0));
        for (const mo of this.bondedTo(k.id)) def.push({ kind: 'monster', ref: mo.species, form: mo.form, hp: mo.hp, _id: mo.uid });
      });
      for (const mo of this.unboundAt(castle)) def.push({ kind: 'monster', ref: mo.species, form: mo.form, hp: mo.hp, _id: mo.uid });
      const map = H.MAP_FOR_CASTLE[castle] || H.MAP_POOL[hashOf(castle + m.knight) % H.MAP_POOL.length];
      return { map, season: this.season, seed: this.rand(1, 2 ** 30), sides: [{ troops: att.slice(0, SIDE_CAP) }, { troops: def.slice(0, SIDE_CAP) }],
        bellLimit: H.tune.bellLimit, title: H.get('castle', castle).name };
    }

    // a knight as a battle unit: its class, its items, and the healing its items give before the first bell
    knightSpec(K, leader) {
      const items = K.items.map(id => H.get('item', id));
      const heal = items.reduce((n, it) => n + (it.heal || 0), 0);
      return { kind: 'knight', ref: K.id, level: K.level, cls: K.cls, items: K.items.slice(), hp: Math.min(K.hp + heal, 999), leader };
    }

    // Stillness (§4.16): from autumn of year three, each Tidings the Gray Knight stills one castle that borders the Dominion
    // (seeded): it yields nothing that season, and its troops can't move, march or quest. Meridian is never stilled.
    chooseStill() {
      const s = this.s;
      s.stilled = null;
      if (s.seasonsPlayed < 10) return;
      const dominion = Object.keys(s.castles).filter(c => s.castles[c].owner === 'dominion');
      const pool = Object.keys(s.castles).filter(c => c !== 'meridian' && s.castles[c].owner !== 'dominion' && this.adjacentCastles(c).some(d => dominion.includes(d))).sort();
      if (!pool.length) return;
      s.stilled = pool[this.rand(0, pool.length - 1)];
      this.fire('stillness', true);
      this.report1('The Gray Knight stills ' + H.get('castle', s.stilled).name + ' for the season.', 'still');
    }
    isStill(castle) { return this.s.stilled === castle; }

    // a finished battle: wounds, experience, the monsters that fell, and the castle that changes hands
    finishBattle(sim, m, group = [m]) {
      const s = this.s, castle = m.to, K = s.knights[m.knight];
      const sideRealm = { 0: m.by, 1: this.ownerOf(castle) };
      const attackerWon = sim.s.winner === 0;
      for (const u of sim.s.units) {
        if (u.kind === 'knight') {
          const k = s.knights[u.ref];
          // every knight that fought earns experience, win or lose; the battle's own kills and hits add to it
          k.xp += Math.round((u.xp + 4) * H.tune.knightXp);
          this.levelUp(k);
          k.hp = Math.max(1, u.hp);
          if (u.dead) {
            if (k.id === 'gray') this.fire('wounded', 'gray');
            k.state = 'wounded'; k.woundedFor = 1;
            const realm = sideRealm[u.side];
            if (u.ref === this.realmRuler(realm)) {
              if (this.isHuman(realm)) this.endRuler(realm);
              else { s.realms[realm].rulerWounded = true; this.fire('ruler-hurt', true); }
            }
          }
        } else if (u.campaignId && s.monsters[u.campaignId]) {
          const mo = s.monsters[u.campaignId];
          if (u.dead) { delete s.monsters[u.campaignId]; this.report1(H.get('species', mo.species).name + ' fell.', 'fell'); }
          else {
            mo.hp = u.hp;
            // a captured monster joins its captor's reserve: at the contested castle if the captors won, else at the captor's capital
            const cap = sim.s.captures.find(c => c.uid === u.uid);
            if (cap) {
              const captorRealm = sideRealm[cap.side];
              mo.castle = attackerWon === (cap.side === 0) ? castle : H.get('realm', captorRealm).capital;
              mo.bondTo = null;
              this.report1(H.get('species', mo.species).name + ' was taken by ' + H.get('realm', captorRealm).name + '.', 'captured');
            }
          }
        }
      }
      if (attackerWon) {
        const old = this.ownerOf(castle);
        if (this.isHuman(m.by)) this.fire('capture', castle);
        if (this.isHuman(old)) this.fire('castle-lost', castle);
        if (H.get('castle', castle).capital && this.isHuman(old)) this.fire('castle-lost', castle);
        s.castles[castle].owner = m.by;
        this.report1(H.get('realm', m.by).name + ' took ' + H.get('castle', castle).name + ' from ' + H.get('realm', old).name + '.', this.isHuman(m.by) ? 'won' : 'captured');
        this.log1(H.get('castle', castle).name + ' changed hands.');
        for (const g of group) { const G1 = s.knights[g.knight]; if (G1 && G1.state !== 'quest') this.moveKnight(G1, castle); }
        // the defeated knights fall back to a neighbouring castle of their own, if one stands
        for (const k of Object.values(s.knights)) {
          if (k.castle !== castle || k.realm === m.by) continue;
          const back = this.adjacentCastles(castle).find(c => this.ownerOf(c) === k.realm);
          if (back) this.moveKnight(k, back);
        }
      } else {
        for (const g of group) { const G1 = s.knights[g.knight]; if (G1) this.moveKnight(G1, g.from); }
        this.report1(H.get('knight', K.id).name + ' was turned back from ' + H.get('castle', castle).name + '.', 'lost');
      }
      this.checkEnd();
    }

    // the end of a season: quests return, the wounded recover, the castles give mana, the candle burns down
    endSeason() {
      const s = this.s;
      for (const k of Object.values(s.knights)) {
        if (k.state === 'quest') {
          k.questFor--;
          if (k.questFor <= 0) { k.state = 'ready'; this.moveKnight(k, k.questFrom); this.questReward(k); this.fire('quest-return', true); }
        } else if (k.state === 'wounded') {
          k.woundedFor--;
          if (k.woundedFor <= 0) { k.state = 'ready'; k.hp = Math.max(k.hp, Math.ceil(H.get('knight', k.id).hp * .5)); }
        }
      }
      for (const c of Object.keys(s.castles)) {
        const owner = s.castles[c].owner;
        if (owner === 'free') continue;
        // the plan's yields (§4.5): a capital 40, Meridian 60, any other castle 25; a castle in its realm's season +25% (§4.2)
        const cd = H.get('castle', c);
        let gain = this.isStill(c) ? 0 : (cd.capital ? 40 : cd.goal ? 60 : 25) * H.tune.manaYield * (this.isHuman(owner) ? H.tune.humanYield : 1);
        if (H.get('realm', owner).season === this.season) gain *= 1.25;
        if (s.realms[owner].rulerWounded) gain *= .5;
        s.realms[owner].mana += Math.round(gain);
      }
      for (const r of Object.values(s.realms)) r.rulerWounded = false;
      // upkeep (§4.5): every monster a realm keeps costs mana each season; a realm short of mana loses its weakest monsters
      for (const r of H.all('realm')) {
        if (r.id === 'free') continue;
        const mine = Object.values(s.monsters).filter(m => this.ownerOf(m.castle) === r.id);
        const upkeep = (m) => Math.max(1, Math.round(H.get('species', m.species).forms[m.form].cost * 6 * H.tune.upkeep));
        s.realms[r.id].mana -= mine.reduce((n, m) => n + upkeep(m), 0);
        const deserters = mine.slice().sort((a, b) => upkeep(a) - upkeep(b) || (a.uid < b.uid ? -1 : 1));
        while (s.realms[r.id].mana < 0 && deserters.length) {
          const m = deserters.shift();
          s.realms[r.id].mana += upkeep(m);
          delete s.monsters[m.uid];
          if (this.isHuman(r.id)) this.report1(H.get('species', m.species).name + ' deserted for want of mana.', 'lost');
        }
        s.realms[r.id].mana = Math.max(0, s.realms[r.id].mana);
      }
      s.candle--;
      s.seasonsPlayed++;
      s.season = (s.season + 1) % 4;
      if (s.season === 0) s.year++;
      s.marches = []; s.marchAt = 0; s.pending = null;
      s.phase = 'aftermath';
      this.checkEnd();
      if (!s.ended && s.candle <= 0) this.end(null, 'candle');
      if (!s.ended) this.beginMuster();
    }
    questReward(k) {
      const name = cap(H.get('knight', k.id).name);
      const roll = this.rand(1, 100);
      if (roll <= 30) {
        const items = H.all('item');
        const item = items[this.rand(0, items.length - 1)].id;
        this.s.stock.push(item);
        this.report1(name + ' came home with a ' + H.get('item', item).name + '.', 'reward');
      } else if (roll <= 55) {
        this.s.realms[this.ownerOf(k.castle)].mana += 6;
        this.report1(name + ' brought back 6 mana from the roads.', 'reward');
      } else if (roll <= 75) {
        const sp = WILD[this.rand(0, WILD.length - 1)], id = 'm' + this.s.nextUid++, f = H.speciesForm(sp, 0);
        this.s.monsters[id] = { uid: id, species: sp, form: 0, hp: f.hp, maxHp: f.hp, castle: k.castle, bondTo: null };
        this.report1(name + ' brought back a wild ' + H.get('species', sp).name + '.', 'reward');
      } else if (roll <= 90) {
        k.xp += 12; this.levelUp(k);
        this.report1(name + ' trained with the wardens of the road.', 'reward');
      } else {
        k.state = 'wounded'; k.woundedFor = 1; k.hp = Math.max(1, k.hp - 4);
        this.report1(name + ' was ambushed on the road and is hurt.', 'lost');
      }
    }

    // ---- the ends ----
    endRuler(realm) { this.end(null, 'ruler', realm); }
    checkEnd() {
      if (this.s.ended) return;
      const meridian = this.ownerOf('meridian');
      if (meridian !== 'dominion' && meridian !== 'free') this.end(meridian, 'meridian');
    }
    end(winner, reason, realm = null) {
      const s = this.s;
      s.ended = { winner, reason, realm, season: s.seasonsPlayed, year: s.year };
      s.phase = 'over';
      s.pending = null;
      const text = reason === 'meridian' ? H.get('realm', winner).name + ' holds Meridian.'
        : reason === 'candle' ? 'The Hour-Candle has burned out.' : 'Your ruler has fallen.';
      this.report1(text, 'end');
    }
    // the human's result, for the endings: 'won' when they hold Meridian, 'candle', or 'ruler'
    outcome() {
      const e = this.s.ended;
      if (!e) return null;
      if (e.reason === 'meridian') return this.isHuman(e.winner) ? 'won-' + e.winner : 'lost-meridian';
      return e.reason === 'candle' ? 'candle' : 'ruler';
    }
  }

  const hashOf = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  H.CampaignSim = CampaignSim;
  H.STOCK_START = STOCK_START;
})();

// ---- src/23-ai-campaign.js ----
// The campaign AI: the muster of a CPU realm (the rival realms and the Hourless Dominion). It uses the same actions a human
// does (CampaignSim.do), so a rival is never allowed what a player is not. Its choices come from the campaign's seeded
// random numbers. Rival aggression (dev mode) scales how readily it marches: 0 never marches, 2 marches on near-even odds.
(() => {
  const H = G;

  // what a castle is worth in a fight: the knights who could hold it and the monsters that stand with them
  const strength = (sim, castle) => {
    let n = 0;
    for (const k of sim.knightsAt(castle)) if (k.state === 'ready') n += k.level * 6 + k.hp;
    for (const m of sim.monstersAt(castle)) n += m.hp;
    return n;
  };
  const ownStrength = (sim, K) => K.level * 6 + K.hp + sim.bondedTo(K.id).reduce((n, m) => n + m.hp, 0);

  const muster = (sim, realm) => {
    const s = sim.s, R = s.realms[realm];
    const mine = Object.keys(s.castles).filter(c => s.castles[c].owner === realm).sort();
    if (!mine.length) return;

    // 1. summon one monster at each castle, if the mana is there: the realm's own element first
    const speciesFor = () => {
      const pool = H.ids('species').filter(id => {
        const sp = H.get('species', id);
        return sp.element === (H.get('realm', realm).element) || (realm === 'dominion' && sp.element === 'hour');
      });
      return pool.length ? pool : H.ids('species');
    };
    const pool = speciesFor();
    for (const c of mine) {
      const sp = pool[sim.rand(0, pool.length - 1)];
      if (sim.do({ t: 'summon', castle: c, species: sp }, realm) === null) continue;
    }

    // 2. bind free monsters to ready knights standing at their castles
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.state !== 'ready' || !mine.includes(k.castle)) continue;
      for (const m of sim.unboundAt(k.castle)) sim.do({ t: 'bind', monster: m.uid, knight: k.id }, realm);
    }

    // 3. evolve a bound monster when its knight is seasoned and the mana is there
    for (const m of Object.values(s.monsters)) {
      if (m.form !== 0 || !m.bondTo) continue;
      const k = s.knights[m.bondTo];
      if (k && k.realm === realm && k.level >= 3 && R.mana >= sim.evolveCost(m.species)) sim.do({ t: 'evolve', monster: m.uid }, realm);
    }

    // 4. equip the treasury's first item on any knight without one
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.items.length || k.state !== 'ready' || !s.stock.length) continue;
      sim.do({ t: 'equip', knight: k.id, castle: k.castle, item: s.stock[0] }, realm);
    }

    // 5. reinforce: a ready knight with no march moves to a neighbouring own castle that has no knight and touches an enemy
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.state !== 'ready' || s.marches.some(m => m.knight === k.id)) continue;
      if (k.id === H.get('realm', realm).ruler) continue;
      if (k.castle === 'meridian') continue;   // the Calendar City keeps its wardens
      const here = k.castle;
      if (sim.knightsAt(here).length > 1) continue;
      const target = sim.adjacentCastles(here).find(c => s.castles[c].owner === realm && !sim.knightsAt(c).length && sim.adjacentCastles(c).some(d => s.castles[d].owner !== realm));
      if (target) sim.do({ t: 'move', knight: k.id, castle: here, to: target }, realm);
    }

    // 6. marches: a ready knight attacks a neighbouring enemy castle it outmatches (scaled by rival aggression)
    const aggression = H.tune.rivalAggression;
    if (aggression <= 0) return;
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.state !== 'ready' || s.marches.some(m => m.knight === k.id) || !mine.includes(k.castle)) continue;
      if (k.castle === 'meridian') continue;   // the wardens of the Calendar City do not march
      let best = null;
      // a ruler marches only with overwhelming odds: a fallen ruler ends its realm's game
      const ruler = k.id === H.get('realm', realm).ruler;
      for (const c of sim.adjacentCastles(k.castle)) {
        if (s.castles[c].owner === realm) continue;
        const enemy = strength(sim, c), own = ownStrength(sim, k) * aggression;
        if (own < enemy * (ruler ? 2.2 : .9)) continue;
        if (!best || enemy < best.enemy) best = { c, enemy };
      }
      if (best) sim.do({ t: 'march', knight: k.id, castle: k.castle, to: best.c }, realm);
    }
  };

  H.aiCampaign = { muster, strength };
  H.AUTOPLAY_RULER_ODDS = 99;   // the odds a ruler needs to march; 99 keeps the autoplay ruler at home
  H.AUTOPLAY_ODDS = 1.2;   // the autoplay player marches with a knight that is this many times the castle's strength

  // the autoplay player's muster (plan §14.5): the same building as a CPU realm, plus promotions. Its march is one plan:
  // a single goal a season (Meridian once one of our castles stands beside it, else the weakest enemy castle beside us),
  // a staging castle beside the goal that the knights gather into, and an army that marches only when its strength is
  // enough. Its ruler stays home.
  H.autoplayMuster = (sim, realm) => {
    const s = sim.s;
    const aggression = H.tune.rivalAggression;
    H.tune.rivalAggression = 0;
    try { muster(sim, realm); } finally { H.tune.rivalAggression = aggression; }
    const ruler = H.get('realm', realm).ruler;
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.state !== 'ready') continue;
      const cls = H.get('class', k.cls || H.get('knight', k.id).cls);
      if (cls.next && k.level >= H.PROMOTE_LEVEL[H.get('class', cls.next).tier]) sim.do({ t: 'promote', knight: k.id }, realm);
    }
    const mine = (c) => s.castles[c].owner === realm;
    const enemyBeside = Object.keys(s.castles).filter(c => !mine(c) && sim.adjacentCastles(c).some(mine)).sort();
    if (!enemyBeside.length) return;
    const soldiers = () => Object.values(s.knights).filter(k => k.realm === realm && k.state === 'ready' && k.id !== ruler && !s.marches.some(m => m.knight === k.id));
    // the army that can reach a goal: the soldiers at its staging castle and at the castles beside it
    const stageOf = (goal) => sim.adjacentCastles(goal).filter(mine).sort((a, b) => strength(sim, b) - strength(sim, a) || (a < b ? -1 : 1))[0];
    const armyFor = (goal, stage) => soldiers().filter(k => k.castle === stage || sim.adjacentCastles(k.castle).includes(goal));
    const power = (army) => army.reduce((n, k) => n + ownStrength(sim, k), 0);
    // the goal: Meridian when the army can take it; otherwise the weakest enemy castle beside us (so the army fights and grows)
    const weakest = enemyBeside.filter(c => c !== 'meridian').sort((a, b) => strength(sim, a) - strength(sim, b) || (a < b ? -1 : 1))[0];
    let goal = null;
    if (enemyBeside.includes('meridian') && stageOf('meridian') && power(armyFor('meridian', stageOf('meridian'))) >= strength(sim, 'meridian') * H.AUTOPLAY_ODDS) goal = 'meridian';
    else if (weakest) goal = weakest;
    else goal = 'meridian';
    const stage = stageOf(goal);
    if (!stage) return;
    // gather: every ready soldier beside the staging castle moves into it
    for (const k of soldiers().sort((a, b) => a.id < b.id ? -1 : 1)) {
      if (k.castle === stage || !sim.adjacentCastles(k.castle).includes(stage)) continue;
      // a castle that holds the ruler keeps one soldier beside it: the ruler must never be left to defend alone
      const here = sim.knightsAt(k.castle);
      if (here.some(x => x.id === ruler) && here.filter(x => x.id !== ruler).length <= 1) continue;
      sim.do({ t: 'move', knight: k.id, castle: k.castle, to: stage }, realm);
    }
    // the army marches when its strength is enough for the goal
    const army = armyFor(goal, stage);
    if (army.length && power(army) >= strength(sim, goal) * H.AUTOPLAY_ODDS) {
      for (const k of army) if (sim.adjacentCastles(k.castle).includes(goal) || k.castle === goal) sim.do({ t: 'march', knight: k.id, castle: k.castle, to: goal }, realm);
    }
  };
})();

// ---- src/30-art.js ----
// Art: the rigs of knights and monsters, the battle board, the continent, castles and banners, and the button glyphs.
// Everything is drawn in code (the engine's Humanoid and Blob rigs, and px primitives). No image files.
(() => {
  const H = G, px = E.px;
  H.HEX = 16;                    // a hex's radius in world units
  H.BOARD_TILT = 52;             // the battle view's pitch in degrees
  H.TERRAIN_COLOR = {
    plain: '#7fb868', forest: '#3e7442', hill: '#a08f5e', swamp: '#4f6e56', ruin: '#8a7f78', keep: '#d6b462',
    bridge: '#a77a4a', river: '#2f5f9a', ice: '#c4e8ff', wall: '#6d6876', ash: '#5c5652', dial: '#c9a050', gate: '#4a4456'
  };
  H.TERRAIN_EDGE = { river: '#2a5a94', ice: '#8ac4e8', wall: '#3a3642', keep: '#8a6a2a' };

  // ---- rigs: a knight is a Humanoid dressed by its class and its own look; a monster is a Blob or a bulky/skeleton Humanoid ----
  H.rigFor = unit => {
    if (unit.kind === 'knight') {
      const k = H.get('knight', unit.ref), cls = H.get('class', unit.cls || k.cls);
      const o = Object.assign({ size: 1.15, build: cls.build, weapon: cls.weapon }, k.look);
      if (o.hair == null) o.hair = 'bald';
      for (const key of Object.keys(o)) if (o[key] === null) delete o[key];
      return { rig: new E.Humanoid(o), kind: 'humanoid', moves: cls.moves };
    }
    const sp = H.get('species', unit.species || unit.ref), look = sp.look;
    if (look.kind === 'beast') return { rig: new H.Beast({ body: look.body, colors: look.colors, size: 1 + (unit.form || 0) * .12 }), kind: 'beast', moves: ['slash'] };
    if (look.kind === 'blob') {
      const o = Object.assign({}, look, { R: look.R + (unit.form || 0) * 1.5, colors: look.colors });
      delete o.kind;
      return { rig: new E.Blob(o), kind: 'blob', moves: ['slash'] };
    }
    const o = { size: look.size + (unit.form || 0) * .2, build: look.build, weapon: look.build === 'bulky' ? 'sword' : null, colors: look.colors, outfit: 'shirt' };
    if (look.build === 'skeleton') { o.weapon = 'sword'; o.hair = 'bald'; }
    return { rig: new E.Humanoid(o), kind: 'humanoid', moves: look.build === 'bulky' ? ['haymaker', 'sweep', 'overhead'] : ['slash', 'thrust', 'backslash'] };
  };
  // the sound a skill makes, by its element (a spell of the season's element has that season's voice)
  H.skillSound = id => {
    const sk = H.get('skill', id);
    if (sk.kind === 'passive') return 'chirp';
    if (sk.kind === 'special' && sk.elem !== 'neutral' && sk.elem !== 'user') return { verdant: 'spell_spring', solar: 'spell_summer', ambered: 'spell_autumn', rime: 'spell_winter', hour: 'spell_hour' }[sk.elem] || 'cast_charge';
    if (sk.elem === 'neutral' || sk.elem === 'user') return sk.kind === 'self' ? 'buff' : 'cast_charge';
    return { verdant: 'spell_spring', solar: 'spell_summer', ambered: 'spell_autumn', rime: 'spell_winter', hour: 'spell_hour' }[sk.elem] || 'cast_charge';
  };
  H.statusSound = s => ({ poison: 'poison', burn: 'burn', chill: 'chill', sleep: 'sleep', stop: 'stop', weakened: 'debuff', valor: 'buff', haste: 'buff', warded: 'buff', frostarmor: 'buff', windup: 'buff' })[s] || 'buff';
  // the attack a unit plays for its strike (the engine's move set, the class's own moves)
  H.strikeMove = (unit, n = 0) => {
    const r = H.rigFor(unit);
    return r.moves[n % r.moves.length];
  };

  // ---- the battle board: a tilted view with the hexes laid flat on the ground ----
  H.hexWorldOf = (q, r) => H.hexWorld(q, r, H.HEX);
  H.DIAL_COLOR = ['#8ad870', '#ff8a4a', '#e8b050', '#7ac8ff'];
  H.drawBoard = (r, sim, o) => {
    const S = H.HEX, tiles = sim.s.tiles, reach = o.reach || new Map(), strikeable = o.strike || new Map();
    r.decal(g => {
      for (const k of Object.keys(tiles)) {
        const { q, r: rr } = H.parseKey(k), w = H.hexWorld(q, rr, S);
        const id = tiles[k];
        const pts = H.hexCorners(w.x, w.y, S).map(([x, y]) => r.w(x, y, 0));
        px.poly(g, pts, H.TERRAIN_COLOR[id] || '#7fb868');
        const edge = H.TERRAIN_EDGE[id] || '#2e4a28';
        for (let i = 0; i < 6; i++) { const a = pts[i], b = pts[(i + 1) % 6]; px.line(g, a[0], a[1], b[0], b[1], edge, 1); }
        if (reach.has(k)) px.poly(g, pts, '#e6e87a');
        if (strikeable.has(k)) px.poly(g, pts, '#ff5a4a');
        if (o.plan && o.plan.has(k)) px.poly(g, pts, '#f8f2a0');
      }
      if (o.cursor) {
        const w = H.hexWorld(o.cursor.q, o.cursor.r, S);
        const pts = H.hexCorners(w.x, w.y, S).map(([x, y]) => r.w(x, y, 0));
        for (let i = 0; i < 6; i++) { const a = pts[i], b = pts[(i + 1) % 6]; px.line(g, a[0], a[1], b[0], b[1], '#ffffff', 2); }
      }
    });
    // props on the hexes: forests, hills, ruins, the keep, walls raised as blocks
    for (const k of Object.keys(tiles)) {
      const { q, r: rr } = H.parseKey(k), w = H.hexWorld(q, rr, S), id = tiles[k];
      if (id === 'forest') r.prop('pine', w.x, w.y, 0, { size: .9 });
      if (id === 'hill') r.prop('rock', w.x, w.y, 0, { size: .8 });
      if (id === 'ruin') r.prop('pillar', w.x, w.y, 0, { size: .8, broken: true });
      if (id === 'swamp') r.prop('mushroom', w.x, w.y, 0, { size: .6 });
      if (id === 'keep') r.prop('banner', w.x, w.y, 0, { size: 1 });
      if (id === 'gate') r.prop('pillar', w.x, w.y, 0, { size: 1.4 });
    }
  };
  // the Clockwork Sanctum's dials: each one shows the season it is set to (its colour and its number)
  H.drawDials = (r, sim) => {
    for (const k of Object.keys(sim.s.dials || {})) {
      const { q, r: rr } = H.parseKey(k), w = H.hexWorld(q, rr, H.HEX), v = sim.s.dials[k];
      r.overlay(g => {
        const p = r.w(w.x, w.y, 6);
        px.disc(g, Math.round(p[0]), Math.round(p[1]), 6, '#1a1624');
        px.disc(g, Math.round(p[0]), Math.round(p[1]), 5, H.DIAL_COLOR[v]);
        E.font.text(g, String(v === sim.s.dialTarget ? 'OK' : v), Math.round(p[0]), Math.round(p[1]) - 3, '#101010', { align: 'center' });
      });
    }
  };
  // a hex's centre on the board, for a unit or the cursor
  H.boardCentre = sim => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const k of Object.keys(sim.s.tiles)) {
      const { q, r } = H.parseKey(k), w = H.hexWorld(q, r, H.HEX);
      x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x); y0 = Math.min(y0, w.y); y1 = Math.max(y1, w.y);
    }
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0 + H.HEX * 2, h: y1 - y0 + H.HEX * 2 };
  };

  // ---- the continent: the campaign map's world (1000 x 1000) mapped to a panel of the screen ----
  H.mapTransform = (panel) => {
    const s = Math.min(panel.w / 1000, panel.h / 1000);
    return { s, X: x => panel.x + x * s, Y: y => panel.y + y * s };
  };
  H.REALM_FILL = { verdance: '#4ea85a', solmark: '#c8502a', amberlyn: '#b07a2a', hoarfast: '#4a7ab8', dominion: '#4a3c66', free: '#7a6a52' };
  H.drawCastle = (g, x, y, realm, o = {}) => {
    const c = H.REALM_FILL[realm] || '#888';
    const s = o.scale || 1;
    px.rect(g, x - 5 * s, y - 2 * s, 10 * s, 8 * s, '#2a2230');
    px.rect(g, x - 4 * s, y - 1 * s, 8 * s, 6 * s, '#e8dcc0');
    for (let i = -4; i <= 2; i += 3) px.rect(g, x + i * s, y - 4 * s, 2 * s, 2 * s, '#e8dcc0');
    px.rect(g, x - 1 * s, y + 1 * s, 2 * s, 3 * s, '#2a2230');
    px.rect(g, x - 5 * s, y - 6 * s, 2 * s, 4 * s, c);
    if (o.capital) px.poly(g, [[x - 3 * s, y - 6 * s], [x + 3 * s, y - 6 * s], [x, y - 9 * s]], c);
  };

  // ---- button glyphs: a PlayStation shape or Xbox letter for a pad, a keycap for the keyboard, a mouse for the mouse ----
  const PS = { '✕': '#6f9cff', '○': '#ff6a6a', '□': '#e27aff', '△': '#7ad8a0', 'Cross': '#6f9cff' };
  const XB = { A: '#7ad058', B: '#ff6a4a', X: '#6aa6ff', Y: '#ffd24a' };
  // a PlayStation symbol drawn in pixels (the font has no such glyphs); other labels are letters
  const psShape = (g, label, cx, cy, col) => {
    if (label === '✕') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, '#101010', 1); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, '#101010', 1); }
    else if (label === '○') { px.disc(g, cx, cy, 2, '#101010'); px.disc(g, cx, cy, 1, col); }
    else if (label === '□') px.rect(g, cx - 2, cy - 2, 4, 4, '#101010');
    else if (label === '△') px.poly(g, [[cx, cy - 2], [cx + 2, cy + 2], [cx - 2, cy + 2]], '#101010');
    else E.font.text(g, label.slice(0, 1), cx, cy - 3, '#101010', { align: 'center' });
  };
  H.glyph = (g, label, x, y, device = 'keyboard') => {
    const pad = device === 'gamepad';
    if (pad) {
      const col = PS[label] || XB[label] || '#d8d4e4';
      px.disc(g, x + 4, y + 4, 4, '#1a1624');
      px.disc(g, x + 4, y + 4, 3, col);
      psShape(g, label, x + 4, y + 4, col);
      return 10;
    }
    if (device === 'mouse') {
      px.rect(g, x + 1, y, 6, 9, '#d8d4e4'); px.rect(g, x + 4, y, 1, 4, '#4a4458');
      return 9;
    }
    const w = Math.max(9, E.font.width(label) + 4);
    px.rect(g, x, y, w, 9, '#2a2634'); px.rect(g, x, y + 7, w, 2, '#15131c');
    E.font.text(g, label, x + w / 2, y + 1, '#f0ecff', { align: 'center' });
    return w;
  };
  // the on-screen symbols for the player's device: the glyph and the action name, in a row
  const ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
  H.promptRow = (r, game, items, x, y) => {
    const device = game.input.lastDevice || 'keyboard';
    let cx = x;
    r.overlay(g => {
      for (const [action, text] of items) {
        const label = device !== 'gamepad' && ARROW[action] ? ARROW[action] : game.input.label(action, device);
        const w = H.glyph(g, label, cx, y, device);
        E.font.text(g, text, cx + w + 3, y + 1, '#e8e4f4', { shadow: '#000' });
        cx += w + 3 + E.font.width(text) + 10;
      }
    });
  };
})();

// ---- src/31-art-beasts.js ----
// Beast rigs: the monsters that are animals rather than blobs or skeletons. Four bodies: a quadruped (four legs, a tail,
// ears), a drake (a long neck, a head with horns, two wings, two legs), an avian (round body, feathered wings, a beak) and
// a serpent (a body of segments moving in a wave). They share the interface of the engine's rigs: update(dt, state) poses
// them from plain state (walk, flap, facing), draw(g, ox, oy, view) draws inside r.actor, and drawPortrait(g, x, y, size)
// draws one still. Everything is drawn with the engine's pixel primitives: no image files.
(() => {
  const H = G, px = E.px;

  class Beast {
    constructor(o = {}) {
      this.body = o.body || 'quadruped';
      this.c = Object.assign({ dk: '#3a2a1a', base: '#8a6a4a', lt: '#c8a880', eye: '#ffe060', pupil: '#100a04' }, o.colors || {});
      this.size = o.size || 1;
      this.t = 0; this.walk = 0; this.flap = 1; this.face = 1; this.squash = 0;
    }
    update(dt, st = {}) {
      this.t += dt;
      this.walk = st.walk || 0;
      this.flap = st.flap === undefined ? 1 : st.flap;
      if (st.facing !== undefined) this.face = Math.cos(st.facing) < 0 ? -1 : 1;
      this.squash = st.squash || 0;
    }
    // the body's parts in its own frame (x forward, y up), scaled by size; the feet are at y = 0
    draw(g, ox, oy) { this.paint(g, ox, oy, this.walk, this.t, this.flap); }
    drawPortrait(g, x, y, size) { this.paint(g, x, y, 0, this.t, 0.4, size / 24); }
    paint(g, ox, oy, walk, t, flap, scale = 1) {
      const s = this.size * scale * (1 + this.squash), f = this.face, c = this.c;
      const P = (x, y) => [Math.round(ox + f * x * s), Math.round(oy - y * s)];
      const wave = Math.sin(t * (walk ? 12 : 3));
      const body = (cx, cy, rx, ry, col) => { const [x, y] = P(cx, cy); px.ell(g, x, y, Math.max(1, Math.round(rx * s)), Math.max(1, Math.round(ry * s)), col); };
      const line = (a, b, col, w = 1) => { const [x0, y0] = P(a[0], a[1]), [x1, y1] = P(b[0], b[1]); px.line(g, x0, y0, x1, y1, col, w); };
      const disc = (x, y, r, col) => { const [px0, py0] = P(x, y); px.disc(g, px0, py0, Math.max(1, Math.round(r * s)), col); };
      if (this.body === 'quadruped') {
        // four legs swing in pairs as it walks; a tail sways; the head is forward and up
        const sw = walk ? wave * 3 : 0;
        for (const x of [-7, 6]) { line([x, 5], [x + sw, 0], c.dk, 2); line([x + 1, 5], [x - sw * .5 + 1, 0], c.dk, 2); }
        body(0, 8, 9, 5, c.base); body(0, 6, 9, 3, c.lt);
        disc(9, 13, 4.5, c.base);
        line([9, 13], [11, 17], c.base, 2);
        line([-9, 10], [-12, 13 + wave * 1.5], c.dk, 2);
        disc(12, 15, 0.9, c.eye);
      } else if (this.body === 'drake') {
        // two legs, two wings beating, a long neck to a horned head, a barbed tail
        const beat = Math.sin(t * 6) * 6 * (flap || 0);
        body(0, 9, 8, 5, c.base);
        line([-4, 10], [-6, 6 + beat * .3], c.dk, 3); line([4, 10], [6, 6 + beat * .2], c.dk, 3);
        line([0, 12], [-8, 22 + beat], c.dk, 2); line([0, 12], [8, 22 + beat * .6], c.lt, 2);
        line([-9, 9], [-16, 9 + wave], c.dk, 2);
        line([6, 12], [11, 20], c.base, 3); disc(13, 22, 4, c.base);
        line([15, 25], [18, 29], c.dk, 1); line([11, 25], [9, 29], c.dk, 1);
        disc(16, 23, 1, c.eye);
      } else if (this.body === 'avian') {
        // a round body on two thin legs, feathered wings that beat, a beak
        const beat = Math.sin(t * 8) * 5 * (flap || 0);
        body(0, 8, 6, 6, c.base); body(0, 7, 4, 3, c.lt);
        line([-2, 2], [-3, 0], c.dk, 1); line([2, 2], [3, 0], c.dk, 1);
        line([-3, 9], [-11, 13 + beat], c.dk, 3); line([-11, 13 + beat], [-14, 6 + beat], c.base, 2);
        line([3, 9], [9, 12 - beat * .4], c.dk, 3);
        disc(5, 13, 3.5, c.base); line([7, 13], [11, 12], c.eye, 1);
        disc(6, 14, 0.8, c.pupil);
      } else {
        // a serpent: segments on a wave, its head forward; the wave runs along the body while it moves
        const seg = 7;
        for (let i = 0; i < seg; i++) {
          const x = -i * 3.4, y = 3 + Math.sin(t * (walk ? 8 : 2) - i * .9) * 3;
          const r = 4.2 - i * .35;
          disc(x, y, Math.max(1.2, r), i % 2 ? c.base : c.lt);
        }
        disc(3, 4 + Math.sin(t * (walk ? 8 : 2)) * 1.5, 4.6, c.base);
        disc(5.4, 5.5, 1, c.eye);
        line([7, 4], [10, 2], c.dk, 1);
      }
    }
    // a point to breathe from, or to launch a missile at, in the rig's own frame (its mouth)
    mouth() { return { x: this.face * 12 * this.size, y: 14 * this.size }; }
    tip() { return { x: this.face * 16 * this.size, y: 16 * this.size }; }
  }
  H.Beast = Beast;
})();

// ---- src/40-audio.js ----
// Audio: every song, sound effect and voice is written in code. Songs use the engine's step-sequencer format; sound
// effects are custom voices defined with audio.define; the voices are Animalese babble, a pool of short syllable blips
// that each dialog letter draws from, pitched by the speaker's profile.
(() => {
  const H = G;

  // the songs: { bpm, steps, tracks: [{ wave, vol, notes }] }. Each token is a note (C4, F#3), - holds, . rests, k s h drums.
  H.SONGS = {
    title: { bpm: 96, steps: 4, tracks: [
      { wave: 'triangle', vol: .16, notes: 'D4 - F4 - A4 - G4 - E4 - D4 - C4 - D4 - F4 - A4 - C5 - A4 - G4 - E4 - D4 -' },
      { wave: 'square', vol: .05, notes: 'D3 . . . A3 . . . F3 . . . G3 . . . D3 . . . C3 . . . A2 . . .' }] },
    campaign: { bpm: 118, steps: 4, tracks: [
      { wave: 'square', vol: .1, notes: 'G4 . A4 B4 C5 . B4 A4 G4 . E4 G4 A4 . G4 . E4 . G4 . A4 B4 D5 . C5 B4 A4 . G4 A4 . E4 . D4 . G4 A4 B4 C5 . B4 A4 G4 . E4 G4 D5 . C5 . B4 . A4 . G4 . . .' },
      { wave: 'triangle', vol: .14, notes: 'G2 - D3 - C3 - G2 - A2 - E3 - D3 - G2 - G2 - D3 - C3 - G2 - A2 - E3 - D3 - G2 -' },
      { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s h h . k . h . s . h . k . h s s h k . h . s . h .' }] },
    battle: { bpm: 146, steps: 4, tracks: [
      { wave: 'saw', vol: .07, notes: 'E4 . E4 G4 A4 . E4 . D4 . E4 G4 B4 . A4 . G4 . E4 . E4 . E4 G4 A4 . C5 . B4 . A4 . G4 . B4 .' },
      { wave: 'triangle', vol: .18, notes: 'E2 E2 E2 E2 C2 C2 C2 C2 D2 D2 D2 D2 B1 B1 B1 B1' },
      { wave: 'drums', vol: .16, notes: 'k . s . k k s . k . s . k k s s' }] },
    victory: { bpm: 108, steps: 4, tracks: [
      { wave: 'square', vol: .12, notes: 'C4 E4 G4 C5 . . G4 C5 E5 . . G5 . . C5 . . . . ' },
      { wave: 'triangle', vol: .14, notes: 'C3 . G2 . C3 . G2 . F3 . C3 . G2 . C3 .' }] },
    defeat: { bpm: 84, steps: 4, tracks: [
      { wave: 'triangle', vol: .16, notes: 'G3 . F3 . E3 . D3 . C3 . - . - . - . - . -' }] }
  };
  H.SONG_OF = { title: 'title', attract: 'title', setup: 'title', help: 'title', about: 'title', dev: 'title', campaign: 'campaign', battle: 'battle', hub: 'battle', victory: 'victory', defeat: 'defeat' };

  // the sound effects that are not presets: each a voice (or a list) the game plays with audio.sfx(name)
  H.SFX = {
    bell: [{ wave: 'sine', freq: 'E5', dur: .5, vol: .22 }, { wave: 'sine', freq: 'A5', dur: .5, vol: .12 }],
    move: { wave: 'triangle', freq: 320, to: 270, dur: .05, vol: .12 },
    cursor: { wave: 'square', freq: 'A5', dur: .03, vol: .08 },
    skill: { wave: 'saw', freq: 300, to: 900, dur: .26, vol: .14 },
    burn: { wave: 'noise', freq: 900, to: 300, dur: .3, vol: .2 },
    capture: [{ wave: 'square', freq: 'C5', dur: .12, vol: .16 }, { wave: 'square', freq: 'E5', dur: .12, vol: .16 }, { wave: 'square', freq: 'G5', dur: .24, vol: .16 }],
    quest: { wave: 'triangle', freq: 'G4', to: 'C5', dur: .3, vol: .16 },
    level: { wave: 'square', freq: 'C5', to: 'C6', dur: .35, vol: .16, arp: [0, 4, 7, 12] }
  };

  // Animalese: the babble of a speaker. A pool of short blips around the speaker's pitch; each letter draws one
  H.babble = (pitch = 200, lilt = 1) => {
    const pool = [];
    for (let i = 0; i < 6; i++) {
      const f = pitch * (.82 + i * .07) * lilt;
      pool.push({ wave: i % 2 ? 'triangle' : 'square', freq: Math.round(f), to: Math.round(f * (i % 3 ? 1.18 : .86)), dur: .055, vol: .09 });
    }
    return pool;
  };
  H.babbleVoice = (talk, pool) => { talk.voice = pool[Math.floor(Math.random() * pool.length)]; };

  // the engine's audio: the song for a scene, and the custom effects defined once at start
  H.playSong = (game, scene) => {
    const key = H.SONG_OF[scene] || 'title';
    game.audio.music(H.SONGS[key]);
  };
  H.defineSounds = game => {
    for (const [name, v] of Object.entries(H.SFX)) game.audio.define(name, v);
  };
})();

// ---- src/41-audio-seasons.js ----
// The music of the plan's table (§9.1): one theme for each season of the campaign, the two battle themes (attacking and
// defending, with a tension layer from bell nine), the hourless theme for Dominion ground, the Sanctum's theme, the event
// and ending themes, and a short sting when the season turns. Each is the engine's { bpm, steps, tracks } format.
(() => {
  const H = G;
  Object.assign(H.SONGS, {
    spring: { bpm: 104, steps: 4, tracks: [
      { wave: 'pulse12', vol: .12, notes: 'F4 - A4 - C5 - A4 - G4 - E4 - F4 - - - D4 - - -' },
      { wave: 'triangle', vol: .14, notes: 'F2 - - - C3 - - - D3 - - - C3 - - -' },
      { wave: 'drums', vol: .06, notes: 'h . h . h . h . h . h . h . h .' }] },
    summer: { bpm: 116, steps: 4, tracks: [
      { wave: 'square', vol: .09, notes: 'A4 C#5 E5 - D5 - C#5 - A4 - - - E4 - - -' },
      { wave: 'triangle', vol: .14, notes: 'A2 - E2 - D2 - E2 - A2 - E2 - D2 - E2 -' },
      { wave: 'drums', vol: .12, notes: 'k . s . k . s .' }] },
    autumn: { bpm: 96, steps: 4, tracks: [
      { wave: 'triangle', vol: .13, notes: 'E4 - G4 - B4 - A4 - G4 - - - E4 - - -' },
      { wave: 'saw', vol: .04, notes: 'E3 - G3 - E3 - D3 - C3 - - -' },
      { wave: 'drums', vol: .08, notes: 'k . . k . . k . .' }] },
    winter: { bpm: 72, steps: 4, tracks: [
      { wave: 'sine', vol: .16, notes: 'B3 - - - D4 - - - F#4 - - - B3 - - -' },
      { wave: 'pulse', vol: .05, notes: 'B5 - - - - - - - D5 - - - - - - -' },
      { wave: 'drums', vol: .06, notes: 'k - - - - - - - k - - - - - - -' }] },
    battle_attack: { bpm: 140, steps: 4, tracks: [
      { wave: 'square', vol: .08, notes: 'D4 F4 A4 D5 C5 A4 F4 D4 E4 G4 Bb4 E5 D5 Bb4 G4 E4' },
      { wave: 'saw', vol: .06, notes: 'D2 - D2 - F2 - F2 - C2 - C2 - A1 - A1 -' },
      { wave: 'drums', vol: .14, notes: 'k . s . k . s .' },
      { wave: 'saw', vol: .05, name: 'tension', on: false, notes: 'D5 - F5 - A5 - D6 - A5 - F5 - D5 - - -' }] },
    battle_defend: { bpm: 128, steps: 4, tracks: [
      { wave: 'pulse', vol: .09, notes: 'G4 Bb4 D5 G5 F5 D5 Bb4 G4 A4 C5 Eb5 A5 G5 Eb5 C5 A4' },
      { wave: 'triangle', vol: .14, notes: 'G2 - G2 - Eb2 - Eb2 - F2 - F2 - D2 - D2 -' },
      { wave: 'drums', vol: .12, notes: 'k . t . k . t .' },
      { wave: 'triangle', vol: .05, name: 'tension', on: false, notes: 'G5 - Bb5 - D6 - Bb5 - G5 - Eb5 - D5 - - -' }] },
    hourless: { bpm: 100, steps: 4, tracks: [
      { wave: 'saw', vol: .06, notes: 'C5 B4 Bb4 A4 Ab4 G4 Gb4 F4 E4 Eb4 D4 C4 - - - -' },
      { wave: 'triangle', vol: .10, notes: 'C2 - - - - - C2 - - - - - Ab1 - - -' },
      { wave: 'drums', vol: .08, notes: 'c . c . c . c . c . c . c . c .' }] },
    boss: { bpm: 150, steps: 4, tracks: [
      { wave: 'square', vol: .08, notes: 'E4 F4 G4 A4 B4 - G4 F4 E4 - - - - - - -' },
      { wave: 'saw', vol: .07, notes: 'E2 E2 E2 E2 F2 F2 E2 E2' },
      { wave: 'drums', vol: .16, notes: 'k k s k k s k s' }] },
    event: { bpm: 84, steps: 4, tracks: [
      { wave: 'triangle', vol: .14, notes: 'G4 - E4 - D4 - - - C4 - D4 - - - - - -' },
      { wave: 'pulse', vol: .05, notes: 'C3 - - - G2 - - - C3 - - - G2 - - -' }] },
    ending: { bpm: 80, steps: 4, tracks: [
      { wave: 'square', vol: .09, notes: 'D4 - F#4 - A4 - G4 - F#4 - D4 - - -' },
      { wave: 'triangle', vol: .12, notes: 'D3 - A2 - D3 - G2 - D3 - A2 - D3 - - -' },
      { wave: 'saw', vol: .04, notes: 'D4 A4 D5 A4 G4 D4 F#4 D4' }] }
  });
  // the stings: a short phrase over the music when the season turns
  H.STING = {
    spring: { bpm: 120, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'F4 A4 C5 F5 - - - -' }] },
    summer: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .12, notes: 'A4 C#5 E5 A5 - - - -' }] },
    autumn: { bpm: 120, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'E4 G4 B4 E5 - - - -' }] },
    winter: { bpm: 120, steps: 4, tracks: [{ wave: 'sine', vol: .2, notes: 'B3 D4 F#4 B4 - - - -' }] }
  };
  H.SEASON_SONG = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };
})();

// ---- src/42-audio-sfx.js ----
// The named sound effects of the plan (§9.2), each a voice or a list of voices defined with audio.define, and the Animalese
// voice of §9.3: each typed character becomes a tone (a vowel, its pitch set by the speaker and the letter) or a tick of
// noise (a consonant). Capitals are louder; '!' is louder; punctuation falls silent. Gray Knight's voice doubles 7 semitones
// down. Monsters growl, chirp and roar instead of speaking. Everything goes through the engine's audio, so it follows
// volume and mute, and it is silent when there is no sound context.
(() => {
  const H = G;
  const T = (wave, freq, dur, vol, extra = {}) => Object.assign({ wave, freq, dur, vol }, extra);
  H.SFX_NAMED = {
    ui_move: T('square', 'A5', .03, .07), ui_confirm: T('square', 'E5', .08, .13, { to: 'A5' }), ui_cancel: T('triangle', 'A4', .09, .12, { to: 'E4' }),
    ui_error: T('square', 'C3', .18, .14, { vib: [30, .04] }), ui_open: T('triangle', 'E4', .14, .12, { to: 'A5' }),
    bell_toll: [T('sine', 'E4', .9, .22), T('sine', 'E5', .5, .08)],
    sword_clang: [T('noise', 2400, .05, .2), T('square', 'C6', .08, .08, { to: 'G5' })],
    slash_whoosh: T('noise', 900, .16, .16, { to: 300 }), bow_twang: T('saw', 520, .12, .14, { to: 180 }), arrow_hit: T('noise', 1600, .05, .15),
    cast_charge: T('sine', 300, .4, .1, { to: 900 }), spell_spring: [T('triangle', 'C6', .1, .1), T('triangle', 'E6', .1, .1), T('triangle', 'G6', .18, .1)],
    spell_summer: T('noise', 400, .45, .2, { to: 1200 }), spell_autumn: [T('triangle', 'C3', .5, .12), T('noise', 800, .4, .05)],
    spell_winter: [T('sine', 'A6', .3, .08, { vib: [12, .02] }), T('sine', 'E7', .25, .05)], spell_hour: [T('square', 'C5', .04, .1), T('square', 'C4', .04, .1)],
    heal: T('triangle', 'C5', .24, .13, { to: 'G6' }), buff: T('square', 'G5', .16, .09, { to: 'C6' }), debuff: T('saw', 'G4', .22, .1, { to: 'C3' }),
    poison: T('sine', 'G3', .3, .1, { vib: [6, .05] }), burn: T('noise', 1200, .25, .12, { to: 600 }), chill: T('sine', 'C7', .3, .07, { to: 'G6' }),
    sleep: T('triangle', 'E3', .6, .1, { to: 'C3' }), stop: [T('square', 'E4', .05, .1), T('square', 'C4', .12, .1)],
    crit: [T('noise', 3000, .03, .2), T('square', 'C7', .12, .1, { to: 'G6' })], miss: T('noise', 2000, .14, .05, { to: 800 }),
    ko_monster: T('triangle', 'A3', .4, .14, { to: 'A2' }), ko_knight: [T('saw', 'C3', .7, .16, { to: 'G2' }), T('square', 'G2', .7, .05)],
    capture: [T('square', 'C5', .07, .12), T('square', 'E5', .07, .12), T('square', 'G5', .16, .12)], summon_rise: T('sine', 220, .8, .14, { to: 880 }),
    roar_small: T('saw', 180, .35, .16, { to: 120 }), roar_large: [T('saw', 90, .9, .2, { to: 60 }), T('noise', 300, .9, .08)],
    growl: T('saw', 110, .3, .14, { vib: [14, .04] }), chirp: [T('sine', 'A6', .05, .08, { to: 'E7' }), T('sine', 'E6', .06, .08)],
    flap: T('noise', 1400, .12, .1, { to: 700 }),
    march_drums: [T('noise', 120, .08, .24), T('noise', 120, .08, .2)], banner_flip: T('triangle', 'E5', .2, .1, { to: 'A4' }),
    castle_taken: [T('square', 'C4', .2, .14), T('square', 'G4', .2, .14), T('square', 'C5', .4, .14)], candle_hiss: T('noise', 4000, .9, .06, { to: 2000 }),
    tide: T('sine', 'D3', 1.2, .1, { to: 'D2' }), timer_tick: T('square', 'G6', .02, .08)
  };
  // the voice: the profile of a speaker, and the sound of one character
  H.voice = {
    profileFor(knightId) {
      const k = H.get('knight', knightId), v = k.voice || {};
      const wave = k.cls === 'brigand' || k.cls === 'graynight' ? 'saw' : k.cls === 'archer' ? 'triangle' : k.cls === 'adept' || k.cls === 'hourmaiden' ? 'sine' : 'pulse';
      return { base: v.pitch || 200, range: Math.round(4 + (v.lilt || 1) * 3), wave, formant: 1, double: knightId === 'gray' ? -7 : 0 };
    },
    // the pitch of a letter within the speaker's range (the same letter always sounds the same)
    hash(ch) { let h = 0; for (const c of ch) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; },
    // one character's sound: a tone for a vowel, a tick of noise for a consonant, nothing for a space or a stop
    letter(profile, ch) {
      if (!ch || /\s/.test(ch) || /[.,;:!?…"'()\-]/.test(ch)) return null;
      const lower = ch.toLowerCase(), loud = ch !== lower ? 1.3 : 1;
      if (!/[a-z]/.test(lower)) return null;
      if ('aeiouy'.includes(lower)) {
        const formant = { a: 800, e: 1200, i: 2200, o: 600, u: 400, y: 1600 }[lower];
        const steps = (this.hash(lower) % profile.range) - profile.range / 2;
        const f = profile.base * Math.pow(2, steps / 12) * Math.pow(formant / 800, .3) * profile.formant;
        const voice = { wave: profile.wave, freq: Math.round(f), to: Math.round(f * 1.02), dur: .055, vol: .12 * loud, attack: .005 };
        return profile.double ? [voice, Object.assign({}, voice, { freq: Math.round(f * Math.pow(2, profile.double / 12)), vol: voice.vol * .7 })] : voice;
      }
      return { wave: 'noise', freq: 2200 + (this.hash(lower) % 800), dur: .022, vol: .05 * loud };
    },
    // the schedule of a line: the sound each character makes, in order (the tests use it; the dialog plays the same)
    plan(profile, text) { return [...text].map(ch => this.letter(profile, ch)); }
  };
  H.defineNamedSounds = game => {
    for (const [name, v] of Object.entries(H.SFX_NAMED)) game.audio.define(name, v);
  };
})();

// ---- src/50-ui.js ----
// The 10-foot UI kit: a focusable list that takes the stick, the arrows and the mouse (hover moves the focus, a click picks),
// the windows and text the screens share, and the touch-only check. Layouts are in screen pixels anchored to r.W and r.H.
(() => {
  const H = G, px = E.px;

  // a list of choices. items: [{ label, sub, disabled, value }]. onPick(index, item), onCancel(), onMove(index).
  class List {
    constructor(items, o = {}) {
      this.items = items; this.i = o.index || 0; this.x = o.x || 0; this.y = o.y || 0; this.w = o.w || 180;
      this.rowH = o.rowH || 12; this.maxRows = o.maxRows || 8; this.title = o.title || null;
      this.onPick = o.onPick || null; this.onCancel = o.onCancel || null; this.onMove = o.onMove || null;
      this.rects = []; this.top = 0; this.color = o.color || '#f2eefc';
    }
    set(items, i = 0) { this.items = items; this.i = Math.max(0, Math.min(i, items.length - 1)); }
    get item() { return this.items[this.i]; }
    move(d) {
      const n = this.items.length; if (!n) return;
      let i = this.i;
      for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!this.items[i].disabled) break; }
      if (i !== this.i) { this.i = i; if (this.onMove) this.onMove(i); }
    }
    // call once per update. Returns the picked index, or -1.
    update(game) {
      const I = game.input, n = this.items.length;
      if (I.repeat('up', .35, .13)) this.move(-1);
      if (I.repeat('down', .35, .13)) this.move(1);
      const p = I.pointer && I.pointer();
      if (p) {
        const hit = this.rects.findIndex(r => p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]);
        if (hit >= 0 && this.items[this.top + hit] && !this.items[this.top + hit].disabled && this.top + hit !== this.i) { this.i = this.top + hit; if (this.onMove) this.onMove(this.i); }
      }
      const c = I.clicked && I.clicked();
      if (c && n) {
        const hit = this.rects.findIndex(r => c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]);
        if (hit >= 0) { const k = this.top + hit; if (!this.items[k].disabled) { this.i = k; return this.pick(); } }
      }
      if (n && I.pressed('confirm')) { const it = this.items[this.i]; if (it && !it.disabled) return this.pick(); }
      if (I.pressed('cancel') && this.onCancel) this.onCancel();
      return -1;
    }
    pick() { if (this.onPick) this.onPick(this.i, this.items[this.i]); return this.i; }
    // draws the list; the window scrolls to keep the cursor in view
    draw(r, o = {}) {
      const rows = Math.min(this.maxRows, this.items.length), top = Math.max(0, Math.min(this.i - Math.floor(rows / 2), this.items.length - rows));
      this.top = top; this.rects = [];
      const h = (this.title ? 16 : 4) + rows * this.rowH + 4;
      r.overlay(g => {
        if (o.box !== false) E.ui.box(g, this.x - 6, this.y - 6, this.w + 12, h + 4, { bg: ['#1c1830', '#0e0b18'], border: '#8a7ab0', alpha: .94 });
        let y = this.y;
        if (this.title) { E.font.text(g, this.title, this.x, y, '#ffe9a8', { shadow: '#000' }); y += 14; }
        for (let k = 0; k < rows; k++) {
          const idx = top + k, it = this.items[idx], sel = idx === this.i, ry = y + k * this.rowH;
          this.rects.push([this.x - 2, ry - 1, this.w + 4, this.rowH]);
          if (sel) { px.rect(g, this.x - 2, ry - 1, this.w + 4, this.rowH, '#4a3e78'); px.rect(g, this.x - 2, ry - 1, 2, this.rowH, '#ffd36a'); }
          const col = it.disabled ? '#7a7490' : sel ? '#fff4c8' : this.color;
          E.font.text(g, (sel ? '▸ ' : '  ') + it.label, this.x + 2, ry + 1, col, { shadow: '#000' });
          if (it.sub) E.font.text(g, String(it.sub), this.x + this.w - 2, ry + 1, it.disabled ? '#6a6480' : '#cfc6ec', { align: 'right', shadow: '#000' });
        }
        if (this.items.length > rows) E.font.text(g, (top + 1) + ' of ' + this.items.length, this.x + this.w, y + rows * this.rowH + 1, '#8a84a0', { align: 'right' });
      });
      return { x: this.x - 6, y: this.y - 6, w: this.w + 12, h: h + 4 };
    }
  }
  H.List = List;

  // a box with a title and wrapped text under it (a card, a tidings panel, a unit's details)
  H.panel = (r, x, y, w, h, o = {}) => r.overlay(g => E.ui.box(g, x, y, w, h, { bg: o.bg || ['#1c1830', '#0e0b18'], border: o.border || '#8a7ab0', alpha: o.alpha || .92 }));
  // word-wrapped text lines, for a width in screen pixels
  H.wrap = (text, w) => E.font.wrap(text, w);
  H.say = (r, text, x, y, w, color = '#f0ecff', o = {}) => {
    const lines = E.font.wrap(text, w);
    r.overlay(g => lines.forEach((t, i) => E.font.text(g, t, x, y + i * 9, color, Object.assign({ shadow: '#000' }, o))));
    return lines.length;
  };
  H.bar = (r, x, y, w, frac, color, label) => r.overlay(g => {
    E.ui.bar(g, x, y, w, 4, H.clamp(frac, 0, 1), color);
    if (label) E.font.text(g, label, x, y - 9, '#f4f0ff', { shadow: '#000' });
  });

  // a sound for a menu move or pick, by the engine's presets
  const SFX_ALIAS = { cursor: 'ui_move', confirm: 'ui_confirm', cancel: 'ui_cancel', hit: 'sword_clang', skill: 'cast_charge', bell: 'bell_toll', move: 'step', quest: 'banner_flip', level: 'heal' };
  H.sfx = (game, name) => game.audio.sfx(SFX_ALIAS[name] || name);

  // touch-only: a phone or tablet with no mouse, keyboard or controller. Those get the notice instead of the game.
  H.touchOnly = (game) => {
    if (typeof navigator === 'undefined' || typeof matchMedia === 'undefined') return false;
    if (!((navigator.maxTouchPoints || 0) > 0)) return false;
    if (matchMedia('(any-pointer: fine)').matches || matchMedia('(any-hover: hover)').matches) return false;
    const pads = typeof navigator.getGamepads === 'function' ? Array.from(navigator.getGamepads() || []).filter(Boolean) : [];
    return pads.length === 0;
  };

  // the realm's name and colour, for a banner
  H.realmColor = realm => (H.get('realm', realm).color || '#888');
  H.seasonColor = season => (season ? H.get('season', season).color : '#c8c0d8');
})();

// ---- src/60-board.js ----
// The board: one battle as the player sees it. It owns the tilted view, the rigs of every unit, the walks and strikes, the
// damage and bell banners, and a queue that plays the sim's events in order (the state is already final when an event is
// played; the queue only decides what is shown when). The battle, attract and hub scenes all draw through it.
(() => {
  const H = G, px = E.px;

  H.Board = class Board {
    constructor(game, sim, o = {}) {
      this.game = game; this.sim = sim; this.o = o;
      this.view = new E.View('board', 'Board', 0, H.BOARD_TILT, 1, 1);
      this.rigs = new Map(); this.vis = new Map(); this.anim = new Map();
      this.queue = []; this.busy = 0; this.t = 0; this.timers = []; this.walk = null;
      this.banner = null; this.active = null; this.over = null; this.lastBell = 0;
      this.centre = H.boardCentre(sim);
      for (const u of sim.s.units) {
        const w = H.hexWorld(u.q, u.r, H.HEX);
        this.vis.set(u.uid, { x: w.x, y: w.y, facing: u.side === 0 ? 0 : Math.PI });
      }
      this.layout();
    }
    // the board's scale: as large as the screen allows, with room for the panels at the top and bottom
    layout() {
      const W = this.game.W || 427, Hh = this.game.H || 240;
      const s = Math.min(W * .9 / this.centre.w, Hh * .8 / (this.centre.h * Math.sin(H.BOARD_TILT * Math.PI / 180)));
      this.view.set(0, H.BOARD_TILT, Math.max(.4, s));
      return this.view.scale || s;
    }
    enter() { this.game.setView(this.view); this.game.focus(this.centre.x, this.centre.y, 0); }

    unit(uid) { return this.sim.byId(uid); }
    rigOf(uid) {
      if (!this.rigs.has(uid)) this.rigs.set(uid, H.rigFor(this.unit(uid)));
      return this.rigs.get(uid);
    }
    // where a unit stands on the board right now (its walk, when it has one)
    at(uid) { return this.vis.get(uid) || { x: 0, y: 0, facing: 0 }; }

    // ---- the event queue ----
    push(events) { for (const e of events) if (e.type !== 'refused') this.queue.push(e); }
    later(s, fn) { this.timers.push({ at: this.t + s, fn }); }
    say(text, s = 1.1, color = '#fff4c8', sub = '') { this.banner = { text, sub, color, t: 0, dur: s }; }

    start(e) {
      const g = this.game, u = e.uid ? this.unit(e.uid) : null;
      switch (e.type) {
        case 'move': {
          const pts = e.path.map(k => { const p = H.parseKey(k), w = H.hexWorld(p.q, p.r, H.HEX); return { x: w.x, y: w.y }; });
          const seg = .14;
          this.walk = { uid: e.uid, pts, t: 0, seg };
          this.busy = seg * (pts.length - 1) + .05;
          H.sfx(g, 'move');
          return;
        }
        case 'attack': {
          H.sfx(g, this.swingSound(u, e));
          this.anim.set(e.from, { kind: 'strike', t: 0, dur: .62, n: u ? u.side * 7 + (this.t | 0) : 0 });
          this.later(.3, () => this.impact(e));
          this.busy = .7 + (e.counter ? .55 : 0);
          if (e.counter) this.later(.62 + .05, () => this.anim.set(e.to, { kind: 'strike', t: 0, dur: .5, n: 3 }));
          if (e.counter) this.later(.62 + .3, () => this.counterImpact(e));
          return;
        }
        case 'skill': {
          H.sfx(g, H.skillSound(e.skill));
          const sk = H.get('skill', e.skill);
          this.say(sk.name, .7, '#ffe9a8', u ? u.name : '');
          this.anim.set(e.uid, { kind: 'cast', t: 0, dur: .6 });
          H.sfx(g, 'skill');
          const tgt = e.target && e.target !== e.uid ? this.unit(e.target) : null;
          if (tgt) { const p = this.at(tgt.uid); g.particles.sparks(p.x, p.y, 16, 8, 0); }
          this.busy = .55; return;
        }
        case 'heal': {
          H.sfx(g, 'heal');
          const p = this.at(e.uid);
          g.particles.text(p.x, p.y, 26, '+' + e.amount, '#9af0a0', { scale: 2, bounce: true });
          this.busy = .4; return;
        }
        case 'down': {
          H.sfx(g, this.unit(e.uid) && this.unit(e.uid).knight ? 'ko_knight' : 'ko_monster');
          const p = this.at(e.uid);
          this.anim.set(e.uid, { kind: 'die', t: 0, dur: .7 });
          g.particles.explosion(p.x, p.y, 8, 1);
          H.sfx(g, 'hit');
          this.busy = .6; return;
        }
        case 'wait': this.busy = .08; return;
        case 'status': H.sfx(g, H.statusSound(e.status)); this.busy = .12; return;
        case 'captured': H.sfx(g, 'capture'); this.busy = .3; return;
        case 'stunned': H.sfx(g, 'stop'); this.busy = .2; return;
        case 'poison': H.sfx(g, 'poison'); this.busy = .3; return;
        case 'dial': H.sfx(g, 'timer_tick'); this.busy = .2; return;
        case 'gate': H.sfx(g, 'castle_taken'); this.busy = .5; return;
        case 'retreat': H.sfx(g, 'debuff'); this.busy = .5; return;
        case 'rebirth': H.sfx(g, 'heal'); this.busy = .5; return;
        case 'bell': {
          g.audio.sfx('bell_toll', { pitch: 1 + e.n * .02 });
          this.lastBell = e.n;
          this.say('BELL ' + e.n, 1.1, '#ffe9a8', H.get('season', e.season).name);
          H.sfx(g, 'bell');
          this.busy = 1.0; return;
        }
        case 'terrain': {
          const { q, r } = H.parseKey(e.key), w = H.hexWorld(q, r, H.HEX);
          g.particles.dust(w.x, w.y, 2, 6);
          this.busy = .2; return;
        }
        case 'burn': {
          H.sfx(g, 'burn');
          const p = this.at(e.uid);
          g.particles.text(p.x, p.y, 26, '-' + e.dmg, '#ff9a5a', { scale: 2, bounce: true });
          H.sfx(g, 'burn');
          this.busy = .35; return;
        }
        case 'turn': this.active = e.uid; this.busy = .04; return;
        case 'over': this.over = e; this.busy = .3; return;
        default: this.busy = .02;
      }
    }
    // the sound of a swing: a monster's kind decides its call; a knight's weapon, or a bow at range
    swingSound(u, e) {
      if (!u) return 'slash_whoosh';
      const t = this.unit(e.to);
      if (u.kind === 'monster') return H.get('species', u.species).look.kind === 'beast' ? 'roar_small' : H.get('species', u.species).look.wings ? 'flap' : 'growl';
      if (t && H.hexDist(u, t) > 1) return 'bow_twang';
      return 'slash_whoosh';
    }
    impact(e) {
      const t = this.unit(e.to), p = this.at(e.to), g = this.game;
      if (!t) return;
      H.sfx(g, !e.hit ? 'miss' : e.dmg >= 12 ? 'crit' : (this.unit(e.from) && H.hexDist(this.unit(e.from), t) > 1 ? 'arrow_hit' : 'sword_clang'));
      if (e.hit) {
        g.hitFx(p.x, p.y, 18, { power: e.killed ? 1.4 : 1, damage: e.dmg, textScale: 2, textZ: 30 });
        if (e.skill) g.particles.sparks(p.x, p.y, 18, 10, 0);
      } else {
        g.particles.text(p.x, p.y, 30, 'miss', '#dcd6ec', { scale: 1, bounce: false });
      }
      this.anim.set(e.to, { kind: e.killed ? 'die' : 'hurt', t: 0, dur: .5 });
    }
    counterImpact(e) {
      const c = e.counter, a = this.at(e.from), g = this.game;
      if (!c) return;
      if (c.hit) g.hitFx(a.x, a.y, 18, { power: 1, damage: c.dmg, textScale: 2, textZ: 30 });
      else g.particles.text(a.x, a.y, 30, 'miss', '#dcd6ec', { scale: 1, bounce: false });
      this.anim.set(e.from, { kind: c.killed ? 'die' : 'hurt', t: 0, dur: .4 });
    }

    update(dt) {
      this.t += dt;
      for (const tm of this.timers) if (!tm.dead && this.t >= tm.at) { tm.dead = true; tm.fn(); }
      this.timers = this.timers.filter(tm => !tm.dead);
      if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
      // walks: one unit at a time, a hex per segment
      let moving = null;
      if (this.walk) {
        const w = this.walk, v = this.vis.get(w.uid);
        w.t += dt;
        const i = Math.min(w.pts.length - 2, Math.floor(w.t / w.seg)), f = Math.min(1, (w.t - i * w.seg) / w.seg);
        const a = w.pts[i], b = w.pts[i + 1];
        if (a && b) {
          v.x = a.x + (b.x - a.x) * f; v.y = a.y + (b.y - a.y) * f;
          v.vx = (b.x - a.x) / w.seg; v.vy = (b.y - a.y) / w.seg; v.facing = Math.atan2(v.vy, v.vx);
          moving = w.uid;
        }
        if (w.t >= w.seg * (w.pts.length - 1)) {
          const last = w.pts[w.pts.length - 1]; Object.assign(v, { x: last.x, y: last.y, vx: 0, vy: 0 });
          this.walk = null;
        }
      }
      // strikes, hurts, deaths, casts
      for (const [uid, a] of this.anim) {
        a.t += dt;
        if (a.t >= a.dur && a.kind !== 'die') this.anim.delete(uid);
      }
      // the queue: the next event starts when the last one's time is up
      if (this.busy > 0) this.busy -= dt;
      else if (this.queue.length) this.start(this.queue.shift());
      // every rig is posed from its unit and its animation, every step
      for (const u of this.sim.s.units) {
        const v = this.vis.get(u.uid), R = this.rigOf(u.uid), a = this.anim.get(u.uid);
        const enemy = this.nearestEnemy(u);
        if (enemy && (!this.walk || this.walk.uid !== u.uid)) v.facing = Math.atan2(enemy.y - v.y, enemy.x - v.x);
        const dying = a && a.kind === 'die';
        if (R.kind === 'humanoid') {
          const st = { x: v.x, y: v.y, z: 0, vx: v.vx || 0, vy: v.vy || 0, facing: v.facing, stance: 'ready' };
          if (a && a.kind === 'strike') st.attack = E.move(H.strikeMove(u, a.n || 0), Math.min(1, a.t / a.dur));
          if (a && a.kind === 'cast') st.pose = 'cast';
          if (a && a.kind === 'hurt') st.hurt = true;
          if (u.dead || dying) { st.pose = 'down'; st.stance = undefined; }
          R.rig.update(dt, st);
        } else {
          const strike = a && a.kind === 'strike' ? Math.sin(Math.min(1, a.t / a.dur) * Math.PI) : 0;
          R.rig.update(dt, { squash: -strike * .3, look: [Math.cos(v.facing) * .4, Math.sin(v.facing) * .4], facing: v.facing, walk: moving === u.uid ? 1 : 0, flap: u.dead ? 0 : 1 });
        }
      }
    }
    nearestEnemy(u) {
      let best = null, bd = Infinity;
      for (const t of this.sim.s.units) {
        if (t.dead || t.side === u.side) continue;
        const v = this.vis.get(t.uid), d = Math.hypot(v.x - this.vis.get(u.uid).x, v.y - this.vis.get(u.uid).y);
        if (d < bd) { bd = d; best = v; }
      }
      return best;
    }

    // draws the board, its units, their names and bars, and the banner. o: { reach, strike, cursor, plan, focus }
    draw(r, o = {}) {
      H.drawBoard(r, this.sim, { reach: o.reach, strike: o.strike, cursor: o.cursor, plan: o.plan });
      if (this.sim.s.dials) H.drawDials(r, this.sim);
      const order = this.sim.s.units.filter(u => !u.dead || this.anim.has(u.uid)).sort((a, b) => this.at(a.uid).y - this.at(b.uid).y);
      for (const u of order) {
        const v = this.at(u.uid), R = this.rigOf(u.uid);
        const shown = !u.dead || (this.anim.get(u.uid) && this.anim.get(u.uid).kind === 'die');
        if (!shown) continue;
        r.shadow(v.x, v.y, 6, .32, undefined, 0);
        r.actor(v.x, v.y, 0, (g, ox, oy) => R.rig.draw(g, ox, oy, r.view), { flash: u.side === 1 ? '#ff7a6a' : undefined, flashMix: u.side === 1 ? .12 : .0 });
      }
      if (this.active && this.unit(this.active) && !this.unit(this.active).dead) {
        const v = this.at(this.active);
        r.decal(g => r.groundRing(v.x, v.y, 11, '#ffe9a8', .85, 0));
      }
      // bars above the units: hit points, and the names of the units in focus
      const focus = o.focus || [];
      r.overlay(g => {
        for (const u of this.sim.s.units) {
          if (u.dead) continue;
          const p = r.w(this.at(u.uid).x, this.at(u.uid).y, 34);
          const bw = u.knight ? 18 : 12, frac = u.hp / u.maxHp;
          px.rect(g, Math.round(p[0] - bw / 2) - 1, Math.round(p[1]) - 1, bw + 2, 4, '#0c0a14');
          px.rect(g, Math.round(p[0] - bw / 2), Math.round(p[1]), Math.max(1, Math.round(bw * frac)), 2, frac > .5 ? '#7ad06a' : frac > .25 ? '#e8b050' : '#e84a3a');
          if (focus.includes(u.uid)) E.font.text(g, u.name, Math.round(p[0]), Math.round(p[1]) - 9, '#fff4c8', { align: 'center', shadow: '#000' });
        }
      });
      if (this.banner) {
        const b = this.banner, k = Math.min(1, b.t * 4) * Math.min(1, (b.dur - b.t) * 4);
        r.overlay(g => {
          const y = Math.round(r.H * .3);
          E.font.title(g, b.text, r.W / 2, y, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center', alpha: k });
          if (b.sub) E.font.text(g, b.sub, r.W / 2, y + 18, '#e8e0ff', { align: 'center', shadow: '#000' });
        });
      }
    }
  };
})();

// ---- src/61-battle.js ----
// The battle scene. It turns the player's input into BattleSim commands for the unit whose turn it is, plays the CPU's turns
// through the same commands, and hands the finished sim back to whoever started the battle (the campaign, a skirmish, the
// hub round). Keys, stick and mouse all work: the stick or arrows move the cursor across the hexes, A or Enter picks, B or
// Escape backs out, Y or E ends the player's turns for the bell, and the mouse hovers and clicks hexes and menu entries.
(() => {
  const H = G;

  // what a battle event says, for the log
  const describe = (sim, e) => {
    const name = uid => { const u = sim.byId(uid); return u ? u.name : '?'; };
    if (e.type === 'attack') {
      if (!e.hit) return name(e.from) + ' misses ' + name(e.to) + '.';
      return name(e.from) + ' hits ' + name(e.to) + ' for ' + e.dmg + (e.killed ? ', and it falls.' : '.');
    }
    if (e.type === 'skill') return name(e.uid) + ' uses ' + H.get('skill', e.skill).name + '.';
    if (e.type === 'heal') return name(e.uid) + ' is mended for ' + e.amount + '.';
    if (e.type === 'bell') return 'Bell ' + e.n + ' of ' + sim.s.bellLimit + '.';
    if (e.type === 'burn') return name(e.uid) + ' is scorched.';
    if (e.type === 'captured') return name(e.uid) + ' is captured!';
    if (e.type === 'retreat') return name(e.uid) + ' sounds the retreat.';
    if (e.type === 'over') return e.reason === 'keep' ? 'The Keep is taken.' : e.reason === 'time' ? 'The bells run out.' : e.reason === 'leader' ? 'The commander has fallen.' : 'The field is clear.';
    return null;
  };
  const REASON = { keep: 'The Keep is taken', time: 'The bells ran out', leader: 'The commander fell', routed: 'The field is clear' };

  // the input map this game uses: the engine's defaults, with the battle's own keys added
  H.STRATEGY_INPUT = Object.assign({}, E.Input.DEFAULT, {
    skill: ['KeyL', 'Mouse2', 'Pad2'],
    endTurn: ['KeyE', 'Pad3'],
    info: ['KeyI', 'Tab', 'Pad8']
  });

  H.battleScene = {
    pausable: true,
    view: 'overhead',
    // o: { sim, playerSide, askDelegate, onDone(sim, { won, playerSide }), title }
    enter(o = {}) {
      const game = this.game;
      this.o = o;
      this.sim = o.sim;
      this.playerSide = o.playerSide ?? 0;
      this.humanSides = o.humanSides || [this.playerSide];   // hot-seat: each human side takes its turns on this device
      this.lastHumanSide = null;
      this.board = new H.Board(game, this.sim, o);
      this.board.enter();
      this.cursor = { q: 0, r: 0 };
      this.unitId = null; this.mode = 'move'; this.menuKey = null;
      this.reach = new Map(); this.cands = []; this.cand = 0;
      this.log = [this.sim.s.title + ' • ' + H.get('season', this.sim.s.season).name];
      this.aiWait = .3; this.stick = 0; this.lastHex = null;
      this.phase = o.askDelegate ? 'ask' : 'play';
      this.resultShown = false; this.resultWon = false; this.doneCalled = false;
      this.ask = new H.List([{ label: 'Fight it yourself' }, { label: 'Delegate the battle' }], {
        x: 150, y: 96, w: 140, title: 'The march is set',
        onPick: (i) => { if (i === 1) this.delegate(); else { this.phase = 'play'; H.sfx(game, 'confirm'); } } });
      this.menu = new H.List([], { x: 12, y: 86, w: 140, title: 'Command' });
      this.menu.onPick = (i, it) => this.command(it.key);
      this.menu.onCancel = () => this.backToMove();
      this.targets = new H.List([], { x: 12, y: 86, w: 150, title: 'Target' });
      this.targets.onPick = (i, it) => this.confirmTarget(it.key);
      this.targets.onCancel = () => { this.mode = 'menu'; };
      this.targets.onMove = i => { this.cand = i; };
      const key = o.song || (this.sim.s.map === 'clockwork-sanctum' ? 'boss' : 'battle_attack');
      this.songKey = key;
      game.audio.music(H.SONGS[key]);
      // in a hub round the standing is reported about once a second (the timer ends with the scene)
      if (o.hub && typeof AIHub !== 'undefined' && AIHub.active) {
        this.progressTimer = game.every(1, () => {
          const sc = H.hubScore(this.sim, this.playerSide);
          AIHub.progress({ score: sc.score, label: sc.alive + ' standing, ' + sc.foes + ' foes fallen' });
        });
      }
      this.board.push([{ type: 'bell', n: this.sim.s.bell, season: this.sim.s.season }]);
    },
    exit() { if (this.game.audio) this.game.audio.music(null); },
    // who takes a unit's turn by hand on this copy (hot-seat: the human sides; a hub round: the unit's own player)
    local(u) { return this.humanSides.includes(u.side); },
    // a turn that is not this copy's: true when this copy plays it (the CPU, or a player who is not here)
    remoteTurn(u, dt) { void u; void dt; return true; },

    // ---- the state of the turn ----
    cur() { return this.sim.current(); },
    apply(cmd) {
      const ev = this.sim.apply(cmd);
      this.board.push(ev);
      for (const e of ev) { const line = describe(this.sim, e); if (line) this.log.push(line); }
      while (this.log.length > 4) this.log.shift();
      return ev;
    },
    buildMenu() {
      const u = this.cur(), sim = this.sim;
      const strike = sim.strikeable(u.uid).length, skills = sim.usableSkills(u.uid);
      const items = [
        { label: 'Attack', key: 'attack', disabled: !strike, sub: strike ? '' : 'no foe' },
        { label: 'Skills', key: 'skills', disabled: !skills.length, sub: skills.length ? skills.length + ' ready' : 'none ready' },
        ...(u.leader && u.knight ? [{ label: 'Retreat', key: 'retreat', sub: 'loses' }] : []),
        { label: 'Wait', key: 'wait' }];
      this.menu.set(items, items.findIndex(i => !i.disabled));
    },
    backToMove() {
      const u = this.cur();
      if (!u || u.moved) return;
      this.mode = 'move'; this.reach = this.sim.reach(u.uid);
    },
    command(key) {
      const u = this.cur();
      if (!u || !this.local(u)) return;
      this.menuKey = key;
      if (key === 'wait') { this.apply({ t: 'wait', uid: u.uid }); return; }
      if (key === 'retreat') { this.apply({ t: 'retreat', uid: u.uid }); return; }
      if (key === 'skills') { this.openSkills(u); return; }
      this.setTargets(this.sim.strikeable(u.uid).map(t => H.key(t.q, t.r)), u, null);
    },
    // the skills the unit can use now, each with its reach
    openSkills(u) {
      const items = this.sim.usableSkills(u.uid).map(id => {
        const sk = H.get('skill', id);
        return { label: sk.name, sub: sk.area.indexOf('self') === 0 ? 'self' : 'range ' + sk.range[0] + '-' + sk.range[1], id };
      });
      this.skillList = new H.List(items, { x: 12, y: 86, w: 150, title: 'Skills', maxRows: 7 });
      this.skillList.onPick = (i, it) => this.setTargets(this.sim.skillCandidates(u.uid, it.id), u, it.id);
      this.skillList.onCancel = () => { this.mode = 'menu'; };
      this.mode = 'skills';
    },
    // the keys a command may be aimed at: each foe in reach for an attack, or the cells a skill can touch
    setTargets(keys, u, skillId) {
      this.cands = keys; this.targetSkill = skillId;
      this.targets.set(keys.map(k => {
        const p = H.parseKey(k), t = this.sim.unitAt(p.q, p.r);
        const sub = t && t.side !== u.side ? (() => { const f = this.sim.forecast(u, t); return f.hit + '% -' + f.dmg; })() : '';
        return { label: t ? t.name : 'Here', sub, key: k };
      }), 0);
      this.cand = 0; this.mode = 'target';
    },
    confirmTarget(key) {
      const u = this.cur();
      if (!u) return;
      if (this.targetSkill) this.apply({ t: 'skill', uid: u.uid, skill: this.targetSkill, key });
      else { const p = H.parseKey(key), t = this.sim.unitAt(p.q, p.r); if (t) this.apply({ t: 'attack', uid: u.uid, target: t.uid }); }
      this.mode = 'menu'; this.reach = new Map(); this.targetSkill = null;
    },
    unitKeyUnder(k) { const p = H.parseKey(k), t = this.sim.unitAt(p.q, p.r); return t ? t.uid : null; },
    // the player's bell: every unit of theirs waits out the rest of it
    endPlayerBell() {
      let guard = 0;
      while (!this.sim.s.over && this.cur() && this.local(this.cur()) && guard++ < 40) this.apply({ t: 'wait', uid: this.cur().uid });
    },
    // a battle the player gives up to the planner: it plays out at once
    delegate() {
      H.autoplayBattle(this.sim, 5000);
      this.doneCalled = true;
      if (this.o.onDone) this.o.onDone(this.sim, { won: this.sim.s.winner === this.playerSide, playerSide: this.playerSide });
    },

    update(dt) {
      const game = this.game, I = game.input, b = this.board, sim = this.sim;
      if (this.phase === 'ask') { b.update(dt); this.ask.update(game); return; }
      b.update(dt);
      if (sim.s.over) { this.finish(); return; }
      // the tutorial's tips, one a bell at the start
      if (sim.s.tutorial && sim.s.bell !== this.tipBell) {
        this.tipBell = sim.s.bell;
        const tips = { 1: 'Tip: choose a unit, then a hex it can reach, to move it there.', 2: 'Tip: a foe beside your unit can be struck from where it stands.', 3: 'Tip: Skills lists what your unit can do now; its reach shows as you aim.', 4: 'Tip: a knight on the Keep wins the battle for the attacker.' };
        if (tips[sim.s.bell]) this.log.push(tips[sim.s.bell]);
      }
      // the tension layer of the battle music comes in from bell nine
      if (!this.tension && sim.s.bell >= 9) { this.tension = true; game.audio.layer('tension', .8, 1); }
      if (b.busy > 0 || b.queue.length || b.walk) return;
      const u = this.cur();
      if (!u) return;
      if (!this.local(u)) {
        if (!this.remoteTurn(u, dt)) return;
        this.aiWait -= dt;
        if (this.aiWait > 0) return;
        const cmd = H.aiBattle.next(sim);
        if (cmd) this.apply(cmd);
        this.aiWait = .2;
        return;
      }
      if (this.unitId !== u.uid) {
        if (this.humanSides.length > 1 && this.lastHumanSide !== null && this.lastHumanSide !== u.side) this.board.say('Player ' + (this.humanSides.indexOf(u.side) + 1) + ' to move', 1.2, '#ffe9a8');
        this.lastHumanSide = u.side;
        this.unitId = u.uid; this.mode = 'move';
        this.reach = sim.reach(u.uid);
        this.cursor = { q: u.q, r: u.r };
        this.buildMenu();
        if (!this.reach.size) this.mode = 'menu';
      }
      if (I.pressed('endTurn')) { this.endPlayerBell(); return; }
      if (I.pressed('info')) this.showInfo = !this.showInfo;
      this.hover();
      if (this.mode === 'menu') { this.menu.update(game); return; }
      if (this.mode === 'skills') { this.skillList.update(game); return; }
      if (this.mode === 'target') {
        this.targets.update(game);
        this.cursorToTarget();
        return;
      }
      this.steer(dt, u);
    },
    // the pointer over a hex moves the cursor onto it
    hover() {
      const w = this.game.mouseGround && this.game.mouseGround();
      if (!w) return;
      const h = H.hexAtWorld(w[0], w[1], H.HEX), k = H.key(h.q, h.r);
      if (!this.sim.tile(k)) return;
      if (!this.lastHex || this.lastHex.q !== h.q || this.lastHex.r !== h.r) {
        this.lastHex = h;
        if (this.mode === 'move') this.setCursor(h);
        if (this.mode === 'target') { const i = this.cands.indexOf(H.key(h.q, h.r)); if (i >= 0) { this.cand = i; this.targets.i = i; } }
      }
    },
    // the stick or the arrows move the cursor one hex; A or Enter picks the cell under it
    steer(dt, u) {
      const game = this.game, I = game.input, v = I.move();
      const len = Math.hypot(v[0], v[1]);
      this.stick -= dt;
      if (len > .5 && this.stick <= 0) {
        const d = H.DIRS[H.dirFromVector(v[0], v[1])];
        this.setCursor({ q: this.cursor.q + d[0], r: this.cursor.r + d[1] });
        this.stick = .17;
      } else if (len <= .5) this.stick = 0;
      const clicked = I.clicked && I.clicked();
      if (I.pressed('confirm') || clicked) {
        const occupant = this.sim.unitAt(this.cursor.q, this.cursor.r), key = H.key(this.cursor.q, this.cursor.r);
        if (occupant && occupant.uid === u.uid) { this.mode = 'menu'; this.reach = new Map(); }
        else if (!occupant && this.reach.has(key)) {
          this.apply({ t: 'move', uid: u.uid, to: key });
          this.mode = 'menu'; this.reach = new Map();
        } else H.sfx(game, 'cancel');
        if (this.mode === 'menu') { this.buildMenu(); H.sfx(game, 'confirm'); }
      }
      if (I.pressed('cancel')) { this.backToMove(); }
    },
    setCursor(c) {
      if (!this.sim.tile(H.key(c.q, c.r))) return;
      if (this.cursor.q !== c.q || this.cursor.r !== c.r) H.sfx(this.game, 'cursor');
      this.cursor = { q: c.q, r: c.r };
    },
    cursorToTarget() {
      const k = this.cands.length ? this.cands[this.targets.i] : null;
      if (k) this.cursor = H.parseKey(k);
    },
    finish() {
      if (this.doneCalled || this.board.queue.length || this.board.busy > 0) return;
      if (!this.resultShown) {
        this.resultShown = true;
        this.resultWon = this.sim.s.winner === this.playerSide;
        this.game.audio.music(H.SONGS[this.resultWon ? 'victory' : 'defeat']);
        return;
      }
      if (this.game.input.pressed('confirm') || this.game.input.clicked()) {
        this.doneCalled = true;
        if (this.o.onDone) this.o.onDone(this.sim, { won: this.resultWon, playerSide: this.playerSide });
      }
    },

    // ---- drawing ----
    draw(r) {
      const sim = this.sim, b = this.board, game = this.game;
      r.sky(['#1a2a14', '#2e4a22']);
      const reach = this.phase === 'play' && this.mode === 'move' ? this.reach : new Map();
      const strike = new Map();
      if (this.mode === 'target') for (const k of this.cands) strike.set(k, 1);
      const cursor = this.phase === 'play' ? this.cursor : null;
      const focus = this.mode === 'target' && this.cands.length ? [this.unitKeyUnder(this.cands[this.targets.i])].filter(Boolean) : this.unitId ? [this.unitId] : [];
      b.draw(r, { reach, strike, cursor, focus });
      if (this.phase === 'ask') {
        r.overlay(g => E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#000000', '#000000'], alpha: .35 }));
        this.ask.draw(r);
        return;
      }
      this.drawHud(r);
      if (this.phase === 'play' && this.mode === 'menu' && this.cur() && this.local(this.cur())) this.menu.draw(r);
      if (this.phase === 'play' && this.mode === 'target') this.targets.draw(r);
      if (this.phase === 'play' && this.mode === 'skills' && this.skillList) this.skillList.draw(r);
      if (sim.s.over && this.resultShown) this.drawResult(r);
      void game;
    },
    drawHud(r) {
      const sim = this.sim, game = this.game;
      const focusU = this.mode === 'target' && this.cands.length ? this.sim.byId(this.unitKeyUnder(this.cands[this.targets.i])) || this.cur() : this.unitUnderCursor() || this.cur();
      const mine = sim.alive(this.playerSide).length, foe = sim.alive(1 - this.playerSide).length;
      r.overlay(g => {
        E.ui.box(g, 0, 0, r.W, 14, { bg: ['#14101e', '#0a0812'], alpha: .85 });
        E.font.text(g, 'BELL ' + sim.s.bell + '/' + sim.s.bellLimit, 6, 3, '#ffe9a8', { shadow: '#000' });
        E.font.text(g, H.get('season', sim.s.season).name, r.W / 2, 3, '#e8e0ff', { align: 'center', shadow: '#000' });
        E.font.text(g, 'YOU ' + mine + '   FOE ' + foe, r.W - 6, 3, '#e8e0ff', { align: 'right', shadow: '#000' });
      });
      if (focusU) this.drawCard(r, focusU);
      // the log, bottom right, newest last
      const rows = [];
      for (const line of this.log) for (const t of E.font.wrap(line, 150)) rows.push(t);
      const shown = rows.slice(-5), x = r.W - 158, y0 = r.H - 14 - shown.length * 9;
      r.overlay(g => {
        E.ui.box(g, x - 4, y0 - 4, 158, shown.length * 9 + 8, { bg: ['#14101e', '#0a0812'], alpha: .85 });
        shown.forEach((t, i) => E.font.text(g, t, x, y0 + i * 9, i === shown.length - 1 ? '#fff4c8' : '#cfc6ec', { shadow: '#000' }));
      });
      const verbs = this.mode === 'move' ? 'Move here' : this.mode === 'target' ? 'Strike' : 'Choose';
      H.promptRow(r, game, [['confirm', verbs], ['cancel', 'Back'], ['endTurn', 'End turn'], ['info', 'Details']], 6, r.H - 12);
    },
    unitUnderCursor() {
      const k = H.key(this.cursor.q, this.cursor.r);
      return this.sim.s.units.find(x => !x.dead && H.key(x.q, x.r) === k) || null;
    },
    drawCard(r, u) {
      const t = this.sim.tile(H.key(u.q, u.r)) || { name: '', def: 0 };
      const skills = (u.skills || []).map(id => H.get('skill', id).name);
      const x = 6, y = r.H - 100;
      const cls = u.knight ? H.get('class', H.get('knight', u.ref).cls).name : 'Monster';
      r.overlay(g => E.ui.box(g, x - 4, y - 4, 150, 84, { bg: ['#14101e', '#0a0812'], alpha: .9, border: '#8a7ab0' }));
      H.bar(r, x, y + 26, 128, u.hp / u.maxHp, u.hp > u.maxHp / 2 ? '#7ad06a' : '#e8b050', 'HP ' + u.hp + '/' + u.maxHp);
      r.overlay(g => {
        E.font.text(g, u.name, x, y, u.side === this.playerSide ? '#fff4c8' : '#ffb0a0', { shadow: '#000' });
        E.font.text(g, cls + ' • ' + H.get('element', u.element).name, x, y + 10, '#cfc6ec', { shadow: '#000' });
        E.font.text(g, 'ATK ' + u.atk + '   DEF ' + u.def, x, y + 40, '#f0ecff', { shadow: '#000' });
        E.font.text(g, 'MOV ' + u.mov + '   RNG ' + u.rng + '   SIZE ' + u.size, x, y + 50, '#f0ecff', { shadow: '#000' });
        E.font.text(g, 'Ground: ' + t.name + (t.def ? ' (+' + t.def + ')' : ''), x, y + 60, '#bfe8a0', { shadow: '#000' });
        if (skills.length) E.font.text(g, skills.slice(0, 2).join(', '), x, y + 70, '#ffe9a8', { shadow: '#000' });
      });
    },
    drawResult(r) {
      const won = this.resultWon, reason = this.sim.s.reason;
      r.overlay(g => {
        E.ui.box(g, r.W / 2 - 110, r.H / 2 - 42, 220, 84, { bg: ['#1c1830', '#0e0b18'], border: '#8a7ab0' });
        E.font.title(g, won ? 'VICTORY' : 'DEFEAT', r.W / 2, r.H / 2 - 32, { scale: 2, colors: won ? ['#fff6c8', '#8af08a'] : ['#ffd0c0', '#e87060'], outline: '#1a0c10', align: 'center' });
        E.font.text(g, REASON[reason] || 'The field is clear', r.W / 2, r.H / 2 + 2, '#f0ecff', { align: 'center', shadow: '#000' });
      });
      H.promptRow(r, this.game, [['confirm', 'Continue']], r.W / 2 - 24, r.H / 2 + 20);
    }
  };
})();

// ---- src/62-campaign.js ----
// The campaign scene: the continent on the left, the selected castle and its command menu on the right. Each season it
// shows the tidings, lets the realm muster (summon, bind, evolve, move, quest, equip, march), resolves the marches
// (human battles go to the battle scene and come back here), and then the aftermath. The stick or arrows move the
// cursor from castle to castle; A opens the castle's commands, B goes back; the mouse hovers and clicks.
(() => {
  const H = G, px = E.px;
  const ses = H.session = H.session || { cs: null, human: 'verdance', battle: null, hub: null };
  const SUB_TITLE = { summon: 'Summon a monster', bind: 'Bind a monster', unbind: 'Unbind a monster', evolve: 'Evolve a monster', move: 'Move knight to', march: 'March on', equip: 'Equip from the treasury' };

  H.campaignScene = {
    pausable: true,
    view: 'overhead',
    // enter(data): { start: true, realm } to begin, or { resume: true } after a battle the campaign was waiting for
    enter(data = {}) {
      const game = this.game;
      if (data.story) { this.phase = 'tidings'; this.afterTidings(); return; }   // back from an event: the next one, or the muster
      if (data.resumeBattle && ses.cs.s.pending) { this.startBattle(ses.cs.s.pending); return; }   // back from the rival lines: the battle goes on
      this.focusMenu = false; this.toast = null; this.sub = null; this.kIdx = 0;
      this.sel = this.sel || H.get('realm', ses.human).capital;
      if (data.start || !ses.cs) {
        const humans = data.humans || [data.realm || ses.human];
        ses.human = humans[0];
        ses.cs = H.CampaignSim.create({ humans, seed: data.seed || ((Math.random() * 1e9) | 0) + 1 });
        this.mi = 0;
        this.phase = 'tidings';
        this.sel = H.get('realm', ses.human).capital;
      } else if (data.resume) {
        const r = ses.cs.finishPending(ses.battle);
        ses.battle = null;
        this.afterResolve(r);
        return;
      } else {
        this.phase = ses.cs.s.phase === 'muster' ? 'tidings' : 'muster';
      }
      this.cursorCastle = this.sel;
      this.reportAt = ses.cs.s.report.length;
      this.enterPhase();
    },
    exit() { if (this.game.audio) this.game.audio.duck && this.game.audio.duck(false); },

    enterPhase() {
      const game = this.game, cs = ses.cs;
      game.saves.canSave = cs.s.phase === 'muster' && !cs.s.ended;
      // the season's own theme; the season's sting when the turn comes
      const song = H.SEASON_SONG[cs.season];
      if (this.songSeason !== cs.season) { this.songSeason = cs.season; this.wipe = 1.4; this.wipeColor = H.get('season', cs.season).color; game.audio.music(H.SONGS[song]); if (cs.s.seasonsPlayed > 0) game.audio.sting(H.STING[song], { at: 'bar' }); }
      if (this.phase === 'tidings') {
        if (cs.s.candle <= 3) game.audio.sfx('candle_hiss');
        this.reportAt = cs.s.report.length;
        if (cs.s.seasonsPlayed > 0) game.saves.autosave();   // the autosave runs at every tidings, as the plan asks
      }
      if (this.phase === 'muster') { this.buildMenu(); if (cs.s.stilled) this.say('The Gray Knight has stilled ' + H.get('castle', cs.s.stilled).name + '.'); }
      if (this.phase === 'over') this.game.go('ending', { outcome: cs.outcome() });
    },

    // the tidings are read: the season's queued events play one at a time, then the muster opens
    afterTidings() {
      const ev = ses.cs.nextEvent();
      if (ev) { this.game.go('event', { event: ev.id, next: { scene: 'campaign', data: { story: true } } }); return; }
      this.mi = 0; ses.human = ses.cs.s.humans[0];
      this.phase = 'muster';
      this.enterPhase();
    },
    // the resolution of a march: a battle to fight, or the season is over
    afterResolve(r) {
      const cs = ses.cs;
      if (r && r.battle) { this.startBattle(r.battle); return; }
      if (cs.s.ended) { this.phase = 'over'; this.game.go('ending', { outcome: cs.outcome() }); return; }
      this.phase = 'aftermath';
      this.aftermathLines = this.linesSince(this.reportAt);
    },
    // the report lines since a point, without the next season's tidings (those are read at the start of muster)
    linesSince(at) { return ses.cs.s.report.slice(at).filter(x => x.kind !== 'tidings').map(x => x.text); },
    startBattle(pending) {
      const cs = ses.cs, march = pending.march;
      // two rulers on the field trade their lines first; each pair does so once
      const ra = cs.realmRuler(march.by), rb = cs.realmRuler(cs.ownerOf(march.to));
      const key = [ra, rb].sort().join('-');
      if (ra && rb && H.RIVAL_LINES[key] && !cs.s.flags['rival-' + key]) {
        cs.s.flags['rival-' + key] = true;
        this.game.go('event', { lines: H.RIVAL_LINES[key], sky: ['#1a1428', '#3a2a50'], next: { scene: 'campaign', data: { resumeBattle: true } } });
        return;
      }
      const playerSide = cs.isHuman(march.by) ? 0 : 1;
      const song = march.to === 'meridian' ? 'boss' : cs.s.realms[cs.ownerOf(march.to)] && cs.ownerOf(march.to) === 'dominion' ? 'hourless' : (playerSide === 0 ? 'battle_attack' : 'battle_defend');
      const humanSides = [];
      if (cs.isHuman(march.by)) humanSides.push(0);
      if (cs.isHuman(cs.ownerOf(march.to))) humanSides.push(1);
      const sim = H.BattleSim.load(pending.sim);
      ses.battle = sim;
      this.game.go('battle', {
        sim, playerSide, humanSides, askDelegate: true, song,
        onDone: (done) => { ses.battle = done; this.game.go('campaign', { resume: true }); }
      });
    },

    // the muster's menu for the selected castle
    buildMenu() {
      const cs = ses.cs, c = this.sel, human = ses.human;
      const knights = this.knightsHere();
      const K = knights[this.kIdx] || null;
      const holds = cs.ownerOf(c) === human;
      const items = [];
      items.push({ label: K ? 'Knight: ' + H.get('knight', K.id).name : 'Knight: none here', key: 'knight', disabled: knights.length < 2 && !K, sub: K ? (K.state === 'ready' ? 'ready' : K.state === 'quest' ? 'on quest' : 'hurt') : '' });
      items.push({ label: 'Summon monster', key: 'summon', disabled: !holds, sub: holds ? cs.s.realms[human].mana + ' mana' : '' });
      items.push({ label: 'Bind a monster', key: 'bind', disabled: !(holds && K) });
      items.push({ label: 'Unbind a monster', key: 'unbind', disabled: !(holds && K && cs.bondedTo(K.id).length) });
      items.push({ label: 'Evolve a monster', key: 'evolve', disabled: !(holds && K) });
      items.push({ label: 'Move knight', key: 'move', disabled: !(holds && K && K.state === 'ready') });
      items.push({ label: 'March on a castle', key: 'march', disabled: !(holds && K && K.state === 'ready') });
      items.push({ label: 'Send on a quest', key: 'quest', disabled: !(holds && K && K.state === 'ready') });
      items.push({ label: 'Equip from treasury', key: 'equip', disabled: !(holds && K) });
      items.push({ label: 'Done mustering', key: 'end' });
      this.menu = new H.List(items, { x: 0, y: 0, w: 148, title: null, rowH: 12, maxRows: 9, onPick: (i, it) => this.pick(it.key) });
      this.menu.onCancel = () => { this.focusMenu = false; };
    },
    knightsHere() {
      const cs = ses.cs;
      return cs.knightsAt(this.sel);
    },
    // one choice from the menu
    pick(key) {
      const cs = ses.cs, human = ses.human, K = this.knightsHere()[this.kIdx] || null;
      if (key === 'knight') { const n = this.knightsHere().length; if (n) this.kIdx = (this.kIdx + 1) % n; this.buildMenu(); return; }
      if (key === 'end') {
        // hot-seat: the next human musters after the device is passed on; the last one ends the muster
        if (this.mi < cs.s.humans.length - 1) { this.mi++; ses.human = cs.s.humans[this.mi]; this.sel = H.get('realm', ses.human).capital; this.cursorCastle = this.sel; this.phase = 'pass'; this.enterPhase(); return; }
        this.endMuster(); return;
      }
      if (key === 'summon') { this.openSub('summon', H.ids('species').map(id => ({ label: H.get('species', id).name, sub: cs.summonCost(id) + ' mana', value: id, disabled: cs.s.realms[human].mana < cs.summonCost(id) })), v => ({ t: 'summon', castle: this.sel, species: v })); return; }
      if (key === 'bind') { const ms = cs.unboundAt(this.sel); if (!ms.length) return this.say('No free monster here.'); this.openSub('bind', ms.map(m => ({ label: H.get('species', m.species).name, sub: m.hp + ' HP', value: m.uid })), v => ({ t: 'bind', monster: v, knight: K.id })); return; }
      if (key === 'unbind') { const ms = cs.bondedTo(K.id); this.openSub('unbind', ms.map(m => ({ label: H.get('species', m.species).name, value: m.uid })), v => ({ t: 'unbind', monster: v })); return; }
      if (key === 'evolve') { const ms = cs.bondedTo(K.id).filter(m => m.form === 0); if (!ms.length) return this.say('No monster of ' + H.get('knight', K.id).name + '\'s to evolve.'); this.openSub('evolve', ms.map(m => ({ label: H.get('species', m.species).name, sub: 'cost ' + cs.evolveCost(m.species), value: m.uid })), v => ({ t: 'evolve', monster: v })); return; }
      if (key === 'move') { const to = H.neighbourCastles(K.castle).filter(c => cs.ownerOf(c) === human); if (!to.length) return this.say('No road to a castle of yours.'); this.openSub('move', to.map(c => ({ label: H.get('castle', c).name, value: c })), v => ({ t: 'move', knight: K.id, to: v })); return; }
      if (key === 'march') { const to = H.neighbourCastles(K.castle).filter(c => cs.ownerOf(c) !== human); if (!to.length) return this.say('No enemy on a road from here.'); this.openSub('march', to.map(c => ({ label: H.get('castle', c).name, sub: H.get('realm', cs.ownerOf(c)).name, value: c })), v => ({ t: 'march', knight: K.id, to: v })); return; }
      if (key === 'quest') { this.act({ t: 'quest', knight: K.id }); return; }
      if (key === 'equip') { if (!cs.s.stock.length) return this.say('The treasury is empty.'); this.openSub('equip', cs.s.stock.map(id => ({ label: H.get('item', id).name, sub: H.get('item', id).desc.split('.')[0], value: id })), v => ({ t: 'equip', knight: K.id, item: v })); return; }
    },
    openSub(kind, items, make) {
      this.subKind = kind; this.subMake = make;
      this.sub = new H.List(items, { x: Math.round((this.game.W || 427) * .6) + 4, y: 116, w: 150, title: SUB_TITLE[kind], rowH: 12, maxRows: 8,
        onPick: (i, it) => { const a = make(it.value); this.sub = null; this.act(a); },
        onCancel: () => { this.sub = null; } });
    },
    act(a) {
      const err = ses.cs.do(a, ses.human);
      if (err) { this.say(err); H.sfx(this.game, 'ui_error'); }
      else { this.say('Done.'); H.sfx(this.game, a.t === 'summon' ? 'summon_rise' : a.t === 'promote' ? 'capture' : 'ui_confirm'); }
      this.buildMenu();
    },
    say(text) { this.toast = { text, t: 2.6 }; },
    // the muster ends once: a second press while the marches are on their way does nothing
    endMuster() {
      if (this.phase !== 'muster' || ses.cs.s.phase !== 'muster') return;
      this.phase = 'march';
      const r = ses.cs.endMuster();
      this.afterResolve(r);
    },

    // the continent: the castle the cursor is on, by the arrow keys' direction, and the mouse
    panel(r) { return { x: 6, y: 14, w: Math.round(r.W * .58), h: r.H - 28 }; },
    castlePos(r, id) { const T = H.mapTransform(this.panel(r)), c = H.get('castle', id); return { x: T.X(c.x), y: T.Y(c.y) }; },
    nearestCastle(r, dir) {
      const from = this.castlePos(r, this.cursorCastle), d = H.DIRS[dir];
      const dx = Math.cos(H.DIR_ANGLE[dir] * Math.PI / 180), dy = Math.sin(H.DIR_ANGLE[dir] * Math.PI / 180);
      let best = null;
      for (const c of H.ids('castle')) {
        if (c === this.cursorCastle) continue;
        const p = this.castlePos(r, c), vx = p.x - from.x, vy = p.y - from.y, len = Math.hypot(vx, vy) || 1;
        const along = (vx * dx + vy * dy) / len;
        if (along < .5) continue;
        const score = len * (2 - along);
        if (!best || score < best.score) best = { id: c, score };
      }
      return best ? best.id : null;
    },

    update(dt) {
      const game = this.game, I = game.input, cs = ses.cs, r = game.r || { W: game.W, H: game.H };
      if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
      if (this.wipe > 0) this.wipe -= dt;
      if (this.phase === 'pass') { if (I.pressed('confirm') || I.clicked()) { this.phase = 'muster'; this.enterPhase(); } return; }
      if (this.phase === 'tidings') { if (I.pressed('confirm') || I.clicked()) this.afterTidings(); return; }
      if (this.phase === 'aftermath') { if (I.pressed('confirm') || I.clicked()) { this.phase = 'tidings'; this.enterPhase(); } return; }
      if (this.phase !== 'muster') return;
      // pointer: over a castle moves the cursor; a click on one selects it and opens its menu
      const p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
      const hit = (pt) => H.ids('castle').find(id => { const q = this.castlePos({ W: game.W, H: game.H }, id); return Math.hypot(q.x - pt[0], q.y - pt[1]) < 9; });
      if (p && !this.sub && !this.focusMenu) { const h = hit(p); if (h && h !== this.cursorCastle) { this.cursorCastle = h; this.sel = h; this.kIdx = 0; this.buildMenu(); } }
      if (c && !this.sub) { const h = hit(c); if (h) { this.cursorCastle = h; this.sel = h; this.kIdx = 0; this.focusMenu = true; this.buildMenu(); return; } }
      if (this.sub) { this.sub.update(game); return; }
      if (this.focusMenu) {
        if (I.pressed('left') || I.pressed('right')) { const n = this.knightsHere().length; if (n > 1) { this.kIdx = (this.kIdx + (I.pressed('right') ? 1 : n - 1)) % n; this.buildMenu(); } }
        this.menu.update(game);
        if (I.pressed('cancel')) this.focusMenu = false;
        return;
      }
      // the map: the arrows jump to the next castle that way
      const v = I.move(), len = Math.hypot(v[0], v[1]);
      this.stick = (this.stick || 0) - dt;
      if (len > .5 && this.stick <= 0) {
        const id = this.nearestCastle(r, H.dirFromVector(v[0], v[1]));
        if (id) { this.cursorCastle = id; this.sel = id; this.kIdx = 0; this.buildMenu(); H.sfx(game, 'cursor'); }
        this.stick = .22;
      } else if (len <= .5) this.stick = 0;
      if (I.pressed('confirm')) { this.focusMenu = true; }
      if (I.pressed('endTurn')) this.pick('end');
    },

    draw(r) {
      const game = this.game;
      r.sky(['#16202e', '#25344a']);
      if (this.phase === 'tidings') return this.drawTidings(r);
      if (this.phase === 'pass') return this.drawPass(r);
      if (this.phase === 'aftermath') return this.drawAftermath(r);
      this.drawMap(r);
      this.drawSide(r);
      // the season wipe: a band of the new season's colour sweeps across as the turn comes
      if (this.wipe > 0) { const k = 1 - this.wipe / 1.4, x = Math.round(k * r.W * 1.2); r.overlay(g => { px.rect(g, 0, 0, Math.min(x, r.W), r.H, this.wipeColor || '#ffffff'); px.rect(g, Math.max(0, x - 8), 0, 8, r.H, '#ffffff'); }); }
      if (this.toast) r.overlay(g => { E.ui.box(g, r.W / 2 - 110, r.H - 30, 220, 16, { bg: ['#1c1830', '#0e0b18'], alpha: .9 }); E.font.text(g, this.toast.text, r.W / 2, r.H - 26, '#fff4c8', { align: 'center', shadow: '#000' }); });
      H.promptRow(r, game, this.focusMenu ? [['confirm', 'Choose'], ['cancel', 'Map'], ['left', 'Knight']] : [['confirm', 'Open'], ['endTurn', 'Done mustering']], 6, r.H - 12);
    },
    drawMap(r) {
      const cs = ses.cs, P = this.panel(r), T = H.mapTransform(P);
      r.overlay(g => {
        E.ui.box(g, P.x - 2, P.y - 2, P.w + 4, P.h + 4, { bg: ['#2a3a2a', '#1a2a1a'], border: '#5a7a5a', alpha: 1 });
        // roads
        for (const [a, b] of H.ROADS) {
          const pa = H.get('castle', a), pb = H.get('castle', b);
          px.line(g, T.X(pa.x), T.Y(pa.y), T.X(pb.x), T.Y(pb.y), '#8a7a5a', 1);
        }
        // the castles, the realm's colour behind each, the cursor's ring, and the knights' banners
        for (const c of H.ids('castle')) {
          const ca = H.get('castle', c), x = Math.round(T.X(ca.x)), y = Math.round(T.Y(ca.y));
          const owner = cs.ownerOf(c);
          px.disc(g, x, y + 3, 9, H.REALM_FILL[owner] || '#666');
          px.disc(g, x, y + 3, 7, '#1c1a24');
          H.drawCastle(g, x, y, owner, { capital: ca.capital, scale: 1 });
          if (cs.isStill(c)) { px.disc(g, x, y - 12, 4, '#8a8a92'); px.disc(g, x, y - 12, 3, '#d8d8e0'); px.line(g, x, y - 12, x, y - 14, '#2a2a30', 1); px.line(g, x, y - 12, x + 2, y - 12, '#2a2a30', 1); }
          if (ca.goal) E.font.text(g, 'M', x, y - 20, '#ffd36a', { align: 'center', shadow: '#000' });
          // the troops on the castle: a little figure for each knight (in its realm's colour), a dot for each monster
          const here = cs.knightsAt(c), beasts = cs.monstersAt(c);
          here.slice(0, 4).forEach((k, i) => { const fx = x - 14 + i * 7, fy = y + 13; px.disc(g, fx, fy - 5, 1.6, '#f0d8b0'); px.rect(g, fx - 1.5, fy - 3, 3, 4, H.REALM_FILL[k.realm] || '#c8c0d8'); px.rect(g, fx - 1.5, fy + 1, 1, 2, '#2a2230'); px.rect(g, fx + .5, fy + 1, 1, 2, '#2a2230'); });
          beasts.slice(0, 6).forEach((m, i) => px.disc(g, x - 14 + i * 5 + 1, y + 21, 1.4, m.bondTo ? '#e8d890' : '#9ad870'));
          if (here.length > 4) E.font.text(g, '+' + (here.length - 4), x + 14, y + 12, '#f0ecff', { shadow: '#000' });
        }
        // marches in progress this season
        for (const m of cs.s.marches) {
          const a = H.get('castle', m.from), b = H.get('castle', m.to);
          px.line(g, T.X(a.x), T.Y(a.y), T.X(b.x), T.Y(b.y), '#ffd36a', 2);
        }
        const cur = this.castlePos({ W: r.W, H: r.H }, this.cursorCastle);
        const pulse = 9 + Math.sin(this.game.time * 6) * 1;
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; px.rect(g, Math.round(cur.x + Math.cos(a) * pulse), Math.round(cur.y + Math.sin(a) * pulse), 1, 1, '#ffffff'); }
        const cc = H.get('castle', this.cursorCastle);
        E.font.text(g, cc.name, P.x + 4, P.y + P.h - 10, '#fff4c8', { shadow: '#000' });
      });
    },
    drawSide(r) {
      const cs = ses.cs, x = Math.round(r.W * .6) + 4, w = r.W - x - 6, c = this.sel;
      const ca = H.get('castle', c), owner = cs.ownerOf(c);
      const season = H.get('season', cs.season), mana = cs.s.realms[ses.human].mana;
      r.overlay(g => {
        E.ui.box(g, x - 4, 6, w + 8, 46, { bg: ['#1c1830', '#0e0b18'], alpha: .92 });
        E.font.text(g, season.name + ' ' + cs.s.year + ' • Candle ' + cs.s.candle, x, 10, season.color, { shadow: '#000' });
        E.font.text(g, 'Mana ' + mana + ' • ' + H.get('realm', ses.human).name, x, 22, '#e8e0ff', { shadow: '#000' });
        E.font.text(g, ca.name + ' • ' + H.get('realm', owner).name, x, 34, '#fff4c8', { shadow: '#000' });
      });
      const knights = cs.knightsAt(c), monsters = cs.monstersAt(c);
      r.overlay(g => {
        let yy = 58;
        E.font.text(g, 'Knights: ' + (knights.length ? '' : 'none'), x, yy, '#cfc6ec', { shadow: '#000' });
        knights.slice(0, 3).forEach((k, i) => {
          const kn = H.get('knight', k.id);
          const st = k.state === 'ready' ? '' : k.state === 'quest' ? ' (quest)' : ' (hurt)';
          E.font.text(g, (this.focusMenu && i === this.kIdx ? '▸' : ' ') + kn.name + ' L' + k.level + st, x, yy + 10 + i * 9, k.state === 'ready' ? '#f0ecff' : '#9a94b0', { shadow: '#000' });
        });
        E.font.text(g, 'Monsters here: ' + monsters.length, x, yy + 40, '#cfc6ec', { shadow: '#000' });
        E.font.text(g, ca.capital ? 'Capital' : ca.goal ? 'The Calendar City' : 'Yield ' + ca.yield, x, yy + 50, '#bfe8a0', { shadow: '#000' });
      });
      if (this.sub) this.sub.draw(r);
      else if (this.phase === 'muster') {
        this.menu.x = x; this.menu.y = 126; this.menu.w = w - 10;
        this.menu.draw(r);
      }
    },
    drawPass(r) {
      const cs = ses.cs, n = cs.s.humans.indexOf(ses.human) + 1;
      r.sky(['#101838', '#2a2050']);
      r.overlay(g => E.font.title(g, 'PLAYER ' + n, r.W / 2, r.H * .3, { scale: 3, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      H.panel(r, r.W / 2 - 140, r.H * .3 + 40, 280, 58);
      H.say(r, 'Pass the device to the ruler of ' + H.get('realm', ses.human).name + '. Your rivals, look away.', r.W / 2 - 128, r.H * .3 + 50, 256, '#f0ecff');
      H.promptRow(r, this.game, [['confirm', 'I am ready']], r.W / 2 - 40, r.H - 14);
    },
    drawTidings(r) {
      const cs = ses.cs, season = H.get('season', cs.season);
      r.sky(season.name === 'Winter' ? ['#1a2a3a', '#3a5a7a'] : season.name === 'Summer' ? ['#3a2014', '#7a4a2a'] : season.name === 'Autumn' ? ['#2a1a10', '#6a4420'] : ['#14301c', '#2e5a34']);
      r.overlay(g => {
        E.font.title(g, season.name.toUpperCase(), r.W / 2, 24, { scale: 2, colors: ['#fff6c8', season.color], outline: '#1a0c10', align: 'center' });
        E.font.text(g, 'Year ' + cs.s.year + ' • the Hour-Candle has ' + cs.s.candle + ' season' + (cs.s.candle === 1 ? '' : 's'), r.W / 2, 56, '#e8e0ff', { align: 'center', shadow: '#000' });
      });
      H.panel(r, 24, 78, r.W - 48, 100);
      H.say(r, 'Tidings. ' + H.get('season', cs.season).tidings, 34, 88, r.W - 68, '#f4f0ff');
      H.promptRow(r, this.game, [['confirm', 'Muster the realm']], r.W / 2 - 60, r.H - 14);
    },
    drawAftermath(r) {
      const lines = this.aftermathLines || [];
      r.sky(['#101820', '#20303a']);
      r.overlay(g => E.font.title(g, 'AFTERMATH', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      H.panel(r, 18, 46, r.W - 36, r.H - 84);
      const shown = lines.slice(-12);
      shown.forEach((t, i) => H.say(r, '• ' + t, 28, 54 + i * 15, r.W - 56, '#f0ecff'));
      if (!shown.length) H.say(r, 'A quiet season. Nothing marched, nothing fell.', 28, 54, r.W - 56);
      H.promptRow(r, this.game, [['confirm', 'Next season']], r.W / 2 - 40, r.H - 14);
    }
  };
})();

// ---- src/63-menus.js ----
// The menu scenes: the title (with its idle timer), the attract reel, campaign and skirmish setup, how to play, dev mode,
// the story dialog, the endings, and the About and credits screen.
(() => {
  const H = G, px = E.px;
  const ses = H.session = H.session || { cs: null, human: 'verdance', battle: null, hub: null };
  const SKIRMISH = {
    player: [{ kind: 'knight', ref: 'oren', leader: true, items: ['sun-rune'] }, { kind: 'knight', ref: 'bryony' }, { kind: 'knight', ref: 'dunstan' },
      { kind: 'monster', ref: 'gleam-slime', form: 0 }, { kind: 'monster', ref: 'thorn-hare', form: 0 }, { kind: 'monster', ref: 'cinder-imp', form: 0 }],
    foe: [{ kind: 'knight', ref: 'tamsin', leader: true }, { kind: 'knight', ref: 'ysolde' }, { kind: 'knight', ref: 'ferrin' },
      { kind: 'monster', ref: 'storm-pixie', form: 0 }, { kind: 'monster', ref: 'dusk-bat', form: 0 }, { kind: 'monster', ref: 'cinder-imp', form: 1 }]
  };
  H.SKIRMISH = SKIRMISH;
  // the attract reel's battles: a different map, season and seed each time
  const reel = (seed) => {
    const rng = new H.Rng(seed);
    return H.BattleSim.create({ map: rng.pick(H.ids('map')), season: rng.pick(H.SEASON_ORDER), seed,
      sides: [{ troops: SKIRMISH.player }, { troops: SKIRMISH.foe }] });
  };

  // ---- the title: the menu, the four seasons on the backdrop, and the touch-only notice ----
  H.titleScene = {
    enter() {
      const game = this.game;
      this.idle = 0; this.t = 0; this.touchOnly = H.touchOnly(game);
      this.lastPointer = null;
      this.saved = game.saves.latest ? game.saves.latest() : null;
      const items = [];
      if (!this.touchOnly) {
        items.push({ label: 'New campaign', key: 'campaign' });
        if (this.saved) items.push({ label: 'Continue', key: 'continue' });
        items.push({ label: 'Skirmish', key: 'skirmish' });
        items.push({ label: 'Tutorial: Border Meadow', key: 'tutorial' });
        items.push({ label: 'How to play', key: 'help' });
      }
      items.push({ label: 'Options', key: 'options' });
      items.push({ label: 'About and credits', key: 'about' });
      this.menu = new H.List(items, { x: 40, y: 0, w: 150, rowH: 14, maxRows: 9, onPick: (i, it) => this.pick(it.key) });
      game.audio.music(H.SONGS.title);
      game.input.touchEnabled = false;
    },
    pick(key) {
      const game = this.game;
      if (key === 'campaign') game.go('setup');
      else if (key === 'continue') { if (this.saved) game.saves.load(this.saved.slot ?? 'auto'); }
      else if (key === 'skirmish') game.go('skirmish');
      else if (key === 'tutorial') game.go('event', { lines: H.TUTORIAL_LINES, next: { scene: 'battle', data: H.tutorialBattle(game) } });
      else if (key === 'help') game.go('help');
      else if (key === 'options') game.menu('settings');
      else if (key === 'about') game.go('about');
    },
    update(dt) {
      const game = this.game, I = game.input;
      this.t += dt;
      const moved = I.pointer && I.pointer();
      const acted = I.anyPressed() || I.clicked() || (moved && (!this.lastPointer || Math.abs(moved[0] - this.lastPointer[0]) + Math.abs(moved[1] - this.lastPointer[1]) > 2));
      this.lastPointer = moved || this.lastPointer;
      if (acted) this.idle = 0; else this.idle += dt;
      if (this.idle > 10) { game.go('attract'); return; }
      this.menu.update(game);
    },
    draw(r) {
      const game = this.game, t = this.t;
      // the four seasons: a band of each around a clock tower, a day that turns
      r.sky(['#101838', '#3a2a60']);
      r.overlay(g => {
        const seasons = [['#2e6a3a', '#7ad06a'], ['#8a4a20', '#ffb060'], ['#6a4a20', '#e8a040'], ['#2a4a6a', '#9ad8ff']];
        seasons.forEach(([dark, light], i) => {
          const x0 = i * r.W / 4;
          for (let y = r.H * .72; y < r.H; y++) px.rect(g, x0, Math.round(y), r.W / 4 + 1, 1, y < r.H * .8 ? light : dark);
        });
        // the clock tower in the middle, its hands going round
        const cx = Math.round(r.W * .72), cy = Math.round(r.H * .42);
        px.rect(g, cx - 14, cy - 8, 28, 60, '#2a2238');
        px.rect(g, cx - 10, cy - 4, 20, 56, '#3a3050');
        px.disc(g, cx, cy - 8, 12, '#e8dcc0'); px.disc(g, cx, cy - 8, 10, '#fff8e0');
        const ang = t * .6;
        px.line(g, cx, cy - 8, Math.round(cx + Math.cos(ang) * 8), Math.round(cy - 8 + Math.sin(ang) * 8), '#2a2030', 1);
        px.line(g, cx, cy - 8, Math.round(cx + Math.cos(ang * .08) * 5), Math.round(cy - 8 + Math.sin(ang * .08) * 5), '#2a2030', 1);
      });
      r.overlay(g => {
        E.font.title(g, 'BRIGANTIME', r.W / 2 - 60, 16, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a', align: 'center' });
        E.font.text(g, 'THE LEGEND OF FORSEASONS', 40, 52, '#e8e0ff', { shadow: '#000' });
      });
      this.menu.y = Math.round(r.H * .3);
      this.menu.x = 40;
      this.menu.draw(r);
      if (this.touchOnly) {
        r.overlay(g => {
          E.ui.box(g, 30, r.H * .62, r.W - 60, 40, { bg: ['#1c1830', '#0e0b18'], alpha: .92 });
          E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H * .62 + 8, '#fff4c8', { align: 'center', shadow: '#000' });
          E.font.text(g, 'Options and About are still here.', r.W / 2, r.H * .62 + 22, '#cfc6ec', { align: 'center', shadow: '#000' });
        });
      }
      H.promptRow(r, game, [['confirm', 'Select']], 6, r.H - 12);
    }
  };

  // ---- attract: the reel of battles, the AI playing, every hit healed (the reel is for the view, not the balance) ----
  H.attractScene = {
    enter() {
      this.seed = 11; this.wait = 0; this.start();
      this.game.audio.music(H.SONGS.title);
    },
    start() {
      this.sim = reel(this.seed++);
      this.board = new H.Board(this.game, this.sim, {});
      this.board.enter();
      this.aiWait = .6; this.done = false; this.log = [];
      this.board.push([{ type: 'bell', n: this.sim.s.bell, season: this.sim.s.season }]);
    },
    update(dt) {
      const game = this.game, I = game.input;
      if (I.anyPressed() || I.clicked()) { game.go('title'); return; }
      const b = this.board;
      b.update(dt);
      if (this.sim.s.over) {
        if (!this.done) { this.done = true; this.wait = 2.5; }
        this.wait -= dt;
        if (this.wait <= 0) this.start();
        return;
      }
      if (b.busy > 0 || b.queue.length || b.walk) return;
      this.aiWait -= dt;
      if (this.aiWait > 0) return;
      const cmd = H.aiBattle.next(this.sim);
      if (cmd) {
        const ev = this.sim.apply(cmd);
        b.push(ev);
        // the cheat: no unit can fall in the reel, so the view stays full
        for (const u of this.sim.s.units) { if (u.dead) { u.dead = false; u.hp = 1; } }
      }
      this.aiWait = .25;
    },
    draw(r) {
      const b = this.board;
      r.sky(['#101838', '#3a2a60']);
      b.draw(r, { focus: [] });
      r.overlay(g => {
        E.font.title(g, 'BRIGANTIME', r.W / 2, 8, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
        E.font.text(g, 'ATTRACT • PRESS ANY BUTTON', r.W / 2, r.H - 12, '#ffe9a8', { align: 'center', shadow: '#000' });
      });
    }
  };

  // ---- setup: the players (1 to 4 on one device), the realm of the first, and the start ----
  H.setupScene = {
    enter() {
      this.players = 1; this.realmI = Math.max(0, H.PLAYABLE_REALMS.indexOf(ses.human));
      this.menu = new H.List([], { x: 40, y: 70, w: 200, rowH: 14, title: 'New campaign', onPick: (i, it) => this.pick(it.key), onCancel: () => this.game.go('title') });
      this.rebuild();
      this.game.audio.music(H.SONGS.title);
    },
    rebuild() {
      const i = this.menu.i || 0;
      this.menu.set([
        { label: 'Players', sub: this.players > 1 ? this.players + ' hot-seat' : '1', key: 'players' },
        { label: 'Your realm', sub: H.get('realm', H.PLAYABLE_REALMS[this.realmI]).name, key: 'realm' },
        { label: 'Begin', key: 'begin' }], i);
    },
    pick(key) {
      if (key === 'players') { this.players = this.players % 4 + 1; this.rebuild(); }
      if (key === 'realm') { this.realmI = (this.realmI + 1) % H.PLAYABLE_REALMS.length; this.rebuild(); }
      if (key === 'begin') {
        // the first player takes the chosen realm; the others take the next realms round the list
        const first = H.PLAYABLE_REALMS[this.realmI];
        const humans = [first].concat(H.PLAYABLE_REALMS.filter(x => x !== first)).slice(0, this.players);
        ses.human = first;
        this.game.go('campaign', { start: true, humans });
      }
    },
    update() { this.menu.update(this.game); },
    draw(r) {
      r.sky(['#101838', '#2a2050']);
      const id = H.PLAYABLE_REALMS[this.realmI];
      const rl = H.get('realm', id), ruler = H.get('knight', rl.ruler);
      r.overlay(g => {
        E.font.title(g, rl.name.toUpperCase(), r.W / 2 + 60, 14, { scale: 2, colors: ['#fff6c8', rl.accent], outline: '#1a0c10', align: 'center' });
        E.ui.box(g, r.W / 2 - 6, 62, r.W / 2 - 30, r.H - 92, { bg: ['#1c1830', '#0e0b18'], border: rl.color, alpha: .92 });
        E.font.text(g, ruler.name + ', ' + ruler.title, r.W / 2 + 4, 72, '#fff4c8', { shadow: '#000' });
        E.font.text(g, '"' + rl.motto + '"', r.W / 2 + 4, 84, '#cfc6ec', { shadow: '#000' });
        H.say(r, ruler.quote, r.W / 2 + 4, 100, r.W / 2 - 46, '#f0ecff');
        H.say(r, 'Your capital is ' + H.get('castle', rl.capital).name + '. With more than one player, each ruler musters in turn, and the device is passed between them.', r.W / 2 + 4, 136, r.W / 2 - 46, '#cfc6ec');
      });
      this.menu.draw(r);
      H.promptRow(r, this.game, [['confirm', 'Choose'], ['cancel', 'Back']], 6, r.H - 12);
    }
  };

  // ---- skirmish: one battle, a Verdance troop against a Solmark troop, chosen map and season ----
  H.skirmishScene = {
    enter() {
      this.map = 0; this.season = 0; this.hot = false;
      this.menu = new H.List([], { x: 60, y: 90, w: 220, rowH: 14, title: 'Skirmish', onPick: (i, it) => this.pick(it.key), onCancel: () => this.game.go('title') });
      this.rebuild();
      this.game.audio.music(H.SONGS.title);
    },
    rebuild() {
      const maps = H.ids('map');
      this.menu.set([
        { label: 'Ground', sub: H.get('map', maps[this.map]).name, key: 'map' },
        { label: 'Season', sub: H.get('season', H.SEASON_ORDER[this.season]).name, key: 'season' },
        { label: 'Players', sub: this.hot ? '2 hot-seat' : '1 vs CPU', key: 'hot' },
        { label: 'Begin the battle', key: 'begin' }], this.menu.i || 0);
    },
    pick(key) {
      if (key === 'map') { this.map = (this.map + 1) % H.ids('map').length; this.rebuild(); }
      if (key === 'season') { this.season = (this.season + 1) % 4; this.rebuild(); }
      if (key === 'hot') { this.hot = !this.hot; this.rebuild(); }
      if (key === 'begin') {
        const seed = ((Math.random() * 1e6) | 0) + 1;
        const sim = H.BattleSim.create({ map: H.ids('map')[this.map], season: H.SEASON_ORDER[this.season], seed,
          sides: [{ troops: SKIRMISH.player }, { troops: SKIRMISH.foe }] });
        this.game.go('battle', { sim, playerSide: 0, humanSides: this.hot ? [0, 1] : [0], askDelegate: false, onDone: () => this.game.go('skirmish') });
      }
    },
    update() { this.menu.update(this.game); },
    draw(r) {
      r.sky(['#101838', '#2a2050']);
      r.overlay(g => E.font.title(g, 'SKIRMISH', r.W / 2, 22, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      this.menu.draw(r);
      r.overlay(g => {
        const m = H.get('map', H.ids('map')[this.map]);
        E.font.text(g, m.name, r.W / 2 + 60, 110, '#fff4c8', { shadow: '#000' });
        E.font.text(g, 'You hold the west edge: Oren, Bryony, Dunstan.', r.W / 2 + 60, 124, '#cfc6ec', { shadow: '#000' });
        E.font.text(g, 'Tamsin and her Solmark troop hold the keep.', r.W / 2 + 60, 136, '#cfc6ec', { shadow: '#000' });
      });
      H.promptRow(r, this.game, [['confirm', 'Choose'], ['cancel', 'Back']], 6, r.H - 12);
    }
  };

  // ---- help: the pages, with the player's own buttons ----
  H.helpScene = {
    enter() { this.page = 0; this.pages = H.HELP_PAGES; },
    update() {
      const I = this.game.input;
      if (I.pressed('right') || I.pressed('confirm')) this.page = (this.page + 1) % this.pages.length;
      if (I.pressed('left')) this.page = (this.page + this.pages.length - 1) % this.pages.length;
      if (I.pressed('cancel')) this.game.go('title');
    },
    draw(r) {
      const p = this.pages[this.page], game = this.game;
      r.sky(['#101838', '#2a2050']);
      r.overlay(g => E.font.title(g, p.title.toUpperCase(), r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      H.panel(r, 14, 46, r.W - 28, r.H - 80);
      const lines = p.lines(game);
      let y = 54;
      for (const line of lines) { const n = H.say(r, line, 24, y, r.W - 48, '#f0ecff'); y += n * 9 + 5; }
      H.promptRow(r, game, [['left', 'Previous'], ['right', 'Next'], ['cancel', 'Title']], 6, r.H - 12);
      r.overlay(g => E.font.text(g, (this.page + 1) + ' / ' + this.pages.length, r.W - 6, r.H - 11, '#8a84a0', { align: 'right' }));
    }
  };
  H.HELP_PAGES = [
    { title: 'Controls', lines: g => {
      const I = g.input, dev = I.lastDevice || 'keyboard';
      return ['Move the cursor: ' + [I.label('up'), I.label('left'), I.label('down'), I.label('right')].join(' ') + (dev === 'mouse' ? ' or hover' : ''),
        'Choose: ' + I.label('confirm') + '.   Back: ' + I.label('cancel') + '.   End your bell: ' + I.label('endTurn') + '.',
        'Details of a unit: ' + I.label('info') + '.   Pause: ' + I.label('pause') + '.',
        'Buttons show PlayStation symbols; Options turns on Xbox letters.'];
    } },
    { title: 'The season', lines: () => ['Four seasons, each with tidings to read, a muster to make and marches to fight.',
      'The Hour-Candle counts the seasons you have. Let it burn out and the Gray Knight stops the clock.',
      'Win by taking Meridian, the Calendar City, held by the Hourless Dominion.'] },
    { title: 'Muster', lines: () => ['Summon a monster for mana at a castle you hold. One summon per castle each season.',
      'Bind a free monster to a ready knight. A knight\'s bond limits how many it can hold.',
      'Move a knight along a road, send it on a quest, equip it from the treasury, or march it on a castle next door.'] },
    { title: 'Battle', lines: () => ['Battles run bell by bell. Each unit acts once a bell, fastest first.',
      'Move your unit across the hexes, then attack, use its skill or wait. Forest and hill protect; rivers stop you.',
      'Attackers win by a knight on the Keep, or by routing the defenders. Defenders hold until the bells run out.',
      'A monster more than three hexes from every knight of its side is in no one\'s ward: it hits and guards a fifth less.',
      'The target list shows each strike\'s chance to hit and its damage. A fallen commander loses the battle for its side.'] },
    { title: 'Seasons in battle', lines: () => ['Spring floods the ground beside rivers. Summer burns the forests. Autumn gales spoil ranged shots.',
      'Winter freezes the rivers. Each season also favours its own element: Verdant, Solar, Ambered or Rime.',
      'Opposed elements hit harder: Verdant against Ambered, Solar against Rime.'] }
  ];

  // ---- dev mode: the tunables as live sliders, a reset to the defaults, and a few shortcuts ----
  H.devScene = {
    enter() {
      this.menu = new H.List([], { x: 40, y: 30, w: 240, rowH: 12, maxRows: 12, title: 'Dev mode', onPick: (i, it) => this.pick(it.key), onCancel: () => this.game.go('title') });
      this.rebuild();
      this.game.audio.music(H.SONGS.title);
    },
    keys() { return Object.keys(H.TUNE_RANGES); },
    rebuild() {
      const items = this.keys().map(k => ({ label: H.TUNE_LABELS[k], key: k, sub: String(+(H.tune[k].toFixed(2))) }));
      items.push({ label: 'Gallery of monsters', key: 'gallery' });
      items.push({ label: 'Give 10 mana (this campaign)', key: 'mana' });
      items.push({ label: 'Reset to defaults', key: 'reset' });
      items.push({ label: 'Test battle: Border Meadow', key: 'battle' });
      items.push({ label: 'Back', key: 'back' });
      const i = this.menu ? this.menu.i : 0;
      this.menu.set(items, i);
    },
    adjust(d) {
      const k = this.menu.item && this.menu.item.key;
      if (!k || !H.TUNE_RANGES[k]) return;
      const [lo, hi, step] = H.TUNE_RANGES[k];
      H.tune[k] = H.clamp(Math.round((H.tune[k] + d * step) / step) * step, lo, hi);
      E.store.set('brigantime:tune', H.tune);
      this.rebuild();
      H.sfx(this.game, 'cursor');
    },
    pick(key) {
      if (key === 'reset') { H.resetTune(); E.store.set('brigantime:tune', H.tune); this.rebuild(); }
      if (key === 'gallery') this.game.go('gallery');
      if (key === 'mana') { if (H.session.cs) H.session.cs.s.realms[H.session.human].mana += 10; H.sfx(this.game, 'confirm'); }
      if (key === 'battle') {
        const sim = H.BattleSim.create({ map: 'meadow', season: 'spring', seed: 7, sides: [{ troops: SKIRMISH.player }, { troops: SKIRMISH.foe }] });
        this.game.go('battle', { sim, playerSide: 0, onDone: () => this.game.go('dev') });
      }
      if (key === 'back') this.game.go('title');
    },
    update() {
      const I = this.game.input;
      if (I.pressed('left')) this.adjust(-1);
      if (I.pressed('right')) this.adjust(1);
      if (I.repeat('left', .4, .1) && !I.pressed('left')) this.adjust(-1);
      if (I.repeat('right', .4, .1) && !I.pressed('right')) this.adjust(1);
      this.menu.update(this.game);
    },
    draw(r) {
      r.sky(['#101838', '#2a2050']);
      this.menu.x = 40; this.menu.draw(r);
      r.overlay(g => {
        E.font.text(g, 'Left and right change a value. Every change is kept for this browser.', 40, r.H - 26, '#cfc6ec', { shadow: '#000' });
        const k = this.menu.item && this.menu.item.key;
        if (k && H.TUNE_RANGES[k]) {
          const [lo, hi] = H.TUNE_RANGES[k], f = (H.tune[k] - lo) / (hi - lo);
          E.font.text(g, H.TUNE_LABELS[k], 300, 30, '#fff4c8', { shadow: '#000' });
          E.ui.bar(g, 300, 46, 110, 6, H.clamp(f, 0, 1), '#ffd36a');
          E.font.text(g, 'default ' + H.TUNE_DEFAULTS[k], 300, 58, '#8a84a0', { shadow: '#000' });
        }
      });
      H.promptRow(r, this.game, [['left', 'Less'], ['right', 'More'], ['confirm', 'Choose'], ['cancel', 'Title']], 6, r.H - 12);
    }
  };

  // ---- the story: a line at a time, the speaker's babble, the portrait beside it ----
  const portraits = {};
  H.portrait = id => { if (!portraits[id]) { const k = H.get('knight', id); portraits[id] = { rig: H.rigFor({ kind: 'knight', ref: id, knight: true }).rig, pool: H.babble(k.voice.pitch, k.voice.lilt) }; } return portraits[id]; };
  H.eventScene = {
    pausable: false,
    enter(data = {}) {
      this.data = data; this.i = 0; this.talk = new E.Dialog(this.game);
      if (data.event) this.data = Object.assign({}, data, { lines: H.get('event', data.event).lines });
      this.ended = false; this.speaker = null;
      this.game.audio.music(H.SONGS.event);
      this.next();
    },
    // each line opens the dialog; when its box closes, the next line opens
    next() {
      const L = this.data.lines || [];
      if (this.i >= L.length) { this.finish(); return; }
      const line = L[this.i++];
      const who = line.who ? H.get('knight', line.who) : null;
      const pf = line.who ? H.portrait(line.who) : null;
      this.speaker = pf;
      this.lineText = line.text;
      this.profile = line.who ? H.voice.profileFor(line.who) : { base: 170, range: 6, wave: 'pulse', formant: 1, double: 0 };
      // a line with choices offers them on its last page; the choice's effects go to the campaign
      const choices = line.choices ? line.choices.map(c => c.text) : undefined;
      const onChoice = line.choices ? (idx) => { if (ses.cs) ses.cs.applyEffects(line.choices[idx].effects, ses.human); } : undefined;
      this.talk.say(line.text, { name: who ? who.name.toUpperCase() : (line.name || ''), portrait: pf ? pf.rig : undefined, portraitSize: 40, choices, onChoice, onDone: () => this.next() });
    },
    finish() {
      if (this.ended) return;
      this.ended = true;
      const nx = this.data.next;
      if (nx && nx.scene) this.game.go(nx.scene, nx.data || {});
      else this.game.go(this.data.then || 'title');
    },
    update(dt) {
      // the character about to be typed decides the sound it makes (no sound while the box is closed or between lines)
      if (this.talk.open && this.lineText) this.talk.voice = H.voice.letter(this.profile, this.lineText[Math.floor(this.talk.shown || 0)]);
      this.talk.update(dt);
    },
    draw(r) {
      r.sky(this.data.sky || ['#101838', '#3a2a60']);
      this.talk.draw(r);
    }
  };

  // ---- endings: the outcome, what the campaign came to, and the way out ----
  H.endingScene = {
    enter(data = {}) {
      this.outcome = data.outcome || 'ruler';
      this.menu = new H.List([{ label: 'Credits', key: 'about' }, { label: 'Title', key: 'title' }], { x: 150, y: 150, w: 120, rowH: 14, onPick: (i, it) => this.game.go(it.key) });
      this.game.audio.music(H.SONGS.ending);
    },
    update() { this.menu.update(this.game); },
    draw(r) {
      const text = H.ENDINGS[this.outcome] || H.ENDINGS.ruler;
      const won = this.outcome.startsWith('won');
      r.sky(won ? ['#103020', '#2a6a48'] : ['#301010', '#6a2a2a']);
      r.overlay(g => {
        E.font.title(g, text.title, r.W / 2, 22, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
        H.panel(r, 24, 56, r.W - 48, 80);
      });
      H.say(r, text.body, 34, 66, r.W - 68, '#f4f0ff');
      const cs = ses.cs;
      if (cs) H.say(r, 'Seasons played: ' + cs.s.seasonsPlayed + ' • Year ' + cs.s.year + ' • Castles you hold: ' + Object.keys(cs.s.castles).filter(c => cs.s.castles[c].owner === ses.human).length, 34, 146, r.W - 68, '#cfc6ec');
      this.menu.draw(r);
      H.promptRow(r, this.game, [['confirm', 'Choose']], 6, r.H - 12);
    }
  };

  // ---- about and credits: the text the game was made with, scrolling ----
  H.aboutScene = {
    enter() { this.y = 0; this.game.audio.music(H.SONGS.title); },
    update(dt) {
      const I = this.game.input;
      if (I.down('down')) this.y += 90 * dt;
      if (I.down('up')) this.y -= 90 * dt;
      if (I.pressed('cancel') || I.pressed('confirm')) this.game.go('title');
      this.y = Math.max(0, this.y);
    },
    draw(r) {
      r.sky(['#101838', '#2a2050']);
      let y = 12 - this.y;
      r.overlay(g => E.font.title(g, 'ABOUT AND CREDITS', r.W / 2, 4, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      y += 26;
      for (const sec of H.ABOUT) {
        r.overlay(g => E.font.text(g, sec.heading.toUpperCase(), 14, y, '#ffd36a', { shadow: '#000' }));
        y += 11;
        for (const line of sec.lines) { const n = E.font.wrap(line, r.W - 36).length; H.say(r, line, 18, y, r.W - 36, '#f0ecff'); y += n * 9 + 4; }
        y += 6;
      }
      this.maxY = y;
      H.promptRow(r, this.game, [['up', 'Scroll'], ['cancel', 'Title']], 6, r.H - 12);
    }
  };
})();

// ---- src/64-hub.js ----
// The AI Hub round, shared-world (protocol v1). One battle for every player. The host's copy runs the world: it applies
// every command, and after each one it sends the whole battle state to the other copies, which show what the host sends.
// Each player commands their own troop: player 0 and the others with the same parity share a side, and a side nobody
// plays is run by the host's planner. A player who is away for too long is played by the host. The seed comes from the
// hub, so every copy starts from the same battle. When the battle ends, the host reports the standings.
(() => {
  const H = G;

  // the troops the players command, by player id (id mod 4). The first knight of a troop is its commander.
  H.HUB_TROOPS = [
    [{ kind: 'knight', ref: 'oren', leader: true, items: ['sun-rune'] }, { kind: 'knight', ref: 'bryony' }, { kind: 'monster', ref: 'gleam-slime', form: 0 }, { kind: 'monster', ref: 'thorn-hare', form: 0 }],
    [{ kind: 'knight', ref: 'shade', leader: true }, { kind: 'knight', ref: 'ashen' }, { kind: 'monster', ref: 'dusk-bat', form: 0 }, { kind: 'monster', ref: 'cinder-imp', form: 0 }],
    [{ kind: 'knight', ref: 'tamsin', leader: true }, { kind: 'knight', ref: 'ferrin' }, { kind: 'monster', ref: 'storm-pixie', form: 0 }, { kind: 'monster', ref: 'frost-wisp', form: 0 }],
    [{ kind: 'knight', ref: 'hale', leader: true }, { kind: 'knight', ref: 'brannoc' }, { kind: 'monster', ref: 'bonewalker', form: 0 }, { kind: 'monster', ref: 'stone-golem', form: 0 }]
  ];

  H.hubRound = {
    game: null, info: null, sim: null, setup: null,
    // the battle for this round, from the hub's seed: the ground and the season, and the dice
    pick(info) {
      const seed = (info && typeof info.seed === 'number') ? info.seed : 1;
      const maps = H.MAP_POOL, rng = new H.Rng(seed);
      return { map: maps[rng.int(0, maps.length - 1)], season: H.SEASON_ORDER[rng.int(0, 3)], seed: (seed >>> 0) || 1 };
    },
    // the sides: each player's troop goes to side (id mod 2); a side with no player gets a planner-run troop
    build(info) {
      const s = this.pick(info), sides = [{ troops: [] }, { troops: [] }], players = info.players || [];
      const first = { 0: null, 1: null };
      for (const p of players.slice().sort((a, b) => a.id - b.id)) { const side = p.id % 2; if (first[side] === null) first[side] = p.id; }
      for (const p of players) {
        const side = p.id % 2;
        for (const t of H.HUB_TROOPS[p.id % 4]) sides[side].troops.push(Object.assign({}, t, { owner: p.id, leader: !!t.leader && first[side] === p.id }));
      }
      for (const side of [0, 1]) if (first[side] === null) sides[side].troops = H.HUB_TROOPS[side + 2].map(t => Object.assign({}, t, { owner: null }));
      this.setup = s;
      return H.BattleSim.create({ map: s.map, season: s.season, seed: s.seed, sides });
    },
    start(info, game) {
      H.resetTune();
      this.info = info; this.game = game; this.reported = false; this.ended = false;
      this.sim = this.build(info);
      const me = info.me, isHost = !!info.isHost;
      game.go('hubBattle', { sim: this.sim, me, isHost, info, onDone: () => this.report() });
    },
    // the standings: the players ranked by what their troop has left and the experience it earned
    standings(sim, info) {
      const score = {};
      for (const p of info.players || []) score[p.id] = 0;
      for (const u of sim.s.units) if (u.owner !== null && u.owner !== undefined) score[u.owner] = (score[u.owner] || 0) + Math.max(0, u.hp) + u.xp * 2;
      const winner = sim.s.winner, won = (p) => (p.id % 2 === winner ? 1 : 0);
      const order = (info.players || []).slice().sort((a, b) => (won(b) - won(a)) || (score[b.id] - score[a.id]) || (a.id - b.id));
      return { standings: order.map(p => [p.id]), scores: score };
    },
    // the battle is over on this copy: the host reports the round; every copy then waits for the hub's end
    report() {
      if (this.reported || !this.sim) return;
      this.reported = true;
      const isHost = !!(this.info && this.info.isHost && window.AIHub && AIHub.active);
      if (isHost && this.sim.s.over) AIHub.finish(this.standings(this.sim, this.info));
      this.result = { winner: this.sim.s.winner, reason: this.sim.s.reason, won: this.sim.s.winner === (this.info.me % 2) };
      this.game.go('hubWait');
    },
    // the hub called time: the host ends the battle where it stands, by the hit points left
    timeUp() {
      const sc = this.game && this.game.scene;
      if (!sc || sc !== H.hubBattleScene || !this.sim || this.sim.s.over) return;
      const side = [0, 1].map(k => this.sim.alive(k).reduce((n, u) => n + u.hp, 0));
      this.sim.s.over = true; this.sim.s.winner = side[0] >= side[1] ? 0 : 1; this.sim.s.reason = 'time';
      AIHub.send({ k: 'state', s: this.sim.s, ev: [{ type: 'over', winner: this.sim.s.winner, reason: 'time' }] });
      this.report();
    },
    // a message from another copy: the host takes a player's command; any copy takes the host's state
    message(data, from) {
      const sc = this.game && this.game.scene;
      if (!sc || sc !== H.hubBattleScene || !data) return;
      if (data.k === 'cmd' && sc.isHost) {
        const u = sc.sim.current();
        if (u && u.owner === from) sc.apply(data.cmd);
        else AIHub.send({ k: 'state', s: sc.sim.s, ev: [] });
      }
      if (data.k === 'state' && !sc.isHost && from === this.info.host) {
        sc.sim.s = data.s;
        sc.board.push(data.ev || []);
      }
    },
    // a player left: the host's planner plays their troop from now on
    left(id) {
      const sc = this.game && this.game.scene;
      if (!sc || sc !== H.hubBattleScene || !sc.isHost) return;
      for (const u of this.sim.s.units) if (u.owner === id) u.owner = null;
      AIHub.send({ k: 'state', s: this.sim.s, ev: [] });
    }
  };

  // the battle scene for a hub round: the copy's own player's turns are its input; the host applies and broadcasts
  H.hubBattleScene = Object.assign({}, H.battleScene, {
    enter(o) {
      H.battleScene.enter.call(this, o);
      this.me = o.me; this.isHost = o.isHost; this.waitT = 0; this.waitUid = null;
      this.mySide = o.me % 2;
    },
    local(u) { return this.me !== null && this.me !== undefined && u.owner === this.me; },
    // a turn that is another player's: the host waits for their command, then plays it itself if they stay away
    remoteTurn(u, dt) {
      if (!this.isHost) return false;
      if (u.owner === null || u.owner === undefined) return true;
      if (this.waitUid !== u.uid) { this.waitUid = u.uid; this.waitT = 0; }
      this.waitT += dt;
      if (this.waitT > 25) { this.waitT = 0; return true; }
      return false;
    },
    // the host applies a command and sends the state to the others; a copy that is not the host sends its command
    apply(cmd) {
      if (!this.isHost) { AIHub.send({ k: 'cmd', cmd }); return []; }
      const ev = H.battleScene.apply.call(this, cmd);
      AIHub.send({ k: 'state', s: this.sim.s, ev });
      return ev;
    },
    // every copy that is not the host says it is here, once a second: the host knows who is still playing
    update(dt) {
      // once a second: a player's copy says it is here; the host sends the battle's state to everyone
      this.hbT = (this.hbT || 0) - dt;
      if (this.hbT <= 0 && !this.doneCalled && this.sim) {
        this.hbT = 1;
        if (this.isHost) AIHub.send({ k: 'state', s: this.sim.s, ev: [] });
        else AIHub.send({ k: 'here', me: this.me });
      }
      H.battleScene.update.call(this, dt);
    },
    finish() {
      if (this.doneCalled || this.board.queue.length || this.board.busy > 0) return;
      this.doneCalled = true;
      if (this.o.onDone) this.o.onDone(this.sim, { won: this.sim.s.winner === this.mySide, playerSide: this.mySide });
    },
    draw(r) { H.battleScene.draw.call(this, r); }
  });

  // the waiting and the result, as the round goes on
  H.hubWaitScene = {
    enter() { this.game.audio.music(H.SONGS.title); this.t = 0; },
    update(dt) { this.t += dt; },
    draw(r) {
      const res = H.hubRound.result, live = H.hubRound.reported, ended = H.hubRound.ended;
      r.sky(['#101838', '#2a2050']);
      r.overlay(g => E.font.title(g, 'BRIGANTIME', r.W / 2, 26, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      const dots = '.'.repeat(1 + (Math.floor(this.t * 2) % 3));
      H.panel(r, 40, 70, r.W - 80, 90);
      const lines = !res
        ? ['Waiting for the round to start' + dots, 'One battle for every player. Each player commands their own troop.']
        : [(res.won ? 'Your side won the field.' : 'Your side lost the field.'), 'The host has the standings.', live || !ended ? 'Waiting for the round to end.' : 'The round is over.'];
      lines.forEach((t, i) => H.say(r, t, 52, 80 + i * 18, r.W - 104, i === 0 ? '#fff4c8' : '#f0ecff'));
    }
  };
})();

// ---- src/65-gallery.js ----
// The gallery (dev mode, §10.3): every monster species in its three forms, drawn with its own rig, to look at and to check.
// Left and right move through the species; up and down move through the forms; Escape goes back to dev mode.
(() => {
  const H = G;
  H.galleryScene = {
    enter() { this.i = 0; this.form = 0; this.t = 0; this.rig = null; this.load(); this.game.audio.music(H.SONGS.title); },
    load() {
      const id = H.ids('species')[this.i];
      this.id = id;
      this.rig = H.rigFor({ kind: 'monster', ref: id, form: this.form, species: id });
    },
    update(dt) {
      const I = this.game.input;
      this.t += dt;
      this.game.focus(0, 0, 0);   // the overhead view's origin is the middle of the screen
      if (I.pressed('right') || I.pressed('left')) { const n = H.ids('species').length; this.i = (this.i + (I.pressed('right') ? 1 : n - 1)) % n; this.form = 0; this.load(); }
      if (I.pressed('down') || I.pressed('up')) { this.form = (this.form + (I.pressed('down') ? 1 : 2)) % 3; this.load(); }
      if (I.pressed('cancel')) this.game.go('dev');
      this.rig.rig.update(dt, { x: 0, y: 0, z: 0, vx: 8, vy: 0, facing: 0, walk: 1, flap: 1, stance: 'ready' });
    },
    draw(r) {
      const sp = H.get('species', this.id), f = sp.forms[this.form];
      r.sky(['#101838', '#2a2050']);
      r.actor(0, 0, 0, (g, ox, oy) => this.rig.rig.draw(g, ox, oy, r.view));
      r.overlay(g => {
        E.font.title(g, sp.name.toUpperCase(), r.W / 2, 8, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
        E.font.text(g, f.name + '  •  form ' + (this.form + 1) + ' of 3', r.W / 2, 34, '#e8e0ff', { align: 'center', shadow: '#000' });
        E.font.text(g, H.get('element', sp.element).name + '  •  HP ' + f.hp + '  ATK ' + f.atk + '  DEF ' + f.def + '  MOV ' + f.mov + '  RNG ' + f.rng + '  size ' + f.size, r.W / 2, r.H - 42, '#cfc6ec', { align: 'center', shadow: '#000' });
        E.font.text(g, 'Skill: ' + (f.skill ? H.get('skill', f.skill).name : 'none'), r.W / 2, r.H - 30, '#ffe9a8', { align: 'center', shadow: '#000' });
      });
      H.promptRow(r, this.game, [['left', 'Species'], ['up', 'Form'], ['cancel', 'Back']], 6, r.H - 12);
    }
  };
})();

// ---- src/90-main.js ----
// The entry: the game is built here. It sets the tunables (the hub always uses the defaults), the input map, the pause
// menu (dev mode and how to play are left out of a hub round), the settings (button symbols), the save slots, the scenes,
// the AI Hub connection, and the debug handle that the tests and the tools read.
(() => {
  const H = G;
  const hub = typeof AIHub !== 'undefined' && !!AIHub.active;
  if (hub) H.resetTune();
  else {
    const saved = E.store.get('brigantime:tune', null);
    if (saved) for (const k of Object.keys(H.TUNE_DEFAULTS)) if (typeof saved[k] === 'number') H.tune[k] = saved[k];
  }

  const menuItems = hub ? [] : [['How to play', () => game.go('help')], ['Dev mode', () => game.go('dev')]];
  const game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, view: 'overhead', input: H.STRATEGY_INPUT, bg: '#07060d',
    menu: { items: menuItems, quit: hub ? false : 'title', saves: { slots: 3, version: 1 } }
  });
  game.settings.define({ key: 'buttons', label: 'Button symbols', type: 'select', group: 'Game', value: 'playstation',
    options: [['playstation', 'PlayStation'], ['xbox', 'Xbox (A B X Y)']],
    apply(g, v) { g.input.glyphs = v; } });
  game.input.glyphs = game.settings.buttons || 'playstation';
  game.input.touchEnabled = false;
  H.defineSounds(game);
  H.defineNamedSounds(game);

  // the saves: a campaign at its muster is what a slot holds
  game.saves.write = () => {
    const cs = H.session.cs;
    if (!cs) return null;
    return { data: cs.serialize(), place: H.get('season', cs.season).name + ' ' + cs.s.year, level: 'Candle ' + cs.s.candle };
  };
  game.saves.read = save => {
    if (!save || !save.data) return;
    H.session.cs = H.CampaignSim.load(save.data);
    H.session.human = H.session.cs.s.humans[0];
    game.go('campaign', {});
  };

  // the AI Hub: the round starts when the hub says so; the host's copy runs the shared battle and every copy plays its own troop
  if (hub) {
    AIHub.connect({ mode: 'shared-world', seats: [1, 4] }).then(info => {
      if (!info) return;
      H.session.hub = info;
      AIHub.on('start', () => { H.hubRound.start(info, game); });
      AIHub.on('message', (data, from) => H.hubRound.message(data, from));
      AIHub.on('leave', ({ id }) => H.hubRound.left(id));
      AIHub.on('time-up', () => H.hubRound.timeUp());
      AIHub.on('end', () => { H.hubRound.ended = true; });
      AIHub.ready();
    });
  }

  const scenes = {
    title: H.titleScene, attract: H.attractScene, setup: H.setupScene, skirmish: H.skirmishScene,
    campaign: H.campaignScene, battle: H.battleScene, event: H.eventScene, ending: H.endingScene,
    about: H.aboutScene, help: H.helpScene, dev: H.devScene, hubWait: H.hubWaitScene, hubBattle: H.hubBattleScene, gallery: H.galleryScene
  };
  for (const sc of Object.values(scenes)) sc.game = game;   // each scene reaches the game through this
  H.session.touchOnly = H.touchOnly(game);

  // the debug handle: what tests and tools read and drive (the same state the screens show)
  const sceneBattle = () => (game.sceneName === 'battle' ? game.scene : null);
  game.debug = {
    snapshot: () => {
      const cs = H.session.cs, b = sceneBattle(), sim = b ? b.sim : null;
      return {
        scene: game.sceneName, phase: cs ? cs.s.phase : null, screen: game.scene && game.scene.phase ? game.scene.phase : null, season: cs ? H.SEASON_ORDER[cs.s.season] : null,
        year: cs ? cs.s.year : null, candle: cs ? cs.s.candle : null, realm: H.session.human, mana: cs ? cs.s.realms[H.session.human].mana : null,
        ended: cs ? cs.s.ended : null,
        battle: sim ? { map: sim.s.map, bell: sim.s.bell, mode: b.mode, cursor: b.cursor, over: sim.s.over, winner: sim.s.winner,
          units: sim.s.units.map(u => [u.uid, u.side, u.name, u.q, u.r, u.hp, u.maxHp, u.dead ? 1 : 0]) } : null,
        touchOnly: !!H.session.touchOnly, tune: Object.assign({}, H.tune), errors: game.errors.length
      };
    },
    // a campaign for the tests: { humans, seed }
    newCampaign: (o = {}) => { H.session.cs = H.CampaignSim.create({ humans: o.humans || ['verdance'], seed: o.seed || 1 }); H.session.human = (o.humans || ['verdance'])[0]; return H.session.cs.hash(); },
    campaign: () => H.session.cs,
    // a battle for the tests: the spec for BattleSim.create (map, season, seed, sides)
    startBattle: (spec) => { const sim = H.BattleSim.create(spec); game.go('battle', { sim, playerSide: spec.playerSide ?? 0, onDone: () => game.go('title') }); return sim.hash(); },
    sim: () => (sceneBattle() ? game.scene.sim : null),
    autoplayBattle: (sim, limit) => H.autoplayBattle(sim, limit || 5000),
    setTune: (k, v) => { H.tune[k] = v; },
    resetTune: () => H.resetTune(),
    hash: () => (H.session.cs ? H.session.cs.hash() : null),
    // one step of an automated player, through the real scenes: a playthrough calls it until the campaign ends.
    // The human realm musters with the planner, battles are delegated, and every screen's own method moves it on.
    autopilotStep: () => {
      const cs = H.session.cs, sc = game.scene, name = game.sceneName;
      if (name === 'title') return 'title';
      if (name === 'campaign' && cs) {
        if (cs.s.ended) return 'ended';
        if (sc.phase === 'tidings') { sc.afterTidings(); return 'tidings'; }
        if (sc.phase === 'pass') { sc.phase = 'muster'; sc.enterPhase(); return 'pass'; }
        if (sc.phase === 'aftermath') { sc.phase = 'tidings'; sc.enterPhase(); return 'aftermath'; }
        if (sc.phase === 'muster' && cs.s.phase !== 'muster') return 'marching';
        if (sc.phase === 'muster') {
          // every ruler of the campaign musters in turn, with the planner, then the marches resolve
          // the automated player builds its realm and keeps its knights at home (marches are the player's choice)
          const aggression = H.tune.rivalAggression;
          H.tune.rivalAggression = 0;
          try { for (const realm of cs.s.humans) H.aiCampaign.muster(cs, realm); } finally { H.tune.rivalAggression = aggression; }
          sc.endMuster();
          return 'muster';
        }
        return sc.phase;
      }
      if (name === 'event' && sc.finish) { sc.finish(); return 'event'; }
      if (name === 'battle' && sc.delegate) { if (!sc.doneCalled) sc.delegate(); return 'battle'; }
      if (name === 'ending') return 'ending';
      return name;
    }
  };
  H.Brigantime = H;
  game.start({ scenes, scene: hub ? 'hubWait' : 'title' });
  if (!hub) game.saves.canSave = false;
})();

})();
