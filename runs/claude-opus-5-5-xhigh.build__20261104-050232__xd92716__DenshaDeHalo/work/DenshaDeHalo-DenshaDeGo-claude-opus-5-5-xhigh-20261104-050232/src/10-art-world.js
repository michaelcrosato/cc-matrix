/* 10-art-world: the line's drawables in the engine's pixel style. Things draw at their base (sx, sy) with k pixels a
 * metre, every colour tinted through C.T (fog and the time of day; emissive lamps stay bright), with three levels of
 * detail by k. Strips are extrusions with face colours and patterns. Zones give the ground and the backdrop. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, Rail = E.Rail, TN = E.tones;
const Art = DH.Art = { DRAW: {}, STRIP: {} };

/* ---- a thing's drawing helper in metres: x across (+ right), y up, from the base point ---- */
const M = (g, sx, sy, k, C) => {
  const dir = C.dir || 1, X = x => sx + x * k * dir, Y = y => sy - y * k;
  const m = {
    k, g, C, X, Y,
    rect(x0, y0, x1, y1, col, em) {
      let a = X(x0), b = X(x1); if (a > b) { const t = a; a = b; b = t; }
      const ra = Math.round(a), rb = Math.max(ra + 1, Math.round(b)), ya = Math.round(Y(Math.max(y0, y1))), yb = Math.max(ya + 1, Math.round(Y(Math.min(y0, y1))));
      if (yb < C.Y0 || ya > C.Y1) return; px.col(g, C.T(col, em)); g.fillRect(ra, ya, rb - ra, yb - ya);
    },
    disc(x, y, r, col, em) { px.disc(g, X(x), Y(y), Math.max(.5, r * k), C.T(col, em)); },
    glow(x, y, r, col, a = .4) { const R = Math.max(1.2, r * k); px.blend(g, a, 'add', () => px.disc(g, X(x), Y(y), R, col)); },
    line(x0, y0, x1, y1, col, w = 1, em) { px.line(g, X(x0), Y(y0), X(x1), Y(y1), C.T(col, em), w); },
    poly(pts, col, em) { Rail.fill(g, pts.map(p => [X(p[0]), Y(p[1])]), C.T(col, em), C.Y0, C.Y1); },
    text(str, x, y, col, o = {}) { E.font.text(g, str, Math.round(X(x)), Math.round(Y(y)), C.T(col, o.em), Object.assign({ align: 'center', outline: false }, o)); },
    dot(x, y, col, em) { px.dot(g, X(x), Y(y), C.T(col, em)); }
  };
  return m;
};
Art.M = M;
/** shade helpers that keep hex strings (C.T needs hex) */
const sh = c => TN(c).sh, lt = c => TN(c).lt, dk = c => TN(c).deep, hi = c => TN(c).hi;
Art.sh = sh; Art.lt = lt; Art.dk = dk; Art.hi = hi;

/** a thing: { kind, s, x, y, draw, ... } with its drawer */
Art.thing = (kind, p) => {
  const d = Art.DRAW[kind]; if (!d) throw new Error('no art for thing "' + kind + '"');
  return Object.assign({ kind, y: 0, w: 1, h: 3 }, d.dims || {}, p, { draw: d.draw || d });
};
Art.strips = (kind, p) => { const f = Art.STRIP[kind]; if (!f) throw new Error('no strip "' + kind + '"'); return f(p); };
const def = (kind, draw, dims) => { Art.DRAW[kind] = dims ? { draw, dims } : draw; };

/* ---- zones: the ground (two tones that alternate), water, the backdrop resting on the horizon, the scenery set ---- */
DH.ZONES = {
  downtown: { name: 'Downtown', ground: ['#7a7672', '#726e6a'], sky: [{ kind: 'city', color: '#8a94b0', y: .02, height: .62, parallax: .7, windows: '#ffe6a0', seed: 3 }, { kind: 'city', color: '#6a7290', y: .04, height: .42, parallax: 1, windows: '#ffd480', seed: 11 }], set: 'downtown', wall: true },
  suburb: { name: 'Hanabatake fields', ground: ['#6a9a46', '#62903f'], sky: [{ kind: 'mountains', color: '#8aa0c8', y: .02, height: .45, parallax: .5, snow: '#eef2ff', seed: 5 }, { kind: 'hills', color: '#6a9a6a', y: .03, height: .22, parallax: .8, seed: 2 }], set: 'suburb' },
  riverside: { name: 'River mouth', ground: ['#7a9a5a', '#729252'], water: '#3a78a8', water2: '#34709e', sky: [{ kind: 'sea', color: '#4a88c0', y: .02, height: .18, parallax: .9 }, { kind: 'hills', color: '#7a98b8', y: -.12, height: .14, parallax: .5, fill: false, seed: 4 }], set: 'riverside' },
  harbor: { name: 'Harbour', ground: ['#5e5e62', '#58585c'], sky: [{ kind: 'sea', color: '#3a7ab8', y: .02, height: .22, parallax: .9 }, { kind: 'city', color: '#7a8698', y: -.1, height: .2, parallax: .5, fill: false, seed: 21 }], set: 'harbor' },
  cliff: { name: 'Lighthouse cliffs', ground: ['#6a8a4a', '#628244'], sky: [{ kind: 'sea', color: '#2e6aa8', y: .02, height: .3, parallax: .9 }, { kind: 'mountains', color: '#5a7a5a', y: .02, height: .5, parallax: .7, seed: 8 }], set: 'cliff' },
  temple: { name: 'Temple town', ground: ['#8a8070', '#827868'], sky: [{ kind: 'mountains', color: '#6a8aa8', y: .02, height: .55, parallax: .5, seed: 13 }, { kind: 'forest', color: '#3a6a4a', y: .03, height: .25, parallax: .8, seed: 6 }], set: 'temple' },
  hills: { name: 'Sunset slope', ground: ['#6a8a42', '#62823c'], sky: [{ kind: 'sea', color: '#3a7ab0', y: .04, height: .2, parallax: .9 }, { kind: 'hills', color: '#5a8a5a', y: .02, height: .35, parallax: .7, seed: 9 }], set: 'hills' },
  city: { name: 'Shotengai', ground: ['#6a6460', '#625c58'], sky: [{ kind: 'city', color: '#8a8aa8', y: .02, height: .7, parallax: .6, windows: '#ffe090', seed: 17 }, { kind: 'city', color: '#6a6a88', y: .04, height: .5, parallax: .9, windows: '#ffc870', seed: 23 }], set: 'city', wall: true },
  campus: { name: 'Campus', ground: ['#6a9a4a', '#629244'], sky: [{ kind: 'city', color: '#8a96b0', y: .02, height: .4, parallax: .6, windows: '#ffe6a0', seed: 31 }, { kind: 'forest', color: '#4a7a4a', y: .03, height: .2, parallax: .9, seed: 3 }], set: 'campus' },
  park: { name: 'Sakura park', ground: ['#78a04e', '#709846'], sky: [{ kind: 'hills', color: '#8aa8a0', y: .02, height: .3, parallax: .5, seed: 12 }, { kind: 'forest', color: '#c890a8', y: .03, height: .2, parallax: .85, seed: 14 }], set: 'park' },
  north: { name: 'Hoshimi heights', ground: ['#5e8a42', '#56823c'], sky: [{ kind: 'mountains', color: '#7088b8', y: .02, height: .6, parallax: .5, snow: '#f0f4ff', seed: 19 }, { kind: 'forest', color: '#2e5a3a', y: .03, height: .3, parallax: .8, seed: 7 }], set: 'north' },
  paddy: { name: 'Kingfisher paddies', ground: ['#7a9a4a', '#749244'], water: '#4a7a9a', water2: '#44728f', sky: [{ kind: 'mountains', color: '#7890b8', y: .02, height: .5, parallax: .5, seed: 27 }, { kind: 'hills', color: '#5a8a52', y: .03, height: .2, parallax: .8, seed: 29 }], set: 'paddy' },
  depot: { name: 'Halo depot', ground: ['#7a7064', '#72685c'], sky: [{ kind: 'city', color: '#8a8aa0', y: .02, height: .45, parallax: .6, windows: '#ffe0a0', seed: 41 }, { kind: 'hills', color: '#6a7a8a', y: -.1, height: .2, parallax: .4, fill: false, seed: 2 }], set: 'depot' }
};

