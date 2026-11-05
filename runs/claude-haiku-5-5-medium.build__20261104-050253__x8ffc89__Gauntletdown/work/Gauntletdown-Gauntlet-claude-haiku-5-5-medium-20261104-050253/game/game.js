(() => {
'use strict';
// ---- 00-core.js ----
// Gauntletdown: an original Gauntlet-style co-op dungeon crawler on the my-3D2dge engine.
// This file: the engine handle, the game object, the controls, the seeded random streams and the saved records.
const E = My3D2dge;
const SESSION = !!(typeof AIHub !== 'undefined' && AIHub.active);   // an AI Hub round: no title, the round's own card
const T = 16;                                   // one tile, in world units

// The controls: keyboard and mouse as a PC player expects, pads in the standard mapping. Each action's first code is the
// one a prompt shows for that device (Fire: Pad7 before Pad0, so a pad prompt says R2, not confirm's cross).
const GD_INPUT = Object.assign({}, E.Input.DEFAULT, {
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7', 'Pad0'],
  magic: ['Mouse2', 'KeyQ', 'KeyK', 'Pad3', 'Pad5'],
  plant: ['ShiftLeft', 'ShiftRight', 'Pad6', 'Pad4']
});
delete GD_INPUT.attack; delete GD_INPUT.dash; delete GD_INPUT.skill; delete GD_INPUT.jump;

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'],
  input: GD_INPUT, id: 'gauntletdown', bg: '#07060d', menu: false
});

// Seeded streams: gameplay draws from SIM (repeatable runs and tests), cosmetic effects from Math.random.
function stream(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Saved records (E.store): settings the player picked, the high-score table, and the run's own flags.
const STORE = 'gauntletdown.';
const prefs = {
  glyphs: E.store.get(STORE + 'glyphs', 'playstation'),
  difficulty: E.store.get(STORE + 'difficulty', 'normal'),
  aim: E.store.get(STORE + 'aim', 'low'),
  tips: E.store.get(STORE + 'tips', true),
  voices: E.store.get(STORE + 'voices', true),
  cameraView: E.store.get(STORE + 'view', 'threequarter'),
  names: E.store.get(STORE + 'names', true)
};
function savePrefs() { for (const k in prefs) E.store.set(STORE + k, prefs[k]); }
function loadScores() { return E.store.get(STORE + 'scores', []); }
function saveScores(list) { E.store.set(STORE + 'scores', list); }

// Smallest and largest helpers the modules share.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
function angleDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

// ---- 10-data.js ----
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

// ---- 11-lines.js ----
// The narrator's lines for the features added after the first slice: traps, pads, runes, fields, the Tithe, the bell,
// the impatient Gaunt, the treasure rooms, the King, and the specials and amulets (from their own tables).
Object.assign(LINES, {
  tip_trap: 'THAT PLATE WAS A TRAP. ENJOY.',
  tip_tele: 'STEP ON THE RUNE. ARRIVE ELSEWHERE.',
  tip_stun: 'STUN RUNES. DO NOT DAWDLE ON THEM.',
  tip_field: 'THE FIELD HUMS. WAIT FOR THE QUIET.',
  tip_secret: 'THAT WALL WAS LYING.',
  tip_spike: 'THE SPIKES RISE. THEY ALWAYS RISE.',
  tip_imp: 'CINDER IMPS. THEY COOK WHAT THEY SPIT ON.',
  tip_fryar: 'THE FRYARS FADE. STRIKE WHEN THEY SHOW THEMSELVES.',
  tip_lobber: 'POT-LOBBERS THROW OVER WALLS. WATCH THE SHADOWS.',
  stolen: '{CLASS} HAS BEEN ROBBED!',
  tithe_comes: 'THE TITHE HAS COME TO COLLECT.',
  tithe_paid: 'THE TITHE IS PAID.',
  tithe_slain: 'THE TITHE IS CHEATED. MAGIC WINS.',
  bell: '{CLASS} IS ON THE MENU!',
  impatient: 'THE GAUNT GROWS IMPATIENT.',
  doors_open: 'ALL DOORS ARE NOW OPEN.',
  walls_stairs: 'EVERY WALL IS NOW A STAIR.',
  hoard: 'A HOARD! THE GAUNT KEEPS COUNT.',
  hoard_shut: 'THE HOARD SLAMS SHUT.',
  shot_feast: '{CLASS} SHOT THE SUPPER!',
  king_intro: 'AH. DESSERT.',
  king_second: 'SECOND HELPINGS!',
  king_third: 'MORE! MORE! MORE!',
  king_near: 'THE KING SMELLS YOU.',
  king_eating: 'HE IS EATING. SHOOT THE FOOD!',
  king_dead: 'THE GAUNTLET IS DOWN. SO IS THE KING.',
  descent: 'THE GAUNT DIGS DEEPER. SO MUST YOU.',
  realm_ossuary: 'BELOW THE LARDER LIE THE BONES OF THOSE WHO CAME BACK FOR SECONDS.',
  realm_furnace: 'THE GAUNT\'S OWN BELLY. IT IS VERY HOT, AND IT IS DIGESTING.',
  realm_banquet: 'THE TABLE IS SET. GUESS WHO IS DINNER.',
  reliquary: 'THE CROWNS HERE ARE PICKLED.',
  bell_pass: 'NOW {CLASS} IS ON THE MENU.',
  ally_stun_on: 'FROM HERE ON, YOUR SHOTS STUN YOUR FRIENDS.',
  ally_shot: '{CLASS}, THAT WAS A FRIEND.',
  skip: '{CLASS} TOOK THE SHORT WAY DOWN.',
  rise: '{CLASS} RISES AGAIN. HOW TIRESOME.'
});
for (const k in SPECIALS) LINES['special_' + k] = SPECIALS[k].line;
for (const k in AMULETS) LINES['amulet_' + k] = AMULETS[k].line;

// ---- 20-floors.js ----
// Floors. Each stage is a grid of rooms joined by two-tile gaps. Some gaps are iron doors (one key opens a whole run),
// some are trap walls (a plate opens them). Transporter pads pair up, fake walls hide shortcuts, cracked walls hide
// stashes, and runes, force fields, spikes, the Dinner Bell, locked chests, crowns, specials and amulets are placed on
// free tiles. Every floor is generated from its seed and checked by a flood fill: the stairs must be reachable from the
// starts, opening doors with keys and stepping on plates on the way. A failed layout is rejected and the next seed tried.

const ROOM_W = 9, ROOM_H = 6;   // a room's interior, in tiles

function makeFloor(index) {
  const stage = STAGES[index];
  for (let attempt = 0; attempt < 800; attempt++) {
    const f = generateFloor(stage, stage.seed * 1000 + attempt, index);
    if (validateFloor(f)) return f;
  }
  throw new Error('no solvable layout for stage ' + (index + 1));
}

function generateFloor(stage, seed, index) {
  const R = stream(seed), pick = a => a[Math.floor(R() * a.length)];
  const inRange = (a, b) => a + Math.floor(R() * (b - a + 1));
  const feat = stage.feat || {};
  const treasure = stage.kind === 'treasure';
  const cols = stage.cols, rows = stage.rows;
  const W = cols * (ROOM_W + 1) + 1, H = rows * (ROOM_H + 1) + 1;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const room = (c, r) => ({ c, r, x0: c * (ROOM_W + 1) + 1, y0: r * (ROOM_H + 1) + 1, x1: c * (ROOM_W + 1) + ROOM_W, y1: r * (ROOM_H + 1) + ROOM_H });
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const q = room(c, r);
    for (let y = q.y0; y <= q.y1; y++) for (let x = q.x0; x <= q.x1; x++) g[y][x] = '.';
  }
  // links: a random spanning tree, plus a few extra links so there are loops
  const edges = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (c + 1 < cols) edges.push({ a: [c, r], b: [c + 1, r], horiz: true });
    if (r + 1 < rows) edges.push({ a: [c, r], b: [c, r + 1], horiz: false });
  }
  for (let i = edges.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [edges[i], edges[j]] = [edges[j], edges[i]]; }
  const parent = new Map(), find = k => { while (parent.has(k) && parent.get(k) !== k) k = parent.get(k); return k; };
  const links = [];
  for (const e of edges) {
    const ka = e.a.join(), kb = e.b.join(), fa = find(ka), fb = find(kb);
    if (!parent.has(ka)) parent.set(ka, ka); if (!parent.has(kb)) parent.set(kb, kb);
    if (fa !== fb) { parent.set(fa, fb); links.push(e); } else if (R() < .3) links.push(e);
  }
  for (const e of links) {
    const A = room(e.a[0], e.a[1]), B = room(e.b[0], e.b[1]);
    if (e.horiz) { const wx = B.x0 - 1, y = A.y0 + Math.floor(ROOM_H / 2) - 1; e.cells = [[wx, y], [wx, y + 1]]; }
    else { const wy = B.y0 - 1, x = A.x0 + Math.floor(ROOM_W / 2) - 1; e.cells = [[x, wy], [x + 1, wy]]; }
    for (const [x, y] of e.cells) g[y][x] = '.';
  }
  const linkKey = e => e.a.join() + '|' + e.b.join();
  const toStart = e => e.a.join() === '0,0' || e.b.join() === '0,0';
  // key doors and trap walls, on links that are not the way into the start room
  const doorOf = Array.from({ length: H }, () => Array(W).fill(-1));
  const doors = [], traps = [];
  if (!treasure) {
    for (const e of links) {
      if (toStart(e) || R() > .4) continue;
      const id = doors.length; doors.push({ id, cells: e.cells, open: false, plate: null });
      for (const [x, y] of e.cells) { g[y][x] = '+'; doorOf[y][x] = id; }
      e.used = true;
    }
    for (let i = 0; i < (feat.trapGroups || 0); i++) {
      const cand = links.filter(e => !e.used && !toStart(e) && !e.trap);
      if (!cand.length) break;
      const e = pick(cand); e.trap = true; e.used = true;
      const id = doors.length + traps.length; traps.push({ id, cells: e.cells, open: false, trap: true });
      for (const [x, y] of e.cells) { g[y][x] = 'T'; doorOf[y][x] = id; }
    }
  }
  // the stairs: the room farthest from the start by links
  const adj = new Map();
  for (const e of links) {
    const ka = e.a.join(), kb = e.b.join();
    if (!adj.has(ka)) adj.set(ka, []); if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka).push(kb); adj.get(kb).push(ka);
  }
  const dist = new Map([['0,0', 0]]), queue = ['0,0'];
  while (queue.length) { const k = queue.shift(); for (const n of adj.get(k) || []) if (!dist.has(n)) { dist.set(n, dist.get(k) + 1); queue.push(n); } }
  let far = '0,0';
  for (const [k, d] of dist) if (d > dist.get(far)) far = k;
  const [fc, fr] = far.split(',').map(Number), SR = room(fc, fr);
  const stairs = [SR.x0 + Math.floor(ROOM_W / 2), SR.y0 + Math.floor(ROOM_H / 2)];
  g[stairs[1]][stairs[0]] = '.';
  const S0 = room(0, 0);
  const starts = [[S0.x0 + 1, S0.y0 + 1], [S0.x0 + 1, S0.y0 + 2], [S0.x0 + 2, S0.y0 + 1], [S0.x0 + 2, S0.y0 + 2]];
  // fake walls and cracked walls: in wall lines between two rooms that are not linked, so they block nothing
  const wallCells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c + 1 < cols; c++) {
    const A = room(c, r), wx = A.x1 + 1; for (let y = A.y0; y <= A.y1; y++) wallCells.push([wx, y, 'v']);
  }
  for (let c = 0; c < cols; c++) for (let r = 0; r + 1 < rows; r++) {
    const A = room(c, r), wy = A.y1 + 1; for (let x = A.x0; x <= A.x1; x++) wallCells.push([x, wy, 'h']);
  }
  const freeWall = wallCells.filter(([x, y]) => g[y][x] === '#' && x > 0 && y > 0 && x < W - 1 && y < H - 1 && g[y][x - 1] !== '#' && g[y][x + 1] !== '#' && g[y - 1][x] !== '#' && g[y + 1][x] !== '#' && !(linkOn(x, y)));
  function linkOn(x, y) { return links.some(e => e.cells.some(([cx, cy]) => Math.abs(cx - x) <= 1 && Math.abs(cy - y) <= 1)); }
  const fakes = [], cracks = [];
  for (let i = 0; i < (feat.fakes || 0) && freeWall.length; i++) {
    const k = Math.floor(R() * freeWall.length), [x, y] = freeWall.splice(k, 1)[0];
    g[y][x] = '?'; fakes.push([x, y]);
  }
  for (let i = 0; i < (feat.cracked || 0) && freeWall.length; i++) {
    const k = Math.floor(R() * freeWall.length), [x, y] = freeWall.splice(k, 1)[0];
    g[y][x] = 'X'; cracks.push([x, y]);
  }
  // contents: free tiles in rooms away from the start
  const ents = new Map();
  const free = (x, y) => g[y][x] === '.' && !ents.has(x + ',' + y) && !starts.some(s => s[0] === x && s[1] === y) && !(x === stairs[0] && y === stairs[1]);
  const placeIn = (q, ch) => {
    for (let t = 0; t < 40; t++) {
      const x = inRange(q.x0, q.x1), y = inRange(q.y0, q.y1);
      if (free(x, y)) { ents.set(x + ',' + y, ch); return [x, y]; }
    }
    return null;
  };
  const roomsAway = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (c + r > 0 && !(c === fc && r === fr)) roomsAway.push(room(c, r));
  const shuffled = () => roomsAway.slice().sort(() => R() - .5);
  // the boss-free stages: monsters, then generators, each by its weights
  const monKinds = Object.entries(stage.mon || {});
  for (const [kind, n] of monKinds) for (let i = 0; i < n; i++) {
    const ch = Object.keys(MON_OF_CHAR).find(k => MON_OF_CHAR[k] === kind);
    placeIn(pick(roomsAway), ch);
  }
  const genKinds = Object.entries(stage.gen || {});
  const genRooms = shuffled().slice(0, genKinds.reduce((a, [, n]) => a + n, 0));
  let gi = 0;
  for (const [kind, n] of genKinds) for (let i = 0; i < n; i++) {
    const ch = Object.keys(GEN_OF_CHAR).find(k => GEN_OF_CHAR[k] === kind);
    if (genRooms[gi]) placeIn(genRooms[gi], ch);
    gi++;
  }
  // food and treasure in every room away from the start
  const FOOD = treasure ? [['$', .9], ['*', .8], ['h', .4]] : [['f', .4], ['b', .3], ['j', .2], ['z', .05], ['m', .3], ['$', .6], ['*', .3], ['h', .14]];
  for (const q of roomsAway) for (const [ch, p] of FOOD) if (R() < p) placeIn(q, ch);
  if (treasure) for (let i = 0; i < 4; i++) placeIn(pick(roomsAway), 'w');
  for (let i = 0; i < (feat.stew || 0); i++) placeIn(pick(roomsAway), 'z');
  for (let i = 0; i < (feat.crowns || 0); i++) placeIn(pick(roomsAway), 'w');
  // specials and amulets: each in its own room
  for (const s of feat.specials || []) { const ch = placeIn(pick(roomsAway), 'u'); if (ch) ents.set(ch[0] + ',' + ch[1], 'u:' + s); }
  for (const a of feat.amulets || []) { const ch = placeIn(pick(roomsAway), 'a'); if (ch) ents.set(ch[0] + ',' + ch[1], 'a:' + a); }
  // locked chests (a key opens each), and one of them holds a special in the reliquary
  const locked = feat.locked || 0;
  for (let i = 0; i < locked; i++) placeIn(pick(roomsAway), 'l');
  // keys: one for each door and locked chest, plus one spare
  const keyCount = treasure ? 0 : doors.length + locked + 1;
  for (let i = 0; i < keyCount; i++) placeIn(pick(roomsAway), 'k');
  // pads: pairs of transporters
  const pads = feat.transporters || 0;
  for (let i = 0; i < pads * 2; i++) placeIn(pick(roomsAway), 'O');
  // traps: a plate for each trap wall, in a room away from it
  for (const t of traps) placeIn(pick(roomsAway), '^');
  // runes, force fields (a column of three beam tiles), spikes, the bell
  for (let i = 0; i < (feat.runes || 0); i++) placeIn(pick(roomsAway), '!');
  for (let i = 0; i < (feat.fields || 0); i++) {
    const q = pick(roomsAway);
    for (let t = 0; t < 30; t++) {
      const x = inRange(q.x0 + 1, q.x1 - 1), y = inRange(q.y0, q.y1 - 2);
      if (free(x, y) && free(x, y + 1) && free(x, y + 2)) { ents.set(x + ',' + y, '|'); ents.set(x + ',' + (y + 1), '|'); ents.set(x + ',' + (y + 2), '|'); break; }
    }
  }
  for (let i = 0; i < (feat.spikes || 0); i++) placeIn(pick(roomsAway), 's');
  if (feat.bell) placeIn(pick(roomsAway), 'B');
  // skip stairs: down to a later stage (a number is carved on them)
  if (feat.skip !== undefined) { const q = pick(roomsAway); const c = placeIn(q, 'Z'); if (c) ents.set(c[0] + ',' + c[1], 'skip:' + feat.skip); }
  // lava: a two-by-two pool in a corner of some rooms (blocked, and it glows)
  for (let i = 0; i < (feat.lava || 0); i++) {
    const q = pick(roomsAway), x = q.x0 + 1, y = q.y0 + 1;
    if (g[y][x] === '.' && g[y][x + 1] === '.' && g[y + 1][x] === '.' && g[y + 1][x + 1] === '.' && !ents.has(x + ',' + y)) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g[y + dy][x + dx] = '~'; }
  }
  // the treasure rooms and the stairs' room hold no monsters: placed above only in roomsAway
  // the pads: which tile pairs with which (in reading order)
  const padList = [...ents].filter(([, c]) => c === 'O').map(([k]) => k).sort((a, b) => {
    const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return ay - by || ax - bx;
  });
  const padPair = new Map();
  for (let i = 0; i + 1 < padList.length; i += 2) { padPair.set(padList[i], padList[i + 1]); padPair.set(padList[i + 1], padList[i]); }
  return { stage, index, cols, rows, W, H, g, doorOf, doors, traps, ents, starts, stairs, links, fakes, cracks, padPair, treasure, realm: REALMS[stage.realm] };
}

// The flood fill: can the party reach the stairs, opening doors with keys found, stepping on plates, and taking the
// transporter pads? Fake walls are passable (the hero bumps them open); cracked walls are passable (shots open them).
function validateFloor(f) {
  const { g, doorOf, doors, traps, ents, starts, stairs, W, H, padPair } = f;
  const openedDoor = new Set(), openedTrap = new Set(), usedKeys = { n: 0 };
  const keyCells = new Set([...ents].filter(([, c]) => c === 'k').map(([k]) => k));
  const plateCells = new Set([...ents].filter(([, c]) => c === '^').map(([k]) => k));
  for (let round = 0; round < 60; round++) {
    const seen = Array.from({ length: H }, () => Array(W).fill(false));
    const todo = starts.map(s => s.slice());
    for (const [x, y] of todo) seen[y][x] = true;
    const found = new Set();
    while (todo.length) {
      const [x, y] = todo.pop();
      const k = x + ',' + y;
      if (keyCells.has(k)) found.add(k);
      if (padPair.has(k)) { const [px, py] = padPair.get(k).split(',').map(Number); if (!seen[py][px]) { seen[py][px] = true; todo.push([px, py]); } }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny][nx]) continue;
        const ch = g[ny][nx], ent = ents.get(nx + ',' + ny);
        if (ch === '#' || ch === '~' || ent === 'G' || ent === 'N' || ent === 'L' || ent === 'I' || ent === 'F' || ent === 'S') continue;
        if (ch === '+' && !openedDoor.has(doorOf[ny][nx])) continue;
        if (ch === 'T' && !openedTrap.has(doorOf[ny][nx])) continue;
        seen[ny][nx] = true; todo.push([nx, ny]);
      }
    }
    if (seen[stairs[1]][stairs[0]]) return true;
    // plates reached open their trap walls (free)
    let progressed = false;
    for (const t of traps) {
      if (openedTrap.has(t.id)) continue;
      const adjacent = t.cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && seen[ny][nx];
      }));
      if (adjacent) { openedTrap.add(t.id); progressed = true; }
    }
    if (progressed) continue;
    // otherwise a key opens the nearest closed door beside the reached area
    const keys = found.size - usedKeys.n;
    if (keys <= 0) return false;
    let opening = null;
    for (const d of doors) {
      if (openedDoor.has(d.id)) continue;
      if (d.cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && seen[ny][nx];
      }))) { opening = d; break; }
    }
    if (!opening) return false;
    openedDoor.add(opening.id); usedKeys.n++;
  }
  return false;
}

// The floor as the TileMap reads it: '#' walls (fake walls too), '+' key doors, 'T' trap walls, 'X' cracked walls.
function floorRows(f) {
  const rows = [];
  for (let y = 0; y < f.H; y++) {
    let s = '';
    for (let x = 0; x < f.W; x++) {
      const c = f.g[y][x];
      s += c === '+' ? '+' : c === 'T' ? 'T' : c === 'X' ? 'X' : c === '~' ? 'L' : c === '#' || c === '?' ? '#' : '.';
    }
    rows.push(s);
  }
  return rows;
}

// ---- 30-world.js ----
// The world: the stage's state and everything that happens on it, one fixed step at a time. Heroes, their items, specials
// and amulets, doors and trap walls, the pads, the shots, the life-force drain, the continue and the game over. The
// monsters, the hazards and the boss are in their own files and are stepped from here. Drawing reads WORLD; nothing in
// the sim touches the screen.

const WORLD = {
  index: 0, stage: null, F: null, map: null, heroes: [], monsters: [], gens: [], items: [], itemAt: new Map(),
  doors: [], doorsByCell: new Map(), shots: null, foeShots: null, flows: [], crocks: [], fields: [], spikes: [], runes: new Map(),
  pads: new Map(), plates: new Map(), fakes: new Map(), cracks: new Map(), bell: null, bellHero: null, boss: null,
  time: 0, floorClock: 0, over: false, downClock: 0, continueLeft: 0, kills: 0, puffs: [], blasts: [], events: [],
  caption: null, captionT: 0, lastSay: {}, sayAt: -10, descend: null, loop: 0, doorsOpen: false, wallStairs: false,
  titheArrived: false, hoard: null, attract: false, gameOverGone: false, torches: [], shake: 0
};

