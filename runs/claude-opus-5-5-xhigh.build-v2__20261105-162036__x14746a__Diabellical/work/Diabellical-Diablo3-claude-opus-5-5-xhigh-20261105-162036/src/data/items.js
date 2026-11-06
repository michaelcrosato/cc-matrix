// Items as data: bases, affixes, rarities, name tables, gems, legendaries and sets.
export const SLOTS = ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet', 'amulet', 'ring', 'main', 'off'];
export const SLOT_NAMES = { head: 'HEAD', shoulders: 'SHOULDERS', chest: 'CHEST', hands: 'HANDS', legs: 'LEGS', feet: 'FEET', amulet: 'AMULET', ring: 'RING', main: 'MAIN HAND', off: 'OFF HAND' };
export const ARMOUR_SHARE = { head: 0.14, shoulders: 0.12, chest: 0.26, hands: 0.1, legs: 0.18, feet: 0.1, off: 0.1, main: 0, amulet: 0, ring: 0 };

export const RARITIES = {
  common: { id: 'common', name: 'COMMON', color: 'white', affixes: [0, 0], mult: 1, beam: 0, value: 1 },
  blessed: { id: 'blessed', name: 'BLESSED', color: 'sky', affixes: [1, 2], mult: 1.15, beam: 1.2, value: 2 },
  reliquary: { id: 'reliquary', name: 'RELIQUARY', color: 'sand', affixes: [3, 4], mult: 1.3, beam: 1.2, value: 4 },
  legendary: { id: 'legendary', name: 'LEGENDARY', color: 'orange', affixes: [4, 4], mult: 1.5, beam: 5, value: 10 },
  set: { id: 'set', name: 'SET', color: 'lime', affixes: [3, 3], mult: 1.5, beam: 5, value: 10 },
};
export const RARITY_ORDER = ['common', 'blessed', 'reliquary', 'legendary', 'set'];

export const WEAPONS = {
  hand_bell: { slot: 'main', name: 'HAND-BELL', model: 'hand-bell-weapon', cls: 'bellwarden', el: 'sound', icon: 'it_main' },
  war_bell: { slot: 'main', name: 'WAR-BELL', model: 'warhammer', cls: 'bellwarden', el: 'sound', icon: 'it_main' },
  chain_flail: { slot: 'main', name: 'CHAIN FLAIL', model: 'flail', cls: 'bellwarden', el: 'sound', icon: 'it_main' },
  lamp_staff: { slot: 'main', name: 'LAMP STAFF', model: 'staff', cls: 'lamplighter', el: 'flame', icon: 'it_staff' },
  hand_crossbow: { slot: 'main', name: 'HAND CROSSBOW', model: 'crossbow', cls: 'lamplighter', el: 'flame', icon: 'it_staff' },
  torch_wand: { slot: 'main', name: 'TORCH WAND', model: 'wand', cls: 'lamplighter', el: 'flame', icon: 'it_staff' },
  spade: { slot: 'main', name: 'SPADE', model: 'shovel', cls: 'sexton', el: 'grave', icon: 'it_spade' },
  scythe: { slot: 'main', name: 'SCYTHE', model: 'scythe', cls: 'sexton', el: 'grave', icon: 'it_spade' },
  grave_sceptre: { slot: 'main', name: 'GRAVE SCEPTRE', model: 'sceptre', cls: 'sexton', el: 'grave', icon: 'it_spade' },
};
export const OFFHANDS = {
  kite_shield: { slot: 'off', name: 'KITE SHIELD', model: 'kite-shield', icon: 'it_off' },
  round_shield: { slot: 'off', name: 'ROUND SHIELD', model: 'round-shield', icon: 'it_off' },
  lantern: { slot: 'off', name: 'LANTERN', model: 'hand-lantern', icon: 'it_lantern' },
  censer: { slot: 'off', name: 'CENSER', model: 'censer', icon: 'it_lantern' },
};
export const BASES = { ...WEAPONS, ...OFFHANDS };

