/* =====================================================================================
 * 15-data-floors: the four floors and the Rat Run, as data (CONTENT.md describes the format).
 *   map      one character a cell: # wall . floor @ start < > stairs + door = gate L K locked door M magic seal
 *            H secret wall I illusory wall P plate T dart trap O pit o trapdoor ^ teleporter S spinner U the Undergate
 *            * pit landing B the boss
 *   doors    id -> [x, y, { lock, kind, secret }] for the map's door cells (others get ids of their own)
 *   feats    [id, kind, x, y, face, { ... }]: wall features on the wall at face of the open cell (x, y)
 *   plates, traps, pits, tps: their cells; wires: { when, mode, do, fail, once }; items [x, y, id, n];
 *   mons [x, y, type, n, { asleep, patrol, id }]; stairs 'x,y' -> { to, at } | { sealed }; safe [x0, y0, x1, y1];
 *   hints [{ cells, after, text, done }]; waypoints [name, x, y, dir]; walk: the bot's walkthrough
 * ===================================================================================== */
B.FLOORS = {};
B.FLOOR_ORDER = ['f1', 'f2', 'f3', 'f4'];

B.FLOORS.f1 = {
  name: 'The Hasp Drains', card: 'Cold water talks to itself in the channels. The walls sweat.', song: 'drains', step: 'wet', over: 'The Drains keep what they take.',
  look: { ground: ['#3e4a44', '#2a332f', '#55615a'], water: '#1e3a30', side: 'brick', color: '#4a5048', fog: ['#06080a', 24, 150], ambient: ['#4a5a5a', '#1a201e', 1.5], torch: '#ffb070' },
  map: [
    '######################',
    '#.....=.#####........#',
    '#.....#######........#',
    '##+#####.########L####',
    '##.#####H########.####',
    '#....###.....####.####',
    '#....###......P.=.####',
    '#............#########',
    '#....###.....#########',
    '##.######I##.#########',
    '##=#####...#...T....##',
    '##.#####...########=##',
    '##.##..#...###.......#',
    '##..+..#######.......#',
    '##@##..########L######',
    '##<############>######',
    '######################'],
  start: [2, 14, 0],
  water: [[1, 5, 4, 8], [12, 10, 19, 10], [14, 12, 20, 13]],
  doors: { G1: [2, 10], G3: [6, 1], D1: [2, 3], H1: [8, 4, { secret: true }], G2: [16, 6], L1: [17, 3, { lock: 'ironKey', lk: 'simple' }], I1: [9, 9],
    G4: [19, 11], D2: [4, 13], L2: [15, 14, { lock: 'drainwardensKey', lk: 'warded' }] },
  plates: { P1: [14, 6, 'hold'] }, traps: { T1: [15, 10] },
  feats: [
    ['LV1', 'lever', 2, 11, 'E'], ['N1', 'plaque', 1, 6, 'W', { text: 'n1' }], ['LV2', 'lever', 5, 2, 'E'],
    ['AL1', 'shrine', 4, 5, 'N', { accepts: 'ratKingsCrown', text: 'x_shrine' }], ['SW1', 'catch', 9, 5, 'N', { look: 'stone' }],
    ['N2', 'plaque', 10, 8, 'S', { text: 'n2' }], ['B1', 'button', 13, 10, 'N'], ['B2', 'button', 18, 10, 'S'],
    ['N4', 'plaque', 14, 13, 'S', { text: 'n4' }], ['N3', 'plaque', 6, 12, 'N', { text: 'n3' }],
    ['t1', 'torch', 12, 5, 'N'], ['t2', 'torch', 20, 1, 'E'], ['t3', 'torch', 2, 12, 'W'], ['t4', 'torch', 20, 13, 'E'],
    ['d1', 'grate', 3, 8, 'S'], ['d2', 'pipe', 10, 5, 'N'], ['d3', 'chain', 1, 2, 'W'], ['d4', 'pipe', 16, 10, 'N'], ['d5', 'grate', 17, 13, 'S'], ['d6', 'chain', 14, 1, 'N'], ['d7', 'pipe', 5, 7, 'S'], ['d8', 'grate', 11, 8, 'S']],
  wires: [
    { when: { lever: 'LV1' }, do: [['toggle', 'G1']] },
    { when: { lever: 'LV2' }, once: true, do: [['open', 'G3'], ['story', 'tamsin']] },
    { when: { alcove: 'AL1', item: 'ratKingsCrown' }, once: true, do: [['take'], ['special', 'sq1'], ['give', 'ringOfMending', 'AL1'], ['msg', 'm_shrine']] },
    { when: { catch: 'SW1' }, once: true, do: [['open', 'H1'], ['secret', 'closet'], ['msg', 'm_hidden']] },
    { when: { plate: 'P1' }, mode: 'hold', do: [['open', 'G2']] },
    { when: { buttons: ['B1', 'B2'] }, once: true, do: [['open', 'G4'], ['msg', 'm_click']], fail: [['hint', 'h_buttons']], failAfter: 2 },
    { when: { enter: [2, 9] }, once: true, do: [['hint', 'h_strike']] },
    { when: { enter: [5, 13] }, once: true, do: [['msg', 'm_post'], ['hint', 'h_camp']] },
    { when: { enter: [9, 10] }, once: true, do: [['msg', 'm_lair']] },
    { when: { enter: [2, 12] }, once: true, do: [['hint', 'h_items']] },
    { when: { enter: [13, 6] }, once: true, do: [['hint', 'h_plate']] }
  ],
  items: [[2, 13, 'rustyDagger'], [2, 12, 'rock'], [5, 13, 'ration'], [5, 13, 'ration'], [6, 14, 'tornPage'], [3, 8, 'leatherCap'], [1, 5, 'sling'], [1, 5, 'slingStones', 12],
    [1, 1, 'ironKey'], [3, 2, 'shortSword'], [5, 1, 'darts', 5], [8, 3, 'sc_wardOfBrass'], [8, 3, 'potionHealing'], [10, 7, 'rock'], [9, 11, 'ratKingsCrown'], [10, 12, 'ration'],
    [20, 1, 'lightCrossbow'], [20, 2, 'bolts', 12], [13, 1, 'leatherArmor'], [13, 2, 'ration'], [19, 10, 'potionHealing'], [20, 12, 'ironRation'], [14, 12, 'sc_sparkDart'], [12, 7, 'rock']],
  mons: [[3, 6, 'rat', 3], [1, 8, 'rat', 2, { asleep: true }], [3, 1, 'latchkin', 2], [5, 2, 'latchkin', 1], [11, 7, 'leech', 1], [9, 11, 'ratknot', 1], [8, 10, 'rat', 2],
    [18, 1, 'snick', 1, { id: 'snick', sight: 'snick1', half: { spawn: ['latchkin', [13, 2], 2], bark: 'snick2' }, death: 'snick3' }], [15, 2, 'latchkin', 2],
    [17, 10, 'rat', 3, { patrol: [[13, 10], [19, 10]] }], [16, 12, 'ooze', 1], [19, 13, 'ooze', 1]],
  npcs: [['tamsin', 7, 1, 2]],
  stairs: { '2,15': { sealed: 'm_sealed' }, '15,15': { to: 'f2', at: [2, 1, 1] } },
  arrive: { f2: [15, 13, 0] },
  safe: [[5, 12, 6, 14]],
  wander: { budget: 3, groups: [['rat', 2], ['latchkin', 2]], at: [[3, 7], [11, 5], [17, 12]] },
  hints: [{ cells: [[13, 6], [14, 6], [15, 6]], after: 20, text: 'h_p1', done: { plateDown: 'P1' } }, { cells: [[9, 5], [8, 5], [10, 5]], after: 25, text: 'h_sw1', done: { open: 'H1' } },
    { cells: [[10, 8], [9, 8], [8, 8]], after: 25, text: 'h_i1', done: { flag: 'I1' } }],
  waypoints: [['F1 Start', 2, 14, 0], ['F1 Rat Channel', 2, 7, 0], ['F1 Latchkin Den', 2, 2, 1], ['F1 Junction', 10, 6, 1], ['F1 Snick\'s Hall', 17, 4, 0], ['F1 Sluice', 13, 10, 1], ['F1 Cistern', 16, 13, 1]],
  areas: { channel: [1, 5, 4, 8], den: [1, 1, 5, 2], junction: [8, 5, 12, 8], snick: [13, 1, 20, 2], lair: [8, 10, 10, 12], sluice: [12, 10, 19, 10], cistern: [14, 12, 20, 13] }
};

