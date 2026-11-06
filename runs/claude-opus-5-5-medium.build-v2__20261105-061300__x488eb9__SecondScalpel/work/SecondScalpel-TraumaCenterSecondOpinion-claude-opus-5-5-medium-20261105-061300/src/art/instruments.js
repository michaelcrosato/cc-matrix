// The eight instruments, drawn from the tip, gloved hand behind and to the right so it never hides the target; and the wheel's 20 x 20 tiles.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E;
const glove = (g, x, y, col) => { const T = E.tones(col); px.poly(g, [[x + 16, y + 10], [x + 25, y + 6], [x + 34, y + 12], [x + 36, y + 22], [x + 28, y + 30], [x + 19, y + 25]], T.base); px.poly(g, [[x + 19, y + 25], [x + 28, y + 30], [x + 36, y + 22], [x + 30, y + 21], [x + 24, y + 22]], T.sh); for (const [a, b, c, d] of [[x + 17, y + 12, x + 7, y + 7], [x + 21, y + 9, x + 12, y + 2], [x + 25, y + 7, x + 19, y - 1]]) { px.line(g, a, b, c, d, T.sh, 4); px.line(g, a, b - 1, c, d - 1, T.base, 2); } px.line(g, x + 20, y + 22, x + 11, y + 18, T.sh, 4); px.line(g, x + 20, y + 21, x + 11, y + 17, T.lt, 2); px.line(g, x + 26, y + 10, x + 33, y + 14, T.lt, 1); px.poly(g, [[x + 28, y + 30], [x + 36, y + 22], [x + 46, y + 32], [x + 38, y + 42]], '#c8d4dc'); px.line(g, x + 28, y + 30, x + 36, y + 22, '#8a98a0', 2); };
const steel = (g, x0, y0, x1, y1, w = 2) => { px.line(g, x0 | 0, y0 | 0, x1 | 0, y1 | 0, '#5a6a78', w + 1); px.line(g, x0 | 0, y0 | 0, x1 | 0, y1 | 0, '#d8e4ee', w > 1 ? w - 1 : 1); };
const IN = {
  forceps(g, x, y, s, t) { const o = s.closed ? 0 : 4; steel(g, x + o * .4, y - o * .3, x + 18, y + 16); steel(g, x - o * .3, y + o * .5, x + 16, y + 18); },
  scalpel(g, x, y, s, t) { px.poly(g, [[x, y], [x + 9, y + 5], [x + 7, y + 10]], '#e8f0f8'); if ((t * 1.5) % 1 < .12) px.dot(g, x + 5, y + 4, '#ffffff'); steel(g, x + 7, y + 8, x + 20, y + 20, 3); },
  suture(g, x, y, s, t) { const a = s.down ? t * 8 : .5; for (let k = 0; k < 6; k++) { const q = k / 5 * 2; px.dot(g, x + Math.cos(q + a) * 5 + 4 | 0, y + Math.sin(q + a) * 5 + 4 | 0, '#e8f0f8'); } steel(g, x + 6, y + 6, x + 20, y + 18); px.line(g, x + 2, y + 1, x + 10, y - 7, '#5aa8ff', 1); },
  salve(g, x, y, s, t) { px.rect(g, x + 2, y - 1, 6, 5, '#6ee0a8'); px.dot(g, x + 3, y, '#d0ffe8'); steel(g, x + 6, y + 4, x + 20, y + 18, 3); if (s.down) for (let i = 0; i < 2; i++) px.dot(g, x + Math.sin(t * 30 + i) * 6 | 0, y + Math.cos(t * 23 + i) * 6 | 0, '#b0ffe0'); },
  syringe(g, x, y, s, t) { px.line(g, x, y, x + 7, y + 6, '#e8f0f8', 1); const f = s.fill || 0, bx = x + 7, by = y + 6, ex = x + 19, ey = y + 17; px.line(g, bx, by, ex, ey, '#d8f0ff', 6); px.line(g, bx, by, bx + (ex - bx) * f | 0, by + (ey - by) * f | 0, '#ffe08a', 4); if (f >= 1) px.dot(g, bx + 4 + Math.sin(t * 20) * 3 | 0, by + 4, '#fff'); px.line(g, ex, ey, ex + 5, ey + 5, '#8a98a8', 3); },
  cautery(g, x, y, s, t) { const hot = s.heat || 0; px.line(g, x, y, x + 6, y + 5, hot > .8 ? '#fff0a0' : hot > .3 ? '#ff9a3a' : '#b0605a', 2); steel(g, x + 6, y + 5, x + 20, y + 18, 3); if (s.down && !s.locked) { px.line(g, x, y, x, y, '#fff', 1); px.disc(g, x, y, 2, '#fff8c0'); } },
  suction(g, x, y, s, t) { const j = s.down ? Math.sin(t * 60) : 0; px.line(g, x + j | 0, y, x + 9, y + 8, '#8a98a8', 4); px.line(g, x + j | 0, y, x + 9, y + 8, '#d8e4ee', 2); px.line(g, x + 9, y + 8, x + 22, y + 22, '#5a7a8a', 3); },
  sonar(g, x, y, s, t) { px.disc(g, x + 5, y + 4, 4, '#3a4a58'); px.disc(g, x + 4, y + 3, 2, '#88e8ff'); steel(g, x + 7, y + 7, x + 20, y + 19, 3); },
};
G.drawInstrument = (g, tool, x, y, st, col, t) => { IN[tool](g, x, y, st, t); glove(g, x + 8, y + 8, col); };
const TILE = {
  forceps(g, x, y, c) { px.line(g, x + 3, y + 3, x + 14, y + 15, c, 2); px.line(g, x + 8, y + 2, x + 16, y + 13, c, 2); px.line(g, x + 3, y + 3, x + 8, y + 2, c, 1); },
  scalpel(g, x, y, c) { px.poly(g, [[x + 3, y + 3], [x + 11, y + 6], [x + 7, y + 11]], c); px.line(g, x + 9, y + 9, x + 17, y + 17, c, 3); },
  suture(g, x, y, c) { for (let k = 0; k < 14; k++) { const a = 3.3 + k / 13 * 3; px.dot(g, x + 10 + Math.cos(a) * 7 | 0, y + 11 + Math.sin(a) * 7 | 0, c); px.dot(g, x + 10 + Math.cos(a) * 6 | 0, y + 11 + Math.sin(a) * 6 | 0, c); } px.line(g, x + 3, y + 12, x + 8, y + 17, c, 1); px.dot(g, x + 16, y + 11, c); },
  salve(g, x, y, c) { px.rect(g, x + 6, y + 8, 9, 9, c); px.rect(g, x + 8, y + 3, 5, 5, c); px.rect(g, x + 8, y + 10, 5, 1, '#000000'); },
  syringe(g, x, y, c) { px.line(g, x + 2, y + 2, x + 7, y + 7, c, 1); px.line(g, x + 7, y + 7, x + 14, y + 14, c, 5); px.line(g, x + 14, y + 14, x + 18, y + 18, c, 2); px.line(g, x + 12, y + 17, x + 18, y + 12, c, 1); },
  cautery(g, x, y, c) { px.line(g, x + 8, y + 9, x + 16, y + 17, c, 3); px.line(g, x + 4, y + 5, x + 8, y + 9, c, 1); for (const [a, b] of [[2, 1], [5, 1], [1, 5]]) px.dot(g, x + a, y + b, c); px.disc(g, x + 3, y + 3, 1, c); },
  suction(g, x, y, c) { px.line(g, x + 3, y + 4, x + 12, y + 8, c, 3); px.line(g, x + 12, y + 8, x + 12, y + 17, c, 3); px.disc(g, x + 3, y + 4, 2, c); },
  sonar(g, x, y, c) { px.disc(g, x + 5, y + 14, 3, c); for (const r of [6, 10, 14]) for (let k = 0; k < 8; k++) { const a = -1.4 + k / 7 * 1.3; px.dot(g, x + 5 + Math.cos(a) * r | 0, y + 14 + Math.sin(a) * r | 0, c); } },
};
G.toolIcon = (g, tool, x, y, c) => TILE[tool](g, x | 0, y | 0, c);
})();
