// Appendix C's bust painter and the cast. Busts are cached per expression; the sim never reads them.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
// A bust from data in hard-edged tones, 112 x 128 buffer pixels. Cache each expression in a canvas; the sim never reads it. Needs E = My3D2dge in scope.
// o: { expr: neutral | smile | angry | sad | shock | shout, blink: 0..1, talk: 0..1, look: -1..1 }
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
  if (c.lines) { px.line(g, ...f(-11, 45), ...f(-6, 50), skin.sh, 1); px.line(g, ...f(11, 45), ...f(6, 50), skin.sh, 1); px.line(g, ...f(-23, 26), ...f(-20, 28), skin.sh, 1); px.line(g, ...f(23, 26), ...f(20, 28), skin.sh, 1); }
  // eyes
  const eye = (sx) => { const x = sx * 13, y = 30 + (expr === 'shock' ? -1 : 0), w = 7, hh = expr === 'shock' ? 8 : expr === 'angry' ? 5 : 7;
    if (blink > .5 || expr === 'sad-closed') { px.line(g, ...f(x - w, y + 1), ...f(x + w, y + 1), c.lash || '#1a1016', 2); return; }
    P([f(x - w, y), f(x - w + 3, y - hh + 2), f(x + w - 3, y - hh + 2), f(x + w, y), f(x + w - 2, y + 4), f(x - w + 2, y + 4)], '#f8f4ee');
    const ix = x + (o.look || 0) * 2 + (expr === 'shock' ? 0 : 0); px.ell(g, ...f(ix, y - 1), 4, expr === 'shock' ? 4 : 5, c.iris || '#3a5a7a'); px.ell(g, ...f(ix, y), 2, 3, c.pupil || '#120c14'); px.rect(g, ...f(ix - 3, y - 4), 3, 2, '#ffffff'); px.dot(g, ...f(ix + 2, y + 2), '#ffffff');
    px.line(g, ...f(x - w - 1, y + (sx < 0 ? 1 : -1)), ...f(x - w + 4, y - hh + 2), c.lash || '#1a1016', 2); px.line(g, ...f(x - w + 4, y - hh + 2), ...f(x + w - 4, y - hh + 2), c.lash || '#1a1016', 2); px.line(g, ...f(x + w - 4, y - hh + 2), ...f(x + w + 1, y + (sx < 0 ? -1 : 1)), c.lash || '#1a1016', 2); };
  eye(-1); eye(1);
  // brows
  const by = 17 + (c.browDrop || 0), br = expr === 'angry' ? 3 : expr === 'sad' ? -3 : expr === 'shock' ? -1 : 0, bc = c.brow || hair.deep, bw = c.browW || 2; px.line(g, ...f(-20, by + (expr === 'shock' ? -3 : 0) - br), ...f(-7, by + (expr === 'shock' ? -3 : 0) + br), bc, bw); px.line(g, ...f(7, by + (expr === 'shock' ? -3 : 0) + br), ...f(20, by + (expr === 'shock' ? -3 : 0) - br), bc, bw);
  // nose
  px.line(g, ...f(1, 40), ...f(-1, 45), skin.sh, 1); px.dot(g, ...f(0, 46), skin.deep);
  // mouth
  const my = 53, mo = talk > .5 || expr === 'shout' || expr === 'shock'; if (mo) { const a = expr === 'shout' || expr === 'shock' ? 7 : 4, w = expr === 'shout' ? 7 : 5; P([f(-w, my - 1), f(w, my - 1), f(w - 2, my + a), f(-w + 2, my + a)], '#5a1a24'); P([f(-w + 2, my + a - 2), f(w - 2, my + a - 2), f(w - 3, my + a), f(-w + 3, my + a)], '#c8505a'); if (a > 4) px.rect(g, ...f(-w + 1, my - 1), (w - 1) * 2, 2, '#f4f0e8'); }
  else if (expr === 'smile') { px.line(g, ...f(-7, my - 1), ...f(-3, my + 2), skin.deep, 1); px.line(g, ...f(-3, my + 2), ...f(3, my + 2), skin.deep, 1); px.line(g, ...f(3, my + 2), ...f(7, my - 1), skin.deep, 1); }
  else if (expr === 'sad' || expr === 'angry') { px.line(g, ...f(-5, my + 2), ...f(0, my), skin.deep, 1); px.line(g, ...f(0, my), ...f(5, my + 2), skin.deep, 1); }
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
const CAST = {
  vale: { name: 'DR. VALE', skin: '#f6d0b2', hair: '#c9562a', iris: '#3f8a58', cloth: '#2f9c8e', cap: '#2bb0a2', mask: '#bfe6dc', undershirt: '#e9fff6', blush: '#f0a48c', wide: .95,
    backHair: [[[-27, 14], [-30, 40], [-24, 52], [-16, 40], [-16, 14]], [[27, 14], [30, 40], [24, 52], [16, 40], [16, 14]]],
    frontHair: [[[[-27, 12], [-24, 24], [-16, 16], [-10, 22], [-3, 14], [3, 21], [10, 14], [18, 22], [27, 12], [14, 8], [-14, 8]], 'base'], [[[-27, 12], [-24, 24], [-16, 16], [-14, 10]], 'sh']],
    tag: '#c8452f' },
  quill: { name: 'NURSE QUILL', skin: '#dcae8e', hair: '#8d8a88', iris: '#4a4a55', cloth: '#3d62a6', cap: '#35558f', undershirt: '#dfe6f2', moustache: '#a7a3a0', lines: true, wide: 1.08, jaw: 1.04, browW: 3, brow: '#7c7875', browDrop: 2, mask: '#a9cfe0', frontHair: [] },
  oyelaran: { name: 'CHIEF OYELARAN', skin: '#7c4a2e', hair: '#c9c5bb', iris: '#2a1a12', cloth: '#2e2c36', coat: '#ece7da', undershirt: '#3a3644', lines: true, jaw: .98, glasses: '#d8c070',
    backHair: [], frontHair: [[[[-27, 18], [-27, 2], [-14, -8], [14, -8], [27, 2], [27, 18], [20, 10], [8, 6], [-8, 6], [-20, 10]], 'base'], [[[-27, 18], [-27, 2], [-14, -8], [-8, 6], [-20, 10]], 'sh'], [[[6, -7], [16, -6], [22, 0], [12, 0]], 'lt']] },
  sokolova: { name: 'DR. SOKOLOVA', skin: '#e8c6aa', hair: '#dedad2', iris: '#6a8aa8', cloth: '#6b7a48', undershirt: '#f0ece0', lines: true, wide: 1.02, jaw: 1.02, scar: [10, 14, 17, 40], browW: 3, brow: '#b8b4ac',
    backHair: [[[-28, 6], [-34, 34], [-30, 58], [-20, 50], [-20, 10]], [[28, 6], [36, 26], [46, 52], [38, 64], [28, 44], [22, 10]]], frontHair: [[[[-27, 16], [-26, 2], [-12, -8], [14, -8], [27, 2], [27, 16], [16, 6], [-2, 12], [-16, 8]], 'base'], [[[-27, 16], [-26, 2], [-12, -8], [-6, 8], [-16, 8]], 'sh']] },
};