/* ================= line-side equipment ================= */
// the Japanese 4-lamp signal, top to bottom yellow, green, red, yellow; aspects light: G 2, YG 1+2, Y 4, YY 1+4, R 3
const LAMPS = { G: [0, 1, 0, 0], YG: [1, 1, 0, 0], Y: [0, 0, 0, 1], YY: [1, 0, 0, 1], R: [0, 0, 1, 0], off: [0, 0, 0, 0] };
const LAMPC = ['#ffc020', '#30ff90', '#ff3020', '#ffc020'];
DH.LAMPS = LAMPS; DH.LAMPC = LAMPC;
def('signal', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C), a = (th.sig && (th.sig.shown || th.sig.aspect)) || 'R', on = LAMPS[a] || LAMPS.R;
  if (k < .35) { for (let i = 0; i < 4; i++) if (on[i]) { m.glow(0, 4.4 - i * .32, .9, LAMPC[i], .5); m.dot(0, 4.4 - i * .32, LAMPC[i], true); } return; }
  m.rect(-.09, 0, .09, 3.4, '#8a8e94'); if (k > 3) m.rect(-.09, 0, -.03, 3.4, '#a8acb2');
  if (k > 2) m.rect(-.5, 0, .5, .25, '#6a6a6a');   // footing
  // the head: black plate, hoods, four lamps
  m.rect(-.28, 3.25, .28, 4.75, '#1a1a1e'); if (k > 4) { m.rect(-.28, 4.7, .28, 4.75, '#3a3a40'); m.rect(-.33, 3.3, -.28, 4.7, '#2a2a30'); }
  for (let i = 0; i < 4; i++) {
    const y = 4.48 - i * .34, lit = on[i], c = LAMPC[i];
    m.disc(0, y, .12, lit ? c : dk(c), lit); if (k > 6) { m.rect(-.17, y + .14, .17, y + .17, '#000000'); if (lit) m.dot(-.04, y + .04, '#ffffff', true); }
    if (lit) m.glow(0, y, k > 6 ? .3 : .45, c, k > 6 ? .3 : .45);
  }
  if (k > 5) { m.rect(-.4, 2.6, .4, 2.75, '#5a5e64'); m.text(th.sig ? th.sig.id.split('/')[0] : '', 0, 3.15, '#ffffff', { font: 'tiny' }); }   // the ID plate
}, { w: .6, h: 4.8 });
def('shuntSignal', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C), go = th.sig && th.sig.aspect !== 'R';
  if (k < .4) { m.dot(0, 1.2, '#f8f0d0', true); return; }
  m.rect(-.06, 0, .06, 1, '#6a6e74'); m.rect(-.35, .95, .35, 1.6, '#1a1a1e');
  const L = go ? [[-.2, 1.08], [.2, 1.48]] : [[-.2, 1.28], [.2, 1.28]];
  for (const [x, y] of L) { m.disc(x, y, .09, '#fff6d8', true); m.glow(x, y, .22, '#fff0c0', .3); }
  m.disc(-.2, 1.28, .07, go ? '#3a3a3a' : '#fff6d8', !go);
}, { w: .7, h: 1.6 });
def('beacon', (g, sx, sy, k, C) => {
  if (k < 2) return; const m = M(g, sx, sy, k, C);
  m.poly([[-.28, .02], [.28, .02], [.24, .12], [-.24, .12]], '#e8c020'); if (k > 8) m.rect(-.24, .1, .24, .12, '#fff080');
}, { w: .6, h: .2, near: 2 });
const board = (m, w, h, y, face, rim) => { m.rect(-w / 2 - .03, y - .03, w / 2 + .03, y + h + .03, rim || '#202020'); m.rect(-w / 2, y, w / 2, y + h, face); };
def('limitBoard', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C); if (k < .3) return;
  m.rect(-.05, 0, .05, 1.9, '#9a9ea4');
  board(m, .7, .6, 1.8, '#f8f8f4');
  if (k > 4) { const t = String(th.v); m.text(t, 0, 2.38, '#101010', { scale: k > 22 ? 3 : k > 12 ? 2 : 1 }); }
  else m.rect(-.2, 1.95, .2, 2.25, '#303030');
}, { w: .8, h: 2.5 });
def('endBoard', (g, sx, sy, k, C) => {
  const m = M(g, sx, sy, k, C); if (k < .3) return;
  m.rect(-.05, 0, .05, 1.9, '#9a9ea4'); board(m, .6, .5, 1.8, '#f8f8f4');
  m.line(-.25, 1.85, .25, 2.25, '#101010', k > 10 ? 2 : 1);
  if (k > 14) m.text('END', 0, 2.2, '#101010', { font: 'tiny' });
}, { w: .7, h: 2.4 });
def('slowBoard', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C); if (k < .3) return;
  m.rect(-.05, 0, .05, 1.6, '#9a9ea4'); board(m, .75, .65, 1.5, '#f8d020', '#202020');
  if (k > 4) m.text(String(th.v), 0, 2.08, '#101010', { scale: k > 20 ? 2 : 1 });
  if (k > 10) m.text('SLOW', 0, 1.7, '#101010', { font: 'tiny' });
}, { w: .8, h: 2.2 });
def('slowEnd', (g, sx, sy, k, C) => {
  const m = M(g, sx, sy, k, C); if (k < .3) return;
  m.rect(-.05, 0, .05, 1.6, '#9a9ea4'); board(m, .6, .5, 1.5, '#30a050'); if (k > 8) m.text('END', 0, 1.85, '#ffffff', { font: 'tiny' });
}, { w: .7, h: 2 });
def('hornBoard', (g, sx, sy, k, C) => {
  const m = M(g, sx, sy, k, C); if (k < .3) return;
  m.rect(-.05, 0, .05, 1.7, '#9a9ea4'); board(m, .6, .6, 1.6, '#f8f8f4');
  if (k > 6) { m.poly([[-.2, 1.82], [-.05, 1.82], [.18, 1.7], [.18, 2.12], [-.05, 2.0], [-.2, 2.0]], '#101010'); if (k > 16) m.text('HORN', 0, 1.7, '#101010', { font: 'tiny' }); }
  else m.rect(-.15, 1.8, .15, 2.0, '#303030');
}, { w: .7, h: 2.3 });
def('approachBoard', (g, sx, sy, k, C, th) => {   // "STOP" or "PASS" 400 m before a station
  const m = M(g, sx, sy, k, C); if (k < .3) return; const pass = th.text === 'PASS';
  m.rect(-.05, 0, .05, 1.8, '#9a9ea4'); board(m, 1.0, .5, 1.75, pass ? '#2a6ad0' : '#f8f8f4', '#202020');
  if (k > 6) m.text(th.text || 'STOP', 0, 2.08, pass ? '#ffffff' : '#c01818', { font: k > 16 ? undefined : 'tiny' });
}, { w: 1.1, h: 2.3 });
def('stopMarker', (g, sx, sy, k, C, th) => {   // the stop position board for a train length: a yellow square with its number
  const m = M(g, sx, sy, k, C); if (k < .3) return;
  m.rect(-.04, 0, .04, 1.9, '#c8ccd2'); board(m, .55, .55, 1.75, th.cars === 10 ? '#f86a30' : '#f8d020', '#101010');
  if (k > 3) m.text(String(th.cars), 0, k > 20 ? 2.32 : 2.18, '#101010', { scale: k > 24 ? 2 : 1, font: k > 9 ? undefined : 'tiny' });
  if (th.depot && k > 4) { m.rect(-.9, 0, .9, .05, '#f8d020'); }
}, { w: .6, h: 2.3 });
def('kmPost', (g, sx, sy, k, C, th) => {
  if (k < 2.5) return; const m = M(g, sx, sy, k, C);
  m.rect(-.08, 0, .08, .75, '#f0f0ea'); if (k > 4) m.rect(-.08, 0, -.02, .75, '#c8c8c0');
  if (k > 16) m.text(th.label, 0, .62, '#202020', { font: 'tiny' });
}, { w: .2, h: .8 });
def('emitter', (g, sx, sy, k, C, th) => {   // a crossing's obstruction warning: red lamps that flash while it's blocked
  const m = M(g, sx, sy, k, C), on = th.em && th.em.on && Math.floor(C.t * 3) % 2 === 0;
  if (k < .35) { if (on) { m.glow(0, 3, 1.4, '#ff2010', .6); m.dot(0, 3, '#ff4030', true); } return; }
  m.rect(-.06, 0, .06, 3, '#8a8e94'); m.rect(-.5, 2.6, .5, 3.3, '#1a1a1e');
  for (const x of [-.32, -.11, .11, .32]) { m.disc(x, 2.95, .08, on ? '#ff3020' : '#4a1210', on); if (on) m.glow(x, 2.95, .5, '#ff3020', .35); }
  if (k > 8) m.text('X', 0, 2.3, '#f8d020', { font: 'tiny' });
}, { w: 1, h: 3.3 });
// catenary masts: concrete poles with a cantilever (suburbs) or a lattice portal over every track (city)
def('mast', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C), lat = th.lattice; if (k < .25) return;
  const pc = lat ? '#7a8088' : '#a8a8a2', tops = 7.2;
  for (const x of th.posts) {
    if (lat && k > 3) { m.rect(x - .18, 0, x - .1, tops, pc); m.rect(x + .1, 0, x + .18, tops, pc); for (let y = .4; y < tops; y += .8) m.line(x - .15, y, x + .15, y + .7, sh(pc)); }
    else { m.rect(x - .14, 0, x + .14, tops, pc); if (k > 3) m.rect(x - .14, 0, x - .05, tops, lt(pc)); }
  }
  if (th.posts.length > 1) { const a = Math.min(...th.posts), b = Math.max(...th.posts); m.rect(a, tops - .35, b, tops - .05, lat ? pc : '#8a8a86'); if (lat && k > 4) for (let x = a; x < b; x += .8) m.line(x, tops - .3, x + .7, tops - .1, sh(pc)); }
  else { const x = th.posts[0], to = th.arm; m.line(x, 6.3, to, 6.0, '#6a6a68', k > 6 ? 2 : 1); m.line(x, 6.9, to, 6.0, '#6a6a68'); }
  if (k > 6) for (const tx of th.wires) { m.rect(tx - .05, 5.95, tx + .05, 6.15, '#4a4a4c'); m.line(tx, 6.1, tx, 5.2, '#4a4a4c'); }
}, { w: .5, h: 7.2 });
def('pole', (g, sx, sy, k, C, th) => {   // a utility pole with its crossbar and wires sagging to the next one
  const m = M(g, sx, sy, k, C); if (k < .25) return;
  m.rect(-.12, 0, .12, 8, '#9a968e'); if (k > 4) m.rect(-.12, 0, -.04, 8, '#b8b4ac');
  m.rect(-.7, 7.3, .7, 7.45, '#7a766e'); if (k > 5) { m.rect(-.25, 6.2, .25, 6.8, '#6a6a6a'); m.dot(-.6, 7.5, '#d8d8d0'); m.dot(.6, 7.5, '#d8d8d0'); }
  const nx = C.rail.project(th.s + (th.span || 30) * (C.dir || 1), th.x, 7.4);
  if (nx && k > .6) { const mx = (sx + m.X(.6) - sx + nx[0]) / 2; px.line(g, m.X(-.6), m.Y(7.45), nx[0] - .6 * nx[2], nx[1], C.T('#2a2a2a'), 1); px.line(g, m.X(.6), m.Y(7.45), nx[0] + .6 * nx[2], nx[1], C.T('#2a2a2a'), 1); }
}, { w: 1.4, h: 8 });
def('lamp', (g, sx, sy, k, C, th) => {   // a tunnel's wall lamp
  const m = M(g, sx, sy, k, C); if (k < .3) { m.dot(0, 3.2, '#ffe8a0', true); return; }
  m.rect(-.15, 3.1, .15, 3.3, '#ffe8a0', true); m.glow(0, 3.2, .6, '#ffd070', .3);
}, { w: .3, h: 3.3 });
def('streetlamp', (g, sx, sy, k, C) => {
  const m = M(g, sx, sy, k, C); if (k < .3) { if (C.night > .4) m.dot(0, 6, '#fff0c0', true); return; }
  m.rect(-.07, 0, .07, 6, '#5a5e64'); m.rect(-.07, 5.9, .9, 6.05, '#5a5e64'); m.rect(.6, 5.7, 1.0, 5.9, C.night > .4 ? '#fff4d0' : '#c8ccd0', C.night > .4);
  if (C.night > .4) m.glow(.8, 5.6, 1.2, '#ffe8b0', .25);
}, { w: 1, h: 6 });

