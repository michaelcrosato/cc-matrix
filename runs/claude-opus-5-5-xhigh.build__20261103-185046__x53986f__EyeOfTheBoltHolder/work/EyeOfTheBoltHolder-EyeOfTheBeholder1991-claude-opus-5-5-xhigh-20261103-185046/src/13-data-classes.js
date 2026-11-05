/* =====================================================================================
 * 13-data-classes: races, classes, starting gear, the premade party, the NPCs, the looks (rig options) and names
 * ===================================================================================== */
B.RACES = {
  human: { name: 'Human', mods: {}, cls: 'FPRCMT', trait: 'Gains 5% more experience.', xp: 1.05 },
  dwarf: { name: 'Dwarf', mods: { con: 1, dex: -1 }, cls: 'FCT', trait: 'Shrugs off half of all poison. Has a beard.', poison: .5 },
  elf: { name: 'Elf', mods: { dex: 1, con: -1 }, cls: 'FRMT', trait: 'Resists Hold half the time.', hold: .5 },
  halfling: { name: 'Halfling', mods: { dex: 1, str: -1 }, cls: 'FCT', trait: '+1 to hit with slings, darts and thrown weapons.', toss: 1 }
};
B.CLASSES = {
  F: { id: 'F', name: 'Fighter', hd: 10, hitK: 1, extra: 1, xp: 1.0, min: { str: 9 }, about: 'Fights in the front row with any weapon and any armour.' },
  P: { id: 'P', name: 'Paladin', hd: 10, hitK: 1, xp: 1.2, min: { str: 12, wis: 13 }, about: 'A holy warrior. Lays on hands once a rest; prays Mend from level 3.' },
  R: { id: 'R', name: 'Ranger', hd: 8, hitK: 1, xp: 1.15, min: { str: 13, dex: 13 }, about: 'Two weapons with no penalty, sure with bows, and tracks foes on the map.' },
  C: { id: 'C', name: 'Cleric', hd: 8, hitK: .75, xp: .95, min: { wis: 9 }, about: 'Prays to the Warder: heals, wards and turns the dead. Blunt weapons only.' },
  M: { id: 'M', name: 'Mage', hd: 4, hitK: .5, xp: 1.1, min: { int: 9 }, about: 'Casts arcane spells from a spellbook. Frail, and deadly.' },
  T: { id: 'T', name: 'Thief', hd: 6, hitK: .75, xp: .9, min: { dex: 9 }, about: 'Picks simple locks, finds and disarms traps, and stabs the unwary.' }
};
B.CLASS_ORDER = ['F', 'P', 'R', 'C', 'M', 'T'];
B.RACE_ORDER = ['human', 'dwarf', 'elf', 'halfling'];
/** blunt only for clerics; mages are held to a short list */
B.canWield = (cls, id) => {
  const d = B.IT(id); if (!d) return false;
  if (cls === 'C' && (d.kind === 'weapon' || d.kind === 'missile') && !(d.blunt || id === 'sling')) return false;
  if (cls === 'M' && (d.kind === 'weapon' || d.kind === 'missile') && !['dagger', 'rustyDagger', 'staff', 'darts', 'sling'].includes(id)) return false;
  return !d.cls || d.cls.includes(cls);
};
B.START_GEAR = {
  F: { main: 'longSword', off: 'woodenShield', body: 'leatherArmor', pack: ['ration'] },
  P: { main: 'longSword', off: 'woodenShield', body: 'chainShirt', pack: ['ration'] },
  R: { main: 'shortSword', off: 'shortSword', body: 'leatherArmor', quiver: ['arrows', 20], pack: ['shortBow', 'ration'] },
  C: { main: 'mace', off: 'holySymbol', body: 'leatherArmor', pack: ['ration'] },
  M: { main: 'dagger', off: 'spellbook', body: 'travellersRobe', pack: ['ration'], book: ['sparkDart', 'findSeams', 'slumber'] },
  T: { main: 'shortSword', off: ['darts', 6], body: 'leatherArmor', pack: ['lockpicks', 'ration'] }
};
/* ---- looks: E.Humanoid options as plain data (the presenter makes the rigs). 6 presets for each race and sex ---- */
const SKINS = { human: ['#e8c0a0', '#d8a888', '#b88060', '#8a5a3a', '#f0d0b8', '#c89070'], dwarf: ['#d8a888', '#c89070', '#e0b090', '#b8805a', '#d0a080', '#a87050'],
  elf: ['#f0d8c0', '#e8c8a8', '#d8b898', '#c8a888', '#f4e0cc', '#b89878'], halfling: ['#e8c0a0', '#d8a888', '#c89070', '#f0c8a8', '#b88060', '#e0b090'] };
