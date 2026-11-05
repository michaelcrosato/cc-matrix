/* 04-data-world: the walkable places as data: their maps (rows built by small functions), props, NPC spots, interactables
 * and exits; and the island map's pins. */
const rowsOf = (w, h, f) => { const rows = []; for (let y = 0; y < h; y++) { let s = ''; for (let x = 0; x < w; x++) s += f(x, y); rows.push(s); } return rows; };
G.tex = {
  deck: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, g = (x % 16) < 1 || (y % 16) < 1, t = E.hash2(Math.floor(x / 16), Math.floor(y / 16)) * 18; return g ? [176, 150, 120] : [232 + t + n * 10, 206 + t * .8 + n * 10, 168 + t * .5 + n * 8]; },
  water: (x, y) => { const w = E.noise2(x * .06, y * .06), n = E.hash2(Math.floor(x), Math.floor(y)) - .5, c = (Math.sin(x * .3 + y * .2) > .9) ? 40 : 0; return [40 + w * 20 + n * 6 + c, 190 + w * 24 + n * 8 + c, 210 + w * 14 + n * 6 + c]; },
  planks: (x, y) => { const pl = Math.floor(y / 6), seam = (y % 6) < 1 || ((x + pl * 13) % 28) < 1, n = E.hash2(Math.floor(x / 2), pl) - .5; return seam ? [120, 86, 56] : [190 + n * 26, 146 + n * 20, 100 + n * 14]; },
  carpet: (x, y) => { const d = (Math.abs((x % 16) - 8) + Math.abs((y % 16) - 8)) < 2, n = E.hash2(Math.floor(x), Math.floor(y)) - .5; return d ? [210, 160, 60] : [120 + n * 10, 24 + n * 8, 50 + n * 8]; },
  tilesWarm: (x, y) => { const g = (x % 12) < 1 || (y % 12) < 1, n = E.hash2(Math.floor(x / 12), Math.floor(y / 12)) - .5; return g ? [160, 130, 110] : [232 + n * 16, 208 + n * 14, 180 + n * 12]; }
};
const floorFn = (x, y, tag) => tag === 'water' ? G.tex.water(x, y) : tag === 'deck' ? G.tex.deck(x, y) : tag === 'planks' ? G.tex.planks(x, y) : tag === 'carpet' ? G.tex.carpet(x, y) : tag === 'tiles' ? G.tex.tilesWarm(x, y) : tag === 'sea' ? G.sandTex(x, y, 'sea') : G.sandTex(x, y, 'sand');
G.LOCS = {
  beach: { name: 'Sunset Courts', short: 'Courts', open: [0, 1], music: 'island', amb: 'beach', spawn: [352, 296], pin: [16, 22],
    about: 'Court A, the bleachers, the Tiki Tok Bar and the Match Board.', acts: ['Matches', 'Chat', 'Wardrobe'],
    spots: [[120, 196, 'stool'], [134, 196, 'stool'], [92, 200, 'stool'], [190, 128, 'lounge'], [548, 124, 'lounge'], [600, 200, 'stand'], [300, 70, 'shore'], [420, 70, 'shore'], [260, 220, 'practice'], [300, 224, 'practice']],
    inter: [['board', 'Match Board', 300, 290], ['hut', 'Changing Hut', 108, 268]] },
  pool: { name: 'Lagoon Pool', short: 'Pool', open: [0, 1], music: 'lagoon', amb: 'pool', spawn: [240, 300], pin: [30, 14],
    about: 'A free-form lagoon pool, the Pool Hop deck and the cabana bar.', acts: ['Pool Hop', 'Chat', 'Wardrobe'],
    spots: [[150, 130, 'swim'], [300, 150, 'swim'], [80, 250, 'lounge'], [110, 250, 'lounge'], [140, 250, 'lounge'], [200, 205, 'edge'], [330, 205, 'edge'], [400, 90, 'stool'], [416, 90, 'stool']],
    inter: [['hopdeck', 'Pool Hop', 52, 160], ['hut', 'Changing Hut', 440, 250]] },
  promenade: { name: 'Fortuna Promenade', short: 'Promenade', open: [0, 1], music: 'island', amb: 'beach', spawn: [288, 200], pin: [24, 10],
    about: 'Three shops on the boardwalk: Riptide Sports, Coral Couture, Sundries & Smiles.', acts: ['Shopping', 'Chat'],
    spots: [[150, 150, 'bench'], [430, 150, 'bench'], [110, 105, 'shop'], [290, 105, 'shop'], [470, 105, 'shop'], [380, 190, 'stand']],
    inter: [['riptide', 'Riptide Sports', 110, 86], ['coral', 'Coral Couture', 288, 86], ['sundries', 'Sundries & Smiles', 466, 86]] },
  villa: { name: 'Your Villa', short: 'Villa', open: [0, 1, 2], music: 'siesta', amb: 'night', spawn: [112, 128], pin: [36, 24],
    about: 'Your room: the bed, the closet, the desk, the album and the mailbox.', acts: ['Rest', 'Wardrobe', 'Journal', 'Album', 'Letters'],
    spots: [[150, 120, 'stand']], inter: [['bed', 'Bed', 48, 64], ['closet', 'Closet', 112, 40], ['desk', 'Desk', 176, 56], ['frame', 'Album', 196, 100], ['mailbox', 'Mailbox', 64, 140]] },
  casino: { name: 'Casino Fortuna', short: 'Casino', open: [2], music: 'neon', amb: 'casino', spawn: [240, 280], pin: [20, 28],
    about: 'Night only: slots, blackjack, roulette, the cashier and the VIP lounge.', acts: ['Slots', 'Blackjack', 'Roulette'],
    spots: [[90, 120, 'slot'], [120, 120, 'slot'], [150, 120, 'slot'], [330, 200, 'stand'], [360, 210, 'stand'], [420, 120, 'stand'], [436, 120, 'stand']],
    inter: [['cashier', 'Cashier', 240, 70], ['slots', 'Fortuna Sevens', 120, 104], ['blackjack', 'Blackjack', 240, 170], ['roulette', 'Roulette', 380, 170], ['prize', 'Prize Counter', 420, 70], ['vip', 'VIP Lounge', 60, 220]] },
  dock: { name: 'The Dock', short: 'Dock', open: [], music: 'island', amb: 'beach', spawn: [190, 180], pin: [8, 30], about: 'Departures only.', acts: [], spots: [], inter: [] }
};
G.locMaps = () => {
  if (G._locMaps) return G._locMaps; const M = G._locMaps = {};
  M.beach = G.courtMap();
  // the pool: a deck of tiles round a free-form pool (water blocks walkers)
  M.pool = new E.TileMap({ rows: rowsOf(30, 22, (x, y) => { const dx = (x - 13) / 10, dy = (y - 9) / 5.5, w = Math.hypot(dx, dy) < 1 && !(x > 18 && y < 5); return y < 1 || x < 1 || x > 28 ? '#' : w ? '~' : 'd'; }),
    legend: { '#': 1, '~': { floor: 'water', block: true }, d: { floor: 'deck' } }, types: { 1: { h: 18, top: '#5fc35a', side: '#2f8f4e', face: 'hedge', roof: 'leaves' } }, floorTex: floorFn, outside: '#2f8f4e', ao: 4 });
  // the promenade: a boardwalk with the sea behind a railing and the shopfronts
  M.promenade = new E.TileMap({ rows: rowsOf(36, 16, (x, y) => y < 2 ? '~' : y === 2 ? 'r' : 'p'), legend: { '~': { floor: 'sea', block: true }, r: 2, p: { floor: 'planks' } },
    types: { 2: { h: 8, top: '#f4f4f0', side: '#c8c8c0', face: 'plank' } }, floorTex: floorFn, outside: '#1fb0c8', ao: 3 });
  // the villa: a room with plaster walls
  M.villa = new E.TileMap({ rows: rowsOf(15, 11, (x, y) => (y === 0 || x === 0 || x === 14 || y === 10) ? (y === 10 && x > 5 && x < 9 ? 'w' : '#') : 't'), legend: { '#': 1, w: 3, t: { floor: 'tiles' } },
    types: { 1: { h: 40, top: '#f4e8c8', side: '#e8d8b0', face: 'plaster', cut: true, cutH: 6 }, 3: { h: 14, top: '#f4e8c8', side: '#e8d8b0', face: 'plaster', cut: true, cutH: 6 } }, floorTex: floorFn, outside: '#0a1420', ao: 5 });
  // the casino floor
  M.casino = new E.TileMap({ rows: rowsOf(30, 20, (x, y) => (y === 0 || x === 0 || x === 29 || y === 19) ? '#' : 'c'), legend: { '#': 1, c: { floor: 'carpet' } },
    types: { 1: { h: 48, top: '#2a1240', side: '#4a1a5a', face: 'plaster', cut: true, cutH: 8 } }, floorTex: floorFn, outside: '#0a0410', ao: 5 });
  // the dock: planks out into the sea
  M.dock = new E.TileMap({ rows: rowsOf(24, 14, (x, y) => (x > 4 && x < 19 && y > 4 && y < 12) || (x > 9 && x < 14) ? 'p' : '~'), legend: { '~': { floor: 'sea', block: true }, p: { floor: 'planks' } }, floorTex: floorFn, outside: '#1fb0c8', ao: 2 });
  // solid props
  const S = (m, id, x, y, f) => { try { m.solid(id, x, y, 0, { facing: f || 0 }); } catch (e) { /* shape missing */ } };
  S(M.pool, 'cabana', 410, 60, Math.PI / 2); S(M.promenade, 'icecreamcart', 380, 150, Math.PI / 2);
  for (const x of [110, 288, 466]) S(M.promenade, 'shopfront', x, 52, Math.PI / 2);
  S(M.villa, 'bed', 48, 56, Math.PI / 2); S(M.villa, 'wardrobe', 112, 26, Math.PI / 2); S(M.villa, 'desk', 176, 44, Math.PI / 2);
  S(M.casino, 'cashier', 240, 48, Math.PI / 2); S(M.casino, 'bjtable', 240, 150, Math.PI / 2); S(M.casino, 'roulettetable', 380, 150, Math.PI / 2);
  for (const x of [90, 120, 150]) S(M.casino, 'slotmachine', x, 96, Math.PI / 2);
  S(M.dock, 'seaplane', 190, 60, 0);
  return M;
};
/** each place's props, drawn every frame (palms sway, torches light at night) */
G.drawLocProps = (r, id, night) => {
  const shape = (s, x, y, f, o = {}) => r.shape(s, x, y, 0, Object.assign({ facing: f === undefined ? Math.PI / 2 : f }, o)), prop = (p, x, y, o = {}) => r.prop(p, x, y, 0, Object.assign({ size: 1.5 }, o));
  if (id === 'beach') { G.drawCourtSet(r, null, night); shape('mailbox', 300, 290, Math.PI / 2, { mats: { b: 'aoa_canvasY' } }); }
  else if (id === 'pool') {
    shape('cabana', 410, 60); for (const x of [80, 110, 140]) shape('lounger', x, 250); shape('flamingo', 240, 120); shape('poolfloat', 130, 160, 0, { mats: { a: 'aoa_canvasP' } });
    for (let k = 0; k < 6; k++) shape('poolfloat', 76 + k * 30, 150 + Math.sin(k) * 10, 0, { mats: { a: k % 2 ? 'aoa_canvasY' : 'aoa_canvasT' } });
    shape('deckchair', 300, 250); shape('deckchair', 330, 250); shape('changinghut', 440, 232, Math.PI); shape('barstool', 400, 92, 0); shape('barstool', 416, 92, 0);
    prop('palm', 30, 40); prop('palm', 450, 30); prop('palm', 24, 320); prop('palm', 460, 320); prop('flowers', 200, 320); prop('flowers', 260, 330);
    if (night) for (const [x, y] of [[40, 110], [440, 110], [200, 300], [300, 300]]) shape('torchpost', x, y, 0, { light: true });
    shape('mailbox', 52, 160, Math.PI / 2, { mats: { b: 'aoa_canvasT' } });
  } else if (id === 'promenade') {
    const mats = [{ a: 'aoa_canvasB', w: 'aoa_seafoam' }, { a: 'aoa_canvasP', w: 'aoa_lilac' }, { a: 'aoa_canvasY', w: 'aoa_coral' }];
    [110, 288, 466].forEach((x, k) => shape('shopfront', x, 52, Math.PI / 2, { mats: mats[k] }));
    shape('icecreamcart', 380, 150); shape('bench', 150, 160); shape('bench', 430, 160); for (const x of [40, 200, 376, 540]) shape('planter', x, 190);
    for (const x of [60, 240, 330, 520]) r.prop('streetlamp', x, 120, 0, { size: 1.4, light: night });
    prop('palm', 20, 230); prop('palm', 560, 230);
  } else if (id === 'villa') {
    shape('bed', 48, 56); shape('wardrobe', 112, 26); shape('desk', 176, 44); shape('rug', 120, 100, 0); shape('mailbox', 64, 150, Math.PI / 2);
    r.prop('window', 196, 8, 24, { size: 1.2 }); r.prop('lamp', 200, 40, 0, { size: 1.2, light: night }); prop('flowers', 30, 150, { size: 1.2 });
  } else if (id === 'casino') {
    for (let k = 0; k < 6; k++) shape('slotmachine', 70 + (k % 3) * 30, 96 + Math.floor(k / 3) * 0, Math.PI / 2, { mats: { b: k % 2 ? 'aoa_red' : 'aoa_black' } });
    shape('cashier', 240, 48); shape('bjtable', 240, 150); shape('roulettetable', 380, 150); shape('neonsign', 240, 20); shape('neonsign', 420, 20, Math.PI / 2, { mats: { n: 'aoa_neonC', c: 'aoa_neonP' } });
    shape('velvetrope', 60, 200, 0); shape('lounger', 60, 240, Math.PI / 2, { mats: { c: 'aoa_red' } }); shape('chandelier2', 160, 160, 0, { light: true }); shape('chandelier2', 330, 100, 0, { light: true }); shape('desk', 420, 56, Math.PI / 2, { mats: { w: 'aoa_gold' } });
  } else if (id === 'dock') { shape('seaplane', 190, 60, 0); shape('crate', 120, 130); shape('crate', 132, 140); shape('barrel', 260, 140); r.prop('banner', 100, 90, 0, { size: 1.3, color: '#ffd36a' }); r.prop('banner', 280, 90, 0, { size: 1.3, color: '#ff5f7a' }); }
};
