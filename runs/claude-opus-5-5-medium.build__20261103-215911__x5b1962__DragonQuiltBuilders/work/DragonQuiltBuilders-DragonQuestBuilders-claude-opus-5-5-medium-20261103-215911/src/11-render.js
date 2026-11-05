// The voxel renderer: a face-sprite atlas per view and zoom, column runs queued as occluders, cutaway, water, stairs,
// the Unravel (the void) and its frayed fringe. Every block is a fabric patch with stitched seams.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;
const B = DQ.BLOCKS;

// ---- views with whole-pixel block steps (so blocks tile with no seams at every zoom step) ----
DQ.VIEW_ISO = new E.View('iso', 'Isometric', 45, 30, Math.SQRT2, 20 / (16 * Math.SQRT2 * Math.cos(30 * Math.PI / 180)));
DQ.VIEW_TQ = new E.View('threequarter', 'Three-quarter', 0, Math.asin(.75) * 180 / Math.PI, 1, .75 / Math.cos(Math.asin(.75)));
DQ.ZOOMS = [.75, 1, 1.25, 1.5, 2];

// ---- textures: 16x16 texels per face, each a tone of the material (E.tones) or an accent ----
const THREAD = '#f1e6c8', THREAD_DK = '#c8b890';
const toneList = col => { const t = E.tones(col); return [t.deep, t.sh, t.base, t.lt, t.hi].map(E.hex); };
const h3 = DQ.hash3;
function seamTone(u, v) {
  if (u === 0 || v === 0 || u === 15 || v === 15) return 0;
  return -1;
}
function stitch(u, v) {   // a running stitch on ring 2
  const ring = (u === 2 || u === 13) && v >= 3 && v <= 12 ? v : (v === 2 || v === 13) && u >= 3 && u <= 12 ? u : -1;
  return ring >= 0 && (ring % 4) < 2;
}
// pattern(u, v, seed, side) -> tone index 0..4, or [r,g,b] for accents, or -1 for transparent
const PAT = {
  grid: (u, v) => (u % 8 === 0 || v % 8 === 0) && ((u + v) % 2 === 0) ? 'T' : (h3(u, v, 3) < .1 ? 1 : 2),
  gingham: (u, v, s) => { const a = (u >> 2) & 1, b = (v >> 2) & 1; return a && b ? 4 : a || b ? 3 : (h3(u, v, s) < .12 ? 1 : 2); },
  fringe: (u, v, s) => v < 3 || (v < 5 && h3(u, 7, s) < .5) ? ['top', v === 0 ? 3 : 2] : (u % 3 === 0 ? 1 : u % 3 === 1 ? 2 : 3),
  cord: (u, v) => u % 3 === 0 ? 1 : u % 3 === 1 ? 2 : 3,
  cordTop: (u, v) => ((u + v) % 4 === 0 || (u - v + 16) % 4 === 0) ? 1 : 2,
  calico: (u, v, s) => { const cx = ((u + 2) / 5 | 0), cy = ((v + 1) / 5 | 0), jx = cx * 5 + 1 + (h3(cx, cy, s) * 2 | 0), jy = cy * 5 + (h3(cy, cx, s + 1) * 2 | 0); if (u === jx && v === jy) return [224, 122, 58]; if (Math.abs(u - jx) + Math.abs(v - jy) === 1) return 3; return h3(u, v, s) < .08 ? 1 : 2; },
  bumps: (u, v, s) => { const gx = (u / 4 | 0), gy = (v / 4 | 0), cx = gx * 4 + 2 + (h3(gx, gy, s) - .5), cy = gy * 4 + 2 + (h3(gy, gx, s) - .5), d = Math.hypot(u - cx, v - cy); return d < 1.6 ? (u < cx && v < cy ? 4 : 3) : d < 2.1 ? 1 : 2; },
  tweed: (u, v, s) => { const band = (v >> 2) & 1, d = band ? (u + v) : (u - v + 32); return h3(u, v, s) < .08 ? 4 : (d % 4 < 2 ? 1 : 2) + (d % 4 === 3 ? 1 : 0); },
  sequins: (u, v, s) => { for (let k = 0; k < 4; k++) { const cx = 3 + h3(k, s, 1) * 10, cy = 3 + h3(s, k, 2) * 10, d = Math.hypot(u - cx, v - cy); if (d < 1.6) return d < .7 ? [255, 236, 200] : [208, 122, 58]; } return PAT.tweed(u, v, s); },
  lumps: (u, v, s) => { for (let k = 0; k < 3; k++) { const cx = 3 + h3(k, s, 4) * 10, cy = 3 + h3(s, k, 5) * 10; if (Math.hypot(u - cx, (v - cy) * 1.3) < 2) return [42, 38, 48]; } return PAT.tweed(u, v, s); },
  plaid: (u, v, s) => { const vs = u === 4 || u === 5 || u === 11, hs = v === 7 || v === 8; if (vs && hs) return [110, 40, 36]; if (vs) return [176, 64, 58]; if (hs) return [58, 106, 58]; return (u + (v >> 1)) % 5 === 0 ? 1 : 2; },
  rings: (u, v) => { const d = Math.hypot(u - 7.5, v - 7.5); return d < 1 ? 0 : (Math.floor(d / 2.5) % 2 ? 1 : 2) + (d > 6.5 ? 1 : 0); },
  bobbles: (u, v, s) => { const ox = ((v / 5 | 0) % 2) * 2, gx = ((u + ox) / 5 | 0), gy = (v / 5 | 0), cx = gx * 5 + 2 - ox, cy = gy * 5 + 2, dx = u - cx, dy = v - cy, d = Math.hypot(dx, dy); return d < 2.3 ? (dx + dy < -1 ? 4 : dx + dy > 1.5 ? 1 : 2) + (h3(gx, gy, s) < .3 ? 1 : 0) : 0; },
  torn: (u, v, s) => { if (h3(u, v, s) < .12) return 0; if ((u * 3 + v * 7 + s) % 13 === 0) return 4; return (u + v) % 3 === 0 ? 1 : 2; },
  loops: (u, v, s) => { let m = 9; for (let k = 0; k < 4; k++) { const cx = h3(k, s, 9) * 16, cy = h3(s, k, 8) * 16, d = Math.abs(Math.hypot((u - cx) * 1.2, v - cy) - 4); m = Math.min(m, d); } return m < .7 ? 3 : m < 1.4 ? 2 : 1; },
  satin: (u, v, s) => ((u + v + s * 3) % 8 < 2 ? 3 : 2),
  quiltstone: (u, v, s) => { let a = 99, b = 99, ai = 0; for (let k = 0; k < 5; k++) { const cx = h3(k, s, 11) * 16, cy = h3(s, k, 12) * 16, d = Math.hypot(u - cx, v - cy); if (d < a) { b = a; a = d; ai = k; } else if (d < b) b = d; } return b - a < 1.1 ? 0 : (b - a < 2 ? 1 : (h3(ai, 1, s) < .5 ? 2 : 3)); },
  boards: (u, v, s) => { const row = v >> 2, off = (h3(row, 0, s) * 16) | 0, joint = (u + off) % 16 === 0; if (v % 4 === 3 || joint) return 0; return v % 4 === 0 ? 3 : (h3(u >> 1, row, s) < .2 ? 1 : 2); },
  straw: (u, v, s) => { const row = v >> 1; return (v % 2 === 1 && h3(u, row, s) < .35) ? 1 : (h3(u, row, s + 2) < .5 ? 3 : 2); },
  felt: (u, v, s) => { const d = Math.abs(u - 7.5) + Math.abs(v - 7.5); if (Math.abs(d - 6) < .6 && (u + v) % 2 === 0) return 'T'; return h3(u, v, s) < .06 ? 1 : 2; },
  star: (u, v) => { const x = u - 7.5, y = v - 7.5, a = Math.atan2(y, x), r = Math.hypot(x, y), k = .5 + .5 * Math.cos(5 * (a + Math.PI / 2)), lim = 2.2 + k * 3.6; return r < lim ? (r < lim - 1.2 ? 4 : 3) : 2; },
  gild: (u, v, s) => h3(u, v, s) < .07 ? 4 : ((u + v) % 6 === 0 ? 3 : 2)
};
const NOSEAM = { bobbles: true, loops: true, satin: true, fringe: false };
// a face texture as RGBA rows (side: the side pattern and colour); cached per block, side and variant
const _tex = new Map();
function texture(id, side, variant) {
  const key = id + ':' + side + ':' + variant; let t = _tex.get(key); if (t) return t;
  const b = B[id], pat = side ? b.tex[1] : b.tex[0], col = side && b.side ? b.side : b.col, tones = toneList(col), topTones = toneList(b.col), fn = PAT[pat] || PAT.felt;
  const thread = E.hex(id === 12 || id === 1 || id === 11 || id === 29 ? THREAD_DK : THREAD), seed = id * 7 + variant * 13 + (side ? 3 : 0);
  t = new Uint8ClampedArray(16 * 16 * 4);
  for (let v = 0; v < 16; v++) for (let u = 0; u < 16; u++) {
    let c = fn(u, v, seed, side), rgb;
    if (c === 'T') rgb = thread;
    else if (Array.isArray(c) && c[0] === 'top') rgb = topTones[c[1]];
    else if (Array.isArray(c)) rgb = c;
    else {
      if (!NOSEAM[pat]) { const s = seamTone(u, v); if (s >= 0) c = Math.min(c, 0); else if (stitch(u, v) && pat !== 'satin') { rgb = thread; } }
      if (!rgb) rgb = tones[E.clamp(c, 0, 4)];
    }
    const i = (v * 16 + u) * 4; t[i] = rgb[0]; t[i + 1] = rgb[1]; t[i + 2] = rgb[2]; t[i + 3] = 255;
  }
  _tex.set(key, t); return t;
}
DQ.texture = texture;

