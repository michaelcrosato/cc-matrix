// ---- content: episodes, their 3x3 maps, every room (waves as data), the Lightning Round ----
// A new room is one entry in MT.ROOMS; a new episode is one entry in MT.EPISODES. Wave format (16-waves.js):
// { at, left, spawn: [[door, kind, n, gap]], items: [[pickup, where]], script }; doors N E S W all sides ends audience drop [cx, cy]
const w = (at, left, spawn, items, extra) => Object.assign({ at, left, spawn }, items ? { items } : {}, extra || {});
const ROOMS = MT.ROOMS = {
  // ------------------------------------------------------------------ EPISODE 1: THE PILOT (Studio 9)
  '1-1': { name: 'OPENING NUMBER', ep: 1, type: 'start', cell: [1, 2], exits: { W: '1-2', N: '1-5', E: '1-3' }, par: 70, tutorial: true, intros: ['goon', 'clapbot', 'popper'],
    waves: [w(2, undefined, [['N', 'goon', 6, .35], ['S', 'goon', 6, .35]]), w(10, 2, [['E', 'goon', 8], ['W', 'goon', 8]]), w(8, 4, [['all', 'goon', 3]], [['spread', 'center']]), w(8, 4, [['N', 'clapbot', 6], ['S', 'clapbot', 6]]), w(9, 3, [['all', 'goon', 5], ['N', 'popper', 2]])] },
  '1-2': { name: 'MIME FIELD', ep: 1, type: 'battle', cell: [0, 2], exits: { N: '1-4' }, par: 60, key: { rule: 'mimes' },
    place: [[3, 3], [7, 2], [13, 2], [17, 3], [5, 6], [15, 6], [3, 9], [7, 10], [13, 10], [17, 9]].map(([x, y]) => ['mime', x, y]),
    waves: [w(2, undefined, [['S', 'goon', 8]]), w(8, 3, [['N', 'popper', 2], ['E', 'goon', 8]]), w(10, 3, [['W', 'goon', 10]], [['rockets', 'drop']]), w(8, 4, [['all', 'clapbot', 3]]), w(8, 3, [['N', 'popper', 3], ['S', 'popper', 3], ['E', 'goon', 6]]), w(9, 3, [['E', 'goon', 8], ['W', 'clapbot', 6]])] },
  '1-3': { name: 'CLAP TRAP', ep: 1, type: 'battle', cell: [2, 2], exits: { N: '1-6' }, par: 65,
    waves: [w(2, undefined, [['E', 'clapbot', 8], ['W', 'clapbot', 8]]), w(8, 3, [['N', 'goon', 12]]), w(8, 4, [['all', 'clapbot', 5]], [['records', 'drop']]), w(8, 4, [['S', 'popper', 4], ['E', 'goon', 8]]), w(8, 3, [['all', 'clapbot', 6], ['N', 'goon', 6]])] },
  '1-4': { name: 'KEY GAUNTLET', ep: 1, type: 'key', cell: [0, 1], exits: { E: '1-5' }, par: 50, key: { rule: 'survive' },
    survive: { time: 40, cage: 20, last: [['all', 'goon', 4]] }, items: [[6, 'shield', 'drop'], [18, 'bomb', 'drop'], [28, 'life', 'drop']] },
  '1-5': { name: 'WEAPONS LOCKER', ep: 1, type: 'armory', cell: [1, 1], exits: { N: '1-B' }, par: 80, items: [[1.5, 'spread', [5, 6]], [1.5, 'rockets', [15, 6]], [1.5, 'records', [10, 3]]],
    waves: [w(3, undefined, [['all', 'goon', 8]]), w(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), w(8, 5, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]), w(8, 5, [['all', 'goon', 8]], [['speed', 'drop']]), w(10, 4, [['N', 'goon', 12], ['S', 'goon', 12], ['sides', 'popper', 2]])] },
  '1-6': { name: 'CASH COW CORRAL', ep: 1, type: 'cash', cell: [2, 1], exits: { W: '1-5' }, par: 60, key: { rule: 'crate' }, cashRoom: true, crates: [[4, 3], [10, 2], [16, 3], [4, 9], [10, 10], [16, 9]],
    waves: [w(2, undefined, [['N', 'goon', 10]]), w(8, 3, [['E', 'goon', 10], ['W', 'goon', 10]]), w(8, 4, [['all', 'clapbot', 4]]), w(8, 4, [['S', 'popper', 3], ['N', 'popper', 3], ['all', 'goon', 3]]), w(9, 2, [['all', 'goon', 5], ['ends', 'popper', 2]])] },
  '1-B': { name: "MASHY'S BIG DEBUT", ep: 1, type: 'boss', cell: [1, 0], exits: {}, boss: 'mashy' },
  // ------------------------------------------------------------------ EPISODE 2: SWEEPS WEEK (the MegaMart Prize Warehouse)
  '2-1': { name: 'AISLE 9 RUMBLE', ep: 2, type: 'start', cell: [1, 2], exits: { W: '2-2', N: '2-5', E: '2-3' }, par: 70, intros: ['disco'],
    waves: [w(2, undefined, [['N', 'goon', 10], ['S', 'goon', 10]]), w(8, 4, [['E', 'disco', 1], ['W', 'disco', 1]]), w(10, 3, [['all', 'goon', 6]], [['popcorn', 'center']]), w(8, 4, [['N', 'popper', 3], ['S', 'clapbot', 10]]), w(8, 4, [['E', 'disco', 2], ['W', 'goon', 12]])] },
  '2-2': { name: 'CONVEYOR CHAOS', ep: 2, type: 'hazard', cell: [0, 2], exits: { N: '2-4' }, par: 65, key: { rule: 'belt', at: [19, 5] }, hazards: [{ kind: 'conveyor', rows: [[2, 3], [5, 6], [9, 10]], dirs: [1, -1, 1] }],
    waves: [w(2, undefined, [['E', 'goon', 12]]), w(8, 4, [['W', 'clapbot', 10]]), w(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), w(8, 4, [['all', 'goon', 8]], [['laser', 'drop']]), w(8, 3, [['E', 'disco', 2], ['W', 'disco', 1]])] },
  '2-3': { name: 'DISCO DEPOT', ep: 2, type: 'battle', cell: [2, 2], exits: { N: '2-6' }, par: 70,
    waves: [w(2, undefined, [['N', 'discoBig', 2]]), w(10, 2, [['E', 'goon', 10], ['W', 'goon', 10]]), w(8, 4, [['S', 'disco', 2]], [['laser', 'drop']]), w(8, 4, [['all', 'clapbot', 5]]), w(9, 3, [['N', 'discoBig', 2], ['S', 'goon', 8]])] },
  '2-4': { name: 'TOMATO TERRITORY', ep: 2, type: 'battle', cell: [0, 1], exits: { E: '2-5' }, par: 70, key: { rule: 'carrier' }, intros: ['heckler'],
    waves: [w(2, undefined, [['audience', 'heckler', 4]]), w(8, 2, [['N', 'goon', 12]]), w(8, 4, [['audience', 'heckler', 6]]), w(8, 4, [['S', 'popper', 4], ['E', 'clapbot', 8]]), w(8, 3, [['audience', 'hecklerKing', 1], ['audience', 'heckler', 3]], [['life', 'drop']])] },
  '2-5': { name: 'TANK YARD', ep: 2, type: 'armory', cell: [1, 1], exits: { N: '2-B' }, par: 80, intros: ['tank'], items: [[1.5, 'popcorn', [5, 6]], [1.5, 'rockets', [15, 6]]],
    waves: [w(2, undefined, [['N', 'tank', 1]]), w(10, 1, [['all', 'goon', 8]]), w(8, 4, [['E', 'tank', 1], ['W', 'tank', 1]]), w(10, 2, [['S', 'popper', 4], ['N', 'clapbot', 10]], [['shield', 'drop']]), w(9, 3, [['N', 'tank', 2], ['all', 'goon', 6]])] },
  '2-6': { name: 'BLOWOUT SALE', ep: 2, type: 'cash', cell: [2, 1], exits: { W: '2-5' }, par: 65, key: { rule: 'crate' }, cashRoom: true, crates: [[3, 2], [9, 2], [11, 2], [17, 2], [3, 10], [9, 10], [11, 10], [17, 10]],
    waves: [w(2, undefined, [['all', 'goon', 8]]), w(8, 4, [['audience', 'heckler', 4]]), w(8, 3, [['E', 'disco', 1], ['W', 'disco', 1]]), w(8, 3, [['all', 'clapbot', 5]]), w(8, 3, [['N', 'tank', 1], ['S', 'goon', 10]])] },
  '2-B': { name: 'THE BIG SPIN', ep: 2, type: 'boss', cell: [1, 0], exits: {}, boss: 'wheel' },
  // ------------------------------------------------------------------ EPISODE 3: THE SEASON FINALE (the Rooftop Gala)
  '3-1': { name: 'RED CARPET RIOT', ep: 3, type: 'start', cell: [1, 2], exits: { W: '3-2', N: '3-5', E: '3-3' }, par: 75, intros: ['brute'],
    waves: [w(2, undefined, [['all', 'goon', 8]]), w(8, 4, [['audience', 'heckler', 4], ['N', 'disco', 1]]), w(8, 3, [['E', 'tank', 1], ['W', 'popper', 4]]), w(9, 3, [['N', 'brute', 1]]), w(10, 2, [['all', 'clapbot', 6], ['S', 'goon', 8]])] },
  '3-2': { name: 'PYRO PIT', ep: 3, type: 'hazard', cell: [0, 2], exits: { N: '3-4' }, par: 70, key: { rule: 'final' }, hazards: [{ kind: 'pyro', cxs: [4, 8, 12, 16], cys: [3, 6, 9] }],
    waves: [w(2, undefined, [['N', 'goon', 12]]), w(8, 4, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]), w(8, 4, [['S', 'popper', 4]], [['records', 'drop']]), w(8, 3, [['audience', 'heckler', 4]]), w(8, 3, [['all', 'goon', 4]], null, { script: 'finaleBurst' })] },
  '3-3': { name: 'CABLE TANGLE', ep: 3, type: 'battle', cell: [2, 2], exits: { N: '3-6' }, par: 75, intros: ['snake'],
    waves: [w(2, undefined, [['N', 'snake', 1]]), w(8, undefined, [['all', 'goon', 6]]), w(10, 4, [['E', 'snake', 1], ['W', 'snake', 1]]), w(10, 3, [['S', 'popper', 4]], [['laser', 'drop']]), w(10, 2, [['N', 'snake', 2], ['all', 'clapbot', 3]])] },
  '3-4': { name: 'PENTHOUSE VAULT', ep: 3, type: 'key', cell: [0, 1], exits: { E: '3-5' }, par: 80, key: { rule: 'vault' }, locks: [[1, 0], [3, 0], [5, 0], [7, 0]], props: [['mt:safe', 72, 10]],
    waves: [w(2, undefined, [['all', 'goon', 8]]), w(8, 4, [['audience', 'heckler', 4]]), w(8, 3, [['E', 'tank', 1]]), w(8, 3, [['all', 'clapbot', 5]]), w(8, 3, [['N', 'brute', 1]])] },
  '3-5': { name: 'THE AFTER-PARTY', ep: 3, type: 'armory', cell: [1, 1], exits: { N: '3-B' }, par: 85, items: [[1.5, 'laser', [5, 6]], [1.5, 'popcorn', [15, 6]], [1.5, 'shield', [10, 10]]],
    waves: [w(2, undefined, [['N', 'snake', 1], ['S', 'goon', 10]]), w(8, 3, [['E', 'discoBig', 1], ['W', 'tank', 1]]), w(8, 3, [['audience', 'heckler', 6]]), w(9, 3, [['N', 'brute', 1], ['all', 'clapbot', 4]]), w(9, 3, [['all', 'goon', 10], ['N', 'popper', 4]])] },
  '3-6': { name: 'MASCOT MAYHEM', ep: 3, type: 'battle', cell: [2, 1], exits: { W: '3-5' }, par: 80, key: { rule: 'carrier' },
    waves: [w(2, undefined, [['N', 'brute', 1]]), w(10, 1, [['all', 'goon', 8]]), w(8, 3, [['E', 'brute', 1], ['W', 'popper', 4]]), w(8, 3, [['S', 'snake', 1]], [['rockets', 'drop']]), w(10, 2, [['N', 'brute', 2, .8, { keyOn: 1 }]])] },
  '3-B': { name: 'LANCE LUSTRE LIVE!', ep: 3, type: 'boss', cell: [1, 0], exits: {}, boss: 'finale' },
  // ------------------------------------------------------------------ the bonus
  'GR': { name: 'THE GREEN ROOM', ep: 3, type: 'bonus', set: 'greenroom', cell: [1, 0], exits: {} },
};
// the Lightning Round (AI Hub sessions): three rooms and Mashy, one exit each, signed NEXT
const LR = [['L1', '1-1', 'L2'], ['L2', '1-2', 'L3'], ['L3', '2-3', 'LB']];
for (const [id, from, next] of LR) ROOMS[id] = Object.assign({}, ROOMS[from], { id, exits: { N: next }, lightning: true, tutorial: false, intros: [], ep: ROOMS[from].ep, set: ROOMS[from].ep === 2 ? 'warehouse' : 'studio' });
ROOMS.LB = Object.assign({}, ROOMS['1-B'], { id: 'LB', lightning: true, set: 'studio' });
for (const id in ROOMS) { ROOMS[id].id = id; if (!ROOMS[id].set) ROOMS[id].set = ROOMS[id].ep === 1 ? 'studio' : ROOMS[id].ep === 2 ? 'warehouse' : 'rooftop'; }
const EPISODES = MT.EPISODES = {
  1: { id: 1, title: 'THE PILOT', place: 'STUDIO 9, NEO-BURBANK', set: 'studio', song: 'studioBattle', stunt: [['clapbot', 12]], start: '1-1', boss: '1-B', rooms: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B'] },
  2: { id: 2, title: 'SWEEPS WEEK', place: 'THE MEGAMART PRIZE WAREHOUSE', set: 'warehouse', song: 'warehouseFunk', stunt: [['tank', 1]], start: '2-1', boss: '2-B', rooms: ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B'] },
  3: { id: 3, title: 'THE SEASON FINALE', place: 'THE ROOFTOP GALA', set: 'rooftop', song: 'finaleOverture', stunt: [['brute', 1]], start: '3-1', boss: '3-B', rooms: ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B'] },
};
MT.roomIcon = room => ({ start: 'start', battle: 'battle', cash: 'cash', armory: 'armory', hazard: 'hazard', key: 'key', boss: 'boss', bonus: 'bonus' })[room.type] || 'battle';
/** the door a room is entered from, given the door the last room was left by */
MT.entryFor = (exitDoor) => exitDoor ? DOORS[exitDoor].opp : 'S';
/** the next prize from the episode's table: shuffled with the run's seed, no repeats until it runs out */
MT.nextPrize = world => {
  const run = world.run, ep = (world.room && world.room.ep) || 1, T = MT.TEXT.prizes[ep] || MT.TEXT.prizes[1];
  run.prizeBag = run.prizeBag || {};
  if (!run.prizeBag[ep] || !run.prizeBag[ep].length) run.prizeBag[ep] = rshuffle(RNG.prize, T.map((_, i) => i));
  return T[run.prizeBag[ep].shift()];
};
