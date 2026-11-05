/* Densha de Halo! · 12-art: the line-side things and the stations' kit (section 5.6), and the trains as strips and things
 * (section 4.4). Each thing is { s, x, y, kind, data } and draws itself at its projected foot (p.x, p.y) with p.k pixels a
 * metre (levels of detail by k, section 4.1). The signals read their aspects from the rail (set each frame from the sim),
 * the gates from the crossings. */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;
const { px } = E;

const LIT = { R: '#ff3a2a', Y: '#ffc83a', G: '#3ad060' };
const OFF = '#26262e';

DH.Art = {
  /** a four-lamp signal head on a post (Y G R Y from the top), lit by its aspect: positions, not only colour */
  signal(g, p, T, rail, th) {
    const asp = rail.aspects[th.data.id] || 'R', lamps = DH.LAMPS[asp] || DH.LAMPS.R;
    const k = p.k, h = 4.2 * k;
    if (k < 0.35) { px.dot(g, p.x, p.y, T.at('#c8c8d0', p.d, false)); return; }
    px.line(g, p.x, p.y, p.x, p.y - h, T.at('#8a8a92', p.d, false), Math.max(1, Math.round(0.25 * k)));
    const bw = Math.max(2, 1.1 * k), bh = 3.0 * k, bx = p.x - bw / 2, by = p.y - h - bh + k * .3;
    px.rect(g, bx - 1, by - 1, bw + 2, bh + 2, T.at('#15151c', p.d, false));
    const cols = [LIT.Y, LIT.G, LIT.R, LIT.Y];
    for (let i = 0; i < 4; i++) {
      const cy = by + (i + .5) * bh / 4, on = !!lamps[i], c = on ? cols[i] : OFF;
      px.disc(g, p.x, cy, Math.max(1, .42 * k), T.at(c, p.d, on));
      if (on && k > 2) px.blend(g, .35, 'add', () => px.disc(g, p.x, cy, Math.max(2, 1.2 * k), c));
    }
    if (k > 4) E.font.text(g, asp, p.x + bw + 2, by + bh / 2 - 3, T.at('#f2c230', p.d, false), { scale: 1 });
  },
  /** a white limit board with its speed (or the END board) */
  limit(g, p, T, rail, th) {
    const k = p.k; if (k < 0.8) { px.dot(g, p.x, p.y, '#f0f0f0'); return; }
    const h = 2.3 * k, w = 1.5 * k, x0 = p.x - w / 2, y0 = p.y - h - .9 * k;
    px.line(g, p.x, p.y, p.x, y0 + 1.2 * k, T.at('#8a8a92', p.d, false), 1);
    px.rect(g, x0 - 1, y0 - 1, w + 2, 1.2 * k + 2, '#202020');
    px.rect(g, x0, y0, w, 1.2 * k, T.at('#f4f4ec', p.d, false));
    if (k > 3) E.font.text(g, th.data.end ? 'END' : String(th.data.v), p.x, y0 + .2 * k, '#101010', { align: 'center', scale: 1 });
  },
  /** a rectangular board with a label: horn, approach ('STOP'/'PASS'), stop marks ('6', '10') */
  board(g, p, T, rail, th) {
    const k = p.k; if (k < 0.8) { px.dot(g, p.x, p.y, '#ffd23a'); return; }
    const d = th.data, h = 2.5 * k, w = 1.4 * k, x0 = p.x - w / 2, y0 = p.y - h - 1.0 * k;
    px.line(g, p.x, p.y, p.x, y0 + h, T.at('#8a8a92', p.d, false), 1);
    px.rect(g, x0 - 1, y0 - 1, w + 2, h + 2, '#101010');
    px.rect(g, x0, y0, w, h, T.at(d.color || '#ffd23a', p.d, false));
    if (k > 3) E.font.text(g, d.label, p.x, y0 + h / 2 - 3, T.at('#101010', p.d, false), { align: 'center', scale: k > 6 ? 2 : 1 });
  },
  /** a km post: white with black figures */
  km(g, p, T, rail, th) {
    const k = p.k; if (k < 1) return;
    px.rect(g, p.x - Math.max(1, .15 * k), p.y - 1.4 * k, Math.max(2, .3 * k), 1.4 * k, T.at('#e8e8e8', p.d, false));
    if (k > 4) E.font.text(g, th.data.label, p.x, p.y - 1.5 * k - 2, T.at('#101010', p.d, false), { align: 'center', scale: 1 });
  },
  /** a catenary mast: a lattice of two legs and a cross-arm */
  mast(g, p, T, rail, th) {
    const k = p.k; if (k < 1) return;
    const h = 7.2 * k, c = T.at('#6a6a72', p.d, false);
    px.line(g, p.x - .8 * k, p.y, p.x - .25 * k, p.y - h, c, 1);
    px.line(g, p.x + .8 * k, p.y, p.x + .25 * k, p.y - h, c, 1);
    px.line(g, p.x - 1.2 * k, p.y - h + 1.0 * k, p.x + 1.2 * k, p.y - h + 1.0 * k, c, 1);
    if (k > 3) { px.line(g, p.x - .5 * k, p.y - .5 * k, p.x + .5 * k, p.y - h * .6, c, 1); px.line(g, p.x + .5 * k, p.y - .5 * k, p.x - .5 * k, p.y - h * .6, c, 1); }
  },
  /** a utility pole with a cross-arm */
  pole(g, p, T, rail, th) {
    const k = p.k; if (k < 1) return;
    const h = 8 * k, c = T.at('#5a4a3a', p.d, false);
    px.line(g, p.x, p.y, p.x, p.y - h, c, Math.max(1, Math.round(.25 * k)));
    px.rect(g, p.x - 1.2 * k, p.y - h + .6 * k, 2.4 * k, Math.max(1, .3 * k), c);
  },
  /** a street lamp: a pole and a head that glows at night */
  lamp(g, p, T, rail, th) {
    const k = p.k; if (k < 1) return;
    const h = 6.5 * k;
    px.line(g, p.x, p.y, p.x, p.y - h, T.at('#8a8a94', p.d, false), Math.max(1, Math.round(.22 * k)));
    const lit = rail.grade && rail.grade.night > .3;
    px.disc(g, p.x + .6 * k, p.y - h, Math.max(1, .45 * k), T.at(lit ? '#fff0b0' : '#c8c8c0', p.d, lit));
    if (lit && k > 2) px.blend(g, .3, 'add', () => px.disc(g, p.x + .6 * k, p.y - h, Math.max(2, 2.2 * k), '#ffe6a0'));
  },
  /** a tree: a rounded crown (or a cone for a pine) on a trunk */
  tree(g, p, T, rail, th) {
    const d = th.data, k = p.k; if (k < .6) { px.dot(g, p.x, p.y, T.at(d.leaf, p.d, false)); return; }
    const h = 4.5 * d.sz * k, r = Math.max(1, 1.6 * d.sz * k);
    px.rect(g, p.x - .25 * k, p.y - h * .45, Math.max(1, .5 * k), h * .45, T.at(d.trunk, p.d, false));
    if (d.shape === 'pine' || d.shape === 'cedar') px.poly(g, [[p.x, p.y - h], [p.x + r, p.y - h * .35], [p.x - r, p.y - h * .35]], T.at(d.leaf, p.d, false));
    else px.disc(g, p.x, p.y - h * .65, r, T.at(d.leaf, p.d, false));
  },
  /** a crossing gate: a post on each side and a striped arm, down (across the road) or up */
  gate(g, p, T, rail, th) {
    const k = p.k; if (k < 1) return;
    const down = rail.gates[th.data.id] || 0, arm = 4.6 * k, post = 1.2 * k;
    for (const side of [-1, 1]) {
      const bx = p.x + side * 4.4 * k;
      px.line(g, bx, p.y, bx, p.y - post * 2.2, T.at('#e8e8e8', p.d, false), Math.max(1, Math.round(.3 * k)));
      const ax = bx - side * arm * (1 - down * .02), ay = p.y - post * 2.2 + down * 1.1 * k;
      px.line(g, bx, p.y - post * 2.2, ax, ay - (1 - down) * 0 + (down ? 0 : arm * .0), T.at(down ? '#f0f0f0' : '#f0f0f0', p.d, false), Math.max(1, Math.round(.25 * k)));
    }
    const lamp = rail.lamps && rail.lamps[th.data.id];
    if (lamp && k > 1) px.disc(g, p.x - 4.4 * k, p.y - post * 2.6, Math.max(1, .45 * k), T.at('#ff3a2a', p.d, true));
  },
  /** the front of a train: a nose with its windscreen and lamps, facing the viewer when the viewer is ahead of it */
  nose(g, p, T, rail, th) {
    const k = p.k, d = th.data; if (k < .6) { px.dot(g, p.x, p.y, T.at(d.livery, p.d, false)); return; }
    const w = 1.45 * k, h = 3.5 * k, x0 = p.x - w, y0 = p.y - h - .3 * k;
    px.rect(g, x0 - 1, y0 - 1, 2 * w + 2, h + 2, T.at('#20202a', p.d, false));
    px.rect(g, x0, y0, 2 * w, h, T.at(d.livery, p.d, false));
    px.rect(g, x0 + w * .3, y0 + h * .12, w * 1.4, h * .32, T.at('#1c2a3c', p.d, false));
    px.rect(g, x0 + w * .2, y0 + h * .58, w * .5, h * .42, T.at(d.stripe, p.d, false));
    if (k > 2) {
      const lc = d.front ? '#fff8d0' : '#ff3a2a';
      px.disc(g, x0 + w * .35, y0 + h * .48, Math.max(1, .3 * k), T.at(lc, p.d, true));
      px.disc(g, x0 + w * 1.65, y0 + h * .48, Math.max(1, .3 * k), T.at(lc, p.d, true));
      if (d.front && k > 3) px.blend(g, .32, 'add', () => { px.disc(g, x0 + w * .35, y0 + h * .48, Math.max(2, 1.8 * k), '#ffffe0'); px.disc(g, x0 + w * 1.65, y0 + h * .48, Math.max(2, 1.8 * k), '#ffffe0'); });
    }
    if (d.dest && k > 4) E.font.text(g, d.dest, p.x, y0 + h * .05, '#ffb040', { align: 'center', scale: 1 });
  },
  /** a passenger or a staff member: a head and a body, shaded, and a briefcase or an umbrella by its look */
  figure(g, p, T, rail, th) {
    const k = p.k; if (k < 1.2) { px.dot(g, p.x, p.y, T.at(th.data.body, p.d, false)); return; }
    const d = th.data, h = d.h * k, hw = .28 * k;
    px.rect(g, p.x - hw, p.y - h * .58, hw * 2, h * .58, T.at(d.body, p.d, false));
    px.disc(g, p.x, p.y - h * .72, Math.max(1, .17 * k), T.at(d.skin, p.d, false));
    if (d.staff) px.rect(g, p.x - hw - 1, p.y - h * .62, 2, 2, '#ffffff');
    if (d.umbrella && k > 3) px.line(g, p.x + hw + 1, p.y - h * .6, p.x + hw + 1, p.y, T.at('#1a1a22', p.d, false), 1);
  },
  /** the platform's name board: white with black romaji and an English line */
  name(g, p, T, rail, th) {
    const k = p.k; if (k < 2) return;
    const w = 6.0 * k, h = 1.2 * k, x0 = p.x - w / 2, y0 = p.y - 3.4 * k;
    px.rect(g, x0 - 1, y0 - 1, w + 2, h + 2, '#303030');
    px.rect(g, x0, y0, w, h, T.at('#f6f6f0', p.d, false));
    if (k > 4) E.font.text(g, th.data.name.slice(0, 16), p.x, y0 + h * .3, '#1a1a1a', { align: 'center', scale: k > 8 ? 2 : 1 });
  }
};

