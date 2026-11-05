/* Densha de Halo! · 10-rail: the pseudo-3D railway renderer (DH.Rail). A fork of the engine's road module (OutRun-style
 * segments), extended for what a railway needs: several tracks, raised platforms, long side objects (trains, buildings),
 * tunnels and bridges, a rear camera, square pixels on wide screens, and a time-of-day grade and fog.
 *
 * Model: the route is a run of 5 m segments. Each segment's bend (its lateral position), height and lanes are absolute
 * world values, so drawing needs no accumulation. Painting runs far to near; each segment paints its ground, its track
 * beds and rails, then its strips (extruded boxes: platforms, buildings, trains, tunnels, overpasses) and things (points:
 * signals, boards, trees), sorted by lateral distance. Crests hide what lies behind them (the same two-pass rule as road.js).
 *
 * Projection (section 4.1): depth = 1 / tan(fov/2); scale = depth / d; sx = cx + dir * scale * (wx - camX) * hw;
 * sy = cy - scale * (wy - camY) * hw. hw is the half width in pixels for both axes: square pixels on any screen. */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;
const SEG = DH.SEG;

/* ---- the time of day: keyframes blended linearly, so the grade is continuous at every hour (section 4.12) ---- */
const TOD_KEYS = [
  [0, '#060818', '#1a2440', .30, 0], [4.5, '#060818', '#1a2440', .30, 0], [6, '#2a2850', '#f0a080', .70, .6],
  [8, '#3a78d8', '#bfe0ff', 1.0, 0], [14, '#3a78d8', '#bfe0ff', 1.0, 0], [15.5, '#5a8ad0', '#e8e0c8', .95, 0],
  [17, '#3a2a6a', '#ff9a4a', .75, .4], [18.5, '#3a2a6a', '#ff9a4a', .75, .4], [19.5, '#060818', '#1a2440', .30, 0], [24, '#060818', '#1a2440', .30, 0]
];
DH.todGrade = (hour) => {
  const h = ((hour % 24) + 24) % 24;
  let i = 0; while (i < TOD_KEYS.length - 2 && TOD_KEYS[i + 1][0] <= h) i++;
  const a = TOD_KEYS[i], b = TOD_KEYS[i + 1], u = DH.clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  const top = DH.mix(a[1], b[1], u), horizon = DH.mix(a[2], b[2], u), amb = a[3] + (b[3] - a[3]) * u, warm = a[4] + (b[4] - a[4]) * u;
  const night = DH.clamp((0.95 - amb) / 0.65, 0, 1);
  return { top, horizon, amb, warm, night, mul: [amb * (1 + warm * .15), amb * (1 - warm * .05), amb * (1 - night * .35 + night * .25) * (1 - night * .1)] };
};

/* ---- shapes made of strips: a box in route metres, with a face colour set ---- */
DH.box = (s0, s1, x0, x1, y0, y1, c, extra = {}) => Object.assign({ s0, s1, x0, x1, y0, y1, c, caps: true }, extra);
/** attach a strip to every segment it spans (the painter clips it to each segment) */
DH.attachStrip = (route, st) => {
  const n = route.segs.length, a = Math.max(0, Math.floor((st.s0 - route.from) / SEG)), b = Math.min(n - 1, Math.floor((st.s1 - route.from) / SEG));
  for (let k = a; k <= b; k++) route.segs[k].strips.push(st);
  return st;
};

