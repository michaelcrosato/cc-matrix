/* DENSHA DE HALO! · world art: line-side things, stations, the parametric town, landmarks, trains as strips.
 * Every drawer gets (g, sx, sy, k, C): (sx, sy) the base on screen, k pixels per metre, C the frame (tint, time, night).
 * Each picks a level of detail from k: a dot or nothing far away, a 2-3 tone silhouette, then full detail. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px;
const A = DH.ART = DH.ART || {};
const T = (C, hex, em) => C.tint(hex, C.d || 0, em);
const R = Math.round;
const box = (g, x, y, w, h, c) => px.rect(g, R(x), R(y), Math.max(1, R(w)), Math.max(1, R(h)), c);
const glow = (g, x, y, r, c, a = .5) => px.blend(g, a, 'add', () => px.disc(g, x, y, r, c));
const txt = (g, s, x, y, c, sc = 1) => E.font.text(g, s, R(x), R(y), c, { align: 'center', scale: sc });
A.txt = txt; A.box = box; A.glow = glow;

/* ---------- signals ---------- */
// Japanese 4-lamp head, top to bottom Y G R Y. Aspects: G, YG, Y, YY, R
const LAMPS = { G: [1], YG: [0, 1], Y: [3], YY: [0, 3], R: [2] };
const LAMP_C = ['#ffb020', '#30ff90', '#ff2a20', '#ffb020'];
A.signal = (sig, x) => ({
  s: sig.s, x, y: 0, pick: { type: 'signal', sig }, pw: .5, ph: 6, far: true,
  draw(g, sx, sy, k, C) {
    const asp = sig.aspect || 'R', lit = LAMPS[asp] || [2];
    if (k < .5) {   // far away: only the lit lamps, as points of light
      const y = sy - 5 * k;
      for (const i of lit) { const ly = y - (1.6 - i * .4) * k; px.dot(g, sx, ly, LAMP_C[i]); glow(g, sx, ly, 2 + C.night * 2, LAMP_C[i], .35 + (sig.fogBoost || 0)); }
      return;
    }
    const pole = T(C, '#8a8a92'), dark = T(C, '#1a1a20');
    box(g, sx - .08 * k, sy - 4.2 * k, Math.max(1, .16 * k), 4.2 * k, pole);
    if (sig.look === 'shunt' || sig.kind === 'shunt') {   // a small position-light head
      box(g, sx - .35 * k, sy - 2.6 * k, .7 * k, .7 * k, dark);
      const on = asp !== 'R';
      px.disc(g, sx - .15 * k, sy - 2.3 * k, Math.max(1, .1 * k), on ? '#fff8e0' : T(C, '#4a4a4a'));
      px.disc(g, sx + .15 * k, sy - (on ? 2.5 : 2.3) * k, Math.max(1, .1 * k), on ? '#fff8e0' : '#ff3020');
      return;
    }
    const hw = .26 * k, top = sy - 6 * k, hh = 1.8 * k;
    box(g, sx - hw - 1, top - 1, hw * 2 + 2, hh + 2, T(C, '#3a3a40'));
    box(g, sx - hw, top, hw * 2, hh, dark);
    if (k > 3) box(g, sx - hw * 1.6, top - .12 * k, hw * 3.2, .14 * k, dark);   // the hood line
    for (let i = 0; i < 4; i++) {
      const ly = top + (.25 + i * .43) * k, on = lit.includes(i), r = Math.max(1, .15 * k);
      px.disc(g, sx, ly, r, on ? LAMP_C[i] : T(C, '#2a2a30'));
      if (on) { glow(g, sx, ly, r * 2.6 + 1 + (sig.fogBoost || 0) * 3, LAMP_C[i], .4 + C.night * .2); if (k > 4) px.dot(g, sx - r * .3, ly - r * .3, '#ffffff'); }
    }
    if (k > 5) txt(g, sig.id, sx, sy - 3.4 * k, T(C, '#e8e8e8'));
  }
});
A.beacon = (s, x) => ({ s, x, y: 0, draw(g, sx, sy, k, C) { if (k < 2) return; box(g, sx - .25 * k, sy - .12 * k, .5 * k, .12 * k, T(C, '#e8c020')); box(g, sx - .25 * k, sy - .12 * k, .5 * k, Math.max(1, .03 * k), T(C, '#fff088')); } });

/* ---------- boards ---------- */
const post = (g, sx, sy, k, C, h) => box(g, sx - .05 * k, sy - h * k, Math.max(1, .1 * k), h * k, T(C, '#c8c8c8'));
const board = (g, sx, sy, k, C, w, h, top, bg, fg, label, sc) => {
  post(g, sx, sy, k, C, top);
  const y = sy - top * k - h * k;
  box(g, sx - w * k / 2 - 1, y - 1, w * k + 2, h * k + 2, T(C, '#202020'));
  box(g, sx - w * k / 2, y, w * k, h * k, T(C, bg));
  if (k > 6 && label) { const s2 = Math.max(1, Math.min(4, Math.floor(k / 9))); txt(g, label, sx, y + h * k / 2 - 3 * s2, T(C, fg), s2); }
  else if (k > 2 && label) box(g, sx - w * k / 4, y + h * k * .35, w * k / 2, h * k * .3, T(C, fg));
};
A.limitBoard = (s, x, v, end) => ({ s, x, y: 0, pick: { type: 'limit', v, end }, pw: .5, ph: 3.2, draw(g, sx, sy, k, C) {
  if (k < .6) return;
  if (end) { board(g, sx, sy, k, C, .55, .55, 2.2, '#f0d020', '#101010', 'END'); return; }
  board(g, sx, sy, k, C, .7, .7, 2.2, '#f4f4f0', '#101010', String(v));
} });
A.slowBoard = (s, x, v, end) => ({ s, x, y: 0, draw(g, sx, sy, k, C) { if (k < .6) return; board(g, sx, sy, k, C, .7, .7, 1.6, end ? '#f4f4f0' : '#f0d020', '#101010', end ? 'END' : String(v)); } });
A.hornBoard = (s, x) => ({ s, x, y: 0, pick: { type: 'horn' }, pw: .5, ph: 3, draw(g, sx, sy, k, C) {
  if (k < .6) return;
  board(g, sx, sy, k, C, .6, .6, 2, '#f4f4f0', '#101010', k > 10 ? 'HORN' : '');
  if (k > 3 && k <= 10) { const y = sy - 2.3 * k; box(g, sx - .15 * k, y, .1 * k, .1 * k, T(C, '#101010')); box(g, sx - .05 * k, y - .05 * k, .2 * k, .2 * k, T(C, '#101010')); }
} });
A.stopBoard = (s, x, pass) => ({ s, x, y: 0, pick: { type: pass ? 'pass' : 'approach' }, pw: .6, ph: 3, draw(g, sx, sy, k, C) {
  if (k < .6) return; board(g, sx, sy, k, C, 1, .55, 2, pass ? '#2a8a3a' : '#f4f4f0', pass ? '#ffffff' : '#c01818', pass ? 'PASS' : 'STOP');
} });
A.stopMarker = (s, x, n) => ({ s, x, y: 0, draw(g, sx, sy, k, C) {
  if (k < .8) return;
  const top = .9, w = .45, h = .55;
  box(g, sx - .03 * k, sy - top * k, Math.max(1, .06 * k), top * k, T(C, '#303030'));
  const y = sy - (top + h) * k;
  box(g, sx - w * k / 2, y, w * k, h * k, T(C, '#f0c818'));
  if (k > 8) { const s2 = Math.max(1, Math.floor(k / 12)); txt(g, String(n), sx, y + h * k / 2 - 3 * s2, T(C, '#101010'), s2); }
  else box(g, sx - .08 * k, y + .15 * k, .16 * k, .25 * k, T(C, '#101010'));
} });
A.kmPost = (s, x, km) => ({ s, x, y: 0, draw(g, sx, sy, k, C) {
  if (k < 2) return; box(g, sx - .1 * k, sy - .7 * k, .2 * k, .7 * k, T(C, '#f0f0e8'));
  if (k > 14) txt(g, km, sx, sy - .55 * k, T(C, '#202020'));
} });
A.emitter = (s, x, ev) => ({ s, x, y: 0, draw(g, sx, sy, k, C) {
  if (k < .3) return;
  const on = ev.flashing && Math.floor(C.t * 4) % 2 === 0;
  if (k < 1.2) { if (on) { px.dot(g, sx, sy - 3 * k, '#ff2010'); glow(g, sx, sy - 3 * k, 3, '#ff2010', .5); } return; }
  post(g, sx, sy, k, C, 2.4);
  const cyy = sy - 3 * k, r = .5 * k;
  px.disc(g, sx, cyy, r + 1, T(C, '#202024'));
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2, lx = sx + Math.cos(a) * r * .6, ly = cyy + Math.sin(a) * r * .6, c = on && (i + Math.floor(C.t * 8)) % 2 === 0 ? '#ff2010' : on ? '#c01008' : T(C, '#4a1a18'); px.disc(g, lx, ly, Math.max(1, r * .22), c); }
  if (on) glow(g, sx, cyy, r * 2.5, '#ff2010', .45);
} });

