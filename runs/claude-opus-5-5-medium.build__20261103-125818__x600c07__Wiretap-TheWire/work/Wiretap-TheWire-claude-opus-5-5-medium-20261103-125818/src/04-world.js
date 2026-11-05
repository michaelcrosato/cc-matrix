// WIRETAP: the world. Penn Row (App. A): the TileMap, wall types, floors, shapes (cars, payphones, poles), store signs,
// street lamps, the phone wires with the sneakers over Gaither & Ridley, Felton's memorial, moods by time of day.
const ROWS = [
  '#######xx######################xx########################xx#############',
  '#-----.==.--------------------.==.----------------------.==.-----------#',
  '#-----.==.--------------------.==.----------------------.==.-----------#',
  ...Array(9).fill('#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#'),
  '#......==......................==........................==............#',
  'x=====.==.====================.==.======================.==.===========x',
  'x=====.==.====================.==.======================.==.===========x',
  '#......==......................==........................==............#',
  '#RRRRR.==.RRRPPPFFFRRRVVVRRRPP.==.PPPRRRFFFRRRRRRVVVFFFR.==.HHHHHHHHTTT#',
  '#RRRRR.==.RRRPPPFFFRRRVVVRRRPP.==.PPPRRRFFFRRRRRRVVVFFFR.==.HHHHHHHHTTT#',
  '#RRRRR.==.RRRPPPFFFRRRVVVRRRPP.==.PPPRRRFFFRRRRRRVVVFFFR.==.HHHHHHHHTTT#',
  '#RRRRR.==.RRRPPPFFFRRRVVVRRRPP.==.PPPRRRFFFRRRRRRVVVFFFR.==.HHHHHHHHHHH#',
  '#-----.==.--------------------.==.----------------------.==.HHHHHHHHHHH#',
  '#-----.==.--------------------.==.----------------------.==.HHHHHHHHHHH#',
  ...Array(4).fill('#QQQQQ.==.FFFRRRRRBBBBRRRRSSSS.==.LLLLEEEEEEMMMMMM$$$$$$.==.HHHHHHHHHHH#'),
  '#......==......................==........................==............#',
  'x=====.==.====================.==.======================.==.===========x',
  'x=====.==.====================.==.======================.==.===========x',
  'x=====.==.====================.==.======================.==.===========x',
  '#......==......................==........................==............#',
  '#RRRRR.==.RRRFFFPPPRRRVVVRVVVV.==.KKKKRRRFFFRRRPPPRRRRRR.==.fff,,ffffff#',
  '#RRRRR.==.RRRFFFPPPRRRVVVRVVVV.==.KKKKRRRFFFRRRPPPRRRRRR.==.f,,,,,,,,,,#',
  '#RRRRR.==.RRRFFFPPPRRRVVVRVVVV.==.KKKKRRRFFFRRRPPPRRRRRR.==.f,,,,,,,,,,#',
  '#RRRRR.==.RRRFFFPPPRRRVVVRVVVV.==.KKKKRRRFFFRRRPPPRRRRRR.==.f,,,,,,,,,,#',
  '#RRRRR.==.PPPRRRFFFRRRRFFRVvvV.==.RRRR------------------.==.f,,,,,,,,,,#',
  '#RRRRR.==.PPPRRRFFFRRRRFF-vvvv.==.RRRR::::::::::::::::::.==.f,,,,,VVVVV#',
  '#RRRRR.==.PPPRRRFFFRRRRFF-VvvV.==.RRRRCCCCCCCC::CCCCCCCC.==.f,,,,,VVVVV#',
  '#RRRRR.==.PPPRRRFFFRRRRFF-RRRR.==.FFFFCCCCCCCC::CCCCCCCC.==.f,,,,,VVVVV#',
  '#RRRRR.==.PPPRRRFFFRRRRFF-RRRR.==.FFFFCCCCCCCC::CCCCCCCC.==.f,,,,,VVVVV#',
  '#RRRRR.==.PPPRRRFFFRRRRFF-RRRR.==.FFFFCCCCCCCC::CCCCCCCC.==.f,,,,,VVVVV#',
  '#RRRRR.==.PPPRRRFFFRRRRFF-RRRR.==.FFFFCCCC::::::::::CCCC.==.f,,,,,VVVVV#',
  '#-----.==.--------------------.==.----CCCC::::::::::CCCC.==.-----------#',
  '#-----.==.--------------------.==.----CCCC::::::::::CCCC.==.-----------#',
  '#RRRRR.==......................==.RRRRCCCC:::pppp:::CCCC.==............#',
  '#RRRRR.==......................==.RRRRCCCC:::pppp:::CCCC.==............#',
  '#RRRRR.==.fffffffbbfffffffRRRR.==.RRRRCCCC:::pppp:::CCCC.==............#',
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC:::pppp:::::::.==............#',
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GGGGGG.==............#',
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GggggG.==............#',
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GggggG.==.......kkkkk#',
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GggggG.==.......kkkkk#',
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GggggG.==.......kkkkk#',
  '#RRRRR.==.ffffffffffffffffRRRR.==.RRRRCCCC::::::::GGGGGG.==.......kkkkk#',
  '#RRRRR.==.RRRRRRRRRRRRRRRRRRRR.==.RRRRffffffffffffffffff.==.......kkkkk#',
  '#######xx######################xx########################xx#############'
];
E.MATERIALS.formstone = '#8a8680 stones size=5';
E.MATERIALS.paint = { color: '#d8d0c0', pattern: 'glaze' };
const WT = { '#': 1, R: 2, F: 3, P: 4, V: 5, S: 6, L: 7, E: 8, M: 9, '$': 10, K: 11, B: 12, Q: 13, H: 14, T: 15, C: 16, G: 17, k: 18 };
const STORE = (top, side, face = 'brick') => ({ h: 32, top, side, face, roof: 'slab', cut: true, windows: { lit: .5, w: 8, h: 10, from: 6 }, door: { chance: .3, color: '#2a2420' } });
const TYPES = {
  1: { h: 56, top: '#3a2a26', side: '#5a3a30', face: 'brick', roof: 'slab', cut: true, windows: { lit: .15 } },
  2: { h: 40, top: '#4a3a34', side: '#7a3b2e', face: 'brick', roof: 'slab', cut: true, windows: { lit: .25 }, door: { chance: .35, color: '#4a2a1e' } },
  3: { h: 40, top: '#4a4844', side: '#8a8680', face: 'formstone', roof: 'slab', cut: true, windows: { lit: .25 }, door: { chance: .35, color: '#3a2a20' } },
  4: { h: 36, top: '#5a5048', side: '#b8a27a', face: 'plaster', roof: 'slab', cut: true, windows: { lit: .3 }, shutters: '#3a5a6a' },
  5: { h: 40, top: '#3a2a24', side: '#4a2e26', face: 'brick', roof: 'slab', cut: true, windows: { lit: 0 }, shutters: '#b08a5a' },
  6: STORE('#4a3a30', '#8a4a32'), 7: STORE('#3a4048', '#5a7a9a', 'plaster'), 8: STORE('#3a3a40', '#6a6a7a', 'plaster'), 9: STORE('#4a3428', '#a8642a'),
  10: STORE('#3a3a30', '#7a8a5a', 'plaster'), 11: STORE('#4a3020', '#b04a2a'), 12: STORE('#2a3a4a', '#4a6a8a'), 13: STORE('#3a2a2a', '#6a3a3a'),
  14: { h: 64, top: '#5a5650', side: '#8a847a', face: 'stone', roof: 'slab', cut: true, arch: { chance: 1 }, windows: { lit: .5 } },
  15: { h: 88, top: '#5a5650', side: '#8a847a', face: 'stone', roof: 'slab', cut: true, windows: { w: 3, h: 10, step: 22, lit: .5 } },
  16: { h: 44, top: '#5a4a3a', side: '#9a7a5a', face: 'brick', roof: 'slab', cut: true, windows: { lit: .35 }, door: { chance: .3 }, balcony: { z: 22, color: '#3a3430' } },
  17: { h: 24, top: '#4a4a4a', side: '#6a6a6a', face: 'metal', roof: 'plain', cut: true },
  18: { h: 20, top: '#d8d8d0', side: '#e8e8e0', face: 'plaster', roof: 'plain', cut: true }
};
const LEGEND = Object.assign({}, ...Object.entries(WT).map(([c, n]) => ({ [c]: n })),
  { '.': { floor: 'walk' }, '=': { floor: 'road' }, '-': { floor: 'alley' }, ',': { floor: 'lot' }, ':': { floor: 'court' }, b: { floor: 'ball' }, p: { floor: 'play' },
    v: { floor: 'vacant' }, g: { floor: 'garage' }, f: { floor: 'fence', block: true }, x: { floor: 'edge', block: true } });
