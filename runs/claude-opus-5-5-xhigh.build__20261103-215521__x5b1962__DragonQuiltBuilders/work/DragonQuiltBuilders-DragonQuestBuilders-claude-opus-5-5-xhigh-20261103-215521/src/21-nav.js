// Navigation in the editable voxel world: nodes are standable cells (x, y, L); moves are 8-way walks (diagonals only
// past two open sides), hops up one level, drops of 1-3 levels, doors (open for residents, shut for monsters). A* with a
// binary heap, capped. Breaker mode (siege monsters): walls cost 8 a block to smash through, doors 4.
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16;
const SOLID = DQ.SOLID, LIQUID = DQ.LIQUID, STAIR = DQ.STAIR;
class Heap {
  constructor() { this.a = []; }
  push(n, f) { const a = this.a; a.push([f, n]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top[1]; }
  get size() { return this.a.length; }
}
class Nav {
  constructor(world) { this.w = world; }
  standable(x, y, L, o = {}) {
    const w = this.w; if (!w.inside(x, y, L) || L < 1 || L >= w.H - 1) return false;
    const below = w.get(x, y, L - 1), here = w.get(x, y, L), head = w.get(x, y, L + 1);
    if (!SOLID[below] && !LIQUID[below]) return false;
    if (LIQUID[below] && LIQUID[w.get(x, y, L - 2)]) return false;
    if (LIQUID[below] && !SOLID[w.get(x, y, L - 2)]) return false;
    if (SOLID[here] && !STAIR[here]) return false; if (SOLID[head]) return false;
    if (LIQUID[here] && LIQUID[head]) return false;
    if (LIQUID[here] && LIQUID[below]) return false;
    const ob = w.objIdx.get(w.idx(x, y, L));
    if (ob) { if (ob.def.door) { if (o.monster && !o.breaker && !ob.broken) return false; } else if (ob.def.solidH > 8) return false; }
    return true;
  }
  /** the standing level of a body */
  levelOf(b) { return Math.floor((b.z + 1) / T); }
  /** neighbours of a node: [x, y, L, cost, breaks?] */
  neighbours(x, y, L, o) {
    const out = [], w = this.w;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy, diag = dx && dy, c = diag ? 1.41 : 1;
      if (diag && !(this.standable(x + dx, y, L, o) && this.standable(x, y + dy, L, o))) continue;
      if (this.standable(nx, ny, L, o)) { const ob = w.objIdx.get(w.idx(nx, ny, L)); out.push([nx, ny, L, c + (ob && ob.def.door && o.breaker && o.monster ? 4 : 0)]); continue; }
      if (!diag && this.standable(nx, ny, L + 1, o) && !SOLID[w.get(x, y, L + 2)]) { out.push([nx, ny, L + 1, 2]); continue; }
      let dropped = false;
      if (!SOLID[w.get(nx, ny, L)] && !SOLID[w.get(nx, ny, L + 1)]) for (let k = 1; k <= 3; k++) { const l2 = L - k; if (SOLID[w.get(nx, ny, l2)] && !STAIR[w.get(nx, ny, l2)]) break; if (this.standable(nx, ny, l2, o)) { out.push([nx, ny, l2, 1.5]); dropped = true; break; } }
      if (!dropped && o.breaker && !diag && SOLID[w.get(nx, ny, L - 1)]) {   // smash through walls in the way (siege)
        const a = w.get(nx, ny, L), b2 = w.get(nx, ny, L + 1), hard = (a === DQ.blockId('knotWall') || b2 === DQ.blockId('knotWall') || a === DQ.BACKING);
        if (!hard && (SOLID[a] || SOLID[b2])) out.push([nx, ny, L, c + 8 * ((SOLID[a] ? 1 : 0) + (SOLID[b2] ? 1 : 0)), true]);
      }
    }
    return out;
  }
  /** A* from a body's cell to a target cell (x, y, L) within radius (cells). o: { monster, breaker, cap: 3000 } -> [[x, y, L, brk], ...] or null */
  path(sx, sy, sL, tx, ty, tL, o = {}) {
    const w = this.w, cap = o.cap || 3000, rad = o.radius === undefined ? .5 : o.radius, key = (x, y, L) => (y * w.W + x) * w.H + L;
    if (!this.standable(sx, sy, sL, o)) { let f = false; for (const d of [0, 1, -1]) if (this.standable(sx, sy, sL + d, o)) { sL += d; f = true; break; } if (!f && !o.loose) return null; }
    const h = (x, y, L) => Math.hypot(x - tx, y - ty) + Math.abs(L - (tL === undefined ? L : tL)) * .5;
    const open = new Heap(), came = new Map(), g = new Map(), k0 = key(sx, sy, sL); g.set(k0, 0); open.push([sx, sy, sL], h(sx, sy, sL));
    let n = 0, best = null, bh = 1e9;
    while (open.size && n < cap) {
      const cur = open.pop(), [x, y, L] = cur, kc = key(x, y, L), gc = g.get(kc); n++;
      const hh = h(x, y, L); if (hh < bh) { bh = hh; best = cur; }
      if (Math.hypot(x - tx, y - ty) <= rad && (tL === undefined || Math.abs(L - tL) <= (o.dz === undefined ? 1 : o.dz))) return this._build(came, cur, key);
      for (const nb of this.neighbours(x, y, L, o)) {
        const kn = key(nb[0], nb[1], nb[2]), gn = gc + nb[3];
        if (gn < (g.has(kn) ? g.get(kn) : 1e9)) { g.set(kn, gn); came.set(kn, [cur, nb[4] || false]); open.push([nb[0], nb[1], nb[2]], gn + h(nb[0], nb[1], nb[2])); }
      }
    }
    return o.partial && best ? this._build(came, best, key) : null;
  }
  _build(came, end, key) { const out = [[end[0], end[1], end[2], false]]; let k = key(end[0], end[1], end[2]); while (came.has(k)) { const [p, brk] = came.get(k); out[0][3] = brk; out.unshift([p[0], p[1], p[2], false]); k = key(p[0], p[1], p[2]); } return out; }
}
DQ.Nav = Nav;

