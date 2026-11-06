// Story backdrops painted by code: each has three depth layers, one animated element and one light source. Rain on windows everywhere in Port Anselm.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix;
const STAGES = G.STAGES = {};
const defStage = G.defStage = (id, s) => { STAGES[id] = s; };
const CACHE = new Map();
const Dither = (g, x, y, w, h, c, a, seed = 0) => { const lim = a * 16, B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (B[((x + i + seed) & 3) | (((y + j) & 3) << 2)] < lim) px.dot(g, x + i, y + j, c); };
/** vertical bands from dark to light, hard-stepped with ordered dither at the seams */
const bands = (g, x, y, w, h, cols) => { const n = cols.length, bh = h / n; for (let i = 0; i < n; i++) { px.rect(g, x, Math.round(y + i * bh), w, Math.ceil(bh) + 1, cols[i]); if (i + 1 < n) { const sy = Math.round(y + (i + 1) * bh) - 3; Dither(g, x, sy, w, 3, cols[i + 1], .4); } } };
const glow = (g, x, y, r, c, a = .5) => px.ddisc(g, x, y, r, c, a);
const nightWin = (g, x, y, w, h, frame = '#1e2c30') => { bands(g, x, y, w, h, ['#0a1224', '#0e1a30', '#14243c', '#1c2e44']); let s = (x * 7 + y * 13) | 0; for (let i = 0; i < Math.round(w * h / 90); i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; const a = s % w, b = (s >> 8) % Math.max(1, Math.round(h * .55)) + Math.round(h * .42); px.dot(g, x + a, y + Math.min(h - 1, b), i % 3 ? '#e8c060' : '#6a9ad8'); } px.rect(g, x - 2, y - 2, w + 4, 2, frame); px.rect(g, x - 2, y + h, w + 4, 3, frame); px.rect(g, x - 2, y, 2, h, frame); px.rect(g, x + w, y, 2, h, frame); };
/** rain running down a pane */
const rainPane = G.rainPane = (g, x, y, w, h, t, seed = 1, c = '#9ec4dc') => { for (let i = 0; i < Math.round(w / 3); i++) { const sx = (i * 31 + seed * 17) % w, sp = 40 + (i * 13 % 60), len = 3 + i % 5, yy = ((t * sp + i * 41) % (h + len)) - len; const y0 = Math.max(0, yy), y1 = Math.min(h, yy + len); if (y1 > y0) px.rect(g, x + sx, y + Math.round(y0), 1, Math.round(y1 - y0), i % 4 ? c : '#d8ecf8'); } };
const tileWall = (g, x, y, w, h, c1, c2, size = 12) => { px.rect(g, x, y, w, h, c1); for (let j = 0; j <= h; j += size) px.rect(g, x, y + j, w, 1, c2); for (let i = 0; i <= w; i += size) px.rect(g, x + i, y, 1, h, c2); };
const floorPersp = (g, W, y0, H, c1, c2) => { bands(g, 0, y0, W, H - y0, [c1, c2]); const cx = W / 2; for (let i = -14; i <= 14; i++) px.line(g, Math.round(cx + i * 8), y0, Math.round(cx + i * 70), H, E.shade(c2, -.18)); for (let k = 0; k < 7; k++) { const yy = Math.round(y0 + Math.pow(k / 6, 1.8) * (H - y0)); px.rect(g, 0, yy, W, 1, E.shade(c2, -.18)); } };

G.Stage = {
  /** draw it: the cached layers on the buffer, then its animated element over them */
  draw(r, id, t) { const st = STAGES[id] || STAGES.corridor, key = id + '|' + r.W + '|' + r.H; let cv = CACHE.get(key); if (!cv) { if (CACHE.size > 12) CACHE.delete(CACHE.keys().next().value); cv = E.mkCanvas(r.W, r.H); const g = cv.getContext('2d'); st.bake(g, r.W, r.H); px.reset(g); CACHE.set(key, cv); } const c = r.ctx; c.imageSmoothingEnabled = false; c.drawImage(cv, 0, 0); px.reset(c); if (st.anim) st.anim(c, r.W, r.H, t); },
  /** the same, onto any 2D context (the card, the lobby) */
  paint(g, W, H, id, t) { const st = STAGES[id] || STAGES.corridor, key = id + '|' + W + '|' + H; let cv = CACHE.get(key); if (!cv) { cv = E.mkCanvas(W, H); const q = cv.getContext('2d'); st.bake(q, W, H); px.reset(q); CACHE.set(key, cv); } g.imageSmoothingEnabled = false; if (g.drawImage) g.drawImage(cv, 0, 0); px.reset(g); if (st.anim) st.anim(g, W, H, t); },
};

