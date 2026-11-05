/* 14-world-art: the resort's look. Time-of-day presets (sky, sea, light), a sky painter that meets the map's far edge,
 * the court map (sea, wet sand, sand, rope lines), resort shapes (E.SHAPES, per docs/ASSETS.md), the crowd, the court's
 * set dressing and effects helpers (hearts, confetti, fireworks, coin showers, sweat, the glare star). */
G.TOD = {
  morning: { sky: ['#6cb8e8', '#a8dcf0', '#f8e4c8'], sea: ['#1e8aa8', '#2ec4c9', '#9ff3e8'], ambient: .9, dark: [70, 90, 140], sun: { x: .22, y: .2, r: 13, color: '#fff4d0' }, clouds: '#ffffff', isle: '#3a8a8a', sand: 1 },
  afternoon: { sky: ['#2a8ee0', '#78c8f0', '#d0f0f8'], sea: ['#0b5a7a', '#2ec4c9', '#9ff3e8'], ambient: 1, dark: [60, 70, 110], sun: { x: .78, y: .14, r: 12, color: '#ffffe8' }, clouds: '#ffffff', isle: '#2f7a78', sand: 1.03 },
  sunset: { sky: ['#3a2a70', '#c84a7a', '#ff8a5e', '#ffd090'], sea: ['#3a2a60', '#c86a6a', '#ffb880'], ambient: .82, dark: [120, 60, 90], sun: { x: .68, y: .62, r: 18, color: '#ffd86a' }, clouds: '#ffb0a0', isle: '#4a2a5a', sand: .95, warm: true },
  night: { sky: ['#06081c', '#10143a', '#24285a'], sea: ['#060a24', '#0e2040', '#1e3a5a'], ambient: .38, dark: [20, 24, 60], moon: { x: .76, y: .16, r: 9, color: '#f4f0d8' }, clouds: '#3a3a6a', isle: '#0c1028', sand: .55, stars: true },
  rain: { sky: ['#4a5868', '#7a8898', '#a8b4c0'], sea: ['#2a4a5a', '#4a7a88', '#8ab0b8'], ambient: .72, dark: [60, 70, 90], clouds: '#8a96a4', isle: '#3a4a50', sand: .85, overcast: true },
  cloudy: { sky: ['#6a90b0', '#a0c0d4', '#dce8ec'], sea: ['#1e6a88', '#3ab0b8', '#a0e0e0'], ambient: .88, dark: [70, 80, 110], sun: { x: .3, y: .18, r: 10, color: '#f8f8f0' }, clouds: '#f0f4f8', isle: '#3a7a80', sand: .95, overcast: true }
};
/** which look a slot and weather give */
G.todFor = (slot, weather, day) => slot === 2 ? 'night' : weather === 'rain' ? 'rain' : weather === 'golden' && slot === 1 ? 'sunset' : weather === 'cloudy' ? 'cloudy' : slot === 0 ? 'morning' : 'afternoon';
G.applyLight = (tod, o = {}) => {
  const P = G.TOD[tod] || G.TOD.afternoon, L = G.game.lights;
  L.enabled = true; L.ambient = o.ambient !== undefined ? o.ambient : P.ambient; L.dark = P.dark.slice(); L.tint = P.warm ? .45 : .32;
  if (L.refresh) L.refresh();
  G.curTod = tod;
};
/** the sky, sun or moon, clouds, distant islands, the volcano's silhouette and a strip of far sea down to the horizon
 *  (the screen y where the map's far edge is drawn); stars, the moon and a lit yacht at night */
