// The voxel renderer: every block face is a pre-rendered sprite (a face atlas per view turn and zoom step), blitted per
// block and queued per column run, so the engine depth-sorts runs, actors and objects together. Patchwork textures with
// stitched seams, contact AO, sun shade, cracks, water, the void with its frayed fringe, and the cutaway.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const OPAQUE = DQ.OPAQUE, SOLID = DQ.SOLID, LIQUID = DQ.LIQUID, STAIR = DQ.STAIR;
const hex = c => E.hex(c);
const h01 = (a, b, c) => DQ.h01(a, b, c);

// ---------- views: pixel-exact projections (16 units -> whole pixels at every zoom step) ----------
const ISO_ZB = 20 / (Math.SQRT2 * Math.cos(30 * Math.PI / 180) * 16);   // block height 20 px at zoom 1
const TQ_P = Math.asin(.75) * 180 / Math.PI, TQ_ZB = 18 / (24 * Math.cos(Math.asin(.75)));
E.VIEWS.iso = new E.View('iso', 'Isometric', 45, 30, Math.SQRT2, ISO_ZB);
E.VIEWS.threequarter = new E.View('threequarter', 'Three-quarter', 0, TQ_P, 1.5, TQ_ZB);
DQ.ZOOMS = { iso: [.75, 1, 1.25, 1.5, 2], threequarter: [2 / 3, 1, 4 / 3, 5 / 3, 2] };

