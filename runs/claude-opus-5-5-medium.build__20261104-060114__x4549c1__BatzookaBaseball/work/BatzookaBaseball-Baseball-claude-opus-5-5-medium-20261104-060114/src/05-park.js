/* THE BALLPARK: units and geometry (home plate H in the south, center field north, x east), the six parks as data, the
 * floor painted from analytic geometry (shared by the Broadcast Cam's TileMap and the Plate Cam's Mode 7 floor), the
 * fence R(theta), stands, light towers and park props. */
const HX = 1300, HY = 1720, T16 = 16;
const BASES = [[0, 0], [212, -212], [0, -424], [-212, -212]];          // home, 1B, 2B, 3B, offsets from H
const basePos = b => ({ x: HX + BASES[b % 4][0], y: HY + BASES[b % 4][1] });
const RUBBER = { x: HX, y: HY - 205 };
const POS_SPOTS = { P: [0, -200], C: [0, 16], '1B': [225, -275], '2B': [105, -395], SS: [-105, -395], '3B': [-225, -275], LF: [-420, -760], CF: [0, -900], RF: [420, -760] };
const POS_ORDER = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const thetaOf = (x, y) => Math.atan2(x - HX, -(y - HY));             // spray angle: 0 = straight-away center, + = right field
const rOf = (x, y) => Math.hypot(x - HX, y - HY);
const dirOf = th => [Math.sin(th), -Math.cos(th)];
const D45 = Math.PI / 4;

