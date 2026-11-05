// The voxel world: block storage, generation, queries (solid, raycast, enclosure), serialisation and drawing.
// Columns are contiguous: idx(x, y, z) = (y * W + x) * H + z. Outside x/y is a stitched wall (solid); above H is air.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = DQ.T, B = DQ.B;
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

class VoxelWorld {
  constructor(W = DQ.W, D = DQ.D, H = DQ.H) {
    this.W = W; this.D = D; this.H = H;
    this.vox = new Uint8Array(W * D * H);
    this.hp = new Map();          // idx -> damage taken (heals after a while, see Play)
    this.edits = 0;               // bumps on each change (room scans and draw caches watch it)
  }
  idx(x, y, z) { return (y * this.W + x) * this.H + z; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.D && z < this.H; }
  // the block at a cell: outside the sides is the stitched edge; above the top is air; below the floor is cloth
  get(x, y, z) {
    if (z < 0) return B.CLOTH;
    if (z >= this.H) return B.AIR;
    if (x < 0 || y < 0 || x >= this.W || y >= this.D) return B.CLOTH;
    return this.vox[this.idx(x, y, z)];
  }
  set(x, y, z, id) {
    if (!this.inside(x, y, z)) return;
    const i = this.idx(x, y, z);
    this.vox[i] = id; this.hp.delete(i); this.edits++;
    if (this.log) this.log.push([i, id]);   // a shared round's host sends these to the other copies
  }
  solid(x, y, z) { return DQ.solidBlock(this.get(Math.floor(x), Math.floor(y), Math.floor(z))); }
  // the highest solid level of a column, plus one (0 on bare air)
  top(x, y) {
    for (let z = this.H - 1; z >= 0; z--) if (this.get(x, y, z) !== 0) return z + 1;
    return 0;
  }
  // a flood through air from a cell. Returns { closed, cells, seen }: closed when it stops within the cap without
  // reaching the edge; seen is every air cell visited (so a scan never floods the same open ground twice)
  flood(cx, cy, cz, cap = 260) {
    const seen = new Set(), q = [[cx, cy, cz]]; seen.add(this.idx(cx, cy, cz));
    const cells = [];
    let open = false;
    while (q.length) {
      const [x, y, z] = q.pop(); cells.push([x, y, z]);
      if (cells.length > cap) { open = true; break; }
      for (const [dx, dy, dz] of DIRS) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (nx < 0 || ny < 0 || nz < 0 || nx >= this.W || ny >= this.D || nz >= this.H) { open = true; continue; }
        if (DQ.solidBlock(this.get(nx, ny, nz))) continue;
        const k = this.idx(nx, ny, nz);
        if (seen.has(k)) continue;
        seen.add(k); q.push([nx, ny, nz]);
      }
    }
    return { closed: !open, cells, seen };
  }
  // rooms: every enclosed air region, typed by the furniture on its walls. A room needs a door in its walls, light (a
  // lantern in its walls) and a bed, a workbench or a chest. Returns [{ kind, cells, cx, cy, z, bed, size }]
  rooms() {
    const out = [], done = new Set();
    for (let z = 1; z < this.H - 1; z++) for (let y = 0; y < this.D; y++) for (let x = 0; x < this.W; x++) {
      const k = this.idx(x, y, z);
      if (DQ.solidBlock(this.get(x, y, z)) || done.has(k)) continue;
      const f = this.flood(x, y, z, 200);
      for (const s of f.seen) done.add(s);
      if (!f.closed || f.cells.length < 4) continue;
      const near = new Map(); // wall cell -> id
      for (const [a, b, c] of f.cells) for (const [dx, dy, dz] of DIRS) {
        const id = this.get(a + dx, b + dy, c + dz);
        if (DQ.solidBlock(id)) near.set(this.idx(a + dx, b + dy, c + dz), id);
      }
      const count = id => { let n = 0; for (const v of near.values()) if (v === id) n++; return n; };
      if (!count(B.DOOR) || !count(B.LANTERN)) continue;
      const kind = count(B.BED) ? 'bedroom' : count(B.BENCH) ? 'workshop' : count(B.CHEST) ? 'storehouse' : null;
      if (!kind) continue;
      let bed = null;
      for (const [key, id] of near) if (id === B.BED) { // decode the index: idx = (y * W + x) * H + z
        const col = Math.floor(key / this.H);
        bed = { x: col % this.W, y: Math.floor(col / this.W), z: key % this.H };
        break;
      }
      const cx = f.cells.reduce((s, p) => s + p[0], 0) / f.cells.length, cy = f.cells.reduce((s, p) => s + p[1], 0) / f.cells.length;
      out.push({ kind, cells: f.cells.length, cx, cy, z, bed, size: f.cells.length });
    }
    return out;
  }
  // persistence: the block bytes and the damaged cells, as base64
  toJSON() {
    let s = '';
    for (let i = 0; i < this.vox.length; i += 0x8000) s += String.fromCharCode.apply(null, this.vox.subarray(i, i + 0x8000));
    return { vox: btoa(s), hp: [...this.hp.entries()] };
  }
  fromJSON(d) {
    const bin = atob(d.vox);
    for (let i = 0; i < bin.length && i < this.vox.length; i++) this.vox[i] = bin.charCodeAt(i);
    this.hp = new Map(d.hp || []); this.edits++;
  }
}

