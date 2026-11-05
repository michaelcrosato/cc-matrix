/* 05-world: Penn Row, West Baltimore, October 2004 (App. A): the neighbourhood TileMap, its wall types and facades, its
   floors, its dressing (lamps, poles and the phone wires, signs, parked cars, stoops, the memorial), the time-of-day
   presets, and the small interiors (the Annex, the box, the wire room, chambers, the kitchen, the back room). */
const ROWS = [
  '#######xx######################xx########################xx#############',
  '#-----.==.--------------------.==.----------------------.==.-----------#',
  '#-----.==.--------------------.==.----------------------.==.-----------#',
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',
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
  '#QQQQQ.==.FFFRRRRRBBBBRRRRSSSS.==.LLLLEEEEEEMMMMMM$$$$$$.==.HHHHHHHHHHH#',
  '#QQQQQ.==.FFFRRRRRBBBBRRRRSSSS.==.LLLLEEEEEEMMMMMM$$$$$$.==.HHHHHHHHHHH#',
  '#QQQQQ.==.FFFRRRRRBBBBRRRRSSSS.==.LLLLEEEEEEMMMMMM$$$$$$.==.HHHHHHHHHHH#',
  '#QQQQQ.==.FFFRRRRRBBBBRRRRSSSS.==.LLLLEEEEEEMMMMMM$$$$$$.==.HHHHHHHHHHH#',
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
const WALLCH = '#RFPVSLEM$KBQHTCGk', STORES = { S: ['GAITHER MARKET', '#e04a3a', 'south'], L: ['SUDS CITY', '#4aa8ff', 'south'], E: ['RIDLEY WIRELESS & PAGER', '#ffd040', 'south'],
  M: ["MAMA B'S SOUL FOOD", '#ff9a3a', 'south'], $: ['CHECKS CASHED', '#4ae07a', 'south'], K: ['RIDLEY CARRYOUT  WINGS FRIES SUBS', '#ff4a6a', 'north'], B: ['FADES & GRADES', '#6aa8ff', 'south'], Q: ['ABBOTT LIQUORS', '#ff5a4a', 'south'] };
const FLOORS = { '.': 'walk', '=': 'road', '-': 'alley', ',': 'lot', ':': 'court', b: 'ball', p: 'play', v: 'vacant', g: 'garage' };
const nz = (x, y) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const C3 = h => E.hex(h);
const SIDEWALK_ROWS = [12, 15, 26, 30, 44, 45], SIDEWALK_COLS = [6, 9, 30, 33, 56, 59];
function floorTex(x, y, tag) {
  const cx = Math.floor(x / 16), cy = Math.floor(y / 16), n = nz(x, y), lx = x - cx * 16, ly = y - cy * 16;
  const sh = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  if (tag === 'walk') {
    let c = (cx + cy) % 2 ? [138, 138, 132] : [128, 128, 122];
    if (lx < .7 || ly < .7) c = [96, 96, 92];
    if (nz(cx, cy) > .82 && Math.abs((lx - ly) - 3) < .5) c = [90, 90, 86];
    if (n > .93) c = sh(c, .88);
    if (nz(cx * 3, cy * 7) > .9 && n > .6) c = [70, 70, 68];   // gum and stains
    return c;
  }
  if (tag === 'road' || tag === 'edge') {
    let c = [46 + n * 8, 46 + n * 8, 50 + n * 8];
    const xw = SIDEWALK_COLS.includes(cx), yw = SIDEWALK_ROWS.includes(cy);
    if ((yw && Math.floor(x / 3) % 2 === 0 && ly > 2 && ly < 14) || (xw && Math.floor(y / 3) % 2 === 0 && lx > 2 && lx < 14)) c = [196, 196, 186];   // crosswalks
    if (Math.abs(y - 448) < .9 && Math.floor(x / 10) % 2 === 0 && !xw) c = [210, 170, 40];   // Ridley's dashed yellow line
    if (Math.abs(y - 224) < .9 && Math.floor(x / 10) % 2 === 0 && !xw) c = [200, 160, 40];   // Dunmore
    if ((Math.abs(x - 128) < .9 || Math.abs(x - 512) < .9 || Math.abs(x - 928) < .9) && Math.floor(y / 10) % 2 === 0 && !yw) c = [200, 160, 40];
    const mh = nz(cx, cy * 5) > .94; if (mh && Math.hypot(lx - 8, ly - 8) < 4) c = Math.hypot(lx - 8, ly - 8) > 3 ? [30, 30, 32] : [60, 58, 54];
    if (tag === 'edge') c = sh(c, .7);
    return c;
  }
  if (tag === 'alley') { let c = [58 + n * 10, 56 + n * 9, 54 + n * 8]; if (nz(x >> 1, y >> 1) > .985) c = [70, 96, 48]; if (Math.abs(((x * .7 + y) % 23) - 11) < .4 && nz(cx, cy) > .5) c = [36, 34, 32]; return c; }
  if (tag === 'lot') { const g = nz(x >> 1, y >> 1); return g > .7 ? [74 + n * 20, 92 + n * 20, 46] : g > .5 ? [88, 80, 60] : [104 + n * 14, 90 + n * 12, 66 + n * 8]; }
  if (tag === 'court') { const bx = Math.floor(x / 8), by = Math.floor(y / 8); let c = (bx + by) % 2 ? [120, 112, 100] : [128, 120, 106]; if (x % 8 < .7 || y % 8 < .7) c = [92, 86, 78]; return n > .95 ? sh(c, .85) : c; }
  if (tag === 'ball') {
    let c = [58 + n * 6, 64 + n * 6, 70 + n * 6]; const X0 = 176, X1 = 400, Y0 = 752, Y1 = 848, cxm = 288, cym = 800;
    const ln = (a, b) => Math.abs(a - b) < .8;
    if (((ln(x, X0 + 2) || ln(x, X1 - 2)) && y > Y0 && y < Y1) || ((ln(y, Y0 + 2) || ln(y, Y1 - 2)) && x > X0 && x < X1) || ln(x, cxm) || Math.abs(Math.hypot(x - cxm, y - cym) - 20) < .8) c = [208, 200, 180];
    if (Math.abs(Math.hypot(x - X0, y - cym) - 34) < .8 || Math.abs(Math.hypot(x - X1, y - cym) - 34) < .8) c = [208, 200, 180];
    return c;
  }
  if (tag === 'play') return [150 + n * 14, 70 + n * 8, 62];
  if (tag === 'vacant') { const b = Math.floor(y / 4); let c = b % 2 ? [78, 58, 40] : [70, 52, 36]; if (nz(cx * 9 + b, cy) > .8 && lx > 4 && lx < 9) c = [24, 20, 18]; if (n > .9) c = [110, 100, 88]; return c; }
  if (tag === 'garage') { let c = [96 + n * 10, 94 + n * 10, 90 + n * 8]; if (Math.hypot(x - 840, y - 800) < 14 * nz(3, 9) + 6) c = [44, 42, 40]; return c; }
  if (tag === 'fence') return [92 + n * 10, 84 + n * 8, 66];
  if (tag === 'lino') { const b = (Math.floor(x / 8) + Math.floor(y / 8)) % 2; return b ? [138, 132, 120] : [122, 116, 106]; }
  if (tag === 'wood') { const b = Math.floor(y / 3); return b % 2 ? [120, 84, 52] : [110, 76, 46]; }
  if (tag === 'tile') { const b = (Math.floor(x / 6) + Math.floor(y / 6)) % 2; return b ? [200, 196, 180] : [70, 110, 120]; }
  if (tag === 'carpet') return [90 + n * 8, 40 + n * 4, 40];
  return [100, 100, 100];
}
const storeFace = (letter, front) => face => {
  const t = face.type, gl = '#ffd890', dark = '#2a2420';
  if (face.side !== front && !(letter === 'Q' && face.side === 'east')) { if (face.z1 > 20) face.quad(face.u0 + 4, 16, face.u1 - 4, 26, '#3a3430'); return; }
  const door = (face.cx + face.cy) % 3 === 0;
  if (door) { face.quad(face.u0 + 4, 0, face.u1 - 4, 15, '#3a2a20'); face.quad(face.u0 + 5, 1, face.u1 - 5, 14, '#ffe6b0'); face.line(face.u0 + 8, 1, face.u0 + 8, 14, '#5a4a3a'); }
  else { face.quad(face.u0 + 1, 3, face.u1 - 1, 17, dark); face.quad(face.u0 + 2, 4, face.u1 - 2, 16, gl); face.line(face.u0 + 2, 8, face.u1 - 2, 8, '#e8c070'); if ((face.cx * 7 + face.cy) % 4 === 0) face.quad(face.u0 + 3, 4, face.u0 + 8, 11, '#c86a3a'); }
  face.quad(face.u0, 19, face.u1, 28, STORES[letter][1]);
  face.quad(face.u0, 18, face.u1, 19, '#1a1614');
};
const vacantFace = face => {
  const h = nz(face.cx, face.cy);
  for (const [z0, z1] of [[6, 16], [22, 32]]) { if (z1 > face.z1) continue; face.quad(face.u0 + 3, z0, face.u1 - 3, z1, '#b08a5a'); face.line(face.u0 + 3, z0 + 5, face.u1 - 3, z0 + 5, '#8a6a42'); }
  if (h > .6 && face.z1 > 10) { face.line(face.u0 + 2, 9, face.u0 + 9, 12, '#e84a8a'); face.line(face.u0 + 5, 13, face.u1 - 2, 8, '#4ac8e8'); }
  if (h < .25 && face.z1 > 30) { face.line(face.u0 + 4, 26, face.u0 + 8, 30, '#e8e8e8'); face.line(face.u0 + 8, 30, face.u0 + 12, 26, '#e8e8e8'); }   // the V mark
};
function wallTypes() {
  const T0 = { cut: true, cutH: 6 };
  const ty = {
    1: { h: 56, top: '#3a2a26', side: '#5a3a30', face: 'brick', roof: 'slab', windows: { lit: .15 } },
    2: { h: 40, top: '#4a3a34', side: '#7a3b2e', face: 'brick', roof: 'slab', windows: { lit: .25 }, door: { chance: .35, color: '#4a2a1e' } },
    3: { h: 40, top: '#4a4844', side: '#8a8680', face: { color: '#8a8680', pattern: 'stones', size: 5 }, roof: 'slab', windows: { lit: .25 }, door: { chance: .35, color: '#2a3a4a' } },
    4: { h: 36, top: '#5a5048', side: '#b8a27a', face: 'plaster', roof: 'slab', windows: { lit: .3 }, shutters: '#3a5a6a', door: { chance: .3, color: '#6a2a1e' } },
    5: { h: 40, top: '#3a2a24', side: '#4a2e26', face: 'brick', roof: 'slab', decorate: vacantFace },
    14: { h: 64, top: '#5a5650', side: '#8a847a', face: 'stone', roof: 'slab', arch: { chance: 1 }, windows: { w: 4, h: 14, step: 20, lit: .5 } },
    15: { h: 88, top: '#5a5650', side: '#8a847a', face: 'stone', roof: 'slab', windows: { w: 3, h: 12, step: 24, lit: .4 } },
    16: { h: 44, top: '#5a4a3a', side: '#9a7a5a', face: 'brick', roof: 'slab', windows: { lit: .35 }, door: { chance: .3, color: '#3a2a20' }, balcony: { z: 22, color: '#4a4a4a' } },
    17: { h: 24, top: '#4a4a4a', side: '#6a6a6a', face: { color: '#6a6a6a', pattern: 'corrugated' }, roof: 'plain' },
    18: { h: 20, top: '#d8d8d0', side: '#e8e8e0', face: 'plaster', roof: 'plain', decorate: f => { f.quad(f.u0, 12, f.u1, 16, '#b02a22'); if (f.side === 'west') f.quad(f.u0 + 3, 2, f.u1 - 3, 10, '#5a6a7a'); } }
  };
  'SLEM$KBQ'.split('').forEach((ch, i) => { ty[6 + i] = { h: 32, top: '#3a3430', side: ch === 'S' || ch === 'K' ? '#9a8a6a' : ch === 'M' ? '#8a4a2a' : '#7a5a4a', face: ch === 'L' || ch === 'S' ? 'plaster' : 'brick', roof: 'slab', decorate: storeFace(ch, STORES[ch][2]) }; });
  for (const k in ty) Object.assign(ty[k], T0);
  ty[17].cut = false; ty[18].cut = false;
  return ty;
}
const legendOf = () => { const L = {}; WALLCH.split('').forEach((c, i) => { L[c] = i + 1; }); for (const k in FLOORS) L[k] = { floor: FLOORS[k] }; L.f = { floor: 'fence', block: true }; L.x = { floor: 'edge', block: true }; return L; };

/* ---- the neighbourhood: one map for every mission, versus and attract ---- */
const World = {
  map: null, lamps: [], poles: [], wires: [], signs: [], parked: [], stoops: [], props: [], pigeons: [], tod: 'day', fx: {},
  build() {
    const map = new E.TileMap({ rows: ROWS, legend: legendOf(), types: wallTypes(), floorTex, ao: 4, outside: '#16141a' });
    this.map = map;
    // the cutaway: besides the engine's rule, walls standing between the camera and the focus (the player) drop low,
    // in a cone that widens toward the camera, so a rowhouse block never hides who you're playing
    const base = map.isFront.bind(map);
    map.isFront = (cx, cy, view) => {
      const f = World.focus, t = map.types[map.cell(cx, cy)]; if (!t || !t.cut) return false;
      if (f && view && !view.isTop) { const l = Math.hypot(view.fx, view.fy) || 1, fx = view.fx / l, fy = view.fy / l, rx = W(cx) - f.x, ry = W(cy) - f.y, along = rx * fx + ry * fy, lat = Math.abs(rx * fy - ry * fx);
        if (along > 4 && along < 150 && lat < 40 + along * .45) return true; }
      return base(cx, cy, view);
    };
    // street lamps every 6 cells along the sidewalks (never on the road)
    const lamp = (x, y) => { const c = map.toCell(x, y); if (map.walkable(c[0], c[1]) && map.floorAt(x, y) === 'walk') this.lamps.push([x, y]); };
    for (let cx = 3; cx < 71; cx += 6) { lamp(W(cx), 26.2 * T); lamp(W(cx + 3), 30.8 * T); lamp(W(cx), 12.2 * T); lamp(W(cx + 3), 15.8 * T); }
    for (let cy = 3; cy < 55; cy += 6) { lamp(6.2 * T, W(cy)); lamp(33.8 * T, W(cy + 3)); lamp(30.2 * T, W(cy)); lamp(59.8 * T, W(cy + 3)); }
    // utility poles every 8 cells along the alleys and Ridley, and the sagging wires between them
    const line = (y, from, to) => { const ps = []; for (let cx = from; cx <= to; cx += 8) { const x = W(cx); const c = map.toCell(x, y); if (map.walkable(c[0], c[1])) ps.push([x, y]); } this.poles.push(...ps); for (let i = 0; i + 1 < ps.length; i++) if (ps[i + 1][0] - ps[i][0] < 9 * T) this.wires.push([ps[i], ps[i + 1]]); };
    line(1.3 * T, 2, 68); line(20.3 * T, 2, 54); line(42.6 * T, 2, 68); line(26.15 * T, 2, 54);
    // a wire across Ridley at Gaither, with the sneakers on it
    this.wires.push([[31.5 * T, 26.15 * T], [31.5 * T, 30.8 * T]]); this.poles.push([31.5 * T, 30.8 * T]);
    this.sneakers = [31.5 * T, 28.5 * T];
    // signs on the stores' street faces
    for (const ch in STORES) {
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      ROWS.forEach((row, cy) => { for (let cx = 0; cx < row.length; cx++) if (row[cx] === ch) { x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy); } });
      const front = STORES[ch][2], y = front === 'south' ? (y1 + 1) * T + 1 : y0 * T - 1;
      this.signs.push({ x: (x0 + x1 + 1) / 2 * T, y, z: 30, text: STORES[ch][0], color: STORES[ch][1] });
    }
    // parked cars on the south curb of Ridley and a dead Buick on Gaither
    for (const [x, id, col] of [[13, 'sedan', '#4a5a3a glaze'], [17.5, 'sedan', '#7a7a7e glaze'], [27, 'sedan', '#6a2a2a glaze'], [36.5, 'sedan', '#2a3a5a glaze'], [48, 'sedan', '#8a8a7a glaze'], [52.5, 'sedan', '#3a3a3a glaze']])
      this.parked.push({ id, x: x * T, y: 29.5 * T, facing: 0, mats: { b: col } });
    this.parked.push({ id: 'chevy', x: 22.5 * T, y: 29.5 * T, facing: 0, tag: 'chevy' });
    this.parked.push({ id: 'deadbuick', x: 32.5 * T, y: 40.5 * T, facing: -Math.PI / 2, tag: 'buick' });
    this.parked.push({ id: 'burnedcar', x: 64.5 * T, y: 38.5 * T, facing: .5 });
    for (const p of this.parked) map.solid(p.id, p.x, p.y, 0, { facing: p.facing });
    // stoops along the rowhouse fronts, props of the street
    for (let cx = 11; cx < 56; cx += 3) { if (map.cell(cx, 11) && !map.cell(cx, 12)) this.stoops.push([W(cx), 12.3 * T, Math.PI / 2]); if (map.cell(cx, 16) && !map.cell(cx, 15)) this.stoops.push([W(cx), 15.7 * T, -Math.PI / 2]); if (map.cell(cx, 31) && !map.cell(cx, 30) && cx !== 31) this.stoops.push([W(cx), 30.7 * T, -Math.PI / 2]); }
    this.stoops.push([30.7 * T, 39.5 * T, Math.PI], [33.3 * T, 37.5 * T, 0]);   // Felton's and Odessa's
    const P = (kind, cx, cy, o = {}) => this.props.push(Object.assign({ kind, x: cx * T, y: cy * T }, o));
    for (const [cx, cy] of [[29.6, 25.6], [36.4, 30.5], [8.6, 26.4], [57, 26.4], [40.5, 12.6], [21, 44.6], [30.6, 41.3]]) P('trashcan', cx, cy);
    for (const [cx, cy] of [[30.4, 30.4], [9.4, 15.4], [56.4, 26.4], [33.6, 12.6]]) P('hydrant', cx, cy);
    P('firedrum', 63.5, 34.5, { light: true }); P('shape', 61.5, 40.5, { id: 'mattress' }); P('shape', 47, 21.3, { id: 'dumpster', facing: 0 });
    P('shape', 19.5, 45.4, { id: 'trashbag' }); P('shape', 40.2, 20.5, { id: 'trashbag' }); P('shape', 41.6, 20.4, { id: 'trashbag' }); P('shape', 43, 20.6, { id: 'trashbag' }); P('shape', 39.6, 21.2, { id: 'trashbag' }); P('shape', 42.4, 21.3, { id: 'trashbag' });
    P('shape', 62.5, 47.5, { id: 'gaspump', facing: Math.PI / 2 }); P('shape', 62.5, 50.5, { id: 'gaspump', facing: Math.PI / 2 }); P('shape', 60.6, 53.6, { id: 'kiosksign' });
    for (const [cx, cy] of [[60.3, 46.3], [65.7, 46.3], [60.3, 51.7], [65.7, 51.7]]) P('shape', cx, cy, { id: 'canopy' });
    P('shape', 11.6, 50, { id: 'hoop', facing: 0 }); P('shape', 24.4, 50, { id: 'hoop', facing: Math.PI }); P('shape', 46, 46, { id: 'swings', facing: Math.PI / 2 });
    P('shape', 43, 30.75, { id: 'busshelter', facing: -Math.PI / 2 }); P('shape', 28.5, 26.2, { id: 'payphone', facing: Math.PI / 2, tag: 'P1' }); P('shape', 35.5, 26.2, { id: 'payphone', facing: Math.PI / 2, tag: 'P2' }); P('shape', 41.2, 30.7, { id: 'payphone', facing: -Math.PI / 2, tag: 'P3' });
    P('shape', 27.4, 36.4, { id: 'radiator', facing: 0 }); P('shape', 35.5, 36.5, { id: 'coop', z: 40 }); P('shape', 30.9, 39.5, { id: 'candlecluster', facing: Math.PI, tag: 'memorial', light: true });
    P('shape', 52.5, 50.5, { id: 'workbench', facing: Math.PI / 2, tag: 'garage' }); P('shape', 53.6, 49.6, { id: 'toolbox', tag: 'garage' }); P('shape', 51.5, 51.6, { id: 'crate2', tag: 'garage' });
    for (const [cx, cy, f] of [[10.5, 46.2, 0], [12.5, 46.2, 0], [14.5, 46.2, 0], [21.5, 46.2, 0], [23.5, 46.2, 0], [25.5, 46.2, 0], [61.5, 31.2, 0], [65.5, 31.2, 0], [67.5, 31.2, 0], [69.5, 31.2, 0]]) P('shape', cx, cy, { id: 'chainlink', facing: f });
    for (const [cx, cy] of [[10.2, 48], [10.2, 51], [25.8, 48], [25.8, 51], [60.2, 33], [60.2, 36], [60.2, 39]]) P('shape', cx, cy, { id: 'chainlink', facing: Math.PI / 2 });
    for (const [cx, cy] of [[7.5, .6], [32.5, .6], [58.5, .6], [7.5, 55.4], [32.5, 55.4], [58.5, 55.4], [.6, 13.5], [.6, 28], [71.4, 13.5], [71.4, 28]]) P('shape', cx, cy, { id: 'sawhorse', facing: cx < 1 || cx > 71 ? 0 : Math.PI / 2 });
    // pigeons on the wire by Odessa's roof
    for (let i = 0; i < 7; i++) this.pigeons.push({ hx: 30 * T + i * 9, hy: 42.6 * T, hz: 62, x: 30 * T + i * 9, y: 42.6 * T, z: 62, vx: 0, vy: 0, vz: 0, away: 0 });
    return map;
  },
  /** the mood by time of day (§12.1) */
  setTOD(name) {
    this.tod = name; const L = game.lights;
    const P = { dawnRain: [.45, [26, 32, 52], .7], day: [1, [20, 20, 30], 0], dusk: [.62, [60, 30, 60], 0], night: [.38, [10, 14, 34], 0], nightRain: [.36, [12, 16, 34], .8], interior: [.7, [24, 18, 30], 0], interiorNight: [.5, [20, 16, 34], 0] }[name] || [1, [0, 0, 0], 0];
    L.enabled = P[0] < .99 && !HEADLESS; L.ambient = P[0]; L.dark = P[1]; try { L.refresh(); } catch (e) { /* headless */ }
    game.weather = P[2] ? { kind: 'rain', amount: P[2], wind: .2, lightning: name === 'nightRain' ? .05 : 0 } : null;
  },
  get dark() { return this.tod !== 'day' && this.tod !== 'interior'; },
  /** draw the neighbourhood: floor, walls, and everything that dresses it */
  draw(r, o = {}) {
    const map = this.map, vis = (x, y, z = 0) => r.visible(x, y, z, 80, 90, 120), dark = this.dark, t = game.real;
    map.drawFloor(r); map.queueWalls(r);
    for (const [x, y] of this.lamps) if (vis(x, y)) { r.prop('streetlamp', x, y, 0, { size: 1.35, light: false, cone: this.tod === 'night' || this.tod === 'nightRain', halo: false }); if (dark) game.lights.add(x, y, 30, 52, .8, { color: '#ffb04a' }); }
    for (const [x, y] of this.poles) if (vis(x, y)) r.shape('pole', x, y, 0, { facing: 0 });
    for (const [x, y, f] of this.stoops) if (vis(x, y)) r.shape('stoop', x, y, 0, { facing: f });
    for (const p of this.parked) if (!p.hidden && vis(p.x, p.y)) r.shape(p.id, p.x, p.y, 0, { facing: p.facing, mats: p.mats, pick: p.pick });
    for (const p of this.props) {
      if (p.hidden || !vis(p.x, p.y, p.z || 0)) continue;
      if (p.kind === 'shape') r.shape(p.id, p.x, p.y, p.z || 0, { facing: p.facing === undefined ? Math.PI / 2 : p.facing, light: p.light && dark, pick: p.pick });
      else r.prop(p.kind, p.x, p.y, 0, { size: 1.3, light: p.light && dark });
    }
    // Felton's memorial shrinks a little every episode
    // store signs: dark boards with the name; neon after dark
    for (const s of this.signs) if (vis(s.x, s.y, s.z)) r.queue(s.x, s.y, s.z, g => {
      const [sx, sy] = r.w(s.x, s.y, s.z), small = s.text.length > 11, w = Math.min(130, E.font.width(s.text, small ? { font: 'tiny' } : {}) + 6);
      px.rect(g, Math.round(sx - w / 2), Math.round(sy - 6), w, small ? 9 : 11, '#141012');
      E.font.text(g, s.text, Math.round(sx), Math.round(sy - 4), dark ? s.color : E.mix(s.color, '#ffffff', .25), { align: 'center', font: small ? 'tiny' : undefined, outline: false });
    }, { emissive: dark, bias: 2 });
    if (dark) {   // lit windows and doorways spill light; a TV flickers blue in one window a block
      for (const s of this.signs) if (vis(s.x, s.y)) game.lights.add(s.x, s.y + (s.y > 450 ? -6 : 6), 10, 34, .45, { color: s.color });
      const tv = Math.sin(t * 13) * .3 + .7;
      for (const [x, y] of [[12 * T, 12 * T], [44 * T, 31 * T], [20 * T, 15.9 * T], [62 * T, 12 * T]]) if (vis(x, y)) game.lights.add(x, y, 20, 24, .4 * tv, { color: '#6a8aff' });
    }
    // the garage's fake roof (fades when someone is inside or near its doors) and the burned 1412 vacant's charred beams
    const inside = o.near && o.near.x > 49.5 * T && o.near.x < 56.5 * T && o.near.y > 47.5 * T && o.near.y < 54 * T;
    this.fx.roofA = approach(this.fx.roofA === undefined ? 1 : this.fx.roofA, inside ? .15 : 1, .05);
    if (vis(53 * T, 51 * T)) r.queue(53 * T, 51 * T, 24, g => {
      const a = this.fx.roofA, pts = [[50 * T, 48 * T], [56 * T, 48 * T], [56 * T, 54 * T], [50 * T, 54 * T]].map(([x, y]) => r.w(x, y, 24.5));
      if (a > .9) px.poly(g, pts, '#5a5a5c'); else px.polyDither(g, pts, '#5a5a5c', a, r.ix, r.iy);
      if (a > .9) for (let i = 1; i < 6; i++) { const p = r.w(50 * T + i * T, 48 * T, 24.5), q = r.w(50 * T + i * T, 54 * T, 24.5); px.line(g, p[0], p[1], q[0], q[1], '#4a4a4c'); }
    }, { footprint: [50 * T, 48 * T, 56 * T, 54 * T] });
    if (vis(28 * T, 36 * T)) r.queue(28 * T, 36.5 * T, 40, g => { for (const [a, b] of [[[26.2, 35.3], [29.8, 35.9]], [[26.4, 36.8], [29.6, 37.4]], [[27, 35.2], [27.4, 37.8]]]) { const p = r.w(a[0] * T, a[1] * T, 38), q = r.w(b[0] * T, b[1] * T, 38); px.line(g, p[0], p[1], q[0], q[1], '#1a1210', 2); } }, { footprint: [26 * T, 35 * T, 30 * T, 38 * T] });
    // the phone wires (the game's motif), sneakers over Gaither & Ridley, pigeons on the wire
    r.overlay(g => {
      for (const [a, b] of this.wires) {
        const pa = r.w(a[0], a[1], 70), pb = r.w(b[0], b[1], 70); if (Math.max(pa[0], pb[0]) < -20 || Math.min(pa[0], pb[0]) > r.W + 20 || Math.max(pa[1], pb[1]) < -20 || Math.min(pa[1], pb[1]) > r.H + 30) continue;
        for (const dz of [0, -2.5]) { let prev = null; for (let i = 0; i <= 8; i++) { const u = i / 8, sag = Math.sin(u * Math.PI) * 7, p = r.w(lerp(a[0], b[0], u), lerp(a[1], b[1], u), 70 + dz - sag); if (prev) px.line(g, prev[0], prev[1], p[0], p[1], dz ? '#1e1c1c' : '#141212'); prev = p; } }
      }
      const [sx, sy] = r.w(this.sneakers[0], this.sneakers[1], 64), sw = Math.sin(t * 1.3) * 1.5;
      px.line(g, sx, sy - 3, sx + sw - 2, sy + 4, '#141212'); px.line(g, sx, sy - 3, sx + sw + 2, sy + 5, '#141212');
      px.rect(g, Math.round(sx + sw - 4), Math.round(sy + 4), 4, 2, '#e8e6e0'); px.rect(g, Math.round(sx + sw + 1), Math.round(sy + 5), 4, 2, '#e8e6e0');
      for (const p of this.pigeons) { const [x, y] = r.w(p.x, p.y, p.z); if (x < -4 || x > r.W + 4 || y < -4 || y > r.H) continue; px.rect(g, Math.round(x) - 1, Math.round(y) - 2, 3, 2, '#7a7a86'); px.dot(g, Math.round(x) + 1, Math.round(y) - 3, '#9a9aa6'); }
    });
  },
  /** pigeons scatter when someone runs under them (cosmetic) */
  tick(dt, runners) {
    for (const p of this.pigeons) {
      if (p.away > 0) { p.away -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.away <= 0) { p.x = p.hx; p.y = p.hy; p.z = p.hz; } continue; }
      if (runners.some(a => Math.hypot(a.x - p.x, a.y - p.y) < 40)) { p.away = 18 + RNG.cos() * 8; const ang = RNG.cos() * TAU; p.vx = Math.cos(ang) * 50; p.vy = Math.sin(ang) * 50; p.vz = 30; Snd.play('flap', { vol: .5 }); }
    }
  },
  /** a world point → the nearest walkable cell centre (for teleports and spawns) */
  walkableNear(x, y) {
    const m = this.map, [cx, cy] = m.toCell(x, y);
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (m.walkable(cx + dx, cy + dy)) return { x: W(cx + dx), y: W(cy + dy) }; }
    return { x, y };
  }
};