/* ================= trees and plants (library-flavoured, drawn here so they scale with k) ================= */
const TREES = {
  broad: { trunk: '#6a4a32', leaf: '#3e7a3a', h: 7, r: 2.6 }, pine: { trunk: '#5a3a28', leaf: '#2e5a3a', h: 9, r: 1.8 }, cedar: { trunk: '#5a3a28', leaf: '#2a4e32', h: 12, r: 1.6 },
  sakura: { trunk: '#5a3a3a', leaf: '#f4b8cc', h: 6, r: 3 }, ginkgo: { trunk: '#6a4a32', leaf: '#e8c840', h: 8, r: 2.2 }, maple: { trunk: '#5a3a28', leaf: '#b8563a', h: 6, r: 2.2 },
  willow: { trunk: '#6a5a3a', leaf: '#7aa850', h: 7, r: 3 }, bamboo: { trunk: '#7aa04a', leaf: '#5a8a3a', h: 8, r: 1.4 }, street: { trunk: '#6a4a32', leaf: '#4a8a40', h: 6, r: 1.8 }
};
def('tree', (g, sx, sy, k, C, th) => {
  const T = TREES[th.sp || 'broad'], s = th.size || 1, H = T.h * s, R = T.r * s, m = M(g, sx, sy, k, C), L = th.leaf || T.leaf, nt = TN(L);
  if (k * R < .7) { m.rect(-R * .7, H * .4, R * .7, H, L); return; }
  m.rect(-.18 * s, 0, .18 * s, H * .55, T.trunk);
  const sp = th.sp;
  if (sp === 'pine' || sp === 'cedar') {
    for (let i = 0; i < 4; i++) { const y = H * (.35 + i * .17), w = R * (1 - i * .2); m.poly([[-w, y], [w, y], [w * .2, y + H * .24], [-w * .2, y + H * .24]], i % 2 ? nt.base : nt.sh); if (k > 3) m.rect(-w * .7, y + H * .02, -w * .1, y + H * .07, nt.lt); }
    m.poly([[-R * .3, H * .9], [R * .3, H * .9], [0, H * 1.05]], nt.base);
  } else if (sp === 'bamboo') {
    for (let i = -2; i <= 2; i++) { m.rect(i * .35 * s - .05, 0, i * .35 * s + .05, H * (.8 + (i & 1) * .15), T.trunk); }
    m.disc(0, H * .8, R, nt.sh); m.disc(-R * .3, H * .9, R * .7, nt.base);
  } else {
    m.disc(0, H * .62, R, nt.sh); m.disc(-R * .45, H * .7, R * .7, nt.base); m.disc(R * .4, H * .72, R * .65, nt.base); m.disc(0, H * .85, R * .7, nt.base);
    if (k > 2) { m.disc(-R * .4, H * .85, R * .32, nt.lt); m.disc(R * .2, H * .95, R * .2, nt.hi); }
    if (sp === 'sakura' && k > 4) for (let i = 0; i < 6; i++) m.dot(Math.sin(i * 2.3) * R * .8, H * (.6 + (i % 3) * .12), '#fff0f6');
  }
}, { w: 5, h: 8 });
def('bush', (g, sx, sy, k, C, th) => { const m = M(g, sx, sy, k, C), c = th.col || '#3e7a3a', n = TN(c), r = th.r || .8; if (k * r < .6) return; m.disc(0, r * .8, r, n.sh); m.disc(-r * .3, r, r * .7, n.base); if (k > 6) m.disc(-r * .4, r * 1.2, r * .3, n.lt); }, { w: 2, h: 1.6 });
def('flowers', (g, sx, sy, k, C, th) => { if (k < 3) return; const m = M(g, sx, sy, k, C), cs = th.cols || ['#f05a7a', '#f8d040', '#ffffff', '#a060e0']; for (let i = 0; i < 8; i++) { const x = ((i * 37) % 17) / 17 * 2 - 1; m.rect(x - .06, 0, x + .06, .35, '#3a7a3a'); m.disc(x, .4, .09, cs[i % cs.length]); } }, { w: 2, h: .5, near: 3 });
def('rock', (g, sx, sy, k, C, th) => { const m = M(g, sx, sy, k, C), r = th.r || 1.2, n = TN(th.col || '#8a8478'); if (k * r < .6) return; m.poly([[-r, 0], [r, 0], [r * .8, r * .7], [.1, r * 1.1], [-r * .7, r * .8]], n.sh); m.poly([[-r * .7, r * .6], [.1, r * 1.05], [r * .4, r * .7], [-r * .3, r * .3]], n.base); }, { w: 2.4, h: 1.4 });
def('lanternPost', (g, sx, sy, k, C) => {   // a stone lantern (toro)
  const m = M(g, sx, sy, k, C); if (k < 1) return; const st = '#9a9488';
  m.rect(-.25, 0, .25, .2, st); m.rect(-.08, .2, .08, .9, st); m.rect(-.3, .9, .3, 1.05, st); m.rect(-.2, 1.05, .2, 1.4, C.night > .4 ? '#ffd890' : sh(st), C.night > .4); m.poly([[-.4, 1.4], [.4, 1.4], [0, 1.75]], dk(st));
  if (C.night > .4) m.glow(0, 1.2, .5, '#ffc870', .3);
}, { w: .8, h: 1.8 });
def('scarecrow', (g, sx, sy, k, C) => { const m = M(g, sx, sy, k, C); if (k < 2) return; m.rect(-.04, 0, .04, 1.6, '#7a5a3a'); m.rect(-.6, 1.25, .6, 1.33, '#7a5a3a'); m.rect(-.3, .9, .3, 1.4, '#3a5a9a'); m.disc(0, 1.6, .2, '#e8d8b0'); m.poly([[-.4, 1.7], [.4, 1.7], [0, 2]], '#c8a050'); }, { w: 1.2, h: 2 });
def('boat', (g, sx, sy, k, C, th) => { const m = M(g, sx, sy, k, C), c = th.col || '#e8e8e0'; if (k < .4) return; m.poly([[-2, .5], [2.4, .5], [1.8, 0], [-1.6, 0]], c); m.rect(-1.2, .5, .6, .9, sh(c)); if (k > 3) m.rect(-1, .9, .2, 1.4, '#3a5a8a'); }, { w: 4.4, h: 1.5 });
def('bike', (g, sx, sy, k, C, th) => { if (k < 3) return; const m = M(g, sx, sy, k, C), c = th.col || '#c03030'; for (const x of [-.45, .45]) { m.disc(x, .3, .3, '#2a2a2a'); m.disc(x, .3, .2, '#8a8a8a'); } m.line(-.45, .3, .1, .75, c); m.line(.45, .3, .1, .75, c); m.line(-.2, .75, .3, .75, c); }, { w: 1.2, h: 1 });
def('kei', (g, sx, sy, k, C, th) => {   // a kei car (or a van) waiting at a crossing, seen from the side
  const m = M(g, sx, sy, k, C), c = th.col || '#f0f0ec', f = th.flip ? -1 : 1; if (k < .4) return;
  m.rect(-1.7, .3, 1.7, 1.1, c); m.rect(-1.1 * f, 1.1, 1.3 * f, 1.75, c); if (k > 3) { m.rect(-.9 * f, 1.15, -.05 * f, 1.65, '#6a8ab0'); m.rect(.1 * f, 1.15, 1.1 * f, 1.65, '#6a8ab0'); m.rect(-1.7, .3, 1.7, .45, sh(c)); }
  for (const x of [-1.1, 1.1]) m.disc(x, .3, .3, '#1a1a1a');
  if (C.night > .4) { m.glow(1.75 * f, .8, .4, '#fff0c0', .5); }
}, { w: 3.4, h: 1.8 });
def('vending', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C), c = th.col || '#d02a2a'; if (k < .5) return;
  m.rect(-.5, 0, .5, 1.85, c); if (k > 3) { m.rect(-.42, .95, .42, 1.75, '#e8f0f8', C.night > .4); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) m.rect(-.36 + j * .2, 1.0 + i * .25, -.24 + j * .2, 1.18 + i * .25, ['#e84040', '#40a0e0', '#f0c040', '#40c060'][(i + j) % 4], C.night > .4); m.rect(-.3, .2, .3, .45, '#202020'); }
  if (C.night > .4) m.glow(0, 1.3, .9, '#e0f0ff', .2);
}, { w: 1, h: 1.9 });
def('bench', (g, sx, sy, k, C) => { if (k < 1.5) return; const m = M(g, sx, sy, k, C); m.rect(-.9, .42, .9, .5, '#3a6ab0'); m.rect(-.9, .5, .9, .85, '#4a7ac0'); m.rect(-.8, 0, -.7, .42, '#5a5e64'); m.rect(.7, 0, .8, .42, '#5a5e64'); }, { w: 1.8, h: .9 });
def('bin', (g, sx, sy, k, C) => { if (k < 2) return; const m = M(g, sx, sy, k, C); for (const [x, c] of [[-.45, '#3a8ad0'], [0, '#40a050'], [.45, '#e8a020']]) { m.rect(x - .2, 0, x + .2, .9, c); m.rect(x - .2, .8, x + .2, .9, '#e8e8e8'); } }, { w: 1.4, h: .9 });
def('column', (g, sx, sy, k, C, th) => { const m = M(g, sx, sy, k, C), c = th.col || '#d8d8d4'; if (k < .3) return; m.rect(-.12, 0, .12, th.h || 3.6, c); if (k > 4) m.rect(-.12, 0, -.05, th.h || 3.6, lt(c)); }, { w: .3, h: 3.6 });
def('clock', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C); if (k < 1) return;
  m.rect(-.03, 2.6, .03, 3.6, '#5a5e64'); m.disc(0, 2.6, .32, '#202020'); m.disc(0, 2.6, .27, '#f8f8f4', C.night > .4);
  if (k > 6) { const t = (DH.clockNow || 0), h = (t / 3600) % 12 / 12 * Math.PI * 2, mi = (t / 60) % 60 / 60 * Math.PI * 2; m.line(0, 2.6, Math.sin(h) * .15, 2.6 + Math.cos(h) * .15, '#101010'); m.line(0, 2.6, Math.sin(mi) * .23, 2.6 + Math.cos(mi) * .23, '#101010'); }
}, { w: .7, h: 3.6 });
def('nameBoard', (g, sx, sy, k, C, th) => {   // the station's name board: big romaji, the English below, the neighbours' names with arrows
  const m = M(g, sx, sy, k, C); if (k < .3) return; const w = 2.6;
  m.rect(-1.05, 0, -.97, 2.1, '#5a5e64'); m.rect(.97, 0, 1.05, 2.1, '#5a5e64');
  m.rect(-w / 2, 1.5, w / 2, 2.4, '#f8f8f4', C.night > .4); m.rect(-w / 2, 1.5, w / 2, 1.62, th.line || '#f2c230', C.night > .4);
  if (k > 14) {
    m.text(th.name, 0, 2.32, '#101010', { scale: k > 40 ? 2 : 1 });
    if (k > 26) { m.text(th.en || '', 0, k > 40 ? 2.0 : 2.05, '#5a5a5a', { font: 'tiny' }); m.text('← ' + (th.prev || ''), -w / 2 + .1, 1.86, '#303030', { font: 'tiny', align: 'left' }); m.text((th.next || '') + ' →', w / 2 - .1, 1.86, '#303030', { font: 'tiny', align: 'right' }); }
  } else if (k > 3) m.rect(-.8, 2.05, .8, 2.2, '#202020');
}, { w: 2.6, h: 2.4 });
def('ledBoard', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C); if (k < 1) return;
  m.rect(-.03, 3.0, .03, 3.6, '#5a5e64'); m.rect(-1.2, 2.5, 1.2, 3.05, '#101014');
  if (k > 16) { m.text(th.text || 'LOCAL  AKARI CENTRAL', 0, 2.95, '#ff9a30', { font: 'tiny', em: true }); m.text(th.text2 || 'NEXT TRAIN  ' + (DH.clockNow ? DH.clockStr(DH.clockNow + 180, false) : ''), 0, 2.72, '#40e070', { font: 'tiny', em: true }); }
  else m.rect(-1, 2.7, 1, 2.85, '#ff9a30', true);
}, { w: 2.4, h: 3.6 });
def('poster', (g, sx, sy, k, C) => {   // a Haro-kun poster: "RIDE THE HALO LINE"
  const m = M(g, sx, sy, k, C); if (k < 2) return;
  m.rect(-.5, 1, .5, 2.2, '#3aa0e0'); m.disc(0, 1.65, .3, '#fff8ec'); m.disc(-.1, 1.7, .05, '#202020'); m.disc(.1, 1.7, .05, '#202020');
  if (k > 6) { px.blend(g, .6, 'add', () => px.disc(g, m.X(0), m.Y(2.0), Math.max(1, .25 * k), C.T('#f2c230', true))); m.text('HALO', 0, 1.25, '#ffffff', { font: 'tiny' }); }
}, { w: 1, h: 2.2 });
def('gate', (g, sx, sy, k, C, th) => {   // a crossing gate: the post, the striped arm (down 0 .. up 1), the flashing lamps, the crossbuck
  const m = M(g, sx, sy, k, C), X = th.cx || { warn: false, gate: 1 }, up = X.gate, side = th.side, on = X.warn && Math.floor(C.t * 2.5) % 2;
  if (k < .3) { if (X.warn) { m.glow(0, 2.6, 1.2, '#ff2010', .5); } return; }
  m.rect(-.07, 0, .07, 3.1, '#e8e8e4'); if (k > 4) for (let y = .2; y < 3; y += .6) m.rect(-.07, y, .07, y + .3, '#101010');
  // lamps either side of the post, alternating
  for (const [x, ph] of [[-.32, 0], [.32, 1]]) { const lit = X.warn && on === ph; m.disc(x, 2.55, .14, lit ? '#ff3020' : '#3a1010', lit); if (lit) m.glow(x, 2.55, .5, '#ff3020', .45); }
  if (k > 3) { m.line(-.45, 3.0, .45, 3.4, '#f0f0ea', k > 10 ? 2 : 1); m.line(-.45, 3.4, .45, 3.0, '#f0f0ea', k > 10 ? 2 : 1); }   // the crossbuck
  // the arm: along the road (across the line in the view it lies flat toward the track)
  const len = th.len || 4, a = (1 - up) * Math.PI / 2, ax = side * Math.sin(a) * len, ay = 1.1 + Math.cos(a) * len * .95;
  if (k > .8) { m.line(0, 1.1, ax, ay, '#f0f0ea', Math.max(1, Math.round(k * .1))); if (k > 3) for (let i = 1; i < 6; i += 2) { const u0 = i / 6, u1 = (i + 1) / 6; m.line(ax * u0, 1.1 + (ay - 1.1) * u0, ax * u1, 1.1 + (ay - 1.1) * u1, '#e02020', Math.max(1, Math.round(k * .1))); } }
}, { w: 1, h: 3.4 });