/* ---- the parks ---- */
const PARKS = {
  kernel: { name: 'KERNEL FIELD', team: 'COM', fence: [980, 1080, 1180, 1060, 950], fh: 40, mow: 'stripes', grass: [70, 150, 60], dirt: [176, 118, 72],
    ground: 'corn', groundCol: [150, 140, 60], night: false, ambient: .9, sky: { sky: ['#2a3a7a', '#e08a5a', '#ffd08a'], sun: { x: .2, y: .55, r: 15, color: '#ffe8b0' },
      layers: [{ kind: 'clouds', color: '#ffc8a0', y: .3, height: .12, parallax: .04, drift: 3 }, { kind: 'hills', color: '#6a7a4a', y: .62, height: .14, parallax: .08 }, { kind: 'forest', color: '#3a4a2a', y: .72, height: .1, parallax: .15 }] },
    fenceCol: '#2a5a3a', topCol: '#f2c230', standCol: '#8a5a3a', weather: { kind: 'leaves', amount: .15, wind: .2 }, song: 'kernel', mascot: { base: '#f4ecd8', dk: '#c8b890', lt: '#fffbe8' }, hazard: 'silo', wind: true },
  barnacle: { name: 'BARNACLE BAY PARK', team: 'HCK', fence: [1000, 1100, 1150, 1000, 900], fh: 40, mow: 'checker', grass: [60, 160, 90], dirt: [196, 150, 100],
    ground: 'sea', groundCol: [40, 110, 190], night: false, ambient: 1, sky: 'ocean', fenceCol: '#1f6a8a', topCol: '#ff7a5c', standCol: '#d8c8a0', weather: null, song: 'barnacle',
    mascot: { base: '#8a4ad0', dk: '#5a2a90', lt: '#b88af0' }, hazard: 'gulls', wind: true },
  caldera: { name: 'CALDERA FIELD', team: 'MCE', fence: [920, 1060, 1200, 1100, 1000], fh: 50, mow: 'burnt', grass: [70, 110, 40], dirt: [120, 70, 50],
    ground: 'lava', groundCol: [60, 30, 30], night: true, ambient: .6, sky: { sky: ['#1a0408', '#5a1010', '#c0401a'], moon: { x: .7, y: .25, r: 9, color: '#ffb080' }, stars: 20,
      layers: [{ kind: 'mountains', color: '#3a1410', y: .5, height: .4, parallax: .05 }, { kind: 'fog', color: '#802a10', y: .7, height: .1, parallax: .1, drift: 5 }] },
    fenceCol: '#2b2b30', topCol: '#ff6a1a', standCol: '#3a3034', weather: { kind: 'ash', amount: .5, wind: .1 }, song: 'caldera', mascot: { base: '#ff7a2a', dk: '#c03a10', lt: '#ffc070' }, hazard: 'vents', wind: true },
  tranquility: { name: 'TRANQUILITY DOME', team: 'MBM', fence: [1350, 1450, 1550, 1450, 1350], fh: 60, mow: 'turf', grass: [60, 170, 110], dirt: [150, 150, 160],
    ground: 'regolith', groundCol: [120, 120, 130], night: true, ambient: .65, sky: { sky: ['#000004', '#05061a', '#10102a'], stars: 200, moon: { x: .75, y: .22, r: 22, color: '#5aa0ff' },
      layers: [{ kind: 'mountains', color: '#3a3a48', y: .6, height: .2, parallax: .04 }] },
    fenceCol: '#4a4a6a', topCol: '#6a4cff', standCol: '#5a5a70', weather: null, song: 'tranquility', mascot: { base: '#a8a8b0', dk: '#6a6a78', lt: '#e0e0e8' }, hazard: 'lowgrav', wind: false,
    gravityMul: .55, evMul: .8, jumpMul: 2, ofDepth: 200 },
  boneyard: { name: 'BONEYARD BALLPARK', team: 'HMH', fence: [1000, 1080, 1120, 1080, 1000], fh: 36, mow: 'dead', grass: [80, 110, 60], dirt: [110, 90, 80],
    ground: 'graves', groundCol: [50, 60, 50], night: true, ambient: .5, sky: { sky: ['#05040e', '#1a1630', '#2a3040'], moon: { x: .5, y: .2, r: 18, color: '#f4f0d8' }, stars: 60,
      layers: [{ kind: 'forest', color: '#10121a', y: .66, height: .2, parallax: .06 }, { kind: 'fog', color: '#5a6a70', y: .74, height: .12, parallax: .1, drift: 4 }] },
    fenceCol: '#1a1630', topCol: '#7dffb0', standCol: '#2a2638', weather: { kind: 'leaves', amount: .3, wind: .3 }, song: 'boneyard', mascot: { base: '#f0f0f8', dk: '#a8a8c0', lt: '#ffffff', ghost: true }, hazard: 'fog', wind: true },
  megadome: { name: 'MEGAMAX MEGADOME', team: 'MMX', fence: [1000, 1060, 1100, 1060, 1000], fh: 40, megaWall: true, mow: 'neon', grass: [50, 140, 90], dirt: [90, 80, 100],
    ground: 'neon', groundCol: [30, 20, 50], night: true, ambient: .65, sky: 'city-night', fenceCol: '#e01e3c', topCol: '#2de2e6', standCol: '#3a3050', weather: null, song: 'megadome',
    mascot: { base: '#b8c0cc', dk: '#7a8290', lt: '#ffffff', wings: true }, hazard: 'drones', wind: false }
};
for (const id in PARKS) { const p = PARKS[id]; p.id = id; p.gravityMul = p.gravityMul || 1; p.evMul = p.evMul || 1; p.jumpMul = p.jumpMul || 1; p.ofDepth = p.ofDepth || 0; BZ.def('parks', id, p); }
const PARK_ORDER = ['kernel', 'barnacle', 'caldera', 'tranquility', 'boneyard', 'megadome'];

/* ---- fence R(theta) (Catmull-Rom over five control distances) and height Hf(theta) ---- */
function fenceR(park, th) {
  const c = park.fence, u = clamp((th + D45) / (Math.PI / 8), 0, 4), i = Math.min(3, Math.floor(u)), t = u - i;
  const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(4, i + 2)];
  return .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}
