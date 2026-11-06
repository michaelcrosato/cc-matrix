/* art.js: the rooms and props, painted by code. In brawler, +y comes toward the camera: the back wall's base is
 * r.w(0, -44, 0)[1], mats sit near y = 0, floor boards run from y = -44 to y = 90. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, mix, shade } = E, game = G.game;
const INK = '#20404c', WHITE = '#f6fafa', WALL = '#dfe9ea';
const bands = G.bands = (g, x, y, w, h, c1, c2, n = 10) => { const step = h / n; for (let i = 0; i < n; i++) px.rect(g, x, Math.floor(y + i * step), w, Math.ceil(step) + 1, mix(c1, c2, n > 1 ? i / (n - 1) : 0)); };
const T = () => game.real;

/* ---- pieces ---- */
function skyAndSea(g, x, y, w, h, o = {}) {
  const horizon = y + Math.round(h * (o.horizon || .58)), dusk = o.dusk;
  bands(g, x, y, w, horizon - y, dusk ? '#47406f' : '#8fd3f4', dusk ? '#ffb27a' : '#d8f3fb', 12);
  if (o.sun !== false) { const sx = x + w * (o.sunX || .9), sy = horizon - h * (dusk ? .07 : .22); px.disc(g, sx, sy, dusk ? 14 : 8, dusk ? '#ffd9a0' : '#fff6d8'); px.disc(g, sx, sy, dusk ? 10 : 6, '#fffbe8'); }
  // clouds, drifting
  if (!dusk) for (let i = 0; i < 4; i++) { const cx = x + ((i * 97 + T() * (1.2 + i * .3)) % (w + 60)) - 30, cy = y + 10 + i * 13; px.ell(g, cx, cy, 16 + i * 3, 3, '#ffffff'); px.ell(g, cx + 6, cy - 2, 9, 3, '#ffffff'); }
  // a far island
  px.ell(g, x + w * .22, horizon + 1, w * .13, 7, dusk ? '#3f4f75' : '#7fb7b2'); px.ell(g, x + w * .28, horizon + 1, w * .07, 11, dusk ? '#384668' : '#6fa9a4');
  bands(g, x, horizon, w, y + h - horizon, dusk ? '#c5709a' : '#49b6c9', dusk ? '#3e4a7d' : '#2f97ad', 8);
  // glints
  const t = T(); for (let i = 0; i < 26; i++) { const k = (i * 37) % 100 / 100, gy = horizon + 3 + k * (y + h - horizon - 4), gx = x + ((i * 53 + Math.sin(t * .6 + i) * 8) % w + w) % w, l = 3 + (i % 4) * 2; if (Math.sin(t * 1.4 + i * 1.7) > -.1) px.rect(g, gx, gy, l, 1, dusk ? '#f0b0a0' : '#a8e4ec'); }
}
function boards(g, r, y0w = -44, c1 = '#ecd9bd', c2 = '#d9bd96', o = {}) {
  const top = r.w(0, y0w, 0)[1], H = r.H + 2, W = r.W + 2; bands(g, 0, top, W, H - top, c1, c2, 10);
  // the boards: lines running to the camera, wider apart as they come
  const lc = o.line || shade(c2, -.08);
  for (let i = -14; i <= 14; i++) { const a = r.w(i * 24, y0w, 0), b = r.w(i * 24, 110, 0); px.line(g, a[0], top, b[0], b[1], lc); }
  // cross joints, staggered, sized by depth
  for (let j = 0; j < 9; j++) { const yw = y0w + j * 17, sy = r.w(0, yw, 0)[1]; if (sy > H) break; for (let i = -14; i <= 14; i++) { if ((i + j) % 3) continue; const sx = r.w(i * 24 + 12, yw, 0)[0]; px.rect(g, sx, sy, 6, 1, lc); } }
}
/** a yoga mat on the floor */
G.drawMat = (r, x, y, hw, hh, col, o = {}) => {
  const g = r.ctx, a = r.w(x - hw, y - hh, 0), b = r.w(x + hw, y - hh, 0), c = r.w(x + hw, y + hh, 0), d = r.w(x - hw, y + hh, 0);
  px.poly(g, [[d[0], d[1] + 2], [c[0], c[1] + 2], [c[0], c[1]], [d[0], d[1]]], shade(col, -.25));
  px.poly(g, [a, b, c, d].map(p => [p[0], p[1]]), col);
  const e = shade(col, .16); px.line(g, a[0] + 2, a[1] + 1, b[0] - 2, b[1] + 1, e);
  px.line(g, (a[0] + b[0]) / 2, a[1] + 1, (d[0] + c[0]) / 2, d[1] - 1, shade(col, -.08));
  if (o.star) { const m = r.w(x, y, 0); E.font.text(g, '★', m[0], m[1] - 18 - Math.round(Math.sin(T() * 3) * 2), '#ffb020', { align: 'center', outline: false, shadow: '#a06a10', scale: 2 }); }
};
const fern = G.fern = (g, x, y, s = 1, pot = '#e8a07a') => {
  const t = T(), leaf = '#4fa87a', leaf2 = '#3b8f68';
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .42 + Math.sin(t * .9 + i) * .03, L = (12 + (i % 2) * 4) * s; const ex = x + Math.cos(a) * L, ey = y - 7 * s + Math.sin(a) * L; px.line(g, x, y - 7 * s, ex, ey, i % 2 ? leaf : leaf2, 2); px.dot(g, ex, ey, '#7ccf9f'); }
  px.poly(g, [[x - 5 * s, y - 7 * s], [x + 5 * s, y - 7 * s], [x + 4 * s, y], [x - 4 * s, y]], pot); px.rect(g, x - 5.5 * s, y - 8 * s, 11 * s, 2 * s, shade(pot, .12)); px.rect(g, x + 2 * s, y - 6 * s, 2 * s, 6 * s, shade(pot, -.14));
};
const chimes = (g, x, y) => { px.rect(g, x - 9, y, 18, 2, '#a57f54'); const t = T(); for (let i = 0; i < 5; i++) { const sw = Math.sin(t * 1.3 + i * .9) * 1.6, xx = x - 8 + i * 4; px.line(g, xx, y + 2, xx + sw, y + 7, '#9fb5bc'); px.rect(g, xx + sw - 1, y + 7, 2, 7 + (i % 3) * 3, i % 2 ? '#dbe7ea' : '#b8ccd2'); } };
/** a sign: its words, and under them the Institute's motto, as on every sign here. G.signH(text) is its height */
G.signH = text => text === G.DATA.lines.motto ? 13 : 23;
const sign = G.signBoard = (g, x, y, text, o = {}) => { const motto = G.DATA.lines.motto, h = G.signH(text), w = Math.max(E.font.width(text), h > 13 ? E.font.width(motto) : 0) + 10; px.rect(g, x - w / 2 + 1, y + 1, w, h, '#20404c33'); px.rect(g, x - w / 2, y, w, h, o.bg || '#ffffff'); px.rect(g, x - w / 2, y, w, 1, '#c8dde2'); px.rect(g, x - w / 2, y + h - 1, w, 1, '#c8dde2'); E.font.text(g, text, x, y + 3, o.color || INK, { align: 'center', outline: false }); if (h > 13) E.font.text(g, motto, x, y + 13, '#14a8c8', { align: 'center', outline: false }); };
const dumbbell = (g, x, y, s = 1, c = '#2cc6e6') => { px.rect(g, x - 4 * s, y - 1, 8 * s, 2, '#7a8a94'); px.rect(g, x - 5 * s, y - 2 * s, 2 * s, 4 * s, c); px.rect(g, x + 3 * s, y - 2 * s, 2 * s, 4 * s, c); };
const cooler = (g, x, y) => { px.rect(g, x - 6, y - 22, 12, 22, '#e6eef0'); px.rect(g, x - 6, y - 22, 3, 22, '#f6fafa'); px.rect(g, x + 3, y - 22, 3, 22, '#cfdde1'); px.rect(g, x - 3, y - 14, 6, 3, '#20404c'); px.dot(g, x - 2, y - 13, '#ff7a59'); px.dot(g, x + 1, y - 13, '#2cc6e6'); px.ell(g, x, y - 29, 6, 8, '#a8e4f2'); px.ell(g, x - 2, y - 31, 2, 4, '#dff7fc'); const bub = Math.floor(T() * 1.5 % 5); px.dot(g, x + 2, y - 24 - bub * 2, '#ffffff'); };
const mirror = (g, x, y, w, h) => { px.rect(g, x - 2, y - 2, w + 4, h + 4, '#c8dde2'); bands(g, x, y, w, h, '#f4fcfd', '#d6ecf1', 6); for (let i = 0; i < 3; i++) px.line(g, x + 8 + i * 30, y + h - 3, x + 22 + i * 30, y + 3, '#ffffff', 2); };
const bench = (g, x, y, s = 1) => { px.rect(g, x - 18 * s, y - 8 * s, 36 * s, 3 * s, '#c49c6c'); px.rect(g, x - 18 * s, y - 15 * s, 36 * s, 2 * s, '#d9b68a'); px.rect(g, x - 18 * s, y - 11 * s, 36 * s, 2 * s, '#d9b68a'); for (const k of [-14, 13]) { px.rect(g, x + k * s, y - 15 * s, 2 * s, 15 * s, '#7a8a94'); } };
const bunting = G.bunting = (g, x0, x1, y, sag = 12, cols = ['#ff7a59', '#2cc6e6', '#f5c84b', '#6fcf8e', '#f08fb0']) => { const n = Math.floor((x1 - x0) / 10); let py = null, pxx = null; for (let i = 0; i <= n; i++) { const k = i / n, xx = x0 + (x1 - x0) * k, yy = y + Math.sin(k * Math.PI) * sag; if (py !== null) px.line(g, pxx, py, xx, yy, '#7a8a94'); if (i < n) { const c = cols[i % cols.length], wob = Math.sin(T() * 2.2 + i) * 1; px.poly(g, [[xx + 1, yy], [xx + 8, yy + 1], [xx + 4 + wob, yy + 8]], c); } pxx = xx; py = yy; } };
const gulls = (g, W, y, n = 3) => { const t = T(); for (let i = 0; i < n; i++) { const x = ((i * 137 + t * (9 + i * 3)) % (W + 40)) - 20, yy = y + i * 9 + Math.sin(t * .8 + i) * 3, f = Math.sin(t * 5 + i * 2) * 2; px.line(g, x - 4, yy - f, x, yy, '#ffffff'); px.line(g, x + 4, yy - f, x, yy, '#ffffff'); } };
const lantern = G.lantern = (g, x, y, on = true) => { px.line(g, x, y - 6, x, y - 12, '#5a4a3a'); px.rect(g, x - 3, y - 6, 6, 8, on ? '#ffd27a' : '#c8b890'); px.rect(g, x - 3, y - 7, 6, 1, '#7a5a3a'); px.rect(g, x - 3, y + 2, 6, 1, '#7a5a3a'); if (on) { px.rect(g, x - 1, y - 4, 2, 3, '#fff3c8'); px.blend(g, .22, 'add', () => px.disc(g, x, y - 2, 10, '#ffb860')); } };
const lamp = (g, x, y, on) => { px.rect(g, x - 1, y - 40, 2, 40, '#6a7a84'); px.rect(g, x - 4, y - 44, 8, 5, on ? '#ffe7a8' : '#f0f6f7'); px.rect(g, x - 5, y - 45, 10, 1, '#6a7a84'); if (on) px.blend(g, .2, 'add', () => px.disc(g, x, y - 42, 14, '#ffc070')); };
const towelRack = (g, x, y) => { px.rect(g, x - 16, y - 24, 32, 2, '#7a8a94'); px.rect(g, x - 15, y - 24, 1, 24, '#7a8a94'); px.rect(g, x + 14, y - 24, 1, 24, '#7a8a94'); px.rect(g, x - 11, y - 22, 8, 13, '#ffffff'); px.rect(g, x - 2, y - 22, 8, 11, '#bfeee0'); px.rect(g, x + 7, y - 22, 6, 14, '#ffd8cc'); };

