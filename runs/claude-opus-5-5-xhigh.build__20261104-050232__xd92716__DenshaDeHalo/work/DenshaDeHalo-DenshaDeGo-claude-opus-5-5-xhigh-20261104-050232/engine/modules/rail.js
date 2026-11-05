/*!
my-3D2dge module RAIL (Densha de Halo!): a pseudo-3D railway, forked from the ROAD module
Loads after: the full engine. Needs: no other module.

The line is a run of 5 m segments, each bending (curve: lateral metres added per segment, = L*L/R), rising (y0, y1),
with its tracks (lateral offsets that may diverge along the segment), and the strips and things that touch it.
- strips: extrusions along the line { s0, s1, x0, x1, y0, y1 (metres above the track there), faces: { side, top, under,
  end, roof }, kind }; a face is a colour or { col, pattern(F) } (F.rect(u0, u1, v0, v1, col) paints a part of it in
  metres along the face; F.u0, F.u1 the part this slice covers; F.k pixels a metre; F.T(hex, emissive) tints).
- things: point objects { s, x, y, draw(g, sx, sy, k, C, thing) } at the base centre, k pixels a metre.
- const rail = new E.Rail(route, { fov: 75, draw: 360, fogDist: 900 }); rail.draw(r, cam, { actors, grade, t, sky })
  with cam { s, x, h, dir: 1 | -1, fov, horizon, lookX, lookY, pitchPx, rollPx, shake }.
- rail.project(s, x, y) -> [sx, sy, k] | null for the last camera; rail.visible(s, x, y); rail.pick(sx, sy).
Square pixels: sy uses half the width as sx does, so nothing squashes on a wide screen.
*/
(function (E) {
'use strict';
if (!E) throw new Error('rail.js: load my-3d2dge.js first');
const { clamp } = E, px = E.px;
const L = 5;

/* ---- colour: '#rrggbb' -> [r, g, b] and back, with a per-frame tint cache (fog, time-of-day grade, emissive) ---- */
const RGB = new Map();
const rgb = h => { let c = RGB.get(h); if (c) return c; let s = h[0] === '#' ? h.slice(1) : h; if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; const n = parseInt(s, 16); c = [n >> 16 & 255, n >> 8 & 255, n & 255]; RGB.set(h, c); return c; };
const css = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
const hexOf = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** a polygon fill clipped to rows [y0, y1): px.poly scans every row between its points, so a quad reaching far off the
 *  screen (a platform beside the camera) is clipped here first */
const _xs = [];
function fill(g, pts, c, Y0, Y1) {
  let a = 1e9, b = -1e9; const n = pts.length;
  for (let i = 0; i < n; i++) { const y = pts[i][1]; if (y < a) a = y; if (y > b) b = y; }
  a = Math.max(Math.round(a), Y0); b = Math.min(Math.round(b), Y1 - 1); if (a > b) return;
  px.col(g, c);
  for (let y = a; y <= b; y++) {
    _xs.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) { const p = pts[i], q = pts[j]; if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) _xs.push(p[0] + (y - p[1]) / (q[1] - p[1]) * (q[0] - p[0])); }
    if (_xs.length === 2) { const xa = Math.round(Math.min(_xs[0], _xs[1])), xb = Math.round(Math.max(_xs[0], _xs[1])); if (xb >= xa) g.fillRect(xa, y, xb - xa + 1, 1); continue; }
    _xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < _xs.length; k += 2) { const xa = Math.round(_xs[k]), xb = Math.round(_xs[k + 1]); g.fillRect(xa, y, Math.max(1, xb - xa + 1), 1); }
  }
}