defStage('gallery', { bake(g, W, H) {
  bands(g, 0, 0, W, H, ['#0c1418', '#101c22', '#14262c', '#182e34']);
  // the far wall of the theatre, through the gallery's window
  const wx = 40, wy = 22, ww = W - 80, wh = H * .56 | 0; bands(g, wx, wy, ww, wh, ['#16343a', '#1c4248', '#22525a']); tileWall(g, wx, wy, ww, wh * .45 | 0, '#1c4248', '#163438', 14);
  // the table under the lamp
  const cx = W / 2; px.poly(g, [[cx - 96, wy + wh], [cx - 66, wy + wh * .62], [cx + 66, wy + wh * .62], [cx + 96, wy + wh]], '#3a5a62'); px.poly(g, [[cx - 80, wy + wh * .8], [cx - 56, wy + wh * .66], [cx + 56, wy + wh * .66], [cx + 80, wy + wh * .8]], '#1f7468'); px.poly(g, [[cx - 80, wy + wh * .8], [cx + 80, wy + wh * .8], [cx + 84, wy + wh * .9], [cx - 84, wy + wh * .9]], '#14504a');
  px.line(g, cx, wy, cx, wy + 18, '#4a5a62', 3); px.ell(g, cx, wy + 22, 34, 8, '#a8b8c4'); px.ell(g, cx, wy + 24, 28, 5, '#fff8d8');
  px.polyDither(g, [[cx - 28, wy + 26], [cx + 28, wy + 26], [cx + 78, wy + wh * .82], [cx - 78, wy + wh * .82]], '#fff8d8', .22);
  // the mullions, a rail and seats: the near layer
  for (let i = 0; i <= 4; i++) px.rect(g, wx + Math.round(i * ww / 4) - 1, wy, 3, wh, '#0a1418'); px.rect(g, wx, wy, ww, 3, '#0a1418'); px.rect(g, wx, wy + wh, ww, 4, '#28383e');
  px.rect(g, 0, H - 56, W, 3, '#39505a'); for (let i = 0; i < W; i += 46) { px.rect(g, i + 6, H - 50, 36, 22, '#16252c'); px.rect(g, i + 6, H - 50, 36, 2, '#2a3e46'); }
  bands(g, 0, H - 28, W, 28, ['#0a1216', '#070c10']);
}, anim(g, W, H, t) { const cx = W / 2 + 112, y = 40; px.rect(g, cx, y, 22, 14, '#061014'); const k = (t * 20 | 0) % 20; for (let i = 0; i < 20; i++) { const up = i === k ? 7 : i === (k + 1) % 20 ? 4 : 0; px.dot(g, cx + 1 + i, y + 10 - up, '#6cf0a0'); } } });

defStage('scrub', { bake(g, W, H) {
  tileWall(g, 0, 0, W, H * .72 | 0, '#a8c4c0', '#8aa6a2', 14); bands(g, 0, 0, W, 34, ['#7c9692', '#90aca8']);
  for (let i = 0; i < 2; i++) { const x = 70 + i * (W - 200); px.rect(g, x, 8, 60, 5, '#e8f4f0'); px.rect(g, x - 2, 6, 64, 2, '#5a6a6a'); glow(g, x + 30, 12, 44, '#f0fff8', .25); }
  // mirror and a shelf of caps
  const mx = W / 2 - 60; px.rect(g, mx, 40, 120, 66, '#3c5660'); px.rect(g, mx + 2, 42, 116, 62, '#5e7e88'); px.poly(g, [[mx + 14, 42], [mx + 40, 42], [mx + 10, 104], [mx + 2, 104], [mx + 2, 70]], '#7a9aa4'); px.rect(g, 16, 54, 66, 3, '#6a7a7a'); for (let i = 0; i < 5; i++) px.ell(g, 24 + i * 12, 50, 5, 4, ['#2bb0a2', '#35558f', '#2bb0a2', '#c8452f', '#35558f'][i]);
  // the trough sink, the near layer
  const sy = H * .6 | 0; px.rect(g, 30, sy, W - 60, 26, '#c8d4d8'); px.rect(g, 30, sy, W - 60, 3, '#f0f8fa'); px.rect(g, 36, sy + 6, W - 72, 14, '#7c8c92'); for (let i = 0; i < 3; i++) { const x = W / 2 - 100 + i * 100; px.rect(g, x, sy - 22, 4, 22, '#9aaab8'); px.rect(g, x, sy - 22, 16, 4, '#d4e0ea'); }
  bands(g, 0, H * .72 | 0, W, H, ['#566a6e', '#3c4e52', '#2a383c']);
}, anim(g, W, H, t) { const sy = H * .6 | 0, x = W / 2 + 15; const k = (t * 1.3) % 1; px.rect(g, x, sy - 18 + Math.round(k * 24), 1, 3, '#d8f0ff'); if (k > .9) px.dot(g, x - 1, sy + 7, '#ffffff'); if ((t * 3 | 0) % 17 === 0) px.blend(g, .1, 'normal', () => px.rect(g, 0, 0, W, H, '#000000')); } });

