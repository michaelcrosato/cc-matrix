/* Rules data: races, classes, items, spells, monsters. */
B.RACES = {
  human: { n: 'Human', mods: {}, cls: ['fighter', 'paladin', 'ranger', 'cleric', 'mage', 'thief'], trait: 'Gains 5% more XP.' },
  dwarf: { n: 'Dwarf', mods: { con: 1, dex: -1 }, cls: ['fighter', 'cleric', 'thief'], trait: 'Resists poison; wears a beard with pride.' },
  elf: { n: 'Elf', mods: { dex: 1, con: -1 }, cls: ['fighter', 'ranger', 'mage', 'thief'], trait: 'Shrugs off Hold half the time.' },
  halfling: { n: 'Halfling', mods: { dex: 1, str: -1 }, cls: ['fighter', 'cleric', 'thief'], trait: '+1 with slings, darts and thrown things.' }
};
B.CLASSES = {
  fighter: { n: 'Fighter', die: 10, hit: 1, arm: 'all', shield: true, wp: 'all', xp: 1, min: { str: 9 }, gear: ['longsword', 'woodshield', 'leather'], note: 'Hits harder every level.' },
  paladin: { n: 'Paladin', die: 10, hit: 1, arm: 'all', shield: true, wp: 'all', xp: 1.2, min: { str: 12, wis: 13 }, gear: ['longsword', 'woodshield', 'chainshirt'], note: 'Lay on Hands: heal 2× level, once per rest.' },
  ranger: { n: 'Ranger', die: 8, hit: 1, arm: 'chain', shield: false, wp: 'all', xp: 1.15, min: { str: 13, dex: 13 }, gear: ['shortsword', 'shortsword', 'leather'], note: 'Two blades, no penalty. Tracks monsters on the map.' },
  cleric: { n: 'Cleric', die: 8, hit: .75, arm: 'scale', shield: true, wp: ['blunt', 'staff', 'sling'], xp: .95, min: { wis: 9 }, gear: ['mace', 'symbol', 'leather'], note: 'Prays at camp. Turns the dead.' },
  mage: { n: 'Mage', die: 4, hit: .5, arm: 'robe', shield: false, wp: ['light', 'staff', 'sling', 'thrown'], xp: 1.1, min: { int: 9 }, gear: ['dagger', 'spellbook', 'robe'], note: 'Memorizes spells at camp. Reads scrolls.' },
  thief: { n: 'Thief', die: 6, hit: .75, arm: 'leather', shield: 'buckler', wp: ['light', 'xbow', 'bow', 'sling', 'thrown'], xp: .9, min: { dex: 9 }, gear: ['shortsword', 'darts', 'leather', 'lockpicks'], note: 'Picks locks, finds traps, backstabs ×2.' }
};
B.XPT = [0, 0, 100, 250, 500, 900, 1500, 2400, 3600];
B.ARMRANK = { robe: 0, leather: 1, chain: 2, scale: 3, plate: 4 };
// item kinds: dmg [n,d] spd (s) cat (weapon class) def hit reach two missile ammo throw
const I = (n, t, o) => Object.assign({ n, t }, o);
B.ITEMS = {
  fist: I('Fists', 'weapon', { dmg: [1, 2], spd: 1, cat: 'light', ic: 'fist' }),
  dagger: I('Dagger', 'weapon', { slot: 'hand', dmg: [1, 4], spd: .9, cat: 'light', throw: 1, ic: 'blade', c: '#c8ccd8', d: 'A short blade for short work. Throws well.' }),
  rustdag: I('Rusty Dagger', 'weapon', { slot: 'hand', dmg: [1, 3], spd: .9, cat: 'light', throw: 1, ic: 'blade', c: '#a0705a', d: 'More rust than dagger. It still has a point.' }),
  shortsword: I('Short Sword', 'weapon', { slot: 'hand', dmg: [1, 6], spd: 1, cat: 'light', ic: 'blade', c: '#d0d4e0', d: 'Quick, honest steel.' }),
  longsword: I('Long Sword', 'weapon', { slot: 'hand', dmg: [1, 8], spd: 1.15, cat: 'sword', ic: 'blade', c: '#e0e4f0', d: 'The weapon of people who have somewhere to be.' }),
  mace: I('Mace', 'weapon', { slot: 'hand', dmg: [1, 6], spd: 1.1, cat: 'blunt', ic: 'mace', c: '#a8a8b8', d: 'Blunt. Locks do not stand a chance, and neither do skulls.' }),
  warhammer: I('Warhammer', 'weapon', { slot: 'hand', dmg: [1, 8], spd: 1.3, cat: 'blunt', ic: 'mace', c: '#b0b0c0', d: 'A guildsman\'s hammer, rebalanced for argument.' }),
  handaxe: I('Hand Axe', 'weapon', { slot: 'hand', dmg: [1, 6], spd: 1.05, cat: 'axe', throw: 1, ic: 'axe', c: '#c0c4d0', d: 'Chops. Throws. Is not shy.' }),
  staff: I('Quarterstaff', 'weapon', { slot: 'hand', dmg: [1, 6], spd: 1.1, cat: 'staff', two: true, ic: 'staff', c: '#a07840', d: 'Two hands and a good attitude.' }),
  spear: I('Spear', 'weapon', { slot: 'hand', dmg: [1, 8], spd: 1.2, cat: 'sword', reach: true, throw: 1, ic: 'spear', c: '#c8c8d8', d: 'Reaches over a friend\'s shoulder.' }),
  glaive: I('Tumbler\'s Glaive', 'weapon', { slot: 'hand', dmg: [2, 5], spd: 1.35, cat: 'sword', reach: true, two: true, ic: 'spear', c: '#d8b868', d: 'A guild-made polearm that reaches two cells.' }),
  shortbow: I('Short Bow', 'weapon', { slot: 'hand', dmg: [1, 6], spd: 1, cat: 'bow', missile: 'arrow', two: true, ic: 'bow', c: '#a07840', d: 'Draws from the quiver. Fires along the facing line.' }),
  xbow: I('Light Crossbow', 'weapon', { slot: 'hand', dmg: [1, 8], spd: 1.5, cat: 'xbow', missile: 'bolt', two: true, ic: 'xbow', c: '#8a6a40', d: 'Slow to wind, sure to bite.' }),
  sling: I('Sling', 'weapon', { slot: 'hand', dmg: [1, 4], spd: .9, cat: 'sling', missile: 'stone', ic: 'sling', c: '#9a8060', d: 'A strap of leather and a bad idea.' }),
  darts: I('Darts', 'weapon', { slot: 'hand', dmg: [1, 3], spd: .7, cat: 'thrown', throw: 1, stack: 30, n0: 8, ic: 'dart', c: '#d0d0d8', d: 'Thrown by hand. Stackable.' }),
  arrows: I('Arrows', 'ammo', { ammo: 'arrow', stack: 30, n0: 12, ic: 'arrow', c: '#d0c090', d: 'Goes in the quiver.' }),
  bolts: I('Bolts', 'ammo', { ammo: 'bolt', stack: 30, n0: 12, ic: 'arrow', c: '#a0a0b0', d: 'Goes in the quiver.' }),
  stones: I('Sling Stones', 'ammo', { ammo: 'stone', stack: 30, n0: 12, ic: 'rock', c: '#908878', d: 'Smooth stones. Goes in the quiver.' }),
  rock: I('Rock', 'misc', { ic: 'rock', c: '#8a8478', throw: 1, d: 'A rock. It weighs about as much as a person\'s excuses. Good on plates.' }),
  leather: I('Leather Armour', 'armor', { slot: 'body', def: 2, arm: 'leather', ic: 'armor', c: '#8a6040', d: 'Boiled and stitched.' }),
  chainshirt: I('Chain Shirt', 'armor', { slot: 'body', def: 4, arm: 'chain', ic: 'armor', c: '#a8aab8', d: 'Rings and patience.' }),
  scalemail: I('Scale Mail', 'armor', { slot: 'body', def: 5, arm: 'scale', ic: 'armor', c: '#b8a068', d: 'Brass scales of a dead guildhall.' }),
  platemail: I('Tumbler Plate', 'armor', { slot: 'body', def: 7, arm: 'plate', ic: 'armor', c: '#d0c088', d: 'Cogged plate, heavy as a sermon.' }),
  robe: I('Traveller\'s Robe', 'armor', { slot: 'body', def: 1, arm: 'robe', ic: 'armor', c: '#4a5a9a', d: 'A mage\'s robe, patched at the knee.' }),
  lintelrobe: I('Robe of the Lintel', 'armor', { slot: 'body', def: 2, arm: 'robe', slots1: 1, ic: 'armor', c: '#7a4aba', d: 'Magister Lintel\'s own. Holds one more small spell.' }),
  woodshield: I('Wooden Shield', 'shield', { slot: 'off', def: 1, shield: 'wood', ic: 'shield', c: '#9a7040', d: 'Raise it with the hand: Brace for +3 Defense.' }),
  buckler: I('Buckler', 'shield', { slot: 'off', def: 1, shield: 'buckler', ic: 'shield', c: '#a8a8b8', d: 'A fist-sized shield.' }),
  ironshield: I('Iron Shield', 'shield', { slot: 'off', def: 2, shield: 'wood', ic: 'shield', c: '#8890a0', d: 'It has been stood behind many times.' }),
  helm: I('Iron Helm', 'helm', { slot: 'head', def: 1, ic: 'helm', c: '#a0a4b4', d: 'Keeps the roof on.' }),
  bracers: I('Brass Bracers', 'bracers', { slot: 'arms', def: 1, ic: 'bracer', c: '#c8a050', d: 'Hinged, polished, slightly warm.' }),
  boots: I('Soft Boots', 'boots', { slot: 'feet', ic: 'boots', c: '#6a5038', quiet: 1, d: 'They make the stones quieter.' }),
  ringdef: I('Ring of Warding', 'ring', { slot: 'ring', def: 1, ic: 'ring', c: '#c8d0ff', d: 'A thin silver band. +1 Defense.' }),
  goggles: I('Seam-Goggles', 'neck', { slot: 'head', see: 1, ic: 'helm', c: '#58d0c0', d: 'Tumblerwright goggles. Seams in the stone glint teal.' }),
  amulet: I('Lidless Charm', 'neck', { slot: 'neck', ward: 1, ic: 'ring', c: '#e8e8ff', d: 'An eye with no lid. It cannot be gazed upon or held.' }),
  symbol: I('Key of the Threshold', 'symbol', { slot: 'hand', ic: 'symbol', c: '#e8c870', d: 'A cleric\'s holy symbol. Needed in a hand to pray or cast.' }),
  spellbook: I('Spellbook', 'book', { slot: 'hand', ic: 'book', c: '#7a4a9a', d: 'Holds what a mage has learned. Needed in a hand to cast.' }),
  ration: I('Ration', 'food', { food: 50, ic: 'ration', c: '#c8a860', d: 'Dried meat and hard bread. Feeds 50.' }),
  ironration: I('Iron Ration', 'food', { food: 100, ic: 'ration', c: '#a0a0a8', d: 'A tin the guild sealed a century ago. Still good. Feeds 100.' }),
  loaf: I('Loaf of the Hearth', 'food', { food: 100, all: 1, ic: 'ration', c: '#e8c078', d: 'Warm. Somehow. Feeds the whole party.' }),
  potion: I('Potion of Mending', 'potion', { heal: [2, 8, 2], ic: 'potion', c: '#e04a4a', d: 'Heals 2d8+2.' }),
  antidote: I('Antidote', 'potion', { cure: 'poison', ic: 'potion', c: '#4ae070', d: 'Cures poison.' }),
  lockpicks: I('Lockpicks', 'tool', { ic: 'key', c: '#b0b0b8', d: 'A thief\'s set of fine wire. Opens simple locks.' }),
  ironkey: I('Iron Key', 'key', { key: 'iron', ic: 'key', c: '#9aa0b0', d: 'Round and plain. It fits the Drain Door.' }),
  brasskey: I('Brass Key', 'key', { key: 'brass', ic: 'key', c: '#d8b050', d: 'The Tumbler Halls\' workshop key.' }),
  bentkey: I('Bent Key', 'key', { key: 'bent', ic: 'key', c: '#c0c0d0', d: 'Warped by a bad winter. It fits only the warded lock.' }),
  bonekey: I('Bone Key', 'key', { key: 'bone', ic: 'key', c: '#e8e0c8', d: 'Carved from a saint\'s knuckle. The Gloam Deeps recognize it.' }),
  gear1: I('Brass Gear', 'misc', { gear: 1, ic: 'gear', c: '#d8b050', d: 'A gear for the great clock. There are four sockets.' }),
  ward1: I('Bolt-Ward of Iron', 'key', { key: 'ward1', ic: 'ward', c: '#a0a8c0', d: 'The first of three wards that open the Undergate.' }),
  ward2: I('Bolt-Ward of Brass', 'key', { key: 'ward2', ic: 'ward', c: '#d8b050', d: 'The second ward. It is warm to the touch.' }),
  ward3: I('Bolt-Ward of Bone', 'key', { key: 'ward3', ic: 'ward', c: '#e8e0c8', d: 'The third ward.' }),
  wand: I('Wand of Unlatching', 'wand', { spell: 'unlatch', charges: 5, ic: 'wand', c: '#b8a0e8', d: 'Points at a rune-seal and says "please".' }),
  wandzap: I('Wand of Sparks', 'wand', { spell: 'spark', charges: 8, ic: 'wand', c: '#ffd870', d: 'Fires a Spark Dart down the line.' }),
  note1: I('Torn Note', 'note', { ic: 'note', c: '#e8e0c0', note: 'note1', d: 'Paper, soft with damp.' }),
  scrslumber: I('Scroll of Slumber', 'scroll', { spell: 'slumber', ic: 'scroll', c: '#e8e0c0', d: 'Mages learn it at camp, or read it once in a hurry.' }),
  scrorb: I('Scroll of Blazing Orb', 'scroll', { spell: 'orb', ic: 'scroll', c: '#ff9a5a', d: 'Mages learn it at camp, or read it once in a hurry.' }),
  scrfeather: I('Scroll of Feather Step', 'scroll', { spell: 'feather', ic: 'scroll', c: '#a8e0ff', d: 'Mages learn it at camp, or read it once in a hurry.' }),
  scrunlatch: I('Scroll of Unlatch', 'scroll', { spell: 'unlatch', ic: 'scroll', c: '#d8c0ff', d: 'Mages learn it at camp, or read it once in a hurry.' }),
  scrlightning: I('Scroll of Forked Lightning', 'scroll', { spell: 'lightning', ic: 'scroll', c: '#88e8ff', d: 'Mages learn it at camp, or read it once in a hurry.' }),
  scrraise: I('Scroll of Raising', 'scroll', { spell: 'raise', ic: 'scroll', c: '#fff0b0', d: 'Clerics and paladins read this at a fallen friend.' })
};
for (const k in B.ITEMS) B.ITEMS[k].id = k;
B.SPELLS = {
  spark: { n: 'Spark Dart', cls: 'mage', lvl: 1, tg: 'line', d: 'A bolt of sparks down the line. 2d4+level.', col: '#ffd870' },
  slumber: { n: 'Slumber', cls: 'mage', lvl: 1, tg: 'front', d: 'Puts the monsters ahead to sleep. They take double damage.', col: '#a8a0ff' },
  seams: { n: 'Find Seams', cls: 'mage', lvl: 1, tg: 'party', d: 'Hidden catches and seams glint teal for a time.', col: '#58d0c0' },
  unlatch: { n: 'Unlatch', cls: 'mage', lvl: 1, tg: 'door', d: 'Opens a rune-seal in front of you.', col: '#d8c0ff' },
  orb: { n: 'Blazing Orb', cls: 'mage', lvl: 2, tg: 'front', d: 'Fire on the cell ahead and its neighbours. 3d6.', col: '#ff8a3a' },
  feather: { n: 'Feather Step', cls: 'mage', lvl: 2, tg: 'party', d: 'The party floats over pits for a minute.', col: '#a8e0ff' },
  lightning: { n: 'Forked Lightning', cls: 'mage', lvl: 3, tg: 'line', d: 'A fork of lightning down the line. 4d6+level.', col: '#88e8ff' },
  shield: { n: 'Shell of Brass', cls: 'mage', lvl: 2, tg: 'party', d: 'A brass shell absorbs damage for the whole party.', col: '#d8b050' },
  slow: { n: 'Slow', cls: 'mage', lvl: 2, tg: 'front', d: 'Monsters ahead act at two thirds speed for a time.', col: '#8aa0ff' },
  hold: { n: 'Hold Monster', cls: 'mage', lvl: 3, tg: 'front', d: 'Monsters ahead cannot act for 8 seconds. Not the boss.', col: '#c0a0ff' },
  protect: { n: 'Protection', cls: 'cleric', lvl: 1, tg: 'party', d: '+3 Defense for the party for a minute.', col: '#c8d8ff' },
  smite: { n: 'Smite', cls: 'cleric', lvl: 2, tg: 'front', d: 'Holy force on the cell ahead. 3d6, double against the dead.', col: '#fff0a0' },
  mend: { n: 'Mend', cls: 'cleric', lvl: 1, tg: 'member', d: 'Heals one friend 1d8+level.', col: '#7aff9a' },
  bless: { n: 'Bless', cls: 'cleric', lvl: 1, tg: 'party', d: '+1 to hit and saves for a time.', col: '#ffe090' },
  purge: { n: 'Purge', cls: 'cleric', lvl: 2, tg: 'member', d: 'Cures poison.', col: '#8aff6a' },
  freehinge: { n: 'Free Hinge', cls: 'cleric', lvl: 2, tg: 'party', d: 'Joints will not lock: immune to Hold for a time.', col: '#ffd0a0' },
  ward: { n: 'Lidless Ward', cls: 'cleric', lvl: 3, tg: 'party', d: 'A shell that absorbs damage and cannot be gazed through.', col: '#e8e8ff' },
  raise: { n: 'Raise from Rest', cls: 'cleric', lvl: 3, tg: 'member', d: 'Calls a dead friend back at 1 HP.', col: '#fff0b0' }
};
for (const k in B.SPELLS) B.SPELLS[k].id = k;
B.SLOTS = { mage: [[1, 0, 0], [2, 0, 0], [2, 1, 0], [3, 2, 0], [3, 2, 1], [4, 2, 2], [4, 3, 2], [4, 3, 3]], cleric: [[1, 0, 0], [2, 0, 0], [2, 1, 0], [3, 2, 0], [3, 2, 1], [3, 3, 1], [4, 3, 2], [4, 3, 2]] };
B.casterType = c => c === 'mage' ? 'mage' : (c === 'cleric' || c === 'paladin') ? 'cleric' : null;
// monsters: hp def atk dmg [n,d,+] wind (s) int (s) mv (s/cell) size (1 small 2 medium 4 large) sight mind xp
const M = (n, o) => Object.assign({ n, size: 1, sight: 5, mind: 'melee', wind: .5, int: 2.2, mv: .55, xp: 10, drops: [] }, o);
B.MONS = {
  rat: M('Drain Rat', { hp: 5, def: 11, atk: 2, dmg: [1, 3, 0], mv: .35, int: 1.6, xp: 8, snd: 'squeak', d: 'A rat the size of a good dog, and twice as rude.', drops: [['ration', .12]] }),
  ratknot: M('Rat Knot', { hp: 16, def: 11, atk: 3, dmg: [2, 3, 0], size: 2, mv: .6, int: 1.8, xp: 36, snd: 'squeak', d: 'Six rats, one tangle of tails. They bite as one.', drops: [['ration', .3]] }),
  leech: M('Bloat Leech', { hp: 9, def: 10, atk: 2, dmg: [1, 4, 0], mv: .9, xp: 14, poison: .5, snd: 'slurp', d: 'It has been feeding on the Drains for a long time.', drops: [['antidote', .15]] }),
  latchkin: M('Latchkin', { hp: 6, def: 12, atk: 3, dmg: [1, 4, 0], mv: .4, int: 2, xp: 16, thief: 1, snd: 'chitter', d: 'Green, hooded, and carrying someone else\'s keys.', drops: [['dagger', .2], ['ration', .15]] }),
  ooze: M('Drain Ooze', { hp: 22, def: 8, atk: 3, dmg: [1, 6, 1], size: 2, mv: 1.1, wind: .8, int: 3, xp: 40, snd: 'slurp', d: 'It remembers being a puddle.', drops: [['potion', .3]] }),
  snick: M('Snick, the Latch-Boss', { hp: 28, def: 13, atk: 5, dmg: [1, 6, 1], size: 2, mv: .5, wind: .7, int: 2.4, xp: 120, snd: 'chitter', named: 1, d: 'A crown of hinges. A cloak of keys. A temper.', drops: [['ironkey', 1]] }),
  skeleton: M('Tinker Skeleton', { hp: 16, def: 12, atk: 4, dmg: [1, 8, 0], size: 2, mv: .6, wind: .6, int: 2.6, xp: 35, snd: 'rattle', undead: 1, d: 'Its bones are held with tiny screws. Someone cared.', drops: [['gear1', .08], ['shortsword', .1], ['bolts', .2]] }),
  rustling: M('Rustling', { coward: 1, hp: 14, def: 11, atk: 4, dmg: [1, 6, 0], mv: .45, int: 2.2, xp: 30, rust: 1, snd: 'chitter', d: 'It eats iron and is never full.', drops: [['arrows', .2]] }),
  spider: M('Brass Spider', { hp: 13, def: 13, atk: 4, dmg: [1, 6, 0], mv: .35, int: 2, xp: 32, poison: .35, snd: 'chitter', d: 'Eight legs of clockwork and an appetite of flesh.', drops: [['antidote', .2]] }),
  sentinel: M('Clockwork Sentinel', { hp: 48, def: 14, atk: 6, dmg: [2, 6, 1], size: 4, mv: 1, wind: .9, int: 3.4, xp: 140, snd: 'clank', d: 'Its key turns, slowly, in its back. When it runs down, it stops. It has not run down.', drops: [['brasskey', 1]] }),
  hound: M('Lidless Hound', { hp: 15, def: 12, atk: 5, dmg: [1, 6, 1], mv: .28, int: 1.8, xp: 38, snd: 'growl', sight: 6, d: 'Pale, smooth, and eyeless. It knows exactly where you are.', drops: [] }),
  seer: M('Gloam Seer', { hp: 18, def: 11, atk: 5, dmg: [2, 4, 0], mind: 'caster', wind: .8, int: 3.6, xp: 55, snd: 'chant', sight: 7, d: 'Robed in pale lace. It holds a cyan thought very carefully.', drops: [['scrslumber', .1], ['potion', .25]] }),
  warden: M('Gloam Warden', { hp: 32, def: 15, atk: 6, dmg: [1, 10, 1], size: 2, mv: .7, wind: .8, int: 2.8, xp: 90, snd: 'clank', d: 'A halberd and a vow it no longer remembers.', drops: [['bonekey', .0], ['potion', .3]] }),
  gazer: M('Gazer', { hp: 11, def: 12, atk: 4, dmg: [1, 6, 0], mind: 'caster', fly: 1, wind: .7, int: 3, mv: .6, xp: 30, snd: 'hum', d: 'A small yellow eye with opinions.', drops: [] }),
  golem: M('Lockjaw Golem', { hp: 50, def: 16, atk: 7, dmg: [2, 8, 2], size: 4, mv: 1.2, wind: 1, int: 4, xp: 220, snd: 'clank', d: 'A padlock where its head should be. The shackle snaps.', drops: [['ward3', 1]] }),
  boltholder: M('The Bolt-Holder', { hp: 210, def: 15, atk: 8, dmg: [3, 6, 0], size: 4, mind: 'boss', xp: 1000, snd: 'hum', fly: 1, boss: 1, d: 'A floating amber eye in a cage of seven iron bolts. It holds every lock in Hasp.', drops: [] })
};
for (const k in B.MONS) B.MONS[k].id = k;
