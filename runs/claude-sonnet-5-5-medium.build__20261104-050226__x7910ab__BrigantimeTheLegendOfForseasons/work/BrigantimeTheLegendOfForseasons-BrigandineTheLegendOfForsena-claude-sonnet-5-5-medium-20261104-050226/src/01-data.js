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
