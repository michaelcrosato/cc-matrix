// Traffic (plan §7.4): the vehicles of one stage, spawned from its mix with a seeded stream, keeping their lanes (and
// changing them when blocked), with the detection the scoring needs: overtakes and near misses, the slipstream source,
// and the contacts with the player. Positions are in the stage's own road distance, like the player's.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { clamp } = E;
const T = k => OB.tune(k);
const BASE_DENSITY = .6;    // vehicles per 10,000 units per lane (plan §8.6, the density of the stage's mix)
const STRETCH = 7000;       // the road ahead that holds the density: vehicles are kept in it

class Traffic {
  /** new OB.Traffic(stage, { seed, difficulty }): the vehicles of a stage, from its traffic mix */
  constructor(st, o = {}) {
    this.st = st; this.rng = OB.rand.stream('traffic', (o.seed || 0) + ':' + st.def.id);
    this.lanes = st.def.lanes; this.list = []; this.id = 0; this.difficulty = o.difficulty || 1;
    this.types = Object.keys(st.def.traffic || {}); this.weights = this.types.map(t => st.def.traffic[t]);
    this.target = Math.round(BASE_DENSITY * st.len / 10000 * this.lanes * T('trafficDensity') * this.difficulty);
    this.spawnT = 0;
    this.wantAhead = Math.max(1, Math.round(BASE_DENSITY * STRETCH / 10000 * this.lanes * T('trafficDensity') * this.difficulty));
    // a first crowd, spread over the stage ahead of the start
    for (let i = 0; i < this.target; i++) this.spawn(200 + (st.len - 600) * (i + .5) / Math.max(1, this.target), true);
  }
  pickType() {
    let total = this.weights.reduce((a, b) => a + b, 0), r = this.rng() * total;
    for (let i = 0; i < this.types.length; i++) { r -= this.weights[i]; if (r <= 0) return this.types[i]; }
    return this.types[0];
  }
  /** one vehicle at distance z, a lane picked from the stream, its speed from its type */
  spawn(z, first = false, lane) {
    const type = this.pickType(), def = OB.TRAFFIC[type], lanes = this.lanes;
    const l = lane === undefined ? Math.floor(this.rng() * lanes) : lane;
    const x = -1 + (2 * l + 1) / lanes;
    // keep the spacing: a lane's vehicles at least 900 units apart
    for (const v of this.list) if (Math.abs(v.lane - l) < 1e-6 && Math.abs(v.z - z) < 900) return null;
    const vmin = def.v[0] * T('trafficSpeedScale'), vmax = def.v[1] * T('trafficSpeedScale');
    const col = def.cols[Math.floor(this.rng() * def.cols.length)];
    const v = { id: 'v' + (++this.id), type, def, z, x, lane: l, laneX: x, w: def.w, len: def.len, kmh: vmin + (vmax - vmin) * this.rng(), col,
      blink: 0, lc: null, lcT: 0, hit: 0, passed: false, prevRel: null, shiftT: 0, nearOk: true };
    this.list.push(v); return v;
  }
  /** a vehicle's speed in units a second */
  rate(v) { return v.kmh * OB.KMH_UNITS; }
  /** one step: move every vehicle, change lanes when blocked, spawn ahead to keep the density, drop the ones behind */
  step(dt, carZ, carX = 9) {
    for (const v of this.list) {
      v.z += this.rate(v) * dt;
      v.hit = Math.max(0, v.hit - dt);
      // blocked by a slower vehicle in its lane within 1200 units: blink, then change lane if the next lane is free
      const ahead = this.list.find(o => o !== v && Math.abs(o.lane - v.lane) < 1e-6 && o.z > v.z && o.z - v.z < 1200 && o.kmh < v.kmh - 3);
      if (!v.lc && ahead) { v.blink += dt; if (v.blink > .8) { const to = v.lane + (this.rng() < .5 ? -1 : 1); if (to >= 0 && to < this.lanes && !this.laneBlocked(to, v.z) && !this.nearPlayer(to, v.z, carZ, carX)) { v.lc = to; v.lcT = 0; v.blink = 0; } else { v.blink = 0; } } }
      else if (!ahead) v.blink = 0;
      if (v.lc !== null) { v.lcT += dt; const u = Math.min(1, v.lcT / 1.2), from = -1 + (2 * v.lane + 1) / this.lanes, to = -1 + (2 * v.lc + 1) / this.lanes; v.x = from + (to - from) * u; if (u >= 1) { v.lane = v.lc; v.lc = null; v.x = to; } }
      else v.x = v.laneX = -1 + (2 * v.lane + 1) / this.lanes;
    }
    this.list = this.list.filter(v => v.z < this.st.len + 3000 && v.z > carZ - 3000);
    // keep the density by distance: when fewer vehicles than the stretch ahead holds are in view, one spawns out
    // at the far end of it (a timer would fill the road faster for a fast car)
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = .25;
      const ahead = this.list.filter(v => v.z > carZ && v.z < carZ + STRETCH).length;
      if (ahead < this.wantAhead && carZ + STRETCH < this.st.len - 200) this.spawn(carZ + STRETCH + this.rng() * 400);
    }
  }
  /** a lane change never cuts across the player's car: no change into its lane within 900 units of it */
  nearPlayer(lane, z, carZ, carX) { const x = -1 + (2 * lane + 1) / this.lanes; return Math.abs(x - carX) < .35 && Math.abs(z - carZ) < 900; }
  laneBlocked(lane, z) { return this.list.some(o => Math.abs(o.lane - lane) < 1e-6 && Math.abs(o.z - z) < 700); }
  /** the vehicle ahead of (z, x) within the slipstream: dz in (300, range) and |dx| under the width */
  draftSource(z, x) {
    const range = T('slipRange'), w = T('slipWidth');
    let best = null;
    for (const v of this.list) { const dz = v.z - z; if (dz > 300 && dz < range && Math.abs(v.x - x) < w && (!best || dz < best.dz)) best = { v, dz }; }
    return best;
  }
  /** the traffic in a range, for the cars list of the road: {z, x, w, draw} entries (drawn by the art module) */
  visible(carZ) { return this.list.filter(v => v.z > carZ - 400 && v.z < carZ + 9000); }
}
OB.Traffic = Traffic;
})();
