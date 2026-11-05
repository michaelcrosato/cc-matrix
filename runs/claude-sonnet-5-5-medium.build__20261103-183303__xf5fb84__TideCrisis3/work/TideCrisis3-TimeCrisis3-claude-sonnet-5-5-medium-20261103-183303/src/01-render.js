// 01-render.js — "Rail3D": perspective math, rays, and a painter's-order polygon renderer for boxes, sky, sea,
// rig billboards and particles, drawn through the engine's px primitives into the game buffer.
// Owns: camera basis/projection, ray tests, world drawing. Reads: nothing from the Sim (it draws plain data).
const R3 = {};
// Camera basis for yaw psi (0 = east/+x, +pi/2 = +y) and pitch theta: f forward, r right, u up.
R3.basis = (yaw, pitch, roll = 0) => {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  return { f: [cp * cy, cp * sy, sp], r: [-sy, cy, 0], u: [-sp * cy, -sp * sy, cp], roll };
};
R3.setCam = (c, W, H) => {
  const b = R3.basis(c.yaw, c.pitch, c.roll || 0), fov = (c.fov || 55) * DEG;
  R3.cam = { x: c.x, y: c.y, z: c.z, b, W, H, cx: W / 2, cy: H / 2, F: (H / 2) / Math.tan(fov / 2), tanH: Math.tan(fov / 2), cr: Math.cos(b.roll), sr: Math.sin(b.roll) };
  return R3.cam;
};
// project a world point -> [sx, sy, depth] (depth = view z), or null behind the near plane
R3.proj = (x, y, z, out) => {
  const C = R3.cam, b = C.b, dx = x - C.x, dy = y - C.y, dz = z - C.z;
  const vz = dx * b.f[0] + dy * b.f[1] + dz * b.f[2];
  let vx = dx * b.r[0] + dy * b.r[1], vy = dx * b.u[0] + dy * b.u[1] + dz * b.u[2];
  if (C.sr) { const rx = vx * C.cr - vy * C.sr; vy = vx * C.sr + vy * C.cr; vx = rx; }
  if (vz < 1) return null;
  const k = C.F / vz; out = out || [0, 0, 0]; out[0] = C.cx + vx * k; out[1] = C.cy - vy * k; out[2] = vz; return out;
};
// view-space point (no divide) for clipping
R3.toView = (x, y, z) => {
  const C = R3.cam, b = C.b, dx = x - C.x, dy = y - C.y, dz = z - C.z;
  let vx = dx * b.r[0] + dy * b.r[1], vy = dx * b.u[0] + dy * b.u[1] + dz * b.u[2];
  if (C.sr) { const rx = vx * C.cr - vy * C.sr; vy = vx * C.sr + vy * C.cr; vx = rx; }
  return [vx, vy, dx * b.f[0] + dy * b.f[1] + dz * b.f[2]];
};
R3.fromView = (v) => { const C = R3.cam; return [v[0] * C.F / v[2] + C.cx, C.cy - v[1] * C.F / v[2]]; };
// polygon (array of view-space points) clipped to z >= near, returned as screen points
R3.clipPoly = (vs, near = 3) => {
  const out = [];
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i], b = vs[(i + 1) % vs.length], ain = a[2] >= near, bin = b[2] >= near;
    if (ain) out.push(a);
    if (ain !== bin) { const t = (near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]); }
  }
  return out.map(R3.fromView);
};
// the world-space ray through aim (ax, ay) in view units (ax in [-A, A], ay in [-1, 1], y up) for a camera pose
R3.ray = (pose, ax, ay) => {
  const b = R3.basis(pose.yaw, pose.pitch, 0), t = Math.tan((pose.fov || 55) * DEG / 2);
  const rx = ax * t, ry = ay * t, d = [b.f[0] + b.r[0] * rx + b.u[0] * ry, b.f[1] + b.r[1] * rx + b.u[1] * ry, b.f[2] + b.r[2] * rx + b.u[2] * ry];
  const l = Math.hypot(d[0], d[1], d[2]); return { o: [pose.x, pose.y, pose.z], d: [d[0] / l, d[1] / l, d[2] / l] };
};
// where a world point sits in view units for a pose (the inverse of R3.ray); null if behind
R3.aimOf = (pose, p) => {
  const b = R3.basis(pose.yaw, pose.pitch, 0), t = Math.tan((pose.fov || 55) * DEG / 2);
  const dx = p[0] - pose.x, dy = p[1] - pose.y, dz = p[2] - pose.z;
  const vz = dx * b.f[0] + dy * b.f[1] + dz * b.f[2]; if (vz < 1) return null;
  return [(dx * b.r[0] + dy * b.r[1]) / vz / t, (dx * b.u[0] + dy * b.u[1] + dz * b.u[2]) / vz / t, vz];
};
// ray vs AABB -> t or Infinity
R3.rayBox = (o, d, bx) => {
  let t0 = 0, t1 = Infinity;
  const lo = [bx.x0, bx.y0, bx.z0], hi = [bx.x1, bx.y1, bx.z1];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) return Infinity; continue; }
    let a = (lo[i] - o[i]) / d[i], c = (hi[i] - o[i]) / d[i]; if (a > c) { const s = a; a = c; c = s; }
    t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return Infinity;
  }
  return t0;
};
R3.raySphere = (o, d, c, r) => {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2], b = ox * d[0] + oy * d[1] + oz * d[2], cc = ox * ox + oy * oy + oz * oz - r * r, h = b * b - cc;
  if (h < 0) return Infinity; const s = Math.sqrt(h), t = -b - s; return t >= 0 ? t : (-b + s >= 0 ? 0 : Infinity);
};
// ray vs capsule a-b radius r: sample spheres along the segment (cheap, exact enough for hit volumes)
R3.rayCapsule = (o, d, a, b, r) => {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / (r * .8))); let best = Infinity;
  for (let i = 0; i <= n; i++) { const t = i / n; best = Math.min(best, R3.raySphere(o, d, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], r)); }
  return best;
};