/* ================= landmarks (hand-drawn, big) ================= */
def('terminal', (g, sx, sy, k, C) => {   // Akari Central's hall and clock tower
  const m = M(g, sx, sy, k, C), w = '#c8b8a0', n = C.night > .4;
  m.rect(-14, 0, 14, 12, w); m.rect(-14, 12, 14, 13, sh(w)); for (let i = -12; i < 12; i += 3) m.rect(i, 3, i + 1.6, 9, n ? '#ffd890' : '#5a7090', n);
  m.rect(-3, 0, 3, 28, lt(w)); m.poly([[-3.6, 28], [3.6, 28], [0, 33]], '#4a6a5a');
  m.disc(0, 23, 2.2, '#3a3a3a'); m.disc(0, 23, 1.9, '#f8f4e8', n);
  if (k > 1) { const t = DH.clockNow || 0, h = (t / 3600) % 12 / 12 * Math.PI * 2, mi = (t / 60) % 60 / 60 * Math.PI * 2; m.line(0, 23, Math.sin(h) * 1, 23 + Math.cos(h) * 1, '#101010', Math.max(1, k * .2 | 0)); m.line(0, 23, Math.sin(mi) * 1.6, 23 + Math.cos(mi) * 1.6, '#101010', Math.max(1, k * .15 | 0)); }
  if (k > 2) m.text('AKARI', 0, 11.6, '#3a2a1a', { font: k > 6 ? undefined : 'tiny' });
  if (n) m.glow(0, 23, 3, '#fff0c0', .2);
}, { w: 28, h: 33 });
def('greenhouse', (g, sx, sy, k, C) => { const m = M(g, sx, sy, k, C); if (k < .3) return; for (let i = 0; i < 3; i++) { const x = (i - 1) * 6; m.rect(x - 2.6, 0, x + 2.6, 2.2, '#c8e0e8'); m.poly([[x - 2.6, 2.2], [x + 2.6, 2.2], [x, 3.6]], '#d8eef4'); if (k > 2) for (let j = -2; j <= 2; j++) m.line(x + j, 0, x + j, 2.2, '#a0b8c0'); } }, { w: 18, h: 3.6 });
def('crane', (g, sx, sy, k, C, th) => {   // a harbour gantry crane
  const m = M(g, sx, sy, k, C), c = th.col || '#d84a2a'; if (k < .2) return;
  for (const x of [-5, 5]) { m.rect(x - .4, 0, x + .4, 26, c); if (k > 1.5) for (let y = 2; y < 26; y += 4) m.line(x - .4, y, x + .4, y + 3, sh(c)); }
  m.rect(-14, 26, 22, 28, c); m.rect(-6, 28, 6, 32, sh(c)); m.rect(14, 22, 18, 26, '#e8e8e0');
  if (k > 1) { m.line(-3, 28, -14, 26, sh(c)); m.line(3, 32, 22, 28, sh(c)); m.line(16, 22, 16, 12, '#2a2a2a'); }
  if (C.night > .4) { m.dot(22, 28, '#ff3020', true); m.glow(22, 28, 1, '#ff3020', .3); }
}, { w: 36, h: 32 });
def('containers', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C), cols = ['#c84a2a', '#2a6aa8', '#3a8a4a', '#e8b030', '#8a3a8a', '#d8d8d0'], seed = th.seed || 1; if (k < .3) return;
  for (let r = 0; r < (th.rows || 3); r++) for (let i = 0; i < (th.n || 3); i++) { const c = cols[(seed * 7 + r * 3 + i * 5) % cols.length], x = (i - (th.n || 3) / 2) * 2.5; m.rect(x, r * 2.6, x + 2.4, r * 2.6 + 2.5, c); if (k > 3) for (let j = .2; j < 2.4; j += .4) m.rect(x + j, r * 2.6 + .2, x + j + .1, r * 2.6 + 2.3, sh(c)); }
}, { w: 8, h: 8 });
def('ferry', (g, sx, sy, k, C) => {
  const m = M(g, sx, sy, k, C); if (k < .15) return;
  m.poly([[-30, 3], [34, 3], [30, -1], [-28, -1]], '#f0f0ea'); m.rect(-30, -1, 30, .6, '#2a5aa8'); m.rect(-16, 3, 20, 9, '#f8f8f4'); m.rect(-10, 9, 12, 13, '#f0f0ea'); m.rect(4, 13, 8, 18, '#d84a2a');
  if (k > .8) for (let i = -14; i < 18; i += 2.5) m.rect(i, 5, i + 1.4, 6.5, C.night > .4 ? '#ffe090' : '#3a5a8a', C.night > .4);
}, { w: 64, h: 18 });
def('lighthouse', (g, sx, sy, k, C) => {
  const m = M(g, sx, sy, k, C); if (k < .15) return;
  m.poly([[-2.4, 0], [2.4, 0], [1.6, 16], [-1.6, 16]], '#f4f4ee'); for (let y = 2; y < 16; y += 4) m.poly([[-2.4 + y * .05, y], [2.4 - y * .05, y], [2.35 - (y + 1.6) * .05, y + 1.6], [-2.35 + (y + 1.6) * .05, y + 1.6]], '#d83a2a');
  m.rect(-1.9, 16, 1.9, 16.6, '#3a3a3a'); m.rect(-1.2, 16.6, 1.2, 18.4, '#f8f0c8', C.night > .3); m.poly([[-1.6, 18.4], [1.6, 18.4], [0, 20]], '#2a2a2a');
  if (C.night > .3) { m.glow(0, 17.5, 3, '#fff4c0', .35); const a = C.t * 1.2, bx = Math.cos(a) * 40; if (Math.sin(a) > -.2) px.blend(g, .2, 'add', () => Rail.fill(g, [[m.X(0), m.Y(17.8)], [m.X(bx), m.Y(16)], [m.X(bx), m.Y(19.5)]], '#fff4c0', C.Y0, C.Y1)); }
}, { w: 5, h: 20 });
def('pagoda', (g, sx, sy, k, C) => {
  const m = M(g, sx, sy, k, C), wood = '#8a3a2a', roof = '#3a3a3e'; if (k < .15) return;
  for (let i = 0; i < 5; i++) { const y = i * 4, w = 5 - i * .6; m.rect(-w * .6, y, w * .6, y + 3, wood); if (k > 2) m.rect(-w * .3, y + .6, w * .3, y + 2.2, C.night > .4 ? '#ffc870' : '#4a1a12', C.night > .4); m.poly([[-w - .5, y + 3], [w + .5, y + 3], [w * .7, y + 4], [-w * .7, y + 4]], roof); }
  m.rect(-.15, 20, .15, 25, '#c8a040'); for (let i = 0; i < 6; i++) m.rect(-.4, 20.5 + i * .7, .4, 20.8 + i * .7, '#c8a040');
}, { w: 11, h: 25 });
def('templeGate', (g, sx, sy, k, C) => {   // a sanmon: two storeys, tiled roofs
  const m = M(g, sx, sy, k, C), wood = '#9a3a2a'; if (k < .2) return;
  for (const x of [-4, -1.4, 1.4, 4]) m.rect(x - .3, 0, x + .3, 5, wood);
  m.poly([[-6.5, 5], [6.5, 5], [5, 6.4], [-5, 6.4]], '#3a3a40'); m.rect(-4.4, 6.4, 4.4, 8.5, wood); m.poly([[-7, 8.5], [7, 8.5], [5.2, 10.4], [-5.2, 10.4]], '#3a3a40'); m.rect(-.5, 10.4, .5, 11, '#3a3a40');
}, { w: 14, h: 11 });
def('torii', (g, sx, sy, k, C) => { const m = M(g, sx, sy, k, C), c = '#e0402a'; if (k < .3) return; m.rect(-2.1, 0, -1.7, 5, c); m.rect(1.7, 0, 2.1, 5, c); m.rect(-2.6, 4.2, 2.6, 4.5, c); m.poly([[-3.2, 5], [3.2, 5], [2.9, 5.6], [-2.9, 5.6]], '#202020'); m.rect(-3, 5, 3, 5.2, c); }, { w: 6.4, h: 5.6 });
def('shrine', (g, sx, sy, k, C) => { const m = M(g, sx, sy, k, C); if (k < .3) return; m.rect(-2, 0, 2, 2.4, '#b88a5a'); m.poly([[-2.8, 2.4], [2.8, 2.4], [0, 4.2]], '#4a4a50'); if (k > 3) { m.rect(-.4, 0, .4, 1.6, '#3a2a1a'); m.rect(-1.2, 2, 1.2, 2.2, '#f0f0e8'); } }, { w: 5.6, h: 4.2 });
def('gameCentre', (g, sx, sy, k, C) => {   // a neon game centre at Shotengai
  const m = M(g, sx, sy, k, C), n = C.night > .3; if (k < .2) return;
  m.rect(-8, 0, 8, 14, '#3a2a4a'); for (let y = 2; y < 13; y += 3) m.rect(-7, y, 7, y + 1.6, n ? '#ff4ad8' : '#6a4a7a', n);
  m.rect(-6, 12, 6, 16, '#202030'); if (k > 1.5) m.text('GAME', 0, 15.6, n ? '#40f0ff' : '#90d0e0', { em: n, scale: k > 5 ? 2 : 1 });
  if (n) m.glow(0, 14, 7, '#ff40c0', .18);
}, { w: 16, h: 16 });
def('uniTower', (g, sx, sy, k, C) => {
  const m = M(g, sx, sy, k, C), b = '#b05a3a'; if (k < .2) return;
  m.rect(-10, 0, 10, 9, b); for (let i = -9; i < 9; i += 2.2) m.rect(i, 2, i + 1.2, 7, C.night > .4 ? '#ffe0a0' : '#e8e8e0', C.night > .4);
  m.rect(-2.4, 0, 2.4, 20, lt(b)); m.disc(0, 16.5, 1.6, '#f8f4e8'); m.poly([[-3, 20], [3, 20], [0, 24]], '#3a5a4a');
}, { w: 20, h: 24 });
def('ferris', (g, sx, sy, k, C) => {   // the Akari Eye: it turns; lit cabins at night
  const m = M(g, sx, sy, k, C), R = 14, cy = R + 3, a0 = C.t * .08; if (k < .12) return;
  m.line(-4, 0, 0, cy, '#d8d8e0', Math.max(1, k * .3 | 0)); m.line(4, 0, 0, cy, '#d8d8e0', Math.max(1, k * .3 | 0));
  const N = 16; let prev = null;
  for (let i = 0; i <= N; i++) { const a = a0 + i / N * Math.PI * 2, x = Math.cos(a) * R, y = cy + Math.sin(a) * R; if (prev) m.line(prev[0], prev[1], x, y, '#e8e8f0'); if (i < N) { if (k > .5) m.line(0, cy, x, y, '#b8b8c8'); const c = ['#f05a7a', '#40a0e0', '#f8d040', '#60c060'][i % 4]; m.rect(x - .7, y - 1.6, x + .7, y - .2, C.night > .4 ? E.tones(c).hi : c, C.night > .4); } prev = [x, y]; }
  if (C.night > .4) m.glow(0, cy, R * .6, '#f080c0', .12);
}, { w: 30, h: 32 });
def('observatory', (g, sx, sy, k, C) => { const m = M(g, sx, sy, k, C); if (k < .2) return; m.rect(-5, 0, 5, 6, '#e8e8e0'); m.disc(0, 6, 5, '#d8dce4'); m.rect(-5.2, 0, 5.2, 6, '#e8e8e0'); m.rect(-.7, 7, .7, 11, '#3a3a40'); if (C.night > .4) m.glow(0, 4, 2, '#a0c0ff', .2); }, { w: 10, h: 11 });
def('archBridge', (g, sx, sy, k, C, th) => {   // one rib of Kujira-bashi's whale-back arch: a line to the next rib's top, a hanger down to the deck
  const m = M(g, sx, sy, k, C), c = '#3a7ac8', h = th.ah, nx = C.rail.project(th.s + th.step * (C.dir || 1), th.x, th.nh);
  if (nx) px.line(g, m.X(0), m.Y(h), nx[0], nx[1], C.T(c), Math.max(1, Math.round(k * .5)));
  if (k > .8 && h > 1) m.line(0, h, 0, .8, '#2a5a98', Math.max(1, Math.round(k * .08)));
}, { w: .5, h: 16 });
def('portal', (g, sx, sy, k, C, th) => {   // a tunnel mouth in a hillside: a mound with the arched mouth cut out, a concrete frame
  if ((C.dir || 1) !== th.facing) return;
  const m = M(g, sx, sy, k, C), hill = th.col || '#5a7048', rock = '#8a8478', w0 = th.x0, w1 = th.x1, Hm = 6.6, Hh = th.hh || 46, Wh = th.wh || 170;
  const hY = x => Math.max(0, Hh * (1 - (x / Wh) * (x / Wh))) + Math.sin(x * .13 + (th.s % 7)) * 2.5 * (1 - Math.abs(x) / Wh);
  const T0 = E.tones(hill), out = [];
  for (let i = 0; i <= 24; i++) { const x = -Wh + i / 24 * 2 * Wh; out.push([x, Math.max(0, hY(x))]); }
  const mouthTop = x => Hm + Math.sqrt(Math.max(0, 1 - ((x - (w0 + w1) / 2) / ((w1 - w0) / 2)) ** 2)) * 1.4;
  // the left and right flanks, and the part above the mouth
  m.poly([[-Wh, -.45]].concat(out.filter(p => p[0] <= w0 - 1.2), [[w0 - 1.2, hY(w0 - 1.2)], [w0 - 1.2, -.45]]), hill);
  m.poly([[w1 + 1.2, -.45], [w1 + 1.2, hY(w1 + 1.2)]].concat(out.filter(p => p[0] >= w1 + 1.2), [[Wh, -.45]]), hill);
  const top = []; for (let i = 0; i <= 8; i++) { const x = w0 - 1.2 + i / 8 * (w1 - w0 + 2.4); top.push([x, hY(x)]); }
  const arch = []; for (let i = 8; i >= 0; i--) { const x = w0 - 1.2 + i / 8 * (w1 - w0 + 2.4); arch.push([x, Math.min(hY(x), mouthTop(E.clamp(x, w0, w1)) + 1.2)]); }
  m.poly(top.concat(arch), hill);
  // texture: darker bands and a few shrubs on the slope; the concrete frame round the arch
  if (k > .8) { for (let i = 0; i < 14; i++) { const x = -Wh * .8 + ((i * 37) % 100) / 100 * Wh * 1.6, y = hY(x) * (.3 + ((i * 53) % 60) / 100); if (x > w0 - 2 && x < w1 + 2 && y < Hm + 3) continue; m.disc(x, y, 2.2 + (i % 3), i % 2 ? T0.sh : T0.lt); } m.line(-Wh, -.2, Wh, -.2, T0.deep); }
  m.rect(w0 - 1.2, 0, w0, Hm + .6, rock); m.rect(w1, 0, w1 + 1.2, Hm + .6, rock);
  for (let i = 0; i < 10; i++) { const x0 = w0 - 1.2 + i / 10 * (w1 - w0 + 2.4), x1 = x0 + (w1 - w0 + 2.4) / 10; m.rect(x0, mouthTop(E.clamp((x0 + x1) / 2, w0, w1)) - .2, x1, mouthTop(E.clamp((x0 + x1) / 2, w0, w1)) + 1.2, i % 2 ? rock : E.tones(rock).sh); }
  if (k > 4) m.text(th.label || '', (w0 + w1) / 2, mouthTop((w0 + w1) / 2) + 1.05, '#3a3a36', { font: 'tiny' });
}, { w: 10, h: 9, near: 3 });
def('fisher', (g, sx, sy, k, C) => { const m = M(g, sx, sy, k, C); if (k < 1.5) return; m.rect(-.2, 0, .2, .9, '#3a5a8a'); m.rect(-.25, .9, .25, 1.4, '#e8a030'); m.disc(0, 1.6, .2, '#e8c0a0'); m.poly([[-.35, 1.7], [.35, 1.7], [0, 1.95]], '#e8d890'); m.line(.2, 1.3, 2.6, 2.6, '#3a2a1a'); m.line(2.6, 2.6, 2.7, .2, '#c8c8c8'); }, { w: 3, h: 2.6 });
def('billboard', (g, sx, sy, k, C, th) => {
  const m = M(g, sx, sy, k, C), n = C.night > .4; if (k < .3) return;
  m.rect(-.15, 0, .15, 5, '#5a5e64'); m.rect(-3, 5, 3, 8, th.col || '#f2c230', n);
  if (k > 2) { m.disc(-1.8, 6.5, 1.1, '#fff8ec', n); m.disc(-2.1, 6.7, .15, '#202020'); m.disc(-1.5, 6.7, .15, '#202020'); if (k > 4) m.text(th.text || 'RIDE THE HALO LINE', .9, 7.1, '#202020', { font: 'tiny' }); }
  if (n) m.glow(0, 6.5, 3, '#fff0c0', .12);
}, { w: 6, h: 8 });
def('lanterns', (g, sx, sy, k, C, th) => {   // festival lantern strings, swaying
  const m = M(g, sx, sy, k, C); if (k < .8) return; const n = 8, w = th.w || 8;
  m.line(-w / 2, 4.2, w / 2, 4.2, '#3a2a1a');
  for (let i = 0; i < n; i++) { const x = -w / 2 + (i + .5) * w / n, sw = Math.sin(C.t * 1.6 + i) * .08; m.rect(x - .22 + sw, 3.3, x + .22 + sw, 4.0, i % 2 ? '#e84a2a' : '#f8e8c8', C.night > .2); if (C.night > .2) m.glow(x + sw, 3.65, .5, '#ffb060', .25); }
}, { w: 8, h: 4.2 });
def('stall', (g, sx, sy, k, C, th) => { const m = M(g, sx, sy, k, C), c = th.col || '#e84a2a'; if (k < .5) return; m.rect(-1.5, 0, 1.5, 1, '#8a5a3a'); m.rect(-1.6, 2.1, 1.6, 2.5, c); for (let i = -1.5; i < 1.5; i += .5) m.rect(i, 2.1, i + .25, 2.5, '#f8f0e8'); m.rect(-1.5, 1, -1.4, 2.1, '#5a3a2a'); m.rect(1.4, 1, 1.5, 2.1, '#5a3a2a'); if (k > 4) m.text(th.text || 'TAKO', 0, 1.6, '#202020', { font: 'tiny' }); }, { w: 3.2, h: 2.5 });
def('taiko', (g, sx, sy, k, C) => { const m = M(g, sx, sy, k, C); if (k < 1) return; m.rect(-.7, 0, .7, .6, '#5a3a2a'); m.disc(0, 1.1, .6, '#8a3a2a'); m.disc(0, 1.1, .5, '#e8d8b8'); }, { w: 1.4, h: 1.7 });
def('cart', (g, sx, sy, k, C, th) => {   // S3's takoyaki cart stuck on the crossing
  const m = M(g, sx, sy, k, C); if (k < .4) return;
  m.rect(-1.3, .5, 1.3, 1.6, '#e8402a'); m.rect(-1.4, 1.6, 1.4, 1.75, '#8a5a3a'); m.rect(-1.2, 2.3, 1.2, 2.5, '#f8d050'); m.rect(-1.1, 1.75, -1, 2.3, '#5a3a2a'); m.rect(1, 1.75, 1.1, 2.3, '#5a3a2a');
  for (const x of [-.8, .8]) { m.disc(x, .45, .45, '#2a2a2a'); m.disc(x, .45, .25, '#a8a8a8'); }
  if (k > 4) m.text('TAKO', 0, 1.25, '#fff8e0', { font: 'tiny' });
}, { w: 2.8, h: 2.5 });
def('workSign', (g, sx, sy, k, C) => { const m = M(g, sx, sy, k, C); if (k < .6) return; m.poly([[-.5, 0], [.5, 0], [0, .9]], '#f8a020'); if (k > 6) m.text('!', 0, .7, '#101010', { font: 'tiny' }); }, { w: 1, h: .9 });
def('haroStatue', (g, sx, sy, k, C) => { const m = M(g, sx, sy, k, C); if (k < .5) return; m.rect(-.8, 0, .8, .8, '#8a8a90'); m.disc(0, 1.7, .9, '#fff8ec'); m.disc(-.3, 1.8, .12, '#202020'); m.disc(.3, 1.8, .12, '#202020'); m.line(-.9, 2.8, .9, 2.8, '#f2c230', Math.max(1, k * .2 | 0)); }, { w: 1.8, h: 3 });

