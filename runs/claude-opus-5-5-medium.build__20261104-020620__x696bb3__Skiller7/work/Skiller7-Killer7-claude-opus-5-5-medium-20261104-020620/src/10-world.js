/* SKILLER7 — the world the sim knows: a LevelGrid (from the same rows and legend the 3D world is built from, or the
 * same terrain height function) for floors, walls, line of sight and flow fields; the rail graph (nodes, edges, paths);
 * the camera director's shots (authored, or placed automatically where a clear line to the hero exists). */
const LEGEND0 = { '#': { wall: 48 }, w: { wall: 12 }, P: { pillar: 56 }, '.': {}, ' ': { pit: true }, t: { torch: true } };

/** rows built from rectangles: a designer's tool for room-and-corridor levels.
 *  ops: ['fill', x0, y0, x1, y1, ch] (inclusive), ['set', x, y, ch], ['row', y, x0, str] */
function buildRows(w, h, ops, base = '#') {
  const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(base));
  for (const op of ops) {
    if (op[0] === 'fill') { const [, x0, y0, x1, y1, ch] = op; for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) g[y][x] = ch; }
    else if (op[0] === 'set') g[op[2]][op[1]] = op[3];
    else if (op[0] === 'row') { const [, y, x0, str] = op; for (let i = 0; i < str.length; i++) if (str[i] !== '?') g[y][x0 + i] = str[i]; }
  }
  return g.map(r => r.join(''));
}
S7.buildRows = buildRows;

