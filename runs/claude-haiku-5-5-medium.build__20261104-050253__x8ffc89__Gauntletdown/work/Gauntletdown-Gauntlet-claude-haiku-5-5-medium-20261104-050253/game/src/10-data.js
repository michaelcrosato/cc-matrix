// The content tables: the four heroes, the monsters and generators, the items, the sprites, and the narrator's lines.
// Numbers here are the defaults; the Dev Tools sliders scale them through TUNE (below).

const TUNE = {
  drain: 1,            // life force lost per second, per living hero
  startHealth: 700,    // health at the start (and when rising in a continue)
  foodHeal: 1,         // scale on roast and cider (100 at 1)
  heroSpeed: 1,
  shotRate: 1,
  shotDamage: 1,
  magicPower: 1,
  monsterSpeed: 1,
  monsterDamage: 1,
  spawnInterval: 1,
  generatorHp: 1,
  maxMonsters: 90,
  stairHold: 1
};
const DEFAULT_TUNE = Object.assign({}, TUNE);
const DIFFICULTY = {
  easy: { drain: .5, monsterDamage: .7, startHealth: 1.3 },
  normal: { drain: 1, monsterDamage: 1, startHealth: 1 },
  hard: { drain: 1.5, monsterDamage: 1.3, startHealth: .85 }
};
const CHEATS = { god: false, infinite: false, freeze: false, noGen: false, hitboxes: false, flowfield: false };

// The four heroes. Each is a class with its own armour, shot, melee, magic and speed.
const HEROES = {
  berserker: {
    name: 'BERSERKER', who: 'Brakka Ironbelly', color: '#e8443a', seat: 0, speed: 62, armor: .75, shot: 'axe', shotDmg: 3, pierce: true,
    shotSpeed: 190, cooldown: .34, melee: 5, magic: 1, magicGen: 1, reach: 16,
    rig: () => new E.Humanoid({ size: 1.15, build: 'bulky', weapon: 'sword', hat: 'helmet', cape: { len: 4, width: 4, seg: 2 }, colors: { cloth: '#8a3a2a', cape: '#5a3a24', hair: '#3a2a20', trim: '#c8b890' } }),
    quip: 'HITS FIRST. EATS SECOND. THINKS RARELY.', stats: [5, 3, 5, 1, 3]
  },
  shieldmaiden: {
    name: 'SHIELDMAIDEN', who: 'Hilde Stoutheart', color: '#3b82f6', seat: 1, speed: 66, armor: .6, shot: 'javelin', shotDmg: 2, pierce: false,
    shotSpeed: 240, cooldown: .27, melee: 4, magic: 1.4, magicGen: 1, reach: 14,
    rig: () => new E.Humanoid({ size: 1.1, build: 'heroic', weapon: 'sword', hat: 'helmet', hair: 'ponytail', colors: { cloth: '#3b5a8a', hair: '#c8a040', trim: '#c0c8d8' } }),
    quip: 'THE SHIELD IS FOR YOU. THE SPEAR IS FOR THEM.', stats: [4, 3, 3, 2, 3]
  },
  ranger: {
    name: 'RANGER', who: 'Fenn Quickfletch', color: '#22c55e', seat: 2, speed: 78, armor: .9, shot: 'arrow', shotDmg: 1, pierce: false,
    shotSpeed: 300, cooldown: .15, melee: 2, magic: 1.7, magicGen: 1, reach: 12,
    rig: () => new E.Humanoid({ size: 1.05, build: 'heroic', weapon: null, hood: true, outfit: 'coat', sleeves: 'long', cape: { len: 3, width: 4, seg: 2 }, colors: { cloth: '#2f6a3a', coat: '#3a7a3a', trim: '#8a5a2a', hair: '#5a3a20' } }),
    quip: 'FASTEST LEGS IN HOLLOWMERE. FASTEST TO RUN OUT OF ARROWS? NEVER.', stats: [3, 5, 2, 3, 5]
  },
  hexer: {
    name: 'HEXER', who: 'Old Mother Wix', color: '#f5b700', seat: 3, speed: 64, armor: 1, shot: 'hex', shotDmg: 2, pierce: false, splash: 12,
    shotSpeed: 220, cooldown: .26, melee: 1.5, magic: 2.5, magicGen: 2, reach: 12,
    rig: () => new E.Humanoid({ size: 1.05, build: 'chibi', weapon: 'staff', hat: { style: 'pointed', color: '#5a3a8a' }, outfit: 'robe', hunch: .3, face: { eyes: 'big' }, colors: { cloth: '#6a3ab0', hair: '#f0e0c0', trim: '#f5b700' } }),
    quip: 'SHE HAS CURSED BETTER DUNGEONS THAN THIS.', stats: [2, 3, 1, 5, 3]
  }
};
const CLASS_ORDER = ['berserker', 'shieldmaiden', 'ranger', 'hexer'];
const CLASS_INITIALS = { berserker: 'BRK', shieldmaiden: 'SHM', ranger: 'RNG', hexer: 'HEX' };