/* ================= strips: platforms, canopies, walls, buildings ================= */
const S = (o) => Object.assign({ faces: {} }, o);
// a platform: concrete edge, paving on top with the white line at the track edge and the yellow tactile strip 0.8 m in
const platTop = (edges) => ({ col: '#b8b4ac', pattern: F => {
  const L0 = F.x, L1 = F.xr;
  for (const e of edges) {   // e: route x of an edge facing a track
    const ex = e * F.dir, inside = ex <= L0 + .01 ? 1 : -1, v = ex - L0;
    F.rect(F.u0, F.u1, inside > 0 ? 0 : v - .2, inside > 0 ? .2 : v, '#f4f4ee');
    if (F.k > 2) F.rect(F.u0, F.u1, inside > 0 ? .75 : v - 1.05, inside > 0 ? 1.05 : v - .75, '#e8c020');
  }
  if (F.k > 6) for (let u = Math.ceil(F.u0 / 4) * 4; u < F.u1; u += 4) F.rect(u, u + .06, 0, L1 - L0, '#a8a49c');
} });
const platSide = { col: '#9a968e', pattern: F => { F.rect(F.u0, F.u1, 1.0, 1.1, '#c8c4bc'); if (F.k > 4) F.rect(F.u0, F.u1, .05, .3, '#6a665e'); }, minK: 1.5 };
Art.STRIP.platform = p => S({ kind: 'platform', s0: p.s0, s1: p.s1, x0: p.x0, x1: p.x1, y0: -.2, y1: 1.1, edges: p.edges, faces: { side: platSide, top: platTop(p.edges), end: '#8a867e' } });
Art.STRIP.canopy = p => S({ kind: 'canopy', s0: p.s0, s1: p.s1, x0: p.x0, x1: p.x1, y0: 3.6, y1: 3.9, faces: {
  under: { col: '#d8d8d4', pattern: F => { if (F.k > 3) for (let u = Math.ceil(F.u0 / 5) * 5; u < F.u1; u += 5) F.rect(u, u + 1.4, (F.xr - F.x) * .4, (F.xr - F.x) * .6, F.night > .3 ? '#fff8e0' : '#f0f0ec', F.night > .3); } },
  side: { col: p.col || '#3a6ab0', pattern: F => { F.rect(F.u0, F.u1, 3.6, 3.66, '#f2c230'); } }, top: p.roof || '#8a8e94', end: p.col || '#3a6ab0' } });
