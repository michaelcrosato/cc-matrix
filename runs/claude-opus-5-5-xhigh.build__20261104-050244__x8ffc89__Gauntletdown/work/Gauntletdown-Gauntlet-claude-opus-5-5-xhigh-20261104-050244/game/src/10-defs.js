/* ---- HEROES: four archetypes with clearly different stats (shots, melee, magic, armor, speed) ---- */
// pips: ARMOR, SHOTS, MELEE, MAGIC, SPEED (1-5) for the class cards
def('heroes', 'berserker', { name: 'BERSERKER', who: 'BRAKKA IRONBELLY', seat: 0, color: '#e8443a', speed: 62, armor: .75,
  shot: { kind: 'axe', dmg: 3, pierce: 1, speed: 190, cd: .34, splash: 0 }, melee: { dmg: 5, moves: ['overhead', 'spin'] }, magic: [1, 1], throwMove: 'throw',
  pips: [4, 4, 5, 1, 2], voice: 'berserker' });
def('heroes', 'shieldmaiden', { name: 'SHIELDMAIDEN', who: 'HILDE STOUTHEART', seat: 1, color: '#3b82f6', speed: 66, armor: .6,
  shot: { kind: 'javelin', dmg: 2, pierce: 0, speed: 240, cd: .27, splash: 0 }, melee: { dmg: 4, moves: ['thrust', 'bash'] }, magic: [1.4, 1], throwMove: 'throw',
  pips: [5, 3, 4, 2, 3], voice: 'shieldmaiden' });
def('heroes', 'ranger', { name: 'RANGER', who: 'FENN QUICKFLETCH', seat: 2, color: '#22c55e', speed: 78, armor: .9,
  shot: { kind: 'arrow', dmg: 1, pierce: 0, speed: 300, cd: .15, splash: 0 }, melee: { dmg: 2, moves: ['jab', 'cross'] }, magic: [1.7, 1], throwMove: 'bow',
  pips: [2, 3, 2, 3, 5], voice: 'ranger' });
def('heroes', 'hexer', { name: 'HEXER', who: 'OLD MOTHER WIX', seat: 3, color: '#f5b700', speed: 64, armor: 1,
  shot: { kind: 'hex', dmg: 2, pierce: 0, speed: 220, cd: .26, splash: 1 }, melee: { dmg: 1.5, moves: ['bash'] }, magic: [2.5, 2], throwMove: 'cast',
  pips: [1, 4, 1, 5, 2], voice: 'hexer' });
const CLASSES = ['berserker', 'shieldmaiden', 'ranger', 'hexer'];
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

/* ---- MONSTERS: strength ranks 1-3 (hp = base x rank; a wounded monster shrinks a rank). Numbers are per rank ---- */
def('monsters', 'ghost', { name: 'HUNGERGHOST', ch: 'g', gen: 'G', hp: 2, speed: [40, 46, 52], dmg: [10, 20, 30], points: 10, r: 5, fly: true, noMelee: true, ai: 'ghost', tip: 'tip_ghost' });
def('monsters', 'gnasher', { name: 'GNASHER', ch: 'n', gen: 'N', hp: 2, speed: [34, 38, 42], dmg: [6, 8, 10], points: 10, r: 5.5, ai: 'melee', wind: .32, reach: 14, every: .9, tip: 'tip_gnasher' });
def('monsters', 'lobber', { name: 'POT-LOBBER', ch: 'o', gen: 'L', hp: 2, speed: [30, 34, 38], flee: 46, dmg: [8, 10, 12], points: 15, r: 5, ai: 'lobber', every: [2.2, 1.9, 1.6], keep: [70, 110], tip: 'tip_lobber' });
def('monsters', 'imp', { name: 'CINDER IMP', ch: 'i', gen: 'I', hp: 3, speed: [36, 40, 44], dmg: [6, 8, 10], fire: [8, 10, 12], points: 20, r: 5, ai: 'imp', wind: .3, reach: 10, every: .9, fireEvery: 1.8, tip: 'tip_imp' });
def('monsters', 'fryar', { name: 'FRYAR', ch: 'y', gen: 'F', hp: 3, speed: [36, 40, 44], dmg: [8, 10, 12], points: 25, r: 5.5, ai: 'fryar', wind: .3, reach: 14, every: 1, seen: 2, unseen: 1.4, tip: 'tip_fryar' });
def('monsters', 'snatcher', { name: 'SNATCHER', ch: 'x', gen: 'S', hp: 3, speed: [72, 72, 72], dmg: [0, 0, 0], points: 100, r: 5, ai: 'snatcher', rank1: true, tip: 'tip_snatcher' });
def('monsters', 'tithe', { name: 'THE TITHE', ch: 't', hp: 999, speed: [52, 52, 52], dmg: [0, 0, 0], points: 1000, r: 6, ai: 'tithe', immune: true, fly: true, tip: 'tithe_comes' });
const MON_BY_CH = {}; for (const m of all('monsters')) MON_BY_CH[m.ch] = m.id;

