// Slots, bases, rarities, affixes, gems, legendaries and sets.
export const SLOTS = ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet', 'amulet', 'ring', 'main', 'off'];
export const SLOT_NAMES = { head: 'HEAD', shoulders: 'SHOULDERS', chest: 'CHEST', hands: 'HANDS', legs: 'LEGS', feet: 'FEET', amulet: 'AMULET', ring: 'RING', main: 'MAIN HAND', off: 'OFF HAND' };
export const ARMOUR_SLOTS = ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet', 'off'];
export const RARITIES = {
  common: { id: 'common', name: 'COMMON', color: 'white', affixes: [0, 0], mult: 1, order: 0 },
  blessed: { id: 'blessed', name: 'BLESSED', color: 'sky', affixes: [1, 2], mult: 1.15, order: 1 },
  reliquary: { id: 'reliquary', name: 'RELIQUARY', color: 'sand', affixes: [3, 4], mult: 1.3, order: 2 },
  legendary: { id: 'legendary', name: 'LEGENDARY', color: 'orange', affixes: [4, 4], mult: 1.5, order: 3 },
  set: { id: 'set', name: 'SET', color: 'lime', affixes: [3, 3], mult: 1.5, order: 3 },
};
export const WEAPONS = {
  bellwarden: [{ id: 'mace', name: 'Hand-Bell', model: 'mace' }, { id: 'warhammer', name: 'War-Bell', model: 'warhammer' }, { id: 'flail', name: 'Chain Flail', model: 'flail' }],
  lamplighter: [{ id: 'staff', name: 'Lamp Staff', model: 'staff' }, { id: 'crossbow', name: 'Hand Crossbow', model: 'crossbow' }, { id: 'wand', name: 'Torch Wand', model: 'wand' }],
  sexton: [{ id: 'shovel', name: 'Spade', model: 'shovel' }, { id: 'scythe', name: 'Scythe', model: 'scythe' }, { id: 'sceptre', name: 'Grave Sceptre', model: 'sceptre' }],
};
export const OFFHANDS = [{ id: 'kite', name: 'Kite Shield', model: 'kite-shield' }, { id: 'round', name: 'Round Shield', model: 'round-shield' }, { id: 'lantern', name: 'Lantern', model: 'hanging-lantern' }, { id: 'censer', name: 'Censer', model: 'i_censer' }];
export const BASE_NAMES = {
  head: ['Hood', 'Cowl', 'Coif', 'Sallet', 'Mitre'], shoulders: ['Mantle', 'Pauldrons', 'Spaulders', 'Shoulder Yoke'], chest: ['Cope', 'Hauberk', 'Frock', 'Cuirass', 'Surplice'],
  hands: ['Mitts', 'Gauntlets', 'Grips', 'Wraps'], legs: ['Greaves', 'Breeches', 'Cuisses', 'Leggings'], feet: ['Boots', 'Sabatons', 'Clogs', 'Treads'],
  amulet: ['Amulet', 'Rosary', 'Reliquary Chain', 'Locket'], ring: ['Ring', 'Band', 'Signet', 'Seal'],
};
export const PREFIXES = ['Mournful', 'Soot-Blessed', 'Hollow', 'Gravewarm', 'Tarnished', 'Consecrated', 'Unquiet', 'Wax-Stained', 'Peat-Sodden', 'Thrice-Blessed', 'Sorrowing', 'Cracked', 'Vesper', 'Bell-Bitten', 'Penitent', 'Lamentable'];
export const SUFFIXES = ['of the Second Burial', 'of Small Mercies', 'of the Late Parish', 'of Overdue Grief', 'of the Long Dusk', 'of Cold Candles', 'of the Old Yard', 'of Unpaid Tithes', 'of the Wet Moor', 'of Quiet Hours', 'of Clemency', 'of the Unrung'];
export const COMMON_FLAVOUR = ['Smells of smoke and regret.', 'It has been worn by better corpses.', 'Previously owned, briefly.', 'The stain is part of the design.', 'Somebody wept on this. Somebody always has.', 'Blessed, if you do not check the paperwork.'];