const hash2 = (x, y) => { let k = (x * 374761393 + y * 668265263) | 0; k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967295; };
function floorTex(x, y, tag) {
  const ix = Math.floor(x), iy = Math.floor(y), n = hash2(ix, iy), mx = ((ix % 16) + 16) % 16, my = ((iy % 16) + 16) % 16;
  const sh = (c, k) => [c[0] + k, c[1] + k, c[2] + k];
  switch (tag) {
    case 'walk': { if (mx === 0 || my === 0) return [104, 102, 98]; const c = [132, 130, 124]; if (hash2(ix >> 4, iy >> 4) < .2 && Math.abs(mx - my) < 1) return [96, 94, 90]; return sh(c, Math.round((n - .5) * 14)); }
    case 'road': {
      if (iy >= 447 && iy <= 448 && (ix % 24) < 12) return [190, 160, 60];   // Ridley's centre line
      if ((iy >= 207 && iy <= 208) && (ix % 24) < 12) return [170, 150, 70];
      const inX = (ix >= 30 * T && ix < 34 * T) || (ix >= 6 * T && ix < 10 * T) || (ix >= 56 * T && ix < 60 * T), inY = (iy >= 13 * T && iy < 15 * T) || (iy >= 27 * T && iy < 30 * T);
      if (inX && inY && ((inX && (ix % 6) < 3) )) { if ((iy >= 27 * T && iy < 27 * T + 4) || (iy > 30 * T - 5 && iy < 30 * T) || (iy >= 13 * T && iy < 13 * T + 4) || (iy > 15 * T - 5 && iy < 15 * T)) return [170, 168, 160]; }
      return sh([46, 46, 52], Math.round((n - .5) * 12) + (n > .97 ? 18 : 0));
    }
    case 'alley': return n > .985 ? [60, 82, 44] : (hash2(ix >> 3, iy >> 3) > .8 ? [50, 48, 46] : sh([62, 60, 58], Math.round((n - .5) * 12)));
    case 'lot': return n > .9 ? [70, 92, 46] : sh([92, 78, 58], Math.round((n - .5) * 22));
    case 'court': return (mx % 8 === 0 || my % 8 === 0) ? [94, 86, 78] : sh([122, 112, 100], Math.round((n - .5) * 10));
    case 'ball': { const lx = ix - 11 * T, ly = iy - 47 * T; if (lx === 4 || ly === 4 || lx === 14 * T - 4 || ly === 6 * T - 4 || (Math.abs(lx - 7 * T) < 1)) return [200, 196, 180]; return sh([60, 70, 82], Math.round((n - .5) * 10)); }
    case 'play': return sh([140, 72, 62], Math.round((n - .5) * 14));
    case 'vacant': return (my % 5 === 0) ? [44, 32, 26] : sh([78, 58, 42], Math.round((n - .5) * 18));
    case 'garage': return hash2(ix >> 3, iy >> 3) > .7 ? [70, 70, 68] : sh([104, 104, 100], Math.round((n - .5) * 10));
    case 'fence': return sh([80, 70, 56], Math.round((n - .5) * 16));
    case 'edge': return sh([56, 56, 60], Math.round((n - .5) * 8));
    default: return sh([120, 118, 112], Math.round((n - .5) * 10));
  }
}

