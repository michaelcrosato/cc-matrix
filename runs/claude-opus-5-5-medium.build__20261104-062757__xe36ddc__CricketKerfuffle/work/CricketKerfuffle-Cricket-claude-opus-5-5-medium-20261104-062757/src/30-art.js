// ---- art: the cricket shapes (objects as data, drawn by the engine in every view, docs/ASSETS.md), the ground built
// from a recipe (a TileMap: mown stripes, the square, the pitch and its creases, the rope; buildings as walls), the
// far-end panorama for the broadcast camera, the crowd.
const M = (c, pat) => c + (pat ? ' ' + pat : '');
Object.assign(E.SHAPES, {
  ck_stumps: { about: 'three ash stumps and two bails', tags: 'cricket', mats: { s: M('#e8dcb8', 'planks bw=1'), b: '#f4ecd0' },
    parts: [['row', 3, [2.6, 0, 0], ['cyl', 's', [0, 0, 0], .55, 12.5, { seg: 6 }]], ['row', 2, [2.6, 0, 0], ['box', 'b', [0, 0, 12.5], [2.4, .6, .6]]]] },
  ck_stumpsDown: { about: 'stumps knocked back, bails gone', tags: 'cricket', mats: { s: M('#e8dcb8') },
    parts: [['cyl', 's', [-2.6, 0, 0], .55, 12, { seg: 6 }], ['box', 's', [0, -3, 0], [1.1, 1.1, 12], { rot: [0, -38, 0] }], ['box', 's', [2.6, -2, 0], [1.1, 1.1, 12], { rot: [0, -24, 20] }]] },
  ck_sightscreen: { about: 'white boarded sight screen on a scaffold', tags: 'cricket', mats: { w: M('#f4f4ee', 'planks bw=4'), f: M('#6a5a4a') },
    parts: [['box', 'w', [0, 0, 4], [64, 3, 34]], ['mirror', 'x', ['box', 'f', [30, 4, 0], [2, 2, 40]]], ['row', 3, [0, 0, 0], ['box', 'f', [0, 4, 0], [2, 2, 38]]]] },
  ck_adboard: { about: 'boundary advertising board', tags: 'cricket', params: { c: '#2f6b3a', len: 48 }, mats: { f: M('#3a3028') },
    make: p => [['box', p.c, [0, 0, 0], [p.len, 2, 9]], ['box', 'f', [0, 1.5, 0], [p.len, 1, 1.5]]] },
  ck_deckchair: { about: 'striped canvas deck chair', tags: 'village', params: { c: '#d84a3a' }, mats: { w: 'oak' },
    make: p => [['box', 'w', [-5, 0, 0], [1, 9, 8], { rot: [0, 0, 0] }], ['box', 'w', [5, 0, 0], [1, 9, 8]], ['box', p.c + ' cloth', [0, 0, 4], [10, 8, 1], { rot: [-25, 0, 0] }], ['box', p.c + ' cloth', [0, 4, 4], [10, 1, 10], { rot: [-20, 0, 0] }]] },
  ck_scoreboard: { about: 'village scoreboard hut with number plates', tags: 'cricket village', mats: { w: M('#3a5a3a', 'planks'), r: 'slate', n: '#1a1a1a' },
    parts: [['box', 'w', [0, 0, 0], [44, 18, 30]], ['prism', 'r', [0, 0, 30], [[-11, 0], [11, 0], [0, 8]], 48, { axis: 'x' }], ['box', 'n', [0, 9.5, 12], [36, 1, 14]]] },
  ck_pavilionClock: { about: 'pavilion clock tower', tags: 'village', mats: { w: M('#f2ead8', 'planks'), c: '#f8f4e0', r: 'tiles', g: 'gold' },
    parts: [['box', 'w', [0, 0, 0], [16, 16, 30]], ['cyl', 'c', [0, 8.5, 22], 5, 1, { rot: [90, 0, 0] }], ['prism', 'r', [0, 0, 30], [[-9, 0], [9, 0], [0, 10]], 18, { axis: 'x' }], ['cyl', 'g', [0, 0, 40], .8, 8]] },
  ck_church: { about: 'church tower and spire with a weathervane', tags: 'village', mats: { s: 'stone', r: 'slate', g: 'gold' },
    parts: [['box', 's', [0, 0, 0], [34, 34, 70]], ['cyl', 'r', [0, 0, 70], 22, 34, { r2: 0, seg: 4 }], ['cyl', 'g', [0, 0, 104], .8, 8], ['box', 'g', [0, 0, 110], [10, 1, 2]]] },
  ck_greenhouse: { about: 'vicarage greenhouse, glass panes', tags: 'village', mats: { gl: '#bfe8ff glaze', f: '#f4f4f0' },
    parts: [['box', 'gl', [0, 0, 0], [52, 26, 18]], ['prism', 'gl', [0, 0, 18], [[-13, 0], [13, 0], [0, 10]], 52, { axis: 'x' }], ['row', 5, [12, 0, 0], ['box', 'f', [0, 13.5, 0], [1, 1, 18]]]] },
  ck_oak: { about: 'great oak with a beehive', tags: 'village', params: { h: 80 }, mats: { t: 'bark', l: M('#3f7a32', 'foliage'), h: M('#d8a84a', 'thatch') },
    make: p => [['cyl', 't', [0, 0, 0], 6, p.h * .5, { r2: 4 }], ['ball', 'l', [0, 0, p.h * .62], 30, { sz: .75 }], ['ball', 'l', [-18, 6, p.h * .5], 20, { sz: .7 }], ['ball', 'l', [16, -4, p.h * .56], 22, { sz: .7 }], ['lathe', 'h', [8, 12, p.h * .44], [[0, 0], [4, 1], [5, 4], [4, 7], [0, 9]]]] },
  ck_pub: { about: 'The Leaning Wicket pub front, hanging sign', tags: 'village', mats: { b: 'brick', r: 'tiles', w: '#2a3a4a glaze', s: 'oak', p: '#8a2a2a' },
    parts: [['box', 'b', [0, 0, 0], [70, 34, 40]], ['prism', 'r', [0, 0, 40], [[-17, 0], [17, 0], [0, 16]], 74, { axis: 'x' }], ['row', 3, [22, 0, 0], ['box', 'w', [0, 17.5, 18], [12, 1, 12]]], ['box', 'p', [0, 17.5, 0], [12, 1, 16]], ['box', 's', [42, 14, 0], [1.5, 1.5, 34]], ['box', 'p', [42, 20, 22], [1, 12, 10]]] },
  ck_fountain: { about: 'tiered stone fountain', tags: 'hall', mats: { s: 'marble', w: '#6ab8e8 glaze' },
    parts: [['cyl', 's', [0, 0, 0], 22, 5], ['cyl', 'w', [0, 0, 4.5], 19, 1], ['cyl', 's', [0, 0, 5], 3, 14], ['cyl', 's', [0, 0, 18], 10, 2], ['cyl', 'w', [0, 0, 19.5], 8, 1], ['cyl', 's', [0, 0, 20], 1.5, 8]] },
  ck_car: { about: 'a long black vintage motor car with running boards', tags: 'hall', mats: { b: '#1a1a22 glaze', c: 'steel', w: '#2a2a2a', g: '#a8c8e8 glaze' },
    parts: [['box', 'b', [0, 0, 4], [56, 18, 9]], ['box', 'b', [-6, 0, 13], [26, 16, 10]], ['box', 'g', [8, 0, 14], [2, 14, 8]], ['box', 'c', [26, 0, 6], [4, 14, 6]], ['mirror', 'xy', ['cyl', 'w', [18, 9, 4], 4.5, 3, { rot: [90, 0, 0] }]], ['mirror', 'y', ['box', 'c', [0, 10, 3], [40, 3, 1]]]] },
  ck_beachhut: { about: 'striped beach hut', tags: 'beach', params: { c: '#3fb8ff' }, mats: { w: '#f4f4f0 planks bw=3', r: '#e04a3a' },
    make: p => [['box', p.c + ' planks bw=3', [0, 0, 0], [22, 20, 24]], ['prism', 'r', [0, 0, 24], [[-11, 0], [11, 0], [0, 9]], 22, { axis: 'y' }], ['box', 'w', [0, 10.5, 0], [10, 1, 18]]] },
  ck_ferris: { about: 'Ferris wheel on the pier', tags: 'beach', params: { a: 0 }, mats: { m: '#f4f4f0 metal', c: '#e04a3a', y: '#ffd23a' },
    make: p => { const out = [['mirror', 'x', ['box', 'm', [18, 0, 0], [2, 2, 70], { rot: [0, 14, 0] }]]]; for (let k = 0; k < 8; k++) { const a = p.a + k * Math.PI / 4; out.push(['box', 'm', [Math.cos(a) * 26, 0, 64 + Math.sin(a) * 26], [3, 3, 3]], ['box', k % 2 ? 'c' : 'y', [Math.cos(a) * 30, 3, 60 + Math.sin(a) * 30], [7, 6, 6]]); } out.push(['cyl', 'm', [0, 0, 64], 4, 4, { rot: [90, 0, 0] }]); return out; } },
  ck_icecream: { about: 'ice-cream van with a giant cone', tags: 'beach', mats: { v: '#f8f0f0 glaze', p: '#ff8ad8', c: '#d8a860', w: '#2a2a2a' },
    parts: [['box', 'v', [0, 0, 4], [44, 20, 22]], ['box', 'p', [0, 0, 18], [44, 20, 3]], ['cyl', 'c', [0, 0, 26], 5, 12, { r2: 1, rot: [180, 0, 0] }], ['ball', 'p', [0, 0, 39], 6], ['mirror', 'xy', ['cyl', 'w', [14, 10, 4], 4, 2, { rot: [90, 0, 0] }]]] },
  ck_shark: { about: 'inflatable shark', tags: 'beach', mats: { s: '#7a8a9a glaze', w: '#f4f4f0' },
    parts: [['ball', 's', [0, 0, 7], 9, { sz: .6 }], ['ball', 's', [12, 0, 7], 7, { sz: .55 }], ['box', 's', [-2, 0, 12], [6, 2, 10], { rot: [0, 30, 0] }], ['box', 's', [-16, 0, 8], [6, 2, 8], { rot: [0, -30, 0] }], ['box', 'w', [16, 0, 5], [6, 8, 2]]] },
  ck_tophat: { about: "a giant magician's top hat", tags: 'downs', mats: { b: '#1a1a22 cloth', r: '#8a1a3a' },
    parts: [['cyl', 'b', [0, 0, 0], 24, 2], ['cyl', 'b', [0, 0, 2], 15, 34], ['cyl', 'r', [0, 0, 8], 15.4, 5]] },
  ck_tower: { about: 'timber water tower on four braced stilts', tags: 'downs', mats: { w: 'plank', t: M('#8a6a4a', 'planks dir=v'), r: 'slate' },
    parts: [['mirror', 'xy', ['box', 'w', [10, 10, 0], [2.5, 2.5, 56]]], ['cyl', 't', [0, 0, 56], 17, 22], ['cyl', 'r', [0, 0, 78], 18, 8, { r2: 0 }], ['row', 2, [0, 0, 20], ['box', 'w', [0, 10, 18], [22, 1, 2]]]] },
  ck_balloon: { about: 'hot-air balloon', tags: 'downs', mats: { a: '#e04a3a cloth', b: '#ffd23a cloth', k: 'straw' },
    parts: [['ball', 'a', [0, 0, 34], 22, { sz: 1.15 }], ['cyl', 'b', [0, 0, 22], 21, 6], ['box', 'k', [0, 0, 0], [10, 10, 8]], ['mirror', 'xy', ['box', 'k', [4, 4, 8], [.6, .6, 8]]]] },
  ck_caravan: { about: "magician's painted caravan", tags: 'downs', mats: { w: '#5a2a7a planks', r: '#c8ccd8', y: '#ffd23a', k: '#3a2a1a' },
    parts: [['box', 'w', [0, 0, 6], [40, 20, 22]], ['cyl', 'r', [0, 0, 28], 10, 40, { rot: [0, 90, 0], sq: .5 }], ['mirror', 'xy', ['cyl', 'y', [12, 10, 6], 6, 2, { rot: [90, 0, 0] }]], ['box', 'k', [24, 0, 4], [12, 2, 2]]] },
  ck_floodlight: { about: 'lattice floodlight pylon with a lamp bank', tags: 'stadium', mats: { m: 'steel', l: '#fff8e0' },
    parts: [['cyl', 'm', [0, 0, 0], 3, 120, { r2: 1.6, seg: 4 }], ['box', 'm', [0, 0, 118], [26, 4, 16]], ['row', 3, [8, 0, 0], ['box', 'l', [0, 2.4, 122], [6, 1, 8]]]], lights: [[0, 0, 124, '#fff4dc', 220]] },
  ck_jumbotron: { about: 'a giant screen frame on legs', tags: 'dome', mats: { m: 'steel', s: '#1a2a4a glaze' },
    parts: [['mirror', 'x', ['box', 'm', [40, 0, 0], [5, 5, 70]]], ['box', 'm', [0, 0, 64], [100, 6, 56]], ['box', 's', [0, 3.5, 68], [92, 1, 48]]] },
  ck_bell: { about: 'a ghostly bronze bell on a frame', tags: 'dome', mats: { b: 'bronze', w: 'walnut' },
    parts: [['mirror', 'x', ['box', 'w', [14, 0, 0], [3, 3, 60]]], ['box', 'w', [0, 0, 58], [32, 3, 3]], ['lathe', 'b', [0, 0, 36], [[0, 0], [10, 0], [8, 6], [6, 16], [3, 20], [0, 21]]]] },
  ck_laser: { about: 'a stadium laser rig', tags: 'dome', mats: { m: 'steel', l: '#ff3aff glaze' },
    parts: [['box', 'm', [0, 0, 0], [16, 16, 40]], ['box', 'm', [0, 0, 40], [22, 10, 10]], ['row', 3, [6, 0, 0], ['cyl', 'l', [0, 6, 44], 1.5, 2, { rot: [90, 0, 0] }]]] },
  ck_machine: { about: 'the Thrumptonator 3000: a brass steam bowling machine', tags: 'dome', params: { a: 0 }, mats: { b: 'bronze', i: 'iron', g: '#f8f0d0', r: '#8a1a1a' },
    make: p => [['box', 'i', [0, 0, 0], [26, 30, 6]], ['cyl', 'b', [0, 4, 6], 9, 26, { rot: [90, 0, 0] }], ['cyl', 'b', [0, 4, 15], 8, 18], ['cyl', 'i', [0, 4, 33], 3, 10], ['cyl', 'g', [8, 0, 18], 3, 1, { rot: [0, 90, 0] }],
      ['group', [0, -14, 26], 0, [['cyl', 'i', [0, 0, 0], 8, 2, { rot: [90, 0, 0] }], ['box', 'r', [Math.cos(p.a) * 7, 0, Math.sin(p.a) * 7], [3, 3, 3]], ['box', 'r', [-Math.cos(p.a) * 7, 0, -Math.sin(p.a) * 7], [3, 3, 3]]]]] },
  ck_cow: { about: 'Doris, a Friesian cow', tags: 'village', params: { step: 0 }, mats: { w: '#f4f4f0', k: '#1a1a1a', p: '#f0a8a8', h: '#d8c8a0' },
    make: p => { const s = Math.sin(p.step / 16 * Math.PI * 2) * 3; return [['box', 'w', [0, 0, 12], [28, 13, 11]], ['box', 'k', [4, 0, 17], [10, 13.4, 6]], ['box', 'k', [-8, 3, 13], [6, 13.6, 7]], ['box', 'w', [18, 0, 15], [9, 8, 9]], ['box', 'p', [23, 0, 13], [3, 6, 4]], ['mirror', 'y', ['box', 'h', [17, 4, 22], [1, 1, 4]]],
      ['box', 'w', [11 + s, 4, 0], [3, 3, 12]], ['box', 'w', [11 - s, -4, 0], [3, 3, 12]], ['box', 'w', [-11 - s, 4, 0], [3, 3, 12]], ['box', 'w', [-11 + s, -4, 0], [3, 3, 12]], ['box', 'k', [-15, 0, 10], [1, 1, 10], { rot: [0, 20, 0] }]]; } },
  ck_minibus: { about: 'the Kerfuffle Express minibus', tags: 'map', mats: { b: '#2f6b3a glaze', c: '#f2ead8', g: '#a8c8e8 glaze', w: '#2a2a2a' },
    parts: [['box', 'b', [0, 0, 4], [44, 20, 14]], ['box', 'c', [0, 0, 18], [44, 20, 10]], ['row', 4, [10, 0, 0], ['box', 'g', [0, 10.5, 20], [7, 1, 6]]], ['mirror', 'xy', ['cyl', 'w', [14, 10, 4], 4, 2, { rot: [90, 0, 0] }]]] },
  ck_covers: { about: 'blue tarpaulin covers over the pitch', tags: 'cricket', params: { spread: 1 }, mats: { c: '#2a5ad8 cloth' },
    make: p => [['box', 'c', [0, 160 - 170 * p.spread, 0], [56, Math.max(4, 340 * p.spread), 2]], ['cyl', 'c', [0, 160 - 340 * p.spread, 3], 3, 56, { rot: [0, 90, 0] }]] },
  ck_urn: { about: 'a tea urn and cake stand on a trestle table', tags: 'village', mats: { t: 'linen', u: 'steel', c: '#f8d8a8', p: '#ff8ad8' },
    parts: [['box', 't', [0, 0, 10], [40, 14, 2]], ['mirror', 'xy', ['box', 'oak', [17, 5, 0], [2, 2, 10]]], ['cyl', 'u', [-10, 0, 12], 5, 12], ['cyl', 'c', [10, 0, 12], 6, 3], ['cyl', 'p', [10, 0, 15], 4, 3], ['cyl', 'c', [10, 0, 18], 2.5, 3]] },
  ck_hut: { about: 'a striped spectator awning', tags: 'stadium', params: { c: '#d84a3a' }, mats: { p: 'steel' },
    make: p => [['mirror', 'xy', ['box', 'p', [18, 8, 0], [1.5, 1.5, 22]]], ['box', p.c + ' cloth', [0, 0, 22], [40, 20, 2]]] }
});
const TEAM_SHAPE_COLORS = ['#d84a3a', '#3a7ad8', '#ffd23a', '#2f9a5a', '#ff8ad8', '#f4f4f0'];

