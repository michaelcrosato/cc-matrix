/* World renderer: a sheared-perspective column terrain (strips far to near) with billboards, sky, fog, weather. */
(() => {
const BB = globalThis.BB, E = BB.E, px = E.px, clamp = BB.clamp, lerp = BB.lerp, noise2 = BB.noise2;
const RAD = Math.PI / 180;

/* ---------- hunts: palettes, sky, weather ---------- */
BB.HUNTS = {
  hollow: { id: 'hollow', name: 'Hollow Creek', species: 'whitetail', call: 'GRUNT TUBE', time: 'AUTUMN MORNING',
    sky: ['#6fa8dc', '#b7d3ea', '#f8d4a4'], sun: { b: -35, e: 14, c: '#fff1c4' }, ground: ['#5f7430', '#9c9a5c'], alt: '#8a6a30', litter: '#a1522a',
    mount: ['#8a9bb0', '#a5b2c2'], fog: '#e2d9c4', fogD: .5, leaf: ['#c4571f', '#d9962a', '#a8321e'], weather: 'leaves', water: ['#2f6670', '#7fb0b8'], hudColor: '#ffd36a' },
  bugle: { id: 'bugle', name: 'Bugle Ridge', species: 'elk', call: 'BUGLE', time: 'ALPINE DUSK',
    sky: ['#2c3a7c', '#bb5c80', '#ffb872'], sun: { b: 18, e: 5, c: '#ffd38a' }, ground: ['#6a7a38', '#85614f'], alt: '#7d6a3a', litter: '#caa13a',
    mount: ['#3d3a6c', '#58497a'], fog: '#c98c78', fogD: .35, leaf: ['#e8b92a', '#f2d24a'], weather: 'motes', water: ['#37508e', '#f0a070'], hudColor: '#ffb870' },
  muskeg: { id: 'muskeg', name: 'Muskeg Lake', species: 'moose', call: 'MOOSE CALL', time: 'FIRST SNOW',
    sky: ['#8794a6', '#b5bec8', '#d8dcdf'], sun: { b: 0, e: 40, c: '#eef2f6' }, ground: ['#cfd8de', '#a7b3bc'], alt: '#7e6a52', litter: '#e8eef2',
    mount: ['#7a8795', '#98a3af'], fog: '#cdd6dc', fogD: 1, leaf: ['#ffffff'], weather: 'snow', water: ['#26414f', '#6f8c9a'], hudColor: '#bfe3ff' }
};

/* ---------- camera / view ---------- */
BB.makeView = (o = {}) => {
  const v = { W: o.W || 480, H: o.H || 270, yaw: o.yaw || 0, fov: o.fov || 30, camH: o.camH || 1.7, hyf: o.hyf === undefined ? .46 : o.hyf, mag: 1, offX: 0, offY: 0, roll: 0, shakeX: 0, shakeY: 0 };
  BB.updateView(v); return v;
};
BB.updateView = v => {
  v.f = (v.H / 2) / Math.tan(v.fov * RAD / 2) * v.mag;
  v.cx = v.W / 2 + v.offX + v.shakeX; v.hy = v.H * v.hyf + v.offY + v.shakeY;
  v.sy = Math.sin(v.yaw); v.cy = Math.cos(v.yaw);
};
/* world (x east, y forward-north) to screen: [sx, sy, k, D] ; z is height above the ground origin (eye = camH) */
BB.project = (v, x, y, z) => {
  const D = x * v.sy + y * v.cy; if (D < 1.2) return null;
  const L = x * v.cy - y * v.sy, k = v.f / D;
  return [v.cx + L * k, v.hy + (v.camH - z) * k, k, D];
};
/* screen point to the world point on the ground at forward distance D */
BB.unproject = (v, sx, D) => {
  const L = (sx - v.cx) * D / v.f; return [D * v.sy + L * v.cy, D * v.cy - L * v.sy];
};
/* bearing (deg, 0 = straight ahead of yaw 0) of a world point */
BB.bearingOf = (x, y) => Math.atan2(x, y) / RAD;
BB.polar = (b, r) => [Math.sin(b * RAD) * r, Math.cos(b * RAD) * r];

/* ---------- terrain ---------- */
BB.makeTerrain = site => {
  const t = site.terrain || {}; const amp = t.amp === undefined ? 4 : t.amp, fx = t.fx || .02, fy = t.fy || .026, seed = t.seed || 3;
  const hills = site.hills || [];
  const water = site.water || null;
  const fn = (x, y) => {
    const n = .6 * noise2(x * fx + 40, y * fy + 40, seed) + .3 * noise2(x * fx * 2 + 9, y * fy * 2 + 9, seed + 1) + .1 * noise2(x * fx * 4, y * fy * 4, seed + 2);
    let h = (n - .5) * 2 * amp * clamp((y - 5) / 24, 0, 1);
    h += (t.slope || 0) * y;
    for (const b of hills) { const dx = (x - b.x) / b.r, dy = (y - b.y) / (b.ry || b.r); const d2 = dx * dx + dy * dy; if (d2 < 9) h += b.h * Math.exp(-d2 * 1.4); }
    if (water && water(x, y)) h = Math.min(h, (t.waterLevel === undefined ? -.5 : t.waterLevel));
    return h;
  };
  fn.water = water ? (x, y) => !!water(x, y) : () => false;
  return fn;
};

const STRIP_D = (() => { const a = []; for (let d = 9; d < 260; d *= 1.12) a.push(d); return a.reverse(); })();   // far to near
BB.STRIPS = STRIP_D;
BB.stripOf = D => { let idx = 0; for (let i = 0; i < STRIP_D.length; i++) { if (STRIP_D[i] >= D) idx = i; else break; } return idx; };

const hex = E.hex;
const toHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); };
BB.mixc = mixc;
const shadec = (c, f) => { const A = hex(c); return toHex(A[0] * f, A[1] * f, A[2] * f); };
BB.shadec = shadec;

