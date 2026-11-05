// Art assets: materials, shapes as data (vehicles, structures, props, plants), Humanoid presets for every type and cast
// member, Blob animals, string sprites (pickups, projectiles, HUD icons, emblems).
(() => {
const E = My3D2dge, WP = globalThis.WP;
// ---------------------------------------------------------------------------------------------- materials and patterns
if (E.PATTERNS) E.PATTERNS.spots = (s, m) => (E.noise2(s.u * .35 + 3, s.v * .35) > .64 ? -1 : E.noise2(s.u * .2, s.v * .2 + 9) > .7 ? 1 : 0);
if (E.PATTERNS) E.PATTERNS.stencil = (s, m) => (Math.abs(s.v - 6) < 1.2 && Math.abs((s.u % 10) - 5) < 3 ? 2 : 0);
if (E.MATERIALS) Object.assign(E.MATERIALS, {
  olive: { color: '#5e6a3a', pattern: 'metal' }, oliveDk: { color: '#3e4a2a', pattern: 'metal' }, hyenaTan: { color: '#b89a62', pattern: 'spots' },
  hyenaSteel: { color: '#8a7a5a', pattern: 'metal', over: [['rust', '#6a4a2a', { amount: .3 }]] }, charred: { color: '#2a2622', pattern: 'noise' }, rubber: { color: '#1e1e22', pattern: 'none' },
  glass: { color: '#7ab0c8', pattern: 'glaze' }, redPaint: { color: '#c0302a', pattern: 'metal' }, whitePaint: { color: '#e8e4d8', pattern: 'metal' }, greyPaint: { color: '#7a7e84', pattern: 'metal' },
  canvas: { color: '#8a8a5a', pattern: 'cloth' }, ammoBox: { color: '#4e5a32', pattern: 'stencil' }, tarp: { color: '#6a7a4a', pattern: 'cloth' }, palmTrunk: { color: '#8a6a44', pattern: 'bark' },
  frond: { color: '#3e8a3a', pattern: 'foliage', size: 3 }, mangroveLeaf: { color: '#2e5a2a', pattern: 'foliage', size: 4 }, darkWood: { color: '#5a4028', pattern: 'planks' }, rust: { color: '#7a5034', pattern: 'metal' },
  concrete: { color: '#8a8478', pattern: 'speck' }, corrugated: { color: '#7a8088', pattern: 'planks', dir: 'v', bw: 2 }, thatchRoof: { color: '#b8a060', pattern: 'thatch' }, hullGrey: { color: '#6a7078', pattern: 'metal' }
});
const SH = E.SHAPES || {};
const wheel = (x, y, r = 5, w = 3, m = 'rubber') => ['cyl', m, [x, y, r], r, w, { rot: [0, 90, 0] }];
const wheelX = (x, y, r = 5, w = 3) => ['group', [x, y, r], 0, [['cyl', 'rubber', [-w / 2, 0, 0], r, w, { rot: [0, 90, 0] }], ['cyl', 'steel', [-w / 2 - .5, 0, 0], r * .45, w + 1, { rot: [0, 90, 0] }]]];
Object.assign(SH, {
  // ------------------------------------------------------------------------------------------ vehicles (front toward +y)
  jeep: { about: 'open military jeep, olive', tags: 'vehicle', mats: { b: 'hyenaTan', d: 'oliveDk', t: 'rubber', s: 'steel', g: 'glass' },
    parts: [['box', 'b', [0, 0, 5], [20, 40, 8]], ['box', 'b', [0, 12, 13], [18, 14, 3]], ['box', 'd', [0, -4, 13], [20, 4, 6]], ['box', 's', [0, 6, 13], [18, 1, 8]], ['box', 'g', [0, 6.5, 15], [16, 1, 5]],
      ['box', 'd', [0, -12, 13], [16, 10, 3]], ['cyl', 's', [0, -12, 16], 1.2, 10], ['box', 's', [0, -9, 26], [2, 12, 2]], ['cyl', 't', [0, -21, 10], 4.5, 3, { rot: [90, 0, 0] }],
      wheelX(-10, 13, 5.5, 3), wheelX(10, 13, 5.5, 3), wheelX(-10, -13, 5.5, 3), wheelX(10, -13, 5.5, 3)] },
  truck: { about: 'canvas-backed army truck', tags: 'vehicle', mats: { b: 'hyenaTan', c: 'canvas', d: 'oliveDk', g: 'glass' },
    parts: [['box', 'd', [0, 0, 6], [24, 64, 5]], ['box', 'b', [0, 20, 11], [22, 18, 16]], ['box', 'g', [0, 29, 19], [18, 1, 6]], ['box', 'b', [0, -8, 11], [24, 38, 6]], ['prism', 'c', [0, -8, 17], [[-12, 0], [12, 0], [12, 10], [8, 15], [-8, 15], [-12, 10]], 38, { axis: 'y' }],
      wheelX(-12, 22, 6, 4), wheelX(12, 22, 6, 4), wheelX(-12, -14, 6, 4), wheelX(12, -14, 6, 4), wheelX(-12, -24, 6, 4), wheelX(12, -24, 6, 4)] },
  fuelTruck: { about: 'fuel tanker truck', tags: 'vehicle', mats: { b: 'oliveDk', c: 'redPaint', g: 'glass' },
    parts: [['box', 'b', [0, 0, 6], [24, 60, 5]], ['box', 'b', [0, 20, 11], [22, 16, 16]], ['box', 'g', [0, 28, 19], [18, 1, 6]], ['cyl', 'c', [0, -26, 20], 10, 40, { rot: [90, 0, 0] }], wheelX(-12, 20, 6, 4), wheelX(12, 20, 6, 4), wheelX(-12, -18, 6, 4), wheelX(12, -18, 6, 4)] },
  apc: { about: 'eight-wheeled armored carrier with a turret', tags: 'vehicle', mats: { b: 'hyenaTan', d: 'oliveDk', s: 'steel' },
    parts: [['box', 'b', [0, 0, 7], [26, 56, 14]], ['wedge', 'b', [0, 30, 7], [26, 8, 14], { rot: 180 }], ['box', 'd', [0, -2, 21], [22, 40, 3]], ['cyl', 'b', [0, 2, 24], 7, 6], ['cyl', 's', [0, 12, 27], 1.4, 16, { rot: [90, 0, 0] }],
      wheelX(-13, 20, 6, 4), wheelX(13, 20, 6, 4), wheelX(-13, 7, 6, 4), wheelX(13, 7, 6, 4), wheelX(-13, -7, 6, 4), wheelX(13, -7, 6, 4), wheelX(-13, -20, 6, 4), wheelX(13, -20, 6, 4)] },
  tank: { about: 'main battle tank, tan camouflage', tags: 'vehicle', mats: { b: 'hyenaTan', d: 'oliveDk', s: 'steel', t: 'rubber' },
    parts: [['box', 't', [-13, 0, 0], [8, 62, 10]], ['box', 't', [13, 0, 0], [8, 62, 10]], ['box', 'b', [0, 0, 8], [26, 58, 9]], ['wedge', 'b', [0, 30, 8], [26, 6, 9], { rot: 180 }], ['cyl', 'b', [0, -4, 17], 12, 8, { r2: 10 }], ['cyl', 's', [0, 22, 21], 1.8, 30, { rot: [90, 0, 0] }], ['cyl', 'd', [4, -6, 25], 3, 3]] },
  skiff: { about: 'small motor skiff', tags: 'boat', mats: { h: 'darkWood', m: 'oliveDk' },
    parts: [['prism', 'h', [0, 0, 0], [[-8, -18], [8, -18], [8, 10], [0, 20], [-8, 10]], 6], ['box', 'm', [0, -20, 3], [5, 4, 8]], ['box', 'h', [0, 0, 6], [14, 3, 1.5]]] },
  skiffWreck: { about: 'half-sunk wrecked boat', tags: 'boat', mats: { h: 'charred' }, parts: [['prism', 'h', [0, 0, -2], [[-8, -18], [8, -18], [8, 10], [0, 20], [-8, 10]], 5, { rot: [8, 0, 0] }]] },
  gunboat: { about: 'river patrol boat with a cabin and a gun turret', tags: 'boat', mats: { h: 'hullGrey', c: 'hyenaTan', s: 'steel', g: 'glass' },
    parts: [['prism', 'h', [0, 0, 0], [[-12, -32], [12, -32], [12, 20], [0, 36], [-12, 20]], 10], ['box', 'c', [0, -8, 10], [16, 22, 12]], ['box', 'g', [0, 3, 16], [14, 1, 4]], ['cyl', 's', [0, 18, 10], 5, 5], ['cyl', 's', [0, 24, 13], 1, 12, { rot: [90, 0, 0] }]] },
  crocodile: { about: 'big armored gunboat with two turrets and a bridge', tags: 'boat', mats: { h: 'hullGrey', c: 'hyenaSteel', s: 'steel', g: 'glass', r: 'redPaint' },
    parts: [['prism', 'h', [0, 0, 0], [[-18, -56], [18, -56], [18, 36], [0, 60], [-18, 36]], 18], ['box', 'r', [0, 0, 1], [37, 112, 2]], ['box', 'c', [0, 4, 18], [24, 34, 18]], ['box', 'g', [0, 21, 30], [20, 1, 4]], ['box', 'c', [0, 4, 36], [16, 14, 8]],
      ['cyl', 's', [0, 34, 18], 8, 8], ['cyl', 's', [0, -38, 18], 8, 8], ['cyl', 's', [0, 44, 23], 1.4, 18, { rot: [90, 0, 0] }], ['cyl', 's', [0, -48, 23], 1.4, 18, { rot: [-90, 0, 0] }]] },
  heli: { about: 'attack helicopter with rocket pods (rotor drawn apart)', tags: 'aircraft', mats: { b: 'hyenaTan', d: 'oliveDk', g: 'glass', s: 'steel' },
    parts: [['ball', 'b', [0, 6, 14], 11, { sz: .8 }], ['ball', 'g', [0, 14, 16], 7, { sz: .7 }], ['cyl', 'b', [0, -10, 14], 4, 34, { r2: 2, rot: [-90, 0, 0] }], ['box', 'd', [0, -42, 14], [2, 8, 12]], ['box', 's', [0, 4, 24], [3, 3, 4]],
      ['box', 'd', [-9, 4, 1], [2, 26, 2]], ['box', 'd', [9, 4, 1], [2, 26, 2]], ['box', 's', [-14, 4, 10], [12, 3, 2]], ['box', 's', [14, 4, 10], [12, 3, 2]], ['cyl', 'd', [-19, 0, 9], 3, 12, { rot: [-90, 0, 0] }], ['cyl', 'd', [19, 0, 9], 3, 12, { rot: [-90, 0, 0] }]] },
  hyenaOne: { about: 'the general\'s big gunship, gold trim, open door', tags: 'aircraft', mats: { b: 'hyenaSteel', d: 'oliveDk', g: 'glass', s: 'steel', y: 'gold' },
    parts: [['ball', 'b', [0, 8, 18], 16, { sz: .75 }], ['ball', 'g', [0, 20, 20], 9, { sz: .65 }], ['box', 'd', [12, 6, 16], [2, 12, 12]], ['cyl', 'b', [0, -14, 18], 5, 46, { r2: 3, rot: [-90, 0, 0] }], ['box', 'y', [0, -56, 18], [2, 10, 16]], ['box', 'y', [0, 8, 6], [33, 4, 1.5]],
      ['box', 's', [0, 6, 33], [4, 4, 5]], ['box', 'd', [-12, 4, 0], [2, 32, 2]], ['box', 'd', [12, 4, 0], [2, 32, 2]], ['cyl', 's', [0, 28, 12], 2, 16, { rot: [-90, 0, 0] }],
      ['box', 's', [-20, 0, 12], [16, 4, 2]], ['box', 's', [20, 0, 12], [16, 4, 2]], ['cyl', 'd', [-26, -4, 10], 4.5, 14, { rot: [-90, 0, 0] }], ['cyl', 'd', [26, -4, 10], 4.5, 14, { rot: [-90, 0, 0] }]] },
  cargoPlane: { about: 'OLD HOWLER, twin-prop cargo plane', tags: 'aircraft', mats: { b: 'greyPaint', w: 'whitePaint', d: 'oliveDk', g: 'glass' },
    parts: [['cyl', 'b', [0, -60, 14], 13, 130, { rot: [-90, 0, 0] }], ['ball', 'b', [0, 70, 14], 13, { sz: .9 }], ['box', 'g', [0, 74, 20], [14, 6, 4]], ['box', 'w', [0, 10, 24], [180, 26, 3]], ['cyl', 'd', [-36, 26, 20], 6, 30, { rot: [-90, 0, 0] }], ['cyl', 'd', [36, 26, 20], 6, 30, { rot: [-90, 0, 0] }],
      ['box', 'w', [0, -58, 22], [60, 14, 3]], ['box', 'b', [0, -60, 22], [3, 16, 28]], ['box', 'd', [0, 0, 6], [10, 4, 3]]] },
  propPlane: { about: 'small parked propeller plane', tags: 'aircraft', mats: { b: 'whitePaint', r: 'redPaint', g: 'glass' },
    parts: [['cyl', 'b', [0, -20, 10], 5, 46, { r2: 3, rot: [-90, 0, 0] }], ['box', 'r', [0, 6, 12], [60, 10, 2]], ['box', 'g', [0, 14, 15], [8, 5, 3]], ['box', 'r', [0, -26, 12], [20, 6, 2]], ['box', 'b', [0, -26, 14], [2, 6, 10]], ['cyl', 'r', [0, 26, 10], 2, 4, { rot: [-90, 0, 0] }], wheelX(-6, 8, 3, 2), wheelX(6, 8, 3, 2)] },
  bigEar: { about: 'six-wheeled signal truck with a dish mount and rocket pod', tags: 'vehicle boss', mats: { b: 'hyenaTan', d: 'oliveDk', s: 'steel', g: 'glass', r: 'redPaint' },
    parts: [['box', 'd', [0, 0, 7], [28, 84, 6]], ['box', 'b', [0, 30, 13], [26, 22, 18]], ['box', 'g', [0, 41, 22], [22, 1, 7]], ['box', 'b', [0, -12, 13], [28, 56, 22]], ['box', 'r', [0, -12, 35], [28, 4, 2]], ['cyl', 's', [0, -14, 35], 3, 12], ['box', 'd', [0, -34, 35], [16, 12, 8]],
      wheelX(-14, 28, 7, 5), wheelX(14, 28, 7, 5), wheelX(-14, -8, 7, 5), wheelX(14, -8, 7, 5), wheelX(-14, -26, 7, 5), wheelX(14, -26, 7, 5)] },
  halftrack: { about: 'WARTHOG, a flamethrower half-track', tags: 'vehicle boss', mats: { b: 'hyenaSteel', d: 'oliveDk', s: 'steel', t: 'rubber' },
    parts: [['box', 't', [-13, -14, 0], [8, 44, 12]], ['box', 't', [13, -14, 0], [8, 44, 12]], wheelX(-13, 26, 7, 5), wheelX(13, 26, 7, 5), ['box', 'b', [0, 0, 9], [28, 72, 16]], ['wedge', 'b', [0, 36, 9], [28, 8, 16], { rot: 180 }],
      ['box', 'd', [0, 4, 25], [22, 30, 8]], ['cyl', 'b', [0, 30, 26], 6, 6], ['cyl', 's', [0, 36, 30], 2, 22, { rot: [90, 0, 0] }], ['cyl', 's', [0, -30, 22], 2, 10, { rot: [-90, 0, 0] }]] },
  locomotive: { about: 'IRON HOG\'s armored locomotive', tags: 'train boss', mats: { b: 'hyenaSteel', d: 'charred', s: 'steel', r: 'redPaint' },
    parts: [['box', 'd', [0, 0, 4], [22, 64, 6]], ['cyl', 'b', [0, 8, 22], 11, 44, { rot: [90, 0, 0] }], ['box', 'b', [0, -22, 10], [24, 20, 30]], ['cyl', 'd', [0, 22, 30], 4, 12], ['wedge', 'r', [0, 33, 4], [24, 8, 10]],
      wheelX(-11, 20, 6, 3), wheelX(11, 20, 6, 3), wheelX(-11, 4, 6, 3), wheelX(11, 4, 6, 3), wheelX(-11, -14, 6, 3), wheelX(11, -14, 6, 3)] },
  trainCar: { about: 'armored train car', tags: 'train', mats: { b: 'hyenaSteel', d: 'charred' },
    parts: [['box', 'd', [0, 0, 4], [22, 54, 5]], ['box', 'b', [0, 0, 9], [24, 50, 20]], ['box', 'd', [0, 0, 29], [20, 46, 3]], wheelX(-11, 18, 5, 3), wheelX(11, 18, 5, 3), wheelX(-11, -18, 5, 3), wheelX(11, -18, 5, 3)] },
  ammoWagon: { about: 'wooden ammunition wagon, stenciled', tags: 'train', mats: { b: 'darkWood', a: 'ammoBox', d: 'charred' },
    parts: [['box', 'd', [0, 0, 3], [20, 48, 5]], ['box', 'b', [0, 0, 8], [22, 44, 18]], ['box', 'a', [0, 0, 26], [16, 30, 6]], wheelX(-10, 16, 5, 3), wheelX(10, 16, 5, 3), wheelX(-10, -16, 5, 3), wheelX(10, -16, 5, 3)] },
  flatcar: { about: 'empty rail flatcar', tags: 'train', mats: { b: 'rust', d: 'charred' }, parts: [['box', 'b', [0, 0, 5], [20, 48, 4]], wheelX(-10, 16, 4, 2), wheelX(10, 16, 4, 2), wheelX(-10, -16, 4, 2), wheelX(10, -16, 4, 2)] },
  forklift: { about: 'yellow forklift carrying a crate', tags: 'vehicle', mats: { b: 'gold', d: 'charred', c: 'ammoBox' },
    parts: [['box', 'b', [0, -2, 4], [16, 22, 12]], ['box', 'd', [0, -2, 16], [14, 12, 1]], ['box', 'd', [-6, -6, 16], [1, 1, 12]], ['box', 'd', [6, -6, 16], [1, 1, 12]], ['box', 'd', [0, 10, 0], [14, 2, 26]], ['box', 'c', [0, 16, 3], [14, 12, 12]], wheelX(-8, 4, 4, 3), wheelX(8, 4, 4, 3), wheelX(-8, -10, 4, 3), wheelX(8, -10, 4, 3)] },
  // ------------------------------------------------------------------------------------------ props
  redBarrel: { about: 'red fuel barrel with bands', tags: 'container', mats: { r: 'redPaint', h: 'steel' }, parts: [['lathe', 'r', [0, 0, 0], [[0, 0], [6, 0], [6, 18], [0, 18]]], ['row', 3, [0, 0, 6], ['cyl', 'h', [0, 0, 2.5], 6.3, 1]]] },
  ammoCrate: { about: 'olive ammunition crate, stenciled', tags: 'container military', mats: { a: 'ammoBox', h: 'steel' }, parts: [['box', 'a', [0, 0, 0], [20, 14, 14]], ['box', 'h', [-6, 0, 14], [4, 4, 1]], ['box', 'h', [6, 0, 14], [4, 4, 1]]] },
  fuelTank: { about: 'big horizontal fuel tank on legs', tags: 'industrial', mats: { t: 'redPaint', l: 'steel', w: 'whitePaint' }, parts: [['mirror', 'xy', ['box', 'l', [16, 6, 0], [2, 2, 10]]], ['cyl', 't', [-22, 0, 20], 12, 44, { rot: [0, 90, 0] }], ['cyl', 'w', [-8, 0, 20], 12.3, 3, { rot: [0, 90, 0] }]] },
  sandbags: { about: 'row of stacked burlap sandbags', tags: 'military', mats: { s: 'burlap' }, params: { len: 44 }, make: p => { const n = Math.max(2, Math.round(p.len / 9)); return [['row', n, [9, 0, 0], ['ball', 's', [0, 0, 3.5], 5.5, { sz: .6 }]], ['row', n - 1, [9, 0, 0], ['ball', 's', [0, 0, 9], 5.5, { sz: .6 }]], ['row', n - 1, [9, 0, 0], ['ball', 's', [0, 0, 14], 5, { sz: .55 }]]]; } },
  searchlight: { about: 'searchlight on a pivot', tags: 'military', mats: { s: 'steel', g: 'glass' }, parts: [['cyl', 's', [0, 0, 0], 2, 4], ['cyl', 's', [0, -2, 6], 5, 8, { rot: [80, 0, 0] }], ['cyl', 'g', [0, 5, 7], 4.5, 1, { rot: [80, 0, 0] }]] },
  wireFence: { about: 'barbed wire fence: posts and strands', tags: 'military', mats: { p: 'darkWood', w: 'iron' }, parts: [['box', 'p', [-32, 0, 0], [2, 2, 22]], ['box', 'p', [32, 0, 0], [2, 2, 22]], ['box', 'w', [0, 0, 8], [64, .5, .5]], ['box', 'w', [0, 0, 14], [64, .5, .5]], ['box', 'w', [0, 0, 20], [64, .5, .5]]] },
  tent: { about: 'army ridge tent', tags: 'camp', mats: { c: 'tarp', p: 'darkWood' }, parts: [['prism', 'c', [0, 0, 0], [[-16, 0], [16, 0], [0, 20]], 36, { axis: 'y' }], ['box', 'p', [0, 18, 0], [1, 1, 20]]] },
  radarHut: { about: 'concrete radar hut', tags: 'military', mats: { c: 'concrete', d: 'oliveDk' }, parts: [['box', 'c', [0, 0, 0], [60, 40, 34]], ['box', 'd', [0, 0, 34], [64, 44, 3]], ['box', 'd', [12, 20, 0], [12, 1, 22]]] },
  floodlight: { about: 'floodlight pole', tags: 'industrial', mats: { s: 'steel', g: 'glass' }, parts: [['cyl', 's', [0, 0, 0], 1.5, 60], ['box', 's', [0, 0, 60], [16, 3, 2]], ['box', 'g', [-5, 2, 56], [5, 2, 5]], ['box', 'g', [5, 2, 56], [5, 2, 5]]], lights: [[0, 4, 58, '#ffe8b0', 50]] },
  watchtower: { about: 'wooden watchtower with a cabin', tags: 'military', mats: { w: 'darkWood', r: 'corrugated' }, parts: [['mirror', 'xy', ['box', 'w', [10, 10, 0], [3, 3, 64], { rot: [4, -4, 0] }]], ['box', 'w', [0, 0, 62], [26, 26, 3]], ['box', 'w', [0, 0, 65], [26, 26, 10]], ['wedge', 'r', [0, 0, 82], [30, 30, 8]], ['mirror', 'xy', ['box', 'w', [12, 12, 75], [2, 2, 8]]]] },
  barracks: { about: 'long wooden barracks hut', tags: 'military', mats: { w: 'darkWood', r: 'corrugated' }, parts: [['box', 'w', [0, 0, 0], [40, 110, 28]], ['prism', 'r', [0, 0, 28], [[-22, 0], [22, 0], [0, 12]], 114, { axis: 'y' }]] },
  shed: { about: 'metal shed', tags: 'industrial', mats: { m: 'corrugated', r: 'rust' }, parts: [['box', 'm', [0, 0, 0], [70, 50, 40]], ['wedge', 'r', [0, 0, 40], [74, 54, 8]]] },
  crateStack: { about: 'stacked ammunition crates', tags: 'military', mats: { a: 'ammoBox', c: 'crate' }, parts: [['box', 'a', [-10, 0, 0], [20, 14, 14]], ['box', 'a', [10, 2, 0], [20, 14, 14]], ['box', 'c', [0, 0, 14], [18, 14, 14]]] },
  crane: { about: 'tall lattice crane', tags: 'industrial', mats: { y: 'gold', s: 'steel' }, parts: [['box', 'y', [0, 0, 0], [8, 8, 90]], ['box', 'y', [20, 0, 88], [60, 4, 4]], ['box', 's', [46, 0, 50], [1, 1, 38]], ['box', 's', [46, 0, 46], [8, 8, 6]]] },
  fireDrum: { about: 'burning oil drum', tags: 'camp', mats: { r: 'rust' }, parts: [['lathe', 'r', [0, 0, 0], [[0, 0], [6, 0], [6, 16], [0, 16]]]], flames: [[0, 0, 16, 8, 12]], lights: [[0, 0, 22, '#ff9040', 60]] },
  runwayLight: { about: 'runway edge light', tags: 'airfield', mats: { s: 'steel', g: 'gold' }, parts: [['cyl', 's', [0, 0, 0], 1, 4], ['ball', 'g', [0, 0, 5], 1.5]] },
  stiltHut: { about: 'thatched hut on stilts', tags: 'jungle', mats: { w: 'darkWood', t: 'thatchRoof' }, parts: [['mirror', 'xy', ['box', 'w', [14, 14, 0], [2, 2, 16]]], ['box', 'w', [0, 0, 14], [36, 36, 2]], ['box', 'w', [0, 0, 16], [32, 32, 18]], ['prism', 't', [0, 0, 34], [[-22, 0], [22, 0], [0, 16]], 40, { axis: 'y' }]] },
  dock: { about: 'wooden dock on posts', tags: 'jungle', mats: { w: 'planks', p: 'darkWood' }, parts: [['box', 'w', [0, 0, 6], [24, 60, 2]], ['mirror', 'xy', ['box', 'p', [10, 26, 0], [2, 2, 8]]]] },
  marketStall: { about: 'market stall with a striped awning', tags: 'village', mats: { w: 'darkWood', c: 'redPaint', f: 'gold' }, parts: [['box', 'w', [0, 0, 0], [40, 18, 14]], ['mirror', 'x', ['box', 'w', [19, 8, 0], [2, 2, 30]]], ['wedge', 'c', [0, 2, 26], [44, 24, 6]], ['row', 4, [9, 0, 0], ['ball', 'f', [0, 2, 16], 3]]] },
  fishBoat: { about: 'fishing boat on the water', tags: 'sea', mats: { h: 'whitePaint', r: 'redPaint', s: 'linen' }, parts: [['prism', 'h', [0, 0, 0], [[-10, -26], [10, -26], [10, 14], [0, 28], [-10, 14]], 8], ['box', 'r', [0, 0, 8], [21, 54, 1]], ['box', 'h', [0, -4, 8], [1, 1, 40]], ['prism', 's', [0, -4, 14], [[0, 0], [0, 26], [20, 4]], 1, { axis: 'y' }]] },
  palm: { about: 'leaning palm tree', tags: 'plant', mats: { t: 'palmTrunk', f: 'frond', c: 'darkWood' },
    parts: [['cyl', 't', [0, 0, 0], 3, 16, { r2: 2.7, rot: [0, 6, 0] }], ['cyl', 't', [1.7, 0, 15.5], 2.7, 16, { r2: 2.4, rot: [0, 10, 0] }], ['cyl', 't', [4.5, 0, 31], 2.4, 16, { r2: 2, rot: [0, 14, 0] }],
      ['ring', 7, 0, ['group', [8.5, 0, 46], 0, [['prism', 'f', [8, 0, -3], [[-9, -2], [9, -5], [9, 1], [-9, 3]], 1, { axis: 'y', rot: [0, 18, 0] }]]]], ['ball', 'c', [8.5, 0, 45], 3]] },
  mangrove: { about: 'mangrove tree on arching roots', tags: 'plant', mats: { r: 'bark', l: 'mangroveLeaf' },
    parts: [['ring', 5, 7, ['cyl', 'r', [0, 0, 0], 1.6, 12, { r2: 1, rot: [0, -30, 0] }]], ['cyl', 'r', [0, 0, 8], 4, 26, { r2: 3 }], ['ball', 'l', [0, 0, 40], 18, { sz: .6 }], ['ball', 'l', [10, 6, 34], 11, { sz: .6 }], ['ball', 'l', [-10, -5, 36], 12, { sz: .6 }]] },
  fern: { about: 'big jungle fern', tags: 'plant', mats: { f: 'frond' }, parts: [['ring', 6, 0, ['prism', 'f', [6, 0, 0], [[-7, -1], [7, -2], [8, 1], [-7, 2]], 1, { axis: 'y', rot: [0, -32, 0] }]]] }
});
E.SHAPES = SH;
// ---------------------------------------------------------------------------------------------- Humanoid presets
const HYENA = { cloth: '#b89a62', coat: '#9a7e4a', pants: '#7a6440', boot: '#3a2e22', belt: '#4a3a24', trim: '#b8302a', glove: '#5a4a32', metal: '#4a4a4e', skin: '#c89a74', hair: '#3a2a1e' };
const sk = ['#e8c09a', '#c89a74', '#9a6a48', '#6e4a32'];
WP.RIGS = {
  rifleman: { size: 1.3, weapon: 'gun', outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#6a5a34' }, sleeves: 'long', colors: HYENA },
  grenadier: { size: 1.3, weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'helmet', color: '#5a5a3a' }, sleeves: 'long', colors: Object.assign({}, HYENA, { skin: sk[2] }) },
  knife: { size: 1.25, weapon: null, outfit: 'shirt', hair: 'spiky', hat: { style: 'band', color: '#b8302a' }, sleeves: 'none', colors: Object.assign({}, HYENA, { skin: sk[0], cloth: '#8a7a52' }) },
  brute: { size: 1.55, build: 'bulky', weapon: 'gun', outfit: 'shirt', hair: 'spiky', sleeves: 'none', colors: Object.assign({}, HYENA, { hair: '#e8d070', skin: '#d8a888', cloth: '#7a6a42' }) },
  rpg: { size: 1.3, weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#4a3a24' }, sleeves: 'long', colors: Object.assign({}, HYENA, { skin: sk[3] }) },
  sniper: { size: 1.3, weapon: 'gun', outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#3a4a2a' }, sleeves: 'long', colors: Object.assign({}, HYENA, { coat: '#5a6a3a' }) },
  mortar: { size: 1.2, weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'helmet', color: '#5a5a3a' }, sleeves: 'long', colors: HYENA },
  officer: { size: 1.35, weapon: 'gun', outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#3a2a1a' }, sleeves: 'long', colors: Object.assign({}, HYENA, { coat: '#6a4a2a', trim: '#e0b040' }) },
  para: { size: 1.3, weapon: 'gun', outfit: 'shirt', hair: 'short', hat: { style: 'helmet', color: '#4a4a32' }, sleeves: 'long', colors: Object.assign({}, HYENA, { skin: sk[2] }) },
  villager: { size: 1.25, weapon: null, outfit: 'tunic', hair: 'short', hat: { style: 'pointed', color: '#d8c080' }, sleeves: 'short', colors: { cloth: '#e8e0c8', pants: '#5a7a9a', skin: sk[2], hair: '#2a1a12', boot: '#5a3a22', belt: '#8a5a32', trim: '#c05a3a' } },
  villager2: { size: 1.2, weapon: null, outfit: 'robe', hair: 'long', sleeves: 'short', colors: { cloth: '#d86a4a', coat: '#d86a4a', pants: '#d86a4a', skin: sk[3], hair: '#1a120e', boot: '#4a3020', trim: '#f0d060' } },
  medic: { size: 1.3, weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { cloth: '#f0f0ec', coat: '#f0f0ec', pants: '#e0e0dc', skin: sk[1], hair: '#4a3020', boot: '#3a3a3a', trim: '#2a9a4a' } },
  reporter: { size: 1.3, weapon: null, outfit: 'shirt', hair: 'long', sleeves: 'short', colors: { cloth: '#5a7aa8', coat: '#9a8a5a', pants: '#3a3a4a', skin: sk[0], hair: '#8a4a22', boot: '#3a2a20' } },
  h0: { size: 1.25, weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { cloth: '#e8e8e4', coat: '#f0f0ee', pants: '#3a4a6a', skin: sk[3], hair: '#1a1210', boot: '#2a2a2a' } },
  h1: { size: 1.25, weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'short', colors: { cloth: '#7a9ab8', pants: '#5a4a3a', skin: sk[0], hair: '#8a6a3a', boot: '#3a2a20' } },
  h2: { size: 1.25, weapon: null, outfit: 'shirt', hair: 'long', sleeves: 'short', colors: { cloth: '#5a7aa8', coat: '#9a8a5a', pants: '#3a3a4a', skin: sk[0], hair: '#8a4a22', boot: '#3a2a20' } },
  h3: { size: 1.25, weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { cloth: '#6a4a2a', coat: '#7a5030', pants: '#3a3a3a', skin: sk[1], hair: '#141010', boot: '#2a2018' } },
  h4: { size: 1.3, weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { cloth: '#e8e4d8', coat: '#3a3a44', pants: '#3a3a44', skin: sk[0], hair: '#c0c0c0', boot: '#141414', trim: '#8a2a2a' } },
  lobo: { size: 1.3, weapon: 'gun', outfit: 'shirt', hair: 'short', hat: { style: 'band', color: '#d02a2a' }, sleeves: 'none', colors: { metal: '#3a3e44', cloth: '#4a5a3a', pants: '#3a4a2e', skin: sk[1], hair: '#141414', boot: '#2a2018', belt: '#3a2a1a' } },
  fang: { size: 1.3, weapon: 'gun', outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#2a3a5a' }, sleeves: 'short', colors: { metal: '#3a3e44', cloth: '#5a6a4a', pants: '#3a4a2e', skin: sk[2], hair: '#3a2a1a', boot: '#2a2018' } },
  tundra: { size: 1.3, weapon: 'gun', outfit: 'shirt', hair: 'ponytail', hat: { style: 'cap', color: '#3a6a3a' }, sleeves: 'long', colors: { metal: '#3a3e44', cloth: '#6a7a6a', pants: '#3a4a3e', skin: sk[0], hair: '#f0f0f0', boot: '#2a2018' } },
  moonshine: { size: 1.3, weapon: 'gun', outfit: 'shirt', hair: 'spiky', hat: { style: 'band', color: '#e0c030' }, sleeves: 'none', colors: { metal: '#3a3e44', cloth: '#5a5a3a', pants: '#3a3a2e', skin: sk[3], hair: '#1a1a1a', boot: '#2a2018' } },
  den: { size: 1.3, weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#3a6a3a' }, sleeves: 'long', colors: { cloth: '#5a6a4a', coat: '#4a5a3a', pants: '#3a4a2e', skin: sk[0], hair: '#a0a0a0', boot: '#2a2018', trim: '#e0b040' } },
  kragg: { size: 1.5, build: 'bulky', weapon: 'gun', outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#2a1a12' }, sleeves: 'long', colors: { cloth: '#6a4a2a', coat: '#4a3a24', pants: '#3a2a1a', skin: sk[0], hair: '#2a1a12', boot: '#141010', trim: '#e0b040', belt: '#e0b040' } },
  tusk: { size: 1.6, build: 'bulky', weapon: 'gun', outfit: 'shirt', hair: 'bald', hat: { style: 'helmet', color: '#3a3a32' }, sleeves: 'long', armor: true, colors: Object.assign({}, HYENA, { plate: '#5a5a52', skin: sk[1] }) },
  giggs: { size: 1.2, weapon: null, outfit: 'shirt', hair: 'spiky', sleeves: 'long', colors: Object.assign({}, HYENA, { hair: '#c08a3a', skin: sk[0] }) }
};
WP.rigNew = name => { const R = WP.RIGS[name] || WP.RIGS.rifleman; const r = new E.Humanoid(Object.assign({}, R, { colors: Object.assign({}, R.colors) })); r.preset = name; return r; };
// ---------------------------------------------------------------------------------------------- Blobs (animals)
WP.BLOBS = {
  goat: { R: 7, colors: { dk: '#8a8478', base: '#d8d2c4', lt: '#f4f0e8', eye: '#141414' }, horns: true, feet: true, tail: true, ears: 'cat' },
  chicken: { R: 4, colors: { dk: '#c8c0b0', base: '#f4f0e8', lt: '#ffffff', eye: '#141414' }, wings: true, feet: true },
  pig: { R: 6.5, colors: { dk: '#c07a7a', base: '#f0a8a8', lt: '#ffd0d0', eye: '#141414' }, ears: 'cat', tail: true, feet: true },
  parrot: { R: 4, colors: { dk: '#1a7a2a', base: '#2ac03a', lt: '#e04030', eye: '#141414' }, wings: true },
  monkey: { R: 5.5, colors: { dk: '#4a3020', base: '#7a5034', lt: '#c8a07a', eye: '#141414' }, ears: 'cat', tail: true, feet: true },
  seagull: { R: 4, colors: { dk: '#9aa0a8', base: '#f0f0f0', lt: '#ffffff', eye: '#141414' }, wings: true }
};
WP.blobNew = name => new E.Blob(Object.assign({ mouth: false }, WP.BLOBS[name] || WP.BLOBS.goat));
// ---------------------------------------------------------------------------------------------- string sprites
const S = (rows, map) => E.sprite(rows, map);
const C = { k: '#141414', o: '#4e5a32', O: '#7a8a4a', y: '#e0b040', Y: '#fff0a0', r: '#c0302a', R: '#ff6a4a', w: '#f0ece0', W: '#ffffff', g: '#2aa04a', G: '#7ae07a', b: '#8a6a44', B: '#c09a6a', s: '#8a8a90', S: '#d0d0d8', t: '#c8a070', n: '#5a3a22', p: '#e8c09a', d: '#3a3a3a', c: '#5ac8f0' };
WP.SPR = {
  mag: S(['..kkkk..', '..kOOk..', '..kook..', '..kOOk..', '.kkook..', '.kOOok..', '.koook..', 'kkookk..', 'kooOk...', 'kookk...', 'kkkk....'], C),
  ammo: S(['kkkkkkkkkk', 'kOOOOOOOOk', 'koyyoyyook', 'koOOOOOOok', 'koyoyoyook', 'kOOOOOOOOk', 'kooooooook', 'kkkkkkkkkk'], C),
  grenade: S(['..kk..', '.kssk.', 'kOOOOk', 'kOoOok', 'kOOOOk', 'kooOok', '.kook.', '..kk..'], C),
  gbox: S(['kkkkkkkkkk', 'kbBbBbBbBk', 'kOk.Ok.Okk', 'kook.ook.k', 'kbbbbbbbbk', 'kkkkkkkkkk'], C),
  ration: S(['.kkkkkk.', 'kssssssk', 'kSSSSSSk', 'kryyyyrk', 'kryyyyrk', 'kSSSSSSk', 'kssssssk', '.kkkkkk.'], C),
  medkit: S(['..kkkk....', 'kkkkkkkkkk', 'kwwwggwwwk', 'kwwwggwwwk', 'kwggggggwk', 'kwwwggwwwk', 'kwwwggwwwk', 'kkkkkkkkkk'], C),
  fury: S(['......kk..', 'kkkkkkYYk.', 'kYYYYYyyyk', 'kyyyyyykkk', '.kkkyyk...', '...kyyk...', '...kkk....'], C),
  dynamite: S(['..y...y..', '..k...k..', '.krkrkrk.', '.krRkrRk.', '.krRkrRk.', '.krkrkrk.', '.kkkkkkk.'], C),
  flare: S(['..YY..', '..yy..', '.krrk.', '.kRrk.', '.krrk.', '.krrk.', '.kkkk.'], C),
  intel: S(['kkkkk.....', 'kyyyykkkkk', 'kyyyyyyyyk', 'kywwwwwwyk', 'kyyyyyyyyk', 'kywwwwyyyk', 'kyyyyyyyyk', 'kkkkkkkkkk'], C),
  fang: S(['kkkkk', 'kWWWk', 'kWWWk', '.kWk.', '.kWk.', '..k..'], C),
  knife: S(['kk.....', 'nnkkkkk', 'nnSSSSW', 'kkkkkk.'], C),
  rocket: S(['..kkkkk.', 'RykOOOOk', 'YykOOOOrk', 'RykOOOOk', '..kkkkk.'], C),
  missile: S(['.kkkkkk..', 'RkSSSSSkk', 'YkSSSSSSr', 'RkSSSSSkk', '.kkkkkk..'], C),
  shell: S(['.kk.', 'kssk', 'kSsk', 'kssk', 'kssk', 'kOOk', '.kk.'], C),
  tshell: S(['.kkk.', 'kYyYk', 'kyRyk', 'kYyYk', '.kkk.'], C),
  casing: S(['yy'], C),
  chute: S(['....kkkkkk....', '..kkwwwwwwkk..', '.kwwwrrrrwwwk.', 'kwwrrrrrrrrwwk', 'kkkkkkkkkkkkkk', '.k....kk....k.', '..k...kk...k..', '...k..kk..k...'], C),
  icoSoldier: S(['..kk..', '.kttk.', '..kk..', '.kttk.', 'kttttk', '.k..k.', '.k..k.'], C),
  icoJeep: S(['...kkk..', '..ktttk.', 'kkttttkk', 'kttttttk', '.kk..kk.'], C),
  icoHeli: S(['kkkkkkkk', '...kk...', '.ktttk..', 'kttttkkk', '.kkkk...'], C),
  icoBoat: S(['...k....', '...kk...', '...kkk..', 'kkkkkkkk', '.kttttk.'], C),
  icoMast: S(['..kk..', '..rk..', '.k..k.', '.kkkk.', '.k..k.', 'k.kk.k', 'kk..kk'], C),
  icoMag: S(['kk', 'Ok', 'ok', 'Ok', 'ok'], C),
  icoMagHalf: S(['kk', 'kk', 'ok', 'Ok', 'ok'], C),
  icoBullet: S(['y', 'Y'], C),
  icoBulletE: S(['d', 'd'], C),
  icoGren: S(['.k.', 'kOk', 'kok', '.k.'], C),
  icoHostage: S(['.kk.', 'kppk', '.kk.', 'kwwk', 'kwwk'], C),
  wolf: S(['k..........k....', 'kk........kk....', 'kSk......kSk....', 'kSSkkkkkkSSk....', 'kSSSSSSSSSSk....', 'kSkkSSSSkkSk....', 'kSkYkSSkYkSk....', 'kSSSSSSSSSSk....', '.kSSSSSSSSk.....', '..kSSkkSSk......', '...kSddSk.......', '....kSSk........', '.....kk.........'].map(r => r.slice(0, 12)), C),
  hyena: S(['k.k....k.k', 'kbk....kbk', 'kbbkkkkbbk', 'kbtbttbtbk', 'kbkYbbYkbk', 'kbbbttbbbk', '.kbbkkbbk.', '..kbWWbk..', '...kkkk...'], C)
};
WP.PICK_SPR = { mag: 'mag', ammo: 'ammo', grenade: 'grenade', gbox: 'gbox', ration: 'ration', medkit: 'medkit', fury: 'fury', dynamite: 'dynamite', flare: 'flare', intel: 'intel', fang: 'fang' };
WP.PICK_NAME = { mag: 'MAGAZINE', ammo: 'AMMO CRATE', grenade: 'GRENADE', gbox: 'GRENADE BOX', ration: 'RATION', medkit: 'MEDKIT', fury: 'FURY', dynamite: 'DYNAMITE', flare: 'FLARE', intel: 'INTEL', fang: 'WOLF FANG' };
})();
