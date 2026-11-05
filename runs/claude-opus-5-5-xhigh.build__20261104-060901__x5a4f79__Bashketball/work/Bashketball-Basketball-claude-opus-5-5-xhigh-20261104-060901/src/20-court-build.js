/* 20-court-build: the arena TileMap (48 x 25 tiles: stands of three tiers north of the court, aprons around it), the
 * floor painters (asphalt, planks, concrete, basalt, maple) with analytic court lines and the team logo, and the new
 * prop shapes (data, per docs/ASSETS.md). Maps are built once per court and kept. */
const ARENA_ROWS = (() => {
  const rows = [];
  for (let r = 0; r < MAP_H; r++) {
    let s = '';
    for (let c = 0; c < MAP_W; c++) {
      if (r <= 2 && c >= 2 && c <= 45) s += String(r + 1);   // tiers 1 (back, tallest) .. 3 (front)
      else s += '.';
    }
    rows.push(s);
  }
  return rows;
})();

/** what a court-local point is: 'line', 'paint' (the key), 'circle' (centre circle fill), 'court' or 'apron' */
function courtMark(lx, ly) {
  const LW = 1.6;
  if (lx < -LW || lx > CW + LW || ly < -LW || ly > CH + LW) return 'apron';
  if (lx < LW || lx > CW - LW || ly < LW || ly > CH - LW) return 'line';
  if (Math.abs(lx - CW / 2) < LW * .7) return 'line';
  const dc = Math.hypot(lx - CW / 2, ly - CH / 2);
  if (Math.abs(dc - 40) < LW * .8) return 'line';
  for (const side of [-1, 1]) {
    const bx = side < 0 ? lx : CW - lx, rx = 52, ry = CH / 2;
    // the key: baseline to x 152, y 96..192, its free-throw circle r 48
    const inKey = bx >= 0 && bx <= 152 && ly >= 96 && ly <= 192;
    if (inKey && (Math.abs(ly - 96) < LW * .8 || Math.abs(ly - 192) < LW * .8 || Math.abs(bx - 152) < LW * .8)) return 'line';
    const dft = Math.hypot(bx - 152, ly - ry);
    if (bx >= 152 && Math.abs(dft - 48) < LW * .8) return 'line';
    if (bx < 152 && Math.abs(dft - 48) < LW * .7 && (Math.floor(Math.atan2(ly - ry, bx - 152) * 6) % 2 === 0)) return 'line';   // the dashed half inside the key
    // the three-point line: corner straights at y 20 / 268 to x 108, then the arc r 136 about the rim
    const dr = Math.hypot(bx - rx, ly - ry);
    if (bx <= CORNER_X && (Math.abs(ly - CORNER_Y) < LW * .8 || Math.abs(ly - (CH - CORNER_Y)) < LW * .8)) return 'line';
    if (bx > CORNER_X - 2 && Math.abs(dr - THREE_R) < LW * .8 && ly > CORNER_Y - 1 && ly < CH - CORNER_Y + 1) return 'line';
    // the restricted arc under the rim
    if (bx > rx && Math.abs(dr - 22) < LW * .6) return 'line';
    if (inKey) return 'paint';
  }
  if (dc < 40) return 'circle';
  return 'court';
}
const hexRGB = h => { const n = E.hex(h); return Array.isArray(n) ? n : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const addRGB = (a, k) => [a[0] + k, a[1] + k, a[2] + k];
/** the logo's color at a court-local point (the logo sprite scaled about the centre), or null */
function logoAt(logo, lx, ly, scale = 5) {
  const rows = logo.rows, h = rows.length, w = rows[0].length;
  const u = Math.floor((lx - CW / 2) / scale + w / 2), v = Math.floor((ly - CH / 2) / (scale * .9) + h / 2);
  if (v < 0 || v >= h || u < 0 || u >= w) return null;
  const ch = rows[v][u]; return ch === '.' || ch === ' ' ? null : logo.colors[ch];
}
/** the material under the lines: each court's floor, with its grain */
const FLOORS = {
  asphalt(x, y, C) { const n = E.hash2(Math.floor(x), Math.floor(y)), m = E.noise2(x * .05, y * .05); let c = mixRGB(C.a, C.b, m); c = addRGB(c, (n - .5) * 16); if (n > .985) c = addRGB(c, 30); if (E.noise2(x * .02 + 40, y * .02) > .72) c = mixRGB(c, C.grain, .5); return c; },
  planks(x, y, C) { const row = Math.floor(y / 9), off = (row * 37) % 64, joint = (y % 9) < .9 || ((x + off) % 64) < .9, n = E.hash2(row, Math.floor((x + off) / 64)); let c = mixRGB(C.a, C.b, n); c = addRGB(c, Math.sin(x * .7 + n * 9) * 6 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 10); return joint ? mixRGB(c, C.grain, .75) : c; },
  concrete(x, y, C) { const m = E.noise2(x * .03, y * .03), n = E.hash2(Math.floor(x), Math.floor(y)); let c = mixRGB(C.a, C.b, m); c = addRGB(c, (n - .5) * 14); const crack = Math.abs(E.noise2(x * .012 + 9, y * .012) - .5) < .012; if (crack) c = mixRGB(c, C.grain, .8); if ((x % 96) < .8 || (y % 96) < .8) c = mixRGB(c, C.grain, .4); return c; },
  basalt(x, y, C) {   // hexagonal-ish basalt tiles with glowing seams
    const s = 18, gx = x / s, gy = y / s; let best = 9, second = 9;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const cx = Math.floor(gx) + i, cy = Math.floor(gy) + j, px0 = cx + E.hash2(cx, cy) * .8, py0 = cy + E.hash2(cy + 7, cx) * .8, d = Math.hypot(gx - px0, gy - py0); if (d < best) { second = best; best = d; } else if (d < second) second = d; }
    const edge = second - best, n = E.hash2(Math.floor(x), Math.floor(y)); let c = addRGB(mixRGB(C.a, C.b, best), (n - .5) * 12);
    if (edge < .06) { const s2 = hexRGB(C.seam || '#ff6a1a'), k = 1 - edge / .06; return [s2[0] * k * .9 + c[0] * (1 - k), s2[1] * k * .7 + c[1] * (1 - k), s2[2] * k * .5 + c[2] * (1 - k), Math.round(k * 180)]; }
    return c;
  },
  maple(x, y, C) { const row = Math.floor(y / 4), off = (row * 53) % 120, joint = ((x + off) % 120) < .7, n = E.hash2(row, Math.floor((x + off) / 120)); let c = mixRGB(C.a, C.b, n * .8); c = addRGB(c, Math.sin(x * .4 + row) * 4 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 6 + 10 * Math.max(0, 1 - Math.abs(((y + x * .3) % 140) - 70) / 40)); return joint || (y % 4) < .5 ? mixRGB(c, C.grain, .4) : c; }
};
/** the floor painter for a court: material, lines, paint, logos, the apron; floor tag ',' is the dark back */
function makeFloorTex(court) {
  const C = {}; for (const k in court.floorColors) C[k] = hexRGB(court.floorColors[k]);
  const line = hexRGB(court.lines), paint = hexRGB(court.paint), base = FLOORS[court.floor], logo = LOGOS[court.logo];
  return (x, y, tag) => {
    if (tag === 'back') return [14, 12, 20];
    const lx = x - OX, ly = y - OY, mark = courtMark(lx, ly);
    let c = base(x, y, C), glow = c[3]; c = c.slice(0, 3);
    if (mark === 'apron') { c = mixRGB(c, C.apron, .7); if (court.floor === 'maple') c = mixRGB(c, [40, 26, 36], .5); return glow ? [...c, glow >> 1] : c; }
    if (mark === 'line') { const n = E.hash2(Math.floor(x * 3), Math.floor(y * 3)); const worn = court.id === 'pier' && n > .7; return worn ? mixRGB(line, c, .5) : [...addRGB(line, (n - .5) * 12), court.id === 'skybox' ? 120 : 0]; }
    if (mark === 'paint') c = mixRGB(c, paint, court.floor === 'maple' ? .78 : .55);
    if (mark === 'circle') c = mixRGB(c, paint, .25);
    const lg = logoAt(logo, lx, ly); if (lg) c = mixRGB(c, hexRGB(lg), .72);
    for (const side of [-1, 1]) { const bx = side < 0 ? lx : CW - lx; if (bx > 154 && bx < 214 && Math.abs(ly - CH / 2) < 30) { const l2 = logoAt(logo, (bx - 184) * (side < 0 ? 1 : -1) + CW / 2, ly, 2.6); if (l2) c = mixRGB(c, hexRGB(l2), .35); } }
    return glow ? [...c, glow] : c;
  };
}
const MAPS = {};
/** the arena map for a court (built once) */
function courtMap(id) {
  if (MAPS[id]) return MAPS[id];
  const court = get('court', id), sc = court.standColors;
  const types = {}; [30, 20, 10].forEach((h, i) => { types[i + 1] = { h, face: court.standFace, side: sc[i], top: E.shade(sc[i], .15), line: E.shade(sc[i], -.35), roof: 'plain' }; });
  const map = new E.TileMap({ rows: ARENA_ROWS, legend: { 1: 1, 2: 2, 3: 3, 4: 4, '.': { floor: 'court' }, ',': { floor: 'back' } }, types, floorTex: makeFloorTex(court), outside: false, ao: 3 });
  return (MAPS[id] = map);
}

