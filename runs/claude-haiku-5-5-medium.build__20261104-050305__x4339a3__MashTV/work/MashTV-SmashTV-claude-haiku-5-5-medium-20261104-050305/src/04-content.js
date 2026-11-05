/* MASH TV — 04-content: the episodes, their maps, their rooms (§7), the prize tables (§7.6), the sponsors and every line of
 * text (§8). Rooms are data: the §5.7 format. A wave is { at, left, spawn: [[door, kind, n, gap]], items: [[kind, where]] }. */

const WV = (at, left, spawn, items) => ({ at, left: left === null ? undefined : left, spawn, items: items || [] });
// a room: id, name, episode, type (start | battle | hazard | key | armory | cash | boss | bonus), set, cell on the map, exits, par, key rule
const RM = (o) => Object.assign({ place: [], items: [], hazards: [], waves: [], crates: [], locks: [], par: 70, exits: {}, set: 'studio' }, o);

MT.EPISODES = [
  { id: 1, title: 'THE PILOT', set: 'studio', song: 'studioBattle', stunt: { kind: 'clapbot', n: 12, label: '12 CLAPBOTS' }, boss: 'mashy',
    intro: 'OUR VERY FIRST EPISODE! TRY NOT TO MAKE IT YOUR LAST!', subtitle: 'LIVE FROM STUDIO 9',
    prizes: [['A SELF-AWARE TOASTER', 2500, 'IT ALREADY RESENTS YOU!'], ['A HOVER BLENDER', 3000, 'SMOOTHIES AT ANY ALTITUDE!'],
      ['A LIFETIME SUPPLY OF CANNED LAUGHTER', 4000, 'NEVER LAUGH ALONE AGAIN!'], ['A MOOD-RING THERMOSTAT', 1500, 'YOUR HOUSE KNOWS HOW YOU FEEL!'],
      ['A DRY-LAND JET SKI', 8000, 'IT DOESN\'T FLOAT, BUT IT LOOKS GREAT!'], ['A SLIGHTLY HAUNTED ROBO-BUTLER', 6000, 'THE GHOST DOES THE DISHES!']],
    map: { '1-1': [1, 1], '1-2': [0, 1], '1-3': [2, 1], '1-4': [0, 0], '1-5': [1, 0], '1-6': [2, 0], '1-B': [1, -1] } },
  { id: 2, title: 'SWEEPS WEEK', set: 'warehouse', song: 'warehouseFunk', stunt: { kind: 'tank', n: 1, label: 'A DOLLY TANK' }, boss: 'wheel',
    intro: 'IT\'S SWEEPS WEEK! THE NETWORK SAYS: MORE EXPLOSIONS, FEWER SURVIVORS!', subtitle: 'LIVE FROM THE MEGAMART PRIZE WAREHOUSE!',
    prizes: [['A FRIDGE THAT JUDGES YOU', 5000, 'IT KNOWS ABOUT THE MIDNIGHT CAKE!'], ['MATCHING JETPACKS', 12000, 'SEATBELTS NOT INCLUDED!'],
      ['A 199-INCH MEGA-RAY TV', 9000, 'WATCH MASH TV LIFE-SIZED!'], ['A SELF-FOLDING LAUNDRY CUBE', 3500, 'IT FOLDS YOU, TOO!'],
      ['A GOLD-PLATED REMOTE', 4500, 'CHANGE ANY CHANNEL BUT THIS ONE!'], ['AN INFLATABLE SPORTS CAR', 7000, 'ZERO TO SIXTY IN ONE PUMP!']],
    map: { '2-1': [1, 1], '2-2': [0, 1], '2-3': [2, 1], '2-4': [0, 0], '2-5': [1, 0], '2-6': [2, 0], '2-B': [1, -1] } },
  { id: 3, title: 'THE SEASON FINALE', set: 'rooftop', song: 'finaleOverture', stunt: { kind: 'brute', n: 1, label: 'A MASCOT BRUTE' }, boss: 'lance',
    intro: 'THE SEASON FINALE, LIVE FROM THE ROOFTOP GALA! FIREWORKS! CHAMPAGNE! FUNERALS!', subtitle: 'LIVE FROM THE ROOFTOP GALA',
    prizes: [['A TIMESHARE ON THE MOON', 25000, 'GETTING HOME IS EXTRA!'], ['A PERSONAL WEATHER MACHINE', 15000, 'RAIN ON EVERYONE\'S PARADE!'],
      ['A DIAMOND TOOTHBRUSH', 8000, 'FOR A SMILE LIKE LANCE\'S!'], ['A PET CLONING KIT', 10000, 'NOW YOU HAVE TWO PROBLEMS!'],
      ['A BOTTOMLESS CHAMPAGNE FLUTE', 6000, 'CHEERS, FOREVER!'], ['A SPEEDBOAT NAMED LANCE', 20000, 'IT ALSO TALKS ABOUT ITSELF!']],
    map: { '3-1': [1, 1], '3-2': [0, 1], '3-3': [2, 1], '3-4': [0, 0], '3-5': [1, 0], '3-6': [2, 0], '3-B': [1, -1] } }
];
MT.LIFE_MARKS = [250000, 750000, 1500000, 3000000];
MT.GREEN_PRIZE = ['THE NETWORK (YES, ALL OF IT)', 100000, 'YOU OWN THE SHOW NOW!'];

