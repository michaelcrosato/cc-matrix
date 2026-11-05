/* ---- ART: materials, Japanese props as data (E.SHAPES), floor textures by tag, wall types with baked face painters
 * (shoji, koshi slats, namako tiles, noren, vermilion pillars), kawara roof caps drawn over the flat walkable roofs,
 * string sprites (tool icons, the crest), the brush kanji of the Silent Cut, ink splats, petals and maple leaves ---- */
Object.assign(E.MATERIALS, {
  vermilion: { color: '#c83a22', pattern: 'glaze' }, lacquerBlack: { color: '#1e1616', pattern: 'glaze' }, lacquerRed: { color: '#8a1c1c', pattern: 'glaze' },
  paperGlow: { color: '#ffd8a0', pattern: 'none', glow: 1 }, redPaper: { color: '#e8603a', pattern: 'none', glow: 1 },
  bamboo: { color: '#7a9a4a', pattern: 'planks', bw: 2, dir: 'v' }, bambooDry: { color: '#b8a060', pattern: 'planks', bw: 2, dir: 'v' },
  kawara: { color: '#4a5468', pattern: 'shingles', course: 2.5, bw: 4 }, plasterW: { color: '#d8d0c0', pattern: 'noise', scale: 6 },
  indigo: { color: '#2a3a6a', pattern: 'cloth' }, ricestraw: { color: '#c8b070', pattern: 'thatch', course: 2 }, rope: { color: '#a08050', pattern: 'none' },
  goldLeaf: { color: '#e8b04a', pattern: 'metal' }, ishigaki: { color: '#6a6a72', pattern: 'stones', size: 6 }, darkwood: { color: '#4a3428', pattern: 'planks', bw: 3 },
  mapleLeaf: { color: '#b8341e', pattern: 'foliage', size: 3.5 }, cherryLeaf: { color: '#e8a0b8', pattern: 'foliage', size: 3.5 }, bambooLeaf: { color: '#4a7a3a', pattern: 'foliage', size: 3 },
  persimmon: { color: '#3e5a2e', pattern: 'foliage', size: 3.5 }, targetWhite: { color: '#e8e0d0', pattern: 'none' }, targetBlack: { color: '#1a1418', pattern: 'none' },
  drumHide: { color: '#d8c8a0', pattern: 'none' }, drumBody: { color: '#8a2a1a', pattern: 'glaze' }
});
const SH = E.SHAPES;
Object.assign(SH, {
  stoneLantern: { about: 'stone lantern (ishidoro)', tags: 'japan garden light', mats: { s: 'granite', f: 'flame' }, lights: [[0, 0, 15, '#ffb060', 64]],
    parts: [['cyl', 's', [0, 0, 0], 5, 2, { seg: 6 }], ['cyl', 's', [0, 0, 2], 1.8, 9, { seg: 6 }], ['cyl', 's', [0, 0, 11], 4.6, 1.5, { seg: 6 }], ['box', 'f', [0, 0, 12.5], [4, 4, 4]],
      ['mirror', 'xy', ['box', 's', [2.4, 2.4, 12.5], [1.3, 1.3, 4.4]]], ['cyl', 's', [0, 0, 16.9], 6.2, 3, { r2: 1, seg: 6 }], ['ball', 's', [0, 0, 20.6], 1.4]] },
  paperLantern: { about: 'red paper lantern on a post (chochin)', tags: 'japan festival light', mats: { w: 'walnut', p: 'redPaper', k: 'lacquerBlack' }, lights: [[0, 3, 21, '#ff9a50', 56]],
    parts: [['cyl', 'w', [0, 0, 0], 1, 26], ['box', 'w', [0, 1.5, 25], [1, 4, 1]], ['ball', 'p', [0, 3, 21], 3.2, { sz: 1.3 }], ['cyl', 'k', [0, 3, 24.4], 1.8, .8], ['cyl', 'k', [0, 3, 17.2], 1.8, .8]] },
  lanternString: { about: 'a string of festival lanterns between two posts', tags: 'japan festival light', mats: { w: 'walnut', p: 'redPaper', q: 'paperGlow' }, lights: [[0, 0, 26, '#ff9a50', 70]],
    parts: [['mirror', 'x', ['cyl', 'w', [24, 0, 0], 1, 32]], ['box', 'w', [0, 0, 31], [48, .5, .5]], ['row', 3, [16, 0, 0], ['ball', 'p', [0, 0, 27], 2.4, { sz: 1.3 }]], ['row', 2, [16, 0, 0], ['ball', 'q', [0, 0, 28], 2.2, { sz: 1.3 }]]] },
  torii: { about: 'vermilion torii gate', tags: 'japan shrine', mats: { v: 'vermilion', k: 'lacquerBlack' },
    parts: [['mirror', 'x', ['cyl', 'v', [13, 0, 0], 1.8, 38]], ['box', 'v', [0, 0, 29], [34, 2, 2.4]], ['box', 'v', [0, 0, 35], [38, 2.8, 1.8]], ['box', 'k', [0, 0, 36.8], [42, 3.4, 1.8]], ['box', 'v', [0, 0, 31.4], [2, 2, 3.6]]] },
  bamboo: { about: 'a cluster of bamboo stalks', tags: 'japan plant', mats: { b: 'bamboo', n: 'bambooDry', l: 'bambooLeaf' }, params: { seed: 1, n: 4 },
    make: p => { const R = E.rng(p.seed * 31 + 7), out = []; for (let i = 0; i < p.n; i++) { const a = R() * TAU, d = R() * 4.5, x = Math.cos(a) * d, y = Math.sin(a) * d, h = 34 + R() * 22;
      out.push(['cyl', 'b', [x, y, 0], .9, h, { seg: 6 }]); for (let z = 8; z < h - 4; z += 8) out.push(['cyl', 'n', [x, y, z], 1.15, .6, { seg: 6 }]); out.push(['ball', 'l', [x + R() * 3 - 1.5, y + R() * 3 - 1.5, h - 2], 4.2, { sz: .55 }]); }
      return out; } },
  maple: { about: 'red maple tree', tags: 'japan tree', parts: [['use', 'tree', [0, 0, 0], { h: 40, seed: 3, mats: { l: 'mapleLeaf' } }]] },
  cherry: { about: 'cherry tree in blossom', tags: 'japan tree', parts: [['use', 'tree', [0, 0, 0], { h: 42, seed: 5, mats: { l: 'cherryLeaf' } }]] },
  persimmonTree: { about: 'persimmon tree with orange fruit', tags: 'japan tree', mats: { f: '#e87a2a glaze' }, parts: [['use', 'tree', [0, 0, 0], { h: 46, seed: 8, mats: { l: 'persimmon' } }], ['ball', 'f', [5, 3, 34], 1.4], ['ball', 'f', [-4, -2, 38], 1.4], ['ball', 'f', [1, -5, 31], 1.4], ['ball', 'f', [-6, 4, 33], 1.3]] },
  bonsaiPine: { about: 'garden pine, low and wide', tags: 'japan tree', parts: [['use', 'pine', [0, 0, 0], { h: 26, tiers: 3 }]] },
  steppingStones: { about: 'three garden stepping stones', tags: 'japan garden', mats: { s: 'granite' }, parts: [['cyl', 's', [-6, -3, 0], 3.4, 1, { seg: 7, sq: .8 }], ['cyl', 's', [0, 2, 0], 3, 1, { seg: 7, sq: .8 }], ['cyl', 's', [6, -2, 0], 3.2, 1, { seg: 7, sq: .8 }]] },
  sakeBarrel: { about: 'straw-wrapped sake barrel (komodaru)', tags: 'japan container', mats: { s: 'ricestraw', r: 'rope', l: 'lacquerRed', w: 'oak' },
    parts: [['lathe', 's', [0, 0, 0], [[0, 0], [5.5, 0], [6, 6], [5.5, 12], [0, 12]]], ['row', 2, [0, 0, 6], ['cyl', 'r', [0, 0, 2.6], 6.15, .8]], ['box', 'l', [0, 5.6, 4], [5, 1, 4.5]], ['cyl', 'w', [0, 0, 12], 5.2, .6]] },
  riceBale: { about: 'rice straw bale (tawara)', tags: 'japan container farm', mats: { s: 'ricestraw', r: 'rope' },
    parts: [['prism', 's', [0, 0, 0], [[-4, 0], [4, 0], [5.2, 3.5], [4, 7], [-4, 7], [-5.2, 3.5]], 14, { axis: 'x' }], ['row', 3, [4.5, 0, 0], ['prism', 'r', [0, 0, -.1], [[-4.2, 0], [4.2, 0], [5.4, 3.5], [4.2, 7.2], [-4.2, 7.2], [-5.4, 3.5]], 1, { axis: 'x' }]]] },
  jubako: { about: 'stacked lacquer lunchboxes wrapped in cloth', tags: 'japan container', mats: { k: 'lacquerBlack', r: 'lacquerRed', c: 'indigo', g: 'goldLeaf' },
    parts: [['box', 'k', [0, 0, 0], [12, 12, 4]], ['box', 'r', [0, 0, 4], [12, 12, 4]], ['box', 'k', [0, 0, 8], [12, 12, 4]], ['box', 'g', [0, 0, 12], [12.4, 12.4, .8]], ['box', 'c', [0, 0, 5], [12.6, 2.4, 8.2]], ['box', 'c', [0, 0, 12.6], [3, 3, 1.6]]] },
  yatai: { about: 'noodle stall with a noren and a lantern', tags: 'japan town shop', mats: { w: 'darkwood', s: 'kawara', n: 'indigo', p: 'redPaper', b: 'oak' }, lights: [[14, -7, 22, '#ffb060', 70]],
    parts: [['box', 'b', [0, 0, 0], [30, 12, 12]], ['mirror', 'x', ['box', 'w', [13.5, 4.5, 12], [1.5, 1.5, 15]]], ['mirror', 'x', ['box', 'w', [13.5, -4.5, 12], [1.5, 1.5, 15]]], ['box', 's', [0, 0, 27], [34, 15, 1.5]],
      ['prism', 's', [0, 0, 28.5], [[-8, 0], [8, 0], [0, 4]], 34, { axis: 'x' }], ['row', 4, [7.2, 0, 0], ['box', 'n', [0, -6.6, 20.5], [6.4, .5, 6]]], ['ball', 'p', [14, -7, 22], 2.4, { sz: 1.3 }], ['row', 3, [6, 0, 0], ['cyl', 'w', [0, 2, 12], 1.6, 1.2]]] },
  weaponRack: { about: 'rack of spears', tags: 'japan castle', mats: { w: 'darkwood', s: 'walnut', t: 'steel' },
    parts: [['mirror', 'x', ['box', 'w', [8, 0, 0], [1.5, 3, 20]]], ['box', 'w', [0, 0, 6], [17, 2, 1.5]], ['box', 'w', [0, 0, 16], [17, 2, 1.5]], ['row', 4, [3.5, 0, 0], ['cyl', 's', [0, 1, 0], .5, 26]], ['row', 4, [3.5, 0, 0], ['cyl', 't', [0, 1, 26], .8, 3.4, { r2: 0, seg: 4 }]]] },
  mato: { about: 'archery target (mato) on a stand', tags: 'japan training', mats: { w: 'oak', a: 'targetWhite', k: 'targetBlack' },
    parts: [['mirror', 'x', ['box', 'w', [4.5, 0, 0], [1.2, 1.2, 15]]], ['prism', 'a', [0, 0, 0], [[0, 12], [4, 13.2], [5.6, 17], [4, 20.8], [0, 22], [-4, 20.8], [-5.6, 17], [-4, 13.2]], 1.2, { axis: 'y' }],
      ['prism', 'k', [0, -.4, 0], [[0, 14], [2.2, 14.8], [3, 17], [2.2, 19.2], [0, 20], [-2.2, 19.2], [-3, 17], [-2.2, 14.8]], 1.2, { axis: 'y' }], ['prism', 'a', [0, -.8, 0], [[0, 15.8], [1, 16.2], [1.2, 17], [1, 17.8], [0, 18.2], [-1, 17.8], [-1.2, 17], [-1, 16.2]], 1.2, { axis: 'y' }]] },
  taiko: { about: 'taiko drum on a stand', tags: 'japan festival', mats: { w: 'darkwood', d: 'drumBody', h: 'drumHide' },
    parts: [['mirror', 'x', ['box', 'w', [5, 0, 0], [1.5, 9, 7]]], ['prism', 'd', [0, 0, 0], [[-7, 5], [-5, 12], [-1, 15], [1, 15], [5, 12], [7, 5], [1, 1], [-1, 1]], 9, { axis: 'y' }],
      ['prism', 'h', [0, -4.6, 0], [[-5.5, 5.5], [-4, 11], [0, 13.5], [4, 11], [5.5, 5.5], [0, 2.5]], .4, { axis: 'y' }]] },
  hansho: { about: 'alarm bell (hansho) on a ladder frame', tags: 'japan castle alarm', mats: { w: 'darkwood', b: 'bronze', s: 'kawara' },
    parts: [['mirror', 'x', ['box', 'w', [7, 0, 0], [2, 2, 40]]], ['box', 'w', [0, 0, 37], [18, 2.6, 2.6]], ['prism', 's', [0, 0, 39.6], [[-4, 0], [4, 0], [0, 3.4]], 22, { axis: 'x' }],
      ['lathe', 'b', [0, 0, 23], [[0, 0], [5, 0], [4.6, 2], [3.8, 8], [3, 12], [1, 13.4], [0, 13.4]]], ['cyl', 'b', [0, 0, 36.4], .5, 1], ['row', 5, [0, 0, 6.5], ['box', 'w', [0, 3.6, 3], [14, 1, 1]]]] },
  waterBarrel: { about: 'water barrel', tags: 'japan container', parts: [['use', 'barrel', [0, 0, 0], {}]] },
  strawMat: { about: 'straw mat on the ground', tags: 'japan floor', mats: { s: 'ricestraw' }, parts: [['box', 's', [0, 0, 0], [22, 13, .8]]] },
  boat: { about: 'moored river boat', tags: 'japan water', mats: { w: 'darkwood', o: 'oak' },
    parts: [['prism', 'w', [0, 0, -3], [[-14, 0], [14, 0], [21, 6], [-19, 6]], 12, { axis: 'y' }], ['box', 'o', [0, 0, 3], [3, 11, 1]], ['box', 'o', [-8, 0, 3], [3, 11, 1]], ['cyl', 'o', [16, 0, 3], .6, 16, { rot: [0, -20, 0] }]] },
  riceBarge: { about: 'rice barge loaded with bales', tags: 'japan water', mats: { w: 'darkwood' },
    parts: [['prism', 'w', [0, 0, -3], [[-20, 0], [20, 0], [26, 7], [-24, 7]], 18, { axis: 'y' }], ['use', 'riceBale', [-8, -4, 4], {}], ['use', 'riceBale', [8, -4, 4], {}], ['use', 'riceBale', [0, 4, 4], {}], ['use', 'riceBale', [0, -4, 11], {}]] },
  mooringPost: { about: 'mooring post with a rope', tags: 'japan water', mats: { w: 'darkwood', r: 'rope' }, parts: [['cyl', 'w', [0, 0, 0], 1.8, 13, { seg: 8 }], ['cyl', 'r', [0, 0, 9], 2.3, 1.2], ['cyl', 'w', [0, 0, 13], 2.1, .8, { seg: 8 }]] },
  bambooCage: { about: 'bamboo prisoner cage', tags: 'japan prison', mats: { b: 'bambooDry', r: 'rope' },
    parts: [['row', 7, [2.8, 0, 0], ['cyl', 'b', [0, -9, 0], .6, 24]], ['row', 7, [2.8, 0, 0], ['cyl', 'b', [0, 9, 0], .6, 24]], ['row', 7, [0, 2.8, 0], ['cyl', 'b', [-9, 0, 0], .6, 24]], ['row', 7, [0, 2.8, 0], ['cyl', 'b', [9, 0, 0], .6, 24]],
      ['box', 'b', [0, 0, 23.5], [19.5, 19.5, 1.2]], ['box', 'r', [0, -9, 12], [19, 1.4, 1.2]], ['box', 'r', [0, 9, 12], [19, 1.4, 1.2]]] },
  lever: { about: 'water-gate lever', tags: 'japan machine', mats: { s: 'granite', i: 'iron', r: 'lacquerRed' }, parts: [['box', 's', [0, 0, 0], [8, 6, 5]], ['cyl', 'i', [0, 0, 5], .7, 12, { rot: [0, 28, 0] }], ['ball', 'r', [5.4, 0, 15.6], 1.5]] },
  leverDown: { about: 'water-gate lever, pulled', tags: 'japan machine', mats: { s: 'granite', i: 'iron', r: 'lacquerRed' }, parts: [['box', 's', [0, 0, 0], [8, 6, 5]], ['cyl', 'i', [0, 0, 5], .7, 12, { rot: [0, -50, 0] }], ['ball', 'r', [-8.8, 0, 12.7], 1.5]] },
  shachihoko: { about: 'golden tiger-fish roof ornament', tags: 'japan castle', mats: { g: 'goldLeaf' }, parts: [['box', 'g', [0, 0, 0], [3, 5, 4]], ['ball', 'g', [0, 1.5, 5], 2.4, { sz: 1.2 }], ['prism', 'g', [0, -1.6, 4], [[-1.6, 0], [1.6, 0], [0, 6]], 1.4, { axis: 'y' }], ['ball', 'g', [0, 3.4, 6.4], 1.2]] },
  dummy: { about: 'straw practice dummy', tags: 'japan training', mats: { w: 'oak', s: 'ricestraw', r: 'rope' }, parts: [['cyl', 'w', [0, 0, 0], 1.2, 26], ['cyl', 's', [0, 0, 9], 4, 11, { seg: 8 }], ['ball', 's', [0, 0, 24], 3], ['box', 'w', [0, 0, 17], [16, 1.5, 1.5]], ['cyl', 'r', [0, 0, 14], 4.3, 1]] },
  sakeFlask: { about: 'porcelain sake flask on a tray', tags: 'japan objective', mats: { p: 'porcelain', t: 'lacquerRed' }, parts: [['box', 't', [0, 0, 0], [10, 8, 1.5]], ['lathe', 'p', [0, 0, 1.5], [[0, 0], [2, 0], [2.6, 2], [2, 5], [.8, 7], [1.1, 8], [0, 8]]], ['cyl', 'p', [-3.4, 1.5, 1.5], 1.2, 1.5]] },
  strongbox: { about: 'iron-bound strongbox', tags: 'japan objective', parts: [['use', 'chest', [0, 0, 0], { mats: { w: 'darkwood', b: 'iron' } }]] },
  kotatsu: { about: 'low lacquer feast table', tags: 'japan interior', mats: { k: 'lacquerBlack', r: 'lacquerRed', b: 'porcelain' }, parts: [['box', 'k', [0, 0, 0], [26, 14, 5]], ['box', 'r', [0, 0, 5], [27, 15, .8]], ['row', 3, [7, 0, 0], ['cyl', 'b', [0, 0, 5.8], 2, 1.4]]] },
  folding: { about: 'gold folding screen (byobu)', tags: 'japan interior', mats: { g: 'goldLeaf', k: 'lacquerBlack' }, parts: [['row', 4, [7, 0, 0], ['box', 'g', [0, 0, 0], [6.6, 1, 18], { rot: 12 }]], ['row', 4, [7, 0, 0], ['box', 'k', [0, 0, 18], [6.8, 1.2, .8]]]] },
  hut: { about: 'reed fishing hut roof on posts', tags: 'japan village', mats: { w: 'oak', s: 'ricestraw' }, parts: [['mirror', 'xy', ['cyl', 'w', [9, 7, 0], 1.2, 18]], ['prism', 's', [0, 0, 18], [[-11, 0], [11, 0], [0, 9]], 24, { axis: 'x' }]] },
  nets: { about: 'fishing nets drying on poles', tags: 'japan village', mats: { w: 'oak', n: '#6a6a50 cloth' }, parts: [['mirror', 'x', ['cyl', 'w', [10, 0, 0], .8, 20]], ['box', 'n', [0, 0, 6], [19, .4, 13]], ['box', 'w', [0, 0, 19], [22, .8, .8]]] },
  cart: SH.cart
});

