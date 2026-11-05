/* SKILLER7 content — Room 7 and Target 00 (Grand Hotel Nada): the lobby, the third floor, the service shaft.
 * Units: x, y in tiles (1 m), z in metres. Rails: nodes and edges; cameras are placed automatically where a shot has a
 * clear line to the hero, unless an edge lists its own (cams). */
const B = S7.buildRows;

S7.area('room7', {
  title: 'ROOM 7', sub: 'GRAND HOTEL NADA, TOP FLOOR', music: 'room7', ambience: 'room7', start: 'door', interior: true,
  world: {
    level: { rows: B(12, 10, [['fill', 1, 1, 10, 8, '.'], ['set', 6, 0, 'W']]), legend: { '#': { wall: 64 }, W: { wall: 64 } }, ground: 'planks', colors: { base: '#4a3226', dark: '#2a1a14', light: '#6a4a36' }, side: 'planks', color: '#2a1e1c', wallSide: 'planks' },
    sky: '#05040a', fog: false, ambient: ['#5a4a5a', '#1a1014', 1.0], torchLights: 0, lights: 4, glowLights: 4, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.3 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    door: { t: [6, 8.2], kind: 'stop', label: 'THE DOOR' }, wardrobe: { t: [2.4, 6.6], kind: 'stop', label: 'THE WARDROBE' }, bed: { t: [2.6, 3.4], kind: 'stop', label: 'THE BED' },
    chair: { t: [4.6, 2.0], kind: 'stop', label: 'SISTER ROSALIND' }, window: { t: [6.5, 1.8], kind: 'stop', label: 'THE WINDOW' },
    clock: { t: [9.5, 2.6], kind: 'stop', label: 'THE CUCKOO CLOCK' }, phone: { t: [9.6, 4.8], kind: 'stop', label: 'THE TELEPHONE' }, bench: { t: [9.4, 7.0], kind: 'stop', label: 'THE WAX BENCH' }
  },
  edges: [['door', 'wardrobe'], ['wardrobe', 'bed'], ['bed', 'chair'], ['chair', 'window'], ['window', 'clock'], ['clock', 'phone'], ['phone', 'bench'], ['bench', 'door']].map(([a, b]) => ({ a, b, cams: [{ s: [0, 1], shot: 'fixed', at: [10.8, 8.8, 3.3], look: 'hero', fov: 58 }], rcams: [{ s: [0, 1], shot: 'fixed', at: [1.2, 8.8, 3.3], look: 'hero', fov: 58 }] })),
  spots: [
    { id: 'r7_door', node: 'door', kind: 'r7', use: 'door', label: 'LEAVE' }, { id: 'r7_wardrobe', node: 'wardrobe', kind: 'r7', use: 'wardrobe', label: 'THE WARDROBE' },
    { id: 'r7_bed', node: 'bed', kind: 'r7', use: 'bed', label: 'OMA HOLLE' }, { id: 'r7_ros', node: 'chair', kind: 'r7', use: 'rosalind', label: 'SISTER ROSALIND' },
    { id: 'r7_window', node: 'window', kind: 'r7', use: 'window', label: 'THE WINDOW' }, { id: 'r7_clock', node: 'clock', kind: 'r7', use: 'clock', label: 'SAVE' },
    { id: 'r7_phone', node: 'phone', kind: 'r7', use: 'phone', label: 'THE TELEPHONE' }, { id: 'r7_bench', node: 'bench', kind: 'r7', use: 'bench', label: 'THE WAX BENCH' }
  ],
  props: [
    ['shape', 'wardrobe7', 1.6, 6.6, 0, { facing: 0 }], ['shape', 'holle-bed', 2.2, 2.6, 0, { facing: 0 }], ['shape', 'armchair', 4.6, 1.3, 0, { facing: Math.PI / 2 }],
    ['shape', 'cuckoo-clock', 10.5, 2.4, 0, { facing: Math.PI }], ['shape', 'side-table', 10.4, 4.8, 0, { facing: Math.PI }], ['shape', 'wax-bench', 10.2, 7.2, 0, { facing: Math.PI }],
    ['shape', 'radiator', 4.0, 8.7, 0, { facing: -Math.PI / 2 }], ['shape', 'room7-door', 6, 9.0, 0, { facing: -Math.PI / 2 }],
    ['pen', 'window7', 6.5, .9, 0], ['pen', 'featherbed', 2.2, 2.6, 0], ['pen', 'phone7', 10.4, 4.8, 0], ['pen', 'lamp7', 6, 5, 3.4],
    ['light', 6, 5, 3.2, { color: '#ffc880', reach: 150, power: 30, flicker: .03 }], ['light', 6.5, 1.2, 2.4, { color: '#8aa8ff', reach: 110, power: 12 }], ['light', 10.2, 7.2, 1.2, { color: '#ff8a40', reach: 60, power: 8, flicker: .15 }]
  ],
  people: [['rosalind', 4.6, 1.5, 0, Math.PI / 2, 'sit'], ['holle', 2.2, 2.4, .55, 0, 'lie']]
});