// The stage's map: the TileMap from the rows, with the realm's wall and floor looks, and the stage's entities set up.
function loadStage(index) {
  const W = WORLD;
  const stage = STAGES[index];
  W.index = index; W.stage = stage; W.time = 0; W.over = false; W.floorClock = 0; W.kills = 0;
  W.puffs = []; W.blasts = []; W.events = []; W.doorsOpen = false; W.wallStairs = false; W.titheArrived = false; W.warned = false;
  W.gameOverGone = false; W.descend = null; W.bell = null; W.bellHero = null; W.crocks = []; W.hoard = null;
  W.gens = []; W.monsters = []; W.items = []; W.itemAt = new Map(); W.doors = []; W.doorsByCell = new Map();
  W.fields = []; W.spikes = []; W.runes = new Map(); W.pads = new Map(); W.plates = new Map(); W.fakes = new Map(); W.cracks = new Map();
  W.flows = []; W.boss = null; W.keyFirst = 0; W.foodFirst = 0; W.skipStairs = []; W.descendTo = null;
  if (stage.kind === 'boss') return loadBoss(index);
  const realm = REALMS[stage.realm];
  const F = makeFloor(index);
  W.F = F;
  W.map = new E.TileMap({
    rows: floorRows(F),
    legend: { '#': 1, '+': 2, T: 4, X: 3, L: 5 },
    types: {
      1: { h: 24, top: realm.wall.top, side: realm.wall.side, cut: true, cutH: 6, face: realm.wall.face },
      2: { h: 24, top: '#6a6a78', side: '#3a3a44', cut: true, cutH: 6, face: 'plank' },
      3: { h: 24, top: '#5a4a3a', side: '#2e241a', cut: true, cutH: 6, face: realm.alt.face },
      4: { h: 24, top: realm.alt.top, side: realm.alt.side, cut: true, cutH: 6, face: 'plank' },
      5: { h: 3, top: '#ff7a20', side: '#a03a10', face: 'stone' }   // lava: low, and it glows
    },
    floorMat: realm.floor
  });
  W.doors = F.doors.concat(F.traps);
  for (const d of W.doors) { d.open = false; for (const [x, y] of d.cells) W.doorsByCell.set(x + ',' + y, d); }
  for (const [x, y] of F.fakes) W.fakes.set(x + ',' + y, { x, y, bump: 0 });
  for (const [x, y] of F.cracks) W.cracks.set(x + ',' + y, 4);
  const fieldCells = new Map();
  for (const [key, raw] of F.ents) {
    // a marker with a value: 'u:type' (a special), 'a:type' (an amulet), 'skip:N' (a skip stair to stage N)
    const colon = raw.indexOf(':'), ch = raw.startsWith('skip:') ? 'Z' : colon > 0 ? raw.slice(0, 1) : raw, sub = colon > 0 ? raw.slice(colon + 1) : null;
    const [x, y] = key.split(',').map(Number), wx = (x + .5) * T, wy = (y + .5) * T;
    if (GEN_OF_CHAR[ch]) {
      const def = GENERATORS[GEN_OF_CHAR[ch]];
      W.gens.push({ kind: GEN_OF_CHAR[ch], def, x: wx, y: wy, r: 7, hp: def.hp * TUNE.generatorHp, max: def.hp * TUNE.generatorHp, timer: def.interval * .5, children: 0, alive: true, flash: 0, shake: 0 });
    } else if (MON_OF_CHAR[ch]) {
      if (ch === 't') continue;   // the Tithe comes on its own schedule
      spawnMonster(MON_OF_CHAR[ch], wx, wy, 0, true);
    } else if (ch === 'B') {
      W.bell = { x: wx, y: wy, r: 7, alive: true, cell: key, rang: false };
    } else if (ch === 'O') {
      const partner = F.padPair.get(key);
      if (partner) { const [px, py] = partner.split(',').map(Number); W.pads.set(key, { x: (px + .5) * T, y: (py + .5) * T, cool: 0 }); }
    } else if (ch === '^') {
      // a plate opens the next trap wall that has none yet
      const trap = F.traps.find(t => !t.plate);
      if (trap) { trap.plate = key; W.plates.set(key, { used: false, group: trap }); }
    } else if (ch === '!') {
      W.runes.set(key, { x: wx, y: wy, cool: 0 });
    } else if (ch === '|') {
      fieldCells.set(key, { x: wx, y: wy });
    } else if (ch === 's') {
      W.spikes.push({ x: wx, y: wy, cell: key, phase: SIM() * 1.6, up: false, hit: false });
    } else if (raw.startsWith('skip:')) {
      W.skipStairs.push({ x: wx, y: wy, cell: key, to: +sub });
    } else if ('kl hwz$*mjbfua'.includes(ch) && ch !== ' ') {
      spawnItemAt(ch === 'u' ? 'u' : ch, wx, wy, ch === 'u' ? sub : null, ch === 'a' ? sub : null);
    }
  }
  // force fields: each run of three beam tiles is one field, on a two second cycle with its own phase
  const seen = new Set();
  for (const [key] of fieldCells) {
    if (seen.has(key)) continue;
    const [x, y] = key.split(',').map(Number);
    const cells = [[x, y], [x, y + 1], [x, y + 2]].map(([cx, cy]) => { seen.add(cx + ',' + cy); return { x: (cx + .5) * T, y: (cy + .5) * T }; });
    W.fields.push({ cells, phase: SIM() * 4, on: false });
  }
  // the treasure room: the hoard clock and the treasure to take
  if (stage.kind === 'treasure') W.hoard = { left: stage.par, total: W.items.filter(i => ['$', '*', 'w', 'h'].includes(i.ch)).length, taken: 0 };
  // the heroes stand on the starts
  let si = 0;
  for (const h of W.heroes) {
    const s = F.starts[si++ % F.starts.length];
    h.body.x = (s[0] + .5) * T; h.body.y = (s[1] + .5) * T; h.body.vx = 0; h.body.vy = 0;
    h.stair = 0; h.queasy = 0; h.cd = .4; h.melee = 0; h.stun = 0; h.bump = 0; h.wallPush = 0; h.bot = null; h.invuln = 1;
    if (h.down) { h.down = false; h.hp = TUNE.startHealth * DIFFICULTY[prefs.difficulty].startHealth; }
  }
  W.shots = new E.Bullets(game, { plane: 'ground', max: 400, sparks: true });
  W.foeShots = new E.Bullets(game, { plane: 'ground', max: 200, sparks: true });
  W.flows = [];
  W.torches = [];
  for (let y = 1; y < F.H - 1; y++) for (let x = 1; x < F.W - 1; x++) {
    if (F.g[y][x] !== '.' || F.ents.has(x + ',' + y)) continue;
    const near = F.g[y - 1][x] === '#' || F.g[y + 1][x] === '#' || F.g[y][x - 1] === '#' || F.g[y][x + 1] === '#';
    if (near && ((x * 73856093 ^ y * 19349663) >>> 0) % 13 === 0) W.torches.push([(x + .5) * T, (y + .5) * T]);
  }
  return F;
}

let SIM_STREAM = stream(20261104);
function SIM() { return SIM_STREAM(); }
function seedSim(n) { SIM_STREAM = stream(n); }

// --- helpers ---
const liveHeroes = () => WORLD.heroes.filter(h => !h.down && h.alive);
function nearestHero(x, y, maxD) {
  let best = null, bd = maxD * maxD;
  for (const h of WORLD.heroes) if (!h.down && h.alive) { const d = (h.body.x - x) ** 2 + (h.body.y - y) ** 2; if (d < bd) { bd = d; best = h; } }
  return best;
}
// The narrator: one line at a time, a tip once per game (per hero class), and a short gap between lines.
function say(key, hero, force) {
  if (!WORLD.heroes.length) return;
  if (key.indexOf('tip_') === 0 && !prefs.tips && !force) return;
  const now = WORLD.time, cls = hero ? hero.cls : null, id = key + (cls || '');
  const tip = key.indexOf('tip_') === 0;
  if (!force && WORLD.lastSay[id] && now - WORLD.lastSay[id] < (tip ? 1e9 : 6)) return;
  if (!force && now - WORLD.sayAt < 1.2) return;
  WORLD.lastSay[id] = now; WORLD.sayAt = now;
  WORLD.caption = line(key, cls); WORLD.captionT = 3.4;
  WORLD.events.push({ type: 'say', key });
  if (SAY_HOOK) SAY_HOOK(WORLD.caption, key);
}
let SAY_HOOK = null;   // the voice: set by the audio file (the Babble)
function damageHero(h, amount, by) {
  if (h.down || !h.alive || CHEATS.god || h.invuln > 0 || WORLD.attract) return;
  if (h.amulet && h.amulet.type === 'ironskin') return;
  const diff = DIFFICULTY[prefs.difficulty];
  const dmg = amount * h.def.armor * diff.monsterDamage * TUNE.monsterDamage * (h.ironbrew ? .8 : 1);
  h.hp -= dmg; h.flash = .25; h.hurt = .3;
  if (h.hp > 0) bark(h, 'OUCH!');
  if (h.hp < 200 && h.hp > 0) say('starving', h);
  if (h.hp <= 0) heroDown(h, by);
}
function heroDown(h, by) {
  h.hp = 0; h.down = true; h.downT = 0; h.stun = 0;
  say('eaten', h, true);
  game.shake(4);
  game.audio.sfx('hurt');
}
function damageMonster(m, amount, h) {
  if (!m.alive || m.kind === 'tithe' || (m.kind === 'fryar' && m.hidden)) return;
  m.hp -= amount; m.flash = .12;
  const newRank = Math.max(1, Math.ceil(m.hp / m.def.base));
  if (newRank < m.rank) { m.rank = newRank; m.shrink = .25; }
  if (m.hp <= 0) killMonster(m, h);
}
function killMonster(m, h) {
  m.alive = false; m.fade = .4; WORLD.kills++;
  if (h) { h.kills++; h.score += m.def.points * m.spawnRank; }
  if (m.gen) m.gen.children = Math.max(0, m.gen.children - 1);
  if (m.loot) spawnItemAt(m.loot.ch, m.x, m.y, m.loot.special, m.loot.amulet);
  game.hitFx(m.x, m.y, 4, { power: .6, sound: 'hit', damage: null });
  WORLD.events.push({ type: 'kill', kind: m.kind });
}
function damageGen(g, amount, h) {
  if (!g.alive) return;
  g.hp -= amount; g.flash = .15; g.shake = .2;
  if (g.hp <= 0) {
    g.alive = false; WORLD.shake = .3; game.shake(6);
    if (h) { h.score += g.def.points; h.gensBroken = (h.gensBroken || 0) + 1; }
    game.audio.sfx('explode', { vol: .6 });
    if (SIM() < .1) spawnItemAt('b', g.x, g.y);
    WORLD.events.push({ type: 'gen', kind: g.kind });
    say('tip_generator', h, false);
  }
}
function spawnItemAt(ch, x, y, special, amulet) {
  const it = { ch, def: ITEMS[ch], x, y, r: 5, alive: true, id: WORLD.items.length, bob: SIM() * 6, special: special || null, amulet: amulet || null, cell: Math.floor(x / T) + ',' + Math.floor(y / T) };
  WORLD.items.push(it); WORLD.itemAt.set(it.cell, it);
  return it;
}
function removeItem(it) {
  it.alive = false;
  if (WORLD.itemAt.get(it.cell) === it) WORLD.itemAt.delete(it.cell);
}

// --- shots ---
// A hero's shot: its kind decides the look; hexers splash, berserkers pierce, rending pierces everything, ricochet bounces.
function fireShot(h, aim) {
  const d = h.def, speed = d.shotSpeed * (h.quick ? 1.2 : 1), life = 220 / speed;
  const dmg = d.shotDmg * TUNE.shotDamage + (h.hardshot ? 1 : 0) + (h.rending ? 1 : 0);
  const c = Math.cos(aim), s = Math.sin(aim);
  WORLD.shots.fire({ x: h.body.x + c * 8, y: h.body.y + s * 8, z: 12, vx: c * speed, vy: s * speed, vz: 0, r: 3, dmg,
    life, team: 'hero', color: d.color, core: '#ffffff', pierce: !!(d.pierce || h.rending), data: { owner: h, kind: d.shot, bounces: h.ricochet ? 3 : 0 } });
  h.cd = d.cooldown / (TUNE.shotRate * (h.quick ? .75 : 1));
  h.throwT = .3;
  game.audio.sfx('hit', { vol: .2, pitch: d.shot === 'arrow' ? 1.6 : .8 });
}

// Smart melee: a non-ghost monster inside reach and roughly in front swings the hero's melee instead of a throw.
function meleeTarget(h, aim) {
  const reach = h.def.reach;
  let best = null, bd = Infinity;
  for (const m of WORLD.monsters) {
    if (!m.alive || m.kind === 'ghost' || m.kind === 'tithe' || (m.kind === 'fryar' && m.hidden)) continue;
    const dx = m.x - h.body.x, dy = m.y - h.body.y, d = Math.hypot(dx, dy);
    if (d > reach + m.r + 8) continue;
    if (Math.abs(angleDiff(aim, Math.atan2(dy, dx))) > .87) continue;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function doMelee(h, aim) {
  h.melee = .42; h.meleeAim = aim; h.cd = .4;
  game.audio.sfx('hit', { vol: .3, pitch: .6 });
  const reach = h.def.reach + 8, dmg = h.def.melee * TUNE.shotDamage * (h.ogre ? 1.5 : 1);
  for (const m of WORLD.monsters) {
    if (!m.alive) continue;
    const dx = m.x - h.body.x, dy = m.y - h.body.y, d = Math.hypot(dx, dy);
    if (d > reach + m.r) continue;
    if (Math.abs(angleDiff(aim, Math.atan2(dy, dx))) > 1.2) continue;
    damageMonster(m, dmg, h);
    game.hitFx(m.x, m.y, 6, { power: .8, angle: Math.atan2(dy, dx), damage: null, sound: 'hit' });
  }
  for (const g of WORLD.gens) {
    if (!g.alive) continue;
    const dx = g.x - h.body.x, dy = g.y - h.body.y, d = Math.hypot(dx, dy);
    if (d <= reach + g.r && Math.abs(angleDiff(aim, Math.atan2(dy, dx))) <= 1.2) damageGen(g, dmg, h);
  }
  for (const key of [...WORLD.cracks.keys()]) {
    const [cx, cy] = key.split(',').map(Number), dx = (cx + .5) * T - h.body.x, dy = (cy + .5) * T - h.body.y, d = Math.hypot(dx, dy);
    if (d <= reach + 8 && Math.abs(angleDiff(aim, Math.atan2(dy, dx))) <= 1.2) crackWall(key);
  }
}
function crackWall(key) {
  const hp = (WORLD.cracks.get(key) || 0) - 1;
  if (hp <= 0) {
    WORLD.cracks.delete(key);
    const [cx, cy] = key.split(',').map(Number);
    WORLD.map.set(cx, cy, 0); WORLD.map.version = (WORLD.map.version || 0) + 1;
    game.audio.sfx('explode', { vol: .4, pitch: 1.6 });
    game.shake(4);
    if (SIM() < .5) spawnItemAt('b', (cx + .5) * T, (cy + .5) * T);
    say('tip_secret', null, false);
  } else WORLD.cracks.set(key, hp);
}

// Magic: a flask strikes every monster and generator on the user's screen (a rectangle about the hero). The Tithe dies
// to it, and so does nothing else that is immune to shots.
function useMagic(h) {
  if (h.flasks <= 0 && !CHEATS.infinite) return false;
  if (!CHEATS.infinite) h.flasks--;
  const power = TUNE.magicPower * h.def.magic * (h.witchwater ? 1.5 : 1), rad = 180;
  let n = 0;
  for (const m of WORLD.monsters) {
    if (!m.alive || Math.abs(m.x - h.body.x) > rad || Math.abs(m.y - h.body.y) > rad * .8) continue;
    n++;
    if (m.kind === 'tithe') { killTithe(m, h); continue; }
    if (m.kind === 'fryar') m.hidden = false;
    damageMonster(m, Math.ceil(4 * power), h);
  }
  for (const g of WORLD.gens) if (g.alive && Math.abs(g.x - h.body.x) < rad && Math.abs(g.y - h.body.y) < rad * .8) damageGen(g, Math.ceil(2 * h.def.magicGen * TUNE.magicPower), h);
  if (WORLD.boss && WORLD.boss.alive && Math.abs(WORLD.boss.x - h.body.x) < rad && Math.abs(WORLD.boss.y - h.body.y) < rad * .8) bossFlask(h);
  game.flash('#ffffff', .18, .9); game.shake(8); game.audio.sfx('boom', { vol: .6 });
  WORLD.blasts.push({ x: h.body.x, y: h.body.y, t: 0, color: h.color });
  say('tip_magic', h);
  return n;
}
function killTithe(m, h) {
  m.alive = false; m.fade = .4; WORLD.kills++;
  if (h) { h.kills++; h.score += 1000 * (1 + Math.floor(SIM() * 5)); }
  say('tithe_slain', h, true);
  game.hitFx(m.x, m.y, 8, { power: 1, damage: null, sound: 'explode' });
}

// Items under a hero: food, keys, flasks, treasure, locked chests, specials, amulets and the Gauntlet.
function pickupItems(h) {
  const cx = Math.floor(h.body.x / T), cy = Math.floor(h.body.y / T);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const it = WORLD.itemAt.get((cx + dx) + ',' + (cy + dy));
    if (!it || !it.alive) continue;
    if (Math.hypot(it.x - h.body.x, it.y - h.body.y) > 9) continue;
    const d = it.def;
    if (d.key) { if (h.keys >= 9) continue; h.keys++; if (!WORLD.keyFirst) { WORLD.keyFirst = 1; say('key_first', h); } }
    else if (d.flask) { if (h.flasks >= (h.deepPockets ? 12 : 9)) continue; h.flasks++; }
    else if (d.lock) {
      if (h.keys <= 0 && !CHEATS.infinite) continue;
      if (!CHEATS.infinite) h.keys--;
      spawnItemAt(['m', 'f', 'k'][Math.floor(SIM() * 3)], it.x, it.y);
    }
    else if (it.special) {
      if (h.specials.includes(it.special)) continue;
      h.specials.push(it.special);
      applySpecial(h, it.special);
    }
    else if (it.amulet) applyAmulet(h, it.amulet);
    else if (d.gauntlet) { h.gauntlet = true; WORLD.events.push({ type: 'gauntlet', by: h }); }
    if (d.heal > 0) { h.hp += d.heal * TUNE.foodHeal; h.eaten = (h.eaten || 0) + 1; h.foodScore = (h.foodScore || 0) + d.heal; game.audio.sfx('coin', { pitch: .7, vol: .3 }); }
    if (d.queasy) { h.queasy = d.queasy; h.hp += d.heal * TUNE.foodHeal; say('ate_stew', h); }
    if (d.points && !d.lock) h.score += d.points;
    if (['w', 'h', '*', '$'].includes(it.ch) && WORLD.hoard) { WORLD.hoard.taken++; if (WORLD.hoard.taken >= WORLD.hoard.total && WORLD.hoard.total > 0) { h.score += 2000; WORLD.hoard.total = -1; say('hoard', h, true); } }
    if (it.ch === 'h') { game.audio.sfx('powerup'); say('treasure_first', h); }
    if (it.ch === 'f' || it.ch === 'b') { if (!WORLD.foodFirst) { WORLD.foodFirst = 1; say('tip_food', h); } }
    if (it.ch === 'k') game.audio.sfx('powerup', { pitch: 1.4, vol: .4 });
    removeItem(it);
    WORLD.events.push({ type: 'pickup', ch: it.ch });
  }
}
function applySpecial(h, type) {
  const flag = { ironbrew: 'ironbrew', ogreale: 'ogre', quickshot: 'quick', hardshot: 'hardshot', witchwater: 'witchwater', featherfoot: 'swift', deeppockets: 'deepPockets' }[type];
  h[flag] = true;
  say('special_' + type, h, true);
  game.audio.sfx('powerup');
}
function applyAmulet(h, type) {
  h.amulet = { type, t: AMULETS[type].secs };
  h.ricochet = type === 'ricochet';
  h.rending = type === 'rending';
  say('amulet_' + type, h, true);
  game.audio.sfx('powerup', { pitch: 1.2 });
}

// Doors: a hero with a key next to a closed door opens its whole run, and one key is used.
function openDoors(h) {
  if (h.keys <= 0 && !CHEATS.infinite && !WORLD.doorsOpen) return;
  const cx = Math.floor(h.body.x / T), cy = Math.floor(h.body.y / T);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const d = WORLD.doorsByCell.get((cx + dx) + ',' + (cy + dy));
    if (!d || d.open || d.plate !== null && d.plate !== undefined) continue;
    if (!d.cells.some(([x, y]) => x === cx + dx && y === cy + dy) || d.trap) continue;
    if (!CHEATS.infinite && !WORLD.doorsOpen) { if (h.keys <= 0) continue; h.keys--; }
    openDoorGroup(d);
    say('tip_door', h);
  }
}
function openDoorGroup(d) {
  d.open = true;
  for (const [x, y] of d.cells) WORLD.map.set(x, y, 0);
  WORLD.map.version = (WORLD.map.version || 0) + 1;
  game.audio.sfx('hit', { vol: .4, pitch: .5 });
  WORLD.events.push({ type: 'door' });
}