/* ---------- catenary masts and poles ---------- */
A.mast = (s, x, span, kind) => ({ s, x, y: 0, draw(g, sx, sy, k, C) {
  if (k < .35) return;
  const h = 6.6 * k, col = T(C, kind === 'lattice' ? '#7a8088' : '#a8a8a0'), dk = T(C, '#4a4e56');
  const w = Math.max(1, (kind === 'lattice' ? .35 : .28) * k);
  box(g, sx - w / 2, sy - h, w, h, col);
  if (kind === 'lattice' && k > 4) for (let y = 0; y < 6.4; y += .6) px.line(g, sx - w / 2, sy - y * k, sx + w / 2, sy - (y + .6) * k, dk);
  const arm = span * k * (C.dir > 0 ? 1 : -1);
  box(g, Math.min(sx, sx + arm), sy - 6.1 * k, Math.abs(arm), Math.max(1, .14 * k), col);
  box(g, Math.min(sx, sx + arm), sy - 6.6 * k, Math.abs(arm), Math.max(1, .1 * k), dk);
} });
A.pole = (s, x) => ({ s, x, y: 0, draw(g, sx, sy, k, C) {
  if (k < .3) return;
  box(g, sx - .12 * k, sy - 8 * k, Math.max(1, .24 * k), 8 * k, T(C, '#6a6460'));
  box(g, sx - .7 * k, sy - 7.5 * k, 1.4 * k, Math.max(1, .1 * k), T(C, '#4a4440'));
  if (k > 3) { box(g, sx - .2 * k, sy - 6.5 * k, .4 * k, .5 * k, T(C, '#5a5a5a')); }
} });

