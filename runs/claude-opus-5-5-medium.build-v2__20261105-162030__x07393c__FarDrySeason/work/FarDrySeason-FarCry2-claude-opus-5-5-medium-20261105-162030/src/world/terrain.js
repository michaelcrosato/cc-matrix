// The Kettle: one continuous 1280 x 1280 m terrain (section 5), its ground kinds, colours and fuel.
import { createNoise, Terrain, THREE, toonMaterial } from '../../pixel-engine.js';
import { BRIDGES, FORD, RAIL_SPUR, RAILWAY, RIVER, ROADS } from '../content/roads.js';
import { SITES, siteById } from '../content/sites.js';
import { clamp, lerp, polyDist, segDist, smooth } from './geom.js';
import { FIRE_N, FUEL } from './fire.js';

export const SIZE = 1280, CELLS = 512, CELL = 2.5, HALF = 640, POINTS = CELLS + 1;
export const WATER_Y = 35.5;
export const KIND = { GRASS: 0, DIRT: 1, ROCK: 2, SALT: 3, BANK: 4, WOOD: 5, WATER: 6, ROAD: 7, CROP: 8 };
const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const TINT = { sand: C(0xffcd75), orange: C(0xef7d57), red: C(0xb13e53), plum: C(0x5d275d), mist: C(0x94b0c2), white: C(0xf4f4f4), green: C(0x38b764), lime: C(0xa7f070), teal: C(0x257179), ink: C(0x1a1c2c), night: C(0x333c57), slate: C(0x566c86) };
export { TINT };

