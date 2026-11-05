// ============================================================================================================
// REWIRED • 02 world: materials (rowhouse brick with windows, boarded vacants with tags), objects as data (cars,
// dumpster, couch, payphone, desks), the street block, the detail's office, the wire room, the stash house; actors.
// ============================================================================================================
const T = 16;
const rgb = h => E.hex(h);
const NIGHT = { on: false };   // lit windows and their count follow the hour

// ---- wall faces painted per pixel ---------------------------------------------------------------------------
function brickAt(wx, z, ct, seed) {
  const course = Math.floor(z / 3), off = course % 2 ? 3 : 0, bx = Math.floor((wx + off) / 6);
  if (z % 3 < .55) return ct.deep;
  if (((wx + off) % 6 + 6) % 6 < .55) return ct.deep;
  const v = E.hash2(bx + seed, course);
  return v < .18 ? ct.sh : v > .9 ? ct.lt : null;
}
function windowAt(wx, z, cx, cy, fi, h, kind) {
  const u = ((wx % 16) + 16) % 16, floorZ = z < 22 ? 0 : 1, zz = z - (floorZ ? 26 : 8);
  const door = kind !== 'store' && floorZ === 0 && E.hash2(cx * 3 + fi, cy * 5) > .55;
  if (door) { if (u > 5 && u < 11 && z < 16) return u < 5.8 || u > 10.2 || z > 15.2 ? '#2a1e18' : (kind === 'vacant' ? '#8a6a3c' : (E.hash2(cx, cy) > .5 ? '#5a2a20' : '#2a2a3a')); return null; }
  if (zz < 0 || zz > 11 || u < 4 || u > 12 || z > h - 5) return null;
  const edge = u < 4.8 || u > 11.2 || zz < .8 || zz > 10.2;
  if (kind === 'vacant') {   // plywood over the glass, a stencilled X
    if (edge) return '#3a2a1e';
    const d1 = Math.abs((u - 4) - zz * .73), d2 = Math.abs((12 - u) - zz * .73);
    return d1 < .7 || d2 < .7 ? '#d8d0c0' : (Math.floor(zz / 3) % 2 ? '#9a7a4a' : '#8a6c40');
  }
  if (edge) return kind === 'store' ? '#1a1a1a' : '#d8d4c8';
  if (Math.abs(u - 8) < .5) return '#d8d4c8';
  const lit = NIGHT.on && E.hash2(cx * 11 + fi * 3 + floorZ, cy * 7) > .55;
  if (kind === 'store') return lit || !NIGHT.on ? (zz > 8 ? '#e8d880' : '#c8b048') : '#2a3038';
  return lit ? (zz > 7 ? '#f0c878' : '#d8a050') : (zz > 7 ? '#3a4a5a' : '#1a2230');
}
function tagAt(wx, z, cx, cy) {   // graffiti on vacants: a few loops of spray paint near the ground
  if (z > 14 || z < 2) return null;
  const n = E.noise2(wx / 3 + cx * 9, z / 2 + cy * 4), m = E.hash2(cx, cy * 3);
  if (m < .45) return null;
  return n > .62 && n < .7 ? (m > .8 ? '#e85ab0' : m > .62 ? '#5ad0e8' : '#e8e8e8') : null;
}
E.MATERIALS.rowhouse = { color: '#8a4436', pattern: 'bricks', face(wx, z, ct, t, cx, cy, fi, nh, h) { return windowAt(wx, z, cx, cy, fi, h, 'row') || (z < 4 ? ct.sh : brickAt(wx, z, ct, cx * 3 + cy)); } };
E.MATERIALS.formstone = { color: '#8a8478', pattern: 'stones', face(wx, z, ct, t, cx, cy, fi, nh, h) {
  const w = windowAt(wx, z, cx, cy, fi, h, 'row'); if (w) return w;
  const n = E.noise2(wx / 3 + cx, z / 2.4 + cy); return n < .3 ? ct.deep : n < .42 ? ct.sh : n > .74 ? ct.lt : null; } };
E.MATERIALS.vacant = { color: '#5a3a30', pattern: 'bricks', face(wx, z, ct, t, cx, cy, fi, nh, h) { return windowAt(wx, z, cx, cy, fi, h, 'vacant') || tagAt(wx, z, cx, cy) || (z < 5 ? ct.deep : brickAt(wx, z, ct, cx + cy * 5)); } };
E.MATERIALS.lowrise = { color: '#a8846a', pattern: 'bricks', face(wx, z, ct, t, cx, cy, fi, nh, h) {
  const w = windowAt(wx, z, cx, cy, fi, h, 'row'); if (w) return w;
  if (Math.abs(z - 20) < 1) return ct.lt;   // a concrete band between the floors
  return z < 4 ? ct.sh : brickAt(wx, z, ct, cx * 5 + cy); } };