export const ARMOUR_NAMES = {
  head: ['HOOD', 'COWL', 'COIF', 'PILGRIM CAP', 'GREAT HELM'],
  shoulders: ['MANTLE', 'SPAULDERS', 'PAULDRONS', 'YOKE', 'EPAULETTES'],
  chest: ['SURPLICE', 'CASSOCK', 'HAUBERK', 'CUIRASS', 'VESTMENT'],
  hands: ['MITTENS', 'GLOVES', 'GAUNTLETS', 'BRACERS', 'MITTS'],
  legs: ['BREECHES', 'CHAUSSES', 'LEGGINGS', 'GREAVES', 'TASSETS'],
  feet: ['CLOGS', 'BOOTS', 'SABATONS', 'SANDALS', 'GALOSHES'],
  amulet: ['AMULET', 'ROSARY', 'PENDANT', 'LOCKET', 'SCAPULAR'],
  ring: ['RING', 'BAND', 'SIGNET', 'LOOP', 'KNUCKLE'],
};
export const NAME_PREFIX = ['MOURNFUL', 'SOOT-BLESSED', 'WORM-EATEN', 'PATIENT', 'PENITENT', 'THREADBARE', 'UNHOLY', 'OVERDUE', 'PEAT-SOAKED', 'CRACKED', 'TOLLING', 'WAX-STAINED', 'GRAVE-KNEELING', 'THRICE-MENDED', 'LATE', 'WEEPING', 'RESIGNED', 'ANOINTED', 'DAMP', 'REPROACHFUL'];
export const NAME_SUFFIX = ['OF THE SECOND BURIAL', 'OF POOR ATTENDANCE', 'OF THE LAST PEW', 'OF UNPAID TITHES', 'OF THE WET MOOR', 'OF DULL SERMONS', 'OF THE LOW CANDLE', 'OF THE LONG VIGIL', 'OF THE NEW YARD', 'OF MINOR SAINTS', 'OF THE OLD YARD', 'OF THE SHALLOW GRAVE', 'OF THE LATE HOUR', 'OF SPLIT ROPES', 'OF THE LOCKED CRYPT'];
export const FLAVOR = [
  'SMELLS OF SMOKE AND REGRET.', 'THE BEST ONE IS STILL IN HIM.', 'SHE RANG IT ONLY ONCE. IT WAS ENOUGH.',
  'PREVIOUS OWNER: UNAVAILABLE FOR COMMENT.', 'A GIFT FROM THE PARISH. THE PARISH IS GONE.',
  'FOUND IN A GRAVE. RETURNED WITH INTEREST.', 'STILL WARM. NOBODY KNOWS WHY.', 'MENDED TWICE. BURIED THRICE.',
];

