/* Gauntletdown: core constants, tuning, helpers. Fragments are concatenated in name order inside one IIFE. */
const E = My3D2dge, { px, clamp } = E;
const TITLE = 'GAUNTLETDOWN';
const TS = 16;                                   // tile size
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

// ---------- tuning (every number here is a Dev slider) ----------
const TUNE_DEF = {
  drain: [1, 0, 5, .1, 'Life drain / s'], startHealth: [700, 100, 2000, 50, 'Start health'], foodHeal: [100, 25, 300, 5, 'Food heal'],
  heroSpeed: [1, .5, 2, .05, 'Hero speed'], shotRate: [1, .5, 3, .05, 'Shot rate'], shotDamage: [1, .5, 3, .1, 'Shot damage'],
  magicPower: [1, .25, 3, .05, 'Magic power'], monsterSpeed: [1, .25, 3, .05, 'Monster speed'], monsterDamage: [1, 0, 3, .05, 'Monster damage'],
  spawnInterval: [1, .25, 4, .05, 'Spawn interval'], generatorHp: [1, .25, 4, .05, 'Generator HP'], maxMonsters: [140, 20, 300, 10, 'Monster cap'],
  impatience: [180, 30, 600, 10, 'Impatience (s)'], titheAt: [120, 30, 600, 10, 'Tithe arrives (s)'], hoardTime: [30, 10, 90, 5, 'Hoard clock (s)'], stairHold: [1, 0, 3, .1, 'Stair hold (s)']
};
const TUNE = {};
for (const k in TUNE_DEF) TUNE[k] = TUNE_DEF[k][0];
const tuneLoad = () => { const s = E.store.get('gauntletdown-tune', null); if (s) for (const k in TUNE_DEF) if (typeof s[k] === 'number') TUNE[k] = clamp(s[k], TUNE_DEF[k][1], TUNE_DEF[k][2]); };
const tuneSave = () => E.store.set('gauntletdown-tune', TUNE);
const tuneReset = () => { for (const k in TUNE_DEF) TUNE[k] = TUNE_DEF[k][0]; tuneSave(); };
const DIFF = { Easy: { drain: .5, dmg: .7, hp: 1.3 }, Normal: { drain: 1, dmg: 1, hp: 1 }, Hard: { drain: 1.5, dmg: 1.3, hp: .85 } };

// ---------- the four fools ----------
const CLASSES = [
  { id: 'berserker', name: 'BERSERKER', who: 'Brakka Ironbelly', color: '#e8443a', speed: 62, armor: .75, shot: 'axe', shotDmg: 3, pierce: 1, shotSpeed: 190, cd: .34, melee: 5, mpow: 1, mgen: 1, moves: ['overhead', 'spin'],
    quip: 'Has never once read a menu.', pips: [4, 3, 5, 1, 2],
    rig: () => new E.Humanoid({ build: 'bulky', size: 1.15, weapon: 'sword', hat: 'helmet', hair: 'short', sleeves: null, cape: { len: 5, width: 5, seg: 2.4 }, colors: { cloth: '#a8322a', pants: '#5a3a22', hair: '#7a3a14', metal: '#b8b0a0', cape: '#6a4a2a', capeIn: '#3a2412', trim: '#e8c860', boot: '#3a2a1c' } }) },
  { id: 'shieldmaiden', name: 'SHIELDMAIDEN', who: 'Hilde Stoutheart', color: '#3b82f6', speed: 66, armor: .6, shot: 'javelin', shotDmg: 2, shotSpeed: 240, cd: .27, melee: 4, mpow: 1.4, mgen: 1, moves: ['thrust', 'overhead'],
    quip: 'Blocks things. Mostly dinner invitations.', pips: [5, 3, 3, 2, 3],
    rig: () => new E.Humanoid({ build: 'heroic', size: 1.1, weapon: 'sword', armor: true, hat: 'helmet', hair: 'ponytail', colors: { cloth: '#3567c2', pants: '#2c3c66', hair: '#e8c060', metal: '#c8d0dc', trim: '#e8e4ff', boot: '#2a2a3a' } }) },
  { id: 'ranger', name: 'RANGER', who: 'Fenn Quickfletch', color: '#22c55e', speed: 78, armor: .9, shot: 'arrow', shotDmg: 1, shotSpeed: 300, cd: .15, melee: 2, mpow: 1.7, mgen: 1, moves: ['jab', 'cross'],
    quip: 'Fast, hungry, and mostly elbows.', pips: [2, 5, 2, 3, 5],
    rig: () => new E.Humanoid({ build: 'heroic', size: 1.05, weapon: 'gun', hood: true, sleeves: 'long', cape: { len: 4, width: 4, seg: 2 }, colors: { cloth: '#2f8a4a', pants: '#6a4a2a', hair: '#8a5a2a', cape: '#2a6a3a', capeIn: '#143a20', trim: '#d8c070', boot: '#4a3220' } }) },
  { id: 'hexer', name: 'HEXER', who: 'Old Mother Wix', color: '#f5b700', speed: 64, armor: 1, shot: 'hex', shotDmg: 2, splash: 1, shotSpeed: 220, cd: .26, melee: 1.5, mpow: 2.5, mgen: 2, moves: ['bash'],
    quip: 'Her soup is a war crime.', pips: [1, 3, 1, 5, 3],
    rig: () => new E.Humanoid({ build: 'chibi', size: 1.05, weapon: 'staff', outfit: 'robe', hat: 'pointed', hunch: .3, sleeves: 'long', face: { eyes: 'big' }, colors: { cloth: '#6a3ab0', pants: '#4a2a80', hair: '#d8d4e0', trim: '#f5b700', metal: '#f5d070' } }) }
];
const STAT_NAMES = ['ARMOR', 'SHOTS', 'MELEE', 'MAGIC', 'SPEED'];