Art.STRIP.wall = p => S({ kind: 'wall', s0: p.s, s1: p.s + p.len, x0: p.x, x1: p.x + (p.w || .3) * (p.x < 0 ? -1 : 1), y0: p.y0 || 0, y1: p.h || 2.4, faces: { side: { col: p.col || '#b8b4aa', pattern: F => { if (F.k > 2) for (let u = Math.ceil(F.u0 / 2) * 2; u < F.u1; u += 2) F.rect(u, u + .05, F.y0, F.y1, '#9a968c'); F.rect(F.u0, F.u1, F.y1 - .12, F.y1, '#d0ccc2'); } }, top: '#d0ccc2', end: '#a8a49a' } });
Art.STRIP.fence = p => S({ kind: 'fence', s0: p.s, s1: p.s + p.len, x0: p.x, x1: p.x + .06, y0: p.y0 || 0, y1: (p.y0 || 0) + (p.h || 1.4), faces: { side: { col: p.col || '#6a8a6a', pattern: F => { const c = '#7a9a7a'; if (F.k < 3) return; for (let u = Math.ceil(F.u0 / .5) * .5; u < F.u1; u += .5) F.rect(u, u + .04, F.y0, F.y1, c); } } } });
// a building box: facade by kind, windows lit at night, a flat or gable roof
const FACADES = {
  office: { wall: '#a8b0bc', win: '#5a7896', lit: '#ffe6a0', fl: 3.4, ww: 2.2, wg: .6, band: '#8a92a0' },
  apartment: { wall: '#d8d0c0', win: '#5a6a80', lit: '#ffd890', fl: 2.9, ww: 1.4, wg: 1.6, balcony: true },
  house: { wall: '#e8dcc4', win: '#4a5a70', lit: '#ffd080', fl: 2.8, ww: 1.1, wg: 2.4 },
  shop: { wall: '#c8a080', win: '#e8f0f0', lit: '#fff0c0', fl: 3.2, ww: 3, wg: .8, noren: true },
  konbini: { wall: '#f4f4f0', win: '#e0f0f8', lit: '#f8fcff', fl: 3.2, ww: 4, wg: .4, stripe: ['#3a9a4a', '#f8a020', '#2a6ad0'] },
  warehouse: { wall: '#8a9098', win: '#6a7078', lit: '#c0c8d0', fl: 6, ww: 3.6, wg: 3, doors: true },
  machiya: { wall: '#4a3a2e', win: '#2a2018', lit: '#ffc070', fl: 2.8, ww: 2.4, wg: 1, lattice: true },
  campus: { wall: '#c87a5a', win: '#e8e8e0', lit: '#ffe6a0', fl: 3.6, ww: 1.6, wg: 1.2 },
  shed: { wall: '#6a7a8a', win: '#3a4a5a', lit: '#e0e8f0', fl: 7, ww: 5, wg: 2, doors: true },
  neon: { wall: '#3a3048', win: '#ff60d0', lit: '#ff80e0', fl: 3, ww: 2.6, wg: .8, neon: true }
};
DH.FACADES = FACADES;
const facade = (fz, o) => ({ col: o.wall || fz.wall, pattern: F => {
  const lit = F.night > .35, top = F.y1, fl = fz.fl, H = top - F.y0;
  if (F.k < 1.2) { if (lit) for (let y = F.y0 + 1; y < top - .5; y += fl) F.rect(F.u0, F.u1, y, y + .4, fz.lit, true); return; }
  const span = F.kind === 'end' ? [F.x, F.xr] : [F.u0, F.u1], pitch = fz.ww + fz.wg, seed = o.seed || 1;
  const base = F.kind === 'end' ? F.x : 0, end = F.kind === 'end' ? F.xr : (o.len || 10);
  for (let y = F.y0 + (fz.doors ? fl * .8 : 1), row = 0; y < top - .6; y += fl, row++) {
    for (let u = base + fz.wg / 2, col = 0; u + fz.ww <= end + .01; u += pitch, col++) {
      if (u + fz.ww < span[0] || u > span[1]) continue;
      const on = lit && ((seed * 31 + row * 7 + col * 13) % 10) < 6, wc = on ? fz.lit : fz.win;
      if (fz.neon) { F.rect(u, u + fz.ww, y, y + .5, lit ? fz.lit : '#8a5a9a', lit); continue; }
      F.rect(u, u + fz.ww, y + .2, y + Math.min(fl * .55, 1.4), wc, on);
      if (fz.balcony && F.k > 3) F.rect(u - .2, u + fz.ww + .2, y - .05, y + .35, '#c8c0b0');
      if (fz.lattice && F.k > 4) for (let q = u; q < u + fz.ww; q += .25) F.rect(q, q + .06, y + .2, y + 1.2, '#2a1a10');
    }
  }
  if (fz.band && F.k > 2) for (let y = F.y0 + fl; y < top; y += fl) F.rect(span[0], span[1], y - .08, y + .05, fz.band);
  if (fz.noren && F.k > 2) F.rect(span[0], span[1], F.y0 + 2.4, F.y0 + 2.9, o.accent || '#2a3a7a');
  if (fz.stripe) F.rect(span[0], span[1], F.y0 + 2.6, F.y0 + 3.0, fz.stripe[seed % 3]);
  if (fz.doors && F.k > 1.5) for (let u = base + 1.5; u + 3 < end; u += 7) F.rect(u, u + 3.4, F.y0, F.y0 + Math.min(4, H * .6), '#5a6068');
  F.rect(span[0], span[1], top - .25, top, o.trim || E.tones(o.wall || fz.wall).sh);
} });
/** a building: { s, len (along the line), x (near edge), d (depth away from the line), h, kind, roof: 'flat' | 'gable',
 *  wall, roofCol, seed } -> its box strip */