defStage('corridor', { bake(g, W, H) {
  const y0 = H * .62 | 0, cx = W / 2; bands(g, 0, 0, W, y0, ['#3a4a48', '#4e625e', '#5e7470', '#6a807c']);
  // the far wall and end door
  px.rect(g, cx - 40, y0 - 70, 80, 70, '#2c3c3c'); px.rect(g, cx - 18, y0 - 58, 36, 58, '#16343a'); px.rect(g, cx - 12, y0 - 52, 24, 16, '#7ac8c0'); glow(g, cx, y0 - 44, 26, '#a0f0e0', .2); Pix.text(g, 'THEATRE 3', cx, y0 - 68, '#ffd36a', { align: 'center' });
  // the window wall on the left: rain falls here
  px.poly(g, [[0, 12], [cx - 40, y0 - 68], [cx - 40, y0 - 22], [0, y0 + 10]], '#0e1a2c'); for (let i = 0; i < 5; i++) { const x = 8 + i * (cx - 56) / 5; px.line(g, Math.round(x), 8 + i * 8, Math.round(x), y0 + 8 - i * 6, '#2a3a3e', 2); }
  // doors on the right wall, the panels above
  for (let i = 0; i < 3; i++) { const x0 = W - 22 - i * 58, w = 48 - i * 12, top = 34 + i * 12, bot = y0 + 24 - i * 13; px.poly(g, [[x0, top], [x0 - w, top + 7], [x0 - w, bot - 5], [x0, bot]], '#3c5a60'); px.poly(g, [[x0 - 6, top + 8], [x0 - w + 6, top + 13], [x0 - w + 6, top + 26], [x0 - 6, top + 22]], '#a8d8d0'); px.dot(g, x0 - w + 5, (top + bot) >> 1, '#e8e4d8'); }
  for (let i = 0; i < 5; i++) { const w = 90 - i * 16, y = 4 + i * 8; px.rect(g, cx - w / 2 + 20 - i * 3, y, w, 3, '#f0fff8'); glow(g, cx + 20 - i * 3, y + 2, 30 - i * 4, '#e8fff8', .16); }
  floorPersp(g, W, y0, H, '#566a68', '#3e5250');
  px.rect(g, 0, y0, W, 2, '#22302e');
}, anim(g, W, H, t) { const y0 = H * .62 | 0; rainPane(g, 4, 18, W / 2 - 50 | 0, y0 - 28, t, 3); } });