// ---- the ground: a TileMap from a recipe (OX, OY place the pitch frame in the map's world)
const MAP_W = 138, MAP_H = 120;
function groundRecipe(gid) {
  const G = GROUNDS[gid], B = [];
  // buildings as walls: [x0, y0, x1, y1] in the pitch frame, type
  const add = (x0, y0, x1, y1, t) => B.push([x0, y0, x1, y1, t]);
  const rx = G.rx, ry = G.ry, cy = 160;
  if (G.surround === 'village') { add(-180, cy + ry + 70, 160, cy + ry + 150, 1); add(-rx - 140, 60, -rx - 70, 200, 2); for (let a = 0; a < 40; a++) { const t = a / 40 * TAU, d = 1.18; const x = Math.cos(t) * rx * d, y = cy + Math.sin(t) * ry * d; if (y < cy + ry * .7 && Math.abs(x + rx + 105) > 120) add(x - 14, y - 14, x + 14, y + 14, 8); } }
  if (G.surround === 'hall') { add(-260, cy - ry - 210, 260, cy - ry - 120, 3); add(-rx - 120, cy + 120, -rx - 70, cy + 300, 8); add(rx + 80, cy - 200, rx + 130, cy + 40, 8); add(-200, cy + ry + 60, 200, cy + ry + 100, 4); }
  if (G.surround === 'beach') { for (let k = 0; k < 9; k++) add(-260 + k * 60, cy - ry - 110, -230 + k * 60, cy - ry - 80, 6); add(-160, cy + ry + 60, 160, cy + ry + 110, 4); add(rx + 60, cy - 120, rx + 110, cy + 120, 4); }
  if (G.surround === 'downs') { add(-200, cy + ry + 60, 200, cy + ry + 100, 4); add(-rx - 110, cy - 200, -rx - 60, cy, 4); add(rx + 60, cy, rx + 110, cy + 200, 4); }
  if (G.surround === 'dome') { for (let a = 0; a < 64; a++) { const t = a / 64 * TAU; for (const [d, ty] of [[1.12, 7], [1.2, 9]]) { const x = Math.cos(t) * rx * d, y = cy + Math.sin(t) * ry * d; add(x - 22, y - 22, x + 22, y + 22, ty); } } }
  return B;
}
const WALL_TYPES = {
  1: { h: 40, top: '#8a3a2a', side: '#f2ead8', face: 'timber', roof: 'tiles' },
  2: { h: 36, top: '#7a3a2a', side: '#9a4a3a', face: 'brick', roof: 'tiles' },
  3: { h: 64, top: '#6a6a72', side: '#c8bfa8', face: 'stone', roof: 'slab' },
  4: { h: 22, top: '#8a7a6a', side: '#6a5a4a', face: 'plank', roof: 'plain' },
  6: { h: 22, top: '#e04a3a', side: '#3fb8ff', face: 'plank', roof: 'plain' },
  7: { h: 34, top: '#3a3a4a', side: '#2a2a36', face: 'stone', roof: 'plain' },
  8: { h: 16, top: '#3f7a32', side: '#2f6a2a', face: 'hedge', roof: 'leaves' },
  9: { h: 64, top: '#2a2a3a', side: '#1a1a26', face: 'stone', roof: 'plain' }
};
function buildGround(gid) {
  const G = GROUNDS[gid], rows = [];
  const grid = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('.'));
  for (const [x0, y0, x1, y1, t] of groundRecipe(gid)) {
    for (let cy = Math.floor((y0 + OY) / 16); cy <= Math.floor((y1 + OY) / 16); cy++) for (let cx = Math.floor((x0 + OX) / 16); cx <= Math.floor((x1 + OX) / 16); cx++) if (cy >= 1 && cy < MAP_H - 1 && cx >= 1 && cx < MAP_W - 1) grid[cy][cx] = String(t);
  }
  for (const r of grid) rows.push(r.join(''));
  const legend = { '.': { floor: 'grass' } }; const types = {};
  for (const k of Object.keys(WALL_TYPES)) { legend[k] = +k; types[+k] = Object.assign({}, WALL_TYPES[k]); }
  if (G.surround === 'dome') { types[7] = Object.assign({}, WALL_TYPES[7], { cut: true }); types[9] = Object.assign({}, WALL_TYPES[9], { cut: true }); }
  const grass = G.grass.map(E.hex), pitch = E.hex(G.pitch), rope = E.hex(G.rope), worn = E.hex(E.shade(G.pitch, -.12)), square = E.hex(E.shade(G.grass[0], .08));
  const k = T('boundaryScale'), brx = G.rx * k, bry = G.ry * k;
  const sur = { village: '#4f8a3a', hall: '#a8a090', beach: '#e8d39a', downs: '#b89a62', dome: '#24242e' }[G.surround];
  const surr = E.hex(sur), surr2 = E.hex(E.shade(sur, -.1)), sea = E.hex('#2a8ad0'), seaLt = E.hex('#5ab8f0');
  const noise = (x, y) => { const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return n - Math.floor(n); };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (a, f) => [a[0] * f, a[1] * f, a[2] * f];
  const floorTex = (wx, wy) => {
    const x = wx - OX, y = wy - OY, n = noise(Math.floor(wx), Math.floor(wy));
    const e = (x / brx) ** 2 + ((y - 160) / bry) ** 2;
    if (e > 1) {
      const dd = Math.sqrt(e) - 1;
      if (dd < .012) return mul(rope, .96 + n * .04);
      if (dd < .02) return mul(grass[1], .7);
      if (G.surround === 'beach' && x < -brx - 40) return mix(sea, seaLt, (Math.sin(y * .05 + x * .02) > .7 ? .5 : 0) + n * .15);
      if (G.surround === 'village' && Math.abs(y - (160 + bry + 40)) < 14) return mul(E.hex('#c8b890'), .9 + n * .1);   // the lane past the pavilion
      if (G.surround === 'dome') return mix(surr, surr2, (Math.floor(x / 16) + Math.floor(y / 16)) & 1 ? .6 : 0);
      return mix(surr, surr2, n * .6 + (dd > .25 ? .3 : 0));
    }
    // the pitch
    if (Math.abs(x) <= PITCH.halfW && y > -22 && y < 342) {
      let c = pitch;
      const endWear = Math.min(Math.abs(y - 10), Math.abs(y - 310)) < 30 && Math.abs(x) < 12;
      if (endWear) c = mix(pitch, worn, .55 + n * .2);
      c = mul(c, .95 + n * .07);
      const line = (v, w) => Math.abs(v) <= w;
      if ((line(y - 20, .8) || line(y - 300, .8)) && Math.abs(x) <= PITCH.halfW) return [246, 244, 236];
      if ((line(y, .8) || line(y - 320, .8)) && Math.abs(x) <= 14) return [246, 244, 236];
      if (line(Math.abs(x) - PITCH.retX, .8) && ((y > -8 && y < 22) || (y > 298 && y < 328))) return [246, 244, 236];
      if (Math.abs(x) < 2.2 && (Math.abs(y) < 1.4 || Math.abs(y - 320) < 1.4)) return mul(worn, .7);
      return c;
    }
    // the square, then mown stripes
    if (Math.abs(x) < 110 && y > -50 && y < 370) { const st = (Math.floor((x + 1000) / 20) & 1); return mul(square, (st ? .97 : 1.02) + n * .05); }
    const stripe = gid === 'hall' ? (Math.floor((x + y + 4000) / 40) & 1) : (Math.floor((x + 1000) / 32) & 1);
    const base = stripe ? grass[0] : grass[1];
    return mul(base, .94 + n * .1 + (G.surround === 'downs' && n > .9 ? -.15 : 0));
  };
  const map = new E.TileMap({ rows, legend, types, floorTex, outside: sur, ao: 4, chunks: true });
  map._gid = gid;
  return map;
}
// props round each ground: [shape id, x, y, opts] in the pitch frame (targets carry their own landmark)
function groundProps(gid, m) {
  const G = GROUNDS[gid], P = [], k = T('boundaryScale'), rx = G.rx * k, ry = G.ry * k;
  const R = E.rng(gid.length * 97 + 3);
  // sight screens at both ends, just beyond the rope; boards round the rope
  P.push(['ck_sightscreen', 0, 160 - ry - 26, { facing: Math.PI / 2 }], ['ck_sightscreen', 0, 160 + ry + 26, { facing: -Math.PI / 2 }]);
  const ads = [['#2f6b3a', 'KERFUFFLE TEAS'], ['#c8402a', "CRUMB'S CAKES"], ['#22305a', 'THRUMPTON HOLDINGS'], ['#d8a03a', 'LEANING WICKET ALES']];
  for (let a = 0; a < 44; a++) { const t = a / 44 * TAU, x = Math.cos(t) * (rx + 12), y = 160 + Math.sin(t) * (ry + 12); if (Math.abs(x) < 50) continue; P.push(['ck_adboard', x, y, { facing: Math.atan2(160 - y, -x), params: { c: ads[a % 4][0], len: 44 } }]); }
  if (G.surround === 'village') {
    P.push(['ck_pub', -rx - 90, 120, { facing: 0 }], ['ck_greenhouse', rx + 50, 330, { facing: Math.PI }], ['ck_church', 420, -520, { facing: Math.PI / 2 }], ['ck_oak', -470, -330, {}], ['ck_scoreboard', 260, 160 + ry + 60, { facing: -Math.PI / 2 }], ['ck_pavilionClock', 0, 160 + ry + 100, { facing: -Math.PI / 2 }], ['ck_urn', -120, 160 + ry + 50, { facing: -Math.PI / 2 }]);
    for (let n = 0; n < 26; n++) { const t = R() * TAU, x = Math.cos(t) * (rx + 30 + R() * 20), y = 160 + Math.sin(t) * (ry + 30 + R() * 20); P.push(['ck_deckchair', x, y, { facing: Math.atan2(160 - y, -x), params: { c: TEAM_SHAPE_COLORS[n % 6] } }]); }
    for (let n = 0; n < 14; n++) { const t = n / 14 * TAU + .2, x = Math.cos(t) * (rx + 170), y = 160 + Math.sin(t) * (ry + 170); P.push(['tree', x, y, { params: { h: 50 + R() * 30, seed: n } }]); }
  }
  if (G.surround === 'hall') { P.push(['ck_fountain', -rx + 60, 360, {}], ['ck_car', rx + 40, 220, { facing: Math.PI / 2 }]); for (let n = 0; n < 12; n++) { const t = n / 12 * TAU, x = Math.cos(t) * (rx + 160), y = 160 + Math.sin(t) * (ry + 160); P.push(['pine', x, y, { params: { h: 50 + R() * 20, tiers: 4 } }]); } for (let n = 0; n < 16; n++) { const t = R() * TAU; P.push(['ck_deckchair', Math.cos(t) * (rx + 36), 160 + Math.sin(t) * (ry + 36), { params: { c: n % 2 ? '#22305a' : '#d8b04a' } }]); } }
  if (G.surround === 'beach') { P.push(['ck_ferris', -560, -420, { params: { a: 0 } }], ['ck_icecream', rx - 40, 300, { facing: Math.PI }], ['ck_shark', -rx, 260, {}]); for (let n = 0; n < 12; n++) { const t = n / 12 * TAU + .3; const x = Math.cos(t) * (rx + 120), y = 160 + Math.sin(t) * (ry + 120); if (x > -rx) P.push(['palm', x, y, {}]); } for (let n = 0; n < 9; n++) P.push(['ck_beachhut', -260 + n * 60, 160 - ry - 70, { facing: Math.PI / 2, params: { c: TEAM_SHAPE_COLORS[n % 6] } }]); for (let n = 0; n < 6; n++) P.push(['ck_hut', -200 + n * 80, 160 + ry + 50, { params: { c: TEAM_SHAPE_COLORS[n % 6] } }]); }
  if (G.surround === 'downs') { P.push(['ck_tophat', -rx + 40, 300, {}], ['ck_tower', 520, -470, {}], ['ck_caravan', rx + 60, -60, { facing: Math.PI }]); for (let n = 0; n < 14; n++) { const t = R() * TAU; P.push(['cactus', Math.cos(t) * (rx + 90 + R() * 80), 160 + Math.sin(t) * (ry + 90 + R() * 80), {}]); P.push(['rock', Math.cos(t + 1) * (rx + 70 + R() * 90), 160 + Math.sin(t + 1) * (ry + 70 + R() * 90), { params: { r: 6 + R() * 6, seed: n } }]); } }
  if (G.surround === 'dome') { P.push(['ck_jumbotron', 0, -760, { facing: Math.PI / 2 }], ['ck_bell', 620, -320, {}], ['ck_laser', 600, 380, {}]); }
  if (m && (m.time === 'night' || G.surround === 'dome')) for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(['ck_floodlight', sx * (rx + 90), 160 + sy * (ry + 90), { facing: Math.atan2(-sy, -sx) }]);
  return P;
}
