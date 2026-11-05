/* ROOM 7 (§7.16): one persistent room; every Room 7 door leads here. A loop of six stops: the door, the wardrobe, the
 * bed (Oma Holle; Sister Rosalind knits beside it), the window, the cuckoo clock (save), the wax bench (upgrades). */
S7.area('room7', {
  title: 'ROOM 7', sub: 'GRAND HOTEL NADA', kind: 'room7', music: 'room7', ambience: 'room7',
  world: { kind: 'level', w: 14, h: 12, wallH: 4.5, rooms: [[1, 1, 13, 11]], ground: 'planks', colors: { base: '#4a3226', dark: '#2e1e16', light: '#6a4a36' }, side: 'planks', wallColor: '#3a2620',
    sky: '#0a0608', fog: { color: '#120a0c', near: 200, far: 900 }, ambient: ['#6a5048', '#20140e', 1.5], lights: 4, torchLights: 0, palette: 'room7' },
  nodes: {
    door: { t: [7, 10.1], kind: 'stop', label: 'DOOR' },
    wardrobe: { t: [3, 8], kind: 'stop', label: 'WARDROBE' },
    bed: { t: [3.4, 4.6], kind: 'stop', label: 'BED' },
    window: { t: [7, 2.4], kind: 'stop', label: 'WINDOW' },
    clock: { t: [10.8, 4.4], kind: 'stop', label: 'CLOCK' },
    bench: { t: [10.8, 8], kind: 'stop', label: 'WAX BENCH' }
  },
  edges: [
    { a: 'door', b: 'wardrobe', via: [[4.6, 9.6]] }, { a: 'wardrobe', b: 'bed' }, { a: 'bed', b: 'window', via: [[4.8, 2.8]] },
    { a: 'window', b: 'clock', via: [[9.4, 2.8]] }, { a: 'clock', b: 'bench' }, { a: 'bench', b: 'door', via: [[9.4, 9.6]] }
  ],
  spots: [
    { id: 'door', kind: 'r7door', node: 'door', label: 'Room 7 door' },
    { id: 'wardrobe', kind: 'wardrobe', node: 'wardrobe', label: 'The Wardrobe' },
    { id: 'bed', kind: 'bed', node: 'bed', label: 'Oma Holle' },
    { id: 'rosalind', kind: 'rosalind', at: [5.2, 4.2], label: 'Sister Rosalind', reach: 2.8 },
    { id: 'window', kind: 'window', node: 'window', label: 'The window' },
    { id: 'clock', kind: 'clock', node: 'clock', label: 'Cuckoo Clock' },
    { id: 'phone', kind: 'r7phone', at: [12, 6.2], label: 'Telephone', reach: 2.6 },
    { id: 'bench', kind: 'bench', node: 'bench', label: 'Wax Bench' }
  ],
  spawns: {}, waves: {}, triggers: [],
  props: [
    ['shape', 'S7:holle-bed', 2.2, 3.2, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:wardrobe', 1.6, 8, 0, { facing: 0 }],
    ['shape', 'S7:cuckoo-clock', 12.4, 4.4, 0, { facing: Math.PI }],
    ['shape', 'S7:wax-bench', 12.2, 8.4, 0, { facing: Math.PI }],
    ['shape', 'kaykit-furniture-bits:armchair', 5.4, 3.6, 0, { facing: Math.PI * .75, scale: 1.2 }],
    ['shape', 'kaykit-furniture-bits:table-small', 12.2, 6.2, 0, { facing: Math.PI, scale: 1.1 }],
    ['shape', 'S7:candlestick-phone', 12.2, 6.2, .9, { facing: Math.PI }],
    ['shape', 'S7:radiator', 9.2, 1.4, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:team-photo', 1.2, 5.8, 1.6, { facing: 0 }],
    ['shape', 'kaykit-furniture-bits:rug-rectangle-a', 7, 6, 0, { facing: 0, scale: 1.6 }],
    ['thing', 'r7window', 7, 1.05, 0],
    ['thing', 'r7lamp', 7, 6, 3.4], ['thing', 'chessboard', 3.4, 5.4, .5],
    ['light', 7, 6, 3.2, { color: '#ffc880', reach: 150, power: 3.2, flicker: .03 }],
    ['light', 7, 1.6, 2.6, { color: '#7a9aff', reach: 120, power: 1.6 }],
    ['light', 12, 4.4, 2.2, { color: '#ffb060', reach: 70, power: 1 }]
  ],
  people: [
    { who: 'holle', at: [2.6, 3.4], z: .62, pose: 'down', facing: Math.PI / 2 },
    { who: 'rosalind', at: [5.25, 3.7], z: 0, pose: 'kneel', facing: Math.PI, knit: true },
    { who: 'fohn', at: [4.2, 6.2], z: 0, pose: 'kneel', facing: -Math.PI * .75, epilogue: true }
  ],
});