/* ---- FLOORS: textures by floor tag (night palettes) ---- */
const FLOOR = {
  earth: (x, y) => E.tex.dirt(x, y, { base: '#3a3430', dark: '#2c2622', light: '#4a4038' }),
  grass: (x, y) => E.tex.grass(x, y, { base: '#2e4a32', dark: '#203824', light: '#3e5e3a', flower: '#7a6a9a' }),
  bamboo: (x, y) => { const c = E.tex.grass(x, y, { base: '#2a3e26', dark: '#1c2c1a', light: '#4a5a2a', flower: '#6a7a3a' }); return c; },
  gravel: (x, y) => { const n = E.noise2 ? E.noise2(x * .7, y * .7) : 0, rake = Math.sin(y * Math.PI / 2.5) > .55 ? 14 : 0, sp = ((x * 73856093 ^ y * 19349663) >>> 0) % 7 === 0 ? 18 : 0, v = 104 + rake + sp + n * 10; return [v, v - 2, v - 6]; },
  boards: (x, y) => E.tex.planks(x, y, { base: '#6a4a30', dark: '#4a3220', line: '#2a1a10' }),
  tatami: (x, y) => { const bx = ((x % 32) + 32) % 32, by = ((y % 16) + 16) % 16, edge = bx < 1.5 || by < 1.5; if (edge) return [40, 34, 28]; const s = Math.sin(x * 2.1) > .3 ? 8 : 0; return [128 + s, 124 + s, 74]; },
  paving: (x, y) => E.tex.flagstone(x, y, { stones: ['#5a5a62', '#646470', '#56565e'].map(E.hex), mortar: E.hex('#2e2e34'), hi: E.hex('#74747e'), lo: E.hex('#44444c'), speck: E.hex('#4e4e56') }),
  water: (x, y) => E.tex.water(x, y, { base: '#1e3a5a', dark: '#14304a', light: '#4a7aa0' }),
  shallow: (x, y) => E.tex.water(x, y, { base: '#2e5a6a', dark: '#24485a', light: '#6a9ab0' }),
  door: (x, y) => E.tex.planks(x, y, { base: '#5a3a24', dark: '#3a2416', line: '#20140c' })
};
const floorTex = (x, y, tag) => (FLOOR[tag] || FLOOR.earth)(x, y);

