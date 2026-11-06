// Appendix C's bust painter: flat-shaded hard polygons, big readable eyes. Each expression is cached in a canvas; the sim never reads it.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
function drawBust(g, c, o = {}) { const px = E.px, P = (pts, col) => px.poly(g, pts, col), T = E.tones;
  const skin = T(c.skin), hair = T(c.hair), cloth = T(c.cloth), expr = o.expr || 'neutral', blink = o.blink || 0, talk = o.talk || 0, cx = 56, top = 20;
  const jaw = c.jaw || 1, wide = c.wide || 1, f = (x, y) => [cx + x * wide, top + y]; // face space: x from centre, y down
  // back hair
  if (c.backHair) for (const s of c.backHair) P(s.map(([x, y]) => f(x, y)), hair.sh);
  // shoulders and collar
  P([[6, 128], [10, 104], [30, 92], [46, 88], [66, 88], [82, 92], [102, 104], [106, 128]], cloth.base);
  P([[6, 128], [10, 104], [30, 92], [34, 128]], cloth.sh); P([[78, 128], [82, 92], [102, 104], [106, 128]], cloth.lt);
  // neck
  P([[46, 66], [66, 66], [68, 92], [56, 104], [44, 92]], skin.sh);
  // V-neck and inner shirt
  P([[42, 88], [56, 110], [70, 88], [66, 86], [56, 100], [46, 86]], cloth.deep); P([[46, 86], [56, 100], [66, 86], [64, 92], [56, 104], [48, 92]], c.undershirt || skin.sh);
  if (c.coat) { P([[6, 128], [10, 104], [30, 92], [42, 88], [52, 128]], c.coat); P([[106, 128], [102, 104], [82, 92], [70, 88], [60, 128]], c.coat); P([[42, 88], [52, 128], [47, 128], [36, 92]], E.tones(c.coat).sh); P([[70, 88], [60, 128], [65, 128], [76, 92]], E.tones(c.coat).sh); }
  // ears
  P([f(-27, 30), f(-31, 34), f(-30, 42), f(-26, 45)], skin.sh); P([f(27, 30), f(31, 34), f(30, 42), f(26, 45)], skin.base);
  // head: wide cranium, cheek, chin
  const J = jaw; P([f(-26, 12), f(-27, 34), f(-22, 48 * J), f(-11, 60 * J), f(0, 64 * J), f(11, 60 * J), f(22, 48 * J), f(27, 34), f(26, 12), f(14, 2), f(-14, 2)], skin.base);
  P([f(-27, 30), f(-22, 48 * J), f(-11, 60 * J), f(0, 64 * J), f(-6, 54 * J), f(-16, 44), f(-22, 30)], skin.sh); // cheek shadow, viewer's left
  if (c.blush) { px.ell(g, ...f(-15, 41), 4, 2, c.blush); px.ell(g, ...f(16, 41), 4, 2, c.blush); }
  if (c.underglow) { for (const [ax, ay, bx, by] of [[-20, 30, -12, 46], [18, 26, 14, 48], [-6, 58, 4, 60], [-24, 18, -18, 28]]) px.line(g, ...f(ax, ay), ...f(bx, by), c.underglow, 1); }
  if (c.lines) { px.line(g, ...f(-11, 45), ...f(-6, 50), skin.sh, 1); px.line(g, ...f(11, 45), ...f(6, 50), skin.sh, 1); px.line(g, ...f(-23, 26), ...f(-20, 28), skin.sh, 1); px.line(g, ...f(23, 26), ...f(20, 28), skin.sh, 1); }
  // eyes
  const eye = (sx) => { const x = sx * 13, y = 30 + (expr === 'shock' ? -1 : 0), w = 7, hh = expr === 'shock' ? 8 : (expr === 'angry' || expr === 'tired') ? 5 : 7;
    if (expr === 'tired') px.line(g, ...f(x - 6, y + 6), ...f(x + 6, y + 6), skin.sh, 1);
    if (expr === 'cry') { px.rect(g, ...f(x + sx * 3, y + 5), 2, 9, '#9cdcff'); px.dot(g, ...f(x + sx * 3, y + 15), '#ffffff'); }
    if (blink > .5 || expr === 'sad-closed') { px.line(g, ...f(x - w, y + 1), ...f(x + w, y + 1), c.lash || '#1a1016', 2); return; }
    P([f(x - w, y), f(x - w + 3, y - hh + 2), f(x + w - 3, y - hh + 2), f(x + w, y), f(x + w - 2, y + 4), f(x - w + 2, y + 4)], '#f8f4ee');
    const ix = x + (o.look || 0) * 2 + (expr === 'shock' ? 0 : 0); px.ell(g, ...f(ix, y - 1), 4, expr === 'shock' ? 4 : 5, c.iris || '#3a5a7a'); px.ell(g, ...f(ix, y), 2, 3, c.pupil || '#120c14'); px.rect(g, ...f(ix - 3, y - 4), 3, 2, '#ffffff'); px.dot(g, ...f(ix + 2, y + 2), '#ffffff');
    px.line(g, ...f(x - w - 1, y + (sx < 0 ? 1 : -1)), ...f(x - w + 4, y - hh + 2), c.lash || '#1a1016', 2); px.line(g, ...f(x - w + 4, y - hh + 2), ...f(x + w - 4, y - hh + 2), c.lash || '#1a1016', 2); px.line(g, ...f(x + w - 4, y - hh + 2), ...f(x + w + 1, y + (sx < 0 ? -1 : 1)), c.lash || '#1a1016', 2); };
  eye(-1); eye(1);
  // brows
  const by = 17 + (c.browDrop || 0), br = expr === 'angry' ? 3 : (expr === 'sad' || expr === 'cry' || expr === 'tired') ? -3 : expr === 'shock' ? -1 : expr === 'smirk' ? 1 : 0, bc = c.brow || hair.deep, bw = c.browW || 2; px.line(g, ...f(-20, by + (expr === 'shock' ? -3 : 0) - br), ...f(-7, by + (expr === 'shock' ? -3 : 0) + br), bc, bw); px.line(g, ...f(7, by + (expr === 'shock' ? -3 : 0) + br), ...f(20, by + (expr === 'shock' ? -3 : 0) - br), bc, bw);
  // nose
  px.line(g, ...f(1, 40), ...f(-1, 45), skin.sh, 1); px.dot(g, ...f(0, 46), skin.deep);
  // mouth
  const my = 53, mo = talk > .5 || expr === 'shout' || expr === 'shock'; if (mo) { const a = expr === 'shout' || expr === 'shock' ? 7 : 4, w = expr === 'shout' ? 7 : 5; P([f(-w, my - 1), f(w, my - 1), f(w - 2, my + a), f(-w + 2, my + a)], '#5a1a24'); P([f(-w + 2, my + a - 2), f(w - 2, my + a - 2), f(w - 3, my + a), f(-w + 3, my + a)], '#c8505a'); if (a > 4) px.rect(g, ...f(-w + 1, my - 1), (w - 1) * 2, 2, '#f4f0e8'); }
  else if (expr === 'smile') { px.line(g, ...f(-7, my - 1), ...f(-3, my + 2), skin.deep, 1); px.line(g, ...f(-3, my + 2), ...f(3, my + 2), skin.deep, 1); px.line(g, ...f(3, my + 2), ...f(7, my - 1), skin.deep, 1); }
  else if (expr === 'smirk') { px.line(g, ...f(-5, my + 1), ...f(3, my + 1), skin.deep, 1); px.line(g, ...f(3, my + 1), ...f(8, my - 3), skin.deep, 1); }
  else if (expr === 'sad' || expr === 'angry' || expr === 'cry') { px.line(g, ...f(-5, my + 2), ...f(0, my), skin.deep, 1); px.line(g, ...f(0, my), ...f(5, my + 2), skin.deep, 1); }
  else px.line(g, ...f(-4, my), ...f(4, my), skin.deep, 1);
  if (c.moustache) { P([f(-13, 50), f(-6, 46), f(0, 48), f(6, 46), f(13, 50), f(8, 52), f(0, 50), f(-8, 52)], c.moustache); px.line(g, ...f(-6, 47), ...f(6, 47), E.tones(c.moustache).lt, 1); }
  // front hair
  if (c.frontHair) for (const [s, tone] of c.frontHair) P(s.map(([x, y]) => f(x, y)), hair[tone || 'base']);
  if (c.hairGlint) for (const s of c.hairGlint) P(s.map(([x, y]) => f(x, y)), hair.hi);
  // cap
  if (c.cap) { const k = T(c.cap); P([f(-29, 16), f(-27, 2), f(-14, -9), f(14, -9), f(27, 2), f(29, 16), f(16, 11), f(-16, 11)], k.base); P([f(-29, 16), f(-27, 2), f(-14, -9), f(-6, -9), f(-14, 11), f(-16, 11)], k.sh); P([f(6, -8), f(14, -9), f(22, -3), f(14, -3)], k.lt); P([f(-29, 16), f(-16, 11), f(16, 11), f(29, 16), f(27, 18), f(16, 14), f(-16, 14), f(-27, 18)], k.deep); }
  // lowered mask, glasses
  if (c.mask && !o.maskUp) { const k = T(c.mask); P([f(-20, 62), f(20, 62), f(25, 76), f(0, 84), f(-25, 76)], k.base); P([f(-20, 62), f(-25, 76), f(0, 84), f(-6, 74)], k.sh); px.line(g, ...f(-20, 62), ...f(-28, 50), k.lt, 1); px.line(g, ...f(20, 62), ...f(28, 50), k.lt, 1); }
  if (c.glasses) { const m = c.glasses; for (const sx of [-1, 1]) { const x = sx * 13; px.line(g, ...f(x - 9, 25), ...f(x + 9, 25), m, 1); px.line(g, ...f(x - 9, 25), ...f(x - 8, 33), m, 1); px.line(g, ...f(x + 9, 25), ...f(x + 8, 33), m, 1); px.line(g, ...f(x - 8, 34), ...f(x + 8, 34), m, 1); } px.line(g, ...f(-4, 27), ...f(4, 27), m, 1); }
  if (o.maskUp && c.mask) { const k = T(c.mask); P([f(-27, 36), f(-8, 34), f(0, 36), f(8, 34), f(27, 36), f(25, 54), f(11, 66), f(0, 68), f(-11, 66), f(-25, 54)], k.base); P([f(-27, 36), f(-8, 34), f(-3, 50), f(-11, 66), f(-25, 54)], k.sh); for (const yy of [44, 52]) px.line(g, ...f(-18, yy), ...f(18, yy), k.lt, 1); px.line(g, ...f(-27, 38), ...f(-31, 32), k.lt, 1); px.line(g, ...f(27, 38), ...f(31, 32), k.lt, 1); }
  if (c.scar) px.line(g, ...f(c.scar[0], c.scar[1]), ...f(c.scar[2], c.scar[3]), skin.deep, 1);
  if (c.tag) { px.rect(g, 72, 108, 16, 10, '#f0ece2'); px.rect(g, 74, 110, 12, 2, c.tag); px.rect(g, 74, 114, 8, 1, '#7a7468'); }
}

const CACHE = new Map(), W = 112, H = 128;
G.drawBust = drawBust;
/** a cached bust: o: { expr, blink, talk, maskUp, look } */
G.bust = (id, o = {}) => {
  const c = G.CAST[id] || G.CAST.quill, key = id + '|' + (o.expr || 'neutral') + '|' + (o.blink > .5 ? 1 : 0) + '|' + (o.talk > .5 ? 1 : 0) + '|' + (o.maskUp ? 1 : 0) + '|' + (o.look || 0);
  let cv = CACHE.get(key);
  if (!cv) { cv = E.mkCanvas(W, H); const g = cv.getContext('2d'); if (c.hat0) c.hat0(g); drawBust(g, c, o); if (c.extra) c.extra(g, c, o); E.px.reset(g); CACHE.set(key, cv); }
  return cv;
};
G.BUST_W = W; G.BUST_H = H;
})();
