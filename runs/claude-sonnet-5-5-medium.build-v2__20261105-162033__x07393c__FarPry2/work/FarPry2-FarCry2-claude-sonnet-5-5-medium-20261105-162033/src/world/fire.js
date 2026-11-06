// The fire grid: 256 x 256 cells of 5 m. The game's signature system; written as data first (no meshes) so Node tests can run it.
import { TUNING } from '../core/tuning.js';
import { K, HALF, CELLS } from './terrain.js';

export const FN = 256, FCELL = 5;
export const FUEL = { NONE: 0, GRASS: 1, SCRUB: 2, TREE: 3, BUILDING: 4 };
export const ST = { FRESH: 0, BURNING: 1, BURNT: 2, REGROWING: 3 };
const FUEL_FACTOR = [0, 1, 0.8, 0.6, 0.4];
export const SPREAD_BASE = 0.016; // calibrated by tests/suites/systems.mjs (head 2-5 m/s at 5 m/s wind)
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export class FireGrid {
  constructor(rng) {
    this.rng = rng;
    this.fuel = new Uint8Array(FN * FN); this.state = new Uint8Array(FN * FN);
    this.burnEnd = new Float32Array(FN * FN); this.burntAt = new Float32Array(FN * FN);
    this.sparse = new Uint8Array(FN * FN);        // regrown at half density
    this.baseFuel = new Uint8Array(FN * FN);
    this.heights = null;                           // optional (x,z)=>y for slope
    this.burning = []; this.burntCount = 0; this.time = 0; this.hours = 0;
    this.wind = { dir: [1, 0], speed: 0 };
    this.rain = false;
    this.onBurn = null; this.onChange = null; this.litCells = 0;
    this.tick = 0;
  }
  /** build fuel from the terrain's 2.5 m category map */
  loadFuel(kind) {
    const bad = new Set([K.ROAD, K.WATER, K.ROCK, K.SALT, K.PIT, K.RAIL]);
    for (let fz = 0; fz < FN; fz++) for (let fx = 0; fx < FN; fx++) {
      let blocked = false, wood = 0, dirt = 0;
      for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
        const k = kind[(fx * 2 + dx) + (fz * 2 + dz) * CELLS];
        if (k === K.ROAD || k === K.WATER || k === K.SALT || k === K.PIT || k === K.RAIL) blocked = true;
        if (k === K.ROCK || k === K.DIRT) dirt++;
        if (k === K.WOOD) wood++;
      }
      const i = fx + fz * FN;
      this.baseFuel[i] = blocked || dirt >= 3 ? FUEL.NONE : wood >= 2 ? FUEL.SCRUB : FUEL.GRASS;
    }
    this.fuel.set(this.baseFuel);
  }
  cellOf(x, z) { return [Math.floor((x + HALF) / FCELL), Math.floor((z + HALF) / FCELL)]; }
  idx(fx, fz) { return fx >= 0 && fz >= 0 && fx < FN && fz < FN ? fx + fz * FN : -1; }
  at(x, z) { const [fx, fz] = this.cellOf(x, z); return this.idx(fx, fz); }
  stateAt(x, z) { const i = this.at(x, z); return i < 0 ? ST.FRESH : this.state[i]; }
  fuelAt(x, z) { const i = this.at(x, z); return i < 0 ? 0 : this.fuel[i]; }
  setFuel(x, z, f) { const i = this.at(x, z); if (i >= 0) { this.fuel[i] = f; this.baseFuel[i] = f; } }
  cellCenter(i) { return [-HALF + (i % FN + 0.5) * FCELL, -HALF + (Math.floor(i / FN) + 0.5) * FCELL]; }
  /** the only way in */
  ignite(x, z, radius = 2) {
    const [cx, cz] = this.cellOf(x, z); const r = Math.max(0, Math.ceil(radius / FCELL));
    let n = 0;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > r * r + 0.5 && !(dx === 0 && dz === 0)) continue;
      n += this.lightCell(cx + dx, cz + dz) ? 1 : 0;
    }
    return n;
  }
  lightCell(fx, fz) {
    const i = this.idx(fx, fz); if (i < 0) return false;
    if (this.state[i] !== ST.FRESH || this.fuel[i] === FUEL.NONE) return false;
    if (this.rain && this.rng.chance(0.85)) return false;
    this.state[i] = ST.BURNING;
    const f = this.fuel[i];
    const [a, b] = f === FUEL.GRASS ? [8, 14] : f === FUEL.SCRUB ? [12, 18] : [30, 40];
    this.burnEnd[i] = this.time + this.rng.range(a, b);
    this.burning.push(i);
    this.onChange?.(i, ST.BURNING);
    return true;
  }
  /** quietly burn a polyline strip (story scars) */
  burnStrip(pts, width) {
    let n = 0;
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, az] = pts[s], [bx, bz] = pts[s + 1]; const len = Math.hypot(bx - ax, bz - az), steps = Math.ceil(len / 2.5);
      for (let k = 0; k <= steps; k++) {
        const x = ax + (bx - ax) * k / steps, z = az + (bz - az) * k / steps;
        const [cx, cz] = this.cellOf(x, z), r = Math.ceil(width / 2 / FCELL);
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const i = this.idx(cx + dx, cz + dz); if (i >= 0 && this.fuel[i] && this.state[i] === ST.FRESH) { this.setBurnt(i); n++; } }
      }
    }
    return n;
  }
  setBurnt(i) { this.state[i] = ST.BURNT; this.burntAt[i] = this.hours; this.burntCount++; this.onChange?.(i, ST.BURNT); }
  windFactor(dx, dz) {
    const len = Math.hypot(dx, dz) || 1;
    const cos = (dx * this.wind.dir[0] + dz * this.wind.dir[1]) / len;
    return Math.max(0.15, Math.min(3.5, 1 + TUNING.windEffect * (this.wind.speed / 5) * 1.6 * cos));
  }
  slopeFactor(i, j) {
    if (!this.heights) return 1;
    const [ax, az] = this.cellCenter(i), [bx, bz] = this.cellCenter(j);
    const d = this.heights(bx, bz) - this.heights(ax, az);
    return d > 0.4 ? 1.4 : d < -0.4 ? 0.7 : 1;
  }
  /** one 4 Hz tick */
  step(dt = 0.25) {
    this.time += dt; this.tick++;
    const rain = this.rain ? 0.15 : 1, spread = TUNING.fireSpread;
    const list = this.burning, next = [];
    const strong = this.wind.speed > 6;
    for (let n = 0; n < list.length; n++) {
      const i = list[n]; const fx = i % FN, fz = (i / FN) | 0;
      for (let d = 0; d < 8; d++) {
        const [dx, dz] = DIRS[d]; const j = this.idx(fx + dx, fz + dz);
        if (j < 0 || this.state[j] !== ST.FRESH || this.fuel[j] === FUEL.NONE) continue;
        let p = SPREAD_BASE * FUEL_FACTOR[this.fuel[j]] * this.windFactor(dx, dz) * this.slopeFactor(i, j) * rain * spread;
        if (d >= 4) p /= 1.41;
        if (this.rng.next() < p) this.lightCell(fx + dx, fz + dz);
      }
      if (strong && this.rng.next() < 0.012 * (this.wind.speed - 6)) {
        const k = 2 + (this.rng.next() < 0.5 ? 0 : 1);
        const ex = Math.round(this.wind.dir[0] * k), ez = Math.round(this.wind.dir[1] * k);
        this.lightCell(fx + ex, fz + ez);
      }
      if (this.time >= this.burnEnd[i]) { this.setBurnt(i); } else next.push(i);
    }
    // new cells lit during the loop were pushed on this.burning; merge
    const lit = this.burning.slice(list.length);
    this.burning = next.concat(lit.filter((i) => this.state[i] === ST.BURNING));
    if (this.rain && this.rng.next() < 0.1) { /* rain damps: handled by rainFactor */ }
  }
  /** game-time hours: regrowth and renewal */
  hourTick(hours, regrowHours = TUNING.regrowHours) {
    this.hours = hours;
    if (this.tick - (this.lastRegrow || -99) < 40) return; this.lastRegrow = this.tick;
    for (let i = 0; i < FN * FN; i++) {
      const s = this.state[i]; if (s === ST.BURNT && hours - this.burntAt[i] >= regrowHours) { this.state[i] = ST.REGROWING; this.burntAt[i] = hours; this.onChange?.(i, ST.REGROWING); }
      else if (s === ST.REGROWING && hours - this.burntAt[i] >= 24) { this.state[i] = ST.FRESH; this.sparse[i] = 1; this.onChange?.(i, ST.FRESH); }
    }
  }
  counts() { let burnt = 0, regrowing = 0; for (let i = 0; i < FN * FN; i++) { if (this.state[i] === ST.BURNT) burnt++; else if (this.state[i] === ST.REGROWING) regrowing++; } return { burning: this.burning.length, burnt, regrowing }; }
  hectares() { return this.counts().burnt * 0.0025 * (FCELL * FCELL / 25); }
  reset() {
    this.state.fill(0); this.sparse.fill(0); this.burnEnd.fill(0); this.burntAt.fill(0); this.fuel.set(this.baseFuel);
    this.burning = []; this.burntCount = 0; this.time = 0; this.tick = 0;
    this.onChange?.(-1, 0);
  }
  /** run-length encoded state for saves */
  save() {
    const out = []; let cur = this.state[0], run = 0;
    for (let i = 0; i < FN * FN; i++) { if (this.state[i] === cur) run++; else { out.push(cur, run); cur = this.state[i]; run = 1; } }
    out.push(cur, run);
    return { rle: out, sparse: Array.from(this.sparse.slice(0, 0)) };
  }
  load(data) {
    this.state.fill(0); this.burning = []; let p = 0;
    for (let k = 0; k < data.rle.length; k += 2) { const v = data.rle[k], n = data.rle[k + 1]; for (let q = 0; q < n; q++) this.state[p++] = v; }
    for (let i = 0; i < FN * FN; i++) { if (this.state[i] === ST.BURNING) { this.state[i] = ST.BURNT; } if (this.state[i] === ST.BURNT || this.state[i] === ST.REGROWING) this.burntAt[i] = this.hours; }
    this.onChange?.(-1, 0);
  }
}