/** a train's cars as strips (the body, its livery and window bands) and its front and rear as things. Opts: { livery, stripe,
 *  dest, front: noses face the viewer }. Returns { carSpans(): [[segment index, item]] } for the rail. */
DH.trainWrap = (route, train) => {
  const spec = train.spec || DH.TRAINS.h8000;
  return {
    get dir() { return train.dir; },
    carSpans() {
      const out = [], dir = train.dir || 1, L = spec ? spec.carLen || 20 : 20, cars = train.cars || (train.length / L) || 6;
      const front = train.s, lane = train.lane || 'A';
      const x = route.laneX(Math.max(route.from, Math.min(route.to - 1, front)), lane);
      const livery = train.livery || (spec && spec.livery) || '#c9ced6', stripe = (spec && spec.stripe) || '#f2c230';
      for (let j = 0; j < cars; j++) {
        const a = front - dir * j * L - dir * 0.6 * (j > 0 ? 1 : 0), b = a - dir * (L - 1.2);
        const s0 = Math.min(a, b), s1 = Math.max(a, b);
        const body = { s0, s1, x0: x - 1.45, x1: x + 1.45, y0: .4, y1: 3.9, c: livery, top: '#8a8e98', side_c: livery, caps: false,
          lines: [{ y0: 1.7, y1: 2.6, c: '#1c2638' }, { y0: .95, y1: 1.1, c: stripe }], kind: 'train' };
        if (j === 0 && spec && spec.cab === 'classic') body.lines.push({ y0: 2.9, y1: 3.2, c: '#f2e8c8' });
        for (const k of rangeSegs(route, s0, s1)) out.push([k, { strip: body }]);
        // a pantograph on every other car
        if (j % 2 === 0) { const pm = { s: (s0 + s1) / 2, x, y: 3.9, kind: 'pantograph', data: {}, R: null }; const k = route.at(pm.s); if (k >= 0) out.push([k, { thing: Object.assign(pm, { draw: pantograph }) }]); }
      }
      // the nose: the front of the leading car, and the rear of the last one
      const kf = route.at(front), noseFace = dir;
      if (kf >= 0) out.push([kf, { thing: { s: front, x, y: 0, kind: 'nose', data: { livery, stripe, front: true, dir: noseFace, dest: 'HALO LINE' }, draw: DH.Art.nose } }]);
      const rear = front - dir * cars * L; const kr = route.at(rear);
      if (kr >= 0) out.push([kr, { thing: { s: rear, x, y: 0, kind: 'tail', data: { livery, stripe, front: false }, draw: DH.Art.nose } }]);
      return out;
    }
  };
};
function pantograph(g, p, T) {
  const k = p.k; if (k < 1) return;
  px.line(g, p.x, p.y, p.x - .8 * k, p.y - 1.3 * k, T.at('#202028', p.d, false), 1);
  px.line(g, p.x - .8 * k, p.y - 1.3 * k, p.x + .8 * k, p.y - 1.3 * k, T.at('#202028', p.d, false), 1);
}
function rangeSegs(route, s0, s1) {
  const out = [], a = route.at(Math.max(route.from, s0)), b = route.at(Math.min(route.to - 1, s1));
  if (a < 0 || b < 0) return out;
  for (let k = a; k <= b; k++) out.push(k);
  return out;
}