// ---------- textures: 16 x 16 texels per face, from named patterns ----------
// a pattern returns a palette index: 0 deep 1 sh 2 base 3 lt 4 hi (the block's tones), 5..9 the accent's tones, 10 thread
const P = {};
const disc = (u, v, cx, cy, r) => (u + .5 - cx) ** 2 + (v + .5 - cy) ** 2 <= r * r;
P.gingham = (u, v, s, side) => { const a = (u >> 2) & 1, b = (v >> 2) & 1; const k = a && b ? 4 : a || b ? 3 : 2; return h01(u, v, s) < .07 ? k - 1 : k; };
P.cord = (u, v, s, side) => side ? [1, 2, 3][u % 3] - (h01(u, v, s) < .08 ? 1 : 0) : (((u + v) % 4 === 0) || ((u - v + 16) % 4 === 0) ? 1 : h01(u, v, s) < .1 ? 3 : 2);
P.fringe = (u, v, s) => {
  const tuft = 3 + (h01(u, 0, s) < .45 ? 1 : 0) + (h01(u, 1, s) < .2 ? 1 : 0);
  if (v < tuft) return v === 0 ? 8 : (((u >> 2) + (v >> 2)) & 1) ? 7 : 6;
  if (v === tuft) return 0;
  return [1, 2, 3][u % 3] - (h01(u, v, s) < .08 ? 1 : 0);
};
P.calico = (u, v, s) => {
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const cx = i * 5.3 + 2.5 + (h01(i, j, s) - .5) * 2.4, cy = j * 5.3 + 2.5 + (h01(j, i, s + 7) - .5) * 2.4;
    const dx = Math.round(u + .5 - cx), dy = Math.round(v + .5 - cy);
    if (dx === 0 && dy === 0) return 5;
    if (Math.abs(dx) + Math.abs(dy) === 1 && h01(i, j, s + 3) < .8) return 3;
  }
  return h01(u, v, s) < .06 ? 1 : 2;
};
P.bumps = (u, v, s) => {
  const gx = Math.floor(u / 4), gy = Math.floor(v / 4), cx = gx * 4 + 2 + (h01(gx, gy, s) - .5) * 1.2, cy = gy * 4 + 2 + (h01(gy, gx, s + 1) - .5) * 1.2;
  const dx = u + .5 - cx, dy = v + .5 - cy, d = dx * dx + dy * dy;
  if (d > 2.6) return h01(u, v, s) < .3 ? 0 : 1;
  return dx + dy < -1 ? 4 : dx + dy < 0 ? 3 : dx + dy > 1.3 ? 1 : 2;
};
P.tweed = (u, v, s) => { const band = ((v >> 2) & 1) ? (u + v) : (u - v + 32); const k = ((band >> 1) & 1) ? 1 : 2; const h = h01(u, v, s); return h < .07 ? 3 : h > .96 ? 0 : k; };
P.sequins = (u, v, s) => {
  for (let i = 0; i < 4; i++) { const cx = 2.5 + h01(i, 1, s) * 11, cy = 2.5 + h01(i, 2, s) * 11; if (disc(u, v, cx, cy, 1.6)) return (u + .5 < cx && v + .5 < cy) ? 9 : 7; }
  return P.tweed(u, v, s);
};
P.lumps = (u, v, s) => {
  for (let i = 0; i < 3; i++) { const cx = 3 + h01(i, 4, s) * 10, cy = 3 + h01(i, 5, s) * 10; if (disc(u, v, cx, cy, 2.2)) return (u + .5 < cx - .6 && v + .5 < cy - .6) ? 6 : 5; }
  return P.tweed(u, v, s);
};
P.plaid = (u, v, s) => { const vs = u === 4 || u === 5 || u === 11, hs = v === 7 || v === 8; if (vs && hs) return 11; if (vs) return 12; if (hs) return 13; return [1, 2, 2, 3][(u + (h01(v, 0, s) < .5 ? 1 : 0)) % 4] - (h01(u, v, s) < .08 ? 1 : 0); };
P.rings = (u, v, s) => { const d = Math.hypot(u + .5 - 8, v + .5 - 8); if (d < 1.2) return 0; return Math.floor(d / 2.3) % 2 ? 1 : 2; };
P.bobbles = (u, v, s) => {
  const row = Math.floor(v / 4), off = (row & 1) * 2, col = Math.floor((u + off) / 4), cx = col * 4 + 2 - off, cy = row * 4 + 2;
  const dx = u + .5 - cx, dy = v + .5 - cy, d = dx * dx + dy * dy;
  if (d > 4.2) return h01(u, v, s) < .5 ? 0 : 1;
  return dx + dy < -1.2 ? 4 : dx + dy < .2 ? 3 : dx + dy > 1.5 ? 1 : 2;
};
P.torn = (u, v, s) => {
  if ((u + v * 2 + Math.floor(h01(v, 3, s) * 3)) % 5 === 0 && h01(u, v, s) < .55) return 0;
  for (let i = 0; i < 3; i++) { const a = h01(i, 9, s) * 16, k = h01(i, 8, s) < .5 ? 1 : -1; if (Math.abs((u - a) * k - (v - 8) * .6) < .6) return 4; }
  return ((u + v) & 1) ? 1 : 2;
};
P.loops = (u, v, s) => {
  for (let i = 0; i < 5; i++) {
    const cx = h01(i, 1, s) * 16, cy = h01(i, 2, s) * 16, rx = 3 + h01(i, 3, s) * 3, ry = 2 + h01(i, 4, s) * 2;
    const d = ((u + .5 - cx) / rx) ** 2 + ((v + .5 - cy) / ry) ** 2;
    if (Math.abs(d - 1) < .28) return (v + .5 < cy) ? 3 : 2;
  }
  return h01(u, v, s) < .25 ? 1 : 0;
};
P.satin = (u, v, s) => { const f = s & 3, b = (u + v * 2 + f * 4) % 16; return b < 2 ? 4 : b < 4 ? 3 : b > 12 ? 1 : 2; };
P.grid = (u, v, s) => ((u % 8 === 3 || v % 8 === 3) && ((u + v) % 2 === 0)) ? 10 : (h01(u, v, s) < .08 ? 1 : 2);
P.quiltstone = (u, v, s) => {
  let best = 1e9, second = 1e9, bi = 0;
  for (let i = 0; i < 6; i++) { const cx = h01(i, 1, s) * 16, cy = h01(i, 2, s) * 16; for (const [ox, oy] of [[0, 0], [16, 0], [-16, 0], [0, 16], [0, -16]]) { const d = Math.hypot(u + .5 - cx - ox, v + .5 - cy - oy); if (d < best) { second = best; best = d; bi = i; } else if (d < second) second = d; } }
  if (second - best < 1.1) return 1;
  if (second - best < 2 && h01(u, v, s) < .5) return 3;
  return h01(bi, 7, s) < .3 ? 3 : 2;
};
P.boards = (u, v, s) => { const b = Math.floor(v / 4); if (v % 4 === 3) return 1; const cut = Math.floor(h01(b, 1, s) * 16); if (u === cut) return 0; return (u + b * 3) % 7 === 0 ? 3 : h01(u, v, s) < .08 ? 1 : 2; };
P.straw = (u, v, s) => { const c = Math.floor(v / 3), edge = v % 3 === 2 && h01(u, c, s) < .6; if (edge) return 1; return [3, 2, 2][(u + c) % 3] + (h01(u, v, s) < .08 ? 1 : 0); };
P.felt = (u, v, s) => { const d = Math.abs(u + .5 - 8) + Math.abs(v + .5 - 8); if (Math.abs(d - 6) < .6 && ((u + v) & 1) === 0) return 10; const h = h01(u, v, s); return h < .04 ? 1 : h > .97 ? 3 : 2; };
P.star = (u, v, s) => {
  const x = u + .5 - 8, y = v + .5 - 8, a = Math.atan2(y, x) + Math.PI / 2, d = Math.hypot(x, y), r = 3 + 3 * Math.pow(Math.abs(Math.cos(a * 2.5)), 3);
  if (Math.abs(d - r) < .7) return 10; if (d < r) return 4; return h01(u, v, s) < .06 ? 3 : 2;
};
P.gild = (u, v, s) => { const h = h01(u, v, s); return h > .95 ? 4 : h > .85 ? 3 : h < .06 ? 1 : 2; };

