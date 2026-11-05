// 03-geometry: the geometry builder G. Brushes (quads, boxes, cylinders, lathes), engine shapes (E.shapeMesh), a
// transform stack, colliders, static lights, and the bake (per-vertex light and per-triangle tint) into batches the
// renderer draws. Also builds Meshes (local-space groups) for dynamic objects: boats, turrets, mechs, drones.
// Reads: TC.mat (02), math (00).

class Builder {
  constructor(env = {}) {
    this.env = env; this.parts = new Map(); this.colliders = []; this.lights = []; this.tf = [{ x: 0, y: 0, z: 0, yaw: 0, s: 1 }];
    this.tess = env.tess || 64; this.cell = 256; this.nextCol = 1;
  }
  // ---- transform stack
  push(x = 0, y = 0, z = 0, yaw = 0, s = 1) { const t = this.tf[this.tf.length - 1], c = Math.cos(t.yaw), sn = Math.sin(t.yaw); this.tf.push({ x: t.x + (x * c - y * sn) * t.s, y: t.y + (x * sn + y * c) * t.s, z: t.z + z * t.s, yaw: t.yaw + yaw, s: t.s * s }); return this; }
  pop() { this.tf.pop(); return this; }
  P(p) { const t = this.tf[this.tf.length - 1]; if (!t.yaw && t.s === 1) return [p[0] + t.x, p[1] + t.y, p[2] + t.z]; const c = Math.cos(t.yaw), s = Math.sin(t.yaw); return [t.x + (p[0] * c - p[1] * s) * t.s, t.y + (p[0] * s + p[1] * c) * t.s, t.z + p[2] * t.s]; }
  N(n) { const t = this.tf[this.tf.length - 1]; if (!t.yaw) return n; const c = Math.cos(t.yaw), s = Math.sin(t.yaw); return [n[0] * c - n[1] * s, n[0] * s + n[1] * c, n[2]]; }
  _part(matId, p) {
    const key = matId + '|' + Math.floor(p[0] / this.cell) + ',' + Math.floor(p[1] / this.cell);
    let b = this.parts.get(key); if (!b) { b = { mat: matId, pos: [], uv: [], nrm: [] }; this.parts.set(key, b); }
    return b;
  }
  // a triangle in world space (after the transform): points, uvs, a normal
  tri(a, b, c, ua, ub, uc, matId, n) {
    const A = this.P(a), B = this.P(b), C = this.P(c);
    let nn = n ? this.N(n) : vnorm(vcross(vsub(B, A), vsub(C, A)));
    const cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3, part = this._part(matId, [cx, cy]);
    part.pos.push(...A, ...B, ...C); part.uv.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]); part.nrm.push(nn[0], nn[1], nn[2]);
  }
  // a quad a-b-c-d (a->b is u, a->d is v; the front is cross(b-a, d-a)), tessellated, uv in world units along the edges
  quad(a, b, c, d, matId, o = {}) {
    const lu = vdist(a, b), lv = vdist(a, d), nu = o.tess === false ? 1 : Math.max(1, Math.ceil(lu / this.tess)), nv = o.tess === false ? 1 : Math.max(1, Math.ceil(lv / this.tess));
    const n = vnorm(vcross(vsub(b, a), vsub(d, a)));
    const u0 = o.u0 || 0, v0 = o.v0 || 0, su = o.fit ? 32 / (lu || 1) : (o.us || 1), sv = o.fit ? 32 / (lv || 1) : (o.vs || 1);
    const pt = (i, j) => { const s = i / nu, t = j / nv; return [lerp(lerp(a[0], b[0], s), lerp(d[0], c[0], s), t), lerp(lerp(a[1], b[1], s), lerp(d[1], c[1], s), t), lerp(lerp(a[2], b[2], s), lerp(d[2], c[2], s), t)]; };
    const uvp = (i, j) => [u0 + i / nu * lu * su, v0 + j / nv * lv * sv];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const p00 = pt(i, j), p10 = pt(i + 1, j), p11 = pt(i + 1, j + 1), p01 = pt(i, j + 1);
      this.tri(p00, p10, p11, uvp(i, j), uvp(i + 1, j), uvp(i + 1, j + 1), matId, n);
      this.tri(p00, p11, p01, uvp(i, j), uvp(i + 1, j + 1), uvp(i, j + 1), matId, n);
      if (o.double) { this.tri(p00, p11, p10, uvp(i, j), uvp(i + 1, j + 1), uvp(i + 1, j), matId, vmul(n, -1)); this.tri(p00, p01, p11, uvp(i, j), uvp(i, j + 1), uvp(i + 1, j + 1), matId, vmul(n, -1)); }
    }
  }
  // an axis-aligned box in the current frame. o: { top, side, bottom: true, skip: 'n s e w t', collide: true|'wood'..., fit, tag }
  box(x0, y0, z0, x1, y1, z1, matId, o = {}) {
    const top = o.top || matId, side = o.side || matId, sk = o.skip || '', q = (a, b, c, d, m) => this.quad(a, b, c, d, m, o);
    if (!sk.includes('t')) q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], top);
    if (o.bottom) q([x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0], o.bottomMat || side);
    if (!sk.includes('n')) q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], side);
    if (!sk.includes('s')) q([x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], side);
    if (!sk.includes('w')) q([x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], side);
    if (!sk.includes('e')) q([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], side);
    if (o.collide !== false) return this.collider([x0, y0, z0], [x1, y1, z1], typeof o.collide === 'string' ? o.collide : (o.surf || 'concrete'), o.tag);
    return null;
  }
  // a collider from two corners in the current frame (its world AABB)
  collider(a, b, surf = 'concrete', tag) {
    const pts = []; for (const x of [a[0], b[0]]) for (const y of [a[1], b[1]]) for (const z of [a[2], b[2]]) pts.push(this.P([x, y, z]));
    const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const p of pts) for (let i = 0; i < 3; i++) { bb[i] = Math.min(bb[i], p[i]); bb[i + 3] = Math.max(bb[i + 3], p[i]); }
    const c = { id: this.nextCol++, b: bb, surf, tag, on: true }; this.colliders.push(c); return c;
  }
  // a vertical cylinder or cone: radius r0 at z0, r1 at z1
  cyl(cx, cy, z0, z1, r0, r1, seg, matId, o = {}) {
    if (r1 === undefined || r1 === null) r1 = r0;
    const circ = 2 * Math.PI * Math.max(r0, r1);
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const u0 = i / seg * circ, u1 = (i + 1) / seg * circ;
      const A = [cx + c0 * r0, cy + s0 * r0, z0], B = [cx + c1 * r0, cy + s1 * r0, z0], C = [cx + c1 * r1, cy + s1 * r1, z1], D = [cx + c0 * r1, cy + s0 * r1, z1];
      if (o.inside) this.quad(B, A, D, C, matId, { u0: u0, tess: o.tess }); else this.quad(A, B, C, D, matId, { u0: u0, us: (u1 - u0) / (vdist(A, B) || 1), tess: o.tess });
      if (o.cap !== false && r1 > 0) this.tri([cx, cy, z1], D, C, [0, 0], [c0 * r1, s0 * r1], [c1 * r1, s1 * r1], o.capMat || matId, [0, 0, 1]);
      if (o.bottom && r0 > 0) this.tri([cx, cy, z0], B, A, [0, 0], [c1 * r0, s1 * r0], [c0 * r0, s0 * r0], o.capMat || matId, [0, 0, -1]);
    }
    if (o.collide) { const r = Math.max(r0, r1) * .85; return this.collider([cx - r, cy - r, z0], [cx + r, cy + r, z1], typeof o.collide === 'string' ? o.collide : 'metal', o.tag); }
    return null;
  }
  // a lathe: profile [[r, z], ...] turned round the z axis
  lathe(cx, cy, cz, prof, seg, matId) {
    for (let k = 0; k < prof.length - 1; k++) {
      const [r0, z0] = prof[k], [r1, z1] = prof[k + 1];
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const A = [cx + c0 * r0, cy + s0 * r0, cz + z0], B = [cx + c1 * r0, cy + s1 * r0, cz + z0], C = [cx + c1 * r1, cy + s1 * r1, cz + z1], D = [cx + c0 * r1, cy + s0 * r1, cz + z1];
        const u0 = i / seg * 32, u1 = (i + 1) / seg * 32;
        if (r0 > 0) this.tri(A, B, C, [u0, z0], [u1, z0], [u1, z1], matId);
        if (r1 > 0) this.tri(A, C, D, [u0, z0], [u1, z1], [u0, z1], matId);
      }
    }
  }
  // a horizontal cylinder along x (pipes, barrels lying down, rotors' hubs, torpedoes)
  pipe(x0, x1, cy, cz, r, seg, matId) {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const A = [x0, cy + Math.cos(a0) * r, cz + Math.sin(a0) * r], B = [x1, cy + Math.cos(a0) * r, cz + Math.sin(a0) * r], C = [x1, cy + Math.cos(a1) * r, cz + Math.sin(a1) * r], D = [x0, cy + Math.cos(a1) * r, cz + Math.sin(a1) * r];
      this.quad(A, B, C, D, matId, { tess: false });
    }
  }
  // an engine library shape (E.shapeMesh) at x, y, z, turned by facing, scaled
  shape(id, x, y, z, o = {}) {
    const m = E.shapeMesh(id, { params: o.params }); if (!m) return null;
    const f = o.facing || 0, s = o.scale || 1, c = Math.cos(f), sn = Math.sin(f);
    const T = p => [x + (p[0] * c - p[1] * sn) * s, y + (p[0] * sn + p[1] * c) * s, z + p[2] * s];
    for (const g of m.groups) {
      const id2 = g.key && E.MATERIALS[g.key] ? g.key : (g.mat && g.mat.base ? (typeof g.mat.base === 'string' ? g.mat.base : '#8a6a4a') : '#8a6a4a');
      const n = g.pos.length / 9;
      for (let i = 0; i < n; i++) {
        const P0 = T([g.pos[i * 9], g.pos[i * 9 + 1], g.pos[i * 9 + 2]]), P1 = T([g.pos[i * 9 + 3], g.pos[i * 9 + 4], g.pos[i * 9 + 5]]), P2 = T([g.pos[i * 9 + 6], g.pos[i * 9 + 7], g.pos[i * 9 + 8]]);
        const k = g.face ? 32 : 1;
        this.tri(P0, P1, P2, [g.uv[i * 6] * k, g.uv[i * 6 + 1] * k], [g.uv[i * 6 + 2] * k, g.uv[i * 6 + 3] * k], [g.uv[i * 6 + 4] * k, g.uv[i * 6 + 5] * k], id2);
      }
    }
    if (o.collide !== false) { const b = m.bounds; return this.collider([x + b[0] * s, y + b[1] * s, z + b[2] * s], [x + b[3] * s, y + b[4] * s, z + b[5] * s], o.surf || 'wood', o.tag); }
    return null;
  }
  // a static light: baked into the vertices and tints, x, y, z, radius, intensity, color
  light(x, y, z, r, k, color = '#ffb347') { const p = this.P([x, y, z]); this.lights.push({ p, r, k, c: hexRGB(color) }); }
  // bake: per-vertex light L (0..1+) and a per-triangle tint (r, g, b scaled by 128)
  bake() {
    const env = this.env, amb = env.ambient === undefined ? .4 : env.ambient, sun = env.sun || { dir: [-.3, .4, .85], k: .5, color: '#ffffff' };
    const sd = vnorm(sun.dir), sc = hexRGB(sun.color || '#ffffff'), ac = hexRGB(env.ambientColor || '#c8d0ff');
    const out = [];
    for (const part of this.parts.values()) {
      const n = part.pos.length / 9, M = mat(part.mat), pos = new Float32Array(part.pos), uv = new Float32Array(part.uv), nrm = new Float32Array(part.nrm), L = new Float32Array(n * 3), tint = new Uint32Array(n);
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < n * 3; i++) { cx += pos[i * 3]; cy += pos[i * 3 + 1]; cz += pos[i * 3 + 2]; }
      cx /= n * 3; cy /= n * 3; cz /= n * 3; let rad = 0;
      for (let i = 0; i < n * 3; i++) rad = Math.max(rad, Math.hypot(pos[i * 3] - cx, pos[i * 3 + 1] - cy, pos[i * 3 + 2] - cz));
      for (let t = 0; t < n; t++) {
        const N = [nrm[t * 3], nrm[t * 3 + 1], nrm[t * 3 + 2]], ns = Math.max(0, vdot(N, sd)) * sun.k;
        let tr = ac[0] * amb + sc[0] * ns, tg = ac[1] * amb + sc[1] * ns, tb = ac[2] * amb + sc[2] * ns;
        for (let v = 0; v < 3; v++) {
          const p = [pos[t * 9 + v * 3], pos[t * 9 + v * 3 + 1], pos[t * 9 + v * 3 + 2]];
          let l = amb + ns * (1 - (N[2] < -.5 ? .5 : 0));
          for (const li of this.lights) {
            const d = vsub(li.p, p), dl = vlen(d); if (dl >= li.r) continue;
            const f = (1 - dl / li.r), w = f * f * li.k * Math.max(.35, vdot(N, vmul(d, 1 / (dl || 1))));
            l += w; if (v === 0) { tr += li.c[0] * w; tg += li.c[1] * w; tb += li.c[2] * w; }
          }
          if (p[2] < 3 && N[2] > .5) l *= .92;
          L[t * 3 + v] = M.glow ? 1.2 : l;
        }
        const mx = Math.max(tr, tg, tb, 1), k = 128 / mx;
        tint[t] = M.glow ? 0 : ((tr * k * .7 + 128 * .3) & 255) | (((tg * k * .7 + 128 * .3) & 255) << 8) | (((tb * k * .7 + 128 * .3) & 255) << 16);
      }
      out.push({ mat: M, n, pos, uv, nrm, L, tint, sphere: [cx, cy, cz, rad] });
    }
    return out;
  }
  // a mesh for a dynamic object (local space, unbaked)
  mesh() {
    const groups = [];
    for (const part of this.parts.values()) groups.push({ mat: mat(part.mat), n: part.pos.length / 9, pos: new Float32Array(part.pos), uv: new Float32Array(part.uv), nrm: new Float32Array(part.nrm) });
    let r = 0; for (const g of groups) for (let i = 0; i < g.pos.length; i += 3) r = Math.max(r, Math.hypot(g.pos[i], g.pos[i + 1], g.pos[i + 2]));
    return { groups, r };
  }
}
TC.Builder = Builder;
// a mesh made by a function of a fresh builder
TC.makeMesh = fn => { const b = new Builder({}); b.cell = 1e9; fn(b); return b.mesh(); };