/* ---- the scenery builder: per zone, a seeded stream per 50 m cell and side (section 4.2) ---- */
const KIND = {
  office: { h: [22, 48], c: '#8fa0b8', top: '#5a6878', win: 'grid', w: [16, 26] }, store: { h: [7, 11], c: '#c8b090', top: '#8a7a68', win: 'grid', w: [14, 22] },
  hotel: { h: [14, 26], c: '#e0d4c0', top: '#7a6a5a', win: 'grid', w: [12, 18] }, house: { h: [6, 8], c: '#c8c0b0', top: '#a04a32', win: 'house', w: [9, 13], roof: true },
  apartment: { h: [11, 18], c: '#d8d0c0', top: '#7a7068', win: 'grid', w: [14, 20] }, greenhouse: { h: [3.2, 3.2], c: '#a8d8b8', top: '#8ac8a0', win: 'none', w: [16, 22] },
  konbini: { h: [4.2, 4.2], c: '#f0f0f0', top: '#4a7ab8', win: 'shop', w: [8, 10] }, warehouse: { h: [8, 10], c: '#8a8e96', top: '#5a5e66', win: 'door', w: [22, 36] },
  container: { h: [5, 8], c: '#c0543a', top: '#8a3a2a', win: 'none', w: [12, 24], stack: true }, machiya: { h: [7, 9], c: '#4a3a2a', top: '#2a2420', win: 'grid', w: [10, 14], roof: true },
  shop: { h: [5, 6], c: '#b8a080', top: '#6a5a48', win: 'shop', w: [8, 12] }, terrace: { h: [6.5, 7.5], c: '#d6c8b0', top: '#7a6a5a', win: 'grid', w: [12, 18] },
  arcade: { h: [6, 9], c: '#2a2a48', top: '#1a1a30', win: 'neon', w: [18, 30] }, tower: { h: [40, 70], c: '#b8c4d4', top: '#7a8494', win: 'grid', w: [14, 22] },
  campus: { h: [12, 20], c: '#d0c8b8', top: '#7a7068', win: 'grid', w: [20, 34] }, pavilion: { h: [6, 6], c: '#e8e0d0', top: '#7a3a2a', win: 'none', w: [12, 16], roof: true },
  farm: { h: [6, 6], c: '#e0d8c0', top: '#4a3a2a', win: 'house', w: [10, 14], roof: true }, shed: { h: [4, 5], c: '#7a6a5a', top: '#4a4038', win: 'none', w: [8, 14], roof: true },
  depotshed: { h: [6, 6], c: '#8a8e96', top: '#5a5e66', win: 'door', w: [18, 30], roof: true }
};
const TREE = { tree: ['#3a7a3a', '#6a4a2a', 1], pine: ['#2a5a38', '#4a3a2a', 1.4], cedar: ['#2a4a34', '#3a2a22', 1.3], sakura: ['#f0a8c0', '#5a3a2a', 1.1], ginkgo: ['#c8c040', '#5a4a2a', 1.1], maple: ['#c85a30', '#4a3a2a', 1.0] };

