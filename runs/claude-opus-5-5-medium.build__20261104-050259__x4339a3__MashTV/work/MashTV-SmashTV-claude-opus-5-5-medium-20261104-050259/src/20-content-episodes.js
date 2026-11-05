// ---------------------------------------------------------------- content: episodes, maps and rooms as data (a new room is one entry)
// Wave notation: { left, at, spawn: [[door, kind, n, gap]], items: [[pickup, where]] }; door: N E S W all sides ends audience drop [cx, cy]
const W_ = (at, left, spawn, items, extra) => Object.assign({ at, left, spawn, items }, extra || {});
MT.ROOMS = {};
const room = (o) => { MT.ROOMS[o.id] = o; return o; };
// ---------------- EPISODE 1: THE PILOT
room({ id: '1-1', name: 'OPENING NUMBER', ep: 1, type: 'start', cell: [1, 2], exits: { W: '1-2', N: '1-5', E: '1-3' }, par: 70, tutorial: true,
  waves: [W_(2, undefined, [['N', 'goon', 6, .35], ['S', 'goon', 6, .35]]), W_(10, 2, [['E', 'goon', 8], ['W', 'goon', 8]]),
    W_(8, 4, [['all', 'goon', 3]], [['spread', 'center']]), W_(8, 4, [['N', 'clapbot', 6], ['S', 'clapbot', 6]]), W_(8, 5, [['all', 'goon', 5], ['N', 'popper', 2]])] });
room({ id: '1-2', name: 'MIME FIELD', ep: 1, type: 'battle', cell: [0, 2], exits: { N: '1-4' }, par: 60, key: { rule: 'mimes' },
  place: [[3, 3], [7, 2], [13, 2], [17, 3], [5, 6], [15, 6], [3, 9], [7, 10], [13, 10], [17, 9]].map(([x, y]) => ['mime', x, y]),
  waves: [W_(2, undefined, [['S', 'goon', 8]]), W_(8, 3, [['N', 'popper', 2], ['E', 'goon', 8]]), W_(10, 3, [['W', 'goon', 10]], [['rockets', 'drop']]),
    W_(8, 4, [['all', 'clapbot', 3]]), W_(8, 3, [['N', 'popper', 3], ['S', 'popper', 3], ['E', 'goon', 6]])] });
room({ id: '1-3', name: 'CLAP TRAP', ep: 1, type: 'battle', cell: [2, 2], exits: { N: '1-6' }, par: 65,
  waves: [W_(2, undefined, [['E', 'clapbot', 8], ['W', 'clapbot', 8]]), W_(8, 3, [['N', 'goon', 12]]), W_(8, 4, [['all', 'clapbot', 5]], [['records', 'drop']]),
    W_(8, 4, [['S', 'popper', 4], ['E', 'goon', 8]]), W_(8, 3, [['all', 'clapbot', 6], ['N', 'goon', 6]])] });
room({ id: '1-4', name: 'KEY GAUNTLET', ep: 1, type: 'key', cell: [0, 1], exits: { E: '1-5' }, par: 50, key: { rule: 'survive' },
  survive: { dur: 35, cageAt: 20, streams: [[1.2, 'each', 'goon', 1], [4, 'random', 'clapbot', 2], [7, 'random', 'popper', 1]], final: [['all', 'goon', 4]] },
  items: [[6, 'shield', 'drop'], [18, 'bomb', 'drop'], [28, 'life', 'drop']] });
room({ id: '1-5', name: 'WEAPONS LOCKER', ep: 1, type: 'armory', cell: [1, 1], exits: { N: '1-B' }, par: 80,
  items: [[1.5, 'spread', [5, 6]], [1.5, 'rockets', [15, 6]], [1.5, 'records', [10, 3]]], pedestals: [[5, 6], [15, 6], [10, 3]],
  waves: [W_(3, undefined, [['all', 'goon', 8]]), W_(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), W_(8, 5, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]),
    W_(8, 5, [['all', 'goon', 8]], [['speed', 'drop']]), W_(10, 4, [['N', 'goon', 12], ['S', 'goon', 12], ['sides', 'popper', 2]])] });
