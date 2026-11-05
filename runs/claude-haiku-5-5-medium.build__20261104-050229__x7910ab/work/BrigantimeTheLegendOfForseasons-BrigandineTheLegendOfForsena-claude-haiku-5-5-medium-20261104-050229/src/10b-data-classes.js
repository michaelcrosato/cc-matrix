// The 23 knight classes of the plan (§6.6): five lines of three tiers, and eight unique classes (the five rulers, the
// Hourmaiden, the Brigand Captain and the Knight of the Thirteenth Hour). Each class gives a move, a ward radius (how far
// its monsters are guarded), a bond (how many monsters it can hold), a basic attack range, a rig, and the skills it learns
// at which level. An entry "$bolt" or "$hex" (and so on) means the knight's element's own spell of that kind (§6.7).
// Tiers two and three add the class's own bonuses to health, attack and defence when a knight changes class.
(() => {
  const H = G;
  const C = (id, o) => H.def('class', id, Object.assign({ tier: 1, unique: false, next: null, hp: 0, atk: 0, def: 0, mov: 5, ward: 2, bond: 4, rng: 1,
    weapon: 'sword', build: 'heroic', moves: ['overhead', 'slash', 'backslash'], skills: [] }, o));
  // Warrior: squire, knight, paladin
  C('squire', { name: 'Squire', line: 'warrior', tier: 1, ward: 2, bond: 5, skills: [['rally', 3]], next: 'knight' });
  C('knight', { name: 'Knight', line: 'warrior', tier: 2, ward: 3, bond: 7, hp: 6, atk: 2, def: 1, skills: [['charge', 10], ['shieldwall', 14]], next: 'paladin' });
  C('paladin', { name: 'Paladin', line: 'warrior', tier: 3, ward: 3, bond: 9, hp: 12, atk: 4, def: 2, skills: [['holystrike', 20], ['layonhands', 24]] });
  // Ranger: archer, ranger, sentinel
  C('archer', { name: 'Archer', line: 'ranger', tier: 1, rng: 2, weapon: 'gun', build: 'chibi', moves: ['cast', 'throw', 'jab'], ward: 2, bond: 4, skills: [['aimedshot', 4]], next: 'ranger' });
  C('ranger', { name: 'Ranger', line: 'ranger', tier: 2, rng: 2, weapon: 'gun', build: 'chibi', moves: ['cast', 'throw', 'jab'], ward: 3, bond: 6, hp: 6, atk: 2, def: 1, skills: [['volley', 10], ['pinning', 14]], next: 'sentinel' });
  C('sentinel', { name: 'Sentinel', line: 'ranger', tier: 3, rng: 3, weapon: 'gun', build: 'chibi', moves: ['cast', 'throw', 'jab'], ward: 3, bond: 7, hp: 12, atk: 4, def: 2, skills: [['piercing', 20], ['eagleeye', 24]] });
  // Mage: adept, sorcerer, archmage
  C('adept', { name: 'Adept', line: 'mage', tier: 1, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 2, bond: 4, skills: [['$bolt', 1], ['$hex', 6]], next: 'sorcerer' });
  C('sorcerer', { name: 'Sorcerer', line: 'mage', tier: 2, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 3, bond: 6, hp: 6, atk: 2, def: 1, skills: [['$storm', 10], ['manasiphon', 14]], next: 'archmage' });
  C('archmage', { name: 'Archmage', line: 'mage', tier: 3, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 3, bond: 7, hp: 12, atk: 4, def: 2, skills: [['$tempest', 20], ['haste', 24]] });
  // Cleric: acolyte, priest, hierophant
  C('acolyte', { name: 'Acolyte', line: 'cleric', tier: 1, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 3, bond: 5, skills: [['mend', 1], ['purify', 5]], next: 'priest' });
  C('priest', { name: 'Priest', line: 'cleric', tier: 2, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 3, bond: 7, hp: 6, atk: 2, def: 1, skills: [['renewal', 10], ['wardofseasons', 14]], next: 'hierophant' });
  C('hierophant', { name: 'Hierophant', line: 'cleric', tier: 3, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], mov: 4, ward: 4, bond: 8, hp: 12, atk: 4, def: 2, skills: [['greaterrenewal', 20], ['dawnlight', 24]] });
  // Beast: tamer, beastlord, beast sovereign
  C('tamer', { name: 'Tamer', line: 'beast', tier: 1, weapon: 'sword', rng: 2, bond: 7, ward: 3, skills: [['goad', 3]], next: 'beastlord' });
  C('beastlord', { name: 'Beastlord', line: 'beast', tier: 2, weapon: 'sword', rng: 2, bond: 10, ward: 4, hp: 6, atk: 2, def: 1, skills: [['packtactics', 10], ['roar', 14]], next: 'beastsovereign' });
  C('beastsovereign', { name: 'Beast Sovereign', line: 'beast', tier: 3, weapon: 'sword', rng: 2, bond: 13, ward: 4, hp: 12, atk: 4, def: 2, skills: [['callofwild', 20], ['bondoffang', 24]] });
  // The unique classes: the five rulers, the Hourmaiden, the Brigand Captain and the Gray Knight
  C('springwarden', { name: 'Springwarden', unique: true, ward: 4, bond: 10, hp: 10, skills: [['mend', 1], ['charge', 1], ['verdantoath', 6], ['bramblestorm', 10], ['verdanttempest', 16]] });
  C('sunsovereign', { name: 'Sun Sovereign', unique: true, ward: 4, bond: 11, hp: 8, atk: 2, skills: [['charge', 1], ['warcry', 6], ['cinderstorm', 10], ['solarflare', 16]] });
  C('harvestking', { name: 'Harvest King', unique: true, mov: 4, ward: 5, bond: 10, hp: 6, def: 2, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], skills: [['mend', 1], ['galeleaves', 1], ['quietcounsel', 6], ['harvestmoon', 12], ['reaping', 16]] });
  C('rimeduke', { name: 'Rime Duke', unique: true, mov: 4, ward: 4, bond: 10, hp: 8, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], skills: [['hoarfrost', 1], ['madgambit', 6], ['froststorm', 10], ['frozenhour', 12], ['blizzard', 16]] });
  C('chancellor', { name: 'Chancellor of Hours', unique: true, mov: 4, ward: 4, bond: 12, hp: 10, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], skills: [['timeshear', 1], ['stophex', 1], ['restore', 6], ['hourstorm', 10]] });
  C('hourmaiden', { name: 'Hourmaiden', unique: true, ward: 3, bond: 6, hp: 4, weapon: 'staff', build: 'chibi', moves: ['cast', 'jab', 'overhead'], skills: [['mend', 1], ['haste', 1], ['turning', 8]] });
  C('brigand', { name: 'Brigand Captain', unique: true, ward: 3, bond: 8, hp: 8, atk: 2, weapon: 'sword', build: 'bulky', moves: ['overhead', 'hook', 'cross'], skills: [['charge', 1], ['ambush', 1]] });
  C('graynight', { name: 'Knight of the Thirteenth Hour', unique: true, ward: 5, bond: 0, hp: 10, atk: 3, def: 2, weapon: 'sword', moves: ['overhead', 'slash', 'backslash'], skills: [['thirteenthstroke', 1], ['still', 1], ['unmaking', 1], ['timeless', 1]] });
  H.CLASS_LINES = { warrior: ['squire', 'knight', 'paladin'], ranger: ['archer', 'ranger', 'sentinel'], mage: ['adept', 'sorcerer', 'archmage'], cleric: ['acolyte', 'priest', 'hierophant'], beast: ['tamer', 'beastlord', 'beastsovereign'] };
  H.PROMOTE_LEVEL = { 2: 10, 3: 20 };
  H.PROMOTE_COST = { 2: 6, 3: 12 };
  // the knight's element picks its spells at $bolt, $hex, $storm and $tempest
  H.ELEMENT_SPELL = { verdant: { bolt: 'bramble', hex: 'drowse', storm: 'bramblestorm', tempest: 'verdanttempest' }, solar: { bolt: 'cinder', hex: 'kindle', storm: 'cinderstorm', tempest: 'solarflare' },
    ambered: { bolt: 'galeleaves', hex: 'rot', storm: 'leafstorm', tempest: 'harvestmoon' }, rime: { bolt: 'hoarfrost', hex: 'frostbite', storm: 'froststorm', tempest: 'blizzard' },
    hour: { bolt: 'timeshear', hex: 'stophex', storm: 'hourstorm', tempest: 'hourstorm' }, neutral: { bolt: 'hoarfrost', hex: 'drowse', storm: 'froststorm', tempest: 'blizzard' } };
  // the skills a class has at a knight's level, its element's spells filled in
  H.classSkills = (classId, element, level) => {
    const c = H.get('class', classId), out = [];
    for (const [id, lvl] of c.skills) {
      if (level < lvl) continue;
      const sp = H.ELEMENT_SPELL[element] || H.ELEMENT_SPELL.neutral;
      const real = id === '$bolt' ? sp.bolt : id === '$hex' ? sp.hex : id === '$storm' ? sp.storm : id === '$tempest' ? sp.tempest : id;
      out.push(real);
    }
    return out;
  };
})();
