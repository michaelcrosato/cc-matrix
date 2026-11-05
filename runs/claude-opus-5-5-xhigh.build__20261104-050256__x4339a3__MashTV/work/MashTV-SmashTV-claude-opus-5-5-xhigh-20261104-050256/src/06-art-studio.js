// ---- the sets: floors, wall decorators, door painters, the dressing outside the arena, lights; studio props as shapes ----
const hn = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const H2 = E.hex;
const rgb = h => { const v = H2(h); return [v[0], v[1], v[2]]; };
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const shadeC = (c, k) => k >= 0 ? mixc(c, [255, 255, 255], k) : mixc(c, [0, 0, 0], -k);

// studio props, written as shapes (docs/ASSETS.md); a few store props come from assets/mash-props.js
function defineShapes() {
  const S = E.SHAPES;
  S['mt:spotstand'] = { about: 'studio spotlight on a tripod', tags: 'studio light', mats: { m: '#2c2838 metal', c: '#c8d0e0 metal', l: '#fff4c0', g: 'gold' },
    parts: [['ring', 3, 4, ['box', 'm', [0, 0, 0], [1.5, 1.5, 14], { rot: [0, 18, 0] }]], ['cyl', 'm', [0, 0, 12], 1, 12], ['box', 'c', [0, 0, 22], [8, 9, 7]], ['box', 'l', [0, 4.6, 23], [6, 1, 5]], ['box', 'g', [0, 0, 29], [9, 10, 1]]] };
  S['mt:camera'] = { about: 'studio TV camera on a tripod, red tally light', tags: 'studio', mats: { m: '#2c2838 metal', b: '#4a4458 metal', r: '#ff3344', g: '#9ab0c8 glaze' },
    parts: [['ring', 3, 5, ['box', 'm', [0, 0, 0], [1.5, 1.5, 16], { rot: [0, 16, 0] }]], ['cyl', 'm', [0, 0, 14], 1.2, 6], ['box', 'b', [0, -2, 20], [7, 14, 8]], ['cyl', 'g', [0, 6, 22], 3, 3, { rot: [90, 0, 0] }], ['box', 'r', [0, -2, 28], [2, 2, 2]]] };
  S['mt:crane'] = { about: 'camera crane on a dolly base', tags: 'studio', mats: { m: '#2c2838 metal', y: '#ffcc33 metal', b: '#4a4458 metal', r: '#ff3344' },
    parts: [['box', 'm', [0, 0, 0], [22, 16, 4]], ['cyl', 'y', [0, 0, 4], 2.5, 22], ['box', 'y', [0, -6, 26], [3, 34, 3], { rot: [-14, 0, 0] }], ['box', 'b', [0, -22, 28], [8, 10, 7]], ['box', 'm', [0, 12, 22], [6, 6, 6]], ['box', 'r', [0, -22, 35], [2, 2, 2]]] };
  S['mt:pedestal'] = { about: 'turning prize pedestal, gold top', tags: 'studio', mats: { s: '#3a2a5a glaze', g: 'gold' },
    parts: [['cyl', 's', [0, 0, 0], 8, 4, { r2: 7 }], ['cyl', 's', [0, 0, 4], 6, 6], ['cyl', 'g', [0, 0, 10], 8, 2]] };
  S['mt:champagne'] = { about: 'champagne tower of coupe glasses on a table', tags: 'party', mats: { t: '#f0e8f0 cloth', g: '#e8f4ff glaze', c: '#ffe8a0 glaze' },
    parts: [['cyl', 't', [0, 0, 0], 7, 9], ['cyl', 'g', [0, 0, 9], 6, 3, { r2: 5 }], ['cyl', 'c', [0, 0, 12], 4.5, 3, { r2: 3.6 }], ['cyl', 'g', [0, 0, 15], 3, 3, { r2: 2.2 }], ['cyl', 'c', [0, 0, 18], 1.8, 2.5, { r2: 1 }]] };
  S['mt:stanchion'] = { about: 'brass rope stanchion', tags: 'party', mats: { g: 'gold', r: '#b0203a cloth' },
    parts: [['cyl', 'g', [0, 0, 0], 3, 1.5], ['cyl', 'g', [0, 0, 1.5], .9, 13], ['ball', 'g', [0, 0, 15], 1.6]] };
  S['mt:searchlight'] = { about: 'searchlight drum on a base', tags: 'party light', mats: { m: '#3a3448 metal', s: '#c8d0e0 metal', l: '#fffbe0' },
    parts: [['box', 'm', [0, 0, 0], [14, 14, 6]], ['box', 's', [0, 0, 6], [10, 12, 10]], ['box', 'l', [0, 6.2, 8], [8, 1, 6]]] };
  S['mt:forklift'] = { about: 'yellow forklift', tags: 'warehouse', mats: { y: '#ffcc33 metal', k: '#2a2838 metal', s: '#9aa0b0 metal' },
    parts: [['box', 'y', [0, 0, 2], [14, 20, 9]], ['box', 'k', [0, 0, 11], [12, 10, 1]], ['box', 'k', [0, -6, 11], [12, 2, 14]], ['box', 'y', [0, 2, 25], [14, 14, 1.5]], ['box', 's', [0, 12, 0], [12, 2, 26]], ['mirror', 'x', ['box', 's', [3.5, 18, 1], [2, 12, 1]]], ['mirror', 'x', ['cyl', 'k', [6, -6, 2.5], 2.5, 2, { rot: [0, 90, 0] }]], ['mirror', 'x', ['cyl', 'k', [6, 6, 2.5], 2.5, 2, { rot: [0, 90, 0] }]]] };
  S['mt:rack'] = { about: 'warehouse shelving rack', tags: 'warehouse', mats: { o: '#e06030 metal', g: '#8a8f9a metal' },
    parts: [['mirror', 'xy', ['box', 'o', [14, 5, 0], [1.5, 1.5, 40]]], ['row', 3, [0, 0, 13], ['box', 'g', [0, 0, 13], [30, 12, 1.2]]]] };
  S['mt:safe'] = { about: 'vault safe front set in a wall', tags: 'vault', mats: { s: '#7a8090 metal', d: '#4a5060 metal', g: 'gold' },
    parts: [['box', 's', [0, 0, 0], [96, 4, 26]], ['box', 'd', [0, 2.5, 4], [72, 1, 18]], ['cyl', 'g', [0, 3, 13], 6, 1.5, { rot: [90, 0, 0] }]] };
  S['mt:cage'] = { about: 'gold prize cage, round bars', tags: 'studio', mats: { g: 'gold' },
    parts: [['ring', 12, 13, ['cyl', 'g', [0, 0, 0], .9, 26]], ['cyl', 'g', [0, 0, 0], 14, 2, { r2: 14 }], ['cyl', 'g', [0, 0, 26], 14, 2, { r2: 10 }]] };
  S['mt:lockbolt'] = { about: 'a big vault lock bolt', tags: 'vault', mats: { s: '#c8d0e0 metal', r: '#ff3344 glaze' },
    parts: [['box', 's', [0, 0, 0], [10, 6, 16]], ['cyl', 'r', [0, 3.5, 8], 3, 1, { rot: [90, 0, 0] }]] };
  S['mt:crate'] = { about: 'prize crate with a gold question mark', tags: 'prize', mats: { c: '#c87830 crate', g: 'gold' },
    parts: [['box', 'c', [0, 0, 0], [14, 14, 13]], ['box', 'g', [0, 7.2, 4], [4, 1, 6]]] };
  if (GLOBAL.ASSETS && GLOBAL.ASSETS.mash) E.addAssets(GLOBAL.ASSETS.mash);
}

