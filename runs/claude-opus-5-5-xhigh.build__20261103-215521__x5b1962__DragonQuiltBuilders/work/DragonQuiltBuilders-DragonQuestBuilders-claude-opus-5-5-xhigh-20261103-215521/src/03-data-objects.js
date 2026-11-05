// Data: placeable objects (furniture, stations, lights, doors, plants, props) and their shapes (E.SHAPES: objects as
// data, drawn by the engine in every view and facing; sized for the 26-unit hero; 16 units = one block).
(() => {
const DQ = globalThis.DQ, E = DQ.E;
const M = E.MATERIALS;
Object.assign(M, {
  dqRed: { color: '#d04a4a', pattern: 'cloth' }, dqBlue: { color: '#4a6ad0', pattern: 'cloth' }, dqYellow: { color: '#e8c040', pattern: 'cloth' }, dqGreen: { color: '#5aa04a', pattern: 'cloth' },
  dqCream: { color: '#f1e6c8', pattern: 'cloth' }, dqLint: { color: '#cfcad6', pattern: 'cloth' }, dqStraw: { color: '#e0b850', pattern: 'thatch' }, dqKnot: { color: '#2a1a3a', pattern: 'cloth' },
  dqGlow: { color: '#ffe7a0', pattern: 'none', glow: 1 }, dqEmber: { color: '#ff9040', pattern: 'none', glow: 1 }, dqViolet: { color: '#c8a0ff', pattern: 'none', glow: 1 },
  dqGold: { color: '#e8c040', pattern: 'metal' }, dqCotton: { color: '#fffaff', pattern: 'cloth' }, dqBerry: { color: '#d83a4a', pattern: 'glaze' }, dqLeaf: { color: '#4a9a4a', pattern: 'foliage' },
  dqBark: { color: '#7a5032', pattern: 'bark' }, dqPuff: { color: '#f0e0c0', pattern: 'none' }, dqPlum: { color: '#5a3a5a', pattern: 'cloth' }, dqMuslin: { color: '#e8dcc0', pattern: 'cloth' }
});
const S = E.SHAPES;
Object.assign(S, {
  dqBench: { about: 'mending bench: plank top, pincushion, spools, scissors', tags: 'dq station', mats: { t: 'oak', l: 'walnut', p: 'dqRed', s: 'dqCream', b: 'dqBlue', i: 'iron' },
    parts: [['box', 't', [0, 0, 9], [15, 12, 2]], ['mirror', 'xy', ['box', 'l', [6, 4.5, 0], [2, 2, 9]]], ['box', 't', [0, 0, 3], [12, 9, 1]], ['ball', 'p', [-3.5, -1, 13], 2.6], ['cyl', 's', [2.5, -2, 11], 1.6, 3.2], ['cyl', 'b', [5, 2, 11], 1.6, 3.2], ['box', 'i', [-.5, 3, 11.2], [5, .8, .6], { rot: 30 }]] },
  dqTorch: { about: 'wick torch: a stick with a lint wick', tags: 'dq light', mats: { w: 'walnut', l: 'dqLint' }, flames: [[0, 0, 15, 4, 6]], parts: [['cyl', 'w', [0, 0, 0], 1.1, 13], ['ball', 'l', [0, 0, 14], 2.2]] },
  dqLantern: { about: 'moth lantern: copper cage of glowing dust on a post', tags: 'dq light', mats: { c: 'copper', g: 'dqGlow', w: 'walnut' },
    parts: [['cyl', 'w', [0, 0, 0], 3, 1.5], ['cyl', 'w', [0, 0, 1], .9, 8], ['box', 'g', [0, 0, 9], [4.5, 4.5, 5]], ['mirror', 'xy', ['box', 'c', [2.4, 2.4, 9], [1, 1, 5.5]]], ['cyl', 'c', [0, 0, 14.5], 3.4, 2, { r2: 0, seg: 4 }]] },
  dqDoorLattice: { about: 'lattice door: crossed branches, swings open', tags: 'dq door', mats: { w: 'walnut', b: 'oak' }, params: { open: 0 },
    make: p => [['box', 'w', [-7.2, 0, 0], [1.6, 3, 31]], ['box', 'w', [7.2, 0, 0], [1.6, 3, 31]], ['box', 'w', [0, 0, 30], [16, 3, 1.6]],
      ['group', [-6.5, 0, 0], -p.open * 90, [['box', 'b', [6.5, 0, 1], [12.4, 1.2, 1.4]], ['box', 'b', [6.5, 0, 14.5], [12.4, 1.2, 1.4]], ['box', 'b', [6.5, 0, 27], [12.4, 1.2, 1.4]],
        ['box', 'b', [6.5, 0, 8], [1.4, 1.2, 28], { rot: [0, 25, 0] }], ['box', 'b', [6.5, 0, 22], [1.4, 1.2, 14], { rot: [0, -40, 0] }], ['box', 'b', [1, 0, 1], [1.4, 1.4, 27.5]], ['box', 'b', [12, 0, 1], [1.4, 1.4, 27.5]]]]] },
  dqDoorPlank: { about: 'plank door with a stitched heart, swings open', tags: 'dq door', mats: { w: 'walnut', p: 'planks', h: 'dqRed', i: 'iron' }, params: { open: 0 },
    make: p => [['box', 'w', [-7.2, 0, 0], [1.6, 3.4, 31]], ['box', 'w', [7.2, 0, 0], [1.6, 3.4, 31]], ['box', 'w', [0, 0, 30], [16, 3.4, 1.6]],
      ['group', [-6.5, 0, 0], -p.open * 90, [['box', 'p', [6.5, 0, 0], [12.6, 2, 29.5]], ['ball', 'h', [6.5, 1.1, 17], 1.8, { sz: .9 }], ['box', 'i', [11, 1.4, 14], [1, 1, 2]]]]] },
  dqBed: { about: 'straw bed with a patchwork quilt and a pillow', tags: 'dq furniture', mats: { f: 'oak', s: 'dqStraw', r: 'dqRed', b: 'dqBlue', c: 'dqCream' },
    parts: [['box', 'f', [0, 0, 0], [13, 15, 4]], ['box', 's', [0, 0, 4], [12, 14.5, 2]], ['box', 'c', [0, -5, 6], [9, 3.5, 2]],
      ['box', 'r', [-3, 1.5, 6], [6, 3.5, 1.2]], ['box', 'b', [3, 1.5, 6], [6, 3.5, 1.2]], ['box', 'b', [-3, 5, 6], [6, 3.5, 1.2]], ['box', 'r', [3, 5, 6], [6, 3.5, 1.2]], ['box', 'f', [0, -7, 0], [13, 1.5, 9]]] },
  dqTable: { about: 'square plank table', tags: 'dq furniture', mats: { t: 'planks', l: 'walnut' }, parts: [['box', 't', [0, 0, 10], [15, 15, 2]], ['mirror', 'xy', ['box', 'l', [6, 6, 0], [2, 2, 10]]]] },
  dqStool: { about: 'three-legged stool', tags: 'dq furniture', mats: { w: 'oak', l: 'walnut' }, parts: [['cyl', 'w', [0, 0, 7], 4.5, 1.6], ['ring', 3, 2.6, ['box', 'l', [0, 0, 0], [1.4, 1.4, 7]]]] },
  dqChest: { about: 'storage chest with iron bands', tags: 'dq container', mats: { w: 'oak', b: 'iron', l: 'gold' },
    parts: [['box', 'w', [0, 0, 0], [14, 10, 8]], ['prism', 'w', [0, 0, 8], [[-5, 0], [5, 0], [4, 3], [0, 4.5], [-4, 3]], 14, { axis: 'x' }], ['mirror', 'x', ['box', 'b', [4.5, 0, 0], [1.4, 10.6, 8.4]]], ['box', 'l', [0, 5, 5], [2.6, 1, 2.6]]] },
  dqHearth: { about: 'hearth pot: iron pot on a stone ring over embers', tags: 'dq station', mats: { s: 'stone', i: 'iron', e: 'dqEmber' }, flames: [[0, 0, 3, 7, 4]],
    parts: [['cyl', 's', [0, 0, 0], 7, 3, { seg: 8 }], ['cyl', 'e', [0, 0, 2.6], 5.5, .6], ['lathe', 'i', [0, 0, 5], [[0, 0], [4, 0], [6, 2], [6.5, 5], [5.5, 7.5], [5.8, 8], [0, 8]]], ['mirror', 'x', ['box', 'i', [6.4, 0, 11], [1, 1, 2]]]] },
  dqForge: { about: 'thimble forge: a giant dimpled thimble with a glowing mouth', tags: 'dq station', mats: { c: 'copper', d: 'bronze', g: 'dqEmber', s: 'stone' }, flames: [[0, 6, 2, 5, 4]],
    parts: [['cyl', 's', [0, 0, 0], 7.5, 2, { seg: 8 }], ['lathe', 'c', [0, 0, 2], [[0, 0], [7, 0], [6.8, 8], [6.2, 13], [5, 16], [2.5, 17.5], [0, 18]]], ['ring', 6, 6.3, ['ball', 'd', [0, 0, 11], 1.1]], ['ring', 5, 5, ['ball', 'd', [0, 0, 15], .9]], ['box', 'g', [0, 6, 3], [6, 2, 6]]] },
  dqRack: { about: 'weapon rack with two clubs', tags: 'dq furniture', mats: { w: 'oak', c: 'stone', h: 'walnut' },
    parts: [['box', 'w', [0, 0, 0], [14, 4, 2]], ['mirror', 'x', ['box', 'w', [6, 0, 0], [2, 2, 15]]], ['box', 'w', [0, 0, 13], [14, 2, 2]], ['mirror', 'x', ['group', [3, 1, 2], 0, [['cyl', 'h', [0, 0, 0], .8, 10], ['ball', 'c', [0, 0, 11], 2]]]]] },
  dqPinTrap: { about: 'pin trap: a board bristling with coloured pins', tags: 'dq trap', mats: { w: 'planks', p: 'steel', r: 'dqRed', b: 'dqBlue', y: 'dqYellow' },
    parts: [['box', 'w', [0, 0, 0], [14, 14, 1.2]], ['ring', 6, 4.5, ['group', [0, 0, 1], 0, [['cyl', 'p', [0, 0, 0], .3, 3], ['ball', 'r', [0, 0, 3.4], .9]]]], ['ring', 4, 1.8, ['group', [0, 0, 1], 0, [['cyl', 'p', [0, 0, 0], .3, 3.4], ['ball', 'y', [0, 0, 3.8], .9]]]], ['mirror', 'xy', ['group', [5.5, 5.5, 1], 0, [['cyl', 'p', [0, 0, 0], .3, 2.6], ['ball', 'b', [0, 0, 3], .8]]]]] },
  dqBallista: { about: 'bobbin ballista: a wooden frame, a steel-thread bow, a spool bolt', tags: 'dq turret', mats: { w: 'oak', d: 'walnut', s: 'steel', b: 'dqCream', r: 'dqRed' },
    parts: [['box', 'd', [0, 0, 0], [12, 12, 3]], ['cyl', 'w', [0, 0, 3], 2.2, 5], ['box', 'w', [0, 1, 8], [3, 18, 2.5]], ['box', 'w', [0, -7, 9], [16, 2, 2], { rot: [0, 0, 0] }], ['mirror', 'x', ['box', 's', [6, -3, 10], [.6, 8, .6], { rot: 35 }]],
      ['cyl', 'b', [0, -1, 11], 2, 3.4, { rot: [90, 0, 0] }], ['cyl', 'r', [0, -6, 11.2], 1.2, 2, { rot: [90, 0, 0] }], ['cyl', 'd', [3.5, 6, 9.5], 1.6, 2, { rot: [0, 90, 0] }]] },
  dqCage: { about: 'knot cage: bars of black knotted yarn', tags: 'dq', mats: { k: 'dqKnot', v: 'dqPlum' },
    parts: [['cyl', 'k', [0, 0, 0], 7.5, 2, { seg: 8 }], ['cyl', 'k', [0, 0, 16], 7.5, 2, { seg: 8 }], ['ring', 8, 6.8, ['cyl', 'k', [0, 0, 2], .9, 14]], ['ball', 'v', [0, 0, 19], 2.5]] },
  dqTuft: { about: 'a tuft of tall grass with straw heads', tags: 'dq plant', mats: { g: 'dqGreen', s: 'dqStraw' },
    parts: [['ring', 5, 2, ['group', [0, 0, 0], 0, [['box', 'g', [0, 0, 0], [1, 1, 7], { rot: [12, 0, 0] }], ['box', 's', [0, 1.5, 7], [1.4, 1.4, 2], { rot: [12, 0, 0] }]]]], ['box', 'g', [0, 0, 0], [1, 1, 8]]] },
  dqCotton: { about: 'cotton puff bush', tags: 'dq plant', mats: { l: 'dqLeaf', c: 'dqCotton', w: 'dqBark' },
    parts: [['cyl', 'w', [0, 0, 0], 1, 4], ['ball', 'l', [0, 0, 6], 5.5, { sz: .75 }], ['ball', 'c', [2.5, 2, 9], 2.2], ['ball', 'c', [-3, 1, 8], 2], ['ball', 'c', [0, -2.5, 10], 2], ['ball', 'c', [1, 3.5, 6.5], 1.8]] },
  dqBerry: { about: 'thimbleberry bush', tags: 'dq plant', mats: { l: 'dqLeaf', b: 'dqBerry', w: 'dqBark' },
    parts: [['cyl', 'w', [0, 0, 0], 1, 3], ['ball', 'l', [0, 0, 6], 6, { sz: .8 }], ['ball', 'b', [3, 3, 7], 1.3], ['ball', 'b', [-3, 2, 8], 1.3], ['ball', 'b', [1, -3, 9.5], 1.3], ['ball', 'b', [-1, 4, 5], 1.2], ['ball', 'b', [4, -1, 9], 1.1]] },
  dqBluebell: { about: 'bluebells', tags: 'dq plant', mats: { g: 'dqGreen', b: 'dqBlue' },
    parts: [['ring', 3, 2.5, ['group', [0, 0, 0], 0, [['box', 'g', [0, 0, 0], [.8, .8, 7]], ['ball', 'b', [0, .8, 7], 1.6, { sz: 1.2 }]]]]] },
  dqButtercup: { about: 'buttercups', tags: 'dq plant', mats: { g: 'dqGreen', y: 'dqYellow' },
    parts: [['ring', 3, 2.5, ['group', [0, 0, 0], 0, [['box', 'g', [0, 0, 0], [.8, .8, 6]], ['cyl', 'y', [0, 0, 6], 1.8, 1.2]]]]] },
  dqPuffball: { about: 'puffball mushrooms', tags: 'dq plant', mats: { p: 'dqPuff', s: 'dqCream' },
    parts: [['cyl', 's', [0, 0, 0], 1.5, 3], ['lathe', 'p', [0, 0, 2.5], [[0, 0], [4, 1], [4.5, 3], [3, 5], [0, 5.5]]], ['cyl', 's', [4, 3, 0], 1, 2], ['lathe', 'p', [4, 3, 1.6], [[0, 0], [2.4, .6], [2.6, 2], [1.6, 3], [0, 3.2]]]] },
  dqDeadBush: { about: 'a dead bush of brittle branches', tags: 'dq plant', mats: { w: 'dqBark' },
    parts: [['box', 'w', [0, 0, 0], [1.4, 1.4, 6]], ['box', 'w', [2, 0, 3], [1, 1, 7], { rot: [0, 35, 0] }], ['box', 'w', [-2, 1, 3], [1, 1, 6], { rot: [0, -40, 0] }], ['box', 'w', [0, -2, 4], [1, 1, 6], { rot: [35, 0, 0] }], ['box', 'w', [1, 2, 4], [.8, .8, 5], { rot: [-40, 20, 0] }]] },
  dqButton: { about: 'an ancient golden button on a stand', tags: 'dq collectible', mats: { g: 'dqGold', d: 'walnut', h: 'bronze' },
    parts: [['box', 'd', [0, 0, 0], [8, 6, 2]], ['cyl', 'g', [0, 0, 9], 6.5, 2, { rot: [90, 0, 0] }], ['mirror', 'x', ['cyl', 'h', [1.8, 1.4, 10.5], .8, 1]], ['mirror', 'x', ['cyl', 'h', [1.8, 1.4, 7.5], .8, 1]]] },
  dqBundle: { about: 'the lost bundle: a patchwork sack', tags: 'dq', mats: { a: 'dqRed', b: 'dqYellow', t: 'dqCream' },
    parts: [['ball', 'a', [0, 0, 4], 5, { sz: .9 }], ['ball', 'b', [2, 2, 5], 3], ['cyl', 't', [0, 0, 8], 1.5, 2]] },
  dqCrate: { about: 'supply crate', tags: 'dq', mats: { c: 'crate', r: 'dqRed' }, parts: [['box', 'c', [0, 0, 0], [14, 14, 13]], ['box', 'r', [0, 7, 9], [6, .6, 3]]] },
  dqDummy: { about: 'a straw training dummy', tags: 'dq', mats: { w: 'oak', s: 'dqStraw', r: 'dqRed' },
    parts: [['cyl', 'w', [0, 0, 0], 1.2, 14], ['ball', 's', [0, 0, 15], 5, { sz: 1.1 }], ['ball', 's', [0, 0, 23], 3.5], ['box', 'w', [0, 0, 18], [16, 1.4, 1.4]], ['box', 'r', [0, 0, 20.5], [7.5, 7.5, 1.2]]] },
  dqWell: { about: 'old stone well', tags: 'dq', mats: { s: 'cobble', w: 'oak', r: 'slate' },
    parts: [['cyl', 's', [0, 0, 0], 7, 8, { seg: 10 }], ['cyl', 'water', [0, 0, 7.6], 5.5, .4], ['mirror', 'x', ['box', 'w', [6, 0, 8], [1.4, 1.4, 14]]], ['prism', 'r', [0, 0, 21], [[-8, 0], [8, 0], [0, 6]], 10, { axis: 'y' }]] }
});

// ---- the object registry ----
// solidH: collision height in units (0 passes); cells: 2 for doors and portals; tags: what rooms count; removable: a swing
// takes it back into the bag
const OBJECTS = DQ.OBJECTS = {};
const O = (id, o) => { OBJECTS[id] = Object.assign({ id, name: (DQ.ITEMS[id] && DQ.ITEMS[id].name) || id, item: DQ.ITEMS[id] ? id : null, solidH: 0, cells: 1, tags: [], removable: !!DQ.ITEMS[id], h: 12 }, o); };
O('bench', { shape: 'dqBench', solidH: 11, station: 'bench', tags: ['bench'] });
O('torch', { shape: 'dqTorch', light: { r: 64, i: .95, color: '#ffb060', z: 15, flicker: true }, tags: ['light'], h: 16 });
O('lantern', { shape: 'dqLantern', light: { r: 96, i: 1, color: '#ffe7a0', z: 13 }, tags: ['light'], h: 16 });
O('latticeDoor', { shape: 'dqDoorLattice', door: true, hp: 30, cells: 2, tags: ['door'], h: 31 });
O('plankDoor', { shape: 'dqDoorPlank', door: true, hp: 50, cells: 2, tags: ['door'], h: 31 });
O('strawBed', { shape: 'dqBed', solidH: 6, bed: true, tags: ['bed'], h: 9 });
O('table', { shape: 'dqTable', solidH: 12, tags: ['table'] });
O('stool', { shape: 'dqStool', solidH: 8, seat: true, tags: ['stool'], h: 9 });
O('chest', { shape: 'dqChest', solidH: 12, chest: true, tags: ['chest'] });
O('hearthPot', { shape: 'dqHearth', solidH: 12, station: 'hearth', light: { r: 48, i: .8, color: '#ff8040', z: 8, flicker: true }, tags: ['hearth'] });
O('forge', { shape: 'dqForge', solidH: 16, station: 'forge', light: { r: 56, i: .85, color: '#ff7030', z: 6, flicker: true }, tags: ['forge'], h: 20 });
O('weaponRack', { shape: 'dqRack', solidH: 14, tags: ['rack'], h: 16 });
O('pinTrap', { shape: 'dqPinTrap', trap: { dmg: 8, every: .8, slow: .6 }, h: 4 });
O('ballista', { shape: 'dqBallista', solidH: 14, ballista: true, hp: 150, h: 14 });
O('banner', { shape: null, draw: 'banner', hp: 300, light: { r: 80, i: 1, color: '#ffd870', z: 30 }, removable: false, item: null, banner: true, h: 34 });
O('portal', { shape: null, draw: 'portal', cells: 2, light: { r: 40, i: .8, color: '#c8a0ff', z: 16 }, portal: true, removable: false, item: null, h: 32 });
O('cage', { shape: 'dqCage', solidH: 16, hp: 30, tier: 2, cage: true, removable: false, item: null, h: 20 });
O('tuft', { shape: 'dqTuft', plant: [['straw', 1, 2, 1], ['grain', 1, 1, .3]], removable: false, item: null, h: 8 });
O('cottonPuff', { shape: 'dqCotton', plant: [['cotton', 2, 2, 1]], removable: false, item: null, h: 11 });
O('berryBush', { shape: 'dqBerry', plant: [['thimbleberry', 2, 2, 1]], removable: false, item: null, h: 11 });
O('bluebell', { shape: 'dqBluebell', plant: [['bluebell', 1, 1, 1]], removable: false, item: null, h: 8 });
O('buttercup', { shape: 'dqButtercup', plant: [['buttercup', 1, 1, 1]], removable: false, item: null, h: 7 });
O('puffball', { shape: 'dqPuffball', plant: [['puffball', 1, 1, 1]], removable: false, item: null, h: 7 });
O('deadBush', { shape: 'dqDeadBush', plant: [['branch', 1, 2, 1]], removable: false, item: null, h: 9 });
O('ancientButton', { shape: 'dqButton', collect: 'ancientButton', removable: false, item: null, h: 15, glint: true });
O('lostBundle', { shape: 'dqBundle', bundle: true, removable: false, item: null, h: 9 });
O('supplyCrate', { shape: 'dqCrate', solidH: 13, crate: true, removable: false, item: null });
O('dummy', { shape: 'dqDummy', removable: false, item: null, deco: true, h: 26 });
O('well', { shape: 'dqWell', solidH: 9, removable: false, item: null, deco: true, h: 24 });
O('goldenThreadPedestal', { shape: null, draw: 'pedestal', removable: false, item: null, h: 14, pedestal: true, light: { r: 70, i: 1, color: '#ffe070', z: 14 } });
for (const p of ['barrel', 'crate', 'sack', 'sign', 'rock']) O(p, { shape: p, solidH: p === 'sign' ? 0 : 10, removable: false, item: null, deco: true, h: 12 });
DQ.obj = id => OBJECTS[id] || null;
})();
