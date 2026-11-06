// The tissue canvas, the game's signature. Each table: a 480x270 RGBA DataTexture on a 192x108 plane,
// base prebuilt per arena, then repainted from sim state each frame.
import { PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';
import { ARENAS, fbm, heightAt, vnoise } from '../content/arenas.js';
import { pathAt, pathHeading } from '../core/geom.js';
import { GEL_COLS, GEL_ROWS, stitchPoint } from '../sim/entities.js';

const { DataTexture, Mesh, NearestFilter, PlaneGeometry, RGBAFormat, UnsignedByteType, SRGBColorSpace } = THREE;

export const TEX_W = 480, TEX_H = 270;
const px = (x) => Math.round((x / 16 + 0.5) * TEX_W);
const py = (z) => Math.round((z / 9 + 0.5) * TEX_H);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const baseCache = new Map();

function hexRgb(h) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; }

/** Prebuild an arena's base picture. Cached: arenas are pure. */
export function buildBase(arenaId) {
  if (baseCache.has(arenaId)) return baseCache.get(arenaId);
  const A = ARENAS[arenaId] ?? ARENAS.forearm;
  const buf = new Uint8Array(TEX_W * TEX_H * 4);
  const ramp = A.ramp.map(hexRgb);
  const cav = hexRgb(A.cavity);
  const seed = arenaId.length * 13.7;
  for (let y = 0; y < TEX_H; y++) {
    const z = (y / TEX_H - 0.5) * 9;
    for (let x = 0; x < TEX_W; x++) {
      const fx = (x / TEX_W - 0.5) * 16;
      const m = A.mask(fx, z);
      const i = (x + y * TEX_W) * 4;
      let c;
      if (m <= 0.02) {
        const n = fbm(fx * 1.1 + seed, z * 1.1, 3);
        c = n > 0.6 ? ramp[0] : cav;
        if (A.drape) c = (x + y) % 11 === 0 ? [0x1e, 0x5f, 0x68] : [0x19, 0x54, 0x5c];
      } else {
        const tilt = (z < 0 ? 0.08 : -0.1) + (fx < 0 ? 0.04 : -0.02);
        const body = A.shade ? A.shade(fx, z) : m;
        const light = 0.25 + 0.75 * body + (fbm(fx * 0.9 + seed, z * 0.9, 4) - 0.5) * (A.shade ? 0.5 : 0.9) + tilt;
        const v = Math.min(0.999, Math.max(0, light));
        const idx = Math.max(0, Math.min(4, Math.floor(v * 5 + (BAYER[(x & 3) + (y & 3) * 4] / 16) * 0.9 - 0.2)));
        c = ramp[idx];
      }
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
    }
  }
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= TEX_W || y >= TEX_H) return;
    const i = (x + y * TEX_W) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
  };
  const inside = (x, y) => A.mask((x / TEX_W - 0.5) * 16, (y / TEX_H - 0.5) * 9) > 0.1;

  // Fat blobs near the edges.
  if (A.fat || A.fatBed) {
    const fat = hexRgb(0xe9c46a), fat2 = hexRgb(0xd9a44c);
    for (let y = 0; y < TEX_H; y++) for (let x = 0; x < TEX_W; x++) {
      const fx = (x / TEX_W - 0.5) * 16, fz = (y / TEX_H - 0.5) * 9;
      const m = A.mask(fx, fz);
      if (m < 0.1) continue;
      if (fbm(fx * 1.6 + 3, fz * 2.4, 3) > (A.fatBed ? 0.58 : 0.66 + m * 0.2)) set(x, y, vnoise(fx * 9, fz * 9) > 0.5 ? fat : fat2);
    }
  }
  // Rugae: folded lines.
  if (A.rugae) {
    const fold = hexRgb(ARENAS.stomach.ramp[1]), hi = hexRgb(0xf8c8b4);
    for (let k = 0; k < 11; k++) {
      let z = -3.2 + k * 0.62;
      for (let xx = 0; xx < TEX_W; xx++) {
        const fx = (xx / TEX_W - 0.5) * 16;
        const yy = py(z + Math.sin(fx * 0.8 + k) * 0.28 + Math.sin(fx * 2.1 + k * 2) * 0.08);
        if (inside(xx, yy) && vnoise(fx * 0.8, k * 3) > 0.25) { set(xx, yy, fold); set(xx, yy + 1, hi); }
      }
    }
  }
  // Vessels: random-walk branches.
  if (A.vessels) {
    const art = hexRgb(0xf08a5d), vein = hexRgb(0x2e1a52);
    const walk = (x0, y0, heading, len, width, col, s) => {
      let x = x0, y = y0, h = heading, n = 0;
      for (let i = 0; i < len; i++) {
        n++;
        h += (vnoise(x * 0.035 + s, y * 0.035) - 0.5) * 0.17;
        x += Math.cos(h) * 1.2;
        y += Math.sin(h) * 1.2;
        if (!inside(x | 0, y | 0)) break;
        const w = i < len * 0.4 ? width : Math.max(1, width - 1);
        for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) set((x | 0) + a, (y | 0) + b, col);
        if (hash2sim(i, s) < 0.02 && len > 40) walk(x, y, h + (hash2sim(s, i) > 0.5 ? 0.9 : -0.9), len * 0.45, 1, col, s + i);
      }
    };
    const count = Math.round(5 * A.vessels);
    for (let k = 0; k < count; k++) {
      const s = k * 7.3 + seed;
      const ang = hash2sim(k, seed) * Math.PI * 2;
      const r = 90 + hash2sim(seed, k) * 80;
      walk(TEX_W / 2 + Math.cos(ang) * r * 1.3, TEX_H / 2 + Math.sin(ang) * r * 0.55, ang + Math.PI, 150, 2, k % 2 ? art : vein, s);
    }
  }
  if (A.vesselsPair) {
    const art = hexRgb(0xc33f3f), vein = hexRgb(0x3b2a7a);
    for (let xx = 0; xx < TEX_W; xx++) {
      const fx = (xx / TEX_W - 0.5) * 16;
      if (Math.abs(fx) > 5.6) continue;
      for (let w = 0; w < 3; w++) { set(xx, py(-0.9 + Math.sin(fx * 0.7) * 0.05) + w - (fx < 0 ? 0 : 0), fx < 0 ? art : vein); }
    }
  }
  if (A.alveoli) {
    const dot = hexRgb(0x6d4f5e), lt = hexRgb(0xe8d0d0);
    for (let y = 2; y < TEX_H; y += 4) for (let x = 2 + (y % 8 === 2 ? 2 : 0); x < TEX_W; x += 4) {
      if (inside(x, y)) set(x, y, vnoise(x * 0.5, y * 0.5) > 0.55 ? lt : dot);
    }
  }
  if (A.cleft) {
    const dark = hexRgb(0x1a060e);
    for (let z = -3.2; z < 3; z += 0.02) {
      const xx = px(0.1 + Math.sin(z * 1.4) * 0.2);
      set(xx, py(z), dark); set(xx + 1, py(z), dark);
    }
  }
  if (A.boneShaft) {
    // The bone's silhouette: pale, with gaps where fragments belong.
    const bone = hexRgb(0xe8e2d0), sh = hexRgb(0xb7ae98);
    for (let x = px(-4.6); x <= px(4.6); x++) {
      const fx = (x / TEX_W - 0.5) * 16;
      const hw = 0.55 + Math.sin(fx * 1.1) * 0.06 + (Math.abs(fx) > 4.2 ? (Math.abs(fx) - 4.2) * 0.9 : 0);
      for (let y = py(-hw); y <= py(hw); y++) set(x, y, (y - py(-hw)) / (py(hw) - py(-hw)) < 0.72 ? bone : sh);
    }
  }
  if (A.ribs) {
    const rib = hexRgb(0xe9e2cf), sh = hexRgb(0xa99f88);
    for (let k = -3; k <= 3; k++) {
      if (k === 0) continue;
      for (let z = -3.4; z < 3; z += 0.015) {
        const fx = k * 1.9 + Math.sin((z + 3.4) * 0.55) * Math.sign(k) * 0.5;
        if (Math.abs(k) >= 1 && Math.hypot(fx, z) < 2.1) continue;
        const xx = px(fx), yy = py(z);
        for (let w = -3; w <= 3; w++) if (inside(xx + w, yy)) set(xx + w, yy, w > 1 ? sh : rib);
      }
    }
  }
  if (A.heartPatch) {
    const h = ARENAS.heart.ramp.map(hexRgb);
    for (let y = 0; y < TEX_H; y++) for (let x = 0; x < TEX_W; x++) {
      const fx = (x / TEX_W - 0.5) * 16, fz = (y / TEX_H - 0.5) * 9;
      const m = 1 - Math.hypot((fx - 0.4) / 2.5, (fz + 0.3) / 2);
      if (m > 0) set(x, y, h[Math.min(4, Math.max(0, Math.floor((0.35 + m + (fbm(fx, fz, 3) - 0.5) * 0.8) * 5 + (BAYER[(x & 3) + (y & 3) * 4] / 16) * 0.9 - 0.2)))]);
    }
  }
  if (A.spineRow) {
    const v = hexRgb(0xf5f0e0), sh = hexRgb(0x8e8a98), dark = hexRgb(0x5c5a6c);
    for (let k = -6; k <= 6; k++) {
      const cx = k * 0.86;
      for (let y = py(-0.42); y <= py(0.82); y++) for (let x = px(cx - 0.32); x <= px(cx + 0.32); x++) {
        const fz = (y / TEX_H - 0.5) * 9;
        set(x, y, fz > 0.5 ? sh : (x + y) % 9 === 0 ? sh : v);
      }
      for (let y = py(-0.42); y <= py(0.82); y++) set(px(cx + 0.4), y, dark);
    }
  }
  if (A.hair) {
    const hair = hexRgb(A.hair);
    for (let k = 0; k < 420; k++) {
      const x = (hash2sim(k, 1.1) * TEX_W) | 0, y = (hash2sim(k, 2.2) * TEX_H) | 0;
      if (inside(x, y)) { set(x, y, hair); if (k % 3 === 0) set(x + 1, y + 1, hair); }
    }
  }
  if (A.soot) {
    const soot = hexRgb(0x2a1a1c);
    for (let y = 0; y < TEX_H; y++) for (let x = 0; x < TEX_W; x++) {
      const fx = (x / TEX_W - 0.5) * 16, fz = (y / TEX_H - 0.5) * 9;
      if (inside(x, y) && fbm(fx * 1.2 + 9, fz * 1.2, 3) > 0.64) set(x, y, soot);
    }
  }
  if (A.bruise) {
    const bru = hexRgb(0x5a3a6e);
    for (let y = 0; y < TEX_H; y++) for (let x = 0; x < TEX_W; x++) {
      const fx = (x / TEX_W - 0.5) * 16, fz = (y / TEX_H - 0.5) * 9;
      if (inside(x, y) && fbm(fx * 0.9 + 2, fz * 0.9 + 5, 3) > 0.62 && (x + y) % 2 === 0) set(x, y, bru);
    }
  }
  // Wet sheen on the light-facing side.
  if (A.sheen) {
    const sheen = hexRgb(0xf6d0c0);
    for (let k = 0; k < A.sheen; k++) {
      const x = (hash2sim(k, 3.3) * TEX_W) | 0, y = (hash2sim(k, 4.4) * TEX_H * 0.6) | 0;
      if (inside(x, y)) set(x, y, sheen);
    }
  }
  baseCache.set(arenaId, buf);
  return buf;
}
const hash2sim = (a, b) => { const s = Math.sin(a * 91.17 + b * 47.53) * 24634.6345; return s - Math.floor(s); };

