/* ===== 10 data: items, monsters, spells, classes, races (PLAN §4.3, §4.8, §7.6–7.8) =====
 * Classes: F Fighter, P Paladin, R Ranger, C Cleric, M Mage, T Thief. */
B.ITEMS = {};
const IT = (id, name, k, o = {}, desc = '') => { B.ITEMS[id] = Object.assign({ id, name, k, cls: 'FPRCMT', desc }, o); };
const ALL = 'FPRCMT';
// weapons: dmg dice, spd (seconds), thr (may be thrown), reach, two (two-handed), blunt, ammo, tohit bonus
IT('rustyDagger', 'Rusty Dagger', 'weapon', { dmg: '1d3', spd: 1.2, thr: true }, 'Pitted and dull, but sharper than your fingernails.');
IT('dagger', 'Dagger', 'weapon', { dmg: '1d4', spd: 1.2, thr: true, cls: ALL }, 'A plain blade. It goes where you put it.');
IT('shortSword', 'Short Sword', 'weapon', { dmg: '1d6', spd: 1.6, cls: 'FPRT' }, 'Short enough for a drain, long enough for a rat.');
IT('longSword', 'Long Sword', 'weapon', { dmg: '1d8', spd: 2.0, cls: 'FPR' }, 'Hasp steel, with a lockwright\'s mark on the tang.');
IT('wardensBlade', "Warden's Blade", 'weapon', { dmg: '1d8+2', spd: 2.0, hit: 2, cls: 'FPR' }, 'Black as wet slate. It never seems to dull.');
IT('handAxe', 'Hand Axe', 'weapon', { dmg: '1d6', spd: 1.8, thr: true, cls: 'FPR' }, 'Balanced for splitting kindling, or Latchkins.');
IT('lockbreaker', 'Lockbreaker', 'weapon', { dmg: '1d10+1', spd: 3.0, two: true, hit: 1, cls: 'FP' }, 'A guild axe made for doors that would not open. It does not argue.');
IT('mace', 'Mace', 'weapon', { dmg: '1d6+1', spd: 2.0, blunt: true, cls: 'FPRC' }, 'Flanged iron on an oak haft. Honest work.');
IT('copperhandsMaul', "Copperhand's Maul", 'weapon', { dmg: '1d8+1', spd: 2.4, blunt: true, cls: 'FPC' }, 'Dwarf-forged. The copper bands are for luck, and for weight.');
IT('warhammer', 'Warhammer', 'weapon', { dmg: '1d6+1', spd: 2.4, blunt: true, cls: 'FPRC' }, 'Half tool, half argument.');
IT('staff', 'Quarterstaff', 'weapon', { dmg: '1d6', spd: 1.8, two: true, blunt: true }, 'Ash, iron-shod at both ends.');
IT('spear', 'Spear', 'weapon', { dmg: '1d6', spd: 2.2, reach: true, thr: true, cls: 'FPRT' }, 'Long enough to reach past a friend.');
IT('glaive', 'Glaive', 'weapon', { dmg: '1d10', spd: 2.8, two: true, reach: true, cls: 'FPR' }, 'A Warden\'s polearm, its blade etched with a shut eye.');
IT('tumblersPick', "Tumbler's Pick", 'weapon', { dmg: '1d6+1', spd: 1.8, construct: 2, cls: 'FPRT' }, 'A locksmith\'s pick-hammer. Clockwork hates it.');
// missiles and ammunition
IT('sling', 'Sling', 'missile', { dmg: '1d4', spd: 2.0, ammo: 'slingStones' }, 'Leather and string. Older than locks.');
IT('shortBow', 'Short Bow', 'missile', { dmg: '1d6', spd: 1.8, ammo: 'arrows', two: true, cls: 'FPRT' }, 'Elf-made, light as a thought.');
IT('lightCrossbow', 'Light Crossbow', 'missile', { dmg: '1d8', spd: 2.6, ammo: 'bolts', two: true, cls: 'FPRT' }, 'Wound by a crank. Someone loved this, before the Latchkins.');
IT('heavyCrossbow', 'Heavy Crossbow', 'missile', { dmg: '1d10+1', spd: 3.4, ammo: 'bolts', two: true, cls: 'FPR' }, 'It punches through mail, and patience.');
IT('darts', 'Darts', 'weapon', { dmg: '1d3', spd: 1.2, thr: true, stack: 30 }, 'Little iron wasps.');
IT('slingStones', 'Sling Stones', 'ammo', { stack: 30 }, 'Smooth river stones, one a shot.');
IT('arrows', 'Arrows', 'ammo', { stack: 30 }, 'Fletched in grey. Straight, mostly.');
IT('bolts', 'Crossbow Bolts', 'ammo', { stack: 30 }, 'Bolts: the city\'s other export.');
// armour and wearables
IT('travellersRobe', "Traveller's Robe", 'armor', { slot: 'body', ac: 0, cls: 'M' }, 'Many pockets, all of them full of crumbs.');
IT('paddedJerkin', 'Padded Jerkin', 'armor', { slot: 'body', ac: 1, cls: ALL }, 'Quilted, and quietly proud of it.');
IT('leatherArmor', 'Leather Armour', 'armor', { slot: 'body', ac: 2, cls: 'FPRCT' }, 'Boiled, stitched and smelling of both.');
IT('studdedLeather', 'Studded Leather', 'armor', { slot: 'body', ac: 3, cls: 'FPRT' }, 'Leather with ambitions.');
IT('chainShirt', 'Chain Shirt', 'armor', { slot: 'body', ac: 4, cls: 'FPRC' }, 'Ten thousand little rings, all of them cold.');
IT('scaleMail', 'Scale Mail', 'armor', { slot: 'body', ac: 5, cls: 'FPC' }, 'Overlapping plates that clink on the stairs.');
IT('robeOfTheLintel', 'Robe of the Lintel', 'armor', { slot: 'body', ac: 2, int: 1, extraSlot: 1, cls: 'M' }, 'Embroidered with doors. Every door is open.');
IT('buckler', 'Buckler', 'shield', { slot: 'off', ac: 1, cls: 'FPRCT' }, 'A little round shield, good for knocks.');
IT('woodenShield', 'Wooden Shield', 'shield', { slot: 'off', ac: 1, cls: 'FPC' }, 'Oak and rawhide, scarred by use.');
IT('ironShield', 'Iron Shield', 'shield', { slot: 'off', ac: 2, cls: 'FPC' }, 'Heavy, and it stays heavy.');
IT('leatherCap', 'Leather Cap', 'armor', { slot: 'head', ac: 1, cls: 'FPRCT' }, 'Snug, and it smells of the drains.');
IT('ironHelm', 'Iron Helm', 'armor', { slot: 'head', ac: 1, cls: 'FPRC' }, 'A bowl of iron with a dent of its own.');
IT('ratKingsCrown', "Rat King's Crown", 'armor', { slot: 'head', ac: 1 }, 'Twisted tin, worn by something with too many tails.');
IT('tumblerwrightsGoggles', "Tumblerwright's Goggles", 'armor', { slot: 'head', ac: 0, seeing: true }, 'The world\'s seams show plainly through them.');
IT('lidlessWard', 'Lidless Ward', 'armor', { slot: 'neck', ward: 'hold' }, 'Shaped like a shut eye. What it cannot see cannot hold you.');
IT('amuletOfVigor', 'Amulet of Vigor', 'armor', { slot: 'neck', con: 1 }, 'A green stone on a brass chain, warm to the touch.');
IT('bracersOfDefense', 'Bracers of Defense', 'armor', { slot: 'arms', ac: 2 }, 'Hammered steel, worn smooth by a better arm.');
IT('ringOfMending', 'Ring of Mending', 'armor', { slot: 'ring', heal: 1 }, 'Warm, as if someone just took it off.');
IT('ringOfWarding', 'Ring of Warding', 'armor', { slot: 'ring', ac: 1, saves: 1 }, 'A ring of tin with a ward cut into its face.');
IT('quickstepBoots', 'Quickstep Boots', 'armor', { slot: 'feet', quick: .1 }, 'Soft soles that hear the drains before you do.');
// consumables and readables
IT('ration', 'Ration', 'food', { food: 50, stack: 9 }, 'Hard bread and dried meat. It tastes of the packing.');
IT('ironRation', 'Iron Ration', 'food', { food: 100, stack: 9 }, 'Dense as a brick, and about as cheerful.');
IT('potionHealing', 'Potion of Healing', 'potion', { heal: '2d4+2', stack: 9 }, 'Red, sweet and stinging. It works.');
IT('potionGreaterHealing', 'Potion of Greater Healing', 'potion', { heal: '4d4+4', wakes: true, stack: 9 }, 'Thicker than the others, and warm. It wakes the fallen.');
IT('potionAntidote', 'Antidote', 'potion', { cures: 'poison', stack: 9 }, 'Bitter enough to wake the dead, and then some.');
IT('elixirClarity', 'Elixir of Clarity', 'potion', { restSlot: true, stack: 9 }, 'Clear as cold water. A spell comes back to the mind.');
for (const sp of ['sparkDart', 'wardOfBrass', 'findSeams', 'slumber', 'unlatch', 'frostbite', 'featherStep', 'forkedLightning', 'blazingOrb'])
  IT('scroll_' + sp, 'Scroll', 'scroll', { spell: sp, cls: 'M' }, 'A mage can read it, or scribe it at camp.');
