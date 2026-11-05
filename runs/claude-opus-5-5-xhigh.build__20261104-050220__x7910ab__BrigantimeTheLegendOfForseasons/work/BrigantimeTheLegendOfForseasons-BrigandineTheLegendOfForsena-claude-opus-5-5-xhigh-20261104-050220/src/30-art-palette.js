// PALETTES AND GROUND TEXTURES: realm and season palettes, and the per-pixel ground of every terrain code by season
// and region (the battlefield and the continent bake their floors from these through a TileMap's floorTex).

const hexc = E.hex, noise = E.noise2;
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
G.mixc = mixc; G.mulc = mul;

G.PAL = {
  spring: { grass: '#6abf4b', grass2: '#9ad86a', dark: '#3e8a3a', blossom: '#f4b8d0', sky: ['#7ac0f0', '#a8d8f0', '#e8f4ff'], water: '#4a9ad8', ambient: .8, light: '#e8ffe8', tree: '#f4b8d0 foliage' },
  summer: { grass: '#c8b060', grass2: '#e8d080', dark: '#9a8040', blossom: '#ffd040', sky: ['#f0b860', '#f0d890', '#fff4d0'], water: '#3a8ac8', ambient: .95, light: '#fff0c8', tree: '#5a9a3a foliage' },
  autumn: { grass: '#b8883a', grass2: '#d8a050', dark: '#7a5020', blossom: '#e05a2a', sky: ['#c8784a', '#e8b878', '#f8e0b8'], water: '#3a7aa8', ambient: .7, light: '#ffd8a0', tree: '#d8782a foliage' },
  winter: { grass: '#a8b8a0', grass2: '#e8f0f8', dark: '#8aa8c8', blossom: '#ffffff', sky: ['#7a90b8', '#b8c8e0', '#e8f0f8'], water: '#3a6a98', ambient: .65, light: '#c8dcff', tree: '#e8f0f8 foliage' },
  hour: { grass: '#5a5a66', grass2: '#7a7a86', dark: '#3a3a46', blossom: '#d8c070', sky: ['#14121c', '#2a2836', '#4a4656'], water: '#2a3a5a', ambient: .45, light: '#ffe0a0', tree: '#4a4a56 foliage' }
};
/** region ground colours (the land's own look, before the season tints it) */
G.REGION = {
  spring: { base: '#5aae46', dark: '#3e8a3a', light: '#8ad06a', road: '#a88a5a', rock: '#8a8a7a', trees: 'tree' },
  summer: { base: '#c8a85a', dark: '#a8803a', light: '#e8c878', road: '#d8b878', rock: '#c84a2a', trees: 'palm' },
  autumn: { base: '#a8883a', dark: '#7a5a28', light: '#c8a050', road: '#8a6a40', rock: '#7a6a5a', trees: 'tree' },
  winter: { base: '#8aa098', dark: '#5a7a70', light: '#b8c8c0', road: '#9a9a90', rock: '#8a90a0', trees: 'pine' },
  hour: { base: '#5a5a66', dark: '#3a3a46', light: '#8a8a96', road: '#7a7a86', rock: '#4a4a56', trees: 'crystal' },
  neutral: { base: '#7a9a5a', dark: '#5a7a40', light: '#9ab878', road: '#a08860', rock: '#8a8478', trees: 'tree' }
};
G.regionKey = region => (G.CROSS[region] ? G.CROSS[region][0] : G.REGION[region] ? region : 'neutral');

/** the ground colour [r, g, b] of a terrain code at world point (x, y), in a season and region; e = the hex's edge
 *  distance (0 at the edge), hc = the hex's own random 0..1 */
