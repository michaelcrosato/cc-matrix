// Items, affixes, legendaries, sets and gems as plain tables.
export const SLOTS = ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet', 'amulet', 'ring', 'main', 'off'];
export const SLOT_NAMES = { head: 'Head', shoulders: 'Shoulders', chest: 'Chest', hands: 'Hands', legs: 'Legs', feet: 'Feet', amulet: 'Amulet', ring: 'Ring', main: 'Main hand', off: 'Off hand' };
export const ARMOUR_SLOTS = ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet'];
export const RARITIES = {
  common: { id: 'common', name: 'Common', color: 'white', mult: 1, aff: [0, 0], beam: 0, rank: 0 },
  blessed: { id: 'blessed', name: 'Blessed', color: 'sky', mult: 1.15, aff: [1, 2], beam: 1.2, rank: 1 },
  reliquary: { id: 'reliquary', name: 'Reliquary', color: 'sand', mult: 1.3, aff: [3, 4], beam: 1.6, rank: 2 },
  legendary: { id: 'legendary', name: 'Legendary', color: 'orange', mult: 1.5, aff: [4, 4], beam: 5, rank: 3 },
  set: { id: 'set', name: 'Set', color: 'lime', mult: 1.5, aff: [3, 3], beam: 5, rank: 3 },
};
export const RARITY_ORDER = ['common', 'blessed', 'reliquary', 'legendary', 'set'];

// k: key, lo/hi: range at item level 1 and 30 (scaled), pct: shown as percent
export const AFFIXES = {
  power: { name: 'Power', lo: 6, hi: 70, fmt: '+{v} Power' },
  vitality: { name: 'Vitality', lo: 6, hi: 70, fmt: '+{v} Vitality' },
  armour: { name: 'Armour', lo: 4, hi: 30, fmt: '+{v}% Armour', pct: true },
  crit: { name: 'Crit chance', lo: 2, hi: 8, fmt: '+{v}% Crit chance', pct: true },
  critDmg: { name: 'Crit damage', lo: 10, hi: 60, fmt: '+{v}% Crit damage', pct: true },
  atkSpeed: { name: 'Attack speed', lo: 3, hi: 12, fmt: '+{v}% Attack speed', pct: true },
  cdr: { name: 'Cooldown reduction', lo: 2, hi: 12, fmt: '-{v}% Cooldowns', pct: true },
  costRed: { name: 'Cost reduction', lo: 3, hi: 15, fmt: '-{v}% Skill cost', pct: true },
  lifeHit: { name: 'Life per hit', lo: 1, hi: 12, fmt: '+{v} Life per hit' },
  regen: { name: 'Life regen', lo: 1, hi: 10, fmt: '+{v} Life per second' },
  moveSpeed: { name: 'Move speed', lo: 3, hi: 10, fmt: '+{v}% Move speed', pct: true, feetOnly: true },
  area: { name: 'Area damage', lo: 4, hi: 25, fmt: '+{v}% Area damage', pct: true },
  sound: { name: 'Sound', lo: 5, hi: 30, fmt: '+{v}% Sound damage', pct: true },
  flame: { name: 'Flame', lo: 5, hi: 30, fmt: '+{v}% Flame damage', pct: true },
  grave: { name: 'Grave', lo: 5, hi: 30, fmt: '+{v}% Grave damage', pct: true },
  maxRes: { name: 'Max resource', lo: 5, hi: 20, fmt: '+{v} Max resource' },
  goldFind: { name: 'Gold find', lo: 5, hi: 35, fmt: '+{v}% Gold find', pct: true },
  magicFind: { name: 'Magic find', lo: 5, hi: 35, fmt: '+{v}% Magic find', pct: true },
  pickup: { name: 'Pick-up radius', lo: 1, hi: 4, fmt: '+{v} m Pick-up radius' },
  thorns: { name: 'Thorns', lo: 4, hi: 60, fmt: '+{v} Thorns' },
};
export const AFFIX_KEYS = Object.keys(AFFIXES);

