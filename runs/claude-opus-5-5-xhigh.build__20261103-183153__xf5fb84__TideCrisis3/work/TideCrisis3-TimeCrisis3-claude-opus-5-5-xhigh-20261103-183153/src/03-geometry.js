/* 03-geometry: the geometry builder G (quads, boxes, cylinders, lathes, ramps, engine shapes through E.shapeMesh),
 * tessellation, colliders, static lights, and the bake that turns a stage's world into lit chunks for Rail3D.
 * A mesh: { groups: [{ tex, pos (9 floats a triangle), uv (6), nrm (3: the face normal), L (3: light per corner),
 * T (3: warm tint per corner) }], sphere: [x, y, z, r] }. Works headless (no canvas). */
const IMPACT = { planks: 'wood', crate: 'wood', pier: 'wood', 'pier-dk': 'wood', plywood: 'wood', timber: 'wood', oak: 'wood', walnut: 'wood', barrel: 'wood', iron: 'metal', steel: 'metal', 'steel-dk': 'metal', rust: 'metal', rusted: 'metal', metal: 'metal', grate: 'metal', hazard: 'metal', 'panel-steel': 'metal', 'panel-dark': 'metal', glass: 'glass', 'glass-lit': 'glass', water: 'water' };
function impactOf(mat) { if (!mat) return 'stone'; if (IMPACT[mat]) return IMPACT[mat]; if (/^corr|^hull|^paint|brass/.test(mat)) return 'metal'; if (/^sea|canal|sluice/.test(mat)) return 'water'; if (/lantern|awning|canvas|tarp|cloth|net/.test(mat)) return 'cloth'; return 'stone'; }
TC.impactOf = impactOf;