G.drawSky = (r, tod, horizon, o = {}) => {
  if (!r.ctx) return;
  G.paintSky(r.ctx, r.bw || r.W + 2, r.bh || r.H + 2, tod, horizon === undefined ? Math.round(r.H * .45) : horizon, G.now(), o);
};
/* the painter itself, on the buffer's context (buffer pixels; hz: the horizon row) */
G.paintSky = (g, W, H, tod, hz, t, o = {}) => {
  const P = G.TOD[tod] || G.TOD.afternoon;
  // gradient bands
  const cs = P.sky, n = cs.length - 1, top = 0, bot = Math.max(10, hz - 10);
  for (let y = top; y < bot; y += 2) { const k = (y - top) / (bot - top) * n, i = Math.min(n - 1, Math.floor(k)); px.rect(g, 0, y, W, 2, E.mix(cs[i], cs[i + 1], k - i)); }
  if (P.stars) { const rr = E.rng(7); for (let i = 0; i < 90; i++) { const x = Math.floor(rr() * W), y = Math.floor(rr() * (bot - 6)), tw = (Math.sin(t * 2 + i * 1.7) + 1) / 2; px.dot(g, x, y, tw > .6 ? '#ffffff' : '#8a90c8'); } }
  const S = P.sun || P.moon;
  if (S) {
    const sx = Math.round(W * S.x), sy = Math.round(bot * S.y / .7);
    if (P.sun) { px.blend(g, .25, 'add', () => px.disc(g, sx, sy, S.r * 2.2, S.color)); px.blend(g, .35, 'add', () => px.disc(g, sx, sy, S.r * 1.4, S.color)); }
    px.disc(g, sx, sy, S.r, S.color); px.disc(g, sx - 1, sy - 1, S.r - 2, E.shade(S.color, .25));
    if (P.moon) { px.disc(g, sx + 3, sy - 2, S.r - 1, cs[0]); px.blend(g, .2, 'add', () => px.disc(g, sx, sy, S.r * 2, '#a0a8ff')); }
  }
  // clouds drifting
  const cc = P.clouds, rr = E.rng(11), nC = P.overcast ? 9 : 5;
  for (let i = 0; i < nC; i++) {
    const base = rr() * (W + 120), x = ((base + t * (3 + rr() * 4)) % (W + 120)) - 60, y = 8 + rr() * (bot * .45), s = .7 + rr() * .8;
    px.blend(g, P.overcast ? .85 : .7, 'normal', () => { for (const [dx, dy, rad] of [[0, 0, 8], [9, -3, 10], [19, 0, 8], [10, 3, 9]]) px.ell(g, x + dx * s, y + dy * s, rad * s * 1.4, rad * s * .7, cc); });
    px.blend(g, .3, 'normal', () => px.ell(g, x + 10 * s, y + 4 * s, 22 * s, 3 * s, E.shade(cc, -.25)));
  }
  // distant islands and the volcano
  const isle = P.isle, iy = hz - 10;
  px.poly(g, [[W * .05, iy], [W * .1, iy - 7], [W * .16, iy - 9], [W * .22, iy - 4], [W * .26, iy]], isle);
  px.poly(g, [[W * .58, iy], [W * .66, iy - 16], [W * .7, iy - 22], [W * .72, iy - 22], [W * .77, iy - 14], [W * .86, iy]], E.shade(isle, -.12));
  px.poly(g, [[W * .69, iy - 22], [W * .705, iy - 25], [W * .73, iy - 22]], E.shade(isle, -.25));
  if (!P.stars) for (let i = 0; i < 3; i++) { const k = (t * .3 + i * .33) % 1; px.blend(g, .4 * (1 - k), 'normal', () => px.disc(g, W * .71 + k * 6, iy - 26 - k * 14, 2 + k * 3, '#e8e8f0')); }
  px.poly(g, [[W * .88, iy], [W * .92, iy - 5], [W * .97, iy - 3], [W, iy]], isle);
  // the far sea down to the horizon, with glints
  const sc = P.sea;
  for (let y = iy; y < hz + 2; y++) { const k = (y - iy) / Math.max(1, hz - iy); px.rect(g, 0, y, W, 1, E.mix(sc[0], sc[1], k * .6)); }
  const gr = E.rng(23);
  for (let i = 0; i < 24; i++) { const x = (gr() * W + t * 6 * (gr() + .2)) % W, y = iy + 1 + gr() * (hz - iy); if ((Math.sin(t * 3 + i) + 1) / 2 > .5) px.rect(g, x, y, 2 + (i % 3), 1, P.stars ? '#6a80c0' : E.shade(sc[2], .2)); }
  if (P.stars && o.yacht !== false) { const x = W * .3 + Math.sin(t * .05) * 10, y = iy + 2; px.rect(g, x, y, 18, 2, '#1a1a2a'); px.rect(g, x + 4, y - 3, 9, 3, '#2a2a3a'); for (let k = 0; k < 4; k++) px.dot(g, x + 5 + k * 2, y - 2, '#ffe08a'); px.dot(g, x + 9, y - 8, '#ff5fa2'); px.line(g, x + 9, y - 3, x + 9, y - 8, '#3a3a4a'); }
};

/* ---- materials ---- */
const MAT = (name, spec) => { E.MATERIALS[name] = spec; return name; };
G.mat = (hex, pattern = 'none', extra = {}) => { const n = 'aoa' + hex.slice(1) + pattern; if (!E.MATERIALS[n]) MAT(n, Object.assign({ color: hex, pattern }, extra)); return n; };
MAT('aoa_sand', { color: '#e8cc94', pattern: 'speck', amount: .1 });
MAT('aoa_boardwalk', { color: '#d8c8a8', pattern: 'planks', bw: 3, len: 18 });
MAT('aoa_pooltile', { color: '#7ad8e0', pattern: 'tiles', size: 4 });
MAT('aoa_felt', { color: '#1e7a4a', pattern: 'cloth' });
MAT('aoa_carpet', { color: '#5a1a3a', pattern: 'cloth' });
MAT('aoa_gold', { color: '#ffd36a', pattern: 'metal' });
MAT('aoa_thatch', { color: '#c8a050', pattern: 'thatch' });
MAT('aoa_white', { color: '#f0f0ea', pattern: 'none' });
MAT('aoa_chrome', { color: '#c8ccd8', pattern: 'metal' });
MAT('aoa_neon', { color: '#ff5fa2', pattern: 'none', glow: 1 });
MAT('aoa_neonc', { color: '#5ff0ff', pattern: 'none', glow: 1 });
MAT('aoa_glow', { color: '#ffe8a0', pattern: 'none', glow: 1 });
MAT('aoa_dark', { color: '#2a2434', pattern: 'none' });
MAT('aoa_black', { color: '#141018', pattern: 'none' });
MAT('aoa_red', { color: '#d8302a', pattern: 'cloth' });
MAT('aoa_navy', { color: '#1d2433', pattern: 'cloth' });
MAT('aoa_rope', { color: '#c8a070', pattern: 'none' });

