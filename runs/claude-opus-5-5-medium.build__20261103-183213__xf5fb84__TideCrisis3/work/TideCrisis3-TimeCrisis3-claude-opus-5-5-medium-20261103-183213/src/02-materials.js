// 02-materials: the texture bank. Every material is 5 light bands of a 32x32 tile (Uint32 RGBA, top row first, v up),
// taken from the engine's own materials (E.materialTile) or made here for the new ones (corrugated steel, concrete,
// hazard stripes, awnings, lanterns, lit windows, water, nets...). Lazily built, headless-safe (no canvas needed).
// Material flags: glow (emissive), water, double (both sides), alpha (alpha-tested), scroll.
// Reads: E.materialTile, E.MATERIALS.

const TEX = 32;
const BAND_K = [.40, .58, .76, .93, 1.1];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
TC.BAYER4 = BAYER4;
const MATS = {};      // id -> { id, bands: [Uint32Array x5], lid: bands for faces looking up/down, glow, water, double, alpha, avg }
TC.MATS = MATS;

function noise2(x, y, s = 0) { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = noise2(xi, yi, s), b = noise2(xi + 1, yi, s), c = noise2(xi, yi + 1, s), d = noise2(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
TC.noise2 = noise2; TC.vnoise = vnoise;

// bands from a base-color function fn(x, y) -> [r, g, b, a?]
function bandsFrom(fn, o = {}) {
  const base = [], out = [];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) base.push(fn(x, y));
  for (let k = 0; k < 5; k++) {
    const arr = new Uint32Array(TEX * TEX), m = o.glow ? 1 : BAND_K[k], cool = o.glow ? 0 : (2 - k) * .05;
    for (let i = 0; i < base.length; i++) {
      const c = base[i], a = c[3] === undefined ? 255 : c[3];
      const r = c[0] * m * (1 - cool), g = c[1] * m, b = c[2] * m * (1 + cool * 1.4) + (k === 0 && !o.glow ? 6 : 0);
      arr[i] = a < 128 ? 0 : pack(r, g, b);
    }
    out.push(arr);
  }
  return out;
}
function bandsFromEngine(id, lid) {
  const out = [];
  for (let k = 0; k < 5; k++) {
    const t = E.materialTile(id, { size: TEX, px: 1, band: k, lid });
    if (!t) return null;
    const arr = new Uint32Array(TEX * TEX);
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const sx = Math.floor(x * t.w / TEX), sy = Math.floor(y * t.h / TEX), j = (sy * t.w + sx) * 4;
      arr[y * TEX + x] = t.rgba[j + 3] < 128 ? 0 : pack(t.rgba[j], t.rgba[j + 1], t.rgba[j + 2]);
    }
    out.push(arr);
  }
  return out;
}
function avgOf(bands) { const a = bands[3]; let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < a.length; i += 7) { const c = a[i]; if (!c) continue; r += c & 255; g += (c >> 8) & 255; b += (c >> 16) & 255; n++; } n = n || 1; return [r / n, g / n, b / n]; }

const MATDEF = {};    // id -> () => { fn | engine, flags }
function defMat(id, spec) { MATDEF[id] = spec; }
TC.defMat = defMat;
function mat(id) {
  let m = MATS[id];
  if (m) return m;
  let spec = MATDEF[id];
  if (!spec && id.startsWith('#')) {          // a solid color, lightly speckled
    const c = hexRGB(id); spec = { fn: (x, y) => { const n = (noise2(x, y, 3) - .5) * 14; return [c[0] + n, c[1] + n, c[2] + n]; } };
  }
  if (!spec && id.startsWith('glow#')) { const c = hexRGB(id.slice(4)); spec = { glow: true, fn: () => c }; }
  if (!spec && E.MATERIALS[id]) spec = { engine: id };
  if (!spec) spec = { fn: () => [255, 0, 255] };
  const bands = spec.engine ? bandsFromEngine(spec.engine, false) : bandsFrom(spec.fn, spec);
  const lid = spec.engine ? (bandsFromEngine(spec.engine, true) || bands) : spec.lidFn ? bandsFrom(spec.lidFn, spec) : bands;
  m = MATS[id] = { id, bands, lid, glow: !!spec.glow, water: !!spec.water, double: !!spec.double, alpha: !!spec.alpha, scroll: spec.scroll || null, avg: null, scale: spec.scale || 1 };
  m.avg = avgOf(bands);
  return m;
}
TC.mat = mat;