defStage('office', { bake(g, W, H) {
  bands(g, 0, 0, W, H * .74 | 0, ['#2a1c1a', '#35241f', '#402c24', '#4a3328']);
  // bookshelves, left
  const shelf = (x, y, w) => { px.rect(g, x, y + 22, w, 3, '#1c120e'); let bx = x + 2, s = (x * 13 + y * 7) | 0; while (bx < x + w - 5) { s = (s * 1103515245 + 12345) & 0x7fffffff; const bw = 3 + s % 4, bh = 12 + (s >> 5) % 9, cols = ['#8a2c26', '#2c5a4a', '#c8a848', '#3c4a78', '#7a5a3a', '#d8c8a8']; px.rect(g, bx, y + 22 - bh, bw, bh, cols[(s >> 9) % 6]); px.rect(g, bx, y + 22 - bh, 1, bh, '#ffffff20'); bx += bw + 1; } };
  for (let i = 0; i < 4; i++) shelf(8, 10 + i * 34, 118);
  // the window, right
  const wx = W - 130, wy = 16, ww = 108, wh = 96; nightWin(g, wx, wy, ww, wh, '#1c120e'); px.rect(g, wx + ww / 2 - 1, wy, 3, wh, '#1c120e');
  // diploma
  px.rect(g, W / 2 - 30, 22, 46, 34, '#7a5a30'); px.rect(g, W / 2 - 27, 25, 40, 28, '#efe8d0'); for (let i = 0; i < 4; i++) px.rect(g, W / 2 - 22, 30 + i * 5, 30, 1, '#7a7468');
  // the desk: the near layer, and the lamp that lights it
  const dy = H * .68 | 0; px.rect(g, 0, dy, W, H - dy, '#1c1412'); px.rect(g, 40, dy - 8, W - 80, 10, '#5c3c24'); px.rect(g, 40, dy - 8, W - 80, 2, '#7c5434'); px.rect(g, 52, dy + 2, 60, H, '#3c2818'); px.rect(g, W - 112, dy + 2, 60, H, '#3c2818');
  const lx = W / 2 + 40; px.rect(g, lx - 1, dy - 28, 3, 20, '#c8a848'); px.poly(g, [[lx - 14, dy - 28], [lx + 14, dy - 28], [lx + 8, dy - 40], [lx - 8, dy - 40]], '#2c6a4a'); glow(g, lx, dy - 16, 60, '#ffd890', .32); px.rect(g, lx - 30, dy - 9, 18, 1, '#efe8d0'); px.rect(g, lx - 52, dy - 11, 26, 3, '#a83a32');
}, anim(g, W, H, t) { rainPane(g, W - 130, 16, 108, 96, t, 5); } });

defStage('radiology', { bake(g, W, H) {
  bands(g, 0, 0, W, H, ['#04090e', '#060e14', '#08121a', '#0a161e']);
  const box = (x, y, w, h, film) => { px.rect(g, x - 2, y - 2, w + 4, h + 4, '#2a3a44'); px.rect(g, x, y, w, h, '#d8f0ff'); glow(g, x + w / 2, y + h / 2, Math.max(w, h) * .8, '#b8e8ff', .2); bands(g, x + 3, y + 3, w - 6, h - 6, ['#16242c', '#1a2c36', '#16242c']); if (film === 'ribs') { for (let i = 0; i < 6; i++) { px.line(g, x + w / 2, y + 8 + i * 8, x + 8, y + 12 + i * 10, '#9cb4c0', 2); px.line(g, x + w / 2, y + 8 + i * 8, x + w - 8, y + 12 + i * 10, '#9cb4c0', 2); } px.rect(g, x + w / 2 - 2, y + 5, 4, h - 10, '#c0d4dc'); } else if (film === 'skull') { px.ell(g, x + w / 2, y + h / 2, w * .34, h * .36, '#8ca4b0'); px.ell(g, x + w / 2, y + h / 2, w * .28, h * .3, '#1c2c36'); px.ell(g, x + w / 2 + 5, y + h / 2, 5, 3, '#5ff0e0'); } else { px.ell(g, x + w / 2, y + h / 2 + 4, 15, 12, '#8ca4b0'); px.rect(g, x + w / 2 - 3, y + 6, 6, h - 12, '#c0d4dc'); } };
  box(36, 22, 88, 104, 'ribs'); box(138, 30, 70, 88, 'skull'); box(W - 112, 22, 76, 100, 'hand');
  // the far shelf of files and a desk: the near layer
  for (let i = 0; i < 10; i++) px.rect(g, 222 + (W - 450) * (i % 2) * 0 + i * 2, 64 + i * 3, 30, 2, i % 2 ? '#3c4a54' : '#2c3a44');
  const dy = H * .7 | 0; px.rect(g, 0, dy, W, H - dy, '#0a1218'); px.rect(g, 0, dy, W, 3, '#2a3e4a'); px.rect(g, 54, dy - 14, 24, 14, '#d8e4ec'); px.ell(g, 66, dy - 14, 12, 3, '#3a2a1e'); px.rect(g, 78, dy - 10, 4, 6, '#d8e4ec'); px.rect(g, W - 148, dy - 12, 32, 12, '#c89a5a'); px.rect(g, W - 146, dy - 16, 28, 4, '#f4e8c0');
}, anim(g, W, H, t) { const dy = H * .7 | 0, f = Math.sin(t * 2.4) > .96; if (f) px.blend(g, .12, 'normal', () => px.rect(g, 34, 20, 92, 108, '#000000')); for (let i = 0; i < 3; i++) { const k = (t * .5 + i * .33) % 1; px.dot(g, 62 + i * 3 + Math.round(Math.sin(t * 2 + i) * 2), dy - 18 - Math.round(k * 14), '#6a7a84'); } } });