room({ id: '1-6', name: 'CASH COW CORRAL', ep: 1, type: 'cash', cell: [2, 1], exits: { W: '1-5' }, par: 60, key: { rule: 'crate' }, cashMul: 1.5, dropBoost: 2,
  place: [[4, 3], [10, 2], [16, 3], [4, 9], [10, 10], [16, 9]].map(([x, y]) => ['crate', x, y]),
  waves: [W_(2, undefined, [['N', 'goon', 10]]), W_(8, 3, [['E', 'goon', 10], ['W', 'goon', 10]]), W_(8, 4, [['all', 'clapbot', 4]]), W_(8, 4, [['S', 'popper', 3], ['N', 'popper', 3], ['all', 'goon', 3]])] });
room({ id: '1-B', name: "MASHY'S BIG DEBUT", ep: 1, type: 'boss', cell: [1, 0], boss: 'mashy', par: 120 });
// ---------------- EPISODE 2: SWEEPS WEEK
room({ id: '2-1', name: 'AISLE 9 RUMBLE', ep: 2, type: 'start', cell: [1, 2], exits: { W: '2-2', N: '2-5', E: '2-3' }, par: 70,
  waves: [W_(2, undefined, [['N', 'goon', 10], ['S', 'goon', 10]]), W_(8, 4, [['E', 'disco', 1], ['W', 'disco', 1]]), W_(10, 3, [['all', 'goon', 6]], [['popcorn', 'center']]),
    W_(8, 4, [['N', 'popper', 3], ['S', 'clapbot', 10]]), W_(8, 4, [['E', 'disco', 2], ['W', 'goon', 12]])] });
room({ id: '2-2', name: 'CONVEYOR CHAOS', ep: 2, type: 'hazard', cell: [0, 2], exits: { N: '2-4' }, par: 65, key: { rule: 'belt', at: [19, 5] },
  hazards: [{ kind: 'conveyor', rows: [2, 5, 9], dirs: [1, -1, 1] }],
  waves: [W_(2, undefined, [['E', 'goon', 12]]), W_(8, 4, [['W', 'clapbot', 10]]), W_(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), W_(8, 4, [['all', 'goon', 8]], [['laser', 'drop']]), W_(8, 3, [['E', 'disco', 2], ['W', 'disco', 1]])] });
room({ id: '2-3', name: 'DISCO DEPOT', ep: 2, type: 'battle', cell: [2, 2], exits: { N: '2-6' }, par: 70,
  waves: [W_(2, undefined, [['N', 'discoBig', 2]]), W_(10, 2, [['E', 'goon', 10], ['W', 'goon', 10]]), W_(8, 4, [['S', 'disco', 2]], [['laser', 'drop']]), W_(8, 4, [['all', 'clapbot', 5]]), W_(9, 3, [['N', 'discoBig', 2], ['S', 'goon', 8]])] });
room({ id: '2-4', name: 'TOMATO TERRITORY', ep: 2, type: 'battle', cell: [0, 1], exits: { E: '2-5' }, par: 70, key: { rule: 'carrier', kind: 'hecklerKing' },
  waves: [W_(2, undefined, [['audience', 'heckler', 4]]), W_(8, 2, [['N', 'goon', 12]]), W_(8, 4, [['audience', 'heckler', 6]]), W_(8, 4, [['S', 'popper', 4], ['E', 'clapbot', 8]]),
    W_(8, 3, [['audience', 'hecklerKing', 1], ['audience', 'heckler', 3]], [['life', 'drop']])] });
room({ id: '2-5', name: 'TANK YARD', ep: 2, type: 'armory', cell: [1, 1], exits: { N: '2-B' }, par: 80,
  items: [[1.5, 'popcorn', [5, 6]], [1.5, 'rockets', [15, 6]]], pedestals: [[5, 6], [15, 6]],
  waves: [W_(2, undefined, [['N', 'tank', 1]]), W_(10, 1, [['all', 'goon', 8]]), W_(8, 4, [['E', 'tank', 1], ['W', 'tank', 1]]), W_(10, 2, [['S', 'popper', 4], ['N', 'clapbot', 10]], [['shield', 'drop']]), W_(9, 3, [['N', 'tank', 2], ['all', 'goon', 6]])] });
