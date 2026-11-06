// The instruments: steel drawn by E.px from the tip, gripped by a gloved hand down and to the right, so the hand never hides the target.
// And the wheel's tiles: 20 x 20, one strong silhouette each.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix;
const STEEL = { deep: '#2c363f', sh: '#5a6a78', base: '#9aaab8', lt: '#d4e0ea', hi: '#ffffff' };
const R = Math.round;

function hand(g, x, y, col, trig) {   // the gloved hand the tool sits in, and a sleeve running off the bottom right: (x, y) is where the tool enters the grip
  const T = E.tones(col), k = Math.round(trig * 1.5), sl = E.tones('#2a6f6a');
  px.line(g, x + 13, y + 15, x + 330, y + 385, sl.deep, 11); px.line(g, x + 12, y + 14, x + 329, y + 384, sl.base, 9); px.line(g, x + 14, y + 13, x + 331, y + 383, sl.lt, 2);   // the sleeve
  px.line(g, x + 8, y + 10, x + 14, y + 16, T.sh, 10); px.line(g, x + 8, y + 9, x + 13, y + 15, T.lt, 7);                                                                 // the cuff
  px.disc(g, x + 4, y + 5, 7, T.sh); px.disc(g, x + 3, y + 4, 6, T.base);                                                                                                  // the palm
  for (let i = 0; i < 3; i++) { const fx = x - 5 + i * 3, fy = y + 3 + i * 3 + k; px.line(g, fx, fy + 1, fx + 9, fy - 3, T.sh, 3); px.line(g, fx, fy, fx + 9, fy - 4, T.base, 2); px.dot(g, fx, fy, T.hi); }   // fingers curled over the steel
  px.line(g, x + 3, y - 3 + k, x - 5, y - 5 + k, T.sh, 4); px.line(g, x + 3, y - 4 + k, x - 5, y - 6 + k, T.lt, 2);                                                         // the thumb
}
const shaft = (g, x0, y0, x1, y1, w = 2) => { px.line(g, R(x0), R(y0), R(x1), R(y1), STEEL.sh, w + 1); px.line(g, R(x0), R(y0), R(x1), R(y1), STEEL.base, w); px.line(g, R(x0) - 1, R(y0), R(x1) - 1, R(y1), STEEL.lt); };

const DRAW = {
  forceps(g, x, y, o) { const open = (1 - o.trig) * 5, gx = x + 20, gy = y + 24; shaft(g, x - open * .6, y + open * .4, gx, gy, 1); shaft(g, x + open * .6, y - open * .4, gx, gy, 1); px.dot(g, R(x - open * .6), R(y + open * .4), STEEL.hi); px.dot(g, R(x + open * .6), R(y - open * .4), STEEL.hi); hand(g, gx, gy, o.color, o.trig); },
  scalpel(g, x, y, o) { const gx = x + 22, gy = y + 26; px.poly(g, [[x, y], [x + 5, y + 5], [x + 9, y + 12], [x + 11, y + 8], [x + 5, y + 2]], STEEL.lt); px.line(g, x, y, x + 9, y + 12, Math.sin(o.t * 5) > 0 ? STEEL.hi : STEEL.base); shaft(g, x + 10, y + 11, gx, gy, 2); hand(g, gx, gy, o.color, o.trig); },
  suture(g, x, y, o) { const gx = x + 20, gy = y + 24; for (let i = 0; i <= 8; i++) { const a = 3.6 + i / 8 * 2.4; px.dot(g, R(x + 4 + Math.cos(a) * 6), R(y + 3 + Math.sin(a) * 6), STEEL.lt); } px.dot(g, x, y, STEEL.hi); shaft(g, x + 6, y + 6, gx, gy, 1); shaft(g, x + 9, y + 4, gx, gy, 1); for (let i = 1; i < 10; i++) px.dot(g, R(x - i * .8 + Math.sin(i * .9 + o.t * 3) * 2), R(y + i * 2), '#5ad0ff'); hand(g, gx, gy, o.color, o.trig); },
  salve(g, x, y, o) { const gx = x + 20, gy = y + 24; px.disc(g, x + 1, y + 1, 4, o.trig > .2 ? '#a8ffd8' : '#54d0a0'); px.dot(g, x, y - 1, '#ffffff'); shaft(g, x + 3, y + 3, gx, gy, 2); hand(g, gx, gy, o.color, o.trig); },
  syringe(g, x, y, o) { const gx = x + 24, gy = y + 28, ax = 11, ay = 13; px.line(g, x, y, x + 7, y + 8, STEEL.lt); px.dot(g, x, y, STEEL.hi); const bx0 = x + 7, by0 = y + 8, bx1 = x + 7 + ax, by1 = y + 8 + ay; px.line(g, bx0, by0, bx1, by1, '#9fc8d8', 5); const f = o.fill || 0; if (f > 0) px.line(g, bx0, by0, R(bx0 + ax * f), R(by0 + ay * f), o.over > 0 ? '#ffd0d0' : '#ffe08a', 3); px.line(g, bx0 - 1, by0 + 1, bx1 - 1, by1 + 1, '#ffffff'); if (o.over > .1) px.disc(g, R(bx0 + ax * .5), R(by0 + ay * .5), 1, '#ffffff'); shaft(g, bx1, by1, gx, gy, 1); hand(g, gx, gy, o.color, o.trig); },
  cautery(g, x, y, o) { const gx = x + 20, gy = y + 24, h = o.heat || 0, hot = o.lock > 0 ? '#44505a' : h > .7 ? '#ffffff' : h > .3 ? '#ffd070' : o.trig > .2 ? '#ff8a40' : '#a84a2a'; px.rect(g, x - 1, y - 1, 3, 3, hot); px.line(g, x + 1, y + 2, x + 5, y + 7, hot, 2); shaft(g, x + 5, y + 7, gx, gy, 2); if (o.trig > .2 && !(o.lock > 0)) { px.dot(g, x + (Math.sin(o.t * 90) > 0 ? -2 : 2), y - 2, '#ffe08a'); } hand(g, gx, gy, o.color, o.trig); },
  suction(g, x, y, o) { const sh = o.trig > .2 ? Math.sin(o.t * 70) * 1 : 0, gx = x + 20 + sh, gy = y + 24; px.line(g, R(x + sh), y, R(x + 7 + sh), y + 8, STEEL.base, 3); px.disc(g, R(x + sh), y, 2, '#10181c'); px.dot(g, R(x + sh) - 1, y - 2, STEEL.hi); shaft(g, x + 7 + sh, y + 8, gx, gy, 2); for (let i = 0; i < 3; i++) px.dot(g, R(gx + 8 + i * 4), R(gy - 6 + i * 2), '#4a6a7a'); hand(g, gx, gy, o.color, o.trig); },
  sonar(g, x, y, o) { const gx = x + 20, gy = y + 24; px.poly(g, [[x - 3, y], [x + 3, y - 3], [x + 8, y + 3], [x + 2, y + 7]], STEEL.base); px.line(g, x - 3, y, x + 3, y - 3, '#5ff0e0'); shaft(g, x + 5, y + 5, gx, gy, 2); hand(g, gx, gy, o.color, o.trig); },
};
/** o: { trig, color, fill, over, heat, lock, t } */
G.drawInstrument = (g, tool, x, y, o) => DRAW[tool](g, R(x), R(y), o);

