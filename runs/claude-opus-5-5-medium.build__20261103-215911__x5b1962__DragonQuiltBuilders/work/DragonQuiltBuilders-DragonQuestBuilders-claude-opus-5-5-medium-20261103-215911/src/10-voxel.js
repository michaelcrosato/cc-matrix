// The voxel world: real 3D blocks (the engine's TileMap is a heightmap). Storage, queries, collision, raycast, diff.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = 16;
const B = DQ.BLOCKS;
const isSolidId = id => id > 0 && B[id] && B[id].solid;
const isOpaqueId = id => id > 0 && B[id] && B[id].opaque;

class VoxelWorld {
  constructor(W, D, H, events) {
    this.W = W; this.D = D; this.H = H; this.T = T; this.solids = [];
    this.vox = new Uint8Array(W * D * H);
    this.meta = new Map();                       // idx -> { rot, hp, t (last hit), by, town, temp }
    this.colVer = new Uint32Array(W * D);
    this.top = new Uint8Array(W * D);            // highest solid level + 1
    this.objs = new Map();                       // idx -> object (anchor cell and, for tall ones, the cell above)
    this.base = null; this.version = 0; this.events = events || null;
    this._runs = new Map();
    this.cut = null;                             // the renderer's cutaway: { x, y, z, r } (cells at z >= level within r are hidden)
  }
  idx(x, y, z) { return (y * this.W + x) * this.H + z; }
  unidx(i) { const z = i % this.H, c = (i - z) / this.H, x = c % this.W, y = (c - x) / this.W; return [x, y, z]; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.D && z < this.H; }
  insideCol(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.D; }
  get(x, y, z) { return this.inside(x, y, z) ? this.vox[this.idx(x, y, z)] : 0; }
  solidAt(x, y, z) { return isSolidId(this.get(x, y, z)); }
  opaqueAt(x, y, z) { return isOpaqueId(this.get(x, y, z)); }
  liquidAt(x, y, z) { const id = this.get(x, y, z); return id > 0 && B[id].liquid; }
  topZ(x, y) { return this.insideCol(x, y) ? this.top[y * this.W + x] : 0; }
  // set a block. o: { by, silent, town, rot }. Emits blockPlaced / blockBroken on the world's events
  set(x, y, z, id, o = {}) {
    if (!this.inside(x, y, z)) return false;
    const i = this.idx(x, y, z), was = this.vox[i];
    if (was === id && !o.rot) return false;
    this.vox[i] = id;
    if (id === 0) this.meta.delete(i);
    else if (o.rot !== undefined || o.town || o.temp || o.by !== undefined) { const m = this.meta.get(i) || {}; if (o.rot !== undefined) m.rot = o.rot; if (o.town) m.town = true; if (o.temp) m.temp = o.temp; if (o.by !== undefined) m.by = o.by; this.meta.set(i, m); }
    else this.meta.delete(i);
    this._touch(x, y);
    this.version++;
    if (!o.silent && this.events) {
      if (id === 0 && was) this.events.emit('blockBroken', { x, y, z, id: was, by: o.by });
      else if (id) this.events.emit('blockPlaced', { x, y, z, id, was, by: o.by });
    }
    return true;
  }
  _touch(x, y) {
    const c = y * this.W + x; let t = 0;
    for (let z = this.H - 1; z >= 0; z--) if (isSolidId(this.vox[c * this.H + z])) { t = z + 1; break; }
    this.top[c] = t;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (this.insideCol(nx, ny)) { this.colVer[ny * this.W + nx]++; this._runs.delete(ny * this.W + nx); } }
  }
  recomputeTops() { for (let y = 0; y < this.D; y++) for (let x = 0; x < this.W; x++) this._touch(x, y); this._runs.clear(); }
  rot(x, y, z) { const m = this.meta.get(this.idx(x, y, z)); return m && m.rot || 0; }
  metaAt(x, y, z) { return this.meta.get(this.idx(x, y, z)) || null; }
  // opaque runs [z0, z1) of a column (the renderer draws each as one item), cached until the column changes
  runs(x, y) {
    if (!this.insideCol(x, y)) return EMPTY;
    const c = y * this.W + x; let r = this._runs.get(c);
    if (r) return r;
    r = []; let z0 = -1; const H = this.H, base = c * H, v = this.vox;
    for (let z = 0; z <= H; z++) {
      const o = z < H && isOpaqueId(v[base + z]);
      if (o && z0 < 0) z0 = z; else if (!o && z0 >= 0) { r.push([z0, z]); z0 = -1; }
    }
    this._runs.set(c, r); return r;
  }
  // ---- objects: furniture and plants live in cells but are not voxels ----
  objAt(x, y, z) { return this.inside(x, y, z) ? this.objs.get(this.idx(x, y, z)) || null : null; }
  _objIndex(o, on) {
    const cells = [[o.x, o.y, o.z]]; if (o.def.tall) cells.push([o.x, o.y, o.z + 1]);
    for (const [x, y, z] of cells) if (this.inside(x, y, z)) { const i = this.idx(x, y, z); if (on) this.objs.set(i, o); else if (this.objs.get(i) === o) this.objs.delete(i); }
    if (this.insideCol(o.x, o.y)) { this.colVer[o.y * this.W + o.x]++; }
    this.version++;
  }
  // ---- ground and collision (world units; z up; a body's z is its feet) ----
  // the stair ramp height (0..16) at a point inside a stair cell, by its rot (0: rises toward +x, 1: +y, 2: -x, 3: -y)
  stairH(x, y, z, px, py) {
    const r = this.rot(x, y, z), u = (px - x * T) / T, v = (py - y * T) / T;
    const t = r === 0 ? u : r === 1 ? v : r === 2 ? 1 - u : 1 - v; return E.clamp(t, 0, 1) * T;
  }
  // the top of what is under a point at most `step` above z (or -Infinity over the void)
  _cellGround(cx, cy, px, py, z, step, kind) {
    if (!this.insideCol(cx, cy)) return -Infinity;
    const lim = z + step; let L = Math.min(this.H - 1, Math.floor(lim / T));
    for (; L >= 0; L--) {
      const id = this.vox[this.idx(cx, cy, L)];
      if (id && B[id].solid) {
        if (B[id].shape === 'stair') { const h = L * T + this.stairH(cx, cy, L, px, py); if (h <= lim + .01) return h; continue; }
        const top = (L + 1) * T; if (top <= lim + .01) return top;
      }
      const o = this.objs.get(this.idx(cx, cy, L));
      if (o && o.def.solid && !o.def.tall && o.z === L) { const top = L * T + o.def.h; if (top <= lim + .01) return Math.max(top, this._below(cx, cy, L)); }
    }
    return -Infinity;
  }
  _below(cx, cy, L) { return L > 0 && this.solidAt(cx, cy, L - 1) ? L * T : -Infinity; }
  groundAt(px, py, r, z, step = 2, kind) {
    const rr = r * .7; let g = -Infinity;
    const x0 = Math.floor((px - rr) / T), x1 = Math.floor((px + rr) / T), y0 = Math.floor((py - rr) / T), y1 = Math.floor((py + rr) / T);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const qx = E.clamp(px, cx * T, cx * T + T - .01), qy = E.clamp(py, cy * T, cy * T + T - .01);
      if (Math.hypot(qx - px, qy - py) > rr) continue;
      const h = this._cellGround(cx, cy, E.clamp(px, cx * T, cx * T + T), E.clamp(py, cy * T, cy * T + T), z, step, kind);
      if (h > g) g = h;
    }
    return g;
  }
  // the lowest block bottom above z within the footprint (head bumps), Infinity when open sky
  ceilingAt(px, py, r, z) {
    const rr = r * .7; let c = Infinity;
    const x0 = Math.floor((px - rr) / T), x1 = Math.floor((px + rr) / T), y0 = Math.floor((py - rr) / T), y1 = Math.floor((py + rr) / T);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      for (let L = Math.max(0, Math.floor(z / T) + 1); L < this.H; L++) {
        const id = this.get(cx, cy, L); if (id && B[id].solid && B[id].shape !== 'stair') { c = Math.min(c, L * T); break; }
      }
    }
    return c;
  }
  // does the cell block a body (kind: 'builder' | 'npc' | 'monster') whose feet are at z, stepping `step`?
  blocks(cx, cy, L, kind, z, step) {
    const id = this.get(cx, cy, L);
    if (id) { const b = B[id]; if (b.solid && b.shape !== 'stair') return (L + 1) * T > z + step + .01; }
    const o = this.inside(cx, cy, L) && this.objs.get(this.idx(cx, cy, L));
    if (o) {
      if (o.def.door) return kind === 'monster' && !o.open && !o.broken;
      if (o.def.solid) return L * T + o.def.h > z + step + .01;
    }
    return false;
  }
  // push a circle body out of blocking cells over its height span
  collide(b) {
    const step = b._onStair ? 9 : (b.step || 2), z = b.z, lo = Math.max(0, Math.floor((z + step + .01) / T)), hi = Math.min(this.H - 1, Math.floor((z + b.h - .01) / T));
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      const x0 = Math.floor((b.x - b.r) / T), x1 = Math.floor((b.x + b.r) / T), y0 = Math.floor((b.y - b.r) / T), y1 = Math.floor((b.y + b.r) / T);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        let blk = false;
        for (let L = lo; L <= hi; L++) if (this.blocks(cx, cy, L, b.kind, z, step)) { blk = true; break; }
        if (!blk && b.kind !== 'fly' && this._deepWater(cx, cy, z)) blk = true;
        if (!blk) continue;
        const qx = E.clamp(b.x, cx * T, cx * T + T), qy = E.clamp(b.y, cy * T, cy * T + T), dx = b.x - qx, dy = b.y - qy, d = Math.hypot(dx, dy);
        if (d >= b.r) continue;
        hit = true;
        if (d > 1e-6) { b.x = qx + dx / d * b.r; b.y = qy + dy / d * b.r; }
        else { // centre inside the cell: out the nearest side
          const l = b.x - cx * T, rr = cx * T + T - b.x, u = b.y - cy * T, dd = cy * T + T - b.y, m = Math.min(l, rr, u, dd);
          if (m === l) b.x = cx * T - b.r; else if (m === rr) b.x = cx * T + T + b.r; else if (m === u) b.y = cy * T - b.r; else b.y = cy * T + T + b.r;
        }
      }
    }
    return hit;
  }
  // water 2 or more levels deep at the body's level blocks walkers (the builder cannot swim)
  _deepWater(cx, cy, z) {
    const L = Math.floor((z + 1) / T); if (!this.insideCol(cx, cy)) return false;
    if (this.solidAt(cx, cy, L - 1) || this.solidAt(cx, cy, L)) return false;
    return (this.liquidAt(cx, cy, L - 1) && this.liquidAt(cx, cy, L - 2)) || (this.liquidAt(cx, cy, L) && this.liquidAt(cx, cy, L - 1));
  }
  // standable levels in a column: solid (or solid low object) below, two free levels at L and L+1
  standable(x, y, L, kind) {
    if (!this.inside(x, y, L) || L < 1) return false;
    if (!this.solidAt(x, y, L - 1)) return false;
    for (const l of [L, L + 1]) { const id = this.get(x, y, l); if (id && (B[id].solid || B[id].liquid)) return false; const o = this.objAt(x, y, l); if (o && o.def.solid) return false; if (o && o.def.door && kind === 'monster' && !o.open) return false; }
    return true;
  }
  surfaceL(x, y) { return this.topZ(x, y); }
  // first cell along a ray (world units) that `test` accepts: { x, y, z, nx, ny, nz, t } or null (Amanatides-Woo)
  raycast(o, d, maxT, test) {
    test = test || ((x, y, z) => this.solidAt(x, y, z) || !!this.objAt(x, y, z));
    const len = Math.hypot(d[0], d[1], d[2]) || 1, dx = d[0] / len, dy = d[1] / len, dz = d[2] / len;
    let x = Math.floor(o[0] / T), y = Math.floor(o[1] / T), z = Math.floor(o[2] / T);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = dx ? Math.abs(T / dx) : Infinity, tdy = dy ? Math.abs(T / dy) : Infinity, tdz = dz ? Math.abs(T / dz) : Infinity;
    let tx = dx ? ((dx > 0 ? (x + 1) * T - o[0] : o[0] - x * T) / Math.abs(dx)) : Infinity;
    let ty = dy ? ((dy > 0 ? (y + 1) * T - o[1] : o[1] - y * T) / Math.abs(dy)) : Infinity;
    let tz = dz ? ((dz > 0 ? (z + 1) * T - o[2] : o[2] - z * T) / Math.abs(dz)) : Infinity;
    let t = 0, nx = 0, ny = 0, nz = 0;
    for (let n = 0; n < 512 && t <= maxT; n++) {
      if (this.inside(x, y, z) && test(x, y, z)) return { x, y, z, nx, ny, nz, t };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
      if (z < -1 && dz < 0) break;
    }
    return null;
  }
  // the block under a screen point (buffer pixels, r.w space): view ray from the top of the world down
  pickScreen(sx, sy, view, ix, iy) {
    const X = sx + ix, Y = sy + iy, inv = view.inv; if (!inv) return null;
    const at = zz => { const yy = Y - view.bz * zz; return [inv[0] * X + inv[1] * yy, inv[2] * X + inv[3] * yy, zz]; };
    const zTop = this.H * T + 8, a = at(zTop), b = at(zTop - 100), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const cut = this.cut;
    const hit = this.raycast(a, d, 4000, (x, y, z) => {
      if (cut && z >= cut.z && Math.hypot(x + .5 - cut.x, y + .5 - cut.y) < cut.r) return false;
      const id = this.vox[this.idx(x, y, z)]; if (id && B[id].solid) return true;
      const o = this.objs.get(this.idx(x, y, z)); return !!o;
    });
    if (!hit) return null;
    const obj = this.objAt(hit.x, hit.y, hit.z);
    return { x: hit.x, y: hit.y, z: hit.z, n: [hit.nx, hit.ny, hit.nz], obj: obj && !this.solidAt(hit.x, hit.y, hit.z) ? obj : null };
  }
  // the camera's clamp rectangle (projected pixels), as TileMap.bounds
  bounds(view) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of [[0, 0], [this.W * T, 0], [0, this.D * T], [this.W * T, this.D * T]]) for (const z of [0, 12 * T]) { const q = view.p(x, y, z); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    return { x0: x0 - 40, y0: y0 - 60, x1: x1 + 40, y1: y1 + 40 };
  }
  // renderer hook: anything standing on blocks (here or beside, at or under its feet) sorts after them
  _liftOrder(view, x, y, z, k) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy, rs = this.runs(nx, ny); if (!rs.length) continue;
      let best = null; for (const r of rs) if (r[1] * T <= z + 1.5) best = r;
      if (best) k = Math.max(k, view.order(nx * T + T / 2, ny * T + T / 2, best[0] * T) + .002 + z * 1e-5);
    }
    return k;
  }
  _liftSolids(view, x, y, z, k) { return k; }
  // ---- saves and the network: the cells that differ from the generated base world ----
  snapshotBase() { this.base = this.vox.slice(); this.baseMeta = new Map([...this.meta].map(([k, v]) => [k, Object.assign({}, v)])); }
  diff() {
    const out = [], v = this.vox, b = this.base; if (!b) return out;
    for (let i = 0; i < v.length; i++) if (v[i] !== b[i]) { const m = this.meta.get(i); out.push(m && m.rot ? [i, v[i], m.rot] : [i, v[i]]); }
    return out;
  }
  applyDiff(list) {
    for (const e of list) { const [x, y, z] = this.unidx(e[0]); this.set(x, y, z, e[1], { silent: true, rot: e[2] }); }
  }
  hash() { let h = 2166136261 >>> 0; const v = this.vox; for (let i = 0; i < v.length; i++) { if (!v[i]) continue; h ^= v[i] + i * 31; h = Math.imul(h, 16777619); } return h >>> 0; }
  // move a buried body to the nearest standable cell within 4 cells
  escape(b) {
    const cx = Math.floor(b.x / T), cy = Math.floor(b.y / T), L = Math.max(1, Math.floor((b.z + 1) / T));
    if (this.standable(cx, cy, L) || (!this.solidAt(cx, cy, L) && !this.solidAt(cx, cy, L + 1))) return false;
    for (let r = 0; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      for (const dl of [0, 1, -1, 2, -2, 3]) { const l = L + dl; if (this.standable(cx + dx, cy + dy, l)) { b.x = (cx + dx + .5) * T; b.y = (cy + dy + .5) * T; b.z = l * T; b.vz = 0; return true; } }
    }
    const t = this.topZ(cx, cy); b.z = t * T; return true;
  }
}
const EMPTY = [];
DQ.VoxelWorld = VoxelWorld;

