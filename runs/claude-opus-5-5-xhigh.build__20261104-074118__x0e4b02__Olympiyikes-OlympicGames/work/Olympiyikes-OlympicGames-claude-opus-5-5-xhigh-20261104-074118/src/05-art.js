// Art drawn in code: the nations' flags (waving), the twelve pictograms, the Yikes Flame emblem, medals and laurels,
// the crowd painter (hundreds of spectators that bob, wave flags and flash cameras), the dot-matrix jumbotron, stands,
// fireworks and the mascot Yikesy.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp } = E;
const Art = O.Art = {};
const cv = (w, h) => E.mkCanvas(w, h);
const T = c => E.tones(c);

// ---------------------------------------------------------------------------------------------------------------
// flags
// ---------------------------------------------------------------------------------------------------------------
const star = (g, cx, cy, r, c) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } px.poly(g, pts, c); };
Art.star = star;
const FLAG = {
  SUN(g, w, h) { px.rect(g, 0, 0, w, h, '#2f7fe0'); px.rect(g, 0, h - Math.max(1, h / 8), w, Math.max(1, h / 8), '#1f5fb0'); const cx = w / 2, cy = h / 2, r = h * .22; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; px.line(g, cx, cy, cx + Math.cos(a) * r * 1.9, cy + Math.sin(a) * r * 1.9, '#f2b632', Math.max(1, Math.round(h / 16))); } px.disc(g, cx, cy, r, '#f2b632'); px.disc(g, cx - r * .3, cy - r * .3, r * .35, '#ffe9a0'); },
  FRM(g, w, h) { px.rect(g, 0, 0, w, h, '#1a3a6a'); const b = Math.max(1, Math.round(h / 10)); px.rect(g, b, b, w - 2 * b, h - 2 * b, '#f4f8ff'); const cx = w / 2, cy = h / 2, r = h * .32, lw = Math.max(1, Math.round(h / 14)); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r; px.line(g, cx, cy, ex, ey, '#2fa8d8', lw); const mx = cx + Math.cos(a) * r * .6, my = cy + Math.sin(a) * r * .6; px.line(g, mx, my, mx + Math.cos(a + .8) * r * .3, my + Math.sin(a + .8) * r * .3, '#2fa8d8', lw); px.line(g, mx, my, mx + Math.cos(a - .8) * r * .3, my + Math.sin(a - .8) * r * .3, '#2fa8d8', lw); } },
  TRB(g, w, h) { px.rect(g, 0, 0, w, h, '#1e2026'); px.poly(g, [[0, 0], [w, 0], [0, h]], '#e23b2e'); const s = h / 32; px.poly(g, [[w * .55, h * .12], [w * .38, h * .55], [w * .5, h * .55], [w * .42, h * .9], [w * .66, h * .42], [w * .53, h * .42], [w * .62, h * .12]], '#ffd23a'); void s; },
  BON(g, w, h) { const n = 6; for (let i = 0; i < n; i++) px.rect(g, Math.floor(i * w / n), 0, Math.ceil(w / n), h, ['#ff7fb8', '#ffffff', '#6fe0c0'][i % 3]); const cx = w / 2, cy = h / 2, r = h * .16; px.disc(g, cx - r * .55, cy - r * .3, r * .6, '#e2246a'); px.disc(g, cx + r * .55, cy - r * .3, r * .6, '#e2246a'); px.poly(g, [[cx - r * 1.1, cy - r * .1], [cx + r * 1.1, cy - r * .1], [cx, cy + r * 1.1]], '#e2246a'); },
  VOL(g, w, h) { px.rect(g, 0, 0, w, h, '#3a2e2e'); px.poly(g, [[w * .18, h * .85], [w * .42, h * .32], [w * .58, h * .32], [w * .82, h * .85]], '#ff6a1a'); px.poly(g, [[w * .42, h * .32], [w * .58, h * .32], [w * .54, h * .45], [w * .46, h * .45]], '#c83a0a'); px.disc(g, w * .5, h * .18, h * .09, '#ffd0a0'); px.rect(g, 0, h * .85, w, h * .15, '#2a2020'); },
  WAV(g, w, h) { px.rect(g, 0, 0, w, h, '#1fa8a0'); for (let k = 0; k < 3; k++) { const y0 = h * (.3 + k * .2); for (let x = 0; x < w; x++) { const y = y0 + Math.sin(x / w * Math.PI * 4) * h * .05; px.rect(g, x, Math.round(y), 1, Math.max(1, Math.round(h / 14)), '#e8fbf7'); } } px.rect(g, 0, 0, w, Math.max(1, h / 10), '#0e4a6a'); },
  MTP(g, w, h) { px.rect(g, 0, 0, w, h, '#6a3fc8'); px.poly(g, [[w * .2, h * .85], [w * .5, h * .25], [w * .8, h * .85]], '#ffffff'); px.poly(g, [[w * .38, h * .5], [w * .5, h * .25], [w * .62, h * .5], [w * .55, h * .45], [w * .5, h * .52], [w * .44, h * .45]], '#c8ccd8'); for (let i = 0; i < 3; i++) star(g, w * (.18 + i * .07), h * .2, h * .07, '#c8ccd8'); },
  NEO(g, w, h) { px.rect(g, 0, 0, w, h, '#14102a'); const cx = w / 2, cy = h / 2, r = h * .32; px.disc(g, cx, cy, r, '#3ae8f0'); px.disc(g, cx, cy, r - Math.max(1, h / 12), '#14102a'); star(g, cx, cy, r * .62, '#e83ae0'); for (let i = 0; i < 4; i++) px.rect(g, w * .08 + i * 2, h * .12, 1, 1, '#3ae8f0'); }
};
const flagCache = new Map();
Art.flagCanvas = (id, w, h) => { const k = id + w + 'x' + h; let c = flagCache.get(k); if (!c) { c = cv(w, h); const g = c.getContext('2d'); (FLAG[id] || FLAG.SUN)(g, w, h); px.reset(g); flagCache.set(k, c); } return c; };
/** a flag at (x, y), w x h, waving (amp pixels) with cloth shading */
Art.flag = (g, x, y, w, h, nation, amp = 0, t = game.real) => {
  const id = nation && nation.id ? nation.id : nation, c = Art.flagCanvas(id, Math.max(4, Math.round(w)), Math.max(3, Math.round(h)));
  x = Math.round(x); y = Math.round(y);
  if (!amp) { g.drawImage(c, x, y); return; }
  for (let i = 0; i < c.width; i++) {
    const ph = t * 6 - i * .35, dy = Math.round(Math.sin(ph) * amp * (i / c.width));
    g.drawImage(c, i, 0, 1, c.height, x + i, y + dy, 1, c.height);
    const sh = Math.cos(ph); if (sh > .55) px.blend(g, .25, 'add', () => px.rect(g, x + i, y + dy, 1, c.height, '#ffffff')); else if (sh < -.55) px.blend(g, .25, 'multiply', () => px.rect(g, x + i, y + dy, 1, c.height, '#606080'));
  }
};
/** a flag on a pole at a screen point (pole foot at x, y) */
Art.flagPole = (g, x, y, poleH, w, h, nation, t) => { px.rect(g, x, y - poleH, 2, poleH, '#c8ccd8'); px.rect(g, x, y - poleH, 1, poleH, '#ffffff'); px.disc(g, x + 1, y - poleH - 1, 2, '#f2b632'); Art.flag(g, x + 2, y - poleH + 1, w, h, nation, Math.max(1, h / 6), t); };