/** the 16 x 16 texels of a block face as [r, g, b] rows: face 'top' or 'side' */
const _tex = new Map();
function texels(id, face, variant) {
  const key = id + face + variant; let t = _tex.get(key); if (t) return t;
  const b = DQ.BLOCKS[id], spec = face === 'top' ? b.top : b.side, pat = P[spec[0]] || P.felt, s = DQ.hash(id, variant * 31 + (face === 'top' ? 0 : 7));
  const to = E.tones(spec[1]), ta = E.tones(spec[2] || spec[1]);
  const pal = [to.deep, to.sh, to.base, to.lt, to.hi, ta.base, ta.lt, ta.sh, ta.hi, ta.deep, b.thread, '#5a2a2a', '#b0403a', '#3a6a3a'].map(hex);
  if (spec[0] === 'fringe') { pal[5] = hex(ta.deep); pal[6] = hex(ta.base); pal[7] = hex(ta.lt); pal[8] = hex(ta.sh); }
  t = new Uint8ClampedArray(16 * 16 * 3);
  for (let v = 0; v < 16; v++) for (let u = 0; u < 16; u++) {
    let k = pat(u, v, s + variant, face !== 'top');
    if (b.seam && spec[0] !== 'fringe') {
      if (u === 0 || v === 0 || u === 15 || v === 15) k = 0;
      else if ((u === 2 || u === 13) && v >= 3 && v <= 12 && (v % 4) < 2) k = 10;
      else if ((v === 2 || v === 13) && u >= 3 && u <= 12 && (u % 4) < 2) k = 10;
    } else if (b.seam && spec[0] === 'fringe') {
      if (u === 0 || u === 15 || v === 15) k = Math.min(k, 0);
    }
    const c = pal[k] || pal[2], o = (v * 16 + u) * 3; t[o] = c[0]; t[o + 1] = c[1]; t[o + 2] = c[2];
  }
  _tex.set(key, t); return t;
}
DQ.texels = texels; DQ.PATTERNS = P;

// ---------- the face atlas ----------
const SIDES = [{ dir: 'px', dx: 1, dy: 0, c0: [16, 0, 16], e1: [0, 16, 0] }, { dir: 'nx', dx: -1, dy: 0, c0: [0, 16, 16], e1: [0, -16, 0] },
  { dir: 'py', dx: 0, dy: 1, c0: [16, 16, 16], e1: [-16, 0, 0] }, { dir: 'ny', dx: 0, dy: -1, c0: [0, 0, 16], e1: [16, 0, 0] }];
function viewKey(v) { return v.id + ':' + v.yawDeg + ':' + v.pitchDeg + ':' + v.scale.toFixed(4) + ':' + v.zBoost.toFixed(4); }
const proj = (v, x, y, z) => [v.ax * x + v.ay * y, v.bx * x + v.by * y + v.bz * z];
const rp = p => [Math.round(p[0]), Math.round(p[1])];