/* ---- resort shapes (feet on the point, written facing south) ---- */
const S = E.SHAPES;
S.umbrella = { about: 'beach umbrella, striped canopy', tags: 'beach', params: { color: '#ff5f7a', stripe: '#ffffff' }, make: p => [['cyl', 'aoa_white', [0, 0, 0], .8, 30], ['cyl', G.mat(p.color, 'cloth'), [0, 0, 26], 15, 4, { r2: 2, seg: 8 }], ['cyl', G.mat(p.stripe, 'cloth'), [0, 0, 29], 6, 2, { r2: 1, seg: 8 }], ['ball', 'aoa_white', [0, 0, 31.5], 1.2]] };
S.lounger = { about: 'sun lounger', tags: 'beach', params: { color: '#2ec4c9' }, make: p => [['box', 'aoa_white', [0, 0, 3], [10, 26, 2]], ['mirror', 'xy', ['box', 'aoa_white', [4, 11, 0], [1.5, 1.5, 3]]], ['box', G.mat(p.color, 'cloth'), [0, 2, 5], [9, 20, 1]], ['box', G.mat(p.color, 'cloth'), [0, -11, 5], [9, 6, 8], { rot: [-35, 0, 0] }]] };
S.beachtowel = { about: 'beach towel', tags: 'beach', params: { color: '#ff9e5e', stripe: '#ffffff' }, make: p => [['box', G.mat(p.color, 'cloth'), [0, 0, 0], [12, 24, .6]], ['box', G.mat(p.stripe, 'cloth'), [0, -6, 0], [12, 3, .8]], ['box', G.mat(p.stripe, 'cloth'), [0, 6, 0], [12, 3, .8]]] };
S.cooler = { about: 'cooler box', tags: 'beach', mats: { b: G.mat('#2a8ad8', 'glaze'), l: 'aoa_white' }, parts: [['box', 'b', [0, 0, 0], [10, 7, 7]], ['box', 'l', [0, 0, 7], [10.5, 7.5, 1.5]], ['box', 'aoa_dark', [0, 0, 8.5], [5, 1, 1]]] };
S.sandcastle = { about: 'sandcastle', tags: 'beach', parts: [['box', 'aoa_sand', [0, 0, 0], [12, 12, 4]], ['mirror', 'xy', ['cyl', 'aoa_sand', [4.5, 4.5, 4], 2.2, 5, { seg: 6 }]], ['cyl', 'aoa_sand', [0, 0, 4], 3, 8, { seg: 6 }], ['cyl', 'aoa_red', [0, 0, 12], .3, 4], ['box', 'aoa_red', [1, 0, 14.5], [2, .3, 1.5]]] };
S.surfboard = { about: 'surfboard standing in the sand', tags: 'beach', params: { color: '#ffd04a' }, make: p => [['cyl', G.mat(p.color, 'glaze'), [0, 0, 0], 3, 30, { sq: .3, seg: 10 }], ['box', 'aoa_white', [0, 1, 4], [.6, .5, 24]]] };
S.surfrack = { about: 'surfboard rack', tags: 'beach', parts: [['mirror', 'x', ['box', 'oak', [10, 0, 0], [2, 2, 16]]], ['box', 'oak', [0, 0, 14], [22, 2, 2]], ['box', G.mat('#ff5f7a', 'glaze'), [-6, 2, 0], [5, 1.5, 26]], ['box', G.mat('#2ec4c9', 'glaze'), [0, 2, 0], [5, 1.5, 28]], ['box', G.mat('#ffd04a', 'glaze'), [6, 2, 0], [5, 1.5, 24]]] };
S.lifeguard = { about: 'lifeguard tower', tags: 'beach', mats: { w: 'aoa_white', r: 'aoa_red' }, parts: [['mirror', 'xy', ['box', 'w', [6, 6, 0], [2, 2, 22]]], ['box', 'w', [0, 0, 22], [16, 16, 2]], ['box', 'r', [0, 0, 24], [14, 14, 10]], ['box', 'aoa_dark', [0, 7.2, 27], [8, .5, 5]], ['cyl', 'w', [0, 0, 34], 11, 5, { r2: 1, seg: 4 }], ['wedge', 'w', [0, 12, 0], [6, 8, 22]]] };
S.bleacher = { about: 'three-tier bleachers', tags: 'beach stadium', params: { len: 48, color: '#2ec4c9' }, make: p => [['box', 'aoa_white', [0, 8, 0], [p.len, 8, 6]], ['box', G.mat(p.color, 'planks'), [0, 8, 6], [p.len, 8, 1]], ['box', 'aoa_white', [0, 0, 0], [p.len, 8, 12]], ['box', G.mat(p.color, 'planks'), [0, 0, 12], [p.len, 8, 1]], ['box', 'aoa_white', [0, -8, 0], [p.len, 8, 18]], ['box', G.mat(p.color, 'planks'), [0, -8, 18], [p.len, 8, 1]]] };
S.scoreboard = { about: 'flip scoreboard on a stand', tags: 'beach stadium', parts: [['mirror', 'x', ['box', 'aoa_white', [9, 0, 0], [1.5, 1.5, 14]]], ['box', G.mat('#1a3a5a', 'none'), [0, 0, 14], [24, 2, 14]], ['box', 'aoa_gold', [0, 0, 28], [24, 2.4, 1.5]]] };
S.djbooth = { about: "Sonny's DJ booth: speakers and a gold disc", tags: 'beach party', parts: [['box', G.mat('#16141c', 'none'), [0, 0, 0], [26, 10, 14]], ['box', 'aoa_gold', [0, 5.2, 4], [24, .5, 2]], ['mirror', 'x', ['box', 'aoa_black', [17, 0, 0], [8, 8, 20]]], ['mirror', 'x', ['cyl', 'aoa_chrome', [17, 4.2, 12], 2.6, 1, { seg: 10 }]], ['cyl', 'aoa_gold', [0, 0, 14], 5, 1, { seg: 12 }], ['box', 'aoa_neon', [0, 5.3, 10], [20, .4, 1]]] };
S.netpost = { about: 'volleyball net post with a padded base', tags: 'beach sport', parts: [['cyl', G.mat('#2a6ad8', 'cloth'), [0, 0, 0], 2.6, 10], ['cyl', 'aoa_white', [0, 0, 10], 1.2, 42], ['ball', 'aoa_white', [0, 0, 52], 1.5]] };
S.tikibar = { about: 'tiki bar: a thatch hut with a counter and stools', tags: 'beach bar', parts: [['mirror', 'xy', ['cyl', 'bark', [14, 10, 0], 1.3, 30]], ['cyl', 'aoa_thatch', [0, 0, 28], 26, 12, { r2: 2, seg: 8 }], ['box', 'bark', [0, 10, 0], [30, 5, 13]], ['box', 'oak', [0, 10, 13], [32, 7, 1.5]], ['row', 3, [10, 0, 0], ['cyl', 'oak', [0, 17, 0], 2.5, 9, { seg: 8 }]], ['box', 'aoa_neonc', [0, 12.6, 9], [18, .3, 2]]] };
S.changinghut = { about: 'changing hut with a striped curtain', tags: 'beach', parts: [['box', 'aoa_white', [0, 0, 0], [16, 14, 26]], ['box', G.mat('#ff5f7a', 'cloth'), [0, 7.2, 2], [10, .5, 20]], ['wedge', 'aoa_thatch', [0, 0, 26], [18, 16, 6]], ['box', G.mat('#ffffff', 'cloth'), [-3, 7.4, 2], [2, .5, 20]], ['box', G.mat('#ffffff', 'cloth'), [3, 7.4, 2], [2, .5, 20]]] };
S.cabana = { about: 'pool cabana', tags: 'pool', parts: [['mirror', 'xy', ['box', 'aoa_white', [12, 10, 0], [2, 2, 26]]], ['box', G.mat('#2ec4c9', 'cloth'), [0, 0, 26], [28, 24, 2]], ['wedge', G.mat('#ffffff', 'cloth'), [0, 0, 28], [28, 24, 6]], ['box', 'oak', [0, 6, 0], [22, 6, 12]], ['box', 'aoa_white', [0, 6, 12], [24, 7, 1.5]]] };
S.poolfloat = { about: 'round pool float', tags: 'pool', params: { color: '#ffd04a' }, make: p => [['cyl', G.mat(p.color, 'glaze'), [0, 0, 0], 8, 2.5, { seg: 12 }], ['cyl', G.mat('#3a9ec8', 'none'), [0, 0, .5], 3.5, 2.3, { seg: 10 }]] };
S.flamingo = { about: 'inflatable flamingo', tags: 'pool', mats: { p: G.mat('#ff7ab8', 'glaze') }, parts: [['ball', 'p', [0, 2, 3], 7, { sz: .45 }], ['cyl', 'p', [0, -5, 3], 1.4, 12], ['ball', 'p', [0, -6, 15], 2.4], ['cyl', G.mat('#ffd04a', 'none'), [0, -8.5, 14.5], .8, 1.5, { r2: 0 }]] };
S.pooledge = { about: 'tiled pool coping', tags: 'pool', params: { len: 16 }, make: p => [['box', 'aoa_pooltile', [0, 0, 0], [p.len, 4, 2]]] };
S.deckchair = { about: 'deck chair', tags: 'pool beach', params: { color: '#ff9e5e' }, make: p => [['box', 'oak', [0, 0, 0], [10, 14, 1.5], { rot: [10, 0, 0] }], ['box', G.mat(p.color, 'cloth'), [0, -4, 4], [9, 6, 10], { rot: [-30, 0, 0] }], ['box', G.mat(p.color, 'cloth'), [0, 3, 4], [9, 8, 1]], ['mirror', 'x', ['box', 'oak', [4, 0, 0], [1, 14, 4]]]] };
S.slotmachine = { about: 'slot machine cabinet', tags: 'casino', params: { color: '#e8283a' }, make: p => [['box', G.mat(p.color, 'metal'), [0, 0, 0], [12, 10, 26]], ['box', 'aoa_black', [0, 5.2, 13], [9, .5, 6]], ['box', 'aoa_glow', [0, 5.3, 14], [7, .3, 4]], ['box', 'aoa_gold', [0, 0, 26], [12.5, 10.5, 2]], ['box', 'aoa_neonc', [0, 5.3, 23], [10, .3, 2]], ['cyl', 'aoa_chrome', [7, 0, 16], .6, 8], ['ball', 'aoa_red', [7, 0, 24], 1.4]] };
S.bjtable = { about: 'half-moon blackjack table', tags: 'casino', parts: [['cyl', 'walnut', [0, 0, 0], 4, 12, { seg: 8 }], ['cyl', 'aoa_felt', [0, 0, 12], 22, 2, { seg: 16, sq: .6 }], ['cyl', 'walnut', [0, 0, 11.5], 23, 1, { seg: 16, sq: .62 }]] };
S.roulettetable = { about: 'roulette table with the wheel bowl', tags: 'casino', parts: [['box', 'walnut', [0, 0, 0], [40, 18, 12]], ['box', 'aoa_felt', [0, 0, 12], [38, 16, 1]], ['cyl', 'walnut', [-14, 0, 13], 7, 3, { seg: 16 }], ['cyl', 'aoa_gold', [-14, 0, 14], 4, 2.5, { seg: 12 }]] };
S.cashier = { about: 'cashier cage', tags: 'casino', parts: [['box', 'walnut', [0, 0, 0], [30, 12, 14]], ['box', 'aoa_gold', [0, 0, 14], [30, 12, 1]], ['row', 7, [4.5, 0, 0], ['box', 'aoa_gold', [0, 5, 15], [.6, .6, 16]]], ['box', 'aoa_gold', [0, 5, 31], [30, 1, 1.5]], ['box', 'aoa_neon', [0, 6, 27], [16, .4, 3]]] };
S.neonsign = { about: 'neon sign on a post', tags: 'casino', params: { color: '#ff5fa2' }, make: p => [['cyl', 'aoa_dark', [0, 0, 0], 1, 26], ['box', 'aoa_black', [0, 0, 26], [22, 2, 10]], ['box', p.color === '#5ff0ff' ? 'aoa_neonc' : 'aoa_neon', [0, 1.2, 28], [18, .4, 6]]] };
S.velvetrope = { about: 'velvet rope on brass posts', tags: 'casino', parts: [['mirror', 'x', ['cyl', 'aoa_gold', [10, 0, 0], 1, 14]], ['mirror', 'x', ['ball', 'aoa_gold', [10, 0, 14.5], 1.4]], ['box', G.mat('#a8183a', 'cloth'), [0, 0, 11], [20, 1, 1.4]]] };
S.shopfront = { about: 'shop facade with an awning', tags: 'town shop', params: { color: '#ff8aa8' }, make: p => [['box', 'aoa_white', [0, 0, 0], [52, 10, 40]], ['box', G.mat(p.color, 'cloth'), [0, 9, 26], [54, 10, 2], { rot: [18, 0, 0] }], ['box', G.mat('#9fd8f0', 'glaze'), [-14, 5.2, 6], [16, .5, 16]], ['box', G.mat('#9fd8f0', 'glaze'), [14, 5.2, 6], [16, .5, 16]], ['box', 'walnut', [0, 5.3, 0], [10, .6, 22]], ['box', G.mat(p.color, 'none'), [0, 5.4, 32], [30, .5, 6]]] };
S.icecreamcart = { about: 'ice-cream cart with an umbrella', tags: 'town beach', parts: [['box', G.mat('#ffb2c8', 'glaze'), [0, 0, 4], [20, 10, 10]], ['mirror', 'x', ['cyl', 'aoa_dark', [7, 5.5, 0], 3, 1, { seg: 8 }]], ['cyl', 'aoa_white', [0, 0, 14], .6, 14], ['cyl', G.mat('#9ff3e8', 'cloth'), [0, 0, 26], 12, 3, { r2: 1, seg: 8 }]] };
S.planter = { about: 'stone planter with a flowering shrub', tags: 'town', parts: [['box', 'sandstone', [0, 0, 0], [12, 12, 7]], ['ball', 'shrub', [0, 0, 10], 6], ['ball', G.mat('#ff5f7a', 'none'), [2, 3, 13], 1.5], ['ball', G.mat('#ffd04a', 'none'), [-3, 2, 12], 1.3]] };
S.wardrobe = { about: 'tall wardrobe', tags: 'furniture', parts: [['box', 'birch', [0, 0, 0], [20, 10, 34]], ['box', 'aoa_dark', [0, 5.1, 2], [.5, .3, 30]], ['mirror', 'x', ['box', 'aoa_gold', [2, 5.3, 16], [1, .5, 3]]]] };
S.desk = { about: 'writing desk', tags: 'furniture', parts: [['box', 'birch', [0, 0, 11], [24, 12, 2]], ['mirror', 'xy', ['box', 'birch', [10, 5, 0], [2, 2, 11]]], ['box', G.mat('#f0e8d0', 'none'), [4, 0, 13], [7, 5, .5]], ['cyl', 'aoa_gold', [-7, -2, 13], 1.4, 3]] };
S.mailbox = { about: 'island mailbox on a post', tags: 'town', parts: [['box', 'oak', [0, 0, 0], [2, 2, 16]], ['box', G.mat('#2a6ad8', 'metal'), [0, 0, 16], [6, 10, 6]], ['box', 'aoa_red', [3.2, -3, 19], [.5, 1, 5]]] };
S.rug = { about: 'woven rug', tags: 'furniture', params: { color: '#ff9e5e' }, make: p => [['box', G.mat(p.color, 'cloth'), [0, 0, 0], [40, 26, .4]], ['box', G.mat('#fff8e8', 'cloth'), [0, 0, 0], [30, 16, .6]]] };
S.seaplane = { about: "Sonny's gold seaplane", tags: 'island vehicle', parts: [['mirror', 'y', ['box', 'aoa_white', [0, 9, 0], [30, 4, 4]]], ['mirror', 'y', ['box', 'aoa_chrome', [0, 9, 4], [2, 1, 8]]], ['cyl', 'aoa_gold', [0, 0, 12], 5, 26, { sq: 1 }], ['box', 'aoa_gold', [0, 0, 18], [12, 46, 1.5]], ['box', 'aoa_gold', [-14, 0, 14], [3, 14, 1.2]], ['box', 'aoa_gold', [-14, 0, 14], [3, 1.2, 10]]] };
S.dockplanks = { about: 'dock planks on posts', tags: 'island', params: { len: 48 }, make: p => [['box', 'planks', [0, 0, 2], [p.len, 16, 1.5]], ['mirror', 'xy', ['cyl', 'bark', [p.len / 2 - 2, 7, -4], 1.5, 8]]] };
S.lighthouse = { about: 'striped lighthouse', tags: 'island', parts: [['cyl', 'aoa_white', [0, 0, 0], 8, 16, { r2: 7 }], ['cyl', 'aoa_red', [0, 0, 16], 7, 14, { r2: 6 }], ['cyl', 'aoa_white', [0, 0, 30], 6, 14, { r2: 5 }], ['cyl', 'aoa_glow', [0, 0, 44], 4, 6], ['cyl', 'aoa_red', [0, 0, 50], 5, 4, { r2: 0 }]], lights: [[0, 0, 46, '#fff0a0', 90]] };
S.chairstool = { about: 'bar stool', tags: 'bar', parts: [['cyl', 'aoa_chrome', [0, 0, 0], .8, 9], ['cyl', G.mat('#e8283a', 'cloth'), [0, 0, 9], 3, 1.5, { seg: 10 }]] };
S.prizecounter = { about: 'casino prize counter with a display', tags: 'casino', parts: [['box', 'walnut', [0, 0, 0], [28, 10, 13]], ['box', G.mat('#9fd8f0', 'glaze'), [0, 0, 13], [26, 8, 6]], ['box', 'aoa_gold', [0, 0, 19], [28, 10, 1]], ['box', 'aoa_neonc', [0, 5.2, 9], [20, .4, 2]]] };

