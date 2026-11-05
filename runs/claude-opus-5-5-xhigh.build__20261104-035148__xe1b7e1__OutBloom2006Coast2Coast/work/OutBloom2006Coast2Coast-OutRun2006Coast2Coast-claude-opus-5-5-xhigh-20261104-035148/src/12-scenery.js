/* OutBloom — scenery and skies. Every roadside sprite is painted by code into a canvas once (E.px with E.tones
 * shading), in variants and animation frames, and drawn at the size its world height gives at that distance; time of day
 * tints them (emissive ones stay bright). OB.Sky paints each stage's sky: a banded gradient, the sun or moon with a halo,
 * clouds, and far layers (sea, hills, mountains, mesas, village, skyline, balloons, stars, aurora...) that scroll with
 * the road's turns. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const Art = OB.Art;
const mk = (w, h) => E.mkCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
const T = c => E.tones(c);
const R = (seed) => E.rng(seed);
/* ---- painting helpers ---- */
function blob(g, cx, cy, r, c, light = true) {
  const t = T(c); px.disc(g, Math.round(cx), Math.round(cy), Math.round(r), t.sh); px.disc(g, Math.round(cx - r * .12), Math.round(cy - r * .12), Math.round(r * .86), t.base);
  if (light) { px.disc(g, Math.round(cx - r * .35), Math.round(cy - r * .38), Math.max(1, Math.round(r * .42)), t.lt); if (r > 5) px.rect(g, Math.round(cx - r * .45), Math.round(cy - r * .5), 2, 1, t.hi); }
}
function canopy(g, cx, cy, rw, rh, c, rnd, n = 9) {
  const t = T(c);
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, d = rnd() * .55; blob(g, cx + Math.cos(a) * rw * d, cy + Math.sin(a) * rh * d * .8 + rh * .1, Math.min(rw, rh) * (.42 + rnd() * .2), c, false); }
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, d = rnd() * .5; px.disc(g, Math.round(cx - rw * .2 + Math.cos(a) * rw * d * .6), Math.round(cy - rh * .25 + Math.sin(a) * rh * d * .5), Math.max(1, Math.round(Math.min(rw, rh) * .2)), t.lt); }
  for (let i = 0; i < n * 2; i++) px.rect(g, Math.round(cx - rw * .5 + rnd() * rw * .8), Math.round(cy - rh * .5 + rnd() * rh * .6), 1, 1, t.hi);
}
const trunk = (g, x, y0, y1, w, c) => { const t = T(c); px.rect(g, Math.round(x - w / 2), Math.round(y1), Math.max(1, Math.round(w)), Math.round(y0 - y1), t.base); px.rect(g, Math.round(x - w / 2), Math.round(y1), Math.max(1, Math.round(w * .35)), Math.round(y0 - y1), t.lt); px.rect(g, Math.round(x + w / 2 - Math.max(1, w * .25)), Math.round(y1), Math.max(1, Math.round(w * .25)), Math.round(y0 - y1), t.sh); };
function house(g, x, y, w, h, wall, roof, o = {}) {
  const tw = T(wall), tr = T(roof); px.rect(g, x, y - h, w, h, tw.base); px.rect(g, x + w - Math.max(2, w * .12), y - h, Math.max(2, Math.round(w * .12)), h, tw.sh); px.rect(g, x, y - h, Math.max(1, Math.round(w * .06)), h, tw.lt);
  const rh = o.roofH || h * .45;
  if (o.flat) px.rect(g, x - 1, y - h - 2, w + 2, 3, tr.base);
  else { px.poly(g, [[x - 2, y - h], [x + w / 2, y - h - rh], [x + w + 2, y - h]], tr.base); px.poly(g, [[x + w / 2, y - h - rh], [x + w + 2, y - h], [x + w * .62, y - h]], tr.sh); px.line(g, x - 2, y - h, x + w / 2, y - h - rh, tr.lt); }
  const win = o.window || '#3a4a6a', nwin = o.windows || Math.max(1, Math.floor(w / 10));
  for (let r = 0; r < (o.floors || 1); r++) for (let i = 0; i < nwin; i++) { const wx = x + (i + .5) * w / nwin - 2, wy = y - h + 4 + r * (h - 4) / (o.floors || 1); px.rect(g, Math.round(wx), Math.round(wy), 3, 4, o.lit && (i + r) % 3 ? o.lit : win); if (o.shutters) { px.rect(g, Math.round(wx - 1), Math.round(wy), 1, 4, o.shutters); px.rect(g, Math.round(wx + 3), Math.round(wy), 1, 4, o.shutters); } }
  if (o.door !== false) px.rect(g, Math.round(x + w * .45), y - Math.min(8, h * .45), Math.max(2, Math.round(w * .14)), Math.min(8, Math.round(h * .45)), o.door || tr.deep);
}
const text = (g, s, x, y, c, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ align: 'center', outline: false }, o));

/* ---- the sprite registry: kind -> { h (pixels), aspect, variants, frames, emissive, paint(g, w, h, v, f, rnd) } ---- */
const DEF = {}, cache = new Map();
const def = (kind, d) => { DEF[kind] = Object.assign({ h: 96, aspect: 1, variants: 1, frames: 1 }, d); };
Art.sprite = (kind, v = 0, f = 0) => {
  const d = DEF[kind]; if (!d) return null;
  const key = kind + ':' + (v % d.variants) + ':' + (f % d.frames);
  if (!cache.has(key)) { const h = d.h, w = Math.round(h * d.aspect), cv = mk(w, h), g = E.ctx2d(cv); if (!OB.env.headless) d.paint(g, w, h, v % d.variants, f % d.frames, R(OB.hashStr(key))); cache.set(key, { cv, w, h, emissive: d.emissive }); }
  return cache.get(key);
};
Art.spriteDef = k => DEF[k];