/** the line-side kit for a route: the signals, the boards, the stations' platforms and canopies, the crossings. Call once
 * after DH.buildScenery(route). */
DH.placeLineside = (route) => {
  const segs = route.segs, n = segs.length;
  const put = (s, x, kind, data, extra) => { const k = Math.floor((s - route.from) / DH.SEG); if (k >= 0 && k < n) segs[k].things.push(Object.assign({ s, x, y: 0, kind, data }, extra || {})); };
  const pushStrip = (st) => DH.attachStrip(route, st);
  // signals (on the left of our track; the start, home and block heads), the aspects are read from the rail each frame
  for (const g of route.signals) put(g.s, -2.9, 'signal', { id: g.id, kind: g.kind }, { draw: DH.Art.signal });
  for (const L of route.limits) {
    if (L.end === null) continue;
    put(L.s, -2.9, 'limit', { v: L.v }, { draw: DH.Art.limit });
    put(L.end, -2.9, 'limit', { v: L.v, end: true }, { draw: DH.Art.limit });
  }
  for (const h of route.horns) put(h.s, -2.9, 'board', { label: 'HORN', color: '#8ab0e0' }, { draw: DH.Art.board });
  for (const st of route.stations) {
    if (st.pass) { put(st.start - 400, -2.9, 'board', { label: 'PASS', color: '#ffffff' }, { draw: DH.Art.board }); continue; }
    put(st.start - 400, -2.9, 'board', { label: 'STOP', color: '#ffffff' }, { draw: DH.Art.board });
    for (const [count, s] of Object.entries(st.stops || {})) put(s, -2.9, 'board', { label: count, color: '#ffd23a' }, { draw: DH.Art.board });
    // the platform: a raised slab beside our track (island platforms on both sides in the quad section)
    const sides = st.side === 'I' ? [[-5.4, -1.6], [8.6, 12.4]] : st.side === 'R' ? [[1.9, 3.1]] : [[-5.8, -1.8]];
    for (const [x0, x1] of sides) {
      pushStrip(DH.box(st.start, st.end, x0, x1, 0, 1.1, '#b4b0a6', { top: '#c8c4ba', under: '#6a665e', side_c: '#8a8478', caps: true, kind: 'platform' }));
      // the canopy over it: a thin roof on columns every 12 m
      pushStrip(DH.box(st.start + 4, st.end - 4, x0 - .6, x1 + .6, 3.6, 3.9, '#6a7a8a', { top: '#8a9aaa', under: '#4a5868', caps: false, kind: 'canopy' }));
      for (let s = st.start + 4; s < st.end - 4; s += 12) pushStrip(DH.box(s, s + .5, x0 - .6, x0 - .3, 0, 3.6, '#9aa0a8', { caps: false, kind: 'column' }));
      put(st.start + (st.end - st.start) * .5, x0 + (x1 - x0) / 2, 'name', { name: st.name || st.id }, { draw: DH.Art.name });
    }
  }
  // the crowds: a seeded set of figures per station, by its crowd level, and a staff member at the head end (section 4.10)
  const BODIES = ['#2a2a38', '#2a4a7a', '#7a3a3a', '#3a6a4a', '#6a5a2a', '#4a3a6a'], SKIN = ['#e8c8a8', '#dcb898', '#c8a078', '#f0d0b0'];
  for (const st of route.stations) {
    if (st.pass || !st.crowd) continue;
    const R = DH.rng('crowd:' + route.id + ':' + st.id), n = st.crowd * 4;
    for (let i = 0; i < n; i++) {
      const s = st.start + 8 + R() * (st.end - st.start - 16), side = st.side === 'R' ? [2.6] : st.side === 'I' ? (R() < .5 ? [-3.5] : [10.5]) : [-3.2];
      put(s, side[0] + (R() - .5) * .8, 'figure', { body: DH.pick(R, BODIES), skin: DH.pick(R, SKIN), h: 1.6 + R() * .25, umbrella: R() < .08 }, { draw: DH.Art.figure });
    }
    put(st.start + 6, -3.2, 'figure', { body: '#1c2a52', skin: '#e8c8a8', h: 1.75, staff: true }, { draw: DH.Art.figure });
  }
  for (const c of route.crossings) put(c.s - 12, -4.8, 'lamp', {}, { draw: DH.Art.lamp });
  for (const c of route.crossings) put(c.s, 0, 'gate', { id: c.id }, { draw: DH.Art.gate });
  for (const m of route.marks || []) put(m.s, -2.9, 'board', { label: m.label, color: '#ffd23a' }, { draw: DH.Art.board });
  for (const w of route.workers || []) put(w.s, -2.9, 'board', { label: w.limit + '', color: '#ffd23a' }, { draw: DH.Art.board });
  // the km posts and masts are in the scenery already; the trees and poles are too
  return route;
};
})();
