// New shapes and materials (9.1), in the docs/ASSETS.md format: written facing south, 16 units = 1 m. Vehicles and
// buildings carry scale 1.5 so they sit right beside the chibi soldiers (about 2.2 m tall).
(() => {
const E = My3D2dge, WP = globalThis.WP, S = E.SHAPES, M = E.MATERIALS;
// ---------- materials ----------
Object.assign(M, {
  olive: { color: '#5c6a3a', pattern: 'metal' }, oliveDk: { color: '#414c2a', pattern: 'metal' }, hyenaTan: { color: '#b49660', pattern: 'metal' },
  charred: { color: '#2e2824', pattern: 'noise', amount: .25 }, canvasTan: { color: '#b8a678', pattern: 'cloth' }, canvasOlive: { color: '#6a7046', pattern: 'cloth' },
  redPaint: { color: '#b8302a', pattern: 'metal' }, whitePaint: { color: '#e4e0d4', pattern: 'none' }, greyPaint: { color: '#8a9096', pattern: 'metal' },
  rubber: { color: '#26262a', pattern: 'none' }, glassDk: { color: '#3a5a6a', pattern: 'glaze' }, glassLit: { color: '#ffe8a0', pattern: 'none', glow: 1 },
  lampRed: { color: '#ff3a2a', pattern: 'none', glow: 1 }, lampWhite: { color: '#fff6d8', pattern: 'none', glow: 1 }, rust: { color: '#7a4a2a', pattern: 'noise', amount: .2 },
  plasterW: { color: '#e8dcc4', pattern: 'speck', amount: .05 }, terracotta: { color: '#b8603a', pattern: 'shingles' }, thatchY: { color: '#b89a52', pattern: 'thatch' },
  palmLeaf: { color: '#3e7a2e', pattern: 'foliage', size: 2.5 }, palmTrunk: { color: '#8a6a42', pattern: 'bark' }, mangroveLeaf: { color: '#2e5a2a', pattern: 'foliage', size: 3 },
  hullGrey: { color: '#6a747a', pattern: 'metal' }, hullGreen: { color: '#3e5a3a', pattern: 'metal' }, deckWood: { color: '#8a6a44', pattern: 'planks' },
  stoneG: { color: '#7a786e', pattern: 'stones', size: 5 }, concreteG: { color: '#8a8a82', pattern: 'speck', amount: .08 }, steelDk: { color: '#3a3e44', pattern: 'metal' },
  yellowPaint: { color: '#e0b030', pattern: 'metal' }, navy: { color: '#3a4a6a', pattern: 'metal' }, burlapS: { color: '#a8905e', pattern: 'cloth' },
  silver: { color: '#b8c0c8', pattern: 'metal' }, flagRed: { color: '#a82a24', pattern: 'cloth' }, cageBar: { color: '#4a4a50', pattern: 'metal' },
  waterFall: { color: '#c8e8f0', pattern: 'noise', amount: .2, glow: .4 }, emberGlow: { color: '#ff8a2a', pattern: 'none', glow: 1 }
});
const B = (m, at, s, o) => o ? ['box', m, at, s, o] : ['box', m, at, s];
// ---------- field props ----------
S.sandbags = { about: 'a row of burlap sandbags, two courses', tags: 'military cover', scale: 1.5, mats: { s: 'burlapS' }, params: { len: 32 },
  make: p => { const n = Math.max(2, Math.round(p.len / 8)), out = []; for (let c = 0; c < 2; c++) for (let i = 0; i < n - c; i++) out.push(['ball', 's', [-(n - c - 1) * 4 + i * 8, c ? 1 : 0, 2.6 + c * 4], 4.4, { sz: .55 }]); return out; } };
S.redBarrel = { about: 'red fuel barrel with bands', tags: 'military explosive', scale: 1.1, mats: { r: 'redPaint', b: 'steelDk' },
  parts: [['cyl', 'r', [0, 0, 0], 5, 14], ['row', 2, [0, 0, 7], ['cyl', 'b', [0, 0, 3.5], 5.3, 1]], ['cyl', 'b', [0, 0, 14], 4, .6]] };
S.ammoCrate = { about: 'olive ammo crate, stenciled', tags: 'military container', scale: 1, mats: { o: 'olive', y: 'yellowPaint', d: 'oliveDk' },
  parts: [B('o', [0, 0, 0], [16, 10, 9]), B('d', [0, 0, 9], [17, 11, 1.2]), B('y', [0, 5.1, 3], [8, .3, 2]), ['mirror', 'x', B('d', [7.5, 0, 0], [1.4, 11, 9])]] };
S.woodCrate = { about: 'wooden supply crate', tags: 'container wood', scale: .95, mats: { c: 'crate' }, parts: [B('c', [0, 0, 0], [13, 13, 12])] };
S.medCrate = { about: 'white crate with a green cross', tags: 'medical', scale: 1.4, mats: { w: 'whitePaint', g: { color: '#2a9a4a', pattern: 'none' } },
  parts: [B('w', [0, 0, 0], [13, 10, 9]), B('g', [0, 5.1, 3.5], [6, .3, 2]), B('g', [0, 5.1, 2], [2, .3, 5])] };
S.fuelTank = { about: 'a big red horizontal fuel tank on legs', tags: 'depot explosive', scale: 1.5, mats: { r: 'redPaint', l: 'steelDk', w: 'whitePaint' },
  parts: [['cyl', 'r', [0, 0, 9], 8, 30, { rot: [0, 90, 0] }], ['mirror', 'x', B('l', [10, 0, 0], [2, 8, 9])], B('w', [0, 8, 13], [14, .3, 2])] };
S.barbedFence = { about: 'a wooden post with barbed wire', tags: 'military fence', scale: 1.1, mats: { w: 'walnut', m: { color: '#3a3a3e', pattern: 'none' } },
  parts: [B('w', [0, 0, 0], [1.4, 1.4, 11]), ['row', 3, [0, 0, 3], B('m', [0, 0, 3], [30, .3, .3])], ['row', 6, [5, 0, 0], B('m', [0, 0, 6], [.6, .6, .6])]] };
S.tent = { about: 'an olive army tent', tags: 'military camp', scale: 1.5, mats: { c: 'canvasOlive', d: 'canvasTan', p: 'oak' },
  parts: [['prism', 'c', [0, 0, 0], [[-14, 0], [14, 0], [0, 15]], 30, { axis: 'y' }], ['prism', 'd', [0, 15.1, 0], [[-5, 0], [5, 0], [0, 9]], .4, { axis: 'y' }], B('p', [0, 0, 15], [1, 32, 1])] };
S.campfireDrum = { about: 'a fire drum', tags: 'camp light', scale: 1.4, mats: { m: 'rust' }, flames: [[0, 0, 12, 5, 7]], lights: [[0, 0, 16, '#ffa050', 60]], parts: [['cyl', 'm', [0, 0, 0], 5, 12]] };
S.floodlight = { about: 'a floodlight on a pole', tags: 'military light', scale: 1.5, mats: { m: 'steelDk', g: 'lampWhite' },
  parts: [['cyl', 'm', [0, 0, 0], 1, 40], B('m', [0, 0, 40], [10, 3, 5]), B('g', [0, 1.6, 41], [8, .3, 3])] };
S.searchlight = { about: 'a searchlight head', tags: 'military light', scale: 1.4, mats: { m: 'steelDk', g: 'lampWhite' },
  parts: [B('m', [0, 0, 0], [4, 4, 3]), ['cyl', 'm', [0, 0, 3], 4, 6, { rot: [90, 0, 0] }], ['cyl', 'g', [0, 3.2, 6.8], 3.3, .4, { rot: [90, 0, 0] }]] };
S.windsock = { about: 'an orange windsock on a pole', tags: 'airfield', scale: 1.5, mats: { m: 'silver', o: { color: '#e8702a', pattern: 'cloth' } },
  parts: [['cyl', 'm', [0, 0, 0], .8, 42], ['cyl', 'o', [6, 0, 38], 3, 12, { r2: 1.5, rot: [0, 90, 0] }]] };
S.runwayLight = { about: 'a runway light', tags: 'airfield light', scale: 1.4, mats: { m: 'steelDk', g: { color: '#ffd84a', pattern: 'none', glow: 1 } }, parts: [['cyl', 'm', [0, 0, 0], 1.2, 2], ['ball', 'g', [0, 0, 3], 1.4]] };
S.forklift = { about: 'a yellow forklift', tags: 'depot vehicle', scale: 1.6, mats: { y: 'yellowPaint', d: 'steelDk', t: 'rubber' },
  parts: [B('y', [0, -2, 3], [12, 16, 8]), B('d', [0, -4, 11], [11, 9, 10]), B('d', [0, 9, 0], [9, 2, 22]), B('d', [0, 13, 1], [8, 8, 1]), ['mirror', 'x', ['cyl', 't', [6, 4, 3], 3, 2, { rot: [0, 90, 0] }]], ['mirror', 'x', ['cyl', 't', [6, -8, 3], 3, 2, { rot: [0, 90, 0] }]]] };
S.grassTuft = { about: 'a dry grass tuft', tags: 'plant', mats: { g: { color: '#9a8a42', pattern: 'none' } }, parts: [['ring', 5, 1.4, ['cyl', 'g', [0, 0, 0], .9, 6, { r2: 0, rot: [12, 0, 0] }]]] };
S.fern = { about: 'a jungle fern', tags: 'plant jungle', scale: 1.3, mats: { l: 'palmLeaf' }, parts: [['ring', 6, 4, ['box', 'l', [0, 0, 2], [3, 9, 1], { rot: [30, 0, 0] }]]] };
S.rangeTarget = { about: 'a plywood target silhouette', tags: 'range', scale: 1.5, mats: { w: 'birch', r: 'redPaint', p: 'oak' },
  parts: [B('p', [0, 0, 0], [2, 2, 8]), B('w', [0, 0, 8], [10, 1, 14]), ['cyl', 'w', [0, 0, 22], 3.4, 1, { rot: [90, 0, 0] }], B('r', [0, .6, 14], [3, .3, 3])] };
// ---------- structures ----------
S.radioMast = { about: 'a lattice radio mast with a red light (tilt param topples it)', tags: 'military structure', scale: 1.5, mats: { m: 'steelDk', r: 'lampRed', b: 'olive' }, params: { tilt: 0 },
  make: p => [B('b', [0, 0, 0], [8, 6, 8]), ['group', [0, 0, 0], [p.tilt, 0, 0], [['mirror', 'xy', B('m', [3, 3, 8], [1, 1, 80])], ['row', 8, [0, 0, 10], B('m', [0, 0, 45], [7, 7, .8])], ['row', 8, [0, 0, 10], B('m', [0, 0, 44], [.6, 8.5, .6], { rot: [45, 0, 0] })], B('m', [0, 0, 88], [12, 12, 1.2]), ['cyl', 'm', [0, 0, 89], .6, 10], ['ball', 'r', [0, 0, 100], 1.6]]]] };
S.radarHut = { about: 'a concrete radar building', tags: 'military building', scale: 1.6, mats: { c: 'concreteG', d: 'steelDk', g: 'glassLit' },
  parts: [B('c', [0, 0, 0], [40, 24, 22]), B('d', [0, 0, 22], [42, 26, 2]), B('d', [-8, 12.1, 0], [8, .4, 14]), ['row', 2, [14, 0, 0], B('g', [8, 12.1, 10], [6, .3, 5])]] };
S.radarDish = { about: 'a radar dish on a mount', tags: 'military structure', scale: 1.5, mats: { m: 'greyPaint', w: 'whitePaint' },
  parts: [['cyl', 'm', [0, 0, 0], 3, 22], ['lathe', 'w', [0, 2, 24], [[0, 0], [8, 2], [14, 7], [15, 8]], { rot: [70, 0, 0] }], ['cyl', 'm', [0, 4, 28], .6, 8, { rot: [70, 0, 0] }]] };
S.stiltHut = { about: 'a thatched hut on stilts', tags: 'jungle building', scale: 1.6, mats: { w: 'plank', t: 'thatchY', p: 'walnut' },
  parts: [['mirror', 'xy', B('p', [13, 9, 0], [2, 2, 16])], B('w', [0, 0, 16], [30, 22, 2]), B('w', [0, 0, 18], [26, 18, 16]), ['prism', 't', [0, 0, 34], [[-18, 0], [18, 0], [0, 14]], 26, { axis: 'y' }], B('p', [0, 9.1, 20], [7, .3, 11])] };
S.dock = { about: 'a plank dock on posts', tags: 'jungle river', scale: 1.5, mats: { w: 'planks', p: 'walnut' }, parts: [['mirror', 'xy', B('p', [18, 9, -4], [2, 2, 10])], B('w', [0, 0, 5], [40, 22, 1.5])] };
S.villageHouse = { about: 'a whitewashed house with a tile roof, a door and two windows', tags: 'village building', scale: 1.7, mats: { w: 'plasterW', r: 'terracotta', d: 'walnut', k: { color: '#1e1a1c', pattern: 'none' }, b: 'oak' },
  parts: [B('w', [0, 0, 0], [44, 26, 30]), ['prism', 'r', [0, 0, 30], [[-25, 0], [25, 0], [0, 12]], 30, { axis: 'y' }], B('k', [0, 13.05, 0], [8, .3, 22]), B('k', [-14, 13.05, 13], [8, .3, 9]), B('k', [14, 13.05, 13], [8, .3, 9]), B('b', [0, 13.2, 22], [10, .4, 1.2]), B('b', [-14, 13.2, 12.4], [10, .4, 1]), B('b', [14, 13.2, 12.4], [10, .4, 1])] };
S.marketStall = { about: 'a market stall with a striped awning', tags: 'village market', scale: 1.5, mats: { a: { color: '#c84a3a', pattern: 'cloth' }, w: 'oak', f: { color: '#e8a83a', pattern: 'none' } },
  parts: [['mirror', 'x', B('w', [13, 6, 0], [1.5, 1.5, 22])], ['mirror', 'x', B('w', [13, -6, 0], [1.5, 1.5, 22])], B('w', [0, 0, 10], [28, 12, 2]), ['wedge', 'a', [0, 0, 22], [30, 16, 5]], ['row', 4, [6, 0, 0], ['ball', 'f', [-9, 0, 13.4], 2]]] };
S.chapelTower = { about: 'a whitewashed chapel bell tower', tags: 'village building', scale: 1.5, mats: { w: 'plasterW', r: 'terracotta', k: { color: '#1e1a1c', pattern: 'none' }, b: 'bronze' },
  parts: [B('w', [0, 0, 0], [22, 22, 60]), B('k', [0, 11.05, 44], [10, .3, 12]), ['ball', 'b', [0, 8, 48], 3], ['cyl', 'r', [0, 0, 60], 15, 14, { r2: 0, seg: 4 }], B('w', [0, 0, 74], [1, 1, 8]), B('w', [0, 0, 79], [5, 1, 1])] };
S.well = { about: 'a stone well with a little roof', tags: 'village', scale: 1.4, mats: { s: 'stoneG', w: 'oak', r: 'terracotta' }, parts: [['cyl', 's', [0, 0, 0], 8, 8], ['mirror', 'x', B('w', [7, 0, 8], [1.4, 1.4, 14])], ['prism', 'r', [0, 0, 22], [[-10, 0], [10, 0], [0, 6]], 12, { axis: 'y' }]] };
S.fountain = { about: 'a plaza fountain', tags: 'village', scale: 1.5, mats: { s: 'stoneG', w: { color: '#5aa8c8', pattern: 'glaze' } }, parts: [['cyl', 's', [0, 0, 0], 16, 5], ['cyl', 'w', [0, 0, 4.6], 14, .6], ['cyl', 's', [0, 0, 0], 3, 14], ['cyl', 's', [0, 0, 14], 7, 2]] };
S.cart = { about: 'a wooden hand cart', tags: 'village', scale: 1.4, mats: { w: 'oak' }, parts: [B('w', [0, 0, 6], [16, 24, 6]), ['mirror', 'x', ['cyl', 'w', [9, 0, 5], 5, 1.5, { rot: [0, 90, 0] }]], B('w', [0, 16, 8], [10, 10, 1])] };
S.fishingBoat = { about: 'a small fishing boat', tags: 'sea boat', scale: 1.5, mats: { h: { color: '#3a6a9a', pattern: 'planks' }, w: 'whitePaint', m: 'oak' },
  parts: [['prism', 'h', [0, 0, 0], [[-7, 0], [7, 0], [9, 7], [-9, 7]], 40, { axis: 'y' }], B('w', [0, -6, 7], [10, 10, 8]), ['cyl', 'm', [0, 6, 7], .8, 24]] };
S.palm = { about: 'a coconut palm, a leaning trunk and fronds', tags: 'plant tropical', scale: 1.5, mats: { t: 'palmTrunk', l: 'palmLeaf', c: 'walnut' },
  parts: [['cyl', 't', [0, 0, 0], 2.4, 16, { r2: 2 }], ['cyl', 't', [1.5, 0, 15], 2, 16, { r2: 1.7, rot: [0, 10, 0] }], ['cyl', 't', [4, 0, 30], 1.7, 14, { r2: 1.5, rot: [0, 18, 0] }],
    ['group', [7, 0, 43], 0, [['ring', 7, 0, ['box', 'l', [0, 9, 0], [5, 18, 1], { rot: [-28, 0, 0] }]], ['ball', 'c', [0, 1.5, -1.5], 1.8], ['ball', 'c', [1.5, -1, -1.5], 1.8]]]] };
S.mangrove = { about: 'a mangrove tree on its roots', tags: 'plant jungle', scale: 1.5, mats: { t: 'walnut', l: 'mangroveLeaf' },
  parts: [['ring', 5, 5, ['cyl', 't', [0, 0, 0], 1, 12, { r2: .7, rot: [-25, 0, 0] }]], ['cyl', 't', [0, 0, 8], 2.4, 22, { r2: 1.6 }], ['ball', 'l', [0, 0, 40], 16, { sz: .7 }], ['ball', 'l', [-10, 4, 34], 10, { sz: .7 }], ['ball', 'l', [10, -3, 36], 11, { sz: .7 }]] };
S.barracks = { about: 'a long wooden barracks', tags: 'prison building', scale: 1.7, mats: { w: 'planks', r: 'steelDk', k: { color: '#14121a', pattern: 'none' }, g: 'glassLit' },
  parts: [B('w', [0, 0, 0], [80, 26, 22]), ['prism', 'r', [0, 0, 22], [[-15, 0], [15, 0], [0, 7]], 84, { axis: 'x' }], B('k', [0, 13.05, 0], [9, .3, 16]), ['row', 4, [18, 0, 0], B('g', [0, 13.05, 10], [6, .3, 5])]] };
S.watchtower = { about: 'a wooden watchtower, four legs, a cabin and a roof', tags: 'prison military', scale: 1.6, mats: { w: 'walnut', p: 'planks', r: 'steelDk' },
  parts: [['mirror', 'xy', B('w', [9, 9, 0], [2, 2, 56])], ['mirror', 'xy', B('w', [0, 9, 26], [18, 1, 1], { rot: [0, 30, 0] })], B('p', [0, 0, 56], [26, 26, 2]), B('p', [0, 12, 58], [26, 2, 9]), ['mirror', 'xy', B('w', [12, 12, 58], [1.5, 1.5, 18])], ['cyl', 'r', [0, 0, 76], 19, 7, { r2: 0, seg: 4 }]] };
S.cageBlock = { about: 'the kennel: a concrete cell block with barred cells', tags: 'prison building', scale: 1.7, mats: { c: 'concreteG', b: 'cageBar', k: { color: '#100e14', pattern: 'none' } },
  parts: [B('c', [0, 0, 0], [110, 24, 26]), B('c', [0, 0, 26], [112, 26, 2]), ['row', 5, [20, 0, 0], B('k', [0, 12.05, 2], [14, .3, 18])], ['row', 5, [20, 0, 0], ['row', 4, [3.5, 0, 0], B('b', [0, 12.3, 2], [.8, .4, 18])]]] };
S.gate = { about: 'a prison gate: two posts and a barbed frame', tags: 'prison', scale: 1.5, mats: { c: 'concreteG', m: 'steelDk' }, parts: [['mirror', 'x', B('c', [24, 0, 0], [6, 6, 32])], B('m', [0, 0, 30], [44, 2, 2]), ['row', 6, [8, 0, 0], B('m', [0, 0, 0], [1, 1, 30])]] };
S.flagpole = { about: 'a flagpole with the hyena flag', tags: 'prison', scale: 1.5, mats: { m: 'silver', f: 'flagRed', y: 'yellowPaint' }, parts: [['cyl', 'm', [0, 0, 0], .8, 64], B('f', [7, 0, 52], [14, .4, 10]), ['ball', 'y', [7, .4, 57], 2.4, { sz: .3 }]] };
S.bossTower = { about: 'the central guard tower of the kennel', tags: 'prison boss', scale: 1.6, mats: { w: 'walnut', p: 'planks', r: 'steelDk', c: 'concreteG' },
  parts: [B('c', [0, 0, 0], [30, 30, 6]), ['mirror', 'x', B('w', [16, 0, 6], [3, 3, 50])], B('w', [0, -7, 6], [3, 3, 50]), B('p', [0, 0, 56], [36, 30, 3]), B('p', [0, 15, 59], [36, 2, 10]), ['mirror', 'x', B('w', [17, 14, 59], [2, 2, 18])], ['cyl', 'r', [0, 0, 77], 26, 9, { r2: 0, seg: 4 }]] };
S.hangar = { about: 'an arched aircraft hangar with open doors', tags: 'airfield building', scale: 1.8, mats: { m: 'greyPaint', k: { color: '#121418', pattern: 'none' }, c: 'concreteG' },
  parts: [['cyl', 'm', [0, 0, 0], 40, 60, { rot: [90, 0, 0], sq: 1 }], B('k', [0, 30.2, 0], [50, .4, 30]), B('c', [0, 30, 0], [84, 4, 2])] };
S.controlTower = { about: 'an airfield control tower', tags: 'airfield building', scale: 1.7, mats: { c: 'concreteG', g: 'glassDk', r: 'steelDk' },
  parts: [B('c', [0, 0, 0], [20, 20, 70]), B('g', [0, 0, 70], [28, 28, 12]), B('r', [0, 0, 82], [32, 32, 2]), ['cyl', 'r', [0, 0, 84], .6, 12]] };
S.waterTower = { about: 'a water tower on legs', tags: 'depot', scale: 1.5, mats: { m: 'rust', t: 'greyPaint' }, parts: [['mirror', 'xy', B('m', [10, 10, 0], [2, 2, 56])], ['cyl', 't', [0, 0, 56], 16, 20], ['cyl', 't', [0, 0, 76], 17, 6, { r2: 0 }]] };
S.shed = { about: 'a corrugated metal shed', tags: 'depot building', scale: 1.7, mats: { m: { color: '#7a8a8a', pattern: 'planks', dir: 'v' }, r: 'rust', k: { color: '#121418', pattern: 'none' } },
  parts: [B('m', [0, 0, 0], [50, 30, 26]), ['wedge', 'r', [0, 0, 26], [52, 32, 6]], B('k', [0, 15.1, 0], [16, .3, 18])] };
S.warehouse = { about: 'a big warehouse with dark doorways', tags: 'depot building', scale: 1.7, mats: { m: { color: '#8a7a6a', pattern: 'bricks' }, r: 'steelDk', k: { color: '#121418', pattern: 'none' } },
  parts: [B('m', [0, 0, 0], [110, 40, 40]), ['prism', 'r', [0, 0, 40], [[-22, 0], [22, 0], [0, 10]], 112, { axis: 'x' }], B('k', [-30, 20.1, 0], [16, .3, 22]), B('k', [30, 20.1, 0], [16, .3, 22])] };
S.crane = { about: 'a yellow gantry crane', tags: 'depot', scale: 1.5, mats: { y: 'yellowPaint', m: 'steelDk' }, parts: [['mirror', 'x', B('y', [22, 0, 0], [3, 3, 60])], B('y', [0, 0, 60], [50, 4, 4]), B('m', [6, 0, 30], [.6, .6, 30]), B('m', [6, 0, 28], [6, 6, 3])] };
S.propPlane = { about: 'a parked single-prop plane', tags: 'airfield vehicle', scale: 1.8, mats: { w: 'whitePaint', r: 'redPaint', g: 'glassDk', t: 'rubber' },
  parts: [['cyl', 'w', [0, 0, 6], 3.5, 34, { rot: [90, 0, 0] }], B('w', [0, 6, 7], [44, 8, 1.2]), B('r', [0, -16, 7], [14, 5, 1]), B('r', [0, -16, 7], [1, 6, 8]), B('g', [0, 8, 9], [5, 6, 3]), ['mirror', 'x', ['cyl', 't', [6, 8, 1.5], 1.6, 1.4, { rot: [0, 90, 0] }]], B('steelDk', [0, 18, 5], [12, .6, 1.4])] };
S.waterfall = { about: 'a distant waterfall over rocks', tags: 'jungle', scale: 1.5, mats: { r: 'rock', w: 'waterFall' }, parts: [['rock', 'r', [-30, 0, 0], 30, { sz: 1.6, seed: 3 }], ['rock', 'r', [30, 0, 0], 30, { sz: 1.6, seed: 5 }], B('w', [0, 0, 0], [26, 4, 70])] };
S.trainTrackBuffer = { about: 'a rail buffer stop', tags: 'depot', scale: 1.5, mats: { m: 'redPaint', d: 'steelDk' }, parts: [B('d', [0, 0, 0], [20, 6, 8]), ['mirror', 'x', ['cyl', 'm', [6, 3, 5], 2, 3, { rot: [90, 0, 0] }]]] };
S.wreckBoat = { about: 'a half-sunk wrecked boat', tags: 'river', scale: 1.5, mats: { h: 'charred', w: 'deckWood' }, parts: [['prism', 'h', [0, 0, -3], [[-8, 0], [8, 0], [10, 7], [-10, 7]], 44, { axis: 'y', rot: [0, 15, 0] }], B('w', [0, -4, 4], [10, 14, 6], { rot: [0, 12, 0] })] };
// ---------- vehicles (their front is +y, south, as written) ----------
const wheels = (m, xs, ys, r, w) => ys.map(y => ['mirror', 'x', ['cyl', m, [xs, y, r], r, w, { rot: [0, 90, 0] }]]);
S.jeep = { about: 'the Hyena Legion jeep with a pintle gun', tags: 'vehicle military', scale: 1.8, mats: { b: 'hyenaTan', d: 'oliveDk', t: 'rubber', g: 'steelDk', s: { color: '#3a2a1e', pattern: 'cloth' } },
  parts: [B('b', [0, 0, 4], [18, 34, 7]), B('b', [0, 10, 11], [17, 12, 3]), B('d', [0, 17, 6], [18, 1.4, 6]), B('g', [0, 4, 14], [16, .8, 5], { rot: [-20, 0, 0] }), B('s', [-4, -4, 11], [6, 6, 4]), B('s', [4, -4, 11], [6, 6, 4]), ...wheels('t', 9.5, [10, -11], 4, 3), B('g', [0, -6, 12], [2, 2, 8]), B('g', [0, -3, 20], [1.4, 10, 1.6])] };
S.jeepWreck = { about: 'a burnt-out jeep', tags: 'vehicle wreck', scale: 1.8, mats: { b: 'charred', t: 'rubber', r: 'rust' }, parts: [B('b', [0, 0, 1], [18, 34, 7], { rot: [0, 6, 0] }), B('r', [0, 10, 8], [17, 12, 3]), ...wheels('t', 9.5, [10], 4, 3)] };
S.truck = { about: 'the HAULER troop truck with a canvas back', tags: 'vehicle military', scale: 1.8, mats: { b: 'hyenaTan', c: 'canvasTan', t: 'rubber', g: 'glassDk', d: 'oliveDk' },
  parts: [B('d', [0, 0, 5], [18, 56, 3]), B('b', [0, 20, 8], [18, 14, 14]), B('g', [0, 27.1, 15], [14, .3, 5]), B('b', [0, 28, 8], [17, 3, 6]), B('b', [0, -10, 8], [20, 34, 6]), ['prism', 'c', [0, -10, 14], [[-10, 0], [10, 0], [10, 10], [7, 14], [-7, 14], [-10, 10]], 34, { axis: 'y' }], ...wheels('t', 9.5, [20, -4, -18], 5, 3.5)] };
S.truckFriendly = { about: 'a white relief truck', tags: 'vehicle', scale: 1.8, mats: { b: 'whitePaint', c: { color: '#d8d4c8', pattern: 'cloth' }, t: 'rubber', g: 'glassDk', d: 'steelDk', r: { color: '#2a8a4a', pattern: 'none' } },
  parts: [B('d', [0, 0, 5], [18, 56, 3]), B('b', [0, 20, 8], [18, 14, 14]), B('g', [0, 27.1, 15], [14, .3, 5]), B('b', [0, -10, 8], [20, 34, 6]), ['prism', 'c', [0, -10, 14], [[-10, 0], [10, 0], [10, 10], [7, 14], [-7, 14], [-10, 10]], 34, { axis: 'y' }], B('r', [10.2, -10, 18], [.3, 8, 3]), B('r', [10.2, -10, 18], [.3, 3, 8]), ...wheels('t', 9.5, [20, -4, -18], 5, 3.5)] };
S.fuelTruck = { about: 'a fuel tanker truck', tags: 'airfield vehicle explosive', scale: 1.8, mats: { b: 'whitePaint', r: 'redPaint', t: 'rubber', g: 'glassDk', d: 'steelDk' },
  parts: [B('d', [0, 0, 5], [18, 56, 3]), B('r', [0, 20, 8], [18, 14, 14]), B('g', [0, 27.1, 15], [14, .3, 5]), ['cyl', 'b', [0, -10, 16], 9, 34, { rot: [90, 0, 0] }], B('r', [0, -10, 16], [18.4, 4, 3]), ...wheels('t', 9.5, [20, -4, -18], 5, 3.5)] };
S.apc = { about: 'the BADGER armored personnel carrier', tags: 'vehicle military', scale: 1.8, mats: { b: 'hyenaTan', d: 'oliveDk', t: 'rubber' },
  parts: [B('b', [0, 0, 5], [24, 48, 12]), ['wedge', 'b', [0, 24, 5], [24, 8, 12], { rot: [0, 0, 180] }], B('b', [0, -2, 17], [20, 34, 3]), ...wheels('t', 12.5, [16, 2, -14], 5, 3), B('d', [0, -24.2, 6], [10, .4, 9])] };
S.apcTurret = { about: 'the BADGER turret with a rocket tube', tags: 'vehicle military', scale: 1.8, mats: { b: 'hyenaTan', d: 'steelDk' }, parts: [['cyl', 'b', [0, 0, 0], 6, 5], ['cyl', 'd', [0, 4, 3], 1.8, 14, { rot: [90, 0, 0] }]] };
S.tank = { about: 'the MAULER tank hull with tracks', tags: 'vehicle military', scale: 1.8, mats: { b: 'oliveDk', t: { color: '#2a2a2a', pattern: 'metal', rivet: 1 }, l: 'olive' },
  parts: [['mirror', 'x', B('t', [11, 0, 0], [8, 50, 9])], B('l', [0, 0, 6], [24, 46, 8]), ['wedge', 'l', [0, 23, 6], [24, 6, 8], { rot: [0, 0, 180] }]] };
S.tankTurret = { about: 'the MAULER turret and gun', tags: 'vehicle military', scale: 1.8, mats: { b: 'olive', d: 'steelDk' }, parts: [['cyl', 'b', [0, 0, 0], 10, 7, { r2: 8.5, seg: 8 }], ['cyl', 'd', [0, 9, 3.5], 1.8, 26, { rot: [90, 0, 0] }], ['cyl', 'd', [0, 35, 3.5], 2.4, 3, { rot: [90, 0, 0] }]] };
S.skiff = { about: 'a Hyena river skiff', tags: 'boat', scale: 1.8, mats: { h: 'hullGreen', d: 'deckWood', m: 'steelDk' },
  parts: [['prism', 'h', [0, 0, 0], [[-6, 0], [6, 0], [8, 6], [-8, 6]], 36, { axis: 'y' }], ['wedge', 'h', [0, 20, 0], [16, 6, 6], { rot: [0, 0, 180] }], B('d', [0, -2, 5.6], [14, 30, .6]), B('m', [0, -16, 4], [5, 4, 6])] };
S.gunboat = { about: 'a grey patrol boat with a turret', tags: 'boat', scale: 1.8, mats: { h: 'hullGrey', d: 'deckWood', w: 'whitePaint', g: 'glassDk', m: 'steelDk' },
  parts: [['prism', 'h', [0, 0, 0], [[-9, 0], [9, 0], [12, 10], [-12, 10]], 56, { axis: 'y' }], ['wedge', 'h', [0, 32, 0], [24, 8, 10], { rot: [0, 0, 180] }], B('d', [0, 0, 10], [22, 54, .6]), B('w', [0, -6, 10], [14, 16, 10]), B('g', [0, 2.1, 15], [12, .3, 3]), ['cyl', 'm', [0, 16, 10], 4, 4], ['cyl', 'm', [0, 22, 12], .8, 9, { rot: [90, 0, 0] }]] };
S.crocodile = { about: "the gunboat 'CROCODILE' with two turrets and a bridge", tags: 'boat boss', scale: 2.0, mats: { h: { color: '#4a5a4a', pattern: 'metal', rivet: 1 }, d: 'deckWood', w: 'greyPaint', g: 'glassDk', m: 'steelDk', t: { color: '#e8d040', pattern: 'none' } },
  parts: [['prism', 'h', [0, 0, 0], [[-12, 0], [12, 0], [16, 13], [-16, 13]], 76, { axis: 'y' }], ['wedge', 'h', [0, 44, 0], [32, 12, 13], { rot: [0, 0, 180] }], B('d', [0, 0, 13], [30, 74, .6]), B('w', [0, 4, 13], [16, 18, 12]), B('g', [0, 13.1, 19], [14, .3, 3]), B('t', [16.1, 0, 9], [.3, 40, 2]),
    ['cyl', 'm', [0, 22, 13], 5, 5], ['cyl', 'm', [0, -20, 13], 5, 5], B('m', [0, -5, 13], [6, 6, 4])] };
S.heli = { about: 'the VULTURE attack helicopter', tags: 'aircraft military', scale: 2.0, mats: { b: 'hyenaTan', g: 'glassDk', d: 'oliveDk', m: 'steelDk' },
  parts: [['ball', 'b', [0, 6, 6], 9, { sz: .8 }], ['ball', 'g', [0, 13, 7], 5.5, { sz: .8 }], ['cyl', 'b', [0, 0, 7], 3, 36, { r2: 1.4, rot: [90, 0, 0] }], B('d', [0, -36, 8], [1, 6, 10]), ['mirror', 'x', B('m', [5, 4, -2], [1, 22, 1])], ['mirror', 'x', ['cyl', 'd', [9, 6, 3], 2, 8, { rot: [90, 0, 0] }]], ['cyl', 'm', [0, 4, 13], 1.2, 3]] };
S.hyenaOne = { about: "KRAGG's gunship 'HYENA ONE'", tags: 'aircraft boss', scale: 2.2, mats: { b: { color: '#3a3428', pattern: 'metal' }, y: 'yellowPaint', g: 'glassDk', d: 'steelDk', k: { color: '#100e0c', pattern: 'none' } },
  parts: [['ball', 'b', [0, 8, 5], 12, { sz: .75 }], ['ball', 'g', [0, 18, 6], 6.5, { sz: .8 }], ['cyl', 'b', [0, 0, 6], 4, 48, { r2: 1.8, rot: [90, 0, 0] }], B('y', [0, -48, 8], [1, 8, 12]), B('k', [8, 4, 2], [3, 10, 9]), ['mirror', 'x', B('d', [10, 6, 0], [10, 3, 1.2])], ['mirror', 'x', ['cyl', 'd', [16, 6, -2], 3, 12, { rot: [90, 0, 0] }]], ['cyl', 'd', [0, 22, -1], 1.4, 10, { rot: [90, 0, 0] }], ['cyl', 'd', [0, 4, 15], 1.8, 3]] };
S.bigEar = { about: "the signal truck 'BIG EAR', six wheels and a dish mount", tags: 'vehicle boss', scale: 1.8, mats: { b: 'hyenaTan', c: 'canvasOlive', t: 'rubber', g: 'glassDk', d: 'oliveDk', m: 'steelDk' },
  parts: [B('d', [0, -4, 5], [22, 76, 3]), B('b', [0, 26, 8], [22, 16, 16]), B('g', [0, 34.1, 17], [16, .3, 5]), B('b', [0, -14, 8], [24, 46, 18]), B('m', [0, -14, 26], [10, 10, 4]), ['mirror', 'x', B('m', [9, 8, 26], [3, 3, 6])], B('d', [0, -30, 26], [9, 7, 5]), ...wheels('t', 11.5, [26, -12, -28], 5.5, 3.5)] };
S.halftrack = { about: "the flamethrower half-track 'WARTHOG'", tags: 'vehicle boss', scale: 1.8, mats: { b: { color: '#7a5a3a', pattern: 'metal', rivet: 1 }, t: { color: '#2a2a2a', pattern: 'metal' }, r: 'redPaint', d: 'steelDk', w: 'rubber' },
  parts: [['mirror', 'x', B('t', [10, -12, 0], [6, 30, 8])], ...wheels('w', 10, [20], 5, 3), B('b', [0, 0, 6], [22, 56, 14]), ['wedge', 'b', [0, 28, 6], [22, 8, 14], { rot: [0, 0, 180] }], ['mirror', 'x', ['cyl', 'r', [12, -14, 13], 4.5, 12, { rot: [90, 0, 0] }]], ['cyl', 'd', [0, 2, 20], 5, 4], ['cyl', 'd', [0, 18, 16], 1.8, 18, { rot: [90, 0, 0] }]] };
S.locomotive = { about: "the armored train engine 'IRON HOG'", tags: 'train boss', scale: 1.8, mats: { b: { color: '#3a3a40', pattern: 'metal', rivet: 1 }, r: 'redPaint', t: 'steelDk', y: 'yellowPaint' },
  parts: [B('t', [0, 0, 0], [16, 64, 6]), ['cyl', 'b', [0, 8, 14], 9, 40, { rot: [90, 0, 0] }], B('b', [0, -20, 6], [20, 22, 24]), ['cyl', 't', [0, 22, 22], 3, 10], ['wedge', 'r', [0, 32, 0], [18, 6, 8], { rot: [0, 0, 180] }], B('y', [0, -9, 22], [21, .4, 2])] };
S.trainCar = { about: 'an armored train car', tags: 'train', scale: 1.8, mats: { b: { color: '#4a4a50', pattern: 'metal', rivet: 1 }, t: 'steelDk', k: { color: '#14121a', pattern: 'none' } },
  parts: [B('t', [0, 0, 0], [16, 50, 6]), B('b', [0, 0, 6], [20, 50, 18]), ['row', 3, [0, 14, 0], B('k', [10.1, 0, 14], [.3, 6, 3])]] };
S.ammoWagon = { about: 'an open wagon of ammunition crates', tags: 'train explosive', scale: 1.8, mats: { w: 'planks', t: 'steelDk', c: 'olive' },
  parts: [B('t', [0, 0, 0], [16, 50, 6]), B('w', [0, 0, 6], [20, 50, 8]), ['row', 3, [0, 14, 0], B('c', [0, 0, 14], [14, 10, 8])]] };
S.flatcar = { about: 'a flatcar', tags: 'train', scale: 1.8, mats: { w: 'planks', t: 'steelDk' }, parts: [B('t', [0, 0, 0], [16, 50, 6]), B('w', [0, 0, 6], [20, 52, 2])] };
S.cargoPlane = { about: 'OLD HOWLER, a twin-prop cargo plane with a rear ramp', tags: 'aircraft', scale: 2.0, mats: { b: { color: '#6a7a5a', pattern: 'metal' }, w: 'whitePaint', g: 'glassDk', d: 'steelDk', k: { color: '#121410', pattern: 'none' } },
  parts: [['cyl', 'b', [0, 0, 10], 10, 90, { rot: [90, 0, 0] }], ['ball', 'b', [0, 45, 10], 10, { sz: .9 }], B('g', [0, 50, 14], [10, 4, 3]), B('b', [0, 6, 18], [140, 18, 2]), ['mirror', 'x', ['cyl', 'd', [30, 18, 15], 4, 16, { rot: [90, 0, 0] }]], B('b', [0, -46, 14], [44, 10, 2]), B('b', [0, -48, 14], [2, 12, 22]), B('k', [0, -45, 2], [14, 2, 12])] };
WP.SHAPE_LIST = Object.keys(S);
})();
