/* ---- ART: everything not in the engine's library, drawn by code in every view ---- */

// a box turned to an angle, drawn face by face (the faces turned toward the camera, far ones first), shaded by the
// face's normal: cars, couches, counters, a jukebox. Call inside an r.queue function (g = the buffer)
function obox(g, r, cx, cy, ang, len, wid, z0, z1, color, o = {}) {
  const v = r.view, c = Math.cos(ang), s = Math.sin(ang), hl = len / 2, hw = wid / 2, t = o.tones || E.tones(color);
  const P = (f, w, z) => [cx + c * f - s * w, cy + s * f + c * w, z];
  const scr = p => { const q = r.w(p[0], p[1], p[2]); return [q[0], q[1]]; };
  const dep = p => v.depth(p[0], p[1], p[2]);
  const mid = [cx, cy, (z0 + z1) / 2], up = Math.sign(dep([cx, cy, z1 + 1]) - dep([cx, cy, z1])) || -1;
  const faces = [
    { n: [c, s, 0], q: [P(hl, -hw, z0), P(hl, hw, z0), P(hl, hw, z1), P(hl, -hw, z1)], k: 'front' },
    { n: [-c, -s, 0], q: [P(-hl, -hw, z0), P(-hl, hw, z0), P(-hl, hw, z1), P(-hl, -hw, z1)], k: 'back' },
    { n: [-s, c, 0], q: [P(-hl, hw, z0), P(hl, hw, z0), P(hl, hw, z1), P(-hl, hw, z1)], k: 'right' },
    { n: [s, -c, 0], q: [P(-hl, -hw, z0), P(hl, -hw, z0), P(hl, -hw, z1), P(-hl, -hw, z1)], k: 'left' },
    { n: [0, 0, 1], q: [P(-hl, -hw, z1), P(hl, -hw, z1), P(hl, hw, z1), P(-hl, hw, z1)], k: 'top' }
  ];
  const vis = [];
  for (const f of faces) {
    const cc = f.q.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    const d0 = dep(cc), d1 = dep([cc[0] + f.n[0], cc[1] + f.n[1], cc[2] + f.n[2]]);
    if (Math.sign(d1 - d0) === up || f.k === 'top') vis.push({ f, d: d0 });
  }
  vis.sort((a, b) => (a.f.k === 'top') - (b.f.k === 'top') || a.d * up - b.d * up);
  for (const { f } of vis) {
    const lightK = f.k === 'top' ? 2 : (f.n[0] * -.6 + f.n[1] * .8);
    let col = f.k === 'top' ? (o.top || t.lt) : lightK > .3 ? t.base : lightK > -.3 ? t.sh : t.deep;
    if (o.faces && o.faces[f.k]) col = o.faces[f.k];
    const pts = f.q.map(scr);
    px.poly(g, pts, col);
    if (o.edge !== false) px.line(g, pts[2][0], pts[2][1], pts[3][0], pts[3][1], f.k === 'top' ? t.hi : t.lt);
    if (o.paint) o.paint(g, f.k, pts, f);
  }
  void mid;
}