// v(level) gives the roll's top; the roll is 60-100% of it. armourOnly / weaponOnly restrict slots.
export const AFFIXES = {
  power: { label: 'POWER', fmt: '+#', v: (L) => 3 + L * 1.1 },
  vitality: { label: 'VITALITY', fmt: '+#', v: (L) => 3 + L * 1.1 },
  armourPct: { label: 'ARMOUR', fmt: '+#%', v: () => 12 },
  crit: { label: 'CRIT CHANCE', fmt: '+#%', v: () => 7 },
  critDmg: { label: 'CRIT DAMAGE', fmt: '+#%', v: () => 40 },
  atkSpd: { label: 'ATTACK SPEED', fmt: '+#%', v: () => 12 },
  cdr: { label: 'COOLDOWN', fmt: '-#%', v: () => 12 },
  costRed: { label: 'SKILL COST', fmt: '-#%', v: () => 14 },
  lifePerHit: { label: 'LIFE PER HIT', fmt: '+#', v: (L) => 1 + L * 0.6 },
  regen: { label: 'LIFE REGEN', fmt: '+#/S', v: (L) => 1 + L * 0.5 },
  moveSpd: { label: 'MOVE SPEED', fmt: '+#%', v: () => 12, slots: ['feet'] },
  area: { label: 'AREA DAMAGE', fmt: '+#%', v: () => 20 },
  soundPct: { label: 'SOUND DAMAGE', fmt: '+#%', v: () => 18 },
  flamePct: { label: 'FLAME DAMAGE', fmt: '+#%', v: () => 18 },
  gravePct: { label: 'GRAVE DAMAGE', fmt: '+#%', v: () => 18 },
  maxRes: { label: 'MAX RESOURCE', fmt: '+#', v: () => 20 },
  goldFind: { label: 'GOLD FIND', fmt: '+#%', v: () => 40 },
  magicFind: { label: 'MAGIC FIND', fmt: '+#%', v: () => 30 },
  pickup: { label: 'PICK-UP RADIUS', fmt: '+# M', v: () => 2 },
  thorns: { label: 'THORNS', fmt: '+#', v: (L) => 3 + L * 1.5 },
  socket: { label: 'SOCKET', fmt: '', v: () => 1, slots: ['main', 'off', 'chest', 'head', 'legs', 'amulet', 'ring'] },
};
export const AFFIX_IDS = Object.keys(AFFIXES);
export const fmtAffix = (a) => { const d = AFFIXES[a.k]; if (a.k === 'socket') return 'EMPTY SOCKET'; return `${d.fmt.replace('#', String(a.v))} ${d.label}`.trim(); };

export const GEMS = {
  ember: { id: 'ember', name: 'Ember Tear', color: 'orange', weapon: { k: 'dmgPct', label: 'DAMAGE', per: [8, 14, 22] }, armour: { k: 'power', label: 'POWER', per: [6, 12, 22] } },
  salt: { id: 'salt', name: 'Grave Salt', color: 'mist', weapon: { k: 'critDmg', label: 'CRIT DAMAGE', per: [15, 30, 50] }, armour: { k: 'vitality', label: 'VITALITY', per: [6, 12, 22] } },
  amber: { id: 'amber', name: 'Choir Amber', color: 'sand', weapon: { k: 'atkSpd', label: 'ATTACK SPEED', per: [5, 9, 14] }, armour: { k: 'pickup', label: 'PICK-UP AND GOLD', per: [1, 2, 3], gold: [10, 20, 35] } },
};
export const GEM_TIERS = ['Chipped', 'Whole', 'Flawless'];
export const GEM_IDS = Object.keys(GEMS);