/* the beach */
def('palm', { h: 180, aspect: .75, variants: 3, paint(g, w, h, v, f, r) {
  const bend = (v - 1) * .18, tc = '#a8784a'; let x = w / 2, y = h;
  for (let i = 0; i < 14; i++) { const nx = x + bend * 8 + Math.sin(i * .4) * 1.2, ny = y - h * .052; px.line(g, Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), i % 2 ? '#8a5a32' : tc, 6 - i * .2); x = nx; y = ny; }
  const cx = x, cy = y;
  for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + (k - 3.5) * .45 + (r() - .5) * .2, len = w * (.36 + r() * .12); let fx = cx, fy = cy;
    for (let s = 0; s < 8; s++) { const u = s / 8, nx = cx + Math.cos(a) * len * (u + .125), ny = cy + Math.sin(a) * len * (u + .125) + u * u * len * .55; px.line(g, Math.round(fx), Math.round(fy), Math.round(nx), Math.round(ny), k % 2 ? '#2f8a3a' : '#3aa048', 3); if (s > 1) { px.line(g, Math.round(nx), Math.round(ny), Math.round(nx + Math.cos(a + 1.6) * 5), Math.round(ny + 5), '#2a7a34', 1); px.line(g, Math.round(nx), Math.round(ny), Math.round(nx + Math.cos(a - 1.6) * 5), Math.round(ny + 5), '#4ab858', 1); } fx = nx; fy = ny; } }
  for (let k = 0; k < 3; k++) px.disc(g, Math.round(cx - 3 + k * 3), Math.round(cy + 3), 2, '#6a4a2a');
} });
def('umbrella', { h: 72, aspect: 1.1, variants: 3, paint(g, w, h, v) {
  const cols = [['#ff5f7a', '#fff4e8'], ['#3ab0e8', '#fff4e8'], ['#ffd23a', '#ff7a3a']][v];
  px.line(g, w / 2, h, w / 2, h * .25, '#e8e0d0', 2);
  for (let k = 0; k < 8; k++) { const a0 = Math.PI + k / 8 * Math.PI, a1 = Math.PI + (k + 1) / 8 * Math.PI; px.poly(g, [[w / 2, h * .2], [w / 2 + Math.cos(a0) * w * .48, h * .2 - Math.sin(a0) * h * -.0 + 10], [w / 2 + Math.cos(a1) * w * .48, h * .2 + 10]], cols[k % 2]); }
  px.ell(g, Math.round(w / 2), Math.round(h - 2), Math.round(w * .35), 3, '#e0c890');
  px.rect(g, Math.round(w * .2), h - 8, Math.round(w * .3), 4, cols[0]);
} });
def('beachhut', { h: 96, aspect: 1, variants: 4, paint(g, w, h, v) {
  const c = ['#ffb0c8', '#a8e0f0', '#fff0a8', '#b8f0c8'][v];
  for (let i = 0; i < 6; i++) px.rect(g, 8 + i * (w - 16) / 6, h * .35, Math.ceil((w - 16) / 12), h * .62, i % 2 ? c : '#fff8f0');
  px.poly(g, [[4, h * .37], [w / 2, h * .1], [w - 4, h * .37]], T(c).sh); px.rect(g, w * .4, h * .6, w * .2, h * .37, '#6a4a3a');
  px.rect(g, 4, h - 4, w - 8, 4, '#c8a878');
} });
def('lifeguard', { h: 120, aspect: .8, noFlip: true, paint(g, w, h) {
  for (const x of [w * .25, w * .75]) px.line(g, Math.round(x), h, Math.round(w / 2 + (x - w / 2) * .55), Math.round(h * .45), '#f0f0f0', 3);
  px.rect(g, w * .2, h * .3, w * .6, h * .18, '#ff4a3a'); px.rect(g, w * .2, h * .3, w * .6, 3, '#ffffff'); px.poly(g, [[w * .15, h * .3], [w / 2, h * .12], [w * .85, h * .3]], '#ffd23a');
  px.rect(g, w * .3, h * .36, w * .4, h * .08, '#3a4a6a'); text(g, '+', w / 2, h * .18, '#ff3a3a');
} });
def('surfrack', { h: 64, aspect: 1.1, paint(g, w, h) {
  const cols = ['#ff7ab8', '#3ab0e8', '#ffd23a', '#7ad860'];
  for (let i = 0; i < 4; i++) { const x = 8 + i * (w - 16) / 4; px.ell(g, Math.round(x + 5), Math.round(h * .5), 4, Math.round(h * .45), cols[i]); px.line(g, Math.round(x + 5), Math.round(h * .1), Math.round(x + 5), Math.round(h * .9), '#ffffff', 1); }
  px.rect(g, 4, h - 10, w - 8, 3, '#8a6a4a');
} });
def('rock', { h: 56, aspect: 1.4, variants: 3, paint(g, w, h, v, f, r) {
  const c = ['#9a8a7a', '#b0a090', '#8a7a8a'][v], t = T(c), pts = [];
  for (let k = 0; k <= 10; k++) { const a = Math.PI + k / 10 * Math.PI; pts.push([w / 2 + Math.cos(a) * w * (.42 + r() * .06), h - Math.max(0, -Math.sin(a)) * h * (.8 + r() * .18)]); }
  px.poly(g, pts, t.base); px.poly(g, pts.slice(0, 6).concat([[w * .45, h]]), t.lt); px.poly(g, pts.slice(6).concat([[w * .6, h]]), t.sh);
  for (let i = 0; i < 8; i++) px.rect(g, Math.round(w * .3 + r() * w * .4), Math.round(h * .4 + r() * h * .5), 2, 1, t.deep);
} });
def('buoy', { h: 32, aspect: .8, paint(g, w, h) { px.disc(g, w / 2, h * .6, w * .35, '#ff5a3a'); px.rect(g, w * .2, h * .55, w * .6, 3, '#ffffff'); px.line(g, w / 2, h * .1, w / 2, h * .4, '#3a3a40', 2); } });
def('billboard', { h: 120, aspect: 1.5, variants: 4, noFlip: true, paint(g, w, h, v) {
  const ads = [['GELATO', 'GELATISSIMO', '#ff7ab8', '#fff4e0'], ['FIORETTI', 'BORN TO BLOOM', '#c8302a', '#ffffff'], ['RADIO', 'PETAL FM 88.6', '#3a2a7a', '#ffd23a'], ['HOTEL', 'VESPERA', '#1a3a5a', '#ffe0a0']][v];
  for (const x of [w * .25, w * .75]) px.rect(g, Math.round(x - 2), Math.round(h * .45), 4, Math.round(h * .55), '#6a6a72');
  px.rect(g, 2, 4, w - 4, h * .5, '#f8f4ec'); px.rect(g, 5, 7, w - 10, h * .5 - 6, ads[2]);
  text(g, ads[0], w / 2, 14, ads[3], { scale: 2 }); text(g, ads[1], w / 2, 34, ads[3]);
  if (v === 0) { px.poly(g, [[w * .82, h * .4], [w * .78, h * .2], [w * .86, h * .2]], '#e8b870'); px.disc(g, Math.round(w * .82), Math.round(h * .18), 5, '#ffb0d0'); }
} });
def('ferris', { h: 220, aspect: 1, frames: 8, paint(g, w, h, v, f) {
  const cx = w / 2, cy = h * .45, R0 = w * .42;
  px.line(g, cx, cy, w * .2, h, '#d8d8e0', 3); px.line(g, cx, cy, w * .8, h, '#d8d8e0', 3);
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; px.line(g, cx + Math.cos(a) * R0, cy + Math.sin(a) * R0, cx + Math.cos(a + Math.PI * 2 / 24) * R0, cy + Math.sin(a + Math.PI * 2 / 24) * R0, '#f0f0f8', 2); }
  const cols = ['#ff5f7a', '#ffd23a', '#3ab0e8', '#7ad860', '#ff9a3a', '#b07ae8'];
  for (let k = 0; k < 12; k++) { const a = (k / 12 + f / 96) * Math.PI * 2; px.line(g, cx, cy, cx + Math.cos(a) * R0, cy + Math.sin(a) * R0, '#c8c8d8', 1); px.rect(g, Math.round(cx + Math.cos(a) * R0 - 4), Math.round(cy + Math.sin(a) * R0), 8, 7, cols[k % 6]); }
  px.disc(g, cx, cy, 5, '#ff7ab8'); px.rect(g, w * .1, h - 14, w * .8, 14, '#c8a878'); for (let i = 0; i < 8; i++) px.rect(g, w * .1 + i * w * .1, h - 14, 2, 14, '#8a6a4a');
} });
/* fields */
def('cypress', { h: 160, aspect: .32, variants: 2, paint(g, w, h, v, f, r) {
  const t = T(v ? '#2a5a34' : '#2f6a3a'); trunk(g, w / 2, h, h * .9, 3, '#5a3a2a');
  const pts = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2, rr = (k % 2 ? .9 : 1); pts.push([w / 2 + Math.sin(a) * w * .45 * rr * Math.sin(Math.min(1, (Math.cos(a) * -.5 + .5)) * Math.PI * .9 + .2), h * .5 - Math.cos(a) * h * .46]); }
  px.ell(g, Math.round(w / 2), Math.round(h * .52), Math.round(w * .44), Math.round(h * .45), t.base); px.ell(g, Math.round(w * .4), Math.round(h * .45), Math.round(w * .22), Math.round(h * .36), t.lt);
  px.ell(g, Math.round(w * .62), Math.round(h * .6), Math.round(w * .18), Math.round(h * .3), t.sh);
  for (let i = 0; i < 20; i++) px.rect(g, Math.round(w * .2 + r() * w * .6), Math.round(h * .1 + r() * h * .8), 1, 2, i % 2 ? t.deep : t.hi);
} });
def('lavender', { h: 26, aspect: 1.8, variants: 2, paint(g, w, h, v, f, r) { px.ell(g, w / 2, h * .75, w * .46, h * .3, '#5a8a4a'); for (let i = 0; i < 22; i++) { const x = 3 + r() * (w - 6), y = h * .2 + r() * h * .45; px.line(g, Math.round(x), Math.round(h * .7), Math.round(x), Math.round(y), '#6a9a5a', 1); px.rect(g, Math.round(x - 1), Math.round(y - 2), 2, 3, v ? '#9a72d6' : '#b08ae8'); } } });
def('heather', { h: 24, aspect: 1.8, variants: 2, paint(g, w, h, v, f, r) { px.ell(g, w / 2, h * .7, w * .46, h * .32, '#5a4a5a'); for (let i = 0; i < 26; i++) px.rect(g, Math.round(2 + r() * (w - 4)), Math.round(h * .3 + r() * h * .5), 2, 2, v ? '#c87ad0' : '#e09ae0'); } });
def('sunflowers', { h: 60, aspect: 1.2, variants: 2, paint(g, w, h, v, f, r) {
  for (let i = 0; i < 6; i++) { const x = 5 + i * (w - 10) / 5 + (r() - .5) * 4, y = 8 + r() * h * .3; px.line(g, Math.round(x), h, Math.round(x), Math.round(y), '#4a8a3a', 2); px.ell(g, Math.round(x + 3), Math.round(y + 12), 4, 2, '#5aa048');
    px.disc(g, Math.round(x), Math.round(y), 6, '#ffc81a'); px.disc(g, Math.round(x), Math.round(y), 3, '#6a3a1a'); px.rect(g, Math.round(x - 4), Math.round(y - 5), 2, 1, '#fff0a0'); }
} });
def('farmhouse', { h: 120, aspect: 1.5, paint(g, w, h) { house(g, 8, h - 2, w * .55, h * .42, '#d8c8a8', '#b8603a', { windows: 3, shutters: '#4a7a5a' }); house(g, w * .62, h - 2, w * .3, h * .32, '#c8b898', '#a8503a', { windows: 1 }); px.rect(g, w * .3, h * .15, 6, h * .2, '#8a7a6a'); } });
def('watertower', { h: 150, aspect: .6, paint(g, w, h) { for (const x of [w * .25, w * .75]) px.line(g, x, h, w / 2 + (x - w / 2) * .7, h * .4, '#7a6a5a', 3); px.rect(g, w * .2, h * .2, w * .6, h * .22, '#b0a08a'); px.poly(g, [[w * .15, h * .2], [w / 2, h * .05], [w * .85, h * .2]], '#8a4a3a'); } });
def('beehives', { h: 40, aspect: 2.4, paint(g, w, h) { const cols = ['#ffd23a', '#fff4e0', '#a8d8f0', '#ffb0c8']; for (let i = 0; i < 4; i++) { const x = 4 + i * (w - 8) / 4; px.rect(g, Math.round(x), h * .35, Math.round((w - 8) / 4 - 4), h * .6, cols[i]); px.rect(g, Math.round(x - 1), h * .3, Math.round((w - 8) / 4 - 2), 4, '#8a6a4a'); px.rect(g, Math.round(x + 4), h * .75, 4, 2, '#3a2a1a'); } } });
def('fence', { h: 26, aspect: 2.2, paint(g, w, h) { px.rect(g, 0, h * .35, w, 3, '#c8a878'); px.rect(g, 0, h * .65, w, 3, '#b8986a'); for (let i = 0; i < 5; i++) px.rect(g, Math.round(i * w / 4.2), h * .2, 3, h * .8, '#a8885a'); } });
def('haybale', { h: 44, aspect: 1.3, paint(g, w, h, v, f, r) { const t = T('#e0b860'); px.disc(g, w / 2, h * .55, h * .44, t.base); px.disc(g, w / 2 - 4, h * .5, h * .3, t.lt); for (let k = 0; k < 3; k++) px.ring && px.ring(g, w / 2, h * .55, h * (.14 + k * .1), t.sh); for (let i = 0; i < 20; i++) px.rect(g, Math.round(w * .2 + r() * w * .6), Math.round(h * .2 + r() * h * .7), 2, 1, t.sh); } });
def('silo', { h: 200, aspect: .35, paint(g, w, h) { const t = T('#c8c8d0'); px.rect(g, w * .1, h * .2, w * .8, h * .8, t.base); px.rect(g, w * .1, h * .2, w * .2, h * .8, t.lt); px.rect(g, w * .7, h * .2, w * .2, h * .8, t.sh); px.ell(g, w / 2, h * .2, w * .4, h * .08, '#a8a8b8'); for (let i = 1; i < 8; i++) px.rect(g, w * .1, h * .2 + i * h * .1, w * .8, 1, t.sh); } });
def('barn', { h: 120, aspect: 1.3, paint(g, w, h) { house(g, 6, h - 2, w - 12, h * .5, '#c83a2a', '#5a3a3a', { door: false, windows: 1, roofH: h * .35 }); px.rect(g, w * .38, h * .62, w * .24, h * .36, '#f4f0e8'); px.line(g, w * .38, h * .62, w * .62, h * .98, '#c83a2a', 2); px.line(g, w * .62, h * .62, w * .38, h * .98, '#c83a2a', 2); } });
def('turbine', { h: 240, aspect: .7, frames: 6, paint(g, w, h, v, f) { const cx = w / 2, cy = h * .2; px.poly(g, [[cx - 3, h], [cx + 3, h], [cx + 1.5, cy], [cx - 1.5, cy]], '#f0f0f4'); px.rect(g, cx + 1, cy, 2, h - cy, '#c8c8d4');
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + f / 6 * Math.PI * 2 / 3; px.poly(g, [[cx, cy], [cx + Math.cos(a + .08) * w * .46, cy + Math.sin(a + .08) * w * .46], [cx + Math.cos(a - .05) * w * .46, cy + Math.sin(a - .05) * w * .46]], '#f8f8fc'); } px.disc(g, cx, cy, 3, '#d8d8e0'); } });
def('haysculpture', { h: 140, aspect: 1, paint(g, w, h, v, f, r) { const cx = w / 2, cy = h * .4; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; px.ell(g, Math.round(cx + Math.cos(a) * w * .28), Math.round(cy + Math.sin(a) * h * .26), 10, 8, '#ffc83a'); } px.disc(g, cx, cy, w * .2, '#8a5a2a'); px.disc(g, cx - 4, cy - 4, w * .1, '#a8783a'); px.rect(g, cx - 4, cy + h * .3, 8, h * .3, '#6aa040'); for (let i = 0; i < 4; i++) blob(g, w * .2 + i * w * .2, h - 10, 10, '#e0b860'); } });
def('crossing', { h: 110, aspect: .9, noFlip: true, frames: 2, paint(g, w, h, v, f) { px.rect(g, w * .15, h * .2, 4, h * .8, '#e8e8f0'); px.line(g, w * .15 - 12, h * .2 - 8, w * .15 + 16, h * .2 + 8, '#ffffff', 4); px.line(g, w * .15 - 12, h * .2 + 8, w * .15 + 16, h * .2 - 8, '#ffffff', 4);
  px.line(g, w * .15 - 12, h * .2 - 8, w * .15 + 16, h * .2 + 8, '#e83a3a', 1); px.disc(g, w * .15 - 6, h * .42, 4, f ? '#ff3a3a' : '#5a1a1a'); px.disc(g, w * .15 + 8, h * .42, 4, f ? '#5a1a1a' : '#ff3a3a'); px.rect(g, w * .15, h * .7, w * .8, 5, '#f4f4f4'); for (let i = 0; i < 5; i++) px.rect(g, w * .15 + i * w * .16, h * .7, w * .08, 5, '#e83a3a'); } });