/* ---------- props ---------- */
const P = BB.PROPS = {};
const tn = c => E.tones(c);
function trunk(g, sx, sy, k, w, h, col) { const t = tn(col), ww = Math.max(1, w * k), hh = Math.max(2, h * k); px.rect(g, sx - ww / 2, sy - hh, ww, hh, t.base); px.rect(g, sx - ww / 2, sy - hh, Math.max(1, ww * .3), hh, t.lt); px.rect(g, sx + ww * .15, sy - hh, Math.max(1, ww * .35), hh, t.sh); }
function blob(g, cx, cy, r, col, seed) {
  const t = tn(col); px.disc(g, cx, cy, r, t.deep); px.disc(g, cx - r * .06, cy - r * .08, r * .94, t.sh); px.disc(g, cx - r * .12, cy - r * .2, r * .72, t.base); px.disc(g, cx - r * .25, cy - r * .35, r * .38, t.lt);
}
P.oak = { bw: .55, bh: 3, draw(g, p, sx, sy, k) { const c = p.color || '#c4661f'; trunk(g, sx, sy, k, .6 * p.s, 4 * p.s, '#5a3a22'); const R = 2.4 * p.s * k; blob(g, sx, sy - 5 * p.s * k, R, c); blob(g, sx - R * .8, sy - 4 * p.s * k, R * .66, mixc(c, '#8a3a12', .4)); blob(g, sx + R * .8, sy - 4.2 * p.s * k, R * .66, mixc(c, '#d9962a', .3)); } };
P.maple = { bw: .5, bh: 3, draw(g, p, sx, sy, k) { trunk(g, sx, sy, k, .5 * p.s, 3.6 * p.s, '#4a3220'); const R = 2.1 * p.s * k; blob(g, sx, sy - 4.8 * p.s * k, R, '#b3281c'); blob(g, sx + R * .7, sy - 4 * p.s * k, R * .6, '#d4472a'); } };
P.birch = { bw: .3, bh: 5, draw(g, p, sx, sy, k) { const w = .32 * p.s * k, h = 6 * p.s * k; px.rect(g, sx - w / 2, sy - h, Math.max(1, w), h, '#e8e4d6'); for (let i = 1; i < 6; i++) px.rect(g, sx - w / 2, sy - h * i / 6.5, Math.max(1, w * .6), Math.max(1, k * .12), '#3a3a34'); blob(g, sx, sy - h, 1.5 * p.s * k, '#d6b53a'); blob(g, sx + 1.2 * p.s * k, sy - h * .85, 1 * p.s * k, '#e6c64a'); } };
P.aspen = { bw: .3, bh: 5, draw(g, p, sx, sy, k) { const w = .28 * p.s * k, h = 6.5 * p.s * k; px.rect(g, sx - w / 2, sy - h, Math.max(1, w), h, '#ddd8c6'); blob(g, sx, sy - h * .9, 1.4 * p.s * k, '#e8b92a'); blob(g, sx, sy - h * .62, 1.2 * p.s * k, '#f2cf44'); blob(g, sx, sy - h * 1.05, 1.0 * p.s * k, '#f4dc66'); } };
function pine(g, p, sx, sy, k, col, tiers) {
  trunk(g, sx, sy, k, .35 * p.s, 1.2 * p.s, '#3d2a1c'); const t = tn(col);
  for (let i = 0; i < tiers; i++) { const f = i / tiers, w = (2.1 - f * 1.5) * p.s * k, y0 = sy - (1 + f * 7.2) * p.s * k, h = 3.1 * p.s * k; px.poly(g, [[sx - w, y0], [sx + w, y0], [sx, y0 - h]], t.base); px.poly(g, [[sx, y0], [sx + w, y0], [sx, y0 - h]], t.sh); px.poly(g, [[sx - w, y0], [sx - w * .5, y0], [sx, y0 - h]], t.lt); if (p.snow) px.poly(g, [[sx - w * .6, y0 - h * .4], [sx + w * .6, y0 - h * .4], [sx, y0 - h]], '#e8eff4'); }
}
P.pine = { bw: .4, bh: 4, draw(g, p, sx, sy, k) { pine(g, p, sx, sy, k, '#2f5a3a', 4); } };
P.spruce = { bw: .4, bh: 4, draw(g, p, sx, sy, k) { pine(g, p, sx, sy, k, p.color || '#1f3f36', 5); } };
P.tamarack = { bw: .3, bh: 4, draw(g, p, sx, sy, k) { pine(g, Object.assign({}, p, { s: p.s * .8 }), sx, sy, k, '#d98a2a', 4); } };
P.snag = { bw: .35, bh: 4, draw(g, p, sx, sy, k) { const w = .4 * p.s * k, h = 5.5 * p.s * k; px.rect(g, sx - w / 2, sy - h, Math.max(1, w), h, '#17141a'); px.line(g, sx, sy - h * .7, sx + 1.4 * p.s * k, sy - h * .95, '#17141a', Math.max(1, w * .6)); px.line(g, sx, sy - h * .5, sx - 1.2 * p.s * k, sy - h * .75, '#17141a', Math.max(1, w * .5)); if (p.snow !== false) px.rect(g, sx - w / 2, sy - h, Math.max(1, w * .4), Math.max(1, k * .2), '#d8e2ea'); } };
P.rock = { bw: 1.2, bh: .9, draw(g, p, sx, sy, k) { const s = p.s, t = tn(p.color || '#7c7a78'); const w = 1.3 * s * k, h = .9 * s * k; px.poly(g, [[sx - w, sy], [sx - w * .7, sy - h * .7], [sx - w * .1, sy - h], [sx + w * .6, sy - h * .8], [sx + w, sy]], t.base); px.poly(g, [[sx + w * .1, sy], [sx - w * .1, sy - h], [sx + w * .6, sy - h * .8], [sx + w, sy]], t.sh); px.poly(g, [[sx - w, sy], [sx - w * .7, sy - h * .7], [sx - w * .1, sy - h], [sx - w * .3, sy - h * .45]], t.lt); if (p.snow) px.poly(g, [[sx - w * .5, sy - h * .8], [sx - w * .1, sy - h], [sx + w * .5, sy - h * .82], [sx, sy - h * .65]], '#eef3f6'); } };
P.boulder = { bw: 2.2, bh: 1.8, draw(g, p, sx, sy, k) { P.rock.draw(g, Object.assign({}, p, { s: p.s * 2 }), sx, sy, k); } };
P.log = { bw: 3, bh: .6, draw(g, p, sx, sy, k) { const L = 2.2 * p.s * k, r = .35 * p.s * k; const t = tn('#6a4a2c'); px.rect(g, sx - L, sy - r * 1.7, L * 2, r * 1.7, t.base); px.rect(g, sx - L, sy - r * 1.7, L * 2, Math.max(1, r * .5), t.lt); px.rect(g, sx - L, sy - r * .4, L * 2, Math.max(1, r * .4), t.sh); px.ell(g, sx + L, sy - r * .85, Math.max(1, r * .5), r * .85, '#c9a46a'); } };
P.stump = { bw: .8, bh: .6, draw(g, p, sx, sy, k) { const w = .45 * p.s * k, h = .7 * p.s * k; px.rect(g, sx - w, sy - h, w * 2, h, '#5d4128'); px.ell(g, sx, sy - h, w, Math.max(1, w * .35), '#c9a46a'); } };
P.bush = { draw(g, p, sx, sy, k) { const c = p.color || '#5a6a2a'; blob(g, sx - .6 * p.s * k, sy - .5 * p.s * k, .8 * p.s * k, c); blob(g, sx + .5 * p.s * k, sy - .6 * p.s * k, .9 * p.s * k, mixc(c, '#8a8a2a', .3)); } };
P.reeds = { draw(g, p, sx, sy, k) { const n = 6; for (let i = 0; i < n; i++) { const o = (i - n / 2) * .22 * p.s * k, h = (1.6 + BB.hash2(i, p.seed | 0, 4) * 1.2) * p.s * k; px.line(g, sx + o, sy, sx + o + (i % 2 ? 1 : -1) * k * .1, sy - h, p.color || '#8a7440', Math.max(1, k * .07)); if (i % 2 === 0) px.rect(g, sx + o - k * .06, sy - h, Math.max(1, k * .12), Math.max(2, k * .35), '#4a3220'); } } };
P.corn = { draw(g, p, sx, sy, k) { for (let i = 0; i < 5; i++) { const o = (i - 2) * .55 * p.s * k, h = (2.2 + BB.hash2(i, p.seed | 0, 9) * .5) * p.s * k; px.rect(g, sx + o - k * .1, sy - h, Math.max(1, k * .22), h, '#b99a3a'); px.poly(g, [[sx + o, sy - h * .7], [sx + o + k * .9, sy - h * .95], [sx + o + k * .1, sy - h * .55]], '#8aa13a'); px.poly(g, [[sx + o, sy - h * .5], [sx + o - k * .9, sy - h * .8], [sx + o - k * .1, sy - h * .4]], '#7a9230'); } } };
P.fence = { draw(g, p, sx, sy, k) { const L = 2.4 * p.s * k; px.rect(g, sx - L, sy - 1.0 * k, L * 2, Math.max(1, k * .09), '#8a6a44'); px.rect(g, sx - L, sy - .55 * k, L * 2, Math.max(1, k * .09), '#8a6a44'); for (const o of [-L, 0, L]) px.rect(g, sx + o - k * .06, sy - 1.15 * k, Math.max(1, k * .14), 1.15 * k, '#6d4f30'); } };
P.hay = { bw: 1.4, bh: 1.2, draw(g, p, sx, sy, k) { const w = .9 * p.s * k, h = 1.2 * p.s * k; px.ell(g, sx, sy - h / 2, w, h / 2, '#d6b04a'); px.ell(g, sx - w * .1, sy - h * .6, w * .8, h * .3, '#e8c85e'); px.ell(g, sx + w * .7, sy - h / 2, Math.max(1, w * .22), h / 2, '#a8863a'); } };
P.barn = { bw: 7, bh: 5, draw(g, p, sx, sy, k) { const w = 5 * p.s * k, h = 4.4 * p.s * k; px.rect(g, sx - w, sy - h, w * 2, h, '#a3322a'); px.rect(g, sx - w, sy - h, w * 2, Math.max(1, h * .08), '#7a2420'); px.poly(g, [[sx - w * 1.1, sy - h], [sx + w * 1.1, sy - h], [sx + w * .75, sy - h * 1.45], [sx - w * .75, sy - h * 1.45]], '#5a4a46'); px.rect(g, sx - w * .28, sy - h * .7, w * .56, h * .7, '#6b1f1b'); px.line(g, sx - w * .28, sy - h * .7, sx + w * .28, sy, '#e8e0d0', Math.max(1, k * .1)); px.line(g, sx + w * .28, sy - h * .7, sx - w * .28, sy, '#e8e0d0', Math.max(1, k * .1)); px.rect(g, sx - w * .28, sy - h * .7, w * .56, Math.max(1, k * .1), '#e8e0d0'); } };
P.scarecrow = { bw: .7, bh: 2.2, draw(g, p, sx, sy, k) { const h = 2.1 * p.s * k, w = .9 * p.s * k; px.rect(g, sx - k * .06, sy - h, Math.max(1, k * .12), h, '#6d4f30'); px.rect(g, sx - w, sy - h * .78, w * 2, Math.max(1, k * .12), '#6d4f30'); px.poly(g, [[sx - w * .45, sy - h * .8], [sx + w * .45, sy - h * .8], [sx + w * .35, sy - h * .35], [sx - w * .35, sy - h * .35]], '#3f5f9a'); px.disc(g, sx, sy - h * .92, Math.max(1.5, k * .24), '#e0c47e'); px.rect(g, sx - k * .34, sy - h * 1.02, k * .68, Math.max(1, k * .1), '#4a3220'); px.rect(g, sx - k * .2, sy - h * 1.15, k * .4, k * .15, '#4a3220'); for (const o of [-1, 1]) px.line(g, sx + o * w, sy - h * .76, sx + o * w * 1.15, sy - h * .62, '#d6b04a', Math.max(1, k * .09)); } };
P.snowman = { bw: 1, bh: 1.6, draw(g, p, sx, sy, k) { const r = .55 * p.s * k; px.disc(g, sx, sy - r * .95, r, '#dfe8ee'); px.disc(g, sx, sy - r * 2.5, r * .72, '#eef3f6'); px.disc(g, sx, sy - r * 3.6, r * .52, '#f6f9fb'); px.rect(g, sx - r * .5, sy - r * 4.3, r, r * .35, '#2a2634'); px.rect(g, sx - r * .3, sy - r * 5, r * .6, r * .8, '#2a2634'); px.dot(g, sx - r * .2, sy - r * 3.7, '#111'); px.dot(g, sx + r * .2, sy - r * 3.7, '#111'); px.rect(g, sx, sy - r * 3.5, Math.max(1, r * .6), Math.max(1, r * .12), '#e8762a'); } };
P.lodge = { draw(g, p, sx, sy, k) { const w = 4 * p.s * k, h = 2.6 * p.s * k; px.rect(g, sx - w, sy - h, w * 2, h, '#6d4a2e'); px.poly(g, [[sx - w * 1.1, sy - h], [sx + w * 1.1, sy - h], [sx, sy - h * 1.7]], '#4a3a36'); px.rect(g, sx - w * .15, sy - h * .65, w * .3, h * .65, '#3a2418'); px.rect(g, sx + w * .45, sy - h * .7, w * .3, h * .3, '#f4d884'); } };
P.trap = { bw: 1.4, bh: 1.8, draw(g, p, sx, sy, k) { const w = 1.3 * p.s * k, h = 2 * p.s * k; px.rect(g, sx - w, sy - h, w * 2, h, '#8a8f98'); px.rect(g, sx - w * 1.1, sy - h * 1.05, w * 2.2, Math.max(1, h * .1), '#5a606a'); px.rect(g, sx - w * .4, sy - h * .7, w * .8, h * .22, '#222'); } };
P.fire = { draw(g, p, sx, sy, k) { px.rect(g, sx - k * .5, sy - k * .12, k, k * .12, '#4a3220'); const t = BB.game ? BB.game.time : 0; const h = (.7 + Math.sin(t * 11 + p.seed) * .15) * k; px.poly(g, [[sx - k * .35, sy - k * .1], [sx, sy - h], [sx + k * .35, sy - k * .1]], '#e8762a'); px.poly(g, [[sx - k * .18, sy - k * .1], [sx, sy - h * .65], [sx + k * .18, sy - k * .1]], '#ffd24a'); } };
P.beaver = { draw(g, p, sx, sy, k) { px.ell(g, sx, sy - k * .3, k * .9, k * .5, '#6a4a2c'); px.ell(g, sx, sy - k * .55, k * .6, k * .4, '#8a6a3c'); px.rect(g, sx - k * .5, sy - k * .85, k, k * .12, '#4a3220'); } };
P.snowdrift = { draw(g, p, sx, sy, k) { px.ell(g, sx, sy - k * .3, 1.6 * p.s * k, .5 * p.s * k, '#eef3f6'); px.ell(g, sx + k * .3, sy - k * .2, 1.4 * p.s * k, .4 * p.s * k, '#dfe8ee'); } };
P.paper = { bw: .8, bh: 1.7, draw(g, p, sx, sy, k) { const w = .55 * p.s * k, h = 1.5 * p.s * k; px.rect(g, sx - k * .05, sy - h * 0.2, Math.max(1, k * .1), h * .2, '#6d4f30'); px.rect(g, sx - w, sy - h * 1.2, w * 2, h, '#e8e4d4'); px.rect(g, sx - w, sy - h * 1.2, w * 2, Math.max(1, k * .05), '#a8a090'); px.disc(g, sx, sy - h * .75, w * .7, '#c0392b'); px.disc(g, sx, sy - h * .75, w * .5, '#e8e4d4'); px.disc(g, sx, sy - h * .75, w * .28, '#c0392b'); } };