const ICON = {
  forceps(g, x, y, c) { px.line(g, x + 4, y + 2, x + 10, y + 17, c, 2); px.line(g, x + 15, y + 2, x + 10, y + 17, c, 2); px.rect(g, x + 8, y + 15, 4, 3, c); },
  scalpel(g, x, y, c) { px.poly(g, [[x + 3, y + 2], [x + 10, y + 8], [x + 8, y + 11], [x + 3, y + 7]], c); px.line(g, x + 8, y + 9, x + 17, y + 17, c, 3); },
  suture(g, x, y, c) { for (let i = 0; i <= 14; i++) { const a = 3.3 + i / 14 * 2.9, X = x + 10 + Math.cos(a) * 8, Y = y + 10 + Math.sin(a) * 8; px.rect(g, R(X), R(Y), 2, 2, c); } px.line(g, x + 2, y + 10, x + 5, y + 18, c); px.line(g, x + 5, y + 18, x + 12, y + 14, c); px.line(g, x + 12, y + 14, x + 17, y + 18, c); },
  salve(g, x, y, c) { px.rect(g, x + 4, y + 7, 12, 11, c); px.rect(g, x + 6, y + 4, 8, 3, c); px.rect(g, x + 8, y + 1, 4, 3, c); px.rect(g, x + 7, y + 10, 6, 2, '#0a1a20'); px.rect(g, x + 9, y + 8, 2, 6, '#0a1a20'); },
  syringe(g, x, y, c) { px.line(g, x + 2, y + 18, x + 6, y + 14, c); px.line(g, x + 6, y + 14, x + 13, y + 7, c, 5); px.line(g, x + 13, y + 7, x + 17, y + 3, c, 2); px.line(g, x + 14, y + 1, x + 19, y + 6, c, 2); },
  cautery(g, x, y, c) { px.line(g, x + 8, y + 9, x + 17, y + 18, c, 3); px.line(g, x + 4, y + 5, x + 8, y + 9, c, 2); px.poly(g, [[x + 3, y + 5], [x + 2, y + 1], [x + 5, y + 3], [x + 7, y], [x + 7, y + 4]], '#ffa23c'); },
  suction(g, x, y, c) { px.line(g, x + 3, y + 4, x + 8, y + 13, c, 3); px.line(g, x + 8, y + 13, x + 17, y + 15, c, 3); px.line(g, x + 2, y + 2, x + 6, y + 1, c, 2); for (let i = 0; i < 3; i++) px.dot(g, x + 2 + i * 3, y + 6 + i, '#ff5a4a'); },
  sonar(g, x, y, c) { px.disc(g, x + 10, y + 16, 2, c); for (const r of [5, 9, 13]) for (let a = -2.5; a <= -.6; a += .12) px.dot(g, R(x + 10 + Math.cos(a) * r), R(y + 16 + Math.sin(a) * r), c); },
};
G.drawToolIcon = (g, tool, x, y, c = '#ffffff') => ICON[tool](g, R(x), R(y), c);
})();
