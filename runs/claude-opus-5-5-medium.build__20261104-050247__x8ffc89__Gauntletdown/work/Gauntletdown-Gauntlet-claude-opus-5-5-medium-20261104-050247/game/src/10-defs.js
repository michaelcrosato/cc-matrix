/* 10-defs: heroes, monsters, generators, items, special potions and amulets, as registry entries. */

/* ---- HEROES: four fools ---- */
def('heroes', 'berserker', {
  name: 'BERSERKER', who: 'BRAKKA IRONBELLY', seat: 0, color: '#e8443a', speed: 62, armor: .75,
  shot: { kind: 'axe', dmg: 3, pierce: 1, speed: 190, cool: .34, splash: 0 }, melee: 5, moves: ['overhead', 'spin'], throwMove: 'throw', magic: [1, 1],
  voice: 'berserker', pips: [4, 4, 5, 2, 2], quip: 'HITS FIRST. EATS SECOND. THINKS RARELY.',
  rig: () => new E.Humanoid({ size: 1.2, build: 'bulky', weapon: 'axe', hat: { style: 'horned', color: '#7a7a86', horn: '#f0e4c4' }, hair: 'long', sleeves: 'none', armor: true,
    cape: { len: 5, width: 5, seg: 2.4 }, colors: { skin: '#e8b48a', hair: '#c0582a', cloth: '#8a3a26', trim: '#d8a040', pants: '#5a3a26', boot: '#3a2418', belt: '#2a1a12', cape: '#6a4a32', capeIn: '#3a2618', metal: '#c8ccd8', plate: '#8a8a96', staff: '#6a4024' } })
});
def('heroes', 'shieldmaiden', {
  name: 'SHIELDMAIDEN', who: 'HILDE STOUTHEART', seat: 1, color: '#3b82f6', speed: 66, armor: .6,
  shot: { kind: 'javelin', dmg: 2, pierce: 0, speed: 240, cool: .27, splash: 0 }, melee: 4, moves: ['thrust', 'bash'], throwMove: 'throw', magic: [1.4, 1],
  voice: 'shieldmaiden', pips: [5, 3, 4, 3, 3], quip: 'THE SHIELD IS FOR YOU. THE SPEAR IS FOR THEM.',
  rig: () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: 'sword', offhand: 'shield', hat: { style: 'helmet', color: '#b8c0d0' }, hair: 'ponytail', armor: true,
    cape: { len: 5, width: 4, seg: 2.4 }, colors: { skin: '#f4caa8', hair: '#f0d070', cloth: '#2a5ab0', trim: '#e8e0c0', pants: '#3a4a6a', boot: '#4a3a2a', belt: '#5a3a1e', cape: '#1e3a80', capeIn: '#122454', metal: '#e0e4ee', plate: '#a8b0c4', shield: '#2a6ad0' } })
});
def('heroes', 'ranger', {
  name: 'RANGER', who: 'FENN QUICKFLETCH', seat: 2, color: '#22c55e', speed: 78, armor: .9,
  shot: { kind: 'arrow', dmg: 1, pierce: 0, speed: 300, cool: .15, splash: 0 }, melee: 2, moves: ['jab', 'cross'], throwMove: 'bow', magic: [1.7, 1],
  voice: 'ranger', pips: [2, 5, 2, 4, 5], quip: 'FASTEST LEGS IN HOLLOWMERE. FASTEST TO RUN OUT OF ARROWS? NEVER.',
  rig: () => new E.Humanoid({ size: 1.1, build: 'heroic', weapon: 'bow', hood: true, outfit: 'tunic', sleeves: 'long', hair: 'short',
    cape: { len: 4, width: 3.5, seg: 2.2 }, colors: { skin: '#e8c0a0', hair: '#2e6a32', cloth: '#3a8a3e', trim: '#c8a868', pants: '#5a4a32', boot: '#4a3220', belt: '#6a4a26', cape: '#2a5a2e', capeIn: '#1a3a1e', staff: '#8a5a30', glove: '#6a4a2a' } })
});
def('heroes', 'hexer', {
  name: 'HEXER', who: 'OLD MOTHER WIX', seat: 3, color: '#f5b700', speed: 64, armor: 1,
  shot: { kind: 'hex', dmg: 2, pierce: 0, speed: 220, cool: .26, splash: 1 }, melee: 1.5, moves: ['bash'], throwMove: 'cast', magic: [2.5, 2],
  voice: 'hexer', pips: [1, 4, 1, 5, 3], quip: 'SHE HAS CURSED BETTER DUNGEONS THAN THIS.',
  rig: () => new E.Humanoid({ size: 1.1, weapon: 'staff', hat: { style: 'pointed', color: '#5a2a8a' }, outfit: 'robe', sleeves: 'long', hunch: .3, hair: 'long', face: { eyes: 'big', bangs: .4 },
    colors: { skin: '#e8d0b0', hair: '#d8d4dc', cloth: '#6a3a9a', trim: '#f0c040', belt: '#f0c040', boot: '#3a2a3a', eye: '#3a2a5a', staff: '#7a5030', orb: '#ffd84a' } })
});
const HERO_ORDER = ['berserker', 'shieldmaiden', 'ranger', 'hexer'];
const PIP_NAMES = ['ARMOR', 'SHOTS', 'MELEE', 'MAGIC', 'SPEED'];