/* ---- the new prop shapes (sized for the engine's 26-unit hero; placed at scale 1.8 beside our 50-unit players) ---- */
const MAT = (id, color, pattern, extra) => { E.MATERIALS[id] = Object.assign({ color, pattern: pattern || 'none' }, extra || {}); };
MAT('bbSteel', '#8a96a6', 'metal'); MAT('bbDark', '#2a2a32', 'none'); MAT('bbChrome', '#c8d0dc', 'metal'); MAT('bbRubber', '#1e1c1e', 'none');
MAT('bbRed', '#d02a2a', 'glaze'); MAT('bbBlue', '#2a5ad0', 'glaze'); MAT('bbYellow', '#ffd23a', 'glaze'); MAT('bbWhite', '#e8e4dc', 'glaze');
MAT('bbTeal', '#18c8b8', 'glaze'); MAT('bbCoral', '#ff7a5c', 'glaze'); MAT('bbGold', '#e8b830', 'metal'); MAT('bbGlow', '#ffe08a', 'none', { glow: 1 });
MAT('bbRust', '#8a4a2a', 'metal'); MAT('bbTiki', '#8a5a32', 'planks'); MAT('bbScreen', '#3ac8ff', 'none', { glow: 1 }); MAT('bbPurple', '#5a2a8a', 'glaze');
E.SHAPES['ac-unit'] = { about: 'rooftop air conditioner, fan grille', tags: 'roof city', mats: { b: 'bbSteel', f: 'bbDark' },
  parts: [['box', 'b', [0, 0, 0], [14, 10, 9]], ['cyl', 'f', [0, 0, 9], 3.6, .8], ['box', 'f', [0, 5.1, 2], [10, .4, 1]], ['box', 'f', [0, 5.1, 4], [10, .4, 1]], ['box', 'f', [0, 5.1, 6], [10, .4, 1]]] };
