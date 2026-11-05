/* SKILLER7 content — Target 01 "Après": Oberglück, the Palais des Neiges, the Black Run, the Himmelsbahn, the Glacier
 * Archive, the Summit. Terrain areas give a height function (engine units in and out) shared by the sim and the 3D world. */
const B1 = S7.buildRows;
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const snowColor = tint => (x, y, z, nz, out) => {
  const n = E.noise2(x / 300, y / 300), f = E.noise2(x / 41, y / 41), k = .86 + f * .1 + n * .05, steep = sstep(.92, .7, nz);
  out[0] = (238 - steep * 60) * k * tint[0]; out[1] = (242 - steep * 52) * k * tint[1]; out[2] = (250 - steep * 30) * k * tint[2]; return out;
};

/* ---- 01A OBERGLÜCK, THE VILLAGE (96 x 48; snow; dusk; chalets as walls; the church tower 80 m from the lookout) ---- */
S7.area('01A', {
  title: 'OBERGLÜCK', sub: 'THE VILLAGE', target: 1, music: 'village', ambience: 'village', start: 'ht', accent: '#c8302a', snow: .7, wind: .3,
  world: {
    level: {
      rows: B1(96, 48, [
        ['fill', 3, 12, 92, 16, '.'], ['fill', 30, 2, 34, 45, '.'], ['fill', 8, 30, 62, 34, '.'], ['fill', 44, 9, 60, 18, '.'], ['fill', 7, 8, 18, 20, '.'],
        ['fill', 26, 27, 42, 37, '.'], ['fill', 50, 16, 54, 25, '.'], ['fill', 28, 37, 36, 46, '.'], ['fill', 1, 9, 5, 19, 'C'], ['fill', 6, 13, 7, 15, 'B'],
        ['fill', 36, 24, 40, 26, 'L'], ['fill', 0, 0, 95, 0, 'X'], ['fill', 0, 47, 95, 47, 'X'], ['fill', 0, 0, 0, 47, 'X'], ['fill', 95, 0, 95, 47, 'X']
      ], 'H'),
      legend: { H: { wall: 80 }, C: { wall: 128 }, B: { wall: 200 }, L: { wall: 64 }, X: { wall: 160 } },
      ground: 'snow', colors: { base: '#e8ecf4', dark: '#9aa4c0', light: '#ffffff' }, side: 'earth', color: '#5a4636', wallSide: 'planks'
    },
    sky: ['#2a2440', '#e8a070'], fog: { color: '#b88a80', near: 300, far: 1500 }, ambient: ['#b0a0c0', '#5a4a50', 1.3], sun: { color: '#ffb070', intensity: 2.4, dir: [.8, .25, -.35] },
    torchLights: 3, torchShadows: 0, lights: 6, glowLights: 6, overlay: { fov: 62 }, filter: { bands: 3, ink: 1, inkW: 1.4, punch: 1.3 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    ht: { t: [14.5, 32.5], kind: 'stop', label: 'HOTEL STEPS' }, ls: { t: [32.5, 32.5], label: 'LIFT STATION' }, f2: { t: [32.5, 23.5] }, f1: { t: [32.5, 14.5] },
    ch: { t: [11.5, 14.5], kind: 'stop', label: 'CHURCH SQUARE' }, mk: { t: [52.5, 14.5], label: 'THE MARKET' }, mu: { t: [52.5, 23.5], kind: 'stop', label: 'SKI SCHOOL' },
    r7a: { t: [70.5, 14.5], kind: 'door', label: 'ROOM 7' }, lk: { t: [88.5, 14.5], kind: 'stop', label: 'THE LOOKOUT' },
    pg: { t: [32.5, 3.2], kind: 'exit', open: true, label: 'PALAIS DES NEIGES', to: ['01B', 'e1'] },
    tq: { t: [43.5, 32.5], kind: 'stop', label: 'TURNSTILE' }, tb: { t: [58.5, 32.5], kind: 'exit', open: true, label: 'T-BAR', to: ['01C', 'tbB'] },
    gq: { t: [32.5, 39.5], kind: 'stop', label: 'DELEGATE GATE' }, gg: { t: [32.5, 45.0], kind: 'exit', open: true, label: 'HIMMELSBAHN', to: ['01D', 'gs'] }
  },
  edges: [
    { a: 'ht', b: 'ls' }, { a: 'ls', b: 'f2' }, { a: 'f2', b: 'f1' }, { a: 'f1', b: 'ch' }, { a: 'f1', b: 'mk' }, { a: 'f1', b: 'pg' }, { a: 'mk', b: 'mu' }, { a: 'mk', b: 'r7a' }, { a: 'r7a', b: 'lk' },
    { a: 'ls', b: 'tq', gate: 'drift' }, { a: 'tq', b: 'tb', gate: 'turnstile' }, { a: 'ls', b: 'gq' }, { a: 'gq', b: 'gg', gate: 'delegate' }
  ],
  gates: {
    drift: { kind: 'flag', flag: 'liftClear', line: 'The lift station is buried under its own roof. Something has to shake it loose.', hint: 'bell1' },
    turnstile: { kind: 'buyout', price: 40, who: 'rurik', line: 'A turnstile. Forty Red. Someone with means.', at: [44, 32.5, 1] },
    delegate: { kind: 'delegate', line: 'DELEGATES ONLY. Three Edelweiss slots.', at: [32.5, 41, 1] }
  },
  targets: [{ id: 'churchbell', at: [6.5, 14, 13.4], r: 1.4, far: true, flag: 'liftClear', beat: 'church_bell' }],
  spots: [
    { id: 'r7a', node: 'r7a', kind: 'room7', label: 'ROOM 7' }, { id: 'murmel1', node: 'mu', kind: 'npc', who: 'murmel', label: 'MURMEL' }, { id: 'doc_prices', edge: 'mk-mu', s: .7, kind: 'pickup', item: 'doc_prices' },
    { id: 'turnstile', node: 'tq', kind: 'gate', gate: 'turnstile', label: 'TURNSTILE' }, { id: 'delegate', node: 'gq', kind: 'gate', gate: 'delegate', label: 'DELEGATE GATE' },
    { id: 'booth', node: 'gq', kind: 'phone', beat: 'concierge_booth', once: true, label: 'PHONE BOOTH', r: 3 }, { id: 'pin3', edge: 'f2-f1', s: .5, kind: 'pickup', item: 'pin3' },
    { id: 'pim3', node: 'f1', kind: 'npc', who: 'pim', beat: 'pim3', once: true, label: 'THE LIFT BOY', r: 3 },
    { id: 'tab1', node: 'ch', kind: 'tableau', lines: 'village1', label: 'A FROZEN VILLAGER' }, { id: 'tab2', node: 'ls', kind: 'tableau', lines: 'village2', label: 'A FROZEN WOMAN' }, { id: 'tab3', node: 'mu', kind: 'tableau', lines: 'village3', label: 'THE SKI INSTRUCTOR', r: 1.2 },
    { id: 'lookout1', node: 'lk', kind: 'tableau', lines: 'lookout1', label: 'THE CHURCH TOWER' }, { id: 'rimeA1', edge: 'f1-ch', s: .6, kind: 'pickup', item: 'rime', n: 4 }, { id: 'rimeA2', edge: 'r7a-lk', s: .5, kind: 'pickup', item: 'rime', n: 4 },
    { id: 'redA1', edge: 'ht-ls', s: .5, kind: 'pickup', item: 'red5', n: 10 }, { id: 'redA2', edge: 'f1-mk', s: .4, kind: 'pickup', item: 'red5', n: 12 }, { id: 'redA3', edge: 'ls-gq', s: .5, kind: 'pickup', item: 'red5', n: 10 }
  ],
  spawns: { m1: [58.5, 10.5], m2: [46.5, 17.5], m3: [60.5, 17.5], mplow: [59.5, 14.5], mroof: [50.5, 8.5, 5], c1: [9.5, 9.5], c2: [9.5, 19.5], s1: [20.5, 31.5], s2: [40.5, 34.5], s3: [28.5, 28.5], k1: [80.5, 13.5], k2: [90.5, 15.5] },
  waves: {
    market: { spawn: [['giggler', 'm1', 0], ['giggler', 'm2', .8], ['plow', 'mplow', 1.6], ['giggler', 'm3', 2.6], ['snowballer', 'mroof', 0]] },
    church: { spawn: [['twins', 'c1', 0], ['twins', 'c2', 1.2]] }, square: { spawn: [['bellboy', 's1', 0], ['giggler', 's2', .6], ['giggler', 's3', 1.4]] }, lookout: { spawn: [['giggler', 'k1', 0], ['giggler', 'k2', 1.2]] }
  },
  triggers: [{ id: 'seven', node: 'ls', tip: 'seven' }, { id: 'market', node: 'mk', wave: 'market' }, { id: 'church', node: 'ch', wave: 'church' }, { id: 'square', edge: 'ls-gq', s: .3, wave: 'square', when: 'band' }, { id: 'lookoutW', node: 'lk', wave: 'lookout' }],
  props: [
    ['shape', 'gluehwein-stall', 47, 10, 0, { facing: Math.PI / 2 }], ['shape', 'gluehwein-stall', 57, 10, 0, { facing: Math.PI / 2 }], ['shape', 'gluehwein-stall', 47, 18, 0, { facing: -Math.PI / 2 }],
    ['shape', 'ski-rack', 50.5, 24.5, 0], ['shape', 'phone-booth', 34.5, 39.5, 0, { facing: Math.PI }], ['shape', 'turnstile', 44.5, 33.6, 0], ['shape', 'fountain', 36.5, 19.5, 0],
    ['shape', 'room7-door', 70.5, 11.9, 0, { facing: Math.PI / 2 }], ['shape', 'lamppost', 28.5, 14.5, 0], ['shape', 'lamppost', 36.5, 30, 0], ['shape', 'lamppost', 66, 16.5, 0], ['shape', 'lamppost', 20, 33.8, 0],
    ['shape', 'kenney-holiday:snowman', 24, 34, 0, { facing: -Math.PI / 2 }], ['shape', 'kenney-holiday:tree-snow-b', 10, 34, 0], ['shape', 'kenney-holiday:tree-snow-c', 42, 40, 0], ['shape', 'kenney-holiday:tree-snow-b', 22, 44, 0],
    ['shape', 'kenney-holiday:sled-long', 54, 30.5, 0], ['shape', 'bench', 13, 18, 0], ['shape', 'delegate-gate', 32.5, 41.5, 0],
    ['pen', 'string-lights', 44, 12, 4.4, { x1: 60 }], ['pen', 'string-lights', 44, 17, 4.4, { x1: 60 }], ['pen', 'church-bell', 6.5, 14, 13.4], ['pen', 'roof-drift', 38, 25, 4], ['pen', 'tbar-pylon', 58.5, 31, 0],
    ['light', 47, 10, 1.5, { color: '#ff9040', reach: 120, power: 14, flicker: .2 }], ['light', 57, 10, 1.5, { color: '#ff9040', reach: 120, power: 14, flicker: .2 }], ['light', 52, 14, 4, { color: '#ffd080', reach: 200, power: 16 }],
    ['light', 32.5, 23, 4, { color: '#ffd8a0', reach: 160, power: 12 }], ['light', 32.5, 39, 3, { color: '#ffe0b0', reach: 140, power: 12 }]
  ],
  people: [['murmel', 51.4, 24.6, 1.4, -Math.PI / 2, 'murmel'], ['pim', 33.5, 15.5, 4.2, Math.PI / 2, 'pimseat'], ['villager', 12.5, 16, 0, -1, 'frozen'], ['villager2', 31, 33.5, 0, 0, 'frozen'], ['instructor', 53.6, 24, 0, 2, 'frozen']]
});

/* ---- 01B PALAIS DES NEIGES (60 x 40; marble; glass; two delegation halls; the ballroom) ---- */
S7.area('01B', {
  title: 'PALAIS DES NEIGES', sub: 'THE SUMMIT CONFERENCE', target: 1, music: 'palais', ambience: 'roomtone', start: 'e1', interior: true, accent: '#3a6ac8',
  world: {
    level: {
      rows: B1(60, 40, [
        ['fill', 2, 18, 8, 22, '.'], ['fill', 9, 19, 16, 21, '.'], ['fill', 17, 15, 24, 25, '.'], ['fill', 20, 9, 22, 14, '.'], ['fill', 23, 7, 36, 13, '.'], ['fill', 37, 10, 37, 10, '.'],
        ['fill', 37, 9, 49, 11, '.'], ['fill', 50, 7, 56, 13, '.'], ['fill', 51, 14, 53, 15, '.'], ['fill', 44, 16, 58, 30, '.'], ['fill', 46, 16, 56, 17, '='], ['fill', 51, 31, 53, 37, '.'],
        ['fill', 19, 26, 21, 26, '.'], ['fill', 14, 27, 26, 33, '.'], ['fill', 12, 30, 13, 31, '.'], ['fill', 6, 32, 12, 38, '.'], ['fill', 25, 22, 29, 24, '.'], ['fill', 28, 25, 29, 26, '.'],
        ['fill', 28, 27, 40, 33, '.'], ['fill', 37, 34, 38, 34, '.'], ['fill', 36, 35, 42, 38, '.'], ['set', 11, 20, 'A'], ['set', 11, 18, 'A'], ['set', 11, 22, 'A'],
        ['set', 18, 16, 'P'], ['set', 23, 16, 'P'], ['set', 18, 24, 'P'], ['set', 23, 24, 'P'], ['fill', 18, 29, 22, 31, 'T'], ['fill', 32, 29, 36, 31, 'T']
      ]),
      legend: { '#': { wall: 96 }, '=': { floor: 16, side: 'block' }, P: { pillar: 96 }, A: { wall: 40 }, T: { wall: 12 } },
      ground: 'tiles', colors: { base: '#d8dce8', dark: '#4a5068', light: '#f0f2f8' }, side: 'block', color: '#3a4058', wallSide: 'block'
    },
    sky: '#04060c', fog: { color: '#0a0c14', near: 160, far: 800 }, ambient: ['#5a6890', '#10121a', 1.15], torchLights: 0, lights: 7, glowLights: 6, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.35 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    e1: { t: [4.5, 20.5], kind: 'stop', label: 'ENTRANCE' }, sc: { t: [12.5, 20.5], label: 'SECURITY' }, at: { t: [20.5, 20.5], label: 'ATRIUM' }, cf: { t: [20.5, 28.4], label: 'COASTAL HALL' },
    pr: { t: [9.5, 35.5], kind: 'stop', label: 'PRESS ROOM' }, sd: { t: [33.5, 27.8], label: 'STEPPE HALL' }, ck: { t: [39.5, 36.5], kind: 'door', label: 'CLOAKROOM' },
    hm: { t: [27.5, 10.5], label: 'HALL OF MIRRORS' }, hw: { t: [35.5, 10.5], kind: 'stop', label: 'THE MIRROR WALL' }, sp: { t: [44.5, 10.5], label: 'SERVANTS\' PASSAGE' }, bb: { t: [52.5, 10.5], label: 'BACKSTAGE' },
    br: { t: [51.5, 28.4], kind: 'stop', label: 'THE BALLROOM' }, bx: { t: [52.5, 37.0], kind: 'exit', open: true, label: 'BACK EXIT', to: ['01A', 'f1'] }, e0: { t: [2.5, 20.5], kind: 'exit', open: true, label: 'TO THE VILLAGE', to: ['01A', 'pg'] }
  },
  edges: [
    { a: 'e0', b: 'e1' }, { a: 'e1', b: 'sc' }, { a: 'sc', b: 'at' }, { a: 'at', b: 'cf', via: [[20.5, 26]] }, { a: 'cf', b: 'pr', via: [[13, 30.5], [9.5, 32.5]] }, { a: 'at', b: 'sd', via: [[27, 23.4], [28.6, 26]] },
    { a: 'sd', b: 'ck', via: [[37.5, 34]] }, { a: 'at', b: 'hm', via: [[21, 12], [23.5, 10.5]] }, { a: 'hm', b: 'hw' }, { a: 'hw', b: 'sp', gate: 'mirrors' }, { a: 'sp', b: 'bb' },
    { a: 'bb', b: 'br', via: [[52.5, 15]] }, { a: 'br', b: 'bx', gate: 'bandexit' }
  ],
  gates: {
    mirrors: { kind: 'echowall', at: [37, 10.5, 1.5], done: 'THE WALL SINGS OPEN.', flag: 'mirrors', line: 'An ornate wall of mirrors. It hums when you speak.', hint: 'mirrors' },
    bandexit: { kind: 'flag', flag: 'band', line: 'The band is still playing.' }
  },
  spots: [
    { id: 'ck', node: 'ck', kind: 'room7', label: 'ROOM 7' }, { id: 'phone_at', node: 'at', kind: 'phone', beat: 'concierge_atrium', once: true, label: 'HOUSE PHONE', r: 3 },
    { id: 'safe', node: 'cf', kind: 'codelock', code: '2601', label: 'THE SAFE', once: true }, { id: 'board', at: [7, 37.6, 1.6], kind: 'exposure', item: 'exp_board', flag: 'exposure1', beat: 'board_developed' },
    { id: 'pin4', edge: 'sp-bb', s: .4, kind: 'pickup', item: 'pin4' }, { id: 'rimeB1', node: 'pr', kind: 'pickup', item: 'rime', n: 4 }, { id: 'rimeB2', edge: 'sd-ck', s: .5, kind: 'pickup', item: 'rime', n: 4 }, { id: 'rimeB3', edge: 'bb-br', s: .3, kind: 'pickup', item: 'rime', n: 3 },
    { id: 'redB1', edge: 'sc-at', s: .5, kind: 'pickup', item: 'red5', n: 10 }, { id: 'redB2', edge: 'at-cf', s: .5, kind: 'pickup', item: 'red5', n: 12 }, { id: 'redB3', edge: 'hm-hw', s: .5, kind: 'pickup', item: 'red5', n: 10 },
    { id: 'mirrorwall', node: 'hw', kind: 'tableau', lines: 'mirrorwall', label: 'THE MIRROR WALL', when: '', r: 2 },
    { id: 'amb', node: 'cf', kind: 'tableau', lines: 'coastal', label: 'THE COASTAL AMBASSADOR', r: 3.2 }, { id: 'gen', node: 'sd', kind: 'tableau', lines: 'steppe', label: 'THE STEPPE GENERAL', r: 3.2 },
    { id: 'interp', edge: 'at-sd', s: .5, kind: 'tableau', lines: 'interpreter', label: 'THE INTERPRETER', r: 2 }, { id: 'waiter', edge: 'sc-at', s: .8, kind: 'tableau', lines: 'waiter', label: 'A WAITER', r: 1.6 },
    { id: 'journo', node: 'pr', kind: 'tableau', lines: 'journalist', label: 'A JOURNALIST', r: 3 }, { id: 'secretary', edge: 'cf-pr', s: .5, kind: 'tableau', lines: 'secretary', label: 'A SECRETARY', r: 1.8 }
  ],
  spawns: { sec1: [15.5, 19.5], sec2: [15.5, 21.5], sec3: [22.5, 17.5], sec4: [22.5, 23.5], co1: [25.5, 32.5], co2: [15.5, 32.5], co3: [24.5, 27.5], st1: [38.5, 28.5], st2: [38.5, 32.5], dk1: [7.5, 37.5], dk2: [11.5, 33.5], dk3: [6.5, 33.5],
    ins: [36.5, 28.5], hm1: [34.5, 8.5], hm2: [34.5, 12.5] },
  waves: {
    security: { spawn: [['bellboy', 'sec1', 0], ['bellboy', 'sec2', .6], ['giggler', 'sec3', 1.2], ['giggler', 'sec4', 2]] }, coast: { spawn: [['plow', 'co1', 0], ['giggler', 'co2', .8], ['giggler', 'co3', 1.6]] },
    steppe: { spawn: [['twins', 'st1', 0], ['twins', 'st2', 1.2]] }, dark: { spawn: [['giggler', 'dk1', 0], ['giggler', 'dk2', 1], ['giggler', 'dk3', 2]] }, mirrorsW: { spawn: [['bellboy', 'hm1', 0], ['giggler', 'hm2', 1]] }
  },
  triggers: [
    { id: 'security', edge: 'e1-sc', s: .6, wave: 'security', tip: 'scan' }, { id: 'coast', node: 'cf', wave: 'coast' }, { id: 'steppe', node: 'sd', wave: 'steppe' }, { id: 'inspector', node: 'sd', beat: 'inspector', when: 'wave:01B:steppe' },
    { id: 'insp2', edge: 'at-sd', s: .3, beat: 'inspector', when: 'inspectorGone' }, { id: 'dark', node: 'pr', wave: 'dark' }, { id: 'mirrorsW', node: 'hm', wave: 'mirrorsW' }, { id: 'band', node: 'br', beat: 'band_intro', unless: 'band' }
  ],
  props: [
    ['shape', 'security-arch', 11.5, 20.5, 0, { facing: 0 }], ['shape', 'flag-coastal', 15, 27.5, 0], ['shape', 'flag-coastal', 25, 27.5, 0], ['shape', 'flag-steppe', 29, 27.5, 0], ['shape', 'flag-steppe', 39, 27.5, 0], ['shape', 'flag-steppe', 34, 33.4, 0],
    ['shape', 'conference-table', 20, 30, 0], ['shape', 'conference-table', 34, 30, 0], ['shape', 'safe4', 15, 33.4, 0, { facing: -Math.PI / 2 }], ['shape', 'blackboard', 7, 38.4, 0, { facing: -Math.PI / 2 }],
    ['shape', 'interpreter-booth', 27.5, 23.4, 0], ['shape', 'press-pinboard', 11.5, 38.4, 0, { facing: -Math.PI / 2 }], ['shape', 'room7-door', 40.5, 38.4, 0, { facing: -Math.PI / 2 }],
    ['pen', 'mirror-wall', 37, 10.5, 0], ['pen', 'mirrors', 23, 7, 0, { x1: 36 }], ['pen', 'chandelier', 20.5, 20.5, 5.4], ['pen', 'chandelier', 51, 23, 5.4], ['pen', 'stage', 46, 16, 1, { x1: 56 }], ['pen', 'dancefloor', 47, 20, 0, { x1: 57, y1: 29 }],
    ['light', 20.5, 20.5, 5, { color: '#e0e8ff', reach: 220, power: 22 }], ['light', 20, 30, 4, { color: '#e8f0ff', reach: 160, power: 14 }], ['light', 34, 30, 4, { color: '#e8f0ff', reach: 160, power: 14 }],
    ['light', 30, 10, 4, { color: '#f0e8ff', reach: 180, power: 16 }], ['light', 51, 22, 5, { color: '#ffd0a0', reach: 260, power: 26 }], ['light', 51, 17, 2.5, { color: '#ff7040', reach: 160, power: 14 }]
  ],
  people: [['ambassador', 19, 29.2, 0, 1.6, 'frozen'], ['general', 34, 29.2, 0, 1.6, 'frozen'], ['interpreter', 26.5, 23.5, 0, 0, 'frozen'], ['waiter', 16.6, 20.4, 0, 0, 'frozen'], ['journalist', 10.5, 34, 0, 2.6, 'frozen'], ['secretary', 12.5, 31.5, 0, 0, 'frozen']],
  dark: { region: [6, 32, 12, 38] }
});

/* ---- 01C THE BLACK RUN (terrain: a plateau at 380 m, the slope to the village; a ridge with a crevasse; the T-bar) ---- */
const H01C = (x, y) => {
  const m = x / M, n = y / M;
  let z = 380 * (1 - sstep(108, 860, n));
  z += Math.sin(m / 23) * Math.cos(n / 31) * 2.2 + Math.sin(m / 9 + n / 13) * .6;
  z += Math.pow((m - 150) / 170, 2) * 70 * sstep(100, 300, n) * (1 - sstep(780, 860, n));
  z -= 9 * Math.exp(-Math.pow((m - 192) / 14, 2) - Math.pow((n - 345) / 26, 2));   // the gully under the kicker
  z += 14 * sstep(190, 230, m) * (1 - sstep(105, 125, n));                            // the ridge
  z -= 50 * Math.exp(-Math.pow((m - 243) / 3.2, 2)) * (1 - sstep(80, 105, n));          // the crevasse
  return z * M;
};
S7.H01C = H01C;
S7.area('01C', {
  title: 'THE BLACK RUN', sub: 'PIZ NADA, NORTH FACE', target: 1, music: 'blackrun', ambience: 'wind', start: 'tbB', accent: '#ff7a1e', snow: 1, wind: .6, statueAt: 'vb',
  world: {
    terrain: { size: 15360, height: H01C, color: snowColor([.96, .98, 1.04]), cell: 32, far: 9000, rock: { colors: ['#4a4e5a', '#5a5e6a', '#3a3e48'], band: 30, slope: [.55, .8] }, speckle: .05, mottle: .1 },
    sky: { top: '#02040c', horizon: '#1a2440', ground: '#0a0c14', sun: '#a0b0ff', haze: .2 }, fog: { color: '#0a1020', near: 400, far: 5200 }, ambient: ['#7080b0', '#202430', 1.25],
    sun: { color: '#b8c4ff', intensity: 1.6, dir: [-.3, .6, -.7] }, torchLights: 0, lights: 6, glowLights: 4, overlay: { fov: 62 }, filter: { bands: 3, ink: 1, inkW: 1.4, punch: 1.35 }, camera: { mode: 'fixed', near: 1, far: 9000 }
  },
  nodes: {
    tbB: { t: [80, 884], kind: 'stop', label: 'T-BAR (BOTTOM)' }, tbT: { t: [80, 96], kind: 'stop', label: 'T-BAR (TOP)' }, ts: { t: [110, 72], kind: 'door', label: 'TOP STATION' },
    st: { t: [122, 112], kind: 'start', label: 'START GATE', go: 'st-f1' }, pr: { t: [165, 62], kind: 'stop', label: 'PATROL ROPE' }, cr: { t: [222, 58], kind: 'stop', label: 'THE RIDGE' },
    as: { t: [268, 58], kind: 'stop', label: 'AVALANCHE SHELTER' }, jp: { t: [268, 112], kind: 'stop', label: 'THE LIP' },
    f1: { t: [122, 200] }, bl1: { t: [62, 330] }, bl2: { t: [72, 520] }, bk1: { t: [148, 360] }, bk2: { t: [160, 545] }, jk: { t: [188, 300] },
    al: { t: [252, 200] }, ax1: { t: [238, 285] }, ax2: { t: [228, 400] }, ax3: { t: [200, 470] },
    f2: { t: [122, 700] }, vb: { t: [100, 868], kind: 'exit', label: 'OBERGLÜCK', to: ['01A', 'ls'], anyway: true }
  },
  edges: [
    { a: 'tbB', b: 'tbT', kind: 'lift', ground: true, speed: 380, via: [[80, 700], [80, 500], [80, 300], [80, 150]] },
    { a: 'tbT', b: 'ts' }, { a: 'ts', b: 'st' }, { a: 'ts', b: 'pr' }, { a: 'pr', b: 'cr', gate: 'rope' }, { a: 'cr', b: 'as', hidden: 'cornice', bridge: true }, { a: 'as', b: 'jp' },
    { a: 'jp', b: 'al', kind: 'jump', onlyFor: 'dagny', apex: 3 },
    { a: 'st', b: 'f1', kind: 'ski', label: 'DOWNHILL' },
    { a: 'f1', b: 'bl1', kind: 'ski', label: 'BLUE', via: [[90, 260]] }, { a: 'bl1', b: 'bl2', kind: 'ski', via: [[40, 430]] }, { a: 'bl2', b: 'f2', kind: 'ski', via: [[100, 620]] },
    { a: 'f1', b: 'bk1', kind: 'ski', label: 'BLACK' }, { a: 'bk1', b: 'bk2', kind: 'ski' }, { a: 'bk2', b: 'f2', kind: 'ski' },
    { a: 'f1', b: 'jk', kind: 'ski', label: 'THE JUMP', onlyFor: 'dagny' }, { a: 'jk', b: 'bk2', kind: 'jump', apex: 5, slow: true },
    { a: 'al', b: 'ax1', kind: 'ski' }, { a: 'ax1', b: 'ax2', kind: 'ski', label: 'LEFT', via: [[214, 340]] }, { a: 'ax1', b: 'ax2', id: 'ax1-ax2b', kind: 'ski', label: 'RIGHT', via: [[256, 345]] },
    { a: 'ax2', b: 'ax3', kind: 'ski', label: 'LEFT', via: [[206, 430]] }, { a: 'ax2', b: 'ax3', id: 'ax2-ax3b', kind: 'ski', label: 'RIGHT', via: [[236, 440]] }, { a: 'ax3', b: 'bk2', kind: 'ski' },
    { a: 'f2', b: 'vb', kind: 'ski' }
  ],
  gates: {
    rope: { kind: 'patrol', line: 'CLOSED — AVALANCHE DANGER — PATROL ONLY. You are not patrol.', hint: 'patrol', flag: 'patrol' },
    cornice: { kind: 'cornice', at: [236.5, 54, 1.5], done: 'THE CORNICE COMES DOWN.', flag: 'cornice', beat: 'cornice_down' }
  },
  spots: [
    { id: 'ts', node: 'ts', kind: 'room7', label: 'ROOM 7' }, { id: 'murmel2', node: 'tbT', kind: 'npc', who: 'murmel', label: 'MURMEL', r: 3 }, { id: 'vbx', node: 'vb', kind: 'exit', label: 'INTO THE VILLAGE' },
    { id: 'edel3', node: 'as', kind: 'pickup', item: 'edelweiss', r: 2 }, { id: 'pin5', edge: 'cr-as', s: .8, kind: 'pickup', item: 'pin5' }, { id: 'doc_1926', edge: 'as-jp', s: .2, kind: 'pickup', item: 'doc_1926' },
    { id: 'cornice', node: 'cr', kind: 'tableau', lines: 'cornice', label: 'THE CORNICE', r: 2 }, { id: 'redC1', node: 'ts', kind: 'pickup', item: 'red5', n: 12, r: 3 },
    { id: 'redC2', edge: 'f1-bl1', s: .5, kind: 'pickup', item: 'red5', n: 10, r: 2.5 }, { id: 'redC3', edge: 'bk1-bk2', s: .5, kind: 'pickup', item: 'red5', n: 12, r: 2.5 }, { id: 'redC4', edge: 'ts-pr', s: .5, kind: 'pickup', item: 'red5', n: 10 },
    { id: 'rimeC1', edge: 'pr-cr', s: .5, kind: 'pickup', item: 'rime', n: 5 }, { id: 'rimeC2', edge: 'bl1-bl2', s: .5, kind: 'pickup', item: 'rime', n: 4, r: 2.5 }
  ],
  spawns: { tb1: [104, 600], tb2: [52, 420], tb3: [110, 250], b11: [70, 290], b12: [84, 300], b13: [56, 300], b21: [58, 480], b22: [86, 470], k1: [150, 430], k2: [140, 500], k3: [170, 500], k4: [150, 470], sh1: [262, 70], sh2: [274, 76] },
  waves: {
    tbar: { spawn: [['snowballer', 'tb1', 0], ['snowballer', 'tb2', 0], ['snowballer', 'tb3', 0]] },
    blue1: { spawn: [['tobogganer', 'b11', 0], ['tobogganer', 'b12', .6], ['tobogganer', 'b13', 1.2]] }, blue2: { spawn: [['tobogganer', 'b21', 0], ['tobogganer', 'b22', .8]] },
    black1: { spawn: [['plow', 'k1', 0]] }, black2: { spawn: [['tobogganer', 'k2', 0], ['tobogganer', 'k3', .5], ['tobogganer', 'k4', 1]] }, shelter: { spawn: [['giggler', 'sh1', 0], ['giggler', 'sh2', 1]] }
  },
  triggers: [
    { id: 'tbar', edge: 'tbB-tbT', s: .05, wave: 'tbar' }, { id: 'skitip', node: 'st', tip: 'ski' }, { id: 'blue1', edge: 'f1-bl1', s: .3, wave: 'blue1' }, { id: 'blue2', edge: 'bl1-bl2', s: .5, wave: 'blue2' },
    { id: 'black1', edge: 'f1-bk1', s: .7, wave: 'black1' }, { id: 'black2', edge: 'bk1-bk2', s: .3, wave: 'black2' }, { id: 'shelter', edge: 'as-jp', s: .4, wave: 'shelter' },
    { id: 'lawine', node: 'al', beat: 'lawine', unless: 'lawineDone' }, { id: 'lawineEnd', node: 'bk2', flag: 'lawineEnd', when: 'lawine' }, { id: 'slowjump', edge: 'jk-bk2', s: .45, beat: 'slowjump' }
  ],
  props: [
    ['shape', 'room7-door', 112, 70, 0, { facing: Math.PI / 2 }], ['shape', 'top-station', 104, 64, 0], ['shape', 'shelter-hut', 272, 51, 0], ['shape', 'start-gate', 122, 110, 0],
    ['pen', 'piste-poles', 0, 0, 0], ['pen', 'patrol-rope', 165, 62, 0], ['pen', 'cornice', 238, 54, 0], ['pen', 'floodlights', 0, 0, 0], ['pen', 'tbar-line', 80, 96, 0], ['pen', 'kicker', 188, 300, 0],
    ['light', 122, 112, 8, { color: '#ffe8c0', reach: 260, power: 24 }], ['light', 150, 380, 14, { color: '#ffe8c0', reach: 400, power: 40 }], ['light', 90, 600, 14, { color: '#ffe8c0', reach: 400, power: 40 }], ['light', 110, 860, 10, { color: '#ffd0a0', reach: 300, power: 30 }]
  ],
  people: [['murmel', 78, 92, 1.4, 1.6, 'murmel']]
});

/* ---- 01D HIMMELSBAHN (terrain: a valley; one lift edge of 900 m; the power cut at 55%; the storm) ---- */
const D_BASE = m => 20 + m * .42 + 60 * sstep(820, 900, m);
const H01D = (x, y) => { const m = x / M, n = y / M, v = Math.abs(n - 300) / 140; return (D_BASE(m) + v * v * 90 + Math.sin(m / 37) * 8 + Math.cos(n / 29) * 5) * M; };
const CABLE = m => D_BASE(m) + 13 + 34 * Math.sin(Math.PI * Math.max(0, Math.min(1, m / 905)));
S7.CABLE = CABLE;
S7.area('01D', {
  title: 'HIMMELSBAHN', sub: 'THE GONDOLA', target: 1, music: 'gondola', ambience: 'storm', start: 'gs', accent: '#5a8ac8', snow: 1, wind: 1, statueAt: 'gs',
  world: {
    terrain: { size: 16384, height: H01D, color: snowColor([.9, .95, 1.06]), cell: 32, far: 7000, rock: { colors: ['#3a3e4a', '#4a4e5a'], band: 30, slope: [.45, .7] }, speckle: .05, mottle: .15 },
    sky: { top: '#060812', horizon: '#3a4058', ground: '#10121a', sun: '#8090c0', haze: .6 }, fog: { color: '#4a5068', near: 200, far: 2600 }, ambient: ['#8090b0', '#30343e', 1.3],
    sun: { color: '#a8b8ff', intensity: 1.2, dir: [.3, .4, -.8] }, torchLights: 0, lights: 5, glowLights: 4, overlay: { fov: 64 }, filter: { bands: 3, ink: 1, inkW: 1.4, punch: 1.3 }, camera: { mode: 'fixed', near: 1, far: 8000 }
  },
  nodes: { gs: { t: [40, 300, CABLE(40) - 1.6], kind: 'stop', label: 'VALLEY STATION' }, gl: { t: [905, 300, CABLE(905) - 1.6], kind: 'exit', open: true, label: 'GLACIER STATION', to: ['01E', 'gl'], anyway: true } },
  edges: [{ a: 'gs', b: 'gl', kind: 'lift', cabin: true, speed: 120, via: Array.from({ length: 17 }, (_, i) => { const m = 40 + (i + 1) * 50; return [m, 300, CABLE(m) - 1.6]; }),
    cams: [{ s: [0, .2], shot: 'follow', back: 7, side: 5, up: 2.4, ahead: 2, fov: 56 }, { s: [.2, .45], shot: 'follow', back: -9, side: -4, up: 1.2, ahead: -2, fov: 54 }, { s: [.45, .7], shot: 'follow', back: 10, side: -6, up: 4, ahead: 0, fov: 54 }, { s: [.7, 1], shot: 'follow', back: 6, side: 6, up: -1.5, ahead: 4, fov: 58 }] }],
  targets: [{ id: 'ins1', at: [600, 297.6, CABLE(600) + 1], r: .9, far: true, flag: 'ins1', when: 'powerCut' }, { id: 'ins2', at: [600, 300, CABLE(600) + 1.4], r: .9, far: true, flag: 'ins2', when: 'powerCut' }, { id: 'ins3', at: [600, 302.4, CABLE(600) + 1], r: .9, far: true, flag: 'ins3', when: 'powerCut' }],
  spots: [{ id: 'pin6', edge: 'gs-gl', s: .04, kind: 'pickup', item: 'pin6', r: 2 }, { id: 'rimeD1', edge: 'gs-gl', s: .3, kind: 'pickup', item: 'rime', n: 5, r: 2 }, { id: 'redD1', edge: 'gs-gl', s: .7, kind: 'pickup', item: 'red5', n: 15, r: 2 }],
  spawns: {},
  triggers: [{ id: 'board', edge: 'gs-gl', s: .01, beat: 'gondola' }],
  props: [['pen', 'gondola', 0, 0, 0], ['pen', 'pylons', 0, 0, 0], ['shape', 'glacier-station', 905, 300, 0], ['shape', 'valley-station', 40, 300, 0], ['light', 600, 300, 30, { color: '#ffb060', reach: 300, power: 24 }]]
});

/* ---- 01E THE GLACIER ARCHIVE (50 x 40; ice walls; dark; cyan glows; people frozen in the walls) ---- */
S7.area('01E', {
  title: 'THE GLACIER ARCHIVE', sub: 'DEPOSITS OF EVERY NATION', target: 1, music: 'archive', ambience: 'drip', start: 'gl', interior: true, accent: '#40e0ff',
  world: {
    level: {
      rows: B1(50, 40, [
        ['fill', 1, 19, 10, 21, '.'], ['fill', 11, 16, 18, 24, '.'], ['fill', 13, 10, 15, 15, '.'], ['fill', 12, 5, 17, 9, '.'], ['fill', 13, 25, 15, 34, '.'], ['fill', 12, 31, 17, 35, '.'],
        ['fill', 19, 19, 34, 21, '.'], ['fill', 35, 16, 42, 24, '.'], ['fill', 37, 25, 39, 27, '.'], ['fill', 34, 28, 43, 33, '.'], ['fill', 44, 33, 48, 36, '.'], ['fill', 40, 33, 43, 35, '.']
      ]),
      legend: { '#': { wall: 96 } }, ground: 'tiles', colors: { base: '#a8d8e8', dark: '#2a5068', light: '#e0f8ff' }, side: 'block', color: '#4a8aa8', wallSide: 'block'
    },
    sky: '#01040a', fog: { color: '#02060a', near: 80, far: 520 }, ambient: ['#2a5a7a', '#02060a', 1.0], torchLights: 0, lights: 7, glowLights: 6, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.45 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    gl: { t: [3.5, 20.5], kind: 'stop', label: 'THE TUNNEL' }, ig: { t: [14.5, 20.5], label: 'THE ICE GALLERY' }, pq: { t: [14.5, 12.5], kind: 'stop', label: 'HUMMING ICE' }, pn: { t: [14.5, 6.5], kind: 'stop', label: 'A NICHE' },
    r7q: { t: [14.5, 27.5], kind: 'stop', label: 'A FROZEN DOOR' }, r7e: { t: [14.5, 33.0], kind: 'door', label: 'ROOM 7' },
    ec: { t: [24.5, 20.5], kind: 'stop', label: 'THE CRYSTALS' }, lv: { t: [38.5, 20.5], label: 'THE LEDGER VAULT' }, iv: { t: [38.5, 30.5], label: 'THE INNER VAULT' },
    sr: { t: [42.5, 34.0], kind: 'stop', label: 'THE SERACS' }, fe: { t: [47.0, 34.5], kind: 'exit', open: true, label: 'FREIGHT ELEVATOR', to: ['01F', 'fe'] }
  },
  edges: [
    { a: 'gl', b: 'ig' }, { a: 'ig', b: 'pq' }, { a: 'pq', b: 'pn', gate: 'pincrystal' }, { a: 'ig', b: 'r7q' }, { a: 'r7q', b: 'r7e', gate: 'r7ice' }, { a: 'ig', b: 'ec' }, { a: 'ec', b: 'lv', gate: 'crystals' },
    { a: 'lv', b: 'iv', gate: 'vaultice', via: [[38.5, 26]] }, { a: 'iv', b: 'sr', via: [[41.5, 33]] }, { a: 'sr', b: 'fe', gate: 'seracs' }
  ],
  gates: {
    pincrystal: { kind: 'crystal', at: [14.5, 10, 1.5], done: 'THE ICE SHATTERS.', line: 'The ice hums. It wants a note.', hint: 'crystals' },
    crystals: { kind: 'crystal', at: [28, 20.5, 1.5], done: 'THE CRYSTALS SHATTER.', flag: 'crystals', line: 'The ice hums. It wants a note.', hint: 'crystals' },
    r7ice: { kind: 'icelock', line: 'Frozen shut. A door with a 7 under the ice.', at: [14.5, 30, 1] }, vaultice: { kind: 'icelock', line: 'Frozen shut.', at: [38.5, 25, 1], flag: 'vaultOpen' },
    seracs: { kind: 'serac', at: [45, 34.5, 1.5], done: 'THE SERACS COME DOWN.', flag: 'seracs', line: 'Ice towers. Too much ice. Not enough engineer.', hint: 'seracs' }
  },
  spots: [
    { id: 'r7e', node: 'r7e', kind: 'room7', label: 'ROOM 7' }, { id: 'r7q', node: 'r7q', kind: 'gate', gate: 'r7ice', label: 'ICE LOCK' }, { id: 'ivq', node: 'lv', kind: 'gate', gate: 'vaultice', label: 'ICE LOCK', r: 2.6 },
    { id: 'pin7', node: 'pn', kind: 'pickup', item: 'pin7' }, { id: 'ledger', at: [41.5, 20.5, 1.2], kind: 'exposure', item: 'exp_ledger', flag: 'ledger', beat: 'ledger' },
    { id: 'doc_orders', node: 'iv', kind: 'pickup', item: 'doc_orders' }, { id: 'rimeV', edge: 'iv-sr', s: .3, kind: 'pickup', item: 'rime', n: 15 },
    { id: 'pim5', node: 'ig', kind: 'npc', who: 'pim', beat: 'pim5', once: true, label: 'THE LIFT BOY', r: 3 }, { id: 'phone_ice', node: 'ec', kind: 'phone', beat: 'concierge_vault', once: true, label: 'A PHONE IN THE ICE', r: 3 },
    { id: 'acc1', edge: 'gl-ig', s: .7, kind: 'tableau', lines: 'deposit1', label: 'ACCOUNT 4417', r: 1.8 }, { id: 'acc2', edge: 'ig-ec', s: .5, kind: 'tableau', lines: 'deposit2', label: 'ACCOUNT 2210', r: 1.8 }, { id: 'acc3', node: 'iv', kind: 'tableau', lines: 'deposit3', label: 'ACCOUNT 0889', r: 3 },
    { id: 'redE1', edge: 'gl-ig', s: .3, kind: 'pickup', item: 'red5', n: 12 }, { id: 'redE2', edge: 'ec-lv', s: .5, kind: 'pickup', item: 'red5', n: 12 }, { id: 'redE3', node: 'sr', kind: 'pickup', item: 'red5', n: 15, r: 2 },
    { id: 'rimeE1', node: 'r7q', kind: 'pickup', item: 'rime', n: 4 }, { id: 'rimeE2', node: 'pq', kind: 'pickup', item: 'rime', n: 4 }
  ],
  spawns: { g1: [17.5, 17.5], g2: [17.5, 23.5], g3: [11.5, 23.5], g4: [11.5, 17.5], v1: [40.5, 31.5], v2: [36.5, 29.5], v3: [42.5, 29.5], l1: [41.5, 17.5], l2: [41.5, 23.5] },
  waves: { gallery: { spawn: [['giggler', 'g1', 0], ['giggler', 'g2', .8], ['twins', 'g3', 1.6], ['giggler', 'g4', 2.4]] }, vault: { spawn: [['bloom', 'v1', 0], ['giggler', 'v2', 1], ['giggler', 'v3', 2]] }, ledgerW: { spawn: [['bellboy', 'l1', 0], ['giggler', 'l2', 1]] } },
  triggers: [{ id: 'gallery', node: 'ig', wave: 'gallery' }, { id: 'vault', node: 'iv', wave: 'vault' }, { id: 'ledgerW', node: 'lv', wave: 'ledgerW' }],
  props: [
    ['pen', 'ice-walls', 0, 0, 0], ['pen', 'crystals', 28, 20.5, 0, { gate: 'crystals' }], ['pen', 'crystals', 14.5, 10, 0, { gate: 'pincrystal' }], ['pen', 'seracs', 45, 34.5, 0], ['pen', 'ledger', 41.5, 20.5, 0],
    ['pen', 'icedoor', 14.5, 30, 0, { gate: 'r7ice' }], ['pen', 'icedoor', 38.5, 25, 0, { gate: 'vaultice' }], ['shape', 'room7-door', 14.5, 35.6, 0, { facing: -Math.PI / 2 }], ['shape', 'freight-elevator', 48.4, 34.5, 0, { facing: Math.PI }],
    ['light', 14, 20, 3, { color: '#40e0ff', reach: 160, power: 14 }], ['light', 28, 20, 2, { color: '#60f0ff', reach: 120, power: 12 }], ['light', 38, 20, 3, { color: '#40d0ff', reach: 160, power: 14 }], ['light', 38, 30, 3, { color: '#40c0ff', reach: 160, power: 14 }],
    ['light', 45, 34, 2.5, { color: '#a0f0ff', reach: 120, power: 10 }], ['light', 14, 7, 2, { color: '#60f0ff', reach: 90, power: 8 }]
  ],
  people: [['frozen1', 12, 16.2, 0, 1.6, 'frozen'], ['frozen2', 17.6, 24.6, 0, -1.6, 'frozen'], ['frozen3', 22, 18.6, 0, 1.6, 'frozen'], ['frozen4', 35.6, 31, 0, 0, 'frozen']]
});

/* ---- 01F THE SUMMIT (terrain: the plaza and the glass pavilion; the glacier face below; the old chairlift) ---- */
const H01F = (x, y) => { const m = x / M, n = y / M; let z = 300 * (1 - sstep(165, 840, n)); z += Math.sin(m / 27) * Math.cos(n / 33) * 1.5 * sstep(170, 200, n); z += Math.pow((m - 230) / 160, 2) * 40 * sstep(180, 300, n); return z * M; };
S7.H01F = H01F;
const ARC = (deg, r = 30) => [200 + Math.cos(deg * Math.PI / 180) * r, 100 + Math.sin(deg * Math.PI / 180) * r];
S7.area('01F', {
  title: 'THE SUMMIT', sub: 'PIZ NADA, MIDNIGHT', target: 1, music: 'powderking', ambience: 'wind', start: 'fe', accent: '#e0b040', snow: .6, wind: .8, boss: 'hansi',
  world: {
    terrain: { size: 16384, height: H01F, color: snowColor([.98, .96, 1.04]), cell: 32, far: 9000, rock: { colors: ['#3a3448', '#4a4458'], band: 30, slope: [.55, .8] }, speckle: .05, mottle: .1 },
    sky: { top: '#0a0420', horizon: '#3a2a5a', ground: '#100a1a', sun: '#ffd080', haze: .25 }, fog: { color: '#1a1030', near: 300, far: 5000 }, ambient: ['#9080c0', '#2a2030', 1.3],
    sun: { color: '#c8b8ff', intensity: 1.5, dir: [.2, .7, -.65] }, torchLights: 0, lights: 6, glowLights: 6, overlay: { fov: 62 }, filter: { bands: 3, ink: 1, inkW: 1.4, punch: 1.4 }, camera: { mode: 'fixed', near: 1, far: 9000 }
  },
  nodes: {
    fe: { t: [200, 150], kind: 'stop', label: 'THE FREIGHT ELEVATOR' }, a1: { t: ARC(30) }, a2: { t: ARC(60) }, a3: { t: ARC(90) }, a4: { t: ARC(120) }, a5: { t: ARC(150) },
    sl0: { t: [240, 140], kind: 'stop', label: 'THE GLACIER FACE' }, sl1: { t: [246, 826], kind: 'stop', label: 'THE OLD CHAIRLIFT' }
  },
  edges: [
    { a: 'fe', b: 'a3' }, { a: 'a1', b: 'a2', via: [ARC(45)] }, { a: 'a2', b: 'a3', via: [ARC(75)] }, { a: 'a3', b: 'a4', via: [ARC(105)] }, { a: 'a4', b: 'a5', via: [ARC(135)] },
    { a: 'a1', b: 'sl0', hidden: 'avalaughDown' }, { a: 'sl0', b: 'sl1', kind: 'ski', aimOnTheMove: true, via: [[250, 260], [232, 400], [252, 540], [234, 680]], cams: [{ s: [0, 1], shot: 'follow', back: 4.4, side: -2.2, up: 2, ahead: 6, fov: 60, lag: .1 }] }
  ],
  spots: [], spawns: { b1: [196, 108], b2: [204, 108] },
  props: [['pen', 'pavilion', 200, 100, 0], ['pen', 'avalaugh', 200, 100, 0], ['pen', 'slalom-gates', 0, 0, 0], ['pen', 'chairlift', 246, 826, 0], ['shape', 'flagpole', 226, 115, 0], ['shape', 'flagpole', 174, 115, 0], ['shape', 'weather-mast', 200, 130, 0],
    ['light', 200, 100, 6, { color: '#ffb050', reach: 400, power: 30 }], ['light', 240, 400, 20, { color: '#d0c0ff', reach: 500, power: 30 }]],
  onEnter(G) { if (!G.flags.hansiDead) S7.runBeat('hansi_intro'); }
});