class LevelGrid {
  constructor(area) {
    this.area = area; this.blocks = (area.blocks || []).map(b => b.map((v, i) => v * (i === 2 || i === 5 ? M : M)));
    const W3 = area.world || {};
    if (W3.terrain) {
      this.terrain = W3.terrain; this.w = Math.ceil(W3.terrain.size / M); this.h = this.w;
    } else {
      const L = W3.level, rows = L.rows; this.rows = rows; this.h = rows.length; this.w = rows[0].length;
      const leg = Object.assign({}, LEGEND0, L.legend || {});
      this.F = new Float32Array(this.w * this.h); this.Tp = new Float32Array(this.w * this.h); this.S = new Array(this.w * this.h); this.pit = new Uint8Array(this.w * this.h);
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const ch = rows[y][x] || '#', e = leg[ch] || {}, k = y * this.w + x;
        const fl = e.floor || 0;
        this.F[k] = fl; this.S[k] = e.stairs ? e : null;
        if (e.pit) { this.pit[k] = 1; this.F[k] = -400; this.Tp[k] = -400; }
        else if (e.wall !== undefined) this.Tp[k] = fl + e.wall; else if (e.pillar !== undefined) this.Tp[k] = fl + e.pillar;
        else if (e.platform !== undefined) { this.Tp[k] = e.platform; this.F[k] = e.pit ? -400 : fl; this.plat = this.plat || {}; this.plat[k] = e.platform; }
        else this.Tp[k] = fl;
      }
    }
  }
  /** the floor's height under (x, y) in units: what a walker stands on */
  floor(x, y) {
    if (this.terrain) return this.terrain.height(x, y);
    const cx = Math.floor(x / M), cy = Math.floor(y / M);
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return 0;
    const k = cy * this.w + cx, s = this.S[k];
    if (s) { const fx = x / M - cx, fy = y / M - cy, from = s.from || 0, to = s.floor || 16, u = s.stairs === 'n' ? 1 - fy : s.stairs === 's' ? fy : s.stairs === 'e' ? fx : 1 - fx; return from + (to - from) * u; }
    return this.F[k];
  }
  /** the top of whatever stands at (x, y): a wall's top, else the floor */
  top(x, y) {
    if (this.terrain) return this.terrain.height(x, y);
    const cx = Math.floor(x / M), cy = Math.floor(y / M);
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return 9999;
    const k = cy * this.w + cx; return this.S[k] ? this.floor(x, y) : this.Tp[k];
  }
  wall(cx, cy) { if (this.terrain) return false; if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return true; const k = cy * this.w + cx; return this.Tp[k] > this.F[k] + 10 && !this.S[k] && !(this.plat && this.plat[k]); }
  /** solid at a point? walls (below their tops), the ground, the extra blockers */
  solid(x, y, z) {
    if (this.terrain) { if (z < this.terrain.height(x, y)) return true; }
    else {
      const cx = Math.floor(x / M), cy = Math.floor(y / M);
      if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return true;
      const k = cy * this.w + cx;
      if (this.plat && this.plat[k] !== undefined) { const p = this.plat[k]; if (z < p && z > p - 4) return true; if (z < this.F[k]) return true; }
      else if (z < (this.S[k] ? this.floor(x, y) : this.Tp[k])) return true;
    }
    for (const b of this.blocks) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]) return true;
    return false;
  }
  /** march a ray: the distance to the first solid point, or max */
  ray(o, d, max) {
    const st = this.terrain ? 6 : 3;
    for (let t = st; t < max; t += st) if (this.solid(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t)) return t - st * .5;
    return max;
  }
  los(a, b) { const d = V.sub(b, a), L = V.len(d); if (L < 1) return true; return this.ray(a, V.norm(d), L) >= L - 1; }
  walkable(cx, cy) { if (this.terrain) return true; if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return false; const k = cy * this.w + cx; return !this.pit[k] && (this.Tp[k] <= this.F[k] + 10 || this.S[k]); }
  /** a breadth-first flow field toward a tile: dist[k], rebuilt when the target tile changes */
  flow(tx, ty) {
    if (this.terrain) return null;
    const cx = clamp(Math.floor(tx / M), 0, this.w - 1), cy = clamp(Math.floor(ty / M), 0, this.h - 1), key = cy * this.w + cx;
    if (this._flowKey === key && this._flow) return this._flow;
    const D = this._flow || new Int32Array(this.w * this.h); D.fill(-1);
    const q = [key]; D[key] = 0;
    for (let i = 0; i < q.length; i++) {
      const k = q[i], x = k % this.w, y = (k / this.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (!this.walkable(nx, ny)) continue; const nk = ny * this.w + nx;
        if (D[nk] >= 0 || Math.abs(this.F[nk] - this.F[k]) > 20 && !this.S[nk] && !this.S[k]) continue;
        D[nk] = D[k] + 1; q.push(nk);
      }
    }
    this._flow = D; this._flowKey = key; return D;
  }
  /** which way from (x, y) toward the flow's target: [dx, dy] unit, or null to go straight */
  flowDir(x, y, tx, ty) {
    const D = this.flow(tx, ty); if (!D) return null;
    const cx = Math.floor(x / M), cy = Math.floor(y / M), k = cy * this.w + cx;
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h || D[k] < 0) return null;
    if (D[k] <= 1) return null;
    let best = null, bd = D[k];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const nk = ny * this.w + nx;
      if (D[nk] < 0 || D[nk] >= bd) continue;
      if (dx && dy && (D[cy * this.w + nx] < 0 || D[ny * this.w + cx] < 0)) continue;   // (no cutting corners)
      bd = D[nk]; best = [(nx + .5) * M - x, (ny + .5) * M - y];
    }
    if (!best) return null; const l = Math.hypot(best[0], best[1]) || 1; return [best[0] / l, best[1] / l];
  }
}
S7.LevelGrid = LevelGrid;

/* ---- paths: a polyline (optionally Catmull-Rom smoothed), sampled densely, measured ---- */
function makePath(pts, smooth) {
  let P = pts;
  if (smooth && pts.length > 2) {
    P = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 24));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, c = j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        P.push([c(0), c(1), c(2)]);
      }
    }
    P.push(pts[pts.length - 1]);
  }
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const len = cum[cum.length - 1] || 1;
  return {
    pts: P, len,
    at(s) {
      s = clamp(s, 0, len); let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
      const a = P[lo], b = P[hi], seg = cum[hi] - cum[lo] || 1, u = (s - cum[lo]) / seg;
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, z: a[2] + (b[2] - a[2]) * u, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
  };
}
S7.makePath = makePath;

