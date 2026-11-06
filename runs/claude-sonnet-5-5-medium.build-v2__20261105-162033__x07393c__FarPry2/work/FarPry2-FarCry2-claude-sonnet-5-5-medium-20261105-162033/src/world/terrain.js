// The Kettle: height function, stamps, ground colour. Pure data first (buildLand), meshes in makeTerrain.
import { createNoise, PALETTE, Terrain, THREE } from '../../pixel-engine.js';
import { SITES } from '../content/sites.js';
import { ROADS, RIVER, RAIL, RAIL_SPUR } from '../content/roads.js';

export const WORLD = 1280, HALF = 640, CELLS = 512, CELL = WORLD / CELLS, YOFF = 0;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, z) => { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** nearest distance from (x,z) to a polyline, plus the nearest point's parameter */
export function distPoly(pts, x, z) {
  let best = 1e9, bx = 0, bz = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [cx, cz] = pts[i + 1];
    const dx = cx - ax, dz = cz - az, l2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bx = px; bz = pz; }
  }
  return { d: best, x: bx, z: bz };
}

export function buildLand(seed = 7) {
  const noise = createNoise(seed);
  const base = (x, z) => {
    let h = 40 + 14 * noise.fbm2(x * 0.0032, z * 0.0032) + 2.5 * noise.fbm2(x * 0.02, z * 0.02);
    const dr = Math.hypot(x + 130, z + 520);
    if (dr < 260) h += 42 * (0.45 + 0.55 * noise.ridged2(x * 0.01, z * 0.01)) * (1 - sm(120, 260, dr));
    const esc = sm(-480, -540, x);
    h += 30 * esc;
    h -= 26 * esc * (1 - sm(14, 50, Math.hypot(x + 590, z + 430)));
    const ds = Math.hypot(x - 200, z - 470);
    h = h + (36 - h) * (1 - sm(100, 150, ds));
    const dm = Math.hypot(x - 150, z + 300);
    if (dm < 70) { const depth = 24 * (1 - sm(40, 70, dm)); h -= Math.round(depth / 4) * 4 * 0.6 + depth * 0.4; }
    return h;
  };
  return { noise, base };
}

export function makeLand(seed = 7) {
  const { noise, base } = buildLand(seed);
  const N = CELLS + 1;
  const hts = new Float32Array(N * N);
  const stampsites = SITES.filter((s) => !['flat', 'mine', 'pass', 'field'].includes(s.kind));
  const siteBase = stampsites.map((s) => base(s.at[0], s.at[1]));
  const roadDist = new Float32Array(N * N).fill(99), riverDist = new Float32Array(N * N).fill(99);
  const railDist = new Float32Array(N * N).fill(99);
  // bounding boxes for fast rejection
  const mk = (pts, m) => ({ pts, x0: Math.min(...pts.map((p) => p[0])) - m, x1: Math.max(...pts.map((p) => p[0])) + m, z0: Math.min(...pts.map((p) => p[1])) - m, z1: Math.max(...pts.map((p) => p[1])) + m });
  const roads = ROADS.map((r) => mk(r.pts, 12)), river = mk(RIVER, 20);
  const rails = [mk(RAIL, 8), mk(RAIL_SPUR, 8)];
  const smoothRoadH = (x, z) => (base(x, z) * 2 + base(x + 8, z) + base(x - 8, z) + base(x, z + 8) + base(x, z - 8)) / 6;
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
    const x = -HALF + ix * CELL, z = -HALF + iz * CELL, i = ix + iz * N;
    let h = base(x, z);
    // river channel
    if (x > river.x0 && x < river.x1 && z > river.z0 && z < river.z1) {
      const r = distPoly(RIVER, x, z); riverDist[i] = r.d;
      if (r.d < 14) h -= 3 * (1 - sm(3, 14, r.d));
    }
    // roads
    let rd = 99, rh = h;
    for (let k = 0; k < roads.length; k++) {
      const R = roads[k]; if (x < R.x0 || x > R.x1 || z < R.z0 || z > R.z1) continue;
      const r = distPoly(R.pts, x, z); if (r.d < rd) { rd = r.d; rh = smoothRoadH(r.x, r.z); }
    }
    roadDist[i] = rd;
    if (rd < 8 && riverDist[i] > 9) h = h + (rh - h) * (1 - sm(5, 8, rd));
    for (const R of rails) if (x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1) { const d = distPoly(R.pts, x, z).d; if (d < railDist[i]) railDist[i] = d; }
    // site stamps
    for (let s = 0; s < stampsites.length; s++) {
      const S = stampsites[s], d = Math.hypot(x - S.at[0], z - S.at[1]);
      if (d < S.r * 1.5) { const w = 1 - sm(S.r * 0.8, S.r * 1.5, d); h = h + (siteBase[s] - h) * w; }
    }
    hts[i] = h + YOFF;
  }
  return { noise, base, hts, roadDist, riverDist, railDist, N };
}