E.MATERIALS.store = { color: '#3a5a4a', pattern: 'none', face(wx, z, ct, t, cx, cy, fi, nh, h) {
  if (z > 18 && z < 26) { const u = ((wx % 64) + 64) % 64; return z > 24.5 || z < 19.5 ? '#141414' : (u > 8 && u < 56 && Math.floor(u) % 2 === 0 && z > 21 && z < 23.5 ? '#f0d848' : '#c82a2a'); }   // the sign band: LUCKY'S, as a marquee
  return windowAt(wx, z, cx, cy, fi, h, 'store') || (z < 3 ? ct.deep : null); } };
E.MATERIALS.chainlink = { color: '#8a8a90', pattern: 'none', face(wx, z, ct) { const a = ((wx + z) % 3 + 3) % 3, b = ((wx - z) % 3 + 3) % 3; return a < .5 || b < .5 ? ct.lt : (z > 11.5 ? ct.base : ct.sh); } };
E.MATERIALS.drywall = { color: '#9a9a88', pattern: 'none', face(wx, z, ct) { if (z < 3) return '#4a4038'; if (Math.abs(z - 14) < .5) return ct.sh; return E.hash2(Math.floor(wx), Math.floor(z)) < .04 ? ct.sh : null; } };
E.MATERIALS.cinder = { color: '#7a7a74', pattern: 'none', face(wx, z, ct) { const c = Math.floor(z / 5), off = c % 2 ? 6 : 0; return z % 5 < .6 || ((wx + off) % 12 + 12) % 12 < .6 ? ct.deep : (E.hash2(Math.floor((wx + off) / 12), c) < .2 ? ct.sh : null); } };
E.MATERIALS.tarroof = { color: '#363639', pattern: 'speck', amount: .03 };

// ---- floors ---------------------------------------------------------------------------------------------------
function n2(x, y) { return E.noise2(x, y); }
const FLOORS = {
  road(x, y) {
    let v = 52 + n2(x / 9, y / 9) * 14 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 10;
    const crack = Math.abs(n2(x / 23, y / 31) - .5) < .012; if (crack) v -= 22;
    const patch = n2(x / 40 + 9, y / 40) > .72; if (patch) v -= 8;
    let c = [v, v, v + 4];
    const L = STREET.laneAt(x, y); if (L) c = L;
    if (STREET.wet) { const p = n2(x / 14 + 3, y / 10) > .64; if (p) c = [c[0] * .6 + 20, c[1] * .6 + 24, c[2] * .6 + 40]; }
    return c;
  },
  walk(x, y) {
    const jx = ((x % 16) + 16) % 16, jy = ((y % 16) + 16) % 16;
    let v = 128 + n2(x / 7, y / 7) * 16 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 8;
    if (jx < 1 || jy < 1) v -= 34;
    if (n2(x / 5 + 40, y / 5) > .78) v -= 26;   // stains
    if (E.hash2(Math.floor(x / 2), Math.floor(y / 2) + 99) > .996) return [200, 196, 180];   // a cap, a wrapper
    const c = [v, v - 2, v - 6];
    if (STREET.wet) return [c[0] * .7, c[1] * .7, c[2] * .75 + 8];
    return c;
  },
  lot(x, y) {
    const n = n2(x / 6, y / 6), h = E.hash2(Math.floor(x), Math.floor(y));
    if (h > .993) return [210, 220, 200];   // glass glints
    if (h > .985) return [180, 60, 50];     // a red cap
    const grass = n2(x / 11 + 7, y / 11) > .6;
    return grass ? [58 + n * 20, 70 + n * 24, 40] : [92 + n * 24, 76 + n * 18, 58 + n * 10];
  },
  court(x, y) {
    let v = 108 + n2(x / 8, y / 8) * 18; const jx = ((x % 32) + 32) % 32, jy = ((y % 32) + 32) % 32;
    if (jx < 1 || jy < 1) v -= 26; if (Math.abs(n2(x / 17, y / 13) - .5) < .015) v -= 30;
    return [v, v - 4, v - 10];
  },
  alley(x, y) {
    let v = 40 + n2(x / 6, y / 6) * 16; if (E.hash2(Math.floor(x / 3), Math.floor(y / 3)) > .97) v += 30;
    const p = n2(x / 12, y / 12 + 5) > .66; return p ? [28, 32, 44] : [v, v - 2, v - 4];
  },
  lino(x, y) { const cx = Math.floor(x / 8), cy = Math.floor(y / 8), k = (cx + cy) % 2; const v = k ? 150 : 120; const s = n2(x / 9, y / 9) * 16; return [v + s, v - 6 + s, v - 22 + s]; },
  carpet(x, y) { const v = 58 + n2(x / 4, y / 4) * 10 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 8; return [v * .8, v * .85, v * 1.1]; },
  concrete(x, y) { let v = 84 + n2(x / 10, y / 10) * 20; if (n2(x / 6 + 30, y / 6) > .75) v -= 20; return [v, v, v - 4]; },
  boards(x, y) { const r = Math.floor(y / 5), j = ((x + r * 23) % 40 + 40) % 40; let v = 92 + n2(x / 20, r) * 20; if (((y % 5) + 5) % 5 < .6 || j < .6) v -= 40; return [v, v * .72, v * .5]; }
};