// ---------- monsters ----------
const MON = {
  g: { id: 'ghost', name: 'HUNGERGHOST', hp: 2, spd: [40, 46, 52], dmg: [10, 20, 30], pts: 10, r: 5, ghost: true },
  n: { id: 'gnasher', name: 'GNASHER', hp: 2, spd: [34, 38, 42], dmg: [6, 8, 10], pts: 10, r: 5 },
  o: { id: 'lobber', name: 'POT-LOBBER', hp: 2, spd: [30, 34, 38], dmg: [8, 10, 12], pts: 15, r: 5 },
  i: { id: 'imp', name: 'CINDER IMP', hp: 3, spd: [36, 40, 44], dmg: [6, 8, 10], fire: [8, 10, 12], pts: 20, r: 5 },
  y: { id: 'fryar', name: 'FRYAR', hp: 3, spd: [36, 40, 44], dmg: [8, 10, 12], pts: 25, r: 5 },
  x: { id: 'snatcher', name: 'SNATCHER', hp: 3, spd: [72, 72, 72], dmg: [0, 0, 0], pts: 100, r: 4.5 },
  t: { id: 'tithe', name: 'THE TITHE', hp: 9999, spd: [52, 52, 52], dmg: [0, 0, 0], pts: 1000, r: 6, immune: true }
};
const MON_BY_ID = {}; for (const k in MON) { MON[k].ch = k; MON_BY_ID[MON[k].id] = MON[k]; }
const GEN = {
  G: { id: 'urn', name: 'ASH URN', spawn: 'g' }, N: { id: 'den', name: 'GNASHER DEN', spawn: 'n' }, L: { id: 'hutch', name: 'CROCKERY HUTCH', spawn: 'o' },
  I: { id: 'grate', name: 'EMBER GRATE', spawn: 'i' }, F: { id: 'shrine', name: 'CANDLE SHRINE', spawn: 'y' }, S: { id: 'sacks', name: 'SACK HEAP', spawn: 'x' }, U: { id: 'tureen', name: 'SOUP TUREEN', spawn: 'g' }
};
const SPECIALS = ['ironbrew', 'ogreale', 'quickshot', 'hardshot', 'witchwater', 'featherfoot', 'deeppockets'];
const SPECIAL_NAMES = { ironbrew: 'IRON BREW', ogreale: 'OGRE ALE', quickshot: 'QUICKSHOT TONIC', hardshot: 'HARDSHOT DRAUGHT', witchwater: 'WITCHWATER', featherfoot: 'FEATHERFOOT CORDIAL', deeppockets: 'DEEP POCKETS' };
const SPECIAL_COL = { ironbrew: '#b0a090', ogreale: '#d89a2a', quickshot: '#5ad0f0', hardshot: '#e05a3a', witchwater: '#a050e0', featherfoot: '#80f080', deeppockets: '#c0a060' };
const AMULETS = ['veil', 'ironskin', 'stench', 'ricochet', 'rending'];
const AMULET_NAMES = { veil: 'VEIL', ironskin: 'IRONSKIN', stench: 'STENCH', ricochet: 'RICOCHET', rending: 'RENDING' };
const AMULET_COL = { veil: '#9ab0ff', ironskin: '#ffd860', stench: '#80d040', ricochet: '#60e0ff', rending: '#ff6060' };