/** load an area's rail graph: nodes and edges in engine units, paths measured, cameras placed */
function buildRails(area, grid) {
  const T2U = (t, zDef) => { const x = t[0] * M, y = t[1] * M; return [x, y, t[2] !== undefined ? t[2] * M : (zDef !== undefined ? zDef : grid.floor(x, y))]; };
  const nodes = {}, edges = [], adj = {};
  for (const id in area.nodes) { const n = area.nodes[id], p = T2U(n.t); nodes[id] = Object.assign({}, n, { id, x: p[0], y: p[1], z: p[2], fixedZ: n.t[2] !== undefined }); adj[id] = []; }
  for (const e0 of area.edges || []) {
    const A = nodes[e0.a], B = nodes[e0.b]; if (!A || !B) throw new Error(area.id + ': edge ' + e0.a + '-' + e0.b + ' has an unknown node');
    const kind = e0.kind || 'walk', id = e0.id || e0.a + '-' + e0.b;
    const pts = [[A.x, A.y, A.z], ...(e0.via || []).map(v => T2U(v)), [B.x, B.y, B.z]];
    const path = makePath(pts, (e0.via || []).length > 0 && e0.smooth !== false);
    const e = Object.assign({}, e0, { id, kind, A, B, path, len: path.len, oneWay: e0.oneWay ?? (kind === 'ski' || kind === 'lift' || kind === 'jump') });
    e.followZ = (kind === 'walk' || kind === 'stairs' || kind === 'ski' || kind === 'lift' && e0.ground) && !e0.bridge;
    edges.push(e); adj[e.a].push(e); adj[e.b].push(e);
  }
  const R2 = { area, grid, nodes, edges, adj, byId: Object.fromEntries(edges.map(e => [e.id, e])) };
  for (const e of edges) { e.shots = (e.cams || autoCams(R2, e, 1)).map(s => normShot(s)); e.rshots = e.oneWay ? e.shots : (e.rcams || (e.cams ? e.cams : autoCams(R2, e, -1))).map(s => normShot(s)); }
  return R2;
}
S7.buildRails = buildRails;

/** where on an edge (s from a): { x, y, z, angle }; walk and ski edges hug the floor; jump edges fly an arc */
function edgePos(R2, e, s) {
  const p = e.path.at(s);
  if (e.followZ) p.z = R2.grid.floor(p.x, p.y);
  if (e.kind === 'jump') { const u = clamp(s / e.len, 0, 1), za = e.A.z, zb = e.B.z; p.z = za + (zb - za) * u + Math.sin(u * Math.PI) * (e.apex || 2.5) * M; }
  return p;
}
S7.edgePos = edgePos;

/* ---- camera shots ---- */
function normShot(s) {
  const o = Object.assign({ s: [0, 1], shot: 'follow', fov: 52, blend: 0 }, s);
  const m = v => v && Array.isArray(v) ? [v[0] * M, v[1] * M, (v[2] || 0) * M] : v;
  if (o.at) o.atU = m(o.at); if (Array.isArray(o.look)) o.lookU = m(o.look); if (o.path) o.pathU = o.path.map(m);
  return o;
}
const FOLLOW = { back: 3.6, side: 1.1, up: 1.9, ahead: 2.5, fov: 55, lag: .12 };
/** automatic fixed shots for an edge: segments of about 10 m, each from the first candidate spot with a clear line
 *  to the hero all along it (behind and high to one side; ahead looking back; wide from the side), else a follow shot */