// ---- objects as data ------------------------------------------------------------------------------------------
Object.assign(E.MATERIALS, {
  carpaint: { color: '#b0a07a', pattern: 'glaze' }, chrome: { color: '#c8ccd4', pattern: 'metal' }, glass: { color: '#2a3a4a', pattern: 'glaze' },
  tire: { color: '#1a1a1c', pattern: 'none' }, dumpgreen: { color: '#2e5a3a', pattern: 'metal', rivet: 1 }, couchgreen: { color: '#5a6a3a', pattern: 'cloth' },
  ratty: { color: '#a89a7a', pattern: 'cloth' }, payblue: { color: '#2a4a8a', pattern: 'metal' }, steelgrey: { color: '#8a8e96', pattern: 'metal' },
  deskwood: { color: '#7a5a3a', pattern: 'planks' }, beige: { color: '#c8c0a8', pattern: 'none' }, screen: { color: '#3aa060', pattern: 'none', glow: 1 },
  redlight: { color: '#ff3030', pattern: 'none', glow: 1 }, bluelight: { color: '#3050ff', pattern: 'none', glow: 1 }, cork: { color: '#a8784a', pattern: 'speck' }
});
E.SHAPES.sedan = { about: 'a boxy American sedan, chrome bumpers', tags: 'vehicle street', mats: { b: 'carpaint', g: 'glass', t: 'tire', c: 'chrome' },
  parts: [['box','b',[0,0,4],[18,40,8]], ['box','g',[0,-2,12],[16,20,6]], ['box','b',[0,-2,17.5],[15,18,1.5]], ['box','c',[0,20.5,4],[18,1,3]], ['box','c',[0,-20.5,4],[18,1,3]],
    ['mirror','xy',['cyl','t',[8.5,13,0],4,2.5,{rot:[0,90,0]}]]], foot: [-9,-20,9,20] };
E.SHAPES.cruiser = { about: 'a city patrol car with a light bar', tags: 'vehicle police', mats: { b: 'beige', d: 'payblue', g: 'glass', t: 'tire', r: 'redlight', u: 'bluelight' },
  parts: [['box','b',[0,0,4],[18,40,8]], ['box','d',[9.1,0,6],[.4,24,3]], ['box','d',[-9.1,0,6],[.4,24,3]], ['box','g',[0,-2,12],[16,20,6]], ['box','b',[0,-2,17.5],[15,18,1.5]],
    ['box','r',[-4,-2,19],[4,4,2]], ['box','u',[4,-2,19],[4,4,2]], ['mirror','xy',['cyl','t',[8.5,13,0],4,2.5,{rot:[0,90,0]}]]], foot: [-9,-20,9,20] };
E.SHAPES.dumpster = { about: 'a green steel dumpster, lid ajar', tags: 'street alley', mats: { d: 'dumpgreen', l: 'iron' },
  parts: [['box','d',[0,0,1],[26,14,14]], ['wedge','d',[0,-2,15],[27,12,3]], ['mirror','x',['box','l',[10,0,0],[2,12,1.5]]]], foot: [-13,-7,13,7] };
E.SHAPES.couch = { about: 'a sagging old couch left out in the courtyard', tags: 'furniture street', mats: { c: 'couchgreen', l: 'walnut' },
  parts: [['box','c',[0,0,3],[30,12,5]], ['box','c',[0,-5,3],[30,3,12]], ['mirror','x',['box','c',[14,0,3],[3,12,9]]], ['box','c',[-6,1,8],[13,9,2]], ['box','c',[7,1,8],[12,9,1.5]], ['mirror','xy',['box','l',[13,4,0],[2,2,3]]]], foot: [-15,-6,15,6] };
E.SHAPES.mattress = { about: 'a stained mattress dumped in the lot', tags: 'street junk', mats: { m: 'ratty' }, parts: [['box','m',[0,0,0],[30,18,3],{rot:12}]] };
E.SHAPES.tires = { about: 'a stack of old tires', tags: 'street junk', mats: { t: 'tire' }, parts: [['row',3,[0,0,4],['cyl','t',[0,0,0],6,3.6,{seg:10}]]] };
E.SHAPES.payphone = { about: 'a blue payphone on a post', tags: 'street', mats: { p: 'payblue', s: 'steelgrey', k: 'iron' },
  parts: [['box','s',[0,0,0],[3,3,14]], ['box','p',[0,0,14],[9,6,14]], ['box','k',[0,3.2,18],[5,.6,7]], ['box','p',[0,0,28],[11,8,1.5]]] };