/* ---- the court map: sea (rows 0-5, blocked), wet sand (row 6), sand; rope lines; built once ---- */
const CR = G.C;
G.courtFloor = (x, y, tag) => {
  const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5, m2 = E.noise2(x * .2, y * .2);
  if (tag === 'sea') { const k = clamp(y / 96, 0, 1), c = E.hex(E.mix('#0b5a7a', '#2ec4c9', k)), sp = n * 10 + m2 * 12; return [c[0] + sp, c[1] + sp, c[2] + sp]; }
  if (tag === 'wet') { const k = (y - 96) / 16; return k < .25 ? [220 + n * 20, 236 + n * 10, 230] : [201 + n * 16 + m * 20, 160 + n * 14 + m * 16, 106 + n * 10]; }
  // rope lines: 2 units wide, blue
  const onX = (Math.abs(x - CR.X0) < 1 || Math.abs(x - CR.X1) < 1) && y >= CR.Y0 - 1 && y <= CR.Y1 + 1;
  const onY = (Math.abs(y - CR.Y0) < 1 || Math.abs(y - CR.Y1) < 1) && x >= CR.X0 - 1 && x <= CR.X1 + 1;
  if (tag === 'court' && (onX || onY)) { const w = n * 16; return [42 + w, 106 + w, 216 + w * .5]; }
  const g = 236 + n * 26 + m * 22 + (m2 > .62 ? -14 : 0);
  return [g, g * .9, g * .68];
};
G.makeCourtMap = () => {
  const rows = [];
  for (let r = 0; r < CR.MAP_H; r++) rows.push((r < 6 ? 'w' : r === 6 ? 'e' : 's').repeat(CR.MAP_W));
  const map = new E.TileMap({ rows, legend: { w: { floor: 'sea', block: true }, e: { floor: 'wet' }, s: { floor: 'court' } }, floorTex: G.courtFloor, outside: false, ao: 0, types: {} });
  return map;
};