class Atlas {
  constructor(view) {
    this.view = view; this.key = viewKey(view);
    const v = view, top = [[0, 0, 16], [16, 0, 16], [16, 16, 16], [0, 16, 16]].map(c => rp(proj(v, ...c)));
    this.topQ = { c0: rp(proj(v, 0, 0, 16)), e1: rp(proj(v, 16, 0, 0)), e2: rp(proj(v, 0, 16, 0)), poly: top };
    this.zh = Math.round(-v.bz * 16);   // block height in pixels
    this.colStep = [rp(proj(v, 16, 0, 0)), rp(proj(v, 0, 16, 0))];
    // visible side faces (their normal toward the camera's ground direction), left or right on screen
    this.vis = [];
    for (const S of SIDES) {
      const dot = S.dx * v.fx + S.dy * v.fy; if (dot < .05) continue;
      const c0 = rp(proj(v, ...S.c0)), e1 = rp(proj(v, ...S.e1)), e2 = [0, this.zh];
      const cxs = c0[0] + e1[0] / 2; this.vis.push({ dir: S.dir, dx: S.dx, dy: S.dy, c0, e1, e2, cx: cxs });
    }
    const n = this.vis.length; for (const s of this.vis) s.bright = n === 1 ? .76 : (s.cx < 0 ? .8 : .62);
    const corners = []; for (const dz of [0, 16]) for (const dy of [0, 16]) for (const dx of [0, 16]) corners.push(rp(proj(v, dx, dy, dz)));
    this.box = [Math.min(...corners.map(c => c[0])), Math.min(...corners.map(c => c[1])), Math.max(...corners.map(c => c[0])), Math.max(...corners.map(c => c[1]))];
    this.dstep = Math.abs(v.bx * 16 * Math.round(v.fx) + v.by * 16 * Math.round(v.fy)) || 16;
    this.sprites = []; this.faces = []; this.over = {};
    this._pack = { x: 0, y: 0, rowH: 0, W: 1024 }; this._pixels = [];
  }
  // one sprite from a quad (c0, e1, e2) and a texel function (u, v) -> [r, g, b, a] or null
  _sprite(c0, e1, e2, fn) {
    const pts = [c0, [c0[0] + e1[0], c0[1] + e1[1]], [c0[0] + e1[0] + e2[0], c0[1] + e1[1] + e2[1]], [c0[0] + e2[0], c0[1] + e2[1]]];
    const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), det = e1[0] * e2[1] - e1[1] * e2[0];
    const data = new Uint8ClampedArray(w * h * 4);
    if (Math.abs(det) > 1e-6) for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const qx = x0 + xx + .5 - c0[0], qy = y0 + yy + .5 - c0[1];
      const u = (qx * e2[1] - qy * e2[0]) / det, vv = (e1[0] * qy - e1[1] * qx) / det;
      if (u < 0 || u >= 1 || vv < 0 || vv >= 1) continue;
      const c = fn(Math.min(15, Math.floor(u * 16)), Math.min(15, Math.floor(vv * 16)), u, vv); if (!c) continue;
      const o = (yy * w + xx) * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = c[3] === undefined ? 255 : c[3];
    }
    const pk = this._pack; if (pk.x + w + 1 > pk.W) { pk.x = 0; pk.y += pk.rowH + 1; pk.rowH = 0; }
    const s = { x: pk.x, y: pk.y, w, h, ox: x0, oy: y0 }; pk.x += w + 1; pk.rowH = Math.max(pk.rowH, h);
    this._pixels.push([s, data]); return s;
  }
  build() {
    const shadeC = (t, o, k, cool) => [t[o] * k, t[o + 1] * k, Math.min(255, t[o + 2] * k + (1 - k) * (cool || 46))];
    for (const b of DQ.BLOCKS) {
      if (!b || !b.top) continue;
      const vars = b.liquid ? 4 : 4; this.faces[b.id] = [];
      for (let vr = 0; vr < vars; vr++) {
        const tt = texels(b.id, 'top', vr), ts = texels(b.id, 'side', vr), F = { top: null, s: {} };
        F.top = this._sprite(this.topQ.c0, this.topQ.e1, this.topQ.e2, (u, v) => { const o = (v * 16 + u) * 3; return [tt[o], tt[o + 1], tt[o + 2]]; });
        for (const S of this.vis) F.s[S.dir] = this._sprite(S.c0, S.e1, S.e2, (u, v) => shadeC(ts, (v * 16 + u) * 3, S.bright));
        this.faces[b.id][vr] = F;
      }
    }
    // overlays (multiply or normal): contact AO, edge AO, sun shade, water tint, cracks, the cut hatch
    const O = this.over, TQ = this.topQ, mul = c => () => c;
    O.aoSide = {}; O.shadeSide = {}; O.waterSide = {}; O.crackSide = [{}, {}, {}];
    for (const S of this.vis) {
      O.aoSide[S.dir] = this._sprite(S.c0, S.e1, S.e2, (u, v) => v >= 13 ? (v === 15 ? [110, 100, 140] : [160, 150, 185]) : null);
      O.shadeSide[S.dir] = this._sprite(S.c0, S.e1, S.e2, mul([190, 182, 215]));
      O.waterSide[S.dir] = this._sprite(S.c0, S.e1, S.e2, mul([120, 160, 230]));
      for (let k = 0; k < 3; k++) O.crackSide[k][S.dir] = this._sprite(S.c0, S.e1, S.e2, (u, v) => crack(u, v, k, 3) ? [40, 30, 50, 255] : null);
    }
    O.aoTop = [0, 1, 2, 3].map(e => this._sprite(TQ.c0, TQ.e1, TQ.e2, (u, v) => { const d = e === 0 ? u : e === 1 ? 15 - u : e === 2 ? v : 15 - v; return d < 3 ? (d === 0 ? [120, 112, 150] : [168, 160, 195]) : null; }));
    O.shadeTop = this._sprite(TQ.c0, TQ.e1, TQ.e2, mul([198, 190, 222]));
    O.waterTop = this._sprite(TQ.c0, TQ.e1, TQ.e2, mul([120, 160, 230]));
    O.cutTop = this._sprite(TQ.c0, TQ.e1, TQ.e2, (u, v) => ((u + v) % 4 === 0) ? [70, 60, 90] : [150, 140, 175]);
    O.crackTop = [0, 1, 2].map(k => this._sprite(TQ.c0, TQ.e1, TQ.e2, (u, v) => crack(u, v, k, 1) ? [40, 30, 50, 255] : null));
    O.ghostTop = this._sprite(TQ.c0, TQ.e1, TQ.e2, (u, v) => (u === 0 || v === 0 || u === 15 || v === 15) && ((u + v) & 1) ? [241, 230, 200, 255] : null);
    O.ghostSide = {}; for (const S of this.vis) O.ghostSide[S.dir] = this._sprite(S.c0, S.e1, S.e2, (u, v) => (u === 0 || v === 0 || u === 15 || v === 15) && ((u + v) & 1) ? [241, 230, 200, 255] : null);
    // the canvas
    const H = this._pack.y + this._pack.rowH + 1;
    this.H = H; this.W = this._pack.W;
    if (typeof document !== 'undefined' || DQ.TEST.canvas) {
      const cv = this.cv = E.mkCanvas(this.W, H), g = E.ctx2d(cv), img = g.createImageData(this.W, H);
      for (const [s, d] of this._pixels) for (let yy = 0; yy < s.h; yy++) img.data.set(d.subarray(yy * s.w * 4, (yy + 1) * s.w * 4), ((s.y + yy) * this.W + s.x) * 4);
      g.putImageData(img, 0, 0);
    }
    this._pixels = null; return this;
  }
}
function crack(u, v, k, seed) {
  const lines = k + 1;
  for (let i = 0; i < lines; i++) {
    const a = h01(i, seed, 11) * 16, b = h01(i, seed, 13) * 16, c = h01(i, seed, 17) * 16, d = h01(i, seed, 19) * 16;
    const t = ((u + .5 - a) * (c - a) + (v + .5 - b) * (d - b)) / (((c - a) ** 2 + (d - b) ** 2) || 1);
    if (t < 0 || t > 1) continue;
    const qx = a + (c - a) * t, qy = b + (d - b) * t;
    if (Math.hypot(u + .5 - qx, v + .5 - qy) < .7) return true;
  }
  return false;
}
DQ.Atlas = Atlas;
const _atlases = new Map();
DQ.atlasFor = view => { const k = viewKey(view); let a = _atlases.get(k); if (!a) { a = new Atlas(view).build(); _atlases.set(k, a); } return a; };