// ---------------------------------------------------------------------------------------------------------------
// pictograms: white figures on a rounded tile (summer coral, winter ice-blue)
// ---------------------------------------------------------------------------------------------------------------
const PICT = {
  // each: list of strokes in a 16x16 box: ['l', x0, y0, x1, y1, w] lines, ['d', x, y, r] discs, ['p', [[x,y]...]] polys
  sprint: [['d', 10, 3, 1.6], ['l', 9, 5, 6, 9, 2], ['l', 6, 9, 3, 12, 1.6], ['l', 3, 12, 2, 14, 1.4], ['l', 6, 9, 9, 11, 1.6], ['l', 9, 11, 11, 14, 1.4], ['l', 8, 6, 12, 8, 1.4], ['l', 8, 6, 5, 6, 1.4]],
  javelin: [['d', 6, 4, 1.6], ['l', 6, 6, 7, 10, 2], ['l', 7, 10, 4, 14, 1.6], ['l', 7, 10, 10, 13, 1.6], ['l', 6, 7, 3, 4, 1.4], ['l', 6, 7, 9, 8, 1.4], ['l', 1, 6, 15, 1, 1]],
  swim: [['d', 5, 8, 1.6], ['p', [[6, 9], [13, 8], [13, 10], [6, 10]]], ['l', 7, 8, 9, 4, 1.4], ['l', 9, 4, 12, 5, 1.4], ['l', 1, 13, 4, 12, 1], ['l', 4, 12, 7, 13, 1], ['l', 7, 13, 10, 12, 1], ['l', 10, 12, 13, 13, 1], ['l', 13, 13, 15, 12, 1]],
  diving: [['d', 8, 11, 1.6], ['l', 8, 9, 8, 4, 2], ['l', 8, 4, 7, 1, 1.4], ['l', 8, 4, 9, 1, 1.4], ['l', 8, 9, 6, 13, 1.2], ['l', 8, 9, 10, 13, 1.2], ['l', 3, 15, 13, 15, 1], ['l', 5, 14, 6, 13, 1], ['l', 11, 14, 10, 13, 1]],
  archery: [['d', 6, 3, 1.6], ['l', 6, 5, 6, 10, 2], ['l', 6, 10, 4, 14, 1.6], ['l', 6, 10, 8, 14, 1.6], ['l', 6, 6, 12, 6, 1.4], ['l', 6, 6, 4, 7, 1.4], ['l', 12, 2, 13, 6, 1], ['l', 13, 6, 12, 10, 1], ['l', 12, 2, 12, 10, 1], ['l', 4, 6, 15, 6, 1]],
  weights: [['d', 8, 5, 1.6], ['l', 8, 7, 8, 11, 2.2], ['l', 8, 11, 5, 15, 1.6], ['l', 8, 11, 11, 15, 1.6], ['l', 8, 8, 4, 3, 1.4], ['l', 8, 8, 12, 3, 1.4], ['l', 1, 3, 15, 3, 1], ['p', [[0, 1], [2, 1], [2, 5], [0, 5]]], ['p', [[14, 1], [16, 1], [16, 5], [14, 5]]]],
  skijump: [['d', 9, 4, 1.6], ['l', 9, 6, 5, 10, 2], ['l', 5, 10, 3, 12, 1.4], ['l', 7, 7, 3, 9, 1.2], ['l', 1, 13, 15, 9, 1], ['l', 2, 14, 15, 11, 1]],
  downhill: [['d', 6, 5, 1.6], ['l', 6, 7, 9, 9, 2], ['l', 9, 9, 8, 12, 1.6], ['l', 8, 12, 10, 13, 1.4], ['l', 7, 8, 3, 9, 1.2], ['l', 3, 9, 2, 13, 1], ['l', 2, 12, 15, 15, 1]],
  bobsled: [['p', [[1, 10], [13, 10], [15, 13], [3, 13]]], ['d', 5, 7, 1.8], ['d', 10, 7, 1.8], ['l', 2, 15, 14, 15, 1], ['l', 12, 10, 14, 8, 1]],
  figure: [['d', 8, 3, 1.6], ['l', 8, 5, 8, 10, 2], ['l', 8, 10, 8, 15, 1.6], ['l', 8, 10, 14, 8, 1.4], ['l', 8, 6, 3, 4, 1.2], ['l', 8, 6, 13, 4, 1.2], ['l', 6, 15, 10, 15, 1]],
  curling: [['p', [[3, 11], [11, 11], [12, 14], [2, 14]]], ['l', 6, 11, 6, 8, 1.2], ['l', 6, 8, 10, 8, 1.2], ['l', 13, 2, 9, 14, 1], ['p', [[8, 13], [12, 13], [11, 15], [7, 15]]]],
  hockey: [['d', 6, 3, 1.6], ['l', 6, 5, 8, 9, 2], ['l', 8, 9, 6, 13, 1.6], ['l', 8, 9, 11, 12, 1.6], ['l', 7, 6, 11, 9, 1.2], ['l', 11, 9, 13, 14, 1], ['l', 13, 14, 15, 14, 1.2], ['d', 3, 14, 1.2]]
};
Art.PICT_IDS = Object.keys(PICT);
const pictCache = new Map();
/** a pictogram tile: Art.picto(g, 'sprint', x, y, size, { season, plain }) */
Art.picto = (g, id, x, y, size = 32, o = {}) => {
  const ev = O.EVENTS[id], season = o.season || (ev && ev.season) || (O.WINTER.includes(id) ? 'winter' : 'summer');
  const k = id + size + season + (o.plain ? 'p' : '') + (o.dim ? 'd' : '');
  let c = pictCache.get(k);
  if (!c) {
    c = cv(size, size); const cg = c.getContext('2d'), s = size / 16, bg = o.dim ? '#3a3f5a' : season === 'winter' ? '#3fa8e8' : '#ff6b4a';
    if (!o.plain) { const t = T(bg); px.rect(cg, 1, 0, size - 2, size, t.sh); px.rect(cg, 0, 1, size, size - 2, t.sh); px.rect(cg, 1, 1, size - 2, size - 2, bg); px.rect(cg, 2, 1, size - 4, Math.max(1, s), t.lt); }
    const ink = o.dim ? '#8a90b0' : '#ffffff', m = .9, off = size * .05;
    for (const st of PICT[id] || []) {
      if (st[0] === 'l') px.line(cg, off + st[1] * s * m, off + st[2] * s * m, off + st[3] * s * m, off + st[4] * s * m, ink, Math.max(1, Math.round(st[5] * s * m)));
      else if (st[0] === 'd') px.disc(cg, off + st[1] * s * m, off + st[2] * s * m, Math.max(1, st[3] * s * m), ink);
      else px.poly(cg, st[1].map(([a, b]) => [off + a * s * m, off + b * s * m]), ink);
    }
    px.reset(cg); pictCache.set(k, c);
  }
  g.drawImage(c, Math.round(x), Math.round(y));
};

