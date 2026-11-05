/* 04-data-world: the walkable places as data: each a TileMap built from a cell function (floor tags, walls), its floor
 * textures, the shapes and props that dress it (solid ones block walkers), NPC spots, interactables, exits, music and
 * ambience; and the island map's pins. Adding a place is a new entry here. */
const FT = {
  sand: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5, g = 236 + n * 26 + m * 22; return [g, g * .9, g * .68]; },
  sea: (x, y, d) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, k = clamp(d, 0, 1), c = E.hex(E.mix('#0b5a7a', '#2ec4c9', k)); return [c[0] + n * 12, c[1] + n * 12, c[2] + n * 12]; },
  pool: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, w = Math.sin(x * .21 + Math.sin(y * .09) * 2.2) + Math.sin(y * .17 + Math.sin(x * .07) * 2), line = Math.abs(w) < .12; return line ? [168, 240, 244] : [52 + n * 6 + w * 6, 178 + n * 8 + w * 10, 206 + w * 8]; },   // caustic lines on blue
  tile: (x, y) => { const gx = Math.floor(x) % 8, gy = Math.floor(y) % 8, n = E.hash2(Math.floor(x / 8), Math.floor(y / 8)) * 14; return gx === 0 || gy === 0 ? [188, 222, 224] : [226 - n, 244 - n * .5, 240]; },
  grass: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .08, y * .08) * .5; return [70 + n * 24 + m * 20, 160 + n * 30 + m * 26, 80 + n * 20]; },
  boards: (x, y) => { const row = Math.floor(y / 6), off = (row % 3) * 9, seam = Math.floor(y) % 6 === 0 || (Math.floor(x + off) % 28 === 0), n = E.hash2(row, Math.floor((x + off) / 28)) * 18 - 9, g = E.hash2(Math.floor(x), Math.floor(y)) * 10; return seam ? [150, 128, 100] : [214 + n + g, 196 + n + g, 166 + n + g]; },
  planks: (x, y) => { const row = Math.floor(y / 5), off = (row % 4) * 11, seam = Math.floor(y) % 5 === 0 || (Math.floor(x + off) % 32 === 0), n = E.hash2(row, Math.floor((x + off) / 32)) * 16 - 8; return seam ? [120, 76, 48] : [196 + n, 138 + n, 90 + n * .6]; },
  carpet: (x, y) => { const u = ((Math.floor(x) + Math.floor(y)) % 16 + 16) % 16, v = ((Math.floor(x) - Math.floor(y)) % 16 + 16) % 16, d = u === 0 || v === 0, c = (Math.floor((x + y) / 16) + Math.floor((x - y) / 16)) % 2 === 0; return d ? [212, 170, 70] : c ? [112, 26, 66] : [86, 18, 52]; },
  rug: (x, y) => { const k = Math.floor(y / 4) % 3; return k === 0 ? [255, 158, 94] : k === 1 ? [255, 248, 232] : [46, 196, 201]; },
  dock: (x, y) => { const seam = Math.floor(x) % 5 === 0, n = E.hash2(Math.floor(x / 5), 1) * 20 - 10; return seam ? [96, 70, 46] : [168 + n, 130 + n, 92 + n]; }
};
G.FLOOR_TEX = FT;
/** build a location's TileMap from cell(cx, cy) -> a legend char */
const mkMap = (W, H, cell, legend, types, floorTex, outside = false) => {
  const rows = []; for (let cy = 0; cy < H; cy++) { let s = ''; for (let cx = 0; cx < W; cx++) s += cell(cx, cy); rows.push(s); }
  return () => new E.TileMap({ rows, legend, types: types || {}, floorTex, outside, ao: 4 });
};
const SEA_DEPTH = (y, y0, y1) => clamp((y - y0) / (y1 - y0), 0, 1);
G.LOCS = {
  beach: {
    name: 'Sunset Courts', open: [0, 1], music: 'island', amb: 'beach', sky: true, start: [352, 400], exit: { y1: 436 },
    map: () => G.courtMap,
    solids: [['tikibar', 120, 210], ['lifeguard', 600, 170], ['changinghut', 70, 300], ['djbooth', 352, 132], ['bleacher', 256, 148, { params: { len: 52, color: '#2ec4c9' } }], ['bleacher', 448, 148, { params: { len: 52, color: '#ff9e5e' } }]],
    spots: [{ x: 104, y: 234, kind: 'stool' }, { x: 120, y: 234, kind: 'stool' }, { x: 136, y: 234, kind: 'stool' }, { x: 584, y: 252, kind: 'lounger' }, { x: 612, y: 254, kind: 'lounger' }, { x: 300, y: 114, kind: 'shore' }, { x: 420, y: 112, kind: 'shore' }, { x: 300, y: 240, kind: 'practice', pair: 0 }, { x: 404, y: 240, kind: 'practice', pair: 1 }],
    acts: [{ id: 'board', kind: 'board', x: 196, y: 330, label: 'Match Board' }, { id: 'hut', kind: 'wardrobe', x: 70, y: 322, label: 'Changing Hut' }, { id: 'bar', kind: 'bar', x: 120, y: 236, label: 'Tiki Tok Bar', hidden: true }],
    staff: [['kai', 120, 196, Math.PI / 2]], partnerSpot: [210, 340]
  },
  pool: {
    name: 'Lagoon Pool', open: [0, 1], music: 'lagoon', amb: 'pool', sky: false, start: [240, 320], exit: { y1: 346 },
    map: mkMap(30, 22, (cx, cy) => { if (cy < 2) return '#'; const inPool = (cx - 15) * (cx - 15) / 70 + (cy - 10) * (cy - 10) / 22 < 1 || (cx >= 22 && cx <= 27 && cy >= 7 && cy <= 13); if (inPool) return 'w'; if (cx < 2 || cx > 27 || cy > 18) return 'g'; return '.'; },
      { '#': 1, w: { floor: 'pool', block: true }, g: { floor: 'grass' }, '.': { floor: 'tile' } }, { 1: { h: 22, face: 'hedge', roof: 'leaves', top: '#3a8a4a', side: '#2f6a3a' } },
      (x, y, tag) => tag === 'pool' ? FT.pool(x, y) : tag === 'grass' ? FT.grass(x, y) : FT.tile(x, y), '#3a8a4a'),
    solids: [['cabana', 70, 80], ['lounger', 120, 290, { params: { color: '#ffd04a' } }], ['lounger', 150, 292, { params: { color: '#ff5f7a' } }], ['lounger', 330, 296, { params: { color: '#2ec4c9' } }], ['changinghut', 430, 80]],
    deco: [['flamingo', 230, 160, 'float'], ['poolfloat', 290, 190, 'float'], ['deckchair', 380, 300, null, { params: { color: '#ff9e5e' } }]],
    props: [['palm', 30, 60, 1.6], ['palm', 452, 300, 1.7], ['palm', 24, 300, 1.5], ['palm', 460, 120, 1.6], ['torch', 200, 90, 1.3], ['torch', 330, 90, 1.3], ['flowers', 60, 200, 1]],
    spots: [{ x: 210, y: 170, kind: 'swim' }, { x: 270, y: 150, kind: 'swim' }, { x: 120, y: 294, kind: 'lounger' }, { x: 150, y: 296, kind: 'lounger' }, { x: 330, y: 298, kind: 'lounger' }, { x: 160, y: 232, kind: 'edge' }, { x: 300, y: 252, kind: 'edge' }, { x: 60, y: 104, kind: 'stool' }, { x: 84, y: 104, kind: 'stool' }],
    acts: [{ id: 'hop', kind: 'poolhop', x: 400, y: 228, label: 'Pool Hop deck' }, { id: 'hut', kind: 'wardrobe', x: 430, y: 104, label: 'Changing Hut' }],
    staff: [], partnerSpot: [260, 300]
  },
  promenade: {
    name: 'Fortuna Promenade', open: [0, 1], music: 'island', amb: 'promenade', sky: true, start: [288, 200], exit: { x0: 8, x1: 568 },
    map: mkMap(36, 16, (cx, cy) => cy < 3 ? '#' : cy >= 14 ? 'w' : cy === 13 ? 'r' : '.', { '#': 1, w: { floor: 'sea', block: true }, r: 2, '.': { floor: 'boards' } },
      { 1: { h: 40, face: 'plaster', roof: 'tiles', top: '#e85a4a', side: '#f4ecd8' }, 2: { h: 8, face: 'plank', top: '#e8d8b8', side: '#a88a62' } },
      (x, y, tag) => tag === 'sea' ? FT.sea(x, y, SEA_DEPTH(y, 256, 224)) : FT.boards(x, y), '#0b5a7a'),
    shops: [['riptide', 112, 56], ['coral', 288, 56], ['sundries', 464, 56]],
    solids: [['icecreamcart', 380, 150], ['bench', 200, 196], ['bench', 520, 196], ['planter', 40, 70], ['planter', 200, 66], ['planter', 376, 66], ['planter', 536, 70]],
    props: [['streetlamp', 140, 190, 1.4], ['streetlamp', 430, 190, 1.4], ['flowers', 248, 70, 1]],
    spots: [{ x: 200, y: 186, kind: 'bench' }, { x: 520, y: 186, kind: 'bench' }, { x: 112, y: 90, kind: 'window' }, { x: 300, y: 90, kind: 'window' }, { x: 470, y: 90, kind: 'window' }, { x: 356, y: 156, kind: 'cart' }],
    acts: [{ id: 'riptide', kind: 'shop', shop: 'riptide', x: 112, y: 76, label: 'Riptide Sports' }, { id: 'coral', kind: 'shop', shop: 'coral', x: 288, y: 76, label: 'Coral Couture' }, { id: 'sundries', kind: 'shop', shop: 'sundries', x: 464, y: 76, label: 'Sundries & Smiles' }],
    staff: [], partnerSpot: [300, 210]
  },
  villa: {
    name: 'Your Villa', open: [0, 1, 2], music: 'siesta', amb: 'villa', sky: true, start: [112, 150], exit: { y1: 222 }, zoom: 1.4,
    map: mkMap(14, 14, (cx, cy) => cy < 2 ? '#' : (cx === 0 || cx === 13) && cy < 10 ? '#' : cy === 10 && (cx < 5 || cx > 8) ? 'k' : cy >= 12 ? 'w' : cy >= 10 ? 'b' : (cx >= 4 && cx <= 9 && cy >= 5 && cy <= 8) ? 'u' : '.',
      { '#': 1, k: 2, w: { floor: 'sea', block: true }, b: { floor: 'deck' }, u: { floor: 'rug' }, '.': { floor: 'planks' } },
      { 1: { h: 34, face: 'plaster', roof: 'slab', top: '#f4ecd8', side: '#e8dcc0', cut: true, cutH: 6 }, 2: { h: 8, face: 'plank', top: '#e8d8b8', side: '#a88a62' } },
      (x, y, tag) => tag === 'sea' ? FT.sea(x, y, SEA_DEPTH(y, 224, 192)) : tag === 'rug' ? FT.rug(x, y) : tag === 'deck' ? FT.boards(x, y) : FT.planks(x, y), '#0b5a7a'),
    solids: [['bed', 52, 60], ['wardrobe', 190, 44], ['desk', 150, 46]],
    props: [['flowers', 30, 140, .9], ['lamp', 24, 44, 1.1]],
    deco: [['rug', 112, 110, null, { params: { color: '#ff9e5e' } }]],
    spots: [{ x: 160, y: 130, kind: 'stand' }],
    acts: [{ id: 'bed', kind: 'bed', x: 52, y: 84, label: 'Bed' }, { id: 'closet', kind: 'wardrobe', x: 190, y: 64, label: 'Closet' }, { id: 'desk', kind: 'journal', x: 150, y: 66, label: 'Desk' }, { id: 'frame', kind: 'album', x: 96, y: 40, label: 'Album' }, { id: 'mail', kind: 'mail', x: 200, y: 168, label: 'Mailbox' }],
    staff: [], partnerSpot: null
  },
  casino: {
    name: 'Casino Fortuna', open: [2], music: 'neon', amb: 'casino', sky: false, start: [240, 290], exit: { y1: 312 }, night: true, zoom: 1.2,
    map: mkMap(30, 20, (cx, cy) => cy < 2 || cx === 0 || cx === 29 ? '#' : '.', { '#': 1, '.': { floor: 'carpet' } }, { 1: { h: 44, face: 'plaster', roof: 'slab', top: '#3a1030', side: '#5a1a48', cut: true, cutH: 8 } }, (x, y) => FT.carpet(x, y), '#12081e'),
    solids: [['cashier', 100, 42], ['prizecounter', 240, 40], ['bjtable', 150, 180], ['roulettetable', 340, 180], ['velvetrope', 400, 92], ['velvetrope', 440, 92]],
    slots: [[40, 90], [40, 130], [40, 170], [40, 210], [40, 250], [80, 250]],
    props: [['chandelier', 160, 120, 1.4], ['chandelier', 330, 120, 1.4], ['palm', 452, 280, 1.4], ['palm', 24, 290, 1.3]],
    spots: [{ x: 56, y: 100, kind: 'slots' }, { x: 56, y: 180, kind: 'slots' }, { x: 92, y: 236, kind: 'slots' }, { x: 340, y: 210, kind: 'rail' }, { x: 368, y: 208, kind: 'rail' }, { x: 220, y: 270, kind: 'stand' }, { x: 260, y: 270, kind: 'stand' }],
    acts: [{ id: 'cashier', kind: 'cashier', x: 100, y: 66, label: 'Cashier' }, { id: 'slots', kind: 'slots', x: 64, y: 150, label: 'Fortuna Sevens' }, { id: 'bj', kind: 'blackjack', x: 150, y: 210, label: 'Blackjack' }, { id: 'roul', kind: 'roulette', x: 340, y: 216, label: 'Roulette' }, { id: 'prize', kind: 'prize', x: 240, y: 62, label: 'Prize Counter' }, { id: 'vip', kind: 'vip', x: 420, y: 70, label: 'VIP Lounge' }],
    staff: [['pepper', 150, 156, Math.PI / 2], ['kai', 300, 180, 0]], partnerSpot: [260, 290]
  },
  dock: {
    name: 'The Dock', open: [], music: 'island', amb: 'beach', sky: true, start: [192, 150],
    map: mkMap(24, 14, (cx, cy) => (cx >= 8 && cx <= 15 && cy >= 4) || (cy >= 9 && cy <= 12) ? '.' : 'w', { w: { floor: 'sea', block: true }, '.': { floor: 'dock' } }, {}, (x, y, tag) => tag === 'sea' ? FT.sea(x, y, .3 + .5 * Math.sin(x * .01)) : FT.dock(x, y), '#0b5a7a'),
    deco: [['seaplane', 300, 90, null, { facing: Math.PI }], ['crate', 140, 170, null], ['barrel', 160, 180, null]],
    props: [['banner', 132, 70, 1.3], ['banner', 252, 70, 1.3], ['torch', 130, 150, 1.2], ['torch', 254, 150, 1.2]],
    spots: [{ x: 150, y: 190, kind: 'stand' }, { x: 175, y: 196, kind: 'stand' }, { x: 210, y: 196, kind: 'stand' }, { x: 235, y: 190, kind: 'stand' }, { x: 192, y: 176, kind: 'stand' }],
    acts: [], staff: [], partnerSpot: null
  }
};
/* ---- the island map: an iso view of Isla Fortuna and its pins ---- */
G.ISLAND = {
  W: 48, H: 36,
  cell(cx, cy) {
    const dx = (cx - 24) / 21, dy = (cy - 18) / 15, d = Math.sqrt(dx * dx + dy * dy) + Math.sin(cx * .7) * .04 + Math.cos(cy * .9) * .04;
    if (d > 1) return 'w'; if (d > .9) return 's';
    const vx = cx - 30, vy = cy - 11, vd = Math.sqrt(vx * vx + vy * vy);
    if (vd < 2) return 'c'; if (vd < 3.4) return '3'; if (vd < 5) return '2'; if (vd < 6.6) return '1';
    if ((cx - 17) * (cx - 17) + (cy - 22) * (cy - 22) < 7) return 'p';
    return E.hash2(cx, cy) > .82 ? 't' : 'g';
  },
  pins: [
    { id: 'beach', x: 16 * 22, y: 16 * 29, label: 'Sunset Courts' }, { id: 'pool', x: 16 * 17, y: 16 * 22, label: 'Lagoon Pool' },
    { id: 'promenade', x: 16 * 30, y: 16 * 25, label: 'Fortuna Promenade' }, { id: 'villa', x: 16 * 10, y: 16 * 16, label: 'Your Villa' },
    { id: 'casino', x: 16 * 36, y: 16 * 18, label: 'Casino Fortuna' }, { id: 'dock', x: 16 * 40, y: 16 * 28, label: 'The Dock', greyed: 'Departures only' }
  ]
};