/* ---- 00A GRAND HOTEL NADA: THE LOBBY (40 x 28; walls 6 m; marble checker; a red runner) ---- */
S7.area('00A', {
  title: 'GRAND HOTEL NADA', sub: 'THE LOBBY', target: 0, music: 'hotel', ambience: 'roomtone', start: 'r7', interior: true, accent: '#a01828',
  world: {
    level: {
      rows: B(40, 28, [
        ['fill', 14, 6, 37, 25, '.'], ['fill', 14, 1, 37, 3, '='], ['fill', 23, 4, 25, 4, '3'], ['fill', 23, 5, 25, 5, '2'], ['fill', 23, 6, 25, 6, '1'], ['fill', 2, 6, 12, 11, '.'], ['fill', 13, 8, 13, 9, '.'],
        ['fill', 5, 10, 10, 10, 'c'], ['fill', 18, 23, 22, 23, 'c'], ['fill', 38, 13, 38, 16, '.'], ['set', 24, 26, '.'], ['set', 2, 7, 't'], ['set', 2, 9, 't'],
        ['set', 17, 12, 'P'], ['set', 31, 12, 'P'], ['set', 17, 19, 'P'], ['set', 31, 19, 'P'], ['fill', 24, 7, 24, 24, 'r'], ['fill', 25, 21, 36, 21, 'r'], ['fill', 38, 21, 38, 22, '.']
      ]),
      legend: { '#': { wall: 96 }, '=': { floor: 64, side: 'block' }, 1: { stairs: 'n', from: 0, floor: 21 }, 2: { stairs: 'n', from: 21, floor: 43 }, 3: { stairs: 'n', from: 43, floor: 64 }, c: { wall: 18 }, P: { pillar: 96 }, r: { floor: 0, ground: 'red' }, t: { torch: true } },
      ground: 'tiles', colors: { base: '#e8e4dc', dark: '#2a2226', light: '#f4f0e8' }, side: 'block', color: '#3a2a2e', wallSide: 'block'
    },
    sky: '#05040a', fog: { color: '#0a0608', near: 160, far: 900 }, ambient: ['#4a3040', '#140a0e', 1.15], torchLights: 2, torchShadows: 1, lights: 6, glowLights: 6, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.4 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    r7: { t: [36.5, 21.5], kind: 'door', label: 'ROOM 7' }, j1: { t: [24.5, 21.5] }, s1: { t: [16.5, 21.5], kind: 'stop', label: 'LUGGAGE RACK' }, d0: { t: [24.5, 25.4], kind: 'stop', label: 'REVOLVING DOOR' },
    j2: { t: [24.5, 14.5] }, j4: { t: [36.0, 14.5], kind: 'stop', label: 'ELEVATORS' }, j3: { t: [24.5, 7.6] }, g1: { t: [13.5, 8.5], kind: 'stop', label: 'THE BAR' },
    b1: { t: [8.5, 8.0], kind: 'stop', label: 'BAR' }, b2: { t: [4.0, 7.6], kind: 'stop', label: 'BEHIND THE BAR' },
    m1: { t: [24.5, 2.5], label: 'MEZZANINE' }, x1: { t: [36.5, 2.4], kind: 'exit', open: true, label: 'STAIRWELL', to: ['00B', 'x1'], needs: { item: 'servicekey' }, line: 'STAFF ONLY. The stairwell door is locked.', hint: 'key' }
  },
  edges: [
    { a: 'r7', b: 'j1', cams: [{ s: [0, .55], shot: 'fixed', at: [37.4, 24.6, 2.6], look: 'hero', fov: 52 }, { s: [.55, 1], shot: 'fixed', at: [20, 24.4, 4.8], look: 'hero', fov: 50 }] },
    { a: 'j1', b: 's1', cams: [{ s: [0, 1], shot: 'dolly', path: [[23, 24.4, 1.6], [15, 24.4, 1.6]], look: 'hero', fov: 50 }] },
    { a: 'j1', b: 'd0' }, { a: 'j1', b: 'j2', cams: [{ s: [0, 1], shot: 'fixed', at: [30, 4, 7.4], look: 'hero', fov: 46 }] },
    { a: 'j2', b: 'j4' }, { a: 'j2', b: 'j3', cams: [{ s: [0, 1], shot: 'fixed', at: [30, 4, 7.4], look: 'hero', fov: 50 }] },
    { a: 'j3', b: 'g1', gate: 'rope' }, { a: 'g1', b: 'b1' }, { a: 'b1', b: 'b2', cams: [{ s: [0, 1], shot: 'fixed', at: [11.5, 6.6, 2.2], look: 'hero', fov: 54 }] },
    { a: 'j3', b: 'm1', kind: 'stairs', via: [[24.5, 4.2]], smooth: false, cams: [{ s: [0, 1], shot: 'crane', at: [20.5, 9.5], zFrom: 1.8, zTo: 7.5, look: 'hero', fov: 54 }] },
    { a: 'm1', b: 'x1' }
  ],
  gates: { rope: { kind: 'buyout', price: 20, who: 'rurik', label: 'MEMBERS ONLY', line: 'Members only. Membership is a matter of means.', at: [14, 8.5, 1], flag: 'ropePaid' } },
  spots: [
    { id: 'r7door', node: 'r7', kind: 'room7', label: 'ROOM 7' }, { id: 'murmel', node: 's1', kind: 'npc', who: 'murmel', label: 'MURMEL' },
    { id: 'rope', node: 'j3', kind: 'gate', gate: 'rope', label: 'VELVET ROPE', r: 2.6 }, { id: 'revolving', node: 'd0', kind: 'tableau', lines: 'lobby_door', label: 'REVOLVING DOOR' },
    { id: 'pim1', node: 'j4', kind: 'npc', who: 'pim', beat: 'pim1', once: true, label: 'THE LIFT BOY' }, { id: 'phone_bar', node: 'b1', kind: 'phone', beat: 'concierge_bar', once: true, label: 'HOUSE PHONE' },
    { id: 'key', node: 'b2', kind: 'pickup', item: 'servicekey' }, { id: 'pin1', edge: 'j2-j4', s: .85, kind: 'pickup', item: 'pin1' },
    { id: 'doc_grau', edge: 'j1-s1', s: .45, kind: 'pickup', item: 'doc_grau' }, { id: 'rime1', edge: 'b1-b2', s: .7, kind: 'pickup', item: 'rime', n: 4 },
    { id: 'rime2', edge: 'm1-x1', s: .5, kind: 'pickup', item: 'rime', n: 3 }, { id: 'red1', edge: 'r7-j1', s: .35, kind: 'pickup', item: 'red5', n: 10 }, { id: 'red2', edge: 'j1-d0', s: .6, kind: 'pickup', item: 'red5', n: 12 },
    { id: 'doc_t00', edge: 'j2-j3', s: .4, kind: 'pickup', item: 'doc_t00' }
  ],
  spawns: { elev1: [29.5, 8.5], elev2: [28.5, 20.5], elev3: [22.5, 13.5], first: [37.5, 14.5], bar1: [3.5, 10.6], bar2: [11.5, 10.6], bar3: [6.5, 6.6], mz1: [34.5, 1.5], mz2: [30.5, 2.5], lob1: [15.5, 15.5], lob2: [33.5, 24.5] },
  waves: {
    first: { spawn: [['giggler', 'first', 0]], part: 'chest' }, elev: { spawn: [['giggler', 'elev1', 0], ['giggler', 'elev2', 1.5], ['giggler', 'elev3', 3]] },
    bar: { spawn: [['giggler', 'bar1', 0], ['giggler', 'bar2', 1], ['bellboy', 'bar3', 2.5]] }, mezz: { spawn: [['bellboy', 'mz1', 0], ['bellboy', 'mz2', 1.2]] },
    lobby: { spawn: [['giggler', 'lob1', 0], ['bellboy', 'lob2', 1.2], ['giggler', 'lob2', 2.4]] }
  },
  triggers: [
    { id: 'walk', edge: 'r7-j1', s: .1, tip: 'walk' }, { id: 'jtip', node: 'j1', tip: 'junction' },
    { id: 'first', edge: 'j1-j2', s: .5, beat: 't00_first_whiteout' }, { id: 'w_elev', node: 'j4', wave: 'elev', when: 'firstThaw' },
    { id: 'w_bar', node: 'b1', wave: 'bar' }, { id: 'w_mezz', node: 'm1', wave: 'mezz' }, { id: 'w_lobby', edge: 'j2-j3', s: .6, wave: 'lobby', when: 'pim1done' }
  ],
  props: [
    ['shape', 'reception-desk', 20, 23.4, 0, { facing: -Math.PI / 2 }], ['shape', 'bar-counter', 7.5, 10.4, 0, { facing: -Math.PI / 2 }], ['shape', 'bottle-shelf', 7.5, 11.5, 0, { facing: -Math.PI / 2 }],
    ['shape', 'luggage-cart', 15.2, 22.6, 0, { facing: 0 }], ['shape', 'luggage-rack', 15.2, 20.2, 0, { facing: 0 }], ['shape', 'armchair', 28, 17, 0, { facing: Math.PI }], ['shape', 'armchair', 28, 11, 0, { facing: Math.PI }],
    ['shape', 'velvet-stanchion', 14.4, 7.6, 0], ['shape', 'velvet-stanchion', 14.4, 9.4, 0], ['shape', 'elevator-doors', 38.8, 13.6, 0, { facing: Math.PI }], ['shape', 'elevator-doors', 38.8, 15.6, 0, { facing: Math.PI }],
    ['shape', 'room7-door', 38.6, 21.5, 0, { facing: Math.PI }], ['shape', 'revolving-door', 24.5, 26.6, 0], ['shape', 'potted-palm', 33, 7, 0], ['shape', 'potted-palm', 16, 7, 0],
    ['shape', 'stool', 6, 9.2, 0], ['shape', 'stool', 8.5, 9.2, 0], ['shape', 'table', 4.5, 7, 0], ['shape', 'stairwell-door', 37.6, 2.4, 4, { facing: Math.PI }],
    ['pen', 'chandelier', 20, 14, 5.4], ['pen', 'chandelier', 29, 14, 5.4], ['pen', 'chandelier', 24.5, 20, 5.4], ['pen', 'balustrade', 14, 3.9, 4, { x1: 37 }], ['pen', 'elevator-car', 36.8, 14.5, 0],
    ['light', 20, 14, 5, { color: '#ffd8a0', reach: 200, power: 26, flicker: .02 }], ['light', 29, 14, 5, { color: '#ffd8a0', reach: 200, power: 26, flicker: .02 }], ['light', 24.5, 20, 5, { color: '#ffd8a0', reach: 200, power: 22 }],
    ['light', 24.5, 26, 2.5, { color: '#8090c0', reach: 140, power: 10 }], ['light', 6, 8, 2.5, { color: '#ff9a50', reach: 120, power: 14, flicker: .1 }], ['light', 36.5, 14.5, 2.5, { color: '#c0ffd0', reach: 90, power: 10, flicker: .3 }]
  ],
  people: [['murmel', 15.4, 20.6, 1.0, Math.PI / 2, 'murmel'], ['pim', 37.2, 14.5, .3, Math.PI, 'pim', 'pim1seen']],
  onEnter(G) { if (!G.flags.t00started) { G.flags.t00started = true; } }
});