/** a path follower for a body: walkTo(x, y, L), update(dt) -> the steering speed [vx, vy] and a hop; stuck handling */
class Walker {
  constructor(owner, o = {}) { this.o = owner; this.path = null; this.i = 0; this.goal = null; this.stuckT = 0; this.lastD = 1e9; this.repath = 0; this.opts = o; this.failed = false; }
  to(x, y, L, o = {}) {
    const nav = this.o.ctx.nav, b = this.o.body;
    const same = this.goal && this.goal.x === x && this.goal.y === y && this.goal.L === L;
    this.goal = { x, y, L, radius: o.radius === undefined ? .6 : o.radius }; if (!same) { this.stuckT = 0; this.lastD = 1e9; } this.repath = 2 + (this.o.uid || this.o.id || '').toString().length * .1; this.failed = false;
    this.path = nav.path(Math.floor(b.x / T), Math.floor(b.y / T), Math.floor((b.z + 1) / T), x, y, L, Object.assign({ radius: this.goal.radius, partial: true, loose: true }, this.opts, o));
    this.i = this.path && this.path.length > 1 ? 1 : 0;
    if (!this.path) this.failed = true;
    return !!this.path;
  }
  get done() { const b = this.o.body, g = this.goal; return !g || (Math.hypot(b.x - (g.x * T + 8), b.y - (g.y * T + 8)) < 6 + g.radius * T && Math.abs(Math.floor((b.z + 1) / T) - g.L) <= 2); }
  stop() { this.path = null; this.goal = null; }
  /** steer: returns { vx, vy, hop, brk: [x, y, L] when a wall is in the way (breaker), arrived, stuck } */
  steer(dt, speed) {
    const b = this.o.body, out = { vx: 0, vy: 0, hop: false, brk: null, arrived: false };
    if (!this.goal) { out.arrived = true; return out; }
    if (this.done) { out.arrived = true; this.path = null; return out; }
    this.repath -= dt;
    if ((!this.path && !this.failed) || this.repath <= 0) { this.to(this.goal.x, this.goal.y, this.goal.L, { radius: this.goal.radius }); }
    if (!this.path) { out.arrived = true; out.stuck = this.failed; return out; }
    const L = Math.floor((b.z + 1) / T);
    // skip the nodes already reached
    while (this.i < this.path.length) { const n = this.path[this.i], d = Math.hypot(n[0] * T + 8 - b.x, n[1] * T + 8 - b.y); if (d < 5 && Math.abs(L - n[2]) <= (n[2] > L ? 0 : 3)) { this.i++; this.stuckT = 0; } else break; }
    if (this.i >= this.path.length) { out.arrived = true; this.path = null; this.failed = true; this.repath = 1.5; return out; }   // the end of a partial path: as close as it gets
    const n = this.path[this.i], tx = n[0] * T + 8, ty = n[1] * T + 8, dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
    if (n[3]) out.brk = [n[0], n[1], n[2]];
    out.vx = dx / (d || 1) * speed; out.vy = dy / (d || 1) * speed;
    if (n[2] > L && d < 14 && b.onGround) out.hop = true;
    // stuck: no progress for a while
    const gd = Math.hypot(b.x - (this.goal.x * T + 8), b.y - (this.goal.y * T + 8));
    if (gd < this.lastD - 2) { this.lastD = gd; this.stuckT = 0; } else this.stuckT += dt;
    if (this.stuckT > 2.5 && b.onGround && !out.brk) out.hop = true;
    if (this.stuckT > 8) { this.stuckT = 0; this.lastD = 1e9; out.stuck = true; }
    return out;
  }
}
DQ.Walker = Walker;
})();