const fenceH = (park, th) => park.megaWall && th < -.35 && th > -D45 - .05 ? 90 : park.fh;

/* ---- the floor: one function paints every pixel of the park (both cameras) ---- */
function floorColor(park, x, y) {
  const dx = x - HX, dy = y - HY, r = Math.hypot(dx, dy), th = Math.atan2(dx, -dy), n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
  const R = fenceR(park, clamp(th, -D45, D45));
  // chalk: foul lines out to the fence, the batter's and catcher's boxes
  const perpL = Math.abs(dx - dy) / Math.SQRT2, perpR = Math.abs(dx + dy) / Math.SQRT2, along = -dy;
  const g = park.grass, d = park.dirt;
  const dirtC = () => [d[0] + n * 18, d[1] + n * 14, d[2] + n * 12];
  const fair = Math.abs(th) <= D45 + .001;
  if (r < R + 2 && along > -2 && ((perpL < 1.4 && dx <= 1) || (perpR < 1.4 && dx >= -1))) return [236 + n * 10, 236 + n * 10, 228];
  const bx = Math.abs(Math.abs(dx) - 18), boxEdge = (Math.abs(dx) > 11 && Math.abs(dx) < 25 && Math.abs(dy + 4) < 12) && (Math.abs(Math.abs(dx) - 11.5) < .8 || Math.abs(Math.abs(dx) - 24.5) < .8 || Math.abs(Math.abs(dy + 4) - 11.5) < .8);
  if (boxEdge && bx < 8) return [230, 230, 222];
  // beyond the fence: the park's own ground
  if (fair && r > R + 6 || (!fair && r > 300 && Math.min(perpL, perpR) > 92)) return beyond(park, x, y, n);
  // dirt: the infield arc, the basepaths, the home circle, the mound; the warning track
  const mound = Math.hypot(dx, dy + 200) < 26, homeC = r < 44;
  const inSq = Math.abs(dx) + Math.abs(dy + 212) < 212 - 22;
  const pathL = perpL < 11 && along > 0 && along < 300 && dx < 0, pathR = perpR < 11 && along > 0 && along < 300 && dx > 0;
  const pathTop = (Math.abs(Math.abs(dx) - (424 + dy) ) < 11 && dy < -212 && dy > -430);
  const arc = r < 470 && Math.abs(th) < .87 && !inSq;
  if (mound || homeC || ((arc || pathL || pathR || pathTop) && !inSq) || (r < 470 && r > 200 && Math.abs(th) < .87 && !inSq)) {
    if (Math.hypot(dx, dy + 205) < 2.5 && Math.abs(dy + 205) < 1.2) return [245, 245, 240];
    return dirtC();
  }
  if (fair && r > R - 48 && r < R + 6) return [d[0] * .8 + n * 14, d[1] * .78 + n * 12, d[2] * .8 + n * 10];
  // grass with the park's mowing pattern
  let k = 1;
  if (park.mow === 'stripes') k = Math.floor((x - HX + 2000) / 48) % 2 ? 1.12 : .92;
  else if (park.mow === 'checker') k = (Math.floor((x + 2000) / 64) + Math.floor((y + 2000) / 64)) % 2 ? 1.1 : .92;
  else if (park.mow === 'burnt') k = .85 + E.noise2(x * .01, y * .01) * .35;
  else if (park.mow === 'turf') k = Math.floor((-dy + 4000) / 40) % 2 ? 1.08 : .96;
  else if (park.mow === 'dead') k = .8 + E.noise2(x * .02, y * .02) * .5;
  else if (park.mow === 'neon') { if ((Math.abs(((x + 4000) % 96) - 48) < 1 || Math.abs(((y + 4000) % 96) - 48) < 1)) return [60, 230, 240]; k = 1; }
  const m = E.noise2(x * .05, y * .05) * .15;
  return [g[0] * (k + m) + n * 16, g[1] * (k + m) + n * 22, g[2] * (k + m) + n * 14];
}
function beyond(park, x, y, n) {
  const c = park.groundCol;
  switch (park.ground) {
    case 'corn': { const row = Math.floor(x / 10) % 2, h = E.noise2(x * .05, y * .05); return row ? [120 + h * 60 + n * 30, 140 + h * 40 + n * 20, 40] : [70 + n * 20, 100 + n * 20, 30]; }
    case 'sea': { const w = Math.sin(x * .05 + y * .03 + E.noise2(x * .01, y * .01) * 4); return w > .85 ? [200, 230, 250] : [30 + w * 10, 100 + w * 15, 180 + w * 15]; }
    case 'lava': { const h = E.noise2(x * .02, y * .02), hot = h > .55; return hot ? [255, 120 + h * 120, 30, 1] : [50 + n * 20 + h * 40, 30 + n * 10, 28]; }
    case 'regolith': { const cr = E.noise2(x * .015, y * .015); return [c[0] + cr * 40 + n * 22, c[1] + cr * 40 + n * 22, c[2] + cr * 40 + n * 22]; }
    case 'graves': { const h = E.noise2(x * .03, y * .03); return [40 + h * 30 + n * 14, 52 + h * 30 + n * 14, 40 + h * 20 + n * 10]; }
    case 'neon': { const grid = (Math.abs(((x + 4000) % 64) - 32) < 1 || Math.abs(((y + 4000) % 64) - 32) < 1); return grid ? [255, 60, 200, 1] : [30 + n * 10, 20 + n * 8, 50 + n * 12]; }
  }
  return c;
}

