/* =============================================================================
 * 50-teams: the six teams, their rosters, looks, uniforms, aces, signature
 * pitches and team supers. Adding a team is one BZ.def('teams', ...) entry.
 * Stats run 1-10 (5 is average). Batters: pow con spd arm glv. Pitchers add
 * vel ctl brk sta. bt is "bats/throws".
 * ========================================================================== */
const SKINS = ['#f1c7a0', '#e0a878', '#c68a5a', '#a86a42', '#8a5232', '#6a3e26', '#f4d2b4'];
const HAIRS = ['#2a1e1a', '#4a3020', '#7a4a2a', '#c89048', '#e8c870', '#1a1a1a', '#9a2a1a', '#d8d8d8'];
const HSTYLE = ['short', 'spiky', 'short', 'ponytail', 'long', 'short', 'bald', 'spiky'];
/** build a roster from names, with stats from a team profile (seeded, so it is the same every time) */
function roster(teamId, list, prof) {
  const r = E.rng(BZ.hash(teamId));
  return list.map(([pos, name, bt, stats, look], i) => {
    const s = stats || {};
    const rnd = (b) => clamp(Math.round(b + (r() - .5) * 4), 2, 10);
    const p = {
      id: teamId + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), team: teamId, name, short: name.replace(/".*?"\s*/, '').split(' ').pop().toUpperCase(),
      pos, bt: bt || 'R/R', num: s.num || (1 + Math.floor(r() * 49)),
      pow: s.pow !== undefined ? s.pow : rnd(prof.pow), con: s.con !== undefined ? s.con : rnd(prof.con), spd: s.spd !== undefined ? s.spd : rnd(prof.spd),
      arm: s.arm !== undefined ? s.arm : rnd(prof.arm), glv: s.glv !== undefined ? s.glv : rnd(prof.glv),
      look: Object.assign({ skin: SKINS[Math.floor(r() * SKINS.length)], hairColor: HAIRS[Math.floor(r() * HAIRS.length)], hair: HSTYLE[Math.floor(r() * HSTYLE.length)], size: 1.18 + r() * .14, build: r() < .25 ? 'bulky' : 'heroic' }, prof.look || {}, look || {})
    };
    if (pos === 'P' || pos === 'RP') Object.assign(p, { vel: s.vel || rnd(prof.vel || 6), ctl: s.ctl || rnd(prof.ctl || 6), brk: s.brk || rnd(prof.brk || 6), sta: s.sta || rnd(prof.sta || 6), pitches: s.pitches, pow: s.pow !== undefined ? s.pow : 3, con: s.con !== undefined ? s.con : 3 });
    if (s.voice) p.voice = s.voice;
    if (s.captain) p.captain = true;
    return p;
  });
}
function team(id, o) {
  const players = roster(id, o.list, o.prof);
  const t = BZ.def('teams', id, Object.assign({}, o, { players }));
  t.lineup = players.filter(p => p.pos !== 'RP');                  // batting order, as listed (pitcher last)
  t.ace = players.find(p => p.pos === 'P');
  t.reliever = players.find(p => p.pos === 'RP');
  t.captain = players.find(p => p.captain) || t.ace;
  for (const p of players) BZ.def('players', p.id, p);
  return t;
}