const HAIRS = ['#4a2e1e', '#2a1a12', '#c8a050', '#8a3a1e', '#d8d0c0', '#6a4a2a'];
const CLOTHS = ['#7a3a2e', '#3a5a3e', '#3a3a7a', '#6a4a2a', '#5a2a4a', '#2e4a5a'];
B.lookOf = (race, sex, i) => {
  i = ((i % 6) + 6) % 6;
  const f = sex === 'f', hair = f ? ['long', 'ponytail', 'long', 'short', 'ponytail', 'long'][i] : ['short', 'spiky', 'short', 'bald', 'long', 'short'][i];
  const o = { build: race === 'dwarf' ? 'bulky' : race === 'elf' ? 'heroic' : race === 'halfling' ? 'chibi' : 'heroic', size: race === 'halfling' ? .95 : race === 'dwarf' ? 1.1 : 1.25,
    hair, colors: { skin: SKINS[race][i], hair: HAIRS[(i + (f ? 2 : 0)) % 6], cloth: CLOTHS[i], pants: '#3a3440', boot: '#2a2420' } };
  if (race === 'dwarf' && !f) o.beard = i % 2 ? 'braided' : 'full';
  if (race === 'dwarf' && f && i >= 4) o.beard = 'braided';
  if (i === 3 && !f) o.hat = 'cap';
  if (i === 5) o.hood = true;
  return o;
};
/** the class's own touch on a look: a fighter's helmet, a mage's pointed hat, a cleric's band */
B.dressFor = (look, cls) => {
  const o = B.clone(look);
  if (cls === 'F' || cls === 'P') { o.armor = true; if (!o.hat && !o.hood) o.hat = { style: 'helmet', color: '#8a92a0' }; o.colors.plate = cls === 'P' ? '#d8d0b0' : '#9a9aa8'; }
  if (cls === 'M') { o.outfit = 'robe'; o.weapon = 'staff'; if (!o.hood) o.hat = { style: 'pointed', color: o.colors.cloth }; }
  if (cls === 'C') { o.outfit = 'robe'; o.weapon = null; if (!o.hat && !o.hood) o.hat = { style: 'band', color: '#c8a040' }; }
  if (cls === 'T') { o.hood = true; o.outfit = 'tunic'; o.bladeLen = 6; }
  if (cls === 'R') { o.outfit = 'tunic'; o.cape = { len: 5, width: 4, seg: 2.5 }; o.colors.cape = '#3a5a2e'; }
  return o;
};
B.NAMES = {
  human: ['Aldric', 'Brenna', 'Corwin', 'Dara', 'Edric', 'Fenna', 'Garrick', 'Hesper', 'Iven', 'Jessa', 'Kell', 'Lorna'],
  dwarf: ['Borin', 'Dagna', 'Fargrim', 'Helga', 'Korrin', 'Marta', 'Orsik', 'Rurik', 'Sigrun', 'Thrain', 'Vonda', 'Hadra'],
  elf: ['Aelar', 'Caelynn', 'Erevan', 'Ilyra', 'Lia', 'Mirel', 'Naeris', 'Quillon', 'Sariel', 'Thamior', 'Vaela', 'Ysolin'],
  halfling: ['Alton', 'Bree', 'Cade', 'Dimble', 'Eldon', 'Kithri', 'Lavinia', 'Merric', 'Nedda', 'Perrin', 'Rosie', 'Wellby']
};
/* ---- the premade party (Quick Start), and the NPCs ---- */
B.PREMADE = [
  { id: 'brannoc', name: 'Brannoc', full: 'Brannoc Ironside', race: 'human', sex: 'm', cls: 'F', stats: { str: 17, dex: 12, con: 16, int: 9, wis: 10 }, hp: 12,
    gear: { main: 'longSword', off: 'woodenShield', body: 'leatherArmor', pack: ['ration'] },
    look: { build: 'heroic', size: 1.3, armor: true, hair: 'short', hat: { style: 'helmet', color: '#8a92a0' }, colors: { cloth: '#7a3a2e', pants: '#3a3440', hair: '#4a2e1e', skin: '#d8a888', metal: '#b8c0cc', plate: '#9aa0ac' } } },
  { id: 'ysa', name: 'Ysa', full: 'Ysa Thornfeather', race: 'elf', sex: 'f', cls: 'R', stats: { str: 14, dex: 17, con: 12, int: 12, wis: 13 }, hp: 8,
    gear: { main: 'shortSword', off: 'shortSword', body: 'leatherArmor', quiver: ['arrows', 20], pack: ['shortBow', 'ration'] },
    look: { build: 'heroic', size: 1.25, hair: 'ponytail', hood: true, outfit: 'tunic', cape: { len: 5, width: 4, seg: 2.5 }, colors: { cloth: '#3a5a3e', pants: '#2e2a26', hair: '#c8a050', skin: '#f0d8c0', cape: '#2e4a2a' } } },
  { id: 'cobb', name: 'Cobb', full: 'Father Cobb', race: 'dwarf', sex: 'm', cls: 'C', stats: { str: 13, dex: 9, con: 16, int: 10, wis: 16 }, hp: 10, prep: { mend: 2 },
    gear: { main: 'mace', off: 'holySymbol', body: 'leatherArmor', pack: ['ration'] },
    look: { build: 'bulky', size: 1.1, hair: 'bald', beard: 'full', outfit: 'robe', weapon: null, hat: { style: 'band', color: '#c8a040' }, colors: { cloth: '#d8d0b8', pants: '#8a7a5a', hair: '#8a3a1e', skin: '#d8a888' } } },
  { id: 'odelia', name: 'Odelia', full: 'Odelia Fenn', race: 'human', sex: 'f', cls: 'M', stats: { str: 8, dex: 14, con: 11, int: 17, wis: 11 }, hp: 4, prep: { sparkDart: 1, slumber: 1 },
    gear: { main: 'dagger', off: 'spellbook', body: 'travellersRobe', pack: [['darts', 4], 'ration'] }, book: ['sparkDart', 'findSeams', 'slumber'],
    look: { build: 'heroic', size: 1.2, hair: 'long', outfit: 'robe', weapon: 'staff', hat: { style: 'pointed', color: '#3a3a7a' }, colors: { cloth: '#3a3a7a', pants: '#2a2a4a', hair: '#e0e0e8', skin: '#e0b090' } } }
];
B.NPCS = {
  tamsin: { id: 'tamsin', name: 'Tamsin', full: 'Tamsin Pell', race: 'halfling', sex: 'f', cls: 'T', lvl: 2, stats: { str: 10, dex: 17, con: 13, int: 13, wis: 9 }, hp: 12,
    gear: { main: 'dagger', off: ['darts', 6], body: 'leatherArmor', pack: ['lockpicks'] },
    look: { build: 'chibi', size: .95, hair: 'ponytail', hood: true, outfit: 'tunic', bladeLen: 5, colors: { cloth: '#3a6a3a', hair: '#8a3a1e', skin: '#e8c0a0', pants: '#4a3a2a' } } },
  durgan: { id: 'durgan', name: 'Durgan', full: 'Durgan Copperhand', race: 'dwarf', sex: 'm', cls: 'F', lvl: 3, stats: { str: 17, dex: 10, con: 17, int: 11, wis: 10 }, hp: 28,
    gear: { main: 'copperhandsMaul', off: 'buckler', head: 'ironHelm', body: 'scaleMail' },
    look: { build: 'bulky', size: 1.15, armor: true, hair: 'short', beard: 'braided', hat: { style: 'helmet', color: '#7a7e8a' }, weapon: 'sword', bladeLen: 7, colors: { cloth: '#6a3a1e', hair: '#c87a3a', skin: '#d8a080', plate: '#a8784a', metal: '#c87a3a' } } },
  veil: { id: 'veil', name: 'Veil', full: 'Sister Veil', race: 'human', sex: 'f', cls: 'C', lvl: 4, stats: { str: 10, dex: 13, con: 12, int: 14, wis: 17 }, hp: 23,
    prep: { mend: 3, steadyHand: 1, purge: 2, holdFast: 1 },
    gear: { main: 'staff', off: 'veilsLantern', body: 'paddedJerkin' },
    look: { build: 'heroic', size: 1.2, outfit: 'robe', hood: true, weapon: 'staff', eyesShut: true, colors: { cloth: '#d8d0e8', hair: '#3a2a4a', skin: '#c8c0d0', trim: '#6a4a9a' } } }
};
/* the people of the story (portraits and cutscenes) */
B.PEOPLE = {
  narrator: { name: '', voice: 'narrator' },
  strake: { name: 'High Keywarden Strake', voice: 'keywarden', look: { build: 'heroic', size: 1.3, hat: { style: 'band', color: '#c8c8d8' }, outfit: 'coat', hair: 'long', weapon: null, colors: { cloth: '#2a3a6a', coat: '#2a3a6a', hair: '#3a2a20', skin: '#d8b090', trim: '#c8c8d8' } } },
  lintel: { name: 'Magister Lintel', voice: 'lintel', look: { build: 'heroic', size: 1.25, outfit: 'robe', hair: 'long', hat: { style: 'pointed', color: '#4a3a6a' }, weapon: 'staff', colors: { cloth: '#4a3a6a', hair: '#e8e8f0', skin: '#e0c0a0' } } },
  ysolde: { name: 'Ysolde Vane', voice: 'ysolde', ghost: true, look: { build: 'heroic', size: 1.25, outfit: 'robe', hair: 'long', weapon: null, colors: { cloth: '#8ab8e8', hair: '#d8e8ff', skin: '#c8e0f0' } } },
  tamsin: { name: 'Tamsin Pell', voice: 'tamsin', npc: 'tamsin' },
  durgan: { name: 'Durgan Copperhand', voice: 'durgan', npc: 'durgan' },
  veil: { name: 'Sister Veil', voice: 'veil', npc: 'veil' },
  snick: { name: 'Snick', voice: 'snick' },
  eye: { name: 'The Bolt-Holder', voice: 'eye' }
};
/** a member's voice profile by race and sex (the babble synth) */
B.memberVoice = (race, sex) => ({ human: { m: [120, 4, 11, 'square'], f: [210, 5, 12, 'square'] }, dwarf: { m: [95, 3, 10, 'saw'], f: [170, 4, 11, 'saw'] },
  elf: { m: [150, 5, 12, 'triangle'], f: [250, 6, 13, 'triangle'] }, halfling: { m: [200, 6, 14, 'pulse'], f: [290, 7, 15, 'pulse'] } })[race][sex] || [150, 4, 12, 'square'];
/** the XP thresholds for levels 2..8 (8 is the demo's cap) */
B.XP_AT = [0, 100, 250, 500, 900, 1500, 2400, 3600];