/* cliffs, lake, canyon */
def('lemontree', { h: 90, aspect: 1, paint(g, w, h, v, f, r) { trunk(g, w / 2, h, h * .45, 5, '#7a5a3a'); canopy(g, w / 2, h * .38, w * .42, h * .32, '#4a9a3a', r, 10); for (let i = 0; i < 12; i++) blob(g, w * .2 + r() * w * .6, h * .15 + r() * h * .45, 2.5, '#ffe03a'); } });
def('terraces', { h: 160, aspect: 1.6, paint(g, w, h, v, f, r) { const cols = ['#ffd0a0', '#ffb0c0', '#a8d8f0', '#fff0a0', '#f8f0e8', '#c8e8b0'];
  for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - row; i++) house(g, Math.round(6 + row * 10 + i * (w - 12 - row * 20) / (6 - row)), Math.round(h - row * h * .2), Math.round((w - 20) / 7), Math.round(h * .18), cols[(i + row * 2) % 6], '#c8604a', { flat: (i + row) % 2 === 0, windows: 1, door: false }); } });
def('chapel', { h: 150, aspect: .9, paint(g, w, h) { house(g, w * .15, h - 2, w * .6, h * .4, '#f8f4ec', '#c86a4a', { windows: 1, door: '#6a4a3a' }); px.rect(g, w * .6, h * .15, w * .22, h * .85, '#f4f0e8'); px.rect(g, w * .6, h * .15, 3, h * .85, '#ffffff'); px.poly(g, [[w * .58, h * .15], [w * .71, h * .02], [w * .84, h * .15]], '#c86a4a'); px.rect(g, w * .66, h * .22, 6, 8, '#3a3a5a'); px.rect(g, w * .7, 0, 1, h * .05, '#c8a040'); } });
def('sign', { h: 70, aspect: .7, variants: 3, noFlip: true, paint(g, w, h, v) { px.rect(g, w / 2 - 2, h * .4, 4, h * .6, '#8a8a92'); const t = ['↰', '↱', '!'][v]; px.poly(g, [[w / 2, 2], [w - 4, h * .25], [w / 2, h * .48], [4, h * .25]], '#ffd23a'); px.poly(g, [[w / 2, 6], [w - 9, h * .25], [w / 2, h * .44], [9, h * .25]], '#1a1a22'); text(g, v === 2 ? '!' : v ? '>' : '<', w / 2, h * .2, '#ffd23a', { scale: 2 }); } });
def('pine', { h: 170, aspect: .5, variants: 2, paint(g, w, h, v, f, r) { const t = T(v ? '#2a5a3a' : '#2f6a40'); trunk(g, w / 2, h, h * .8, 5, '#5a3a2a');
  for (let k = 0; k < 5; k++) { const y0 = h * (.85 - k * .17), y1 = y0 - h * .3, hw = w * (.48 - k * .08); px.poly(g, [[w / 2 - hw, y0], [w / 2, y1], [w / 2 + hw, y0]], t.base); px.poly(g, [[w / 2 - hw, y0], [w / 2, y1], [w / 2 - hw * .2, y0]], t.lt); px.poly(g, [[w / 2 + hw * .4, y0], [w / 2, y1], [w / 2 + hw, y0]], t.sh); } } });
def('reeds', { h: 30, aspect: 1.4, paint(g, w, h, v, f, r) { for (let i = 0; i < 12; i++) { const x = 2 + r() * (w - 4); px.line(g, Math.round(x), h, Math.round(x + (r() - .5) * 6), Math.round(h * .2 + r() * h * .3), '#7a9a4a', 1); if (i % 3 === 0) px.rect(g, Math.round(x - 1), Math.round(h * .25), 2, 5, '#7a4a2a'); } } });
def('boathouse', { h: 90, aspect: 1.5, paint(g, w, h) { house(g, 6, h - 10, w - 12, h * .45, '#8a5a3a', '#4a6a8a', { windows: 2, door: '#2a2a3a' }); px.rect(g, 0, h - 10, w, 4, '#6a4a2a'); for (let i = 0; i < 6; i++) px.rect(g, i * w / 5.5, h - 10, 3, 10, '#5a3a2a'); } });
def('steamer', { h: 110, aspect: 1.8, frames: 2, paint(g, w, h, v, f) { px.poly(g, [[4, h * .7], [w - 4, h * .7], [w * .9, h * .9], [w * .1, h * .9]], '#f4f0e8'); px.rect(g, w * .1, h * .7, w * .8, 3, '#c83a3a'); house(g, Math.round(w * .2), Math.round(h * .7), Math.round(w * .6), Math.round(h * .2), '#ffffff', '#c83a3a', { flat: true, windows: 6, door: false });
  px.rect(g, w * .45, h * .2, 8, h * .3, '#2a2a32'); px.rect(g, w * .45, h * .2, 8, 4, '#c83a3a'); px.disc(g, Math.round(w * .82), Math.round(h * .72), Math.round(h * .16), '#c83a3a'); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + f * .5; px.line(g, w * .82, h * .72, w * .82 + Math.cos(a) * h * .16, h * .72 + Math.sin(a) * h * .16, '#ffffff', 1); } } });
def('waterfall', { h: 200, aspect: .9, frames: 4, paint(g, w, h, v, f, r) { blob(g, w * .2, h * .35, w * .22, '#7a7a6a'); blob(g, w * .8, h * .4, w * .22, '#6a6a5a'); px.rect(g, w * .3, h * .05, w * .4, h * .9, '#a8e0f8');
  for (let i = 0; i < 40; i++) { const x = w * .3 + ((i * 37) % 100) / 100 * w * .4, y = ((i * 53 + f * 25) % 100) / 100 * h * .9 + h * .05; px.rect(g, Math.round(x), Math.round(y), 1, 6, '#ffffff'); } for (let i = 0; i < 6; i++) blob(g, w * .25 + i * w * .1, h * .95, 9, '#f0faff'); canopy(g, w * .5, h * .05, w * .5, h * .08, '#3a8a3a', r, 6); } });