// Monsters. hp is per rank: a monster's rank is ceil(hp / base), and a wounded one shrinks a rank.
const MONSTERS = {
  ghost: { name: 'HUNGERGHOST', base: 2, speed: [40, 46, 52], damage: [10, 20, 30], reach: 9, cooldown: .6, points: 10, ai: 'chase', color: '#c8d8ff' },
  gnasher: { name: 'GNASHER', base: 2, speed: [34, 38, 42], damage: [6, 8, 10], reach: 14, cooldown: .9, points: 10, ai: 'club', color: '#7a9a6a' },
  lobber: { name: 'POT-LOBBER', base: 2, speed: [30, 34, 38], damage: [8, 10, 12], reach: 0, cooldown: 2.2, points: 15, ai: 'lob', color: '#e8e0d0' },
  imp: { name: 'CINDER IMP', base: 3, speed: [36, 40, 44], damage: [6, 8, 10], reach: 10, cooldown: .8, points: 20, ai: 'imp', color: '#ff7040' },
  fryar: { name: 'FRYAR', base: 3, speed: [36, 40, 44], damage: [8, 10, 12], reach: 12, cooldown: .9, points: 25, ai: 'fryar', color: '#9a8ac0' },
  snatcher: { name: 'SNATCHER', base: 3, speed: [72, 72, 72], damage: [0, 0, 0], reach: 8, cooldown: 1, points: 100, ai: 'snatch', color: '#c8a050' },
  tithe: { name: 'THE TITHE', base: 999, speed: [52, 52, 52], damage: [0, 0, 0], reach: 10, cooldown: .1, points: 1000, ai: 'tithe', color: '#602060' }
};
const GENERATORS = {
  urn: { name: 'ASH URN', spawn: 'ghost', interval: 3.0, hp: 12, points: 25, cap: 8, rank: 1 },
  den: { name: 'GNASHER DEN', spawn: 'gnasher', interval: 3.5, hp: 12, points: 25, cap: 8, rank: 1 },
  hutch: { name: 'CROCKERY HUTCH', spawn: 'lobber', interval: 3.2, hp: 12, points: 25, cap: 6, rank: 1 },
  grate: { name: 'EMBER GRATE', spawn: 'imp', interval: 3.4, hp: 14, points: 25, cap: 6, rank: 1 },
  shrine: { name: 'CANDLE SHRINE', spawn: 'fryar', interval: 3.4, hp: 14, points: 25, cap: 6, rank: 1 },
  sack: { name: 'SACK HEAP', spawn: 'snatcher', interval: 5.0, hp: 14, points: 25, cap: 3, rank: 1 }
};
const GEN_OF_CHAR = { G: 'urn', N: 'den', L: 'hutch', I: 'grate', F: 'shrine', S: 'sack' };
const MON_OF_CHAR = { g: 'ghost', n: 'gnasher', o: 'lobber', i: 'imp', y: 'fryar', x: 'snatcher', t: 'tithe' };