DH.buildScenery = (route) => {
  const segs = route.segs, n = segs.length;
  const blocked = k => { const f = segs[k].flags; return !!(f.station || f.tunnel || f.bridge || f.crossing || f.viaduct); };
  const cells = Math.ceil((route.to - route.from) / 50);
  for (let c = 0; c < cells; c++) {
    const s0 = route.from + c * 50, k0 = Math.floor((s0 - route.from) / SEG), k1 = Math.min(n - 1, k0 + 9);
    let ok = true; for (let k = k0; k <= k1; k++) if (blocked(k)) ok = false;
    if (!ok || k0 < 0 || k0 >= n) continue;
    const zone = DH.ZONES[segs[k0].zone] || DH.ZONES.downtown;
    for (const side of [-1, 1]) {
      const R = DH.rng('scen:' + route.id + ':' + c + ':' + side);
      if (R() > zone.density) continue;
      const pick = R();
      let acc = 0, kind = zone.houses[0][0];
      const tot = zone.houses.reduce((a, b) => a + b[1], 0);
      for (const [kd, wgt] of zone.houses) { acc += wgt / tot; if (pick <= acc) { kind = kd; break; } }
      const kc = segs[k0 + 5].lanes, lanesX = kc.map(l => l.x), maxX = Math.max(...lanesX), minX = Math.min(...lanesX);
      const xNear = side < 0 ? Math.min(minX, 0) - 9 : Math.max(maxX, 0) + 9;
      const sA = s0 + R() * 14 + 2, dx = R() * 4;
      const x0 = side < 0 ? xNear - dx : xNear + dx;
      const sg = segs[k0];
      if (TREE[kind]) {
        const [leaf, trunk, sc] = TREE[kind];
        const sz = 3.2 * sc * (0.8 + R() * 0.5);
        placeTree(route, sg.s0 + R() * 40 + 2, x0 + (side < 0 ? -2 : 2), kind, leaf, trunk, sz, R);
        continue;
      }
      const K = KIND[kind];
      if (!K) continue;
      const h = K.h[0] + R() * (K.h[1] - K.h[0]), wd = K.w[0] + R() * (K.w[1] - K.w[0]);
      const b = DH.box(sA, sA + wd, x0 - 0.5 * side * 0, x0 + (side < 0 ? -12 : 12), 0, h, K.c, { top: K.top, win: K.win, kind, roof: !!K.roof, side, cap: K.roof ? '#5a5048' : null, floor: 3 + R() * 1 });
      b.x0 = Math.min(b.x0, b.x1); b.x1 = Math.max(b.x0, b.x1);
      if (side < 0) { b.x1 = xNear - dx; b.x0 = b.x1 - 9 - R() * 6; } else { b.x0 = xNear + dx; b.x1 = b.x0 + 9 + R() * 6; }
      if (!blocked(Math.floor((sA - route.from) / SEG))) DH.attachStrip(route, b);
      if (K.stack) for (let j = 0; j < 3; j++) {
        const yy = 0, sx0 = sA + j * 6, bb = DH.box(sx0, sx0 + 5.5, b.x0, b.x1, 0, 2.6 + R() * 2.4, ['#c0543a', '#3a6aa8', '#d8a030', '#4a8a5a'][Math.floor(R() * 4)], { top: '#3a3a3a', win: 'none', kind: 'container' });
        bb.y0 = yy; DH.attachStrip(route, bb);
      }
    }
  }
  // the zone's street trees and poles along the line, every 40 m on the side that's free
  for (let k = 0; k < n; k += 8) {
    const sg = segs[k], zone = DH.ZONES[sg.zone] || DH.ZONES.downtown;
    if (blocked(k)) continue;
    const R = DH.rng('pole:' + route.id + ':' + k), x = -3.2;
    if (zone.props.includes('pole') && k % 16 === 0) placeThing(route, sg.s0 + 1, x, 'pole', null, R);
    if (zone.props.includes('lamp') && k % 32 === 0) placeThing(route, sg.s0 + 1, -3.4, 'lamp', null, R);
  }
  // km posts every 100 m on the left, catenary masts every 50 m
  for (let s = Math.ceil(route.from / 100) * 100; s < route.to; s += 100) placeThing(route, s, -3.6, 'km', { label: (s / 1000).toFixed(1) });
  for (let s = Math.ceil(route.from / 50) * 50; s < route.to; s += 50) {
    const k = Math.floor((s - route.from) / SEG);
    if (k >= 0 && k < n && !segs[k].flags.station) placeThing(route, s, -3.0, 'mast', null);
  }
  return route;
};
function placeThing(route, s, x, kind, data, R) {
  const k = Math.floor((s - route.from) / SEG);
  if (k < 0 || k >= route.segs.length) return;
  route.segs[k].things.push({ s, x, kind, data: data || null, R: R || null, y: 0 });
}
function placeTree(route, s, x, kind, leaf, trunk, sz, R) {
  const k = Math.floor((s - route.from) / SEG);
  if (k < 0 || k >= route.segs.length) return;
  route.segs[k].things.push({ s, x, kind: 'tree', data: { leaf, trunk, sz, shape: kind }, R, y: 0 });
}

/* ---- colour through the air: fog to the horizon by distance, then the grade. Emissive things skip the grade ---- */
class Tint {
  constructor() { this.cache = new Map(); this.key = ''; }
  reset(grade, fogDist, density) { this.grade = grade; this.fogDist = fogDist; this.density = density; this.cache.clear(); this.key = grade.horizon + fogDist + density; }
  at(hex, d, emissive) {
    const b = Math.round(Math.min(d, 2000) / 25), key = hex + '|' + b + (emissive ? 'e' : '');
    let v = this.cache.get(key); if (v) return v;
    const f = 1 - Math.exp(-((d / this.fogDist) ** 2) * this.density);
    let c = f > 0.003 ? DH.mix(hex, this.grade.horizon, Math.min(1, f)) : hex;
    if (!emissive) { const m = this.grade.mul, r = DH.rgb(c); c = DH.hexOf([r[0] * m[0], r[1] * m[1], r[2] * m[2]]); }
    this.cache.set(key, c); return c;
  }
}

/* ---- the renderer ---- */
class Rail {
  constructor(route, o = {}) {
    this.route = route; this.o = Object.assign({ fov: 75, horizon: .4 }, o);
    this.tint = new Tint(); this.cam = null; this.picks = []; this.crest = new Float64Array(DH.DRAW_SEGS + 2);
    this.aspects = {}; this.gates = {}; this.lamps = {}; this.flash = 0; this.wipe = 0;
    this.stats = { segs: 0, strips: 0, things: 0 };
  }
  /** the route's segment index of a route distance (clamped) */
  idx(s) { return DH.clamp(Math.floor((s - this.route.from) / SEG), 0, this.route.segs.length - 1); }