Art.STRIP.building = p => {
  const fz = FACADES[p.kind] || FACADES.house, x0 = p.x, x1 = p.x + (p.x < 0 ? -p.d : p.d), F = facade(fz, Object.assign({}, p, { len: p.len }));
  const st = S({ kind: 'building', s0: p.s, s1: p.s + p.len, x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: p.y0 || 0, y1: (p.y0 || 0) + p.h, faces: { side: F, end: F, top: p.roofCol || E.tones(p.wall || fz.wall).sh } });
  if (p.roof === 'gable') st.faces.roof = { col: p.roofCol || '#5a5a64', h: Math.min(3, p.d * .35) };
  return st;
};
Art.STRIP.overpass = p => {   // a road bridge over the line: the deck (seen from under), its parapet face and two piers
  const a = p.ext[0] - 60, b = p.ext[1] + 60, h = p.h;
  return [S({ kind: 'overpass', s0: p.s, s1: p.s + p.w, x0: a, x1: b, y0: h, y1: h + 1.2, faces: { under: '#6a6a6e', end: { col: '#a8a8a8', pattern: F => { F.rect(F.x, F.xr, h + .9, h + 1.2, '#d8d8d0'); if (F.k > 2) F.rect(F.x, F.xr, h + .2, h + .3, '#f2c230'); } }, top: '#5a5a5e', side: '#9a9a9a' } }),
    S({ kind: 'pier', s0: p.s + 1, s1: p.s + p.w - 1, x0: p.ext[0] - 4.2, x1: p.ext[0] - 3.2, y0: 0, y1: h, faces: { side: '#a8a8a4', end: '#9a9a96' } }),
    S({ kind: 'pier', s0: p.s + 1, s1: p.s + p.w - 1, x0: p.ext[1] + 3.2, x1: p.ext[1] + 4.2, y0: 0, y1: h, faces: { side: '#a8a8a4', end: '#9a9a96' } })];
};
Art.STRIP.truss = p => S({ kind: 'truss', s0: p.s0, s1: p.s1, x0: p.x, x1: p.x + .3 * Math.sign(p.x || 1), y0: 0, y1: p.h || 6, faces: { side: { col: null, pattern: F => {
  const c = p.col || '#3a7ac8', step = 10;
  F.rect(F.u0, F.u1, F.y1 - .4, F.y1, c); F.rect(F.u0, F.u1, 0, .5, c);
  for (let u = Math.floor(F.u0 / step) * step; u < F.u1 + step; u += step) { F.rect(u - .15, u + .15, 0, F.y1, c); const n = 6; for (let i = 0; i < n; i++) { const a = u + i / n * step, y = (i / n) * F.y1; F.rect(a, a + step / n, y, y + .25, c); } }
}, minK: .5 }, top: p.col || '#3a7ac8' } });
Art.STRIP.flat = p => S({ kind: 'flat', s0: p.s, s1: p.s + p.len, x0: Math.min(p.x0, p.x1), x1: Math.max(p.x0, p.x1), y0: p.y || 0, y1: (p.y || 0) + .02, faces: { top: { col: p.col, pattern: p.pattern } } });
Art.STRIP.box = p => S({ kind: p.kind || 'box', s0: p.s0, s1: p.s1, x0: Math.min(p.x0, p.x1), x1: Math.max(p.x0, p.x1), y0: p.y0 || 0, y1: p.y1, faces: { side: p.side || p.col, end: p.end || p.side || p.col, top: p.top || E.tones(p.col).lt, under: p.under } });
})();