// Items: what each map character is, what it does, whether a shot destroys it, and what it's worth.
const ITEMS = {
  f: { name: 'ROAST', heal: 100, points: 10 },
  b: { name: 'LOAF', heal: 50, points: 5 },
  j: { name: 'CIDER', heal: 100, points: 10, shootable: true, shot: 'cider' },
  z: { name: 'STEW', heal: -50, queasy: 4, points: 0, shootable: true, shot: 'stew' },
  m: { name: 'FLASK', flask: 1, points: 0 },
  k: { name: 'KEY', key: 1, points: 0 },
  $: { name: 'GOLD', points: 100 },
  '*': { name: 'GEM', points: 250 },
  h: { name: 'CHEST', points: 500 },
  l: { name: 'LOCKED CHEST', lock: true, points: 1000 },
  w: { name: 'CROWN', points: 2500 },
  P: { name: 'FEAST PLATTER', heal: 200, points: 20, shootable: true, shot: 'feast' },
  u: { name: 'SPECIAL POTION', special: true, points: 250 },
  a: { name: 'AMULET', amulet: true, points: 100 },
  G: { name: 'IRON GAUNTLET', points: 5000, gauntlet: true }
};
// Special potions (once per hero per type) and amulets (20 seconds each).
const SPECIALS = {
  ironbrew: { name: 'IRON BREW', line: 'IRON BREW. {CLASS} FEELS STURDIER.' },
  ogreale: { name: 'OGRE ALE', line: 'OGRE ALE. {CLASS} HITS HARDER.' },
  quickshot: { name: 'QUICKSHOT TONIC', line: 'QUICKSHOT TONIC. {CLASS} THROWS FASTER.' },
  hardshot: { name: 'HARDSHOT DRAUGHT', line: 'HARDSHOT DRAUGHT. {CLASS} THROWS HARDER.' },
  witchwater: { name: 'WITCHWATER', line: 'WITCHWATER. {CLASS} CRACKLES WITH MAGIC.' },
  featherfoot: { name: 'FEATHERFOOT CORDIAL', line: 'FEATHERFOOT CORDIAL. {CLASS} STEPS LIGHTER.' },
  deeppockets: { name: 'DEEP POCKETS', line: 'DEEP POCKETS. {CLASS} CARRIES MORE.' }
};
const AMULETS = {
  veil: { name: 'VEIL', secs: 20, line: 'THE VEIL. NOW YOU SEE {CLASS}. NOW YOU DON\'T.' },
  ironskin: { name: 'IRONSKIN', secs: 20, line: 'IRONSKIN. NOTHING BITES {CLASS}. FOR NOW.' },
  stench: { name: 'STENCH', secs: 20, line: 'STENCH. EVEN GHOSTS GAG.' },
  ricochet: { name: 'RICOCHET', secs: 20, line: 'RICOCHET. MIND YOUR HEADS.' },
  rending: { name: 'RENDING', secs: 20, line: 'RENDING. NOTHING STOPS THOSE SHOTS.' }
};

