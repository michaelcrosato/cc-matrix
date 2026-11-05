/*!
my-3D2dge module RAIL (Densha de Halo!): a pseudo-3D railway renderer, a fork of modules/road.js
Loads after: the full engine. Needs: no other module.

road.js draws one road from one camera. A railway needs more: several tracks that diverge, raised platforms, long side
objects (trains, buildings, walls, tunnels) drawn as extrusions along the line, a camera that can look backward (platform
and trackside cameras), and square pixels on wide screens (road.js scales y by the half height, which squashes 16:9).
- const rail = new DH.Rail(route, { fov, draw, fog }): route is a compiled route (DH.compileRoute): 5 m segments with
  curve, height, flags, zone, tracks, strips and things.
- rail.draw(r, cam, env): cam = { s, x, h, dir: 1 | -1, fov, horizon, lookX, lookY, pitchPx, shake }, env = { actors,
  grade, weather, t, fogDist, extraStrips }. Draws into r.overlay (r.viewport's part in a split screen).
- rail.project(s, x, y) -> [sx, sy, k] (k = pixels per metre) for the last camera, or null; rail.visible(s, x, y);
  rail.pick(sx, sy) -> the pickable thing drawn under a screen point (front-most).
Strips: { s0, s1, x0, x1, y0, y1, faces: { side, top, under, end0, end1 }, kind, lit }. Each face drawer is
(g, F, C): F = { pts, kind, u0, u1, v0, v1, at(u, v) -> [sx, sy], k }, C = the frame's context (tint, time, night).
A face given as a colour string is filled flat. Things: { s, x, y, draw(g, sx, sy, k, C), pick }.
*/
(function (E) {
'use strict';
if (!E) throw new Error('rail.js: load my-3d2dge.js first');
const DH = (window.DH = window.DH || {}), px = E.px, clamp = E.clamp;
const SEG = 5;

/* ---------- colour pipeline: hex -> graded (time of day) -> fogged; cached per frame ---------- */
const HEXC = new Map();
const rgb = h => { let v = HEXC.get(h); if (!v) { v = E.hex(h); HEXC.set(h, v); } return v; };
const css = (r, g, b) => 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';

/* a convex (or simple) polygon filled by rows, clipped to the viewport rows, with whole pixels */
function fill(g, pts, col, y0c, y1c) {
  let ya = 1e9, yb = -1e9;
  for (const p of pts) { if (p[1] < ya) ya = p[1]; if (p[1] > yb) yb = p[1]; }
  ya = Math.max(Math.round(ya), y0c); yb = Math.min(Math.round(yb), y1c);
  if (yb < ya) return;
  px.col(g, col);
  const n = pts.length;
  for (let y = ya; y <= yb; y++) {
    let xa = 1e9, xb = -1e9, hit = false;
    const yy = y + .5;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
        const x = a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
        if (x < xa) xa = x; if (x > xb) xb = x; hit = true;
      }
    }
    if (!hit) continue;
    const L = Math.round(Math.max(xa, -4000)), R = Math.round(Math.min(xb, 8000));
    if (R >= L) g.fillRect(L, y, R - L + (R === L ? 1 : 0) || 1, 1);
  }
}
DH.fillPoly = fill;