team('comets', {
  name: 'Kernel Falls Comets', nick: 'COMETS', abbr: 'COM', home: 'kernel', city: 'Kernel Falls',
  uniform: { jersey: '#f4ecd8', pants: '#f4ecd8', trim: '#1e2a5a', cap: '#1e2a5a', helmet: '#1e2a5a', socks: '#f2c230', dark: '#1e2a5a', bat: '#c89a5a' },
  colors: ['#1e2a5a', '#f2c230'], mascot: { name: 'Popcorn Pete', R: 8, colors: { dk: '#c8b070', base: '#fff4d0', lt: '#ffffff', spec: '#fff8e0', eye: '#2a1e1a', pupil: '#000000' }, feet: true, mouth: true },
  superPitch: 'cornpopper', zooka: 'BATZOOKA', zookaColors: ['#ff7a1a', '#ffd040', '#fff6c0'], voice: 'dot', stars: [4, 4, 3],
  prof: { pow: 6, con: 7, spd: 6, arm: 6, glv: 7 },
  list: [
    ['CF', 'Dot "Dynamite" Delgado', 'R/R', { pow: 9, con: 8, spd: 7, arm: 7, glv: 7, num: 7, captain: true, voice: 'dot' }, { build: 'heroic', hair: 'ponytail', skin: '#a86a42', hairColor: '#2a1a12', size: 1.28, expr: 'smile' }],
    ['SS', 'Pep Porter', 'L/R', { pow: 4, con: 8, spd: 9, arm: 7, glv: 9, num: 2 }, { build: 'chibi', hair: 'spiky', skin: '#f1c7a0', hairColor: '#c86a2a', size: 1.2 }],
    ['2B', 'Pip Porter', 'R/R', { pow: 4, con: 7, spd: 9, arm: 6, glv: 8, num: 3 }, { build: 'chibi', hair: 'spiky', skin: '#f1c7a0', hairColor: '#c86a2a', size: 1.2 }],
    ['1B', 'Moose Magnusson', 'L/L', { pow: 9, con: 5, spd: 3, arm: 5, glv: 6, num: 44 }, { build: 'bulky', hair: 'ponytail', skin: '#f4d2b4', hairColor: '#e8c870', size: 1.36 }],
    ['3B', 'Sunny Sato', 'R/R', { pow: 6, con: 7, spd: 6, arm: 8, glv: 8, num: 5 }, { hair: 'short', skin: '#e0b088', hairColor: '#1a1a1a', expr: 'smile' }],
    ['C', 'Rosa "Radar" Reyes', 'R/R', { pow: 6, con: 6, spd: 4, arm: 9, glv: 8, num: 12 }, { hair: 'ponytail', skin: '#c68a5a', hairColor: '#2a1e1a' }],
    ['LF', 'Lefty Luna', 'L/L', { pow: 5, con: 8, spd: 8, arm: 6, glv: 7, num: 21 }, { hair: 'long', skin: '#a86a42', hairColor: '#1a1a1a' }],
    ['RF', 'Hank "Hambone" Hollis', 'R/R', { pow: 8, con: 5, spd: 5, arm: 9, glv: 6, num: 33 }, { build: 'bulky', hair: 'short', skin: '#e0a878', hairColor: '#7a4a2a', size: 1.32 }],
    ['P', 'Grandpa Ike Kowalski', 'R/R', { vel: 4, ctl: 8, brk: 9, sta: 6, pow: 2, con: 4, spd: 2, arm: 6, glv: 6, num: 62, voice: 'ike', pitches: ['heater', 'curve', 'knuckler', 'butterfly'] }, { hunch: .3, hair: 'bald', hairColor: '#e8e8e8', skin: '#f1c7a0', build: 'heroic', size: 1.22 }],
    ['RP', 'Kid Kernel', 'R/R', { vel: 9, ctl: 5, brk: 5, sta: 4, num: 99, voice: 'kid', pitches: ['heater', 'slider', 'changeup', 'kernelcannon'] }, { build: 'chibi', hair: 'spiky', hairColor: '#e8c870', size: 1.18 }]
  ]
});
team('krakens', {
  name: 'Harbor City Krakens', nick: 'KRAKENS', abbr: 'HCK', home: 'barnacle', city: 'Harbor City',
  uniform: { jersey: '#1f8a8a', pants: '#e8d8b0', trim: '#ff7a5c', cap: '#1f8a8a', helmet: '#156a6a', socks: '#f4f4f4', dark: '#0e4a4a', bat: '#9a6a3a' },
  colors: ['#1f8a8a', '#ff7a5c'], mascot: { name: 'Squidge', R: 8, colors: { dk: '#4a2a7a', base: '#8a5ac8', lt: '#b890f0', spec: '#e8d8ff', eye: '#fff', pupil: '#1a1a1a' }, mouth: true, feet: true },
  superPitch: 'tidalwave', zooka: 'KRAKENZOOKA', zookaColors: ['#3ac8c8', '#a0fff0', '#ffffff'], voice: 'brine', stars: [3, 4, 4],
  prof: { pow: 5, con: 6, spd: 6, arm: 7, glv: 6 },
  list: [
    ['CF', 'Dash Seaborne', 'L/L'], ['SS', 'Wade Waters', 'R/R'], ['1B', 'Coral Quinn', 'L/L'], ['RF', 'Hook Hardy', 'R/R'], ['3B', 'Gil Gruber', 'R/R'],
    ['C', '"Barnacle" Barney Finn', 'R/R'], ['LF', 'Shelly Shoals', 'L/L'], ['2B', 'Skip Marlin', 'R/R'],
    ['P', 'Captain Bettina Brine', 'R/L', { vel: 7, ctl: 7, brk: 8, sta: 7, captain: true, voice: 'brine', pitches: ['heater', 'curve', 'changeup', 'riptide'] }, { hair: 'long', hairColor: '#e8c870', skin: '#e0a878', build: 'heroic', size: 1.27, hat: { style: 'pointed', color: '#1a3a4a' } }],
    ['RP', 'Rip Tidewell', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'riptide'] }]
  ]
});
team('eruptors', {
  name: 'Magma City Eruptors', nick: 'ERUPTORS', abbr: 'MCE', home: 'caldera', city: 'Magma City',
  uniform: { jersey: '#2b2b30', pants: '#2b2b30', trim: '#ff6a1a', cap: '#ff6a1a', helmet: '#2b2b30', socks: '#ffd040', dark: '#141418', bat: '#3a2a20' },
  colors: ['#ff6a1a', '#ffd040'], mascot: { name: 'Sparky', R: 8, colors: { dk: '#a83a0a', base: '#ff7a1a', lt: '#ffc040', spec: '#fff0a0', eye: '#2a0a00', pupil: '#000' }, horns: true, feet: true },
  superPitch: 'meteorheater', zooka: 'LAVAZOOKA', zookaColors: ['#ff3a0a', '#ffa020', '#fff0a0'], voice: 'iggy', stars: [5, 3, 4],
  prof: { pow: 7, con: 5, spd: 5, arm: 7, glv: 5, look: { build: 'bulky' } },
  list: [
    ['SS', 'Ashley Pyre', 'R/R'], ['2B', 'Cinder Ellis', 'L/R'], ['3B', '"Hot Corner" Hector Flores', 'R/R'], ['1B', 'Magnus Holt', 'L/L'], ['RF', 'Sol Vulcan', 'R/R'],
    ['LF', 'Ember Okafor', 'R/R'], ['C', 'Basalt Bruno', 'R/R'], ['CF', 'Flint Rocha', 'L/L'],
    ['P', 'Iggy "The Igniter" Blaze', 'R/R', { vel: 9, ctl: 6, brk: 7, sta: 7, captain: true, voice: 'iggy', pitches: ['heater', 'slider', 'sinker', 'magmasinker'] }, { hair: 'spiky', hairColor: '#ff4a1a', skin: '#c68a5a', build: 'heroic', size: 1.3, expr: 'angry' }],
    ['RP', 'Scorch McGee', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'magmasinker'] }]
  ]
});
team('meteors', {
  name: 'Moonbase Meteors', nick: 'METEORS', abbr: 'MBM', home: 'tranquility', city: 'Moonbase One',
  uniform: { jersey: '#c8d0e0', pants: '#c8d0e0', trim: '#6a4cff', cap: '#6a4cff', helmet: '#6a4cff', socks: '#ffffff', dark: '#3a2a8a', bat: '#d8d8e8', hatStyle: 'visor', visor: '#6a8aff' },
  colors: ['#6a4cff', '#c8d0e0'], mascot: { name: 'Moonpie', R: 8, colors: { dk: '#6a6a78', base: '#b8b8c4', lt: '#e0e0ea', spec: '#ffffff', eye: '#1a1a2a', pupil: '#000' }, face: 'front' },
  superPitch: 'blackhole', zooka: 'LUNAZOOKA', zookaColors: ['#8a6aff', '#c0b0ff', '#ffffff'], voice: 'cosmo', stars: [4, 4, 4],
  prof: { pow: 6, con: 6, spd: 6, arm: 6, glv: 7 },
  list: [
    ['CF', 'Halley Brooks', 'L/L'], ['2B', 'Stella Petrov', 'R/R'], ['3B', 'Rocket Rhodes', 'R/R'], ['1B', 'Nova Nakamura', 'L/L'], ['RF', 'Gus Gravitas', 'R/R'],
    ['SS', 'Quasar Diaz', 'R/R'], ['LF', 'Astra Bell', 'L/L'], ['C', 'Orbit Okoye', 'R/R'],
    ['P', 'Commander Cosmo Vega', 'L/L', { vel: 6, ctl: 8, brk: 9, sta: 8, captain: true, voice: 'cosmo', pitches: ['heater', 'curve', 'changeup', 'zerog'] }, { hair: 'short', hairColor: '#d8d8d8', skin: '#8a5232', build: 'heroic', size: 1.28 }],
    ['RP', 'Pulsar Penn', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'zerog'] }]
  ]
});
team('haunts', {
  name: 'Hollowmoor Haunts', nick: 'HAUNTS', abbr: 'HMH', home: 'boneyard', city: 'Hollowmoor',
  uniform: { jersey: '#e8e0c8', pants: '#1a1630', trim: '#7dffb0', cap: '#1a1630', helmet: '#1a1630', socks: '#7dffb0', dark: '#1a1630', bat: '#5a4a3a', bone: '#e8e0c8' },
  colors: ['#1a1630', '#7dffb0'], mascot: { name: 'Boo', R: 8, colors: { dk: '#a8b8c0', base: '#f0f4f8', lt: '#ffffff', spec: '#ffffff', eye: '#1a1a2a', pupil: '#000' }, face: 'front', mouth: true, ghost: true },
  superPitch: 'banshee', zooka: 'GHOULZOOKA', zookaColors: ['#4affa0', '#c0ffd8', '#ffffff'], voice: 'skeleton', stars: [4, 3, 5],
  prof: { pow: 6, con: 6, spd: 5, arm: 6, glv: 7, look: { build: 'skeleton', size: 1.24, eyeGlow: '#7dffb0' } },
  list: [
    ['SS', 'Skelly Kelly', 'R/R'], ['CF', 'Wisp O\'Hara', 'L/L'], ['1B', 'Boney Malone', 'L/L'], ['3B', 'Ezekiel Tomb', 'R/R'], ['RF', 'Digger Doyle', 'R/R'],
    ['2B', 'Wailin\' Winnie', 'R/R'], ['LF', 'Shade Murphy', 'L/L'], ['C', 'Mort Graves', 'R/R'],
    ['P', 'Count Rattlebones', 'R/R', { vel: 7, ctl: 8, brk: 9, sta: 9, captain: true, voice: 'skeleton', pitches: ['heater', 'curve', 'changeup', 'phantomfork'] }, { build: 'skeleton', size: 1.3, eyeGlow: '#ff5a40', hatOverride: { style: 'tophat', color: '#1a1630', band: '#7dffb0' } }],
    ['RP', 'Spook Hennessy', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'phantomfork'] }]
  ]
});
team('mechanicals', {
  name: 'MegaMax Mechanicals', nick: 'MECHANICALS', abbr: 'MMX', home: 'megadome', city: 'MegaMax Corp', boss: true,
  uniform: { jersey: '#b8c0cc', pants: '#b8c0cc', trim: '#e01e3c', cap: '#e01e3c', helmet: '#e01e3c', socks: '#2de2e6', dark: '#5a6070', bat: '#8a94a8', hatStyle: 'helmet' },
  colors: ['#e01e3c', '#2de2e6'], mascot: { name: 'Mr. Synergy', R: 8, colors: { dk: '#7a8494', base: '#c8d0dc', lt: '#f0f4f8', spec: '#ffffff', eye: '#2de2e6', pupil: '#0a3a3a' }, wings: true, face: 'front' },
  superPitch: 'overclock', zooka: 'MEGAZOOKA 9000', zookaColors: ['#e01e3c', '#2de2e6', '#ffffff'], voice: 'enforcer', stars: [5, 4, 5],
  prof: { pow: 7, con: 6, spd: 5, arm: 8, glv: 7, look: { skin: '#9aa4b4', hair: 'bald', hairColor: '#5a6070', eyeGlow: '#2de2e6', colors: { skin: '#9aa4b4' } } },
  list: [
    ['CF', 'Byte', 'R/R'], ['SS', 'Sprocket', 'R/R'], ['1B', 'Forklift', 'L/L', null, { build: 'bulky' }], ['3B', 'Torque', 'R/R', null, { build: 'bulky' }], ['RF', 'Piston', 'R/R'],
    ['LF', 'Router', 'L/L'], ['2B', 'Servo', 'R/R'], ['C', 'Backstop-X', 'R/R', null, { build: 'bulky' }],
    ['P', 'ENFORCER-9000', 'R/R', { vel: 10, ctl: 8, brk: 6, sta: 10, captain: true, voice: 'enforcer', pitches: ['heater', 'slider', 'sinker', 'gigavolt'] }, { build: 'bulky', size: 2.0, eyeGlow: '#ff2a2a', skin: '#8a94a8', hair: 'bald', colors: { skin: '#8a94a8' } }],
    ['RP', 'Spare Part', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'gigavolt'] }]
  ]
});

