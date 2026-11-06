// The game's signature: a 256 x 256 grid of 5 m cells. Data here, pictures elsewhere (world/fireview.js).
// ignite() is the only way in. Burnt land cannot burn again: that is mechanics and plot at once.
import { TUNING } from '../core/tuning.js';
import { K, HALF, CELLS } from './ground.js';
import { clamp, hash2, lerp } from '../core/rng.js';
import { distToSegment } from './ground.js';

export const FN = 256;
export const FCELL = 5;
export const F = { NONE: 0, GRASS: 1, SCRUB: 2, TREE: 3, BUILDING: 4 };
export const S = { FRESH: 0, BURNING: 1, BURNT: 2, REGROW: 3 };
const FUEL_FACTOR = [0, 1, 0.8, 0.6, 0.4];
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export class FireGrid {
  fuel = new Uint8Array(FN * FN);
  baseFuel = new Uint8Array(FN * FN);
  state = new Uint8Array(FN * FN);
  burnEnd = new Float32Array(FN * FN);
  burntAt = new Float32Array(FN * FN);
  height = new Float32Array(FN * FN);
  burning = [];
  burntList = [];
  clusters = new Map(); // tile id -> burning cell count
  counts = { burning: 0, burnt: 0, lit: 0 };
  clock = 0;
  tickN = 0;
  raining = false;
  // Hooks the world sets. Called on state changes; they never decide anything.
  onIgnite = null; onBurnt = null; onRegrow = null; onFresh = null;

  constructor(ground, rng) {
    this.ground = ground;
    this.rng = rng;
    this.bakeFuel();
  }
  cellOf(x, z) { return { cx: clamp(Math.floor((x + HALF) / FCELL), 0, FN - 1), cz: clamp(Math.floor((z + HALF) / FCELL), 0, FN - 1) }; }
  idOf(x, z) { const cx = Math.floor((x + HALF) / FCELL), cz = Math.floor((z + HALF) / FCELL); return cx < 0 || cz < 0 || cx >= FN || cz >= FN ? -1 : cx + cz * FN; }
  cx(id) { return id % FN; }
  cz(id) { return (id / FN) | 0; }
  wx(id) { return (id % FN) * FCELL - HALF + FCELL / 2; }
  wz(id) { return ((id / FN) | 0) * FCELL - HALF + FCELL / 2; }
  bakeFuel() {
    const g = this.ground;
    for (let cz = 0; cz < FN; cz++) for (let cx = 0; cx < FN; cx++) {
      const id = cx + cz * FN;
      const x = cx * FCELL - HALF + FCELL / 2, z = cz * FCELL - HALF + FCELL / 2;
      this.height[id] = g.sampleH(x, z);
      // A fire cell takes the fuel the most of its four terrain cells have.
      let grass = 0, scrub = 0;
      for (const dx of [-1.25, 1.25]) for (const dz of [-1.25, 1.25]) {
        const k = g.kindAt(x + dx, z + dz);
        if (k === K.GRASS || k === K.CROP || k === K.BANK) grass++;
        else if (k === K.WOOD) scrub++;
      }
      this.baseFuel[id] = grass + scrub < 3 ? F.NONE : (scrub > grass ? F.SCRUB : F.GRASS);
    }
    this.fuel.set(this.baseFuel);
  }
  setFuel(x, z, f) { const id = this.idOf(x, z); if (id >= 0) { this.baseFuel[id] = f; this.fuel[id] = f; } }
  reset() {
    this.fuel.set(this.baseFuel);
    this.state.fill(0);
    this.burnEnd.fill(0); this.burntAt.fill(0);
    this.burning.length = 0; this.burntList.length = 0; this.clusters.clear();
    this.counts.burning = 0; this.counts.burnt = 0; this.counts.lit = 0;
    this.clock = 0; this.tickN = 0;
  }
  tile(id) { return ((id % FN) >> 4) + (((id / FN) | 0) >> 4) * 16; }
  /** The only way in. Returns how many cells caught. */
  ignite(x, z, radius = 3, source = 'world') {
    const r = Math.max(radius, 0.1);
    const c0 = this.cellOf(x - r, z - r), c1 = this.cellOf(x + r, z + r);
    let n = 0;
    for (let cz = c0.cz; cz <= c1.cz; cz++) for (let cx = c0.cx; cx <= c1.cx; cx++) {
      const id = cx + cz * FN;
      if (Math.hypot(this.wx(id) - x, this.wz(id) - z) > r + FCELL * 0.7) continue;
      if (this.lightCell(id, source)) n++;
    }
    return n;
  }
  lightCell(id, source) {
    if (this.fuel[id] === 0 || this.state[id] !== S.FRESH) return false;
    this.state[id] = S.BURNING;
    const f = this.fuel[id];
    const [lo, hi] = f === F.GRASS ? [8, 14] : f === F.SCRUB ? [12, 18] : [30, 40];
    this.burnEnd[id] = this.clock + this.rng.range(lo, hi);
    this.burning.push(id);
    this.counts.burning++; this.counts.lit++;
    const t = this.tile(id);
    this.clusters.set(t, (this.clusters.get(t) || 0) + 1);
    if (source === 'player') this.counts.byPlayer = (this.counts.byPlayer || 0) + 1;
    this.onIgnite?.(id, source);
    return true;
  }
  /** 4 Hz, from fixedUpdate every 15 steps. */
  tick(wind, dt = 0.25) {
    this.clock += dt;
    this.tickN++;
    const { burning, state, fuel, rng, height } = this;
    const spread = TUNING.fireSpread;
    const rain = this.raining ? 0.15 : 1;
    const ws = wind.total;
    const wx = wind.x, wz = wind.z;
    const we = TUNING.windEffect;
    const n0 = burning.length;
    for (let b = 0; b < n0; b++) {
      const id = burning[b];
      const cx = id % FN, cz = (id / FN) | 0;
      for (let k = 0; k < 8; k++) {
        const nx = cx + NB[k][0], nz = cz + NB[k][1];
        if (nx < 0 || nz < 0 || nx >= FN || nz >= FN) continue;
        const nid = nx + nz * FN;
        if (state[nid] !== S.FRESH || fuel[nid] === 0) continue;
        const diag = k >= 4;
        const dl = diag ? 1.4142 : 1;
        const cos = (NB[k][0] * wx + NB[k][1] * wz) / dl;
        const wf = clamp(1 + we * (ws / 5) * 1.6 * cos, 0.15, 3.5);
        const dh = height[nid] - height[id];
        const sf = dh > 0.4 ? 1.4 : dh < -0.4 ? 0.7 : 1;
        let p = 0.02 * FUEL_FACTOR[fuel[nid]] * wf * sf * rain * spread;
        if (diag) p /= 1.41;
        if (rng.next() < p) this.lightCell(nid, 'spread');
      }
      // Strong wind throws embers two or three cells: how fire crosses a road.
      if (ws > 6 && rng.next() < 0.004 * rain * spread) {
        const j = rng.int(2, 3);
        const ex = Math.round(cx + wx * j + rng.range(-0.6, 0.6)), ez = Math.round(cz + wz * j + rng.range(-0.6, 0.6));
        if (ex >= 0 && ez >= 0 && ex < FN && ez < FN) this.lightCell(ex + ez * FN, 'ember');
      }
    }
    // Retire finished cells, swap-and-pop so the list stays short.
    for (let b = burning.length - 1; b >= 0; b--) {
      const id = burning[b];
      if (this.clock >= this.burnEnd[id]) {
        burning[b] = burning[burning.length - 1]; burning.pop();
        state[id] = S.BURNT;
        this.counts.burning--; this.counts.burnt++;
        const t = this.tile(id), c = (this.clusters.get(t) || 1) - 1;
        if (c <= 0) this.clusters.delete(t); else this.clusters.set(t, c);
        this.burntList.push(id);
        this.burntAt[id] = this.hours;
        this.onBurnt?.(id);
      }
    }
  }
  hours = 0; // absolute game hours, set by the clock
  /** Called now and then by the clock: burnt goes green after regrowHours. */
  regrowTick() {
    const now = this.hours, need = TUNING.regrowHours;
    const list = this.burntList;
    for (let i = list.length - 1; i >= 0; i--) {
      const id = list[i];
      if (this.state[id] === S.BURNT && now - this.burntAt[id] >= need) {
        this.state[id] = S.REGROW;
        this.onRegrow?.(id);
        list[i] = list[list.length - 1]; list.pop();
        this.regrown = this.regrown || [];
        this.regrown.push(id);
      }
    }
  }
  /** State 3 stays unburnable until the next save or day-roll, then is fresh fuel at half density. */
  dayRoll() {
    if (!this.regrown) return;
    for (const id of this.regrown) {
      if (this.state[id] !== S.REGROW) continue;
      this.state[id] = S.FRESH;
      this.counts.burnt = Math.max(0, this.counts.burnt - 1);
      this.halfDensity = this.halfDensity || new Set();
      this.halfDensity.add(id);
      this.onFresh?.(id);
    }
    this.regrown.length = 0;
  }
  extinguishAll() {
    for (const id of this.burning) {
      this.state[id] = S.BURNT; this.burntAt[id] = this.hours; this.burntList.push(id);
      this.counts.burning--; this.counts.burnt++;
      this.onBurnt?.(id);
    }
    this.burning.length = 0; this.clusters.clear();
  }
  regrowAll() {
    for (const id of this.burntList) { if (this.state[id] === S.BURNT) { this.state[id] = S.REGROW; this.onRegrow?.(id); this.regrown = this.regrown || []; this.regrown.push(id); } }
    this.burntList.length = 0;
    this.dayRoll();
  }
  isBurning(x, z) { const id = this.idOf(x, z); return id >= 0 && this.state[id] === S.BURNING; }
  isBurnt(x, z) { const id = this.idOf(x, z); return id >= 0 && this.state[id] === S.BURNT; }
  hectares() { return this.playerCells() * 0.0025; }
  playerCells() { return this.counts.burnt + this.counts.burning; }
  /** Quietly burn a named strip, for story scars: no flames, the land is simply already gone. */
  burnStrip(pts, width) {
    const w = width / 2 + FCELL / 2;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const c0 = this.cellOf(Math.min(ax, bx) - w, Math.min(az, bz) - w), c1 = this.cellOf(Math.max(ax, bx) + w, Math.max(az, bz) + w);
      for (let cz = c0.cz; cz <= c1.cz; cz++) for (let cx = c0.cx; cx <= c1.cx; cx++) {
        const id = cx + cz * FN;
        if (this.state[id] === S.BURNT) continue;
        if (distToSegment(this.wx(id), this.wz(id), ax, az, bx, bz).d > w) continue;
        if (this.state[id] === S.BURNING) { const b = this.burning.indexOf(id); if (b >= 0) { this.burning[b] = this.burning[this.burning.length - 1]; this.burning.pop(); this.counts.burning--; const t = this.tile(id), c = (this.clusters.get(t) || 1) - 1; if (c <= 0) this.clusters.delete(t); else this.clusters.set(t, c); } }
        this.state[id] = S.BURNT;
        this.counts.burnt++;
        this.burntList.push(id);
        this.burntAt[id] = this.hours;
        this.onBurnt?.(id);
      }
    }
  }
  /** Run-length encode state + burntAt into plain data, for the save. */
  encode() {
    const runs = [];
    let cur = this.state[0], n = 0;
    for (let i = 0; i < FN * FN; i++) {
      if (this.state[i] === cur) n++;
      else { runs.push(cur, n); cur = this.state[i]; n = 1; }
    }
    runs.push(cur, n);
    const burnt = this.burntList.map((id) => [id, Math.round(this.burntAt[id] * 10) / 10]);
    const half = this.halfDensity ? [...this.halfDensity] : [];
    return { runs, burnt, half };
  }
  decode(data) {
    this.reset();
    let i = 0;
    for (let r = 0; r < data.runs.length; r += 2) {
      let v = data.runs[r], n = data.runs[r + 1];
      if (v === S.BURNING) v = S.BURNT; // a fire does not survive a sleep
      for (; n > 0; n--, i++) this.state[i] = v;
    }
    this.counts.burnt = 0;
    for (let id = 0; id < FN * FN; id++) if (this.state[id] === S.BURNT || this.state[id] === S.REGROW) { this.counts.burnt++; }
    this.burntList = [];
    for (const [id, at] of data.burnt) { this.burntAt[id] = at; this.burntList.push(id); }
    for (let id = 0; id < FN * FN; id++) if (this.state[id] === S.BURNT && !this.burntList.includes(id)) { /* burning at save */ this.burntList.push(id); this.burntAt[id] = this.hours; }
    this.halfDensity = new Set(data.half || []);
    // What was regrowing when you saved still rolls over to fresh fuel.
    this.regrown = [];
    for (let id = 0; id < FN * FN; id++) if (this.state[id] === S.REGROW) this.regrown.push(id);
  }
}