E.SHAPES.busstop = { about: 'a bus stop bench and sign', tags: 'street', mats: { w: 'oak', s: 'steelgrey', y: '#e8c03a' },
  parts: [['box','w',[0,0,7],[24,6,1.5]], ['box','w',[0,-3,9],[24,1,6]], ['mirror','x',['box','s',[10,0,0],[2,5,7]]], ['cyl','s',[16,0,0],1,32], ['box','y',[16,0,30],[1,10,7]]] };
E.SHAPES.desk = { about: 'a steel office desk with a beige terminal', tags: 'office', mats: { d: 'steelgrey', t: 'deskwood', b: 'beige', s: 'screen' },
  parts: [['box','t',[0,0,11],[28,14,1.5]], ['mirror','x',['box','d',[11,0,0],[6,13,11]]], ['box','b',[-4,-2,12.5],[9,8,8]], ['box','s',[-4,2.1,14],[7,.4,5]], ['box','b',[6,1,12.5],[8,4,.8]]], foot: [-14,-7,14,7] };
E.SHAPES.filecab = { about: 'a four-drawer filing cabinet', tags: 'office', mats: { d: 'steelgrey', k: 'iron' }, parts: [['box','d',[0,0,0],[10,12,26]], ['row',4,[0,0,6],['box','k',[0,6.2,4],[4,.6,1]]]] };
E.SHAPES.reel = { about: 'a wiretap console: reel decks and a headset', tags: 'office', mats: { d: 'steelgrey', t: 'tire', s: 'screen', b: 'beige' },
  parts: [['box','d',[0,0,0],[30,14,12]], ['box','b',[0,-2,12],[28,8,9]], ['mirror','x',['cyl','t',[7,2.3,18],3.5,.5,{rot:[90,0,0]}]], ['box','s',[0,2.2,13],[6,.3,3]]], foot: [-15,-7,15,7] };
E.SHAPES.officechair = { about: 'a swivel chair', tags: 'office', mats: { c: 'leather', s: 'steelgrey' }, parts: [['cyl','s',[0,0,0],5,1], ['cyl','s',[0,0,1],1,7], ['box','c',[0,0,8],[9,9,2]], ['box','c',[0,-4,10],[9,2,9]]] };
E.SHAPES.cart = E.SHAPES.cart || { parts: [] };
E.SHAPES.shopcart = { about: 'a shopping cart full of scrap', tags: 'street junk', mats: { s: 'chrome', j: 'rusted' },
  parts: [['box','s',[0,0,4],[14,9,8]], ['box','j',[0,0,10],[11,7,4]], ['mirror','xy',['cyl','tire',[5,3.5,0],1.5,1.5]]] };
E.SHAPES.toilet = { about: 'a cracked toilet', tags: 'house', mats: { p: 'porcelain' }, parts: [['cyl','p',[0,1,0],4,8,{r2:5}], ['box','p',[0,-4,8],[10,4,9]]] };
E.SHAPES.fridge = { about: 'an old fridge', tags: 'house', mats: { w: 'beige', k: 'iron' }, parts: [['box','w',[0,0,0],[12,11,30]], ['box','k',[4,5.7,14],[1,.6,8]]] };
E.SHAPES.stove = { about: 'a greasy stove', tags: 'house', mats: { w: 'beige', k: 'iron' }, parts: [['box','w',[0,0,0],[14,12,15]], ['mirror','xy',['cyl','k',[3.5,3,15],2,.5]]] };