class Builder {
  constructor(o = {}) { this.groups = new Map(); this.colliders = o.colliders || []; this.lights = o.lights || []; this.maxEdge = o.maxEdge || 48; this.local = !!o.local; this._shapeMats = 0; this.tag = null; }
  _g(mat) { let g = this.groups.get(mat); if (!g) this.groups.set(mat, g = { tex: mat, pos: [], uv: [], nrm: [], tag: [] }); return g; }
  /** one triangle (a, b, c counter-clockwise from the front), with uvs */
  tri(mat, a, b, c, ua, ub, uc) {
    const g = this._g(mat), e1 = V3.sub(b, a), e2 = V3.sub(c, a), n = V3.norm(V3.cross(e1, e2));
    g.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); g.uv.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]); g.nrm.push(n[0], n[1], n[2]); g.tag.push(this.tag);
  }
  /** a quad a, b, c, d counter-clockwise from the front, tessellated so no edge is longer than maxEdge; o.uv: 'world'
   *  (default: wall u along the face, v up; lids x, y), 'face' (0..1 across), or [[u, v] x 4]; o.us: uv scale */
  quad(mat, a, b, c, d, o = {}) {
    const n = V3.norm(V3.cross(V3.sub(b, a), V3.sub(d, a))), lid = Math.abs(n[2]) > .7, T = reg('material', mat), face = o.uv === 'face' || (T && T.face) || mat === 'crate';
    const lu = V3.dist(a, b), lv = V3.dist(a, d), me = o.maxEdge || this.maxEdge, nu = Math.max(1, Math.ceil(lu / me)), nv = Math.max(1, Math.ceil(lv / me));
    let t = lid ? [1, 0, 0] : V3.norm([n[1], -n[0], 0]); if (!lid && Math.hypot(n[0], n[1]) < 1e-6) t = [1, 0, 0];
    const s = o.us || 1;
    const UV = p => Array.isArray(o.uv) ? null : face ? null : lid ? [(p[0] + (o.uo || 0)) * s, p[1] * s] : [(V3.dot(p, t) + (o.uo || 0)) * s, (p[2] + (o.vo || 0)) * s];
    const P = (i, j) => { const u = i / nu, v = j / nv, ab = V3.lerp(a, b, u), dc = V3.lerp(d, c, u); return V3.lerp(ab, dc, v); };
    const Q = (i, j) => { const u = i / nu, v = j / nv; if (Array.isArray(o.uv)) { const q = o.uv, x0 = lerp(q[0][0], q[1][0], u), y0 = lerp(q[0][1], q[1][1], u), x1 = lerp(q[3][0], q[2][0], u), y1 = lerp(q[3][1], q[2][1], u); return [lerp(x0, x1, v), lerp(y0, y1, v)]; } if (face) return [u, v]; return UV(P(i, j)); };
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const p00 = P(i, j), p10 = P(i + 1, j), p11 = P(i + 1, j + 1), p01 = P(i, j + 1);
      this.tri(mat, p00, p10, p11, Q(i, j), Q(i + 1, j), Q(i + 1, j + 1));
      this.tri(mat, p00, p11, p01, Q(i, j), Q(i + 1, j + 1), Q(i, j + 1));
    }
  }
  /** an axis box from (x0, y0, z0) to (x1, y1, z1); o: { top, bottom, side (materials), yaw (about its middle), skip:
   *  'tbnsew' faces to leave out, solid (true), impact, us, id } -> its collider (or null) */
  box(mat, x0, y0, z0, x1, y1, z1, o = {}) {
    if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, yaw = o.yaw || 0, cs = Math.cos(yaw), sn = Math.sin(yaw), sk = o.skip || '';
    const R = (x, y, z) => yaw ? [cx + (x - cx) * cs - (y - cy) * sn, cy + (x - cx) * sn + (y - cy) * cs, z] : [x, y, z];
    const c = [R(x0, y0, z0), R(x1, y0, z0), R(x1, y1, z0), R(x0, y1, z0), R(x0, y0, z1), R(x1, y0, z1), R(x1, y1, z1), R(x0, y1, z1)];
    const side = o.side || mat, q = { us: o.us, maxEdge: o.maxEdge, uv: o.uv };
    if (!sk.includes('t')) this.quad(o.top || mat, c[4], c[5], c[6], c[7], q);
    if (!sk.includes('b')) this.quad(o.bottom || mat, c[3], c[2], c[1], c[0], q);
    if (!sk.includes('n')) this.quad(o.north || side, c[0], c[1], c[5], c[4], q);   // -y face
    if (!sk.includes('s')) this.quad(o.south || side, c[2], c[3], c[7], c[6], q);   // +y face
    if (!sk.includes('w')) this.quad(o.west || side, c[3], c[0], c[4], c[7], q);    // -x face
    if (!sk.includes('e')) this.quad(o.east || side, c[1], c[2], c[6], c[5], q);    // +x face
    if (o.solid === false) return null;
    return this.collider([x0, y0, z0, x1, y1, z1], { yaw, impact: o.impact || impactOf(o.side || mat), id: o.id, cover: o.cover });
  }
  collider(box, o = {}) {
    const c = { box, yaw: o.yaw || 0, cx: (box[0] + box[3]) / 2, cy: (box[1] + box[4]) / 2, impact: o.impact || 'stone', id: o.id || null, alive: true, cover: !!o.cover };
    this.colliders.push(c); return c;
  }
  /** a vertical cylinder at (x, y, z), radius r, height h; o: { r2 (top radius), seg, top, bottom, caps, solid } */
  cyl(mat, x, y, z, r, h, o = {}) {
    const seg = o.seg || Math.max(6, Math.min(20, Math.round(r * .8) * 2)), r2 = o.r2 === undefined ? r : o.r2;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const A = [x + c0 * r, y + s0 * r, z], B = [x + c1 * r, y + s1 * r, z], C = [x + c1 * r2, y + s1 * r2, z + h], D = [x + c0 * r2, y + s0 * r2, z + h];
      const u0 = i / seg * TAU * r, u1 = (i + 1) / seg * TAU * r;
      this.quad(mat, A, B, C, D, { uv: [[u0, z], [u1, z], [u1, z + h], [u0, z + h]], maxEdge: o.maxEdge });
      if (o.caps !== false && r2 > 0) this.tri(o.top || mat, [x, y, z + h], D, C, [x, y], [D[0], D[1]], [C[0], C[1]]);
      if (o.caps !== false && o.bottom !== false) this.tri(o.bottom || mat, [x, y, z], B, A, [x, y], [B[0], B[1]], [A[0], A[1]]);
    }
    if (o.solid) { const k = Math.min(r, r2 || r) * .8 + Math.abs(r - (r2 || r)) * .3; return this.collider([x - k, y - k, z, x + k, y + k, z + h], { impact: o.impact || impactOf(mat), id: o.id }); }
    return null;
  }
  /** a horizontal cylinder from a to b (pipes, logs, barrels on their side), radius r */
  tube(mat, a, b, r, o = {}) {
    const seg = o.seg || 10, d = V3.norm(V3.sub(b, a)), up = Math.abs(d[2]) > .9 ? [1, 0, 0] : [0, 0, 1], e1 = V3.norm(V3.cross(d, up)), e2 = V3.cross(e1, d), L = V3.dist(a, b);
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU, o0 = V3.add(V3.mul(e1, Math.cos(a0) * r), V3.mul(e2, Math.sin(a0) * r)), o1 = V3.add(V3.mul(e1, Math.cos(a1) * r), V3.mul(e2, Math.sin(a1) * r));
      this.quad(mat, V3.add(a, o0), V3.add(b, o0), V3.add(b, o1), V3.add(a, o1), { uv: [[0, a0 * r], [L, a0 * r], [L, a1 * r], [0, a1 * r]] });
      if (o.caps !== false) { this.tri(mat, a, V3.add(a, o0), V3.add(a, o1), [0, 0], [1, 0], [0, 1]); this.tri(mat, b, V3.add(b, o1), V3.add(b, o0), [0, 0], [0, 1], [1, 0]); }
    }
  }
  /** a profile [[r, z], ...] turned about z at (x, y, z0) */
  lathe(mat, x, y, z0, prof, o = {}) {
    const seg = o.seg || 12;
    for (let k = 0; k + 1 < prof.length; k++) for (let i = 0; i < seg; i++) {
      const [ra, za] = prof[k], [rb, zb] = prof[k + 1], a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
      const A = [x + Math.cos(a0) * ra, y + Math.sin(a0) * ra, z0 + za], B = [x + Math.cos(a1) * ra, y + Math.sin(a1) * ra, z0 + za], C = [x + Math.cos(a1) * rb, y + Math.sin(a1) * rb, z0 + zb], D = [x + Math.cos(a0) * rb, y + Math.sin(a0) * rb, z0 + zb];
      const u0 = a0 * Math.max(ra, rb), u1 = a1 * Math.max(ra, rb);
      if (ra > 0 || rb > 0) { if (ra === 0) this.tri(mat, A, C, D, [u0, za], [u1, zb], [u0, zb]); else if (rb === 0) this.tri(mat, A, B, C, [u0, za], [u1, za], [u1, zb]); else this.quad(mat, A, B, C, D, { uv: [[u0, za], [u1, za], [u1, zb], [u0, zb]] }); }
    }
  }
  /** a ramp (stairs' slope, a gangway) from (x0, y0) at z0 to (x1, y1) at z1, w wide */
  ramp(mat, x0, y0, z0, x1, y1, z1, w, o = {}) {
    const d = V3.norm([x1 - x0, y1 - y0, 0]), s = [-d[1] * w / 2, d[0] * w / 2, 0];
    this.quad(mat, [x0 + s[0], y0 + s[1], z0], [x0 - s[0], y0 - s[1], z0], [x1 - s[0], y1 - s[1], z1], [x1 + s[0], y1 + s[1], z1], o);
  }
  /** stairs as boxes */
  stairs(mat, x0, y0, z0, x1, y1, z1, w, steps = 6) {
    const d = [x1 - x0, y1 - y0], L = Math.hypot(d[0], d[1]), ux = d[0] / L, uy = d[1] / L, h = (z1 - z0) / steps, l = L / steps;
    for (let i = 0; i < steps; i++) {
      const cx = x0 + ux * l * (i + .5), cy = y0 + uy * l * (i + .5);
      this.box(mat, cx - Math.abs(ux) * l / 2 - Math.abs(uy) * w / 2, cy - Math.abs(uy) * l / 2 - Math.abs(ux) * w / 2, z0, cx + Math.abs(ux) * l / 2 + Math.abs(uy) * w / 2, cy + Math.abs(uy) * l / 2 + Math.abs(ux) * w / 2, z0 + h * (i + 1), { solid: false });
    }
  }
  /** one of the engine's shapes (E.shapeMesh): placed at x, y, z, turned to o.facing (radians; pi/2 = its front south, as
   *  r.shape), o.scale; o.solid adds its box as a collider */
  shape(id, x, y, z, o = {}) {
    const m = E.shapeMesh(id, { params: o.params, mats: o.mats }); if (!m) return null;
    const a = (o.facing === undefined ? Math.PI / 2 : o.facing) - Math.PI / 2, c = Math.cos(a), s = Math.sin(a), k = o.scale || 1;
    const W = (px, py, pz) => [x + (px * c - py * s) * k, y + (px * s + py * c) * k, z + pz * k];
    for (const g of m.groups) {
      let mat = typeof g.key === 'string' && reg('material', g.key) && !g.key.startsWith('m') ? g.key : null;
      if (!mat) { const mid = 'tcx-' + (typeof id === 'string' ? id : 'shape') + '-' + g.key; if (!E.MATERIALS[mid]) E.MATERIALS[mid] = g.mat; if (!reg('material', mid)) def('material', mid, { m: mid, glow: g.mat && g.mat.glow ? 1 : 0, face: g.face }); mat = mid; }
      if (g.face && !reg('material', mat).face) { const fid = mat + '-face'; if (!reg('material', fid)) def('material', fid, { m: reg('material', mat).m || mat, face: true }); mat = fid; }
      for (let i = 0; i < g.pos.length; i += 9) {
        const A = W(g.pos[i], g.pos[i + 1], g.pos[i + 2]), B = W(g.pos[i + 3], g.pos[i + 4], g.pos[i + 5]), C = W(g.pos[i + 6], g.pos[i + 7], g.pos[i + 8]);
        const j = i / 9 * 6, ua = [g.uv[j], g.uv[j + 1]], ub = [g.uv[j + 2], g.uv[j + 3]], uc = [g.uv[j + 4], g.uv[j + 5]];
        // keep the given normal's side as the front
        const n0 = [g.nrm[i] * c - g.nrm[i + 1] * s, g.nrm[i] * s + g.nrm[i + 1] * c, g.nrm[i + 2]], cr = V3.cross(V3.sub(B, A), V3.sub(C, A));
        if (V3.dot(cr, n0) >= 0) this.tri(mat, A, B, C, ua, ub, uc); else this.tri(mat, A, C, B, ua, uc, ub);
      }
    }
    if (o.solid) { const b = m.bounds, cs = [W(b[0], b[1], 0), W(b[3], b[1], 0), W(b[3], b[4], 0), W(b[0], b[4], 0)], xs = cs.map(q => q[0]), ys = cs.map(q => q[1]); return this.collider([Math.min(...xs), Math.min(...ys), z + b[2] * k, Math.max(...xs), Math.max(...ys), z + b[5] * k], { impact: o.impact || 'wood', id: o.id, cover: o.cover }); }
    return null;
  }
  /** a static light for the bake: radius, strength (adds to the light band), warm: how much it tints */
  light(x, y, z, radius, k = .6, warm = 1) { this.lights.push({ x, y, z, r: radius, k, warm }); }
  /** the finished triangles as one mesh (local or world space), unlit */
  mesh() {
    const groups = [], b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const g of this.groups.values()) {
      if (!g.pos.length) continue;
      for (let i = 0; i < g.pos.length; i += 3) for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], g.pos[i + k]); b[k + 3] = Math.max(b[k + 3], g.pos[i + k]); }
      groups.push({ tex: g.tex, pos: new Float32Array(g.pos), uv: new Float32Array(g.uv), nrm: new Float32Array(g.nrm), L: new Float32Array(g.pos.length / 3), T: new Float32Array(g.pos.length / 3), tag: g.tag });
    }
    const c = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2];
    return { groups, sphere: [c[0], c[1], c[2], Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2], bounds: b };
  }
}
TC.Builder = Builder;