/* ---- WALLS: one type per legend letter. Faces are materials with decorate painters baked once with the wall ---- */
const deco = {
  compound: f => { const t = E.tones('#4a5468'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, t.sh); f.line(f.u0, f.z1 - 3, f.u1, f.z1 - 3, t.deep); f.quad(f.u0, f.z0, f.u1, Math.min(f.z1, f.z0 + 4), '#5a5a62'); },
  shoji: f => { const lit = f.side === 'south' || f.side === 'east'; for (let u = f.u0; u < f.u1; u += 16) { f.quad(u + 1.5, f.z0 + 4, u + 14.5, f.z0 + 26, lit ? '#e8dcc0' : '#b8ac94'); for (let k = 1; k < 4; k++) f.line(u + 1.5 + k * 3.25, f.z0 + 4, u + 1.5 + k * 3.25, f.z0 + 26, '#4a3428'); for (let z = 9; z < 26; z += 5.5) f.line(u + 1.5, f.z0 + z, u + 14.5, f.z0 + z, '#4a3428'); }
    f.quad(f.u0, f.z0 + 28, f.u1, f.z0 + 31, '#3a2a20'); },
  machiya: f => { for (let u = f.u0; u < f.u1; u += 1.6) f.line(u, f.z0 + 2, u, f.z0 + 18, '#2a1e18'); f.quad(f.u0, f.z0 + 18, f.u1, f.z0 + 20, '#3a2a20'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, '#3a4250'); },
  inn: f => { for (let u = f.u0; u < f.u1; u += 1.6) f.line(u, f.z0 + 2, u, f.z0 + 20, '#2a1e18'); f.quad(f.u0, f.z0 + 30, f.u1, f.z0 + 33, '#2a2018'); for (let u = f.u0 + 2; u < f.u1; u += 4) f.line(u, f.z0 + 33, u, f.z0 + 38, '#3a2a20'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, '#3a4250'); },
  kura: f => { const zt = Math.min(f.z1, f.z0 + 14); f.quad(f.u0, f.z0, f.u1, zt, '#3e3e46'); for (let u = f.u0; u < f.u1; u += 4) { f.line(u, f.z0, u + 4, zt, '#d8d0c0'); f.line(u + 4, f.z0, u, zt, '#d8d0c0'); } f.quad(f.u0, f.z1 - 4, f.u1, f.z1, '#30343e'); },
  shop: f => { for (let u = f.u0; u < f.u1; u += 1.6) f.line(u, f.z0 + 2, u, f.z0 + 12, '#2a1e18'); const c = f.cx % 3 === 0 ? '#8a2a1a' : '#2a3a6a'; for (let u = f.u0 + 1; u < f.u1 - 1; u += 5) f.quad(u, f.z0 + 18, u + 4.4, f.z0 + 28, c); f.dot((f.u0 + f.u1) / 2, f.z0 + 24, '#f4ead5'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, '#3a4250'); },
  shrine: f => { f.quad(f.u0, f.z0, f.u0 + 2.5, f.z1, '#c83a22'); f.quad(f.u1 - 2.5, f.z0, f.u1, f.z1, '#c83a22'); f.quad(f.u0, f.z1 - 6, f.u1, f.z1 - 3, '#c83a22'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, '#2a2a34'); },
  tower: f => { f.quad(f.u0, f.z1 - 14, f.u1, f.z1 - 10, '#2a2018'); for (let u = f.u0 + 3; u < f.u1; u += 5) f.quad(u, f.z1 - 9, u + 2, f.z1 - 3, '#14100c'); },
  keep: f => { const zb = Math.min(f.z1, f.z0 + 24); f.quad(f.u0, f.z0, f.u1, zb, '#5e5e66'); for (let z = f.z0 + 4; z < zb; z += 5) f.line(f.u0, z, f.u1, z - 1, '#46464e'); for (let u = f.u0 + 4; u < f.u1; u += 8) f.quad(u, zb + 10, u + 3, zb + 16, '#2a2a30'); f.quad(f.u0, f.z1 - 5, f.u1, f.z1, '#3a4250'); f.line(f.u0, f.z1 - 5, f.u1, f.z1 - 5, '#e8e0d0'); },
  castle: f => { if (f.z1 - f.z0 > 30) for (let u = f.u0 + 6; u < f.u1; u += 16) f.quad(u, f.z1 - 14, u + 2, f.z1 - 6, '#1e1e24'); }
};
const WALLTYPES = {
  '#': { id: 1, h: 56, top: '#5a5a62', side: '#6a6a72', face: 'ishigaki', roof: 'slab', cut: true, cutH: 8, decorate: deco.castle, name: 'Castle wall' },
  W: { id: 2, h: 30, top: '#4a5468', side: '#d0c8b8', face: 'plaster', roof: 'tiles', cut: true, cutH: 6, decorate: deco.compound, name: 'Compound wall' },
  F: { id: 3, h: 14, top: '#8a9a4a', side: '#7a9a4a', face: 'bamboo', roof: 'plain', name: 'Bamboo fence' },
  H: { id: 4, h: 40, top: '#4a3428', side: '#5a4030', face: 'timber', roof: 'plain', cut: true, cutH: 6, decorate: deco.shoji, name: 'Hall wall' },
  A: { id: 5, h: 40, top: '#4a5468', side: '#c8bca8', face: 'plaster', roof: 'tiles', decorate: deco.machiya, name: 'Townhouse' },
  B: { id: 6, h: 64, top: '#46505e', side: '#b8a890', face: 'timber', roof: 'tiles', decorate: deco.inn, name: 'Two-story inn' },
  C: { id: 7, h: 48, top: '#3e4656', side: '#e0d8c8', face: 'plaster', roof: 'tiles', decorate: deco.kura, name: 'Storehouse (kura)' },
  D: { id: 8, h: 40, top: '#4a5468', side: '#6a4a34', face: 'timber', roof: 'tiles', decorate: deco.shop, name: 'Shop' },
  S: { id: 9, h: 56, top: '#2e3440', side: '#c8bca8', face: 'plaster', roof: 'tiles', decorate: deco.shrine, name: 'Shrine hall' },
  T: { id: 10, h: 80, top: '#4a3a2a', side: '#6a5a44', face: 'plank', roof: 'plain', decorate: deco.tower, name: 'Watchtower' },
  G: { id: 11, h: 64, top: '#3e4656', side: '#e4dccc', face: 'plaster', roof: 'tiles', decorate: deco.keep, name: 'Keep, first tier' },
  K: { id: 12, h: 112, top: '#3e4656', side: '#e4dccc', face: 'plaster', roof: 'tiles', decorate: deco.keep, name: 'Keep, second tier' },
  M: { id: 13, h: 160, top: '#3a4252', side: '#e8e0d0', face: 'plaster', roof: 'tiles', decorate: deco.keep, name: 'Keep, top tier' },
  P: { id: 14, h: 10, top: '#3e6a3a', side: '#6a5a4a', face: 'stone', roof: 'leaves', name: 'Planter' },
  R: { id: 15, h: 20, top: '#5a5a54', side: '#6a6a60', face: 'rock', roof: 'plain', name: 'Rocks' }
};
const FLOORCH = { '.': 'earth', ',': 'grass', '"': 'bamboo', ':': 'gravel', '=': 'boards', '_': 'tatami', '+': 'paving', '~': 'water', '-': 'shallow', d: 'door' };
const BUILDINGS = 'ABCDSTGKM';