G.groundColor = (code, x, y, season, region, e = 10, hc = .5) => {
  const R = G.REGION[G.regionKey(region)], P = G.PAL[season] || G.PAL.spring;
  const n = noise(x * .08, y * .08) * .6 + noise(x * .25, y * .25) * .4, sp = h2(Math.floor(x), Math.floor(y));
  const grassy = () => {
    let base = hexc(R.base), dk = hexc(R.dark), lt = hexc(R.light);
    const tint = hexc(P.grass), k = region === 'hour' ? .15 : .45;
    base = mixc(base, tint, k); dk = mixc(dk, hexc(P.dark), k); lt = mixc(lt, hexc(P.grass2), k);
    let c = n > .64 ? dk : n < .32 ? lt : base;
    if (sp > .985) c = hexc(season === 'spring' ? P.blossom : season === 'autumn' ? '#e07a2a' : season === 'summer' ? '#f0e090' : '#ffffff');
    return c;
  };
  switch (code) {
    case '.': case '?': return grassy();
    case ',': { const c = hexc(R.road); return mul(c, n > .6 ? .88 : n < .3 ? 1.08 : 1); }
    case 'f': { const c = mul(grassy(), .72); return sp > .92 ? hexc(season === 'autumn' ? '#c85a1e' : season === 'spring' ? '#f4b8d0' : '#3a5a2a') : c; }
    case 'h': { const c = grassy(), k = e < 4 ? .8 : 1 + Math.min(.12, e / 120); return mul(c, k); }
    case 'm': { const c = hexc(R.rock), k = n > .6 ? .78 : n < .3 ? 1.15 : .95; return mul(c, k * (e < 3 ? .8 : 1)); }
    case '~': { const c = hexc('#5aa8d8'); return mul(mixc(c, hexc(P.water), .4), n > .55 ? 1.1 : .95); }
    case 'w': case 'L': { const c = hexc(P.water); const w = Math.sin(x * .3 + Math.sin(y * .2) * 2 + y * .05); return w > .92 ? mixc(c, [220, 240, 255], .5) : mul(c, n > .5 ? 1 : .85); }
    case 's': { const c = hexc('#5a6a3a'); return sp > .8 ? hexc('#3a4a3a') : mul(c, n > .55 ? .85 : 1.05); }
    case 'F': case 'W': { const row = Math.floor(y / 3) % 2; const c = hexc(code === 'W' ? '#e0c050' : season === 'spring' ? '#7ac050' : '#c8b050'); return mul(c, row ? .88 : 1.05); }
    case 't': { const c = hexc('#b89050'); return sp > .9 ? hexc('#e8c070') : mul(c, n > .5 ? .9 : 1); }
    case 'r': case '#': { return E.tex.flagstone(x, y, { stones: ['#7a7a72', '#8a8a80', '#6a6a62'].map(hexc), mortar: hexc('#3a3a36'), hi: hexc('#9a9a90'), lo: hexc('#4a4a44'), speck: hexc('#5a5a52') }, 9).map((v, i) => sp > .97 ? [90, 110, 60][i] : v); }
    case 'g': case 'K': { const pal = region === 'hour' ? { stones: ['#5a5a66', '#6a6a76', '#4e4e5a'].map(hexc), mortar: hexc('#2a2a36'), hi: hexc('#8a8a96'), lo: hexc('#3a3a46'), speck: hexc('#d8c070') } : { stones: ['#9a9488', '#a8a294', '#8a8478'].map(hexc), mortar: hexc('#4a4640'), hi: hexc('#c8c2b4'), lo: hexc('#6a6458'), speck: hexc('#7a746a') }; return E.tex.flagstone(x, y, pal, 10); }
    case 'b': { return E.tex.planks(y, x, { base: '#9d6a3f', dark: '#7a4a28', line: '#4a2e1c' }); }
    case 'D': { const lit = false; return mul(hexc('#b89a50'), e < 4 ? .7 : 1); }
    case 'n': { const c = hexc('#e8f0f8'), sh = hexc('#a8c0d8'); return n > .66 ? sh : n < .3 ? [255, 255, 255] : c; }
    case 'i': { const c = hexc('#a8e0f0'); const crack = Math.abs(Math.sin(x * .21 + y * .13) * Math.cos(x * .07 - y * .19)) < .03; return crack ? hexc('#e8fcff') : mul(c, n > .6 ? .9 : 1.05); }
    case 'B': { return sp > .9 ? hexc('#ff8a20') : sp > .8 ? hexc('#c83a10') : mul(hexc('#3a2a20'), n > .5 ? 1 : .8); }
    case 'a': { return mul(hexc('#6a6662'), n > .55 ? .85 : 1.05); }
    case 'd': { const crack = Math.abs(Math.sin(x * .4) + Math.sin(y * .37)) < .08; return crack ? hexc('#5a4030') : mul(hexc('#a08060'), n > .5 ? .92 : 1.04); }
  }
  return grassy();
};
/** the lighting ambient of a battle by season (Hour places are dark: brass lamps and the clock light them) */
G.ambientFor = (season, region) => (region === 'hour' ? G.PAL.hour.ambient : (G.PAL[season] || G.PAL.spring).ambient);
/** the weather of a season (Reduce motion halves it) */
G.weatherFor = (season, reduce) => {
  const k = reduce ? .5 : 1;
  switch (season) {
    case 'spring': return { kind: 'petals', amount: .35 * k, wind: .15 };
    case 'summer': return { kind: 'sand', amount: .1 * k, wind: .2 };
    case 'autumn': return { kind: 'leaves', amount: .5 * k, wind: .4 };
    case 'winter': return { kind: 'snow', amount: .6 * k, wind: .1 };
  }
  return null;
};