/* ---- rooms ---- */
const room = (r, o) => {
  const g = r.ctx, W = r.W + 2, H = r.H + 2, base = r.w(0, -44, 0)[1];
  px.rect(g, 0, 0, W, base, o.wall || WHITE);
  bands(g, 0, 0, W, Math.min(16, base), mix(o.wall || WHITE, WALL, .9), o.wall || WHITE, 4);
  if (o.window !== false) {
    const wx = Math.round(W * (o.wx === undefined ? .12 : o.wx)), ww = Math.round(W * (o.ww || .76)), wy = 8, wh = base - 20;
    skyAndSea(g, wx, wy, ww, wh, { dusk: o.dusk });
    // the frame
    px.rect(g, wx - 3, wy - 3, ww + 6, 3, '#ffffff'); px.rect(g, wx - 3, wy + wh, ww + 6, 4, '#ffffff'); px.rect(g, wx - 3, wy, 3, wh, '#ffffff'); px.rect(g, wx + ww, wy, 3, wh, '#ffffff'); px.rect(g, wx - 3, wy + wh + 3, ww + 6, 1, WALL);
    for (let i = 1; i < 3; i++) px.rect(g, wx + Math.round(ww * i / 3) - 1, wy, 2, wh, '#ffffff');
  }
  px.rect(g, 0, base - 5, W, 5, '#ffffff'); px.rect(g, 0, base - 1, W, 1, '#c8dde2');
  boards(g, r, -44, o.floor1, o.floor2);
};
G.ROOMS = {
  studio(r, o = {}) { room(r, { dusk: o.dusk }); const g = r.ctx, b = r.w(0, -44, 0); fern(g, b[0] - r.W * .44, b[1] + 8, 1.3); fern(g, b[0] + r.W * .44, b[1] + 10, 1.5, '#7fd8ea'); },
  deck(r, o = {}) {
    const g = r.ctx, W = r.W + 2, H = r.H + 2, base = r.w(0, -44, 0)[1];
    skyAndSea(g, 0, 0, W, base + 2, { dusk: o.dusk, horizon: .6 });
    gulls(g, W, 16, 2);
    // the rail
    px.rect(g, 0, base - 15, W, 2, '#f4e6cf'); for (let x = 4; x < W; x += 20) px.rect(g, x, base - 15, 2, 15, '#d9bd96');
    boards(g, r, -44, '#f0dcc0', '#cfb088', { line: '#b89a72' });
    // a pergola beam and chimes
    px.rect(g, 0, 8, W, 5, '#c49c6c'); px.rect(g, 0, 13, W, 1, '#a57f54');
    chimes(g, Math.round(W * .22), 14); chimes(g, Math.round(W * .8), 14);
    fern(g, Math.round(W * .06), base + 9, 1.5); fern(g, Math.round(W * .94), base + 12, 1.7, '#7fd8ea'); fern(g, Math.round(W * .16), base + 2, 1, '#d9bd96');
    sign(g, Math.round(W * .3), 18, G.DATA.lines.sign.deck);
    if (o.dusk) { lantern(g, Math.round(W * .3), 28); lantern(g, Math.round(W * .7), 28); }
  },
  iron(r, o = {}) {
    room(r, { wx: .55, ww: .36, dusk: o.dusk, floor1: '#eef2f2', floor2: '#d6dede' });
    const g = r.ctx, W = r.W + 2, base = r.w(0, -44, 0)[1];
    mirror(g, Math.round(W * .13), 10, Math.round(W * .36), base - 24);
    sign(g, Math.round(W * .31), 30, G.DATA.lines.sign.iron, { bg: '#ffffff' }); sign(g, Math.round(W * .31), 55, G.DATA.lines.sign.mirror, { bg: '#f4fcfd' });
    // a rack of comically small dumbbells
    const rx = Math.round(W * .04), ry = base + 2; px.rect(g, rx, ry - 12, 28, 2, '#7a8a94'); px.rect(g, rx, ry - 4, 28, 2, '#7a8a94'); px.rect(g, rx, ry - 14, 2, 14, '#5a6a74'); px.rect(g, rx + 26, ry - 14, 2, 14, '#5a6a74');
    for (let i = 0; i < 3; i++) { dumbbell(g, rx + 6 + i * 8, ry - 14, .55, ['#2cc6e6', '#ff7a59', '#f5c84b'][i]); dumbbell(g, rx + 6 + i * 8, ry - 6, .55, ['#6fcf8e', '#b08be0', '#2cc6e6'][i]); }
    cooler(g, Math.round(W * .94), base + 8); towelRack(g, Math.round(W * .82), base + 4);
    dumbbell(g, r.w(-90, 22, 0)[0], r.w(-90, 22, 0)[1], .7);
    if (o.dusk) lamp(g, Math.round(W * .52), base + 2, true);
  },
  pier(r, o = {}) {
    const g = r.ctx, W = r.W + 2, base = r.w(0, -44, 0)[1];
    skyAndSea(g, 0, 0, W, base + 2, { dusk: o.dusk, horizon: .55 });
    gulls(g, W, 12, 3);
    boards(g, r, -44, '#d9c09a', '#b89a72', { line: '#967a58' });
    px.rect(g, 0, base - 13, W, 2, '#fbfdfd'); for (let x = 10; x < W; x += 34) { px.rect(g, x, base - 13, 2, 13, '#fbfdfd'); px.ell(g, x + 1, base - 14, 2, 1, '#ffffff'); }
    bench(g, Math.round(W * .1), base + 2); bench(g, Math.round(W * .9), base + 2);
    lamp(g, Math.round(W * .03), base, o.dusk); lamp(g, Math.round(W * .97), base, o.dusk);
    bunting(g, -6, W * .5, 10, 16); bunting(g, W * .5, W + 6, 10, 16);
    sign(g, Math.round(W * .2), 34, G.DATA.lines.sign.pier);
    if (o.festive) { bunting(g, -6, W + 6, 26, 26, ['#ffffff', '#ff7a59', '#2cc6e6']); }
  },
  reception(r, o = {}) {
    room(r, { wx: .36, ww: .58, dusk: o.dusk, floor1: '#f2ece0', floor2: '#ddd2bd' });
    const g = r.ctx, W = r.W + 2, base = r.w(0, -44, 0)[1];
    // the desk and brochures
    const dx = Math.round(W * .17); px.rect(g, dx - 26, base - 24, 52, 28, '#fbfdfd'); px.rect(g, dx - 26, base - 25, 52, 2, '#c8dde2'); px.rect(g, dx - 22, base - 16, 44, 12, '#eef5f6');
    E.font.text(g, 'Gently', dx, base - 15, '#14a8c8', { align: 'center', outline: false });
    for (let i = 0; i < 4; i++) { px.rect(g, dx - 18 + i * 10, base - 31, 7, 6, ['#ff7a59', '#2cc6e6', '#6fcf8e', '#f5c84b'][i]); px.rect(g, dx - 17 + i * 10, base - 29, 5, 1, '#ffffff'); }
    fern(g, Math.round(W * .95), base + 12, 1.6); fern(g, Math.round(W * .26), base + 6, 1.1, '#7fd8ea');
    sign(g, Math.round(W * .185), 32, G.DATA.lines.sign.reception);
  },
  juice(r, o = {}) {
    room(r, { wx: .1, ww: .5, dusk: o.dusk, floor1: '#f0e0c8', floor2: '#d6bd98' });
    const g = r.ctx, W = r.W + 2, base = r.w(0, -44, 0)[1];
    const x0 = Math.round(W * .66), w = Math.round(W * .3); px.rect(g, x0, base - 26, w, 30, '#e8a07a'); px.rect(g, x0, base - 27, w, 3, '#fbfdfd');
    for (let i = 0; i < 3; i++) { px.rect(g, x0 + 8 + i * 26, base - 22, 18, 20, shade('#e8a07a', i % 2 ? .08 : -.06)); }
    // blender and olives
    const bx = x0 + w - 24; px.rect(g, bx - 5, base - 33, 10, 6, '#7a8a94'); px.poly(g, [[bx - 6, base - 50], [bx + 6, base - 50], [bx + 4, base - 33], [bx - 4, base - 33]], '#bfeee0'); px.rect(g, bx - 6, base - 52, 12, 2, '#7a8a94');
    const jx = x0 + 18; px.rect(g, jx - 7, base - 45, 14, 18, '#dff4f0'); px.rect(g, jx - 8, base - 47, 16, 3, '#c49c6c'); for (let i = 0; i < 6; i++) px.disc(g, jx - 4 + (i % 3) * 4, base - 31 - Math.floor(i / 3) * 5, 2, '#7b9a3a');
    sign(g, Math.round(W * .58), 16, G.DATA.lines.sign.juice);
    fern(g, Math.round(W * .04), base + 8, 1.4);
  },
  bungalow(r, o = {}) {
    room(r, { wx: .35, ww: .4, dusk: o.dusk, wall: '#fbf6ec', floor1: '#e8cfa8', floor2: '#c9a97c' });
    const g = r.ctx, W = r.W + 2, base = r.w(0, -44, 0)[1];
    // a bed
    const bx = Math.round(W * .15), by = base + 26; px.rect(g, bx - 40, by - 20, 80, 20, '#c49c6c'); px.rect(g, bx - 38, by - 26, 76, 12, '#ffffff'); px.rect(g, bx - 10, by - 26, 48, 12, '#2cc6e6'); px.rect(g, bx - 34, by - 25, 18, 8, '#f4f8f8'); px.rect(g, bx - 42, by - 34, 4, 34, '#a57f54');
    fern(g, Math.round(W * .94), base + 12, 1.6, '#e8a07a');
  },
  raft(r, o = {}) {
    const g = r.ctx, W = r.W + 2, H = r.H + 2, base = r.w(0, -44, 0)[1];
    skyAndSea(g, 0, 0, W, H, { dusk: true, horizon: .42 });
    // the raft: planks toward the camera
    const a = r.w(-170, -40, 0), b = r.w(170, -40, 0), c = r.w(210, 80, 0), d = r.w(-210, 80, 0);
    px.poly(g, [a, b, c, d].map(p => [p[0], p[1]]), '#8a6a4a');
    for (let i = 0; i < 9; i++) { const k = i / 9, x0 = a[0] + (b[0] - a[0]) * k, x1 = d[0] + (c[0] - d[0]) * k; px.line(g, x0, a[1], x1, d[1], '#6e5238'); }
    px.rect(g, 0, a[1] - 1, W, 1, '#a8855f');
    for (const k of [.12, .88]) { const lx = Math.round(W * k); px.rect(g, lx - 1, a[1] - 30, 2, 32, '#5a4a3a'); lantern(g, lx, a[1] - 26); }
    bunting(g, -6, W + 6, 10, 20);
    if (o.flames) { /* the duel's flames are drawn by the activity */ }
  },
  festival(r, o = {}) { G.ROOMS.pier(r, { festive: true, dusk: o.dusk }); }
};

