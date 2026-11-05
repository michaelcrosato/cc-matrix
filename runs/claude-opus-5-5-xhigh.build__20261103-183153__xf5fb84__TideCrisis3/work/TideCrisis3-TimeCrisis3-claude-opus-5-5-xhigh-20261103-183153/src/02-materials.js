/* 02-materials: the game's materials (def('material', id, spec)) and the texture bank Rail3D samples: five light bands
 * per material (E.materialTile for engine materials; our own pattern functions for the rest), lid variants, flags
 * (glow, water, alpha, double, scroll). Canvas textures (signs, live screens) are made lazily in the browser.
 * A spec: { m: engine material id or { color, pattern, ... } } or { colors: [hex...], pat(u, v) -> [colorIndex, step]
 * | null (transparent) }, plus flags. u, v are world units across the surface (2 texels a unit, a tile repeats every
 * 32 units), or 0..1 across a face for face patterns. */
const TEX_N = 64, TEX_PX = 2, TEX_MASK = TEX_N - 1;
const TONES = ['deep', 'sh', 'base', 'lt', 'hi'];
function hexRGB(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const pack = (r, g, b) => (255 << 24 | (b & 255) << 16 | (g & 255) << 8 | (r & 255)) >>> 0;
TC.hexRGB = hexRGB; TC.pack = pack;
function rampOf(hex) { const t = E.tones(hex); return TONES.map(k => hexRGB(t[k])); }

/* ---- engine-pattern materials we add (E.MATERIALS) ---- */
Object.assign(E.MATERIALS, {
  'tc-concrete': { color: '#8a8a88', pattern: 'speck', amount: .12 },
  'tc-concrete-dk': { color: '#5e6066', pattern: 'speck', amount: .1 },
  'tc-asphalt': { color: '#3e4048', pattern: 'speck', amount: .2 },
  'tc-pier': { color: '#7a5434', pattern: 'planks', bw: 5 },
  'tc-pier-dk': { color: '#4e3826', pattern: 'planks', bw: 5 },
  'tc-plywood': { color: '#c8a46a', pattern: 'planks', bw: 8 },
  'tc-brick': { color: '#7a4a3e', pattern: 'bricks' },
  'tc-brick-dk': { color: '#563a36', pattern: 'bricks' },
  'tc-cobble': { color: '#5e5a66', pattern: 'stones', size: 4 },
  'tc-cobble-wet': { color: '#4a5258', pattern: 'stones', size: 4 },
  'tc-stone': { color: '#7a7680', pattern: 'stones', size: 6 },
  'tc-rock': { color: '#5a5660', pattern: 'stones', size: 9 },
  'tc-rock-wet': { color: '#3e4448', pattern: 'stones', size: 9 },
  'tc-slate': { color: '#3e424e', pattern: 'shingles' },
  'tc-rooftile': { color: '#8a4a3a', pattern: 'shingles' },
  'tc-plaster': { color: '#d0c4a8', pattern: 'noise' },
  'tc-plaster-blue': { color: '#8ea4b8', pattern: 'noise' },
  'tc-plaster-ochre': { color: '#c89a5a', pattern: 'noise' },
  'timber': { color: '#5a3a24', pattern: 'planks', bw: 4, dir: 'v' },
  'tc-floortile': { color: '#6a7478', pattern: 'tiles', size: 6 },
  'tc-ice': { color: '#b8e0f0', pattern: 'glaze' },
  'tc-iron': { color: '#4e5262', pattern: 'metal' },
  'tc-steel': { color: '#7e8694', pattern: 'metal' },
  'tc-steel-dk': { color: '#3e434e', pattern: 'metal' },
  'tc-rust': { color: '#6a5a52', pattern: 'metal', over: [['rust']] },
  'tc-tarp': { color: '#3e6a5a', pattern: 'cloth', fold: 1.2 },
  'tc-canvas': { color: '#c8b890', pattern: 'cloth', fold: 1 },
  'tc-rope': { color: '#b89a6a', pattern: 'cloth', fold: 1.6 },
  'tc-rubber': { color: '#2a2a30', pattern: 'noise' },
  'tc-hull-white': { color: '#d8dce4', pattern: 'metal' },
  'tc-hull-dark': { color: '#2e3442', pattern: 'metal' },
  'tc-hull-red': { color: '#a8343a', pattern: 'metal' },
  'tc-hull-gun': { color: '#4a5260', pattern: 'metal' },
  'tc-paint-green': { color: '#3a6a4a', pattern: 'metal' },
  'tc-paint-yellow': { color: '#d8a83a', pattern: 'metal' },
  'tc-paint-orange': { color: '#e07a2a', pattern: 'metal' },
  'brass': { color: '#b8923a', pattern: 'metal' },
  'tc-leaves': { color: '#3a5a3a', pattern: 'foliage' },
  'tc-sand': { color: '#9a8a6a', pattern: 'speck' },
  'tc-cloth-red': { color: '#a83434', pattern: 'cloth' },
  'tc-cloth-navy': { color: '#2a3454', pattern: 'cloth' },
  'tc-fish': { color: '#a8b4c0', pattern: 'glaze' },
  'tc-barrel': { color: '#6a4a2a', pattern: 'planks', bw: 3, dir: 'v' }
});

/* ---- our own patterns ---- */
const P = {
  corrugated: (u, v) => [0, Math.sin(u * Math.PI / 1.5) > .35 ? 1 : Math.sin(u * Math.PI / 1.5) < -.6 ? -1 : 0],
  hazard: (u, v) => [((Math.floor((u + v) / 4) % 2) + 2) % 2, 0],
  stripesV: w => (u, v) => [((Math.floor(u / w) % 2) + 2) % 2, 0],
  stripesH: w => (u, v) => [((Math.floor(v / w) % 2) + 2) % 2, 0],
  grate: (u, v) => { const a = ((u % 2) + 2) % 2, b = ((v % 2) + 2) % 2; return a < .5 || b < .5 ? [0, (a < .5 && b < .5) ? 1 : 0] : null; },
  net: (u, v) => { const a = ((u + v) % 3 + 3) % 3, b = ((u - v) % 3 + 3) % 3; return a < .5 || b < .5 ? [0, 0] : null; },
  windows: (u, v) => { const a = ((u % 12) + 12) % 12, b = ((v % 14) + 14) % 14; return a > 2 && a < 10 && b > 3 && b < 12 ? [1, (Math.floor(u / 12) * 7 + Math.floor(v / 14) * 3) % 5 === 0 ? -3 : 0] : [0, 0]; },
  panel: (u, v) => { const a = ((u % 16) + 16) % 16, b = ((v % 16) + 16) % 16; return [0, a < .5 || b < .5 ? -1 : (a < 1 || b < 1) ? 1 : 0]; },
  lantern: (u, v) => { const b = ((v % 4) + 4) % 4; return [0, b < .6 ? -1 : 0]; },
  plain: () => [0, 0],
  speckle: (u, v) => [0, ((Math.sin(u * 12.9898 + v * 78.233) * 43758.5453) % 1 + 1) % 1 > .92 ? 1 : 0],
  target: (u, v) => { const d = Math.hypot(u - .5, v - .55); return [d < .08 ? 1 : d < .16 ? 0 : d < .24 ? 1 : 0, 0]; },
  foam: (u, v) => [0, Math.sin(u * 1.3 + Math.sin(v * .7) * 2) > .6 ? 1 : 0]
};
TC.PAT = P;

/* ---- the game's materials ---- */
function M(id, spec) { return def('material', id, spec); }
// engine materials straight through
for (const id of ['planks', 'crate', 'brick', 'cobble', 'stone', 'iron', 'steel', 'rusted', 'plaster', 'timber', 'slate', 'sand', 'rock', 'tiles', 'metal', 'oak', 'walnut', 'gold', 'copper', 'leather', 'burlap', 'linen', 'bark', 'needles', 'leaves', 'moss', 'straw', 'glazed', 'porcelain', 'marble', 'granite', 'flagstone', 'shingle', 'wood', 'plank', 'bronze', 'linen', 'wool', 'velvet', 'shrub', 'hedge', 'grass', 'dirt', 'snow', 'mud', 'ice', 'crystal', 'bone', 'clay', 'sandstone', 'birch', 'ruin', 'block', 'bonus', 'ground', 'pipe', 'checker', 'speckle', 'plain', 'slab'])
  if (E.MATERIALS[id]) M(id, { m: id });
for (const id of Object.keys(E.MATERIALS)) if (id.startsWith('tc-')) M(id.slice(3), { m: id });
M('flame', { m: 'flame', glow: 1 });
M('water', { m: 'water', water: true });
// our own
M('corr-red', { colors: ['#9a3a32'], pat: P.corrugated });
M('corr-blue', { colors: ['#2e5a8a'], pat: P.corrugated });
M('corr-ochre', { colors: ['#b8862e'], pat: P.corrugated });
M('corr-green', { colors: ['#3a6a4a'], pat: P.corrugated });
M('corr-grey', { colors: ['#6a707a'], pat: P.corrugated });
M('corr-white', { colors: ['#b8bcc4'], pat: P.corrugated });
M('hazard', { colors: ['#f2c12e', '#1b1b1b'], pat: P.hazard });
M('awning-red', { colors: ['#c83a3a', '#e8e0d0'], pat: P.stripesV(3), double: true });
M('awning-blue', { colors: ['#2e64b0', '#e8e0d0'], pat: P.stripesV(3), double: true });
M('awning-green', { colors: ['#2e8a5a', '#e8e0d0'], pat: P.stripesV(3), double: true });
M('lighthouse', { colors: ['#e8e4dc', '#b02a2a'], pat: P.stripesH(24) });
M('grate', { colors: ['#5a606a'], pat: P.grate, alpha: true, double: true });
M('net', { colors: ['#8a7a5a'], pat: P.net, alpha: true, double: true });
M('city-windows', { colors: ['#20283a', '#ffd88a'], pat: P.windows, glowIdx: 1 });
M('tower-windows', { colors: ['#2a2e3e', '#a8f0ff'], pat: P.windows, glowIdx: 1 });
M('panel-steel', { colors: ['#6e7684'], pat: P.panel });
M('panel-dark', { colors: ['#3a404c'], pat: P.panel });
M('paper-lantern', { colors: ['#ffb347'], pat: P.lantern, glow: 1, double: true });
M('lantern-red', { colors: ['#ff5a4a'], pat: P.lantern, glow: 1, double: true });
M('glow-red', { colors: ['#ff5a5a'], pat: P.plain, glow: 1 });
M('glow-yellow', { colors: ['#ffd34a'], pat: P.plain, glow: 1 });
M('glow-cyan', { colors: ['#5ad1ff'], pat: P.plain, glow: 1 });
M('glow-green', { colors: ['#8aff8a'], pat: P.plain, glow: 1 });
M('glow-white', { colors: ['#fff6e0'], pat: P.plain, glow: 1 });
M('glow-teal', { colors: ['#43f0c8'], pat: P.panel, glow: 1 });
M('glow-amber', { colors: ['#ffb04a'], pat: P.plain, glow: 1 });
M('glow-magenta', { colors: ['#ff4ad1'], pat: P.plain, glow: 1 });
M('glass-lit', { colors: ['#ffd88a'], pat: P.panel, glow: 1 });
M('glass', { colors: ['#9ad0e8'], pat: (u, v) => { const d = ((u * .7 + v) % 9 + 9) % 9; return d < .9 ? [0, 1] : d < 1.4 ? [0, 0] : null; }, alpha: true, double: true });
M('lens', { colors: ['#fff4c0'], pat: P.panel, glow: 1, double: true });
M('screen', { colors: ['#1a2a4a'], pat: P.plain, glow: 1, canvas: true });
M('sign', { colors: ['#e8dcc0'], pat: P.plain, canvas: true });
M('foam', { colors: ['#e8f4f8'], pat: P.foam, glow: .6 });
M('target', { colors: ['#e8dcc0', '#c83a3a'], pat: P.target, face: true });
M('sea-night', { colors: ['#14304a'], pat: P.plain, water: true, sparkle: '#ffd890' });
M('sea-storm', { colors: ['#2a4448'], pat: P.plain, water: true, sparkle: '#c8e0e0' });
M('sea-dawn', { colors: ['#2a6a7a'], pat: P.plain, water: true, sparkle: '#ffe0b0' });
M('canal', { colors: ['#1e3a4a'], pat: P.plain, water: true, sparkle: '#ffc070' });
M('sluice', { colors: ['#3a7a8a'], pat: P.foam, water: true, sparkle: '#ffffff', flow: 60 });

/* ---- the texture bank (built once, lazily, per material: 5 bands, lid variants) ---- */
const BANK = new Map();
function buildTile(spec, band, lid) {
  const n = TEX_N, out = new Uint32Array(n * n);
  if (spec.m) {
    const t = E.materialTile(spec.m, { size: n / TEX_PX, px: TEX_PX, band, lid: !!lid });
    if (!t) return out.fill(pack(255, 0, 255));
    for (let i = 0; i < n * n; i++) out[i] = pack(t.rgba[i * 4], t.rgba[i * 4 + 1], t.rgba[i * 4 + 2]);
    return out;
  }
  const ramps = spec._ramps || (spec._ramps = spec.colors.map(rampOf));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = spec.face ? (x + .5) / n : (x + .5) / TEX_PX, v = spec.face ? (n - 1 - y + .5) / n : (n - 1 - y + .5) / TEX_PX, r = spec.pat(u, v);
    if (!r) { out[y * n + x] = 0; continue; }
    const ramp = ramps[r[0]] || ramps[0], glowI = spec.glowIdx === r[0];
    const k = clamp((glowI ? 4 : band) + r[1], 0, 4), c = ramp[k];
    out[y * n + x] = pack(c[0], c[1], c[2]);
  }
  return out;
}
function texOf(id) {
  let T = BANK.get(id); if (T) return T;
  const spec = reg('material', id) || reg('material', 'plaster');
  T = { id, spec, n: TEX_N, mask: TEX_MASK, bands: [], lid: [], glow: spec.glow || 0, water: !!spec.water, alpha: !!spec.alpha, double: !!spec.double, face: !!spec.face || id === 'crate', canvas: !!spec.canvas };
  for (let b = 0; b < 5; b++) { T.bands[b] = buildTile(spec, b, false); T.lid[b] = spec.m ? buildTile(spec, b, true) : T.bands[b]; }
  if (T.water) { T.ramp = rampOf(spec.colors ? spec.colors[0] : '#2f7fd0').map(c => pack(c[0], c[1], c[2])); T.sparkle = hexRGB(spec.sparkle || '#ffffff'); T.flow = spec.flow || 0; }
  BANK.set(id, T); return T;
}
TC.texOf = texOf; TC.BANK = BANK;
/** replace a canvas material's tile with pixels from a canvas (signs, live broadcast screens); browser only */
function texFromCanvas(id, cv) {
  const T = texOf(id), n = TEX_N, g = cv.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, cv.width, cv.height).data;
  for (let b = 0; b < 5; b++) {
    const out = T.bands[b], k = T.glow ? 1 : .55 + b * .14;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const sx = Math.floor(x / n * cv.width), sy = Math.floor(y / n * cv.height), j = (sy * cv.width + sx) * 4;
      out[y * n + x] = pack(Math.min(255, d[j] * k), Math.min(255, d[j + 1] * k), Math.min(255, d[j + 2] * k));
    }
    T.lid[b] = out;
  }
}
TC.texFromCanvas = texFromCanvas;
/** a per-instance canvas texture: its own bank entry under a new id (sign texts, screens) */
let _canvasTexN = 0;
function canvasMaterial(base, draw, w = 64, h = 64) {
  const id = base + '#' + (++_canvasTexN), spec = reg('material', base);
  def('material', id, Object.assign({}, spec, { _draw: draw, _w: w, _h: h }));
  return id;
}
TC.canvasMaterial = canvasMaterial;
function refreshCanvasMaterials() {
  if (HEADLESS) return;
  for (const s of regAll('material')) if (s._draw && !s._done) {
    const cv = document.createElement('canvas'); cv.width = s._w; cv.height = s._h; const g = cv.getContext('2d', { willReadFrequently: true });
    E.px.reset && E.px.reset(g); s._draw(g, cv.width, cv.height); s._done = true; s._cv = cv; texFromCanvas(s.id, cv);
  }
}
TC.refreshCanvasMaterials = refreshCanvasMaterials;