/** the light at a point with a face normal, from the environment and static lights -> [L, T] */
function lightAt(env, lights, x, y, z, nx, ny, nz) {
  const s = env.sun || { dir: [0, 0, 1], k: .4 }, sd = s.dir, sl = Math.hypot(sd[0], sd[1], sd[2]) || 1;
  let L = env.ambient + s.k * Math.max(0, (nx * sd[0] + ny * sd[1] + nz * sd[2]) / sl), T = 0;
  if (nz > .7) L += env.skyK || .06; if (nz < -.7) L -= .08;   // lids catch the sky; undersides are darker
  if (Math.abs(nz) < .5 && z < 5) L -= .1 * (1 - z / 5);        // contact darkening where a wall meets the floor
  for (const l of lights) {
    const dx = l.x - x, dy = l.y - y, dz = l.z - z, d = Math.hypot(dx, dy, dz); if (d >= l.r) continue;
    const f = 1 - d / l.r, ndl = d > 1e-3 ? (dx * nx + dy * ny + dz * nz) / d : 1, k = l.k * f * f * clamp(.35 + .65 * ndl, 0, 1);
    L += k; T += k * l.warm;
  }
  return [L, Math.min(1, T)];
}
TC.lightAt = lightAt;
/** light a mesh in place (world space) */
function bakeMesh(mesh, env, lights) {
  for (const g of mesh.groups) {
    const P = g.pos, N = g.nrm;
    for (let t = 0, nt = N.length / 3; t < nt; t++) for (let k = 0; k < 3; k++) {
      const i = t * 9 + k * 3, r = lightAt(env, lights, P[i], P[i + 1], P[i + 2], N[t * 3], N[t * 3 + 1], N[t * 3 + 2]);
      g.L[t * 3 + k] = r[0]; g.T[t * 3 + k] = r[1];
    }
  }
  return mesh;
}
TC.bakeMesh = bakeMesh;
/** bin a world builder's triangles into chunks of `size` units (each a lit mesh with a bounding sphere) */
function bakeWorld(builder, env, size = 256) {
  const whole = builder.mesh(); bakeMesh(whole, env, builder.lights);
  const bins = new Map();
  for (const g of whole.groups) {
    const nt = g.nrm.length / 3;
    for (let t = 0; t < nt; t++) {
      const i = t * 9, cx = (g.pos[i] + g.pos[i + 3] + g.pos[i + 6]) / 3, cy = (g.pos[i + 1] + g.pos[i + 4] + g.pos[i + 7]) / 3, cz = (g.pos[i + 2] + g.pos[i + 5] + g.pos[i + 8]) / 3;
      const key = Math.floor(cx / size) + ',' + Math.floor(cy / size) + ',' + Math.floor(cz / size);
      let bin = bins.get(key); if (!bin) bins.set(key, bin = new Map());
      let bg = bin.get(g.tex); if (!bg) bin.set(g.tex, bg = { tex: g.tex, pos: [], uv: [], nrm: [], L: [], T: [] });
      for (let k = 0; k < 9; k++) bg.pos.push(g.pos[i + k]);
      for (let k = 0; k < 6; k++) bg.uv.push(g.uv[t * 6 + k]);
      for (let k = 0; k < 3; k++) { bg.nrm.push(g.nrm[t * 3 + k]); bg.L.push(g.L[t * 3 + k]); bg.T.push(g.T[t * 3 + k]); }
    }
  }
  const chunks = [];
  for (const bin of bins.values()) {
    const groups = [], b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const bg of bin.values()) {
      for (let i = 0; i < bg.pos.length; i += 3) for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], bg.pos[i + k]); b[k + 3] = Math.max(b[k + 3], bg.pos[i + k]); }
      groups.push({ tex: bg.tex, pos: new Float32Array(bg.pos), uv: new Float32Array(bg.uv), nrm: new Float32Array(bg.nrm), L: new Float32Array(bg.L), T: new Float32Array(bg.T) });
    }
    chunks.push({ groups, sphere: [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2, Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2] });
  }
  let tris = 0; for (const c of chunks) for (const g of c.groups) tris += g.nrm.length / 3;
  return { chunks, colliders: builder.colliders, lights: builder.lights, tris };
}
TC.bakeWorld = bakeWorld;