// Step everything on the stage by dt. `intents` is an array of { hero, intent } from the controllers.
function stepWorld(dt, intents) {
  const W = WORLD, map = W.map;
  if (!map || W.over) return;
  W.time += dt; W.floorClock += dt;
  W.blasts = W.blasts.filter(b => (b.t += dt) < .6);
  if (W.caption && (W.captionT -= dt) <= 0) W.caption = null;
  W.shake = Math.max(0, W.shake - dt);
  // the impatient Gaunt: at 2:30 a warning, at 3:00 the doors open, at 4:00 every wall is a way down
  if (W.stage.kind === 'floor') {
    if (!W.warned && W.floorClock > 150) { W.warned = true; say('impatient', null, true); }
    if (!W.doorsOpen && W.floorClock > 180) { W.doorsOpen = true; for (const d of W.doors) if (!d.open && !d.trap) openDoorGroup(d); say('doors_open', null, true); }
    if (!W.wallStairs && W.floorClock > 240) { W.wallStairs = true; say('walls_stairs', null, true); }
    // from floor five on, the Tithe comes at two minutes if none is on the floor
    if (!W.titheArrived && W.index >= 4 && !W.monsters.some(m => m.kind === 'tithe' && m.alive) && W.floorClock > 120) {
      W.titheArrived = true; say('tithe_comes', null, true); spawnMonster('tithe', (W.F.stairs[0] + .5) * T, (W.F.stairs[1] + .5) * T, 1, true);
    }
  }
  // the hoard clock (the treasure rooms)
  if (W.hoard && W.hoard.left > 0) {
    W.hoard.left -= dt;
    if (W.hoard.left <= 0) { W.hoard.left = 0; say('hoard_shut', null, true); W.descend = liveHeroes()[0] || W.heroes[0]; }
  }
  const alive = liveHeroes();
  // heroes
  for (const h of W.heroes) {
    h.cd = Math.max(0, h.cd - dt); h.melee = Math.max(0, h.melee - dt); h.invuln = Math.max(0, h.invuln - dt);
    h.flash = Math.max(0, h.flash - dt); h.hurt = Math.max(0, h.hurt - dt); h.throwT = Math.max(0, h.throwT - dt);
    h.queasy = Math.max(0, h.queasy - dt); h.stun = Math.max(0, h.stun - dt); h.rune = Math.max(0, h.rune - dt);
    if (h.amulet) { h.amulet.t -= dt; if (h.amulet.t <= 0) { h.amulet = null; h.ricochet = false; h.rending = false; } }
    if (h.down) { h.downT += dt; continue; }
    if (!h.alive) continue;
    const I = intents.find(x => x.hero === h);
    const it = I ? I.intent : { move: [0, 0] };
    const diff = DIFFICULTY[prefs.difficulty];
    const speed = h.def.speed * TUNE.heroSpeed * (h.queasy > 0 ? .6 : 1) * (h.swift ? 1.12 : 1);
    let mx = it.move[0], my = it.move[1];
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    if (it.plant || h.stun > 0) { mx = 0; my = 0; }
    h.body.vx = mx * speed; h.body.vy = my * speed;
    h.body.update(dt, map);
    if (l > .2 && !it.plant && h.stun <= 0) h.facing = Math.atan2(my, mx);
    const aim = it.aim != null ? it.aim : h.facing;
    if (it.aim != null) h.facing = it.aim;
    h.moved = Math.hypot(h.body.vx, h.body.vy);
    if (h.stun <= 0 && it.fire && h.cd <= 0) {
      if (meleeTarget(h, aim)) doMelee(h, aim);
      else fireShot(h, aim);
    }
    if (h.stun <= 0 && it.magic) useMagic(h);
    // life force
    if (!CHEATS.god && !W.attract) h.hp -= TUNE.drain * diff.drain * dt * (h.ironbrew ? .8 : 1) * (W.loop ? 1.5 : 1);
    if (h.hp < 400 && h.hp > 0) say('fading', h);
    if (h.hp <= 0) heroDown(h, null);
    pickupItems(h);
    openDoors(h);
    const hx = Math.floor(h.body.x / T), hy = Math.floor(h.body.y / T), k = hx + ',' + hy;
    // a fake wall: pushing into it for half a second reveals it
    if (h.body.hitWall && mx * mx + my * my > .01) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const fk = (hx + dx) + ',' + (hy + dy), f = W.fakes.get(fk);
        if (f) { f.bump += dt; if (f.bump > .5) { W.fakes.delete(fk); map.set(f.x, f.y, 0); map.version = (map.version || 0) + 1; say('tip_secret', h); } }
      }
      // with the impatient Gaunt, pushing into any wall for a second is a way down
      if (W.wallStairs) { h.wallPush += dt; if (h.wallPush > 1) W.descend = h; }
    } else h.wallPush = 0;
    // the stairs: stand on them for the hold and everyone goes down (the treasure rooms end on their clock instead);
    // a skip stair goes down to a later stage
    h.onStairs = W.F && hx === W.F.stairs[0] && hy === W.F.stairs[1];
    const skip = W.skipStairs.find(s => Math.floor(s.x / T) === hx && Math.floor(s.y / T) === hy);
    if (skip) { h.stair = Math.min(TUNE.stairHold, h.stair + dt); if (h.stair >= TUNE.stairHold) { W.descend = h; W.descendTo = skip.to; say('skip', h, true); } }
    else if (h.onStairs && W.stage.kind !== 'treasure') { h.stair = Math.min(TUNE.stairHold * diff.drain, h.stair + dt); if (h.stair >= TUNE.stairHold) W.descend = h; }
    else h.stair = 0;
    // a transporter pad sends the hero to its partner
    const pad = W.pads.get(k);
    if (pad && pad.cool <= 0) {
      const other = W.pads.get(W.F.padPair.get(k));
      if (other) { h.body.x = other.x; h.body.y = other.y; other.cool = .6; pad.cool = .6; h.invuln = .5; say('tip_tele', h); game.audio.sfx('powerup', { pitch: .6 }); }
    }
    // a plate opens its trap wall
    const plate = W.plates.get(k);
    if (plate && !plate.used) {
      plate.used = true; plate.group.open = true;
      for (const [x, y] of plate.group.cells) map.set(x, y, 0);
      map.version = (map.version || 0) + 1; game.shake(3); game.audio.sfx('explode', { vol: .4, pitch: .5 }); say('tip_trap', h);
    }
    // a stun rune: stunned for 0.8 s, then immune for a while
    const rune = W.runes.get(k);
    if (rune && rune.cool <= 0 && h.rune <= 0) { h.stun = .8; h.rune = 2.3; rune.cool = 2.3; say('tip_stun', h); game.audio.sfx('zap', { vol: .4 }); }
  }
  for (const r of W.runes.values()) r.cool = Math.max(0, r.cool - dt);
  for (const p of W.pads.values()) p.cool = Math.max(0, p.cool - dt);
  // a fallen hero rises when a player presses fire near it
  const pressing = intents.filter(x => x.hero.input && x.intent.fire && !x.hero.down).map(x => x.hero);
  for (const h of W.heroes) if (h.down && pressing.some(p => Math.hypot(p.body.x - h.body.x, p.body.y - h.body.y) < 26)) rise(h);
  // all down: the continue countdown; fire (any player) rises everybody, else game over
  if (alive.length === 0 && W.heroes.length) {
    W.downClock += dt;
    W.continueLeft = Math.max(0, 10 - W.downClock);
    const anyFire = intents.some(x => x.hero.input && x.intent.fire);
    if (anyFire && W.downClock > .4) { for (const h of W.heroes) rise(h, true); W.downClock = 0; }
    else if (W.continueLeft <= 0) W.over = true;
  } else W.downClock = 0;
  // the stage's own parts
  stepFeatures(dt);
  stepMonsters(dt);
  stepGenerators(dt);
  stepShots(dt);
  if (W.boss) stepBoss(dt);
  W.puffs = W.puffs.filter(p => (p.t += dt) < p.life);
}

function rise(h, all) {
  if (!h.down && !all) return;
  h.down = false; h.hp = TUNE.startHealth * DIFFICULTY[prefs.difficulty].startHealth; h.invuln = 1.2; h.downT = 0;
  if (!all) h.continues = (h.continues || 0) + 1;
  say('rise', h, true);
  game.audio.sfx('powerup', { vol: .5 });
}

// Creates a hero for a run: one per joined player, with their class.
function makeHero(index, cls, input) {
  const def = HEROES[cls];
  const body = new E.Body({ x: 0, y: 0, r: 5 });
  body.gravity = 0; body.friction = 0;
  const diff = DIFFICULTY[prefs.difficulty];
  return {
    i: index, cls, def, input, body, rig: def.rig(), name: input && input.name || ('P' + (index + 1)),
    color: def.color, hp: TUNE.startHealth * diff.startHealth, score: 0, keys: 0, flasks: 0, kills: 0, treasure: 0,
    down: false, alive: true, cd: 0, melee: 0, throwT: 0, flash: 0, hurt: 0, invuln: 0, facing: 0, stair: 0,
    queasy: 0, stun: 0, rune: 0, continues: 0, foodScore: 0, eaten: 0, gensBroken: 0, specials: [], amulet: null,
    quick: false, hardshot: false, ironbrew: false, swift: false, ogre: false, witchwater: false, rending: false,
    ricochet: false, deepPockets: false, downT: 0, onStairs: false, bump: 0, wallPush: 0, bot: null
  };
}

// The descent's bonus for the hero on the stairs: five points for each second under the stage's par.
function stairBonus(h) {
  const par = WORLD.stage.par || 120, left = Math.max(0, par - WORLD.floorClock);
  return 500 + Math.floor(left * 5);
}

// ---- 31-monsters.js ----
// Monsters, generators and the shots. Every monster follows the flow field of its nearest target (a hero, or the hero
// the Dinner Bell marked); a monster far from every hero waits. The kinds: hungerghosts touch and drain, gnashers swing
// clubs, pot-lobbers keep their distance and lob crocks over walls, cinder imps spit fireballs with sight, fryars hide
// and strike, snatchers steal an item and run, and the Tithe drains health and only magic can kill it.

function spawnMonster(kind, x, y, rank, placed, gen) {
  const def = MONSTERS[kind];
  const m = {
    kind, def, x, y, r: 6, rank: rank || 1, spawnRank: rank || 1, hp: def.base * (rank || 1), alive: true,
    cd: .3 + SIM() * .3, wind: 0, flash: 0, shrink: 0, gen: gen || null, bob: SIM() * 6, fade: 0, age: 0,
    body: new E.Body({ x, y, r: 6 }), hidden: false, visT: 2 + SIM(), fleeT: 0, loot: null, facing: 0
  };
  m.body.gravity = 0; m.body.friction = 0;
  m.id = WORLD.mid = (WORLD.mid || 0) + 1;   // a stable id, for the snapshots of a shared world
  if (placed) m.rank = 1 + (SIM() < .3 ? 1 : 0) + (WORLD.stage && WORLD.stage.rank > 1 && SIM() < .25 ? 1 : 0);
  if (WORLD.loop) m.rank = Math.min(3, m.rank + 1);   // Descent II: every rank up
  if (kind === 'tithe') { m.rank = 1; m.hp = 1; }
  m.hp = def.base * m.rank; m.spawnRank = m.rank;
  if (!placed && gen) gen.children++;
  if (m.rank > 3) m.rank = 3;
  WORLD.monsters.push(m);
  return m;
}

