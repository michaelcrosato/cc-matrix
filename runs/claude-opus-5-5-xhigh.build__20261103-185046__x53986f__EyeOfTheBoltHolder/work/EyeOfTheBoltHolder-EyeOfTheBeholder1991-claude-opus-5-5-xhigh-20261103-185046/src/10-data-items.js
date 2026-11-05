/* =====================================================================================
 * 10-data-items: every item. kind says what it does; slot where it is worn or held; dmg [n, d, bonus]; speed is the
 * hand's cooldown in seconds; classes the letters of the classes that may use it (F P R C M T). Designers add items here.
 * ===================================================================================== */
const ALL = 'FPRCMT';
B.ITEMS = {
  // ---- weapons ----
  rustyDagger: { name: 'Rusty Dagger', kind: 'weapon', dmg: [1, 3, 0], speed: 1.2, thrown: true, metal: true, cls: ALL, icon: 'dagger', color: '#9a7a5a', model: 'blade', desc: 'Pitted and dull, but sharper than your fingernails.' },
  dagger: { name: 'Dagger', kind: 'weapon', dmg: [1, 4, 0], speed: 1.2, thrown: true, metal: true, cls: ALL, icon: 'dagger', color: '#c8ccd8', model: 'blade', desc: 'A plain blade. It goes where you put it.' },
  shortSword: { name: 'Short Sword', kind: 'weapon', dmg: [1, 6, 0], speed: 1.6, metal: true, cls: 'FPRT', icon: 'sword', color: '#c8ccd8', model: 'blade', desc: 'Short enough for a drain, long enough for a rat.' },
  longSword: { name: 'Long Sword', kind: 'weapon', dmg: [1, 8, 0], speed: 2.0, metal: true, cls: 'FPR', icon: 'sword', color: '#dfe4ee', model: 'blade', long: true, desc: "Hasp steel, with a lockwright's mark on the tang." },
  wardensBlade: { name: "Warden's Blade", kind: 'weapon', dmg: [1, 8, 2], speed: 2.0, hit: 2, metal: true, cls: 'FPR', icon: 'sword', color: '#4a4a5a', model: 'blade', long: true, desc: 'Black as wet slate. It never seems to dull.' },
  handAxe: { name: 'Hand Axe', kind: 'weapon', dmg: [1, 6, 0], speed: 1.8, thrown: true, metal: true, cls: 'FPR', icon: 'axe', color: '#b8bcc8', model: 'axe', desc: 'Balanced for splitting kindling, or Latchkins.' },
  lockbreaker: { name: 'Lockbreaker', kind: 'weapon', dmg: [1, 10, 1], speed: 3.0, hit: 1, two: true, metal: true, cls: 'FP', icon: 'axe', color: '#d0a050', model: 'axe', big: true, desc: 'A guild axe made for doors that would not open. It does not argue.' },
  mace: { name: 'Mace', kind: 'weapon', dmg: [1, 6, 1], speed: 2.0, blunt: true, metal: true, cls: 'FPRC', icon: 'mace', color: '#9a9aa8', model: 'mace', desc: 'Flanged iron on an oak haft. Honest work.' },
  copperhandsMaul: { name: "Copperhand's Maul", kind: 'weapon', dmg: [1, 8, 1], speed: 2.4, blunt: true, metal: true, cls: 'FPC', icon: 'hammer', color: '#c87a3a', model: 'mace', desc: 'Dwarf-forged. The copper bands are for luck, and for weight.' },
  warhammer: { name: 'Warhammer', kind: 'weapon', dmg: [1, 6, 1], speed: 2.4, blunt: true, metal: true, cls: 'FPRC', icon: 'hammer', color: '#a8a8b4', model: 'mace', desc: 'Half tool, half argument.' },
  staff: { name: 'Quarterstaff', kind: 'weapon', dmg: [1, 6, 0], speed: 1.8, two: true, blunt: true, cls: ALL, icon: 'staff', color: '#8a6a40', model: 'staff', desc: 'Ash, iron-shod at both ends.' },
  spear: { name: 'Spear', kind: 'weapon', dmg: [1, 6, 0], speed: 2.2, reach: true, thrown: true, metal: true, cls: 'FPRT', icon: 'spear', color: '#b8bcc8', model: 'spear', desc: 'Long enough to reach past a friend.' },
  glaive: { name: 'Glaive', kind: 'weapon', dmg: [1, 10, 0], speed: 2.8, two: true, reach: true, metal: true, cls: 'FPR', icon: 'glaive', color: '#8a8aa0', model: 'spear', desc: "A Warden's polearm, its blade etched with a shut eye." },
  tumblersPick: { name: "Tumbler's Pick", kind: 'weapon', dmg: [1, 6, 1], speed: 1.8, metal: true, vsConstruct: 2, cls: 'FPRT', icon: 'pick', color: '#c8a050', model: 'axe', desc: "A locksmith's pick-hammer. Clockwork hates it." },
  // ---- missile weapons, thrown stacks and ammo ----
  sling: { name: 'Sling', kind: 'missile', dmg: [1, 4, 0], speed: 2.0, ammo: 'slingStones', cls: ALL, icon: 'sling', color: '#8a6a4a', model: 'sling', desc: 'Leather and string. Older than locks.' },
  shortBow: { name: 'Short Bow', kind: 'missile', dmg: [1, 6, 0], speed: 1.8, ammo: 'arrows', two: true, cls: 'FPRT', icon: 'bow', color: '#a07a48', model: 'bow', desc: 'Elf-made, light as a thought.' },
  lightCrossbow: { name: 'Light Crossbow', kind: 'missile', dmg: [1, 8, 0], speed: 2.6, ammo: 'bolts', two: true, cls: 'FPRT', icon: 'xbow', color: '#8a6a40', model: 'xbow', desc: 'Wound by a crank. Someone loved this, before the Latchkins.' },
  heavyCrossbow: { name: 'Heavy Crossbow', kind: 'missile', dmg: [1, 10, 1], speed: 3.4, ammo: 'bolts', two: true, cls: 'FPR', icon: 'xbow', color: '#5a4a3a', model: 'xbow', big: true, desc: 'It punches through mail, and patience.' },
  darts: { name: 'Darts', kind: 'weapon', dmg: [1, 3, 0], speed: 1.2, thrown: true, stack: 30, metal: true, cls: ALL, icon: 'darts', color: '#b8bcc8', model: 'darts', small: true, desc: 'Little iron wasps.' },
  slingStones: { name: 'Sling Stones', kind: 'ammo', stack: 30, slot: 'quiver', icon: 'stones', color: '#8a8a90', model: 'stones', desc: 'Round river stones. The river misses them.' },
  arrows: { name: 'Arrows', kind: 'ammo', stack: 30, slot: 'quiver', icon: 'arrows', color: '#c8b080', model: 'arrows', desc: 'Grey-goose fletching, Hasp-made heads.' },
  bolts: { name: 'Bolts', kind: 'ammo', stack: 30, slot: 'quiver', icon: 'bolts', color: '#9a9aa8', model: 'arrows', desc: "Bolts: the city's other export." },
  // ---- armour and wearables ----
  travellersRobe: { name: "Traveller's Robe", kind: 'armor', slot: 'body', def: 0, cls: 'M', icon: 'robe', color: '#5a5a9a', model: 'cloth', desc: 'Many pockets, all of them full of crumbs.' },
  paddedJerkin: { name: 'Padded Jerkin', kind: 'armor', slot: 'body', def: 1, cls: ALL, icon: 'armor', color: '#8a7a5a', model: 'cloth', desc: 'Quilted, and quietly proud of it.' },
  leatherArmor: { name: 'Leather Armour', kind: 'armor', slot: 'body', def: 2, cls: 'FPRCT', icon: 'armor', color: '#8a5a32', model: 'cloth', desc: 'Boiled, stitched and smelling of both.' },
  studdedLeather: { name: 'Studded Leather', kind: 'armor', slot: 'body', def: 3, cls: 'FPRT', icon: 'armor', color: '#6a4a30', model: 'cloth', studs: true, desc: 'Leather with ambitions.' },
  chainShirt: { name: 'Chain Shirt', kind: 'armor', slot: 'body', def: 4, metal: true, cls: 'FPRC', icon: 'chain', color: '#a8acb8', model: 'cloth', desc: 'Ten thousand little rings, all of them cold.' },
  scaleMail: { name: 'Scale Mail', kind: 'armor', slot: 'body', def: 5, metal: true, cls: 'FPC', icon: 'scale', color: '#9a8a6a', model: 'cloth', desc: 'Overlapping plates like a fish that went to war.' },
  robeOfTheLintel: { name: 'Robe of the Lintel', kind: 'armor', slot: 'body', def: 2, cls: 'M', int: 1, slot1: 1, icon: 'robe', color: '#3a6a9a', model: 'cloth', quest: true, desc: 'Embroidered with doors. Every door is open.' },
  buckler: { name: 'Buckler', kind: 'shield', slot: 'off', def: 1, metal: true, cls: 'FPRCT', icon: 'buckler', color: '#a8a8b4', model: 'shield', desc: 'A fist-sized shield for a fist-sized problem.' },
  woodenShield: { name: 'Wooden Shield', kind: 'shield', slot: 'off', def: 1, cls: 'FPC', icon: 'shield', color: '#8a5a32', model: 'shield', desc: 'Oak planks and an iron rim. It has stopped worse.' },
  ironShield: { name: 'Iron Shield', kind: 'shield', slot: 'off', def: 2, metal: true, cls: 'FPC', icon: 'shield', color: '#8a8a98', model: 'shield', desc: 'Heavy, dented and dependable.' },
  leatherCap: { name: 'Leather Cap', kind: 'head', slot: 'head', def: 1, cls: 'FPRCT', icon: 'cap', color: '#8a5a32', model: 'cap', desc: 'It keeps the drips off, mostly.' },
  ironHelm: { name: 'Iron Helm', kind: 'head', slot: 'head', def: 1, metal: true, cls: 'FPRC', icon: 'helm', color: '#9a9aa8', model: 'cap', desc: 'Durgan says it was his grandfather\'s. Durgan says a lot.' },
  ratKingsCrown: { name: "Rat King's Crown", kind: 'head', slot: 'head', def: 1, cls: ALL, icon: 'crown', color: '#c8b070', model: 'crown', quest: true, desc: 'Twisted tin, worn by something with too many tails.' },
  tumblerwrightsGoggles: { name: "Tumblerwright's Goggles", kind: 'head', slot: 'head', def: 0, seeing: true, cls: ALL, icon: 'goggles', color: '#c8a050', model: 'cap', desc: "The world's seams show plainly through them." },
  lidlessWard: { name: 'Lidless Ward', kind: 'neck', slot: 'neck', noHold: true, cls: ALL, icon: 'amulet', color: '#8ae0ff', model: 'amulet', desc: 'Shaped like a shut eye. What it cannot see cannot hold you.' },
  amuletOfVigor: { name: 'Amulet of Vigor', kind: 'neck', slot: 'neck', con: 1, cls: ALL, icon: 'amulet', color: '#e05a4a', model: 'amulet', desc: 'A red stone that beats, faintly, like a second heart.' },
  bracersOfDefense: { name: 'Bracers of Defense', kind: 'arms', slot: 'arms', def: 2, cls: ALL, icon: 'bracers', color: '#c8a050', model: 'cloth', desc: 'Brass cuffs, warm to the touch, that turn a blade aside.' },
  ringOfMending: { name: 'Ring of Mending', kind: 'ring', slot: 'ring', regen: 30, cls: ALL, icon: 'ring', color: '#6ae08a', model: 'ring', desc: 'Warm, as if someone just took it off.' },
  ringOfWarding: { name: 'Ring of Warding', kind: 'ring', slot: 'ring', def: 1, save: 1, cls: ALL, icon: 'ring', color: '#8ab8ff', model: 'ring', desc: 'A plain band, engraved inside: KEEP OUT.' },
  quickstepBoots: { name: 'Quickstep Boots', kind: 'feet', slot: 'feet', quick: .1, cls: ALL, icon: 'boots', color: '#6a4a30', model: 'cloth', desc: 'They seem in a hurry even when you are not.' },
  // ---- consumables ----
  ration: { name: 'Ration', kind: 'food', food: 50, icon: 'ration', color: '#c8a060', model: 'food', desc: 'Hard bread, harder cheese. It will do.' },
  ironRation: { name: 'Iron Ration', kind: 'food', food: 100, icon: 'iration', color: '#8a7a5a', model: 'food', desc: 'Salt pork, oatcake and a fig. A soldier\'s feast.' },
  potionHealing: { name: 'Potion of Healing', kind: 'potion', heal: [2, 4, 2], icon: 'potion', color: '#e04a4a', model: 'potion', desc: 'Red, thick and faintly peppery.' },
  potionGreaterHealing: { name: 'Potion of Greater Healing', kind: 'potion', heal: [4, 4, 4], wake: true, icon: 'potion', color: '#ff7ab8', model: 'potion', desc: 'It glows in the bottle, as if impatient.' },
  potionAntidote: { name: 'Antidote', kind: 'potion', cure: 'poison', icon: 'potion', color: '#6ad06a', model: 'potion', desc: 'Bitter as regret. It works.' },
  elixirClarity: { name: 'Elixir of Clarity', kind: 'potion', clarity: true, icon: 'potion', color: '#6ab8ff', model: 'potion', desc: 'Clear as cold water, and twice as sobering.' },
  scrollRaising: { name: 'Scroll of Raising', kind: 'scroll', spell: 'raise', holy: true, icon: 'scroll', color: '#f0b840', model: 'scroll', desc: 'A prayer of the Warder, written in gold. A cleric or paladin may read it over the dead.' },
  wandUnlatching: { name: 'Wand of Unlatching', kind: 'wand', spell: 'unlatch', charges: 3, icon: 'wand', color: '#c8a050', model: 'wand', desc: 'A brass rod tipped with a tiny key. Anyone may use it.' },
  wandSparks: { name: 'Wand of Sparks', kind: 'wand', spell: 'sparkDart', power: 2, charges: 8, icon: 'wand', color: '#b8a0ff', model: 'wand', desc: 'It crackles when you point it at things you dislike.' },
  // ---- tools, holy symbols, books ----
  lockpicks: { name: 'Lockpicks', kind: 'tool', charges: 6, icon: 'picks', color: '#b8bcc8', model: 'picks', desc: "A thief's roll of hooks and tension bars. A failed pick snaps one." },
  holySymbol: { name: 'Key of the Threshold', kind: 'symbol', cls: 'CP', icon: 'symbol', color: '#ffd36a', model: 'key', desc: 'The holy symbol of the Warder of Thresholds: a key that opens nothing, and everything.' },
  veilsLantern: { name: "Veil's Lantern", kind: 'symbol', cls: 'CP', icon: 'lantern', color: '#8ae0ff', model: 'lantern', desc: 'A shuttered lantern. Its light is not quite light.' },
  spellbook: { name: 'Spellbook', kind: 'book', cls: 'M', icon: 'book', color: '#6a3a8a', model: 'book', desc: 'Its pages hold the spells its owner knows.' },
  // ---- keys and wards ----
  ironKey: { name: 'Iron Key', kind: 'key', icon: 'key', color: '#8a8c98', model: 'key', desc: 'Heavy, plain and recently stolen.' },
  drainwardensKey: { name: "Drainwarden's Key", kind: 'key', icon: 'key', color: '#c87a3a', model: 'key', warded: true, desc: 'Copper-toothed, stamped with the old Drainwarden\'s seal.' },
  gearKey: { name: 'Gear Key', kind: 'key', icon: 'key', color: '#c8a050', model: 'key', gear: true, desc: 'Its bit is a tiny cog. It turns in more ways than one.' },
  boneKey: { name: 'Bone Key', kind: 'key', icon: 'key', color: '#e0d8c0', model: 'key', desc: 'Carved from something\'s finger. Best not to ask whose.' },
  bentKey: { name: 'Bent Key', kind: 'key', icon: 'key', color: '#9a8a7a', model: 'key', desc: 'Bent past any use. It might still be a key, to something.' },
  copperWard: { name: 'Copper Ward', kind: 'ward', ward: 'copper', quest: true, icon: 'ward', color: '#d0703a', model: 'ward', desc: 'A toothed copper disc, green at the edges. The first of three.' },
  brassWard: { name: 'Brass Ward', kind: 'ward', ward: 'brass', quest: true, icon: 'ward', color: '#e0b84a', model: 'ward', desc: 'A brass disc cut with a hundred tiny teeth. The second of three.' },
  ironWard: { name: 'Iron Ward', kind: 'ward', ward: 'iron', quest: true, icon: 'ward', color: '#8a8ea0', model: 'ward', desc: 'A black iron disc, cold enough to sting. The last of three.' },
  tumblerGear: { name: 'Tumbler Gear', kind: 'gear', quest: true, icon: 'gear', color: '#c8a050', model: 'gear', desc: 'A brass gear as big as your palm, its teeth worn bright.' },
  // ---- notes ----
  tornPage: { name: 'Torn Page', kind: 'note', note: 'tornPage', icon: 'note', color: '#e8dcb8', model: 'scroll', desc: 'A page torn from a Latchkin\'s ledger. Someone was learning to write.' },
  guildLedger: { name: 'Guild Ledger', kind: 'note', note: 'guildLedger', icon: 'book', color: '#8a5a32', model: 'book', desc: 'The Tumblerwrights\' last ledger, its last page still wet with old ink.' },
  seersPsalm: { name: "Seer's Psalm", kind: 'note', note: 'seersPsalm', icon: 'note', color: '#d8d0e8', model: 'scroll', desc: 'A strip of pale vellum, written small.' },
  // ---- junk, heavy things ----
  rock: { name: 'Rock', kind: 'junk', heavy: true, icon: 'rock', color: '#8a8a90', model: 'rock', desc: 'A rock. It has opinions about plates.' },
  ironIngot: { name: 'Iron Ingot', kind: 'junk', heavy: true, metal: true, icon: 'ingot', color: '#7a7e8a', model: 'ingot', desc: 'A bar of guild iron, heavy enough to hold anything down.' },
  bone: { name: 'Bone', kind: 'junk', heavy: true, icon: 'bone', color: '#e0d8c0', model: 'bone', desc: 'A thigh bone. Its owner no longer needs it.' },
  ratCrown: { name: 'Rat Crown', kind: 'coin', icon: 'coin', color: '#ffd34a', model: 'coin', desc: 'A tin coin stamped with a rat in a crown.' }
};
/* the scrolls: one for each arcane spell, filled in from the spell table (12-data-spells) */
B.scrollId = spell => 'sc_' + spell;
/** an item's definition */
const IT = id => B.ITEMS[id];
B.IT = IT;
/** the name of one item as carried (stacks show their count, wands their charges) */
B.itemName = (ref, count = true) => {
  const d = IT(ref.id); if (!d) return '???';
  let n = d.name; if (count && ref.n > 1) n = ref.n + ' ' + n;
  if (ref.rust) n = 'Rusted ' + n;
  return n;
};
