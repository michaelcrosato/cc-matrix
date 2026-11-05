/* LEVEL GRID: one source for both the 3D world and the sim. An indoor area is written as rectangles (rooms, raised
 * floors, stairs, pillars) that become World3D text rows and a legend; an outdoor area is a terrain height function.
 * The sim's LevelGrid answers floor heights, line of sight, rays (hitscan) and flow fields (Whiteouts' paths). */
const CHARS = '.abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOQRSTUVWXYZ0123456789!$%&*+,-/:;<=>?[]^_{|}~';

/** build { rows, legend, cells } from an area's world spec (tiles and metres) */
S7.buildRows = (W) => {
  const w = W.w, h = W.h, cells = [];
  const wallH = (W.wallH || 4) * M;
  for (let y = 0; y < h; y++) { const row = []; for (let x = 0; x < w; x++) row.push({ k: 'wall', h: wallH }); cells.push(row); }
  const each = (r, fn) => { for (let y = Math.max(0, r[1]); y < Math.min(h, r[3]); y++) for (let x = Math.max(0, r[0]); x < Math.min(w, r[2]); x++) fn(cells[y][x], x, y); };
  for (const r of W.rooms || []) each(r, c => { c.k = 'floor'; c.h = (r[4] || 0) * M; c.tag = r[5] || null; });
  for (const r of W.walls || []) each(r, c => { c.k = 'wall'; c.h = (r[4] || W.wallH || 4) * M; });
  for (const r of W.raised || []) each(r, c => { c.k = 'floor'; c.h = r[4] * M; });
  for (const r of W.pits || []) each(r, c => { c.k = 'pit'; c.h = 0; });
  for (const p of W.pillars || []) { const c = cells[p[1]] && cells[p[1]][p[0]]; if (c) { c.k = 'pillar'; c.h = (p[2] || W.wallH || 4) * M; } }
  // stairs: [x0, y0, x1, y1, dir 'n'|'s'|'e'|'w', fromM, toM]: each tile row (or column) along dir rises an equal share
  for (const s of W.stairs || []) {
    const [x0, y0, x1, y1, dir, a, b] = s, n = dir === 'n' || dir === 's' ? y1 - y0 : x1 - x0;
    void n;
    each(s, (c) => { c.k = 'stairs'; c.dir = dir; c.from = a * M; c.h = b * M; c.box = [x0, y0, x1, y1]; });
  }
  // legend characters for each distinct spec
  const legend = {}, key2ch = {}, rows = [];
  let ci = 1;
  const keyOf = c => c.k + ':' + c.h + ':' + (c.dir || '') + ':' + (c.from || 0) + ':' + (c.box ? c.box.join(',') : '');
  for (let y = 0; y < h; y++) {
    let s = '';
    for (let x = 0; x < w; x++) {
      const c = cells[y][x], k = keyOf(c);
      let ch = key2ch[k];
      if (!ch) {
        if (c.k === 'floor' && c.h === 0) ch = '.';
        else { ch = CHARS[ci++]; if (!ch) throw new Error('level: too many distinct tiles'); }
        key2ch[k] = ch;
        legend[ch] = c.k === 'wall' ? { wall: c.h, cut: false, color: W.wallColor, top: W.wallTop, line: W.wallLine } : c.k === 'pillar' ? { pillar: c.h, color: W.pillarColor } : c.k === 'pit' ? { pit: true } : c.k === 'stairs' ? { stairs: c.dir, from: c.from, floor: c.h, color: W.stairColor } : { floor: c.h };
        if (c.k === 'floor' && c.h > 0) { if (W.raisedSide) legend[ch].side = W.raisedSide; if (W.raisedColor) legend[ch].color = W.raisedColor; }
        for (const k in legend[ch]) if (legend[ch][k] === undefined) delete legend[ch][k];
      }
      s += ch;
    }
    rows.push(s);
  }
  return { rows, legend, cells };
};