/* ---- interiors: the Annex (iso) and small rooms in the brawler view ---- */
const ROOMS = {
  annex: { view: 'iso', rows: [
    '######################',
    '#....#..........#....#',
    '#....#..........#....#',
    '#....,..........,....#',
    '#....#..........#....#',
    '######..........######',
    '#....#..........#....#',
    '#....,..........,....#',
    '#....#..........#....#',
    '#########,,,,#########'], floor: 'lino', h: 40,
    props: [['desk', 7.5, 2.5, Math.PI / 2], ['officechair', 7.5, 3.4, -Math.PI / 2], ['desk', 10.5, 2.5, Math.PI / 2], ['officechair', 10.5, 3.4, -Math.PI / 2], ['desk', 7.5, 6.5, Math.PI / 2], ['crt', 7.2, 6.3, Math.PI / 2],
      ['desk', 13.5, 6.4, Math.PI / 2], ['filecab', 15.3, 1.5, Math.PI / 2], ['filecab', 6.6, 4.5, 0], ['corkboard', 10.5, 1.15, Math.PI / 2], ['reel2reel', 2.5, 1.6, Math.PI / 2], ['crt', 4, 1.6, Math.PI / 2],
      ['desk', 18.5, 1.8, Math.PI / 2], ['officechair', 18.5, 2.8, -Math.PI / 2], ['filecab', 20.4, 3.6, Math.PI], ['filecab', 1.5, 6.4, 0], ['filecab', 1.5, 7.6, 0], ['crate', 3.5, 8.2, 0], ['coffeemaker', 19.5, 6.6, Math.PI / 2], ['watercooler', 17.6, 8.3, 0], ['radiator', 20.4, 7.6, Math.PI]] },
  box: { view: 'brawler', rows: ['#######', '#.....#', '#.....#', '#.....#', '#######'], floor: 'lino', h: 36, glass: true,
    props: [['boxtable', 3.5, 2.6, Math.PI / 2], ['chair', 3.5, 1.9, Math.PI / 2], ['chair', 3.5, 3.4, -Math.PI / 2]], light: [3.5, 2.5, 34, '#e8f0ff'] },
  wire: { view: 'brawler', rows: ['########', '#......#', '#......#', '#......#', '########'], floor: 'lino', h: 36,
    props: [['reel2reel', 2.6, 1.6, Math.PI / 2], ['crt', 5, 1.5, Math.PI / 2], ['desk', 5, 1.7, Math.PI / 2], ['officechair', 2.6, 2.6, -Math.PI / 2], ['officechair', 4.6, 2.7, -Math.PI / 2], ['radiator', 6.6, 1.3, Math.PI / 2], ['filecab', 1.4, 1.5, Math.PI / 2]], light: [3.5, 2, 30, '#a8ffb8'] },
  chambers: { view: 'brawler', rows: ['########', '#......#', '#......#', '#......#', '########'], floor: 'carpet', h: 40,
    props: [['judgedesk', 4, 1.7, Math.PI / 2], ['chair', 4, 1.1, Math.PI / 2], ['bookcase', 1.6, 1.15, Math.PI / 2], ['bookcase', 6.4, 1.15, Math.PI / 2], ['flagpole', 6.6, 2.6, Math.PI / 2]], light: [4, 2, 30, '#ffd8a0'] },
  kitchen: { view: 'brawler', rows: ['#######', '#.....#', '#.....#', '#.....#', '#######'], floor: 'tile', h: 36,
    props: [['table', 3.5, 2.4, Math.PI / 2], ['chair', 3.5, 1.8, Math.PI / 2], ['chair', 3.5, 3.1, -Math.PI / 2], ['stove', 5.6, 1.3, Math.PI / 2], ['shelf', 1.5, 1.2, Math.PI / 2]], light: [3.5, 2, 30, '#ffc890'] },
  backroom: { view: 'brawler', rows: ['########', '#......#', '#......#', '#......#', '########'], floor: 'wood', h: 36,
    props: [['table', 4, 2.2, Math.PI / 2], ['chair', 4, 1.6, Math.PI / 2], ['chair', 4, 2.9, -Math.PI / 2], ['shelf', 1.6, 1.2, Math.PI / 2], ['crate', 6.4, 1.4, 0], ['crate', 6.4, 3.2, .3]], light: [4, 2.2, 26, '#ffb070'] },
  booking: { view: 'brawler', rows: ['#######', '#.....#', '#.....#', '#.....#', '#######'], floor: 'lino', h: 36,
    props: [['boxtable', 3.5, 2.5, Math.PI / 2], ['chair', 3.5, 1.9, Math.PI / 2], ['chair', 3.5, 3.2, -Math.PI / 2]], light: [3.5, 2.5, 30, '#e8f0ff'] },
  office: { view: 'brawler', rows: ['#######', '#.....#', '#.....#', '#.....#', '#######'], floor: 'lino', h: 36,
    props: [['desk', 3.5, 1.6, Math.PI / 2], ['officechair', 3.5, 1.2, Math.PI / 2], ['filecab', 1.4, 1.4, Math.PI / 2], ['filecab', 5.6, 1.4, Math.PI / 2]], light: [3.5, 2, 30, '#fff0d0'] }
};
const roomMaps = {};
function roomMap(id) {
  if (roomMaps[id]) return roomMaps[id];
  const R = ROOMS[id], glass = id === 'annex';
  const types = { 1: { h: R.h, top: '#3a3430', side: id === 'kitchen' ? '#c8b890' : id === 'chambers' ? '#6a4a32' : id === 'backroom' ? '#7a5a3a' : '#a8a492', face: id === 'chambers' || id === 'backroom' ? 'plank' : 'plaster', roof: 'plain', cut: true, cutH: 4,
    decorate: f => {
      if (id === 'box' && f.side === 'south' && f.cy === 0) { f.quad(f.u0, 10, f.u1, 30, '#0c1014'); f.line(f.u0, 20, f.u1, 20, '#1a2028'); }   // the one-way glass
      if (id === 'kitchen' && f.side === 'south' && f.cy === 0 && f.cx === 2) { f.quad(f.u0 + 2, 14, f.u1 - 2, 28, '#9ab8d8'); f.line(f.u0 + 8, 14, f.u0 + 8, 28, '#e8e0d0'); }
      if (id === 'wire' && f.side === 'south' && f.cy === 0 && f.cx === 4) { f.quad(f.u0 + 2, 14, f.u1 - 2, 28, '#1a2a3a'); }
      if (glass && f.side === 'west' && f.cx === 16 && f.cy < 5) { f.quad(f.u0, 8, f.u1, 34, '#6a8a9a'); for (let z = 10; z < 34; z += 3) f.line(f.u0, z, f.u1, z, '#4a6a7a'); }
    } } };
  const legend = { '#': 1, '.': { floor: R.floor }, ',': { floor: R.floor } };
  const m = new E.TileMap({ rows: R.rows, legend, types, floorTex, ao: 4, outside: '#0a0908' });
  for (const [s, cx, cy, f] of R.props) m.solid(s, cx * T, cy * T, 0, { facing: f });
  return (roomMaps[id] = m);
}
function drawRoom(r, id, extra) {
  const R = ROOMS[id], m = roomMap(id);
  m.drawFloor(r); m.queueWalls(r);
  for (const [s, cx, cy, f] of R.props) r.shape(s, cx * T, cy * T, 0, { facing: f, light: true });
  if (R.light) { const [x, y, z, c] = R.light, fl = id === 'box' ? (Math.sin(game.real * 47) > .93 ? .55 : 1) : 1; game.lights.add(x * T, y * T, z, 120, 1.05 * fl, { color: c }); }
  if (extra) extra(r, m);
}
