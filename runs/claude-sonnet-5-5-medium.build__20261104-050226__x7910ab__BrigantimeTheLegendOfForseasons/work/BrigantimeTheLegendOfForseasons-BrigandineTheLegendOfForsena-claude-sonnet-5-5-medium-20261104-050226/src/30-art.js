/* ---- ART: everything is drawn by code. Palettes, text, panels, creatures, knights, the hex board and the world map. ---- */
const px = E.px;
G.T = (g, s, x, y, c, o) => E.font.text(g, String(s), Math.round(x), Math.round(y), c || '#f4eed8', Object.assign({ shadow: '#0a0612', outline: false }, o || {}));
G.TW = (s, o) => E.font.width(String(s), o);
G.tone = c => E.tones(c);
G.mix = (a, b, t) => { const p = E.hex ? E.hex(a) : null; return a; };
const hx = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
G.lerpCol = (a, b, t) => { const p = hx(a), q = hx(b); return toHex(p.map((v, i) => v + (q[i] - v) * t)); };
G.hash2 = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* season palettes for the board and the map */
G.SEASON_PAL = [
  { sky: ['#bfe8f8', '#8fd0e8'], plain: ['#6fbf5a', '#78c862'], forest: '#2f7a3a', water: '#4a9ad8', low: '#5aa8a0', ink: '#e8f8c8' },
  { sky: ['#ffe6a0', '#f4b860'], plain: ['#c8b45a', '#d2be62'], forest: '#7a8a2a', water: '#3a88c8', low: '#b8a450', ink: '#fff0c0' },
  { sky: ['#e8b078', '#c47a48'], plain: ['#b8803c', '#c28a44'], forest: '#8a4a22', water: '#3a6a98', low: '#a87838', ink: '#ffe0a8' },
  { sky: ['#cfe0f0', '#9ab8d8'], plain: ['#d8e6f0', '#e4eef6'], forest: '#5a7a8a', water: '#7ab0d8', low: '#c8d8e4', ink: '#ffffff' }
];

/* ---- window frames and bars ---- */
G.box = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#241c3c', '#120c22'], border: '#c8a860' }, o));
G.bar = (g, x, y, w, h, f, col) => { px.rect(g, x, y, w, h, '#0a0612'); px.rect(g, x + 1, y + 1, Math.max(0, Math.round((w - 2) * G.clamp(f, 0, 1))), h - 2, col); };
G.chip = (g, x, y, label, col) => {   // a button glyph / key cap, returns its width
  const shape = { '✕': 1, '○': 2, '□': 3, '△': 4 }[label];
  const w = shape ? 12 : Math.max(9, G.TW(label) + 5);
  px.rect(g, x, y, w, 10, '#0a0612'); px.rect(g, x + 1, y + 1, w - 2, 8, col || '#3a3258'); px.rect(g, x + 1, y + 1, w - 2, 1, '#ffffff33');
  if (shape) { const cx = x + 6, cy = y + 5, c = '#ffffff'; if (shape === 1) { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, c, 1); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, c, 1); } else if (shape === 2) { px.disc(g, cx, cy, 3, c); px.disc(g, cx, cy, 1.4, col); } else if (shape === 3) { px.rect(g, cx - 2, cy - 2, 5, 5, c); px.rect(g, cx - 1, cy - 1, 3, 3, col); } else { px.poly(g, [[cx, cy - 3], [cx + 3, cy + 2], [cx - 3, cy + 2]], c); px.poly(g, [[cx, cy - 1], [cx + 1, cy + 1], [cx - 1, cy + 1]], col); } }
  else G.T(g, label, x + Math.round((w - G.TW(label)) / 2), y + 1, '#fff', { shadow: false });
  return w;
};
G.PAD_COL = { '✕': '#3a5ab0', '○': '#b03a3a', '□': '#b03a8a', '△': '#2a9a6a', 'A': '#2a8a3a', 'B': '#b03a3a', 'X': '#3a5ab0', 'Y': '#b09a2a' };