// ---------- colour helpers: banded light + stepped fog (the engine's PS1 look) ----------
const _hexc = {};
const hx = c => _hexc[c] || (_hexc[c] = E.hex(c));
const toHex = (r, g, b) => '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1);
const _shadeCache = new Map();
R3.shade = (base, light, fog, fogCol, glow) => {
  const L = glow ? 1.15 : Math.round(clamp(light, .18, 1.3) * 5) / 5, F = Math.round(clamp(fog, 0, 1) * 8) / 8, key = base + '|' + L + '|' + F + '|' + fogCol;
  let v = _shadeCache.get(key); if (v) return v;
  const a = hx(base), f = hx(fogCol);
  v = toHex(a[0] * L * (1 - F) + f[0] * F, a[1] * L * (1 - F) + f[1] * F, a[2] * L * (1 - F) + f[2] * F);
  if (_shadeCache.size > 20000) _shadeCache.clear(); _shadeCache.set(key, v); return v;
};
R3.mix = (a, b, t) => { const p = hx(a), q = hx(b); return toHex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); };

// ---------- the world: draw sky, floor, boxes, actors, particles, in painter's order ----------
// scene env: { sky:[top,mid,bot], fog:[color,near,far], ambient, sun:{dir,k}, stars, moon:{yaw,pitch}, skyline:[{h,col,seed}], sea:{z,mat}, lights:[{x,y,z,r,k,col}] }
R3.drawSky = (g, env, t, W, H) => {
  const C = R3.cam, horizonY = C.cy + Math.tan(C.b.f[2] ? Math.asin(C.b.f[2]) : 0) * C.F;   // horizon line (pitch)
  const [top, mid, bot] = env.sky, hy = clamp(horizonY, -40, H + 40), bands = 14;
  for (let i = 0; i < bands; i++) {
    const y0 = Math.floor(i * H / bands), y1 = Math.floor((i + 1) * H / bands), y = (y0 + y1) / 2;
    let col; if (y < hy) { const k = clamp(y / Math.max(1, hy), 0, 1); col = k < .55 ? R3.mix(top, mid, k / .55) : R3.mix(mid, bot, (k - .55) / .45); } else col = bot;
    px.rect(g, 0, y0, W, y1 - y0 + 1, col);
  }
  if (env.stars) { const n = 70; for (let i = 0; i < n; i++) { const h1 = ((i * 2654435761) >>> 0) / 4294967296, h2 = ((i * 40503 + 977) * 2246822519 >>> 0) / 4294967296; const yaw = (h1 * 2 - 1) * Math.PI, el = (.06 + h2 * .6); const rel = ((yaw - C.b.f[1] * 0 - Math.atan2(C.b.f[1], C.b.f[0]) + Math.PI * 3) % TAU) - Math.PI; if (Math.abs(rel) > .8) continue; const sx = C.cx + Math.tan(rel) * C.F, sy = horizonY - Math.tan(el) * C.F * 1.1; if (sy < 0 || sy > hy - 2) continue; if (((t * 2 + i) | 0) % 5) px.dot(g, sx | 0, sy | 0, '#cfe0ff'); } }
  if (env.moon) { const rel = env.moon.yaw - Math.atan2(C.b.f[1], C.b.f[0]), sx = C.cx + Math.tan(rel) * C.F, sy = horizonY - Math.tan(env.moon.pitch) * C.F; if (Math.abs(rel) < 1.2) { px.disc(g, sx, sy, env.moon.r || 10, env.moon.col || '#fff3c4'); px.blend(g, .2, 'add', () => px.disc(g, sx, sy, (env.moon.r || 10) * 2, env.moon.col || '#fff3c4')); } }
  // skyline silhouettes (heightfields by azimuth)
  for (const L of env.skyline || []) {
    const yaw0 = Math.atan2(C.b.f[1], C.b.f[0]), step = 3, base = horizonY + (L.drop || 0);
    for (let sx = 0; sx < W; sx += step) {
      const az = yaw0 + Math.atan((sx - C.cx) / C.F), cell = Math.floor(az * 9), hh = ((hash32(cell + ':' + (L.seed || 1)) % 1000) / 1000), h = (L.h || 20) * (.35 + hh * .9) * (L.wide ? 1 : (hh > .5 ? 1 : .6));
      px.rect(g, sx, base - h, step, h + (H - base > 0 ? 6 : 0), L.col);
      if (L.lit && hh > .45) for (let k = 0; k < 3; k++) if (hash32(cell + 'w' + k) % 3 === 0) px.dot(g, sx + 1, base - 4 - k * 6 - (hh * 7 | 0), L.lit);
    }
  }
  return hy;
};
const FACES = [[0, -1, 0], [0, 1, 0], [-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]];   // -y +y -x +x -z +z
R3.faceCorners = (b, f) => {
  const { x0, y0, z0, x1, y1, z1 } = b;
  switch (f) {
    case 0: return [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
    case 1: return [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]];
    case 2: return [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]];
    case 3: return [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]];
    case 4: return [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]];
    default: return [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  }
};
// material table: base colour, pattern (texture lines), glow
const MAT = {
  planks: { c: '#8a6038', pat: 'h', lc: -.22 }, crate: { c: '#a8782f', pat: 'x', lc: -.28 }, brick: { c: '#9c4a3a', pat: 'brick', lc: -.25 },
  concrete: { c: '#8b8f98' }, asphalt: { c: '#44484f' }, metal: { c: '#6d7a8c', pat: 'h', lc: -.15 }, steel: { c: '#9aa6b5' }, rust: { c: '#8c4a2c', pat: 'h', lc: -.2 },
  corr_red: { c: '#b03a2e', pat: 'v', lc: -.22 }, corr_blue: { c: '#2f5fa8', pat: 'v', lc: -.22 }, corr_ochre: { c: '#c8902e', pat: 'v', lc: -.22 }, corr_green: { c: '#3f8a52', pat: 'v', lc: -.22 },
  plaster: { c: '#d8c9a8', pat: 'beam' }, timber: { c: '#6b4a2e', pat: 'v', lc: -.25 }, slate: { c: '#4d5a66', pat: 'brick', lc: -.2 }, cobble: { c: '#6c6a68', pat: 'brick', lc: -.18 },
  tarp: { c: '#3b6d92', pat: 'v', lc: -.12 }, awn_red: { c: '#d84a3c', pat: 'v', lc: -.35 }, awn_blue: { c: '#3c7ad8', pat: 'v', lc: -.35 },
  hazard: { c: '#e8b92a', pat: 'diag', lc: -.8 }, lantern: { c: '#ffb347', glow: 1 }, lamp: { c: '#ffe8a8', glow: 1 }, glass: { c: '#ffd58a', glow: 1 }, screen: { c: '#43f0c8', glow: 1, pat: 'scan' },
  neon_r: { c: '#ff5a5a', glow: 1 }, neon_y: { c: '#ffd34a', glow: 1 }, neon_b: { c: '#5ad1ff', glow: 1 }, neon_g: { c: '#8aff8a', glow: 1 },
  barrel: { c: '#c0392b', pat: 'h', lc: -.3 }, ammo: { c: '#e8761e', pat: 'x', lc: -.3 }, white: { c: '#e8ecf4' }, black: { c: '#1e2128' }, grate: { c: '#59606b', pat: 'grid', lc: -.35 },
  wet: { c: '#4a5a66', pat: 'h', lc: -.12 }, wood_d: { c: '#4e3620', pat: 'h', lc: -.25 }, rock: { c: '#5c5a58', pat: 'brick', lc: -.2 }, sand: { c: '#c7b07a' }, hull: { c: '#7a2e2e', pat: 'h', lc: -.2 }, hull_w: { c: '#cfd5df', pat: 'h', lc: -.14 }, navy: { c: '#23324f' },
  fire: { c: '#ff8a2a', glow: 1 }, sea: { c: '#173a66' }, seam: { c: '#2d6e86' }
};
R3.MAT = MAT;
function faceLight(env, n) {
  const s = env.sun || { dir: [-.4, .5, .8], k: .4 };
  const d = n[0] * s.dir[0] + n[1] * s.dir[1] + n[2] * s.dir[2];
  const ambient = env.ambient == null ? .45 : env.ambient;
  return ambient + s.k * Math.max(0, d) + (n[2] === 1 ? .08 : 0) + (n[2] === -1 ? -.2 : 0);
}
function dynLight(env, x, y, z) {
  let k = 0; const L = env.lights; if (!L) return 0;
  for (let i = 0; i < L.length; i++) { const l = L[i], d = Math.hypot(x - l.x, y - l.y, z - l.z); if (d < l.r) k += l.k * (1 - d / l.r) * (1 - d / l.r); }
  return k;
}
R3.drawBox = (g, env, bx, t) => {
  const C = R3.cam, cxm = (bx.x0 + bx.x1) / 2, cym = (bx.y0 + bx.y1) / 2, czm = (bx.z0 + bx.z1) / 2;
  const m = MAT[bx.mat] || MAT.concrete, fogC = env.fog[0], fn = env.fog[1], ff = env.fog[2];
  const dist = Math.hypot(cxm - C.x, cym - C.y, czm - C.z), fog = clamp((dist - fn) / (ff - fn), 0, 1);
  const lit = dynLight(env, cxm, cym, czm) + (bx.flash ? .5 : 0);
  const faces = bx.faces || [1, 1, 1, 1, 1, 1];
  for (let f = 0; f < 6; f++) {
    if (!faces[f]) continue;
    const n = FACES[f];
    // front-face test: the camera must be on the outer side of the plane
    const px0 = n[0] > 0 ? bx.x1 : n[0] < 0 ? bx.x0 : C.x, py0 = n[1] > 0 ? bx.y1 : n[1] < 0 ? bx.y0 : C.y, pz0 = n[2] > 0 ? bx.z1 : n[2] < 0 ? bx.z0 : C.z;
    if ((C.x - px0) * n[0] + (C.y - py0) * n[1] + (C.z - pz0) * n[2] <= 0) continue;
    const cs = R3.faceCorners(bx, f), vs = cs.map(p => R3.toView(p[0], p[1], p[2]));
    if (vs.every(v => v[2] < 3)) continue;
    const pts = R3.clipPoly(vs, 3); if (pts.length < 3) continue;
    let minx = 1e9, maxx = -1e9; for (const p of pts) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; }
    if (maxx < -4 || minx > C.W + 4) continue;
    const col = R3.shade(bx.col || m.c, faceLight(env, n) + lit * 1.2 + (bx.dim || 0), m.glow ? fog * .5 : fog, fogC, m.glow || bx.glow);
    px.poly(g, pts, col);
    // texture lines (cheap, in world space then projected) for nearby faces only
    const sz = Math.abs(maxx - minx); if (m.pat && sz > 6 && fog < .9 && vs.every(v => v[2] >= 3)) R3.facePattern(g, cs, m, col, fog, fogC, f, bx);
    if (bx.edge !== false && sz > 10 && fog < .6) { const dc = R3.shade(bx.col || m.c, faceLight(env, n) * .55, fog, fogC, 0); for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (a && b) px.line(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, dc, 1); } }
  }
};
R3.facePattern = (g, cs, m, base, fog, fogC, f, bx) => {
  const lc = R3.shade(bx.col || m.c, (m.lc ? 1 + m.lc : .8), fog, fogC, 0), horiz = f >= 4;
  const A = cs[0], B = cs[1], Cc = cs[2], D = cs[3];
  const lerp3 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  const seg = (p, q) => { const a = R3.proj(p[0], p[1], p[2]), b = R3.proj(q[0], q[1], q[2]); if (a && b) px.line(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, lc, 1); };
  const hgt = Math.hypot(D[0] - A[0], D[1] - A[1], D[2] - A[2]), wid = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
  const pat = m.pat;
  if (pat === 'h' || pat === 'brick' || pat === 'grid') { const n = Math.max(1, Math.min(10, Math.round((horiz ? wid : hgt) / (pat === 'brick' ? 5 : 7)))); for (let i = 1; i < n; i++) { const t = i / n; if (horiz) seg(lerp3(A, D, t), lerp3(B, Cc, t)); else seg(lerp3(A, D, t), lerp3(B, Cc, t)); } if (pat === 'brick' || pat === 'grid') { const nv = Math.max(1, Math.min(12, Math.round(wid / (pat === 'grid' ? 7 : 9)))); for (let i = 1; i < nv; i++) { const t = i / nv, off = pat === 'brick' && (i & 1) ? .15 : 0; seg(lerp3(A, B, t), lerp3(D, Cc, t)); } } }
  else if (pat === 'v') { const n = Math.max(1, Math.min(14, Math.round(wid / 4))); for (let i = 1; i < n; i++) { const t = i / n; seg(lerp3(A, B, t), lerp3(D, Cc, t)); } }
  else if (pat === 'x') { seg(A, Cc); seg(B, D); }
  else if (pat === 'beam') { seg(lerp3(A, D, .5), lerp3(B, Cc, .5)); seg(lerp3(A, B, .5), lerp3(D, Cc, .5)); }
  else if (pat === 'diag') { const n = Math.max(2, Math.min(10, Math.round(wid / 6))); for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; seg(lerp3(A, B, t0), lerp3(D, Cc, t1)); } }
  else if (pat === 'scan') { const n = 5; for (let i = 1; i < n; i++) seg(lerp3(A, D, i / n), lerp3(B, Cc, i / n)); }
};
// sea: bands of colour with sparkle, below the horizon, plus any floor boxes drawn on top by the caller
R3.drawSea = (g, env, t, W, H, hy) => {
  const sea = env.sea || { z: -20, c1: '#173a66', c2: '#0b1a33' }, C = R3.cam;
  if (hy >= H) return;
  const rows = 16;
  for (let i = 0; i < rows; i++) {
    const y0 = Math.max(0, Math.floor(hy + (H - hy) * i / rows)), y1 = Math.floor(hy + (H - hy) * (i + 1) / rows);
    const k = i / rows, col = R3.mix(env.fog[0], R3.mix(sea.c1, sea.c2, k), clamp(.35 + k * .9, 0, 1));
    px.rect(g, 0, y0, W, y1 - y0 + 1, col);
    const sp = sea.spark || '#9fb8ff', n = 5 + i;
    for (let j = 0; j < n; j++) { const h = hash32(i + ':' + j + ':' + ((t * (.6 + k)) | 0)), sx = (h % (W * 4)) / 4; if (h % 7 < 2) px.rect(g, sx, y0 + (h >> 8) % Math.max(1, y1 - y0), 1 + (k * 6 | 0), 1, sp); }
  }
};
R3.sortKey = (cx, cy, cz) => { const C = R3.cam; return (cx - C.x) * (cx - C.x) + (cy - C.y) * (cy - C.y) + (cz - C.z) * (cz - C.z) * .25; };
// split big boxes so painter's sort by centre stays correct
R3.tess = (b, max = 56) => {
  const out = [], nx = Math.max(1, Math.ceil((b.x1 - b.x0) / max)), ny = Math.max(1, Math.ceil((b.y1 - b.y0) / max));
  if (nx === 1 && ny === 1) return [b];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const o = Object.assign({}, b, { x0: b.x0 + (b.x1 - b.x0) * i / nx, x1: b.x0 + (b.x1 - b.x0) * (i + 1) / nx, y0: b.y0 + (b.y1 - b.y0) * j / ny, y1: b.y0 + (b.y1 - b.y0) * (j + 1) / ny, edge: false });
    out.push(o);
  }
  return out;
};