// the MASH TV logo rasterized once (a browser canvas), sampled by the studio floor
let LOGO = null;
function logoMask() {
  if (LOGO !== null) return LOGO;
  LOGO = false;
  if (!HAS_DOM) return LOGO;
  try {
    const W = 168, Hh = 64, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
    E.px.ell(g, W / 2, Hh / 2, W / 2 - 1, Hh / 2 - 1, '#0d0620'); E.px.ell(g, W / 2, Hh / 2, W / 2 - 4, Hh / 2 - 4, '#2a1050');
    E.font.title(g, 'MASH TV', W / 2, 18, { scale: 3, colors: ['#ffcc33', '#ff2e88'], align: 'center', depth: 2, depthColor: '#5a1040' });
    E.font.text(g, 'STUDIO 9', W / 2, 46, '#2ee6ff', { align: 'center', outline: false });
    LOGO = { W, H: Hh, d: g.getImageData(0, 0, W, Hh).data };
  } catch (e) { LOGO = false; }
  return LOGO;
}
const hazardStripe = (x, y) => {   // yellow and black stripes at each door's threshold
  for (const d of DOOR_IDS) {
    const D = DOORS[d];
    if (d === 'N' || d === 'S') { if (x > 158 && x < 210 && Math.abs(y - (d === 'N' ? 20 : 220)) < 4) return ((x + y) >> 2) & 1 ? [255, 204, 51] : [26, 18, 30]; }
    else if (y > 94 && y < 146 && Math.abs(x - (d === 'W' ? 20 : 348)) < 4) return ((x + y) >> 2) & 1 ? [255, 204, 51] : [26, 18, 30];
  }
  return null;
};
const FLOORS = {
  studio(x, y) {
    const hz = hazardStripe(x, y); if (hz) return hz;
    const L = logoMask();
    if (L) { const lx = Math.floor(x - (184 - L.W / 2)), ly = Math.floor((y - (120 - L.H / 2)) * 1); if (lx >= 0 && ly >= 0 && lx < L.W && ly < L.H) { const i = (ly * L.W + lx) * 4; if (L.d[i + 3] > 128) return [L.d[i] * .85, L.d[i + 1] * .85, L.d[i + 2] * .85]; } }
    const tx = Math.floor(x / 16), ty = Math.floor(y / 16), fx = x - tx * 16, fy = y - ty * 16;
    if (fx < 1 || fy < 1) return ((tx % 4 === 0 && fx < 1) || (ty % 4 === 0 && fy < 1)) ? [120, 26, 86] : [12, 6, 24];
    if (tx % 4 === 0 && ty % 4 === 0 && Math.abs(fx - 1) + Math.abs(fy - 1) < 3) return [255, 204, 51];
    let c = (tx + ty) & 1 ? [36, 20, 62] : [28, 15, 48];
    const gl = ((x + y * 1.4) % 96) / 96; if (gl < .08) c = shadeC(c, .12);
    return shadeC(c, (hn(tx, ty) - .5) * .08);
  },
  warehouse(x, y) {
    const hz = hazardStripe(x, y); if (hz) return hz;
    let c = [92, 90, 96]; const n = hn(Math.floor(x / 2), Math.floor(y / 2)), m = hn(Math.floor(x / 9), Math.floor(y / 9));
    c = shadeC(c, (n - .5) * .1 + (m - .5) * .12);
    if (x % 64 < 1 || y % 64 < 1) c = shadeC(c, -.25);
    const inset = (Math.abs(x - 40) < 1.6 || Math.abs(x - 328) < 1.6) && y > 40 && y < 200 || (Math.abs(y - 40) < 1.6 || Math.abs(y - 200) < 1.6) && x > 40 && x < 328;
    if (inset) return [230, 190, 40];
    if (hn(Math.floor(x / 23), Math.floor(y / 17)) > .9 && hn(x, y) > .4) c = shadeC(c, -.18);
    return c;
  },
  rooftop(x, y) {
    const hz = hazardStripe(x, y); if (hz) return hz;
    const dx = x - 184, dy = y - 120, rr2 = Math.sqrt(dx * dx + dy * dy);
    if (rr2 > 52 && rr2 < 57) return [220, 170, 50];
    if (x > 168 && x < 200) { if (x < 170 || x > 198) return [230, 180, 60]; const k = (hn(Math.floor(x), Math.floor(y / 3)) - .5) * .08; return shadeC([150, 20, 40], k); }
    const tx = Math.floor(x / 24), ty = Math.floor(y / 24), fx = x - tx * 24, fy = y - ty * 24;
    if (fx < .8 || fy < .8) return [22, 24, 34];
    let c = [40 + hn(tx, ty) * 12, 44 + hn(tx, ty) * 12, 60 + hn(tx, ty) * 14];
    c = shadeC(c, (hn(Math.floor(x / 3), Math.floor(y / 3)) - .5) * .06 + (fx + fy < 6 ? .06 : 0));
    if (hn(x * .5, y * .5) > .992) c = [120, 130, 160];
    return c;
  },
  greenroom(x, y) {
    const u = (x + y) % 24, v = (x - y + 2400) % 24;
    if (u < 1 || v < 1) return [200, 160, 60];
    const c = [28, 100, 72];
    return shadeC(c, (hn(Math.floor(x / 2), Math.floor(y / 2)) - .5) * .1);
  },
};
// wall decorators: painted onto each wall face as it is baked
const DECOR = {
  studio(f) {
    const { u0, u1, z0, z1 } = f; if (z1 - z0 < 8) return;
    for (let u = Math.ceil(u0 / 4) * 4; u < u1; u += 4) f.line(u, z0 + 1, u, z1 - 6, ((u / 4) & 1) ? f.tones.sh : f.tones.lt);
    f.quad(u0, z1 - 5, u1, z1 - 3, '#ffcc33'); f.quad(u0, z1 - 3, u1, z1 - 2.4, '#8a5a08');
    f.quad(u0, z0 + 7, u1, z0 + 8, '#ff2e88'); f.quad(u0, z0, u1, z0 + 2, '#140a24');
  },
  warehouse(f) {
    const { u0, u1, z0, z1 } = f; if (z1 - z0 < 8) return;
    for (let u = Math.ceil(u0 / 3) * 3; u < u1; u += 3) f.line(u, z0, u, z1, ((u / 3) & 1) ? f.tones.lt : f.tones.sh);
    if (Math.floor(u0 / 48) % 2 === 0) { f.quad(u0, z1 - 12, u1, z1 - 5, '#d02a3a'); if (Math.floor(u0 / 16) % 3 === 0) f.quad(u0 + 3, z1 - 10, u0 + 12, z1 - 7, '#fff7e8'); }
    f.quad(u0, z0, u1, z0 + 2, '#ffcc33');
  },
  rooftop(f) {
    const { u0, u1, z0, z1 } = f; if (z1 - z0 < 8) return;
    f.quad(u0, z0, u1, z1, '#2a4a5e'); f.quad(u0 + 1, z0 + 3, u1 - 1, z1 - 4, '#4a7a90');
    f.line(u0 + 4, z0 + 4, u0 + 9, z1 - 5, '#9ad0e0'); f.line(u0 + 7, z0 + 4, u0 + 12, z1 - 5, '#6aa4b8');
    f.quad(u0, z0, u0 + 1.5, z1, '#ffcc33'); f.quad(u0, z1 - 3, u1, z1 - 1.5, '#ffcc33');
  },
  greenroom(f) {
    const { u0, u1, z0, z1 } = f; if (z1 - z0 < 8) return;
    for (let u = Math.ceil(u0 / 8) * 8; u < u1; u += 8) f.line(u, z0, u, z1, f.tones.sh);
    f.quad(u0, z1 - 3, u1, z1 - 1, '#c8a040');
    if (Math.floor(u0 / 16) % 2 === 0) { f.quad(u0 + 4, z0 + 9, u0 + 12, z0 + 19, '#c8a040'); f.quad(u0 + 5, z0 + 10, u0 + 11, z0 + 18, '#2a1446'); f.dot(u0 + 8, z0 + 15, '#e8c8a8'); f.quad(u0 + 6.5, z0 + 11, u0 + 9.5, z0 + 13, '#c8c8d0'); }
  },
};
const SETS = MT.sets = {
  studio: { id: 'studio', label: 'STUDIO 9', ambient: .55, wall: { h: 26, top: '#3a1e5a', side: '#5a2a80', face: 'none', roof: 'plain' }, door: { frame: '#ffcc33', shutter: '#3a2a5a', slat: '#2a1a40', style: 'shutter' },
    corner: [['mt:spotstand', 30, 30, Math.PI * .25], ['mt:spotstand', 338, 30, Math.PI * .75], ['mt:spotstand', 30, 210, -Math.PI * .25], ['mt:spotstand', 338, 210, -Math.PI * .75]],
    crowd: ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a6aff', '#ff9a3c', '#5fe0a0'], bleacher: ['#2a1446', '#3a1e5a'] },
  warehouse: { id: 'warehouse', label: 'MEGAMART PRIZE WAREHOUSE', ambient: .6, wall: { h: 26, top: '#5a6070', side: '#7a8090', face: 'none', roof: 'plain' }, door: { frame: '#ffcc33', shutter: '#8a909c', slat: '#5a606c', style: 'rollup' },
    corner: [['mash:crates-stacked', 30, 30, 0], ['mash:present-a-cube', 338, 28, .4], ['mash:present-b-round', 30, 212, 0], ['mash:barrel-large', 338, 212, 0]],
    crowd: ['#e8443a', '#3b82f6', '#ffcc33', '#22c55e', '#c8d0e0', '#ff9a3c'], bleacher: ['#3a3e4a', '#4a4e5a'] },
  rooftop: { id: 'rooftop', label: 'THE ROOFTOP GALA', ambient: .4, wall: { h: 26, top: '#c8a040', side: '#2a4a5e', face: 'none', roof: 'plain' }, door: { frame: '#d8a848', shutter: '#9aa4b4', slat: '#6a7484', style: 'elevator' },
    corner: [['mt:champagne', 30, 30, 0], ['mash:palm-detailed-straight', 338, 30, 0], ['mash:palm-detailed-straight', 30, 210, 0], ['mt:champagne', 338, 210, 0]],
    crowd: ['#f0e8f0', '#1a1a24', '#c8a040', '#b0203a', '#4a7a90', '#e8c8a8'], bleacher: ['#1a1e2a', '#2a2e3a'] },
  greenroom: { id: 'greenroom', label: 'THE GREEN ROOM', ambient: .62, wall: { h: 26, top: '#5a3a20', side: '#7a5030', face: 'none', roof: 'plain' }, door: { frame: '#c8a040', shutter: '#6a4020', slat: '#4a2a14', style: 'wood' },
    corner: [['mash:couch', 36, 34, Math.PI / 2], ['mash:kitchen-fridge', 338, 30, Math.PI / 2], ['mash:cake', 30, 210, 0], ['mash:television-modern', 338, 210, -Math.PI / 2]],
    crowd: [], bleacher: null },
};
for (const k in SETS) { SETS[k].floor = FLOORS[k]; SETS[k].wall.decorate = DECOR[k]; }

// ---------------------------------------------------------------------------------------------------------------
// the audience: bleachers east and west of the arena, rows of fans who bob with the ratings (cosmetic)
const STUDIO = MT.studio = { excite: .3, wave: false, cheerT: 0, laughT: 0, booT: 0, fireworks: [] };
function makeAudience(set) {
  const R = E.rng(91), out = [];
  if (!set.bleacher) return out;
  for (const side of [-1, 1]) for (let row = 0; row < 5; row++) for (let k = 0; k < 13; k++) {
    const x = side < 0 ? -18 - row * 16 : 386 + row * 16, y = 18 + k * 16 + (row & 1) * 6;
    out.push({ x, y, z: 4 + row * 7, side, row, c: set.crowd[Math.floor(R() * set.crowd.length)], skin: ['#f0c8a0', '#c89070', '#8a5a3a', '#e8b890', '#5a3a2a'][Math.floor(R() * 5)], hair: ['#2a1a10', '#8a5a20', '#ffcc33', '#c8c8d0', '#d03a20'][Math.floor(R() * 5)], ph: R() * TAU, sign: R() < .08 ? ['MASH!', 'KA-CHING!', 'HI MOM'][Math.floor(R() * 3)] : null });
  }
  return out;
}
function drawBleachers(r, set, t, crowd) {
  if (!set.bleacher) return;
  const [c0, c1] = set.bleacher;
  for (const side of [-1, 1]) for (let row = 0; row < 5; row++) {
    const x0 = side < 0 ? -26 - row * 16 : 378 + row * 16, x1 = x0 + 16, z1 = 2 + row * 7;
    r.queue((x0 + x1) / 2, 120, 0, g => { r.box(g, x0, -4, 0, x1, 244, z1, row & 1 ? c1 : c0, E.tones(row & 1 ? c1 : c0).sh); }, { bias: -2 });
  }
  const ex = STUDIO.excite, wave = STUDIO.wave;
  for (const side of [-1, 1]) {
    const list = crowd.filter(a => a.side === side);
    r.queue(side < 0 ? -60 : 430, 120, 30, g => {
      for (const a of list) {
        const cheer = STUDIO.cheerT > 0 || (wave && Math.sin(t * 6 - a.y * .05) > .6);
        const bob = Math.abs(Math.sin(t * (4 + ex * 6) + a.ph)) * (1 + ex * 3) * (cheer ? 1.6 : 1);
        const [sx, sy] = r.w(a.x, a.y, a.z + 6 + bob);
        px.rect(g, sx - 3, sy, 7, 6, a.c); px.rect(g, sx - 3, sy + 5, 7, 1, E.tones(a.c).sh);
        px.disc(g, sx + .5, sy - 2, 2.5, a.skin); px.rect(g, sx - 2, sy - 5, 5, 2, a.hair);
        if (cheer) { px.rect(g, sx - 5, sy - 6, 1, 6, a.skin); px.rect(g, sx + 5, sy - 6, 1, 6, a.skin); }
        if (a.sign) { const w = E.font.width(a.sign) + 4; px.rect(g, sx - w / 2, sy - 16 - bob * .5, w, 9, '#fff7e8'); px.rect(g, sx, sy - 7 - bob * .5, 1, 5, '#8a5a32'); E.font.text(g, a.sign, sx, sy - 15 - bob * .5, '#d02a3a', { align: 'center', outline: false }); }
      }
    }, { bias: 2 });
  }
}
// the jumbotron above the north wall: who is talking (a live portrait), else the logo, ratings and a sponsor
function drawJumbotron(r, t) {
  r.queue(184, -46, 40, g => {
    const p0 = r.w(124, -40, 82), p1 = r.w(244, -40, 18), x0 = Math.round(p0[0]), y0 = Math.round(p0[1]), w = Math.round(p1[0] - p0[0]), h = Math.round(p1[1] - p0[1]);
    if (w < 20 || h < 10) return;
    px.rect(g, x0 - 3, y0 - 3, w + 6, h + 6, '#0c0618'); px.rect(g, x0 - 2, y0 - 2, w + 4, h + 4, '#c8d0e0');
    for (let i = 0; i < w + 4; i += 4) { const on = (Math.floor(t * 8) + i / 4) % 3 === 0; px.dot(g, x0 - 2 + i, y0 - 3, on ? '#fff0a0' : '#8a5a08'); px.dot(g, x0 - 2 + i, y0 + h + 2, on ? '#fff0a0' : '#8a5a08'); }
    px.rect(g, x0, y0, w, h, '#0a0614');
    const L = MT.lines && MT.lines.current;
    if (L) { const s = Math.min(h - 12, 40); MT.drawSpeakerPortrait(g, L.who, x0 + w / 2 - s / 2, y0 + 2, s, t); E.font.text(g, L.name, x0 + w / 2, y0 + h - 9, '#ffcc33', { align: 'center', outline: false }); }
    else {
      const phase = Math.floor(t / 4) % 3;
      if (phase === 0) E.font.title(g, 'MASH TV', x0 + w / 2, y0 + h / 2 - 8, { scale: 2, colors: ['#ffcc33', '#ff2e88'], align: 'center' });
      else if (phase === 1) { E.font.text(g, 'RATINGS', x0 + w / 2, y0 + 6, '#2ee6ff', { align: 'center', outline: false }); E.font.text(g, Math.round(MT.studio.excite * 100) + '%', x0 + w / 2, y0 + 18, '#fff7e8', { align: 'center', scale: 2, outline: false }); }
      else { const ad = MT.TEXT ? MT.TEXT.sponsors[Math.floor(t / 12) % MT.TEXT.sponsors.length] : ['KRUNCH-O', '']; E.font.text(g, ad[0], x0 + w / 2, y0 + 6, '#ff9a3c', { align: 'center', scale: 2, outline: false }); E.font.text(g, ad[1], x0 + w / 2, y0 + 24, '#fff7e8', { align: 'center', outline: false, font: 'tiny' }); }
    }
    for (let yy = y0; yy < y0 + h; yy += 2) { g.globalAlpha = .18; g.fillStyle = '#000'; g.fillRect(x0, yy, w, 1); g.globalAlpha = 1; } g._c = null;
  }, { bias: -10 });
}
function drawOutside(r, set, t, crowd, world) {
  drawBleachers(r, set, t, crowd);
  if (set.id === 'greenroom') return;
  drawJumbotron(r, t);
  // the north truss with APPLAUSE and ON AIR signs
  r.queue(184, -14, 34, g => {
    const a = r.w(-20, -14, 40), b = r.w(388, -14, 40);
    px.line(g, a[0], a[1], b[0], b[1], '#5a5468', 2); px.line(g, a[0], a[1] + 4, b[0], b[1] + 4, '#3a3448', 1);
    for (let x = -20; x < 388; x += 12) { const p = r.w(x, -14, 40), q = r.w(x + 6, -14, 36); px.line(g, p[0], p[1], q[0], q[1] + 4, '#4a4458'); }
    const sign = (x, label, on, col) => { const p = r.w(x, -14, 38), w = E.font.width(label) + 8; px.rect(g, p[0] - w / 2 - 1, p[1] - 1, w + 2, 11, '#0c0618'); px.rect(g, p[0] - w / 2, p[1], w, 9, on ? col : '#3a2030'); E.font.text(g, label, p[0], p[1] + 1, on ? '#fff7e8' : '#7a5a6a', { align: 'center', outline: false }); };
    sign(60, 'APPLAUSE', STUDIO.cheerT > 0 ? Math.floor(t * 6) % 2 === 0 : false, '#d02a3a'); sign(308, 'ON AIR', true, '#ff3344');
  }, { bias: -8 });
  if (set.id === 'studio') { r.shape('mt:crane', 54, 268, 0, { facing: -Math.PI / 2 - .3 }); r.shape('mt:crane', 314, 268, 0, { facing: -Math.PI / 2 + .3 }); r.shape('mt:camera', 120, 262, 0, { facing: -Math.PI / 2 }); r.shape('mt:camera', 250, 262, 0, { facing: -Math.PI / 2 }); }
  if (set.id === 'warehouse') { for (const [x, y] of [[-110, 0], [-110, 120], [478, 0], [478, 120]]) { r.shape('mt:rack', x, y, 0); r.shape('mash:kitchen-fridge', x - 8, y, 13); r.shape('mash:television-vintage', x + 8, y, 26.5); } r.shape('mt:forklift', 60, 270, 0, { facing: 0 }); r.shape('mash:present-a-rectangle', 300, 268, 0); }
  if (set.id === 'rooftop') {
    r.shape('mt:searchlight', -40, -30, 0); r.shape('mt:searchlight', 408, -30, 0);
    for (const x of [40, 100, 268, 328]) r.shape('mt:stanchion', x, 262, 0);
    r.queue(184, -120, 0, g => {   // the skyline at the far edge, its windows lit teal and amber
      for (let i = 0; i < 26; i++) { const x = -120 + i * 24, hh = 40 + hn(i, 3) * 80, p = r.w(x, -110, hh), q = r.w(x + 20, -110, 0); px.rect(g, p[0], p[1], q[0] - p[0], q[1] - p[1], '#10142a'); for (let wy = p[1] + 4; wy < q[1] - 4; wy += 6) for (let wx = p[0] + 3; wx < q[0] - 3; wx += 5) if (hn(wx, wy) > .55) px.dot(g, wx, wy, hn(wy, wx) > .5 ? '#2ee6ff' : '#ffb84a'); }
    }, { bias: -20 });
  }
}
/** a set's lights: called every draw */
function drawSetLights(r, set, t, world) {
  const L = game.lights;
  if (world && world.ratings && world.ratings.prime > 0) { const calm = game.reduceMotion || (game.settings && game.settings.flashes < .3), on = calm || Math.floor(t * 8) % 2 === 0; for (let i = 0; i < 4; i++) if (on) L.add(60 + i * 83, 50 + (i % 2) * 140, 30, 110, calm ? .35 : .7, { color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#5fe0a0'][(i + Math.floor(t * 4)) % 4] }); }
  if (set.id === 'studio') {
    const cols = ['#ff2e88', '#2ee6ff', '#ffcc33', '#ffffff'];
    for (let i = 0; i < 4; i++) { const a = t * .35 + i * TAU / 4; L.add(184 + Math.cos(a) * 120, 120 + Math.sin(a * 1.3) * 70, 0, 85, .55, { color: cols[i] }); }
  } else if (set.id === 'warehouse') {
    for (const x of [70, 184, 298]) for (const y of [60, 180]) L.add(x, y, 40, 95, .45, { color: '#dff4ff' });
  } else if (set.id === 'rooftop') {
    for (let x = 24; x <= 344; x += 40) { L.add(x, 14, 24, 34, .5, { color: '#ffc870' }); L.add(x, 226, 10, 30, .4, { color: '#ffc870' }); }
    const a = Math.sin(t * .4); L.add(184 + a * 140, 120 + Math.cos(t * .3) * 60, 0, 60, .6, { color: '#fffbe0' });
    for (const f of STUDIO.fireworks) if (f.t < .4) L.add(f.x, f.y, 60, 160, (.4 - f.t) * 2, { color: f.c });
  } else {
    for (const [x, y] of [[40, 40], [328, 40], [40, 200], [328, 200], [184, 120]]) L.add(x, y, 24, 90, .5, { color: '#ffd8a0' });
  }
}
/** fireworks in the night sky over the rooftop (cosmetic) */
function stepFireworks(dt, set) {
  if (set.id !== 'rooftop') { STUDIO.fireworks.length = 0; return; }
  for (const f of STUDIO.fireworks) f.t += dt;
  E.prune(STUDIO.fireworks, f => f.t > 1.6);
  if (Math.random() < dt * .5) {
    const f = { x: 40 + Math.random() * 290, y: -60 - Math.random() * 40, c: ['#ff2e88', '#2ee6ff', '#ffcc33', '#5fe0a0'][Math.floor(Math.random() * 4)], t: 0 };
    STUDIO.fireworks.push(f);
    if (game.particles) { for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; game.particles.add({ kind: 'spark', x: f.x, y: f.y, z: 90, vx: Math.cos(a) * 60, vy: Math.sin(a) * 30, vz: Math.sin(a) * 40 + 20, max: 1.2, color: f.c, g: 40 }); } }
  }
}
/** the door painter: posts, the lintel, the shutter (rising as it opens), beacons and the exit sign */
function drawDoor(r, set, d, t) {
  const D = DOORS[d.id], st = set.door, u = d.u, cut = d.id === 'S';
  const top = cut ? 6 : 26, H = top * (1 - u);
  const along = d.id === 'N' || d.id === 'S';
  const [ax, ay, bx, by] = along ? [160, D.y - 8, 208, D.y + 8] : [D.x - 8, 96, D.x + 8, 144];
  const post = (x0, y0, x1, y1) => r.queue((x0 + x1) / 2, (y0 + y1) / 2, 0, g => r.box(g, x0, y0, 0, x1, y1, top + (cut ? 0 : 4), st.frame, E.tones(st.frame).sh), { occluder: true });
  if (along) { post(156, ay, 161, by); post(207, ay, 212, by); }
  else { post(ax, 92, bx, 97); post(ax, 143, bx, 148); }
  if (H > .5) {
    r.queue((ax + bx) / 2, (ay + by) / 2, 0, g => {
      if (st.style === 'elevator' && !cut) {   // two panels sliding apart
        const w = (along ? 48 : 48) / 2 * (1 - u);
        if (along) { r.box(g, 161, ay + 4, 0, 161 + w, by - 4, 26, st.shutter, st.slat); r.box(g, 207 - w, ay + 4, 0, 207, by - 4, 26, st.shutter, st.slat); }
        else { r.box(g, ax + 4, 97, 0, bx - 4, 97 + w, 26, st.shutter, st.slat); r.box(g, ax + 4, 143 - w, 0, bx - 4, 143, 26, st.shutter, st.slat); }
        return;
      }
      if (along) r.box(g, 161, ay + 4, 0, 207, by - 4, H, st.shutter, st.slat); else r.box(g, ax + 4, 97, 0, bx - 4, 143, H, st.shutter, st.slat);
      if (!cut && along) for (let z = 3; z < H; z += 4) { const p = r.w(161, by - 4, z), q = r.w(207, by - 4, z); px.line(g, p[0], p[1], q[0], q[1], st.slat); }
      if (!cut && !along) for (let yy = 100; yy < 143; yy += 5) { const p = r.w(ax + 4, yy, H), q = r.w(bx - 4, yy, H); px.line(g, p[0], p[1], q[0], q[1], st.slat); }
    }, { occluder: true, top: H });
  }
  // beacons: red while it opens and spawns, green when it is an exit
  const bc = d.state === 'exit' ? '#3aff6a' : (d.state === 'opening' || d.state === 'open') ? '#ff3344' : null;
  if (bc && (d.state !== 'open' || Math.floor(t * 4) % 2 === 0 || d.state === 'exit')) {
    const pts = along ? [[158, D.y], [210, D.y]] : [[D.x, 94], [D.x, 146]];
    for (const [x, y] of pts) { r.queue(x, y, top + 6, g => { const [sx, sy] = r.w(x, y, top + 6); px.disc(g, sx, sy, 2.5, bc); px.dot(g, sx - 1, sy - 1, '#ffffff'); }, { emissive: true }); game.lights.add(x, y, top + 6, 40, .7, { color: bc }); }
  }
  if (d.state === 'exit' && d.sign) {
    const [x, y] = along ? [184, D.y] : [D.x, 120];
    r.queue(x, y + (d.id === 'N' ? 1 : 0), top + 14, g => {
      const [sx, sy] = r.w(x, y, top + 16), txt = d.sign.name, w = Math.max(E.font.width(txt) + 18, 40), bob = Math.round(Math.sin(t * 3) * 1);
      px.rect(g, sx - w / 2 - 1, sy - 7 + bob, w + 2, 14, '#0c0618'); px.rect(g, sx - w / 2, sy - 6 + bob, w, 12, '#0d3a1a'); px.rect(g, sx - w / 2, sy - 6 + bob, w, 1, '#3aff6a');
      if (d.sign.icon && SPR.ico[d.sign.icon]) px.sprite(g, SPR.ico[d.sign.icon], sx - w / 2 + 2, sy - 5 + bob);
      E.font.text(g, txt, sx + 5, sy - 4 + bob, '#d8ffe0', { align: 'center', outline: false });
      if (d.sign.key) px.sprite(g, SPR.keyS, sx + w / 2 - 9, sy - 2 + bob);
    }, { emissive: true, bias: 4 });
  }
}
MT.art = { defineShapes, makeAudience, drawOutside, drawSetLights, drawDoor, stepFireworks, logoMask };