const craneSil = (g, x, base, h, s = 1, c = '#0a1018') => { px.rect(g, x, base - h, 5 * s, h, c); px.line(g, x - 26 * s, base - h + 4, x + 58 * s, base - h - 2, c, 3); px.line(g, x + 2, base - h - 16 * s, x - 22 * s, base - h + 3, c); px.line(g, x + 2, base - h - 16 * s, x + 52 * s, base - h - 1, c); px.rect(g, x + 2, base - h - 16 * s, 2, 16 * s, c); px.line(g, x + 36 * s, base - h, x + 36 * s, base - h + 34 * s, '#141c26'); };
const sea = (g, W, y, H) => { bands(g, 0, y, W, H - y, ['#060e18', '#08121e', '#0a1624', '#0c1a2a']); };
defStage('harbor', { bake(g, W, H) {
  bands(g, 0, 0, W, H * .62 | 0, ['#04060e', '#060a18', '#0a1022', '#10182c', '#182236']); px.disc(g, W * .72 | 0, 34, 12, '#d8dce8'); px.disc(g, (W * .72 | 0) - 4, 31, 11, '#10182c'); for (let i = 0; i < 40; i++) px.dot(g, (i * 97) % W, (i * 41) % 70, '#3a4a64');
  const base = H * .62 | 0; for (let i = 0; i < 9; i++) { const x = 8 + i * (W / 9), h = 16 + (i * 37) % 30; px.rect(g, x, base - h, 34, h, '#0c1420'); for (let j = 0; j < 6; j++) if ((i * j * 7) % 5 < 2) px.dot(g, x + 3 + j * 5, base - h + 4 + (j % 3) * 5, '#e8c060'); }
  craneSil(g, 60, base, 74, 1.1); craneSil(g, W - 130, base, 64, 1); craneSil(g, W / 2 - 40, base, 52, .8, '#0c1420');
  sea(g, W, base, H); for (let i = 0; i < 26; i++) { const x = (i * 83) % W, y = base + 4 + (i * 29) % (H - base - 8); px.rect(g, x, y, 8 + i % 16, 1, i % 3 ? '#1c2c40' : '#3a4c64'); }
  px.rect(g, 0, H - 26, W, 26, '#0e1216'); px.rect(g, 0, H - 26, W, 2, '#3a4048'); for (let i = 0; i < W; i += 60) { px.rect(g, i + 8, H - 38, 5, 12, '#1a1e24'); px.rect(g, i + 2, H - 40, 17, 3, '#22262c'); } glow(g, W * .28 | 0, H - 44, 40, '#ffc870', .2);
}, anim(g, W, H, t) { for (let i = 0; i < 90; i++) { const x = (i * 53 + t * 80) % W, y = (i * 97 + t * 420) % H; px.line(g, Math.round(x), Math.round(y), Math.round(x - 1), Math.round(y + 5), '#6a84a4'); } const blink = Math.sin(t * 2) > .3; if (blink) { px.dot(g, 62, (H * .62 | 0) - 90, '#ff3a2a'); px.dot(g, W - 128, (H * .62 | 0) - 80, '#ff3a2a'); } } });