// ---- maps -----------------------------------------------------------------------------------------------------
// The block: Monroe St and Lorraine Ave run east-west, Calhoun and Fulton north-south. The corner is the vacant lot
// at Monroe and Calhoun; the Courts' low-rises sit behind it; 1419 Lorraine is the stash house.
const STREET = (() => {
  const SW = 64, SH = 44, g = [];
  for (let y = 0; y < SH; y++) g.push(new Array(SW).fill('.'));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && x >= 0 && x < SW) g[y][x] = ch; };
  // sidewalks around every block
  const blocksX = [[0, 13], [20, 43], [50, 63]], blocksY = [[0, 7], [14, 29], [36, 43]];
  for (const [y0, y1] of blocksY) for (const [x0, x1] of blocksX) fill(Math.max(0, x0 - 1), Math.max(0, y0 - 1), Math.min(SW - 1, x1 + 1), Math.min(SH - 1, y1 + 1), ',');
  // rowhouse blocks, alternating brick and formstone, a vacant here and there
  const rows = (x0, y0, x1, y1, seed) => { for (let x = x0; x <= x1; x++) { const k = E.hash2(x + seed, seed) ; const ch = k < .16 ? 'V' : (Math.floor((x + seed) / 2) % 3 === 0 ? 'R' : 'B'); fill(x, y0, x, y1, ch); } };
  // north row (faces Monroe), with the alley behind
  rows(0, 2, 13, 7, 3); fill(0, 0, 13, 1, 'a');
  rows(26, 2, 43, 7, 5); fill(20, 2, 25, 7, 'S'); fill(20, 0, 43, 1, 'a');
  rows(50, 2, 63, 7, 7); fill(50, 0, 63, 1, 'a');
  // west middle block: two rows back to back with an alley
  rows(0, 14, 13, 19, 11); fill(0, 20, 13, 21, 'a'); rows(0, 22, 13, 29, 13);
  // the centre: the corner lot, the vacants with the stash under the steps, the Courts
  fill(20, 14, 27, 19, 'd'); fill(28, 14, 33, 19, 'V'); fill(34, 14, 43, 19, 'L');
  fill(20, 20, 43, 20, 'a'); fill(20, 21, 25, 29, 'L'); fill(38, 21, 43, 29, 'L'); fill(26, 21, 37, 29, 'c');
  fill(26, 20, 27, 20, 'c'); fill(36, 20, 37, 20, 'c');
  // a chain-link fence along the lot, open at the corner and by the stash
  for (let x = 23; x <= 27; x++) g[14][x] = 'f';
  for (let y = 16; y <= 19; y++) g[y][20] = 'f';
  // east middle
  rows(50, 14, 63, 19, 17); fill(50, 20, 63, 21, 'a'); rows(50, 22, 63, 29, 19);
  // south row (faces Lorraine) and its alley; 1419 Lorraine is cols 30-31
  rows(0, 36, 13, 41, 23); fill(0, 42, 13, 43, 'a');
  rows(20, 36, 43, 41, 29); fill(30, 36, 31, 41, 'H'); fill(20, 42, 43, 43, 'a');
  rows(50, 36, 63, 41, 31); fill(50, 42, 63, 43, 'a');
  // alley cut-throughs between the south row and the alley, for the chase
  fill(26, 36, 26, 41, 'a'); fill(37, 36, 37, 41, 'a');
  for (const [x, y] of [[26, 39], [37, 38]]) g[y][x] = 'f';   // fences to vault in them
  fill(8, 14, 8, 19, 'a'); fill(8, 22, 8, 29, 'a');
  const rowsStr = g.map(r => r.join(''));
  const map = new E.TileMap({ rows: rowsStr,
    legend: { '.': { floor: 'road' }, ',': { floor: 'walk' }, d: { floor: 'lot' }, c: { floor: 'court' }, a: { floor: 'alley' },
      B: 1, R: 2, V: 3, L: 4, S: 5, f: { tile: 6, floor: 'lot' }, H: 7 },
    types: {
      1: { h: 44, top: '#3a3436', side: '#8a4436', face: 'rowhouse', roof: 'tarroof', cut: true, cutH: 10 },
      2: { h: 44, top: '#3a3a3a', side: '#8a8478', face: 'formstone', roof: 'tarroof', cut: true, cutH: 10 },
      3: { h: 44, top: '#2a2626', side: '#5a3a30', face: 'vacant', roof: 'tarroof', cut: true, cutH: 10 },
      4: { h: 38, top: '#4a4644', side: '#a8846a', face: 'lowrise', roof: 'slab', cut: true, cutH: 10 },
      5: { h: 40, top: '#3a3a3a', side: '#3a5a4a', face: 'store', roof: 'tarroof', cut: true, cutH: 10 },
      6: { h: 13, top: '#9a9aa0', side: '#8a8a90', face: 'chainlink', roof: 'plain' },
      7: { h: 44, top: '#3a3436', side: '#6a5a50', face: 'rowhouse', roof: 'tarroof', cut: true, cutH: 10 }
    },
    floorTex: (x, y, tag) => (FLOORS[tag] || FLOORS.road)(x, y), ao: 6, outside: '#1e1e22' });
  const P = (cx, cy) => ({ x: cx * T + 8, y: cy * T + 8 });
  const S = {
    map, SW, SH, wet: false, P,
    laneAt(x, y) {
      const cx = Math.floor(x / T), cy = Math.floor(y / T);
      const inH = (cy >= 9 && cy <= 12) || (cy >= 31 && cy <= 34), inV = (cx >= 15 && cx <= 18) || (cx >= 45 && cx <= 48);
      if (inH && inV) return null;
      if (inH && !inV) { const mid = cy <= 12 ? 11 * T : 33 * T; if (Math.abs(y - mid) < 1.1 && (((x % 20) + 20) % 20) < 12) return [190, 160, 60]; }
      if (inV && !inH) { const mid = cx <= 18 ? 17 * T : 47 * T; if (Math.abs(x - mid) < 1.1 && (((y % 20) + 20) % 20) < 12) return [190, 160, 60]; }
      // crosswalks at the corners
      const nearX = (cx === 14 || cx === 19 || cx === 44 || cx === 49), nearY = (cy === 8 || cy === 13 || cy === 30 || cy === 35);
      if (inH && (cx === 14 || cx === 19 || cx === 44 || cx === 49) && (((y % 4) + 4) % 4) < 2) return [170, 168, 160];
      if (inV && (cy === 8 || cy === 13 || cy === 30 || cy === 35) && (((x % 4) + 4) % 4) < 2) return [170, 168, 160];
      return nearX && nearY ? null : null;
    },
    // places the story uses
    corner: P(21, 13), hopperSpot: P(20, 13), runnerSpot: P(22, 15), stash: { x: 28 * T + 4, y: 13 * T + 4 }, moeSpot: P(19, 14),
    lookoutA: P(14, 13), lookoutB: P(24, 8), alleyMeet: P(23, 1), car1: { x: 4 * T, y: 9 * T + 6 }, playerStart: P(2, 8),
    payphone: { x: 49 * T + 10, y: 35 * T + 4 }, car2: { x: 41 * T, y: 34 * T + 6 }, houseDoor: { x: 31 * T, y: 35 * T + 8 }, houseBack: { x: 31 * T, y: 42 * T + 8 },
    tayPark: { x: 20 * T, y: 12 * T }, courier: { x: 47 * T, y: 33 * T }, couch: P(31, 25),
    busstop: { x: 9 * T + 8, y: 8 * T + 4 }
  };
  // the dressing: [kind, id, x, y, opts]; solid ones block walkers
  const D = [];
  const lamp = (cx, cy) => D.push(['prop', 'streetlamp', cx * T + 8, cy * T + 8, { light: true, cone: true }]);
  for (let x = 2; x < SW; x += 7) { if (x < 14 || (x > 19 && x < 44) || x > 49) { lamp(x, 8); lamp(x, 13); lamp(x, 30); lamp(x, 35); } }
  for (let y = 3; y < SH; y += 8) { if (!(y >= 8 && y <= 13) && !(y >= 30 && y <= 35)) { lamp(14, y); lamp(49, y); } }
  for (const [cx, cy] of [[3, 13], [12, 8], [27, 8], [40, 13], [55, 8], [58, 30], [36, 35], [11, 35], [52, 13], [6, 30]]) D.push(['prop', 'trashcan', cx * T + 4, cy * T + 4, {}]);
  for (const [cx, cy] of [[14, 9], [19, 30], [44, 13], [49, 8], [14, 34]]) D.push(['prop', 'hydrant', cx * T + 6, cy * T + 8, {}]);
  D.push(['prop', 'firedrum', 25 * T, 17 * T, { light: true }], ['prop', 'firedrum', 31 * T, 27 * T, { light: true }]);
  D.push(['solid', 'couch', S.couch.x, S.couch.y, { facing: Math.PI / 2 }], ['solid', 'mattress', 23 * T, 18 * T, {}], ['solid', 'tires', 26 * T + 4, 15 * T + 6, {}]);
  D.push(['solid', 'shopcart', 22 * T, 2 * T - 6, { facing: .4 }], ['solid', 'dumpster', 30 * T, T - 2, { facing: Math.PI / 2 }], ['solid', 'dumpster', 6 * T, 21 * T - 2, { facing: Math.PI / 2 }], ['solid', 'dumpster', 33 * T, 43 * T - 4, { facing: Math.PI / 2 }]);
  D.push(['solid', 'payphone', S.payphone.x, S.payphone.y - 4, { facing: Math.PI / 2 }], ['solid', 'busstop', S.busstop.x, S.busstop.y, { facing: Math.PI / 2 }]);
  // parked cars along the curbs (the unmarked car first: the player sits in it)
  const cars = [[S.car1.x, S.car1.y, 0, '#b0a07a'], [S.car2.x, S.car2.y, Math.PI, '#b0a07a'], [28 * T, 9 * T + 6, 0, '#5a2a2a'], [56 * T, 12 * T + 10, Math.PI, '#3a4a6a'],
    [6 * T, 34 * T + 10, Math.PI, '#4a5a3a'], [24 * T, 31 * T + 6, 0, '#6a6a6a'], [46 * T + 8, 20 * T, Math.PI / 2, '#2a2a3a'], [15 * T + 8, 24 * T, -Math.PI / 2, '#7a6a4a'], [58 * T, 31 * T + 6, 0, '#8a3a2a']];
  cars.forEach(([x, y, f, c], i) => D.push(['solid', 'sedan', x, y, { facing: f, mats: { b: { color: c, pattern: 'glaze' } }, car: i }]));
  for (const d of D) if (d[0] === 'solid') map.solid(d[1], d[2], d[3], 0, d[4]);
  S.dress = D;
  // blend spots: where a plainclothes cop looks like he belongs
  S.blend = [{ x: S.busstop.x, y: S.busstop.y + 10, r: 22, name: 'Bus stop' }, { x: S.payphone.x, y: S.payphone.y + 10, r: 16, name: 'Payphone' },
    { x: 12 * T, y: 7 * T + 14, r: 14, name: 'Stoop' }, { x: 36 * T, y: 7 * T + 14, r: 14, name: 'Stoop' }, { x: 52 * T, y: 13 * T + 6, r: 14, name: 'Stoop' }, { x: 41 * T, y: 13 * T + 4, r: 14, name: 'Stoop' },
    { x: 24 * T, y: 7 * T + 14, r: 18, name: 'Lucky\'s' }, { x: 44 * T + 8, y: 34 * T, r: 16, name: 'Corner' }];
  S.cars = cars;
  return S;
})();

