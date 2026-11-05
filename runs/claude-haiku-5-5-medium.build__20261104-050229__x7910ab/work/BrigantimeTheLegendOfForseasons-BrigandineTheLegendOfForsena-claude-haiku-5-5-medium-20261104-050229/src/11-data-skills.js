// The 90 skills and spells of the plan's table (§6.7). Each names its kind (special, spell or passive), its element, its
// power (P: a damage multiplier, or a heal), its range, its area, who it touches, its cost, whether it may be used after
// a move, and its status effects. Statuses: [name, chance %, bells]. A special or spell costs a cooldown (its MP cost
// divided by four, at least one bell); a passive works all the time. Areas: single, r1, r2 (around the target), self-r1,
// self-r2, self, adj, cone2, cone3, line3, line4. Filters: foes, allies, own, any, self.
// Statuses the battle knows: valor (+2 attack), warded (+3 defence), haste (+2 move), chill (-2 move), sleep and stop
// (lose the turn), poison and burn (2 harm a bell), weakened (-2 attack), frostarmor (+40% defence), windup (next strike x1.5).
(() => {
  const H = G;
  const ELEM = { Sp: 'verdant', Su: 'solar', Au: 'ambered', Wi: 'rime', Hour: 'hour', none: 'neutral', user: 'user' };
  // S(id, name, kind, elem, power, range, area, filter, cost, mobile, effects, extra, desc)
  const S = (id, name, kind, elem, power, range, area, filter, cost, mobile, effects, extra, desc) => {
    const cd = kind === 'passive' ? 0 : extra && extra.cd ? extra.cd : Math.max(1, Math.ceil(cost / 4));
    return H.def('skill', id, Object.assign({ name, kind, elem: ELEM[elem] || elem, power, range, area, filter, cost, mobile: !!mobile,
      effects: effects || [], cd, desc: desc || '' }, extra || {}));
  };
  const P = (heal) => ({ heal });
  // the eleven knightly and common skills
  S('rally', 'Rally', 'special', 'none', null, [0, 0], 'self-r1', 'allies', 4, true, [['valor', 100, 2]], null, 'Adjacent allies gain valor: +2 attack for two bells.');
  S('charge', 'Charge', 'special', 'user', 1.3, [1, 1], 'single', 'foes', 5, true, [], { needMove: 2 }, 'Must move two hexes first, then strikes at 1.3 power.');
  S('shieldwall', 'Shield Wall', 'special', 'none', null, [0, 0], 'adj', 'allies', 6, true, [['warded', 100, 1]], null, 'Adjacent allies are warded for a bell.');
  S('holystrike', 'Holy Strike', 'special', 'none', 1.5, [1, 1], 'single', 'foes', 8, true, [], { vsHour: 1.5, ignoreElem: true }, 'Ignores element; 1.5 times the damage against the Hour.');
  S('layonhands', 'Lay on Hands', 'special', 'none', P(60), [1, 1], 'single', 'allies', 10, true, [], null, 'Heals an adjacent ally for 60.');
  S('aimedshot', 'Aimed Shot', 'special', 'user', 1.2, [2, 4], 'single', 'foes', 4, false, [], { hit: 20 }, 'A careful shot at two to four hexes: +20 to hit.');
  S('volley', 'Volley', 'special', 'user', 0.8, [3, 5], 'r1', 'foes', 8, false, [], null, 'Arrows across a patch of ground, three to five hexes away.');
  S('pinning', 'Pinning Shot', 'special', 'user', 0.9, [2, 4], 'single', 'foes', 6, true, [['chill', 70, 2]], null, 'Chills the target, slowing it.');
  S('piercing', 'Piercing Arrow', 'special', 'user', 1.1, [1, 4], 'line4', 'foes', 10, false, [], null, 'Every unit along a line of four hexes.');
  S('eagleeye', 'Eagle Eye', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { bowRange: 1 }, 'Bows reach one hex further.');
  // the bolts, the hexes, the storms and the tempests
  S('bramble', 'Bramble Bolt', 'spell', 'verdant', 14, [1, 4], 'single', 'foes', 5, false, [], null, 'A bolt of thorns.');
  S('cinder', 'Cinder Bolt', 'spell', 'solar', 14, [1, 4], 'single', 'foes', 5, false, [], null, 'A bolt of ember.');
  S('galeleaves', 'Gale of Leaves', 'spell', 'ambered', 14, [1, 4], 'single', 'foes', 5, false, [], null, 'A bolt of whirling leaves.');
  S('hoarfrost', 'Hoarfrost', 'spell', 'rime', 14, [1, 4], 'single', 'foes', 5, false, [], null, 'A bolt of rime.');
  S('timeshear', 'Time Shear', 'spell', 'hour', 14, [1, 4], 'single', 'foes', 5, false, [], { ignoreTide: true }, 'A bolt that ignores the season\'s tide.');
  S('drowse', 'Drowse', 'spell', 'verdant', null, [1, 4], 'single', 'foes', 6, false, [['sleep', 60, 1]], null, 'Puts the target to sleep for a bell.');
  S('kindle', 'Kindle', 'spell', 'solar', null, [1, 4], 'single', 'foes', 6, false, [['burn', 70, 2]], null, 'Sets the target burning.');
  S('rot', 'Rot', 'spell', 'ambered', null, [1, 4], 'single', 'foes', 6, false, [['poison', 70, 2]], null, 'Poisons the target.');
  S('frostbite', 'Frostbite', 'spell', 'rime', null, [1, 4], 'single', 'foes', 6, false, [['chill', 70, 2]], null, 'Chills the target.');
  S('stophex', 'Stop Hex', 'spell', 'hour', null, [1, 4], 'single', 'foes', 6, false, [['stop', 40, 1]], null, 'Stops the target for a bell, 40% of the time.');
  S('bramblestorm', 'Bramble Storm', 'spell', 'verdant', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'Thorns across a patch of ground.');
  S('cinderstorm', 'Cinder Storm', 'spell', 'solar', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'Fire across a patch of ground; sets a forest burning.');
  S('leafstorm', 'Leaf Storm', 'spell', 'ambered', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'Leaves across a patch of ground.');
  S('froststorm', 'Frost Storm', 'spell', 'rime', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'Rime across a patch of ground.');
  S('hourstorm', 'Hour Storm', 'spell', 'hour', 22, [1, 4], 'r1', 'foes', 10, false, [], null, 'The hour falls across a patch of ground.');
  S('verdanttempest', 'Verdant Tempest', 'spell', 'verdant', 34, [1, 5], 'r2', 'foes', 16, false, [['sleep', 20, 1]], null, 'A storm of green over two hexes around the target.');
  S('solarflare', 'Solar Flare', 'spell', 'solar', 34, [1, 5], 'r2', 'foes', 16, false, [['burn', 30, 2]], { burnsForest: true }, 'A flare that burns and sets forests alight.');
  S('harvestmoon', 'Harvest Moon', 'spell', 'ambered', 34, [1, 5], 'r2', 'foes', 16, false, [], { drainPct: 25 }, 'A moon that takes a quarter of its damage back.');
  S('blizzard', 'Blizzard', 'spell', 'rime', 34, [1, 5], 'r2', 'foes', 16, false, [['chill', 30, 2]], null, 'Snow across two hexes around the target.');
  S('manasiphon', 'Mana Siphon', 'spell', 'neutral', null, [1, 4], 'single', 'foes', 2, false, [['weakened', 60, 2]], null, 'Drains the target\'s strength (the plan\'s MP theft, as a weakening).');
  S('haste', 'Haste', 'spell', 'neutral', null, [0, 3], 'single', 'allies', 8, false, [['haste', 100, 2]], null, 'An ally moves two hexes further for two bells.');
  S('mend', 'Mend', 'spell', 'neutral', P(30), [0, 3], 'single', 'allies', 5, false, [], null, 'Heals an ally for 30.');
  S('purify', 'Purify', 'spell', 'neutral', null, [0, 3], 'single', 'allies', 4, false, [], { cleanse: true }, 'Clears an ally\'s statuses and debuffs.');
  S('renewal', 'Renewal', 'spell', 'neutral', P(24), [0, 3], 'r1', 'allies', 10, false, [], null, 'Heals every ally around the target for 24.');
  S('wardofseasons', 'Ward of Seasons', 'spell', 'neutral', null, [0, 3], 'r1', 'allies', 9, false, [['warded', 100, 2]], null, 'Allies around the target are warded for two bells.');
  S('greaterrenewal', 'Greater Renewal', 'spell', 'neutral', P(36), [0, 4], 'r2', 'allies', 16, false, [], null, 'Heals every ally within two of the target for 36.');
  S('dawnlight', 'Dawnlight', 'spell', 'none', 26, [1, 4], 'r1', 'foes', 14, false, [], { vsHour: 1.5, ignoreTide: true }, 'Light across a patch of ground: 1.5 times against the Hour.');
  S('goad', 'Goad', 'special', 'none', null, [1, 2], 'single', 'own', 3, true, [['valor', 100, 1], ['haste', 100, 1]], null, 'Spurs one of the knight\'s monsters on: valor and haste for a bell.');
  S('packtactics', 'Pack Tactics', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { packHit: 10 }, 'The knight\'s monsters hit 10 more often.');
  S('roar', 'Roar', 'special', 'none', null, [0, 0], 'self-r2', 'foes', 6, true, [['weakened', 60, 2]], null, 'Foes within two hexes are weakened.');
  S('callofwild', 'Call of the Wild', 'special', 'none', { pctMax: 20 }, [0, 0], 'self', 'own', 12, true, [], null, 'Heals the troop\'s monsters for a fifth of their maximum.');
  S('bondoffang', 'Bond of Fang', 'special', 'none', null, [0, 0], 'self', 'own', 10, true, [['valor', 100, 2], ['warded', 100, 2], ['haste', 100, 2]], { ward: true }, 'One monster in the knight\'s ward gains valor, ward and haste.');
  S('verdantoath', 'Verdant Oath', 'special', 'verdant', { pctMax: 10 }, [0, 0], 'self', 'allies', 10, true, [['warded', 100, 2]], { ward: true }, 'Allies in the ward heal a tenth and are warded.');
  S('warcry', 'Warcry', 'special', 'solar', null, [0, 0], 'self', 'allies', 8, true, [['valor', 100, 2]], { ward: true }, 'Allies in the ward gain valor.');
  S('quietcounsel', 'Quiet Counsel', 'special', 'ambered', null, [0, 0], 'self', 'allies', 10, true, [['haste', 100, 1]], { ward: true }, 'Allies in the ward gain haste.');
  S('reaping', 'Reaping', 'spell', 'ambered', 20, [1, 3], 'single', 'foes', 8, false, [], { drainPct: 50 }, 'Strikes and takes back half the harm as health.');
  S('madgambit', 'Mad Gambit', 'special', 'rime', 30, [1, 3], 'single', 'foes', 6, true, [], { magic: true }, 'A magic strike at 30 power.');
  S('frozenhour', 'Frozen Hour', 'spell', 'rime', null, [1, 4], 'single', 'foes', 12, false, [['stop', 70, 1]], null, 'Stops the target for a bell, 70% of the time.');
  S('restore', 'Restore', 'spell', 'hour', { pctMax: 50 }, [0, 3], 'single', 'allies', 14, false, [], null, 'Restores half an ally\'s maximum health.');
  S('turning', 'Turning', 'special', 'none', 40, [1, 1], 'r1', 'foes', 0, true, [], { magic: true, vsHour: 2, once: true }, 'Once a battle: 40 magic power against all around, twice against the Hour.');
  S('ambush', 'Ambush', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { forestBonus: 1.3 }, 'Attacks from a forest hex deal 30% more.');
  S('thirteenthstroke', 'Thirteenth Stroke', 'special', 'hour', 1.6, [1, 1], 'r1', 'foes', 0, true, [], { cd: 4 }, 'The Gray Knight\'s blow, at 1.6 power.');
  S('still', 'Still', 'special', 'hour', null, [0, 0], 'self-r2', 'foes', 0, true, [['stop', 70, 1]], { cd: 3 }, 'Every third bell: foes within two hexes stop.');
  S('unmaking', 'Unmaking', 'spell', 'hour', { pctTarget: 25 }, [1, 3], 'single', 'foes', 20, false, [], { ignoreDef: true }, 'Takes a quarter of the target\'s maximum health, ignoring defence.');
  S('timeless', 'Timeless', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { timeless: true }, 'Takes half damage from every strike.');
  S('pollenpuff', 'Pollen Puff', 'special', 'verdant', null, [0, 0], 'self-r1', 'foes', 6, true, [['sleep', 50, 1]], null, 'Foes beside it fall asleep half the time.');
  S('entangle', 'Entangle', 'special', 'verdant', 0.6, [1, 2], 'single', 'foes', 5, false, [['chill', 70, 2]], null, 'Vines strike and chill.');
  S('scream', 'Mandrake Scream', 'special', 'verdant', null, [0, 0], 'self-r2', 'foes', 10, false, [['sleep', 50, 1]], null, 'Foes within two hexes fall asleep half the time.');
  S('sleepdust', 'Sleep Dust', 'spell', 'verdant', null, [1, 3], 'r1', 'foes', 8, false, [['sleep', 60, 1]], null, 'Sleep across a patch of ground.');
  S('thorns', 'Thorns', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { thorns: 10 }, 'Melee attackers take a tenth of the harm they deal.');
  S('rootsweep', 'Root Sweep', 'special', 'verdant', 0.9, [0, 0], 'adj', 'foes', 6, true, [], null, 'Roots sweep every foe beside it.');
  S('dive', 'Dive', 'special', 'user', 1.2, [1, 1], 'single', 'foes', 4, true, [], { needMove: 2, fliers: true }, 'Fliers: must move two hexes, then dive.');
  S('torrent', 'Torrent', 'special', 'verdant', 1.0, [0, 0], 'line3', 'foes', 6, false, [], null, 'A rush of water along three hexes.');
  S('coil', 'Coil', 'special', 'user', 0.8, [1, 1], 'single', 'foes', 4, true, [['chill', 60, 2]], null, 'Coils round the target and chills it.');
  S('emberspit', 'Ember Spit', 'special', 'solar', 0.9, [1, 2], 'single', 'foes', 3, true, [['burn', 30, 2]], null, 'Spits fire at one or two hexes.');
  S('firebreath', 'Fire Breath', 'special', 'solar', 1.2, [0, 0], 'cone2', 'foes', 8, false, [['burn', 25, 2]], { cone3ForDragons: true }, 'A cone of fire two hexes deep.');
  S('howl', 'Howl', 'special', 'neutral', null, [0, 0], 'self-r2', 'allies', 5, true, [['valor', 100, 1]], null, 'Allies within two hexes gain valor for a bell.');
  S('pounce', 'Pounce', 'special', 'user', 1.2, [1, 1], 'single', 'foes', 5, true, [], null, 'Leaps on an adjacent foe.');
  S('rebirth', 'Rebirth', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { rebirth: 30 }, 'Once a battle, at zero health it rises again with 30%.');
  S('sunriddle', 'Sun Riddle', 'special', 'solar', null, [0, 0], 'self-r1', 'foes', 8, false, [['sleep', 50, 1]], null, 'Foes beside it fall asleep half the time.');
  S('wispfire', 'Wisp Fire', 'special', 'ambered', 0.9, [1, 3], 'single', 'foes', 4, true, [], { magic: true }, 'A magic flame that flickers at range.');
  S('fear', 'Fear', 'special', 'ambered', null, [0, 0], 'self-r1', 'foes', 5, true, [['weakened', 60, 2]], null, 'Foes beside it are weakened.');
  S('drain', 'Drain', 'special', 'user', 1.0, [1, 1], 'single', 'foes', 4, true, [], { drainPct: 50 }, 'Strikes and takes back half the harm as health.');
  S('gravechill', 'Grave Chill', 'special', 'rime', null, [0, 0], 'self-r1', 'foes', 7, false, [['chill', 40, 2]], null, 'Foes beside it are chilled.');
  S('gale', 'Gale', 'special', 'ambered', 0.7, [1, 1], 'single', 'foes', 5, true, [], { push: 1 }, 'Pushes the target one hex away; if blocked, four more harm.');
  S('trample', 'Trample', 'special', 'user', 1.0, [0, 0], 'line3', 'foes', 6, true, [], null, 'Tramples along three hexes.');
  S('thickhide', 'Thick Hide', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { defPct: 10 }, 'Defence +10%.');
  S('frostarmor', 'Frost Armor', 'special', 'rime', null, [0, 0], 'self', 'self', 5, true, [['frostarmor', 100, 2]], null, 'Defence +40% for two bells.');
  S('avalanche', 'Avalanche', 'special', 'rime', 1.0, [1, 2], 'r1', 'foes', 9, false, [], null, 'Ice falls over a patch of ground.');
  S('hurlice', 'Hurl Ice', 'special', 'rime', 1.0, [2, 3], 'single', 'foes', 5, false, [], null, 'A lump of ice at range.');
  S('frostfang', 'Frost Fang', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { onHitChill: 30 }, 'Basic attacks chill the target 30% of the time.');
  S('frostbreath', 'Frost Breath', 'special', 'rime', 1.2, [0, 0], 'cone3', 'foes', 8, false, [['chill', 40, 2]], null, 'A cone of frost three hexes deep.');
  S('tailsweep', 'Tail Sweep', 'special', 'user', 0.9, [0, 0], 'adj', 'foes', 6, true, [], null, 'Sweeps every foe beside it with the tail.');
  S('windup', 'Wind-up', 'special', 'none', null, [0, 0], 'self', 'self', 3, true, [['windup', 100, 1]], null, 'Its next basic attack deals 1.5 times the damage.');
  S('pendulum', 'Pendulum', 'special', 'hour', 1.1, [0, 0], 'adj', 'foes', 6, true, [], null, 'Swings through every foe beside it.');
  S('stopbite', 'Stopping Bite', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { onHitStop: 20 }, 'Basic attacks stop the target 20% of the time.');
  S('engulf', 'Engulf', 'special', 'user', 0.9, [1, 1], 'single', 'foes', 4, true, [['poison', 40, 2]], null, 'Engulfs the target and poisons it.');
  S('regenerate', 'Regenerate', 'passive', null, null, [0, 0], 'self', 'self', 0, true, [], { regen: 10 }, 'Heals a tenth of its maximum at the start of its turn.');
  S('groundpound', 'Ground Pound', 'special', 'user', 1.0, [0, 0], 'adj', 'foes', 7, true, [], null, 'Pounds every foe beside it.');
  S('screech', 'Screech', 'special', 'none', null, [0, 0], 'self-r1', 'foes', 5, true, [['weakened', 60, 2]], null, 'Foes beside it are weakened.');
  // the alias the species and classes of the first bestiary used, now the plan's own ids
  G.SKILL_ALIAS = { breath: 'firebreath', frost: 'frostbreath', thunder: 'hurlice', guard: 'shieldwall', 'stun-strike': 'coil', venom: 'engulf',
    pierce: 'aimedshot', sweep: 'groundpound', shield: 'wardofseasons', 'mend-greater': 'greaterrenewal', 'cinder-bolt': 'cinder',
    warhowl: 'warcry', crush: 'trample', 'dusk-hex': 'stophex', 'bone-ward': 'shieldwall', 'chain-lightning': 'wispfire' };
  for (const k of Object.keys(G.SKILL_ALIAS)) { if (!H.has('skill', G.SKILL_ALIAS[k])) throw new Error('alias ' + k); }
  G.skillId = id => (G.SKILL_ALIAS[id] && !H.has('skill', id) ? G.SKILL_ALIAS[id] : id);
})();
