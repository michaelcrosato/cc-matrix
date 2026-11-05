// SHAPES: new E.SHAPES entries (data drawn by r.shape in every view): castles in six regional styles, the Keep tower,
// rampart hex blocks, cottages, gears, cliffs, the clock tower, the Sanctum's season dials, a bridge, a watermill,
// a shrine and a broken pillar. Units: 16 = one tile; the origin is the footprint's middle; written facing south.

const SH = E.SHAPES;
E.WEATHER.petals = { n: 70, fall: 22, colors: ['#f4b8d0', '#ffffff', '#f8d0e0', '#e890b0'], sway: 18, rest: 1, size: 2, wind: 1 };

const castle = (id, about, mats, extra = []) => {
  SH[id] = { about, tags: 'castle brigantime', mats, foot: [-18, -16, 18, 16], parts: [
    ['box', 'w', [0, 2, 0], [26, 18, 16]],
    ['mirror', 'x', ['cyl', 'w', [13, 9, 0], 5, 24, { seg: 10 }]],
    ['mirror', 'x', ['cyl', 'r', [13, 9, 24], 6, 9, { r2: 0, seg: 10 }]],
    ['cyl', 'w', [0, -6, 0], 7, 34, { seg: 12 }],
    ['cyl', 'r', [0, -6, 34], 8.5, 13, { r2: 0, seg: 12 }],
    ['box', 'd', [0, 11.2, 0], [7, 1, 10]],
    ['row', 4, [6, 0, 0], ['box', 'w', [0, 11, 16], [3, 2, 3]]],
    ...extra] };
};
castle('castle-winter', 'grey stone keep with blue slate roofs and icicles', { w: '#8a90a0 stones size=4', r: '#3a5a8a shingles', d: '#3a2a20 planks', i: '#e8fcff glaze' },
  [['mirror', 'x', ['cyl', 'i', [10, 11, 13], 1, 3, { r2: 0, rot: [180, 0, 0] }]], ['cyl', 'i', [0, -6, 44], 1.4, 6, { r2: 0 }]]);
castle('castle-spring', 'white stone keep with green roofs and blossom', { w: '#e8e4dc stones size=5', r: '#3a8a4a shingles', d: '#6a4a2a planks', b: '#f4b8d0 foliage' },
  [['mirror', 'x', ['ball', 'b', [15, 13, 4], 4]], ['ball', 'b', [-9, 12, 3], 3]]);
castle('castle-summer', 'sandstone keep with red and gold domes', { w: '#d8b878 stones size=5', r: '#c83a2a glaze', d: '#5a3a1a planks', g: '#e8c040 metal' },
  [['ball', 'g', [0, -6, 38], 7, { sz: .9 }], ['mirror', 'x', ['ball', 'r', [13, 9, 26], 5]], ['cyl', 'g', [0, -6, 44], 1, 6]]);
castle('castle-autumn', 'timber and brown stone keep with amber roofs', { w: '#7a5a40 stones size=5', r: '#c86a1e shingles', d: '#4a2a14 planks', t: 'timber' },
  [['box', 't', [0, -6, 26], [15, 15, 2]]]);
castle('castle-hour', 'black and white marble keep with a brass clock', { w: '#3a3a46 tiles size=4', r: '#e8e4dc marble', d: '#14121c planks', c: '#d8c070 metal' },
  [['cyl', 'c', [0, 1.6, 26], 4.5, 1, { rot: [90, 0, 0] }], ['box', '#14121c', [0, 1.4, 26.5], [.8, .6, 3.5]]]);
SH['castle-brigand'] = { about: 'a log palisade round two tents', tags: 'castle brigand', mats: { p: '#6a4a2a bark', t: '#c8b088 cloth', s: '#8a3a2a cloth' }, foot: [-18, -16, 18, 16], parts: [
  ['ring', 14, 16, ['cyl', 'p', [0, 0, 0], 2, 14, { r2: 1.4, seg: 6 }]],
  ['prism', 't', [-5, -2, 0], [[-7, 0], [7, 0], [0, 10]], 14, { axis: 'y' }],
  ['prism', 's', [7, 4, 0], [[-5, 0], [5, 0], [0, 8]], 10, { axis: 'y' }],
  ['cyl', 'p', [0, -10, 0], 1, 22], ['box', 's', [3, -10, 16], [6, .5, 5]]] };