IT('scrollRaising', 'Scroll of Raising', 'scroll', { spell: 'raise', cls: 'CP' }, 'A cleric or paladin may read it: the dead rise at one.');
IT('wandUnlatching', 'Wand of Unlatching', 'wand', { spell: 'unlatch', charges: 3, cls: ALL }, 'Silver-banded, humming faintly.');
IT('wandSparks', 'Wand of Sparks', 'wand', { spell: 'sparkDart', charges: 8, cls: ALL }, 'Twisted copper with a crackle in it.');
// keys, wards, tools, quest items, notes, junk
IT('lockpicks', 'Lockpicks', 'tool', { uses: 6, cls: 'T' }, 'A roll of steel picks in worn leather.');
IT('holySymbol', 'Key of the Threshold', 'holy', { cls: 'CP' }, 'A brass key with no lock to fit. The clergy say it is enough.');
IT('veilsLantern', "Veil's Lantern", 'holy', { cls: 'CPM' }, 'A small lantern with a shutter of black cloth.');
IT('spellbook', 'Spellbook', 'book', { cls: 'M' }, 'A thin book, its pages soft with handling.');
IT('ironKey', 'Iron Key', 'key', { lock: 'ironKey' }, 'Heavy, pitted, and cut for a simple lock.');
IT('drainwardensKey', "Drainwarden's Key", 'key', { lock: 'drainwardensKey' }, 'A key with a crown of iron teeth. Warded.');
IT('gearKey', 'Gear Key', 'key', { lock: 'gearKey' }, 'Cut like a gear, one tooth missing.');
IT('boneKey', 'Bone Key', 'key', { lock: 'boneKey' }, 'Carved from something that once had a spine.');
IT('bentKey', 'Bent Key', 'key', { lock: 'bentKey' }, 'Bent as if somebody once tried to force it.');
IT('copperWard', 'Copper Ward', 'ward', { lock: 'undergate', bolts: 2 }, 'A copper disc stamped with a key and a bolt.');
IT('brassWard', 'Brass Ward', 'ward', { lock: 'undergate', bolts: 2 }, 'A brass disc, warm to the touch.');
IT('ironWard', 'Iron Ward', 'ward', { lock: 'undergate', bolts: 3 }, 'An iron disc, cold, and the heaviest of the three.');
IT('tumblerGear1', 'Tumbler Gear I', 'gear', { gear: 1 }, 'A brass gear with a single tooth bent over.');
IT('tumblerGear2', 'Tumbler Gear II', 'gear', { gear: 2 }, 'A brass gear, light and ticking faintly.');
IT('tumblerGear3', 'Tumbler Gear III', 'gear', { gear: 3 }, 'A brass gear with the Tumblerwrights\' mark.');
IT('tumblerGear4', 'Tumbler Gear IV', 'gear', { gear: 4 }, 'Found in a cell. It belongs to the big clock.');
IT('tornPage', 'Torn Page', 'note', { text: 'noteTorn' }, 'A page torn from a ledger, in a hurried hand.');
IT('guildLedger', 'Guild Ledger', 'note', { text: 'noteLedger' }, 'The ledger of the Tumblerwrights\' guild, to the last entry.');
IT('seersPsalm', "The Seer's Psalm", 'note', { text: 'notePsalm' }, 'A chant written out for the candles, and for no one else.');
IT('rock', 'Rock', 'junk', { stack: 9 }, 'A grey stone the size of a fist. Heavy enough.');
IT('ironIngot', 'Iron Ingot', 'junk', { stack: 9 }, 'Pig iron, the colour of a rainy day.');
IT('bone', 'Bone', 'junk', { stack: 9 }, 'Somebody\'s, once.');
IT('ratCrown', 'Rat Crown', 'coin', { score: 25 }, 'A tin crown the size of a ring. Worth a few rats.');