MT.ROOMS = {
  /* ===================== EPISODE 1: THE PILOT (Studio 9) ===================== */
  '1-1': RM({ id: '1-1', name: 'OPENING NUMBER', ep: 1, type: 'start', cell: [1, 2], exits: { W: '1-2', N: '1-5', E: '1-3' }, par: 70, tutorial: true,
    waves: [WV(2, null, [['N', 'goon', 6, .35], ['S', 'goon', 6, .35]]), WV(10, 2, [['E', 'goon', 8], ['W', 'goon', 8]]),
      WV(8, 4, [['all', 'goon', 3]], [['spread', 'center']]), WV(8, 4, [['N', 'clapbot', 6], ['S', 'clapbot', 6]]), WV(8, 5, [['all', 'goon', 5], ['N', 'popper', 2]])] }),
  '1-2': RM({ id: '1-2', name: 'MIME FIELD', ep: 1, type: 'battle', cell: [0, 2], exits: { N: '1-4' }, par: 60, key: 'mimes',
    place: [['mime', 3, 3], ['mime', 7, 2], ['mime', 13, 2], ['mime', 17, 3], ['mime', 5, 6], ['mime', 15, 6], ['mime', 3, 9], ['mime', 7, 10], ['mime', 13, 10], ['mime', 17, 9]],
    waves: [WV(2, null, [['S', 'goon', 8]]), WV(8, 3, [['N', 'popper', 2], ['E', 'goon', 8]]), WV(10, 3, [['W', 'goon', 10]], [['rockets', 'drop']]),
      WV(8, 4, [['all', 'clapbot', 3]]), WV(8, 3, [['N', 'popper', 3], ['S', 'popper', 3], ['E', 'goon', 6]])] }),
  '1-3': RM({ id: '1-3', name: 'CLAP TRAP', ep: 1, type: 'battle', cell: [2, 2], exits: { N: '1-6' }, par: 65,
    waves: [WV(2, null, [['E', 'clapbot', 8], ['W', 'clapbot', 8]]), WV(8, 3, [['N', 'goon', 12]]), WV(8, 4, [['all', 'clapbot', 5]], [['records', 'drop']]),
      WV(8, 4, [['S', 'popper', 4], ['E', 'goon', 8]]), WV(8, 3, [['all', 'clapbot', 6], ['N', 'goon', 6]])] }),
  '1-4': RM({ id: '1-4', name: 'KEY GAUNTLET', ep: 1, type: 'key', cell: [0, 1], exits: { E: '1-5' }, par: 80, key: 'survive', survive: 35, cageUntil: 20,
    streams: [{ every: 1.2, spawn: [['N', 'goon', 1], ['S', 'goon', 1], ['E', 'goon', 1], ['W', 'goon', 1]] }, { every: 4, spawn: [['random', 'clapbot', 2]] }, { every: 7, spawn: [['random', 'popper', 1]] }],
    items: [[6, 'shield', 'drop'], [18, 'bomb', 'drop'], [28, 'life', 'drop']],
    final: [['all', 'goon', 4]], waves: [] }),
  '1-5': RM({ id: '1-5', name: 'WEAPONS LOCKER', ep: 1, type: 'armory', cell: [1, 1], exits: { N: '1-B' }, par: 80,
    items: [[1.5, 'spread', [5, 6]], [1.5, 'rockets', [15, 6]], [1.5, 'records', [10, 3]]],
    waves: [WV(3, null, [['all', 'goon', 8]]), WV(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), WV(8, 5, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]),
      WV(8, 5, [['all', 'goon', 8]], [['speed', 'drop']]), WV(10, 4, [['N', 'goon', 12], ['S', 'goon', 12], ['sides', 'popper', 2]])] }),
  '1-6': RM({ id: '1-6', name: 'CASH COW CORRAL', ep: 1, type: 'cash', cell: [2, 1], exits: { W: '1-5' }, par: 60, key: 'crate', cashMul: 1.5, dropBoost: 2,
    crates: [[4, 3], [10, 2], [16, 3], [4, 9], [10, 10], [16, 9]],
    waves: [WV(2, null, [['N', 'goon', 10]]), WV(8, 3, [['E', 'goon', 10], ['W', 'goon', 10]]), WV(8, 4, [['all', 'clapbot', 4]]),
      WV(8, 4, [['S', 'popper', 3], ['N', 'popper', 3], ['all', 'goon', 3]])] }),

  /* ===================== EPISODE 2: SWEEPS WEEK (MegaMart Prize Warehouse) ===================== */
  '2-1': RM({ id: '2-1', name: 'AISLE 9 RUMBLE', ep: 2, type: 'start', set: 'warehouse', cell: [1, 2], exits: { W: '2-2', N: '2-5', E: '2-3' }, par: 70,
    waves: [WV(2, null, [['N', 'goon', 10], ['S', 'goon', 10]]), WV(8, 4, [['E', 'disco', 1], ['W', 'disco', 1]]), WV(10, 3, [['all', 'goon', 6]], [['popcorn', 'center']]),
      WV(8, 4, [['N', 'popper', 3], ['S', 'clapbot', 10]]), WV(8, 4, [['E', 'disco', 2], ['W', 'goon', 12]])] }),
  '2-2': RM({ id: '2-2', name: 'CONVEYOR CHAOS', ep: 2, type: 'hazard', set: 'warehouse', cell: [0, 2], exits: { N: '2-4' }, par: 65, key: 'place', keyAt: [19, 5],
    hazards: [{ kind: 'conveyor', rows: [2, 5, 9], dirs: [1, -1, 1] }],
    waves: [WV(2, null, [['E', 'goon', 12]]), WV(8, 4, [['W', 'clapbot', 10]]), WV(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]),
      WV(8, 4, [['all', 'goon', 8]], [['laser', 'drop']]), WV(8, 3, [['E', 'disco', 2], ['W', 'disco', 1]])] }),
  '2-3': RM({ id: '2-3', name: 'DISCO DEPOT', ep: 2, type: 'battle', set: 'warehouse', cell: [2, 2], exits: { N: '2-6' }, par: 70,
    waves: [WV(2, null, [['N', 'discoBig', 2]]), WV(10, 2, [['E', 'goon', 10], ['W', 'goon', 10]]), WV(8, 4, [['S', 'disco', 2]], [['laser', 'drop']]),
      WV(8, 4, [['all', 'clapbot', 5]]), WV(9, 3, [['N', 'discoBig', 2], ['S', 'goon', 8]])] }),
  '2-4': RM({ id: '2-4', name: 'TOMATO TERRITORY', ep: 2, type: 'battle', set: 'warehouse', cell: [0, 1], exits: { E: '2-5' }, par: 70, key: 'carrier', carrier: 'hecklerKing',
    waves: [WV(2, null, [['audience', 'heckler', 4]]), WV(8, 2, [['N', 'goon', 12]]), WV(8, 4, [['audience', 'heckler', 6]]),
      WV(8, 4, [['S', 'popper', 4], ['E', 'clapbot', 8]]), WV(8, 3, [['audience', 'hecklerKing', 1], ['audience', 'heckler', 3]], [['life', 'drop']])] }),
  '2-5': RM({ id: '2-5', name: 'TANK YARD', ep: 2, type: 'armory', set: 'warehouse', cell: [1, 1], exits: { N: '2-B' }, par: 80,
    items: [[1.5, 'popcorn', [5, 6]], [1.5, 'rockets', [15, 6]]],
    waves: [WV(2, null, [['N', 'tank', 1]]), WV(10, 1, [['all', 'goon', 8]]), WV(8, 4, [['E', 'tank', 1], ['W', 'tank', 1]]),
      WV(10, 2, [['S', 'popper', 4], ['N', 'clapbot', 10]], [['shield', 'drop']]), WV(9, 3, [['N', 'tank', 2], ['all', 'goon', 6]])] }),
  '2-6': RM({ id: '2-6', name: 'BLOWOUT SALE', ep: 2, type: 'cash', set: 'warehouse', cell: [2, 1], exits: { W: '2-5' }, par: 65, key: 'crate', cashMul: 1.5,
    crates: [[3, 2], [9, 2], [11, 2], [17, 2], [3, 10], [9, 10], [11, 10], [17, 10]],
    waves: [WV(2, null, [['all', 'goon', 8]]), WV(8, 4, [['audience', 'heckler', 4]]), WV(8, 3, [['E', 'disco', 1], ['W', 'disco', 1]]),
      WV(8, 3, [['all', 'clapbot', 5]]), WV(8, 3, [['N', 'tank', 1], ['S', 'goon', 10]])] }),

  /* ===================== EPISODE 3: THE SEASON FINALE (Rooftop Gala, night) ===================== */
  '3-1': RM({ id: '3-1', name: 'RED CARPET RIOT', ep: 3, type: 'start', set: 'rooftop', cell: [1, 2], exits: { W: '3-2', N: '3-5', E: '3-3' }, par: 75,
    waves: [WV(2, null, [['all', 'goon', 8]]), WV(8, 4, [['audience', 'heckler', 4], ['N', 'disco', 1]]), WV(8, 3, [['E', 'tank', 1], ['W', 'popper', 4]]),
      WV(9, 3, [['N', 'brute', 1]]), WV(10, 2, [['all', 'clapbot', 6], ['S', 'goon', 8]])] }),
  '3-2': RM({ id: '3-2', name: 'PYRO PIT', ep: 3, type: 'hazard', set: 'rooftop', cell: [0, 2], exits: { N: '3-4' }, par: 70, key: 'final',
    hazards: [{ kind: 'vents', cells: [[4, 3], [8, 3], [12, 3], [16, 3], [4, 6], [8, 6], [12, 6], [16, 6], [4, 9], [8, 9], [12, 9], [16, 9]] }],
    waves: [WV(2, null, [['N', 'goon', 12]]), WV(8, 4, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]), WV(8, 4, [['S', 'popper', 4]], [['records', 'drop']]),
      WV(8, 3, [['audience', 'heckler', 4]]), WV(8, 3, [['script', 'finaleBurst']], []), WV(null, 0, [['all', 'goon', 4]])] }),
  '3-3': RM({ id: '3-3', name: 'CABLE TANGLE', ep: 3, type: 'battle', set: 'rooftop', cell: [2, 2], exits: { N: '3-6' }, par: 75,
    waves: [WV(2, null, [['N', 'snake', 1]]), WV(8, null, [['all', 'goon', 6]]), WV(10, 4, [['E', 'snake', 1], ['W', 'snake', 1]]),
      WV(10, 3, [['S', 'popper', 4]], [['laser', 'drop']]), WV(10, 2, [['N', 'snake', 2], ['all', 'clapbot', 3]])] }),
  '3-4': RM({ id: '3-4', name: 'PENTHOUSE VAULT', ep: 3, type: 'key', set: 'rooftop', cell: [0, 1], exits: { E: '3-5' }, par: 80, key: 'vault',
    locks: [[1, 0], [3, 0], [5, 0], [7, 0]],
    waves: [WV(2, null, [['all', 'goon', 8]]), WV(8, 4, [['audience', 'heckler', 4]]), WV(8, 3, [['E', 'tank', 1]]), WV(8, 3, [['all', 'clapbot', 5]]),
      WV(8, 3, [['N', 'brute', 1]])] }),
  '3-5': RM({ id: '3-5', name: 'THE AFTER-PARTY', ep: 3, type: 'armory', set: 'rooftop', cell: [1, 1], exits: { N: '3-B' }, par: 85,
    items: [[1.5, 'laser', [5, 6]], [1.5, 'popcorn', [15, 6]], [1.5, 'shield', [10, 10]]],
    waves: [WV(2, null, [['N', 'snake', 1], ['S', 'goon', 10]]), WV(8, 3, [['E', 'discoBig', 1], ['W', 'tank', 1]]), WV(8, 3, [['audience', 'heckler', 6]]),
      WV(9, 3, [['N', 'brute', 1], ['all', 'clapbot', 4]]), WV(9, 3, [['all', 'goon', 10], ['N', 'popper', 4]])] }),
  '3-6': RM({ id: '3-6', name: 'MASCOT MAYHEM', ep: 3, type: 'battle', set: 'rooftop', cell: [2, 1], exits: { W: '3-5' }, par: 80, key: 'carrier', carrier: 'brute',
    waves: [WV(2, null, [['N', 'brute', 1]]), WV(10, 1, [['all', 'goon', 8]]), WV(8, 3, [['E', 'brute', 1], ['W', 'popper', 4]]),
      WV(8, 3, [['S', 'snake', 1]], [['rockets', 'drop']]), WV(10, 2, [['N', 'brute', 2]])] }),

  /* ===================== BOSS ROOMS (§5.9) and the Green Room (§7.4) ===================== */
  '1-B': RM({ id: '1-B', name: 'SOUNDSTAGE 9: MASHY\'S BIG DEBUT', ep: 1, type: 'boss', boss: 'mashy', set: 'studio', cell: [1, 0], exits: {}, par: 0 }),
  '2-B': RM({ id: '2-B', name: 'THE BIG SPIN', ep: 2, type: 'boss', boss: 'wheel', set: 'warehouse', cell: [1, 0], exits: {}, par: 0 }),
  '3-B': RM({ id: '3-B', name: 'LANCE LUSTRE LIVE!', ep: 3, type: 'boss', boss: 'lance', set: 'rooftop', cell: [1, 0], exits: {}, par: 0 }),
  'greenroom': RM({ id: 'greenroom', name: 'THE GREEN ROOM', ep: 0, type: 'bonus', set: 'greenroom', cell: [1, 1], exits: {}, par: 0 })
};
// the Lightning Round (AI Hub sessions, §7.5): room 1-1's waves (no tutorial), 1-2, 2-3 and Mashy; each has one exit, N, to the next
MT.LIGHTNING = [['L1', '1-1', 'L2'], ['L2', '1-2', 'L3'], ['L3', '2-3', 'LB'], ['LB', '1-B', null]];
for (const [id, from, next] of MT.LIGHTNING) {
  const src = MT.ROOMS[from];
  MT.ROOMS[id] = Object.assign({}, src, { id, name: id === 'LB' ? src.name : 'LIGHTNING: ' + src.name, tutorial: false, exits: next ? { N: next } : {}, lightning: true });
}
// the room a walker ends up in through a door of `from`: an episode's start room is entered from S
MT.roomAt = (from, dir) => MT.ROOMS[from] && MT.ROOMS[from].exits[dir];
MT.episodeRooms = ep => Object.values(MT.ROOMS).filter(r => r.ep === ep && r.type !== 'boss');
MT.startRoom = ep => `${ep}-1`;
MT.bossRoom = ep => `${ep}-B`;
// the room sequence that counts for the lightning round and the walk-through tests: the left path (§6.1)
MT.LEFT_PATH = { 1: ['1-1', '1-2', '1-4', '1-5', '1-B'], 2: ['2-1', '2-2', '2-4', '2-5', '2-B'], 3: ['3-1', '3-2', '3-4', '3-5', '3-B'] };
MT.RIGHT_PATH = { 1: ['1-1', '1-3', '1-6', '1-5', '1-B'], 2: ['2-1', '2-3', '2-6', '2-5', '2-B'], 3: ['3-1', '3-3', '3-6', '3-5', '3-B'] };
MT.ENTRY_DOOR = id => (id.endsWith('-1') || id.endsWith('-B') || id === 'greenroom') ? 'S' : null;   // else the opposite of the door walked through