// a small interior map maker: rows, a floor material per tag, wall types
function interior(rows, legend, types, floors) {
  return new E.TileMap({ rows, legend, types, floorTex: (x, y, tag) => (FLOORS[tag] || FLOORS.concrete)(x, y), ao: 5, outside: '#08080a' });
}
const OFFICE = (() => {
  const rows = [
    '##############',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '######..######'];
  const map = interior(rows, { '#': 1, '.': { floor: 'lino' } }, { 1: { h: 40, top: '#2a2a2a', side: '#9a9a88', face: 'drywall', roof: 'plain', cut: true, cutH: 8 } });
  const dress = [['desk', 3 * T, 3 * T, Math.PI / 2], ['desk', 6 * T, 3 * T, Math.PI / 2], ['desk', 3 * T, 6 * T, Math.PI / 2], ['desk', 9 * T + 8, 6 * T, Math.PI / 2],
    ['filecab', 12 * T + 4, 2 * T, Math.PI], ['filecab', 12 * T + 4, 3 * T, Math.PI], ['filecab', 1 * T + 10, 8 * T, 0],
    ['officechair', 3 * T, 4 * T, -Math.PI / 2], ['officechair', 6 * T, 4 * T, -Math.PI / 2], ['officechair', 3 * T, 7 * T, -Math.PI / 2]];
  for (const [id, x, y, f] of dress) if (id !== 'officechair') map.solid(id, x, y, 0, { facing: f });
  return { map, dress, board: { x: 8 * T, y: 1 * T + 10 }, door: { x: 7 * T, y: 9 * T + 4 }, mabry: { x: 10 * T, y: 3 * T + 8 }, feld: { x: 11 * T, y: 7 * T }, briggs: { x: 6 * T + 4, y: 4 * T + 4 } };
})();
const BASEMENT = (() => {
  const rows = ['##########', '#........#', '#........#', '#........#', '#........#', '#........#', '##########'];
  const map = interior(rows, { '#': 1, '.': { floor: 'concrete' } }, { 1: { h: 36, top: '#222', side: '#7a7a74', face: 'cinder', roof: 'plain', cut: true, cutH: 8 } });
  const dress = [['reel', 3 * T, 2 * T, Math.PI / 2], ['reel', 6 * T + 8, 2 * T, Math.PI / 2], ['officechair', 3 * T, 3 * T + 4, -Math.PI / 2], ['officechair', 6 * T + 8, 3 * T + 4, -Math.PI / 2],
    ['filecab', 8 * T + 6, 5 * T, Math.PI], ['desk', 2 * T, 5 * T, -Math.PI / 2]];
  return { map, dress, seatA: { x: 3 * T, y: 3 * T + 6 }, seatB: { x: 6 * T + 8, y: 3 * T + 6 } };
})();
const STASH = (() => {
  const rows = [
    '############',
    '#....#.....#',
    '#....#.....#',
    '#....D.....#',
    '#....#.....#',
    '##D###..####',
    '#..........#',
    '#..........#',
    '#####..#####'];
  const map = interior(rows, { '#': 1, D: { floor: 'boards' }, '.': { floor: 'boards' } }, { 1: { h: 36, top: '#1a1614', side: '#7a6a58', face: 'plaster', roof: 'plain', cut: true, cutH: 8 } });
  const dress = [['solid', 'couch', 7 * T, 7 * T + 8, { facing: -Math.PI / 2 }], ['solid', 'fridge', 9 * T, 1 * T + 6, { facing: Math.PI / 2 }], ['solid', 'stove', 7 * T + 8, 1 * T + 6, { facing: Math.PI / 2 }],
    ['solid', 'toilet', 1 * T + 8, 1 * T + 6, { facing: Math.PI / 2 }], ['solid', 'mattress', 3 * T, 3 * T, {}], ['prop', 'trashcan', 10 * T + 4, 6 * T + 6, {}]];
  for (const d of dress) if (d[0] === 'solid') map.solid(d[1], d[2], d[3], 0, d[4]);
  // the places to search: two hold what the case needs
  const spots = [
    { id: 'couch', name: 'Couch cushions', x: 7 * T, y: 7 * T, holds: null, note: 'Bottle caps. A cold french fry. Nothing.' },
    { id: 'fridge', name: 'Freezer', x: 9 * T, y: 2 * T + 4, holds: 'package', note: 'Behind the ice trays: the re-up. Bricks, taped tight.' },
    { id: 'toilet', name: 'Toilet tank', x: 1 * T + 8, y: 2 * T + 4, holds: null, note: 'Rust and a dead roach.' },
    { id: 'vent', name: 'Floor vent', x: 4 * T, y: 7 * T, holds: 'ledger', note: 'A spiral notebook. Names. Numbers. A column marked "D".' },
    { id: 'mattress', name: 'Mattress', x: 3 * T, y: 3 * T, holds: null, note: 'Springs and stains. Someone sleeps here.' }
  ];
  return { map, dress, spots, entry: { x: 5 * T + 8, y: 8 * T }, squad: [{ x: 6 * T, y: 6 * T + 8 }, { x: 4 * T, y: 7 * T }] };
})();