/* ---- creature painter: six bodies, three forms, drawn from px primitives ---- */
G.drawMon = (g, sp, form, x, y, o = {}) => {
  const t = o.t || 0, dir = o.dir || 1, k = (sp.size === 'S' ? .78 : sp.size === 'L' ? 1.22 : 1) * (1 + form * .13) * (o.scale || 1);
  const tn = G.tone(o.flash ? '#ffffff' : sp.col), walk = o.walk || 0, bob = Math.sin(t * 3 + (o.seed || 0)) * .8, lunge = (o.lunge || 0) * 5 * dir;
  const X = x + lunge, S = v => v * k;
  if (o.alpha !== undefined && o.alpha < 1) { g.save(); g.globalAlpha = Math.max(0, o.alpha); }
  const eye = (ex, ey, c) => { px.rect(g, Math.round(ex), Math.round(ey), 2, 2, c || '#fff'); px.dot(g, Math.round(ex + (dir > 0 ? 1 : 0)), Math.round(ey + 1), '#120a1a'); };
  const leg = (lx, ph) => { const lift = Math.max(0, Math.sin(t * 12 + ph)) * walk * 2; px.rect(g, Math.round(X + lx * dir), Math.round(y - S(4) - lift), Math.max(1, Math.round(S(2))), Math.round(S(4) + lift), tn.sh); };
  switch (sp.body) {
    case 'quad': {
      const hop = Math.abs(Math.sin(t * 12)) * walk * 1.5;
      leg(-6, 0); leg(-3, 2); leg(4, 1); leg(7, 3);
      px.poly(g, [[X - S(10) * dir, y - S(8) - hop], [X - S(15) * dir, y - S(13) - hop + Math.sin(t * 4) * 1.5], [X - S(9) * dir, y - S(10) - hop]], tn.sh);
      if (sp.id === 'salam') { px.ddisc(g, X - S(15) * dir, y - S(13) - hop, S(4), '#ffb040', .7); px.disc(g, X - S(15) * dir, y - S(13) - hop, S(2), '#fff0a0'); }
      px.ell(g, X, y - S(8) - hop + bob * .3, S(10), S(5.5), tn.base); px.ell(g, X, y - S(6) - hop, S(9), S(3), tn.lt); px.ell(g, X + S(1) * dir, y - S(11) - hop, S(6), S(2), tn.sh);
      px.ell(g, X + S(9) * dir, y - S(11.5) - hop, S(5), S(4), tn.base);
      if (sp.id === 'wolf') { px.poly(g, [[X + S(7) * dir, y - S(15) - hop], [X + S(8.5) * dir, y - S(20) - hop], [X + S(11) * dir, y - S(15) - hop]], tn.sh); px.rect(g, Math.round(X + S(12) * dir), Math.round(y - S(11) - hop), Math.round(S(3)), 2, tn.deep); px.dot(g, Math.round(X + S(12) * dir), Math.round(y - S(9) - hop), '#fff'); }
      else px.rect(g, Math.round(X + S(12) * dir) - (dir < 0 ? 4 : 0), Math.round(y - S(11) - hop), Math.round(S(5)), Math.round(S(3)), tn.lt);
      eye(X + S(9) * dir - (dir < 0 ? 1 : 0), y - S(14) - hop, form === 2 ? '#ff6040' : '#fff');
      if (form >= 1) px.poly(g, [[X + S(5) * dir, y - S(15) - hop], [X + S(6) * dir, y - S(19) - hop], [X + S(8) * dir, y - S(15) - hop]], tn.hi);
      break;
    }
    case 'fly': {
      const fy = y - S(13) + bob * 1.4 - (o.walk ? 0 : 0), fl = Math.sin(t * 16 + (o.seed || 0));
      const wc = sp.id === 'pixie' ? '#e8f8ff' : tn.lt;
      px.polyDither(g, [[X, fy], [X - S(10) * dir, fy - S(9) - fl * S(4)], [X - S(4) * dir, fy + S(2)]], wc, .85);
      px.polyDither(g, [[X, fy], [X + S(10) * dir * .2, fy - S(11) - fl * S(5)], [X + S(3) * dir, fy - S(1)]], wc, .7);
      if (sp.id === 'pixie') { px.ell(g, X, fy + S(2), S(3), S(4), '#f0a0c8'); px.disc(g, X + S(1) * dir, fy - S(3), S(2.6), '#ffe0c8'); px.poly(g, [[X - S(3), fy - S(5)], [X, fy - S(10)], [X + S(3), fy - S(5)]], '#ff80b8'); px.ddisc(g, X, fy, S(7), '#fff0a0', .35); }
      else { px.ell(g, X, fy, S(6), S(4), tn.base); px.ell(g, X - S(1) * dir, fy + S(1), S(4), S(2), tn.lt); px.disc(g, X + S(5) * dir, fy - S(2), S(3), tn.base); px.poly(g, [[X + S(7.5) * dir, fy - S(3)], [X + S(11) * dir, fy - S(2)], [X + S(7.5) * dir, fy - S(1)]], '#f0c040'); eye(X + S(5) * dir - 1, fy - S(4), '#fff'); px.poly(g, [[X - S(6) * dir, fy], [X - S(11) * dir, fy + S(3)], [X - S(6) * dir, fy + S(2)]], tn.sh); if (sp.id === 'hawk') px.ddisc(g, X, fy, S(10), '#ffd060', .25); }
      px.ell(g, X, y - 1, S(5), 1.5, '#00000044');
      break;
    }
    case 'brute': {
      const sw = Math.sin(t * 10) * walk * 2, tl = (sp.id === 'golem');
      px.rect(g, Math.round(X - S(5)), Math.round(y - S(7)), Math.round(S(4)), Math.round(S(7)), tn.sh); px.rect(g, Math.round(X + S(1)), Math.round(y - S(7)), Math.round(S(4)), Math.round(S(7)), tn.sh);
      px.rect(g, Math.round(X - S(9)), Math.round(y - S(19) + sw), Math.round(S(4)), Math.round(S(11)), tn.sh); px.rect(g, Math.round(X + S(5)), Math.round(y - S(19) - sw), Math.round(S(4)), Math.round(S(11)), tn.sh);
      px.rect(g, Math.round(X - S(7)), Math.round(y - S(21) + bob * .4), Math.round(S(14)), Math.round(S(15)), tn.base); px.rect(g, Math.round(X - S(7)), Math.round(y - S(21) + bob * .4), Math.round(S(14)), 2, tn.lt);
      if (tl) { px.line(g, X - S(3), y - S(18), X, y - S(12), tn.deep); px.line(g, X, y - S(12), X + S(3), y - S(15), tn.deep); px.rect(g, Math.round(X - S(5)), Math.round(y - S(28) + bob * .4), Math.round(S(10)), Math.round(S(7)), tn.lt); px.rect(g, Math.round(X - S(3)), Math.round(y - S(26) + bob * .4), 2, 2, '#ffd060'); px.rect(g, Math.round(X + S(1)), Math.round(y - S(26) + bob * .4), 2, 2, '#ffd060'); }
      else { px.ell(g, X, y - S(15), S(7), S(6), tn.lt); px.disc(g, X, y - S(26) + bob * .4, S(5), tn.hi); eye(X - S(3), y - S(27) + bob * .4, '#1a2a4a'); eye(X + S(1), y - S(27) + bob * .4, '#1a2a4a'); px.rect(g, Math.round(X - S(2)), Math.round(y - S(23) + bob * .4), Math.round(S(4)), 1, tn.deep); }
      break;
    }
    case 'wisp': {
      const fy = y - S(13) + bob * 2, flick = Math.sin(t * 9 + (o.seed || 0)) * 1.2, ghost = sp.id === 'wraith';
      px.ddisc(g, X, fy, S(12), tn.lt, .35);
      if (ghost) { px.poly(g, [[X - S(7), fy + S(9)], [X - S(5), fy - S(6)], [X, fy - S(10)], [X + S(5), fy - S(6)], [X + S(7), fy + S(9)], [X + S(3), fy + S(6) + flick], [X, fy + S(10)], [X - S(3), fy + S(6) - flick]], tn.base); px.ell(g, X, fy - S(3), S(4), S(4.5), tn.deep); px.rect(g, Math.round(X - S(3)), Math.round(fy - S(4)), 2, 2, '#ffe880'); px.rect(g, Math.round(X + S(1)), Math.round(fy - S(4)), 2, 2, '#ffe880'); }
      else { px.poly(g, [[X, fy - S(11) + flick], [X + S(6), fy + S(1)], [X + S(4), fy + S(7)], [X, fy + S(9)], [X - S(4), fy + S(7)], [X - S(6), fy + S(1)]], tn.base); px.disc(g, X, fy + S(2), S(4.5), tn.hi); eye(X - S(3), fy, '#102040'); eye(X + S(1), fy, '#102040'); }
      px.ell(g, X, y - 1, S(5), 1.5, '#00000044');
      break;
    }
    case 'imp': {
      const sw = Math.sin(t * 11) * walk * 2, bone = sp.id === 'bone';
      px.rect(g, Math.round(X - S(3)), Math.round(y - S(7)), Math.round(S(2)), Math.round(S(7)), tn.sh); px.rect(g, Math.round(X + S(1)), Math.round(y - S(7)), Math.round(S(2)), Math.round(S(7)), tn.sh);
      px.rect(g, Math.round(X - S(4)), Math.round(y - S(15) + bob * .5), Math.round(S(8)), Math.round(S(9)), bone ? tn.lt : tn.base);
      if (bone) { for (let i = 0; i < 3; i++) px.rect(g, Math.round(X - S(3)), Math.round(y - S(13) + S(i * 2.5)), Math.round(S(6)), 1, tn.deep); }
      else { px.disc(g, X - S(6) * dir, y - S(13), S(3.5), '#d8b040'); px.dot(g, Math.round(X - S(6) * dir), Math.round(y - S(13)), '#6a4a14'); }
      px.rect(g, Math.round(X - S(7) + sw), Math.round(y - S(14)), Math.round(S(2.5)), Math.round(S(7)), tn.sh); px.rect(g, Math.round(X + S(5) - sw), Math.round(y - S(14)), Math.round(S(2.5)), Math.round(S(7)), tn.sh);
      px.ell(g, X, y - S(18) + bob * .5, S(5), S(4.5), bone ? tn.hi : tn.lt); eye(X - S(3), y - S(19) + bob * .5, bone ? '#120a1a' : '#ffe060'); eye(X + S(1), y - S(19) + bob * .5, bone ? '#120a1a' : '#ffe060');
      if (!bone) { px.poly(g, [[X - S(4), y - S(21)], [X - S(5), y - S(25)], [X - S(2), y - S(22)]], tn.deep); px.poly(g, [[X + S(4), y - S(21)], [X + S(5), y - S(25)], [X + S(2), y - S(22)]], tn.deep); }
      else px.rect(g, Math.round(X - S(2)), Math.round(y - S(15) + bob * .5), Math.round(S(4)), 1, tn.deep);
      break;
    }
    case 'blob': {
      const sq = 1 + Math.sin(t * 5 + (o.seed || 0)) * .08 + (o.lunge || 0) * .2;
      px.ell(g, X, y - S(6) * sq, S(10) / sq, S(7) * sq, tn.base); px.ell(g, X - S(2), y - S(8) * sq, S(6) / sq, S(3.5) * sq, tn.lt); px.ell(g, X - S(3), y - S(10) * sq, S(2), S(1.4), tn.hi);
      eye(X - S(3), y - S(8) * sq, '#fff'); eye(X + S(2), y - S(8) * sq, '#fff'); px.rect(g, Math.round(X - S(1)), Math.round(y - S(4) * sq), Math.round(S(3)), 1, tn.deep);
      if (form >= 2) { px.poly(g, [[X - S(5), y - S(12) * sq], [X - S(4), y - S(17) * sq], [X - S(2), y - S(13) * sq], [X, y - S(18) * sq], [X + S(2), y - S(13) * sq], [X + S(4), y - S(17) * sq], [X + S(5), y - S(12) * sq]], '#f0d050'); }
      break;
    }
  }
  if (form >= 2 && sp.body !== 'blob') px.ddisc(g, X, y - S(12), S(14), tn.hi, .18);
  if (o.alpha !== undefined && o.alpha < 1) g.restore();
};