function autoCams(R2, e, dir) {
  const G2 = R2.grid, L = e.len, out = [];
  if (e.kind === 'ski' || e.kind === 'lift' || e.kind === 'jump' || G2.terrain) {
    const n = Math.max(1, Math.round(L / (24 * M)));
    for (let i = 0; i < n; i++) {
      const s0 = i / n, s1 = (i + 1) / n;
      if (i % 3 === 1 && e.kind === 'ski') {   // a fixed side-on shot now and then on the slope (a floodlit stretch)
        const sm = (dir > 0 ? (s0 + s1) / 2 : 1 - (s0 + s1) / 2) * L, P = edgePos(R2, e, sm), sd = i % 2 ? 1 : -1, a = P.angle + Math.PI / 2 * sd;
        const at = [P.x + Math.cos(a) * 9 * M, P.y + Math.sin(a) * 9 * M, P.z + 4 * M]; at[2] = Math.max(at[2], G2.floor(at[0], at[1]) + 3 * M);
        out.push({ s: [s0, s1], shot: 'fixed', at: [at[0] / M, at[1] / M, at[2] / M], look: 'hero', fov: 48 });
      } else out.push({ s: [s0, s1], shot: 'follow', back: e.kind === 'lift' ? 4.5 : 4.2, side: (i % 2 ? -1 : 1) * 1.4, up: e.kind === 'lift' ? 1.6 : 2.2, ahead: 4, fov: 58, lag: .15 });
    }
    return out;
  }
  const n = Math.max(1, Math.round(L / (10 * M)));
  for (let i = 0; i < n; i++) {
    const s0 = i / n, s1 = (i + 1) / n;
    const sa = (dir > 0 ? s0 : 1 - s0) * L, sb = (dir > 0 ? s1 : 1 - s1) * L;
    const P0 = edgePos(R2, e, sa), P1 = edgePos(R2, e, sb);
    let f = [P1.x - P0.x, P1.y - P0.y]; const fl = Math.hypot(f[0], f[1]);
    if (fl < 1) { const a = P0.angle + (dir < 0 ? Math.PI : 0); f = [Math.cos(a), Math.sin(a)]; } else f = [f[0] / fl, f[1] / fl];
    const r = [-f[1], f[0]], side = ((hashStr(e.id) + i) % 2) ? 1 : -1;
    const mid = [(P0.x + P1.x) / 2, (P0.y + P1.y) / 2, (P0.z + P1.z) / 2];
    const cand = [];
    for (const sd of [side, -side]) {
      cand.push([P0.x - f[0] * 3.2 * M + r[0] * sd * 2.6 * M, P0.y - f[1] * 3.2 * M + r[1] * sd * 2.6 * M, P0.z + 3.1 * M, 50]);
      cand.push([P1.x + f[0] * 2.4 * M + r[0] * sd * 2.4 * M, P1.y + f[1] * 2.4 * M + r[1] * sd * 2.4 * M, P1.z + 2.4 * M, 50]);
      cand.push([mid[0] + r[0] * sd * 5 * M, mid[1] + r[1] * sd * 5 * M, mid[2] + 4 * M, 56]);
      cand.push([P0.x - f[0] * 2 * M + r[0] * sd * 1.2 * M, P0.y - f[1] * 2 * M + r[1] * sd * 1.2 * M, P0.z + 2.2 * M, 56]);
    }
    let pick = null;
    for (const c of cand) {
      if (!openAt(G2, c)) continue;
      let ok = true;
      for (let k = 0; k <= 4 && ok; k++) { const s = sa + (sb - sa) * k / 4, P = edgePos(R2, e, s); if (!G2.los([c[0], c[1], c[2]], [P.x, P.y, P.z + 1.2 * M])) ok = false; }
      if (ok) { pick = c; break; }
    }
    if (pick) out.push({ s: [s0, s1], shot: 'fixed', at: [pick[0] / M, pick[1] / M, pick[2] / M], look: 'hero', fov: pick[3] });
    else out.push(Object.assign({ s: [s0, s1], shot: 'follow' }, FOLLOW));
  }
  return out;
}
const openAt = (G2, c) => { for (const [dx, dy, dz] of [[0, 0, 0], [6, 0, 0], [-6, 0, 0], [0, 6, 0], [0, -6, 0], [0, 0, 6], [0, 0, -6]]) if (G2.solid(c[0] + dx, c[1] + dy, c[2] + dz)) return false; return true; };