// ---------------------------------------------------------------------------------------------------------------
// the emblem: the Yikes Flame (half orange summer, half ice-blue winter) in a gold laurel wreath
// ---------------------------------------------------------------------------------------------------------------
Art.emblem = (g, cx, cy, r, t = game.real) => {
  cx = Math.round(cx); cy = Math.round(cy);
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const a = Math.PI / 2 + side * (.5 + i * .33), lx = cx + Math.cos(a) * r * .95, ly = cy + Math.sin(a) * r * .95 - r * .05;
    px.ell(g, lx, ly, Math.max(1, r * .16), Math.max(1, r * .09), i % 2 ? '#c8901a' : '#f2b632');
  }
  const fl = Math.sin(t * 7) * r * .06, fl2 = Math.cos(t * 9) * r * .05;
  const L = [[cx, cy + r * .6], [cx - r * .45, cy + r * .25], [cx - r * .5, cy - r * .15], [cx - r * .2, cy - r * .35 + fl], [cx - r * .25, cy - r * .7 + fl2], [cx, cy - r * .95 + fl], [cx, cy + r * .6]];
  const R = [[cx, cy + r * .6], [cx + r * .45, cy + r * .25], [cx + r * .5, cy - r * .15], [cx + r * .2, cy - r * .35 - fl], [cx + r * .3, cy - r * .7 - fl2], [cx, cy - r * .95 + fl], [cx, cy + r * .6]];
  px.poly(g, L, '#ff6a1a'); px.poly(g, R, '#3fa8e8');
  px.poly(g, L.map(([x, y]) => [cx + (x - cx) * .55, cy + r * .2 + (y - cy - r * .2) * .55]), '#ffd23a');
  px.poly(g, R.map(([x, y]) => [cx + (x - cx) * .55, cy + r * .2 + (y - cy - r * .2) * .55]), '#d8f4ff');
  px.rect(g, cx, cy - r * .9, 1, r * 1.5, '#fff6d8');
};