team('crew', {
  name: 'Kernel Field Grounds Crew', nick: 'CREW', abbr: 'GRD', home: 'kernel', city: 'Kernel Falls', hidden: true,
  uniform: { jersey: '#2a6a3a', pants: '#e8d8b0', trim: '#f2c230', cap: '#2a6a3a', helmet: '#2a6a3a', socks: '#2a6a3a', dark: '#1a3a1a', bat: '#b08050' },
  colors: ['#2a6a3a', '#f2c230'], mascot: { name: 'Rakey', R: 7, colors: { dk: '#3a5a1a', base: '#7ab040', lt: '#b0e070', spec: '#ffffff', eye: '#1a1a1a', pupil: '#000' }, feet: true },
  superPitch: 'cornpopper', zooka: 'RAKEZOOKA', zookaColors: ['#7ab040', '#d0ff90', '#ffffff'], voice: 'crowdguy', stars: [2, 3, 2],
  prof: { pow: 4, con: 5, spd: 5, arm: 5, glv: 5 },
  list: [['CF', 'Rusty Rake', 'R/R'], ['SS', 'Mo Mower', 'R/R'], ['1B', 'Chalky Chen', 'L/L'], ['3B', 'Tarp Tavares', 'R/R'], ['RF', 'Hose Hopkins', 'R/R'], ['LF', 'Sod Sullivan', 'L/L'], ['2B', 'Dusty Dale', 'R/R'], ['C', 'Bucket Barnes', 'R/R'],
    ['P', 'Lefty Loam', 'L/L', { vel: 4, ctl: 7, brk: 4, sta: 8, pitches: ['heater', 'curve', 'changeup', 'knuckler'] }], ['RP', 'Spigot Smith', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'knuckler'] }]]
});