/* ---------- sky, mountains, clouds ---------- */
const skyCache = {};
function skyBands(h, tod) {
  const key = h.id + ':' + tod.toFixed(1); if (skyCache[key]) return skyCache[key];
  const n = 24, out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); let c = t < .55 ? mixc(h.sky[0], h.sky[1], t / .55) : mixc(h.sky[1], h.sky[2], (t - .55) / .45);
    if (tod < 0) c = mixc(c, '#1a1f4a', -tod * .55); else if (tod > 0) c = mixc(c, '#ffc890', tod * .35);
    out.push(c);
  }
  return skyCache[key] = out;
}
function drawSky(g, v, h, site, time) {
  const bands = skyBands(h, BB.T.timeOfDay), hh = Math.max(8, v.hy), bh = hh / bands.length;
  for (let i = 0; i < bands.length; i++) px.rect(g, 0, i * bh, v.W, Math.ceil(bh) + 1, bands[i]);
  px.rect(g, 0, hh, v.W, v.H - hh + 1, bands[bands.length - 1]);
  /* sun */
  const sb = (h.sun.b - v.yaw / RAD) * RAD, sx = v.cx + v.f * Math.tan(sb), sy = v.hy - v.f * Math.tan(h.sun.e * RAD);
  if (Math.abs(sb) < 1.4) { px.blend(g, .25, 'add', () => { px.disc(g, sx, sy, 26 * v.mag, h.sun.c); }); px.blend(g, .45, 'add', () => { px.disc(g, sx, sy, 12 * v.mag, h.sun.c); }); px.disc(g, sx, sy, 5 * v.mag, '#fffef0'); }
  /* clouds */
  const seed = (site.terrain && site.terrain.seed) || 1;
  for (let i = 0; i < 7; i++) {
    const b = (BB.hash2(i, seed, 11) * 160 - 80) + time * (.3 + i * .05) * .4, e = 10 + BB.hash2(i, seed, 12) * 22;
    let bb = ((b + 180) % 360 + 360) % 360 - 180; const a = (bb - v.yaw / RAD) * RAD; if (Math.abs(a) > 1.3) continue;
    const cx = v.cx + v.f * Math.tan(a), cy = v.hy - v.f * Math.tan(e * RAD), w = (22 + BB.hash2(i, seed, 13) * 30) * v.mag;
    const col = h.id === 'muskeg' ? '#cfd6dc' : h.id === 'bugle' ? '#e89a8a' : '#fdf4ea';
    px.blend(g, h.id === 'muskeg' ? .7 : .55, 'normal', () => { px.ell(g, cx, cy, w, w * .16, col); px.ell(g, cx - w * .3, cy - w * .09, w * .55, w * .12, col); px.ell(g, cx + w * .35, cy - w * .06, w * .45, w * .1, col); });
  }
}
function drawMountains(g, v, h, site) {
  const layers = site.mountains || [{ a: 6, f: .6, c: 0, e: 4 }, { a: 4, f: 1.3, c: 1, e: 1 }];
  for (const L of layers) {
    const col = h.mount[L.c], seed = (site.terrain && site.terrain.seed || 1) + L.c * 7;
    for (let x = 0; x < v.W; x += 2) {
      const th = v.yaw / RAD + Math.atan((x - v.cx) / v.f) / RAD;
      const m = L.e + L.a * (noise2(th * L.f * .1 + 50, seed, seed) * .65 + noise2(th * L.f * .35 + 10, seed, seed + 3) * .35);
      const y = v.hy - Math.tan(m * RAD) * v.f;
      px.rect(g, x, y, 2, v.hy - y + 2, col);
      if (h.id !== 'hollow' && m - L.e > L.a * .62) px.rect(g, x, y, 2, Math.max(1, (m - L.e - L.a * .62) * 2.5 * v.mag), h.id === 'bugle' ? '#f0c0a0' : '#eef3f6');
    }
  }
}