/* ---- knight rigs: a Humanoid dressed by class line and realm ---- */
const HAIRS = ['#3b2a2f', '#e0b050', '#8a4a2a', '#d8d4e0', '#1a1420', '#c8402a', '#6a3a24'];
G.knightLook = (id, line, tier, realm, size) => {
  const R_ = G.REALMS[realm] || G.REALMS[5], idn = G.hash(id), hair = HAIRS[idn % HAIRS.length], K = G.KNIGHTS[id] || {};
  const boss = id === 'gray', col = boss ? '#6a6a74' : R_.col, dk = boss ? '#2a2a32' : R_.dark;
  const o = { size, build: tier >= 1 ? 'heroic' : 'chibi', hair: G.LINES[line].hair, colors: { cloth: dk, pants: G.lerpCol(dk, '#000000', .35), hair, trim: col, cape: col, capeIn: dk, metal: '#d0d8e8', plate: boss ? '#8a8a96' : '#b8c0d4', belt: '#d8b060', boot: '#4a3020' }, sleeves: 'long' };
  switch (line) {
    case 0: o.weapon = 'sword'; o.armor = true; o.hat = tier >= 1 ? { style: 'helmet', color: '#9aa4b8' } : null; o.cape = { len: 6, width: 5, seg: 2.4 }; break;
    case 1: o.weapon = 'gun'; o.hood = true; o.outfit = 'tunic'; o.colors.hair = dk; break;
    case 2: o.weapon = 'staff'; o.outfit = 'robe'; o.hat = { style: 'pointed', color: col }; break;
    case 3: o.weapon = 'staff'; o.outfit = 'robe'; o.hat = { style: 'band', color: col }; o.colors.cloth = '#f0ecde'; o.colors.pants = '#e0d8c4'; break;
    default: o.weapon = 'sword'; o.outfit = 'tunic'; o.hair = 'spiky'; o.cape = { len: 4, width: 4, seg: 2.2 }; o.hat = tier >= 1 ? { style: 'band', color: col } : null; break;
  }
  if (K.role === 'ruler') o.hat = { style: 'crown', color: '#e8c860' };
  if (boss) { o.hat = { style: 'helmet', color: '#44444e' }; o.eyeGlow = '#f0f0ff'; o.build = 'bulky'; }
  return o;
};
const rigCache = new Map();
G.rigFor = (key, mk) => { let r = rigCache.get(key); if (!r) { r = mk(); rigCache.set(key, r); } return r; };
G.clearRigs = () => rigCache.clear();

