/*!
my-3D2dge module ROAD v0.85.2-ob: the pseudo-3D road: segments with curves and hills, lanes, rumble strips, roadside scenery, tunnels,
forks (junctions that split one road into two), grounds per side, edge strips, overhead spans and strands (other roads drawn
beside this one: the branches after a fork)
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

OutRun's, Pole Position's, Hang-On's and Road Rash's view: the road a run of short segments, each a band of ground, rumble
and road drawn smaller with its distance, bending and rising, and what stands beside it scaled the same way.
- const road = new E.Road({ segment: 200, width: 2000 (half the road), lanes: 3, rumble: 3 (segments a stripe), draw: 220
  (segments ahead), height: 1000 (the camera over the road), horizon: .42 (the horizon's place down the view), focal: .55
  (pixels a unit at distance 1, a share of the view's height), loop: true (false: the road ends), colors: { road: [a, b],
  grass: [a, b], rumble: [a, b], lane, wall: [a, b], roof, portal }, fog: { color, density } | null, sky }).
- Build it: road.add(n, { curve, hill, tunnel, colors, w (width factor, eased), lanes, groundL, groundR, gore, edgeL,
  edgeR ({ kind: 'rail' | 'wall' | 'cliff' | 'hedge' | 'facade' | 'stonewall', h, color }), span ({ kind, color, every }),
  split: [s0, s1] (a fork: the two branches' centres at -s and +s half roads, eased from s0 to s1), tint, lit, ...data })
  (curves eased in and out). Grounds: { kind: 'grass' | 'sand' | 'water' | 'rows' | 'cobble' | 'snow' | 'rock', a, b, c }.
- road.place(z, offset, what, scale, o): scenery (an E.sprite, E.anim or { draw(g, sx, sy, scale, t), w, h }); o.solid
  (default true for scenery beyond the edge).
- Each frame: road.draw(r, { z, x, h, turn, focal, horizon, cars, strands: [{ road, z0, x0, cars, maxSegs }], sky(g, vp),
  onBand(g, seg, p1, p2, strand) }) as an overlay. A strand is another road whose segment 0 sits at z0 of this one (a
  multiple of the segment) and x0 half roads across: it bends on from this road's bend there (or from the camera, when it
  started behind it).
- For the game: road.curveAt(z), road.yAt(z), road.seg(z), road.splitAt(z), road.hits(z, x, w), road.project(z, x, y) ->
  [sx, sy, scale] for the camera last drawn, road.projectStrand(i, z, x, y), road.ahead(h).
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module ROAD: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * ROAD  the pseudo-3D road: segments with curves and hills, lanes, rumble strips, scenery, tunnels, forks
 * ========================================================================== */
