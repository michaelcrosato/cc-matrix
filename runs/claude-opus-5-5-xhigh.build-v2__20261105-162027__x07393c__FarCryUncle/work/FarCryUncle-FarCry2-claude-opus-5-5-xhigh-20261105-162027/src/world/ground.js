// The Kettle's height and surface kinds, pure data with no scene objects, so the fire, the map and tests can read it anywhere.
import { createNoise } from '../../pixel-engine.js';
import { ROADS, RAIL, RIVER, RIVER_Y, BRIDGES, FORD, RAIL_BRIDGE } from '../content/roads.js';
import { SITES, POSTS, TRIGS, HALTS } from '../content/sites.js';
import { clamp, lerp, smooth, hash2 } from '../core/rng.js';

export const SIZE = 1280;
export const CELLS = 512;
export const CELL = SIZE / CELLS;
export const HALF = SIZE / 2;

// Surface kinds, per 2.5 m terrain cell.
export const K = { GRASS: 0, ROAD: 1, WATER: 2, ROCK: 3, SALT: 4, WOOD: 5, DIRT: 6, BANK: 7, CROP: 8, RAIL: 9, TRACK: 10, MINE: 11 };

export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0;
  return { d: Math.hypot(px - (ax + dx * t), pz - (az + dz * t)), t, x: ax + dx * t, z: az + dz * t };
}
export function distToPolyline(px, pz, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const s = distToSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (s.d < best) best = s.d;
  }
  return best;
}
export function polyLength(pts) { let l = 0; for (let i = 0; i + 1 < pts.length; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return l; }
export function pointAlong(pts, s, out = [0, 0, 0]) {
  // out: [x, z, yaw of the direction of travel; 0 faces +Z]
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= l || i + 2 === pts.length) {
      const t = l > 0 ? clamp(s / l, 0, 1) : 0;
      out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = Math.atan2(b[0] - a[0], b[1] - a[1]);
      return out;
    }
    s -= l;
  }
  return out;
}