/* ---- the TileMap: fence ring, foul walls, backstop and stands, built from the geometry; floor painted by floorColor ---- */
function buildMap(park) {
  const X0 = 0, Y0 = 0, cols = Math.ceil(2 * HX / T16), rows = Math.ceil((HY + 300) / T16), out = [];   // (map coordinates are world coordinates)
  const stands = [];
  for (let cy = 0; cy < rows; cy++) {
    let s = '';
    for (let cx = 0; cx < cols; cx++) {
      const x = X0 + cx * T16 + 8, y = Y0 + cy * T16 + 8, dx = x - HX, dy = y - HY, r = Math.hypot(dx, dy), th = Math.atan2(dx, -dy);
      let ch = '.';
      if (Math.abs(th) <= D45 + .02) {
        const R = fenceR(park, clamp(th, -D45, D45));
        if (r >= R && r < R + 16) ch = 'F';
        else if (r >= R + 40 && r < R + 40 + 48 && Math.abs(th) < D45 - .05) { const tier = Math.min(2, Math.floor((r - R - 40) / 16)); ch = String(tier + 1); }
      } else {
        const pOut = dx < 0 ? Math.abs(dx - dy) / Math.SQRT2 : Math.abs(dx + dy) / Math.SQRT2, along = dx < 0 ? (-dx - dy) / Math.SQRT2 : (dx - dy) / Math.SQRT2;
        if (r >= 110 && r < 118 && along < 80) ch = 'B';
        else if (r >= 134 && r < 182 && along < 80) ch = String(Math.min(3, Math.floor((r - 134) / 16) + 1));
        else if (along >= 80 && pOut >= 70 && pOut < 78) ch = 'W';
        else if (along >= 60 && pOut >= 92 && pOut < 140) ch = String(Math.min(3, Math.floor((pOut - 92) / 16) + 1));
      }
      if ('123'.includes(ch)) stands.push({ x, y, tier: +ch });
      s += ch;
    }
    out.push(s);
  }
  const fc = park.fenceCol, sc = park.standCol;
  const types = {
    1: { h: 0, top: fc, side: fc },
    10: { h: park.fh, top: park.topCol, side: fc, face: 'plank', roof: 'plain', cut: true, cutH: 10 },
    11: { h: 14, top: park.topCol, side: fc, face: 'plank', roof: 'plain', cut: true, cutH: 8 },
    12: { h: 44, top: '#cfd2da', side: '#5a5e6a', face: 'none', roof: 'plain', cut: true, cutH: 10 },
    13: { h: 26, top: E.shade(sc, .1), side: sc, face: 'stone', roof: 'slab', cut: true, cutH: 8 },
    14: { h: 40, top: E.shade(sc, .05), side: E.shade(sc, -.1), face: 'stone', roof: 'slab', cut: true, cutH: 10 },
    15: { h: 54, top: sc, side: E.shade(sc, -.2), face: 'stone', roof: 'slab', cut: true, cutH: 12 }
  };
  const map = new E.TileMap({ rows: out, legend: { F: 10, W: 11, B: 12, 1: 13, 2: 14, 3: 15, '.': { floor: 'field' } }, types, ao: 3,
    floorTex: (x, y) => floorColor(park, x, y), outside: '#' + park.groundCol.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('') });
  map.ox = X0; map.oy = Y0; map.stands = stands;
  return map;
}

