// Every place in the Kettle, as data. Props: [modelId, dx, dz, yawDeg, options]. Offsets from the site's centre.
// Soldiers: [role, dx, dz, duty]. Usables: { type, at:[dx,dz], ... }. Tune positions by eye (dev mode's crosshair readout).
const post = (id, name, at, faction, yaw, n = 5, tech = false) => ({
  id, name, at, r: 22, kind: 'post', faction, onMap: false,
  props: [['boom-gate', 0, 0, yaw], ['sandbags', -5, 5, yaw], ['sandbags', 5, -5, yaw + 15], ['sandbags', 7, 5, yaw + 90], ['shack', -11, -9, yaw], ['oil-drum', 8, 8, 0, { tag: 'drum' }], ['cloth-post', 3, 6, 0], ['crate', -8, -3, 20], ['campfire', -6, 10, 0]],
  soldiers: [['rifle', -3, 4, 'guard'], ['rifle', 4, -3, 'guard'], ['mg', 6, 4, 'guard'], ['rifle', -6, 9, 'sit'], ['rifle', -9, -6, 'patrol'], ['rifle', 9, -9, 'patrol']].slice(0, n),
  vehicles: tech ? [['technical', 12, 10, yaw]] : [],
});
const WALL = { params: { length: 6, height: 4.5 } }, TOP = { params: { merlons: 6 }, lift: 4.5 };
// A side of the fort: the library's wall and battlement, laid end to end along its length.
const wallRun = (dx, dz, yaw) => Array.from({ length: 11 }, (_, i) => { const o = (i - 5) * 6; return yaw ? [[`stone-wall`, dx, dz + o, yaw, WALL], [`battlement`, dx, dz + o, yaw, TOP]] : [[`stone-wall`, dx + o, dz, yaw, WALL], [`battlement`, dx + o, dz, yaw, TOP]]; }).flat();
export const SITES = [
  {
    id: 'mile-forty', name: 'MILE FORTY', at: [0, 40], r: 70, kind: 'town', truce: 70, onMap: true,
    props: [
      ['platform', 0, 23, 0], ['signal-mast', 18, 20, 0], ['shack', -22, 8, 90, { label: 'bar' }], ['shack', 24, 6, -90, { palette: { wall: 'mist' } }], ['shack', -36, -12, 40], ['shack', 34, -24, 200, { palette: { wall: 'orange' } }],
      ['clinic-tent', -30, -34, 30], ['clinic-tent', -14, -42, 0], ['rail-shed', 34, 12, 180], ['gun-rack', 30, 4, 180], ['table', 37, 4, 0], ['market-stall', 2, -12, 0], ['market-stall', -10, -14, 25, { palette: { cloth: 'red' } }], ['market-stall', 12, -18, -20, { palette: { cloth: 'sand' } }],
      ['notice-board', -4, 2, 180], ['well', -6, -26, 0], ['lamp-post', -14, 2, 0], ['lamp-post', 12, 0, 0], ['lamp-post', 0, -30, 0], ['crate-stack', 8, 14, 15], ['sack', 12, 14, 0], ['barrel', 40, 18, 0], ['table', -24, 16, 0], ['stool', -27, 16, 0], ['stool', -21, 17, 0], ['bed', -33, -38, 30], ['bed', -28, -42, 30], ['bed', -17, -46, 0], ['bed', -11, -46, 0], ['radio-mast', 44, -6, 0],
    ],
    usables: [{ type: 'board', at: [-4, 3], label: 'READ THE BOARD' }, { type: 'rack', at: [31, 5], label: "LOOK AT TIBOR'S RACK" }],
    npcs: [['odile', -22, -36, 200], ['tibor', 33, 9, 180], ['bakr', 10, 21, 90]],
    civilians: 8, safehouse: false,
  },
  {
    id: 'pump-shed', name: 'PUMP SHED', at: [-120, 150], r: 18, kind: 'safehouse', safehouse: 'pump-shed', onMap: true,
    props: [['shack', 0, 0, 20, { palette: { wall: 'slate' } }], ['bed', -1.5, -1, 20], ['locker', 2.4, -1.4, 110], ['crate', 2.6, 1.6, 0], ['oil-drum', 5, 4, 0], ['shovel', -3.4, 2.6, 15]],
    usables: [{ type: 'bed', at: [-1.5, 0.2] }, { type: 'locker', at: [2, -0.8] }, { type: 'crate', at: [2.2, 1.2] }, { type: 'wall', at: [-1, 2.5] }],
  },
  {
    id: 'ranger-post', name: 'RANGER POST', at: [40, -170], r: 34, kind: 'post', faction: 'concord', safehouse: 'ranger-post', onMap: true,
    props: [['barracks', -12, -6, 0], ['watchtower', 16, -14, 0], ['cage', 8, 8, 30, { tag: 'cage' }], ['sandbags', -4, 18, 0], ['sandbags', 18, 10, 80], ['oil-drum', -18, 6, 0, { tag: 'drum' }], ['campfire', 0, -4, 0], ['bed', -14, -7, 0], ['locker', -9, -9, 0], ['crate', -7, -4, 0], ['radio-mast', -22, -16, 0], ['cloth-post', 12, 16, 0]],
    soldiers: [['sniper', 16, -14, 'tower'], ['rifle', 8, 13, 'guard'], ['rifle', 2, 6, 'sit'], ['rifle', -2, -7, 'sit'], ['mg', -4, 15, 'guard'], ['rifle', 16, 8, 'patrol'], ['rifle', -16, 10, 'patrol'], ['rifle', 20, -4, 'patrol']],
    usables: [{ type: 'bed', at: [-14, -5.8], needs: 'cleared' }, { type: 'locker', at: [-9, -8], needs: 'cleared' }, { type: 'crate', at: [-7, -3], needs: 'cleared' }, { type: 'wall', at: [-11, -3.4], needs: 'cleared' }],
  },
  {
    id: 'water-tower', name: 'WATER TOWER', at: [470, -180], r: 26, kind: 'post', faction: 'harvest', safehouse: 'water-tower', onMap: true,
    props: [['water-tower', 0, 0, 0], ['shack', 12, 8, -90, { palette: { wall: 'teal' } }], ['bed', 11, 7, 0], ['locker', 14, 6, 0], ['crate', 14, 10, 0], ['sandbags', -10, 10, 30], ['sandbags', 10, -10, 80], ['oil-drum', -6, -7, 0, { tag: 'drum' }]],
    soldiers: [['rifle', -8, 8, 'guard'], ['rifle', 8, -8, 'guard'], ['mg', -2, 12, 'guard'], ['rifle', 16, -3, 'patrol'], ['rifle', -12, -6, 'patrol'], ['rifle', 2, -3, 'sit']],
    usables: [{ type: 'bed', at: [11, 8.2], needs: 'cleared' }, { type: 'locker', at: [13.6, 7], needs: 'cleared' }, { type: 'crate', at: [13.6, 9.6], needs: 'cleared' }, { type: 'wall', at: [10, 11], needs: 'cleared' }],
  },
  {
    id: 'fort-clement', name: 'FORT CLEMENT', at: [-430, -180], r: 50, kind: 'hq', faction: 'concord', inner: 26, onMap: true,
    props: [...wallRun(0, -32, 0), ...wallRun(-32, 0, 90), ...wallRun(32, 0, 90), ...[8, 14, 20, 26, 32].flatMap((o) => [['stone-wall', o, 32, 0, WALL], ['battlement', o, 32, 0, TOP], ['stone-wall', -o, 32, 0, WALL], ['battlement', -o, 32, 0, TOP]]), ['fort-wall-gate', 0, 32, 0], ['chair', 1.6, -17.5, 200], ['table', -1.4, -17.6, 0], ['barracks', -16, -16, 0], ['barracks', 16, -16, 0], ['office', 0, -20, 0], ['watchtower', -30, 30, 0], ['watchtower', 30, 30, 0], ['radio-mast', 22, 22, 0], ['cloth-post', 4, 4, 0], ['oil-drum', -24, 18, 0, { tag: 'drum' }], ['crate-stack', 20, 12, 0]],
    soldiers: [['rifle', -6, 26, 'guard'], ['rifle', 6, 26, 'guard'], ['sniper', -30, 30, 'tower'], ['sniper', 30, 30, 'tower'], ['rifle', -10, 4, 'patrol'], ['rifle', 10, 4, 'patrol'], ['mg', 0, 36, 'guard'], ['rocket', -3, 34, 'guard'], ['rifle', 14, -6, 'sit'], ['rifle', -14, -6, 'sit']],
    npcs: [['vance', 0, -17, 0]],
    vehicles: [['technical', 14, 40, 0]],
  },
  {
    id: 'long-field', name: 'THE LONG FIELD', at: [-260, -300], r: 16, kind: 'field', faction: 'concord', onMap: true,
    props: [['bunker', 0, 66, 0, { tag: 'ammo-bunker' }], ['shack', -30, 68, 0], ['oil-drum', -6, 62, 0, { tag: 'drum' }], ['oil-drum', 6, 62, 0, { tag: 'drum' }], ['oil-drum', 16, 70, 0, { tag: 'drum' }], ['sandbags', 10, 58, 0], ['sandbags', -12, 58, 0]],
    crop: { w: 180, h: 120 },
    soldiers: [['rifle', -8, 60, 'guard'], ['rifle', 8, 56, 'guard'], ['mg', 0, 54, 'guard'], ['rifle', -50, 40, 'patrol'], ['rifle', 50, 40, 'patrol'], ['rifle', -50, -40, 'patrol'], ['rifle', 50, -40, 'patrol'], ['rifle', -24, 70, 'sit']],
  },
  {
    id: 'granary', name: 'THE GRANARY', at: [400, 280], r: 42, kind: 'hq', faction: 'harvest', inner: 24, onMap: true,
    props: [['silo', -18, -18, 0], ['silo', -6, -24, 0], ['silo', 8, -24, 0], ['shack', 22, -8, -90, { palette: { wall: 'orange' } }], ['shack', 22, 12, -90, { palette: { wall: 'red' } }], ['schoolroom', -20, 10, 90], ['sandbags', -6, 30, 0], ['sandbags', 8, 30, 0], ['watchtower', 30, 28, 0], ['market-stall', 4, 8, 0, { palette: { cloth: 'red' } }], ['sack', 0, -8, 0], ['sack', 3, -9, 0], ['oil-drum', 18, 24, 0, { tag: 'drum' }], ['cloth-post', 0, 14, 0]],
    soldiers: [['rifle', -4, 34, 'guard'], ['rifle', 6, 34, 'guard'], ['sniper', 30, 28, 'tower'], ['rifle', -10, 0, 'patrol'], ['rifle', 14, -14, 'patrol'], ['mg', 2, 26, 'guard'], ['rocket', -2, 28, 'guard'], ['rifle', 14, 4, 'sit'], ['rifle', -24, -4, 'sit']],
    npcs: [['ansa', -20, 7, 90]],
  },
  {
    id: 'east-siding', name: 'EAST SIDING', at: [430, -60], r: 34, kind: 'depot', faction: 'harvest', onMap: true,
    props: [['fuel-tank', -14, 12, 0, { tag: 'fuel-tank' }], ['fuel-tank', 0, 16, 0, { tag: 'fuel-tank' }], ['fuel-tank', 14, 12, 0, { tag: 'fuel-tank' }], ['shack', -22, -12, 0, { palette: { wall: 'orange' } }], ['shack', 20, -14, 0], ['oil-drum', -6, 8, 0, { tag: 'drum' }], ['oil-drum', 7, 8, 0, { tag: 'drum' }], ['sandbags', 0, -18, 0], ['sandbags', -18, -20, 40], ['watchtower', 26, 22, 0], ['platform', -2, -2, 0, { scale: 0.6 }], ['cloth-post', 22, 2, 0]],
    soldiers: [['rifle', -4, -14, 'guard'], ['rifle', 8, -16, 'guard'], ['sniper', 26, 22, 'tower'], ['rifle', -18, 4, 'patrol'], ['rifle', 18, 4, 'patrol'], ['mg', 0, -20, 'guard'], ['rifle', -20, -8, 'sit'], ['rifle', 16, -10, 'sit']],
  },
  {
    id: 'three-wells', name: 'THREE WELLS', at: [-260, 240], r: 36, kind: 'village', onMap: true,
    props: [['well', -6, 4, 0], ['well', 10, -8, 0], ['well', 4, 14, 0], ['cistern', -20, -18, 0], ['hut', -22, 6, 30, { tag: 'hut' }], ['hut', -12, 20, 80, { tag: 'hut' }], ['hut', 18, 10, 200, { tag: 'hut' }], ['hut', 22, -8, 260, { tag: 'hut' }], ['hut', 4, -22, 140, { tag: 'hut' }], ['hut', -8, -14, 10, { tag: 'hut' }], ['market-stall', 6, 2, 0], ['sack', -2, -4, 0], ['lamp-post', 2, 6, 0]],
    civilians: 12,
  },
  {
    id: 'pump-station', name: 'PUMP STATION', at: [-330, 395], r: 26, kind: 'depot', faction: 'concord', onMap: true,
    props: [['pump-station', 0, 10, 0, { tag: 'pump' }], ['bypass-valve', 10, 2, 0], ['sandbags', -12, -12, 0], ['sandbags', 12, -12, 0], ['shack', -18, 6, 90], ['oil-drum', 14, 12, 0, { tag: 'drum' }], ['cloth-post', 0, -10, 0]],
    soldiers: [['rifle', -8, -8, 'guard'], ['rifle', 8, -8, 'guard'], ['rifle', -14, 0, 'patrol'], ['rifle', 14, 0, 'patrol'], ['mg', 0, -14, 'guard']],
  },
  {
    id: 'salt-pan', name: 'THE SALT PAN', at: [200, 470], r: 10, kind: 'open', onMap: true,
    props: [['dead-tree', 40, 30, 0], ['rubble', -30, -40, 0], ['signpost', 8, -10, 40]],
  },
  {
    id: 'the-cut', name: 'THE CUT', at: [150, -300], r: 12, kind: 'mine', faction: 'concord', onMap: true,
    props: [['headframe', 60, 20, 0], ['sluice-house', -46, -22, 0], ['spoil-heap', 90, -30, 0], ['spoil-heap', 74, 60, 40], ['spoil-heap', -70, 44, 70], ['mine-rail', 20, 44, 90], ['oil-drum', 60, 30, 0, { tag: 'drum' }], ['oil-drum', -38, -14, 0, { tag: 'drum' }], ['crate-stack', 54, 34, 0], ['shack', 74, 18, 30], ['sandbags', 44, 52, 0], ['sandbags', -30, 40, 20]],
    soldiers: [['rifle', 50, 44, 'guard'], ['rifle', 60, 40, 'guard'], ['mg', 46, 56, 'guard'], ['rocket', 56, 52, 'guard'], ['rifle', -34, 36, 'guard'], ['rifle', -40, -12, 'patrol'], ['rifle', 66, 6, 'patrol']],
  },
  {
    id: 'observatory', name: 'OBSERVATORY', at: [-130, -520], r: 20, kind: 'hq', faction: 'deserter', onMap: true,
    props: [['obs-dome', 0, 0, 0], ['trig-pillar-big', 10, 8, 0], ['sandbags', -12, 14, 30], ['sandbags', 14, 14, -30], ['table', 0, 0.8, 0], ['stool', -1.6, 0.9, 0], ['stool', 1.6, 0.9, 0], ['lamp-post', 16, -4, 0]],
    soldiers: [['rifle', -10, 18, 'guard'], ['rifle', 10, 18, 'guard'], ['rifle', -18, 4, 'patrol'], ['rifle', 18, 4, 'patrol'], ['mg', 0, 22, 'guard'], ['sniper', 14, 2, 'guard']],
    npcs: [['harrow', 0, -0.8, 0]],
  },
  {
    id: 'the-pass', name: 'THE PASS', at: [-590, -430], r: 26, kind: 'open', onMap: true,
    props: [['signpost', 6, 8, 0], ['boom-gate', -18, -4, 90], ['sandbags', 8, -8, 0], ['rubble', -6, 12, 0], ['mine-sign', 2, 16, 0], ['mine-sign', -10, 18, 0], ['mine-sign', 12, 18, 0]],
  },
  post('p1', 'POST 1', [90, -80], 'concord', 45),
  post('p2', 'POST 2', [-200, 30], 'harvest', 90, 5),
  post('p3', 'POST 3', [170, 90], 'harvest', 80, 4),
  post('p4', 'POST 4', [-320, -90], 'concord', 45, 6, true),
  post('p5', 'POST 5', [280, -210], 'concord', 0, 5),
  post('p6', 'POST 6', [300, 390], 'harvest', 135, 5, true),
];
export const siteById = Object.fromEntries(SITES.map((s) => [s.id, s]));
export const SAFEHOUSES = ['pump-shed', 'ranger-post', 'water-tower'];
export const POSTS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