export class Ground {
  constructor(seed = 7) {
    this.seed = seed;
    this.noise = createNoise(seed);
    this.h = new Float32Array((CELLS + 1) * (CELLS + 1));
    this.kind = new Uint8Array(CELLS * CELLS);
    this.build();
  }
  idx(ix, iz) { return ix + iz * (CELLS + 1); }
  gx(x) { return (x + HALF) / CELL; }
  px(ix) { return ix * CELL - HALF; }
  base(x, z) {
    const n = this.noise;
    let y = 40 + 14 * n.fbm2(x * 0.0032, z * 0.0032, { octaves: 4 }) + 2.5 * n.fbm2(x * 0.02, z * 0.02, { octaves: 3 });
    const rd = Math.hypot(x + 130, z + 520);
    if (rd < 260) y += 42 * smooth(1 - rd / 260) * (0.45 + 0.55 * n.ridged2(x * 0.008, z * 0.008, { octaves: 3 }));
    if (x < -520) {
      const pass = Math.hypot(x + 590, z + 430);
      y += 30 * smooth((-520 - x) / 90) * smooth((pass - 22) / 90);
    }
    return y;
  }
  build() {
    const { h } = this;
    const N = CELLS + 1;
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) h[ix + iz * N] = this.base(this.px(ix), this.px(iz));
    this.stampSaltPan();
    this.stampMine();
    this.stampRiver();
    for (const site of Object.values(SITES)) if (site.r > 0) this.stampFlat(site.at[0], site.at[1], site.r, 22);
    for (const p of Object.values(POSTS)) this.stampFlat(p.at[0], p.at[1], 16, 14);
    for (const h2 of Object.values(HALTS)) this.stampFlat(h2.at[0], h2.at[1], 10, 8);
    for (const t of TRIGS) this.stampMound(t.at[0], t.at[1], 22, 7);
    this.stampRoads();
    this.classify();
  }
  sampleH(x, z) {
    const gx = clamp(this.gx(x), 0, CELLS - 0.001), gz = clamp(this.gx(z), 0, CELLS - 0.001);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, N = CELLS + 1, h = this.h;
    const a = h[ix + iz * N], b = h[ix + 1 + iz * N], c = h[ix + (iz + 1) * N], d = h[ix + 1 + (iz + 1) * N];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
  }
  forRadius(cx, cz, r, fn) {
    const N = CELLS + 1;
    const x0 = clamp(Math.floor(this.gx(cx - r)), 0, CELLS), x1 = clamp(Math.ceil(this.gx(cx + r)), 0, CELLS);
    const z0 = clamp(Math.floor(this.gx(cz - r)), 0, CELLS), z1 = clamp(Math.ceil(this.gx(cz + r)), 0, CELLS);
    for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
      const x = this.px(ix), z = this.px(iz);
      fn(ix + iz * N, x, z, Math.hypot(x - cx, z - cz));
    }
  }
  stampFlat(cx, cz, r, soft) {
    const y = this.sampleH(cx, cz);
    this.forRadius(cx, cz, r + soft, (i, x, z, d) => {
      if (Math.hypot(x - cx, z - cz) > r + soft) return;
      const t = smooth((r + soft - d) / soft);
      if (this.isChannel(x, z)) return;
      this.h[i] = lerp(this.h[i], y, t);
    });
  }
  stampMound(cx, cz, r, up) {
    this.forRadius(cx, cz, r, (i, x, z, d) => { if (d < r) this.h[i] += up * smooth(1 - d / r); });
  }
  stampSaltPan() {
    this.forRadius(200, 470, 215, (i, x, z, d) => { this.h[i] = lerp(36, this.h[i], smooth((d - 150) / 65)); });
  }
  stampMine() {
    const [cx, cz] = [150, -300], R = 70, depth = 24, rim = this.sampleH(cx + 110, cz);
    this.rim = rim;
    this.forRadius(cx, cz, R + 40, (i, x, z, d) => {
      if (d > R + 40) return;
      const blend = smooth((R + 40 - d) / 40);
      let y = rim;
      if (d < R) {
        const t = 1 - d / R;
        const steps = 5;
        const stair = Math.floor(t * steps) / steps + smooth((t * steps) % 1) * 0.5 / steps;
        y = rim - depth * Math.min(1, stair * 1.12);
      }
      this.h[i] = lerp(this.h[i], y, blend);
    });
  }
  isChannel(x, z) { return distToPolyline(x, z, RIVER) < 10; }
  stampRiver() {
    const half = 7, bankTop = RIVER_Y + 2, soft = 70, N = CELLS + 1;
    const dist = new Float32Array(N * N).fill(1e9);
    for (let i = 0; i + 1 < RIVER.length; i++) {
      const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
      const x0 = clamp(Math.floor(this.gx(Math.min(ax, bx) - soft - 5)), 0, CELLS), x1 = clamp(Math.ceil(this.gx(Math.max(ax, bx) + soft + 5)), 0, CELLS);
      const z0 = clamp(Math.floor(this.gx(Math.min(az, bz) - soft - 5)), 0, CELLS), z1 = clamp(Math.ceil(this.gx(Math.max(az, bz) + soft + 5)), 0, CELLS);
      for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
        const d = distToSegment(this.px(ix), this.px(iz), ax, az, bx, bz).d;
        if (d < dist[ix + iz * N]) dist[ix + iz * N] = d;
      }
    }
    for (let i = 0; i < N * N; i++) {
      const d = dist[i];
      if (d > half + 4 + soft) continue;
      if (d < half) this.h[i] = RIVER_Y - 1;
      else if (d < half + 4) this.h[i] = lerp(RIVER_Y - 1, bankTop, smooth((d - half) / 4));
      else this.h[i] = lerp(bankTop, this.h[i], smooth((d - half - 4) / soft));
    }
    // The ford: a shallow stretch trucks can cross.
    const [fx, fz] = FORD.at;
    this.forRadius(fx, fz, FORD.r + 6, (i, x, z, d) => {
      const near = distToPolyline(x, z, ROADS.ford.pts);
      if (near < 8) { const t = smooth((FORD.r + 6 - d) / 6); this.h[i] = lerp(this.h[i], RIVER_Y - 0.25, t); }
    });
  }
  stampRoads() {
    const lines = [...Object.values(ROADS).map((r) => ({ pts: r.pts, half: r.track ? 3.5 : 5, soft: 4 })), ...Object.values(RAIL).map((pts) => ({ pts, half: 3, soft: 4, rail: true }))];
    const roadY = new Float32Array((CELLS + 1) * (CELLS + 1)).fill(NaN);
    const weight = new Float32Array((CELLS + 1) * (CELLS + 1));
    for (const line of lines) {
      const { pts, half, soft } = line;
      // Sample a smoothed height profile along the line, keeping the grade gentle.
      const L = polyLength(pts), step = 6, n = Math.max(2, Math.ceil(L / step));
      const prof = new Float32Array(n + 1), p = [0, 0, 0];
      const atDeck = new Uint8Array(n + 1);
      const decks = [...BRIDGES, RAIL_BRIDGE];
      for (let i = 0; i <= n; i++) {
        pointAlong(pts, (i / n) * L, p);
        prof[i] = this.sampleH(p[0], p[1]);
        if (decks.some((b) => Math.hypot(p[0] - b.at[0], p[1] - b.at[1]) < 26)) { atDeck[i] = 1; prof[i] = RIVER_Y + 2; }
      }
      for (let pass = 0; pass < 8; pass++) {
        for (let i = 1; i < n; i++) prof[i] = (prof[i - 1] + prof[i] * 2 + prof[i + 1]) / 4;
        for (let i = 0; i <= n; i++) if (atDeck[i]) prof[i] = RIVER_Y + 2;
      }
      let s0 = 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az);
        const pad = half + soft + 2;
        const x0 = clamp(Math.floor(this.gx(Math.min(ax, bx) - pad)), 0, CELLS), x1 = clamp(Math.ceil(this.gx(Math.max(ax, bx) + pad)), 0, CELLS);
        const z0 = clamp(Math.floor(this.gx(Math.min(az, bz) - pad)), 0, CELLS), z1 = clamp(Math.ceil(this.gx(Math.max(az, bz) + pad)), 0, CELLS);
        for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
          const x = this.px(ix), z = this.px(iz);
          const seg = distToSegment(x, z, ax, az, bx, bz);
          if (seg.d > half + soft) continue;
          const at = clamp((s0 + seg.t * len) / L * n, 0, n), j = Math.min(n - 1, at | 0);
          const y = lerp(prof[j], prof[j + 1], at - j);
          const w = seg.d < half ? 1 : smooth((half + soft - seg.d) / soft);
          const id = ix + iz * (CELLS + 1);
          if (w > weight[id]) { weight[id] = w; roadY[id] = y; }
        }
        s0 += len;
      }
    }
    const N = CELLS + 1;
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
      const id = ix + iz * N;
      if (weight[id] <= 0) continue;
      const x = this.px(ix), z = this.px(iz);
      const nearRiver = distToPolyline(x, z, RIVER);
      if (nearRiver < 12) {
        // Bridges keep the channel below them; the ford keeps its shallows.
        if (nearRiver < 11) continue;
      }
      this.h[id] = lerp(this.h[id], roadY[id], weight[id]);
    }
  }
  classify() {
    const { kind } = this;
    const N = CELLS;
    const slope = (ix, iz) => {
      const a = this.h[ix + iz * (N + 1)], b = this.h[ix + 1 + iz * (N + 1)], c = this.h[ix + (iz + 1) * (N + 1)];
      return Math.hypot(a - b, a - c) / CELL;
    };
    const wn = this.noise;
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
      const x = this.px(ix) + CELL / 2, z = this.px(iz) + CELL / 2;
      const y = this.sampleH(x, z);
      let k = K.GRASS;
      const s = slope(ix, iz);
      const eastWoods = wn.fbm2(x * 0.006 + 40, z * 0.006, { octaves: 2 }) > 0.12 + (x > 150 ? -0.28 : 0.1);
      if (eastWoods) k = K.WOOD;
      if (s > 0.85) k = K.ROCK;
      if (Math.hypot(x - 200, z - 470) < 150) k = K.SALT;
      if (Math.hypot(x - 150, z + 300) < 72) k = K.MINE;
      if (Math.hypot(x + 130, z + 520) < 90 && s > 0.45) k = K.ROCK;
      kind[ix + iz * N] = k;
    }
    // River and banks.
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
      const x = this.px(ix) + CELL / 2, z = this.px(iz) + CELL / 2;
      const y = this.sampleH(x, z);
      if (Math.abs(y - RIVER_Y) > 6) continue;
      const d = distToPolyline(x, z, RIVER);
      if (d < 7.6) kind[ix + iz * N] = K.WATER;
      else if (d < 24) kind[ix + iz * N] = K.BANK;
    }
    const paintLine = (pts, half, k) => {
      for (let i = 0; i + 1 < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const pad = half + 2;
        const x0 = clamp(Math.floor(this.gx(Math.min(ax, bx) - pad)), 0, N - 1), x1 = clamp(Math.ceil(this.gx(Math.max(ax, bx) + pad)), 0, N - 1);
        const z0 = clamp(Math.floor(this.gx(Math.min(az, bz) - pad)), 0, N - 1), z1 = clamp(Math.ceil(this.gx(Math.max(az, bz) + pad)), 0, N - 1);
        for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
          const x = this.px(ix) + CELL / 2, z = this.px(iz) + CELL / 2;
          if (kind[ix + iz * N] === K.WATER && Math.hypot(x - FORD.at[0], z - FORD.at[1]) > FORD.r) continue;
          if (distToSegment(x, z, ax, az, bx, bz).d < half) kind[ix + iz * N] = k;
        }
      }
    };
    // Site compounds are bare earth; the Long Field is crop.
    for (const site of Object.values(SITES)) {
      if (site.crop) {
        const { w, d } = site.crop;
        for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
          const x = this.px(ix) + CELL / 2, z = this.px(iz) + CELL / 2;
          if (Math.abs(x - site.at[0]) < w / 2 && Math.abs(z - site.at[1]) < d / 2 && kind[ix + iz * N] !== K.WATER) kind[ix + iz * N] = K.CROP;
        }
      }
      if (site.r > 0 && !site.crop) {
        const r = Math.max(10, site.r * 0.72);
        this.forRadiusCells(site.at[0], site.at[1], r, (i, jitter) => { if (kind[i] !== K.WATER && jitter) kind[i] = K.DIRT; });
      }
    }
    for (const p of Object.values(POSTS)) this.forRadiusCells(p.at[0], p.at[1], 12, (i, jit) => { if (kind[i] !== K.WATER && jit) kind[i] = K.DIRT; });
    // Tanks stand in dry weeds: that is how a grass fire reaches them.
    for (const site of Object.values(SITES)) if (site.tanks) for (const [dx, dz] of site.tanks) this.forRadiusCells(site.at[0] + dx, site.at[1] + dz, 9, (i) => { kind[i] = K.GRASS; });
    if (SITES['east-siding']) this.forRadiusCells(SITES['east-siding'].at[0] + 8, SITES['east-siding'].at[1] - 32, 22, (i) => { kind[i] = K.GRASS; });
    for (const pts of Object.values(RAIL)) paintLine(pts, 2.6, K.RAIL);
    for (const r of Object.values(ROADS)) paintLine(r.pts, r.track ? 2.4 : 3.8, r.track ? K.TRACK : K.ROAD);
    // Bridges keep their water below.
    for (const b of BRIDGES) this.forRadiusCells(b.at[0], b.at[1], 16, (i) => { const x = this.px(i % N) + CELL / 2, z = this.px((i / N) | 0) + CELL / 2; if (distToPolyline(x, z, RIVER) < 7.6) kind[i] = K.WATER; });
    this.forRadiusCells(RAIL_BRIDGE.at[0], RAIL_BRIDGE.at[1], 16, (i) => { const x = this.px(i % N) + CELL / 2, z = this.px((i / N) | 0) + CELL / 2; if (distToPolyline(x, z, RIVER) < 7.6) kind[i] = K.WATER; });
  }
  forRadiusCells(cx, cz, r, fn) {
    const N = CELLS;
    const x0 = clamp(Math.floor(this.gx(cx - r)), 0, N - 1), x1 = clamp(Math.ceil(this.gx(cx + r)), 0, N - 1);
    const z0 = clamp(Math.floor(this.gx(cz - r)), 0, N - 1), z1 = clamp(Math.ceil(this.gx(cz + r)), 0, N - 1);
    for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
      const x = this.px(ix) + CELL / 2, z = this.px(iz) + CELL / 2, d = Math.hypot(x - cx, z - cz);
      if (d < r) fn(ix + iz * N, d < r * 0.8 || hash2(ix, iz) > 0.5);
    }
  }
  kindAt(x, z) {
    const ix = clamp(Math.floor(this.gx(x)), 0, CELLS - 1), iz = clamp(Math.floor(this.gx(z)), 0, CELLS - 1);
    return this.kind[ix + iz * CELLS];
  }
  /** Standing water deep enough to wade: on the river, and not on a deck above it. */
  isWater(x, z) { return this.kindAt(x, z) === K.WATER; }
  isFord(x, z) { return Math.hypot(x - FORD.at[0], z - FORD.at[1]) < FORD.r; }
}
