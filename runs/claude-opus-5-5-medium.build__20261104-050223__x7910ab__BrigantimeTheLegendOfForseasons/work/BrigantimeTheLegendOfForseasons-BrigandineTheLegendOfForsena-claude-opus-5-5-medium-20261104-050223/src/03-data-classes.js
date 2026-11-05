/* ---- KNIGHT CLASSES (§6.6). stats: HP MP ATK DEF INT AGI. A tier-2/3 class keeps its line's tier-1 base and growth;
 * at a class change every stat ×1.10 and growth becomes ×1.15 (tier 2) or ×1.30 (tier 3). Skills: [id or family, level] */
G.STATS = ['hp', 'mp', 'atk', 'def', 'int', 'agi'];
const CL = (id, name, o) => G.def('class', id, Object.assign({ name, tier: 1, mov: 5, ward: 2, bond: 5, skills: [] }, o));
const LINE = {
  warrior: { base: [70, 8, 17, 15, 7, 11], growth: [7, .6, 1.6, 1.4, .4, .9], weapons: ['sword', 'spear', 'axe'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, anims: { charge: 'thrust', holystrike: 'overhead', shieldwall: 'block', rally: 'cheer' } },
  ranger: { base: [58, 10, 16, 10, 9, 15], growth: [5.5, .8, 1.5, .9, .6, 1.3], weapons: ['bow'], basic: { name: 'Shoot', p: .9, range: [2, 4], anim: 'throw', bow: true } },
  mage: { base: [50, 30, 8, 8, 18, 11], growth: [4.5, 2.2, .5, .7, 1.8, .9], weapons: ['staff', 'tome'], basic: { name: 'Strike', p: .6, range: [1, 1], anim: 'overhead' } },
  cleric: { base: [55, 26, 10, 10, 15, 10], growth: [5, 2, .7, .9, 1.5, .8], weapons: ['mace', 'staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' } },
  beast: { base: [62, 12, 14, 12, 10, 13], growth: [6, .9, 1.2, 1.1, .7, 1.1], weapons: ['whip', 'spear'], basic: { name: 'Lash', p: .8, range: [1, 2], anim: 'backslash', whip: true } }
};
G.LINE = LINE;
const lineCls = (id, name, line, tier, o) => CL(id, name, Object.assign({ line, tier, base: LINE[line].base, growth: LINE[line].growth, weapons: LINE[line].weapons, basic: LINE[line].basic }, o));
lineCls('squire', 'Squire', 'warrior', 1, { ward: 2, bond: 5, skills: [['rally', 3]], next: 'knight', nextLv: 10 });
lineCls('knight', 'Knight', 'warrior', 2, { ward: 3, bond: 7, skills: [['rally', 3], ['charge', 10], ['shieldwall', 14]], next: 'paladin', nextLv: 20, writ: true });
lineCls('paladin', 'Paladin', 'warrior', 3, { ward: 3, bond: 9, skills: [['rally', 3], ['charge', 10], ['shieldwall', 14], ['holystrike', 20], ['layonhands', 24]] });
lineCls('archer', 'Archer', 'ranger', 1, { bond: 4, skills: [['aimedshot', 4]], next: 'ranger', nextLv: 10 });
lineCls('ranger', 'Ranger', 'ranger', 2, { ward: 3, bond: 6, skills: [['aimedshot', 4], ['volley', 10], ['pinning', 14]], next: 'sentinel', nextLv: 20, writ: true });
lineCls('sentinel', 'Sentinel', 'ranger', 3, { ward: 3, bond: 7, basic: { name: 'Shoot', p: .9, range: [2, 5], anim: 'throw', bow: true }, skills: [['aimedshot', 4], ['volley', 10], ['pinning', 14], ['piercing', 20], ['eagleeye', 24]] });
lineCls('adept', 'Adept', 'mage', 1, { mov: 4, bond: 4, skills: [['Bolt', 1], ['Hex', 6]], next: 'sorcerer', nextLv: 10 });
lineCls('sorcerer', 'Sorcerer', 'mage', 2, { mov: 4, ward: 3, bond: 6, skills: [['Bolt', 1], ['Hex', 6], ['Storm', 10], ['manasiphon', 14]], next: 'archmage', nextLv: 20, writ: true });
lineCls('archmage', 'Archmage', 'mage', 3, { mov: 4, ward: 3, bond: 7, skills: [['Bolt', 1], ['Hex', 6], ['Storm', 10], ['manasiphon', 14], ['Tempest', 20], ['haste', 24]] });
lineCls('acolyte', 'Acolyte', 'cleric', 1, { mov: 4, ward: 3, bond: 5, skills: [['mend', 1], ['purify', 5]], next: 'priest', nextLv: 10 });
lineCls('priest', 'Priest', 'cleric', 2, { mov: 4, ward: 3, bond: 7, skills: [['mend', 1], ['purify', 5], ['renewal', 10], ['wardofseasons', 14]], next: 'hierophant', nextLv: 20, writ: true });
lineCls('hierophant', 'Hierophant', 'cleric', 3, { mov: 4, ward: 4, bond: 8, skills: [['mend', 1], ['purify', 5], ['renewal', 10], ['wardofseasons', 14], ['greaterrenewal', 20], ['dawnlight', 24]] });
lineCls('tamer', 'Tamer', 'beast', 1, { ward: 3, bond: 7, skills: [['goad', 3]], next: 'beastlord', nextLv: 10 });
lineCls('beastlord', 'Beastlord', 'beast', 2, { ward: 4, bond: 10, skills: [['goad', 3], ['packtactics', 10], ['roar', 14]], next: 'beastsovereign', nextLv: 20, writ: true });
lineCls('beastsovereign', 'Beast Sovereign', 'beast', 3, { ward: 4, bond: 13, skills: [['goad', 3], ['packtactics', 10], ['roar', 14], ['callofwild', 20], ['bondoffang', 24]] });
CL('springwarden', 'Springwarden', { ruler: true, line: 'warrior', weapons: ['sword'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'rising' }, ward: 4, bond: 10, base: [75, 22, 17, 15, 15, 14], growth: [7, 1.5, 1.5, 1.3, 1.3, 1.1], skills: [['mend', 1], ['charge', 1], ['verdantoath', 6], ['bramblestorm', 10], ['verdanttempest', 16]] });
CL('sunsovereign', 'Sun Sovereign', { ruler: true, line: 'warrior', weapons: ['sword', 'greatsword'], basic: { name: 'Cleave', p: 1.1, range: [1, 1], anim: 'twohand' }, ward: 4, bond: 11, base: [85, 14, 21, 16, 10, 12], growth: [8, 1, 1.9, 1.4, .8, 1], skills: [['charge', 1], ['warcry', 6], ['cinderstorm', 10], ['solarflare', 16]] });
CL('harvestking', 'Harvest King', { ruler: true, line: 'cleric', weapons: ['staff'], mov: 4, basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'overhead' }, ward: 5, bond: 10, base: [68, 30, 11, 13, 20, 10], growth: [6, 2, .8, 1.2, 1.8, .8], skills: [['mend', 1], ['galeleaves', 1], ['quietcounsel', 6], ['harvestmoon', 12], ['reaping', 16]] });
CL('rimeduke', 'Rime Duke', { ruler: true, line: 'mage', weapons: ['staff'], mov: 4, basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'spin' }, ward: 4, bond: 10, base: [70, 28, 15, 13, 19, 13], growth: [6.5, 1.8, 1.3, 1.1, 1.7, 1], skills: [['hoarfrost', 1], ['madgambit', 6], ['froststorm', 10], ['frozenhour', 12], ['blizzard', 16]] });
CL('chancellor', 'Chancellor of Hours', { ruler: true, line: 'mage', weapons: ['staff', 'rod'], mov: 4, basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'cast' }, ward: 4, bond: 12, base: [80, 34, 12, 15, 22, 12], growth: [7, 2, 1, 1.4, 1.9, .9], skills: [['timeshear', 1], ['stophex', 1], ['restore', 6], ['hourstorm', 10]] });
CL('hourmaiden', 'Hourmaiden', { unique: true, line: 'cleric', weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, ward: 3, bond: 6, base: [58, 34, 9, 11, 19, 15], growth: [5, 2.2, .6, 1, 1.8, 1.2], skills: [['mend', 1], ['haste', 1], ['turning', 8]] });
CL('graynight', 'Knight of the Thirteenth Hour', { boss: true, line: 'warrior', weapons: ['sword'], basic: { name: 'Slash', p: 1.2, range: [1, 1], anim: 'plunge' }, ward: 5, bond: 20, base: [900, 200, 52, 48, 50, 30], growth: [0, 0, 0, 0, 0, 0], skills: [['thirteenthstroke', 1], ['still', 1], ['unmaking', 1], ['timeless', 1]] });
CL('brigand', 'Brigand Captain', { unique: true, line: 'warrior', weapons: ['axe', 'sword'], basic: { name: 'Hack', p: 1.05, range: [1, 1], anim: 'overhead' }, ward: 3, bond: 8, base: [72, 6, 18, 13, 6, 12], growth: [7, .4, 1.6, 1.2, .3, 1], skills: [['charge', 1], ['ambush', 1]] });
// a knight's skills at a level: the class's list, with element families resolved
G.knightSkills = (clsId, elem, lvl) => {
  const c = G.get('class', clsId), out = [];
  for (const [s, l] of c.skills) { if (lvl < l) continue; const id = G.SPELL_FAMILY[s] ? G.SPELL_FAMILY[s][elem] : s; if (id && !out.includes(id)) out.push(id); }
  return out;
};
