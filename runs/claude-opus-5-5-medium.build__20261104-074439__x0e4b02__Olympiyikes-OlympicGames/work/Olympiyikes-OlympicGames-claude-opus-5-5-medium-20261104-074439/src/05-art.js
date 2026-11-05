/* OLYMPIYIKES! — art drawn in code: flags, pictograms, the emblem, laurels, medals, crowds, jumbotrons, fireworks, the mascot. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px;
const Art = O.Art = {};

/* ---- flags (§7.7): drawn from each nation's spec, with a 2-step cloth wave ---- */
Art.flag = (g, x, y, w, h, nat, wave) => {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const c = nat.colors, k = nat.flag, cx = x + w / 2, cy = y + h / 2, m = Math.min(w, h);
  px.rect(g, x, y, w, h, c.a);
  if (k === 'sun') { px.rect(g, x, y, w, h, c.b); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; px.line(g, cx, cy, cx + Math.cos(a) * m * .42, cy + Math.sin(a) * m * .42, c.a, Math.max(1, m / 16)); } px.disc(g, cx, cy, m * .22, c.a); }
  else if (k === 'snow') { px.rect(g, x, y, w, h, c.c); px.rect(g, x + 1, y + 1, w - 2, h - 2, c.a); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; px.line(g, cx - Math.cos(a) * m * .32, cy - Math.sin(a) * m * .32, cx + Math.cos(a) * m * .32, cy + Math.sin(a) * m * .32, c.b, Math.max(1, m / 14)); } px.disc(g, cx, cy, m * .08, c.b); }
  else if (k === 'bolt') { px.poly(g, [[x, y], [x + w, y], [x, y + h]], c.a); px.poly(g, [[x + w, y], [x + w, y + h], [x, y + h]], c.b); px.poly(g, [[cx + m * .1, y + h * .12], [cx - m * .22, cy + 1], [cx, cy], [cx - m * .1, y + h * .88], [cx + m * .22, cy - 1], [cx, cy]], c.c); }
  else if (k === 'stripes') { const n = 5; for (let i = 0; i < n; i++) px.rect(g, x + Math.floor(i * w / n), y, Math.ceil(w / n), h, i % 2 ? c.b : c.a); px.disc(g, cx - m * .07, cy - m * .05, m * .1, '#ffffff'); px.disc(g, cx + m * .07, cy - m * .05, m * .1, '#ffffff'); px.poly(g, [[cx - m * .17, cy], [cx + m * .17, cy], [cx, cy + m * .2]], '#ffffff'); }
  else if (k === 'volcano') { px.rect(g, x, y, w, h, c.b); px.poly(g, [[x + w * .2, y + h], [cx - m * .1, cy - m * .1], [cx + m * .1, cy - m * .1], [x + w * .8, y + h]], c.a); px.disc(g, cx, cy - m * .28, m * .1, '#ffd23a'); }
  else if (k === 'waves') { px.rect(g, x, y, w, h, c.a); for (let r = 0; r < 3; r++) for (let i = 0; i < w; i++) { const yy = y + h * (.3 + r * .2) + Math.sin(i / w * Math.PI * 4) * h * .06; px.rect(g, x + i, Math.round(yy), 1, Math.max(1, Math.round(h / 12)), c.c); } }
  else if (k === 'peak') { px.rect(g, x, y, w, h, c.a); px.poly(g, [[x + w * .15, y + h * .85], [cx, y + h * .3], [x + w * .85, y + h * .85]], '#ffffff'); for (let i = 0; i < 3; i++) px.disc(g, x + w * (.3 + i * .2), y + h * .15, Math.max(1, m * .06), c.b); }
  else if (k === 'neon') { px.rect(g, x, y, w, h, c.b); px.disc(g, cx, cy, m * .34, c.c); px.disc(g, cx, cy, m * .26, c.b); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU5 * 2; px.line(g, cx, cy, cx + Math.cos(a) * m * .2, cy + Math.sin(a) * m * .2, c.a, Math.max(1, m / 12)); } }
  if (wave) { for (let i = 0; i < w; i += 2) { const d = Math.sin(game.real * 5 + i * .35) > .4; if (d) px.blend(g, .18, 'normal', () => px.rect(g, x + i, y, 1, h, '#000000')); } }
  px.blend(g, .35, 'normal', () => px.rect(g, x, y + h, w, 1, '#000000'));
};
const TAU5 = Math.PI * 2 / 5;