/* ---- ROOF CAPS: eaves, hips and a ridge drawn over every building block's flat, walkable top ---- */
const Art = {};
Art.roofCap = (r, b) => {
  const { x0, y0, x1, y1, h } = b, long = x1 - x0 >= y1 - y0, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, inset = Math.min(x1 - x0, y1 - y0) * .3;
  const R0 = long ? [x0 + inset, my] : [mx, y0 + inset], R1 = long ? [x1 - inset, my] : [mx, y1 - inset], tz = h + Math.min(10, inset * .45);
  if (b.ring) { r.queue(mx, my, h, g => { const P = (x, y, z) => r.w(x, y, z), c = [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], d = [P(x0 + 4, y0 + 4, h + 1), P(x1 - 4, y0 + 4, h + 1), P(x1 - 4, y1 - 4, h + 1), P(x0 + 4, y1 - 4, h + 1)];
    for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4], p2 = d[i], q2 = d[(i + 1) % 4]; px.poly(g, [p, q, q2, p2].map(v => [v[0], v[1]]), i < 2 ? '#525c70' : '#3a4254'); px.line(g, p[0], p[1], q[0], q[1], '#181c24'); px.line(g, p2[0], p2[1], q2[0], q2[1], '#d8d0c0'); } }, { footprint: [x0, y0, x1, y1], bias: 1 }); return; }
  r.queue(mx, my, h, g => {
    const P = (x, y, z) => r.w(x, y, z), c = [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], a = P(R0[0], R0[1], tz), e = P(R1[0], R1[1], tz);
    const dk = b.dark || '#2a3040', lt = b.light || '#6a7488', ridge = b.ridge || '#d8d0c0';
    // hips: four slopes; the near ones lighter
    px.poly(g, [c[0], c[1], e, a].map(p => [p[0], p[1]]), lt === '#6a7488' ? '#525c70' : lt);
    px.poly(g, [c[3], c[2], e, a].map(p => [p[0], p[1]]), b.mid || '#46505e');
    px.poly(g, long ? [c[1], c[2], e] : [c[2], c[3], e], dk); px.poly(g, long ? [c[0], c[3], a] : [c[0], c[1], a], b.mid || '#46505e');
    for (const [p, q] of [[c[0], a], [c[1], long ? e : a], [c[2], e], [c[3], long ? a : e]]) px.line(g, p[0], p[1], q[0], q[1], '#20242e');
    px.line(g, a[0], a[1], e[0], e[1], ridge, 2); px.line(g, a[0], a[1] - 1, e[0], e[1] - 1, '#20242e');
    px.disc(g, a[0], a[1] - 1, 1.6, '#30343e'); px.disc(g, e[0], e[1] - 1, 1.6, '#30343e');
    for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; px.line(g, p[0], p[1], q[0], q[1], '#181c24'); }
    if (b.shachi) for (const p of [a, e]) { px.rect(g, p[0] - 1, p[1] - 7, 3, 6, '#e8b04a'); px.dot(g, p[0], p[1] - 8, '#fff0b0'); }
  }, { footprint: [x0, y0, x1, y1], bias: 1 });
};
/** a hall's visual roof: hides the interior, fades while the hero is inside */
Art.hallRoof = (r, b, alpha) => {
  if (alpha <= .02) return;
  const { x0, y0, x1, y1, h } = b, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, long = x1 - x0 >= y1 - y0, inset = Math.min(x1 - x0, y1 - y0) * .32, tz = h + 12;
  const R0 = long ? [x0 + inset, my] : [mx, y0 + inset], R1 = long ? [x1 - inset, my] : [mx, y1 - inset];
  r.queue(mx, my, h, g => {
    const P = (x, y, z) => r.w(x, y, z), E2 = 6, c = [P(x0 - E2, y0 - E2, h - 2), P(x1 + E2, y0 - E2, h - 2), P(x1 + E2, y1 + E2, h - 2), P(x0 - E2, y1 + E2, h - 2)], a = P(R0[0], R0[1], tz), e = P(R1[0], R1[1], tz);
    const draw = () => {
      px.poly(g, [c[0], c[1], e, a].map(p => [p[0], p[1]]), '#4a5266'); px.poly(g, [c[3], c[2], e, a].map(p => [p[0], p[1]]), '#3a4254');
      px.poly(g, long ? [c[1], c[2], e] : [c[2], c[3], e], '#2a303e'); px.poly(g, long ? [c[0], c[3], a] : [c[0], c[1], a], '#3e4658');
      for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; px.line(g, p[0], p[1], q[0], q[1], '#141820'); }
      px.line(g, a[0], a[1], e[0], e[1], '#d8d0c0', 2);
    };
    if (alpha >= .98) draw(); else px.blend(g, alpha, 'normal', draw);
  }, { footprint: [x0 - 6, y0 - 6, x1 + 6, y1 + 6], bias: 40, hides: true });
};