E.SHAPES.boombox = { about: 'boombox, two speakers and a handle', tags: 'music street', mats: { b: 'bbDark', s: 'bbSteel', l: 'bbRed' },
  parts: [['box', 'b', [0, 0, 0], [12, 4, 6]], ['mirror', 'x', ['cyl', 's', [3.5, 2.2, 3], 2, .5, { rot: [90, 0, 0] }]], ['box', 'l', [0, 2.1, 4.6], [2.4, .3, .8]], ['box', 's', [0, 0, 6], [8, 1, .8]]] };
E.SHAPES['beach-umbrella'] = { about: 'striped beach umbrella', tags: 'beach', mats: { p: 'bbWhite', a: 'bbCoral', b: 'bbTeal' },
  parts: [['cyl', 'p', [0, 0, 0], .5, 22], ['cyl', 'a', [0, 0, 18], 12, 5, { r2: 0, seg: 8 }], ['cyl', 'b', [0, 0, 18], 12.2, 1.2, { seg: 8 }]] };
E.SHAPES['lifeguard-tower'] = { about: 'lifeguard tower on stilts, red roof', tags: 'beach', mats: { w: 'oak', r: 'bbRed', h: 'bbWhite' },
  parts: [['mirror', 'xy', ['box', 'w', [5, 4, 0], [1.5, 1.5, 16]]], ['box', 'w', [0, 0, 16], [13, 11, 1.5]], ['box', 'h', [0, 0, 17.5], [11, 9, 8]], ['wedge', 'r', [0, 0, 25.5], [14, 12, 4]], ['box', 'w', [0, 8, 0], [3, 6, 1], { rot: [35, 0, 0] }]] };
E.SHAPES.surfboard = { about: 'surfboard standing in the sand', tags: 'beach', mats: { s: 'bbTeal', t: 'bbYellow' },
  parts: [['box', 's', [0, 0, 0], [4, 1, 17]], ['ball', 's', [0, 0, 17], 2, { sz: 1.2 }], ['box', 't', [0, .55, 2], [.8, .2, 14]]] };