B.FLOORS.f2 = {
  name: 'The Tumbler Halls', card: 'The air smells of oil and old smoke. Somewhere, gears are turning.', song: 'tumbler', step: 'metal', over: 'The gears grind on without you.',
  look: { ground: ['#5a4a3a', '#3e3228', '#7a6450'], groundStyle: 'tiles', side: 'block', color: '#6a5a48', fog: ['#0a0806', 40, 220], ambient: ['#7a6048', '#2a2018', 1.8], torch: '#ffa050' },
  map: [
    '######################',
    '#<@..........###.....#',
    '#...####.....K.......#',
    '########.....###.....#',
    '#.....##########.....#',
    '#.P.P.=...#....####.##',
    '#.....#...M....####.##',
    '#.....#...#....####.##',
    '##=########...>####.##',
    '##..P##############.##',
    '####.o.############.##',
    '####O#.####.#######^##',
    '####.#.####=#######.##',
    '####.#.##.....###....#',
    '####............+.S..#',
    '#########.....###....#',
    '######################'],
  start: [2, 1, 1],
  doors: { K1: [13, 2, { lock: 'gearKey', lk: 'warded' }], D3: [16, 14], G5: [11, 12], G6: [2, 8], G7: [6, 5], M1: [10, 6] },
  plates: { P2: [4, 9, 'latch'], P3: [2, 5, 'latch'], P4: [4, 5, 'latch'] },
  pits: { O1: [4, 11], O2: [5, 10, { trapdoor: true }] }, fall: { to: 'f3', at: [2, 15, 0] },
  tps: { TP1: [19, 11, { to: [19, 5, 2], silent: true, loops: [[2, 'm_longer'], [4, 'ysoldeHint']] }] },
  feats: [
    ['N5', 'plaque', 8, 3, 'S', { text: 'n5' }], ['CN1', 'gearNiche', 16, 1, 'N'], ['CN2', 'gearNiche', 17, 1, 'N'], ['CF', 'clockFace', 18, 1, 'N'], ['CN3', 'gearNiche', 19, 1, 'N'], ['CN4', 'gearNiche', 20, 1, 'N'],
    ['AL2', 'alcove', 19, 6, 'W', { holds: ['tumblerGear'] }], ['SW2', 'catch', 19, 8, 'E', { look: 'rivet' }],
    ['LA', 'lever', 10, 15, 'S'], ['LB', 'lever', 11, 15, 'S'], ['LC', 'lever', 12, 15, 'S'],
    ['N6', 'plaque', 3, 9, 'N', { text: 'n6' }], ['AL3', 'alcove', 2, 9, 'W', { accepts: 'kind:key', text: 'x_riddle' }],
    ['N7', 'plaque', 8, 5, 'N', { text: 'n7' }], ['AL4', 'alcove', 14, 6, 'E', { holds: ['brassWard'], text: 'x_altar' }], ['SH1', 'raiseShrine', 12, 5, 'N'],
    ['t1', 'torch', 10, 1, 'N'], ['t2', 'torch', 20, 4, 'E'], ['t3', 'torch', 9, 13, 'W'], ['t4', 'torch', 11, 8, 'S'],
    ['g1', 'gearWall', 9, 1, 'N'], ['g2', 'gearWall', 12, 3, 'S'], ['g3', 'gearWall', 1, 7, 'W'], ['g4', 'gearWall', 20, 2, 'E'], ['g5', 'gearWall', 13, 15, 'S'], ['g6', 'gearWall', 19, 10, 'W'], ['g7', 'gearWall', 7, 7, 'S'], ['g8', 'gearWall', 14, 7, 'E']],
  wires: [
    { when: { alcovesFull: ['CN1', 'CN2', 'CN3', 'CN4'] }, once: true, do: [['clock', 'CF'], ['give', 'tumblerwrightsGoggles', 'CF'], ['special', 'sq2'], ['msg', 'm_clock']] },
    { when: { catch: 'SW2' }, once: true, do: [['teleporter', 'TP1', false], ['secret', 'catch'], ['msg', 'm_stills']] },
    { when: { levers: { LA: true, LB: false, LC: true } }, once: true, do: [['open', 'G5'], ['msg', 'm_tumbler'], ['story', 'durgan2']], fail: [['sfx', 'tumblers'], ['msg', 'm_tumblers']] },
    { when: { plate: 'P2' }, once: true, do: [['bridge', 'O1'], ['msg', 'm_bridge']] },
    { when: { alcove: 'AL3', kind: 'key' }, once: true, do: [['return'], ['open', 'G6'], ['msg', 'm_riddle']] },
    { when: { plates: ['P3', 'P4'] }, once: true, do: [['open', 'G7'], ['msg', 'm_clack']] },
    { when: { enterArea: [16, 1, 20, 4] }, once: true, do: [['story', 'ysolde1']] },
    { when: { enter: [11, 13] }, once: true, do: [['story', 'durgan1']] },
    { when: { killed: ['sentinel'] }, once: true, do: [['story', 'ysolde2']] },
    { when: { enter: [7, 6] }, once: true, do: [['hint', 'h_seal']] },
    { when: { enter: [4, 13] }, once: true, do: [['hint', 'h_throw']] }
  ],
  items: [[9, 1, 'tumblerGear'], [12, 3, 'gearKey'], [11, 3, 'warhammer'], [8, 1, 'sc_featherStep'], [10, 3, 'guildLedger'], [8, 2, 'ration'], [8, 2, 'ration'],
    [16, 4, 'sc_unlatch'], [20, 3, 'potionHealing'], [20, 15, 'tumblerGear'], [17, 15, 'chainShirt'], [13, 15, 'ironShield'], [9, 15, 'tumblersPick'], [13, 13, 'ration'],
    [6, 10, 'potionGreaterHealing'], [4, 13, 'rock'], [5, 14, 'rock'], [3, 9, 'bentKey'], [5, 7, 'ironIngot'], [1, 7, 'wandUnlatching'], [1, 4, 'ration'], [1, 4, 'ration'],
    [12, 8, 'sc_frostbite'], [11, 5, 'scrollRaising'], [13, 5, 'lockbreaker'], [14, 5, 'ironRation'], [3, 5, 'rock']],
  mons: [[10, 2, 'skeleton', 2], [11, 1, 'rustling', 3], [18, 3, 'spider', 1], [19, 9, 'rustling', 2, { patrol: [[19, 6], [19, 10]] }], [20, 13, 'spider', 1], [12, 14, 'skeleton', 2],
    [4, 13, 'spider', 1], [3, 6, 'skeleton', 2], [12, 6, 'sentinel', 1, { id: 'sentinel' }]],
  npcs: [['durgan', 11, 11, 2], ['ysolde', 18, 2, 2, { ghost: true, hidden: true }]],
  stairs: { '1,1': { to: 'f1', at: [15, 13, 0] }, '14,8': { to: 'f3', at: [1, 2, 2] } },
  arrive: { f1: [2, 1, 1], f3: [13, 8, 3], sump: [6, 10, 2] },
  safe: [[1, 1, 3, 2]],
  wander: { budget: 3, groups: [['rustling', 2], ['skeleton', 1]], at: [[10, 2], [18, 2], [11, 14]] },
  hints: [{ cells: [[4, 12], [4, 13], [4, 14]], after: 25, text: 'h_p2', done: { plateDown: 'P2' } }, { cells: [[2, 9], [3, 9]], after: 25, text: 'h_riddle', done: { open: 'G6' } },
    { cells: [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [2, 6], [3, 6], [4, 6]], after: 30, text: 'h_weight', done: { open: 'G7' } }, { cells: [[10, 14], [11, 14], [12, 14]], after: 25, text: 'h_levers', done: { open: 'G5' } }],
  waypoints: [['F2 Landing', 2, 1, 1], ['F2 Workshop', 10, 2, 1], ['F2 Clock Hall', 18, 3, 0], ['F2 Endless Hall', 19, 6, 2], ['F2 Spinner Room', 19, 13, 3], ['F2 Lock Room', 11, 14, 2], ['F2 Pit Run', 4, 13, 0],
    ['F2 Weight Hall', 3, 6, 0], ['F2 Antechamber', 8, 6, 1], ['F2 Vault', 12, 7, 0]],
  areas: { workshop: [8, 1, 12, 3], clock: [16, 1, 20, 4], endless: [19, 5, 19, 12], spinner: [17, 13, 20, 15], lockroom: [9, 13, 13, 15], pitrun: [4, 9, 4, 14], weight: [1, 4, 5, 7], vault: [11, 5, 14, 8] }
};