// realms
const REALMS = [
  { id: 'larder', name: 'THE LARDER', top: '#6a5a46', side: '#4a3e30', face: 'brick', floor: ['#5a4a38', '#65543f'], mortar: '#2a2018', accent: '#ffb060', props: ['barrel', 'crate', 'pot'], music: 'larder', line: 'The Larder: where the food goes to wait. Wait with it.' },
  { id: 'ossuary', name: 'THE OSSUARY', top: '#8a8a94', side: '#5e5e6a', face: 'stone', floor: ['#4a4a58', '#53536a'], mortar: '#1e1e28', accent: '#a0c0ff', props: ['skull', 'bones', 'candelabra', 'cobweb'], music: 'ossuary', line: 'The Ossuary: everyone here is on a diet. Permanently.' },
  { id: 'furnace', name: 'THE FURNACE', top: '#7a4030', side: '#4e281e', face: 'rock', floor: ['#40282a', '#4a2c2e'], mortar: '#1a0c0c', accent: '#ff7030', props: ['brazier', 'firedrum', 'rock'], music: 'furnace', line: 'The Furnace: the kitchen of the kitchen. Mind the heat. Mind the gravy.' },
  { id: 'banquet', name: 'THE BANQUET', top: '#8a6a3a', side: '#5a4224', face: 'plank', floor: ['#5a2a2e', '#662f34'], mortar: '#200c10', accent: '#ffd860', props: ['candelabra', 'banner', 'statue'], music: 'boss', line: 'The Banquet: you are the main course. He has been waiting.' }
];

// the descent: floors, treasure rooms and the banquet
const PLAN = [
  { kind: 'floor', no: 1, realm: 0, name: 'THE FIRST HELPING', size: [44, 28], rooms: 6, gens: 1, mons: ['n', 'g'], doors: 1, food: 4 },
  { kind: 'floor', no: 2, realm: 0, name: 'CRUMBS AND CRUMBLES', size: [52, 34], rooms: 8, gens: 3, mons: ['n', 'g', 'o'], doors: 2, food: 5, skip: 4 },
  { kind: 'floor', no: 3, realm: 0, name: 'THE LONG PANTRY', size: [56, 36], rooms: 9, gens: 4, mons: ['n', 'g', 'o', 'i'], doors: 2, food: 6, traps: 1 },
  { kind: 'treasure', name: 'THE HOARD OF HAM' },
  { kind: 'floor', no: 4, realm: 1, name: 'THE BONE LARDER', size: [56, 38], rooms: 10, gens: 5, mons: ['n', 'g', 'y', 'i'], doors: 3, food: 6, traps: 1 },
  { kind: 'floor', no: 5, realm: 1, name: 'THIEVES AND TITHES', size: [60, 40], rooms: 11, gens: 6, mons: ['n', 'g', 'o', 'y', 'x'], doors: 3, food: 7, traps: 2, force: 1, bell: 1 },
  { kind: 'floor', no: 6, realm: 1, name: 'THE GRAVY CRYPT', size: [60, 40], rooms: 11, gens: 7, mons: ['n', 'g', 'y', 'i', 'x'], doors: 3, food: 7, traps: 2, force: 2, runes: 1, tithe: 1 },
  { kind: 'treasure', name: 'THE HOARD OF BONES' },
  { kind: 'floor', no: 7, realm: 2, name: 'THE BROILING HALL', size: [62, 42], rooms: 12, gens: 8, mons: ['n', 'g', 'o', 'i', 'y'], doors: 4, food: 8, traps: 2, force: 2, runes: 2, lava: 1, spikes: 1 },
  { kind: 'floor', no: 8, realm: 2, name: 'THE LAST SIMMER', size: [64, 44], rooms: 13, gens: 9, mons: ['n', 'g', 'o', 'i', 'y', 'x'], doors: 4, food: 9, traps: 3, force: 3, runes: 2, lava: 1, spikes: 2, bell: 1, tithe: 1 },
  { kind: 'boss', no: 9, realm: 3, name: 'THE BANQUET OF KING FAMISH' }
];