/* ---- 00B THIRD FLOOR (100 x 26: the corridors west, the hotel's light well east, the giant service bell across it) ---- */
S7.area('00B', {
  title: 'GRAND HOTEL NADA', sub: 'THE THIRD FLOOR', target: 0, music: 'hotel', ambience: 'roomtone', start: 'x1', interior: true, accent: '#8ab070', sweepAt: 'j6',
  world: {
    level: {
      rows: B(100, 26, [
        ['fill', 2, 4, 38, 6, '.'], ['fill', 14, 1, 19, 3, '.'], ['fill', 14, 7, 19, 10, '.'], ['fill', 39, 3, 40, 7, '.'], ['fill', 41, 1, 98, 24, ' '],
        ['fill', 26, 7, 28, 12, '.'], ['fill', 26, 13, 28, 16, ' '], ['fill', 8, 17, 38, 19, '.'], ['fill', 12, 14, 16, 16, '.'], ['fill', 12, 20, 16, 23, '.'],
        ['fill', 39, 16, 40, 20, '.'], ['set', 8, 7, '.'], ['set', 12, 3, '.'], ['fill', 26, 17, 28, 19, '.'], ['fill', 95, 2, 97, 8, 'K']
      ]),
      legend: { '#': { wall: 48 }, K: { wall: 300 }, ' ': { pit: true } },
      ground: 'planks', colors: { base: '#5a4a3a', dark: '#2a221a', light: '#7a6a52' }, side: 'block', color: '#4a5a44', wallSide: 'plaster', bottom: -400
    },
    sky: '#04060a', fog: { color: '#0c100c', near: 120, far: 700 }, ambient: ['#405040', '#0a0c0a', 1.0], torchLights: 0, lights: 7, glowLights: 6, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.4 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    x1: { t: [2.6, 5.5], kind: 'stop', label: 'STAIRWELL' }, c1: { t: [8.5, 5.5] }, j5: { t: [16.5, 5.5] }, r305: { t: [16.5, 2.0], kind: 'stop', label: 'ROOM 305' }, r306: { t: [16.5, 9.4], kind: 'stop', label: 'ROOM 306' },
    c2: { t: [27.5, 5.5] }, l1: { t: [39.6, 5.0], kind: 'stop', label: 'THE LOOKOUT' }, g2: { t: [27.5, 12.2], kind: 'stop', label: 'THE HOLE' }, g3: { t: [27.5, 18.0] },
    c4: { t: [33.5, 18.0], kind: 'stop', label: 'ROOM SERVICE' }, sh: { t: [39.8, 18.0], kind: 'exit', open: true, label: 'THE SERVICE SHAFT', to: ['00C', 'n1'] },
    c3: { t: [21.5, 18.0] }, j6: { t: [14.5, 18.0] }, r312: { t: [14.5, 21.8], kind: 'stop', label: 'ROOM 312' }, r7b: { t: [14.5, 14.6], kind: 'door', label: 'ROOM 3-7' }
  },
  edges: [
    { a: 'x1', b: 'c1' }, { a: 'c1', b: 'j5' }, { a: 'j5', b: 'r305' }, { a: 'j5', b: 'r306' }, { a: 'j5', b: 'c2' }, { a: 'c2', b: 'l1' }, { a: 'c2', b: 'g2' },
    { a: 'g2', b: 'g3', kind: 'jump', apex: 2.2 }, { a: 'g3', b: 'c4' }, { a: 'c4', b: 'sh', gate: 'shaft' }, { a: 'g3', b: 'c3' }, { a: 'c3', b: 'j6' }, { a: 'j6', b: 'r312' }, { a: 'j6', b: 'r7b' }
  ],
  gates: { shaft: { kind: 'flag', flag: 'bellRung', line: 'The shaft doors are shut. Someone has to ring for service.', hint: 'bell' } },
  targets: [{ id: 'bell', at: [92, 5, 3.6], r: 1.6, far: true, flag: 'bellRung', beat: 'bell_rung' }],
  spots: [
    { id: 'r7b', node: 'r7b', kind: 'room7', label: 'ROOM 3-7' }, { id: 'doc_menu', node: 'r305', kind: 'pickup', item: 'doc_menu' }, { id: 'red305', edge: 'j5-r305', s: .6, kind: 'pickup', item: 'red5', n: 12 },
    { id: 'rime306', node: 'r306', kind: 'pickup', item: 'rime', n: 4 }, { id: 'pin2', edge: 'j5-c2', s: .8, kind: 'pickup', item: 'pin2' }, { id: 'rime_c4', edge: 'g3-c4', s: .3, kind: 'pickup', item: 'rime', n: 3 },
    { id: 'red312', node: 'r312', kind: 'pickup', item: 'red5', n: 15 }, { id: 'rime312', edge: 'j6-r312', s: .5, kind: 'pickup', item: 'rime', n: 3 }, { id: 'red_l1', edge: 'c2-l1', s: .5, kind: 'pickup', item: 'red5', n: 8 },
    { id: 'lookout', node: 'l1', kind: 'tableau', lines: 'lookout', label: 'THE LIGHT WELL' }, { id: 'pim2', node: 'c4', kind: 'npc', who: 'pim', beat: 'pim2', once: true, label: 'THE LIFT BOY' },
    { id: 'hole', node: 'g2', kind: 'tableau', lines: 'hole', label: 'THE HOLE' }
  ],
  spawns: { d1: [12.5, 3.5], d2: [8.5, 7.5], d3: [5.5, 4.5], d4: [19.5, 8.5], t306: [17.5, 9.5], cart: [36.5, 5.5], col1: [36.5, 18.5], col2: [38.5, 17.5], s312: [14.5, 22.5], g3a: [21.5, 17.5] },
  waves: {
    doors1: { spawn: [['giggler', 'd1', 0], ['giggler', 'd2', .4], ['giggler', 'd3', 1.6]] }, twins: { spawn: [['twins', 't306', 0]] },
    cart: { spawn: [['icecuber', 'cart', 0], ['giggler', 'd4', 2]] }, collapse: { spawn: [['giggler', 'col1', 1.5], ['giggler', 'col2', 3]] }, r312: { spawn: [['bellboy', 's312', 0], ['giggler', 'g3a', 1]] }
  },
  triggers: [
    { id: 'doors1', edge: 'c1-j5', s: .3, wave: 'doors1', tip: 'turn' }, { id: 'twins', node: 'r306', wave: 'twins' }, { id: 'cart', edge: 'j5-c2', s: .3, wave: 'cart' },
    { id: 'lookout', node: 'l1', beat: 'lookout_hint' }, { id: 'gapjump', node: 'g3', flag: 'gapJumped' }, { id: 'collapse', edge: 'g3-c4', s: .5, beat: 'collapse' }, { id: 'r312', node: 'r312', wave: 'r312' }
  ],
  props: [
    ['shape', 'room-door', 12, 3.1, 0, { facing: Math.PI / 2, n: 301 }], ['shape', 'room-door', 8, 6.9, 0, { facing: -Math.PI / 2 }], ['shape', 'room-door', 22, 3.1, 0, { facing: Math.PI / 2 }], ['shape', 'room-door', 31, 6.9, 0, { facing: -Math.PI / 2 }],
    ['shape', 'room-door', 20, 16.1, 0, { facing: Math.PI / 2 }], ['shape', 'room-door', 33, 19.9, 0, { facing: -Math.PI / 2 }], ['shape', 'room-service-cart', 33.2, 18.9, 0], ['shape', 'room-service-cart', 35.5, 5.0, 0],
    ['shape', 'room7-door', 14.5, 14.1, 0, { facing: Math.PI / 2 }], ['shape', 'bed', 16, 1.6, 0, { facing: Math.PI / 2 }], ['shape', 'bed', 16, 9.8, 0, { facing: -Math.PI / 2 }], ['shape', 'bed', 13, 22.6, 0, { facing: -Math.PI / 2 }],
    ['shape', 'shaft-doors', 40.8, 18, 0, { facing: Math.PI }], ['pen', 'service-bell', 92, 5, 3.6], ['pen', 'lightwell', 41, 1, 0, { x1: 98, y1: 24 }], ['pen', 'broken-floor', 26, 13, 0, { x1: 28, y1: 16 }],
    ['light', 8, 5, 2.4, { color: '#d8ffd0', reach: 110, power: 12 }], ['light', 20, 5, 2.4, { color: '#d8ffd0', reach: 110, power: 12, flicker: .6 }], ['light', 33, 5, 2.4, { color: '#d8ffd0', reach: 110, power: 12 }],
    ['light', 20, 18, 2.4, { color: '#d8ffd0', reach: 110, power: 12 }], ['light', 34, 18, 2.4, { color: '#ffe0b0', reach: 110, power: 12 }], ['light', 92, 5, 6, { color: '#ffd080', reach: 240, power: 30 }], ['light', 14.5, 15.5, 2, { color: '#ffc880', reach: 70, power: 8 }]
  ]
});