/* ---------- the text (§8): lines are keyed by id and substituted: {NAME} {PRIZE} {N}; the logic never holds a word ---------- */
MT.TEXT = {
  coldOpen: [
    ['ANNC', 'LIVE FROM STUDIO 9 IN BEAUTIFUL NEO-BURBANK... IT\'S... MASH TV!'],
    ['LANCE', 'GOOD EVENING, PLANET EARTH! I\'M LANCE LUSTRE, AND THIS IS THE ONLY SHOW WHERE THE PRIZES ARE BIG AND THE LIFE EXPECTANCY IS SMALL!'],
    ['LANCE', 'TONIGHT, {N} BRAVE CONTESTANTS FIGHT FOR CASH, PRIZES AND THE RIGHT TO KEEP BREATHING!'],
    ['PENNY', 'AND REMEMBER, BY ORDER OF THE FCC, ALL GORE HAS BEEN REPLACED WITH CONFETTI!'],
    ['LANCE', 'LET\'S PLAY... MASH TV! KA-CHING! KA-BOOM!']],
  look: ['A RETIRED STUNT DOUBLE, JUST HERE FOR THE TOASTER!', 'A LICENSED ELECTRICIAN WITH UNLICENSED REFLEXES!',
    'THREE-TIME CHAMPION OF COMPETITIVE COUPON CLIPPING!', 'WANTS THE MOON TIMESHARE. HAS NO PLAN FOR GETTING HOME!'],
  cards: { 1: ['EPISODE 1', 'THE PILOT', 'OUR VERY FIRST EPISODE! TRY NOT TO MAKE IT YOUR LAST!'], 2: ['EPISODE 2', 'SWEEPS WEEK', 'IT\'S SWEEPS WEEK! THE NETWORK SAYS: MORE EXPLOSIONS, FEWER SURVIVORS!'],
    3: ['EPISODE 3', 'THE SEASON FINALE', 'THE SEASON FINALE, LIVE FROM THE ROOFTOP GALA! FIREWORKS! CHAMPAGNE! FUNERALS!'] },
  bossIntro: {
    mashy: ['PENNY: OOH, HERE HE COMES!', 'LANCE: PLEASE WELCOME THE NETWORK\'S BELOVED MASCOT... MASHY! WE GAVE HIM A FEW... UPGRADES!', 'MASHY: MASHY LOVE YOU! MASHY MASH YOU!'],
    wheel: ['LANCE: IT\'S TIME TO SPIN... THE WHEEL OF MISFORTUNE! SPIN TO WIN! OR, STATISTICALLY, SPIN TO LOSE!'],
    lance: ['LANCE: YOU WERE SUPPOSED TO LOSE! THE SPONSORS HAVE CONTRACTS! NOBODY CANCELS LANCE LUSTRE!'] },
  bossLine: {
    mashyP3: 'UH-OH! MASHY\'S GONE MASHY!', mashyDown: 'MASHY HAS BEEN... MASHED! SOMEBODY GET A SPATULA!',
    wheelLoose: 'THE WHEEL\'S OFF ITS HINGES! JUST LIKE OUR LEGAL DEPARTMENT!', wheelDown: 'THE WHEEL HAS STOPPED... FOREVER! BANKRUPT!',
    lanceBreak: 'WE\'LL BE RIGHT BACK AFTER A WORD FROM OUR SPONSORS!', lanceDown: 'THIS... ISN\'T... OVER... PLEASE... STAND... BY...',
    networkIntro: 'THE SHOW MUST GO ON. THE SHOW WILL ALWAYS GO ON. PLEASE. STAY. TUNED.', networkDown: 'SIGNAL... LOST...'
  },
  enemyIntro: {
    goon: ['OUR SECURITY GOONS! UNION-MADE AND UNDERPAID!', 'ONE SHOT EACH. DON\'T GET SURROUNDED.'],
    clapbot: ['THE CLAPBOTS! THEY CLAP! THEY HOP! THEY BITE!', 'FAST AND ERRATIC. KEEP MOVING.'],
    popper: ['PARTY POPPERS! KEEP YOUR DISTANCE, THEY\'RE A BLAST!', 'SHOOT THEM BEFORE THEY GET CLOSE.'],
    mime: ['LAND MIMES! TRAPPED IN A BOX... OF EXPLOSIVES!', 'SHOOT THEM FROM A DISTANCE.'],
    disco: ['DISCO NEVER DIED! IT JUST GOT ARMED!', 'THEY BOUNCE. WATCH THE LIGHT BEAMS.'],
    heckler: ['OUR STUDIO AUDIENCE HAS... OPINIONS! AND TOMATOES!', 'DODGE THE RED RINGS. SPLATS SLOW YOU.'],
    tank: ['THE DOLLY TANK! SMILE FOR THE CAMERA... FOREVER!', 'MOVE WHEN THE LENS FLASHES.'],
    snake: ['CABLE SNAKES! WHO LEFT THESE WIRES LYING AROUND?', 'SHOOT THE SEGMENTS OFF.'],
    brute: ['BRAND MASCOT ALERT! IT\'S... THE CEREAL KILLER!', 'SIDESTEP THE CHARGE. STUNNED, IT TAKES DOUBLE DAMAGE.']
  },
  roomStart: ['DOORS OPEN IN 3... 2... OH, THEY\'RE ALREADY OPEN!', 'THIS ROOM BROUGHT TO YOU BY KRUNCH-O: THE CEREAL THAT CRUNCHES BACK!',
    'MASH \'EM! CASH \'EM! KA-CHING! KA-BOOM!', 'DON\'T TRY THIS AT HOME, KIDS! TRY IT HERE, FOR MONEY!', 'LET\'S GET READY TO... MASH!',
    'OUR LAWYERS SAY THESE DOORS ARE PERFECTLY SAFE!', 'THE AUDIENCE AT HOME IS ON THE EDGE OF THEIR COUCHES!', 'MEGAMART: WE SELL EVERYTHING. EVEN THIS SHOW!'],
  roomClear: ['ROOM CLEAR! THE JANITORS HATE YOU!', 'MAGNIFICENT! THE CONFETTI BUDGET IS BLOWN!', 'NOW THAT\'S MUST-MASH TV!',
    'PICK A DOOR, ANY DOOR! THEY\'RE ALL TERRIBLE!', 'STAY TUNED... AND STAY ALIVE!', 'WHAT A PERFORMANCE! SOMEONE GIVE THEM AN AWARD! NOT A REAL ONE!'],
  hurt: ['OOH! THAT\'S GONNA LEAVE A MARK!', 'WALK IT OFF! THE NETWORK DOESN\'T PAY FOR BANDAGES!', 'SO CLOSE! I MEAN... HOORAY!'],
  death: ['MASHED! LET\'S SEE THAT AGAIN IN SLOW MOTION!', 'DON\'T WORRY, FOLKS! OUR CONTESTANTS ARE FULLY INSURED... BY US!',
    'THEY\'LL BE FINE! PROBABLY! RIGHT AFTER THESE MESSAGES!', 'AND DOWN GOES {NAME}! THE CROWD GOES MILD!'],
  multi: ['MULTI-MASH!', 'A TRIPLE! THE SPONSORS LOVE A TRIPLE!', 'TOTAL MASH-ACRE!'],
  showboat: ['WORK THAT CAMERA!', 'SHOWMANSHIP! OR STUPIDITY! SAME THING!', 'THE CAMERAS LOVE YOU! THE GOONS DON\'T!'],
  prime: ['RATINGS ARE THROUGH THE ROOF! SOMEBODY FIX THE ROOF!', 'PRIME TIME, BABY! FIVE TIMES THE CASH!', 'THE SPONSORS ARE WEEPING WITH JOY!'],
  stunt: ['WE\'RE LOSING VIEWERS! PRODUCERS, DO SOMETHING!', 'BORING! RELEASE THE STUNT!', 'THE AUDIENCE IS CHANGING THE CHANNEL! SPICE IT UP!'],
  key: ['A GOLDEN KEY! COLLECT FIVE AND THE GREEN ROOM COULD BE YOURS!', 'ANOTHER KEY! WHAT DOES IT OPEN? OUR LAWYERS SAY: NOTHING!'],
  prize: 'OOOH! {PRIZE}!', prizeWin: 'YOU WON {PRIZE}! IT\'S WORTH MONEY! PROBABLY!',
  encore: 'ENCORE! THE CROWD WANTS MORE OF YOU! FOR NOW!', hurry: 'PICK A DOOR! WE\'RE PAYING OVERTIME HERE!',
  lowHp: 'ONE MORE HIT AND YOU\'RE A COMMERCIAL BREAK!',
  hints: {
    move: 'MOVE WITH THE STICK OR WASD, AIM AND FIRE WITH THE RIGHT STICK OR MOUSE', capsule: 'WALK OVER POWER-UPS', showboat: 'SHOWBOAT NEAR ENEMIES FOR RATINGS',
    slide: 'SLIDE THROUGH DANGER', showstop: 'SHOWSTOPPER CLEARS THE SCREEN', exit: 'PICK A DOOR!', dropIn: 'PRESS START TO JOIN'
  },
  recapIntro: 'LET\'S SEE WHAT OUR CONTESTANTS WON!', recapOutro: 'SEE YOU AFTER THE BREAK!',
  keysOpen: 'YOU FOUND THE GOLDEN KEYS! THE GREEN ROOM IS OPEN!',
  greenIntro: 'YOU FOUND THE GOLDEN KEYS! WELCOME TO THE GREEN ROOM!',
  endingA: ['CONGRATULATIONS! YOU SURVIVED THE SEASON!'],
  endingANext: 'HELLO, PLANET EARTH! NEXT SEASON ON MASH TV...',
  endingB: ['BREAKING NEWS! TONIGHT\'S CONTESTANTS HAVE POOLED THEIR WINNINGS... AND BOUGHT THE NETWORK!', 'MASH TV HAS BEEN... CANCELLED!'],
  gameOver: ['AND THAT\'S A WRAP! FOR YOU, PERMANENTLY!', 'YOUR CONSOLATION PRIZE: THE HOME VERSION OF THIS GAME!'],
  continueLine: 'WANT ANOTHER SHOT? THE NETWORK ONLY TAKES HALF!',
  sponsors: [['KRUNCH-O', 'THE CEREAL THAT CRUNCHES BACK!'], ['MEGAMART', 'WE SELL EVERYTHING. EVEN THIS SHOW.'], ['DOOM COLA', 'TASTE THE END'], ['LAFF TRAK', 'CANNED LAUGHTER FOR AWKWARD SILENCES']],
  steal: 'THE NETWORK TAKES ITS CUT!', sessionEnd: 'THAT\'S OUR SHOW! TUNE IN NEXT ROUND!', technical: 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES.'
};
// the pool of lines for each reaction: random without repeats (§8.4)
MT.pools = {};
MT.pick_unique = (key, list) => {
  const used = MT.pools[key] || (MT.pools[key] = { left: [] });
  if (!used.left.length) used.left = list.slice();
  const i = Math.floor(MT.rng.fx() * used.left.length);
  return used.left.splice(i, 1)[0];
};
MT.fill = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