// The target a monster follows: the bell's hero while the bell rings, else the nearest hero (veiled heroes are
// ignored unless adjacent). Stench heroes make the monsters near them flee.
function pickTarget(m) {
  if (WORLD.bellHero && WORLD.bellT > 0 && !WORLD.bellHero.down) return WORLD.bellHero;
  let best = null, bd = Infinity;
  for (const h of WORLD.heroes) {
    if (h.down || !h.alive) continue;
    const d = Math.hypot(h.body.x - m.x, h.body.y - m.y);
    if (h.amulet && h.amulet.type === 'veil' && d > 40) continue;
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}
function stenchHero(m) {
  for (const h of WORLD.heroes) if (!h.down && h.amulet && h.amulet.type === 'stench' && Math.hypot(h.body.x - m.x, h.body.y - m.y) < 64) return h;
  return null;
}

function stepMonsters(dt) {
  const W = WORLD, map = W.map;
  if (W.bellT > 0) W.bellT -= dt;
  if (W.bellT <= 0 && W.bellHero) W.bellHero = null;
  // the bell: a hero touching it rings it, and every monster takes that hero for twelve seconds
  if (W.bell && W.bell.alive) {
    const h = nearestHero(W.bell.x, W.bell.y, 10);
    if (h) { W.bell.alive = false; W.bellHero = h; W.bellT = 12; say('bell', h, true); game.audio.sfx('powerup', { pitch: .5 }); }
  }
  const monsterSpeedMul = TUNE.monsterSpeed * (CHEATS.freeze ? 0 : 1);
  const mdiff = DIFFICULTY[prefs.difficulty].monsterDamage * TUNE.monsterDamage;
  for (const m of W.monsters) {
    if (!m.alive) { m.fade -= dt; continue; }
    m.age += dt; m.bob += dt * 6; m.flash = Math.max(0, m.flash - dt); m.shrink = Math.max(0, m.shrink - dt);
    m.cd = Math.max(0, m.cd - dt); m.fleeT = Math.max(0, m.fleeT - dt);
    const target = pickTarget(m);
    if (!target) { m.body.vx = 0; m.body.vy = 0; continue; }
    const bd = Math.hypot(target.body.x - m.x, target.body.y - m.y);
    if (bd > 320 && !m.loot) { m.body.vx = 0; m.body.vy = 0; continue; }
    const hi = W.heroes.indexOf(target);
    if (!W.flows[hi]) W.flows[hi] = new E.FlowField(map);
    W.flows[hi].update(target.body.x, target.body.y);
    const toward = () => W.flows[hi].dir(m.x, m.y, target.body.x, target.body.y);
    const away = () => { const d = toward(); return [-d[0], -d[1]]; };
    let spd = m.def.speed[m.rank - 1] * monsterSpeedMul, dir = toward();
    const st = stenchHero(m);
    if (st) { dir = [m.x - st.body.x, m.y - st.body.y]; const l = Math.hypot(dir[0], dir[1]) || 1; dir = [dir[0] / l, dir[1] / l]; spd *= 1.2; }
    switch (m.def.ai) {
      case 'club': {
        if (m.wind > 0) { m.wind -= dt; spd = 0; if (m.wind <= 0 && bd < m.def.reach + target.body.r + 4) { damageHero(target, m.def.damage[m.rank - 1] * mdiff, m); m.cd = m.def.cooldown; } }
        else if (m.cd <= 0 && bd < m.def.reach + target.body.r + 4) { m.wind = .32; spd = 0; }
        break;
      }
      case 'chase': {
        if (m.kind === 'ghost' && bd < m.def.reach + target.body.r + 3 && m.cd <= 0) { damageHero(target, m.def.damage[m.rank - 1] * mdiff, m); m.cd = m.def.cooldown; m.bob += 1; game.audio.sfx('hurt', { vol: .15, pitch: 2 }); }
        break;
      }
      case 'lob': {
        if (bd < 56) { dir = away(); spd *= 1.1; m.fleeT = .5; }
        else if (bd < 110) spd = 0;
        if (m.cd <= 0 && bd < 200) {
          m.cd = m.def.cooldown * (m.rank === 3 ? .75 : 1);
          const lead = .8, tx = target.body.x + (target.body.vx || 0) * lead, ty = target.body.y + (target.body.vy || 0) * lead;
          W.crocks.push({ sx: m.x, sy: m.y, tx, ty, t: 0, dur: .8, dmg: m.def.damage[m.rank - 1] * mdiff, shadow: true });
          say('tip_lobber', target);
        }
        break;
      }
      case 'imp': {
        if (bd < 60) spd = 0;
        if (m.cd <= 0 && bd < 240 && map.sight({ x: m.x, y: m.y, z: 12 }, { x: target.body.x, y: target.body.y, z: 12 })) {
          m.cd = 1.8; m.wind = .35;
          const d = Math.hypot(target.body.x - m.x, target.body.y - m.y) || 1, sp = 110;
          W.foeShots.fire({ x: m.x, y: m.y, z: 12, vx: (target.body.x - m.x) / d * sp, vy: (target.body.y - m.y) / d * sp, vz: 0, r: 3, dmg: m.def.damage[m.rank - 1] * mdiff, life: 2.2, team: 'foe', color: '#ff8040', core: '#ffe0a0', data: { owner: m } });
          game.audio.sfx('hit', { vol: .2, pitch: 1.8 });
          say('tip_imp', target);
        }
        if (m.wind > 0) m.wind -= dt;
        break;
      }
      case 'fryar': {
        m.visT -= dt;
        if (m.visT <= 0) { m.hidden = !m.hidden; m.visT = m.hidden ? 1.4 : 2.0; }
        if (!m.hidden && m.wind > 0) { m.wind -= dt; spd = 0; if (m.wind <= 0 && bd < m.def.reach + target.body.r + 4) { damageHero(target, m.def.damage[m.rank - 1] * mdiff, m); m.cd = m.def.cooldown; } }
        else if (!m.hidden && m.cd <= 0 && bd < m.def.reach + target.body.r + 4) m.wind = .3;
        break;
      }
      case 'snatch': {
        if (!m.loot) {
          if (bd < m.def.reach + target.body.r) {
            // the snatch: a flask, else a key, else the active amulet
            let loot = null;
            if (target.flasks > 0) { target.flasks--; loot = { ch: 'm' }; }
            else if (target.keys > 0) { target.keys--; loot = { ch: 'k' }; }
            else if (target.amulet) { loot = { ch: 'a', amulet: target.amulet.type }; target.amulet = null; }
            if (loot) { m.loot = loot; m.fleeT = 20; say('tip_snatcher', target); say('stolen', target, true); game.audio.sfx('hurt', { pitch: 2 }); }
          }
        } else {
          // running with the loot: away from the hero, to the far side of the floor; it escapes after twenty seconds
          dir = away(); spd = m.def.speed[0];
          if (m.fleeT <= 0) { m.alive = false; m.fade = .3; m.loot = null; say('stolen', null, true); }
        }
        break;
      }
      case 'tithe': {
        if (bd < m.def.reach + target.body.r + 2) {
          m.drainT = (m.drainT || 0) - dt;
          if (m.drainT <= 0) {
            m.drainT = .1;
            target.titheDrain = (target.titheDrain || 0) + 6;
            if (!(target.amulet && target.amulet.type === 'ironskin') && !CHEATS.god) target.hp -= 6;
            target.hurt = .2;
            if (target.titheDrain >= 200) {
              m.alive = false; m.fade = .4; say('tithe_paid', null, true);
              game.hitFx(m.x, m.y, 6, { power: .8, damage: null, sound: 'explode' });
            }
          }
          spd = 0;
        }
        break;
      }
    }
    // move: the monster's own speed along its direction (waits while winding up or hidden in a stance)
    if (m.wind > 0 && m.def.ai !== 'imp' && m.def.ai !== 'lob') spd = 0;
    m.body.vx = dir[0] * spd; m.body.vy = dir[1] * spd;
    m.body.update(dt, map);
    m.x = m.body.x; m.y = m.body.y;
    if (m.def.ai === 'chase' || m.def.ai === 'club' || m.def.ai === 'fryar') m.facing = Math.atan2(dir[1], dir[0]);
    // the nearest monsters say their line once, for the tips
    if (m.kind === 'ghost' && bd < 60 && !W.said_ghost) { W.said_ghost = true; say('tip_ghost', target); }
    if (m.kind === 'gnasher' && bd < 90 && !W.said_gnasher) { W.said_gnasher = true; say('tip_gnasher', target); }
    if (m.kind === 'snatcher' && bd < 120 && !W.said_snatch) { W.said_snatch = true; say('tip_snatcher', target); }
  }
  // soft separation between monsters and from generators
  const ms = W.monsters.filter(m => m.alive);
  for (let i = 0; i < ms.length; i++) {
    const a = ms[i];
    for (let j = i + 1; j < ms.length; j++) {
      const b = ms[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, R = 9;
      if (d2 < R * R && d2 > .0001) { const d = Math.sqrt(d2), push = (R - d) * .5 / d; a.body.x -= dx * push; a.body.y -= dy * push; b.body.x += dx * push; b.body.y += dy * push; }
    }
    for (const g of W.gens) if (g.alive) { const dx = a.x - g.x, dy = a.y - g.y, d = Math.hypot(dx, dy); if (d < g.r + 5 && d > .01) { const p = (g.r + 5 - d) / d; a.body.x += dx * p; a.body.y += dy * p; } }
    a.x = a.body.x; a.y = a.body.y;
  }
  W.monsters = W.monsters.filter(m => m.alive || m.fade > -.5);
}

// Generators: each spawns its monsters while a hero is near, up to its own cap and the floor's cap.
function stepGenerators(dt) {
  const W = WORLD, map = W.map;
  for (const g of W.gens) {
    if (!g.alive) continue;
    g.flash = Math.max(0, g.flash - dt); g.shake = Math.max(0, g.shake - dt);
    const near = nearestHero(g.x, g.y, 120);
    if (!near || CHEATS.noGen) continue;
    g.timer -= dt * TUNE.spawnInterval / (1 + .25 * (W.heroes.length - 1));
    if (g.timer <= 0) {
      g.timer = g.def.interval;
      const live = W.monsters.filter(m => m.alive).length;
      if (g.children < g.def.cap && live < TUNE.maxMonsters) {
        const a = SIM() * Math.PI * 2, x = g.x + Math.cos(a) * 12, y = g.y + Math.sin(a) * 12;
        if (!map.solidAt(x, y)) {
          spawnMonster(g.def.spawn, x, y, g.hp / g.max > .66 ? 3 : g.hp / g.max > .33 ? 2 : 1, false, g);
          game.audio.sfx('hit', { vol: .15, pitch: 2.1 });
        }
      }
    }
  }
}

// The shots: the heroes' shots hit monsters, generators, shootable food and cracked walls (and ricochet off walls);
// the monsters' fireballs and the lobbed crocks hit the heroes.
function stepShots(dt) {
  const W = WORLD, map = W.map;
  // remember where each shot was, so a shot that dies on a wall can be read
  const before = W.shots.list.slice();
  for (const b of before) { b._px = b.x; b._py = b.y; }
  W.shots.update(dt, map);
  const after = new Set(W.shots.list);
  for (const b of before) {
    if (after.has(b)) continue;
    // it died on a wall: a cracked wall next to it breaks; a ricochet bounces off the wall it hit
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
      const cx = Math.floor((b._px + dx * T * .6) / T), cy = Math.floor((b._py + dy * T * .6) / T), key = cx + ',' + cy;
      if (W.cracks.has(key)) crackWall(key);
    }
    if (b.data && b.data.bounces > 0) {
      const sx = map.solidAt(b._px + Math.sign(b.vx) * 8, b._py), sy = map.solidAt(b._px, b._py + Math.sign(b.vy) * 8);
      let vx = b.vx, vy = b.vy;
      if (sx || !sy) vx = -vx;
      if (sy) vy = -vy;
      const nb = W.shots.fire({ x: b._px, y: b._py, z: 12, vx, vy, vz: 0, r: b.r, dmg: b.dmg, life: b.life * .8, team: 'hero', color: b.color, core: b.core, pierce: b.pierce, data: { owner: b.data.owner, kind: b.data.kind, bounces: b.data.bounces - 1 } });
      if (nb) nb.life = b.life * .8;
    }
  }
  // the Dinner Bell passes to a friend who touches the hero it marked
  if (W.bellHero && W.bellT > 0) for (const h of W.heroes) if (h !== W.bellHero && !h.down && Math.hypot(h.body.x - W.bellHero.body.x, h.body.y - W.bellHero.body.y) < 8) { W.bellHero = h; W.bellT = 12; say('bell_pass', h, true); break; }
  // from the sixth floor on, a shot that touches a friend stuns the friend for a third of a second
  if (W.index >= 5) for (const b of W.shots.list) for (const h of W.heroes) {
    if (h.down || h === b.data.owner || Math.hypot(h.body.x - b.x, h.body.y - b.y) > 7) continue;
    h.stun = Math.max(h.stun, .35);
    if (!W.allyTold) { W.allyTold = 1; say('ally_stun_on', null, true); }
    say('ally_shot', h);
  }
  const liveMonsters = W.monsters.filter(m => m.alive && m.kind !== 'tithe' && !(m.kind === 'fryar' && m.hidden));
  W.shots.hit(liveMonsters, (b, m) => {
    const o = b.data.owner;
    if (b.data.kind === 'hex' && o.def.splash) for (const n of liveMonsters) if (n !== m && n.alive && Math.hypot(n.x - m.x, n.y - m.y) < o.def.splash) damageMonster(n, b.dmg * .5, o);
    damageMonster(m, b.dmg, o);
    game.hitFx(m.x, m.y, 6, { power: .4, damage: null, sound: 'hit' });
  }, 'hero');
  W.shots.hit(W.gens.filter(g => g.alive), (b, g) => damageGen(g, b.dmg, b.data.owner), 'hero');
  const shootable = W.items.filter(i => i.alive && i.def.shootable);
  W.shots.hit(shootable, (b, it) => {
    removeItem(it);
    if (it.def.shot === 'cider') say('shot_cider', b.data.owner, true);
    if (it.def.shot === 'stew') game.audio.sfx('explode', { vol: .2, pitch: 2 });
    if (it.def.shot === 'feast') say('shot_feast', b.data.owner, true);
    WORLD.events.push({ type: 'shot-food', ch: it.ch });
  }, 'hero');
  if (W.boss && W.boss.alive) bossShot(W.shots);
  // the monsters' shots, and the crocks
  const targets = W.heroes.filter(h => !h.down).map(h => ({ x: h.body.x, y: h.body.y, r: 5, h }));
  W.foeShots.update(dt, map);
  W.foeShots.hit(targets, (b, t) => damageHero(t.h, b.dmg, b.data.owner), 'foe');
  for (const c of W.crocks) {
    c.t += dt;
    if (c.t >= c.dur) {
      for (const h of W.heroes) if (!h.down && Math.hypot(h.body.x - c.tx, h.body.y - c.ty) < 12) damageHero(h, c.dmg, null);
      W.blasts.push({ x: c.tx, y: c.ty, t: .3, color: '#e8e0d0' });
      game.audio.sfx('explode', { vol: .25, pitch: 1.8 });
      c.done = true;
    }
  }
  W.crocks = W.crocks.filter(c => !c.done);
}

// ---- 32-features.js ----
// The stage's hazards: force fields (beams that cycle on and off, hurting whatever touches them while on) and spikes (up
// for half a second every 1.6 seconds). Plates, runes, pads and fake walls are handled where heroes move, in 30-world.js.

function stepFeatures(dt) {
  const W = WORLD;
  const t = W.time;
  // force fields: two seconds on, two off, each with its own phase
  for (const f of W.fields) {
    const phase = (t + f.phase) % 4;
    const on = phase >= 2;
    f.on = on;
    f.flicker = !on && phase > 1.6;
    if (!on) continue;
    for (const h of W.heroes) {
      if (h.down || h.fieldCd > 0) continue;
      if (f.cells.some(c => Math.hypot(c.x - h.body.x, c.y - h.body.y) < 9)) {
        h.fieldCd = .5;
        damageHero(h, 12, null);
        h.body.x += (h.body.x - f.cells[1].x) * .1; h.body.y += (h.body.y - f.cells[1].y) * .1;
        say('tip_field', h);
      }
    }
    for (const m of W.monsters) {
      if (!m.alive) continue;
      if (f.cells.some(c => Math.hypot(c.x - m.x, c.y - m.y) < 9)) damageMonster(m, .5 * 12 * dt, null);
    }
  }
  for (const h of W.heroes) h.fieldCd = Math.max(0, (h.fieldCd || 0) - dt);
  // spikes: a quarter-second tremble, then up for half a second
  for (const s of W.spikes) {
    const p = (t + s.phase) % 1.6;
    const up = p >= 1.1 && p < 1.6;
    if (up && !s.hit) {
      s.hit = true;
      for (const h of W.heroes) if (!h.down && Math.hypot(h.body.x - s.x, h.body.y - s.y) < 8) { damageHero(h, 15, null); say('tip_spike', h); }
      for (const m of W.monsters) if (m.alive && m.kind !== 'ghost' && Math.hypot(m.x - s.x, m.y - s.y) < 8) damageMonster(m, 15, null);
    }
    if (!up) s.hit = false;
    s.up = up;
    s.tremble = p >= .85 && p < 1.1;
  }
}

// ---- 35-boss.js ----
// King Famish, on the banquet floor. Three phases by his health. Phase one (100 to 70 percent): he stays on his throne and
// throws fans of plates, and stomps when a hero comes near. Phase two (70 to 35): he walks to the nearest platter and eats
// it, healing while he does; each platter a hero shoots or takes denies him, and gnasher waves come in from the doors.
// Phase three (under 35): his ribcage opens (shots from the front deal double), he charges along a straight line after a
// telegraph, breathes a fog that triples the drain, and each flask takes six percent of his health. Defeat drops the
// Iron Gauntlet; the hero who takes it scores five thousand, and the ending begins.

function loadBoss(index) {
  const W = WORLD;
  const stage = STAGES[index], realm = REALMS[stage.realm];
  const cw = 44, ch = 32;
  const rows = [];
  for (let y = 0; y < ch; y++) {
    let s = '';
    for (let x = 0; x < cw; x++) s += (x === 0 || y === 0 || x === cw - 1 || y === ch - 1) ? '#' : '.';
    rows.push(s);
  }
  // the doorways in the south wall: four gaps of two tiles, where the gnasher waves come in
  const doorways = [[10, ch - 1], [18, ch - 1], [26, ch - 1], [34, ch - 1]];
  const grid = rows.map(r => r.split(''));
  for (const [dx, dy] of doorways) { grid[dy][dx] = '.'; grid[dy][dx + 1] = '.'; }
  // the rows of the hall: a pillar at each corner, the banquet table down the middle
  for (const [px, py] of [[6, 6], [36, 6], [6, 24], [36, 24]]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) grid[py + dy][px + dx] = '#';
  const table = [];
  for (let x = 12; x <= 31; x++) for (const y of [14, 15]) { table.push([x, y]); }
  W.map = new E.TileMap({
    rows: grid.map(r => r.join('')),
    legend: { '#': 1 },
    types: {
      1: { h: 24, top: realm.wall.top, side: realm.wall.side, cut: true, cutH: 6, face: realm.wall.face }
    },
    floorMat: realm.floor
  });
  W.F = { stairs: [-5, -5], starts: [[21, 27], [22, 27], [23, 27], [22, 28]], padPair: new Map(), doors: [], traps: [], ents: new Map(), g: grid, W: cw, H: ch };
  W.stage = stage; W.index = index;
  W.doors = []; W.doorsByCell = new Map(); W.fakes = new Map(); W.cracks = new Map(); W.gens = []; W.items = []; W.itemAt = new Map();
  W.monsters = []; W.fields = []; W.spikes = []; W.runes = new Map(); W.pads = new Map(); W.plates = new Map(); W.bell = null;
  // the platters on the table, and the food in the corners
  for (const [x, y] of [[14, 14], [22, 14], [29, 14]]) spawnItemAt('P', (x + .5) * T, (y + .5) * T);
  for (const [x, y] of [[3, 3], [40, 3], [3, 28], [40, 28]]) spawnItemAt('f', (x + .5) * T, (y + .5) * T);
  for (const [x, y] of [[2, 16], [41, 16]]) spawnItemAt('m', (x + .5) * T, (y + .5) * T);
  // the king: the throne at the north end, a gauntlet glowing in his ribcage
  const hp = 300 * (1 + .5 * (W.heroes.length - 1)) * TUNE.generatorHp;
  W.boss = {
    x: 22 * T, y: 4 * T, r: 14, hp, max: hp, alive: true, phase: 1, state: 'throne', t: 0, cd: 2.5, stompCd: 4,
    eating: null, healT: 0, charge: null, fogT: 10, fog: 0, waveT: 12, plates: 0, tele: 0, dir: 0, intro: 3.5, rise: 0,
    body: new E.Body({ x: 22 * T, y: 4 * T, r: 14 }), rig: new E.Humanoid({ size: 2.4, build: 'skeleton', hat: 'crown', colors: { cloth: '#5a2a6a', skin: '#d8d0c0', trim: '#d0a040' } }),
    doorways: doorways.map(([x, y]) => [(x + .5) * T, (y - 2 + .5) * T])
  };
  W.boss.body.gravity = 0; W.boss.body.friction = 0;
  W.shots = new E.Bullets(game, { plane: 'ground', max: 400, sparks: true });
  W.foeShots = new E.Bullets(game, { plane: 'ground', max: 200, sparks: true });
  W.flows = []; W.crocks = []; W.torches = []; W.hoard = null;
  W.heroes.forEach((h, i) => { h.body.x = (W.F.starts[i % 4][0] + .5) * T; h.body.y = (W.F.starts[i % 4][1] + .5) * T; h.body.vx = 0; h.body.vy = 0; h.down = false; h.hp = Math.max(h.hp, 1); });
  W.bellT = 0; W.bellHero = null;
  return grid;
}

function bossPhase() {
  const b = WORLD.boss, f = b.hp / b.max;
  return f > .7 ? 1 : f > .35 ? 2 : 3;
}

function stepBoss(dt) {
  const W = WORLD, b = W.boss;
  // the staging: he rises from the throne with a line, and his rig is posed from his state
  if (b.intro > 0) { b.intro -= dt; b.rise = Math.min(1, b.rise + dt / 3.5); if (b.intro <= 0) say('king_intro', null, true); }
  b.rig.update(dt, { x: b.x, y: b.y, z: 0, pose: !b.alive ? 'die' : b.eating ? 'kneel' : null, hurt: b.flash > 0, attack: null });
  if (b.intro > 0) return;
  if (!b.alive) {
    b.dying = (b.dying || 0) + dt;
    if (b.dying > .6 && !b.gauntletDropped) { b.gauntletDropped = true; spawnItemAt('G', b.x, b.y); say('king_dead', null, true); }
    return;
  }
  b.t += dt;
  const target = nearestHero(b.x, b.y, 2000);
  if (!target) return;
  const ph = bossPhase();
  if (ph !== b.phase) {
    b.phase = ph;
    say(ph === 2 ? 'king_second' : 'king_third', null, true);
    if (ph === 2) { b.waveT = 6; } else { b.fogT = 4; game.shake(10); }
    game.audio.layer('drums', 1, .5);
    game.flash('#ff8040', .3, .8);
  }
  // breathing the health back while eating
  if (b.eating) {
    const plat = W.itemAt.get(b.eating.cell);
    if (!plat || !plat.alive) { b.eating = null; b.state = 'walk'; }
    else { b.healT += dt; b.hp = Math.min(b.max, b.hp + b.max * .05 * dt); if (b.healT > 2.5) { removeItem(plat); b.eating = null; b.state = 'walk'; } }
  }
  if (b.state === 'charge') {
    const c = b.charge;
    c.t += dt;
    if (c.t < .6) { /* telegraph: a line on the floor */ }
    else {
      b.x += c.dx * 230 * dt; b.y += c.dy * 230 * dt;
      if (!W.map.standable || W.map.solidAt(b.x, b.y)) { b.state = 'walk'; b.charge = null; game.shake(6); }
      for (const h of W.heroes) if (!h.down && Math.hypot(h.body.x - b.x, h.body.y - b.y) < 22 && !h.chargeHit) { h.chargeHit = true; damageHero(h, 15, null); h.body.x += c.dx * 30; h.body.y += c.dy * 30; }
      if (c.t > 1.8) { b.state = 'walk'; b.charge = null; for (const h of W.heroes) h.chargeHit = false; }
    }
    return;
  }
  // phase one: the throne, plates, and the stomp
  if (ph === 1) {
    b.body.x = b.x; b.body.y = b.y;
    b.cd -= dt; b.stompCd -= dt;
    if (b.cd <= 0 && Math.hypot(target.body.x - b.x, target.body.y - b.y) < 260) {
      b.cd = 2.5;
      for (const a of [-.25, 0, .25]) {
        const dx = target.body.x - b.x, dy = target.body.y - b.y, d = Math.hypot(dx, dy) || 1, s = 110, c = Math.cos(a), sn = Math.sin(a);
        W.foeShots.fire({ x: b.x, y: b.y, z: 12, vx: (dx / d * c - dy / d * sn) * s, vy: (dx / d * sn + dy / d * c) * s, vz: 0, r: 4, dmg: 10, life: 2.4, team: 'foe', color: '#f4e6c8', core: '#fff', data: { owner: b } });
      }
      game.audio.sfx('hit', { vol: .3, pitch: .7 });
    }
    if (b.stompCd <= 0 && Math.hypot(target.body.x - b.x, target.body.y - b.y) < 40) {
      b.stompCd = 4;
      W.blasts.push({ x: b.x, y: b.y, t: 0, color: '#ffd080' });
      for (const h of W.heroes) if (!h.down && Math.hypot(h.body.x - b.x, h.body.y - b.y) < 46) damageHero(h, 15, null);
      game.shake(8); game.audio.sfx('boom', { vol: .5, pitch: .6 });
    }
    return;
  }
  // phase two: walk to the nearest platter and eat it; gnasher waves from the doors
  if (ph >= 2) {
    b.waveT -= dt;
    if (b.waveT <= 0) {
      b.waveT = 12;
      for (const [x, y] of b.doorways) if (W.gens.length >= 0) spawnMonster('gnasher', x, y, 2, false, null);
    }
    if (!b.eating) {
      let best = null, bd = Infinity;
      for (const it of W.items) if (it.alive && it.ch === 'P') { const d = Math.hypot(it.x - b.x, it.y - b.y); if (d < bd) { bd = d; best = it; } }
      if (best && b.state !== 'eat') {
        const dx = best.x - b.x, dy = best.y - b.y, d = Math.hypot(dx, dy);
        if (d > 10) { b.x += dx / d * 40 * dt; b.y += dy / d * 40 * dt; }
        else { b.state = 'eat'; b.eating = { cell: best.cell }; b.healT = 0; say('king_eating', null, true); }
      }
    }
    b.body.x = b.x; b.body.y = b.y;
  }
  // phase three: the charge, the fog
  if (ph === 3) {
    b.tele -= dt;
    b.fogT -= dt;
    if (b.fogT <= 0) { b.fog = 3; b.fogT = 10; }
    b.fog = Math.max(0, b.fog - dt);
    if (b.tele <= 0 && !b.eating && Math.hypot(target.body.x - b.x, target.body.y - b.y) < 260) {
      b.tele = 4.5;
      const dx = target.body.x - b.x, dy = target.body.y - b.y, d = Math.hypot(dx, dy) || 1;
      b.state = 'charge'; b.charge = { dx: dx / d, dy: dy / d, t: 0 };
      say('king_near', null, true);
    }
  }
  // the fog triples the drain for the heroes within it
  for (const h of W.heroes) if (!h.down && b.fog > 0 && Math.hypot(h.body.x - b.x, h.body.y - b.y) < 80) h.fogDrain = true; else h.fogDrain = false;
}

// A hero's shot hits the king: from the front, double, in phase three.
function bossShot(shots) {
  const b = WORLD.boss;
  shots.hit([{ x: b.x, y: b.y, r: 14, alive: true, boss: true }], (bullet, t) => {
    const mult = bossPhase() === 3 && bullet.vy < 0 ? 2 : 1;   // shots from the south, the front of the king
    b.hp -= bullet.dmg * mult;
    game.hitFx(b.x, b.y, 6, { power: .4, damage: Math.round(bullet.dmg * mult), sound: 'hit' });
    if (b.hp <= 0) bossDefeat();
  }, 'hero');
}
// A flask takes six percent of the king's health (and a shot flask's blast does the same)
function bossFlask(h) {
  const b = WORLD.boss;
  if (!b || !b.alive) return;
  b.hp -= b.max * .06;
  if (b.hp <= 0) bossDefeat(h);
}
function bossDefeat(h) {
  const b = WORLD.boss;
  if (!b.alive) return;
  b.alive = false; b.dying = 0; b.state = 'dead';
  if (h) h.kills++;
  game.shake(14); game.flash('#ffffff', .4, 1);
  game.audio.sfx('boom', { vol: .7, pitch: .5 });
  for (let i = 0; i < 4; i++) WORLD.blasts.push({ x: b.x + (i - 2) * 10, y: b.y + (i % 2) * 8, t: -i * .08, color: '#f4e6c8' });
}

// ---- 40-intents.js ----
// Intents: what drives a hero each step. A human player's input and the autopilot both produce the same shape:
// { move: [x, y], aim: angle or null, fire, magic, plant }. Attract mode and the tests use the autopilot.

// From a player's input (keyboard, mouse or pad).
function intentFromInput(p, h) {
  const m = p.move();
  let aim = null;
  if (p.padAim && Math.hypot(p.padAim[0], p.padAim[1]) > .45) {
    const v = game.view && game.view.screenDirToGround ? game.view.screenDirToGround(p.padAim[0], p.padAim[1]) : p.padAim;
    aim = Math.atan2(v[1], v[0]);
  } else if (p.aimSource === 'mouse') {
    const mg = game.mouseGround && game.mouseGround();
    if (mg) { const gx = Array.isArray(mg) ? mg[0] : mg.x, gy = Array.isArray(mg) ? mg[1] : mg.y; aim = Math.atan2(gy - h.body.y, gx - h.body.x); }
  }
  // aim assist: a shot snaps to the nearest monster or generator inside the cone (8 or 16 degrees) and 200 units
  if (aim != null && prefs.aim !== 'off' && p.down('fire')) {
    const cone = (prefs.aim === 'high' ? 16 : 8) * Math.PI / 180;
    let best = null, bd = 200;
    for (const t of [...WORLD.monsters.filter(m => m.alive), ...WORLD.gens.filter(g => g.alive)]) {
      const d = Math.hypot(t.x - h.body.x, t.y - h.body.y);
      if (d < bd && Math.abs(angleDiff(aim, Math.atan2(t.y - h.body.y, t.x - h.body.x))) < cone) { bd = d; best = t; }
    }
    if (best) aim = Math.atan2(best.y - h.body.y, best.x - h.body.x);
  }
  return { move: [m[0], m[1]], aim, fire: p.down('fire'), magic: p.pressed('magic'), plant: p.down('plant') };
}

// The autopilot: picks a goal every half second and walks there on a flow field. Goals in order: food when weak, a
// generator in reach, a food or treasure item, the stairs if they can be reached, and otherwise a cell beside a closed
// door when it holds a key (a closed door is a wall to the field, so the bot must stand beside it to open it).
function botIntent(h, t) {
  const W = WORLD, map = W.map, F = W.F;
  const B = h.bot || (h.bot = { t: -1, goal: null, flow: new E.FlowField(map), reach: new E.FlowField(map) });
  if (t - B.t > .5 || !B.goal) {
    B.t = t;
    B.reach.update(h.body.x, h.body.y);
    const cellOf = (x, y) => Math.floor(x / T) + Math.floor(y / T) * map.w;
    const reachable = (x, y) => { const d = B.reach.d[cellOf(x, y)]; return d !== undefined && d < 1e9; };
    const dist = (x, y) => Math.hypot(x - h.body.x, y - h.body.y);
    let goal = null, best = Infinity;
    const want = (x, y, d) => { if (d < best) { best = d; goal = { x, y }; } };
    if (h.hp < 350) for (const it of W.items) if (it.alive && (it.ch === 'f' || it.ch === 'b' || it.ch === 'j') && reachable(it.x, it.y)) want(it.x, it.y, dist(it.x, it.y) * .6);
    for (const g of W.gens) if (g.alive && reachable(g.x, g.y)) want(g.x, g.y, dist(g.x, g.y) * 1.1);
    const full = it => (it.def.key && h.keys >= 9) || (it.def.flask && h.flasks >= 9);   // (a full pack leaves it on the floor)
    for (const it of W.items) if (it.alive && !it.def.shootable && !full(it) && reachable(it.x, it.y)) want(it.x, it.y, dist(it.x, it.y) * .9);
    const stairs = { x: (F.stairs[0] + .5) * T, y: (F.stairs[1] + .5) * T };
    if (!goal && reachable(stairs.x, stairs.y)) goal = stairs;
    if (!goal && h.keys > 0) {
      // the nearest reachable cell beside a closed door
      for (const d of W.doors) {
        if (d.open) continue;
        for (const [x, y] of d.cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
          const cx = (nx + .5) * T, cy = (ny + .5) * T;
          if (reachable(cx, cy) && dist(cx, cy) < best) { best = dist(cx, cy); goal = { x: cx, y: cy }; }
        }
      }
    }
    if (W.boss && W.boss.alive) goal = { x: W.boss.x, y: W.boss.y };   // the King is the goal on the banquet floor
    const gauntlet = W.items.find(i => i.ch === 'G' && i.alive);
    if (gauntlet) goal = { x: gauntlet.x, y: gauntlet.y };   // then the Iron Gauntlet
    if (!goal) goal = stairs;
    B.goal = goal; B.flow.update(goal.x, goal.y);
  }
  const dir = B.flow.dir(h.body.x, h.body.y, B.goal.x, B.goal.y);
  const dd = Math.hypot(B.goal.x - h.body.x, B.goal.y - h.body.y);
  let target = null, td = 150;
  for (const m of W.monsters) if (m.alive) { const d = Math.hypot(m.x - h.body.x, m.y - h.body.y); if (d < td) { td = d; target = m; } }
  for (const g of W.gens) if (g.alive) { const d = Math.hypot(g.x - h.body.x, g.y - h.body.y); if (d < td) { td = d; target = g; } }
  if (W.boss && W.boss.alive) { const d = Math.hypot(W.boss.x - h.body.x, W.boss.y - h.body.y); if (d < 260) { td = d; target = W.boss; } }
  const aim = target ? Math.atan2(target.y - h.body.y, target.x - h.body.x) : null;
  const near = dd < 6;
  return {
    move: near && !target ? [0, 0] : dir,
    aim,
    fire: !!target,
    magic: W.monsters.filter(m => m.alive).length >= 12 && (h.flasks > 0 || CHEATS.infinite || W.attract),
    plant: false
  };
}

// ---- 50-draw.js ----
// Drawing: the floor and its props and lights, the items, generators and monsters, the heroes' rigs, the shots and blasts,
// and the HUD. Everything here reads WORLD; nothing here changes the game.

const ITEM_SPR = { f: SPR.roast, b: SPR.loaf, j: SPR.cider, z: SPR.stew, m: SPR.flask, k: SPR.key, $: SPR.gold, '*': SPR.gem, h: SPR.chest };
const GEN_SPR = { urn: [SPR.urn0, SPR.urn1, SPR.urn2], den: [SPR.den0, SPR.den1, SPR.den2] };

function drawWorld(r) {
  const W = WORLD, map = W.map;
  if (!map) return;
  map.drawFloor(r);
  map.queueWalls(r);
  // torches, set on the floor beside walls (deterministic per floor)
  for (const [x, y] of W.torches) r.prop('torch', x, y, 0, { light: true });
  // the stairs, a flat stairwell on the floor
  if (W.F.stairs[0] >= 0) {
    const sx = (W.F.stairs[0] + .5) * T, sy = (W.F.stairs[1] + .5) * T;
    r.sprite(sx, sy, 0, SPR.stairs, { anchor: 'center' });
    game.lights.add(sx, sy, 10, 40, .6, { color: '#9a88e0' });
  }
  // items: each bobs on its own phase, and a light glows under the gold and the gems
  for (const it of W.items) {
    if (!it.alive) continue;
    const spr = ITEM_SPR[it.ch];
    if (!spr) continue;
    r.shadow(it.x, it.y, 4, .25);
    r.sprite(it.x, it.y, 2 + Math.sin(game.time * 3 + it.bob) * 1.2, spr, { anchor: 'bottom' });
    if (it.ch === '*' || it.ch === 'h') game.lights.add(it.x, it.y, 8, 20, .5, { color: it.ch === '*' ? '#80d8ff' : '#ffd060' });
  }
  // generators, with three damage states
  for (const g of W.gens) {
    if (!g.alive) continue;
    const frac = g.hp / g.max, k = frac > .66 ? 0 : frac > .33 ? 1 : 2;
    const pulse = g.children > 0 ? Math.sin(game.time * 8) * .08 : 0;
    r.shadow(g.x, g.y, 9, .4);
    r.sprite(g.x + (g.shake > 0 ? Math.sin(game.time * 80) * 1 : 0), g.y, 0, GEN_SPR[g.kind][k], { anchor: 'bottom', flash: g.flash > 0 ? '#ffffff' : undefined, glow: pulse + .2 });
    game.lights.add(g.x, g.y, 14, 34, .5 + pulse, { color: g.kind === 'urn' ? '#a0c8ff' : '#ff9060' });
  }
  // monsters: ghosts flutter on sprites; gnashers are rigs
  for (const m of W.monsters) {
    if (!m.alive && m.fade <= 0) continue;
    const alpha = m.alive ? 1 : Math.max(0, m.fade / .4);
    if (m.kind === 'ghost') {
      const frame = SPR.ghost[Math.floor(game.time * 4 + m.bob) % 2];
      const bob = Math.sin(m.bob) * 2;
      r.shadow(m.x, m.y, 6, .25 * alpha);
      r.sprite(m.x, m.y, 8 + bob, frame, { anchor: 'bottom', alpha, flash: m.flash > 0 ? '#ffffff' : undefined, glow: .5 });
    } else {
      if (!m.rig) m.rig = monsterRig(m.kind);
      r.shadow(m.x, m.y, 7, .35 * alpha);
      const rig = m.rig;
      r.actor(m.x, m.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { flash: m.flash > 0 ? '#ffffff' : undefined, alpha: m.hidden ? .25 : alpha });
    }
    if (m.kind === 'gnasher' && m.wind > 0) r.groundArc(m.x, m.y, 6, 22, m.facing - .6, m.facing + .6, '#ff6040', .35);
  }
  // heroes: a ring in the player's colour under each, a rig, and a name
  for (const h of W.heroes) {
    const down = h.down, col = h.color;
    r.shadow(h.body.x, h.body.y, 7, .35);
    if (!down) r.groundArc(h.body.x, h.body.y, 5, 7.5, 0, Math.PI * 2, col, .85);
    const rig = h.rig;
    r.actor(h.body.x, h.body.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: true, flash: h.flash > 0 ? '#ff4040' : (h.invuln > 0 && Math.floor(game.time * 10) % 2 ? '#ffffff' : undefined), tint: down ? '#808080' : undefined });
    if (!down) drawGear(r, h);
    if (down) r.textAt(h.body.x, h.body.y, 22, 'RISE: ' + game.input.label('fire'), '#ffe08a');
    if (!down && prefs.names) r.textAt(h.body.x, h.body.y, 26, h.name, col);
  }
  drawFeatures(r);
  // the hitboxes and the monster targets, when the Dev Tools ask for them
  if (CHEATS.hitboxes) { for (const m of W.monsters) if (m.alive) r.decal(() => r.groundArc(m.x, m.y, m.r - 1, m.r + 1, 0, Math.PI * 2, '#ff4040', .9)); for (const h of W.heroes) r.decal(() => r.groundArc(h.body.x, h.body.y, 4, 6, 0, Math.PI * 2, '#40ff40', .9)); }
  if (CHEATS.flowfield) { for (const m of W.monsters) if (m.alive && W.heroes.length) { const t = nearestHero(m.x, m.y, 1e6); if (t) r.decal(() => r.groundArc(t.body.x, t.body.y, 9, 11, 0, Math.PI * 2, '#ffff40', .6)); } }
  // the shots, the blasts and the puffs
  W.shots && W.shots.draw(r);
  for (const b of W.blasts || []) {
    const k = b.t / .6, rr = 6 + k * 300;
    r.decal(() => r.groundArc(b.x, b.y, rr, rr + 5, 0, Math.PI * 2, b.color, 1 - k));
  }
}