export const ARMOUR_BASE = {
  head: ['Hood', 'Cowl', 'Helm', 'Mitre'], shoulders: ['Mantle', 'Pauldrons', 'Epaulets'], chest: ['Frock', 'Cassock', 'Hauberk', 'Habit'],
  hands: ['Gloves', 'Mitts', 'Gauntlets'], legs: ['Greaves', 'Breeches', 'Leggings'], feet: ['Boots', 'Sabatons', 'Shoes'],
  amulet: ['Locket', 'Reliquary', 'Medal'], ring: ['Band', 'Signet', 'Ring'], off: ['Shield', 'Lantern', 'Censer'],
};
export const PREFIX = ['Mournful', 'Soot-Blessed', 'Waxen', 'Grave-Chilled', 'Tallow-Stained', 'Hallowed', 'Unquiet', 'Penitent', 'Rain-Soaked', 'Cracked', 'Bone-Dry', 'Vesper'];
export const SUFFIX = ['of the Second Burial', 'of Small Mercies', 'of Late Hours', 'of the Moor', 'of Quiet Regret', 'of the Passing Bell', 'of the Thrice Buried', 'of Dusk'];
export const WEAPON_NAMES = {
  mace: 'Hand-Bell', warhammer: 'War-Bell', flail: 'Chain Flail', staff: 'Lamp Staff', crossbow: 'Hand Crossbow', wand: 'Torch Wand', shovel: 'Spade', scythe: 'Scythe', sceptre: 'Grave Sceptre',
};
export const FLAVOUR = ['She rang it only once. It was enough.', 'The best one is still in him.', 'Smells of smoke and regret.', 'Previous owner: unavailable for comment.', 'Warm to the touch. Do not ask why.', 'It was a church bell on Tuesday.', 'Blessed by someone who meant well.', 'Sold as seen. Seen by whom is unclear.'];

// Legendary powers: small hook objects implemented in src/sim/powers.js by id
export const LEGENDARIES = {
  widows_clapper: { name: "The Widow's Clapper", slot: 'main', cls: 'bellwarden', base: 'mace', text: 'Great Toll rings twice more at half strength.', flavour: 'She rang it only once. It was enough.' },
  anvil_second: { name: 'Anvil of Second Thoughts', slot: 'off', cls: 'bellwarden', base: 'kite-shield', text: 'Clapper Charge drags enemies with you.', flavour: 'Heavy. Regrets weigh more.' },
  deaf_cowl: { name: "The Deaf Verger's Cowl", slot: 'head', cls: 'bellwarden', text: 'Immune to stuns. Resonance stacks to 8.', flavour: 'He heard nothing and lived.' },
  hymnal_greaves: { name: 'Hymnal Greaves', slot: 'legs', cls: 'bellwarden', text: 'Chain Reap fires a homing note at each enemy hit.', flavour: 'They hum when you kneel.' },
  last_wick: { name: 'The Last Wick', slot: 'main', cls: 'lamplighter', base: 'staff', text: 'Spark Bolt splits into 3 when Wick is over 70.', flavour: 'The best one is still in him.' },
  patient_moth: { name: 'Lantern of the Patient Moth', slot: 'off', cls: 'lamplighter', base: 'lantern', text: 'Lantern Hurl pools drag enemies in.', flavour: 'It waited. So will you.' },
  snuffer_mitts: { name: "Snuffer's Mitts", slot: 'hands', cls: 'lamplighter', text: 'Snuff refunds half its cost per 10 targets and resets Dusk Step.', flavour: 'Smells of smoke and regret.' },
  cinderwalk: { name: 'Cinderwalk Boots', slot: 'feet', cls: 'lamplighter', text: 'Dusk Step leaves a burning line.', flavour: 'Not for carpets.' },
  second_best_crook: { name: "Bishop's Second-Best Crook", slot: 'main', cls: 'sexton', base: 'sceptre', text: 'Pallbearers carry coffins and slam.', flavour: 'The best one is still in him.' },
  ledger_graves: { name: 'Ledger of Unpaid Graves', slot: 'off', cls: 'sexton', base: 'censer', text: 'Exhume has no Grave limit, +1 Tithe per Grave.', flavour: 'Every line is a plot.' },
  first_digger: { name: 'Spade of the First Digger', slot: 'hands', cls: 'sexton', text: 'Every 5th Shovel Swat digs a Grave.', flavour: 'Still has the first dirt on it.' },
  family_deed: { name: 'Family Plot Deed', slot: 'chest', cls: 'sexton', text: 'Coffin Drop drops 3 extra around the target.', flavour: 'Room for the whole family.' },
  plate_lining: { name: 'Plate-Lining', slot: 'amulet', text: 'Gold pickups heal 1% and add 1% damage for 5 s (up to 30%).', flavour: 'Lined with other peoples coins.' },
  thrice_buried: { name: 'Ring of the Thrice-Buried', slot: 'ring', text: 'Survive a fatal hit at 30% life, once per 90 s.', flavour: 'It keeps coming back. So do you.' },
  malison_knuckle: { name: "Malison's Knuckle", slot: 'ring', text: '+25% against elites; hits on elites chain to their minions.', flavour: 'A saints knuckle. Very old. A little salty.' },
  choir_baton: { name: "Choirmaster's Baton", slot: 'off', text: 'Every 6th skill is free and deals +100%.', flavour: 'Conducts nothing in particular.' },
  mourning_band: { name: 'Mourning Band', slot: 'ring', text: '+5% damage per live minion or dead ally, up to 30%.', flavour: 'Worn by the grieving and the thorough.' },
  clemency_shard: { name: "Clemency's Shard", slot: 'amulet', text: 'Every 12 s a note rings around you: 300% in 6 m.', flavour: 'A piece of the true bell.' },
};
export const LEGENDARY_IDS = Object.keys(LEGENDARIES);

