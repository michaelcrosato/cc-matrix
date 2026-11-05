// SKILLS AND SPELLS (90). A skill: { name, kind: special | spell | passive, elem ('user' = the user's own, null =
// none, 'none' = ignores elements), p (power: a multiplier for physical, a base for magic and heals), magic (true: the
// magic formula), heal (a base amount, or { pct } of max HP), range [min, max] or 'self', area (single r1 r2 self-r1
// self-r2 adj cone2 cone3 line3 line4 troop ward), who (foes allies all ally ownMonster self), mp, mobile (usable after
// moving), needMove (hexes moved first), status [id, base chance], buff [[id, bells]], fx (art), and rule flags.
// Areas: r1/r2 = the target and every hex within 1/2; self-r1/self-r2 = around the user; adj = the 6 around the user;
// cone2/cone3 = a 120-degree wedge; line3/line4 = a straight hex line from the user.

const S = (id, o) => G.def('skill', id, Object.assign({ kind: 'special', elem: null, p: 0, range: [1, 1], area: 'single', who: 'foes', mp: 0, mobile: false }, o));

// warrior line
S('rally', { name: 'Rally', range: 'self', area: 'self-r1', who: 'allies', mp: 4, mobile: true, buff: [['valor', 2]], fx: 'buff', anim: 'cheer', desc: 'Valor (ATK +20%) to allies around' });
S('charge', { name: 'Charge', elem: 'user', p: 1.3, mp: 5, mobile: true, needMove: 2, fx: 'slash', anim: 'thrust', desc: 'A 1.3x blow; move 2+ hexes first' });
S('shieldwall', { name: 'Shield Wall', range: 'self', area: 'adj', who: 'allies', mp: 6, mobile: true, buff: [['warded', 1]], fx: 'buff', anim: 'block', desc: 'Warded to the allies beside you' });
S('holystrike', { name: 'Holy Strike', elem: 'none', p: 1.5, mp: 8, mobile: true, vsHour: 1.5, fx: 'holy', anim: 'overhead', desc: 'A 1.5x holy blow, x1.5 against Hour' });
S('layonhands', { name: 'Lay on Hands', heal: 60, who: 'ally', mp: 10, mobile: true, fx: 'heal', anim: 'cast', desc: 'Heals an adjacent ally 60' });
// ranger line
S('aimedshot', { name: 'Aimed Shot', elem: 'user', p: 1.2, range: [2, 4], mp: 4, hitBonus: 20, ranged: true, fx: 'arrow', anim: 'throw', desc: '+20 hit, 1.2x' });
S('volley', { name: 'Volley', elem: 'user', p: .8, range: [3, 5], area: 'r1', mp: 8, ranged: true, fx: 'volley', anim: 'throw', desc: 'Arrows rain on an area' });
S('pinning', { name: 'Pinning Shot', elem: 'user', p: .9, range: [2, 4], mp: 6, mobile: true, status: ['chill', 70], ranged: true, fx: 'arrow', anim: 'throw', desc: 'Chills the target' });
S('piercing', { name: 'Piercing Arrow', elem: 'user', p: 1.1, range: 'self', area: 'line4', mp: 10, ranged: true, fx: 'pierce', anim: 'throw', desc: 'Hits every unit on a line' });
S('eagleeye', { name: 'Eagle Eye', kind: 'passive', desc: 'Bows +1 max range' });
// bolts (tier 1 element spells)
const BOLTS = [['bramble', 'Bramble', 'spring'], ['cinder', 'Cinder', 'summer'], ['galeleaves', 'Gale of Leaves', 'autumn'], ['hoarfrost', 'Hoarfrost', 'winter'], ['timeshear', 'Time Shear', 'hour']];
for (const [id, name, el] of BOLTS) S(id, { name, kind: 'spell', elem: el, p: 14, magic: true, range: [1, 4], mp: 5, noTide: el === 'hour', fx: 'bolt', anim: 'cast', desc: 'A ' + G.cap(el) + ' bolt' });
// hexes (status spells)
const HEXES = [['drowse', 'Drowse', 'spring', 'sleep', 60], ['kindle', 'Kindle', 'summer', 'burn', 70], ['rot', 'Rot', 'autumn', 'poison', 70], ['frostbite', 'Frostbite', 'winter', 'chill', 70], ['stophex', 'Stop', 'hour', 'stop', 40]];
for (const [id, name, el, st, ch] of HEXES) S(id, { name, kind: 'spell', elem: el, range: [1, 4], mp: 6, status: [st, ch], fx: 'hex', anim: 'cast', desc: G.get('effect', st).name + ' ' + ch + '%' });
// storms (tier 2)
const STORMS = [['bramblestorm', 'Bramble Storm', 'spring'], ['cinderstorm', 'Cinder Storm', 'summer'], ['leafstorm', 'Leaf Storm', 'autumn'], ['froststorm', 'Frost Storm', 'winter'], ['hourstorm', 'Hour Storm', 'hour']];
for (const [id, name, el] of STORMS) S(id, { name, kind: 'spell', elem: el, p: 22, magic: true, range: [1, 4], area: 'r1', who: 'all', mp: 10, burnsForest: el === 'summer', fx: 'storm', anim: 'cast', desc: 'A ' + G.cap(el) + ' storm; hits friends too' });
// tempests (tier 3)
S('verdanttempest', { name: 'Verdant Tempest', kind: 'spell', elem: 'spring', p: 34, magic: true, range: [1, 5], area: 'r2', who: 'all', mp: 16, status: ['sleep', 20], fx: 'tempest', anim: 'cast', desc: 'A great storm of blossoms; Sleep 20%' });
S('solarflare', { name: 'Solar Flare', kind: 'spell', elem: 'summer', p: 34, magic: true, range: [1, 5], area: 'r2', who: 'all', mp: 16, status: ['burn', 30], burnsForest: true, fx: 'tempest', anim: 'cast', desc: 'A falling sun; Burn 30%' });
S('harvestmoon', { name: 'Harvest Moon', kind: 'spell', elem: 'autumn', p: 34, magic: true, range: [1, 5], area: 'r2', who: 'all', mp: 16, drainPct: .25, fx: 'tempest', anim: 'cast', desc: 'The moon floods them; drains 25%' });
S('blizzard', { name: 'Blizzard', kind: 'spell', elem: 'winter', p: 34, magic: true, range: [1, 5], area: 'r2', who: 'all', mp: 16, status: ['chill', 30], fx: 'tempest', anim: 'cast', desc: 'A white-out; Chill 30%' });
// mage and cleric support
S('manasiphon', { name: 'Mana Siphon', kind: 'spell', range: [1, 4], mp: 2, siphon: 12, fx: 'hex', anim: 'cast', desc: 'Steals 12 MP' });
S('haste', { name: 'Haste', kind: 'spell', range: [0, 3], who: 'ally', mp: 8, buff: [['haste', 2]], fx: 'buff', anim: 'cast', desc: 'MOV +1, AGI +20% for 2 bells' });
S('mend', { name: 'Mend', kind: 'spell', heal: 30, range: [0, 3], who: 'ally', mp: 5, fx: 'heal', anim: 'cast', desc: 'Heals 30' });
S('purify', { name: 'Purify', kind: 'spell', range: [0, 3], who: 'ally', mp: 4, cleanse: true, fx: 'heal', anim: 'cast', desc: 'Clears statuses and debuffs' });
S('renewal', { name: 'Renewal', kind: 'spell', heal: 24, range: [0, 3], area: 'r1', who: 'allies', mp: 10, fx: 'heal', anim: 'cast', desc: 'Heals 24 around a point' });
S('wardofseasons', { name: 'Ward of Seasons', kind: 'spell', range: [0, 3], area: 'r1', who: 'allies', mp: 9, buff: [['warded', 2]], fx: 'buff', anim: 'cast', desc: 'Warded to allies around a point' });
S('greaterrenewal', { name: 'Greater Renewal', kind: 'spell', heal: 36, range: [0, 4], area: 'r2', who: 'allies', mp: 16, fx: 'heal', anim: 'cast', desc: 'Heals 36 over a wide area' });
S('dawnlight', { name: 'Dawnlight', kind: 'spell', elem: 'none', p: 26, magic: true, range: [1, 4], area: 'r1', who: 'foes', mp: 14, vsHour: 1.5, noTide: true, fx: 'holy', anim: 'cast', desc: 'Holy light on foes; x1.5 vs Hour' });
// beast line
S('goad', { name: 'Goad', range: [1, 2], who: 'ownMonster', mp: 3, mobile: true, buff: [['valor', 1], ['haste', 1]], fx: 'buff', anim: 'wave', desc: 'Valor and Haste to one of your monsters' });
S('packtactics', { name: 'Pack Tactics', kind: 'passive', desc: "The knight's monsters +10 hit" });
S('roar', { name: 'Roar', range: 'self', area: 'self-r2', mp: 6, mobile: true, status: ['weakened', 60], fx: 'roar', anim: 'hips', desc: 'Weakens foes around' });
S('callofwild', { name: 'Call of the Wild', range: 'self', area: 'troop', who: 'ownMonsters', heal: { pct: .2 }, mp: 12, mobile: true, fx: 'heal', anim: 'cheer', desc: "Heals the troop's monsters 20%" });
S('bondoffang', { name: 'Bond of Fang', range: 'ward', who: 'ownMonster', mp: 10, mobile: true, buff: [['valor', 2], ['warded', 2], ['haste', 2]], fx: 'buff', anim: 'wave', desc: 'Valor, Warded and Haste to one monster in Ward' });
// rulers
S('verdantoath', { name: 'Verdant Oath', elem: 'spring', range: 'self', area: 'ward', who: 'allies', heal: { pct: .1 }, mp: 10, mobile: true, buff: [['warded', 2]], fx: 'buff', anim: 'cheer', desc: 'Heals 10% and wards allies in Ward' });
S('warcry', { name: 'Warcry', elem: 'summer', range: 'self', area: 'ward', who: 'allies', mp: 8, mobile: true, buff: [['valor', 2]], fx: 'roar', anim: 'cheer', desc: 'Valor to allies in Ward' });
S('quietcounsel', { name: 'Quiet Counsel', elem: 'autumn', range: 'self', area: 'ward', who: 'allies', mp: 10, mobile: true, buff: [['haste', 1]], fx: 'buff', anim: 'cast', desc: 'Haste to allies in Ward' });
S('reaping', { name: 'Reaping', kind: 'spell', elem: 'autumn', p: 20, magic: true, range: [1, 3], mp: 8, drainPct: .5, fx: 'bolt', anim: 'cast', desc: 'Heals the caster half the damage' });
S('madgambit', { name: 'Mad Gambit', elem: 'winter', p: 30, magic: true, range: [1, 3], mp: 6, mobile: true, misfire: .25, fx: 'bolt', anim: 'spin', desc: 'A wild bolt; 25%: it Chills the Duke' });
S('frozenhour', { name: 'Frozen Hour', kind: 'spell', elem: 'winter', range: [1, 4], mp: 12, status: ['stop', 70], fx: 'hex', anim: 'cast', desc: 'Stop 70%' });
S('restore', { name: 'Restore', kind: 'spell', elem: 'hour', heal: { pct: .5 }, range: [0, 3], who: 'ally', mp: 14, fx: 'heal', anim: 'cast', desc: 'Heals 50% of max HP' });
S('turning', { name: 'Turning', elem: 'none', p: 40, magic: true, range: [1, 3], area: 'r1', who: 'foes', mp: 0, oncePerBattle: true, mobile: true, vsHour: 2, breaksTimeless: true, fx: 'holy', anim: 'cast', desc: 'Once a battle: x2 vs Hour; breaks Timeless' });
S('ambush', { name: 'Ambush', kind: 'passive', desc: '+30% damage attacking from a forest' });
// the Gray Knight
S('thirteenthstroke', { name: 'Thirteenth Stroke', elem: 'hour', p: 1.6, area: 'r1', who: 'foes', mp: 0, mobile: true, fx: 'hourslash', anim: 'twohand', desc: 'A blow that strikes the hour' });
S('still', { name: 'Still', elem: 'hour', range: 'self', area: 'self-r2', mp: 0, mobile: true, status: ['stop', 70], every: 3, fx: 'hex', anim: 'spin', desc: 'Stop 70% around; every 3rd bell' });
S('unmaking', { name: 'Unmaking', kind: 'spell', elem: 'hour', range: [1, 3], mp: 20, unmake: .25, fx: 'bolt', anim: 'plunge', desc: '25% of max HP; ignores defense' });
S('timeless', { name: 'Timeless', kind: 'passive', desc: 'Immune to effects and the Tide; half damage until the Wheel turns' });
// monsters
S('pollenpuff', { name: 'Pollen Puff', elem: 'spring', range: 'self', area: 'self-r1', mp: 6, mobile: true, status: ['sleep', 50], fx: 'hex', anim: 'puff', desc: 'Sleep 50% around' });
S('entangle', { name: 'Entangle', elem: 'spring', p: .6, range: [1, 2], mp: 5, status: ['chill', 70], fx: 'vine', anim: 'cast', desc: 'Vines; Chill 70%' });
S('scream', { name: 'Mandrake Scream', elem: 'spring', range: 'self', area: 'self-r2', mp: 10, status: ['sleep', 50], fx: 'roar', anim: 'roar', desc: 'Sleep 50% in a wide ring' });
S('sleepdust', { name: 'Sleep Dust', kind: 'spell', elem: 'spring', range: [1, 3], area: 'r1', mp: 8, status: ['sleep', 60], fx: 'hex', anim: 'cast', desc: 'Sleep 60% on an area' });
S('thorns', { name: 'Thorns', kind: 'passive', desc: 'Melee attackers take 10% of the damage they deal' });
S('rootsweep', { name: 'Root Sweep', elem: 'spring', p: .9, range: 'self', area: 'adj', mp: 6, mobile: true, fx: 'vine', anim: 'stomp', desc: 'Hits every foe beside it' });
S('dive', { name: 'Dive', elem: 'user', p: 1.2, mp: 4, mobile: true, needMove: 2, fliers: true, fx: 'slash', anim: 'dive', desc: 'A diving strike; move 2+ first' });
S('torrent', { name: 'Torrent', elem: 'spring', p: 1.0, range: 'self', area: 'line3', mp: 6, fx: 'water', anim: 'breath', desc: 'A jet of water along a line' });
S('coil', { name: 'Coil', elem: 'user', p: .8, mp: 4, mobile: true, status: ['chill', 60], fx: 'slash', anim: 'coil', desc: 'Constricts; Chill 60%' });
S('emberspit', { name: 'Ember Spit', elem: 'summer', p: .9, range: [1, 2], mp: 3, mobile: true, status: ['burn', 30], fx: 'fire', anim: 'breath', desc: 'Burn 30%' });
S('firebreath', { name: 'Fire Breath', elem: 'summer', p: 1.2, range: 'self', area: 'cone2', mp: 8, status: ['burn', 25], always: true, burnsForest: true, fx: 'breath', anim: 'breath', desc: 'A cone of fire; Burn 25%' });
S('howl', { name: 'Howl', range: 'self', area: 'self-r2', who: 'allies', mp: 5, mobile: true, buff: [['valor', 1]], fx: 'roar', anim: 'roar', desc: 'Valor to the pack' });
S('pounce', { name: 'Pounce', elem: 'user', p: 1.2, mp: 5, mobile: true, fx: 'slash', anim: 'pounce', desc: 'A leaping 1.2x strike' });
S('rebirth', { name: 'Rebirth', kind: 'passive', desc: 'Once a battle, rises from 0 HP with 30%' });
S('sunriddle', { name: 'Sun Riddle', elem: 'summer', range: 'self', area: 'self-r1', mp: 8, status: ['sleep', 50], fx: 'hex', anim: 'roar', desc: 'A riddle that puts foes to sleep' });
S('wispfire', { name: 'Wisp Fire', elem: 'autumn', p: 12, magic: true, range: [1, 3], mp: 4, mobile: true, fx: 'bolt', anim: 'cast', desc: 'A ghost flame' });
S('fear', { name: 'Fear', elem: 'autumn', range: 'self', area: 'self-r1', mp: 5, mobile: true, status: ['weakened', 60], fx: 'hex', anim: 'roar', desc: 'Weakens foes around' });
S('drain', { name: 'Drain', elem: 'user', p: 1.0, mp: 4, mobile: true, drainPct: .5, fx: 'drain', anim: 'bite', desc: 'Heals half the damage' });
S('gravechill', { name: 'Grave Chill', elem: 'winter', range: 'self', area: 'self-r1', mp: 7, status: ['chill', 40], fx: 'hex', anim: 'cast', desc: 'Chill 40% around' });
S('gale', { name: 'Gale', elem: 'autumn', p: .7, mp: 5, mobile: true, push: 1, fx: 'wind', anim: 'claw', desc: 'Pushes the target a hex' });
S('trample', { name: 'Trample', elem: 'user', p: 1.0, range: 'self', area: 'line3', mp: 6, mobile: true, fx: 'slash', anim: 'gore', desc: 'Tramples a line' });
S('thickhide', { name: 'Thick Hide', kind: 'passive', desc: 'DEF +10%' });
S('frostarmor', { name: 'Frost Armor', elem: 'winter', range: 'self', area: 'self', who: 'self', mp: 5, mobile: true, buff: [['frostarmor', 2]], fx: 'buff', anim: 'block', desc: 'DEF +40% for 2 bells' });
S('avalanche', { name: 'Avalanche', elem: 'winter', p: 1.0, range: [1, 2], area: 'r1', mp: 9, fx: 'ice', anim: 'stomp', desc: 'Snow crashes on an area' });
S('hurlice', { name: 'Hurl Ice', elem: 'winter', p: 1.0, range: [2, 3], mp: 5, ranged: true, fx: 'ice', anim: 'throw', desc: 'A thrown block of ice' });
S('frostfang', { name: 'Frost Fang', kind: 'passive', desc: 'Basic attacks Chill 30%' });
S('frostbreath', { name: 'Frost Breath', elem: 'winter', p: 1.2, range: 'self', area: 'cone3', mp: 8, status: ['chill', 40], always: true, fx: 'breath', anim: 'breath', desc: 'A cone of frost; Chill 40%' });
S('tailsweep', { name: 'Tail Sweep', elem: 'user', p: .9, range: 'self', area: 'adj', mp: 6, mobile: true, fx: 'slash', anim: 'tailsweep', desc: 'Sweeps every foe beside it' });
S('windup', { name: 'Wind-up', range: 'self', area: 'self', who: 'self', mp: 3, mobile: true, windup: true, fx: 'buff', anim: 'block', desc: 'Its next basic attack x1.5' });
S('pendulum', { name: 'Pendulum', elem: 'hour', p: 1.1, range: 'self', area: 'adj', mp: 6, mobile: true, fx: 'hourslash', anim: 'tailsweep', desc: 'A swinging blow on all beside it' });
S('stopbite', { name: 'Stopping Bite', kind: 'passive', desc: 'Basic attacks Stop 20%' });
S('engulf', { name: 'Engulf', elem: 'user', p: .9, mp: 4, mobile: true, status: ['poison', 40], fx: 'drain', anim: 'bite', desc: 'Poison 40%' });
S('regenerate', { name: 'Regenerate', kind: 'passive', desc: 'Heals 10% of max HP each turn' });
S('groundpound', { name: 'Ground Pound', elem: 'user', p: 1.0, range: 'self', area: 'adj', mp: 7, mobile: true, fx: 'quake', anim: 'stomp', desc: 'Shakes every foe beside it' });
S('screech', { name: 'Screech', range: 'self', area: 'self-r1', mp: 5, mobile: true, status: ['weakened', 60], fx: 'roar', anim: 'roar', desc: 'Weakens foes around' });

/** the element's spell of a tier: 'bolt' | 'hex' | 'storm' | 'tempest' */
G.elemSpell = (tier, el) => {
  const i = ['spring', 'summer', 'autumn', 'winter', 'hour'].indexOf(el);
  if (i < 0) return null;
  if (tier === 'bolt') return BOLTS[i][0];
  if (tier === 'hex') return HEXES[i][0];
  if (tier === 'storm') return STORMS[i][0];
  if (tier === 'tempest') return ['verdanttempest', 'solarflare', 'harvestmoon', 'blizzard', 'hourstorm'][i];
  return null;
};