/* ---- MONSTERS ---- (hp per rank, speed and damage by rank 1..3, points per rank) */
def('monsters', 'ghost', { name: 'HUNGERGHOST', hp: 2, speed: [40, 46, 52], dmg: [10, 20, 30], points: 10, ai: 'ghost', r: 5, fly: true, noMelee: true, tip: 'tip_ghost', voice: 'ghost' });
def('monsters', 'gnasher', { name: 'GNASHER', hp: 2, speed: [34, 38, 42], dmg: [6, 8, 10], points: 10, ai: 'melee', reach: 14, wind: .32, every: .9, r: 5, tip: 'tip_gnasher', voice: 'gnasher', move: 'overhead' });
def('monsters', 'lobber', { name: 'POT-LOBBER', hp: 2, speed: [30, 34, 38], dmg: [8, 10, 12], points: 15, ai: 'lob', every: [2.2, 1.9, 1.6], r: 5, tip: 'tip_lobber', voice: 'lobber' });
def('monsters', 'imp', { name: 'CINDER IMP', hp: 3, speed: [36, 40, 44], dmg: [6, 8, 10], fire: [8, 10, 12], points: 20, ai: 'imp', reach: 10, wind: .3, every: 1.8, r: 5, fly: false, tip: 'tip_imp', voice: 'imp' });
def('monsters', 'fryar', { name: 'FRYAR', hp: 3, speed: [36, 40, 44], dmg: [8, 10, 12], points: 25, ai: 'fryar', reach: 14, wind: .3, every: 1, r: 5, tip: 'tip_fryar', voice: 'fryar', move: 'overhead' });
def('monsters', 'snatcher', { name: 'SNATCHER', hp: 3, speed: [72, 72, 72], dmg: [0, 0, 0], points: 100, ai: 'snatch', r: 4.5, tip: 'tip_snatcher', voice: 'snatcher' });
def('monsters', 'tithe', { name: 'THE TITHE', hp: 1, speed: [52, 52, 52], dmg: [0, 0, 0], points: 1000, ai: 'tithe', r: 6, fly: true, immune: true, voice: 'tithe' });
const MON_CHAR = { g: 'ghost', n: 'gnasher', o: 'lobber', i: 'imp', y: 'fryar', x: 'snatcher', t: 'tithe' };