E.SHAPES['junk-car'] = { about: 'a wrecked car, rusted, flat tyres', tags: 'junkyard', mats: { b: 'bbRust', c: 'bbRust', w: 'bbRubber', g: 'bbDark' },
  parts: [['box', 'b', [0, 0, 2], [26, 13, 6]], ['box', 'c', [-2, 0, 8], [13, 12, 5]], ['box', 'g', [-2, 0, 9], [13.4, 10, 3]], ['mirror', 'xy', ['cyl', 'w', [8, 6, 0], 3, 2, { rot: [90, 0, 0] }]]] };
E.SHAPES['tire-stack'] = { about: 'a stack of old tyres', tags: 'junkyard', mats: { t: 'bbRubber', i: 'bbDark' },
  parts: [['row', 4, [0, 0, 3.2], ['cyl', 't', [0, 0, 4.8], 6, 3]], ['cyl', 'i', [0, 0, 12.9], 3, .3]] };
E.SHAPES['tiki-totem'] = { about: 'a carved tiki totem with glowing eyes', tags: 'island', mats: { w: 'bbTiki', e: 'bbGlow', d: 'walnut' },
  parts: [['box', 'w', [0, 0, 0], [7, 7, 26]], ['box', 'd', [0, 3.6, 18], [6, 1, 2]], ['box', 'e', [-1.6, 3.7, 21], [1.4, .4, 1.4]], ['box', 'e', [1.6, 3.7, 21], [1.4, .4, 1.4]], ['box', 'd', [0, 3.6, 8], [5, 1.2, 4]], ['box', 'w', [0, 0, 26], [9, 9, 2]]] };
E.SHAPES['pyro-cannon'] = { about: 'a pyro cannon on a stand', tags: 'arena', mats: { b: 'bbDark', c: 'bbSteel', r: 'bbRed' },
  parts: [['box', 'b', [0, 0, 0], [9, 9, 5]], ['cyl', 'c', [0, 0, 5], 2.8, 9, { r2: 3.4 }], ['cyl', 'r', [0, 0, 13.5], 3.5, 1]] };
E.SHAPES['tv-camera'] = { about: 'a broadcast TV camera on a tripod', tags: 'arena studio', mats: { b: 'bbDark', l: 'bbSteel', r: 'bbRed' },
  parts: [['ring', 3, 3, ['box', 'l', [0, 0, 0], [1, 1, 13], { rot: [0, -14, 0] }]], ['box', 'b', [0, 0, 13], [5, 9, 5]], ['cyl', 'l', [0, -5, 15.5], 1.8, 3, { rot: [90, 0, 0] }], ['box', 'r', [1.5, 4, 17], [1, 1, 1]]] };
E.SHAPES['scorer-table'] = { about: 'the scorer\'s table with a lit front panel', tags: 'arena', mats: { t: 'bbDark', f: 'bbBlue', s: 'bbScreen' },
  parts: [['box', 't', [0, 0, 0], [40, 9, 11]], ['box', 'f', [0, 4.6, 1], [38, .4, 8]], ['box', 's', [0, 4.9, 6], [30, .2, 2]]] };
E.SHAPES.trophy = { about: 'the Golden Blamboozle: a golden ball on a column', tags: 'arena award', mats: { c: 'marble', g: 'bbGold' },
  parts: [['cyl', 'c', [0, 0, 0], 3, 10, { r2: 2.2 }], ['cyl', 'g', [0, 0, 10], 2.4, 1.5], ['ball', 'g', [0, 0, 15], 4]] };
E.SHAPES['anchor-desk'] = { about: 'Channel BLAM\'s anchor desk', tags: 'studio', mats: { d: 'bbPurple', t: 'bbWhite', s: 'bbScreen' },
  parts: [['box', 'd', [0, 0, 0], [40, 10, 12]], ['box', 't', [0, 0, 12], [42, 11, 1.2]], ['box', 's', [0, 5.2, 4], [24, .3, 5]]] };
E.SHAPES['fence-chain'] = { about: 'a chain-link fence panel, len long', tags: 'street', mats: { p: 'bbSteel', m: 'bbDark' }, params: { len: 32 },
  make: p => [['mirror', 'x', ['cyl', 'p', [p.len / 2 - .5, 0, 0], .6, 18]], ['box', 'p', [0, 0, 17.5], [p.len, .6, .6]], ['row', Math.max(2, Math.round(p.len / 3)), [3, 0, 0], ['box', 'm', [0, 0, 1], [.3, .2, 16], { rot: [0, 30, 0] }]]] };
const NEW_SHAPES = ['ac-unit', 'boombox', 'beach-umbrella', 'lifeguard-tower', 'surfboard', 'junk-car', 'tire-stack', 'tiki-totem', 'pyro-cannon', 'tv-camera', 'scorer-table', 'trophy', 'anchor-desk', 'fence-chain'];