/* ---------- strips ---------- */
function stripTops(v, terrain, i, out) {
  const D = STRIP_D[i], cols = Math.ceil(v.W / 3) + 1;
  for (let c = 0; c < cols; c++) {
    const sx = c * 3 + 1, L = (sx - v.cx) * D / v.f, wx = D * v.sy + L * v.cy, wy = D * v.cy - L * v.sy;
    out[c] = v.hy + (v.camH - terrain(wx, wy)) * v.f / D;
  }
  return out;
}
BB.groundY = (v, terrain, x, y) => { const p = BB.project(v, x, y, terrain(x, y)); return p ? p[1] : null; };
function drawStrip(g, v, terrain, h, site, i, tops, time) {
  const D = STRIP_D[i], cols = tops.length, t = clamp(D / 240, 0, 1), snow = h.id === 'muskeg';
  const near = mixc(h.ground[0], h.ground[1], clamp(t * 1.3, 0, 1));
  const alt = mixc(h.alt, h.ground[1], clamp(t * 1.2, 0, 1));
  const lit = h.ground[0];
  for (let c = 0; c < cols; c++) {
    const sx = c * 3 + 1, L = (sx - v.cx) * D / v.f, wx = D * v.sy + L * v.cy, wy = D * v.cy - L * v.sy, y = tops[c];
    if (y > v.H) continue;
    const isW = terrain.water(wx, wy);
    const n = noise2(wx * .09, wy * .09, 7), m = noise2(wx * .5, wy * .5, 5);
    let col;
    if (isW) col = mixc(h.water[0], h.water[1], clamp(.15 + m * .3 + t * .5, 0, 1));
    else {
      const slope = terrain(wx + 1.2, wy + 2.2) - terrain(wx, wy);
      const pat = clamp((n - .5) * 4, 0, 1) * clamp((D - 10) / 70, .2, 1); col = mixc(near, alt, pat); col = mixc(col, h.litter, clamp((n - .7) * 3, 0, .5) * clamp((D - 10) / 70, .2, 1));
      col = mixc(col, '#000000', clamp(slope * -.04 + (m - .5) * .08, 0, .25));
      if (slope > .1) col = mixc(col, '#ffffff', clamp(slope * .06, 0, .18));
    }
    px.rect(g, c * 3 - 1, y, 3, v.H - y + 1, col);
    if (!isW) { if (m > .62 && v.f / D > 2.2) px.rect(g, c * 3, y + (v.f / D) * .35, 2, 1, mixc(col, snow ? '#ffffff' : '#2e3a18', .3)); }
    else if (m > .7) px.rect(g, c * 3, y + 1, 2, 1, '#e8f4f6');
  }
}