// ---------------------------------------------------------------------------------------------------------------
// medals, laurels, trophies
// ---------------------------------------------------------------------------------------------------------------
const MEDAL = { g: ['#f2c94c', '#fff1a8', '#a8781a'], s: ['#c8ccd8', '#ffffff', '#7a8098'], b: ['#d08a4a', '#f8c89a', '#7a4a22'] };
Art.medal = (g, x, y, kind, size = 12, o = {}) => {
  const [c, hi, dk] = MEDAL[kind] || MEDAL.g, r = Math.round(size / 2);
  x = Math.round(x); y = Math.round(y);
  if (o.ribbon !== false) { px.poly(g, [[x - r * .7, y - r * 2.1], [x - r * .1, y - r * 2.1], [x + r * .25, y - r * .6], [x - r * .3, y - r * .6]], '#2f7fe0'); px.poly(g, [[x + r * .7, y - r * 2.1], [x + r * .1, y - r * 2.1], [x - r * .25, y - r * .6], [x + r * .3, y - r * .6]], '#e23b2e'); }
  px.disc(g, x, y, r, dk); px.disc(g, x, y, r - 1, c); px.disc(g, x - r * .25, y - r * .25, Math.max(1, r * .35), hi);
  if (size >= 10) E.font.text(g, kind === 'g' ? '1' : kind === 's' ? '2' : '3', x - 2, y - 3, dk, { outline: false });
};
Art.laurel = (g, x, y, size = 20, on = true) => {
  const cx = x + size / 2, cy = y + size / 2, r = size * .42;
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + side * (.45 + i * .42); px.ell(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.max(1, size * .11), Math.max(1, size * .06), on ? (i % 2 ? '#c8901a' : '#f2c94c') : '#3a4060'); }
  if (on) px.disc(g, cx, cy + r * .9, Math.max(1, size * .08), '#e23b2e');
};
Art.torch = (g, x, y, h, lit = true, t = game.real) => { px.poly(g, [[x - 3, y - h], [x + 3, y - h], [x + 1, y], [x - 1, y]], '#c8ccd8'); px.rect(g, x - 4, y - h - 2, 8, 3, '#f2b632'); if (lit) { const f = Math.sin(t * 13) * 1.5; px.poly(g, [[x - 4, y - h - 2], [x + 4, y - h - 2], [x + 1 + f, y - h - 12], [x - 1, y - h - 8]], '#ff7a1a'); px.poly(g, [[x - 2, y - h - 2], [x + 2, y - h - 2], [x + f * .5, y - h - 8]], '#ffe066'); } };