/* ---- time of day: morning, noon, dusk. Keep bright scenes bright ---- */
G.setDayLight = (phase, extra) => {
  const L = G.L; L.tint = .32; L.dark = [60, 50, 90]; L.refresh && L.refresh();
  if (phase === 'dusk') { L.enabled = true; L.ambient = .62; }
  else if (phase === 'morning') { L.enabled = true; L.ambient = .92; }
  else { L.enabled = false; L.ambient = 1; }
};
G.dayPhase = () => { const s = G.S && G.S.session || 0; return s <= 0 ? 'morning' : s === 1 ? 'noon' : 'dusk'; };

/* ---- HUD pieces shared by many screens ---- */
G.drawStars = (g, cx, y, n, o = {}) => {
  const total = o.total || 3, s = o.scale || 2, gap = o.gap || 20 * s / 2, x0 = cx - gap * (total - 1) / 2;
  for (let i = 0; i < total; i++) E.font.text(g, '★', Math.round(x0 + i * gap), y, i < n ? (o.color || '#ffb020') : '#d6e2e5', { align: 'center', outline: false, scale: s, shadow: i < n ? '#a06a10' : null });
};
/** a white rounded panel */
G.panel = (g, x, y, w, h, o = {}) => {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); const R = o.r === undefined ? 6 : o.r, c = o.bg || '#fbfdfd', b = o.border || '#c8dde2';
  const rr = (X, Y, W2, H2, C) => { px.rect(g, X + R, Y, W2 - 2 * R, H2, C); px.rect(g, X, Y + R, W2, H2 - 2 * R, C); px.disc(g, X + R, Y + R, R, C); px.disc(g, X + W2 - R - 1, Y + R, R, C); px.disc(g, X + R, Y + H2 - R - 1, R, C); px.disc(g, X + W2 - R - 1, Y + H2 - R - 1, R, C); };
  if (o.shadow !== false) rr(x + 1, y + 2, w, h, '#20404c30');
  rr(x - 1, y - 1, w + 2, h + 2, b); rr(x, y, w, h, c);
};
/** the four-petal flower of the disciplines */
G.drawFlower = (g, cx, cy, R, scores) => {
  const cols = ['#b08be0', '#ff7a59', '#2cc6e6', '#6fcf8e'], dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  dirs.forEach((d, i) => { const k = .25 + .75 * E.clamp(scores[i] / 100, 0, 1), rr = R * .46 * k + 1; px.disc(g, cx + d[0] * R * .5, cy + d[1] * R * .5, R * .46, '#e8f0f2'); px.disc(g, cx + d[0] * R * .5, cy + d[1] * R * .5, rr, cols[i]); });
  px.disc(g, cx, cy, Math.max(2, R * .22), '#ffd166');
};
/** the Spine Age graph: one dot per day, at most 8 */
G.drawAgeGraph = (g, x, y, w, h, hist) => {
  const H = hist.slice(-8); px.rect(g, x, y + h, w, 1, '#c8dde2');
  const mn = 15, mx = 75, pt = i => [Math.round(x + (H.length > 1 ? i / (H.length - 1) : .5) * w), Math.round(y + h - (H[i] - mn) / (mx - mn) * h)];
  for (let i = 1; i < H.length; i++) { const a = pt(i - 1), b = pt(i); px.line(g, a[0], a[1], b[0], b[1], '#2cc6e6', 2); }
  H.forEach((_, i) => { const p = pt(i); px.disc(g, p[0], p[1], 3, '#14a8c8'); px.disc(g, p[0], p[1], 2, i === H.length - 1 ? '#ff7a59' : '#ffffff'); });
};
})();
