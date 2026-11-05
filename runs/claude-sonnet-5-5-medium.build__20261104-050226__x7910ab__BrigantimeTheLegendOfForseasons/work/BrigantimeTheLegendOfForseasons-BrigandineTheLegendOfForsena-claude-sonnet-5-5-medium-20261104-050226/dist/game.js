(() => {
'use strict';
const E = My3D2dge, G = {};

/* ===== 00-core.js ===== */
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


/* ===== 01-data.js ===== */
/* ---- DATA: every content item is registered once, then read with G.get / G.all ---- */
G.opposite = el => el > 3 ? -1 : (el + 2) % 4;
G.SIZES = { S: 0, M: 1, L: 2 };
G.sizeHit = (a, d) => { const x = G.SIZES[a] - G.SIZES[d]; return x >= 2 ? -.3 : x === 1 ? -.12 : x === -1 ? .05 : x <= -2 ? .1 : 0; };

/* monsters: id, three form names, element, size, kind, hp, atk, def, int, spd, mov, range, bond, cost, body, fly */
const MONS = [
  ['wolf', ['Thornpup', 'Thornwolf', 'Briarfenrir'], 0, 'M', 'melee', 34, 10, 6, 2, 8, 5, 1, 1, 18, 'quad', 0, '#4a8a3a'],
  ['pixie', ['Budsprite', 'Petalfae', 'Blossom Queen'], 0, 'S', 'magic', 22, 3, 3, 11, 9, 4, 2, 1, 20, 'fly', 1, '#f0a0c8'],
  ['salam', ['Embermite', 'Salamander', 'Pyredrake'], 1, 'M', 'ranged', 30, 9, 5, 6, 7, 4, 3, 2, 24, 'quad', 0, '#e8502a'],
  ['hawk', ['Sunkite', 'Solhawk', 'Phoenix Hawk'], 1, 'S', 'melee', 26, 10, 4, 2, 10, 6, 1, 1, 20, 'fly', 1, '#f0b030'],
  ['golem', ['Strawgolem', 'Harvest Golem', 'Granite Colossus'], 2, 'L', 'melee', 48, 11, 10, 1, 3, 3, 1, 2, 26, 'brute', 0, '#b08a40'],
  ['raven', ['Gleanraven', 'Harrowcrow', 'Dusk Roc'], 2, 'S', 'melee', 24, 9, 4, 3, 9, 6, 1, 1, 18, 'fly', 1, '#4a3a58'],
  ['yeti', ['Snowling', 'Yeti', 'Glacier Troll'], 3, 'L', 'melee', 46, 12, 8, 1, 4, 3, 1, 2, 26, 'brute', 0, '#d8e8f4'],
  ['wisp', ['Frostmote', 'Rime Wisp', 'Blizzard Djinn'], 3, 'S', 'magic', 22, 3, 3, 11, 8, 4, 3, 2, 24, 'wisp', 1, '#8ad0f8'],
  ['imp', ['Cogling', 'Gear Fiend', 'Clockwork Titan'], 4, 'M', 'melee', 32, 10, 8, 2, 6, 4, 1, 1, 22, 'imp', 0, '#a8a0b8'],
  ['wraith', ['Sandshade', 'Hourwraith', 'Chronolich'], 4, 'M', 'magic', 28, 4, 4, 12, 7, 4, 3, 2, 30, 'wisp', 1, '#b890e0'],
  ['bone', ['Bonepup', 'Skeleton', 'Grave Knight'], 4, 'M', 'melee', 30, 10, 7, 2, 6, 4, 1, 1, 20, 'imp', 0, '#e0dcc8'],
  ['slime', ['Dewblob', 'Slime', 'Gelatinous King'], 2, 'M', 'ranged', 36, 7, 7, 4, 5, 3, 2, 1, 16, 'blob', 0, '#78c860']
];
for (const m of MONS) G.def('monster', m[0], { id: m[0], names: m[1], el: m[2], size: m[3], kind: m[4], hp: m[5], atk: m[6], def: m[7], int: m[8], spd: m[9], mov: m[10], range: m[11], bond: m[12], cost: m[13], body: m[14], fly: !!m[15], col: m[16],
  rangeSpec: m[4] === 'melee' ? [1, 1] : m[4] === 'ranged' ? [2, 3] : [2, 3] });
G.TIERMUL = [1, 1.45, 2.0];
G.monStats = (spec, form, lvl) => {
  const t = G.TIERMUL[form], g = 1 + (lvl - 1) * .07 + 0, hm = G.tune.hpMul;
  return { hp: Math.round(spec.hp * t * g * hm), atk: Math.round(spec.atk * t * g), def: Math.round(spec.def * t * g * (spec.passive === 'guard' ? 1.1 : 1)), int: Math.round(spec.int * t * g), spd: spec.spd, mov: spec.mov + (spec.passive === 'swift' ? 1 : 0), range: spec.rangeSpec, bond: spec.bond + (form >= 2 ? 0 : 0) };
};

/* knight classes: five lines of three tiers */
const LINES = [
  { id: 'warrior', names: ['Squire', 'Knight', 'Paladin'], hp: 44, atk: 12, def: 8, int: 3, spd: 6, mov: 4, mp: 10, bond: 6, range: [1, 1], skills: ['cleave', 'rally'], weapons: ['sword', 'spear'], hair: 'short' },
  { id: 'ranger', names: ['Scout', 'Ranger', 'Warden'], hp: 36, atk: 11, def: 5, int: 4, spd: 8, mov: 5, mp: 12, bond: 5, range: [2, 4], skills: ['volley', 'snare'], weapons: ['bow'], hair: 'ponytail' },
  { id: 'mage', names: ['Adept', 'Mage', 'Archmage'], hp: 28, atk: 4, def: 3, int: 13, spd: 6, mov: 3, mp: 24, bond: 5, range: [2, 3], skills: ['bolt', 'hex'], weapons: ['staff', 'tome'], hair: 'long' },
  { id: 'cleric', names: ['Acolyte', 'Cleric', 'Hierophant'], hp: 32, atk: 5, def: 5, int: 11, spd: 6, mov: 4, mp: 24, bond: 6, range: [1, 2], skills: ['mend', 'ward'], weapons: ['staff', 'mace'], hair: 'ponytail' },
  { id: 'beast', names: ['Tamer', 'Beastmaster', 'Wildlord'], hp: 38, atk: 10, def: 6, int: 5, spd: 7, mov: 4, mp: 14, bond: 7, range: [1, 1], skills: ['roar', 'surge'], weapons: ['whip', 'spear'], hair: 'spiky' }
];
LINES.forEach((l, i) => { l.i = i; G.def('line', l.id, l); });
G.LINES = LINES;
G.knightStats = (k) => {
  const L = LINES[k.line], t = G.TIERMUL[k.tier], g = 1 + (k.lvl - 1) * .08, eq = k.equip || {}, it = id => (id && G.get('item', id)) || {};
  const sum = k2 => ['w', 'a', 'c'].reduce((a, sl) => a + ((it(eq[sl])[k2]) || 0), 0);
  return { hp: Math.round(L.hp * t * g * G.tune.hpMul) + sum('hp'), atk: Math.round(L.atk * t * g) + sum('atk'), def: Math.round(L.def * t * g) + sum('def'), int: Math.round(L.int * t * g) + sum('int'),
    spd: L.spd, mov: L.mov + sum('mov'), mp: Math.round(L.mp * (1 + (k.lvl - 1) * .05)), bond: L.bond + Math.floor(k.lvl / 4) + sum('bond'), range: L.range };
};

/* skills: kind dmg | aoe | heal | buff | debuff | root | daze | surge. range [min,max]; mp; mobile = usable after moving */
const SK = [
  ['cleave', 'Cleave', 'aoe', [0, 0], 4, 1.0, 'Strikes every foe next to you.', 'self', 1, false],
  ['rally', 'Rally', 'buff', [0, 0], 5, 0, 'Your troop strikes harder for 3 bells.', 'troop', 0, false, 'atkUp'],
  ['volley', 'Volley', 'aoe', [2, 4], 5, .85, 'A rain of arrows on a target and its neighbours.', 'hex', 1, true],
  ['snare', 'Snare', 'root', [2, 4], 3, .4, 'Roots a foe for 2 bells.', 'foe', 0, false],
  ['bolt', 'Seasonbolt', 'aoe', [2, 3], 5, 1.5, 'Magic of your season, bursting around the target.', 'hex', 1, false],
  ['hex', 'Hex', 'debuff', [2, 3], 4, 0, 'A foe\'s guard falls for 3 bells.', 'foe', 0, false, 'defDown'],
  ['mend', 'Mend', 'heal', [0, 3], 4, 2.2, 'Heals an ally.', 'ally', 0, false],
  ['ward', 'Ward Song', 'buff', [0, 0], 5, 0, 'Your troop guards better for 3 bells.', 'troop', 0, false, 'defUp'],
  ['roar', 'Roar', 'daze', [0, 0], 5, 0, 'Foes next to you lose their next action.', 'self', 1, false],
  ['surge', 'Bond Surge', 'buff', [0, 0], 4, 0, 'Your monsters strike harder and move faster for 3 bells.', 'monsters', 0, false, 'atkUp']
];
for (const s of SK) G.def('skill', s[0], { id: s[0], name: s[1], kind: s[2], range: s[3], mp: s[4], power: s[5], text: s[6], target: s[7], radius: s[8], mobile: s[9], fx: s[10] });
G.EFFECTS = { atkUp: { name: 'Might', col: '#f0a040' }, defUp: { name: 'Guard', col: '#60a0f0' }, defDown: { name: 'Hexed', col: '#b060d0' }, root: { name: 'Rooted', col: '#60c060' }, daze: { name: 'Dazed', col: '#e0e060' } };

/* items */
const IT = [
  ['potion', 'Healing Draught', 'use', 'Heals 30 HP.', { heal: 30 }], ['ether', 'Moonwater Vial', 'use', 'Restores 12 MP to a knight.', { mp: 12 }],
  ['seed', 'Season Seed', 'seed', 'Lets a monster promote early.', {}], ['writ', 'Writ of Knighthood', 'writ', 'Lets a knight take the third class.', {}],
  ['blade', 'Ashen Blade', 'w', '+4 attack.', { atk: 4 }], ['shield', 'Oakheart Shield', 'a', '+4 defence.', { def: 4 }],
  ['charm', 'Bond Charm', 'c', '+1 bond.', { bond: 1 }], ['boots', 'Swiftboots', 'c', '+1 movement.', { mov: 1 }]
];
for (const i of IT) G.def('item', i[0], Object.assign({ id: i[0], name: i[1], slot: i[2], text: i[3] }, i[4]));
G.ITEM_IDS = IT.map(i => i[0]);

/* realms */
G.REALMS = [
  { id: 0, name: 'Verdance', season: 0, col: '#5ec26a', dark: '#2a6a34', cap: 1, ruler: 'elaine', motto: 'What is sown is kept.', blurb: 'The blossom realm. Its wolves and fae grow bold in spring.' },
  { id: 1, name: 'Solmark', season: 1, col: '#f0643a', dark: '#9a2a18', cap: 4, ruler: 'gawain', motto: 'Noon is a promise.', blurb: 'The sun realm. Its salamanders and hawks burn brightest in summer.' },
  { id: 2, name: 'Amberlyn', season: 2, col: '#e0a030', dark: '#8a5a14', cap: 7, ruler: 'ragnell', motto: 'Reap with honest hands.', blurb: 'The harvest realm. Golems and ravens, patient and many.' },
  { id: 3, name: 'Hoarfast', season: 3, col: '#6ab8f0', dark: '#2a5a8a', cap: 10, ruler: 'nimue', motto: 'The cold remembers.', blurb: 'The winter realm. Yeti and rime-wisps, slow to wake and slower to forgive.' },
  { id: 4, name: 'The Hourless Dominion', short: 'Dominion', season: 4, col: '#a89ad8', dark: '#4a3a78', cap: 0, ruler: 'vesper', motto: 'Stay. Stay. Stay.', blurb: 'The usurpers of Meridian. They would stop the Clock and call it peace.' },
  { id: 5, name: 'Brigands', short: 'Brigands', season: 5, col: '#8a8470', dark: '#44402e', cap: 15, ruler: 'maelgwn', motto: 'Nobody checks the road.', blurb: 'Outlaws who have found that a stopped clock is a quiet time for robbing.' }
];

/* knights: id, name, realm, line, level, look, voice pitch, role text */
const KN = [
  ['elaine', 'Elaine of the Lilies', 0, 3, 6, 'ruler', 1.35, 'Young, grave, quick to forgive. She hums when she is afraid.'],
  ['percival', 'Percival', 0, 0, 4, '', 1.0, 'A farm-boy who never quite stopped being one.'],
  ['bors', 'Bors the Steady', 0, 4, 4, '', .8, 'Keeps a wolf under every bed.'],
  ['gawain', 'Gawain Noonblade', 1, 0, 6, 'ruler', .7, 'Strong until noon, merely adequate afterwards, and honest about both.'],
  ['lamorak', 'Lamorak', 1, 2, 4, '', 1.1, 'Burns the toast and the enemy, in that order.'],
  ['dagonet', 'Dagonet the Wry', 1, 1, 4, '', 1.5, 'A jester with a longbow. Nobody laughs twice.'],
  ['ragnell', 'Dame Ragnell', 2, 4, 6, 'ruler', .6, 'Once cursed to be hideous for half of every year. She has views on appearances.'],
  ['kay', 'Sir Kay', 2, 0, 4, '', .85, 'Complains. Wins. Complains about winning.'],
  ['tristan', 'Tristan of the Reeds', 2, 1, 4, '', 1.15, 'Sings to his bowstring. It sometimes answers.'],
  ['nimue', 'Nimue of the Mere', 3, 2, 6, 'ruler', 1.25, 'Speaks softly, which makes everyone lean in.'],
  ['bedivere', 'Bedivere Oneglove', 3, 0, 4, '', .75, 'Keeps returning things to the water. Mostly swords.'],
  ['palamedes', 'Palamedes', 3, 3, 4, '', .95, 'A healer who has seen every kind of frostbite and named them.'],
  ['vesper', 'Warden Vesper', 4, 2, 8, 'ruler', 1.05, 'Soft-spoken keeper of Meridian. Every clock in the city has been stopped at his word.'],
  ['tarry', 'Sir Tarry', 4, 0, 6, '', .7, 'Always about to leave. Never does.'],
  ['lull', 'Dame Lull', 4, 3, 6, '', 1.3, 'Her lullabies are lovely and entirely sincere.'],
  ['gray', 'The Gray Knight', 4, 0, 11, 'boss', .5, 'No one has seen his face. No one remembers what the last year was.'],
  ['galahad', 'Galahad Unlooked-for', 5, 0, 7, 'free', .9, 'Wanders. Arrives exactly when it is least convenient.'],
  ['lunette', 'Lunette', 5, 2, 5, 'free', 1.4, 'Keeps a spare season in her pocket, for emergencies.'],
  ['ywain', 'Ywain the Lion\'s Friend', 5, 4, 5, 'free', .95, 'His lion has more sense than he does, and says so.'],
  ['maelgwn', 'Maelgwn Cutpurse', 5, 0, 6, 'brigand', .65, 'Charges a toll for crossing time itself.'],
  ['wick', 'Wick the Rook', 5, 1, 5, 'brigand', 1.2, 'Never misses what is not nailed down.']
];
G.KNIGHTS = {};
for (const k of KN) G.KNIGHTS[k[0]] = { id: k[0], name: k[1], short: k[1].split(' ')[0], realm: k[2], line: k[3], lvl: k[4], role: k[5], voice: k[6], blurb: k[7] };
G.RULERS = { 0: 'elaine', 1: 'gawain', 2: 'ragnell', 3: 'nimue', 4: 'vesper', 5: 'maelgwn' };

/* castles: id, name, x, y, region, tier, circle */
const CS = [
  [0, 'Meridian, the Calendar City', .50, .50, 4, 3, ['imp', 'wraith', 'bone'], 'sanctum'],
  [1, 'Verdance Hold', .14, .18, 0, 2, ['wolf', 'pixie', 'slime'], 'forest'],
  [2, 'Budwick', .33, .30, 0, 1, ['wolf', 'pixie'], 'meadow'],
  [3, 'Floodmere', .10, .42, 0, 1, ['pixie', 'slime'], 'river'],
  [4, 'Solmark Keep', .86, .18, 1, 2, ['salam', 'hawk'], 'ruins'],
  [5, 'Emberford', .67, .30, 1, 1, ['hawk', 'salam'], 'river'],
  [6, 'Cinderwall', .90, .42, 1, 1, ['salam', 'hawk'], 'ruins'],
  [7, 'Amberlyn Court', .86, .82, 2, 2, ['golem', 'raven', 'slime'], 'meadow'],
  [8, 'Gleaning', .67, .70, 2, 1, ['golem', 'raven'], 'forest'],
  [9, 'Harrowgate', .90, .58, 2, 1, ['raven', 'slime'], 'meadow'],
  [10, 'Hoarfast Spire', .14, .82, 3, 2, ['yeti', 'wisp'], 'ruins'],
  [11, 'Rimeford', .33, .70, 3, 1, ['yeti', 'wisp'], 'river'],
  [12, 'Icewick', .10, .58, 3, 1, ['wisp', 'yeti'], 'forest'],
  [13, 'North Dial', .50, .18, 4, 1, ['imp', 'bone'], 'ruins'],
  [14, 'South Dial', .50, .82, 4, 1, ['imp', 'wraith'], 'ruins'],
  [15, 'Outlaw\'s Rest', .27, .50, 5, 1, ['bone', 'wolf'], 'forest'],
  [16, 'Gallows Tick', .73, .50, 5, 1, ['bone', 'raven'], 'meadow']
];
G.CASTLES = CS.map(c => ({ id: c[0], name: c[1], x: c[2], y: c[3], region: c[4], tier: c[5], circle: c[6], map: c[7], short: c[1].split(',')[0] }));
G.ROADS = [[1, 2], [1, 3], [2, 3], [2, 13], [3, 12], [4, 5], [4, 6], [5, 6], [5, 13], [6, 9], [7, 8], [7, 9], [8, 9], [8, 14], [10, 11], [10, 12], [11, 12], [11, 14],
  [0, 13], [0, 14], [15, 3], [15, 12], [15, 2], [15, 11], [16, 6], [16, 9], [16, 5], [16, 8]];
G.ADJ = G.CASTLES.map(() => []);
for (const [a, b] of G.ROADS) { G.ADJ[a].push(b); G.ADJ[b].push(a); }
G.castleYield = c => ({ 0: 60, 1: 40, 2: 25 }[c.tier === 3 ? 0 : c.tier === 2 ? 1 : 2]) * (c.region === 5 ? 1.2 : c.region === 4 && c.tier === 1 ? 1.2 : 1);
G.SITES = [   // a quest site for each castle: name, seasons, pool
  ['The Clockwork Orchard', 1], ['The Barrow of Bells', 2], ['The Long Hedge', 1], ['The Sunken Mill', 2], ['The Weathervane Cairn', 1], ['The Glass Furnace', 2],
  ['The Salt Spire', 1], ['Harvest Moon Field', 2], ['The Thresher\'s Grave', 1], ['The Scarecrow Court', 2], ['The Rimed Chapel', 1], ['The Frozen Orrery', 2],
  ['The Drowned Dial', 1], ['The Sleeping Cog', 2], ['The Hush Road', 1], ['The Highwayman\'s Oak', 2], ['The Tollgate of Hours', 1]
];

/* battle maps: 11 columns x 9 rows. . plain  f forest  # rock  w water  , lowland(floods in Spring)  K keep  D season dial */
G.MAPS = {
  meadow: ['...........', '..f...,,...', '....f......', '..,,..#....', '.....#K..f.', '..,,..#....', '....f......', '..f...,,...', '...........'],
  forest: ['.ff....f...', 'ff...f..ff.', '..f..ff.f..', '.f...#..f..', '..f..#K.ff.', '.f..f#..f..', 'f..ff.ff...', '.ff...f..f.', '..f.......f'],
  river: ['.....w.....', '..f..w..f..', '.....ww....', '..,,..w..#.', '.....wwK#..', '..,,..w..#.', '.....ww....', '..f..w..f..', '.....w.....'],
  ruins: ['.#.....#...', '...#..f....', '..,...#..#.', '.#....,....', '...#..#.K#.', '.#....,....', '..,...#..#.', '...#..f....', '.#.....#...'],
  sanctum: ['..#.....#..', '.....D.....', '.#.........', '......#..#.', '.D...#KD...', '......#..#.', '.#.........', '.....D.....', '..#.....#..']
};
G.MAP_NAMES = { meadow: 'Barley Meadow', forest: 'The Tangle', river: 'The Ford', ruins: 'Hourglass Ruins', sanctum: 'The Clockwork Sanctum' };
G.TERRAIN = {
  '.': { name: 'Plain', cost: 1, def: 0 }, 'f': { name: 'Forest', cost: 2, def: .15 }, '#': { name: 'Rock', cost: 99, def: 0 }, 'w': { name: 'Water', cost: 3, def: -.1 },
  ',': { name: 'Lowland', cost: 1, def: 0 }, 'K': { name: 'Keep', cost: 1, def: .2 }, 'D': { name: 'Season Dial', cost: 1, def: .1 }, 'F': { name: 'Wildfire', cost: 1, def: 0 }, 'i': { name: 'Ice', cost: 1, def: 0 }
};
/* the season turns the map: spring floods the lowland, summer sets the forest alight, winter freezes the water, autumn brings the gale */
G.seasonMap = (name, season) => G.MAPS[name].map(r => r.split('').map(ch => {
  if (season === 0 && ch === ',') return 'w';
  if (season === 1 && ch === 'f') return 'F';
  if (season === 3 && ch === 'w') return 'i';
  return ch;
}));


/* ===== 01b-data-more.js ===== */
/* ---- MORE CONTENT: the full bestiary, castles, knights and battle maps ---- */
const MORE_MONS = [
  ['stag', ['Fawnling', 'Greenstag', 'Antlered Sovereign'], 0, 'M', 'melee', 36, 10, 6, 3, 8, 5, 1, 1, 18, 'quad', 0, '#7a9a4a'],
  ['thistle', ['Thistlebur', 'Thornbrute', 'Bramble Giant'], 0, 'L', 'melee', 46, 11, 9, 1, 3, 3, 1, 2, 24, 'brute', 0, '#4a7a52'],
  ['moth', ['Dustmoth', 'Lunar Moth', 'Empress Moth'], 0, 'S', 'magic', 22, 3, 3, 11, 9, 4, 2, 1, 22, 'fly', 1, '#c8e0a8'],
  ['hound', ['Cinderpup', 'Cinderhound', 'Ashen Hellhound'], 1, 'M', 'melee', 32, 11, 5, 2, 8, 5, 1, 1, 20, 'quad', 0, '#c85a2a'],
  ['beetle', ['Sunbeetle', 'Gilded Scarab', 'Solar Colossus'], 1, 'M', 'melee', 34, 9, 9, 1, 5, 4, 1, 1, 20, 'imp', 0, '#e0b030'],
  ['firewisp', ['Sparkmote', 'Ember Wisp', 'Pyre Djinn'], 1, 'S', 'magic', 20, 3, 3, 12, 8, 4, 3, 2, 26, 'wisp', 1, '#ff8a3a'],
  ['boar', ['Piglet Tusker', 'Harvest Boar', 'Ironback Razor'], 2, 'M', 'melee', 40, 11, 7, 1, 6, 4, 1, 1, 18, 'quad', 0, '#8a5a3a'],
  ['scarecrow', ['Strawman', 'Scarecrow', 'Field Reaper'], 2, 'M', 'melee', 30, 10, 6, 2, 6, 4, 1, 1, 18, 'imp', 0, '#b89848'],
  ['owl', ['Owlet', 'Barn Owl', 'Dusk Strix'], 2, 'S', 'ranged', 24, 8, 4, 5, 9, 6, 2, 1, 22, 'fly', 1, '#a89070'],
  ['rimewolf', ['Rimepup', 'Rimewolf', 'Glacial Fenrir'], 3, 'M', 'melee', 34, 11, 6, 2, 8, 5, 1, 1, 20, 'quad', 0, '#a8c8e0'],
  ['falcon', ['Frostchick', 'Frostfalcon', 'Blizzard Roc'], 3, 'S', 'melee', 26, 10, 4, 3, 10, 6, 1, 1, 22, 'fly', 1, '#d0e8f8'],
  ['icegolem', ['Iceblock', 'Rime Golem', 'Glacier Colossus'], 3, 'L', 'melee', 50, 10, 11, 1, 3, 3, 1, 2, 28, 'brute', 0, '#8ab8d8'],
  ['clockhound', ['Tickpup', 'Clockhound', 'Chronohound'], 4, 'M', 'melee', 34, 10, 7, 2, 8, 5, 1, 1, 22, 'quad', 0, '#b0a898'],
  ['sandstalker', ['Hourgrain', 'Sandstalker', 'Dune Reaver'], 4, 'M', 'melee', 32, 11, 6, 2, 7, 4, 1, 1, 22, 'imp', 0, '#c8a868'],
  ['gearwing', ['Cogwing', 'Gearwing', 'Escapement Drake'], 4, 'S', 'ranged', 26, 8, 5, 5, 9, 6, 2, 1, 24, 'fly', 1, '#9aa0b0'],
  ['bellwraith', ['Chime Shade', 'Bellwraith', 'Knell Lord'], 4, 'M', 'magic', 28, 4, 4, 12, 7, 4, 3, 2, 30, 'wisp', 1, '#8a7ac0'],
  ['lantern', ['Lanternling', 'Will-o-Hour', 'Beacon Warden'], 4, 'S', 'magic', 24, 3, 4, 11, 8, 4, 2, 2, 26, 'wisp', 1, '#e8e090'],
  ['mudman', ['Mudling', 'Mudman', 'Bog Titan'], 2, 'L', 'melee', 48, 11, 9, 1, 3, 3, 1, 2, 24, 'brute', 0, '#7a6a48']
];
for (const m of MORE_MONS) G.def('monster', m[0], { id: m[0], names: m[1], el: m[2], size: m[3], kind: m[4], hp: m[5], atk: m[6], def: m[7], int: m[8], spd: m[9], mov: m[10], range: m[11], bond: m[12], cost: m[13], body: m[14], fly: !!m[15], col: m[16], rangeSpec: m[4] === 'melee' ? [1, 1] : [2, 3] });

/* maps: eight more fields (11 x 9) */
Object.assign(G.MAPS, {
  orchard: ['.....f.....', '.f...f..f..', '.....,,....', '..f..#.....', '....f.K.f..', '..f..#.....', '.....,,....', '.f...f..f..', '.....f.....'],
  marsh: ['..w..,.....', '.ww..f..w..', '..,..ww.f..', '.f...w..#..', '..ww.wK.w..', '.f...w..#..', '..,..ww.f..', '.ww..f..w..', '..w..,.....'],
  cliffs: ['##.........', '#...f...##.', '....#..f...', '.f.##......', '...#..#.K..', '.f.##......', '....#..f...', '#...f...##.', '##.........'],
  village: ['....f.....f', '.##.....##.', '.##..f..##.', '.....,.....', '..f..#K..f.', '.....,.....', '.##..f..##.', '.##.....##.', '....f.....f'],
  bridge: ['f..ww......', '...ww..f...', '...ww......', '.,.....,...', '.f.....K...', '.,.....,...', '...ww......', '...ww..f...', 'f..ww......'],
  barrow: ['.#.f...f.#.', '..,.....,..', '.f..###..f.', '....#......', '.,..#.K..,.', '....#......', '.f..###..f.', '..,.....,..', '.#.f...f.#.'],
  windmill: ['..........f', '.f..,..,...', '...#...#...', '.,.....f.,.', '.....#.K...', '.,.....f.,.', '...#...#...', '.f..,..,...', '..........f'],
  glacier: ['.f.ww......', '..www..f...', '...w.......', '.,.#..#....', '...w..#K...', '.,.#..#....', '...w.......', '..www..f...', '.f.ww......']
});
Object.assign(G.MAP_NAMES, { orchard: 'The Clockwork Orchard', marsh: 'Mistfen Marsh', cliffs: 'The Weathered Cliffs', village: 'Hollin Village', bridge: 'The Long Bridge', barrow: 'The Barrow of Bells', windmill: 'The Windmill Fields', glacier: 'Rimeglass Flats' });
G.PLAIN_MAPS = ['meadow', 'forest', 'river', 'ruins', 'orchard', 'marsh', 'cliffs', 'village', 'bridge', 'barrow', 'windmill', 'glacier'];

/* castles 17-24 and their roads */
const MORE_CS = [
  [17, 'Primrose Gate', .30, .12, 0, 1, ['stag', 'moth', 'wolf'], 'orchard', 0], [18, 'Cinder Reach', .74, .10, 1, 1, ['hound', 'firewisp', 'hawk'], 'cliffs', 1],
  [19, 'Sheaf Hollow', .74, .90, 2, 1, ['boar', 'owl', 'scarecrow'], 'windmill', 2], [20, 'Frostmere', .26, .90, 3, 1, ['rimewolf', 'falcon', 'icegolem'], 'glacier', 3],
  [21, 'Chime Gate', .40, .40, 4, 1, ['clockhound', 'bellwraith', 'imp'], 'bridge', 4], [22, 'Tick Gate', .60, .60, 4, 1, ['sandstalker', 'gearwing', 'lantern'], 'barrow', 4],
  [23, 'Crow\'s Toll', .18, .30, 5, 1, ['bone', 'mudman', 'wolf'], 'marsh', 5], [24, 'Hangman\'s Mile', .82, .30, 5, 1, ['bone', 'scarecrow', 'raven'], 'village', 5]
];
for (const c of MORE_CS) G.CASTLES.push({ id: c[0], name: c[1], x: c[2], y: c[3], region: c[4], tier: c[5], circle: c[6], map: c[7], short: c[1] });
G.CASTLE_OWNER = [4, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 0, 1, 2, 3, 4, 4, 5, 5];
G.ROADS.push([1, 17], [17, 13], [17, 2], [4, 18], [18, 13], [18, 5], [7, 19], [19, 8], [19, 14], [10, 20], [20, 11], [20, 14], [21, 13], [21, 15], [21, 2], [21, 0], [22, 14], [22, 16], [22, 8], [22, 0], [23, 3], [23, 2], [23, 1], [24, 6], [24, 5], [24, 4]);
G.ADJ = G.CASTLES.map(() => []); for (const [a, b] of G.ROADS) { G.ADJ[a].push(b); G.ADJ[b].push(a); }
// every season-region castle gains the new species of its element, and the maps spread across the field list
for (const c of G.CASTLES) {
  if (c.id > 16) continue;
  const extra = G.all('monster').filter(m => m.el === c.region && !c.circle.includes(m.id)).map(m => m.id); for (const e of extra.slice(0, 2)) c.circle.push(e);
  if (c.id && c.map !== 'sanctum' && c.id < 17) c.map = G.PLAIN_MAPS[(c.id * 5) % G.PLAIN_MAPS.length];
}
G.SITES.push(['The Primrose Mill', 1], ['The Slag Orchard', 2], ['The Gleaner\'s Barn', 1], ['The Skating Pond', 2], ['The Muffled Bell', 1], ['The Hourglass Garden', 2], ['The Gibbet Oak', 1], ['The Toll Barrow', 2]);

/* fifteen more knights */
const MORE_KN = [
  ['ector', 'Ector of the Hedgerow', 0, 4, 4, '', .9, 'Keeps bees in his gauntlets. They obey him better than the army does.'], ['agravain', 'Agravain the Plain', 1, 0, 4, '', .75, 'Insists he is not jealous of Gawain. Says so loudly, often at noon.'],
  ['lucan', 'Lucan the Butler', 2, 3, 4, '', .85, 'Pours tea in the middle of battles. Has never spilled.'], ['gaheris', 'Gaheris of the Ice-Reach', 3, 1, 4, '', 1.05, 'Shoots icicles and apologises to them afterward.'],
  ['hush', 'Sir Hush', 4, 0, 6, '', .6, 'Has not spoken since the Clock stopped, and finds that restful.'], ['pause', 'Dame Pause', 4, 2, 6, '', 1.25, 'Casts spells one syllable at a time, and does not like to be interrupted.'],
  ['linger', 'Brother Linger', 4, 3, 6, '', .8, 'Heals the wounded very slowly, so they stay.'], ['dally', 'Knight Dally', 4, 1, 6, '', 1.1, 'Always has one more arrow to find. Never fires the first.'],
  ['mab', 'Mab the Cutthroat', 5, 0, 5, 'brigand', .7, 'Collects tolls. Does not collect receipts.'], ['nettle', 'Nettle', 5, 1, 5, 'brigand', 1.3, 'Small, quick, and entirely made of elbows.'],
  ['gareth', 'Gareth Kitchener', 5, 0, 6, 'free', .85, 'Was a scullion. Is now unreasonably good with a ladle and a sword.'], ['elyan', 'Elyan the White', 5, 2, 5, 'free', 1.15, 'Wears white in all weathers and keeps it clean by sheer will.'],
  ['pellam', 'Pellam the Fisher', 5, 3, 5, 'free', .9, 'Heals with fish. Nobody has asked him to explain.'], ['bran', 'Bran the Weathered', 5, 4, 6, 'free', .65, 'Walks with a raven who files his taxes.'], ['isolde', 'Isolde Wren', 5, 1, 5, 'free', 1.4, 'Shoots straighter than she tells the truth, and tells the truth quite straight.']
];
for (const k of MORE_KN) G.KNIGHTS[k[0]] = { id: k[0], name: k[1], short: k[1].split(' ')[0], realm: k[2], line: k[3], lvl: k[4], role: k[5], voice: k[6], blurb: k[7] };
G.MORE_PLACE = { ector: 17, agravain: 18, lucan: 19, gaheris: 20, hush: 21, pause: 22, linger: 13, dally: 14, mab: 23, nettle: 24 };
G.FREE_KNIGHTS = ['galahad', 'lunette', 'ywain', 'gareth', 'elyan', 'pellam', 'bran', 'isolde'];


/* ===== 01c-data-tables.js ===== */
/* ---- THE FULL TABLES: items (33), classes (23) and skills (100: tiers, season variants, monster traits) ---- */
/* items: id, name, slot, text, stats */
const MORE_IT = [
  ['dagger', 'Rook\'s Dagger', 'w', '+2 attack, +1 move.', { atk: 2, mov: 1 }], ['longsword', 'Longsword of Noon', 'w', '+5 attack.', { atk: 5 }], ['warhammer', 'Thresher\'s Hammer', 'w', '+6 attack, -1 move.', { atk: 6, mov: -1 }],
  ['yewbow', 'Yew Bow', 'w', '+4 attack.', { atk: 4 }], ['runestaff', 'Runestaff', 'w', '+5 intellect.', { int: 5 }], ['lilywand', 'Lily Wand', 'w', '+3 intellect, +10 HP.', { int: 3, hp: 10 }], ['whip', 'Gilded Whip', 'w', '+3 attack, +1 bond.', { atk: 3, bond: 1 }],
  ['buckler', 'Dewdrop Buckler', 'a', '+2 defence.', { def: 2 }], ['plate', 'Plate of Hours', 'a', '+6 defence, -1 move.', { def: 6, mov: -1 }], ['cloak', 'Thistle Cloak', 'a', '+3 defence, +1 move.', { def: 3, mov: 1 }],
  ['mail', 'Ringmail', 'a', '+4 defence, +8 HP.', { def: 4, hp: 8 }], ['robe', 'Frostwool Robe', 'a', '+3 defence, +3 intellect.', { def: 3, int: 3 }], ['aegis', 'Aegis of the Wheel', 'a', '+5 defence.', { def: 5 }], ['gambeson', 'Gambeson', 'a', '+15 HP.', { hp: 15 }],
  ['ring', 'Ring of Tarry', 'c', '+2 bond.', { bond: 2 }], ['amulet', 'Amulet of Spring', 'c', '+4 intellect.', { int: 4 }], ['horseshoe', 'Lucky Horseshoe', 'c', '+1 move, +1 bond.', { mov: 1, bond: 1 }], ['talisman', 'Sun Talisman', 'c', '+3 attack.', { atk: 3 }],
  ['brooch', 'Hourglass Brooch', 'c', '+10 HP, +2 defence.', { hp: 10, def: 2 }], ['bell', 'Silver Bell', 'c', '+2 intellect, +1 bond.', { int: 2, bond: 1 }], ['feather', 'Roc Feather', 'c', '+2 move.', { mov: 2 }],
  ['hipotion', 'Great Draught', 'use', 'Heals 60 HP.', { heal: 60 }], ['tonic', 'Field Tonic', 'use', 'Heals 15 HP.', { heal: 15 }], ['elixir', 'Moonwell Elixir', 'use', 'Restores 24 MP to a knight.', { mp: 24 }], ['bandage', 'Clean Bandage', 'use', 'Heals 22 HP.', { heal: 22 }]
];
for (const i of MORE_IT) { G.def('item', i[0], Object.assign({ id: i[0], name: i[1], slot: i[2], text: i[3] }, i[4])); G.ITEM_IDS.push(i[0]); }
G.EQUIP_IDS = G.ITEM_IDS.filter(i => ['w', 'a', 'c'].includes(G.get('item', i).slot));
/* classes: 5 lines x 3 tiers, plus eight unique ruler and wanderer classes */
G.UNIQUE_CLASS = { elaine: 'Queen of Lilies', gawain: 'Noon Warden', ragnell: 'Harvest Mother', nimue: 'Mere Witch', vesper: 'Warden of the Hour', maelgwn: 'Brigand King', gray: 'Stillness Incarnate', galahad: 'Wandering Saint' };
G.CLASSES = G.LINES.flatMap(l => l.names).concat(Object.values(G.UNIQUE_CLASS));
G.className = k => (G.UNIQUE_CLASS[k.id] && (k.tier >= 1 || k.id === 'gray')) ? G.UNIQUE_CLASS[k.id] : G.LINES[k.line].names[k.tier];
/* skills: tier upgrades and season variants of the ten base skills */
const BASE = G.all('skill').slice(), PRE = ['Verdant', 'Blazing', 'Harvest', 'Frozen'];
for (const b of BASE) {
  b.base = b.id;
  [['_2', 'Greater ', 1.25, 2], ['_3', 'Grand ', 1.5, 4]].forEach(([suf, pre, pm, mp]) => G.def('skill', b.id + suf, Object.assign({}, b, { id: b.id + suf, name: pre + b.name, power: b.power * pm, mp: b.mp + mp, base: b.id })));
  for (let e = 0; e < 4; e++) G.def('skill', b.id + '_s' + e, Object.assign({}, b, { id: b.id + '_s' + e, name: PRE[e] + ' ' + b.name, power: b.power * 1.1, mp: b.mp + 1, base: b.id, el: e }));
}
/* monster traits: each species carries one passive */
const TRAITS = ['regen', 'swift', 'guard'], TRAIT_TEXT = { regen: 'Recovers 3 HP at the start of its phase.', swift: 'Moves one hex further.', guard: 'Takes 10% less damage.' };
G.all('monster').forEach((m, i) => { m.passive = TRAITS[i % 3]; G.def('skill', 'p_' + m.id, { id: 'p_' + m.id, name: m.names[0] + ' trait', kind: 'passive', range: [0, 0], mp: 0, power: 0, text: TRAIT_TEXT[m.passive], base: 'p_' + m.id, target: 'self', radius: 0, mobile: true }); });
G.TRAIT_TEXT = TRAIT_TEXT;


/* ===== 09-story.js ===== */
/* ---- STORY: events are data. when(S) says when one is due, scene(S) gives its lines, done(S) its effects. ---- */
const kn = id => G.KNIGHTS[id];
const L = (who, text, extra) => Object.assign({ who, name: who === 'narrator' ? '' : (kn(who) ? kn(who).short : who), text, voice: who === 'narrator' ? 1 : (kn(who) || { voice: 1 }).voice }, extra || {});
const N = text => L('narrator', text);
G.ruler = realm => G.RULERS[realm];
const rival = S => G.REALMS[(S.human + 1) % 4];
G.EVENTS = [
  { id: 'prologue', when: S => S.turn === 1, stage: 'hall',
    scene: S => { const r = G.REALMS[S.human], rk = G.ruler(S.human); return [
      N('In the Year Before Counting, the Great Clock of Meridian began to run slow. Nobody noticed. It is difficult to notice that sort of thing.'),
      N('Then Spring arrived on a Tuesday, and so did Summer, and the dairymaids filed a complaint.'),
      L(rk, 'Forgive the ' + (S.human === 1 ? 'noonday ' : '') + 'summons. The seasons are not keeping their appointments, and I am told it is rude to ask the sky to hurry.'),
      L(rk, 'Four realms, ' + r.name + ' among them, hold the wheel together. Meridian sleeps, and its Keeper with it. Someone has to wake the Clock.'),
      N('You are the one who will. This is a thing that has already been decided, mostly by you, a moment ago, in the corridor.'),
      L(rk, 'Muster the Wheelsworn. Bind the beasts to your banners. And mind the road: the other realms have noticed the Clock as well, and they are as polite about it as we are.'),
      N('The first Tidings of the Brigantime are read. Spring, Year 1. The kettle is on.')]; } },
  { id: 'rival_taunt', when: S => S.year === 1 && S.season === 2, stage: 'road',
    scene: S => { const rv = rival(S), rk = G.ruler(rv.id); return [
      N('A rider arrives under a flag of truce, which is a flag nobody has ever quite managed to define.'),
      L(rk, 'Greetings from ' + rv.name + '. I wished to say that I intend to reach Meridian first. I wished also to say it courteously, since we are neighbours.'),
      L(G.ruler(S.human), 'How very civil. And how very much I shall disappoint you.', { choices: [{ text: 'Reply in kind: "May the best season win."', set: { rivalCourt: 1 } }, { text: 'Reply stiffly: "Mind your borders."', set: { rivalStiff: 1 } }] }),
      N('The rider bows, mounts, and gets lost on the way out. This is recorded as a diplomatic success.')]; } },
  { id: 'candle_lit', when: S => S.flags.candleLit, stage: 'clock',
    scene: S => [
      N('At the stroke of a bell no one rang, a candle caught light in every window of Forseason. Its flame did not flicker. It burned straight up, like a held breath.'),
      L('vesper', 'Good people of the four seasons. Please do not be alarmed. I have only stopped the Clock.'),
      L('vesper', 'You will find it restful. No harvests to hurry, no winters to dread. Only this long and gentle Now. I call it the Hourless Dominion.'),
      L('vesper', 'The Hour-Candle burns ' + S.candle + ' seasons, and then the Thirteenth Month begins. Come to Meridian before then, if you would like to argue.'),
      L(G.ruler(S.human), 'We would like to argue very much.'),
      N('The Hour-Candle is lit. Take Meridian before it burns out, and wake the Keeper.')] },
  { id: 'gray_whisper', when: S => S.stillCastle >= 0 && S.year >= 2 && !S.eventsDone.gray_whisper, stage: 'clock',
    scene: S => [
      N('In ' + G.CASTLES[S.stillCastle].short + ' every clock, every cat and every kettle has stopped. The cat is still mid-yawn.'),
      L('gray', '...'),
      L('gray', 'I do not remember the last season. I do remember that it was unkind. I will keep you from it.'),
      L(G.ruler(S.human), 'Who speaks?'),
      N('The Gray Knight does not answer. He seems to be listening to something very far away, which is possibly the future.')] },
  { id: 'first_blood', when: S => S.stats.wins >= 1, stage: 'road',
    scene: S => [
      N('The first battle is over, and nobody is quite sure what to do with their hands.'),
      L(G.ruler(S.human), 'A victory. We should write that down, before the next one happens to us.'),
      N('Knights who fought gain Experience. Monsters who fought gain it too, and gain it faster, and complain about it less.')] },
  { id: 'brigands_no_more', when: S => S.flags.brigandsGone, stage: 'road',
    scene: S => [
      N('With the last brigand castle taken, the roads of Forseason are safe for the first time in a hundred years.'),
      L('maelgwn', 'Well. That is an unexpected thing, to be on the wrong side of a toll.'),
      N('Merchants return. Unfortunately, so do the tax collectors. It is a mixed blessing, and a very well-attended one.')] },
  { id: 'galahad_joins', when: S => S.flags.joined_galahad, stage: 'hall', scene: S => [N('A stranger walks into the muster hall at the exact moment someone had asked where he was.'), L('galahad', 'I was told you would need a knight who arrives at the wrong time. I do it professionally.')] },
  { id: 'lunette_joins', when: S => S.flags.joined_lunette, stage: 'hall', scene: S => [N('A woman with a spare season in her pocket joins your banner. She declines to say which one.'), L('lunette', 'Spring, if you are asking. I save it for emergencies, and for people who are being rude about winter.')] },
  { id: 'ywain_joins', when: S => S.flags.joined_ywain, stage: 'hall', scene: S => [N('A knight and a very large lion arrive. The lion seems to be in charge.'), L('ywain', 'He has opinions about your strategy. I have translated some of them. The rest are rude.')] },
  { id: 'meridian_near', when: S => !S.eventsDone.meridian_near && [13, 14, 15, 16].some(c => S.castles[c].owner === S.human), stage: 'clock',
    scene: S => [
      N('From the walls, on a clear day, you can see the tower of Meridian. It looks exactly like a clock that has stopped, which is what it is.'),
      L(G.ruler(S.human), 'Close enough to hear it not ticking.'),
      N('The Calendar City is guarded by the Gray Knight. The Season Dials in its Sanctum shield him: stand a knight on a Dial to weaken the shield.')] },
  { id: 'candle_half', when: S => S.candle != null && S.candle <= Math.floor(G.tune.candleSeasons / 2) && !S.eventsDone.candle_half, stage: 'clock',
    scene: S => [N('The Hour-Candle has burned to half. The flame has stopped being polite about it.'), L(G.ruler(S.human), 'Half of everything we have left. I shall try to spend it on things other than worry.')] },
  { id: 'candle_low', when: S => S.candle != null && S.candle <= 2 && !S.eventsDone.candle_low, stage: 'clock',
    scene: S => [N('Two seasons. The wax has the look of a thing that has made up its mind.'), L(G.ruler(S.human), 'Then we do not wait for the next Tidings. We go to Meridian now.')] },
  { id: 'realm_falls', when: S => [0, 1, 2, 3].some(r => S.flags['dead_' + r] && r !== S.human && !S.flags['seen_dead_' + r]), stage: 'road',
    scene: S => { const r = [0, 1, 2, 3].find(x => S.flags['dead_' + x] && x !== S.human && !S.flags['seen_dead_' + x]); S.flags['seen_dead_' + r] = true; return [N('The banners of ' + G.REALMS[r].name + ' are lowered for the last time. Its knights scatter to the wanderers\' roads.'), L(G.ruler(S.human), 'I did not wish this. But I will make it count for something.')]; } }
];
/* endings: one for each realm, plus three kinds of failure */
G.ENDINGS = {
  victory: realm => { const rk = G.ruler(realm), R_ = G.REALMS[realm]; return [
    N('The Sanctum doors give way. The Gray Knight kneels at the Great Clock, and the helm comes off, and there is nothing under it but a very old tiredness.'),
    L('gray', 'I only wished the last season to stop hurting.'),
    L('vesper', 'We meant it kindly. Everything we did, we meant kindly. That is the trouble with kindness: it never knows when to stop.'),
    L(rk, 'Then let us teach it. Spring, Summer, Autumn, Winter: in order, and never all at once.'),
    N('The Keeper wakes. The Clock, which has been holding its breath for nineteen seasons, lets it go. A bell rings, a very ordinary bell, and every kettle in Forseason boils at once.'),
    N(R_.name + ' is crowned Warden of the Wheel. ' + ({ 0: 'Blossoms open on the battlements out of sheer relief.', 1: 'Noon, for the first time in a year, arrives on time and a little pleased with itself.', 2: 'The harvest is brought in. Everyone agrees it is the best in memory, which is the kind of thing that is always agreed.', 3: 'Snow falls in the orchards, softly, politely, exactly when it is supposed to.' })[realm]),
    N('THE END. Or, more precisely, the end of this Tuesday.')]; },
  candle: realm => [N('The Hour-Candle gutters. The flame leans, and thinks about it, and goes out.'), N('Nothing dramatic follows. There is only a long, tidy quiet, in which the seasons forget which of them is next.'), L('vesper', 'There. Is that not restful?'), N('It is restful. That is the whole tragedy of it.')],
  fallen: realm => [N('The last banner of ' + G.REALMS[realm].name + ' is folded by hands that have run out of reasons to hurry.'), L(G.ruler(realm), 'We tried. Let that be written, even if no one is left to read it.'), N('Elsewhere, the seasons keep their appointments, or do not, with no one to notice.')],
  rival: realm => [N('A rival realm takes Meridian and crowns itself Warden of the Wheel, and the Clock keeps running in somebody else\'s favour.'), L(G.ruler(realm), 'It was well done. I would only have preferred to be the one to do it.'), N('The Brigantime ends. Spring returns, regardless, and is very sorry for the delay.')]
};
G.TIPS = ['Seasons are elements: Spring opposes Autumn, Summer opposes Winter.', 'Monsters stay near their knight: outside the Ward they fight at a penalty.', 'A weakened monster can be Bound by a knight to join your banner.',
  'Spells need planted feet. A knight that moves first cannot cast.', 'The attacker has twelve bells. A knight on the Keep when the last bell rings also wins.', 'In its own season a realm earns a quarter more mana.', 'Quests are risky and generous. Send the knights you can spare.'];


/* ===== 09b-story-more.js ===== */
/* ---- STORY, continued: the smaller Tidings, each shown once ---- */
const ME = S => G.ruler(S.human), RV = S => G.ruler((S.human + 1) % 4), SEA = S => G.SEASONS[S.season];
const E2 = (id, stage, when, scene) => G.EVENTS.push({ id, stage, when, scene });
E2('first_summon', 'hall', S => S.turn === 2, S => [N('The summoning circle hums like a kettle that has made up its mind.'), L(ME(S), 'Mana is only the price of company. Spend it on creatures who will stand beside you, not behind.')]);
E2('first_quest', 'road', S => Object.values(S.knights).some(k => k.realm === S.human && k.quest) && S.turn > 1, S => [N('A knight rides out on a quest. The road, as usual, was not consulted.'), L(ME(S), 'Come back with something. Treasure, a beast, a friend. Failing that, come back with a good story.')]);
E2('first_bind', 'hall', S => S.turn === 3, S => [N('Bond is a limit, not a leash. A knight can carry only so many promises.'), L(ME(S), 'Choose your troop as you would choose a dinner party. Too many guests and no one hears the toast.')]);
E2('first_castle', 'road', S => S.stats.castles >= 1 && !S.eventsDone.first_castle, S => [N('The first captured gate swings shut behind your army. It is, for now, politely yours.'), L(ME(S), 'Hold it. A castle taken is a castle owed, and the debt is paid in watchfulness.')]);
E2('three_castles', 'road', S => S.stats.castles >= 3, S => [N('Three castles taken. The map has begun to lean in your direction.'), L(ME(S), 'Do not let the leaning make us careless. Maps are famously fond of falling over.')]);
E2('first_bound', 'hall', S => S.stats.captured >= 1, S => [N('A monster, bound in battle, looks at its new banner and decides it is acceptable.'), L(ME(S), 'It chose to stay. Remember that, the next time it hesitates.')]);
E2('knight_wounded', 'road', S => Object.values(S.knights).some(k => k.realm === S.human && k.wounded), S => [N('A knight is carried home wounded. The infirmary has a kettle and a long view of the window.'), L(ME(S), 'Rest. The Wheel can turn one season without you.')]);
E2('first_promotion', 'hall', S => Object.values(S.mons).some(m => m.realm === S.human && m.form >= 1), S => [N('A monster changes form in the muster yard. The yard attempts applause and gets as far as a cough.'), L(ME(S), 'Grown, and still itself. That is the whole trick.')]);
E2('knight_class', 'hall', S => C.knightsOf(S, S.human).some(k => k.tier >= 1 && !k.ruler), S => [N('A knight takes up a higher calling. The armourer lets out a seam, and then another.'), L(ME(S), 'Wear it as you wore the old one: lightly, and with both hands free.')]);
E2('rich', 'hall', S => S.realms[S.human].mana >= 600, S => [N('The treasury is so full the clerk has begun to worry about it.'), L(ME(S), 'Mana unspent is a ghost in the cellar. Summon something, or the cellar will begin to haunt us.')]);
E2('poor', 'hall', S => S.turn > 4 && S.realms[S.human].mana < 20, S => [N('The treasury echoes. A clerk is heard counting coins that are not there, in a tone of great patience.'), L(ME(S), 'Dismiss the idle and keep the willing. Even a crown must live within its means.')]);
E2('winter_comes', 'road', S => S.season === 3 && S.turn > 3 && !S.eventsDone.winter_comes, S => [N('Winter, and every non-Winter monster complains about the cost of its blanket.'), L(ME(S), 'Upkeep rises in the cold. Mind the mana, and mind the draughts.')]);
E2('spring_flood', 'road', S => S.season === 0 && S.year >= 2 && !S.eventsDone.spring_flood, S => [N('The spring floods have found the lowlands. The lowlands, to their credit, expected them.'), L(ME(S), 'In battle, low ground turns to water in Spring. Plan your march along the high road.')]);
E2('summer_fires', 'road', S => S.season === 1 && S.year >= 2 && !S.eventsDone.summer_fires, S => [N('Summer fires are in the forests. The squirrels, reasonably, are leaving.'), L(ME(S), 'Wildfire bites those who stand in burning woods. Stand elsewhere.')]);
E2('autumn_gale', 'road', S => S.season === 2 && S.year >= 2 && !S.eventsDone.autumn_gale, S => [N('The autumn gale returns, flinging leaves and bad arrows in equal measure.'), L(ME(S), 'Archers and wings suffer in the wind. Bring axes.')]);
E2('year_two', 'clock', S => S.year === 2 && S.season === 1, S => [N('The second Summer of the Brigantime begins, and the Hour-Candle is quite well established.'), L('vesper', 'You will have noticed that nothing is hurried here. I find it a considerable improvement on hurrying.')]);
E2('year_three', 'clock', S => S.year === 3 && S.season === 0, S => [N('Spring, Year 3. The blossoms have the cautious look of those who have been told this may be the last time.'), L(ME(S), 'I would have liked to see one more orchard. We shall make time for it, at Meridian.')]);
E2('rival_falls_quiet', 'road', S => S.year >= 2 && S.season === 2 && !S.eventsDone.rival_falls_quiet, S => [N('A letter from ' + G.REALMS[(S.human + 1) % 4].name + ', in a hand that has recently stopped being steady.'), L(RV(S), 'I will be at Meridian before you. I would be very glad to be wrong, and rather more surprised.')]);
E2('tarry_deserts', 'road', S => S.castles[13].owner !== 4 && !S.eventsDone.tarry_deserts, S => [N('North Dial has fallen. Somewhere in its tower a Dominion banner is quietly rolled up.'), L('tarry', 'I was just leaving. I had been leaving for some time, in fact.')]);
E2('south_dial', 'road', S => S.castles[14].owner !== 4 && !S.eventsDone.south_dial, S => [N('South Dial no longer stands for the Hourless. Its bell rings once, unasked, and the pigeons all agree it was time.'), L('lull', 'A pity. I had only just finished the lullaby.')]);
E2('chime_gate', 'clock', S => S.castles[21].owner !== 4 && !S.eventsDone.chime_gate, S => [N('Chime Gate is open. For the first time in a year, a clock somewhere ticks, and is immediately scolded.'), L('pause', 'Please. One syllable... at a... time.')]);
E2('tick_gate', 'clock', S => S.castles[22].owner !== 4 && !S.eventsDone.tick_gate, S => [N('Tick Gate falls. A sandglass in the tower turns itself over, as if tired of waiting.'), L('hush', '...')]);
E2('dominion_bells', 'clock', S => S.stillCastle >= 0 && S.year >= 3 && !S.eventsDone.dominion_bells, S => [N('Another castle goes still. A single bell tolls, and the sound hangs in the air like an unfinished sentence.'), L('vesper', 'Rest. There is nothing more to be done, which is the very best kind of nothing.')]);
E2('gray_dream', 'clock', S => S.candle != null && S.candle <= 8 && !S.eventsDone.gray_dream, S => [N('The Gray Knight dreams of a season no one remembers, and the dream seeps through the window like damp.'), L('gray', 'It hurt. I would stop it, if I could stop only the hurt.')]);
E2('candle_four', 'clock', S => S.candle != null && S.candle <= 4 && !S.eventsDone.candle_four, S => [N('Four seasons. The Hour-Candle has the thin, determined look of a candle that wishes to be remembered.'), L(ME(S), 'Four. Then four we shall use.')]);
E2('free_knights', 'road', S => S.turn >= 5 && !S.eventsDone.free_knights && Object.values(S.knights).some(k => k.free), S => [N('Word spreads that a few knights keep no banner, and wander the roads looking for a cause that fits.'), L(ME(S), 'Send a knight questing. The road is full of people who have not yet been asked.')]);
E2('brigand_toll', 'road', S => S.turn >= 3 && S.castles[15].owner === 5 && !S.eventsDone.brigand_toll, S => [N('A toll-keeper at Outlaw\'s Rest lifts a gloved hand. The gloved hand holds an invoice.'), L('maelgwn', 'Pay or pass. There is no third thing. I checked.')]);
E2('mab_taunt', 'road', S => S.turn >= 6 && S.castles[23].owner === 5 && !S.eventsDone.mab_taunt, S => [N('A cutpurse on the marsh road whistles a tune that is almost, but not quite, a threat.'), L('mab', 'Ooh, a banner. How very official. How very breakable.')]);
E2('realm_last', 'road', S => [0, 1, 2, 3].filter(r => S.realms[r].alive).length <= 2 && !S.eventsDone.realm_last, S => [N('Only two of the four realms still hold the Wheel. The room feels larger and a good deal less friendly.'), L(ME(S), 'It is a smaller table now. Mind the seating.')]);
E2('meridian_sight', 'clock', S => S.castles[0].owner === 4 && [13, 14, 21, 22].some(c => S.castles[c].owner === S.human) && !S.eventsDone.meridian_sight, S => [N('From the dial-tower the Calendar City is clear: a silver clock-face in a ring of motionless fog.'), L(ME(S), 'There. Tick, tick, and the small mercy of one more tick.')]);


/* ===== 10-data-about.js ===== */
/* About & Credits: Source Information, Testing, Engine and Prompt feedback (generated by tools/gen-text.mjs). */
G.ABOUT = [
 {
  "title": "Source",
  "rows": [
   [
    "Date",
    "2026-11-04 05:02:26"
   ],
   [
    "Source",
    "Brigandine: The Legend of Forsena (Hearty Robin, PlayStation, 1998). Only the title is a nod; the world, cast, art and music are original."
   ],
   [
    "Plan",
    "PLAN.md"
   ],
   [
    "Genre",
    "Turn-based grand strategy with a tactical RPG hex-battle layer"
   ],
   [
    "Perspective",
    "Campaign: a three-quarter diorama of the continent, north up. Battles: a tilted overhead hex board with billboard figures (tilt toggle). Story: side-on stage scenes with live portraits."
   ],
   [
    "Tech",
    "my-3D2dge 0.85.2 (single-file engine, unmodified) with plain JavaScript; AI Hub Session Protocol v1 client 1.4.0; Playwright 1.63 and Node 24 for tests only. No other libraries."
   ],
   [
    "Art Direction",
    "The engine's native HD-rig style: Humanoid knights with live portraits, six hand-built creature bodies drawn from pixel primitives, season palettes, drawn hexes, a clock-face continent."
   ],
   [
    "Animation",
    "The engine's Humanoid rig and E.Attack moves, plus new creature animation (hops, wing-flaps, squash, lunges), season effects (wildfire, ice, gale motes) and spell bursts."
   ],
   [
    "Audio",
    "All in code: ten step-sequenced songs, about thirty sound effects and Animalese babble voices pitched per speaker, through the engine's synthesiser."
   ],
   [
    "Online",
    "AI Hub shared-world mode (2-4 players): the host's copy orders every command, all copies replay the same seeded battle; seats one and two duel and others watch. Passes the hub harness at 2, 3 and 4 players (latency, loss), host-leave and no-player-host scenarios. Local hot-seat: a campaign for 2-4 humans on one machine (pass-and-play) and a two-human skirmish."
   ],
   [
    "Testing",
    "Headless scripts only (node tests/run.mjs: 522 checks incl. a scripted whole-campaign playthrough), a balance bot, browser screenshots for looks, and the AI Hub harness."
   ],
   [
    "Research",
    "Light: read the plan, the engine card and the hub protocol; no outside research."
   ],
   [
    "Environment",
    "Claude Code CLI (headless); Linux; browser unknown (Chromium via Playwright used for checks)"
   ],
   [
    "Model",
    "Anthropic, claude-sonnet-5-5, reasoning effort medium"
   ],
   [
    "Usage",
    "unknown"
   ]
  ]
 },
 {
  "title": "Testing",
  "rows": [
   [
    "How many issues did testing catch?",
    "Nine: Meridian was one road away from the player's start, so a scripted playthrough won on turn 1; the campaign scene read its map rectangle and cursor before the first draw (crash headless and on loading a save); the first story event fired on turn 1 by mistake; deep links were overwritten by the engine's boot; the attract mode exited itself in a test because of its own activity stamp; the font cannot draw several symbols I had used (shown as ?); and the engine's corner buttons covered my HUD."
   ],
   [
    "How many were critical?",
    "Three: the Meridian shortcut (the demo could be finished in one season) and the two first-draw crashes in the campaign scene."
   ],
   [
    "Most helpful test",
    "The scripted whole-campaign playthrough plus the all-AI balance bot: they drove every system from the title to an ending in seconds and exposed the Meridian shortcut that no unit test would have."
   ],
   [
    "Least helpful test",
    "The data-validation suite (castles, maps, skills, roads, walkable maps in all four seasons): it never failed once, so it protects the future more than it informed the present."
   ]
  ]
 },
 {
  "title": "Engine",
  "rows": [
   [
    "Liked most",
    "game.advance with game.debug: the same inputs give the same game, so I could play the whole demo in Node. The Humanoid rigs with live portraits also looked good with no art work, and pause, settings, saves and per-device button labels came free."
   ],
   [
    "Stuck or guessed wrong?",
    "Yes. I assumed the font had the pad symbols that input.label returns (a cross, circle, square, triangle) and common punctuation; it does not, so I drew the symbols by hand. A game.go() made before boot finishes is silently replaced by the first scene, and game.every timers vanish at each scene change."
   ],
   [
    "Most important thing built myself",
    "The hex board and its picking, six creature painters, a 10-foot UI kit (focus model, lists, prompts, sliders, talk box), the battle and campaign simulations with their AIs, and the Animalese voices and songs."
   ],
   [
    "Hardest part",
    "Fitting a strategy game to an engine whose views assume a world with a ground plane: I drew everything through r.overlay and did my own depth ordering and picking. The API index is also very large to search for a name."
   ],
   [
    "Engine changes",
    "None. The engine is unmodified."
   ],
   [
    "One thing to change",
    "Ship a small 10-foot UI toolkit (pad and mouse focus, lists, grids, glyph prompts) and a font that includes controller glyphs and common symbols."
   ]
  ]
 },
 {
  "title": "Prompt",
  "rows": [
   [
    "Liked most",
    "The task's spec for controller-first play, attract mode and dev mode was concrete, and the plan's exact rules and tables made the design decisions quick."
   ],
   [
    "Confusing",
    "The plan was written for another model, effort and date and names a different file and folder than TASK.md, and its scope (25 castles, 36 knights, 30 species, 13 maps, 40 events) is far beyond one session. TASK.md wins, but I had to reconcile them."
   ],
   [
    "Hardest thing",
    "Writing the plan's full content (25 castles, 36 knights, 30 species with 3 forms, 13 maps, 40 events) in one session, and keeping a hex battle readable at 320x240. Shipping all of the plan's tables (100 skills incl. tier and season variants and monster traits, 33 items, 23 classes) and 2-4 side skirmishes took a generalised battle simulation."
   ],
   [
    "What to change",
    "Mark which parts of the plan are optional and give a size budget, make the plan's file names agree with TASK.md, and say whether the About screen, chat reply and JSON must match word for word."
   ]
  ]
 },
 {
  "title": "Credits",
  "rows": [
   [
    "Design and code",
    "Written by Claude (claude-sonnet-5-5) from a plan by claude-opus-5-5."
   ],
   [
    "Engine",
    "my-3D2dge by Michael Crosato."
   ],
   [
    "Online",
    "AI Hub Session Protocol v1."
   ],
   [
    "Inspiration",
    "Brigandine: The Legend of Forsena, whose idea of a continent at war, told in months, started all of this."
   ],
   [
    "Tone",
    "Earnest, a little wry, and fond of tidy bureaucracy: kettles, calendars and clocks."
   ]
  ]
 }
];


/* ===== 20-sim-battle.js ===== */
/* ---- BattleSim: pure, deterministic, JSON state. Never touches the engine, the DOM, the clock or Math.random. ----
 * create(spec) -> state;  apply(S, cmd) -> events[] | null (illegal);  legal helpers: reach, targets, forecast. */
const B = G.Battle = {};
const H = G.hex;
B.tile = (S, c, r) => (r < 0 || r >= S.rows || c < 0 || c >= S.cols) ? '#' : S.tiles[r][c];
B.at = (S, c, r) => S.units.find(u => u.alive && !u.gone && u.c === c && u.r === r) || null;
B.unit = (S, uid) => S.units[uid];
B.live = (S, side) => S.units.filter(u => u.alive && !u.gone && (side === undefined || u.side === side));

B.skillsFor = (k, L) => { const suf = k.tier >= 2 ? '_3' : k.tier >= 1 ? '_2' : ''; const out = L.skills.map(s => s + suf); const el = G.REALMS[k.realm] ? G.REALMS[k.realm].season : 4; if (el < 4 && k.lvl >= 6) out.push(L.skills[0] + '_s' + el); return out; };
function mkKnight(k, side, troop) {
  const st = G.knightStats(k), L = G.LINES[k.line], K = G.KNIGHTS[k.id] || {}, realm = k.realm;
  const el = G.REALMS[realm] ? G.REALMS[realm].season : 4;
  return { id: 'k:' + k.id, side, troop, lead: true, kind: 'knight', name: K.name || k.name || k.id, short: K.short || k.id, line: k.line, tier: k.tier, form: k.tier, species: null, lvl: k.lvl, el: el > 3 ? 4 : el,
    size: 'M', hp: k.hp != null ? Math.min(k.hp, st.hp) : st.hp, maxhp: st.hp, mp: st.mp, maxmp: st.mp, atk: st.atk, def: st.def, int: st.int, spd: st.spd, mov: st.mov, range: st.range.slice(),
    akind: L.id === 'mage' || L.id === 'cleric' ? 'magic' : L.id === 'ranger' ? 'ranged' : 'melee', fly: false, skills: B.skillsFor(k, L), ref: { t: 'k', id: k.id }, ruler: !!k.ruler, boss: k.id === 'gray', bond: st.bond, realm };
}
function mkMon(m, side, troop, realm) {
  const sp = G.get('monster', m.species), st = G.monStats(sp, m.form, m.lvl);
  return { id: 'm:' + m.id, side, troop, lead: false, kind: 'mon', name: sp.names[m.form], short: sp.names[m.form], species: m.species, line: -1, tier: m.form, form: m.form, lvl: m.lvl, el: sp.el, size: sp.size,
    hp: m.hp != null ? Math.min(m.hp, st.hp) : st.hp, maxhp: st.hp, mp: 0, maxmp: 0, atk: st.atk, def: st.def, int: st.int, spd: st.spd, mov: st.mov, range: st.range.slice(), akind: sp.kind,
    fly: sp.fly, skills: [], ref: { t: 'm', id: m.id }, bond: st.bond, realm };
}
/* spec: { seed, map, season, kind, sides: [{ realm, human, items:[], troops:[{ knight, mons:[] }] }, ...] } */
B.create = spec => {
  const tiles = G.seasonMap(spec.map, spec.season), rows = tiles.length, cols = tiles[0].length;
  const S = { v: 1, map: spec.map, season: spec.season, kind: spec.kind || 'field', cols, rows, tiles, rng: G.Rng.make(spec.seed || 1), bell: 1, phase: 0, over: false, winner: -1, reason: '',
    bells: spec.bells || G.tune.bells, units: [], sides: [], log: [], dials: 0, turns: 0 };
  spec.sides.forEach((sd, si) => {
    S.sides.push({ realm: sd.realm, human: !!sd.human, items: (sd.items || []).slice(), troops: [], name: sd.name || (G.REALMS[sd.realm] || {}).name });
    sd.troops.forEach((tr, ti) => {
      S.sides[si].troops.push({ broken: false, retreated: false });
      const kn = mkKnight(Object.assign({ realm: sd.realm }, tr.knight), si, ti); kn.uid = S.units.length; S.units.push(kn);
      for (const m of tr.mons) { const u = mkMon(m, si, ti, sd.realm); u.uid = S.units.length; S.units.push(u); }
    });
  });
  for (const u of S.units) { u.alive = u.hp > 0; u.gone = null; u.moved = false; u.acted = false; u.done = false; u.fx = {}; u.xp = 0; u.kills = 0; u.dmgDone = 0; }
  // deployment: side 0 on the left, side 1 on the right (the Keep is the defender's); extra sides take the top and bottom
  S.nsides = S.sides.length;
  const zone = (si, c, r) => si === 0 ? c <= 3 : si === 1 ? c >= cols - 4 : si === 2 ? r <= 2 && c >= 3 && c <= cols - 4 : r >= rows - 3 && c >= 3 && c <= cols - 4;
  for (let si = 0; si < S.nsides; si++) {
    const nT = S.sides[si].troops.length;
    for (let t = 0; t < nT; t++) {
      const anchor = si < 2 ? [si === 0 ? 1 : cols - 2, nT === 1 ? 4 : nT === 2 ? (t ? 6 : 2) : [1, 4, 7][t]] : [nT === 1 ? 5 : 3 + t * 4, si === 2 ? 1 : rows - 2];
      const mem = S.units.filter(u => u.side === si && u.troop === t);
      for (const u of mem) {
        const free = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const ch = B.tile(S, c, r); if (ch === '#' || ch === 'w' || !zone(si, c, r)) continue; if (S.units.some(o => o !== u && o.c === c && o.r === r)) continue; free.push([c, r]); }
        const a0 = u.lead ? anchor : [anchor[0] + (si === 0 ? -1 : si === 1 ? 1 : 0) * (mem.indexOf(u) % 2 ? 1 : 0), anchor[1] + (si > 1 ? (mem.indexOf(u) % 2 ? 1 : 0) * (si === 2 ? 1 : -1) : 0)];
        free.sort((x, y) => (H.dist(x, a0) - H.dist(y, a0)) || (x[1] - y[1]));
        const pick = free[0] || [0, 0]; u.c = pick[0]; u.r = pick[1];
      }
    }
  }
  B.beginPhase(S, 0, []);
  return S;
};
B.dialsHeld = S => { let n = 0; for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) if (S.tiles[r][c] === 'D') { const u = B.at(S, c, r); if (u && u.side === 0) n++; } return n; };
B.dialCount = S => { let n = 0; for (const row of S.tiles) for (const ch of row) if (ch === 'D') n++; return n; };

/* ---- movement ---- */
B.moveAllow = (S, u) => {
  let m = u.mov + G.tune.moveBonus * (S.sides[u.side].human ? 1 : 0);
  if (S.season === 3 && u.el !== 3) m -= 1;
  if (S.season === 2 && u.fly) m -= 1;
  if (u.fx.root) m = 0;
  return Math.max(u.fx.root ? 0 : 1, m);
};
B.reach = (S, u) => {
  const budget = B.moveAllow(S, u), best = new Map(), key = (c, r) => c + ',' + r;
  best.set(key(u.c, u.r), { c: u.c, r: u.r, cost: 0, from: null });
  const q = [[u.c, u.r, 0]];
  while (q.length) {
    q.sort((a, b) => a[2] - b[2]); const [c, r, cost] = q.shift();
    if (cost > best.get(key(c, r)).cost) continue;
    for (const [nc, nr] of H.nb(c, r)) {
      if (nc < 0 || nr < 0 || nc >= S.cols || nr >= S.rows) continue;
      const ch = B.tile(S, nc, nr), t = G.TERRAIN[ch] || G.TERRAIN['.'];
      let step = u.fly ? (ch === '#' ? 99 : 1) : t.cost;
      if (step >= 99) continue;
      const occ = B.at(S, nc, nr); if (occ && occ.side !== u.side) continue;
      const nc2 = cost + step; if (nc2 > budget) continue;
      const k = key(nc, nr), old = best.get(k);
      if (!old || nc2 < old.cost) { best.set(k, { c: nc, r: nr, cost: nc2, from: key(c, r) }); q.push([nc, nr, nc2]); }
    }
  }
  const out = new Map();
  for (const [k, v] of best) { const o = B.at(S, v.c, v.r); if (!o || o === u) out.set(k, v); }
  out._all = best;
  return out;
};
B.pathTo = (reach, c, r) => { const p = []; let k = c + ',' + r; while (k) { const v = reach._all.get(k); if (!v) break; p.unshift([v.c, v.r]); k = v.from; } return p; };

/* ---- attack geometry ---- */
B.inRange = (u, from, tgt, rng) => { const d = H.dist(from, [tgt.c, tgt.r]); const [a, b] = rng || u.range; return d >= a && d <= b || (d === 1 && u.akind !== 'melee'); };
B.targetsFrom = (S, u, from) => B.live(S).filter(t => t.side !== u.side && B.inRange(u, from, t));
B.ward = (S, u) => {   // monsters outside their knight's ward fight at a penalty
  if (u.kind === 'knight') return true;
  const k = S.units.find(o => o.side === u.side && o.troop === u.troop && o.lead);
  return !k || !k.alive || k.gone || H.dist([u.c, u.r], [k.c, k.r]) <= 4;
};
B.damage = (S, a, d, mult, akind, o = {}) => {
  const T = G.tune, magic = akind === 'magic';
  let atk = magic ? a.int : a.atk;
  if (a.kind === 'mon' && !B.ward(S, a)) atk *= (1 - T.wardPenalty);
  let def = d.def * (magic ? .35 : .5);
  if (d.kind === 'mon' && !B.ward(S, d)) def *= (1 - T.wardPenalty);
  let v = Math.max(1, atk * mult - def);
  const el = o.el === undefined ? a.el : o.el;
  if (el < 4 && d.el < 4 && d.el === G.opposite(el)) v *= 1 + T.opposed; else if (el < 4 && d.el === el) v *= .9;
  if (el === S.season) v *= 1 + T.tide;
  if (d.el === S.season) v *= 1 - T.tide / 2;
  const tt = G.TERRAIN[B.tile(S, d.c, d.r)] || {}; v *= 1 - (d.fly ? 0 : (tt.def || 0));
  if (a.fx.atkUp) v *= 1.25; if (d.fx.defUp) v *= .8; if (d.fx.defDown) v *= 1.3;
  if (S.season === 2 && akind !== 'melee') v *= .85;
  if (d.boss && S.map === 'sanctum') v *= Math.max(.15, 1 - (.8 - B.dialsHeld(S) * T.dialShield));
  v *= S.sides[a.side].human ? T.dmgMul : (S.sides[d.side].human ? T.enemyDmg : 1);
  if (o.rand !== false) v *= .9 + G.Rng.next(S.rng) * .2;
  if (G.cheat.god && S.sides[d.side].human && !S.sides[a.side].human) return 1;
  if (G.cheat.oneHit && S.sides[a.side].human && !S.sides[d.side].human) return 9999;
  return Math.max(1, Math.round(v * (o.adj ? .7 : 1)));
};
B.hitChance = (S, a, d, akind) => {
  let h = akind === 'melee' ? .92 + G.sizeHit(a.size, d.size) : .95;
  if (S.season === 2 && akind !== 'melee') h -= .05;
  return G.clamp(h, .55, 1);
};
B.forecast = (S, a, d, skill, from) => {
  const sk = skill && G.get('skill', skill), mult = sk ? sk.power : 1, akind = sk && (sk.kind === 'aoe' && sk.base === 'bolt') ? 'magic' : a.akind;
  const adj = !sk && a.akind !== 'melee' && H.dist(from || [a.c, a.r], [d.c, d.r]) === 1;
  const ak = sk ? (sk.base === 'bolt' ? 'magic' : sk.base === 'cleave' ? 'melee' : 'ranged') : akind;
  const dm = B.damage(S, a, d, mult, ak, { rand: false, adj });
  return { dmg: dm, lo: Math.max(1, Math.round(dm * .9)), hi: Math.round(dm * 1.1), hit: sk ? 1 : B.hitChance(S, a, d, ak), kill: dm >= d.hp };
};
B.captureChance = (S, k, t) => {
  if (t.kind !== 'mon' || t.hp / t.maxhp >= .5) return 0;
  let p = .22 + (1 - t.hp / t.maxhp) * .55 - t.tier * .08 + (B.ward(S, t) ? 0 : .2) + (k.lvl - t.lvl) * .015;
  return G.clamp(p * G.tune.capture, 0, .95);
};

/* ---- phases and bells ---- */
B.beginPhase = (S, side, ev) => {
  S.phase = side;
  for (const u of B.live(S, side)) {
    u.moved = u.acted = u.done = false;
    for (const k of Object.keys(u.fx)) { if (u.fx[k] > 0) u.fx[k]--; if (u.fx[k] <= 0) delete u.fx[k]; }
    if (u.fx.daze) { u.done = true; u.acted = u.moved = true; }
    if (u.kind === 'mon' && G.get('monster', u.species).passive === 'regen' && u.hp < u.maxhp) { const h = Math.min(3, u.maxhp - u.hp); u.hp += h; ev.push({ k: 'heal', u: u.uid, by: u.uid, amt: h }); }
    if (B.tile(S, u.c, u.r) === 'F' && !u.fly) { const d = Math.max(2, Math.round(u.maxhp * .08)); u.hp -= d; ev.push({ k: 'fire', u: u.uid, dmg: d }); if (u.hp <= 0) B.fall(S, u, null, ev); }
  }
  ev.push({ k: 'phase', side, bell: S.bell });
  B.checkOver(S, ev);
};
B.sideAlive = (S, si) => S.sides[si].troops.some(t => !t.broken && !t.retreated);
B.endPhase = (S, ev) => {
  if (S.over) return;
  for (const u of B.live(S, S.phase)) u.done = true;
  let next = -1, wrap = false;
  for (let k = 1; k <= S.nsides; k++) { const si = (S.phase + k) % S.nsides; if (B.sideAlive(S, si)) { next = si; wrap = si <= S.phase; break; } }
  if (next < 0) { B.checkOver(S, ev); return; }
  if (!wrap) { B.beginPhase(S, next, ev); return; }
  // end of a full bell
  if (S.bell >= S.bells) {
    let keepSide = -1; for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) if (B.tile(S, c, r) === 'K') { const o = B.at(S, c, r); if (o && o.kind === 'knight') keepSide = o.side; }
    S.over = true;
    if (S.nsides === 2) { S.winner = keepSide === 0 ? 0 : 1; S.reason = keepSide === 0 ? 'keep' : 'bells'; }
    else { let best = -1, bv = -1; for (let si = 0; si < S.nsides; si++) { const v = B.live(S, si).reduce((a, u) => a + u.hp, 0) + (si === keepSide ? 1e4 : 0); if (v > bv) { bv = v; best = si; } } S.winner = best; S.reason = keepSide === best ? 'keep' : 'bells'; }
    ev.push({ k: 'over', winner: S.winner, reason: S.reason }); return;
  }
  S.bell++; ev.push({ k: 'bell', n: S.bell });
  B.beginPhase(S, next, ev);
};
B.fall = (S, u, by, ev) => {
  u.hp = 0; u.alive = false; u.gone = 'down';
  if (by) { by.kills++; by.xp += 14 + u.lvl * 3; }
  ev.push({ k: 'down', u: u.uid, by: by ? by.uid : -1 });
  if (u.kind === 'knight') {
    const tr = S.sides[u.side].troops[u.troop]; tr.broken = true;
    for (const m of S.units) if (m.side === u.side && m.troop === u.troop && m.alive && !m.gone) { m.gone = 'fled'; ev.push({ k: 'flee', u: m.uid }); }
    ev.push({ k: 'break', side: u.side, troop: u.troop });
    if (u.ruler) for (const t of S.sides[u.side].troops) t.broken = true;
  }
  B.checkOver(S, ev);
};
B.checkOver = (S, ev) => {
  if (S.over) return;
  const alive = []; for (let si = 0; si < S.nsides; si++) if (B.sideAlive(S, si)) alive.push(si);
  if (alive.length <= 1) { S.over = true; S.winner = alive.length ? alive[0] : (S.nsides === 2 ? 1 : 0); S.reason = 'routed'; ev.push({ k: 'over', winner: S.winner, reason: 'routed' }); }
};
const gain = (u, n) => { u.xp += n; };

/* ---- commands ---- */
B.canAct = (S, u) => !S.over && u && u.alive && !u.gone && u.side === S.phase && !u.done;
B.apply = (S, cmd) => {
  const ev = [], u = cmd.u !== undefined ? S.units[cmd.u] : null;
  if (S.over) return null;
  if (cmd.t === 'endphase') { B.endPhase(S, ev); S.turns++; return ev; }
  if (!B.canAct(S, u)) return null;
  switch (cmd.t) {
    case 'move': {
      if (u.moved) return null;
      const rc = B.reach(S, u), v = rc.get(cmd.to[0] + ',' + cmd.to[1]); if (!v) return null;
      const path = B.pathTo(rc, cmd.to[0], cmd.to[1]); u.c = cmd.to[0]; u.r = cmd.to[1]; u.moved = true;
      ev.push({ k: 'move', u: u.uid, path }); break;
    }
    case 'wait': u.done = true; u.acted = true; ev.push({ k: 'wait', u: u.uid }); break;
    case 'attack': {
      if (u.acted) return null; const d = S.units[cmd.target]; if (!d || !d.alive || d.gone || d.side === u.side || !B.inRange(u, [u.c, u.r], d)) return null;
      const adj = u.akind !== 'melee' && H.dist([u.c, u.r], [d.c, d.r]) === 1;
      const hit = G.Rng.next(S.rng) < B.hitChance(S, u, d, u.akind);
      const ev1 = { k: 'hit', a: u.uid, d: d.uid, akind: u.akind, miss: !hit, dmg: 0 };
      if (hit) { const dm = B.damage(S, u, d, 1, u.akind, { adj }); d.hp -= dm; ev1.dmg = dm; u.dmgDone += dm; gain(u, Math.round(dm * .45 * G.tune.expMul)); }
      ev.push(ev1); u.acted = u.done = true;
      if (d.hp <= 0) B.fall(S, d, u, ev); break;
    }
    case 'skill': {
      const sk = G.get('skill', cmd.skill); if (!sk || !u.skills.includes(sk.id) || u.acted || u.mp < sk.mp) return null;
      if (u.moved && !sk.mobile) return null;
      const out = B.doSkill(S, u, sk, cmd, ev); if (!out) return null;
      u.mp -= sk.mp; u.acted = u.done = true; break;
    }
    case 'bind': {
      if (u.acted || u.kind !== 'knight') return null; const t = S.units[cmd.target];
      if (!t || !t.alive || t.gone || t.side === u.side || H.dist([u.c, u.r], [t.c, t.r]) > 2) return null;
      const p = B.captureChance(S, u, t); if (p <= 0) return null;
      const ok = G.Rng.next(S.rng) < p; ev.push({ k: 'bind', a: u.uid, d: t.uid, ok, p });
      if (ok) { t.side = u.side; t.troop = u.troop; t.moved = t.acted = t.done = true; t.captured = true; t.fx = {}; ev.push({ k: 'captured', u: t.uid }); gain(u, 18); }
      u.acted = u.done = true; B.checkOver(S, ev); break;
    }
    case 'item': {
      const it = G.get('item', cmd.item), pool = S.sides[u.side].items, ix = pool.indexOf(cmd.item); const t = S.units[cmd.target];
      if (!it || ix < 0 || u.acted || u.kind !== 'knight' || !t || !t.alive || t.gone || t.side !== u.side || H.dist([u.c, u.r], [t.c, t.r]) > 1) return null;
      if (it.heal) { const h = Math.min(it.heal, t.maxhp - t.hp); t.hp += h; ev.push({ k: 'heal', u: t.uid, by: u.uid, amt: h }); }
      else if (it.mp) { if (t.kind !== 'knight') return null; t.mp = Math.min(t.maxmp, t.mp + it.mp); ev.push({ k: 'mana', u: t.uid, amt: it.mp }); }
      else return null;
      pool.splice(ix, 1); ev.push({ k: 'item', u: u.uid, item: cmd.item }); u.acted = u.done = true; break;
    }
    case 'retreat': {
      if (u.kind !== 'knight') return null; if (u.ruler) return null;
      u.gone = 'fled'; const tr = S.sides[u.side].troops[u.troop]; tr.retreated = true;
      for (const m of S.units) if (m.side === u.side && m.troop === u.troop && m.alive && !m.gone) m.gone = 'fled';
      ev.push({ k: 'retreat', u: u.uid }); B.checkOver(S, ev); break;
    }
    default: return null;
  }
  return ev;
};
B.doSkill = (S, u, sk, cmd, ev) => {
  const pos = [u.c, u.r], tgtU = cmd.target !== undefined ? S.units[cmd.target] : null, hexT = cmd.hex || (tgtU ? [tgtU.c, tgtU.r] : null);
  const inR = h => { const d = H.dist(pos, h); return d >= sk.range[0] && d <= sk.range[1]; };
  const hits = [];
  switch (sk.kind) {
    case 'aoe': {
      let centre = pos;
      if (sk.target === 'hex') { if (!hexT || !inR(hexT)) return false; centre = hexT; }
      const foes = B.live(S).filter(t => t.side !== u.side && H.dist(centre, [t.c, t.r]) <= sk.radius);
      if (!foes.length) return false;
      const ak = sk.base === 'bolt' ? 'magic' : sk.base === 'volley' ? 'ranged' : 'melee';
      ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: centre, el: u.el });
      for (const t of foes) {
        const dm = B.damage(S, u, t, sk.power, ak, sk.el !== undefined ? { el: sk.el } : {}); t.hp -= dm; u.dmgDone += dm; gain(u, Math.round(dm * .45 * G.tune.expMul)); ev.push({ k: 'hit', a: u.uid, d: t.uid, akind: ak, miss: false, dmg: dm, skill: sk.id }); hits.push(t);
      }
      for (const t of hits) if (t.hp <= 0 && t.alive) B.fall(S, t, u, ev);
      return true;
    }
    case 'root': case 'debuff': {
      if (!tgtU || tgtU.side === u.side || !tgtU.alive || tgtU.gone || !inR([tgtU.c, tgtU.r])) return false;
      ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: [tgtU.c, tgtU.r], el: u.el });
      if (sk.kind === 'root') { tgtU.fx.root = 3; ev.push({ k: 'fx', u: tgtU.uid, fx: 'root' }); const dm = B.damage(S, u, tgtU, sk.power, 'ranged'); tgtU.hp -= dm; ev.push({ k: 'hit', a: u.uid, d: tgtU.uid, akind: 'ranged', miss: false, dmg: dm, skill: sk.id }); if (tgtU.hp <= 0) B.fall(S, tgtU, u, ev); }
      else { tgtU.fx.defDown = 4; ev.push({ k: 'fx', u: tgtU.uid, fx: 'defDown' }); }
      return true;
    }
    case 'heal': {
      if (!tgtU || tgtU.side !== u.side || !tgtU.alive || tgtU.gone || !inR([tgtU.c, tgtU.r])) return false;
      const amt = Math.min(tgtU.maxhp - tgtU.hp, Math.round(u.int * sk.power + 6)); if (amt <= 0) return false;
      tgtU.hp += amt; ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: [tgtU.c, tgtU.r], el: u.el }); ev.push({ k: 'heal', u: tgtU.uid, by: u.uid, amt }); return true;
    }
    case 'buff': {
      const grp = B.live(S, u.side).filter(t => t.troop === u.troop && (sk.target !== 'monsters' || t.kind === 'mon'));
      ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: pos, el: u.el });
      for (const t of grp) { t.fx[sk.fx] = 4; ev.push({ k: 'fx', u: t.uid, fx: sk.fx }); }
      return true;
    }
    case 'daze': {
      const foes = B.live(S).filter(t => t.side !== u.side && H.dist(pos, [t.c, t.r]) === 1); if (!foes.length) return false;
      ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: pos, el: u.el });
      for (const t of foes) { t.fx.daze = 2; ev.push({ k: 'fx', u: t.uid, fx: 'daze' }); }
      return true;
    }
  }
  return false;
};
/* ---- results ---- */
B.result = S => {
  const per = S.units.map(u => ({ id: u.id, ref: u.ref, side: u.side, hp: u.hp, alive: u.alive, gone: u.gone, xp: u.xp, kills: u.kills, captured: !!u.captured, lvl: u.lvl, name: u.name, dmgDone: u.dmgDone }));
  return { winner: S.winner, reason: S.reason, bell: S.bell, units: per };
};


/* ===== 21-ai-battle.js ===== */
/* ---- Battle AI: stateless planner. Each call returns the next command for the side whose phase it is. ---- */
const BA = G.BattleAI = {};
const nearestFoe = (S, u, from) => { let b = null, bd = 99; for (const t of B.live(S)) if (t.side !== u.side) { const d = H.dist(from, [t.c, t.r]); if (d < bd) { bd = d; b = t; } } return [b, bd]; };
const keepHex = S => { for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) if (S.tiles[r][c] === 'K') return [c, r]; return [Math.floor(S.cols / 2), Math.floor(S.rows / 2)]; };
const threat = (S, u, hex) => {
  let t = 0;
  for (const e of B.live(S)) if (e.side !== u.side) { const d = H.dist(hex, [e.c, e.r]); if (d <= e.mov + e.range[1]) t += (e.atk + e.int) * .3 / Math.max(8, u.maxhp) * 10; }
  return t * (u.kind === 'knight' ? 1.7 : 1);
};
BA.plans = (S, u) => {
  const rc = u.moved ? new Map([[u.c + ',' + u.r, { c: u.c, r: u.r }]]) : B.reach(S, u), plans = [];
  const kh = keepHex(S), human = S.sides[u.side].human;
  const attackerObjective = u.side === 0;
  for (const v of rc.values()) {
    const from = [v.c, v.r], here = v.c === u.c && v.r === u.r;
    let base = -threat(S, u, from) * (S.sides[u.side].aggr || 1);
    const [nf, nd] = nearestFoe(S, u, from);
    // approach term when nothing to hit
    let approach = 0;
    if (attackerObjective && S.bell >= S.bells - 3 && u.kind === 'knight') approach = -H.dist(from, kh) * 3;
    else if (!attackerObjective && nd > u.mov + u.range[1] + 2) approach = -Math.max(0, H.dist(from, kh) - 3) * 1.5 - (u.kind === 'knight' ? 0 : 0);
    else approach = -nd * (u.akind === 'melee' ? 2.2 : 1.2) + (u.kind === 'knight' ? -Math.max(0, 2 - nd) * 0 : 0);
    if (u.akind !== 'melee' && nf) approach += Math.abs(nd - u.range[1]) === 0 ? 3 : 0;
    // keep monsters near their knight (the ward)
    if (u.kind === 'mon' && !u.fx.root) { const k = S.units.find(o => o.side === u.side && o.troop === u.troop && o.lead && o.alive && !o.gone); if (k) { const dk = H.dist(from, [k.c, k.r]); if (dk > 4) approach -= (dk - 4) * 4; } }
    const wait = { to: from, here, act: { t: 'wait' }, score: base + approach };
    plans.push(wait);
    if (u.acted) continue;
    for (const t of B.targetsFrom(S, u, from)) {
      const f = B.forecast(S, u, t, null, from), dmg = Math.min(f.dmg, t.hp);
      let s = base + dmg / t.maxhp * 100 * f.hit + (f.kill ? 45 : 0) + (t.kind === 'knight' ? 25 : 0) + (f.kill && t.lead ? 90 : 0) + 20;
      if (u.akind !== 'melee') s += H.dist(from, [t.c, t.r]) * 2;
      plans.push({ to: from, here, act: { t: 'attack', target: t.uid }, score: s });
    }
    if (u.kind === 'knight') {
      if (!u.moved || here) {
        for (const sid of u.skills) {
          const sk = G.get('skill', sid); if (u.mp < sk.mp || (u.moved && !sk.mobile)) continue;
          let best = null;
          const mk = (act, s) => { if (!best || s > best.score) best = { to: from, here, act, score: base + s }; };
          const foes = B.live(S).filter(t => t.side !== u.side), allies = B.live(S, u.side).filter(t => t.troop === u.troop);
          const sd = (h) => { const d = H.dist(from, h); return d >= sk.range[0] && d <= sk.range[1]; };
          if (sk.kind === 'aoe') {
            const centres = sk.target === 'self' ? [from] : [...Array(S.rows * S.cols).keys()].map(i => [i % S.cols, Math.floor(i / S.cols)]).filter(sd);
            for (const cn of (sk.target === 'self' ? [from] : foes.map(f => [f.c, f.r]))) {
              if (sk.target !== 'self' && !sd(cn)) continue;
              let sum = 0, n = 0;
              for (const t of foes) if (H.dist(cn, [t.c, t.r]) <= sk.radius) { const fc = B.forecast(S, u, t, sid, from); sum += Math.min(fc.dmg, t.hp) / t.maxhp * 100 + (fc.kill ? 40 : 0) + (t.kind === 'knight' ? 15 : 0); n++; }
              if (n) mk({ t: 'skill', skill: sid, hex: cn }, sum + 10);
            }
          } else if (sk.kind === 'heal') {
            for (const a of B.live(S, u.side)) if (sd([a.c, a.r]) && a.hp < a.maxhp * .6) mk({ t: 'skill', skill: sid, target: a.uid }, (1 - a.hp / a.maxhp) * 90 + (a.kind === 'knight' ? 20 : 0));
          } else if (sk.kind === 'buff') {
            const near = foes.some(f => H.dist(from, [f.c, f.r]) <= 7);
            const already = allies.some(a => a.fx[sk.fx]);
            if (near && !already && allies.length > 1) mk({ t: 'skill', skill: sid }, 22 + allies.length * 3);
          } else if (sk.kind === 'root' || sk.kind === 'debuff') {
            for (const f of foes) if (sd([f.c, f.r]) && !f.fx.root && !f.fx.defDown) mk({ t: 'skill', skill: sid, target: f.uid }, 16 + (f.kind === 'knight' ? 14 : 0) + f.atk * .6);
          } else if (sk.kind === 'daze') {
            const n = foes.filter(f => H.dist(from, [f.c, f.r]) === 1 && !f.fx.daze).length; if (n >= 2) mk({ t: 'skill', skill: sid }, 18 * n);
          }
          if (best) plans.push(best);
        }
        // bind weakened monsters
        for (const t of B.live(S)) if (t.side !== u.side && t.kind === 'mon' && H.dist(from, [t.c, t.r]) <= 2) { const p = B.captureChance(S, u, t); if (p > .2 && !u.moved === !u.moved) plans.push({ to: from, here, act: { t: 'bind', target: t.uid }, score: base + p * 70 + 10 }); }
      }
      if (S.sides[u.side].items.includes('potion')) for (const a of B.live(S, u.side)) if (H.dist(from, [a.c, a.r]) <= 1 && a.hp < a.maxhp * .4) plans.push({ to: from, here, act: { t: 'item', item: 'potion', target: a.uid }, score: base + 30 });
    }
  }
  return plans;
};
BA.step = S => {
  if (S.over) return null;
  const mine = B.live(S, S.phase).filter(u => !u.done);
  if (!mine.length) return { t: 'endphase' };
  let best = null;
  for (const u of mine) {
    const plans = BA.plans(S, u); if (!plans.length) continue;
    const order = u.kind === 'knight' ? 0 : 3;   // knights just a little later than eager strikers; deterministic tie-break by uid
    for (const p of plans) { const sc = p.score + (p.act.t === 'wait' ? -20 : 0) - order * .1 - u.uid * .001; if (!best || sc > best.sc) best = { sc, u, p }; }
  }
  if (!best) return { t: 'endphase' };
  const { u, p } = best;
  if (!u.moved && !p.here) return { t: 'move', u: u.uid, to: p.to };
  return Object.assign({ u: u.uid }, p.act);
};
/* run a whole battle on the AI (Delegate, the campaign's other battles, the attract reel, the bot) */
BA.auto = (S, cap = 1800, evOut) => {
  let n = 0;
  while (!S.over && n++ < cap) { const c = BA.step(S); if (!c) break; const ev = B.apply(S, c); if (!ev) { if (c.t === 'endphase') break; B.apply(S, { t: 'wait', u: c.u }) || B.apply(S, { t: 'endphase' }); } else if (evOut) evOut.push(...ev); }
  if (!S.over) { S.over = true; S.winner = 1; S.reason = 'stalled'; }
  return S;
};


/* ===== 22-sim-campaign.js ===== */
/* ---- CampaignSim: the calendar, the economy, the castles, the marches. Pure and deterministic (state is JSON). ---- */
const C = G.Campaign = {};
const R = G.Rng;
C.isHuman = (S, r) => (S.humans || [S.human]).includes(r);
C.activeHumans = S => S.humans.filter(r => S.realms[r].alive && C.castlesOf(S, r).length);
C.nextSeat = S => { const act = C.activeHumans(S); const i = act.indexOf(S.human); if (i >= 0 && i + 1 < act.length) { S.human = act[i + 1]; S.seat = i + 1; return true; } return false; };
const xpNeed = lvl => 30 + lvl * 15;
C.xpNeed = xpNeed;
C.DIFF = { Easy: { candle: 4, human: 1.25, ai: .85 }, Normal: { candle: 0, human: 1, ai: 1 }, Hard: { candle: -2, human: .9, ai: 1.2 } };
C.mon = (S, id) => S.mons[id];
C.knightsOf = (S, realm) => Object.values(S.knights).filter(k => k.realm === realm && k.at != null);
C.castlesOf = (S, realm) => S.castles.filter(c => c.owner === realm);
C.newMon = (S, species, lvl, castle, realm, form = 0) => { const id = 'M' + (S.nextMon++); S.mons[id] = { id, species, form, lvl, xp: 0, hp: null, owner: null, at: castle, realm }; if (castle != null) S.castles[castle].reserve.push(id); return S.mons[id]; };
C.addKnight = (S, id, realm, castle, extra = {}) => {
  const K = G.KNIGHTS[id];
  S.knights[id] = Object.assign({ id, realm, line: K.line, tier: K.role === 'ruler' ? 1 : id === 'gray' ? 2 : 0, lvl: K.lvl, xp: 0, hp: null, equip: {}, mons: [], at: castle, wounded: 0, quest: null, moved: false, marched: false, ruler: K.role === 'ruler' || K.role === 'brigand' }, extra);
  if (castle != null) S.castles[castle].knights.push(id);
  return S.knights[id];
};
const speciesForRealm = realm => G.all('monster').filter(m => (G.REALMS[realm].season === 4 ? m.el === 4 : m.el === G.REALMS[realm].season)).map(m => m.id);

C.create = (opt = {}) => {
  const humans = opt.humans && opt.humans.length ? opt.humans.slice() : [opt.human != null ? opt.human : 0], human = humans[0], seed = opt.seed || 1;
  const S = { v: 1, seed, rng: R.make(seed), year: 1, season: 0, turn: 0, phase: 'tidings', candle: null, difficulty: opt.difficulty || 'Normal', human, humans, seat: 0, nextMon: 1,
    realms: G.REALMS.map(r => ({ id: r.id, mana: r.id === 4 ? 300 : r.id === 5 ? 0 : Math.round(G.tune.startMana), items: [], alive: true })), castles: [], knights: {}, mons: {}, flags: {}, cards: [], queue: [], marches: [], over: null,
    stats: { battles: 0, wins: 0, captured: 0, castles: 0, deaths: 0 }, stillCastle: -1, eventsDone: {}, pending: [], log: [] };
  G.CASTLES.forEach((c, i) => S.castles.push({ id: c.id, owner: G.CASTLE_OWNER[i], knights: [], reserve: [], stilled: false, taken: false, summons: 0 }));
  const place = { elaine: 1, percival: 2, bors: 3, gawain: 4, lamorak: 5, dagonet: 6, ragnell: 7, kay: 8, tristan: 9, nimue: 10, bedivere: 11, palamedes: 12, vesper: 0, gray: 0, tarry: 13, lull: 14, maelgwn: 15, wick: 16 };
  Object.assign(place, G.MORE_PLACE);
  for (const id in place) { const K = G.KNIGHTS[id]; C.addKnight(S, id, K.realm, place[id]); }
  for (const id of G.FREE_KNIGHTS) C.addKnight(S, id, 5, null, { free: true });
  for (const k of Object.values(S.knights)) {
    if (k.at == null) continue;
    const pool = k.realm === 5 ? ['bone', 'wolf', 'raven'] : speciesForRealm(k.realm), n = k.ruler ? 3 : 2;
    for (let i = 0; i < n; i++) { const m = C.newMon(S, R.pick(S.rng, pool), Math.max(1, Math.floor(k.lvl / 2)), null, k.realm); S.castles[k.at].reserve.length; m.at = k.at; m.owner = k.id; k.mons.push(m.id); }
  }
  S.castles.forEach(c => { c.treasury = (c.id % 3 === 0) ? R.pick(S.rng, G.ITEM_IDS.filter(i => !['seed', 'writ'].includes(i))) : null; });
  for (const h of humans) S.realms[h].items.push('potion', 'potion');
  return S;
};

/* ---- derived numbers ---- */
C.monCount = (S, realm) => Object.values(S.mons).filter(m => m.realm === realm && m.at != null).length;
C.upkeepOf = (S, realm) => {
  let u = 0; const winter = S.season === 3;
  for (const m of Object.values(S.mons)) if (m.realm === realm && m.at != null) { const sp = G.get('monster', m.species); u += sp.bond * 1.5 * (winter && sp.el !== 3 ? 1 + G.tune.winterUpkeep : 1); }
  return Math.round(u * G.tune.upkeep);
};
C.incomeOf = (S, realm) => {
  let v = 0;
  for (const c of C.castlesOf(S, realm)) { if (c.stilled) continue; const cd = G.CASTLES[c.id]; v += G.castleYield(cd) * (cd.region === S.season ? 1 + G.tune.seasonYield : 1); }
  const d = C.DIFF[S.difficulty]; v *= C.isHuman(S, realm) ? d.human : (realm === 5 ? 0 : d.ai);
  return Math.round(v * G.tune.manaIncome);
};
C.summonCost = sp => Math.round(sp.cost * G.tune.summonCost);
C.bondUsed = (S, k) => k.mons.reduce((a, id) => a + G.get('monster', S.mons[id].species).bond, 0);
C.bondCap = (S, k) => G.knightStats(k).bond;
C.power = (S, k) => { const st = G.knightStats(k); let p = st.atk + st.int + st.def + st.hp / 3; for (const id of k.mons) { const m = S.mons[id], s = G.monStats(G.get('monster', m.species), m.form, m.lvl); p += s.atk + s.int + s.def + s.hp / 3; } return p; };
C.nextSeason = S => ({ year: S.season === 3 ? S.year + 1 : S.year, season: (S.season + 1) % 4 });
C.label = S => G.SEASONS[S.season] + ', Year ' + S.year;
C.seasonsLeft = S => S.candle;
const log = (S, text, kind = 'info') => { S.cards.push({ kind, text }); };

/* ---- leveling and promotion ---- */
C.grant = (S, ent, xp, out) => {
  ent.xp += xp; let up = 0;
  while (ent.xp >= xpNeed(ent.lvl) && ent.lvl < 40) { ent.xp -= xpNeed(ent.lvl); ent.lvl++; up++; }
  if (up && out) out.push({ id: ent.id, up, lvl: ent.lvl });
  return up;
};
C.canPromoteMon = (S, m, seed) => { const hour = G.get('monster', m.species).el === 4; if (m.form >= 2) return false; const need = m.form === 0 ? 12 : 22, seeded = m.form === 0 ? 6 : 16; return m.lvl >= need || (!hour && seed && m.lvl >= seeded); };
C.canPromoteKnight = (S, k, writ) => (k.tier === 0 && k.lvl >= 10) || (k.tier === 1 && k.lvl >= 20 && writ);

/* ---- Muster actions. Each returns { ok, text } ---- */
const myRealm = (S, id) => S.realms[id];
C.summon = (S, castleId, species) => {
  const c = S.castles[castleId], sp = G.get('monster', species), cd = G.CASTLES[castleId], realm = myRealm(S, c.owner);
  if (!sp || !cd.circle.includes(species)) return { ok: false, text: 'That circle cannot call it.' };
  if (c.stilled) return { ok: false, text: 'The castle is Stilled.' };
  if (c.summons >= 3) return { ok: false, text: 'The circle is tired: three summonings a season.' };
  const cost = C.summonCost(sp); if (realm.mana < cost) return { ok: false, text: 'Not enough mana.' };
  const avg = C.knightsOf(S, c.owner).reduce((a, k, _, arr) => a + k.lvl / arr.length, 0) || 2;
  realm.mana -= cost; c.summons++;
  const m = C.newMon(S, species, Math.max(1, Math.floor(avg / 2)), castleId, c.owner);
  return { ok: true, text: sp.names[0] + ' answers the circle.', mon: m };
};
C.bind = (S, monId, knightId) => {
  const m = S.mons[monId], k = S.knights[knightId];
  if (!m || !k || m.at !== k.at || m.owner) return { ok: false, text: 'Not here.' };
  if (k.mons.length >= 4) return { ok: false, text: 'A troop holds four monsters.' };
  const sp = G.get('monster', m.species); if (C.bondUsed(S, k) + sp.bond > C.bondCap(S, k)) return { ok: false, text: 'Beyond ' + G.KNIGHTS[k.id].short + '\'s Bond.' };
  const c = S.castles[m.at]; c.reserve.splice(c.reserve.indexOf(monId), 1); m.owner = knightId; k.mons.push(monId); return { ok: true, text: 'Bound.' };
};
C.unbind = (S, monId) => {
  const m = S.mons[monId]; if (!m || !m.owner) return { ok: false };
  const k = S.knights[m.owner]; k.mons.splice(k.mons.indexOf(monId), 1); m.owner = null; S.castles[m.at].reserve.push(monId); return { ok: true, text: 'Released to the reserve.' };
};
C.dismiss = (S, monId) => { const m = S.mons[monId]; if (!m || m.owner) return { ok: false }; const c = S.castles[m.at]; c.reserve.splice(c.reserve.indexOf(monId), 1); delete S.mons[monId]; return { ok: true, text: 'Dismissed.' }; };
C.moveKnight = (S, knightId, to) => {
  const k = S.knights[knightId], from = S.castles[k.at];
  if (k.moved || k.wounded || k.quest) return { ok: false, text: 'Cannot move now.' };
  if (!G.ADJ[k.at].includes(to) || S.castles[to].owner !== k.realm) return { ok: false, text: 'Only to a neighbouring castle of your own.' };
  if (from.stilled || S.castles[to].stilled) return { ok: false, text: 'A Stilled castle holds fast.' };
  if (S.castles[to].knights.length >= 6) return { ok: false, text: 'Full.' };
  from.knights.splice(from.knights.indexOf(knightId), 1); S.castles[to].knights.push(knightId); k.at = to; k.moved = true;
  for (const id of k.mons) S.mons[id].at = to; return { ok: true, text: 'Marched to ' + G.CASTLES[to].short + '.' };
};
C.questWeights = (S, k) => {
  const L = k.line, w = { treasure: 30, beast: 20, wanderer: Object.values(S.knights).some(x => x.free && !x.joined) ? 10 : 0, mana: 15, training: 15, mishap: 10 };
  if (L === 3) w.treasure += 10; if (L === 4) w.beast += 15; if (L === 1) w.wanderer += w.wanderer ? 10 : 0; if (k.lvl >= 10) w.mishap -= 5;
  return w;
};
C.canQuest = (S, k) => !k.ruler && !k.wounded && !k.quest && !k.moved && !k.free && Object.values(S.knights).filter(x => x.realm === k.realm && x.quest).length < 2 && !S.castles[k.at].stilled;
C.quest = (S, knightId) => {
  const k = S.knights[knightId]; if (!C.canQuest(S, k)) return { ok: false, text: 'Cannot quest now.' };
  const w = C.questWeights(S, k), tot = Object.values(w).reduce((a, b) => a + b, 0); let r = R.next(S.rng) * tot, out = 'mana';
  for (const key in w) { if (r < w[key]) { out = key; break; } r -= w[key]; }
  const site = G.SITES[k.at], cd = G.CASTLES[k.at];
  k.quest = { site: site[0], left: site[1], outcome: out, castle: k.at, roll: R.int(S.rng, 1000) };
  const c = S.castles[k.at]; c.knights.splice(c.knights.indexOf(knightId), 1); k.moved = true;
  return { ok: true, text: G.KNIGHTS[k.id].short + ' rides for ' + site[0] + '.' };
};
C.equip = (S, knightId, item) => {
  const k = S.knights[knightId], it = G.get('item', item), pool = S.realms[k.realm].items; const ix = pool.indexOf(item);
  if (!it || ix < 0 || !['w', 'a', 'c'].includes(it.slot)) return { ok: false, text: 'Cannot equip that.' };
  const old = k.equip[it.slot]; if (old) pool.push(old); k.equip[it.slot] = item; pool.splice(pool.indexOf(item), 1); return { ok: true, text: G.KNIGHTS[k.id].short + ' takes the ' + it.name + '.' };
};
C.useItem = (S, realm, item, target) => {
  const pool = S.realms[realm].items, ix = pool.indexOf(item); if (ix < 0) return { ok: false, text: 'None left.' };
  if (item === 'seed') { const m = S.mons[target]; if (!m || !C.canPromoteMon(S, m, true) || C.canPromoteMon(S, m, false)) return { ok: false, text: 'It is not ready, or needs no seed.' }; pool.splice(ix, 1); m.form++; return { ok: true, text: G.get('monster', m.species).names[m.form] + ' blooms.', promoted: true }; }
  if (item === 'writ') { const k = S.knights[target]; if (!k || !C.canPromoteKnight(S, k, true) || k.tier !== 1) return { ok: false, text: 'Not ready for the third class.' }; pool.splice(ix, 1); k.tier = 2; return { ok: true, text: G.KNIGHTS[k.id].short + ' is knighted again: ' + G.LINES[k.line].names[2] + '.', promoted: true }; }
  if (item === 'potion' || item === 'ether') { pool.splice(ix, 1); const e = S.mons[target] || S.knights[target]; if (e) e.hp = null; return { ok: true, text: 'Restored.' }; }
  return { ok: false, text: 'Use it in the field.' };
};
C.promoteMon = (S, monId) => { const m = S.mons[monId]; if (!m || !C.canPromoteMon(S, m, false)) return { ok: false, text: 'Not ready.' }; m.form++; m.hp = null; return { ok: true, text: G.get('monster', m.species).names[m.form] + ' is changed.' }; };
C.promoteKnight = (S, kid) => { const k = S.knights[kid]; if (k.tier !== 0 || k.lvl < 10) return { ok: false, text: 'Not ready.' }; k.tier = 1; return { ok: true, text: G.KNIGHTS[kid].short + ' is now a ' + G.LINES[k.line].names[1] + '.' }; };

/* ---- marches ---- */
C.canMarch = (S, k) => !k.marched && !k.wounded && !k.quest && !S.castles[k.at].stilled && k.at != null;
C.targetsFor = (S, realm) => {
  const out = new Set();
  for (const c of C.castlesOf(S, realm)) if (!c.stilled && c.knights.some(id => C.canMarch(S, S.knights[id]))) for (const n of G.ADJ[c.id]) if (S.castles[n].owner !== realm) out.add(n);
  return [...out];
};
C.marchersFor = (S, realm, target) => C.castlesOf(S, realm).filter(c => G.ADJ[c.id].includes(target)).flatMap(c => c.knights.map(id => S.knights[id])).filter(k => C.canMarch(S, k));
C.declare = (S, realm, target, ids) => {
  S.marches = S.marches.filter(m => !(m.realm === realm && m.to === target));
  if (ids.length) S.marches.push({ realm, to: target, from: ids.slice(0, 2) });
};
C.power_of = (S, ids) => ids.reduce((a, id) => a + C.power(S, S.knights[id]), 0);

/* ---- the AI realm: muster and march ---- */
C.aiMuster = (S, realm) => {
  const r = S.realms[realm]; if (!r.alive) return;
  const cs = C.castlesOf(S, realm).filter(c => !c.stilled).sort((a, b) => G.CASTLES[b.id].tier - G.CASTLES[a.id].tier);
  const cap = C.knightsOf(S, realm).length * 4;
  for (const c of cs) {
    const circle = G.CASTLES[c.id].circle;
    let guard = 0;
    while (c.summons < 3 && guard++ < 3 && C.monCount(S, realm) < cap) {
      let best = null, bs = -1; for (const id of circle) { const sp = G.get('monster', id); if (r.mana - C.summonCost(sp) < 25 + C.upkeepOf(S, realm) * .3) continue; const sc = (sp.hp + sp.atk * 2 + sp.int * 2 + sp.def) / sp.cost + R.next(S.rng) * 4; if (sc > bs) { bs = sc; best = id; } }
      if (!best) break; C.summon(S, c.id, best);
    }
    // bind reserve to knights here
    for (const kid of c.knights) { const k = S.knights[kid]; for (const mid of c.reserve.slice()) { if (k.mons.length >= 4) break; C.bind(S, mid, kid); } }
    // promotions
    for (const kid of c.knights) { const k = S.knights[kid]; if (C.canPromoteKnight(S, k, false)) C.promoteKnight(S, kid); for (const mid of k.mons) if (C.canPromoteMon(S, S.mons[mid], false)) C.promoteMon(S, mid); }
    // items
    for (const kid of c.knights) { const k = S.knights[kid]; for (const it of r.items.slice()) { const d = G.get('item', it); if (d && ['w', 'a', 'c'].includes(d.slot) && !k.equip[d.slot]) C.equip(S, kid, it); } }
  }
  // shuffle knights toward the front line
  for (const c of C.castlesOf(S, realm)) {
    const front = G.ADJ[c.id].filter(n => S.castles[n].owner !== realm).length;
    for (const kid of c.knights.slice()) {
      const k = S.knights[kid]; if (k.moved || k.wounded || k.quest) continue;
      if (!front && c.knights.length) { let best = null, bf = -1; for (const n of G.ADJ[c.id]) if (S.castles[n].owner === realm && !S.castles[n].stilled) { const f = G.ADJ[n].filter(x => S.castles[x].owner !== realm).length; if (f > bf) { bf = f; best = n; } } if (best != null && bf > 0) C.moveKnight(S, kid, best); }
      else if (c.knights.length > 2) { let best = null; for (const n of G.ADJ[c.id]) if (S.castles[n].owner === realm && !S.castles[n].stilled && S.castles[n].knights.length < 1 + 0 && G.ADJ[n].some(x => S.castles[x].owner !== realm)) best = n; if (best != null) C.moveKnight(S, kid, best); }
      else if (!k.ruler && C.canQuest(S, k) && R.chance(S.rng, .12) && realm !== 5) C.quest(S, kid);
    }
  }
};
C.aiMarch = (S, realm) => {
  if (realm === 5 || !S.realms[realm].alive) return;
  const d = C.DIFF[S.difficulty], aggro = G.tune.aiAggro * (G.REALMS[realm].season === S.season ? 1.2 : 1) * (C.isHuman(S, realm) ? 1 : d.ai) * (realm === 4 ? (S.year >= 2 ? 1 : .0) : 1);
  if (aggro <= 0) return;
  const cand = [];
  for (const t of C.targetsFor(S, realm)) {
    if (t === 0 && realm !== 4) continue;   // only the Dominion's own hand and the player's march touch Meridian
    if (t === 0 && realm === 4) continue;
    const tc = S.castles[t], defenders = tc.knights.map(id => S.knights[id]).filter(k => !k.wounded);
    const dpow = defenders.reduce((a, k) => a + C.power(S, k), 0) * (1 + .12 * G.CASTLES[t].tier);
    const marchers = C.marchersFor(S, realm, t).sort((a, b) => C.power(S, b) - C.power(S, a));
    if (!marchers.length) continue;
    const pick = marchers.slice(0, 2), mp = pick.reduce((a, k) => a + C.power(S, k), 0);
    const ratio = mp / Math.max(40, dpow || 20), value = 1 + G.CASTLES[t].tier * .15 + (C.isHuman(S, tc.owner) ? .1 : 0);
    if (ratio * aggro > 1.1) cand.push({ t, pick, score: ratio * value });
  }
  cand.sort((a, b) => b.score - a.score);
  const used = new Set();
  for (const c of cand.slice(0, 2)) {
    const ids = c.pick.filter(k => !used.has(k.id)).map(k => k.id); if (!ids.length) continue;
    // keep a guard home when the front is hot
    const homes = ids.filter(id => { const k = S.knights[id], home = S.castles[k.at]; return home.knights.length > 1 || !G.ADJ[home.id].some(n => S.castles[n].owner !== realm && S.castles[n].knights.length && S.castles[n].owner !== 5); });
    if (!homes.length) continue; homes.forEach(i => used.add(i)); C.declare(S, realm, c.t, homes);
  }
};

/* ---- the seasonal flow ---- */
C.startTidings = S => {
  S.cards = []; S.phase = 'tidings'; S.marches = []; S.queue = []; { const act = C.activeHumans(S); S.seat = 0; if (act.length) S.human = act[0]; }
  S.turn++;
  const first = S.turn === 1;
  if (!first) { const n = C.nextSeason(S); S.year = n.year; S.season = n.season; }
  log(S, '', 'season');
  // candle
  if (S.candle != null) { S.candle--; log(S, S.candle > 0 ? 'The Hour-Candle burns lower: ' + S.candle + ' season' + (S.candle === 1 ? '' : 's') + ' left.' : 'The Hour-Candle gutters. This is the last season.', 'candle'); }
  // recovery
  for (const k of Object.values(S.knights)) { if (k.wounded) k.wounded--; k.moved = false; k.marched = false; if (k.at != null && !k.quest) k.hp = null; }
  for (const m of Object.values(S.mons)) m.hp = null;
  for (const c of S.castles) { c.stilled = false; c.summons = 0; }
  // stillness
  if (S.year >= 2) {
    const cand = S.castles.filter(c => c.owner < 4 && c.id !== 0); if (cand.length) { const prefer = cand.filter(c => C.isHuman(S, c.owner)); const c = R.pick(S.rng, prefer.length && R.chance(S.rng, .6) ? prefer : cand); c.stilled = true; S.stillCastle = c.id; log(S, 'The Gray Knight\'s Stillness settles on ' + G.CASTLES[c.id].short + '. No one may muster or march from there this season.', 'stillness'); }
  }
  // quests return
  for (const k of Object.values(S.knights)) if (k.quest) { k.quest.left--; if (k.quest.left <= 0) C.finishQuest(S, k); }
  // income
  for (const r of S.realms) if (r.alive && r.id !== 5) {
    const inc = C.incomeOf(S, r.id), up = C.upkeepOf(S, r.id);
    if (!first) r.mana += inc - up;
    if (r.id === S.human) log(S, (first ? 'Your coffers: ' : 'Income ' + inc + ', upkeep ' + up + '. ') + 'Mana now ' + Math.max(0, r.mana) + '.', 'income');
    let guard = 0; while (r.mana < 0 && guard++ < 20) {
      let worst = null, wv = 1e9; for (const m of Object.values(S.mons)) if (m.realm === r.id && m.at != null) { const sp = G.get('monster', m.species), v = (sp.atk + sp.int + sp.hp / 3) * G.TIERMUL[m.form] / sp.bond; if (v < wv) { wv = v; worst = m; } }
      if (!worst) { r.mana = 0; break; } const nm = G.get('monster', worst.species).names[worst.form]; C.removeMon(S, worst.id); r.mana += 6;
      if (r.id === S.human) log(S, 'A ' + nm + ' deserts. The mana ran short.', 'desert');
    }
  }
  // dominion keeps the clock stopped, candle lit in spring of year 2
  if (S.year === 2 && S.season === 0 && S.candle == null) { S.candle = Math.max(4, Math.round(G.tune.candleSeasons) + C.DIFF[S.difficulty].candle); log(S, 'In every window of Forseason the Hour-Candle is lit. ' + S.candle + ' seasons remain.', 'candle'); S.flags.candleLit = true; }
  // events
  S.pending = C.dueEvents(S);
  // AI
  for (const r of S.realms) if (!C.isHuman(S, r.id) && r.alive && r.id !== 5) C.aiMuster(S, r.id);
  C.checkEnd(S);
  return S.cards;
};
C.removeMon = (S, id) => { const m = S.mons[id]; if (!m) return; if (m.owner) { const k = S.knights[m.owner]; if (k) k.mons.splice(k.mons.indexOf(id), 1); } else if (m.at != null) { const c = S.castles[m.at]; const i = c.reserve.indexOf(id); if (i >= 0) c.reserve.splice(i, 1); } delete S.mons[id]; };
C.finishQuest = (S, k) => {
  const q = k.quest, out = q.outcome, pool = G.ITEM_IDS;
  const h = S.castles[q.castle].owner === k.realm ? q.castle : (C.castlesOf(S, k.realm)[0] || {}).id;
  k.quest = null; k.moved = false;
  if (h == null) { k.at = null; return; }
  k.at = h; S.castles[h].knights.push(k.id); for (const id of k.mons) S.mons[id].at = h;
  const nm = G.KNIGHTS[k.id].short, r = S.realms[k.realm]; let text = '';
  const rr = R.make(q.roll + 17);
  if (out === 'treasure') { const it = R.pick(rr, pool); r.items.push(it); text = nm + ' returns from ' + q.site + ' with the ' + G.get('item', it).name + '.'; }
  else if (out === 'beast') { const sp = R.pick(rr, G.CASTLES[h].circle.concat(G.CASTLES[q.castle].circle)); const m = C.newMon(S, sp, Math.max(1, k.lvl - 2), h, k.realm); const spec = G.get('monster', sp); text = nm + ' brings home a ' + spec.names[0] + ' from ' + q.site + '.'; if (C.bind(S, m.id, k.id).ok) text += ' It takes the banner.'; }
  else if (out === 'wanderer') { const f = Object.values(S.knights).filter(x => x.free && !x.joined); if (f.length) { const w = f[R.int(rr, f.length)]; w.joined = true; w.free = false; w.realm = k.realm; w.at = h; S.castles[h].knights.push(w.id); const pool2 = speciesForRealm(k.realm); for (let i = 0; i < 2; i++) { const m = C.newMon(S, R.pick(rr, pool2), Math.max(1, Math.floor(w.lvl / 2)), null, k.realm); m.at = h; m.owner = w.id; w.mons.push(m.id); } text = nm + ' met ' + G.KNIGHTS[w.id].name + ' on the road at ' + q.site + '. They have taken your banner.'; S.flags['joined_' + w.id] = true; } else { r.mana += 40; text = nm + ' found a purse at ' + q.site + ': 40 mana.'; } }
  else if (out === 'mana') { const a = 40 + R.int(rr, 41); r.mana += a; text = nm + ' drank from a mana spring at ' + q.site + ': +' + a + ' mana.'; }
  else if (out === 'training') { C.grant(S, k, 60); for (const id of k.mons) C.grant(S, S.mons[id], 40); text = nm + ' trained hard at ' + q.site + '. The troop is stronger.'; }
  else { k.wounded = 1; text = nm + ' limps back from ' + q.site + ', wounded.'; if (k.mons.length && R.chance(rr, .3)) { const w = k.mons.map(id => S.mons[id]).sort((a, b) => a.lvl - b.lvl)[0]; text += ' ' + G.get('monster', w.species).names[w.form] + ' did not return.'; C.removeMon(S, w.id); } }
  if (k.realm === S.human) log(S, text, 'quest');
  S.log.push(text);
};
C.endMuster = S => {
  for (const r of S.realms) if (!C.isHuman(S, r.id) && r.alive) C.aiMarch(S, r.id);
  // resolve order: highest attacking level first
  const attacks = S.marches.map(m => ({ realm: m.realm, to: m.to, from: m.from.slice() }));
  attacks.sort((a, b) => Math.max(...b.from.map(i => S.knights[i].lvl)) - Math.max(...a.from.map(i => S.knights[i].lvl)));
  S.queue = attacks; S.phase = 'resolve';
};
C.humanInvolved = (S, a) => C.isHuman(S, a.realm) || C.isHuman(S, S.castles[a.to].owner);
C.battleSpecFor = (S, a, seedAdd = 0) => {
  const tc = S.castles[a.to], gray = tc.knights.includes('gray');
  const side = (realm, ids, human) => ({ realm, human, items: S.realms[realm].items.slice(), troops: ids.map(id => { const k = S.knights[id]; return { knight: { id: k.id, line: k.line, tier: k.tier, lvl: k.lvl, equip: k.equip, hp: k.hp, ruler: k.ruler, realm: k.realm }, mons: k.mons.map(m => S.mons[m]).filter(Boolean).map(m => ({ id: m.id, species: m.species, form: m.form, lvl: m.lvl, hp: m.hp })) }; }) });
  const atk = a.from.filter(id => S.knights[id] && S.knights[id].alive !== false && !S.knights[id].wounded);
  const defIds = tc.knights.filter(id => !S.knights[id].wounded).sort((x, y) => C.power(S, S.knights[y]) - C.power(S, S.knights[x])).slice(0, 2);
  return { seed: (S.seed * 31 + S.turn * 977 + a.to * 13 + seedAdd) >>> 0, map: gray ? 'sanctum' : G.CASTLES[a.to].map, season: S.season, kind: gray ? 'boss' : 'field', bells: G.tune.bells,
    sides: [side(a.realm, atk, C.isHuman(S, a.realm)), side(tc.owner, defIds, C.isHuman(S, tc.owner))], castle: a.to };
};
/* the next attack in the queue: returns { attack, free } where free means the gate stands open */
C.nextAttack = S => {
  while (S.queue.length) {
    const a = S.queue.shift(); const tc = S.castles[a.to];
    a.from = a.from.filter(id => { const k = S.knights[id]; return k && k.at != null && !k.wounded && !k.quest; });
    if (!a.from.length || tc.owner === a.realm) continue;
    if (!S.realms[a.realm].alive) continue;
    const defenders = tc.knights.filter(id => !S.knights[id].wounded);
    if (!defenders.length) { C.takeCastle(S, a, true, []); return { attack: a, free: true }; }
    return { attack: a, free: false };
  }
  return null;
};
/* apply a finished battle (or an auto-resolved one) to the campaign */
C.applyBattle = (S, a, spec, result, sim) => {
  const tc = S.castles[a.to], att = a.realm, def = tc.owner, out = { levelUps: [], deaths: [], captured: [], wounded: [], won: result.winner === 0, castle: a.to, att, def, taken: false, treasure: null, xp: [] };
  S.stats.battles++;
  const grab = (id) => id.startsWith('k:') ? S.knights[id.slice(2)] : S.mons[id.slice(2)];
  for (const u of result.units) {
    const ent = grab(u.id); if (!ent) continue;
    const orig = (u.ref.t === 'k') ? ent : ent;
    if (u.ref.t === 'k') {
      if (u.xp) C.grant(S, ent, u.xp, out.levelUps);
      if (!u.alive) { ent.wounded = 1; ent.hp = null; out.wounded.push(u.name); if (S.human === ent.realm) S.stats.deaths += 0; } else ent.hp = u.hp;
      ent.marched = ent.marched || u.side === 0;
      if (u.side === 0 && (ent.realm === S.human)) S.stats.knightsFought = (S.stats.knightsFought || 0) + 1;
    } else {
      if (!u.alive && u.gone === 'down') { out.deaths.push({ name: u.name, realm: S.mons[u.id.slice(2)] ? S.mons[u.id.slice(2)].realm : -1 }); C.removeMon(S, ent.id); if (S.mons[ent.id]) delete S.mons[ent.id]; continue; }
      if (u.xp) C.grant(S, ent, u.xp, out.levelUps); ent.hp = u.hp;
    }
  }
  // captured monsters change allegiance: they join the capturer's reserve at the target castle (or the attackers' home)
  const sideToRealm = [att, def];
  for (const u of sim.units) if (u.captured && u.alive && u.ref.t === 'm') {
    const m = S.mons[u.ref.id]; if (!m) continue;
    const newRealm = sideToRealm[u.side];
    if (m.owner) { const ok = S.knights[m.owner]; if (ok) ok.mons.splice(ok.mons.indexOf(m.id), 1); }
    m.owner = null; m.realm = newRealm; m.hp = u.hp;
    const home = newRealm === att ? S.knights[a.from[0]].at : a.to; m.at = home; S.castles[home].reserve.push(m.id);
    const kk = Object.values(S.knights).find(k => k.at === home && k.realm === newRealm && C.bondUsed(S, k) + G.get('monster', m.species).bond <= C.bondCap(S, k) && k.mons.length < 4); if (kk) C.bind(S, m.id, kk.id);
    out.captured.push(G.get('monster', m.species).names[m.form]); S.stats.captured += C.isHuman(S, newRealm) ? 1 : 0;
  }
  if (result.winner === 0) { C.takeCastle(S, a, false, out); out.taken = true; }
  else { /* the attackers go home: nothing moves */ }
  if (out.won && C.isHuman(S, att) || (!out.won && C.isHuman(S, def))) S.stats.wins++;
  if (result.units.some(u => u.id === 'k:gray' && !u.alive)) S.flags.grayFallen = true;
  return out;
};
C.takeCastle = (S, a, free, out) => {
  const tc = S.castles[a.to], old = tc.owner, att = a.realm;
  // defenders fall back
  const fleeing = tc.knights.slice();
  tc.knights = [];
  tc.owner = att; tc.summons = 0; if (C.isHuman(S, att)) S.stats.castles++;
  // reserve joins the new owner
  for (const mid of tc.reserve) { const m = S.mons[mid]; if (m) m.realm = att; }
  for (const id of fleeing) {
    const k = S.knights[id]; const dest = C.fallbackCastle(S, old, a.to);
    if (dest == null) { k.at = null; k.free = true; k.realm = 5; for (const m of k.mons) { const mm = S.mons[m]; if (mm) { mm.at = null; mm.owner = null; mm.realm = 5; } } k.mons = []; }
    else { k.at = dest; S.castles[dest].knights.push(id); for (const m of k.mons) if (S.mons[m]) S.mons[m].at = dest; }
  }
  // attackers occupy (survivors only)
  for (const id of a.from) { const k = S.knights[id]; if (!k) continue; const from = S.castles[k.at]; from.knights.splice(from.knights.indexOf(id), 1); tc.knights.push(id); k.at = a.to; for (const m of k.mons) if (S.mons[m]) S.mons[m].at = a.to; }
  if (!tc.taken) { tc.taken = true; if (tc.treasury) { S.realms[att].items.push(tc.treasury); if (out) out.treasure = tc.treasury; tc.treasury = null; } }
  // elimination
  if (old < 4 || old === 4) { if (!C.castlesOf(S, old).length) { S.realms[old].alive = false; S.log.push(G.REALMS[old].name + ' is no more.'); S.flags['dead_' + old] = true; } }
  if (old === 5 && C.isHuman(S, att) && !C.castlesOf(S, 5).length) S.flags.brigandsGone = true;
  C.checkEnd(S);
};
C.fallbackCastle = (S, realm, fromCastle) => {
  const own = C.castlesOf(S, realm).map(c => c.id); if (!own.length) return null;
  const seen = new Set([fromCastle]), q = [fromCastle];
  while (q.length) { const c = q.shift(); for (const n of G.ADJ[c]) if (!seen.has(n)) { if (own.includes(n)) return n; seen.add(n); q.push(n); } }
  return own[0];
};
C.checkEnd = S => {
  if (S.over) return;
  const hs = S.humans, o0 = S.castles[0].owner;
  if (hs.includes(o0)) { S.over = { won: true, kind: 'victory', realm: o0 }; return; }
  if (o0 < 4) { S.over = { won: false, kind: 'rival', realm: hs[0] }; return; }
  if (!C.activeHumans(S).length) { S.over = { won: false, kind: 'fallen', realm: hs[0] }; return; }
  if (!C.activeHumans(S).includes(S.human)) S.human = C.activeHumans(S)[0];
};
C.endSeason = S => {
  if (S.over) return;
  if (S.candle != null && S.candle <= 0) { S.over = { won: false, kind: 'candle' }; return; }
  C.startTidings(S);
};
C.auto = (S, a, spec) => {
  const sim = B.create(spec); G.BattleAI.auto(sim); return { sim, out: C.applyBattle(S, a, spec, B.result(sim), sim) };
};
/* resolve every queued attack the human is not part of (or all of them when 'all') */
C.resolveAI = (S, all) => {
  const res = [];
  while (S.queue.length) {
    if (!all && C.humanInvolved(S, S.queue[0])) break;
    const n = C.nextAttack(S); if (!n) break;
    if (n.free) { res.push({ a: n.attack, free: true }); continue; }
    const spec = C.battleSpecFor(S, n.attack); const r = C.auto(S, n.attack, spec); res.push({ a: n.attack, out: r.out, free: false });
  }
  return res;
};
C.dueEvents = S => (G.EVENTS || []).filter(e => !S.eventsDone[e.id] && e.when(S)).slice(0, 3).map(e => e.id);
C.hash = S => G.hash(S);
C.serialize = S => JSON.stringify(S);
C.load = txt => JSON.parse(txt);

/* a ready-made skirmish (also the AI Hub round): two troops a side, seeded */
G.makeSkirmish = (seed, opt = {}) => {
  const rng = R.make(seed), mapKeys = G.PLAIN_MAPS || ['meadow', 'forest', 'river', 'ruins'], map = opt.map || R.pick(rng, mapKeys.slice(0, 4)), season = opt.season != null ? opt.season : R.int(rng, 4);
  const n = opt.sides || 2, used = [], sides = [];
  for (let si = 0; si < n; si++) {
    let realm = opt.realms && opt.realms[si] != null ? opt.realms[si] : (si === 0 ? R.int(rng, 4) : (used[used.length - 1] + 1) % 4);
    while (used.includes(realm)) realm = (realm + 1) % 4; used.push(realm);
    const pool = speciesForRealm(realm), troops = [], kids = Object.values(G.KNIGHTS).filter(k => k.realm === realm && k.role !== 'ruler');
    const nT = n > 2 ? 1 : 2;
    for (let t = 0; t < nT; t++) {
      const kn = kids[t % kids.length], lvl = 6 + R.int(rng, 2);
      troops.push({ knight: { id: kn.id, line: kn.line, tier: 0, lvl, equip: {}, hp: null, ruler: false, realm }, mons: Array.from({ length: 3 }, (_, i) => ({ id: 'S' + si + t + i, species: R.pick(rng, pool), form: 0, lvl: lvl - 2 + R.int(rng, 3), hp: null })) });
    }
    sides.push({ realm, human: si === 0 && !opt.ai, items: ['potion'], troops });
  }
  return { seed, map, season, kind: 'field', bells: opt.bells || G.tune.bells, sides };
};


/* ===== 30-art.js ===== */
/* ---- ART: everything is drawn by code. Palettes, text, panels, creatures, knights, the hex board and the world map. ---- */
const px = E.px;
G.T = (g, s, x, y, c, o) => E.font.text(g, String(s), Math.round(x), Math.round(y), c || '#f4eed8', Object.assign({ shadow: '#0a0612', outline: false }, o || {}));
G.TW = (s, o) => E.font.width(String(s), o);
G.tone = c => E.tones(c);
G.mix = (a, b, t) => { const p = E.hex ? E.hex(a) : null; return a; };
const hx = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
G.lerpCol = (a, b, t) => { const p = hx(a), q = hx(b); return toHex(p.map((v, i) => v + (q[i] - v) * t)); };
G.hash2 = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* season palettes for the board and the map */
G.SEASON_PAL = [
  { sky: ['#bfe8f8', '#8fd0e8'], plain: ['#6fbf5a', '#78c862'], forest: '#2f7a3a', water: '#4a9ad8', low: '#5aa8a0', ink: '#e8f8c8' },
  { sky: ['#ffe6a0', '#f4b860'], plain: ['#c8b45a', '#d2be62'], forest: '#7a8a2a', water: '#3a88c8', low: '#b8a450', ink: '#fff0c0' },
  { sky: ['#e8b078', '#c47a48'], plain: ['#b8803c', '#c28a44'], forest: '#8a4a22', water: '#3a6a98', low: '#a87838', ink: '#ffe0a8' },
  { sky: ['#cfe0f0', '#9ab8d8'], plain: ['#d8e6f0', '#e4eef6'], forest: '#5a7a8a', water: '#7ab0d8', low: '#c8d8e4', ink: '#ffffff' }
];

/* ---- window frames and bars ---- */
G.box = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#241c3c', '#120c22'], border: '#c8a860' }, o));
G.bar = (g, x, y, w, h, f, col) => { px.rect(g, x, y, w, h, '#0a0612'); px.rect(g, x + 1, y + 1, Math.max(0, Math.round((w - 2) * G.clamp(f, 0, 1))), h - 2, col); };
G.chip = (g, x, y, label, col) => {   // a button glyph / key cap, returns its width
  const shape = { '✕': 1, '○': 2, '□': 3, '△': 4 }[label];
  const w = shape ? 12 : Math.max(9, G.TW(label) + 5);
  px.rect(g, x, y, w, 10, '#0a0612'); px.rect(g, x + 1, y + 1, w - 2, 8, col || '#3a3258'); px.rect(g, x + 1, y + 1, w - 2, 1, '#ffffff33');
  if (shape) { const cx = x + 6, cy = y + 5, c = '#ffffff'; if (shape === 1) { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, c, 1); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, c, 1); } else if (shape === 2) { px.disc(g, cx, cy, 3, c); px.disc(g, cx, cy, 1.4, col); } else if (shape === 3) { px.rect(g, cx - 2, cy - 2, 5, 5, c); px.rect(g, cx - 1, cy - 1, 3, 3, col); } else { px.poly(g, [[cx, cy - 3], [cx + 3, cy + 2], [cx - 3, cy + 2]], c); px.poly(g, [[cx, cy - 1], [cx + 1, cy + 1], [cx - 1, cy + 1]], col); } }
  else G.T(g, label, x + Math.round((w - G.TW(label)) / 2), y + 1, '#fff', { shadow: false });
  return w;
};
G.PAD_COL = { '✕': '#3a5ab0', '○': '#b03a3a', '□': '#b03a8a', '△': '#2a9a6a', 'A': '#2a8a3a', 'B': '#b03a3a', 'X': '#3a5ab0', 'Y': '#b09a2a' };

/* ---- creature painter: six bodies, three forms, drawn from px primitives ---- */
G.drawMon = (g, sp, form, x, y, o = {}) => {
  const t = o.t || 0, dir = o.dir || 1, k = (sp.size === 'S' ? .78 : sp.size === 'L' ? 1.22 : 1) * (1 + form * .13) * (o.scale || 1);
  const tn = G.tone(o.flash ? '#ffffff' : sp.col), walk = o.walk || 0, bob = Math.sin(t * 3 + (o.seed || 0)) * .8, lunge = (o.lunge || 0) * 5 * dir;
  const X = x + lunge, S = v => v * k;
  if (o.alpha !== undefined && o.alpha < 1) { g.save(); g.globalAlpha = Math.max(0, o.alpha); }
  const eye = (ex, ey, c) => { px.rect(g, Math.round(ex), Math.round(ey), 2, 2, c || '#fff'); px.dot(g, Math.round(ex + (dir > 0 ? 1 : 0)), Math.round(ey + 1), '#120a1a'); };
  const leg = (lx, ph) => { const lift = Math.max(0, Math.sin(t * 12 + ph)) * walk * 2; px.rect(g, Math.round(X + lx * dir), Math.round(y - S(4) - lift), Math.max(1, Math.round(S(2))), Math.round(S(4) + lift), tn.sh); };
  switch (sp.body) {
    case 'quad': {
      const hop = Math.abs(Math.sin(t * 12)) * walk * 1.5;
      leg(-6, 0); leg(-3, 2); leg(4, 1); leg(7, 3);
      px.poly(g, [[X - S(10) * dir, y - S(8) - hop], [X - S(15) * dir, y - S(13) - hop + Math.sin(t * 4) * 1.5], [X - S(9) * dir, y - S(10) - hop]], tn.sh);
      if (sp.id === 'salam') { px.ddisc(g, X - S(15) * dir, y - S(13) - hop, S(4), '#ffb040', .7); px.disc(g, X - S(15) * dir, y - S(13) - hop, S(2), '#fff0a0'); }
      px.ell(g, X, y - S(8) - hop + bob * .3, S(10), S(5.5), tn.base); px.ell(g, X, y - S(6) - hop, S(9), S(3), tn.lt); px.ell(g, X + S(1) * dir, y - S(11) - hop, S(6), S(2), tn.sh);
      px.ell(g, X + S(9) * dir, y - S(11.5) - hop, S(5), S(4), tn.base);
      if (sp.id === 'wolf') { px.poly(g, [[X + S(7) * dir, y - S(15) - hop], [X + S(8.5) * dir, y - S(20) - hop], [X + S(11) * dir, y - S(15) - hop]], tn.sh); px.rect(g, Math.round(X + S(12) * dir), Math.round(y - S(11) - hop), Math.round(S(3)), 2, tn.deep); px.dot(g, Math.round(X + S(12) * dir), Math.round(y - S(9) - hop), '#fff'); }
      else px.rect(g, Math.round(X + S(12) * dir) - (dir < 0 ? 4 : 0), Math.round(y - S(11) - hop), Math.round(S(5)), Math.round(S(3)), tn.lt);
      eye(X + S(9) * dir - (dir < 0 ? 1 : 0), y - S(14) - hop, form === 2 ? '#ff6040' : '#fff');
      if (form >= 1) px.poly(g, [[X + S(5) * dir, y - S(15) - hop], [X + S(6) * dir, y - S(19) - hop], [X + S(8) * dir, y - S(15) - hop]], tn.hi);
      break;
    }
    case 'fly': {
      const fy = y - S(13) + bob * 1.4 - (o.walk ? 0 : 0), fl = Math.sin(t * 16 + (o.seed || 0));
      const wc = sp.id === 'pixie' ? '#e8f8ff' : tn.lt;
      px.polyDither(g, [[X, fy], [X - S(10) * dir, fy - S(9) - fl * S(4)], [X - S(4) * dir, fy + S(2)]], wc, .85);
      px.polyDither(g, [[X, fy], [X + S(10) * dir * .2, fy - S(11) - fl * S(5)], [X + S(3) * dir, fy - S(1)]], wc, .7);
      if (sp.id === 'pixie') { px.ell(g, X, fy + S(2), S(3), S(4), '#f0a0c8'); px.disc(g, X + S(1) * dir, fy - S(3), S(2.6), '#ffe0c8'); px.poly(g, [[X - S(3), fy - S(5)], [X, fy - S(10)], [X + S(3), fy - S(5)]], '#ff80b8'); px.ddisc(g, X, fy, S(7), '#fff0a0', .35); }
      else { px.ell(g, X, fy, S(6), S(4), tn.base); px.ell(g, X - S(1) * dir, fy + S(1), S(4), S(2), tn.lt); px.disc(g, X + S(5) * dir, fy - S(2), S(3), tn.base); px.poly(g, [[X + S(7.5) * dir, fy - S(3)], [X + S(11) * dir, fy - S(2)], [X + S(7.5) * dir, fy - S(1)]], '#f0c040'); eye(X + S(5) * dir - 1, fy - S(4), '#fff'); px.poly(g, [[X - S(6) * dir, fy], [X - S(11) * dir, fy + S(3)], [X - S(6) * dir, fy + S(2)]], tn.sh); if (sp.id === 'hawk') px.ddisc(g, X, fy, S(10), '#ffd060', .25); }
      px.ell(g, X, y - 1, S(5), 1.5, '#00000044');
      break;
    }
    case 'brute': {
      const sw = Math.sin(t * 10) * walk * 2, tl = (sp.id === 'golem');
      px.rect(g, Math.round(X - S(5)), Math.round(y - S(7)), Math.round(S(4)), Math.round(S(7)), tn.sh); px.rect(g, Math.round(X + S(1)), Math.round(y - S(7)), Math.round(S(4)), Math.round(S(7)), tn.sh);
      px.rect(g, Math.round(X - S(9)), Math.round(y - S(19) + sw), Math.round(S(4)), Math.round(S(11)), tn.sh); px.rect(g, Math.round(X + S(5)), Math.round(y - S(19) - sw), Math.round(S(4)), Math.round(S(11)), tn.sh);
      px.rect(g, Math.round(X - S(7)), Math.round(y - S(21) + bob * .4), Math.round(S(14)), Math.round(S(15)), tn.base); px.rect(g, Math.round(X - S(7)), Math.round(y - S(21) + bob * .4), Math.round(S(14)), 2, tn.lt);
      if (tl) { px.line(g, X - S(3), y - S(18), X, y - S(12), tn.deep); px.line(g, X, y - S(12), X + S(3), y - S(15), tn.deep); px.rect(g, Math.round(X - S(5)), Math.round(y - S(28) + bob * .4), Math.round(S(10)), Math.round(S(7)), tn.lt); px.rect(g, Math.round(X - S(3)), Math.round(y - S(26) + bob * .4), 2, 2, '#ffd060'); px.rect(g, Math.round(X + S(1)), Math.round(y - S(26) + bob * .4), 2, 2, '#ffd060'); }
      else { px.ell(g, X, y - S(15), S(7), S(6), tn.lt); px.disc(g, X, y - S(26) + bob * .4, S(5), tn.hi); eye(X - S(3), y - S(27) + bob * .4, '#1a2a4a'); eye(X + S(1), y - S(27) + bob * .4, '#1a2a4a'); px.rect(g, Math.round(X - S(2)), Math.round(y - S(23) + bob * .4), Math.round(S(4)), 1, tn.deep); }
      break;
    }
    case 'wisp': {
      const fy = y - S(13) + bob * 2, flick = Math.sin(t * 9 + (o.seed || 0)) * 1.2, ghost = sp.id === 'wraith';
      px.ddisc(g, X, fy, S(12), tn.lt, .35);
      if (ghost) { px.poly(g, [[X - S(7), fy + S(9)], [X - S(5), fy - S(6)], [X, fy - S(10)], [X + S(5), fy - S(6)], [X + S(7), fy + S(9)], [X + S(3), fy + S(6) + flick], [X, fy + S(10)], [X - S(3), fy + S(6) - flick]], tn.base); px.ell(g, X, fy - S(3), S(4), S(4.5), tn.deep); px.rect(g, Math.round(X - S(3)), Math.round(fy - S(4)), 2, 2, '#ffe880'); px.rect(g, Math.round(X + S(1)), Math.round(fy - S(4)), 2, 2, '#ffe880'); }
      else { px.poly(g, [[X, fy - S(11) + flick], [X + S(6), fy + S(1)], [X + S(4), fy + S(7)], [X, fy + S(9)], [X - S(4), fy + S(7)], [X - S(6), fy + S(1)]], tn.base); px.disc(g, X, fy + S(2), S(4.5), tn.hi); eye(X - S(3), fy, '#102040'); eye(X + S(1), fy, '#102040'); }
      px.ell(g, X, y - 1, S(5), 1.5, '#00000044');
      break;
    }
    case 'imp': {
      const sw = Math.sin(t * 11) * walk * 2, bone = sp.id === 'bone';
      px.rect(g, Math.round(X - S(3)), Math.round(y - S(7)), Math.round(S(2)), Math.round(S(7)), tn.sh); px.rect(g, Math.round(X + S(1)), Math.round(y - S(7)), Math.round(S(2)), Math.round(S(7)), tn.sh);
      px.rect(g, Math.round(X - S(4)), Math.round(y - S(15) + bob * .5), Math.round(S(8)), Math.round(S(9)), bone ? tn.lt : tn.base);
      if (bone) { for (let i = 0; i < 3; i++) px.rect(g, Math.round(X - S(3)), Math.round(y - S(13) + S(i * 2.5)), Math.round(S(6)), 1, tn.deep); }
      else { px.disc(g, X - S(6) * dir, y - S(13), S(3.5), '#d8b040'); px.dot(g, Math.round(X - S(6) * dir), Math.round(y - S(13)), '#6a4a14'); }
      px.rect(g, Math.round(X - S(7) + sw), Math.round(y - S(14)), Math.round(S(2.5)), Math.round(S(7)), tn.sh); px.rect(g, Math.round(X + S(5) - sw), Math.round(y - S(14)), Math.round(S(2.5)), Math.round(S(7)), tn.sh);
      px.ell(g, X, y - S(18) + bob * .5, S(5), S(4.5), bone ? tn.hi : tn.lt); eye(X - S(3), y - S(19) + bob * .5, bone ? '#120a1a' : '#ffe060'); eye(X + S(1), y - S(19) + bob * .5, bone ? '#120a1a' : '#ffe060');
      if (!bone) { px.poly(g, [[X - S(4), y - S(21)], [X - S(5), y - S(25)], [X - S(2), y - S(22)]], tn.deep); px.poly(g, [[X + S(4), y - S(21)], [X + S(5), y - S(25)], [X + S(2), y - S(22)]], tn.deep); }
      else px.rect(g, Math.round(X - S(2)), Math.round(y - S(15) + bob * .5), Math.round(S(4)), 1, tn.deep);
      break;
    }
    case 'blob': {
      const sq = 1 + Math.sin(t * 5 + (o.seed || 0)) * .08 + (o.lunge || 0) * .2;
      px.ell(g, X, y - S(6) * sq, S(10) / sq, S(7) * sq, tn.base); px.ell(g, X - S(2), y - S(8) * sq, S(6) / sq, S(3.5) * sq, tn.lt); px.ell(g, X - S(3), y - S(10) * sq, S(2), S(1.4), tn.hi);
      eye(X - S(3), y - S(8) * sq, '#fff'); eye(X + S(2), y - S(8) * sq, '#fff'); px.rect(g, Math.round(X - S(1)), Math.round(y - S(4) * sq), Math.round(S(3)), 1, tn.deep);
      if (form >= 2) { px.poly(g, [[X - S(5), y - S(12) * sq], [X - S(4), y - S(17) * sq], [X - S(2), y - S(13) * sq], [X, y - S(18) * sq], [X + S(2), y - S(13) * sq], [X + S(4), y - S(17) * sq], [X + S(5), y - S(12) * sq]], '#f0d050'); }
      break;
    }
  }
  if (form >= 2 && sp.body !== 'blob') px.ddisc(g, X, y - S(12), S(14), tn.hi, .18);
  if (o.alpha !== undefined && o.alpha < 1) g.restore();
};

/* ---- knight rigs: a Humanoid dressed by class line and realm ---- */
const HAIRS = ['#3b2a2f', '#e0b050', '#8a4a2a', '#d8d4e0', '#1a1420', '#c8402a', '#6a3a24'];
G.knightLook = (id, line, tier, realm, size) => {
  const R_ = G.REALMS[realm] || G.REALMS[5], idn = G.hash(id), hair = HAIRS[idn % HAIRS.length], K = G.KNIGHTS[id] || {};
  const boss = id === 'gray', col = boss ? '#6a6a74' : R_.col, dk = boss ? '#2a2a32' : R_.dark;
  const o = { size, build: tier >= 1 ? 'heroic' : 'chibi', hair: G.LINES[line].hair, colors: { cloth: dk, pants: G.lerpCol(dk, '#000000', .35), hair, trim: col, cape: col, capeIn: dk, metal: '#d0d8e8', plate: boss ? '#8a8a96' : '#b8c0d4', belt: '#d8b060', boot: '#4a3020' }, sleeves: 'long' };
  switch (line) {
    case 0: o.weapon = 'sword'; o.armor = true; o.hat = tier >= 1 ? { style: 'helmet', color: '#9aa4b8' } : null; o.cape = { len: 6, width: 5, seg: 2.4 }; break;
    case 1: o.weapon = 'gun'; o.hood = true; o.outfit = 'tunic'; o.colors.hair = dk; break;
    case 2: o.weapon = 'staff'; o.outfit = 'robe'; o.hat = { style: 'pointed', color: col }; break;
    case 3: o.weapon = 'staff'; o.outfit = 'robe'; o.hat = { style: 'band', color: col }; o.colors.cloth = '#f0ecde'; o.colors.pants = '#e0d8c4'; break;
    default: o.weapon = 'sword'; o.outfit = 'tunic'; o.hair = 'spiky'; o.cape = { len: 4, width: 4, seg: 2.2 }; o.hat = tier >= 1 ? { style: 'band', color: col } : null; break;
  }
  if (K.role === 'ruler') o.hat = { style: 'crown', color: '#e8c860' };
  if (boss) { o.hat = { style: 'helmet', color: '#44444e' }; o.eyeGlow = '#f0f0ff'; o.build = 'bulky'; }
  return o;
};
const rigCache = new Map();
G.rigFor = (key, mk) => { let r = rigCache.get(key); if (!r) { r = mk(); rigCache.set(key, r); } return r; };
G.clearRigs = () => rigCache.clear();

/* ---- the board ---- */
G.board = { s: 12, sq: .62, ox: 0, oy: 0, tilt: 0 };
G.boardLayout = (S, W, H, topPad, botPad, steep) => {
  const b = G.board; b.sq = steep ? .8 : .62;
  const sx = (W - 8) / (Math.sqrt(3) * (S.cols + .5)), sy = (H - topPad - botPad - 6) / (1.5 * b.sq * (S.rows - 1) + 2 * b.sq + 8 / 10);
  b.s = Math.max(8, Math.min(sx, sy, 15));
  const bw = Math.sqrt(3) * b.s * (S.cols + .5), bh = 1.5 * b.s * b.sq * (S.rows - 1) + 2 * b.s * b.sq;
  b.ox = Math.round((W - bw) / 2 + Math.sqrt(3) * b.s / 2); b.oy = Math.round(topPad + (H - topPad - botPad - bh) / 2 + b.s * b.sq);
  return b;
};
G.hexCenter = (c, r) => { const b = G.board, p = G.hex.px(c, r, b.s); return [b.ox + p[0], b.oy + p[1] * b.sq]; };
G.pickHex = (S, sx, sy) => {
  const b = G.board; let best = null, bd = 1e9;
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) { const p = G.hexCenter(c, r), dx = sx - p[0], dy = (sy - p[1]) / b.sq; const d = Math.hypot(dx, dy); if (d < bd && d <= b.s * .95) { bd = d; best = [c, r]; } }
  return best;
};
G.tileColors = (ch, season, c, r) => {
  const P = G.SEASON_PAL[season], h = G.hash2(c, r);
  switch (ch) {
    case '.': return P.plain[h < .5 ? 0 : 1];
    case ',': return P.low;
    case 'f': return P.plain[0];
    case 'F': return P.plain[0];
    case 'w': return P.water;
    case 'i': return '#c8e8f8';
    case '#': return '#8a8896';
    case 'K': return '#a8a0b0';
    case 'D': return '#b89a58';
    default: return P.plain[0];
  }
};
G.drawTile = (g, ch, season, c, r, t, hi) => {
  const b = G.board, [cx, cy] = G.hexCenter(c, r), s = b.s, sq = b.sq, col = G.tileColors(ch, season, c, r), P = G.SEASON_PAL[season];
  const raise = ch === '#' ? Math.round(s * .45) : ch === 'K' ? Math.round(s * .22) : 0;
  const pts = G.hex.corners(cx, cy - raise, s - .5, sq), tn = G.tone(col);
  if (raise) { const bot = G.hex.corners(cx, cy, s - .5, sq); px.poly(g, [bot[0], bot[1], bot[2], bot[3], pts[3], pts[2], pts[1], pts[0]].map(p => p), tn.deep); px.poly(g, [pts[0], pts[5], bot[5], bot[0]], tn.sh); px.poly(g, [pts[5], pts[4], bot[4], bot[5]], tn.sh); px.poly(g, [pts[4], pts[3], bot[3], bot[4]], tn.deep); }
  px.poly(g, pts, tn.sh); px.poly(g, G.hex.corners(cx, cy - raise, s - 1.6, sq), col);
  const y0 = cy - raise;
  if (ch === 'f' || ch === 'F') {
    const burn = ch === 'F';
    for (let i = 0; i < 2; i++) { const ox = (i ? 3 : -3) * s / 12, oy = (i ? -1 : 1) * s / 14; const base = burn ? '#3a2a22' : P.forest; px.poly(g, [[cx + ox - s * .26, y0 + oy + s * .12 * sq * 2], [cx + ox, y0 + oy - s * .62], [cx + ox + s * .26, y0 + oy + s * .12 * sq * 2]], base); px.poly(g, [[cx + ox - s * .2, y0 + oy - s * .1], [cx + ox, y0 + oy - s * .78], [cx + ox + s * .2, y0 + oy - s * .1]], burn ? '#5a3a2a' : G.tone(P.forest).lt); }
    if (burn) for (let i = 0; i < 3; i++) { const fl = Math.sin(t * 9 + i * 2 + c) * 1.5; px.ddisc(g, cx + (i - 1) * s * .35, y0 - s * .3 + fl, s * .3, '#ff8030', .75); px.disc(g, cx + (i - 1) * s * .35, y0 - s * .2 + fl, s * .14, '#ffe070'); }
  } else if (ch === 'w' || ch === 'i') {
    const tt = G.tone(col); for (let i = 0; i < 3; i++) { const wx = cx + Math.sin(t * 1.5 + i * 2 + c) * s * .35, wy = y0 + (i - 1) * s * .22 * sq * 2; px.rect(g, Math.round(wx - 2), Math.round(wy), 4, 1, tt.hi); }
    if (ch === 'i') { px.line(g, cx - s * .4, y0 - 1, cx + s * .2, y0 + 1, '#ffffff', 1); px.line(g, cx - s * .1, y0 + 2, cx + s * .5, y0 - 2, '#a8d0e8', 1); }
  } else if (ch === ',') { for (let i = 0; i < 3; i++) px.rect(g, Math.round(cx + (i - 1) * s * .4), Math.round(y0 + ((i * 7 + c) % 3 - 1) * 2), 1, 2, G.tone(P.low).deep); }
  else if (ch === 'K') { const tn2 = G.tone('#a8a0b0'); px.rect(g, Math.round(cx - s * .35), Math.round(y0 - s * .5), Math.round(s * .7), Math.round(s * .6), tn2.base); px.rect(g, Math.round(cx - s * .35), Math.round(y0 - s * .5), Math.round(s * .7), 2, tn2.hi); for (let i = 0; i < 3; i++) px.rect(g, Math.round(cx - s * .35 + i * s * .3), Math.round(y0 - s * .62), Math.round(s * .15), 3, tn2.base); px.rect(g, Math.round(cx - 1), Math.round(y0 - s * .2), 3, Math.round(s * .3), '#3a2a4a'); px.rect(g, Math.round(cx + s * .35), Math.round(y0 - s * .9), 1, Math.round(s * .45), '#6a4a2a'); px.poly(g, [[cx + s * .35 + 1, y0 - s * .9], [cx + s * .35 + 7, y0 - s * .8 + Math.sin(t * 5)], [cx + s * .35 + 1, y0 - s * .7]], '#d84a4a'); }
  else if (ch === 'D') { px.ddisc(g, cx, y0, s * .7, '#ffd870', .22 + Math.sin(t * 2) * .08); px.ell(g, cx, y0, s * .5, s * .5 * sq, '#6a4a22'); px.ell(g, cx, y0, s * .38, s * .38 * sq, '#d8b060'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * .5; px.dot(g, Math.round(cx + Math.cos(a) * s * .3), Math.round(y0 + Math.sin(a) * s * .3 * sq), '#3a2210'); } }
  else if (ch === '#') { px.poly(g, [[cx - s * .3, y0 + s * .15 * sq], [cx - s * .1, y0 - s * .3], [cx + s * .15, y0 - s * .05], [cx + s * .35, y0 + s * .2 * sq]], G.tone('#8a8896').lt); }
  if (hi) { px.polyDither(g, G.hex.corners(cx, y0, s - 1, sq), hi.col, hi.a); }
};

/* ---- weather and seasonal motes (screen space) ---- */
G.motes = [];
G.motesInit = (n = 36) => { G.motes = Array.from({ length: n }, (_, i) => ({ x: Math.random(), y: Math.random(), v: .4 + Math.random() * .8, p: Math.random() * 6 })); };
G.drawMotes = (g, W, H, season, t, a = 1) => {
  if (!G.motes.length) G.motesInit();
  const cols = [['#ffc0d8', '#ffffff'], ['#ff8a30', '#ffd060'], ['#d88a30', '#a85a22'], ['#ffffff', '#d8f0ff']][season];
  for (const m of G.motes) {
    const sp = season === 1 ? -14 : season === 3 ? 18 : 12, sway = Math.sin(t * 1.3 + m.p) * (season === 3 ? 6 : 12);
    const x = ((m.x * W + sway + t * (season === 2 ? 14 : 4) * m.v) % W + W) % W, y = (((m.y * H + t * sp * m.v) % H) + H) % H;
    if (a < 1 && (m.p * 7 | 0) % 10 > a * 10) continue;
    px.rect(g, Math.round(x), Math.round(y), season === 3 ? 1 : 2, season === 3 ? 1 : 1, cols[(m.p * 3 | 0) % 2]);
  }
};

/* ---- the world map ---- */
G.mapRect = { x: 0, y: 0, w: 427, h: 240 };
G.mapPos = (c, rect) => [rect.x + c.x * rect.w, rect.y + c.y * rect.h];
G.drawCastle = (g, x, y, tier, col, t, o = {}) => {
  const s = tier === 3 ? 1.5 : tier === 2 ? 1.2 : 1, tn = G.tone('#b8b4c4'), dk = G.tone(col || '#8a8470');
  x = Math.round(x); y = Math.round(y);
  px.ell(g, x, y + 1, 10 * s, 3 * s, '#00000055');
  px.rect(g, x - Math.round(6 * s), y - Math.round(7 * s), Math.round(12 * s), Math.round(8 * s), tn.base); px.rect(g, x - Math.round(6 * s), y - Math.round(7 * s), Math.round(12 * s), 1, tn.hi);
  for (const dx of [-6, 3]) { px.rect(g, x + Math.round(dx * s), y - Math.round(11 * s), Math.round(3 * s), Math.round(5 * s), tn.lt); px.rect(g, x + Math.round(dx * s) - 1, y - Math.round(12 * s), Math.round(3 * s) + 2, 2, dk.base); }
  if (tier >= 2) { px.rect(g, x - Math.round(2 * s), y - Math.round(14 * s), Math.round(4 * s), Math.round(8 * s), tn.lt); px.poly(g, [[x - Math.round(3 * s), y - Math.round(14 * s)], [x, y - Math.round(19 * s)], [x + Math.round(3 * s), y - Math.round(14 * s)]], dk.base); }
  px.rect(g, x - 1, y - 3, 3, 4, '#2a1a30');
  const py = tier >= 2 ? 19 : 13; px.rect(g, x, y - Math.round(py * s) - 2, 1, 6, '#5a4028'); px.poly(g, [[x + 1, y - Math.round(py * s) - 2], [x + 8, y - Math.round(py * s) + Math.sin(t * 4) * 1 + 1], [x + 1, y - Math.round(py * s) + 3]], col || '#8a8470');
  if (o.stilled) { px.polyDither(g, [[x - 11, y - 18], [x + 11, y - 18], [x + 11, y + 2], [x - 11, y + 2]], '#9ab0d8', .4); px.rect(g, x - 3, y - 14, 6, 1, '#fff'); px.rect(g, x - 3, y - 6, 6, 1, '#fff'); px.line(g, x - 3, y - 13, x + 2, y - 7, '#fff', 1); px.line(g, x + 2, y - 13, x - 3, y - 7, '#fff', 1); }
};
G.drawWorldBackdrop = (g, W, H, season, t, dim) => {
  // four quadrants meeting at the clock face of Meridian
  const cx = W / 2, cy = H / 2, qc = ['#2c5a38', '#6a3a24', '#6a4a22', '#2c4a68'], hl = ['#3e7a4a', '#8a4a2c', '#8a6428', '#3e6288'];
  const quads = [[[0, 0], [cx, 0], [cx, cy], [0, cy]], [[cx, 0], [W, 0], [W, cy], [cx, cy]], [[cx, cy], [W, cy], [W, H], [cx, H]], [[0, cy], [cx, cy], [cx, H], [0, H]]];
  const order = [0, 1, 2, 3];
  px.rect(g, 0, 0, W, H, '#120c1e');
  for (const q of order) {
    const act = q === season; px.poly(g, quads[q], G.lerpCol(qc[q], '#000000', dim && !act ? .4 : .1));
    if (act) px.polyDither(g, quads[q], hl[q], .35 + Math.sin(t * 1.2) * .06);
  }
  // pattern: little grass tufts and ridges per quadrant for texture
  for (let i = 0; i < 160; i++) { const x = G.hash2(i, 7) * W, y = G.hash2(i, 13) * H, q = (x < cx ? 0 : 1) + (y < cy ? 0 : 2); const qi = [0, 1, 3, 2][q]; px.rect(g, Math.round(x), Math.round(y), 2, 1, G.lerpCol(qc[qi], '#ffffff', .12)); }
  // the clock face
  const rad = Math.min(W, H) * .13;
  px.ddisc(g, cx, cy, rad * 1.5, '#c8b068', .12);
  px.ell(g, cx, cy, rad * 1.18, rad * 1.18, '#3a2a40'); px.ell(g, cx, cy, rad * 1.1, rad * 1.1, '#1e1630'); px.ell(g, cx, cy, rad, rad, '#2a2040');
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 - Math.PI / 2, r0 = rad * (i % 3 ? .85 : .75); px.line(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * rad * .98, cy + Math.sin(a) * rad * .98, '#c8a860', 1); }
  const ha = t * .05; px.line(g, cx, cy, cx + Math.cos(ha) * rad * .5, cy + Math.sin(ha) * rad * .5, '#8a7a50', 1);
  // season spokes
  const sx = [[cx / 2, cy / 2], [cx * 1.5, cy / 2], [cx * 1.5, cy * 1.5], [cx / 2, cy * 1.5]];
  px.line(g, cx, 0, cx, H, '#00000044', 1); px.line(g, 0, cy, W, cy, '#00000044', 1);
};

/* the spell effect painter: a burst of motes in an element's colour */
G.fxs = [];
G.fxAdd = (x, y, kind, col, life = .6, extra = {}) => G.fxs.push(Object.assign({ x, y, kind, col, t: 0, life }, extra));
G.fxUpdate = dt => { for (const f of G.fxs) f.t += dt; G.fxs = G.fxs.filter(f => f.t < f.life); };
G.fxDraw = g => {
  for (const f of G.fxs) {
    const u = f.t / f.life;
    if (f.kind === 'burst') { for (let i = 0; i < 10; i++) { const a = i * .628 + f.x, d = u * (f.r || 18); px.rect(g, Math.round(f.x + Math.cos(a) * d), Math.round(f.y + Math.sin(a) * d * .7 - u * 4), 2, 2, i % 2 ? f.col : '#fff'); } px.ddisc(g, f.x, f.y, (1 - u) * (f.r || 18) * .8, f.col, (1 - u) * .6); }
    else if (f.kind === 'ring') { const r = u * (f.r || 20); for (let i = 0; i < 18; i++) { const a = i * .349; px.dot(g, Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r * .55), f.col); } }
    else if (f.kind === 'rise') { for (let i = 0; i < 6; i++) px.rect(g, Math.round(f.x + (i - 3) * 3), Math.round(f.y - u * 20 - i * 2), 1, 3, f.col); }
    else if (f.kind === 'text') { G.T(g, f.text, f.x - G.TW(f.text) / 2, f.y - u * 14 - 6, f.col, { shadow: '#000' }); }
    else if (f.kind === 'bolt') { const x = f.x + (f.tx - f.x) * Math.min(1, u * 1.6), y = f.y + (f.ty - f.y) * Math.min(1, u * 1.6); px.ddisc(g, x, y, 5, f.col, .8); px.disc(g, x, y, 2, '#fff'); }
  }
};


/* ===== 40-audio.js ===== */
/* ---- AUDIO: all of it written in code. Music (step-sequencer songs), sound effects (voices), and Animalese babble. ---- */
G.SONGS = {
  title: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'A2 - - - E3 - - - A2 - - - E3 - - - | F2 - - - C3 - - - F2 - - - C3 - - - | D2 - - - A2 - - - D2 - - - A2 - - - | E2 - - - B2 - - - E2 - - - B2 - - -' },
    { wave: 'pulse25', vol: .11, notes: 'A4 - - - C5 - E5 - - - D5 - C5 - - - | C5 - - - A4 - F4 - - - A4 - C5 - - - | D5 - - - F5 - A5 - - - G5 - F5 - - - | E5 - - - - - . . B4 - - - . . . .' },
    { wave: 'saw', vol: .05, notes: 'A3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - - | D3 - - - - - - - - - - - - - - - | E3 - - - - - - - - - - - - - - -' }] },
  spring: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .28, notes: 'C3 . G3 . E3 . G3 . | F3 . C4 . A3 . C4 . | G3 . D4 . B3 . D4 . | C3 . G3 . E3 . G3 .' },
    { wave: 'pulse25', vol: .1, notes: 'E5 - G5 - E5 - D5 - | C5 - F5 - A5 - G5 - | B5 - G5 - D5 - . . | C5 - E5 - G5 - - -' }] },
  summer: { bpm: 116, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'D3 . . D3 . A3 . D3 | G3 . . G3 . D4 . G3 | A3 . . A3 . E4 . A3 | D3 . . D3 . A3 . D3' },
    { wave: 'square', vol: .06, notes: 'F#5 - A5 - D6 - A5 - | G5 - B5 - D6 - B5 - | A5 - C#6 - E6 - C#6 - | D6 - - - A5 - . .' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h . | k . h k s . h .' }] },
  autumn: { bpm: 88, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'E2 - - - B2 - - - | C3 - - - G3 - - - | D3 - - - A3 - - - | B2 - - - F#3 - - -' },
    { wave: 'pulse25', vol: .1, notes: 'B4 - E5 - G5 - E5 - | G4 - C5 - E5 - C5 - | A4 - D5 - F#5 - D5 - | F#4 - B4 - D5 - . .' },
    { wave: 'saw', vol: .035, notes: 'E4 - - - - - - - | C4 - - - - - - - | D4 - - - - - - - | B3 - - - - - - -' }] },
  winter: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .26, notes: 'A2 - - - - - - - | F2 - - - - - - - | C3 - - - - - - - | G2 - - - - - - -' },
    { wave: 'pulse12', vol: .08, notes: 'E6 . . . A5 . . . | C6 . . . F5 . . . | G5 . . . C6 . . . | D6 . . . B5 . . .' },
    { wave: 'sine', vol: .12, notes: 'A4 - - - - - E5 - | A4 - - - - - C5 - | G4 - - - - - E5 - | G4 - - - - - D5 -' }] },
  battle: { bpm: 138, steps: 4, tracks: [
    { wave: 'triangle', vol: .32, notes: 'D2 . D2 . D2 . F2 . | D2 . D2 . A2 . G2 . | Bb1 . Bb1 . Bb1 . D2 . | C2 . C2 . G2 . E2 .' },
    { wave: 'pulse25', vol: .1, notes: 'D5 - F5 - A5 - G5 F5 | D5 - E5 - F5 - A5 - | Bb4 - D5 - F5 - E5 D5 | C5 - E5 - G5 - - -' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s . h h' }] },
  boss: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'E2 E2 . E2 E2 . G2 . | E2 E2 . E2 B2 . A2 . | F2 F2 . F2 F2 . A2 . | D2 D2 . D2 A2 . G2 .' },
    { wave: 'pulse25', vol: .11, notes: 'E5 - - G5 - B5 - A5 | G5 - - E5 - D5 - E5 | F5 - - A5 - C6 - B5 | A5 - - F5 - E5 - D5' },
    { wave: 'triangle', vol: .3, notes: 'E3 . E3 . E3 . E3 . | E3 . E3 . E3 . E3 . | F3 . F3 . F3 . F3 . | D3 . D3 . D3 . D3 .' },
    { wave: 'drums', vol: .11, notes: 'k h s h k k s h' }] },
  event: { bpm: 72, steps: 4, tracks: [
    { wave: 'sine', vol: .2, notes: 'D3 - - - A3 - - - | Bb2 - - - F3 - - - | G2 - - - D3 - - - | A2 - - - E3 - - -' },
    { wave: 'triangle', vol: .13, notes: 'F5 - - - E5 - D5 - | D5 - - - C5 - Bb4 - | Bb4 - - - A4 - G4 - | A4 - - - - - . .' }] },
  victory: { bpm: 126, steps: 4, tracks: [
    { wave: 'pulse25', vol: .12, notes: 'C5 - E5 - G5 - C6 - - - - - . . . . | F5 - A5 - C6 - F6 - - - E6 - D6 - C6 -' },
    { wave: 'triangle', vol: .3, notes: 'C3 - G3 - C4 - G3 - | F3 - C4 - F4 - C4 -' }] },
  defeat: { bpm: 66, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'A2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - -' },
    { wave: 'sine', vol: .16, notes: 'C5 - - - B4 - A4 - | A4 - - - G4 - F4 - | E4 - - - - - - - | . . . . . . . .' }] }
};
G.SFX = {
  cursor: { wave: 'square', freq: 880, dur: .03, vol: .1 }, select: { wave: 'square', freq: 660, arp: [0, 7], step: .04, dur: .12, vol: .18 }, back: { wave: 'square', freq: 440, to: 330, dur: .08, vol: .14 },
  error: { wave: 'square', freq: 160, to: 110, dur: .16, vol: .2 }, page: { wave: 'triangle', freq: 1200, dur: .02, vol: .12 },
  clock: [{ wave: 'noise', freq: 4000, dur: .02, vol: .15, filter: 'highpass' }, { wave: 'triangle', freq: 880, to: 700, dur: .08, vol: .14, delay: .02 }],
  bell: [{ wave: 'sine', freq: 660, dur: .9, vol: .3 }, { wave: 'sine', freq: 1320, dur: .6, vol: .12 }, { wave: 'triangle', freq: 990, dur: .5, vol: .08 }],
  season: [{ wave: 'triangle', freq: 392, arp: [0, 4, 7, 12], step: .12, dur: .6, vol: .3 }, { wave: 'sine', freq: 196, dur: .9, vol: .2 }],
  summon: [{ wave: 'saw', freq: 120, to: 480, dur: .5, vol: .15 }, { wave: 'sine', freq: 600, arp: [0, 7, 12, 16], step: .09, dur: .5, vol: .25, delay: .15 }],
  move: { wave: 'noise', freq: 1800, dur: .04, vol: .06, filter: 'highpass' },
  slash: [{ wave: 'noise', freq: 2400, to: 800, dur: .1, vol: .3 }], hit: [{ wave: 'noise', freq: 1400, to: 400, dur: .12, vol: .4 }, { wave: 'square', freq: 200, to: 70, dur: .1, vol: .25 }],
  miss: { wave: 'noise', freq: 3000, to: 1500, dur: .12, vol: .12, filter: 'bandpass' }, arrow: [{ wave: 'noise', freq: 3000, to: 1200, dur: .16, vol: .15 }, { wave: 'triangle', freq: 1500, to: 600, dur: .14, vol: .1 }],
  magic: [{ wave: 'sine', freq: 500, to: 1500, dur: .3, vol: .25 }, { wave: 'triangle', freq: 750, arp: [0, 5, 9, 12], step: .05, dur: .25, vol: .15, delay: .05 }],
  heal: { wave: 'triangle', freq: 523, arp: [0, 4, 7, 12, 16], step: .06, dur: .4, vol: .32 },
  down: [{ wave: 'square', freq: 400, to: 60, dur: .4, vol: .25 }, { wave: 'noise', freq: 600, to: 100, dur: .35, vol: .2 }],
  bind: [{ wave: 'saw', freq: 90, to: 440, dur: .4, vol: .15 }, { wave: 'square', freq: 880, arp: [0, 3, 7], step: .07, dur: .25, vol: .15, delay: .3 }],
  levelup: { wave: 'square', freq: 523, arp: [0, 4, 7, 12, 16, 19, 24], step: .06, dur: .5, vol: .22 },
  fanfare: [{ wave: 'square', freq: 523, arp: [0, 0, 7, 12, 16, 12, 16, 24], step: .11, dur: .95, vol: .2 }, { wave: 'triangle', freq: 262, arp: [0, 0, 7, 12], step: .22, dur: .95, vol: .3 }],
  lose: [{ wave: 'triangle', freq: 330, arp: [0, -3, -7, -12], step: .24, dur: 1, vol: .3 }],
  coin: { wave: 'square', freq: 988, arp: [0, 5], step: .07, dur: .25, vol: .2 }, candle: [{ wave: 'noise', freq: 800, to: 300, dur: .3, vol: .12, filter: 'lowpass' }, { wave: 'sine', freq: 440, to: 220, dur: .5, vol: .2 }],
  quest: { wave: 'triangle', freq: 392, arp: [0, 4, 7, 4, 7, 12], step: .07, dur: .4, vol: .25 }, stillness: [{ wave: 'sine', freq: 220, to: 110, dur: 1.2, vol: .3 }, { wave: 'triangle', freq: 1760, to: 1200, dur: 1, vol: .06 }]
};
G.initAudio = game => { for (const k in G.SFX) game.audio.define('b_' + k, G.SFX[k]); };
G.sfx = (name, o) => { try { G.game.audio.sfx('b_' + name, o); } catch (e) { } };
G.music = (name, o) => { try { if (G.musicNow === name && !(o && o.restart)) return; G.musicNow = name; G.game.audio.music(name ? G.SONGS[name] : null, Object.assign({ fade: .6 }, o || {})); } catch (e) { } };
/* Animalese babble: each typed letter is a short bleep. Vowels sing, consonants click. who = a pitch multiplier. */
G.babble = (ch, pitch = 1) => {
  if (!/[a-z]/i.test(ch)) return;
  const c = ch.toLowerCase().charCodeAt(0) - 97, vowel = 'aeiou'.includes(ch.toLowerCase());
  const f = 190 * pitch * Math.pow(2, ((c * 5) % 12) / 12 * (vowel ? .9 : .6) - .15);
  const v = vowel ? { wave: pitch > 1.1 ? 'triangle' : 'square', freq: f, to: f * (1 + ((c % 3) - 1) * .08), dur: .07, vol: .09 } : { wave: 'noise', freq: f * 5, dur: .035, vol: .07, filter: 'bandpass' };
  G.sfx_raw(v);
};
G.sfx_raw = v => { try { G.game.audio.sfx(v, { vary: .02 }); } catch (e) { } };


/* ===== 50-ui.js ===== */
/* ---- 10-FOOT UI KIT: focus model (d-pad, stick, hover, click), lists, prompts, sliders, dialog. ---- */
G.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Enter', 'NumpadEnter', 'KeyZ', 'Pad0'], cancel: ['Backspace', 'KeyX', 'Pad1', 'Mouse2'], alt: ['Space', 'KeyC', 'Pad2'], info: ['Tab', 'KeyI', 'Pad3'],
  prev: ['KeyQ', 'PageUp', 'Pad4'], next: ['KeyE', 'PageDown', 'Pad5'], view: ['KeyV', 'Pad10'], help: ['F1', 'KeyH'],
  start: ['Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
};
const UI = G.UI = { rects: [], ptr: null, moved: false, click: null, lastPtr: null, mouse: false, toasts: [], now: 0, t: 0 };
G.activity = () => { G.lastActivity = performance.now() / 1000; };
G.idle = () => performance.now() / 1000 - (G.lastActivity || 0);
UI.pump = () => {
  const I = G.game.input; const gl = G.game.settings.glyphs === 'Xbox' ? 'xbox' : 'playstation'; if (I.glyphs !== gl) I.glyphs = gl;
  const p = I.pointer ? I.pointer() : null;
  UI.moved = !!(p && UI.lastPtr && (Math.abs(p[0] - UI.lastPtr[0]) > 1 || Math.abs(p[1] - UI.lastPtr[1]) > 1));
  if (p) UI.lastPtr = p.slice(); UI.ptr = p;
  UI.click = I.clicked ? I.clicked() : null;
  if (UI.moved || UI.click) UI.mouse = true;
  if (I.anyPressed()) UI.mouse = false;
  if (UI.moved || UI.click || I.anyPressed()) G.activity();
  UI.t += 1 / 120;
};
UI.begin = () => { UI.rects = []; };
UI.add = (owner, i, x, y, w, h) => { UI.rects.push({ owner, i, x, y, w, h }); };
UI.hit = (owner) => {   // the rect under the pointer for an owner (or any owner when null)
  const p = UI.ptr; if (!p) return null;
  for (let k = UI.rects.length - 1; k >= 0; k--) { const r = UI.rects[k]; if ((owner == null || r.owner === owner) && p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h) return r; }
  return null;
};
UI.clickIn = (x, y, w, h) => !!(UI.click && UI.click[0] >= x && UI.click[0] < x + w && UI.click[1] >= y && UI.click[1] < y + h);
UI.nav = () => { const I = G.game.input; return { x: (I.repeat('right', .35, .09) ? 1 : 0) - (I.repeat('left', .35, .09) ? 1 : 0), y: (I.repeat('down', .35, .09) ? 1 : 0) - (I.repeat('up', .35, .09) ? 1 : 0) }; };
UI.pressed = a => G.game.input.pressed(a);
UI.toast = (text, col) => { UI.toasts.push({ text, col: col || '#f4eed8', t: 0 }); if (UI.toasts.length > 3) UI.toasts.shift(); };
UI.drawToasts = (g, W, H, dt) => {
  UI.toasts.forEach((t, i) => { t.t += dt; const w = G.TW(t.text) + 14, x = Math.round((W - w) / 2), y = 20 + i * 14 - Math.max(0, t.t - 2.4) * 20; G.box(g, x, y, w, 13, { alpha: .9 }); G.T(g, t.text, x + 7, y + 3, t.col); });
  UI.toasts = UI.toasts.filter(t => t.t < 3);
};
/* the prompt bar: glyphs follow the device used last (PlayStation or Xbox pad glyphs, keys, mouse) */
UI.prompts = (g, W, H, items) => {
  const I = G.game.input, dev = I.lastDevice; let x = 6; const y = H - 13;
  px.rect(g, 0, y - 2, W, 15, '#0a061488');
  for (const it of items) {
    if (!it) continue; const [a, text] = it; let lab = I.label(a) || a;
    if (a === 'dpad') lab = dev === 'gamepad' ? 'D-pad' : 'Arrows';
    const col = dev === 'gamepad' ? G.PAD_COL[lab] : '#3a3258'; x += G.chip(g, x, y - 1, lab, col) + 2; G.T(g, text, x, y, '#d8d0f0'); x += G.TW(text) + 9;
    if (x > W - 20) break;
  }
};
UI.cornerSafe = () => { try { const c = G.game.cornerArea(); return c || null; } catch (e) { return null; } };

/* a vertical list: items { label, sub, disabled, col, tag } */
UI.List = class {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.top = 0; this.rows = o.rows || 8; this.o = o; this.id = {}; this.wrap = o.wrap !== false; }
  set(items) { this.items = items; this.i = Math.min(this.i, Math.max(0, items.length - 1)); }
  cur() { return this.items[this.i]; }
  update() {
    const n = this.items.length; if (!n) return I_cancel() ? { cancel: true } : null;
    const nav = UI.nav(); if (nav.y) { this.i = this.wrap ? (this.i + nav.y + n) % n : G.clamp(this.i + nav.y, 0, n - 1); G.sfx('cursor'); }
    if (this.o.horizontal && nav.x) { this.i = (this.i + nav.x + n) % n; G.sfx('cursor'); }
    if (this.top > this.i) this.top = this.i; if (this.i >= this.top + this.rows) this.top = this.i - this.rows + 1;
    const h = UI.hit(this.id);
    if (h && (UI.moved) && h.i !== this.i) { this.i = h.i; G.sfx('cursor'); }
    if (h && UI.click) { this.i = h.i; if (!this.items[this.i].disabled) { G.sfx('select'); return { pick: this.i }; } G.sfx('error'); return null; }
    if (G.game.input.pressed('confirm') && !UI.click) { if (this.items[this.i].disabled) { G.sfx('error'); return null; } G.sfx('select'); return { pick: this.i }; }
    if (I_cancel()) return { cancel: true };
    if (this.o.tabs) { if (G.game.input.pressed('prev')) return { prev: true }; if (G.game.input.pressed('next')) return { next: true }; }
    return null;
  }
  draw(g, x, y, w, rowH = 12) {
    const n = this.items.length, vis = Math.min(n, this.rows);
    for (let k = 0; k < vis; k++) {
      const i = this.top + k, it = this.items[i]; if (!it) break; const yy = y + k * rowH, sel = i === this.i;
      UI.add(this.id, i, x, yy, w, rowH);
      if (sel) { px.rect(g, x, yy, w, rowH - 1, '#4a3a7a'); px.rect(g, x, yy, w, 1, '#8a78c8'); px.rect(g, x - 2, yy + 2, 2, rowH - 5, '#f0c860'); }
      const col = it.disabled ? '#7a7490' : (it.col || (sel ? '#fff8d8' : '#d8d0f0'));
      G.T(g, it.label, x + 4, yy + 2, col);
      if (it.tag) G.T(g, it.tag, x + w - 4 - G.TW(it.tag), yy + 2, it.tagCol || '#f0c860');
    }
    if (this.top > 0) px.poly(g, [[x + w - 10, y - 2], [x + w - 4, y - 2], [x + w - 7, y - 6]], '#f0c860'); if (this.top + vis < n) px.poly(g, [[x + w - 10, y + vis * rowH + 1], [x + w - 4, y + vis * rowH + 1], [x + w - 7, y + vis * rowH + 5]], '#f0c860');
  }
};
const I_cancel = () => { const I = G.game.input; return I.pressed('cancel'); };
G.cancelPressed = I_cancel;

/* a slider row: label, value, left/right adjusts */
UI.slider = (g, x, y, w, label, v, min, max, sel) => {
  if (sel) { px.rect(g, x, y, w, 11, '#4a3a7a'); px.rect(g, x - 2, y + 2, 2, 6, '#f0c860'); }
  G.T(g, label, x + 4, y + 2, sel ? '#fff8d8' : '#d8d0f0');
  const bw = Math.round(w * .34), bx = x + w - bw - 38; G.bar(g, bx, y + 3, bw, 5, (v - min) / (max - min), sel ? '#f0c860' : '#8a78c8');
  const txt = Number.isInteger(v) ? String(v) : v.toFixed(2); G.T(g, txt, x + w - 4 - G.TW(txt), y + 2, '#f0c860');
};

/* word wrap helper using the engine's font */
UI.wrap = (s, w) => E.font.wrap(String(s), w);
UI.text = (g, s, x, y, w, col, lh = 9) => { const ls = UI.wrap(s, w); ls.forEach((l, i) => G.T(g, l, x, y + i * lh, col)); return ls.length * lh; };

/* the talk box: typed text with Animalese per letter, a portrait, choices */
UI.Say = class {
  constructor() { this.lines = []; this.i = 0; this.n = 0; this.t = 0; this.choice = null; this.done = false; this.list = null; }
  start(lines) { this.lines = lines; this.i = 0; this.n = 0; this.t = 0; this.done = false; this.list = null; this.skipN = 0; this.enter(); }
  enter() { const l = this.lines[this.i]; this.n = 0; this.t = 0; this.list = null; this.chosen = null; if (l) { this.full = String(l.text).length; if (l.set) { } } }
  cur() { return this.lines[this.i]; }
  update(dt) {
    const l = this.cur(); if (!l || this.done) return null;
    const I = G.game.input, speed = I.down('alt') ? 160 : 48;
    if (this.n < this.full) {
      this.t += dt * speed; const m = Math.min(this.full, Math.floor(this.t));
      while (this.n < m) { const ch = String(l.text)[this.n]; if (this.n % 2 === 0) G.babble(ch, l.voice || 1); this.n++; }
      if (I.pressed('confirm') || (UI.click)) { this.n = this.full; this.t = this.full; }
      return null;
    }
    if (l.choices && !this.list) { this.list = new UI.List(l.choices.map(c => ({ label: c.text })), { rows: 4 }); }
    if (this.list) { const r = this.list.update(); if (r && r.pick != null) { const c = l.choices[r.pick]; this.chosen = c; return this.advance(c); } return null; }
    if (I.pressed('confirm') || UI.click) { G.sfx('page'); return this.advance(null); }
    return null;
  }
  advance(choice) { const l = this.cur(); if (this.i + 1 >= this.lines.length) { this.done = true; return { done: true, choice, last: l }; } this.i++; this.enter(); return { choice, step: true }; }
  draw(g, W, H, portraitFn) {
    const l = this.cur(); if (!l) return;
    const bh = 58, y = H - bh - 16, x = 6, w = W - 12;
    G.box(g, x, y, w, bh, { alpha: .96 });
    let tx = x + 8;
    if (l.who && l.who !== 'narrator' && portraitFn) { G.box(g, x + 4, y - 14, 48, 56, { bg: ['#1a1230', '#0a0618'] }); portraitFn(g, x + 6, y - 12, 44, l.who); tx = x + 58; }
    if (l.name) { const nw = G.TW(l.name) + 12; G.box(g, tx - 4, y - 8, nw, 12, { bg: ['#4a3a7a', '#2a1a4a'] }); G.T(g, l.name, tx + 2, y - 5, '#ffe8a0'); }
    const txt = String(l.text).slice(0, this.n);
    const col = l.who === 'narrator' ? '#c8d8f0' : '#f4eed8';
    UI.text(g, txt, tx, y + 8, w - (tx - x) - 10, col, 10);
    if (this.n >= this.full && !this.list) { if (Math.floor(UI.t * 2) % 2) px.poly(g, [[x + w - 16, y + bh - 12], [x + w - 8, y + bh - 12], [x + w - 12, y + bh - 7]], '#f0c860'); }
    if (this.list) { const lw = 150, lh = this.list.items.length * 12 + 6, lx = W - lw - 12, ly = y - lh - 2; G.box(g, lx, ly, lw, lh); this.list.draw(g, lx + 4, ly + 4, lw - 8); }
  }
};


/* ===== 62-scene-campaign.js ===== */
/* ---- The campaign scene: Tidings, Muster, March, resolution ---- */
G.run = null;
G.startCampaign = (human, difficulty, seed, humans) => {
  G.clearRigs(); G.run = { S: C.create({ human, humans, difficulty, seed }), stage: 'boot', cursor: G.REALMS[human].cap, t: 0 };
  return G.run;
};
const RN = id => G.REALMS[id] ? (G.REALMS[id].short || G.REALMS[id].name) : '?';
const KS = id => (G.KNIGHTS[id] || {}).short || id;
const monName = m => G.get('monster', m.species).names[m.form];
G.CampaignScene = class {
  constructor() { this.stack = []; this.t = 0; this.cards = []; this.ci = 0; this.ct = 0; this.dispatch = []; this.arrowT = 0; this.world = null; this.marchSel = null; this.rect = { x: 14, y: 22, w: 399, h: 186 }; }
  get S() { return G.run.S; }
  enter(data) {
    const run = G.run; this.t = 0; this.stack = []; G.motesInit(40); this.cursor = this.cursorNear(); this.marching = false;
    if (data && data.resume === 'after') { run.stage = 'resolve'; G.music('battle'); this.resolveNext(); return; }
    if (run.stage === 'event') { this.cards = []; this.finishTidings(); return; }
    if (run.stage === 'boot') { run.stage = 'tidings'; C.startTidings(run.S); this.beginTidings(); }
    else if (run.stage === 'tidings') this.beginTidings();
    else if (run.stage === 'resolve') this.resolveNext();
    G.music(this.musicFor());
  }
  musicFor() { return ['spring', 'summer', 'autumn', 'winter'][this.S.season]; }
  beginTidings() {
    const S = this.S; this.cards = S.cards.slice(); this.ci = 0; this.ct = 0; G.run.stage = 'tidings'; G.music(this.musicFor()); G.sfx('season');
    this.dispatch = [];
  }
  /* ---- tidings cards ---- */
  tidingsUpdate(dt) {
    const I = G.game.input; this.ct += dt;
    if (this.ct > .35 && (I.pressed('confirm') || UI.click || I.pressed('alt'))) {
      this.ci++; this.ct = 0; G.sfx('page');
      if (I.down('alt') && I.pressed('alt')) this.ci = this.cards.length;
      if (this.ci >= this.cards.length) this.finishTidings();
    }
  }
  finishTidings() {
    const S = this.S;
    if (S.over) { this.toEnding(); return; }
    try { G.game.saves.autosave(); } catch (e) { }
    if (S.pending && S.pending.length) { const id = S.pending.shift(); S.eventsDone[id] = true; G.run.stage = 'event'; G.game.go('event', { id, back: 'campaign' }); return; }
    G.run.stage = 'muster'; this.cursor = this.cursorNear(); G.music(this.musicFor()); G.activity();
  }
  cursorNear() { const run = G.run; return run.cursor != null ? run.cursor : G.REALMS[this.S.human].cap; }
  toEnding() { G.run.stage = 'ended'; G.game.go('ending', { kind: this.S.over.kind, realm: this.S.over.realm != null ? this.S.over.realm : this.S.human, won: this.S.over.won }); }
  /* ---- panels ---- */
  open(p) { p.list.id = p.list.id || {}; this.stack.push(p); G.sfx('select'); }
  close() { this.stack.pop(); G.sfx('back'); }
  closeAll() { this.stack = []; }
  castleMenu(cid) {
    const S = this.S, c = S.castles[cid], cd = G.CASTLES[cid]; const mine = c.owner === S.human;
    if (!mine) return;
    const items = [
      { label: 'Summon', id: 'summon', disabled: c.stilled, tag: c.stilled ? 'Stilled' : (3 - c.summons) + ' left' },
      { label: 'Knights', id: 'knights', tag: c.knights.length + '' }, { label: 'Reserve', id: 'reserve', tag: c.reserve.length + '' },
      { label: 'Realm items', id: 'items', tag: S.realms[S.human].items.length + '' }];
    this.open({ title: cd.short, w: 112, list: new UI.List(items, { rows: 4 }), onPick: it => { if (it.id === 'summon') this.summonPanel(cid); else if (it.id === 'knights') this.knightsPanel(cid); else if (it.id === 'reserve') this.reservePanel(cid); else this.itemsPanel(cid); } });
  }
  summonPanel(cid) {
    const S = this.S, cd = G.CASTLES[cid], items = cd.circle.map(id => { const sp = G.get('monster', id), cost = C.summonCost(sp); return { label: sp.names[0], id, tag: cost + '', disabled: S.realms[S.human].mana < cost }; });
    this.open({ title: 'The circle: ' + (3 - S.castles[cid].summons) + ' summons left', w: 120, list: new UI.List(items, { rows: 6 }), side: it => this.speciesCard(it.id),
      onPick: (it) => { const r = C.summon(S, cid, it.id); if (r.ok) { G.sfx('summon'); const cp = G.mapPos(G.CASTLES[cid], this.rect); G.fxAdd(cp[0], cp[1] - 6, 'ring', G.SEASON_COL[G.get('monster', it.id).el], .8, { r: 24 }); G.fxAdd(cp[0], cp[1] - 6, 'burst', '#fff', .6, { r: 20 }); UI.toast(r.text); } else { G.sfx('error'); UI.toast(r.text, '#f09090'); } this.refreshPanels(); } });
  }
  speciesCard(id) {
    const sp = G.get('monster', id);
    return (g, x, y) => { G.box(g, x, y, 96, 84); G.drawMon(g, sp, 0, x + 28, y + 36, { t: this.t, scale: 1.4 }); G.T(g, sp.names[0], x + 6, y + 40, '#ffe8a0'); G.T(g, sp.names[1] + ' > ' + sp.names[2], x + 6, y + 49, '#a8a0c8', { font: 'tiny' }); G.T(g, G.SEASONS[sp.el] || 'Hour', x + 6, y + 58, G.SEASON_COL[sp.el]);
      G.T(g, `HP ${sp.hp}  ATK ${sp.atk}`, x + 6, y + 67, '#d8d0f0'); G.T(g, `DEF ${sp.def}  INT ${sp.int}  Bond ${sp.bond}`, x + 6, y + 75, '#d8d0f0', { font: 'tiny' }); };
  }
  refreshPanels() { for (const p of this.stack) if (p.refresh) p.refresh(); }
  knightsPanel(cid) {
    const S = this.S, mk = () => S.castles[cid].knights.map(id => { const k = S.knights[id]; return { label: KS(id) + ' ' + G.className(k), id, tag: 'Lv' + k.lvl + (k.wounded ? ' +' : '') + (k.moved ? ' -' : '') }; });
    const p = { title: 'Knights at ' + G.CASTLES[cid].short, w: 150, list: new UI.List(mk(), { rows: 6 }), refresh: () => { p.list.set(mk()); },
      side: it => it && ((g, x, y) => this.knightCard(g, x, y, it.id)), onPick: it => this.knightMenu(it.id, cid) };
    this.open(p);
  }
  knightCard(g, x, y, id) {
    const S = this.S, k = S.knights[id], st = G.knightStats(k); G.box(g, x, y, 126, 106);
    const rig = G.rigFor('pt:' + id + ':' + k.tier, () => new E.Humanoid(G.knightLook(id, k.line, k.tier, k.realm, 1.3))); rig.drawPortrait(g, x + 4, y + 4, 34, { zoom: 2.4, turn: .35, bg: '#1a1230', frame: true });
    G.T(g, KS(id), x + 42, y + 5, '#ffe8a0'); G.T(g, G.className(k), x + 42, y + 15, '#d8d0f0'); G.T(g, 'Lv ' + k.lvl + '  xp ' + k.xp + '/' + C.xpNeed(k.lvl), x + 42, y + 25, '#a8a0c8', { font: 'tiny' });
    G.T(g, `HP ${st.hp} MP ${st.mp}`, x + 6, y + 42, '#d8d0f0'); G.T(g, `ATK ${st.atk} DEF ${st.def} INT ${st.int}`, x + 6, y + 52, '#d8d0f0'); G.T(g, `Bond ${C.bondUsed(S, k)}/${st.bond}  Move ${st.mov}`, x + 6, y + 62, '#d8d0f0');
    UI.text(g, 'Troop: ' + (k.mons.length ? k.mons.map(m => monName(S.mons[m])).join(', ') : 'none'), x + 6, y + 73, 118, '#a8a0c8', 8); const eq = ['w', 'a', 'c'].map(s => k.equip[s] ? G.get('item', k.equip[s]).name : '-').join(' / '); G.T(g, eq, x + 6, y + 95, '#8a82a8', { font: 'tiny' });
  }
  knightMenu(kid, cid) {
    const S = this.S, k = S.knights[kid], c = S.castles[cid];
    const mk = () => [
      { label: 'Bind monsters', id: 'bind' }, { label: 'Equip', id: 'equip' },
      { label: 'Move to a neighbour', id: 'move', disabled: k.moved || k.wounded || c.stilled, tag: k.moved ? 'moved' : '' },
      { label: 'Go questing', id: 'quest', disabled: !C.canQuest(S, k), tag: k.ruler ? 'ruler' : (G.SITES[cid][0]).replace('The ', '') },
      { label: 'Change class', id: 'promote', disabled: !(C.canPromoteKnight(S, k, false)), tag: k.tier === 0 ? 'Lv10' : k.tier === 1 ? 'Writ' : '' }];
    if (C.canPromoteKnight(S, k, false) && k.tier === 0) { } 
    this.open({ title: KS(kid), w: 140, list: new UI.List(mk(), { rows: 5 }), side: () => (g, x, y) => this.knightCard(g, x, y, kid), refresh() { this.list.set(mk()); },
      onPick: it => {
        if (it.id === 'bind') this.bindPanel(kid, cid);
        else if (it.id === 'equip') this.equipPanel(kid);
        else if (it.id === 'move') this.movePanel(kid, cid);
        else if (it.id === 'quest') { const r = C.quest(S, kid); UI.toast(r.text, r.ok ? '#c8f0c8' : '#f09090'); G.sfx(r.ok ? 'quest' : 'error'); this.stack.pop(); this.refreshPanels(); if (this.stack.length) { } }
        else if (it.id === 'promote') { const r = C.promoteKnight(S, kid); UI.toast(r.text, r.ok ? '#c8f0c8' : '#f09090'); if (r.ok) { G.sfx('levelup'); const cp = G.mapPos(G.CASTLES[cid], this.rect); G.fxAdd(cp[0], cp[1] - 6, 'rise', '#ffe070', 1); } this.refreshPanels(); }
      } });
  }
  bindPanel(kid, cid) {
    const S = this.S, k = S.knights[kid], c = S.castles[cid];
    const mk = () => { const ids = k.mons.concat(c.reserve); return ids.map(id => { const m = S.mons[id], sp = G.get('monster', m.species); return { label: monName(m) + ' Lv' + m.lvl, id, tag: (m.owner ? '* ' : 'o ') + 'bond ' + sp.bond, tagCol: m.owner ? '#80f090' : '#a8a0c8' }; }); };
    this.open({ title: 'Bind to ' + KS(kid) + '  ' + C.bondUsed(S, k) + '/' + C.bondCap(S, k), w: 150, list: new UI.List(mk(), { rows: 7 }), refresh() { this.list.set(mk()); this.title = 'Bind to ' + KS(kid) + '  ' + C.bondUsed(S, k) + '/' + C.bondCap(S, k); },
      onPick: it => { const m = S.mons[it.id]; const r = m.owner ? C.unbind(S, it.id) : C.bind(S, it.id, kid); if (r.ok) G.sfx('bind', { vol: .5 }); else G.sfx('error'); UI.toast(r.text || '', r.ok ? '#c8f0c8' : '#f09090'); this.refreshPanels(); },
      side: it => it && S.mons[it.id] && ((g, x, y) => { const m = S.mons[it.id], sp = G.get('monster', m.species); G.box(g, x, y, 96, 70); G.drawMon(g, sp, m.form, x + 28, y + 34, { t: this.t, scale: 1.3 }); G.T(g, monName(m), x + 6, y + 40, '#ffe8a0'); const s = G.monStats(sp, m.form, m.lvl); G.T(g, `HP ${s.hp} ATK ${s.atk}`, x + 6, y + 50, '#d8d0f0'); G.T(g, `DEF ${s.def} INT ${s.int}`, x + 6, y + 59, '#d8d0f0'); }) });
  }
  equipPanel(kid) {
    const S = this.S, k = S.knights[kid], pool = S.realms[k.realm].items;
    const mk = () => { const it = [...new Set(pool.filter(i => ['w', 'a', 'c'].includes(G.get('item', i).slot)))].map(i => ({ label: G.get('item', i).name, id: i, tag: G.get('item', i).text })); for (const s of ['w', 'a', 'c']) if (k.equip[s]) it.push({ label: 'Remove ' + G.get('item', k.equip[s]).name, id: '-' + s, col: '#e0a0a0' }); return it.length ? it : [{ label: 'No equipment in the chest', id: '', disabled: true }]; };
    this.open({ title: 'Equip ' + KS(kid), w: 170, list: new UI.List(mk(), { rows: 6 }), refresh() { this.list.set(mk()); }, onPick: it => { if (it.id.startsWith('-')) { const s = it.id[1], old = k.equip[s]; k.equip[s] = null; delete k.equip[s]; pool.push(old); G.sfx('back'); } else { const r = C.equip(S, kid, it.id); UI.toast(r.text); G.sfx('select'); } this.refreshPanels(); } });
  }
  movePanel(kid, cid) {
    const S = this.S, mk = () => G.ADJ[cid].filter(n => S.castles[n].owner === S.human).map(n => ({ label: G.CASTLES[n].short, id: n, tag: S.castles[n].knights.length + ' knights', disabled: S.castles[n].stilled }));
    const items = mk(); if (!items.length) { UI.toast('No friendly castle is adjacent.', '#f09090'); G.sfx('error'); return; }
    this.open({ title: 'Move ' + KS(kid), w: 150, list: new UI.List(items, { rows: 6 }), onPick: it => { const r = C.moveKnight(S, kid, it.id); UI.toast(r.text, r.ok ? '#c8f0c8' : '#f09090'); if (r.ok) { G.sfx('move'); this.closeAll(); G.run.cursor = it.id; this.cursor = it.id; } else G.sfx('error'); } });
  }
  reservePanel(cid) {
    const S = this.S, c = S.castles[cid], mk = () => c.reserve.map(id => { const m = S.mons[id]; return { label: monName(m) + ' Lv' + m.lvl, id, tag: C.canPromoteMon(S, m, false) ? 'can promote' : '', tagCol: '#ffd870' }; });
    this.open({ title: 'Reserve at ' + G.CASTLES[cid].short, w: 150, list: new UI.List(mk().length ? mk() : [{ label: 'Nothing here', disabled: true }], { rows: 7 }), refresh() { const m = mk(); this.list.set(m.length ? m : [{ label: 'Nothing here', disabled: true }]); },
      onPick: it => { if (!S.mons[it.id]) return; const m = S.mons[it.id];
        this.open({ title: monName(m), w: 110, list: new UI.List([{ label: 'Promote', id: 'p', disabled: !C.canPromoteMon(S, m, false) }, { label: 'Use Season Seed', id: 's', disabled: !S.realms[S.human].items.includes('seed') || !C.canPromoteMon(S, m, true) || C.canPromoteMon(S, m, false) }, { label: 'Dismiss', id: 'd', col: '#e0a0a0' }], { rows: 3 }), onPick: o => {
          if (o.id === 'd') { this.open({ title: 'Dismiss ' + monName(m) + '?', w: 100, list: new UI.List([{ label: 'Yes, release it', id: 'y' }, { label: 'No', id: 'n' }], { rows: 2 }), onPick: q => { if (q.id === 'y') { C.dismiss(S, m.id); G.sfx('back'); } this.stack.pop(); this.stack.pop(); this.refreshPanels(); } }); return; }
          const r = o.id === 'p' ? C.promoteMon(S, m.id) : C.useItem(S, S.human, 'seed', m.id); UI.toast(r.text, r.ok ? '#c8f0c8' : '#f09090'); if (r.ok) { G.sfx('levelup'); } this.stack.pop(); this.refreshPanels(); } }); } });
  }
  itemsPanel(cid) {
    const S = this.S, pool = S.realms[S.human].items, mk = () => { const u = [...new Set(pool)].map(i => ({ label: G.get('item', i).name + ' x' + pool.filter(x => x === i).length, id: i, tag: G.get('item', i).text })); return u.length ? u : [{ label: 'The chest is empty', disabled: true }]; };
    this.open({ title: 'Realm items', w: 180, list: new UI.List(mk(), { rows: 7 }), refresh() { this.list.set(mk()); }, onPick: it => {
      const d = G.get('item', it.id); if (d.slot === 'seed') { UI.toast('Use it from the Reserve screen on a monster.'); return; } if (d.slot === 'writ') { const ks = C.knightsOf(S, S.human).filter(k => k.tier === 1 && k.lvl >= 20); if (!ks.length) { UI.toast('No knight is ready for the Writ (class tier 2, Lv 20).'); return; } const k = ks[0]; const r = C.useItem(S, S.human, 'writ', k.id); UI.toast(r.text); G.sfx('levelup'); this.refreshPanels(); return; }
      if (d.heal || d.mp) { UI.toast('Use it in battle, or on the Reserve.'); return; } UI.toast('Equip it from a knight\'s Equip screen.'); } });
  }
  commandsMenu() {
    const S = this.S, targets = C.targetsFor(S, S.human);
    const items = [{ label: 'March', id: 'march', disabled: !targets.length, tag: S.marches.filter(m => m.realm === S.human).length + ' declared' }, { label: 'Realms', id: 'realms' }, { label: 'End Muster', id: 'end', col: '#ffe8a0' }, { label: 'How to play', id: 'help' }];
    this.open({ title: 'Commands', w: 120, list: new UI.List(items, { rows: 4 }), onPick: it => {
      if (it.id === 'march') { this.stack = []; this.startMarchPick(); }
      else if (it.id === 'realms') this.realmsPanel();
      else if (it.id === 'help') { G.game.go('help', { back: 'campaign' }); }
      else if (it.id === 'end') this.open({ title: 'End the Muster and march?', w: 140, list: new UI.List([{ label: 'Yes: let the marches begin', id: 'y' }, { label: 'Not yet', id: 'n' }], { rows: 2 }), onPick: q => { if (q.id === 'y') { this.closeAll(); this.finishMuster(); } else this.close(); } });
    } });
  }
  realmsPanel() {
    const S = this.S; const items = G.REALMS.map(r => ({ label: RN(r.id) + (S.realms[r.id].alive ? '' : ' (fallen)'), id: r.id, tag: C.castlesOf(S, r.id).length + ' castles', col: r.col }));
    this.open({ title: 'The realms of Forseason', w: 150, list: new UI.List(items, { rows: 6 }), side: it => it && ((g, x, y) => { const r = G.REALMS[it.id]; G.box(g, x, y, 130, 70); UI.text(g, r.blurb, x + 6, y + 6, 118, '#d8d0f0', 9); G.T(g, 'Knights ' + C.knightsOf(S, r.id).length + '  Monsters ' + C.monCount(S, r.id), x + 6, y + 52, '#ffe8a0'); if (r.id === S.human) G.T(g, 'Mana ' + S.realms[r.id].mana, x + 6, y + 61, '#80c0ff'); }), onPick: () => { } });
  }
  /* ---- marches ---- */
  startMarchPick() {
    const S = this.S; this.marchTargets = C.targetsFor(S, S.human); if (!this.marchTargets.length) { UI.toast('No enemy castle is within reach.', '#f09090'); return; }
    this.marching = true; this.cursor = this.marchTargets.includes(this.cursor) ? this.cursor : this.marchTargets[0]; G.sfx('select');
  }
  marchChoose(target) {
    const S = this.S, ks = C.marchersFor(S, S.human, target), cur = S.marches.find(m => m.realm === S.human && m.to === target), sel = new Set(cur ? cur.from : []);
    const mk = () => ks.map(k => ({ label: (sel.has(k.id) ? '[x] ' : '[ ] ') + KS(k.id) + ' (' + G.CASTLES[k.at].short + ')', id: k.id, tag: 'Lv' + k.lvl + ' P' + Math.round(C.power(S, k)) }));
    const items = () => mk().concat([{ label: 'Declare this march', id: '!', col: '#ffe8a0' }, { label: 'Stand down', id: 'x', col: '#e0a0a0' }]);
    const tc = S.castles[target], dp = tc.knights.reduce((a, id) => a + C.power(S, S.knights[id]), 0);
    this.open({ title: 'March on ' + G.CASTLES[target].short, w: 170, list: new UI.List(items(), { rows: 6 }), refresh() { this.list.set(items()); },
      side: () => (g, x, y) => { G.box(g, x, y, 100, 52); G.T(g, RN(tc.owner), x + 6, y + 5, G.REALMS[tc.owner].col); G.T(g, 'Defenders: ' + tc.knights.length, x + 6, y + 15, '#d8d0f0'); G.T(g, 'Power ~' + Math.round(dp), x + 6, y + 25, '#d8d0f0'); const mine = [...sel].reduce((a, id) => a + C.power(S, S.knights[id]), 0); G.T(g, 'Yours ~' + Math.round(mine), x + 6, y + 35, mine > dp ? '#80f090' : '#f0a060'); },
      onPick: it => {
        if (it.id === '!') { if (!sel.size) { UI.toast('Choose at least one knight.', '#f09090'); G.sfx('error'); return; } C.declare(S, S.human, target, [...sel]); G.sfx('quest'); this.closeAll(); this.marching = false; UI.toast('March declared on ' + G.CASTLES[target].short + '.'); }
        else if (it.id === 'x') { C.declare(S, S.human, target, []); this.closeAll(); this.marching = false; }
        else { if (sel.has(it.id)) sel.delete(it.id); else if (sel.size < 2) sel.add(it.id); else { UI.toast('Two knights per march.'); G.sfx('error'); return; } this.refreshPanels(); }
      } });
  }
  finishMuster() {
    const S = this.S; this.marching = false;
    if (C.nextSeat(S)) { G.run.stage = 'handover'; this.cursor = G.run.cursor = G.REALMS[S.human].cap; G.sfx('bell'); this.ct = 0; return; }
    this.endMuster();
  }
  endMuster() { const S = this.S; C.endMuster(S); G.run.stage = 'resolve'; G.music('battle'); this.resolveNext(); }
  /* ---- resolution ---- */
  resolveNext() {
    const S = this.S; if (S.over) { this.toEnding(); return; }
    const res = C.resolveAI(S, false);
    for (const r of res) this.dispatch.push(r.free ? `${RN(r.a.realm)} walks into ${G.CASTLES[r.a.to].short}: the gates stand open.` : `${RN(r.a.realm)} ${r.out.won ? 'takes' : 'fails to take'} ${G.CASTLES[r.a.to].short}.`);
    if (S.over) { this.toEnding(); return; }
    if (S.queue.length) {
      const n = C.nextAttack(S); if (!n) { this.resolveNext(); return; }
      if (n.free) { this.dispatch.push(`${RN(n.attack.realm)} walks into ${G.CASTLES[n.attack.to].short}: the gates stand open.`); G.run.stage = 'resolve'; if (S.over) { this.toEnding(); return; } this.resolveNext(); return; }
      const a = n.attack, spec = C.battleSpecFor(S, a); this.pending = { a, spec };
      const att = C.isHuman(S, a.realm); const title = `${RN(a.realm)} marches on ${G.CASTLES[a.to].short}`;
      G.run.stage = 'resolveAsk';
      this.open({ title, w: 150, list: new UI.List([{ label: att ? 'Command the battle' : 'Defend in person', id: 'cmd' }, { label: 'Delegate to the captains', id: 'del' }], { rows: 2 }), noCancel: true, onPick: it => {
        this.closeAll(); if (it.id === 'cmd') { G.run.stage = 'battle'; G.game.go('battle', { spec, attack: a, campaign: true, mapName: spec.map }); } else { const r = C.auto(S, a, spec); this.showResult(r.out, r.sim, a); } } });
      return;
    }
    this.endSeason();
  }
  afterBattle(d) { const S = this.S; this.stack = []; this.showResult(d.out, d.sim, d.attack, true); }
  showResult(out, sim, a, fromBattle) {
    G.run.stage = 'resolveResult'; G.game.go('results', { out, sim, attack: a, S: this.S, campaign: true });
  }
  endSeason() {
    const S = this.S; C.endSeason(S); if (S.over) { this.toEnding(); return; }
    G.run.stage = 'tidings'; this.beginTidings(); G.run.cursor = this.cursor;
  }
  /* ---- update ---- */
  update(dt) {
    const S = this.S, run = G.run, I = G.game.input; this.t += dt; UI.pump(); G.fxUpdate(dt);
    try { G.game.saves.canSave = run.stage === 'muster' && !this.stack.length; } catch (e) { }
    if (G.dev.update(this)) return;
    if (run.stage === 'tidings') { this.tidingsUpdate(dt); return; }
    if (run.stage === 'handover') { this.ct = (this.ct || 0) + dt; if (this.ct > .4 && (I.pressed('confirm') || UI.click)) { run.stage = 'muster'; G.sfx('select'); G.activity(); } return; }
    if (run.stage === 'resolveAsk' || (run.stage === 'resolve')) { }
    if (this.stack.length) {
      const p = this.stack[this.stack.length - 1], r = p.list.update();
      if (r && r.pick != null) p.onPick(p.list.items[r.pick]); else if (r && r.cancel && !p.noCancel) this.close();
      return;
    }
    if (run.stage !== 'muster') return;
    // map cursor
    const nav = UI.nav(), cs = G.CASTLES, valid = this.marching ? this.marchTargets : null;
    if (nav.x || nav.y) { this.cursor = this.nearestDir(this.cursor, nav.x, nav.y, valid); G.sfx('cursor'); UI.mouse = false; }
    if (UI.mouse && UI.ptr && UI.moved) { const h = this.castleAt(UI.ptr[0], UI.ptr[1]); if (h != null && (!valid || valid.includes(h))) this.cursor = h; }
    run.cursor = this.cursor;
    const click = UI.click ? this.castleAt(UI.click[0], UI.click[1]) : null;
    if (this.marching) {
      if (I.pressed('cancel')) { this.marching = false; G.sfx('back'); return; }
      if (I.pressed('confirm') || (click != null && valid.includes(click))) { if (click != null) this.cursor = click; this.marchChoose(this.cursor); }
      return;
    }
    if (I.pressed('alt')) { this.commandsMenu(); return; }
    if (I.pressed('help')) { G.game.go('help', { back: 'campaign' }); return; }
    if (I.pressed('confirm') || click != null) { if (click != null) this.cursor = click; const c = S.castles[this.cursor]; if (c.owner === S.human) this.castleMenu(this.cursor); else { G.sfx('error'); UI.toast(G.CASTLES[this.cursor].short + ' is held by ' + RN(c.owner) + '. Use Commands to march.'); } }
    if (I.pressed('info')) this.realmsPanel();
  }
  nearestDir(from, dx, dy, valid) {
    const a = G.CASTLES[from], list = valid || G.CASTLES.map(c => c.id); let best = from, bs = 1e9;
    for (const id of list) { if (id === from) continue; const b = G.CASTLES[id], vx = (b.x - a.x) * 1.7, vy = b.y - a.y, d = Math.hypot(vx, vy), dot = (vx * dx + vy * dy) / d; if (dot < .35) continue; const sc = d * (2 - dot); if (sc < bs) { bs = sc; best = id; } }
    if (best === from && valid) { const i = valid.indexOf(from); best = valid[(i + (dx + dy > 0 ? 1 : -1) + valid.length) % valid.length]; }
    return best;
  }
  castleAt(x, y) { let best = null, bd = 14; for (const c of G.CASTLES) { const p = G.mapPos(c, this.rect); const d = Math.hypot(p[0] - x, p[1] - y - 6); if (d < bd) { bd = d; best = c.id; } } return best; }
  /* ---- draw ---- */
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, S = this.S, run = G.run, t = this.t, season = S.season; UI.begin();
      this.rect = { x: 14, y: 22, w: W - 28, h: H - 54 };
      G.drawWorldBackdrop(g, W, H, season, t, true);
      this.drawMap(g, W, H);
      G.drawMotes(g, W, H, season, t, .6);
      G.fxDraw(g);
      this.drawTop(g, W, H);
      if (run.stage === 'handover') this.drawHandover(g, W, H);
      else if (run.stage === 'tidings') this.drawTidings(g, W, H);
      else if (run.stage === 'muster' && !this.stack.length) this.drawMuster(g, W, H);
      else this.drawResolveBack(g, W, H);
      this.drawPanels(g, W, H);
      G.dev.draw(g, W, H);
      UI.drawToasts(g, W, H, 1 / 60);
      UI.prompts(g, W, H, this.prompts());
    });
  }
  prompts() {
    const run = G.run; if (G.dev.open) return [['confirm', 'Select'], ['cancel', 'Close']];
    if (this.stack.length) return [['confirm', 'Choose'], ['cancel', 'Back']];
    if (run.stage === 'tidings') return [['confirm', 'Next'], ['alt', 'Skip all']];
    if (run.stage === 'handover') return [['confirm', 'Begin']];
    if (this.marching) return [['dpad', 'Pick target'], ['confirm', 'Choose'], ['cancel', 'Back']];
    if (run.stage === 'muster') return [['dpad', 'Castle'], ['confirm', 'Open castle'], ['alt', 'Commands'], ['info', 'Realms'], ['help', 'Help']];
    return [];
  }
  drawMap(g, W, H) {
    const S = this.S, run = G.run, t = this.t;
    const pos = id => G.mapPos(G.CASTLES[id], this.rect);
    for (const [a, b] of G.ROADS) { const p = pos(a), q = pos(b), own = S.castles[a].owner === S.castles[b].owner && S.castles[a].owner < 5; px.line(g, p[0], p[1], q[0], q[1], own ? G.lerpCol(G.REALMS[S.castles[a].owner].col, '#000000', .45) : '#00000088', 2); px.line(g, p[0], p[1], q[0], q[1], own ? G.lerpCol(G.REALMS[S.castles[a].owner].col, '#ffffff', .1) : '#b8a888', 1); }
    // marches
    for (const m of S.marches) {
      if (m.realm !== S.human && run.stage !== 'resolve') continue; const col = G.REALMS[m.realm].col, tp = pos(m.to);
      for (const fid of m.from) { const k = S.knights[fid]; if (!k) continue; const fp = pos(k.at); const ph = (t * .8) % 1; px.line(g, fp[0], fp[1] - 6, tp[0], tp[1] - 6, col, 2); const ax = fp[0] + (tp[0] - fp[0]) * ph, ay = fp[1] - 6 + (tp[1] - fp[1]) * ph; px.disc(g, ax, ay, 2.5, '#fff'); const ang = Math.atan2(tp[1] - fp[1], tp[0] - fp[0]); px.poly(g, [[tp[0] - Math.cos(ang) * 8 + Math.cos(ang + 2.6) * 6, tp[1] - 6 - Math.sin(ang) * 8 + Math.sin(ang + 2.6) * 6], [tp[0] - Math.cos(ang) * 8, tp[1] - 6 - Math.sin(ang) * 8], [tp[0] - Math.cos(ang) * 8 + Math.cos(ang - 2.6) * 6, tp[1] - 6 - Math.sin(ang) * 8 + Math.sin(ang - 2.6) * 6]], col); }
    }
    for (const c of G.CASTLES) {
      const p = pos(c.id), cs = S.castles[c.id], rm = G.REALMS[cs.owner]; const valid = this.marching && this.marchTargets.includes(c.id);
      if (valid) px.ddisc(g, p[0], p[1] - 4, 14 + Math.sin(t * 6) * 2, '#ff5050', .35);
      G.drawCastle(g, p[0], p[1], c.tier, rm.col, t, { stilled: cs.stilled });
      const lab = c.short; G.T(g, lab, p[0] - G.TW(lab, { font: 'tiny' }) / 2, p[1] + 5, cs.owner === S.human ? '#fff8d8' : '#d0c8e8', { font: 'tiny' });
      const nk = cs.knights.length; for (let i = 0; i < nk; i++) px.rect(g, Math.round(p[0] - nk * 2 + i * 4), Math.round(p[1] + 12), 3, 3, i === 0 && cs.knights.some(k => S.knights[k].ruler) ? '#ffe070' : rm.col);
      if (c.id === 0 && !S.flags.grayFallen) { px.ddisc(g, p[0], p[1] - 8, 16, '#c0c0ff', .15 + Math.sin(t * 2) * .05); }
    }
    // cursor
    if (run.stage === 'muster' || this.marching) { const p = pos(this.cursor); const q = 12 + Math.sin(t * 8) * 1.2; px.line(g, p[0] - q, p[1] - q - 4, p[0] - q + 5, p[1] - q - 4, '#fff0a0', 1); px.line(g, p[0] + q, p[1] - q - 4, p[0] + q - 5, p[1] - q - 4, '#fff0a0', 1); px.line(g, p[0] - q, p[1] + q - 4, p[0] - q + 5, p[1] + q - 4, '#fff0a0', 1); px.line(g, p[0] + q, p[1] + q - 4, p[0] + q - 5, p[1] + q - 4, '#fff0a0', 1); UI.add('map', 0, p[0] - 12, p[1] - 14, 24, 24); }
  }
  drawTop(g, W, H) {
    const S = this.S, realm = G.REALMS[S.human]; px.rect(g, 0, 0, W, 16, '#0a0614dd'); px.rect(g, 0, 16, W, 1, '#c8a86066');
    px.disc(g, 8, 8, 5, G.SEASON_COL[S.season]); px.disc(g, 8, 8, 3, '#120c1e');
    G.T(g, C.label(S), 18, 4, G.SEASON_COL[S.season]);
    G.T(g, RN(S.human), 108, 4, realm.col);
    const inc = C.incomeOf(S, S.human) - C.upkeepOf(S, S.human); const mt = 'Mana ' + S.realms[S.human].mana + ' (' + (inc >= 0 ? '+' : '') + inc + ')'; G.T(g, mt, W - 8 - G.CORNER - G.TW(mt), 4, '#80c0ff');
    if (S.candle != null) { const ct = 'Candle ' + S.candle; const cx = W - 16 - G.CORNER - G.TW(mt) - G.TW(ct); px.rect(g, cx - 8, 4, 3, 8, '#f0e8c8'); px.poly(g, [[cx - 7, 1], [cx - 9, 4], [cx - 5, 4]], '#ffb040'); G.T(g, ct, cx, 4, S.candle <= 3 ? '#ff8a6a' : '#ffe0a0'); }
  }
  drawHandover(g, W, H) {
    const S = this.S, rm = G.REALMS[S.human]; px.rect(g, 0, 0, W, H, '#0a0614'); const w = 220, h = 70, x = (W - w) / 2, y = (H - h) / 2; G.box(g, x, y, w, h, { border: rm.col });
    const t1 = 'Player ' + (S.humans.indexOf(S.human) + 1) + ': ' + rm.name; G.T(g, 'Pass the controller to', W / 2 - G.TW('Pass the controller to') / 2, y + 10, '#a8a0c8'); E.font.text(g, t1, Math.round(W / 2 - G.TW(t1, { scale: 2 }) / 2), y + 24, rm.col, { scale: 2, shadow: '#000', outline: false });
    G.T(g, 'Press ' + G.game.input.label('confirm') + ' when ready', W / 2 - G.TW('Press ' + G.game.input.label('confirm') + ' when ready') / 2, y + 52, '#ffe8a0');
  }
  drawTidings(g, W, H) {
    const S = this.S, card = this.cards[Math.min(this.ci, this.cards.length - 1)]; if (!card) return;
    px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .55);
    const w = Math.min(W - 40, 300), h = card.kind === 'season' ? 120 : 76, x = (W - w) / 2, y = (H - h) / 2 - 8;
    G.box(g, x, y, w, h);
    if (card.kind === 'season') {
      const sc = G.SEASON_COL[S.season]; E.font.title(g, G.SEASONS[S.season].toUpperCase(), W / 2, y + 12, { scale: 3, align: 'center', colors: ['#ffffff', sc, G.lerpCol(sc, '#000000', .4)], depth: 2 });
      G.T(g, 'Year ' + S.year + ' of the Brigantime', W / 2 - G.TW('Year ' + S.year + ' of the Brigantime') / 2, y + 48, '#d8d0f0');
      const sting = ['Blossoms wake the lowland: floods in the low places.', 'Summer fires wake the forests. Verdant hexes burn.', 'The autumn gale spoils arrows and slows wings.', 'Winter ice binds the water. Other seasons\' monsters slow.'][S.season];
      UI.text(g, sting, x + 20, y + 66, w - 40, '#f4eed8', 10);
      const tip = G.TIPS[(S.turn * 3 + S.season) % G.TIPS.length]; UI.text(g, 'Hint: ' + tip, x + 20, y + 90, w - 40, '#a8a0c8', 9);
      // the Wheel turns
      const cx = x + w - 28, cy = y + 28, a = this.ct * 1.2; for (let i = 0; i < 4; i++) px.disc(g, cx + Math.cos(a + i * Math.PI / 2) * 12, cy + Math.sin(a + i * Math.PI / 2) * 12, 3, G.SEASON_COL[i]);
    } else {
      const head = { candle: 'The Hour-Candle', income: 'The Treasury', stillness: 'Stillness', quest: 'Tidings from the road', desert: 'Desertion', info: 'Tidings' }[card.kind] || 'Tidings'; G.T(g, head, x + 12, y + 8, card.kind === 'stillness' ? '#a0c0ff' : '#ffe8a0');
      UI.text(g, card.text, x + 12, y + 24, w - 24, '#f4eed8', 10);
    }
    G.T(g, (this.ci + 1) + '/' + this.cards.length, x + w - 30, y + h - 12, '#a8a0c8');
  }
  drawMuster(g, W, H) {
    const S = this.S, c = S.castles[this.cursor], cd = G.CASTLES[this.cursor], rm = G.REALMS[c.owner];
    const p = G.mapPos(cd, this.rect), left = p[0] > W / 2, w = 118, h = 78, x = left ? 6 : W - w - 6, y = H - h - 20;
    G.box(g, x, y, w, h, { alpha: .93 });
    G.T(g, cd.short, x + 6, y + 5, '#fff8d8'); G.T(g, RN(c.owner) + ' - ' + (['Spring', 'Summer', 'Autumn', 'Winter', 'Hour', 'Outlaw'][cd.region]), x + 6, y + 15, rm.col);
    G.T(g, 'Yield ' + Math.round(G.castleYield(cd) * (cd.region === S.season ? 1.25 : 1)) + '  Tier ' + cd.tier, x + 6, y + 25, '#d8d0f0');
    let yy = y + 36; for (const id of c.knights.slice(0, 4)) { const k = S.knights[id]; G.T(g, KS(id) + ' Lv' + k.lvl + ' ' + G.className(k) + (k.wounded ? ' +' : ''), x + 6, yy, '#f4eed8'); yy += 9; }
    if (!c.knights.length) G.T(g, 'No knights: the gates stand open', x + 6, yy, '#f09090');
    if (c.stilled) G.T(g, 'STILLED', x + w - 46, y + 5, '#a0c0ff');
    if (c.owner === S.human) { const sit = G.SITES[this.cursor][0]; G.T(g, sit.replace('The ', ''), x + 6, y + h - 9, '#8a82a8', { font: 'tiny' }); }
  }
  drawResolveBack(g, W, H) {
    const run = G.run; px.polyDither(g, [[0, 17], [W, 17], [W, H], [0, H]], '#000000', .35);
    G.T(g, 'The March', W / 2 - G.TW('The March') / 2, 22, '#ffe8a0');
    this.dispatch.slice(-6).forEach((l, i) => G.T(g, l, 10, 36 + i * 10, '#d8d0f0'));
  }
  drawPanels(g, W, H) {
    this.stack.forEach((p, idx) => {
      const rows = Math.min(p.list.items.length, p.list.rows), h = rows * 12 + 22, w = p.w || 120;
      const x = this.stack.length > 1 ? 20 + idx * 14 : 14, y = 26 + idx * 8;
      G.box(g, x, y, w, h, { alpha: .96 }); G.T(g, p.title, x + 6, y + 5, '#ffe8a0'); px.rect(g, x + 4, y + 15, w - 8, 1, '#c8a86055');
      p.list.draw(g, x + 4, y + 18, w - 8);
      if (idx === this.stack.length - 1 && p.side) { const it = p.list.cur(), fn = p.side(it); if (fn) fn(g, x + w + 4 + (x + w + 4 + 120 > W ? -w - 130 : 0), y); }
    });
  }
};


/* ===== 63-battle-view.js ===== */
/* ---- BattleView: shows a BattleSim (the sim is the truth), plays its events, and takes the player's commands. ---- */
const ELNAMES = ['Spring', 'Summer', 'Autumn', 'Winter', 'Hour'];
G.BattleView = class {
  constructor(spec, o = {}) {
    this.spec = spec; this.o = o; this.S = B.create(spec); this.vis = new Map(); this.q = []; this.cur = null; this.t = 0; this.mode = 'free'; this.cursor = [0, 0]; this.cfx = 0;
    this.reach = null; this.sel = null; this.menu = null; this.sub = null; this.targets = []; this.tIdx = 0; this.over = false; this.overT = 0; this.banner = null; this.shake = 0;
    this.steep = false; this.timer = 0; this.floaters = []; this.info = false; this.confirmEnd = null; this.skillMode = null; this.itemMode = null; this.stepLog = [];
    for (const u of this.S.units) this.initVis(u);
    const hs = this.S.sides[0].human ? 0 : this.S.sides[1].human ? 1 : 0; const first = this.S.units.find(u => u.side === hs && u.lead); if (first) { this.cursor = [first.c, first.r]; this.fx = G.hex.px(first.c, first.r, 1)[0]; }
    this.queueEvents([{ k: 'phase', side: 0, bell: 1 }]);
    this.dialsStart = B.dialCount(this.S);
  }
  initVis(u) {
    const p = G.hexCenter(u.c, u.r);
    this.vis.set(u.uid, { x: p[0], y: p[1], hp: u.hp, mp: u.mp, alpha: 1, flash: 0, lunge: 0, walk: 0, dir: u.side === 1 ? -1 : 1, pose: null, atk: new E.Attack('slash'), seed: u.uid * 1.7, t: 0, fx: {} });
  }
  isHuman(side) { if (this.o.net) return side === this.o.net.mySide; return !!this.S.sides[side].human && !this.o.auto; }
  isRemote(side) { return !!this.o.net && side !== this.o.net.mySide; }
  queueEvents(ev) { for (const e of ev) this.q.push(e); }
  busy() { return !!this.cur || this.q.length > 0; }
  submit(cmd) { const n = this.o.net; if (!n) return this.apply(cmd); if (n.isHost) { const ok = this.apply(cmd); if (ok) n.send({ c: cmd }); return ok; } n.send({ c: cmd }, true); return true; }
  apply(cmd) { const ev = B.apply(this.S, cmd); if (!ev) return false; this.queueEvents(ev); return true; }
  uPos(u) { return G.hexCenter(u.c, u.r); }
  float(x, y, text, col) { this.floaters.push({ x, y, text, col, t: 0 }); }
  /* ---- event playback ---- */
  startEvent(e) {
    const S = this.S, V = u => this.vis.get(u);
    this.cur = { e, t: 0, dur: .15 };
    switch (e.k) {
      case 'move': { const v = V(e.u), u = S.units[e.u]; this.cur.dur = Math.max(.15, (e.path.length - 1) * .13); this.cur.path = e.path.map(p => G.hexCenter(p[0], p[1])); v.walk = 1; G.sfx('move'); break; }
      case 'hit': {
        const a = S.units[e.a], d = S.units[e.d], va = V(e.a), vd = V(e.d); this.cur.dur = e.skill ? .38 : (e.akind === 'melee' ? .6 : .75); this.cur.did = false;
        if (!e.skill) { va.dir = d.c * 100 + d.r > 0 && this.uPos(d)[0] < this.uPos(a)[0] ? -1 : 1; }
        if (e.akind === 'melee' && !e.skill) { va.atk = new E.Attack(a.kind === 'knight' ? 'slash' : 'claw'); va.atk.start(); G.sfx('slash'); }
        else if (!e.skill) { const p0 = this.uPos(a), p1 = this.uPos(d); G.fxAdd(p0[0], p0[1] - 8, 'bolt', e.akind === 'magic' ? G.SEASON_COL[a.el] : '#fff0c0', .38, { tx: p1[0], ty: p1[1] - 8 }); G.sfx(e.akind === 'magic' ? 'magic' : 'arrow'); if (a.kind === 'knight') { va.atk = new E.Attack('throw'); va.atk.start(); } }
        break;
      }
      case 'cast': { const a = S.units[e.a], va = V(e.a), p = G.hexCenter(e.hex[0], e.hex[1]); va.pose = 'cast'; this.cur.dur = .55; G.sfx(G.get('skill', e.skill).kind === 'heal' ? 'heal' : 'magic'); G.fxAdd(p[0], p[1] - 4, G.get('skill', e.skill).kind === 'heal' ? 'rise' : 'ring', G.SEASON_COL[e.el] || '#fff', .6, { r: 26 }); G.fxAdd(p[0], p[1] - 4, 'burst', G.SEASON_COL[e.el] || '#fff', .6, { r: 22 }); this.float(this.uPos(a)[0], this.uPos(a)[1] - 28, G.get('skill', e.skill).name, '#ffe8a0'); break; }
      case 'down': { this.cur.dur = .6; G.sfx('down'); const v = V(e.u), p = this.uPos(S.units[e.u]); G.fxAdd(p[0], p[1] - 8, 'burst', '#fff', .5); break; }
      case 'flee': { this.cur.dur = .25; break; }
      case 'heal': { const p = this.uPos(S.units[e.u]); this.cur.dur = .45; this.float(p[0], p[1] - 22, '+' + e.amt, '#80f090'); G.fxAdd(p[0], p[1] - 4, 'rise', '#80f090', .6); V(e.u).hp = S.units[e.u].hp; G.sfx('heal'); break; }
      case 'mana': { const p = this.uPos(S.units[e.u]); this.cur.dur = .35; this.float(p[0], p[1] - 22, '+' + e.amt + ' MP', '#80c0ff'); V(e.u).mp = S.units[e.u].mp; break; }
      case 'fx': { const p = this.uPos(S.units[e.u]); this.cur.dur = .15; this.float(p[0], p[1] - 24, G.EFFECTS[e.fx].name, G.EFFECTS[e.fx].col); G.fxAdd(p[0], p[1] - 6, 'ring', G.EFFECTS[e.fx].col, .5, { r: 14 }); break; }
      case 'fire': { const p = this.uPos(S.units[e.u]); this.cur.dur = .4; this.float(p[0], p[1] - 22, '-' + e.dmg, '#ff9040'); V(e.u).hp = Math.max(0, S.units[e.u].hp); V(e.u).flash = .3; break; }
      case 'bind': { const a = S.units[e.a], d = S.units[e.d], p = this.uPos(d); this.cur.dur = .9; V(e.a).pose = 'cast'; G.sfx('bind'); G.fxAdd(p[0], p[1] - 6, 'ring', '#ffe8a0', .8, { r: 22 }); this.float(p[0], p[1] - 26, e.ok ? 'BOUND!' : 'Broke free', e.ok ? '#ffe070' : '#c0c0d0'); break; }
      case 'captured': { this.cur.dur = .3; const v = V(e.u); G.sfx('fanfare', { vol: .5 }); break; }
      case 'item': { this.cur.dur = .15; break; }
      case 'retreat': { this.cur.dur = .5; V(e.u).alpha = .3; break; }
      case 'break': { this.cur.dur = .4; this.banner = { text: 'A troop breaks!', col: '#ff9a6a', t: 0, dur: 1 }; break; }
      case 'wait': this.cur.dur = .03; break;
      case 'phase': {
        this.cur.dur = this.o.quick ? .3 : 1.0; const side = S.sides[e.side]; const mine = this.isHuman(e.side);
        this.banner = { text: 'Bell ' + e.bell + ': ' + (mine ? 'your phase' : (this.o.auto ? side.name : 'foe\'s phase')), col: G.REALMS[side.realm] ? G.REALMS[side.realm].col : '#fff', t: 0, dur: this.cur.dur };
        if (this.hot()) { this.cur.dur = 999; this.cur.hold = true; this.banner = { text: 'Player ' + (e.side + 1) + ': ' + (side.name || '').replace('The ', ''), col: G.REALMS[side.realm].col, t: 0, dur: 999, hold: true }; }
        if (e.side === 0) G.sfx('bell', { vol: .6 }); this.mode = this.isHuman(S.phase) ? 'free' : 'ai'; this.reach = null; this.sel = null; this.menu = null; break;
      }
      case 'bell': this.cur.dur = .05; break;
      case 'over': { this.cur.dur = .8; this.over = true; this.banner = { text: S.nsides > 2 ? (S.sides[S.winner].name || 'A side') + ' wins' : S.winner === 0 ? 'Attackers prevail' : 'Defenders hold', col: '#ffe8a0', t: 0, dur: 2 }; break; }
      default: this.cur.dur = .05;
    }
  }
  hot() { return !this.o.net && this.S.nsides === 2 && this.S.sides[0].human && this.S.sides[1].human && !this.o.auto; }
  tickEvent(dt) {
    const c = this.cur, e = c.e, S = this.S; c.t += dt; if (c.hold && c.t > .4 && (G.game.input.pressed('confirm') || UI.click)) { c.dur = c.t; G.sfx('select'); } const u01 = Math.min(1, c.t / c.dur), V = x => this.vis.get(x);
    switch (e.k) {
      case 'move': {
        const v = V(e.u), P = c.path, seg = (P.length - 1) * u01, i = Math.min(P.length - 2, Math.floor(seg)), f = seg - i;
        if (P.length > 1) { v.x = P[i][0] + (P[i + 1][0] - P[i][0]) * f; v.y = P[i][1] + (P[i + 1][1] - P[i][1]) * f; const dx = P[i + 1][0] - P[i][0]; if (Math.abs(dx) > 1) v.dir = dx > 0 ? 1 : -1; }
        break;
      }
      case 'hit': {
        const a = S.units[e.a], d = S.units[e.d], va = V(e.a), vd = V(e.d); const hitT = e.skill ? .12 : (e.akind === 'melee' ? .3 : .42);
        if (!c.did && c.t >= hitT) {
          c.did = true; const p = this.uPos(d);
          if (e.miss) { this.float(p[0], p[1] - 22, 'MISS', '#c0c0d0'); G.sfx('miss'); }
          else { vd.hp = Math.max(0, vd.hp - e.dmg); vd.flash = .22; vd.lunge = -.3; this.float(p[0], p[1] - 24, '-' + e.dmg, '#fff'); G.fxAdd(p[0], p[1] - 8, 'burst', G.SEASON_COL[a.el] || '#fff', .35, { r: 10 }); G.sfx('hit', { vol: .8 }); this.shake = Math.min(3, .6 + e.dmg / 14); try { G.game.input.rumble(.35, .1); } catch (er) { } }
        }
        if (!e.skill && e.akind === 'melee') { va.lunge = Math.sin(Math.min(1, c.t / .3) * Math.PI) * .9; }
        break;
      }
      case 'down': { const v = V(e.u); v.alpha = 1 - u01; v.hp = 0; break; }
      case 'flee': { const v = V(e.u); v.alpha = 1 - u01; break; }
      case 'retreat': break;
    }
    if (c.t >= c.dur) { this.endEvent(); }
  }
  endEvent() {
    const c = this.cur, e = c.e, V = x => this.vis.get(x), S = this.S;
    switch (e.k) {
      case 'move': { const v = V(e.u), u = S.units[e.u], p = G.hexCenter(u.c, u.r); v.x = p[0]; v.y = p[1]; v.walk = 0; break; }
      case 'cast': V(e.a).pose = null; V(e.a).mp = S.units[e.a].mp; break;
      case 'bind': V(e.a).pose = null; if (e.ok) { const t = S.units[e.d]; const v = V(e.d); v.alpha = 1; v.hp = t.hp; } break;
      case 'over': break;
    }
    if (e.k === 'hit') { const v = V(e.a); v.lunge = 0; }
    this.cur = null;
  }
  /* ---- per-frame update ---- */
  update(dt) {
    this.t += dt; G.fxUpdate(dt);
    for (const f of this.floaters) f.t += dt; this.floaters = this.floaters.filter(f => f.t < 1.1);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    this.shake = Math.max(0, this.shake - dt * 8);
    for (const [uid, v] of this.vis) {
      v.t += dt; v.flash = Math.max(0, v.flash - dt); v.atk.update(dt);
      const u = this.S.units[uid]; if (u.kind === 'knight') { const rig = this.rigOf(u); rig.update(dt, { x: v.x, y: 0, z: 0, vx: v.walk * v.dir * 60, vy: 0, facing: v.dir > 0 ? 0 : Math.PI, attack: v.atk.state, pose: v.pose || undefined, expr: v.flash > 0 ? 'wince' : undefined }); }
      if (u.alive && !u.gone && !(this.cur && this.cur.e.k === 'move' && this.cur.e.u === uid) && !this.busy()) { const p = G.hexCenter(u.c, u.r); v.x += (p[0] - v.x) * .5; v.y += (p[1] - v.y) * .5; v.hp = u.hp; v.mp = u.mp; }
    }
    if (this.cur) { this.tickEvent(dt); return; }
    if (this.q.length) { this.startEvent(this.q.shift()); return; }
    if (this.over || this.S.over) { this.overT += dt; if (this.overT > (this.o.overDelay || 1.2) && !this.finished) { this.finished = true; if (this.o.onOver) this.o.onOver(this.S); } return; }
    // who acts?
    const side = this.S.phase;
    if (this.isRemote(side)) { this.mode = 'ai'; return; }
    if (!this.isHuman(side)) {
      this.timer -= dt; if (this.timer > 0) return; this.timer = this.o.quick ? .02 : .18; this.mode = 'ai';
      const cmd = BA.step(this.S); if (!cmd) { this.S.over = true; return; }
      if (!this.apply(cmd)) this.apply({ t: 'endphase' });
      return;
    }
    if (this.mode === 'ai') this.mode = 'free';
    if (!this.o.noInput) this.humanUpdate(dt);
  }
  rigOf(u) {
    const size = Math.round(G.board.s * .047 * 100) / 100;
    return G.rigFor('b:' + u.id + ':' + size + ':' + u.side, () => new E.Humanoid(G.knightLook(u.id.slice(2), u.line, u.tier, u.realm, size)));
  }
  /* ---- the human's controls ---- */
  moveCursor(dx, dy) {
    const S = this.S, [c, r] = this.cursor; let best = null, bd = 1e9;
    const cand = G.hex.nb(c, r).filter(p => p[0] >= 0 && p[1] >= 0 && p[0] < S.cols && p[1] < S.rows);
    for (const p of cand) {
      const px_ = G.hex.px(p[0], p[1], 1); const ddx = px_[0] - this.fx, ddy = px_[1] - G.hex.px(c, r, 1)[1];
      if (dx && Math.sign(ddx) !== dx && Math.abs(ddy) > .1) continue; if (dy && Math.sign(ddy) !== dy) continue; if (dx && Math.abs(ddy) > .1) continue;
      const d = dx ? Math.abs(ddx) : Math.abs(ddx); if (d < bd) { bd = d; best = p; }
    }
    if (best) { this.cursor = best; if (dx) this.fx = G.hex.px(best[0], best[1], 1)[0]; G.sfx('cursor'); }
  }
  cursorUnit() { return B.at(this.S, this.cursor[0], this.cursor[1]); }
  ownReady() { return B.live(this.S, this.S.phase).filter(u => !u.done); }
  humanUpdate(dt) {
    const I = G.game.input, S = this.S, nav = UI.nav();
    // the hex under the mouse
    if (UI.mouse && UI.ptr && UI.moved) { const h = G.pickHex(S, UI.ptr[0], UI.ptr[1]); if (h && (h[0] !== this.cursor[0] || h[1] !== this.cursor[1])) { this.cursor = h; this.fx = G.hex.px(h[0], h[1], 1)[0]; } }
    const click = UI.click ? G.pickHex(S, UI.click[0], UI.click[1]) : null;
    if (this.confirmEnd) { const r = this.confirmEnd.update(); if (r && r.pick === 0) { this.confirmEnd = null; this.endPhase(); } else if (r && (r.pick === 1 || r.cancel)) this.confirmEnd = null; return; }
    if (this.info) { if (I.pressed('info') || I.pressed('cancel') || UI.click) this.info = false; return; }
    if (I.pressed('view')) { this.steep = !this.steep; G.sfx('cursor'); }
    switch (this.mode) {
      case 'free': {
        if (!(UI.mouse && !nav.x && !nav.y)) { if (nav.x) this.moveCursor(nav.x, 0); if (nav.y) this.moveCursor(0, nav.y); }
        const cu = this.cursorUnit();
        if (I.pressed('prev') || I.pressed('next')) { const list = this.ownReady(); if (list.length) { const i = list.findIndex(u => cu === u); const n = list[(i + (I.pressed('next') ? 1 : -1) + list.length * 2) % list.length]; this.cursor = [n.c, n.r]; this.fx = G.hex.px(n.c, n.r, 1)[0]; G.sfx('cursor'); } }
        if (I.pressed('info') && cu) { this.info = true; G.sfx('select'); }
        if (I.pressed('alt')) { this.confirmEnd = new UI.List([{ label: 'End the phase' }, { label: 'Keep fighting' }], { rows: 2 }); G.sfx('select'); return; }
        if (I.pressed('confirm') || click) {
          if (click) this.cursor = click; const u = this.cursorUnit();
          if (u && B.canAct(S, u)) this.selectUnit(u); else if (u) { this.info = true; } else G.sfx('error');
        }
        break;
      }
      case 'move': {
        if (!(UI.mouse && !nav.x && !nav.y)) { if (nav.x) this.moveCursor(nav.x, 0); if (nav.y) this.moveCursor(0, nav.y); }
        if (I.pressed('cancel') || (UI.click && !click)) { this.mode = 'free'; this.reach = null; this.sel = null; G.sfx('back'); break; }
        if (I.pressed('confirm') || click) {
          if (click) this.cursor = click; const u = this.sel, k = this.cursor[0] + ',' + this.cursor[1];
          if (this.cursor[0] === u.c && this.cursor[1] === u.r) { this.openMenu(); break; }
          if (this.reach && this.reach.has(k)) { this.submit({ t: 'move', u: u.uid, to: this.cursor.slice() }); this.reach = null; this.afterMove = true; this.mode = 'menu-wait'; } else G.sfx('error');
        }
        break;
      }
      case 'menu-wait': if (!this.busy()) this.openMenu(); break;
      case 'menu': {
        const r = this.menu.update(); if (!r) break;
        if (r.cancel) { if (!this.sel.moved) { this.mode = 'move'; this.reach = B.reach(S, this.sel); this.menu = null; } else G.sfx('error'); break; }
        if (r.pick != null) this.menuPick(this.menu.items[r.pick]);
        break;
      }
      case 'sub': {
        const r = this.sub.update(); if (!r) break;
        if (r.cancel) { this.mode = 'menu'; this.sub = null; break; }
        if (r.pick != null) { const it = this.sub.items[r.pick]; this.beginTarget(it.kind, it.id); }
        break;
      }
      case 'target': {
        const t = this.targets; if (!t.length) { this.mode = 'menu'; break; }
        if (nav.x || nav.y) { this.tIdx = (this.tIdx + (nav.x + nav.y > 0 ? 1 : -1) + t.length) % t.length; G.sfx('cursor'); }
        if (UI.mouse && UI.moved) { const h = G.pickHex(S, UI.ptr[0], UI.ptr[1]); if (h) { const i = t.findIndex(x => x.hex[0] === h[0] && x.hex[1] === h[1]); if (i >= 0) this.tIdx = i; } }
        this.cursor = t[this.tIdx].hex.slice();
        if (I.pressed('cancel')) { this.mode = this.skillMode || this.itemMode ? 'sub' : 'menu'; if (this.mode === 'sub' && !this.sub) this.mode = 'menu'; this.targets = []; G.sfx('back'); break; }
        if (I.pressed('confirm') || (click && t.some(x => x.hex[0] === click[0] && x.hex[1] === click[1]))) {
          if (click) { const i = t.findIndex(x => x.hex[0] === click[0] && x.hex[1] === click[1]); if (i >= 0) this.tIdx = i; }
          const tg = t[this.tIdx]; const cmd = Object.assign({ u: this.sel.uid }, tg.cmd); this.apply(cmd); this.finishUnit();
        }
        break;
      }
    }
  }
  selectUnit(u) { this.sel = u; this.reach = B.reach(this.S, u); this.mode = 'move'; G.sfx('select'); this.afterMove = false; }
  finishUnit() { this.mode = this.isHuman(this.S.phase) ? 'free' : 'ai'; this.reach = null; this.sel = null; this.menu = null; this.sub = null; this.targets = []; this.skillMode = null; this.itemMode = null; }
  openMenu() {
    const S = this.S, u = this.sel, items = [];
    const atk = B.targetsFrom(S, u, [u.c, u.r]);
    items.push({ label: 'Attack', id: 'attack', disabled: !atk.length || u.acted, tag: atk.length ? '' : 'no foe' });
    if (u.kind === 'knight') {
      const sk = u.skills.map(s => G.get('skill', s)); items.push({ label: 'Skill', id: 'skill', disabled: u.acted || !sk.some(s => u.mp >= s.mp && (!u.moved || s.mobile)), tag: u.moved ? 'planted feet' : u.mp + ' MP' });
      items.push({ label: 'Bind', id: 'bind', disabled: u.acted || !B.live(S).some(t => t.side !== u.side && t.kind === 'mon' && G.hex.dist([u.c, u.r], [t.c, t.r]) <= 2 && B.captureChance(S, u, t) > 0), tag: 'weakened foes' });
      items.push({ label: 'Item', id: 'item', disabled: u.acted || !S.sides[u.side].items.length, tag: S.sides[u.side].items.length + '' });
    }
    items.push({ label: 'Wait', id: 'wait' });
    if (u.kind === 'knight' && !u.ruler) items.push({ label: 'Retreat', id: 'retreat', col: '#e09090' });
    this.menu = new UI.List(items, { rows: items.length }); this.mode = 'menu'; G.sfx('select');
  }
  menuPick(it) {
    const S = this.S, u = this.sel;
    switch (it.id) {
      case 'wait': this.submit({ t: 'wait', u: u.uid }); this.finishUnit(); break;
      case 'retreat': this.submit({ t: 'retreat', u: u.uid }); this.finishUnit(); break;
      case 'attack': this.beginTarget('attack'); break;
      case 'bind': this.beginTarget('bind'); break;
      case 'skill': { this.skillMode = true; this.sub = new UI.List(u.skills.map(s => { const sk = G.get('skill', s); return { label: sk.name, id: s, kind: 'skill', tag: sk.mp + ' MP', disabled: u.mp < sk.mp || (u.moved && !sk.mobile) }; }), { rows: 4 }); this.mode = 'sub'; break; }
      case 'item': { this.itemMode = true; const pool = [...new Set(S.sides[u.side].items.filter(i => G.get('item', i).heal || G.get('item', i).mp))]; this.sub = new UI.List(pool.map(i => ({ label: G.get('item', i).name, id: i, kind: 'item', tag: S.sides[u.side].items.filter(x => x === i).length + 'x' })), { rows: 4 }); if (!pool.length) { this.sub = null; this.itemMode = null; G.sfx('error'); } else this.mode = 'sub'; break; }
    }
  }
  beginTarget(kind, id) {
    const S = this.S, u = this.sel, t = [];
    if (kind === 'attack') for (const f of B.targetsFrom(S, u, [u.c, u.r])) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'attack', target: f.uid }, fc: B.forecast(S, u, f, null) });
    else if (kind === 'bind') for (const f of B.live(S)) { if (f.side !== u.side && f.kind === 'mon' && G.hex.dist([u.c, u.r], [f.c, f.r]) <= 2 && B.captureChance(S, u, f) > 0) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'bind', target: f.uid }, p: B.captureChance(S, u, f) }); }
    else if (kind === 'skill') {
      const sk = G.get('skill', id), foes = B.live(S).filter(x => x.side !== u.side), alls = B.live(S, u.side);
      const inR = (x) => { const d = G.hex.dist([u.c, u.r], [x.c, x.r]); return d >= sk.range[0] && d <= sk.range[1]; };
      if (sk.target === 'self' || sk.target === 'troop' || sk.target === 'monsters') t.push({ hex: [u.c, u.r], unit: u, cmd: { t: 'skill', skill: id, hex: [u.c, u.r] }, sk });
      else if (sk.target === 'hex') for (const f of foes) { if (inR(f)) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'skill', skill: id, hex: [f.c, f.r] }, sk }); }
      else if (sk.target === 'foe') for (const f of foes) { if (inR(f)) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'skill', skill: id, target: f.uid }, sk }); }
      else if (sk.target === 'ally') for (const f of alls) { if (inR(f) && f.hp < f.maxhp) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'skill', skill: id, target: f.uid }, sk }); }
    } else if (kind === 'item') for (const f of B.live(S, u.side)) if (G.hex.dist([u.c, u.r], [f.c, f.r]) <= 1 && (G.get('item', id).mp ? f.kind === 'knight' && f.mp < f.maxmp : f.hp < f.maxhp)) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'item', item: id, target: f.uid } });
    if (!t.length) { G.sfx('error'); UI.toast('Nothing to target.'); return; }
    this.targets = t; this.tIdx = 0; this.mode = 'target'; this.tKind = kind; G.sfx('select');
  }
  endPhase() { this.submit({ t: 'endphase' }); this.mode = 'ai'; this.sel = null; this.reach = null; }
  /* ---- drawing ---- */
  layout(W, H) { G.boardLayout(this.S, W, H, 17, 60, this.steep); }
  draw(g, r, W, H) {
    const S = this.S, t = this.t, season = S.season; this.layout(W, H);
    const P = G.SEASON_PAL[season];
    // backdrop: sky, far hills, ground
    const sky = P.sky; for (let i = 0; i < 6; i++) px.rect(g, 0, Math.round(i * H / 6), W, Math.ceil(H / 6) + 1, G.lerpCol(sky[0], sky[1], i / 5));
    const gc = G.tone(P.plain[0]).deep; px.rect(g, 0, 40, W, H, G.lerpCol(P.plain[0], '#101020', .55));
    for (let i = 0; i < 8; i++) px.ell(g, i * W / 7, 46, 60, 18 + (i % 3) * 6, G.lerpCol(P.forest, '#101020', .35 + (i % 2) * .15));
    px.rect(g, 0, 56, W, H, G.lerpCol(P.plain[1], '#101020', .5));
    const sh = this.shake ? (Math.random() - .5) * this.shake * 2 : 0;
    if (sh) g.save(), g.translate(Math.round(sh), Math.round(-sh * .5));
    // highlights
    const hi = new Map(); const mark = (c, r, col, a) => hi.set(c + ',' + r, { col, a });
    if (this.reach) for (const v of this.reach.values()) mark(v.c, v.r, '#5aa0ff', .35);
    if (this.reach && this.sel) { const u = this.sel; for (const v of this.reach.values()) for (const f of B.targetsFrom(S, u, [v.c, v.r])) { if (!hi.has(f.c + ',' + f.r)) mark(f.c, f.r, '#ff5a5a', .28); } }
    if (this.mode === 'target') for (const x of this.targets) mark(x.hex[0], x.hex[1], this.tKind === 'bind' ? '#ffd860' : (x.sk && x.sk.kind === 'heal') || this.tKind === 'item' ? '#60ff90' : '#ff5a5a', .5);
    if (this.mode === 'free' || this.mode === 'move') { /* cursor unit's threat */ const cu = this.cursorUnit(); if (cu && this.mode === 'free' && !cu.done) { const rc = B.reach(S, cu); for (const v of rc.values()) if (!hi.has(v.c + ',' + v.r)) mark(v.c, v.r, cu.side === S.phase ? '#5aa0ff' : '#ff9a5a', .18); } }
    for (let rr = 0; rr < S.rows; rr++) for (let c = 0; c < S.cols; c++) G.drawTile(g, S.tiles[rr][c], season, c, rr, t, hi.get(c + ',' + rr));
    // cursor
    if (!this.o.noInput || this.o.cursor) {
      const [cx, cy] = G.hexCenter(this.cursor[0], this.cursor[1]), pulse = 1 + Math.sin(t * 8) * .06, pts = G.hex.corners(cx, cy, (G.board.s - .5) * pulse, G.board.sq);
      for (let i = 0; i < 6; i++) px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % 6][0], pts[(i + 1) % 6][1], '#fff0a0', 1);
    }
    if (this.sel) { const [cx, cy] = G.hexCenter(this.sel.c, this.sel.r), pts = G.hex.corners(cx, cy, G.board.s - 1, G.board.sq); for (let i = 0; i < 6; i++) px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % 6][0], pts[(i + 1) % 6][1], '#ffffff', 1); }
    // units, back to front
    const order = S.units.filter(u => { const v = this.vis.get(u.uid); return v && (u.alive && !u.gone || v.alpha > .02); }).sort((a, b) => this.vis.get(a.uid).y - this.vis.get(b.uid).y);
    const k = G.board.s / 12;
    for (const u of order) this.drawUnit(g, r, u, k);
    G.fxDraw(g);
    for (const f of this.floaters) { const u = f.t / 1.1; G.T(g, f.text, f.x - G.TW(f.text) / 2, f.y - u * 12, f.col, { shadow: '#000' }); }
    if (sh) g.restore();
    this.drawHud(g, W, H);
  }
  drawUnit(g, r, u, k) {
    const v = this.vis.get(u.uid), x = Math.round(v.x), y = Math.round(v.y + 2), side = u.side, realm = G.REALMS[this.S.sides[side].realm] || G.REALMS[5];
    const ready = this.S.phase === side && !u.done && !this.S.over;
    // base ring in the realm colour
    px.ell(g, x, y, 8 * k, 3.4 * k, '#00000066'); px.ell(g, x, y, 7 * k, 2.8 * k, ready && Math.floor(this.t * 3) % 2 ? G.lerpCol(realm.col, '#ffffff', .4) : realm.dark);
    px.ell(g, x, y, 6 * k, 2.2 * k, realm.col);
    const al = v.alpha;
    if (u.kind === 'knight') {
      const rig = this.rigOf(u);
      r.__ov = true;
      if (al < 1) { g.save(); g.globalAlpha = Math.max(0, al); }
      rig.draw(g, x, y - 1 + (v.lunge ? 0 : 0), G.game.view);
      if (al < 1) g.restore();
      if (u.lead) { px.rect(g, x - 2, y - Math.round(25 * k) - 1, 5, 3, '#e8c860'); px.rect(g, x - 1, y - Math.round(25 * k) - 3, 1, 2, '#e8c860'); px.rect(g, x + 1, y - Math.round(25 * k) - 3, 1, 2, '#e8c860'); }
    } else {
      const sp = G.get('monster', u.species);
      G.drawMon(g, sp, u.form, x, y - (sp.fly ? 0 : 0), { t: v.t, dir: v.dir, flash: v.flash > 0, walk: v.walk, lunge: v.lunge, seed: v.seed, alpha: al, scale: k * .7 });
    }
    // hp bar and status
    if (al > .3) {
      const bw = 14, by = y - Math.round((u.kind === 'knight' ? 23 : 16) * k) - 4; G.bar(g, x - bw / 2, by, bw, 3, v.hp / u.maxhp, v.hp / u.maxhp > .5 ? '#60e070' : v.hp / u.maxhp > .25 ? '#f0c840' : '#f05040');
      let ix = x - 8; for (const f in u.fx) { px.rect(g, ix, by - 4, 3, 3, G.EFFECTS[f].col); ix += 4; }
      if (u.fx.root) G.T(g, '#', x - 2, y - 14, '#60c060');
    }
  }
  drawHud(g, W, H) {
    const S = this.S, t = this.t;
    // top bar
    px.rect(g, 0, 0, W, 16, '#0a0614cc'); px.rect(g, 0, 16, W, 1, '#c8a86055');
    // the bell clock
    const cx = 12, cy = 8; px.disc(g, cx, cy, 6, '#c8a860'); px.disc(g, cx, cy, 5, '#1e1630'); const frac = (S.bell - 1 + (S.phase ? .5 : 0)) / S.bells; const a = frac * Math.PI * 2 - Math.PI / 2;
    px.line(g, cx, cy, cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, '#fff0a0', 1); px.dot(g, cx, cy, '#fff');
    G.T(g, 'Bell ' + Math.min(S.bell, S.bells) + '/' + S.bells, 22, 4, '#ffe8a0');
    const phaseSide = S.sides[S.phase], pc = (G.REALMS[phaseSide.realm] || {}).col || '#fff';
    const rn = (phaseSide.name || '').replace('The ', ''); const pt = (this.hot() ? 'Player ' + (S.phase + 1) + ': ' : phaseSide.human && !this.o.auto ? 'Your phase: ' : this.o.auto ? '' : 'Foe: ') + rn;
    G.T(g, pt, 92, 4, pc);
    const rtxt = S.sides.map((_, i) => B.live(S, i).length).join(' v ');
    G.T(g, G.SEASONS[S.season], W - 8 - G.CORNER - G.TW(G.SEASONS[S.season]), 4, G.SEASON_COL[S.season]); G.T(g, rtxt, W - 20 - G.CORNER - G.TW(G.SEASONS[S.season]) - G.TW(rtxt), 4, '#d8d0f0');
    // dials hint
    if (S.map === 'sanctum') { const held = B.dialsHeld(S), n = this.dialsStart; G.T(g, 'Dials ' + held + '/' + n, W - 8 - G.TW('Dials 0/4'), 19, '#ffd870'); }
    // tutorial / mode hint
    const hint = this.hint(); if (hint) { const w = Math.min(W - 20, G.TW(hint) + 12); G.box(g, Math.round((W - w) / 2), 19, w, 12, { alpha: .85 }); G.T(g, hint, (W - G.TW(hint)) / 2, 22, '#ffe8a0'); }
    // bottom: cursor unit panel
    const cu = this.mode === 'target' && this.targets.length ? this.targets[this.tIdx].unit : (this.sel && this.mode !== 'free' ? this.sel : this.cursorUnit());
    const py = H - 15 - 44; px.rect(g, 0, py, W, 44, '#0a0614dd'); px.rect(g, 0, py, W, 1, '#c8a86066');
    if (cu) this.drawUnitPanel(g, 6, py + 3, cu, W); else { const tt = G.TERRAIN[B.tile(S, this.cursor[0], this.cursor[1])] || {}; G.T(g, tt.name || '', 8, py + 5, '#d8d0f0'); G.T(g, 'Defence ' + Math.round((tt.def || 0) * 100) + '%', 8, py + 16, '#a8a0c8'); }
    this.drawTide(g, W, py);
    if (this.mode === 'target' && this.targets[this.tIdx]) this.drawForecast(g, W, py);
    // menus
    if (this.mode === 'menu' && this.menu) { const [cx2, cy2] = G.hexCenter(this.sel.c, this.sel.r), mw = 74, mh = this.menu.items.length * 12 + 6; let mx = cx2 + 16, my = G.clamp(cy2 - mh / 2, 20, py - mh - 2); if (mx + mw > W - 4) mx = cx2 - mw - 16; G.box(g, mx, my, mw, mh, { alpha: .95 }); this.menu.draw(g, mx + 3, my + 3, mw - 6); }
    if (this.mode === 'sub' && this.sub) { const mw = 120, mh = this.sub.items.length * 12 + 6; const mx = 90, my = G.clamp(py - mh - 4, 20, 200); G.box(g, mx, my, mw, mh, { alpha: .95 }); this.sub.draw(g, mx + 3, my + 3, mw - 6); const it = this.sub.cur(); if (it && it.kind === 'skill') { const sk = G.get('skill', it.id); G.box(g, mx + mw + 4, my, 120, 34, { alpha: .95 }); UI.text(g, sk.text, mx + mw + 8, my + 4, 112, '#d8d0f0', 9); } }
    if (this.confirmEnd) { const mw = 90, mh = 38, mx = (W - mw) / 2, my = (H - mh) / 2 - 20; G.box(g, mx, my, mw, mh); G.T(g, 'End your phase?', mx + 8, my + 4, '#ffe8a0'); this.confirmEnd.draw(g, mx + 4, my + 15, mw - 8); }
    if (this.info) this.drawInfo(g, W, H, this.cursorUnit());
    // banner
    if (this.banner && this.banner.hold) { px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .92); G.T(g, 'Pass the controller. ' + G.game.input.label('confirm') + ' to begin your phase', W / 2 - G.TW('Pass the controller. ' + G.game.input.label('confirm') + ' to begin your phase') / 2, H / 2 + 6, '#d8d0f0'); }
    if (this.banner) { const b = this.banner, u = b.hold ? .5 : b.t / b.dur, a = b.hold ? 1 : Math.min(1, Math.min(u * 6, (1 - u) * 6)); const bw = G.TW(b.text, { scale: 2 }) + 40, by = Math.round(H / 2 - 40); px.polyDither(g, [[0, by], [W, by], [W, by + 26], [0, by + 26]], '#000000', .65 * a); E.font.text(g, b.text, Math.round(W / 2 - G.TW(b.text, { scale: 2 }) / 2 + (1 - a) * 30), by + 6, b.col, { scale: 2, shadow: '#000', outline: false }); }
  }
  hint() {
    if (this.o.tutorial) {
      const m = this.mode;
      if (this.over) return null;
      if (m === 'free') return 'Select one of your glowing units (' + G.game.input.label('confirm') + '). End the phase with ' + G.game.input.label('alt') + '.';
      if (m === 'move') return 'Blue hexes are where it can walk. Red ones are what it could strike.';
      if (m === 'menu') return 'Attack, Skill (needs planted feet), Bind weakened foes, or Wait.';
      if (m === 'target') return 'Pick a target. Check the forecast below.';
      return null;
    }
    if (this.mode === 'move' && this.sel) return 'Choose where to stand';
    if (this.mode === 'target') return ({ attack: 'Choose a target', bind: 'Bind: choose a weakened monster', skill: 'Choose a target for the skill', item: 'Choose who to help' })[this.tKind];
    return null;
  }
  drawUnitPanel(g, x, y, u, W) {
    const realm = G.REALMS[this.S.sides[u.side].realm] || G.REALMS[5], el = u.el;
    px.rect(g, x, y, 22, 22, '#1a1230'); px.rect(g, x, y, 22, 1, realm.col);
    if (u.kind === 'knight') { const rig = G.rigFor('pt:' + u.id, () => new E.Humanoid(G.knightLook(u.id.slice(2), u.line, u.tier, u.realm, 1.3))); rig.drawPortrait(g, x + 1, y + 1, 20, { zoom: 2.6, turn: .3, bg: '#1a1230' }); }
    else G.drawMon(g, G.get('monster', u.species), u.form, x + 11, y + 21, { t: this.t, scale: .8, dir: 1 });
    G.T(g, u.name + (u.lead ? ' ★' : ''), x + 26, y + 1, '#fff8d8'); G.T(g, (u.kind === 'knight' ? G.className({ id: u.id.slice(2), tier: u.tier, line: u.line }) : ELNAMES[el] + ' ' + (u.size === 'S' ? 'small' : u.size === 'L' ? 'large' : 'medium')) + '  Lv ' + u.lvl, x + 26, y + 11, G.SEASON_COL[el]);
    G.T(g, 'HP', x, y + 25, '#a8a0c8'); G.bar(g, x + 12, y + 26, 54, 5, u.hp / u.maxhp, '#60e070'); G.T(g, u.hp + '/' + u.maxhp, x + 70, y + 25, '#d8d0f0');
    if (u.maxmp) { G.T(g, 'MP', x + 112, y + 25, '#a8a0c8'); G.bar(g, x + 126, y + 26, 34, 5, u.mp / u.maxmp, '#60a0f0'); }
    const sx = x + 168, row = [['ATK', u.atk], ['DEF', u.def], ['INT', u.int], ['MOV', u.mov]];
    row.forEach((r_, i) => { G.T(g, r_[0], sx + (i % 2) * 40, y + 1 + Math.floor(i / 2) * 10, '#a8a0c8'); G.T(g, String(r_[1]), sx + 22 + (i % 2) * 40, y + 1 + Math.floor(i / 2) * 10, '#fff8d8'); });
    let fx = ''; for (const f in u.fx) fx += G.EFFECTS[f].name + ' '; if (fx) G.T(g, fx, x + 26, y + 33, '#ffd870');
    if (u.kind === 'mon' && !B.ward(this.S, u)) G.T(g, 'Outside the Ward', x + 90, y + 33, '#f0a060');
  }
  drawTide(g, W, py) {
    const S = this.S, x = W - 108, y = py + 3; G.T(g, G.SEASONS[S.season] + ' Tide', x, y, G.SEASON_COL[S.season]);
    const tx = ['Blossoms flood the lowland.', 'Forests burn. Wildfire bites.', 'The gale dulls arrows and wings.', 'Water freezes. Others move slower.'][S.season];
    UI.text(g, tx, x, y + 10, 104, '#a8a0c8', 9);
    const tt = G.TERRAIN[B.tile(S, this.cursor[0], this.cursor[1])] || {}; G.T(g, tt.name + (tt.def ? ' +' + Math.round(tt.def * 100) + '%' : ''), x, y + 31, '#d8d0f0');
  }
  drawForecast(g, W, py) {
    const S = this.S, tg = this.targets[this.tIdx], u = this.sel; let txt = '';
    if (this.tKind === 'attack') { const f = tg.fc; txt = `${f.lo}-${f.hi} damage, ${Math.round(f.hit * 100)}% to hit` + (f.kill ? ', defeats it' : ''); }
    else if (this.tKind === 'bind') txt = 'Bind chance ' + Math.round(tg.p * 100) + '%';
    else if (tg.sk) { if (tg.sk.kind === 'aoe') { const f = B.forecast(S, u, tg.unit, tg.sk.id); txt = '~' + f.dmg + ' damage to each in the burst'; } else txt = tg.sk.text; }
    if (!txt) return; const w = G.TW(txt) + 12; G.box(g, Math.round((W - w) / 2), py - 16, w, 13, { alpha: .95 }); G.T(g, txt, (W - w) / 2 + 6, py - 13, '#ffe8a0');
  }
  drawInfo(g, W, H, u) {
    if (!u) return; const w = 200, h = 130, x = (W - w) / 2, y = 22; G.box(g, x, y, w, h);
    G.T(g, u.name, x + 8, y + 6, '#ffe8a0', { scale: 1 }); G.T(g, (u.kind === 'knight' ? G.className({ id: u.id.slice(2), tier: u.tier, line: u.line }) : (G.get('monster', u.species).kind)) + ' - Lv ' + u.lvl + ' - ' + ELNAMES[u.el], x + 8, y + 16, G.SEASON_COL[u.el]);
    const rows = [['Hit points', u.hp + ' / ' + u.maxhp], ['Attack', u.atk], ['Defence', u.def], ['Intellect', u.int], ['Move', u.mov + (u.fly ? ' (flies)' : '')], ['Range', u.range[0] + '-' + u.range[1]], ['Size', u.size], ['Bond cost', u.kind === 'mon' ? G.get('monster', u.species).bond : '-']];
    rows.forEach((r_, i) => { G.T(g, r_[0], x + 10 + (i % 2) * 94, y + 30 + Math.floor(i / 2) * 11, '#a8a0c8'); G.T(g, String(r_[1]), x + 62 + (i % 2) * 94 - 0, y + 30 + Math.floor(i / 2) * 11, '#fff8d8'); });
    const opp = u.el < 4 ? ELNAMES[G.opposite(u.el)] : null; G.T(g, opp ? 'Hit hard by ' + opp + ' - resists ' + ELNAMES[u.el] : 'Outside the seasons', x + 10, y + 76, '#d8d0f0');
    if (u.skills.length) UI.text(g, 'Skills: ' + u.skills.map(s => G.get('skill', s).name).join(', '), x + 10, y + 86, w - 20, '#ffd870', 9); else if (u.kind === 'mon') G.T(g, 'Trait: ' + G.TRAIT_TEXT[G.get('monster', u.species).passive], x + 10, y + 88, '#ffd870');
    G.T(g, 'Terrain: ' + (G.TERRAIN[B.tile(this.S, u.c, u.r)] || {}).name, x + 10, y + 100, '#d8d0f0'); G.T(g, G.game.input.label('info') + ' to close', x + 10, y + 114, '#a8a0c8');
  }
  prompts() {
    switch (this.mode) {
      case 'free': return [['confirm', 'Select'], ['info', 'Details'], ['prev', 'Prev unit'], ['next', 'Next'], ['alt', 'End phase'], ['view', 'Tilt']];
      case 'move': return [['confirm', 'Move here'], ['cancel', 'Back']];
      case 'menu': case 'sub': return [['confirm', 'Choose'], ['cancel', 'Back']];
      case 'target': return [['confirm', 'Confirm'], ['dpad', 'Next target'], ['cancel', 'Back']];
      default: return [];
    }
  }
};


/* ===== 64-scenes.js ===== */
/* ---- Scenes: title, setup, event, results, ending, help, about ---- */
G.scenes = {};
const sceneBase = o => Object.assign({ pausable: false, view: 'side', input: G.INPUT, res: 'ps1', expand: true }, o);
G.touchOnly = false;
/* a shared diorama backdrop: sky of the season, hills, ground */
G.drawSky = (g, W, H, season, t, horizon) => {
  const P = G.SEASON_PAL[season]; for (let i = 0; i < 8; i++) px.rect(g, 0, Math.round(i * horizon / 8), W, Math.ceil(horizon / 8) + 1, G.lerpCol(P.sky[0], P.sky[1], i / 7));
  for (let i = 0; i < 6; i++) px.ell(g, i * W / 5 + Math.sin(t * .05 + i) * 4, horizon + 4, 70, 24 + (i % 3) * 8, G.lerpCol(P.forest, '#101020', .3 + (i % 2) * .15));
  px.rect(g, 0, horizon, W, H - horizon, G.lerpCol(P.plain[0], '#101828', .35));
  for (let i = 0; i < 40; i++) px.rect(g, Math.round(G.hash2(i, 3) * W), Math.round(horizon + 4 + G.hash2(i, 5) * (H - horizon)), 2, 1, G.lerpCol(P.plain[1], '#ffffff', .2));
};
G.drawClockTower = (g, cx, base, h, t, glow) => {
  const tn = G.tone('#b8b0c8'); px.ell(g, cx, base, 34, 8, '#00000055'); px.rect(g, cx - 14, base - h, 28, h, tn.base); px.rect(g, cx - 14, base - h, 4, h, tn.lt); px.rect(g, cx + 10, base - h, 4, h, tn.sh);
  px.poly(g, [[cx - 18, base - h], [cx, base - h - 22], [cx + 18, base - h]], '#5a3a78'); px.poly(g, [[cx - 14, base - h], [cx, base - h - 16], [cx + 14, base - h]], '#7a4a98');
  const fy = base - h + 22; px.disc(g, cx, fy, 11, '#c8a860'); px.disc(g, cx, fy, 9, '#f4ecd0'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; px.dot(g, Math.round(cx + Math.cos(a) * 7.5), Math.round(fy + Math.sin(a) * 7.5), '#3a2a40'); }
  const a1 = t * .6, a2 = t * .05; px.line(g, cx, fy, cx + Math.cos(a1) * 8, fy + Math.sin(a1) * 8, '#2a1a30', 1); px.line(g, cx, fy, cx + Math.cos(a2) * 5, fy + Math.sin(a2) * 5, '#2a1a30', 1);
  px.rect(g, cx - 3, base - 10, 6, 10, '#2a1a30'); px.rect(g, cx + 14, base - h + 6, 1, h, '#00000033');
  if (glow) px.ddisc(g, cx, fy, 26, '#ffe8a0', .18);
};

/* ---------------- TITLE ---------------- */
G.TitleScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.t = 0; this.rigs = []; this.mi = 0; }
  enter() {
    this.t = 0; G.music('title'); G.motesInit(50); G.activity(); this.items = null;
    if (!this.rigs.length) this.rigs = ['elaine', 'gawain', 'ragnell', 'nimue'].map((id, i) => ({ id, rig: new E.Humanoid(G.knightLook(id, G.KNIGHTS[id].line, 1, i, 1.05)) }));
    this.buildMenu(); G.run = null;
  }
  buildMenu() {
    let hasSave = false; try { hasSave = !!G.game.saves.latest(); } catch (e) { }
    const items = [{ label: 'New Campaign', id: 'new' }, { label: 'Continue', id: 'cont', disabled: !hasSave }, { label: 'Skirmish', id: 'skirm' }, { label: 'Training Field', id: 'train' }, { label: 'How to Play', id: 'help' }, { label: 'Settings', id: 'set' }, { label: 'Gallery', id: 'gallery' }, { label: 'About & Credits', id: 'about' }];
    this.list = new UI.List(items, { rows: 8 }); this.list.id = 'title';
  }
  update(dt) {
    this.t += dt; UI.pump(); G.fxUpdate(dt); if (G.deepLink) { const f = G.deepLink; G.deepLink = null; f(); return; }
    this.rigs.forEach((h, i) => { const u = (this.t * .4 + i * .9) % 4; h.rig.update(dt, { x: i * 40, y: 0, z: 0, vx: 0, vy: 0, facing: i < 2 ? 0 : Math.PI, pose: u < .6 ? 'cheer' : undefined }); });
    if (G.touchOnly) { if (UI.click && this.setBtn && UI.clickIn(...this.setBtn)) G.game.menu('settings'); }
    else {
      const r = this.list.update();
      if (r && r.pick != null) this.pick(this.list.items[r.pick].id);
    }
    if (G.idle() >= 10) G.game.go('attract');
  }
  pick(id) {
    const gm = G.game;
    if (id === 'new') gm.go('setup'); else if (id === 'cont') gm.saves.show('load'); else if (id === 'skirm') gm.go('skirmishSetup');
    else if (id === 'train') G.startTraining(); else if (id === 'help') gm.go('help', { back: 'title' }); else if (id === 'set') gm.menu('settings'); else if (id === 'gallery') gm.go('gallery'); else if (id === 'about') gm.go('about', { back: 'title' });
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); const season = Math.floor(t / 7) % 4, hor = Math.round(H * .56);
      G.drawSky(g, W, H, season, t, hor);
      G.drawClockTower(g, Math.round(W / 2), hor + 24, 74, t, true);
      G.drawMotes(g, W, H, season, t);
      // the four knights on the lawn, monsters at their feet
      const xs = [W * .14, W * .30, W * .70, W * .86];
      this.rigs.forEach((h, i) => { const x = Math.round(xs[i]), y = hor + 44 + (i % 2) * 8; px.ell(g, x, y, 10, 4, '#00000055'); h.rig.draw(g, x, y, G.game.view); const mon = G.all('monster').filter(m => m.el === i)[0]; G.drawMon(g, mon, 1, x + (i < 2 ? 18 : -18), y + 4, { t, dir: i < 2 ? 1 : -1, scale: .9 }); });
      E.font.title(g, 'BRIGANTIME', W / 2, 14, { scale: 3, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a' });
      G.T(g, 'The Legend of Forseasons', W / 2 - G.TW('The Legend of Forseasons', { scale: 1 }) / 2, 52, '#f4eed8');
      for (let i = 0; i < 4; i++) px.disc(g, Math.round(W / 2 - 15 + i * 10), 66, 3, i === season ? G.SEASON_COL[i] : G.lerpCol(G.SEASON_COL[i], '#000000', .6));
      if (G.touchOnly) {
        const w = 200, x = (W - w) / 2, y = Math.round(H * .56) - 10; G.box(g, x, y, w, 52); G.T(g, 'Controller or keyboard required', W / 2 - G.TW('Controller or keyboard required') / 2, y + 8, '#ffe8a0'); G.T(g, 'This game has no touch controls.', W / 2 - G.TW('This game has no touch controls.') / 2, y + 20, '#d8d0f0');
        this.setBtn = [x + w / 2 - 28, y + 33, 56, 13]; px.rect(g, ...this.setBtn, '#4a3a7a'); px.rect(g, this.setBtn[0], this.setBtn[1], this.setBtn[2], 1, '#8a78c8'); G.T(g, 'Settings', W / 2 - G.TW('Settings') / 2, y + 36, '#fff8d8');
      } else {
        const mw = 110, mx = Math.round((W - mw) / 2), my = Math.round(H * .56) - 16; G.box(g, mx - 6, my - 6, mw + 12, 8 * 12 + 12, { alpha: .88 }); this.list.draw(g, mx, my, mw);
        UI.prompts(g, W, H, [['confirm', 'Select'], ['dpad', 'Move'], ['help', 'Help']]);
      }
      G.T(g, 'v' + G.VERSION + ' - a demo', W - 8 - G.TW('v' + G.VERSION + ' - a demo'), H - 24, '#8a82a8', { font: 'tiny' });
      UI.drawToasts(g, W, H, 1 / 60);
    });
  }
};

/* ---------------- SETUP ---------------- */
G.SetupScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.sel = 0; this.diff = 1; this.row = 0; this.t = 0; this.hum = 1; }
  enter() { this.t = 0; this.rigs = this.rigs || [0, 1, 2, 3].map(i => new E.Humanoid(G.knightLook(G.RULERS[i], G.KNIGHTS[G.RULERS[i]].line, 1, i, 1.3))); G.music('title'); G.activity(); }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input, nav = UI.nav();
    this.rigs.forEach((r_, i) => r_.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, pose: i === this.sel ? 'cheer' : undefined }));
    if (nav.y) { this.row = G.clamp(this.row + nav.y, 0, 3); G.sfx('cursor'); }
    if (nav.x) { if (this.row === 0) { this.sel = (this.sel + nav.x + 4) % 4; } else if (this.row === 1) this.diff = (this.diff + nav.x + 3) % 3; else if (this.row === 2) this.hum = G.clamp(this.hum + nav.x, 1, 4); G.sfx('cursor'); }
    if (UI.mouse && UI.moved && UI.ptr) { const h = UI.hit('card'); if (h) { this.sel = h.i; this.row = 0; } const d = UI.hit('diff'); if (d) { this.row = 1; } }
    if (UI.click) { const h = UI.hit('card'); if (h) { this.sel = h.i; this.start(); return; } const d = UI.hit('diff'); if (d) { this.diff = d.i; this.row = 1; G.sfx('select'); } const hh = UI.hit('hum'); if (hh) { this.hum = hh.i + 1; this.row = 2; G.sfx('select'); } const s = UI.hit('start'); if (s) this.start(); }
    if (I.pressed('confirm')) { if (this.row === 3 || this.row === 0) this.start(); else { this.row = 3; G.sfx('select'); } }
    if (I.pressed('cancel')) { G.sfx('back'); G.game.go('title'); }
  }
  start() { G.sfx('fanfare', { vol: .6 }); G.startCampaign(this.sel, ['Easy', 'Normal', 'Hard'][this.diff], (Date.now() % 100000) + 1, Array.from({ length: this.hum }, (_, i) => (this.sel + i) % 4)); G.clearRigs(); G.game.go('event', { id: 'prologue', back: 'campaign', fresh: true }); }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); px.rect(g, 0, 0, W, H, '#120c1e'); G.drawWorldBackdrop(g, W, H, this.sel, t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .55);
      G.T(g, 'Choose your realm', W / 2 - G.TW('Choose your realm') / 2, 6, '#ffe8a0');
      const cw = Math.min(96, Math.floor((W - 30) / 4)), gap = 6, total = cw * 4 + gap * 3, x0 = Math.round((W - total) / 2);
      for (let i = 0; i < 4; i++) {
        const x = x0 + i * (cw + gap), y = 18, h = 116, rm = G.REALMS[i], sel = i === this.sel; UI.add('card', i, x, y, cw, h);
        G.box(g, x, y - (sel ? 3 : 0), cw, h, { border: sel ? '#fff0a0' : G.lerpCol(rm.col, '#000000', .3), bg: [G.lerpCol(rm.dark, '#000000', .2), '#0a0618'] });
        const yy = y - (sel ? 3 : 0); px.rect(g, x + 4, yy + 4, cw - 8, 3, rm.col);
        this.rigs[i].drawPortrait(g, x + Math.round((cw - 48) / 2), yy + 10, 48, { zoom: 3, turn: .3, bg: G.lerpCol(rm.dark, '#000000', .4), frame: true });
        G.T(g, rm.name, x + cw / 2 - G.TW(rm.name) / 2, yy + 62, rm.col); G.T(g, G.SEASONS[i], x + cw / 2 - G.TW(G.SEASONS[i]) / 2, yy + 72, G.SEASON_COL[i]);
        const rk = G.KNIGHTS[rm.ruler]; G.T(g, rk.short, x + cw / 2 - G.TW(rk.short) / 2, yy + 82, '#f4eed8'); G.T(g, G.LINES[rk.line].names[1], x + cw / 2 - G.TW(G.LINES[rk.line].names[1]) / 2, yy + 91, '#a8a0c8');
      }
      const rm = G.REALMS[this.sel]; UI.text(g, '"' + rm.motto + '" ' + rm.blurb, 20, 140, W - 40, '#d8d0f0', 10);
      // difficulty
      const dy = 164; G.T(g, 'Difficulty', 20, dy + 2, this.row === 1 ? '#ffe8a0' : '#a8a0c8');
      ['Easy', 'Normal', 'Hard'].forEach((d, i) => { const x = 90 + i * 70; UI.add('diff', i, x, dy, 64, 12); px.rect(g, x, dy, 64, 12, i === this.diff ? (this.row === 1 ? '#6a5aa8' : '#4a3a7a') : '#1e1630'); G.T(g, d, x + 32 - G.TW(d) / 2, dy + 2, i === this.diff ? '#fff8d8' : '#8a82a8'); });
      G.T(g, ['Candle +4 seasons, more mana', 'The Brigantime as written', 'Candle -2, fiercer rivals'][this.diff], 90, dy + 14, '#a8a0c8');
      const hy = 190; G.T(g, 'Human players', 20, hy + 2, this.row === 2 ? '#ffe8a0' : '#a8a0c8'); for (let i = 0; i < 4; i++) { const x = 90 + i * 40; UI.add('hum', i, x, hy, 34, 12); px.rect(g, x, hy, 34, 12, i + 1 === this.hum ? (this.row === 2 ? '#6a5aa8' : '#4a3a7a') : '#1e1630'); G.T(g, String(i + 1), x + 17 - G.TW(String(i + 1)) / 2, hy + 2, i + 1 === this.hum ? '#fff8d8' : '#8a82a8'); } G.T(g, this.hum > 1 ? 'Hot-seat: realms ' + Array.from({ length: this.hum }, (_, i) => G.REALMS[(this.sel + i) % 4].name).join(', ') : 'Local pass-and-play when more than one', 270, hy + 2, '#a8a0c8', { font: 'tiny' });
      const bx = W / 2 - 50, by = 207; UI.add('start', 0, bx, by, 100, 12); px.rect(g, bx, by, 100, 12, this.row === 3 || this.row === 0 ? '#6a5aa8' : '#3a2e5a'); px.rect(g, bx, by, 100, 1, '#aa98e8'); G.T(g, 'Begin the Brigantime', W / 2 - G.TW('Begin the Brigantime') / 2, by + 2, '#fff8d8');
      UI.prompts(g, W, H, [['dpad', 'Choose'], ['confirm', 'Begin'], ['cancel', 'Back']]);
    });
  }
};

/* ---------------- SKIRMISH SETUP ---------------- */
G.SkirmishScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.f = { you: 0, foe: 1, map: 0, season: 4, hot: 0, sides: 2 }; this.row = 0; this.t = 0; }
  enter() { this.t = 0; G.music('title'); G.activity(); }
  rows() { const f = this.f; return [['Your realm', G.REALMS[f.you].name, G.REALMS[f.you].col], ['Foe', G.REALMS[f.foe].name, G.REALMS[f.foe].col], ['Field', G.MAP_NAMES[G.PLAIN_MAPS[f.map]], '#f4eed8'], ['Season', f.season === 4 ? 'Random' : G.SEASONS[f.season], f.season === 4 ? '#f4eed8' : G.SEASON_COL[f.season]], ['Opponent', f.hot ? 'Human (hot-seat)' : 'CPU', f.hot ? '#80f0c0' : '#f4eed8'], ['Sides', f.sides + (f.sides > 2 ? ' (free-for-all)' : ''), '#f4eed8'], ['Fight!', '', '#ffe8a0']]; }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input, nav = UI.nav(), f = this.f;
    if (nav.y) { this.row = G.clamp(this.row + nav.y, 0, 6); G.sfx('cursor'); }
    const h = UI.hit('srow'); if (UI.mouse && UI.moved && h) this.row = h.i;
    let dx = nav.x; if (UI.click && h) { this.row = h.i; if (h.i === 4) dx = 0; else dx = (UI.click[0] > (UI.lastPtr ? 213 : 213)) ? 1 : 1; }
    if (dx && this.row < 6) { G.sfx('cursor'); if (this.row === 0) f.you = (f.you + dx + 4) % 4; if (this.row === 1) f.foe = (f.foe + dx + 4) % 4; if (this.row === 2) f.map = (f.map + dx + 13) % 13; if (this.row === 3) f.season = (f.season + dx + 5) % 5; if (this.row === 4) f.hot = 1 - f.hot; if (this.row === 5) f.sides = 2 + (f.sides - 2 + dx + 3) % 3; }
    if (I.pressed('confirm') || (UI.click && h && h.i === 6)) { if (this.row === 6 || (UI.click && h && h.i === 6)) this.go(); else { G.sfx('cursor'); if (this.row === 0) f.you = (f.you + 1) % 4; if (this.row === 1) f.foe = (f.foe + 1) % 4; if (this.row === 2) f.map = (f.map + 1) % 13; if (this.row === 3) f.season = (f.season + 1) % 5; if (this.row === 4) f.hot = 1 - f.hot; if (this.row === 5) f.sides = 2 + (f.sides - 1) % 3; } }
    if (I.pressed('cancel')) { G.sfx('back'); G.game.go('title'); }
  }
  go() { const f = this.f; if (f.you === f.foe) f.foe = (f.foe + 1) % 4; const seed = (Date.now() % 90000) + 1; const spec = G.makeSkirmish(seed, { sides: f.sides, realms: [f.you, f.foe], map: G.PLAIN_MAPS[f.map], season: f.season === 4 ? seed % 4 : f.season }); spec.sides[1].human = !!f.hot && f.sides === 2; spec.sides[1].items = spec.sides[1].human ? ['potion'] : []; spec.kind = 'field'; G.sfx('fanfare', { vol: .5 }); G.game.go('battle', { spec, skirmish: true }); }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin(); px.rect(g, 0, 0, W, H, '#120c1e'); G.drawWorldBackdrop(g, W, H, this.f.season === 4 ? Math.floor(this.t / 3) % 4 : this.f.season, this.t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .5);
      G.T(g, 'Skirmish', W / 2 - G.TW('Skirmish') / 2, 8, '#ffe8a0'); G.T(g, 'Two to four sides, twelve bells. Left and right change a row.', W / 2 - G.TW('Two to four sides, twelve bells. Left and right change a row.') / 2, 22, '#a8a0c8');
      const bw = 220, bx = Math.round((W - bw) / 2); G.box(g, bx - 8, 36, bw + 16, 7 * 17 + 10);
      this.rows().forEach((rw, i) => { const y = 41 + i * 17, sel = i === this.row; UI.add('srow', i, bx, y, bw, 16); px.rect(g, bx, y, bw, 16, sel ? '#4a3a7a' : '#1a1230'); if (sel) px.rect(g, bx - 2, y + 3, 2, 10, '#f0c860'); G.T(g, rw[0], bx + 8, y + 4, sel ? '#fff8d8' : '#a8a0c8'); if (i < 6) { const tt = (sel ? '< ' : '') + rw[1] + (sel ? ' >' : ''); G.T(g, tt, bx + bw - 8 - G.TW(tt), y + 4, rw[2]); } });
      UI.prompts(g, W, H, [['dpad', 'Choose'], ['confirm', 'Change / Fight'], ['cancel', 'Back']]);
    });
  }
};
G.trainingSpec = () => {
  const mk = (id, line, lvl, realm) => ({ id, line, tier: 0, lvl, equip: {}, hp: null, ruler: false, realm });
  return { seed: 4242, map: 'meadow', season: 0, kind: 'field', bells: 12, sides: [
    { realm: 0, human: true, items: ['potion', 'potion'], troops: [{ knight: mk('percival', 0, 3, 0), mons: [{ id: 't1', species: 'wolf', form: 0, lvl: 3 }, { id: 't2', species: 'pixie', form: 0, lvl: 3 }, { id: 't3', species: 'wolf', form: 0, lvl: 2 }] }, { knight: mk('bors', 4, 3, 0), mons: [{ id: 't4', species: 'wolf', form: 0, lvl: 3 }, { id: 't5', species: 'pixie', form: 0, lvl: 2 }] }] },
    { realm: 5, human: false, items: [], troops: [{ knight: mk('wick', 1, 2, 5), mons: [{ id: 't6', species: 'bone', form: 0, lvl: 2 }, { id: 't7', species: 'bone', form: 0, lvl: 2 }, { id: 't8', species: 'raven', form: 0, lvl: 2 }] }] }] };
};
G.startTraining = () => {
  const lines = [{ who: 'narrator', name: '', text: 'The Border Road, Spring. A training field, chalked out by someone who really enjoys chalk.', voice: 1 }, { who: 'percival', name: 'Percival', text: 'The brigands hold the far end. Move, strike, and mind the Ward: my monsters fight best near me.', voice: 1 }, { who: 'bors', name: 'Bors', text: 'Weak foes can be Bound to our banner. Use the Bind command when their health is low. Twelve bells, and no more.', voice: .8 }];
  G.game.go('event', { lines, stage: 'road', next: ['battle', { spec: G.trainingSpec(), tutorial: true, skirmish: true }] });
};

/* ---------------- BATTLE SCENE ---------------- */
G.BattleScene = class {
  constructor() { Object.assign(this, sceneBase({ pausable: true })); }
  enter(d) {
    this.d = d || {}; G.clearRigs(); G.fxs = []; const spec = this.d.spec;
    this.bv = new G.BattleView(spec, { tutorial: this.d.tutorial, onOver: S => this.over(S), noInput: !!this.d.hub });
    G.music(spec.kind === 'boss' ? 'boss' : 'battle', { restart: true }); G.motesInit(30); G.activity();
    if (this.d.hub) G.hubBattle(this);
  }
  over(S) {
    const d = this.d, res = B.result(S);
    if (d.hub) { G.hubDone(this, S); return; }
    G.music(S.winner === 0 ? 'victory' : 'defeat'); G.sfx(S.winner === 0 ? 'fanfare' : 'lose');
    if (d.campaign) { const out = C.applyBattle(G.run.S, d.attack, d.spec, res, S); G.game.go('results', { out, sim: S, attack: d.attack, campaign: true }); }
    else G.game.go('results', { sim: S, skirmish: true, tutorial: d.tutorial });
  }
  update(dt) {
    UI.pump(); try { G.game.saves.canSave = false; } catch (e) { } if (G.dev.update(this)) return; if (this.d.hub && G.hubGate) G.hubGate(this);
    this.bv.update(dt);
  }
  draw(r) { r.overlay(g => { UI.begin(); this.bv.draw(g, r, r.W, r.H); G.dev.draw(g, r.W, r.H); UI.drawToasts(g, r.W, r.H, 1 / 60); UI.prompts(g, r.W, r.H, G.dev.open ? [['confirm', 'Select'], ['cancel', 'Close']] : this.bv.prompts()); if (this.d.hub && this.hubMsg) { G.box(g, r.W / 2 - 80, r.H / 2 - 12, 160, 24); G.T(g, this.hubMsg, r.W / 2 - G.TW(this.hubMsg) / 2, r.H / 2 - 4, '#ffe8a0'); } }); }
};

/* ---------------- EVENT (story) ---------------- */
const STAGES = { hall: { season: 0, floor: '#4a3a5a', wall: ['#2a2040', '#4a3a68'] }, road: { season: 2, floor: '#6a5a3a', wall: null }, clock: { season: 4, floor: '#2a2638', wall: ['#12101e', '#3a2e58'] } };
G.EventScene = class {
  constructor() { Object.assign(this, sceneBase({ pausable: true })); this.say = new UI.Say(); }
  enter(d) {
    this.d = d; const S = G.run && G.run.S; let lines, stage = d.stage;
    if (d.lines) lines = d.lines; else { const ev = G.EVENTS.find(e => e.id === d.id); lines = ev.scene(S); stage = ev.stage; if (d.id === 'prologue' && S) S.eventsDone.prologue = true; }
    this.stage = STAGES[stage] || STAGES.hall; this.lines = lines; this.say.start(lines); this.t = 0; G.music('event'); G.sfx('page');
    this.actors = []; for (const l of lines) if (l.who !== 'narrator' && !this.actors.find(a => a.id === l.who)) this.actors.push({ id: l.who, rig: new E.Humanoid(G.knightLook(l.who, (G.KNIGHTS[l.who] || { line: 0 }).line, 1, (G.KNIGHTS[l.who] || { realm: 5 }).realm, 1.2)) });
    this.actors = this.actors.slice(0, 3);
    this.back = d.back || 'title';
  }
  actorX(i, n, W) { return n === 1 ? W / 2 : n === 2 ? (i ? W * .68 : W * .32) : [W * .22, W * .5, W * .78][i]; }
  update(dt) {
    this.t += dt; UI.pump(); try { G.game.saves.canSave = false; } catch (e) { } if (G.dev.update(this)) return;
    const cur = this.say.cur(), n = this.actors.length;
    this.actors.forEach((a, i) => a.rig.update(dt, { x: i * 50, y: 0, z: 0, vx: 0, vy: 0, facing: this.actorX(i, n, 400) < 200 ? 0 : Math.PI, expr: cur && cur.who === a.id && this.say.n < this.say.full ? 'shout' : undefined, pose: cur && cur.who === a.id && this.say.n < this.say.full ? 'wave' : undefined }));
    const r = this.say.update(dt);
    if (r && r.choice && r.choice.set && G.run) Object.assign(G.run.S.flags, r.choice.set);
    if (r && r.done) this.finish();
    if (G.game.input.pressed('cancel') && !this.say.list) { /* B skips nothing: story stays whole */ }
  }
  finish() { const d = this.d; if (d.next) { G.game.go(d.next[0], d.next[1]); return; } if (d.fresh) { G.game.go('campaign'); return; } G.game.go(this.back, d.backData); }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin(); const st = this.stage, t = this.t;
      if (st.wall) { for (let i = 0; i < 8; i++) px.rect(g, 0, Math.round(i * H / 8 * .65), W, Math.ceil(H / 8) + 1, G.lerpCol(st.wall[0], st.wall[1], i / 7)); } else G.drawSky(g, W, H, st.season, t, Math.round(H * .6));
      px.rect(g, 0, Math.round(H * .58), W, H, st.floor); for (let i = 0; i < 30; i++) px.rect(g, Math.round(G.hash2(i, 1) * W), Math.round(H * .6 + G.hash2(i, 2) * H * .4), 6, 1, G.lerpCol(st.floor, '#ffffff', .12));
      if (st.season === 4) { G.drawClockTower(g, Math.round(W / 2), Math.round(H * .58), 74, t, true); } else if (this.d.id === 'prologue' || st === STAGES.hall) { for (let i = 0; i < 4; i++) { const x = W * (.12 + i * .25); px.rect(g, Math.round(x - 6), 24, 12, 90, '#3a2e50'); px.poly(g, [[x - 5, 40], [x + 5, 40], [x + 5, 70], [x, 80], [x - 5, 70]], G.SEASON_COL[i]); } }
      const n = this.actors.length; const cur = this.say.cur();
      this.actors.forEach((a, i) => { const x = Math.round(this.actorX(i, n, W)), y = Math.round(H * .66) + (i % 2) * 6; px.ell(g, x, y, 14, 5, '#00000066'); const dim = cur && cur.who !== a.id && cur.who !== 'narrator'; if (dim) { g.save(); g.globalAlpha = .6; } a.rig.draw(g, x, y, G.game.view); if (dim) g.restore(); });
      if (!this.actors.length) G.drawMotes(g, W, H, st.season < 4 ? st.season : 0, t, .6);
      this.say.draw(g, W, H, (gg, x, y, size, who) => { const a = this.actors.find(q => q.id === who); if (a) a.rig.drawPortrait(gg, x, y, size, { zoom: 3.2, turn: .3, bg: '#1a1230' }); });
      G.dev.draw(g, W, H); UI.prompts(g, W, H, [['confirm', 'Continue'], ['alt', 'Hold: faster']]);
    });
  }
};

/* ---------------- RESULTS ---------------- */
G.ResultsScene = class {
  constructor() { Object.assign(this, sceneBase({})); }
  enter(d) {
    this.d = d; this.t = 0; const win = d.campaign ? (d.out.won === C.isHuman(G.run.S, d.attack.realm)) : d.sim.winner === 0; this.win = win;
    G.music(win ? 'victory' : 'defeat', { restart: true }); this.lines = this.build(); G.activity();
    if (win) G.sfx('fanfare');
  }
  build() {
    const d = this.d, L_ = [];
    if (d.campaign) {
      const out = d.out, S = G.run.S;
      L_.push([out.taken ? `${G.CASTLES[out.castle].short} falls to ${RN(out.att)}.` : `${G.CASTLES[out.castle].short} holds against ${RN(out.att)}.`, '#ffe8a0']);
      if (out.treasure) L_.push(['Treasury taken: ' + G.get('item', out.treasure).name, '#80f0c0']);
      for (const c of out.captured) L_.push(['Bound to the banner: ' + c, '#ffd870']);
      for (const lu of out.levelUps) { const name = lu.id.startsWith('M') ? (S.mons[lu.id] ? monName(S.mons[lu.id]) : '') : KS(lu.id); if (name) L_.push([name + ' reaches level ' + lu.lvl + '!', '#a0ffa0']); }
      for (const dth of out.deaths.slice(0, 5)) L_.push([dth.name + ' is lost.', '#f09090']);
      for (const w of out.wounded) L_.push([w + ' is wounded and will miss the next season.', '#f0b0a0']);
      L_.push(['Bells fought: ' + Math.min(d.sim.bell, d.sim.bells), '#a8a0c8']);
    } else {
      const S = d.sim, mine = B.live(S, 0).length, dead = S.units.filter(u => u.side === 0 && !u.alive).length;
      L_.push([S.winner === 0 ? 'The field is yours.' : 'The field is lost.', '#ffe8a0']); L_.push([`Your troops standing: ${mine}.  Fallen: ${dead}.  Bells: ${Math.min(S.bell, S.bells)}.`, '#d8d0f0']);
      const best = S.units.filter(u => u.side === 0).sort((a, b) => b.dmgDone - a.dmgDone)[0]; if (best) L_.push([`Most damage: ${best.name} (${best.dmgDone}).`, '#a8a0c8']);
      if (d.tutorial) L_.push(['Training complete. The campaign awaits.', '#80f0c0']);
    }
    return L_;
  }
  update(dt) { this.t += dt; UI.pump(); if (this.t > .8 && (G.game.input.pressed('confirm') || UI.click)) { G.sfx('select'); this.done(); } }
  done() {
    const d = this.d; if (d.campaign) { G.game.go('campaign', { resume: 'after' }); return; }
    G.game.go('title');
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); px.rect(g, 0, 0, W, H, '#0a0614'); G.drawWorldBackdrop(g, W, H, (G.run ? G.run.S.season : 0), t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .55);
      const u = Math.min(1, t * 2); E.font.title(g, this.win ? 'VICTORY' : 'DEFEAT', W / 2, 24 - (1 - u) * 20, { scale: 3, align: 'center', colors: this.win ? ['#ffffff', '#ffe070', '#e08a20'] : ['#e8e0f0', '#9a8ab8', '#4a3a68'], depth: 2 });
      const w = Math.min(W - 40, 320), x = (W - w) / 2, y = 74, h = Math.min(130, this.lines.length * 12 + 14); G.box(g, x, y, w, h);
      this.lines.slice(0, 9).forEach((l, i) => { if (t > .3 + i * .12) G.T(g, l[0], x + 10, y + 8 + i * 12, l[1]); });
      UI.prompts(g, W, H, [['confirm', 'Continue']]);
    });
  }
};

/* ---------------- ENDING + CREDITS ---------------- */
G.EndingScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.say = new UI.Say(); }
  enter(d) {
    this.d = d; const lines = G.ENDINGS[d.kind](d.realm).map(l => l); this.say.start(lines); this.phase = 'story'; this.t = 0; this.scroll = 0;
    G.music(d.won ? 'victory' : 'defeat', { restart: true }); G.clearRigs(); G.sfx(d.won ? 'fanfare' : 'lose');
    this.actors = {}; G.activity();
  }
  portrait(g, x, y, size, who) { const a = this.actors[who] || (this.actors[who] = new E.Humanoid(G.knightLook(who, G.KNIGHTS[who].line, 1, G.KNIGHTS[who].realm, 1.2))); a.drawPortrait(g, x, y, size, { zoom: 3.2, turn: .3, bg: '#1a1230' }); }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input;
    if (this.phase === 'story') { const r = this.say.update(dt); if (r && r.done) { this.phase = 'credits'; this.t = 0; } }
    else { this.scroll += dt * 16; if (I.pressed('confirm') && this.t > 1) { G.run = null; G.game.go('title'); } }
    for (const k in this.actors) this.actors[k].update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); const won = this.d.won, S = G.run ? G.run.S : null;
      G.drawSky(g, W, H, won ? 0 : 3, t, Math.round(H * .6)); G.drawClockTower(g, Math.round(W / 2), Math.round(H * .64), 80, t * (won ? 4 : 0), won); G.drawMotes(g, W, H, won ? 0 : 3, t, .8);
      if (this.phase === 'story') this.say.draw(g, W, H, (gg, x, y, s, who) => this.portrait(gg, x, y, s, who));
      else {
        px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .7);
        const lines = [['BRIGANTIME', 3], ['The Legend of Forseasons', 1], ['', 0], [won ? 'The Wheel turns again.' : 'The Clock waits for another hand.', 1], ['', 0]];
        if (S) { lines.push(['Seasons played: ' + S.turn, 1], ['Battles fought: ' + S.stats.battles, 1], ['Castles taken: ' + S.stats.castles, 1], ['Monsters bound: ' + S.stats.captured, 1], ['', 0]); }
        lines.push(['Inspired by Brigandine: The Legend of Forsena', 1], ['Built on my-3D2dge. Every sound and picture drawn by code.', 1], ['', 0], ['Thank you for playing.', 1]);
        let y = H - this.scroll; for (const [tx, sc] of lines) { if (sc === 3) E.font.title(g, tx, W / 2, Math.round(y), { scale: 3, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'] }); else if (tx) G.T(g, tx, W / 2 - G.TW(tx) / 2, Math.round(y), '#f4eed8'); y += sc === 3 ? 34 : 14; }
        if (y < 20 && this.t > 3) G.T(g, 'Press ' + G.game.input.label('confirm') + ' to return to the title', W / 2 - 80, H / 2, '#ffe8a0');
        UI.prompts(g, W, H, [['confirm', 'Title']]);
      }
    });
  }
};

/* ---------------- HELP ---------------- */
G.HELP = [
  ['Overview', ['BRIGANTIME is a game of seasons. Each turn is one season of the Brigantime: Spring, Summer, Autumn, Winter.', 'Read the Tidings, Muster your castles, then March on neighbours. Armies meet in hex battles of twelve bells.', 'Take Meridian and defeat the Gray Knight before the Hour-Candle burns out. It is lit in Spring of Year 2.']],
  ['Muster', ['Open a castle of yours: Summon monsters (mana), Bind them to your knights (a knight\'s Bond caps the troop), move knights to a neighbouring castle, or send them Questing for treasure, beasts, wanderers, mana, training... and mishaps.', 'Equip items, promote monsters (Lv 12, or earlier with a Season Seed) and knights (Lv 10 free; the third class needs a Writ).', 'Commands: March, Realms, End Muster. A castle can be Stilled by the Gray Knight for a season.']],
  ['Battle', ['Select a unit, pick a hex, then Attack, Skill, Bind, Item or Wait. Each unit acts once per bell. Spells need planted feet: cast before you move.', 'Opposed seasons hit hard: Spring vs Autumn, Summer vs Winter. The battle\'s season gives its own element a Tide bonus.', 'Monsters beyond four hexes from their knight are outside the Ward and fight weaker. Weak monsters can be Bound. Win by routing the foe; attackers also win with a knight on the Keep at the last bell.']],
  ['Controls', ['Controller: D-pad or left stick moves, Cross confirms, Circle goes back, Square is Commands or End phase, Triangle shows details, L1/R1 cycle units, R3 tilts the board, Options pauses.', 'Keyboard: arrows or WASD, Enter or Z confirm, Backspace or X back, Space end phase or commands, Tab or I details, Q and E cycle, V tilt, Esc pause.', 'Mouse: hover to focus, click to choose, right click to go back. Prompts follow the device you used last.']]
];
G.HelpScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.page = 0; }
  enter(d) { this.d = d || {}; this.t = 0; this.page = 0; G.activity(); }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input, nav = UI.nav();
    if (nav.x || I.pressed('next') || I.pressed('prev')) { this.page = (this.page + (nav.x || (I.pressed('next') ? 1 : -1)) + G.HELP.length) % G.HELP.length; G.sfx('cursor'); }
    if (UI.click) { const h = UI.hit('htab'); if (h) { this.page = h.i; G.sfx('cursor'); } }
    if (I.pressed('cancel') || I.pressed('confirm') && false) { G.sfx('back'); G.game.go(this.d.back || 'title'); }
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin(); px.rect(g, 0, 0, W, H, '#120c1e'); G.drawWorldBackdrop(g, W, H, this.page % 4, this.t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .6);
      G.T(g, 'How to Play', 10, 6, '#ffe8a0');
      G.HELP.forEach((p, i) => { const x = 10 + i * 70; UI.add('htab', i, x, 20, 66, 12); px.rect(g, x, 20, 66, 12, i === this.page ? '#6a5aa8' : '#2a2046'); G.T(g, p[0], x + 33 - G.TW(p[0]) / 2, 23, i === this.page ? '#fff8d8' : '#8a82a8'); });
      G.box(g, 10, 36, W - 20, H - 36 - 20); let y = 44; for (const para of G.HELP[this.page][1]) { y += UI.text(g, para, 18, y, W - 44, '#f4eed8', 10) + 8; }
      UI.prompts(g, W, H, [['dpad', 'Page'], ['cancel', 'Back']]);
    });
  }
};

/* ---------------- ABOUT / CREDITS ---------------- */
G.AboutScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.page = 0; this.scroll = 0; }
  enter(d) { this.d = d || {}; this.t = 0; this.page = 0; this.scroll = 0; G.activity(); }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input, nav = UI.nav(), n = G.ABOUT.length;
    if (nav.x || I.pressed('next') || I.pressed('prev')) { this.page = (this.page + (nav.x || (I.pressed('next') ? 1 : -1)) + n) % n; this.scroll = 0; G.sfx('cursor'); }
    if (nav.y) this.scroll = Math.max(0, this.scroll + nav.y * 14);
    if (UI.click) { const h = UI.hit('atab'); if (h) { this.page = h.i; this.scroll = 0; } }
    if (I.pressed('cancel')) { G.sfx('back'); G.game.go(this.d.back || 'title'); }
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin(); px.rect(g, 0, 0, W, H, '#120c1e'); G.drawWorldBackdrop(g, W, H, 3, this.t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .6);
      G.T(g, 'About & Credits', 10, 5, '#ffe8a0'); const tw = Math.floor((W - 20) / G.ABOUT.length);
      G.ABOUT.forEach((p, i) => { const x = 10 + i * tw; UI.add('atab', i, x, 17, tw - 2, 12); px.rect(g, x, 17, tw - 2, 12, i === this.page ? '#6a5aa8' : '#2a2046'); G.T(g, p.title, x + (tw - 2) / 2 - G.TW(p.title) / 2, 20, i === this.page ? '#fff8d8' : '#8a82a8'); });
      G.box(g, 10, 32, W - 20, H - 32 - 18);
      const lines = []; for (const [k, v] of G.ABOUT[this.page].rows) { lines.push([k ? k + ': ' : '', v]); }
      let y = 38 - this.scroll; g.save(); g.beginPath(); g.rect(12, 34, W - 24, H - 34 - 20); g.clip();
      for (const [k, v] of lines) { const ls = UI.wrap((k || '') + v, W - 48); ls.forEach((l, i) => { if (y > 28 && y < H) G.T(g, l, 18, y, i === 0 && k ? '#f4eed8' : '#d8d0f0'); y += 9; }); y += 3; }
      g.restore(); this.maxScroll = Math.max(0, y + this.scroll - (H - 24));
      if (this.scroll > this.maxScroll) this.scroll = this.maxScroll;
      UI.prompts(g, W, H, [['dpad', 'Page - scroll'], ['cancel', 'Back']]);
    });
  }
};


/* ===== 67-attract-gallery.js ===== */
/* ---- Attract mode (a looping AI-played reel) and the gallery ---- */
G.AttractScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.seed = 11; }
  enter() {
    this.t = 0; this.beat = 'map'; this.bt = 0; this.seed++; G.clearRigs(); G.fxs = []; this.cs = new G.CampaignScene(); this.mapRounds = 0; this.startMap(); this.startReal = performance.now() / 1000;
  }
  exit() { G.run = null; }
  startMap() {
    this.beat = 'map'; this.bt = 0; this.step = 0; const S = C.create({ human: this.seed % 4, seed: this.seed * 77 }); S.turn = 0; C.startTidings(S);
    G.run = { S, stage: 'resolve', cursor: 0 }; this.S = S; this.cs.stack = []; this.cs.t = 0; this.cs.marching = false; this.cs.cursor = 0;
  }
  nextSeasonStep() {
    const S = this.S; this.step++;
    if (this.step === 1) { for (const r of S.realms) if (r.alive && r.id !== 5) { C.aiMuster(S, r.id); } G.music(['spring', 'summer', 'autumn', 'winter'][S.season]); }
    if (this.step === 2) { for (const r of S.realms) if (r.alive && r.id !== 5) C.aiMarch(S, r.id); S.queue = S.marches.map(m => ({ realm: m.realm, to: m.to, from: m.from.slice() })); G.sfx('quest'); }
    if (this.step === 3) { C.resolveAI(S, true); S.marches = []; G.sfx('fanfare', { vol: .3 }); }
    if (this.step === 4) { C.endSeason(S); S.stats; this.mapRounds++; this.step = 0; this.cs.cards = []; G.sfx('season'); }
  }
  startBattle() {
    this.beat = 'battle'; this.bt = 0; G.fxs = []; const seed = this.seed * 13 + 5; const spec = G.makeSkirmish(seed, { ai: true, realms: [seed % 4, (seed + 2) % 4], season: seed % 4 });
    this.bv = new G.BattleView(spec, { auto: true, noInput: true, cursor: false, overDelay: 1.5, onOver: () => { this.beat = 'sum'; this.bt = 0; G.music('victory'); } }); G.music('battle', { restart: true }); G.motesInit(30);
  }
  update(dt) {
    this.t += dt; this.bt += dt; UI.pump();
    if ((G.lastActivity || 0) > this.startReal + .03 || UI.moved || UI.click || G.game.input.anyPressed()) { G.run = null; G.game.go('title'); return; }
    if (this.beat === 'map') {
      this.cs.t += dt; G.fxUpdate(dt); 
      if (this.bt > 3.2 * (this.step + 1) && this.step < 4) { this.nextSeasonStep(); this.cs.cards = this.S.cards; }
      if (this.step >= 4 || this.bt > 3.2 * 5) { this.nextSeasonStep(); }
      if (this.mapRounds >= 2) { this.startBattle(); }
    } else if (this.beat === 'battle') {
      this.bv.update(dt); if (this.bt > 38) this.bv.o.quick = true;
    } else if (this.beat === 'sum') { G.fxUpdate(dt); if (this.bt > 3.5) { this.seed++; this.mapRounds = 0; this.startMap(); G.music('title'); } }
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin();
      if (this.beat === 'map') {
        const cs = this.cs, S = this.S; cs.rect = { x: 14, y: 22, w: W - 28, h: H - 54 }; G.run.stage = 'resolve';
        G.drawWorldBackdrop(g, W, H, S.season, cs.t, true); cs.drawMap(g, W, H); G.drawMotes(g, W, H, S.season, cs.t, .6); cs.drawTop(g, W, H);
        const cap = [['The seasons turn.', 'Realms muster monsters and knights.', 'Armies declare their marches.', 'Castles change hands.'][Math.min(3, this.step)]]; G.box(g, W / 2 - 100, H - 46, 200, 14, { alpha: .9 }); G.T(g, cap[0], W / 2 - G.TW(cap[0]) / 2, H - 43, '#ffe8a0');
      } else if (this.beat === 'battle') { this.bv.draw(g, r, W, H); }
      else {
        this.bv.draw(g, r, W, H); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .55); const s = this.bv.S, t = (s.winner === 0 ? s.sides[0].name : s.sides[1].name) + ' wins the field'; E.font.title(g, 'BATTLE OVER', W / 2, H / 2 - 24, { scale: 2, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'] }); G.T(g, t, W / 2 - G.TW(t) / 2, H / 2 + 2, '#f4eed8');
      }
      px.rect(g, 0, H - 15, W, 15, '#0a0614cc'); const pulse = Math.floor(UI.t * 2) % 2; G.T(g, pulse ? 'DEMO: press any button' : 'DEMO', W / 2 - G.TW('DEMO: press any button') / 2, H - 12, '#ffe8a0');
    });
  }
};
/* gallery: creatures, knights, sound */
G.GalleryScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.tab = 0; }
  enter() { this.t = 0; this.tab = 0; this.mk(); G.activity(); G.music(null); }
  mk() {
    if (this.tab === 0) this.list = new UI.List(G.all('monster').map(m => ({ label: m.names[0], id: m.id, tag: G.SEASONS[m.el] || 'Hour', tagCol: G.SEASON_COL[m.el] })), { rows: 10, tabs: true });
    else if (this.tab === 1) this.list = new UI.List(Object.values(G.KNIGHTS).map(k => ({ label: k.short, id: k.id, tag: G.REALMS[k.realm].short || G.REALMS[k.realm].name, tagCol: G.REALMS[k.realm].col })), { rows: 10, tabs: true });
    else this.list = new UI.List(Object.keys(G.SONGS).map(s => ({ label: 'Music: ' + s, id: 'm:' + s })).concat(Object.keys(G.SFX).map(s => ({ label: 'Sound: ' + s, id: 's:' + s }))), { rows: 10, tabs: true });
    this.list.id = 'gal';
  }
  update(dt) {
    this.t += dt; UI.pump(); const r = this.list.update();
    if (this.rig) this.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
    if (r && r.cancel) { G.game.go('title'); }
    else if (r && (r.next || r.prev)) { this.tab = (this.tab + (r.next ? 1 : 2)) % 3; this.mk(); G.sfx('cursor'); }
    else if (r && r.pick != null && this.tab === 2) { const id = this.list.items[r.pick].id; if (id.startsWith('m:')) { G.musicNow = null; G.music(id.slice(2)); } else G.sfx(id.slice(2)); }
    if (this.tab === 1) { const it = this.list.cur(); if (it && this.rigId !== it.id) { const k = G.KNIGHTS[it.id]; this.rig = new E.Humanoid(G.knightLook(it.id, k.line, 1, k.realm, 1.6)); this.rigId = it.id; } }
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); px.rect(g, 0, 0, W, H, '#161026'); G.drawWorldBackdrop(g, W, H, Math.floor(t / 4) % 4, t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .6);
      ['Creatures', 'Knights', 'Sound'].forEach((n, i) => { const x = 10 + i * 70; px.rect(g, x, 4, 66, 12, i === this.tab ? '#6a5aa8' : '#2a2046'); G.T(g, n, x + 33 - G.TW(n) / 2, 7, i === this.tab ? '#fff8d8' : '#8a82a8'); });
      G.box(g, 10, 20, 120, 160); this.list.draw(g, 14, 26, 112);
      G.box(g, 136, 20, W - 146, 160); const it = this.list.cur();
      if (it && this.tab === 0) { const sp = G.get('monster', it.id); for (let f = 0; f < 3; f++) { G.drawMon(g, sp, f, 180 + f * 80, 90 + (sp.fly ? 10 : 0), { t, scale: 1.6 + f * .1, dir: 1 }); G.T(g, sp.names[f], 180 + f * 80 - G.TW(sp.names[f]) / 2, 104, '#ffe8a0'); } G.T(g, `${sp.kind} - ${sp.size} - ${G.SEASONS[sp.el] || 'Hour'}`, 146, 28, G.SEASON_COL[sp.el]); G.T(g, `HP ${sp.hp} ATK ${sp.atk} DEF ${sp.def} INT ${sp.int} MOV ${sp.mov}`, 146, 124, '#d8d0f0'); G.T(g, `Range ${sp.rangeSpec[0]}-${sp.rangeSpec[1]} - Bond ${sp.bond} - Summon ${sp.cost}`, 146, 136, '#d8d0f0'); }
      else if (it && this.tab === 1 && this.rig) { const k = G.KNIGHTS[it.id]; px.ell(g, 200, 120, 22, 7, '#00000066'); this.rig.draw(g, 200, 120, G.game.view); G.T(g, k.name, 146, 28, '#ffe8a0'); G.T(g, G.LINES[k.line].names.join(' > '), 146, 38, '#d8d0f0'); UI.text(g, k.blurb, 250, 56, W - 266, '#f4eed8', 10); }
      else if (this.tab === 2) { G.T(g, 'Confirm plays the song or sound.', 146, 28, '#d8d0f0'); UI.text(g, 'All music, effects and voices are written in code. Voices are Animalese babble, pitched per speaker.', 146, 46, W - 166, '#a8a0c8', 10); }
      UI.prompts(g, W, H, [['confirm', 'Play'], ['prev', 'Tab'], ['next', 'Tab'], ['cancel', 'Back']]);
    });
  }
};


/* ===== 70-dev.js ===== */
/* ---- Dev mode: reached from the pause menu. Live balance sliders with a reset, and quick tools. ---- */
G.dev = {
  open: false, tab: 0, i: 0, sub: null, top: 0,
  toggle() { this.open = true; this.i = 0; this.tab = 0; this.sub = null; G.sfx('select'); },
  tools(scene) {
    const t = [];
    const bv = scene && scene.bv, camp = scene instanceof G.CampaignScene && G.run && G.run.S;
    t.push({ label: 'God mode: ' + (G.cheat.god ? 'ON' : 'off'), fn: () => { G.cheat.god = !G.cheat.god; } });
    t.push({ label: 'One-hit kills: ' + (G.cheat.oneHit ? 'ON' : 'off'), fn: () => { G.cheat.oneHit = !G.cheat.oneHit; } });
    if (camp) {
      const S = camp;
      t.push({ label: '+500 mana', fn: () => { S.realms[S.human].mana += 500; } });
      t.push({ label: 'Knights +3 levels', fn: () => { for (const k of C.knightsOf(S, S.human)) C.grant(S, k, C.xpNeed(k.lvl) * 3 + 90); for (const m of Object.values(S.mons)) if (m.realm === S.human) C.grant(S, m, 400); } });
      t.push({ label: 'Give every item', fn: () => { for (const i of G.ITEM_IDS) S.realms[S.human].items.push(i); } });
      t.push({ label: 'Heal everyone, free knights', fn: () => { for (const k of Object.values(S.knights)) { k.wounded = 0; k.hp = null; k.moved = false; k.marched = false; } } });
      t.push({ label: 'Take the castle under the cursor', fn: () => { const c = G.run.cursor; if (S.castles[c].owner !== S.human) { const a = { realm: S.human, to: c, from: [] }; C.takeCastle(S, a, true, null); } } });
      t.push({ label: 'Light the Hour-Candle at 3', fn: () => { S.candle = 3; } });
      t.push({ label: 'Trigger a story event...', fn: () => { this.sub = new UI.List(G.EVENTS.map(e => ({ label: e.id, id: e.id })), { rows: 9 }); } });
      t.push({ label: 'Skip to the next season', fn: () => { camp.marches = []; C.endMuster(S); S.queue = []; C.endSeason(S); G.run.stage = 'tidings'; scene.beginTidings(); scene.stack = []; } });
    }
    if (bv) {
      const S = bv.S;
      t.push({ label: 'Win this battle now', fn: () => { for (const u of B.live(S, 1)) if (u.alive) { u.hp = 0; B.fall(S, u, null, []); } if (!S.over) { S.over = true; S.winner = 0; S.reason = 'dev'; } bv.queueEvents([{ k: 'over', winner: 0, reason: 'dev' }]); } });
      t.push({ label: 'Lose this battle now', fn: () => { S.over = true; S.winner = 1; S.reason = 'dev'; bv.queueEvents([{ k: 'over', winner: 1, reason: 'dev' }]); } });
      t.push({ label: 'Heal my units, refill MP', fn: () => { for (const u of B.live(S, 0)) { u.hp = u.maxhp; u.mp = u.maxmp; } } });
      t.push({ label: 'Remove the unit under the cursor', fn: () => { const u = bv.cursorUnit(); if (u) { u.hp = 0; B.fall(S, u, null, []); bv.vis.get(u.uid).alpha = 0; } } });
      t.push({ label: 'Everyone may act again', fn: () => { for (const u of B.live(S, S.phase)) { u.done = u.acted = u.moved = false; } } });
    }
    t.push({ label: 'Gallery (creatures, knights, sound)', fn: () => { this.open = false; G.game.go('gallery'); } });
    t.push({ label: 'Return to the title', fn: () => { this.open = false; G.run = null; G.game.go('title'); } });
    return t;
  },
  update(scene) {
    if (!this.open) return false;
    const I = G.game.input, nav = UI.nav(); UI.pump();
    if (this.sub) { const r = this.sub.update(); if (r && r.cancel) this.sub = null; else if (r && r.pick != null) { const id = this.sub.items[r.pick].id; this.sub = null; this.open = false; G.game.go('event', { id, back: 'campaign' }); } return true; }
    if (I.pressed('cancel')) { this.open = false; G.sfx('back'); return true; }
    if (I.pressed('prev') || I.pressed('next')) { this.tab = (this.tab + 1) % 2; this.i = 0; G.sfx('cursor'); }
    const items = this.tab === 0 ? G.TUNE_META.length + 1 : this.tools(scene).length;
    if (nav.y) { this.i = (this.i + nav.y + items) % items; G.sfx('cursor'); }
    if (this.tab === 0) {
      const m = G.TUNE_META[this.i];
      if (m && nav.x) { const mul = I.down('alt') ? 5 : 1; G.tune[m[0]] = G.clamp(Math.round((G.tune[m[0]] + nav.x * m[4] * mul) / m[4]) * m[4], m[2], m[3]); G.tune[m[0]] = +G.tune[m[0]].toFixed(3); G.saveTune(); G.sfx('cursor'); }
      if (I.pressed('confirm') && this.i === G.TUNE_META.length) { G.resetTune(); UI.toast('Balance reset to defaults.'); G.sfx('select'); }
    } else if (I.pressed('confirm')) { const t = this.tools(scene)[this.i]; if (t) { t.fn(); G.sfx('select'); UI.toast(t.label.replace(/: (ON|off)/, '')); } }
    if (UI.click) { const h = UI.hit('devrow'); if (h) { this.i = h.i; if (this.tab === 1) { const t = this.tools(scene)[this.i]; if (t) t.fn(); } else if (h.i === G.TUNE_META.length) G.resetTune(); } }
    return true;
  },
  draw(g, W, H) {
    if (!this.open) return; const scene = G.game.scene;
    px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .6);
    const w = Math.min(W - 20, 300), h = H - 40, x = (W - w) / 2, y = 10; G.box(g, x, y, w, h, { border: '#ff9a6a' });
    G.T(g, 'DEV MODE', x + 8, y + 5, '#ff9a6a'); ['Balance', 'Tools'].forEach((n, i) => { const tx = x + 80 + i * 60; px.rect(g, tx, y + 3, 56, 11, i === this.tab ? '#6a5aa8' : '#2a2046'); G.T(g, n, tx + 28 - G.TW(n) / 2, y + 5, i === this.tab ? '#fff8d8' : '#8a82a8'); });
    if (this.sub) { this.sub.draw(g, x + 10, y + 24, w - 20); return; }
    const rows = Math.floor((h - 36) / 12); UI.rects = UI.rects.filter(r => r.owner !== 'devrow');
    if (this.tab === 0) {
      const all = G.TUNE_META.length + 1, top = G.clamp(this.i - Math.floor(rows / 2), 0, Math.max(0, all - rows));
      for (let k = 0; k < Math.min(rows, all); k++) { const i = top + k, yy = y + 20 + k * 12; UI.add('devrow', i, x + 6, yy, w - 12, 11); if (i < G.TUNE_META.length) { const m = G.TUNE_META[i]; UI.slider(g, x + 8, yy, w - 16, m[1], G.tune[m[0]], m[2], m[3], i === this.i); } else { if (i === this.i) px.rect(g, x + 8, yy, w - 16, 11, '#4a3a7a'); G.T(g, 'Reset all to defaults', x + 12, yy + 2, '#ffe8a0'); } }
      G.T(g, 'Left/Right adjust (hold ' + G.game.input.label('alt') + ' for x5). Changes apply live.', x + 8, y + h - 12, '#a8a0c8', { font: 'tiny' });
    } else {
      const list = this.tools(scene); const top = G.clamp(this.i - Math.floor(rows / 2), 0, Math.max(0, list.length - rows));
      for (let k = 0; k < Math.min(rows, list.length); k++) { const i = top + k, yy = y + 20 + k * 12; UI.add('devrow', i, x + 6, yy, w - 12, 11); if (i === this.i) { px.rect(g, x + 8, yy, w - 16, 11, '#4a3a7a'); px.rect(g, x + 6, yy + 2, 2, 7, '#f0c860'); } G.T(g, list[i].label, x + 12, yy + 2, i === this.i ? '#fff8d8' : '#d8d0f0'); }
    }
  }
};


/* ===== 80-net-hub.js ===== */
/* ---- AI Hub session (Protocol v1, mode: shared-world). The host's copy is the authority: it orders every command and
   sends it on; every copy applies the same commands to the same seeded BattleSim. Seats 0 and 1 fight; others watch. ---- */
G.hub = { active: false, info: null, started: false, done: false };
G.hubStartup = () => {
  const A = typeof window !== 'undefined' ? window.AIHub : null; if (!A || !A.active) return false;
  G.hub.active = true;
  A.connect({ mode: 'shared-world', seats: [2, 4] }).then(info => {
    if (!info) { G.hub.active = false; G.game.go('title'); return; }
    G.hub.info = info; const seed = info.seed || 1;
    const spec = G.makeSkirmish(seed, { realms: [0, 2], season: seed % 4, ai: false }); spec.sides[1].human = true; spec.sides[1].items = ['potion'];
    G.game.go('battle', { spec, hub: true });
  }).catch(e => { try { A.fail('Could not connect: ' + e); } catch (er) { } });
  return true;
};
G.hubNet = () => {
  const A = window.AIHub, info = G.hub.info, ids = info.players.map(p => p.id), mySide = ids.indexOf(info.me);
  return { mySide, isHost: !!info.isHost, send: (d, toHost) => { try { toHost && !info.isHost ? A.send(d, { to: info.host }) : A.send(d); } catch (e) { } } };
};
G.hubBattle = scene => {
  const A = window.AIHub, net = G.hubNet(); scene.hubMsg = 'Waiting for the round...'; G.hub.done = false; G.hub.started = false;
  scene.bv.o.net = net; scene.bv.o.noInput = true; scene.bv.o.overDelay = .6;
  A.on('message', (d, from) => { if (!d || !d.c) return; const bv = scene.bv; if (net.isHost) { const side = bv.S.phase; if (bv.isRemote(side) && G.hub.info.players[side] && G.hub.info.players[side].id === from && bv.apply(d.c)) net.send({ c: d.c }); } else if (from === G.hub.info.host) bv.apply(d.c); });
  const finish = () => { if (G.hub.done || !net.isHost) return; G.hub.done = true; const S = scene.bv.S, ids = G.hub.info.players.map(p => p.id); const win = S.over ? S.winner : (B.live(S, 0).reduce((a, u) => a + u.hp, 0) >= B.live(S, 1).reduce((a, u) => a + u.hp, 0) ? 0 : 1);
    const order = [ids[win], ids[1 - win]].filter(x => x !== undefined), rest = ids.filter(x => !order.includes(x));
    try { A.finish({ standings: [[order[0]], [order[1]]].filter(a => a[0] !== undefined).concat(rest.length ? [rest] : []), scores: { [ids[0]]: B.live(S, 0).length, [ids[1]]: B.live(S, 1).length }, stats: {}, awards: [{ id: ids[win], title: 'Field taken', detail: 'Won the shared battle' }] }); } catch (e) { } scene.hubMsg = 'Round over'; };
  scene.hubFinish = finish;
  A.on('time-up', finish); A.on('leave', () => { if (net.isHost) setTimeout(finish, 50); }); A.on('end', () => { G.hub.done = true; scene.bv.o.noInput = true; scene.hubMsg = 'Round over'; });
  A.ready();
};
G.hubGate = scene => {
  const A = window.AIHub; if (!A) return true; const bv = scene.bv;
  const now0 = performance.now(); if (!G.hub.lastHb || now0 - G.hub.lastHb > 900) { G.hub.lastHb = now0; try { A.send({ hb: { bell: bv.S.bell, phase: bv.S.phase, host: !!G.hub.info.isHost } }); } catch (e) { } }
  const t = A.time(); if (t < 0 && !G.hub.started) { scene.hubMsg = t === -Infinity ? 'Waiting for the round...' : 'Starting in ' + Math.ceil(-t / 1000); bv.o.noInput = true; return t !== -Infinity ? false : false; }
  if (!G.hub.started) { G.hub.started = true; scene.hubMsg = bv.o.net.mySide < 0 ? 'Spectating the duel' : null; bv.o.noInput = bv.o.net.mySide < 0; }
  return true;
};
G.hubDone = (scene, S) => { if (scene.hubFinish) scene.hubFinish(); scene.hubMsg = S.winner === 0 ? 'Side one wins' : 'Side two wins'; scene.bv.o.noInput = true; };


/* ===== 90-main.js ===== */
/* ---- main: the game, its menu, settings, scenes and the debug handle ---- */
G.loadTune();
const hubActive = typeof window !== 'undefined' && !!(window.AIHub && window.AIHub.active);
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', input: G.INPUT, bg: '#05040a',
  menu: hubActive ? { items: [], quit: false, controls: {}, settings: [] } : {
    saves: { slots: 3, version: 1 }, quit: 'title',
    items: [['Dev Mode', () => { game.resume(); G.dev.toggle(); }], ['How to Play', () => { game.resume(); game.go('help', { back: G.game.sceneName || 'title' }); }]],
    settings: [{ key: 'glyphs', label: 'Button glyphs', options: ['PlayStation', 'Xbox'], value: 'PlayStation' }],
    controls: { confirm: 'Confirm', cancel: 'Back', alt: 'Commands / End phase', info: 'Details', prev: 'Previous', next: 'Next', view: 'Tilt board', help: 'Help' }
  }
});
G.game = game;
G.initAudio(game);
const sc = G.scenes;
sc.title = new G.TitleScene(); sc.setup = new G.SetupScene(); sc.skirmishSetup = new G.SkirmishScene(); sc.campaign = new G.CampaignScene(); sc.campaign.pausable = true; sc.campaign.view = 'side'; sc.campaign.input = G.INPUT; sc.campaign.res = 'ps1';
Object.assign(sc.campaign, sceneBase({ pausable: true }));
sc.battle = new G.BattleScene(); sc.event = new G.EventScene(); sc.results = new G.ResultsScene(); sc.ending = new G.EndingScene(); sc.help = new G.HelpScene(); sc.about = new G.AboutScene(); sc.attract = new G.AttractScene(); sc.gallery = new G.GalleryScene();
G.touchOnly = (() => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover)').matches; } catch (e) { return false; } })();
// activity tracking for the attract mode (keys, pointer, pad)
const HAS_DOM = typeof addEventListener === 'function';
if (HAS_DOM) {
for (const ev of ['keydown', 'pointerdown', 'wheel']) addEventListener(ev, () => { G.activity(); if (ev === 'keydown') G.touchOnly = false; });
addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) G.activity(); } });
addEventListener('gamepadconnected', () => { G.activity(); G.touchOnly = false; });
setInterval(() => { try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p && (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5))) { G.activity(); G.touchOnly = false; } } catch (e) { } }, 100);
}
G.activity();
// glyph family follows the setting
game.saves.write = () => { const run = G.run; if (!run || !run.S) return null; const S = run.S; return { data: { v: 1, S, cursor: run.cursor }, place: G.SEASONS[S.season] + ', Year ' + S.year, level: G.REALMS[S.human].name }; };
game.saves.read = save => { const d = save.data; if (!d || !d.S) return; G.clearRigs(); G.run = { S: d.S, stage: 'tidings', cursor: d.cursor }; G.run.S.cards = G.run.S.cards || []; G.run.stage = 'muster'; game.go('campaign'); };
game.debug = {
  G, snapshot() {
    const s = game.scene, run = G.run, bv = s && s.bv;
    return { scene: game.sceneName, phase: run ? run.stage : null, season: run ? run.S.season : null, year: run ? run.S.year : null, candle: run ? run.S.candle : null, realm: run ? run.S.human : null, mana: run ? run.S.realms[run.S.human].mana : null,
      panel: s && s.stack ? s.stack.length : 0, battle: bv ? { map: bv.S.map, bell: bv.S.bell, mode: bv.mode, cursor: bv.cursor, over: bv.S.over, units: bv.S.units.map(u => [u.uid, u.side, u.c, u.r, u.hp, u.mp, u.alive ? 1 : 0]) } : null, touchOnly: G.touchOnly, attract: s && s.beat ? { beat: s.beat } : null, errors: game.errors.length };
  },
  newCampaign(o = {}) { G.startCampaign(o.human || 0, o.difficulty || 'Normal', o.seed || 1); game.go('campaign'); }, startBattle(spec, extra) { game.go('battle', Object.assign({ spec }, extra || {})); }, sim() { return game.scene.bv ? game.scene.bv.S : G.run && G.run.S; },
  cmd(c) { return game.scene.bv ? game.scene.bv.apply(c) : false; }, setTune(k, v) { G.tune[k] = v; }, resetTune() { G.resetTune(); }, trigger(id) { game.go('event', { id, back: 'campaign' }); }, hash() { return G.hash(game.debug.sim()); }
};
const boot = {
  title: 'BRIGANTIME', steps: [['Winding the Great Clock', () => { G.loadTune(); }], ['Summoning the bestiary', () => { for (const m of G.all('monster')) m.names.length; }], ['Tuning the bells', () => { G.motesInit(50); }]]
};
const start = () => {
  const hub = hubActive;
  game.start({ scene: hub ? 'hubwait' : 'title', scenes: Object.assign({}, sc, { hubwait: sceneBase({ enter() { }, update() { UI.pump(); }, draw(r) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#05040a'); G.T(g, 'Connecting to the hub...', r.W / 2 - 60, r.H / 2, '#ffe8a0'); }); } }) }), boot });
  const q = typeof location !== 'undefined' ? location.hash.slice(1) : '';
  if (hub) G.hubStartup();
  else if (q) { const [a, b] = q.split('/'); G.deepLink = () => { if (a === 'attract') game.go('attract'); else if (a === 'about') game.go('about'); else if (a === 'help') game.go('help'); else if (a === 'gallery') game.go('gallery'); else if (a === 'skirmish') game.go('skirmishSetup'); else if (a === 'campaign') { game.debug.newCampaign({ human: +b || 0 }); } else if (a === 'training') G.startTraining(); else if (a === 'battle') { game.debug.startBattle(G.makeSkirmish(+b || 5, { realms: [0, 1] }), { skirmish: true }); } }; }
};
start();


})();