const COL = {
  blood: [0x7a, 0x12, 0x1c], blood2: [0xa8, 0x1b, 0x26], blood3: [0xd0, 0x33, 0x33], spark: [0xff, 0xa0, 0x8c],
  dark: [0x3a, 0x08, 0x10], guide: [0xf4, 0xf4, 0xf4], guide2: [0x73, 0xef, 0xf7], gel: [0xa7, 0xf0, 0x70], gel2: [0x38, 0xb7, 0x64],
  stitch: [0x14, 0x18, 0x30], stitch2: [0x41, 0xa6, 0xf6], burn: [0x2a, 0x18, 0x18], burn2: [0x55, 0x34, 0x2c], bruise: [0x5d, 0x27, 0x5d], cut: [0x4c, 0x0a, 0x14], cutE: [0xe5, 0x7a, 0x70],
  arrow: [0xff, 0xcd, 0x75], arrow2: [0xef, 0x7d, 0x57], ring: [0x73, 0xef, 0xf7], ring2: [0x25, 0x71, 0x79], rust: [0x8a, 0x4a, 0x1e], rust2: [0xb9, 0x6a, 0x2e], white: [0xf4, 0xf4, 0xf4], mist: [0xc4, 0xd0, 0xd8], xray: [0x41, 0xa6, 0xf6], gold: [0xff, 0xcd, 0x75], sob: [0x73, 0xef, 0xf7], green: [0xa7, 0xf0, 0x70],
};