defStage('gala', { bake(g, W, H) {
  bands(g, 0, 0, W, H, ['#1c1426', '#2a1a2c', '#3a2230', '#2a1a2c']);
  // tall windows and banners
  for (let i = 0; i < 4; i++) { const x = 20 + i * (W - 60) / 4; nightWin(g, x, 22, 40, 84, '#6a5a3a'); }
  for (let i = 0; i < 3; i++) { const x = 72 + i * (W - 60) / 4; px.rect(g, x, 10, 28, 96, '#f0f4f0'); px.poly(g, [[x, 106], [x + 14, 98], [x + 28, 106]], '#3a2230'); px.ell(g, x + 14, 34, 8, 8, '#5ff0e0'); px.ell(g, x + 14, 34, 5, 5, '#f0f4f0'); for (let k = 0; k < 4; k++) px.rect(g, x + 5, 52 + k * 8, 18, 2, '#7a8a90'); }
  Pix.text(g, 'A LIFE WITHOUT PAIN', W / 2, 110, '#e8fbf6', { align: 'center' });
  // the floor and the crowd: the near layer
  bands(g, 0, H * .62 | 0, W, H - (H * .62 | 0), ['#5a4638', '#46362c', '#2c2220']);
  for (let i = 0; i < 18; i++) { const x = (i * 71) % W, h = 34 + i * 5 % 22, base = H * .72 + (i % 3) * 8 | 0, c = i % 2 ? '#14101c' : '#1c1626'; px.rect(g, x, base - h, 16, h + 20, c); px.disc(g, x + 8, base - h - 5, 6, i % 3 ? '#2a2230' : '#3a2e3a'); }
}, anim(g, W, H, t) { for (const cx of [W * .3 | 0, W * .7 | 0]) { px.rect(g, cx, 0, 1, 12, '#a88a4a'); px.ell(g, cx, 18, 26, 8, '#c8a848'); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; const X = cx + Math.round(Math.cos(a) * 24), Y = 18 + Math.round(Math.sin(a) * 7); px.dot(g, X, Y, Math.sin(t * 7 + i * 2) > 0 ? '#ffffff' : '#ffe9a0'); px.dot(g, X, Y + 3, '#ffe9a0'); } px.ddisc(g, cx, 18, 44, '#ffe9a0', .12); } } });

defStage('shipward', { bake(g, W, H) {
  bands(g, 0, 0, W, H, ['#1c2422', '#26302c', '#2e3a34', '#242e2a']);
  for (let j = 0; j < 5; j++) for (let i = 0; i < W; i += 28) { px.dot(g, i + (j % 2) * 14, 12 + j * 34, '#46524c'); px.dot(g, i + 1 + (j % 2) * 14, 13 + j * 34, '#10161a'); } for (let j = 1; j < 5; j++) px.rect(g, 0, j * 34 - 6, W, 1, '#141c1a');
  // portholes
  for (const x of [66, W - 92]) { px.disc(g, x, 56, 19, '#8a7a4a'); px.disc(g, x, 56, 16, '#0a1224'); px.disc(g, x, 60, 14, '#101c30'); }
  // bunks and a pipe: the near layer
  px.rect(g, 0, 6, W, 6, '#4a564e'); px.rect(g, 0, 6, W, 1, '#6a766e');
  for (const [x, w] of [[14, 110], [W - 124, 110]]) { px.rect(g, x, H * .62 | 0, w, 8, '#c8ccc0'); px.rect(g, x, (H * .62 | 0) + 8, w, 6, '#3c4a44'); px.rect(g, x + 4, (H * .62 | 0) - 6, 26, 8, '#e8ece0'); px.rect(g, x, H * .36 | 0, w, 6, '#c8ccc0'); px.rect(g, x, (H * .36 | 0) + 6, w, 4, '#3c4a44'); for (const dx of [0, w - 3]) px.rect(g, x + dx, H * .3 | 0, 3, H, '#5a665e'); }
  bands(g, 0, H * .8 | 0, W, H - (H * .8 | 0), ['#2a2e2a', '#1e2220']);
}, anim(g, W, H, t) { const sw = Math.sin(t * 1.2) * 34, x = W / 2 + sw, y = 62; px.line(g, W / 2, 10, Math.round(x), y, '#6a766e'); px.rect(g, Math.round(x) - 5, y, 10, 8, '#c8a848'); px.disc(g, Math.round(x), y + 9, 3, '#fff0c0'); px.ddisc(g, Math.round(x), y + 12, 80, '#ffd890', .28); rainPane(g, 52, 42, 28, 28, t, 2); rainPane(g, W - 106, 42, 28, 28, t, 4); } });