/** the camera director: which shot covers the walker now, and its pose { x, y, z, yaw, pitch, roll, fov } */
class Director {
  constructor() { this.pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fov: 55 }; this.shotKey = null; this.cuts = 0; this.lagP = null; this.override = null; this.aimK = 0; }
  /** the shot for the walker: e (edge), s, dir */
  shotFor(e, s, dir) {
    const list = dir < 0 ? e.rshots : e.shots, u = dir < 0 ? 1 - s / e.len : s / e.len;
    for (let i = 0; i < list.length; i++) { const sh = list[i]; if (u >= sh.s[0] - 1e-6 && u <= sh.s[1] + 1e-6) return [sh, i]; }
    return [list[list.length - 1], list.length - 1];
  }
  /** a pose for a shot, looking at hero point H (feet), facing f (radians) */
  poseOf(sh, H, f, grid, e, s, dir) {
    const look = sh.lookU ? sh.lookU : [H[0], H[1], H[2] + (sh.lookUp ?? 1.1) * M];
    let at;
    if (sh.shot === 'fixed') at = sh.atU;
    else if (sh.shot === 'crane') { const u = e ? clamp(((dir < 0 ? 1 - s / e.len : s / e.len) - sh.s[0]) / Math.max(1e-6, sh.s[1] - sh.s[0]), 0, 1) : 0; at = [sh.atU[0], sh.atU[1], lerp(sh.zFrom, sh.zTo, u) * M]; }
    else if (sh.shot === 'dolly') { const u = e ? clamp(((dir < 0 ? 1 - s / e.len : s / e.len) - sh.s[0]) / Math.max(1e-6, sh.s[1] - sh.s[0]), 0, 1) : 0, P = sh.pathU, k = u * (P.length - 1), i = Math.min(P.length - 2, Math.floor(k)), t = k - i; at = [lerp(P[i][0], P[i + 1][0], t), lerp(P[i][1], P[i + 1][1], t), lerp(P[i][2], P[i + 1][2], t)]; }
    else if (sh.shot === 'orbit') { const a = sh.t0 + (this.t || 0) * (sh.speed || .2); at = [sh.center[0] + Math.cos(a) * sh.radius, sh.center[1] + Math.sin(a) * sh.radius, sh.center[2] + sh.height]; look[0] = sh.center[0]; look[1] = sh.center[1]; look[2] = sh.center[2] + (sh.lookUp || 0); }
    else if (sh.shot === 'pov') { at = [H[0], H[1], H[2] + 1.6 * M]; const yaw = f; return { x: at[0], y: at[1], z: at[2], yaw, pitch: -.05, roll: 0, fov: sh.fov || 62 }; }
    else {   // follow
      const c = Math.cos(f), sn = Math.sin(f), back = (sh.back ?? FOLLOW.back) * M, side = (sh.side ?? FOLLOW.side) * M, up = (sh.up ?? FOLLOW.up) * M, ahead = (sh.ahead ?? FOLLOW.ahead) * M;
      const head = [H[0], H[1], H[2] + 1.3 * M];
      at = [H[0] - c * back - sn * side, H[1] - sn * back + c * side, H[2] + up];
      look[0] = H[0] + c * ahead; look[1] = H[1] + sn * ahead; look[2] = H[2] + 1.1 * M;
      if (grid) {   // pull in when a wall gets between, never under the floor
        const d = V.sub(at, head), L = V.len(d), t = grid.ray(head, V.norm(d), L);
        if (t < L) at = V.add(head, V.norm(d), Math.max(8, t - 6));
        at[2] = Math.max(at[2], grid.floor(at[0], at[1]) + 1.2 * M);
      }
    }
    const dx = look[0] - at[0], dy = look[1] - at[1], dz = look[2] - at[2];
    return { x: at[0], y: at[1], z: at[2], yaw: Math.atan2(dy, dx), pitch: Math.atan2(dz, Math.hypot(dx, dy)), roll: sh.roll || 0, fov: sh.fov || 55 };
  }
  /** project a world point through the pose: [x, y] in -1..1 (y down), or null behind; aspect = width / height */
  project(p, aspect = 16 / 9, pose = this.pose) {
    const f = V.dir(pose.yaw, pose.pitch), r = V.norm(V.cross(f, [0, 0, 1])), u = V.cross(r, f), d = [p[0] - pose.x, p[1] - pose.y, p[2] - pose.z];
    const z = V.dot(d, f); if (z <= 1) return null;
    const th = Math.tan((pose.fov || 55) * Math.PI / 360);
    return [V.dot(d, r) / (z * th * aspect), -V.dot(d, u) / (z * th)];
  }
}
S7.Director = Director;