export class TableView {
  constructor(ctx, arenaId, offsetX, cosmetic) {
    this.arena = arenaId;
    this.A = ARENAS[arenaId] ?? ARENAS.forearm;
    this.base = buildBase(arenaId);
    this.buf = new Uint8Array(this.base);
    this.offsetX = offsetX;
    this.rand = cosmetic;
    const tex = new DataTexture(this.buf, TEX_W, TEX_H, RGBAFormat, UnsignedByteType);
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    this.tex = tex;
    const geo = new PlaneGeometry(16, 9, 192, 108);
    geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv;
    // Flip V: the buffer's first row is the far (-z) edge.
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    uv.needsUpdate = true;
    const mat = toonMaterial(PALETTE.white, { map: tex });
    this.mesh = new Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.position.x = offsetX;
    this.mesh.frustumCulled = false;
    const pos = geo.attributes.position;
    this.x0 = new Float32Array(pos.count);
    this.z0 = new Float32Array(pos.count);
    this.h0 = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      this.x0[i] = pos.getX(i);
      this.z0[i] = pos.getZ(i);
      this.h0[i] = this.A.height(this.x0[i], this.z0[i]);
      pos.setY(i, this.h0[i]);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    this.animated = !!(this.A.beats || this.A.breathes);
    this.lastDeform = 0;
    ctx.scene.add(this.mesh);
  }