const { clamp } = E, easeIn = (a, b, u) => a + (b - a) * u * u, easeInOut = (a, b, u) => a + (b - a) * (-Math.cos(u * Math.PI) / 2 + .5);
const COLORS = { road: ['#6a6a6a', '#646464'], grass: ['#10aa10', '#009a00'], rumble: ['#e8e8e8', '#c01818'], lane: '#d8d8d8', wall: ['#5a4a3a', '#4a3a2a'], roof: '#2a2420', portal: '#6a5a48' };
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
class Road {
  /** new E.Road({ segment, width, lanes, rumble, draw, height, horizon, focal, loop, colors, fog, sky }) */
  constructor(o = {}) {
    this.o = Object.assign({ segment: 200, width: 2000, lanes: 3, rumble: 3, draw: 220, height: 1000, horizon: .42, focal: .55, loop: true, fog: { color: '#a0c0e0', density: 5 }, sky: '#6aa8e8' }, o);
    this.o.colors = Object.assign({}, COLORS, o.colors);
    /** segs: its segments; length: in world units */
    this.segs = []; this.length = 0; this._cam = null; this._strandCams = [];
    this.depth = 1;   // (kept for the old API: road.ahead)
  }
  /** n segments more: { curve, hill, tunnel, colors, w, lanes, groundL, groundR, gore, edgeL, edgeR, span, split, tint, lit } */
  add(n, o = {}) {
    const last = this.segs[this.segs.length - 1], y0 = last ? last.y1 : 0, curve = o.curve || 0, hill = o.hill || 0, e = Math.max(1, Math.min(n / 3, 25)), L = this.o.segment;
    const w0 = last ? last.w : (o.w || 1), w1 = o.w === undefined ? w0 : o.w, we = Math.min(n, 20);
    const sp = o.split || null;
    for (let k = 0; k < n; k++) {
      const c = k < e ? easeIn(0, curve, k / e) : k > n - e ? easeInOut(curve, 0, (k - (n - e)) / e) : curve, i = this.segs.length;
      const s = { i, z: i * L, y0: easeInOut(y0, y0 + hill, k / n), y1: easeInOut(y0, y0 + hill, (k + 1) / n), curve: c,
        w: k < we ? easeInOut(w0, w1, (k + 1) / we) : w1, lanes: o.lanes || (last && last.lanes) || this.o.lanes,
        tunnel: !!o.tunnel, colors: o.colors || null, groundL: o.groundL || o.ground || null, groundR: o.groundR || o.ground || null, gore: o.gore || null,
        edgeL: o.edgeL || null, edgeR: o.edgeR || null, span: o.span && (!o.span.every || k % o.span.every === 0) ? o.span : null, tint: o.tint || null, lit: !!o.lit,
        s0: sp ? easeInOut(sp[0], sp[1], k / n) : 0, s1: sp ? easeInOut(sp[0], sp[1], (k + 1) / n) : 0, data: o.data || null, things: [] };
      this.segs.push(s);
    }
    this.length = this.segs.length * L; return this;
  }
  /** the segment at a distance (it wraps on a looping road, else it stops at the ends) */
  seg(z) { const n = this.segs.length, k = Math.floor(z / this.o.segment); return this.segs[this.o.loop ? ((k % n) + n) % n : clamp(k, 0, n - 1)]; }
  /** scenery at distance z, offset across; o: { solid, h, data } */
  place(z, offset, what, scale = 8, o = {}) {
    const spr = what.isAnim ? what.frames[0] : what.isSprite ? what : null;
    const t = Object.assign({ offset, what, scale, w: spr ? spr.w * scale : what.w || 200, solid: o.solid !== undefined ? o.solid : Math.abs(offset) > 1.05 }, o);
    this.seg(z).things.push(t); return t;
  }
  /** how hard the road bends at a distance */
  curveAt(z) { return this.seg(z).curve; }
  /** the road's height at a distance */
  yAt(z) { const L = this.o.segment, s = this.seg(z), u = clamp((z - s.z) / L, 0, 1); return s.y0 + (s.y1 - s.y0) * u; }
  /** the fork's spread at a distance (the branches' centres at -s and +s half roads; 0 where the road is one) */
  splitAt(z) { const L = this.o.segment, s = this.seg(z), u = clamp((z - s.z) / L, 0, 1); return s.s0 + (s.s1 - s.s0) * u; }
  /** the width factor at a distance */
  widthAt(z) { return this.seg(z).w; }
  /** the solid scenery a body w half roads wide at (z, x) touches */
  hits(z, x, w) { const W = this.o.width; return this.seg(z).things.filter(t => t.solid && Math.abs(t.offset - x) * W < t.w / 2 + w * W); }
  /** the camera distance at which the ground meets the view's bottom edge (the old API) */
  ahead(h = this.o.height) { return h * (this.o.focal / Math.max(.05, .965 - this.o.horizon)); }
  _proj(wx, wy, d, C) {
    if (d <= 1) return null;
    const s = C.f / d; return { x: C.cx + s * (wx - C.x), y: C.cy - s * (wy - C.y), scale: s, d };
  }
  /** a point (distance z, across x in half roads, height y over the road) -> [sx, sy, scale] for the camera last drawn */
  project(z, x, y = 0) { return this._project(this._cam, this, z, x, y); }
  /** the same on strand i of the last draw (its own z and x) */
  projectStrand(i, z, x, y = 0) { const S = this._strandCams[i]; return S ? this._project(S, S.road, z, x, y) : null; }
  _project(S, road, z, x, y) {
    if (!S) return null; const C = this._cam, L = this.o.segment;
    const dz = (z + S.z0) - C.z; if (dz <= 1) return null;
    const u = dz / L + C.pct, k = Math.floor(u), B = S.bend;
    if (B.length < 2) return null;
    const kk = clamp(k, 0, B.length - 2), b = B[kk] + (B[kk + 1] - B[kk]) * clamp(u - kk, 0, 1);
    const p = this._proj(S.x0 * this.o.width + x * road.o.width * road.widthAt(z) + b, S.yOff + road.yAt(z) + y, dz, C);
    return p && [p.x, p.y, p.scale];
  }
  /** draw the road (and its strands) over r's frame (an overlay; r.viewport's part in a split screen) */
  draw(r, v = {}) {
    const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H };
    r.overlay(g => this.drawTo(g, vp, v, r.game ? r.game.time : 0));
    return this;
  }
  /** the same into a context at once: vp { x, y, w, h } in its pixels */
  drawTo(g, vp, v = {}, t = 0) {
    const o = this.o, L = o.segment, n = this.segs.length, W = vp.w, H = vp.h, px = E.px;
    const zc = o.loop ? (((v.z || 0) % this.length) + this.length) % this.length : clamp(v.z || 0, 0, this.length - 1);
    const base = this.seg(zc), pct = (zc - base.z) / L, h = v.h === undefined ? o.height : v.h;
    const focal = (v.focal || o.focal) * H, horizon = v.horizon === undefined ? o.horizon : v.horizon;
    const C = this._cam = { x: (v.x || 0) * o.width * (v.w || 1), y: h + this.yAt(zc), z: zc, cx: vp.x + W / 2, cy: vp.y + H * horizon, f: focal, pct, base: base.i };
    g.save(); g.beginPath(); g.rect(vp.x, vp.y, W, H); g.clip();
    if (v.sky) v.sky(g, vp, C); else px.rect(g, vp.x, vp.y, W, H, typeof o.sky === 'string' ? o.sky : '#6aa8e8');
    // the strands: this road, then each other road; each one's bend (near to far) and its bands' projections
    const ND = o.draw, strands = [{ road: this, z0: 0, x0: 0, cars: v.cars || [], maxSegs: 1e9, main: true }].concat(v.strands || []);
    this._strandCams = [];
    const rows = [];   // rows[k] = [{ S, s, p1, p2, show, j }]
    let mainBend = null;
    strands.forEach((st, si) => {
      const road = st.road, j0 = Math.round((st.z0 || 0) / L), segs = road.segs, rn = segs.length, S = { road, z0: j0 * L, x0: st.x0 || 0, bend: [], k0: 0, yOff: 0, cars: st.cars || [], si, st };
      // where the strand starts: ahead (it bends on from the main road there) or behind the camera (from the camera)
      const kStart = Math.max(0, j0 - base.i);
      let x = 0, dx = 0;
      if (si === 0) { dx = -(base.curve * pct); }
      else if (kStart > 0 && mainBend) { x = mainBend.x[Math.min(kStart, mainBend.x.length - 1)] || 0; dx = mainBend.dx[Math.min(kStart, mainBend.dx.length - 1)] || 0; }
      else { const sj = segs[clamp(base.i - j0, 0, rn - 1)]; dx = -(sj.curve * pct); }
      S.yOff = si === 0 ? 0 : (kStart > 0 ? this.yAt(Math.min(this.length - 1, j0 * L)) - road.yAt(0) : this.yAt(zc) - road.yAt(zc - j0 * L));
      let maxy = vp.y + H;
      const xs = [], dxs = [];
      for (let k = 0; k < ND; k++) {
        const j = base.i + k - j0;
        xs.push(x); dxs.push(dx); S.bend.push(x);
        if (si === 0 && !o.loop && j >= rn) { continue; }
        let s;
        if (si === 0 && o.loop) s = segs[(base.i + k) % rn];
        else { if (j < 0 || j >= rn || j >= st.maxSegs) { if (j >= 0) { x += dx; } continue; } s = segs[j]; }
        const wz = (j0 + j) * L + (si === 0 && o.loop && s.i < base.i ? this.length : 0);
        const d1 = wz - zc, d2 = d1 + L;
        const xo = S.x0 * o.width, p1 = this._proj(x + xo, S.yOff + s.y0, d1, C), p2 = this._proj(x + dx + xo, S.yOff + s.y1, d2, C);
        const show = !!(p1 && p2 && p2.y < p1.y && p2.y < maxy);
        const clip = maxy;
        if (show) maxy = p2.y;
        (rows[k] || (rows[k] = [])).push({ S, s, p1, p2, show, j, clip, fadeA: st.maxSegs < 1e8 ? clamp((st.maxSegs - j) / 14, 0, 1) : 1 });
        x += dx; dx += s.curve;
      }
      S.bend.push(x);
      if (si === 0) mainBend = { x: xs.concat([x]), dx: dxs.concat([dx]) };
      this._strandCams.push(S);
    });
    // cars by strand and segment
    const byseg = new Map();
    for (const S of this._strandCams) for (const c of S.cars) { const s = S.road.seg(c.z); const key = S.si + ':' + s.i; (byseg.get(key) || byseg.set(key, []).get(key)).push(c); }
    // far to near: each row's grounds (split between strands at their middles), the strands' road surfaces, then what stands on them
    const fogC = o.fog && (v.fog || o.fog), fog = fogC && E.hex(fogC.color);
    for (let k = rows.length - 1; k >= 0; k--) {
      const row = rows[k]; if (!row) continue;
      const f = fog ? 1 - Math.exp(-((k / ND) ** 2) * fogC.density) : 0;
      const shown = row.filter(q => q.show);
      if (shown.length) this._row(g, vp, shown, f, fog, v, t);
      for (const q of row) {
        if (!q.p1) continue;
        const things = q.s.things, cs = byseg.get(q.S.si + ':' + q.s.i); if (!things.length && !cs && !q.s.span) continue;
        const clipY = Math.min(vp.y + H, Math.ceil(q.clip));
        if (clipY <= vp.y) continue;
        g.save(); g.beginPath(); g.rect(vp.x, vp.y, W, clipY - vp.y); g.clip();
        const rw = q.S.road.o.width * q.s.w, fa = (1 - f * .85) * q.fadeA;
        g.globalAlpha = fa;
        if (q.s.span) this._span(g, q, rw, fa, t);
        for (const th of things) this._thing(g, th.what, q.p1.x + q.p1.scale * (th.offset * rw + (q.s.s0 && th.branch ? th.branch * q.s.s0 * rw : 0)), q.p1.y, q.p1.scale, th.scale, t, th);
        if (cs) for (const c of cs) {
          const u = clamp((c.z - q.s.z) / L, 0, 1), p2 = q.p2 || q.p1, sc = q.p1.scale + (p2.scale - q.p1.scale) * u;
          g.globalAlpha = fa * (c.alpha === undefined ? 1 : c.alpha);
          this._thing(g, c, q.p1.x + (p2.x - q.p1.x) * u + sc * c.x * rw, q.p1.y + (p2.y - q.p1.y) * u, sc, 8, t, c);
          g.globalAlpha = fa;
        }
        g.globalAlpha = 1; g.restore(); px.reset(g);
      }
    }
    g.restore(); px.reset(g);
    return this;
  }
  _thing(g, q, sx, sy, scale, spr, t, th) {
    E.px.reset(g);
    if (q.draw) return q.draw(g, sx, sy, scale, t, th);
    const sp = q.isAnim ? q.frame(t) : q, k = scale * spr, w = sp.w * k, h = sp.h * k; if (w < .5) return;
    g.drawImage(sp.cv, Math.round(sx - w / 2), Math.round(sy - h), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  // a row: one depth band across every strand (they share it: a fork's branches and the roads after it run side by side)
  _row(g, vp, shown, f, fog, v, t) {
    const px = E.px, X = vp.x, Wd = vp.w;
    shown.sort((a, b) => a.p1.x - b.p1.x);
    const y1 = Math.ceil(shown[0].p1.y), y2 = Math.ceil(shown[0].p2.y);
    // each strand's surfaces: [{ c1, c2, w1, w2 }] (a fork's main road has two)
    const surf = shown.map(q => {
      const R = q.S.road, ro = R.o, s = q.s, W = ro.width * s.w, x1 = q.p1.x, x2 = q.p2.x, a = q.p1.scale, b = q.p2.scale;
      const list = [];
      if (s.s0 > 0 || s.s1 > 0) { for (const sg of [-1, 1]) list.push({ c1: x1 + sg * s.s0 * W * a, c2: x2 + sg * s.s1 * W * b, w1: W * a, w2: W * b, side: sg }); }
      else list.push({ c1: x1, c2: x2, w1: W * a, w2: W * b, side: 0 });
      return { q, list, R, s, alt: Math.floor(s.i / ro.rumble) % 2 };
    });
    // grounds: each strand owns the screen from the middle between it and its neighbours
    for (let i = 0; i < surf.length; i++) {
      const S = surf[i], C = S.s.colors ? Object.assign({}, S.R.o.colors, S.s.colors) : S.R.o.colors;
      const left = i === 0 ? X : Math.round((surf[i - 1].list[surf[i - 1].list.length - 1].c1 + S.list[0].c1) / 2), right = i === surf.length - 1 ? X + Wd : Math.round((S.list[S.list.length - 1].c1 + surf[i + 1].list[0].c1) / 2);
      const mid = Math.round(S.list.length > 1 ? (S.list[0].c1 + S.list[1].c1) / 2 : S.list[0].c1);
      this._ground(g, S.s.groundL, C, S.alt, left, Math.max(left, Math.min(mid, right)), y1, y2, S.q, -1, S.s, t);
      this._ground(g, S.s.groundR, C, S.alt, Math.max(left, Math.min(mid, right)), right, y1, y2, S.q, 1, S.s, t);
      if (S.list.length > 1 && S.s.s0 >= 1) { const gl = S.s.gore || S.s.groundR || null, a = Math.round(S.list[0].c1 + S.list[0].w1), b = Math.round(S.list[1].c1 - S.list[1].w1); if (b > a) this._ground(g, gl, C, S.alt, a, b, y1, y2, S.q, 0, S.s, t); }
    }
    // roads: rumble, then asphalt, then lanes
    for (const S of surf) {
      const fa = S.q.fadeA < 1 ? Math.round(S.q.fadeA * 4) / 4 : 1; if (fa <= 0) continue; g.globalAlpha = fa;
      const C = S.s.colors ? Object.assign({}, S.R.o.colors, S.s.colors) : S.R.o.colors, q = S.q, p1 = q.p1, p2 = q.p2, lanes = S.s.lanes || S.R.o.lanes;
      const quad = (c1, w1, c2, w2, col) => px.poly(g, [[c1 - w1, p1.y], [c1 + w1, p1.y], [c2 + w2, p2.y], [c2 - w2, p2.y]], col);
      const kk = Math.max(6, 2 * lanes);
      for (const u of S.list) quad(u.c1, u.w1 * (1 + 1 / kk), u.c2, u.w2 * (1 + 1 / kk), C.rumble[S.alt]);
      for (const u of S.list) quad(u.c1, u.w1, u.c2, u.w2, C.road[S.alt]);
      if (v.onBand) v.onBand(g, S.s, p1, p2, q.S, S.list);
      if (!S.alt) for (const u of S.list) for (let l = 1; l < lanes; l++) {
        const lu = -1 + 2 * l / lanes;
        if (S.list.length > 1) { const other = S.list.find(o2 => o2 !== u), lx = u.c1 + lu * u.w1; if (Math.abs(lx - other.c1) < other.w1 * .98) continue; }
        quad(u.c1 + lu * u.w1, u.w1 / (16 * lanes), u.c2 + lu * u.w2, u.w2 / (16 * lanes), C.lane);
      }
      if (S.list.length > 1 && S.s.s0 > .12 && S.s.s0 < 1) { const m1 = (S.list[0].c1 + S.list[1].c1) / 2, m2 = (S.list[0].c2 + S.list[1].c2) / 2, w1 = S.list[0].w1 / 40, w2 = S.list[0].w2 / 40; quad(m1, w1, m2, w2, C.lane); }
      // edge strips and tunnels
      if (S.s.tunnel) this._tunnel(g, vp, S, C, p1, p2);
      else {
        const outer = [S.list[0], S.list[S.list.length - 1]];
        if (S.s.edgeL) this._strip(g, S.s.edgeL, outer[0], -1, p1, p2, S.s, C, vp, t);
        if (S.s.edgeR) this._strip(g, S.s.edgeR, outer[1], 1, p1, p2, S.s, C, vp, t);
      }
      g.globalAlpha = 1; px.reset(g);
      if (S.s.tint) { g.globalAlpha = S.s.tint.a === undefined ? .35 : S.s.tint.a; px.rect(g, X, y2, Wd, y1 - y2, S.s.tint.color || '#000000'); g.globalAlpha = 1; px.reset(g); }
    }
    if (f > .01) { g.fillStyle = `rgba(${fog[0]},${fog[1]},${fog[2]},${f.toFixed(3)})`; g.fillRect(X, y2, Wd, y1 - y2); px.reset(g); }
  }
  // a ground band from x0 to x1: its kind's colors and pattern
  _ground(g, gd, C, alt, x0, x1, y1, y2, q, side, s, t) {
    if (x1 <= x0 || y1 <= y2) return;
    const px = E.px, kind = gd ? gd.kind : 'grass', a = gd && gd.a ? gd.a : C.grass[0], b = gd && gd.b ? gd.b : C.grass[1];
    if (kind === 'water') {
      const wave = Math.floor(s.i / 2 + t * 3) % 6;
      px.rect(g, x0, y2, x1 - x0, y1 - y2, wave === 0 ? (gd.c || '#e8f8ff') : alt ? b : a);
      if (y1 - y2 >= 1 && wave !== 0) {   // the glitter: a few bright dots, the same each frame for a segment
        const n = Math.min(12, Math.ceil((x1 - x0) / 40));
        for (let k = 0; k < n; k++) { const hx = hash(s.i * 7 + k, side + 3), xx = x0 + hx * (x1 - x0), on = Math.floor(t * 4 + hx * 8) % 3 === 0; if (on) px.rect(g, Math.round(xx), y2, Math.max(1, Math.round((y1 - y2) * 1.5)), 1, gd.c || '#ffffff'); }
      }
      return;
    }
    px.rect(g, x0, y2, x1 - x0, y1 - y2, alt ? b : a);
    if (kind === 'rows' && q.p1 && side) {   // crop rows running with the road: stripes that meet at the horizon
      const R = q.S.road, W = R.o.width * s.w, col = gd.c || '#8a5ab0';
      for (let k = 0; k < 9; k++) {
        const off = side * (1.6 + k * .55), w1 = q.p1.scale * W * .12, w2 = q.p2.scale * W * .12, c1 = q.p1.x + off * W * q.p1.scale, c2 = q.p2.x + off * W * q.p2.scale;
        g.save(); g.beginPath(); g.rect(x0, y2, x1 - x0, y1 - y2); g.clip();
        px.poly(g, [[c1 - w1, q.p1.y], [c1 + w1, q.p1.y], [c2 + w2, q.p2.y], [c2 - w2, q.p2.y]], col); g.restore(); px.reset(g);
      }
    } else if ((kind === 'cobble' || kind === 'rock' || kind === 'snow' || kind === 'sand') && y1 - y2 >= 2) {
      const n = Math.min(20, Math.ceil((x1 - x0) / 30)), col = gd.c || (kind === 'snow' ? '#ffffff' : kind === 'sand' ? '#fff0c8' : '#00000030');
      for (let k = 0; k < n; k++) { const hx = hash(s.i * 13 + k, side + 9); if (hx < .5) px.rect(g, Math.round(x0 + hx * 2 * (x1 - x0)), y2 + Math.floor((y1 - y2) * hash(k, s.i)), Math.max(1, Math.round((y1 - y2) * .8)), 1, col); }
    }
  }
  // a strip along an edge: its inner face, from the ground up, as a quad (walls, rails, cliffs, hedges, facades)
  _strip(g, e, u, side, p1, p2, s, C, vp, t) {
    const px = E.px, off = e.off === undefined ? 1.18 : e.off, H = e.h || 400, x1 = u.c1 + side * u.w1 * off, x2 = u.c2 + side * u.w2 * off;
    const top1 = p1.y - H * p1.scale, top2 = p2.y - H * p2.scale, alt = Math.floor(s.i / (e.every || 2)) % 2;
    const col = Array.isArray(e.color) ? e.color[alt] : e.color || (alt ? '#8a8a90' : '#9a9aa0');
    const quad = pts => px.poly(g, pts, col);
    if (e.kind === 'rail') {
      const post = Math.floor(s.i) % 3 === 0;
      quad([[x1, top1], [x2, top2], [x2, top2 + (p2.y - top2) * .35], [x1, top1 + (p1.y - top1) * .35]]);
      px.poly(g, [[x1, top1], [x2, top2], [x2, top2 + Math.max(1, (p2.y - top2) * .1)], [x1, top1 + Math.max(1, (p1.y - top1) * .1)]], e.hi || '#e8e8f0');
      if (post) px.rect(g, Math.round(x1 - Math.max(1, u.w1 * .012)), Math.round(top1), Math.max(1, Math.round(u.w1 * .025)), Math.max(1, Math.round(p1.y - top1)), e.post || '#5a5a64');
      return;
    }
    if (e.kind === 'cliff') {   // a tall rock face in bands, its top ragged
      const T = vp.y - 4, tt1 = Math.max(Math.min(top1, p1.y - 2), T), tt2 = Math.max(Math.min(top2, p2.y - 1), T);
      quad([[x1, p1.y], [x2, p2.y], [x2 + side * (p2.y - tt2) * .1, tt2], [x1 + side * (p1.y - tt1) * .1, tt1]]);
      if (alt && e.line) px.poly(g, [[x1, p1.y], [x2, p2.y], [x2, p2.y - (p2.y - tt2) * .5], [x1, p1.y - (p1.y - tt1) * .5]], e.line);
      return;
    }
    quad([[x1, p1.y], [x2, p2.y], [x2, top2], [x1, top1]]);
    if (e.kind === 'facade' && p1.y - top1 > 6) {   // windows in rows, lit at night
      const rows = e.rows || 3, wc = e.window || '#3a4a6a';
      for (let rr = 0; rr < rows; rr++) {
        const fy1 = p1.y - (p1.y - top1) * (rr + .35) / (rows + .2), fy2 = p2.y - (p2.y - top2) * (rr + .35) / (rows + .2), hgt1 = (p1.y - top1) / (rows + .2) * .4, hgt2 = (p2.y - top2) / (rows + .2) * .4;
        const lit = e.lit && hash(s.i, rr) < .6;
        if (Math.floor(s.i) % 2 === 0) px.poly(g, [[x1, fy1], [x2, fy2], [x2, fy2 - hgt2], [x1, fy1 - hgt1]], lit ? e.lit : wc);
      }
      if (e.awning && Math.floor(s.i / 2) % 3 === 0) px.poly(g, [[x1, p1.y - (p1.y - top1) * .25], [x2, p2.y - (p2.y - top2) * .25], [x2 - side * u.w2 * .12, p2.y - (p2.y - top2) * .2], [x1 - side * u.w1 * .12, p1.y - (p1.y - top1) * .2]], e.awning[Math.floor(s.i / 6) % e.awning.length]);
    } else if (e.kind === 'stonewall' || e.kind === 'wall') {
      if (p1.y - top1 > 3) px.poly(g, [[x1, top1], [x2, top2], [x2, top2 + Math.max(1, (p2.y - top2) * .18)], [x1, top1 + Math.max(1, (p1.y - top1) * .18)]], e.cap || '#d8d0c0');
    } else if (e.kind === 'hedge') {
      if (alt) px.poly(g, [[x1, top1], [x2, top2], [x2, top2 + (p2.y - top2) * .3], [x1, top1 + (p1.y - top1) * .3]], e.hi || '#5ab05a');
    }
  }
  _tunnel(g, vp, S, C, p1, p2) {
    const px = E.px, u = { c1: S.list[0].c1, c2: S.list[0].c2, w1: S.list[S.list.length - 1].c1 - S.list[0].c1 + S.list[0].w1, w2: S.list[S.list.length - 1].c2 - S.list[0].c2 + S.list[0].w2 };
    const s = S.s, e1 = u.w1 * 1.25, e2 = u.w2 * 1.25, t1 = p1.y - u.w1 * .8, t2 = p2.y - u.w2 * .8, alt = S.alt, segs = S.R.segs;
    const cx1 = (S.list[0].c1 + S.list[S.list.length - 1].c1) / 2, cx2 = (S.list[0].c2 + S.list[S.list.length - 1].c2) / 2;
    const lamp = s.i % 6 === 0;
    for (const sg of [-1, 1]) px.poly(g, [[cx1 + sg * e1, p1.y], [cx2 + sg * e2, p2.y], [cx2 + sg * e2, t2], [cx1 + sg * e1, t1]], lamp ? (C.lamp || '#ffcf6a') : C.wall[alt]);
    px.poly(g, [[cx1 - e1, t1], [cx1 + e1, t1], [cx2 + e2, t2], [cx2 - e2, t2]], C.roof);
    if (s.i > 0 && !segs[s.i - 1].tunnel) {
      const a = Math.round(cx1 - e1), b = Math.round(cx1 + e1), top = clamp(Math.round(t1), vp.y, Math.ceil(p1.y)), R = vp.x + vp.w, y1 = Math.ceil(p1.y);
      px.rect(g, vp.x, vp.y, vp.w, top - vp.y, C.portal); if (a > vp.x) px.rect(g, vp.x, top, Math.min(a, R) - vp.x, y1 - top, C.portal); if (b < R) px.rect(g, Math.max(b, vp.x), top, R - Math.max(b, vp.x), y1 - top, C.portal);
    }
  }
  // an overhead span over the road at a segment's near edge: posts and a beam (arches, bunting, canopies, galleries)
  _span(g, q, rw, fa, t) {
    const px = E.px, sp = q.s.span, p = q.p1, sc = p.scale, half = rw * sc * (sp.wide || 1.32), Hh = (sp.h || 1700) * sc, x = p.x, y = p.y;
    if (half < 2) return;
    const col = sp.color || '#c8b8a0', dk = sp.dark || E.shade(col, -.25), post = Math.max(1, (sp.post || 110) * sc);
    const kind = sp.kind;
    if (kind === 'bunting') {
      const n = 9; px.line(g, x - half, y - Hh, x + half, y - Hh, dk, Math.max(1, sc * 20));
      for (const sg of [-1, 1]) px.rect(g, Math.round(x + sg * half - post / 2), Math.round(y - Hh), Math.round(post), Math.round(Hh), dk);
      for (let k = 0; k < n; k++) { const fx = x - half + (k + .5) * 2 * half / n, fw = half / n * .8, fh = Hh * .14; px.poly(g, [[fx - fw, y - Hh], [fx + fw, y - Hh], [fx, y - Hh + fh]], sp.flags[k % sp.flags.length]); }
      return;
    }
    if (kind === 'canopy' || kind === 'palms') {   // leaves meeting over the road
      const n = 7;
      for (const sg of [-1, 1]) px.rect(g, Math.round(x + sg * half - post / 2), Math.round(y - Hh), Math.round(post), Math.round(Hh), sp.trunk || '#6a4a2a');
      for (let k = 0; k < n; k++) { const fx = x - half + k * 2 * half / (n - 1), fy = y - Hh - Math.sin(k / (n - 1) * Math.PI) * Hh * .12, rr = half / n * 1.3; px.ell(g, Math.round(fx), Math.round(fy), Math.round(rr * 1.4), Math.max(1, Math.round(rr * .6)), k % 2 ? col : dk); }
      return;
    }
    if (kind === 'gallery' || kind === 'snowshed') {   // a roof, a wall on one side, pillars on the other
      const sd = sp.side || 1, roofY = y - Hh;
      px.rect(g, Math.round(x - half), Math.round(roofY - Hh * .12), Math.round(half * 2), Math.max(1, Math.round(Hh * .12)), col);
      px.rect(g, Math.round(x - sd * half - (sd > 0 ? 0 : 0)), Math.round(roofY), Math.round(post * 1.4), Math.round(Hh), dk);
      px.rect(g, Math.round(x + sd * half - post / 2), Math.round(roofY), Math.round(post), Math.round(Hh), dk);
      return;
    }
    if (kind === 'banner') {   // a checkpoint or goal arch: two posts, a banner with text
      for (const sg of [-1, 1]) px.rect(g, Math.round(x + sg * half - post / 2), Math.round(y - Hh), Math.round(post), Math.round(Hh), sp.postColor || '#f0f0f0');
      const bh = Hh * .22; px.rect(g, Math.round(x - half), Math.round(y - Hh), Math.round(half * 2), Math.max(1, Math.round(bh)), col);
      if (sp.draw) sp.draw(g, x, y - Hh, half, bh, sc, t);
      return;
    }
    // an arch (stone, rock): posts, a curved beam
    for (const sg of [-1, 1]) px.rect(g, Math.round(x + sg * half - post), Math.round(y - Hh), Math.round(post * 2), Math.round(Hh), dk);
    const pts = [], pts2 = [];
    for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12, ax = x - Math.cos(a) * half, ay = y - Hh * .78 - Math.sin(a) * Hh * .22; pts.push([ax, ay]); pts2.unshift([ax, ay - Hh * .16]); }
    px.poly(g, pts.concat(pts2), col);
    if (sp.draw) sp.draw(g, x, y - Hh, half, Hh * .2, sc, t);
  }
}
E.Road = Road;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