export class Land {
  constructor(seed = 7) { this.noise = createNoise(seed); this.seed = seed; }
  /** Builds heights, kinds and colours. Everything here is plain arrays; the mesh comes from Terrain. */
  build(ctx) {
    const H = this.buildHeights();
    this.land = new Terrain({ size: [SIZE, SIZE], cells: [CELLS, CELLS], bands: [{ below: 1000, color: 0xef7d57 }], steep: 0.5, rock: 0x5d275d });
    this.land.generate((x, z) => H[this.pi(x) + this.pi(z) * POINTS]);
    this.land.attach(ctx.physics);
    this.land.mesh.castShadow = false; this.land.mesh.receiveShadow = true;
    ctx.scene.add(this.land.mesh);
    this.colors = this.land.mesh.geometry.getAttribute('color');
    this.buildKinds();
    this.paintAll();
  }
  pi(v) { return clamp(Math.round((v + HALF) / CELL), 0, CELLS); }
  heightAt(x, z) { return this.land.heightAt(x, z); }
  buildHeights() {
    const n = this.noise, H = new Float32Array(POINTS * POINTS);
    const P = (i) => -HALF + i * CELL;
    // Distance to the river, for the valley it has cut.
    const riverD = new Float32Array(POINTS * POINTS).fill(1e6);
    this.rasterPoly(RIVER, 110, (ix, iz, d) => { const k = ix + iz * POINTS; if (d < riverD[k]) riverD[k] = d; });
    this.riverD = riverD;
    for (let iz = 0; iz < POINTS; iz++) for (let ix = 0; ix < POINTS; ix++) {
      const x = P(ix), z = P(iz), k = ix + iz * POINTS;
      let h = 40 + 14 * n.fbm2(x * 0.0032, z * 0.0032) + 2.5 * n.fbm2(x * 0.02, z * 0.02);
      // North ridge
      const rd = Math.hypot(x + 130, z + 520);
      if (rd < 300) h += 42 * smooth(1 - rd / 300) * (0.55 + 0.45 * n.ridged2(x * 0.012, z * 0.012));
      // West escarpment, cut by the Pass
      if (x < -480) { const cut = smooth(1 - Math.hypot(x + 590, (z + 430) * 0.8) / 90); h += 30 * smooth((-480 - x) / 60) * (1 - cut); }
      // Salt pan
      const sd = Math.hypot(x - 200, z - 470);
      if (sd < 190) h = lerp(36, h, smooth((sd - 150) / 40));
      // River valley: a flat, slow river with banks at a steady height.
      const d = riverD[k];
      if (d < 110) { const bank = lerp(38.2, h, smooth((d - 10) / 100)); h = d < 10 ? lerp(WATER_Y - 1, 38.2, smooth((d - 5) / 5)) : bank; }
      H[k] = h;
    }
    // The ford is a shallow bar.
    this.stamp(H, FORD[0], FORD[1], 16, 14, WATER_Y - 0.25);
    // Flatten sites (radial falloff).
    this.siteY = {};
    for (const s of SITES) {
      if (s.id === 'the-cut') continue;
      const y = s.id === 'salt-pan' ? 36 : H[this.pi(s.at[0]) + this.pi(s.at[1]) * POINTS];
      const sy = Math.max(y, WATER_Y + 2.2);
      this.siteY[s.id] = sy;
      this.stamp(H, s.at[0], s.at[1], s.r + (s.crop ? 110 : 6), 26, sy);
    }
    // The mine: a terraced pit at the Cut.
    const py = H[this.pi(150) + this.pi(-300) * POINTS];
    for (let iz = 0; iz < POINTS; iz++) for (let ix = 0; ix < POINTS; ix++) {
      const d = Math.hypot(P(ix) - 150, P(iz) + 300);
      if (d < 150) {
        const k = ix + iz * POINTS, rim = lerp(py, H[k], smooth((d - 90) / 60));
        H[k] = d < 70 ? py - 24 * (1 - Math.floor((d / 70) * 5) / 5) : rim;
      }
    }
    this.pitY = py;
    this.siteY['the-cut'] = py;
    // Roads: follow a smoothed copy of the ground, 5 m wide with a 3 m shoulder, never filling the river.
    this.roadMask = new Uint8Array(POINTS * POINTS);
    for (const pts of Object.values(ROADS)) this.stampRoad(H, pts, 2.5, 3);
    this.railMask = new Uint8Array(POINTS * POINTS);
    this.railHeight = (x, z) => H[this.pi(x) + this.pi(z) * POINTS];
    for (const pts of [RAILWAY, RAIL_SPUR]) this.stampRoad(H, pts, 2.2, 4, true);
    this.H = H;
    return H;
  }
  rasterPoly(pts, width, fn) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const x0 = this.pi(Math.min(ax, bx) - width), x1 = this.pi(Math.max(ax, bx) + width), z0 = this.pi(Math.min(az, bz) - width), z1 = this.pi(Math.max(az, bz) + width);
      for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) { const d = segDist(-HALF + ix * CELL, -HALF + iz * CELL, ax, az, bx, bz); if (d <= width) fn(ix, iz, d); }
    }
  }
  stamp(H, x, z, r, fall, y) {
    const R = r + fall, x0 = this.pi(x - R), x1 = this.pi(x + R), z0 = this.pi(z - R), z1 = this.pi(z + R);
    for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
      const d = Math.hypot(-HALF + ix * CELL - x, -HALF + iz * CELL - z);
      if (d < R) { const k = ix + iz * POINTS; if (this.riverD[k] < 12 && Math.hypot(x - FORD[0], z - FORD[1]) > 30) continue; H[k] = lerp(y, H[k], smooth((d - r) / fall)); }
    }
  }
  nearCrossing(x, z, r = 16) { for (const b of BRIDGES) if (Math.hypot(b.at[0] - x, b.at[1] - z) < r) return b; return null; }
  stampRoad(H, pts, half, shoulder, rail = false) {
    // Smooth height profile along the polyline.
    const samples = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 5));
      for (let s = 0; s <= n; s++) { const x = ax + ((bx - ax) * s) / n, z = az + ((bz - az) * s) / n; samples.push({ x, z, y: Math.max(H[this.pi(x) + this.pi(z) * POINTS], WATER_Y + 2.4) }); }
    }
    for (let pass = 0; pass < 8; pass++) for (let i = 1; i + 1 < samples.length; i++) samples[i].y = (samples[i - 1].y + samples[i].y * 2 + samples[i + 1].y) / 4;
    for (let i = 0; i + 1 < samples.length; i++) {
      const a = samples[i], b = samples[i + 1], R = half + shoulder;
      const x0 = this.pi(Math.min(a.x, b.x) - R), x1 = this.pi(Math.max(a.x, b.x) + R), z0 = this.pi(Math.min(a.z, b.z) - R), z1 = this.pi(Math.max(a.z, b.z) + R);
      for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
        const x = -HALF + ix * CELL, z = -HALF + iz * CELL, k = ix + iz * POINTS;
        const d = segDist(x, z, a.x, a.z, b.x, b.z);
        if (d > R) continue;
        const isFord = Math.hypot(x - FORD[0], z - FORD[1]) < 22;
        if (this.riverD[k] < 11 && !isFord) continue; // a bridge spans this
        if (isFord) { if (d <= half) (rail ? this.railMask : this.roadMask)[k] = 1; continue; }
        H[k] = lerp((a.y + b.y) / 2, H[k], smooth((d - half) / shoulder));
        if (d <= half) (rail ? this.railMask : this.roadMask)[k] = 1;
      }
    }
  }
  buildKinds() {
    const n = this.noise, kinds = new Uint8Array(CELLS * CELLS), land = this.land;
    const siteDirt = [];
    for (const s of SITES) if (s.kind !== 'open' && s.kind !== 'field' && s.kind !== 'mine') siteDirt.push([s.at[0], s.at[1], s.r * 0.72]);
    siteDirt.push([150, -300, 92]);
    const salt = siteById['salt-pan'].at;
    const field = siteById['long-field'];
    for (let iz = 0; iz < CELLS; iz++) for (let ix = 0; ix < CELLS; ix++) {
      const x = -HALF + (ix + 0.5) * CELL, z = -HALF + (iz + 0.5) * CELL, k = ix + iz * CELLS, pk = ix + iz * POINTS, H = this.H;
      const h = (H[pk] + H[pk + 1] + H[pk + POINTS] + H[pk + POINTS + 1]) / 4;
      const slope = Math.max(Math.abs(H[pk] - H[pk + 1]), Math.abs(H[pk] - H[pk + POINTS])) / CELL;
      const rd = this.riverD[pk];
      let kind = KIND.GRASS;
      if (x > 60 && x < 640 && z > -300 && z < 240 && n.fbm2(x * 0.008 + 9, z * 0.008) > 0.02) kind = KIND.WOOD;
      if (rd < 26) kind = KIND.BANK;
      if (h < WATER_Y + 0.3 && rd < 13) kind = KIND.WATER;
      if (Math.hypot(x - salt[0], z - salt[1]) < 150 + 8 * n.fbm2(x * 0.05, z * 0.05)) kind = KIND.SALT;
      if (Math.abs(x - field.at[0]) < 90 && Math.abs(z - field.at[1]) < 60) kind = KIND.CROP;
      if (slope > 0.75 || (h > 62 && slope > 0.3)) kind = KIND.ROCK;
      for (const [sx, sz, r] of siteDirt) if (Math.abs(x - sx) < r && Math.abs(z - sz) < r && Math.hypot(x - sx, z - sz) < r + 3 * n.fbm2(x * 0.1, z * 0.1)) { kind = kind === KIND.ROCK ? kind : KIND.DIRT; break; }
      if (this.roadMask[pk] || this.railMask[pk]) kind = KIND.ROAD;
      kinds[k] = kind;
    }
    this.kinds = kinds;
    // Base colours, one per cell, stored for scars and regrowth.
    const base = new Float32Array(CELLS * CELLS * 3), sp = n;
    for (let iz = 0; iz < CELLS; iz++) for (let ix = 0; ix < CELLS; ix++) {
      const x = -HALF + (ix + 0.5) * CELL, z = -HALF + (iz + 0.5) * CELL, k = ix + iz * CELLS;
      const v = sp.fbm2(x * 0.09, z * 0.09), w = sp.fbm2(x * 0.5, z * 0.5);
      let c, a = null, t = 0;
      switch (kinds[k]) {
        case KIND.GRASS: c = TINT.orange; a = TINT.sand; t = 0.55 + v * 0.7; break;
        case KIND.CROP: c = TINT.sand; a = TINT.orange; t = 0.25 + w * 0.5; break;
        case KIND.WOOD: c = TINT.orange; a = TINT.green; t = 0.28 + v * 0.5; break;
        case KIND.BANK: c = TINT.green; a = TINT.sand; t = 0.3 + v * 0.6; break;
        case KIND.ROCK: c = TINT.plum; a = TINT.slate; t = 0.35 + w * 0.7; break;
        case KIND.SALT: c = TINT.white; a = TINT.mist; t = 0.3 + v * 0.8; break;
        case KIND.WATER: c = TINT.teal; a = TINT.navy ?? TINT.night; t = 0.3; break;
        case KIND.ROAD: c = TINT.red; a = TINT.plum; t = 0.1 + w * 0.3; break;
        default: c = TINT.red; a = TINT.orange; t = 0.25 + v * 0.5; break;
      }
      t = clamp(t, 0, 1);
      base[k * 3] = lerp(c[0], a[0], t); base[k * 3 + 1] = lerp(c[1], a[1], t); base[k * 3 + 2] = lerp(c[2], a[2], t);
    }
    this.base = base;
  }
  paintCell(ix, iz, r, g, b) {
    const arr = this.colors.array, start = 6 * (ix + iz * CELLS) * 3;
    for (let v = 0; v < 6; v++) { arr[start + v * 3] = r; arr[start + v * 3 + 1] = g; arr[start + v * 3 + 2] = b; }
  }
  paintAll() { const b = this.base; for (let iz = 0; iz < CELLS; iz++) for (let ix = 0; ix < CELLS; ix++) { const k = (ix + iz * CELLS) * 3; this.paintCell(ix, iz, b[k], b[k + 1], b[k + 2]); } this.colors.needsUpdate = true; }
  kindAt(x, z) { const ix = Math.floor((x + HALF) / CELL), iz = Math.floor((z + HALF) / CELL); return ix < 0 || iz < 0 || ix >= CELLS || iz >= CELLS ? KIND.ROCK : this.kinds[ix + iz * CELLS]; }
  /** Water depth at a point; 0 on land. */
  waterDepth(x, z) { const h = this.heightAt(x, z); return h < WATER_Y ? WATER_Y - h : 0; }
  /** A fire cell (5 m) covers four terrain cells. */
  paintFireCell(i, mode, rng) {
    const fx = i % FIRE_N, fz = (i / FIRE_N) | 0;
    for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
      const ix = fx * 2 + dx, iz = fz * 2 + dz; if (ix >= CELLS || iz >= CELLS) continue;
      const k = (ix + iz * CELLS) * 3, b = this.base;
      if (mode === 'fresh') this.paintCell(ix, iz, b[k], b[k + 1], b[k + 2]);
      else if (mode === 'burnt') { const c = [TINT.ink, TINT.night, TINT.slate][rng.next() < 0.55 ? 0 : rng.next() < 0.75 ? 1 : 2]; this.paintCell(ix, iz, c[0], c[1], c[2]); }
      else if (mode === 'green') { const c = rng.next() < 0.7 ? TINT.green : TINT.lime; this.paintCell(ix, iz, c[0], c[1], c[2]); }
      else if (mode === 'burning') this.paintCell(ix, iz, TINT.ink[0], TINT.ink[1], TINT.ink[2]);
    }
  }
  /** Fuel map per fire cell from the ground kinds. */
  fuelInto(fire) {
    for (let fz = 0; fz < FIRE_N; fz++) for (let fx = 0; fx < FIRE_N; fx++) {
      const cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) cnt[this.kinds[fx * 2 + dx + (fz * 2 + dz) * CELLS]]++;
      const i = fx + fz * FIRE_N;
      const none = cnt[KIND.ROAD] + cnt[KIND.WATER] + cnt[KIND.ROCK] + cnt[KIND.SALT] + cnt[KIND.DIRT];
      fire.baseFuel[i] = none >= 1 ? FUEL.NONE : cnt[KIND.WOOD] >= 2 ? FUEL.SCRUB : FUEL.GRASS;
      fire.height[i] = this.H[fx * 2 + 1 + (fz * 2 + 1) * POINTS];
      fire.noAge[i] = cnt[KIND.CROP] >= 2 ? 1 : 0;
    }
    fire.fuel.set(fire.baseFuel);
  }
}
export { toonMaterial, polyDist };