B.FLOORS.f3 = {
  name: 'The Gloam Deeps', card: 'The stone here is black and warm, and it watches you.', song: 'gloam', step: 'dust', over: 'The Lidless close their eyes over you.',
  look: { ground: ['#2a2434', '#1a1622', '#3a3248'], groundStyle: 'plain', side: 'block', color: '#2e2838', fog: ['#040306', 20, 130], ambient: ['#3a3a5a', '#141220', 1.7], torch: '#9ab8ff' },
  map: [
    '########################',
    '#<########....#.......##',
    '#@########....#.......##',
    '#.########............##',
    '#.....####....#.......##',
    '#.....######U##.......##',
    '#.....######>######L####',
    '#.....###.###.###.#.####',
    '#...................####',
    '###########.#######.####',
    '#########.....##.......#',
    '#########.....##.......#',
    '#############=#######=##',
    '#############.H........#',
    '#...################...#',
    '#.*.####################',
    '#<..####################',
    '########################'],
  start: [1, 2, 2],
  doors: { L3: [19, 6, { lock: 'boneKey', lk: 'warded' }], U1: [12, 5, { undergate: true }], G8: [13, 12], H2: [14, 13, { secret: true }], G9: [21, 12] },
  feats: [
    ['N8', 'plaque', 3, 4, 'N', { text: 'n8' }],
    ['C1', 'candle', 16, 1, 'N'], ['C2', 'candle', 16, 5, 'S'], ['C3', 'candle', 18, 1, 'N'], ['C4', 'candle', 18, 5, 'S'], ['C5', 'candle', 20, 1, 'N'], ['C6', 'candle', 20, 5, 'S'],
    ['N9', 'plaque', 11, 4, 'S', { text: 'n9' }], ['UG', 'undergate', 12, 4, 'S'], ['LV3', 'lever', 13, 11, 'E'], ['LV4', 'lever', 22, 10, 'N'],
    ['AL5', 'alcove', 22, 14, 'E', { holds: ['ironWard'], text: 'x_reliquary' }],
    ['t1', 'torch', 1, 6, 'W'], ['t2', 'torch', 9, 10, 'W'], ['t3', 'torch', 16, 11, 'W'], ['t4', 'torch', 10, 1, 'N'],
    ['e1', 'eyeRelief', 5, 6, 'E'], ['e2', 'eyeRelief', 12, 1, 'N'], ['e3', 'eyeRelief', 15, 2, 'W'], ['e4', 'eyeRelief', 10, 11, 'S'], ['e5', 'eyeRelief', 21, 3, 'E'], ['e6', 'eyeRelief', 7, 8, 'S'], ['e7', 'eyeRelief', 15, 8, 'S'], ['e8', 'eyeRelief', 18, 13, 'S']],
  wires: [
    { when: { sequence: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'] }, once: true, do: [['give', 'robeOfTheLintel', [18, 3]], ['special', 'sq3'], ['msg', 'm_candles']], fail: [['candlesOut'], ['msg', 'm_gutter']] },
    { when: { lever: 'LV3' }, once: true, do: [['open', 'G8'], ['story', 'veil']] },
    { when: { flag: 'veilHelped' }, once: true, do: [['open', 'H2'], ['msg', 'm_moss']] },
    { when: { lever: 'LV4' }, once: true, do: [['open', 'G9'], ['msg', 'm_click']] },
    { when: { flag: 'veilRefused' }, once: true, do: [['spawn', 'warden', [17, 11], 2]] },
    { when: { enter: [3, 8] }, once: true, do: [['hint', 'h_gauntlet']] },
    { when: { enter: [15, 3] }, once: true, do: [['hint', 'h_candles']] }
  ],
  items: [[1, 8, 'boneKey'], [5, 4, 'seersPsalm'], [2, 5, 'sc_forkedLightning'], [4, 8, 'potionAntidote'], [3, 6, 'bone'], [3, 6, 'bone'], [13, 7, 'heavyCrossbow'], [17, 7, 'bolts', 10],
    [21, 5, 'sc_blazingOrb'], [15, 1, 'potionHealing'], [13, 1, 'ironRation'], [13, 1, 'wandSparks'], [9, 11, 'ration'], [9, 11, 'ration'], [13, 10, 'quickstepBoots'],
    [22, 11, 'wardensBlade'], [16, 10, 'potionHealing'], [16, 10, 'potionHealing'], [20, 10, 'ration'], [20, 10, 'ration'], [20, 14, 'scrollRaising'], [22, 13, 'bracersOfDefense'], [21, 14, 'ironRation'], [3, 16, 'ration']],
  mons: [[4, 6, 'hound', 2], [19, 8, 'seer', 2], [18, 2, 'gazer', 2], [20, 4, 'seer', 1], [11, 2, 'hound', 1, { asleep: true }], [11, 10, 'warden', 2], [18, 10, 'warden', 2], [21, 11, 'warden', 2], [17, 13, 'gazer', 1]],
  npcs: [['veil', 13, 13, 2]],
  stairs: { '1,1': { to: 'f2', at: [13, 8, 3] }, '12,6': { to: 'f4', at: [6, 11, 0] }, '1,16': { to: 'f2', at: [6, 10, 2], ladder: true } },
  arrive: { f2: [1, 2, 2], f4: [12, 4, 0] },
  safe: [[1, 14, 3, 16]],
  wander: { budget: 4, groups: [['hound', 1], ['gazer', 2]], at: [[3, 6], [11, 10], [19, 10]] },
  hints: [{ cells: [[15, 1], [16, 1], [17, 1], [18, 1], [19, 1], [20, 1], [21, 1], [15, 5], [16, 5], [18, 5], [20, 5], [21, 5]], after: 35, text: 'h_psalm', done: { flag: 'sq3' } }],
  waypoints: [['F3 Ossuary', 3, 6, 1], ['F3 Gauntlet', 8, 8, 1], ['F3 Chapel', 18, 4, 0], ['F3 Undergate', 12, 4, 2], ['F3 Penance', 11, 10, 2], ['F3 Barracks', 18, 10, 1], ['F3 Reliquary', 21, 13, 1], ['F3 Sump', 2, 15, 0]],
  areas: { ossuary: [1, 4, 5, 8], gauntlet: [6, 8, 19, 8], chapel: [15, 1, 21, 5], undergate: [10, 1, 13, 4], penance: [9, 10, 13, 11], barracks: [16, 10, 22, 11], reliquary: [20, 13, 22, 14], tunnel: [15, 13, 19, 13] }
};

B.FLOORS.f4 = {
  name: "The Eye's Vault", card: 'The air hums like a struck bell.', song: 'vault', step: 'stone', over: 'The Eye keeps you, as it keeps everything.',
  look: { ground: ['#3a3e46', '#2a2e36', '#4a4e58'], groundStyle: 'tiles', runes: true, side: 'block', color: '#30343c', fog: ['#020204', 30, 200], ambient: ['#2a3040', '#0c0e14', 1.4], torch: '#8ae0ff' },
  map: [
    '#############',
    '###.......###',
    '###.#...#.###',
    '###...B...###',
    '###.#...#.###',
    '###.......###',
    '######=######',
    '####.....####',
    '####.....####',
    '######.######',
    '######.######',
    '######@######',
    '######<######',
    '#############'],
  start: [6, 11, 0],
  doors: { G10: [6, 6] },
  feats: [['N10', 'plaque', 4, 8, 'W', { text: 'n10' }], ['GL1', 'greatLock', 3, 3, 'W'], ['GL2', 'greatLock', 9, 3, 'E'], ['GL3', 'greatLock', 6, 1, 'N'],
    ['t1', 'torch', 8, 7, 'E'], ['t2', 'torch', 4, 7, 'W']],
  wires: [
    { when: { killed: ['golemA', 'golemB'] }, once: true, do: [['open', 'G10'], ['msg', 'm_vaultdoor']] },
    { when: { enter: [6, 7] }, once: true, do: [['hint', 'h_golems']] }
  ],
  items: [],
  mons: [[6, 9, 'gazer', 2], [5, 7, 'golem', 1, { id: 'golemA', fixed: ['potionGreaterHealing'] }], [7, 7, 'golem', 1, { id: 'golemB' }], [6, 3, 'boltholder', 1, { id: 'eye' }]],
  stairs: { '6,12': { to: 'f3', at: [12, 4, 0] } },
  arrive: { f3: [6, 11, 0] },
  safe: [],
  wander: { budget: 0, groups: [], at: [] },
  hints: [],
  waypoints: [['F4 Approach', 6, 10, 0], ['F4 Antechamber', 6, 8, 0], ['F4 Arena', 6, 5, 0]],
  areas: { arena: [3, 1, 9, 5], ante: [4, 7, 8, 8] },
  boss: { at: [6, 3], locks: ['GL1', 'GL2', 'GL3'], stair: 'GL3' }
};

/* ---- THE RAT RUN: the race floor (a solo time trial against your best ghost, and the AI Hub ghost race) ---- */
B.FLOORS.race = {
  name: 'The Rat Run', card: 'Out of the drains, fastest first.', song: 'race', step: 'wet', race: true, over: 'The rats have the run of it now.',
  look: { ground: ['#3e4a44', '#2a332f', '#55615a'], water: '#1e3a30', side: 'brick', color: '#4a5048', fog: ['#06080a', 30, 180], ambient: ['#5a6a6a', '#1a201e', 1.8], torch: '#ffb070' },
  map: [
    '##############',
    '#....L...###>#',
    '#....###.###.#',
    '#....###.###.#',
    '#....###.###=#',
    '#....###.P...#',
    '#=######.....#',
    '#.#.##.#######',
    '#.#.##.#######',
    '#......#######',
    '#@############',
    '##############'],
  start: [1, 10, 0],
  water: [[1, 9, 6, 9]],
  doors: { RG1: [1, 6], RL: [5, 1, { lock: 'ironKey', lk: 'simple' }], RG2: [12, 4] },
  plates: { RP: [9, 5, 'hold'] },
  feats: [['RLV', 'lever', 1, 8, 'E'], ['RAL', 'alcove', 1, 2, 'W', { holds: ['ironKey'] }], ['t1', 'torch', 4, 1, 'N'], ['t2', 'torch', 12, 5, 'E'], ['t3', 'torch', 6, 9, 'S'], ['d1', 'grate', 2, 9, 'S']],
  wires: [
    { when: { lever: 'RLV' }, once: true, do: [['open', 'RG1'], ['checkpoint', 'lever']] },
    { when: { plate: 'RP' }, mode: 'hold', do: [['open', 'RG2']] }
  ],
  items: [[11, 6, 'rock'], [3, 7, 'ratCrown'], [6, 7, 'ratCrown'], [4, 9, 'ratCrown'], [1, 1, 'ratCrown'], [4, 5, 'ratCrown'], [10, 6, 'ratCrown']],
  mons: [[3, 3, 'rat', 3, { group: 'ratroom' }], [2, 5, 'rat', 2, { group: 'ratroom' }], [8, 3, 'latchkin', 2], [5, 9, 'rat', 2]],
  stairs: { '12,1': { finish: true } },
  arrive: {},
  safe: [],
  wander: { budget: 0, groups: [], at: [] },
  hints: [],
  waypoints: [['Rat Run', 1, 10, 0]],
  areas: { ratroom: [1, 1, 4, 5] }
};

/* ---- the walkthroughs: what the bot (tests, attract, Dev auto-play) does, in order. Steps:
 *   ['go', x, y] walk there (fighting on the way)   ['use', x, y, face] stand, face and use   ['take', x, y, id] pick it up
 *   ['clear', area] kill what is in an area          ['put', x, y, face, id] stand, face, put the item down ahead
 *   ['throw', x, y, face, id] throw it from there    ['place', x, y, face, id] put it into the alcove ahead
 *   ['choose', i] answer the dialogue               ['cast', spell, who]   ['read', id]   ['equip', id, slot]
 *   ['rest']   ['wait', s]   ['fill', ids] fill the gear niches   ['insert', x, y, face, id] a key or ward into what is ahead ---- */
B.FLOORS.f1.walk = [
  ['take', 2, 13, 'rustyDagger'], ['take', 2, 12, 'rock'], ['use', 2, 11, 'E'], ['go', 2, 9], ['clear', 'channel'], ['use', 1, 6, 'W'],
  ['take', 3, 8, 'leatherCap'], ['equip', 'leatherCap', 'head'], ['take', 1, 5, 'slingStones'],
  ['go', 2, 4], ['clear', 'den'], ['take', 1, 1, 'ironKey'], ['take', 5, 1, 'darts'], ['use', 5, 2, 'E'], ['choose', 0],
  ['go', 8, 7], ['clear', 'junction'], ['use', 9, 5, 'N'], ['take', 8, 3, 'potionHealing'], ['take', 8, 3, 'sc_wardOfBrass'],
  ['put', 13, 6, 'E', 'rock'], ['go', 16, 6], ['go', 17, 4], ['use', 17, 4, 'N'], ['go', 17, 2], ['clear', 'snick'], ['takeAll', 'snick'], ['equip', 'amuletOfVigor', 'neck'],
  ['take', 13, 1, 'leatherArmor'], ['take', 20, 2, 'bolts'],
  ['go', 10, 8], ['use', 10, 8, 'S'], ['go', 9, 10], ['clear', 'lair'], ['take', 9, 11, 'ratKingsCrown'], ['take', 10, 12, 'ration'],
  ['place', 4, 5, 'N', 'ratKingsCrown'], ['take', 4, 5, 'ringOfMending', 'N'], ['equip', 'ringOfMending', 'ring1'],
  ['go', 12, 9], ['go', 13, 10], ['clear', 'sluice'], ['buttons'], ['take', 19, 10, 'potionHealing'],
  ['go', 19, 12], ['clear', 'cistern'], ['take', 20, 12, 'ironRation'], ['take', 14, 12, 'sc_sparkDart'], ['restIfLow'],
  ['use', 15, 13, 'S'], ['go', 15, 15]
];
B.FLOORS.f2.walk = [
  ['go', 6, 1], ['clear', 'workshop'], ['take', 9, 1, 'tumblerGear'], ['take', 12, 3, 'gearKey'], ['take', 8, 1, 'sc_featherStep'], ['take', 10, 3, 'guildLedger'], ['use', 8, 3, 'S'],
  ['scribeAll'], ['use', 12, 2, 'E'], ['go', 16, 2], ['clear', 'clock'], ['answerAll'], ['take', 16, 4, 'sc_unlatch'], ['take', 20, 3, 'potionHealing'], ['scribeAll'],
  ['go', 19, 5], ['clear', 'endless'], ['take', 19, 6, 'tumblerGear', 'W'], ['use', 19, 8, 'E'], ['go', 19, 12],
  ['go', 19, 13], ['go', 18, 13], ['go', 17, 13], ['go', 17, 14], ['clear', 'spinner'], ['take', 20, 15, 'tumblerGear'], ['take', 17, 15, 'chainShirt'],
  ['go', 15, 14], ['clear', 'lockroom'], ['answerAll'], ['take', 9, 15, 'tumblersPick'], ['use', 10, 15, 'S'], ['use', 12, 15, 'S'], ['answerAll'], ['choose', 0], ['takeAll', 'durgan'],
  ['go', 17, 14], ['go', 19, 12], ['fill', ['CN1', 'CN2', 'CN3', 'CN4']], ['take', 18, 1, 'tumblerwrightsGoggles', 'N'], ['equip', 'tumblerwrightsGoggles', 'head'],
  ['go', 4, 14], ['clear', 'pitrun'], ['take', 4, 13, 'rock'], ['throw', 4, 12, 'N', 'rock'], ['wait', 1], ['go', 4, 10], ['go', 3, 9],
  ['take', 3, 9, 'bentKey'], ['use', 3, 9, 'N'], ['place', 2, 9, 'W', 'bentKey'], ['go', 2, 7], ['clear', 'weight'], ['take', 1, 7, 'wandUnlatching'], ['take', 5, 7, 'ironIngot'],
  ['put', 4, 6, 'N', 'ironIngot'], ['go', 2, 5], ['wait', 1], ['go', 7, 6], ['use', 8, 5, 'N'], ['unlatch', 9, 6, 'E'], ['go', 11, 6], ['clear', 'vault'], ['answerAll'],
  ['take', 14, 6, 'brassWard', 'E'], ['take', 13, 5, 'lockbreaker'], ['take', 14, 5, 'ironRation'], ['take', 11, 5, 'scrollRaising'], ['take', 12, 8, 'sc_frostbite'], ['scribeAll'], ['restIfLow'], ['go', 14, 8]
];
B.FLOORS.f3.walk = [
  ['go', 1, 4], ['clear', 'ossuary'], ['take', 1, 8, 'boneKey'], ['take', 5, 4, 'seersPsalm'], ['take', 2, 5, 'sc_forkedLightning'], ['take', 4, 8, 'potionAntidote'], ['scribeAll'], ['restIfLow'],
  ['gauntlet'], ['clear', 'gauntlet'], ['take', 13, 7, 'heavyCrossbow'], ['take', 17, 7, 'bolts'], ['use', 19, 7, 'N'], ['go', 19, 5], ['clear', 'chapel'], ['take', 21, 5, 'sc_blazingOrb'], ['scribeAll'],
  ['candles'], ['take', 18, 3, 'robeOfTheLintel'], ['equip', 'robeOfTheLintel', 'body'],
  ['go', 12, 3], ['clear', 'undergate'], ['take', 13, 1, 'wandSparks'], ['take', 13, 1, 'ironRation'], ['use', 11, 4, 'S'], ['insert', 12, 4, 'S', 'copperWard'], ['insert', 12, 4, 'S', 'brassWard'], ['restIfLow'],
  ['go', 11, 8], ['go', 11, 9], ['clear', 'penance'], ['take', 13, 10, 'quickstepBoots'], ['use', 13, 11, 'E'], ['veil'],
  ['reliquary'], ['take', 22, 14, 'ironWard', 'E'], ['take', 22, 13, 'bracersOfDefense'], ['take', 20, 14, 'scrollRaising'],
  ['go', 12, 3], ['insert', 12, 4, 'S', 'ironWard'], ['wait', 11], ['restIfLow'], ['go', 12, 6]
];
B.FLOORS.f4.walk = [
  ['go', 6, 10], ['clear', 'approach'], ['use', 4, 8, 'W'], ['go', 6, 8], ['clear', 'ante'], ['restIfLow'], ['go', 6, 6], ['boss'], ['use', 6, 1, 'N']
];
B.FLOORS.race.walk = [
  ['use', 1, 8, 'E'], ['go', 1, 6], ['clear', 'ratroom'], ['take', 1, 2, 'ironKey', 'W'], ['use', 4, 1, 'E'], ['go', 8, 2], ['clearNear'], ['take', 11, 6, 'rock'], ['put', 10, 5, 'W', 'rock'], ['go', 12, 3], ['go', 12, 1]
];
B.FLOORS.f4.areas.approach = [6, 9, 6, 10];