/* ---------- vegetation and props ---------- */
const TREES = {
  tree: ['#2f6a2a', '#3f8a35', '#57a845', '#5a3a22'], pine: ['#1f4a2a', '#2a6038', '#3a7a48', '#4a3020'], cedar: ['#1a3a22', '#244a2c', '#30603a', '#3a2818'],
  sakura: ['#d87a9a', '#f0a0bc', '#ffd0e0', '#4a2a22'], ginkgo: ['#c8a020', '#e8c030', '#ffe060', '#4a3020'], maple: ['#a8301a', '#d04a2a', '#f07a40', '#4a2a1a'],
  willow: ['#4a7a3a', '#6a9a48', '#8aba5a', '#4a3a22'], bamboo: ['#4a8a3a', '#6aaa48', '#8aca60', '#5a7a30']
};
A.tree = (s, x, kind = 'tree', size = 1, seed = 0) => ({ s, x, y: 0, far: true, draw(g, sx, sy, k, C) {
  const c = TREES[kind] || TREES.tree, h = (kind === 'pine' || kind === 'cedar' ? 9 : 7) * size * k, w = (kind === 'pine' || kind === 'cedar' ? 2.2 : 3.4) * size * k;
  if (h < 1.5) { if (h > .6) px.dot(g, sx, sy - 1, T(C, c[1])); return; }
  box(g, sx - Math.max(1, .15 * size * k), sy - h * .35, Math.max(1, .3 * size * k), h * .35, T(C, c[3]));
  if (kind === 'pine' || kind === 'cedar') {
    for (let i = 0; i < 3; i++) { const y = sy - h * (.25 + i * .25), ww = w * (1 - i * .25); px.poly(g, [[sx - ww / 2, y], [sx + ww / 2, y], [sx, y - h * .4]], T(C, c[i % 3])); }
  } else if (kind === 'bamboo') {
    for (let i = -2; i <= 2; i++) { box(g, sx + i * w * .15, sy - h, Math.max(1, .08 * k), h, T(C, c[3])); px.ell(g, sx + i * w * .15, sy - h * .9, w * .18, h * .25, T(C, c[(i + 3) % 3])); }
  } else {
    px.ell(g, sx, sy - h * .62, w * .5, h * .38, T(C, c[0]));
    px.ell(g, sx - w * .12, sy - h * .7, w * .38, h * .28, T(C, c[1]));
    if (k > 1.2) px.ell(g, sx - w * .2, sy - h * .8, w * .2, h * .14, T(C, c[2]));
    if (kind === 'sakura' && k > 2) for (let i = 0; i < 6; i++) { const t2 = (C.t * .4 + i * .17 + seed) % 1; px.dot(g, sx + Math.sin(i * 7 + C.t) * w * .6, sy - h * .5 + t2 * h * .55, '#ffd8e8'); }
  }
} });
A.bush = (s, x, col = '#3a7a35') => ({ s, x, y: 0, draw(g, sx, sy, k, C) { if (k < .8) return; px.ell(g, sx, sy - .5 * k, .9 * k, .55 * k, T(C, col)); if (k > 3) px.ell(g, sx - .2 * k, sy - .7 * k, .5 * k, .3 * k, T(C, E.shade(col, .25))); } });
A.flowers = (s, x, cols) => ({ s, x, y: 0, draw(g, sx, sy, k, C) {
  if (k < .6) return; const w = 4 * k;
  for (let i = 0; i < 3; i++) box(g, sx - w / 2, sy - (i * .3 + .3) * k, w, Math.max(1, .25 * k), T(C, cols[i % cols.length]));
} });
A.lamp = (s, x) => ({ s, x, y: 0, draw(g, sx, sy, k, C) {
  if (k < .4) return; box(g, sx - .06 * k, sy - 4.5 * k, Math.max(1, .12 * k), 4.5 * k, T(C, '#5a5a62'));
  box(g, sx - .35 * k, sy - 4.6 * k, .5 * k, .18 * k, T(C, '#5a5a62'));
  const on = C.night > .3; box(g, sx - .3 * k, sy - 4.45 * k, .4 * k, Math.max(1, .08 * k), on ? '#fff0c0' : T(C, '#c8c8c0'));
  if (on) glow(g, sx - .1 * k, sy - 4.4 * k, 1.2 * k + 2, '#ffe0a0', .35);
} });
A.vending = (s, x, col) => ({ s, x, y: 1.1, draw(g, sx, sy, k, C) {
  if (k < 1) return; const w = .9 * k, h = 1.85 * k;
  box(g, sx - w / 2, sy - h, w, h, T(C, col));
  const lit = C.night > .2 ? '#e8f4ff' : T(C, '#d8e8f0');
  box(g, sx - w * .4, sy - h * .9, w * .8, h * .42, lit);
  if (k > 6) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(g, sx - w * .35 + i * w * .19, sy - h * .86 + j * h * .13, w * .1, h * .08, ['#e04040', '#40a0e0', '#f0c020', '#40c060'][(i + j) % 4]);
  box(g, sx - w * .3, sy - h * .3, w * .6, h * .12, T(C, '#202020'));
} });
A.bench = (s, x) => ({ s, x, y: 1.1, draw(g, sx, sy, k, C) { if (k < 1.5) return; box(g, sx - .9 * k, sy - .45 * k, 1.8 * k, .1 * k, T(C, '#3a7ac0')); box(g, sx - .9 * k, sy - .8 * k, 1.8 * k, .3 * k, T(C, '#4a8ad0')); box(g, sx - .8 * k, sy - .45 * k, .08 * k, .45 * k, T(C, '#505058')); box(g, sx + .72 * k, sy - .45 * k, .08 * k, .45 * k, T(C, '#505058')); } });
A.bin = (s, x) => ({ s, x, y: 1.1, draw(g, sx, sy, k, C) { if (k < 2) return; ['#3a8a3a', '#3a5ac0', '#c0a020'].forEach((c, i) => box(g, sx + (i - 1.5) * .42 * k, sy - .9 * k, .38 * k, .9 * k, T(C, c))); } });
A.column = (s, x, h) => ({ s, x, y: 1.1, draw(g, sx, sy, k, C) { if (k < .5) return; box(g, sx - .12 * k, sy - h * k, Math.max(1, .24 * k), h * k, T(C, '#9a9aa0')); if (k > 3) box(g, sx - .12 * k, sy - h * k, Math.max(1, .08 * k), h * k, T(C, '#c0c0c8')); } });
A.nameBoard = (s, x, st) => ({ s, x, y: 1.1, draw(g, sx, sy, k, C) {
  if (k < .8) return; const w = 2.6 * k, h = .9 * k, y = sy - 2.6 * k;
  box(g, sx - .04 * k, y + h, Math.max(1, .08 * k), 1.7 * k, T(C, '#5a5a60'));
  box(g, sx - w / 2 - 1, y - 1, w + 2, h + 2, T(C, '#303038'));
  box(g, sx - w / 2, y, w, h, C.night > .3 ? '#f4f4ee' : T(C, '#f4f4ee'));
  box(g, sx - w / 2, y + h * .78, w, h * .12, T(C, DH.COL.gold));
  if (k > 7) {
    const s2 = k > 26 ? 2 : 1;
    txt(g, st.name, sx, y + h * .12, '#101018', s2);
    if (k > 30) txt(g, st.en.toUpperCase(), sx, y + h * .12 + 9 * s2, '#5a5a6a');
    if (k > 20 && st.prev && st.next) { E.font.text(g, '< ' + st.prev, R(sx - w / 2 + 2), R(y + h * .6), '#3a3a48'); E.font.text(g, st.next + ' >', R(sx + w / 2 - 2), R(y + h * .6), '#3a3a48', { align: 'right' }); }
  } else box(g, sx - w * .35, y + h * .25, w * .7, h * .25, T(C, '#303040'));
} });
A.ledBoard = (s, x, st) => ({ s, x, y: 3.2, draw(g, sx, sy, k, C) {
  if (k < 1.5) return; const w = 2.2 * k, h = .6 * k;
  box(g, sx - w / 2, sy - h, w, h, T(C, '#101014'));
  if (k > 10) { E.font.text(g, (st.ledText || 'LOCAL  ' + st.name), R(sx - w / 2 + 2), R(sy - h + 2), '#ffa020'); }
  else box(g, sx - w * .4, sy - h * .7, w * .8, Math.max(1, h * .25), '#c07018');
} });
A.clock = (s, x) => ({ s, x, y: 3.4, draw(g, sx, sy, k, C) {
  if (k < 2) return; const r = .3 * k; px.disc(g, sx, sy, r + 1, T(C, '#303030')); px.disc(g, sx, sy, r, T(C, '#f4f4f0'));
  if (k > 8) { const tm = (DH.clockNow || 0), a1 = (tm / 3600 % 12) / 12 * Math.PI * 2 - Math.PI / 2, a2 = (tm / 60 % 60) / 60 * Math.PI * 2 - Math.PI / 2; px.line(g, sx, sy, sx + Math.cos(a1) * r * .5, sy + Math.sin(a1) * r * .5, '#101010'); px.line(g, sx, sy, sx + Math.cos(a2) * r * .8, sy + Math.sin(a2) * r * .8, '#101010'); }
} });
A.poster = (s, x) => ({ s, x, y: 1.6, draw(g, sx, sy, k, C) {
  if (k < 2) return; const w = .9 * k, h = 1.2 * k;
  box(g, sx - w / 2, sy - h, w, h, T(C, '#3aa0e0')); px.disc(g, sx, sy - h * .55, w * .3, T(C, '#fff8f0'));
  if (k > 5) { px.disc(g, sx - w * .1, sy - h * .58, Math.max(1, w * .05), '#202020'); px.disc(g, sx + w * .1, sy - h * .58, Math.max(1, w * .05), '#202020'); px.line(g, sx - w * .25, sy - h * .9, sx + w * .25, sy - h * .9, DH.COL.gold); }
} });