room({ id: '2-6', name: 'BLOWOUT SALE', ep: 2, type: 'cash', cell: [2, 1], exits: { W: '2-5' }, par: 65, key: { rule: 'crate' }, cashMul: 1.5, dropBoost: 2,
  place: [[3, 2], [9, 2], [11, 2], [17, 2], [3, 10], [9, 10], [11, 10], [17, 10]].map(([x, y]) => ['crate', x, y]),
  waves: [W_(2, undefined, [['all', 'goon', 8]]), W_(8, 4, [['audience', 'heckler', 4]]), W_(8, 3, [['E', 'disco', 1], ['W', 'disco', 1]]), W_(8, 3, [['all', 'clapbot', 5]]), W_(8, 3, [['N', 'tank', 1], ['S', 'goon', 10]])] });
room({ id: '2-B', name: 'THE BIG SPIN', ep: 2, type: 'boss', cell: [1, 0], boss: 'wheel', par: 150 });
// ---------------- EPISODE 3: THE SEASON FINALE
room({ id: '3-1', name: 'RED CARPET RIOT', ep: 3, type: 'start', cell: [1, 2], exits: { W: '3-2', N: '3-5', E: '3-3' }, par: 75,
  waves: [W_(2, undefined, [['all', 'goon', 8]]), W_(8, 4, [['audience', 'heckler', 4], ['N', 'disco', 1]]), W_(8, 3, [['E', 'tank', 1], ['W', 'popper', 4]]), W_(9, 3, [['N', 'brute', 1]]), W_(10, 2, [['all', 'clapbot', 6], ['S', 'goon', 8]])] });
room({ id: '3-2', name: 'PYRO PIT', ep: 3, type: 'hazard', cell: [0, 2], exits: { N: '3-4' }, par: 70, key: { rule: 'final' },
  hazards: [{ kind: 'vents', cx: [4, 8, 12, 16], cy: [3, 6, 9], patterns: ['rows', 'cols', 'checker', 'allButLane'], every: 3.5 }],
  waves: [W_(2, undefined, [['N', 'goon', 12]]), W_(8, 4, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]), W_(8, 4, [['S', 'popper', 4]], [['records', 'drop']]), W_(8, 3, [['audience', 'heckler', 4]]),
    W_(8, 3, [['all', 'goon', 4]], [], { script: 'finaleBurst' })] });
room({ id: '3-3', name: 'CABLE TANGLE', ep: 3, type: 'battle', cell: [2, 2], exits: { N: '3-6' }, par: 75,
  waves: [W_(2, undefined, [['N', 'snake', 1]]), W_(8, undefined, [['all', 'goon', 6]]), W_(10, 4, [['E', 'snake', 1], ['W', 'snake', 1]]), W_(10, 3, [['S', 'popper', 4]], [['laser', 'drop']]), W_(10, 2, [['N', 'snake', 2], ['all', 'clapbot', 3]])] });
room({ id: '3-4', name: 'PENTHOUSE VAULT', ep: 3, type: 'key', cell: [0, 1], exits: { E: '3-5' }, par: 80, key: { rule: 'vault' },
  waves: [W_(2, undefined, [['all', 'goon', 8]]), W_(8, 4, [['audience', 'heckler', 4]]), W_(8, 3, [['E', 'tank', 1]]), W_(8, 3, [['all', 'clapbot', 5]]), W_(8, 3, [['N', 'brute', 1]])] });
room({ id: '3-5', name: 'THE AFTER-PARTY', ep: 3, type: 'armory', cell: [1, 1], exits: { N: '3-B' }, par: 85,
  items: [[1.5, 'laser', [5, 6]], [1.5, 'popcorn', [15, 6]], [1.5, 'shield', [10, 10]]], pedestals: [[5, 6], [15, 6], [10, 10]],
  waves: [W_(2, undefined, [['N', 'snake', 1], ['S', 'goon', 10]]), W_(8, 3, [['E', 'discoBig', 1], ['W', 'tank', 1]]), W_(8, 3, [['audience', 'heckler', 6]]), W_(9, 3, [['N', 'brute', 1], ['all', 'clapbot', 4]]), W_(9, 3, [['all', 'goon', 10], ['N', 'popper', 4]])] });