/* ---- non-players: the announcers, the umpire, the villain (for portraits and cutscenes) ---- */
BZ.CAST = {
  hap: { name: 'HAP HARRIGAN', voice: 'hap', look: { build: 'heroic', hair: 'short', skin: '#f1c7a0', hairColor: '#7a4a2a', size: 1.25, hatOverride: { style: 'band', color: '#2a2a3a' } }, uniform: { jersey: '#7a2a2a', pants: '#3a3a4a', trim: '#e8c870' } },
  lou: { name: 'BIG LOU BOMBECK', voice: 'lou', look: { build: 'bulky', hair: 'bald', skin: '#c68a5a', hairColor: '#1a1a1a', size: 1.32 }, uniform: { jersey: '#2a4a8a', pants: '#3a3a4a', trim: '#f2c230' } },
  gloria: { name: 'GLORIA VOX', voice: 'gloria', look: { build: 'heroic', hair: 'long', skin: '#e0a878', hairColor: '#c83a6a', size: 1.24 }, uniform: { jersey: '#8a3aa8', pants: '#3a2a4a', trim: '#f0f0f0' } },
  barb: { name: 'UMPIRE BARB', voice: 'barb', look: { build: 'bulky', hair: 'short', skin: '#c8906a', hairColor: '#3a2a20', size: 1.28, outfit: 'coat', hatOverride: { style: 'cap', color: '#1a2238' } }, uniform: { jersey: '#1a2238', pants: '#5a6070', trim: '#1a2238' } },
  mortimer: { name: 'MORTIMER MEGAMAX', voice: 'mortimer', look: { build: 'heroic', hair: 'short', skin: '#f4d2b4', hairColor: '#8a8a8a', size: 1.28, outfit: 'coat', hatOverride: { style: 'tophat', color: '#1a1a24', band: '#e8c040' } }, uniform: { jersey: '#2a2a34', pants: '#2a2a34', trim: '#e8c040' } },
  ike: { player: 'comets-grandpa-ike-kowalski' }, dot: { player: 'comets-dot-dynamite-delgado' }
};
BZ.castRig = (id) => {
  const c = BZ.CAST[id]; if (!c) return null;
  if (c.player) return BZ.rigFor(BZ.get('players', c.player), 'bench');
  const key = 'cast:' + id;
  let rg = BZ.rigCache.get(key);
  if (!rg) { rg = BZ.makeRig({ id: key, look: c.look }, { uniform: c.uniform }, 'bench'); BZ.rigCache.set(key, rg); }
  return rg;
};
BZ.voiceOf = (who) => {
  if (BZ.CAST[who] && BZ.CAST[who].voice) return BZ.CAST[who].voice;
  if (BZ.CAST[who] && BZ.CAST[who].player) { const p = BZ.get('players', BZ.CAST[who].player); return p && p.voice || 'hap'; }
  const p = BZ.get('players', who); if (p) return p.voice || (BZ.get('teams', p.team) || {}).voice || 'crowdguy';
  return 'hap';
};
BZ.nameOf = (who) => {
  if (BZ.CAST[who] && BZ.CAST[who].name) return BZ.CAST[who].name;
  if (BZ.CAST[who] && BZ.CAST[who].player) { const p = BZ.get('players', BZ.CAST[who].player); return p.name.toUpperCase(); }
  const p = BZ.get('players', who); if (p) return p.name.toUpperCase();
  return String(who).toUpperCase();
};
BZ.portraitRig = (who) => BZ.CAST[who] ? BZ.castRig(who) : (BZ.get('players', who) ? BZ.rigFor(BZ.get('players', who), 'bench') : null);