// The HUD: a panel per player along the top (the health as a big number), the floor's name, the captions.
function drawHud(r) {
  const W = WORLD, n = W.heroes.length || 1, slot = r.W / 4;
  W.heroes.forEach((h, i) => {
    const x = Math.round(i * slot + 6), col = h.color;
    r.text(h.def.name, x, 4, col, { scale: 1, shadow: '#000' });
    const hp = Math.max(0, Math.floor(h.hp)), hcol = h.down ? '#8a8a8a' : hp < 200 ? (Math.floor(game.time * 6) % 2 ? '#ff4040' : '#ff8080') : hp < 400 ? '#ffe060' : '#ffffff';
    r.text(h.down ? 'DOWN' : String(hp > 9999 ? '9999+' : hp), x, 13, hcol, { scale: 2, shadow: '#000' });
    r.text('SCORE ' + h.score, x, 30, '#e8e0ff', { scale: 1, shadow: '#000' });
    r.text('K' + h.keys + ' F' + h.flasks, x + Math.floor(slot / 2) + 10, 30, '#c8f0c8', { scale: 1, shadow: '#000' });
    if (h.queasy > 0) r.text('QUEASY', x, 40, '#8ad070', { scale: 1, shadow: '#000' });
  });
  if (W.heroes.length < 4 && !W.attract) r.text('[' + game.input.label('start') + '] TO JOIN', r.W - 6, r.H - 12, '#ffe08a', { align: 'right', shadow: '#000' });
  r.text(STAGE_LABEL(W.stage).toUpperCase() + ' - ' + W.stage.name.toUpperCase(), r.W / 2, 4, '#f0e8ff', { align: 'center', shadow: '#000' });
  if (W.F && W.floorClock > 0 && W.stage.par) {
    const left = Math.max(0, Math.ceil(W.stage.par - W.floorClock));
    r.text('PAR ' + left, r.W / 2, 16, '#a89ac8', { align: 'center', shadow: '#000' });
  }
  drawHudExtra(r);
  if (W.caption) r.text(W.caption, r.W / 2, r.H - 26, '#fff4c8', { align: 'center', shadow: '#000', outline: true });
  if (W.attract) {
    r.text('DEMO', 6, r.H - 12, '#ff8080', { shadow: '#000' });
    if (Math.floor(game.time * 2) % 2) r.text('PRESS ANY BUTTON', r.W - 6, r.H - 12, '#ffffff', { align: 'right', shadow: '#000' });
  }
  if (SESSION) r.text('ROUND', r.W - 6, 40, '#ffe08a', { align: 'right', shadow: '#000' });
  if (CHEATS.god || CHEATS.infinite || CHEATS.freeze || CHEATS.noGen || TUNE_CHANGED()) r.text('DEV', 6, r.H - 22, '#ff9050', { shadow: '#000' });
  if (W.downClock > 0 && W.continueLeft > 0) r.text('CONTINUE? ' + Math.ceil(W.continueLeft), r.W / 2, r.H / 2 - 16, '#ffe060', { align: 'center', scale: 2, shadow: '#000' });
}
const TUNE_CHANGED = () => Object.keys(TUNE).some(k => TUNE[k] !== DEFAULT_TUNE[k]);

// ---- 52-draw-features.js ----
// The drawing of the features: force fields, spikes, plates, runes, pads, the bell, the lobbed crocks, the fireballs, the
// King and his fog, the monsters' rigs, and the HUD parts for the King's health, the amulets and the specials.

const FIELD_SPR = E.sprite(['.bb.', 'bBBb', 'bBBb', '.bb.'], { b: '#6ad8ff', B: '#e8ffff' }, 2);
const SPIKE_UP = E.sprite(['.s.s.s.', 'sSsSsSs', 'SSSSSSS'], { s: '#9a9aa8', S: '#d8d8e8' }, 2);
const SPIKE_DOWN = E.sprite(['.......', '.......', 'sssssss'], { s: '#4a4a58' }, 2);
const PLATE_SPR = E.sprite(['........', '.pppppp.', '.pPPPPp.', '.pPPPPp.', '.pppppp.'], { p: '#6a5a4a', P: '#9a8a7a' }, 2);
const RUNE_SPR = E.sprite(['..ccc..', '.cCCCc.', 'cCcccCc', '.cCCCc.', '..ccc..'], { c: '#4a7ad0', C: '#9ad0ff' }, 2);
const PAD_SPR = E.sprite(['..pp..', '.pPPp.', 'pPwwPp', 'pPwwPp', '.pPPp.', '..pp..'], { p: '#6a3ad0', P: '#b08aff', w: '#e8dcff' }, 2);
const BELL_SPR = E.sprite(['..bbbb..', '.bBBBBb.', '.bBBBBb.', 'bBBBBBBb', 'bbbbbbbb', '...yy...'], { b: '#6a5a20', B: '#e8c050', y: '#fff4a0' }, 2);
const CROCK_SPR = E.sprite(['.uu.', 'uUUu', '.uu.'], { u: '#6a4a2a', U: '#c8a070' }, 1);
const FIREBALL = E.sprite(['.oo.', 'oOOo', '.oo.'], { o: '#ff6020', O: '#ffe080' }, 1);

// The heroes' gear, drawn on the rigs: an axe head on the berserker's blade, a shield and a bow in the off hand.
const AXE_SPR = E.sprite(['..ss..', '.sSSs.', 'sSSSs.', 'sSSSs.', '.sSs..'], { s: '#c8c8d8', S: '#ffffff' }, 1);
const SHIELD_SPR = E.sprite(['.bbbbbb.', 'bBBBBBBb', 'bBrrrrBb', 'bBrwwrBb', 'bBrrrrBb', 'bBBBBBBb', '.bbbbbb.'], { b: '#4a4a5a', B: '#9aa8c0', r: '#c83a32', w: '#f0f0f0' }, 1);
const BOW_SPR = E.sprite(['..b', '.b.', 'b..', 'b..', 'b..', '.b.', '..b'], { b: '#8a5a2a' }, 1);
function drawGear(r, h) {
  const rig = h.rig;
  if (h.cls === 'berserker') { const t = rig.tip(); r.sprite(t[0], t[1], t[2], AXE_SPR, { anchor: 'center' }); }
  else if (h.cls === 'shieldmaiden') { const p = rig.hand('L'); r.sprite(p[0], p[1], p[2], SHIELD_SPR, { anchor: 'center' }); }
  else if (h.cls === 'ranger') { const p = rig.hand('L'); r.sprite(p[0], p[1], p[2], BOW_SPR, { anchor: 'center' }); }
}

// The game's own moves, added to the engine's table: the ranger's bow draw, the shieldmaiden's shield bash, and the
// berserker's axe swing. They play through the engine's rig, like the engine's own.
Object.assign(E.MOVES, {
  bowdraw: { rel: true, a0: .35, a1: -.35, z0: -2, z1: 0, reach: 6, wind: .2, active: .08, recover: .3, lean: .2 },
  shieldbash: { rel: true, a0: .8, a1: -.2, z0: -4, z1: -6, reach: 8, wind: .1, active: .08, recover: .25, lunge: 3 },
  axeswing: { rel: true, a0: 2.2, a1: -1.2, z0: 4, z1: -6, reach: 9, wind: .15, active: .1, recover: .3, lean: .3 }
});
// The attack a hero's rig plays this step: the class's melee move while swinging, its throw while shooting.
function heroAttack(h) {
  if (h.melee > 0) {
    const move = h.cls === 'berserker' ? 'axeswing' : h.cls === 'shieldmaiden' ? 'shieldbash' : 'overhead';
    return E.move(move, 1 - h.melee / .42, 'active');
  }
  if (h.throwT > 0) return E.move(h.cls === 'ranger' ? 'bowdraw' : 'throw', 1 - h.throwT / .3, 'active');
  return null;
}

// The monsters' rigs: each kind dressed from the engine's own characters.
function monsterRig(kind) {
  switch (kind) {
    case 'gnasher': return new E.Humanoid({ size: .95, build: 'bulky', hair: 'bald', eyeGlow: '#ffd84a', colors: { cloth: '#6a7a56', skin: '#8ab070', trim: '#4a5a3a' } });
    case 'lobber': return new E.Humanoid({ size: .9, build: 'chibi', hat: { style: 'band', color: '#f4f4f0' }, outfit: 'robe', colors: { cloth: '#f0f0ea', skin: '#e0b890', trim: '#8a6a40' } });
    case 'imp': return new E.Humanoid({ size: 1.0, build: 'chibi', hair: 'bald', eyeGlow: '#ff8040', colors: { cloth: '#8a2a10', skin: '#c05a30', trim: '#ffb040' } });
    case 'fryar': return new E.Humanoid({ size: 1.0, build: 'heroic', hood: true, outfit: 'robe', eyeGlow: '#c0a0ff', colors: { cloth: '#4a3a6a', hair: '#2a2a3a', skin: '#c8b8a8' } });
    case 'snatcher': return new E.Humanoid({ size: .8, build: 'chibi', hood: true, eyeGlow: '#ffe060', colors: { cloth: '#6a5028', skin: '#c8a070' } });
    case 'tithe': return new E.Humanoid({ size: 1.3, build: 'skeleton', hood: true, outfit: 'robe', eyeGlow: '#ff2040', colors: { cloth: '#2a0a2a', skin: '#e8e0d8' } });
    default: return new E.Humanoid({ size: .95, build: 'bulky', hair: 'bald', colors: { cloth: '#6a7a56', skin: '#8ab070' } });
  }
}

function drawFeatures(r) {
  const W = WORLD, t = game.time;
  // force fields: lit beams while on, dim while off (and flickering just before)
  for (const f of W.fields) for (const c of f.cells) {
    if (f.on) { r.sprite(c.x, c.y, 0, FIELD_SPR, { anchor: 'center', glow: .8 }); game.lights.add(c.x, c.y, 8, 26, .6, { color: '#6ad8ff' }); }
    else if (f.flicker && Math.floor(t * 20) % 2) r.sprite(c.x, c.y, 0, FIELD_SPR, { anchor: 'center', alpha: .35 });
  }
  for (const s of W.spikes) r.sprite(s.x + (s.tremble ? Math.sin(t * 60) * .8 : 0), s.y, 0, s.up ? SPIKE_UP : SPIKE_DOWN, { anchor: 'center' });
  for (const [key, p] of W.plates) if (!p.used) { const [x, y] = key.split(',').map(Number); r.sprite((x + .5) * T, (y + .5) * T, 0, PLATE_SPR, { anchor: 'center' }); }
  for (const r0 of W.runes.values()) { r.sprite(r0.x, r0.y, 0, RUNE_SPR, { anchor: 'center', glow: .6 }); game.lights.add(r0.x, r0.y, 6, 22, .5, { color: '#7aa8ff' }); }
  for (const p of W.pads.values()) { r.sprite(p.x, p.y, 0, PAD_SPR, { anchor: 'center', glow: .6 }); game.lights.add(p.x, p.y, 6, 20, .5, { color: '#b08aff' }); }
  if (W.bell && W.bell.alive) r.sprite(W.bell.x, W.bell.y, 0, BELL_SPR, { anchor: 'bottom' });
  // the lobbed crocks: an arc from the lobber to the landing point, with its shadow on the ground
  for (const c of W.crocks) {
    const k = Math.min(1, c.t / c.dur), x = c.sx + (c.tx - c.sx) * k, y = c.sy + (c.ty - c.sy) * k, z = Math.sin(k * Math.PI) * 40;
    r.shadow(c.tx, c.ty, 9, .35);
    r.sprite(x, y, z + 8, CROCK_SPR, { anchor: 'center' });
  }
  W.foeShots && W.foeShots.draw(r);
  // the King, his throne's shadow, his charge's line, and his fog
  const b = W.boss;
  if (b && (b.alive || b.dying < 1.5)) {
    if (b.charge && b.charge.t < .6) r.decal(() => r.groundArc(b.x, b.y, 14, 220, Math.atan2(b.charge.dy, b.charge.dx) - .05, Math.atan2(b.charge.dy, b.charge.dx) + .05, '#ff4040', .4));
    if (b.fog > 0) r.decal(() => r.groundArc(b.x, b.y, 40, 80, 0, Math.PI * 2, '#8aff8a', .35));
    if (b.alive) {
      r.shadow(b.x, b.y, 18, .45);
      // phase three: the ribcage is open, and the gauntlet glows inside it
      if (b.phase === 3) { const c = [b.x, b.y - 10]; r.sprite(c[0], c[1], 14, BELL_SPR, { anchor: 'center', glow: .9 }); game.lights.add(c[0], c[1], 14, 40, .8, { color: '#ffd060' }); }
      const rig = b.rig;
      r.actor(b.x, b.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { flash: b.flash > 0 ? '#ffffff' : undefined, xray: true });
    } else {
      r.shadow(b.x, b.y, 18, .45 * Math.max(0, 1 - b.dying));
      r.sprite(b.x, b.y, 0, BELL_SPR, { anchor: 'bottom', alpha: Math.max(0, 1 - b.dying) });
    }
  }
}

// The monsters are rigs; the ghosts and the bell and the rest are sprites. The HUD parts below read the same state.
function drawHudExtra(r) {
  const W = WORLD, b = W.boss;
  if (b && b.alive) {
    const f = Math.max(0, b.hp / b.max), w = r.W * .5;
    r.text('KING FAMISH', r.W / 2, 26, '#ffe08a', { align: 'center', shadow: '#000' });
    r.overlay(g => { E.px.rect(g, r.W / 4, 36, w, 6, '#000'); E.px.rect(g, r.W / 4 + 1, 37, Math.max(0, (w - 2) * f), 4, b.phase === 3 ? '#ff4040' : b.phase === 2 ? '#ffb040' : '#e0c060'); });
  }
  W.heroes.forEach((h, i) => {
    const x = Math.round(i * (r.W / 4) + 6);
    if (h.amulet) r.text(AMULETS[h.amulet.type].name + ' ' + Math.ceil(h.amulet.t), x, 50, '#ffe0a0', { scale: 1, shadow: '#000' });
    if (h.specials && h.specials.length) r.text(h.specials.map(s => SPECIALS[s].name.split(' ')[0]).join(' ').toUpperCase(), x, 60, '#c8d8ff', { scale: 1, shadow: '#000' });
    if (h.stun > 0) r.text('STUNNED', x, 70, '#7aa8ff', { scale: 1, shadow: '#000' });
  });
  if (W.hoard && W.hoard.left > 0) r.text('HOARD ' + Math.ceil(W.hoard.left), r.W / 2, 28, '#ffd060', { align: 'center', scale: 2, shadow: '#000' });
  if (W.bellT > 0 && W.bellHero) r.text('ON THE MENU: ' + W.bellHero.name, r.W / 2, 42, '#ffb0b0', { align: 'center', shadow: '#000' });
}

// ---- 53-audio.js ----
// Audio, all written in code: the songs (original compositions in the engine's song format), and the Babble voices, the
// gibberish of the narrator and the heroes. A voice is a run of syllables, each a short tone through a band filter, with
// vowels setting the filter and consonants a short noise burst. The same words always sound the same (the pitch of each
// syllable is hashed from it), and each speaker has a base pitch, a wave and a rate.

const SONGS = {
  // the title and the menus: a D minor march, square lead, triangle bass, snare rolls
  throwdown: { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .16, notes: 'D4 - F4 - A4 - G4 - F4 - D4 - E4 - F4 - D4 - - - A3 - - - D4 - F4 - A4 - C5 - A4 - F4 - D4 - E4 - D4 - - - - - ' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'D2 . D2 . A2 . A2 . D2 . D2 . F2 . F2 . ' },
    { name: 'drums', wave: 'drums', vol: .2, notes: 'k . . . s . . . k . . . s . . s ' }
  ] },
  // floors 1 to 3: a bouncy minor pulse and a kitchen clatter
  larder: { bpm: 120, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: 'A4 . C5 . E5 . C5 . B4 . G4 . A4 . . . ' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 A2 E2 E2 F2 F2 G2 G2 ' },
    { name: 'drums', wave: 'drums', vol: .18, notes: 'k . h . s . h . k . h k s . h . ' }
  ] },
  // floors 4 to 6: an organ-like arpeggio in slow triplets over a drone
  ossuary: { bpm: 96, steps: 6, tracks: [
    { name: 'lead', wave: 'triangle', vol: .14, notes: 'D4 F4 A4 D5 A4 F4 C4 E4 G4 C5 G4 E4 ' },
    { name: 'drone', wave: 'sine', vol: .14, notes: 'D2 - - - - - D2 - - - - - ' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . . s . . k . . s . . ' }
  ] },
  // floors 7 and 8: a driving saw bass, anvil hits
  furnace: { bpm: 136, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .15, notes: 'E2 E2 E3 E2 G2 G2 G3 G2 B2 B2 B3 B2 A2 A2 A3 A2 ' },
    { name: 'lead', wave: 'square', vol: .08, notes: 'E5 . . G5 . . B4 . . A4 . . ' },
    { name: 'drums', wave: 'drums', vol: .2, notes: 'k . k . s . k . k . s k ' }
  ] },
  // the treasure rooms: a frantic jig over a ticking hat
  hoard: { bpm: 160, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .13, notes: 'G4 B4 D5 G5 F5 D5 B4 D5 A4 C5 E5 A5 G5 E5 C5 E5 ' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'G2 . G2 . C3 . C3 . A2 . A2 . D3 . D3 . ' },
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k h k h s h k h ' }
  ] },
  // the King: a slow dark line, and drums that come in with each phase (game.audio.layer)
  king: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'saw', vol: .1, notes: 'C4 . Eb4 . G4 . Bb3 . C4 . Eb4 . F4 . G4 . ' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'C2 C2 C2 C2 Ab1 Ab1 Ab1 Ab1 ' },
    { name: 'drums', wave: 'drums', vol: .22, on: false, notes: 'k . k . s . k k ' }
  ] },
  // the game over: a slow descending dirge, played once
  fed: { bpm: 70, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .2, notes: 'A4 - - - G4 - - - F4 - - - E4 - - - D4 - - - ' },
    { name: 'bass', wave: 'sine', vol: .14, notes: 'D2 - - - C2 - - - Bb1 - - - A1 - - - ' }
  ] },
  // the ending: a heroic major fanfare
  victory: { bpm: 110, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .16, notes: 'D4 . F4 A4 D5 . C5 . A4 . F4 . D4 - - - ' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'D2 . D2 . Bb1 . Bb1 . ' },
    { name: 'drums', wave: 'drums', vol: .18, notes: 'k . s . k . s . k . k s k . k . ' }
  ] }
};
function stageSong(stage) {
  if (!stage) return SONGS.throwdown;
  if (stage.kind === 'boss') return SONGS.king;
  if (stage.kind === 'treasure') return SONGS.hoard;
  return { larder: SONGS.larder, ossuary: SONGS.ossuary, furnace: SONGS.furnace }[stage.realm] || SONGS.larder;
}

// The speakers: the narrator, the heroes, and the monsters that talk.
const VOICES = {
  narrator: { base: 78, rate: 5, wave: 'saw', vol: .2, dark: .8, echo: true },
  berserker: { base: 110, rate: 7, wave: 'square', vol: .16, noise: .2 },
  shieldmaiden: { base: 190, rate: 7, wave: 'saw', vol: .15 },
  ranger: { base: 230, rate: 9, wave: 'square', vol: .13 },
  hexer: { base: 260, rate: 8, wave: 'triangle', vol: .15, vib: [6, .05] },
  gnasher: { base: 120, rate: 10, wave: 'square', vol: .12, noise: .4 }
};