// ---- actors: a body, a rig, and what it is doing ----------------------------------------------------------------
class Actor {
  constructor(id, x, y, o = {}) {
    this.id = id; this.name = o.name || id; this.role = o.role || 'civ';
    this.body = new E.Body({ x, y, r: 5 }); this.body.facing = o.facing || 0; this.facing = o.facing || 0;
    this.rig = o.rig || (CAST[id] ? CAST[id].rig : new E.Humanoid(Object.assign({ size: 1.3, weapon: null }, o.look || {})));
    this.speed = o.speed || 34; this.path = []; this.wait = 0; this.state = o.state || 'idle'; this.t = 0; this.pose = null; this.expr = null; this.hidden = false;
    this.sus = 0; this.susState = 'calm'; this.tag = null; this.point = false; this.stance = null; this.down = 0; this.run = 0; this.label = o.label || null; this.ghost = false;
  }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  goTo(x, y, speed) { this.path = [{ x, y }]; if (speed) this.speed = speed; }
  follow(points, speed) { this.path = points.map(p => ({ x: p.x, y: p.y })); if (speed) this.speed = speed; }
  arrived() { return !this.path.length; }
  face(a) { this.facing = typeof a === 'number' ? a : Math.atan2(a.y - this.y, a.x - this.x); }
  update(dt, map) {
    const b = this.body;
    if (this.path.length) {
      const p = this.path[0], dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
      if (d < 3) { this.path.shift(); b.vx = b.vy = 0; this.stuck = 0; }
      else {
        // a walker that makes no headway for a while skips the point (a car parked on its line, a corner cut)
        const moved = this._lx === undefined ? 1 : Math.hypot(b.x - this._lx, b.y - this._ly);
        this.stuck = moved < this.speed * dt * .25 ? (this.stuck || 0) + dt : 0;
        if (this.stuck > 2.5) { this.stuck = 0; if (this.path.length > 1) this.path.shift(); else { b.x = p.x; b.y = p.y; this.path.shift(); } } b.vx = dx / d * this.speed; b.vy = dy / d * this.speed; this.facing = E.approachAng ? E.approachAng(this.facing, Math.atan2(dy, dx), 10 * dt) : Math.atan2(dy, dx); }
    } else { b.vx = 0; b.vy = 0; }
    this._lx = b.x; this._ly = b.y;
    if (map) b.update(dt, map); else { b.x += b.vx * dt; b.y += b.vy * dt; }
    b.facing = this.facing;
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: this.facing, pose: this.pose || undefined, expr: this.expr || undefined, point: this.point, stance: this.stance || undefined, down: this.down || undefined, run: this.run || undefined });
  }
  draw(r, o = {}) {
    if (this.hidden) return;
    const b = this.body;
    r.shadow(b.x, b.y, 7, .35, undefined, b.groundZ || 0);
    r.actor(b.x, b.y, b.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), Object.assign({ xray: o.xray || false, key: this, every: o.every }, o.ghost ? { alpha: .5 } : {}));
  }
}
function drawTag(r, a, text, color = '#f0ece0') {
  const h = a.rig && a.rig.o ? 44 * (a.rig.o.size || 1.3) / 1.3 : 44;
  r.textAt(a.x, a.y, (a.z || 0) + h, text, color);
}
// sight: where a lookout's eyes can reach, as E.sees with the height rules, plus a blending multiplier
function canSee(watcher, target, map, o = {}) {
  const s = E.sees({ x: watcher.x, y: watcher.y, z: watcher.z || 0, facing: watcher.facing }, target, { range: o.range || 130, fov: o.fov || 1.5, map });
  return s;
}