// the Gaunt's lines (original; short, booming, third person, darkly funny)
const LINES = {
  start: 'THE DESCENT BEGINS. DINNER IS SERVED.',
  low400: ['{n} IS GETTING PECKISH.', '{n} HAS A RUMBLING IN THE DUNGEON.'], low200: ['{n} NEEDS FOOD. URGENTLY.', '{n} IS FADING. SOMEONE FEED {n}.'], low100: '{n} IS NEARLY SOUP.',
  fall: ['{n} HAS BEEN EATEN.', '{n} IS NOW A SNACK.'], rise: '{n} IS BACK FOR SECONDS.',
  shotfood: '{n} SHOT THE SUPPER.', shotstew: 'GOOD AIM, {n}. THAT STEW WAS PLOTTING.', flask: '{n} POPS A FLASK. EVERYTHING FLINCHES.',
  key: 'A KEY. SOMEONE LOCKED THE FOOD AWAY.', door: 'THE DOOR REMEMBERS WHAT KEYS ARE FOR.', food: 'FOOD. AT LAST, A GOOD DECISION.', stew: 'THAT STEW WAS NOT FOR EATING.',
  gen: 'A GENERATOR CRUMBLES. IT WAS ONLY TRYING TO HELP.', gnasher: 'GNASHERS. THEY HAVE ONE PERSONALITY.', ghost: 'HUNGERGHOSTS. THEY EAT EMPTY PLATES. AND YOU.',
  lobber: 'POT-LOBBERS. CROCKERY AS A LIFESTYLE.', imp: 'CINDER IMPS SPIT FIRE. ONTO YOUR SUPPER.', fryar: 'THE FRYARS ARE HERE. NOW YOU SEE THEM. NOW YOU DO NOT.',
  snatcher: 'A SNATCHER. YOUR POCKETS ARE NOT YOUR OWN.', stolen: 'THE SNATCHER HAS YOUR {i}. CHASE IT.',
  tithe: 'THE TITHE ARRIVES. ONLY MAGIC CAN SEND IT HOME.', tithePaid: 'THE TITHE IS PAID.', titheDead: 'THE TITHE HAS BEEN ARGUED WITH. AND LOST.',
  bell: 'THE DINNER BELL RINGS. {n} IS ON THE MENU.', trap: 'A TRAP. A TIDY ONE.', fake: 'THAT WALL WAS LYING.', crack: 'THE WALL GIVES UP. GOOD FOR IT.',
  force: 'FORCE FIELDS. LURE THE HORDE THROUGH THEM.', rune: 'A STUN RUNE. IT IS NOT A WELCOME MAT.', teleport: 'THE FLOOR SWALLOWS {n}. AND SPITS THEM OUT.',
  stairs: 'DOWN WE GO.', short: 'TOOK THE SHORT WAY DOWN.', chest: 'A CHEST. SOMEONE WAS SAVING THAT.', crown: 'A CROWN! THE DUNGEON SULKS.',
  patience: 'THE GAUNT GROWS IMPATIENT.', doorsOpen: 'EVERY DOOR OPENS. THE GAUNT IS BORED.', wallsOpen: 'EVERY WALL IS A STAIR NOW. HURRY UP.',
  stun: 'FROM HERE, SHOTS HURT FRIENDS. SPEAK KINDLY.', hoard: 'THE HOARD. TAKE IT ALL. QUICKLY.', slam: 'THE HOARD SLAMS SHUT.', hoardAll: 'EVERY COIN. GREED IS A VIRTUE HERE.',
  boss: 'KING FAMISH RISES FROM THE HEAD OF THE TABLE.', boss2: 'THE KING EATS HIS OWN PLATTERS. NOW HE IS CROSS.', boss3: 'THE FOG OF HUNGER. EVERYTHING DRAINS FASTER.', bossDead: 'THE KING IS DINED UPON. THE DUNGEON IS QUIET.',
  over: 'THE GAUNT IS FED.', score: 'A NEW HIGH SCORE. THE GAUNT IS ALMOST IMPRESSED.', hint1: 'FOOD IS LIFE. LIFE IS DRAINING. DO THE MATH.', hint2: 'HOLD FIRE. THE HORDE WILL DO THE REST.',
  cont: 'CONTINUE? THE KITCHEN IS STILL OPEN.', descent2: 'DESCENT II. THE MONSTERS ATE LARGER.', hunger: 'THE GAUNT IS HUNGRY. FEED IT PEOPLE.'
};
const VERBS = ['BERSERKER', 'SHIELDMAIDEN', 'RANGER', 'HEXER'];
