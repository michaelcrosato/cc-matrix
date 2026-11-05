// 22-art.js: the materials. Every texture is painted in code (no image files): a 32 x 32 texel tile per material, built
// once, with a pattern function. The tiles are sampled by the rasterizer (21-raster.js) in five light bands, the engine's
// banded look: the band is picked from the lighting, dithered between bands.
//   base:    the material's colour, '#rrggbb'
//   pat:     the pattern that paints it (see PATTERNS)
//   glow:    emissive (lanterns, screens): ignores the lighting, takes half the fog
//   water:   animated sea surface (scrolls)
TC.def('material', 'concrete', { base: '#7b7f88', pat: 'noise' });
TC.def('material', 'asphalt', { base: '#3c3f47', pat: 'noise' });
TC.def('material', 'stone', { base: '#8a8478', pat: 'stone' });
TC.def('material', 'dock', { base: '#6b4a2e', pat: 'planks' });
TC.def('material', 'hut', { base: '#5c4a38', pat: 'planks' });
TC.def('material', 'brick', { base: '#8c4a3a', pat: 'brick' });
TC.def('material', 'steel', { base: '#8c96a6', pat: 'bands' });
TC.def('material', 'hull', { base: '#3d4a5e', pat: 'plates' });
TC.def('material', 'sandbag', { base: '#b59b6e', pat: 'lumps' });
TC.def('material', 'crate', { base: '#9a7444', pat: 'crate' });
TC.def('material', 'barrel', { base: '#b34a2a', pat: 'barrel' });
TC.def('material', 'container', { base: '#2f5a7a', pat: 'ribs' });
TC.def('material', 'festival', { base: '#d94a7a', pat: 'stripes' });
TC.def('material', 'lantern', { base: '#ffb24a', pat: 'glow', glow: true });
TC.def('material', 'glass', { base: '#7fd0ff', pat: 'grid', glow: true });
TC.def('material', 'water', { base: '#1b3f6b', pat: 'sea', water: true });
TC.def('material', 'lamp', { base: '#ffe9a0', pat: 'glow', glow: true });
TC.def('material', 'sky', { base: '#0b1030', pat: 'noise' });

// A tiny deterministic hash for the texel patterns (not the sim's RNG: textures are cosmetic and never change).
TC.texHash = function (x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// Pattern functions: (x, y) texel in 0..31 -> a brightness factor 0.55..1.2 (multiplied into the base colour).
TC.PATTERNS = {
  noise: (x, y) => 0.8 + 0.4 * TC.texHash(x, y, 1),
  stone: (x, y) => 0.75 + 0.35 * TC.texHash(x >> 1, y >> 1, 2) + (y % 11 === 0 ? -0.2 : 0),
  planks: (x, y) => ((y >> 3) % 2 ? 1.0 : 0.88) * (y % 8 === 0 || x % 16 === 0 ? 0.6 : 1) * (0.92 + 0.12 * TC.texHash(x, y >> 3, 3)),
  brick: (x, y) => { const row = y >> 3, off = (row % 2) * 8; const mx = (x + off) % 16; return (y % 8 === 0 || mx === 0) ? 0.6 : 0.95 + 0.1 * TC.texHash(x, y, 4); },
  bands: (x, y) => (x % 8 === 0 ? 0.7 : 0.95 + 0.15 * TC.texHash(x >> 2, 0, 5)) * (y % 16 === 0 ? 0.8 : 1),
  plates: (x, y) => ((x % 16 === 0 || y % 16 === 0) ? 0.6 : 0.9 + 0.1 * TC.texHash(x, y, 6)) * ((x === 4 && y === 4) || (x === 12 && y === 12) ? 1.3 : 1),
  lumps: (x, y) => 0.8 + 0.3 * TC.texHash(x >> 1, y >> 1, 7) + (TC.texHash(x, y, 8) < 0.06 ? -0.2 : 0),
  crate: (x, y) => ((y >> 2) % 2 ? 1 : 0.9) * (x === y || x + y === 31 ? 0.62 : 1) * (x % 16 === 0 || y % 16 === 0 ? 0.7 : 1) * (0.94 + 0.1 * TC.texHash(x, y, 9)),
  barrel: (x, y) => (y % 10 < 2 ? 0.6 : 1) * (0.9 + 0.2 * TC.texHash(x >> 1, y >> 1, 10)),
  ribs: (x, y) => (x % 8 < 2 ? 0.7 : 1.05) * (0.95 + 0.1 * TC.texHash(x, 0, 11)),
  stripes: (x, y) => ((x >> 3) % 2 ? 1.05 : 0.8),
  glow: (x, y) => 0.9 + 0.3 * TC.texHash(x >> 1, y >> 1, 12),
  grid: (x, y) => (x % 8 === 0 || y % 8 === 0 ? 0.6 : 1.05),
  sea: (x, y) => 0.7 + 0.5 * TC.texHash(x, y, 13),
};

// Hex colour to [r, g, b].
TC.hex = function (h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// The five light bands: each band multiplies the texel. Band 4 is full light; band 0 is the shadow.
TC.BANDS = [0.34, 0.5, 0.68, 0.84, 1.0];

// Build a material's tiles: 32 x 32 per band, as 32-bit colours (little-endian ABGR for ImageData). Built on first use.
TC.tile = function (id) {
  TC.tiles = TC.tiles || {};
  if (TC.tiles[id]) return TC.tiles[id];
  const m = TC.get('material', id);
  const [br, bg, bb] = TC.hex(m.base);
  const pat = TC.PATTERNS[m.pat] || TC.PATTERNS.noise;
  const size = 32;
  const bands = TC.BANDS.map(bf => {
    const out = new Uint32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const k = pat(x, y) * bf;
        const r = Math.min(255, br * k) | 0, g = Math.min(255, bg * k) | 0, b = Math.min(255, bb * k) | 0;
        out[y * size + x] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
    }
    return out;
  });
  TC.tiles[id] = { size, bands, glow: !!m.glow, water: !!m.water, id };
  return TC.tiles[id];
};
