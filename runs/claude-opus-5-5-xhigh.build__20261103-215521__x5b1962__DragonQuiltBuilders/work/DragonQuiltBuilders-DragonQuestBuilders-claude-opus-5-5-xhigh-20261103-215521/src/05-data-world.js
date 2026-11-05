// Data: the Patchwork Realm around Thimbleton (144 x 144 columns, 24 levels): regions, places, portals, spawns, and the
// stamps and Patterns as ASCII layers (bottom to top; ' ' keeps what is there, '.' is air).
(() => {
const DQ = globalThis.DQ;
const WORLD = DQ.WORLD = { W: 144, D: 144, H: 24, seed: DQ.SEED };
// regions: the first whose test passes names a column (HUD, music, spawns, weather)
WORLD.regions = [
  { id: 'hollow', name: 'Lint Hollow', box: [31, 34, 51, 46], music: 'hollow', day: [], night: [] },
  { id: 'quarry', name: 'Button Quarry', box: [12, 9, 31, 26], music: 'crags', day: [['pinhog', 1]], night: [['pinhog', 1]] },
  { id: 'town', name: 'Thimbleton', town: true, music: 'town', day: [], night: [] },
  { id: 'rift', name: 'The Rift', circle: [96, 80, 5], music: 'fraying', day: [], night: [['frayedKnight', 1]] },
  { id: 'fraying', name: 'The Fraying', box: [101, 94, 141, 141], music: 'fraying', weather: 'ash', day: [['frayedKnight', .75], ['knotbrute', .25]], night: [['frayedKnight', .7], ['knotbrute', .3]], ambient: .55, tint: '#a080c0' },
  { id: 'verge', name: 'Frayed Verge', box: [88, 92, 100, 141], music: 'fraying', day: [], night: [['frayedKnight', 1]] },
  { id: 'crags', name: 'Corduroy Crags', box: [2, 2, 58, 54], music: 'crags', day: [['lintling', .5], ['pinhog', .5]], night: [['lintling', .4], ['pinhog', .6]] },
  { id: 'tweedwood', name: 'Tweedwood', box: [92, 2, 141, 60], music: 'tweedwood', day: [['dyedLintling', 1]], night: [['mothlet', .6], ['dyedLintling', .4]] },
  { id: 'coast', name: 'Calico Coast', box: [2, 100, 62, 141], music: 'glen', day: [['pinhog', 1]], night: [['pinhog', .6], ['mothlet', .4]] },
  { id: 'glen', name: 'Gingham Glen', box: [0, 0, 143, 143], music: 'glen', rain: true, day: [['lintling', .7], ['dyedLintling', .3]], night: [['lintling', .4], ['mothlet', .6]] }
];
// named places: { x, y, L (standing level, filled in by worldgen when null), r (radius in blocks) }
WORLD.poi = {
  hollowStart: { x: 37, y: 39 }, hollowLedge: { x: 35, y: 36, r: 1.2 }, tunnelMark: { x: 45, y: 41 }, hollowExit: { x: 52, y: 41, r: 2 },
  bannerSpot: { x: 72, y: 76, r: 3 }, townSpawn: { x: 72, y: 79 }, eastRoad: { x: 96, y: 76 }, northPath: { x: 72, y: 54 }, riftCenter: { x: 96, y: 80 },
  quarryFloor: { x: 22, y: 18, r: 5 }, quarryRim: { x: 34, y: 20 }, cragLedge: { x: 48, y: 8 }, lintCamp: { x: 116, y: 30, r: 6 }, hollowTree: { x: 134, y: 52 },
  shipwreck: { x: 22, y: 126 }, vergeGate: { x: 97, y: 113 }, knotGate: { x: 99, y: 113 }, spireBase: { x: 124, y: 116 }, spireTop: { x: 124, y: 124, r: 2 },
  hallSite: { x: 79, y: 66 }, coast: { x: 30, y: 118 }, tweedwood: { x: 112, y: 38 }, verge: { x: 94, y: 108 }, glen: { x: 62, y: 60 }
};
WORLD.portals = [
  { id: 'hollow', name: 'Lint Hollow Exit', x: 53, y: 44 },
  { id: 'town', name: 'Thimbleton', x: 70, y: 80 },
  { id: 'quarry', name: 'Button Quarry Rim', x: 35, y: 22 },
  { id: 'tweedwood', name: 'Tweedwood', x: 110, y: 36 },
  { id: 'coast', name: 'Calico Coast', x: 30, y: 116 },
  { id: 'verge', name: 'Frayed Verge', x: 94, y: 110 }
];
WORLD.buttons = [{ id: 'coast', x: 22, y: 126, where: 'Calico Coast' }, { id: 'crags', x: 48, y: 8, where: 'Corduroy Crags' }, { id: 'tweedwood', x: 134, y: 52, where: 'Tweedwood' }];
WORLD.town = { x: 72, y: 76, flat: 13 };

// ---- stamps ----
// legend values: a block key, '.' air, { obj, facing } an object (facing: 0 E, 1 S, 2 W, 3 N quarter turns)
WORLD.stamps = {};
WORLD.stamps.ruins = {   // Thimbleton's old foundations: 1-high outlines hinting at room shapes (a gap for a door)
  legend: { r: 'ruin', c: 'cobble' },
  layers: [[
    'rrrrr.............',
    'r...r.............',
    'r...r......rrrrrr.',
    'r...r......r....r.',
    'rr.rr......r....r.',
    '...........rr.rrr.',
    '..................',
    '..................',
    '..................',
    '..................',
    '.rrrr.............',
    '.r..r.............',
    '.r..r.............',
    '.r..r.............',
    '.r..r.............',
    '.rr.r.............'
  ]]
};
WORLD.stamps.shipwreck = {
  legend: { p: 'planks', l: 'log', b: { obj: 'ancientButton', facing: 1 } },
  layers: [
    ['..pppp..', '.pppppp.', 'pppppppp', 'pppppppp', '.pppppp.', '..pppp..'],
    ['..p..p..', '.p....p.', 'p......p', 'p..b...p', '.p....p.', '..pppp..'],
    ['..p.....', '.p......', 'p.......', '....l...', '.p......', '..pp....'],
    ['........', '........', '........', '....l...', '........', '........'],
    ['........', '........', '........', '....l...', '........', '........']
  ]
};
WORLD.stamps.lintCamp = {
  legend: { k: 'knot', f: 'frayed', c: { obj: 'cage', facing: 1 }, d: { obj: 'deadBush', facing: 0 } },
  layers: [
    ['.k.k.k.k.k.', 'k.........k', '...........', 'k....c....k', '...........', 'k..d...d..k', '.k.k...k.k.'],
    ['.k...k...k.', '...........', 'k.........k', '...........', 'k.........k', '...........', '.k.......k.']
  ]
};

// ---- Patterns (blueprints): ghost layouts the player and helpers fill ----
const ring = (w, d, ch, gap) => { const rows = []; for (let y = 0; y < d; y++) { let s = ''; for (let x = 0; x < w; x++) { const edge = x === 0 || y === 0 || x === w - 1 || y === d - 1; s += edge ? (gap && gap[0] === x && gap[1] === y ? gap[2] : ch) : '.'; } rows.push(s); } return rows; };
const crenel = (w, d, chars) => { const rows = ring(w, d, '#').map(r => r.split('')); let k = 0, i = 0; const path = []; for (let x = 0; x < w; x++) path.push([x, 0]); for (let y = 1; y < d; y++) path.push([w - 1, y]); for (let x = w - 2; x >= 0; x--) path.push([x, d - 1]); for (let y = d - 2; y > 0; y--) path.push([0, y]); for (const [x, y] of path) { rows[y][x] = (i++ % 2 === 0) ? chars[k++ % chars.length] : '.'; } return rows.map(r => r.join('').replace(/#/g, '.')); };
WORLD.patterns = {
  hall: { id: 'hall', name: 'Quilters\' Hall', size: [11, 9],
    legend: { C: 'cobble', P: 'planks', R: 'feltRed', B: 'feltBlue', Y: 'feltYellow', D: { obj: 'plankDoor', facing: 1 }, L: { obj: 'lantern', facing: 1 } },
    layers: [
      ring(11, 9, 'C', [5, 8, 'D']).map((r, y) => y === 1 || y === 7 ? r.slice(0, 1) + 'L' + r.slice(2, 9) + 'L' + r.slice(10) : r),
      ring(11, 9, 'P', [5, 8, '-']),
      ring(11, 9, 'P'),
      crenel(11, 9, 'RBY')
    ] },
  barn1: { id: 'barn1', name: 'Quilt Barn', size: [7, 5], legend: { C: 'cobble', P: 'planks', R: 'feltRed', D: { obj: 'latticeDoor', facing: 1 }, t: { obj: 'torch', facing: 1 } },
    layers: [ring(7, 5, 'C', [3, 4, 'D']).map((r, y) => y === 1 ? r.slice(0, 1) + 't...t' + r.slice(6) : r), ring(7, 5, 'P', [3, 4, '-'])] },
  barn2: { id: 'barn2', name: 'Quilt Barn', size: [7, 5], legend: { C: 'cobble', P: 'planks', R: 'feltRed', D: { obj: 'latticeDoor', facing: 1 }, t: { obj: 'torch', facing: 1 } },
    layers: [ring(7, 5, 'C', [3, 4, 'D']).map((r, y) => y === 1 ? r.slice(0, 1) + 't...t' + r.slice(6) : r), ring(7, 5, 'P', [3, 4, '-']), ring(7, 5, 'P')] },
  barn3: { id: 'barn3', name: 'Quilt Barn', size: [7, 5], legend: { C: 'cobble', P: 'planks', R: 'feltRed', D: { obj: 'latticeDoor', facing: 1 }, t: { obj: 'torch', facing: 1 } },
    layers: [ring(7, 5, 'C', [3, 4, 'D']).map((r, y) => y === 1 ? r.slice(0, 1) + 't...t' + r.slice(6) : r), ring(7, 5, 'P', [3, 4, '-']), ring(7, 5, 'P'), crenel(7, 5, 'R')] }
};

// ---- the demo town (title diorama, attract mode, dev story beats): rooms around the banner, by stage ----
// each room: [x, y] of its south-west... its top-left corner, w, d, wall block, door side, the objects inside [[dx, dy, obj, facing]]
WORLD.demoRooms = [
  { id: 'bedroom', beat: 'lv2', x: 61, y: 66, w: 5, d: 5, wall: 'earth', door: [2, 4], objs: [[1, 1, 'strawBed', 1], [3, 1, 'torch', 1], [1, 3, 'strawBed', 1]] },
  { id: 'workshop', beat: 'lv2', x: 66, y: 80, w: 5, d: 5, wall: 'planks', door: [2, 0], objs: [[1, 2, 'bench', 1], [3, 2, 'chest', 1], [3, 3, 'torch', 1]] },
  { id: 'guardPost', beat: 'lv3', x: 80, y: 74, w: 4, d: 5, wall: 'cobble', door: [0, 2], objs: [[1, 1, 'weaponRack', 1], [2, 3, 'torch', 1], [1, 3, 'torch', 1]] },
  { id: 'messHall', beat: 'lv3', x: 74, y: 82, w: 6, d: 5, wall: 'planks', door: [2, 0], objs: [[2, 2, 'table', 1], [1, 2, 'stool', 1], [3, 2, 'stool', 1], [4, 1, 'torch', 1]] },
  { id: 'kitchen', beat: 'lv4', x: 61, y: 72, w: 5, d: 5, wall: 'cobble', door: [4, 2], objs: [[1, 1, 'hearthPot', 1], [3, 1, 'chest', 1], [1, 3, 'torch', 1]] },
  { id: 'smithy', beat: 'lv4', x: 80, y: 80, w: 5, d: 5, wall: 'cobble', door: [0, 2], objs: [[2, 1, 'forge', 1], [3, 3, 'chest', 1], [1, 3, 'torch', 1]] },
  { id: 'bedroom2', beat: 'lv4', x: 66, y: 66, w: 5, d: 4, wall: 'feltBlue', door: [2, 3], objs: [[1, 1, 'strawBed', 1], [3, 1, 'strawBed', 1], [2, 1, 'torch', 1]] }
];
})();