export const LEGENDARIES = [
  { id: 'widows_clapper', name: "The Widow's Clapper", slot: 'main', cls: 'bellwarden', weapon: 'warhammer', power: 'Great Toll rings twice more at half strength.', flavour: 'She rang it only once. It was enough.' },
  { id: 'anvil', name: 'Anvil of Second Thoughts', slot: 'off', cls: 'bellwarden', power: 'Clapper Charge drags enemies with you.', flavour: 'It was a shield. Then it was a mistake.' },
  { id: 'deaf_cowl', name: "The Deaf Verger's Cowl", slot: 'head', cls: 'bellwarden', power: 'Immune to stuns; Resonance stacks to 8.', flavour: 'He heard nothing. It was a mercy.' },
  { id: 'hymnal_greaves', name: 'Hymnal Greaves', slot: 'legs', cls: 'bellwarden', power: 'Chain Reap fires a homing note at each enemy hit.', flavour: 'Every step in key. Every foe off it.' },
  { id: 'last_wick', name: 'The Last Wick', slot: 'main', cls: 'lamplighter', weapon: 'staff', power: 'Spark Bolt splits into 3 when Wick is over 70.', flavour: 'Trim it, and it burns at both ends.' },
  { id: 'patient_moth', name: 'Lantern of the Patient Moth', slot: 'off', cls: 'lamplighter', power: 'Lantern Hurl pools drag enemies in.', flavour: 'It has waited a long time for you.' },
  { id: 'snuffer_mitts', name: "Snuffer's Mitts", slot: 'hands', cls: 'lamplighter', power: 'Snuff refunds half its cost per 10 targets and resets Dusk Step.', flavour: 'Lick the fingers first.' },
  { id: 'cinderwalk', name: 'Cinderwalk Boots', slot: 'feet', cls: 'lamplighter', power: 'Dusk Step leaves a burning line.', flavour: 'Smells of smoke and regret.' },
  { id: 'second_crook', name: "Bishop's Second-Best Crook", slot: 'main', cls: 'sexton', weapon: 'sceptre', power: 'Pallbearers carry coffins and slam.', flavour: 'The best one is still in him.' },
  { id: 'ledger_graves', name: 'Ledger of Unpaid Graves', slot: 'off', cls: 'sexton', power: 'Exhume has no Grave limit, +1 Tithe per Grave.', flavour: 'All accounts fall due.' },
  { id: 'first_digger', name: 'Spade of the First Digger', slot: 'hands', cls: 'sexton', power: 'Every 5th Shovel Swat digs a Grave.', flavour: 'You will need a bigger hole.' },
  { id: 'family_deed', name: 'Family Plot Deed', slot: 'chest', cls: 'sexton', power: 'Coffin Drop drops 3 extra around the target.', flavour: 'Room for everyone. Everyone will need it.' },
  { id: 'plate_lining', name: 'Plate-Lining', slot: 'amulet', power: 'Gold pickups heal 1%, and +1% damage per pickup up to 30% for 5 s.', flavour: 'Gold is a great comfort, in the short term.' },
  { id: 'thrice_buried', name: 'Ring of the Thrice-Buried', slot: 'ring', power: 'Survive a fatal hit at 30% life, once in 90 s.', flavour: 'One learns to keep a spade in the coffin.' },
  { id: 'malisons_knuckle', name: "Malison's Knuckle", slot: 'ring', power: '+25% against elites; hits on elites chain to their minions.', flavour: 'Very old. A little salty. She died angry.' },
  { id: 'choirmaster', name: "Choirmaster's Baton", slot: 'off', power: 'Every 6th skill is free and deals +100%.', flavour: 'And one, and two, and bury the altos.' },
  { id: 'mourning_band', name: 'Mourning Band', slot: 'ring', power: '+5% damage per live minion or dead ally, up to 30%.', flavour: 'Worn for everyone, eventually.' },
  { id: 'clemency_shard', name: "Clemency's Shard", slot: 'amulet', power: 'Every 12 s a note rings around you: 300% in 6 m.', flavour: 'It hums when you are not listening.' },
];
export const LEGENDARY = Object.fromEntries(LEGENDARIES.map((l) => [l.id, l]));
export const SETS = {
  ringing_order: { id: 'ringing_order', name: 'Vestments of the Ringing Order', cls: 'bellwarden', two: 'Resonance stacks to 10.', four: 'Toll skills +300%; each Toll takes 2 s off Bellfall.', pieces: { head: 'Ringer\'s Hood', chest: 'Ringer\'s Cope', hands: 'Ringer\'s Grips', feet: 'Ringer\'s Clogs' } },
  last_lamplighter: { id: 'last_lamplighter', name: 'Regalia of the Last Lamplighter', cls: 'lamplighter', two: 'Burn +30%.', four: 'Lamp Posts fire your Spark Bolt Tone at +400%.', pieces: { head: 'Wide-Brim of the Last Watch', chest: 'Long Coat of the Last Watch', hands: 'Trimmers of the Last Watch', feet: 'Night-Boots of the Last Watch' } },
  perpetual_mourner: { id: 'perpetual_mourner', name: 'Weeds of the Perpetual Mourner', cls: 'sexton', two: '+2 Pallbearers.', four: 'Exhume +400%, and each Exhume heals minions.', pieces: { head: 'Mourner\'s Stovepipe', chest: 'Mourner\'s Frock', hands: 'Mourner\'s Gloves', feet: 'Mourner\'s Clogs' } },
};
export const SET_FLAVOUR = 'Sold by the parish, in instalments.';
export const SET_FOR_CLASS = { bellwarden: 'ringing_order', lamplighter: 'last_lamplighter', sexton: 'perpetual_mourner' };
export const SALVAGE = { common: { scrap: 2 }, blessed: { scrap: 5 }, reliquary: { dust: 3 }, legendary: { shards: 2 }, set: { shards: 2 } };
export const CRAFT_COST = { blessed: { scrap: 12, gold: 60 }, reliquary: { scrap: 20, dust: 6, gold: 200 } };
export const REFORGE_COST = { dust: 2, gold: 80 };
export const CASKET_COST = { shards: 3 };
export const SOCKET_COST = 0;
export const STASH_TABS = 3;
export const STASH_SIZE = 30;
export const INV_SIZE = 40;
export const DEVOTION_TRACKS = {
  core: { name: 'CORE', color: 'red', perk: 'POWER, VITALITY, SPEED, RESOURCE', stats: { power: 2, vitality: 2, moveSpd: 0.2, maxRes: 0.4 } },
  offence: { name: 'OFFENCE', color: 'orange', perk: 'ATTACK SPEED, CRIT, CRIT DAMAGE, COOLDOWN', stats: { atkSpd: 0.2, crit: 0.1, critDmg: 1, cdr: 0.2 } },
  defence: { name: 'DEFENCE', color: 'sky', perk: 'LIFE, ARMOUR, REGEN, REDUCTION', stats: { lifePct: 0.5, armourPct: 0.5, regen: 1, dr: 0.1 } },
  utility: { name: 'UTILITY', color: 'lime', perk: 'AREA, COST, LIFE PER HIT, GOLD', stats: { area: 0.5, costRed: 0.2, lifePerHit: 1, goldFind: 1 } },
};
export const devotionCost = (n) => 15000 + 1500 * n;
