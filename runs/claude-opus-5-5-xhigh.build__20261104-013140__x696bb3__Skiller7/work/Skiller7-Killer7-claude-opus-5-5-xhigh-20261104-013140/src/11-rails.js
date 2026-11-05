/* RAILS: the rail graph of an area (nodes, edges with dense paths) and the walker that moves along it (§7.1).
 * A walk edge is two-way; ski, lift and jump edges go a → b. A node with two edges is passed through; three or more is a
 * junction where the walker stops and a branch is chosen; doors, exits, NPC stops and lifts stop it too. */
class RailPath {
  /** pts: [[x, y, z|null], ...] in units; zOf(x, y): the floor there; lerpZ: interpolate z between explicit points */
  constructor(pts, zOf, lerpZ) {
    // Catmull-Rom through the control points (2D), sampled every half metre; z from the floor or interpolated
    const P = pts, out = [];
    const ctrlLen = []; let acc = 0; ctrlLen.push(0);
    for (let i = 1; i < P.length; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); ctrlLen.push(acc); }
    const zAtCtrl = i => P[i][2] !== null && P[i][2] !== undefined ? P[i][2] : zOf(P[i][0], P[i][1]);
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const segL = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(1, Math.ceil(segL / 8));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        const x = P.length > 2 ? cr(p0[0], p1[0], p2[0], p3[0]) : p1[0] + (p2[0] - p1[0]) * t;
        const y = P.length > 2 ? cr(p0[1], p1[1], p2[1], p3[1]) : p1[1] + (p2[1] - p1[1]) * t;
        let z;
        if (lerpZ) z = zAtCtrl(i) + (zAtCtrl(i + 1) - zAtCtrl(i)) * t;
        else z = (k === 0 && P[i][2] !== null && P[i][2] !== undefined) ? P[i][2] : zOf(x, y);
        out.push([x, y, z]);
      }
    }
    const last = P[P.length - 1]; out.push([last[0], last[1], zAtCtrl(P.length - 1)]);
    this.pts = out; this.cum = [0];
    for (let i = 1; i < out.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1], out[i][2] - out[i - 1][2]));
    this.length = this.cum[this.cum.length - 1];
  }
  _seg(s) {
    const c = this.cum; s = clamp(s, 0, this.length);
    let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    return [lo, hi, c[hi] > c[lo] ? (s - c[lo]) / (c[hi] - c[lo]) : 0];
  }
  /** { x, y, z, yaw, slope } at distance s */
  at(s) {
    const [i, j, t] = this._seg(s), a = this.pts[i], b = this.pts[j];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], hl = Math.hypot(dx, dy) || 1e-6;
    return { x: a[0] + dx * t, y: a[1] + dy * t, z: a[2] + dz * t, yaw: Math.atan2(dy, dx), slope: dz / hl };
  }
}
S7.RailPath = RailPath;

class RailGraph {
  constructor(area, grid) {
    this.area = area; this.grid = grid;
    this.nodes = {}; this.edges = {}; this.adj = {};
    for (const id in area.nodes) {
      const n = area.nodes[id], t = S7.tw(n.t);
      const z = t[2] !== null ? t[2] : grid.floorAt(t[0], t[1]);
      this.nodes[id] = Object.assign({}, n, { id, x: t[0], y: t[1], z });
      this.adj[id] = [];
    }
    for (const e0 of area.edges) this.addEdge(e0);
  }
  addEdge(e0) {
    const e = Object.assign({ kind: 'walk' }, e0);
    e.id = e.id || (e.a + '-' + e.b);
    const A = this.nodes[e.a], B = this.nodes[e.b];
    if (!A || !B) throw new Error('rail ' + this.area.id + ': edge ' + e.id + ' has an unknown node');
    const pts = [[A.x, A.y, A.z]].concat((e.via || []).map(v => S7.tw(v)), [[B.x, B.y, B.z]]);
    const lift = e.kind === 'lift';
    e.path = new RailPath(pts, (x, y) => this.grid.floorAt(x, y), (lift && !e.ground) || e.kind === 'jump' || !!e.lerpZ);
    e.oneWay = e.oneWay !== undefined ? e.oneWay : e.kind !== 'walk' && e.kind !== 'stairs';
    e.length = e.path.length;
    if (e.length <= 0) throw new Error('rail ' + this.area.id + ': edge ' + e.id + ' has no length');
    this.edges[e.id] = e;
    this.adj[e.a].push(e.id); this.adj[e.b].push(e.id);
    return e;
  }
  removeEdge(id) { const e = this.edges[id]; if (!e) return; delete this.edges[id]; for (const n of [e.a, e.b]) this.adj[n] = this.adj[n].filter(x => x !== id); }
  /** the edges a walker standing on node id may take away from it: [{ edge, dir }] (dir +1 = a → b) */
  exits(id) {
    const out = [];
    for (const eid of this.adj[id] || []) {
      const e = this.edges[eid]; if (e.hidden) continue;
      if (e.a === id) out.push({ edge: e, dir: 1 });
      else if (!e.oneWay) out.push({ edge: e, dir: -1 });
    }
    return out;
  }
  /** the node a walker reaches at the end of edge e going dir */
  endNode(e, dir) { return dir > 0 ? e.b : e.a; }
  /** where a branch leaves node id: its yaw over the first 1.5 m */
  branchYaw(x, dir) {
    const e = x.edge, L = e.length, s0 = dir > 0 ? 0 : L, s1 = dir > 0 ? Math.min(L, 24) : Math.max(0, L - 24);
    const a = e.path.at(s0), b = e.path.at(s1);
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
  /** the point at s on edge e */
  at(e, s) { return e.path.at(s); }
}
S7.RailGraph = RailGraph;