room({ id: '3-6', name: 'MASCOT MAYHEM', ep: 3, type: 'battle', cell: [2, 1], exits: { W: '3-5' }, par: 80, key: { rule: 'carrier', kind: 'brute', nth: 2, wave: 4 },
  waves: [W_(2, undefined, [['N', 'brute', 1]]), W_(10, 1, [['all', 'goon', 8]]), W_(8, 3, [['E', 'brute', 1], ['W', 'popper', 4]]), W_(8, 3, [['S', 'snake', 1]], [['rockets', 'drop']]), W_(10, 2, [['N', 'brute', 2]])] });
room({ id: '3-B', name: 'LANCE LUSTRE LIVE!', ep: 3, type: 'boss', cell: [1, 0], boss: 'lance', par: 200 });
// ---------------- THE GREEN ROOM (bonus) and THE LIGHTNING ROUND (AI Hub sessions)
room({ id: 'GR', name: 'THE GREEN ROOM', ep: 4, type: 'bonus', set: 'greenroom', cell: [1, 0], bonus: { dur: 40 }, place: [[3, 3], [17, 3], [3, 9], [17, 9], [8, 6], [12, 6]].map(([x, y]) => ['paparazzi', x, y]) });
room(Object.assign({}, MT.ROOMS['1-1'], { id: 'L1', name: 'LIGHTNING: OPENING NUMBER', tutorial: false, exits: { N: 'L2' }, lightning: true }));
room(Object.assign({}, MT.ROOMS['1-2'], { id: 'L2', name: 'LIGHTNING: MIME FIELD', exits: { N: 'L3' }, lightning: true }));
room(Object.assign({}, MT.ROOMS['2-3'], { id: 'L3', name: 'LIGHTNING: DISCO DEPOT', ep: 1, set: 'studio', exits: { N: 'LB' }, lightning: true }));
room(Object.assign({}, MT.ROOMS['1-B'], { id: 'LB', name: 'LIGHTNING: MASHY', lightning: true }));