def('mesa', { h: 220, aspect: 1.6, variants: 2, paint(g, w, h, v, f, r) { const t = T(v ? '#b8584a' : '#c86a4a'); px.poly(g, [[0, h], [w * .12, h * .25], [w * .2, h * .12], [w * .8, h * .1], [w * .9, h * .3], [w, h]], t.base);
  px.poly(g, [[0, h], [w * .12, h * .25], [w * .2, h * .12], [w * .3, h * .12], [w * .2, h]], t.lt); px.poly(g, [[w * .75, h], [w * .8, h * .1], [w * .9, h * .3], [w, h]], t.sh); for (let i = 1; i < 6; i++) px.rect(g, w * .1, h * (.1 + i * .15), w * .8, 2, t.sh); } });
def('cactus', { h: 90, aspect: .7, variants: 2, paint(g, w, h, v) { const t = T('#3a8a4a'); const arm = (x, y0, y1, c) => { px.rect(g, Math.round(x - 4), Math.round(y1), 8, Math.round(y0 - y1), t.base); px.rect(g, Math.round(x - 4), Math.round(y1), 2, Math.round(y0 - y1), t.lt); px.disc(g, Math.round(x), Math.round(y1), 4, t.base); };
  arm(w / 2, h, h * .08); arm(w * .22, h * .55, h * .3); px.rect(g, w * .22, h * .52, w * .28, 6, t.base); arm(w * .78, h * .65, h * .38); px.rect(g, w * .5, h * .6, w * .28, 6, t.base);
  for (const [x, y] of [[w / 2, h * .06], [w * .22, h * .28], [w * .78, h * .36]]) { px.disc(g, Math.round(x), Math.round(y), 3, v ? '#ff7ab8' : '#ffd23a'); px.rect(g, Math.round(x - 1), Math.round(y - 1), 2, 2, '#ffffff'); } } });
def('nightcactus', { h: 80, aspect: .7, emissive: true, paint(g, w, h) { const t = T('#2a5a4a'); px.rect(g, w / 2 - 4, h * .1, 8, h * .9, t.base); px.rect(g, w * .22 - 3, h * .35, 6, h * .25, t.base); px.rect(g, w * .22, h * .55, w * .28, 5, t.base);
  for (const [x, y] of [[w / 2, h * .08], [w * .22, h * .33], [w / 2 + 6, h * .4]]) { px.disc(g, Math.round(x), Math.round(y), 5, '#f8f8ff'); px.disc(g, Math.round(x), Math.round(y), 2, '#fff8c0'); } } });
def('souvenir', { h: 80, aspect: 1.3, noFlip: true, paint(g, w, h) { px.rect(g, 6, h * .45, w - 12, h * .53, '#e8c890'); for (let i = 0; i < 6; i++) px.rect(g, 4 + i * (w - 8) / 6, h * .32, (w - 8) / 6, h * .14, i % 2 ? '#ff7ab8' : '#ffffff'); text(g, 'GNOMES!', w / 2, h * .06, '#c83a3a');
  for (let i = 0; i < 4; i++) { const x = 12 + i * (w - 24) / 3; px.poly(g, [[x - 4, h * .6], [x, h * .45], [x + 4, h * .6]], '#e83a3a'); px.rect(g, x - 3, h * .6, 6, 6, '#f0d8b8'); px.rect(g, x - 3, h * .7, 6, 6, '#3a5ab0'); } } });
/* alpine, town, vineyard */
def('cherry', { h: 120, aspect: 1, variants: 2, paint(g, w, h, v, f, r) { trunk(g, w / 2, h, h * .5, 6, '#5a3a3a'); px.line(g, w / 2, h * .6, w * .3, h * .4, '#5a3a3a', 3); px.line(g, w / 2, h * .6, w * .7, h * .42, '#5a3a3a', 3); canopy(g, w / 2, h * .36, w * .46, h * .3, v ? '#ffb0c8' : '#ffc0d8', r, 12); for (let i = 0; i < 10; i++) px.rect(g, Math.round(r() * w), Math.round(h * .7 + r() * h * .3), 2, 1, '#ffc0d8'); } });
def('chalet', { h: 120, aspect: 1.3, paint(g, w, h) { house(g, 8, h - 2, w - 16, h * .45, '#a8784a', '#5a3a2a', { windows: 3, shutters: '#c83a3a', roofH: h * .4 }); px.rect(g, 8, h * .6, w - 16, 3, '#6a4a2a'); for (let i = 0; i < 6; i++) px.rect(g, 10 + i * (w - 20) / 5, h * .62, 2, 6, '#6a4a2a'); px.poly(g, [[4, h * .55 - h * .02], [w / 2, h * .12], [w - 4, h * .55]], '#ffffff'); px.poly(g, [[8, h * .55], [w / 2, h * .17], [w - 8, h * .55]], '#5a3a2a'); } });
def('cow', { h: 40, aspect: 1.5, paint(g, w, h) { px.rect(g, w * .2, h * .35, w * .55, h * .35, '#f4f0e8'); px.rect(g, w * .35, h * .4, 8, 6, '#2a2a2a'); px.rect(g, w * .55, h * .5, 6, 5, '#2a2a2a'); px.rect(g, w * .7, h * .25, w * .2, h * .22, '#f4f0e8'); px.rect(g, w * .82, h * .32, 4, 3, '#ffb0a0'); for (const x of [.25, .35, .6, .7]) px.rect(g, w * x, h * .7, 3, h * .3, '#3a3a3a'); px.rect(g, w * .72, h * .22, 2, 3, '#e8d8b0'); } });
def('streetlamp', { h: 130, aspect: .45, emissive: false, paint(g, w, h) { px.rect(g, w / 2 - 2, h * .15, 4, h * .85, '#3a3a48'); px.rect(g, w / 2 - 6, h - 6, 12, 6, '#3a3a48'); px.line(g, w / 2, h * .15, w * .85, h * .12, '#3a3a48', 3); px.rect(g, w * .7, h * .12, 9, 6, '#4a4a58'); px.rect(g, w * .72, h * .16, 7, 3, '#fff0b0'); } });
def('lamp', { h: 120, aspect: .4, paint(g, w, h) { px.rect(g, w / 2 - 2, h * .12, 4, h * .88, '#e8e8f0'); px.disc(g, w / 2, h * .1, 5, '#fff4c0'); px.rect(g, w / 2 - 5, h * .02, 10, 3, '#c8c8d0'); } });
def('stall', { h: 80, aspect: 1.3, variants: 2, paint(g, w, h, v, f, r) { px.rect(g, 6, h * .5, w - 12, h * .48, '#a8784a'); const c = v ? '#2a8a5a' : '#d8402a'; for (let i = 0; i < 6; i++) px.poly(g, [[4 + i * (w - 8) / 6, h * .25], [4 + (i + 1) * (w - 8) / 6, h * .25], [4 + (i + 1) * (w - 8) / 6, h * .42], [4 + i * (w - 8) / 6, h * .42]], i % 2 ? c : '#ffffff');
  for (let i = 0; i < 14; i++) blob(g, 10 + r() * (w - 20), h * .45 + r() * h * .1, 3, OB.pick(r, ['#ff7ab8', '#ffd23a', '#ff5a3a', '#b07ae8', '#ffffff'])); px.rect(g, 6, h * .25, 2, h * .73, '#6a4a2a'); px.rect(g, w - 8, h * .25, 2, h * .73, '#6a4a2a'); } });
def('planter', { h: 40, aspect: 1.2, paint(g, w, h, v, f, r) { px.rect(g, w * .15, h * .5, w * .7, h * .5, '#c8704a'); px.rect(g, w * .15, h * .5, w * .7, 3, '#e8906a'); for (let i = 0; i < 10; i++) blob(g, w * .2 + r() * w * .6, h * .3 + r() * h * .25, 4, OB.pick(r, ['#ff5a7a', '#ffd23a', '#ff9ac8', '#4a9a4a'])); } });
def('fountain', { h: 90, aspect: 1.3, frames: 3, paint(g, w, h, v, f, r) { px.ell(g, w / 2, h * .85, w * .46, h * .12, '#c8c0b0'); px.ell(g, w / 2, h * .82, w * .4, h * .08, '#6ab8e8'); px.rect(g, w / 2 - 4, h * .4, 8, h * .42, '#d8d0c0'); px.ell(g, w / 2, h * .42, w * .2, h * .05, '#c8c0b0');
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI, d = (f / 3 + i * .13) % 1; px.rect(g, Math.round(w / 2 + Math.cos(a) * w * .35 * d), Math.round(h * .38 - Math.sin(a) * h * .3 * (1 - d) * d * 4), 2, 2, '#e8f8ff'); } } });
def('dome', { h: 240, aspect: 1, paint(g, w, h) { const t = T('#c8704a'); house(g, Math.round(w * .1), h - 2, Math.round(w * .8), Math.round(h * .3), '#f0e4d0', '#c8704a', { flat: true, windows: 5, door: '#6a4a3a' }); px.rect(g, w * .25, h * .45, w * .5, h * .25, '#f0e4d0');
  px.disc(g, Math.round(w / 2), Math.round(h * .45), Math.round(w * .28), t.base); px.rect(g, w * .2, h * .45, w * .62, h * .05, '#f0e4d0'); px.disc(g, Math.round(w * .44), Math.round(h * .35), Math.round(w * .1), t.lt); for (let k = -2; k <= 2; k++) px.line(g, w / 2 + k * w * .1, h * .45, w / 2 + k * w * .03, h * .18, t.sh, 1);
  px.rect(g, w / 2 - 4, h * .1, 8, h * .08, '#f0e4d0'); px.rect(g, w / 2 - 1, h * .02, 2, h * .08, '#c8a040'); px.rect(g, w * .85, h * .2, w * .1, h * .8, '#f0e4d0'); px.poly(g, [[w * .84, h * .2], [w * .9, h * .1], [w * .96, h * .2]], '#c8704a'); } });