class Rail {
  constructor(route, o = {}) {
    this.R = route; this.o = Object.assign({ fov: 75, draw: 360, fog: 900 }, o);
    this._views = new Map(); this._last = null; this._picks = []; this._tint = new Map();
    this.stats = { strips: 0, things: 0 };
  }
  /* the view distance of route position s from the last (or given) camera, or NaN when behind */
  _vd(s, cam) {
    const R = this.R, L = R.len;
    let d = cam.dir > 0 ? s - cam.s : cam.s - s;
    if (R.loop) { d = ((d % L) + L) % L; if (d > L - 50) d -= L; }
    return d;
  }
  /* engine view for rigs at k pixels per metre (1 m = 15 rig units), turned by yaw degrees */
  view(k, yaw = 0, pitch = 6) {
    const q = Math.max(1 / 16, Math.round(k / 15 * 16) / 16), key = q + ':' + yaw + ':' + pitch;
    let v = this._views.get(key); if (!v) { if (this._views.size > 500) this._views.clear(); v = new E.View('rail', 'Rail', yaw, pitch, q, 1); this._views.set(key, v); }
    return v;
  }
  /* the grade's colour transform, cached per frame */
  _colorFns(env) {
    const G = env.grade || { amb: [1, 1, 1], fog: '#bfe0ff' }, F = rgb(G.fog || '#bfe0ff'), fogDist = env.fogDist || this.o.fog, dens = env.fogDensity || 1;
    const cache = this._tint; cache.clear();
    const amb = G.amb || [1, 1, 1];
    const tint = (hex, d, em) => {
      const fq = d <= 0 ? 0 : Math.min(15, Math.round((1 - Math.exp(-((d / fogDist) ** 2) * dens)) * 15)), key = hex + (em ? '!' : ':') + fq;
      let v = cache.get(key); if (v) return v;
      const c = rgb(hex), f = fq / 15 * (em ? .55 : 1);
      let r = c[0], g = c[1], b = c[2];
      if (!em) { r *= amb[0]; g *= amb[1]; b *= amb[2]; }
      r = Math.min(255, r + (F[0] - r) * f); g = Math.min(255, g + (F[1] - g) * f); b = Math.min(255, b + (F[2] - b) * f);
      v = css(r, g, b); cache.set(key, v); return v;
    };
    return { tint, F, fogDist };
  }
  /** draw the railway seen from cam into r's frame */
  draw(r, cam, env = {}) {
    const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H };
    r.overlay(g => this.paint(g, vp, cam, env));
  }
  /** paint straight onto a canvas context g (r.overlay's, or an offscreen buffer for postcards) */
  paint(g, vp, cam, env = {}) {
    const R = this.R, o = this.o, W = vp.w, H = vp.h, hw = W / 2, dir = cam.dir || 1;
    const fov = (cam.fov || o.fov) * Math.PI / 180, depth = 1 / Math.tan(fov / 2), K = depth * hw;
    const cx = vp.x + W / 2 + (cam.lookX || 0) + (cam.shakeX || 0), cy = vp.y + H * (cam.horizon === undefined ? .4 : cam.horizon) + (cam.lookY || 0) + (cam.pitchPx || 0) + (cam.shakeY || 0);
    const y0c = vp.y, y1c = vp.y + H - 1, t = env.t || 0, N = Math.min(o.draw, R.n), Ln = R.len;
    const s0 = R.loop ? ((cam.s % Ln) + Ln) % Ln : clamp(cam.s, 0, Ln - .01), i0 = Math.min(R.n - 1, Math.floor(s0 / SEG)), pct = (s0 - i0 * SEG) / SEG;
    const camY = R.yAt(s0) + (cam.h === undefined ? 2.9 : cam.h), camX = dir > 0 ? (cam.x || 0) : -(cam.x || 0);
    const { tint, F } = this._colorFns(env);
    const night = (env.grade && env.grade.night) || 0, wet = env.weather === 'rain';
    const C = { tint, t, night, wet, K, cx, cy, dir, rail: this, env, cam, vp, y0c, y1c, camY, camX, fill: (pts, col) => fill(g, pts, col, y0c, y1c) };
    // boundaries near -> far
    const off = dir > 0 ? pct * SEG : (1 - pct) * SEG, u0 = off / SEG;
    const D = this._D || (this._D = new Float64Array(o.draw + 2)), B = this._B || (this._B = new Float64Array(o.draw + 2)), Y = this._Y || (this._Y = new Float64Array(o.draw + 2));
    const SI = this._SI || (this._SI = new Int32Array(o.draw + 2)), CL = this._CL || (this._CL = new Float64Array(o.draw + 2));
    let n = 0, slope = 0;
    for (let k = 0; k <= N; k++) {
      const segIdx = dir > 0 ? i0 + k : i0 - k, bIdx = dir > 0 ? i0 + k : i0 + 1 - k;
      if (!R.loop && (segIdx < 0 || segIdx >= R.n) && k < N) { if (k === 0) return; D[k] = k * SEG - off; Y[k] = R.y[clamp(bIdx, 0, R.n)]; B[k] = B[k - 1] + slope; n = k; break; }
      const si = ((segIdx % R.n) + R.n) % R.n, bi = ((bIdx % R.n) + R.n) % R.n;
      const c = (dir > 0 ? R.curve[si] : -R.curve[si]);
      D[k] = k * SEG - off; Y[k] = R.y[bi]; SI[k] = si;
      if (k === 0) { B[0] = c * u0 * u0 / 2; slope = -c * u0; }
      else if (k === 1) { const cp = dir > 0 ? R.curve[SI[0]] : -R.curve[SI[0]]; B[1] = cp * (1 - u0) * (1 - u0) / 2; slope = cp * (1 - u0); }
      else { const cp = dir > 0 ? R.curve[SI[k - 1]] : -R.curve[SI[k - 1]]; B[k] = B[k - 1] + slope + cp / 2; slope += cp; }
      n = k;
    }
    // per-span clip (crests): the ground line's screen row so far, near to far
    let maxy = vp.y + H;
    for (let k = 0; k < n; k++) {
      CL[k] = maxy;
      const d2 = D[k + 1]; if (d2 <= .5) continue;
      const y2 = cy - (Y[k + 1] - camY) * K / d2;
      if (y2 < maxy) maxy = y2;
    }
    const last = this._last = { D, B, Y, SI, CL, n, K, cx, cy, camX, camY, dir, s: s0, vp, off };
    // the projection helpers for this frame
    const at = (d, k) => { const u = (d - D[k]) / SEG; return [B[k] + (B[k + 1] - B[k]) * u, Y[k] + (Y[k + 1] - Y[k]) * u]; };
    const P = (d, x, yabs, k) => { const [b] = at(d, k), q = K / d; return [cx + (b + x - camX) * q, cy - (yabs - camY) * q]; };
    C.P = P; C.at = at;
    // sky and backdrop
    this._sky(g, vp, cam, env, C, R.headAt(s0) + (dir > 0 ? 0 : Math.PI), K, cx, cy, F);
    // the far ground fill under the horizon (it shows through gaps past the draw distance)
    const z0 = R.zones[R.zone[i0]] || R.zones[0];
    px.rect(g, vp.x, Math.round(cy), W, Math.max(0, vp.y + H - Math.round(cy)), tint(z0.ground[0], 99999));
    // this frame's dynamic strips (trains) by span
    const dyn = new Map(), addDyn = st => {
      let a = this._vd(dir > 0 ? st.s0 : st.s1, cam), b = this._vd(dir > 0 ? st.s1 : st.s0, cam);
      if (b < -1 || a > D[n]) return;
      const k0 = Math.max(0, Math.floor((Math.max(a, D[0]) + off) / SEG)), k1 = Math.min(n - 1, Math.floor((Math.min(b, D[n] - .01) + off) / SEG));
      for (let k = k0; k <= k1; k++) { let l = dyn.get(k); if (!l) dyn.set(k, l = []); l.push(st); }
    };
    for (const a of env.actors || []) for (const st of a.strips()) addDyn(st);
    for (const st of env.extraStrips || []) addDyn(st);
    const dynThings = new Map();
    for (const th of env.extraThings || []) { const d = this._vd(th.s, cam); if (d < .6 || d > D[n]) continue; const k = Math.floor((d + off) / SEG); let l = dynThings.get(k); if (!l) dynThings.set(k, l = []); l.push(th); }
    this._picks.length = 0; this.stats.strips = 0; this.stats.things = 0;
    // far -> near
    const list = [];
    for (let k = n - 1; k >= 0; k--) {
      const d1 = Math.max(D[k], .5), d2 = D[k + 1]; if (d2 <= .5) continue;
      const si = SI[k], seg = si, zone = R.zones[R.zone[seg]] || R.zones[0], flags = R.flags[seg];
      const q1 = K / d1, q2 = K / d2, [b1, h1] = at(d1, k), [b2, h2] = at(d2, k);
      const drop = R.drop[seg] || 0;
      const gy1 = cy - (h1 - drop - camY) * q1, gy2 = cy - (h2 - drop - camY) * q2;
      // 1. ground band
      if (gy2 < gy1 || k === 0) {
        const alt = Math.floor(si / 4) % 2, bot = k === 0 ? vp.y + H : gy1;
        let gc = zone.ground[alt];
        if (flags & 2) gc = zone.water || '#2a5a8a';
        px.rect(g, vp.x, Math.round(gy2), W, Math.max(1, Math.round(bot) - Math.round(gy2)), tint(gc, d2));
        if ((flags & 2) && d2 < 700) {   // water glints on a bridge
          const gl = tint('#9ad0f0', d2);
          for (let j = 0; j < 4; j++) { const wx = cx + ((j * 97 + si * 31 + Math.floor(t * 3) * 13) % W) - W / 2; if (((si + j + Math.floor(t * 2)) % 3) === 0) px.rect(g, wx, Math.round(gy2), Math.max(1, Math.round(6 * q2 / 4)), 1, gl); }
        }
        if (flags & 4) {   // a level crossing: asphalt across, white edges
          fill(g, [[vp.x, gy1 + 0], [vp.x + W, gy1], [vp.x + W, gy2], [vp.x, gy2]], tint('#3a3a40', d2), y0c, y1c);
          if (R.flags[(si + (dir > 0 ? -1 : 1) + R.n) % R.n] & 4 ? false : true) px.rect(g, vp.x, Math.round(gy1) - 1, W, 1, tint('#e8e8e0', d1));
        }
      }
      // 2. track beds, sleepers, rails
      const tracks = R.tracks[seg];
      for (const tr of tracks) {
        const xa = dir > 0 ? tr.x0 : -tr.x1, xb = dir > 0 ? tr.x1 : -tr.x0, xn = dir > 0 ? xa : xb, xf = dir > 0 ? xb : xa;
        const tx1 = xn + (xf - xn) * ((d1 - D[k]) / SEG), tx2 = xn + (xf - xn) * ((d2 - D[k]) / SEG);
        const X1 = cx + (b1 + tx1 - camX) * q1, X2 = cx + (b2 + tx2 - camX) * q2, Y1 = cy - (h1 - camY) * q1, Y2 = cy - (h2 - camY) * q2;
        const bal = tr.side ? '#5a5248' : (zone.ballast || '#7a746a');
        fill(g, [[X1 - 1.6 * q1, Y1], [X1 + 1.6 * q1, Y1], [X2 + 1.6 * q2, Y2], [X2 - 1.6 * q2, Y2]], tint(bal, d2), y0c, y1c);
        if (d1 < 160) {   // sleepers, 0.6 m apart
          const sc = tint(tr.side ? '#3a3028' : '#4a4038', d2);
          const sStart = Math.ceil(d1 / .6) * .6;
          for (let sd = sStart; sd < d2; sd += .6) {
            const e = sd + .24, u = (sd - d1) / (d2 - d1), ue = Math.min(1, (e - d1) / (d2 - d1));
            const qa = K / sd, qe = K / Math.min(e, d2), ba = b1 + (b2 - b1) * u, be = b1 + (b2 - b1) * ue, ha = h1 + (h2 - h1) * u, he = h1 + (h2 - h1) * ue, xa2 = tx1 + (tx2 - tx1) * u, xe2 = tx1 + (tx2 - tx1) * ue;
            const Xa = cx + (ba + xa2 - camX) * qa, Ya = cy - (ha - camY) * qa, Xe = cx + (be + xe2 - camX) * qe, Ye = cy - (he - camY) * qe;
            if (Ya - Ye < .6 && qa < 30) { px.rect(g, Xa - 1.2 * qa, Math.round(Ya), Math.max(1, 2.4 * qa), 1, sc); continue; }
            fill(g, [[Xa - 1.2 * qa, Ya], [Xa + 1.2 * qa, Ya], [Xe + 1.2 * qe, Ye], [Xe - 1.2 * qe, Ye]], sc, y0c, y1c);
          }
        }
        const rc = tint(wet ? '#c8d4e4' : tr.side ? '#7a6a5a' : '#a8a8b0', d2), rh = tint(wet ? '#f0f8ff' : '#e8e8f0', d2);
        for (const sd of [-.533, .533]) {
          const ra = X1 + sd * q1, rb = X2 + sd * q2, w1 = .07 * q1, w2 = .07 * q2;
          if (w1 < 1.2) px.line(g, ra, Y1, rb, Y2, rc);
          else { fill(g, [[ra - w1, Y1], [ra + w1, Y1], [rb + w2, Y2], [rb - w2, Y2]], rc, y0c, y1c); px.line(g, ra, Y1 - 1, rb, Y2 - 1, rh); }
        }
      }
      // 3. strips and things in this span, farthest laterally first
      list.length = 0;
      for (const st of R.strips[seg]) list.push(st);
      const dl = dyn.get(k); if (dl) for (const st of dl) list.push(st);
      for (const th of R.things[seg]) list.push(th);
      const dt = dynThings.get(k); if (dt) for (const th of dt) list.push(th);
      if (list.length) {
        for (const it of list) { const xm = it.x0 !== undefined ? (dir > 0 ? (it.x0 + it.x1) / 2 : -(it.x0 + it.x1) / 2) : (dir > 0 ? it.x : -it.x); it._lat = Math.abs(xm - camX) + (it.x0 !== undefined ? 0 : -.01); }
        list.sort((a, b) => b._lat - a._lat);
        for (const it of list) {
          if (it.x0 !== undefined) this._strip(g, it, k, D, d1, d2, C);
          else this._thing(g, it, k, C);
        }
      }
      // 4. catenary wires
      for (const tr of tracks) {
        if (!tr.el || d2 > 900 || d1 < 6) continue;
        const xa = dir > 0 ? tr.x0 : -tr.x1, xb = dir > 0 ? tr.x1 : -tr.x0, xn = dir > 0 ? xa : xb, xf = dir > 0 ? xb : xa;
        const zz = (Math.floor((R.sAt(si)) / 50) % 2 ? .2 : -.2);
        const tx1 = xn + (xf - xn) * ((d1 - D[k]) / SEG) + zz, tx2 = xn + (xf - xn) * ((d2 - D[k]) / SEG) + zz;
        const wc = tint('#2a2a30', d2);
        if (flags & 1) continue;
        for (const hgt of [5.1, 5.9]) px.line(g, cx + (b1 + tx1 - camX) * q1, cy - (h1 + hgt - camY) * q1, cx + (b2 + tx2 - camX) * q2, cy - (h2 + hgt - camY) * q2, wc);
      }
    }
    // night: the headlight's pool on our own track
    if (env.headlight && night > .3) {
      const a = Math.min(1, (night - .3) * 1.6) * .25, pts = [];
      const tx = dir > 0 ? (cam.x || 0) : -(cam.x || 0);
      for (const [dd, w] of [[4, 2.2], [120, 4]]) { const k = Math.min(n - 1, Math.floor((dd + off) / SEG)); if (k < 0) continue; const [bb, hh] = at(dd, k), q = K / dd; pts.push([cx + (bb + tx - camX - w) * q, cy - (hh - camY) * q], [cx + (bb + tx - camX + w) * q, cy - (hh - camY) * q]); }
      if (pts.length === 4) px.blend(g, a, 'add', () => fill(g, [pts[0], pts[1], pts[3], pts[2]], '#ffe8b0', y0c, y1c));
    }
  }
  /* one strip's slice in span k */
  _strip(g, st, k, D, d1, d2, C) {
    const dir = C.dir, K = C.K, cx = C.cx, cy = C.cy, camX = C.camX, camY = C.camY, cam = C.cam;
    let a = this._vd(dir > 0 ? st.s0 : st.s1, cam), b = this._vd(dir > 0 ? st.s1 : st.s0, cam);
    if (b < a) { const tt = a; a = b; b = tt; }
    const dn = Math.max(a, d1), df = Math.min(b, d2); if (df <= dn || df <= .5) return;
    this.stats.strips++;
    const xa = dir > 0 ? st.x0 : -st.x1, xb = dir > 0 ? st.x1 : -st.x0;
    const [bn, hn] = C.at(dn, k), [bf, hf] = C.at(df, k), qn = K / dn, qf = K / df;
    const X = (b, x, q) => cx + (b + x - camX) * q, Yp = (h, y, q) => cy - (h + y - camY) * q;
    const fd = st._fogD = df;
    const faces = st.faces, ts = st.lit && C.night > .4;
    const face = (drawer, F) => {
      if (!drawer) return;
      if (typeof drawer === 'string') { C.fill(F.pts, C.tint(drawer, fd, st.emissive)); return; }
      drawer(g, F, C, st);
    };
    // s-coordinates of the slice ends in strip space (u along the strip from s0)
    const sN = dir > 0 ? st.s0 + (dn - a) : st.s1 - (dn - a), sF = dir > 0 ? st.s0 + (df - a) : st.s1 - (df - a);
    const uOf = sv => { let u = sv - st.s0; if (this.R.loop) { const L = this.R.len; if (u < -L / 2) u += L; if (u > L / 2) u -= L; } return u; };
    const uN = uOf(sN), uF = uOf(sF);
    const mkAt = (fn) => fn;
    // top or underside
    const yTop = st.y1, yBot = st.y0;
    if (faces.top && camY > hn + yTop - .01) {
      const pts = [[X(bn, xa, qn), Yp(hn, yTop, qn)], [X(bn, xb, qn), Yp(hn, yTop, qn)], [X(bf, xb, qf), Yp(hf, yTop, qf)], [X(bf, xa, qf), Yp(hf, yTop, qf)]];
      face(faces.top, { pts, kind: 'top', u0: uN, u1: uF, v0: xa, v1: xb, k: qn, d: dn, df,
        at: mkAt((u, v) => { const dd = dn + (df - dn) * ((u - uN) / ((uF - uN) || 1)); const kk = Math.max(0, Math.min(this._last.n - 1, Math.floor((dd + this._last.off) / SEG))); const [bb, hh] = C.at(dd, kk), q = K / dd; return [X(bb, v, q), Yp(hh, yTop, q)]; }) });
    }
    if (faces.under && camY < hn + yBot) {
      const pts = [[X(bn, xa, qn), Yp(hn, yBot, qn)], [X(bn, xb, qn), Yp(hn, yBot, qn)], [X(bf, xb, qf), Yp(hf, yBot, qf)], [X(bf, xa, qf), Yp(hf, yBot, qf)]];
      face(faces.under, { pts, kind: 'under', u0: uN, u1: uF, v0: xa, v1: xb, k: qn, d: dn, df, at: () => [0, 0] });
    }
    // the side nearer the camera
    let sx = null;
    if (xb < camX) sx = xb; else if (xa > camX) sx = xa;
    if (sx !== null && faces.side) {
      const pts = [[X(bn, sx, qn), Yp(hn, yBot, qn)], [X(bf, sx, qf), Yp(hf, yBot, qf)], [X(bf, sx, qf), Yp(hf, yTop, qf)], [X(bn, sx, qn), Yp(hn, yTop, qn)]];
      face(faces.side, { pts, kind: 'side', u0: uN, u1: uF, v0: yBot, v1: yTop, k: qn, d: dn, df, left: sx === xb,
        at: (u, v) => { const dd = dn + (df - dn) * ((u - uN) / ((uF - uN) || 1)); const kk = Math.max(0, Math.min(this._last.n - 1, Math.floor((dd + this._last.off) / SEG))); const [bb, hh] = C.at(dd, kk), q = K / dd; return [X(bb, sx, q), Yp(hh, v, q)]; } });
    }
    // the end facing the camera, when it lies in this slice
    if (a >= d1 - 1e-6 && a <= d2 && a > .5) {
      const fdw = dir > 0 ? faces.end0 : faces.end1;
      if (fdw) {
        const pts = [[X(bn, xa, qn), Yp(hn, yBot, qn)], [X(bn, xb, qn), Yp(hn, yBot, qn)], [X(bn, xb, qn), Yp(hn, yTop, qn)], [X(bn, xa, qn), Yp(hn, yTop, qn)]];
        const F = { pts, kind: 'end', u0: xa, u1: xb, v0: yBot, v1: yTop, k: qn, d: dn, df: dn, at: (u, v) => [X(bn, u, qn), Yp(hn, v, qn)] };
        face(fdw, F);
        if (st.pick) this._picks.push({ x0: Math.min(pts[0][0], pts[1][0]), x1: Math.max(pts[0][0], pts[1][0]), y0: pts[2][1], y1: pts[0][1], what: st.pick, d: dn });
      }
    }
  }
  /* a point thing at its base */
  _thing(g, th, k, C) {
    const d = this._vd(th.s, C.cam); if (d <= .6) return;
    const dk = Math.max(0, Math.min(this._last.n - 1, Math.floor((d + this._last.off) / SEG)));
    const [bb, hh] = C.at(d, dk), q = C.K / d, x = C.dir > 0 ? th.x : -th.x;
    const sx = C.cx + (bb + x - C.camX) * q, sy = C.cy - (hh + (th.y || 0) - C.camY) * q;
    if (sx < C.vp.x - 400 || sx > C.vp.x + C.vp.w + 400) return;
    if (q < .25 && !th.far) return;
    this.stats.things++;
    C.d = d;
    px.reset(g);
    th.draw(g, sx, sy, q, C, th);
    if (th.pick) { const w = (th.pw || 1.2) * q, h = (th.ph || 3) * q; this._picks.push({ x0: sx - w - 3, x1: sx + w + 3, y0: sy - h - 3, y1: sy + 3, what: th.pick, d }); }
  }
  /* the sky: a stepped gradient, the sun or moon and stars, clouds, backdrop silhouettes that turn with the heading */
  _sky(g, vp, cam, env, C, heading, K, cx, cy, F) {
    const G = env.grade || {}, top = G.skyTop || '#3a78d8', hor = G.skyHor || '#bfe0ff', W = vp.w, hY = Math.round(cy);
    const T = rgb(top), Hc = rgb(hor), bands = 14, h0 = vp.y, hh = Math.max(1, hY - h0);
    for (let i = 0; i < bands; i++) {
      const u = i / (bands - 1), y = h0 + Math.floor(hh * i / bands), y2 = h0 + Math.floor(hh * (i + 1) / bands), e = u * u;
      px.rect(g, vp.x, y, W, y2 - y + 1, css(T[0] + (Hc[0] - T[0]) * e, T[1] + (Hc[1] - T[1]) * e, T[2] + (Hc[2] - T[2]) * e));
    }
    const ang = sx => heading + Math.atan((sx - cx) / K);
    // stars at night
    if ((G.night || 0) > .5) {
      const rr = E.rng(77), n = 70;
      for (let i = 0; i < n; i++) {
        const a = rr() * Math.PI * 2, el = rr() * .5, tw = (Math.sin(C.t * (1 + rr() * 3) + i) > .7);
        const dA = Math.atan2(Math.sin(a - heading), Math.cos(a - heading)); if (Math.abs(dA) > 1.3) { rr(); continue; }
        const x = cx + Math.tan(dA) * K, y = cy - Math.tan(el) * K - 4;
        if (y < h0 || y > hY - 4) continue;
        px.dot(g, x, y, tw ? '#ffffff' : '#9aa8d0');
      }
    }
    // sun or moon
    if (G.sun) {
      const dA = Math.atan2(Math.sin(G.sun.h - heading), Math.cos(G.sun.h - heading));
      if (Math.abs(dA) < 1.3) {
        const x = cx + Math.tan(dA) * K, y = cy - Math.tan(G.sun.el) * K, rad = G.sun.r || 9;
        px.blend(g, .5, 'add', () => { px.disc(g, x, y, rad * 2.2, G.sun.glow || '#ffd090'); });
        px.disc(g, x, y, rad, G.sun.c || '#fff4c8');
        if (G.sun.moon) px.disc(g, x + rad * .45, y - rad * .2, rad * .8, top);
        C.sunScreen = [x, y, dA];
      } else C.sunScreen = null;
    }
    // clouds
    if (G.clouds) {
      const rr = E.rng(31);
      for (let i = 0; i < 9; i++) {
        const a = rr() * Math.PI * 2 + C.t * .002, el = .05 + rr() * .2, w = 30 + rr() * 60;
        const dA = Math.atan2(Math.sin(a - heading), Math.cos(a - heading)); if (Math.abs(dA) > 1.2) continue;
        const x = cx + Math.tan(dA) * K, y = cy - Math.tan(el) * K;
        const cc = G.clouds;
        px.ell(g, x, y, w * .5, 4, cc[1]); px.ell(g, x - w * .2, y - 3, w * .25, 4, cc[0]); px.ell(g, x + w * .15, y - 2, w * .3, 4, cc[0]);
      }
    }
    // backdrop layers of the zone the camera is in
    const z = this.R.zones[this.R.zone[Math.floor(C.rail._last ? 0 : 0)]] || null;
    const zone = env.zone || (this.R.zones[this.R.zone[Math.min(this.R.n - 1, Math.floor((((cam.s % this.R.len) + this.R.len) % this.R.len) / SEG))]]);
    const layers = (zone && zone.backdrop) || [];
    for (let li = 0; li < layers.length; li++) {
      const L = layers[li], prof = Rail.profile(L.kind, L.seed || li), fogk = .55 - li * .12;
      const col = C.tint(L.color, 1e9 * 0 + (L.far || 1600) * (1.2 - li * .2));
      const lit = (G.night || 0) > .5 && L.kind === 'city';
      for (let x = 0; x < W; x += 2) {
        const a = ang(vp.x + x) * (L.par || 1), u = ((a / (Math.PI * 2)) % 1 + 1) % 1, hgt = prof[Math.floor(u * prof.length)] * (L.h || 20);
        const y = hY - hgt - (L.y || 0);
        px.rect(g, vp.x + x, Math.round(y), 2, hY - Math.round(y) + 2, col);
        if (lit && hgt > 4 && ((x * 7 + Math.floor(hgt)) % 11) === 0) px.dot(g, vp.x + x, Math.round(y + 2 + (x % 5)), '#ffd88a');
      }
    }
  }
  /** a periodic silhouette profile (0..1) for a backdrop kind */
  static profile(kind, seed) {
    const key = kind + ':' + seed; Rail._prof = Rail._prof || new Map();
    let p = Rail._prof.get(key); if (p) return p;
    const n = 2048, rr = E.rng(DH.fnv ? DH.fnv(key) : 9); p = new Float32Array(n);
    if (kind === 'city') {
      let i = 0; while (i < n) { const w = 3 + Math.floor(rr() * 10), h = .2 + rr() * .8 * (rr() < .15 ? 1.4 : 1); for (let j = 0; j < w && i < n; j++, i++) p[i] = Math.min(1, h); i += Math.floor(rr() * 2); }
    } else if (kind === 'sea') { for (let i = 0; i < n; i++) p[i] = .05 + Math.sin(i * .05) * .01; }
    else {
      const oct = kind === 'mountains' ? [[.6, 6], [.3, 17], [.1, 41]] : [[.5, 4], [.3, 11], [.15, 29]];
      const ph = oct.map(() => rr() * 6.28);
      for (let i = 0; i < n; i++) { let v = 0; oct.forEach(([a, f], j) => { v += a * (.5 + .5 * Math.sin(i / n * Math.PI * 2 * f + ph[j])); }); p[i] = kind === 'mountains' ? Math.pow(v, 1.6) : v * .8; }
    }
    Rail._prof.set(key, p); return p;
  }
  /** a route point (s along, x across, y over the rail) to [sx, sy, k] for the last camera drawn, or null */
  project(s, x, y = 0) {
    const L = this._last; if (!L) return null;
    const d = this._vd(s, { s: L.s, dir: L.dir }); if (!(d > .6) || d > L.D[L.n]) return null;
    const k = Math.max(0, Math.min(L.n - 1, Math.floor((d + L.off) / SEG))), u = (d - L.D[k]) / SEG;
    const b = L.B[k] + (L.B[k + 1] - L.B[k]) * u, h = L.Y[k] + (L.Y[k + 1] - L.Y[k]) * u, q = L.K / d, xx = L.dir > 0 ? x : -x;
    return [L.cx + (b + xx - L.camX) * q, L.cy - (h + y - L.camY) * q, q, d, k];
  }
  /** is a point in sight from the last camera (not behind a crest, not inside a tunnel the camera is outside of)? */
  visible(s, x, y = 0) {
    const p = this.project(s, x, y); if (!p) return false;
    const L = this._last, k = p[4];
    if (p[1] > L.CL[k] + 1) return false;
    const R = this.R, si = Math.floor(DH.wrap(s, R.len) / SEG) % R.n, ci = Math.floor(L.s / SEG) % R.n;
    if ((R.flags[si] & 1) && !(R.flags[ci] & 1)) { const lat = Math.abs(L.B[k] + (L.dir > 0 ? x : -x) - L.camX); if (lat > 3.5) return false; }
    return true;
  }
  /** what was drawn under a screen point (the pickable things and strip ends), nearest first */
  pick(sx, sy) {
    let best = null;
    for (const p of this._picks) if (sx >= p.x0 && sx <= p.x1 && sy >= p.y0 && sy <= p.y1 && (!best || p.d < best.d)) best = p;
    return best ? best.what : null;
  }
}
Rail.SEG = SEG;
DH.Rail = Rail;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