/* ---- GENERATORS: breed one kind until broken; hp 4 per rank; a rank (and a damage state) lost every 4 hp ---- */
def('gens', 'urn', { name: 'ASH URN', ch: 'G', spawns: 'ghost', shape: 'gd-urn' });
def('gens', 'den', { name: 'GNASHER DEN', ch: 'N', spawns: 'gnasher', shape: 'gd-den' });
def('gens', 'hutch', { name: 'CROCKERY HUTCH', ch: 'L', spawns: 'lobber', shape: 'gd-hutch' });
def('gens', 'grate', { name: 'EMBER GRATE', ch: 'I', spawns: 'imp', shape: 'gd-grate', flat: true });
def('gens', 'shrine', { name: 'CANDLE SHRINE', ch: 'F', spawns: 'fryar', shape: 'gd-shrine' });
def('gens', 'sacks', { name: 'SACK HEAP', ch: 'S', spawns: 'snatcher', shape: 'gd-sacks' });
def('gens', 'tureen', { name: 'SOUP TUREEN', ch: 'U', spawns: 'ghost', shape: 'gd-tureen', onTable: true });
const GEN_BY_CH = {}; for (const g of all('gens')) GEN_BY_CH[g.ch] = g.id;

/* ---- ITEMS ---- kind: food | treasure | key | flask | special | amulet | chest. shoot: what a hero shot does to it */
def('items', 'key', { ch: 'k', kind: 'key', points: 0, name: 'KEY' });
def('items', 'roast', { ch: 'f', kind: 'food', heal: 1, points: 10, name: 'ROAST' });
def('items', 'loaf', { ch: 'b', kind: 'food', heal: .5, points: 5, name: 'LOAF' });
def('items', 'cider', { ch: 'j', kind: 'food', heal: 1, points: 10, shoot: 'destroy', name: 'CIDER' });
def('items', 'stew', { ch: 'z', kind: 'stew', heal: -.5, points: 0, shoot: 'destroy', name: 'SPOILED STEW' });
def('items', 'flask', { ch: 'm', kind: 'flask', points: 0, shoot: 'blast', name: 'BLAST FLASK' });
def('items', 'special', { ch: 'u', kind: 'special', points: 250, name: 'POTION' });
def('items', 'amulet', { ch: 'a', kind: 'amulet', points: 100, name: 'AMULET' });
def('items', 'gold', { ch: '$', kind: 'treasure', points: 100, name: 'GOLD' });
def('items', 'gem', { ch: '*', kind: 'treasure', points: 250, name: 'GEM' });
def('items', 'chest', { ch: 'h', kind: 'chest', points: 500, name: 'CHEST' });
def('items', 'lockedchest', { ch: 'l', kind: 'chest', locked: true, points: 1000, name: 'LOCKED CHEST' });
def('items', 'crown', { ch: 'w', kind: 'treasure', points: 2500, name: 'CROWN' });
def('items', 'platter', { ch: 'P', kind: 'food', heal: 2, points: 20, shoot: 'destroy', onTable: true, name: 'FEAST PLATTER' });
def('items', 'gauntlet', { ch: '', kind: 'gauntlet', points: 5000, name: 'THE IRON GAUNTLET' });
const ITEM_BY_CH = {}; for (const it of all('items')) if (it.ch) ITEM_BY_CH[it.ch] = it.id;

/* ---- SPECIAL POTIONS: permanent for the rest of the game, once per hero per type ---- */
def('specials', 'ironbrew', { name: 'IRON BREW', color: '#9aa6b8', what: 'DAMAGE TAKEN -20%' });
def('specials', 'ogreale', { name: 'OGRE ALE', color: '#c87a2a', what: 'MELEE x1.5' });
def('specials', 'quickshot', { name: 'QUICKSHOT TONIC', color: '#4ad0e8', what: 'FASTER THROWS' });
def('specials', 'hardshot', { name: 'HARDSHOT DRAUGHT', color: '#e84a4a', what: 'SHOT DAMAGE +1' });
def('specials', 'witchwater', { name: 'WITCHWATER', color: '#b05ae8', what: 'MAGIC x1.5' });
def('specials', 'featherfoot', { name: 'FEATHERFOOT CORDIAL', color: '#8ae86a', what: 'SPEED +12%' });
def('specials', 'deeppockets', { name: 'DEEP POCKETS', color: '#e8c84a', what: 'CARRY 12 KEYS AND FLASKS' });

/* ---- AMULETS: a 20 second power ---- */
def('amulets', 'veil', { name: 'VEIL', color: '#b8c8ff', what: 'MONSTERS LOSE TRACK OF YOU' });
def('amulets', 'ironskin', { name: 'IRONSKIN', color: '#e8c060', what: 'NO DAMAGE' });
def('amulets', 'stench', { name: 'STENCH', color: '#8ad04a', what: 'MONSTERS FLEE FROM YOU' });
def('amulets', 'ricochet', { name: 'RICOCHET', color: '#e88a3a', what: 'SHOTS BOUNCE OFF WALLS' });
def('amulets', 'rending', { name: 'RENDING', color: '#e84a8a', what: 'SHOTS PIERCE EVERYTHING' });
const AMULET_TIME = 20;