def('villa', { h: 120, aspect: 1.5, paint(g, w, h, v, f, r) { house(g, 8, h - 2, Math.round(w * .6), Math.round(h * .45), '#e8c890', '#c8604a', { windows: 3, shutters: '#4a7a5a', floors: 2 }); house(g, Math.round(w * .66), h - 2, Math.round(w * .26), Math.round(h * .3), '#e0c088', '#c8604a', { windows: 1 }); px.ell(g, w * .96, h * .5, 4, h * .45, '#2f6a3a'); } });
def('castle', { h: 230, aspect: 1.5, paint(g, w, h, v, f, r) { px.poly(g, [[0, h], [w * .2, h * .55], [w * .5, h * .45], [w * .8, h * .55], [w, h]], '#7a9a5a'); px.poly(g, [[0, h], [w * .2, h * .55], [w * .3, h * .52], [w * .25, h]], '#8aaa6a');
  const st = '#c8b8a0'; px.rect(g, w * .25, h * .25, w * .5, h * .25, st); for (let i = 0; i < 10; i++) if (i % 2 === 0) px.rect(g, w * .25 + i * w * .05, h * .22, w * .05, h * .04, st);
  for (const x of [.22, .72]) { px.rect(g, w * x, h * .12, w * .08, h * .38, '#d8c8b0'); px.poly(g, [[w * x - 2, h * .12], [w * (x + .04), h * .02], [w * (x + .08) + 2, h * .12]], '#8a4a5a'); } px.rect(g, w * .45, h * .38, w * .1, h * .12, '#4a3a3a'); } });
def('winecart', { h: 60, aspect: 1.6, paint(g, w, h) { px.rect(g, w * .15, h * .35, w * .6, h * .3, '#8a5a3a'); for (let i = 0; i < 3; i++) { px.ell(g, Math.round(w * .25 + i * w * .17), Math.round(h * .3), 8, 7, '#a8683a'); px.rect(g, Math.round(w * .25 + i * w * .17 - 8), Math.round(h * .28), 16, 2, '#5a3a2a'); } px.disc(g, w * .3, h * .75, h * .2, '#5a3a2a'); px.disc(g, w * .65, h * .75, h * .2, '#5a3a2a'); px.disc(g, w * .3, h * .75, h * .08, '#c8a060'); px.disc(g, w * .65, h * .75, h * .08, '#c8a060'); px.line(g, w * .75, h * .5, w, h * .6, '#5a3a2a', 2); } });
def('barrel', { h: 34, aspect: 1.5, paint(g, w, h) { for (let i = 0; i < 2; i++) { const x = w * .28 + i * w * .44; px.ell(g, Math.round(x), Math.round(h * .55), Math.round(w * .2), Math.round(h * .42), '#9a5a2a'); px.rect(g, Math.round(x - w * .2), Math.round(h * .3), Math.round(w * .4), 2, '#4a3a2a'); px.rect(g, Math.round(x - w * .2), Math.round(h * .75), Math.round(w * .4), 2, '#4a3a2a'); px.rect(g, Math.round(x - w * .12), Math.round(h * .25), 3, Math.round(h * .55), '#b8783a'); } } });
/* lagoon, jungle, night, highlands */
def('flamingo', { h: 40, aspect: .8, variants: 2, frames: 2, paint(g, w, h, v, f) { const c = '#ff8ab0'; px.line(g, w * .5, h, w * .5, h * .55, '#e86a90', 1); if (!f) px.line(g, w * .55, h, w * .55, h * .55, '#e86a90', 1); px.ell(g, Math.round(w * .5), Math.round(h * .48), Math.round(w * .28), Math.round(h * .12), c);
  px.line(g, w * .7, h * .45, w * .72, h * .15, c, 2); px.disc(g, Math.round(w * .72), Math.round(h * .14), 3, c); px.line(g, w * .74, h * .15, w * .86, h * .22, '#2a2a2a', 2); } });
def('saltpile', { h: 70, aspect: 1.5, paint(g, w, h) { px.poly(g, [[0, h], [w * .5, h * .1], [w, h]], '#f8f8fc'); px.poly(g, [[w * .5, h * .1], [w, h], [w * .62, h]], '#d8d8e8'); px.poly(g, [[0, h], [w * .5, h * .1], [w * .35, h]], '#ffffff'); } });
def('liftbridge', { h: 200, aspect: .5, paint(g, w, h) { for (const x of [.2, .7]) { px.rect(g, w * x, h * .05, w * .12, h * .95, '#8a8a98'); px.rect(g, w * x, h * .05, 3, h * .95, '#b0b0c0'); } px.rect(g, w * .2, h * .08, w * .62, h * .06, '#6a6a78'); for (let i = 0; i < 6; i++) px.line(g, w * .2, h * .14 + i * h * .12, w * .82, h * .2 + i * h * .12, '#7a7a88', 1); px.disc(g, w * .5, h * .03, 3, '#ff3a3a'); } });
def('jpalm', { h: 170, aspect: .8, variants: 2, paint(g, w, h, v, f, r) { let x = w / 2, y = h; for (let i = 0; i < 12; i++) { const nx = x + (v ? -1.2 : 1.2), ny = y - h * .06; px.line(g, Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), i % 2 ? '#7a5a3a' : '#8a6a42', 5); x = nx; y = ny; }
  for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .5, len = w * .45; for (let s = 0; s < 6; s++) { const u = s / 6; px.ell(g, Math.round(x + Math.cos(a) * len * u), Math.round(y + Math.sin(a) * len * u + u * u * len * .4), 6, 3, k % 2 ? '#1f6a2a' : '#2f8a3a'); } } } });