class LevelGrid {
  /** area: the area's definition (its world: { kind: 'level', ... } or { kind: 'terrain', height }) */
  constructor(area) {
    const W = area.world;
    this.kind = W.kind || 'level';
    this.blocks = (area.blocks || []).map(b => [b[0] * M, b[1] * M, b[2] * M, b[3] * M, b[4] * M, b[5] * M]);
    this.dynBlocks = [];   // gates that open remove theirs (id → box)
    if (this.kind === 'terrain') {
      this.height = W.height;
      this.size = W.size || 32768;
      this.w = Math.ceil(this.size / M); this.h = this.w;
    } else {
      const b = S7.buildRows(W);
      this.rows = b.rows; this.legend = b.legend; this.cells = b.cells;
      this.w = W.w; this.h = W.h;
    }
    this._flows = {};
  }
  cell(cx, cy) { if (this.kind === 'terrain') return null; return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h ? this.cells[cy][cx] : null; }
  /** the floor's height (units) at a point: stairs interpolate, walls count as their top */
  floorAt(x, y) {
    if (this.kind === 'terrain') return this.height(x, y);
    const cx = Math.floor(x / M), cy = Math.floor(y / M), c = this.cell(cx, cy);
    if (!c) return 0;
    if (c.k === 'stairs') {
      const [x0, y0, x1, y1] = c.box, fx = (x / M - x0) / (x1 - x0), fy = (y / M - y0) / (y1 - y0);
      const t = clamp(c.dir === 'n' ? 1 - fy : c.dir === 's' ? fy : c.dir === 'e' ? fx : 1 - fx, 0, 1);
      return c.from + (c.h - c.from) * t;
    }
    if (c.k === 'pit') return -200;
    return c.h;
  }
  walkable(cx, cy) { const c = this.cell(cx, cy); return !!c && (c.k === 'floor' || c.k === 'stairs'); }
  /** is the point inside something solid (a wall column, a pillar, below the floor, a block)? */
  solidAt(x, y, z) {
    if (this.kind === 'terrain') { if (z < this.height(x, y) - 1) return true; }
    else {
      const c = this.cell(Math.floor(x / M), Math.floor(y / M));
      if (!c) return z < 400;
      if ((c.k === 'wall' || c.k === 'pillar') && z < c.h) return true;
      if ((c.k === 'floor' || c.k === 'stairs') && z < this.floorAt(x, y) - 1) return true;
    }
    for (const b of this.blocks) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]) return true;
    for (const b of this.dynBlocks) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]) return true;
    return false;
  }
  /** march a ray: the distance to the first solid point within len, or Infinity */
  ray(o, d, len, step = 3) {
    for (let t = step; t <= len; t += step) {
      const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t;
      if (this.solidAt(x, y, z)) {
        // refine
        let lo = t - step, hi = t;
        for (let k = 0; k < 5; k++) { const m = (lo + hi) / 2; if (this.solidAt(o[0] + d[0] * m, o[1] + d[1] * m, o[2] + d[2] * m)) hi = m; else lo = m; }
        return lo;
      }
    }
    return Infinity;
  }
  /** a clear line between two points? */
  los(a, b, step = 4) {
    const d = V.sub(b, a), L = V.len(d);
    if (L < 1) return true;
    if (this.kind === 'terrain') step = Math.max(step, L / 60);   // (a terrain's height is smooth: sixty samples are plenty)
    return this.ray(a, V.mul(d, 1 / L), L - 2, step) === Infinity;
  }
  /** a flow field toward tile (tx, ty) (indoor only): BFS distances, cached per target tile */
  flow(tx, ty) {
    if (this.kind === 'terrain') return null;
    tx = clamp(tx, 0, this.w - 1); ty = clamp(ty, 0, this.h - 1);
    const key = tx + ',' + ty;
    if (this._flows[key]) return this._flows[key];
    const W = this.w, H = this.h, dist = new Float32Array(W * H).fill(1e9), q = [];
    const blockedByDyn = (cx, cy) => { const x = (cx + .5) * M, y = (cy + .5) * M; for (const b of this.dynBlocks) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4]) return true; return false; };
    const ok = (cx, cy) => this.walkable(cx, cy) && !blockedByDyn(cx, cy);
    dist[ty * W + tx] = 0; q.push(tx, ty);
    let qi = 0;
    while (qi < q.length) {
      const x = q[qi++], y = q[qi++], d0 = dist[y * W + x];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!ok(nx, ny)) continue;
        if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;   // no corner cutting
        const c0 = this.cells[y][x], c1 = this.cells[ny][nx];
        if (Math.abs((c1.h || 0) - (c0.h || 0)) > 18 && c1.k !== 'stairs' && c0.k !== 'stairs') continue;   // no climbing ledges
        const nd = d0 + (dx && dy ? 1.414 : 1);
        if (nd < dist[ny * W + nx]) { dist[ny * W + nx] = nd; q.push(nx, ny); }
      }
    }
    const f = { tx, ty, dist };
    const keys = Object.keys(this._flows); if (keys.length > 24) delete this._flows[keys[0]];
    this._flows[key] = f;
    return f;
  }
  /** the way to go from (x, y) along a flow field: a unit [dx, dy], or null (no path: go straight) */
  flowDir(f, x, y) {
    if (!f) return null;
    const W = this.w, cx = Math.floor(x / M), cy = Math.floor(y / M);
    if (cx < 0 || cy < 0 || cx >= W || cy >= this.h) return null;
    let best = f.dist[cy * W + cx], bx = 0, by = 0;
    if (best >= 1e9) return null;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= this.h) continue;
      const d = f.dist[ny * W + nx]; if (d < best) { best = d; bx = dx; by = dy; }
    }
    if (!bx && !by) return null;
    // aim at the next tile's centre
    const tx = (cx + bx + .5) * M - x, ty = (cy + by + .5) * M - y, l = Math.hypot(tx, ty) || 1;
    return [tx / l, ty / l];
  }
  invalidateFlows() { this._flows = {}; }
}
S7.LevelGrid = LevelGrid;