// ---------- the renderer ----------
class VoxelRenderer {
  constructor(world) {
    this.world = world; this.cache = new Array(world.W * world.D); this.cut = null; this.time = 0; this.runsDrawn = 0;
    world.renderRuns = (cx, cy) => this.col(cx, cy).lift;
    this.ghosts = null;        // Pattern ghosts: Map idx -> block id or {obj}
    this.highlight = null;     // { x, y, z } break target faces
  }
  /** a column's runs (cached by its version): draw runs of opaque blocks, lift runs of solid ones, stairs, water */
  col(cx, cy) {
    const w = this.world, ci = cy * w.W + cx, ver = w.colVer[ci]; let c = this.cache[ci];
    if (c && c.ver === ver) return c;
    c = { ver, runs: [], lift: [], stairs: [], water: [], light: [] };
    const H = w.H, base = ci * H, V = w.vox; let r0 = -1, l0 = -1, w0 = -1;
    for (let z = 0; z <= H; z++) {
      const id = z < H ? V[base + z] : 0, op = OPAQUE[id], so = SOLID[id], lq = LIQUID[id];
      if (op && r0 < 0) r0 = z; if (!op && r0 >= 0) { c.runs.push([r0, z]); r0 = -1; }
      if (so && l0 < 0) l0 = z; if (!so && l0 >= 0) { c.lift.push([l0, z]); l0 = -1; }
      if (lq && w0 < 0) w0 = z; if (!lq && w0 >= 0) { c.water.push([w0, z]); w0 = -1; }
      if (STAIR[id]) c.stairs.push(z);
      if (z < H && id && DQ.BLOCKS[id].light) c.light.push(z);
    }
    this.cache[ci] = c; return c;
  }
  /** is a cell cut away by the cutaway? */
  isCut(x, y, z) {
    const c = this.cut; if (!c || z < c.L || (c.rad <= .01 && !(c.slotW > .01))) return false;
    const dx = x + .5 - c.x, dy = y + .5 - c.y; if (dx * dx + dy * dy <= c.rad * c.rad) return true;
    // the slot: a see-through channel from the hero toward the camera, above the hero's level
    if (c.slotW > .01) { const along = dx * c.fx + dy * c.fy; if (along > -.5 && along < c.slotLen) { const perp = Math.abs(dx * c.fy - dy * c.fx); if (perp < c.slotW) return true; } }
    return false;
  }
  /** the columns the screen shows: [x0, y0, x1, y1] in cells */
  visibleCols(r) {
    const v = r.view, w = this.world; if (!v.inv) return [0, 0, w.W - 1, w.D - 1];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [sx, sy] of [[0, 0], [r.W, 0], [0, r.H], [r.W, r.H]]) for (const z of [0, w.H * T]) {
      const qx = sx + r.ix, qy = sy + r.iy - v.bz * z, gx = v.inv[0] * qx + v.inv[1] * qy, gy = v.inv[2] * qx + v.inv[3] * qy;
      x0 = Math.min(x0, gx); x1 = Math.max(x1, gx); y0 = Math.min(y0, gy); y1 = Math.max(y1, gy);
    }
    return [Math.max(0, Math.floor(x0 / T) - 2), Math.max(0, Math.floor(y0 / T) - 2), Math.min(w.W - 1, Math.floor(x1 / T) + 2), Math.min(w.D - 1, Math.floor(y1 / T) + 2)];
  }
  /** queue every visible column run, stair, water surface and fringe */
  queue(r, o = {}) {
    const w = this.world, v = r.view, A = DQ.atlasFor(v); if (!A.cv) return;
    this.A = A; r._map = w; this.time = r.game.real;
    const [x0, y0, x1, y1] = this.visibleCols(r), W = r.W, Hh = r.H, zh = A.zh, frame = Math.floor(r.game.real * 4) & 3;
    let n = 0;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const p = rp(proj(v, cx * T, cy * T, 0)), sx = p[0] - r.ix, sy = p[1] - r.iy;
      const c = this.col(cx, cy), topZ = w.top[cy * w.W + cx];
      if (sx < -48 || sx > W + 48 || sy - (topZ + 1) * zh > Hh + 24 || sy + 48 < 0) continue;
      for (const R of c.runs) {
        let z0 = R[0], z1 = R[1];
        if (this.cut && this.isCut(cx, cy, z1 - 1)) { z1 = Math.max(z0, this.cut.L); if (z1 <= z0) continue; }
        const ox = cx * T + T / 2, oy = cy * T + T / 2;
        const bx = A.box; r.queue(ox, oy, z0 * T, g => this.drawRun(g, cx, cy, z0, z1, R[1], sx, sy), { occluder: true, top: z1 * T, box: [sx + bx[0], sy - (z1 - 1) * zh + bx[1], sx + bx[2], sy - z0 * zh + bx[3]] });
        n++;
      }
      for (const z of c.stairs) if (!this.isCut(cx, cy, z)) r.queue(cx * T + T / 2, cy * T + T / 2, z * T, g => this.drawStair(g, r, cx, cy, z), { occluder: true, top: z * T + 16 });
      for (const R of c.water) {
        const z = R[1] - 1; if (this.isCut(cx, cy, z)) continue;
        r.queue(cx * T + T / 2, cy * T + T / 2, z * T + 1, g => this.drawWater(g, cx, cy, R[0], R[1], sx, sy, frame), {});
      }
      if (o.fringe !== false && c.runs.length && this._edge(cx, cy)) r.queue(cx * T + T / 2, cy * T + T / 2, -2, g => this.drawFringe(g, cx, cy, c.runs[0][0], sx, sy), { bias: -.01 });
    }
    this.runsDrawn = n;
    if (this.ghosts && this.ghosts.size) this.queueGhosts(r);
  }
  _edge(cx, cy) { const w = this.world; return cx === 0 || cy === 0 || cx === w.W - 1 || cy === w.D - 1 || !w.top[cy * w.W + cx - 1] || !w.top[cy * w.W + cx + 1] || !w.top[(cy - 1) * w.W + cx] || !w.top[(cy + 1) * w.W + cx]; }
  _blit(g, s, x, y) { g.drawImage(this.A.cv, s.x, s.y, s.w, s.h, x + s.ox, y + s.oy, s.w, s.h); }
  _mul(g, s, x, y) { const op = g.globalCompositeOperation; g.globalCompositeOperation = 'multiply'; this._blit(g, s, x, y); g.globalCompositeOperation = op; }
  drawRun(g, cx, cy, z0, z1, zr1, sx, sy) {
    const w = this.world, A = this.A, V = w.vox, H = w.H, W = w.W, base = (cy * W + cx) * H, zh = A.zh, O = A.over;
    const vis = A.vis, cut = this.cut;
    for (let z = z0; z < z1; z++) {
      const id = V[base + z], F = A.faces[id]; if (!F) continue;
      const f = F[DQ.hash(cx, cy, z) & 3], y = sy - z * zh, wet = z + 1 < H && LIQUID[V[base + z + 1]];
      for (const S of vis) {
        const nx = cx + S.dx, ny = cy + S.dy, inside = nx >= 0 && ny >= 0 && nx < W && ny < w.D;
        const nb = inside ? V[(ny * W + nx) * H + z] : 0;
        if (OPAQUE[nb] && !(cut && this.isCut(nx, ny, z))) continue;
        this._blit(g, f.s[S.dir], sx, y);
        if (inside && z > 0 && SOLID[V[(ny * W + nx) * H + z - 1]] && !OPAQUE[nb]) this._mul(g, O.aoSide[S.dir], sx, y);
        if (LIQUID[nb]) this._mul(g, O.waterSide[S.dir], sx, y);
      }
      const isTop = z === z1 - 1;
      if (isTop) {
        const above = z + 1 < H ? V[base + z + 1] : 0, wasCovered = zr1 > z1;
        if (!OPAQUE[above] || wasCovered) {
          this._blit(g, f.top, sx, y);
          if (wasCovered) this._mul(g, O.cutTop, sx, y);
          else {
            // edge AO where a neighbour is a block higher; sun shade under taller columns toward the light
            const e = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
            for (let k = 0; k < 4; k++) { const [ax, ay] = e[k]; if (ax >= 0 && ay >= 0 && ax < W && ay < w.D && z + 1 < H && OPAQUE[V[(ay * W + ax) * H + z + 1]]) this._mul(g, O.aoTop[k], sx, y); }
            const lx = cx - 1, ly = cy - 1;
            if (lx >= 0 && ly >= 0 && (w.top[ly * W + lx] > z + 2 || (cx - 2 >= 0 && cy - 2 >= 0 && w.top[(cy - 2) * W + cx - 2] > z + 3))) this._mul(g, O.shadeTop, sx, y);
            if (wet) this._mul(g, O.waterTop, sx, y);
          }
        }
      }
      const dm = w.dmg.size ? w.crack(base + z) : 0;
      if (dm > .3) { const k = dm > .9 ? 2 : dm > .6 ? 1 : 0; for (const S of vis) this._blit(g, O.crackSide[k][S.dir], sx, y); if (isTop) this._blit(g, O.crackTop[k], sx, y); }
    }
  }
  drawStair(g, r, cx, cy, z) {
    const w = this.world, id = w.get(cx, cy, z), b = DQ.BLOCKS[id], rot = w.rot(cx, cy, z), x0 = cx * T, y0 = cy * T, z0 = z * T;
    const tt = E.tones(b.top[1]), ts = E.tones(b.side[1]);
    // lower step: the whole cell, half high; upper step: the half the stairs rise toward
    const half = [[x0 + 8, y0, x0 + 16, y0 + 16], [x0, y0 + 8, x0 + 16, y0 + 16], [x0, y0, x0 + 8, y0 + 16], [x0, y0, x0 + 16, y0 + 8]][rot];
    const boxes = [[x0, y0, z0, x0 + 16, y0 + 16, z0 + 8], [half[0], half[1], z0 + 8, half[2], half[3], z0 + 16]];
    for (const bx of boxes) r.box(g, bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], tt.base, ts.sh);
    const p = r.w(x0 + 8, y0 + 8, z0 + 8); px.dot(g, Math.round(p[0]), Math.round(p[1]), b.thread);
  }
  drawWater(g, cx, cy, z0, z1, sx, sy, frame) {
    const w = this.world, A = this.A, F = A.faces[DQ.WATER]; if (!F) return;
    const f = F[frame], zt = z1 - 1, y = sy - zt * A.zh;
    px.blend(g, .78, 'normal', () => {
      for (const S of A.vis) { const nx = cx + S.dx, ny = cy + S.dy; if (w.inside(nx, ny, zt) && (SOLID[w.get(nx, ny, zt)] || LIQUID[w.get(nx, ny, zt)])) continue; this._blit(g, f.s[S.dir], sx, y); }
      if (!SOLID[w.get(cx, cy, z1)]) this._blit(g, f.top, sx, y);
    });
  }
  drawFringe(g, cx, cy, zb, sx, sy) {
    const A = this.A, t = this.time, y = sy - zb * A.zh, base = DQ.hash(cx, cy, 77);
    for (let i = 0; i < 5; i++) {
      const h = DQ.h01(cx, cy, i), x = sx + A.topQ.poly[3][0] + Math.round(h * (A.topQ.poly[1][0] - A.topQ.poly[3][0])), len = 8 + Math.round(DQ.h01(cy, cx, i) * 22), sway = Math.sin(t * 1.3 + i + cx) * 2;
      const c = ['#b8a8d8', '#8a7ab0', '#d8c8e8', '#6a5a90'][(base + i) & 3];
      px.line(g, x, y + 4, Math.round(x + sway), y + 4 + len, c);
    }
  }
  /** Pattern ghosts: translucent target blocks with a dashed outline (red cross where the wrong block sits) */
  queueGhosts(r) {
    const A = this.A, w = this.world;
    for (const [i, gh] of this.ghosts) {
      const [x, y, z] = w.unidx(i), cur = w.vox[i]; if (gh.done) continue;
      const p = rp(proj(r.view, x * T, y * T, 0)), sx = p[0] - r.ix, sy = p[1] - r.iy - z * A.zh;
      if (sx < -40 || sx > r.W + 40 || sy < -40 || sy > r.H + 60) continue;
      r.queue(x * T + 8, y * T + 8, z * T + 2, g => {
        if (gh.block) { const f = A.faces[gh.block] && A.faces[gh.block][0]; if (f) px.blend(g, .4, 'normal', () => { for (const S of A.vis) this._blit(g, f.s[S.dir], sx, sy); this._blit(g, f.top, sx, sy); }); }
        for (const S of A.vis) this._blit(g, A.over.ghostSide[S.dir], sx, sy); this._blit(g, A.over.ghostTop, sx, sy);
        if (cur && gh.block && cur !== gh.block) { const c = [sx, sy - A.zh / 2 + 2]; px.line(g, c[0] - 3, c[1] - 3, c[0] + 3, c[1] + 3, '#ff5050', 2); px.line(g, c[0] + 3, c[1] - 3, c[0] - 3, c[1] + 3, '#ff5050', 2); }
      }, { bias: .001 });
    }
  }
  /** the 12 edges of a cell's cube in buffer pixels (the cursor) */
  cubeEdges(r, x, y, z) {
    const c = [];
    for (const dz of [0, 16]) for (const dy of [0, 16]) for (const dx of [0, 16]) { const p = r.w(x * T + dx, y * T + dy, z * T + dz); c.push([Math.round(p[0]), Math.round(p[1])]); }
    const E2 = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    return E2.map(([a, b]) => [c[a], c[b]]);
  }
}
DQ.VoxelRenderer = VoxelRenderer;

/** a small iso cube icon of a block (a canvas, 18 x 20), for the bag and hotbar */
const ICON_VIEW = new E.View('iso', 'Icon', 45, 30, Math.SQRT2 * .5, ISO_ZB);
DQ.blockIcon = id => {
  const k = 'icon:' + id; if (_atlases.has(k)) return _atlases.get(k);
  const A = DQ.atlasFor(ICON_VIEW); if (!A.cv) return null;
  const f = A.faces[id] && A.faces[id][0]; if (!f) return null;
  const cv = E.mkCanvas(18, 20), g = E.ctx2d(cv), ox = 9, oy = 11;
  const bl = s => g.drawImage(A.cv, s.x, s.y, s.w, s.h, ox + s.ox, oy + s.oy, s.w, s.h);
  for (const S of A.vis) bl(f.s[S.dir]); bl(f.top);
  _atlases.set(k, cv); return cv;
};
})();