/* ---------- level crossings ---------- */
A.crossing = (cr, x, side) => ({ s: cr.s, x, y: 0, pick: { type: 'crossing', cr }, pw: 1.5, ph: 3.5, far: true, draw(g, sx, sy, k, C) {
  const on = cr.warn, blink = Math.floor(C.t * 2.5) % 2;
  if (k < .5) { if (on) { px.dot(g, sx, sy - 2.5 * k, '#ff3020'); glow(g, sx, sy - 2.5 * k, 2, '#ff3020', .4); } return; }
  const blackY = (y0, y1) => { for (let y = y0; y < y1; y += .3) box(g, sx - .06 * k, sy - (y + .3) * k, Math.max(1, .12 * k), .15 * k, T(C, (Math.round(y / .3) % 2) ? '#f0d020' : '#101010')); };
  box(g, sx - .06 * k, sy - 3.2 * k, Math.max(1, .12 * k), 3.2 * k, T(C, '#f0d020')); blackY(0, 1.5);
  // crossbuck
  if (k > 1.5) { px.line(g, sx - .5 * k, sy - 3.4 * k, sx + .5 * k, sy - 2.8 * k, T(C, '#f0d020'), Math.max(1, R(.12 * k))); px.line(g, sx - .5 * k, sy - 2.8 * k, sx + .5 * k, sy - 3.4 * k, T(C, '#f0d020'), Math.max(1, R(.12 * k))); }
  // lamps
  for (const [i, dx] of [[0, -.3], [1, .3]]) {
    const lit = on && (blink === i), ly = sy - 2.4 * k;
    px.disc(g, sx + dx * k, ly, Math.max(1, .14 * k), lit ? '#ff3020' : T(C, '#401010'));
    if (lit) glow(g, sx + dx * k, ly, .5 * k + 2, '#ff3020', .5);
  }
  // the gate arm (tweened by the crossing's state)
  const a = (cr.gate || 0) * Math.PI / 2, len = (cr.road || 6) * .55 * k, dir = (side > 0 ? -1 : 1) * (C.dir > 0 ? 1 : -1);
  const ex = sx + Math.cos(Math.PI / 2 - a) * len * dir * 0 + Math.sin(a) * len * dir, ey = sy - 1.1 * k - Math.cos(a) * len;
  for (let i = 0; i < 6; i++) { const u0 = i / 6, u1 = (i + 1) / 6; px.line(g, sx + (ex - sx) * u0, sy - 1.1 * k + (ey - sy + 1.1 * k) * u0, sx + (ex - sx) * u1, sy - 1.1 * k + (ey - sy + 1.1 * k) * u1, T(C, i % 2 ? '#101010' : '#f0d020'), Math.max(1, R(.1 * k))); }
} });
A.keiCar = (s, x, col, ev) => ({ s, x, y: 0, draw(g, sx, sy, k, C) {
  if (ev && ev.hidden) return; if (k < .6) return;
  const w = 1.5 * k, h = 1.6 * k;
  box(g, sx - w / 2, sy - h * .55, w, h * .45, T(C, col)); box(g, sx - w * .4, sy - h, w * .8, h * .5, T(C, col));
  box(g, sx - w * .35, sy - h * .92, w * .7, h * .3, T(C, '#a8c8e0'));
  box(g, sx - w * .45, sy - h * .12, w * .2, h * .12, T(C, '#101010')); box(g, sx + w * .25, sy - h * .12, w * .2, h * .12, T(C, '#101010'));
  if (C.night > .3) { glow(g, sx - w * .35, sy - h * .35, 3, '#fff0c0', .5); glow(g, sx + w * .35, sy - h * .35, 3, '#fff0c0', .5); }
} });
A.cart = (s, x, ev) => ({ s, x, y: 0, draw(g, sx, sy, k, C) {
  if (!ev.active || k < .5) return;   // the festival's takoyaki cart, stuck on the crossing
  const w = 2.2 * k, h = 2.1 * k;
  box(g, sx - w / 2, sy - h * .6, w, h * .45, T(C, '#c04020'));
  box(g, sx - w / 2, sy - h, w, h * .12, T(C, '#f0f0e0')); for (let i = 0; i < 5; i++) box(g, sx - w / 2 + i * w / 5, sy - h, w / 10, h * .12, T(C, '#d02020'));
  box(g, sx - w * .45, sy - h * .88, Math.max(1, .06 * k), h * .3, T(C, '#5a3a20')); box(g, sx + w * .42, sy - h * .88, Math.max(1, .06 * k), h * .3, T(C, '#5a3a20'));
  px.disc(g, sx - w * .3, sy - h * .1, h * .12, T(C, '#202020')); px.disc(g, sx + w * .3, sy - h * .1, h * .12, T(C, '#202020'));
  if (k > 6) txt(g, 'TAKOYAKI', sx, sy - h * .52, '#fff0c0');
  for (let i = 0; i < 3; i++) box(g, sx - w * .4 + i * w * .3, sy - h * .76, w * .2, h * .1, T(C, '#ffd040'));
} });