/* ---- the board ---- */
G.board = { s: 12, sq: .62, ox: 0, oy: 0, tilt: 0 };
G.boardLayout = (S, W, H, topPad, botPad, steep) => {
  const b = G.board; b.sq = steep ? .8 : .62;
  const sx = (W - 8) / (Math.sqrt(3) * (S.cols + .5)), sy = (H - topPad - botPad - 6) / (1.5 * b.sq * (S.rows - 1) + 2 * b.sq + 8 / 10);
  b.s = Math.max(8, Math.min(sx, sy, 15));
  const bw = Math.sqrt(3) * b.s * (S.cols + .5), bh = 1.5 * b.s * b.sq * (S.rows - 1) + 2 * b.s * b.sq;
  b.ox = Math.round((W - bw) / 2 + Math.sqrt(3) * b.s / 2); b.oy = Math.round(topPad + (H - topPad - botPad - bh) / 2 + b.s * b.sq);
  return b;
};
G.hexCenter = (c, r) => { const b = G.board, p = G.hex.px(c, r, b.s); return [b.ox + p[0], b.oy + p[1] * b.sq]; };
G.pickHex = (S, sx, sy) => {
  const b = G.board; let best = null, bd = 1e9;
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) { const p = G.hexCenter(c, r), dx = sx - p[0], dy = (sy - p[1]) / b.sq; const d = Math.hypot(dx, dy); if (d < bd && d <= b.s * .95) { bd = d; best = [c, r]; } }
  return best;
};
G.tileColors = (ch, season, c, r) => {
  const P = G.SEASON_PAL[season], h = G.hash2(c, r);
  switch (ch) {
    case '.': return P.plain[h < .5 ? 0 : 1];
    case ',': return P.low;
    case 'f': return P.plain[0];
    case 'F': return P.plain[0];
    case 'w': return P.water;
    case 'i': return '#c8e8f8';
    case '#': return '#8a8896';
    case 'K': return '#a8a0b0';
    case 'D': return '#b89a58';
    default: return P.plain[0];
  }
};
G.drawTile = (g, ch, season, c, r, t, hi) => {
  const b = G.board, [cx, cy] = G.hexCenter(c, r), s = b.s, sq = b.sq, col = G.tileColors(ch, season, c, r), P = G.SEASON_PAL[season];
  const raise = ch === '#' ? Math.round(s * .45) : ch === 'K' ? Math.round(s * .22) : 0;
  const pts = G.hex.corners(cx, cy - raise, s - .5, sq), tn = G.tone(col);
  if (raise) { const bot = G.hex.corners(cx, cy, s - .5, sq); px.poly(g, [bot[0], bot[1], bot[2], bot[3], pts[3], pts[2], pts[1], pts[0]].map(p => p), tn.deep); px.poly(g, [pts[0], pts[5], bot[5], bot[0]], tn.sh); px.poly(g, [pts[5], pts[4], bot[4], bot[5]], tn.sh); px.poly(g, [pts[4], pts[3], bot[3], bot[4]], tn.deep); }
  px.poly(g, pts, tn.sh); px.poly(g, G.hex.corners(cx, cy - raise, s - 1.6, sq), col);
  const y0 = cy - raise;
  if (ch === 'f' || ch === 'F') {
    const burn = ch === 'F';
    for (let i = 0; i < 2; i++) { const ox = (i ? 3 : -3) * s / 12, oy = (i ? -1 : 1) * s / 14; const base = burn ? '#3a2a22' : P.forest; px.poly(g, [[cx + ox - s * .26, y0 + oy + s * .12 * sq * 2], [cx + ox, y0 + oy - s * .62], [cx + ox + s * .26, y0 + oy + s * .12 * sq * 2]], base); px.poly(g, [[cx + ox - s * .2, y0 + oy - s * .1], [cx + ox, y0 + oy - s * .78], [cx + ox + s * .2, y0 + oy - s * .1]], burn ? '#5a3a2a' : G.tone(P.forest).lt); }
    if (burn) for (let i = 0; i < 3; i++) { const fl = Math.sin(t * 9 + i * 2 + c) * 1.5; px.ddisc(g, cx + (i - 1) * s * .35, y0 - s * .3 + fl, s * .3, '#ff8030', .75); px.disc(g, cx + (i - 1) * s * .35, y0 - s * .2 + fl, s * .14, '#ffe070'); }
  } else if (ch === 'w' || ch === 'i') {
    const tt = G.tone(col); for (let i = 0; i < 3; i++) { const wx = cx + Math.sin(t * 1.5 + i * 2 + c) * s * .35, wy = y0 + (i - 1) * s * .22 * sq * 2; px.rect(g, Math.round(wx - 2), Math.round(wy), 4, 1, tt.hi); }
    if (ch === 'i') { px.line(g, cx - s * .4, y0 - 1, cx + s * .2, y0 + 1, '#ffffff', 1); px.line(g, cx - s * .1, y0 + 2, cx + s * .5, y0 - 2, '#a8d0e8', 1); }
  } else if (ch === ',') { for (let i = 0; i < 3; i++) px.rect(g, Math.round(cx + (i - 1) * s * .4), Math.round(y0 + ((i * 7 + c) % 3 - 1) * 2), 1, 2, G.tone(P.low).deep); }
  else if (ch === 'K') { const tn2 = G.tone('#a8a0b0'); px.rect(g, Math.round(cx - s * .35), Math.round(y0 - s * .5), Math.round(s * .7), Math.round(s * .6), tn2.base); px.rect(g, Math.round(cx - s * .35), Math.round(y0 - s * .5), Math.round(s * .7), 2, tn2.hi); for (let i = 0; i < 3; i++) px.rect(g, Math.round(cx - s * .35 + i * s * .3), Math.round(y0 - s * .62), Math.round(s * .15), 3, tn2.base); px.rect(g, Math.round(cx - 1), Math.round(y0 - s * .2), 3, Math.round(s * .3), '#3a2a4a'); px.rect(g, Math.round(cx + s * .35), Math.round(y0 - s * .9), 1, Math.round(s * .45), '#6a4a2a'); px.poly(g, [[cx + s * .35 + 1, y0 - s * .9], [cx + s * .35 + 7, y0 - s * .8 + Math.sin(t * 5)], [cx + s * .35 + 1, y0 - s * .7]], '#d84a4a'); }
  else if (ch === 'D') { px.ddisc(g, cx, y0, s * .7, '#ffd870', .22 + Math.sin(t * 2) * .08); px.ell(g, cx, y0, s * .5, s * .5 * sq, '#6a4a22'); px.ell(g, cx, y0, s * .38, s * .38 * sq, '#d8b060'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * .5; px.dot(g, Math.round(cx + Math.cos(a) * s * .3), Math.round(y0 + Math.sin(a) * s * .3 * sq), '#3a2210'); } }
  else if (ch === '#') { px.poly(g, [[cx - s * .3, y0 + s * .15 * sq], [cx - s * .1, y0 - s * .3], [cx + s * .15, y0 - s * .05], [cx + s * .35, y0 + s * .2 * sq]], G.tone('#8a8896').lt); }
  if (hi) { px.polyDither(g, G.hex.corners(cx, y0, s - 1, sq), hi.col, hi.a); }
};