SH.keep = { about: 'round watchtower Keep with crenellations', tags: 'keep brigantime', mats: { w: '#9a9488 stones size=4', c: '#7a746a stones size=3', d: '#3a2a20 planks' }, parts: [
  ['cyl', 'w', [0, 0, 0], 9, 32, { seg: 12 }], ['cyl', 'c', [0, 0, 32], 10.5, 3, { seg: 12 }],
  ['ring', 8, 9.5, ['box', 'c', [0, 0, 35], [3, 3, 3]]], ['box', 'd', [0, 8.8, 0], [5, 1, 9]], ['box', '#140c1c', [0, 9, 20], [2, 1, 4]]] };
SH['keep-hour'] = { about: 'the Great Clock tower: black marble, a brass face', tags: 'keep hour', mats: { w: '#2a2a36 tiles size=4', b: '#d8c070 metal', m: '#e8e4dc marble' }, parts: [
  ['cyl', 'w', [0, 0, 0], 10, 44, { seg: 8 }], ['cyl', 'm', [0, 0, 44], 11.5, 3, { seg: 8 }], ['cyl', 'b', [0, 0, 47], 8, 12, { r2: 0, seg: 8 }],
  ['cyl', 'b', [0, 9.6, 30], 6, 1, { rot: [90, 0, 0] }], ['box', '#14121c', [0, 10.4, 26], [.8, .6, 7]]] };
SH.hexblock = { about: 'a rampart hex block with crenellations', tags: 'wall brigantime', mats: { w: '#8a8478 stones size=5', c: '#6a6458 stones size=3' }, parts: [
  ['cyl', 'w', [0, 0, 0], 16.2, 22, { seg: 6 }], ['ring', 6, 13, ['box', 'c', [0, 0, 22], [4, 4, 4]]]] };
SH['hexblock-ice'] = { about: 'an ice-rimed rampart block', tags: 'wall winter', mats: { w: '#8a98b0 stones size=5', c: '#c8f0ff glaze' }, parts: SH.hexblock.parts };
SH.cottage = { about: 'a timber-and-plaster cottage with a tiled roof', tags: 'house village', mats: { w: 'plaster', t: 'timber', r: '#8a3a2a shingles', d: '#4a2a14 planks' }, parts: [
  ['box', 'w', [0, 0, 0], [24, 20, 16]], ['prism', 'r', [0, 0, 16], [[-13, 0], [13, 0], [0, 10]], 22, { axis: 'y' }],
  ['box', 'd', [0, 10.2, 0], [5, 1, 9]], ['box', 't', [0, 0, 16], [25, 21, 1.5]], ['box', '#e8d890', [-7, 10.2, 8], [3, 1, 3]]] };
SH.gear = { about: 'a great brass gear on its side, half sunk', tags: 'hour clockwork', mats: { b: '#b89a50 metal', d: '#5a4a30 metal' }, parts: [
  ['cyl', 'b', [0, 0, 0], 13, 7, { seg: 16 }], ['ring', 12, 14, ['box', 'b', [0, 0, 0], [3, 3, 7]]], ['cyl', 'd', [0, 0, 7], 5, 2, { seg: 10 }]] };
SH.cliff = { about: 'a jagged rock face', tags: 'mountain', mats: { s: 'rock' }, parts: [
  ['rock', 's', [0, 0, 0], 14, { sz: 1.6, seed: 3, rough: .4 }], ['rock', 's', [5, -4, 8], 8, { sz: 1.4, seed: 5 }]] };
SH.clocktower = { about: "Meridian's great clock tower", tags: 'hour landmark', mats: { w: '#2a2a36 tiles size=4', m: '#e8e4dc marble', b: '#d8c070 metal' }, parts: [
  ['cyl', 'm', [0, 0, 0], 18, 8, { seg: 8 }], ['cyl', 'w', [0, 0, 8], 13, 70, { seg: 8 }], ['cyl', 'm', [0, 0, 78], 15, 4, { seg: 8 }],
  ['cyl', 'w', [0, 0, 82], 10, 16, { seg: 8 }], ['cyl', 'b', [0, 0, 98], 11, 18, { r2: 0, seg: 8 }], ['cyl', 'b', [0, 0, 116], 1, 8],
  ['cyl', 'm', [0, 12.6, 58], 9, 1, { rot: [90, 0, 0] }]] };
SH.dial = { about: 'a season dial set in the floor', tags: 'hour sanctum', mats: { b: '#b89a50 metal', s: '#3a3a46 tiles' }, parts: [
  ['cyl', 's', [0, 0, 0], 11, 1.5, { seg: 12 }], ['cyl', 'b', [0, 0, 1.5], 8, 1, { seg: 12 }], ['box', 'b', [0, 0, 2.5], [1.5, 7, 1]]] };