/* ---- the crowd on the far-side bleachers, and the court's set dressing ---- */
G.makeCrowd = (seed = 3, n = 24) => {
  const r = E.rng(seed), out = [];
  const shirts = ['#ff5f7a', '#ffd04a', '#2ec4c9', '#ffffff', '#ff9e5e', '#7cff5a', '#5a7ad8', '#e85a8a'], skins = ['#f1cfb2', '#b9825a', '#7a4a2e', '#e2ad84', '#f7dccb', '#a8714a'];
  for (let i = 0; i < n; i++) {
    const tier = i % 3, side = i < n / 2 ? 0 : 1, per = Math.ceil(n / 6);
    const bx = side ? 448 : 256, x = bx + (Math.floor(i / 3) % per) * (48 / per) - 20 + r() * 3;
    out.push({ x, y: 157 - tier * 8, z: 7 + tier * 6, shirt: shirts[Math.floor(r() * shirts.length)], skin: skins[Math.floor(r() * skins.length)], hair: ['#1a1418', '#3a2218', '#f0d890', '#5a2a1e'][Math.floor(r() * 4)], ph: r() * 9, side, cheer: 0, hat: r() < .25 });
  }
  return out;
};
G.drawCrowd = (r, crowd, t, mood) => {
  for (const f of crowd) {
    const exc = f.cheer > 0 ? Math.abs(Math.sin(t * 10 + f.ph)) * 4 : 0, sway = Math.sin(t * 1.6 + f.ph) * .6, z = f.z + exc;
    r.queue(f.x, f.y, z, g => {
      const [x, y] = r.w(f.x + sway, f.y, z), X = Math.round(x), Y = Math.round(y);
      px.rect(g, X - 2, Y - 6, 5, 6, f.shirt); px.rect(g, X - 2, Y - 6, 5, 1, E.shade(f.shirt, .25)); px.rect(g, X + 2, Y - 5, 1, 5, E.shade(f.shirt, -.25));
      px.rect(g, X - 1, Y - 10, 3, 4, f.skin); px.rect(g, X - 1, Y - 11, 3, 1, f.hair);
      if (f.hat) px.rect(g, X - 2, Y - 12, 5, 1, '#f0d890');
      if (f.cheer > 0) { px.rect(g, X - 3, Y - 12 - Math.round(exc * .5), 1, 5, f.skin); px.rect(g, X + 3, Y - 12 - Math.round(exc * .5), 1, 5, f.skin); }
      else if (mood === 'groan') px.rect(g, X - 1, Y - 9, 3, 1, E.shade(f.skin, -.3));
    });
  }
};
/** the court's props: the far-side strip (bleachers, umbrellas, DJ booth, scorer table, scoreboard), the sides (tiki bar,
 *  lifeguard tower, loungers, surf rack, changing hut) and low props on the near side; floodlights and torches at night */