  /** The tissue's extra height at (x, z) right now: heartbeat, breathing, bulges. */
  extraAt(x, z, s) {
    let e = 0;
    if (this.A.beats && s.beat) e += this.A.beats * s.beat * Math.max(0, 1 - Math.hypot(x / 6.4, z / 4));
    if (this.A.breathes) e += this.A.breathes * s.breath * Math.max(0, 1 - Math.hypot(x / 7.5, z / 4.2));
    if (s.bulges) for (const b of s.bulges) { const d = Math.hypot(x - b.x, z - b.z); if (d < b.r) { const t = 1 - d / b.r; e += b.h * t * t * (3 - 2 * t); } }
    return e;
  }

  heightAt(x, z, s) {
    return heightAt(this.arena, x, z) + (s ? this.extraAt(x, z, s) : 0);
  }

  deform(s) {
    const any = this.animated || (s.bulges && s.bulges.length) || this.wasBulged;
    this.wasBulged = !!(s.bulges && s.bulges.length);
    if (!any) return;
    const pos = this.mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.h0[i] + this.extraAt(this.x0[i], this.z0[i], s));
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /** Repaint from a table's state. `view` holds cosmetics: time, seats, hover. */
  paint(state, table, v) {
    const buf = this.buf;
    buf.set(this.base);
    const t = v.t;
    const put = (x, y, c, a = 1) => {
      if (x < 0 || y < 0 || x >= TEX_W || y >= TEX_H) return;
      const i = (x + y * TEX_W) * 4;
      if (a >= 1) { buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; } else {
        buf[i] = buf[i] + (c[0] - buf[i]) * a; buf[i + 1] = buf[i + 1] + (c[1] - buf[i + 1]) * a; buf[i + 2] = buf[i + 2] + (c[2] - buf[i + 2]) * a;
      }
    };
    const disc = (cx, cy, r, c, a = 1) => {
      const r2 = r * r, R = Math.ceil(r);
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= r2) put(cx + x, cy + y, c, a);
    };
    const line = (x0, y0, x1, y1, c, w = 1, dash = 0, gap = 0, phase = 0) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let i = 0; i <= n; i++) {
        if (dash && (i + phase) % (dash + gap) >= dash) continue;
        const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
        if (w === 1) put(x, y, c);
        else for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) put(x + a - (w >> 1), y + b - (w >> 1), c);
      }
    };
    const ring = (cx, cy, r, c, step = 1) => {
      const n = Math.ceil(r * 6.3);
      for (let i = 0; i < n; i += step) put(cx + Math.round(Math.cos((i / n) * 6.283) * r), cy + Math.round(Math.sin((i / n) * 6.283) * r), c);
    };
    const pathLine = (path, c, w, dash, gap, phase, s0 = 0) => {
      let run = phase;
      for (let i = 1; i < path.length; i++) {
        const x0 = (path[i - 1][0] / 16 + 0.5) * TEX_W, y0 = (path[i - 1][1] / 9 + 0.5) * TEX_H, x1 = (path[i][0] / 16 + 0.5) * TEX_W, y1 = (path[i][1] / 9 + 0.5) * TEX_H;
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        for (let k = 0; k <= n; k++) {
          run++;
          if (dash && run % (dash + gap) >= dash) continue;
          const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
          if (w === 1) put(x, y, c);
          else for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) put(x + a - (w >> 1), y + b - (w >> 1), c);
        }
      }
    };

    // Gel film.
    const gel = table.gel;
    if (gel) {
      for (let r = 0; r < GEL_ROWS; r++) for (let c = 0; c < GEL_COLS; c++) {
        const g = gel[r * GEL_COLS + c];
        if (!g) continue;
        const cx = (c * 0.5) / 16 * TEX_W, cy = (r * 0.5) / 9 * TEX_H;
        const a = Math.min(0.5, g / 12);
        for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
          if ((x + y + r + c) % 2 === 0) put(Math.round(cx + x), Math.round(cy + y), COL.gel, a);
        }
      }
    }
    // Marks: what has already happened to this patient.
    for (const m of table.marks) {
      switch (m.t) {
        case 'cut':
          pathLine(m.path, COL.cutE, m.short ? 2 : 3, 0, 0, 0);
          pathLine(m.path, COL.cut, m.short ? 1 : 2, 0, 0, 0);
          break;
        case 'stitch': {
          const cx = px(m.x), cy = py(m.z), nx = -Math.sin(m.a) * 6, ny = Math.cos(m.a) * 6;
          line(cx - nx, cy - ny, cx + nx, cy + ny, COL.stitch, 2);
          line(cx - nx * 0.8, cy - ny * 0.8, cx + nx * 0.8, cy + ny * 0.8, COL.stitch2, 1);
          break;
        }
        case 'burn': case 'burnt': {
          const cx = px(m.x), cy = py(m.z);
          disc(cx, cy, m.t === 'burn' ? 6 : 8, COL.burn2, 0.85);
          disc(cx, cy, m.t === 'burn' ? 4 : 5, COL.burn, 0.95);
          break;
        }
        case 'bruise': disc(px(m.x), py(m.z), 6, COL.bruise, 0.5); break;
        case 'hole': disc(px(m.x), py(m.z), 2, COL.cut); disc(px(m.x), py(m.z), 1, COL.dark); break;
        case 'gelpatch': for (const c of m.cells) disc(px(c[0]), py(c[1]), 5, COL.gel2, 0.25); break;
        case 'dressing':
          pathLine(m.path, COL.white, 12, 0, 0, 0);
          pathLine(m.path, COL.mist, 2, 6, 6, 0);
          break;
        default: break;
      }
    }
    const scan = v.scan;
    for (const e of state.ents) {
      if (e.table !== table.i || e.dead) continue;
      const hiddenNow = e.hidden;
      const scanVisible = hiddenNow && scan && Math.hypot(scan.x - e.x, scan.z - e.z) < scan.r;
      if (hiddenNow && !scanVisible) continue;
      switch (e.k) {
        case 'pool': case 'bleeder': {
          if (hiddenNow) break;
          const r = (e.r / 16) * TEX_W, cx = px(e.x), cy = py(e.z);
          const R = Math.ceil(r + 3), r2 = r * r;
          for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
            const d2 = x * x + y * y;
            const wob = (vnoise((cx + x) * 0.13 + e.x, (cy + y) * 0.13) - 0.5) * r * 0.5;
            const rr = r + wob;
            if (Math.sqrt(d2) > rr) continue;
            const edge = rr - Math.sqrt(d2);
            let c = edge < 2 ? COL.dark : d2 < r2 * 0.3 ? COL.blood3 : d2 < r2 * 0.65 ? COL.blood2 : COL.blood;
            if (((cx + x) * 7 + (cy + y) * 13 + ((t * 6) | 0) * 29) % 97 === 0) c = COL.spark;
            put(cx + x, cy + y, c);
          }
          if (e.k === 'bleeder') disc(cx, cy, 2 + (Math.sin(t * 9) > 0 ? 1 : 0), COL.dark);
          break;
        }
        case 'nick': {
          const cx = px(e.x), cy = py(e.z);
          line(cx - 4, cy - 1, cx + 4, cy + 1, COL.dark, 2);
          line(cx - 3, cy, cx + 3, cy, COL.blood3, 1);
          if (((t * 3 + e.x) | 0) % 3 === 0) put(cx, cy + 3, COL.blood3);
          break;
        }
        case 'laceration': {
          const a = stitchPoint({ ...e, flip: 1 }, 0), b = stitchPoint({ ...e, flip: 1 }, e.slots - 1);
          const ax = px(a[0]), ay = py(a[1]), bx = px(b[0]), by = py(b[1]);
          line(ax, ay, bx, by, COL.blood3, 5);
          line(ax, ay, bx, by, COL.dark, 3);
          // Slots: bright ticks either side; the next one stands out.
          const pulse = Math.sin(t * 7) > 0;
          for (let i = e.next; i < e.slots; i++) {
            const p = e.flip ? stitchPoint(e, i) : stitchPoint({ ...e, flip: 1 }, i);
            const nx = -Math.sin(e.a) * 7, ny = Math.cos(e.a) * 7;
            const cx = px(p[0]), cy = py(p[1]);
            const hot = i === e.next && e.flip;
            put(Math.round(cx + nx), Math.round(cy + ny), hot && pulse ? COL.white : COL.guide2);
            put(Math.round(cx - nx), Math.round(cy - ny), hot && pulse ? COL.white : COL.guide2);
            if (hot) line(cx + nx, cy + ny, cx - nx, cy - ny, COL.guide2, 1, 1, 2, (t * 12) | 0);
          }
          break;
        }
        case 'incision': {
          // The rest of the line, dotted and marching; what's cut stays open.
          const done = [];
          const rest = [];
          let s = 0;
          for (let i = 0; i < e.path.length; i++) {
            if (i > 0) s += Math.hypot(e.path[i][0] - e.path[i - 1][0], e.path[i][1] - e.path[i - 1][1]);
            (s <= e.s ? done : rest).push(e.path[i]);
          }
          const here = pathAt(e.path, e.s);
          if (done.length) { done.push(here); pathLine(done, COL.cutE, 3, 0, 0, 0); pathLine(done, COL.cut, 2, 0, 0, 0); }
          rest.unshift(here);
          pathLine(rest, COL.ring2, 3, 5, 3, -((t * 14) | 0));
          pathLine(rest, COL.guide, 1, 5, 3, -((t * 14) | 0));
          ring(px(here[0]), py(here[1]), 7 + (Math.sin(t * 6) > 0 ? 1 : 0), COL.guide);
          break;
        }
        case 'dressing': {
          const done = [], rest = [];
          let s = 0;
          for (let i = 0; i < e.path.length; i++) {
            if (i > 0) s += Math.hypot(e.path[i][0] - e.path[i - 1][0], e.path[i][1] - e.path[i - 1][1]);
            (s <= e.s ? done : rest).push(e.path[i]);
          }
          const here = pathAt(e.path, e.s);
          if (done.length) { done.push(here); pathLine(done, COL.white, 12, 0, 0, 0); pathLine(done, COL.mist, 2, 6, 6, 0); }
          rest.unshift(here);
          pathLine(rest, COL.mist, 1, 4, 4, -((t * 12) | 0));
          ring(px(here[0]), py(here[1]), 8, COL.white);
          break;
        }
        case 'mask': {
          for (const c of e.cells) {
            const cx = px(c[0]), cy = py(c[1]);
            if (c[2]) disc(cx, cy, 6, COL.gel, 0.55);
            else if (e.sob) { const on = Math.sin(t * 8 + c[0]) > 0; disc(cx, cy, on ? 3 : 2, on ? COL.sob : COL.white); }
            else {
              const n = vnoise(c[0] * 3, c[1] * 3);
              disc(cx, cy, 6, n > 0.5 ? COL.rust : COL.rust2, 0.42);
              if (Math.sin(t * 5 + c[0] * 2 + c[1]) > 0.75) put(cx, cy, COL.gel);
            }
          }
          break;
        }
        case 'marker': {
          const cx = px(e.x), cy = py(e.z);
          ring(cx, cy, 13 + Math.sin(t * 5) * 2, COL.gold);
          ring(cx, cy, 6, COL.white);
          break;
        }
        case 'hook': case 'prop': case 'magnet': case 'tumor': case 'organ': case 'debris': case 'unclamp': case 'core': case 'stalk': case 'plate': {
          if (hiddenNow) {
            // An x-ray silhouette through the scanner.
            ring(px(e.x), py(e.z), e.k === 'tumor' ? 28 : 11, COL.xray, 2);
            disc(px(e.x), py(e.z), e.k === 'tumor' ? 16 : 6, COL.xray, 0.5);
            break;
          }
          if (e.locked) break;
          if (e.k === 'tumor') disc(px(e.home[0]), py(e.home[1]), 18, COL.cut, 0.6);
          if (e.path && !e.free) {
            // The way out: a curved arrow.
            const rest = [];
            let s = 0;
            for (let i = 0; i < e.path.length; i++) {
              if (i > 0) s += Math.hypot(e.path[i][0] - e.path[i - 1][0], e.path[i][1] - e.path[i - 1][1]);
              if (s >= e.s) rest.push(e.path[i]);
            }
            rest.unshift(pathAt(e.path, e.s));
            const c = e.tether ? COL.green : COL.arrow;
            pathLine(rest, COL.arrow2, 3, 4, 2, -((t * 16) | 0));
            pathLine(rest, c, 1, 4, 2, -((t * 16) | 0));
            const end = e.path[e.path.length - 1];
            const h = pathHeading(e.path, e.len - 0.01);
            const ex = px(end[0]), ey = py(end[1]);
            line(ex, ey, ex + Math.cos(h + 2.5) * 8, ey + Math.sin(h + 2.5) * 8, c, 2);
            line(ex, ey, ex + Math.cos(h - 2.5) * 8, ey + Math.sin(h - 2.5) * 8, c, 2);
          }
          break;
        }
        case 'fragment': case 'clamp': case 'donor': {
          if (e.placed || !e.to) break;
          // The silhouette it belongs on.
          const cx = px(e.to[0]), cy = py(e.to[1]);
          if (e.k === 'fragment') {
            const rw = 15, rh = 9;
            line(cx - rw, cy - rh, cx + rw, cy - rh, COL.ring, 1, 2, 2, (t * 8) | 0);
            line(cx + rw, cy - rh, cx + rw, cy + rh, COL.ring, 1, 2, 2, (t * 8) | 0);
            line(cx + rw, cy + rh, cx - rw, cy + rh, COL.ring, 1, 2, 2, (t * 8) | 0);
            line(cx - rw, cy + rh, cx - rw, cy - rh, COL.ring, 1, 2, 2, (t * 8) | 0);
            disc(cx, cy, 2, COL.dark);
          } else ring(cx, cy, e.k === 'donor' ? 24 : 11, COL.ring, 2);
          break;
        }
        case 'clot': case 'polyp': case 'egg': case 'cyst': case 'eye': case 'halo': {
          if (hiddenNow) { ring(px(e.x), py(e.z), 12, COL.xray, 2); break; }
          if (e.heat > 0 && !e.locked) disc(px(e.x), py(e.z), ((e.r / 16) * TEX_W + 2) * Math.min(1, e.heat), COL.burn2, 0.7);
          break;
        }
        default: break;
      }
    }
    // Blood on the tips of droplets.
    if (state.drops) {
      for (const d of state.drops) {
        if (d.table !== table.i || d.dead) continue;
        disc(px(d.x), py(d.z - 0.08), 2, COL.ring);
        line(px(d.x), py(d.z - 0.24), px(d.x), py(d.z), COL.ring2, 1);
      }
    }
    // The injection ring.
    if (v.showRing) {
      const [rx, rz] = table.ring;
      const cx = px(rx), cy = py(rz);
      const pulse = v.ringHot ? (Math.sin(t * 8) > 0 ? 1 : 0) : 0;
      ring(cx, cy, (0.8 / 16) * TEX_W + pulse, v.ringHot ? COL.white : COL.ring, v.ringHot ? 1 : 2);
      ring(cx, cy, (0.8 / 16) * TEX_W - 3, COL.ring2, 2);
      disc(cx, cy, 2, v.ringHot ? COL.white : COL.ring);
    }
    // The scanner's disc, drawn on the tissue.
    if (scan) {
      const cx = px(scan.x), cy = py(scan.z);
      const R = (scan.r / 16) * TEX_W;
      ring(cx, cy, R, COL.xray);
      ring(cx, cy, R * 0.66, COL.xray, 3);
      const sweep = t * 3;
      line(cx, cy, cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R, COL.ring, 1);
    }
    // A strain moving under the tissue shows as a blotch; the scanner shows it crisply.
    for (const e of state.ents) {
      if (e.table !== table.i || e.dead || e.k !== 'strain:introit' || e.hidden) continue;
      if (e.phase === 'dead') continue;
      const cx = px(e.x), cy = py(e.z);
      if (e.scanT > 0) { disc(cx, cy, 12, COL.xray, 0.6); ring(cx, cy, 15, COL.ring); }
      else disc(cx, cy, 13, COL.bruise, 0.28);
      if (e.phase === 'pore') {
        const pulse = 5 + Math.sin(t * 9) * 2;
        disc(cx, cy, pulse + 2, COL.blood2);
        disc(cx, cy, pulse, COL.dark);
      } else if (e.phase === 'exposed') {
        disc(cx, cy, 11, COL.dark);
      }
    }
    this.tex.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.tex.dispose();
  }
}