/* ---------- fog band after each strip bucket ---------- */
function fogBand(g, v, h, i, mult) {
  const a = (.045 + .02 * h.fogD) * BB.T.fog * mult * (STRIP_D[i] > 120 ? 1.5 : 1);
  if (a <= 0) return;
  for (let k = 0; k < 4; k++) { const top = v.hy - (70 - k * 18) * v.mag; px.blend(g, clamp(a / 4, 0, .15), 'normal', () => { px.rect(g, 0, top, v.W, v.H - top + 1, h.fog); }); }
}

/* ---------- the whole scene pass ---------- */
BB.renderWorld = (g, v, ctx) => {
  const { site, hunt, terrain, props, entities, time, fogExtra } = ctx;
  drawSky(g, v, hunt, site, time); drawMountains(g, v, hunt, site);
  const buckets = []; for (let i = 0; i < STRIP_D.length; i++) buckets.push([]);
  const add = (D, fn, extra) => { buckets[BB.stripOf(D)].push({ D, fn, extra }); };
  for (const p of props) { const pr = BB.project(v, p.x, p.y, p.z); if (!pr) continue; if (pr[0] < -90 * pr[2] / 10 - 40 || pr[0] > v.W + 90) continue; add(pr[3], () => P[p.type].draw(g, p, pr[0], pr[1], pr[2], v)); }
  for (const e of entities) { const pr = BB.project(v, e.x, e.y, e.z || 0); if (!pr) continue; if (pr[0] < -80 || pr[0] > v.W + 80) continue; add(pr[3], () => e.draw(g, pr[0], pr[1], pr[2], v, pr[3])); }
  for (const b of buckets) b.sort((a, c) => c.D - a.D);
  const tops = []; ctx.tops = ctx.tops || [];
  for (let i = 0; i < STRIP_D.length; i++) {
    const arr = ctx.tops[i] || (ctx.tops[i] = []);
    stripTops(v, terrain, i, arr); drawStrip(g, v, terrain, hunt, site, i, arr, time);
    for (const it of buckets[i]) it.fn();
    fogBand(g, v, hunt, i, 1 + (fogExtra || 0));
  }
  ctx.view = v;
};