// ---- the atlas: for a view, each block's faces as small sprites at whole-pixel offsets from the block's corner ----
// faces: 0 top, 1 +x, 2 -x, 3 +y, 4 -y
const FACE_N = [[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
class Atlas {
  constructor(view) {
    this.view = view; this.key = Atlas.key(view);
    const r = v => Math.round(v);
    // whole-pixel steps per cell along x, y, z
    this.sx = [r(view.ax * T), r(view.bx * T)]; this.sy = [r(view.ay * T), r(view.by * T)]; this.sz = [0, r(view.bz * T)];
    this.faces = FACE_N.map(n => n[2] ? true : (n[0] * view.fx + n[1] * view.fy) > .01);
    // light: top full, the side on the screen's left a step darker, the right two
    this.shade = FACE_N.map((n, i) => { if (!i) return 0; const sx = view.ax * n[0] + view.ay * n[1]; return sx < 0 ? -1 : -2; });
    this.spr = new Map(); this.ov = new Map();
  }
  static key(v) { return v.id + ':' + Math.round(v.yawDeg) + ':' + v.pitchDeg.toFixed(2) + ':' + v.scale.toFixed(3); }
  // screen offset of the block corner (cx, cy, cz) from the origin, whole pixels
  at(cx, cy, cz) { return [this.sx[0] * cx + this.sy[0] * cy + this.sz[0] * cz, this.sx[1] * cx + this.sy[1] * cy + this.sz[1] * cz]; }
  _quad(face) {
    // origin corner and the u, v edge vectors (in cells), v runs top to bottom on sides
    switch (face) {
      case 0: return [[0, 0, 1], [1, 0, 0], [0, 1, 0]];
      case 1: return [[1, 0, 1], [0, 1, 0], [0, 0, -1]];
      case 2: return [[0, 1, 1], [0, -1, 0], [0, 0, -1]];
      case 3: return [[0, 1, 1], [1, 0, 0], [0, 0, -1]];
      default: return [[1, 0, 1], [-1, 0, 0], [0, 0, -1]];
    }
  }
  _raster(face, pixel) {   // pixel(u, v) -> [r,g,b,a] or null
    const [o, uu, vv] = this._quad(face), O = this.at(...o), U = this.at(...uu), V = this.at(...vv);
    const xs = [O[0], O[0] + U[0], O[0] + V[0], O[0] + U[0] + V[0]], ys = [O[1], O[1] + U[1], O[1] + V[1], O[1] + U[1] + V[1]];
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return null;
    const det = U[0] * V[1] - U[1] * V[0]; if (Math.abs(det) < 1e-6) return null;
    const cv = E.mkCanvas(w, h), g = cv.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    let any = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const qx = x0 + x + .5 - O[0], qy = y0 + y + .5 - O[1], a = (qx * V[1] - qy * V[0]) / det, b = (U[0] * qy - U[1] * qx) / det;
      if (a < 0 || a >= 1 || b < 0 || b >= 1) continue;
      const c = pixel(Math.min(15, a * 16 | 0), Math.min(15, b * 16 | 0)); if (!c) continue;
      const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3] === undefined ? 255 : c[3]; any = true;
    }
    if (!any) return null;
    g.putImageData(img, 0, 0); return { cv, x: x0, y: y0, w, h };
  }
  face(id, variant, face) {
    const key = id * 64 + variant * 8 + face; let s = this.spr.get(key);
    if (s !== undefined) return s;
    const side = face !== 0, tex = texture(id, side, variant), sh = this.shade[face], emis = B[id].light;
    const mul = sh === 0 ? 1 : sh === -1 ? .8 : .62;
    const water = B[id].liquid;
    s = this._raster(face, (u, v) => { const i = (v * 16 + u) * 4; const m = emis ? Math.max(mul, .9) : mul; return [tex[i] * m, tex[i + 1] * m, tex[i + 2] * m, water ? 170 : 255]; });
    this.spr.set(key, s); return s;
  }
  // overlays: 'ao' (bottom band of a side), 'aoT<n>' (a top edge toward neighbour n), 'crack<k>', 'cut' (cross-section hatch)
  overlay(kind, face) {
    const key = kind + ':' + face; let s = this.ov.get(key);
    if (s !== undefined) return s;
    let fn;
    if (kind === 'ao') fn = (u, v) => v >= 14 ? [10, 6, 20, v === 15 ? 110 : 70] : null;
    else if (kind.startsWith('aoT')) { const n = +kind.slice(3); fn = (u, v) => { const d = n === 1 ? 15 - u : n === 2 ? u : n === 3 ? 15 - v : v; return d < 3 ? [10, 6, 20, 90 - d * 25] : null; }; }
    else if (kind.startsWith('crack')) { const k = +kind.slice(5); fn = (u, v) => { const l1 = Math.abs(u - v) < .7 && u > 7 - k * 2.5 && u < 8 + k * 2.5, l2 = Math.abs(u + v * .5 - 12) < .6 && v > 3 && v < 3 + k * 4, l3 = k > 2 && Math.abs(v - 4 - u * .3) < .5 && u < 9; return l1 || l2 || l3 ? [20, 12, 24, 220] : null; }; }
    else if (kind === 'cut') fn = (u, v) => ((u + v) % 4 === 0) ? [40, 30, 60, 120] : [0, 0, 20, 60];
    else if (kind === 'sel') fn = (u, v) => (u === 0 || v === 0 || u === 15 || v === 15) ? [255, 248, 220, 230] : null;
    else if (kind === 'glint') fn = (u, v) => Math.abs(u - 8) + Math.abs(v - 8) < 2 ? [255, 255, 255, 230] : null;
    s = this._raster(face, fn); this.ov.set(key, s); return s;
  }
}
DQ.Atlas = Atlas;