// Twelve stone cases. place: what it looks like in the world.
export const CASES = [
  { id: 'c1', at: [-70, -60], in: 'wreck', stones: 3 }, { id: 'c2', at: [230, 180], in: 'hollow', stones: 2 }, { id: 'c3', at: [330, -90], in: 'wreck', stones: 4 },
  { id: 'c4', at: [-340, 60], in: 'wreck', stones: 3 }, { id: 'c5', at: [-180, 330], in: 'hollow', stones: 2 }, { id: 'c6', at: [80, 420], in: 'wreck', stones: 5 },
  { id: 'c7', at: [430, 150], in: 'hollow', stones: 3 }, { id: 'c8', at: [76, -162], in: 'shed', stones: 4 }, { id: 'c9', at: [-455, -150], in: 'shed', stones: 6 },
  { id: 'c10', at: [430, 262], in: 'shed', stones: 5 }, { id: 'c11', at: [-60, -240], in: 'hollow', stones: 2 }, { id: 'c12', at: [-250, -160], in: 'wreck', stones: 3 },
];
export const TRIGS = [
  { id: 't1', at: [-40, -110], note: 1 }, { id: 't2', at: [180, 220], note: 2 }, { id: 't3', at: [-340, 170], note: 3 },
  { id: 't4', at: [520, 40], note: 4 }, { id: 't5', at: [-420, -420], note: 5 }, { id: 't6', at: [-90, -470], note: 6 },
];
export const MERCY_RUNS = [
  { id: 'mr1', title: 'MERCY RUN: POST 3 ROAD', site: 'three-wells', at: [-250, 225], seconds: 300 },
  { id: 'mr2', title: 'MERCY RUN: THE SALT ROAD', at: [130, 380], seconds: 300 },
  { id: 'mr3', title: 'MERCY RUN: THE MINE CAMP', at: [235, -130], seconds: 300 },
];