  /** world geometry at a route distance inside the frame: the bend, height and the lanes' x (interpolated) */
  geo(s) {
    const segs = this.route.segs, k = this.idx(s), sg = segs[k], u = DH.clamp((s - sg.s0) / SEG, 0, 1);
    const bS = sg.bend - SEG * Math.sin(sg.heading || 0), bE = sg.bend;
    return { b: bS + (bE - bS) * u, y: sg.y0 + (sg.y1 - sg.y0) * u, u, sg };
  }

  /** project a world point (s route metres, x across relative to its bend, y above its track) for the last camera */
  pt(s, x, yrel, cam = this.cam) {
    const g = this.geo(s), d = cam.dir * (s - cam.s);
    if (d < 0.4) return null;
    const sc = cam.depth / d, wx = g.b + x, wy = g.y + yrel;
    return { x: cam.cx + cam.dir * sc * (wx - cam.X) * cam.hw, y: cam.cy - sc * (wy - cam.Y) * cam.hw, k: sc * cam.hw, d };
  }
  /** a point's screen position for the last drawn camera: [sx, sy, pixels per metre] or null */
  project(s, x, y = 0) {
    if (!this.cam) return null;
    const p = this.pt(s, x, y); return p ? [p.x, p.y, p.k] : null;
  }
  /** true when the point isn't hidden by a crest or a tunnel wall */
  visible(s, x, y = 0) {
    const p = this.project(s, x, y); if (!p || !this.cam) return false;
    const k = this.idx(s) - this.cam.k0, j = Math.max(0, Math.min(DH.DRAW_SEGS, Math.abs(k)));
    return p[1] >= this.crest[j] && p[0] > this.cam.vp.x && p[0] < this.cam.vp.x + this.cam.vp.w;
  }
  /** the thing under a screen point (drawn last frame), nearest first */
  pick(sx, sy) {
    let best = null, bd = 1e9;
    for (const p of this.picks) { const d = Math.hypot(sx - p.x, sy - p.y); if (d < p.r && d < bd) { best = p; bd = d; } }
    return best ? best.ref : null;
  }