// ---- the renderer ----
class VoxelRenderer {
  constructor(ctx) { this.ctx = ctx; this.atlases = new Map(); this.cutR = 0; this.cutZ = 99; this._cutHold = 0; this.queued = 0; this.motes = []; for (let i = 0; i < 60; i++) this.motes.push([DQ.fx(), DQ.fx(), .3 + DQ.fx() * .7]); }
  atlas(view) {
    const k = Atlas.key(view); let a = this.atlases.get(k);
    if (!a) { if (this.atlases.size > 10) this.atlases.delete(this.atlases.keys().next().value); a = new Atlas(view); this.atlases.set(k, a); }
    return a;
  }
  // build the atlas ahead of time (boot: "Threading the needles")
  warm(view) { const a = this.atlas(view); for (const id in B) for (let v = 0; v < 4; v++) for (let f = 0; f < 5; f++) if (a.faces[f]) a.face(+id, v, f); return a; }
  // cutaway: which level is hidden around the hero (eases its radius in and out)
  updateCut(dt, world, hx, hy, hz, view, mode) {
    const L = Math.floor((hz + 1) / T), cx = Math.floor(hx / T), cy = Math.floor(hy / T);
    let cover = false;
    if (mode === 'always') cover = true;
    else if (mode !== 'off') {
      const fx = Math.round(view.fx), fy = Math.round(view.fy);
      for (let k = 0; k <= 5 && !cover; k++) { const x = cx + fx * k, y = cy + fy * k; for (let l = L + 2; l <= L + 8; l++) if (world.opaqueAt(x, y, l)) { cover = true; break; } }
    }
    if (cover) this._cutHold = .5; else this._cutHold -= dt;
    const want = this._cutHold > 0 ? 7.5 : 0;
    this.cutR = E.approach(this.cutR, want, dt * 7.5 / .2);
    this.cutZ = L + 2;
    world.cut = this.cutR > .3 ? { x: hx / T, y: hy / T, z: this.cutZ, r: this.cutR } : null;
  }
  isCut(world, x, y, z) { const c = world.cut; return !!c && z >= c.z && Math.hypot(x + .5 - c.x, y + .5 - c.y) < c.r; }
  // the void behind the world: a navy gradient, lint motes and a faint stitched grid
  drawVoid(r, night) {
    r.sky(night ? ['#04030f', '#090720', '#0e0b2a'] : ['#06051a', '#0d0b2a', '#141238']);
    const g = r.ctx, W = r.bw, H = r.bh, t = r.game.real, ox = r.ix * .25, oy = r.iy * .25;
    for (let y = -((oy % 24) + 24) % 24; y < H; y += 24) for (let x = -((ox % 24) + 24) % 24; x < W; x += 24) px.rect(g, x | 0, y | 0, 1, 1, '#2a2660');
    for (const m of this.motes) {
      const x = ((m[0] * W - r.ix * .4 * m[2] + t * 4 * m[2]) % W + W) % W, y = ((m[1] * H - r.iy * .4 * m[2] - t * 2 * m[2]) % H + H) % H;
      px.rect(g, x | 0, y | 0, m[2] > .8 ? 2 : 1, 1, m[2] > .7 ? '#e8dcc0' : '#8a84b0');
    }
    if (night) for (let i = 0; i < 40; i++) { const sx = (DQ.hash2(i, 3) * W) | 0, sy = (DQ.hash2(i, 5) * H) | 0; if (Math.sin(t * 2 + i) > .3) px.rect(g, sx, sy, 1, 1, '#fff6d0'); }
  }
  // queue every visible column's runs (call after drawVoid, before anything stands on the blocks)
  queue(r, world) {
    const view = r.view, A = this.atlas(view); r._map = world; this.world = world; this.A = A;
    const inv = view.inv; if (!inv) return;
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    const W = r.bw, H = r.bh;
    for (const [sx, sy] of [[-40, -40], [W + 40, -40], [-40, H + 60], [W + 40, H + 60]]) for (const zz of [0, world.H * T]) {
      const X = sx + r.ix, Y = sy + r.iy - view.bz * zz, gx = inv[0] * X + inv[1] * Y, gy = inv[2] * X + inv[3] * Y;
      a = Math.min(a, gx); c = Math.max(c, gx); b = Math.min(b, gy); d = Math.max(d, gy);
    }
    const x0 = Math.max(0, Math.floor(a / T) - 2), x1 = Math.min(world.W - 1, Math.floor(c / T) + 2), y0 = Math.max(0, Math.floor(b / T) - 2), y1 = Math.min(world.D - 1, Math.floor(d / T) + 2);
    let n = 0;
    const [ox, oy] = A.at(0, 0, 0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const top = world.topZ(cx, cy); if (!top) continue;
      // cull columns whose whole stack is off screen
      const p0 = A.at(cx, cy, 0), sx = p0[0] - r.ix, sy0 = p0[1] - r.iy;
      if (sx < -48 || sx > W + 48) continue;
      if (sy0 + 40 < 0 || sy0 + A.sz[1] * top - 40 > H) continue;
      const rs = world.runs(cx, cy);
      for (const run of rs) {
        n++;
        // its screen box (the engine's x-ray pass only redraws occluders that overlap a silhouette)
        const a0 = A.at(cx, cy, run[1]), a1 = A.at(cx + 1, cy + 1, run[0]), a2 = A.at(cx + 1, cy, run[0]), a3 = A.at(cx, cy + 1, run[0]);
        const box = [Math.min(a0[0], a1[0], a2[0], a3[0]) - r.ix - 1, Math.min(a0[1], A.at(cx + 1, cy, run[1])[1], A.at(cx, cy + 1, run[1])[1]) - r.iy - 1, Math.max(a1[0], a2[0], a3[0], a0[0]) - r.ix + 1, Math.max(a1[1], a2[1], a3[1]) - r.iy + 1];
        r.queue(cx * T + T / 2, cy * T + T / 2, run[0] * T, g => this.drawRun(g, r, world, A, cx, cy, run[0], run[1]), { occluder: true, top: run[1] * T, box });
      }
      // water and stairs: items of their own
      for (let z = 0; z < top + 1 && z < world.H; z++) {
        const id = world.vox[world.idx(cx, cy, z)];
        if (!id) continue;
        const bk = B[id];
        if (bk.liquid && !world.liquidAt(cx, cy, z + 1)) { r.queue(cx * T + T / 2, cy * T + T / 2, z * T, g => this.drawWater(g, r, world, A, cx, cy, z), { bias: .001 }); }
        else if (bk.shape === 'stair' && !this.isCut(world, cx, cy, z)) { r.queue(cx * T + T / 2, cy * T + T / 2, z * T, g => this.drawStair(g, r, world, cx, cy, z, id), { top: z * T + T, hides: true }); }
      }
    }
    this.queued = n;
  }
  drawRun(g, r, world, A, cx, cy, z0, z1) {
    const ix = r.ix, iy = r.iy, cut = world.cut, v = world.vox, Wd = world.W, Hh = world.H;
    const inCut = cut && Math.hypot(cx + .5 - cut.x, cy + .5 - cut.y) < cut.r;
    const zEnd = inCut ? Math.min(z1, Math.max(z0, cut.z)) : z1;
    if (zEnd <= z0) return;
    const F = A.faces, opq = (x, y, z) => { if (x < 0 || y < 0 || x >= Wd || y >= world.D || z < 0 || z >= Hh) return false; const id = v[(y * Wd + x) * Hh + z]; return id > 0 && B[id].opaque && !(cut && z >= cut.z && Math.hypot(x + .5 - cut.x, y + .5 - cut.y) < cut.r); };
    const tm = r.game.real;
    for (let z = z0; z < zEnd; z++) {
      const id = v[(cy * Wd + cx) * Hh + z], variant = (DQ.hash3(cx, cy, z) * 4) | 0, p = A.at(cx, cy, z), bx = p[0] - ix, by = p[1] - iy;
      const m = world.meta.get((cy * Wd + cx) * Hh + z), dmg = m && m.hp ? m.hp / (B[id].hp || 1) : 0, crack = dmg > .9 ? 3 : dmg > .66 ? 2 : dmg > .33 ? 1 : 0;
      for (let f = 1; f < 5; f++) {
        if (!F[f]) continue;
        const n = FACE_N[f]; if (opq(cx + n[0], cy + n[1], z)) continue;
        const s = A.face(id, variant, f); if (s) g.drawImage(s.cv, bx + s.x, by + s.y);
        if (opq(cx + n[0], cy + n[1], z - 1) && z > 0) { const o = A.overlay('ao', f); if (o) g.drawImage(o.cv, bx + o.x, by + o.y); }
        if (crack) { const o = A.overlay('crack' + crack, f); if (o) g.drawImage(o.cv, bx + o.x, by + o.y); }
      }
      if (z === zEnd - 1) {
        const s = A.face(id, variant, 0); if (s) g.drawImage(s.cv, bx + s.x, by + s.y);
        for (let f = 1; f < 5; f++) { const n = FACE_N[f]; if (opq(cx + n[0], cy + n[1], z + 1)) { const o = A.overlay('aoT' + f, 0); if (o) g.drawImage(o.cv, bx + o.x, by + o.y); } }
        if (zEnd < z1) { const o = A.overlay('cut', 0); if (o) g.drawImage(o.cv, bx + o.x, by + o.y); }
        if (crack) { const o = A.overlay('crack' + crack, 0); if (o) g.drawImage(o.cv, bx + o.x, by + o.y); }
        if (id === 7 && ((tm * .5 + DQ.hash3(cx, cy, z)) % 2) < .12) { const o = A.overlay('glint', 0); if (o) g.drawImage(o.cv, bx + o.x, by + o.y); }
      }
      if (B[id].light && r.game.lights.on && !this._lightsAdded) { /* lit in addLights */ }
    }
    // frayed fringe: threads hanging under a column at the void's edge
    if (z0 === 0) {
      const fr = [[1, 0], [0, 1], [-1, 0], [0, -1]].filter(([dx, dy], i) => F[[1, 3, 2, 4][i]] && world.topZ(cx + dx, cy + dy) === 0);
      if (fr.length) {
        const p = A.at(cx, cy, 0), bx = p[0] - ix, by = p[1] - iy;
        for (const [dx, dy] of fr) for (let k = 0; k < 4; k++) {
          const t = (k + .5) / 4, ex = dx ? (dx > 0 ? 1 : 0) : t, ey = dy ? (dy > 0 ? 1 : 0) : t, q = A.at(ex, ey, 0), sx = bx + q[0], sy = by + q[1];
          const len = 6 + DQ.hash3(cx * 4 + k, cy, dx + dy * 3) * 14, sway = Math.sin(tm * 1.6 + cx + k) * 2;
          px.line(g, sx, sy, sx + sway, sy + len, k % 2 ? '#d8cca8' : '#8a7a9a');
        }
      }
    }
  }
  drawWater(g, r, world, A, cx, cy, z) {
    const p = A.at(cx, cy, z), bx = p[0] - r.ix, by = p[1] - r.iy, t = r.game.real;
    const fr = (Math.floor(t * 3 + cx * .5 + cy * .3) % 4 + 4) % 4;
    const s = A.face(13, fr, 0); if (s) g.drawImage(s.cv, bx + s.x, by + s.y + 2);
    for (let f = 1; f < 5; f++) { if (!A.faces[f]) continue; const n = FACE_N[f], id = world.get(cx + n[0], cy + n[1], z); if (id) continue; const sf = A.face(13, fr, f); if (sf) g.drawImage(sf.cv, bx + sf.x, by + sf.y + 2); }
  }
  drawStair(g, r, world, cx, cy, z, id) {
    const rot = world.rot(cx, cy, z), b = B[id], tn = E.tones(b.col), x0 = cx * T, y0 = cy * T, z0 = z * T;
    // two steps: a full low half and a high half on the rising side
    const hi = [[x0 + 8, y0, x0 + 16, y0 + 16], [x0, y0 + 8, x0 + 16, y0 + 16], [x0, y0, x0 + 8, y0 + 16], [x0, y0, x0 + 16, y0 + 8]][rot & 3];
    const lo = [[x0, y0, x0 + 8, y0 + 16], [x0, y0, x0 + 16, y0 + 8], [x0 + 8, y0, x0 + 16, y0 + 16], [x0, y0 + 8, x0 + 16, y0 + 16]][rot & 3];
    const v = r.view, frontFirst = (q) => v.order((q[0] + q[2]) / 2, (q[1] + q[3]) / 2, 0);
    const parts = [[lo, 8], [hi, 16]].sort((a, c) => frontFirst(a[0]) - frontFirst(c[0]));
    for (const [q, h] of parts) r.box(g, q[0], q[1], z0, q[2], q[3], z0 + h, tn.lt, tn.sh);
  }
  // the lights blocks give (glow patches), within view
  addLights(r, world, x0, y0, x1, y1) {
    for (let cy = Math.max(0, y0); cy <= Math.min(world.D - 1, y1); cy++) for (let cx = Math.max(0, x0); cx <= Math.min(world.W - 1, x1); cx++) {
      const t = world.topZ(cx, cy); for (let z = 0; z < t; z++) { const id = world.vox[world.idx(cx, cy, z)]; if (id === 26) r.game.lights.add(cx * T + 8, cy * T + 8, z * T + 12, 48, .9, { color: '#ffe8a0' }); }
    }
  }
  // the cursor: a stitched wireframe cube on a cell (screen pixels from the world)
  cube(g, r, x, y, z, color, dashed, h = 1) {
    const P = (a, b, c) => r.w(a * T, b * T, c * T), cs = [[x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z], [x, y, z + h], [x + 1, y, z + h], [x + 1, y + 1, z + h], [x, y + 1, z + h]].map(q => P(...q));
    const E2 = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    const ph = Math.floor(r.game.real * 8);
    for (const [a, b] of E2) {
      const [ax, ay] = cs[a], [bx, by] = cs[b], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)));
      for (let i = 0; i <= n; i++) { if (dashed && ((i + ph) % 4) >= 2) continue; px.rect(g, Math.round(ax + (bx - ax) * i / n), Math.round(ay + (by - ay) * i / n), 1, 1, color); }
    }
  }
  // a translucent ghost of a block at a cell (patterns and placement previews)
  ghost(g, r, A, id, x, y, z, alpha) {
    const p = A.at(x, y, z), bx = p[0] - r.ix, by = p[1] - r.iy, ga = g.globalAlpha;
    g.globalAlpha = alpha;
    for (let f = 0; f < 5; f++) { if (!A.faces[f]) continue; const s = A.face(id, 0, f); if (s) g.drawImage(s.cv, bx + s.x, by + s.y); }
    g.globalAlpha = ga;
  }
  // a block cube as an item icon (cached per block)
  icon(id, size = 16) {
    const key = id + ':' + size; this._icons = this._icons || new Map(); let c = this._icons.get(key); if (c) return c;
    const v = new E.View('icon', 'icon', 45, 30, Math.SQRT2 * size / 34, DQ.VIEW_ISO.zBoost), A = new Atlas(v), [ox, oy] = [Math.round(size / 2), Math.round(size * .3)];
    c = E.mkCanvas(size + 2, size + 4); const g = c.getContext('2d');
    for (const f of [0, 1, 3]) { const s = A.face(id, 0, f); if (s) g.drawImage(s.cv, ox + s.x - A.at(1, 0, 0)[0] / 2 - A.at(0, 1, 0)[0] / 2, oy + s.y - A.at(0, 0, 0)[1] + 2); }
    this._icons.set(key, c); return c;
  }
}
DQ.VoxelRenderer = VoxelRenderer;
})();