defStage('chapel', { bake(g, W, H) {
  bands(g, 0, 0, W, H, ['#120e1c', '#181226', '#1e1628', '#161020']);
  const cx = W / 2; px.poly(g, [[cx - 56, 104], [cx - 56, 44], [cx, 6], [cx + 56, 44], [cx + 56, 104]], '#2a2234');
  const cols = ['#d84a4a', '#4a7ad8', '#e8c43a', '#5ad88a', '#a860d8']; px.disc(g, cx, 54, 34, '#1a1422'); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, c = cols[i % 5]; px.poly(g, [[cx, 54], [cx + Math.cos(a) * 30, 54 + Math.sin(a) * 30], [cx + Math.cos(a + .5) * 30, 54 + Math.sin(a + .5) * 30]], c); px.line(g, cx, 54, Math.round(cx + Math.cos(a) * 30), Math.round(54 + Math.sin(a) * 30), '#120e1c'); } px.disc(g, cx, 54, 9, '#f4e8c0'); glow(g, cx, 54, 80, '#c8a8ff', .15);
  for (let i = 0; i < 3; i++) { const x = 30 + i * 30; px.poly(g, [[x, 96], [x, 36], [x + 9, 24], [x + 18, 36], [x + 18, 96]], '#2a2a4a'); px.poly(g, [[W - x - 18, 96], [W - x - 18, 36], [W - x - 9, 24], [W - x, 36], [W - x, 96]], '#2a2a4a'); }
  bands(g, 0, 116, W, H - 116, ['#2c2030', '#221828', '#1a1220']);
  for (let j = 0; j < 4; j++) { const y = 126 + j * 26, h = 8 + j * 2; for (const [x, w] of [[12 - j * 2, cx - 44 + j * 2], [cx + 32, cx - 44 + j * 2]]) { px.rect(g, x, y, w, h, '#3c2a20'); px.rect(g, x, y, w, 2, '#5a4030'); } }
}, anim(g, W, H, t) { const cx = W / 2; for (let i = 0; i < 6; i++) { const x = cx - 48 + i * 19, y = 106; px.rect(g, x, y, 3, 9, '#efe8d8'); const fl = Math.sin(t * 11 + i * 3) > 0 ? 1 : 0; px.rect(g, x + 1, y - 4 + fl, 1, 4 - fl, '#ffd070'); px.dot(g, x + 1, y - 2, '#ffffff'); px.ddisc(g, x + 1, y - 3, 12, '#ffd070', .16); } } });

defStage('wardroom', { bake(g, W, H) {
  bands(g, 0, 0, W, H * .66 | 0, ['#3c4c48', '#4a5e58', '#566c66']);
  // curtains, a bed, a monitor on a stand, a television on the wall
  for (let i = 0; i < 12; i++) px.rect(g, i * 9, 8, 8, 112, i % 2 ? '#7fa8a0' : '#6c968e'); px.rect(g, 0, 6, 112, 3, '#c8d4d0');
  px.rect(g, W - 124, 16, 92, 60, '#10161a'); px.rect(g, W - 120, 20, 84, 52, '#26344c');
  nightWin(g, 124, 18, 66, 78, '#2c3c3c');
  const by = H * .56 | 0; px.rect(g, 40, by, W - 100, 26, '#e8ece6'); px.rect(g, 40, by, 60, 10, '#ffffff'); px.rect(g, 40, by + 26, W - 100, 8, '#7a8a8a'); for (const x of [46, W - 72]) px.rect(g, x, by + 34, 5, H, '#3a4a4a');
  bands(g, 0, H * .8 | 0, W, H - (H * .8 | 0), ['#4e625e', '#3a4e4a']);
}, anim(g, W, H, t) { rainPane(g, 124, 18, 66, 78, t, 7); const x = W - 120, y = 20; for (let i = 0; i < 12; i++) if (Math.sin(t * 2 + i) > .2) px.dot(g, x + 8 + i * 6, y + 44 + (i % 3), '#6a84a4'); px.rect(g, x + 34, y + 14, 16, 16, '#c8ccd4'); px.rect(g, x + 28, y + 30, 28, 16, '#232a40'); Pix.text(g, 'ANODYNE', x + 42, y + 3, '#5ff0e0', { align: 'center' }); } });

