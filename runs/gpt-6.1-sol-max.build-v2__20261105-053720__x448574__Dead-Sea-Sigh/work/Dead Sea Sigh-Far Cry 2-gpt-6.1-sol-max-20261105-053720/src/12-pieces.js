  /* =====================================================================
   * STRUCTURES: one merged mesh for every outpost (buildings, containers, towers, barriers, ladders, cables), each
   * piece a box (or a cylinder) with a kind for its pattern; the fixed blocks under them; and the working parts drawn
   * every frame (doors, supply bins), ladders and ziplines to ride. Laid out in metres round each outpost's centre
   * ===================================================================== */
  const GEO = { P: [], N: [], C: [], K: [], I: [] }, solids = [], doors = [], bins = [], ladders = [], zips = [], spawns = [], dummies = [];
  const K_CONCRETE = 0, K_METAL = 1, K_RIBS = 2, K_PLANKS = 3, K_BAGS = 4, K_PLAIN = 5;
  const linC = new Map(), srgb = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
  const linOf = h => { let v = linC.get(h); if (!v) { v = E.hex(h).map(c => srgb(c / 255)); linC.set(h, v); } return v; };
  let zLo = 0, zHi = 1;   // the box being built (its corners shade darker toward its foot)
  /** a quad: centre c, half-sides u and v, outward normal n (engine units), into the merged mesh (three's metres) */
  function quad(c, u, v, n, color, kind) {
    const base = GEO.P.length / 3, col = linOf(color), top = n[2] > .5, bot = n[2] < -.5;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = c[0] + u[0] * a + v[0] * b, y = c[1] + u[1] * a + v[1] * b, z = c[2] + u[2] * a + v[2] * b, k = top ? 1.06 : bot ? .7 : lerp(.72, 1, clamp((z - zLo) / Math.max(1, Math.min(48, zHi - zLo)), 0, 1));
      GEO.P.push(x / M, z / M, y / M); GEO.N.push(n[0], n[2], n[1]); GEO.C.push(col[0] * k, col[1] * k, col[2] * k); GEO.K.push(kind);
    }
    const p = GEO.P, i = base * 3, e1 = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]], e2 = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
    const dn = (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * n[2] + (e1[0] * e2[1] - e1[1] * e2[0]) * n[1];
    if (dn > 0) GEO.I.push(base, base + 1, base + 2, base, base + 2, base + 3); else GEO.I.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  /** a box: its centre and three half-axes (vectors, engine units): any way it turns or tilts */
  function boxAx(c, a, b, h, color, kind) {
    const ez = Math.abs(a[2]) + Math.abs(b[2]) + Math.abs(h[2]); zLo = c[2] - ez; zHi = c[2] + ez;
    for (const [X, Y, Z] of [[a, b, h], [b, h, a], [h, a, b]]) {
      const l = Math.hypot(X[0], X[1], X[2]) || 1;
      for (const s of [1, -1]) quad([c[0] + X[0] * s, c[1] + X[1] * s, c[2] + X[2] * s], Y, Z, [X[0] / l * s, X[1] / l * s, X[2] / l * s], color, kind);
    }
  }
  /** a cylinder from c0 to c1 (engine units), radius r, seg sides, capped */
  function cylAx(c0, c1, r, seg, color, kind) {
    const d = [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]], L = Math.hypot(...d), f = d.map(v => v / L);
    const p = Math.abs(f[2]) < .9 ? [-f[1], f[0], 0] : [1, 0, 0], pl = Math.hypot(...p), u = p.map(v => v / pl), w = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]];
    zLo = Math.min(c0[2], c1[2]) - r; zHi = Math.max(c0[2], c1[2]) + r;
    const at = (k, e) => { const a = k / seg * TAU, cs = Math.cos(a) * r, sn = Math.sin(a) * r, o = e ? c1 : c0; return [o[0] + u[0] * cs + w[0] * sn, o[1] + u[1] * cs + w[1] * sn, o[2] + u[2] * cs + w[2] * sn]; };
    for (let k = 0; k < seg; k++) {
      const a = (k + .5) / seg * TAU, n = [u[0] * Math.cos(a) + w[0] * Math.sin(a), u[1] * Math.cos(a) + w[1] * Math.sin(a), u[2] * Math.cos(a) + w[2] * Math.sin(a)];
      const p0 = at(k, 0), p1 = at(k + 1, 0), p2 = at(k + 1, 1), c = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2, (p0[2] + p2[2]) / 2];
      quad(c, [(p1[0] - p0[0]) / 2, (p1[1] - p0[1]) / 2, (p1[2] - p0[2]) / 2], [d[0] / 2, d[1] / 2, d[2] / 2], n, color, kind);
    }
    for (const e of [0, 1]) for (let k = 0; k < seg; k += 2) {   // the caps, as quads round the middle (seg even)
      const o = e ? c1 : c0, a = at(k, e), b = at(k + 1, e), c = at(k + 2, e);
      quadPts(o, a, b, c, e ? f : f.map(v => -v), color, kind);
    }
  }
  /** a quad from four corners in order (a fan's slice) */
  function quadPts(p0, p1, p2, p3, n, color, kind) {
    const base = GEO.P.length / 3, col = linOf(color);
    for (const q of [p0, p1, p2, p3]) { GEO.P.push(q[0] / M, q[2] / M, q[1] / M); GEO.N.push(n[0], n[2], n[1]); GEO.C.push(col[0], col[1], col[2]); GEO.K.push(kind); }
    const p = GEO.P, i = base * 3, e1 = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]], e2 = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
    const dn = (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * n[2] + (e1[0] * e2[1] - e1[1] * e2[0]) * n[1];
    if (dn > 0) GEO.I.push(base, base + 1, base + 2, base, base + 2, base + 3); else GEO.I.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  /* ---- the outposts' frame: P = { x, y, z (units), c, s (its turn) }; local metres (east, south, up) to world units ---- */
  const frameOf = (o, yaw) => ({ x: o.x, y: o.y, z: o.z, yaw, c: Math.cos(yaw), s: Math.sin(yaw) });
  const atP = (P, lx, ly) => [P.x + (lx * P.c - ly * P.s) * M, P.y + (lx * P.s + ly * P.c) * M];
  /** a box in an outpost: centre (lx, ly) metres, its foot lz metres above the pad, w x d x h metres, turned lyaw; solid:
   *  a fixed block too (true, or a height in metres for a lower one) */
  function B(P, lx, ly, lz, w, d, h, lyaw, color, kind, solid = true) {
    const [x, y] = atP(P, lx, ly), a = P.yaw + lyaw, c = Math.cos(a), s = Math.sin(a), z0 = P.z + lz * M;
    boxAx([x, y, z0 + h * M / 2], [c * w * M / 2, s * w * M / 2, 0], [-s * d * M / 2, c * d * M / 2, 0], [0, 0, h * M / 2], color, kind);
    if (solid) solids.push({ x, y, z: z0, w: w * M, d: d * M, h: (solid === true ? h : solid) * M, yaw: a });
  }
  /** a box between two points of the outpost (metres, lz up): a brace, a rafter, a sloped roof; across: its width's way */
  function beam(P, a, b, w, t, color, kind, up = [0, 0, 1]) {
    const pa = [...atP(P, a[0], a[1]), P.z + a[2] * M], pb = [...atP(P, b[0], b[1]), P.z + b[2] * M], c = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
    const d = [(pb[0] - pa[0]) / 2, (pb[1] - pa[1]) / 2, (pb[2] - pa[2]) / 2], L = Math.hypot(...d), f = d.map(v => v / L);
    const u0 = [up[0] * P.c - up[1] * P.s, up[0] * P.s + up[1] * P.c, up[2]], dot = u0[0] * f[0] + u0[1] * f[1] + u0[2] * f[2];
    let u = [u0[0] - f[0] * dot, u0[1] - f[1] * dot, u0[2] - f[2] * dot]; const ul = Math.hypot(...u) || 1; u = u.map(v => v / ul);
    const s = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]];
    boxAx(c, d, s.map(v => v * w * M / 2), u.map(v => v * t * M / 2), color, kind);
  }
  const CYL = (P, lx, ly, lz, r, h, color, kind, seg = 12, solid = true) => {
    const [x, y] = atP(P, lx, ly); cylAx([x, y, P.z + lz * M], [x, y, P.z + (lz + h) * M], r * M, seg, color, kind);
    if (solid) solids.push({ x, y, z: P.z + lz * M, r: r * M, h: h * M });
  };
  /* ---- the pieces ---- */
  const CON = '#bdb4a2', CON2 = '#9a9284', TRIM = '#5a5650', STEEL = '#3a3e44', GALV = '#9aa09a', WOOD = '#9a7448', BAG = '#b8a478', TARP = '#5f6e4c';
  const OPEN = { door: [1.2, 2.2, 0], window: [1.3, 1.05, 1.0], gap: [1.5, 2.35, 0], bay: [4, 4.2, 0] };   // an opening's width, height and sill (metres)
  /** a wall from (ax, ay) to (bx, by) (local metres), h tall, t thick, with openings [{ at (metres from a), kind }] */
  function wall(P, ax, ay, bx, by, h, t, color, kind, openings = [], lz = 0) {
    const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L, yaw = Math.atan2(dy, dx), at = s => [ax + dx * s, ay + dy * s];
    let s0 = 0; const ops = openings.slice().sort((p, q) => p.at - q.at);
    const piece = (s1, s2, z1, z2) => { if (s2 - s1 < .02 || z2 - z1 < .02) return; const [cx, cy] = at((s1 + s2) / 2); B(P, cx, cy, lz + z1, s2 - s1, t, z2 - z1, yaw, color, kind); };
    for (const op of ops) {
      const [w, oh, sill] = OPEN[op.kind], a = op.at - w / 2, b = op.at + w / 2;
      piece(s0, a, 0, h); piece(a, b, sill + oh, h); if (sill) piece(a, b, 0, sill);
      const [cx, cy] = at(op.at), [x, y] = atP(P, cx, cy);
      if (op.kind === 'door') { const [hx, hy] = atP(P, ...at(a)); doors.push({ x, y, z: P.z + lz * M, hx, hy, yaw: P.yaw + yaw, w: w * M, h: oh * M, t: .09 * M, color: op.color || '#6a5a48', state: 'shut', ang: 0, vel: 0, want: 0, block: null, deb: null }); }
      s0 = b;
    }
    piece(s0, L, 0, h);
  }
  /** a single-room building: w x d metres, h tall, flat roof with a low parapet; walls: { n, s, e, w: [openings] } */
  function shack(P, lx, ly, w, d, h, walls, color = CON, roof = CON2, parapet = true) {
    const x0 = lx - w / 2, x1 = lx + w / 2, y0 = ly - d / 2, y1 = ly + d / 2, t = .22;
    B(P, lx, ly, -.3, w + .3, d + .3, .32, 0, CON2, K_CONCRETE, false);   // the slab it stands on
    wall(P, x0, y0, x1, y0, h, t, color, K_CONCRETE, walls.n); wall(P, x1, y1, x0, y1, h, t, color, K_CONCRETE, walls.s);
    wall(P, x1, y0 + t / 2, x1, y1 - t / 2, h, t, color, K_CONCRETE, walls.e); wall(P, x0, y1 - t / 2, x0, y0 + t / 2, h, t, color, K_CONCRETE, walls.w);
    B(P, lx, ly, h, w + .2, d + .2, .24, 0, roof, K_CONCRETE);
    if (parapet) { for (const yy of [y0, y1]) B(P, lx, yy, h + .24, w + .2, .2, .38, 0, roof, K_CONCRETE); for (const xx of [x0, x1]) B(P, xx, ly, h + .24, .2, d - .2, .38, 0, roof, K_CONCRETE); }
    B(P, lx, y1 + .1, h - .55, w + .2, .14, .14, 0, TRIM, K_PLAIN, false);   // a trim band and a rain pipe
    beam(P, [x1 + .12, y1 + .12, 0], [x1 + .12, y1 + .12, h], .12, .12, TRIM, K_PLAIN);
  }
  /** a shipping container, 6.1 x 2.45 x 2.6 m, its foot lz up; open: both ends open to walk through */
  function container(P, lx, ly, lz, lyaw, color, open = false) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw), L = 6.1, Wd = 2.45, Hh = 2.6, t = .1, at = (u, v) => [lx + u * c - v * s, ly + u * s + v * c];
    if (!open) B(P, lx, ly, lz, L, Wd, Hh, lyaw, color, K_RIBS);
    else {
      for (const v of [-1, 1]) { const [x, y] = at(0, v * (Wd / 2 - t / 2)); B(P, x, y, lz, L, t, Hh, lyaw, color, K_RIBS); }
      B(P, lx, ly, lz + Hh - t, L, Wd, t, lyaw, color, K_RIBS); B(P, lx, ly, lz, L, Wd, .12, lyaw, '#4a3a2a', K_PLANKS, .12);
      for (const v of [-1, 1]) { const [x, y] = at(L / 2 + .55, v * (Wd / 2 + .05)), a = lyaw + v * 1.2; B(P, x + Math.cos(a) * .05, y, lz + .04, 1.2, .08, Hh - .08, a, E.shade(color, -.08), K_RIBS, false); }
    }
    for (const u of [-1, 1]) { const [x, y] = at(u * (L / 2 - .06), 0); B(P, x, y, lz, .14, Wd + .04, Hh + .02, lyaw, E.shade(color, -.25), K_PLAIN, false); }   // the frame's ends
  }
  /** a ladder up to z1 metres (its rails at the foot (lx, ly), climbed facing lyaw), with its record for climbing */
  function ladder(P, lx, ly, z0, z1, lyaw) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw);
    for (const v of [-1, 1]) beam(P, [lx - s * v * .24, ly + c * v * .24, z0], [lx - s * v * .24, ly + c * v * .24, z1 + .9], .06, .06, STEEL, K_PLAIN);
    for (let z = z0 + .3; z < z1 + .1; z += .3) beam(P, [lx - s * .24, ly + c * .24, z], [lx + s * .24, ly - c * .24, z], .045, .045, GALV, K_PLAIN);
    const [x, y] = atP(P, lx, ly), a = P.yaw + lyaw;
    ladders.push({ x, y, z0: P.z + z0 * M, z1: P.z + z1 * M, yaw: a, top: [x + Math.cos(a) * 1.1 * M, y + Math.sin(a) * 1.1 * M, P.z + z1 * M] });
  }
  /** a watch tower: four legs, braces, a platform h metres up with railings (a gap where the ladder comes up), a roof;
   *  returns its zipline anchor (world units) */
  function tower(P, lx, ly, lyaw, h = 8) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw), at = (u, v) => [lx + u * c - v * s, ly + u * s + v * c], R = 1.45;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [x, y] = at(u * R, v * R); B(P, x, y, 0, .26, .26, h + 3.2, lyaw, WOOD, K_PLANKS); }
    for (let k = 0; k < 4; k++) for (const z of [0, h / 2]) {   // the braces: an X on each side
      const [u0, v0] = [[-1, -1], [1, -1], [1, 1], [-1, 1]][k], [u1, v1] = [[1, -1], [1, 1], [-1, 1], [-1, -1]][k], a = at(u0 * R, v0 * R), b = at(u1 * R, v1 * R);
      beam(P, [a[0], a[1], z + .3], [b[0], b[1], z + h / 2 - .2], .14, .1, WOOD, K_PLANKS); beam(P, [b[0], b[1], z + .3], [a[0], a[1], z + h / 2 - .2], .14, .1, WOOD, K_PLANKS);
    }
    B(P, lx, ly, h - .2, 3.3, 3.3, .22, lyaw, WOOD, K_PLANKS);
    const rail = (u0, v0, u1, v1) => { const a = at(u0, v0), b = at(u1, v1), L = Math.hypot(b[0] - a[0], b[1] - a[1]); B(P, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, h, L, .12, 1.0, Math.atan2(b[1] - a[1], b[0] - a[0]), WOOD, K_PLANKS); };
    rail(-1.6, -1.6, 1.6, -1.6); rail(-1.6, 1.6, 1.6, 1.6); rail(-1.6, -1.6, -1.6, -.6); rail(-1.6, .6, -1.6, 1.6); rail(1.6, -1.6, 1.6, -.5);   // (the ladder comes up at +u, +v; the zipline leaves from the gap at -u)
    B(P, lx, ly, h + 3.0, 3.8, 3.8, .16, lyaw, GALV, K_METAL);
    const [lx2, ly2] = at(1.95, .9); ladder(P, lx2, ly2, 0, h, lyaw + Math.PI);
    const [ax, ay] = atP(P, ...at(-2.05, 0)); beam(P, [...at(-1.45, 0), h + 2.95], [...at(-2.15, 0), h + 2.95], .12, .12, STEEL, K_PLAIN); return [ax, ay, P.z + (h + 2.85) * M];
  }
  /** concrete barrier (jersey), 3 m long, 0.82 m tall: vault over it */
  const barrier = (P, lx, ly, lyaw) => { B(P, lx, ly, 0, 3, .62, .3, lyaw, CON, K_CONCRETE, .82); B(P, lx, ly, .3, 3, .3, .52, lyaw, CON, K_CONCRETE, false); };
  const sandbags = (P, lx, ly, lyaw, len = 4, h = 1.05) => B(P, lx, ly, 0, len, .7, h, lyaw, BAG, K_BAGS);
  const crate = (P, lx, ly, lz, lyaw, k = 1.2) => B(P, lx, ly, lz, k, k, k, lyaw, WOOD, K_PLANKS);
  const bin = (P, lx, ly, lz, lyaw) => { const [x, y] = atP(P, lx, ly); bins.push({ x, y, z: P.z + lz * M, yaw: P.yaw + lyaw, open: 0, used: false }); solids.push({ x, y, z: P.z + lz * M, w: 1.1 * M, d: .62 * M, h: .66 * M, yaw: P.yaw + lyaw }); };
  const spawn = (o, P, lx, ly, lz = 0, o2 = {}) => { const [x, y] = atP(P, lx, ly); spawns.push(Object.assign({ op: o.id, x, y, z: P.z + lz * M }, o2)); };
  /** a fuel tank on its side, on two saddles */
  function tank(P, lx, ly, lyaw, L = 5, r = 1.2) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw), a = [...atP(P, lx - c * L / 2, ly - s * L / 2)], b = [...atP(P, lx + c * L / 2, ly + s * L / 2)];
    cylAx([a[0], a[1], P.z + (r + .35) * M], [b[0], b[1], P.z + (r + .35) * M], r * M, 14, '#d8d4c8', K_PLAIN);
    for (const u of [-.32, .32]) B(P, lx + c * u * L, ly + s * u * L, 0, .4, r * 1.6, .6, lyaw, STEEL, K_PLAIN, false);
    solids.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: P.z, w: L * M, d: r * 2 * M, h: (r * 2 + .35) * M, yaw: P.yaw + lyaw });
  }

