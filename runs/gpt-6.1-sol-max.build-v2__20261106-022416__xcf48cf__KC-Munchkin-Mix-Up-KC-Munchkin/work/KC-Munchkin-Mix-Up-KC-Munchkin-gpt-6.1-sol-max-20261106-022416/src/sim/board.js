(function (M) {
  "use strict";
  const { E, DIRS, key } = M;
  class Board {
    constructor(data) {
      this.data = data;
      this.w = data.w;
      this.h = data.h;
      this.rows = data.rows.map((r) => r.split(""));
      this.orientation = 0;
      this.gate = data.gate;
      this.tunnels = data.tunnels || [];
      this.gateCells = this.gate
        ? [
            [this.gate.x, this.gate.y - 2],
            [this.gate.x + 2, this.gate.y],
            [this.gate.x, this.gate.y + 2],
            [this.gate.x - 2, this.gate.y],
          ]
        : [];
      this.grid = new E.Grid(this.w, this.h, {
        walkable: (x, y) => this.walk(x, y),
        diagonal: false,
      });
      this._cache = new Map();
    }
    baseWalk(x, y) {
      return !!this.rows[y] && this.rows[y][x] === ".";
    }
    gateIndex(x, y) {
      return this.gateCells.findIndex((p) => p[0] === x && p[1] === y);
    }
    inPen(x, y) {
      return this.gate && Math.abs(x - this.gate.x) < 2 && Math.abs(y - this.gate.y) < 2;
    }
    walk(x, y) {
      const i = this.gateIndex(x, y);
      return this.baseWalk(x, y) && (i < 0 || i === this.orientation);
    }
    neighbor(x, y, d) {
      if (!this.walk(x, y) || d < 0 || d > 3) return null;
      for (const t of this.tunnels) {
        if (x === t.a[0] && y === t.a[1] && d === t.ad)
          return { x: t.b[0], y: t.b[1], d, wrap: true };
        if (x === t.b[0] && y === t.b[1] && d === t.bd)
          return { x: t.a[0], y: t.a[1], d, wrap: true };
      }
      const [dx, dy] = DIRS[d],
        nx = x + dx,
        ny = y + dy;
      return this.walk(nx, ny) ? { x: nx, y: ny, d, wrap: false } : null;
    }
    edges(x, y) {
      return DIRS.map((_, d) => this.neighbor(x, y, d)).filter(Boolean);
    }
    setOrientation(i) {
      if (i !== this.orientation) {
        this.orientation = i;
        this._cache.clear();
      }
    }
    distances(x, y) {
      const id = key(x, y);
      if (this._cache.has(id)) return this._cache.get(id);
      const dist = new Map([[id, 0]]),
        q = [[x, y]];
      for (let i = 0; i < q.length; i++) {
        const [a, b] = q[i],
          n = dist.get(key(a, b)) + 1;
        for (const e of this.edges(a, b)) {
          const k = key(e.x, e.y);
          if (!dist.has(k)) {
            dist.set(k, n);
            q.push([e.x, e.y]);
          }
        }
      }
      this._cache.set(id, dist);
      return dist;
    }
    distance(a, b) {
      return this.distances(a[0], a[1]).get(key(b[0], b[1])) ?? Infinity;
    }
    path(a, b, options = {}) {
      const q = [a],
        prev = new Map([[key(...a), null]]);
      let found = false;
      for (let i = 0; i < q.length; i++) {
        const c = q[i];
        if (c[0] === b[0] && c[1] === b[1]) {
          found = true;
          break;
        }
        for (const e of this.edges(...c)) {
          const k = key(e.x, e.y);
          if (prev.has(k) || (options.avoid && options.avoid(e.x, e.y, i))) continue;
          prev.set(k, c);
          q.push([e.x, e.y]);
        }
      }
      if (!found) return [];
      const out = [b];
      let p = prev.get(key(...b));
      while (p) {
        out.push(p);
        p = prev.get(key(...p));
      }
      return out.reverse();
    }
    direction(a, b) {
      const e = this.edges(...a).find((e) => e.x === b[0] && e.y === b[1]);
      return e ? e.d : -1;
    }
    floorCells(noPen = false) {
      const out = [];
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++)
          if (this.walk(x, y) && (!noPen || (!this.inPen(x, y) && this.gateIndex(x, y) < 0)))
            out.push([x, y]);
      return out;
    }
    nearest(x, y, predicate = () => true) {
      return this.floorCells()
        .filter((p) => predicate(...p))
        .sort(
          (a, b) =>
            Math.abs(a[0] - x) + Math.abs(a[1] - y) - Math.abs(b[0] - x) - Math.abs(b[1] - y),
        )[0];
    }
  }
  class GraphMover extends E.GridMover {
    constructor(x, y, speed) {
      super({ cx: x, cy: y, speed });
      this.d = -1;
      this.want = -1;
      this.until = 0;
      this.wrap = false;
      this.travel = 0;
      this.segments = [];
    }
    place(cx, cy) {
      super.place(cx, cy);
      this.d = -1;
      this.want = -1;
      this.until = 0;
      this._u = 0;
      this._to = null;
      this.wrap = false;
      this.segments = [];
    }
    update(dt, board, wanted = -1, options = {}) {
      const now = options.time || 0;
      this.arrived = false;
      this.segments = [];
      if (wanted >= 0) {
        this.want = wanted;
        this.until = now + 0.15;
      }
      if (this.until < now || (wanted < 0 && this.want === this.d)) this.want = -1;
      if (this.moving && wanted === M.OPP(this.d)) {
        const old = [this.cx, this.cy];
        [this.cx, this.cy] = this._to;
        this._to = old;
        this._u = 1 - this._u;
        this.d = wanted;
        this.dir = DIRS[wanted].slice();
        this.x = this.cx + this.dir[0] * this._u;
        this.y = this.cy + this.dir[1] * this._u;
      }
      let left = dt,
        at = 0;
      for (let guard = 0; guard < 8 && left > 1e-10; guard++) {
        if (!this.moving) {
          const intent = options.choose ? options.choose(this) : this.want;
          let edge = board.neighbor(this.cx, this.cy, intent);
          if (!edge && wanted >= 0 && this.d >= 0) edge = board.neighbor(this.cx, this.cy, this.d);
          if (!edge || options.stop) break;
          this._to = [edge.x, edge.y];
          this.wrap = edge.wrap;
          this.d = edge.d;
          this.dir = DIRS[this.d].slice();
          this._u = 0;
          this.moving = true;
        }
        const take = Math.min(left, (1 - this._u) / this.speed),
          oldX = this.x,
          oldY = this.y;
        this._u = Math.min(1, this._u + take * this.speed);
        this.travel += take * this.speed;
        const [dx, dy] = DIRS[this.d];
        this.x = this.cx + dx * this._u;
        this.y = this.cy + dy * this._u;
        this.segments.push({ t0: at, t1: at + take, x0: oldX, y0: oldY, x1: this.x, y1: this.y });
        at += take;
        left -= take;
        if (this._u >= 1 - 1e-9) {
          [this.cx, this.cy] = this._to;
          this.x = this.cx;
          this.y = this.cy;
          this.moving = false;
          this.arrived = true;
          if (this.wrap && options.onTunnel) options.onTunnel();
        }
      }
      if (left > 1e-10)
        this.segments.push({ t0: at, t1: dt, x0: this.x, y0: this.y, x1: this.x, y1: this.y });
      return this.arrived;
    }
  }
  const atSegment = (s, t) => {
    const u = s.t1 > s.t0 ? (t - s.t0) / (s.t1 - s.t0) : 0;
    return [s.x0 + (s.x1 - s.x0) * u, s.y0 + (s.y1 - s.y0) * u];
  };
  M.encounter = (a, b, board, radius = 0.58) => {
    let earliest = Infinity;
    for (const p of a.segments)
      for (const q of b.segments) {
        const lo = Math.max(p.t0, q.t0),
          hi = Math.min(p.t1, q.t1);
        if (hi < lo) continue;
        const A = atSegment(p, lo),
          B = atSegment(q, lo),
          C = atSegment(p, hi),
          D = atSegment(q, hi);
        // Explicit horizontal seams share the same swept space at +/- board width.
        for (const shift of board.tunnels.length ? [-board.w, 0, board.w] : [0]) {
          const x = A[0] - B[0] + shift,
            y = A[1] - B[1],
            vx = C[0] - D[0] + shift - x,
            vy = C[1] - D[1] - y;
          const vv = vx * vx + vy * vy,
            u = vv ? M.clamp(-(x * vx + y * vy) / vv, 0, 1) : 0;
          if ((x + vx * u) ** 2 + (y + vy * u) ** 2 <= radius * radius)
            earliest = Math.min(earliest, lo + (hi - lo) * u);
        }
      }
    return earliest;
  };
  M.Board = Board;
  M.GraphMover = GraphMover;
})(globalThis.Mix);