// ---- the new materials
const C3 = h => hexRGB(h);
defMat('concrete', { fn: (x, y) => { const n = vnoise(x / 5, y / 5, 1) * 26 + noise2(x, y, 2) * 14 - (((x % 32) === 0 || (y % 16) === 0) ? 22 : 0); return [128 + n, 126 + n, 120 + n]; } });
defMat('concrete-dark', { fn: (x, y) => { const n = vnoise(x / 4, y / 4, 4) * 22 + noise2(x, y, 5) * 12 - ((y % 16) === 0 ? 18 : 0); return [86 + n, 88 + n, 92 + n]; } });
defMat('asphalt', { fn: (x, y) => { const n = noise2(x, y, 7) * 26; return [52 + n, 52 + n, 58 + n]; } });
defMat('hazard', { fn: (x, y) => ((x + y) & 15) < 8 ? [242, 193, 46] : [30, 30, 30] });
defMat('grate', { alpha: true, double: true, fn: (x, y) => (x % 4 === 0 || y % 4 === 0) ? [120, 124, 128] : [0, 0, 0, 0] });
defMat('net', { alpha: true, double: true, fn: (x, y) => ((x + y) % 6 === 0 || (x - y + 64) % 6 === 0) ? [150, 140, 100] : [0, 0, 0, 0] });
defMat('rope', { fn: (x, y) => { const s = ((x + y * 2) % 6) < 3; return s ? [168, 140, 92] : [130, 104, 66]; } });
defMat('tarp', { fn: (x, y) => { const n = vnoise(x / 6, y / 3, 9) * 30; return [40 + n * .3, 80 + n, 70 + n * .6]; } });
defMat('rubber', { fn: (x, y) => { const n = noise2(x, y, 11) * 10; return [34 + n, 34 + n, 38 + n]; } });
defMat('hull', { fn: (x, y) => { const n = noise2(x, y, 12) * 10, stripe = (y % 32) > 26; return stripe ? [200, 60, 50] : [214 + n, 218 + n, 222 + n]; } });
defMat('hull-dark', { fn: (x, y) => { const n = noise2(x, y, 13) * 12, stripe = (y % 32) > 27; return stripe ? [40, 150, 140] : [44 + n, 52 + n, 60 + n]; } });
defMat('camo', { fn: (x, y) => { const v = vnoise(x / 7, y / 7, 14); return v > .6 ? [70, 80, 50] : v > .35 ? [100, 104, 70] : [52, 58, 40]; } });
defMat('steel-paint', { fn: (x, y) => { const n = vnoise(x / 8, y / 8, 15) * 18 + noise2(x, y, 16) * 8 - ((x % 16) === 0 ? 20 : 0); return [92 + n, 100 + n, 110 + n]; } });
defMat('gunmetal', { fn: (x, y) => { const n = noise2(x, y, 17) * 10 + ((y % 8) === 0 ? 16 : 0); return [58 + n, 62 + n, 70 + n]; } });
defMat('teal-paint', { fn: (x, y) => { const n = vnoise(x / 6, y / 6, 18) * 20; return [30 + n * .5, 110 + n, 112 + n]; } });
for (const [id, col] of [['container-red', '#a8322a'], ['container-blue', '#2a5aa0'], ['container-ochre', '#c08a2a'], ['container-green', '#3a7a4a'], ['container-grey', '#7a7f86']]) {
  const c = C3(col);
  defMat(id, { fn: (x, y) => { const r = (x % 4), k = r === 0 ? .7 : r === 1 ? 1.12 : 1, n = noise2(x, y, 19) * 12 - (vnoise(x / 3, y / 9, 20) > .78 ? 30 : 0); return [c[0] * k + n, c[1] * k + n, c[2] * k + n]; } });
}
for (const [id, a, b] of [['awning-red', '#d8332a', '#f2ece0'], ['awning-blue', '#2a64c8', '#f2ece0'], ['awning-green', '#2f9a52', '#f6e9c8']]) {
  const A = C3(a), B = C3(b); defMat(id, { double: true, fn: (x) => (x % 16) < 8 ? A : B });
}
defMat('lantern', { glow: true, fn: (x, y) => { const v = Math.abs(y - 16) / 16, k = 1 - v * .5, rib = (y % 8) === 0; return rib ? [150, 60, 30] : [255 * k, 170 * k + 40, 60 * k]; } });
defMat('lantern-red', { glow: true, fn: (x, y) => { const v = Math.abs(y - 16) / 16, k = 1 - v * .5, rib = (y % 8) === 0; return rib ? [120, 30, 30] : [255 * k, 70 * k + 20, 60 * k]; } });
defMat('glasslit', { glow: true, fn: (x, y) => { const f = (x % 16) < 2 || (y % 16) < 2; const n = noise2(Math.floor(x / 16), Math.floor(y / 16), 21); return f ? [40, 34, 30] : n > .4 ? [255, 210, 120] : [150, 120, 80]; } });
defMat('window-dark', { fn: (x, y) => { const f = (x % 16) < 2 || (y % 16) < 2; return f ? [70, 60, 50] : [30, 40, 60]; } });
defMat('screen-teal', { glow: true, fn: (x, y) => { const l = (y % 4) === 0; const bar = (y > 8 && y < 24 && x > 4 && x < 4 + ((Math.floor(y / 4) * 7) % 24)); return l ? [10, 60, 50] : bar ? [120, 255, 220] : [30, 160, 130]; } });
defMat('lamp', { glow: true, fn: () => [255, 220, 150] });
defMat('lamp-sodium', { glow: true, fn: () => [255, 176, 74] });
defMat('red-lamp', { glow: true, fn: (x, y) => { const d = Math.hypot(x - 16, y - 16); return d < 10 ? [255, 70, 50] : [140, 20, 20]; } });
defMat('gold-glow', { glow: true, fn: (x, y) => { const d = Math.hypot(x - 16, y - 16); return [255, 200 - d * 3, 60]; } });
defMat('weak', { glow: true, fn: (x, y) => { const d = Math.hypot(x - 16, y - 16); return d < 9 ? [255, 236, 140] : [255, 150, 40]; } });
defMat('lens', { glow: true, fn: (x, y) => { const r = (x + y) % 8 < 2; return r ? [220, 230, 255] : [255, 250, 210]; } });
defMat('glass', { fn: (x, y) => { const s = ((x + 32 - y) % 32) < 4; return s ? [170, 200, 220] : [70, 100, 130]; } });
defMat('signboard', { fn: (x, y) => { const edge = y < 3 || y > 28; return edge ? [80, 50, 30] : [40, 46, 70]; } });
defMat('poster', { glow: true, fn: (x, y) => { const d = Math.hypot(x - 16, y - 13); return d < 7 ? [255, 210, 80] : y > 24 ? [240, 60, 60] : [30, 40, 90]; } });
defMat('fireworks', { fn: (x, y) => (x % 8) < 4 ? [200, 40, 40] : [230, 200, 60] });
defMat('lifering', { fn: (x) => (x % 16) < 8 ? [230, 40, 40] : [245, 245, 245] });
defMat('bottle', { glow: true, fn: (x, y) => [60, 200 - y * 2, 90] });
defMat('barrel-red', { fn: (x, y) => { const band = (y % 16) < 3; const lab = y > 12 && y < 20 && x > 8 && x < 24; return band ? [80, 30, 28] : lab ? (((x + y) & 3) < 2 ? [240, 200, 40] : [30, 30, 30]) : [190, 42, 36]; } });
defMat('tank-white', { fn: (x, y) => { const band = (y % 16) < 2; return band ? [120, 130, 140] : [220, 226, 232]; } });
defMat('ammo-crate', { fn: (x, y) => { const edge = x < 3 || x > 28 || y < 3 || y > 28; return edge ? [120, 60, 20] : [236, 120, 30]; } });
defMat('sandbag', { fn: (x, y) => { const row = Math.floor(y / 8), off = row % 2 ? 8 : 0, seam = ((x + off) % 16) < 1 || (y % 8) < 1; const n = noise2(x, y, 23) * 16; return seam ? [100, 84, 60] : [170 + n, 150 + n, 110 + n]; } });
defMat('foam', { glow: false, fn: (x, y) => { const n = noise2(x, y, 24) * 30; return [210 + n, 230 + n, 235 + n]; } });
defMat('dock-wood', { engine: 'planks' });
defMat('sea-night', { water: true, fn: (x, y) => { const n = vnoise(x / 6, y / 4, 25); return [18 + n * 20, 34 + n * 30, 70 + n * 40]; } });
defMat('sea-storm', { water: true, fn: (x, y) => { const n = vnoise(x / 6, y / 4, 26); return [34 + n * 24, 52 + n * 30, 56 + n * 30]; } });
defMat('sea-dawn', { water: true, fn: (x, y) => { const n = vnoise(x / 6, y / 4, 27); return [30 + n * 30, 90 + n * 40, 104 + n * 40]; } });
defMat('canal', { water: true, fn: (x, y) => { const n = vnoise(x / 6, y / 4, 28); return [20 + n * 20, 40 + n * 30, 56 + n * 30]; } });
defMat('rangewall', { fn: (x, y) => { const n = noise2(x, y, 29) * 10, line = (y % 32) < 2; return line ? [200, 180, 40] : [96 + n, 98 + n, 104 + n]; } });
defMat('plywood', { fn: (x, y) => { const n = vnoise(x / 9, y / 2, 30) * 30; return [190 + n, 150 + n, 100 + n * .7]; } });
defMat('cutout', { double: true, fn: (x, y) => { const n = vnoise(x / 9, y / 2, 31) * 20; return [60 + n, 70 + n, 110 + n]; } });
defMat('mud-path', { fn: (x, y) => { const n = vnoise(x / 5, y / 5, 32) * 30 + noise2(x, y, 33) * 10; return [80 + n, 70 + n, 56 + n]; } });
defMat('cliff', { engine: 'rock' });
defMat('roof-slate', { engine: 'slate' });
defMat('wet-cobble', { engine: 'cobble' });