/* shapes (docs/ASSETS.md format), written facing south */
const car = (body, glass = '#20242a', extra = []) => ({ about: 'car', tags: 'vehicle', mats: { c: body + ' glaze', g: glass + ' glaze', w: '#18181a', l: '#e8d890' },
  parts: [['box', 'c', [0, 0, 3], [18, 42, 9]], ['box', 'g', [0, -1, 12], [16, 22, 7]], ['box', 'c', [0, -1, 18], [15, 20, 1.5]], ['mirror', 'xy', ['box', 'w', [8.5, 13, 0], [2, 8, 6]]], ['mirror', 'x', ['box', 'l', [6, 21, 7], [3, 1, 2]]], ...extra] });
Object.assign(E.SHAPES, {
  sedan: car('#5a6a7a'), chevy: car('#c8b48a'), patrol: car('#e8ecf0', '#20242a', [['box', '#2a4aa8', [0, 0, 7], [18.5, 30, 3]], ['box', '#2a2a30', [0, -1, 20], [12, 4, 2.5]]]),
  montecarlo: car('#5a1a22'), deadbuick: { about: 'dead Buick, flat tires', tags: 'vehicle', mats: { c: '#6a6a4a metal', g: '#303428', w: '#141414' },
    parts: [['box', 'c', [0, 0, 1], [18, 42, 9]], ['box', 'g', [0, -1, 10], [16, 22, 6]], ['mirror', 'xy', ['box', 'w', [8.5, 13, 0], [2, 8, 3]]]] },
  hearse: { about: 'black hearse', tags: 'vehicle', mats: { c: '#141418 glaze', g: '#3a3a44 glaze', w: '#0a0a0a', t: '#c8c8c8' },
    parts: [['box', 'c', [0, 0, 3], [18, 54, 9]], ['box', 'c', [0, -8, 12], [16, 34, 9]], ['box', 'g', [0, 10, 12], [16, 8, 7]], ['mirror', 'x', ['box', 't', [8.2, -8, 15], [.5, 20, 1]]], ['mirror', 'xy', ['box', 'w', [8.5, 17, 0], [2, 8, 6]]]] },
  van: { about: 'white surveillance van', tags: 'vehicle', mats: { c: '#e0ddd4 glaze', g: '#20242a glaze', w: '#18181a' },
    parts: [['box', 'c', [0, -4, 3], [19, 40, 20]], ['box', 'c', [0, 18, 3], [19, 10, 12]], ['box', 'g', [0, 19, 15], [17, 6, 6]], ['mirror', 'xy', ['box', 'w', [9, 14, 0], [2, 8, 6]]]] },
  boxtruck: { about: 'Harstad Auto Parts box truck', tags: 'vehicle', mats: { c: '#e8e8e0', r: '#b02a22', g: '#20242a glaze', w: '#141414', k: '#3a3a3a' },
    parts: [['box', 'c', [0, -8, 4], [22, 46, 26]], ['box', 'r', [0, -8, 18], [22.4, 46.4, 5]], ['box', 'k', [0, 20, 3], [20, 14, 14]], ['box', 'g', [0, 22, 11], [18, 8, 5]], ['mirror', 'xy', ['box', 'w', [10, 18, 0], [2, 9, 7]]]] },
  bus: { about: 'MTA bus', tags: 'vehicle', mats: { c: '#d8d4c8 glaze', s: '#2a5a9a', g: '#20242a glaze', w: '#141414' },
    parts: [['box', 'c', [0, 0, 4], [22, 92, 26]], ['box', 's', [0, 0, 9], [22.4, 92.4, 3]], ['box', 'g', [0, 0, 16], [22.6, 80, 7]], ['mirror', 'xy', ['box', 'w', [10, 32, 0], [2, 10, 8]]]] },
  burnedcar: { about: 'burned-out car', tags: 'vehicle', mats: { c: '#3a2a22 metal', k: '#141210' }, parts: [['box', 'c', [0, 0, 0], [18, 42, 9]], ['box', 'k', [0, -1, 9], [15, 20, 5]]] },
  payphone: { about: 'payphone on a pole', tags: 'street', mats: { m: '#7a7a80 metal', b: '#2a4a8a', k: '#141414' },
    parts: [['cyl', 'm', [0, 0, 0], 1.2, 30], ['box', 'b', [0, 1, 16], [10, 6, 14]], ['box', 'k', [0, 4, 19], [6, 1, 8]], ['box', 'b', [0, 1, 30], [12, 8, 2]]] },
  pole: { about: 'utility pole', tags: 'street', mats: { w: '#4a3a2a bark', m: '#2a2a2a' }, parts: [['cyl', 'w', [0, 0, 0], 1.6, 72], ['box', 'w', [0, 0, 66], [16, 1.6, 1.6]]] },
  stoop: { about: 'marble steps', tags: 'street', mats: { s: '#d8d4cc stones' }, parts: [['box', 's', [0, 0, 0], [12, 12, 3]], ['box', 's', [0, -2, 3], [12, 8, 3]], ['box', 's', [0, -4, 6], [12, 4, 3]]] },
  sawhorse: { about: 'police sawhorse', tags: 'street', mats: { w: '#e8e4d8', r: '#c83a2a' }, parts: [['box', 'r', [0, 0, 10], [16, 2, 3]], ['mirror', 'x', ['box', 'w', [6, 0, 0], [1.5, 6, 10]]]] },
  trashbag: { about: 'black trash bag', tags: 'street', mats: { b: '#1a1a1e glaze' }, parts: [['ball', 'b', [0, 0, 4], 5, { sz: .8 }], ['cyl', 'b', [0, 0, 7], 1.5, 3, { r2: 0 }]] },
  dumpster: { about: 'green dumpster', tags: 'street', mats: { d: '#2a5a3a metal' }, parts: [['box', 'd', [0, 0, 0], [24, 14, 14]], ['wedge', 'd', [0, 0, 14], [24, 14, 3]]] },
  hoop: { about: 'basketball hoop', tags: 'street', mats: { m: '#5a5a60 metal', b: '#e8e8e0', r: '#d8602a' }, parts: [['cyl', 'm', [0, -6, 0], 1.2, 40], ['box', 'b', [0, -4, 36], [14, 1, 10]], ['cyl', 'r', [0, 0, 36], 3.5, .8]] },
  gaspump: { about: 'old gas pump', tags: 'street', mats: { p: '#c83a2a', w: '#e8e4d8' }, parts: [['box', 'p', [0, 0, 0], [8, 6, 20]], ['box', 'w', [0, 3.2, 12], [6, .5, 6]]] },
  stroller: { about: 'baby stroller full of loosies', tags: 'street', mats: { f: '#5a5a60 metal', c: '#3a5a8a cloth', w: '#141414' }, parts: [['box', 'c', [0, 0, 6], [8, 12, 7]], ['mirror', 'xy', ['cyl', 'w', [3.5, 5, 0], 1.6, 1]], ['box', 'f', [0, -7, 10], [7, 1, 6]]] },
  coop: { about: 'pigeon coop', tags: 'roof', mats: { w: '#7a6a4a planks', m: '#9a9a90' }, parts: [['box', 'w', [0, 0, 0], [14, 10, 10]], ['box', 'm', [0, 5.2, 2], [12, .5, 6]], ['wedge', 'w', [0, 0, 10], [15, 11, 4]]] },
  mattress: { about: 'old mattress', tags: 'street', mats: { m: '#b8a888 cloth' }, parts: [['box', 'm', [0, 0, 0], [16, 28, 3]]] },
  busshelter: { about: 'bus shelter', tags: 'street', mats: { m: '#5a5a60 metal', g: '#8aa0b0 glaze' }, parts: [['box', 'g', [0, -5, 0], [26, 1, 22]], ['box', 'm', [0, 0, 22], [28, 12, 1.5]], ['mirror', 'x', ['box', 'm', [13, 0, 0], [1, 10, 22]]]] },
  sheetbody: { about: 'a body under a sheet', tags: 'scene', mats: { s: '#e8e4dc cloth' }, parts: [['box', 's', [0, 0, 0], [10, 26, 4]], ['ball', 's', [0, -10, 4], 3.5, { sz: .6 }]] },
  desk: { about: 'steel office desk', tags: 'office', mats: { d: '#6a6a5a metal', t: '#8a8a7a' }, parts: [['box', 't', [0, 0, 12], [26, 14, 2]], ['box', 'd', [8, 0, 0], [9, 13, 12]], ['box', 'd', [-11, 0, 0], [2, 13, 12]]] },
  filecab: { about: 'filing cabinet', tags: 'office', mats: { d: '#6a7068 metal' }, parts: [['box', 'd', [0, 0, 0], [10, 10, 24]]] },
  crt: { about: 'green CRT monitor', tags: 'office', mats: { b: '#c8c4b0', s: { color: '#3a8a3a', glow: 1 } }, parts: [['box', 'b', [0, 0, 0], [10, 10, 9]], ['box', 's', [0, 5.1, 2], [7, .5, 5]]] },
  reel: { about: 'reel-to-reel recorder', tags: 'office', mats: { b: '#3a3430 planks', r: '#9a9a9a metal' }, parts: [['box', 'b', [0, 0, 0], [16, 10, 8]], ['mirror', 'x', ['cyl', 'r', [4, 0, 8], 3.5, 1]]] },
  radiator: { about: 'iron radiator', tags: 'office', mats: { r: '#8a8a80 metal' }, parts: [['row', 6, [2.5, 0, 0], ['box', 'r', [0, 0, 0], [1.8, 5, 16]]]] },
  coffeemaker: { about: 'coffee maker', tags: 'office', mats: { b: '#1a1a1a', p: '#4a2a1a glaze' }, parts: [['box', 'b', [0, 0, 0], [6, 6, 9]], ['cyl', 'p', [0, 2, 1], 2, 4]] },
  corkboard: { about: 'case board', tags: 'office', mats: { c: '#a8794a', f: '#5a3a1a' }, parts: [['box', 'f', [0, 0, 8], [48, 2, 30]], ['box', 'c', [0, 1.2, 10], [45, .5, 26]]] },
  judgedesk: { about: "judge's desk", tags: 'office', mats: { d: '#4a2a1a planks' }, parts: [['box', 'd', [0, 0, 0], [34, 16, 15]], ['box', 'd', [0, 0, 15], [36, 18, 2]]] },
  stove: { about: 'kitchen stove', tags: 'home', mats: { w: '#e8e4d8 glaze', k: '#1a1a1a' }, parts: [['box', 'w', [0, 0, 0], [14, 12, 15]], ['box', 'k', [0, 0, 15], [12, 10, .5]]] }
});