/* ---------- landmarks (hand-drawn, one each) ---------- */
const L = A.LANDMARK = {};
L.terminal = (g, sx, sy, k, C) => {
  const w = 40 * k, h = 14 * k; box(g, sx - w / 2, sy - h, w, h, T(C, '#c8a882')); box(g, sx - w / 2, sy - h - 1.5 * k, w, 1.5 * k, T(C, '#7a5a3a'));
  for (let i = 0; i < 12; i++) box(g, sx - w / 2 + (i + .3) * w / 12, sy - h * .8, w / 24, h * .45, C.night > .3 ? '#ffd890' : T(C, '#3a4a6a'));
  const tw = 5 * k, th = 30 * k; box(g, sx - tw / 2, sy - th, tw, th - h, T(C, '#b89872')); px.poly(g, [[sx - tw * .7, sy - th], [sx + tw * .7, sy - th], [sx, sy - th - 5 * k]], T(C, '#4a6a5a'));
  px.disc(g, sx, sy - th + 3 * k, 1.6 * k, T(C, '#f4f0e0'));
  if (k > 1) { const tm = DH.clockNow || 0, a2 = (tm / 60 % 60) / 60 * Math.PI * 2 - Math.PI / 2; px.line(g, sx, sy - th + 3 * k, sx + Math.cos(a2) * 1.3 * k, sy - th + 3 * k + Math.sin(a2) * 1.3 * k, '#202020'); }
};
L.greenhouse = (g, sx, sy, k, C) => { for (let i = 0; i < 3; i++) { const x = sx + (i - 1) * 9 * k; box(g, x - 4 * k, sy - 2.5 * k, 8 * k, 2.5 * k, T(C, '#b8d8d0')); px.poly(g, [[x - 4 * k, sy - 2.5 * k], [x + 4 * k, sy - 2.5 * k], [x, sy - 4.2 * k]], T(C, '#d0ece8')); if (k > 1) for (let j = 0; j < 4; j++) box(g, x - 4 * k + j * 2 * k, sy - 2.5 * k, 1, 2.5 * k, T(C, '#7a9a90')); } };
L.whale = (g, sx, sy, k, C) => {   // the whale-back steel arch over the river
  const w = 80 * k, h = 22 * k, col = T(C, '#4a8ac8'), dk = T(C, '#2a5a90');
  for (let i = 0; i <= 40; i++) { const u = i / 40, x = sx - w / 2 + u * w, y = sy - Math.sin(u * Math.PI) * h; box(g, x, y, Math.max(2, 2.5 * k), 1.5 * k, col); if (i % 4 === 0) box(g, x, y, Math.max(1, .4 * k), sy - y, dk); }
  if (k > .4) px.ell(g, sx + w * .2, sy - h * 1.05, 2 * k, 1.2 * k, T(C, '#e8f0ff'));
};
L.cranes = (g, sx, sy, k, C) => { for (let i = 0; i < 3; i++) { const x = sx + (i - 1) * 22 * k, c = T(C, ['#e05a2a', '#e0a020', '#3a8ac8'][i]); box(g, x - 3 * k, sy - 30 * k, 1.2 * k, 30 * k, c); box(g, x + 3 * k, sy - 30 * k, 1.2 * k, 30 * k, c); box(g, x - 14 * k, sy - 32 * k, 30 * k, 2 * k, c); box(g, x - 2 * k, sy - 28 * k, 6 * k, 3 * k, T(C, '#e8e8e8')); px.line(g, x + 12 * k, sy - 30 * k, x + 12 * k, sy - 18 * k, T(C, '#303030')); } };
L.ferry = (g, sx, sy, k, C) => { const w = 34 * k; px.poly(g, [[sx - w / 2, sy - 3 * k], [sx + w / 2, sy - 3 * k], [sx + w * .42, sy], [sx - w * .45, sy]], T(C, '#f0f0f0')); box(g, sx - w * .3, sy - 7 * k, w * .5, 4 * k, T(C, '#e8e8e8')); box(g, sx - w * .3, sy - 5.5 * k, w * .5, 1 * k, T(C, '#3aa0e0')); box(g, sx, sy - 10 * k, 2.5 * k, 3 * k, T(C, '#d04030')); if (C.night > .3) for (let i = 0; i < 8; i++) px.dot(g, sx - w * .28 + i * w * .06, sy - 6.5 * k, '#ffe090'); };
L.lighthouse = (g, sx, sy, k, C) => {
  const h = 26 * k; px.poly(g, [[sx - 2.5 * k, sy], [sx + 2.5 * k, sy], [sx + 1.6 * k, sy - h], [sx - 1.6 * k, sy - h]], T(C, '#f4f4f0'));
  for (let i = 1; i < 4; i++) box(g, sx - (2.4 - i * .25) * k, sy - h * i / 4, (4.8 - i * .5) * k, 2 * k, T(C, '#d03028'));
  box(g, sx - 1.8 * k, sy - h - 3 * k, 3.6 * k, 3 * k, T(C, '#303840')); px.poly(g, [[sx - 2 * k, sy - h - 3 * k], [sx + 2 * k, sy - h - 3 * k], [sx, sy - h - 5 * k]], T(C, '#d03028'));
  if (C.night > .2) { const a = Math.sin(C.t * 1.2); glow(g, sx, sy - h - 1.5 * k, 3 * k + 3, '#fff8c0', .7); px.blend(g, .25, 'add', () => px.poly(g, [[sx, sy - h - 1.5 * k], [sx + a * 60 * k, sy - h - 6 * k], [sx + a * 60 * k, sy - h + 3 * k]], '#fff0b0')); }
};
L.pagoda = (g, sx, sy, k, C) => { for (let i = 0; i < 5; i++) { const w = (9 - i * 1.3) * k, y = sy - i * 5 * k; box(g, sx - w * .32, y - 4 * k, w * .64, 4 * k, T(C, '#a83a28')); px.poly(g, [[sx - w * .7, y - 4 * k], [sx + w * .7, y - 4 * k], [sx + w * .4, y - 5.4 * k], [sx - w * .4, y - 5.4 * k]], T(C, '#3a3a40')); } box(g, sx - .3 * k, sy - 33 * k, .6 * k, 8 * k, T(C, '#c8a040')); };
L.gate = (g, sx, sy, k, C) => { box(g, sx - 6 * k, sy - 7 * k, 1 * k, 7 * k, T(C, '#a83a28')); box(g, sx + 5 * k, sy - 7 * k, 1 * k, 7 * k, T(C, '#a83a28')); px.poly(g, [[sx - 8 * k, sy - 7 * k], [sx + 8 * k, sy - 7 * k], [sx + 6 * k, sy - 9.5 * k], [sx - 6 * k, sy - 9.5 * k]], T(C, '#3a3a40')); };
L.torii = (g, sx, sy, k, C) => { const c = T(C, '#e04a2a'); box(g, sx - 2.2 * k, sy - 5 * k, .5 * k, 5 * k, c); box(g, sx + 1.7 * k, sy - 5 * k, .5 * k, 5 * k, c); box(g, sx - 3 * k, sy - 5.4 * k, 6 * k, .6 * k, c); box(g, sx - 2.5 * k, sy - 4.4 * k, 5 * k, .35 * k, c); box(g, sx - 3.2 * k, sy - 5.8 * k, 6.4 * k, .35 * k, T(C, '#202020')); };
L.shrine = (g, sx, sy, k, C) => { box(g, sx - 2 * k, sy - 2.5 * k, 4 * k, 2.5 * k, T(C, '#8a6a4a')); px.poly(g, [[sx - 3 * k, sy - 2.5 * k], [sx + 3 * k, sy - 2.5 * k], [sx, sy - 4.2 * k]], T(C, '#3a3a40')); L.torii(g, sx + 6 * k, sy, k * .6, C); };
L.observatory = (g, sx, sy, k, C) => { box(g, sx - 6 * k, sy - 6 * k, 12 * k, 6 * k, T(C, '#d8d8d8')); px.ell(g, sx, sy - 6 * k, 6 * k, 5 * k, T(C, '#e8e8f0')); box(g, sx - 6 * k, sy - 6 * k, 12 * k, 1 * k, T(C, '#a0a0a8')); box(g, sx - .6 * k, sy - 11 * k, 1.2 * k, 4 * k, T(C, '#303040')); };
L.clocktower = (g, sx, sy, k, C) => { box(g, sx - 3 * k, sy - 22 * k, 6 * k, 22 * k, T(C, '#b85a3a')); box(g, sx - 16 * k, sy - 9 * k, 32 * k, 9 * k, T(C, '#c86a4a')); px.disc(g, sx, sy - 18 * k, 2 * k, T(C, '#f4f0e0')); px.poly(g, [[sx - 3.5 * k, sy - 22 * k], [sx + 3.5 * k, sy - 22 * k], [sx, sy - 26 * k]], T(C, '#3a5a4a')); for (let i = 0; i < 8; i++) box(g, sx - 15 * k + i * 4 * k, sy - 7 * k, 2 * k, 3 * k, C.night > .3 ? '#ffe0a0' : T(C, '#4a5a7a')); };
L.ferris = (g, sx, sy, k, C) => {   // the Akari Eye, turning
  const r = 16 * k, cyy = sy - r - 3 * k, rot = C.t * .05;
  px.line(g, sx - 6 * k, sy, sx, cyy, T(C, '#d0d0d8'), Math.max(1, R(.6 * k))); px.line(g, sx + 6 * k, sy, sx, cyy, T(C, '#d0d0d8'), Math.max(1, R(.6 * k)));
  for (let i = 0; i < 16; i++) { const a = rot + i / 16 * Math.PI * 2, x = sx + Math.cos(a) * r, y = cyy + Math.sin(a) * r; px.line(g, sx, cyy, x, y, T(C, '#b0b0c0')); box(g, x - .8 * k, y - .4 * k, 1.6 * k, 1.6 * k, C.night > .3 ? ['#ff5a8a', '#5ae0ff', '#ffd040'][i % 3] : T(C, ['#e04a6a', '#3aa0e0', '#f0c030'][i % 3])); }
  for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; px.dot(g, sx + Math.cos(a) * r, cyy + Math.sin(a) * r, C.night > .3 ? '#fff0c0' : T(C, '#d8d8e0')); }
};
L.neon = (g, sx, sy, k, C) => { box(g, sx - 6 * k, sy - 14 * k, 12 * k, 14 * k, T(C, '#3a3048')); const n = C.night > .2; const cols = ['#ff4a9a', '#4ae0ff', '#ffe04a']; for (let i = 0; i < 3; i++) { box(g, sx - 5 * k, sy - (12 - i * 4) * k, 10 * k, 2.4 * k, n ? cols[i] : T(C, E.shade(cols[i], -.4))); if (n) glow(g, sx, sy - (11 - i * 4) * k, 6 * k, cols[i], .25); } if (k > 4) txt(g, 'GAME', sx, sy - 11.6 * k, '#101010'); };
L.dome = (g, sx, sy, k, C) => { px.ell(g, sx, sy - 4 * k, 12 * k, 8 * k, T(C, '#a8b8c8')); box(g, sx - 12 * k, sy - 4 * k, 24 * k, 4 * k, T(C, '#8898a8')); };
A.landmark = (s, x, id, scale = 1) => ({ s, x, y: 0, far: true, draw(g, sx, sy, k, C) { const f = L[id]; if (f && k * scale > .05) f(g, sx, sy, k * scale, C); } });