/* ---- weather and seasonal motes (screen space) ---- */
G.motes = [];
G.motesInit = (n = 36) => { G.motes = Array.from({ length: n }, (_, i) => ({ x: Math.random(), y: Math.random(), v: .4 + Math.random() * .8, p: Math.random() * 6 })); };
G.drawMotes = (g, W, H, season, t, a = 1) => {
  if (!G.motes.length) G.motesInit();
  const cols = [['#ffc0d8', '#ffffff'], ['#ff8a30', '#ffd060'], ['#d88a30', '#a85a22'], ['#ffffff', '#d8f0ff']][season];
  for (const m of G.motes) {
    const sp = season === 1 ? -14 : season === 3 ? 18 : 12, sway = Math.sin(t * 1.3 + m.p) * (season === 3 ? 6 : 12);
    const x = ((m.x * W + sway + t * (season === 2 ? 14 : 4) * m.v) % W + W) % W, y = (((m.y * H + t * sp * m.v) % H) + H) % H;
    if (a < 1 && (m.p * 7 | 0) % 10 > a * 10) continue;
    px.rect(g, Math.round(x), Math.round(y), season === 3 ? 1 : 2, season === 3 ? 1 : 1, cols[(m.p * 3 | 0) % 2]);
  }
};

/* ---- the world map ---- */
G.mapRect = { x: 0, y: 0, w: 427, h: 240 };
G.mapPos = (c, rect) => [rect.x + c.x * rect.w, rect.y + c.y * rect.h];
G.drawCastle = (g, x, y, tier, col, t, o = {}) => {
  const s = tier === 3 ? 1.5 : tier === 2 ? 1.2 : 1, tn = G.tone('#b8b4c4'), dk = G.tone(col || '#8a8470');
  x = Math.round(x); y = Math.round(y);
  px.ell(g, x, y + 1, 10 * s, 3 * s, '#00000055');
  px.rect(g, x - Math.round(6 * s), y - Math.round(7 * s), Math.round(12 * s), Math.round(8 * s), tn.base); px.rect(g, x - Math.round(6 * s), y - Math.round(7 * s), Math.round(12 * s), 1, tn.hi);
  for (const dx of [-6, 3]) { px.rect(g, x + Math.round(dx * s), y - Math.round(11 * s), Math.round(3 * s), Math.round(5 * s), tn.lt); px.rect(g, x + Math.round(dx * s) - 1, y - Math.round(12 * s), Math.round(3 * s) + 2, 2, dk.base); }
  if (tier >= 2) { px.rect(g, x - Math.round(2 * s), y - Math.round(14 * s), Math.round(4 * s), Math.round(8 * s), tn.lt); px.poly(g, [[x - Math.round(3 * s), y - Math.round(14 * s)], [x, y - Math.round(19 * s)], [x + Math.round(3 * s), y - Math.round(14 * s)]], dk.base); }
  px.rect(g, x - 1, y - 3, 3, 4, '#2a1a30');
  const py = tier >= 2 ? 19 : 13; px.rect(g, x, y - Math.round(py * s) - 2, 1, 6, '#5a4028'); px.poly(g, [[x + 1, y - Math.round(py * s) - 2], [x + 8, y - Math.round(py * s) + Math.sin(t * 4) * 1 + 1], [x + 1, y - Math.round(py * s) + 3]], col || '#8a8470');
  if (o.stilled) { px.polyDither(g, [[x - 11, y - 18], [x + 11, y - 18], [x + 11, y + 2], [x - 11, y + 2]], '#9ab0d8', .4); px.rect(g, x - 3, y - 14, 6, 1, '#fff'); px.rect(g, x - 3, y - 6, 6, 1, '#fff'); px.line(g, x - 3, y - 13, x + 2, y - 7, '#fff', 1); px.line(g, x + 2, y - 13, x - 3, y - 7, '#fff', 1); }
};
G.drawWorldBackdrop = (g, W, H, season, t, dim) => {
  // four quadrants meeting at the clock face of Meridian
  const cx = W / 2, cy = H / 2, qc = ['#2c5a38', '#6a3a24', '#6a4a22', '#2c4a68'], hl = ['#3e7a4a', '#8a4a2c', '#8a6428', '#3e6288'];
  const quads = [[[0, 0], [cx, 0], [cx, cy], [0, cy]], [[cx, 0], [W, 0], [W, cy], [cx, cy]], [[cx, cy], [W, cy], [W, H], [cx, H]], [[0, cy], [cx, cy], [cx, H], [0, H]]];
  const order = [0, 1, 2, 3];
  px.rect(g, 0, 0, W, H, '#120c1e');
  for (const q of order) {
    const act = q === season; px.poly(g, quads[q], G.lerpCol(qc[q], '#000000', dim && !act ? .4 : .1));
    if (act) px.polyDither(g, quads[q], hl[q], .35 + Math.sin(t * 1.2) * .06);
  }
  // pattern: little grass tufts and ridges per quadrant for texture
  for (let i = 0; i < 160; i++) { const x = G.hash2(i, 7) * W, y = G.hash2(i, 13) * H, q = (x < cx ? 0 : 1) + (y < cy ? 0 : 2); const qi = [0, 1, 3, 2][q]; px.rect(g, Math.round(x), Math.round(y), 2, 1, G.lerpCol(qc[qi], '#ffffff', .12)); }
  // the clock face
  const rad = Math.min(W, H) * .13;
  px.ddisc(g, cx, cy, rad * 1.5, '#c8b068', .12);
  px.ell(g, cx, cy, rad * 1.18, rad * 1.18, '#3a2a40'); px.ell(g, cx, cy, rad * 1.1, rad * 1.1, '#1e1630'); px.ell(g, cx, cy, rad, rad, '#2a2040');
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 - Math.PI / 2, r0 = rad * (i % 3 ? .85 : .75); px.line(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * rad * .98, cy + Math.sin(a) * rad * .98, '#c8a860', 1); }
  const ha = t * .05; px.line(g, cx, cy, cx + Math.cos(ha) * rad * .5, cy + Math.sin(ha) * rad * .5, '#8a7a50', 1);
  // season spokes
  const sx = [[cx / 2, cy / 2], [cx * 1.5, cy / 2], [cx * 1.5, cy * 1.5], [cx / 2, cy * 1.5]];
  px.line(g, cx, 0, cx, H, '#00000044', 1); px.line(g, 0, cy, W, cy, '#00000044', 1);
};

