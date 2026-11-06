// rooms: bright studio backgrounds painted under the actors, and props
(() => {
const E = My3D2dge, G = window.G, { px } = E;
const mix = E.mix;
function band(g, x, y, w, h, c0, c1, step) { step = step || 3; for (let i = 0; i < h; i += step) px.rect(g, x, y + i, w, Math.min(step, h - i), mix(c0, c1, i / h)); }
G.band = band;
function wallAndFloor(r, o) {
  const g = r.ctx, W = r.W, H = r.H, wb = Math.round(r.w(0, -44, 0)[1]);
  band(g, 0, 0, W, wb, o.wall0 || '#f6fafa', o.wall1 || '#dfe9ea', 4);
  const fb = Math.round(r.w(0, 90, 0)[1]);
  const x0 = r.w(-170, -44, 0)[0], x1 = r.w(170, -44, 0)[0];
  for (let i = 0; i < 8; i++) { const y0 = wb + Math.round((H - wb) * i / 8), y1 = wb + Math.round((H - wb) * (i + 1) / 8); px.rect(g, 0, y0, W, y1 - y0, mix(o.floor0 || '#ecd9bd', o.floor1 || '#d9bd96', i / 8 * .7 + (i % 2) * .08)); px.rect(g, 0, y1 - 1, W, 1, mix(o.floor1 || '#d9bd96', '#8a6a44', .25)); }
  for (let k = -8; k <= 8; k++) { const a = r.w(k * 20, -44, 0), b = r.w(k * 24, 140, 0); px.line(g, a[0], a[1], b[0], Math.min(b[1], H), mix(o.floor1 || '#d9bd96', '#8a6a44', .18), 1); }
  px.rect(g, 0, wb - 3, W, 3, '#c8dde2'); px.rect(g, 0, wb, W, 1, '#aebfc4');
  return { wb, W, H, g };
}
function windowView(g, x, y, w, h, t, o) {
  o = o || {}; const hz = y + Math.round(h * .58);
  band(g, x, y, w, hz - y, o.sky0 || '#8fd3f4', o.sky1 || '#d8f3fb', 3);
  band(g, x, hz, w, y + h - hz, o.sea0 || '#49b6c9', o.sea1 || '#2f97ad', 2);
  px.disc(g, x + w * .78, y + h * .22, 10, o.sun || '#fff6c8'); px.disc(g, x + w * .78, y + h * .22, 7, '#ffffff');
  for (let i = 0; i < 3; i++) { const cx = x + ((t * 3 + i * w * .37) % (w + 40)) - 20; px.ell(g, cx, y + 10 + i * 9, 16, 4, 'rgba(255,255,255,.85)'); }
  for (let i = 0; i < 9; i++) { const sx = x + ((i * 53 + Math.sin(t + i) * 4) % w); px.rect(g, sx, hz + 3 + (i % 4) * 5, 6 + (i % 3) * 3, 1, 'rgba(255,255,255,.5)'); }
  px.rect(g, x - 2, y - 2, w + 4, 2, '#ffffff'); px.rect(g, x - 2, y + h, w + 4, 3, '#c8dde2'); px.rect(g, x - 2, y, 2, h, '#ffffff'); px.rect(g, x + w, y, 2, h, '#ffffff');
  const mid = x + w / 2; px.rect(g, mid - 1, y, 2, h, '#ffffff');
}
G.windowView = windowView;
const fern = (g, x, y, s, t) => { px.rect(g, x - 5 * s, y - 6 * s, 10 * s, 6 * s, '#d98a66'); px.rect(g, x - 6 * s, y - 7 * s, 12 * s, 2 * s, '#ecaa86'); for (let i = -3; i <= 3; i++) { const a = i * .35 + Math.sin(t + i) * .05; px.line(g, x, y - 7 * s, x + Math.sin(a) * 12 * s, y - 7 * s - Math.cos(a) * 14 * s, i % 2 ? '#4fa86a' : '#6cc283', 2); } };
const sign = (g, x, y, txt, w) => { w = w || G.tw(txt) + 10; G.rr(g, x - w / 2, y, w, 12, '#c8dde2'); G.rr(g, x - w / 2 + 1, y + 1, w - 2, 10, '#ffffff'); G.txt(g, txt, x, y + 3, G.C.INK, { align: 'center' }); };
G.sign = sign;
G.rooms = {
  deck(r, t) {
    const { wb, W, g } = wallAndFloor(r, { wall0: '#e8f7fb', wall1: '#cfe8ee', floor0: '#efdcc0', floor1: '#d9bd96' });
    windowView(g, 14, 8, W - 28, wb - 20, t);
    for (let x = 18; x < W - 14; x += 14) px.rect(g, x, wb - 14, 2, 11, '#ffffff'); px.rect(g, 14, wb - 15, W - 28, 2, '#ffffff');   // railing
    for (let i = 0; i < 5; i++) { const cx = 60 + i * 80, sw = Math.sin(t * 1.3 + i) * 2; px.line(g, cx, 8, cx + sw, 24, '#c8dde2', 1); px.rect(g, cx + sw - 3, 24, 6, 1, '#2cc6e6'); for (let k = 0; k < 3; k++) px.rect(g, cx + sw - 2 + k * 2, 25, 1, 8 + k * 2, '#8fd3f4'); }
    const a = r.w(-70, -30, 0), b = r.w(80, -30, 0); fern(g, a[0], a[1], 1.4, t); fern(g, b[0], b[1], 1.2, t);
    const m = r.w(0, 6, 0); G.mat(g, m[0], m[1], 74, 22, '#bfeee0');
  },
  iron(r, t) {
    const { wb, W, g } = wallAndFloor(r, {});
    G.band(g, 18, 12, W * .36, wb - 30, '#e6f2f6', '#c4dde5', 4); px.rect(g, 16, 10, W * .36 + 4, 2, '#ffffff'); px.rect(g, 18, 12 + (Math.sin(t * .5) > .9 ? 10 : 0), 3, wb - 30, 'rgba(255,255,255,.6)');   // mirror
    windowView(g, W * .46, 10, W * .5, wb - 26, t);
    sign(g, W * .26, 4 + 2, G.LINES.signs[0]);
    const a = r.w(-110, -20, 0); px.rect(g, a[0] - 6, a[1] - 22, 12, 22, '#bfe3ea'); px.rect(g, a[0] - 5, a[1] - 26, 10, 5, '#8fd3f4'); px.rect(g, a[0] - 5, a[1] - 14, 10, 4, '#f6fafa');   // cooler
    for (let i = 0; i < 4; i++) { const d = r.w(70 + i * 14, -28, 0); px.rect(g, d[0] - 4, d[1] - 4, 8, 3, '#8a8f98'); px.rect(g, d[0] - 6, d[1] - 6, 2, 6, '#555'); px.rect(g, d[0] + 4, d[1] - 6, 2, 6, '#555'); }
    const m = r.w(0, 6, 0); G.mat(g, m[0], m[1], 74, 22, '#c8e6f0');
  },
  pier(r, t) {
    const { wb, W, g } = wallAndFloor(r, { wall0: '#bfe7f4', wall1: '#8fd3f4', floor0: '#d9bd96', floor1: '#b99a6c' });
    windowView(g, 0, 0, W, wb - 4, t, { sky0: '#8fd3f4', sky1: '#d8f3fb' });
    for (let x = 0; x < W; x += 14) { px.line(g, x, 2, x + 14, 8, '#ffffff', 1); px.rect(g, x + 3, 5 + (x % 28 ? 2 : 0), 5, 6, ['#ff7a59', '#2cc6e6', '#f5b700', '#bfeee0'][(x / 14) % 4 | 0]); }
    for (let i = 0; i < 3; i++) { const gx = ((t * 20 + i * 140) % (W + 40)) - 20, gy = 22 + i * 10 + Math.sin(t * 3 + i) * 3; px.line(g, gx - 5, gy, gx, gy + 2, '#ffffff', 1); px.line(g, gx, gy + 2, gx + 5, gy, '#ffffff', 1); }
    const a = r.w(-90, -28, 0); px.rect(g, a[0] - 14, a[1] - 8, 28, 3, '#a07848'); px.rect(g, a[0] - 14, a[1] - 14, 28, 2, '#a07848'); px.rect(g, a[0] - 13, a[1] - 5, 2, 5, '#6a4a2c'); px.rect(g, a[0] + 11, a[1] - 5, 2, 5, '#6a4a2c');
    const m = r.w(0, 6, 0); G.mat(g, m[0], m[1], 74, 22, '#ffd6c8');
  },
  reception(r, t) { const { wb, W, g } = wallAndFloor(r, { floor0: '#f3e2c8', floor1: '#dcc29c' }); windowView(g, W * .5, 10, W * .44, wb - 26, t); sign(g, 80, 50, 'Gently, Or Not At All'); for (let i = 0; i < 3; i++) { px.rect(g, 30 + i * 22, wb - 36, 16, 22, ['#ffd6c8', '#bfeee0', '#c8e6f0'][i]); px.rect(g, 33 + i * 22, wb - 31, 10, 2, '#ffffff'); } const m = r.w(0, 6, 0); G.mat(g, m[0], m[1], 56, 18, '#dfe9ea'); },
  juice(r, t) { const { wb, W, g } = wallAndFloor(r, { wall0: '#fff4e0', wall1: '#f2dcb8' }); windowView(g, 14, 10, W * .4, wb - 26, t); px.rect(g, W * .5, wb - 30, W * .42, 26, '#a07848'); px.rect(g, W * .5, wb - 32, W * .42, 3, '#d9b68a'); for (let i = 0; i < 5; i++) px.disc(g, W * .54 + i * 20, wb - 36, 3, ['#6a8f3a', '#2a2a2a', '#c0392b'][i % 3]); px.rect(g, W * .78, wb - 48, 8, 14, '#cfe6ec'); px.rect(g, W * .78 - 1, wb - 50, 10, 3, '#555'); const m = r.w(0, 6, 0); G.mat(g, m[0], m[1], 74, 22, '#d8f0c0'); },
  bungalow(r, t) { const { wb, W, g } = wallAndFloor(r, { wall0: '#fdf5ec', wall1: '#f0e2d0', floor0: '#e2c9a2', floor1: '#c9a97c' }); windowView(g, W * .55, 10, W * .36, wb - 26, t); const b = r.w(-80, -16, 0); px.rect(g, b[0] - 30, b[1] - 12, 60, 12, '#ffffff'); px.rect(g, b[0] - 30, b[1] - 6, 60, 6, '#2cc6e6'); px.rect(g, b[0] - 30, b[1] - 20, 14, 8, '#f6fafa'); px.rect(g, b[0] - 32, b[1] - 24, 3, 24, '#a07848'); },
  raft(r, t, dusk) { const { wb, W, g } = wallAndFloor(r, { wall0: '#7a6ab0', wall1: '#e8a090', floor0: '#6a5a50', floor1: '#4a3a34' }); band(g, 0, 0, W, wb, '#6a4a98', '#ffb08a', 4); px.disc(g, W * .7, wb - 10, 14, '#ffe0a0'); band(g, 0, wb - 2, W, 6, '#3a6a8a', '#2a4a6a', 2); for (let i = 0; i < 6; i++) { const lx = 30 + i * 70, ly = 20 + (i % 2) * 14 + Math.sin(t * 2 + i) * 2; px.line(g, lx, 0, lx, ly, '#caa', 1); px.disc(g, lx, ly + 3, 4, '#ffd070'); px.disc(g, lx, ly + 3, 7, 'rgba(255,208,112,.25)'); } const m = r.w(0, 6, 0); G.mat(g, m[0], m[1], 150, 28, '#8a6a50'); }
};
G.mat = (g, x, y, w, h, c) => { px.ell(g, x, y + 1, w / 2 + 2, h / 2 + 1, 'rgba(32,64,76,.22)'); px.ell(g, x, y, w / 2, h / 2, c); px.ell(g, x, y, w / 2 - 3, h / 2 - 3, mix(c, '#ffffff', .35)); };
})();