/* ---- SPRITES: tool icons (12 x 12), the clan crest ---- */
const ICON_PAL = { w: '#f4f0e6', W: '#c8c0b0', n: '#1e2a1e', o: '#14100c', p: '#8a4ab0', g: '#a8c070', G: '#6a8a40', k: '#f0a0b8', s: '#a07040', r: '#c8243a', R: '#7a1428', h: '#ffd0d8', m: '#9a9aa8', M: '#5a5a68', d: '#2a2a34', D: '#4a4a58', f: '#ffb040', F: '#ff6a2a', b: '#8a5a32', B: '#5a3a20', y: '#d8b860', Y: '#a88a40', c: '#e8e0d0', t: '#c83a22', q: '#7ab4ff' };
const ICONS = {
  riceball: ['.....oo.....', '....owwo....', '...owwwwo...', '..owwwWwwo..', '..owwwwwWo..', '.owwwwwwwWo.', '.owwwwwwwwo.', 'owwnnnnnnwWo', 'owwnnnnnnwwo', 'owwnnnnnnwwo', '.oonnnnnnoo.', '............'],
  poisonball: ['.....oo.....', '....oggo....', '...oggggo...', '..oggpggGo..', '..oggggpGo..', '.oggppgggGo.', '.ogggggggGo.', 'oggnnnnnnGGo', 'oggnnnnnnggo', 'oggnnnnnngGo', '.oonnnnnnoo.', '............'],
  dango: ['..........s.', '.......kkks.', '......kkhkk.', '......kkkkk.', '....wwwkkk..', '...wwcwww...', '...wwwww....', '.ggwwww.....', 'gGggg.......', 'gggGg.......', 'sggg........', 's...........'],
  plum: ['............', '.....G......', '....RG......', '...rrrrr....', '..rrhrrrr...', '.rrhrrrrRr..', '.rrrrrrrRr..', '.rrrrrrRRr..', '..rrrrRRr...', '...rRRRr....', '....RRR.....', '............'],
  shuriken: ['.....m......', '.....mm.....', '.....mM.....', '....mMMm....', 'mmmmMddMM...', '.MMMMdoMmmmm', '...MMddMMMM.', '....mMMm....', '.....Mm.....', '.....MM.....', '......M.....', '............'],
  smoke: ['.......f....', '......sF....', '.....s......', '....DDDD....', '..DDddddD...', '.Dddddddd...', '.Ddddddddd..', '.dddddddddd.', '.ddddddddd..', '..ddddddd...', '...ddddd....', '............'],
  caltrops: ['............', '..m....m....', '..Mm..mM....', '...MMM......', '..mMoMm.....', '.....M..m...', '......mmMm..', '......mMoMm.', '...m...MMM..', '..mMm..m..m.', '...M........', '............'],
  firecracker: ['.........f..', '........F...', '.......s....', '......s.....', '...rrrr.....', '..rrrrrr....', '..cccccc....', '..rRrrRr....', '..rrrrrr....', '..cccccc....', '..rRrrRr....', '...rrrr.....'],
  firepot: ['.....f......', '....fFf.....', '...fFFFf....', '....oFo.....', '...bbbbb....', '..bBbbbbb...', '.bbbbbbbbb..', '.bBbbbbbbb..', '.bbbbbbbBb..', '..bbbbbBb...', '...BBBBB....', '............'],
  cloak: ['.....yy.....', '....yYYy....', '....yyyy....', '...yYyyYy...', '...yyyyyy...', '..yYyyyyYy..', '..yyyYyyyy..', '.yYyyyyyyYy.', '.yyyYyyYyyy.', 'yYyyyyyyyyYy', 'y.y.y.y.y.y.', '............'],
  scroll: ['............', '..bb....bb..', '.bccccccccb.', '.bcdccdcccb.', '.bccccccccb.', '.bcdcccdccb.', '.bccccccccb.', '.bccdcccccb.', '.bccccccccb.', '..bb....bb..', '............', '............'],
  token: ['............', '....tttt....', '...tcccct...', '..tccttcct..', '..tcttttct..', '..tcttttct..', '..tccttcct..', '...tcccct...', '....tttt....', '.....tt.....', '.....tt.....', '............']
};
Art.icon = {};
for (const k in ICONS) Art.icon[k] = E.sprite(ICONS[k], ICON_PAL);
Art.crest = E.sprite(['....tttttt....', '..tt......tt..', '.t..........t.', '.t..cccccc..t.', 't...cttttc...t', 't...cccccc...t', 't............t', 't...cccccc...t', 't...cttttc...t', '.t..cccccc..t.', '.t..........t.', '..tt......tt..', '....tttttt....'], ICON_PAL);

