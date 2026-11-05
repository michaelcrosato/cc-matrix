/* ITEMS: every item in the demo. kind decides where it goes and what using it does; icon picks a 12x12 pixel icon and
 * model the little 3D shape it shows on the floor. Designers add an item here and place it in a floor's items table. */
const ALL = 'FPRCMT';
const IT = (id, name, kind, o = {}) => (B.ITEMS[id] = Object.assign({ id, name, kind, cls: ALL, icon: kind, color: '#a8a8b0', desc: '' }, o));
B.ITEMS = {};
// weapons: dmg, speed (cooldown s), hit bonus, classes, two-handed, reach, throwable, blunt
IT('rustyDagger', 'Rusty Dagger', 'weapon', { dmg: '1d3', speed: 1.2, throw: true, icon: 'dagger', color: '#9a7a5a', family: 'blade', desc: 'Pitted and dull, but sharper than your fingernails.' });
IT('dagger', 'Dagger', 'weapon', { dmg: '1d4', speed: 1.2, throw: true, icon: 'dagger', color: '#c8c8d0', family: 'blade', desc: 'A plain blade. It goes where you put it.' });
IT('shortSword', 'Short Sword', 'weapon', { dmg: '1d6', speed: 1.6, cls: 'FPRT', icon: 'sword', color: '#c0c4d0', family: 'blade', desc: 'Short enough for a drain, long enough for a rat.' });
IT('longSword', 'Long Sword', 'weapon', { dmg: '1d8', speed: 2.0, cls: 'FPR', icon: 'sword', color: '#d8dce8', family: 'blade', desc: "Hasp steel, with a lockwright's mark on the tang." });
IT('wardensBlade', "Warden's Blade", 'weapon', { dmg: '1d8+2', speed: 2.0, hit: 2, cls: 'FPR', icon: 'sword', color: '#4a4a5a', family: 'blade', desc: 'Black as wet slate. It never seems to dull.' });
IT('handAxe', 'Hand Axe', 'weapon', { dmg: '1d6', speed: 1.8, throw: true, cls: 'FPR', icon: 'axe', color: '#b0b0b8', family: 'axe', desc: 'Balanced for splitting kindling, or Latchkins.' });
IT('lockbreaker', 'Lockbreaker', 'weapon', { dmg: '1d10+1', speed: 3.0, hit: 1, two: true, cls: 'FP', icon: 'axe', color: '#c8a050', family: 'axe', desc: 'A guild axe made for doors that would not open. It does not argue.' });
IT('mace', 'Mace', 'weapon', { dmg: '1d6+1', speed: 2.0, blunt: true, cls: 'FPRC', icon: 'mace', color: '#a0a0a8', family: 'blunt', desc: 'Flanged iron on an oak haft. Honest work.' });
IT('copperhandsMaul', "Copperhand's Maul", 'weapon', { dmg: '1d8+1', speed: 2.4, blunt: true, cls: 'FPC', icon: 'hammer', color: '#c87a4a', family: 'blunt', desc: 'Dwarf-forged. The copper bands are for luck, and for weight.' });
IT('warhammer', 'Warhammer', 'weapon', { dmg: '1d6+1', speed: 2.4, blunt: true, cls: 'FPRC', icon: 'hammer', color: '#a8a8b0', family: 'blunt', desc: 'Half tool, half argument.' });
IT('staff', 'Quarterstaff', 'weapon', { dmg: '1d6', speed: 1.8, two: true, blunt: true, icon: 'staff', color: '#8a6a4a', family: 'blunt', desc: 'Ash, iron-shod at both ends.' });
IT('spear', 'Spear', 'weapon', { dmg: '1d6', speed: 2.2, reach: true, throw: true, cls: 'FPRT', icon: 'spear', color: '#b8b8c0', family: 'spear', desc: 'Long enough to reach past a friend.' });
IT('glaive', 'Glaive', 'weapon', { dmg: '1d10', speed: 2.8, two: true, reach: true, cls: 'FPR', icon: 'glaive', color: '#9a98a8', family: 'spear', desc: "A Warden's polearm, its blade etched with a shut eye." });
IT('tumblersPick', "Tumbler's Pick", 'weapon', { dmg: '1d6+1', speed: 1.8, cls: 'FPRT', construct: 2, icon: 'pick', color: '#c8a050', family: 'axe', desc: "A locksmith's pick-hammer. Clockwork hates it." });
// missile weapons and ammo
IT('sling', 'Sling', 'missile', { dmg: '1d4', speed: 2.0, ammo: 'slingStones', icon: 'sling', color: '#8a6a4a', family: 'sling', desc: 'Leather and string. Older than locks.' });
IT('shortBow', 'Short Bow', 'missile', { dmg: '1d6', speed: 1.8, ammo: 'arrows', two: true, cls: 'FPRT', icon: 'bow', color: '#a07a4a', family: 'bow', desc: 'Elf-made, light as a thought.' });
IT('lightCrossbow', 'Light Crossbow', 'missile', { dmg: '1d8', speed: 2.6, ammo: 'bolts', two: true, cls: 'FPRT', icon: 'crossbow', color: '#8a6a4a', family: 'crossbow', desc: 'Wound by a crank. Someone loved this, before the Latchkins.' });
IT('heavyCrossbow', 'Heavy Crossbow', 'missile', { dmg: '1d10+1', speed: 3.4, ammo: 'bolts', two: true, cls: 'FPR', icon: 'crossbow', color: '#5a4a3a', family: 'crossbow', desc: 'It punches through mail, and patience.' });
IT('darts', 'Darts', 'weapon', { dmg: '1d3', speed: 1.2, throw: true, stack: 30, icon: 'darts', color: '#a8a8b8', family: 'throw', desc: 'Little iron wasps.' });
IT('slingStones', 'Sling Stones', 'ammo', { stack: 30, icon: 'stones', color: '#8a8a88', desc: 'Round, smooth and patient.' });
IT('arrows', 'Arrows', 'ammo', { stack: 30, icon: 'arrows', color: '#c8b08a', desc: 'Grey-fletched, straight as a rule.' });
IT('bolts', 'Bolts', 'ammo', { stack: 30, icon: 'arrows', color: '#a0a0a8', desc: "Bolts: the city's other export." });
// armour and wearables: slot, def
IT('travellersRobe', "Traveller's Robe", 'body', { def: 0, cls: 'M', icon: 'robe', color: '#5a4a8a', desc: 'Many pockets, all of them full of crumbs.' });
IT('paddedJerkin', 'Padded Jerkin', 'body', { def: 1, icon: 'armor', color: '#8a7a5a', desc: 'Quilted, and quietly proud of it.' });
IT('leatherArmor', 'Leather Armour', 'body', { def: 2, cls: 'FPRCT', icon: 'armor', color: '#8a5a3a', desc: 'Boiled, stitched and smelling of both.' });
IT('studdedLeather', 'Studded Leather', 'body', { def: 3, cls: 'FPRT', icon: 'armor', color: '#6a4a2a', desc: 'Leather with ambitions.' });
IT('chainShirt', 'Chain Shirt', 'body', { def: 4, cls: 'FPRC', icon: 'mail', color: '#a8acb8', desc: 'Ten thousand little rings, all of them cold.' });
IT('scaleMail', 'Scale Mail', 'body', { def: 5, cls: 'FPC', icon: 'mail', color: '#c8a060', desc: 'Overlapping brass scales, each one stamped with a key.' });
IT('robeOfTheLintel', 'Robe of the Lintel', 'body', { def: 2, cls: 'M', int: 1, slot1: 1, icon: 'robe', color: '#3a6ac8', desc: 'Embroidered with doors. Every door is open.' });
IT('buckler', 'Buckler', 'shield', { def: 1, cls: 'FPRCT', icon: 'shield', color: '#a08060', desc: 'Small enough to forget until it saves you.' });
IT('woodenShield', 'Wooden Shield', 'shield', { def: 1, cls: 'FPC', icon: 'shield', color: '#8a6a40', desc: 'Oak planks, an iron rim, a great many dents.' });
IT('ironShield', 'Iron Shield', 'shield', { def: 2, cls: 'FPC', icon: 'shield', color: '#9aa0ac', desc: 'Heavy, honest and loud when struck.' });
IT('leatherCap', 'Leather Cap', 'head', { def: 1, cls: 'FPRCT', icon: 'cap', color: '#8a5a3a', desc: 'It keeps the drips off, mostly.' });
IT('ironHelm', 'Iron Helm', 'head', { def: 1, cls: 'FPRC', icon: 'helm', color: '#9aa0ac', desc: 'Dwarf-sized, which is to say generous.' });
IT('ratKingsCrown', "Rat King's Crown", 'head', { def: 1, icon: 'crown', color: '#b8b8a0', desc: 'Twisted tin, worn by something with too many tails.' });
IT('tumblerwrightsGoggles', "Tumblerwright's Goggles", 'head', { def: 0, seeing: true, icon: 'goggles', color: '#c8a050', desc: "The world's seams show plainly through them." });
IT('lidlessWard', 'Lidless Ward', 'neck', { noHold: true, icon: 'amulet', color: '#8ae0ff', desc: 'Shaped like a shut eye. What it cannot see cannot hold you.' });
IT('amuletOfVigor', 'Amulet of Vigor', 'neck', { con: 1, icon: 'amulet', color: '#e0463c', desc: 'A red stone that beats, very faintly.' });
IT('bracersOfDefense', 'Bracers of Defense', 'arms', { def: 2, icon: 'bracers', color: '#c8a050', desc: 'Brass bands chased with little shields.' });
IT('ringOfMending', 'Ring of Mending', 'ring', { regen: 30, icon: 'ring', color: '#4ae070', desc: 'Warm, as if someone just took it off.' });
IT('ringOfWarding', 'Ring of Warding', 'ring', { def: 1, save: 1, icon: 'ring', color: '#8a8aff', desc: 'A plain band that hums when blows come near.' });
IT('quickstepBoots', 'Quickstep Boots', 'feet', { quick: .1, icon: 'boots', color: '#6a4a8a', desc: 'Soft soles that hurry you along.' });
// consumables and readables
IT('ration', 'Ration', 'food', { food: 50, icon: 'ration', color: '#c8a040', desc: 'Hard bread, harder cheese.' });
IT('ironRation', 'Iron Ration', 'food', { food: 100, icon: 'ration', color: '#8a8a70', desc: 'Sealed in wax. It will outlast the city.' });
IT('potionHealing', 'Potion of Healing', 'potion', { heal: '2d4+2', icon: 'potion', color: '#e0463c', desc: 'Red, thick and faintly sweet.' });
IT('potionGreaterHealing', 'Potion of Greater Healing', 'potion', { heal: '4d4+4', wake: true, icon: 'potion', color: '#ff8a4a', desc: 'It glows like a forge-coal.' });
IT('potionAntidote', 'Antidote', 'potion', { cure: 'poison', icon: 'potion', color: '#4ae070', desc: 'Bitter as regret, and as useful.' });
IT('elixirClarity', 'Elixir of Clarity', 'potion', { slot: true, icon: 'potion', color: '#8ae0ff', desc: 'Clear water that remembers a spell for you.' });
for (const [s, n, c] of [['sparkDart', 'Spark Dart', '#d8b0ff'], ['wardOfBrass', 'Ward of Brass', '#c8a050'], ['findSeams', 'Find Seams', '#ffd36a'], ['slumber', 'Slumber', '#8a8aff'], ['unlatch', 'Unlatch', '#8ae0ff'], ['frostbite', 'Frostbite', '#a0e8ff'], ['featherStep', 'Feather Step', '#e8f0ff'], ['forkedLightning', 'Forked Lightning', '#6ae8ff'], ['blazingOrb', 'Blazing Orb', '#ff8a3a']])
  IT('scroll_' + s, 'Scroll of ' + n, 'scroll', { spell: s, icon: 'scroll', color: c, desc: 'Arcane script that crawls when you are not looking.' });