MT.EPISODES = {
  1: { n: 1, title: 'THE PILOT', setName: 'STUDIO 9', set: 'studio', song: 'studioBattle', stunt: ['clapbot', 12], start: '1-1', boss: '1-B',
    rooms: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B'] },
  2: { n: 2, title: 'SWEEPS WEEK', setName: 'THE MEGAMART PRIZE WAREHOUSE', set: 'warehouse', song: 'warehouseFunk', stunt: ['tank', 1], start: '2-1', boss: '2-B',
    rooms: ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B'] },
  3: { n: 3, title: 'THE SEASON FINALE', setName: 'THE ROOFTOP GALA', set: 'rooftop', song: 'finaleOverture', stunt: ['brute', 1], start: '3-1', boss: '3-B',
    rooms: ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B'] }
};
MT.LIGHTNING = ['L1', 'L2', 'L3', 'LB'];
MT.roomSet = (room) => room.set || (MT.EPISODES[room.ep] || MT.EPISODES[1]).set;
MT.roomKeyed = id => { const r = MT.ROOMS[id]; return !!(r && r.key); };

// ---------------- prizes, each with Penny's line; drawn from the episode's table, shuffled by the run's seed
MT.PRIZES = {
  1: [['A SELF-AWARE TOASTER', 2500, 'IT ALREADY RESENTS YOU!', ['toaster', '#c8d0e0', '#ff2e88']], ['A HOVER BLENDER', 3000, 'SMOOTHIES AT ANY ALTITUDE!', ['blender', '#2ee6ff', '#c8d0e0']],
    ['A LIFETIME SUPPLY OF CANNED LAUGHTER', 4000, 'NEVER LAUGH ALONE AGAIN!', ['box', '#ffcc33', '#c8202a']], ['A MOOD-RING THERMOSTAT', 1500, 'YOUR HOUSE KNOWS HOW YOU FEEL!', ['gem', '#9a7aff', '#2ee6ff']],
    ['A DRY-LAND JET SKI', 8000, "IT DOESN'T FLOAT, BUT IT LOOKS GREAT!", ['vehicle', '#2ee6ff', '#ff2e88']], ['A SLIGHTLY HAUNTED ROBO-BUTLER', 6000, 'THE GHOST DOES THE DISHES!', ['robot', '#c8d0e0', '#5a5a6a']]],
  2: [['A FRIDGE THAT JUDGES YOU', 5000, 'IT KNOWS ABOUT THE MIDNIGHT CAKE!', ['box', '#e8e8f0', '#2ee6ff']], ['MATCHING JETPACKS', 12000, 'SEATBELTS NOT INCLUDED!', ['robot', '#ff6a3a', '#ffcc33']],
    ['A 199-INCH MEGA-RAY TV', 9000, 'WATCH MASH TV LIFE-SIZED!', ['screen', '#3b82f6', '#3a3a48']], ['A SELF-FOLDING LAUNDRY CUBE', 3500, 'IT FOLDS YOU, TOO!', ['box', '#22c55e', '#ffffff']],
    ['A GOLD-PLATED REMOTE', 4500, 'CHANGE ANY CHANNEL BUT THIS ONE!', ['blender', '#ffcc33', '#3a3a48']], ['AN INFLATABLE SPORTS CAR', 7000, 'ZERO TO SIXTY IN ONE PUMP!', ['vehicle', '#c8202a', '#ffcc33']]],
  3: [['A TIMESHARE ON THE MOON', 25000, 'GETTING HOME IS EXTRA!', ['moon', '#ffe060', '#c8d0e0']], ['A PERSONAL WEATHER MACHINE', 15000, "RAIN ON EVERYONE'S PARADE!", ['robot', '#2ee6ff', '#3b82f6']],
    ['A DIAMOND TOOTHBRUSH', 8000, "FOR A SMILE LIKE LANCE'S!", ['gem', '#e8f8ff', '#9ad0ff']], ['A PET CLONING KIT', 10000, 'NOW YOU HAVE TWO PROBLEMS!', ['box', '#ff8ad8', '#22c55e']],
    ['A BOTTOMLESS CHAMPAGNE FLUTE', 6000, 'CHEERS, FOREVER!', ['blender', '#ffe060', '#ffffff']], ['A SPEEDBOAT NAMED LANCE', 20000, 'IT ALSO TALKS ABOUT ITSELF!', ['vehicle', '#ffffff', '#7a2a9a']]]
};
MT.PRIZES[4] = MT.PRIZES[3];
MT.nextPrize = (ep) => {
  const run = MT.run, k = Math.min(3, Math.max(1, ep || 1));
  run.prizeBags = run.prizeBags || {};
  if (!run.prizeBags[k] || !run.prizeBags[k].length) run.prizeBags[k] = MT.shuffle(MT.PRIZES[k].map((p, i) => i), 'prize');
  const p = MT.PRIZES[k][run.prizeBags[k].shift()];
  return { name: p[0], value: p[1], line: p[2], icon: p[3] };
};
// the attract mode's reels: a room or a scene, a setup, a duration and a caption
MT.REELS = [
  { kind: 'cold', dur: 7, cap: 'reel1' },
  { kind: 'room', room: '1-1', dur: 18, cap: 'reel2', weapon: 'spread', seed: 3 },
  { kind: 'room', room: '1-2', dur: 14, cap: 'reel3', weapon: 'rockets', forceKey: 10, seed: 4 },
  { kind: 'room', room: '1-B', dur: 16, cap: 'reel4', bossPhase: 'p2', seed: 5 },
  { kind: 'room', room: '2-2', dur: 16, cap: 'reel5', weapon: 'popcorn', weapon2: 'laser', prime: 3, seed: 6 },
  { kind: 'room', room: '2-B', dur: 16, cap: 'reel6', forceSegs: [6, 0], seed: 7 },
  { kind: 'room', room: '3-6', dur: 16, cap: 'reel7', addon: 'records', addon2: 'shield', boat: true, bomb: 6, seed: 8 },
  { kind: 'room', room: '3-B', dur: 16, cap: 'reel8', lanceMic: true, network: 8, seed: 9 },
  { kind: 'recap', dur: 8, cap: 'reel9' },
  { kind: 'scores', dur: 6, cap: null }
];