// ---- generation -------------------------------------------------------------------------------------------------
// a smooth, deterministic height: value noise on a seeded lattice
function makeNoise(label, cell) {
  const r = DQ.rng(label), lat = [];
  for (let i = 0; i < 64 * 64; i++) lat.push(r());
  const at = (i, j) => lat[((j & 63) * 64) + (i & 63)];
  return (x, y) => {
    const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * u, b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * u;
    return a + (b - a) * v;
  };
}
DQ.generateWorld = (world) => {
  const h = makeNoise('terrain', 9), h2 = makeNoise('detail', 4), ore = DQ.rng('ore'), tree = DQ.rng('trees');
  const cx = world.W / 2, cy = world.D / 2;
  for (let y = 0; y < world.D; y++) for (let x = 0; x < world.W; x++) {
    // the floor: meadow with hills; flat around the start, a sunken pond to the south-west, the Den to the south-east
    const dx = x - cx, dy = y - cy, flat = Math.max(0, 1 - Math.hypot(dx, dy) / 12);
    let surf = 4 + Math.round(h(x, y) * 4 + h2(x, y) * 1.5 - 1.5 - flat * 2);
    const pond = Math.hypot(x - 14, y - 34) < 6;
    if (pond) surf = 2;
    const den = x >= 34 && y >= 34;
    if (den) surf = 6;
    const rock = x < 13 && y > 24;             // stonefield to the west
    if (rock) surf = 6 + Math.round(h2(x, y) * 3);
    surf = Math.max(2, Math.min(world.H - 6, surf));
    for (let z = 0; z <= surf; z++) {
      let id = B.BATTING;
      if (z === 0) id = B.CLOTH;
      else if (z === surf) id = pond ? B.SAND : den ? B.KNOT : (x < 34 && y < 14) ? B.BRICK : B.TURF;
      else if (z < surf - 2) id = rock || z < 3 ? (ore() < 0.12 ? B.COPPER : B.COBBLE) : B.BATTING;
      else if (den) id = ore() < 0.15 ? B.KNOT : B.BATTING;
      if (pond && z === surf - 1) id = B.SAND;
      world.set(x, y, z, id);
    }
    if (pond) for (let z = surf + 1; z <= 4; z++) world.set(x, y, z, B.AIR);
    const forest = x >= 34 && y < 14;               // the Wool Forest: more trees
    if (!den && !pond && tree() < (forest ? 0.07 : 0.012) && Math.hypot(dx, dy) > 6) growTree(world, x, y, surf + 1, tree);
    else if (!den && !pond && tree() < 0.04) world.set(x, y, surf + 1, B.PUMPKIN);
  }
  // the Den: knotted walls and a clearing at the south-east corner
  for (let y = 36; y < world.D - 1; y++) for (let x = 36; x < world.W - 1; x++) {
    if ((x === 36 || y === 36 || x === world.W - 2 || y === world.D - 2) && world.get(x, y, 7) === 0) for (let z = 1; z <= 6; z++) world.set(x, y, z, B.KNOT);
  }
  // a little start-of-chapter scatter: a bit of copper near the spawn
  for (let i = 0; i < 6; i++) { const x = 19 + Math.floor(ore() * 8), y = 19 + Math.floor(ore() * 8), z = world.top(x, y); if (z > 0) world.set(x, y, z - 1, B.COPPER); }
  world.edits++;
};
function growTree(world, x, y, z, r) {
  const height = 3 + Math.floor(r() * 2);
  for (let k = 0; k < height; k++) world.set(x, y, z + k, B.PINE);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = 0; dz < 2; dz++) {
    if (dx === 0 && dy === 0 && dz === 0) continue;
    if (world.get(x + dx, y + dy, z + height - 1 + dz) === 0) world.set(x + dx, y + dy, z + height - 1 + dz, B.WOOL);
  }
}