/* ---- the sky: a gradient, a sun or moon, stars, backdrop layers resting on the horizon (baked by E.Backdrop) ---- */
class Sky {
  constructor() { this._bd = new Map(); }
  _backdrop(layers) { const key = JSON.stringify(layers); let b = this._bd.get(key); if (!b) { b = new E.Backdrop({ sky: ['#000', '#000'], layers }); this._bd.set(key, b); } return b; }
  /** paint rows y0..y1 of the viewport: S = { top, mid, horizon, sun: { x, y, r, color } | null, moon, stars: 0..1,
   *  layers: Backdrop layers ({ kind, color, height (px share of the sky), parallax, seed }), glow } */
  draw(g, vp, S, cy, turn, t, tintFn) {
    const W = vp.w, H = vp.h, X = vp.x, Y = vp.y, top = rgb(S.top), mid = rgb(S.mid || S.top), hor = rgb(S.horizon);
    const rows = Math.max(1, Math.round(cy - Y) + 2);
    for (let y = 0; y < H; y += 2) {
      const u = clamp(y / rows, 0, 1), c = u < .55 ? mixC(top, mid, u / .55) : mixC(mid, hor, (u - .55) / .45);
      // a two-row band, ordered-dithered toward the next band so the gradient stays smooth in 320 px
      px.rect(g, X, Y + y, W, 2, css(c));
    }
    if (S.stars > 0) {
      const n = Math.round(90 * S.stars), r = E.rng(77);
      for (let i = 0; i < n; i++) { const x = ((r() * 2048 - turn * .5) % W + W) % W, y = r() * (cy - Y) * .92, tw = Math.sin(t * (1 + r() * 3) + i) > .7; px.dot(g, X + x, Y + y, tw ? '#ffffff' : r() < .5 ? '#9aa8d8' : '#d8d0f0'); }
    }
    const orb = S.sun || S.moon;
    if (orb) {
      const ox = X + (orb.x === null || orb.x === undefined ? -999 : orb.x * W), oy = Y + orb.y * (cy - Y), rr = orb.r || 10, c = orb.color || '#fff4d0';
      if (ox > X - rr * 4 && ox < X + W + rr * 4) {
        px.blend(g, .25, 'add', () => px.disc(g, ox, oy, rr * 2.8, c)); px.blend(g, .35, 'add', () => px.disc(g, ox, oy, rr * 1.7, c));
        const T = E.tones(c); px.disc(g, ox, oy, rr, T.base); px.disc(g, ox - 1, oy - 1, rr - 1.5, T.lt);
        if (S.moon) { px.disc(g, ox + rr * .3, oy + rr * .15, rr * .25, T.sh); px.disc(g, ox - rr * .35, oy + rr * .35, rr * .16, T.sh); }
      }
    }
    if (S.layers && S.layers.length) {
      const bd = this._backdrop(S.layers), Hs = Math.max(40, Math.round(cy - Y));
      for (const l of bd.layers) {
        const strip = bd._strip(l, Hs), P = strip.width, off = Math.floor((((turn + (l.drift || 0) * t) * l.parallax) % P + P) % P);
        const baseY = Math.round(cy + (l.y === undefined ? 0 : l.y) * Hs) - strip.height + 2;
        for (let x = -off; x < W; x += P) g.drawImage(strip, X + x, baseY);
        if (l.kind !== 'clouds' && l.kind !== 'fog' && l.fill !== false) px.rect(g, X, baseY + strip.height, W, Math.max(0, Y + H - baseY - strip.height), E.tones(l.color).sh);
      }
    }
  }
}