const VOWELS = /[aeiouy]/;
// The sounds of a text: each word's syllables, each a consonant run and a vowel group.
function syllablesOf(text) {
  const out = [];
  for (const word of text.toUpperCase().split(/([^A-Z]+)/)) {
    if (!word) continue;
    if (!/[A-Z]/.test(word)) { out.push({ pause: word.includes(',') ? .25 : word.includes('.') || word.includes('!') || word.includes('?') ? .4 : .12 }); continue; }
    const s = word.toLowerCase().match(/[^aeiouy]*[aeiouy]+[^aeiouy]*/g) || [word.toLowerCase()];
    for (const syl of s) out.push({ onset: syl.replace(/[aeiouy].*$/, ''), vowel: (syl.match(/[aeiouy]+/) || ['a'])[0][0], end: syl.endsWith('?') });
  }
  return out;
}
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
// The formant band for a vowel: low and open for a and o, high for e and i.
const BAND = { a: 'lowpass', o: 'lowpass', u: 'lowpass', e: 'bandpass', i: 'bandpass', y: 'bandpass' };
let BABBLE_LAST = [];
// Build the voices for a text and play them: each syllable a short tone (and a noise burst after a consonant).
function babble(text, speaker) {
  const v = VOICES[speaker] || VOICES.narrator;
  const now = game.time || 0;
  BABBLE_LAST = BABBLE_LAST.filter(t => now - t < .5);
  if (BABBLE_LAST.length >= 3) return;   // at most three voices at once
  BABBLE_LAST.push(now);
  const list = [];
  let t = 0;
  const gap = 1 / v.rate;
  for (const s of syllablesOf(text)) {
    if (s.pause) { t += s.pause; continue; }
    const h = hashStr(s.onset + s.vowel) % 9 - 4, f = v.base * (1 + h * .03) * (v.dark || 1) * (s.end ? 1.12 : 1);
    list.push({ wave: v.wave, freq: f, to: f * (s.end ? 1.25 : .9), dur: gap * .7, vol: v.vol * .55, delay: t, filter: BAND[s.vowel] || 'bandpass', q: 3, vib: v.vib });
    if (s.onset && v.noise !== undefined) list.push({ wave: 'noise', freq: 2400, dur: .03, vol: v.vol * .4, delay: t, filter: 'highpass' });
    t += gap;
  }
  if (!list.length) return;
  game.audio.sfx(list, { vol: .8, vary: 0 });
}
// The narrator reads each line; a hero barks, the way the heroes speak (short, and rate-limited).
const BARK_T = {};
function bark(h, text) {
  const now = game.time || 0;
  if (now - (BARK_T[h.cls] || -9) < 2) return;
  BARK_T[h.cls] = now;
  babble(text, h.cls);
}
SAY_HOOK = (text, key) => { if (prefs.voices !== false) babble(text, 'narrator'); };

// ---- 60-scenes.js ----
// Scenes: the front end (title, class select, how to play, high scores, settings, about), the card between floors, the
// play scene with its pause overlay and Dev Tools, the game over, the ending, and the attract mode.