/* ---- monsters: hp, def (Defense the party rolls against), atk (to the d20), dmg, int (seconds), mv (seconds a cell),
 * sight (cells), size S/M/L, xp, mind, special, drops ---- */
B.MONS = {
  rat: { name: 'Drain Rat', hp: 4, def: 11, atk: 1, dmg: '1d3', int: 1.4, mv: .6, sight: 4, size: 'S', xp: 20, mind: 'hunt', art: 'rat', drops: [['ration', 10]] },
  leech: { name: 'Bloat Leech', hp: 14, def: 10, atk: 2, dmg: '1d4', int: 2.4, mv: 1.4, sight: 3, size: 'M', xp: 60, mind: 'hunt', art: 'leech', heal: true },
  latchkin: { name: 'Latchkin', hp: 7, def: 12, atk: 2, dmg: '1d4', int: 1.8, mv: .7, sight: 5, size: 'S', xp: 40, mind: 'hunt', art: 'latchkin', steal: .15, fleeAt: .25, drops: [['darts', 30], ['spear', 10], ['paddedJerkin', 5]] },
  ooze: { name: 'Drain Ooze', hp: 18, def: 8, atk: 2, dmg: '1d6', int: 2.6, mv: 1.6, sight: 3, size: 'M', xp: 70, mind: 'hunt', art: 'ooze', corrode: true },
  ratknot: { name: 'Rat Knot', hp: 22, def: 11, atk: 3, dmg: '1d6', int: 1.8, mv: 1.0, sight: 4, size: 'M', xp: 120, mind: 'hunt', art: 'knot', bites: 2 },
  snick: { name: 'Snick, the Latch-Boss', hp: 40, def: 13, atk: 4, dmg: '1d8+1', int: 2.0, mv: .8, sight: 6, size: 'M', xp: 400, mind: 'hunt', art: 'snick', callsAt: .5, drops: [['copperWard', 100], ['drainwardensKey', 100], ['amuletOfVigor', 100]] },
  skeleton: { name: 'Tinker Skeleton', hp: 16, def: 12, atk: 3, dmg: '1d6', int: 2.0, mv: 1.0, sight: 5, size: 'M', xp: 60, mind: 'hunt', art: 'skeleton', undead: true, drops: [['handAxe', 20]] },
  rustling: { name: 'Rustling', hp: 6, def: 14, atk: 2, dmg: '1d2', int: 1.6, mv: .7, sight: 4, size: 'S', xp: 45, mind: 'hunt', art: 'rustling', rusts: .25 },
  spider: { name: 'Brass Spider', hp: 22, def: 13, atk: 4, dmg: '1d6', int: 1.5, mv: .6, sight: 5, size: 'M', xp: 110, mind: 'hunt', art: 'spider', poisons: .3, drops: [['potionAntidote', 25]] },
  sentinel: { name: 'Clockwork Sentinel', hp: 50, def: 16, atk: 5, dmg: '2d6', int: 2.8, mv: 1.6, sight: 5, size: 'L', xp: 350, mind: 'hunt', art: 'sentinel', construct: true, windup: .8, drops: [['ringOfWarding', 100], ['potionGreaterHealing', 100]] },
  hound: { name: 'Lidless Hound', hp: 20, def: 13, atk: 5, dmg: '1d8', int: 1.3, mv: .5, sight: 6, size: 'M', xp: 120, mind: 'hunt', art: 'hound', hears: 6 },
  seer: { name: 'Gloam Seer', hp: 18, def: 12, atk: 3, dmg: '1d4', int: 2.2, mv: 1.0, sight: 6, size: 'M', xp: 180, mind: 'keepAway', art: 'seer', bolt: { dmg: '2d6', every: 6 }, holdEvery: 12, drops: [['staff', 30], ['potionHealing', 20], ['elixirClarity', 15]] },
  warden: { name: 'Gloam Warden', hp: 26, def: 15, atk: 6, dmg: '1d10', int: 2.2, mv: .9, sight: 5, size: 'M', xp: 150, mind: 'hunt', art: 'warden', reach: 2, drops: [['glaive', 25], ['studdedLeather', 15]] },
  gazer: { name: 'Gazer', hp: 10, def: 14, atk: 4, dmg: '1d3', int: 2.0, mv: .8, sight: 5, size: 'S', xp: 90, mind: 'ranged', art: 'gazer', flies: true, gaze: { dmg: '1d6', every: 3, range: 3 } },
  golem: { name: 'Lockjaw Golem', hp: 60, def: 17, atk: 7, dmg: '2d8', int: 3.0, mv: 1.8, sight: 5, size: 'L', xp: 400, mind: 'hunt', art: 'golem', construct: true, lightning: 1.5, blunt: 1.25 },
  boltholder: { name: 'The Bolt-Holder', hp: 320, def: 15, atk: 8, dmg: '0', int: 3.5, mv: 0, sight: 9, size: 'L', xp: 3000, mind: 'boss', art: 'boltholder', boss: true }
};
/* ---- spells: kind arcane/prayer, level, target (front, line, member, party, door), effect ---- */
B.SPELLS = {
  sparkDart: { name: 'Spark Dart', kind: 'arcane', lvl: 1, target: 'line', text: 'Darts of white light.' },
  wardOfBrass: { name: 'Ward of Brass', kind: 'arcane', lvl: 1, target: 'member', text: 'A shimmer of brass about one.' },
  findSeams: { name: 'Find Seams', kind: 'arcane', lvl: 1, target: 'party', text: 'The seams of the world show in gold.' },
  slumber: { name: 'Slumber', kind: 'arcane', lvl: 1, target: 'front', text: 'Those before you drift into sleep.' },
  unlatch: { name: 'Unlatch', kind: 'arcane', lvl: 2, target: 'door', text: 'A ghost key turns in a lock.' },
  frostbite: { name: 'Frostbite', kind: 'arcane', lvl: 2, target: 'front', text: 'Blue shards and a ring of frost.' },
  featherStep: { name: 'Feather Step', kind: 'arcane', lvl: 2, target: 'party', text: 'The party floats over pits and plates.' },
  forkedLightning: { name: 'Forked Lightning', kind: 'arcane', lvl: 3, target: 'line', text: 'Jagged light down the line, and back again.' },
  blazingOrb: { name: 'Blazing Orb', kind: 'arcane', lvl: 3, target: 'line', text: 'A burning ball that bursts on the first foe.' },
  mend: { name: 'Mend', kind: 'prayer', lvl: 1, target: 'member', text: 'Green light closes the wound.' },
  steadyHand: { name: 'Steady Hand', kind: 'prayer', lvl: 1, target: 'party', text: 'A golden hand steadies the party.' },
  turnDead: { name: 'Turn the Dead', kind: 'prayer', lvl: 1, target: 'front', text: 'The dead flinch from the holy light.' },
  purge: { name: 'Purge Venom', kind: 'prayer', lvl: 2, target: 'member', text: 'The poison leaves by the mouth.' },
  holdFast: { name: 'Hold Fast', kind: 'prayer', lvl: 2, target: 'front', text: 'Golden chains bind the living.' },
  loaves: { name: 'Loaves of the Hearth', kind: 'prayer', lvl: 2, target: 'party', text: 'Warm bread for everyone.' },
  greaterMend: { name: 'Greater Mend', kind: 'prayer', lvl: 3, target: 'member', text: 'A great green light.' },
  raise: { name: 'Raise from Rest', kind: 'prayer', lvl: 3, target: 'dead', text: 'A rising light, and a breath.' },
  freeHinge: { name: 'Free Hinge', kind: 'prayer', lvl: 3, target: 'party', text: 'A hinge sigil on each card; the joints move again.' }
};
B.SPELL_NAME = Object.fromEntries(Object.entries(B.SPELLS).map(([k, v]) => [k, v.name]));
// the scrolls' names are the spells' (set after the spells exist)
for (const sp of Object.keys(B.SPELLS)) if (B.ITEMS['scroll_' + sp]) B.ITEMS['scroll_' + sp].name = 'Scroll of ' + B.SPELLS[sp].name;
// the spell lists by level for each caster (PLAN §4.8): slots per caster level 1..8
B.SLOT_TABLE = {
  M: { 1: [1, 2, 2, 3, 3, 4, 4, 4], 2: [0, 0, 1, 2, 2, 2, 3, 3], 3: [0, 0, 0, 0, 1, 2, 2, 3] },
  C: { 1: [1, 2, 2, 3, 3, 3, 4, 4], 2: [0, 0, 1, 2, 2, 3, 3, 3], 3: [0, 0, 0, 0, 1, 1, 2, 2] }
};
B.SPELL_LIST = { M: { arcane: ['sparkDart', 'wardOfBrass', 'findSeams', 'slumber', 'unlatch', 'frostbite', 'featherStep', 'forkedLightning', 'blazingOrb'] },
  C: { prayer: ['mend', 'steadyHand', 'turnDead', 'purge', 'holdFast', 'loaves', 'greaterMend', 'raise', 'freeHinge'] } };