IT('scrollRaising', 'Scroll of Raising', 'scroll', { spell: 'raise', prayer: true, icon: 'scroll', color: '#fff6d8', desc: 'A prayer to the Warder of Thresholds, written in gold.' });
IT('wandUnlatching', 'Wand of Unlatching', 'wand', { spell: 'unlatch', charges: 3, icon: 'wand', color: '#8ae0ff', desc: 'A silver wand with a keyhole at its tip.' });
IT('wandSparks', 'Wand of Sparks', 'wand', { spell: 'sparkDart', charges: 8, icon: 'wand', color: '#d8b0ff', desc: 'It crackles if you hold it the wrong way round.' });
// tools, keys, wards, quest items, lore and junk
IT('lockpicks', 'Lockpicks', 'tool', { uses: 6, icon: 'picks', color: '#a8a8b8', desc: 'Six slender picks in a roll of oilcloth.' });
IT('holySymbol', 'Key of the Threshold', 'symbol', { icon: 'symbol', color: '#ffd36a', desc: 'A brass key on a chain: the Warder hears through it.' });
IT('veilsLantern', "Veil's Lantern", 'symbol', { icon: 'lantern', color: '#8ae0ff', desc: 'A shuttered lantern that gives no light, only listening.' });
IT('spellbook', 'Spellbook', 'book', { icon: 'book', color: '#6a3a8a', desc: 'Your spells, in your own cramped hand.' });
IT('ironKey', 'Iron Key', 'key', { icon: 'key', color: '#8a8c98', desc: 'Heavy, plain and recently oiled.' });
IT('drainwardensKey', "Drainwarden's Key", 'key', { icon: 'key', color: '#4a8a6a', desc: 'Verdigris on every tooth. It once opened half the Drains.' });
IT('gearKey', 'Gear Key', 'key', { icon: 'key', color: '#c8a050', desc: 'Its bit is a little toothed wheel.' });
IT('boneKey', 'Bone Key', 'key', { icon: 'key', color: '#e8e0c8', desc: 'Carved from something long. Best not to ask.' });
IT('bentKey', 'Bent Key', 'key', { icon: 'key', color: '#7a7a6a', desc: 'It opens nothing any more. It is still a key.' });
IT('copperWard', 'Copper Ward', 'ward', { quest: true, icon: 'ward', color: '#d0783a', desc: 'A toothed copper disc, warm to the touch. One of three.' });
IT('brassWard', 'Brass Ward', 'ward', { quest: true, icon: 'ward', color: '#e8c050', desc: 'A toothed brass disc that rings when tapped. One of three.' });
IT('ironWard', 'Iron Ward', 'ward', { quest: true, icon: 'ward', color: '#8a92a0', desc: 'A toothed iron disc, cold as a cellar. The last of three.' });
IT('tumblerGear', 'Tumbler Gear', 'gear', { icon: 'gear', color: '#c8a050', desc: 'A brass gear from a great clock.' });
IT('tornPage', 'Torn Page', 'note', { note: 'tornPage', icon: 'note', color: '#d8c8a0', desc: 'A page torn from a Latchkin tally book.' });
IT('guildLedger', 'Guild Ledger', 'note', { note: 'guildLedger', icon: 'book', color: '#8a5a3a', desc: "The Tumblerwrights' last ledger." });
IT('seersPsalm', "Seer's Psalm", 'note', { note: 'seersPsalm', icon: 'note', color: '#b8b0c8', desc: 'A psalm of the Lidless, on grey vellum.' });
IT('rock', 'Rock', 'junk', { heavy: true, icon: 'rock', color: '#8a8a88', desc: 'A rock. Heavy, and therefore useful.' });
IT('ironIngot', 'Iron Ingot', 'junk', { heavy: true, icon: 'ingot', color: '#8a92a0', desc: 'A bar of guild iron, stamped with a key.' });
IT('bone', 'Bone', 'junk', { heavy: true, icon: 'bone', color: '#e8e0c8', desc: 'A long bone. It has seen better days.' });
IT('ratCrown', 'Rat Crown', 'coin', { icon: 'coin', color: '#ffd36a', desc: 'A tin coin stamped with a rat. The Rat Run pays in these.' });

B.isQuest = id => { const d = B.ITEMS[id]; return d && (d.quest || d.kind === 'key' || d.kind === 'ward' || d.kind === 'gear' || d.kind === 'note' || d.kind === 'book' || d.kind === 'symbol'); };
B.SLOT_OF = { body: 'body', shield: 'off', head: 'head', neck: 'neck', arms: 'arms', ring: 'ring', feet: 'feet', ammo: 'quiver' };
B.SLOTS = ['head', 'neck', 'body', 'arms', 'main', 'off', 'ring1', 'ring2', 'feet', 'quiver'];
B.SLOT_NAMES = { head: 'Head', neck: 'Neck', body: 'Body', arms: 'Arms', main: 'Main hand', off: 'Off hand', ring1: 'Ring', ring2: 'Ring', feet: 'Feet', quiver: 'Quiver' };