/** a 3x4 transform from a position, yaw (about z), pitch (about the local right axis), roll and scale */
function mat34(x, y, z, yaw = 0, pitch = 0, roll = 0, s = 1) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  // R = Rz(yaw) * Ry(-pitch) * Rx(roll); the local frame: x forward, y to the right (south when facing east), z up;
  // pitch > 0 lifts the nose, roll > 0 turns the top toward +y
  const m00 = cy * cp, m01 = -cy * sp * sr - sy * cr, m02 = -cy * sp * cr + sy * sr;
  const m10 = sy * cp, m11 = -sy * sp * sr + cy * cr, m12 = -sy * sp * cr - cy * sr;
  const m20 = sp, m21 = cp * sr, m22 = cp * cr;
  return [m00 * s, m01 * s, m02 * s, x, m10 * s, m11 * s, m12 * s, y, m20 * s, m21 * s, m22 * s, z];
}
function mulMat34(A, B) {
  const r = new Array(12);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) r[i * 4 + j] = A[i * 4] * B[j] + A[i * 4 + 1] * B[4 + j] + A[i * 4 + 2] * B[8 + j];
    r[i * 4 + 3] = A[i * 4] * B[3] + A[i * 4 + 1] * B[7] + A[i * 4 + 2] * B[11] + A[i * 4 + 3];
  }
  return r;
}
function xform(M, p) { return [M[0] * p[0] + M[1] * p[1] + M[2] * p[2] + M[3], M[4] * p[0] + M[5] * p[1] + M[6] * p[2] + M[7], M[8] * p[0] + M[9] * p[1] + M[10] * p[2] + M[11]]; }
TC.mat34 = mat34; TC.mulMat34 = mulMat34; TC.xform = xform;