const fh = (pts, t) => [pts, t || 'base'];
Object.assign(CAST, {
  percy: { name: 'DR. WHITLOCK', skin: '#efcfae', hair: '#d8b45a', iris: '#4a7ab8', cloth: '#d8e4ec', coat: '#f4f4f0', undershirt: '#7a90b0', wide: .98, jaw: 1.03, brow: '#a88838',
    frontHair: [fh([[-27, 14], [-26, 0], [-12, -8], [16, -9], [28, 2], [27, 18], [20, 6], [4, 4], [-10, 10], [-20, 8]]), fh([[-27, 14], [-26, 0], [-12, -8], [-10, 10], [-20, 8]], 'sh'), fh([[2, -7], [16, -8], [24, 0], [8, 0]], 'lt')] },
  odalys: { name: 'ODALYS', skin: '#b98a62', hair: '#3a2420', iris: '#3a2a1a', cloth: '#c06a5a', undershirt: '#f0e0c8', blush: '#d0785c', glasses: '#e8603c', wide: 1, jaw: .98,
    backHair: [[[-32, 2], [-40, 26], [-34, 52], [-22, 46], [-20, 6]], [[32, 2], [40, 26], [34, 52], [22, 46], [20, 6]]],
    frontHair: [fh([[-32, 20], [-34, 2], [-20, -10], [0, -14], [20, -10], [34, 2], [32, 20], [24, 8], [14, 12], [4, 6], [-6, 12], [-16, 6], [-24, 10]]), fh([[-32, 20], [-34, 2], [-20, -10], [-12, 8], [-24, 10]], 'sh'), fh([[-4, -12], [8, -12], [12, -4], [0, -4]], 'lt')] },
  hale: { name: 'DR. HALE', skin: '#e6c4a4', hair: '#c4c6cc', iris: '#6a8aa0', cloth: '#2a3044', coat: '#343c54', undershirt: '#e8e8f0', lines: true, wide: 1.02, jaw: 1.01, brow: '#a4a6ac',
    frontHair: [fh([[-27, 16], [-26, 0], [-10, -9], [14, -9], [27, 1], [27, 16], [18, 4], [-4, 6], [-18, 6]]), fh([[-27, 16], [-26, 0], [-10, -9], [-6, 6], [-18, 6]], 'sh'), fh([[4, -8], [16, -7], [22, -1], [10, -1]], 'lt')] },
  clementine: { name: 'CLEMENTINE', skin: '#f0e0d8', hair: '#a8987c', iris: '#5ff0e0', cloth: '#c8d8e4', undershirt: '#e8f0f4', wide: .94, jaw: .97, brow: '#8a7c64', pupil: '#0b2a30',
    frontHair: [fh([[-26, 14], [-25, 2], [-12, -6], [12, -6], [25, 2], [26, 14], [14, 7], [-14, 7]]), fh([[-26, 14], [-25, 2], [-12, -6], [-10, 7], [-14, 7]], 'sh')] },
});
CAST.quill.frontHair = [fh([[-27, 12], [-26, 2], [-12, -6], [12, -6], [26, 2], [27, 12], [18, 4], [-18, 4]])];
CAST.vale.expressions = null;
// patients come from a small kit of parts, hashed from a name so each looks like themselves
const P = (name, o) => Object.assign({ name: name.toUpperCase(), skin: '#e8c0a0', hair: '#5a4030', cloth: '#a8c0cc', undershirt: '#e0e8ec', frontHair: [fh([[-27, 12], [-26, 2], [-12, -7], [12, -7], [26, 2], [27, 12], [14, 6], [-14, 6]])] }, o);
Object.assign(CAST, {
  agnes: P('Agnes', { skin: '#efd4c0', hair: '#e4e0dc', iris: '#6a7a98', lines: true, cloth: '#a06a8a', glasses: '#8a7a6a', backHair: [[[-28, 4], [-32, 26], [-24, 36], [-18, 8]], [[28, 4], [32, 26], [24, 36], [18, 8]]] }),
  slide: P('Slide', { skin: '#5e3a26', hair: '#2a2424', iris: '#2a1a12', cloth: '#7a3a4a', lines: true, moustache: '#2a2424', jaw: 1.03, wide: 1.04 }),
  tam: P('Big Tam', { skin: '#e4b08c', hair: '#b4562c', iris: '#3a6a8a', cloth: '#e0902a', wide: 1.12, jaw: 1.06, moustache: '#b4562c', browW: 3, lines: true }),
  ned: P('Capt. Harrow', { skin: '#c89a78', hair: '#d8d4cc', iris: '#3a7aa0', cloth: '#2a3a5a', lines: true, moustache: '#d8d4cc', wide: 1.05, jaw: 1.04, cap: '#1e2a44' }),
  ilse: P('Ilse', { skin: '#f4dccc', hair: '#e0c48a', iris: '#4a7a9a', cloth: '#3a3a4a', blush: '#f0b0a0', wide: .94, backHair: [[[-26, 8], [-30, 44], [-22, 60], [-16, 30]], [[26, 8], [30, 44], [22, 60], [16, 30]]] }),
  yusuf: P('Yusuf', { skin: '#b88a64', hair: '#1e1a1c', iris: '#2a1c14', cloth: '#d07a2a', wide: 1 }),
  perpetua: P('Sister Perpetua', { skin: '#f0d8c8', hair: '#1a1a24', iris: '#5a6a8a', cloth: '#22222e', lines: true, cap: '#1a1a24', undershirt: '#f4f4f0', wide: .98 }),
  crane: P('Dr. Crane', { skin: '#dcc0a4', hair: '#6a5a4c', iris: '#5a5a4a', cloth: '#5a6470', coat: '#d8d8d0', glasses: '#303038', lines: true, jaw: .96, wide: .96 }),
});
const CACHE = new Map();
// a cached bust canvas, 112 x 128: blink and talk are baked as their own frames
G.bust = (id, expr = 'neutral', o = {}) => { const k = id + '|' + expr + '|' + (o.blink ? 1 : 0) + (o.talk ? 1 : 0) + (o.maskUp ? 1 : 0); let c = CACHE.get(k); if (!c) { c = E.mkCanvas(112, 128); const g = c.getContext('2d'); drawBust(g, CAST[id] || CAST.quill, { expr, blink: o.blink ? 1 : 0, talk: o.talk ? 1 : 0, maskUp: !!o.maskUp }); E.px.reset && E.px.reset(g); CACHE.set(k, c); } return c; };
G.CAST = CAST; G.drawBust = drawBust;
})();