/* ---- GENERATORS ---- */
def('gens', 'urn', { name: 'ASH URN', spawns: 'ghost' });
def('gens', 'den', { name: 'GNASHER DEN', spawns: 'gnasher' });
def('gens', 'hutch', { name: 'CROCKERY HUTCH', spawns: 'lobber' });
def('gens', 'grate', { name: 'EMBER GRATE', spawns: 'imp' });
def('gens', 'shrine', { name: 'CANDLE SHRINE', spawns: 'fryar' });
def('gens', 'sacks', { name: 'SACK HEAP', spawns: 'snatcher' });
def('gens', 'tureen', { name: 'SOUP TUREEN', spawns: 'ghost' });
const GEN_CHAR = { G: 'urn', N: 'den', L: 'hutch', I: 'grate', F: 'shrine', S: 'sacks' };

/* ---- ITEMS ---- (heal: health; shoot: a shot destroys it; pts: points) */
def('items', 'key', { name: 'KEY', pts: 0 });
def('items', 'roast', { name: 'ROAST', heal: 1, pts: 10, food: true });
def('items', 'loaf', { name: 'LOAF', heal: .5, pts: 5, food: true });
def('items', 'cider', { name: 'CIDER', heal: 1, pts: 10, food: true, shoot: true });
def('items', 'stew', { name: 'SPOILED STEW', pts: 0, shoot: true });
def('items', 'flask', { name: 'BLAST FLASK', pts: 0, shoot: true });
def('items', 'special', { name: 'SPECIAL POTION', pts: 250 });
def('items', 'amulet', { name: 'AMULET', pts: 100 });
def('items', 'gold', { name: 'GOLD', pts: 100, treasure: true });
def('items', 'gem', { name: 'GEM', pts: 250, treasure: true });
def('items', 'chest', { name: 'CHEST', pts: 500, treasure: true });
def('items', 'lchest', { name: 'LOCKED CHEST', pts: 1000, treasure: true });
def('items', 'crown', { name: 'CROWN', pts: 2500, treasure: true });
def('items', 'platter', { name: 'FEAST PLATTER', heal: 2, pts: 20, food: true, shoot: true });
def('items', 'bell', { name: 'DINNER BELL', pts: 0 });
def('items', 'gauntlet', { name: 'THE IRON GAUNTLET', pts: 5000, treasure: true });
const ITEM_CHAR = { k: 'key', f: 'roast', b: 'loaf', j: 'cider', z: 'stew', m: 'flask', u: 'special', a: 'amulet', $: 'gold', '*': 'gem', h: 'chest', l: 'lchest', w: 'crown', B: 'bell' };

const SPECIALS = {
  ironbrew: { name: 'IRON BREW', color: '#9aa4b8', what: 'damage taken x0.8' },
  ogreale: { name: 'OGRE ALE', color: '#c87a2a', what: 'melee x1.5' },
  quickshot: { name: 'QUICKSHOT TONIC', color: '#4ad0e8', what: 'faster throws' },
  hardshot: { name: 'HARDSHOT DRAUGHT', color: '#e84a4a', what: 'shots +1 damage' },
  witchwater: { name: 'WITCHWATER', color: '#b05ae8', what: 'magic x1.5' },
  featherfoot: { name: 'FEATHERFOOT CORDIAL', color: '#8ae86a', what: 'speed x1.12' },
  deeppockets: { name: 'DEEP POCKETS', color: '#e8c84a', what: 'carry 12 keys and flasks' }
};
const AMULETS = {
  veil: { name: 'VEIL', color: '#c8d0ff', what: 'monsters lose you' },
  ironskin: { name: 'IRONSKIN', color: '#f0c040', what: 'no damage' },
  stench: { name: 'STENCH', color: '#7ad04a', what: 'monsters flee you' },
  ricochet: { name: 'RICOCHET', color: '#4ab0f0', what: 'shots bounce' },
  rending: { name: 'RENDING', color: '#f04a8a', what: 'shots pierce all' }
};
const AMULET_TIME = 20;
