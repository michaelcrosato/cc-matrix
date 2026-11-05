/* 14-world-art: the resort's objects as E.SHAPES data, its materials, the backdrops by time of day, the court geometry and
 * its sand, and effect helpers. Shapes are sized for fighters about 38 units tall. */
Object.assign(E.MATERIALS, {
  aoa_canvasR: '#e8403a cloth', aoa_canvasW: '#f4f0e8 cloth', aoa_canvasB: '#2a8ad8 cloth', aoa_canvasY: '#ffd04a cloth', aoa_canvasT: '#1fb7b0 cloth', aoa_canvasP: '#ff7aa8 cloth',
  aoa_white: '#f4f4f0 glaze', aoa_bleach: '#d8c8a8 planks', aoa_teak: '#a86a3a planks', aoa_thatch: '#c8a060 thatch', aoa_bamboo: '#c8b070 bark',
  aoa_chrome: '#c8d0dc metal', aoa_gold: '#ffd36a metal', aoa_black: '#1a1a22 glaze', aoa_felt: '#1f7a4a cloth', aoa_red: '#c8202c glaze', aoa_neonP: { color: '#ff5fa2', glow: 1 },
  aoa_neonC: { color: '#5ff0ff', glow: 1 }, aoa_glass: '#9fe8f0 glaze', aoa_pool: '#3ac8d8 glaze', aoa_pink: '#ff8ac8 glaze', aoa_sandc: '#e8c890 noise', aoa_cooler: '#2a8ad8 glaze',
  aoa_lamp: { color: '#ffd070', glow: 1 }, aoa_navy: '#1d2433 cloth', aoa_cream: '#f4e8c8 noise', aoa_coral: '#ff8a6a noise', aoa_seafoam: '#8ae8c8 noise', aoa_lilac: '#c8a8f0 plaster'
});
Object.assign(E.SHAPES, {
  umbrella: { about: 'beach umbrella, striped canopy', tags: 'beach', mats: { p: 'aoa_white', a: 'aoa_canvasR', b: 'aoa_canvasW' },
    parts: [['cyl', 'p', [0, 0, 0], .9, 34], ['cyl', 'a', [0, 0, 30], 19, 6, { r2: 0, seg: 8 }], ['cyl', 'b', [0, 0, 29.5], 19.5, 1.2, { seg: 8 }], ['ball', 'p', [0, 0, 36.5], 1.2]] },
  lounger: { about: 'sun lounger', tags: 'beach', mats: { f: 'aoa_white', c: 'aoa_canvasT' },
    parts: [['box', 'f', [0, 0, 3], [10, 26, 1.5]], ['box', 'c', [0, 2, 4.5], [9, 20, 1]], ['box', 'c', [0, -10, 4.5], [9, 7, 8], { rot: [24, 0, 0] }], ['mirror', 'xy', ['box', 'f', [4, 11, 0], [1.2, 1.2, 3]]]] },
  beachtowel: { about: 'towel on the sand', tags: 'beach', mats: { t: 'aoa_canvasP' }, parts: [['box', 't', [0, 0, 0], [12, 22, .5]]] },
  cooler: { about: 'cooler box', tags: 'beach', mats: { c: 'aoa_cooler', l: 'aoa_white' }, parts: [['box', 'c', [0, 0, 0], [12, 8, 8]], ['box', 'l', [0, 0, 8], [12.5, 8.5, 2]]] },
  sandcastle: { about: 'sandcastle', tags: 'beach', mats: { s: 'aoa_sandc' }, parts: [['box', 's', [0, 0, 0], [16, 14, 5]], ['mirror', 'xy', ['cyl', 's', [6, 5, 0], 2.5, 9, { seg: 6 }]], ['cyl', 's', [0, 0, 5], 3.5, 8, { seg: 6 }], ['cyl', 's', [0, 0, 13], 3.5, 3, { r2: 0, seg: 6 }]] },
  surfboard: { about: 'surfboard standing in the sand', tags: 'beach', mats: { b: 'aoa_canvasY', s: 'aoa_canvasR' }, parts: [['cyl', 'b', [0, 0, 0], 4, 32, { sq: .25, r2: 2 }], ['box', 's', [0, 0, 2], [1, 1.5, 28]]] },
  surfrack: { about: 'rack of surfboards', tags: 'beach', mats: { w: 'aoa_teak', a: 'aoa_canvasY', b: 'aoa_canvasT', c: 'aoa_canvasR' },
    parts: [['mirror', 'x', ['box', 'w', [12, 0, 0], [2, 6, 18]]], ['box', 'w', [0, 0, 16], [26, 6, 2]], ['cyl', 'a', [-7, 0, 0], 3.5, 28, { sq: .3, r2: 2 }], ['cyl', 'b', [0, 0, 0], 3.5, 30, { sq: .3, r2: 2 }], ['cyl', 'c', [7, 0, 0], 3.5, 27, { sq: .3, r2: 2 }]] },
  lifeguard: { about: 'lifeguard tower', tags: 'beach', mats: { w: 'aoa_white', r: 'aoa_red', c: 'aoa_canvasR' },
    parts: [['mirror', 'xy', ['box', 'w', [8, 6, 0], [2, 2, 30], { rot: [0, 0, 0] }]], ['box', 'w', [0, 0, 28], [20, 16, 2]], ['box', 'r', [0, 0, 30], [18, 14, 12]], ['prism', 'c', [0, 0, 42], [[-11, 0], [11, 0], [0, 6]], 18, { axis: 'y' }], ['box', 'w', [0, 10, 0], [6, 2, 28], { rot: [-25, 0, 0] }]] },
  bleacher: { about: 'three tiers of bleachers', tags: 'beach stadium', mats: { w: 'aoa_bleach', f: 'aoa_chrome' },
    parts: [['box', 'w', [0, 6, 0], [60, 8, 6]], ['box', 'w', [0, 0, 6], [60, 8, 6]], ['box', 'w', [0, -6, 12], [60, 8, 6]], ['mirror', 'x', ['box', 'f', [29, 0, 0], [1.5, 20, 20]]]] },
  djbooth: { about: 'DJ booth with speakers and a gold disc', tags: 'beach', mats: { b: 'aoa_black', g: 'aoa_gold', n: 'aoa_neonP' },
    parts: [['box', 'b', [0, 0, 0], [26, 12, 14]], ['box', 'n', [0, 6.2, 4], [24, .5, 2]], ['mirror', 'x', ['box', 'b', [17, 0, 0], [8, 9, 24]]], ['mirror', 'x', ['cyl', 'g', [17, 4.6, 16], 3, .6, { rot: [90, 0, 0] }]], ['cyl', 'g', [0, 0, 14], 6, 1]] },
  netpost: { about: 'volleyball net post', tags: 'beach', mats: { p: 'aoa_chrome', b: 'aoa_canvasB' }, parts: [['cyl', 'p', [0, 0, 0], 1.3, 52], ['ball', 'p', [0, 0, 52], 1.6], ['cyl', 'b', [0, 0, 0], 2.2, 8]] },
  tikibar: { about: 'tiki bar: thatch roof, counter, stools', tags: 'beach bar', mats: { t: 'aoa_thatch', w: 'aoa_bamboo', c: 'aoa_teak', s: 'aoa_canvasR' },
    parts: [['mirror', 'xy', ['cyl', 'w', [20, 12, 0], 1.6, 34]], ['prism', 't', [0, 0, 32], [[-28, 0], [28, 0], [0, 14]], 34, { axis: 'y' }], ['box', 'c', [0, 6, 0], [36, 6, 16]], ['box', 'w', [0, 6, 16], [38, 8, 2]],
      ['row', 3, [12, 0, 0], ['group', [0, 16, 0], 0, [['cyl', 'w', [0, 0, 0], .8, 10], ['cyl', 's', [0, 0, 10], 3, 1.5]]]]] },
  changinghut: { about: 'changing hut', tags: 'beach', mats: { w: 'aoa_coral', r: 'aoa_white', d: 'aoa_canvasT' },
    parts: [['box', 'w', [0, 0, 0], [20, 18, 32]], ['prism', 'r', [0, 0, 32], [[-12, 0], [12, 0], [0, 8]], 20, { axis: 'y' }], ['box', 'd', [0, 9.1, 0], [10, .5, 26]]] },
  scoreboard: { about: 'flip scoreboard', tags: 'beach', mats: { f: 'aoa_navy', c: 'aoa_white', l: 'aoa_chrome' },
    parts: [['mirror', 'x', ['box', 'l', [10, 0, 0], [1.5, 1.5, 22]]], ['box', 'f', [0, 0, 20], [26, 3, 16]], ['mirror', 'x', ['box', 'c', [6, 1.6, 23], [9, .5, 10]]]] },
  cabana: { about: 'pool cabana', tags: 'pool', mats: { w: 'aoa_white', c: 'aoa_canvasW', s: 'aoa_canvasT' },
    parts: [['mirror', 'xy', ['box', 'w', [14, 14, 0], [2, 2, 30]]], ['prism', 'c', [0, 0, 30], [[-17, 0], [17, 0], [0, 10]], 32, { axis: 'y' }], ['box', 's', [0, 0, 4], [24, 20, 4]]] },
  poolfloat: { about: 'round float pad', tags: 'pool', mats: { a: 'aoa_canvasY', b: 'aoa_white' }, parts: [['cyl', 'a', [0, 0, 0], 9, 2.5, { seg: 12 }], ['cyl', 'b', [0, 0, 2.5], 7, .5, { seg: 12 }]] },
  flamingo: { about: 'inflatable flamingo', tags: 'pool', mats: { p: 'aoa_pink', b: 'aoa_black' },
    parts: [['cyl', 'p', [0, 0, 0], 9, 5, { seg: 12 }], ['cyl', 'p', [0, -6, 5], 2, 16], ['ball', 'p', [0, -4, 22], 3.2], ['cyl', 'b', [0, -1, 21], 1, 3, { r2: 0, rot: [90, 0, 0] }]] },
  deckchair: { about: 'striped deck chair', tags: 'pool', mats: { f: 'aoa_teak', c: 'aoa_canvasB' }, parts: [['box', 'f', [0, 0, 0], [10, 14, 6]], ['box', 'c', [0, -4, 6], [9, 3, 12], { rot: [20, 0, 0] }]] },
  slotmachine: { about: 'slot machine', tags: 'casino', mats: { b: 'aoa_red', g: 'aoa_gold', s: 'aoa_glass', n: 'aoa_neonC' },
    parts: [['box', 'b', [0, 0, 0], [14, 12, 28]], ['box', 's', [0, 6.1, 14], [10, .5, 8]], ['box', 'n', [0, 6.1, 24], [12, .5, 3]], ['box', 'g', [0, 0, 28], [15, 13, 3]], ['cyl', 'g', [8, 0, 16], .8, 8]] },
  bjtable: { about: 'blackjack table, half-moon felt', tags: 'casino', mats: { f: 'aoa_felt', w: 'aoa_teak', g: 'aoa_gold' },
    parts: [['cyl', 'w', [0, 0, 0], 5, 12], ['cyl', 'f', [0, 0, 12], 22, 2, { sq: .6, seg: 16 }], ['cyl', 'g', [0, 0, 11.5], 23, .8, { sq: .62, seg: 16 }]] },
  roulettetable: { about: 'roulette table with its wheel', tags: 'casino', mats: { f: 'aoa_felt', w: 'aoa_teak', g: 'aoa_gold', k: 'aoa_black' },
    parts: [['box', 'w', [0, 0, 0], [44, 20, 12]], ['box', 'f', [0, 0, 12], [44, 20, 1]], ['cyl', 'w', [-14, 0, 13], 8, 3, { seg: 16 }], ['cyl', 'k', [-14, 0, 15], 6, 1, { seg: 16 }], ['cyl', 'g', [-14, 0, 16], 1, 3]] },
  cashier: { about: 'cashier cage', tags: 'casino', mats: { w: 'aoa_teak', g: 'aoa_gold', s: 'aoa_glass' },
    parts: [['box', 'w', [0, 0, 0], [30, 10, 16]], ['box', 's', [0, 0, 16], [30, 1, 14]], ['box', 'g', [0, 0, 30], [32, 12, 3]]] },
  neonsign: { about: 'neon sign', tags: 'casino', mats: { b: 'aoa_black', n: 'aoa_neonP', c: 'aoa_neonC' }, parts: [['box', 'b', [0, 0, 0], [30, 2, 12]], ['box', 'n', [0, 1.1, 6], [26, .5, 2]], ['box', 'c', [0, 1.1, 2.5], [20, .5, 1.5]]] },
  velvetrope: { about: 'velvet rope on brass posts', tags: 'casino', mats: { g: 'aoa_gold', r: 'aoa_red' }, parts: [['mirror', 'x', ['cyl', 'g', [10, 0, 0], 1, 10]], ['box', 'r', [0, 0, 8], [20, 1, 1.2]]] },
  shopfront: { about: 'shop facade with an awning', tags: 'town', mats: { w: 'aoa_cream', a: 'aoa_canvasR', g: 'aoa_glass', d: 'aoa_teak' }, params: {},
    parts: [['box', 'w', [0, 0, 0], [60, 10, 44]], ['box', 'g', [-16, 5.1, 6], [18, .5, 22]], ['box', 'g', [16, 5.1, 6], [18, .5, 22]], ['box', 'd', [0, 5.1, 0], [12, .5, 30]], ['box', 'a', [0, 9, 34], [62, 10, 2], { rot: [-18, 0, 0] }]] },
  icecreamcart: { about: 'ice cream cart with umbrella', tags: 'town', mats: { c: 'aoa_white', s: 'aoa_canvasP', p: 'aoa_chrome' },
    parts: [['box', 'c', [0, 0, 4], [20, 10, 12]], ['mirror', 'x', ['cyl', 'p', [8, 5, 0], 3, 1, { rot: [0, 90, 0] }]], ['cyl', 'p', [0, 0, 16], .7, 20], ['cyl', 's', [0, 0, 32], 12, 4, { r2: 0, seg: 8 }]] },
  planter: { about: 'planter box with flowers', tags: 'town', mats: { b: 'aoa_teak', f: 'leaves' }, parts: [['box', 'b', [0, 0, 0], [16, 8, 7]], ['ball', 'f', [0, 0, 9], 6, { sz: .6 }]] },
  wardrobe: { about: 'white wardrobe', tags: 'villa', mats: { w: 'aoa_white', g: 'aoa_gold' }, parts: [['box', 'w', [0, 0, 0], [24, 10, 36]], ['box', 'g', [-1.5, 5.1, 18], [1, .5, 4]], ['box', 'g', [1.5, 5.1, 18], [1, .5, 4]]] },
  desk: { about: 'writing desk', tags: 'villa', mats: { w: 'aoa_teak' }, parts: [['box', 'w', [0, 0, 12], [24, 12, 2]], ['mirror', 'xy', ['box', 'w', [10, 4.5, 0], [2, 2, 12]]], ['box', 'w', [6, 0, 6], [10, 11, 6]]] },
  mailbox: { about: 'mailbox on a post', tags: 'villa', mats: { p: 'aoa_teak', b: 'aoa_canvasB', f: 'aoa_red' }, parts: [['box', 'p', [0, 0, 0], [2, 2, 16]], ['box', 'b', [0, 0, 16], [6, 10, 6]], ['box', 'f', [3.5, -2, 20], [1, 1, 6]]] },
  rug: { about: 'round rug', tags: 'villa', mats: { r: 'aoa_canvasT' }, parts: [['cyl', 'r', [0, 0, 0], 22, .4, { sq: .7, seg: 16 }]] },
  seaplane: { about: 'seaplane on floats', tags: 'dock', mats: { b: 'aoa_white', s: 'aoa_gold', f: 'aoa_canvasR' },
    parts: [['cyl', 'b', [0, 0, 12], 6, 44, { rot: [90, 0, 90] }], ['box', 's', [0, 0, 18], [70, 12, 1.5]], ['mirror', 'x', ['box', 'f', [12, 0, 0], [4, 40, 4]]], ['mirror', 'x', ['box', 'b', [12, 0, 4], [1, 2, 8]]], ['box', 'f', [0, -22, 14], [2, 6, 12]]] },
  lighthouse: { about: 'striped lighthouse', tags: 'island', mats: { w: 'aoa_white', r: 'aoa_red', l: 'aoa_lamp' },
    parts: [['cyl', 'w', [0, 0, 0], 9, 20, { r2: 8 }], ['cyl', 'r', [0, 0, 20], 8, 20, { r2: 7 }], ['cyl', 'w', [0, 0, 40], 7, 18, { r2: 6 }], ['cyl', 'l', [0, 0, 58], 5, 7], ['cyl', 'r', [0, 0, 65], 6, 5, { r2: 0 }]] },
  bed: E.SHAPES.bed,
  barstool: { about: 'bar stool', tags: 'bar', mats: { s: 'aoa_canvasR', p: 'aoa_chrome' }, parts: [['cyl', 'p', [0, 0, 0], .8, 12], ['cyl', 's', [0, 0, 12], 3.2, 1.6]] },
  chandelier2: { about: 'casino chandelier (hangs high)', tags: 'casino', mats: { g: 'aoa_gold', l: 'aoa_lamp' }, lights: [[0, 0, 60, '#ffd890', 90]], parts: [['cyl', 'g', [0, 0, 64], 10, 2, { seg: 10 }], ['ring', 6, 9, ['ball', 'l', [0, 0, 62], 1.6]], ['cyl', 'g', [0, 0, 66], .5, 20]] },
  torchpost: { about: 'tiki torch', tags: 'beach', mats: { w: 'aoa_bamboo', b: 'aoa_thatch' }, flames: [[0, 0, 30, 4, 8]], lights: [[0, 0, 32, '#ffa050', 70]], parts: [['cyl', 'w', [0, 0, 0], 1, 26], ['cyl', 'b', [0, 0, 26], 2.2, 4, { r2: 2.8 }]] },
  floodlight: { about: 'floodlight mast', tags: 'beach', mats: { p: 'aoa_chrome', l: 'aoa_lamp' }, lights: [[0, 0, 70, '#fff4d8', 160]], parts: [['cyl', 'p', [0, 0, 0], 1.5, 66], ['box', 'p', [0, 0, 66], [16, 4, 8]], ['row', 3, [5, 0, 0], ['box', 'l', [0, 2.1, 68], [4, .5, 4]]]] },
  banner: { about: 'Fortuna Cup banner on poles', tags: 'beach', mats: { p: 'aoa_chrome', c: 'aoa_canvasY', r: 'aoa_canvasR' }, parts: [['mirror', 'x', ['cyl', 'p', [20, 0, 0], 1, 40]], ['box', 'c', [0, 0, 28], [40, .6, 12]], ['box', 'r', [0, .4, 32], [36, .4, 4]]] }
});
G.SLOTS = ['Morning', 'Afternoon', 'Night'];
/* ---- time of day: backdrop, ambient light and tint. tod: 'morning' | 'afternoon' | 'sunset' | 'night' ---- */
G.TOD = {
  morning: { sky: ['#7ec8f0', '#bfe6f4', '#ffe8c8'], sun: { x: .2, y: .22, r: 12, color: '#fff3c0' }, sea: '#2ec4c9', deep: '#1a8aa8', isl: '#3a9a8a', ambient: .95, tint: null },
  afternoon: { sky: ['#3a9ae0', '#7ccaf0', '#c8eef8'], sun: { x: .75, y: .12, r: 11, color: '#fffbe0' }, sea: '#1fb0c8', deep: '#0b6a8a', isl: '#2f8f6e', ambient: 1, tint: null },
  sunset: { sky: ['#4a2a7a', '#ff5f7a', '#ffb06a'], sun: { x: .5, y: .48, r: 16, color: '#ffd36a' }, sea: '#c86a6a', deep: '#5a3a7a', isl: '#4a2a5a', ambient: .8, tint: '#ff9e5e' },
  night: { sky: ['#0a0c24', '#14163a', '#2a2a5a'], moon: { x: .78, y: .16, r: 8, color: '#f0f0d8' }, stars: 70, sea: '#14304a', deep: '#0a1a30', isl: '#101a2a', ambient: .38, tint: null }
};
G.backdrops = {};
G.backdrop = (tod, weather) => {
  const key = tod + ':' + (weather || 'sunny'); if (G.backdrops[key]) return G.backdrops[key];
  const T = G.TOD[tod] || G.TOD.afternoon, rain = weather === 'rain', cloudy = weather === 'cloudy' || rain;
  const sky = rain ? ['#5a6a80', '#8a9ab0', '#b8c4d0'] : cloudy && tod !== 'night' ? T.sky.map(c => E.mix ? E.mix(c, '#c8d0dc', .35) : c) : T.sky;
  const o = { sky, stars: T.stars, starsY: .5, layers: [
    { kind: 'clouds', color: rain ? '#7a8aa0' : tod === 'sunset' ? '#ff9ea8' : tod === 'night' ? '#2a2e50' : '#ffffff', y: .2, height: cloudy ? .2 : .1, parallax: .05, drift: 3 },
    { kind: 'mountains', color: T.isl, y: .56, height: .1, parallax: .08, seed: 7 },
    { kind: 'hills', color: E.shade(T.isl, -.15), y: .6, height: .05, parallax: .12, seed: 3 },
    { kind: 'sea', color: T.sea, y: .6, height: .4, parallax: .2 }] };
  if (!rain && T.sun) o.sun = T.sun; if (T.moon) o.moon = T.moon;
  return (G.backdrops[key] = new E.Backdrop(o));
};
G.todOf = (slot, day, weather) => slot === 2 ? 'night' : slot === 0 ? 'morning' : (day === 5 || weather === 'golden') ? 'sunset' : 'afternoon';
/** apply a time of day's light to the game */
G.applyLight = (tod, weather, force) => {
  const L = G.game.lights, T = G.TOD[tod] || G.TOD.afternoon;
  L.enabled = tod === 'night' || tod === 'sunset' || weather === 'rain' || !!force;
  L.ambient = weather === 'rain' && tod !== 'night' ? .72 : T.ambient;
  if (tod === 'sunset') L.ambient = .9;
};
/* ---- the court: one TileMap for the beach and the match. 44 x 24 tiles; rows 0-2 sea, 3 wet sand, the rest sand ---- */
G.COURT = { X0: 224, X1: 480, NET_X: 352, NET_H: 44, Y0: 128, Y1: 256, CY: 192, W: 704, H: 384 };
const C_ = G.COURT;
G.sandTex = (x, y, tag) => {
  const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5 + E.noise2(x * .2, y * .2) * .2;
  if (tag === 'sea') { const w = E.noise2(x * .03, y * .1); const k = (y / 48); return [20 + w * 10 + n * 6, 150 + k * 40 + w * 20 + n * 8, 180 + k * 20 + w * 14 + n * 8]; }
  if (tag === 'wet') { const foam = (Math.sin(x * .09 + y * .3) > .8 && (y % 16) < 4) ? 40 : 0; return [196 + n * 14 + foam, 158 + n * 12 + foam, 108 + n * 10 + foam]; }
  if (tag === 'board') { const pl = Math.floor(x / 6) % 2; return [200 + pl * 12 + n * 10, 176 + pl * 10 + n * 10, 140 + n * 8]; }
  if (tag === 'court') {
    const ex = Math.min(Math.abs(x - C_.X0), Math.abs(x - C_.X1)), ey = Math.min(Math.abs(y - C_.Y0), Math.abs(y - C_.Y1));
    const inX = x >= C_.X0 - 1 && x <= C_.X1 + 1, inY = y >= C_.Y0 - 1 && y <= C_.Y1 + 1;
    if ((ex < 1.2 && inY) || (ey < 1.2 && inX)) return [40 + n * 10, 110 + n * 10, 220 + n * 10];
  }
  const ripple = Math.sin(x * .25 + E.noise2(x * .02, y * .02) * 6) * 6;
  return [243 + n * 18 + m * 16 + ripple, 217 + n * 16 + m * 14 + ripple, 164 + n * 14 + m * 10 + ripple * .6];
};
G.courtMap = () => {
  if (G._courtMap) return G._courtMap;
  const rows = []; for (let r = 0; r < 24; r++) rows.push((r < 3 ? '~' : r === 3 ? 'w' : 'c').repeat(44));
  G._courtMap = new E.TileMap({ rows, legend: { '~': { floor: 'sea', block: true }, w: { floor: 'wet' }, c: { floor: 'court' } }, floorTex: G.sandTex, outside: false, ao: 3 });
  return G._courtMap;
};
/* ---- effects ---- */
G.fx = {
  hearts(x, y, z, n = 6) { const P = G.game.particles; for (let i = 0; i < n; i++) P.text(x + (G.rng('cosmetic') - .5) * 16, y, z + G.rng('cosmetic') * 8, '♥', ['#ff5f7a', '#ff8ac8', '#ffd36a'][i % 3], { bounce: false }); },
  confetti(x, y, z, n = 40) { G.game.particles.bits(x, y, z, n, ['#ff5f7a', '#ffd36a', '#5ff0ff', '#7cff5a', '#ffffff']); },
  sparkle(x, y, z, n = 8) { G.game.particles.glints(x, y, z, n, '#fff3c0'); },
  splash(x, y, z = 0) { const P = G.game.particles; P.bits(x, y, z + 2, 16, ['#9ff3e8', '#ffffff', '#2ec4c9']); P.ring(x, y, 3, 18, '#e8ffff', .45); },
  sand(x, y, n = 8) { G.game.particles.dust(x, y, 0, n); },
  firework(x, y, z) { const P = G.game.particles, c = ['#ff5f7a', '#ffd36a', '#5ff0ff', '#7cff5a'][Math.floor(G.rng('cosmetic') * 4)]; P.sparks(x, y, z, 26, null, { color: c }); P.glints(x, y, z, 12, c); G.sfx('firework'); },
  coins(x, y, z, n = 30) { G.game.particles.bits(x, y, z, n, ['#ffd36a', '#fff3c0', '#c89020']); }
};