/* terrain occlusion test, using the tops of the last frame: is screen point (sx, sy) behind a nearer strip than distance D? */
BB.occluded = (ctx, v, sx, sy, D) => {
  if (!ctx.tops) return false;
  const c = clamp(Math.floor(sx / 3), 0, ctx.tops[0] ? ctx.tops[0].length - 1 : 0);
  for (let i = 0; i < STRIP_D.length; i++) { if (STRIP_D[i] >= D) continue; const arr = ctx.tops[i]; if (arr && sy > arr[c] + 1) return true; }
  return false;
};

/* ---------- weather (screen space) ---------- */
const WX = { list: [] };
BB.drawWeather = (g, v, hunt, dt) => {
  const kind = hunt.weather, r = BB.RNG.fx(); const W = v.W, H = v.H;
  const n = kind === 'snow' ? 140 : kind === 'leaves' ? 26 : 30;
  while (WX.list.length < n) WX.list.push({ x: r() * W, y: r() * H, z: .4 + r() * .8, p: r() * 6.28, c: hunt.leaf[Math.floor(r() * hunt.leaf.length)] });
  if (WX.list.length > n) WX.list.length = n;
  for (const p of WX.list) {
    if (kind === 'snow') { p.y += (22 + p.z * 40) * dt; p.x += Math.sin(p.p + p.y * .03) * 8 * dt - 6 * dt; if (p.y > H) { p.y = -2; p.x = r() * W; } if (p.x < 0) p.x += W; px.rect(g, p.x, p.y, p.z > .8 ? 2 : 1, p.z > .8 ? 2 : 1, '#ffffff'); }
    else if (kind === 'leaves') { p.y += (14 + p.z * 18) * dt; p.x += (Math.sin(p.p + p.y * .05) * 16 + 12) * dt; if (p.y > H) { p.y = -4; p.x = r() * W; } if (p.x > W) p.x -= W; px.rect(g, p.x, p.y, 3, 2, p.c); px.dot(g, p.x + 1, p.y, '#ffffff55'); }
    else { p.y -= 3 * dt * p.z; p.x += Math.sin(p.p + p.y * .04) * 6 * dt; if (p.y < 0) { p.y = H; p.x = r() * W; } px.blend(g, .5, 'add', () => px.rect(g, p.x, p.y, 1, 1, '#ffe9b0')); }
  }
};