// ---------------------------------------------------------------------------------------------------------------
// the crowd: hundreds of 3x5 spectators painted in rows, bobbing with O.Crowd.level, waving flags, flashing cameras
// ---------------------------------------------------------------------------------------------------------------
const SHIRTS = ['#f2b632', '#2f7fe0', '#e23b2e', '#ff7fb8', '#ff6a1a', '#1fa8a0', '#6a3fc8', '#e83ae0', '#f4f8ff', '#2fa8d8', '#6fe0c0', '#ffd23a', '#c8ccd8', '#3ae8f0'];
const SKINS = ['#f2d4c4', '#e0b090', '#c88a5e', '#8d5a3b', '#6a4028', '#f5c9a8', '#5a3420'];
/** a band of crowd: screen rect (x, y, w, h), rows of spectators `step` px apart; o: { level, seed, shade, wave, flags, dark } */
Art.crowd = (g, x, y, w, h, o = {}) => {
  const lvl = o.level === undefined ? (O.Crowd ? O.Crowd.level : .4) : o.level, t = game.real, seed = o.seed || 1, rowH = o.rowH || 6, colW = o.colW || 4;
  x = Math.floor(x); y = Math.floor(y);
  const rows = Math.max(1, Math.floor(h / rowH)), cols = Math.ceil(w / colW) + 1, ox = o.scroll ? ((o.scroll % colW) + colW) % colW : 0, first = o.scroll ? Math.floor(o.scroll / colW) : 0;
  if (o.bg !== false) { px.rect(g, x, y, w, h, o.bg || '#2a2440'); for (let r = 0; r < rows; r++) px.rect(g, x, y + r * rowH + rowH - 1, w, 1, o.step || '#1a1630'); }
  const wave = o.wave !== undefined ? o.wave : (O.Crowd ? O.Crowd.wave : -1);
  for (let r = 0; r < rows; r++) {
    const ry = y + r * rowH;
    for (let c = 0; c < cols; c++) {
      const id = first + c, hsh = O.hash(seed * 7919 + r * 131 + id), sx = x + c * colW - ox + (hsh % 2);
      if (sx < x - 2 || sx > x + w) continue;
      if (hsh % 11 === 0) continue;
      const shirt = o.palette ? o.palette[hsh % o.palette.length] : SHIRTS[hsh % SHIRTS.length], skin = SKINS[(hsh >>> 4) % SKINS.length];
      const ph = (hsh % 100) / 100 * 6.28, bobA = lvl > .55 ? 2 : lvl > .25 ? 1 : 0, wv = wave >= 0 ? Math.max(0, 1 - Math.abs((sx - x) / Math.max(1, w) - wave) * 8) : 0;
      const bob = Math.round(Math.max(0, Math.sin(t * (4 + lvl * 6) + ph)) * bobA + wv * 3);
      const yy = ry + rowH - 5 - bob;
      px.rect(g, sx, yy + 2, 3, 3, o.dark ? E.shade(shirt, -.45) : shirt);
      px.rect(g, sx + 1, yy, 1, 2, o.dark ? E.shade(skin, -.45) : skin);
      if ((lvl > .5 || wv > .3) && hsh % 3 === 0) { px.rect(g, sx - 1, yy + 1 - bob % 2, 1, 2, o.dark ? E.shade(skin, -.45) : skin); px.rect(g, sx + 3, yy + 1 - (bob + 1) % 2, 1, 2, o.dark ? E.shade(skin, -.45) : skin); }
      if (o.flags !== false && hsh % 23 === 0) { const nid = O.NATION_IDS ? O.NATION_IDS[hsh % 8] : 'SUN', fl = Math.round(Math.sin(t * 5 + ph) * 1.5); px.rect(g, sx + 3, yy - 6, 1, 7, '#d8dce8'); Art.flag(g, sx + 4, yy - 6 + fl, 6, 4, nid); }
      if (o.flash !== false && ((hsh + Math.floor(t * 9)) % 997) < 1 + lvl * 3) px.blend(g, .9, 'add', () => { px.rect(g, sx - 1, yy - 1, 5, 5, '#ffffff'); px.rect(g, sx - 3, yy + 1, 9, 1, '#ffffff'); });
    }
  }
};