/* ---- pictograms (§7.7): white figures on a rounded tile, summer coral / winter ice blue ---- */
const PIC = {
  sprint: (L, D) => { D(8, 3, 1.6); L(8, 5, 6, 10); L(6, 10, 9, 13); L(9, 13, 9, 15); L(6, 10, 3, 12); L(7, 7, 10, 9); L(7, 7, 4, 6); },
  javelin: (L, D) => { D(6, 4, 1.6); L(6, 6, 7, 10); L(7, 10, 9, 14); L(7, 10, 5, 14); L(6, 7, 3, 9); L(6, 7, 9, 5); L(2, 13, 14, 2); },
  swim: (L, D) => { D(6, 8, 1.6); L(7, 9, 12, 9); L(8, 8, 11, 4); L(11, 4, 14, 7); for (let i = 1; i < 15; i += 3) { L(i, 12, i + 1, 11); L(i + 1, 11, i + 2, 12); } },
  diving: (L, D) => { D(8, 11, 1.6); L(8, 9, 8, 4); L(8, 4, 6, 1); L(8, 4, 10, 1); L(8, 9, 8, 13); L(5, 14, 11, 14); L(4, 13, 3, 11); L(12, 13, 13, 11); },
  archery: (L, D) => { D(6, 4, 1.6); L(6, 6, 6, 10); L(6, 10, 4, 14); L(6, 10, 8, 14); L(6, 7, 12, 7); L(6, 7, 9, 8); L(12, 2, 12, 12); L(12, 2, 9, 7); L(12, 12, 9, 7); },
  weights: (L, D) => { D(8, 5, 1.6); L(8, 7, 8, 10); L(8, 10, 5, 14); L(8, 10, 11, 14); L(8, 7, 4, 3); L(8, 7, 12, 3); L(2, 3, 14, 3); L(2, 1, 2, 5); L(14, 1, 14, 5); },
  skijump: (L, D) => { D(10, 5, 1.6); L(9, 7, 5, 10); L(5, 10, 3, 9); L(9, 7, 6, 9); L(1, 13, 12, 7); L(2, 14, 13, 8); },
  downhill: (L, D) => { D(10, 5, 1.6); L(9, 7, 6, 9); L(6, 9, 8, 12); L(8, 7, 12, 9); L(2, 12, 14, 14); L(13, 9, 15, 12); },
  bobsled: (L, D) => { D(6, 6, 1.6); D(10, 6, 1.6); L(2, 10, 14, 10); L(2, 10, 4, 13); L(4, 13, 13, 13); L(14, 10, 13, 13); L(1, 14, 15, 14); },
  figure: (L, D) => { D(8, 3, 1.6); L(8, 5, 8, 10); L(8, 10, 8, 14); L(8, 10, 13, 8); L(8, 6, 3, 4); L(8, 6, 13, 4); L(6, 14, 10, 14); },
  curling: (L, D) => { D(5, 4, 1.6); L(5, 6, 6, 10); L(6, 10, 3, 13); L(6, 10, 9, 12); L(5, 7, 10, 10); D(12, 12, 2.2); L(10, 9, 14, 9); },
  hockey: (L, D) => { D(6, 3, 1.6); L(6, 5, 7, 10); L(7, 10, 5, 14); L(7, 10, 10, 13); L(6, 7, 10, 9); L(10, 9, 12, 14); L(12, 14, 15, 14); D(14, 12, 1); }
};
Art.picto = (g, x, y, id, s = 2, season) => {
  x = Math.round(x); y = Math.round(y);
  const bg = season === 'winter' ? '#3fa8e8' : season === 'summer' ? '#ff6b4a' : '#f2b632', S = 16 * s;
  px.rect(g, x + 1, y, S - 2, S, bg); px.rect(g, x, y + 1, S, S - 2, bg); px.rect(g, x + 1, y + S - 2, S - 2, 2, E.shade(bg, -.25));
  const L = (a, b, c, d) => px.line(g, x + a * s, y + b * s, x + c * s, y + d * s, '#ffffff', Math.max(1, Math.round(s * .9)));
  const D = (a, b, r) => px.disc(g, x + a * s, y + b * s, r * s, '#ffffff');
  (PIC[id] || PIC.sprint)(L, D);
  return S;
};

