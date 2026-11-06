// Every place in the Kettle, as data. `r`: flatten radius. `props`: [modelId, dx, dz, turnDegrees, options]. `squad`: who holds it.
const sb = (dx, dz, t = 0) => ['sandbag-run', dx, dz, t];
// Fort Clement's four walls, a bay at a time, with a gap for the gate north and south. Each faces its parapet out.
function fortWalls() {
  const out = [];
  for (const [z, turn] of [[-38, 0], [38, 180]]) {
    for (const sx of [-1, 1]) { for (const d of [7, 13, 19, 25, 31]) out.push(['fort-bay', sx * d, z, turn]); out.push(['fort-bay-end', sx * 36, z, turn]); }
    out.push(['fort-gate', 0, z, turn]);
  }
  for (const [x, turn] of [[-38, 90], [38, -90]]) {
    for (let k = 0; k < 12; k++) out.push(['fort-bay', x, -35 + k * 6, turn]);
    out.push(['fort-bay-end', x, 36, turn]);
  }
  return out;
}
export const SITES = {
  'mile-forty': { name: 'MILE FORTY', at: [0, 40], r: 78, map: 'town', noFire: 70,
    props: [
      ['station', -12, 28, 0], ['signal-mast', 40, 33, 0], ['clinic-tent', -46, -22, 90], ['shack', 34, -22, 200], ['bar', -22, -40, 180],
      ['market-stall', -14, -14, 20], ['market-stall', -26, -18, -15], ['market-stall', 14, -22, 170], ['notice-board', 0, 18, 0], ['well', 12, -30, 0], ['lamp-post', -8, 14, 0], ['lamp-post', 24, 4, 0],
      ['table', 36.5, -15.5, 20], ['chair', 33.6, -14, 110], ['stool', 31.5, -18.5, 0], ['crate', 40, -22, 10], ['crate', 42, -19, 40], ['barrel', 38, -28, 0], ['sack', -30, -16, 0], ['sack', -32, -15, 30], ['shack', -60, 34, 90], ['shack', 60, 10, -90], ['radio-mast', -70, -36, 0],
    ],
    npcs: [ { who: 'odile', dx: -40, dz: -22, yaw: 90 }, { who: 'tibor', dx: 34, dz: -18, yaw: 0 }, { who: 'bakr', dx: 8, dz: 30, yaw: 180 } ],
    halts: 'halt-mile',
  },
  'pump-shed': { name: 'PUMP SHED', at: [-120, 150], r: 22, map: 'house', safehouse: true, starts: true,
    props: [['shack', 0, 0, 30], ['oil-drum', 7, 4, 0], ['oil-drum', 8, 2, 0], ['crate', -6, 6, 15], ['acacia-a', 14, -8, 0]],
    safe: { bed: [2, -1], locker: [-2, -1], crate: [3, 2], wall: [0, -3] },
  },
  'ranger-post': { name: 'RANGER POST', at: [40, -170], r: 34, map: 'post', faction: 'concord', safehouseAfter: 'm2',
    props: [['barracks', -10, -14, 10], ['watchtower', 16, -18, 0], ['post-cage', 12, 8, 0], sb(-16, 12, 0), sb(-8, 16, 20), sb(20, 14, -30), ['crate', -8, 8, 0], ['oil-drum', -3, -9, 0], ['radio-mast', -22, -2, 0], ['campfire', -18, 2, 0]],
    squad: { faction: 'concord', n: 8, tower: [16, -18] }, safe: { bed: [-12, -14], locker: [-8, -14], crate: [-5, -11], wall: [-10, -18] },
    cover: [[-16, 12], [-8, 16], [20, 14], [-2, 2]], tag: 'ranger',
  },
  'water-tower': { name: 'WATER TOWER', at: [470, -180], r: 34, map: 'house', faction: 'harvest', safehouse: true, guarded: true,
    props: [['water-tower', 0, -8, 0], ['shack', -14, 8, 80], ['shack', 12, 14, -20], sb(-20, -8, 90), sb(18, -14, 45), ['oil-drum', -6, 2, 0], ['crate', 4, 2, 0], ['campfire', 8, 8, 0]],
    squad: { faction: 'harvest', n: 6 }, safe: { bed: [-14, 8], locker: [-11, 11], crate: [4, 2], wall: [-17, 5] },
    cover: [[-20, -8], [18, -14], [0, -8], [-6, 2]],
  },
  'fort-clement': { name: 'FORT CLEMENT', at: [-430, -180], r: 62, map: 'fort', faction: 'concord', hq: true, inner: { dx: 20, dz: -18, r: 9 },
    props: [...fortWalls(), ['barracks', -20, -16, 90], ['barracks', 20, -18, -90], ['office', 0, -24, 0], ['stool', 0, -20.2, 0], ['table', 0, -18.9, 0], ['chair', 3, -17.4, 200], ['flag-pole', 0, 4, 0], ['oil-drum', 14, 8, 0], ['crate', -14, 10, 0], ['watchtower', 34, 34, 0], ['watchtower', -34, -34, 0]],
    squad: { faction: 'concord', n: 12, tower: [34, 34] },
    npcs: [{ who: 'vance', dx: 0, dz: -20, yaw: 0 }],
    cover: [[14, 8], [-14, 10], [20, -18], [-20, -16], [0, 4]],
  },
  'long-field': { name: 'THE LONG FIELD', at: [-260, -300], r: 40, map: 'field', faction: 'concord', crop: { w: 180, d: 120 },
    props: [['bunker', 20, -20, 0], ['shack', -30, 34, 0], ['oil-drum', 28, -14, 0], ['oil-drum', 30, -16, 0], sb(12, -8, 20), sb(30, -6, -20)],
    squad: { faction: 'concord', n: 8 }, cover: [[12, -8], [30, -6], [20, -20]],
    tags: { bunker: [20, -20] },
  },
  granary: { name: 'THE GRANARY', at: [400, 280], r: 58, map: 'fort', faction: 'harvest', hq: true, inner: { dx: 6, dz: -28, r: 9 },
    props: [['flag-pole', -30, 14, 0], ['silo', -10, -24, 0], ['silo', 6, -28, 0], ['silo', 22, -24, 0], ['shack', 26, 4, -90], ['shack', -28, 8, 90], ['schoolroom', 12, 14, 180], ['oil-drum', 22, -10, 0], ['crate', -14, -6, 0], sb(-36, 16, 0), sb(34, 34, 0), ['watchtower', 40, -30, 0]],
    squad: { faction: 'harvest', n: 12, tower: [40, -30] },
    npcs: [{ who: 'ansa', dx: 12, dz: 15, yaw: 180 }],
    cover: [[-10, -24], [6, -28], [22, -24], [-14, -6], [22, -10], [-36, 16], [34, 34]],
  },
  'east-siding': { name: 'EAST SIDING', at: [430, -60], r: 42, map: 'depot', faction: 'harvest', tag: 'siding',
    props: [['shack', -24, 18, 90], ['oil-drum', 2, 18, 0], ['oil-drum', 4, 20, 0], ['oil-drum', 6, 18, 0], sb(-28, -14, 30), sb(28, -18, -20), ['crate', -14, 18, 0], ['watchtower', 30, 16, 0], ['boxcar', -14, -2, 75]],
    squad: { faction: 'harvest', n: 8, tower: [30, 16] },
    tanks: [[36, -60], [50, -66], [64, -72]],   // downwind of the grass east of the road, under M3's pinned wind
    cover: [[-28, -14], [28, -18], [-8, 14], [2, 18]],
    halts: 'halt-east',
  },
  'three-wells': { name: 'THREE WELLS', at: [-260, 240], r: 50, map: 'village', civilians: 12,
    props: [['well', 8, -6, 0], ['well', -14, -14, 0], ['well', 14, 12, 0], ['hut', -24, 8, 40], ['hut', -30, 30, 120], ['hut', 18, -18, -40], ['hut', 26, 22, -130], ['hut', -30, -24, 70], ['cistern', 32, -2, 0], ['market-stall', 14, -18, 30], ['sack', -10, -2, 0]],
    tag: 'wells',
  },
  'pump-station': { name: 'PUMP STATION', at: [-330, 395], r: 30, map: 'depot', faction: 'concord', tag: 'pump',
    props: [['pump-house', 0, -2, 0], ['oil-drum', 10, 6, 0], ['crate', -10, 6, 0], sb(-14, -14, 20), sb(14, -14, -20)],
    squad: { faction: 'concord', n: 6 }, cover: [[-14, -14], [14, -14], [-10, 6], [10, 6]],
  },
  'salt-pan': { name: 'SALT PAN', at: [200, 470], r: 0, map: 'pan', props: [['wreck-truck', 40, 18, 40], ['dead-tree', -60, -30, 0]] },
  'the-cut': { name: 'THE CUT', at: [150, -300], r: 0, map: 'mine', faction: 'concord', tag: 'cut',
    props: [['headframe', -36, -6, 0], ['sluice-house', 58, -38, 200], ['spoil-heap', -80, 40, 0], ['shovel', -71, 33, 30], ['spoil-heap', 112, 40, 40], ['spoil-heap', 30, 120, 80], ['shack', 90, -6, -70], ['mine-rail', 22, 50, 0], ['crate', 58, 22, 0], ['oil-drum', 66, 14, 0]],
    squad: { faction: 'concord', n: 10 }, cover: [[-36, -6], [58, -38], [90, -6], [58, 22], [30, 120]],
    halts: 'halt-cut',
  },
  observatory: { name: 'OBSERVATORY', at: [-130, -520], r: 30, map: 'obs', tag: 'observatory',
    props: [['observatory-dome', 0, -6, 0], ['trig-pillar-big', 16, 8, 0], ['table-lamp', 0, 1.2, 0], ['stool', 0, -0.1, 0], ['radio-mast', -18, -4, 0], ['crate', 10, -14, 0], sb(-18, 14, 0), sb(14, 18, 10)],
    squad: { faction: 'deserter', n: 6 }, cover: [[-18, 14], [14, 18], [16, 8]],
    npcs: [{ who: 'harrow', dx: 0, dz: 0, yaw: 0 }],
  },
  'the-pass': { name: 'THE PASS', at: [-590, -430], r: 26, map: 'pass', tag: 'pass',
    props: [['boom-gate', 6, 0, 90], ['sign-border', -8, 8, 0], ['rubble', 12, 12, 0], ['boulders', -14, -14, 0], ['boulders', 16, -18, 0]],
  },
};
// Checkpoints: posts of 4 to 6 with a boom gate, sometimes a technical.
export const POSTS = {
  p1: { name: 'P1', at: [90, -80], faction: 'concord', n: 5, yaw: 0.6 },
  p2: { name: 'P2', at: [-200, 30], faction: 'concord', n: 4, yaw: 1.5, technical: true },
  p3: { name: 'P3', at: [170, 90], faction: 'harvest', n: 5, yaw: 1.3 },
  p4: { name: 'P4', at: [-320, -90], faction: 'concord', n: 6, yaw: 0.8, technical: true },
  p5: { name: 'P5', at: [280, -210], faction: 'concord', n: 5, yaw: 1.6 },
  p6: { name: 'P6', at: [300, 390], faction: 'harvest', n: 5, yaw: 0.8, technical: true },
};
export const TRIGS = [
  { id: 't1', at: [-180, -440] }, { id: 't2', at: [340, -340] }, { id: 't3', at: [-490, 120] },
  { id: 't4', at: [40, 410] }, { id: 't5', at: [540, 130] }, { id: 't6', at: [-60, -560] },
];
export const CASES = [
  { id: 'c1', at: [-145, 435], stones: 4, hint: 'wreck', prop: 'wreck-pickup' }, { id: 'c2', at: [515, 40], stones: 3, hint: 'hollow tree', prop: 'bottle-tree' },
  { id: 'c3', at: [380, -270], stones: 5, hint: 'dead mans truck', prop: 'wreck-truck' }, { id: 'c4', at: [-380, 40], stones: 2, hint: 'hollow tree', prop: 'bottle-tree' },
  { id: 'c5', at: [-455, 320], stones: 4, hint: 'wreck', prop: 'wreck-pickup' }, { id: 'c6', at: [90, 340], stones: 3, hint: 'hollow tree', prop: 'bottle-tree' },
  { id: 'c7', at: [260, 180], stones: 2, hint: 'wreck', prop: 'wreck-pickup' }, { id: 'c8', at: [-70, -300], stones: 6, hint: 'guarded shed', prop: 'shack' },
  { id: 'c9', at: [560, -60], stones: 3, hint: 'wreck', prop: 'wreck-truck' }, { id: 'c10', at: [-540, -120], stones: 5, hint: 'guarded shed', prop: 'shack' },
  { id: 'c11', at: [120, 110], stones: 2, hint: 'hollow tree', prop: 'bottle-tree' }, { id: 'c12', at: [-240, -470], stones: 6, hint: 'wreck', prop: 'wreck-truck' },
];
export const HALTS = {
  'halt-west': { name: 'WEST CUTTING', at: [-300, 100] }, 'halt-mile': { name: 'MILE FORTY', at: [0, 70] },
  'halt-east': { name: 'EAST SIDING', at: [425, -58] }, 'halt-cut': { name: 'CUT SPUR', at: [186, -268] },
};
