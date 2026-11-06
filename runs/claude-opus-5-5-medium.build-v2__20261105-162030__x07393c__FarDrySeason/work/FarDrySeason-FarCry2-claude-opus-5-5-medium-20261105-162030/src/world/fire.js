// The game's signature system: a 5 m fire grid. Pure data, no three.js, so it runs anywhere at any speed.
import { TUNING } from '../core/tuning.js';
export const FIRE_N = 256, FIRE_CELL = 5, FIRE_ORIGIN = -640;
export const FUEL = { NONE: 0, GRASS: 1, SCRUB: 2, TREE: 3, BUILDING: 4 };
export const FRESH = 0, BURNING = 1, BURNT = 2, REGROWING = 3;
const FUEL_FACTOR = [0, 1, 0.8, 0.6, 0.4];
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export const fireIndex = (x, z) => { const ix = Math.floor((x - FIRE_ORIGIN) / FIRE_CELL), iz = Math.floor((z - FIRE_ORIGIN) / FIRE_CELL); return ix < 0 || iz < 0 || ix >= FIRE_N || iz >= FIRE_N ? -1 : ix + iz * FIRE_N; };
export const cellX = (i) => FIRE_ORIGIN + ((i % FIRE_N) + 0.5) * FIRE_CELL;
export const cellZ = (i) => FIRE_ORIGIN + (Math.floor(i / FIRE_N) + 0.5) * FIRE_CELL;
export class FireGrid {
  fuel = new Uint8Array(FIRE_N * FIRE_N);
  baseFuel = new Uint8Array(FIRE_N * FIRE_N);
  height = new Float32Array(FIRE_N * FIRE_N);
  state = new Uint8Array(FIRE_N * FIRE_N);
  burnEnd = new Float32Array(FIRE_N * FIRE_N);
  /** How far a fire has walked from its match. It tires: a field burns, a whole country doesn't. */
  gen = new Uint8Array(FIRE_N * FIRE_N);
  noAge = new Uint8Array(FIRE_N * FIRE_N);
  burntAt = new Float32Array(FIRE_N * FIRE_N);
  burning = [];
  burntList = [];
  burntCount = 0;
  litCount = 0;
  /** Set by the world: called for every change of a cell's state. */
  onChange = null;
  time = 0;
  ticks = 0;
  /** A client in a shared round only shows what the host tells it. */
  visualOnly = false;
  wind = { x: 0, z: 0, speed: 0 };
  raining = false;
  constructor(rng) { this.rng = rng; }
  setCell(i, s) { const was = this.state[i]; if (was === s) return; this.state[i] = s; if (s === BURNT && was !== BURNT) this.burntCount++; if (was === BURNT && s !== BURNT) this.burntCount--; this.onChange?.(i, s, was); }
  light(i, by, gen = 0) {
    if (this.visualOnly || i < 0 || this.state[i] !== FRESH || !this.fuel[i]) return false;
    const f = this.fuel[i];
    const r = this.rng;
    const t = f === FUEL.GRASS ? r.range(8, 14) : f === FUEL.SCRUB ? r.range(12, 18) : r.range(30, 40);
    this.burnEnd[i] = this.time + t;
    this.gen[i] = gen;
    this.setCell(i, BURNING);
    this.burning.push(i);
    this.litCount++;
    if (by !== undefined) this.lastBy = by;
    return true;
  }
  /** The only way in. */
  ignite(x, z, radius = 3, by) {
    let n = 0;
    const r = Math.max(radius, 0.1);
    for (let dz = -r; dz <= r; dz += FIRE_CELL) for (let dx = -r; dx <= r; dx += FIRE_CELL) if (dx * dx + dz * dz <= r * r + 1) n += this.light(fireIndex(x + dx, z + dz), by) ? 1 : 0;
    if (!n) n += this.light(fireIndex(x, z), by) ? 1 : 0;
    return n;
  }
  /** Burns a named strip at once, quietly. Story scars. */
  burnStrip(points, width) {
    let n = 0;
    for (let k = 0; k + 1 < points.length; k++) {
      const [ax, az] = points[k], [bx, bz] = points[k + 1], len = Math.hypot(bx - ax, bz - az), steps = Math.ceil(len / 2.5);
      for (let s = 0; s <= steps; s++) {
        const x = ax + ((bx - ax) * s) / steps, z = az + ((bz - az) * s) / steps;
        for (let w = -width / 2; w <= width / 2; w += 2.5) {
          const nx = -(bz - az) / len, nz = (bx - ax) / len, i = fireIndex(x + nx * w, z + nz * w);
          if (i >= 0 && this.state[i] !== BURNT) { if (this.state[i] === BURNING) this.burnEnd[i] = this.time; else { this.burntAt[i] = this.time; this.setCell(i, BURNT); this.burntList.push(i); n++; } }
        }
      }
    }
    return n;
  }
  /** 4 Hz. `gameHours` is the clock in game hours so regrowth follows the day. */
  tick(dtSec, gameHours) {
    this.time += dtSec;
    this.ticks++;
    this.gameHours = gameHours;
    if (this.visualOnly) return;
    const r = this.rng, st = this.state, fuel = this.fuel, H = this.height;
    const wind = this.wind, wl = Math.hypot(wind.x, wind.z) || 1, wx = wind.x / wl, wz = wind.z / wl;
    const rain = this.raining ? 0.15 : 1, spread = TUNING.fireSpread, we = TUNING.windEffect * (wind.speed / 5) * 1.6;
    const count = this.burning.length;
    for (let k = 0; k < count; k++) {
      const i = this.burning[k];
      const ix = i % FIRE_N, iz = (i / FIRE_N) | 0;
      for (let n = 0; n < 8; n++) {
        const jx = ix + NB[n][0], jz = iz + NB[n][1];
        if (jx < 0 || jz < 0 || jx >= FIRE_N || jz >= FIRE_N) continue;
        const j = jx + jz * FIRE_N;
        if (st[j] !== FRESH || !fuel[j]) continue;
        const diag = n >= 4, l = diag ? 1.414 : 1;
        const cos = (NB[n][0] * wx + NB[n][1] * wz) / l;
        const wf = Math.max(0.15, Math.min(3.5, 1 + we * cos));
        const slope = H[j] > H[i] + 0.25 ? 1.4 : H[j] < H[i] - 0.25 ? 0.7 : 1;
        let p = 0.02 * FUEL_FACTOR[fuel[j]] * wf * slope * rain * spread;
        if (diag) p /= 1.41;
        const g = this.gen[i], age = this.noAge[j] ? 1 : Math.min(1, 1.6 - g / 25);
        if (age > 0 && r.next() < p * age) this.light(j, undefined, this.noAge[j] ? 0 : Math.min(255, g + 1));
      }
      if (wind.speed > 6 && r.next() < 0.006 * spread * rain) {
        const d = 2 + (r.next() < 0.5 ? 0 : 1), tx = ix + Math.round(wx * d), tz = iz + Math.round(wz * d);
        if (tx >= 0 && tz >= 0 && tx < FIRE_N && tz < FIRE_N && this.gen[i] < 30) this.light(tx + tz * FIRE_N, undefined, this.gen[i] + 3);
      }
    }
    // Burn out. Burnt land can't burn again: that is mechanics and plot at once.
    for (let k = this.burning.length - 1; k >= 0; k--) {
      const i = this.burning[k];
      if (this.time >= this.burnEnd[i]) {
        this.burning[k] = this.burning[this.burning.length - 1];
        this.burning.pop();
        this.burntAt[i] = gameHours;
        this.setCell(i, BURNT);
        this.burntList.push(i);
      }
    }
    // Regrowth: green comes back faster than the people.
    if (this.ticks % 16 === 0 && this.burntList.length) {
      const regrow = TUNING.regrowHours;
      for (let k = this.burntList.length - 1; k >= 0; k--) {
        const i = this.burntList[k];
        if (gameHours - this.burntAt[i] >= regrow) { this.burntList[k] = this.burntList[this.burntList.length - 1]; this.burntList.pop(); this.setCell(i, REGROWING); }
      }
    }
  }
  /** At a day-roll or a save, new growth becomes fuel again, at half density. */
  rollRegrowth() {
    const st = this.state;
    for (let i = 0; i < st.length; i++) if (st[i] === REGROWING) { this.setCell(i, FRESH); if (i % 2) this.fuel[i] = 0; else this.fuel[i] = FUEL.GRASS; }
  }
  extinguish() { for (const i of this.burning) { this.burntAt[i] = this.gameHours ?? 0; this.setCell(i, BURNT); this.burntList.push(i); } this.burning.length = 0; }
  regrowAll() { for (let i = 0; i < this.state.length; i++) if (this.state[i] === BURNT || this.state[i] === REGROWING) this.setCell(i, FRESH); this.burntList.length = 0; this.fuel.set(this.baseFuel); this.burning.forEach((i) => this.setCell(i, FRESH)); this.burning.length = 0; }
  reset() { this.regrowAll(); this.burntCount = 0; this.litCount = 0; this.time = 0; }
  isBurning(x, z) { const i = fireIndex(x, z); return i >= 0 && this.state[i] === BURNING; }
  burnableAt(x, z) { const i = fireIndex(x, z); return i >= 0 && this.state[i] === FRESH && this.fuel[i] > 0; }
  hectares() { return this.burntCount * 0.0025; }
  /** Run-length state for the save file: [state, count, state, count...]. */
  encode() {
    const out = [], st = this.state; let v = st[0], n = 0;
    for (let i = 0; i < st.length; i++) { const s = st[i] === BURNING ? BURNT : st[i]; if (i === 0) v = s; if (s === v) n++; else { out.push(v, n); v = s; n = 1; } }
    out.push(v, n);
    return out;
  }
  decode(rle, gameHours = 0) {
    this.regrowAll();
    let i = 0;
    for (let k = 0; k < rle.length; k += 2) { const s = rle[k]; for (let n = rle[k + 1]; n > 0; n--, i++) if (s !== FRESH) { this.burntAt[i] = gameHours; this.setCell(i, s); if (s === BURNT) this.burntList.push(i); } }
  }
}