/* ---------- strips: faces as drawers ---------- */
const S = A.STRIP = {};
const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
/** a flat face with a pattern repeated in world metres: windows on a facade */
S.facade = (base, o = {}) => (g, F, C, st) => {
  const d = F.df || F.d;
  C.fill(F.pts, C.tint(base, d, false));
  if (F.k < (o.minK || 1.1)) return;
  const night = C.night > .35, wcol = o.win || '#3a4a6a', u0 = Math.min(F.u0, F.u1), u1 = Math.max(F.u0, F.u1);
  const pitch = o.pitch || 3, floors = o.floor || 3;
  if (F.kind === 'side') {
    for (let u = Math.ceil(u0 / pitch) * pitch; u < u1; u += pitch) {
      for (let v = (o.v0 || 1); v + 1.2 < F.v1; v += floors) {
        const hsh = ((u * 13 + v * 7 + (st.seed || 0)) | 0) % 7, lit = night && hsh < (o.litN || 4);
        const p1 = F.at(u + .4, v), p2 = F.at(u + pitch * .55, v + floors * .5);
        if (Math.abs(p2[0] - p1[0]) < .8) continue;
        px.rect(g, R(Math.min(p1[0], p2[0])), R(p2[1]), Math.max(1, R(Math.abs(p2[0] - p1[0]))), Math.max(1, R(p1[1] - p2[1])), lit ? (hsh % 2 ? '#ffd890' : '#ffe8b0') : C.tint(wcol, d));
      }
    }
  } else if (F.kind === 'end') {
    const w = F.u1 - F.u0;
    for (let i = 0; i < Math.floor(w / pitch); i++) for (let v = (o.v0 || 1); v + 1.2 < F.v1; v += floors) {
      const u = F.u0 + .5 + i * pitch, hsh = ((u * 11 + v * 5 + (st.seed || 0)) | 0) % 7, lit = night && hsh < (o.litN || 4);
      const p1 = F.at(u, v), p2 = F.at(u + pitch * .5, v + floors * .5);
      px.rect(g, R(Math.min(p1[0], p2[0])), R(p2[1]), Math.max(1, R(Math.abs(p2[0] - p1[0]))), Math.max(1, R(p1[1] - p2[1])), lit ? '#ffe0a0' : C.tint(wcol, d));
    }
  }
};
/** a platform's top: concrete, white edge lines and the yellow tactile strip */
S.platformTop = edges => (g, F, C) => {
  const d = F.df || F.d; C.fill(F.pts, C.tint(C.wet ? '#8a8a90' : '#b4b0a8', d));
  if (F.k < .4) return;
  for (const e of edges) {
    const ev = C.dir > 0 ? e.x : -e.x, inward = C.dir > 0 ? e.in : -e.in;
    const a = F.at(F.u0, ev), b = F.at(F.u1, ev), c1 = F.at(F.u0, ev + inward * .12), c2 = F.at(F.u1, ev + inward * .12);
    C.fill([a, b, c2, c1], C.tint('#f4f4f0', d));
    const t0 = ev + inward * .75, t1 = ev + inward * .95;
    C.fill([F.at(F.u0, t0), F.at(F.u1, t0), F.at(F.u1, t1), F.at(F.u0, t1)], C.tint('#f0c818', d));
  }
  if (C.wet && F.k > 3) { const p = F.at((F.u0 + F.u1) / 2, (F.v0 + F.v1) / 2); px.blend(g, .4, 'add', () => px.ell(g, p[0], p[1], 6 * F.k / 8, 1, '#a8c8e8')); }
};
S.truss = col => (g, F, C) => {
  if (F.kind !== 'side') return;
  const d = F.df || F.d, c = C.tint(col, d), w = Math.max(1, R(F.k * .25));
  const a0 = F.at(F.u0, F.v0), a1 = F.at(F.u0, F.v1), b0 = F.at(F.u1, F.v0), b1 = F.at(F.u1, F.v1);
  px.line(g, a0[0], a0[1], b0[0], b0[1], c, w); px.line(g, a1[0], a1[1], b1[0], b1[1], c, w);
  px.line(g, a0[0], a0[1], a1[0], a1[1], c, w);
  if ((Math.floor(F.u0 / 5) % 2) === 0) px.line(g, a0[0], a0[1], b1[0], b1[1], c, w); else px.line(g, a1[0], a1[1], b0[0], b0[1], c, w);
};
S.wall = (base, line) => (g, F, C) => {
  const d = F.df || F.d; C.fill(F.pts, C.tint(base, d));
  if (line && F.k > 1.5 && F.kind === 'side') { const a = F.at(F.u0, F.v1 - .15), b = F.at(F.u1, F.v1 - .15); px.line(g, a[0], a[1], b[0], b[1], C.tint(line, d)); }
};
S.tunnelWall = (g, F, C) => {
  const d = F.df || F.d; C.fill(F.pts, C.tint('#5a5650', d));
  if (F.kind === 'side' && F.k > 1) {
    const a = F.at(F.u0, 1), b = F.at(F.u1, 1); px.line(g, a[0], a[1], b[0], b[1], C.tint('#3a3630', d));
    if ((Math.floor(F.u0 / 5) % 5) === 0) { const p = F.at(F.u0, 3.5); px.disc(g, p[0], p[1], Math.max(1, F.k * .15), '#ffe8b0'); px.blend(g, .35, 'add', () => px.disc(g, p[0], p[1], Math.max(2, F.k * .5), '#ffd890')); }
  }
};
S.portal = (g, F, C) => {
  const d = F.d; C.fill(F.pts, C.tint('#8a847a', d));
  if (F.k > 1.5) { const a = F.at(F.u0, F.v0 + .3), b = F.at(F.u1, F.v0 + .3); px.line(g, a[0], a[1], b[0], b[1], C.tint('#6a645a', d)); }
};
S.hillTop = (g, F, C) => C.fill(F.pts, C.tint('#4a7a3a', F.df || F.d));
S.fence = (g, F, C) => {
  if (F.kind !== 'side') return; const d = F.df || F.d, c = C.tint('#8a9098', d);
  const a = F.at(F.u0, F.v1), b = F.at(F.u1, F.v1), a0 = F.at(F.u0, F.v0), b0 = F.at(F.u1, F.v0);
  px.line(g, a[0], a[1], b[0], b[1], c); px.line(g, a0[0], (a0[1] + a[1]) / 2, b0[0], (b0[1] + b[1]) / 2, c);
  if (F.k > 1) px.line(g, a0[0], a0[1], a[0], a[1], c);
};
S.canopyUnder = (g, F, C) => { const d = F.df || F.d; C.fill(F.pts, C.tint('#c8c4bc', d)); if (C.night > .3 && F.k > .8) { const p = F.at(0, 0); const m = lerp2(lerp2(F.pts[0], F.pts[1], .5), lerp2(F.pts[3], F.pts[2], .5), .5); px.rect(g, R(m[0] - F.k * .6), R(m[1]), Math.max(1, R(F.k * 1.2)), 1, '#fff8e0'); px.blend(g, .3, 'add', () => px.disc(g, m[0], m[1] + 2, F.k * .8, '#fff0c0')); } };
S.overpassSide = (g, F, C) => { const d = F.df || F.d; C.fill(F.pts, C.tint('#9a9890', d)); };