// value is rolled from [min, max] then scaled: flat stats grow with item level.
export const AFFIXES = {
  power: { label: 'POWER', flat: true, r: [2, 5], perL: 0.5, slots: null },
  vit: { label: 'VITALITY', flat: true, r: [2, 5], perL: 0.5, slots: null },
  armor: { label: 'ARMOUR', pct: true, r: [0.02, 0.07], slots: ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet', 'off'] },
  crit: { label: 'CRIT CHANCE', pct: true, r: [0.01, 0.05], slots: ['head', 'hands', 'amulet', 'ring', 'off'] },
  critdmg: { label: 'CRIT DAMAGE', pct: true, r: [0.1, 0.35], slots: ['hands', 'amulet', 'ring', 'main'] },
  atkspd: { label: 'ATTACK SPEED', pct: true, r: [0.03, 0.08], slots: ['hands', 'ring', 'amulet', 'main'] },
  cdr: { label: 'COOLDOWN REDUCTION', pct: true, r: [0.02, 0.07], slots: ['head', 'shoulders', 'hands', 'ring', 'amulet', 'off'] },
  costred: { label: 'COST REDUCTION', pct: true, r: [0.03, 0.08], slots: ['head', 'shoulders', 'off', 'ring'] },
  lifehit: { label: 'LIFE PER HIT', flat: true, r: [1, 3], perL: 0.25, slots: ['main', 'off', 'ring', 'amulet', 'legs'] },
  regen: { label: 'LIFE REGEN', flat: true, r: [1, 3], perL: 0.3, slots: ['chest', 'legs', 'shoulders', 'amulet', 'ring'] },
  speed: { label: 'MOVE SPEED', pct: true, r: [0.05, 0.12], slots: ['feet'] },
  area: { label: 'AREA DAMAGE', pct: true, r: [0.05, 0.15], slots: ['shoulders', 'chest', 'main', 'amulet'] },
  sound: { label: 'SOUND DAMAGE', pct: true, r: [0.04, 0.12], slots: ['amulet', 'chest', 'main', 'off'] },
  flame: { label: 'FLAME DAMAGE', pct: true, r: [0.04, 0.12], slots: ['amulet', 'chest', 'main', 'off'] },
  grave: { label: 'GRAVE DAMAGE', pct: true, r: [0.04, 0.12], slots: ['amulet', 'chest', 'main', 'off'] },
  maxres: { label: 'MAX RESOURCE', flat: true, r: [5, 15], perL: 0, slots: ['head', 'chest', 'off'] },
  gold: { label: 'GOLD FIND', pct: true, r: [0.08, 0.25], slots: ['legs', 'feet', 'ring', 'amulet'] },
  magic: { label: 'MAGIC FIND', pct: true, r: [0.05, 0.2], slots: ['head', 'ring', 'amulet', 'feet'] },
  pickup: { label: 'PICK-UP RADIUS', flat: true, r: [0.5, 1.5], perL: 0, slots: ['hands', 'feet', 'legs'] },
  thorns: { label: 'THORNS', flat: true, r: [2, 6], perL: 0.5, slots: ['chest', 'shoulders', 'off'] },
};
export const SOCKETABLE = ['main', 'head', 'chest', 'legs', 'off'];

export const GEM_KINDS = {
  ember: { name: 'EMBER TEAR', color: 'orange', weapon: { k: 'dmgpct', label: 'DAMAGE', v: [0.05, 0.1, 0.18], pct: true }, armour: { k: 'power', label: 'POWER', v: [6, 14, 26] } },
  salt: { name: 'GRAVE SALT', color: 'mist', weapon: { k: 'critdmg', label: 'CRIT DAMAGE', v: [0.15, 0.3, 0.5], pct: true }, armour: { k: 'vit', label: 'VITALITY', v: [6, 14, 26] } },
  amber: { name: 'CHOIR AMBER', color: 'sand', weapon: { k: 'atkspd', label: 'ATTACK SPEED', v: [0.04, 0.07, 0.12], pct: true }, armour: { k: 'pickup_gold', label: 'PICK-UP AND GOLD', v: [0.5, 1, 2] } },
};
export const GEM_TIERS = ['CHIPPED', 'WHOLE', 'FLAWLESS'];
export const gemId = (kind, tier) => `${kind}${tier}`;
export const parseGem = (id) => ({ kind: id.slice(0, -1), tier: Number(id.slice(-1)) });
export const gemName = (id) => { const g = parseGem(id); return `${GEM_TIERS[g.tier]} ${GEM_KINDS[g.kind].name}`; };

// Legendaries: hooks live in src/sim/powers.js under the same ids.
export const LEGENDARIES = {
  widows_clapper: { name: "THE WIDOW'S CLAPPER", slot: 'main', base: 'hand_bell', cls: 'bellwarden', group: 'weapon', power: 'GREAT TOLL RINGS TWICE MORE AT HALF STRENGTH.', flavor: 'SHE RANG IT ONLY ONCE. IT WAS ENOUGH.' },
  anvil_thoughts: { name: 'ANVIL OF SECOND THOUGHTS', slot: 'off', base: 'kite_shield', cls: 'bellwarden', group: 'armor', power: 'CLAPPER CHARGE DRAGS ENEMIES WITH YOU.', flavor: 'YOU MAY WISH TO RECONSIDER. IT WILL NOT.' },
  verger_cowl: { name: "THE DEAF VERGER'S COWL", slot: 'head', cls: 'bellwarden', group: 'armor', power: 'IMMUNE TO STUNS. RESONANCE STACKS TO 8.', flavor: 'HE NEVER HEARD THE BELL. HE NEVER STOPPED SWEEPING.' },
  hymnal_greaves: { name: 'HYMNAL GREAVES', slot: 'legs', cls: 'bellwarden', group: 'armor', power: 'CHAIN REAP FIRES A HOMING NOTE AT EACH ENEMY HIT.', flavor: 'THEY CREAK IN B FLAT.' },
  last_wick: { name: 'THE LAST WICK', slot: 'main', base: 'lamp_staff', cls: 'lamplighter', group: 'weapon', power: 'SPARK BOLT SPLITS INTO 3 WHEN WICK IS OVER 70.', flavor: 'THE BEST ONE IS STILL IN HIM.' },
  patient_moth: { name: 'LANTERN OF THE PATIENT MOTH', slot: 'off', base: 'lantern', cls: 'lamplighter', group: 'armor', power: 'LANTERN HURL POOLS DRAG ENEMIES IN.', flavor: 'IT HAS WAITED A LONG TIME TO BE THIS CLOSE.' },
  snuffers_mitts: { name: "SNUFFER'S MITTS", slot: 'hands', cls: 'lamplighter', group: 'armor', power: 'SNUFF REFUNDS HALF ITS COST PER 10 TARGETS AND RESETS DUSK STEP.', flavor: 'SMELLS OF SMOKE AND REGRET.' },
  cinderwalk_boots: { name: 'CINDERWALK BOOTS', slot: 'feet', cls: 'lamplighter', group: 'armor', power: 'DUSK STEP LEAVES A BURNING LINE.', flavor: 'NOT SUITABLE FOR INDOOR USE.' },
  second_best_crook: { name: "BISHOP'S SECOND-BEST CROOK", slot: 'main', base: 'grave_sceptre', cls: 'sexton', group: 'weapon', power: 'PALLBEARERS CARRY COFFINS AND SLAM.', flavor: 'THE BEST ONE IS IN THE COFFIN. WITH THE SPADE.' },
  unpaid_graves: { name: 'LEDGER OF UNPAID GRAVES', slot: 'off', base: 'censer', cls: 'sexton', group: 'armor', power: 'EXHUME HAS NO GRAVE LIMIT. +1 TITHE PER GRAVE.', flavor: 'THE DEAD ARE IN ARREARS.' },
  first_digger: { name: 'SPADE OF THE FIRST DIGGER', slot: 'hands', cls: 'sexton', group: 'armor', power: 'EVERY 5TH SHOVEL SWAT DIGS A GRAVE.', flavor: 'WORN SMOOTH BY HONEST WORK AND ONE DISHONEST.' },
  family_deed: { name: 'FAMILY PLOT DEED', slot: 'chest', cls: 'sexton', group: 'armor', power: 'COFFIN DROP DROPS 3 EXTRA AROUND THE TARGET.', flavor: 'ROOM FOR EVERYONE. ALL AT ONCE.' },
  plate_lining: { name: 'PLATE-LINING', slot: 'amulet', group: 'jewel', power: 'GOLD HEALS 1%. +1% DAMAGE PER PICKUP, UP TO 30%, FOR 5 S.', flavor: 'SCRAPED FROM THE INSIDE OF A LIVING OFFERING DISH.' },
  thrice_buried: { name: 'RING OF THE THRICE-BURIED', slot: 'ring', group: 'jewel', power: 'SURVIVE A FATAL HIT AT 30% LIFE, ONCE PER 90 S.', flavor: 'ONE LEARNS TO KEEP A SPADE IN THE COFFIN.' },
  malisons_knuckle: { name: "MALISON'S KNUCKLE", slot: 'ring', group: 'jewel', power: '+25% AGAINST ELITES. HITS ON ELITES CHAIN TO THEIR MINIONS.', flavor: 'VERY OLD. A LITTLE SALTY. SHE DIED ANGRY.' },
  choir_baton: { name: "CHOIRMASTER'S BATON", slot: 'off', base: 'censer', group: 'armor', power: 'EVERY 6TH SKILL IS FREE AND DEALS +100%.', flavor: 'AND ONE, AND TWO, AND THE WALLS COME DOWN.' },
  mourning_band: { name: 'MOURNING BAND', slot: 'ring', group: 'jewel', power: '+5% DAMAGE PER LIVE MINION OR DEAD ALLY, UP TO 30%.', flavor: 'GRIEF IS A KIND OF INCOME.' },
  clemency_shard: { name: "CLEMENCY'S SHARD", slot: 'amulet', group: 'jewel', power: 'EVERY 12 S A NOTE RINGS AROUND YOU: 300% IN 6 M.', flavor: 'IT HUMS. IT HAS NOT STOPPED HUMMING.' },
};
for (const [id, l] of Object.entries(LEGENDARIES)) l.id = id;

export const SETS = {
  ringing_order: {
    id: 'ringing_order', name: 'VESTMENTS OF THE RINGING ORDER', cls: 'bellwarden', pieces: { head: 'COWL OF THE RINGING ORDER', chest: 'CASSOCK OF THE RINGING ORDER', hands: 'ROPEBURNS OF THE RINGING ORDER', feet: 'CLOGS OF THE RINGING ORDER' },
    two: 'RESONANCE STACKS TO 10.', four: 'TOLL SKILLS +300%. EACH TOLL TAKES 2 S OFF BELLFALL.',
  },
  last_lamplighter: {
    id: 'last_lamplighter', name: 'REGALIA OF THE LAST LAMPLIGHTER', cls: 'lamplighter', pieces: { head: 'HAT OF THE LAST LAMPLIGHTER', chest: 'COAT OF THE LAST LAMPLIGHTER', hands: 'TONGS OF THE LAST LAMPLIGHTER', feet: 'BOOTS OF THE LAST LAMPLIGHTER' },
    two: 'BURN +30%.', four: 'LAMP POSTS FIRE YOUR SPARK BOLT TONE AT +400%.',
  },
  perpetual_mourner: {
    id: 'perpetual_mourner', name: 'WEEDS OF THE PERPETUAL MOURNER', cls: 'sexton', pieces: { head: 'VEIL OF THE PERPETUAL MOURNER', chest: 'WEEDS OF THE PERPETUAL MOURNER', hands: 'GLOVES OF THE PERPETUAL MOURNER', feet: 'GALOSHES OF THE PERPETUAL MOURNER' },
    two: '+2 PALLBEARERS.', four: 'EXHUME +400%. EACH EXHUME HEALS MINIONS.',
  },
};
export const SET_BY_CLASS = { bellwarden: 'ringing_order', lamplighter: 'last_lamplighter', sexton: 'perpetual_mourner' };

export const DEVOTION_TRACKS = {
  core: { name: 'CORE', color: 'red', stats: [['power', 'POWER', 3], ['vit', 'VITALITY', 3], ['speedpct', 'SPEED', 0.002], ['maxres', 'MAX RESOURCE', 0.5]] },
  offence: { name: 'OFFENCE', color: 'orange', stats: [['atkspd', 'ATTACK SPEED', 0.002], ['crit', 'CRIT', 0.001], ['critdmg', 'CRIT DAMAGE', 0.01], ['cdr', 'COOLDOWN', 0.002]] },
  defence: { name: 'DEFENCE', color: 'sky', stats: [['lifepct', 'LIFE', 0.005], ['armorpct', 'ARMOUR', 0.005], ['regen', 'REGEN', 1], ['drpct', 'REDUCTION', 0.001]] },
  utility: { name: 'UTILITY', color: 'lime', stats: [['area', 'AREA', 0.005], ['costred', 'COST', 0.002], ['lifehit', 'LIFE PER HIT', 1], ['gold', 'GOLD', 0.01]] },
};