/* ---- emblem: the Yikes Flame (summer orange / winter blue) inside a gold laurel ---- */
Art.laurel = (g, cx, cy, col = '#f2b632', s = 1) => {
  for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + sd * (.5 + i * .45); px.disc(g, cx + Math.cos(a) * 6 * s * sd * -1 * -1, cy + Math.sin(a) * 6 * s, Math.max(1, 1.6 * s), i % 2 ? col : E.shade(col, -.2)); }
};
Art.emblem = (g, cx, cy, s = 1) => {
  for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) { const a = Math.PI * .5 + sd * (.35 + i * .36); px.ell(g, cx + Math.cos(a) * 15 * s, cy + Math.sin(a) * 15 * s, 3 * s, 2 * s, i % 2 ? '#f2b632' : '#c8901a'); }
  const t = game.real, fl = (side, col, col2) => { const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8, w = Math.sin(u * Math.PI) * 9 * s * (1 + .08 * Math.sin(t * 9 + k)); pts.push([cx + side * w, cy + 10 * s - u * 26 * s]); } pts.push([cx, cy - 16 * s]); pts.push([cx, cy + 10 * s]); px.poly(g, pts, col); px.disc(g, cx + side * 3 * s, cy + 3 * s, 3 * s, col2); };
  fl(-1, '#ff7a2a', '#ffd23a'); fl(1, '#3fa8e8', '#c8f0ff');
};

/* ---- medal icon with its rank number ---- */
Art.medal = (g, x, y, rank, s = 1) => {
  const col = O.MEDAL[rank] || '#666'; px.line(g, x - 3 * s, y - 7 * s, x, y - 2 * s, '#3a6ae0', s); px.line(g, x + 3 * s, y - 7 * s, x, y - 2 * s, '#e0403a', s);
  px.disc(g, x, y + 2 * s, 5 * s, E.shade(col, -.3)); px.disc(g, x, y + 2 * s, 4 * s, col);
  E.font.text(g, String(rank), x, y - 1 * s, '#3a2a10', { align: 'center', outline: false, font: s > 1 ? 'normal' : 'tiny' });
};

/* ---- crowd painter: rows of spectators in a screen rectangle; level 0..1 makes them bounce ---- */
Art.crowd = (g, x0, y0, w, h, level, seed, colors, o = {}) => {
  const step = o.step || 4, rowH = o.rowH || 6, t = game.real, wave = o.wave;
  for (let ry = 0; ry * rowH < h; ry++) for (let cx = 0; cx * step < w; cx++) {
    const hh = E.hash2(cx * 7 + seed, ry * 13 + seed * 3), xx = x0 + cx * step + (ry % 2) * 2, yy = y0 + ry * rowH;
    const bounce = Math.max(0, Math.sin(t * (6 + hh * 4) + hh * 20)) * level * 2 + (wave && Math.sin(t * 6 - cx * .25) > .85 ? 2 : 0);
    const shirt = colors[Math.floor(hh * 97) % colors.length], skin = ['#f0c8a8', '#c88a5e', '#8d5a3b', '#5a3420', '#e0b090'][Math.floor(hh * 53) % 5];
    px.rect(g, xx, yy + 2 - bounce, 3, 3, shirt); px.rect(g, xx + 1, yy - bounce, 1, 2, skin);
    if (level > .5 && hh > .8) px.rect(g, xx + (hh > .9 ? 3 : -1), yy - 2 - bounce, 1, 2, skin);
    if (hh > .985 && Math.sin(t * 3 + hh * 99) > .97) px.rect(g, xx, yy - bounce, 2, 2, '#ffffff');   // camera flash
  }
};

