// The voxel world: real 3D blocks (roofs, bridges, tunnels, mixed walls), x east, y south, z up, one block = 16 units.
// It plugs into the engine where a map goes: T, solids, _liftOrder (depth sorting), groundAt / collide (bodies).
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16;
const SOLID = DQ.SOLID, OPAQUE = DQ.OPAQUE, LIQUID = DQ.LIQUID, STAIR = DQ.STAIR, WATER = DQ.WATER;

class VoxelWorld {
  constructor(W, D, H, o = {}) {
    this.W = W; this.D = D; this.H = H; this.T = T; this.solids = [];
    this.vox = new Uint8Array(W * D * H);
    this.rotm = new Uint8Array(W * D * H);          // stair rotation per cell
    this.dmg = new Map();                            // idx -> { hp, t } partial damage (heals after 4 s)
    this.colVer = new Uint32Array(W * D);
    this.top = new Uint8Array(W * D);                // highest solid level + 1 (0: an empty column)
    this.objIdx = new Map();                         // idx -> object occupying the cell
    this.flagTown = new Set();                       // cells placed inside the town border (siege targets)
    this.base = null; this.baseRot = null;
    this.events = o.events || null; this.ctx = o.ctx || null;
    this.edits = 0; this.name = o.name || 'world';
  }
  idx(x, y, z) { return (y * this.W + x) * this.H + z; }
  unidx(i) { const z = i % this.H, c = (i - z) / this.H, x = c % this.W, y = (c - x) / this.W; return [x, y, z]; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.D && z < this.H; }
  get(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.D && z < this.H ? this.vox[(y * this.W + x) * this.H + z] : 0; }
  rot(x, y, z) { return this.inside(x, y, z) ? this.rotm[this.idx(x, y, z)] : 0; }
  solidAt(x, y, z) { return SOLID[this.get(x, y, z)] === 1; }
  opaqueAt(x, y, z) { return OPAQUE[this.get(x, y, z)] === 1; }
  liquidAt(x, y, z) { return LIQUID[this.get(x, y, z)] === 1; }
  topZ(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.D ? this.top[y * this.W + x] : 0; }
  /** the level a walker stands at on column (x, y): the top solid + 1 (ignoring overhangs), or -1 for void */
  surface(x, y) { const t = this.topZ(x, y); return t > 0 ? t : -1; }
  _recalcTop(x, y) { const H = this.H, b = (y * this.W + x) * H; let t = 0; for (let z = H - 1; z >= 0; z--) if (SOLID[this.vox[b + z]]) { t = z + 1; break; } this.top[y * this.W + x] = t; }
  _bump(x, y) {
    const W = this.W, D = this.D;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < D) this.colVer[b * W + a]++; }
  }
  /** set a block; o: { by, silent, rot } -> true when it changed */
  set(x, y, z, id, o = {}) {
    if (!this.inside(x, y, z)) return false;
    const i = this.idx(x, y, z), old = this.vox[i];
    if (old === id && (o.rot === undefined || this.rotm[i] === o.rot)) return false;
    this.vox[i] = id; this.rotm[i] = o.rot || 0; this.dmg.delete(i); this.edits++;
    this._recalcTop(x, y); this._bump(x, y);
    if (!id) this.flagTown.delete(i); else if (o.town) this.flagTown.add(i);
    if (!o.silent && this.events) {
      if (id && !old) this.events.emit('blockPlaced', { x, y, z, id, by: o.by || null });
      else if (!id && old) this.events.emit('blockBroken', { x, y, z, id: old, by: o.by || null });
      else this.events.emit('blockPlaced', { x, y, z, id, old, by: o.by || null });
    }
    return true;
  }
  /** fill a box of cells with id (worldgen, stamps) */
  fill(x0, y0, z0, x1, y1, z1, id, o = {}) { for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, z, id, Object.assign({ silent: true }, o)); }
  /** levels L where a walker can stand on column (x, y): solid below, two free above */
  standLevels(x, y) {
    const out = [], H = this.H;
    for (let L = 1; L < H - 1; L++) if (this.canStand(x, y, L)) out.push(L);
    return out;
  }
  canStand(x, y, L) {
    const b = this.get(x, y, L - 1), o = this.objIdx.get(this.inside(x, y, L) ? this.idx(x, y, L) : -1);
    const under = SOLID[b] || (L === 0);
    if (!under) return false;
    if (SOLID[this.get(x, y, L)] && !STAIR[this.get(x, y, L)]) return false;
    if (SOLID[this.get(x, y, L + 1)]) return false;
    if (o && o.def.solidH > 8) return false;
    return true;
  }
  /** the water depth at the walker's level in column (x, y), counted down from level L */
  waterDepth(x, y, L) { let n = 0; while (L - n >= 0 && LIQUID[this.get(x, y, L - n)]) n++; return n; }
  // ---------------- physics (world units) ----------------
  _stairTop(x, y, z, px, py, rr = 0) {
    // the ramp's height under a footprint: its highest point (the leading edge going up)
    const r = this.rot(x, y, z), fx = E.clamp(px - x * T + (r === 0 ? rr : r === 2 ? -rr : 0), 0, T), fy = E.clamp(py - y * T + (r === 1 ? rr : r === 3 ? -rr : 0), 0, T);
    const h = r === 0 ? fx : r === 1 ? fy : r === 2 ? T - fx : T - fy;
    return z * T + E.clamp(h + 1, 1, T);
  }
  /** the highest surface top <= z + step under a circle (x, y, r): blocks, stairs (ramps), solid objects; -Infinity over void */
  groundAt(px, py, r, z, step = 2) {
    const rr = Math.max(.5, r - .75), x0 = Math.floor((px - rr) / T), x1 = Math.floor((px + rr) / T), y0 = Math.floor((py - rr) / T), y1 = Math.floor((py + rr) / T);
    const lim = z + step + .001; let best = -Infinity;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.D) continue;
      // the circle must really overlap this cell
      const qx = E.clamp(px, cx * T, cx * T + T), qy = E.clamp(py, cy * T, cy * T + T);
      if ((qx - px) * (qx - px) + (qy - py) * (qy - py) > rr * rr) continue;
      const base = (cy * this.W + cx) * this.H;
      let L = Math.min(this.H - 1, Math.floor(lim / T));
      for (; L >= 0; L--) {
        const id = this.vox[base + L];
        if (STAIR[id]) { const t = this._stairTop(cx, cy, L, px, py, rr); if (t <= lim) { if (t > best) best = t; break; } continue; }
        if (SOLID[id]) { const t = (L + 1) * T; if (t <= lim) { if (t > best) best = t; break; } }
        const ob = this.objIdx.get(base + L);
        if (ob && ob.def.solidH > 0 && !ob.def.door) { const t = L * T + ob.def.solidH; if (t <= lim && t > best) best = t; }
      }
    }
    return best;
  }
  /** the lowest solid bottom above a body's head span within its footprint (head bumps); Infinity for none */
  ceilingAt(px, py, r, z, step = 2) {
    const rr = Math.max(.5, r - .75), x0 = Math.floor((px - rr) / T), x1 = Math.floor((px + rr) / T), y0 = Math.floor((py - rr) / T), y1 = Math.floor((py + rr) / T);
    let best = Infinity; const L0 = Math.max(0, Math.floor((z + step + 1) / T));
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.D) continue;
      const base = (cy * this.W + cx) * this.H;
      for (let L = L0; L < this.H; L++) { const id = this.vox[base + L]; if (SOLID[id] && !STAIR[id] && L * T > z + step) { if (L * T < best) best = L * T; break; } }
    }
    return best;
  }
  /** does cell (cx, cy) block a body spanning [z + step, z + h)? (walls, deep water, closed doors for door-blockers) */
  blocksBody(cx, cy, body, px, py) {
    if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.D) return !body.leaveWorld;
    const z = body.z, lo = z + (body.step || 2) + .001, hi = z + (body.h || 28), base = (cy * this.W + cx) * this.H;
    const L0 = Math.max(0, Math.floor(lo / T)), L1 = Math.min(this.H - 1, Math.floor((hi - .001) / T));
    for (let L = L0; L <= L1; L++) {
      const id = this.vox[base + L];
      if (STAIR[id]) { if (this._stairTop(cx, cy, L, px, py) > lo + 3) return true; continue; }
      if (SOLID[id]) return true;
      const ob = this.objIdx.get(base + L);
      if (ob) {
        if (ob.def.door) { if (body.blockDoors && !ob.isOpen && !ob.broken) return true; }
        else if (ob.def.solidH > 0 && L * T + ob.def.solidH > lo) return true;
      }
    }
    // a walker's own level: deep water stops it (it can't swim)
    if (!body.fly && body.wade !== false) {
      let L = Math.min(this.H - 1, Math.floor((z + 1) / T)); const stop = Math.max(0, L - 3);
      while (L > stop && !this.vox[base + L]) L--;
      if (L >= 1 && LIQUID[this.vox[base + L]] && LIQUID[this.vox[base + L - 1]]) return true;
    }
    return false;
  }
  /** push a circle body out of every blocking cell (as TileMap.collide does, per level); true when it moved */
  collide(b) {
    let moved = false;
    for (let pass = 0; pass < 2; pass++) {
      const x0 = Math.floor((b.x - b.r) / T), x1 = Math.floor((b.x + b.r) / T), y0 = Math.floor((b.y - b.r) / T), y1 = Math.floor((b.y + b.r) / T);
      let any = false;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const qx = E.clamp(b.x, cx * T, cx * T + T), qy = E.clamp(b.y, cy * T, cy * T + T);
        const dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy;
        if (d2 >= b.r * b.r) continue;
        if (!this.blocksBody(cx, cy, b, qx, qy)) continue;
        any = true;
        if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (b.r - d) / d; b.x += dx * k; b.y += dy * k; }
        else {   // the centre is inside the cell: out by the nearest side
          const l = b.x - cx * T, r = cx * T + T - b.x, u = b.y - cy * T, w = cy * T + T - b.y, m = Math.min(l, r, u, w);
          if (m === l) b.x = cx * T - b.r; else if (m === r) b.x = cx * T + T + b.r; else if (m === u) b.y = cy * T - b.r; else b.y = cy * T + T + b.r;
        }
      }
      if (!any) break; moved = true;
    }
    return moved;
  }
  /** the nearest standable cell within rad cells of a body (it was buried by a stamp or a Tangle) */
  escape(b, rad = 4) {
    const cx = Math.floor(b.x / T), cy = Math.floor(b.y / T), L = Math.floor((b.z + 1) / T);
    if (this.canStand(cx, cy, L) && !this.blocksBody(cx, cy, b, b.x, b.y)) return false;
    let best = null, bd = 1e9;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const x = cx + dx, y = cy + dy; if (!this.inside(x, y, 0)) continue;
      for (let l = Math.max(1, L - 3); l <= Math.min(this.H - 2, L + 6); l++) if (this.canStand(x, y, l)) { const d = dx * dx + dy * dy + Math.abs(l - L) * .7; if (d < bd) { bd = d; best = [x, y, l]; } }
    }
    if (!best) { const t = this.topZ(cx, cy); best = [cx, cy, t]; }
    b.x = best[0] * T + 8; b.y = best[1] * T + 8; b.z = best[2] * T; b.vz = 0; b.onGround = true; return true;
  }
  // ---------------- rays and picking ----------------
  /** 3D DDA (Amanatides-Woo) from o along d (world units) up to maxT: the first cell for which hit(x, y, z) is true.
   *  -> { x, y, z, nx, ny, nz, t } | null */
  raycast(o, d, maxT, hit) {
    hit = hit || ((x, y, z) => SOLID[this.get(x, y, z)] === 1 || !!this.objIdx.get(this.idx(x, y, z)));
    const len = Math.hypot(d[0], d[1], d[2]) || 1, dx = d[0] / len, dy = d[1] / len, dz = d[2] / len;
    let x = Math.floor(o[0] / T), y = Math.floor(o[1] / T), z = Math.floor(o[2] / T);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = dx ? Math.abs(T / dx) : Infinity, tdy = dy ? Math.abs(T / dy) : Infinity, tdz = dz ? Math.abs(T / dz) : Infinity;
    let tx = dx ? ((dx > 0 ? (x + 1) * T - o[0] : o[0] - x * T) / Math.abs(dx)) : Infinity;
    let ty = dy ? ((dy > 0 ? (y + 1) * T - o[1] : o[1] - y * T) / Math.abs(dy)) : Infinity;
    let tz = dz ? ((dz > 0 ? (z + 1) * T - o[2] : o[2] - z * T) / Math.abs(dz)) : Infinity;
    let nx = 0, ny = 0, nz = 0, t = 0;
    for (let i = 0; i < 1200 && t <= maxT; i++) {
      if (this.inside(x, y, z) && hit(x, y, z)) return { x, y, z, nx, ny, nz, t };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }
  /** line of sight between two world points (eyes to chest): no opaque block between */
  sight(a, b) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]);
    if (L < 1) return true;
    const h = this.raycast(a, d, L - 2, (x, y, z) => OPAQUE[this.get(x, y, z)] === 1);
    return !h;
  }
  /** the block under a buffer pixel: the view ray through it, from the camera side, through the 3D DDA.
   *  cut(x, y, z) says a block is cut away (not pickable). -> { x, y, z, n: [nx, ny, nz], obj } | null */
  pickScreen(view, px, py, cut) {
    const inv = view.inv; if (!inv) return null;
    const zA = (this.H + 2) * T, zB = -T;
    const at = z => { const sy = py - view.bz * z; return [inv[0] * px + inv[1] * sy, inv[2] * px + inv[3] * sy, z]; };
    const A = at(zA), B = at(zB);
    // clip the segment to the world's box
    let t0 = 0, t1 = 1; const D = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], lo = [0, 0, -T], hi = [this.W * T, this.D * T, (this.H + 2) * T];
    for (let k = 0; k < 3; k++) {
      if (Math.abs(D[k]) < 1e-9) { if (A[k] < lo[k] || A[k] > hi[k]) return null; continue; }
      let ta = (lo[k] - A[k]) / D[k], tb = (hi[k] - A[k]) / D[k]; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return null;
    }
    const O = [A[0] + D[0] * (t0 + 1e-6), A[1] + D[1] * (t0 + 1e-6), A[2] + D[2] * (t0 + 1e-6)], full = Math.hypot(D[0], D[1], D[2]) * (t1 - t0);
    const r = this.raycast(O, D, full, (x, y, z) => {
      if (cut && cut(x, y, z)) return false;
      const id = this.vox[this.idx(x, y, z)];
      return SOLID[id] === 1 || !!this.objIdx.get(this.idx(x, y, z));
    });
    if (!r) return null;
    return { x: r.x, y: r.y, z: r.z, n: [r.nx, r.ny, r.nz], obj: this.objIdx.get(this.idx(r.x, r.y, r.z)) || null };
  }
  /** the camera clamp in buffer pixels (as TileMap.bounds): the world's corners projected */
  bounds(view) {
    const W = this.W * T, D = this.D * T, Z = this.H * T; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of [[0, 0], [W, 0], [0, D], [W, D]]) for (const z of [0, Z * .6]) { const p = view.p(x, y, z); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    return { x0: x0 - 40, y0: y0 - 60, x1: x1 + 40, y1: y1 + 60 };
  }
  // ---------------- saves and network ----------------
  snapshotBase() { this.base = this.vox.slice(); this.baseRot = this.rotm.slice(); }
  /** cells that differ from the generated base world: [[idx, id, rot], ...] */
  diff() {
    const out = [], v = this.vox, b = this.base, r = this.rotm, br = this.baseRot;
    if (!b) return out;
    for (let i = 0; i < v.length; i++) if (v[i] !== b[i] || r[i] !== br[i]) out.push(r[i] ? [i, v[i], r[i]] : [i, v[i]]);
    return out;
  }
  applyDiff(list) {
    for (const e of list) { const [x, y, z] = this.unidx(e[0]); this.set(x, y, z, e[1], { silent: true, rot: e[2] || 0 }); }
  }
  hash() { let h = 0x811c9dc5; const v = this.vox; for (let i = 0; i < v.length; i++) { if (!v[i]) continue; h ^= i * 31 + v[i]; h = Math.imul(h, 0x01000193); } return h >>> 0; }
  // ---------------- block damage (cracks; heals after 4 s without hits) ----------------
  damage(x, y, z, amount, now) {
    const i = this.idx(x, y, z), id = this.vox[i], b = DQ.BLOCKS[id]; if (!b) return { broke: false, frac: 0 };
    let d = this.dmg.get(i); if (!d) this.dmg.set(i, d = { hp: b.hp, t: now });
    d.hp -= amount; d.t = now; this.colVer[Math.floor(i / this.H)]++;
    return { broke: d.hp <= 0, frac: 1 - Math.max(0, d.hp) / b.hp };
  }
  crack(i) { const d = this.dmg.get(i); if (!d) return 0; const b = DQ.BLOCKS[this.vox[i]]; return b ? 1 - Math.max(0, d.hp) / b.hp : 0; }
  healDamage(now) { for (const [i, d] of this.dmg) if (now - d.t > 4) { this.dmg.delete(i); this.colVer[Math.floor(i / this.H)]++; } }
  // ---------------- depth sorting hook (the renderer calls it for items queued above z .5) ----------------
  _liftOrder(view, x, y, z, k) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T);
    if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.D) return k;
    const runs = this.renderRuns ? this.renderRuns(cx, cy) : null; if (!runs) return k;
    const ox = (cx + .5) * T, oy = (cy + .5) * T;
    let lift = null, sink = null;
    for (const R of runs) {
      if (R[1] * T <= z + 1) { if (!lift || R[1] > lift[1]) lift = R; }
      else if (R[0] * T >= z + 20) { if (!sink || R[0] < sink[0]) sink = R; }
    }
    if (lift) k = Math.max(k, view.order(ox, oy, lift[0] * T) + .002 + z * 1e-5);
    if (sink) k = Math.min(k, view.order(ox, oy, sink[0] * T) - .002);
    return k;
  }
  _liftSolids(view, x, y, z, k) { return k; }
}
DQ.VoxelWorld = VoxelWorld;
})();