/* points of interest (cells, App. A) */
const POI = {
  P1: [28, 26], P2: [35, 26], P3: [42, 30], post: [30, 32], postN: [30, 31], postS: [30, 34], v1412: [27.5, 36], v1412door: [29, 36], stash: [27, 36],
  felton: [30, 39], odessa: [33, 37], pockets: [27, 21], barber: [20, 26], mamab: [46, 26], mamabBack: [46, 21], lens: [50, 20], wireless: [40, 26],
  church: [64, 26], courtsE: [52, 47], breezeway: [46.5, 38], garageSide: [50, 50], garageRoll: [55, 50.5], garageIn: [52.5, 50.5], gas: [62, 48.5],
  lot: [64, 36], court: [17.5, 49], courtGate: [17.5, 45.5], strip: [20, 44.5], chevy: [34.5, 29.2], vanV1: [58, 45], vanV2: [62.5, 29], vanV3: [63, 33],
  buick: [32, 40], trashGate: [19, 45], handoff: [30, 35], tout: [31, 30.5], moeSpot: [33, 30.5], bench: [42, 30.6], market: [27.5, 26], carryout: [35, 30.5],
  dunmore: [30, 15], alleyMouth: [29, 21], edgeW: [1, 26.5], edgeE: [70, 26.5], edgeN: [31.5, 1], edgeS: [31.5, 54], edgeN2: [7.5, 1], edgeS2: [57.5, 54]
};
const P = id => C(POI[id][0], POI[id][1]);
const PHONES = { P1: POI.P1, P2: POI.P2, P3: POI.P3 };
const VANTAGE = [[42, 30], [36, 26], [35, 30], [27, 26], [20, 26], [29, 21], [40, 36], [22.5, 30], [25, 44], [30, 15], [34, 21], [24, 26]];
const DITCH = [{ id: 'can1', at: [30, 41], kind: 'trash can' }, { id: 'buick', at: [32, 40], kind: 'under the Buick' }, { id: 'drain', at: [30, 43], kind: 'storm drain', lost: true },
  { id: 'can2', at: [21, 44], kind: 'trash can' }, { id: 'window', at: [23, 30], kind: 'vacant window' }];