// Sprites. Every pixel is a character; '.' is clear. Built once and drawn with r.sprite.
const SPR = {
  roast: E.sprite(['........', '..oooo..', '.oOOOOo.', 'oOOwOOOo', 'oOOOOOOo', '.oooooo.', '........'], { o: '#7a3a14', O: '#c0622a', w: '#f4e6c8' }, 1),
  loaf: E.sprite(['........', '..bbbb..', '.bBBBBb.', 'bBBBBBBb', 'bbbbbbbb', '........'], { b: '#6a4a24', B: '#d8a860' }, 1),
  cider: E.sprite(['..cc....', '.cCCc...', 'cCCCCc..', 'cCwCCc..', 'cCCCCc..', '.cccc...'], { c: '#7a4a1a', C: '#e09a2a', w: '#f8f0d0' }, 1),
  stew: E.sprite(['........', '.gggggg.', 'gGGGGGGg', 'gGGGGGGg', '.gggggg.', '..gggg..'], { g: '#3a5a2a', G: '#7ab04a' }, 1),
  flask: E.sprite(['...ww...', '...ww...', '..bbbb..', '.bBBBBb.', '.bBBBBb.', '..bbbb..'], { w: '#c8c8d0', b: '#2a5aa8', B: '#7ad0ff' }, 1),
  key: E.sprite(['.yy.', 'yYYy', '.yy.', '..y.', '..yy', '..y.'], { y: '#8a6a1a', Y: '#f4d060' }, 1),
  gold: E.sprite(['..yy....', '.yYYy...', 'yYYYYy..', 'yyYYYYyy', '.yyyyyy.'], { y: '#8a6a1a', Y: '#f8d860' }, 1),
  gem: E.sprite(['.cc.', 'cCCc', '.cc.'], { c: '#2a8ab8', C: '#9ae8ff' }, 1),
  chest: E.sprite(['..........', '.bbbbbbbb.', 'bBBBbBBBb.', 'bbbbbbbbbb', 'bYYYYYYYYb', 'bbbbbbbbbb'], { b: '#5a3a1a', B: '#8a5a2a', Y: '#e0b040' }, 1),
  urn0: E.sprite(['.uuuuu.', 'uUUUUUu', 'uUUUUUu', '.uUUUu.', '..uuu..', '..uuu..'], { u: '#6a6a7a', U: '#b0b8c8' }, 2),
  urn1: E.sprite(['.uuuuu.', 'uUUUUUu', 'uUuUuUu', '.uUUUu.', '..uuu..', '..uuu..'], { u: '#6a5a6a', U: '#a09aa8' }, 2),
  urn2: E.sprite(['.uuuuu.', 'uUUUUUu', 'uUu.uUu', '.uu.uu.', '..u.u..', '..u.u..'], { u: '#4a4a5a', U: '#7a7a88' }, 2),
  den0: E.sprite(['...tttt...', '..tttttt..', '.tTTTTTt.', 'tTTTTTTTTt', 'tTdTTTdTTt', 'tTTTTTTTTt'], { t: '#5a4a3a', T: '#8a6a4a', d: '#1a1010' }, 2),
  den1: E.sprite(['...tttt...', '..tttttt..', '.tTTTTTt.', 'tTTTTTTTTt', 'tdTTTTTdTt', 'tTTTTTTTTt'], { t: '#4a3a2a', T: '#6a5a3a', d: '#1a1010' }, 2),
  den2: E.sprite(['...tttt...', '..t.tt.t..', '.tTT.TTt.', 'tTTT.TTTTt', 'tdT.TTdTTt', 'tT.TTTT.Tt'], { t: '#3a2a1a', T: '#5a4a2a', d: '#1a1010' }, 2),
  ghost: [E.sprite(['..WWWW..', '.WWWWWW.', 'WbWWWbWW', 'WWWWWWWW', 'WWOOOOWW', 'WWWWWWWW', 'WWhWhWhW', 'WhWhWhW.'], { W: '#d8e6ff', b: '#1a2030', O: '#202838', h: '#a8c0f0' }, 2),
    E.sprite(['..WWWW..', '.WWWWWW.', 'WbWWWbWW', 'WWWWWWWW', 'WWOOOOWW', 'WWWWWWWW', 'hWhWhWhW', '.hWhWhW.'], { W: '#d8e6ff', b: '#1a2030', O: '#202838', h: '#a8c0f0' }, 2)],
  stairs: E.sprite(['.........', 'ssssssss.', 'sSSSSSSs.', 'sSssssSs.', 'sSSSSSSs.', 'sssssssss'], { s: '#3a3050', S: '#6a5a8a' }, 2),
  bulb: E.sprite(['.yy.', 'yYYy', '.yy.'], { y: '#f0e070', Y: '#ffffff' }, 1)
};