/* ---------- foreground dressing by vantage (screen space) ---------- */
BB.FG = {
  stand(g, v, t) { const H = v.H, W = v.W; px.rect(g, 0, H - 22, W, 22, '#5a3d22'); for (let x = 0; x < W; x += 24) px.rect(g, x, H - 22, 1, 22, '#3a2614'); px.rect(g, 0, H - 22, W, 3, '#8a6238'); px.rect(g, 0, H - 40, 6, 22, '#6d4a2a'); px.rect(g, W - 6, H - 40, 6, 22, '#6d4a2a'); px.rect(g, 0, H - 40, W, 3, '#7a5530'); },
  blind(g, v, t) { const H = v.H, W = v.W; const c = '#3b4a22', c2 = '#2a3318'; px.rect(g, 0, H - 30, W, 30, c); for (let x = 0; x < W; x += 9) { px.poly(g, [[x, H - 30], [x + 4, H - 36], [x + 8, H - 30]], c2); px.rect(g, x, H - 24 + (x % 3) * 3, 5, 3, c2); } px.rect(g, 0, 0, 10, H, c2); px.rect(g, W - 10, 0, 10, H, c2); for (let y = 0; y < H; y += 12) { px.rect(g, 0, y, 10 - (y % 5), 6, c); px.rect(g, W - 10 + (y % 5), y + 3, 10 - (y % 5), 6, c); } px.rect(g, 0, 0, W, 6, c2); },
  rock(g, v, t) { const H = v.H, W = v.W; const t1 = E.tones('#6e6a66'); px.poly(g, [[0, H], [0, H - 34], [28, H - 24], [60, H - 14], [100, H - 6], [140, H]], t1.base); px.poly(g, [[W, H], [W, H - 40], [W - 40, H - 26], [W - 90, H - 10], [W - 130, H]], t1.sh); px.poly(g, [[0, H - 34], [28, H - 24], [10, H - 30]], t1.lt); },
  canoe(g, v, t) { const H = v.H, W = v.W, bob = Math.sin(t * 1.6) * 1.5; px.poly(g, [[W * .15, H], [W * .5, H - 28 + bob], [W * .85, H]], '#2c5a46'); px.poly(g, [[W * .22, H], [W * .5, H - 22 + bob], [W * .78, H]], '#3f7a60'); px.poly(g, [[W * .5, H - 28 + bob], [W * .5 + 2, H - 28 + bob], [W * .5, H - 8]], '#d9d2b8'); px.rect(g, W * .5 - 2, H - 30 + bob, 4, 4, '#5a3d22'); },
  bog(g, v, t) { const H = v.H, W = v.W; for (let x = 0; x < W; x += 7) { const h = 12 + BB.hash2(x, 3, 3) * 18; px.line(g, x, H, x + (x % 2 ? 2 : -2), H - h, '#6a5a38', 1); if (x % 3 === 0) px.rect(g, x - 1, H - h, 3, 6, '#4a3220'); } px.rect(g, 0, H - 6, W, 6, '#8a8062'); },
  rise(g, v, t) { const H = v.H, W = v.W; px.poly(g, [[0, H], [0, H - 20], [W * .3, H - 12], [W * .6, H - 16], [W, H - 8], [W, H]], '#eef3f6'); px.poly(g, [[0, H], [W * .3, H - 8], [W * .6, H - 10], [W, H - 3], [W, H]], '#dfe8ee'); for (let x = 20; x < W; x += 70) { px.line(g, x, H - 12, x - 3, H - 30, '#17141a', 2); px.line(g, x, H - 22, x + 5, H - 30, '#17141a', 1); } },
  knoll(g, v, t) { const H = v.H, W = v.W; px.poly(g, [[0, H], [0, H - 16], [W * .25, H - 9], [W * .55, H - 14], [W, H - 6], [W, H]], '#4d5c26'); for (let x = 3; x < W; x += 11) px.line(g, x, H - 4, x + (x % 2 ? 3 : -3), H - 14 - (x % 7), '#6e8030', 1); },
  trail(g, v, t) { const H = v.H, W = v.W; px.rect(g, 0, H - 12, W, 12, '#3a4a1c'); for (let x = 0; x < W; x += 6) px.line(g, x, H - 2, x + (x % 2 ? 3 : -3), H - 12 - (x % 5), '#5a6e28', 1); }
};
})();