// ---- collision and targeting --------------------------------------------------------------------------------------
// does an axis-aligned body (feet at z, half-width hw, height ht) overlap a solid block?
DQ.boxHits = (world, x, y, z, hw, ht) => {
  const e = 0.001, x0 = Math.floor((x - hw) / T), x1 = Math.floor((x + hw - e) / T);
  const y0 = Math.floor((y - hw) / T), y1 = Math.floor((y + hw - e) / T);
  const z0 = Math.floor((z + e) / T), z1 = Math.floor((z + ht - e) / T);
  for (let cz = z0; cz <= z1; cz++) for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (DQ.solidBlock(world.get(cx, cy, cz))) return true;
  return false;
};
// the cell a ray from (x, y, z) in direction (dx, dy) meets first (flat, at a height): { cx, cy, cz, px, py, pz } where
// p is the air cell before it, or null
DQ.rayBlock = (world, x, y, z, dx, dy, dist) => {
  let prev = null;
  const steps = Math.ceil(dist * 4);
  for (let i = 1; i <= steps; i++) {
    const s = i / 4, px = x + dx * s * T, py = y + dy * s * T;
    const cx = Math.floor(px / T), cy = Math.floor(py / T), cz = Math.floor(z / T);
    const id = world.get(cx, cy, cz);
    if (DQ.solidBlock(id)) return { cx, cy, cz, id, px: prev ? prev[0] : cx, py: prev ? prev[1] : cy, pz: cz, prev: prev };
    prev = [cx, cy, cz];
  }
  return null;
};