// Narrator lines (the Gaunt): short, booming, third person. {CLASS} is the hero's name.
const LINES = {
  start: 'THE GAUNTLET IS DOWN. COME AND GET IT.',
  fading: '{CLASS}, YOUR LIFE FORCE IS FADING.',
  starving: '{CLASS} IS STARVING!',
  dying: '{CLASS} IS ABOUT TO PERISH!',
  eaten: '{CLASS} HAS BEEN EATEN.',
  rise: '{CLASS} RISES AGAIN. HOW TIRESOME.',
  tip_food: 'LIFE FORCE DRAINS WITH EVERY BREATH. EAT.',
  tip_dontshoot: 'NEVER SHOOT THE SUPPER.',
  shot_cider: '{CLASS} SHOT THE CIDER!',
  ate_stew: '{CLASS} ATE THE STEW. A POOR CHOICE.',
  tip_stairs: 'THE STAIRS GO DOWN. THEY ALWAYS GO DOWN.',
  tip_ghost: 'HUNGERGHOSTS. THEY HAVE NOT EATEN IN NINE CENTURIES.',
  tip_generator: 'THAT URN BREEDS THEM. BREAK IT.',
  tip_gnasher: 'GNASHERS. ALL TEETH, NO MANNERS.',
  tip_melee: 'TOO CLOSE TO THROW? THEN HIT IT.',
  tip_magic: 'MAGIC STRIKES ALL YOU CAN SEE. USE IT WISELY.',
  key_first: 'A KEY. HOW THOUGHTFUL.',
  tip_door: 'A KEY OPENS A DOOR. ANY DOOR. ONCE.',
  treasure_first: 'TREASURE! THE GAUNT KEEPS COUNT.',
  shot_flask: '{CLASS} SHOT THE MAGIC. MOSTLY WASTED.',
  stairs: '{CLASS} FOUND THE STAIRS.',
  glutton: '{CLASS} EATS FOR FOUR.',
  game_over: 'THE GAUNT IS FED.',
  continue: 'RISE, OR BE SUPPER.',
  high_score: 'NAME THYSELF, MORSEL.',
  welcome: 'WELCOME, {CLASS}.',
  join: '{CLASS} JOINS THE MEAL.',
  floor_1: 'WELCOME TO THE GAUNT, MORSELS.',
  floor_2: 'MIND THE ROOTS. THEY BITE.',
  floor_3: 'SMOKED, SALTED, SERVED.',
  floor_4: 'THE GAUNT IS BOTTOMLESS. SO IS YOUR HUNGER.',
  ending: 'THE BOTTOM OF THE GAUNT IS REACHED. THE IRON GAUNTLET IS NOT HERE. YOU ARE, OF COURSE, STILL HUNGRY.',
  descent: 'THE GAUNT DIGS DEEPER. SO MUST YOU.'
};
function line(key, cls) {
  const hero = cls ? HEROES[cls].name : 'MORSEL';
  return (LINES[key] || key).replace('{CLASS}', hero);
}