// stands as a block: tiers with railings and the crowd, between screen x0..x1, top y0 to bottom y1
Art.stands = (g, x0, y0, x1, y1, o = {}) => {
  const h = y1 - y0, tiers = o.tiers || 3, th = Math.floor(h / tiers);
  for (let i = 0; i < tiers; i++) {
    const ty = y0 + i * th;
    Art.crowd(g, x0, ty + 3, x1 - x0, th - 5, Object.assign({}, o, { seed: (o.seed || 1) + i * 17 }));
    px.rect(g, x0, ty + th - 2, x1 - x0, 2, o.rail || '#c8ccd8'); px.rect(g, x0, ty + th - 2, x1 - x0, 1, '#ffffff');
    px.rect(g, x0, ty, x1 - x0, 3, o.lip || '#4a3f6a');
  }
};

// ---------------------------------------------------------------------------------------------------------------
// the jumbotron: a dot-matrix panel
// ---------------------------------------------------------------------------------------------------------------
const jcv = cv(200, 60), jg = jcv.getContext('2d');
Art.jumbo = (g, x, y, w, h, lines, o = {}) => {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  px.rect(g, x - 2, y - 2, w + 4, h + 4, '#14161e'); px.rect(g, x - 1, y - 1, w + 2, h + 2, '#3a3e50'); px.rect(g, x, y, w, h, '#06070c');
  const hw = Math.min(200, Math.floor(w / 2)), hh = Math.min(60, Math.floor(h / 2));
  jg.clearRect(0, 0, 200, 60); px.reset(jg);
  if (o.draw) o.draw(jg, hw, hh);
  else lines.forEach((ln, i) => { const s = typeof ln === 'string' ? ln : ln[0], c = typeof ln === 'string' ? (o.color || '#ffb020') : ln[1]; E.font.text(jg, s, Math.round(hw / 2 - E.font.width(s, { font: 'tiny' }) / 2), 2 + i * 7, c, { font: 'tiny', outline: false }); });
  const img = jg.getImageData(0, 0, hw, hh).data;
  for (let j = 0; j < hh; j++) for (let i = 0; i < hw; i++) {
    const k = (j * 200 + i) * 4; void k;
    const q = (j * hw + i) * 4;
    if (img[q + 3] > 40) px.rect(g, x + i * 2, y + j * 2, 1, 1, '#' + [img[q], img[q + 1], img[q + 2]].map(v => v.toString(16).padStart(2, '0')).join(''));
    else if ((i + j) % 2 === 0) px.rect(g, x + i * 2, y + j * 2, 1, 1, '#161824');
  }
  px.rect(g, x, y, w, 1, '#262a3c');
};