/* ---- races and classes (PLAN §4.3) ---- */
B.RACES = {
  human: { name: 'Human', mods: {}, classes: 'FPRCMT', xp: 1.05, trait: 'Gains 5% more XP.' },
  dwarf: { name: 'Dwarf', mods: { con: 1, dex: -1 }, classes: 'FCT', poison: .5, beard: 'full', trait: 'Resists poison half the time. Has a beard.' },
  elf: { name: 'Elf', mods: { dex: 1, con: -1 }, classes: 'FRMT', hold: .5, trait: 'Resists Hold half the time.' },
  halfling: { name: 'Halfling', mods: { dex: 1, str: -1 }, classes: 'FCT', sling: 1, trait: '+1 to-hit with slings, darts and thrown weapons.' }
};
B.CLASSES = {
  F: { name: 'Fighter', die: 10, hit: 1, xp: 1, armour: 'FPRCT', weapons: 'all' },
  P: { name: 'Paladin', die: 10, hit: 1, xp: 1.2, armour: 'FPRC', weapons: 'all' },
  R: { name: 'Ranger', die: 8, hit: 1, xp: 1.15, armour: 'FPR', weapons: 'all' },
  C: { name: 'Cleric', die: 8, hit: .75, xp: .95, armour: 'FPRC', weapons: 'blunt' },
  M: { name: 'Mage', die: 4, hit: .5, xp: 1.1, armour: 'M', weapons: 'mage' },
  T: { name: 'Thief', die: 6, hit: .75, xp: .9, armour: 'FPRT', weapons: 'light' }
};
B.MIN_STATS = { F: { str: 9 }, P: { str: 12, wis: 13 }, R: { str: 13, dex: 13 }, C: { wis: 9 }, M: { int: 9 }, T: { dex: 9 } };
B.XP_LEVELS = [0, 0, 100, 250, 500, 900, 1500, 2400, 3600];
B.MOD = v => v <= 5 ? -2 : v <= 8 ? -1 : v <= 12 ? 0 : v <= 15 ? 1 : v <= 17 ? 2 : 3;