SH.bridge = { about: 'a plank bridge with rails', tags: 'bridge', mats: { p: 'planks', r: 'oak' }, parts: [
  ['box', 'p', [0, 0, 0], [28, 16, 2]], ['mirror', 'y', ['box', 'r', [0, 7.5, 2], [28, 1, 1.2]]], ['mirror', 'xy', ['box', 'r', [12, 7.5, 0], [1.4, 1.4, 6]]]] };
SH.watermill = { about: 'a watermill with its wheel', tags: 'village', mats: { w: 'plaster', t: 'timber', r: '#6a4a2a shingles', o: 'oak' }, parts: [
  ['box', 'w', [0, 0, 0], [22, 18, 16]], ['prism', 'r', [0, 0, 16], [[-12, 0], [12, 0], [0, 9]], 20, { axis: 'y' }],
  ['cyl', 'o', [13, 0, 9], 9, 3, { rot: [0, 90, 0], seg: 10 }], ['cyl', 't', [13, 0, 9], 2, 4, { rot: [0, 90, 0] }]] };
SH.shrine = { about: 'a small wayside shrine of the Wheel', tags: 'shrine', mats: { s: '#e8e4dc marble', b: '#d8c070 metal' }, parts: [
  ['box', 's', [0, 0, 0], [10, 10, 3]], ['cyl', 's', [0, 0, 3], 3, 14, { seg: 8 }], ['cyl', 'b', [0, 0, 17], 4.5, 1, { rot: [90, 0, 0] }]] };
SH.brokenpillar = { about: 'a broken pillar and rubble', tags: 'ruins', mats: { s: '#9a9488 stones size=3' }, parts: [
  ['cyl', 's', [0, 0, 0], 3.5, 11, { seg: 8 }], ['rock', 's', [5, 3, 0], 3, { seed: 4 }], ['rock', 's', [-4, 4, 0], 2.2, { seed: 7 }]] };
SH.tent = { about: 'a war tent with a pennant', tags: 'camp', mats: { c: '#c8b088 cloth', p: 'oak' }, parts: [
  ['prism', 'c', [0, 0, 0], [[-10, 0], [10, 0], [0, 14]], 18, { axis: 'y' }], ['cyl', 'p', [0, 0, 14], .8, 8]] };
SH.maptable = { about: 'a campaign table with a map', tags: 'camp', mats: { t: 'oak', m: '#e8d8b0 cloth' }, parts: [
  ['box', 't', [0, 0, 10], [22, 14, 2]], ['box', 'm', [0, 0, 12], [18, 10, .4]], ['mirror', 'xy', ['box', 't', [9, 5, 0], [2, 2, 10]]]] };
SH.bier = { about: "the Keeper's bier", tags: 'hour', mats: { s: '#e8e4dc marble', c: '#5a2a6a velvet' }, parts: [
  ['box', 's', [0, 0, 0], [26, 12, 8]], ['box', 'c', [0, 0, 8], [24, 10, 2]], ['box', 's', [-12, 0, 8], [2, 12, 6]]] };
SH.sundial = { about: 'a garden sundial', tags: 'garden', mats: { s: '#c8c0b0 stones size=3', b: '#b89a50 metal' }, parts: [
  ['cyl', 's', [0, 0, 0], 3, 10, { seg: 8 }], ['cyl', 's', [0, 0, 10], 6, 1.5, { seg: 12 }], ['wedge', 'b', [0, 0, 11.5], [.8, 5, 4]]] };
SH.haybale = { about: 'a round hay bale', tags: 'farm', mats: { h: 'straw' }, parts: [['cyl', 'h', [0, 0, 0], 6, 9, { rot: [0, 90, 0], seg: 10 }]] };
SH.pumpkin = { about: 'a ripe pumpkin', tags: 'farm autumn', mats: { o: '#e07a1e glaze', s: '#4a6a2a bark' }, parts: [['ball', 'o', [0, 0, 3.5], 4.5, { sz: .75 }], ['cyl', 's', [0, 0, 6.5], .8, 2]] };

/** the castle shape for a region */
G.castleShape = region => ({ winter: 'castle-winter', spring: 'castle-spring', summer: 'castle-summer', autumn: 'castle-autumn', hour: 'castle-hour' }[region] || 'castle-brigand');