// ---------------------------------------------------------------------------------------------------------------
// fireworks and confetti (particles: cosmetic stream)
// ---------------------------------------------------------------------------------------------------------------
Art.firework = (x, y, z, colors, o = {}) => {
  const P = game.particles, n = o.n || 26;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, sp = 70 + (i % 3) * 30;
    P.add({ kind: 'glint', x, y, z, vx: Math.cos(a) * sp * (o.side ? 1 : .7), vy: o.side ? 0 : Math.sin(a) * sp * .3, vz: Math.sin(a) * sp, g: 60, drag: 1.4, max: 1.1 + (i % 4) * .15, size: 1.5, color: colors[i % colors.length] });
  }
  P.glints(x, y, z, 8, '#ffffff', 10);
  game.lights && game.lights.enabled && 0;
  if (!o.quiet) game.audio.sfx('firework', { vol: .7 });
};
Art.confetti = (x, y, z, colors, n = 40) => game.particles.bits(x, y, z, n, colors);

// ---------------------------------------------------------------------------------------------------------------
// the mascot: YIKESY, a round snow-yeti with a flame tuft and a half-orange, half-blue scarf
// ---------------------------------------------------------------------------------------------------------------
Art.makeYikesy = (R = 9) => new E.Blob({ R, ears: 'cat', feet: true, mouth: true, colors: { base: '#f8f8ff', dk: '#c8d2e6', lt: '#ffffff', eye: '#1a1a2e', pupil: '#000000' } });
Art.drawYikesy = (r, blob, x, y, z, o = {}) => {
  r.actor(x, y, z, (g, ox, oy) => {
    blob.draw(g, ox, oy, r.view);
    const R = blob.o ? blob.o.R || 9 : 9, top = oy - R * 2 - 1, t = game.real;
    const f = Math.sin(t * 12) * 1.5;
    px.poly(g, [[ox - 3, top + 2], [ox + 3, top + 2], [ox + 1 + f, top - 7], [ox - 1, top - 4]], '#ff7a1a'); px.poly(g, [[ox - 1, top + 2], [ox + 2, top + 2], [ox + f * .5, top - 3]], '#ffe066');
    px.rect(g, ox - R + 2, oy - R + 1, R - 2, 3, '#ff6a1a'); px.rect(g, ox, oy - R + 1, R - 2, 3, '#3fa8e8'); px.rect(g, ox + R - 4, oy - R + 3, 3, 5, '#3fa8e8');
  }, o);
  if (!o.noShadow) r.shadow(x, y, 8, .4);
};