class Rail {
  constructor(route, o = {}) {
    this.route = route; this.o = Object.assign({ fov: 75, draw: 360, fogDist: 900, near: .6 }, o);
    this.sky = new Sky(); this.cam = null; this._picks = []; this._tc = new Map(); this._gradeKey = '';
    this.grade = { mul: [1, 1, 1], add: [0, 0, 0], fog: [190, 224, 255], density: 1, night: 0 };
    this.stats = { segs: 0, items: 0 };
  }
  /** the segment index holding route metre s (wrapped on a loop, clamped on a line) */
  segAt(s) { const R = this.route, n = R.segs.length; let i = Math.floor(s / L); return R.loop ? ((i % n) + n) % n : clamp(i, 0, n - 1); }
  wrap(s) { const R = this.route; return R.loop ? ((s % R.length) + R.length) % R.length : s; }
  /** track height at s (interpolated) */
  yAt(s) { const sg = this.route.segs[this.segAt(s)], u = clamp((this.wrap(s) - sg.s) / L, 0, 1); return sg.y0 + (sg.y1 - sg.y0) * u; }
  /** the grade at s, m per m */
  gradeAt(s) { const sg = this.route.segs[this.segAt(s)]; return (sg.y1 - sg.y0) / L; }
  /** heading at s in radians (sum of the bends) */
  headingAt(s) { const sg = this.route.segs[this.segAt(s)]; return sg.hd + sg.curve / L * clamp((this.wrap(s) - sg.s) / L, 0, 1); }
  /** the tint of a colour at fog level f (0..1, quantised): fog toward the horizon colour, the grade unless emissive */
  T(h, em, f) {
    const q = Math.round(clamp(f, 0, 1) * 23), key = h + (em ? '!' : '') + q; let c = this._tc.get(key); if (c) return c;
    const G = this.grade; let v = rgb(h);
    if (!em) v = [v[0] * G.mul[0] + G.add[0], v[1] * G.mul[1] + G.add[1], v[2] * G.mul[2] + G.add[2]];
    v = mixC(v, G.fog, (em ? .45 : 1) * q / 23);
    c = css(v); this._tc.set(key, c); return c;
  }
  setGrade(G) {
    const key = JSON.stringify(G); if (key === this._gradeKey) return; this._gradeKey = key; this.grade = G; this._tc.clear();
  }
  /** the view distance of route metre s from the camera (dir-aware, wrapped) */
  _vd(s) { const C = this.cam, R = this.route; let d = (s - C.s) * C.dir; if (R.loop) { d = ((d % R.length) + R.length) % R.length; if (d > R.length - 50) d -= R.length; } return d; }
  /** project view distance d, view-lateral x (already * dir), height y over the track there -> [sx, sy, k] or null */
  _P(d, x, y) {
    const C = this.cam; if (!C || d < this.o.near) return null;
    const D = C.D, n = C.n; let k = Math.floor((d - D[0]) / L); if (k < 0) k = 0; if (k >= n) return null;
    const u = (d - D[k]) / L, bx = C.X[k] + (C.X[k + 1] - C.X[k]) * u, ty = C.Y[k] + (C.Y[k + 1] - C.Y[k]) * u;
    const sc = C.depth / d, wy = ty + y - C.camY - C.gv * d;
    return [C.cx + sc * (bx + x - C.camX) * C.hw, C.cy - sc * wy * C.hw, sc * C.hw];
  }
  /** project route metre s, lateral x (route frame), height y over the track: [sx, sy, k] or null */
  project(s, x, y = 0) { const C = this.cam; if (!C) return null; const d = this._vd(s); return this._P(d, x * C.dir, y); }
  /** is that point in sight (not behind a crest or the camera)? */
  visible(s, x, y = 0) {
    const C = this.cam; if (!C) return false; const d = this._vd(s), p = this._P(d, x * C.dir, y); if (!p) return false;
    const k = clamp(Math.floor((d - C.D[0]) / L), 0, C.n - 1); return p[1] < C.clip[k] + 1;
  }
  /** what was drawn with a pick id under a screen point (the nearest first) */
  pick(sx, sy, pad = 4) { let best = null; for (const p of this._picks) if (sx >= p[0] - pad && sx <= p[2] + pad && sy >= p[1] - pad && sy <= p[3] + pad && (!best || p[5] < best[5])) best = p; return best ? best[4] : null; }
  /** draw the line over r's frame (an overlay; r.viewport's part in a split screen) */
  draw(r, cam, opt = {}) {
    r.overlay(g => this.paint(g, r.viewport || { x: 0, y: 0, w: r.W, h: r.H }, cam, opt, r));
  }
  paint(g, vp, cam, opt = {}, r = null) {
    const R = this.route, segs = R.segs, nS = segs.length, o = this.o, dir = cam.dir || 1, W = vp.w, H = vp.h;
    const fov = cam.fov || o.fov, depth = 1 / Math.tan(fov / 2 * Math.PI / 180), hw = W / 2;
    const s = this.wrap(cam.s), base = this.segAt(s), bs = segs[base];
    const camY = this.yAt(s) + (cam.h === undefined ? 2.9 : cam.h);
    const gv = (opt.pitchFollow === undefined ? .85 : opt.pitchFollow) * this.gradeAt(s) * dir;
    const cx = vp.x + W / 2 + (cam.lookX || 0) + (cam.shakeX || 0), cy = vp.y + H * (cam.horizon === undefined ? .4 : cam.horizon) + (cam.lookY || 0) + (cam.pitchPx || 0) + (cam.shakeY || 0);
    const N = Math.min(o.draw, R.loop ? nS - 2 : nS);
    const C = this.cam = { s, dir, x: cam.x || 0, camX: (cam.x || 0) * dir, camY, depth, hw, cx, cy, gv, n: 0, D: [], X: [], Y: [], clip: [], idx: [], vp, t: opt.t || 0 };
    this._picks = []; if (opt.grade) this.setGrade(opt.grade);
    const G = this.grade, Y0 = vp.y, Y1 = vp.y + H;
    // the sky first, behind everything
    g.save(); g.beginPath(); g.rect(vp.x, vp.y, W, H); g.clip(); px.reset(g);
    if (opt.sky) this.sky.draw(g, vp, opt.sky, cy, (opt.turn || 0) * dir + (dir < 0 ? 512 : 0), C.t, null);
    // near to far: each segment's view distance, bend and height; crest clipping
    const pct = dir > 0 ? (s - bs.s) / L : (bs.s + L - s) / L;
    let bx = 0, dx = -(bs.curve * dir) * pct, k = 0;
    const list = [];
    for (; k <= N; k++) {
      let j = dir > 0 ? base + k : base - k; if (R.loop) j = ((j % nS) + nS) % nS; else if (j < 0 || j >= nS) break;
      const sg = segs[j], Dk = dir > 0 ? sg.s - s + (R.loop && base + k >= nS ? R.length : 0) : s - (sg.s + L) + (R.loop && base - k < 0 ? R.length : 0);
      C.D.push(Dk); C.X.push(bx); C.Y.push(dir > 0 ? sg.y0 : sg.y1); C.idx.push(j);
      bx += dx; dx += sg.curve * dir;
      list.push(sg);
    }
    // the end point of the last segment
    C.n = list.length - 1; if (C.n < 1) { g.restore(); return; }
    { const last = list[C.n]; C.Y[C.n] = dir > 0 ? last.y0 : last.y1; }
    let maxy = Y1;
    for (let k = 0; k < C.n; k++) {
      const da = Math.max(C.D[k], o.near), db = C.D[k + 1], sg = list[k], gy = (sg.gy || 0) - .45;   // the ground lies under the ballast
      const p1 = this._P(da, 0, gy), p2 = this._P(db, 0, gy);
      C.clip.push(maxy);
      const show = !!(p1 && p2 && p2[1] < maxy);
      sg._show = show; sg._p1 = p1; sg._p2 = p2;
      if (show && p2[1] < maxy) maxy = p2[1];
    }
    C.clip.push(maxy);
    // far to near: the ground band, the beds, sleepers and rails, the strips and things in order, the wires
    const dyn = new Map();
    for (const a of opt.actors || []) for (const it of (a.items || [])) this._place(dyn, it);
    const fogDist = o.fogDist * (opt.fogScale || 1), dens = G.density || 1;
    const fogOf = d => 1 - Math.exp(-((d / fogDist) ** 2) * dens);
    const ctx = { g, rail: this, t: C.t, night: G.night || 0, wet: !!opt.wet, f: 0, T: (h, em) => this.T(h, em, ctx.f), vp, opt, Y0, Y1, dir, picks: this._picks };
    let items = 0;
    for (let k = C.n - 1; k >= 0; k--) {
      const sg = list[k], da = Math.max(C.D[k], o.near), db = C.D[k + 1]; if (db <= o.near) continue;
      const f = fogOf((da + db) / 2); ctx.f = f; ctx.k = k;
      const Z = R.zones[sg.zone] || R.zones.default, alt = (Math.floor(sg.i / 4) & 1);
      // ground (a crossing's asphalt, a bridge's water below the deck)
      if (sg._show) {
        const ya = Math.round(sg._p2[1]), yb = Math.round(sg._p1[1]);
        let gc = sg.flags.water ? (alt ? Z.water2 || '#2a5a8a' : Z.water || '#2f6494') : (Z.ground[alt] || Z.ground[0]);
        if (sg.groundCol) gc = sg.groundCol[alt] || sg.groundCol[0];
        px.rect(g, vp.x, ya, W, Math.max(1, yb - ya + (k === 0 ? H : 0)), this.T(gc, false, f));
        if (sg.flags.water && f < .9) {   // glints on the water
          const seed = (sg.i * 7919) % 97; for (let q = 0; q < 3; q++) { const u = ((seed * (q + 3) + Math.floor(C.t * 3) * 13) % 100) / 100, wx = vp.x + u * W; px.rect(g, wx, ya + (q % 2), Math.max(1, (sg._p1[2] || 1) * .6), 1, this.T('#cfe8ff', true, f)); }
        }
        if (sg.road) this._road(ctx, sg, da, db);
      }
      // a deck carries the tracks over a viaduct or a bridge (the ground lies far below)
      if (sg.deck) {
        const dd = sg.deck, dc = (sg.i >> 1) & 1 ? dd[2] || '#8a8680' : E.tones(dd[2] || '#8a8680').sh, Q = [this._P(da, dd[0] * dir, -.32), this._P(da, dd[1] * dir, -.32), this._P(db, dd[1] * dir, -.32), this._P(db, dd[0] * dir, -.32)];
        if (Q[0] && Q[1] && Q[2] && Q[3]) fill(g, Q, this.T(dc, false, f), Y0, Y1);
      }
      // the track beds, sleepers, rails
      for (const tr of sg.tracks) this._track(ctx, sg, tr, da, db, k);
      // strips and things touching this segment (static ones from the route, actors' from this frame), farthest across first
      const stat = sg.items, dl = dyn.get(sg.i);
      const all = dl ? stat.concat(dl) : stat;
      if (all.length) {
        const arr = []; for (const it of all) { const x0 = (it.x0 !== undefined ? it.x0 : it.x) * dir, x1 = (it.x1 !== undefined ? it.x1 : it.x) * dir; it._lat = Math.max(Math.abs(x0 - C.camX), Math.abs(x1 - C.camX)) + (it.bias || 0); arr.push(it); }
        arr.sort((a, b) => b._lat - a._lat);
        for (const it of arr) { if (it.s0 !== undefined) this._strip(ctx, it, sg, da, db); else this._thing(ctx, it, da, db); items++; }
      }
      // catenary wires above each electrified track
      if (sg.wire !== false) for (const tr of sg.tracks) if (tr.el !== false) this._wire(ctx, sg, tr, da, db, k);
    }
    // the headlight at night: an additive wash over our track
    if (opt.headlight && G.night > .3) {
      const tx = (cam.x || 0) * dir;
      const pts = [[1.5, -1.6], [120, -3.4], [120, 3.4], [1.5, 1.6]].map(([d, x]) => this._P(d, tx + x * 1 + 0, 0)).filter(Boolean);
      if (pts.length === 4) px.blend(g, .25 * G.night, 'add', () => fill(g, pts.map(p => [p[0], p[1]]), '#fff2c8', Y0, Y1));
      const pts2 = [[1.5, -.9], [60, -1.6], [60, 1.6], [1.5, .9]].map(([d, x]) => this._P(d, tx + x, 0)).filter(Boolean);
      if (pts2.length === 4) px.blend(g, .25 * G.night, 'add', () => fill(g, pts2.map(p => [p[0], p[1]]), '#fff8e0', Y0, Y1));
    }
    this.stats.segs = C.n; this.stats.items = items;
    g.restore(); px.reset(g);
  }
  _place(map, it) {
    if (it.s0 === undefined) { const j = this.segAt(it.s); let l = map.get(j); if (!l) map.set(j, l = []); l.push(it); return; }   // a point thing
    const a = it.s0, b = it.s1;
    for (let s = a; s < b + L; s += L) { const j = this.segAt(Math.min(s, b)); let l = map.get(j); if (!l) map.set(j, l = []); if (!l.includes(it)) l.push(it); }
  }
  // a crossing's road band across the whole view (and its white edge lines)
  _road(ctx, sg, da, db) {
    const { g, Y0, Y1 } = ctx, w = sg.road;   // { a, b }: the band's route metres
    const d0 = Math.max(da, this._vd(w.a)), d1 = Math.min(db, this._vd(w.b)); if (d1 <= d0) return;
    const p1 = this._P(d0, 0, -.3), p2 = this._P(d1, 0, -.3); if (!p1 || !p2) return;
    px.rect(g, ctx.vp.x, Math.round(p2[1]), ctx.vp.w, Math.max(1, Math.round(p1[1]) - Math.round(p2[1])), ctx.T('#4a4a52'));
    if (p1[2] > 2) { px.rect(g, ctx.vp.x, Math.round(p2[1]), ctx.vp.w, 1, ctx.T('#d8d8d0')); px.rect(g, ctx.vp.x, Math.round(p1[1]) - 1, ctx.vp.w, 1, ctx.T('#d8d8d0')); }
  }
  // one track: ballast bed, sleepers (near), two rails
  _track(ctx, sg, tr, da, db, k) {
    const { g, Y0, Y1 } = ctx, C = this.cam, dir = C.dir, u0 = (da - C.D[k]) / L, u1 = (db - C.D[k]) / L;
    const xa = (tr.x0 + (tr.x1 - tr.x0) * (dir > 0 ? u0 : 1 - u0)) * dir, xb = (tr.x0 + (tr.x1 - tr.x0) * (dir > 0 ? u1 : 1 - u1)) * dir;
    const q = (d1, x1, d2, x2, w, y, c) => { const a = this._P(d1, x1 - w, y), b = this._P(d1, x1 + w, y), c2 = this._P(d2, x2 + w, y), d = this._P(d2, x2 - w, y); if (a && b && c2 && d) fill(g, [a, b, c2, d], c, Y0, Y1); return a; };
    const side = tr.kind === 'side', bed = side ? '#6a5e52' : sg.flags.tunnel ? '#3e3a36' : tr.bed || '#8a8478';
    const alt = Math.floor(sg.i / 2) & 1;
    const pA = q(da, xa, db, xb, 1.55, -.22, ctx.T(alt ? bed : E.tones(bed).sh));
    if (!pA) return;
    const kk = pA[2];
    if (da < 160 && kk > 2.2) {   // sleepers: concrete (or old wood on the side tracks), 8 a segment
      const sc = side ? '#4a3a2e' : '#9a958c', sl = ctx.T(sc), sl2 = ctx.T(E.tones(sc).sh);
      for (let i = 0; i < 8; i++) {
        const sw = sg.s + (i + .5) * L / 8, d = this._vd(sw); if (d < da || d > db) continue;
        const u = (d - C.D[k]) / L, xm = (tr.x0 + (tr.x1 - tr.x0) * (dir > 0 ? u : 1 - u)) * dir;
        q(d - .12, xm, d + .12, xm, 1.2, -.15, kk > 8 ? sl : sl2);
      }
    }
    // the rails: quads when wide enough, else lines; bright tops; wet rails pick up the sky
    const railC = ctx.wet ? '#c8d4e0' : side ? '#6a5e56' : '#9aa0a8', top = ctx.T(ctx.wet ? '#f0f6ff' : '#d8dce4', ctx.night > .5 && da < 120);
    for (const sd of [-.533, .533]) {
      const a = this._P(da, xa + sd, 0), b = this._P(db, xb + sd, 0); if (!a || !b) continue;
      const w = .065 * a[2];
      if (w >= 1.5) { q(da, xa + sd, db, xb + sd, .04, 0, ctx.T(railC)); if (w >= 2) px.line(g, a[0], a[1], b[0], b[1], top, 1); }
      else px.line(g, a[0], a[1], b[0], b[1], kk > 6 ? top : ctx.T(railC), 1);
    }
  }
  // the contact wire and its messenger over a track, zig-zagging from mast to mast
  _wire(ctx, sg, tr, da, db, k) {
    const { g } = ctx, C = this.cam, dir = C.dir, zz = s => ((Math.floor(s / 50) & 1) ? .2 : -.2) * (1 - 2 * Math.abs(((s % 50) / 50) - .5)) * 2 - .2 * ((Math.floor(s / 50) & 1) ? 1 : -1);
    const xs = d => { const u = clamp((d - C.D[k]) / L, 0, 1); return (tr.x0 + (tr.x1 - tr.x0) * (dir > 0 ? u : 1 - u)) * dir; };
    const sa = C.s + da * dir, sb = C.s + db * dir, za = zz(this.wrap(sa)), zb = zz(this.wrap(sb));
    const top = sg.flags.tunnel ? 5.7 : 5.9, ct = sg.flags.tunnel ? 5.0 : 5.1;
    const a = this._P(da, xs(da) + za * dir, ct), b = this._P(db, xs(db) + zb * dir, ct); if (!a || !b) return;
    const wc = ctx.T(ctx.night > .5 ? '#2a2a30' : '#3a3a3e');
    px.line(g, a[0], a[1], b[0], b[1], wc, 1);
    const m1 = this._P(da, xs(da), top), m2 = this._P(db, xs(db), top); if (m1 && m2) px.line(g, m1[0], m1[1], m2[0], m2[1], wc, 1);
  }
  // a strip's slice in this segment: its side, top, under and near end faces
  _strip(ctx, st, sg, da, db) {
    const C = this.cam, dir = C.dir, R = this.route;
    let a = this._vd(dir > 0 ? st.s0 : st.s1), b = this._vd(dir > 0 ? st.s1 : st.s0);
    if (R.loop && a > b) a -= R.length;
    const d0 = Math.max(da, a, this.o.near), d1 = Math.min(db, b); if (d1 <= d0 + 1e-6) return;
    const x0 = Math.min(st.x0 * dir, st.x1 * dir), x1 = Math.max(st.x0 * dir, st.x1 * dir), F = st.faces || {};
    ctx.f = 1 - Math.exp(-((((d0 + d1) / 2) / (this.o.fogDist * (ctx.opt.fogScale || 1))) ** 2) * (this.grade.density || 1));
    const camY = C.camY - this._tyAt(d0) + C.gv * d0;   // the camera's height over this slice's track
    const sOf = d => C.s + d * dir;   // view distance back to route metres
    const uOf = d => { let s = sOf(d) - st.s0; if (R.loop) s = ((s % R.length) + R.length) % R.length; if (s > (st.s1 - st.s0) + 1) s -= R.length; return s; };
    const ua = uOf(d0), ub = uOf(d1), u0 = Math.min(ua, ub), u1 = Math.max(ua, ub);
    // faces back to front: the top or under, then the side toward the camera, then the near end, then a roof
    if (F.under && camY < st.y0) this._face(ctx, st, F.under, 'under', d0, d1, x0, x1, st.y0, st.y0, u0, u1);
    if (F.top && camY > st.y1 && !F.roof) this._face(ctx, st, F.top, 'top', d0, d1, x0, x1, st.y1, st.y1, u0, u1);
    if (F.side) {
      if (x1 < C.camX) this._face(ctx, st, F.side, 'side', d0, d1, x1, x1, st.y0, st.y1, u0, u1);
      else if (x0 > C.camX) this._face(ctx, st, F.side, 'side', d0, d1, x0, x0, st.y0, st.y1, u0, u1);
    }
    if (F.roof) this._roof(ctx, st, F.roof, d0, d1, x0, x1, u0, u1, camY);
    const nearF = dir > 0 ? F.end : (F.end2 || F.end);   // the end facing the camera: s0's in the forward view, s1's looking back
    if (nearF && a >= da - 1e-6 && a <= db && a >= this.o.near) this._face(ctx, st, nearF, 'end', a, a, x0, x1, st.y0, st.y1, x0, x1);
    if (st.pick && d0 === Math.max(da, a)) { const p = this._P(d0, (x0 + x1) / 2, st.y1); if (p) ctx.picks.push([p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8, st.pick, d0]); }
  }
  _tyAt(d) { const C = this.cam; const k = clamp(Math.floor((d - C.D[0]) / L), 0, C.n - 1), u = (d - C.D[k]) / L; return C.Y[k] + (C.Y[k + 1] - C.Y[k]) * u; }
  /** one face of a strip over d0..d1 (side: at x = xa; top / under: at y = ya; end: at d = d0) */
  _face(ctx, st, spec, kind, d0, d1, xa, xb, ya, yb, u0, u1, far) {
    const { g, Y0, Y1 } = ctx, col = typeof spec === 'string' ? spec : spec.col, em = typeof spec === 'object' && spec.em;
    const P = (d, x, y) => this._P(d, x, y);
    const quad = (dA, dB, xA, xB, yA, yB, c) => {
      let pts;
      if (kind === 'side') pts = [P(dA, xA, yA), P(dA, xA, yB), P(dB, xA, yB), P(dB, xA, yA)];
      else if (kind === 'end') pts = [P(dA, xA, yA), P(dA, xB, yA), P(dA, xB, yB), P(dA, xA, yB)];
      else pts = [P(dA, xA, yA), P(dA, xB, yA), P(dB, xB, yA), P(dB, xA, yA)];
      if (pts[0] && pts[1] && pts[2] && pts[3]) fill(g, pts, c, Y0, Y1);
      return pts[0];
    };
    const p0 = col ? quad(d0, d1, xa, xb, ya, yb, ctx.T(col, em)) : P(d0, xa, ya);
    if (!p0 || typeof spec !== 'object' || !spec.pattern) return;
    const k = p0[2]; if (k < (spec.minK || .8)) return;
    const C = this.cam, dir = C.dir, R = this.route;
    // F.rect(uA, uB, vA, vB, col, em): u along the face (route metres from the strip's start for side / top / under,
    // lateral metres for an end), v up (side, end) or across (top, under)
    const dOfU = u => this._vd(st.s0 + u);
    const F = {
      k, u0, u1, kind, strip: st, night: ctx.night, t: ctx.t, T: ctx.T, far: !!far, x: xa, xr: xb, y0: ya, y1: yb, dir,
      rect: (uA, uB, vA, vB, c, emi) => {
        const cc = emi === true || emi === false ? ctx.T(c, emi) : ctx.T(c, !!(em));
        if (kind === 'end') { const xA = clamp(Math.min(uA, uB), xa, xb), xB = clamp(Math.max(uA, uB), xa, xb); if (xB <= xA) return; quad(d0, d0, xA, xB, Math.max(vA, ya), Math.min(vB, yb), cc); return; }
        let a1 = Math.max(Math.min(uA, uB), u0), b1 = Math.min(Math.max(uA, uB), u1); if (b1 <= a1) return;
        let dA = dOfU(a1), dB = dOfU(b1); if (R.loop) { if (dA > R.length / 2) dA -= R.length; if (dB > R.length / 2) dB -= R.length; }
        if (dA > dB) { const t = dA; dA = dB; dB = t; } dA = Math.max(dA, d0); dB = Math.min(dB, d1); if (dB <= dA) return;
        if (kind === 'side') quad(dA, dB, xa, xa, Math.max(vA, ya), Math.min(vB, yb), cc);
        else quad(dA, dB, clamp(xa + Math.min(vA, vB), xa, xb), clamp(xa + Math.max(vA, vB), xa, xb), ya, ya, cc);
      }
    };
    spec.pattern(F);
  }
  /** a gable roof over a box: the slope toward the camera and the gable end */
  _roof(ctx, st, spec, d0, d1, x0, x1, u0, u1, camY) {
    const { g, Y0, Y1 } = ctx, C = this.cam, rh = spec.h || (x1 - x0) * .35, xm = (x0 + x1) / 2, y = st.y1, col = spec.col || '#6a4a3a';
    const P = (d, x, yy) => this._P(d, x, yy);
    const near = Math.abs(x0 - C.camX) < Math.abs(x1 - C.camX) ? x0 : x1, farx = near === x0 ? x1 : x0;
    const slope = (xe, c) => { const p = [P(d0, xe, y), P(d0, xm, y + rh), P(d1, xm, y + rh), P(d1, xe, y)]; if (p.every(Boolean)) fill(g, p, c, Y0, Y1); };
    if (camY > y + rh) slope(farx, ctx.T(E.tones(col).sh));
    slope(near, ctx.T(col));
    const T = this._P(d0, xm, y + rh); if (T && T[2] > 3) { const a = P(d0, xm, y + rh), b = P(d1, xm, y + rh); if (a && b) px.line(g, a[0], a[1], b[0], b[1], ctx.T(E.tones(col).hi), 1); }
    const a = this._vd(C.dir > 0 ? st.s0 : st.s1);
    if (a >= d0 - 1e-6 && a <= d1 && a >= this.o.near) { const p = [P(a, x0, y), P(a, x1, y), P(a, xm, y + rh)]; if (p.every(Boolean)) fill(g, p, ctx.T(spec.gable || E.tones(st.faces.end ? (typeof st.faces.end === 'string' ? st.faces.end : st.faces.end.col) : col).sh), Y0, Y1); }
  }
  // a point thing at its base, k pixels a metre
  _thing(ctx, th, da, db) {
    const C = this.cam, d = this._vd(th.s); if (d < da - 1e-6 || d >= db || d < (th.near || 1.2)) return;
    ctx.f = 1 - Math.exp(-((d / (this.o.fogDist * (ctx.opt.fogScale || 1))) ** 2) * (this.grade.density || 1));
    const p = this._P(d, th.x * C.dir, th.y || 0); if (!p) return;
    if (p[0] < ctx.vp.x - 400 || p[0] > ctx.vp.x + ctx.vp.w + 400) return;
    try { th.draw(ctx.g, p[0], p[1], p[2], ctx, th, d); } catch (e) { if (!this._err) { this._err = true; console.error('rail thing', th.kind, e); } }
    px.reset(ctx.g);
    if (th.pick) ctx.picks.push([p[0] - Math.max(4, (th.w || 1) * p[2] / 2), p[1] - Math.max(8, (th.h || 3) * p[2]), p[0] + Math.max(4, (th.w || 1) * p[2] / 2), p[1], th.pick, d]);
  }
}
Rail.fill = fill; Rail.rgb = rgb; Rail.hexOf = hexOf; Rail.mix = mixC; Rail.L = L;
E.Rail = Rail;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