// ---- drawing ------------------------------------------------------------------------------------------------------------
// Every exposed block is queued on its own, anchored at its centre in world units, so the depth sort puts the Builder,
// the residents and the monsters in front of or behind each block correctly (and on top of the blocks they stand on).
// Each patch gets a small, fixed shade change, so the fabric reads as a quilt rather than a flat colour.
const patchCache = new Map();
DQ.patchColor = (id, x, y, z, side) => {
  const v = DQ.hash(x + ',' + y + ',' + z) % 7 - 3;
  const key = id + ':' + v + ':' + (side ? 's' : 't');
  let c = patchCache.get(key);
  if (!c) { c = DQ.shadeHex(side ? DQ.BLOCKS[id].side : DQ.BLOCKS[id].top, v * 0.035); patchCache.set(key, c); }
  return c;
};
DQ.drawWorld = (r, world, cx, cy, radius) => {
  const x0 = Math.max(0, Math.floor(cx) - radius), x1 = Math.min(world.W - 1, Math.floor(cx) + radius);
  const y0 = Math.max(0, Math.floor(cy) - radius), y1 = Math.min(world.D - 1, Math.floor(cy) + radius);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const top = world.top(x, y);
    for (let z = 0; z < top; z++) {
      const id = world.get(x, y, z);
      if (!id) continue;
      const exposed = world.get(x, y, z + 1) === 0 || world.get(x + 1, y, z) === 0 || world.get(x, y + 1, z) === 0 ||
        world.get(x - 1, y, z) === 0 || world.get(x, y - 1, z) === 0;
      if (!exposed) continue;
      const top_c = DQ.patchColor(id, x, y, z, false), side_c = DQ.patchColor(id, x, y, z, true);
      const stitched = ((x * 7 + y * 13 + z * 3) & 3) === 0;
      r.queue((x + 0.5) * T, (y + 0.5) * T, (z + 0.5) * T, g => {
        r.box(g, x * T, y * T, z * T, (x + 1) * T, (y + 1) * T, (z + 1) * T, top_c, side_c);
        DQ.blockDetail(r, g, id, x, y, z, top_c, side_c, DQ.game.time || 0);
        // the patchwork seam: a darker stitch line on some tops
        if (stitched && id !== DQ.B.CLOTH) r.box(g, x * T + 2, y * T + 2, (z + 1) * T, (x + 1) * T - 2, (y + 1) * T - 2, (z + 1) * T + 0.5, DQ.shadeHex(top_c, -0.2), DQ.shadeHex(top_c, -0.2));
      });
    }
  }
};
// The furniture and banners: small procedural pieces on top of their blocks (a bed's pillow and blanket, a bench's
// planks, a chest's lid band, a door's knob, a lantern whose flame flickers, a banner whose flag flutters).
DQ.blockDetail = (r, g, id, x, y, z, top_c, side_c, t) => {
  const B = DQ.B, x0 = x * T, y0 = y * T, z1 = (z + 1) * T;
  if (id === B.BED) {
    r.box(g, x0 + 1, y0 + 1, z1, x0 + T - 1, y0 + 5, z1 + 3, '#ffffff', '#e0d0d8');        // pillow at the head
    r.box(g, x0 + 1, y0 + 9, z1, x0 + T - 1, y0 + T - 1, z1 + 1, '#f6d25a', '#c9a030');    // blanket
  } else if (id === B.BENCH) {
    r.box(g, x0 + 2, y0 + 2, z1, x0 + T - 2, y0 + 6, z1 + 1, '#b98348', '#6e4a2a');        // a plank on the bench
    r.box(g, x0 + 2, y0 + T - 6, z1, x0 + T - 2, y0 + T - 2, z1 + 1, '#b98348', '#6e4a2a');
  } else if (id === B.CHEST) {
    r.box(g, x0 + 1, y0 + 6, z1, x0 + T - 1, y0 + 10, z1 + 2, '#ffe08a', '#b07a22');       // the lid's band
    r.box(g, x0 + 7, y0 + 5, z1, x0 + 9, y0 + 11, z1 + 1, '#4a3418', '#2a1a0a');          // the clasp
  } else if (id === B.DOOR) {
    r.box(g, x0 + 11, y0 + 7, z1 - 5, x0 + 13, y0 + 9, z1 - 3, '#ffd27a', '#c08a3a');     // the knob
  } else if (id === B.LANTERN) {
    const f = 2.5 + Math.sin(t * 9 + x * 3 + y) * 1.2;                                     // the flame flickers
    r.box(g, x0 + 5, y0 + 5, z1, x0 + T - 5, y0 + T - 5, z1 + f, '#fff6b0', '#ffcf40');
  } else if (id === B.BANNER) {
    r.box(g, x0 + 7, y0 + 7, z1, x0 + 9, y0 + 9, z1 + 24, '#6b4a2a', '#4a3018');          // the pole
    const w = Math.sin(t * 3 + x * 0.7 + y * 0.4) * 2.5;                                  // the flag flutters
    r.box(g, x0 + 9, y0 + 7, z1 + 13 + w * 0.3, x0 + 9.5, y0 + 15, z1 + 22 + w, '#f4f0e8', '#d8d0c0');
  }
};
DQ.shadeHex = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
};

DQ.VoxelWorld = VoxelWorld;
})();