  /** the drawn camera: { s, x, h, dir, fov, horizon, lookX, lookY, pitchPx } -> the full projection state */
  makeCam(r, c) {
    const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H };
    const s = DH.clamp(c.s, this.route.from, this.route.to - 1), dir = c.dir || 1;
    const fov = c.fov || this.o.fov, depth = 1 / Math.tan(fov / 2 * Math.PI / 180), hw = vp.w / 2;
    const g = this.geo(s), X = g.b + (c.x || 0), Y = g.y + (c.h === undefined ? 2.9 : c.h);
    const hz = c.horizon === undefined ? this.o.horizon : c.horizon;
    const cam = { s, dir, depth, hw, X, Y, vp, k0: this.idx(s), fov,
      cx: vp.x + vp.w / 2 + (c.lookX || 0) * vp.w, cy: vp.y + vp.h * hz + (c.lookY || 0) * vp.h + (c.pitchPx || 0) };
    return cam;
  }

  /** draw the railway: c = the camera, o = { trains: [...], tod, weather, fogDist, t, hideTrain, gates, aspects, flash } */
  draw(r, c, o = {}) {
    const route = this.route, segs = route.segs, vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H };
    const cam = this.cam = this.makeCam(r, c), dir = cam.dir, t = o.t || 0;
    const grade = o.grade || DH.todGrade(o.hour === undefined ? 12 : o.hour);
    const fogDist = o.fogDist || 900, density = o.density || 5;
    this.tint.reset(grade, fogDist, density);
    const wet = !!o.wet, flash = o.flash || 0;
    this.picks = [];
    // the segments in view, far to near; dynamic strips (trains) attach to the segments they cover
    const dyn = new Map(), addDyn = (k, item) => { if (k < 0 || k >= segs.length) return; (dyn.get(k) || dyn.set(k, []).get(k)).push(item); };
    for (const tr of o.trains || []) if (tr !== o.hideTrain) tr.carSpans && tr.carSpans().forEach(([k, item]) => addDyn(k, item));
    const near = [];
    let maxy = vp.y + vp.h;
    for (let j = 0; j < DH.DRAW_SEGS; j++) {
      const k = cam.k0 + dir * j; if (k < 0 || k >= segs.length) break;
      const sg = segs[k], sA = sg.s0, sB = sg.s0 + SEG;
      const ns = dir > 0 ? sA : sB, fs = dir > 0 ? sB : sA;
      // the near end is clamped to just ahead of the camera (the road under it runs to the screen's bottom)
      const nsC = dir > 0 ? Math.max(ns, cam.s + .5) : Math.min(ns, cam.s - .5);
      const fsC = dir > 0 ? Math.max(fs, cam.s + .5) : Math.min(fs, cam.s - .5);
      const p1 = this.pt(nsC, 0, 0), p2 = this.pt(fsC, 0, 0);
      if (!p1 || !p2) break;
      const show = !!(p1 && p2.y < p1.y && p2.y < maxy);
      near.push({ k, sg, p1, p2, show, maxy });
      this.crest[j] = maxy;
      if (show) maxy = p2.y;
    }
    this.crest[DH.DRAW_SEGS] = maxy;
    // the sky
    r.overlay(g => {
      const H = vp.h, top = vp.y;
      const bands = 14;
      for (let b = 0; b < bands; b++) {
        const u = b / bands, colr = DH.mix(grade.top, grade.horizon, Math.pow(u, 1.4));
        const y0 = top + Math.floor(H * cam.cy / H * u * .9), y1 = top + Math.floor(H * cam.cy / H * (b + 1) / bands * .9) + 1;
        E.px.rect(g, vp.x, y0, vp.w, Math.max(1, y1 - y0), colr);
      }
      E.px.rect(g, vp.x, vp.y, vp.w, Math.max(1, Math.ceil(cam.cy) - vp.y), grade.top);
    });
    // far to near: the painting
    r.overlay(g => {
      this.g = g; this.r = r; this.vp = vp; this.grade = grade; this.wet = wet; this.flash = flash;
      for (let i = near.length - 1; i >= 0; i--) {
        const N = near[i]; if (!N.show) continue;
        this.paintSeg(g, N, dyn.get(N.k) || [], o, t);
      }
      this.paintLight(g, o, t);
    });
    this.stats = { segs: near.length, strips: 0, things: 0 };
    return this;
  }

  /** one segment: its ground, its track beds and rails, its strips and things, the catenary */
  paintSeg(g, N, dynList, o, t) {
    const { sg, p1, k } = N, T = this.tint, cam = this.cam, grade = this.grade;
    const water = sg.flags.bridge, viaduct = sg.flags.viaduct || 0;
    const gyOff = water ? -8 : -viaduct;
    const zone = DH.ZONES[sg.zone] || DH.ZONES.downtown;
    // 1. ground: a full-width band between its two ends (water on bridges, a lower ground under a viaduct)
    const gA = this.pt(sg.s0, 0, gyOff), gB = this.pt(sg.s0 + SEG, 0, gyOff);
    const gcol = water ? '#2a5a88' : ((k % 4) < 2 ? zone.ground : zone.grass);
    const gC = T.at(gcol, p1.d, false), gw = this.vp;
    if (gA && gB) E.px.poly(g, [[gw.x - 4, gB.y], [gw.x + gw.w + 4, gB.y], [gw.x + gw.w + 4, gA.y], [gw.x - 4, gA.y]], gC);
    if (water) {   // glints on the water
      for (let i = 0; i < 2; i++) { const q = this.pt(sg.s0 + SEG * (0.3 + i * 0.4), -20 + ((t * 9 + k * 3) % 40), -7.6); if (q) E.px.rect(g, q.x, q.y, Math.max(1, q.k * 2), 1, T.at('#c8e8ff', q.d, true)); }
    }
    // 2. track beds and rails, one per lane. Crossings get a road band across the whole width
    for (const L of sg.lanes) {
      const bed = T.at('#5a5650', p1.d, false), bedW = 1.6;
      const a = this.pt(sg.s0, L.x - bedW, sg.y0), b = this.pt(sg.s0 + SEG, L.x - bedW, sg.y1);
      const c = this.pt(sg.s0, L.x + bedW, sg.y0), e = this.pt(sg.s0 + SEG, L.x + bedW, sg.y1);
      if (a && b && c && e) E.px.poly(g, [[a.x, a.y], [c.x, c.y], [e.x, e.y], [b.x, b.y]], bed);
      for (const rx of [-0.533, 0.533]) {
        const ra = this.pt(sg.s0, L.x + rx, sg.y0), rb = this.pt(sg.s0 + SEG, L.x + rx, sg.y1);
        if (ra && rb) {
          const wpx = Math.max(1, Math.round(0.065 * p1.k));
          const railC = T.at(this.wet ? '#c8d4e0' : '#9aa2ac', p1.d, false);
          E.px.line(g, ra.x, ra.y, rb.x, rb.y, railC, wpx);
        }
      }
      // catenary: a contact wire and a messenger, zig-zagged a little per mast
      const wz = [5.1, 5.9];
      for (let i = 0; i < 2; i++) {
        const q1 = this.pt(sg.s0, L.x, sg.y0 + wz[i]), q2 = this.pt(sg.s0 + SEG, L.x, sg.y1 + wz[i]);
        if (q1 && q2 && p1.k > .4) E.px.line(g, q1.x, q1.y, q2.x, q2.y, T.at(i ? '#8a8a90' : '#c0c0c8', p1.d, false), 1);
      }
    }
    // 3. crossings and their road
    if (sg.flags.crossing) {
      const ca = this.pt(sg.s0, -20, 0.02), cb = this.pt(sg.s0 + SEG, -20, 0.02), cc = this.pt(sg.s0, 20, 0.02), cd = this.pt(sg.s0 + SEG, 20, 0.02);
      if (ca && cb && cc && cd) E.px.poly(g, [[ca.x, ca.y], [cc.x, cc.y], [cd.x, cd.y], [cb.x, cb.y]], T.at('#505054', p1.d, false));
    }
    // 4. strips: sorted farthest lateral first, then the dynamic ones (trains)
    const strips = [];
    for (const st of sg.strips) strips.push(st);
    for (const it of dynList) if (it.strip) strips.push(it.strip);
    const xcam = cam.X;
    strips.sort((a, b) => Math.abs((b.x0 + b.x1) / 2 - (xcam - this.geo(sg.s0).b)) - Math.abs((a.x0 + a.x1) / 2 - (xcam - this.geo(sg.s0).b)));
    for (const st of strips) this.paintStrip(g, st, sg, p1);
    this.stats.strips += strips.length;
    // 5. things, nearest last. Platforms and boards before the signals, the trains' noses last
    const things = sg.things.slice();
    for (const it of dynList) if (it.thing) things.push(it.thing);
    things.sort((a, b) => (Math.abs(b.x - xcam + this.geo(sg.s0).b)) - (Math.abs(a.x - xcam + this.geo(sg.s0).b)));
    for (const th of things) this.paintThing(g, th, sg);
    this.stats.things += things.length;
  }

  /** an extruded box's visible faces on one segment */
  paintStrip(g, st, sg, p1) {
    const T = this.tint, cam = this.cam, a = Math.max(st.s0, sg.s0), b = Math.min(st.s1, sg.s0 + SEG);
    if (b <= a) return;
    const cc = st.c, dk = (c, f) => T.at(DH.shade(c, f), p1.d, false);
    const C = (s, x, y) => this.pt(s, x, y), quad = (pts, col) => { if (pts.every(Boolean)) E.px.poly(g, pts.map(q => [q.x, q.y]), col); };
    const camS = cam.s, camY = cam.Y, camB = cam.X - this.geo(a).b;
    // side faces: the one nearer the camera
    if (camB > st.x1 && st.y1 > st.y0) quad([C(a, st.x1, st.y0), C(b, st.x1, st.y0), C(b, st.x1, st.y1), C(a, st.x1, st.y1)], dk(st.side_c || cc, .86));
    else if (camB < st.x0 && st.y1 > st.y0) quad([C(a, st.x0, st.y0), C(b, st.x0, st.y0), C(b, st.x0, st.y1), C(a, st.x0, st.y1)], dk(st.side_c || cc, .86));
    // top: when the camera is above it
    if (camY > this.geo(a).y + st.y1 && st.top !== false) quad([C(a, st.x0, st.y1), C(b, st.x0, st.y1), C(b, st.x1, st.y1), C(a, st.x1, st.y1)], dk(st.top || DH.add(cc, 18), 1.05));
    // underside: when the camera is below it (canopies, overpasses, station roofs)
    if (camY < this.geo(a).y + st.y0 && st.y1 > st.y0) quad([C(a, st.x0, st.y0), C(b, st.x0, st.y0), C(b, st.x1, st.y0), C(a, st.x1, st.y0)], dk(st.under || DH.shade(cc, .6), .95));
    // end caps: the one the camera is behind (a train's front and back are things, not caps)
    if (st.caps !== false) {
      if (st.s0 >= sg.s0 && st.s0 < sg.s0 + SEG && camS < st.s0) quad([C(st.s0, st.x0, st.y0), C(st.s0, st.x1, st.y0), C(st.s0, st.x1, st.y1), C(st.s0, st.x0, st.y1)], dk(cc, .92));
      if (st.s1 > sg.s0 && st.s1 <= sg.s0 + SEG && camS > st.s1) quad([C(st.s1, st.x0, st.y0), C(st.s1, st.x1, st.y0), C(st.s1, st.x1, st.y1), C(st.s1, st.x0, st.y1)], dk(cc, .92));
    }
    // window and door patterns on the visible side, when near enough to see them
    if (st.win && p1.k >= 2.2 && st.y1 - st.y0 > 3) this.windows(g, st, sg, a, b, p1);
    if (st.lines && p1.k >= 3) {
      for (const ln of st.lines) {   // stripes along the side: y, colour (a livery band)
        const x = camB > st.x1 ? st.x1 : st.x0;
        quad([C(a, x, ln.y0), C(b, x, ln.y0), C(b, x, ln.y1), C(a, x, ln.y1)], T.at(ln.c, p1.d, false));
      }
    }
  }

  /** windows on a building or train side: a grid of panes, lit at night */
  windows(g, st, sg, a, b, p1) {
    const T = this.tint, cam = this.cam, camRel = cam.X - this.geo(a).b;
    const face = camRel > st.x1 ? st.x1 : (camRel < st.x0 ? st.x0 : null);
    if (face === null) return;
    const step = st.win === 'house' ? 2.8 : 3.2, fl = st.win === 'house' ? 2.6 : 3.4, lit = this.grade.night > .3;
    const litCol = lit && ['office', 'hotel', 'apartment', 'arcade', 'tower'].includes(st.kind) ? '#ffe6a0' : null;
    const glass = litCol || DH.mix(st.c, '#1a2a3a', .55);
    for (let y = st.y0 + 1.2; y + 1.4 < st.y1; y += fl) {
      for (let s = Math.ceil(a / step) * step; s + 1 < b; s += step) {
        if (st.win === 'door' && y > 2.6) continue;
        const q = [this.pt(s + .4, face, y), this.pt(s + step * .55, face, y), this.pt(s + step * .55, face, y + 1.4), this.pt(s + .4, face, y + 1.4)];
        if (q.every(Boolean)) E.px.poly(g, q.map(v => [v.x, v.y]), T.at(glass, p1.d, !!litCol));
      }
    }
  }

  paintThing(g, th, sg) {
    const sA = sg.s0, sB = sg.s0 + SEG;
    const s = Math.min(Math.max(th.s, sA), sB);
    const p = this.pt(s, th.x, th.y || 0);
    if (!p || p.d > DH.DRAW_SEGS * SEG) return;
    const T = this.tint;
    if (th.draw) { th.draw(g, p, T, this, th); }
    else if (th.kind && DH.Art && DH.Art[th.kind]) DH.Art[th.kind](g, p, T, this, th);
    if (th.pick) this.picks.push({ x: p.x, y: p.y - 4, r: Math.max(6, p.k * 1.2), ref: th.pick });
  }

  /** the headlights and the sun glare: an additive trapezoid of light over the track ahead at night */
  paintLight(g, o, t) {
    if (this.grade.night < .35 && !o.headlights) return;
    const I = this.grade.night;
    E.px.blend(g, .2 * I, 'add', () => {
      const a = this.pt(this.cam.s + 3, -1.4, 0.8), b = this.pt(this.cam.s + 120, -2.5, 0.2), c = this.pt(this.cam.s + 120, 2.5, 0.2), d = this.pt(this.cam.s + 3, 1.4, 0.8);
      if (a && b && c && d) E.px.poly(g, [[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]], '#ffe6b0');
    });
    if (this.flash > 0) E.px.blend(g, this.flash * .5, 'add', () => E.px.rect(g, this.vp.x, this.vp.y, this.vp.w, this.vp.h, '#ffffff'));
  }
}
DH.Rail = Rail;
})();