let IDLE = 0, PTR = null;
// Words set in lines no wider than n characters.
function wrapWords(text, n) {
  const lines = []; let cur = '';
  for (const w of text.split(' ')) { if ((cur + ' ' + w).trim().length > n) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}
const NO_INTENT = { move: [0, 0], aim: null, fire: false, magic: false, plant: false };
const PRESSING = a => game.players.some(p => p.pressed(a));

// A list of rows. A row: { label(): string, act(): void, adj(dir): void (left and right), off(): bool (greyed) }.
function List(rows, o = {}) { return { rows, i: 0, hit: [], o }; }
function listUpdate(L) {
  const ps = game.players.length ? game.players : [game.input];
  const n = L.rows.length;
  const step = d => { for (let k = 0; k < n; k++) { L.i = (L.i + d + n) % n; if (!L.rows[L.i].off || !L.rows[L.i].off()) break; } };
  for (const p of ps) {
    if (p.pressed('up')) step(-1);
    if (p.pressed('down')) step(1);
    if (p.pressed('left') && L.rows[L.i].adj) { L.rows[L.i].adj(-1); game.audio.sfx('select', { vol: .4 }); }
    if (p.pressed('right') && L.rows[L.i].adj) { L.rows[L.i].adj(1); game.audio.sfx('select', { vol: .4 }); }
    if (p.pressed('confirm') && L.rows[L.i].act && !(L.rows[L.i].off && L.rows[L.i].off())) { game.audio.sfx('confirm', { vol: .5 }); L.rows[L.i].act(); }
    if (p.pressed('cancel') && L.o.back) { game.audio.sfx('select', { vol: .3, pitch: .7 }); L.o.back(); }
  }
  const pt = game.input.pointer();
  if (pt) {
    const hit = L.hit.find(h => pt[1] >= h.y0 && pt[1] < h.y1 && pt[0] >= h.x0 && pt[0] < h.x1);
    if (hit && !hit.off && (!PTR || Math.abs(PTR[0] - pt[0]) + Math.abs(PTR[1] - pt[1]) > 0)) L.i = hit.i;
    PTR = pt;
  }
  const c = game.input.clicked && game.input.clicked();
  if (c) {
    const hit = L.hit.find(h => c[1] >= h.y0 && c[1] < h.y1 && c[0] >= h.x0 && c[0] < h.x1);
    if (hit && !L.rows[hit.i].off) { L.i = hit.i; game.audio.sfx('confirm', { vol: .5 }); if (L.rows[hit.i].act) L.rows[hit.i].act(); }
  }
}
function listDraw(r, L, x, y, o = {}) {
  const lh = o.lh || 16, scale = o.scale || 1, align = o.align || 'center';
  L.hit = [];
  L.rows.forEach((row, i) => {
    const yy = y + i * lh, off = row.off && row.off(), focus = i === L.i;
    const label = (typeof row.label === 'function' ? row.label() : row.label) || '';
    const col = off ? '#6a6480' : focus ? '#ffd36a' : '#e8e0ff';
    if (focus) r.overlay(g => E.px.rect(g, x - 130 * scale, yy - 3, 260 * scale, lh - 2, '#2a2050'));
    r.text((focus ? '> ' : '  ') + label, x, yy, col, { align, scale, shadow: '#000' });
    L.hit.push({ i, x0: 0, x1: r.W, y0: yy - 2, y1: yy + lh - 2, off });
  });
}

// Who is joined: the players' inputs.
const JOINED = () => game.players.slice();
function anyInputNow() {
  const I = game.input;
  if (game.players.some(p => p.anyPressed && p.anyPressed())) return true;
  if (I.move && (I.move()[0] || I.move()[1])) return true;
  if (I.padAim && (I.padAim[0] || I.padAim[1])) return true;
  const pt = I.pointer();
  if (pt && PTR && Math.abs(pt[0] - PTR[0]) + Math.abs(pt[1] - PTR[1]) > 4) return true;
  if (I.clicked && I.clicked()) return true;
  return false;
}
function idleTick(dt, to) {
  if (anyInputNow()) IDLE = 0; else IDLE += dt;
  if (IDLE > 10 && to) { IDLE = 0; game.go(to, null, { fade: 'black' }); }
}
const isTouchOnly = () => {
  try {
    const fine = typeof matchMedia === 'function' && matchMedia('(any-pointer: fine)').matches;
    const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    const pad = typeof navigator !== 'undefined' && navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(Boolean);
    return !fine && touch && !pad;
  } catch (e) { return false; }
};

// The records: each player's score on the table when a run ends.
// The table: a score qualifies when there is room or it beats the last entry (never with a cheat on).
function qualifies(score) {
  if (CHEATS.god || CHEATS.infinite || CHEATS.freeze || CHEATS.noGen || TUNE_CHANGED()) return false;
  const t = loadScores();
  return t.length < 10 || score > t[t.length - 1].score;
}
function recordEntry(e) {
  const table = loadScores();
  table.push(e); table.sort((a, b) => b.score - a.score);
  saveScores(table.slice(0, 10));
}
function recordRun(list) {
  if (CHEATS.god || CHEATS.infinite || CHEATS.freeze || CHEATS.noGen || TUNE_CHANGED()) return [];
  const table = loadScores();
  for (const e of list) table.push(e);
  table.sort((a, b) => b.score - a.score);
  const kept = table.slice(0, 10);
  saveScores(kept);
  return list.filter(e => kept.includes(e));
}

// --- the title ---
let TITLE = null;
const title = {
  pausable: false,
  enter() {
    IDLE = 0; game.audio.music(SONGS.throwdown);
    game.allowJoin(false);
    const touchOnly = isTouchOnly();
    TITLE = List([
      { label: 'START DESCENT', act: () => game.go('classes'), off: () => touchOnly },
      { label: 'HOW TO PLAY', act: () => game.go('howto') },
      { label: 'HIGH SCORES', act: () => game.go('scores') },
      { label: 'SETTINGS', act: () => game.go('settings', { from: 'title' }) },
      { label: 'ABOUT AND CREDITS', act: () => game.go('about') }
    ], { back: null });
    TITLE.touchOnly = touchOnly;
    if (touchOnly) TITLE.i = 1;   // the first row a touch device can use
  },
  update(dt) {
    listUpdate(TITLE);
    idleTick(dt, 'attract');
  },
  draw(r) {
    r.sky(['#06050e', '#1e1638', '#3a2a58']);
    const m = Math.round(r.H / 2);
    r.overlay(g => E.font.title(g, 'GAUNTLETDOWN', r.W / 2, Math.round(r.H * .2), { scale: 3, align: 'center' }));
    if (TITLE.touchOnly) {
      r.text('CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, m - 26, '#ffe08a', { align: 'center', scale: 1, shadow: '#000' });
      r.text('Connect a controller or a keyboard to play.', r.W / 2, m - 10, '#e8e0ff', { align: 'center', shadow: '#000' });
    }
    listDraw(r, TITLE, r.W / 2, m + 8, { lh: 16, scale: 1 });
    r.text('PRESS ' + game.input.label('confirm') + ' TO CHOOSE - ' + E.versionLabel(), r.W / 2, r.H - 14, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// --- class select ---
let PICKS = [];
function freeClass(except) { return CLASS_ORDER.find(c => !PICKS.some(p => p !== except && p.cls === c)) || null; }
const classes = {
  pausable: false,
  enter() {
    PICKS = [{ input: game.input, cls: 'berserker', locked: false, name: 'P1' }];
    game.allowJoin({
      max: 4,
      onJoin: input => {
        const cls = CLASS_ORDER.find(c => !PICKS.some(p => p.cls === c));
        if (!cls) return;
        PICKS.push({ input, cls, locked: false, name: 'P' + (PICKS.length + 1) });
        game.audio.sfx('powerup', { vol: .4 });
      }
    });
    game.audio.music(SONGS.throwdown);
    IDLE = 0;
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    for (const pk of PICKS) {
      const p = pk.input;
      if (!pk.locked) {
        if (p.pressed('left')) { const s = CLASS_ORDER, i = s.indexOf(pk.cls); for (let k = 1; k <= 4; k++) { const c = s[(i - k + 4 * 4) % 4]; if (!PICKS.some(q => q !== pk && q.cls === c)) { pk.cls = c; break; } } game.audio.sfx('select', { vol: .4 }); }
        if (p.pressed('right')) { const s = CLASS_ORDER, i = s.indexOf(pk.cls); for (let k = 1; k <= 4; k++) { const c = s[(i + k) % 4]; if (!PICKS.some(q => q !== pk && q.cls === c)) { pk.cls = c; break; } } game.audio.sfx('select', { vol: .4 }); }
        if (p.pressed('fire') || p.pressed('confirm')) { pk.locked = true; game.audio.sfx('confirm', { vol: .5 }); }
      } else if (p.pressed('cancel')) pk.locked = false;
    }
    if (PICKS.every(p => p.locked) && game.players.some(p => p.pressed('start'))) startRun();
    if (game.input.pressed('cancel') && !PICKS[0].locked) game.go('title', null, { fade: 'black' });
    idleTick(dt, 'attract');
  },
  draw(r) {
    r.sky(['#0a0816', '#2a1a40']);
    r.overlay(g => E.font.title(g, 'CHOOSE YOUR FOOL', r.W / 2, Math.round(r.H * .1), { scale: 2, align: 'center' }));
    const slot = r.W / 4;
    CLASS_ORDER.forEach((c, i) => {
      const x = Math.round(i * slot + slot / 2), def = HEROES[c];
      const taken = PICKS.find(p => p.cls === c);
      r.overlay(g => E.px.rect(g, x - slot / 2 + 6, r.H * .3, slot - 12, r.H * .42, taken ? '#2a2038' : '#1a1428'));
      r.text(def.name, x, r.H * .34, def.color, { align: 'center', shadow: '#000' });
      r.text(def.who, x, r.H * .34 + 12, '#c8c0e0', { align: 'center', scale: 1, shadow: '#000' });
      const labels = ['ARMOR', 'SHOTS', 'MELEE', 'MAGIC', 'SPEED'];
      def.stats.forEach((v, k) => r.text(labels[k] + ' ' + '|'.repeat(v) + '.'.repeat(5 - v), x - slot / 2 + 14, r.H * .34 + 30 + k * 10, '#e8e0ff', { scale: 1, shadow: '#000' }));
      wrapWords(def.quip, 24).forEach((t, k) => r.text(k === 0 ? '"' + t : t + (k === wrapWords(def.quip, 24).length - 1 ? '"' : ''), x, r.H * .34 + 84 + k * 10, '#ffe0a0', { align: 'center', scale: 1, shadow: '#000' }));
      PICKS.forEach((p, k) => { if (p.cls === c) r.text((p.name) + (p.locked ? ' READY' : ''), x, r.H * .34 + 100 + k * 10, p.locked ? '#7aff9a' : '#ffffff', { align: 'center', shadow: '#000' }); });
    });
    const all = PICKS.length && PICKS.every(p => p.locked);
    r.text(all ? '[' + game.input.label('start') + '] START' : game.input.label('fire') + ' LOCKS - ' + game.input.label('cancel') + ' BACKS OUT', r.W / 2, r.H - 26, all ? '#7aff9a' : '#ffe08a', { align: 'center', shadow: '#000' });
    r.text('[' + game.input.label('start') + '] TO JOIN', r.W - 6, r.H - 10, '#8a80a8', { align: 'right', shadow: '#000' });
  }
};

function startRun() {
  WORLD.heroes = PICKS.map((p, i) => makeHero(i, p.cls, p.input));
  WORLD.heroes.forEach((h, i) => { h.name = PICKS[i].name; });
  WORLD.attract = false; WORLD.runT = 0; WORLD.records = [];
  game.go('card', { index: 0, first: true }, { fade: 'black' });
}

// --- how to play, high scores, about: pages and tables ---
let PAGE = 0;
const howto = {
  pausable: false,
  enter(d) { PAGE = 0; this.back = d && d.back; },
  update(dt) {
    const I = game.input;
    if (PRESSING('right') || PRESSING('confirm')) { PAGE = (PAGE + 1) % HOW_TO.length; game.audio.sfx('select', { vol: .4 }); }
    if (PRESSING('left')) PAGE = (PAGE + HOW_TO.length - 1) % HOW_TO.length;
    if (PRESSING('cancel')) game.go(this.back || 'title', null, { fade: 'black' });
    idleTick(dt, 'attract');
  },
  draw(r) {
    r.sky(['#0a0816', '#241a40']);
    const [head, body] = HOW_TO[PAGE];
    r.overlay(g => E.font.title(g, 'HOW TO PLAY', r.W / 2, Math.round(r.H * .12), { scale: 2, align: 'center' }));
    r.text(head, r.W / 2, r.H * .36, '#ffd36a', { align: 'center', scale: 1, shadow: '#000' });
    body.forEach((t, i) => r.text(t, r.W / 2, r.H * .46 + i * 14, '#e8e0ff', { align: 'center', scale: 1, shadow: '#000' }));
    r.text(PAGE + 1 + ' / ' + HOW_TO.length + '   [' + game.input.label('left') + '] [' + game.input.label('right') + '] PAGE   [' + game.input.label('cancel') + '] BACK', r.W / 2, r.H - 16, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

const scores = {
  pausable: false,
  enter() { IDLE = 0; this.L = List([{ label: 'BACK', act: () => game.go('title', null, { fade: 'black' }) }], { back: () => game.go('title', null, { fade: 'black' }) }); },
  update(dt) { listUpdate(this.L); idleTick(dt, 'attract'); },
  draw(r) {
    r.sky(['#0a0816', '#241a40']);
    r.overlay(g => E.font.title(g, 'HIGH SCORES', r.W / 2, Math.round(r.H * .1), { scale: 2, align: 'center' }));
    const table = loadScores();
    if (!table.length) r.text('NO RECORDS YET. GO AND EAT SOMETHING.', r.W / 2, r.H / 2, '#e8e0ff', { align: 'center', shadow: '#000' });
    table.slice(0, 10).forEach((e, i) => r.text((i + 1 + '.').padEnd(4) + e.name.padEnd(4) + String(e.score).padStart(7) + '  F' + e.floor + '  ' + (e.cls ? HEROES[e.cls].name : ''), r.W / 2, r.H * .24 + i * 14, i === 0 ? '#ffd36a' : '#e8e0ff', { align: 'center', scale: 1, shadow: '#000' }));
    listDraw(r, this.L, r.W / 2, r.H - 26, {});
  }
};

// --- settings: the same rows on the title and the pause overlay ---
function settingsRows(back) {
  const cyc = (key, opts, label) => ({
    label: () => label + ': ' + prefOptLabel(key, opts),
    adj: d => { const i = opts.findIndex(o => o[0] === prefs[key]); prefs[key] = opts[(i + d + opts.length) % opts.length][0]; applyPref(key); savePrefs(); },
    act: () => { const i = opts.findIndex(o => o[0] === prefs[key]); prefs[key] = opts[(i + 1) % opts.length][0]; applyPref(key); savePrefs(); }
  });
  return [
    cyc('glyphs', [['playstation', 'PLAYSTATION'], ['xbox', 'XBOX (A B X Y)']], 'BUTTON SYMBOLS'),
    cyc('difficulty', [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']], 'DIFFICULTY'),
    cyc('cameraView', [['threequarter', 'THREE-QUARTER'], ['topdown', 'TOP-DOWN'], ['iso', 'ISOMETRIC']], 'CAMERA VIEW'),
    cyc('aim', [['off', 'OFF'], ['low', 'LOW 8 DEG'], ['high', 'HIGH 16 DEG']], 'AIM ASSIST'),
    cyc('tips', [[true, 'ON'], [false, 'OFF']], 'NARRATOR TIPS'),
    cyc('voices', [[true, 'ON'], [false, 'OFF']], 'VOICES'),
    cyc('names', [[true, 'ON'], [false, 'OFF']], 'PLAYER NAMES'),
    { label: 'BACK', act: back, adj: null }
  ];
}
function prefOptLabel(key, opts) { const o = opts.find(x => x[0] === prefs[key]); return o ? o[1] : String(prefs[key]); }
function applyPref(key) {
  if (key === 'glyphs') game.input.glyphs = prefs.glyphs;
  if (key === 'cameraView' && game.setView) game.setView(prefs.cameraView);
}
const settings = {
  pausable: false,
  enter(d) { IDLE = 0; this.from = d && d.from || 'title'; this.L = List(settingsRows(() => this.leave()), { back: () => this.leave() }); },
  leave() { game.go(this.from === 'pause' ? 'play' : this.from, this.from === 'pause' ? { resume: true } : null, { fade: 'black' }); },
  update(dt) { listUpdate(this.L); idleTick(dt, 'attract'); },
  draw(r) {
    r.sky(['#0a0816', '#241a40']);
    r.overlay(g => E.font.title(g, 'SETTINGS', r.W / 2, Math.round(r.H * .14), { scale: 2, align: 'center' }));
    listDraw(r, this.L, r.W / 2, r.H * .34, { lh: 18 });
  }
};

// --- about and credits: pages, and the feedback sections (written in 80-about.js) ---
const about = {
  pausable: false,
  enter() { PAGE = 0; IDLE = 0; },
  update(dt) {
    if (PRESSING('right') || PRESSING('confirm')) PAGE = (PAGE + 1) % ABOUT_PAGES.length;
    if (PRESSING('left')) PAGE = (PAGE + ABOUT_PAGES.length - 1) % ABOUT_PAGES.length;
    if (PRESSING('cancel')) game.go('title', null, { fade: 'black' });
    idleTick(dt, 'attract');
  },
  draw(r) {
    r.sky(['#0a0816', '#241a40']);
    const page = ABOUT_PAGES[PAGE];
    r.text(page.title, r.W / 2, 12, '#ffd36a', { align: 'center', scale: 1, shadow: '#000' });
    page.lines.forEach((t, i) => r.text(t, 12, 30 + i * 11, '#e8e0ff', { scale: 1, shadow: '#000' }));
    r.text((PAGE + 1) + ' / ' + ABOUT_PAGES.length + '   [' + game.input.label('left') + '] [' + game.input.label('right') + '] PAGE   [' + game.input.label('cancel') + '] BACK', r.W / 2, r.H - 14, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// --- the card between floors: the realm, the floor's name, the Gaunt's line, and the round's numbers ---
const card = {
  pausable: false,
  enter(d) {
    d = d || {};
    IDLE = 0; this.index = d.index || 0; this.t = 0; this.first = !!d.first;
    const prev = WORLD.stage;
    if (this.index < STAGES.length) loadStage(this.index);
    WORLD.attract = false;
    const st = STAGES[this.index];
    if (SESSION) announceStage(this.index);
    game.audio.music(stageSong(st));
    game.lights.enabled = false;
    WORLD.caption = null;
    // the first card, a new realm's card, the banquet, and the treasure rooms each have their line
    if (this.first) say('start', null, true);
    else if (st.kind === 'boss') say('king_intro', null, true);
    else if (st.realm !== (prev && prev.realm)) say('realm_' + st.realm, null, true);
    else if (st.kind === 'floor' && WORLD.loop) say('descent', null, true);
  },
  update(dt) {
    this.t += dt;
    const go = PRESSING('confirm') || PRESSING('fire') || this.t > (SESSION ? 2 : 6);
    if (go && this.t > .6) {
      const W = WORLD;
      if (this.index >= STAGES.length) { endRun('ending', { fade: 'black' }); return; }
      game.go('play', { index: this.index }, { fade: 'iris', at: W.heroes.find(h => !h.down) });
    }
  },
  draw(r) {
    const st = STAGES[this.index] || STAGES[STAGES.length - 1];
    r.sky(st.kind === 'boss' ? ['#1a0a20', '#3a1a40', '#6a3a50'] : ['#06050e', '#2a1a20', '#4a2a20']);
    r.overlay(g => E.font.title(g, STAGE_LABEL(st).toUpperCase(), r.W / 2, Math.round(r.H * .22), { scale: 2, align: 'center' }));
    r.text(st.name.toUpperCase(), r.W / 2, r.H * .52, '#ffe08a', { align: 'center', scale: 2, shadow: '#000' });
    r.text(REALMS[st.realm].name.toUpperCase(), r.W / 2, r.H * .64, '#c8b8e0', { align: 'center', shadow: '#000' });
    if (WORLD.caption) r.text(WORLD.caption, r.W / 2, r.H * .76, '#fff4c8', { align: 'center', shadow: '#000' });
    if (this.index > 0) WORLD.heroes.forEach((h, i) => r.text(h.name + '  SCORE ' + h.score + '  KILLS ' + h.kills + '  TREASURE ' + (h.treasure || 0), r.W / 2, r.H * .86 + i * 11, h.color, { align: 'center', shadow: '#000' }));
    r.text('[' + game.input.label('confirm') + '] GO', r.W / 2, r.H - 12, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// --- the play scene: the floor, the heroes, the pause overlay (with Dev Tools and the settings) ---
let OV = null;     // the overlay on top of play: { kind: 'pause' | 'dev' | 'settings' | 'howto', L }
let LAST_STAIRS = null;
const play = {
  pausable: false,
  enter(d) {
    d = d || {};
    OV = null; LAST_STAIRS = null;
    WORLD.attract = false;
    game.lights.enabled = true; game.lights.ambient = .42;
    game.cam.bounds = v => WORLD.map.bounds(v);
    game.audio.music(stageSong(WORLD.stage));
    game.allowJoin({ max: 4, onJoin: input => joinMidRun(input) });
  },
  exit() { game.allowJoin(false); game.lights.enabled = false; OV = null; },
  update(dt) {
    const W = WORLD;
    // the pause, the overlays
    if (SESSION) {
      // a round: no pause; it waits for the hub's start, and it ends when the hub ends it
      if (ROUND.ended) { game.go('roundover', null, { fade: 0 }); return; }
      if (!(AIHub.time() >= 0)) return;
    } else if (!OV && game.players.some(p => p.pressed('pause'))) { openPause(); return; }   // (Escape also cancels: the press that opens the menu does nothing else)
    if (OV) { updateOverlay(dt); return; }
    const intents = W.heroes.map(h => ({ hero: h, intent: h.down ? NO_INTENT : h.input ? intentFromInput(h.input, h) : h.remote != null ? remoteIntent(h) : botIntent(h, W.time) }));
    if (CLIENT_COPY()) { clientSend(dt); clientSmooth(dt); }   // a copy in a shared world: its intents go to the host, and the host's world is shown
    else {
      stepWorld(dt, intents);
      if (HOST()) { NET.snapT += dt; if (NET.snapT >= .125) { NET.snapT = 0; sendSnapshot(); } }
    }
    // the animations of each rig, from the bodies' motion this step
    for (const h of W.heroes) {
      const I = intents.find(x => x.hero === h).intent;
      const attack = heroAttack(h);
      h.rig.update(dt, { x: h.body.x, y: h.body.y, z: 0, vx: h.body.vx, vy: h.body.vy, facing: h.facing, hurt: h.hurt > 0, pose: h.down ? 'die' : null, attack, hunch: h.hp < 200 ? .5 : 0 });
    }
    for (const m of W.monsters) if (m.rig) m.rig.update(dt, { x: m.x, y: m.y, z: 0, vx: m.body.vx, vy: m.body.vy, facing: m.facing || 0 });
    // the camera: all the living heroes in view
    const living = W.heroes.filter(h => !h.down);
    if (living.length) game.cam.frame(living.map(h => h.body), { margin: 60, zoom: [.8, 1.1] });
    // the descent: the stair-taker's bonus, then the next floor
    if (W.descend) {
      const h = W.descend; W.descend = null;
      h.score += stairBonus(h);
      say('stairs', h, true);
      W.heroes.forEach(x => { if (!x.down) x.stair = 0; });
      const next = W.descendTo != null ? W.descendTo : W.index + 1;
      W.descendTo = null;
      if (next >= STAGES.length) { endRun('ending', { fade: 'iris', at: h }); return; }
      game.go('card', { index: next }, { fade: 'iris', at: h });
      return;
    }
    // the Iron Gauntlet taken from the King: the ending
    if (W.heroes.some(h => h.gauntlet) && !W.endingGone) { W.endingGone = true; endRun('ending', { fade: 'black' }); return; }
    if (W.over && !W.gameOverGone && !CLIENT_COPY()) {
      W.gameOverGone = true;
      if (SESSION) { hostFinish('over'); game.go('roundover', null, { fade: 'black' }); return; }
      game.go('gameover', null, { fade: 'black' });
    }
  },
  draw(r) {
    if (SESSION && !(AIHub.time() >= 0)) {
      drawWorld(r);
      const t = AIHub.time();
      r.text(isFinite(t) ? String(Math.max(1, Math.ceil(-t))) : 'READY', r.W / 2, r.H / 2 - 20, '#ffe08a', { align: 'center', scale: 3, shadow: '#000' });
      return;
    }
    drawWorld(r);
    drawHud(r);
    if (OV) drawOverlay(r);
  }
};

// Drop out: a player other than the first leaves the run; their hero goes.
function dropOut() {
  const i = WORLD.heroes.findIndex(h => h.input && h.input !== game.input);
  if (i < 0) return;
  game.removePlayer && game.removePlayer(WORLD.heroes[i].input);
  WORLD.heroes.splice(i, 1);
  WORLD.heroes.forEach((h, k) => { h.i = k; });
}
// The run's end: a round finishes with the hub; a single run goes to its ending.
function endRun(to, o) {
  if (SESSION) { hostFinish('ending'); game.go('roundover', null, o); return; }
  game.go(to, null, o);
}
function joinMidRun(input) {
  const taken = WORLD.heroes.map(h => h.cls);
  const cls = CLASS_ORDER.find(c => !taken.includes(c));
  if (!cls) return;
  const h = makeHero(WORLD.heroes.length, cls, input);
  h.name = 'P' + (WORLD.heroes.length + 1);
  h.body.x = WORLD.heroes[0] ? WORLD.heroes[0].body.x : (WORLD.F.starts[0][0] + .5) * T;
  h.body.y = WORLD.heroes[0] ? WORLD.heroes[0].body.y : (WORLD.F.starts[0][1] + .5) * T;
  WORLD.heroes.push(h);
  say('join', h, true);
  game.audio.sfx('powerup', { vol: .5 });
}

// The pause overlay: Resume, How to Play, Dev Tools, Settings, Quit to title.
function openPause() {
  OV = { kind: 'pause', L: List([
    { label: 'RESUME', act: () => { OV = null; } },
    { label: 'HOW TO PLAY', act: () => { OV = { kind: 'howto', L: List([{ label: 'BACK', act: () => openPause() }], { back: () => openPause() }) }; PAGE = 0; } },
    { label: 'DEV TOOLS', act: () => { OV = { kind: 'dev', L: devList(0) }; } },
    { label: 'SETTINGS', act: () => { OV = { kind: 'settings', L: List(settingsRows(() => openPause()), { back: () => openPause() }) }; } },
    { label: 'RESTART FLOOR', act: () => { OV = null; game.go('card', { index: WORLD.index }, { fade: 'black' }); } },
    { label: 'DROP OUT', act: () => { OV = null; dropOut(); } },
    { label: 'QUIT TO TITLE', act: () => { OV = null; game.go('title', null, { fade: 'black' }); } }
  ], { back: () => { OV = null; } }) };
}
function updateOverlay(dt) {
  if (!OV) return;
  if (OV.kind === 'howto') { if (PRESSING('right')) PAGE = (PAGE + 1) % HOW_TO.length; if (PRESSING('left')) PAGE = (PAGE + HOW_TO.length - 1) % HOW_TO.length; }
  const L = OV.L;
  listUpdate(L);
  if (OV && OV.kind === 'pause' && PRESSING('pause')) OV = null;
}
function drawOverlay(r) {
  r.overlay(g => E.px.rect(g, 0, 0, r.W, r.H, 'rgba(6,5,14,0.82)'));
  if (OV.kind === 'howto') {
    const [head, body] = HOW_TO[PAGE];
    r.text(head, r.W / 2, r.H * .3, '#ffd36a', { align: 'center', shadow: '#000' });
    body.forEach((t, i) => r.text(t, r.W / 2, r.H * .4 + i * 14, '#e8e0ff', { align: 'center', shadow: '#000' }));
    listDraw(r, OV.L, r.W / 2, r.H - 30, {});
    return;
  }
  if (OV.kind === 'dev') {
    r.text('DEV TOOLS - THIS RUN IS NOT RECORDED', r.W / 2, 14, '#ff9050', { align: 'center', shadow: '#000' });
    listDraw(r, OV.L, r.W / 2, 36, { lh: 11, scale: 1 });
    return;
  }
  if (OV.kind === 'settings') { r.text('SETTINGS', r.W / 2, 14, '#ffd36a', { align: 'center', shadow: '#000' }); listDraw(r, OV.L, r.W / 2, 40, { lh: 18 }); return; }
  r.text('PAUSED', r.W / 2, r.H * .28, '#ffe08a', { align: 'center', scale: 2, shadow: '#000' });
  listDraw(r, OV.L, r.W / 2, r.H * .42, { lh: 18 });
}

// Dev Tools: four pages (cheats and warps, gives and spawns, and two pages of tuning sliders). Each step applies at once.
const DEV_PAGES = 4;
function devList(page = 0) {
  const toggle = (k, label) => ({ label: () => label + ': ' + (CHEATS[k] ? 'ON' : 'OFF'), act: () => { CHEATS[k] = !CHEATS[k]; } });
  const tune = (k, label, step, min, max) => ({ label: () => label + ': ' + TUNE[k].toFixed(2).replace(/\.00$/, ''), adj: d => { TUNE[k] = clamp(Math.round((TUNE[k] + d * step) * 1000) / 1000, min, max); } });
  const warp = n => ({ label: 'WARP TO FLOOR ' + n, act: () => { OV = null; game.go('card', { index: n - 1 }, { fade: 'black' }); } });
  const PAGES = [
    [toggle('god', 'GOD MODE'), toggle('infinite', 'INFINITE KEYS AND FLASKS'), toggle('freeze', 'FREEZE MONSTERS'), toggle('noGen', 'GENERATORS OFF'), warp(1), warp(2), warp(3),
      { label: () => 'BOT PLAYS PLAYER 1: ' + (WORLD.heroes[0] && !WORLD.heroes[0].input ? 'ON' : 'OFF'), act: () => { const h = WORLD.heroes[0]; if (!h) return; if (h.input) { h.savedInput = h.input; h.input = null; } else { h.input = h.savedInput || game.input; } } },
      toggle('hitboxes', 'SHOW HITBOXES'), toggle('flowfield', 'SHOW MONSTER TARGETS')],
    [
      { label: '+3 KEYS AND +3 FLASKS', act: () => { for (const h of WORLD.heroes) { h.keys = Math.min(9, h.keys + 3); h.flasks = Math.min(9, h.flasks + 3); } } },
      { label: 'HEAL THE PARTY', act: () => { for (const h of WORLD.heroes) if (!h.down) h.hp += 500; } },
      { label: '+1000 SCORE', act: () => { for (const h of WORLD.heroes) h.score += 1000; } },
      { label: 'KILL ALL MONSTERS', act: () => { for (const m of WORLD.monsters) if (m.alive) killMonster(m, null); } },
      { label: 'DESTROY ALL GENERATORS', act: () => { for (const g of WORLD.gens) if (g.alive) damageGen(g, 1e9, null); } },
      { label: 'SPAWN 5 GHOSTS HERE', act: () => { const h = WORLD.heroes[0]; if (h) for (let i = 0; i < 5; i++) spawnMonster('ghost', h.body.x + 30 + i * 6, h.body.y + 20, 1, true); } },
      { label: 'REVEAL SECRETS', act: () => { for (const [k, f] of [...WORLD.fakes]) { WORLD.fakes.delete(k); WORLD.map.set(f.x, f.y, 0); } for (const k of [...WORLD.cracks.keys()]) { WORLD.cracks.delete(k); const [cx, cy] = k.split(',').map(Number); WORLD.map.set(cx, cy, 0); } WORLD.map.version = (WORLD.map.version || 0) + 1; } },
      { label: 'SPAWN 3 GNASHERS HERE', act: () => { const h = WORLD.heroes[0]; if (h) for (let i = 0; i < 3; i++) spawnMonster('gnasher', h.body.x - 30 - i * 6, h.body.y - 20, 2, true); } }
    ],
    [tune('drain', 'DRAIN', .25, 0, 5), tune('heroSpeed', 'HERO SPEED', .1, .5, 2), tune('shotRate', 'SHOT RATE', .25, .5, 3), tune('shotDamage', 'SHOT DAMAGE', .25, .5, 3), tune('magicPower', 'MAGIC POWER', .25, .25, 3), tune('monsterSpeed', 'MONSTER SPEED', .1, .25, 3), tune('monsterDamage', 'MONSTER DAMAGE', .25, 0, 3)],
    [tune('spawnInterval', 'SPAWN INTERVAL', .25, .25, 4), tune('generatorHp', 'GENERATOR HP', .25, .25, 4), tune('maxMonsters', 'MONSTER CAP', 10, 20, 300), tune('stairHold', 'STAIR HOLD', .25, 0, 3),
      { label: 'RESET TUNING TO DEFAULTS', act: () => { Object.assign(TUNE, DEFAULT_TUNE); } }]
  ];
  const rows = [
    { label: () => 'PAGE ' + (page + 1) + ' OF ' + DEV_PAGES + '   LEFT RIGHT TO TURN', adj: d => { OV = { kind: 'dev', L: devList((page + d + DEV_PAGES) % DEV_PAGES) }; } },
    ...PAGES[page],
    { label: 'BACK', act: () => openPause() }
  ];
  return List(rows, { back: () => openPause() });
}

// The game over: each player whose score makes the table enters their initials on the letter wheel with their own
// controller; then the table; then the title.
const gameover = {
  pausable: false,
  enter() {
    this.t = 0; IDLE = 0; game.audio.music(SONGS.fed, { loop: false });
    this.queue = WORLD.heroes.filter(h => qualifies(h.score)).map(h => ({ score: h.score, cls: h.cls, floor: WORLD.index + 1, input: h.input || game.input }));
    game.audio.sfx('hurt');
  },
  update(dt) {
    this.t += dt;
    if (this.queue.length) { game.go('initials', { queue: this.queue, next: 'scores' }, { fade: 'black' }); return; }
    if ((PRESSING('confirm') || PRESSING('fire')) && this.t > 1.5 || this.t > 9) game.go('title', null, { fade: 'black' });
  },
  draw(r) {
    r.sky(['#2a0a0a', '#5a1a1a']);
    r.overlay(g => E.font.title(g, 'GAME OVER', r.W / 2, Math.round(r.H * .2), { scale: 3, align: 'center' }));
    r.text(line('game_over'), r.W / 2, r.H * .48, '#ffe0c8', { align: 'center', shadow: '#000' });
    WORLD.heroes.forEach((h, i) => r.text(h.name + '  SCORE ' + h.score + '  ' + STAGE_LABEL(WORLD.stage), r.W / 2, r.H * .6 + i * 12, h.color, { align: 'center', shadow: '#000' }));
  }
};

// The letter wheel: three letters, moved with up and down, and the slots with left and right. Each entry is typed by
// the player whose score it is, on their own controller, and confirmed on the last letter.
const WHEEL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const initials = {
  pausable: false,
  enter(d) { this.queue = d.queue; this.next = d.next; this.k = 0; this.slot = 0; this.letters = [0, 0, 0]; this.t = 0; IDLE = 0; game.audio.music(SONGS.fed, { loop: false }); },
  update(dt) {
    this.t += dt;
    const e = this.queue[this.k];
    if (!e) { game.go(this.next, null, { fade: 'black' }); return; }
    const p = e.input || game.input;
    if (this.t < .4) return;
    if (p.pressed('up')) this.letters[this.slot] = (this.letters[this.slot] + 1) % WHEEL.length;
    if (p.pressed('down')) this.letters[this.slot] = (this.letters[this.slot] + WHEEL.length - 1) % WHEEL.length;
    if (p.pressed('right')) this.slot = Math.min(2, this.slot + 1);
    if (p.pressed('left')) this.slot = Math.max(0, this.slot - 1);
    if (p.pressed('confirm') || p.pressed('fire')) {
      if (this.slot < 2) this.slot++;
      else {
        const name = this.letters.map(i => WHEEL[i]).join('');
        recordEntry({ name, score: e.score, floor: e.floor, cls: e.cls });
        this.k++; this.slot = 0; this.letters = [0, 0, 0];
      }
    }
  },
  draw(r) {
    r.sky(['#06050e', '#2a1a40']);
    r.overlay(g => E.font.title(g, 'NAME THYSELF', r.W / 2, Math.round(r.H * .16), { scale: 2, align: 'center' }));
    const e = this.queue[this.k];
    if (!e) return;
    r.text(e.cls ? HEROES[e.cls].name : 'MORSEL', r.W / 2, r.H * .36, '#ffe08a', { align: 'center', scale: 2, shadow: '#000' });
    r.text('SCORE ' + e.score + '   FLOOR ' + e.floor, r.W / 2, r.H * .48, '#e8e0ff', { align: 'center', shadow: '#000' });
    this.letters.forEach((li, i) => {
      const x = Math.round(r.W / 2 + (i - 1) * 56);
      r.text(WHEEL[(li + WHEEL.length - 1) % WHEEL.length], x, r.H * .6 - 16, '#8a80a8', { align: 'center', scale: 2, shadow: '#000' });
      r.text(WHEEL[li], x, r.H * .6, i === this.slot ? '#ffd36a' : '#ffffff', { align: 'center', scale: 3, shadow: '#000' });
      r.text(WHEEL[(li + 1) % WHEEL.length], x, r.H * .6 + 22, '#8a80a8', { align: 'center', scale: 2, shadow: '#000' });
    });
    r.text('UP DOWN LETTER   LEFT RIGHT SLOT   ' + game.input.label('confirm') + ' ENTER', r.W / 2, r.H - 16, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// The ending: the Iron Gauntlet raised, the credits, and the choice: Descent II, which loops the descent harder, or the title.
let ENDING_ROW = 0;
const ending = {
  pausable: false,
  enter() {
    this.t = 0; IDLE = 0; ENDING_ROW = 0; game.audio.music(SONGS.victory);
    const rows = WORLD.heroes.map(h => ({ name: CLASS_INITIALS[h.cls], score: h.score, floor: WORLD.index + 1, cls: h.cls }));
    this.saved = [];
    this.queue = rows.filter(r => qualifies(r.score)).map(r => ({ score: r.score, cls: r.cls, floor: r.floor, input: game.input }));
    this.L = List([
      { label: 'DESCENT II', act: () => { WORLD.loop = (WORLD.loop || 0) + 1; WORLD.heroes.forEach(h => { h.gauntlet = false; }); game.go('card', { index: 0 }, { fade: 'black' }); } },
      { label: 'TITLE', act: () => game.go('title', null, { fade: 'black' }) }
    ], { back: () => game.go('title', null, { fade: 'black' }) });
  },
  update(dt) {
    this.t += dt;
    if (this.queue.length) { game.go('initials', { queue: this.queue, next: 'ending' }, { fade: 'black' }); this.queue = []; return; }
    if (this.t > .8) listUpdate(this.L);
  },
  draw(r) {
    r.sky(['#103020', '#2a6a48']);
    r.overlay(g => E.font.title(g, 'GAUNTLET DOWN', r.W / 2, Math.round(r.H * .16), { scale: 2, align: 'center' }));
    wrapWords(line('ending'), 56).forEach((t, i) => r.text(t, r.W / 2, r.H * .36 + i * 12, '#e8ffe8', { align: 'center', shadow: '#000' }));
    r.text('THE GAUNT IS NOT DEAD. IT IS ONLY DIGESTING.', r.W / 2, r.H * .5, '#c8ffc8', { align: 'center', shadow: '#000' });
    WORLD.heroes.forEach((h, i) => r.text(h.name + '  SCORE ' + h.score + '  KILLS ' + h.kills + '  TREASURE ' + (h.treasure || 0), r.W / 2, r.H * .6 + i * 11, h.color, { align: 'center', shadow: '#000' }));
    if (this.saved && this.saved.length) r.text('ON THE TABLE: ' + this.saved.map(s => s.name).join(', '), r.W / 2, r.H * .76, '#ffd36a', { align: 'center', shadow: '#000' });
    if (this.t > .8) listDraw(r, this.L, r.W / 2, r.H * .84, { lh: 16 });
  }
};

// The attract mode: the autopilot plays four heroes through the floors with cheats on. Any input returns to the title.
const attract = {
  pausable: false,
  enter() {
    this.t = 0; this.pos = 0; this.loops = 0;
    game.audio.music(stageSong(WORLD.stage));
    WORLD.attract = true;
    WORLD.heroes = CLASS_ORDER.map((c, i) => { const h = makeHero(i, c, null); h.name = HEROES[c].name.slice(0, 4); return h; });
    loadStage(ATTRACT_STAGES[0]);
    game.audio.music(stageSong(WORLD.stage));
    game.cam.bounds = v => WORLD.map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .42;
    IDLE = 0;
  },
  exit() { WORLD.attract = false; game.lights.enabled = false; },
  update(dt) {
    this.t += dt;
    if (game.input.anyPressed() || (game.input.clicked && game.input.clicked()) || anyInputNow()) { game.input.consumeAll(); game.go('title', null, { fade: 'black' }); return; }
    const intents = WORLD.heroes.map(h => ({ hero: h, intent: h.down ? NO_INTENT : botIntent(h, WORLD.time) }));
    for (const h of WORLD.heroes) if (h.down && h.downT > 1) { rise(h, true); }
    stepWorld(dt, intents);
    for (const h of WORLD.heroes) {
      const attack = heroAttack(h);
      h.rig.update(dt, { x: h.body.x, y: h.body.y, z: 0, vx: h.body.vx, vy: h.body.vy, facing: h.facing, hurt: h.hurt > 0, pose: h.down ? 'die' : null, attack });
    }
    for (const m of WORLD.monsters) if (m.rig) m.rig.update(dt, { x: m.x, y: m.y, z: 0, vx: m.body.vx, vy: m.body.vy, facing: m.facing || 0 });
    const living = WORLD.heroes.filter(h => !h.down);
    if (living.length) game.cam.frame(living.map(h => h.body), { margin: 60, zoom: [.8, 1.1] });
    if (WORLD.descend) { WORLD.descend = null; this.t = 0; this.nextFloor(); }
    if (this.t > 60) { this.t = 0; this.nextFloor(); }
    if (WORLD.over) { this.nextFloor(); }
  },
  nextFloor() {
    this.pos = (this.pos + 1) % ATTRACT_STAGES.length;
    if (this.pos === 0) this.loops++;
    WORLD.heroes.forEach(h => { h.hp = TUNE.startHealth; h.down = false; h.downT = 0; });
    loadStage(ATTRACT_STAGES[this.pos]);
    game.audio.music(stageSong(WORLD.stage));
  },
  draw(r) { drawWorld(r); drawHud(r); }
};



// ---- 61-session.js ----
// AI Hub sessions, shared world. One world for all players, run by the host's copy: it runs every hero (its own player's
// from the keyboard and pad, and the others' from the intents they send), every monster, generator, hazard and the King.
// The other copies send their player's intents to the host (12 a second, unreliable), and show the world the host sends:
// a snapshot of the whole world eight times a second (reliable and ordered, so the copies never fall behind for good),
// and a stage message when the descent moves on. A copy shows its own hero where the host has it, smoothed. The hub's
// card is the game's own (the players lining up, how to win, the controls, the countdown). The host finishes the round
// at time-up, when every hero is down, or at the ending, with the standings by score.
// Outside a session none of this runs.

let HUB = null;
const NET = { intents: new Map(), sendT: 0, snapT: 0, finished: false };
let CARD = { left: null, ready: [], starting: false, asked: false, asking: 0, paused: false };
let ROUND = { ended: false, standings: null, reason: null };
const KINDS = () => Object.keys(MONSTERS);
const HOST = () => !!(HUB && HUB.isHost);
const CLIENT_COPY = () => !!(HUB && !HUB.isHost);
const r1 = v => Math.round(v * 10) / 10;

function hubStart() {
  AIHub.on('card', c => { CARD = Object.assign(CARD, c); });
  AIHub.on('start', () => { game.go('play', { index: 0 }, { fade: 0 }); });
  AIHub.on('time-up', () => { if (HOST()) hostFinish('time'); });
  AIHub.on('end', e => { ROUND.ended = true; ROUND.standings = e && e.standings; ROUND.reason = e && e.reason; game.audio.music(null); });
  AIHub.on('message', (data, from) => onMessage(data, from));
  AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
    if (!info) { game.go('title', null, { fade: 0 }); return; }
    HUB = info;
    // every player's hero, in seat order: the host runs them all; ours takes our own input, the others take the intents
    WORLD.heroes = info.players.map(p => {
      const cls = CLASS_ORDER[p.id % CLASS_ORDER.length];
      const h = makeHero(p.id, cls, p.id === info.me ? game.input : null);
      h.id = p.id; h.name = p.name; h.color = p.color || HEROES[cls].color;
      h.remote = p.id !== info.me ? p.id : null;
      return h;
    });
    WORLD.attract = false;
    loadStage(0);
    AIHub.ready();   // the round's card stays up until the hub's start
  });
}

// --- the messages ---
function onMessage(data, from) {
  if (!data) return;
  if (data.k === 'i' && HOST()) { NET.intents.set(from, data); return; }
  if (data.k === 's' && CLIENT_COPY() && !ROUND.ended) { applySnapshot(data); return; }
  if (data.k === 'st' && CLIENT_COPY()) { loadStage(data.i); game.go('card', { index: data.i }, { fade: 'iris' }); }
}

// The host's intent for a remote player: their last one; their magic counts once.
function remoteIntent(h) {
  const d = NET.intents.get(h.remote);
  if (!d) return NO_INTENT;
  const it = { move: d.m || [0, 0], aim: d.a == null ? null : d.a, fire: !!d.f, magic: !!d.g, plant: !!d.p };
  d.g = false;
  return it;
}

// A client sends its player's intents: every 1/12 s, and at once for a magic press.
function clientSend(dt) {
  const me = WORLD.heroes.find(h => h.id === HUB.me);
  if (!me) return;
  NET.sendT += dt;
  const press = game.input.pressed('magic');
  if (NET.sendT < 1 / 12 && !press) return;
  NET.sendT = 0;
  const it = intentFromInput(game.input, me);
  AIHub.send({ k: 'i', m: [r1(it.move[0]), r1(it.move[1])], a: it.aim == null ? null : +it.aim.toFixed(2), f: it.fire ? 1 : 0, g: press ? 1 : 0, p: it.plant ? 1 : 0 }, { to: HUB.host, reliable: false });
}

// --- the host's snapshots: the whole world, as compact arrays (the nearest of each kind, kept under the message limit) ---
function buildSnapshot() {
  const W = WORLD;
  const hs = W.heroes.map(h => [h.id, r1(h.body.x), r1(h.body.y), Math.round(h.hp), h.score, h.keys, h.flasks, h.down ? 1 : 0, +h.facing.toFixed(2), h.kills, h.treasure || 0, h.hurt > 0 ? 1 : 0, h.stun > 0 ? 1 : 0, h.melee > 0 ? 1 : 0, h.throwT > 0 ? 1 : 0, h.amulet ? h.amulet.type : '', h.specials.join('.'), h.queasy > 0 ? 1 : 0]);
  const ms = W.monsters.filter(m => m.alive).slice(0, 70).map(m => [m.id, KINDS().indexOf(m.kind), m.rank, r1(m.x), r1(m.y), m.hidden ? 1 : 0, +(m.facing || 0).toFixed(2), m.wind > 0 ? 1 : 0]);
  const gs = W.gens.map(g => [Math.round(g.hp), g.alive ? 1 : 0, g.children]);
  const it = W.items.filter(i => i.alive).slice(0, 160).map(i => [i.id, i.ch, r1(i.x), r1(i.y), i.special || '', i.amulet || '']);
  const boss = W.boss ? [Math.round(W.boss.hp), W.boss.max, W.boss.phase, r1(W.boss.x), r1(W.boss.y), W.boss.alive ? 1 : 0, W.boss.state, W.boss.fog > 0 ? 1 : 0, +(W.boss.dying || 0).toFixed(2)] : null;
  return {
    k: 's', t: +W.time.toFixed(2), st: W.index, fc: +W.floorClock.toFixed(2), c: W.caption, ct: +(W.captionT || 0).toFixed(2),
    bell: W.bell ? (W.bell.alive ? 1 : 0) : 0, bh: W.bellHero ? W.bellHero.id : -1, bt: +(W.bellT || 0).toFixed(1), hr: W.hoard ? Math.ceil(W.hoard.left) : null,
    hs, ms, gs, it, doors: W.doors.map(d => d.open ? 1 : 0),
    fakes: [...W.fakes.keys()], cracks: [...W.cracks.entries()], plates: [...W.plates.entries()].filter(([, p]) => p.used).map(([k]) => k),
    shots: W.shots.list.slice(0, 60).map(b => [r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), b.color]),
    foe: W.foeShots.list.slice(0, 40).map(b => [r1(b.x), r1(b.y), b.color]),
    crocks: W.crocks.map(c => [r1(c.sx), r1(c.sy), r1(c.tx), r1(c.ty), +c.t.toFixed(2), c.dur]),
    boss, over: W.over ? 1 : 0
  };
}
function sendSnapshot() {
  const s = buildSnapshot();
  AIHub.send(s, { reliable: true });
}

// A copy applies the host's world: it creates the heroes and monsters it hasn't seen, and sets everything else.
function applySnapshot(s) {
  const W = WORLD, map = W.map;
  if (!map) return;
  W.time = s.t; W.floorClock = s.fc; W.caption = s.c; W.captionT = s.ct;
  W.heroes.forEach(h => { h.seen = false; });
  for (const e of s.hs) {
    const [id, x, y, hp, score, keys, flasks, down, facing, kills, treasure, hurt, stun, melee, throwT, amulet, specials, queasy] = e;
    let h = W.heroes.find(hh => hh.id === id);
    if (!h) continue;
    h.seen = true;
    if (h.body.x === 0 && h.body.y === 0) { h.body.x = x; h.body.y = y; }
    h.tx = x; h.ty = y; h.body.vx = (x - h.body.x) * 8; h.body.vy = (y - h.body.y) * 8;
    h.hp = hp; h.score = score; h.keys = keys; h.flasks = flasks; h.down = !!down; h.facing = facing; h.kills = kills; h.treasure = treasure;
    h.hurt = hurt ? .2 : 0; h.stun = stun ? .3 : 0; h.melee = melee ? .42 : 0; h.throwT = throwT ? .3 : 0;
    h.amulet = amulet ? { type: amulet, t: 20 } : null; h.specials = specials ? specials.split('.') : []; h.queasy = queasy ? 1 : 0;
  }
  // monsters: the host's list, with each one's rig kept from before
  const old = new Map(W.monsters.map(m => [m.id, m]));
  W.monsters = s.ms.map(([id, ki, rank, x, y, hidden, facing, wind]) => {
    const kind = KINDS()[ki];
    const m = old.get(id) || { id, kind, def: MONSTERS[kind], x, y, tx: x, ty: y, rank, spawnRank: rank, hp: 1, alive: true, flash: 0, shrink: 0, fade: 0, r: 6, body: { vx: 0, vy: 0 }, gen: null, facing: 0, bob: 0 };
    m.kind = kind; m.def = MONSTERS[kind]; m.tx = x; m.ty = y; m.rank = rank; m.hidden = !!hidden; m.facing = facing; m.wind = wind ? .3 : 0; m.alive = true;
    return m;
  });
  W.gens.forEach((g, i) => { const v = s.gs[i]; if (v) { g.hp = v[0]; g.alive = !!v[1]; g.children = v[2]; } });
  const itemOld = new Map(W.items.map(i => [i.id, i]));
  W.items = s.it.map(([id, ch, x, y, special, amulet]) => ({ id, ch, def: ITEMS[ch], x, y, r: 5, alive: true, bob: id * 1.3, special: special || null, amulet: amulet || null, cell: '' }));
  void itemOld;
  // the doors and the walls the host has opened
  W.doors.forEach((d, i) => {
    const open = !!s.doors[i];
    if (open && !d.open) for (const [x, y] of d.cells) map.set(x, y, 0);
    if (open !== d.open) { d.open = open; map.version = (map.version || 0) + 1; }
  });
  const fakesNow = new Set(s.fakes);
  for (const [k, f] of [...W.fakes]) if (!fakesNow.has(k)) { W.fakes.delete(k); map.set(f.x, f.y, 0); map.version = (map.version || 0) + 1; }
  for (const k of [...W.cracks.keys()]) if (!s.cracks.some(([kk]) => kk === k)) { const [cx, cy] = k.split(',').map(Number); map.set(cx, cy, 0); map.version = (map.version || 0) + 1; }
  W.cracks = new Map(s.cracks);
  for (const [k, p] of W.plates) p.used = s.plates.includes(k);
  W.shots.list = s.shots.map(([x, y, vx, vy, color]) => ({ x, y, z: 12, vx, vy, r: 3, color, core: '#ffffff', dmg: 0, life: 1, team: 'hero', data: {} }));
  W.foeShots.list = s.foe.map(([x, y, color]) => ({ x, y, z: 12, vx: 0, vy: 0, r: 3, color, core: '#ffe0a0', dmg: 0, life: 1, team: 'foe', data: {} }));
  W.crocks = s.crocks.map(([sx, sy, tx, ty, t, dur]) => ({ sx, sy, tx, ty, t, dur }));
  if (s.boss && W.boss) { const b = W.boss, v = s.boss; b.hp = v[0]; b.max = v[1]; b.phase = v[2]; b.tx = v[3]; b.ty = v[4]; b.alive = !!v[5]; b.state = v[6]; b.fog = v[7] ? 1 : 0; b.dying = v[8]; }
  W.bellHero = W.heroes.find(h => h.id === s.bh) || null; W.bellT = s.bt;
  if (W.bell) W.bell.alive = !!s.bell;
  if (W.hoard) W.hoard.left = s.hr || 0;
  W.over = !!s.over;
}
// Between snapshots the copy's heroes and monsters move toward where the host has them.
function clientSmooth(dt) {
  const k = Math.min(1, dt * 12);
  for (const h of WORLD.heroes) if (h.tx != null) { h.body.x += (h.tx - h.body.x) * k; h.body.y += (h.ty - h.body.y) * k; }
  for (const m of WORLD.monsters) if (m.tx != null) { m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; m.body.x = m.x; m.body.y = m.y; m.bob += dt * 6; }
  if (WORLD.boss && WORLD.boss.tx != null) { WORLD.boss.x += (WORLD.boss.tx - WORLD.boss.x) * k; WORLD.boss.y += (WORLD.boss.ty - WORLD.boss.y) * k; }
}

// The host's stage change: every copy goes to the stage's card.
function announceStage(i) { if (HOST()) AIHub.send({ k: 'st', i }, { reliable: true }); }

// The round's end, by the host: standings by score (ties in one array), and each player's score.
function hostFinish(why) {
  if (!HOST() || NET.finished) return;
  NET.finished = true;
  const hs = WORLD.heroes.slice().sort((a, b) => b.score - a.score);
  const standings = [], scores = {};
  for (const h of hs) {
    scores[h.id] = h.score;
    const last = standings[standings.length - 1];
    if (last && WORLD.heroes.find(x => x.id === last[0]).score === h.score) last.push(h.id); else standings.push([h.id]);
  }
  const kills = {}, treasure = {};
  for (const h of WORLD.heroes) { kills[h.id] = h.kills; treasure[h.id] = h.treasure || 0; }
  AIHub.finish({ standings, scores, stats: { Kills: kills, Treasure: treasure }, awards: {} });
}

// The round over.
const roundover = {
  pausable: false,
  enter() { this.t = 0; },
  update(dt) { this.t += dt; },
  draw(r) {
    r.sky(['#06050e', '#2a1a20']);
    r.overlay(g => E.font.title(g, 'ROUND OVER', r.W / 2, Math.round(r.H * .2), { scale: 3, align: 'center' }));
    const hs = WORLD.heroes.slice().sort((a, b) => b.score - a.score);
    hs.forEach((h, i) => r.text((i + 1) + '. ' + h.name + '  ' + h.score, r.W / 2, r.H * .5 + i * 12, h.color, { align: 'center', scale: 1, shadow: '#000' }));
    if (ROUND.standings) r.text('STANDINGS SET BY THE HUB', r.W / 2, r.H * .84, '#8a80a8', { align: 'center', shadow: '#000' });
    if (ROUND.reason && ROUND.reason !== 'finished') r.text('ENDED: ' + String(ROUND.reason).toUpperCase(), r.W / 2, r.H - 16, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// The round's own card: the game's name, the players in their colours, who is ready, how to win, this player's controls,
// and the time left. Ready on confirm or fire; more time on magic (the card names it).
const hubcard = {
  pausable: false,
  enter() { game.audio.music(SONGS.throwdown); CARD.asked = false; },
  update() {
    if (!HUB) return;
    if (game.input.pressed('confirm') || game.input.pressed('fire')) AIHub.answer('ready');
    if (game.input.pressed('magic')) AIHub.answer('more');
  },
  draw(r) {
    r.sky(['#0a0816', '#2a1a40']);
    r.overlay(g => E.font.title(g, 'GAUNTLETDOWN', r.W / 2, Math.round(r.H * .12), { scale: 2, align: 'center' }));
    if (!HUB) { r.text('CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#e8e0ff', { align: 'center', shadow: '#000' }); return; }
    r.text('ROUND ' + (HUB.round || 1) + '   ' + (CARD.paused ? 'PAUSED' : CARD.left != null ? 'STARTS IN ' + Math.ceil(CARD.left / 1000) : 'GET READY'), r.W / 2, r.H * .26, '#ffe08a', { align: 'center', scale: 1, shadow: '#000' });
    HUB.players.forEach((p, i) => {
      const x = Math.round(r.W * (i + .5) / HUB.players.length), ready = CARD.ready.includes(p.id);
      r.text(p.name + (ready ? '  READY' : ''), x, r.H * .4, p.color || '#ffffff', { align: 'center', shadow: '#000' });
      r.text(HEROES[CLASS_ORDER[p.id % CLASS_ORDER.length]].name, x, r.H * .4 + 12, '#c8c0e0', { align: 'center', shadow: '#000' });
    });
    r.text('MOST POINTS WHEN THE CLOCK RUNS OUT: TREASURE, KILLS, STAIRS. DON\'T STARVE.', r.W / 2, r.H * .6, '#fff4c8', { align: 'center', shadow: '#000' });
    r.text('MOVE ' + game.input.label('left') + game.input.label('up') + game.input.label('down') + game.input.label('right') + '   FIRE ' + game.input.label('fire') + '   MAGIC ' + game.input.label('magic'), r.W / 2, r.H * .72, '#e8e0ff', { align: 'center', shadow: '#000' });
    r.text('[' + game.input.label('confirm') + '] READY   [' + game.input.label('magic') + '] MORE TIME', r.W / 2, r.H - 16, '#ffd36a', { align: 'center', shadow: '#000' });
  }
};

// ---- 80-about.js ----
// About and credits: the pages on the About screen. The Source Information and the feedback sections are the same text
// as the chat reply and exit-interview.json. Each paragraph is wrapped to the screen when the game loads.
const ABOUT_TEXT = [
  ['CREDITS', [
    'GAUNTLETDOWN, VERSION 0.1. Built by Claude Haiku 5.5, medium effort, from PLAN.md and TASK.md.',
    'Engine: my-3D2dge v0.85.2 by Michael Crosato (MIT), handoff folder, unmodified.',
    'Generic props from the engine asset store: Kenney and KayKit, CC0. AI Hub client 1.4.0, unmodified.',
    'Inspired by Gauntlet, Atari Games, 1985. An original homage: no names, art, music or lines from that game are used here.',
    'Music, sound and voices are written in code: original songs, and Babble voices. No audio files.',
    'THE GAUNT IS NOT DEAD. IT IS ONLY DIGESTING.'
  ]],
  ['SOURCE INFORMATION', [
    'Date: 2026-11-04 05:02:53. Source: Gauntlet, Atari Games, 1985 arcade. Plan: PLAN.md.',
    'Genre: arcade co-op dungeon crawler, top-down hack-and-shoot. Perspective: three-quarter overhead, with top-down and isometric in Settings.',
    'Tech: my-3D2dge v0.85.2 on Canvas 2D and Web Audio; tests on Node 24 and Playwright 1.63.0.',
    'Art: the engine look, procedural rigs, textured floors and walls, canvas lighting, pixel sprites, three realms and a banquet hall.',
    'Animation: engine rigs and E.MOVES attacks (overhead swing, throw); bobbing ghosts, lobbed crocks, the King. No new move sets.',
    'Audio: six original songs and layers, sound effects and the Babble voices, all in code.',
    'Online: AI Hub shared-world sessions, 1 to 4 players, one world on the host copy. Testing: 62 headless checks, a scripted playthrough run twice, the hub harness, the engine browser checker. Research: engine docs and source; no web research.',
    'Environment: Claude Code CLI (headless); Linux; Chromium for the checks. Model: Anthropic claude-haiku-5-5, reasoning effort medium. Usage: unknown.'
  ]],
  ['TESTING FEEDBACK', [
    'About 22 issues. Eight were game-breaking: Escape could not open the pause menu, the pause overlay crashed on Resume, the last stairs crashed into a missing floor, a second run would never show its game over, specials, amulets and skip stairs never spawned, a session skipped its own card so nobody could answer Ready, a touch-only device could start a game, and the shared world had no client path until the hub harness exposed it.',
    'The other fourteen were smaller: autopilot stalls on floors after the first and at the King\'s gauntlet, a controller symbol default not applied at boot, overlapping quips on the class select, an over-long Dev Tools page, characters the pixel font cannot draw, a join hint over the fullscreen button, aim assist and the camera view not applied at start-up, and headless saves that silently did nothing.',
    'Most helpful test: the scripted playthrough from title to ending, through every stage, run twice.',
    'Least helpful test: the screenshot look notes, which flagged the flat colours of a dungeon.'
  ]],
  ['ENGINE FEEDBACK', [
    'Liked most: the TileMap, Humanoid rigs, FlowField and Bullets do the hard parts, and headless advance and input make a whole playthrough run in seconds.',
    'Stuck or guessed wrong: yes. Humanoid weapons are sword, gun and staff only, so the axe, bow and shield were drawn as overlays instead. The pixel font has no middle dot. game.go fades, so tests need settle time. Escape is bound to both pause and cancel. A FlowField keeps its old map after a stage change. The engine\'s store is empty headless, so the tests supply a memory store. The hub\'s harness needed unbuffered output from the server.',
    'Built myself: the stage generator with its flood-fill check, the monster, hazard and boss rules, the hero rules, the menu widget, the Babble voices, the songs, and the ghost-mode session.',
    'Hardest: finding supported options, such as Humanoid gear and sound preset names, in the API index and the source, and keeping a moving world\'s state consistent across scenes.',
    'Engine changes: none. The plan\'s changes E1 to E8 were not made; each was worked around. See ENGINE-CHANGES.md.',
    'Would change: one list of valid options for each constructor, and the list of characters the pixel font draws.'
  ]],
  ['PROMPT FEEDBACK', [
    'Liked most: the run-folder rules, the one-command test rule with failures only, and the done checklist.',
    'Confusing: PLAN.md and TASK.md name the title differently (TASK asks for a pick by RNG), and the done condition asks for every feature while the plan is far larger than one session.',
    'Hardest: keeping to what can be finished and tested rather than the full plan: the full move sets, the King\'s complete choreography, and a voice synth that sounds right by ear.',
    'Would change: name a must-have slice and say which features the done condition needs, so the rest can be cut openly.'
  ]]
];
const ABOUT_PAGES = ABOUT_TEXT.map(([title, paras]) => {
  const lines = [];
  for (const p of paras) { for (const l of wrapWords(p, 62)) lines.push(l); lines.push(''); }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return { title, lines };
});

// ---- 99-start.js ----
// The handle for tests and tools (game.debug), and the start.
game.debug = {
  snapshot: () => ({
    scene: game.sceneName, stage: WORLD.index, floor: WORLD.index + 1, t: Math.round(WORLD.time * 100) / 100, floorClock: Math.round(WORLD.floorClock * 100) / 100,
    heroes: WORLD.heroes.map(h => ({ cls: h.cls, x: Math.round(h.body.x), y: Math.round(h.body.y), hp: Math.round(h.hp), score: h.score, keys: h.keys, flasks: h.flasks, kills: h.kills, down: !!h.down, queasy: h.queasy > 0, treasure: h.treasure || 0 })),
    monsters: { total: WORLD.monsters.filter(m => m.alive).length, ghosts: WORLD.monsters.filter(m => m.alive && m.kind === 'ghost').length, gnashers: WORLD.monsters.filter(m => m.alive && m.kind === 'gnasher').length },
    generators: WORLD.gens.filter(g => g.alive).length, items: WORLD.items.filter(i => i.alive).length,
    doorsOpen: WORLD.doors ? WORLD.doors.filter(d => d.open).length : 0, doors: WORLD.doors ? WORLD.doors.length : 0,
    over: !!WORLD.over, attract: !!WORLD.attract, caption: WORLD.caption, stairs: WORLD.F ? WORLD.F.stairs : null, kills: WORLD.kills,
    touchOnly: !!(TITLE && TITLE.touchOnly), cheats: Object.assign({}, CHEATS)
  }),
  // the stairs' cell, for a test to walk onto
  stairsPoint: () => WORLD.F ? [(WORLD.F.stairs[0] + .5) * T, (WORLD.F.stairs[1] + .5) * T] : null,
  teleport(i, x, y) { const h = WORLD.heroes[i]; if (h) { h.body.x = x; h.body.y = y; h.body.vx = 0; h.body.vy = 0; } },
  // hand the heroes straight to a floor (tests, the warp in Dev Tools)
  start(cls) { PICKS = (cls || ['berserker']).map((c, i) => ({ input: i === 0 ? game.input : null, cls: c, locked: true, name: 'P' + (i + 1) })); startRun(); },
  floor: n => makeFloor(n),
  // the attract run's heroes, moved onto floor n (tests)
  warp: n => { loadStage(n); },
  world: () => WORLD,
  // the rules themselves, for the tests
  fn: { damageGen, damageMonster, killMonster, useMagic, spawnMonster, heroDown, rise, stairBonus, seedSim, damageHero, openDoorGroup },
  setDevCheat: (k, v) => { CHEATS[k] = v; },
  makeHero, stepWorld, botIntent,
  validate: () => STAGES.map((s, i) => s.kind === 'floor' || s.kind === 'treasure' ? !!makeFloor(i) : true)
};

applyPref('glyphs');
applyPref('cameraView');
const SCENES = { title, classes, howto, scores, settings, about, card, play, gameover, ending, attract, hubcard, roundover, initials };
game.start({ scenes: SCENES, scene: SESSION ? 'hubcard' : 'title' });
if (SESSION) hubStart();

})();