/* the spell effect painter: a burst of motes in an element's colour */
G.fxs = [];
G.fxAdd = (x, y, kind, col, life = .6, extra = {}) => G.fxs.push(Object.assign({ x, y, kind, col, t: 0, life }, extra));
G.fxUpdate = dt => { for (const f of G.fxs) f.t += dt; G.fxs = G.fxs.filter(f => f.t < f.life); };
G.fxDraw = g => {
  for (const f of G.fxs) {
    const u = f.t / f.life;
    if (f.kind === 'burst') { for (let i = 0; i < 10; i++) { const a = i * .628 + f.x, d = u * (f.r || 18); px.rect(g, Math.round(f.x + Math.cos(a) * d), Math.round(f.y + Math.sin(a) * d * .7 - u * 4), 2, 2, i % 2 ? f.col : '#fff'); } px.ddisc(g, f.x, f.y, (1 - u) * (f.r || 18) * .8, f.col, (1 - u) * .6); }
    else if (f.kind === 'ring') { const r = u * (f.r || 20); for (let i = 0; i < 18; i++) { const a = i * .349; px.dot(g, Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r * .55), f.col); } }
    else if (f.kind === 'rise') { for (let i = 0; i < 6; i++) px.rect(g, Math.round(f.x + (i - 3) * 3), Math.round(f.y - u * 20 - i * 2), 1, 3, f.col); }
    else if (f.kind === 'text') { G.T(g, f.text, f.x - G.TW(f.text) / 2, f.y - u * 14 - 6, f.col, { shadow: '#000' }); }
    else if (f.kind === 'bolt') { const x = f.x + (f.tx - f.x) * Math.min(1, u * 1.6), y = f.y + (f.ty - f.y) * Math.min(1, u * 1.6); px.ddisc(g, x, y, 5, f.col, .8); px.disc(g, x, y, 2, '#fff'); }
  }
};