/* ---- a dot-matrix jumbotron panel ---- */
Art.jumbo = (g, x, y, w, h, lines, o = {}) => {
  x = Math.round(x); y = Math.round(y);
  px.rect(g, x - 2, y - 2, w + 4, h + 4, '#2a2a34'); px.rect(g, x, y, w, h, '#06080e');
  for (let yy = 0; yy < h; yy += 2) for (let xx = 0; xx < w; xx += 2) if (E.hash2(xx, yy) > .97) px.rect(g, x + xx, y + yy, 1, 1, '#1a1a10');
  lines.forEach((ln, i) => E.font.text(g, ln, x + w / 2, y + 3 + i * 9, o.color || '#ffb03a', { align: 'center', outline: false, font: 'tiny' }));
};

/* ---- fireworks and confetti, in world space ---- */
Art.firework = (x, y, z, colors) => { const P = game.particles; P.glints(x, y, z, 14, colors[0], 40); P.bits(x, y, z, 18, colors); P.sparks(x, y, z, 10, null, { color: colors[1] || colors[0] }); };
Art.confetti = (x, y, z, colors, n = 30) => game.particles.bits(x, y, z, n, colors);

/* ---- the mascot YIKESY: a round snow-yeti with a flame tuft and a two-season scarf ---- */
Art.mascot = () => new E.Blob({ R: 9, ears: 'cat', feet: true, mouth: true, colors: { base: '#f8f8ff', dk: '#d8e2f0', lt: '#ffffff', eye: '#1a1d2e', pupil: '#1a1d2e' } });
Art.drawMascot = (r, blob, x, y, z) => {
  r.actor(x, y, z, (g, ox, oy) => { blob.draw(g, ox, oy, r.view); px.rect(g, ox - 8, oy - 9, 8, 3, '#ff7a2a'); px.rect(g, ox, oy - 9, 8, 3, '#3fa8e8'); });
  r.queue(x, y, z + 21, g => { const p = r.w(x, y, z + 21); for (let i = 0; i < 3; i++) px.disc(g, p[0] + Math.sin(game.real * 9 + i * 2) * 2, p[1] - i * 2 - 1, 3 - i, ['#ff6a1a', '#ffb03a', '#fff0a0'][i]); }, { emissive: true });
};

/* ---- generic venue pieces in world space (brawler/side): stands with crowd, a jumbotron, flags on poles ---- */
Art.stands = (r, x0, x1, y, z0, rows, level, colors, seed) => {
  r.queue((x0 + x1) / 2, y, 0, g => {
    const a = r.w(x0, y, z0), b = r.w(x1, y, z0), top = r.w(x0, y, z0 + rows * 10);
    const L = Math.max(-20, Math.min(a[0], b[0])), R = Math.min(r.W + 20, Math.max(a[0], b[0])); if (R < L) return;
    px.rect(g, L, top[1] - 4, R - L, a[1] - top[1] + 4, '#2a2f4a');
    for (let i = 0; i < rows; i++) { const yy = r.w(x0, y, z0 + i * 10)[1]; px.rect(g, L, yy - 1, R - L, 1, '#40486a'); }
    Art.crowd(g, L, top[1] - 2, R - L, a[1] - top[1], level, seed, colors, { wave: O.Crowd && O.Crowd.wave > 0 });
    px.rect(g, L, a[1] - 2, R - L, 3, '#1a1e34');
  }, { bias: -1000 });
};
Art.sky = (r, cols) => r.sky(cols);
})();