// ---------------------------------------------------------------------------------------------------------------
// world-space painting helpers (project world points with r.w and fill)
// ---------------------------------------------------------------------------------------------------------------
Art.quad = (r, pts, c, g = r.ctx) => px.poly(g, pts.map(p => r.w(p[0], p[1], p[2] || 0)), c);
Art.wline = (r, a, b, c, w = 1, g = r.ctx) => { const p = r.w(a[0], a[1], a[2] || 0), q = r.w(b[0], b[1], b[2] || 0); px.line(g, p[0], p[1], q[0], q[1], c, w); };
Art.sky = (g, W, H, stops) => { const n = stops.length - 1, rows = 24; for (let i = 0; i < rows; i++) { const u = i / (rows - 1), k = Math.min(n - 1, Math.floor(u * n)), f = u * n - k; px.rect(g, 0, Math.floor(i * H / rows), W, Math.ceil(H / rows) + 1, E.mix(stops[k], stops[k + 1], f)); } };
Art.clouds = (g, W, y, t, o = {}) => { for (let i = 0; i < (o.n || 6); i++) { const cx = ((i * 137 + t * (o.speed || 4)) % (W + 120)) - 60, cy = y + (i * 29) % (o.spread || 30); px.blend(g, o.alpha || .7, 'normal', () => { px.ell(g, cx, cy, 22, 6, o.c || '#ffffff'); px.ell(g, cx - 10, cy + 2, 14, 5, o.c || '#ffffff'); px.ell(g, cx + 12, cy + 1, 16, 5, o.c2 || '#e8f0ff'); }); } };
Art.blimp = (g, x, y, t, o = {}) => {
  x = Math.round(x); y = Math.round(y + Math.sin(t * .7) * 2);
  px.ell(g, x, y, 26, 9, '#d8dce8'); px.ell(g, x - 4, y - 2, 20, 5, '#f4f6ff'); px.rect(g, x - 26, y, 52, 1, '#a8acc0');
  px.poly(g, [[x + 22, y - 2], [x + 32, y - 9], [x + 32, y + 9], [x + 22, y + 2]], '#e23b2e');
  px.rect(g, x - 6, y + 8, 12, 4, '#3a3f5a'); px.rect(g, x - 5, y + 9, 2, 2, '#ffe066'); px.rect(g, x, y + 9, 2, 2, '#ffe066');
  E.font.text(g, 'YIKES!', x - 15, y - 3, '#e23b2e', { font: 'tiny', outline: false });
  if (o.popped) px.blend(g, .6, 'normal', () => px.rect(g, x - 26, y - 9, 52, 18, '#ffffff'));
};
})();