/** categories for ground and fuel */
export const K = { GRASS: 0, ROAD: 1, ROCK: 2, SALT: 3, WATER: 4, WOOD: 5, DIRT: 6, PIT: 7, RAIL: 8 };

export function makeTerrain(ctx, land) {
  const t = new Terrain({ size: [WORLD, WORLD], cells: [CELLS, CELLS], steep: 0.74 });
  const N = land.N;
  t.generate((x, z) => {
    const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL);
    return land.hts[Math.min(N - 1, Math.max(0, ix)) + Math.min(N - 1, Math.max(0, iz)) * N];
  });
  // classify and paint
  const kind = new Uint8Array(CELLS * CELLS);
  const baseCol = new Float32Array(CELLS * CELLS * 3);
  const col = t.mesh.geometry.getAttribute('color');
  const C = (n) => new THREE.Color(PALETTE[n]);
  const pal = { sand: C('sand'), orange: C('orange'), red: C('red'), plum: C('plum'), mist: C('mist'), white: C('white'), green: C('green'), teal: C('teal'), lime: C('lime'), slate: C('slate') };
  const tmp = new THREE.Color();
  for (let iz = 0; iz < CELLS; iz++) for (let ix = 0; ix < CELLS; ix++) {
    const x = -HALF + (ix + 0.5) * CELL, z = -HALF + (iz + 0.5) * CELL, i = ix + iz * N;
    const h = t.heightAt(x, z);
    const slope = 1 - t.normalAt(x, z).y;
    let k = K.GRASS;
    const rd = land.roadDist[i], vd = land.riverDist[i];
    const ds = Math.hypot(x - 200, z - 470);
    const dm = Math.hypot(x - 150, z + 300);
    if (dm < 62) k = K.PIT; else if (ds < 120) k = K.SALT; else if (vd < 7) k = K.WATER; else if (rd < 2.8) k = K.ROAD;
    else if (land.railDist[i] < 2) k = K.RAIL; else if (slope > 0.2) k = K.ROCK; else if (vd < 16) k = K.WOOD;
    else if (hash(ix >> 3, iz >> 3) < 0.07 && x > 120) k = K.WOOD;
    for (const S of SITES) { if (['town', 'safehouse', 'post', 'fort', 'granary', 'depot', 'village', 'pumps', 'observatory'].includes(S.kind) && Math.hypot(x - S.at[0], z - S.at[1]) < S.r * 0.55 && k !== K.WATER) k = K.DIRT; }
    kind[ix + iz * CELLS] = k;
    const j = hash(ix, iz), j2 = hash(ix + 77, iz - 31);
    let c;
    switch (k) {
      case K.ROAD: c = tmp.copy(pal.red).lerp(pal.plum, 0.25 + j * 0.2); break;
      case K.ROCK: c = tmp.copy(pal.plum).lerp(pal.slate, j * 0.5); break;
      case K.SALT: c = tmp.copy(pal.white).lerp(pal.mist, j * 0.5); break;
      case K.WATER: c = tmp.copy(pal.teal).lerp(pal.green, 0.3 + j * 0.3); break;
      case K.WOOD: c = tmp.copy(pal.green).lerp(pal.sand, 0.35 + j * 0.3); break;
      case K.DIRT: c = tmp.copy(pal.red).lerp(pal.orange, 0.4 + j * 0.4); break;
      case K.PIT: c = tmp.copy(pal.plum).lerp(pal.red, j * 0.5); break;
      case K.RAIL: c = tmp.copy(pal.plum).lerp(pal.slate, 0.5); break;
      default: c = tmp.copy(pal.sand).lerp(pal.orange, 0.25 + j * 0.5 + (h > 70 ? 0.1 : 0)); if (j2 > 0.93) c.lerp(pal.red, 0.3);
    }
    const b = 6 * (ix + iz * CELLS);
    for (let q = 0; q < 6; q++) col.setXYZ(b + q, c.r, c.g, c.b);
    baseCol[(ix + iz * CELLS) * 3] = c.r; baseCol[(ix + iz * CELLS) * 3 + 1] = c.g; baseCol[(ix + iz * CELLS) * 3 + 2] = c.b;
  }
  col.needsUpdate = true;
  if (ctx) { ctx.scene.add(t.mesh); t.attach(ctx.physics); t.mesh.receiveShadow = true; }
  return { t, kind, baseCol, col, pal };
}