/* ---- THE BRUSH KANJI of the Silent Cut: 静 and 斬 as strokes in a 32 x 32 box, drawn thick with a dark edge ---- */
const KANJI = {
  sei: [[[3, 4], [13, 4]], [[8, 1], [8, 12]], [[4, 8], [12, 8]], [[2, 12], [14, 12]], [[4, 15], [4, 26], [2, 30]], [[4, 15], [13, 15], [13, 28], [11, 30]], [[5, 20], [12, 20]], [[5, 24], [12, 24]],
    [[21, 2], [17, 7]], [[19, 5], [27, 5], [24, 9]], [[16, 11], [30, 11]], [[18, 15], [28, 15]], [[28, 11], [28, 23]], [[18, 19], [28, 19]], [[16, 23], [30, 23]], [[23, 8], [23, 29], [20, 27]]],
  zan: [[[2, 4], [14, 4]], [[3, 8], [13, 8]], [[3, 8], [3, 18]], [[13, 8], [13, 18]], [[3, 13], [13, 13]], [[3, 18], [13, 18]], [[1, 23], [15, 23]], [[8, 1], [8, 30]],
    [[28, 2], [19, 7]], [[19, 7], [19, 21], [16, 29]], [[19, 13], [30, 13]], [[25, 13], [25, 30]]]
};
/** draw a kanji at (x, y) scale s, color c with an edge color (the brush's dark rim), a jitter seed for the splash */
Art.kanji = (g, k, x, y, s, c = '#d02a20', edge = '#3a0806', seed = 1) => {
  const R = E.rng(seed), st = KANJI[k];
  for (const pass of [0, 1]) for (const stroke of st) {
    const pts = stroke.map(([a, b]) => [x + a * s + (R() - .5) * s * .4, y + b * s + (R() - .5) * s * .4]);
    for (let i = 0; i < pts.length - 1; i++) { const w = Math.max(1, Math.round(s * (pass ? 2.4 : 3.6) * (i === 0 ? 1 : .85))); px.line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pass ? c : edge, w); }
    if (pass) { const p = pts[pts.length - 1]; px.disc(g, p[0], p[1], s * 1.1, c); }
  }
};
/** an ink splat: a blob with drops */
Art.splat = (g, x, y, r, c, seed) => { const R = E.rng(seed); px.disc(g, x, y, r, c); for (let i = 0; i < 9; i++) { const a = R() * TAU, d = r * (1 + R() * 1.6); px.disc(g, x + Math.cos(a) * d, y + Math.sin(a) * d * .7, Math.max(1, r * (.15 + R() * .3)), c); } };
/** the moon: a disc with craters and a halo */
Art.moon = (g, x, y, r, tint = '#f4ecd0') => { const t = E.tones(tint); px.blend(g, .25, 'add', () => px.disc(g, x, y, r * 1.6, '#3a3a5a')); px.disc(g, x, y, r, t.base); px.disc(g, x + r * .25, y - r * .2, r * .7, t.lt); px.disc(g, x - r * .35, y + r * .2, r * .2, t.sh); px.disc(g, x + r * .3, y + r * .35, r * .14, t.sh); px.disc(g, x - r * .1, y - r * .45, r * .1, t.sh); };
/** the hanko rank stamp: a red square seal with the rank's initial */
Art.hanko = (g, x, y, s, text, a = 1) => { px.blend(g, a, 'normal', () => { px.rect(g, x - s, y - s, s * 2, s * 2, '#c8202a'); px.rect(g, x - s + 2, y - s + 2, s * 2 - 4, s * 2 - 4, '#f4ead5'); px.rect(g, x - s + 4, y - s + 4, s * 2 - 8, s * 2 - 8, '#c8202a'); E.font.title(g, text, x, y - 10, { align: 'center', scale: 3, colors: ['#f4ead5', '#ffd8c8'], depth: 0, outline: false }); }); };
B.Art = Art; B.WALLTYPES = WALLTYPES; B.FLOORCH = FLOORCH;

/* ---- WEATHER: falling petals and maple leaves (cosmetic, the weather's own random stream) ---- */
E.WEATHER.petals = Object.assign({}, E.WEATHER.leaves, { colors: ['#f4c0d0', '#e8a0b8', '#fff0f4', '#d888a8'], n: 40, fall: 18, sway: 30 });
E.WEATHER.maple = Object.assign({}, E.WEATHER.leaves, { colors: ['#c8341e', '#e8602a', '#a82a1a', '#e8a040'], n: 48, fall: 22 });