export const SETS = {
  ringing_order: { name: 'Vestments of the Ringing Order', cls: 'bellwarden', bonus2: 'Resonance stacks to 10.', bonus4: 'Toll skills +300%; each Toll takes 2 s off Bellfall.', pieces: { head: 'Ringers Cowl', chest: 'Ringers Habit', hands: 'Ringers Mitts', feet: 'Ringers Boots' } },
  last_lamplighter: { name: 'Regalia of the Last Lamplighter', cls: 'lamplighter', bonus2: 'Burn +30%.', bonus4: 'Lamp Posts fire your Spark Bolt Tone at +400%.', pieces: { head: 'Last Hat', chest: 'Last Coat', hands: 'Last Gloves', feet: 'Last Boots' } },
  perpetual_mourner: { name: 'Weeds of the Perpetual Mourner', cls: 'sexton', bonus2: '+2 Pallbearers.', bonus4: 'Exhume +400%, and each Exhume heals minions.', pieces: { head: 'Mourners Topper', chest: 'Mourners Frock', hands: 'Mourners Gloves', feet: 'Mourners Boots' } },
};
export const SET_OF_CLASS = { bellwarden: 'ringing_order', lamplighter: 'last_lamplighter', sexton: 'perpetual_mourner' };

export const GEMS = {
  ember: { name: 'Ember Tear', color: 'orange', weapon: 'Damage', armour: 'Power' },
  salt: { name: 'Grave Salt', color: 'lime', weapon: 'Crit damage', armour: 'Vitality' },
  amber: { name: 'Choir Amber', color: 'sand', weapon: 'Attack speed', armour: 'Pick-up and gold' },
};
export const GEM_TIERS = ['Chipped', 'Flawed', 'Perfect'];
export const GEM_VALUE = { weapon: [4, 8, 14], armour: [8, 18, 36] };

export const MATERIALS = { scrap: 'Scrap', dust: 'Dust', shards: 'Bell Shards' };
export const SALVAGE = { common: ['scrap', 2], blessed: ['scrap', 4], reliquary: ['dust', 2], legendary: ['shards', 3], set: ['shards', 3] };
export const CRAFT_COST = { common: { scrap: 10 }, blessed: { scrap: 25 }, reliquary: { dust: 8, scrap: 20 }, legendary: { shards: 12, dust: 10 } };
export const REFORGE_COST = { dust: 3, scrap: 10 };
export const CASKET_COST = 8; // bell shards
