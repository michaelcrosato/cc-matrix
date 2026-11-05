// ITEMS (33). No shops: items come from quests, events and castle treasuries. slot: weapon | armor | accessory |
// consumable | promotion | special. who: the class lines (warrior ranger mage cleric beast ruler) or kinds of weapon.
// mods: flat stat changes; flags: rule hooks the sims read.

const I = (id, o) => G.def('item', id, Object.assign({ mods: {}, flags: {} }, o));
I('ashspear', { name: 'Ashwood Spear', slot: 'weapon', kind: 'spear', who: ['warrior', 'beast'], mods: { atk: 3 }, icon: 'spear', desc: 'ATK +3' });
I('rimesteel', { name: 'Rimesteel Sword', slot: 'weapon', kind: 'sword', who: ['warrior'], mods: { atk: 5 }, flags: { winterEdge: .05 }, icon: 'sword', desc: 'ATK +5; a Winter wielder +5% damage' });
I('sunforged', { name: 'Sunforged Blade', slot: 'weapon', kind: 'sword', who: ['warrior', 'sunsovereign'], mods: { atk: 7 }, icon: 'sword', desc: 'ATK +7' });
I('cleaver', { name: "Brigand's Cleaver", slot: 'weapon', kind: 'axe', who: ['warrior', 'brigand'], mods: { atk: 6, def: -2 }, icon: 'axe', desc: 'ATK +6, DEF -2' });
I('hawthornbow', { name: 'Hawthorn Bow', slot: 'weapon', kind: 'bow', who: ['ranger'], mods: { atk: 4 }, icon: 'bow', desc: 'ATK +4' });
I('yewlongbow', { name: 'Yew Longbow', slot: 'weapon', kind: 'bow', who: ['ranger'], mods: { atk: 6 }, flags: { range: 1 }, icon: 'bow', desc: 'ATK +6, max range +1' });
I('willowstaff', { name: 'Willow Staff', slot: 'weapon', kind: 'staff', who: ['mage', 'cleric', 'harvestking', 'rimeduke', 'chancellor', 'hourmaiden'], mods: { int: 4 }, icon: 'staff', desc: 'INT +4' });
I('lanternstaff', { name: 'Lantern Staff', slot: 'weapon', kind: 'staff', who: ['mage', 'cleric', 'harvestking', 'rimeduke', 'chancellor', 'hourmaiden'], mods: { int: 6 }, flags: { spellBoost: ['autumn', .1] }, icon: 'staff', desc: 'INT +6; Autumn spells +10%' });
I('tomeofthaw', { name: 'Tome of Thaw', slot: 'weapon', kind: 'tome', who: ['mage'], mods: { int: 5 }, flags: { spellBoost: ['spring', .1] }, icon: 'tome', desc: 'INT +5; Spring spells +10%' });
I('hourglassrod', { name: 'Hourglass Rod', slot: 'weapon', kind: 'rod', who: ['mage', 'cleric', 'ruler'], mods: { int: 8, mp: 10 }, icon: 'rod', desc: 'INT +8, MP +10' });
I('thornwhip', { name: 'Thorn Whip', slot: 'weapon', kind: 'whip', who: ['beast'], mods: { atk: 4 }, flags: { range: 1 }, icon: 'whip', desc: 'ATK +4; Lash range 1-3' });
I('jerkin', { name: 'Leather Jerkin', slot: 'armor', who: ['all'], mods: { def: 3 }, icon: 'armor', desc: 'DEF +3' });
I('hauberk', { name: 'Mail Hauberk', slot: 'armor', who: ['warrior', 'beast', 'ruler'], mods: { def: 6, agi: -1 }, icon: 'armor', desc: 'DEF +6, AGI -1' });
I('thornmail', { name: 'Thornmail', slot: 'armor', who: ['warrior'], mods: { def: 5 }, flags: { thorns: true }, icon: 'armor', desc: 'DEF +5; Thorns' });
I('frostplate', { name: 'Frostplate', slot: 'armor', who: ['warrior', 'ruler'], mods: { def: 8 }, flags: { immune: ['chill'] }, icon: 'armor', desc: 'DEF +8; immune to Chill' });
I('robeofseasons', { name: 'Robe of Seasons', slot: 'armor', who: ['mage', 'cleric', 'ruler', 'hourmaiden'], mods: { def: 3, int: 4 }, icon: 'robe', desc: 'DEF +3, INT +4' });
I('spurs', { name: 'Swift Spurs', slot: 'accessory', who: ['all'], mods: { mov: 1 }, icon: 'ring', desc: 'MOV +1' });
I('signet', { name: 'Signet of Command', slot: 'accessory', who: ['all'], mods: { bond: 2 }, icon: 'ring', desc: 'Bond +2' });
I('bannerpin', { name: 'Banner Pin', slot: 'accessory', who: ['all'], mods: { ward: 1 }, icon: 'ring', desc: 'Ward +1' });
I('amuletoftides', { name: 'Amulet of Tides', slot: 'accessory', who: ['all'], flags: { amulet: true }, icon: 'amulet', desc: "The wearer's Tide bonus x2" });
I('wardingcharm', { name: 'Warding Charm', slot: 'accessory', who: ['all'], flags: { immune: ['sleep', 'stop'] }, icon: 'amulet', desc: 'Immune to Sleep and Stop' });
I('mendingring', { name: 'Ring of Mending', slot: 'accessory', who: ['all'], flags: { mending: .1 }, icon: 'ring', desc: 'Heals 10% max HP each turn' });
I('horseshoe', { name: 'Lucky Horseshoe', slot: 'accessory', who: ['all'], flags: { luck: 1.15 }, icon: 'ring', desc: 'Good quest outcomes x1.15' });
I('herb', { name: 'Healing Herb', slot: 'consumable', use: { heal: 40 }, icon: 'herb', desc: 'Heals 40 HP' });
I('draught', { name: 'Golden Draught', slot: 'consumable', use: { heal: 9999 }, icon: 'potion', desc: 'Heals to full HP' });
I('ether', { name: 'Ether Vial', slot: 'consumable', use: { mp: 20 }, icon: 'potion', desc: '+20 MP' });
I('remedy', { name: 'Remedy', slot: 'consumable', use: { cleanse: true }, icon: 'herb', desc: 'Clears statuses and debuffs' });
I('manaseed', { name: 'Mana Seed', slot: 'consumable', use: { mana: 60 }, muster: true, icon: 'seed', desc: '+60 realm mana (Muster)' });
I('springseed', { name: 'Spring Seed', slot: 'promotion', elem: 'spring', icon: 'seed', desc: 'Promotes a Spring monster (T2 from Lv 6, T3 from Lv 16)' });
I('summerember', { name: 'Summer Ember', slot: 'promotion', elem: 'summer', icon: 'ember', desc: 'Promotes a Summer monster (T2 from Lv 6, T3 from Lv 16)' });
I('autumnacorn', { name: 'Autumn Acorn', slot: 'promotion', elem: 'autumn', icon: 'acorn', desc: 'Promotes an Autumn monster (T2 from Lv 6, T3 from Lv 16)' });
I('wintershard', { name: 'Winter Shard', slot: 'promotion', elem: 'winter', icon: 'shard', desc: 'Promotes a Winter monster (T2 from Lv 6, T3 from Lv 16)' });
I('writ', { name: 'Writ of Knighthood', slot: 'special', icon: 'scroll', desc: 'Allows a tier-3 class change from Lv 20' });

G.SEASON_SEED = { spring: 'springseed', summer: 'summerember', autumn: 'autumnacorn', winter: 'wintershard' };
/** may a knight of this class equip the item? */
G.canEquip = (item, cls) => {
  const it = G.get('item', item), c = G.get('class', cls);
  if (!['weapon', 'armor', 'accessory'].includes(it.slot)) return false;
  if (it.who.includes('all') || it.who.includes(cls)) return true;
  if (c.line === 'ruler' || c.line === 'unique' || c.line === 'boss') {
    if (it.slot === 'weapon') return c.weapons.includes(it.kind);
    return it.who.includes('ruler');
  }
  return it.who.includes(c.line);
};