// ---- physics: a circle body in the voxel world (feet at z, height h) ----
class VoxelBody {
  constructor(o = {}) {
    Object.assign(this, { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 5, h: 28, step: 2, gravity: 800, kind: 'builder', onGround: false, facing: Math.PI / 2, eye: 22, chest: 16, inWater: false, fly: false }, o);
    this.lastSafe = [this.x, this.y, this.z]; this._safeT = 0; this.hitWall = false; this.landed = false; this.fellOut = false; this._airT = 0;
  }
  jump(v) { this.vz = v; this.onGround = false; }
  push(ix, iy, iz) { this.vx += ix; this.vy += iy; if (iz) { this.vz += iz; this.onGround = false; } }
  update(dt, world) {
    this.landed = false; this.fellOut = false;
    if (this.fly) {
      this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt; this.onGround = false;
      this.z = E.clamp(this.z, T, (world.H + 4) * T); return;
    }
    const wasGround = this.onGround;
    // horizontal: x then y, each pushed out of blocks
    { const sc = Math.floor(this.x / T), sr = Math.floor(this.y / T), sl = Math.floor((this.z + 1) / T); const id = world.get(sc, sr, sl) || world.get(sc, sr, sl - 1); this._onStair = !!(id && DQ.BLOCKS[id] && DQ.BLOCKS[id].shape === 'stair'); }
    const mul = this.inWater ? .55 : 1;
    const ox = this.x, oy = this.y;
    this.x += this.vx * dt * mul; world.collide(this);
    this.y += this.vy * dt * mul; world.collide(this);
    if ((this.kind === 'monster' || this.kind === 'npc') && this.onGround && world.groundAt(this.x, this.y, this.r, this.z, 64) === -Infinity) { this.x = ox; this.y = oy; this.vx = this.vy = 0; }
    this.hitWall = Math.abs((this.x - ox) - this.vx * dt * mul) > .05 || Math.abs((this.y - oy) - this.vy * dt * mul) > .05;
    // vertical
    const g = world.groundAt(this.x, this.y, this.r, this.z, this.onGround ? Math.max(this.step, 4) : this.step, this.kind);
    if (!this.onGround || this.z > g + .01 || this.vz > 0) {
      this.vz -= this.gravity * dt; if (this.vz < -420) this.vz = -420;
      const nz = this.z + this.vz * dt;
      if (this.vz > 0) { const c = world.ceilingAt(this.x, this.y, this.r, this.z); if (nz + this.h > c) { this.z = Math.max(this.z, c - this.h); this.vz = 0; } else this.z = nz; }
      else if (nz <= g) { this.z = g; if (!this.onGround && this.vz < -60) this.landed = true; this.vz = 0; this.onGround = true; }
      else { this.z = nz; this.onGround = false; }
    } else if (this.onGround) { this.z = g; this.vz = 0; }
    if (g === -Infinity) this.onGround = false;
    // water
    const L = Math.floor((this.z + 2) / T), cx = Math.floor(this.x / T), cy = Math.floor(this.y / T);
    this.inWater = world.liquidAt(cx, cy, L);
    // the builder cannot swim: deep water puts it back where it last stood safely
    if (this.inWater && world.liquidAt(cx, cy, L - 1) && this.kind !== 'fly' && this.onGround !== null) { this.fellOut = this.kind === 'builder' ? 'water' : false; if (this.kind !== 'builder') { this.respawnSafe(); } }
    // safe spots and the void
    this._safeT += dt;
    if (this.onGround && this._safeT > .5 && !this.inWater) { this._safeT = 0; if (this._safeHere(world)) this.lastSafe = [this.x, this.y, this.z]; }
    if (this.z < -16 * 1) { this.fellOut = true; }
    if (!wasGround && this.onGround) this.landed = this.landed || true;
  }
  _safeHere(world) {
    const cx = Math.floor(this.x / T), cy = Math.floor(this.y / T);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (world.topZ(cx + dx, cy + dy) === 0) return false;
    return true;
  }
  respawnSafe() { [this.x, this.y, this.z] = this.lastSafe; this.vx = this.vy = this.vz = 0; this.onGround = false; }
  get cell() { return [Math.floor(this.x / T), Math.floor(this.y / T), Math.floor((this.z + 1) / T)]; }
}
DQ.VoxelBody = VoxelBody;
})();
