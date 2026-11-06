import { TUNING } from '../core/tuning.js';

/** 5 m cells over the 1280 m basin. Spread constant calibrated so a 5 m/s wind
 *  drives the head between 2 and 5 m/s and the flanks stay slower. */
export const FIRE_N = 256;
export const FIRE_CELL = 5;
export const FIRE_ORIGIN = -640;
const BASE_P = 0.011;

const NBR = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const FUEL_FACTOR = { 1: 1, 2: 0.8, 3: 0.6, 4: 0.4 };

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export class FireGrid {
  constructor(rng) {
    const n = FIRE_N * FIRE_N;
    this.rng = rng;
    this.fuel = new Uint8Array(n);
    this.state = new Uint8Array(n);
    this.burnEnd = new Float32Array(n);
    this.burntAt = new Float32Array(n);
    this.burning = [];
    this.burntList = [];
    this.time = 0;
    this.acc = 0;
    this.wind = { x: 1, z: 0, speed: 0 };
    this.rain = false;
    this.heightAt = () => 40;
    this.onBurnt = () => {};
    this.lastWindFactor = 1;
    this.burntCount = 0;
    this.litByPlayer = 0;
  }

  idx(ix, iz) {
    return ix + iz * FIRE_N;
  }

  cellAt(x, z) {
    const ix = Math.floor((x - FIRE_ORIGIN) / FIRE_CELL);
    const iz = Math.floor((z - FIRE_ORIGIN) / FIRE_CELL);
    if (ix < 0 || iz < 0 || ix >= FIRE_N || iz >= FIRE_N) return null;
    return { ix, iz, i: this.idx(ix, iz) };
  }

  center(ix, iz) {
    return [FIRE_ORIGIN + (ix + 0.5) * FIRE_CELL, FIRE_ORIGIN + (iz + 0.5) * FIRE_CELL];
  }

  /** 0 none, 1 grass, 2 scrub, 3 tree, 4 building. Roads, water, rock, salt stay 0. */
  setFuel(x, z, fuel) {
    const c = this.cellAt(x, z);
    if (!c) return;
    this.fuel[c.i] = fuel;
  }

  fill(fuel) {
    this.fuel.fill(fuel);
  }

  canBurn(i) {
    return this.fuel[i] > 0 && this.state[i] === 0;
  }

  ignite(x, z, radius = 0) {
    const c = this.cellAt(x, z);
    if (!c) return 0;
    const r = Math.max(0, radius);
    const reach = Math.ceil(r / FIRE_CELL);
    let n = 0;
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const ix = c.ix + dx;
        const iz = c.iz + dz;
        if (ix < 0 || iz < 0 || ix >= FIRE_N || iz >= FIRE_N) continue;
        if (r > 0) {
          const [cx, cz] = this.center(ix, iz);
          if (Math.hypot(cx - x, cz - z) > r + FIRE_CELL * 0.5) continue;
        }
        if (this.lightIndex(this.idx(ix, iz))) n++;
      }
    }
    return n;
  }

  lightIndex(i) {
    if (!this.canBurn(i)) return false;
    const fuel = this.fuel[i];
    const span = fuel === 1 ? 8 + this.rng.next() * 6
      : fuel === 2 ? 12 + this.rng.next() * 6
        : 30 + this.rng.next() * 10;
    this.state[i] = 1;
    this.burnEnd[i] = this.time + span;
    this.burning.push(i);
    return true;
  }

  /** Quiet story scar. Burns the strip immediately to state burnt. */
  burnStrip(points, width) {
    const half = width * 0.5;
    for (let i = 1; i < points.length; i++) {
      const [x0, z0] = points[i - 1];
      const [x1, z1] = points[i];
      const len = Math.hypot(x1 - x0, z1 - z0) || 1;
      const steps = Math.ceil(len / 4);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        const c = this.cellAt(x, z);
        if (!c) continue;
        const reach = Math.ceil(half / FIRE_CELL);
        for (let dz = -reach; dz <= reach; dz++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const ix = c.ix + dx;
            const iz = c.iz + dz;
            if (ix < 0 || iz < 0 || ix >= FIRE_N || iz >= FIRE_N) continue;
            const [cx, cz] = this.center(ix, iz);
            if (Math.hypot(cx - x, cz - z) > half) continue;
            const i = this.idx(ix, iz);
            if (this.fuel[i] === 0 || this.state[i] === 2 || this.state[i] === 3) continue;
            if (this.state[i] === 1 || this.state[i] === 0) this.markBurnt(i);
          }
        }
      }
    }
    this.burning = this.burning.filter((i) => this.state[i] === 1);
  }

  step(dt) {
    this.time += dt;
    this.acc += dt;
    let guard = 0;
    while (this.acc >= 0.25 && guard++ < 6) {
      this.acc -= 0.25;
      this.spread();
      this.regrow();
    }
  }

  markBurnt(i) {
    if (this.state[i] === 2 || this.state[i] === 3) return;
    this.state[i] = 2;
    this.burntAt[i] = this.time;
    this.burntCount++;
    this.burntList.push(i);
    const ix = i % FIRE_N;
    const iz = (i / FIRE_N) | 0;
    this.onBurnt(ix, iz, i);
  }

  spread() {
    const next = [];
    const wx = this.wind.x;
    const wz = this.wind.z;
    const wsp = this.wind.speed;
    const wlen = Math.hypot(wx, wz) || 1;
    const ux = wx / wlen;
    const uz = wz / wlen;
    const fresh = [];
    for (const i of this.burning) {
      if (this.state[i] !== 1) continue;
      if (this.time >= this.burnEnd[i]) {
        this.markBurnt(i);
        continue;
      }
      next.push(i);
      const ix = i % FIRE_N;
      const iz = (i / FIRE_N) | 0;
      const h = this.heightAt(...this.center(ix, iz));
      for (const [dx, dz] of NBR) {
        const nx = ix + dx;
        const nz = iz + dz;
        if (nx < 0 || nz < 0 || nx >= FIRE_N || nz >= FIRE_N) continue;
        const j = this.idx(nx, nz);
        if (!this.canBurn(j)) continue;
        const len = Math.hypot(dx, dz);
        const cos = (dx / len) * ux + (dz / len) * uz;
        const windFactor = clamp(1 + TUNING.windEffect * (wsp / 5) * 1.6 * cos, 0.15, 3.5);
        if (dx === 1 && dz === 0) this.lastWindFactor = windFactor;
        const nh = this.heightAt(...this.center(nx, nz));
        const slopeFactor = nh > h + 0.4 ? 1.4 : nh < h - 0.4 ? 0.7 : 1;
        const rainFactor = this.rain ? 0.15 : 1;
        const diag = dx !== 0 && dz !== 0 ? 1.41 : 1;
        const p = BASE_P * (FUEL_FACTOR[this.fuel[j]] || 0) * windFactor * slopeFactor * rainFactor * TUNING.fireSpread / diag;
        if (this.rng.next() < p) fresh.push(j);
      }
      if (wsp > 6 && this.rng.next() < 0.04 * TUNING.fireSpread) {
        const hop = 2 + (this.rng.next() < 0.5 ? 0 : 1);
        const ex = ix + Math.round(ux * hop);
        const ez = iz + Math.round(uz * hop);
        if (ex >= 0 && ez >= 0 && ex < FIRE_N && ez < FIRE_N) fresh.push(this.idx(ex, ez));
      }
    }
    this.burning = next;
    for (const j of fresh) this.lightIndex(j);
  }

  regrow() {
    if (TUNING.regrowHours <= 0 || this.burntList.length === 0) return;
    const keep = [];
    for (const i of this.burntList) {
      if (this.state[i] !== 2) continue;
      const ageH = (this.time - this.burntAt[i]) / 3600;
      if (ageH >= TUNING.regrowHours) {
        this.state[i] = 3;
        this.burntCount = Math.max(0, this.burntCount - 1);
      } else keep.push(i);
    }
    this.burntList = keep;
  }

  /** Day roll: regrowth becomes fresh fuel at half spread weight. */
  dayRoll() {
    for (let i = 0; i < this.state.length; i++) {
      if (this.state[i] === 3) {
        this.state[i] = 0;
        if (this.fuel[i] > 1) this.fuel[i] = 1;
      }
    }
  }

  extinguish() {
    for (const i of this.burning) {
      if (this.state[i] === 1) this.state[i] = 0;
    }
    this.burning.length = 0;
  }

  /** Run-length encode state for the save. */
  encode() {
    const out = [];
    let prev = this.state[0];
    let n = 1;
    for (let i = 1; i <= this.state.length; i++) {
      if (i < this.state.length && this.state[i] === prev && n < 65535) n++;
      else {
        out.push(prev, n);
        prev = this.state[i];
        n = 1;
      }
    }
    return out;
  }

  decode(runs) {
    this.state.fill(0);
    this.burning.length = 0;
    this.burntList.length = 0;
    this.burntCount = 0;
    let at = 0;
    for (let i = 0; i < runs.length; i += 2) {
      const v = runs[i];
      const n = runs[i + 1];
      for (let k = 0; k < n && at < this.state.length; k++, at++) this.state[at] = v;
    }
    for (let i = 0; i < this.state.length; i++) {
      if (this.state[i] === 1) this.burning.push(i);
      if (this.state[i] === 2) {
        this.burntCount++;
        this.burntList.push(i);
      }
    }
  }

  counts() {
    return { burning: this.burning.length, burnt: this.burntCount };
  }
}