G.drawCourtProps = (r, o = {}) => {
  const night = o.tod === 'night', C = G.C;
  r.shape('bleacher', 256, 148, 0, { params: { len: 52, color: '#2ec4c9' } });
  r.shape('bleacher', 448, 148, 0, { params: { len: 52, color: '#ff9e5e' } });
  r.shape('djbooth', 352, 132, 0);
  r.shape('scoreboard', 316, 160, 0);
  r.shape('table', 390, 164, 0, { mats: { t: 'aoa_white', l: 'aoa_white' } });
  r.shape('umbrella', 198, 138, 0, { params: { color: '#ff5f7a' } });
  r.shape('umbrella', 506, 138, 0, { params: { color: '#2ec4c9' } });
  r.shape('tikibar', 120, 210, 0);
  for (const sx of [104, 120, 136]) r.shape('chairstool', sx, 232, 0);
  r.shape('lifeguard', 600, 170, 0);
  r.shape('lounger', 584, 250, 0, { params: { color: '#ffd04a' } }); r.shape('lounger', 612, 252, 0, { params: { color: '#ff5f7a' } });
  r.shape('surfrack', 640, 300, 0, { facing: Math.PI });
  r.shape('changinghut', 70, 300, 0);
  r.shape('umbrella', 600, 228, 0, { params: { color: '#ff9e5e', stripe: '#ffffff' } });
  r.prop('palm', 40, 160, 0, { size: 1.6 }); r.prop('palm', 680, 140, 0, { size: 1.7 }); r.prop('palm', 160, 130, 0, { size: 1.5 }); r.prop('palm', 548, 128, 0, { size: 1.5 });
  r.prop('palm', 30, 380, 0, { size: 1.4 }); r.prop('palm', 690, 390, 0, { size: 1.5 });
  // near side: low props only (tall ones would hide the court in the Broadcast view)
  r.shape('beachtowel', 250, 360, 0, { facing: 0, params: { color: '#ff5fa2' } }); r.shape('beachtowel', 470, 370, 0, { facing: 0, params: { color: '#2ec4c9', stripe: '#ffd04a' } });
  r.shape('sandcastle', 330, 400, 0); r.shape('cooler', 400, 356, 0); r.shape('beachtowel', 560, 340, 0, { params: { color: '#ffd04a' } });
  r.prop('flowers', 180, 400, 0); r.prop('rock', 120, 420, 0); r.prop('rock', 610, 410, 0, { size: .8 });
  // net posts
  r.shape('netpost', C.NET_X, C.Y0 - 10, 0); r.shape('netpost', C.NET_X, C.Y1 + 10, 0);
  if (o.final) { for (const bx of [226, 300, 404, 478]) r.queue(bx, 112, 0, g => { const [x, y] = r.w(bx, 112, 40), X = Math.round(x), Y = Math.round(y); px.rect(g, X, Y, 1, 30, '#c8ccd8'); px.rect(g, X + 1, Y, 18, 12, '#16141c'); px.rect(g, X + 2, Y + 2, 16, 8, '#ffd36a'); E.font.text(g, '$', X + 8, Y + 2, '#16141c', { outline: false }); }); }
  if (night) {
    for (const [x, y] of [[200, 120], [504, 120], [200, 340], [504, 340]]) { r.prop('streetlamp', x, y, 0, { size: 1.8, light: true }); G.game.lights.add(x, y, 40, 200, 1.05, { color: '#fff4d8' }); }
    G.game.lights.add(C.NET_X, C.CY, 60, 170, .9, { color: '#e8f0ff' });   // the floodlights meet over the net
    for (const [x, y] of [[96, 196], [150, 196], [570, 210], [640, 270], [60, 260]]) r.prop('torch', x, y, 0, { size: 1.4, light: true });
  }
};
/** the net: posts, a mesh band from NET_LO to NET_H with a white tape, and antennae at the side lines */
G.drawNet = (r, shake = 0) => {
  const C = G.C, y0 = C.Y0 - 10, y1 = C.Y1 + 10;
  r.queue(C.NET_X, C.CY, C.NET_H * .5, g => {
    const a = r.w(C.NET_X, y0, C.NET_H), b = r.w(C.NET_X, y1, C.NET_H), a2 = r.w(C.NET_X, y0, C.NET_LO), b2 = r.w(C.NET_X, y1, C.NET_LO);
    const sh = shake ? Math.sin(G.now() * 50) * shake : 0;
    px.blend(g, .55, 'normal', () => px.poly(g, [[a[0], a[1] + sh], [b[0], b[1] + sh], [b2[0], b2[1]], [a2[0], a2[1]]], '#1a1a2a'));
    const n = 22;   // mesh lines
    for (let i = 0; i <= n; i++) { const k = i / n, p = [lerp(a[0], b[0], k), lerp(a[1], b[1], k) + sh], q = [lerp(a2[0], b2[0], k), lerp(a2[1], b2[1], k)]; px.line(g, p[0], p[1], q[0], q[1], '#3a3a4a'); }
    for (let j = 1; j < 4; j++) { const k = j / 4; px.line(g, lerp(a[0], a2[0], k), lerp(a[1] + sh, a2[1], k), lerp(b[0], b2[0], k), lerp(b[1] + sh, b2[1], k), '#3a3a4a'); }
    px.line(g, a[0], a[1] + sh, b[0], b[1] + sh, '#ffffff', 2); px.line(g, a2[0], a2[1], b2[0], b2[1], '#e8e8f0');
    for (const yy of [C.Y0, C.Y1]) { const p = r.w(C.NET_X, yy, C.NET_LO), q = r.w(C.NET_X, yy, C.ANT_H); for (let k = 0; k < 6; k++) { const u0 = k / 6, u1 = (k + 1) / 6; px.line(g, lerp(p[0], q[0], u0), lerp(p[1], q[1], u0), lerp(p[0], q[0], u1), lerp(p[1], q[1], u1), k % 2 ? '#ffffff' : '#e8283a'); } }
  }, { bias: 0 });
};
/** the shoreline's foam, moving in and out (drawn on the floor) */
G.drawShore = (r, t, x0 = 0, x1 = G.C.MAP_W * 16, yS = 96) => {
  r.decal(g => {
    for (let x = x0; x < x1; x += 4) {
      const k = Math.sin(t * .6 + x * .02) * 3 + Math.sin(t * 1.3 + x * .07) * 1.2, y = yS - 2 + k;
      const p = r.w(x, y, 0), q = r.w(x + 4, y + Math.sin(t * .6 + (x + 4) * .02) * 0, 0);
      px.line(g, p[0], p[1], q[0], q[1], '#f4fbff'); if ((x / 4) % 3 === 0) px.dot(g, p[0], p[1] + 1, '#c8f0f8');
    }
  });
};