def('giantleaf', { h: 60, aspect: 1.3, variants: 2, paint(g, w, h, v, f, r) { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .55, cx = w / 2 + Math.cos(a) * w * .25, cy = h * .6 + Math.sin(a) * h * .35; px.ell(g, Math.round(cx), Math.round(cy), Math.round(w * .18), Math.round(h * .22), k % 2 ? '#2a8a3a' : '#3aa04a'); px.line(g, w / 2, h, cx, cy, '#1a5a2a', 1); } } });
def('fern', { h: 34, aspect: 1.5, paint(g, w, h, v, f, r) { for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI; px.line(g, w / 2, h, Math.round(w / 2 + Math.cos(a) * w * .45), Math.round(h + Math.sin(a) * h * .9), k % 2 ? '#3a9a4a' : '#2a7a3a', 2); } } });
def('orchid', { h: 34, aspect: 1, emissive: true, variants: 2, paint(g, w, h, v, f, r) { px.line(g, w / 2, h, w / 2, h * .3, '#3a7a3a', 1); px.ell(g, w * .35, h * .85, 6, 3, '#3a9a4a'); for (let i = 0; i < 4; i++) { const x = w * .3 + i * w * .14, y = h * .2 + (i % 2) * 6; px.disc(g, Math.round(x), Math.round(y), 3, v ? '#ff7ae0' : '#c87aff'); px.rect(g, Math.round(x), Math.round(y), 1, 1, '#ffffff'); } } });
def('parrot', { h: 30, aspect: .7, frames: 2, paint(g, w, h, v, f) { px.ell(g, w / 2, h * .5, w * .25, h * .3, '#e83a3a'); px.disc(g, Math.round(w / 2), Math.round(h * .2), 4, '#e83a3a'); px.rect(g, w / 2 + 2, h * .18, 3, 2, '#ffd23a'); px.poly(g, [[w * .3, h * .45], [f ? 0 : w * .1, f ? h * .2 : h * .7], [w * .4, h * .6]], '#3a8ae8'); px.line(g, w / 2, h * .8, w / 2, h, '#3aa04a', 2); } });
def('ruin', { h: 120, aspect: 1.1, paint(g, w, h, v, f, r) { const st = '#8a8a7a'; for (const x of [.15, .7]) { px.rect(g, w * x, h * .2, w * .15, h * .8, st); px.rect(g, w * x, h * .2, 3, h * .8, '#a8a898'); } px.rect(g, w * .1, h * .12, w * .8, h * .1, st); for (let i = 0; i < 6; i++) blob(g, w * .1 + r() * w * .8, h * .1 + r() * h * .5, 5, '#3a8a3a'); } });
def('neon', { h: 120, aspect: 1, variants: 4, noFlip: true, emissive: true, paint(g, w, h, v) { const s = [['BAR', '#ff4aa0'], ['HOTEL', '#4ae8ff'], ['GELATO', '#ffe04a'], ['CASINO', '#b04aff']][v]; px.rect(g, w / 2 - 2, h * .45, 4, h * .55, '#2a2a3a'); px.rect(g, 4, 6, w - 8, h * .4, '#1a1428'); px.rect(g, 6, 8, w - 12, 2, s[1]); px.rect(g, 6, h * .4, w - 12, 2, s[1]); text(g, s[0], w / 2, h * .16, s[1], { scale: s[0].length > 4 ? 1 : 2 }); } });
def('yacht', { h: 90, aspect: 1.7, emissive: false, paint(g, w, h) { px.poly(g, [[4, h * .65], [w - 4, h * .65], [w * .88, h * .85], [w * .12, h * .85]], '#f8f8fc'); px.rect(g, w * .25, h * .45, w * .5, h * .2, '#e8e8f4'); for (let i = 0; i < 6; i++) px.rect(g, w * .28 + i * w * .08, h * .5, 4, 4, '#ffd870'); px.line(g, w * .5, h * .45, w * .5, h * .05, '#c8c8d8', 1); px.disc(g, w * .5, h * .05, 2, '#ff3a3a'); } });
def('sailboat', { h: 120, aspect: .8, paint(g, w, h) { px.poly(g, [[w * .1, h * .8], [w * .9, h * .8], [w * .78, h * .92], [w * .22, h * .92]], '#f4f0e8'); px.line(g, w * .5, h * .8, w * .5, h * .05, '#8a6a4a', 2); px.poly(g, [[w * .52, h * .08], [w * .52, h * .75], [w * .9, h * .75]], '#ffffff'); px.poly(g, [[w * .48, h * .15], [w * .48, h * .75], [w * .15, h * .75]], '#ffb0a0'); } });
def('motel', { h: 130, aspect: 1.6, noFlip: true, emissive: false, paint(g, w, h) { house(g, 6, h - 2, Math.round(w * .7), Math.round(h * .3), '#e8c8a8', '#8a6a5a', { flat: true, windows: 6, lit: '#ffd870', door: '#4a3a5a' }); px.rect(g, w * .8, h * .1, 4, h * .9, '#4a4a58'); px.rect(g, w * .7, h * .05, w * .28, h * .25, '#1a1428'); text(g, 'MOTEL', w * .84, h * .1, '#ff4aa0'); text(g, 'VACANCY', w * .84, h * .2, '#4ae8a0'); } });
def('dish', { h: 200, aspect: .9, paint(g, w, h) { px.rect(g, w * .45, h * .55, w * .1, h * .45, '#c8c8d0'); px.poly(g, [[w * .3, h], [w * .5, h * .55], [w * .7, h]], '#a8a8b8'); px.ell(g, Math.round(w * .5), Math.round(h * .38), Math.round(w * .44), Math.round(h * .22), '#e8e8f0'); px.ell(g, Math.round(w * .5), Math.round(h * .38), Math.round(w * .36), Math.round(h * .16), '#c8c8d8'); px.line(g, w * .5, h * .38, w * .5, h * .12, '#8a8a98', 2); px.disc(g, w * .5, h * .12, 3, '#ff3a3a'); } });
def('standingstone', { h: 90, aspect: .5, variants: 2, paint(g, w, h, v, f, r) { const t = T('#8a8a8a'); px.poly(g, [[w * .15, h], [w * .2, h * .1], [w * .5, h * .02], [w * .8, h * .15], [w * .85, h]], t.base); px.poly(g, [[w * .15, h], [w * .2, h * .1], [w * .4, h * .06], [w * .35, h]], t.lt); for (let i = 0; i < 8; i++) px.rect(g, Math.round(w * .3 + r() * w * .4), Math.round(r() * h), 2, 2, '#6a8a5a'); } });
def('castleruin', { h: 180, aspect: 1.4, paint(g, w, h, v, f, r) { const st = '#7a7a80'; px.rect(g, w * .1, h * .3, w * .3, h * .7, st); px.rect(g, w * .1, h * .3, 4, h * .7, '#9a9aa0'); px.poly(g, [[w * .4, h], [w * .4, h * .5], [w * .55, h * .62], [w * .7, h * .45], [w * .9, h], ], st); px.rect(g, w * .18, h * .4, 6, 10, '#2a2a3a'); for (let i = 0; i < 5; i++) if (i % 2 === 0) px.rect(g, w * .1 + i * w * .06, h * .26, w * .06, h * .05, st); } });
def('sheep', { h: 30, aspect: 1.4, paint(g, w, h, v, f, r) { for (let i = 0; i < 6; i++) px.disc(g, Math.round(w * .3 + r() * w * .35), Math.round(h * .45 + r() * h * .15), 6, '#f4f0e8'); px.disc(g, Math.round(w * .78), Math.round(h * .42), 4, '#2a2a2a'); for (const x of [.32, .5, .62]) px.rect(g, w * x, h * .7, 2, h * .3, '#2a2a2a'); } });
def('volleyball', { h: 70, aspect: 1.6, paint(g, w, h) { for (const x of [.1, .88]) px.rect(g, w * x, h * .2, 3, h * .8, '#f4f4f4'); px.rect(g, w * .1, h * .25, w * .8, h * .18, '#2a2a32'); for (let i = 0; i < 12; i++) px.rect(g, w * .1 + i * w * .066, h * .25, 1, h * .18, '#f4f4f4'); px.rect(g, w * .1, h * .25, w * .8, 2, '#f4f4f4'); px.disc(g, w * .6, h * .1, 4, '#ffd23a'); } });
def('casino', { h: 260, aspect: 1, noFlip: true, emissive: true, frames: 2, paint(g, w, h, v, f) { house(g, Math.round(w * .1), h - 2, Math.round(w * .8), Math.round(h * .45), '#2a2448', '#1a1430', { flat: true, windows: 8, floors: 4, lit: '#ffd870', door: '#ffd870' });
  const cx = w / 2, cy = h * .28; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + f * .2; px.ell(g, Math.round(cx + Math.cos(a) * w * .16), Math.round(cy + Math.sin(a) * w * .16), 10, 10, k % 2 ? '#ff4aa0' : (f ? '#ff8ad0' : '#ff4aa0')); } px.disc(g, cx, cy, 10, '#ffe04a'); text(g, 'CASINO FIORE', w / 2, h * .5, '#4ae8ff'); } });
def('funicular', { h: 220, aspect: .6, paint(g, w, h) { px.line(g, w * .1, h, w * .9, h * .05, '#5a5a68', 3); px.line(g, w * .2, h, w, h * .1, '#5a5a68', 1); px.rect(g, w * .4, h * .45, w * .3, h * .1, '#ff5a3a'); for (let i = 0; i < 3; i++) px.rect(g, w * .43 + i * w * .08, h * .47, 3, 3, '#ffd870'); } });
/* the road's furniture */
def('cushion', { h: 36, aspect: 1.4, variants: 2, paint(g, w, h, v, f, r) { px.rect(g, w * .1, h * .45, w * .8, h * .55, '#e8e8e8'); for (let i = 0; i < 4; i++) px.rect(g, w * .1 + i * w * .2, h * .45, w * .1, h * .55, '#e83a3a'); for (let i = 0; i < 9; i++) blob(g, w * .15 + r() * w * .7, h * .25 + r() * h * .2, 4, OB.pick(r, v ? ['#ffd23a', '#ff7ab8'] : ['#ff5a7a', '#ffffff', '#b07ae8'])); } });
def('barrier', { h: 50, aspect: 3, paint(g, w, h) { for (let i = 0; i < 10; i++) px.poly(g, [[i * w / 10, h * .35], [(i + 1) * w / 10, h * .35], [(i + .6) * w / 10, h * .7], [(i - .4) * w / 10, h * .7]], i % 2 ? '#e83a3a' : '#ffffff'); px.rect(g, w * .1, h * .7, 4, h * .3, '#5a5a62'); px.rect(g, w * .9 - 4, h * .7, 4, h * .3, '#5a5a62'); px.rect(g, w * .3, 0, w * .4, h * .32, '#ffffff'); text(g, 'ROAD CLOSED', w / 2, 2, '#e83a3a'); } });
def('windsock', { h: 100, aspect: .7, frames: 3, paint(g, w, h, v, f) { px.rect(g, w * .2, h * .1, 3, h * .9, '#c8c8d0'); for (let i = 0; i < 4; i++) px.poly(g, [[w * .22 + i * w * .15, h * .1 + i * 2 + Math.sin(f + i) * 2], [w * .22 + (i + 1) * w * .15, h * .12 + i * 2 + Math.sin(f + i + 1) * 2], [w * .22 + (i + 1) * w * .15, h * .26 - i * 2], [w * .22 + i * w * .15, h * .28 - i * 2]], i % 2 ? '#ffffff' : '#ff7a1a'); } });
def('spectators', { h: 60, aspect: 1.8, variants: 4, frames: 2, paint(g, w, h, v, f, r) { const pals = [['#ff5f7a', '#3ab0e8', '#ffd23a'], ['#7ad860', '#ff9a3a', '#ffffff'], ['#b07ae8', '#ff7ab8', '#3a8ae8'], ['#e8c050', '#ff5a3a', '#4ae8c8']][v];
  for (let i = 0; i < 7; i++) { const x = 6 + i * (w - 12) / 6, y = h - 4 - (i % 2) * 6, c = pals[i % 3], up = (i + f) % 2; px.rect(g, Math.round(x - 3), Math.round(y - 16), 7, 12, c); px.disc(g, Math.round(x), Math.round(y - 20), 4, OB.pick(r, ['#f0c8a0', '#c8905a', '#8a5a3a'])); px.rect(g, Math.round(x - 3), Math.round(y - 4), 2, 4, '#3a3a4a'); px.rect(g, Math.round(x + 2), Math.round(y - 4), 2, 4, '#3a3a4a');
    px.line(g, Math.round(x + 3), Math.round(y - 14), Math.round(x + 7), Math.round(y - (up ? 26 : 14)), c, 2); if (i % 3 === 0 && up) px.rect(g, Math.round(x + 6), Math.round(y - 30), 5, 4, '#ffd23a'); } } });
