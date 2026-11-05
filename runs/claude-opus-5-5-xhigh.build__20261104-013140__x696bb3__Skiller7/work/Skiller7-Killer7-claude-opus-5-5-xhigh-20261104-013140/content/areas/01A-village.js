/* TARGET 01 · 01A OBERGLÜCK, THE VILLAGE (§11.7): dusk, snow, timber chalets, the Glühwein market, the frozen fountain,
 * the church whose bell (Ignaz, far) shakes the drift off the lift station, the turnstile (Rurik) to the T-bar, the
 * ski school (Murmel), the Delegate Gate to the gondola (three Edelweiss), and the Palais gate. */
const chalet = (x0, y0, x1, y1, h = 5) => [x0, y0, x1, y1, h];
S7.area('01A', {
  title: 'OBERGLÜCK', sub: 'THE VILLAGE', target: 1, music: 'village', ambience: 'wind', outdoor: true, pinNo: 3,
  world: { kind: 'level', w: 84, h: 46, wallH: 5,
    rooms: [[2, 2, 82, 44]],
    walls: [chalet(3, 26, 13, 41, 9), chalet(2, 4, 12, 10, 6), [5, 10, 8, 13, 14], chalet(20, 4, 30, 12), chalet(47, 6, 56, 12), chalet(20, 20, 30, 28), chalet(20, 36, 30, 44), chalet(46, 37, 53, 44), chalet(68, 9, 80, 13), chalet(67, 20, 80, 30), chalet(55, 35, 61, 40)],
    ground: 'snow', colors: { base: '#e6ecf6', dark: '#b8c4da', light: '#ffffff' }, side: 'planks', wallColor: '#6a4428', wallTop: '#f4f8ff', wallLine: '#3a2414',
    sky: ['#1e1c3a', '#d88a60'], fog: { color: '#4a3a58', near: 380, far: 1500 }, ambient: ['#8a8ab0', '#4a3a40', 1.25], lights: 6,
    sun: { color: '#ffb070', intensity: 1.7, dir: [.85, .25, -.38], shadow: true }, snow: 420, wind: [.5, .15], postcard: ['#2a2450', '#c87a5a'] },
  nodes: {
    ht: { t: [16.5, 32.5], kind: 'stop', label: 'GRAND HOTEL STEPS' },
    ls: { t: [40.5, 32.5], kind: 'junction', label: 'LIFT SQUARE' },
    tq: { t: [50.5, 32.5], kind: 'stop', label: 'T-BAR QUEUE' },
    tb: { t: [62.5, 32.5], kind: 'exit', label: 'T-BAR', to: ['01C', 'tbot'], open: true },
    f2: { t: [40.5, 24.5], kind: 'junction', label: 'FOUNTAIN' },
    f1: { t: [40.5, 16.5], kind: 'junction', label: 'FOUNTAIN' },
    pg: { t: [40.5, 4.5], kind: 'exit', label: 'PALAIS DES NEIGES', to: ['01B', 'e1'], open: true },
    ch: { t: [16.5, 16.5], kind: 'stop', label: 'CHURCH SQUARE' },
    mk: { t: [62.5, 16.5], kind: 'junction', label: 'MARKET' },
    r7a: { t: [77.5, 16.5], kind: 'door', label: 'ROOM 7 · BAKERY' },
    mu: { t: [62.5, 24.5], kind: 'stop', label: 'SKI SCHOOL' },
    gg: { t: [40.5, 41.5], kind: 'exit', label: 'HIMMELSBAHN', to: ['01D', 'gs'], open: true }
  },
  edges: [
    { a: 'ht', b: 'ls' }, { a: 'ls', b: 'tq', gate: 'drift' }, { a: 'tq', b: 'tb', gate: 'turnstile' },
    { a: 'ls', b: 'f2' }, { a: 'f2', b: 'f1', via: [[44, 20.5]] }, { a: 'f1', b: 'ch' }, { a: 'f1', b: 'mk' }, { a: 'mk', b: 'r7a' }, { a: 'mk', b: 'mu' }, { a: 'f2', b: 'mu' },
    { a: 'f1', b: 'pg' }, { a: 'ls', b: 'gg', gate: 'delegate' }
  ],
  gates: {
    drift: { kind: 'flag', flag: 'churchBell', label: 'BURIED', solver: 'ignaz', line: 'The lift station is buried under a roof of snow. Something has to shake it loose.' },
    turnstile: { kind: 'buyout', price: 40, solver: 'rurik', label: 'TURNSTILE · 40 RED' },
    delegate: { kind: 'delegate', label: 'DELEGATES ONLY', beat: 'delegate_gate' }
  },
  spots: [
    { id: 'door7', kind: 'door7', node: 'r7a', label: 'Room 7 · the bakery' },
    { id: 'murmel', kind: 'murmel', node: 'mu', label: 'Murmel' },
    { id: 'pim', kind: 'pim', at: [43.5, 20.5], talk: 'pim_01A', label: 'Pim', reach: 3.4 },
    { id: 'pin3', kind: 'pin', pin: 3, edge: 'f2-f1', s: .5 },
    { id: 'phone', kind: 'phone', at: [38.6, 40.6], talk: 'concierge_gate', label: 'Phone booth', reach: 2.8 },
    { id: 'v1', kind: 'tableau', at: [14.5, 15], who: 'villager', label: 'A frozen villager', line: 'It hasn\'t stopped snowing since Grandmother was a girl.', reach: 3 },
    { id: 'v2', kind: 'tableau', at: [18.5, 18.2], who: 'villager', label: 'A frozen villager', line: 'The Föhn came through Tuesday. My husband laughed until he wasn\'t there.', reach: 3 },
    { id: 'v3', kind: 'tableau', at: [64.5, 22.6], who: 'villager', label: 'A frozen ski instructor', line: 'Bend the knees. Bend the truth. Same muscles.', reach: 3 },
    { id: 'price', kind: 'dossier', dossier: 'pricelist', node: 'mu' },
    { id: 'rime1', kind: 'rime', n: 4, edge: 'f1-ch', s: .3 },
    { id: 'rime2', kind: 'rime', n: 4, edge: 'mk-r7a', s: .6 },
    { id: 'red1', kind: 'red', n: 12, edge: 'ht-ls', s: .5 },
    { id: 'red2', kind: 'red', n: 10, edge: 'f1-mk', s: .4 },
    { id: 'red3', kind: 'red', n: 10, edge: 'mk-mu', s: .5 },
    { id: 'bell', kind: 'far', target: true, far: true, at: [6.5, 13.3], atZ: 11.6, r: 1.5, beat: 'church_bell', label: 'THE CHURCH BELL' },
    { id: 'hotel', kind: 'sign', node: 'ht', line: 'The Grand Hotel Nada. The bellcaptain\'s post is empty. Somebody has already hung a black ribbon on it.' },
    { id: 'gate', kind: 'sign', at: [40.5, 39.5], line: 'HIMMELSBAHN — DELEGATES ONLY. Three Edelweiss passes, please. The slots are shaped like flowers.', reach: 2.6 }
  ],
  spawns: { m1: [60.5, 19.5], m2: [66.5, 15.5], m3: [58.5, 14.5], mplow: [70.5, 16.5], mroof: [51.5, 9], c1: [12.5, 18.5], c2: [20.5, 14.5], sl1: [56.5, 30], sl2: [60.5, 34.5], h1: [30.5, 33], h2: [34.5, 30] },
  waves: {
    market: { spawn: [['giggler', 'm1', 0], ['giggler', 'm2', 1], ['plow', 'mplow', 1.5], ['snowballer', 'mroof', 0, { z: 58 }], ['giggler', 'm3', 3]] },
    church: { spawn: [['twins', 'c1', 0], ['twins', 'c2', 1.5]] },
    sleds: { spawn: [['tobogganer', 'sl1', 0], ['tobogganer', 'sl2', 1.2], ['giggler', 'sl1', 3]] },
    hotel: { spawn: [['giggler', 'h1', 0], ['bellboy', 'h2', 1]] }
  },
  triggers: [
    { id: 'market', node: 'mk', wave: 'market' },
    { id: 'church', node: 'ch', wave: 'church' },
    { id: 'sleds', node: 'tq', wave: 'sleds', flag: 'churchBell' },
    { id: 'hotel', edge: 'ht-ls', s: .6, wave: 'hotel' },
    { id: 'lookout', node: 'mk', tut: 'longlook', flag: 'driftSeen' },
    { id: 'drift', node: 'ls', set: 'driftSeen' },
    { id: 'pim', node: 'f1', beat: 'pim_01A_seen' }
  ],
  props: [
    ['shape', 'S7:church-tower', 6.5, 11.5, 0, {}],
    ['shape', 'S7:chalet-roof', 7, 7, 6, { params: { w: 160, d: 96 } }],
    ['shape', 'S7:chalet-roof', 25, 8, 5, { params: { w: 160, d: 128 } }], ['shape', 'S7:chalet-roof', 51.5, 9, 5, { params: { w: 144, d: 96 } }],
    ['shape', 'S7:chalet-roof', 25, 24, 5, { params: { w: 160, d: 128 } }], ['shape', 'S7:chalet-roof', 25, 40, 5, { params: { w: 160, d: 128 } }],
    ['shape', 'S7:chalet-roof', 49.5, 40.5, 5, { params: { w: 112, d: 112 } }], ['shape', 'S7:chalet-roof', 74, 11, 5, { params: { w: 192, d: 64 } }],
    ['shape', 'S7:chalet-roof', 73.5, 25, 5, { params: { w: 208, d: 160 } }], ['shape', 'S7:chalet-roof', 58, 37.5, 5, { params: { w: 96, d: 80 } }],
    ['shape', 'S7:chalet-roof', 8, 33.5, 9, { params: { w: 160, d: 240 } }],
    ['shape', 'S7:fountain-frozen', 40.5, 20.5, 0, {}],
    ['shape', 'S7:gluehwein-stall', 58.5, 13.5, 0, { facing: Math.PI / 2 }], ['shape', 'S7:gluehwein-stall', 66.5, 19.5, 0, { facing: -Math.PI / 2 }], ['shape', 'S7:gluehwein-stall', 70.5, 13.5, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:phone-booth', 38.6, 41, 0, {}],
    ['shape', 'S7:ski-rack', 64.5, 21.5, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:lift-hut', 58, 37.5, 0, {}],
    ['shape', 'S7:turnstile', 55.5, 32.5, 0, {}],
    ['shape', 'kenney-holiday:tree-decorated-snow', 44.5, 27.5, 0, { scale: 2.2 }], ['shape', 'kenney-holiday:tree-snow-b', 33.5, 14, 0, { scale: 2.4 }], ['shape', 'kenney-holiday:tree-snow-c', 14, 22.5, 0, { scale: 2.4 }],
    ['shape', 'kenney-holiday:snowman-hat', 34, 30, 0, { scale: 1.8, facing: .4 }], ['shape', 'kenney-holiday:sled-long', 46, 28.5, 0, { scale: 1.4 }], ['shape', 'kenney-holiday:snow-pile', 31.5, 18, 0, { scale: 2 }],
    ['shape', 'kenney-holiday:bench', 36.5, 23, 0, { scale: 1.6, facing: Math.PI / 2 }], ['shape', 'kenney-holiday:cabin-fence', 30.5, 34.5, 0, { scale: 1.6 }],
    ['thing', 'drift', 47.5, 32.5, 0], ['thing', 'stringlights', 56, 15, 4.2, { dx: 16, dy: 0, n: 14 }], ['thing', 'stringlights', 40.5, 8, 4.2, { dx: 0, dy: 10, n: 10 }],
    ['thing', 'fire', 58.5, 14.5, .2], ['thing', 'fire', 66.5, 18.5, .2], ['thing', 'fire', 70.5, 14.5, .2],
    ['thing', 'gateslots', 40.5, 39.8, 0],
    ['light', 58.5, 14.5, 1.2, { color: '#ff9040', reach: 140, power: 3, flicker: .25 }], ['light', 66.5, 18.5, 1.2, { color: '#ff9040', reach: 140, power: 3, flicker: .25 }],
    ['light', 40.5, 20.5, 4, { color: '#ffd8a0', reach: 200, power: 2 }], ['light', 16.5, 32.5, 4, { color: '#ffd8a0', reach: 160, power: 2.2 }],
    ['light', 77.5, 16.5, 3, { color: '#ffe0b0', reach: 120, power: 2 }], ['light', 40.5, 40, 3.5, { color: '#c0d0ff', reach: 140, power: 1.8 }]
  ],
  people: [{ who: 'murmel', at: [63.4, 22.6], z: .4 }, { who: 'pim', at: [43.5, 20.5], z: 1.4 },
    { who: 'villager', at: [14.5, 15], pose: 'wave', facing: .4 }, { who: 'villager', at: [18.5, 18.2], pose: 'hips', facing: -2.4 }, { who: 'villager', at: [64.5, 22.6], pose: 'crouch', facing: 2.6 }]
});
