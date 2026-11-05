/* TARGET 00 · 00B THE THIRD FLOOR (§11.7): a long corridor of numbered doors that open behind you, a hole in the floor
 * (Dagny's jump), the ceiling that falls (the Sweep's rescue), Room 7 "3-7", the lookout across the light well where the
 * giant service bell hangs, far (Ignaz's Long Look), and the shaft doors to Grau. */
S7.area('00B', {
  title: 'GRAND HOTEL NADA', sub: 'THIRD FLOOR', target: 0, music: 'hotel', ambience: 'roomtone', sweepNode: 'r7b',
  world: { kind: 'level', w: 120, h: 18, wallH: 3.6,
    rooms: [[1, 8, 30, 11], [10, 3, 16, 8], [16, 11, 22, 16], [34, 8, 66, 11], [42, 11, 48, 16], [43, 6, 46, 8], [52, 1, 58, 8]],
    pits: [[30, 8, 34, 11], [58, 1, 119, 7]],
    ground: 'planks', colors: { base: '#4a5a40', dark: '#2a3424', light: '#6a7a58' }, side: 'block', wallColor: '#a8b49a', wallTop: '#2a3020',
    sky: '#020403', fog: { color: '#0c100c', near: 150, far: 700 }, ambient: ['#3a4a38', '#0c100a', 1.2], lights: 6, palette: 'thirdfloor' },
  nodes: {
    x1: { t: [2.5, 9.5], kind: 'exit', label: 'STAIRWELL', to: ['00A', 'x1'], always: true },
    c1: { t: [8.5, 9.5], kind: 'pass' },
    j5: { t: [15.5, 9.5], kind: 'junction', label: 'ROOMS 305 · 306' },
    r305: { t: [12.5, 5.5], kind: 'stop', label: 'ROOM 305' },
    r306: { t: [18.5, 13.5], kind: 'stop', label: 'ROOM 306' },
    c2: { t: [24.5, 9.5], kind: 'stop', label: 'ROOM SERVICE' },
    g2: { t: [29.2, 9.5], kind: 'stop', label: 'THE HOLE' },
    lz: { t: [35.5, 9.5], kind: 'pass' },
    c3: { t: [39.5, 9.5], kind: 'pass' },
    j6: { t: [44.5, 9.5], kind: 'junction', label: '3-7' },
    r7b: { t: [44.5, 7.0], kind: 'door', label: 'ROOM 7 · "3-7"' },
    r312: { t: [45, 13.5], kind: 'stop', label: 'ROOM 312' },
    c4: { t: [55.5, 9.5], kind: 'junction', label: 'CORRIDOR END' },
    l1: { t: [55.5, 3.5], kind: 'stop', label: 'LOOKOUT' },
    sh: { t: [64.5, 9.5], kind: 'exit', label: 'SERVICE SHAFT', to: ['00C', 's1'], open: true, needs: { flag: 'bellRung' }, line: 'The shaft doors are shut. Ring for service.' }
  },
  edges: [
    { a: 'x1', b: 'c1' }, { a: 'c1', b: 'j5' }, { a: 'j5', b: 'r305' }, { a: 'j5', b: 'r306' }, { a: 'j5', b: 'c2' }, { a: 'c2', b: 'g2' },
    { a: 'g2', b: 'lz', kind: 'jump', apex: 1.6, label: 'JUMP' },
    { a: 'lz', b: 'c3' }, { a: 'c3', b: 'j6' }, { a: 'j6', b: 'r7b' }, { a: 'j6', b: 'r312' }, { a: 'j6', b: 'c4' }, { a: 'c4', b: 'l1' }, { a: 'c4', b: 'sh', gate: 'shaft' }
  ],
  gates: { shaft: { kind: 'flag', flag: 'bellRung', label: 'SHAFT DOORS', solver: 'ignaz', line: 'The shaft doors are shut. Ring for service.' } },
  spots: [
    { id: 'door7', kind: 'door7', node: 'r7b', label: 'Room 7 · "3-7"' },
    { id: 'pin2', kind: 'pin', pin: 2, node: 'c2' },
    { id: 'menu', kind: 'dossier', dossier: 'roomservice', node: 'r305' },
    { id: 'red305', kind: 'red', n: 12, edge: 'j5-r305', s: .6 },
    { id: 'rime306', kind: 'rime', n: 4, node: 'r306' },
    { id: 'rime312', kind: 'rime', n: 4, node: 'r312' },
    { id: 'rimeL', kind: 'rime', n: 3, edge: 'c4-l1', s: .5 },
    { id: 'red1', kind: 'red', n: 10, edge: 'c1-j5', s: .5 },
    { id: 'red2', kind: 'red', n: 10, edge: 'c3-j6', s: .5 },
    { id: 'pim', kind: 'pim', at: [56.5, 9.5], talk: 'pim_00B', label: 'Pim', reach: 3 },
    { id: 'hole', kind: 'sign', node: 'g2', line: 'The floor has fallen through. The other side is five metres off. Someone in a hurry might clear it.' },
    { id: 'bell', kind: 'far', target: true, far: true, at: [116, 4], atZ: 2.6, r: 1.4, beat: 't00_bell', label: 'THE SERVICE BELL' },
    { id: 'stair', kind: 'exit', node: 'x1', label: 'Stairwell' }
  ],
  spawns: { d1: [5.5, 9.5], d2: [12.5, 7.5], d3: [11.5, 9.5], d4: [21.5, 9.5], d5: [18.5, 11.5], cart: [28.5, 9.6], tw: [20.5, 14.5], res1: [47.5, 9.5], res2: [50.5, 9.5], b312a: [46.5, 15], b312b: [43, 15], end1: [61.5, 9.5], end2: [63.5, 9.2] },
  waves: {
    doors1: { spawn: [['giggler', 'd1', 0], ['giggler', 'd2', .6]] },
    doors2: { spawn: [['giggler', 'd3', 0], ['giggler', 'd4', .4], ['bellboy', 'd5', 1.2]] },
    twins: { spawn: [['twins', 'tw', 0]] },
    cart: { spawn: [['snowballer', 'cart', 0]] },
    rescue: { spawn: [['giggler', 'res1', 0], ['giggler', 'res2', 1.4]] },
    r312: { spawn: [['bellboy', 'b312a', 0], ['bellboy', 'b312b', .8]] },
    shaftguard: { spawn: [['giggler', 'end1', 0], ['bellboy', 'end2', 1], ['giggler', 'end1', 3]] }
  },
  triggers: [
    { id: 'doors1', edge: 'c1-j5', s: .4, wave: 'doors1', tut: 'quickturn' },
    { id: 'doors2', edge: 'j5-c2', s: .3, wave: 'doors2' },
    { id: 'twins', node: 'r306', wave: 'twins' },
    { id: 'cart', edge: 'j5-c2', s: .5, wave: 'cart' },
    { id: 'collapse', edge: 'lz-c3', s: .6, beat: 't00_collapse', flag: 'jumped' },
    { id: 'jumped', node: 'lz', set: 'jumped' },
    { id: 'r312', node: 'r312', wave: 'r312' },
    { id: 'shaft', node: 'c4', wave: 'shaftguard', flag: 'bellRung' },
    { id: 'jumptip', node: 'g2', tut: 'jump' },
    { id: 'longtip', node: 'l1', tut: 'longlook' }
  ],
  props: [
    ['shape', 'S7:room-door', 6, 7.9, 0, { facing: Math.PI / 2 }], ['shape', 'S7:room-door', 11.5, 11.1, 0, { facing: -Math.PI / 2 }], ['shape', 'S7:room-door', 21.5, 7.9, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:room-door', 26.5, 11.1, 0, { facing: -Math.PI / 2 }], ['shape', 'S7:room-door', 38, 7.9, 0, { facing: Math.PI / 2 }], ['shape', 'S7:room-door', 52, 11.1, 0, { facing: -Math.PI / 2 }],
    ['shape', 'S7:room7-door', 44.5, 6.1, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:room-service-cart', 25, 10.4, 0, { facing: 0 }], ['shape', 'S7:room-service-cart', 28.3, 10.2, 0, { facing: .5 }],
    ['shape', 'kaykit-furniture-bits:bed-single-a', 12, 4.5, 0, { facing: Math.PI / 2, scale: 1.3 }], ['shape', 'kaykit-furniture-bits:bed-double-a', 19.5, 14.5, 0, { facing: -Math.PI / 2, scale: 1.3 }],
    ['shape', 'kaykit-furniture-bits:bed-single-b', 45.5, 14.6, 0, { facing: -Math.PI / 2, scale: 1.3 }], ['shape', 'kaykit-furniture-bits:cabinet-small', 14.6, 4, 0, { scale: 1.3 }],
    ['shape', 'S7:sconce', 1.2, 9.5, 2, { facing: 0 }], ['shape', 'S7:sconce', 33.8, 9.5, 2, { facing: 0 }],
    ['shape', 'S7:service-bell-big', 116, 4, 2.6, { facing: Math.PI }],
    ['thing', 'runner', 15.5, 9.5, 0, { w: 28, d: 1.6, color: '#3a5a30' }], ['thing', 'runner', 50, 9.5, 0, { w: 30, d: 1.6, color: '#3a5a30' }],
    ['thing', 'bellbig', 116, 4, 2.6],
    ['light', 8.5, 9.5, 3.2, { color: '#d8f0c0', reach: 110, power: 2.2, flicker: .08 }],
    ['light', 22, 9.5, 3.2, { color: '#d8f0c0', reach: 110, power: 2.2, flicker: .6 }],
    ['light', 40, 9.5, 3.2, { color: '#d8f0c0', reach: 120, power: 2.4, flicker: .05 }],
    ['light', 55, 4, 3, { color: '#c0d8ff', reach: 140, power: 2.4 }],
    ['light', 116, 4, 5, { color: '#ffe8b0', reach: 140, power: 2.6 }],
    ['light', 62, 9.5, 3, { color: '#ff4030', reach: 90, power: 2 }]
  ],
  people: [{ who: 'pim', at: [56.5, 9.5], z: .6 }]
});

/* TARGET 00 · 00C THE SERVICE SHAFT: Grau's arena. A ring rail round the shaft floor; the car above (§11.8) */
S7.area('00C', {
  title: 'THE SERVICE SHAFT', sub: 'BELLCAPTAIN GRAU', target: 0, music: 'shaft', ambience: 'roomtone', boss: 'grau',
  world: { kind: 'level', w: 16, h: 16, wallH: 30, rooms: [[3, 3, 13, 13]], ground: 'plain', colors: { base: '#2a2626', dark: '#141212', light: '#3a3434' }, side: 'metal', wallColor: '#2a2a30', wallTop: '#141418',
    sky: '#000000', fog: { color: '#100406', near: 200, far: 900 }, ambient: ['#3a3038', '#0a0606', 1.1], lights: 5 },
  nodes: { s1: { t: [5.2, 10.8], kind: 'stop', label: 'SOUTH-WEST' }, n2: { t: [10.8, 10.8], kind: 'stop', label: 'SOUTH-EAST' }, n3: { t: [10.8, 6.2], kind: 'stop', label: 'NORTH-EAST' }, n4: { t: [5.2, 6.2], kind: 'stop', label: 'NORTH-WEST' } },
  edges: [{ a: 's1', b: 'n2' }, { a: 'n2', b: 'n3' }, { a: 'n3', b: 'n4' }, { a: 'n4', b: 's1' }],
  spots: [], spawns: { top1: [6, 8], top2: [10, 8], top3: [8, 9] }, waves: {}, triggers: [],
  props: [
    ['thing', 'beacon', 3.4, 3.4, 4], ['thing', 'beacon', 12.6, 12.6, 4],
    ['light', 8, 8, 4, { color: '#ff2020', reach: 140, power: .9, flicker: .2, tag: 'beacon' }],
    ['light', 8, 3.5, 12, { color: '#ffe0b0', reach: 260, power: 3.4, tag: 'car' }], ['light', 8, 12, 2.5, { color: '#c8d0ff', reach: 160, power: 1.2 }]
  ],
  onEnter(sim) { sim.startBoss('grau', 0); },
  /** looking past the hero, up the shaft at the car */
  camera(sim, h) { if (sim.aim.on || sim.camOverride || !sim.boss) return null; const car = [8 * M, 3.7 * M, (sim.boss.car ? sim.boss.car.z : 96) + 24], d = Math.atan2(car[1] - h.y, car[0] - h.x); const back = Math.min(3.8 * M, Math.hypot(h.x - 8 * M, h.y - 8 * M) + 1.4 * M); return sim.cam.aimSafe(h, [h.x - Math.cos(d) * back + Math.cos(d + 1.57) * 1.6 * M, h.y - Math.sin(d) * back + Math.sin(d + 1.57) * 1.6 * M, h.z + 2.6 * M], [car[0] * .6 + h.x * .4, car[1] * .6 + h.y * .4, car[2] * .7 + h.z * .3], 66); }
});