const PATROL_LOOP = [[7.5, 13.5], [7.5, 27.4], [57.5, 27.4], [57.5, 13.5]].map(([x, y]) => [(x) * T, (y) * T]);

/* the world: map, flow fields by destination, dressing, lights, moods */
const World = {
  map: null, flows: {}, lamps: [], poles: [], wires: [], signs: [], dress: [], solids: [], cars: [], night: false, mood: 'day', rain: 0, roofFade: {},
  build() {
    this.map = new E.TileMap({ rows: ROWS, legend: LEGEND, types: TYPES, floorTex, ao: 4, outside: '#202024' });
    const m = this.map;
    // parked cars and dressing (cells), solid where they stand
    const parked = [['chevy', 34.5, 28.3, 0], ['sedan', 12, 29.2, 0], ['sedan', 48, 29.2, Math.PI], ['sedan', 26, 12.2, 0], ['montecarlo', 37.5, 15.6, Math.PI],
      ['deadbuick', 32.5, 40, Math.PI / 2], ['burnedcar', 64, 38, .4], ['sedan', 8.5, 40, Math.PI / 2], ['sedan', 57.5, 36, -Math.PI / 2]];
    for (const [id, cx, cy, f] of parked) { const x = cx * T, y = cy * T, o = { facing: f }; this.cars.push([id, x, y, o]); m.solid(id, x, y, 0, o); }
    const D = this.dress;
    for (const id of ['P1', 'P2', 'P3']) { const [cx, cy] = POI[id]; D.push(['payphone', (cx + .5) * T, (cy + .5) * T - (cy === 26 ? 6 : -6), { facing: cy === 26 ? Math.PI / 2 : -Math.PI / 2 }]); }
    D.push(['busshelter', 43 * T, 30.75 * T, { facing: -Math.PI / 2 }], ['bench', 42.5 * T, 30.6 * T, { facing: -Math.PI / 2 }]);
    // stoops along rowhouse fronts (every 3 cells on Gaither and Ridley north)
    for (let cy = 32; cy <= 40; cy += 3) { D.push(['stoop', 29.6 * T, (cy + .5) * T, { facing: 0 }]); D.push(['stoop', 34.4 * T, (cy + .5) * T, { facing: Math.PI }]); }
    for (const [cx, cy] of [[30, 39], [33, 37]]) D.push(['stoop', (cx + .5) * T, (cy + .5) * T, { facing: cx === 30 ? 0 : Math.PI }]);
    for (let cx = 2; cx < 70; cx += 7) D.push(['trashcan', (cx + .5) * T, 20.3 * T, {}, 'prop']);
    D.push(['dumpster', 41 * T, 20.6 * T, { facing: 0 }], ['dumpster', 14 * T, 42.6 * T, { facing: 0 }], ['mattress', 61.5 * T, 40.5 * T, { facing: .3 }], ['coop', 35.5 * T, 36.5 * T, { facing: 0, z: 40 }],
      ['hoop', 11.5 * T, 49.5 * T, { facing: 0 }], ['hoop', 24.5 * T, 49.5 * T, { facing: Math.PI }], ['gaspump', 62.5 * T, 47.5 * T, { facing: 0 }], ['gaspump', 62.5 * T, 50.5 * T, { facing: 0 }],
      ['dumpster', 53 * T, 43 * T, { facing: 0 }], ['trashcan', 30.5 * T, 41.5 * T, {}, 'prop'], ['trashcan', 21.5 * T, 44.5 * T, {}, 'prop'], ['trashcan', 19.5 * T, 45.2 * T, {}, 'prop'], ['hydrant', 33.8 * T, 30.6 * T, {}, 'prop'], ['hydrant', 9.8 * T, 26.3 * T, {}, 'prop']);
    for (const d of D) if (d[0] !== 'trashcan' && d[0] !== 'hydrant' && d[0] !== 'coop' && d[0] !== 'stoop' && d[0] !== 'bench') m.solid(d[0], d[1], d[2], 0, d[3]);
    // street lamps on the sidewalks
    for (let cx = 3; cx < 70; cx += 6) { this.lamps.push([(cx + .5) * T, 26.2 * T], [(cx + 3.5) * T, 30.8 * T], [(cx + .5) * T, 12.2 * T], [(cx + 3.5) * T, 15.8 * T]); }
    for (let cy = 33; cy < 54; cy += 6) this.lamps.push([30.2 * T, (cy + .5) * T], [33.8 * T, (cy + 3.5) * T], [56.2 * T, (cy + .5) * T]);
    // utility poles: the alleys and Ridley's south sidewalk, wires between neighbours
    const line = (ys, xs) => { const pts = xs.map(x => [x * T, ys * T]); this.poles.push(...pts); for (let i = 1; i < pts.length; i++) this.wires.push([pts[i - 1], pts[i]]); };
    line(1.5, [3, 11, 19, 27, 35, 43, 51, 61, 69]); line(20.5, [3, 11, 19, 27, 35, 43, 51]); line(42.5, [3, 11, 19, 27, 36, 44, 52, 61, 69]); line(30.85, [2, 10, 18, 26, 29.5, 34.5, 42, 50, 62, 70]);
    // store signs: [text, x0, x1 (cells), the face's y (cells), facing south(+1)/north(-1), colour, neon]
    this.signs = [['GAITHER MARKET', 26, 30, 26, 1, '#c83a2a', 1], ['SUDS CITY', 34, 38, 26, 1, '#3a8ac8', 1], ['RIDLEY WIRELESS & PAGER', 38, 44, 26, 1, '#e8e8e8', 0], ['MAMA B\'S SOUL FOOD', 44, 50, 26, 1, '#e8a83a', 1],
      ['CHECKS CASHED', 50, 56, 26, 1, '#5ac85a', 1], ['FADES & GRADES', 18, 22, 26, 1, '#e8e8f0', 0], ['ABBOTT LIQUORS', 1, 6, 26, 1, '#e83a3a', 1], ['RIDLEY CARRYOUT', 34, 38, 31, -1, '#ffd84a', 1],
      ['GREATER HOPE BAPTIST', 61, 70, 26, 1, '#e8e0c8', 0], ['ARUNDEL GAS', 66, 71, 50, -1, '#c83a2a', 0], ['WINGS · FRIES · SUBS', 34, 38, 31.01, -1, '#ff8a3a', 1]];
    BUS.emit('worldBuilt');
  },
  flow(cx, cy) {
    cx = Math.floor(cx); cy = Math.floor(cy); const k = cx + ',' + cy;
    let f = this.flows[k]; if (!f) { f = this.flows[k] = new E.FlowField(this.map); f.update((cx + .5) * T, (cy + .5) * T); } else f.update((cx + .5) * T, (cy + .5) * T);
    return f;
  },
  walkable(x, y) { const m = this.map, c = m.toCell(x, y); return m.walkable(c[0] !== undefined ? c[0] : c.cx, c[1] !== undefined ? c[1] : c.cy); },
  /** set the mood: 'dawn' | 'day' | 'dusk' | 'night', rain 0..1 */
  setMood(mood, rain = 0) {
    this.mood = mood; this.night = mood === 'night' || mood === 'dawn'; this.rain = rain;
    const L = game.lights;
    L.enabled = mood !== 'day'; L.ambient = { dawn: .5, day: 1, dusk: .62, night: .4 }[mood];
    game.weather = rain ? { kind: 'rain', amount: rain, wind: .2, lightning: mood === 'night' ? .05 : 0 } : null;
    Amb.set(rain ? ['street', 'rain'] : mood === 'night' ? ['night'] : ['street']);
  },
  draw(r, o = {}) {
    const m = this.map; m.drawFloor(r); m.queueWalls(r);
    const L = game.lights, lit = this.mood !== 'day', t = game.time;
    for (const [id, x, y, op] of this.cars) r.shape(id, x, y, 0, op);
    for (const d of this.dress) { if (d[4] === 'prop') r.prop(d[0], d[1], d[2], 0, {}); else r.shape(d[0], d[1], d[2], d[3].z || 0, d[3]); }
    for (const [x, y] of this.lamps) r.prop('streetlamp', x, y, 0, { light: lit, cone: lit, halo: lit });
    for (const [x, y] of this.poles) r.shape('pole', x, y, 0, {});
    // phone wires: sagging spans between pole tops, sorted above the roofs; sneakers over Gaither & Ridley
    for (const [a, b] of this.wires) r.queue((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 66, g => {
      for (const off of [-5, 0, 5]) { let p0 = null; for (let i = 0; i <= 8; i++) { const u = i / 8, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) + off * .2, z = 66 + off * .1 - Math.sin(u * Math.PI) * 6; const p = r.w(x, y, z); if (p0) px.line(g, p0[0], p0[1], p[0], p[1], '#151517'); p0 = p; } }
    }, { bias: 30 });
    r.queue(31.8 * T, 30.85 * T, 58, g => { const p = r.w(31.8 * T, 30.85 * T, 61), s = Math.sin(t * 1.3) * 1.2; px.line(g, p[0], p[1] - 3, p[0] + s, p[1] + 2, '#151517'); px.rect(g, Math.round(p[0] + s - 3), Math.round(p[1] + 2), 3, 2, '#e8e4dc'); px.rect(g, Math.round(p[0] + s + 1), Math.round(p[1] + 3), 3, 2, '#e8e4dc'); }, { bias: 32 });
    // store signs, lit at night
    const fy = r.view.fy || 0;
    for (const [txt, x0, x1, fyc, dir, col, neon] of this.signs) {
      if (fy * dir <= 0.05) continue;
      const y = fyc * T + (dir > 0 ? 0 : 0), xm = (x0 + x1) / 2 * T;
      r.queue(xm, y + dir * 1, 24, g => {
        const a = r.w(x0 * T + 4, y, 30), b = r.w(x1 * T - 4, y, 30), c = r.w(x1 * T - 4, y, 21), d = r.w(x0 * T + 4, y, 21);
        px.poly(g, [a, b, c, d], '#1a1614'); const cx = Math.round((a[0] + c[0]) / 2), cy = Math.round((a[1] + c[1]) / 2) - 3;
        const w = E.font.width(txt, { font: 'tiny' }); if (w < Math.abs(b[0] - a[0]) + 20) E.font.text(g, txt, cx, cy, lit && neon && (Math.sin(t * 7 + x0) > -.95) ? col : E.shade(col, -.25), { align: 'center', font: 'tiny', outline: false });
      }, { emissive: lit && !!neon });
      if (lit && neon) L.add(xm, y + dir * 10, 20, 46, .5, { color: col });
    }
    // Felton's memorial: candles, flowers, a photo on the stoop
    if (o.memorial !== false) { const x = 30.6 * T, y = 39.5 * T; r.prop('candle', x - 3, y - 4, 3, { light: lit }); r.prop('candle', x + 3, y + 4, 3, { light: lit }); r.prop('flowers', x, y + 7, 0, { size: .8 }); r.prop('flowers', x + 2, y - 8, 0, { size: .7, color: '#e8e0f0' }); }
    // the fire drum in the lot at night
    if (this.mood === 'night') r.prop('firedrum', 63.5 * T, 34.5 * T, 0, { light: true });
    // a lit window flickers TV-blue on each block at night
    if (lit) for (const [x, y] of [[14, 31], [40, 31], [20, 12], [46, 16]]) L.add(x * T, y * T, 18, 26, .35 + Math.sin(t * 9 + x) * .12, { color: '#6a8aff' });
  },
  cellOf(p) { return [Math.floor(p.x / T), Math.floor(p.y / T)]; },
  floorAt(x, y) { return this.map.floorAt(x, y); }
};