// a car: wheels, a lower body, a glass cabin with a roof; headlights and brake lights. kind: 'sedan' | 'suv' | 'van' | 'truck'
const CAR_KINDS = {
  sedan: { len: 34, wid: 16, h0: 3, h1: 11, cab: [16, 13, 18, -2] }, suv: { len: 40, wid: 19, h0: 4, h1: 14, cab: [26, 17, 24, -4] },
  van: { len: 42, wid: 19, h0: 4, h1: 15, cab: [32, 18, 27, -4] }, truck: { len: 58, wid: 22, h0: 6, h1: 20, cab: [14, 20, 32, 18], bin: true },
  cop: { len: 36, wid: 16, h0: 3, h1: 11, cab: [16, 13, 18, -2] }
};
function drawCar(r, car, x, y, z, ang, color, kind = 'sedan', o = {}) {
  const K = CAR_KINDS[kind], c = Math.cos(ang), s = Math.sin(ang);
  r.shadow(x, y, K.len * .55, .45, undefined, 0);
  r.queue(x, y, z + 8, g => {
    for (const [f, w] of [[K.len * .32, K.wid * .5], [K.len * .32, -K.wid * .5], [-K.len * .32, K.wid * .5], [-K.len * .32, -K.wid * .5]]) {
      const p = r.w(x + c * f - s * w, y + s * f + c * w, z + 3); px.disc(g, p[0], p[1], 3, '#111016'); px.dot(g, p[0], p[1], '#7a7a88');
    }
    const glass = o.night ? '#2a3a5a' : '#5a7aa8';
    if (K.bin) {   // a garbage truck: a cab in front, a big bin behind
      obox(g, r, x + c * 18, y + s * 18, ang, 16, K.wid, z + K.h0, z + 30, color, { faces: { front: glass } });
      obox(g, r, x - c * 8, y - s * 8, ang, 40, K.wid + 2, z + K.h0, z + 34, o.bin || '#3a6a3a', { paint: (g2, k, pts) => {
        if (k === 'left' || k === 'right') { const a = pts[0], b = pts[1]; for (let i = 1; i < 6; i++) { const u = i / 6; px.line(g2, lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(pts[3][0], pts[2][0], u), lerp(pts[3][1], pts[2][1], u), '#2a4a2a'); } }
      } });
      return;
    }
    obox(g, r, x, y, ang, K.len, K.wid, z + K.h0, z + K.h1, color, { paint: (g2, k, pts) => {
      if (k === 'front') { px.rect(g2, Math.round(lerp(pts[0][0], pts[1][0], .15)), Math.round(lerp(pts[3][1], pts[0][1], .4)), 2, 2, '#fff6c0'); px.rect(g2, Math.round(lerp(pts[0][0], pts[1][0], .8)), Math.round(lerp(pts[3][1], pts[0][1], .4)), 2, 2, '#fff6c0'); }
      if (k === 'back') { px.rect(g2, Math.round(lerp(pts[0][0], pts[1][0], .12)), Math.round(lerp(pts[3][1], pts[0][1], .4)), 2, 2, o.braking ? '#ff3a2a' : '#a01a1a'); px.rect(g2, Math.round(lerp(pts[0][0], pts[1][0], .82)), Math.round(lerp(pts[3][1], pts[0][1], .4)), 2, 2, o.braking ? '#ff3a2a' : '#a01a1a'); }
      if (o.label && (k === 'left' || k === 'right')) { const m = [(pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4]; E.font.text(g2, o.label, Math.round(m[0]), Math.round(m[1]) - 3, o.labelColor || '#2a2a3a', { font: 'tiny', align: 'center', outline: false }); }
    } });
    const [cl, cw, ch, off] = K.cab, ct = E.tones(color);
    obox(g, r, x + c * off, y + s * off, ang, cl, cw, z + K.h1, z + ch, color, { top: kind === 'cop' ? '#e8e8f0' : ct.base, faces: { front: glass, back: glass, left: E.shade(glass, -.1), right: E.shade(glass, -.1) } });
    if (kind === 'cop' || o.siren) { const p = r.w(x + c * off, y + s * off, z + ch + 2); px.rect(g, p[0] - 3, p[1] - 1, 3, 2, (game.time * 4 | 0) % 2 ? '#ff2a2a' : '#5a1010'); px.rect(g, p[0], p[1] - 1, 3, 2, (game.time * 4 | 0) % 2 ? '#1a1a5a' : '#3a6aff'); }
  }, { solid: true });
  if (o.night) {
    const fx = x + c * (K.len / 2 + 30), fy = y + s * (K.len / 2 + 30);
    L.add(fx, fy, 6, 46, .55, { color: '#fff2c0' });
  }
}

// a sign board on a building front: dark board, letters; neon: a glow that flickers
function signBoard(r, x, y, z, text, o = {}) {
  r.queue(x, y, z, g => {
    const p = r.w(x, y, z), zm = r.view.zoom || 1, sc = o.scale || 1, w = E.font.width(text, { scale: sc }) + 10, h = 11 * sc;
    const on = !o.neon || (Math.sin(game.time * 13 + x) > -.92);
    if (o.neon && on) px.blend(g, .25, 'add', () => px.ell(g, p[0], p[1] - h / 2, w / 2 + 10, h / 2 + 7, o.color || '#ff4ab0'));
    E.ui.box(g, Math.round(p[0] - w / 2), Math.round(p[1] - h), w, h, { bg: o.bg || ['#2a1a14', '#140a08'], border: o.border || '#c8a060', gradient: true });
    E.font.text(g, text, Math.round(p[0]), Math.round(p[1] - h + 2 * sc), on ? (o.neon ? '#ffffff' : o.color || '#f4e2b0') : E.shade(o.color || '#ff4ab0', -.6), { align: 'center', scale: sc, outline: o.neon && on ? (o.color || '#ff4ab0') : false, shadow: o.neon ? false : '#000' });
    void zm;
  }, { emissive: !!o.neon });
}

/* string sprites: small things */
const SPR = {
  paper: E.sprite(['wwwwwwww', 'wkkwkkkw', 'wwwwwwww', 'wkwkkwkw', 'wkwwwwww', 'wwwwwwww'], { w: '#e8e2d0', k: '#5a5a62' }, 1),
  envelope: E.sprite(['wwwwwwwwww', 'wWwwwwwwWw', 'wwWwwwwWww', 'wwwWwwWwww', 'wwwwWWwwww', 'wwwwwwwwww', 'wwwwgwwwww'], { w: '#e8d8a8', W: '#b8a070', g: '#3a8a3a' }, 1),
  cash: E.sprite(['gggggggg', 'gGGggGGg', 'gG$$$$Gg', 'gGGggGGg', 'gggggggg'], { g: '#3a8a4a', G: '#7ac87a', $: '#e8f8d8' }, 1),
  gabagool: E.sprite(['..pppp..', '.pPPPPp.', 'pPwPPwPp', 'pPPPPPPp', '.pPPPPp.', '..pppp..'], { p: '#a83a3a', P: '#e88a8a', w: '#f8e0e0' }, 1),
  bread: E.sprite(['..bbbb..', '.bBBBBb.', 'bBBhBBBb', 'bbbbbbbb'], { b: '#8a5a2a', B: '#d8a050', h: '#f8d890' }, 1),
  heart: E.sprite(['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'], { r: '#8a1a2a', R: '#e83a4a' }, 1),
  badge: E.sprite(['..yyy..', '.yYYYy.', 'yYyYyYy', 'yYYYYYy', '.yYyYy.', '..yyy..'], { y: '#a87a20', Y: '#f0c850' }, 1),
  duckling: E.sprite(['.yy.', 'yyYo', 'yyy.'], { y: '#e8c840', Y: '#2a2a2a', o: '#e88a20' }, 1),
  ring: E.sprite(['.oooo.', 'oO..Oo', 'o....o', 'oO..Oo', '.oooo.'], { o: '#c87a2a', O: '#f0c070' }, 1)
};

// a duck: a Blob with wings, feet and a beak painted on (mallards: green heads)
function makeDuck(i) {
  const male = i % 2 === 0;
  return { blob: new E.Blob({ R: 3.4, wings: true, feet: true, tail: true, colors: male ? { dk: '#3a4a2a', base: '#8a7a5a', lt: '#b8a888', spec: '#2a8a4a', eye: '#101010', pupil: '#101010' } : { dk: '#5a4430', base: '#9a7a52', lt: '#c8a878', spec: '#e8d0a0', eye: '#101010', pupil: '#101010' } }),
    male, x: 0, y: 0, z: 0, vx: 0, vy: 0, t: Math.random() * 9, fly: 0, fed: 0 };
}

// screen-space glyph badges for button prompts: PlayStation shapes, Xbox letters, key caps, mouse buttons
const PS_SHAPES = { 0: ['cross', '#7aa8ff'], 1: ['circle', '#ff6a6a'], 2: ['square', '#ff8ad8'], 3: ['triangle', '#5ae0b0'] };
const XB_COL = { 0: '#5ac85a', 1: '#e85a4a', 2: '#4a8ae8', 3: '#e8c83a' };
function codeFor(action, device) {
  const codes = (input.map && input.map[action]) || [];
  if (device === 'gamepad') return codes.find(c => /^Pad\d+$/.test(c));
  if (device === 'mouse') return codes.find(c => /^Mouse\d$/.test(c)) || codes.find(c => !/^(Pad|Act:|Mouse)/.test(c));
  return codes.find(c => !/^(Pad|Act:|Mouse)/.test(c)) || codes.find(c => /^Mouse\d$/.test(c));
}
// draws one prompt badge at (x, y) top-left; returns its width
function glyph(g, x, y, action, o = {}) {
  const dev = o.device || (input.lastDevice === 'touch' ? 'keyboard' : input.lastDevice), code = codeFor(action, dev);
  if (!code) return 0;
  if (/^Pad\d+$/.test(code)) {
    const n = +code.slice(3), style = input.padStyle ? input.padStyle() : 'playstation';
    if (n <= 3) {
      const cx = x + 5, cy = y + 5;
      px.disc(g, cx, cy, 5, '#101018'); px.disc(g, cx, cy, 4, '#2a2a36');
      if (style === 'xbox') { px.disc(g, cx, cy, 4, XB_COL[n]); E.font.text(g, 'ABXY'[n], cx, cy - 3, '#101018', { align: 'center', outline: false }); }
      else {
        const [shape, col] = PS_SHAPES[n];
        if (shape === 'cross') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, col); px.line(g, cx - 2, cy + 2, cx + 2, cy - 2, col); }
        else if (shape === 'circle') { px.disc(g, cx, cy, 2.6, col); px.disc(g, cx, cy, 1.5, '#2a2a36'); }
        else if (shape === 'square') { px.rect(g, cx - 2, cy - 2, 5, 5, col); px.rect(g, cx - 1, cy - 1, 3, 3, '#2a2a36'); }
        else { px.line(g, cx, cy - 3, cx - 3, cy + 2, col); px.line(g, cx, cy - 3, cx + 3, cy + 2, col); px.line(g, cx - 3, cy + 2, cx + 3, cy + 2, col); }
      }
      return 11;
    }
    const lab = input.codeLabel(code), w = E.font.width(lab) + 6;
    E.ui.box(g, x, y, w, 11, { bg: ['#3a3a4a', '#1a1a24'], border: '#c8c8d8' }); E.font.text(g, lab, x + 3, y + 2, '#ffffff', { outline: false });
    return w;
  }
  if (/^Mouse\d$/.test(code)) {
    const b = +code.slice(5);
    px.rect(g, x + 1, y, 8, 11, '#d8d8e0'); px.rect(g, x + 2, y + 1, 6, 9, '#f4f4f8'); px.rect(g, x + 4, y + 1, 1, 4, '#8a8a98');
    px.rect(g, b === 2 ? x + 5 : x + 2, y + 1, 2, 3, '#ff6a3a');
    return 10;
  }
  const lab = input.codeLabel(code), w = Math.max(11, E.font.width(lab) + 6);
  E.ui.box(g, x, y, w, 11, { bg: ['#f4f0e8', '#c8c0b0'], border: '#3a3440', gradient: true });
  E.font.text(g, lab, x + Math.round(w / 2), y + 2, '#1a1620', { align: 'center', outline: false });
  return w;
}
// a row of [action, text] prompts, centred at cx or left at x
function promptRow(g, x, y, items, o = {}) {
  const parts = items.map(([a, t]) => ({ a, t, w: 0 }));
  let total = 0; for (const p of parts) { p.tw = E.font.width(p.t); total += 13 + p.tw + 10; }
  let at = o.center ? Math.round(x - total / 2) : x;
  if (o.panel) E.ui.box(g, at - 5, y - 3, total + 2, 17, { bg: ['#1a1420', '#0a080e'], border: '#8a7a5a', alpha: .85 });
  for (const p of parts) { const w = glyph(g, at, y, p.a) || 0; at += w + 3; E.font.text(g, p.t, at, y + 2, o.color || '#f4ecd8', { shadow: '#000', outline: false }); at += p.tw + 10; }
}