def('crowd', { h: 70, aspect: 2.4, variants: 4, frames: 2, paint(g, w, h, v, f, r) { const sp = Art.sprite('spectators', v, f); g.drawImage(sp.cv, 0, h - sp.h, w / 2, sp.h); g.drawImage(Art.sprite('spectators', (v + 1) % 4, 1 - f).cv, w / 2, h - sp.h); for (let i = 0; i < 6; i++) blob(g, 6 + i * w / 6, 10 + (i % 2) * 6, 7, OB.pick(r, ['#ff7ab8', '#ffd23a', '#3ab0e8'])); } });

/* ---- drawing a thing on the road ---- */
const NO_TINT = { emissive: true };
const tinted = new Map();
function tintOf(spr, tint) {
  if (!tint || spr.emissive) return spr.cv;
  const key = spr.cv.__id || (spr.cv.__id = Math.random().toString(36).slice(2)), k2 = key + tint;
  if (tinted.has(k2)) return tinted.get(k2);
  const cv = mk(spr.w, spr.h), g = E.ctx2d(cv); g.drawImage(spr.cv, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 1; g.fillStyle = tint.split('|')[0]; g.globalAlpha = +tint.split('|')[1]; g.fillRect(0, 0, spr.w, spr.h);
  tinted.set(k2, cv); return cv;
}
Art.tint = null;   // the race sets a tint per stage's time of day: '#1a1a4a|.55' (night) ...
Art.drawThing = (g, th, sx, sy, scale, t, rowTh) => {
  const meta = rowTh || th; if (meta.hidden) return;
  if (th.kind === 'gantry') return Art.drawGantry(g, sx, sy, scale, t);
  if (th.kind === 'bruno') return OB.Cast && OB.Cast.drawBruno(g, sx, sy, scale, t);
  if (th.kind === 'startgrid') return;
  if (th.kind === 'forksign') return Art.drawForkSign(g, th, sx, sy, scale, t);
  const d = DEF[th.kind]; if (!d) return;
  const fr = d.frames > 1 ? Math.floor(t * (th.kind === 'turbine' ? 6 : th.kind === 'ferris' ? 4 : th.kind === 'waterfall' ? 8 : 3) + (th.variant || 0)) : 0;
  const spr = Art.sprite(th.kind, th.variant || 0, fr), hpx = th.h * scale, k = hpx / spr.h;
  if (hpx < 1.2) return;
  const w = spr.w * k, cv = tintOf(spr, Art.tint);
  const x = Math.round(sx - w / 2), y = Math.round(sy - hpx);
  if (th.flip && !d.noFlip) { g.save(); g.translate(x + Math.round(w), y); g.scale(-1, 1); g.drawImage(cv, 0, 0, Math.max(1, Math.round(w)), Math.max(1, Math.round(hpx))); g.restore(); }
  else g.drawImage(cv, x, y, Math.max(1, Math.round(w)), Math.max(1, Math.round(hpx)));
  if (Art.night && (th.kind === 'streetlamp' || th.kind === 'lamp') && hpx > 6) { const a = g.globalAlpha; g.globalAlpha = a * .35; px.disc(g, Math.round(sx + (th.kind === 'streetlamp' ? w * .3 : 0)), Math.round(y + hpx * .12), Math.round(hpx * .12), '#fff0a0'); g.globalAlpha = a; px.reset(g); }
  if (OB.cheats.hitboxes && meta.solid) { const ww = th.w * scale; px.rect(g, Math.round(sx - ww / 2), Math.round(sy - 2), Math.max(1, Math.round(ww)), 2, '#ff00ff'); }
};
/** the start gantry: a frame over the grid with five lamps for the countdown */
Art.gantryLamps = 0;
Art.drawGantry = (g, sx, sy, scale, t) => {
  const half = 2000 * 1.3 * scale, H = 2300 * scale; if (half < 3) return;
  const post = Math.max(1, 120 * scale);
  for (const sd of [-1, 1]) px.rect(g, Math.round(sx + sd * half - post / 2), Math.round(sy - H), Math.round(post), Math.round(H), '#3a3a48');
  px.rect(g, Math.round(sx - half), Math.round(sy - H), Math.round(half * 2), Math.max(2, Math.round(H * .16)), '#2a2a38');
  const n = 5, lit = Art.gantryLamps;
  for (let i = 0; i < n; i++) { const lx = sx - half * .5 + i * half * .25, c = lit >= 4 ? '#5aff7a' : i < lit * 5 / 3 ? '#ff3a3a' : '#5a1a1a'; px.disc(g, Math.round(lx), Math.round(sy - H * .92), Math.max(1, Math.round(H * .045)), c); }
  if (half > 40) text(g, 'OUTBLOOM 2006', sx, sy - H * .99 - 1, '#ffd23a', { scale: half > 160 ? 2 : 1 });
};
/** the fork sign in the gore: both stage names, arrows, difficulty flowers */
Art.drawForkSign = (g, th, sx, sy, scale, t) => {
  const W = 2600 * scale, H = 1300 * scale, top = sy - 3000 * scale; if (W < 4) return;
  const id = th.data && th.data.stage, f = OB.FORKS[id]; if (!f) return;
  px.rect(g, Math.round(sx - W * .3), Math.round(top + H), Math.max(1, Math.round(W * .04)), Math.round(sy - top - H), '#5a5a68'); px.rect(g, Math.round(sx + W * .26), Math.round(top + H), Math.max(1, Math.round(W * .04)), Math.round(sy - top - H), '#5a5a68');
  px.rect(g, Math.round(sx - W / 2), Math.round(top), Math.round(W), Math.round(H), '#1a5a3a'); px.rect(g, Math.round(sx - W / 2 + 2), Math.round(top + 2), Math.round(W - 4), Math.max(1, Math.round(H - 4)), '#2a7a4a');
  px.rect(g, Math.round(sx - 1), Math.round(top + H * .1), 2, Math.round(H * .8), '#ffffff');
  if (W > 60) {
    const sc = W > 260 ? 2 : 1;
    f.forEach((s, i) => { const x = sx + (i ? W * .25 : -W * .25), S = OB.STAGES[s]; text(g, (i ? '' : '← ') + S.name.toUpperCase().split(' ').slice(-1)[0] + (i ? ' →' : ''), x, top + H * .18, '#ffffff', { scale: sc });
      if (W > 120) for (let k = 0; k < 5; k++) Art.icon(g, k < S.diff ? 'flower' : 'flowerOff', x - 14 * sc + k * 6 * sc, top + H * .62, sc); });
  }
};
/** banner text on an arch (CHECKPOINT, GOAL) */
Art.bannerText = (g, s, x, y, half, bh, sc, c, back) => { if (half < 30) return; const scale = half > 260 ? 3 : half > 110 ? 2 : 1; E.font.text(g, s, Math.round(x), Math.round(y + bh / 2 - 4 * scale), c, { align: 'center', scale, outline: false, shadow: back }); };

/* ---- skies ---- */
const skyCache = new Map();
function layerStrip(L, W, H, sky) {
  const key = JSON.stringify(L) + W + 'x' + H;
  if (skyCache.has(key)) return skyCache.get(key);
  const w = 1024, hh = Math.max(4, Math.round(H * (L.height || .2) + 8)), cv = mk(w, hh), g = E.ctx2d(cv), r = R(OB.hashStr(key) ^ (L.seed || 0)), t = T(L.color || '#5a6a8a');
  if (OB.env.headless) { skyCache.set(key, cv); return cv; }
  const top = 4, base = hh;
  if (L.kind === 'hills' || L.kind === 'mountains' || L.kind === 'mesa') {
    const pts = [[0, base]]; let y = 0;
    for (let x = 0; x <= w; x += L.kind === 'mountains' ? 8 : 16) {
      if (L.kind === 'mountains') y = Math.abs(Math.sin(x * .011 + (L.seed || 0)) * .6 + Math.sin(x * .031) * .3 + Math.sin(x * .07) * .1);
      else if (L.kind === 'mesa') y = Math.sin(x * .006 + (L.seed || 1)) > .2 ? .8 + Math.sin(x * .05) * .05 : .25 + Math.sin(x * .03) * .1;
      else y = .5 + Math.sin(x * .012 + (L.seed || 0)) * .25 + Math.sin(x * .033) * .15;
      pts.push([x, top + (1 - y) * (hh - top)]);
    }
    pts.push([w, base]); px.poly(g, pts, t.base);
    if (L.kind === 'mountains' && L.snow) for (let i = 1; i < pts.length - 2; i++) { const p = pts[i]; if (p[1] < hh * .4) px.poly(g, [[p[0] - 6, p[1] + 6], [p[0], p[1]], [p[0] + 6, p[1] + 6]], L.snow); }
    for (let i = 1; i < pts.length - 2; i++) { const p = pts[i]; px.rect(g, p[0], p[1], 3, 1, t.lt); }
    if (L.pines || L.cypress || L.jungle) for (let x = 0; x < w; x += 5 + r() * 9) { const y0 = top + (1 - (.5 + Math.sin(x * .012 + (L.seed || 0)) * .25 + Math.sin(x * .033) * .15)) * (hh - top); if (L.jungle) px.disc(g, Math.round(x), Math.round(y0), 3 + Math.round(r() * 3), t.sh); else px.poly(g, [[x - 2, y0 + 2], [x, y0 - (L.cypress ? 9 : 6)], [x + 2, y0 + 2]], t.sh); }
  } else if (L.kind === 'sea') {
    px.rect(g, 0, 0, w, hh, t.base);
    for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * hh; px.rect(g, Math.round(x), Math.round(y), 2 + Math.round(r() * 5), 1, i % 3 ? t.lt : (L.hi || t.hi)); }
  } else if (L.kind === 'village' || L.kind === 'roofs') {
    for (let x = 0; x < w; x += 7 + r() * 8) { const hgt = 6 + r() * hh * .5, c = OB.pick(r, L.kind === 'roofs' ? ['#d8a080', '#e8c090', '#c89070'] : ['#ffd0a0', '#ffb0c0', '#a8d8f0', '#fff0a0', '#f8f0e8']); px.rect(g, Math.round(x), Math.round(base - hgt), 7, Math.round(hgt), c); px.rect(g, Math.round(x), Math.round(base - hgt), 7, 2, '#c8604a'); }
  } else if (L.kind === 'skyline') {
    for (let x = 0; x < w; x += 10 + r() * 14) { const hgt = 10 + r() * (hh - 14), bw = 9 + r() * 12; px.rect(g, Math.round(x), Math.round(base - hgt), Math.round(bw), Math.round(hgt), t.base); for (let yy = base - hgt + 3; yy < base - 3; yy += 4) for (let xx = x + 2; xx < x + bw - 2; xx += 3) if (r() < .45) px.rect(g, Math.round(xx), Math.round(yy), 1, 2, r() < .2 ? '#ff7ad0' : '#ffd870'); }
  } else if (L.kind === 'saltpyramids') {
    for (let x = 0; x < w; x += 20 + r() * 40) { const s2 = 4 + r() * 8; px.poly(g, [[x - s2, base], [x, base - s2], [x + s2, base]], '#f8f8fc'); }
  } else if (L.kind === 'train') {
    for (let k = 0; k < 7; k++) { const x = 300 + k * 26; px.rect(g, x, base - 9, 24, 8, k ? '#3a6ab0' : '#c83a3a'); for (let j = 0; j < 4; j++) px.rect(g, x + 3 + j * 5, base - 7, 3, 3, '#ffe8a0'); }
  }
  skyCache.set(key, cv); return cv;
}
const OB_SKY = OB.Sky = {
  /** paint a sky into g over vp with the horizon at hy: turn scrolls the layers; blend (0..1) dissolves from another */
  draw(g, vp, hy, id, turn, t, o = {}) {
    const S = OB.SKIES[id] || OB.SKIES.beachDawn, W = vp.w, X = vp.x, Y = vp.y, H = hy - vp.y;
    g.save(); g.beginPath(); g.rect(X, Y, W, vp.h); g.clip(); try { this._draw(g, vp, hy, S, id, turn, t, o, W, X, Y, H); } finally { g.restore(); px.reset(g); }
  },
  _draw(g, vp, hy, S, id, turn, t, o, W, X, Y, H) {
    // the gradient in bands, dithered where they meet
    const n = S.grad.length;
    for (let i = 0; i < n; i++) {
      const y0 = Y + Math.round(H * i / n), y1 = Y + Math.round(H * (i + 1) / n);
      px.rect(g, X, y0, W, y1 - y0 + 1, S.grad[i]);
      if (i < n - 1) { const c2 = S.grad[i + 1]; for (let yy = y1 - 3; yy < y1; yy++) for (let xx = X + ((yy & 1) ? 0 : 1); xx < X + W; xx += 2 + (y1 - yy)) px.rect(g, xx, yy, 1, 1, c2); }
    }
    px.rect(g, X, hy, W, vp.y + vp.h - hy, S.grad[n - 1]);
    // stars, aurora
    if (S.stars) { const r = R(91); for (let i = 0; i < S.stars; i++) { const x = (r() * 1024 - turn * .02) % W, y = Y + r() * H * .8, tw = Math.floor(t * 2 + i) % 7 === 0; px.rect(g, X + ((x % W) + W) % W, Math.round(y), 1, 1, tw ? '#8a8ab0' : '#f0f0ff'); }
      if (S.shooting) { const k = Math.floor(t / 3), u = t / 3 - k; if (u < .25) { const r2 = R(k * 77 + 1), sx0 = X + r2() * W, sy0 = Y + r2() * H * .4; px.line(g, Math.round(sx0 + u * 240), Math.round(sy0 + u * 90), Math.round(sx0 + u * 240 - 18), Math.round(sy0 + u * 90 - 7), '#ffffff', 1); } } }
    if (S.aurora) for (let b = 0; b < 3; b++) for (let x = 0; x < W; x += 2) { const yy = Y + H * (.18 + b * .08) + Math.sin(x * .02 + t * .6 + b) * H * .06 + Math.sin(x * .007 - t * .3) * H * .05; const a = g.globalAlpha; g.globalAlpha = .35; px.rect(g, X + x, Math.round(yy), 2, Math.round(H * .12), b === 1 ? '#7affc8' : '#5ae0ff'); g.globalAlpha = a; px.reset(g); }
    // the sun with its halo rings, or the moon
    if (S.sun) { const s = S.sun, cx = X + W * s.x - (turn * .03 % W), cy = Y + H * s.y; const ww = ((cx - X) % W + W) % W + X;
      for (let k = 3; k >= 1; k--) { const a = g.globalAlpha; g.globalAlpha = .18; px.disc(g, Math.round(ww), Math.round(cy), Math.round(s.r * (1 + k * .55)), s.halo || '#fff0c0'); g.globalAlpha = a; px.reset(g); }
      px.disc(g, Math.round(ww), Math.round(cy), s.r, s.color); px.disc(g, Math.round(ww - s.r * .25), Math.round(cy - s.r * .25), Math.round(s.r * .5), '#ffffff'); this.sunAt = [ww, cy, s.r]; }
    else this.sunAt = null;
    if (S.moon) { const m = S.moon, cx = X + ((W * m.x - turn * .03) % W + W) % W, cy = Y + H * m.y; px.disc(g, Math.round(cx), Math.round(cy), m.r, m.color || '#f4f0e0'); px.disc(g, Math.round(cx + m.r * .35), Math.round(cy - m.r * .1), Math.round(m.r * .25), '#d8d4c8'); px.disc(g, Math.round(cx - m.r * .3), Math.round(cy + m.r * .3), Math.round(m.r * .18), '#d8d4c8'); }
    // clouds: puffs drifting, scrolled with the turns
    if (S.clouds) { const c = S.clouds, r = R(OB.hashStr(id)); for (let i = 0; i < c.n; i++) { const bx = r() * 1400, by = Y + H * c.y * (.4 + r() * 1.2), cw = 30 + r() * 60, x = X + ((bx - turn * .05 + t * 3) % (W + 200) + W + 200) % (W + 200) - 100;
      for (let k = 0; k < 6; k++) { const ox = (k - 2.5) * cw * .18, oy = -Math.sin(k / 5 * Math.PI) * cw * .14, rr = cw * (.16 + .06 * Math.sin(k * 1.7 + i)); px.disc(g, Math.round(x + ox), Math.round(by + oy + 2), Math.round(rr), c.shade); px.disc(g, Math.round(x + ox), Math.round(by + oy), Math.round(rr * .92), c.color); } } }
    // far layers (scrolled at their parallax), bottom of each at its y above the horizon
    for (const L of S.layers || []) {
      if (L.kind === 'balloons') { const r = R(5); for (let i = 0; i < 6; i++) { const x = X + ((r() * 1200 - turn * (L.parallax || .04) + t * 4) % (W + 60) + W + 60) % (W + 60) - 30, y = Y + H * (.25 + r() * .4) + Math.sin(t * .5 + i) * 3, c = OB.pick(r, ['#ff5f7a', '#ffd23a', '#3ab0e8', '#7ad860']); px.ell(g, Math.round(x), Math.round(y), 5, 6, c); px.rect(g, Math.round(x - 2), Math.round(y + 7), 4, 3, '#8a5a3a'); } continue; }
      const strip = layerStrip(L, W, H, S), sw = strip.width, sh = strip.height, base = Y + H * (L.y || 1) + 2, off = (((turn * (L.parallax || .05)) % sw) + sw) % sw;
      if (L.kind === 'sea') { const yy = Math.round(Y + H * (L.y || .98)); for (let x = -off; x < W; x += sw) g.drawImage(strip, Math.round(X + x), yy, sw, Math.max(2, vp.y + vp.h - yy)); continue; }
      for (let x = -off; x < W; x += sw) g.drawImage(strip, Math.round(X + x), Math.round(base - sh));
      px.rect(g, X, Math.round(base), W, Math.max(0, Math.round(vp.y + vp.h - base)), T(L.color || '#5a6a8a').base);
    }
    if (o.rainbow) { const a = g.globalAlpha; g.globalAlpha = .3 * o.rainbow; ['#ff4a4a', '#ffa04a', '#ffe04a', '#5ae07a', '#4ab0ff', '#9a6aff'].forEach((c, i) => { for (let k = 0; k <= 40; k++) { const an = Math.PI * k / 40; px.rect(g, Math.round(X + W * .7 + Math.cos(an) * (W * .25 - i * 3)), Math.round(hy - Math.sin(an) * (H * .7 - i * 3)), 3, 2, c); } }); g.globalAlpha = a; px.reset(g); }
    if (o.fireworks) for (let k = 0; k < 3; k++) { const cyc = (t * .7 + k * .37) % 1, r2 = R(Math.floor(t * .7 + k * .37) * 13 + k), fx = X + W * (.2 + r2() * .6), fy = Y + H * (.2 + r2() * .35), c = OB.pick(r2, ['#ff4aa0', '#ffe04a', '#4ae8ff', '#7aff7a']);
      if (cyc > .3) { const u = (cyc - .3) / .7; for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; px.rect(g, Math.round(fx + Math.cos(an) * u * 26), Math.round(fy + Math.sin(an) * u * 26 + u * u * 8), 2, 2, c); } } else px.rect(g, Math.round(fx), Math.round(fy + (1 - cyc / .3) * H * .5), 1, 3, '#ffffff'); }
  },
  sunAt: null
};
})();