/* ---- a park's built pieces, cached per park: the map, the Mode 7 view, the backdrop, the fence polyline, props, crowd ---- */
const PARK_CACHE = {};
function parkKit(id) {
  if (PARK_CACHE[id]) return PARK_CACHE[id];
  const park = PARKS[id], kit = { park };
  kit.map = HEADLESS ? null : buildMap(park);
  kit.bg = HEADLESS ? null : new E.Backdrop(park.sky);
  kit.m7 = HEADLESS ? null : new E.Mode7({ floor: (x, y) => floorColor(park, x, y), size: [4000, 4000], outside: '#' + park.groundCol.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''), sky: kit.bg, far: 5200 });
  kit.fence = []; for (let i = 0; i <= 48; i++) { const th = -D45 + i * (Math.PI / 2) / 48, R = fenceR(park, th), [ux, uy] = dirOf(th); kit.fence.push({ x: HX + ux * R, y: HY + uy * R, th, h: fenceH(park, th) }); }
  kit.props = parkProps(park); kit.fans = makeFans(park, kit);
  PARK_CACHE[id] = kit; return kit;
}
/* the fans: seats on the outfield bleachers and along the foul lines (both cameras); colors from the home team */
function makeFans(park, kit) {
  const fans = [], rnd = E.rng(park.id.length * 77 + 5);
  for (let i = 0; i < 900; i++) {
    const u = rnd(); let x, y, z, th;
    if (u < .55) { th = -D45 + .06 + rnd() * (Math.PI / 2 - .12); const R = fenceR(park, th), tier = Math.floor(rnd() * 3), [ux, uy] = dirOf(th); x = HX + ux * (R + 46 + tier * 16 + rnd() * 8); y = HY + uy * (R + 46 + tier * 16 + rnd() * 8); z = [26, 40, 54][tier]; }
    else { const side = rnd() < .5 ? -1 : 1, along = 160 + rnd() * 560, tier = Math.floor(rnd() * 3), off = 98 + tier * 16 + rnd() * 8;
      const lx = side * along / Math.SQRT2, ly = -along / Math.SQRT2, nx = side / Math.SQRT2, ny = 1 / Math.SQRT2; x = HX + lx + nx * off; y = HY + ly + ny * off; z = [26, 40, 54][tier]; }
    fans.push({ x, y, z, ph: rnd() * TAU, shirt: ['#e8443a', '#3b82f6', '#f2c230', '#f4ecd8', '#22c55e', '#ff7a5c', '#8a4ad0', '#ffffff'][Math.floor(rnd() * 8)], skin: ['#f0c8a8', '#e0a880', '#a87050', '#6a4028'][Math.floor(rnd() * 4)], cap: rnd() < .4 });
  }
  return fans;
}
/* props per park: light towers, the scoreboard, and the park's own pieces (drawn by drawProp) */
function parkProps(park) {
  const L = [], at = (th, r, kind, o = {}) => { const [ux, uy] = dirOf(th); L.push(Object.assign({ x: HX + ux * r, y: HY + uy * r, kind }, o)); };
  const R = th => fenceR(park, th);
  for (const th of [-.95, -.4, .4, .95]) at(th, Math.abs(th) > .8 ? 720 : R(th) + 140, 'tower', { h: 170 });
  at(.08, R(.08) + 120, park.id === 'megadome' ? 'megatron' : 'scoreboard', { h: 110 });
  if (park.id === 'kernel') { at(.55, R(.55) + 170, 'silo', { h: 150 }); at(-.6, R(-.6) + 230, 'windmill', { h: 130 }); for (let i = 0; i < 8; i++) at(-.75 + i * .2, R(-.75 + i * .2) + 300, 'hay', { h: 14 }); }
  if (park.id === 'barnacle') { at(-.7, R(-.7) + 260, 'lighthouse', { h: 180 }); at(.55, R(.55) + 240, 'boat', { h: 30 }); at(.3, R(.3) + 330, 'boat', { h: 30 }); at(.75, R(.75) + 160, 'buoy', { h: 16 }); }
  if (park.id === 'caldera') { for (const th of [-.38, .38]) at(th, R(th) - 120, 'vent', { h: 14, vent: true }); at(0, R(0) + 420, 'volcano', { h: 300 }); for (let i = 0; i < 6; i++) at(-.8 + i * .32, R(-.8 + i * .32) + 160, 'basalt', { h: 70 }); }
  if (park.id === 'tranquility') { at(-.5, R(-.5) + 200, 'habitat', { h: 60 }); at(.5, R(.5) + 220, 'dish', { h: 90 }); at(.2, R(.2) + 300, 'habitat', { h: 60 }); at(-.15, R(-.15) + 260, 'antenna', { h: 120 }); }
  if (park.id === 'boneyard') { for (let i = 0; i < 14; i++) at(-.8 + i * .12, R(-.8 + i * .12) + 110 + (i % 3) * 40, 'tomb', { h: 20, seed: i }); at(-.45, R(-.45) + 240, 'crypt', { h: 60 }); at(.6, R(.6) + 220, 'deadtree', { h: 90 }); }
  if (park.id === 'megadome') { at(-.7, R(-.7) + 180, 'holo', { h: 140 }); at(.7, R(.7) + 180, 'holo', { h: 140, alt: true }); at(.45, R(.45) + 160, 'luxbox', { h: 100 }); }
  return L;
}
/* draw one prop at screen (sx, sy) with k screen pixels per world unit */
function drawProp(g, p, sx, sy, k, t) {
  const H = p.h * k;
  const W = n => Math.max(1, n * k);
  switch (p.kind) {
    case 'tower': {
      px.rect(g, sx - W(3), sy - H, W(6), H, '#5a5e6a'); px.rect(g, sx - W(2), sy - H, W(1.5), H, '#8a8e9a');
      px.rect(g, sx - W(22), sy - H - W(18), W(44), W(18), '#2a2c34');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) px.disc(g, sx - W(16) + i * W(10.5), sy - H - W(13) + j * W(8), Math.max(1, W(3.4)), '#fffbe0');
      break;
    }
    case 'scoreboard': case 'megatron': {
      const mega = p.kind === 'megatron', bw = W(mega ? 120 : 100), bh = W(mega ? 70 : 56);
      px.rect(g, sx - W(3), sy - H + bh, W(6), H - bh, '#3a3a44');
      px.rect(g, sx - bw / 2 - W(3), sy - H - W(3), bw + W(6), bh + W(6), mega ? '#e01e3c' : '#7a2a1a');
      px.rect(g, sx - bw / 2, sy - H, bw, bh, '#101418');
      if (BZ.M && k > .08) { const M = BZ.M; const tx = sx - bw / 2 + W(6), sc = k > .5 ? 2 : 1;
        if (k > .25) { E.font.text(g, M.teams[0].def.abbr + ' ' + M.teams[0].runs, tx, sy - H + W(8), '#ffd36a', { scale: sc, outline: false }); E.font.text(g, M.teams[1].def.abbr + ' ' + M.teams[1].runs, tx, sy - H + W(8) + 9 * sc, '#ffd36a', { scale: sc, outline: false }); }
        else for (let i = 0; i < 6; i++) px.rect(g, tx + i * W(14), sy - H + W(10), W(10), W(6), i % 2 ? '#ffd36a' : '#e8e0c0');
      }
      if (mega) for (let i = 0; i < 6; i++) px.disc(g, sx - bw / 2 + i * bw / 5, sy - H - W(3), Math.max(1, W(2)), (Math.floor(t * 4) + i) % 2 ? '#2de2e6' : '#ff3ad0');
      break;
    }
    case 'silo': px.rect(g, sx - W(18), sy - H, W(36), H, p.popped ? '#c8b890' : '#c84a2a'); px.rect(g, sx - W(14), sy - H, W(6), H, '#e06a4a'); px.disc(g, sx, sy - H, W(18), '#9aa0a8'); for (let i = 1; i < 5; i++) px.rect(g, sx - W(18), sy - H + i * H / 5, W(36), Math.max(1, W(1.5)), '#8a2a1a'); break;
    case 'windmill': { px.poly(g, [[sx - W(10), sy], [sx + W(10), sy], [sx + W(3), sy - H], [sx - W(3), sy - H]], '#7a6a5a'); const a = t * 1.4; for (let i = 0; i < 4; i++) { const b = a + i * Math.PI / 2; px.line(g, sx, sy - H, sx + Math.cos(b) * W(40), sy - H + Math.sin(b) * W(40), '#e8e0d0', Math.max(1, W(4))); } break; }
    case 'hay': px.rect(g, sx - W(10), sy - H, W(20), H, '#d8b850'); px.rect(g, sx - W(10), sy - H, W(20), Math.max(1, W(3)), '#f0d878'); break;
    case 'lighthouse': px.poly(g, [[sx - W(16), sy], [sx + W(16), sy], [sx + W(9), sy - H], [sx - W(9), sy - H]], '#f4f0e8'); for (let i = 1; i < 4; i++) px.rect(g, sx - W(15 - i * 2), sy - i * H / 4, W(30 - i * 4), W(12), '#d83a2a'); px.rect(g, sx - W(10), sy - H - W(16), W(20), W(16), '#ffe880'); px.rect(g, sx - W(12), sy - H - W(22), W(24), W(6), '#3a3a44'); break;
    case 'boat': { const bob = Math.sin(t * 1.5 + p.x) * W(2); px.poly(g, [[sx - W(30), sy - W(12) + bob], [sx + W(30), sy - W(12) + bob], [sx + W(22), sy + bob], [sx - W(22), sy + bob]], '#8a3a2a'); px.rect(g, sx - W(1), sy - W(50) + bob, W(2), W(38), '#5a4a3a'); px.poly(g, [[sx + W(1), sy - W(48) + bob], [sx + W(22), sy - W(16) + bob], [sx + W(1), sy - W(16) + bob]], '#f4f0e8'); break; }
    case 'buoy': px.disc(g, sx, sy - W(8) + Math.sin(t * 2) * W(2), W(7), '#ff5a3a'); break;
    case 'vent': { const hot = BZ.hz && BZ.hz.ventHot; px.poly(g, [[sx - W(30), sy], [sx + W(30), sy], [sx + W(10), sy - W(14)], [sx - W(10), sy - W(14)]], '#3a2420'); px.ell ? px.ell(g, sx, sy - W(14), W(10), W(3), hot ? '#ffe060' : '#ff6a1a') : px.rect(g, sx - W(10), sy - W(16), W(20), W(4), hot ? '#ffe060' : '#ff6a1a'); break; }
    case 'volcano': px.poly(g, [[sx - W(420), sy], [sx + W(420), sy], [sx + W(70), sy - H], [sx - W(70), sy - H]], '#3a1a14'); px.poly(g, [[sx - W(70), sy - H], [sx + W(70), sy - H], [sx + W(40), sy - H + W(30)], [sx - W(40), sy - H + W(30)]], '#ff6a1a'); break;
    case 'basalt': px.rect(g, sx - W(8), sy - H, W(16), H, '#2a2428'); px.rect(g, sx - W(8), sy - H, W(5), H, '#3a3438'); break;
    case 'habitat': px.rect(g, sx - W(40), sy - H * .7, W(80), H * .7, '#c8ccd8'); px.disc(g, sx, sy - H * .7, W(40), '#d8dce8'); for (let i = 0; i < 3; i++) px.rect(g, sx - W(28) + i * W(20), sy - H * .5, W(10), W(8), '#ffd87a'); break;
    case 'dish': px.rect(g, sx - W(3), sy - H * .6, W(6), H * .6, '#8a8e9a'); px.disc(g, sx, sy - H * .75, W(30), '#e0e4ec'); px.disc(g, sx + W(4), sy - H * .78, W(22), '#b8bcc8'); break;
    case 'antenna': px.rect(g, sx - W(2), sy - H, W(4), H, '#9aa0a8'); px.disc(g, sx, sy - H, Math.max(1, W(4)), Math.floor(t * 2) % 2 ? '#ff3a3a' : '#5a1a1a'); break;
    case 'tomb': { const sh = p.seed % 3; if (sh === 0) { px.rect(g, sx - W(6), sy - H, W(12), H, '#8a8a90'); px.disc(g, sx, sy - H, W(6), '#8a8a90'); } else if (sh === 1) { px.rect(g, sx - W(1.5), sy - H - W(6), W(3), H + W(6), '#7a7a80'); px.rect(g, sx - W(6), sy - H, W(12), W(3), '#7a7a80'); } else px.rect(g, sx - W(8), sy - H * .7, W(16), H * .7, '#6a6a72'); break; }
    case 'crypt': px.rect(g, sx - W(36), sy - H, W(72), H, '#5a5a62'); px.poly(g, [[sx - W(40), sy - H], [sx + W(40), sy - H], [sx, sy - H - W(26)]], '#4a4a52'); px.rect(g, sx - W(10), sy - W(30), W(20), W(30), '#1a1a20'); break;
    case 'deadtree': px.rect(g, sx - W(4), sy - H, W(8), H, '#3a2a24'); for (let i = 0; i < 4; i++) px.line(g, sx, sy - H * (.5 + i * .12), sx + (i % 2 ? 1 : -1) * W(30), sy - H * (.65 + i * .12), '#3a2a24', Math.max(1, W(3))); break;
    case 'holo': { px.rect(g, sx - W(3), sy - H, W(6), H, '#3a3a50'); const c = p.alt ? '#2de2e6' : '#ff3ad0'; px.blend(g, .5, 'add', () => px.rect(g, sx - W(50), sy - H - W(50), W(100), W(50), c)); if (k > .25) E.font.text(g, p.alt ? 'SYNERGY' : 'MEGAMAX', sx, sy - H - W(30), '#ffffff', { align: 'center', outline: false, scale: k > .8 ? 2 : 1 }); break; }
    case 'luxbox': px.rect(g, sx - W(50), sy - H, W(100), W(40), '#2a2a3a'); px.rect(g, sx - W(46), sy - H + W(6), W(92), W(22), '#ffd87a'); px.rect(g, sx - W(3), sy - H + W(40), W(6), H - W(40), '#3a3a44'); break;
  }

}
BZ.PARKS = PARKS; BZ.parkKit = parkKit;