// the title's skyline: rain-black sky, harbor cranes, the hospital's lit windows, an ambulance's light sweeping past
defStage('skyline', { bake(g, W, H) {
  const base = H * .74 | 0; bands(g, 0, 0, W, base, ['#02040a', '#040712', '#060b1a', '#0a1022', '#0e162c', '#141c34']);
  for (let i = 0; i < 16; i++) { const x = (i * 137) % W, y = (i * 53) % 90, r = 26 + (i * 17) % 40; px.polyDither(g, [[x - r, y], [x + r, y - 8], [x + r * 1.3, y + 12], [x - r * .8, y + 16]], '#1a2240', .3); }
  // far city
  for (let i = 0; i < 26; i++) { const x = i * (W / 26), h = 14 + (i * 41) % 34; px.rect(g, x, base - h, W / 26 + 1, h, '#0a1220'); if (i % 2) px.dot(g, x + 4, base - h + 4, '#e8c060'); }
  craneSil(g, 26, base, 96, 1.3, '#060a14'); craneSil(g, W - 92, base, 82, 1.2, '#060a14');
  // the hospital
  const hx = W / 2 - 100, hw = 184, hy = base - 62; px.rect(g, hx, hy, hw, 62, '#121a24'); px.rect(g, hx + 30, hy - 14, 66, 14, '#16202a'); px.rect(g, hx + 124, hy - 24, 80, 86, '#1c2c36'); px.rect(g, hx + 126, hy - 22, 76, 84, '#25404a');   // the gleaming east wing
  for (let j = 0; j < 4; j++) for (let i = 0; i < 12; i++) { const X = hx + 6 + i * 10, Y = hy + 6 + j * 13; const on = ((i * 7 + j * 13) % 5) < 2; px.rect(g, X, Y, 6, 8, on ? '#e8c068' : '#0a1018'); if (on) px.rect(g, X, Y, 6, 2, '#fff0b0'); }
  for (let j = 0; j < 6; j++) for (let i = 0; i < 7; i++) { const X = hx + 130 + i * 10, Y = hy - 18 + j * 13; px.rect(g, X, Y, 7, 9, ((i + j) % 4) ? '#6ac8c8' : '#a8f0e8'); }
  px.rect(g, hx + 56, hy - 12, 9, 9, '#d84a4a'); px.rect(g, hx + 59, hy - 11, 3, 7, '#ffffff'); px.rect(g, hx + 57, hy - 9, 7, 3, '#ffffff');
  // the billboard on the east wing
  const bx = hx + 212; px.rect(g, bx, base - 44, 66, 22, '#e8fbf6'); px.rect(g, bx + 6, base - 22, 3, 22, '#3a4a54'); px.rect(g, bx + 56, base - 22, 3, 22, '#3a4a54'); E.font.text(g, 'A LIFE', bx + 33, base - 42, '#0b2a30', { outline: false, align: 'center' }); E.font.text(g, 'WITHOUT PAIN', bx + 33, base - 33, '#0b2a30', { outline: false, align: 'center', font: 'tiny' });
  sea(g, W, base, H); for (let i = 0; i < 40; i++) { const x = (i * 83) % W, y = base + 3 + (i * 29) % (H - base - 4), hit = x > hx && x < hx + hw; px.rect(g, x, y, 6 + i % 14, 1, hit ? (i % 2 ? '#c8a058' : '#3a5a60') : i % 3 ? '#16243a' : '#2a3a54'); }
  px.rect(g, 0, H - 13, W, 13, '#0a0e12'); px.rect(g, 0, H - 13, W, 1, '#2a3038');
}, anim(g, W, H, t) { const cyc = (t * .14) % 1.3, base = H - 13; if (cyc < 1) { const x = -40 + cyc * (W + 80), bl = Math.sin(t * 10) > 0; px.rect(g, x, base - 13, 30, 13, '#d8dcdc'); px.rect(g, x + 22, base - 9, 8, 6, '#46606a'); px.rect(g, x + 2, base - 8, 12, 3, '#d84a4a'); px.disc(g, x + 6, base, 3, '#101418'); px.disc(g, x + 24, base, 3, '#101418'); px.rect(g, x + 12, base - 15, 6, 2, bl ? '#ff4a3a' : '#4a7aff'); px.ddisc(g, x + 15, base - 14, 40, bl ? '#ff4a3a' : '#4a7aff', .3); } if (Math.sin(t * .4) > .985) px.blend(g, .3, 'add', () => px.rect(g, 0, 0, W, H * .7, '#c8d8ff')); } });
})();