// The prologue, the story cards and the About pages.
const PROLOGUE = 'BENEATH THE TOWN OF HOLLOWMERE, A DUNGEON DIGS DOWN, AND DOWN, AND DOWN. THEY CALL IT THE GAUNT. AT ITS BOTTOM SITS KING FAMISH, WHO HAS EATEN FOR NINE HUNDRED YEARS AND IS STILL HUNGRY. EACH WINTER HE THROWS HIS IRON GAUNTLET DOWN THE PIT AND DARES THE HUNGRY TO FETCH IT. NO ONE HAS CLIMBED BACK UP. TONIGHT, FOUR FOOLS ANSWER. THE GAUNTLET IS DOWN.';
// The stages of the descent, in order. A stage is a floor (generated from its seed), a treasure room, or the banquet.
// Each floor lists its monsters and generators (weights and counts), its features, and its realm.
const REALMS = {
  larder: { name: 'The Larder', wall: { top: '#7a5a40', side: '#4a3420', face: 'plank' }, alt: { top: '#8a6a3a', side: '#5a4020', face: 'plank' }, floor: 'flagstone', ambient: .42 },
  ossuary: { name: 'The Ossuary', wall: { top: '#8a90a8', side: '#4a5068', face: 'stone' }, alt: { top: '#c8c8d8', side: '#8a90a8', face: 'stone' }, floor: 'flagstone', ambient: .36 },
  furnace: { name: 'The Furnace Gut', wall: { top: '#4a3a3a', side: '#2a1e1e', face: 'stone' }, alt: { top: '#6a3a2a', side: '#3a1e14', face: 'stone' }, floor: 'flagstone', ambient: .32 },
  banquet: { name: 'The Banquet', wall: { top: '#6a3a6a', side: '#3a1e3a', face: 'stone' }, alt: { top: '#d0b050', side: '#8a6a20', face: 'stone' }, floor: 'flagstone', ambient: .45 }
};
const STAGES = [
  { kind: 'floor', name: 'The Pantry Steps', realm: 'larder', seed: 1177, cols: 4, rows: 3, par: 120, mon: { ghost: 6, gnasher: 1 }, gen: { urn: 2 }, feat: {} },
  { kind: 'floor', name: 'The Root Cellar', realm: 'larder', seed: 2291, cols: 5, rows: 3, par: 150, mon: { gnasher: 6, ghost: 4 }, gen: { den: 2, urn: 2 }, feat: { transporters: 1, fakes: 1, skip: 4 } },
  { kind: 'floor', name: 'The Smokehouse', realm: 'larder', seed: 3319, cols: 5, rows: 4, par: 170, mon: { lobber: 4, gnasher: 6, ghost: 4 }, gen: { hutch: 2, den: 2, urn: 2 }, feat: { cracked: 3, trapGroups: 1, specials: ['hardshot'], locked: 1 } },
  { kind: 'treasure', name: 'The Pantry Hoard', realm: 'larder', seed: 4451, cols: 2, rows: 2, par: 30, feat: {} },
  { kind: 'floor', name: 'The Bone Larder', realm: 'ossuary', seed: 5501, cols: 5, rows: 4, par: 180, mon: { fryar: 6, gnasher: 4, ghost: 5 }, gen: { shrine: 2, den: 2, urn: 2 }, feat: { transporters: 2, amulets: ['veil', 'ricochet'], stew: 2 } },
  { kind: 'floor', name: 'The Choir of Teeth', realm: 'ossuary', seed: 6607, cols: 5, rows: 4, par: 190, mon: { lobber: 4, fryar: 3, ghost: 6, tithe: 1 }, gen: { hutch: 2, shrine: 2, urn: 2 }, feat: { runes: 4, fields: 3, bell: true, specials: ['witchwater', 'ironbrew'] } },
  { kind: 'floor', name: 'The Crypt of Pickled Kings', realm: 'ossuary', seed: 7717, cols: 5, rows: 4, par: 200, mon: { gnasher: 6, lobber: 3, fryar: 3, ghost: 4, snatcher: 3 }, gen: { sack: 2, hutch: 1, shrine: 1 }, feat: { fakes: 3, trapGroups: 1, specials: ['ogreale'], amulets: ['stench'], crowns: 3, skip: 9 } },
  { kind: 'treasure', name: 'The Reliquary', realm: 'ossuary', seed: 8819, cols: 2, rows: 2, par: 30, feat: { locked: 1, specials: ['deeppockets'] } },
  { kind: 'floor', name: 'The Oven Stair', realm: 'furnace', seed: 9923, cols: 5, rows: 4, par: 210, mon: { imp: 8, gnasher: 6, lobber: 4 }, gen: { grate: 2, den: 2, hutch: 2 }, feat: { spikes: 4, specials: ['featherfoot'], amulets: ['ironskin'], lava: 3 } },
  { kind: 'floor', name: 'The Gristle Gate', realm: 'furnace', seed: 10937, cols: 6, rows: 4, par: 240, mon: { imp: 6, gnasher: 10, lobber: 5, fryar: 4, ghost: 6 }, gen: { grate: 2, den: 2, shrine: 2, hutch: 2 }, feat: { locked: 2, specials: ['quickshot'], amulets: ['rending'] } },
  { kind: 'boss', name: 'The Banquet of King Famish', realm: 'banquet', seed: 11941, par: 300 }
];
const ATTRACT_STAGES = [0, 1, 4, 5, 8, 9];   // the floors the attract mode plays, in order
const STAGE_LABEL = s => s.kind === 'treasure' ? 'TREASURE ROOM ' + (s.name === 'The Pantry Hoard' ? 'I' : 'II') : s.kind === 'boss' ? 'THE BANQUET' : 'FLOOR ' + (STAGES.filter(x => x.kind === 'floor' && STAGES.indexOf(x) <= STAGES.indexOf(s)).length);
const HOW_TO = [
  ['THE GAUNTLET IS DOWN', ['Reach the bottom of the Gaunt', 'and take back the Iron Gauntlet.', 'King Famish is waiting.']],
  ['MOVE AND AIM', ['Move with the left stick, WASD or arrows.', 'Aim with the right stick or the mouse.']],
  ['THROW AND STRIKE', ['Fire throws. At arm\'s length it strikes.', 'Hold Plant to stand your ground and aim.']],
  ['LIFE FORCE DRAINS', ['It drains every second. Roasts, loaves and cider', 'put it back. Never shoot the supper.', 'The green stew is spoiled.']],
  ['MAGIC', ['A flask strikes everything on screen.', 'Shooting a flask wastes most of it.']],
  ['KEYS, DOORS, STAIRS', ['A key opens one run of doors. Stand on the', 'stairs to go down. Everyone goes with you.']],
  ['GENERATORS', ['Urns and dens breed monsters until broken.', 'Wounded monsters shrink.']],
  ['FRIENDS', ['Up to four on one screen: a free controller\'s', 'Start, or 2 on the keyboard, joins.', 'Whoever takes the stairs gets the bonus.']]
];