/* ---- 00C THE SERVICE SHAFT (Bellcaptain Grau): a ring rail round the shaft floor; the car runs up and down ---- */
S7.area('00C', {
  title: 'THE SERVICE SHAFT', sub: 'BELLCAPTAIN AUGUSTIN GRAU', target: 0, music: 'shaft', ambience: 'shaft', start: 'n1', interior: true, accent: '#d01818', boss: 'grau',
  world: {
    level: { rows: B(18, 18, [['fill', 2, 2, 15, 15, '.'], ['fill', 7, 7, 10, 10, 'o']]), legend: { '#': { wall: 340 }, o: { floor: 0, ground: 'metal' } }, ground: 'flagstone', colors: { base: '#3a3438', dark: '#1a1418', light: '#5a5458' }, side: 'metal', color: '#2a2026', wallSide: 'brick' },
    sky: '#020102', fog: { color: '#100406', near: 120, far: 700 }, ambient: ['#5a2028', '#100406', 1.1], torchLights: 0, lights: 6, glowLights: 6, overlay: { fov: 64 },
    filter: { bands: 3, ink: 1, inkW: 1.6, punch: 1.5 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: { n1: { t: [4, 4], label: 'NORTH-WEST' }, n2: { t: [14, 4], label: 'NORTH-EAST' }, n3: { t: [14, 14], label: 'SOUTH-EAST' }, n4: { t: [4, 14], label: 'SOUTH-WEST' } },
  edges: [['n1', 'n2', [15.4, 2.6, 2.2]], ['n2', 'n3', [15.4, 15.4, 2.2]], ['n3', 'n4', [2.6, 15.4, 2.2]], ['n4', 'n1', [2.6, 2.6, 2.2]]].map(([a, b, at]) => ({ a, b, cams: [{ s: [0, 1], shot: 'fixed', at, look: 'hero', lookUp: 3, fov: 64 }], rcams: [{ s: [0, 1], shot: 'fixed', at: [18 - at[0], 18 - at[1], 2.2], look: 'hero', lookUp: 3, fov: 64 }] })),
  spots: [], spawns: { top1: [6, 6], top2: [12, 12], top3: [12, 6], top4: [6, 12] },
  props: [['pen', 'shaft', 9, 9, 0], ['light', 9, 9, 9, { color: '#ff3030', reach: 220, power: 16, flicker: 0 }], ['light', 9, 9, 3, { color: '#ffd8b0', reach: 160, power: 10 }], ['light', 3, 3, 2, { color: '#ff6040', reach: 120, power: 10 }], ['light', 15, 15, 2, { color: '#ff6040', reach: 120, power: 10 }]],
  onEnter(G) { if (!G.flags.grauDead) S7.runBeat('grau_intro'); }
});