/* ---------- trains: a formation of cars as strips, its ends as faces ---------- */
const LIVERY = {
  h8000: { body: '#d8dce4', stripe: DH.COL.gold, band: DH.COL.sky, win: '#2a3a52', roof: '#9a9ea8', skirt: '#3a3c44', face: '#e8ecf4', mask: '#1a2230' },
  h3000: { body: '#efe4c8', stripe: '#e8742a', band: '#e8742a', win: '#2a3a4a', roof: '#8a8478', skirt: '#3a3630', face: '#efe4c8', mask: '#2a2a2a' },
  skyliner: { body: '#d8d8e8', stripe: '#7a3ac8', band: '#4a1a8a', win: '#1a1a3a', roof: '#a0a0b0', skirt: '#2a2a3a', face: '#c8c8e0', mask: '#1a1030' },
  freight: { body: '#2a5ab8', stripe: '#e8e8e8', band: '#e8e8e8', win: '#1a2a4a', roof: '#4a4a52', skirt: '#2a2a2a', face: '#2a5ab8', mask: '#1a1a1a' },
  inner: { body: '#d8dce4', stripe: DH.COL.gold, band: DH.COL.sky, win: '#2a3a52', roof: '#9a9ea8', skirt: '#3a3c44', face: '#e8ecf4', mask: '#1a2230' }
};
DH.LIVERY = LIVERY;
const carSide = (lv, kind, seatCol) => (g, F, C, st) => {
  const d = F.df || F.d, kk = F.k;
  C.fill(F.pts, C.tint(lv.body, d));
  if (kk < .5) return;
  const u0 = Math.min(F.u0, F.u1), u1 = Math.max(F.u0, F.u1);
  const band = (v0, v1, col, em) => { const a = F.at(F.u0, v0), b = F.at(F.u1, v0), c = F.at(F.u1, v1), e = F.at(F.u0, v1); C.fill([a, b, c, e], em ? col : C.tint(col, d)); };
  band(1.0, 1.25, lv.skirt);
  band(1.55, 1.75, seatCol || lv.stripe, !!seatCol);
  if (kind !== 'freight') band(3.55, 3.7, lv.band);
  if (kind === 'container') return;
  if (kk < 1.2) return;
  const night = C.night > .35, wc = night ? '#ffeec8' : C.tint(lv.win, d);
  // windows every 2.5 m, doors every 5 m (4 doors a car); u is metres from the car's own front end
  for (let u = Math.ceil(u0 / 2.5) * 2.5; u < u1; u += 2.5) {
    const local = st.car !== undefined ? ((st.u0off || 0) + u) % 20 : u % 20;
    const door = kind !== 'freight' && [2.6, 7.4, 12.6, 17.4].some(dd => Math.abs(local - dd) < 1.25);
    const a = F.at(u + .2, door ? 1.25 : 2.05), b = F.at(u + 2.3, door ? 3.35 : 3.3);
    if (Math.abs(b[0] - a[0]) < .7) continue;
    const x0 = R(Math.min(a[0], b[0])), w = Math.max(1, R(Math.abs(b[0] - a[0]))), y0 = R(b[1]), h = Math.max(1, R(a[1] - b[1]));
    if (door) {
      const open = st.doorOpen || 0;
      px.rect(g, x0, y0, w, h, C.tint('#9aa0aa', d));
      if (open > 0) px.rect(g, x0 + R(w * .5 * (1 - open)), y0, Math.max(1, R(w * open)), h, night ? '#fff0d0' : C.tint('#3a4250', d));
      else px.rect(g, x0 + R(w * .3), y0 + R(h * .1), Math.max(1, R(w * .4)), R(h * .35), wc);
    } else px.rect(g, x0, y0, w, h, wc);
  }
};
const carFront = (lv, kind, front, actor) => (g, F, C) => {
  const d = F.d, k = F.k, [a, b, c2, e] = F.pts, w = b[0] - a[0], h = a[1] - e[1];
  C.fill(F.pts, C.tint(front ? lv.face : lv.body, d));
  if (k < .4) {
    if (front && actor.lights) { px.dot(g, a[0] + w * .2, a[1] - h * .35, '#fff8e0'); px.dot(g, a[0] + w * .8, a[1] - h * .35, '#fff8e0'); }
    if (!front) { px.dot(g, a[0] + w * .2, a[1] - h * .3, '#ff2010'); px.dot(g, a[0] + w * .8, a[1] - h * .3, '#ff2010'); }
    return;
  }
  const P = (u, v) => F.at(F.u0 + (F.u1 - F.u0) * u, F.v0 + (F.v1 - F.v0) * v);
  const q = (u0, v0, u1, v1, col, em) => { const p = P(u0, v0), r2 = P(u1, v1); px.rect(g, R(Math.min(p[0], r2[0])), R(r2[1]), Math.max(1, R(Math.abs(r2[0] - p[0]))), Math.max(1, R(p[1] - r2[1])), em ? col : C.tint(col, d)); };
  q(0, 0, 1, .09, lv.skirt);
  if (kind === 'freight' && front) { q(.1, .45, .9, .82, lv.mask); q(.15, .5, .85, .78, C.night > .3 ? '#5a6a7a' : '#4a6a8a'); }
  else if (front) {
    q(.06, .48, .94, .9, lv.mask);
    q(.1, .52, .44, .86, C.night > .3 ? '#1a2a3a' : '#5a7a9a'); q(.56, .52, .9, .86, C.night > .3 ? '#1a2a3a' : '#5a7a9a');
    q(.3, .88, .7, .97, '#101010', true);
    if (k > 4) { const p = P(.32, .885); E.font.text(g, k > 9 ? (actor.dest || 'HALO LINE') : '', R(p[0]), R(p[1] - 7), '#ffa020'); if (k <= 9) q(.34, .9, .66, .95, '#ff9a20', true); }
    if (k > 2.5) { const p = P(.25, .7); px.rect(g, R(p[0] - k * .15), R(p[1] - k * .2), Math.max(1, R(k * .3)), Math.max(1, R(k * .4)), C.tint('#2a3040', d)); }   // the driver
    q(.15, .42, .85, .46, lv.stripe);
  } else { q(.08, .52, .92, .86, lv.win); q(.1, .4, .9, .44, lv.stripe); }
  // lamps
  const lampV = front ? .3 : .3;
  for (const u of [.18, .82]) {
    const p = P(u, lampV), r = Math.max(1, k * .12);
    if (front) { const on = actor.lights !== false; px.disc(g, p[0], p[1], r, on ? '#fff8e8' : C.tint('#c8c8c0', d)); if (on) glow(g, p[0], p[1], r * (actor.flash ? 7 : 3.5) + 2, '#fff4d0', actor.flash ? .75 : .45 + C.night * .2); }
    else { px.disc(g, p[0], p[1], r, '#ff2a18'); glow(g, p[0], p[1], r * 2.5 + 1, '#ff2010', .4 + C.night * .2); }
  }
  if (actor.tag && k > .25) {
    const p = P(.5, 1.2), tw = E.font.width(actor.tag) + 6;
    px.rect(g, R(p[0] - tw / 2), R(p[1] - 10), tw, 11, '#0b0d18'); px.rect(g, R(p[0] - tw / 2), R(p[1] - 10), tw, 2, actor.tagColor || '#ffffff');
    E.font.text(g, actor.tag, R(p[0]), R(p[1] - 7), actor.tagColor || '#ffffff', { align: 'center' });
  }
};
const roofTop = lv => (g, F, C) => { C.fill(F.pts, C.tint(lv.roof, F.df || F.d)); };
const CONT = ['#c84a2a', '#2a8a5a', '#e0a020', '#3a6ac8', '#8a3a8a', '#e8e8e0'];
/** a train actor: front s, the track's x at s, cars, livery, direction (+1 runs toward +s, -1 toward -s) */
class TrainActor {
  constructor(o) { Object.assign(this, { id: 'train', s: 0, v: 0, cars: 6, kind: 'h8000', dir: 1, lights: true, x: 0, xAt: null, doorOpen: 0, dest: 'HALO LINE', tag: null, len: 0 }, o); if (!this.len) this.len = this.cars * DH.CAR; this._strips = null; }
  get rear() { return this.s - this.dir * this.len; }
  strips() {
    const lv = LIVERY[this.kind] || LIVERY.h8000, out = [], x = this.xAt ? this.xAt(this.s) : this.x;
    const seatCol = this.seatColor || null;
    for (let i = 0; i < this.cars; i++) {
      const loco = this.kind === 'freight' && i === 0, cont = this.kind === 'freight' && i > 0;
      const carLen = this.kind === 'freight' ? (loco ? 18 : 16) : DH.CAR;
      const offA = this.kind === 'freight' ? (i === 0 ? 0 : 18 + (i - 1) * 16) : i * DH.CAR;
      const sFront = this.s - this.dir * (offA + .25), sBack = this.s - this.dir * (offA + carLen - .25);
      const s0 = Math.min(sFront, sBack), s1 = Math.max(sFront, sBack);
      const lvC = cont ? Object.assign({}, lv, { body: CONT[(i * 3 + (this.seed || 0)) % CONT.length] }) : lv;
      const frontFace = carFront(lvC, loco ? 'freight' : this.kind, true, this), backFace = carFront(lvC, this.kind, false, this);
      const first = i === 0, lastC = i === this.cars - 1;
      const faces = { side: carSide(lvC, cont ? 'container' : loco ? 'freight' : this.kind, seatCol), top: roofTop(lvC) };
      // the end toward +s and the one toward -s
      const plus = this.dir > 0 ? (first ? frontFace : null) : (lastC ? backFace : null), minus = this.dir > 0 ? (lastC ? backFace : null) : (first ? frontFace : null);
      if (plus) faces.end1 = plus; else faces.end1 = C2 => null;
      if (minus) faces.end0 = minus; else faces.end0 = null;
      if (!plus) faces.end1 = (g, F, C) => C.fill(F.pts, C.tint(E.shade(lvC.body, -.25), F.d));
      if (!minus) faces.end0 = (g, F, C) => C.fill(F.pts, C.tint(E.shade(lvC.body, -.25), F.d));
      const xc = this.xAt ? this.xAt((s0 + s1) / 2) : x;
      out.push({ s0, s1, x0: xc - 1.45, x1: xc + 1.45, y0: cont ? 1.0 : 1.0, y1: cont ? 3.6 : 3.9, faces, kind: 'train', car: i, u0off: 0, doorOpen: this.doorOpen, pick: this.pick || null, actor: this });
      out.push({ s0: s0 + .8, s1: s1 - .8, x0: xc - 1.3, x1: xc + 1.3, y0: .35, y1: 1.0, faces: { side: lv.skirt, end0: '#1a1a1a', end1: '#1a1a1a' }, kind: 'bogie' });
    }
    return out;
  }
}
DH.TrainActor = TrainActor;
})();
