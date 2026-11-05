// KNIGHT CLASSES (23): 5 lines x 3 tiers, 5 ruler classes, the Hourmaiden, the Gray Knight and the Brigand Captain.
// Stat rule: tier 1 stat(L) = base + growth x (L - 1). At a class change every stat (MP too) x1.10; after it, growth is
// x1.15 (tier 2) or x1.30 (tier 3) of the line's tier-1 growth. Bond = class bond + floor(level / 4).
// skills: [[skill id, level]]; elemSkills: [[tier, level]] are the knight's own element's spells (G.elemSpell).

const STATS = ['hp', 'mp', 'atk', 'def', 'int', 'agi'];
G.STATS = STATS;
const C = (id, o) => G.def('class', id, Object.assign({ tier: 1, skills: [], elemSkills: [], unique: false }, o));
const v = a => Object.fromEntries(STATS.map((k, i) => [k, a[i]]));

// warrior line
C('squire', { name: 'Squire', line: 'warrior', tier: 1, weapons: ['sword', 'spear', 'axe'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, mov: 5, ward: 2, bond: 5, base: v([70, 8, 17, 15, 7, 11]), growth: v([7, .6, 1.6, 1.4, .4, .9]), skills: [['rally', 3]], next: 'knight', look: { armor: true } });
C('knight', { name: 'Knight', line: 'warrior', tier: 2, weapons: ['sword', 'spear', 'axe'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, mov: 5, ward: 3, bond: 7, root: 'squire', skills: [['rally', 3], ['charge', 10], ['shieldwall', 14]], next: 'paladin' });
C('paladin', { name: 'Paladin', line: 'warrior', tier: 3, weapons: ['sword', 'spear'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, mov: 5, ward: 3, bond: 9, root: 'squire', skills: [['rally', 3], ['charge', 10], ['shieldwall', 14], ['holystrike', 20], ['layonhands', 24]] });
// ranger line
C('archer', { name: 'Archer', line: 'ranger', tier: 1, weapons: ['bow'], basic: { name: 'Shoot', p: .9, range: [2, 4], ranged: true, anim: 'throw' }, mov: 5, ward: 2, bond: 4, base: v([58, 10, 16, 10, 9, 15]), growth: v([5.5, .8, 1.5, .9, .6, 1.3]), skills: [['aimedshot', 4]], next: 'ranger' });
C('ranger', { name: 'Ranger', line: 'ranger', tier: 2, weapons: ['bow'], basic: { name: 'Shoot', p: .9, range: [2, 4], ranged: true, anim: 'throw' }, mov: 5, ward: 3, bond: 6, root: 'archer', skills: [['aimedshot', 4], ['volley', 10], ['pinning', 14]], next: 'sentinel' });
C('sentinel', { name: 'Sentinel', line: 'ranger', tier: 3, weapons: ['bow'], basic: { name: 'Shoot', p: .9, range: [2, 5], ranged: true, anim: 'throw' }, mov: 5, ward: 3, bond: 7, root: 'archer', skills: [['aimedshot', 4], ['volley', 10], ['pinning', 14], ['piercing', 20], ['eagleeye', 24]] });
// mage line
C('adept', { name: 'Adept', line: 'mage', tier: 1, weapons: ['staff', 'tome'], basic: { name: 'Strike', p: .6, range: [1, 1], anim: 'overhead' }, mov: 4, ward: 2, bond: 4, base: v([50, 30, 8, 8, 18, 11]), growth: v([4.5, 2.2, .5, .7, 1.8, .9]), elemSkills: [['bolt', 1], ['hex', 6]], next: 'sorcerer' });
C('sorcerer', { name: 'Sorcerer', line: 'mage', tier: 2, weapons: ['staff', 'tome'], basic: { name: 'Strike', p: .6, range: [1, 1], anim: 'overhead' }, mov: 4, ward: 3, bond: 6, root: 'adept', elemSkills: [['bolt', 1], ['hex', 6], ['storm', 10]], skills: [['manasiphon', 14]], next: 'archmage' });
C('archmage', { name: 'Archmage', line: 'mage', tier: 3, weapons: ['staff', 'tome'], basic: { name: 'Strike', p: .6, range: [1, 1], anim: 'overhead' }, mov: 4, ward: 3, bond: 7, root: 'adept', elemSkills: [['bolt', 1], ['hex', 6], ['storm', 10], ['tempest', 20]], skills: [['manasiphon', 14], ['haste', 24]] });
// cleric line
C('acolyte', { name: 'Acolyte', line: 'cleric', tier: 1, weapons: ['mace', 'staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, mov: 4, ward: 3, bond: 5, base: v([55, 26, 10, 10, 15, 10]), growth: v([5, 2, .7, .9, 1.5, .8]), skills: [['mend', 1], ['purify', 5]], next: 'priest' });
C('priest', { name: 'Priest', line: 'cleric', tier: 2, weapons: ['mace', 'staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, mov: 4, ward: 3, bond: 7, root: 'acolyte', skills: [['mend', 1], ['purify', 5], ['renewal', 10], ['wardofseasons', 14]], next: 'hierophant' });
C('hierophant', { name: 'Hierophant', line: 'cleric', tier: 3, weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, mov: 4, ward: 4, bond: 8, root: 'acolyte', skills: [['mend', 1], ['purify', 5], ['renewal', 10], ['wardofseasons', 14], ['greaterrenewal', 20], ['dawnlight', 24]] });
// beast line
C('tamer', { name: 'Tamer', line: 'beast', tier: 1, weapons: ['whip', 'spear'], basic: { name: 'Lash', p: .8, range: [1, 2], anim: 'backslash', whip: true }, mov: 5, ward: 3, bond: 7, base: v([62, 12, 14, 12, 10, 13]), growth: v([6, .9, 1.2, 1.1, .7, 1.1]), skills: [['goad', 3]], next: 'beastlord' });
C('beastlord', { name: 'Beastlord', line: 'beast', tier: 2, weapons: ['whip', 'spear'], basic: { name: 'Lash', p: .8, range: [1, 2], anim: 'backslash', whip: true }, mov: 5, ward: 4, bond: 10, root: 'tamer', skills: [['goad', 3], ['packtactics', 10], ['roar', 14]], next: 'beastsovereign' });
C('beastsovereign', { name: 'Beast Sovereign', line: 'beast', tier: 3, weapons: ['spear', 'whip'], basic: { name: 'Lash', p: .8, range: [1, 2], anim: 'backslash', whip: true }, mov: 5, ward: 4, bond: 13, root: 'tamer', skills: [['goad', 3], ['packtactics', 10], ['roar', 14], ['callofwild', 20], ['bondoffang', 24]] });
// rulers
C('springwarden', { name: 'Springwarden', line: 'ruler', tier: 2, unique: true, weapons: ['sword'], basic: { name: 'Slash', p: 1, range: [1, 1], anim: 'slash' }, mov: 5, ward: 4, bond: 10, base: v([75, 22, 17, 15, 15, 14]), growth: v([7, 1.5, 1.5, 1.3, 1.3, 1.1]), skills: [['mend', 1], ['charge', 1], ['verdantoath', 6], ['bramblestorm', 10], ['verdanttempest', 16]], sig: ['rising', 'slash'] });
C('sunsovereign', { name: 'Sun Sovereign', line: 'ruler', tier: 2, unique: true, weapons: ['greatsword', 'sword'], basic: { name: 'Cleave', p: 1.1, range: [1, 1], anim: 'twohand' }, mov: 5, ward: 4, bond: 11, base: v([85, 14, 21, 16, 10, 12]), growth: v([8, 1, 1.9, 1.4, .8, 1]), skills: [['charge', 1], ['warcry', 6], ['cinderstorm', 10], ['solarflare', 16]], sig: ['twohand', 'spin'] });
C('harvestking', { name: 'Harvest King', line: 'ruler', tier: 2, unique: true, weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'overhead' }, mov: 4, ward: 5, bond: 10, base: v([68, 30, 11, 13, 20, 10]), growth: v([6, 2, .8, 1.2, 1.8, .8]), skills: [['mend', 1], ['galeleaves', 1], ['quietcounsel', 6], ['harvestmoon', 12], ['reaping', 16]], sig: ['cast'] });
C('rimeduke', { name: 'Rime Duke', line: 'ruler', tier: 2, unique: true, weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'spin' }, mov: 4, ward: 4, bond: 10, base: v([70, 28, 15, 13, 19, 13]), growth: v([6.5, 1.8, 1.3, 1.1, 1.7, 1]), skills: [['hoarfrost', 1], ['madgambit', 6], ['froststorm', 10], ['frozenhour', 12], ['blizzard', 16]], sig: ['spin'] });
C('chancellor', { name: 'Chancellor of Hours', line: 'ruler', tier: 2, unique: true, weapons: ['rod', 'staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'cast' }, mov: 4, ward: 4, bond: 12, base: v([80, 34, 12, 15, 22, 12]), growth: v([7, 2, 1, 1.4, 1.9, .9]), skills: [['timeshear', 1], ['stophex', 1], ['restore', 6], ['hourstorm', 10]], sig: ['cast'] });
C('hourmaiden', { name: 'Hourmaiden', line: 'unique', tier: 2, unique: true, weapons: ['staff'], basic: { name: 'Strike', p: .8, range: [1, 1], anim: 'rising' }, mov: 5, ward: 3, bond: 6, base: v([58, 34, 9, 11, 19, 15]), growth: v([5, 2.2, .6, 1, 1.8, 1.2]), skills: [['mend', 1], ['haste', 1], ['turning', 8]] });
C('graynight', { name: 'Knight of the Thirteenth Hour', line: 'boss', tier: 3, unique: true, weapons: ['sword'], basic: { name: 'Slash', p: 1.2, range: [1, 1], anim: 'plunge' }, mov: 5, ward: 5, bond: 30, base: v([420, 200, 38, 32, 36, 24]), growth: v([0, 0, 0, 0, 0, 0]), skills: [['thirteenthstroke', 1], ['still', 1], ['unmaking', 1], ['timeless', 1]], fixed: true, sig: ['plunge', 'twohand', 'spin'] });
C('brigand', { name: 'Brigand Captain', line: 'unique', tier: 1, unique: true, weapons: ['axe', 'sword'], basic: { name: 'Hack', p: 1.05, range: [1, 1], anim: 'overhead' }, mov: 5, ward: 3, bond: 8, base: v([72, 6, 18, 13, 6, 12]), growth: v([7, .4, 1.6, 1.2, .3, 1]), skills: [['charge', 1], ['ambush', 1]] });

G.LINES = { warrior: ['squire', 'knight', 'paladin'], ranger: ['archer', 'ranger', 'sentinel'], mage: ['adept', 'sorcerer', 'archmage'], cleric: ['acolyte', 'priest', 'hierophant'], beast: ['tamer', 'beastlord', 'beastsovereign'] };
/** tier-1 class of a class's line (the stat root) */
G.classRoot = cls => { const c = G.get('class', cls); return c.root || cls; };
/** expected stats of a class at a level (knights who start at tier 2 or 3 are built as if they changed at 10 and 20) */
G.classStats = (cls, level) => {
  const c = G.get('class', cls), root = G.get('class', G.classRoot(cls)), out = {};
  for (const k of STATS) {
    const b = root.base[k], g = root.growth[k];
    if (c.fixed || c.tier === 1 || !c.root) { out[k] = b + g * (level - 1); continue; }
    let s = (b + g * (Math.min(level, 10) - 1)) * 1.1;
    if (c.tier === 2) s += g * 1.15 * Math.max(0, level - 10);
    else { s += g * 1.15 * Math.max(0, Math.min(level, 20) - 10); s = s * 1.1 + g * 1.3 * Math.max(0, level - 20); }
    out[k] = s;
  }
  for (const k of STATS) out[k] = Math.round(out[k]);
  return out;
};
/** the growth a class applies per level */
G.classGrowth = cls => {
  const c = G.get('class', cls), root = G.get('class', G.classRoot(cls)), m = !c.root || c.tier === 1 ? 1 : c.tier === 2 ? 1.15 : 1.30, out = {};
  for (const k of STATS) out[k] = root.growth[k] * m;
  return out;
};
/** the skills a knight of this class, element and level knows */
G.classSkills = (cls, elem, level) => {
  const c = G.get('class', cls), out = [];
  for (const [tier, lv] of c.elemSkills) if (level >= lv) { const s = G.elemSpell(tier, elem); if (s && !out.includes(s)) out.push(s); }
  for (const [id, lv] of c.skills) if (level >= lv && !out.includes(id)) out.push(id);
  return out;
};