/* ---- effects ---- */
G.fx = {
  hearts(x, y, z, n = 6) { const P = G.game.particles; for (let i = 0; i < n; i++) P.add({ kind: 'text', text: '♥', x: x + G.rand('cosmetic', -6, 6), y, z: z + G.rand('cosmetic', 0, 6), vx: G.rand('cosmetic', -14, 14), vy: 0, vz: G.rand('cosmetic', 20, 40), g: -10, life: 1.2, max: 1.2, color: G.pick('cosmetic', ['#ff5f7a', '#ff9ac8', '#ffd0d8']) }); },
  confetti(x, y, z, n = 40) { G.game.particles.bits(x, y, z, n, ['#ff5f7a', '#ffd36a', '#2ec4c9', '#ffffff', '#7cff5a', '#ff9e5e']); },
  coins(x, y, z, n = 30) { const P = G.game.particles; for (let i = 0; i < n; i++) P.add({ kind: 'bit', x: x + G.rand('cosmetic', -20, 20), y: y + G.rand('cosmetic', -4, 4), z: z + G.rand('cosmetic', 10, 40), vx: G.rand('cosmetic', -30, 30), vy: 0, vz: G.rand('cosmetic', 20, 90), g: 260, bounce: .4, life: 2, max: 2, color: G.pick('cosmetic', ['#ffd36a', '#e8a020', '#fff6c0']), size: 2 }); },
  firework(x, y, z, col) { const P = G.game.particles; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, s = G.rand('cosmetic', 50, 80); P.add({ kind: 'spark', x, y, z, vx: Math.cos(a) * s, vy: 0, vz: Math.sin(a) * s, g: 40, drag: 1.5, life: 1.3, max: 1.3, color: col || G.pick('cosmetic', ['#ff5f7a', '#ffd36a', '#5ff0ff', '#7cff5a']) }); } G.sfx('firework', { vary: .2 }); },
  sweat(x, y, z) { G.game.particles.add({ kind: 'text', text: "'", x: x + 3, y, z, vx: 12, vy: 0, vz: 20, g: 80, life: .6, max: .6, color: '#9fd8f0' }); },
  glare(x, y, z) { G.game.particles.glints(x, y, z, 6, '#fff6c0', 6); G.game.particles.ring(x, y, 2, 16, '#ffd36a', .3, z); },
  splash(x, y, z = 0, n = 14) { const P = G.game.particles; P.bits(x, y, z, n, ['#9ff3e8', '#ffffff', '#2ec4c9']); P.ring(x, y, 2, 14, '#e8f8ff', .4, z); },
  sparkle(x, y, z) { G.game.particles.glints(x, y, z, 7, '#fff6c0', 8); }
};
